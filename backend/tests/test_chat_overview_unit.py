from datetime import datetime, timezone, timedelta
from app.chat_overview import analyze_message_rows,call_duration_seconds,resolve_from_me

T=datetime(2026,11,13,9,0,tzinfo=timezone.utc)


def test_resolve_from_me_authoritative_id_wins():
    # true_/false_ WhatsApp IDs are authoritative regardless of names.
    assert resolve_from_me(False,'Javed & Sons','true_abc@c.us',contact_title='Javed & Sons',employee_name='Talha Ahmad') is True
    assert resolve_from_me(True,'You','false_abc@c.us',contact_title='Javed & Sons',employee_name='Talha Ahmad') is False


def test_resolve_from_me_counselor_whatsapp_name_superset_is_outgoing():
    # The counselor's WhatsApp name is the ext-account name plus branding words.
    # Without an authoritative ID this must still be recognized as outgoing.
    assert resolve_from_me(False,'Talha Ahmad Scholarshiphive Edutancy','',
                           contact_title='Javed & Sons',employee_name='Talha Ahmad') is True
    # Exact name match still works.
    assert resolve_from_me(False,'Talha Ahmad','',contact_title='Javed & Sons',employee_name='Talha Ahmad') is True


def test_resolve_from_me_does_not_misattribute_customer_or_contact():
    # A customer whose name merely contains the counselor's first name is NOT outgoing.
    assert resolve_from_me(False,'Talhaa Ahmadd','',contact_title='Talhaa Ahmadd',employee_name='Talha Ahmad') is False
    # Sender equal to the saved contact is incoming even if stored said outgoing.
    assert resolve_from_me(True,'Javed & Sons','',contact_title='Javed & Sons',employee_name='Talha Ahmad') is False
    # A single-token account name must not prefix-match an unrelated customer.
    assert resolve_from_me(False,'Talha Khan','',contact_title='Javed & Sons',employee_name='Talha') is False


def test_duration_parser_only_known_formats():
    assert call_duration_seconds('1:20')==80
    assert call_duration_seconds('01:02:03')==3723
    assert call_duration_seconds('1m 5s')==65
    assert call_duration_seconds('20s')==20
    for value in ('','missed call','not sure','0:87','-1','unavailable'):
        assert call_duration_seconds(value) is None


def test_response_count_and_calls_are_evidence_based():
    rows=[
        (1,11,False,T,'',''),
        (2,11,True,T+timedelta(minutes=5),'',''),
        (3,11,False,T+timedelta(minutes=7),'voice',''),
        (4,11,True,T+timedelta(minutes=11),'',''),
        (5,12,False,T+timedelta(minutes=1),'',''),
        (6,13,False,None,'',''),
        (7,14,True,T,'',''),
        (8,11,False,None,'call','1:20'),
        (9,11,False,T+timedelta(minutes=12),'call','missed call'),
    ]
    out=analyze_message_rows(rows,{11,12,13,14})
    assert out['messages']==7
    assert out['call_events']==2
    assert out['calls_without_date']==1
    assert out['calls_with_duration']==1
    assert out['known_call_duration_seconds']==80
    assert out['response_pairs']==2
    assert out['avg_response_seconds']==270
    assert out['responded_chats']==1
    assert out['no_reply_observed_chats']==1
    assert out['response_unverifiable_chats']==2
    assert out['voice_notes']==1


def test_date_filter_omits_undated_events_and_old_events():
    rows=[(1,1,False,T,'',''),(2,1,True,T+timedelta(minutes=3),'',''),
          (3,1,False,None,'call','1:00'),(4,1,False,T-timedelta(days=20),'call','0:40')]
    data=analyze_message_rows(rows,{1},begin=T-timedelta(minutes=1),stop=T+timedelta(hours=1))
    assert data['messages']==2
    assert data['call_events']==0
    assert data['unknown_event_date_in_cohort']==1
    assert data['avg_response_seconds']==180


def test_only_empty_chats_not_misclassified_no_reply():
    data=analyze_message_rows([],{1,2})
    assert data['responded_chats']==0
    assert data['no_reply_observed_chats']==0
    assert data['response_unverifiable_chats']==2
    assert data['avg_response_seconds'] is None
    assert data['median_response_seconds'] is None


def test_median_is_robust_to_overnight_outlier():
    # Four 1-minute replies and one 10-hour overnight reply across separate chats.
    rows=[]
    for cid in (1,2,3,4):
        rows+=[(cid*10,cid,False,T,'',''),(cid*10+1,cid,True,T+timedelta(minutes=1),'','')]
    rows+=[(99,5,False,T,'',''),(100,5,True,T+timedelta(hours=10),'','')]
    out=analyze_message_rows(rows,{1,2,3,4,5})
    assert out['response_pairs']==5
    assert out['median_response_seconds']==60          # typical = 1 minute
    assert out['avg_response_seconds']==round((60*4+36000)/5)  # mean dragged up by the outlier
    assert out['p90_response_seconds']==36000          # the long tail is still visible
