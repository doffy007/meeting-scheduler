export type BookingStatus = 'confirmed' | 'cancelled' | 'rescheduled';

export interface Booking {
  id?: string;
  organizer_id: string;
  user_id?: string | null;
  
  invitee_name: string;
  invitee_email: string;
  invitee_phone?: string | null;
  invitee_notes?: string | null;
  
  start_time: Date;
  end_time?: Date;
  duration_minutes?: number;
  
  organizer_timezone?: string;
  invitee_timezone: string;
  
  status?: BookingStatus;
  
  created_at?: Date;
  updated_at?: Date | null;
  cancelled_at?: Date | null;
}

export class BookingNotFoundError extends Error {
  constructor(message: string = "Booking not found") {
    super(message);
    this.name = "BookingNotFoundError";
  }
}

export class SlotNotAvailableError extends Error {
  constructor(message: string = "Selected time slot is not available") {
    super(message);
    this.name = "SlotNotAvailableError";
  }
}

export class MinimumNoticeError extends Error {
  constructor(message: string = "Booking does not meet minimum notice requirement") {
    super(message);
    this.name = "MinimumNoticeError";
  }
}

export class InvalidTimeSlotError extends Error {
  constructor(message: string = "Invalid time slot") {
    super(message);
    this.name = "InvalidTimeSlotError";
  }
}