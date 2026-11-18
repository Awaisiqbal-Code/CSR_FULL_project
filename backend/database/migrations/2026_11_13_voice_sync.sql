-- v3.8 add-only schema changes. Optional reference migration: normal backend
-- startup calls create_tables(), which creates voice_assets and adds source_message_id.
-- Do NOT reset messages, conversations or audit_jobs.
BEGIN;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source_message_id VARCHAR(200) DEFAULT '';
CREATE TABLE IF NOT EXISTS voice_assets (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL UNIQUE REFERENCES messages(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    mime VARCHAR(50) NOT NULL DEFAULT '',
    byte_size INTEGER NOT NULL DEFAULT 0,
    sha256 VARCHAR(64) NOT NULL DEFAULT '',
    storage_key VARCHAR(100) NOT NULL DEFAULT '',
    attempts INTEGER NOT NULL DEFAULT 0,
    error VARCHAR(220) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_voice_assets_message_id ON voice_assets (message_id);
CREATE INDEX IF NOT EXISTS ix_voice_assets_status ON voice_assets (status);
COMMIT;
