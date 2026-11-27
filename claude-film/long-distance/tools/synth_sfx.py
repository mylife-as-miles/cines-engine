# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""The phone's sounds for Long Distance, synthesised: everything the phone makes is gloss (clean, synthetic, roomless),
as everything it shows is smooth and drawn after the grain. Pure partials, smooth envelopes, no noise floor, no room,
no recorded texture. The real world's sounds are recordings (tools/sfx_gen.py); these are their opposite.

  python3 tools/synth_sfx.py      -> audio/synth/<name>.wav (48 kHz mono, 24-bit, peak -3 dBFS)

send        a soft clean upward tick: the message leaving (a short glide, 80 ms)
receive     two soft glass notes falling a fourth (E6, B5): the reply arriving
type_1..6   a thumb tap on glass, made too clean: a 3-4 kHz tick over a soft 230 Hz pad, each a little different
tap_1..2    a fuller tap on glass (waking the screen, pressing play, opening the banner)
lock        a short clean tock, falling: the screen locking to black glass
wake        a softer, rising tick: the screen waking (quieter than lock)
buzz        the vibration motor's tone, one pulse (175 Hz, its odd harmonics, a smooth gate)
buzz_glass  the same pulse against the mirror: the glassy upper harmonics brought up
buzz_desk   two pulses against the desk, heavier, the 2nd 3 dB down (Q03 places each pulse as its own cue: one pulse)
buzz_wall   two pulses heard through a wall: the tone low-passed at 450 Hz (still no room: it is the phone)
scroll_1..3 a thumb drawn across glass: smooth band-limited air, 140-190 ms, raised-cosine
type_bed    10 s of soft irregular taps (texting on the couch, Q08), for the bed
"""
import os
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(os.path.dirname(HERE), 'audio', 'synth')
T = lambda d: np.arange(int(d * SR)) / SR


def norm(x, peak_db=-3.0):
    return x / (np.max(np.abs(x)) + 1e-12) * 10 ** (peak_db / 20)


def fade(x, a=0.002, b=0.01):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    if nb: x[-nb:] *= np.cos(np.linspace(0, np.pi / 2, nb)) ** 2
    return x


def place(buf, x, t):
    s = int(t * SR); e = min(len(buf), s + len(x)); buf[s:e] += x[:e - s]


def glass_note(f, dur, decay):
    """A clean struck-glass note: the fundamental and two inharmonic partials, each dying faster."""
    t = T(dur)
    x = np.sin(2 * np.pi * f * t) * np.exp(-decay * t)
    x += 0.30 * np.sin(2 * np.pi * 2.32 * f * t) * np.exp(-decay * 2.2 * t)
    x += 0.10 * np.sin(2 * np.pi * 4.25 * f * t) * np.exp(-decay * 4.0 * t)
    return fade(x, 0.0015, 0.02)


def tick(f_hi, f_lo, dur=0.03, hi_decay=180, lo_decay=90, lo_gain=0.6, glide=0.0):
    """A clean tap: a short high tick over a soft low pad, both damped sines (no noise)."""
    t = T(dur); fh = f_hi * (1 + glide * t / dur)
    ph = 2 * np.pi * np.cumsum(fh) / SR
    x = np.sin(ph) * np.exp(-hi_decay * t) + lo_gain * np.sin(2 * np.pi * f_lo * t) * np.exp(-lo_decay * t)
    return fade(x, 0.0007, 0.004)


def buzz_pulse(dur=0.42, f=175.0, glassy=0.0, heavy=0.0, seed=0):
    """The vibration motor: a 175 Hz tone with its odd harmonics, spinning up and down with a smooth gate."""
    rng = np.random.default_rng(seed); t = T(dur)
    spin = np.minimum(1, t / 0.035) * np.minimum(1, (dur - t) / 0.05)      # spin-up / spin-down
    fr = f * (0.93 + 0.07 * spin) * (1 + 0.004 * np.sin(2 * np.pi * 7 * t + rng.uniform(0, 6)))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    x = np.sin(ph) + 0.33 * np.sin(3 * ph) + 0.18 * np.sin(5 * ph) + 0.08 * np.sin(7 * ph)
    if glassy: x += glassy * (0.22 * np.sin(11 * ph) + 0.16 * np.sin(13 * ph) + 0.10 * np.sin(17 * ph))
    if heavy: x += heavy * 0.5 * np.sin(0.5 * ph) * (0.5 + 0.5 * np.sin(2 * np.pi * 31 * t))     # a clean sub "rattle"
    return x * spin ** 1.5


def air(dur, lo, hi, seed):
    """Smooth band-limited air for a swipe: noise filtered narrow and gated by a raised cosine (no grit)."""
    rng = np.random.default_rng(seed); n = int(dur * SR)
    w = rng.standard_normal(n + 4000)
    w = signal.sosfiltfilt(signal.butter(4, [lo, hi], 'bandpass', fs=SR, output='sos'), w)[2000:2000 + n]
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 2.2
    return w * env


def main():
    os.makedirs(OUT, exist_ok=True)
    W = lambda name, x, pk=-3.0: sf.write(os.path.join(OUT, name + '.wav'), norm(x, pk).astype(np.float32), SR, subtype='PCM_24')

    # send: a short rising glide, sine only
    t = T(0.09); f = 880 * 2 ** (np.minimum(1, t / 0.05) * 0.5); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-30 * t) + 0.25 * np.sin(2 * ph) * np.exp(-50 * t)
    W('send', fade(s, 0.002, 0.03))
    # receive: two soft glass notes, E6 then B5
    r = np.zeros(int(0.7 * SR)); place(r, glass_note(1318.5, 0.6, 9), 0.0); place(r, 0.85 * glass_note(987.8, 0.6, 7), 0.085)
    W('receive', r)
    # typing taps: six variants, slightly different pitch and weight
    rng = np.random.default_rng(3)
    for i in range(6):
        x = tick(3200 + 220 * i + rng.uniform(-60, 60), 215 + 9 * i, 0.03, hi_decay=210 + 10 * i, lo_decay=95, lo_gain=0.55 + 0.05 * (i % 3))
        W(f'type_{i + 1}', x)
    # taps on glass (fuller)
    W('tap_1', tick(2600, 190, 0.045, hi_decay=150, lo_decay=70, lo_gain=0.9))
    W('tap_2', tick(2450, 182, 0.045, hi_decay=140, lo_decay=65, lo_gain=0.95))
    # lock: a falling clean tock
    t = T(0.08); f = 620 * (1 - 0.25 * np.minimum(1, t / 0.03)); ph = 2 * np.pi * np.cumsum(f) / SR
    lk = np.sin(ph) * np.exp(-60 * t) + 0.35 * np.sin(2 * np.pi * 2900 * t) * np.exp(-260 * t)
    W('lock', fade(lk, 0.0007, 0.01))
    # wake: a rising soft tick, quieter (written 6 dB under the lock; the mixer levels it on its own, so the
    # difference is in its shape: shorter, higher, softer attack)
    t = T(0.05); f = 1150 * (1 + 0.2 * np.minimum(1, t / 0.02)); ph = 2 * np.pi * np.cumsum(f) / SR
    W('wake', fade(np.sin(ph) * np.exp(-90 * t), 0.003, 0.01), -9)
    # the buzz family
    W('buzz', buzz_pulse(0.42, seed=1))
    W('buzz_glass', buzz_pulse(0.45, glassy=1.0, seed=2))
    bd = np.zeros(int(1.2 * SR)); place(bd, buzz_pulse(0.38, heavy=1.0, seed=3), 0); place(bd, 0.71 * buzz_pulse(0.38, heavy=1.0, seed=4), 0.62)
    W('buzz_desk', bd)
    W('buzz_desk_1', buzz_pulse(0.38, heavy=1.0, seed=3))
    bw = np.zeros(int(1.3 * SR)); place(bw, buzz_pulse(0.42, seed=5), 0); place(bw, buzz_pulse(0.42, seed=6), 0.68)
    bw = signal.sosfilt(signal.butter(4, 450, 'lowpass', fs=SR, output='sos'), bw)
    W('buzz_wall', bw)
    # scrolls: three swipes
    for i, (d, lo, hi) in enumerate([(0.16, 2500, 7000), (0.14, 2800, 7500), (0.19, 2300, 6500)]):
        W(f'scroll_{i + 1}', air(d, lo, hi, 20 + i))
    # the texting bed: 10 s of soft taps at irregular gaps, with a couple of pauses (looped by the mix)
    tb = np.zeros(10 * SR); tt = 0.15; rng = np.random.default_rng(9); k = 0
    while tt < 9.7:
        x = tick(3200 + rng.uniform(-300, 400), 215 + rng.uniform(-15, 15), 0.03, hi_decay=210, lo_decay=95, lo_gain=0.55)
        place(tb, x * rng.uniform(0.6, 1.0), tt); k += 1
        tt += rng.choice([0.17, 0.21, 0.25, 0.33]) if rng.uniform() > 0.08 else rng.uniform(0.9, 1.6)
    W('type_bed', tb, -6)
    print('wrote', sorted(os.listdir(OUT)))


if __name__ == '__main__':
    main()
