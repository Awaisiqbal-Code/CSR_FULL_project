-- SCHOLARSHIPHIVE CSR v4.5 - CLEAN FIRST 8-DAY RE-SYNC
-- DESTRUCTIVE. Run only on your own authorized LOCAL TEST database.
-- This empties synchronized chats/messages/voice metadata, sync histories and PDFs.
-- Admin/employee USERS, logins, approvals, and employee codes are PRESERVED.
-- Requires v4.5 backend tables already installed. Do NOT run on production.
-- First STOP FastAPI and audit worker and DISABLE ALL employee extension copies
-- (including teammates/partner laptops sharing this database) so 15min auto-sync
-- cannot restart mid-reset. Take a verified pgAdmin Custom backup first.
-- Actual voice audio on disk (.csr_voice_private) is NOT removed by SQL.

BEGIN;
SET LOCAL lock_timeout = '5s';
DO $guard$
DECLARE missing text;
BEGIN
  IF current_database() <> 'scholarshiphive_csr' THEN
    RAISE EXCEPTION 'WRONG DATABASE: connected to %, expected scholarshiphive_csr. Nothing was deleted.', current_database();
  END IF;
  SELECT string_agg(t.name, ', ') INTO missing
  FROM unnest(ARRAY['voice_assets','audit_jobs','messages','conversations',
                    'sync_logs','sync_runs','sync_checkpoints']) AS t(name)
  WHERE to_regclass('public.' || t.name) IS NULL;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing tables: %. Check schema/version; nothing deleted.', missing;
  END IF;
END $guard$;

-- Reset records and the successful-sync watermark.  FIRST sync will use last
-- eight rolling days, not the previous incremental checkpoint.
TRUNCATE TABLE
    public.voice_assets,
    public.audit_jobs,
    public.messages,
    public.conversations,
    public.sync_logs,
    public.sync_runs,
    public.sync_checkpoints
RESTART IDENTITY;
COMMIT;

-- Verification: all 7 counts must be zero.
SELECT 'voice_assets' AS table_name, COUNT(*) AS remaining FROM public.voice_assets
UNION ALL SELECT 'audit_jobs', COUNT(*) FROM public.audit_jobs
UNION ALL SELECT 'messages', COUNT(*) FROM public.messages
UNION ALL SELECT 'conversations', COUNT(*) FROM public.conversations
UNION ALL SELECT 'sync_logs', COUNT(*) FROM public.sync_logs
UNION ALL SELECT 'sync_runs', COUNT(*) FROM public.sync_runs
UNION ALL SELECT 'sync_checkpoints', COUNT(*) FROM public.sync_checkpoints
ORDER BY table_name;

-- Confirm login accounts preserved.
SELECT id, full_name, employee_code, role, approved, active FROM public.users ORDER BY id;
