"""No-network, no-DB tests for Gemini / Claude / legacy OpenAI adapters."""
import json
from types import SimpleNamespace

import pytest

from app import ai_providers, ai_audit


class DummyResponse:
    def __init__(self, data, status_error=False):
        self.data = data
        self.status_error = status_error
    def raise_for_status(self):
        if self.status_error:
            raise ai_providers.httpx.HTTPStatusError(
                'synthetic 503', request=ai_providers.httpx.Request('POST', 'https://example.test'),
                response=ai_providers.httpx.Response(503))
    def json(self):
        return self.data


def run_with_mock(monkeypatch, provider, response_data, model, expected_host):
    requests = []
    class Client:
        def __init__(self, timeout):
            assert timeout <= 60
        def __enter__(self): return self
        def __exit__(self, *_): return False
        def post(self, url, headers, json):
            requests.append((url, headers, json))
            return DummyResponse(response_data)
    monkeypatch.setattr(ai_providers.httpx, 'Client', Client)
    got = ai_providers.request_ai_report(provider, 'MOCK_TEST_KEY', model,
                                          'Return JSON', '{"synthetic":true}')
    assert got['executive_summary'] == 'Test result'
    assert requests[0][0].startswith(expected_host)
    assert 'MOCK_TEST_KEY' not in requests[0][0]
    assert requests[0][2]
    return requests[0]


def payload():
    return {'executive_summary': 'Test result', 'top_actions': [], 'qa_dimensions': {}}


def test_gemini_request_and_json_response(monkeypatch):
    response = {'candidates': [{'content': {'parts': [{'text': json.dumps(payload())}]}}]}
    url, headers, body = run_with_mock(monkeypatch, 'gemini', response,
                                        'gemini-3.5-flash', 'https://generativelanguage.googleapis.com/')
    assert url.endswith('/models/gemini-3.5-flash:generateContent')
    assert headers['x-goog-api-key'] == 'MOCK_TEST_KEY'
    assert body['generationConfig']['responseMimeType'] == 'application/json'
    assert body['systemInstruction']['parts'][0]['text'] == 'Return JSON'


def test_claude_request_and_json_response(monkeypatch):
    response = {'content': [{'type': 'text', 'text': json.dumps(payload())}]}
    url, headers, body = run_with_mock(monkeypatch, 'claude', response,
                                        'claude-sonnet-5-5', 'https://api.anthropic.com/v1/messages')
    assert headers['x-api-key'] == 'MOCK_TEST_KEY'
    assert 'anthropic-version' in headers
    assert body['messages'][0]['content'] == '{"synthetic":true}'


def test_openai_previous_provider_remains_supported(monkeypatch):
    response = {'choices': [{'message': {'content': json.dumps(payload())}}]}
    url, headers, body = run_with_mock(monkeypatch, 'openai', response,
                                        'gpt-4.1-mini', 'https://api.openai.com/v1/chat/completions')
    assert 'authorization' in headers
    assert body['response_format']['type'] == 'json_object'


def test_adapter_rejects_invalid_models_and_untrusted_provider():
    with pytest.raises(ai_providers.AuditAIError):
        ai_providers.request_ai_report('other', 'fake', 'some-model', 'p', '{}')
    with pytest.raises(ai_providers.AuditAIError):
        ai_providers.request_ai_report('gemini', 'fake', 'evil/../../url', 'p', '{}')
    with pytest.raises(ai_providers.AuditAIError):
        ai_providers.request_ai_report('gemini', '', 'gemini-3.5-flash', 'p', '{}')


def test_adapter_rejects_invalid_output_without_fabricating():
    for bad in ('', 'not JSON', '[]', 'null'):
        with pytest.raises(ai_providers.AuditAIError):
            ai_providers._parse_json_object(bad)
    assert ai_providers._parse_json_object('```json\n{"a": 1}\n```') == {'a': 1}


def fake_summary():
    return {
        'conversations': [{'id': 101, 'classification': 'potential_lead'}],
        'total_chats': 1, 'unread_excluded': 0, 'potential_leads': 1,
        'qa_dimensions': {'greeting': 'Not assessed', 'closing': 'Not assessed'},
        'quality_notes': [], 'possible_dead': 0, 'lead_tiers': {},
    }


class FakeSession:
    def scalars(self, stmt):
        return SimpleNamespace(all=lambda: [
            SimpleNamespace(timestamp='10:00', from_me=False,
                            text='Need scholarship support. Phone +923001234567. Email test@example.com',
                            media='voice')])


def set_test_config(monkeypatch, *, provider='gemini', allowed=True, key='FAKE_KEY'):
    monkeypatch.setattr(ai_audit.config, 'AI_ALLOWED', allowed)
    monkeypatch.setattr(ai_audit.config, 'AUDIT_AI_PROVIDER', provider)
    monkeypatch.setattr(ai_audit.config, 'GEMINI_API_KEY', key)
    monkeypatch.setattr(ai_audit.config, 'ANTHROPIC_API_KEY', key)
    monkeypatch.setattr(ai_audit.config, 'OPENAI_API_KEY', key)


def test_gemini_result_merged_into_existing_report_without_altering_counts(monkeypatch):
    set_test_config(monkeypatch)
    observed = {}
    def provider_call(provider, key, model, instructions, payload):
        observed['provider'] = provider
        observed['payload'] = payload
        return {'executive_summary': 'Evidence only',
                'top_actions': ['Follow up', 'Another action'],
                'qa_dimensions': {'greeting': 'Observed greeting', 'closing': 'Not assessed',
                                  'unknown_dimension': 'NOT TRUSTED'},
                'lead_tiers': {'very_hot': 999}, 'total_chats': 999}
    monkeypatch.setattr(ai_audit, 'request_ai_report', provider_call)
    summary = fake_summary()
    result = ai_audit.run_optional_ai(FakeSession(), summary)
    assert result['ai_provider'] == 'gemini'
    assert result['total_chats'] == 1
    assert result['lead_tiers'] == {}
    assert result['qa_dimensions'] == {'greeting': 'Observed greeting', 'closing': 'Not assessed'}
    assert '[phone redacted]' in observed['payload']
    assert '[email redacted]' in observed['payload']
    assert 'test@example.com' not in observed['payload']
    assert observed['provider'] == 'gemini'


def test_disabled_ai_makes_zero_requests(monkeypatch):
    set_test_config(monkeypatch, allowed=False)
    monkeypatch.setattr(ai_audit, 'request_ai_report', lambda *args: (_ for _ in ()).throw(AssertionError('called')))
    s = ai_audit.run_optional_ai(FakeSession(), fake_summary())
    assert s['qa_dimensions']['greeting'] == 'Not assessed'
    assert 'disabled' in s['ai_status']


def test_ai_error_preserves_rule_based_metrics_and_report(monkeypatch):
    set_test_config(monkeypatch)
    monkeypatch.setattr(ai_audit, 'request_ai_report',
                        lambda *args: (_ for _ in ()).throw(ai_providers.AuditAIError('fake')))
    summary = fake_summary()
    result = ai_audit.run_optional_ai(FakeSession(), summary)
    assert result['total_chats'] == 1
    assert result['qa_dimensions']['greeting'] == 'Not assessed'
    assert 'executive_summary' not in result
    assert 'fallback' in result['ai_status']


def test_missing_key_never_falls_back_to_another_provider(monkeypatch):
    set_test_config(monkeypatch, key='')
    s = ai_audit.run_optional_ai(FakeSession(), fake_summary())
    assert 'Gemini not configured' in s['ai_status']


def test_http_error_exposes_only_safe_status_code(monkeypatch):
    class Client:
        def __init__(self, timeout): pass
        def __enter__(self): return self
        def __exit__(self, *_): return False
        def post(self, url, headers, json):
            return DummyResponse(None, status_error=True)
    monkeypatch.setattr(ai_providers.httpx, 'Client', Client)
    with pytest.raises(ai_providers.AuditAIError, match='HTTP 503') as ex:
        ai_providers.request_ai_report('gemini', 'SECRET_TEST_KEY', 'gemini-3.5-flash', 'prompt', '{}')
    assert 'SECRET_TEST_KEY' not in str(ex.value)
