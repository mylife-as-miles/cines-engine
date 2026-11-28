# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""Seven Days of No's effects: cartoon-clean, soft and friendly. The UI and cartoon sounds are synthesised here (pure
partials and smooth filtered air, no room, no grit, pitched in C major at A = 440 so they sit with the music); the
physical ones are assembled from One Too Many's committed CC0 recordings (claude-film/one-too-many/audio/sfx/); the door
is a Stable Audio 3.0 Small take (tools/sfx_gen.py -> audio/gen/, finished here if present).

  python3 tools/synth_sfx.py        (any python with numpy, scipy, soundfile; or uv run tools/synth_sfx.py)
      -> audio/sfx/<name>.flac (48 kHz mono, 24-bit, peak -1 dBFS) and audio/sfx/plan.json (source of each)

phone_buzz      the phone vibrating on the coffee table: two motor pulses (175 Hz and its odd harmonics), a clean rattle
notify          a soft UI ping: two quick glass notes rising a fourth (G5, C6)
pop, pop_2/3    a bubble or icon appearing: a short round "bloop" (a sine gliding up), three pitches to cycle through
stamp           a friendly thud: a soft low thump, a woody "tok" and a little paper slap (the NO stamp)
camera_shutter  One Too Many's Pentax K1000 shutter (CC0), with a soft synthetic flash shimmer after it
typing          1.7 s of soft thumb taps on glass (the reply being typed)
send            the message leaving: a quick airy upward glide ending on C6
receive         the reply arriving: two soft glass notes falling a third (E6, C6)
ding            a bright clean bell (C6): the right answer lighting up
bulb            a bright twinkle: a quick rising sparkle of five high bell notes (C6 E6 G6 C7 E7) over soft shimmer
cloud           a soft low puff: warm filtered air with a gentle low body (the grey cloud arriving)
whoosh, _2      a soft airy swish for wipes and cards sliding in (0.45 s and a quicker 0.3 s)
footsteps       four calm steps on a wooden office floor (One Too Many's step1-4, CC0), 0.5 s apart
run             seven quick light steps (the same recordings, lighter and faster): the hero running across frame
door            a door closing softly with its latch (Stable Audio take if audio/gen/door*.wav exists, else One Too Many's
                latch1 under a soft wooden thump)
"""
import json, os
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'audio', 'sfx')
OTM = os.path.normpath(os.path.join(ROOT, '..', '..', 'claude-film', 'one-too-many', 'audio', 'sfx'))
GEN = os.path.join(ROOT, 'audio', 'gen')
T = lambda d: np.arange(int(d * SR)) / SR
NOTE = {'C5': 523.25, 'E5': 659.26, 'G5': 783.99, 'A5': 880.0, 'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'G6': 1567.98,
        'C7': 2093.00, 'E7': 2637.02}


def norm(x, peak_db=-1.0): return x / (np.max(np.abs(x)) + 1e-12) * 10 ** (peak_db / 20)


def fade(x, a=0.002, b=0.01):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    if nb: x[-nb:] *= np.cos(np.linspace(0, np.pi / 2, nb)) ** 2
    return x


def place(buf, x, t, g=1.0):
    s = int(t * SR); e = min(len(buf), s + len(x)); buf[s:e] += g * x[:e - s]


def bp(x, lo, hi, order=2): return signal.sosfilt(signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'highpass', fs=SR, output='sos'), x)


def bell(f, dur, decay, partials=((1, 1, 1), (2.0, 0.22, 1.8), (2.76, 0.12, 2.6), (5.4, 0.04, 4.0)), attack=0.002):
    """A clean struck note: (ratio, gain, decay multiplier) partials, each dying faster; soft attack."""
    t = T(dur); x = np.zeros_like(t)
    for r, g, k in partials:
        if r * f < SR / 2.2: x += g * np.sin(2 * np.pi * r * f * t) * np.exp(-decay * k * t)
    return fade(x, attack, 0.02)


def glass(f, dur, decay): return bell(f, dur, decay, ((1, 1, 1), (2.32, 0.28, 2.2), (4.25, 0.08, 4.0)), 0.0015)


def glide(f0, f1, dur, glide_s, decay):
    t = T(dur); f = f0 * (f1 / f0) ** np.minimum(1, t / glide_s); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-decay * t), ph


def tick(f_hi, f_lo, dur=0.03, hi_decay=200, lo_decay=95, lo_gain=0.55):
    """A clean tap on glass: a short high tick over a soft low pad, both damped sines (no noise)."""
    t = T(dur)
    x = np.sin(2 * np.pi * f_hi * t) * np.exp(-hi_decay * t) + lo_gain * np.sin(2 * np.pi * f_lo * t) * np.exp(-lo_decay * t)
    return fade(x, 0.0007, 0.004)


def buzz_pulse(dur, f=175.0, seed=0):
    """The vibration motor: a 175 Hz tone and its odd harmonics, spinning up and down with a smooth gate, plus a clean
    sub 'rattle' against the table (a half-frequency tone amplitude-modulated at 31 Hz)."""
    rng = np.random.default_rng(seed); t = T(dur)
    spin = np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.045)
    fr = f * (0.93 + 0.07 * spin) * (1 + 0.004 * np.sin(2 * np.pi * 7 * t + rng.uniform(0, 6)))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    x = np.sin(ph) + 0.33 * np.sin(3 * ph) + 0.18 * np.sin(5 * ph) + 0.08 * np.sin(7 * ph)
    x += 0.45 * np.sin(0.5 * ph) * (0.5 + 0.5 * np.sin(2 * np.pi * 31 * t))
    return x * spin ** 1.5


def air(dur, lo, hi, seed, shape=2.2):
    """Smooth band-limited air: noise filtered and gated by a raised cosine (no grit)."""
    rng = np.random.default_rng(seed); n = int(dur * SR); w = rng.standard_normal(n + 4000)
    w = signal.sosfiltfilt(signal.butter(3, [lo, hi], 'bandpass', fs=SR, output='sos'), w)[2000:2000 + n]
    return w * np.sin(np.pi * np.linspace(0, 1, n)) ** shape


def swept_air(dur, f_path, bw, seed, peak_at=0.45):
    """Air through a band-pass whose centre follows f_path (Hz at evenly spaced points): a whoosh. Done as short
    overlapping blocks, each filtered at its own centre (deterministic)."""
    rng = np.random.default_rng(seed); n = int(dur * SR); w = rng.standard_normal(n + 2 * SR // 10)
    hop = 256; win = np.hanning(2 * hop); out = np.zeros(len(w))
    xs = np.linspace(0, 1, len(f_path))
    for s in range(0, n, hop):
        fc = float(np.interp(s / n, xs, f_path)); lo, hi = fc / bw, min(fc * bw, SR / 2.3)
        blk = w[s:s + 2 * hop + 1024]
        blk = signal.sosfiltfilt(signal.butter(2, [lo, hi], 'bandpass', fs=SR, output='sos'), blk)[512:512 + 2 * hop]
        if len(blk) < 2 * hop: break
        out[s:s + 2 * hop] += blk * win
    out = out[:n]; u = np.linspace(0, 1, n)
    env = np.where(u < peak_at, np.sin(np.pi / 2 * u / peak_at) ** 2, np.cos(np.pi / 2 * (u - peak_at) / (1 - peak_at)) ** 1.6)
    return out * env


def otm(name):
    x, sr = sf.read(os.path.join(OTM, name + '.flac'), dtype='float64')
    return x if x.ndim == 1 else x.mean(axis=1)


def resample(x, ratio):
    """Play x at `ratio` times its speed (pitch up for ratio > 1)."""
    n = int(round(len(x) / ratio)); return signal.resample(x, n) if n > 8 else x


def finish_take(x, sr):
    """A generated take finished as sound.md §3: to 48 kHz, onset trimmed (first 1 ms frame within 40 dB of the peak,
    cut 3 ms early, 2 ms de-click), 0.15 s raised-cosine fade-out."""
    if x.ndim > 1: x = x.mean(axis=1)
    if sr != SR: x = signal.resample_poly(x, SR, sr)
    fr = int(0.001 * SR); e = np.array([np.max(np.abs(x[i:i + fr])) for i in range(0, len(x) - fr, fr)])
    first = int(np.argmax(e >= np.max(e) * 10 ** (-40 / 20))); s = max(0, first * fr - int(0.003 * SR))
    x = x[s:]; x = fade(x, 0.002, 0.15)
    # trim the tail once it stays 60 dB under the peak
    a = np.abs(x); thr = np.max(a) * 1e-3; last = len(x) - int(np.argmax(a[::-1] > thr))
    return fade(x[:min(len(x), last + int(0.05 * SR))], 0.002, 0.05)


def main():
    os.makedirs(OUT, exist_ok=True)
    plan = {}

    def W(name, x, how, src='synth (tools/synth_sfx.py)', lic='made for this video (no licence needed)'):
        x = norm(np.asarray(x, dtype=np.float64))
        sf.write(os.path.join(OUT, name + '.flac'), x.astype(np.float32), SR, subtype='PCM_24', format='FLAC')
        plan[name] = {'source': src, 'licence': lic, 'how': how, 'dur_s': round(len(x) / SR, 3)}

    # phone_buzz: two pulses on the coffee table
    b = np.zeros(int(0.95 * SR)); place(b, buzz_pulse(0.34, seed=1), 0.0); place(b, buzz_pulse(0.34, seed=2), 0.5, 0.9)
    W('phone_buzz', b, 'two 0.34 s vibration-motor pulses, 0.5 s apart, with a clean table rattle')

    # notify: G5 -> C6, soft
    n = np.zeros(int(0.6 * SR)); place(n, glass(NOTE['G5'], 0.5, 10), 0.0, 0.8); place(n, glass(NOTE['C6'], 0.5, 9), 0.075)
    W('notify', lp(n, 7000), 'two soft glass notes rising a fourth, G5 then C6, 75 ms apart')

    # pops: a round bloop, three pitches
    for i, (f0, f1) in enumerate([(330, 880), (392, 1047), (294, 784)]):
        x, ph = glide(f0, f1, 0.09, 0.035, 38)
        x = x + 0.18 * np.sin(2 * ph) * np.exp(-60 * T(0.09))
        W('pop' if i == 0 else f'pop_{i + 1}', fade(x, 0.001, 0.02), f'a sine gliding {f0}->{f1} Hz in 35 ms, decaying in 90 ms')

    # stamp: a friendly thud
    t = T(0.35)
    thump = np.sin(2 * np.pi * np.cumsum(55 + 75 * np.exp(-t / 0.025)) / SR) * np.exp(-14 * t)
    tok = np.sin(2 * np.pi * 410 * t) * np.exp(-55 * t) * 0.35 + np.sin(2 * np.pi * 980 * t) * np.exp(-90 * t) * 0.12
    slap = bp(np.random.default_rng(4).standard_normal(len(t)), 500, 3200) * np.exp(-t / 0.012) * 0.25
    W('stamp', fade(thump + tok + slap, 0.0008, 0.05), 'a low thump (130->55 Hz), a woody 410 Hz tok and a 12 ms paper slap')

    # camera shutter: the Pentax K1000 (CC0) and a soft flash shimmer
    sh = otm('shutter'); x = np.zeros(int(0.55 * SR)); place(x, sh / np.max(np.abs(sh)), 0.0)
    shimmer = air(0.4, 5000, 11000, 7, 1.2) * np.exp(-6 * T(0.4)) * 0.12
    place(x, shimmer, 0.03)
    W('camera_shutter', x, "One Too Many's sfx/shutter (Pentax K1000) with a soft 5-11 kHz air shimmer under it",
      'otm/shutter: "Pentax K1000 Camera Shutter.wav" by yfjesse, https://freesound.org/people/yfjesse/sounds/579883/', 'CC0')

    # typing: soft thumb taps
    tb = np.zeros(int(1.8 * SR)); tt = 0.0; rng = np.random.default_rng(9)
    while tt < 1.6:
        place(tb, tick(3000 + rng.uniform(-250, 350), 220 + rng.uniform(-15, 15)), tt, rng.uniform(0.65, 1.0))
        tt += rng.choice([0.12, 0.15, 0.18, 0.22]) if rng.uniform() > 0.1 else 0.32
    W('typing', tb, 'about ten soft thumb taps on glass at irregular gaps, 1.7 s')

    # send: an airy upward glide to C6
    x, ph = glide(NOTE['G5'] * 0.75, NOTE['C6'], 0.16, 0.06, 22); x = x + 0.2 * np.sin(2 * ph) * np.exp(-40 * T(0.16))
    x = fade(x, 0.002, 0.04) + 0.25 * air(0.16, 2500, 8000, 11, 1.5)
    W('send', x, 'a sine gliding up to C6 in 60 ms with a little airy swish')

    # receive: E6 -> C6
    r = np.zeros(int(0.75 * SR)); place(r, glass(NOTE['E6'], 0.6, 9), 0.0); place(r, glass(NOTE['C6'], 0.65, 7), 0.09, 0.85)
    W('receive', lp(r, 8000), 'two soft glass notes falling a third, E6 then C6, 90 ms apart')

    # ding: a bright bell on C6
    W('ding', bell(NOTE['C6'], 1.4, 3.2, ((1, 1, 1), (2.0, 0.35, 1.6), (3.0, 0.15, 2.4), (4.07, 0.06, 3.5))),
      'a struck bell on C6 with near-harmonic partials, 1.4 s')

    # bulb: a quick rising sparkle
    x = np.zeros(int(1.4 * SR))
    for i, k in enumerate(['C6', 'E6', 'G6', 'C7', 'E7']):
        place(x, bell(NOTE[k], 0.9, 6.0, ((1, 1, 1), (2.0, 0.15, 2.0), (3.0, 0.05, 3.0))), 0.045 * i, 0.55 + 0.1 * i)
    x += 0.1 * air(1.4, 6000, 14000, 13, 0.8) * np.exp(-2.5 * T(1.4))
    W('bulb', fade(x, 0.002, 0.2), 'five high bell notes rising C6-E6-G6-C7-E7, 45 ms apart, over a faint 6-14 kHz shimmer')

    # cloud: a soft low puff
    t = T(0.7); u = t / 0.7
    puff = air(0.7, 120, 900, 15, 1.0) * np.exp(-5 * t) * np.minimum(1, t / 0.035)
    puff = lp(puff, 900) + 0.35 * np.sin(2 * np.pi * np.cumsum(95 - 30 * u) / SR) * np.exp(-7 * t) * np.minimum(1, t / 0.03)
    W('cloud', fade(puff, 0.003, 0.15), 'warm 120-900 Hz air with a 95->65 Hz body, soft 35 ms onset, 0.7 s')

    # whooshes
    W('whoosh', fade(swept_air(0.45, [500, 1400, 2600, 1600, 700], 1.6, 17, 0.5), 0.002, 0.04),
      'air through a band-pass sweeping 500 Hz -> 2.6 kHz -> 700 Hz, 0.45 s, peak at mid-point')
    W('whoosh_2', fade(swept_air(0.3, [700, 2000, 3200, 1200], 1.7, 19, 0.45), 0.002, 0.03),
      'a quicker swish, 700 Hz -> 3.2 kHz -> 1.2 kHz, 0.3 s')

    # footsteps: four calm steps on wood, softened
    steps = [otm(f'step{i}') for i in (1, 2, 3, 4)]
    fs = np.zeros(int(2.0 * SR))
    for i, g in enumerate([0.8, 1.0, 0.85, 0.95]):
        s = lp(steps[i], 5500); place(fs, s / np.max(np.abs(s)), 0.08 + 0.5 * i, g)
    W('footsteps', fade(fs, 0.001, 0.1), "One Too Many's step1-step4 (wood floor, CC0), 0.5 s apart, low-passed at 5.5 kHz",
      'otm/step1-3: "WoodType_1_Footstep_MensDressShoe_.wav" by monte32 (https://freesound.org/people/monte32/sounds/405115/); '
      'otm/step4: "Wood Floor Classic Shoe Footstep 1_10" by Joao_Janz (https://freesound.org/people/Joao_Janz/sounds/504020/)', 'CC0')

    # run: seven quick light steps
    rn = np.zeros(int(1.4 * SR))
    for i in range(7):
        s = resample(steps[i % 4][: int(0.12 * SR)], 1.25); s = fade(lp(s, 6500), 0.0005, 0.03)
        place(rn, s / np.max(np.abs(s)), 0.04 + 0.15 * i, [0.7, 0.9, 0.75, 0.95, 0.8, 0.9, 0.7][i])
    W('run', fade(rn, 0.001, 0.1), "One Too Many's step1-step4 shortened and played 1.25x (lighter), seven steps 0.15 s apart",
      'otm/step1-4 (as footsteps)', 'CC0')

    # door: a Stable Audio take if one is chosen (audio/gen/door.wav), else a soft thump and One Too Many's latch
    g = os.path.join(GEN, 'door.wav')
    if os.path.exists(g):
        x, sr = sf.read(g, dtype='float64'); x = finish_take(x, sr)
        meta = json.load(open(os.path.join(GEN, 'plan.json')))['sounds'].get('door', {}) if os.path.exists(os.path.join(GEN, 'plan.json')) else {}
        W('door', x, f"Stable Audio 3.0 Small SFX take, finished (trim, fade): prompt \"{meta.get('prompt', '')}\", seed {meta.get('seed')}",
          'Stable Audio 3.0 Small SFX (q8_0 GGUF via audio.cpp), generated locally', 'Stability AI Community License')
    else:
        t = T(0.4); th = np.sin(2 * np.pi * np.cumsum(70 + 40 * np.exp(-t / 0.02)) / SR) * np.exp(-12 * t)
        th = th + 0.3 * bp(np.random.default_rng(21).standard_normal(len(t)), 150, 1200) * np.exp(-t / 0.03)
        x = np.zeros(int(0.5 * SR)); place(x, th, 0.0); la = otm('latch1'); place(x, 0.6 * la / np.max(np.abs(la)), 0.02)
        W('door', fade(x, 0.001, 0.08), "a soft wooden thump with One Too Many's latch1 just after",
          'otm/latch1: "Lever Latch Close.wav" by Glitchedtones, https://freesound.org/people/Glitchedtones/sounds/322434/', 'CC0')

    json.dump(plan, open(os.path.join(OUT, 'plan.json'), 'w'), indent=1)
    print('wrote', ', '.join(f"{k} ({v['dur_s']} s)" for k, v in plan.items()))


if __name__ == '__main__':
    main()
