"""Generate the film's score with Lyria 3.5 (Google Gemini API): one request per cue in audio/score_plan.json.

  python3 tools/lyria.py [--only M01,M04b] [--dry-run] [--force]

The key comes from GEMINI_API_KEY, or from a network secret on the environment that adds the header
`x-goog-api-key: <key>` to requests for generativelanguage.googleapis.com (then this script never sees the key).

Writes audio/score/<cue id>.mp3 and a sidecar <cue id>.json (model, prompt, any text the model returned). A cue whose
mp3 already exists is skipped unless --force. Requests go to the Interactions endpoint documented at
https://ai.google.dev/gemini-api/docs/music-generation:
  POST https://generativelanguage.googleapis.com/v1beta/interactions   {"model": "lyria-3.5", "input": "<prompt>"}
and the audio is the base64 `data` of the `audio` content in the `model_output` step. Output is MP3 with a SynthID
watermark. A prompt the safety filter blocks is reported and skipped, never retried.
"""
import base64, json, os, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'


def post(body, key):
    h = {'Content-Type': 'application/json'}
    if key: h['x-goog-api-key'] = key        # else the environment's network secret adds the header on the way out
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), method='POST', headers=h)
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.load(r)


def audio_of(resp):
    """(bytes, mime, text) from an interaction: the first audio block of the model_output steps."""
    text, out = [], None
    for st in resp.get('steps', []):
        if st.get('type') != 'model_output': continue
        for c in st.get('content', []):
            if c.get('type') == 'audio' and out is None: out = (base64.b64decode(c['data']), c.get('mime_type', 'audio/mpeg'))
            elif c.get('type') == 'text': text.append(c.get('text', ''))
    return (out[0], out[1], '\n'.join(text)) if out else (None, None, '\n'.join(text))


def main():
    a = sys.argv[1:]
    only = set(a[a.index('--only') + 1].split(',')) if '--only' in a else None
    plan = json.load(open(os.path.join(ROOT, 'audio', 'score_plan.json')))
    cues = [c for c in plan['cues'] if not only or c['id'] in only]
    if '--dry-run' in a:
        for c in cues: print(f"{c['id']:6s} {c['model']:20s} {c['end_s'] - c['start_s']:6.1f} s  {c['prompt'][:110]}...")
        print(f"{len(cues)} requests"); return
    key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not key: print('no GEMINI_API_KEY in the environment: relying on a network secret that adds x-goog-api-key '
                      'for generativelanguage.googleapis.com')
    d = os.path.join(ROOT, 'audio', 'score'); os.makedirs(d, exist_ok=True)
    failed = []
    for c in cues:
        dst = os.path.join(d, c['id'] + '.mp3')
        if os.path.exists(dst) and '--force' not in a: print(f"{c['id']}: have it"); continue
        body = {'model': c['model'], 'input': c['prompt']}
        resp = None
        for wait in (0, 10, 30, 90):                    # rate limits and transient server errors only
            time.sleep(wait)
            try: resp = post(body, key); break
            except urllib.error.HTTPError as e:
                msg = e.read().decode('utf-8', 'replace')[:400]
                if e.code in (429, 500, 502, 503, 504): print(f"{c['id']}: HTTP {e.code}, retrying"); continue
                print(f"{c['id']}: HTTP {e.code}: {msg}"); break
            except urllib.error.URLError as e:
                print(f"{c['id']}: {e.reason}, retrying"); continue
            except (ConnectionError, TimeoutError, OSError) as e:      # a dropped connection mid-response
                print(f"{c['id']}: {type(e).__name__}, retrying"); continue
        if resp is None: failed.append(c['id']); continue
        data, mime, text = audio_of(resp)
        if not data:
            print(f"{c['id']}: no audio returned (blocked or empty): {text[:300] or json.dumps(resp)[:300]}"); failed.append(c['id']); continue
        ext = '.wav' if 'wav' in (mime or '') else '.mp3'
        dst = dst[:-4] + ext
        with open(dst, 'wb') as fh: fh.write(data)
        json.dump({'id': c['id'], 'model': c['model'], 'prompt': c['prompt'], 'mime_type': mime, 'model_text': text},
                  open(os.path.join(d, c['id'] + '.json'), 'w'), indent=1)
        print(f"{c['id']}: {len(data) // 1024} KB {mime}")
    if failed: print('failed:', ' '.join(failed)); sys.exit(1)


if __name__ == '__main__':
    main()
