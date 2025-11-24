---
--- Device
---
CREATE TABLE IF NOT EXISTS device(
  user_id UUID NOT NULL,
  token VARCHAR,
  device VARCHAR NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz,
  deleted_at timestamptz,
  PRIMARY KEY (user_id, device)
);