"""Listen to House Ealdholt's designed sounds with earshot (github.com/Leonxlnx/earshot), and re-make the ones that fail.

    <earshot venv>/Scripts/python tools/listen_sfx.py [--only L03_launch,L10_bell] [--tries 3] [--check-only] [--recheck]
                                                  [--improve]
    <earshot venv>/Scripts/python tools/listen_sfx.py --only L03_launch --prompt "..." [--seed 1314] [--dur 2]   # one take

For every sound in audio/sfx_plan.json, earshot describes audio/sfx_sa/<id>.wav (api.describe) and matches it against
the plan's 'check', with its 'not' list as the alternatives (api.match). A sound passes when it clearly wins: its check
beats every alternative in that forced choice, and it is either 'strong' (z >= 3 among earshot's vocabulary) or ahead
by a clear margin (at least 60% of the forced choice and twice the best alternative).

A sound that fails is made again with tools/stable_sfx.py, with the next sharper prompt in RETRY below (written after
hearing what it was confused with) or else the same prompt on another seed, until it passes or has had --tries takes,
and the best take is kept (one that passes ranks by z, one that fails by how near it came to winning the forced choice).
With --improve, a sound that passes with z below 2 (it wins the forced choice but earshot's vocabulary does not single
it out) also gets one more take. A kept re-take writes its prompt, seed and dur back into its entry in audio/sfx_plan.json
(nothing else there changes) and into audio/sfx_sa/plan.json. Every take and every verdict is in
audio/sfx_sa/check.json; an unchanged file is not heard again unless --recheck.
"""
import argparse, hashlib, json, os, re, sys, tempfile, time

from earshot import api

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True  # no tools/__pycache__ in the repository
import stable_sfx as sa  # noqa: E402

CHECK = os.path.join(sa.OUT, 'check.json')
MIN_P, MIN_RATIO = 0.60, 2.0
RULE = (f"pass = the check beats every 'not' alternative in earshot's forced choice (p_vs_alts), and is 'strong' "
        f"(z >= 3) or has at least {MIN_P:.0%} of the choice and {MIN_RATIO:g}x the best alternative")
SEED_STEP = 1000  # a re-take with no RETRY entry keeps the prompt and moves the seed by this
IMPROVE_Z = 2.0   # --improve: passes below earshot's 'weak' band get one more take
# id -> sharper takes to try in order, each (prompt, seed, dur or None to keep the plan's). Written after the first
# listen (check.json keeps every take): what each first take was confused with is in the comment. "no music" in a
# prompt tended to bring music in (the text encoder does not take the negation), so these describe the texture instead.
RETRY = {}  # nothing yet for this film: a sound that fails is made again on another seed


def sha1(path):
    return hashlib.sha1(open(path, 'rb').read()).hexdigest()


def pct(p):
    return f'{100 * p:.0f}%'


def judge(m):
    """(passed, won, why) for an api.match result"""
    p, alts = m['p_vs_alts'], m.get('alts') or []
    best = max(alts, key=lambda x: x['p']) if alts else None
    won = best is None or p > best['p']
    strong = m['verdict'] == 'strong'
    clear = best is None or (p >= MIN_P and p >= MIN_RATIO * best['p'])
    if won and (strong or clear):
        return True, won, ('strong' if strong else 'clear margin') + f" (z {m['z']:+.1f}, {pct(p)})"
    if not won:
        return False, won, f"lost to '{best['query']}' ({pct(best['p'])} against {pct(p)}; z {m['z']:+.1f})"
    return False, won, f"ahead without a clear margin ({pct(p)}, '{best['query']}' {pct(best['p'])}; z {m['z']:+.1f})"


def listen(path, e):
    d = api.describe(path)
    m = api.match(path, e['check'], alts=e['not'])
    passed, won, why = judge(m)
    return {'pass': passed, 'won': won, 'why': why, 'verdict': m['verdict'], 'z': round(float(m['z']), 2),
            'p_vs_alts': m['p_vs_alts'], 'rank_in_vocab': m['rank_in_vocab'],
            'alts': [{'query': x['query'], 'p': x['p'], 'z': round(float(x['z']), 2)} for x in m.get('alts') or []],
            'sounds_like': [{'term': x['term'], 'z': round(float(x['z']), 2)} for x in m.get('closest_vocab') or []],
            'audioset': [{'label': x['label'], 'p': round(float(x['p']), 2)} for x in (d.get('audioset') or [])[:3]],
            'describe': d.get('summary'), 'match': m.get('summary')}


def margin(r):
    """the check's share of the forced choice less the best alternative's"""
    return r['p_vs_alts'] - max([a['p'] for a in r['alts']] or [0.0])


def score(r):
    """takes that pass rank by z, then share; takes that fail by how near they came to winning, then z"""
    if r['pass']:
        return (True, r['z'], r['p_vs_alts'])
    return (False, margin(r), r['z'])


def fmt_num(v):
    return str(int(v)) if float(v).is_integer() else repr(float(v))


def update_plan(sid, prompt, seed, dur):
    """write a kept take's prompt, seed and dur into its line of audio/sfx_plan.json, leaving the rest as it is"""
    txt = open(sa.PLAN).read()
    lines = txt.split('\n')
    at = [i for i, ln in enumerate(lines) if f'"id": "{sid}"' in ln]
    if len(at) != 1:
        raise RuntimeError(f'{sid}: expected one line in sfx_plan.json, found {len(at)}')
    ln = lines[at[0]]
    ln = re.sub(r'"prompt": "(?:[^"\\]|\\.)*"', lambda _: '"prompt": ' + json.dumps(prompt, ensure_ascii=False), ln,
                count=1)
    ln = re.sub(r'"dur": -?[0-9.]+', lambda _: f'"dur": {fmt_num(dur)}', ln, count=1)
    ln = re.sub(r'"seed": -?\d+', lambda _: f'"seed": {int(seed)}', ln, count=1)
    lines[at[0]] = ln
    new = '\n'.join(lines)
    a, b = json.loads(txt), json.loads(new)
    want = [dict(s, prompt=prompt, seed=int(seed), dur=dur) if s['id'] == sid else s for s in a['sounds']]
    if b['sounds'] != want or {k: v for k, v in a.items() if k != 'sounds'} != {k: v for k, v in b.items()
                                                                                 if k != 'sounds'}:
        raise RuntimeError(f'{sid}: sfx_plan.json edit would change more than prompt, seed and dur; not written')
    tmp = sa.PLAN + '.partial'
    open(tmp, 'w').write(new)
    os.replace(tmp, sa.PLAN)


def take_record(n, prompt, seed, dur, r, gen=None):
    best = max(r['alts'], key=lambda x: x['p']) if r['alts'] else None
    t = {'take': n, 'prompt': prompt, 'seed': int(seed), 'dur': dur, 'pass': r['pass'], 'why': r['why'],
         'verdict': r['verdict'], 'z': r['z'], 'p_vs_alts': r['p_vs_alts'],
         'best_alt': best and {'query': best['query'], 'p': best['p']},
         'sounds_like': [x['term'] for x in r['sounds_like'][:2]]}
    if gen:
        t.update(gen_s=gen['gen_s'], clipped_samples=gen['clipped_samples'], raw_peak_dbfs=gen['raw_peak_dbfs'])
    return t


def free_seed(prompt, seed, dur, tried):
    seed = int(seed)
    while (prompt, seed, dur) in tried:
        seed += SEED_STEP
    return seed


def next_take(sid, cur, tried):
    """the settings for the next take: the next unused RETRY entry, else the kept prompt on a new seed"""
    for prompt, seed, dur in RETRY.get(sid, []):
        dur = cur['dur'] if dur is None else dur
        if (prompt, int(seed), dur) not in tried:
            return prompt, int(seed), dur
    return cur['prompt'], free_seed(cur['prompt'], cur['seed'], cur['dur'], tried), cur['dur']


def save(results, sounds):
    order = [e['id'] for e in sounds]
    rows = [results[i] for i in order if i in results]
    doc = {'tool': 'earshot 0.4.1: api.describe and api.match (CLAP laion/larger_clap_general @ 16c8cc3, AudioSet '
                   'tagger MIT/ast-finetuned-audioset-10-10-0.4593 @ f826b80)',
           'rule': RULE, 'sounds_checked': len(rows), 'passed': sum(1 for r in rows if r.get('pass')),
           'failed': [r['id'] for r in rows if r.get('pass') is False],
           'missing': [r['id'] for r in rows if r.get('pass') is None], 'sounds': rows}
    tmp = CHECK + '.partial'
    with open(tmp, 'w') as fh:
        json.dump(doc, fh, indent=1, ensure_ascii=False)
        fh.write('\n')
    os.replace(tmp, CHECK)


def made_from(sid, e):
    """the prompt, seed and dur the current file was made from (audio/sfx_sa/plan.json), else the plan's"""
    p = os.path.join(sa.OUT, 'plan.json')
    rec = {}
    if os.path.exists(p):
        rec = next((s for s in json.load(open(p)).get('sounds', []) if s['id'] == sid and s.get('file')), {})
    if rec:
        return rec['prompt'], int(rec['seed']), rec['duration_s'], rec
    return e['prompt'], int(e['seed']), e['dur'], {}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--only', help='comma-separated ids')
    ap.add_argument('--tries', type=int, default=3, help='takes per sound in all, the first one included (default 3)')
    ap.add_argument('--check-only', action='store_true', help='listen and report; make nothing')
    ap.add_argument('--recheck', action='store_true', help='listen again even to files heard before')
    ap.add_argument('--improve', action='store_true',
                    help=f"also give a sound that passes with z below {IMPROVE_Z:g} (no match among earshot's "
                         'vocabulary: it only wins the forced choice) one more take, kept if earshot rates it higher')
    ap.add_argument('--prompt', help='with --only <one id>: make and hear one take with this prompt (kept if better)')
    ap.add_argument('--seed', type=int, help='with --prompt: its seed (default: the next unused)')
    ap.add_argument('--dur', type=float, help="with --prompt: its duration (default: the plan's)")
    a = ap.parse_args()
    sounds = sa.plan_sounds()
    ids = {e['id'] for e in sounds}
    only = set(a.only.split(',')) if a.only else None
    if only and only - ids:
        sys.exit(f'listen_sfx: unknown id(s): {", ".join(sorted(only - ids))}')
    if a.prompt and (not only or len(only) != 1 or a.check_only):
        sys.exit('listen_sfx: --prompt needs --only with exactly one id, and makes a take (no --check-only)')
    old = {}
    if os.path.exists(CHECK):
        old = {r['id']: r for r in json.load(open(CHECK)).get('sounds', [])}
    results = dict(old)
    os.makedirs(sa.OUT, exist_ok=True)
    for e in sounds:
        sid = e['id']
        if only and sid not in only:
            continue
        f = os.path.join(sa.OUT, sid + '.wav')
        prev = old.get(sid, {})
        takes = [dict(t) for t in prev.get('takes', [])]
        if not os.path.exists(f):
            if a.check_only:
                results[sid] = {'id': sid, 'pass': None, 'why': 'no file yet', 'takes': takes}
                save(results, sounds)
                continue
            sa.write_plan({sid: sa.generate(e['prompt'], e['dur'], e['seed'], f)})
        prompt, seed, dur, rec = made_from(sid, e)
        h = sha1(f)
        mine = next((t for t in takes if t.get('sha1') == h), None)
        if mine is not None and 'z' in mine and 'z' in prev and prev.get('sha1') == h and not a.recheck:
            r = {k: prev[k] for k in ('pass', 'won', 'why', 'verdict', 'z', 'p_vs_alts', 'rank_in_vocab', 'alts',
                                      'sounds_like', 'audioset', 'describe', 'match')}
        else:
            t0 = time.time()
            r = listen(f, e)
            print(f"{sid}: {'PASS' if r['pass'] else 'FAIL'} {r['why']} [heard in {time.time() - t0:.0f} s]",
                  flush=True)
            if mine is None:  # a file this tool has not heard: made by stable_sfx.py
                mine = {'take': len(takes) + 1}
                takes.append(mine)
            gen = rec if {'gen_s', 'clipped_samples', 'raw_peak_dbfs'} <= set(rec) else None
            mine.update(take_record(mine['take'], prompt, seed, dur, r, gen), sha1=h)
        for t in takes:
            t['kept'] = t is mine
        tried = {(t['prompt'], t['seed'], t['dur']) for t in takes if 'prompt' in t}
        queue = []
        if a.prompt:
            d2 = a.dur if a.dur is not None else dur
            queue = [(a.prompt, a.seed if a.seed is not None else free_seed(a.prompt, seed, d2, tried), d2)]
        cur = dict(e, prompt=prompt, seed=seed, dur=dur)
        rounds, improving = 0, a.improve and r['pass'] and r['z'] < IMPROVE_Z
        while queue or (not a.prompt and not a.check_only and (not r['pass'] or improving) and len(takes) < a.tries
                        and rounds < 2 * a.tries):
            rounds += 1
            improving = False  # one extra take at most for a sound that already passes
            p2, s2, d2 = queue.pop(0) if queue else next_take(sid, cur, tried)
            tried.add((p2, s2, d2))
            n = len(takes) + 1
            with tempfile.TemporaryDirectory(prefix='.listen_sfx_', dir=sa.OUT) as tmp:
                cand = os.path.join(tmp, sid + '.wav')
                try:
                    gen = sa.generate(p2, d2, s2, cand)
                except RuntimeError as exc:
                    print(f'{sid}: take {n} (seed {s2}) could not be made: {exc}', flush=True)
                    takes.append({'take': n, 'prompt': p2, 'seed': s2, 'dur': d2, 'pass': False, 'kept': False,
                                  'why': f'not made: {str(exc).splitlines()[0]}'})
                    continue
                r2 = listen(cand, e)
                hc = sha1(cand)
                same = next((x for x in takes if x.get('sha1') == hc), None)  # generation is deterministic
                keep = hc != h and score(r2) > score(r)
                t = take_record(same['take'] if same else n, p2, s2, d2, r2, gen)
                t.update(sha1=hc, kept=keep or hc == h)
                print(f"{sid}: take {t['take']}{' (re-made)' if same else ''} (seed {s2}) "
                      f"{'PASS' if r2['pass'] else 'FAIL'} {r2['why']}{' -> kept' if keep else ''}", flush=True)
                if keep:
                    for t_old in takes:
                        t_old['kept'] = False
                    os.replace(cand, f)
                    update_plan(sid, p2, s2, d2)
                    sa.write_plan({sid: gen})
                    cur = dict(cur, prompt=p2, seed=s2, dur=d2)
                    r, h = r2, hc
                if same:
                    same.update(t)
                else:
                    takes.append(t)
        results[sid] = {'id': sid, 'file': f'sfx_sa/{sid}.wav', 'sha1': h, 'check': e['check'], 'not': e['not'],
                        'prompt': cur['prompt'], 'seed': cur['seed'], 'dur': cur['dur'], **r, 'tries': len(takes),
                        'takes': takes}
        save(results, sounds)
    save(results, sounds)
    rows = [results[e['id']] for e in sounds if e['id'] in results]
    print(f"{sum(1 for x in rows if x.get('pass'))} of {len(rows)} pass; failed: "
          f"{', '.join(x['id'] for x in rows if x.get('pass') is False) or 'none'}")


if __name__ == '__main__':
    main()
