import { type Context } from 'hono';
import { Service as UserService } from '../user/service.js';
import { Service as OrganizerService } from '../organizer/service.js';
import { getParams } from "../filter/param.js";
import * as api from '../api/util.js';

export const OrganizerController = {
  async GetOrganizer(c: Context) {
    try {
      let organizerId = "";
      let userId = "";

      try {
        organizerId = api.GetStringUUIDParam(c, 'organizerId', false);
      } catch {
        userId = api.GetUserID(c, true);
      }

      let organizer = null;

      if (organizerId) {
        organizer = await OrganizerService.getOrganizer(organizerId);
      } else if (userId) {
        organizer = await OrganizerService.getOrganizerByUserId(userId);

        if (!organizer) {
          const user = await UserService.getUser(userId);
          if (!user) throw api.ErrNotFound; 
          throw api.ErrNotFound; 
        }
      }

      if (!organizer) throw api.ErrNotFound;

      return c.json({ data: organizer });
    } catch (err) {
      return api.Abort(c, null, err);
    }
  },

  async updateOrganizer(c: Context) {
    try {
      const body = await c.req.json();
      if (!body) throw api.BadRequest;
      const updatedFields = Object.keys(body);
      const organizerReq = { ...body };

      let organizerId = "";
      let userId = "";

      try {
        organizerId = api.GetStringUUIDParam(c, 'organizerId', false);
      } catch {}

      if (!organizerId) userId = api.GetUserID(c, true);
      if (!organizerId && !userId) throw api.BadRequest;

      let existingOrganizer;
      if (organizerId) {
        existingOrganizer = await OrganizerService.getOrganizer(organizerId);
        if (!existingOrganizer) throw api.ErrNotFound;
        organizerReq.id = organizerId;
        userId = existingOrganizer.user_id;
      } else {
        existingOrganizer = await OrganizerService.getOrganizerByUserId(userId);
        if (!existingOrganizer) throw api.ErrNotFound;
        organizerReq.id = existingOrganizer.id;
        userId = existingOrganizer.user_id;
      }

      const updatedOrganizer = await OrganizerService.updateOrganizer(
        organizerReq as any,
        updatedFields,
        userId
      );

      return c.json({ data: updatedOrganizer });
    } catch (err) {
      return api.Abort(c, null, err);
    }
  },

  async getOrganizerByUserId(c: Context) {
    try {
      const userId = api.GetUserID(c, true);
      if (!userId) throw api.ErrUnauthorized;

      const organizer = await OrganizerService.getOrganizerByUserId(userId);
      if (!organizer) throw api.ErrNotFound;

      return c.json({ data: organizer });
    } catch (err) {
      return api.Abort(c, null, err);
    }
  },

  async ListOrganizer(c: Context) {
    try {
      const params = getParams(c.req.queries());   
      const bookings = await OrganizerService.listOrganizer(params);

      return c.json(bookings);

    } catch (err) {
      return api.Abort(c, null, err);
    }
  },
  
}

export default OrganizerController;
