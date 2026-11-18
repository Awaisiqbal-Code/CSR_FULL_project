# PostgreSQL-only local + Railway package

- Removed bundled `backend/dev.sqlite3`, old SQLite SQL schema and SQLite-specific scripts.
- Local Windows `.bat` scripts now load `backend/.env` and connect to **local PostgreSQL**.
- Railway services use **Railway PostgreSQL** using same SQLAlchemy models (only connection URL changes).
- Added `python-dotenv` so local `.env` automatically loads; Railway environment settings override it.
- Added PostgreSQL-only startup validation and connection precheck.
- Added dedicated `TEST_DATABASE_URL` with `_test` database name safety guard.
- Local initial admin creation prompts interactively; no hardcoded credentials.
- Current bootstrap creates missing tables but is not Alembic migration management.

Real database files are not included in the ZIP because PostgreSQL stores data in a running database server, not a portable `.db` file. `schema.sql` is a reference only.
