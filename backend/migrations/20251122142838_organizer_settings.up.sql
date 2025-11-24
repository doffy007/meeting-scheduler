---
--- Organizer Settings
---
CREATE TABLE IF NOT EXISTS organizer_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL,

    working_hours JSONB,
    meeting_duration_minutes INTEGER,
    buffer_before_minutes INTEGER,
    buffer_after_minutes INTEGER,
    minimum_notice_hours INTEGER,

    timezone VARCHAR(100),

    blackout_dates JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

    PRIMARY KEY (id)
);
