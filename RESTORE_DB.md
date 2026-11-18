# Restoring the database dump

`csr_db_dump.sql` is a plain-SQL dump of the cleaned database: the full schema
(9 tables) plus the single **admin** user. No employee/chat/voice data (it was wiped).

## Option A — just use a fresh Railway DB (simplest, recommended)
You do **not** have to restore this dump. On a brand-new Railway Postgres the app
auto-creates all tables on first boot and creates the admin from `ADMIN_EMAIL` /
`ADMIN_PASSWORD`. Use the dump only if you specifically want to preserve this exact
admin row/password hash.

## Option B — restore the dump into Railway Postgres
Get the connection string from the Railway Postgres service → **Variables** →
`DATABASE_URL`, then:

```bash
psql "<RAILWAY_DATABASE_URL>" -f csr_db_dump.sql
```

(Use the raw `postgresql://...` URL from Railway, not the `+psycopg` form.) If tables
already exist, drop them first or restore into an empty database.

## ⚠️ This bundle contains secrets
`backend/.env` includes the real `JWT_SECRET`, `GEMINI_API_KEY`, and the local
`DATABASE_URL` **with its password**. Share this zip only over a private channel.
For production, set fresh values in Railway's Variables tab (see
`backend/.env.production.example`) — do not reuse the local dev secrets, and note the
local `DATABASE_URL` points at `127.0.0.1` and will not work on Railway.
