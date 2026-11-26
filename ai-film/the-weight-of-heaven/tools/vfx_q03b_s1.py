#!/usr/bin/env python3
"""Q03B take 1, shot 1 as a composite: the slab comes out of the MOUNTAIN. Editing only; nothing is generated.

The author, 26 November: the rock that fell from above "should come from that mountain ... the same way it's done
via VFX". As generated, a square block drops out of the mass overhead, stands against the Anvil, cracks and
collapses. This rebuilds the shot from the take's own pixels (the camera is locked off):

  A  0.00-0.83 s  the mountain, intact; dust sifting at the rim (the take's first frames, held)
  B  0.83-1.42 s  a crack runs down the cliff, top to bottom, on both sides of a section of the face; dust at the rim
  C  1.42-2.00 s  the section lets go: the cliff's own face (the clean plate inside a ragged matte) slips down under
                  its weight, leans out and falls into its own shadow; a pale scar opens above it; the dust at its foot
                  is the take's own dust
  X  2.00-2.17 s  four frames of dissolve onto the take
  D  2.17-3.50 s  the take: the section cracks through, breaks into boulders and comes down, the dust blooms and the
                  farmer runs. The sky above the rim is kept empty throughout, so nothing connects the rock to the mass
                  overhead; the scar stays at the top; the section's straight edges are broken up until it crumbles.

The mountain was mirror-symmetric (my opening-frame reference was). Two things undo it: the right-hand third is
re-proportioned (the mesa ends sooner and its rim falls a little), and the right-hand half is given the left-hand
half's rock detail moved across instead of reflected.

  python3 tools/vfx_q03b_s1.py      ->  out/edits/Q03B_t1_vfx.mp4   (shots 2 and 3 as generated; sound: tools/mix_q03b.py)
"""
import math, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, 'out/takes/Q03B_t1.mp4')
DST = os.path.join(HERE, 'out/edits/Q03B_t1_vfx.mp4')
W, H, FPS = 992, 432, 24
S2, END = 102, 289                  # first frame of shot 2; frames in the take
X0, X1, YT, YB = 382, 602, 85, 347  # the section of the face: its sides, the rim above it, the ground at its foot
TAKE_IN = 66                        # the take is joined where the block stands whole and is about to crack (it cracks at 72)
NA, NB, NC, NX = 20, 14, 14, 4      # frames in phases A, B, C and the dissolve
SLIP = 28.0                         # how far the section slips before it breaks (px)
TONE = 0.73                         # the take's block is this much darker than the cliff
LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
rng = np.random.default_rng(12)


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def blur(a, sigma):
    if a.ndim == 3:
        return np.stack([blur(a[..., c], sigma) for c in range(a.shape[2])], -1)
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(sigma))).astype(np.float32) / 255


def to_img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def ragged(x, y0, y1, step=13, amp=6.0, seed=0):
    """A broken edge: points down a line at about x, wandering by amp."""
    r = np.random.default_rng(seed)
    ys = list(range(y0, y1, step)) + [y1]
    off = np.cumsum(r.normal(0, amp * 0.45, len(ys))); off -= np.linspace(off[0], off[-1], len(ys)); off = np.clip(off, -amp, amp)
    return [(x + float(o), float(y)) for o, y in zip(off, ys)]


LEFT = ragged(X0, YT - 2, YB + 3, step=7, amp=7.0, seed=3)
RIGHT = ragged(X1, YT - 2, YB + 3, step=7, amp=7.0, seed=4)
_r = np.random.default_rng(9)
TOP = [(float(px), YT - 2 + float(_r.uniform(-2.5, 3.5))) for px in range(X0 + 14, X1 - 8, 16)]
INNER = [ragged(461, YT + 6, 214, step=7, amp=10, seed=5), ragged(531, YT + 40, 268, step=7, amp=10, seed=6)]


def slab_matte():
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(LEFT + RIGHT[::-1] + TOP[::-1], fill=255)       # down the left, up the right, back along the ragged top
    return np.asarray(m.filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255


def crack_map(progress, inner=1.0, width=2):
    """The cracks as fissures, not lines: broken in width and depth, drawn as far down the cliff as `progress`
    (0..1) has reached."""
    r = np.random.default_rng(21)
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for ln in (LEFT, RIGHT):
        for (p0, p1) in zip(ln[:-1], ln[1:]):
            d.line([p0, p1], fill=int(r.uniform(110, 235)), width=int(r.choice([1, 1, 2, width])))
    if inner > 0:
        for ln in INNER:
            for (p0, p1) in zip(ln[:-1], ln[1:]):
                if r.uniform() < 0.8:
                    d.line([p0, p1], fill=int(r.uniform(60, 150) * inner), width=1)
    a = np.asarray(m.filter(ImageFilter.GaussianBlur(0.7))).astype(np.float32) / 255
    y = np.arange(H, dtype=np.float32)[:, None]
    reach = YT + progress * (YB - YT + 12)
    return a * (1 - smooth(y, reach - 14, reach + 2))


def puffs(points, size, seed, n=3):
    """Soft dust: a few blurred discs round each point. Returns alpha 0..1."""
    r = np.random.default_rng(seed)
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for (px, py) in points:
        for _ in range(n):
            x = px + r.normal(0, size * 0.5); y = py + r.normal(0, size * 0.35); s = size * r.uniform(0.5, 1.0)
            d.ellipse((x - s * 1.4, y - s, x + s * 1.4, y + s), fill=int(r.uniform(120, 230)))
    return np.asarray(m.filter(ImageFilter.GaussianBlur(size * 0.45))).astype(np.float32) / 255


DUST = np.array([0.50, 0.475, 0.45], dtype=np.float32)


def demirror_maps():
    """Where each output pixel of the right-hand third is read from: the mesa ends about 40 px sooner and its rim
    falls by up to 6 % of the cliff's height toward the right. Identity left of x = 640."""
    XA, c, h, YG = 640.0, 0.72, 0.06, 346.0
    x = np.arange(W, dtype=np.float32)[None, :].repeat(H, 0); y = np.arange(H, dtype=np.float32)[:, None].repeat(W, 1)
    t = np.clip((x - XA) / (W - XA), 0, 1)
    sx = np.where(x > XA, XA + (W - XA) * (t + c * t * t * (1 - t)), x)
    k = 1 - h * smooth(t, 0, 1)
    sy = np.where((x > XA) & (y < YG), YG - (YG - y) / k, y)
    return np.clip(sx, 0, W - 1.001), np.clip(sy, 0, H - 1.001)


def remap(f, sx, sy):
    x0 = np.floor(sx).astype(np.int32); y0 = np.floor(sy).astype(np.int32)
    fx = (sx - x0)[..., None]; fy = (sy - y0)[..., None]
    return (f[y0, x0] * (1 - fx) * (1 - fy) + f[y0, x0 + 1] * fx * (1 - fy) + f[y0 + 1, x0] * (1 - fx) * fy + f[y0 + 1, x0 + 1] * fx * fy)


def main():
    os.makedirs(os.path.dirname(DST), exist_ok=True)
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
    src = np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3)
    assert len(src) == END, len(src)
    F = lambda i: src[i].astype(np.float32) / 255
    plate = np.median(np.stack([F(i) for i in range(0, 9)]), axis=0)            # the mountain, intact
    y = np.arange(H, dtype=np.float32)[:, None]; x = np.arange(W, dtype=np.float32)[None, :]

    # the sky above the rim, kept empty (the block came down through it)
    above = ((1 - smooth(y, 76, 89)) * smooth(x, 230, 290) * (1 - smooth(x, 700, 760))).astype(np.float32)
    above = blur(above, 1.5)[..., None]
    keep_sky = lambda f: f * (1 - above) + plate * above

    Ms = slab_matte()[..., None]
    # the scar: fresh, paler rock, cut from deeper in the same cliff, with the overhang's shadow along its top
    scar = np.roll(plate, (-74, 23), axis=(0, 1)) * 1.30 + 0.035               # rows from lower down the same cliff
    scar = scar * 0.75 + (scar @ LUMA)[..., None] * np.array([1.04, 1.0, 0.95], dtype=np.float32) * 0.25
    scar = scar * (0.72 + 0.28 * smooth(y, YT + 2, YT + 12))[..., None]        # a little of the overhang's shadow along its top
    _n = np.random.default_rng(17).normal(0, 1, (2, W)).astype(np.float32)                     # the scar's broken lower edge:
    _k = lambda v, s: np.convolve(v, np.exp(-0.5 * (np.arange(-4 * s, 4 * s + 1) / s) ** 2), 'same')   # irregular, not a wave
    wob = (7 * _k(_n[0], 7) / np.abs(_k(_n[0], 7)).max() + 3 * _k(_n[1], 2) / np.abs(_k(_n[1], 2)).max())[None, :]
    dark = np.array([0.035, 0.038, 0.045], dtype=np.float32)                   # the depth of an open crack

    hold = lambda n: F([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2, 1][n % 18])

    def slab_layer(u):
        """The section of the face, slipped by u (0..1): returns its picture and its matte where it now is."""
        d = SLIP * u * u; s = 1 - 0.014 * u; sh = 0.012 * u; cx = (X0 + X1) / 2
        co = (1 / s, sh, cx - cx / s - sh * YB, 0.0, 1.0, -d)                   # output (x, y) -> source (x, y)
        pic = np.asarray(to_img(plate).transform((W, H), Image.AFFINE, co, resample=Image.BICUBIC)).astype(np.float32) / 255
        mat = np.asarray(Image.fromarray((Ms[..., 0] * 255).astype(np.uint8)).transform((W, H), Image.AFFINE, co, resample=Image.BILINEAR)).astype(np.float32) / 255
        mat = mat * (1 - smooth(y, YB - 2, YB + 3))                             # its foot goes into the ground and the dust
        tone = 1 - (1 - TONE) * u ** 1.2
        return pic * tone, mat[..., None]

    rim_pts = [(px, YT - 4) for px in range(X0 + 10, X1, 34)]
    edge_pts = [(X0, yy) for yy in range(YT + 30, YB - 30, 62)] + [(X1, yy) for yy in range(YT + 50, YB - 30, 62)]

    def let_go(n, k):
        """Phase C, frame k of NC: the section slipping, over the held mountain."""
        u = (k + 1) / NC
        out = hold(n)
        top = (1 - smooth(y, YT + SLIP * u * u + 2 + wob * 0.3, YT + SLIP * u * u + 10 + wob * 0.3))[..., None]
        behind = scar * top + dark * (1 - top)                                  # above it the scar; at its sides the dark of the crack
        m_b = Ms * (1 - smooth(y, YB - 46, YB - 14))[..., None]                 # nothing shows behind it at its foot
        out = out * (1 - m_b) + behind * m_b
        pic, mat = slab_layer(u)
        out = out * (1 - mat) + pic * mat
        ck = crack_map(1.0, inner=1.0, width=2 + int(2 * u))[..., None]
        out = out * (1 - 0.6 * ck) + dark * 0.6 * ck
        a = np.clip(puffs(rim_pts, 9 + 8 * u, 31, 3) * (0.25 + 0.5 * u) + puffs(edge_pts, 7 + 9 * u, 32, 3) * 0.45 * u, 0, 1)[..., None]
        out = out * (1 - a) + DUST * a
        t = F(52 + k)                                                           # the dust at its foot: the take's own
        key = (smooth((t @ LUMA) - (plate @ LUMA), 0.04, 0.14) * smooth(y, 250, 275))[..., None]
        return out * (1 - key) + t * key

    def from_take(i):
        """Phase D: the take, with the sky kept empty, the scar at the top and the straight edges broken up."""
        f = keep_sky(F(i)); lum = f @ LUMA
        band = smooth(y, YT - 1 + wob * 0.25, YT + 5 + wob * 0.25) * (1 - smooth(y, YT + SLIP - 8 + wob, YT + SLIP + wob))
        a = (Ms[..., 0] * band * (1 - smooth(lum, 0.27, 0.38)))[..., None]      # pale dust and rubble pass in front of it
        f = f * (1 - a) + scar * a
        fade = 1 - smooth(i, 70, 77)
        if fade > 0:
            rect = smooth(x, X0 - 12, X0 - 6) * (1 - smooth(x, X1 + 6, X1 + 12)) * smooth(y, YT, YT + 4) * (1 - smooth(y, 285, 305))
            e = ((1 - Ms[..., 0]) * rect * fade)[..., None]
            f = f * (1 - e) + plate * e
            ck = (crack_map(1.0, inner=0.0, width=3) * fade)[..., None]
            f = f * (1 - 0.45 * ck) + dark * 0.45 * ck
        return f

    frames = []
    for n in range(NA):                                                         # A: the mountain
        frames.append(keep_sky(hold(n)))
    for k in range(NB):                                                         # B: the crack
        u = (k + 1) / NB
        out = keep_sky(hold(NA + k))
        ck = crack_map(u, inner=smooth(u, 0.45, 1.0), width=2)[..., None]
        out = out * (1 - 0.6 * ck) + dark * 0.6 * ck
        a = (puffs(rim_pts, 8, 31, 3) * 0.3 * u)[..., None]
        frames.append(out * (1 - a) + DUST * a)
    for k in range(NC):                                                         # C: it lets go
        frames.append(keep_sky(let_go(NA + NB + k, k)))
    last = frames[-1]
    for k in range(NX):                                                         # X: onto the take
        a = (k + 1) / (NX + 1)
        frames.append(last * (1 - a) + from_take(TAKE_IN + k) * a)
    for i in range(TAKE_IN + NX, S2):                                           # D: it breaks and falls
        frames.append(from_take(i))
    n1 = len(frames)

    # The two halves of the mountain carried the same rock, mirrored. Give the right-hand half the left-hand half's
    # rock, moved across rather than reflected: only the fine detail is exchanged, and only where the picture is
    # still the untouched mountain (not the section, the rubble or the dust).
    soft = blur(plate, 9.0); detail = plate - soft
    moved = np.roll(detail, 412, axis=1) * 1.0
    half = (smooth(x, 560, 640) * (1 - smooth(x, 915, 940)) * smooth(y, 92, 102) * (1 - smooth(y, 285, 305)))[..., None]   # the cliff only: not the sky, not the field or the man

    def unmirror(f):
        still = (1 - smooth(np.abs((f @ LUMA) - (plate @ LUMA)), 0.025, 0.07))[..., None]
        return f + (moved - detail) * half * still

    sx, sy = demirror_maps()
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-an', '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', DST], stdin=subprocess.PIPE)
    for f in frames:
        f = remap(np.clip(unmirror(f), 0, 1), sx, sy)
        f = f + rng.normal(0, 0.004, (H, W, 1)).astype(np.float32)             # one grain over the composite
        enc.stdin.write((np.clip(f, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
    for i in range(S2, END):
        enc.stdin.write(src[i].tobytes())
    enc.stdin.close(); enc.wait()
    total = n1 + END - S2
    print(f'{DST}: {total} frames, {total / FPS:.2f} s; shot 1 is {n1} frames ({n1 / FPS:.2f} s); shot 2 at {n1 / FPS:.3f} s, shot 3 at {(n1 + 177 - S2) / FPS:.3f} s')


if __name__ == '__main__':
    main()
