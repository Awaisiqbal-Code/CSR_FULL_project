"""Separate Railway worker process: python -m app.worker"""
import json,time,traceback
from datetime import datetime, timezone
from sqlalchemy import select
from .config import production_check
from .db import SessionLocal,create_tables
from .models import AuditJob,User
from .analysis import build_summary
from .reporting import generate_pdf
from .ai_audit import run_optional_ai

def process_one() -> bool:
    with SessionLocal() as db:
        # PostgreSQL row lock avoids duplicate processing across worker replicas.
        stmt=select(AuditJob).where(AuditJob.status=='pending').order_by(AuditJob.id).limit(1).with_for_update(skip_locked=True)
        job=db.scalars(stmt).first()
        if not job:return False
        job.status='processing'
        job_id=job.id
        db.commit()
    try:
        with SessionLocal() as db:
            job=db.get(AuditJob,job_id)
            if not job or job.status!='processing':return True
            person=db.get(User,job.employee_id)
            # Use the explicit window stored at generation time; fall back to the
            # rolling hours from created_at for any legacy job without bounds.
            summary=build_summary(db,job.employee_id,job.hours,
                                  end=job.range_end or job.created_at,
                                  begin=job.range_start,
                                  period_label=job.period_label or None)
            summary=run_optional_ai(db,summary)
            pdf=generate_pdf(person.full_name if person else 'Employee',summary)
            job.summary_json=json.dumps(summary,default=str)
            job.pdf_bytes=pdf
            job.status='completed'
            job.completed_at=datetime.now(timezone.utc)
            db.commit()
    except Exception as e:
        with SessionLocal() as db:
            job=db.get(AuditJob,job_id)
            if job:
                job.status='failed';job.error=str(e)[:390];db.commit()
        traceback.print_exc()
    return True

def main():
    production_check();create_tables()
    print('CSR audit worker started',flush=True)
    while True:
        try:
            if not process_one():time.sleep(4)
        except Exception:
            traceback.print_exc();time.sleep(8)

if __name__=='__main__':main()
