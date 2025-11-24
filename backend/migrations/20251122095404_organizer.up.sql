---
--- Organizer
---
CREATE TABLE IF NOT EXISTS organizer(
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    address VARCHAR,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz,
    deleted_at timestamptz,
    PRIMARY KEY (user_id)
);