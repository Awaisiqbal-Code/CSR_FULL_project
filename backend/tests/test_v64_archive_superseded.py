"""Safe cleanup of same-name duplicates: a stable-id (@lid) conversation supersedes
the old name-merged leftover, which is ARCHIVED (hidden), never deleted. In-memory
SQLite; no real data."""
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import User, Conversation
from app.main import _archive_superseded


def _session():
    eng = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(eng)
    return sessionmaker(bind=eng)()


def test_archive_superseded_hides_leftover_keeps_resolved_and_data():
    db = _session()
    emp = User(full_name='Emp', email='e@t.invalid', employee_code='001', whatsapp_number='1',
               role='employee', approved=True, active=True, password_hash='x')
    db.add(emp); db.flush()
    # Two resolved Hammads (different @lid) + the OLD name-merged Hammad (no wa_id)
    # + an unrelated contact with no twin.
    a = Conversation(employee_id=emp.id, external_key='k1', title='Hammad', wa_id='172246089875519@lid')
    b = Conversation(employee_id=emp.id, external_key='k2', title='Hammad', wa_id='5579279982813@lid')
    old = Conversation(employee_id=emp.id, external_key='k3', title='Hammad', wa_id=None)
    ali = Conversation(employee_id=emp.id, external_key='k4', title='Ali', wa_id=None)
    db.add_all([a, b, old, ali]); db.flush()

    # Dry run reports the one leftover and writes nothing.
    rep = _archive_superseded(db, dry_run=True)
    assert rep['archived'] == 1 and rep['groups_with_leftovers'] == 1 and 'Hammad' in rep['titles']
    assert all(not c.archived for c in (a, b, old, ali))

    # Real run: only the no-wa_id leftover is hidden.
    rep = _archive_superseded(db, dry_run=False)
    assert rep['archived'] == 1
    for c in (a, b, old, ali):
        db.refresh(c)
    assert old.archived is True
    assert a.archived is False and b.archived is False and ali.archived is False
    assert len(db.scalars(select(Conversation)).all()) == 4  # nothing deleted

    # Idempotent: a second run changes nothing.
    assert _archive_superseded(db, dry_run=False)['archived'] == 0


def test_no_resolved_twin_means_no_archive():
    # Two same-name contacts that are BOTH still name-keyed (no @lid captured yet) must
    # NOT be archived — we only hide a leftover once a resolved twin exists.
    db = _session()
    emp = User(full_name='Emp', email='e@t.invalid', employee_code='001', whatsapp_number='1',
               role='employee', approved=True, active=True, password_hash='x')
    db.add(emp); db.flush()
    db.add_all([Conversation(employee_id=emp.id, external_key='k1', title='Sana', wa_id=None),
                Conversation(employee_id=emp.id, external_key='k2', title='Sana', wa_id=None)])
    db.flush()
    assert _archive_superseded(db, dry_run=False)['archived'] == 0
