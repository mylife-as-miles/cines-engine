# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""Firstborn's effects (Seven Days of No's 40, re-pitched, plus the new ones this story needs): cartoon-clean, soft and
friendly. The UI and cartoon sounds are synthesised here (pure partials and smooth filtered air, no room, no grit,
pitched in E-flat major at A = 440, the music's key centre: KEY moves Seven Days of No's C-major sketches up three
semitones); the physical ones are assembled from One Too Many's committed CC0 recordings
(claude-film/one-too-many/audio/sfx/); the door, run, typing, shutter, plate and paper pile are Stable Audio 3.0 Small
takes from the last video (kept as committed FLAC: their raw takes are not in this production). The new ones are
rendered with earshot (`earshot make`, deterministic by seed: its sounds are learned from public-domain recordings and
belong to whoever renders them) or played on earshot's real marimba, harp and pizzicato notes (public-domain recordings).

  /home/user/leonxlnx/earshot/.venv/bin/python tools/synth_sfx.py      (needs earshot for the new effects)
      -> audio/sfx/<name>.flac (48 kHz mono, 24-bit, peak -1 dBFS) and audio/sfx/plan.json (source of each)

phone_buzz      the phone vibrating on the coffee table: two motor pulses (175 Hz and its odd harmonics), a clean rattle
notify          a soft UI ping: two quick glass notes rising a fifth (E-flat6, B-flat6)
pop, pop_2/3    a bubble or icon appearing: a short round "bloop" (a sine gliding up), three pitches to cycle through
stamp           a friendly thud: One Too Many's rubber stamp (CC0) over a soft low thump (the NO stamp)
camera_shutter  a Stable Audio take of a small camera's shutter (click, clack), trimmed
typing          a Stable Audio take of a thumb typing on a phone, 1.8 s, its hiss gated
send            the message leaving: a quick round upward glide ending on E-flat6
receive         the reply arriving: two soft glass notes falling a third (G6, E-flat6)
ding            a bright glockenspiel note (E-flat7): the right answer lighting up
bulb            a bright twinkle: a quick rising sparkle of five high bell notes (E-flat6 G6 B-flat6 E-flat7 G7) over soft shimmer
cloud           a soft low puff: warm air falling from 1.2 kHz to 300 Hz with a faint low body (the grey cloud arriving)
whoosh, _2      a soft airy swish for wipes and cards sliding in (0.45 s and a quicker 0.3 s)
footsteps       four calm steps on a wooden office floor (One Too Many's step1-4, CC0), 0.5 s apart
step_1..4       the same four steps one by one (build_mix.py lays a cue's own n steps at its own gap)
run             a Stable Audio take of quick light running steps, 1.6 s
door            a Stable Audio take of a door closing with its latch
wrong           a soft cartoon "nope": two short buzzy notes falling (B-flat3, G3), low-passed
clang           a pan struck: a short metallic clang (six inharmonic partials and a bright strike), the pot and pan
stomach_drop    a soft slide down: a round tone gliding 700 -> 160 Hz in 0.5 s (also the deflate)
wobble          a trembling "wub": a soft low tone with a fast vibrato and tremble, 0.6 s (the body shaking)
bird            four quick trilled chirps (falling sweeps with a fast flutter), a small bird at the window
battery_low     three electronic beeps, the last one lower (C6, C6, F5): the phone's battery giving up
swell           soft air rising for 0.8 s into the swelling thought bubble
rain            1.8 s of a little soft rain: pink-noise patter with soft low drips
grow            a sprout growing: three quick round plucks rising (E-flat5, G5, B-flat5) with a little upward glide
click           a soft button click: a small clean tick with a low body
dim             a light going down: a soft round blip falling a fifth (A5 -> D5)
plate_slide     a Stable Audio take of a plate pushed across a table
card_land_1..3  a light card slap as a request card lands on the pile: One Too Many's card slaps (CC0), trimmed and lightened
stamp_yes       the YES stamp, brighter and friendlier than the red NO: the shorter rubber stamp (CC0), a light thump, a small C7 ping
shout_no        the red "NO!" bursting out of the hero: a tight comic hit, 0.55 s: a whoosh outward, a thud at 0.15 s and a
                cartoon boing ringing over it (build_mix.py starts it where the narrator's "no" ends, in the pause)
pile_topple     a Stable Audio take of a stack of papers toppling onto a desk

New for Firstborn:
baby_cry, _2    a newborn's brief soft cry, a one-second window of earshot's baby/cry (two windows to alternate)
sneeze          a small "ah-choo": earshot's sneeze/person raised four semitones (smaller, a child's)
phone_ring      a phone ringing: two short electronic trills (B-flat5 / D6 at 16 Hz), "brrrip brrrip"
ka_ching        an old cash register's ka-ching: earshot's cash_register/open, the strike and the bell, 1.3 s
credit_alert    the bank app's credit alert: four quick rising marimba notes (E-flat5 G5 B-flat5 E-flat6), real marimba
gavel, gavel_1  Mum's wooden spoon on the table as a gavel: two hollow wooden knocks ("tok-tok"), or one
coins           a handful of coins dropped into a hand: earshot's coins/floor
party_murmur    a party hall's soft murmur, no words: two takes of earshot's cafe/busy summed, low-passed at 1.5 kHz
swoon           Mum swooning: a harp glissando falling an octave and a half through E-flat major, with a soft falling swish
sting_1         a deadpan comic sting: three pizzicato notes falling (G4 E-flat4 B-flat3)
sting_2         a cheeky comic sting: pizzicato rising E-flat4 G4 B-flat4, landing on E-flat in octaves
meter_1..3      the meter rising with each name (first name, middle name, surname): low pizzicato E-flat3, G3, B-flat3

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
KEY = 2 ** (3 / 12)      # Seven Days of No's sketches were in C major; Firstborn's music is in E-flat major
EARSHOT = os.environ.get('EARSHOT', '/home/user/leonxlnx/earshot/.venv/bin/earshot')
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'audio', 'sfx')
OTM = os.path.normpath(os.path.join(ROOT, '..', '..', 'claude-film', 'one-too-many', 'audio', 'sfx'))
GEN = os.path.join(ROOT, 'audio', 'gen')
T = lambda d: np.arange(int(d * SR)) / SR
TAKES = {'door': ('door_b', 1.15, 3.0, False), 'run': ('run_a', 0.0, 1.6, False), 'typing': ('typing_sa', 0.25, 2.1, True),
         'camera_shutter': ('shutter_sa', 0.47, 1.3, True), 'plate_slide': ('plate_sa', 0.2, 1.3, False),
         'pile_topple': ('pile_sa', 0.3, 2.4, False)}   # name: (audio/gen take, from s, to s, gate its hiss)
NOTE = {k: v * KEY for k, v in {'C5': 523.25, 'E5': 659.26, 'G5': 783.99, 'A5': 880.0, 'C6': 1046.50, 'D6': 1174.66,
                                 'E6': 1318.51, 'G6': 1567.98, 'C7': 2093.00, 'E7': 2637.02}.items()}   # named in C, sound in E-flat


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
    W('notify', lp(n, 9000), 'two soft glass notes rising a fifth, E-flat6 then B-flat6, 60 ms apart')

    # pops: a round bloop, three pitches
    for i, (f0, f1) in enumerate([(330, 880), (392, 1047), (294, 784)]):
        f0, f1 = f0 * KEY, f1 * KEY
        x, ph = glide(f0, f1, 0.09, 0.035, 38)
        x = x + 0.18 * np.sin(2 * ph) * np.exp(-60 * T(0.09))
        W('pop' if i == 0 else f'pop_{i + 1}', fade(x, 0.001, 0.02), f'a sine gliding {f0:.0f}->{f1:.0f} Hz in 35 ms, decaying in 90 ms')

    # stamp: a friendly thud. One Too Many's rubber stamp over a soft thump (a synthetic thump alone read as a kick drum,
    # which would fight the music's own kick; this reads as an impact, a thud)
    # The thump is small and sits at 180->110 Hz: a sub thump read as a kick drum when the seven NO stamps run in a row,
    # and phone speakers do not play it anyway; the stamp's weight is in the low mids, where phones can carry it.
    t = T(0.35); thump = np.sin(2 * np.pi * np.cumsum(110 + 70 * np.exp(-t / 0.012)) / SR) * np.exp(-28 * t)
    s1 = otm('stamp1'); x = np.zeros(int(0.4 * SR)); place(x, s1 / np.max(np.abs(s1)), 0.0); place(x, 0.28 * thump, 0.004)
    x = hp(x, 90)
    W('stamp', fade(x, 0.0005, 0.05), "One Too Many's sfx/stamp1 (a rubber stamp) over a small 180->110 Hz thump at -11 dB, high-passed at 90 Hz",
      'otm/stamp1: "Stamp.wav" by abstraktgeneriert, https://freesound.org/people/abstraktgeneriert/sounds/213003/', 'CC0')

    # send: a round upward glide to C6 (the airy swish read as a snare; without it, 98 % 'a message sent')
    x, ph = glide(NOTE['G5'] * 0.75, NOTE['C6'], 0.16, 0.06, 22); x = x + 0.2 * np.sin(2 * ph) * np.exp(-40 * T(0.16))
    W('send', fade(x, 0.002, 0.04), 'a sine gliding up to E-flat6 in 60 ms, with its octave, 0.16 s')

    # receive: E6 -> C6
    r = np.zeros(int(0.75 * SR)); place(r, glass(NOTE['E6'], 0.6, 9), 0.0); place(r, glass(NOTE['C6'], 0.65, 7), 0.09, 0.85)
    W('receive', lp(r, 8000), 'two soft glass notes falling a third, G6 then E-flat6, 90 ms apart')

    # ding: a glockenspiel note on C7 (a lower bell on C6 read as a gong)
    W('ding', bell(NOTE['C7'], 1.0, 3.5, ((1, 1, 1), (2.76, 0.35, 2.2), (5.40, 0.12, 3.5), (8.93, 0.04, 5.0)), 0.0008),
      'a glockenspiel-like note on E-flat7 (partials 1, 2.76, 5.40, 8.93), 1.0 s')

    # bulb: a quick rising sparkle
    x = np.zeros(int(1.4 * SR))
    for i, k in enumerate(['C6', 'E6', 'G6', 'C7', 'E7']):
        place(x, bell(NOTE[k], 0.9, 6.0, ((1, 1, 1), (2.0, 0.15, 2.0), (3.0, 0.05, 3.0))), 0.045 * i, 0.55 + 0.1 * i)
    x += 0.1 * air(1.4, 6000, 14000, 13, 0.8) * np.exp(-2.5 * T(1.4))
    W('bulb', fade(x, 0.002, 0.2), 'five high bell notes rising E-flat6-G6-B-flat6-E-flat7-G7, 45 ms apart, over a faint 6-14 kHz shimmer')

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
    def soft_note(f, d, k=9.0):
        t = T(d); x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
        return fade(x * np.exp(-k * t) * np.minimum(1, t / 0.008), 0.001, 0.03)

    def sq(f, d, odd=(1, 3, 5, 7, 9), rel=0.02, att=0.004):
        """A soft square-ish tone (odd harmonics), flat with short ramps: electronic, not struck."""
        t = T(d); x = sum(np.sin(2 * np.pi * f * k * t) / k for k in odd)
        return x * np.minimum(1, t / att) * np.minimum(1, (d - t) / rel)
    # wrong: two buzzy notes falling (a chime-like pair read as a success chime)
    # (its notes are already in E-flat major; raised to D-flat4/B-flat3 it read as a success chime, 20 % 'an error sound')
    x = np.zeros(int(0.45 * SR)); place(x, sq(233.08, 0.14), 0.0); place(x, sq(196.0, 0.22), 0.17)
    W('wrong', lp(x, 2500), 'two square-ish notes falling, B-flat3 (0.14 s) then G3 (0.22 s), low-passed at 2.5 kHz')
    # clang: a pan (faster decays and a brighter strike than a bell, or it reads as a church bell)
    t = T(0.6); cl = np.zeros_like(t)
    for f, g, k in ((310, 0.8, 9), (523, 1.0, 10), (1187, 0.7, 14), (1840, 0.5, 18), (2710, 0.35, 24), (3990, 0.2, 30)):
        cl += g * np.sin(2 * np.pi * f * t) * np.exp(-k * t)
    cl += 0.9 * bp(rng(41).standard_normal(len(t)), 1500, 8000) * np.exp(-t / 0.01)
    W('clang', fade(cl, 0.0005, 0.08), 'a struck pan: six inharmonic partials (310-3990 Hz) dying fast and a 10 ms bright strike, 0.6 s')
    # stomach_drop: a slide down
    x, ph = glide(700, 160, 0.6, 0.5, 2.5); x = x + 0.15 * np.sin(2 * ph) * np.exp(-3 * T(0.6))
    W('stomach_drop', fade(x * np.minimum(1, T(0.6) / 0.02), 0.002, 0.12), 'a round tone gliding 700 -> 160 Hz over 0.5 s')
    # wobble: a trembling wub
    t = T(0.6); f = 180 * (1 + 0.06 * np.sin(2 * np.pi * 9 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.3 * np.sin(2 * ph)) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * t + 1)) * np.sin(np.pi * t / 0.6) ** 0.7
    W('wobble', fade(x, 0.01, 0.05), 'a 180 Hz tone with a 9 Hz vibrato and tremble, 0.6 s')
    # bird: trilled chirps (plain gliding sines read as a whistle)
    def syl(f0, f1, d, fm=38, depth=0.08):
        t = T(d); f = (f0 + (f1 - f0) * t / d) * (1 + depth * np.sin(2 * np.pi * fm * t)); ph = 2 * np.pi * np.cumsum(f) / SR
        return fade(np.sin(ph) * np.sin(np.pi * t / d) ** 1.2, 0.001, 0.004)
    x = np.zeros(int(0.6 * SR))
    for i, (a, b) in enumerate([(5800, 3600), (6000, 3800), (5600, 3400), (6200, 4200)]): place(x, syl(a, b, 0.055), 0.08 * i, [1, .8, .9, .7][i])
    W('bird', x, 'four 55 ms chirps falling from ~6 to ~3.6 kHz with a 38 Hz flutter, 80 ms apart')
    # battery_low: electronic beeps (soft struck notes read as a success chime)
    # (C6 and F5 are in E-flat major already; raised a minor third the beeps read as a success chime)
    x = np.zeros(int(0.7 * SR)); place(x, sq(1046.5, 0.09, (1, 3, 5)), 0.0); place(x, sq(1046.5, 0.09, (1, 3, 5)), 0.16)
    place(x, sq(698.5, 0.2, (1, 3, 5)), 0.32)
    W('battery_low', lp(x, 6000), 'three square-ish beeps, C6, C6 and a longer F5 below')
    # swell: soft air rising
    W('swell', fade(swept_air(0.8, [300, 600, 1400, 2400], 1.6, 43, 0.85), 0.05, 0.06), 'air through a band-pass rising 300 Hz -> 2.4 kHz, 0.8 s')
    # rain: pink-noise patter with soft low drips (glassy drops over thin air read as frying)
    n = int(1.8 * SR); r = rng(61)
    pk = signal.lfilter([0.049922, -0.095993, 0.050612, -0.004408], [1, -2.494956, 2.017265, -0.522189], r.standard_normal(n))
    x = 0.6 * bp(pk, 400, 7000) * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.4
    for _ in range(60):
        f0 = r.uniform(700, 1600); t = T(0.03)
        place(x, 0.5 * np.sin(2 * np.pi * f0 * t * (1 + 2 * t)) * np.exp(-t / 0.006) * r.uniform(0.3, 1), r.uniform(0, 1.75))
    W('rain', fade(x, 0.2, 0.3), 'pink noise band-passed 400 Hz-7 kHz with 60 soft 0.7-1.6 kHz drips, 1.8 s')
    # grow: three rising plucks
    x = np.zeros(int(0.6 * SR))
    for i, f in enumerate((523.25 * KEY, 659.26 * KEY, 783.99 * KEY)):
        y, _ = glide(f * 0.94, f, 0.3, 0.03, 12); place(x, fade(y, 0.001, 0.05), 0.08 * i, 0.8 + 0.1 * i)
    W('grow', x, 'three round plucks rising E-flat5-G5-B-flat5, 80 ms apart, each with a little upward glide')
    # click: a soft button click
    t = T(0.04); x = np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.003) + 0.6 * np.sin(2 * np.pi * 260 * t) * np.exp(-t / 0.01)
    W('click', fade(x, 0.0003, 0.005), 'a 2.4 kHz tick over a 260 Hz body, 40 ms')
    # dim: a falling blip
    y, _ = glide(880 * KEY, 587.33 * KEY, 0.16, 0.08, 14); W('dim', fade(y, 0.002, 0.04), 'a round blip falling C6 -> F5 in 80 ms')


    # ---- fix round 2: the request cards, the YES stamp, the shouted NO ----
    def onset_trim(x, keep):
        a = np.abs(x); i = int(np.argmax(a > a.max() * 0.1)); s0 = max(0, i - int(0.003 * SR)); return fade(x[s0:s0 + int(keep * SR)], 0.001, 0.04)
    for i in (1, 2, 3):
        W(f'card_land_{i}', hp(lp(onset_trim(otm(f'card_slap{i}'), 0.22), 7000), 150),
          f"One Too Many's card_slap{i}, from its onset, 0.22 s, band-limited 150 Hz-7 kHz",
          f'otm/card_slap{i}: "Cards Sounds" by uEffects, https://freesound.org/people/uEffects/sounds/208790/', 'CC0')
    # stamp_yes (ranked over a woodblock-tok version: this one reads more as a stamp, less as a bell)
    t = T(0.45); s2 = otm('stamp2'); s2 = s2 / np.max(np.abs(s2))
    th = np.sin(2 * np.pi * np.cumsum(150 + 80 * np.exp(-t / 0.01)) / SR) * np.exp(-30 * t) * 0.4
    x = np.zeros(int(0.45 * SR)); place(x, hp(s2, 200), 0.0); place(x, th, 0.003); place(x, glass(2093.0, 0.35, 10) * 0.18, 0.012)   # C7: in E-flat major already, kept as it was
    W('stamp_yes', fade(x, 0.0005, 0.06), "One Too Many's stamp2 (high-passed at 200 Hz), a light 230->150 Hz thump and a small C7 glass ping",
      'otm/stamp2: "Stamp" by kermite607, https://freesound.org/people/kermite607/sounds/362624/', 'CC0')
    # shout_no: a tight comic hit that fits the 0.65 s pause after the narrator's "no": whoosh out, thud, boing
    def boing(f0, d, wob=9, depth=0.25):
        t = T(d); f = f0 * (1 + 0.6 * np.exp(-t / 0.04)) * (1 + depth * np.exp(-t / 0.25) * np.sin(2 * np.pi * wob * t))
        ph = 2 * np.pi * np.cumsum(f) / SR; return (np.sin(ph) + 0.3 * np.sin(2 * ph)) * np.exp(-5.5 * t) * np.minimum(1, t / 0.006)
    t = T(0.35)
    thud = np.sin(2 * np.pi * np.cumsum(65 + 110 * np.exp(-t / 0.018)) / SR) * np.exp(-13 * t) + 0.35 * bp(rng(5).standard_normal(len(t)), 250, 2500) * np.exp(-t / 0.012)
    x = np.zeros(int(0.58 * SR))
    place(x, swept_air(0.22, [700, 2200, 3400, 1800], 1.7, 93, 0.7) * 0.8, 0.0)
    place(x, thud * 1.1, 0.15); place(x, boing(240, 0.43), 0.15, 0.75)
    W('shout_no', fade(x, 0.002, 0.08), 'a 0.22 s whoosh outward (700 Hz-3.4 kHz), a low thud at 0.15 s and a 240 Hz cartoon boing (9 Hz spring wobble) over it, 0.58 s')

    # ---- new for Firstborn (each picked with earshot over its alternatives; audio/README.md lists the losers) ----
    firstborn(W, onset_trim)

    json.dump(plan, open(os.path.join(OUT, 'plan.json'), 'w'), indent=1)
    print('wrote', ', '.join(f"{k} ({v['dur_s']} s)" for k, v in plan.items()))


ES_SRC = 'earshot make (github.com/Leonxlnx/earshot, v1.0.0), learned from public-domain recordings'
ES_LIC = 'free for any use (earshot renders belong to whoever renders them; sources CC0 / public domain)'


def es(sound, take=1, n=3, seed=11, pitch=None, voice=None):
    """earshot's rendering of a catalogue sound (deterministic by seed): take k of n, mono, 48 kHz"""
    import tempfile
    d = tempfile.mkdtemp(); out = os.path.join(d, 'x.wav')
    cmd = [EARSHOT, 'make', '--sound', sound, '--n', str(n), '--seed', str(seed), '-o', out]
    if pitch: cmd += ['--pitch', pitch]
    if voice: cmd += ['--voice', voice]
    import subprocess; subprocess.run(cmd, check=True, capture_output=True)
    x, sr = sf.read(os.path.join(d, f'x_{take}.wav') if n > 1 else out, dtype='float64')
    x = x.mean(axis=1) if x.ndim > 1 else x
    return x if sr == SR else signal.resample_poly(x, SR, sr)


def played(voice, notes_, vel=0.6, seed=7):
    """notes [(t, note name, velocity share)] on one of earshot's voices (marimba, harp and pizzicato are real
    instruments learned note by note from public-domain recordings), mono"""
    from earshot.synth import phrase
    from earshot.forge import knobs
    y = phrase.play([(t, knobs.hz(nm), v) for t, nm, v in notes_], voice, np.random.default_rng(seed), vel=vel)
    return y.mean(axis=1)


def varispeed(x, semis):
    """pitch and length together (a tape sped up): +4 semitones is 26 % shorter"""
    return signal.resample(x, int(len(x) / 2 ** (semis / 12)))


def firstborn(W, onset_trim):
    # baby_cry: a newborn's brief soft cry. Windows of earshot's baby/cry (a synthesised formant coo and shorter
    # 0.5 s fragments read as a squeaky toy or a cat; a one-second window reads 98 % 'a baby crying')
    b3 = es('baby/cry', 3)
    W('baby_cry', fade(lp(b3[int(0.25 * SR):int(1.25 * SR)], 6000), 0.005, 0.2),
      "earshot baby/cry (seed 11, take 3), 0.25-1.25 s, low-passed at 6 kHz, 0.2 s fade", ES_SRC, ES_LIC)
    b2 = es('baby/cry', 2)
    W('baby_cry_2', fade(lp(b2[int(0.9 * SR):int(1.9 * SR)], 6000), 0.005, 0.2),
      "earshot baby/cry (seed 11, take 2), 0.9-1.9 s, low-passed at 6 kHz, 0.2 s fade", ES_SRC, ES_LIC)
    # sneeze: as recorded it read as a cough (84 %); four semitones up it is a small sneeze (70 % against 30 %)
    W('sneeze', fade(varispeed(es('sneeze/person', 1), 4), 0.002, 0.08),
      'earshot sneeze/person (seed 11, take 1), raised 4 semitones by varispeed (smaller, a child), 0.95 s', ES_SRC, ES_LIC)
    # phone_ring: two electronic trills a major third apart in the key (B-flat5 / D6), 16 alternations a second
    def trill(dur, f1, f2, rate=16):
        t = T(dur); f = np.where(np.floor(t * rate * 2) % 2 > 0, f2, f1); ph = 2 * np.pi * np.cumsum(f) / SR
        return (np.sin(ph) + 0.3 * np.sin(3 * ph) + 0.12 * np.sin(5 * ph)) * np.minimum(1, t / 0.01) * np.minimum(1, (dur - t) / 0.02)
    x = np.zeros(int(1.45 * SR))
    for t0 in (0.0, 0.85): place(x, trill(0.55, 932.33, 1174.66), t0)          # B-flat5, D6
    W('phone_ring', lp(x, 6000), 'two 0.55 s electronic trills (B-flat5/D6 alternating 16 times a second, odd harmonics), 0.3 s apart')
    # ka_ching: earshot's cash register, the strike and the bell, cut at 1.3 s
    W('ka_ching', fade(es('cash_register/open', 3)[: int(1.3 * SR)], 0.002, 0.3),
      'earshot cash_register/open (seed 11, take 3), the first 1.3 s (strike and bell), 0.3 s fade', ES_SRC, ES_LIC)
    # credit_alert: four quick rising marimba notes, the music's own instrument (78 % 'a payment received chime')
    W('credit_alert', played('marimba', [(0, 'Eb5', 0.8), (0.07, 'G5', 0.85), (0.14, 'Bb5', 0.9), (0.21, 'Eb6', 1.0)]),
      "four rising notes E-flat5 G5 B-flat5 E-flat6, 70 ms apart, on earshot's real marimba (VCSL, CC0)", ES_SRC, ES_LIC)
    # gavel: a wooden spoon on the table, two hollow knocks (a woodblock and a table tap read as a drum hit)
    k1, k2 = es('knock/hollow', 1), es('knock/hollow', 2)
    x = np.zeros(int(0.55 * SR)); place(x, norm(k1), 0.0); place(x, norm(k2) * 0.8, 0.17)
    W('gavel', fade(x, 0.0005, 0.05), 'two of earshot knock/hollow (seed 11, takes 1, 2), 0.17 s apart, the second -2 dB', ES_SRC, ES_LIC)
    W('gavel_1', fade(k1, 0.0005, 0.03), 'earshot knock/hollow (seed 11, take 1): one tap', ES_SRC, ES_LIC)
    # coins: a handful dropped into a hand (coins/handful and coin/cup read as glass)
    W('coins', fade(es('coins/floor', 2), 0.001, 0.05), 'earshot coins/floor (seed 11, take 2)', ES_SRC, ES_LIC)
    # party_murmur: a soft hall murmur with no words: two takes of earshot's cafe/busy (murmuring voices and clinking
    # dishes, a seamless 20 s loop) summed and low-passed so no word is clear. It reads 76 % 'a crowd murmuring softly in a
    # hall' and 4 % 'people chanting'; One Too Many's walla, low-passed the same way, read 16-31 % 'chanting' (sound.md:
    # crowd walla once read as chanting and was cut)
    cb = es('cafe/busy', 1) + es('cafe/busy', 2)
    W('party_murmur', lp(cb, 1500, 4), 'two takes of earshot cafe/busy (seed 11, takes 1 and 2; a seamless 20 s loop) summed, '
      'low-passed at 1.5 kHz (4th order)', ES_SRC, ES_LIC)
    # swoon: a harp glissando falling through E-flat major with a soft falling swish under it
    gl = played('harp', [(0.035 * i, n_, 0.9 - 0.04 * i) for i, n_ in
                         enumerate(['Bb6', 'G6', 'F6', 'Eb6', 'D6', 'C6', 'Bb5', 'Ab5', 'G5', 'F5', 'Eb5'])], vel=0.5)[: int(1.6 * SR)]
    sw = swept_air(0.75, [2600, 1800, 900, 450], 1.6, 31, 0.3)
    x = np.zeros(int(1.6 * SR)); place(x, norm(gl), 0.0); place(x, norm(sw) * 0.45, 0.05)
    W('swoon', fade(x, 0.002, 0.4), "a harp glissando B-flat6 down to E-flat5 (11 notes, 35 ms apart) on earshot's real harp "
      '(VCSL, CC0), a soft swish falling 2.6 kHz -> 450 Hz under it at -7 dB', ES_SRC, ES_LIC)
    # comic stings on pizzicato (marimba and kalimba versions read as a success chime)
    W('sting_1', played('pizzicato', [(0, 'G4', 0.8), (0.2, 'Eb4', 0.9), (0.4, 'Bb3', 1.0)], vel=0.65),
      "a deadpan sting: pizzicato G4, E-flat4, B-flat3 falling, 0.2 s apart (earshot's real pizzicato, VSCO-2 CE / VCSL, CC0)", ES_SRC, ES_LIC)
    W('sting_2', played('pizzicato', [(0, 'Eb4', 0.8), (0.12, 'G4', 0.85), (0.24, 'Bb4', 0.9), (0.42, 'Eb4', 1.0), (0.42, 'Eb3', 0.8)], vel=0.65),
      "a cheeky sting: pizzicato E-flat4 G4 B-flat4 rising, landing on E-flat in octaves (earshot's real pizzicato)", ES_SRC, ES_LIC)
    # meter_1..3: the meter rising with each name (first name, middle name, surname): a comic "dun, dun, DUN" on low
    # pizzicato climbing the E-flat triad, each note harder. (Alarm beeps read as a success chime and a bell alarm as a
    # phone ringing, which this scene has none of.)
    for i, nm in enumerate(['Eb3', 'G3', 'Bb3']):
        W(f'meter_{i + 1}', played('pizzicato', [(0, nm, 0.7 + 0.15 * i)], vel=0.6 + 0.1 * i),
          f"one low pizzicato note, {nm.replace('b', '-flat')} (earshot's real pizzicato), the {['first', 'second', 'third'][i]} step of the meter", ES_SRC, ES_LIC)



if __name__ == '__main__':
    main()
