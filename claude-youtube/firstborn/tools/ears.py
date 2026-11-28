"""earshot in one process (the models load once): match, rank, describe or find for a list of jobs.

  /home/user/leonxlnx/earshot/.venv/bin/python tools/ears.py JOBS.json OUT.json [--threads 2]

JOBS.json: [{"key": "knock", "op": "match", "path": "...", "query": "...", "alts": ["..."]},
            {"key": "laugh", "op": "rank", "paths": ["a.wav", "b.wav"], "query": "..."},
            {"key": "x", "op": "describe", "path": "...", "start": 1.0, "end": 2.0},
            {"key": "y", "op": "find", "path": "...", "query": "...", "top": 3}]
OUT.json maps each key to earshot's result (its summary line first). Used by sfx_gen.py --check, sfx_variants.py,
vocal_fx.py and the final-mix listening (listen.py).
"""
import json, os, sys

a = sys.argv[1:]
if '--threads' in a: os.environ['EARSHOT_THREADS'] = a[a.index('--threads') + 1]
os.environ.setdefault('EARSHOT_THREADS', '2')
from earshot import api  # noqa: E402

jobs = json.load(open(a[0])); out = {}
for j in jobs:
    op = j.get('op', 'match')
    try:
        if op == 'match': r = api.match(j['path'], j['query'], alts=j.get('alts'), start=j.get('start'), end=j.get('end'))
        elif op == 'rank': r = api.rank(j['paths'], j['query'])
        elif op == 'describe': r = api.describe(j['path'], start=j.get('start'), end=j.get('end'))
        elif op == 'find': r = api.find(j['path'], j['query'], top=j.get('top', 3), start=j.get('start'), end=j.get('end'))
        elif op == 'realness': r = api.realness(j['path'], start=j.get('start'), end=j.get('end'))
        else: raise ValueError('unknown op ' + op)
    except Exception as e:
        r = {'error': str(e)}
    out[j['key']] = r
    s = r.get('summary') if isinstance(r, dict) else None
    print(f"{j['key']}: {s or (json.dumps(r)[:300])}", flush=True)
json.dump(out, open(a[1], 'w'), indent=1, default=str)
