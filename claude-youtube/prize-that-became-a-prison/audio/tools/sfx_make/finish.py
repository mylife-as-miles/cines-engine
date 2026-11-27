"""Finish raw takes (gen/<id>/*.wav) into usable takes (fin/<id>/*.wav), as sound.md section 3 says.

shot: resample to 48 kHz (soxr), trim the onset (first 1 ms frame within 40 dB of the peak, cut 3 ms early, 2 ms
      de-click), trim the tail below -60 dB re peak, peak-normalise to -1 dBFS, 0.15 s raised-cosine fade-out, 24-bit.
bed:  resample to 48 kHz, make it loop-ready (the last XF seconds crossfaded equal-power into the head, so the file
      repeats with no seam), 20-30 s long, normalised to -24 LUFS integrated with true peak at or under -3 dBTP.
      sfx_clock_tick is cut to whole tick periods instead, so the ticks stay one second apart across the seam.
Rejects near-silent takes (< -70 dBFS). Usage: python finish.py ROOT [id ...]   (ROOT holds gen/ and sounds.json)
"""
import sys, os, json, glob
import numpy as np
import soundfile as sf
import soxr
from earshot import features

SR = 48000
BED_LUFS = -24.0
XF = 2.0


def load(path):
    x, sr = sf.read(path, always_2d=True, dtype='float64')
    if sr != SR:
        x = soxr.resample(x, sr, SR, quality='VHQ')
    if x.shape[1] == 1:
        x = np.repeat(x, 2, 1)
    return x[:, :2]


def db(v):
    return 20 * np.log10(max(v, 1e-12))


def finish_shot(x):
    m = np.abs(x).max(1)
    pk = m.max()
    fr = int(0.001 * SR)
    nfr = len(m) // fr
    lv = m[: nfr * fr].reshape(nfr, fr).max(1)
    first = int(np.argmax(lv >= pk * 10 ** (-40 / 20)))
    start = max(0, first * fr - int(0.003 * SR))
    x = x[start:].copy()
    dk = int(0.002 * SR)
    x[:dk] *= np.linspace(0, 1, dk)[:, None]
    # tail: last frame above -60 dB re peak, plus 50 ms
    m = np.abs(x).max(1)
    above = np.nonzero(m >= pk * 10 ** (-60 / 20))[0]
    end = min(len(x), above[-1] + int(0.05 * SR)) if len(above) else len(x)
    x = x[:end]
    x = x * (10 ** (-1 / 20) / np.abs(x).max())
    fo = min(int(0.15 * SR), len(x) // 3)
    x[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo)))[:, None]
    return x, {'trim_start_s': round(start / SR, 4)}


def loop_ready(x, length=None):
    n = len(x)
    xf = int(XF * SR)
    L = min(n - xf, int((length or 28.0) * SR))
    L = min(L, int(30.0 * SR))
    if L < int(20.0 * SR):
        raise ValueError(f'too short for a 20 s loop ({n / SR:.1f} s)')
    head = x[:xf]
    tail = x[L:L + xf]
    t = np.linspace(0, np.pi / 2, xf)[:, None]
    out = x[:L].copy()
    out[:xf] = head * np.sin(t) + tail * np.cos(t)
    return out, {'loop_s': round(L / SR, 3), 'crossfade_s': XF}


def clock_loop(x):
    """cut to whole tick periods so the ticks stay evenly spaced across the seam"""
    m = np.abs(x).mean(1)
    on = features.onsets(m)
    on = np.array(sorted(on)) if len(on) else np.array([])
    if len(on) < 6:
        return loop_ready(x)
    d = np.diff(on)
    per = float(np.median(d[(d > 0.3) & (d < 2.5)]))
    s = max(0, int((on[0] - 0.02) * SR))
    k = int(min((len(x) - s) / SR, 30.0) // per)
    while k * per > 30.0:
        k -= 1
    L = int(round(k * per * SR))
    out = x[s:s + L].copy()
    dk = int(0.002 * SR)
    out[:dk] *= np.linspace(0, 1, dk)[:, None]
    out[-dk:] *= np.linspace(1, 0, dk)[:, None]      # the seam falls in the quiet before a tick: no click
    return out, {'loop_s': round(L / SR, 3), 'tick_period_s': round(per, 4), 'ticks': k}


def level_bed(x):
    lufs = features.integrated_lufs(x)
    g = BED_LUFS - lufs
    y = x * 10 ** (g / 20)
    tp = features.true_peak_dbtp(y)
    if tp > -3.0:
        y *= 10 ** ((-3.0 - tp) / 20)
    return y, {'lufs_before': round(float(lufs), 1)}


def main(root, ids):
    cat = json.load(open(os.path.join(root, 'sounds.json')))['sounds']
    ids = ids or sorted(os.listdir(os.path.join(root, 'gen')))
    log = {}
    for sid in ids:
        if sid not in cat:
            print('skip (not in sounds.json):', sid)
            continue
        kind = cat[sid]['kind']
        od = os.path.join(root, 'fin', sid)
        os.makedirs(od, exist_ok=True)
        for p in sorted(glob.glob(os.path.join(root, 'gen', sid, '*.wav'))):
            name = os.path.basename(p)
            q = os.path.join(od, name)
            if os.path.exists(q) and os.path.getmtime(q) > os.path.getmtime(p):
                continue
            x = load(p)
            pk = db(np.abs(x).max())
            if pk < -70:
                print(f'{sid}/{name}: REJECT near-silent ({pk:.0f} dBFS)')
                continue
            try:
                if kind == 'shot':
                    y, info = finish_shot(x)
                elif sid == 'sfx_clock_tick':
                    y, info = clock_loop(x)
                    y, i2 = level_bed(y); info.update(i2)
                else:
                    y, info = loop_ready(x)
                    y, i2 = level_bed(y); info.update(i2)
            except ValueError as e:
                print(f'{sid}/{name}: REJECT {e}')
                continue
            sf.write(q, y.astype(np.float32), SR, subtype='PCM_24')
            log[f'{sid}/{name}'] = info
            print(f'{sid}/{name}: {len(y) / SR:.2f} s {info}', flush=True)
    lp = os.path.join(root, 'fin', 'finish_log.json')
    old = json.load(open(lp)) if os.path.exists(lp) else {}
    old.update(log)
    json.dump(old, open(lp, 'w'), indent=1)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2:])
