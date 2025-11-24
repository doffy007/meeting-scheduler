import { Service as DBService } from "../db";
import { Service as UIDService } from "../uid";
import type { OrganizerSettings } from "./setting";
import type { WorkingHour } from "../setting/setting";
import {
  InvalidWorkingHoursError,
  InvalidTimezoneError,
  InvalidBlackoutDatesError
} from "../setting/setting";

export interface IOrganizerSettings {
  createOrganizerSettings(req: OrganizerSettings): Promise<OrganizerSettings>;
  updateOrganizerSettings(req: OrganizerSettings, updatedFields: string[], userId: string): Promise<OrganizerSettings>;
  getOrganizerSetting(id: string): Promise<OrganizerSettings | null>;
}

class OrganizerSettingsService implements IOrganizerSettings {
  private db: typeof DBService;

  constructor() {
    this.db = DBService;
  }

  private validateWorkingHours(hours: WorkingHour[]): void {
  for (const hour of hours) {
    if (hour.day < 0 || hour.day > 6) {
      throw new InvalidWorkingHoursError(`Invalid day: ${hour.day}. Must be 0-6`);
    }
    
    if (!/^\d{2}:\d{2}$/.test(hour.start) || !/^\d{2}:\d{2}$/.test(hour.end)) {
      throw new InvalidWorkingHoursError(`Invalid time format. Use HH:MM`);
    }
    
    const [startHour = 0, startMin = 0] = hour.start.split(':').map(Number);
    const [endHour = 0, endMin = 0] = hour.end.split(':').map(Number);
    
    if (startHour < 0 || startHour > 23 || startMin < 0 || startMin > 59 ||
        endHour < 0 || endHour > 23 || endMin < 0 || endMin > 59) {
      throw new InvalidWorkingHoursError(`Invalid time values`);
    }
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (startMinutes >= endMinutes) {
      throw new InvalidWorkingHoursError(`Start time must be before end time`);
    }
  }
}

  private validateTimezone(timezone: string): void {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      throw new InvalidTimezoneError(`Invalid timezone: ${timezone}`);
    }
  }

  private validateBlackoutDates(dates: string[]): void {
    for (const date of dates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new InvalidBlackoutDatesError(`Invalid date format: ${date}. Use YYYY-MM-DD`);
      }
      
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        throw new InvalidBlackoutDatesError(`Invalid date: ${date}`);
      }
    }
  }

  async createOrganizerSettings(req: OrganizerSettings): Promise<OrganizerSettings> {
    // Validate inputs
    if (req.working_hours && req.working_hours.length > 0) {
      this.validateWorkingHours(req.working_hours);
    }
    if (req.timezone) {
      this.validateTimezone(req.timezone);
    }
    if (req.blackout_dates && req.blackout_dates.length > 0) {
      this.validateBlackoutDates(req.blackout_dates);
    }

    // Set defaults
    const now = new Date();
    req.working_hours = req.working_hours || [];
    req.blackout_dates = req.blackout_dates || [];
    req.meeting_duration_minutes = req.meeting_duration_minutes ?? 30;
    req.buffer_before_minutes = req.buffer_before_minutes ?? 0;
    req.buffer_after_minutes = req.buffer_after_minutes ?? 0;
    req.minimum_notice_hours = req.minimum_notice_hours ?? 24;
    req.timezone = req.timezone || 'UTC';

    const query = `
      INSERT INTO organizer_settings (
        organizer_id, 
        meeting_duration_minutes, 
        buffer_before_minutes,
        buffer_after_minutes,
        minimum_notice_hours, 
        timezone, 
        working_hours, 
        blackout_dates, 
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        organizer_id, 
        meeting_duration_minutes, 
        buffer_before_minutes,
        buffer_after_minutes,
        minimum_notice_hours, 
        timezone, 
        working_hours, 
        blackout_dates, 
        created_at, 
        updated_at
    `;

    const row = await DBService.queryRow<any>(
      query,
      req.organizer_id,
      req.meeting_duration_minutes,
      req.buffer_before_minutes,
      req.buffer_after_minutes,
      req.minimum_notice_hours,
      req.timezone,
      req.working_hours,
      req.blackout_dates,
      now,
      now
    );

    if (!row) {
      throw new Error("Failed to create organizer settings");
    }

    return this.mapRowToSettings(row);
  }

  async getOrganizerSetting(id: string): Promise<OrganizerSettings | null> {
    const query = `
      SELECT 
        organizer_id, 
        meeting_duration_minutes, 
        buffer_before_minutes,
        buffer_after_minutes,
        minimum_notice_hours, 
        timezone, 
        working_hours, 
        blackout_dates, 
        created_at, 
        updated_at
      FROM organizer_settings
      WHERE organizer_id = $1
    `;

    const row = await DBService.queryRow<any>(query, id);
    
    if (!row) {
      return null;
    }

    return this.mapRowToSettings(row);
  }

  async updateOrganizerSettings(
    req: OrganizerSettings, 
    updatedFields: string[], 
    userId: string
  ): Promise<OrganizerSettings> {
    const fieldMapping: Record<string, string> = {
      'meeting_duration': 'meeting_duration_minutes',
      'buffer_before': 'buffer_before_minutes',
      'buffer_after': 'buffer_after_minutes',
      'min_notice_minutes': 'minimum_notice_hours',
    };

    const mappedFields = updatedFields.map(field => fieldMapping[field] || field);

    if (mappedFields.includes('working_hours') && req.working_hours) this.validateWorkingHours(req.working_hours);
    if (mappedFields.includes('timezone') && req.timezone) this.validateTimezone(req.timezone);
    if (mappedFields.includes('blackout_dates') && req.blackout_dates) this.validateBlackoutDates(req.blackout_dates);

    const now = new Date();
    req.updated_at = now;
    mappedFields.push("updated_at");
    
    const setClauses = mappedFields.map((field, index) => `${field} = $${index + 3}`);
    const query = `
      UPDATE organizer_settings
      SET ${setClauses.join(", ")}
      WHERE organizer_id = $1 AND organizer_id = (
        SELECT id FROM organizer WHERE user_id = $2
      )
      RETURNING 
        organizer_id, 
        meeting_duration_minutes, 
        buffer_before_minutes,
        buffer_after_minutes,
        minimum_notice_hours, 
        timezone, 
        working_hours, 
        blackout_dates, 
        created_at, 
        updated_at
    `;

    const values = [req.organizer_id, userId];
    for (const field of mappedFields) {
      // if (field === "working_hours" || field === "blackout_dates") {
      //   values.push(JSON.stringify((req as any)[field]));
      // } else {
      //   values.push((req as any)[field]);
      // }
       values.push((req as any)[field]);
    }

    const row = await DBService.queryRow<any>(query, ...values);

    if (!row) {
      throw new Error("Organizer settings not found or unauthorized");
    }

    return this.mapRowToSettings(row);
  }

  private mapRowToSettings(row: any): OrganizerSettings {
    return {
      organizer_id: row.organizer_id,
      meeting_duration_minutes: row.meeting_duration_minutes,
      buffer_before_minutes: row.buffer_before_minutes,
      buffer_after_minutes: row.buffer_after_minutes,
      minimum_notice_hours: row.minimum_notice_hours,
      timezone: row.timezone,
      working_hours: typeof row.working_hours === 'string' 
        ? JSON.parse(row.working_hours) 
        : row.working_hours,
      blackout_dates: typeof row.blackout_dates === 'string'
        ? JSON.parse(row.blackout_dates)
        : row.blackout_dates,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
  
}

export const Service = new OrganizerSettingsService();
export default Service;