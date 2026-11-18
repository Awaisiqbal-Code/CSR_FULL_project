# Full-stack image: serves the FastAPI API AND the Admin portal from ONE service.
# Use this with Railway "Root Directory" = repository root (not /backend).
# (The existing backend/Dockerfile builds the API only, without the /admin portal,
#  because its build context is /backend and cannot reach the sibling admin-web/.)
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
# main.py resolves the portal at parents[2]/admin-web -> "/admin-web" inside the image.
COPY admin-web /admin-web
EXPOSE 8000
# Bootstrap the admin (idempotent) then run the API. The audit worker is a SEPARATE
# Railway service using the same image with Start Command overridden to: python -m app.worker
CMD ["sh","-c","python -m app.bootstrap_admin && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
