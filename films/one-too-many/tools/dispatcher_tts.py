"""Voice the 999 Dispatcher with Gemini text-to-speech: the only spoken voice in the film (the friends speak in type).

  python3 tools/dispatcher_tts.py out/spot [--only L237] [--force] [--voice en-gb-concierge-5]

Every DISPATCHER line, verbatim from the script, with its on-screen time from the spotting packs, is spoken by one
British voice from Google's Extended Voice Library, given a per-line direction (calm, procedural; steadier and slower
as Scott falls apart). Writes audio/voice/<line id>.wav (24 kHz mono, as returned) and audio/voice/lines.json (start
times on the film's clock). The phone-line treatment is applied at mix time by tools/voice_place.py. The key comes
from GEMINI_API_KEY or from a network secret that adds x-goog-api-key for generativelanguage.googleapis.com.
"""
import base64, glob, json, os, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
MODEL = 'gemini-3.8-flash-tts'
URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'
# per-line direction: a trained call handler. Calm and procedural, then slower and steadier as the call goes wrong.
STYLE = {
    'L001': 'calm but urgent, keeping a shocked caller talking',
    'L003': 'steady, careful, a procedural question',
    'L237': 'brisk and neutral, the standard opening of an emergency call',
    'L238': 'calm, clear, procedural',
    'L240': 'reassuring, then a careful question',
    'L242': 'gentle and even',
    'L244': 'quiet and careful, bracing for the answer',
    'L246': 'slow, firm and kind, grounding someone in shock',
    'L247': 'very gentle, slow, almost a whisper of a question',
}


def post(body, key):
    h = {'Content-Type': 'application/json'}
    if key: h['x-goog-api-key'] = key
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), method='POST', headers=h)
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.load(r)


def main():
    a = sys.argv[1:]
    spot = a[0]; only = set(a[a.index('--only') + 1].split(',')) if '--only' in a else None
    voice = a[a.index('--voice') + 1] if '--voice' in a else 'en-gb-concierge-5'
    key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    lines = []
    for f in sorted(glob.glob(os.path.join(spot, 'Q*.json'))):
        s = json.load(open(f))
        lines += [dict(id=L['id'], text=L['text'], start_s=round(s['start'] + L['at'], 3), end_s=round(s['start'] + L['end'], 3))
                  for L in s['lines'] if L['who'] == 'dispatcher']
    d = os.path.join(ROOT, 'audio', 'voice'); os.makedirs(d, exist_ok=True)
    for L in lines:
        if only and L['id'] not in only: continue
        dst = os.path.join(d, L['id'] + '.wav')
        if os.path.exists(dst) and '--force' not in a: continue
        # the line alone is spoken; the direction rides in a speech_metadata annotation, never in the text
        body = {'model': MODEL, 'response_format': {'type': 'audio'},
                'generation_config': {'speech_config': [{'voice': voice}]},
                'input': [{'type': 'user_input', 'content': [{'type': 'text', 'text': L['text'], 'annotations': [
                    {'type': 'speech_metadata', 'style': 'a British emergency call handler on the phone, ' + STYLE.get(L['id'], 'calm and clear')}]}]}]}
        resp = None
        for wait in (0, 5, 20, 60):
            time.sleep(wait)
            try: resp = post(body, key); break
            except urllib.error.HTTPError as e:
                msg = e.read().decode('utf-8', 'replace')[:400]
                if e.code in (429, 500, 503): print(f"{L['id']}: HTTP {e.code}, retrying"); continue
                raise SystemExit(f"{L['id']}: HTTP {e.code}: {msg}")
        blocks = [c for st in resp.get('steps', []) if st.get('type') == 'model_output' for c in st.get('content', []) if c.get('type') == 'audio']
        if not blocks: raise SystemExit(f"{L['id']}: no audio: {json.dumps(resp)[:300]}")
        raw = base64.b64decode(blocks[-1]['data']); mime = blocks[-1].get('mime_type', '')
        if raw[:4] == b'RIFF':
            open(dst, 'wb').write(raw)
        else:                                   # headerless 16-bit PCM (audio/L16;rate=24000): wrap it
            import wave
            rate = int(mime.split('rate=')[1].split(';')[0]) if 'rate=' in mime else 24000
            with wave.open(dst, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(raw)
        print(f"{L['id']}: {len(raw) // 1024} KB {mime}  {L['text']}")
    json.dump({'model': MODEL, 'voice': voice, 'lines': lines}, open(os.path.join(d, 'lines.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
