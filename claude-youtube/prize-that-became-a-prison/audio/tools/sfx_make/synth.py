"""Synthesised sounds for The Prize That Became a Prison (sounds that are synthetic in life, or designed beds).

Every take is computed here from numbers: no recording, no model, no voice. Writes 48 kHz float WAVs into
gen/<sound>/<take>.wav (raw takes; finishing and checks are done by finish.py and check.py).

Usage: python synth.py OUTDIR [sound ...]
"""
import sys, os, json
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
rng0 = np.random.default_rng


def t_axis(dur):
    return np.arange(int(round(dur * SR))) / SR


def env_adsr(n, a, d, s, r, sustain_level=0.7):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    s_len = max(0, n - a - d - r)
    e = np.concatenate([
        np.linspace(0, 1, max(a, 1)) ** 2,
        np.linspace(1, sustain_level, max(d, 1)),
        np.full(s_len, sustain_level),
        np.linspace(sustain_level, 0, max(r, 1)) ** 1.5,
    ])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))


def bandpass(x, lo, hi, order=4):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lowpass(x, f, order=4):
    sos = signal.butter(order, f, btype="low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def highpass(x, f, order=2):
    sos = signal.butter(order, f, btype="high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def pink(n, rng):
    # Voss-McCartney approximation via FFT shaping
    w = rng.standard_normal(n)
    f = np.fft.rfft(w)
    k = np.arange(len(f)); k[0] = 1
    f = f / np.sqrt(k)
    return np.fft.irfft(f, n)


def brown(n, rng):
    w = rng.standard_normal(n)
    f = np.fft.rfft(w)
    k = np.arange(len(f)); k[0] = 1
    f = f / k
    return np.fft.irfft(f, n)


def norm(x, peak=0.89):
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


def room_ir(rt60, dur=None, rng=None, predelay=0.0, damp_hz=4000.0, stereo=True):
    """Exponentially decaying noise impulse response, high frequencies damped faster."""
    rng = rng or rng0(7)
    dur = dur or rt60 * 1.2
    n = int(dur * SR)
    t = np.arange(n) / SR
    chans = []
    for c in range(2 if stereo else 1):
        nz = rng.standard_normal(n)
        lo = lowpass(nz, damp_hz, 2)
        hi = nz - lo
        decay = np.exp(-6.91 * t / rt60)
        decay_hi = np.exp(-6.91 * t / (rt60 * 0.45))
        ir = lo * decay + 0.5 * hi * decay_hi
        pd = int(predelay * SR)
        ir = np.concatenate([np.zeros(pd), ir])
        chans.append(ir / np.sqrt(np.sum(ir ** 2)))
    return np.stack(chans, 1)


def reverb(x, rt60, wet=0.4, predelay=0.02, damp_hz=4000.0, seed=7):
    """x mono -> stereo with an FFT-convolved noise room."""
    ir = room_ir(rt60, rng=rng0(seed), predelay=predelay, damp_hz=damp_hz)
    out = np.zeros((len(x) + len(ir) - 1, 2))
    for c in range(2):
        out[:, c] = signal.fftconvolve(x, ir[:, c])
    dry = np.pad(x, (0, len(out) - len(x)))
    return np.stack([dry, dry], 1) * (1 - wet) + out * wet * 3.0


def to_stereo(x):
    return np.stack([x, x], 1) if x.ndim == 1 else x


# ---------------------------------------------------------------- sounds

def scale_beep(take):
    """The check-in scale's beep as the display settles: a short soft electronic tone."""
    f0, dur, shape = [(2100, 0.16, 'square'), (1760, 0.14, 'sine'), (2400, 0.11, 'square')][take]
    t = t_axis(dur + 0.25)
    n_on = int(dur * SR)
    if shape == 'square':
        tone = signal.square(2 * np.pi * f0 * t, 0.5) * 0.35
        tone = lowpass(tone, 6000, 2)
    else:
        tone = np.sin(2 * np.pi * f0 * t) + 0.15 * np.sin(2 * np.pi * 2 * f0 * t)
    e = np.zeros_like(t)
    e[:n_on] = env_adsr(n_on, 0.004, 0.02, 0, 0.02, 0.85)
    x = tone * e
    # a small plastic speaker: band-limited, slight resonance
    x = bandpass(x, 500, 7000, 2)
    return to_stereo(norm(x))


def chime_note(f, dur, rng, bright=1.0):
    t = t_axis(dur)
    partials = [(1, 1.0), (2.01, 0.35 * bright), (3.02, 0.12 * bright), (4.1, 0.05 * bright)]
    x = sum(a * np.sin(2 * np.pi * f * p * t + rng.uniform(0, 6.28)) * np.exp(-t * (1.6 + 1.4 * p)) for p, a in partials)
    att = np.minimum(1, t / 0.006)
    return x * att


def pa_chime(take, far=False):
    """A generic two-note public-address chime (invented, not any airport's)."""
    rng = rng0(100 + take)
    notes = [[(880.0, 0.0), (1174.66, 0.42)], [(784.0, 0.0), (1046.5, 0.40)], [(1046.5, 0.0), (1318.5, 0.38), (1568.0, 0.76)]][take]
    x = np.zeros(int(3.2 * SR))
    for f, at in notes:
        nt = chime_note(f, 2.4, rng)
        i = int(at * SR)
        x[i:i + len(nt)] += nt[: len(x) - i]
    x = bandpass(x, 300, 5000, 2)   # through a ceiling loudspeaker
    return x


def babble(dur, rng, pitched=True):
    """Muffled announcement texture: random vowel formants at syllable rate, no consonants, no words.

    It is built from noise or a buzz shaped by vowel resonances, so it cannot say anything; heavily low-passed and
    reverberant it reads only as a far loudspeaker voice. Not a model, not a recording, not a person."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    vowels = [(730, 1090, 2440), (270, 2290, 3010), (530, 1840, 2480), (570, 840, 2410), (440, 1020, 2240),
              (300, 870, 2240), (660, 1720, 2410)]
    if pitched:
        f0 = 130 + 18 * np.sin(2 * np.pi * 0.35 * t + rng.uniform(0, 6)) + 8 * np.sin(2 * np.pi * 1.7 * t)
        ph = np.cumsum(f0) / SR
        src = signal.sawtooth(2 * np.pi * ph) * 0.6 + 0.15 * rng.standard_normal(n)
    else:
        src = rng.standard_normal(n)
    out = np.zeros(n)
    # syllables: 4-5 a second, in phrases with pauses
    i = int(0.05 * SR)
    while i < n:
        phrase_len = rng.uniform(1.2, 2.6)
        end = min(n, i + int(phrase_len * SR))
        while i < end:
            syl = int(rng.uniform(0.11, 0.26) * SR)
            v = vowels[rng.integers(len(vowels))]
            seg = src[i:i + syl]
            if len(seg) < 10:
                break
            y = sum(bandpass(seg, f * 0.85, f * 1.15, 2) * g for f, g in zip(v, (1.0, 0.6, 0.25)))
            e = np.hanning(len(y)) ** 0.7 * rng.uniform(0.6, 1.0)
            out[i:i + len(y)] += y * e
            i += syl + int(rng.uniform(0.0, 0.05) * SR)
        i += int(rng.uniform(0.35, 0.8) * SR)
    return out


def tannoy(take, distance):
    """distance: 'far' (0:09) or 'near' (0:15, muffled; also ch 04)."""
    rng = rng0(300 + take + (0 if distance == 'far' else 50))
    total = 7.5
    x = np.zeros(int(total * SR))
    ch = pa_chime(take % 2)
    x[: len(ch)] += ch * 0.9
    if take < 2:
        b = babble(total - 1.6, rng, pitched=(take == 0))
        b = bandpass(b, 250, 3200, 2)
        start = int(1.25 * SR)
        x[start:start + len(b)] += norm(b, 0.5)[: len(x) - start]
    # loudspeaker + distance: band-limit hard so nothing could be understood
    lp = 650 if distance == 'far' else 900
    x = lowpass(highpass(x, 220), lp, 4)
    rt = 3.2 if distance == 'far' else 2.4
    wet = 0.75 if distance == 'far' else 0.55
    y = reverb(x, rt, wet=wet, predelay=0.04 if distance == 'far' else 0.02, damp_hz=2500, seed=11 + take)
    return norm(y)


def boarding_chime(take):
    rng = rng0(500 + take)
    x = pa_chime([2, 0, 1][take])
    x = np.pad(x, (0, int(1.0 * SR)))
    x = lowpass(highpass(x, 250), 2600, 2)
    return norm(reverb(x, 2.8, wet=0.6, predelay=0.03, damp_hz=3000, seed=21 + take))


def mail_chime(take):
    """An invented mail client's notice, muted: two soft rounded notes (no brand's sound)."""
    rng = rng0(600 + take)
    pairs = [[(1318.5, 0.0), (987.8, 0.11)], [(1046.5, 0.0), (1318.5, 0.10)], [(1174.7, 0.0)]][take]
    x = np.zeros(int(1.4 * SR))
    for f, at in pairs:
        t = t_axis(1.2)
        nt = (np.sin(2 * np.pi * f * t) + 0.08 * np.sin(2 * np.pi * 3 * f * t)) * np.exp(-t * 7) * np.minimum(1, t / 0.004)
        i = int(at * SR)
        x[i:i + len(nt)] += nt[: len(x) - i]
    x = lowpass(x, 3500, 2)        # a laptop speaker in a quiet kitchen, muted
    x = bandpass(x, 350, 6000, 2)
    y = reverb(x, 0.4, wet=0.12, damp_hz=4000, seed=61 + take)   # a small kitchen
    return norm(y[: len(x)])


def fluorescent_hum(take, dur=28.0):
    """Fluorescent tubes on 50 Hz mains (China): the ballast hum at 100 Hz and its harmonics, a light buzz,
    slow drift; take 1 has a tube that flickers now and then."""
    rng = rng0(700 + take)
    t = t_axis(dur)
    base = 100.0
    x = np.zeros_like(t)
    for k, a in [(0.5, 0.25), (1, 1.0), (2, 0.55), (3, 0.35), (4, 0.18), (5, 0.12), (6, 0.07), (8, 0.04), (10, 0.03)]:
        drift = 1 + 0.0007 * np.sin(2 * np.pi * rng.uniform(0.03, 0.08) * t + rng.uniform(0, 6))
        x += a * np.sin(2 * np.pi * base * k * drift * t + rng.uniform(0, 6))
    # the buzz: a clipped 100 Hz component
    buzz = np.tanh(4 * np.sin(2 * np.pi * base * t)) * 0.08
    buzz = bandpass(buzz, 1500, 7000, 2)
    air = lowpass(pink(len(t), rng), 3000) * 0.04
    x = x * 0.25 + buzz + air
    am = 1 + 0.08 * lowpass(rng.standard_normal(len(t)), 0.7, 2) * 30
    x *= am
    if take == 1:
        for at in rng.uniform(2, dur - 2, 4):
            i = int(at * SR); L = int(0.25 * SR)
            ff = np.ones(L); ff[::int(SR / 25)] = 0.2
            ff = lowpass(ff, 60, 2)
            x[i:i + L] *= np.clip(ff, 0.3, 1)
    x = highpass(x, 40)
    y = reverb(x, 0.7, wet=0.35, damp_hz=5000, seed=31 + take)
    return norm(y[: len(t)])


def phone_line(take, dur=28.0):
    """The visiting-room handset's line: telephone-band hiss, a faint 50 Hz hum, rare soft crackle."""
    rng = rng0(800 + take)
    t = t_axis(dur)
    hiss = bandpass(rng.standard_normal(len(t)), 300, 3400, 4) * 0.5
    hiss *= 1 + 0.15 * lowpass(rng.standard_normal(len(t)), 0.5, 2) * 30
    hum = 0.12 * np.sin(2 * np.pi * 50 * t) + 0.06 * np.sin(2 * np.pi * 150 * t)
    hum = highpass(hum, 45) * [1.0, 0.4, 0.0][take]
    cr = np.zeros(len(t))
    for at in rng.uniform(0.5, dur - 0.5, [6, 3, 10][take]):
        i = int(at * SR)
        L = int(rng.uniform(0.002, 0.015) * SR)
        cr[i:i + L] += rng.standard_normal(L) * rng.uniform(0.3, 0.8)
    cr = bandpass(cr, 600, 3000, 2)
    x = hiss + hum + cr
    x = np.tanh(1.5 * x) / 1.5
    return to_stereo(norm(x))


def void_air(take, dur=28.0):
    """The Void Stage's own air: a vast dark space, almost silent, very low slow movement."""
    rng = rng0(900 + take)
    n = int(dur * SR)
    t = np.arange(n) / SR
    chans = []
    for c in range(2):
        b = lowpass(brown(n, rng), [220, 300, 160][take], 2)
        p = lowpass(pink(n, rng), 1200, 2) * 0.08
        mv = 1 + 0.35 * np.sin(2 * np.pi * rng.uniform(0.02, 0.05) * t + rng.uniform(0, 6))
        chans.append((norm(b, 1) + p) * mv)
    x = highpass(np.stack(chans, 1).T, 30).T
    return norm(x)


def void_drone(take, dur=28.0):
    """THE DRONE (score motif carried by sound design): low D (73.42 Hz) with its fifth A (110 Hz), slow beating,
    a dark air around it; tuned to A = 440 so it sits under the score's D minor."""
    rng = rng0(1000 + take)
    t = t_axis(dur)
    D2, A2, D1 = 73.416, 110.0, 36.708
    det = [0.18, 0.12, 0.25][take]
    x = (np.sin(2 * np.pi * D2 * t) + np.sin(2 * np.pi * (D2 + det) * t)) * 0.5
    x += 0.45 * (np.sin(2 * np.pi * A2 * t + 1) + np.sin(2 * np.pi * (A2 - det) * t)) * 0.5
    x += [0.35, 0.5, 0.2][take] * np.sin(2 * np.pi * D1 * t)
    # soft upper partials that swell slowly, like bowed metal far away
    for k, a in [(2, 0.12), (3, 0.06), (4, 0.03)]:
        sw = 0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(0.03, 0.07) * t + rng.uniform(0, 6))
        x += a * sw * np.sin(2 * np.pi * D2 * k * t + rng.uniform(0, 6))
    air = lowpass(brown(len(t), rng), 400, 2)
    x = x + norm(air, 0.25)
    x = np.tanh(1.2 * x)
    y = reverb(x, 3.5, wet=0.45, predelay=0.03, damp_hz=1500, seed=41 + take)
    return norm(y[: len(t)])


def impact_low(take):
    """One low impact: a sub drop with a soft dark body and a long tail (designed, not a gunshot or a door)."""
    rng = rng0(1100 + take)
    dur = 5.0
    t = t_axis(dur)
    f_start, f_end = [(62, 34), (55, 30), (70, 38)][take]
    f = f_end + (f_start - f_end) * np.exp(-t * 6)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sub = np.sin(ph) * np.exp(-t * [0.9, 0.7, 1.2][take])
    body = lowpass(rng.standard_normal(len(t)), 260, 4) * np.exp(-t * 9) * 0.6
    click = highpass(lowpass(rng.standard_normal(len(t)), 2500, 2), 300) * np.exp(-t * 80) * 0.08
    x = sub + body + click
    x *= np.minimum(1, t / 0.004)
    x = np.tanh(1.4 * x)
    y = reverb(x, 4.0, wet=0.35, predelay=0.01, damp_hz=900, seed=51 + take)
    return norm(y[: len(t)])


SOUNDS = {
    'sfx_scale_beep': (scale_beep, 3),
    'sfx_tannoy_far': (lambda k: tannoy(k, 'far'), 3),
    'sfx_tannoy_near': (lambda k: tannoy(k, 'near'), 3),
    'sfx_boarding_chime': (boarding_chime, 3),
    'sfx_mail_chime': (mail_chime, 3),
    'amb_fluorescent_hum': (fluorescent_hum, 3),
    'amb_phone_line': (phone_line, 3),
    'amb_void_air': (void_air, 3),
    'sd_void_drone': (void_drone, 3),
    'sfx_impact_low': (impact_low, 3),
}

# ---------------------------------------------------------------- tannoy, second pass (v2)
def babble2(dur, rng):
    """Speech-like rhythm without language: random vowel formants on a buzz with falling phrase intonation, and short
    noise bursts between some syllables. Random sequences, no phonemes chosen, so no word can form."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    vowels = [(730, 1090, 2440), (270, 2290, 3010), (530, 1840, 2480), (570, 840, 2410), (440, 1020, 2240),
              (300, 870, 2240), (660, 1720, 2410)]
    out = np.zeros(n)
    i = int(0.05 * SR)
    while i < n:
        phrase = rng.uniform(1.4, 2.8)
        end = min(n, i + int(phrase * SR))
        f_hi, f_lo = rng.uniform(150, 175), rng.uniform(105, 120)
        p0 = i
        while i < end:
            syl = int(rng.uniform(0.12, 0.24) * SR)
            if i + syl >= n:
                break
            tt = np.arange(syl) / SR
            frac = (i - p0) / max(1, end - p0)
            f0 = f_hi + (f_lo - f_hi) * frac + 6 * np.sin(2 * np.pi * 3 * tt)
            src = signal.sawtooth(2 * np.pi * np.cumsum(f0) / SR) * 0.7 + 0.1 * rng.standard_normal(syl)
            v = vowels[rng.integers(len(vowels))]
            y = sum(bandpass(src, f * 0.88, f * 1.12, 2) * g for f, g in zip(v, (1.0, 0.7, 0.3)))
            out[i:i + syl] += y * np.hanning(syl) ** 0.6 * rng.uniform(0.6, 1.0)
            i += syl
            if rng.random() < 0.45:  # a short noise burst between syllables
                L = int(rng.uniform(0.02, 0.06) * SR)
                if i + L < n:
                    out[i:i + L] += highpass(rng.standard_normal(L), 2500, 2) * np.hanning(L) * 0.25
                    i += L
        i += int(rng.uniform(0.4, 0.9) * SR)
    return out


def tannoy2(take, distance):
    rng = rng0(1300 + take + (0 if distance == 'far' else 50))
    total = 8.0
    x = np.zeros(int(total * SR))
    ch = pa_chime(take % 2) * 10 ** (-8 / 20)
    x[: len(ch)] += ch
    b = norm(babble2(total - 1.5, rng), 0.9)
    st = int(1.1 * SR)
    x[st:st + len(b)] += b[: len(x) - st]
    # ceiling loudspeaker, then the distance muffles it
    x = np.tanh(2.0 * bandpass(x, 300, 3200, 2)) / 2.0
    lp = [1100, 1400, 900][take] if distance == 'near' else [700, 850, 600][take]
    x = lowpass(x, lp, 4)
    rt = 2.3 if distance == 'near' else 3.0
    wet = 0.45 if distance == 'near' else 0.65
    y = reverb(x, rt, wet=wet, predelay=0.02 if distance == 'near' else 0.045, damp_hz=2200, seed=71 + take)
    return norm(y)


SOUNDS['sfx_tannoy_far_v2'] = (lambda k: tannoy2(k, 'far'), 3)
SOUNDS['sfx_tannoy_near_v2'] = (lambda k: tannoy2(k, 'near'), 3)


if __name__ == '__main__':
    out = sys.argv[1]
    names = sys.argv[2:] or list(SOUNDS)
    for name in names:
        fn, n = SOUNDS[name]
        d = os.path.join(out, name)
        os.makedirs(d, exist_ok=True)
        for k in range(n):
            p = os.path.join(d, f'synth_{k}.wav')
            if os.path.exists(p):
                continue
            y = fn(k)
            y = to_stereo(np.asarray(y, dtype=np.float64))
            sf.write(p, y.astype(np.float32), SR, subtype='FLOAT')
            print(name, k, f'{len(y)/SR:.2f}s', flush=True)
