---
--- Booking
---
CREATE TABLE IF NOT EXISTS booking(
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL,
    user_id UUID,
    
    invitee_name VARCHAR NOT NULL,
    invitee_email VARCHAR NOT NULL,
    invitee_phone VARCHAR,
    invitee_notes TEXT,
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    
    organizer_timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    invitee_timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    
    status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    PRIMARY KEY (id),
    
    CHECK (end_time > start_time)
);