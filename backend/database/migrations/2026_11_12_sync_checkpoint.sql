-- Optional manual migration reference. Application startup automatically runs
-- equivalent additive operations; DO NOT execute against the wrong database.
-- Recommended: pg_dump backup before upgrading and verify using pgAdmin.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS time_quality VARCHAR(20) DEFAULT 'unknown';
CREATE INDEX IF NOT EXISTS ix_message_occurred_at ON messages (occurred_at);
CREATE TABLE IF NOT EXISTS sync_checkpoints (
  employee_id INTEGER PRIMARY KEY REFERENCES users(id),
  last_completed_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sync_runs (
  id VARCHAR(36) PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES users(id),
  since_at TIMESTAMPTZ NOT NULL,
  planned_until TIMESTAMPTZ NOT NULL,
  status VARCHAR(25) NOT NULL DEFAULT 'processing',
  initial BOOLEAN NOT NULL DEFAULT false,
  batches_saved INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS ix_sync_runs_employee_id ON sync_runs(employee_id);
