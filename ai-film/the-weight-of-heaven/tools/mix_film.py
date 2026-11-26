#!/usr/bin/env python3
"""Movement I's sound, rebuilt as one session on the film's own clock (cut v9). Editing and local synthesis only.

Run with earshot's Python:
    /root/leonxlnx/earshot/.venv/bin/python tools/mix_film.py            # both choir versions, stems, QC, review files
    /root/leonxlnx/earshot/.venv/bin/python tools/mix_film.py --only A

Why. Cuts v6 to v8 sliced cut v5's finished mix and patched the seams; the audit of v8 (edit/reviews/
I_bell_v8_sound_review.md, five reviewers, 3.7 out of 10) found what that does: a reverb tail chopped and returned, a
choir paused and restarted, the bell's note played twice, holes at the joins, and a valley made of the video model's
leftovers. Here nothing is taken from a finished mix. Every cue is rendered alone and placed on the 64.125 s clock.

  above   the cathedral's cues are cut v5's (tools/mix_bell.py renders each one; this tool moves it to the film's
          clock). The answer rings out over the vale and is thickened to a crowd. The seal is one event.
  choir   ONE unbroken pass of the take, tuned 50 cents down to the bell, placed once and never stopped; it ends by
          itself before the bell's weight lands. Version A: heard near in the cathedral and far (12 dB down, dull,
          mono) in the valley. Version B: silent in the valley.
  bell    one note. The stroke is held at full across the cut for most of a second, then falls into the ground (the
          valley hears its weight, not its pitch); the same decaying note is still in the air at the cup.
  below   a bed and Foley made here (audio/sfx/v9, tools/foundry_v9.py) in place of the video model's; of the model's
          own sound only the swallows, the breath and the father's grab are kept, cut from the raw takes. The ground is
          felt as events (the water, the fall, the arrival), never as a drone.
  master  levels set by the story (the stroke, the arrival, the landing, the lines, then everything else); about
          -18.7 LUFS, true peak under -1.5 dBTP; every join checked in 5 ms steps.
"""
import argparse, importlib.util, json, os, subprocess, sys
import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import maximum_filter1d, uniform_filter1d

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('mb', P('tools/mix_bell.py')); mb = importlib.util.module_from_spec(spec); spec.loader.exec_module(mb)
SR, FPS = mb.SR, mb.FPS
lin, db, st, mono, fade, eq, place = mb.lin, mb.db, mb.st, mb.mono, mb.fade, mb.eq, mb.place

# ---------------------------------------------------------------------------------------------- the film's clock
C1, C2, C3, QA_SPLIT, NQA, NQB, NV = 424, 539, 703, 183, 406, 262, 871          # frames (see edit/I_bell_v8.edl.json)
TA = C1 / FPS                                  # 17.667  down: the vale
T2 = (C1 + QA_SPLIT) / FPS                     # 25.292  up: Serath, the seal
TB = (C2 + QA_SPLIT) / FPS                     # 30.083  down: the water
T3 = (C2 + NQA) / FPS                          # 39.375  up: the warrant, the bell
TE = (C3 + NQA) / FPS                          # 46.208  down: the mountain
TG = (C3 + NQA + NQB) / FPS                    # 57.125  up: the cup
END = (NV + NQA + NQB) / FPS                   # 64.125
N = int(round(END * SR))
CUTS = (TA, T2, TB, T3, TE, TG)
ABOVE = ((0.0, TA, 0.0), (C1 / FPS, C2 / FPS, T2), (C2 / FPS, C3 / FPS, T3), (C3 / FPS, NV / FPS, TG))   # v5 from, v5 to, film start


def film_t(v):
    """a time on cut v5's clock, on the film's"""
    for a, b, f in ABOVE:
        if v < b - 1e-9:
            return f + (v - a)
    return TG + (v - C3 / FPS)


QA = lambda t: TA + t if t < QA_SPLIT / FPS else TB + (t - QA_SPLIT / FPS)       # Q03A (fixed) clock -> film
QB = lambda t: TE + t if t < 150 / FPS else TE + t - 9 / FPS                     # Q03B (composite) clock -> film (9 frames out)
T_PRESS, T_LIFT = film_t(19.912), film_t(21.492)                                 # 27.537, 29.117
T_LAND, T_STROKE = film_t(mb.T_LAND), film_t(mb.T_STROKE)                        # 42.417, 45.789
T_RUN = QB(159 / FPS)                                                            # 52.458: the run begins
T_ARRIVE = T_RUN + 1.9                                                           # 54.358: the sound of the fall arrives

# ---------------------------------------------------------------------------------------------- level plan (LUFS, loudest 400 ms)
L_LINE, L_ANSWER, L_OPEN, L_STROKE, L_LAND = -17.5, -16.0, -16.2, -9.6, -17.0
L_ARRIVE, L_ROAR_END = -15.5, -16.5     # after the gain below: about -13 and -14, between the lines (-15) and the stroke (-10.4)
REST_GAIN = 2.5            # everything but the second stroke, on the way to the master


# ---------------------------------------------------------------------------------------------- helpers
def Z():
    return np.zeros((N, 2))


def rev(send, ir):
    return np.stack([signal.fftconvolve(send[:, ch], ir[:, ch])[:N] for ch in range(2)], 1)


def auto(points):
    return mb.auto(points, N)[:, None]


def m_of(x):
    """loudest 400 ms of a clip (LUFS), padding short clips so the meter has room"""
    x = st(np.asarray(x, np.float64))
    if len(x) < SR:
        x = np.concatenate([x, np.zeros((SR - len(x), 2))])
    return mb.lvl(x, 'm')


def to_m(x, target):
    return st(x) * lin(target - m_of(x))


def sosf(x, kind, fc, order=4):
    return signal.sosfiltfilt(signal.butter(order, fc, kind, fs=SR, output='sos'), x, axis=0)


def noise(dur, lo, hi, seed, stereo=True):
    """band-limited noise made in the frequency domain; left and right independent"""
    n = int(dur * SR); rng = np.random.default_rng(seed)
    f = np.fft.rfftfreq(n, 1 / SR)
    shape = ((f >= lo) & (f <= hi)).astype(float) * np.sqrt(np.maximum(lo, 1.0) / np.maximum(f, lo))
    y = np.stack([np.fft.irfft((rng.standard_normal(len(f)) + 1j * rng.standard_normal(len(f))) * shape, n) for _ in range(2 if stereo else 1)], 1)
    y = y if stereo else np.repeat(y, 2, 1)
    return y / np.abs(y).max()


def swell(n, rise, fall):
    """raised-cosine up over `rise` of the length, then down"""
    t = np.arange(n) / n
    return np.where(t < rise, 0.5 - 0.5 * np.cos(np.pi * t / rise), 0.5 + 0.5 * np.cos(np.pi * (t - rise) / (1 - rise)))[:, None] ** fall


def gate(x, thr_db=-42.0, open_s=0.010, close_s=0.120):
    """let events through and shut between them (for a sound kept from a raw take)"""
    e = maximum_filter1d(np.abs(x).max(1), int(open_s * SR))
    o = maximum_filter1d((e > lin(thr_db)).astype(float), int(close_s * SR))
    return x * uniform_filter1d(o, int(0.012 * SR))[:, None]


def take_audio(path):
    """a take's or a clip's own audio at 48 kHz stereo"""
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True)
    return np.frombuffer(p.stdout, np.float32).reshape(-1, 2).astype(np.float64)


# ---------------------------------------------------------------------------------------------- the foundry's sounds
class Foundry:
    """audio/sfx/v9/<id>.flac and manifest.json (made by tools/foundry_v9.py). A missing sound is reported, never faked."""

    def __init__(self):
        self.dir = P('audio/sfx/v9'); self.used, self.missing, self.failed = [], [], []
        try:
            m = json.load(open(os.path.join(self.dir, 'manifest.json')))
            self.m = m.get('sounds', m)
        except Exception:
            self.m = {}

    def entry(self, sid):
        e = self.m.get(sid, {})
        return e if isinstance(e, dict) else {}

    def loud(self, sid):
        """where the loud part of a one-shot starts in its file (s): the mark to sync on"""
        e = self.entry(sid)
        return float(e.get('loud_onset_s', (e.get('onsets_s') or [0.05])[0]))

    def get(self, sid, want_pass=False):
        path = os.path.join(self.dir, sid + '.flac')
        if not os.path.exists(path):
            self.missing.append(sid); return None, []
        e = self.entry(sid)
        if not e.get('pass', False):
            self.failed.append(sid)
            if want_pass:
                return None, []
        self.used.append(sid)
        return st(mb.read_audio(path)), [float(v) for v in (e.get('onsets_s') or [0.05])]


# ---------------------------------------------------------------------------------------------- above: cut v5's cues, on the film's clock
SKIP = {'FX-03b': "the take's own press: a click before the squelch",
        'FX-04b': "the take's own lift: its bump lands late",
        'FX-12b': 'an alternative applause'}


def move(dst, v5_array, a_v5, b_v5, film_start):
    """copy the part of a cut-v5 array between a and b to the film's clock"""
    i0, i1 = int(round(a_v5 * SR)), min(int(round(b_v5 * SR)), len(v5_array))
    place(dst, v5_array[i0:i1], film_start)


def above(F, stems, info):
    ir, _ = mb.get_ir()
    ir_tower = ir * np.exp(-6.908 * np.arange(len(ir)) / SR * (1 / mb.TOWER_RT60 - 1 / 6.8))[:, None]
    hall, tower = {k: Z() for k in ('dialogue', 'fx_above')}, Z()

    # ---- the three lines and the room, each line to its level with its hall (as cut v5 builds them)
    trim = {}
    for _ in range(2):
        dry, send, facts = mb.build_dialogue(trim)
        both = dry + mb.reverb(send, ir)
        for cid, name, a, b, text in mb.Q01_LINES:
            trim[cid] = trim.get(cid, 0.0) + mb.L_LINE - mb.momentary(both, mb.q01(a) - 0.1, mb.q01(b) + 0.3)
    dry, send, facts = mb.build_dialogue(trim)
    # the answer is ten thousand people: four more of it, a few tens of milliseconds apart and a few cents off, spread wide
    a0, a1 = int(16.22 * SR), int(18.95 * SR)
    one = mono(dry[a0:a1]) * signal.windows.tukey(a1 - a0, 0.06)
    crowd, crowd_send = np.zeros_like(dry), np.zeros_like(send)
    for ratio, ms, pos, lp in ((1.021, 23, -0.75, 3000), (0.981, 37, 0.75, 3000), (1.012, 53, -0.4, None), (0.990, 71, 0.4, None), (0.972, 97, 0.0, 2200)):
        y = mb.varispeed(one, ratio)
        y = eq(y, [('lp', lp, 2)]) if lp else y
        y = mb.pan(y, pos) * lin(-5.0)
        place(crowd, y, 16.22 + ms / 1000.0); place(crowd_send, y * lin(mb.ANSWER_SEND), 16.22 + ms / 1000.0)
    dry, send = dry + crowd, send + crowd_send
    both = dry + mb.reverb(send, ir)
    k = L_ANSWER - mb.momentary(both, 16.3, 18.9)                                # the answer, crowd and hall together, to its level
    g = np.ones(len(dry)); i, j, r = int(16.15 * SR), int(19.2 * SR), int(0.08 * SR)
    g[i:j] = lin(k); g[i - r:i] = np.linspace(1, lin(k), r); g[j:j + r] = np.linspace(lin(k), 1, r)
    dry, send = dry * g[:, None], send * g[:, None]
    move(stems['dialogue'], dry, 0, mb.DUR, 0.0)                                 # the rite is the film's first 17.7 s: the clocks agree
    move(hall['dialogue'], send, 0, mb.DUR, 0.0)
    info['dialogue'] = {k: v for k, v in facts.items() if k.startswith('DX')}

    # ---- every other cue: rendered alone by mix_bell, moved to its place
    land_dry, land_send = Z(), Z()
    rows = []
    new_press = F.get('wax_press_soft', want_pass=True)
    new_peel = (None, [])                                                        # the foundry's peel passes its check but reads as a glitch unprompted: not used
    new_chains = F.get('chains_heavy', want_pass=True)
    for c in mb.CUES:
        if c.get('kind') is not None or c['id'] in SKIP:
            continue
        if c['id'] == 'FX-03a':                                                  # the old squelch had three bumps in it
            if new_press[0] is not None:
                continue
            c = dict(c, lvl=c['lvl'] + 4.0)                                      # no new one: at least the press is an event
        if c['id'] == 'FX-08' and new_chains[0] is not None:
            continue                                                             # the foundry's heavier chains take its place
        if c['id'] == 'FX-04a':
            if new_peel[0] is not None:
                continue
            c = dict(c, eq=list(c.get('eq') or []) + [('lp', 5000, 2)])          # its tick, dulled
        r = mb.render_simple(c)
        if r is None:
            continue
        d, sd, label, standin = r
        nz = np.flatnonzero(np.abs(d).max(1) > 1e-8)
        if not len(nz):
            continue
        a, b = nz[0] / SR, (nz[-1] + 1) / SR
        f0 = film_t(a + 0.2) - 0.2                                               # a cue belongs to the shot it sounds in
        if c['id'] == 'FX-12':
            continue                                                             # the applause is rebuilt below
        stem = 'air_above' if c['stem'] == 'dialogue_production' else 'fx_above'
        if c.get('group') == 'landing':
            place(land_dry, d[nz[0]:nz[-1] + 1], f0)
            if sd is not None:
                place(land_send, sd[nz[0]:nz[-1] + 1], f0)
        else:
            place(stems[stem], d[nz[0]:nz[-1] + 1], f0)
            if sd is not None:
                place(tower if c.get('hall') == 'tower' else hall['fx_above'], sd[nz[0]:nz[-1] + 1], f0)
        rows.append({'id': c['id'], 'film_s': round(f0, 3), 'sound': c['sound'], 'source': label})
    info['cues_above'] = rows

    # ---- the seal: one press (the foundry's soft one if it passed; the take's click is gone either way)
    x, on = new_press
    if x is not None:
        y = eq(mono(x), [('hp', 90, 2), ('lp', 4000, 2)])
        y = mb.pan(fade(y[:int(1.2 * SR)], 0.002, 0.25), 0.2)
        place(stems['fx_above'], to_m(y, L_LINE - 5.0), T_PRESS - on[0])
        info['seal'] = 'one press: wax_press_soft (foundry) on the touch; the old squelch and the take\'s click are out'
    x, on = new_peel
    if x is not None:
        y = mb.pan(fade(eq(mono(x), [('hp', 300, 2), ('lp', 6000, 2)])[:int(0.8 * SR)], 0.002, 0.2), 0.2)
        place(stems['fx_above'], to_m(y, L_LINE - 12.0), T_LIFT - on[0])
    t = np.arange(int(0.09 * SR)) / SR                                           # the small thump of a ring bottoming in wax
    thump = (np.sin(2 * np.pi * 100 * t) * np.exp(-t / 0.022))[:, None] * np.ones((1, 2)) * lin(-24)
    place(stems['fx_above'], thump, T_PRESS + 0.14)

    # ---- the chains going slack: heavy iron, slowed, from its first big clank
    x, on = new_chains
    if x is not None:
        y = eq(x[int(1.15 * SR):int(4.6 * SR)], [('hp', 120, 2), ('lp', 5000, 2)])
        y = to_m(fade(y, 0.004, 1.2), L_LINE - 9.0)
        place(stems['fx_above'], y, film_t(25.57) - 0.06); place(tower, y * lin(-18.0), film_t(25.57) - 0.06)

    # ---- the landing: the cues' weight, the foundry's bigger one if it passed, to one level with the tower's return
    x, on = F.get('bell_landing_big', want_pass=True)
    if x is not None:
        y = eq(x[:int(4.0 * SR)], [('hp', 30, 2)])
        y = fade(y, 0.003, 1.5) * lin(-22 - m_of(y))
        place(land_dry, y, T_LAND - on[0]); place(land_send, y * lin(-20), T_LAND - on[0])
    sub = noise(1.3, 28, 46, 71) * swell(int(1.3 * SR), 0.06, 1.6) * lin(-20)    # the beam takes it: felt, not pitched
    place(land_dry, sub, T_LAND)
    both = land_dry + rev(land_send, ir_tower)
    stems['fx_above'] += both * lin(L_LAND - mb.momentary(both, T_LAND - 0.05, T_LAND + 1.0))

    # ---- the applause: gloved, vast, far under the bell, and not for the first second and a half of the cup
    c12 = [c for c in mb.CUES if c['id'] == 'FX-12'][0]
    r = mb.render_simple(c12)
    if r is not None:
        d = r[0]; nz = np.flatnonzero(np.abs(d).max(1) > 1e-8); ap = mono(d[nz[0]:nz[-1] + 1])
        many = np.zeros((len(ap) + SR, 2))
        for ratio, ms, pos in ((1.0, 0, 0.0), (1.03, 37, -0.6), (0.97, 71, 0.6), (1.015, 113, -0.3), (0.985, 151, 0.3)):
            place(many, mb.pan(mb.varispeed(ap, ratio), pos), ms / 1000.0)
        many = eq(many, [('hp', 200, 2)])                                         # full band: any low-pass turns gloved applause into hooves
        many = fade(many[:int(4.6 * SR)], 1.2, 2.2)
        many *= lin(-40.0 - mb.lvl(many, 'rms'))                                   # far under the note
        place(stems['fx_above'], many, TG + 1.5); place(hall['fx_above'], many * lin(-7), TG + 1.5)

    # ---- returns, and no effect is the last sound
    stems['dialogue'] += rev(hall['dialogue'], ir) * auto([(0, 0.0), (18.9, 0.0), (22.3, None), (END, None)])   # the answer rings out over the vale, once
    stems['fx_above'] += rev(hall['fx_above'], ir) + rev(tower, ir_tower)
    stems['fx_above'] *= auto([(0, 0.0), (END - 2.6, 0.0), (END - 1.0, None), (END, None)])

    # ---- the cathedral's air: v5's two beds, only where the picture is above, each edge a 40 ms fade
    wind_c = [c for c in mb.CUES if c['id'] == 'BED-01'][0]; crowd_c = [c for c in mb.CUES if c['id'] == 'BED-02'][0]
    wind = mb.bed(wind_c, mb.WIND_ENV, mb.WIND_REF, 300)[0]; crowd = mb.bed(crowd_c, mb.CROWD_ENV, mb.CROWD_REF, 400)[0]
    for a, b, f in ABOVE:
        for bedx in (wind, crowd):
            seg = bedx[int(round(a * SR)):min(int(round(b * SR)), len(bedx))].copy()
            place(stems['air_above'], fade(seg, 0.004 if a > 0 else 0.0, 0.04), f)   # a cut up is hard: the hall is simply there
    stems['air_above'] *= auto([(0, 0.0), (T_STROKE - 0.4, 0.0), (T_STROKE - 0.1, -6.0), (TE + 0.1, -6.0), (TG - 0.1, -6.0), (TG, 0.0), (END, 0.0)])   # nothing stands beside the stroke
    return ir


# ---------------------------------------------------------------------------------------------- the bell: one note
def bell(stems, ir, info):
    # the opening stroke over black, as cut v5 has it
    y, sync = mb.bell_stroke(L_OPEN, darker=True)
    y = y[:int(11.0 * SR)]
    tt = np.arange(len(y)) / SR + (mb.T_OPEN - sync)
    y = y * np.interp(tt, [0, 4.4, 6.1, 8.0, 10.5], [1, 1, lin(-9), lin(-24), 0])[:, None]
    d = Z(); place(d, y, mb.T_OPEN - sync)
    both = d + rev(d * lin(-11.0), ir)
    stems['bell'] += both * lin(L_OPEN - mb.momentary(both, mb.T_OPEN - 0.1, mb.T_OPEN + 1.5))
    # THE stroke: the same bell with more of its mass (the audit: it read as eight tons, not ninety), and its whole tail
    old = dict(mb.BELL)
    mb.BELL.update(body_db=old['body_db'] + 4.0, oct1_db=old['oct1_db'] + 4.0, oct2_db=old['oct2_db'] + 5.0)
    mb._cache.pop('bell', None)
    y, sync = mb.bell_stroke(L_STROKE)
    mb.BELL.update(old); mb._cache.pop('bell', None)
    d = Z(); place(d, y, T_STROKE - sync)
    full = d + rev(d * lin(-13.0), ir)
    full *= lin(L_STROKE - mb.momentary(full, T_STROKE - 0.1, T_STROKE + 1.5))
    hum = sosf(full, 'lowpass', 150, 4)                                          # what the ground gets: its weight (48 and 96 Hz), not its note
    dim = sosf(full, 'lowpass', 900, 2)                                          # the note on its way down: its top gone
    air = sosf(full, 'highpass', 150, 2)                                         # what the hall keeps eleven seconds on: its note
    # Full across the cut, for a second and more: a struck bell needs its first second to be a bell. Then it darkens into
    # the ground as the mountain cracks; gone from the valley before the daughter's shot; still in the air at the cup.
    a = auto([(0, 0.0), (47.3, 0.0), (48.5, None), (END, None)])
    d = auto([(0, None), (47.2, None), (48.4, -2.0), (48.6, -2.0), (49.8, None), (END, None)])
    b = auto([(0, None), (47.6, None), (48.9, -4.0), (49.6, -4.0), (50.8, None), (END, None)])
    c = auto([(0, None), (TG - 0.004, None), (TG + 0.004, 12.0), (END - 1.6, 15.0), (END - 0.05, None), (END, None)])   # eleven seconds old and still the loudest thing in the hall
    stems['bell'] += full * a + dim * d + air * c
    stems['ground'] += hum * b
    info['bell'] = 'one stroke, one tail: full to 47.3 s, darkening into the ground by 49.8, the same note high-passed at the cup'


# ---------------------------------------------------------------------------------------------- the choir: one unbroken pass
def choir(stems, ir, far_on, info):
    path = P('audio/choir/choir_1_mixed_sustained.flac')
    x = st(mb.read_audio(path))
    x = mb.varispeed(x, 0.9715)                                                  # 50 cents down: its G onto the bell's 191.6 Hz
    # even it once: a slow curve so its held chords sit together, and its breath lifted so the attack after it is not a jump
    hop = SR // 4
    e = np.array([np.sqrt((x[i:i + SR] ** 2).mean()) for i in range(0, len(x) - SR, hop)]) + 1e-9
    tgt = np.median(e[e > e.max() * 0.2])
    gdb = np.clip(db(tgt / e), -3.0, 8.0)
    gdb = np.where(gdb > 3.0, np.minimum(gdb, 8.0) * 0.8, gdb)                    # only real dips (the breaths) get more than 3 dB
    gdb = uniform_filter1d(gdb, 5)
    g = np.interp(np.arange(len(x)), np.arange(len(e)) * hop + SR // 2, lin(gdb))
    x = eq(x * g[:, None], mb.CHOIR_EQ)
    T0 = 10.1                                                                    # the tuned take's zero on the film's clock
    d = Z(); place(d, x, T0)
    d *= auto([(0, None), (10.55, None), (12.05, 0.0), (END, 0.0)])               # its one fade: in
    open_m = max(mb.momentary(d, 12.2, 17.0), mb.momentary(d, 25.5, 30.0))
    d *= lin(-24.5 - open_m)                                                     # its open level; the rides below are against this
    # NEAR, in the hall: 9 LU under the lines when alone, 16 under while anyone speaks, 11 under and flat through the seal
    ride = auto([(0, -2.0), (13.9, -2.0), (14.4, -9.0), (18.9, -9.0), (19.5, -4.0), (39.2, -4.0), (39.6, -2.0), (END, -2.0)])
    near = d * ride
    under = eq(near, mb.CHOIR_UNDER_EQ)                                          # room for consonants while anyone speaks
    sp = auto([(0, None), (13.9, None), (14.3, 0.0), (18.8, 0.0), (19.3, None), (END, None)])
    near = near * (1 - sp) + under * sp
    # FAR, from under the kingdom: 12 dB down, low-passed at 700 Hz, mono; 4 dB more on the dust
    far = st(mono(sosf(d, 'lowpass', 700, 2))) * lin(-12.0) * auto([(0, 0.0), (36.4, 0.0), (37.0, -4.0), (END, -4.0)])
    w = np.zeros(N); x80 = int(0.04 * SR)                                        # where the picture is above: 80 ms crossfades on the cuts
    for a_, b_ in ((0, TA), (T2, TB), (T3, TE), (TG, END)):
        w[int(a_ * SR):int(b_ * SR)] = 1.0
    w = uniform_filter1d(w, 2 * x80)[:, None]
    wet = rev(near * w * lin(-22.0), ir)                                         # the hall rings on over each cut down
    out = near * w + wet + (far * (1 - w) if far_on else 0.0)
    out *= auto([(0, 0.0), (41.0, 0.0), (41.25, None), (END, None)])              # nothing of it, hall included, in the hold before the landing
    stems['choir'] += out
    info['choir'] = {'take': 'audio/choir/choir_1_mixed_sustained.flac, whole, varispeed x0.9715 (50 cents down)', 'zero_on_film_s': T0,
                     'far_in_the_valley': bool(far_on), 'near_open_lufs': -24.5}


# ---------------------------------------------------------------------------------------------- below: the valley
def below(F, stems, info):
    notes = []
    # ---- its air: one bed made here, a different stretch of it under each passage
    bedx, _ = F.get('wind_vale_field', want_pass=True)
    src = 'audio/sfx/v9/wind_vale_field.flac'
    if bedx is None:
        bedx, _ = F.get('wind_vale_farmland', want_pass=True); src = 'audio/sfx/v9/wind_vale_farmland.flac'
    if bedx is None:
        bedx = st(mb.read_audio(P('audio/sfx/wind_vale.flac'))); src = 'audio/sfx/wind_vale.flac (synthesized; no generated bed passed)'
    bedx = eq(bedx, [('hp', 80, 2)])
    bedx = bedx * lin(-39.0 - db(np.sqrt((bedx ** 2).mean())))                    # -39 dBFS RMS before its automation
    L = len(bedx) / SR
    for a_, b_, off in ((TA, T2, 1.0), (TB, T3, min(9.0, max(L - 20.5, 1.0))), (TE, TG, max(min(18.5, L - 11.2), 1.0))):
        seg = bedx[int(off * SR):int((off + (b_ - a_)) * SR)]
        if len(seg) < int((b_ - a_) * SR):
            seg = np.concatenate([seg, bedx[int(1.0 * SR):int(1.0 * SR) + int((b_ - a_) * SR) - len(seg)]])
        place(stems['air_below'], fade(seg, 0.04, 0.03), a_)
    stems['air_below'] *= auto([(0, 0.0), (TB, 0.0), (TB + 0.5, -3.0), (34.3, -3.0), (34.8, 0.0), (36.6, 0.0), (37.5, -17.0), (T3, -17.0),
                                (TE, None), (47.0, None), (48.6, -1.0), (T_ARRIVE, 0.0), (END, 0.0)])   # the wind dies on the dust (near silence, never digital black);
    # at the mountain the bell owns the cut: the valley's air comes up only as the note sinks (under the stroke it made the bell read as a doorbell)
    info['valley_bed'] = src

    def lay(sid, t, level, chain=None, pos=None, take=None, fo=0.08, onset_i=0, want_pass=False, gain_env=None, stem='foley_below', sync=None, speed=None):
        x, on = F.get(sid, want_pass=want_pass)
        if x is None:
            notes.append(f'{sid}: not used ({"missing" if sid in F.missing else "did not pass"})')
            return False
        o = sync if sync is not None else on[min(onset_i, len(on) - 1)]
        if speed:
            x = mb.varispeed(x, speed); o = o / speed
        if take:
            a_ = max(o + take[0], 0.0); x = x[int(a_ * SR):int((o + take[1]) * SR)]; o = o - a_
        y = eq(mono(x) if pos is not None else x, chain) if chain else (mono(x) if pos is not None else x)
        y = fade(y, 0.003, fo)
        y = mb.pan(y, pos) if pos is not None else st(y)
        y = to_m(y, level)
        if gain_env is not None:
            y = y * np.interp(np.arange(len(y)) / SR, [p[0] for p in gain_env], [lin(p[1]) for p in gain_env])[:, None]
        place(stems[stem], y, t - o)
        return True

    # ---- the vale: the hoe far off, her steps, the swallows and his breath (the model's, kept), the bowl, his boots going
    for t, k, sp in ((18.46, 0, None), (19.26, 1, None), (20.20, 0, 0.95)):       # the foundry's third chop fails alone: the first again, a little lower
        lay('hoe_chop', t + 0.075, L_LINE - 17.0, [('hp', 150, 2), ('lp', 2500, 2)], pos=-0.35, take=(-0.03, 0.5), onset_i=k, speed=sp)
    lay('child_steps_mud', 17.95, L_LINE - 27.0, [('lp', 1800, 2)], pos=0.45, take=(-0.03, 2.9), fo=0.3)   # low and dull: louder, steps and hoe together read as a blade being drawn
    qa = take_audio(P('out/edits/Q03A_t2_fixed.mp4'))
    sw = gate(sosf(qa[int(3.45 * SR):int(5.40 * SR)], 'highpass', 150, 2), -44.0)
    place(stems['foley_below'], to_m(fade(sw, 0.01, 0.1), L_LINE - 11.0), QA(3.45))
    lay('bowl_on_stone', 23.31, L_LINE - 10.0, [('hp', 60, 2)], pos=0.1, take=(-0.03, 0.9), fo=0.3)
    lay('bowl_slop', 23.37, L_LINE - 17.0, [('hp', 250, 2)], pos=0.1, take=(-0.02, 0.55), fo=0.25)      # it is a bowl of water: the water says so
    lay('boots_away_mud', 24.0, L_LINE - 15.0, [('hp', 70, 2), ('lp', 5000, 2)], pos=-0.5, take=(-0.03, 1.5), fo=0.3,
        gain_env=[(0.0, 0.0), (1.6, -5.0)])

    # ---- the water: wind far off; when the rings open, the bowl answers on the stone and the ground is felt once
    lay('bowl_buzz_on_stone', 32.38, -44.0, [('hp', 900, 2)], pos=0.0, take=(-0.02, 0.9), fo=0.4)
    sw = noise(1.3, 30, 42, 5) * swell(int(1.3 * SR), 0.3, 1.4) * lin(-27.0)
    place(stems['ground'], sw, 32.25)

    # ---- the animals
    lay('ox_snort', 35.15, L_LINE - 8.0, [('hp', 70, 2)], pos=-0.4, take=(-0.22, 0.45), fo=0.15, sync=F.loud('ox_snort'))
    lay('crows_burst', 35.46, L_LINE - 13.0, [('lp', 7000, 2), ('hp', 200, 2)], pos=0.5, take=(-0.05, 1.5), fo=0.5, sync=F.loud('crows_burst'))

    for sid, t_, pos_, lv_ in (('crow_caw_2', 35.50, 0.55, L_LINE - 9.0), ('crow_caw_1', 35.86, 0.3, L_LINE - 11.0)):   # the calls say what the wings are
        pth = P('audio/sfx/v9', sid + '.flac')
        if os.path.exists(pth):
            y = fade(eq(mono(mb.read_audio(pth)), [('hp', 300, 2), ('lp', 6000, 2)]), 0.002, 0.08)
            place(stems['foley_below'], to_m(mb.pan(y, pos_), lv_), t_)
        else:
            notes.append(sid + ': missing')

    # ---- the mountain. Its fall has no sound of its own; the ground knows first
    sh = noise(1.6, 25, 45, 9) * swell(int(1.6 * SR), 0.25, 1.2) * lin(-22.0)
    place(stems['ground'], sh, 47.55)                                             # as the section of the face slips
    ru = noise(3.1, 30, 60, 13) * (np.linspace(0, 1, int(3.1 * SR)) ** 2.2)[:, None] * lin(-24.0)
    place(stems['ground'], fade(ru, 0, 0.05), 49.55)                               # coming through the ground under the daughter
    for k in range(3):                                                             # the bowl chatters on the stone: her reason to take it
        lay('bowl_buzz_on_stone', 49.95 + 0.42 * k, -40.0 + 2.0 * k, [('hp', 900, 2)], pos=0.2, take=(-0.02, 0.5), fo=0.15)
    lay('bowl_taken', QB(3.5) + 1.17, L_LINE - 14.0, None, pos=0.25, take=(-0.03, 0.9), fo=0.3)
    qb = take_audio(P('out/takes/Q03B_t1.mp4'))                                    # the father's grab: the model's, cut from the raw take
    t0 = 4.25 + (51.50 - QB(3.5))
    gr = gate(sosf(qb[int(t0 * SR):int((t0 + 0.95) * SR)], 'highpass', 100, 2), -40.0)
    place(stems['foley_below'], to_m(fade(gr, 0.01, 0.08), L_LINE - 6.0), 51.50)

    # ---- the run: his boots on the frames where they land, his breath, the water she saved
    n_run = TG - T_RUN
    steps = (52.63, 52.95, 53.27, 53.61, 53.93, 54.25, 54.55, 54.87, 55.17, 55.48, 55.77, 56.11, 56.46, 56.78)
    x, on = F.get('run_boots_mud')
    if x is None:
        notes.append('run_boots_mud: missing')
    else:
        for k, t in enumerate(steps):
            o = on[k % len(on)]
            y = mono(x[int((o - 0.02) * SR):int((o + 0.46) * SR)])
            y = mb.varispeed(y, 1.04 if k % 2 else 0.97)
            y = fade(eq(y, [('hp', 60, 2)]), 0.002, 0.12)
            y = to_m(mb.pan(y, 0.12 if k % 2 else -0.12), L_LINE - (8.0 if t < T_ARRIVE else 12.0))
            place(stems['foley_below'], y, t - 0.02)
    for sid, lvl_, chain, pos in (('run_breath', L_LINE - 14.0, [('hp', 150, 2)], -0.1), ('bowl_slop', L_LINE - 19.0, [('hp', 200, 2)], 0.3)):
        x, on = F.get(sid)
        if x is None:
            notes.append(f'{sid}: missing'); continue
        y = eq(mono(x), chain)
        if sid == 'run_breath':
            y = mono(gate(st(y), -46.0, 0.01, 0.15))                              # its floor was raised with it: shut between the breaths
        while len(y) < int(n_run * SR):
            y = np.concatenate([y[:-int(0.05 * SR)], fade(y, 0.05, 0.0)])
        y = fade(y[:int(n_run * SR)], 0.02, 0.004)
        place(stems['foley_below'], to_m(mb.pan(y, pos), lvl_), T_RUN)

    # ---- the arrival: a crack, the pressure, then rock, and it is cut dead on the cut to the cup
    lay('rockfall_crack', T_ARRIVE - 0.07, L_LINE - 6.0, [('hp', 200, 2)], pos=-0.2, take=(-0.02, 1.2), fo=0.5, stem='rock')
    pr = noise(0.5, 30, 150, 21) * (np.exp(-np.arange(int(0.5 * SR)) / SR / 0.16) * np.minimum(np.arange(int(0.5 * SR)) / (0.008 * SR), 1))[:, None]
    body = noise(0.5, 150, 600, 22) * (np.exp(-np.arange(int(0.5 * SR)) / SR / 0.11))[:, None]
    place(stems['rock'], pr * lin(-11.0) + body * lin(-20.0), T_ARRIVE)
    x, on = F.get('rockfall_boom')
    if x is not None:
        y = eq(x[:int(3.4 * SR)], [('hp', 28, 2), ('lp', 2500, 2)])
        place(stems['rock'], to_m(fade(y, 0.003, 1.4), L_ARRIVE), T_ARRIVE - F.loud('rockfall_boom'))
    else:
        notes.append('rockfall_boom: missing')
    n_body = TG - (T_ARRIVE + 0.12)
    # two takes, left and right: the wall of it from the first moment, and the rise that peaks on the cut
    for sid, pos, start, lvl_, up in (('rockfall_body_b', 0.65, 0.2, L_ROAR_END - 2.0, -3.0), ('rockfall_body_a', -0.65, max(4.4 - (n_body - 0.3), 0.2), L_ROAR_END, -9.0)):
        x, on = F.get(sid)
        if x is None:
            notes.append(f'{sid}: missing'); continue
        y = eq(mono(x), [('lp', 4000, 2), ('hp', 35, 2)])
        y = y[int(start * SR):int(start * SR) + int(n_body * SR)]
        y = fade(y, 0.06, 0.004)
        y = to_m(mb.pan(y, pos), lvl_) * (lin(up) + (1 - lin(up)) * np.linspace(0, 1, len(y)) ** 1.3)[:, None]
        place(stems['rock'], y, T_ARRIVE + 0.12)
    stems['rock'] = mb.limiter(stems['rock'], -8.0)[0]                           # its own peaks held here, so the master's limiter only ever meets the bell
    # nothing from below survives the cut up: every valley layer ends on the frame
    for k in ('air_below', 'foley_below', 'rock'):
        for t_cut in (T2, T3, TG):
            i = int(round(t_cut * SR)); r = int(0.004 * SR)
            j = min(int(round((t_cut + 0.6) * SR)), N)
            env = np.ones(N); env[i - r:i] = np.linspace(1, 0, r); env[i:j] = 0
            stems[k] *= env[:, None]
    g = np.ones(N); i = int(round(TG * SR)); r = int(0.004 * SR)                  # the ground too, at the cup
    g[i - r:i] = np.linspace(1, 0, r); g[i:] = 0
    low_before = stems['ground'].copy()
    stems['ground'] = low_before * g[:, None]
    info['valley_notes'] = notes


# ---------------------------------------------------------------------------------------------- the master and its checks
def master(stems):
    rest = sum(v for k, v in stems.items() if k != 'bell') * lin(REST_GAIN)
    b = stems['bell'].copy()
    w = auto([(0, REST_GAIN), (T_STROKE - 0.5, REST_GAIN), (T_STROKE - 0.2, 0.0), (END, 0.0)])     # the opening stroke rises with the rest; THE stroke does not
    mix = rest + b * w
    out, gr = mb.limiter(mix, -1.8)
    return out, gr


def events(mix):
    win = {'the opening stroke': (0.4, 2.0), 'line 1': (5.9, 10.4), 'line 2': (14.2, 15.9), 'the answer': (16.3, 18.9), 'the hoe': (18.4, 20.6),
           'the swallows': (21.2, 23.0), 'the bowl on the wall': (23.2, 24.0), 'the press': (T_PRESS - 0.1, T_PRESS + 0.6), 'the water': (32.2, 33.6),
           'the ox': (35.1, 35.9), 'the crows': (35.4, 36.7), 'the hold before the landing': (41.4, 42.3), 'the landing': (T_LAND - 0.05, T_LAND + 1.0),
           'THE STROKE': (T_STROKE - 0.1, T_STROKE + 1.5), 'the fall (no sound of its own)': (47.2, 49.6), 'the grab': (51.4, 52.4),
           'the run before the sound': (T_RUN + 0.3, T_ARRIVE - 0.2), 'the arrival': (T_ARRIVE - 0.1, T_ARRIVE + 1.0), 'the roar at the cut': (TG - 1.0, TG),
           'the cup': (TG + 0.2, TG + 3.0)}
    return {k: round(float(mb.momentary(mix, a, b)), 1) for k, (a, b) in win.items()}


def joins(mix):
    """each picture cut in 5 ms steps: the deepest dip against the level either side, and the largest single-sample step"""
    m = mix.mean(1); out = {}
    for t in CUTS:
        i = int(round(t * SR)); h = int(0.005 * SR)
        lv = np.array([db(np.sqrt((m[i + k * h:i + (k + 1) * h] ** 2).mean()) + 1e-9) for k in range(-40, 40)])
        side = np.minimum(np.median(lv[:20]), np.median(lv[-20:]))
        step = float(np.abs(np.diff(m[i - 480:i + 480])).max())
        out[f'{t:.3f}'] = {'lowest_5ms_dbfs': round(float(lv[30:50].min()), 1), 'quieter_side_dbfs': round(float(side), 1),
                           'dip_below_quieter_side_db': round(float(side - lv[30:50].min()), 1), 'largest_step': round(step, 4)}
    return out


def ebur(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    tail = r[r.rfind('Summary'):]
    g = lambda k: float(tail.split(k)[1].split()[0])
    return {'integrated_lufs': g('I:'), 'lra_lu': g('LRA:'), 'true_peak_dbtp': g('Peak:')}


def build(version, F):
    stems = {k: Z() for k in ('dialogue', 'choir', 'bell', 'fx_above', 'air_above', 'foley_below', 'air_below', 'rock', 'ground')}
    info = {'version': version}
    ir = above(F, stems, info)
    bell(stems, ir, info)
    choir(stems, ir, version == 'A', info)
    below(F, stems, info)
    mix, gr = master(stems)
    return stems, mix, gr, info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', choices=('A', 'B'))
    ap.add_argument('--picture', default=P('out/review/I_bell_v8.mp4'))
    a = ap.parse_args()
    os.makedirs(P('out/edits/stems_v9'), exist_ok=True); os.makedirs(P('out/review'), exist_ok=True)
    report = {}
    for version in ([a.only] if a.only else ['A', 'B']):
        F = Foundry()
        stems, mix, gr, info = build(version, F)
        wav = P(f'out/edits/I_bell_v9_{version}.wav')
        sf.write(wav, mix, SR, subtype='PCM_24')
        if version == 'A' or a.only:
            for k, v in stems.items():
                sf.write(P('out/edits/stems_v9', k + '.wav'), v, SR, subtype='PCM_24')
        out = P(f'out/review/I_bell_v9_{version}.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.picture, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                        '-t', f'{END:.4f}', '-movflags', '+faststart', out], check=True)
        g = np.asarray(gr)
        info.update(ebur(wav))
        info['sample_peak_dbfs'] = round(float(db(np.abs(mix).max())), 2)
        info['limiter_max_gr_db'] = round(float(-db(g.min())), 2) if g.size else 0.0
        info['limiter_at_s'] = [round(float(np.flatnonzero(g < lin(-0.1))[0] / SR), 3), round(float(np.flatnonzero(g < lin(-0.1))[-1] / SR), 3)] if (g < lin(-0.1)).any() else None
        info['events_lufs_loudest_400ms'] = events(mix)
        info['joins_5ms'] = joins(mix)
        info['foundry'] = {'used': sorted(set(F.used)), 'missing': sorted(set(F.missing)), 'did_not_pass_its_check': sorted(set(F.failed))}
        json.dump(info, open(P(f'out/edits/I_bell_v9_{version}.json'), 'w'), indent=1)
        report[version] = info
        print(f"== v9 {version}: {info['integrated_lufs']} LUFS, LRA {info['lra_lu']}, true peak {info['true_peak_dbtp']} dBTP, limiter {info['limiter_max_gr_db']} dB at {info['limiter_at_s']}")
        for k, v in info['events_lufs_loudest_400ms'].items():
            print(f'   {k:32s} {v:6.1f}')
        for k, v in info['joins_5ms'].items():
            print(f'   join {k}: dip {v["dip_below_quieter_side_db"]:5.1f} dB below the quieter side, largest step {v["largest_step"]}')
        print('   foundry:', info['foundry'])
        print('   notes:', info.get('valley_notes'))
    return report


if __name__ == '__main__':
    main()
