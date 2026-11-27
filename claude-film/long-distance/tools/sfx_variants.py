"""Regenerate the weaker generated sounds as variants, let earshot rank them against their description, and keep the best.

  python3 tools/sfx_variants.py audio/gen_variants.json [--threads 2] [--jobs 2]

audio/gen_variants.json: {"key": {"prompts": ["...", "..."], "seeds": [1001, 2002], "dur": 2, "match": "...",
                                  "cc0": ["otm/cloth2"]}, ...}
For each key: audio/gen/var/<key>/<n>.wav for every prompt x seed, then one earshot process ranks, per key, the
current take, the variants and any CC0 recordings named (One Too Many's, `otm/<name>`) against the match text. A
generated winner replaces audio/gen/<key>.wav; a CC0 winner is recorded and the sound map points at it. The losing
variants are deleted (the disk is small); audio/gen/picks.json keeps every candidate's score, and the variant's prompt
and seed, so any of them can be made again.
"""
import json, os, shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from sfx_gen import gen, EARSHOT_PY  # noqa: E402

OTM = os.path.normpath(os.path.join(ROOT, '..', 'one-too-many', 'audio', 'sfx'))


def main():
    a = sys.argv[1:]
    spec = json.load(open(a[0])); threads = a[a.index('--threads') + 1] if '--threads' in a else '2'
    jobs = int(a[a.index('--jobs') + 1]) if '--jobs' in a else 2
    plan = json.load(open(os.path.join(ROOT, 'audio', 'gen_plan.json')))
    gen_dir = os.path.join(ROOT, 'audio', 'gen'); pf = os.path.join(gen_dir, 'picks.json')
    picks = json.load(open(pf)) if os.path.exists(pf) else {}
    work, meta = [], {}
    for key, v in spec.items():
        if key.startswith('_'): continue
        d = os.path.join(gen_dir, 'var', key); os.makedirs(d, exist_ok=True)
        dur = v.get('dur', plan[key]['dur']); n = 0
        for p in v['prompts']:
            for s in v.get('seeds', [1001, 2002]):
                n += 1; dst = os.path.join(d, f'{n}.wav'); meta[dst] = {'prompt': p, 'seed': s, 'dur': dur}
                if not os.path.exists(dst): work.append((p, dst, dur, s))

    def one(w):
        p, dst, dur, s = w; r = gen(p, dst, dur, s, threads)
        print(('FAILED ' if r.returncode else '') + os.path.relpath(dst, gen_dir), flush=True)
    with ThreadPoolExecutor(jobs) as ex: list(ex.map(one, work))

    batch = []
    for key, v in spec.items():
        if key.startswith('_'): continue
        d = os.path.join(gen_dir, 'var', key); cur = os.path.join(gen_dir, key + '.wav'); keep = os.path.join(d, '0_original.wav')
        if not os.path.exists(keep) and os.path.exists(cur): shutil.copy(cur, keep)
        cands = sorted(os.path.join(d, f) for f in os.listdir(d) if f.endswith('.wav'))
        cands += [os.path.join(OTM, c.split('/', 1)[1] + '.flac') for c in v.get('cc0', [])]
        batch.append({'key': key, 'op': 'rank', 'paths': cands, 'query': v.get('match', plan[key]['match'])})
    jf = tempfile.mktemp(suffix='.json'); rf = jf + '.out'; json.dump(batch, open(jf, 'w'))
    subprocess.run([EARSHOT_PY, os.path.join(HERE, 'ears.py'), jf, rf, '--threads', str(int(threads) * jobs)], check=True)
    res = json.load(open(rf)); os.remove(jf); os.remove(rf)
    for key, r in res.items():
        rows = r.get('results') or r.get('ranking') or []
        if not rows: print(key, 'rank failed', r.get('error')); continue
        best = rows[0]; path = best['path']
        rec = {'match': spec[key].get('match', plan[key]['match']), 'z': best.get('z'), 'verdict': best.get('verdict'),
               'candidates': [{'file': os.path.relpath(x['path'], ROOT if x['path'].startswith(ROOT) else os.path.dirname(OTM)), 'z': x.get('z')} for x in rows]}
        if path.startswith(OTM):
            rec['pick'] = 'otm/' + os.path.basename(path)[:-5]; rec['source'] = 'CC0 recording (One Too Many)'
        else:
            rec['pick'] = os.path.relpath(path, gen_dir)
            if os.path.basename(path) != '0_original.wav':
                shutil.copy(path, os.path.join(gen_dir, key + '.wav')); rec.update(meta.get(path, {}))
            else:
                rec.update({'prompt': plan[key]['prompt'], 'seed': plan[key]['seed'], 'dur': plan[key]['dur']})
        picks[key] = rec
        print(f"{key}: best {rec['pick']} z {best.get('z')} {best.get('verdict', '')}", flush=True)
        shutil.rmtree(os.path.join(gen_dir, 'var', key), ignore_errors=True)      # the winner is in audio/gen; the rest go
    json.dump(picks, open(pf, 'w'), indent=1)


if __name__ == '__main__':
    main()
