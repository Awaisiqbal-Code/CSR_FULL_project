import hashlib, hmac, secrets
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from . import models
from .db import get_db
from .config import JWT_SECRET, TOKEN_HOURS

bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    iteration = 600_000
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, iteration)
    return f'pbkdf2_sha256${iteration}${salt.hex()}${digest.hex()}'

def check_password(password: str, stored: str) -> bool:
    try:
        _, count, salt, expected = stored.split('$')
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(count))
        return hmac.compare_digest(actual, bytes.fromhex(expected))
    except (TypeError, ValueError, AttributeError):
        return False

def token_for(user: models.User) -> str:
    issued = datetime.now(timezone.utc)
    return jwt.encode({'sub':str(user.id),'ver':user.token_version,'iat':issued,'exp':issued+timedelta(hours=TOKEN_HOURS)}, JWT_SECRET, algorithm='HS256')

def current_user(auth: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> models.User:
    if not auth:
        raise HTTPException(401, 'Login required')
    try:
        data = jwt.decode(auth.credentials, JWT_SECRET, algorithms=['HS256'])
        user = db.get(models.User, int(data['sub']))
        if not user or not user.active or not user.approved or data.get('ver') != user.token_version:
            raise ValueError('Account not active')
        return user
    except (jwt.InvalidTokenError, ValueError, KeyError, TypeError):
        raise HTTPException(401, 'Session invalid or expired')

def admin_only(user: models.User = Depends(current_user)) -> models.User:
    if user.role != 'admin':
        raise HTTPException(403, 'Admin access required')
    return user

def assert_scope(user: models.User, employee_id: int):
    if user.role != 'admin' and user.id != employee_id:
        raise HTTPException(403, 'You can access only your own records')
