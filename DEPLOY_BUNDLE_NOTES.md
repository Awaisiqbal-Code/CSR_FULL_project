# CSR — Deployment Bundle (read me first)

This bundle contains everything needed to deploy the Scholarshiphive CSR system on
Railway and to distribute the Chrome extension. **No secrets are included** — set
them from `backend/.env.production.example`.

## What's in here
- `backend/` — FastAPI API + audit worker (`Dockerfile` = API-only; see note #1).
- `admin-web/` — Admin portal (HTML/JS/CSS), served by the API at `/admin`.
- `extension/` — Chrome extension (installed per counselor, points at the API URL).
- `Dockerfile` (repo root) — **recommended** full-stack image: API **+** admin portal in one service.
- `backend/.env.production.example` — complete env-var template for Railway.
- `DEPLOYMENT.md` — the detailed Railway + Chrome guide.

## Services to create on Railway
1. **PostgreSQL** plugin → gives `DATABASE_URL`.
2. **API service** — build from the **root `Dockerfile`**, Root Directory = repo root. Set the env vars from the template.
3. **Audit worker** — second service, same image, Start Command overridden to `python -m app.worker` (no public domain).

## 4 things the team MUST get right (verified against the code)

1. **Admin portal packaging.** The portal is served by the API only if `admin-web/`
   is inside the image. The original `backend/Dockerfile` (Root Directory `/backend`)
   does **not** include it, so `/admin` would be missing. **Use the root `Dockerfile`
   with Root Directory = repository root** (it copies both). Then the portal is at
   `https://<service>.up.railway.app/admin`.

2. **Voice collection & loading — how it works and what to configure.**
   Voice audio is NOT captured at sync time. Each voice note is saved as **`pending`**,
   and the counselor's **own extension** downloads the audio from **their** WhatsApp Web
   session and uploads it; only then is it playable in the portal. So:
   - **Attach a Railway Volume** and set `CSR_VOICE_STORAGE_DIR` to its mount (e.g.
     `/data/voice`). Railway's disk is ephemeral — without a Volume, every collected
     voice file is **lost on each redeploy**. (The voice *status* is in Postgres and
     survives; only the audio bytes need the Volume.) **This is the #1 cause of
     "voice won't load" in production.**
   - Each **counselor must keep Chrome + the extension + WhatsApp Web open and logged
     in** — audio is pulled from their session, not centrally. If their browser is
     closed, their voices stay `pending`.
   - Drain rate was raised to **20 voices/minute** (was 3), so a backlog clears in ~1h
     of open time instead of several hours. The database was wiped, so new deployments
     start with **no backlog**.
   - Residual limit: a voice captured **without a WhatsApp message id** shows as
     `source_missing` and can never be fetched (nothing to download). This is a rare
     extension-capture edge; normal fresh syncs capture the id. If many appear, the
     extension's DOM capture needs attention + a re-sync.
   - Status meanings in the portal: `pending` = queued (keep WhatsApp open),
     `available` = playable, `failed`/`retry` = download failed (e.g. media expired on
     WhatsApp), `source_missing` = no id to fetch.

3. **JWT_SECRET + ADMIN bootstrap.** Set a strong `JWT_SECRET` (40+ chars) and
   `ADMIN_EMAIL`/`ADMIN_PASSWORD`. The DB starts empty, so the first boot creates the
   admin. **Remove `ADMIN_PASSWORD` from Railway after the first successful boot.**

4. **AI is optional.** With `AI_ALLOWED=false` everything works deterministically. To
   enable the AI narrative/QA layer, set `AI_ALLOWED=true`, `AUDIT_AI_PROVIDER=gemini`,
   a **valid** `GEMINI_API_KEY` (starts with `AIza`) and a **real** `GEMINI_MODEL`
   (e.g. `gemini-2.5-flash`). AI never changes any count — only adds narrative.

## Extension
Load `extension/` unpacked in Chrome (or package via Chrome Web Store managed/unlisted),
then set each counselor's API base to the Railway HTTPS URL in the extension popup.
If the API domain is **not** `*.up.railway.app`, edit `extension/manifest.json`
`host_permissions` and the allowlist in `extension/background.js`.

## Health check
`GET /health` should return `{"ok": true, ...}` once the API is up.

See `DEPLOYMENT.md` for the full step-by-step guide and the staging checklist.
