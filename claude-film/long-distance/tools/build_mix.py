# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile", "pyloudnorm"]
# ///
"""Build Long Distance's soundtrack from its own cue sheet (tools/cuesheet.js), then mix it with opus-sound-layer.

  node tools/cuesheet.js out/cuesheet.json
  uv run tools/build_mix.py [--mix [--mux]]

The idea (design/DECISIONS.md): grain and gloss. Everything the phone makes (its voice, send, receive, the taps on
glass, lock, wake, the buzz's tone) is clean, synthetic and dry: no room is ever put on it. Everything real (the
rooms, the knock, doors, steps, cloth, cutlery, the bus, his voice, her voice when she is really there) has a room.

1. The world (out/mix/bed.flac): every bed the sequences declare, looped to its span with its fades and relative level
   (audio/sound_map.json); a faint air floor; the story beats played at a designed level ("peak_db": the knocks);
   the world's own envelopes ("world": the room going quiet as he holds his breath and dropping out when the screen
   goes dark), its silences (the black and the title) and ducks (after the last line); then the score, if
   audio/score_plan.json ever has cues (the hook: it has none, the film has no score yet).
2. The voices (out/mix/voice/): each take treated by its "as" (voice_map.json):
     phone  the app's voice: close, dry and too clean. No room. A little proximity and presence, a little air, gently
            compressed, every line the same loudness (perfectly even).
     door   the real woman in the flat: the flat's room around her (RT 0.45 s), a touch of distance, her own dynamics.
     room   him in the flat: the same room, a little drier.
     bed    him in bed at night, close: the bedroom's short, soft room, barely there.
   Voiced sounds that are not lines (her laugh on the phone) are cues mapped to "voice" and placed here too.
3. The effects (audio/cues.json): every other cue, its recording given its sequence's room (real) or none (gloss)
   in out/mix/fx/, for opus-sound-layer's mix.py, which places each sound's peak (or start) on its cue, solves its
   level against the bed in its own band, ducks the bed under the voice and masters to -18 LUFS with a -2 dBTP limiter.
   The sheet turns mix.py's shared room off (the gloss must stay dry; the real sounds carry their own) and keeps the bed
   at the level it was built to (music_lufs; see tools/layer_mix.py).
With --mix: tools/layer_mix.py into out/audio (mix.flac, stems/*.flac, mix-report.json), then the master's sample
peaks are held at -3 dBFS (the AAC encode overshoots sharp transients). With --mux: the 720p review copy, the picture's three segments (out/export_tmp/segs.txt)
scaled straight into out/long_distance_mixed_720p.mp4 (no full-resolution copy is ever written).
"""
import hashlib, json, os, subprocess, sys
import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d, uniform_filter1d
import soundfile as sf
import pyloudnorm as pyln

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OTM = os.path.normpath(os.path.join(ROOT, '..', 'one-too-many', 'audio', 'sfx'))
OUT = os.path.join(ROOT, 'out', 'mix'); AUD = os.path.join(ROOT, 'out', 'audio')
CUES = os.path.join(ROOT, 'audio', 'cues.json')
REVIEW = os.path.join(ROOT, 'out', 'long_distance_mixed_720p.mp4')
meter = pyln.Meter(SR)
undb = lambda d: 10 ** (d / 20)


def resolve(k):
    kind, name = k.split('/', 1)
    if kind == 'gen':                                       # the committed kit (FLAC); audio/gen is the generation scratch
        p = os.path.join(ROOT, 'audio', 'kit', name + '.flac')
        return p if os.path.exists(p) else os.path.join(ROOT, 'audio', 'gen', name + '.wav')
    if kind == 'otm': return os.path.join(OTM, name + '.flac')
    if kind == 'synth': return os.path.join(ROOT, 'audio', 'synth', name + '.wav')
    if kind == 'vo': return os.path.join(ROOT, 'audio', 'vo', name + '.wav')
    if kind == 'score':
        for ext in ('.wav', '.flac', '.mp3'):
            p = os.path.join(ROOT, 'audio', 'score', name + ext)
            if os.path.exists(p): return p
        return os.path.join(ROOT, 'audio', 'score', name + '.wav')
    raise SystemExit('unknown sound ' + k)


def load(path, ch=2, af=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', path, '-ac', str(ch), '-ar', str(SR)] + (['-af', af] if af else []) + ['-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, ch).copy()


def lufs(x):
    x = np.atleast_2d(np.asarray(x).T).T
    if len(x) < int(0.45 * SR):
        r = np.sqrt(np.mean(x ** 2)) + 1e-12; return 20 * np.log10(r) - 0.7
    v = meter.integrated_loudness(x); return float(v) if np.isfinite(v) else -70.0


def sos(x, kind, f, order=4): return signal.sosfilt(signal.butter(order, f, kind, fs=SR, output='sos'), x, axis=0)


def biquad(x, kind, f, gain_db=0.0, q=0.707):
    """RBJ cookbook peaking / shelving filters."""
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f / SR; al = np.sin(w) / (2 * q); c = np.cos(w)
    if kind == 'peak':
        b = [1 + al * A, -2 * c, 1 - al * A]; a = [1 + al / A, -2 * c, 1 - al / A]
    elif kind in ('low', 'high'):
        s = 2 * np.sqrt(A) * al; sg = 1 if kind == 'low' else -1
        b = [A * ((A + 1) - sg * (A - 1) * c + s), sg * 2 * A * ((A - 1) - sg * (A + 1) * c), A * ((A + 1) - sg * (A - 1) * c - s)]
        a = [(A + 1) + sg * (A - 1) * c + s, -sg * 2 * ((A - 1) + sg * (A + 1) * c), (A + 1) + sg * (A - 1) * c - s]
    else: raise ValueError(kind)
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


def apply_filter(x, spec):
    """'lp:4500', 'hp:120', 'lp:2000|hp:80' (several, in order)."""
    for part in (spec or '').split('|'):
        if part.startswith('lp:'): x = sos(x, 'lowpass', float(part[3:]))
        elif part.startswith('hp:'): x = sos(x, 'highpass', float(part[3:]))
    return x


# ---------------- rooms ----------------
_IR = {}


def room_ir(name, R):
    """A small synthetic room, deterministic: a few early reflections, then a dense decaying tail whose highs die
    faster than its lows (three bands, each with its own RT). Unit energy, mono."""
    if name in _IR: return _IR[name]
    r = R[name]; rt = r['rt']; rng = np.random.default_rng(int(hashlib.md5(name.encode()).hexdigest()[:6], 16))
    n = int((rt * 1.3 + 0.05) * SR); t = np.arange(n) / SR
    tail = np.zeros(n)
    for lo, hi, k in ((60, 500, 1.15), (500, 3000, 1.0), (3000, min(r.get('top', 9000), 20000), 0.6)):
        w = rng.standard_normal(n) * np.exp(-6.91 * t / (rt * k))
        tail += sos(w, 'bandpass', [lo, hi], 2)
    pre = int(r.get('predelay', 0.008) * SR); tail[:pre] = 0
    ir = tail * np.minimum(1, t / 0.02) * 0.6
    for dt, g in ((0.007, 0.55), (0.011, 0.42), (0.017, 0.33), (0.023, 0.27), (0.031, 0.2), (0.043, 0.15)):
        i = int(dt * r.get('size', 1.0) * SR)
        if i < n: ir[i] += g * rng.choice([-1, 1])
    ir /= np.sqrt(np.sum(ir ** 2)); _IR[name] = ir; return ir


def in_room(x, name, wet_db, R):
    """x (mono) with its room: dry + the room's tail at wet_db (energy-normalised IR), length grows by the tail."""
    ir = room_ir(name, R); y = np.concatenate([x, np.zeros(len(ir))])
    wet = signal.fftconvolve(x, ir)[: len(y)]
    return y + wet * undb(wet_db)


# ---------------- voices ----------------
def compress(x, thr_db, ratio, att=0.005, rel=0.08):
    """A gentle feed-forward compressor (10 ms RMS detector, one-pole attack/release)."""
    n = int(0.01 * SR); e = np.sqrt(np.convolve(x * x, np.ones(n) / n, mode='same')) + 1e-9
    lv = 20 * np.log10(e); over = np.maximum(0, lv - thr_db); gr = -over * (1 - 1 / ratio)
    aa, ar = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)); g = np.empty_like(gr); s = 0.0
    for i, v in enumerate(gr):
        a = aa if v < s else ar; s = a * s + (1 - a) * v; g[i] = s
    return x * undb(g)


def treat(x, how, V, R, space=None):
    """One take (mono, 48 kHz) through its treatment (sound_map.json "voices")."""
    v = V[how]
    if v.get('hp'): x = sos(x, 'highpass', v['hp'], 2)
    if v.get('lp'): x = sos(x, 'lowpass', v['lp'], 2)
    for kind, f, g, *q in v.get('eq', []): x = biquad(x, kind, f, g, q[0] if q else 0.707)
    if v.get('compress'):
        c = v['compress']; pk = 20 * np.log10(np.max(np.abs(x)) + 1e-12); x = compress(x, pk + c['thr_below_peak'], c['ratio'])
    if v.get('room'): x = in_room(x, space or v['room'], v['wet_db'], R)
    return x


def sheet_seed(s): return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)


def loop_to(x, n, offset, xf=int(0.6 * SR)):
    """n samples of x looped with equal-power crossfades, starting at offset."""
    if len(x) <= 2 * xf: x = np.concatenate([x] * (2 * xf // max(1, len(x)) + 2))
    body = len(x) - xf; out = np.zeros((n + len(x), x.shape[1])); pos = -(offset % body)
    fin = np.sqrt(np.linspace(0, 1, xf))[:, None]; fout = np.sqrt(np.linspace(1, 0, xf))[:, None]
    while pos < n:
        seg = x.copy(); seg[:xf] *= fin; seg[-xf:] *= fout
        a = max(0, pos); s0 = a - pos; e = min(len(out), pos + len(seg))
        out[a:e] += seg[s0:s0 + (e - a)]; pos += body
    return out[:n]


def env(n, fi, fo):
    e = np.ones(n); fi = min(int(fi * SR), n // 2); fo = min(int(fo * SR), n // 2)
    if fi: e[:fi] = np.linspace(0, 1, fi)
    if fo: e[-fo:] *= np.linspace(1, 0, fo)
    return e[:, None]


def peak_index(x):
    n = max(1, int(0.002 * SR)); m = x if x.ndim == 1 else x.mean(axis=1)
    return int(np.argmax(np.sqrt(np.convolve(m * m, np.ones(n) / n, mode='same'))))


def pick(M, kind, name, seq, k):
    """The map entry for a bed or cue name in a sequence: name@Qnn overrides; a list picks by order of occurrence; a
    "cycle" rotates through its files. 'missing' if unmapped, None if silent on purpose."""
    key = name + '@' + seq if (name + '@' + seq) in M[kind] else name
    e = M[kind].get(key, 'missing')
    if isinstance(e, list): e = e[min(k, len(e) - 1)]
    if isinstance(e, dict) and 'cycle' in e: e = dict(e, file=e['cycle'][k % len(e['cycle'])])
    return e


def hold_peaks(path, limit_db=-3.0):
    """Hold the master's sample peaks at limit_db, in place (look-ahead, offline: no latency)."""
    x, sr = sf.read(path, dtype='float64'); lim = undb(limit_db)
    need = np.minimum(1.0, lim / (np.max(np.abs(x), axis=1) + 1e-12))
    g = minimum_filter1d(need, size=int(0.004 * sr)); g = uniform_filter1d(g, size=int(0.002 * sr))
    g = np.minimum(g, need)                                                  # never over the limit, even mid-ramp
    sf.write(path, (x * g[:, None]).astype(np.float32), sr, subtype='PCM_24', format='FLAC')
    return float(20 * np.log10(np.max(np.abs(x * g[:, None])) + 1e-12)), int(np.sum(g < 0.999))


def main():
    cs = json.load(open(os.path.join(ROOT, 'out', 'cuesheet.json')))
    M = json.load(open(os.path.join(ROOT, 'audio', 'sound_map.json')))
    R, V, SP = M['rooms'], M['voices'], M['spaces']
    vmap = json.load(open(os.path.join(ROOT, 'audio', 'vo', 'voice_map.json')))
    pf = os.path.join(ROOT, 'audio', 'score_plan.json'); plan = json.load(open(pf)) if os.path.exists(pf) else {'cues': []}
    T = cs['total']; N = int(np.ceil(T * SR)); seqs = {s['id']: s for s in cs['seqs']}
    for d in ('voice', 'fx'): os.makedirs(os.path.join(OUT, d), exist_ok=True)
    missing = set()

    # ---------------- the world: beds ----------------
    world = np.zeros((N, 2)); cache = {}
    med = {}
    for b in cs['beds']:
        if b.get('p', {}).get('level') is not None: med.setdefault(b['name'], []).append(b['p']['level'])
    med = {k: float(np.median(v)) for k, v in med.items()}
    for b in cs['beds']:
        e = pick(M, 'beds', b['name'], b['seq'], 0)
        if e == 'missing': missing.add('bed ' + b['name']); continue
        if e is None: continue
        n = int(round((b['t1g'] - b['t0g']) * SR))
        if n <= 0: continue
        ck = (e['file'], e.get('filter'), e['lufs'])
        if ck not in cache:
            p = resolve(e['file'])
            if not os.path.exists(p): missing.add('file ' + p); continue
            x = apply_filter(load(p, 2), e.get('filter')); cache[ck] = x * undb(e['lufs'] - lufs(x))
        src = cache[ck]
        off = int(e['offset'] * SR) if e.get('offset') is not None else sheet_seed(b['name'] + b['seq'] + str(b['t0'])) % max(1, len(src))
        seg = loop_to(src, n, off)
        p = b.get('p', {}); rel = float(np.clip(p['level'] - med[b['name']], -12, 12)) if p.get('level') is not None and b['name'] in med else 0.0
        sq = seqs[b['seq']]
        fi = p.get('fi') if p.get('fi') is not None else (1.5 if b['t0g'] <= 0.01 else 0.04 if b['t0'] <= 0.01 else 0.8)
        fo = p.get('fo') if p.get('fo') is not None else (0.04 if abs(b['t1'] - sq['dur']) < 0.01 else 0.8)
        s = int(round(b['t0g'] * SR)); seg = seg * env(len(seg), fi, fo) * undb(rel + e.get('gain_db', 0))
        e2 = min(N, s + len(seg)); world[s:e2] += seg[: e2 - s]
    # a faint air floor under the whole world, so no moment goes digitally dead (the world's own silences take it too)
    rng = np.random.default_rng(5); fl = sos(rng.standard_normal((N, 2)), 'lowpass', 900); fl = sos(fl, 'highpass', 60)
    fl *= undb(M.get('air_floor_lufs', -60) - lufs(fl[: 60 * SR])); fl[: int(1.5 * SR)] *= np.linspace(0, 1, int(1.5 * SR))[:, None]
    world += fl

    # ---------------- cues: designed-level beats into the world, envelopes, voiced cues, effects ----------------
    occ = {}; fxcues = []; designed = []; envs = []; voice_cues = []; quiet_ok = []
    sil = [(x['t0g'], x['t1g']) for x in cs['silences']]
    fxcache = {}

    def prepared(e, seq):
        """The cue's sound, mono, with its room if it is real (not synth/, not "dry") and its filter: out/mix/fx/."""
        space = None if (e['file'].startswith('synth/') or e.get('dry')) else e.get('space', SP.get(seq))
        key = (e['file'], space, e.get('filter'), e.get('wet_db'))
        if key in fxcache: return fxcache[key]
        p = resolve(e['file'])
        if not os.path.exists(p): missing.add('file ' + p); return None
        x = apply_filter(load(p, 1)[:, 0], e.get('filter'))
        if space: x = in_room(x, space, e.get('wet_db', R[space]['wet_db']), R)
        x = x / (np.max(np.abs(x)) + 1e-12) * undb(-3)
        h = hashlib.md5(json.dumps(key).encode()).hexdigest()[:8]
        out = os.path.join(OUT, 'fx', f"{os.path.basename(e['file'])}_{space or 'dry'}_{h}.wav")
        sf.write(out, x.astype(np.float32), SR, subtype='PCM_24'); fxcache[key] = (out, x); return fxcache[key]

    for c in cs['cues']:
        if c['name'] == 'voice': continue
        k = occ[(c['seq'], c['name'])] = occ.get((c['seq'], c['name']), -1) + 1
        e = pick(M, 'cues', c['name'], c['seq'], k)
        if e == 'missing': missing.add('cue ' + c['name']); continue
        if e is None: continue
        if any(a - 0.02 <= c['tg'] < b2 for a, b2 in sil): continue                     # the world is silent
        cid = f"{c['seq']}.{c['name']}.{k}"
        if 'world' in e:                                                                # an envelope on the world, no sound
            envs.append((c['tg'], e['world']))
            if e.get('silence_ok'):
                pts = [c['tg'] + dt for dt, d in e['world'] if d <= -20]
                if pts: quiet_ok.append([round(min(pts) - 0.3, 2), round(max(pts) + 0.3, 2)])
            continue
        if 'voice' in e:                                                                # a voiced sound that is not a line
            voice_cues.append({'id': cid, 'file': resolve(e['voice']), 'as': e['as'], 'gain_db': e.get('gain_db', 0), 't': c['tg'],
                               'align': e.get('align', 'start'), 'seq': c['seq']})
            continue
        pr = prepared(e, c['seq'])
        if pr is None: continue
        path, x = pr
        if 'peak_db' in e:                                                              # a story beat at a designed level
            g = undb(e['peak_db'] + e.get('step_db', 0) * k) / (np.max(np.abs(x)) + 1e-12)
            al = e.get('align', 'peak'); pk = peak_index(x)
            s = int(round(c['tg'] * SR)) - (pk if al == 'peak' else len(x) if al == 'end' else 0)
            a0, a1 = max(0, s), min(N, s + len(x)); world[a0:a1] += (x[a0 - s:a1 - s] * g)[:, None]
            designed.append({'id': cid, 't': round(c['tg'], 3), 'sound': os.path.relpath(path, ROOT), 'peak_db': e['peak_db'] + e.get('step_db', 0) * k})
            continue
        cue = {'id': cid, 't': round(c['tg'], 3), 'sound': path, 'weight': e.get('weight', 'support'), 'align': e.get('align', 'peak')}
        pan = e.get('pan', c.get('p', {}).get('pan'))
        if pan is not None: cue['pan'] = float(np.clip(pan, -0.6, 0.6))
        fxcues.append(cue)

    # the world's control: silences (the black and the title), ducks (after the last line), envelopes
    rate = 1000; nc = int(T * rate) + 2; ctrl = np.ones(nc); tt = np.arange(nc) / rate
    for a, b2 in sil:
        i0, i1 = int(a * rate), int(b2 * rate); r0 = int(0.04 * rate); r1 = int(0.3 * rate)
        ctrl[max(0, i0 - r0):i0] = np.minimum(ctrl[max(0, i0 - r0):i0], np.linspace(1, 0, i0 - max(0, i0 - r0)))
        ctrl[i0:i1] = 0; e2 = min(nc, i1 + r1); ctrl[i1:e2] = np.minimum(ctrl[i1:e2], np.linspace(0, 1, e2 - i1))
    for d in cs['ducks']:
        i0, i1 = int(d['t0g'] * rate), int(d['t1g'] * rate); lv = float(d['level']); r = int(0.3 * rate)
        c0 = np.interp(tt, [d['t0g'] - 1e-3, d['t0g'], d['t0g'] + 0.3, d['t1g'], d['t1g'] + 0.3, d['t1g'] + 0.301], [1, 1, lv, lv, 1, 1])
        ctrl = np.minimum(ctrl, c0)
    for t0, pts in envs:
        xs = [t0 + dt for dt, _ in pts]; gs = [undb(db) for _, db in pts]
        m = (tt >= xs[0]) & (tt <= xs[-1]); ce = np.ones(nc); ce[m] = np.interp(tt[m], xs, gs); ctrl = np.minimum(ctrl, ce)
    world *= np.interp(np.arange(N) / SR, tt, ctrl)[:, None]

    # ---------------- the score (the hook: audio/score_plan.json; Long Distance has none yet) ----------------
    score = np.zeros((N, 2)); placed = []
    for c in plan.get('cues', []):
        f = resolve('score/' + c['id'])
        if not os.path.exists(f): missing.add('score ' + c['id']); continue
        cents = c.get('tune_cents', 0.0) or 0.0
        x = load(f, 2, f'asetrate={SR}*{2 ** (-cents / 1200):.6f},aresample={SR}') if cents else load(f, 2)
        x *= undb(-23 - lufs(x)); need = int((c['end_s'] - c['start_s']) * SR)
        st = int(c.get('from_s', 0) * SR); seg = x[st:st + need]; have = len(seg)
        seg = seg * env(have, c.get('fade_in_s', 1.2), c.get('fade_out_s', 2.5)) * undb(c.get('level_db', -15) + 9)
        s = int(c['start_s'] * SR); e2 = min(N, s + have); score[s:e2] += seg[: e2 - s]
        placed.append((c['id'], c['start_s'], c['end_s']))
    bed = world + score
    bed_lufs = lufs(bed)
    sf.write(os.path.join(OUT, 'bed.flac'), np.clip(bed, -1, 1).astype(np.float32), SR, subtype='PCM_24', format='FLAC')

    # ---------------- the voices ----------------
    takes = []
    for c in cs['cues']:
        if c['name'] != 'voice': continue
        p = c.get('p', {}); lid = p.get('id'); vm = vmap.get(lid)
        if not vm: missing.add('take ' + str(lid)); continue
        how = p.get('as') or vm['as']
        takes.append({'id': lid, 'file': os.path.join(ROOT, vm['file']), 'as': how, 't': c['tg'], 'seq': c['seq'], 'gain_db': 0, 'align': 'start'})
    takes += voice_cues
    for v in takes:
        x = load(v['file'], 1)[:, 0]; v['raw'] = lufs(x)
    # each treatment's lines are levelled together: the phone's every line to the same loudness (too even); the real
    # voices by their median, so each keeps its own performance (quieter where it was played quieter, within 4 dB)
    for how, spec in V.items():
        grp = [v for v in takes if v['as'] == how and not v['id'].startswith('Q')]
        if not grp: continue
        m = float(np.median([v['raw'] for v in grp]))
        for v in [v for v in takes if v['as'] == how]:
            off = 0.0 if spec.get('even') else float(np.clip(v['raw'] - m, -4, 4))
            if v['id'].startswith('Q'): off = 0.0                                       # voiced cues use their own gain_db
            v['gain'] = spec['lufs'] + off - v['raw'] + v['gain_db']
    voices = []
    for v in takes:
        x = load(v['file'], 1)[:, 0] * undb(v['gain'])
        space = None
        if V[v['as']].get('room'): space = V[v['as']].get('room_by_seq', {}).get(v['seq'], V[v['as']]['room'])
        y = treat(x, v['as'], V, R, space)
        out = os.path.join(OUT, 'voice', f"{v['id']}.wav"); sf.write(out, y.astype(np.float32), SR, subtype='PCM_24')
        st = v['t'] - (peak_index(y) / SR if v['align'] == 'peak' else 0)
        voices.append({'file': out, 'start_s': round(st, 3)})

    silence_ok = [[round(a, 2), round(b2, 2)] for a, b2 in sil] + quiet_ok
    sheet = {'fps': 24, 'duration_s': round(T, 3), 'energy': 'calm', 'lufs': -18, 'kit': os.path.join(ROOT, 'audio', 'kit'),
             'room': False, 'music': {'file': os.path.join(OUT, 'bed.flac'), 'start_s': 0, 'loop': False, 'fade_out_s': 0.05},
             'music_lufs': round(bed_lufs, 3), 'voice': voices, 'duck_db': M.get('duck_db', 9), 'silence_ok': silence_ok,
             'designed': designed, 'cues': fxcues}
    json.dump(sheet, open(CUES, 'w'), indent=1)
    print(f"world: {len(cs['beds'])} beds, {len(designed)} designed beats, {len(envs)} envelopes, {len(placed)} score cues "
          f"-> out/mix/bed.flac ({bed_lufs:.1f} LUFS, kept as built: music_lufs)")
    print(f"voices: {len(voices)} ({len(voice_cues)} voiced cues); effects: {len(fxcues)} -> audio/cues.json; silence_ok {silence_ok}")
    if missing: print('MISSING:', ', '.join(sorted(missing)))
    if '--mix' in sys.argv:
        r = subprocess.run(['uv', 'run', os.path.join(HERE, 'layer_mix.py'), CUES, '--out', AUD], cwd=ROOT)
        if r.returncode: sys.exit(r.returncode)
        pk, n = hold_peaks(os.path.join(AUD, 'mix.flac'))
        print(f'peak hold: master sample peak {pk:.2f} dBFS ({n} samples held)')
    if '--mux' in sys.argv:
        segs = os.path.join(ROOT, 'out', 'export_tmp', 'segs.txt')
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', segs, '-i', os.path.join(AUD, 'mix.flac'),
                        '-map', '0:v', '-map', '1:a', '-vf', 'scale=1280:720', '-c:v', 'libx264', '-crf', '23', '-preset', 'medium',
                        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-shortest', '-movflags', '+faststart', REVIEW], check=True)
        print('wrote ' + os.path.relpath(REVIEW, ROOT))


if __name__ == '__main__':
    main()
