# Scholarshiphive CSR v3 — Employee Extension + Admin Web Portal

**Status:** implementation candidate for local testing; NOT deployed to Railway, NOT validated against a real WhatsApp account in this build environment.

## Architecture

`Employee Chrome Extension → FastAPI → Same PostgreSQL ← Admin Web Portal`

- Employee-only Chrome extension uses the original emerald theme, login/signup, manual Sync Chats, refresh, and exactly **Conversations / Messages saved / Unread excluded** metrics.
- The previous 15-minute Chrome alarm continues in background and cannot be switched off through the employee UI. Employees are informed about periodic syncing at signup.
- Initial sync collects available chats/messages from last 8 days. Future runs continue from last **completed** sync, with 5-minute overlap and the existing per-message dedupe.
- Admin Web Portal is served by FastAPI at `/admin`. It supports admin login, employee approvals, employee-wise chats, audit history/PDF downloads, report generation, and date/month/custom date filters with bar/pie visualizations.
- Same existing PostgreSQL database. Additive schema: `messages.occurred_at`, `messages.time_quality`, `sync_checkpoints`, `sync_runs`. Existing `audit_jobs.pdf_bytes` remains untouched.
- **No AI chatbot** (deferred). Detailed voice/call analysis also deferred. Existing PDF audit worker remains in place.

## VS Code local test

1. Read `UPDATE_V3_ROMAN_URDU.md`. Make a project folder backup and a PostgreSQL backup first.
2. Configure existing `backend/.env` with `DATABASE_URL=postgresql+psycopg://...`, JWT secret, etc. Never publish it.
3. Install `backend/requirements.txt` using `SETUP_LOCAL.bat` only on a clean setup. Existing installs do not need a reset.
4. Run `START_API_LOCAL.bat` and `START_WORKER_LOCAL.bat` in separate VS Code terminals.
5. Employee extension: Chrome → `chrome://extensions` → Load unpacked from `extension/` or Reload existing unpacked extension.
6. Admin portal: `http://127.0.0.1:8000/admin` (same API host).
7. Optional integration test **on separate test DB only**: `RUN_TESTS_LOCAL.bat`.

## Deployment later

Railway: FastAPI API + admin static web + PostgreSQL + Audit worker. Employees use the Chrome extension installed in their own browsers, not run by Railway. No Vercel or n8n dependency.

## Safety

Use only authorized company WhatsApp accounts, notify employees of periodic syncing, restrict message access to authorized administrators, maintain backups and retention policies, and test on non-sensitive sample chats first. Unofficial WhatsApp DOM extraction may be fragile and has platform-policy risks. Time series exclude historical records that lack reliable event timestamps rather than guessing.
