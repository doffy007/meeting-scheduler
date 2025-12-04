import { Service as DBService } from "../../db";
import { Service as OrganizerSettingsService } from "../../setting/service";
import { addMinutes } from 'date-fns'; 
import type { PublicBookingResponse, Slot } from "./public.booking";
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export interface IPublicBookingService {
    getAvailableSlots(organizerId: string, excludeBookingId?: string): Promise<PublicBookingResponse>
}

class PublicBookingServiceImpl implements IPublicBookingService {
    constructor(private db: typeof DBService) {}

  async getAvailableSlots(organizerId: string, excludeBookingId?: string): Promise<PublicBookingResponse> {
      const settings = await OrganizerSettingsService.getOrganizerSetting(organizerId);
      if (!settings) throw new Error("Organizer settings not found");

      const timezone = settings.timezone || "UTC";
      const duration = settings.meeting_duration_minutes || 30;
      const bufferBefore = settings.buffer_before_minutes || 0;
      const bufferAfter = settings.buffer_after_minutes || 0;
      const minNotice = (settings.minimum_notice_hours || 0) * 60;
      const blackoutDates = settings.blackout_dates?.map(d => new Date(d).toDateString()) || [];

      let query = `
        SELECT start_time AS start, end_time AS "end"
        FROM booking 
        WHERE organizer_id = $1 
        AND status = 'confirmed'
      `;
      
      const queryArgs: any[] = [organizerId];

      if (excludeBookingId) {
        query += ` AND id != $2`;
        queryArgs.push(excludeBookingId);
      }

      const bookings = await this.db.query(query, ...queryArgs);

      const bookedSlots = bookings.map((b: any) => ({
        start: new Date(b.start),
        end: new Date(b.end),
      }));

      const now = new Date();
      
      const nowInOrganizerTz = toZonedTime(now, timezone);
      
      const startDate = new Date(now);
      startDate.setSeconds(0, 0); 

      const endDate = addMinutes(startDate, 14 * 24 * 60);
      const slots: Slot[] = [];

      for (let day = 0; day < 14; day++) {
        const dateInOrganizerTz = new Date(nowInOrganizerTz);
        dateInOrganizerTz.setDate(nowInOrganizerTz.getDate() + day);
        dateInOrganizerTz.setHours(0, 0, 0, 0);

        const dayStr = dateInOrganizerTz.toDateString();
        if (blackoutDates.includes(dayStr)) continue;

        const dayOfWeek = dateInOrganizerTz.getDay();

        const workingHourForDay = settings.working_hours?.find(wh => wh.day === dayOfWeek);
        if (!workingHourForDay) continue;

        const [startH = 0, startM = 0] = workingHourForDay.start!.split(":").map(Number);
        const [endH = 0, endM = 0] = workingHourForDay.end!.split(":").map(Number);

        const slotStartLocal = new Date(dateInOrganizerTz);
        slotStartLocal.setHours(startH, startM, 0, 0);
        
        let slotStart = fromZonedTime(slotStartLocal, timezone);

        const slotEndLimitLocal = new Date(dateInOrganizerTz);
        slotEndLimitLocal.setHours(endH, endM, 0, 0);
        const slotEndLimit = fromZonedTime(slotEndLimitLocal, timezone);

        while (slotStart < slotEndLimit) {
          const slotEnd = addMinutes(slotStart, duration);
          const actualEndTime = addMinutes(slotEnd, bufferAfter);
          
          if (actualEndTime > slotEndLimit) {
              break;
          }

          const minNoticeTime = addMinutes(new Date(), minNotice); 
          const minNoticePassed = slotStart >= minNoticeTime;

          const checkStart = addMinutes(slotStart, -bufferBefore);
          const checkEnd = addMinutes(slotEnd, bufferAfter);
          
          const isBooked = bookedSlots.some(bs => 
            checkStart < bs.end && checkEnd > bs.start
          );

          slots.push({
            start: slotStart.toISOString(), 
            end: slotEnd.toISOString(),
            available: !isBooked && minNoticePassed,
          });

          slotStart = addMinutes(slotStart, duration);
        }
      }

      return {
        organizerId,
        timezone,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        slots,
      };
  }
}

export const Service = new PublicBookingServiceImpl(DBService);
export default Service;