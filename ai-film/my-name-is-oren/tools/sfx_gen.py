#!/usr/bin/env python3
"""Make the film's sounds with Stable Audio 3.0 Small SFX on the CPU (audio.cpp), then let earshot pick each one.

    python3 tools/sfx_gen.py [--only a,b] [--force] [--threads 2]

audio/gen_plan.json: {"key": {"kind": "bed"|"cue", "prompt", "dur", "seeds": [..], "match", "alts": [..]}}
For every key and seed: audio/gen/<key>__s<seed>.wav (the raw take, 44.1 kHz) and <key>__s<seed>.fin.wav (finished:
48 kHz 24-bit, a cue's onset trimmed to its first sound, peak -1 dBFS, a 0.15 s fade-out). earshot ranks a key's
finished takes against `match` and checks the winner against `alts`; the winner is copied to audio/sfx/<key>.flac
and everything is recorded in audio/gen/check.json and audio/sfx/plan.json. Raw takes stay out of git.
Tools and weights live outside the repo, as in Claude Film (.claude/skills/cines-engine/references/sound.md §1).
"""
import json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLI = os.environ.get('AUDIOCPP_CLI', '/home/user/0xshug0/audio.cpp/build/linux-cpu-release/bin/audiocpp_cli')
MODEL = os.environ.get('SA3_SFX', '/root/.soundbox/models/audiocpp/Stable-Audio-3-Small-SFX-GGUF/'
                                  'stable-audio-3-small-sfx-q8_0.gguf')
EARSHOT = os.environ.get('EARSHOT', '/home/user/leonxlnx/earshot/.venv/bin/earshot')


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def peak_db(path):
    r = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'astats=measure_overall=Peak_level:measure_perchannel=none', '-f', 'null', '-'])
    m = re.findall(r'Peak level dB:\s*(-?[\d.inf]+)', r.stderr)
    return float(m[-1]) if m and m[-1] not in ('-inf', 'inf') else -120.0


def finish(raw, out, kind, dur):
    """48 kHz 24-bit; a cue starts at its first sound (40 dB under its peak, 3 ms early); peak -1 dBFS; 0.15 s fade-out"""
    pk = peak_db(raw)
    if pk < -70:
        return None
    pre = ''
    if kind == 'cue':
        pre = f'silenceremove=start_periods=1:start_threshold={pk - 40:.1f}dB:start_silence=0.003,'
    tmp = out + '.tmp.wav'
    run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', f'{pre}aresample=48000:resampler=soxr,atrim=end={dur}',
         '-c:a', 'pcm_s24le', tmp])
    gain = -1.0 - peak_db(tmp)
    d = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', tmp]).stdout or dur)
    run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', f'volume={gain:.2f}dB,afade=t=out:st={max(0, d - 0.15):.3f}:d=0.15',
         '-c:a', 'pcm_s24le', '-ar', '48000', out])
    os.remove(tmp)
    return out


def main():
    a = sys.argv[1:]
    only = set(a[a.index('--only') + 1].split(',')) if '--only' in a else None
    threads = a[a.index('--threads') + 1] if '--threads' in a else '2'
    plan = {k: v for k, v in json.load(open(os.path.join(HERE, 'audio', 'gen_plan.json'))).items() if not k.startswith('_')}
    gen, sfx = os.path.join(HERE, 'audio', 'gen'), os.path.join(HERE, 'audio', 'sfx')
    os.makedirs(gen, exist_ok=True); os.makedirs(sfx, exist_ok=True)
    ckp, spp = os.path.join(gen, 'check.json'), os.path.join(sfx, 'plan.json')
    checks = json.load(open(ckp)) if os.path.exists(ckp) else {}
    chosen = json.load(open(spp)) if os.path.exists(spp) else {}
    for key, p in plan.items():
        if only and key not in only:
            continue
        fins = []
        for seed in p['seeds']:
            raw = os.path.join(gen, f'{key}__s{seed}.wav')
            fin = os.path.join(gen, f'{key}__s{seed}.fin.wav')
            if not os.path.exists(raw) or '--force' in a:
                t0 = time.time()
                r = run([CLI, '--task', 'gen', '--family', 'stable_audio', '--model', MODEL, '--backend', 'cpu',
                         '--threads', threads, '--text', p['prompt'], '--out', raw, '--duration-seconds', str(p['dur']),
                         '--seed', str(seed), '--num-inference-steps', str(p.get('steps', 8)),
                         '--guidance-scale', str(p.get('cfg', 1.0))])
                if r.returncode:
                    print(key, seed, 'FAILED', r.stderr[-300:], flush=True); continue
                print(f'{key} seed {seed}: {p["dur"]} s in {time.time() - t0:.0f} s', flush=True)
            if finish(raw, fin, p['kind'], p['dur']):
                fins.append(fin)
            else:
                print(f'{key} seed {seed}: near-silent, rejected', flush=True)
        if not fins:
            continue
        r = run([EARSHOT, '--threads', threads, 'rank', p['match']] + fins + ['--json'])
        try:
            ranking = json.loads(r.stdout)
        except Exception:
            ranking = {'raw': r.stdout[-2000:], 'err': r.stderr[-500:]}
        items = ranking.get('results') or ranking.get('ranking') or ranking if isinstance(ranking, (list, dict)) else []
        best = fins[0]
        if isinstance(items, list) and items:
            first = items[0]
            best = first.get('file') or first.get('path') or best
        m = run([EARSHOT, '--threads', threads, 'match', best, p['match'], '--alts'] + p.get('alts', []))
        verdict = (m.stdout.strip().split('\n') or [''])[0]
        checks[key] = {'ranking': ranking, 'best': os.path.relpath(best, HERE), 'match': verdict}
        dst = os.path.join(sfx, f'{key}.flac')
        run(['ffmpeg', '-v', 'error', '-y', '-i', best, '-c:a', 'flac', '-sample_fmt', 's32', dst])
        seed = int(re.search(r'__s(\d+)', best).group(1))
        chosen[key] = {'file': f'audio/sfx/{key}.flac', 'model': 'Stable Audio 3.0 Small SFX (q8_0 GGUF, audio.cpp)',
                       'licence': 'Stability AI Community License', 'prompt': p['prompt'], 'seed': seed,
                       'dur': p['dur'], 'kind': p['kind'], 'earshot': verdict}
        print(f'{key}: chose seed {seed} — {verdict}', flush=True)
        json.dump(checks, open(ckp, 'w'), indent=1)
        json.dump(chosen, open(spp, 'w'), indent=1)


if __name__ == '__main__':
    main()
