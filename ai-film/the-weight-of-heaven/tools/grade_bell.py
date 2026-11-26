#!/usr/bin/env python3
"""The grade for Movement I, the bell (The Weight of Heaven): shot matching, a look, accent secondaries, tonal
shaping, grain and a matte, on an existing cut. Pure post-production: nothing is generated.

    python3 tools/grade_bell.py --in <ungraded picture.mp4> --edl <edl.json> --look <look name> --out <graded.mp4>
                                [--matte 2.39] [--no-grain]

edl.json holds a top-level list "picture"; each item has "start" (timeline seconds), "duration" (seconds) and
"grade_key" (a key of grade/shots.json, e.g. "Q02A:unread", or "black"). Each frame takes the grade of the item whose
range holds it (frame index / frame rate, boundaries rounded to the nearest frame and snapped to the picture's own cut
when one is found within three frames). Frames under an unknown key, under "black", or outside every range pass
through untouched (apart from the matte), with a warning. The output is video only: H.264 yuv420p, crf 14, tagged
BT.709 limited range, with exactly the frame count, frame rate and size of the input.

The order is the studio's (references/color.md): correction and matching first, then the look, then texture.
  (a) correction  one ASC CDL per grade_key (slope, offset, power, saturation), applied in ACEScct, from
                  grade/shots.json. Generated video is display-referred Rec.709: it is decoded with a pure 2.4
                  gamma, taken to ACEScct for the CDL and returned to the same encoding. No log or display
                  transform is ever applied.
  (b) the look    grade/looks.json: near-neutrals are pulled toward white (cream is removed, skin is not), one tone
                  curve per look, a small split tint on the neutrals, a saturation for everything else.
  (c) accents     gold, seal red and wine: keyed by hue, saturation and value on the MATCHED picture (so the key
                  does not move with the look) and, per shot, inside a soft rectangle with cut-outs; then pushed on
                  the looked picture. Only shots that list an accent in shots.json get it. Gold and seal red share
                  their hue with skin, so in a shot with faces the rectangle, not the key, keeps the accent off
                  them; --qa tests every key against every face it finds.
  (d) shaping     per shot, optional: "deepen" (let a dark thing go dark, inside a soft rectangle), "density" (hold
                  a pale sky down a little) and "haze" (a lighten-only veil over the top of a wide).
  (e) grain       once, here: monochrome with a little chroma, softened, weighted to the mid-tones, seeded by the
                  frame number so a re-render is identical. No halation, no bloom: the scene is overcast daylight.
  (f) matte       --matte 2.39 paints black bars (8 rows top and bottom at 992x432).

Look names: any key of looks.json "looks", plus "matched" (stage a only) and "source" (nothing but the re-encode).

Other modes (same file, so the grade is one tool):
    --measure                    measure every grade_key on its source take, solve its CDL toward the hero, and
                                 write the measurements and the CDL back into grade/shots.json
    --board <out.jpg>            the look board (source, matched, every look) from --in/--edl; cells to grade/board/
    --qa <graded.mp4>            acceptance checks of a render against --in/--edl; writes --report <json>

Needs python3 with numpy and ffmpeg/ffprobe. The board also needs Pillow; face checks in --qa need OpenCV and the
YuNet model (YUNET=/path/to/face_detection_yunet_2023mar.onnx), and are skipped with a note without them.
"""
import argparse
import json
import math
import os
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(HERE, 'grade', 'shots.json')
LOOKS = os.path.join(HERE, 'grade', 'looks.json')
W709 = np.array([0.2126, 0.7152, 0.0722], np.float32)                 # Rec.709 luma
AP1_LUMA = np.array([0.2722287, 0.6740818, 0.0536895], np.float32)    # ACEScct/ACEScg luminance weights
CLIP, CRUSH = 0.985, 0.015                                            # the studio's acceptance thresholds
LUT_N = 97                                                            # nodes per axis of the baked per-shot LUT


def warn(*a):
    print('warning:', *a, file=sys.stderr, flush=True)


# ---------------------------------------------------------------------------------------------------------------
# colour science: Rec.709 (gamma 2.4, display-referred) <-> ACEScct, as OpenColorIO's built-in ACES config does it
# ---------------------------------------------------------------------------------------------------------------
def _rgb_to_xyz(prim, white):
    xy = np.array(prim, np.float64)
    M = np.stack([xy[:, 0] / xy[:, 1], np.ones(3), (1 - xy[:, 0] - xy[:, 1]) / xy[:, 1]])
    w = np.array([white[0] / white[1], 1.0, (1 - white[0] - white[1]) / white[1]])
    return M * np.linalg.solve(M, w)


def _bradford(src_white, dst_white):
    B = np.array([[0.8951, 0.2664, -0.1614], [-0.7502, 1.7135, 0.0367], [0.0389, -0.0685, 1.0296]])
    xyz = lambda w: np.array([w[0] / w[1], 1.0, (1 - w[0] - w[1]) / w[1]])
    s, d = B @ xyz(src_white), B @ xyz(dst_white)
    return np.linalg.inv(B) @ np.diag(d / s) @ B


_D65, _ACESW = (0.3127, 0.3290), (0.32168, 0.33767)
_M709 = _rgb_to_xyz([(0.64, 0.33), (0.30, 0.60), (0.15, 0.06)], _D65)
_MAP1 = _rgb_to_xyz([(0.713, 0.293), (0.165, 0.830), (0.128, 0.044)], _ACESW)
M_709_AP1 = (np.linalg.inv(_MAP1) @ _bradford(_D65, _ACESW) @ _M709).astype(np.float32)
M_AP1_709 = np.linalg.inv(M_709_AP1.astype(np.float64)).astype(np.float32)
_CCT_A, _CCT_B, _CCT_X, _CCT_Y = 10.5402377416545, 0.0729055341958355, 0.0078125, 0.155251141552511


def display_to_cct(v):
    """display-referred Rec.709 code values (0..1, gamma 2.4) -> ACEScct, array (..., 3)"""
    lin = np.power(np.clip(v, 0, None), 2.4, dtype=np.float32) @ M_709_AP1.T
    return np.where(lin <= _CCT_X, _CCT_A * lin + _CCT_B,
                    (np.log2(np.maximum(lin, 1e-10)) + 9.72) / 17.52).astype(np.float32)


def cct_to_display(c):
    lin = np.where(c <= _CCT_Y, (c - _CCT_B) / _CCT_A, np.exp2(c * 17.52 - 9.72)).astype(np.float32)
    return np.power(np.clip(lin @ M_AP1_709.T, 0, None), 1 / 2.4, dtype=np.float32)


def smoothstep(a, b, x):
    t = np.clip((x - a) / max(b - a, 1e-6), 0, 1)
    return t * t * (3 - 2 * t)


def luma(v):
    return v @ W709


# ---------------------------------------------------------------------------------------------------------------
# (a) correction: the shot's CDL in ACEScct
# ---------------------------------------------------------------------------------------------------------------
def cdl_cct(c, cdl):
    x = c * np.asarray(cdl['slope'], np.float32) + np.asarray(cdl['offset'], np.float32)
    x = np.power(np.clip(x, 0, None), np.asarray(cdl['power'], np.float32))
    y = x @ AP1_LUMA
    return y[..., None] + (x - y[..., None]) * np.float32(cdl['sat'])


def _raw_correct(v, cdl):
    return cct_to_display(cdl_cct(display_to_cct(v), cdl))


def correct(v, cdl):
    """display -> display, the shot's correction. If the CDL lifts white above 1.0, the top is rolled off from a
    knee instead of clipped (no new clipped pixels); a CDL that leaves white alone leaves the top alone."""
    if not cdl:
        return v
    out = _raw_correct(v, cdl)
    m = float(_raw_correct(np.ones((1, 3), np.float32), cdl).max())
    if m > 1.0005:
        knee = min(0.90, 1 - (m - 1) / 0.8)              # T = (m-knee)/(1-knee) stays under 1.8: monotone
        T = (m - knee) / (1 - knee)
        t = np.clip((out - knee) / (1 - knee), 0, T)
        out = np.where(out > knee, knee + (1 - knee) * (t - (T - 1) / (T * T) * t * t), out)
    return np.clip(out, 0, 1).astype(np.float32)


# ---------------------------------------------------------------------------------------------------------------
# (b) the look: neutrals to white, tone curve, split tint, saturation
# ---------------------------------------------------------------------------------------------------------------
def pchip_lut(points, n=4097):
    """a monotone cubic through the control points (Fritsch-Carlson), sampled on n points over 0..1"""
    x = np.array([p[0] for p in points], np.float64)
    y = np.array([p[1] for p in points], np.float64)
    h, d = np.diff(x), np.diff(y) / np.diff(x)
    m = np.zeros_like(x)
    for i in range(1, len(x) - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])

    def end(h0, h1, d0, d1):
        s = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1)
        if s * d0 <= 0:
            return 0.0
        if d0 * d1 <= 0 and abs(s) > 3 * abs(d0):
            return 3 * d0
        return s
    m[0], m[-1] = end(h[0], h[1], d[0], d[1]), end(h[-1], h[-2], d[-1], d[-2])
    g = np.linspace(0, 1, n)
    i = np.clip(np.searchsorted(x, g, side='right') - 1, 0, len(x) - 2)
    t = (g - x[i]) / h[i]
    out = ((2 * t ** 3 - 3 * t ** 2 + 1) * y[i] + (t ** 3 - 2 * t ** 2 + t) * h[i] * m[i]
           + (-2 * t ** 3 + 3 * t ** 2) * y[i + 1] + (t ** 3 - t ** 2) * h[i] * m[i + 1])
    return np.clip(out, 0, 1).astype(np.float32)


def soft_sat(v):
    """a saturation that does not explode in the blacks: (max - min) / (max + 0.08)"""
    mx, mn = v.max(-1), v.min(-1)
    return (mx - mn) / (mx + 0.08)


def look_colour(v, L):
    """matched display values (N, 3) -> looked display values (N, 3)"""
    y = luma(v)
    n = L['neutral']
    nk = 1 - smoothstep(n['below'], n['above'], soft_sat(v))            # 1 on near-neutrals, 0 on skin and accents
    k = nk * n['keep'] + (1 - nk) * L.get('saturation', 1.0)
    v = y[:, None] + (v - y[:, None]) * k[:, None]
    curve = L['_curve']
    grid = np.linspace(0, 1, len(curve))
    v = np.clip(v, 0, 1)
    pc = np.interp(v, grid, curve).astype(np.float32)                    # per channel: the filmic way
    hk = L.get('hue_keep', 0.5)
    if hk > 0:                                                           # by the largest channel: hue-true
        m = np.maximum(v.max(1), 1e-4)
        pc = pc + hk * (v * (np.interp(m, grid, curve) / m)[:, None].astype(np.float32) - pc)
    v = pc
    t = L.get('tint')
    if t:
        y2 = luma(v)
        ends = smoothstep(0.0, 0.05, y2) * (1 - smoothstep(0.90, 1.0, y2))    # black stays black, white stays white
        reach = nk + (1 - nk) * t.get('reach', 0.25)                          # how much of the tint reaches skin
        tv = (np.outer((1 - y2) ** 2, np.asarray(t['shadows'], np.float32))
              + np.outer(2 * y2 * (1 - y2), np.asarray(t['mids'], np.float32))
              + np.outer(y2 ** 2, np.asarray(t['highlights'], np.float32)))
        v = v + tv * (ends * reach)[:, None]
    return np.clip(v, 0, 1).astype(np.float32)


def bake_lut(fn, n=LUT_N):
    g = np.linspace(0, 1, n, dtype=np.float32)
    r, gg, b = np.meshgrid(g, g, g, indexing='ij')
    return np.ascontiguousarray(fn(np.stack([r, gg, b], -1).reshape(-1, 3)).astype(np.float32))    # index (r*n+g)*n+b


def apply_lut(img, lut, n=LUT_N):
    """trilinear lookup; img (..., 3) float 0..1"""
    p = np.clip(img.reshape(-1, 3), 0, 1) * np.float32(n - 1)
    i = p.astype(np.int32)
    np.minimum(i, n - 2, out=i)
    f = p - i
    idx = (i[:, 0] * n + i[:, 1]) * n + i[:, 2]
    fr, fg, fb = f[:, 0:1], f[:, 1:2], f[:, 2:3]

    def along_b(k):                                   # interpolate the pair of nodes at k and k + 1 (blue axis)
        c = lut.take(k, axis=0)
        t = lut.take(k + 1, axis=0)
        t -= c
        t *= fb
        c += t
        return c
    c0, c1 = along_b(idx), along_b(idx + n)
    c1 -= c0
    c1 *= fg
    c0 += c1
    d0, d1 = along_b(idx + n * n), along_b(idx + n * n + n)
    d1 -= d0
    d1 *= fg
    d0 += d1
    d0 -= c0
    d0 *= fr
    c0 += d0
    return c0.reshape(img.shape)


# ---------------------------------------------------------------------------------------------------------------
# (c) accents: key on the matched picture, push on the looked picture
# ---------------------------------------------------------------------------------------------------------------
def hsv(v):
    r, g, b = v[..., 0], v[..., 1], v[..., 2]
    mx, mn = v.max(-1), v.min(-1)
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, (mx - mn) / np.maximum(mx, 1e-4), mx


def qualify(matched, key):
    """key = {"hue": [from, to] degrees (may wrap through 0), "hue_soft", "sat": [0 at, 1 at], "val": [0 at, 1 at],
    "val_max": [1 at, 0 at]} -> 0..1"""
    h, s, val = hsv(matched)
    a, b = key['hue']
    span = (b - a) % 360
    centre, half = a + span / 2, span / 2
    dist = np.abs((h - centre + 180) % 360 - 180)
    q = 1 - smoothstep(half, half + key.get('hue_soft', 6), dist)
    q = q * smoothstep(key['sat'][0], key['sat'][1], s) * smoothstep(key['val'][0], key['val'][1], val)
    if key.get('val_max'):
        q = q * (1 - smoothstep(key['val_max'][0], key['val_max'][1], val))
    return q.astype(np.float32)


def soften(q, passes):
    """a small blur of a key: `passes` rounds of a 1-2-1 kernel each way (edges repeat)"""
    for _ in range(int(passes)):
        p = np.pad(q, 1, mode='edge')
        q = (p[:-2, 1:-1] + 2 * p[1:-1, 1:-1] + p[2:, 1:-1]) * 0.25
        p = np.pad(q, 1, mode='edge')
        q = (p[1:-1, :-2] + 2 * p[1:-1, 1:-1] + p[1:-1, 2:]) * 0.25
    return q


def fit_gamut(v):
    """bring out-of-range pixels back by losing chroma, not by clipping a channel (which would turn the hue)"""
    y = np.clip(luma(v), 0, 1)[..., None]
    c = v - y
    with np.errstate(divide='ignore', invalid='ignore'):
        t_hi = np.where(c > 1e-6, (1 - y) / c, np.inf)
        t_lo = np.where(c < -1e-6, (0 - y) / c, np.inf)
    t = np.clip(np.minimum(t_hi, t_lo).min(-1), 0, 1)[..., None]
    return y + c * t


def accent_op(v, q, p):
    """v looked display values (N, 3), q 0..1 (N,), p = {"sat", "hue_deg" (+ toward yellow), "gain",
    "lift_gamma" and "lift_below" (a gamma lift of everything under lift_below: for the wine)}"""
    y = luma(v)
    c = v - y[:, None]
    cb, cr = c[:, 2] / 1.8556, c[:, 0] / 1.5748
    th = math.radians(p.get('hue_deg', 0.0))
    s = p.get('sat', 1.0)
    cb2, cr2 = (cb * math.cos(th) - cr * math.sin(th)) * s, (cb * math.sin(th) + cr * math.cos(th)) * s
    g = np.full_like(y, p.get('gain', 1.0))
    if p.get('lift_gamma'):
        top = p.get('lift_below', 0.45)
        mx = np.maximum(v.max(-1), 1e-4)
        g = g * np.where(mx < top, np.power(mx / top, p['lift_gamma'] - 1.0), 1.0)
    y2 = y * g
    r, b = y2 + 1.5748 * cr2 * g, y2 + 1.8556 * cb2 * g
    new = fit_gamut(np.stack([r, (y2 - 0.2126 * r - 0.0722 * b) / 0.7152, b], -1))
    return (v + q[:, None] * (new - v)).astype(np.float32)


def _soft_rect(rect, feather, W, H):
    x0, y0, x1, y1 = rect
    f = max(float(feather), 1.0)
    xs, ys = np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32)
    mx = smoothstep(x0 - f, x0, xs) * (1 - smoothstep(x1, x1 + f, xs))
    my = smoothstep(y0 - f, y0, ys) * (1 - smoothstep(y1, y1 + f, ys))
    return np.outer(my, mx).astype(np.float32)


def region_mask(rect, feather, W, H, exclude=None):
    """a soft rectangle: 1 inside, 0 beyond `feather` pixels outside, with soft rectangles cut out of it (`exclude`:
    where skin shares the accent's hue). Returns (mask or None for the whole frame, (y0, y1, x0, x1))."""
    if not rect and not exclude:
        return None, (0, H, 0, W)
    m = _soft_rect(rect, feather, W, H) if rect else np.ones((H, W), np.float32)
    for ex in exclude or []:
        m *= 1 - _soft_rect(ex, min(float(feather), 8.0), W, H)
    ys, xs = np.flatnonzero(m.max(1) > 0), np.flatnonzero(m.max(0) > 0)
    if ys.size == 0:
        return m[:1, :1] * 0, (0, 1, 0, 1)
    y0, y1, x0, x1 = int(ys[0]), int(ys[-1]) + 1, int(xs[0]), int(xs[-1]) + 1
    return np.ascontiguousarray(m[y0:y1, x0:x1]), (y0, y1, x0, x1)


# ---------------------------------------------------------------------------------------------------------------
# (d) shaping
# ---------------------------------------------------------------------------------------------------------------
def deepen(v, amount, below, floor=0.5):
    """let the darks go dark: pixels under `below` are scaled by (Y/below)^(amount*(1-Y/below)), smooth at `below`,
    never by less than `floor`; hue and saturation are kept"""
    y = np.maximum(luma(v), 1e-4)
    u = np.clip(y / below, 1e-4, 1)
    return v * np.maximum(np.power(u, amount * (1 - u)), floor)[..., None]


def density(v, amount, above):
    """put density into the upper tones (a pale sky) without touching cloth, skin or peak white: luma is lowered by up
    to `amount` between `above` and 0.93, hue and saturation kept"""
    y = np.maximum(luma(v), 1e-4)
    w = amount * smoothstep(above, above + 0.2, y) * (1 - smoothstep(0.93, 1.0, y))
    return v * ((y - w) / y)[..., None]


def haze(img, top, amount, colour):
    """a lighten-only veil, full at the top row and gone at `top` (a fraction of the height)"""
    H = img.shape[0]
    rows = int(round(top * H))
    if rows <= 0 or amount <= 0:
        return img
    m = (amount * (1 - smoothstep(0, 1, np.arange(rows, dtype=np.float32) / rows)))[:, None, None]
    img[:rows] += m * np.maximum(np.asarray(colour, np.float32) - img[:rows], 0)
    return img


# ---------------------------------------------------------------------------------------------------------------
# (e) grain
# ---------------------------------------------------------------------------------------------------------------
def grain(img, frame_no, g):
    """g = {"amount" (sd at mid-grey, display units), "size" (px), "chroma" (share of colour noise), "mid" (weight
    exponent), "seed"}. Seeded by the frame number: the same frame always gets the same grain. The colour part is
    drawn at half resolution (dye clouds are coarser than the silver)."""
    H, W = img.shape[:2]
    rng = np.random.default_rng([int(g.get('seed', 800)), int(frame_no)])
    n = rng.standard_normal((H + 2, W + 2), dtype=np.float32)
    sigma = max(g.get('size', 1.2) / 2.0, 0.05)
    e = math.exp(-0.5 / sigma ** 2)
    k0, k1 = 1 / (1 + 2 * e), e / (1 + 2 * e)
    n = k1 * n[:-2] + k0 * n[1:-1] + k1 * n[2:]
    n = k1 * n[:, :-2] + k0 * n[:, 1:-1] + k1 * n[:, 2:]
    y = np.clip(luma(img), 0, 1)
    w = np.power(4 * y * (1 - y), g.get('mid', 0.75)) * np.float32(g.get('amount', 0.014))
    ch = g.get('chroma', 0.12)
    n *= w * np.float32((1 - ch) / (k0 * k0 + 2 * k1 * k1))          # back to unit variance after the blur
    out = img + n[..., None]
    if ch > 0:
        c = rng.standard_normal(((H + 1) // 2, (W + 1) // 2, 3), dtype=np.float32)
        c = np.repeat(np.repeat(c, 2, axis=0), 2, axis=1)[:H, :W]
        c *= (w * np.float32(ch))[..., None]
        out += c
    return out


# ---------------------------------------------------------------------------------------------------------------
# the grader: one prepared set per grade_key
# ---------------------------------------------------------------------------------------------------------------
def load_json(path):
    with open(path) as f:
        return json.load(f)


class Grader:
    def __init__(self, shots, looks, look, W, H, use_grain=True, matte=None):
        self.shots, self.W, self.H = shots['shots'], W, H
        self.keys = looks.get('accent_keys', {})
        self.stage = look                                            # 'source', 'matched' or a look
        self.L = None
        if look not in ('source', 'matched'):
            if look not in looks['looks']:
                sys.exit(f"unknown look {look!r}: choose one of {', '.join(looks['looks'])}, matched, source")
            self.L = dict(looks['looks'][look])
            self.L['_curve'] = pchip_lut(self.L['curve'])
        self.use_grain = use_grain and self.L is not None
        self.band = int(round(W / matte / 2) * 2) if matte else H
        self.top = (H - self.band) // 2
        self._prep = {}

    def known(self, key):
        return key in self.shots and not self.shots[key].get('passthrough')

    def prep(self, key):
        if key in self._prep:
            return self._prep[key]
        s = self.shots[key]
        cdl, L = s.get('cdl'), self.L
        p = {'cdl': cdl, 'accents': [], 'shape': []}
        if L is None:
            p['lut'] = bake_lut(lambda v: correct(v, cdl))
        else:
            p['lut'] = bake_lut(lambda v: look_colour(correct(v, cdl), L))
            for a in s.get('accents', []):
                op = L.get('accents', {}).get(a['key'])
                if not op or a['key'] not in self.keys:
                    continue
                mask, box = region_mask(a.get('region'), a.get('feather', 16), self.W, self.H, a.get('exclude'))
                key_def = dict(self.keys[a['key']], **a.get('key_override', {}))
                p['accents'].append({'name': a['key'], 'key': key_def, 'op': op, 'mask': mask, 'box': box,
                                     'amount': a.get('amount', 1.0)})
            for sh in s.get('shape', []):
                mask, box = region_mask(sh.get('region'), sh.get('feather', 24), self.W, self.H)
                p['shape'].append(dict(sh, mask=mask, box=box))
        self._prep[key] = p
        return p

    def matte(self, img):
        if self.top > 0:
            img[:self.top] = 0
            img[self.top + self.band:] = 0
        return img

    def frame(self, src, key, frame_no):
        """src: float32 (H, W, 3) display values; returns the graded float32 frame"""
        if self.stage == 'source' or not self.known(key):
            return self.matte(src.copy())
        p = self.prep(key)
        out = apply_lut(src, p['lut'])
        if self.L is not None:
            boxes = {}
            for a in p['accents']:
                boxes.setdefault(a['box'], []).append(a)
            for (y0, y1, x0, x1), group in boxes.items():
                sb = src[y0:y1, x0:x1].reshape(-1, 3)
                # only pixels with some saturation can be keyed: correct and key those, leave the rest at zero
                mx, mn = sb.max(1), sb.min(1)
                sel = np.flatnonzero((mx - mn) > 0.6 * min(a['key']['sat'][0] for a in group) * mx)
                if sel.size == 0:
                    continue
                matched = correct(sb[sel], p['cdl'])
                ob, changed = out[y0:y1, x0:x1].reshape(-1, 3), False
                for a in group:
                    q = np.zeros(sb.shape[0], np.float32)
                    q[sel] = qualify(matched, a['key']) * a['amount']
                    if a['key'].get('soften'):                           # blur the key, as any colourist would
                        q = soften(q.reshape(y1 - y0, x1 - x0), a['key']['soften']).reshape(-1)
                    if a['mask'] is not None:
                        q = q * a['mask'].reshape(-1)
                    on = np.flatnonzero(q > 1e-3)
                    if on.size:
                        ob[on] = accent_op(ob[on], q[on], a['op'])
                        changed = True
                if changed:
                    out[y0:y1, x0:x1] = ob.reshape(y1 - y0, x1 - x0, 3)
            for sh in p['shape']:
                if sh['op'] == 'deepen':
                    y0, y1, x0, x1 = sh['box']
                    reg = out[y0:y1, x0:x1]
                    d = deepen(reg, sh['amount'] * self.L.get('deepen_gain', 1.0), sh['below'], sh.get('floor', 0.5))
                    out[y0:y1, x0:x1] = d if sh['mask'] is None else reg + sh['mask'][..., None] * (d - reg)
                elif sh['op'] == 'density':
                    out = density(out, sh['amount'], sh['above'])
                elif sh['op'] == 'haze':
                    hz = self.L.get('haze', {})
                    out = haze(out, sh['top'], sh['amount'] * hz.get('gain', 1.0), hz.get('colour', [0.9, 0.92, 0.95]))
            if self.use_grain and self.L.get('grain'):
                out = grain(out, frame_no, self.L['grain'])
        return self.matte(np.clip(out, 0, 1))


# ---------------------------------------------------------------------------------------------------------------
# video in and out
# ---------------------------------------------------------------------------------------------------------------
def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                        'stream=width,height,r_frame_rate,nb_frames,color_range,color_space,color_primaries,color_transfer,'
                        'pix_fmt,codec_name:format=duration', '-of', 'json', path], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f'cannot read {path}: {r.stderr.strip()}')
    j = json.loads(r.stdout)
    s = j['streams'][0]
    num, den = (int(x) for x in s['r_frame_rate'].split('/'))
    s.update(fps=num / den, fps_str=s['r_frame_rate'], duration=float(j['format']['duration']),
             nb_frames=int(s['nb_frames']) if str(s.get('nb_frames', '')).isdigit() else None)
    return s


def in_matrix(info, choice='auto'):
    """generated takes are untagged: ffmpeg and players read untagged video of this size as BT.601, and so did the
    reviewers; a tagged input is read by its tag"""
    if choice != 'auto':
        return choice
    cs = info.get('color_space', 'unknown')
    if cs == 'bt709':
        return 'bt709'
    if cs in ('smpte170m', 'bt470bg'):
        return 'bt601'
    return 'bt601' if info['height'] < 720 else 'bt709'


def decoder(path, matrix, full_range=False, pre=None, ss=None, t=None, threads=2):
    vf = ([pre] if pre else []) + [f"scale=in_color_matrix={matrix}:in_range={'pc' if full_range else 'tv'}:"
                                   f"flags=bicubic+accurate_rnd+full_chroma_int", 'format=rgb48le']
    cmd = ['ffmpeg', '-v', 'error', '-nostdin', '-threads', str(threads)]
    if ss is not None:
        cmd += ['-ss', f'{ss:.4f}']
    cmd += ['-i', path]
    if t is not None:
        cmd += ['-t', f'{t:.4f}']
    cmd += ['-an', '-vf', ','.join(vf), '-fps_mode', 'passthrough', '-f', 'rawvideo', '-']
    return subprocess.Popen(cmd, stdout=subprocess.PIPE)


def frames(proc, W, H):
    n = W * H * 6
    while True:
        buf = proc.stdout.read(n)
        if len(buf) < n:
            break
        yield np.frombuffer(buf, '<u2').reshape(H, W, 3)
    proc.stdout.close()
    proc.wait()


def to_float(u16):
    return u16.astype(np.float32) * np.float32(1 / 65535)


def encoder(path, W, H, fps_str, threads=2, crf=14):
    return subprocess.Popen(
        ['ffmpeg', '-v', 'error', '-nostdin', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb48le', '-s', f'{W}x{H}',
         '-framerate', fps_str, '-i', '-', '-an',
         '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=bicubic+accurate_rnd+full_chroma_int,format=yuv420p',
         '-c:v', 'libx264', '-preset', 'medium', '-crf', str(crf), '-profile:v', 'high', '-threads', str(threads),
         '-fps_mode', 'passthrough', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
         '-color_range', 'tv', '-movflags', '+faststart', path], stdin=subprocess.PIPE)


def cut_scores(path, threads=2):
    """mean absolute difference between consecutive frames at 124x54 grey: a hard cut is a spike"""
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-nostdin', '-threads', str(threads), '-i', path, '-an', '-vf',
                          'scale=124:54:flags=area,format=gray', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-'],
                         stdout=subprocess.PIPE)
    raw = np.frombuffer(p.stdout.read(), np.uint8)
    p.wait()
    f = raw[:len(raw) // (124 * 54) * 124 * 54].reshape(-1, 54, 124).astype(np.float32)
    d = np.zeros(len(f), np.float32)
    d[1:] = np.abs(f[1:] - f[:-1]).mean((1, 2))
    return d


def timeline(edl, fps, n_frames, scores=None):
    """the grade_key of every frame (None: outside every range). Boundaries are rounded to the nearest frame, then
    moved onto the picture's own hard cut when there is one within three frames."""
    items = sorted(edl['picture'], key=lambda i: i['start'])
    bounds = []
    for i, it in enumerate(items):
        if 'grade_key' not in it:
            warn(f"EDL item at {it.get('start')} s has no grade_key: its frames pass through")
        if 'duration' not in it:                      # run to the next item, or to the end
            nxt = items[i + 1]['start'] if i + 1 < len(items) else n_frames / fps
            warn(f"EDL item at {it['start']} s has no duration: taken to run to {nxt:.3f} s")
            it = dict(it, duration=nxt - it['start'])
        a = int(round(it['start'] * fps))
        b = int(round((it['start'] + it['duration']) * fps))
        bounds.append([a, b, it.get('grade_key')])
    if scores is not None:
        for i, bd in enumerate(bounds):
            a = bd[0]
            if a <= 0 or a >= n_frames:
                continue
            lo, hi = max(1, a - 3), min(n_frames - 1, a + 3)
            j = lo + int(np.argmax(scores[lo:hi + 1]))
            around = np.median(scores[max(1, a - 14):min(n_frames, a + 15)])
            if scores[j] >= max(6.0, 5 * around) and j != a:
                warn(f"EDL starts {bd[2]} at frame {a} ({a / fps:.3f} s) but the picture cuts at frame {j} "
                     f"({j / fps:.3f} s): using the picture's cut")
                if i > 0 and bounds[i - 1][1] == a:
                    bounds[i - 1][1] = j
                bd[0] = j
    keys = [None] * n_frames
    for a, b, k in bounds:
        for f in range(max(a, 0), min(b, n_frames)):
            keys[f] = k
    return keys, bounds


def render(args):
    info = probe(args.inp)
    W, H, fps = info['width'], info['height'], info['fps']
    shots, looks = load_json(args.shots), load_json(args.looks)
    G = Grader(shots, looks, args.look, W, H, use_grain=not args.no_grain, matte=args.matte)
    n_in = info['nb_frames'] or int(round(info['duration'] * fps))
    scores = None if args.no_snap else cut_scores(args.inp, args.threads)
    keys, _ = timeline(load_json(args.edl), fps, n_in if scores is None else len(scores), scores)
    told = set()
    for k in sorted({k for k in keys if k is not None and not G.known(k)}):
        if not shots['shots'].get(k, {}).get('passthrough'):
            warn(f'grade_key {k!r} is not in {os.path.relpath(args.shots, HERE)}: its frames pass through ungraded')
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    dec = decoder(args.inp, in_matrix(info, args.in_matrix), info.get('color_range') == 'pc', threads=1)
    enc = encoder(args.out, W, H, info['fps_str'], args.threads)
    n = 0
    for u16 in frames(dec, W, H):
        key = keys[n] if n < len(keys) else None
        if key is None and 'gap' not in told:
            warn(f'frame {n} ({n / fps:.3f} s) is outside every EDL range: such frames pass through ungraded')
            told.add('gap')
        if key is None or not G.known(key) or G.stage == 'source':
            out = u16 if G.top == 0 else G.matte(u16.copy())           # untouched except the matte
            enc.stdin.write(out.tobytes())
        else:
            img = G.frame(to_float(u16), key, n)
            enc.stdin.write((img * 65535 + 0.5).astype('<u2').tobytes())
        n += 1
        if n % 120 == 0:
            print(f'  {n} frames', flush=True)
    enc.stdin.close()
    if enc.wait():
        sys.exit('ffmpeg failed to encode')
    o = probe(args.out)
    ok = (o['nb_frames'] == n and (info['nb_frames'] in (None, n)) and o['fps_str'] == info['fps_str']
          and (o['width'], o['height']) == (W, H))
    print(f"wrote {args.out}: {o['nb_frames']} frames (input {info['nb_frames']}), {o['fps_str']} fps, "
          f"{o['width']}x{o['height']}, {o['color_space']}/{o['color_primaries']}/{o['color_transfer']}/{o['color_range']}, "
          f"look {args.look}{', matte %.2f' % args.matte if args.matte else ''}{'' if G.use_grain else ', no grain'}")
    if not ok:
        sys.exit('ERROR: the output does not match the input in frame count, rate or size')


# ---------------------------------------------------------------------------------------------------------------
# --measure: statistics per grade_key on its source take, and the CDL toward the hero
# ---------------------------------------------------------------------------------------------------------------
MATCH = {  # how far each statistic moves toward the hero's, and the most it may move (ACEScct units; 0.0571 = one stop)
    'white': 0.6, 'white_limit': 0.02,      # 99th percentile, by a slope about display black
    'black': 0.35, 'power_limit': [0.85, 1.12], 'raise_black': False,   # 1st percentile, by the power; never lifted
    'cast': 0.7, 'cast_limit': 0.004,       # the near-neutral pixels' cast, by per-channel slopes about display black
    'sat': 0.0, 'sat_limit': 0.12}          # off: whole-frame chroma follows the content (sky, cloth, gold), not the take
K_BLACK = _CCT_B                            # ACEScct of display black: every correction pivots here, so black stays black


def stats(v):
    """v (N, 3) display values -> the numbers the reviewers used (of 255) and the ACEScct numbers the solve uses"""
    y = luma(v)
    p01, p1, p50, p99, p999 = (float(x) for x in np.percentile(y, [0.1, 1, 50, 99, 99.9]))
    cb, cr = (v[:, 2] - y) / 1.8556, (v[:, 0] - y) / 1.5748
    chroma = np.hypot(cb, cr)
    neutral = chroma <= np.percentile(chroma, 30)
    hi = (y >= np.percentile(y, 80)) & (y <= np.percentile(y, 98))
    c = display_to_cct(v)
    yc = c @ AP1_LUMA
    cc = c - yc[:, None]
    ch = np.linalg.norm(cc, axis=1)
    nc = ch <= np.percentile(ch, 30)
    r = lambda x: round(float(x) * 255, 1)
    return {'black_p1': r(p1), 'black_p0.1': r(p01), 'median': r(p50), 'white_p99': r(p99),
            'neutral_R-B': r((v[neutral, 0] - v[neutral, 2]).mean()),
            'neutral_G-M': r((v[neutral, 1] - (v[neutral, 0] + v[neutral, 2]) / 2).mean()),
            'highlight_R-B': r((v[hi, 0] - v[hi, 2]).mean()),
            'chroma_mean': r(chroma.mean()), 'chroma_median': r(np.median(chroma)),
            'clipped_pct': round(float((v.max(1) >= CLIP).mean() * 100), 3),
            'crushed_pct': round(float((y <= CRUSH).mean() * 100), 3),
            'acescct': {'black': float(np.percentile(yc, 1)), 'median': float(np.median(yc)),
                        'white': float(np.percentile(yc, 99)), 'white_p99.9': float(np.percentile(yc, 99.9)),
                        'cast': [float(x) for x in cc[nc].mean(0)], 'neutral_luma': float(yc[nc].mean()),
                        'chroma': float(np.median(ch))}}


def solve_cdl(m, hero, trim):
    """An ASC CDL in ACEScct that pivots on display black (so black is neither lifted nor crushed):
      white  the 99th percentile moves part of the way to the hero's, by the slope; never so far that the shot's
             99.9th percentile would reach clipping
      black  the 1st percentile moves part of the way DOWN to the hero's, by the power (a shot darker than the hero
             is left alone: lifting a black is what "milky" is)
      cast   the near-neutral pixels' cast moves most of the way to the hero's, by per-channel slopes
    `trim` (grade/shots.json, each with its "why") overrides MATCH per shot and may add, by hand: "gain_stops"
    (exposure at white), "wb" [r, g, b] (ACEScct at white; + is more of that channel), "power_mul" and "sat_mul"."""
    t = trim or {}
    P = dict(MATCH, **{k: v for k, v in t.items() if k in MATCH})
    a, h, K = m['acescct'], hero['acescct'], K_BLACK
    B, W = a['black'], a['white']
    dW = float(np.clip((h['white'] - W) * P['white'], -P['white_limit'], P['white_limit']))
    if dW > 0:
        dW = max(0.0, min(dW, float(display_to_cct(np.full((1, 3), 0.975, np.float32))[0, 0]) - a['white_p99.9']))
    W2 = W + dW + 0.0571 * t.get('gain_stops', 0.0)
    Blin = K + (B - K) * (W2 - K) / (W - K)                 # where the slope alone leaves the black anchor
    dB = (h['black'] - Blin) * P['black']
    if dB > 0 and not P['raise_black']:
        dB = 0.0
    B2 = Blin + dB

    def so(p):
        s = (W2 ** (1 / p) - K ** (1 / p)) / (W - K)
        return s, K ** (1 / p) - K * s
    lo, hi_ = P['power_limit']
    for _ in range(50):                                     # the anchor falls as the power rises
        p = (lo + hi_) / 2
        s, o = so(p)
        if (B * s + o) ** p > B2:
            lo = p
        else:
            hi_ = p
    p = (lo + hi_) / 2 * t.get('power_mul', 1.0)
    s, o = so(p)
    cast = np.clip((np.array(a['cast']) - np.array(h['cast'])) * P['cast'], -P['cast_limit'], P['cast_limit'])
    wb = (-cast * (W - K) / max(a['neutral_luma'] - K, 0.05) + np.array(t.get('wb', [0, 0, 0]), float))   # ACEScct at white
    sc = s * (1 + wb / (W2 - K))
    sat = float(np.clip(1 + (h['chroma'] / max(a['chroma'], 1e-4) - 1) * P['sat'], 1 - P['sat_limit'], 1 + P['sat_limit']))
    sat *= t.get('sat_mul', 1.0)
    return {'slope': [round(float(x), 5) for x in sc], 'offset': [round(float(K ** (1 / p) - K * x), 5) for x in sc],
            'power': [round(p, 5)] * 3, 'sat': round(sat, 4)}


def take_frames(src, step=4, only_t=None):
    """frames of a grade_key's source range as the film uses them (cropped and rescaled where a crop is listed)"""
    path = os.path.join(HERE, src['take'])
    info = probe(path)
    pre = f"crop={src['crop']},scale=992:432:flags=lanczos" if src.get('crop') else None
    W, H = (992, 432) if pre else (info['width'], info['height'])
    if only_t is not None:
        dec = decoder(path, in_matrix(info), pre=pre, ss=only_t, t=0.2)
        return [to_float(f) for f in frames(dec, W, H)][:1]
    dec = decoder(path, in_matrix(info), pre=pre, ss=src["in"], t=src["out"] - src["in"] - 3 / info["fps"])   # stop short of the take's own cut
    return [to_float(f) for i, f in enumerate(frames(dec, W, H)) if i % step == 0 and i >= 2]


def patch(img, rect):
    x0, y0, x1, y1 = rect
    m = img[y0:y1, x0:x1].reshape(-1, 3).mean(0)
    return {'rgb': [round(float(x) * 255, 1) for x in m], 'luma': round(float(luma(m)) * 255, 1),
            'R-B': round(float(m[0] - m[2]) * 255, 1)}


def measure(args):
    data = load_json(args.shots)
    S = data['shots']
    pix = {}
    for key, s in S.items():
        if s.get('passthrough') or not s.get('source'):
            continue
        fr = take_frames(s['source'])
        pix[key] = np.concatenate([f[::2, ::2].reshape(-1, 3) for f in fr])
        s['measured'] = stats(pix[key])
        s['measured']['frames'] = len(fr)
    hero = data['hero']
    for key in pix:
        s = S[key]
        s['cdl'] = ({'slope': [1.0] * 3, 'offset': [0.0] * 3, 'power': [1.0] * 3, 'sat': 1.0} if key == hero and not s.get('trim')
                    else solve_cdl(s['measured'], S[hero]['measured'], s.get('trim')))
        s['matched'] = stats(correct(pix[key], s['cdl']))
        for a in s.get('anchors', []):                         # like-for-like patches, before and after
            f = take_frames(s['source'], only_t=a['t'])[0]
            a['before'] = patch(f, a['rect'])
            a['matched'] = patch(correct(f.reshape(-1, 3), s['cdl']).reshape(f.shape), a['rect'])
        m, c = s['measured'], s['matched']
        print(f"{key:16s} black {m['black_p1']:5.1f}->{c['black_p1']:5.1f}  median {m['median']:5.1f}->{c['median']:5.1f}  "
              f"white {m['white_p99']:5.1f}->{c['white_p99']:5.1f}  neutral R-B {m['neutral_R-B']:+5.1f}->{c['neutral_R-B']:+5.1f}  "
              f"chroma {m['chroma_median']:4.1f}->{c['chroma_median']:4.1f}  clip {m['clipped_pct']:.2f}->{c['clipped_pct']:.2f}%  "
              f"crush {m['crushed_pct']:.2f}->{c['crushed_pct']:.2f}%  cdl s {s['cdl']['slope'][0]:.3f} o "
              f"{s['cdl']['offset']} p {s['cdl']['power'][0]:.3f} sat {s['cdl']['sat']:.3f}")
    with open(args.shots, 'w') as f:
        json.dump(data, f, indent=1)
        f.write('\n')
    print('wrote', args.shots)


# ---------------------------------------------------------------------------------------------------------------
# --board: the look board
# ---------------------------------------------------------------------------------------------------------------
def board(args):
    from PIL import Image, ImageDraw, ImageFont
    info = probe(args.inp)
    W, H, fps = info['width'], info['height'], info['fps']
    shots, looks = load_json(args.shots), load_json(args.looks)
    moments = looks['board']['moments']
    want = {int(round(m['t'] * fps)): m for m in moments}
    keys, _ = timeline(load_json(args.edl), fps, info['nb_frames'], None if args.no_snap else cut_scores(args.inp))
    src = {}
    for n, u16 in enumerate(frames(decoder(args.inp, in_matrix(info, args.in_matrix)), W, H)):
        if n in want:
            src[n] = to_float(u16)
    names = ['source', 'matched'] + list(looks['looks'])
    graders = {nm: Grader(shots, looks, nm, W, H, use_grain=not args.no_grain) for nm in names}
    cell_dir = os.path.join(os.path.dirname(os.path.abspath(args.board)), 'board')
    os.makedirs(cell_dir, exist_ok=True)
    cw = 640
    chh = int(round(cw * H / W))
    pad, head, side = 6, 132, 40
    sheet = Image.new('RGB', (side + len(names) * (cw + pad) + pad, head + len(moments) * (chh + pad) + pad), (24, 24, 24))
    d = ImageDraw.Draw(sheet)

    def font(sz, bold=False):
        for p in (f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if bold else ''}.ttf",):
            if os.path.exists(p):
                return ImageFont.truetype(p, sz)
        return ImageFont.load_default()
    F1, F2, F3 = font(24, True), font(14), font(13)
    titles = {'source': ('SOURCE', 'the ungraded cut'), 'matched': ('MATCHED', 'correction only: every shot pulled toward the hero (Serath, unread); no look, no grain')}
    for c, nm in enumerate(names):
        x = side + pad + c * (cw + pad)
        t, sub = titles.get(nm, (f"{chr(65 + c - 2)}  {looks['looks'].get(nm, {}).get('title', nm)}", looks['looks'].get(nm, {}).get('board_note', '')))
        d.text((x, 12), t, font=F1, fill=(240, 240, 240))
        if nm in looks['looks']:
            d.text((x, 44), f'--look {nm}', font=F3, fill=(150, 190, 150))
        words, line, yy = sub.split(), '', 64
        for w in words:                                          # wrap the note under the title
            if d.textlength(line + ' ' + w, font=F2) > cw - 8:
                d.text((x, yy), line, font=F2, fill=(190, 190, 190))
                line, yy = w, yy + 17
            else:
                line = (line + ' ' + w).strip()
        d.text((x, yy), line, font=F2, fill=(190, 190, 190))
    for r, m in enumerate(moments):
        n = int(round(m['t'] * fps))
        y = head + r * (chh + pad)
        lab = Image.new('RGB', (chh, side), (24, 24, 24))
        ImageDraw.Draw(lab).text((6, 10), f"{m['name']}  ({m['t']:.1f} s, {keys[n]})", font=F2, fill=(220, 220, 220))
        sheet.paste(lab.rotate(90, expand=True), (0, y))
        for c, nm in enumerate(names):
            img = graders[nm].frame(src[n], keys[n], n)
            im = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8))
            im.save(os.path.join(cell_dir, f"{r + 1}_{m['slug']}__{c + 1}_{nm}.jpg"), quality=96, subsampling=0)
            sheet.paste(im.resize((cw, chh), Image.LANCZOS), (side + pad + c * (cw + pad), y))
    sheet.save(args.board, quality=92, subsampling=0)
    print('wrote', args.board, 'and', len(moments) * len(names), 'cells in', cell_dir)


# ---------------------------------------------------------------------------------------------------------------
# --qa: acceptance checks of a render against its source
# ---------------------------------------------------------------------------------------------------------------
SKIN_LINE = 123.0   # vectorscope skin line, degrees from +Cb toward +Cr


def skin(rgb):
    y = float(luma(rgb))
    cb, cr = (rgb[2] - y) / 1.8556, (rgb[0] - y) / 1.5748
    return y, math.degrees(math.atan2(cr, cb)), math.hypot(cb, cr)


def qa(args):
    src_i, out_i = probe(args.inp), probe(args.qa)
    W, H, fps = src_i['width'], src_i['height'], src_i['fps']
    shots = load_json(args.shots)
    akeys, amask = load_json(args.looks).get('accent_keys', {}), {}
    scores = None if args.no_snap else cut_scores(args.inp)
    keys, bounds = timeline(load_json(args.edl), fps, src_i['nb_frames'], scores)
    band = int(round(W / args.matte / 2) * 2) if args.matte else H
    top = (H - band) // 2
    det = None
    model = os.environ.get('YUNET', '')
    try:
        import cv2
        if os.path.exists(model):
            det = cv2.FaceDetectorYN.create(model, '', (W, H), 0.6, 0.3, 50)
    except ImportError:
        pass
    if det is None:
        warn('no OpenCV or no YUNET model: faces are not checked')
    A = frames(decoder(args.inp, in_matrix(src_i, args.in_matrix)), W, H)
    B = frames(decoder(args.qa, in_matrix(out_i)), out_i['width'], out_i['height'])
    seg = {}
    order = []
    for a, b, k in bounds:
        order.append((a, b, k))
    face_at = {}
    for a, b, k in order:
        for q in (0.25, 0.5, 0.75):
            face_at[int(a + (b - a) * q)] = (a, k)
    n = 0
    for fa, fb in zip(A, B):
        k = keys[n] if n < len(keys) else None
        a0 = next((a for a, b, kk in order if a <= n < b), -1)
        if n % 2 == 0 or n in face_at:
            s, o = to_float(fa)[top:top + band], to_float(fb)[top:top + band]
            e = seg.setdefault(a0, {'key': k if a0 >= 0 else '(outside the edit list)', 'start': round((a0 if a0 >= 0 else n) / fps, 3),
                                    'n': 0, 'clip': [0.0, 0.0], 'crush': [0.0, 0.0],
                                    'faces': [], 'small_faces': 0, '_pix': ([], [])})
            if n % 2 == 0:
                for i, im in enumerate((s, o)):
                    e['clip'][i] += float((im.max(-1) >= CLIP).mean() * 100)
                    e['crush'][i] += float((luma(im) <= CRUSH).mean() * 100)
                    if n % 6 == 0:
                        e['_pix'][i].append(im[::3, ::3].reshape(-1, 3))
                e['n'] += 1
            if det is not None and n in face_at and k in shots['shots'] and not shots['shots'][k].get('passthrough'):
                full = to_float(fa)
                bgr = (full[..., ::-1] * 255 + 0.5).astype(np.uint8)
                _, found = det.detect(np.ascontiguousarray(bgr))
                # no accent may reach into a face: every detection, however weak, against every key of the shot
                acc = [a for a in shots['shots'][k].get('accents', []) if a['key'] in akeys]
                if acc and found is not None:
                    matched = correct(full.reshape(-1, 3), shots['shots'][k].get('cdl'))
                    for a in acc:
                        kd = dict(akeys[a['key']], **a.get('key_override', {}))
                        if (k, a['key']) not in amask:
                            m, (y0, y1, x0, x1) = region_mask(a.get('region'), a.get('feather', 16), W, H, a.get('exclude'))
                            amask[(k, a['key'])] = np.zeros((H, W), np.float32)
                            amask[(k, a['key'])][y0:y1, x0:x1] = 1 if m is None else m
                        q = soften(qualify(matched, kd).reshape(H, W), kd.get('soften', 0)) * amask[(k, a['key'])]
                        for row in found:
                            x, yy, w, h = (int(v) for v in row[:4])
                            e['accent_px_in_faces'] = e.get('accent_px_in_faces', 0) + int((q[max(yy, 0):yy + h, max(x, 0):x + w] > 0.02).sum())
                    e['accent_faces_checked'] = e.get('accent_faces_checked', 0) + len(found)
                for row in (found if found is not None else []):
                    x, yy, w, h = (int(v) for v in row[:4])
                    x0, x1, y0, y1 = max(x + w // 4, 0), x + 3 * w // 4, max(yy + h // 4, 0), yy + 3 * h // 4
                    if x1 <= x0 or y1 <= y0 or y0 < top or y1 > top + band:
                        continue
                    if w < 16 and row[14] >= 0.8:           # a face under 16 px: its centre is a few dozen pixels of grain
                        e['small_faces'] += 1
                        continue
                    ps = full[y0:y1, x0:x1].reshape(-1, 3).mean(0)
                    po = to_float(fb)[y0:y1, x0:x1].reshape(-1, 3).mean(0)
                    ys, hs, cs = skin(ps)
                    yo, ho, co = skin(po)
                    name = next((f['name'] for f in shots['shots'][k].get('faces', []) if f['x'][0] <= x + w / 2 <= f['x'][1]), '')
                    e['faces'].append({'frame': n, 'name': name, 'score': round(float(row[14]), 2), 'box': [x, yy, w, h],
                                       'luma': [round(ys, 3), round(yo, 3)], 'hue': [round(hs, 1), round(ho, 1)],
                                       'hue_shift': round((ho - hs + 180) % 360 - 180, 1),
                                       'off_skin_line': [round(abs(hs - SKIN_LINE), 1), round(abs(ho - SKIN_LINE), 1)],
                                       'chroma': [round(cs * 255, 1), round(co * 255, 1)]})
        n += 1
    rows, fails = [], []
    for a0 in sorted(seg):
        e = seg[a0]
        for f in ('clip', 'crush'):
            e[f] = [round(x / max(e['n'], 1), 3) for x in e[f]]
        pix = e.pop('_pix')
        e['stats'] = {}
        for i, nm in enumerate(('source', 'graded')):
            st = stats(np.concatenate(pix[i]))
            st.pop('acescct')
            e['stats'][nm] = st
        for f in ('black_p1', 'median', 'white_p99'):
            e[f] = [e['stats']['source'][f], e['stats']['graded'][f]]
        prob = []
        graded = e['key'] in shots['shots'] and not shots['shots'][e['key']].get('passthrough')
        if e['clip'][1] > e['clip'][0] + 0.3:
            prob.append(f"clipping grew {e['clip'][0]:.2f} -> {e['clip'][1]:.2f}%")
        if e['crush'][1] > e['crush'][0] + 0.5:
            prob.append(f"crushing grew {e['crush'][0]:.2f} -> {e['crush'][1]:.2f}%")
        if e.get('accent_px_in_faces', 0) > 0:
            prob.append(f"an accent key reaches {e['accent_px_in_faces']} pixels inside faces")
        for f in e['faces']:
            if f['score'] < 0.8:
                continue                                    # backs of heads, hands, blurred passers-by
            lo_src, hi_src = f['luma'][0] < 0.18, f['luma'][0] > 0.88
            if (f['luma'][1] < 0.18 and (not lo_src or f['luma'][1] < f['luma'][0] - 0.01)) or \
                    (f['luma'][1] > 0.88 and (not hi_src or f['luma'][1] > f['luma'][0] + 0.01)):
                prob.append(f"face {f['name'] or f['box']} luma {f['luma'][0]:.2f} -> {f['luma'][1]:.2f} at frame {f['frame']}")
            elif lo_src or hi_src:
                e.setdefault('notes', []).append(f"face {f['name'] or f['box']} is outside 0.18-0.88 in the source ({f['luma'][0]:.2f}) and is not taken further ({f['luma'][1]:.2f})")
            b4, af = f['off_skin_line']
            if af > 8 and af > b4 + 3:
                prob.append(f"skin {f['name'] or f['box']} moved off the skin line {b4:.1f} -> {af:.1f} deg at frame {f['frame']}")
        e['problems'] = prob
        rows.append(e)
        if prob:
            fails.append(e['key'])
        real = [f for f in e['faces'] if f['score'] >= 0.8]
        print(f"{str(e['key']):16s} {e['start']:6.2f}s  clip {e['clip'][0]:5.2f}->{e['clip'][1]:5.2f}%  crush {e['crush'][0]:5.2f}->{e['crush'][1]:5.2f}%  "
              f"black {e['black_p1'][0]:5.1f}->{e['black_p1'][1]:5.1f}  median {e['median'][0]:5.1f}->{e['median'][1]:5.1f}  white {e['white_p99'][0]:5.1f}->{e['white_p99'][1]:5.1f}  "
              f"neutral R-B {e['stats']['source']['neutral_R-B']:+5.1f}->{e['stats']['graded']['neutral_R-B']:+5.1f}  "
              f"chroma {e['stats']['source']['chroma_median']:4.1f}->{e['stats']['graded']['chroma_median']:4.1f}  "
              f"faces {len(real)} (+{e['small_faces']} under 16 px)  {'; '.join(prob) or ('ok' if graded else 'passed through')}", flush=True)
        for f in real:
            print(f"      face {f['name'] or '?':10s} frame {f['frame']:4d} score {f['score']:.2f}  luma {f['luma'][0]:.3f}->{f['luma'][1]:.3f}  "
                  f"hue {f['hue'][0]:6.1f}->{f['hue'][1]:6.1f} ({f['hue_shift']:+.1f} deg; off the skin line {f['off_skin_line'][0]:.1f}->{f['off_skin_line'][1]:.1f})  "
                  f"chroma {f['chroma'][0]:.1f}->{f['chroma'][1]:.1f}")
    tags = [out_i.get(k, 'unknown') for k in ('color_space', 'color_primaries', 'color_transfer', 'color_range')]
    res = {'source': os.path.relpath(args.inp, HERE), 'render': os.path.relpath(args.qa, HERE),
           'frames': [src_i['nb_frames'], out_i['nb_frames']], 'frames_ok': src_i['nb_frames'] == out_i['nb_frames'] == n,
           'fps': [src_i['fps_str'], out_i['fps_str']], 'size': [[W, H], [out_i['width'], out_i['height']]],
           'duration': [src_i['duration'], out_i['duration']], 'tags': tags, 'tags_ok': tags == ['bt709', 'bt709', 'bt709', 'tv'],
           'codec': [out_i.get('codec_name'), out_i.get('pix_fmt')], 'faces_checked': det is not None,
           'shots': rows, 'failing': fails}
    print(f"frames {src_i['nb_frames']} -> {out_i['nb_frames']} ({'ok' if res['frames_ok'] else 'WRONG'}); {out_i['fps_str']} fps; "
          f"{out_i['width']}x{out_i['height']}; tags {'/'.join(tags)} ({'ok' if res['tags_ok'] else 'WRONG'}); "
          f"{len(rows)} shots, {len(fails)} with problems: {fails}")
    if args.report:
        with open(args.report, 'w') as f:
            json.dump(res, f, indent=1)
            f.write('\n')
        print('wrote', args.report)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--in', dest='inp', help='the ungraded picture')
    ap.add_argument('--edl', help='edl.json with a top-level list "picture" of {start, duration, grade_key}')
    ap.add_argument('--look', help='a look of grade/looks.json, or "matched" (correction only) or "source"')
    ap.add_argument('--out', help='the graded mp4 (video only)')
    ap.add_argument('--matte', type=float, default=None, help='aspect of the black matte, e.g. 2.39')
    ap.add_argument('--no-grain', action='store_true')
    ap.add_argument('--shots', default=SHOTS)
    ap.add_argument('--looks', default=LOOKS)
    ap.add_argument('--threads', type=int, default=2, help='threads for the encoder (default 2: a shared machine)')
    ap.add_argument('--in-matrix', default='auto', choices=['auto', 'bt601', 'bt709'],
                    help='YCbCr matrix of an untagged input (auto: its tag, else BT.601 under 720 rows, as ffmpeg and players read it)')
    ap.add_argument('--no-snap', action='store_true', help='do not move EDL boundaries onto the picture\'s own cuts')
    ap.add_argument('--measure', action='store_true', help='measure the source takes and solve the CDLs into shots.json')
    ap.add_argument('--board', metavar='JPG', help='write the look board from --in/--edl')
    ap.add_argument('--qa', metavar='GRADED', help='check a render against --in/--edl')
    ap.add_argument('--report', help='with --qa: write the results as json')
    args = ap.parse_args()
    if args.measure:
        return measure(args)
    if not args.inp or not args.edl:
        ap.error('--in and --edl are required')
    if args.board:
        return board(args)
    if args.qa:
        return qa(args)
    if not args.look or not args.out:
        ap.error('--look and --out are required')
    render(args)


if __name__ == '__main__':
    main()
