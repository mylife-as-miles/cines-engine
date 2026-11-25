#!/usr/bin/env python3
"""A guide track for a montage animatic: a click on the song's beats (the downbeat of each bar louder) and a stand-in
bell stroke where the script has one. Not the score; it is there so the cuts can be judged against the bars.

    python3 clicks.py <out.wav> <total_s> <bpm> <click_from_s> <click_to_s> [bell_at_s ...]
"""
import sys, wave, numpy as np
out, total, bpm, c0, c1 = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
bells = [float(x) for x in sys.argv[6:]]
SR = 48000
y = np.zeros(int(total * SR))
beat = 60 / bpm
n = 0
t = c0
while t < c1 - 1e-6:
    i = int(t * SR); L = int(0.03 * SR)
    f, a = (1500, 0.35) if n % 4 == 0 else (900, 0.18)
    k = np.arange(L) / SR
    y[i:i + L] += a * np.sin(2 * np.pi * f * k) * np.exp(-k * 120)
    n += 1; t = c0 + n * beat
for b in bells:                                    # a large bell: hum, prime, minor-third tierce, quint, nominal, upper partials
    i = int(b * SR); L = len(y) - i; k = np.arange(L) / SR
    f0 = 65.4
    for ratio, amp, decay in [(0.5, 0.25, 0.25), (1.0, 0.35, 0.4), (1.2, 0.3, 0.55), (1.5, 0.18, 0.7), (2.0, 0.28, 0.6), (2.5, 0.1, 1.0), (3.0, 0.08, 1.3), (4.2, 0.05, 1.8)]:
        y[i:] += amp * np.sin(2 * np.pi * f0 * 2 * ratio * k) * np.exp(-k * decay)
    y[i:i + int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
y = y / max(1e-9, np.abs(y).max()) * 0.8
pcm = (np.stack([y, y], 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(out, total, 's')
