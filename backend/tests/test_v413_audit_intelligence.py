"""Pure synthetic v4.13 tests; no real database, HTTP calls or customer data."""
import json
from dataclasses import dataclass
from types import SimpleNamespace

from app import audit_intelligence as a
from app import ai_providers


@dataclass
class Msg:
    id: int
    from_me: bool
    text: str = ''
    media: str = ''
    timestamp: str = '10:00'


class FakeDB:
    def __init__(self, mapping):
        self.mapping = mapping
    def scalars(self, stmt):
        params = stmt.compile().params
        cid = next(v for k, v in params.items() if 'conversation_id' in k)
        return SimpleNamespace(all=lambda: self.mapping.get(cid, []))


def summary(n):
    return {
        'conversations': [{'id': i, 'title': f'Synthetic Chat {i}', 'messages': 2,
                           'classification': 'unclassified', 'needs_review': False}
                          for i in range(1, n+1)],
        'total_chats': n, 'potential_leads': 0, 'possible_internal': 0,
        'unclassified': n, 'needs_review': 0, 'unread_excluded': 0,
        'qa_dimensions': {d: 'Not assessed' for d in a.DIMENSIONS},
        'quality_notes': [], 'counts_reconciled': True,
        # Deliberately wrong deterministic point-model tiers. The narrative must NOT be
        # fed these (that was the "16 very hot in summary / 0 in table" conflict); it
        # must use the AI's CGPA-validated tiers so it matches the Lead Pipeline table.
        'lead_tiers': {'close_to_conversion': 9, 'very_hot': 9, 'hot': 9, 'average': 9, 'cold': 9},
    }


def response_item(chat, category, tier=None, basis='insufficient', status=None):
    msgs = chat['messages']
    evid = [msgs[0]['id']] if msgs else []
    qa = {d: {'rating': 'NONE', 'finding': 'No supported observation', 'evidence_ids': []}
          for d in a.DIMENSIONS} if category == 'responsive' else {}
    if category == 'responsive':
        qa['greeting'] = {'rating': 'STRONG', 'finding': 'Counselor greeted customer',
                          'evidence_ids': [msgs[-1]['id']]}
    return {'conversation_id': chat['conversation_id'], 'category': category,
            'reason': 'Source messages support this classification', 'evidence_ids': evid,
            'tier': tier, 'tier_basis': basis, 'status': status,
            'status_reason': 'Country counselor handoff documented' if status == 'closed' else 'No verified closure',
            'status_evidence_ids': [msgs[-1]['id']] if msgs and status in ('closed', 'rejected') else [],
            'qa': qa, 'review_reasons': [], 'next_action': 'Confirm next admission steps',
            'urgency': 'Today (0-2 days)'}


def test_original_n8n_categories_tiers_and_qa_aggregate():
    mapping = {
        1: [Msg(101,False,'I want to apply to Germany. CGPA 3.8.'),
            Msg(102,True,'Hello, I transferred your case to our Germany country counselor.')],
        2: [Msg(201,False,'Please update the internal attendance roster.')],
        3: [Msg(301,False,'Need UK scholarship admission advice')],
        4: [Msg(401,True,'We received your student inquiry; interested in admissions?')],
        5: [],
        6: [Msg(601,False,media='voice')],
    }
    labels={1:('responsive','very_hot','cgpa','closed'),
            2:('internal_staff',None,'insufficient',None),
            3:('consultant_no_reply',None,'insufficient',None),
            4:('dead',None,'insufficient',None),
            5:('empty',None,'insufficient',None),
            6:('unclassified',None,'insufficient',None)}
    calls=[]
    def request(provider,key,model,prompt,payload):
        data=json.loads(payload)
        calls.append(data)
        if 'conversations' not in data:
            return {'executive_summary':'Reviewed all verified audit findings.',
                    'bottom_line':'Follow up on open student inquiries.'}
        assert all('title' not in c for c in data['conversations'])
        entries=[]
        for c in data['conversations']:
            cat,tier,basis,status=labels[c['conversation_id']]
            entries.append(response_item(c,cat,tier,basis,status))
        return {'results':entries,'counts':{'totalChats':99999,'responsive':99999}}
    result=a.evaluate_conversations(FakeDB(mapping),summary(6),'gemini','TEST','model',
                                    request_fn=request,batch_size=4,delay_seconds=0)
    assert len(calls)==3  # two batches + validated narrative
    # The narrative call (no 'conversations') must receive the AI-validated tiers,
    # NOT the deterministic lead_tiers, so summary text matches the Lead Pipeline table.
    narrative_call=next(c for c in calls if 'conversations' not in c)
    assert narrative_call['tiers']==result['ai_tier_opinions']
    assert narrative_call['tiers']!=summary(6)['lead_tiers']
    assert result['audit_counts']==dict(zip(a.CATEGORIES,[1,1,1,1,1,1]))
    assert result['audit_counts_reconciled'] is True
    assert result['audit_evaluated']==6
    assert result['ai_tier_opinions']==dict(zip(a.TIERS,[1,0,0,0]))
    assert result['lead_tier_unassessed']==0
    assert result['conversations'][0]['audit_tier']=='very_hot'
    assert result['conversations'][0]['audit_status']=='closed'
    assert result['qa_ratings']['greeting']['rating']=='STRONG'
    assert result['qa_ratings']['sop_compliance']['rating']=='NONE'
    assert result['qa_dimensions']['greeting'].startswith('STRONG')
    assert result['executive_summary'].startswith('Reviewed')
    assert result['total_chats']==6  # never copy hallucinated AI totals
    assert result['potential_leads']==0  # existing deterministic dashboard unchanged
    assert result['audit_rules_version']


def test_sender_direction_mismatch_cannot_become_responsive():
    chat={'conversation_id':1,'needs_review':False,
          'messages':[{'id':101,'direction':'incoming','time':'','text':'I need admission','media':None}]}
    ans=response_item(chat,'responsive','very_hot','cgpa','closed')
    verified=a._validate_one(ans,chat)
    assert verified['audit_category']=='unclassified'
    assert verified['audit_tier'] is None
    assert verified['audit_status'] is None


def test_missing_or_inconsistent_cgpa_cannot_force_tier():
    chat={'conversation_id':2,'needs_review':False,'messages':[
        {'id':201,'direction':'incoming','time':'','text':'I want a scholarship. CGPA 3.3','media':None},
        {'id':202,'direction':'outgoing','time':'','text':'What program?','media':None}]}
    ans=response_item(chat,'responsive','cold','cgpa','stalled')
    verified=a._validate_one(ans,chat)
    assert verified['audit_tier'] is None
    ans['tier']='hot'
    assert a._validate_one(ans,chat)['audit_tier']=='hot'
    chat['messages'][0]['text']='I want a scholarship, no CGPA given'
    assert a._validate_one(ans,chat)['audit_tier'] is None


def test_missing_media_is_never_fake_empty_or_qa_failure():
    chat={'conversation_id':3,'needs_review':True,'messages':[]}
    ans=response_item(chat,'empty')
    verified=a._validate_one(ans,chat)
    assert verified['audit_category']=='unclassified'
    assert verified['audit_qa']=={}


def test_invalid_ids_fail_whole_batch_without_dropping_chat():
    def fake(*args):
        return {'results':[{'conversation_id':12345,'category':'responsive','reason':'no'}]}
    result=a.evaluate_conversations(FakeDB({1:[Msg(101,False,'Hello')]}),summary(1),
                                    'gemini','TEST','model',request_fn=fake,delay_seconds=0)
    assert result['audit_evaluated']==0
    assert result['audit_unavailable']==1
    assert result['audit_counts']['unclassified']==1
    assert result['audit_counts_reconciled'] is True
    assert result['ai_tier_opinions']=={}


def test_provider_503_stops_batch_processing_without_second_request():
    requests=[]
    def fail(*args):
        requests.append(1)
        raise ai_providers.AuditAIError('HTTP 503')
    result=a.evaluate_conversations(FakeDB({}),summary(8),'gemini','TEST','model',
                                    request_fn=fail,batch_size=4,delay_seconds=0)
    assert len(requests)==1
    assert result['audit_unavailable']==8
    assert result['audit_counts']['unclassified']==8


def test_zero_chats_makes_no_ai_requests():
    def fail(*args): raise AssertionError('No AI calls expected')
    result=a.evaluate_conversations(FakeDB({}),summary(0),'gemini','TEST','model',
                                    request_fn=fail,delay_seconds=0)
    assert result['audit_evaluated']==0
    assert result['ai_tier_opinions']=={}
    assert result['audit_counts_reconciled'] is True


def test_mask_private_information_in_prompt():
    text='Send OTP 123456 to +923001234567 or user@example.com; CGPA 3.1'
    masked=a._mask(text)
    assert '123456' not in masked
    assert '+923001234567' not in masked
    assert 'user@example.com' not in masked
    assert 'CGPA 3.1' in masked


def test_missing_capture_never_fabricates_dead_or_no_reply():
    for status,from_me in [('dead',True),('consultant_no_reply',False)]:
        chat={'conversation_id':9,'capture_needs_review':True,
              'messages':[{'id':901,'direction':'outgoing' if from_me else 'incoming',
                           'text':'Admissions inquiry','time':'','media':None}]}
        out=a._validate_one(response_item(chat,status),chat)
        assert out['audit_category']=='unclassified'


def test_closed_requires_actual_handoff_not_merely_a_promise():
    chat={'conversation_id':4,'capture_needs_review':False,
          'messages':[{'id':401,'direction':'incoming','text':'I need a scholarship CGPA 3.8','time':'','media':None},
                      {'id':402,'direction':'outgoing','text':'I will connect you soon','time':'','media':None}]}
    proposed=response_item(chat,'responsive','very_hot','cgpa','closed')
    assert a._validate_one(proposed,chat)['audit_status']=='stalled'
    chat['messages'][1]['text']='I transferred your case to our country counselor'
    assert a._validate_one(proposed,chat)['audit_status']=='closed'
