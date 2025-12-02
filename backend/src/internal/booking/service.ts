import { Service as DBService } from "../db";
import { Service as UIDService } from "../uid";
import { Service as OrganizerSettingsService } from "../setting/service";
import { InvalidTimeSlotError, MinimumNoticeError, SlotNotAvailableError, type Booking } from "./booking";
import { composeDbQueryFromFilters, type Filter } from "../filter/filter";
import type { OrganizerSettings } from "../setting/setting";
import type { Params } from "../filter/param";
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { convertToTimezone } from "../util/util.js";
import { FormatResponse, type APIResponse } from "../api/util.js";
import { composeSorts } from "../filter/sort.js";

export interface IBookingService {
  createBooking(req: Booking): Promise<Booking>;
  cancelBooking(id: string): Promise<void>;
  getBooking(id: string): Promise<Booking | null>;
  listBookings(organizerId: string, params: Params): Promise<APIResponse<Booking[]>>;
  publicListBookings(params: Params): Promise<APIResponse<Booking[]>>;
  rescheduleBooking(id: string, newStartTime: Date): Promise<Booking>;  
}

class BookingServiceImpl implements IBookingService {
    constructor(private db: typeof DBService) {}

  async createBooking(req: Booking): Promise<Booking> {
    const settings = await OrganizerSettingsService.getOrganizerSetting(req.organizer_id);
    if (!settings) {
      throw new Error("Organizer settings not found");
    }

    const meetingDuration = settings.meeting_duration_minutes ?? 30;
    const minimumNotice = settings.minimum_notice_hours ?? 24;
    const bufferBefore = settings.buffer_before_minutes ?? 0;
    const bufferAfter = settings.buffer_after_minutes ?? 0;

    if (!req.id) {
      req.id = UIDService.generate();
    }

    let startTimeInput: Date;
    if (typeof req.start_time === 'string') {
      startTimeInput = new Date(req.start_time);
    } else {
      startTimeInput = req.start_time;
    }

    const inviteeTimezone = req.invitee_timezone || settings.timezone || "UTC";
    const startTime = fromZonedTime(startTimeInput, inviteeTimezone);

    if (isNaN(startTime.getTime())) {
      throw new InvalidTimeSlotError("Invalid start time format");
    }

    const endTime = new Date(startTime.getTime() + meetingDuration * 60000);
    
    req.end_time = endTime;
    req.duration_minutes = meetingDuration;
    req.organizer_timezone = settings.timezone || "UTC";
    req.invitee_timezone = inviteeTimezone;
    req.status = 'confirmed';
    req.created_at = new Date();

    const now = new Date();
    const hoursUntilMeeting = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilMeeting < minimumNotice) {
      throw new MinimumNoticeError(
        `Booking requires at least ${minimumNotice} hours notice`
      );
    }

    const isAvailable = await this.isSlotAvailable(
      req.organizer_id,
      startTime,
      endTime,
      settings,
      bufferBefore,
      bufferAfter
    );

    if (!isAvailable) {
      throw new SlotNotAvailableError();
    }

    await this.db.transaction(null, async (tx) => {
      const conflictCheck = await tx`
        SELECT id FROM booking
        WHERE organizer_id = ${req.organizer_id}
        AND status = 'confirmed'
        AND (start_time, end_time) OVERLAPS (${startTime}, ${endTime})
        FOR UPDATE
      `;

      if (conflictCheck.length > 0) {
        throw new SlotNotAvailableError("Slot was just booked by someone else");
      }

      await tx`
        INSERT INTO booking (
          id,
          organizer_id,
          user_id,
          invitee_name,
          invitee_email,
          invitee_phone,
          invitee_notes,
          start_time,
          end_time,
          duration_minutes,
          organizer_timezone,
          invitee_timezone,
          status,
          created_at
        ) VALUES (
          ${req.id!},
          ${req.organizer_id},
          ${req.user_id ?? null},
          ${req.invitee_name},
          ${req.invitee_email},
          ${req.invitee_phone ?? null},
          ${req.invitee_notes ?? null},
          ${startTime},
          ${endTime},
          ${req.duration_minutes!},             
          ${req.organizer_timezone!},           
          ${req.invitee_timezone!},             
          ${req.status!},                       
          ${req.created_at!}                    
        )
      `;
    });

    return req;
  }

    private async isSlotAvailable(
      organizerId: string,
      startTime: Date,
      endTime: Date,
      settings: OrganizerSettings,
      bufferBefore: number,
      bufferAfter: number
    ): Promise<boolean> {
      const dateStr = startTime.toISOString().split('T')[0] ?? ""; 
      if (settings.blackout_dates?.includes(dateStr)) {
        return false;
      }

      const dayOfWeek = startTime.getDay();
      const workingHour = settings.working_hours?.find(wh => wh.day === dayOfWeek);
      
      if (!workingHour) {
        return false;
      }

      const startHour = startTime.getHours();
      const startMin = startTime.getMinutes();
      const endHour = endTime.getHours();
      const endMin = endTime.getMinutes();

      const [workStartH = 0, workStartM = 0] = workingHour.start.split(':').map(Number);
      const [workEndH = 0, workEndM = 0] = workingHour.end.split(':').map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const workStartMinutes = workStartH * 60 + workStartM;
      const workEndMinutes = workEndH * 60 + workEndM;

      if (startMinutes < workStartMinutes || endMinutes > workEndMinutes) {
        return false;
      }

      const bufferBeforeMs = bufferBefore * 60000;
      const bufferAfterMs = bufferAfter * 60000;
      const checkStart = new Date(startTime.getTime() - bufferBeforeMs);
      const checkEnd = new Date(endTime.getTime() + bufferAfterMs);

      const conflicts = await this.db.query(
        `SELECT id FROM booking
        WHERE organizer_id = $1
        AND status = 'confirmed'
        AND (start_time, end_time) OVERLAPS ($2, $3)`,
        organizerId,
        checkStart,
        checkEnd
      );

      return conflicts.length === 0;
    }

  async cancelBooking(id: string): Promise<void> {
    const booking = await this.getBooking(id);

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.cancelled_at) {
      throw new Error("Booking is already cancelled");
    }

    await this.db.transaction(null, async (tx) => {
      await tx`
        UPDATE booking
        SET status = 'cancelled',
            updated_at = NOW(),
            cancelled_at = NOW()
        WHERE id = ${id}
      `;
      
    });
  }

    async getBooking(id: string): Promise<Booking | null> {
      const booking = await this.db.queryRow<Booking>(
        `
        SELECT 
          id,
          organizer_id,
          user_id,
          invitee_name,
          invitee_email,
          invitee_phone,
          invitee_notes,
          start_time,
          end_time,
          duration_minutes,
          organizer_timezone,
          invitee_timezone,
          status,
          created_at,
          updated_at,
          cancelled_at
        FROM booking
        WHERE id = $1
          AND cancelled_at IS NULL
        `,
        [id]
      );

      if (!booking) return null;

      const settings = await OrganizerSettingsService.getOrganizerSetting(
        booking.organizer_id
      );
      const tz = settings?.timezone || "UTC";

      return {
        ...booking,
        start_time: convertToTimezone(booking.start_time ?? new Date(), tz),
        end_time: booking.end_time
          ? convertToTimezone(booking.end_time, tz)
          : undefined,
      };
    }

  async listBookings(organizerId: string, params: Params): Promise<APIResponse<Booking[]>> {
    const args: any[] = [organizerId];
    
    const allowedColumns = [
      "id", "organizer_id", "user_id", "invitee_name", "invitee_email",
      "invitee_phone", "start_time", "end_time", "duration_minutes",
      "status", "created_at", "updated_at", "cancelled_at","ended_at"
    ];

    const currentTimestamp = new Date().toISOString();

    let processedFilters: Filter[] = [];    
    
    if (params.filters) {
      const rawFilters = Array.isArray(params.filters) 
        ? params.filters 
        : [params.filters];
      
      processedFilters = rawFilters.map((f: any) => {
        let filterObj: Filter | null = null;

        if (typeof f === 'string') {
            const parts = f.split(':');
            const col = parts[0]?.trim();
            const op = parts[1]?.trim();
            const val = parts[2]?.trim();

            if (parts.length === 3 && col && op && val) {
                filterObj = {
                    column: col,
                    operator: op,
                    value: val
                };
            } else {
                console.warn("⚠️ Invalid filter format (skipped):", f);
                return null;
            }
        } 
        else if (typeof f === 'object' && f !== null) {
            filterObj = { ...f };
        }

        if (!filterObj) return null;
        if (filterObj.column === "ended_at") {
            filterObj.column = "end_time";
        }
        
        if (filterObj.value === "now") {
            filterObj.value = currentTimestamp;
        }
        
        return filterObj;
      }).filter((item): item is Filter => item !== null);
    }

    let sql = `
      SELECT 
        id, 
        organizer_id, 
        user_id, 
        invitee_name, 
        invitee_email,
        invitee_phone, 
        invitee_notes, 
        start_time, 
        end_time,
        duration_minutes, 
        organizer_timezone, 
        invitee_timezone,
        status, 
        created_at, 
        updated_at, 
        cancelled_at
      FROM booking
      WHERE organizer_id = $1
    `;

    const filterSql = composeDbQueryFromFilters(processedFilters, args, {
      allowedColumns,
    });

    if (filterSql) {
      sql += ` AND ${filterSql.replace("WHERE ", "")}`;
    }

    if (params.search) {
      args.push(`%${params.search}%`);
      sql += ` AND (
        invitee_name ILIKE $${args.length} OR 
        invitee_email ILIKE $${args.length}
      )`;
    }

    if (params.sorts?.length) {
      const validatedSorts = params.sorts.filter((s) =>
        allowedColumns.includes(s.column)
      );
      if (validatedSorts.length > 0) {
        sql += ` ${composeSorts(validatedSorts)}`;
      }
    } else {
      sql += ` ORDER BY start_time ASC`;
    }

    const limit = params.page?.limit ?? 20;
    const offset = params.page?.offset ?? 0;
    args.push(limit, offset);
    sql += ` LIMIT $${args.length - 1} OFFSET $${args.length}`;

    const rows = await this.db.query<Booking>(sql, ...args);

    const countArgs: any[] = [organizerId];
    let countSql = `SELECT COUNT(*) as count FROM booking WHERE organizer_id = $1`;

    const countFilterSql = composeDbQueryFromFilters(processedFilters, countArgs, {
      allowedColumns,
    });

    if (countFilterSql) {
      countSql += ` AND ${countFilterSql.replace("WHERE ", "")}`;
    }
    
    if (params.search) {
      countArgs.push(`%${params.search}%`);
      countSql += ` AND (
        invitee_name ILIKE $${countArgs.length} OR 
        invitee_email ILIKE $${countArgs.length}
      )`;
    }

    const countRows = await this.db.query<{ count: string }>(countSql, ...countArgs);
    const total = parseInt(countRows[0]?.count ?? "0");

    const settings = await OrganizerSettingsService.getOrganizerSetting(organizerId);
    const tz = settings?.timezone || "UTC";

    const convertedRows = rows.map(b => ({
      ...b,
      start_time: convertToTimezone(b.start_time ?? new Date(), tz),
      end_time: b.end_time ? convertToTimezone(b.end_time, tz) : undefined,
    }));

    return FormatResponse(convertedRows, total);
  }

  async publicListBookings(params: Params): Promise<APIResponse<Booking[]>> {
    const args: any[] = [];
    
    const allowedColumns = [
      "id", "organizer_id", "user_id", "invitee_name", "invitee_email",
      "invitee_phone", "start_time", "end_time", "duration_minutes",
      "status", "created_at", "updated_at", "cancelled_at"
    ];

    let sql = `
      SELECT 
        id,
        organizer_id,
        user_id,
        invitee_name,
        invitee_email,
        invitee_phone,
        invitee_notes,
        start_time,
        end_time,
        duration_minutes,
        organizer_timezone,
        invitee_timezone,
        status,
        created_at,
        updated_at,
        cancelled_at
      FROM booking
      WHERE cancelled_at IS NULL
    `;

    let processedFilters: Filter[] = [];
    if (params.filters) {
      const rawFilters = Array.isArray(params.filters) 
        ? params.filters 
        : [params.filters];
      
      processedFilters = rawFilters.map((f) => {
        const newF = { ...f };
        
        if (newF.column === "ended_at") {
          newF.column = "end_time";
        }
        
        if (newF.value === "now") {
          newF.value = new Date().toISOString();
        }
        
        return newF;
      });
    }
    const filterSql = composeDbQueryFromFilters(processedFilters, args, {
      allowedColumns,
    });

    if (filterSql) {
      sql += ` AND ${filterSql.replace("WHERE ", "")}`;
    }

    if (params.search) {
      args.push(`%${params.search}%`);
      sql += ` AND (
        invitee_name ILIKE $${args.length} OR 
        invitee_email ILIKE $${args.length}
      )`;
    }

    if (params.sorts?.length) {
      const validatedSorts = params.sorts.filter((s) =>
        allowedColumns.includes(s.column)
      );
      
      if (validatedSorts.length > 0) {
        sql += ` ${composeSorts(validatedSorts)}`;
      }
    } else {
      // Default sort
      sql += ` ORDER BY start_time ASC`;
    }

    const limit = params.page?.limit ?? 20;
    const offset = params.page?.offset ?? 0;
    
    args.push(limit, offset);
    sql += ` LIMIT $${args.length - 1} OFFSET $${args.length}`;

    const rows = await this.db.query<Booking>(sql, ...args);

    // Count query with same filter processing
    const countArgs: any[] = [];
    let countSql = `
      SELECT COUNT(*) as count 
      FROM booking 
      WHERE cancelled_at IS NULL 
    `;

    const countFilterSql = composeDbQueryFromFilters(processedFilters, countArgs, {
      allowedColumns,
    });

    if (countFilterSql) {
      countSql += ` AND ${countFilterSql.replace("WHERE ", "")}`;
    }

    if (params.search) {
      countArgs.push(`%${params.search}%`);
      countSql += ` AND (
        invitee_name ILIKE $${countArgs.length} OR 
        invitee_email ILIKE $${countArgs.length}
      )`;
    }

    const countRows = await this.db.query<{ count: string }>(
      countSql,
      ...countArgs
    );
    const total = parseInt(countRows[0]?.count ?? "0");

    if (!rows.length) {
      return FormatResponse([], total);
    }

    // Batch fetch organizer timezones to avoid N+1 queries
    const uniqueOrganizerIds = [...new Set(rows.map(b => b.organizer_id))];
    const tzCache: Record<string, string> = {};

    await Promise.all(
      uniqueOrganizerIds.map(async (organizerId) => {
        const settings = await OrganizerSettingsService.getOrganizerSetting(organizerId);
        tzCache[organizerId] = settings?.timezone || "UTC";
      })
    );

    // Convert timestamps to organizer timezone
    const convertedRows = rows.map(b => {
      const tz = tzCache[b.organizer_id] || "UTC";
      
      return {
        ...b,
        start_time: convertToTimezone(b.start_time ?? new Date(), tz),
        end_time: b.end_time ? convertToTimezone(b.end_time, tz) : undefined,
        organizer_timezone: tz,
      };
    });

    return FormatResponse(convertedRows, total);
  }

  async rescheduleBooking(id: string, newStartTime: Date): Promise<Booking> {
      const booking = await this.getBooking(id);
      if (!booking) {
        throw new Error("Booking not found");
      }

      const settings = await OrganizerSettingsService.getOrganizerSetting(booking.organizer_id);
      if (!settings) {
        throw new Error("Organizer settings not found");
      }

      const meetingDuration = settings.meeting_duration_minutes ?? 30;
      const newEndTime = new Date(newStartTime.getTime() + meetingDuration * 60000);

      const isAvailable = await this.isSlotAvailable(
        booking.organizer_id,
        newStartTime,
        newEndTime,
        settings,
        settings.buffer_before_minutes ?? 0,
        settings.buffer_after_minutes ?? 0
      );

      if (!isAvailable) {
        throw new SlotNotAvailableError();
      }

      await this.db.transaction(null, async (tx) => {
        const conflictCheck = await tx`
          SELECT id FROM booking
          WHERE organizer_id = ${booking.organizer_id}
          AND status = 'confirmed'
          AND id != ${id} 
          AND (start_time, end_time) OVERLAPS (${newStartTime}, ${newEndTime})
          FOR UPDATE
        `;

        if (conflictCheck.length > 0) {
          throw new SlotNotAvailableError("Slot was just booked by someone else");
        }

        await tx`
          UPDATE booking
          SET 
            start_time = ${newStartTime},
            end_time = ${newEndTime},
            updated_at = NOW()
          WHERE id = ${id}
        `;
      });

      booking.start_time = newStartTime;
      booking.end_time = newEndTime;
      booking.updated_at = new Date();

      return booking;
  }

}

export const Service = new BookingServiceImpl(DBService);

export default Service;