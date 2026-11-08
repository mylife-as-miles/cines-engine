"""Sound effects for the opening, made in code (numpy): a pen on paper, vellum tearing, the crown cracking and breaking,
a low boom, wind on the frozen road, fire, and a swell under the title. Deterministic (seeded).

    python tools/sfx.py            # writes audio/sfx/*.wav (48 kHz mono)

tools/mix.py places them on the film's timeline (see CUES there).
"""
import os

import numpy as np
import soundfile as sf

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'audio', 'sfx')
rng = np.random.default_rng(3311)


def t_(d): return np.arange(int(d * SR)) / SR


def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s = (1 - a) * x[i] + a * s; y[i] = s
    return y


def bandpass(x, lo, hi):  # crude: lowpass at hi minus lowpass at lo (FFT for speed)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, n=len(x))


def norm(x, peak=0.9): return x * (peak / (np.max(np.abs(x)) + 1e-9))


def env_adsr(n, a, d, s, r, sustain):
    e = np.ones(n) * sustain; A, Dd, R = int(a * SR), int(d * SR), int(r * SR)
    e[:A] = np.linspace(0, 1, A); e[A:A + Dd] = np.linspace(1, sustain, Dd)[:max(0, min(Dd, n - A))]; e[-R:] *= np.linspace(1, 0, R)
    return e


def pen(d=3.9):
    t = t_(d); x = rng.standard_normal(len(t))
    x = bandpass(x, 1800, 7000)
    # strokes: bursts of scratching that follow the drawing (ring, hatching, letters)
    strokes = np.zeros(len(t))
    for a, b, k in [(0.0, 2.0, 0.8), (1.7, 2.4, 0.5), (2.0, 3.1, 0.35), (2.2, 3.8, 0.7)]:
        i0, i1 = int(a * SR), int(b * SR); n = i1 - i0
        mod = 0.55 + 0.45 * np.sin(np.linspace(0, (b - a) * 2 * np.pi * (5 + 3 * k), n)) ** 2
        strokes[i0:i1] += k * mod * np.hanning(n) ** 0.3
    grit = 1 + 0.6 * (rng.random(len(t)) < 0.002) * rng.random(len(t))
    return norm(x * strokes * grit, 0.5)


def tear(d=1.5):
    t = t_(d); x = np.zeros(len(t))
    for _ in range(900):  # fibres giving way: many small cracks, denser in the middle
        p = int(min(len(t) - 400, max(0, rng.normal(0.55, 0.22) * len(t))))
        L = rng.integers(40, 380); x[p:p + L] += rng.standard_normal(L) * np.exp(-np.arange(L) / (L / 4)) * rng.uniform(0.3, 1)
    x = bandpass(x, 600, 9000) + 0.3 * bandpass(rng.standard_normal(len(t)), 200, 1500) * np.hanning(len(t))
    return norm(x * np.hanning(len(t)) ** 0.4, 0.7)


def crack(d=1.6):
    t = t_(d); x = np.zeros(len(t))
    for k in range(14):  # sharp ticks of metal splitting, quickening
        p = int(len(t) * (1 - (1 - k / 14) ** 1.7) * 0.92); L = 900
        f = rng.uniform(2500, 6500); s = np.sin(2 * np.pi * f * np.arange(L) / SR) * np.exp(-np.arange(L) / 120)
        x[p:p + L] += s * rng.uniform(0.4, 1)
    return norm(x, 0.55)


def shatter(d=3.4):
    t = t_(d); x = np.zeros(len(t))
    burst = rng.standard_normal(len(t)) * np.exp(-t / 0.09); x += bandpass(burst, 900, 12000) * 1.2
    for _ in range(140):  # shards ringing and scattering
        p = int(rng.exponential(0.35) * SR); p = min(p, len(t) - 4000); L = rng.integers(1200, 4000)
        f = rng.uniform(1800, 9000); n = np.arange(L)
        x[p:p + L] += np.sin(2 * np.pi * f * n / SR + rng.uniform(0, 6)) * np.exp(-n / rng.uniform(250, 900)) * rng.uniform(0.05, 0.35)
    thump = np.sin(2 * np.pi * (55 + 40 * np.exp(-t / 0.08)) * t) * np.exp(-t / 0.35)
    return norm(x + thump * 0.8, 0.85)


def boom(d=5.0):
    t = t_(d); f = 32 + 28 * np.exp(-t / 0.6)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.4)
    x += 0.35 * bandpass(rng.standard_normal(len(t)), 30, 180) * np.exp(-t / 1.2)
    return norm(x * env_adsr(len(t), 0.01, 0.2, 0.9, 1.5, 0.9), 0.85)


def wind(d=14.0):
    t = t_(d); x = bandpass(rng.standard_normal(len(t)), 200, 2600)
    gust = 0.45 + 0.35 * np.sin(2 * np.pi * t / 5.3) + 0.2 * np.sin(2 * np.pi * t / 2.1 + 1)
    whistle = 0.08 * np.sin(2 * np.pi * (700 + 120 * np.sin(2 * np.pi * t / 3.7)) * t)
    return norm((x * gust + whistle * gust) * env_adsr(len(t), 2.0, 0.1, 1, 3.0, 1), 0.45)


def fire(d=10.0):
    t = t_(d); x = bandpass(rng.standard_normal(len(t)), 80, 900) * 0.35
    for _ in range(int(d * 26)):  # crackles
        p = rng.integers(0, len(t) - 600); L = rng.integers(60, 500)
        x[p:p + L] += bandpass(rng.standard_normal(L), 1500, 9000) * np.exp(-np.arange(L) / (L / 5)) * rng.uniform(0.2, 1.0)
    return norm(x * env_adsr(len(t), 1.2, 0.1, 1, 2.5, 1), 0.55)


def swell(d=7.0):
    t = t_(d); base = np.zeros(len(t))
    for f, a in [(55, 1), (82.4, 0.6), (110, 0.5), (164.8, 0.3), (220, 0.2)]:
        base += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * (1 + 0.003 * np.sin(2 * np.pi * 0.3 * t))
    return norm(base * (np.clip(t / (d * 0.7), 0, 1) ** 2) * np.exp(-np.clip(t - d * 0.72, 0, None) / 0.5), 0.55)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, fn in [('pen', pen), ('tear', tear), ('crack', crack), ('shatter', shatter), ('boom', boom), ('wind', wind), ('fire', fire), ('swell', swell)]:
        y = fn().astype(np.float32); sf.write(os.path.join(OUT, name + '.wav'), y, SR, subtype='PCM_16'); print(name, round(len(y) / SR, 2), 's')
