**Note:** PostgreSQL is used locally (127.0.0.1) and on Railway (private Postgres service URL). Local testing comes first.

# Railway + Chrome — Deployment Guide

## 1. Railway PostgreSQL

Create a Railway project, add a managed PostgreSQL service, and enable a backup/restore policy suitable for sensitive customer messages. Store database backups securely and test restoration regularly.

## 2. Railway FastAPI API service

Create a service from this repository. **Set Root Directory to `/backend`** (where `Dockerfile` lives). Railway will build `backend/Dockerfile`.

Set environment variables in the API service:

```text
APP_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<random 40+ character secret created via a secure secret generator>
ADMIN_EMAIL=admin@your-company.example
ADMIN_PASSWORD=<strong unique secret, 12+ characters>
TOKEN_HOURS=12
AI_ALLOWED=false
```

Replace `Postgres` with the actual Railway database service name used in Railway variable references. For a secure random JWT secret locally, use `python -c "import secrets; print(secrets.token_urlsafe(48))"`.

Expose the API publicly as HTTPS (typically `https://your-service.up.railway.app`) in Railway Networking. Wait until `GET /health` responds with `{"ok":true,...}`. The API image runs admin bootstrap then uvicorn. **After the first admin account exists, remove `ADMIN_PASSWORD` from Railway variables**; repeated bootstrapping does not change existing admins.

### Admin credential recovery

If you lose the admin password, the current beta has no reset UI. Use an authorized database administrator and a controlled account recovery procedure. Do not expose a temporary public admin creation API.

## 3. Railway Audit Worker service

Add a second Railway service built from the *same* repository and the same `/backend` root. Give it the same `APP_ENV`, `DATABASE_URL`, `JWT_SECRET`. Override the Start Command to:

```text
python -m app.worker
```

Do **not** give the worker a public domain. Check logs for `CSR audit worker started`. The worker polls the DB for pending audit jobs and builds saved PDFs. Keeping worker as a separate Railway service prevents report generation from blocking API requests.

Optional AI review in the worker requires explicitly setting:

```text
AI_ALLOWED=true
OPENAI_API_KEY=<server-only key>
OPENAI_MODEL=<your permitted model name>
```

The assistant API service needs the same opt-in AI variables if you want natural-language AI responses. With no model key it still returns conservative, database-backed metrics. Transcripts supplied to the audit model are masked but still represent potentially private communications; get organizational authorization before enabling this integration. Model usage incurs cost.

## 4. Install Chrome Extension

1. Unzip this project on your computer.
2. Open Chrome -> `chrome://extensions` -> enable **Developer mode** -> **Load unpacked** -> choose the `extension` folder.
3. Click the extension icon; a side panel opens. You can also open its full-page workspace using the expand icon.
4. Enter the public Railway API service HTTPS URL. The manifest currently grants permission for `https://*.up.railway.app/*` and local dev `http://localhost:8000`.
5. Log in as Super Admin. Approve employees on the Team tab after verifying staff identity and company WhatsApp assignment.
6. Employees first sign up, wait for approval, then log in and open `https://web.whatsapp.com` to link **their authorized company number**.
7. Sync available conversations manually or leave 15-minute periodic sync enabled. Only supported/available chat data can be ingested. Watch sync errors in the extension.

**Custom domain:** If API URL is not `*.up.railway.app`, edit `extension/manifest.json` `host_permissions` to the exact custom domain, and update the `assertOrigin` allowlist in `extension/background.js`. Reinstall/repackage; do not use a wildcard Internet-wide host permission in production.

## 5. First multi-employee staging check

- [ ] Admin login works; employee self-signup creates Pending Approval.
- [ ] Admin approves employee; rejected/disabled accounts cannot log in.
- [ ] Each employee only sees own database chat records; manually attempt another ID via API to verify HTTP 403.
- [ ] Open WhatsApp Web, verify selected company profile and manually test sync with test chats. **Do not test on personal chats without consent.**
- [ ] Confirm unread chats are not opened/marked read by legacy collector.
- [ ] Repeat the same sync and confirm no extra saved messages.
- [ ] Confirm voice/call-only threads are shown as Needs Review, not invented transcripts.
- [ ] Generate employee's 25-hour PDF, wait for worker to complete and download it.
- [ ] Admin can see every authorized employee; employee cannot see coworkers.
- [ ] Disable a user and confirm old token stops working.
- [ ] Test database backups, railway worker restart, Wi-Fi interruption, extension reconnect.

## 6. Security and operations

- Do not assume employee-entered WhatsApp number is technically verified. Verify assignments manually.
- Sensitive WhatsApp content should be processed only with company authorization, appropriate user/customer notice and retention policy.
- The original collector is an unofficial WhatsApp Web integration. Updates can break extraction or lead to account restrictions; it is not an official Meta Cloud API implementation.
- Use a company-controlled distribution/update process (Chrome Web Store managed/unlisted or Chrome Enterprise). Developer-mode installations are for staging only.
- Postgres data and report PDF bytes persist on Railway; note that backup, disaster recovery, retention/deletion and encryption must be reviewed separately.
- Before production scale-out, add Alembic migrations, login rate limiting, email verification and device binding, improved audit evidence, tests against real WhatsApp UI changes, monitoring and privacy review.

## Debugging

- **No dashboard**: confirm HTTPS URL and `/health` work and employee is approved.
- **Could not connect**: Railway API variable or extension host permission is wrong.
- **No chats**: WhatsApp Web tab missing, QR not linked, conversation unread, collector DOM changed or batch no longer within 25 hours.
- **Audit pending forever**: Railway worker missing or `DATABASE_URL` differs from API's database.
- **No AI narrative**: `AI_ALLOWED=false` by default or no AI key; deterministic metrics remain available.
- **Browser closed**: no new extension-based sync until Chrome/WhatsApp Web runs again.
