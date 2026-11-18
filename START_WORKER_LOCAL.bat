@echo off
setlocal
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" (
  echo Run SETUP_LOCAL.bat first.
  pause
  exit /b 1
)
echo Starting Audit Worker with the SAME PostgreSQL database from backend\.env
echo Leave this terminal open while generating PDF audit reports.
.venv\Scripts\python.exe -m app.worker
pause
