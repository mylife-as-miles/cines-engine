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
notify          a soft UI ping: two quick glass notes rising a fifth (C6, G6)
pop, pop_2/3    a bubble or icon appearing: a short round "bloop" (a sine gliding up), three pitches to cycle through
stamp           a friendly thud: One Too Many's rubber stamp (CC0) over a soft low thump (the NO stamp)
camera_shutter  a Stable Audio take of a small camera's shutter (click, clack), trimmed
typing          a Stable Audio take of a thumb typing on a phone, 1.8 s, its hiss gated
send            the message leaving: a quick round upward glide ending on C6
receive         the reply arriving: two soft glass notes falling a third (E6, C6)
ding            a bright glockenspiel note (C7): the right answer lighting up
bulb            a bright twinkle: a quick rising sparkle of five high bell notes (C6 E6 G6 C7 E7) over soft shimmer
cloud           a soft low puff: warm air falling from 1.2 kHz to 300 Hz with a faint low body (the grey cloud arriving)
whoosh, _2      a soft airy swish for wipes and cards sliding in (0.45 s and a quicker 0.3 s)
footsteps       four calm steps on a wooden office floor (One Too Many's step1-4, CC0), 0.5 s apart
step_1..4       the same four steps one by one (build_mix.py lays a cue's own n steps at its own gap)
run             a Stable Audio take of quick light running steps, 1.6 s
door            a Stable Audio take of a door closing with its latch
wrong           a soft cartoon "nope": two round notes falling a minor third (E5, C#5), muted
clang           a pan struck: a short bright metallic clang (inharmonic partials), the pot helmet and frying pan
stomach_drop    a soft slide down: a round tone gliding 700 -> 160 Hz in 0.5 s (also the deflate)
wobble          a trembling "wub": a soft low tone with a fast vibrato and tremble, 0.6 s (the body shaking)
bird            two quick bright chirps (gliding sines), a small bird at the window
battery_low     two soft falling beeps (G5, C5): the phone's battery giving up
swell           soft air rising for 0.8 s into the swelling thought bubble
rain            1.8 s of a little soft rain: light drops (tiny glass blips) over faint airy patter
grow            a sprout growing: three quick round plucks rising (C5, E5, G5) with a little upward glide
freeze          everything freezing: a quick tape-stop (a tone and air both falling and slowing in 0.3 s)
click           a soft button click: a small clean tick with a low body
dim             a light going down: a soft round blip falling a fifth (A5 -> D5)
plate_slide     One Too Many's sliding paper (CC0), low-passed: the plate pushed away

Every pick was ranked with earshot against its description and alternatives (audio/sfx/check.json; the variants that
lost are listed in audio/README.md). The chosen Stable Audio takes (tools/sfx_gen.py, audio/gen_plan.json) are kept
raw as FLAC in audio/gen/ (fresh .wav takes are gitignored); TAKES says which take and window each finished sound is. Without the raw take, the
committed audio/sfx/<name>.flac is kept as it is.
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
TAKES = {'door': ('door_b', 1.15, 3.0, False), 'run': ('run_a', 0.0, 1.6, False), 'typing': ('typing_sa', 0.25, 2.1, True),
         'camera_shutter': ('shutter_sa', 0.47, 1.3, True)}   # name: (audio/gen take, from s, to s, gate its hiss)
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
    env = np.where(u < peak_at, np.sin(np.pi / 2 * u / peak_at) ** 2, np.clip(np.cos(np.pi / 2 * (u - peak_at) / (1 - peak_at)), 0, 1) ** 1.6)
    return out * env


def otm(name):
    x, sr = sf.read(os.path.join(OTM, name + '.flac'), dtype='float64')
    return x if x.ndim == 1 else x.mean(axis=1)


def finish_take(x, sr, gate=True):
    """A generated take finished as sound.md §3: to 48 kHz, onset trimmed (first 1 ms frame within 40 dB of the peak,
    cut 3 ms early, 2 ms de-click), 0.15 s raised-cosine fade-out."""
    if x.ndim > 1: x = x.mean(axis=1)
    if sr != SR: x = signal.resample_poly(x, SR, sr)
    fr = int(0.001 * SR); e = np.array([np.max(np.abs(x[i:i + fr])) for i in range(0, len(x) - fr, fr)])
    first = int(np.argmax(e >= np.max(e) * 10 ** (-40 / 20))); s = max(0, first * fr - int(0.003 * SR))
    x = x[s:]; x = fade(x, 0.002, 0.15)
    # a gentle downward expander on the take's hiss (the quiet takes): 10 ms envelope, 30 dB under the peak, at most 15 dB down
    if gate:
      env = np.sqrt(np.convolve(x ** 2, np.ones(480) / 480, mode='same')) + 1e-12; thr = np.max(env) * 10 ** (-30 / 20)
      g = np.clip(env / thr, 10 ** (-15 / 20), 1.0); g = np.convolve(g, np.ones(240) / 240, mode='same'); x = x * g
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

    # notify: C6 -> G6, soft (ranked over G5 -> C6, a single E6 and a marimba pair: 79 % 'notification' vs a doorbell)
    n = np.zeros(int(0.5 * SR)); place(n, glass(NOTE['C6'], 0.4, 13), 0.0, 0.8); place(n, glass(NOTE['G6'], 0.4, 12), 0.06)
    W('notify', lp(n, 9000), 'two soft glass notes rising a fifth, C6 then G6, 60 ms apart')

    # pops: a round bloop, three pitches
    for i, (f0, f1) in enumerate([(330, 880), (392, 1047), (294, 784)]):
        x, ph = glide(f0, f1, 0.09, 0.035, 38)
        x = x + 0.18 * np.sin(2 * ph) * np.exp(-60 * T(0.09))
        W('pop' if i == 0 else f'pop_{i + 1}', fade(x, 0.001, 0.02), f'a sine gliding {f0}->{f1} Hz in 35 ms, decaying in 90 ms')

    # stamp: a friendly thud. One Too Many's rubber stamp over a soft thump (a synthetic thump alone read as a kick drum,
    # which would fight the music's own kick; this reads as an impact, a thud)
    t = T(0.35); thump = np.sin(2 * np.pi * np.cumsum(70 + 50 * np.exp(-t / 0.015)) / SR) * np.exp(-22 * t)
    s1 = otm('stamp1'); x = np.zeros(int(0.4 * SR)); place(x, s1 / np.max(np.abs(s1)), 0.0); place(x, 0.5 * thump, 0.004)
    W('stamp', fade(x, 0.0005, 0.05), "One Too Many's sfx/stamp1 (a rubber stamp) over a soft 120->70 Hz thump at -6 dB",
      'otm/stamp1: "Stamp.wav" by abstraktgeneriert, https://freesound.org/people/abstraktgeneriert/sounds/213003/', 'CC0')

    # send: a round upward glide to C6 (the airy swish read as a snare; without it, 98 % 'a message sent')
    x, ph = glide(NOTE['G5'] * 0.75, NOTE['C6'], 0.16, 0.06, 22); x = x + 0.2 * np.sin(2 * ph) * np.exp(-40 * T(0.16))
    W('send', fade(x, 0.002, 0.04), 'a sine gliding up to C6 in 60 ms, with its octave, 0.16 s')

    # receive: E6 -> C6
    r = np.zeros(int(0.75 * SR)); place(r, glass(NOTE['E6'], 0.6, 9), 0.0); place(r, glass(NOTE['C6'], 0.65, 7), 0.09, 0.85)
    W('receive', lp(r, 8000), 'two soft glass notes falling a third, E6 then C6, 90 ms apart')

    # ding: a glockenspiel note on C7 (a lower bell on C6 read as a gong)
    W('ding', bell(NOTE['C7'], 1.0, 3.5, ((1, 1, 1), (2.76, 0.35, 2.2), (5.40, 0.12, 3.5), (8.93, 0.04, 5.0)), 0.0008),
      'a glockenspiel-like note on C7 (partials 1, 2.76, 5.40, 8.93), 1.0 s')

    # bulb: a quick rising sparkle
    x = np.zeros(int(1.4 * SR))
    for i, k in enumerate(['C6', 'E6', 'G6', 'C7', 'E7']):
        place(x, bell(NOTE[k], 0.9, 6.0, ((1, 1, 1), (2.0, 0.15, 2.0), (3.0, 0.05, 3.0))), 0.045 * i, 0.55 + 0.1 * i)
    x += 0.1 * air(1.4, 6000, 14000, 13, 0.8) * np.exp(-2.5 * T(1.4))
    W('bulb', fade(x, 0.002, 0.2), 'five high bell notes rising C6-E6-G6-C7-E7, 45 ms apart, over a faint 6-14 kHz shimmer')

    # cloud: a soft low puff, falling (a static puff with a low body read as a drum hit or an explosion)
    t = T(0.6)
    puff = lp(swept_air(0.6, [1200, 700, 420, 300], 1.8, 23, 0.18), 2500)
    puff = puff + 0.12 * np.sin(2 * np.pi * np.cumsum(85 - 25 * t / 0.6) / SR) * np.exp(-8 * t) * np.minimum(1, t / 0.03)
    W('cloud', fade(puff, 0.03, 0.12), 'warm air through a band-pass falling 1.2 kHz -> 300 Hz, a faint 85->60 Hz body, 30 ms onset, 0.6 s')

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

    # the Stable Audio takes (door, run, typing, camera_shutter): each a window of one take, finished
    gp = os.path.join(ROOT, 'audio', 'gen_plan.json'); gplan = json.load(open(gp)) if os.path.exists(gp) else {}
    old = json.load(open(os.path.join(OUT, 'plan.json'))) if os.path.exists(os.path.join(OUT, 'plan.json')) else {}
    for name, (take, a, b, gate) in TAKES.items():
        g = next((os.path.join(GEN, take + e) for e in ('.flac', '.wav') if os.path.exists(os.path.join(GEN, take + e))), '')
        if not g:
            if os.path.exists(os.path.join(OUT, name + '.flac')) and name in old:
                plan[name] = old[name]; print(f'{name}: raw take {take} not here, kept the committed flac'); continue
            raise SystemExit(f'{name}: need audio/gen/{take}.wav (python3 tools/sfx_gen.py --only {take})')
        x, sr = sf.read(g, dtype='float64'); x = x[int(a * sr):int(b * sr)]; x = finish_take(x, sr, gate)
        meta = gplan.get(take, {})
        W(name, x, f"Stable Audio 3.0 Small SFX take {take} ({a}-{b} s), finished (onset trim, {'hiss gate, ' if gate else ''}fade): "
                   f"prompt \"{meta.get('prompt', '')}\", seed {meta.get('seed')}",
          'Stable Audio 3.0 Small SFX (q8_0 GGUF via audio.cpp), generated locally in this production', 'Stability AI Community License')


    # ---- the extra cues the engine's cue sheet names ----
    rng = np.random.default_rng
    for i in (1, 2, 3, 4):
        st_ = lp(otm(f'step{i}'), 5500); W(f'step_{i}', fade(st_, 0.0005, 0.02), f"One Too Many's step{i}, low-passed at 5.5 kHz",
                                         'otm/step%d (as footsteps)' % i, 'CC0')
    # wrong: E5 -> C#5, round and muted
    def soft_note(f, d, k=9.0):
        t = T(d); x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
        return fade(x * np.exp(-k * t) * np.minimum(1, t / 0.008), 0.001, 0.03)
    x = np.zeros(int(0.5 * SR)); place(x, soft_note(659.26, 0.22), 0.0); place(x, soft_note(554.37, 0.3), 0.15)
    W('wrong', lp(x, 3500), 'two round notes falling a minor third, E5 then C#5, low-passed at 3.5 kHz')
    # clang: a pan, inharmonic partials
    t = T(0.9); cl = np.zeros_like(t)
    for f, g, k in ((523, 1.0, 5), (1187, 0.6, 7), (1840, 0.45, 9), (2710, 0.3, 12), (3990, 0.18, 16)):
        cl += g * np.sin(2 * np.pi * f * t) * np.exp(-k * t)
    cl += 0.5 * hp(rng(41).standard_normal(len(t)), 2000) * np.exp(-t / 0.006)
    W('clang', fade(lp(cl, 7000), 0.0005, 0.1), 'a struck pan: five inharmonic partials (523-3990 Hz) and a 6 ms strike, 0.9 s')
    # stomach_drop: a slide down
    x, ph = glide(700, 160, 0.6, 0.5, 2.5); x = x + 0.15 * np.sin(2 * ph) * np.exp(-3 * T(0.6))
    W('stomach_drop', fade(x * np.minimum(1, T(0.6) / 0.02), 0.002, 0.12), 'a round tone gliding 700 -> 160 Hz over 0.5 s')
    # wobble: a trembling wub
    t = T(0.6); f = 180 * (1 + 0.06 * np.sin(2 * np.pi * 9 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.3 * np.sin(2 * ph)) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * t + 1)) * np.sin(np.pi * t / 0.6) ** 0.7
    W('wobble', fade(x, 0.01, 0.05), 'a 180 Hz tone with a 9 Hz vibrato and tremble, 0.6 s')
    # bird: two chirps
    def chirp(f0, f1, d):
        t = T(d); f = f0 + (f1 - f0) * (t / d) ** 0.6; ph = 2 * np.pi * np.cumsum(f) / SR
        return fade(np.sin(ph) * np.sin(np.pi * t / d) ** 1.5, 0.001, 0.005)
    x = np.zeros(int(0.45 * SR)); place(x, chirp(3200, 4400, 0.07), 0.0); place(x, chirp(3500, 4800, 0.06), 0.13, 0.8)
    place(x, chirp(3000, 4200, 0.08), 0.28, 0.6)
    W('bird', x, 'three quick chirps gliding 3-4.8 kHz')
    # battery_low: two soft falling beeps
    x = np.zeros(int(0.7 * SR)); place(x, soft_note(783.99, 0.25, 6), 0.0); place(x, soft_note(523.25, 0.35, 5), 0.28)
    W('battery_low', lp(x, 4000), 'two soft beeps falling a fifth, G5 then C5')
    # swell: soft air rising
    W('swell', fade(swept_air(0.8, [300, 600, 1400, 2400], 1.6, 43, 0.85), 0.05, 0.06), 'air through a band-pass rising 300 Hz -> 2.4 kHz, 0.8 s')
    # rain: a little soft rain
    n = int(1.8 * SR); r = rng(47); x = 0.25 * bp(r.standard_normal(n), 2500, 9000) * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.5
    for _ in range(26):
        place(x, 0.6 * glass(r.uniform(1800, 3200), 0.06, 70) * r.uniform(0.3, 1.0), r.uniform(0.02, 1.7))
    W('rain', fade(lp(x, 9000), 0.15, 0.3), '26 tiny glass drops over faint 2.5-9 kHz patter, 1.8 s')
    # grow: three rising plucks
    x = np.zeros(int(0.6 * SR))
    for i, f in enumerate((523.25, 659.26, 783.99)):
        y, _ = glide(f * 0.94, f, 0.3, 0.03, 12); place(x, fade(y, 0.001, 0.05), 0.08 * i, 0.8 + 0.1 * i)
    W('grow', x, 'three round plucks rising C5-E5-G5, 80 ms apart, each with a little upward glide')
    # freeze: a tape-stop
    t = T(0.32); f = 440 * (1 - (t / 0.32)) ** 1.5 + 30; ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.3 * np.sin(2 * ph)) * (1 - t / 0.32) ** 0.5 + 0.3 * swept_air(0.32, [3000, 1200, 300], 1.8, 53, 0.05)
    W('freeze', fade(x, 0.002, 0.03), 'a tone and air both falling and slowing to a stop in 0.32 s (a tape-stop)')
    # click: a soft button click
    t = T(0.04); x = np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.003) + 0.6 * np.sin(2 * np.pi * 260 * t) * np.exp(-t / 0.01)
    W('click', fade(x, 0.0003, 0.005), 'a 2.4 kHz tick over a 260 Hz body, 40 ms')
    # dim: a falling blip
    y, _ = glide(880, 587.33, 0.16, 0.08, 14); W('dim', fade(y, 0.002, 0.04), 'a round blip falling A5 -> D5 in 80 ms')
    # plate_slide: One Too Many's sliding paper, low-passed
    sl = otm('slide'); W('plate_slide', fade(lp(sl, 4000), 0.005, 0.08), "One Too Many's sfx/slide (sliding paper), low-passed at 4 kHz",
                         'otm/slide: "55_Coger_Foto.wav (Sliding Paper)" by Atrius1, https://freesound.org/people/Atrius1/sounds/470189/', 'CC0')

    json.dump(plan, open(os.path.join(OUT, 'plan.json'), 'w'), indent=1)
    print('wrote', ', '.join(f"{k} ({v['dur_s']} s)" for k, v in plan.items()))


if __name__ == '__main__':
    main()
