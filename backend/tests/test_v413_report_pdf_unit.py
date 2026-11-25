"""PDF parity for n8n v4.13 audit; synthetic inputs only, no DB or network."""
from io import BytesIO
from app.reporting import generate_pdf, generate_drill_pdf
try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None


def _base():
    return dict(hours=168,total_chats=2,potential_leads=1,possible_internal=0,
                unclassified=1,needs_review=0,unread_excluded=0,
                conversations=[dict(title='Synthetic lead',classification='potential_lead',
                                    messages=2,audit_category='responsive',lead_tier='hot',
                                    audit_status='stalled',audit_qa={
                                        'greeting':dict(rating='STRONG',finding='A greeting was verified')})],
                voice_notes_received=1,voice_notes_sent=2,known_voice_duration_seconds=60,
                call_placeholders=2,possible_no_reply=0,possible_dead=0,
                quality_notes=[],top_actions=['Verify: review student eligibility'],
                qa_dimensions=dict(greeting='STRONG - A greeting was verified'),
                counts_reconciled=True,ai_status='Synthetic AI verification')


def test_pdf_renders_legacy_and_original_n8n_audit_categories():
    report=_base()
    report.update(audit_counts=dict(responsive=1,internal_staff=0,empty=0,dead=0,
                                    consultant_no_reply=0,unclassified=1),
                  audit_counts_reconciled=True,audit_evaluated=2,audit_unavailable=0,
                  lead_tiers=dict(very_hot=0,hot=1,average=0,cold=0),
                  lead_tier_unassessed=0,audit_bottom_line='Follow up with this inquiry.')
    pdf=generate_pdf('Test Counselor',report)
    assert pdf.startswith(b'%PDF-') and len(pdf)>2000
    if PdfReader:
        content=' '.join(p.extract_text() for p in PdfReader(BytesIO(pdf)).pages)
        for needed in ('Lead Register','Very Hot','Hot','Average','Cold','STRONG',
                       'AI audit categories reconciled'):
            assert needed in content
        # "Individual Lead Evaluations" was removed; the 10-dimension Quality Framework covers QA.
        assert 'Individual Lead Evaluations' not in content
        assert 'Lead tiers have not been AI-evaluated' not in content


def test_pdf_prior_reports_still_render_without_new_fields():
    report=_base()
    pdf=generate_pdf('Legacy Test Counselor',report)
    assert pdf.startswith(b'%PDF-')
    if PdfReader:
        content=' '.join(p.extract_text() for p in PdfReader(BytesIO(pdf)).pages)
        assert 'Clients' in content
        assert 'Not assessed' in content


def test_drill_pdf_renders_subset_table():
    cols=['Conversation','Category','Lead tier','Reply state','Country','Voice (in/out)','Calls','Flags']
    rows=[['Fatima inquiry','Client','Very Hot','Replied','Pakistan','2 / 1 · 60s','0','—'],
          ['Omar follow-up','Client','Hot','Awaiting counselor reply','UAE','0 / 0','1','Needs review']]
    pdf=generate_drill_pdf('Test Counselor','Close to Conversion leads','Last 7 days',
                           '2026-11-24T10:00:00+00:00',cols,rows)
    assert pdf.startswith(b'%PDF-') and len(pdf)>1500
    if PdfReader:
        raw=' '.join(p.extract_text() for p in PdfReader(BytesIO(pdf)).pages)
        content=' '.join(raw.split())  # collapse column word-wrap newlines
        for needed in ('Close to Conversion leads','Test Counselor','Fatima inquiry',
                       'Omar follow-up','Very Hot','Awaiting counselor reply','Needs review'):
            assert needed in content, needed


def test_drill_pdf_handles_empty_and_ragged_rows():
    cols=['Conversation','Category','Flags']
    # Ragged row (too few / too many cells) must not crash.
    pdf=generate_drill_pdf('Counselor','Cold leads','Last 25 hours',None,cols,
                           [['Only title'],['A','B','C','D extra ignored']])
    assert pdf.startswith(b'%PDF-')
    empty=generate_drill_pdf('Counselor','Hot leads','Last 25 hours',None,cols,[])
    assert empty.startswith(b'%PDF-')
    if PdfReader:
        content=' '.join(p.extract_text() for p in PdfReader(BytesIO(empty)).pages)
        assert 'No conversations in this subset.' in content
