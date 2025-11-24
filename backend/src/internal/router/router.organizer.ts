import { Hono } from "hono";
import { OrganizerController } from "../handler/organizer.handler";
import { SetupParams, NoAnonymous } from "../api/middleware";   

const organizerHandler = new Hono();
organizerHandler.get("/:organizerId", SetupParams, NoAnonymous, OrganizerController.GetOrganizer);
organizerHandler.get("/", SetupParams, NoAnonymous, OrganizerController.GetOrganizer);
organizerHandler.put("/:organizerId", SetupParams, NoAnonymous, OrganizerController.updateOrganizer);
organizerHandler.get("/users/:userId", SetupParams, NoAnonymous, OrganizerController.getOrganizerByUserId)

export default organizerHandler;