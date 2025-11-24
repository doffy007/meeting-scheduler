
export interface WorkingHour {
  day: number; 
  start: string;
  end: string;
}

export interface OrganizerSettings {
  id?: string;
  organizer_id: string;
  
  working_hours?: WorkingHour[];
  
  meeting_duration_minutes?: number;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  minimum_notice_hours?: number;
  
  timezone?: string;
  
  blackout_dates?: string[]; 
  
  created_at?: Date;
  updated_at?: Date;
}

// Validation errors
export class InvalidWorkingHoursError extends Error {
  constructor(message: string = "Invalid working hours format") {
    super(message);
    this.name = "InvalidWorkingHoursError";
  }
}

export class InvalidTimezoneError extends Error {
  constructor(message: string = "Invalid timezone") {
    super(message);
    this.name = "InvalidTimezoneError";
  }
}

export class InvalidBlackoutDatesError extends Error {
  constructor(message: string = "Invalid blackout dates format") {
    super(message);
    this.name = "InvalidBlackoutDatesError";
  }
}