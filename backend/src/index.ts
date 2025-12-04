import { Hono } from "hono";
import bookingHandler from "./internal/router/router.booking";
import organizerHandler from "./internal/router/router.organizer";
import organizerSettingsHandler from "./internal/router/router.organizer.setting";
import userHandler from "./internal/router/router.user";
import publicOrganizerHandler from "./internal/router/router.public.organizer";
import publicBookingHandler from "./internal/router/router.public.booking"; 
import  { cors } from "hono/cors";
import config from "./internal/config";

const app = new Hono();

app.use('/*', cors({
  origin: config.corsUrl, 
  allowHeaders: ['Content-Type', 'Authorization'], 
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));


app.route("/users", userHandler);
app.route("/booking", bookingHandler);
app.route("/organizers", organizerHandler);
app.route("/organizer-settings", organizerSettingsHandler);
app.route("/public-organizer",  publicOrganizerHandler);
app.route("/public-booking",  publicBookingHandler);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Fallback route
app.all("*", (c) => c.json({ error: "Not Found" }, 404));

export default {
  port: config.port, 
  fetch: app.fetch,
};
