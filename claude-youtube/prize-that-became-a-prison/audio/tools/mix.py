# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""Render the film's whole mix from the sound plan (audio/cues.json) and the edit (design/edit/EDL.json).

    uv run audio/tools/mix.py                                   # the scratch read -> out/audio/mix_v2.wav
    uv run audio/tools/mix.py --voice audio/vo/final --stems    # another read (a folder with lines.json + <ch>_<nn>.wav)
    uv run audio/tools/mix.py --score out/audio/score_bed.wav --score-gain -2

Also runs with any Python that has numpy, scipy and soundfile. Output: 48 kHz, 24-bit, stereo, exactly the EDL's
length (its total frames at its fps), mastered to -14 LUFS integrated with true peak at or under -1 dBTP (YouTube).
A JSON report (placements, warnings, measurements) is written next to it.

What goes in, in order:

- **Narration.** One mono line per voice segment of the EDL (`voice[]` with speech), centred, at its EDL start. The
  read comes from `--voice` (`scratch`: audio/vo/scratch/lines.json and its <chapter>_<nn>.wav). Lines are placed in
  order and never overlap: a line waits for the one before it to end plus 0.2 s (a final read can run longer than the
  scratch the edit was timed on). Each line is levelled toward the read's median (at most 3 dB), high-passed at 70 Hz,
  its true peaks held to 12.5 dB over its loudness by a fast (5 ms) limiter (the scratch read peaks up to 22 dB over it),
  and the voice stem is set to -14 LUFS integrated: the reference every other level in the sheet is measured against.
- **Every cue, bed edge and silence edge is placed by its EDL anchor** (audio/tools/edl_anchor.py), resolved against
  the voice as actually placed, so word anchors follow a longer read. With the scratch read the times equal the sheet's.
- **Beds and room tones** (`beds[]`): each loop-ready file looped from an offset seeded by the span's id (stable across
  re-cuts), set so its integrated loudness is `level_re_voice_db` under the voice, with equal-power fades centred on
  its edges (a fade of 0 is a hard edge). `kind: clock` spans are built from the clock file's own one-second cells, so
  the ticks fall exactly on the span's phase and the clock can stop between ticks.
- **Effects** (`cues[]`, not muted): each set so its loudest 150 ms (K-weighted) is `level_re_voice_db` under the
  voice (plus a cue's `gain_db`), after its rate change and filters, and placed by its `align`: `sync` (the sfx-kit's
  rule: start = moment - sync_at / rate), `start` or `peak`; `center_in_s` centres it in a stroke. One shared room
  (0.6 s, -18 dB) unless the cue names its own. Two cues within 150 ms are reported (except one gesture's events).
- **The score:** out/audio/score_bed.wav if it exists (or `--score`), else none; it is printed which.
- **Silences** (`silences[]`): what each names in `out` drops to nothing over 20 ms at its start and comes back at its
  end (the score rises back over 1 s, so it never cuts in; beds over 0.3 s). The air floor and the voice are never cut.
  `--score-mask none` leaves the score as the score session made it (its energy inside the silences is reported).
- **Ducking:** the score (8 dB) and the beds (3 dB) are side-chained under the voice: lines closer than 0.8 s are one
  duck, 0.25 s look-ahead, 0.8 s release.
- **Air floor:** filtered noise (HP 60 Hz, LP 900 Hz) at -60 LUFS under the whole film, so nothing is digitally dead.
- **Master:** gain to -14 LUFS integrated, a true-peak limiter (4x oversampled, 20 ms look-ahead window) at -1.3 dBTP,
  measured again; `--stems` writes voice, music and effects (beds, effects and air) separately, with the master's gain
  and without its limiter.
"""
import argparse, json, os, sys, zlib, time
import numpy as np, soundfile as sf
from scipy import signal, ndimage

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.dirname(HERE)
ROOT = os.path.dirname(AUDIO)
sys.path.insert(0, HERE)
from edl_anchor import EDL  # noqa: E402

VOICE_REF = -14.0
VOICE_CREST_DB = 12.5          # the voice's true peaks are held to 12.5 dB over its loudness (a fast 5 ms limiter)
F32 = np.float32


def db(x):
    return 10 ** (x / 20)


# ------------------------------------------------------------------ loudness (ITU-R BS.1770-4 / EBU R128), 48 kHz
_K = [signal.tf2sos([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]),
      signal.tf2sos([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])]


def kweight(x):
    y = np.asarray(x, np.float64)
    for s in _K:
        y = signal.sosfilt(s, y, axis=0)
    return y


def _energies(x, hop):
    """Mean square of the K-weighted signal, summed over channels, per hop (seconds)."""
    y = kweight(x if x.ndim == 2 else x[:, None])
    e = (y ** 2).sum(axis=1)
    h = int(round(hop * SR))
    n = len(e) // h
    return e[:n * h].reshape(n, h).mean(axis=1) if n else np.array([e.mean() if len(e) else 0.0])


def integrated(x):
    q = _energies(x, 0.1)
    if len(q) < 4:
        blk = np.array([q.mean()])
    else:
        c = np.r_[0, np.cumsum(q)]
        blk = (c[4:] - c[:-4]) / 4                          # 400 ms blocks, 75 % overlap
    lk = -0.691 + 10 * np.log10(blk + 1e-20)
    g = blk[lk > -70]
    if not len(g):
        return -np.inf
    rel = -0.691 + 10 * np.log10(g.mean()) - 10
    g2 = blk[(lk > -70) & (lk > rel)]
    return float(-0.691 + 10 * np.log10(g2.mean())) if len(g2) else -np.inf


def short_terms(x):
    q = _energies(x, 0.1)
    c = np.r_[0, np.cumsum(q)]
    st = (c[30:] - c[:-30]) / 30 if len(q) >= 30 else np.array([q.mean()])
    return -0.691 + 10 * np.log10(st + 1e-20)


def lra(x):
    s = short_terms(x)
    s = s[s > -70]
    if not len(s):
        return 0.0
    e = 10 ** ((s + 0.691) / 10)
    rel = -0.691 + 10 * np.log10(e.mean()) - 20
    s = s[s > rel]
    return float(np.percentile(s, 95) - np.percentile(s, 10))


def loudest(x, win=0.15):
    """The loudest `win` seconds, K-weighted, in LUFS (the sfx-kit's own scale is its loudest 150 ms)."""
    y = kweight(x if x.ndim == 2 else x[:, None])
    e = (y ** 2).sum(axis=1)
    w = max(1, int(win * SR))
    if len(e) < w:
        e = np.r_[e, np.zeros(w - len(e))]
    c = np.r_[0, np.cumsum(e)]
    m = ((c[w:] - c[:-w]) / w).max()
    return float(-0.691 + 10 * np.log10(m + 1e-20))


def true_peak(x, chunk=10 * SR):
    x = x if x.ndim == 2 else x[:, None]
    pk = 0.0
    for i in range(0, len(x), chunk):
        a, b = max(0, i - 64), min(len(x), i + chunk + 64)
        y = signal.resample_poly(np.asarray(x[a:b], np.float64), 4, 1, axis=0)
        pk = max(pk, float(np.abs(y).max()) if len(y) else 0.0)
    return 20 * np.log10(pk + 1e-20)


# ------------------------------------------------------------------ sound files
_cache = {}


def load(path):
    p = path if os.path.isabs(path) else os.path.join(ROOT, path)
    if p not in _cache:
        x, sr = sf.read(p, always_2d=True, dtype='float64')
        if sr != SR:
            g = np.gcd(SR, sr)
            x = signal.resample_poly(x, SR // g, sr // g, axis=0)
        _cache[p] = x
    return _cache[p]


def stereo(x):
    return np.repeat(x, 2, axis=1) if x.shape[1] == 1 else x[:, :2]


def rate_change(x, rate):
    if abs(rate - 1.0) < 1e-6:
        return x
    up, down = int(round(1000)), int(round(1000 * rate))
    g = np.gcd(up, down)
    return signal.resample_poly(x, up // g, down // g, axis=0)


def filt(x, lp=None, hp=None):
    if hp:
        x = signal.sosfilt(signal.butter(2, hp, 'high', fs=SR, output='sos'), x, axis=0)
    if lp:
        x = signal.sosfilt(signal.butter(4, lp, 'low', fs=SR, output='sos'), x, axis=0)
    return x


def room_ir(decay_s=0.6, seed=7):
    n = int(decay_s * SR)
    r = np.random.default_rng(seed)
    ir = r.standard_normal((n, 2)) * np.exp(-6.9 * np.arange(n) / n)[:, None]
    ir = filt(ir, lp=3500, hp=150)
    return ir / np.sqrt((ir ** 2).sum(axis=0, keepdims=True))


def with_room(x, room):
    decay, wet = room.get('decay_s', 0.6), room.get('wet_db', -18)
    ir = room_ir(decay)
    y = np.r_[x, np.zeros((len(ir), 2))]
    w = np.stack([signal.fftconvolve(y[:, c], ir[:, c])[:len(y)] for c in range(2)], axis=1)
    return y + w * db(wet)


def ramp(n, up=True):
    t = np.linspace(0, np.pi / 2, max(n, 1))
    r = np.sin(t) if up else np.cos(t)
    return r


# ------------------------------------------------------------------ silences
CLASSES = ('score', 'effects', 'room', 'drone', 'clock', 'phone')


def out_classes(out):
    o = (out or '').lower()
    if o.strip() in ('', '-'):
        return set()
    if 'everything' in o or o.startswith('all'):
        s = set(CLASSES)
        if 'score tail' in o:
            s.discard('score')
        return s
    s = set()
    if 'score' in o: s.add('score')
    if 'effects' in o: s.add('effects')
    if 'beds' in o: s |= {'room', 'drone', 'clock', 'phone'}
    if 'room' in o: s.add('room')
    if 'drone' in o: s.add('drone')
    if 'clock' in o: s.add('clock')
    if 'phone' in o: s.add('phone')
    return s


def bed_class(sound):
    n = os.path.basename(sound)
    if 'drone' in n: return 'drone'
    if 'clock' in n: return 'clock'
    if 'phone' in n: return 'phone'
    return 'room'


class Masks:
    """Gain 0..1 per class over the film: what each silence names drops out over 20 ms and returns over `back` s."""
    BACK = {'score': 1.0, 'room': 0.3, 'drone': 0.3, 'clock': 0.02, 'phone': 0.05, 'effects': 0.02}

    def __init__(self, silences, n, score_mask='all'):
        self.n, self.spans = n, {c: [] for c in CLASSES}
        for s in silences:
            if s['t1'] - s['t0'] <= 1e-6:
                continue
            for c in out_classes(s['out']):
                if c == 'score' and score_mask == 'none':
                    continue
                if c == 'score' and score_mask == 'hard' and not out_classes(s['out']) >= {'score', 'room'}:
                    continue
                self.spans[c].append((s['t0'], s['t1'], s['id']))

    def gain(self, cls, s0, s1):
        g = np.ones(s1 - s0)
        for t0, t1, _ in self.spans.get(cls, []):
            a, b = int(round(t0 * SR)), int(round(t1 * SR))
            dn, up = int(0.02 * SR), int(self.BACK[cls] * SR)
            if b + up <= s0 or a - dn >= s1:
                continue
            env_idx = np.arange(s0, s1)
            e = np.ones(s1 - s0)
            e[(env_idx >= a) & (env_idx < b)] = 0.0
            m = (env_idx >= a - dn) & (env_idx < a)
            e[m] = np.minimum(e[m], np.cos((env_idx[m] - (a - dn)) / dn * np.pi / 2))
            m = (env_idx >= b) & (env_idx < b + up)
            e[m] = np.minimum(e[m], np.sin((env_idx[m] - b) / up * np.pi / 2))
            g = np.minimum(g, e)
        return g


# ------------------------------------------------------------------ the read
def load_read(spec):
    d = os.path.join(AUDIO, 'vo', 'scratch') if spec in (None, 'scratch') else (spec if os.path.isabs(spec) else os.path.join(ROOT, spec))
    lines = json.load(open(os.path.join(d, 'lines.json')))
    files = {f"{l['chapter']}.{int(l['index']):02d}": os.path.join(d, l['file']) for l in lines}
    return d, files


def place_voice(E, spec, N, warn):
    d, files = load_read(spec)
    segs = [E.voice[i] for i in E.order if E.voice[i].get('speech', 0) > 0]
    raw, L = {}, {}
    for v in segs:
        f = files.get(v['id'])
        if not f or not os.path.exists(f):
            warn.append(f"voice {v['id']}: no file in {d}")
            continue
        x = load(f)
        x = x.mean(axis=1, keepdims=True)
        x = filt(x, hp=70)
        n = min(int(0.003 * SR), len(x) // 2)
        x[:n] *= ramp(n)[:, None]; x[-n:] *= ramp(n, False)[:, None]
        raw[v['id']], L[v['id']] = x, integrated(stereo(x))
    med = float(np.median([l for l in L.values() if np.isfinite(l)]))
    voice = np.zeros(N, F32)
    actual, prev_end = {}, -1.0
    for v in segs:
        if v['id'] not in raw:
            continue
        x = raw[v['id']][:, 0] * db(np.clip(med - L[v['id']], -3, 3))
        start = max(v['start'], prev_end + 0.2) if prev_end > 0 else v['start']
        if start > v['start'] + 1e-6:
            warn.append(f"voice {v['id']}: waits {start - v['start']:.3f} s for the line before it (starts {start:.3f}, EDL {v['start']:.3f})")
        s = int(round(start * SR))
        e = min(N, s + len(x))
        if e - s < len(x):
            warn.append(f"voice {v['id']}: runs past the film's end; cut at {N / SR:.3f} s")
        voice[s:e] += x[:e - s]
        actual[v['id']] = (start, len(x) / SR)
        prev_end = start + len(x) / SR
    gr = 0.0
    for _ in range(3):
        voice *= F32(db(VOICE_REF - integrated(stereo(voice[:, None]))))
        lim, g_ = limit(voice[:, None], VOICE_REF + VOICE_CREST_DB, hold_s=0.005, smooth_s=0.003)
        voice, gr = lim[:, 0].astype(F32), max(gr, g_)
    voice *= F32(db(VOICE_REF - integrated(stereo(voice[:, None]))))
    return voice, actual, {'read': os.path.relpath(d, ROOT), 'lines': len(actual), 'median_line_lufs': round(med, 2), 'peak_limiter_max_gr_db': round(gr, 2), 'true_peak_ceiling_re_voice_db': VOICE_CREST_DB}


# ------------------------------------------------------------------ beds
def clock_signal(b, s0, s1):
    """The clock file's one-second cells, laid so a tick falls on phase_s + k (film seconds) inside [s0, s1)."""
    x = stereo(load(b['sound']))
    c = b['cells']
    first, per, count = c['first_tick_s'], c['period_s'], c['count']
    pre = 0.02
    cells = []
    for k in range(count):
        a = int(round((first + k * per - pre) * SR))
        cells.append(x[a:a + int(per * SR)])
    out = np.zeros((s1 - s0, 2))
    ph = b.get('phase_s', 0.0)
    t = np.ceil((s0 / SR - ph) / per) * per + ph
    k = zlib.crc32(b['id'].encode()) % count
    xf = int(0.005 * SR)
    while t < s1 / SR:
        a = int(round((t - pre) * SR)) - s0
        cell = cells[k % count].copy()
        cell[:xf] *= ramp(xf)[:, None]; cell[-xf:] *= ramp(xf, False)[:, None]
        lo, hi = max(0, a), min(len(out), a + len(cell))
        if hi > lo:
            out[lo:hi] += cell[lo - a:hi - a]
        t += per; k += 1
    return out


def render_beds(sheet, N, masks, E, warn):
    beds = np.zeros((N, 2), F32)
    placed = []
    lcache = {}
    for b in sheet['beds']:
        a = b.get('edl') or {}
        t0 = E.resolve(a['t0']) if a.get('t0') else b['t0']
        t1 = E.resolve(a['t1']) if a.get('t1') else b['t1']
        if t1 <= t0:
            warn.append(f"bed {b['id']}: empty span {t0}-{t1}")
            continue
        fi, fo = float(b.get('fade_in_s', 0.3)), float(b.get('fade_out_s', 0.3))
        s0 = max(0, int(round((t0 - fi / 2) * SR)))
        s1 = min(N, int(round((t1 + fo / 2) * SR)))
        cls = bed_class(b['sound'])
        if b.get('kind') == 'clock':
            y = clock_signal(b, int(round(t0 * SR)), s1)
            y = np.r_[np.zeros((int(round(t0 * SR)) - s0, 2)), y]
            key = ('clock', b['sound'])
            if key not in lcache:
                probe = clock_signal(dict(b, id='probe'), 0, 20 * SR)
                lcache[key] = integrated(probe)
            L = lcache[key]
        else:
            x = stereo(load(b['sound']))
            if b['sound'] not in lcache:
                lcache[b['sound']] = integrated(x)
            L = lcache[b['sound']]
            off = zlib.crc32(b['id'].encode()) % len(x)
            y = x[(off + np.arange(s1 - s0)) % len(x)]
        g = db(VOICE_REF + b['level_re_voice_db'] - L)
        env = np.ones(s1 - s0)
        nfi, nfo = int(fi * SR), int(fo * SR)
        if nfi > 0:
            r = ramp(nfi)
            env[:nfi] = r[:min(nfi, len(env))]
        else:
            n = min(int(0.004 * SR), len(env)); env[:n] = ramp(n)
        if nfo > 0:
            r = ramp(nfo, False)
            env[-nfo:] = np.minimum(env[-nfo:], r[-min(nfo, len(env)):])
        else:
            n = min(int(0.004 * SR), len(env)); env[-n:] = np.minimum(env[-n:], ramp(n, False))
        env *= masks.gain(cls, s0, s1)
        beds[s0:s1] += (y * (g * env)[:, None]).astype(F32)
        placed.append({'id': b['id'], 'sound': os.path.basename(b['sound']), 'class': cls, 't0': round(t0, 3), 't1': round(t1, 3),
                       'level_re_voice_db': b['level_re_voice_db'], 'file_lufs': round(L, 2)})
    return beds, placed


# ------------------------------------------------------------------ effects
def render_effects(sheet, N, masks, E, warn):
    fx = np.zeros((N, 2), F32)
    placed, shared = [], {'decay_s': sheet.get('room', {}).get('decay_s', 0.6), 'wet_db': sheet.get('room', {}).get('wet_db', -18)}
    for c in sheet['cues']:
        if c.get('mute'):
            continue
        t = E.resolve(c['edl']) if c.get('edl') else c['t']
        rate = float(c.get('rate', 1.0))
        x = stereo(load(c['sound']))
        x = rate_change(x, rate)
        x = filt(x, lp=c.get('lp_hz'), hp=c.get('hp_hz'))
        L = loudest(x)
        g = db(VOICE_REF + c['level_re_voice_db'] + c.get('gain_db', 0.0) - L)
        dur = len(x) / SR
        al = c.get('align', 'start')
        if c.get('center_in_s'):
            start = t + (c['center_in_s'] - dur) / 2
        elif al == 'sync':
            start = t - c.get('sync_at', 0.0) / rate
        elif al == 'peak':
            env = np.sqrt(ndimage.uniform_filter1d((x ** 2).sum(axis=1), int(0.005 * SR)))
            start = t - np.argmax(env) / SR
        else:
            start = t
        y = with_room(x, c.get('room') or shared) * g
        s = int(round(start * SR))
        lo, hi = max(0, s), min(N, s + len(y))
        if hi <= lo:
            warn.append(f"cue {c['id']}: outside the film ({start:.3f} s)")
            continue
        seg = y[lo - s:hi - s] * masks.gain('effects', lo, hi)[:, None]
        fx[lo:hi] += seg.astype(F32)
        placed.append({'id': c['id'], 'sound': os.path.basename(c['sound']), 'source': c.get('source', 'audio/sfx (made for this film)'),
                       'moment_s': round(t, 3), 'start_s': round(start, 3), 'end_s': round(start + dur, 3),
                       'level_re_voice_db': c['level_re_voice_db'] + c.get('gain_db', 0.0), 'loudest150_lufs_before': round(L, 2),
                       'group': c.get('group')})
    ps = sorted(placed, key=lambda p: p['moment_s'])
    for a, b in zip(ps, ps[1:]):
        if b['moment_s'] - a['moment_s'] < 0.15 and not (a['group'] and a['group'] == b['group']):
            warn.append(f"cues {a['id']} and {b['id']} are {b['moment_s'] - a['moment_s']:.3f} s apart (rule: never two within 150 ms)")
    return fx, placed


# ------------------------------------------------------------------ ducking, air, master
def duck_curve(actual, N, depth_db, look=0.25, release=0.8, merge=0.8):
    spans = sorted((s, s + d) for s, d in actual.values())
    m = []
    for s, e in spans:
        if m and s - m[-1][1] < merge:
            m[-1][1] = max(m[-1][1], e)
        else:
            m.append([s, e])
    ctl = 1000
    n = int(N / SR * ctl) + 2
    a = np.zeros(n)
    t = np.arange(n) / ctl
    for s, e in m:
        i0, i1 = int((s - look) * ctl), int((e + release) * ctl) + 1
        i0, i1 = max(0, i0), min(n, i1)
        tt = t[i0:i1]
        v = np.clip(np.minimum((tt - (s - look)) / look, 1 - (tt - e) / release), 0, 1)
        a[i0:i1] = np.maximum(a[i0:i1], v)
    g = db(-depth_db * a)
    return np.interp(np.arange(N) / SR, t, g).astype(F32)


def air_floor(N, seed=60):
    r = np.random.default_rng(seed)
    x = r.standard_normal((N, 1)).astype(np.float64)
    x = filt(filt(x, hp=60), lp=900)
    return x


def limit(x, ceiling_db, hold_s=0.02, smooth_s=0.01):
    """A true-peak limiter: the gain needed per sample from the 4x oversampled peak, held over `hold_s` and smoothed
    over `smooth_s` (look-ahead built in), so it is under the ceiling at every peak."""
    c = db(ceiling_db)
    p = np.zeros(len(x))
    ch = 10 * SR
    for i in range(0, len(x), ch):
        a, b = max(0, i - 64), min(len(x), i + ch + 64)
        y = signal.resample_poly(np.asarray(x[a:b], np.float64), 4, 1, axis=0)
        pk = np.abs(y).max(axis=1).reshape(-1, 4).max(axis=1)
        p[i:min(len(x), i + ch)] = pk[i - a:i - a + min(ch, len(x) - i)]
    r = np.minimum(1.0, c / np.maximum(p, 1e-12))
    if r.min() >= 1.0:
        return x, 0.0
    g = ndimage.minimum_filter1d(r, max(1, int(hold_s * SR)))
    g = ndimage.uniform_filter1d(g, max(1, int(smooth_s * SR)))
    g = np.minimum(g, r)
    return (x * g[:, None]).astype(F32), float(-20 * np.log10(g.min()))


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--voice', default='scratch', help='scratch, or a folder holding lines.json and <chapter>_<nn>.wav')
    ap.add_argument('--sheet', default=os.path.join(AUDIO, 'cues.json'))
    ap.add_argument('--edl', default=os.path.join(ROOT, 'design', 'edit', 'EDL.json'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'out', 'audio', 'mix_v2.wav'))
    ap.add_argument('--score', default=os.path.join(ROOT, 'out', 'audio', 'score_bed.wav'))
    ap.add_argument('--score-gain', type=float, default=0.0, help='dB on the score bed as it comes')
    ap.add_argument('--score-mask', choices=['all', 'hard', 'none'], default='all',
                    help='cut the score in the plan\'s silences: all (default), hard (only where the room goes too), none')
    ap.add_argument('--duck-score', type=float, default=8.0)
    ap.add_argument('--duck-beds', type=float, default=3.0)
    ap.add_argument('--lufs', type=float, default=-14.0)
    ap.add_argument('--tp', type=float, default=-1.0)
    ap.add_argument('--stems', action='store_true', help='also write voice, music and effects stems')
    a = ap.parse_args()
    t_start = time.time()
    warn = []
    sheet = json.load(open(a.sheet))
    E0 = EDL(a.edl)
    N = int(round(E0.total_frames / E0.fps * SR))
    print(f'film: {E0.total_frames} frames at {E0.fps} fps = {N / SR:.6f} s ({N} samples)')

    voice, actual, vinfo = place_voice(E0, a.voice, N, warn)
    d, files = load_read('scratch')
    sl = {}
    for vid, f in files.items():
        if os.path.exists(f):
            sl[vid] = sf.info(f).duration
    E = EDL(a.edl, voice_actual=actual, scratch_len=sl)
    print(f"voice: {vinfo['lines']} lines from {vinfo['read']}, stem at {VOICE_REF} LUFS")
    for x in sheet['cues']:
        if x.get('edl') and not x.get('mute') and abs(E.resolve(x['edl']) - x['t']) > 0.002:
            warn.append(f"cue {x['id']}: placed at {E.resolve(x['edl']):.3f} s against the sheet's {x['t']:.3f} s (the read moved it; re-run retime.py after a re-cut)")

    silences = []
    for s in sheet['silences']:
        an = s.get('edl') or {}
        t0 = E.resolve(an['t0']) if an.get('t0') else s['t0']
        t1 = E.resolve(an['t1']) if an.get('t1') else s['t1']
        silences.append(dict(s, t0=t0, t1=t1))
    masks = Masks(silences, N, a.score_mask)

    beds, bplaced = render_beds(sheet, N, masks, E, warn)
    print(f'beds: {len(bplaced)} spans')
    fx, fplaced = render_effects(sheet, N, masks, E, warn)
    print(f'effects: {len(fplaced)} placed ({sum(1 for c in sheet["cues"] if c.get("mute"))} muted in the sheet)')

    music = np.zeros((N, 2), F32)
    score_info = {'file': None}
    if a.score and os.path.exists(a.score):
        x = stereo(load(a.score))
        n = min(N, len(x))
        music[:n] = x[:n] * db(a.score_gain)
        score_info = {'file': os.path.relpath(a.score, ROOT), 'lufs_as_is': round(integrated(x), 2), 'gain_db': a.score_gain,
                      'length_s': round(len(x) / SR, 3)}
        if abs(len(x) - N) > SR // 100:
            warn.append(f'score bed is {len(x) / SR:.3f} s against the film\'s {N / SR:.3f} s')
        inside = []
        for t0, t1, sid in masks.spans['score'] or [(s['t0'], s['t1'], s['id']) for s in silences if 'score' in out_classes(s['out'])]:
            seg = x[int(t0 * SR):int(t1 * SR)]
            if len(seg) > SR // 2:
                l = integrated(seg)
                if np.isfinite(l) and l > -50:
                    inside.append(f'{sid} ({t0:.2f}-{t1:.2f} s): {l:.1f} LUFS')
        if inside:
            warn.append('the score has energy inside plan silences' + (' (cut by the mask)' if a.score_mask != 'none' else '') + ': ' + '; '.join(inside))
        mg = np.ones(N, F32)
        for i in range(0, N, 60 * SR):
            j = min(N, i + 60 * SR)
            mg[i:j] = masks.gain('score', i, j)
        music *= mg[:, None]
        print(f"score: {score_info['file']} ({score_info['lufs_as_is']} LUFS as it comes, {a.score_gain:+.1f} dB)")
    else:
        print(f'score: none ({os.path.relpath(a.score, ROOT)} does not exist yet)')

    if a.duck_score and score_info['file']:
        music *= duck_curve(actual, N, a.duck_score)[:, None]
    if a.duck_beds:
        beds *= duck_curve(actual, N, a.duck_beds)[:, None]

    v2 = np.repeat(voice[:, None], 2, axis=1)
    me = beds + fx + music
    mix = v2 + me
    L = integrated(mix)
    G = a.lufs - L
    air = air_floor(N)
    air = (air * db(-60 - G - integrated(stereo(air)))).astype(F32)
    mix = (mix + air) * F32(db(G))
    ceiling = a.tp - 0.3
    gr_max = 0.0
    for it in range(4):
        out, gr = limit(mix, ceiling)
        gr_max = max(gr_max, gr)
        Lm = integrated(out)
        tp = true_peak(out)
        if abs(Lm - a.lufs) <= 0.1 and tp <= a.tp:
            break
        if tp > a.tp:
            ceiling -= (tp - a.tp) + 0.1
        if abs(Lm - a.lufs) > 0.1:
            mix *= F32(db(a.lufs - Lm))
            G += a.lufs - Lm
    peak = float(np.abs(out).max())
    if peak >= 1.0:
        warn.append(f'sample peak {20 * np.log10(peak):.2f} dBFS: clipping')
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    sf.write(a.out, np.clip(out, -1, 1), SR, subtype='PCM_24')

    # dialogue on top: the M&E's short-term loudness under the voice's, while the voice speaks
    vst, mst = short_terms(v2 * db(G)), short_terms((me + air) * db(G))
    on = vst > -40
    gap = (vst - mst)[on]
    rep = {
        'out': os.path.relpath(a.out, ROOT), 'made': time.strftime('%Y-%m-%d %H:%M:%S'), 'edl': os.path.relpath(a.edl, ROOT),
        'duration_s': round(len(out) / SR, 6), 'samples': len(out), 'voice': vinfo, 'score': score_info,
        'score_mask': a.score_mask, 'duck_db': {'score': a.duck_score, 'beds': a.duck_beds},
        'master_gain_db': round(G, 2), 'limiter_max_gr_db': round(gr_max, 2),
        'measure': {'integrated_lufs': round(integrated(out), 2), 'true_peak_dbtp': round(true_peak(out), 2),
                    'sample_peak_dbfs': round(20 * np.log10(peak + 1e-20), 2), 'lra_lu': round(lra(out), 2),
                    'voice_over_rest_db_median': round(float(np.median(gap)), 1) if len(gap) else None,
                    'voice_over_rest_db_p10': round(float(np.percentile(gap, 10)), 1) if len(gap) else None},
        'beds': bplaced, 'effects': fplaced, 'silences': [{k: s[k] for k in ('id', 't0', 't1', 'out')} for s in silences],
        'warnings': warn, 'seconds': round(time.time() - t_start, 1)}
    if a.stems:
        sd = os.path.join(os.path.dirname(a.out), os.path.splitext(os.path.basename(a.out))[0] + '_stems')
        os.makedirs(sd, exist_ok=True)
        for name, x in [('voice', v2), ('music', music), ('effects', beds + fx + air)]:
            sf.write(os.path.join(sd, f'{name}.wav'), np.clip(x * db(G), -1, 1), SR, subtype='PCM_24')
        rep['stems'] = os.path.relpath(sd, ROOT)
    json.dump(rep, open(os.path.splitext(a.out)[0] + '.json', 'w'), indent=1)
    m = rep['measure']
    print(f"wrote {rep['out']}: {m['integrated_lufs']} LUFS, true peak {m['true_peak_dbtp']} dBTP, sample peak "
          f"{m['sample_peak_dbfs']} dBFS, LRA {m['lra_lu']} LU, voice over the rest {m['voice_over_rest_db_median']} dB "
          f"(10th percentile {m['voice_over_rest_db_p10']}), limiter {gr_max:.2f} dB at most, {len(out) / SR:.6f} s"
          + (f"; stems in {rep['stems']}" if a.stems else ''))
    for w in warn:
        print('CHECK:', w)


if __name__ == '__main__':
    main()
