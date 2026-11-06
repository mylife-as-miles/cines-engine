"""The film's designed tones, synthesised (they are synthetic in life): the phone's alarm, the charging chime, the email
whoosh, the laptop waking, and a generic ringtone for someone else's phone.

  python3 tools/synth_sfx.py      -> audio/synth/<name>.wav (48 kHz mono, peak -3 dBFS)
"""
import os
import numpy as np
import soundfile as sf

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(os.path.dirname(HERE), 'audio', 'synth')


def mallet(f, dur, decay=3.5, bright=0.35):
    """A soft marimba-like note: fundamental, a 4x partial and a 10x partial, each decaying faster than the last."""
    t = np.arange(int(dur * SR)) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-decay * t)
    x += bright * np.sin(2 * np.pi * 3.99 * f * t) * np.exp(-decay * 3 * t)
    x += 0.08 * np.sin(2 * np.pi * 9.8 * f * t) * np.exp(-decay * 8 * t)
    att = np.minimum(1, t / 0.004); return x * att


def bell(f, dur, decay=2.2):
    t = np.arange(int(dur * SR)) / SR
    x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-2 * t) + 0.18 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-5 * t)
    return x * np.exp(-decay * t) * np.minimum(1, t / 0.006)


def place(buf, x, t):
    s = int(t * SR); e = min(len(buf), s + len(x)); buf[s:e] += x[:e - s]


def norm(x, peak_db=-3):
    return x / (np.max(np.abs(x)) + 1e-12) * 10 ** (peak_db / 20)


def noise_sweep(dur, f0, f1, seed=1):
    rng = np.random.default_rng(seed); n = int(dur * SR); w = rng.standard_normal(n)
    # a moving one-pole low-pass: a soft "whoosh"
    fc = np.geomspace(f0, f1, n); a = np.exp(-2 * np.pi * fc / SR); y = np.zeros(n); acc = 0.0
    for i in range(n): acc = a[i] * acc + (1 - a[i]) * w[i]; y[i] = acc
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
    return y * env


def main():
    os.makedirs(OUT, exist_ok=True)
    # the alarm: a gentle four-note figure, twice (B5 E6 G#6 E6)
    a = np.zeros(int(2.6 * SR))
    for r in range(2):
        for i, f in enumerate([987.8, 1318.5, 1661.2, 1318.5]): place(a, mallet(f, 0.5), r * 1.25 + i * 0.16)
    sf.write(os.path.join(OUT, 'alarm.wav'), norm(a), SR)
    # the charging chime: two soft bell notes rising (C6 then G6)
    c = np.zeros(int(1.4 * SR)); place(c, bell(1046.5, 1.2), 0); place(c, 0.8 * bell(1568.0, 1.2), 0.11)
    sf.write(os.path.join(OUT, 'chime.wav'), norm(c, -6), SR)
    # the email: a short soft whoosh and a small tone at its end
    e = np.zeros(int(1.0 * SR)); place(e, 0.6 * noise_sweep(0.45, 400, 4000), 0); place(e, 0.5 * bell(1318.5, 0.6, 5), 0.32)
    sf.write(os.path.join(OUT, 'email.wav'), norm(e, -8), SR)
    # the laptop waking: one soft two-note pad tone
    t = np.arange(int(0.9 * SR)) / SR; w = (np.sin(2 * np.pi * 880 * t) + 0.6 * np.sin(2 * np.pi * 1318.5 * t)) * np.sin(np.pi * np.minimum(1, t / 0.9)) ** 2
    sf.write(os.path.join(OUT, 'laptop_wake.wav'), norm(w, -10), SR)
    # someone else's phone: a generic bright ringtone, two rings (a different figure from Daniel's alarm)
    r = np.zeros(int(4.2 * SR))
    for k in range(2):
        for i, f in enumerate([1174.7, 1568.0, 1174.7, 1568.0, 1760.0, 1568.0]): place(r, mallet(f, 0.3, decay=6, bright=0.5), k * 2.0 + i * 0.13)
    sf.write(os.path.join(OUT, 'ring.wav'), norm(r, -4), SR)
    # the flash cut: a soft swelling whoosh into a low, muffled thud (a memory arriving), quiet
    fl = np.zeros(int(1.2 * SR)); place(fl, 0.7 * noise_sweep(0.32, 300, 2500, seed=7), 0)
    t = np.arange(int(0.8 * SR)) / SR; thud = np.sin(2 * np.pi * (52 + 30 * np.exp(-18 * t)) * t) * np.exp(-6 * t) * np.minimum(1, t / 0.003)
    place(fl, thud, 0.28)
    sf.write(os.path.join(OUT, 'flash.wav'), norm(fl, -4), SR)
    print('wrote', sorted(os.listdir(OUT)))


if __name__ == '__main__':
    main()
