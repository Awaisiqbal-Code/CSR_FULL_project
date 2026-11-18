"""Private local voice storage with bounded, validated data URLs.
Not served by StaticFiles; admin access requires a valid JWT.
Use a persistent volume or private object storage in production.
"""
from pathlib import Path
import base64
import hashlib
import os
import re
import tempfile

MAX_VOICE_BYTES=4*1024*1024
_ROOT=Path(__file__).resolve().parents[1]
def storage_directory():
    return Path(os.getenv('CSR_VOICE_STORAGE_DIR',str(_ROOT/'.csr_voice_private'))).resolve()

def decode_audio_url(data_url:str):
    match=re.fullmatch(r'data:(audio/(?:ogg|mpeg|mp3|mp4|webm|wav|x-wav))(?:;\s*codecs\s*=\s*\"?[a-z0-9._+-]+\"?)?;base64,([A-Za-z0-9+/=]+)',data_url,re.I)
    if not match: raise ValueError('Only audio data URLs are supported')
    b64=match.group(2)
    if len(b64)>((MAX_VOICE_BYTES+2)//3)*4+8: raise ValueError('Voice recording exceeds 4 MiB')
    try: audio=base64.b64decode(b64,validate=True)
    except Exception as exc: raise ValueError('Invalid base64 audio payload') from exc
    if not 32<=len(audio)<=MAX_VOICE_BYTES: raise ValueError('Invalid voice audio size')
    # Browser-supplied MIME alone is not proof of content. Reject obvious non-audio.
    if audio.startswith(b'OggS'):mime='audio/ogg';ext='ogg'
    elif audio.startswith(b'RIFF') and audio[8:12]==b'WAVE':mime='audio/wav';ext='wav'
    elif audio.startswith(b'ID3') or audio[:2] in (b'\xff\xfb',b'\xff\xf3',b'\xff\xf2'):mime='audio/mpeg';ext='mp3'
    elif audio[4:8]==b'ftyp':mime='audio/mp4';ext='m4a'
    elif audio[:4]==b'\x1a\x45\xdf\xa3':mime='audio/webm';ext='webm'
    else: raise ValueError('Audio signature not recognized')
    return audio,mime,ext,hashlib.sha256(audio).hexdigest()

def write_audio(message_id:int,audio:bytes,ext:str,sha256:str):
    folder=storage_directory(); folder.mkdir(parents=True,exist_ok=True,mode=0o700)
    key=f'{message_id}-{sha256[:24]}.{ext}'
    path=folder/key
    fd,tmp=tempfile.mkstemp(prefix='.upload-',dir=folder)
    try:
        os.chmod(tmp,0o600)
        with os.fdopen(fd,'wb') as stream:
            stream.write(audio);stream.flush();os.fsync(stream.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
    return key

def read_audio(key:str):
    if not re.fullmatch(r'[0-9]+-[a-f0-9]{24}\.(?:ogg|wav|mp3|m4a|webm)',key):
        raise ValueError('Invalid media key')
    return storage_directory()/key
