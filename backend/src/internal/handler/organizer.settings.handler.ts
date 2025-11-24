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

export const OrganizerSettingsController = {
  async createOrganizerSettings(c: Context) {
    try {
      const organizerId = c.req.param("organizerId");
      if (!organizerId) throw api.BadRequest;

      const organizer = await OrganizerService.getOrganizer(organizerId);
      if (!organizer) throw new OrganizerNotFoundError();

      const body = await c.req.json();
      const result = await OrganizerSettingsService.createOrganizerSettings({
        organizer_id: organizerId,
        ...body
      });

      return c.json({ message: "Organizer settings saved successfully", data: result }, 201);
    } catch (err) {
      if (err instanceof InvalidWorkingHoursError || err instanceof InvalidTimezoneError || err instanceof InvalidBlackoutDatesError) {
        return api.Abort(c, 400, err);
      }
      if (err instanceof OrganizerNotFoundError) {
        return api.Abort(c, 404, err);
      }
      return api.Abort(c, null, err);
    }
  },

  async updateOrganizerSettings(c: Context) {
    try {
      const body = await c.req.json();
      if (!body) throw api.BadRequest;

      let organizerId = "";
      let userId = "";

      try {
        organizerId = api.GetStringUUIDParam(c, 'organizerId', false);
      } catch {}
      if (!organizerId) userId = api.GetUserID(c, true);
      if (!organizerId && !userId) throw api.BadRequest;

      let organizer;
      if (organizerId) {
        organizer = await OrganizerService.getOrganizer(organizerId);
        if (!organizer) throw new OrganizerNotFoundError();
        userId = organizer.user_id;
      } else {
        organizer = await OrganizerService.getOrganizerByUserId(userId);
        if (!organizer) throw new OrganizerNotFoundError("User does not have an organizer profile");
        organizerId = organizer.id;
      }

      const fieldMapping: Record<string, string> = {
        'meeting_duration': 'meeting_duration_minutes',
        'buffer_before': 'buffer_before_minutes',
        'buffer_after': 'buffer_after_minutes',
        'min_notice_minutes': 'minimum_notice_hours',
        'working_hours': 'working_hours',
        'blackout_dates': 'blackout_dates',
        'timezone': 'timezone',
      };

      const mappedBody: any = { organizer_id: organizerId };
      for (const [key, value] of Object.entries(body)) {
        const dbField = fieldMapping[key] || key;
        mappedBody[dbField] = value;
      }
      const updatedFields = Object.keys(body).map(key => fieldMapping[key] || key);

      const updatedSettings = await OrganizerSettingsService.updateOrganizerSettings(mappedBody as OrganizerSettings, updatedFields, userId);
      return c.json(updatedSettings);

    } catch (err) {
      if (err instanceof InvalidWorkingHoursError || err instanceof InvalidTimezoneError || err instanceof InvalidBlackoutDatesError) {
        return api.Abort(c, 400, err);
      }
      if (err instanceof OrganizerNotFoundError) {
        return api.Abort(c, 404, err);
      }
      return api.Abort(c, null, err);
    }
  },

  async getOrganizerSetting(c: Context) {
    try {
      const userId = api.GetUserID(c, true);

      const organizer = await OrganizerService.getOrganizerByUserId(userId);
      if (!organizer) {
        throw new OrganizerNotFoundError("User does not have an organizer profile");
      }

      const settings = await OrganizerSettingsService.getOrganizerSetting(organizer.id);

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
}

export default OrganizerSettingsController;
