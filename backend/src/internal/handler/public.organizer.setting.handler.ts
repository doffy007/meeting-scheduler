import { type Context } from 'hono';
import { Service as OrganizerService } from "../organizer/service.js";
import { Service as OrganizerSettingsService } from '../setting/service.js';
import * as api from '../api/util.js';
import { InvalidBlackoutDatesError, InvalidTimezoneError, InvalidWorkingHoursError, type OrganizerSettings } from '../setting/setting.js';

class OrganizerNotFoundError extends Error {
  constructor(message: string = "Organizer not found") {
    super(message);
    this.name = "OrganizerNotFoundError";
  }
}

export const PublicOrganizerSetting = {
 async getOrganizerSetting(c: Context) {
    try {
    const organizerId = c.req.param("organizerId");
      const settings = await OrganizerSettingsService.getOrganizerSetting(organizerId);

      return c.json({
        success: true,
        data: settings ?? null,
      });

    } catch (err) {
      if (err instanceof OrganizerNotFoundError) {
        return api.Abort(c, 404, err);
      }
      return api.Abort(c, null, err);
    }
  }
};