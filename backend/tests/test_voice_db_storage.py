"""Voice audio is stored in Postgres (not just ephemeral disk) and served from the DB,
so playback survives container redeploys. Standalone SQLite; no real DB or WhatsApp."""
import base64
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db import Base, get_db
from app.models import User, Conversation, Message, VoiceAsset
from app.main import app
from app.security import admin_only, current_user

NOW = datetime(2026, 11, 23, 9, 0, tzinfo=timezone.utc)
AUDIO = b'OggS' + b'\x00' * 60                      # valid OggS signature, 64 bytes
DATA_URL = 'data:audio/ogg;base64,' + base64.b64encode(AUDIO).decode()


def _seed(db):
    admin = User(full_name='Admin', email='a@test.invalid', employee_code='ADM',
                 whatsapp_number='001', role='admin', approved=True, active=True, password_hash='x')
    emp = User(full_name='Emp', email='e@test.invalid', employee_code='001',
               whatsapp_number='002', role='employee', approved=True, active=True, password_hash='x')
    db.add_all([admin, emp]); db.flush()
    conv = Conversation(employee_id=emp.id, external_key='k1', title='Customer',
                        state='potential_lead', first_seen_at=NOW, last_seen_at=NOW)
    db.add(conv); db.flush()
    msg = Message(conversation_id=conv.id, fingerprint='f1', text='', occurred_at=NOW,
                  from_me=False, sender='Customer', media='voice', source_message_id='false_x@c.us_AB')
    db.add(msg); db.flush()
    db.add(VoiceAsset(message_id=msg.id, status='pending', attempts=0))
    db.commit()
    return admin.id, emp.id, msg.id


def test_voice_saved_to_db_and_served_from_db():
    engine = create_engine('sqlite+pysqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Factory = sessionmaker(bind=engine)
    with Factory() as db:
        admin_id, emp_id, msg_id = _seed(db)

    def db_override():
        with Factory() as db: yield db
    app.dependency_overrides[get_db] = db_override
    try:
        client = TestClient(app)
        # Employee uploads the audio.
        app.dependency_overrides[current_user] = lambda: _get(Factory, User, emp_id)
        up = client.post('/sync/voice-upload', json={'message_id': msg_id, 'data_url': DATA_URL})
        assert up.status_code == 200, up.text
        # Bytes landed in Postgres, not only on disk.
        with Factory() as db:
            asset = db.scalar(select(VoiceAsset).where(VoiceAsset.message_id == msg_id))
            assert asset.status == 'available'
            assert asset.audio_data == AUDIO
            asset.storage_key = 'nonexistent-file.ogg'  # prove disk is not required
            db.commit()
        # Admin playback is served straight from the DB copy (no disk file present).
        app.dependency_overrides[admin_only] = lambda: _get(Factory, User, admin_id)
        resp = client.get(f'/admin/voices/{msg_id}')
        assert resp.status_code == 200, resp.text
        assert resp.content == AUDIO
        assert resp.headers['content-type'].startswith('audio/ogg')
    finally:
        for dep in (get_db, current_user, admin_only):
            app.dependency_overrides.pop(dep, None)
        engine.dispose()


def _get(Factory, model, pk):
    with Factory() as db:
        return db.get(model, pk)
