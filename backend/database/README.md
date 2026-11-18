# PostgreSQL schema

- Database engine for **both local VS Code development and Railway deployment**: PostgreSQL.
- `app/models.py` defines the ORM tables; `app/db.py` performs initial `CREATE TABLE IF NOT EXISTS` style initialization via SQLAlchemy metadata.
- Run `SETUP_LOCAL.bat` to initialize tables and the first admin in your **local PostgreSQL database**.
- `schema.sql` is a generated reference preview, **not a migration file**. Do not apply it to an existing DB manually.
- For later schema changes, create explicit Alembic migrations (not yet implemented). `create_all()` will not alter existing columns.
- Run integration tests **only** against the separate `scholarshiphive_csr_test` DB, never against the main DB.
- Real PostgreSQL DB contents are not shipped inside ZIP; data is persisted in your installed PostgreSQL service.
