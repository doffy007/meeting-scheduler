import { type Context } from 'hono';
import { Service as PublicBookingService } from '../booking/public/service';
import { Service as BookingService } from '../booking/service';
import { Service as OrganizerService } from '../organizer/service';
import { Service as OrganizerSettingsService } from '../setting/service';
import { getParams } from "../filter/param.js";
import * as api from '../api/util.js';
import { 
  InvalidTimeSlotError, 
  MinimumNoticeError, 
  SlotNotAvailableError,
  BookingNotFoundError,
  type Booking
} from '../booking/booking.js';

type Variables = {
  user?: {
    id: number;
  };
};

export const PublicBookingController = {
  async getAvailableSlots(c: Context) {
    try {
      const organizerId = api.GetStringUUIDParam(c, 'organizerId', true);

      const startDate = c.req.query('start_date'); 
      const endDate = c.req.query('end_date');     
      const timezone = c.req.query('timezone');

      const availableSlots = await PublicBookingService.getAvailableSlots(organizerId);

      return c.json(availableSlots);
    } catch (err) {
      return api.Abort(c, null, err); 
    }
  },

  async getOrganizerInfo(c: Context) {
    try {
      const organizerId = api.GetStringUUIDParam(c, 'organizerId', true);
      
      const organizer = await OrganizerService.getOrganizer(organizerId);
      if (!organizer) {
        throw new Error("Organizer not found");
      }
      
      const settings = await OrganizerSettingsService.getOrganizerSetting(organizerId);
      
      return c.json({
        id: organizer.id,
        name: organizer.name,
        email: organizer.email,
        phone: organizer.phone,
        settings: settings ? {
          meeting_duration_minutes: settings.meeting_duration_minutes,
          timezone: settings.timezone,
        } : null
      });
    } catch (err) {
      return api.Abort(c, null, err);
    }
  },

  async createPublicBooking(c: Context) {
    try {
      const organizerId = api.GetStringUUIDParam(c, 'organizerId', true);
      const body = await c.req.json();
      
      if (!body.invitee_name || !body.invitee_email || !body.start_time) {
        throw new Error("Missing required fields: invitee_name, invitee_email, start_time");
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.invitee_email)) {
        throw new Error("Invalid email format");
      }
      
      const bookingReq: Booking = {
        ...body,
        organizer_id: organizerId,
        user_id: null, 
      };
      
      const booking = await BookingService.createBooking(bookingReq);
      
      return c.json({
        id: booking.id,
        organizer_id: booking.organizer_id,
        invitee_name: booking.invitee_name,
        invitee_email: booking.invitee_email,
        start_time: booking.start_time,
        end_time: booking.end_time,
        duration_minutes: booking.duration_minutes,
        status: booking.status,
        message: "Booking confirmed! You will receive a confirmation email."
      }, 201);
    } catch (err) {
      return api.Abort(c, null, err);
    }
  },

    async getBookingDetail(c: Context) {
        try {
            const bookingId = api.GetStringUUIDParam(c, 'bookingId', true);
            
            const booking = await BookingService.getBooking(bookingId);
            
            if (!booking) {
            throw new BookingNotFoundError();
            }
            
            return c.json({
            id: booking.id,
            organizer_id: booking.organizer_id,
            invitee_name: booking.invitee_name,
            invitee_email: booking.invitee_email,
            invitee_phone: booking.invitee_phone,
            invitee_notes: booking.invitee_notes,
            start_time: booking.start_time,
            end_time: booking.end_time,
            duration_minutes: booking.duration_minutes,
            invitee_timezone: booking.invitee_timezone,
            status: booking.status,
            created_at: booking.created_at,
            cancelled_at: booking.cancelled_at,
            });
        } catch (err) {
            return api.Abort(c, null, err);
        }
    },

        async publicListBookings(c: Context) {
          try {
            const params = getParams(c.req.query());   
            const bookings = await BookingService.publicListBookings(params);
      
            return c.json(bookings);
      
          } catch (err) {
            return api.Abort(c, null, err);
          }
        },

        async rescheduleBooking(c: Context) {
            try {
              const body = await c.req.json();
              const bookingId = api.GetStringUUIDParam(c, "bookingId", true);
        
              const existing = await BookingService.getBooking(bookingId);
              if (!existing) {
                throw new BookingNotFoundError();
              }
        
              const newStartTime = new Date(body.new_start_time);
              if (isNaN(newStartTime.getTime())) {
                throw new InvalidTimeSlotError("Invalid date format for new_start_time");
              }
        
              const updatedBooking = await BookingService.rescheduleBooking(bookingId, newStartTime);
        
              return c.json(updatedBooking);
        
            } catch (err) {
              return api.Abort(c, null, err);
            }
        },

        async cancelBooking(c: Context) {
              try {
                const bookingId = api.GetStringUUIDParam(c, 'bookingId', true);          
                const existing = await BookingService.getBooking(bookingId);
                if (!existing) {
                  throw new BookingNotFoundError();
                }
          
                await BookingService.cancelBooking(bookingId);
          
                return c.json({ message: "Booking cancelled successfully" });
          
              } catch (err) {
                return api.Abort(c, null, err);
              }
        }
}

export default PublicBookingController;