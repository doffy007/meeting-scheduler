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
    if (req.working_hours && req.working_hours.length > 0) {
      this.validateWorkingHours(req.working_hours);
    }
    if (req.timezone) {
      this.validateTimezone(req.timezone);
    }
    if (req.blackout_dates && req.blackout_dates.length > 0) {
      this.validateBlackoutDates(req.blackout_dates);
    }

    const now = new Date();

    const meetingDuration = req.meeting_duration_minutes ?? 30;
    const bufferBefore = req.buffer_before_minutes ?? 0;
    const bufferAfter = req.buffer_after_minutes ?? 0;
    const minNotice = req.minimum_notice_hours ?? 24;
    const timezone = req.timezone || 'UTC';
    
    const workingHours = req.working_hours ?? []; 
    const blackoutDates = req.blackout_dates ?? [];

    let createdRow: any = null;

    await this.db.transaction(null, async (tx) => {
      const rows = await tx`
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
        VALUES (
          ${req.organizer_id}, 
          ${meetingDuration},      
          ${bufferBefore}, 
          ${bufferAfter}, 
          ${minNotice}, 
          ${timezone}, 
          ${tx.json(workingHours as any)},  
          ${tx.json(blackoutDates as any)}, 
          ${now}, 
          ${now}
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

      createdRow = rows[0];
    });

    if (!createdRow) {
      throw new Error("Failed to create organizer settings");
    }

    return this.mapRowToSettings(createdRow);
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

  async updateOrganizerSettings(req: OrganizerSettings, updatedFields: string[], userId: string): Promise<OrganizerSettings> {
    const fieldMapping: Record<string, string> = {
      'meeting_duration': 'meeting_duration_minutes',
      'buffer_before': 'buffer_before_minutes',
      'buffer_after': 'buffer_after_minutes',
      'min_notice_minutes': 'minimum_notice_hours',
    };

    const getDbField = (field: string) => fieldMapping[field] || field;

    const mappedFieldsToCheck = updatedFields.map(getDbField);

    if (mappedFieldsToCheck.includes('working_hours') && req.working_hours) {
      this.validateWorkingHours(req.working_hours);
    }
    if (mappedFieldsToCheck.includes('timezone') && req.timezone) {
      this.validateTimezone(req.timezone);
    }
    if (mappedFieldsToCheck.includes('blackout_dates') && req.blackout_dates) {
      this.validateBlackoutDates(req.blackout_dates);
    }
    const updatePayload: Record<string, any> = {};

    updatedFields.forEach((field) => {
      const dbColumn = getDbField(field);
      
      let value = (req as any)[dbColumn];

      if (dbColumn === 'working_hours' || dbColumn === 'blackout_dates') {
         value = value ?? []; 
      }

      updatePayload[dbColumn] = value;
    });

    const now = new Date();
    updatePayload['updated_at'] = now;

    let updatedRow: any = null;

    await this.db.transaction(null, async (tx) => {      
      const rows = await tx`
        UPDATE organizer_settings
        SET ${tx(updatePayload)} 
        WHERE organizer_id = ${req.organizer_id} 
        AND organizer_id = (
          SELECT id FROM organizer WHERE user_id = ${userId}
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

      updatedRow = rows[0];
    });

    if (!updatedRow) {
      throw new Error("Organizer settings not found or unauthorized");
    }

    return this.mapRowToSettings(updatedRow);
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