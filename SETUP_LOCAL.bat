@echo off
setlocal
cd /d "%~dp0backend"
echo ============================================
echo Scholarshiphive CSR - Local PostgreSQL Setup
echo ============================================
if not exist ".env" (
  copy /Y ".env.example" ".env" >nul
  echo Created backend\.env. EDIT DATABASE_URL and JWT_SECRET before continuing.
  echo First create PostgreSQL user and scholarshiphive_csr database in pgAdmin.
  echo Read START_HERE_POSTGRES_ROMAN_URDU.md
  pause
  exit /b 1
)
where py >nul 2>nul
if not errorlevel 1 (
  py -3 -m venv .venv
) else (
  python -m venv .venv
)
if errorlevel 1 (
  echo ERROR: Python 3.11+ missing or virtual environment failed.
  pause
  exit /b 1
)
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
  echo ERROR: Python dependencies could not be installed.
  pause
  exit /b 1
)
.venv\Scripts\python.exe -m app.local_setup
if errorlevel 1 (
  echo ERROR: PostgreSQL connection or Super Admin setup failed. Check backend\.env.
  pause
  exit /b 1
)
echo SUCCESS: PostgreSQL tables and admin ready. Start API and Worker next.
pause
