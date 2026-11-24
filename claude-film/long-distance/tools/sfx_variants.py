"""Regenerate the weaker generated sounds as variants, let earshot rank them against their description, and keep the best.

  python3 tools/sfx_variants.py audio/gen_variants.json [--threads 2]

audio/gen_variants.json: {"key": {"prompts": ["...", "..."], "seeds": [1001, 2002], "dur": 2}, ...}
For each key: audio/gen/var/<key>/<n>.wav for every prompt x seed, then `earshot rank <match> <candidates + current>`.
The winner replaces audio/gen/<key>.wav (the current take stays in the running). Picks: audio/gen/picks.json.
"""
import json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
CLI = os.environ.get('AUDIOCPP_CLI', '/home/user/0xshug0/audio.cpp/build/linux-cpu-release/bin/audiocpp_cli')
MODEL = os.environ.get('SA3_SFX', '/root/.soundbox/models/audiocpp/Stable-Audio-3-Small-SFX-GGUF/stable-audio-3-small-sfx-q8_0.gguf')
EARSHOT = os.environ.get('EARSHOT', '/home/user/leonxlnx/earshot/.venv/bin/earshot')


def main():
    a = sys.argv[1:]
    spec = json.load(open(a[0])); threads = a[a.index('--threads') + 1] if '--threads' in a else '2'
    plan = json.load(open(os.path.join(ROOT, 'audio', 'gen_plan.json')))
    gen = os.path.join(ROOT, 'audio', 'gen'); pf = os.path.join(gen, 'picks.json')
    picks = json.load(open(pf)) if os.path.exists(pf) else {}
    for key, v in spec.items():
        d = os.path.join(gen, 'var', key); os.makedirs(d, exist_ok=True)
        dur = v.get('dur', plan[key]['dur']); n = 0; cands = []
        for p in v['prompts']:
            for s in v.get('seeds', [1001, 2002]):
                n += 1; dst = os.path.join(d, f'{n}.wav'); cands.append(dst)
                if os.path.exists(dst): continue
                subprocess.run([CLI, '--task', 'gen', '--family', 'stable_audio', '--model', MODEL, '--backend', 'cpu', '--threads', threads,
                                '--text', p, '--out', dst, '--duration-seconds', str(dur), '--seed', str(s), '--num-inference-steps', '8', '--guidance-scale', '1.0'],
                               capture_output=True, text=True)
        cur = os.path.join(gen, key + '.wav'); keep = os.path.join(d, '0_original.wav')
        if not os.path.exists(keep): shutil.copy(cur, keep)
        r = subprocess.run([EARSHOT, '--threads', threads, 'rank', v.get('match', plan[key]['match']), keep] + cands + ['--json'], capture_output=True, text=True)
        try: res = json.loads(r.stdout)
        except Exception: print(key, 'rank failed', r.stderr[-200:]); continue
        rows = res.get('ranking') or res.get('results') or res
        best = rows[0]; path = best.get('path') or best.get('file')
        shutil.copy(path, cur)
        picks[key] = {'pick': os.path.relpath(path, gen), 'z': best.get('z'), 'verdict': best.get('verdict'), 'prompt_index': None}
        print(f"{key}: best {os.path.basename(path)} z {best.get('z')} {best.get('verdict', '')}", flush=True)
        json.dump(picks, open(pf, 'w'), indent=1)


if __name__ == '__main__':
    main()
