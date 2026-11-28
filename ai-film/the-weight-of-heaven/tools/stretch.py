#!/usr/bin/env python3
"""Stretching and lowering recordings: the two oldest moves in sound design, kept here as plain numpy so every sound
made with them can be made again.

    /root/leonxlnx/earshot/.venv/bin/python tools/stretch.py IN.wav OUT.wav [--stretch 8] [--window 0.25] [--tape -12] [--seed 0]

  paulstretch   Nasca Octavian Paul's extreme time stretch (his algorithm and reference code are public domain). It is
                the method inside PaulXStretch and inside Audacity's "Paulstretch" effect, the two tools the author
                pointed to on 28 November 2026: the sound is cut into long overlapping windows, each window keeps its
                spectrum and is given random phases, and the windows are laid back far apart. A stroke becomes a held
                tone; a wind becomes slow air. The window length is the control that matters: short keeps rhythm and
                grain, long gives a smooth pad with no attack left in it.
  tape          play a recording slower or faster, as a tape machine does: pitch and length change together.
                -12 semitones is half speed, an octave down and twice as long.

Nothing here generates sound: both only reshape a recording that already exists.
"""
import argparse
from fractions import Fraction

import numpy as np
from scipy.signal import resample_poly


def paulstretch(x, sr, stretch, window_s=0.25, seed=0):
    """x: (samples, channels) float; returns the stretched sound, about `stretch` times as long"""
    x = np.atleast_2d(np.asarray(x, np.float64).T).T if np.ndim(x) == 1 else np.asarray(x, np.float64)
    n, ch = x.shape
    w = max(16, int(window_s * sr)); w += w % 2; half = w // 2
    x = x.copy(); e = min(n, int(sr * 0.05)); x[n - e:] *= np.linspace(1, 0, e)[:, None]
    x = np.concatenate([x, np.zeros((w, ch))])
    window = (1.0 - np.linspace(-1.0, 1.0, w) ** 2) ** 1.25
    step = half / stretch
    hinv = (1 + np.sqrt(0.5)) * 0.5
    unmod = 2.0 * (hinv - (1.0 - hinv) * np.cos(np.arange(half) * 2.0 * np.pi / half)) / hinv      # takes out the ripple the overlap leaves
    rng = np.random.default_rng(seed)
    old = np.zeros((w, ch)); out = []; pos = 0.0
    while pos < n:
        i = int(pos)
        buf = x[i:i + w] * window[:, None]
        mag = np.abs(np.fft.rfft(buf, axis=0))
        ph = rng.uniform(0, 2 * np.pi, mag.shape)
        buf = np.fft.irfft(mag * np.exp(1j * ph), w, axis=0) * window[:, None]
        out.append((buf[:half] + old[half:]) * unmod[:, None])
        old = buf; pos += step
    return np.concatenate(out).astype(np.float32)


def tape(x, semitones):
    """x played at another speed: -12 is half speed (an octave down, twice as long)"""
    r = Fraction(2.0 ** (semitones / 12.0)).limit_denominator(300)
    return resample_poly(np.asarray(x, np.float64), r.denominator, r.numerator, axis=0).astype(np.float32)


if __name__ == '__main__':
    import soundfile as sf
    ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--stretch', type=float, default=8.0); ap.add_argument('--window', type=float, default=0.25)
    ap.add_argument('--tape', type=float, default=0.0); ap.add_argument('--seed', type=int, default=0)
    a = ap.parse_args()
    x, sr = sf.read(a.src, always_2d=True)
    if a.tape:
        x = tape(x, a.tape)
    y = paulstretch(x, sr, a.stretch, a.window, a.seed) if a.stretch != 1 else x
    y = y / max(1e-9, float(np.abs(y).max())) * 10 ** (-1 / 20)
    sf.write(a.dst, y, sr, subtype='PCM_24'); print(a.dst, round(len(y) / sr, 2), 's')
