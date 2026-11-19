"""Generate the film's effects and room tones locally with Stable Audio 3.0 Small SFX (Stability AI Community License),
run through audio.cpp on the CPU. Freesound (and its CDN) refuse this build machine, so the recordings that One Too Many
found there are made here instead; earshot checks each one against its description.

  python3 tools/sfx_gen.py [--only a,b] [--force] [--threads 2] [--check]   -> audio/gen/<key>.wav, audio/gen/plan.json

audio/gen_plan.json: {"key": {"prompt": "...", "dur": 3, "seed": 7, "match": "a car door closing"}, ...}
Every prompt asks for no music, so the effects sit under the score.
"""
import json, os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
CLI = os.environ.get('AUDIOCPP_CLI', '/home/user/0xshug0/audio.cpp/build/linux-cpu-release/bin/audiocpp_cli')
MODEL = os.environ.get('SA3_SFX', '/root/.soundbox/models/audiocpp/Stable-Audio-3-Small-SFX-GGUF/stable-audio-3-small-sfx-q8_0.gguf')
EARSHOT = os.environ.get('EARSHOT', '/home/user/leonxlnx/earshot/.venv/bin/earshot')


def main():
    a = sys.argv[1:]
    only = set(a[a.index('--only') + 1].split(',')) if '--only' in a else None
    threads = a[a.index('--threads') + 1] if '--threads' in a else '2'
    plan = json.load(open(os.path.join(ROOT, 'audio', 'gen_plan.json')))
    out = os.path.join(ROOT, 'audio', 'gen'); os.makedirs(out, exist_ok=True)
    checks = {}
    ck = os.path.join(out, 'check.json')
    if os.path.exists(ck): checks = json.load(open(ck))
    for key, p in plan.items():
        if only and key not in only: continue
        dst = os.path.join(out, key + '.wav')
        if not os.path.exists(dst) or '--force' in a:
            t0 = time.time()
            cmd = [CLI, '--task', 'gen', '--family', 'stable_audio', '--model', MODEL, '--backend', 'cpu', '--threads', threads,
                   '--text', p['prompt'], '--out', dst, '--duration-seconds', str(p['dur']), '--seed', str(p.get('seed', 7)),
                   '--num-inference-steps', str(p.get('steps', 8)), '--guidance-scale', str(p.get('cfg', 1.0))]
            r = subprocess.run(cmd, capture_output=True, text=True)
            if r.returncode != 0: print(key, 'FAILED', r.stderr[-300:], flush=True); continue
            print(f"{key}: {p['dur']} s in {time.time() - t0:.0f} s", flush=True)
        if '--check' in a and p.get('match') and (key not in checks or '--force' in a):
            r = subprocess.run([EARSHOT, '--threads', threads, 'match', dst, p['match']], capture_output=True, text=True)
            line = (r.stdout.strip().split('\n') or [''])[0]
            checks[key] = line; print('  ' + line[:200], flush=True)
            json.dump(checks, open(ck, 'w'), indent=1)
    json.dump({'model': 'Stable Audio 3.0 Small SFX (q8_0 GGUF via audio.cpp)', 'license': 'Stability AI Community License', 'sounds': plan},
              open(os.path.join(out, 'plan.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
