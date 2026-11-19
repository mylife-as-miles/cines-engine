# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile", "pyloudnorm"]
# ///
"""Place the generated score (audio/score/<cue>.mp3, from tools/lyria.py) on the film's clock and add it to the bed stem.

  uv run tools/score_place.py out/score.json out/bed.wav out/bed_scored.wav [--lufs -19]

Per cue in audio/score_plan.json: decode to 48 kHz stereo, start where tools/score_window.py found the cue's content in
the take (src_in_s; the plan may set it instead), or else after the take's silent lead-in, normalise to --lufs (integrated), apply level_db, the source filter ("low-pass N kHz" for
music heard through a wall or doorway), trim to the cue's span, fade in / out, and place it at start_s; a cue more than 3 cents off A440 (tools/score_check.py) is retuned, and every underscore
cue is high-passed at 75 Hz so the drone's 55 Hz is its alone. The score then
follows the film's own ducks (as the engine's music bus did) and drops to exact silence in every one of the Extra's
holes, ramped like the engine's buses (0.15 s down, 0.06 s back). Cues with no audio file yet are skipped and listed. Writes the score
alone to out/score_music.wav and the bed stem plus score to the output, which tools/cuesheet.py hands to the mixer.
"""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, 2)


def main():
    a = sys.argv[1:]
    score_f, bed_f, out_f = a[0], a[1], a[2]
    target = float(a[a.index('--lufs') + 1]) if '--lufs' in a else -19.0
    plan = json.load(open(os.path.join(ROOT, 'audio', 'score_plan.json')))
    S = json.load(open(score_f))
    bed, sr = sf.read(bed_f, always_2d=True); assert sr == SR, sr
    N = len(bed); music = np.zeros((N, 2)); meter = pyln.Meter(SR)
    have, missing = [], []
    cf = os.path.join(ROOT, 'audio', 'score', 'check.json'); checks = json.load(open(cf)) if os.path.exists(cf) else {}
    wf = os.path.join(ROOT, 'audio', 'score', 'windows.json'); windows = json.load(open(wf)) if os.path.exists(wf) else {}
    for c in plan['cues']:
        f = next((os.path.join(ROOT, 'audio', 'score', c['id'] + e) for e in ('.mp3', '.wav') if os.path.exists(os.path.join(ROOT, 'audio', 'score', c['id'] + e))), None)
        if not f: missing.append(c['id']); continue
        x = load(f)
        src_in = c.get('src_in_s', windows.get(c['id'], {}).get('src_in_s'))   # the plan, else tools/score_window.py
        if src_in is not None: x = x[int(src_in * SR):]
        else:                                           # skip a silent lead-in, keeping 10 ms before the first sound
            env = np.abs(x).max(axis=1); on = np.where(env > 10 ** (-50 / 20))[0]
            if len(on): x = x[max(0, on[0] - int(0.01 * SR)):]
        L = meter.integrated_loudness(x) if len(x) > SR else -70
        if np.isfinite(L): x = x * 10 ** ((target - L) / 20)
        x = x * 10 ** (c.get('level_db', 0) / 20)
        # in tune at A440 (offset measured by tools/score_check.py), by resampling: within 30 cents the tempo moves < 2%
        cents = checks.get(c['id'], {}).get('tune_cents', 0.0)
        if abs(cents) > 3:
            r = 2 ** (-cents / 1200)                    # play faster (r > 1) to raise a flat cue
            idx = np.arange(0, len(x) - 1, r); x = np.stack([np.interp(idx, np.arange(len(x)), x[:, k]) for k in (0, 1)], axis=1)
        if c.get('role') != 'source':                   # the 55 Hz fundamental belongs to the Extra's drone alone
            x = signal.sosfilt(signal.butter(4, 75, 'highpass', fs=SR, output='sos'), x, axis=0)
        m = re.search(r'low-?pass\D*([\d.]+)\s*(k?)hz', c.get('source_filter', '') or '', re.I)
        if m:
            fc = float(m.group(1)) * (1000 if m.group(2) else 1)
            x = signal.sosfilt(signal.butter(2, min(fc, SR / 2 - 100), 'lowpass', fs=SR, output='sos'), x, axis=0)
        span = int(round((c['end_s'] - c['start_s']) * SR))
        if len(x) < span: print(f"{c['id']}: generated {len(x) / SR:.1f} s for a {span / SR:.1f} s span; it ends early")
        x = x[:span].copy()
        n = len(x); fi, fo = min(n, int(c.get('fade_in_s', 0) * SR)), min(n, int(c.get('fade_out_s', 0) * SR))
        if fi: x[:fi] *= np.linspace(0, 1, fi)[:, None]
        if fo: x[n - fo:] *= np.linspace(1, 0, fo)[:, None]
        s = int(round(c['start_s'] * SR)); e = min(N, s + len(x))
        music[s:e] += x[:e - s]; have.append(c['id'])
    # the film's ducks, shaped like the engine's: down over the 0.2 s before t0, held to t1, back over 0.3 s
    g = np.ones(N)
    for seq in S:
        for d in seq.get('ducks', []):
            t0 = seq['start'] + d['t0']; t1 = seq['start'] + d['t1']; lv = d['level']
            a0, a1, b0, b1 = int(max(0, t0 - 0.2) * SR), int(t0 * SR), int(t1 * SR), int(min(N / SR, t1 + 0.3) * SR)
            g[a0:a1] = np.minimum(g[a0:a1], np.linspace(1, lv, a1 - a0)); g[a1:b0] = np.minimum(g[a1:b0], lv)
            g[b0:b1] = np.minimum(g[b0:b1], np.linspace(lv, 1, b1 - b0))
    # the Extra's holes: exact silence, ramped like the engine's buses
    for seq in S:
        for h in seq['holes']:
            t0 = seq['start'] + h['t0']; t1 = t0 + h['dur']
            a0, a1, b0, b1 = int(max(0, t0 - 0.15) * SR), int(t0 * SR), int(t1 * SR), int(min(N / SR, t1 + 0.06) * SR)
            g[a0:a1] = np.minimum(g[a0:a1], np.linspace(1, 0, a1 - a0)); g[a1:b0] = 0; g[b0:b1] = np.minimum(g[b0:b1], np.linspace(0, 1, b1 - b0))
    music *= g[:, None]
    os.makedirs(os.path.dirname(out_f) or '.', exist_ok=True)
    sf.write(os.path.join(os.path.dirname(out_f) or '.', 'score_music.wav'), music.astype(np.float32), SR, subtype='FLOAT')
    out = bed + music
    pk = np.abs(out).max()
    if pk > 0.99: print(f"note: bed + score peaks at {20 * np.log10(pk):.1f} dBFS (the mixer normalises the music stem)")
    sf.write(out_f, out.astype(np.float32), SR, subtype='FLOAT')
    print(f"placed {len(have)} cues; missing {len(missing)}: {' '.join(missing) if missing else '-'} -> {out_f}")


if __name__ == '__main__':
    main()
