import { Hono } from "hono";
import { BookingController } from "../handler/booking.handler";
import { SetupParams, NoAnonymous } from "../api/middleware";   

const bookingHandler = new Hono();

bookingHandler.post("/", SetupParams, NoAnonymous, BookingController.createBooking);
bookingHandler.get("/list-booking/:organizerId", SetupParams, NoAnonymous, BookingController.listBookings);
bookingHandler.get("/:bookingId", SetupParams, NoAnonymous, BookingController.getBooking);
bookingHandler.delete("/:bookingId", SetupParams, BookingController.cancelBooking);
bookingHandler.put("/:bookingId/reschedule", SetupParams, NoAnonymous, BookingController.rescheduleBooking);    

export default bookingHandler;