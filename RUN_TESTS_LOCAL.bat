@echo off
setlocal
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" (
  echo Run SETUP_LOCAL.bat first.
  pause
  exit /b 1
)
echo WARNING: Integration tests will RESET tables in the dedicated scholarshiphive_csr_test database only.
echo Never use the main scholarshiphive_csr database as TEST_DATABASE_URL.
.venv\Scripts\python.exe -m pytest -q
if errorlevel 1 (
  echo Tests failed; confirm TEST_DATABASE_URL points to a dedicated _test PostgreSQL database.
  pause
  exit /b 1
)
where node >nul 2>nul
if not errorlevel 1 (
  cd /d "%~dp0extension-tests"
  node --test test-background.cjs
) else (
  echo Optional Node.js extension tests skipped: Node is not installed.
)
pause
