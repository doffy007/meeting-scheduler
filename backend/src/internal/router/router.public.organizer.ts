import { Hono } from "hono";
import { OrganizerController } from "../handler/organizer.handler";
import { SetupParams, NoAnonymous } from "../api/middleware";   
import organizerHandler from "./router.organizer";

const publicOrganizerHandler = new Hono();
publicOrganizerHandler.get("/:organizerId", OrganizerController.GetOrganizer);
publicOrganizerHandler.get("/", OrganizerController.ListOrganizer);

export default publicOrganizerHandler;