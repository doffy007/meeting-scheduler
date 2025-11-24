import { Service as DBService } from "../../db";
import { Service as UIDService } from "../../uid";
import { Service as OrganizerSettingsService } from "../../setting/service";
import { InvalidTimeSlotError, MinimumNoticeError, SlotNotAvailableError, type Booking } from "../booking";
import { composeDbQueryFromFilters } from "../../filter/filter";
import type { OrganizerSettings } from "../../setting/setting";
import type { Params } from "../../filter/param";
import type { PublicBookingResponse, SlotContext, Slot } from "./public.booking";
import { addMinutes, setHours, setMinutes } from 'date-fns';


export interface IPublicBookingService {
    getAvailableSlots(organizerId: string): Promise<PublicBookingResponse>
}

class PublicBookingServiceImpl implements IPublicBookingService {
    constructor(private db: typeof DBService) {}

  async getAvailableSlots(organizerId: string): Promise<PublicBookingResponse> {
    const settings = await OrganizerSettingsService.getOrganizerSetting(organizerId);
    if (!settings) throw new Error("Organizer settings not found");

    const timezone = settings.timezone || "UTC";
    const duration = settings.meeting_duration_minutes || 30;
    const bufferBefore = settings.buffer_before_minutes || 0;
    const bufferAfter = settings.buffer_after_minutes || 0;
    const minNotice = (settings.minimum_notice_hours || 0) * 60;
    const blackoutDates = settings.blackout_dates?.map(d => new Date(d).toDateString()) || [];

    const bookings = await this.db.query(
      `SELECT 
        start_time AS start, 
        end_time AS "end"
      FROM booking 
      WHERE organizer_id = $1 
        AND status = 'confirmed'`,
      organizerId
    );

    const bookedSlots = bookings.map((b: any) => ({
      start: new Date(b.start),
      end: new Date(b.end),
    }));

    const now = new Date();
    const startDate = new Date(now);
    const endDate = addMinutes(startDate, 14 * 24 * 60);
    const slots: Slot[] = [];

    for (let day = 0; day < 14; day++) {
      const date = new Date(now);
      date.setDate(now.getDate() + day);

      const dayStr = date.toDateString();
      if (blackoutDates.includes(dayStr)) continue;

      const dayOfWeek = date.getDay();

      const workingHourForDay = settings.working_hours?.find(wh => wh.day === dayOfWeek);
      if (!workingHourForDay) continue;

      const [startH = 0, startM = 0] = workingHourForDay.start!.split(":").map(Number);
      const [endH = 0, endM = 0] = workingHourForDay.end!.split(":").map(Number);

      let slotStart = setHours(setMinutes(new Date(date), startM), startH);
      const slotEndLimit = setHours(setMinutes(new Date(date), endM), endH);

      while (slotStart < slotEndLimit) {
        const slotEnd = addMinutes(slotStart, duration);

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