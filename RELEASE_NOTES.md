# Release notes — PostgreSQL Local / Railway edition

This package updates the earlier local demo to remove SQLite from local development and require PostgreSQL throughout. It retains the previous extension's collector and UI color direction, with server-side FastAPI role-based APIs.

- PostgreSQL URL in local `backend/.env` (read automatically by python-dotenv)
- PostgreSQL URL in Railway environment variables at deployment time
- Local `SETUP_LOCAL.bat` creates SQLAlchemy tables and first Super Admin
- Dedicated PostgreSQL `_test` database for integration tests (safety-guarded)
- PostgreSQL reference schema in `backend/database/schema.sql`
- No embedded DB/credentials; PostgreSQL database runs as a service

**Not verified:** Live PostgreSQL connection on your Windows laptop, WhatsApp Web live scraping, end-to-end Railway deployment. These steps must be performed and tested on the actual environment. This is not certified bug-free or production-ready.
