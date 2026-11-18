"""Safe, synthetic-only PDF audit regression test. No configured database connection."""
from io import BytesIO
try:
    from pypdf import PdfReader
except ImportError:  # PDF text extraction is an optional test helper.
    PdfReader = None
from app.reporting import generate_pdf


def test_legacy_tier_names_visible_without_inventing_counts():
    summary={
        'hours':25,'total_chats':1,'potential_leads':1,'needs_review':0,
        'unread_excluded':0,'possible_internal':0,'unclassified':0,
        'conversations':[], 'voice_notes_received':0,'voice_notes_sent':0,
        'known_voice_duration_seconds':0,'call_placeholders':1,
        'possible_no_reply':0,'possible_dead':0,'quality_notes':[],
        'top_actions':[],'ai_status':'Rule-based only','counts_reconciled':True,
        'qa_dimensions':{},
    }
    pdf=generate_pdf('Synthetic Test Counselor',summary)
    assert pdf.startswith(b'%PDF-')
    if PdfReader is None:
        return  # Header test still runs; use pypdf for optional PDF text checks.
    pages=PdfReader(BytesIO(pdf)).pages
    content=' '.join(p.extract_text() for p in pages)
    for tier in ['Very Hot','Hot','Average','Cold']:
        assert tier in content
    assert content.count('Not assessed')>=4
    assert 'Detected call events: 1' in ' '.join(content.split())
    assert 'Synthetic Test Counselor' in content
