"""PDF parity for n8n v4.13 audit; synthetic inputs only, no DB or network."""
from io import BytesIO
from app.reporting import generate_pdf
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
        for needed in ('Responsive Leads','Individual Lead Evaluations','Very Hot',
                       'Hot','Average','Cold','STRONG','AI audit categories reconciled'):
            assert needed in content
        assert 'Lead tiers have not been AI-evaluated' not in content


def test_pdf_prior_reports_still_render_without_new_fields():
    report=_base()
    pdf=generate_pdf('Legacy Test Counselor',report)
    assert pdf.startswith(b'%PDF-')
    if PdfReader:
        content=' '.join(p.extract_text() for p in PdfReader(BytesIO(pdf)).pages)
        assert 'Potential Leads' in content
        assert 'Not assessed' in content
