"""Generate the score's takes with Lyria 3.5 (Gemini Interactions API): one request per call, by generation id
(G1 ... G12) from audio/score_plan.json. Adapted from claude-film/one-too-many/tools/lyria.py for this film.

  python3 audio/tools/score/lyria.py G1 [G2 ...] [--kind planned|optional|retake|reword] [--why "..."]
                                     [--prompt "reworded prompt"] [--dry-run]

The key is a network secret: the session's HTTPS proxy replaces the dummy `x-goog-api-key` header on requests to
generativelanguage.googleapis.com, so this script never sees or stores a key.

  POST https://generativelanguage.googleapis.com/v1beta/interactions   {"model": "lyria-3.5", "input": "<prompt>"}

and the audio is the base64 `data` of the `audio` content in the `model_output` step (MP3, SynthID-watermarked).

Spend rules (the author's go, 28 Nov 2026), enforced here before every request:
- at most 18 generations in all (USD 1.44 at about USD 0.08 each), counting every request that may have been billed
  (audio returned, blocked with no audio, or a connection lost mid-response);
- optional G6 / G7 / G12 and retakes need --kind optional / retake and a --why; at most 6 retakes;
- a blocked prompt is logged and not retried (reword it neutrally once with --kind reword --prompt "...");
- a connection that drops mid-response is retried once; HTTP 429/5xx (nothing generated, not billed) wait and retry
  up to twice.
Every request is logged to audio/score/generations.json (id, take, kind, prompt, model, time, outcome, billed).
Raw takes go to audio/gen/score/<Gid>_t<k>.mp3 with a sidecar .json (model text, response without the audio).
"""
import base64, http.client, json, os, socket, sys, time, urllib.error, urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))   # the film folder (audio/tools/score/ -> up 3)
PLAN = os.path.join(ROOT, 'audio', 'score_plan.json')
LOG = os.path.join(ROOT, 'audio', 'score', 'generations.json')
GEN = os.path.join(ROOT, 'audio', 'gen', 'score')
URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'
CEILING, MAX_RETAKES, USD = 18, 6, 0.08
OPTIONAL = {'G6', 'G7', 'G12'}


def now():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def load_log():
    return json.load(open(LOG)) if os.path.exists(LOG) else {'about': __doc__.split('\n')[0], 'calls': []}


def save_log(L):
    counted = [c for c in L['calls'] if c['counts_toward_ceiling']]
    L['summary'] = {'requests': len(L['calls']), 'counted_generations': len(counted),
                    'billed_generations': sum(1 for c in L['calls'] if c['billed'] == 'yes'),
                    'retakes': sum(1 for c in counted if c['kind'] == 'retake'),
                    'estimated_usd': round(len(counted) * USD, 2), 'ceiling': CEILING,
                    'price_note': 'about USD 0.08 a generation (house figure, sound.md 7; not re-quoted)'}
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    json.dump(L, open(LOG, 'w'), indent=1)


def post(body):
    # the dummy key is replaced by the proxy's network secret on the way out; nothing real is ever in this process
    h = {'Content-Type': 'application/json', 'x-goog-api-key': 'proxy-injected'}
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), method='POST', headers=h)
    with urllib.request.urlopen(req, timeout=900) as r:
        return json.loads(r.read())


def audio_of(resp):
    """(bytes, mime, text) from an interaction: the first audio block of the model_output steps."""
    text, out = [], None
    for st in resp.get('steps', []) or []:
        if st.get('type') != 'model_output': continue
        for c in st.get('content', []) or []:
            if c.get('type') == 'audio' and out is None and c.get('data'):
                out = (base64.b64decode(c['data']), c.get('mime_type', 'audio/mpeg'))
            elif c.get('type') == 'text': text.append(c.get('text', ''))
    return (out[0], out[1], '\n'.join(text)) if out else (None, None, '\n'.join(text))


def strip_audio(o):
    if isinstance(o, dict): return {k: ('<%d base64 chars>' % len(v) if k == 'data' and isinstance(v, str) else strip_audio(v)) for k, v in o.items()}
    if isinstance(o, list): return [strip_audio(v) for v in o]
    return o


def generate(gid, gen, kind, why, prompt, L):
    counted = [c for c in L['calls'] if c['counts_toward_ceiling']]
    if len(counted) >= CEILING: sys.exit(f'{gid}: refused: {len(counted)} generations already count toward the ceiling of {CEILING}')
    if kind == 'retake' and sum(1 for c in counted if c['kind'] == 'retake') >= MAX_RETAKES:
        sys.exit(f'{gid}: refused: the {MAX_RETAKES} retakes are used')
    if gid in OPTIONAL and kind not in ('optional', 'retake', 'reword'): sys.exit(f'{gid} is optional: pass --kind optional --why "<the plan condition met>"')
    if kind in ('optional', 'retake', 'reword') and not why: sys.exit(f'{gid}: --kind {kind} needs --why')
    take = 1 + sum(1 for c in L['calls'] if c['id'] == gid and c.get('file'))
    body = {'model': gen['model'], 'input': prompt}
    entry = {'id': gid, 'name': gen['name'], 'take': take, 'kind': kind, 'why': why or '', 'model': gen['model'],
             'prompt': prompt, 'prompt_is_plan': prompt == gen['prompt']}
    drops = 0; busy = 0
    while True:
        t0 = time.time(); e = dict(entry, time=now())
        try:
            resp = post(body)
        except urllib.error.HTTPError as err:
            msg = err.read().decode('utf-8', 'replace')[:600]
            e.update(outcome=f'HTTP {err.code}: {msg}', billed='no', counts_toward_ceiling=False, secs=round(time.time() - t0, 1))
            L['calls'].append(e); save_log(L); print(f'{gid}: HTTP {err.code}: {msg[:300]}', flush=True)
            if err.code in (429, 500, 502, 503, 504) and busy < 2:
                busy += 1; time.sleep(30 * busy); continue
            return None
        except (http.client.IncompleteRead, http.client.RemoteDisconnected, ConnectionResetError, socket.timeout,
                TimeoutError, urllib.error.URLError) as err:
            e.update(outcome=f'connection lost: {type(err).__name__}: {str(err)[:200]}', billed='possibly',
                     counts_toward_ceiling=True, secs=round(time.time() - t0, 1))
            L['calls'].append(e); save_log(L); print(f'{gid}: connection lost ({type(err).__name__})', flush=True)
            drops += 1
            if drops == 1 and len([c for c in L['calls'] if c['counts_toward_ceiling']]) < CEILING:
                entry['kind'] = 'drop-retry'; continue
            return None
        data, mime, text = audio_of(resp)
        secs = round(time.time() - t0, 1)
        if not data:
            e.update(outcome='no audio returned (blocked or empty): ' + (text[:300] or json.dumps(strip_audio(resp))[:300]),
                     billed='unknown', counts_toward_ceiling=True, secs=secs)
            L['calls'].append(e); save_log(L); print(f'{gid}: BLOCKED / no audio: {e["outcome"][:300]}', flush=True)
            return None
        os.makedirs(GEN, exist_ok=True)
        ext = '.wav' if 'wav' in (mime or '') else '.mp3'
        name = f'{gid}_t{take}{ext}'
        open(os.path.join(GEN, name), 'wb').write(data)
        json.dump({'id': gid, 'take': take, 'model': gen['model'], 'prompt': prompt, 'mime_type': mime, 'model_text': text,
                   'time': e['time'], 'response': strip_audio(resp)}, open(os.path.join(GEN, f'{gid}_t{take}.json'), 'w'), indent=1)
        e.update(outcome=f'ok: {len(data) // 1024} KB {mime}', billed='yes', counts_toward_ceiling=True, secs=secs,
                 file=f'audio/gen/score/{name}', model_text=text[:500])
        L['calls'].append(e); save_log(L)
        print(f'{gid}: take {take}: {len(data) // 1024} KB {mime} in {secs} s', flush=True)
        return name


def main():
    a = sys.argv[1:]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    ids = [x for i, x in enumerate(a) if x.startswith('G') and (i == 0 or not a[i - 1].startswith('--'))]
    kind, why, prompt = opt('--kind', 'planned'), opt('--why', ''), opt('--prompt')
    plan = {g['id']: g for g in json.load(open(PLAN))['generations']}
    L = load_log()
    for gid in ids:
        g = plan[gid]
        if '--dry-run' in a: print(gid, kind, (prompt or g['prompt'])[:120]); continue
        generate(gid, g, kind, why, prompt or g['prompt'], L)
    print(json.dumps(L.get('summary', {})))


if __name__ == '__main__':
    main()
