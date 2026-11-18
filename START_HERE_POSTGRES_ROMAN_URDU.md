# Scholarshiphive CSR — Windows VS Code + PostgreSQL Local Setup

**Abhi Railway par deploy mat karo. Pehle laptop par PostgreSQL + extension test karo.**

## 1. Requirements

- Windows laptop, PostgreSQL already installed and running (normally port 5432)
- pgAdmin 4 or `psql`, VS Code, Python 3.11+ and Chrome
- Optional Node.js to run extension tests
- Permission to create a new PostgreSQL role and databases

## 2. pgAdmin 4 mein 2 databases banao

pgAdmin -> Connect to local PostgreSQL server -> Tools -> Query Tool. Run these commands one by one as your PostgreSQL administrator. **Replace password with your own strong password** and keep it private:

```sql
CREATE USER csr_app WITH PASSWORD 'CHOOSE_A_UNIQUE_STRONG_PASSWORD';
CREATE DATABASE scholarshiphive_csr OWNER csr_app;
CREATE DATABASE scholarshiphive_csr_test OWNER csr_app;
```

If a role/database already exists, do not recreate it blindly. `_test` DB is disposable: test suite drops and recreates its tables. Local main DB (`scholarshiphive_csr`) must not be dropped.

## 3. Configure backend/.env

First double-click `SETUP_LOCAL.bat` **once** to generate `backend/.env` from example. It will tell you to edit it and exit. In VS Code open `backend/.env` and set:

```env
APP_ENV=development
DATABASE_URL=postgresql+psycopg://csr_app:YOUR_PASSWORD@127.0.0.1:5432/scholarshiphive_csr
TEST_DATABASE_URL=postgresql+psycopg://csr_app:YOUR_PASSWORD@127.0.0.1:5432/scholarshiphive_csr_test
JWT_SECRET=REPLACE_WITH_REAL_40_PLUS_CHAR_RANDOM_SECRET
AI_ALLOWED=false
```

To generate JWT secret in VS Code terminal:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

**If password contains special URL characters like `@`, `#`, `/`, `:`, `%`, `?`, URL-encode them.** You can use a random alphanumeric password for ease. Never put `.env` on GitHub.

## 4. Initialize / run

1. Run `SETUP_LOCAL.bat` again. It installs dependencies, checks PostgreSQL and prompts for first Super Admin email/password; only creates missing tables.
2. Run `START_API_LOCAL.bat` in first terminal (keep it running).
3. Run `START_WORKER_LOCAL.bat` in second terminal (keep it running).
4. Open `http://127.0.0.1:8000/health` or `/docs` to confirm API is online.
5. Optional: run `RUN_TESTS_LOCAL.bat` (this **deletes all tables in the _test database only**).

## 5. Chrome extension

1. Chrome -> `chrome://extensions` -> Developer mode ON -> Load unpacked -> select project `extension` folder.
2. Open extension. Set API URL to `http://127.0.0.1:8000`.
3. Log in as Super Admin; employees sign up from extension, and admin approves them.
4. Log in as employee, open WhatsApp Web with the authorized company account and test on safe test conversations.
5. Trigger sync; check that records appear in `public.users`, `public.conversations`, `public.messages`, `public.sync_logs` using pgAdmin.
6. Check employee-only data isolation, repeat sync to detect duplicates, request audit and download PDF.

Chrome/WhatsApp Web must run for extension-based chat collection. Cannot guarantee complete historical or call/voice metadata. Do not use personal or unauthorized conversations.

## 6. Verify data in pgAdmin

After employee testing, select `scholarshiphive_csr` > Schemas > public > Tables, then query:

```sql
SELECT id, full_name, role, approved FROM users ORDER BY id;
SELECT id, employee_id, title, state FROM conversations ORDER BY id DESC LIMIT 20;
SELECT id, conversation_id, sender, text FROM messages ORDER BY id DESC LIMIT 20;
SELECT id, employee_id, new_messages, created_at FROM sync_logs ORDER BY id DESC LIMIT 20;
SELECT id, employee_id, status FROM audit_jobs ORDER BY id DESC LIMIT 20;
```

## 7. Deploy later on Railway — SAME CODE, SAME PostgreSQL TYPE

After local tests are complete, push source without `.env` and create a Railway project with PostgreSQL, API service and Audit Worker. Configure Railway `DATABASE_URL=${{Postgres.DATABASE_URL}}` (use your actual service name), `APP_ENV=production`, and a fresh JWT secret. Do **not** point Railway at laptop's `127.0.0.1`, and do **not** reuse the development database password. See `DEPLOYMENT.md`.

### Known limitations

This is a development build; actual extraction from WhatsApp Web, Chrome version compatibility, privacy permissions and real Railway deployment require end-to-end testing. No guarantee of zero errors. Database migrations and rate limiting remain to be implemented before production readiness.
