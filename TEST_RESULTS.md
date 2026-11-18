# Tests and verification status

## Current package-level checks

- Python syntax compilation, configuration static checks, generated SQLAlchemy PostgreSQL DDL, extension JavaScript parse checks and Node service-worker smoke tests are performed when packaging.
- The existing FastAPI integration test has been adapted to run **only** with an independently configured PostgreSQL database whose name ends in `_test`.

## Must test on user's laptop

- `SETUP_LOCAL.bat`: actual local PostgreSQL connection, creation of tables and first admin.
- `RUN_TESTS_LOCAL.bat`: dedicated PostgreSQL integration test — this drops/recreates tables **only** in the `_test` DB.
- Chrome extension real WhatsApp Web tests (initial sync, unread, duplicate handling, multi-account permissions).
- Simultaneous API/worker execution, PDF audit, AI assistant and error/retry handling.

## Must test after future deployment

Railway build/start, PostgreSQL connection, DB backup and recovery, persistence after restart, Chrome extension HTTPS API access, worker job reliability, end-to-end RBAC, privacy and live WhatsApp compatibility. No such deployment is claimed complete here.
