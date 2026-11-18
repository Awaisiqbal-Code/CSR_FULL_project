"""No database or WhatsApp connection required for bounded private voice storage tests."""
import base64
from pathlib import Path
import pytest
from app.voice_storage import decode_audio_url, write_audio, read_audio

def test_ogg_validated_and_private_storage(tmp_path,monkeypatch):
    monkeypatch.setenv('CSR_VOICE_STORAGE_DIR',str(tmp_path))
    payload=b'OggS'+b'\x00'*150
    encoded='data:audio/ogg;base64,'+base64.b64encode(payload).decode()
    audio,mime,ext,digest=decode_audio_url(encoded)
    assert audio==payload and mime=='audio/ogg' and ext=='ogg'
    key=write_audio(123,audio,ext,digest)
    assert read_audio(key).read_bytes()==payload
    assert not (tmp_path/'../wrong').exists()

@pytest.mark.parametrize('raw',[
    'data:text/plain;base64,QUJD',
    'data:audio/ogg;base64,!!!',
    'data:audio/ogg;base64,'+base64.b64encode(b'NOT AUDIO'*10).decode(),
    'data:audio/ogg;base64,'+base64.b64encode(b'OggS'+b'0'*32).decode()+'=',
])
def test_invalid_audio_rejected(raw):
    with pytest.raises(ValueError):decode_audio_url(raw)

def test_media_key_path_validation():
    with pytest.raises(ValueError):read_audio('../.env')
