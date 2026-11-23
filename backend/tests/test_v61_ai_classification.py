"""AI-authoritative classification + lead tier (old n8n/Gemini approach): the AI's
per-chat category and tier override the deterministic result for evaluated chats,
while chats the AI could not evaluate keep their rule-based values. Pure unit test."""
from app.analysis import apply_ai_classification


def _summary():
    return {
        'conversations': [
            # evaluated: AI says responsive + HOT -> becomes a Client, tier hot
            {'id': 1, 'classification': 'unclassified', 'lead_tier': None, 'audit_analysis_status': 'evaluated',
             'audit_category': 'responsive', 'audit_tier': 'hot', 'countries': ['Italy'], 'is_follow_up': False,
             'possible_consultant_no_reply': 0, 'possible_dead': 0},
            # evaluated: AI says internal_staff -> Internal, no tier
            {'id': 2, 'classification': 'potential_lead', 'lead_tier': 'very_hot', 'audit_analysis_status': 'evaluated',
             'audit_category': 'internal_staff', 'audit_tier': None, 'countries': [], 'is_follow_up': False,
             'possible_consultant_no_reply': 0, 'possible_dead': 0},
            # evaluated: consultant_no_reply -> Client (lead who got no reply), no tier, is a follow-up
            {'id': 3, 'classification': 'unclassified', 'lead_tier': None, 'audit_analysis_status': 'evaluated',
             'audit_category': 'consultant_no_reply', 'audit_tier': None, 'countries': [], 'is_follow_up': True,
             'possible_consultant_no_reply': 1, 'possible_dead': 0},
            # UNAVAILABLE: AI failed -> keep deterministic Client + cold tier
            {'id': 4, 'classification': 'potential_lead', 'lead_tier': 'cold', 'audit_analysis_status': 'unavailable',
             'audit_category': 'unclassified', 'audit_tier': None, 'countries': ['France'], 'is_follow_up': False,
             'possible_consultant_no_reply': 0, 'possible_dead': 0},
            # evaluated: AI downgrades a deterministic lead to unclassified -> tier cleared
            {'id': 5, 'classification': 'potential_lead', 'lead_tier': 'very_hot', 'audit_analysis_status': 'evaluated',
             'audit_category': 'unclassified', 'audit_tier': None, 'countries': ['Italy'], 'is_follow_up': False,
             'possible_consultant_no_reply': 0, 'possible_dead': 0},
        ],
    }


def test_ai_overrides_and_recounts():
    s = apply_ai_classification(_summary())
    rows = {r['id']: r for r in s['conversations']}
    assert rows[1]['classification'] == 'potential_lead' and rows[1]['lead_tier'] == 'hot'
    assert rows[2]['classification'] == 'internal_staff' and rows[2]['lead_tier'] is None
    assert rows[3]['classification'] == 'potential_lead' and rows[3]['lead_tier'] is None
    assert rows[4]['classification'] == 'potential_lead' and rows[4]['lead_tier'] == 'cold'  # unavailable -> kept
    assert rows[5]['classification'] == 'unclassified' and rows[5]['lead_tier'] is None       # AI downgrade

    assert s['potential_leads'] == 3      # rows 1, 3, 4
    assert s['possible_internal'] == 1    # row 2
    assert s['unclassified'] == 1         # row 5
    assert s['counts_reconciled'] is True
    assert s['lead_tiers']['hot'] == 1 and s['lead_tiers']['cold'] == 1 and s['lead_tiers']['very_hot'] == 0
    assert s['old_client_follow_up'] == 1       # row 3 (follow-up client)
    assert s['possible_no_reply'] == 1          # row 3
    assert s['country_leads'] == {'France': 1, 'Italy': 1}   # row5 Italy dropped (now unclassified)
    assert s['unknown_country_leads'] == 1      # row 3 (client, no country)
    assert s['classification_source'] == 'ai'


def test_no_evaluated_rows_is_a_safe_noop():
    s = {'conversations': [
        {'id': 1, 'classification': 'potential_lead', 'lead_tier': 'cold', 'audit_analysis_status': 'unavailable',
         'audit_category': 'unclassified', 'audit_tier': None, 'countries': [], 'is_follow_up': False},
    ], 'potential_leads': 1}
    out = apply_ai_classification(s)
    assert out['conversations'][0]['classification'] == 'potential_lead'  # untouched
    assert 'classification_source' not in out                            # nothing recomputed
