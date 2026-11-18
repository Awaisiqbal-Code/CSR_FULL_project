@echo off
setlocal
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" (
  echo Run SETUP_LOCAL.bat first.
  pause
  exit /b 1
)
echo Starting local FastAPI using PostgreSQL configured in backend\.env
echo API Docs: http://127.0.0.1:8000/docs
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
