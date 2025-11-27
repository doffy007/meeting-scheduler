import { Service as DBService } from "../db";
import { Service as UIDService } from "../uid";
import { Service as OrganizerSettingsService } from "../setting/service";
import { InvalidTimeSlotError, MinimumNoticeError, SlotNotAvailableError, type Booking } from "./booking";
import { composeDbQueryFromFilters, type Filter } from "../filter/filter";
import type { OrganizerSettings } from "../setting/setting";
import type { Params } from "../filter/param";
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { convertToTimezone } from "../util/util.js";

export interface IBookingService {
  createBooking(req: Booking): Promise<Booking>;
  cancelBooking(id: string): Promise<void>;
  getBooking(id: string): Promise<Booking | null>;
  listBookings(organizerId: string, params: Params): Promise<Booking[]>;
  publicListBookings(params: Params): Promise<Booking[]>;
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

    await this.db.commit(null, async (tx) => {
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

    await this.db.commit(null, async (tx) => {
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

  async listBookings(organizerId: string, params: Params): Promise<Booking[]> {
    const args: any[] = [organizerId];

    let processedFilters: Filter[] = [];
    if (params.filters) {
      const rawFilters = Array.isArray(params.filters) ? params.filters : [params.filters];
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

    const filterQuery = composeDbQueryFromFilters(processedFilters, args);
    
    if (filterQuery.sql) {
      sql += filterQuery.sql.replace(/^WHERE\s+/i, " AND "); 
    }

    if (params.search) {
      args.push(`%${params.search}%`);
      sql += ` AND invitee_name ILIKE $${args.length}`;
    }

    if (params.sorts?.length) {
      const sortSql = params.sorts.map(s => `${s.column} ${s.asc ? "ASC" : "DESC"}`).join(", ");
      sql += ` ORDER BY ${sortSql}`;
    } else {
      sql += ` ORDER BY start_time ASC`;
    }

    const limit = params.page?.limit ?? 20;
    const offset = params.page?.offset ?? 0;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    const rows = await this.db.query<Booking>(sql, ...args);
    const settings = await OrganizerSettingsService.getOrganizerSetting(organizerId);
    const tz = settings?.timezone || "UTC";

    return rows.map(b => ({
      ...b,
      start_time: convertToTimezone(b.start_time ?? new Date(), tz),
      end_time: b.end_time ? convertToTimezone(b.end_time, tz) : undefined,
    }));
  }

  async publicListBookings(params: Params): Promise<Booking[]> {
    const args: any[] = [];
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

    const filterQuery = composeDbQueryFromFilters(params.filters, args);
    if (filterQuery.sql) {
      sql += " AND " + filterQuery.sql;
    }

    if (params.search) {
      args.push(`%${params.search}%`);
      sql += ` AND invitee_name ILIKE $${args.length}`;
    }

    if (params.sorts?.length) {
      const sortSql = params.sorts
        .map(s => `${s.column} ${s.asc ? "ASC" : "DESC"}`)
        .join(", ");
      sql += ` ORDER BY ${sortSql}`;
    } else {
      sql += ` ORDER BY start_time ASC`;
    }

    const limit = params.page?.limit ?? 20;
    const offset = params.page?.offset ?? 0;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    const rows = await this.db.query<Booking>(sql, ...args);
    if (!rows.length) return [];

    const tzCache: Record<string, string> = {};

    const bookingsWithTz = await Promise.all(rows.map(async (b) => {
      let tz = tzCache[b.organizer_id];
      if (!tz) {
        const settings = await OrganizerSettingsService.getOrganizerSetting(b.organizer_id);
        tz = settings?.timezone || "UTC";
        tzCache[b.organizer_id] = tz;
      }

      return {
        ...b,
        start_time: convertToTimezone(b.start_time ?? new Date(), tz),
        end_time: b.end_time ? convertToTimezone(b.end_time, tz) : undefined,
        organizer_timezone: tz,
      };
    }));

    return bookingsWithTz;
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

      await this.db.commit(null, async (tx) => {
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