"""Generate the music takes with Lyria 3.5 (Google Gemini API): one request per take in audio/score_plan.json `takes`.

  python3 tools/lyria.py [--only T1,T3] [--dry-run] [--force]

Adapted from claude-film/long-distance/tools/lyria.py. The key comes from GEMINI_API_KEY, or from the environment's
network secret that adds `x-goog-api-key: <key>` to requests for generativelanguage.googleapis.com (then this script
never sees the key). About USD 0.08 a request; the plan's `budget_requests` caps the total (counted in
audio/score/requests.json, every request sent, kept or not).

Writes audio/score/<take id>.mp3 and a sidecar <take id>.json (model, prompt, any text the model returned). A take whose
mp3 already exists is skipped unless --force. Requests go to the Interactions endpoint:
  POST https://generativelanguage.googleapis.com/v1beta/interactions   {"model": "lyria-3.5", "input": "<prompt>"}
and the audio is the base64 `data` of the `audio` content in the `model_output` step (MP3, SynthID-watermarked).
A prompt the safety filter blocks is reported and skipped, never retried.
"""
import base64, json, os, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'
D = os.path.join(ROOT, 'audio', 'score')
LEDGER = os.path.join(D, 'requests.json')


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
    takes = [c for c in plan['takes'] if 'prompt' in c and (not only or c['id'] in only)]
    os.makedirs(D, exist_ok=True)
    ledger = json.load(open(LEDGER)) if os.path.exists(LEDGER) else []
    budget = plan.get('budget_requests', 8)
    if '--dry-run' in a:
        for c in takes: print(f"{c['id']:4s} {c.get('role', ''):5s} {c['prompt'][:110]}...")
        print(f"{len(takes)} takes; {len(ledger)} of {budget} requests used"); return
    key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not key: print('no GEMINI_API_KEY in the environment: relying on the network secret for generativelanguage.googleapis.com')
    failed = []
    for c in takes:
        dst = os.path.join(D, c['id'] + '.mp3')
        if os.path.exists(dst) and '--force' not in a: print(f"{c['id']}: have it"); continue
        if len(ledger) >= budget: print(f"{c['id']}: budget of {budget} requests used up, skipped"); failed.append(c['id']); continue
        body = {'model': c['model'], 'input': c['prompt']}
        resp = None
        for wait in (0, 10, 30):                        # rate limits, transient server errors and dropped connections only
            time.sleep(wait)
            ledger.append({'id': c['id'], 'at': time.strftime('%Y-%m-%dT%H:%M:%S')}); json.dump(ledger, open(LEDGER, 'w'), indent=1)
            try: resp = post(body, key); break
            except urllib.error.HTTPError as e:
                msg = e.read().decode('utf-8', 'replace')[:400]
                if e.code in (429, 500, 502, 503, 504): print(f"{c['id']}: HTTP {e.code}, retrying"); continue
                print(f"{c['id']}: HTTP {e.code}: {msg}"); break
            except (urllib.error.URLError, ConnectionError, TimeoutError, OSError) as e:
                print(f"{c['id']}: {type(e).__name__} {getattr(e, 'reason', '')}, retrying"); continue
        if resp is None: failed.append(c['id']); continue
        data, mime, text = audio_of(resp)
        if not data:
            print(f"{c['id']}: no audio returned (blocked or empty): {text[:300] or json.dumps(resp)[:300]}"); failed.append(c['id']); continue
        ext = '.wav' if 'wav' in (mime or '') else '.mp3'
        with open(dst[:-4] + ext, 'wb') as fh: fh.write(data)
        json.dump({'id': c['id'], 'role': c.get('role'), 'model': c['model'], 'prompt': c['prompt'], 'mime_type': mime, 'model_text': text},
                  open(os.path.join(D, c['id'] + '.json'), 'w'), indent=1)
        print(f"{c['id']}: {len(data) // 1024} KB {mime}", flush=True)
    print(f"{len(ledger)} of {budget} requests used")
    if failed: print('failed:', ' '.join(failed)); sys.exit(1)


if __name__ == '__main__':
    main()
