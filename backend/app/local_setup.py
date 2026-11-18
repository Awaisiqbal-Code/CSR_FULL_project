"""Initialize local PostgreSQL schema and first admin, without deleting any rows."""
import argparse
import getpass
import re
from sqlalchemy import select, text
from sqlalchemy.engine import make_url
from .config import APP_ENV, DB_URL, production_check
from .db import create_tables, engine, SessionLocal
from .models import User
from .security import hash_password


def main():
    parser=argparse.ArgumentParser(description='Initialize local PostgreSQL CSR database and Super Admin')
    parser.add_argument('--tables-only',action='store_true',help='Check connection and create missing tables only')
    args=parser.parse_args()
    if APP_ENV=='production':
        raise SystemExit('Local-only setup. Railway uses app.bootstrap_admin.')
    production_check()
    url=make_url(DB_URL)
    hostname=url.host or 'localhost'
    if hostname not in ('localhost','127.0.0.1','::1'):
        raise SystemExit('Local setup must use localhost PostgreSQL; refusing to modify a remote database.')
    try:
        with engine.connect() as conn:
            version=conn.execute(text('SELECT current_database(), current_user')).first()
            print('PostgreSQL connected: database=%s, user=%s' % tuple(version))
        create_tables()
    except Exception as exc:
        print('PostgreSQL connection/schema creation failed. Check PostgreSQL service, .env URL, user and DB privileges.')
        raise SystemExit(str(exc))
    print('Database tables ready (existing data preserved).')
    if args.tables_only: return
    with SessionLocal() as db:
        prior=db.scalars(select(User).where(User.role=='admin')).first()
        if prior:
            print('Admin already exists:',prior.email)
            print('Log in with the password previously configured.')
            return
        print('Create the initial local Super Admin. No preset password is included.')
        email=input('Admin email: ').strip().lower()
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email):
            raise SystemExit('Invalid email; rerun local setup.')
        pw=getpass.getpass('Admin password (8+ chars): ')
        confirm=getpass.getpass('Confirm password: ')
        if len(pw)<8 or pw!=confirm:
            raise SystemExit('Passwords must match and have 8 or more characters.')
        db.add(User(full_name='Local Super Admin',email=email,employee_code='LOCAL-ADMIN',
                whatsapp_number='+00000000001', phone='', department='Administration',
                designation='Administrator', role='admin', approved=True, active=True,
                password_hash=hash_password(pw)))
        db.commit()
        print('Local Super Admin created successfully:',email)

if __name__=='__main__':main()
