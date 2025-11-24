export type Slot = {
  start: string;       
  end: string;         
  available: boolean;  
};

export type PublicBookingResponse = {
  organizerId: string;
  timezone: string;        
  dateRange: { 
    start: string;         
    end: string;           
  };
  slots: Slot[];           
};

export type SlotContext = {
  start: Date;
  end: Date;
  organizerId: string;
  isBooked: boolean;
  inBlackout: boolean;
  minNoticePassed: boolean;
};
