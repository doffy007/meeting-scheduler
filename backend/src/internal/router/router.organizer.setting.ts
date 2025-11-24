import { Hono } from "hono";
import { OrganizerSettingsController } from "../handler/organizer.settings.handler";
import { SetupParams, NoAnonymous } from "../api/middleware";

const organizerSettingsHandler = new Hono();

organizerSettingsHandler.get("/",SetupParams,OrganizerSettingsController.getOrganizerSetting);
organizerSettingsHandler.post("/:organizerId",SetupParams,NoAnonymous,OrganizerSettingsController.createOrganizerSettings);
organizerSettingsHandler.put("/:organizerId",SetupParams,NoAnonymous,OrganizerSettingsController.updateOrganizerSettings);

export default organizerSettingsHandler;
