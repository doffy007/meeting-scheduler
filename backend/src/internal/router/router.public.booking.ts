import { Hono } from "hono";
import PublicHandler from "../handler/public.booking.handler";

const publicRoutes = new Hono();

publicRoutes.get("/organizers/:organizerId", PublicHandler.getOrganizerInfo);
publicRoutes.get("/organizers/:organizerId/availability", PublicHandler.getAvailableSlots);
publicRoutes.post("/organizers/:organizerId/bookings", PublicHandler.createPublicBooking);
publicRoutes.get("/bookings/:bookingId", PublicHandler.getBookingDetail);
publicRoutes.get("list", PublicHandler.publicListBookings);
publicRoutes.put("/:bookingId/reschedule",  PublicHandler.rescheduleBooking);
publicRoutes.delete("/:bookingId/cancel",  PublicHandler.cancelBooking);


export default publicRoutes;