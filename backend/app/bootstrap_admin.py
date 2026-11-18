"""Idempotent setup: ADMIN_EMAIL and ADMIN_PASSWORD via Railway secrets, then delete password env."""
from sqlalchemy import select
from .config import ADMIN_EMAIL,ADMIN_PASSWORD,production_check
from .db import create_tables,SessionLocal
from .models import User
from .security import hash_password

def main():
    production_check();create_tables()
    if not ADMIN_EMAIL and not ADMIN_PASSWORD:
        print('No admin bootstrap configured. Existing admin accounts left unchanged.')
        return
    if not ADMIN_EMAIL or len(ADMIN_PASSWORD) < 8:
        raise RuntimeError('ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars) required for bootstrap')
    with SessionLocal() as db:
        email=ADMIN_EMAIL.strip().lower()
        current=db.scalar(select(User).where(User.email==email))
        if current:
            if current.role!='admin':raise RuntimeError('ADMIN_EMAIL already belongs to employee; choose a different email')
            print('Admin already exists; unchanged.');return
        account=User(full_name='Super Admin',email=email,employee_code='ADMIN-'+email[:20],
            whatsapp_number='+000'+str(abs(hash(email)))[:9],password_hash=hash_password(ADMIN_PASSWORD),role='admin',approved=True,active=True,designation='Administrator')
        db.add(account);db.commit()
        print('Created initial Super Admin. Remove ADMIN_PASSWORD environment secret after bootstrap.')

if __name__=='__main__':main()
