import { type Context } from 'hono';
import { Service as BookingService } from '../booking/service.js';
import * as api from '../api/util.js';
import { getParams } from "../filter/param.js";
import { 
  InvalidTimeSlotError, 
  MinimumNoticeError, 
  SlotNotAvailableError,
  BookingNotFoundError 
} from '../booking/booking.js';

type Variables = {
  user?: {
    id: number;
  };
};

export const BookingController = {
  async createBooking(c: Context) {
    try {
      const body = await c.req.json();
      
      const userId = api.GetUserID(c, true);
      if (!userId) {
        throw api.ErrUnauthorized;
      }

      const bookingReq = {
        ...body,
        user_id: userId
      };

      const created = await BookingService.createBooking(bookingReq as any);

      return c.json(created, 201);

    } catch (err) {
      return api.Abort(c, null, err); 
    }
  },

  async cancelBooking(c: Context) {
    try {
      const bookingId = api.GetStringUUIDParam(c, 'bookingId', true);
      const userId = api.GetUserID(c, true);

      const existing = await BookingService.getBooking(bookingId);
      if (!existing) {
        throw new BookingNotFoundError();
      }

      if (existing.user_id !== userId) {
        throw api.Forbidden;
      }

      await BookingService.cancelBooking(bookingId);

      return c.json({ message: "Booking cancelled successfully" });

    } catch (err) {
      return api.Abort(c, null, err);
    }
  },

  async getBooking(c: Context) {
    try {
      const bookingId = api.GetStringUUIDParam(c, "bookingId", true);
      const userId = api.GetUserID(c, true);

      const booking = await BookingService.getBooking(bookingId);

      if (!booking) {
        throw new BookingNotFoundError();
      }

      if (booking.user_id !== userId) {
        throw api.Forbidden;
      }

      return c.json(booking);

    } catch (err) {
      return api.Abort(c, null, err);
    }
  },

  async listBookings(c: Context) {
    try {
      const params = getParams(c.req.query()); 
      const userId = api.GetUserID(c, true);

      const bookings = await BookingService.listBookings(userId, params);

      return c.json(bookings);

    } catch (err) {
      return api.Abort(c, null, err);
    }
  },

  async rescheduleBooking(c: Context) {
    try {
      const body = await c.req.json();
      const bookingId = api.GetStringUUIDParam(c, "bookingId", true);
      const userId = api.GetUserID(c, true);

      const existing = await BookingService.getBooking(bookingId);
      if (!existing) {
        throw new BookingNotFoundError();
      }

      if (existing.user_id !== userId) {
        throw api.Forbidden;
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
  }
}

export default BookingController;