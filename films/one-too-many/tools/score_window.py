"""Choose where each generated cue starts inside its take. Lyria 3.5 writes about a minute of music whatever length
the prompt asks for, and does not keep the prompt's timestamps, so the cue's content can sit anywhere in the take.
earshot's `find` slides a window as long as the cue's span across the take (1 s steps) and scores every position
against what the cue must contain (LISTEN_FOR: its one distinctive element, since a query that mixes a solo line
with its bed prefers the bed); the best start is written to audio/score/windows.json as src_in_s,
which tools/score_place.py uses.

  <earshot venv>/bin/python tools/score_window.py [--only M01,M12]
"""
import json, os, sys
from earshot import api

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'audio', 'score')
LISTEN_FOR = {
    'M01': 'a solo piano playing slow, sparse single notes',          # the count: the cue's one distinctive element
    'M03': 'a mellow electric piano jazz trio with bass and brushes, laid-back dinner party music',
    'M04a': 'a warm electric piano trio with bass and brushes, mellow party music',
    'M04b': 'a quiet, sparse electric piano with bass and soft brushes',
    'M05a': 'two violas holding a quiet dissonant interval, uncanny strings',
    'M05b': 'quiet, tightening muted strings over a low held note',
    'M06a': 'background electric piano jazz trio, mellow dinner party music',
    'M06b': 'a slightly lopsided electric piano trio groove, livelier party music',
    'M07': 'still, haunting muted strings holding a dissonant interval',
    'M08a': 'quiet tense chamber strings, a held chord slowly darkening',
    'M08b': 'tense chamber strings, a dissonant chord in several octaves',
    'M09': 'cold, hushed, very still muted strings',
    'M10a': 'grinding tremolo strings, rising panic',
    'M10b': 'a single muted cello holding one long low note',
    'M10c': 'shaking low tremolo strings, fearful',
    'M10d': 'numb, hollow low strings, grief',
    'M11a': 'a quiet, tender string chord progression, a goodbye',
    'M11b': 'a solo cello playing slow falling notes',
    'M12': 'a solo piano playing slow, sparse single notes',          # the count's reprise
}
a = sys.argv[1:]
only = set(a[a.index('--only') + 1].split(',')) if '--only' in a else None
plan = {c['id']: c for c in json.load(open(os.path.join(ROOT, 'audio', 'score_plan.json')))['cues']}
wf = os.path.join(D, 'windows.json'); W = json.load(open(wf)) if os.path.exists(wf) else {}
for cid, c in plan.items():
    if only and cid not in only: continue
    f = next((os.path.join(D, cid + e) for e in ('.mp3', '.wav') if os.path.exists(os.path.join(D, cid + e))), None)
    if not f: continue
    span = c['end_s'] - c['start_s']
    r = api.find(f, LISTEN_FOR[cid], win=span, hop=1.0, top=3, kind='texture')
    segs = r.get('segments') or r.get('results') or r.get('moments') or []
    best = segs[0] if segs else None
    if best is None: print(cid, 'no window:', str(r)[:200]); continue
    st = float(best.get('start', best.get('start_s', 0.0)))
    W[cid] = {'src_in_s': round(st, 2), 'span_s': round(span, 2), 'z': best.get('z'), 'query': LISTEN_FOR[cid],
              'others': [round(float(s.get('start', s.get('start_s', 0))), 2) for s in segs[1:]]}
    print(f"{cid:5s} span {span:5.1f}s -> start {st:6.2f}s  z {best.get('z')}  ({LISTEN_FOR[cid][:50]})", flush=True)
json.dump(W, open(wf, 'w'), indent=1)
