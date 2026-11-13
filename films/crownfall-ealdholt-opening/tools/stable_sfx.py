"""House Ealdholt's designed sound effects, made with Stable Audio 3.0 Small SFX (Stability AI Community License: free
for commercial use below USD $1M annual revenue). It runs locally through Soundbox (github.com/HamSanders/soundbox) and
its audio.cpp runtime, as the prologue's and the opening film's sounds were made (this is their script, with this
machine's paths). No key, no credits.

    python tools/stable_sfx.py [--only L01_night_air,L10_bell] [--force]    -> audio/sfx_sa/<id>.wav, audio/sfx_sa/plan.json

Every sound in audio/sfx_plan.json is generated from its prompt, duration (dur) and seed, then finished for the mix:
resampled to 48 kHz (soxr), cut to start on its first audible energy (the first 1 ms frame within 40 dB of the take's
peak that is not an isolated click, less 3 ms so the attack stays whole, with a 2 ms de-click), peak-normalised to
-1 dBFS so the plan's gains act on a common level, faded out over its last 0.15 s, and written as 24-bit stereo WAV.
Existing files are kept unless --force. plan.json records the model, the licence and, per sound, the prompt, seed and
duration the file was made from, with what the finish did to it.

tools/listen_sfx.py checks each sound with earshot and re-makes the ones that fail; tools/mix.py places them.

Environment (the defaults are this machine's install under C:/Users/MILES/cines-tools, or CINES_TOOLS):
  SOUNDBOX_CLI           Soundbox's built CLI (soundbox/server/dist/cli.js)
  SOUNDBOX_AUDIOCPP_BIN  optional: an audio.cpp binary for Soundbox to drive. Left unset, Soundbox uses the runtime
                         it installed itself (`npx soundbox model install audiocpp`)
  SOUNDBOX_DATA_DIR      optional: Soundbox's data dir, which holds the model weights (default ~/.soundbox)
Needs node, ffmpeg and numpy.
"""
import argparse, json, os, subprocess, sys, tempfile, time, wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PLAN = os.path.join(ROOT, 'audio', 'sfx_plan.json')
OUT = os.path.join(ROOT, 'audio', 'sfx_sa')
TOOLS = os.environ.get('CINES_TOOLS', 'C:/Users/MILES/cines-tools')
SOUNDBOX = os.environ.get('SOUNDBOX_CLI', f'{TOOLS}/soundbox/server/dist/cli.js')
ENV = dict(os.environ)
MODEL = 'audiocpp-stable-audio-3-sfx'  # Soundbox's defaults for it: 8 steps, guidance 1.0
MODEL_NAME = 'Stable Audio 3.0 Small SFX (q8_0 GGUF via audio.cpp, Soundbox)'
LICENSE = {'name': 'Stability AI Community License', 'url': 'https://stability.ai/license',
           'note': 'Free for commercial use below USD $1M annual revenue; above that an Enterprise licence is needed. '
                   'The GGUF conversion does not change the licence of the weights.'}
SR = 48000
ONSET_DB = -40.0      # first audible energy: within 40 dB of the take's peak...
ONSET_HOLD = (3, 10)  # ...in at least 3 of the next 10 frames of 1 ms (an isolated click does not count)
PREROLL_S = 0.003     # kept before that frame so the attack is whole
DECLICK_S = 0.002     # fade-in at the cut
FADE_OUT_S = 0.15
PEAK_DBFS = -1.0
FINISH = (f'48 kHz (soxr); cut {PREROLL_S * 1000:.0f} ms before the first 1 ms frame within {-ONSET_DB:.0f} dB of the '
          f'peak (held in {ONSET_HOLD[0]} of {ONSET_HOLD[1]} frames), {DECLICK_S * 1000:.0f} ms de-click; peak '
          f'{PEAK_DBFS:.0f} dBFS; {FADE_OUT_S:.2f} s raised-cosine fade-out; 24-bit stereo WAV')


def engine_build():
    """Which audio.cpp build made the sounds: the one at SOUNDBOX_AUDIOCPP_BIN when set (its own --version), else the
    Windows CUDA build Soundbox installs itself."""
    b = ENV.get('SOUNDBOX_AUDIOCPP_BIN')
    if not b:
        return 'the Windows CUDA build Soundbox installs'
    try:
        v = subprocess.run([b, '--version'], capture_output=True, text=True, timeout=30).stdout.strip().splitlines()
    except (OSError, subprocess.SubprocessError):
        v = []
    return 'the build at SOUNDBOX_AUDIOCPP_BIN' + (': ' + '; '.join(v) if v else '')


def plan_sounds():
    return json.load(open(PLAN))['sounds']


def db(v):
    return float(20 * np.log10(max(float(v), 1e-12)))


def decode(path, resample=True):
    """any audio file -> float32 (n, 2), at 48 kHz (soxr) or at its own rate"""
    af = ['-af', f'aresample={SR}:resampler=soxr:precision=28'] if resample else []
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, *af, '-f', 'f32le', '-ac', '2', '-'], check=True,
                         capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def encode(x, path):
    """float (n, 2) at 48 kHz -> 24-bit WAV, written beside the target and moved into place"""
    tmp = os.path.join(os.path.dirname(path), '.' + os.path.basename(path) + '.partial')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-',
                    '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', '-c:a', 'pcm_s24le',
                    '-f', 'wav', tmp], input=np.ascontiguousarray(x, np.float32).tobytes(), check=True)
    os.replace(tmp, path)


def onset(x):
    """sample index of the first audible energy (see ONSET_*)"""
    fr = SR // 1000
    env = np.abs(x).max(axis=1)
    m = len(env) // fr
    fpk = env[:m * fr].reshape(m, fr).max(axis=1)
    loud = fpk >= fpk.max() * 10 ** (ONSET_DB / 20)
    need, span = ONSET_HOLD
    held = np.convolve(loud.astype(int), np.ones(span, int))[span - 1:]  # held[i] = loud frames in i..i+span-1
    first = np.flatnonzero(loud & (held >= min(need, int(loud.sum()))))
    return int(first[0]) * fr if len(first) else 0


def finish(x, trim=True):
    """the take at 48 kHz -> the sound as the mix gets it, and what was done"""
    cut = max(0, onset(x) - int(PREROLL_S * SR)) if trim else 0
    y = x[cut:].astype(np.float64)
    n = min(int(DECLICK_S * SR), len(y))
    y[:n] *= (0.5 - 0.5 * np.cos(np.pi * np.arange(n) / n))[:, None]
    gain = 10 ** (PEAK_DBFS / 20) / np.abs(y).max()
    y *= gain
    n = min(int(FADE_OUT_S * SR), len(y))
    y[len(y) - n:] *= (0.5 + 0.5 * np.cos(np.pi * np.arange(1, n + 1) / n))[:, None]
    return y, {'trimmed_ms': round(1000 * cut / SR, 1), 'gain_db': round(db(gain), 2),
               'length_s': round(len(y) / SR, 3)}


def generate(prompt, dur, seed, dst, model=None, trim=True):
    """one take through Soundbox, finished and written to dst; returns its record. tools/music.py passes the music
    model and trim=False (a cue keeps its opening as it was played)"""
    for p, what in [(SOUNDBOX, 'SOUNDBOX_CLI'), (ENV.get('SOUNDBOX_AUDIOCPP_BIN'), 'SOUNDBOX_AUDIOCPP_BIN')]:
        if p and not os.path.isfile(p):
            sys.exit(f'stable_sfx: {what} not found at {p}')
    with tempfile.TemporaryDirectory(prefix='stable_sfx_') as tmp:
        raw = os.path.join(tmp, 'take.wav')
        t0 = time.time()
        # no --yes: if the weights are missing Soundbox asks before a 1.7 GB download, and with no stdin it declines
        r = subprocess.run(['node', SOUNDBOX, 'run', model or MODEL, prompt, '--duration', str(dur), '--seed', str(seed),
                            '--out', raw], env=ENV, stdin=subprocess.DEVNULL, capture_output=True, text=True)
        gen_s = time.time() - t0
        if r.returncode or not os.path.isfile(raw):
            tail = '\n'.join((r.stdout + r.stderr).replace('\r', '\n').strip().splitlines()[-12:])
            raise RuntimeError(f'Soundbox failed ({r.returncode}):\n{tail}')
        native = decode(raw, resample=False)  # as audio.cpp wrote it: 44.1 kHz, 16-bit
        peak = float(np.abs(native).max())
        if peak < 10 ** (-70 / 20):
            raise RuntimeError(f'near-silent take (peak {db(peak):.0f} dBFS)')
        clipped = int((np.abs(native) >= 32767 / 32768).sum())  # audio.cpp's 16-bit writer clips at full scale
        y, info = finish(decode(raw), trim)
    encode(y, dst)
    return {'prompt': prompt, 'seed': int(seed), 'duration_s': dur, 'gen_s': round(gen_s, 1),
            'raw_peak_dbfs': round(db(peak), 2), 'clipped_samples': clipped, **info}


def file_length(path):
    with wave.open(path) as w:
        return round(w.getnframes() / w.getframerate(), 3)


def write_plan(made=None):
    """audio/sfx_sa/plan.json: what every file was made from. made = {id: record} for files written in this run;
    the others keep their record from the previous plan.json."""
    path = os.path.join(OUT, 'plan.json')
    old = {}
    if os.path.exists(path):
        old = {s['id']: s for s in json.load(open(path)).get('sounds', [])}
    made = made or {}
    sounds = []
    for e in plan_sounds():
        f = os.path.join(OUT, e['id'] + '.wav')
        if not os.path.exists(f):
            sounds.append({'id': e['id'], 'prompt': e['prompt'], 'seed': e['seed'], 'duration_s': e['dur'],
                           'file': None})
            continue
        rec = made.get(e['id']) or {k: v for k, v in old.get(e['id'], {}).items() if k not in ('id', 'file')}
        if not rec:  # a file from before plan.json existed: assume the plan's current settings made it
            rec = {'prompt': e['prompt'], 'seed': e['seed'], 'duration_s': e['dur']}
        rec['length_s'] = file_length(f)
        s = {'id': e['id'], **rec, 'file': f'sfx_sa/{e["id"]}.wav'}
        if (s['prompt'], s['seed'], s['duration_s']) != (e['prompt'], e['seed'], e['dur']):
            s['differs_from_sfx_plan'] = True  # sfx_plan.json changed since: re-make with --force --only <id>
        sounds.append(s)
    doc = {'model': MODEL_NAME, 'model_id': MODEL, 'license': LICENSE,
           'engine': f'Soundbox 0.4.1 CLI driving audio.cpp v0.9.4 ({engine_build()}, stable_audio family); Soundbox '
                     'defaults for this model: 8 steps, guidance 1.0; audio.cpp generates 6 s past the asked '
                     'duration and truncates; 44.1 kHz stereo 16-bit out of audio.cpp',
           'finish': FINISH, 'sample_rate': SR, 'source': 'audio/sfx_plan.json', 'sounds': sounds}
    tmp = path + '.partial'
    with open(tmp, 'w') as fh:
        json.dump(doc, fh, indent=1, ensure_ascii=False)
        fh.write('\n')
    os.replace(tmp, path)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--only', help='comma-separated ids, e.g. L01_night_air,L10_bell')
    ap.add_argument('--force', action='store_true', help='re-make files that already exist')
    a = ap.parse_args()
    sounds = plan_sounds()
    only = set(a.only.split(',')) if a.only else None
    if only and only - {e['id'] for e in sounds}:
        sys.exit(f'stable_sfx: unknown id(s): {", ".join(sorted(only - {e["id"] for e in sounds}))}')
    os.makedirs(OUT, exist_ok=True)
    made = {}
    try:
        for e in sounds:
            dst = os.path.join(OUT, e['id'] + '.wav')
            if (only and e['id'] not in only) or (os.path.exists(dst) and not a.force):
                continue
            rec = generate(e['prompt'], e['dur'], e['seed'], dst)
            made[e['id']] = rec
            print(f"{e['id']} ok: {e['dur']} s asked, {rec['length_s']} s kept, made in {rec['gen_s']} s; "
                  f"peak {rec['raw_peak_dbfs']:+.1f} dBFS ({rec['gain_db']:+.1f} dB), cut {rec['trimmed_ms']} ms, "
                  f"{rec['clipped_samples']} clipped samples", flush=True)
            write_plan(made)
    finally:
        write_plan(made)


if __name__ == '__main__':
    main()
