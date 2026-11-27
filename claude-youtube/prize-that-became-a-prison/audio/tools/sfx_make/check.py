"""Listen to every finished take with earshot and pick the best of each sound.

For each take: earshot match (the sound's description against its realistic alternatives: z, verdict, forced
choice), the AudioSet tagger's top labels (speech or music in a bed is a red flag), and measurements. Pass rule
(sound.md 4): the description beats every alternative in the forced choice and z >= 3, or holds >= 60 % of the
choice and twice the best alternative. The pick: a passing take with the highest z; if none passes, the highest z,
marked 'no pass: the ear decides'. Results are cached per take in fin/check.json (resumable).

Usage: EARSHOT_THREADS=2 python check.py ROOT [id ...]
"""
import sys, os, json, glob, time
from earshot import api

SPEECHY = ('Speech', 'Male speech, man speaking', 'Female speech, woman speaking', 'Conversation', 'Narration, monologue',
           'Babbling', 'Chatter', 'Crowd', 'Hubbub, speech noise, speech babble', 'Singing', 'Choir', 'Child speech, kid speaking')


def passes(m):
    alts = m.get('alts') or []
    p = m.get('p_vs_alts') or 0
    best_alt = max([a.get('p', 0) for a in alts] or [0])
    beats_all = p > best_alt
    if beats_all and m['z'] >= 3:
        return True
    return p >= 0.6 and p >= 2 * best_alt


def labels_of(d):
    for key in ('audioset', 'labels', 'audioset_labels', 'tags_audioset'):
        v = d.get(key)
        if v:
            out = []
            for it in v:
                if isinstance(it, dict):
                    out.append((it.get('label') or it.get('name'), float(it.get('p') or it.get('prob') or it.get('score') or 0)))
                elif isinstance(it, (list, tuple)):
                    out.append((it[0], float(it[1])))
            return out
    return []


def main(root, ids):
    cat = json.load(open(os.path.join(root, 'sounds.json')))['sounds']
    cp = os.path.join(root, 'fin', 'check.json')
    res = json.load(open(cp)) if os.path.exists(cp) else {}
    ids = ids or sorted(d for d in os.listdir(os.path.join(root, 'fin')) if os.path.isdir(os.path.join(root, 'fin', d)))
    for sid in ids:
        spec = cat[sid]
        takes = sorted(glob.glob(os.path.join(root, 'fin', sid, '*.wav')))
        if not takes:
            continue
        entry = res.get(sid, {'takes': {}})
        for p in takes:
            name = os.path.basename(p)
            mt = os.path.getmtime(p)
            old = entry['takes'].get(name)
            if old and old.get('mtime') == mt:
                continue
            t0 = time.time()
            m = api.match(p, spec['check'], alts=spec['alts'])
            d = api.describe(p, top=6)
            labs = labels_of(d)
            speech = max([pr for lb, pr in labs if lb in SPEECHY] or [0.0])
            meas = api.measure(p, light=True)
            entry['takes'][name] = {
                'mtime': mt, 'z': round(float(m['z']), 2), 'verdict': m['verdict'],
                'p_vs_alts': round(float(m.get('p_vs_alts') or 0), 3),
                'alts': [{'query': a['query'], 'p': round(float(a.get('p', 0)), 3)} for a in (m.get('alts') or [])],
                'closest': [f"{c['term']} (z {c['z']:+.1f})" for c in m.get('closest_vocab', [])[:3]],
                'audioset': [f'{lb} {pr:.2f}' for lb, pr in labs[:4]],
                'speech_p': round(speech, 2),
                'pass': passes(m),
                'dur_s': meas.get('duration'), 'lufs': meas.get('lufs_integrated', meas.get('lufs')),
                'true_peak_dbtp': meas.get('true_peak_dbtp'), 'peak_dbfs': meas.get('peak_dbfs'),
            }
            e = entry['takes'][name]
            print(f"{sid}/{name}: z {e['z']:+.2f} {e['verdict']}, choice {e['p_vs_alts']:.0%}, pass {e['pass']}, "
                  f"speech {e['speech_p']:.2f}, tags {e['audioset'][:3]} ({time.time() - t0:.0f} s)", flush=True)
            res[sid] = entry
            json.dump(res, open(cp, 'w'), indent=1)
        # pick
        tk = entry['takes']
        live = {k: v for k, v in tk.items() if os.path.exists(os.path.join(root, 'fin', sid, k))}
        ok = {k: v for k, v in live.items() if not (spec['kind'] == 'bed' and v['speech_p'] >= 0.20)}
        pool = ok or live
        passing = {k: v for k, v in pool.items() if v['pass']}
        src = passing or pool
        best = max(src, key=lambda k: (src[k]['z'], src[k]['p_vs_alts']))
        entry['pick'] = best
        entry['pick_reason'] = ('passes; highest z of the passing takes' if passing else 'no take passes: highest z; the ear decides')
        try:
            r = api.rank([os.path.join(root, 'fin', sid, k) for k in sorted(live)], spec['check'])
            entry['rank'] = [(x['name'], x['z']) for x in r['results']]
        except Exception as ex:  # noqa
            entry['rank'] = str(ex)
        res[sid] = entry
        json.dump(res, open(cp, 'w'), indent=1)
        print(f'== {sid}: pick {best} ({entry["pick_reason"]})', flush=True)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2:])
