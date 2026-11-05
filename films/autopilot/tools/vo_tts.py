"""Voice lines with Gemini text-to-speech (gemini-3.8-flash-tts, Interactions API).

  python3 tools/vo_tts.py LINES.json OUT_DIR --voice en-gb-concierge-3 [--force]

LINES.json: [{"id": "L001", "text": "Have you ever forgotten your phone?", "style": "quiet, tired, remembering"}, ...]
Writes OUT_DIR/<id>.wav (24 kHz mono, as returned) and OUT_DIR/lines.json (what was sent). The line alone is
spoken: the direction rides in a speech_metadata annotation, so it is never read aloud. The key comes from
GEMINI_API_KEY, or from a network secret that adds x-goog-api-key for generativelanguage.googleapis.com.
"""
import base64, json, os, sys, time, urllib.error, urllib.request, wave

URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'
MODEL = 'gemini-3.8-flash-tts'


def post(body, key):
    h = {'Content-Type': 'application/json'}
    if key: h['x-goog-api-key'] = key
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), method='POST', headers=h)
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.load(r)


def main():
    a = sys.argv[1:]
    lines, out = json.load(open(a[0])), a[1]
    voice = a[a.index('--voice') + 1]
    key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    os.makedirs(out, exist_ok=True)
    for L in lines:
        dst = os.path.join(out, L['id'] + '.wav')
        if os.path.exists(dst) and '--force' not in a: continue
        body = {'model': MODEL, 'response_format': {'type': 'audio'},
                'generation_config': {'speech_config': [{'voice': voice}]},
                'input': [{'type': 'user_input', 'content': [{'type': 'text', 'text': L['text'],
                           'annotations': [{'type': 'speech_metadata', 'style': L.get('style', 'calm and clear')}]}]}]}
        resp = None
        for wait in (0, 5, 20, 60):
            time.sleep(wait)
            try: resp = post(body, key); break
            except urllib.error.HTTPError as e:
                msg = e.read().decode('utf-8', 'replace')[:300]
                if e.code in (429, 500, 502, 503): print(f"{L['id']}: HTTP {e.code}, retrying"); continue
                raise SystemExit(f"{L['id']}: HTTP {e.code}: {msg}")
        blocks = [c for st in resp.get('steps', []) if st.get('type') == 'model_output' for c in st.get('content', []) if c.get('type') == 'audio']
        if not blocks: raise SystemExit(f"{L['id']}: no audio: {json.dumps(resp)[:300]}")
        raw = base64.b64decode(blocks[-1]['data']); mime = blocks[-1].get('mime_type', '')
        if raw[:4] == b'RIFF': open(dst, 'wb').write(raw)
        else:
            rate = int(mime.split('rate=')[1].split(';')[0]) if 'rate=' in mime else 24000
            with wave.open(dst, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(raw)
        print(f"{L['id']}: {len(raw) // 1024} KB  {L['text']}")
    json.dump({'model': MODEL, 'voice': voice, 'lines': lines}, open(os.path.join(out, 'lines.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
