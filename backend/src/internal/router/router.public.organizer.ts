import { Hono } from "hono";
import { OrganizerController } from "../handler/organizer.handler";
import { SetupParams, NoAnonymous } from "../api/middleware";   
import organizerHandler from "./router.organizer";
import {PublicOrganizerSetting} from "../handler/public.organizer.setting.handler";

const publicOrganizerHandler = new Hono();
publicOrganizerHandler.get("/:organizerId", OrganizerController.GetOrganizer);
publicOrganizerHandler.get("/", OrganizerController.ListOrganizer);
publicOrganizerHandler.get("settings/:organizerId", PublicOrganizerSetting .getOrganizerSetting);


export default publicOrganizerHandler;