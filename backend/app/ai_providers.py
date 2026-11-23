"""CSR audit AI provider adapters. No DB access, no local file access.

API keys are supplied by the worker's server-side configuration. Each adapter
returns the same JSON-shaped dict; callers must validate fields before storing.
"""
import json
import re
from urllib.parse import quote

import httpx

# Fixed host allow-list. A model string must never control the request host/path.
_MODEL_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$")


class AuditAIError(Exception):
    """A safe, non-secret error that permits deterministic report fallback."""


def _parse_json_object(value):
    if not isinstance(value, str) or not value.strip():
        raise AuditAIError('AI response did not contain text')
    cleaned = value.strip()
    if cleaned.startswith('```'):
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\s*```$', '', cleaned)
    try:
        obj = json.loads(cleaned)
    except (ValueError, TypeError) as exc:
        raise AuditAIError('AI response was not valid JSON') from exc
    if not isinstance(obj, dict):
        raise AuditAIError('AI response must be a JSON object')
    return obj


def request_ai_report(provider: str, key: str, model: str, instructions: str, payload: str) -> dict:
    """Call the selected provider once. No automatic cross-provider fallback.

    No retries: retry/rate-limiting belongs to the existing queue policy.
    """
    provider = (provider or '').lower().strip()
    if provider not in ('gemini', 'claude', 'openai'):
        raise AuditAIError('Unsupported AI provider')
    if not key:
        raise AuditAIError('AI API key not configured')
    if not _MODEL_RE.fullmatch(model or ''):
        raise AuditAIError('Invalid model name')
    headers = {'content-type': 'application/json'}
    if provider == 'gemini':
        url = ('https://generativelanguage.googleapis.com/v1beta/models/'
               + quote(model, safe='-_.') + ':generateContent')
        headers['x-goog-api-key'] = key
        request = {
            'systemInstruction': {'parts': [{'text': instructions}]},
            'contents': [{'role': 'user', 'parts': [{'text': payload}]}],
            'generationConfig': {
                'temperature': 0,
                'maxOutputTokens': 8192,
                'responseMimeType': 'application/json',
            },
        }
    elif provider == 'claude':
        url = 'https://api.anthropic.com/v1/messages'
        headers.update({'x-api-key': key, 'anthropic-version': '2023-06-01'})
        # NOTE: do NOT send `temperature` here. Current Claude models (e.g.
        # claude-sonnet-5-5) reject any non-default temperature with HTTP 400,
        # which previously made every audit AI call fail -> "No AI summary".
        request = {
            'model': model, 'max_tokens': 8192,
            'system': instructions,
            'messages': [{'role': 'user', 'content': payload}],
        }
    else:  # Backward-compatible existing OpenAI integration. Not auto-selected.
        url = 'https://api.openai.com/v1/chat/completions'
        headers['authorization'] = 'Bearer ' + key
        request = {
            'model': model, 'temperature': 0, 'max_tokens': 1600,
            'response_format': {'type': 'json_object'},
            'messages': [{'role': 'system', 'content': instructions},
                         {'role': 'user', 'content': payload}],
        }
    try:
        with httpx.Client(timeout=50) as client:
            response = client.post(url, headers=headers, json=request)
            response.raise_for_status()
            data = response.json()
        if provider == 'gemini':
            candidates = data.get('candidates', [])
            parts = (candidates[0].get('content', {}).get('parts', []) if candidates else [])
            content = ''.join(p.get('text', '') for p in parts if isinstance(p, dict))
        elif provider == 'claude':
            content = ''.join(item.get('text', '') for item in data.get('content', [])
                              if isinstance(item, dict) and item.get('type') == 'text')
        else:
            content = data['choices'][0]['message']['content']
        return _parse_json_object(content)
    except httpx.HTTPStatusError as exc:
        # HTTP status number is useful for 401/404/429/503 troubleshooting;
        # do NOT include URLs, response bodies, tokens or request data.
        raise AuditAIError(f'HTTP {exc.response.status_code}') from None
    except httpx.TimeoutException:
        raise AuditAIError('timeout') from None
    except (httpx.HTTPError, ValueError, KeyError, TypeError, IndexError):
        raise AuditAIError('invalid provider response or connection failure') from None
