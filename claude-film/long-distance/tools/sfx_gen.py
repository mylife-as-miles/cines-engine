"""Generate Long Distance's real-world sounds (rooms, doors, steps, cloth, cutlery, the bus) locally with Stable Audio
3.0 Small SFX (Stability AI Community License), run through audio.cpp on the CPU; earshot checks each one against its
description. The phone's own sounds are not generated here: they are synthesised clean (tools/synth_sfx.py).

  python3 tools/sfx_gen.py [--only a,b] [--force] [--threads 2] [--jobs 2] [--check]
      -> audio/gen/<key>.wav (raw takes, gitignored), audio/gen/plan.json, audio/gen/check.json

audio/gen_plan.json: {"key": {"prompt": "...", "dur": 3, "seed": 7, "match": "a door closing"}, ...}
Prompts name the source, its texture and its space (the text encoder ignores negation, so they say what is wanted,
never "no music"). --jobs runs that many generations at once (each with --threads threads). --check runs every
match in one earshot process (tools/ears.py), so the models load once.
"""
import json, os, subprocess, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
CLI = os.environ.get('AUDIOCPP_CLI', '/home/user/0xshug0/audio.cpp/build/linux-cpu-release/bin/audiocpp_cli')
MODEL = os.environ.get('SA3_SFX', '/root/.soundbox/models/audiocpp/Stable-Audio-3-Small-SFX-GGUF/stable-audio-3-small-sfx-q8_0.gguf')
EARSHOT_PY = os.environ.get('EARSHOT_PY', '/home/user/leonxlnx/earshot/.venv/bin/python')


def gen(text, dst, dur, seed, threads, steps=8, cfg=1.0):
    cmd = [CLI, '--task', 'gen', '--family', 'stable_audio', '--model', MODEL, '--backend', 'cpu', '--threads', str(threads),
           '--text', text, '--out', dst, '--duration-seconds', str(dur), '--seed', str(seed),
           '--num-inference-steps', str(steps), '--guidance-scale', str(cfg)]
    return subprocess.run(cmd, capture_output=True, text=True)


def main():
    a = sys.argv[1:]
    only = set(a[a.index('--only') + 1].split(',')) if '--only' in a else None
    threads = a[a.index('--threads') + 1] if '--threads' in a else '2'
    jobs = int(a[a.index('--jobs') + 1]) if '--jobs' in a else 1
    plan = json.load(open(os.path.join(ROOT, 'audio', 'gen_plan.json')))
    out = os.path.join(ROOT, 'audio', 'gen'); os.makedirs(out, exist_ok=True)
    todo = [(k, p) for k, p in plan.items() if (not only or k in only)]

    def one(kp):
        key, p = kp; dst = os.path.join(out, key + '.wav')
        if os.path.exists(dst) and '--force' not in a: return
        t0 = time.time(); r = gen(p['prompt'], dst, p['dur'], p.get('seed', 7), threads, p.get('steps', 8), p.get('cfg', 1.0))
        if r.returncode != 0: print(key, 'FAILED', r.stderr[-300:], flush=True); return
        print(f"{key}: {p['dur']} s in {time.time() - t0:.0f} s", flush=True)

    with ThreadPoolExecutor(jobs) as ex: list(ex.map(one, todo))
    json.dump({'model': 'Stable Audio 3.0 Small SFX (q8_0 GGUF via audio.cpp)', 'license': 'Stability AI Community License', 'sounds': plan},
              open(os.path.join(out, 'plan.json'), 'w'), indent=1)
    if '--check' in a:
        ck = os.path.join(out, 'check.json'); checks = json.load(open(ck)) if os.path.exists(ck) else {}
        batch = [{'key': k, 'op': 'match', 'path': os.path.join(out, k + '.wav'), 'query': p['match'], 'alts': p.get('alts')}
                 for k, p in todo if p.get('match') and os.path.exists(os.path.join(out, k + '.wav')) and (k not in checks or '--force' in a)]
        if batch:
            jf = tempfile.mktemp(suffix='.json'); rf = jf + '.out'; json.dump(batch, open(jf, 'w'))
            subprocess.run([EARSHOT_PY, os.path.join(HERE, 'ears.py'), jf, rf, '--threads', str(int(threads) * jobs)], check=True)
            res = json.load(open(rf))
            for k, r in res.items():
                checks[k] = {'match': plan[k]['match'], 'verdict': r.get('verdict'), 'z': r.get('z'), 'summary': r.get('summary'), 'error': r.get('error')}
            json.dump(checks, open(ck, 'w'), indent=1); os.remove(jf); os.remove(rf)


if __name__ == '__main__':
    main()
