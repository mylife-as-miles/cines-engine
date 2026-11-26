#!/usr/bin/env python3
"""Q04 (the council: three days later) storyboard and its opening frame. Nothing generated, nothing paid.

Every picture is assembled from the film's own material: the still cup that ends movement I (take Q02 t1,
24.75-26.04 s, the frames the cut uses), the council chamber reference (ENV_E02) and the locked character sheets.
The figures are cut-outs from the sheets, so sizes and positions are staging sketches, not finished frames.

Run with earshot's Python (it has numpy, scipy and Pillow):
    /root/leonxlnx/earshot/.venv/bin/python tools/board_q04.py

Writes
  refs/frames/Q04_open_cup.jpg     shot 1's first frame: the same cup, the same framing as the still cup, now on the
                                   council table with the Chancellor standing behind it (sent as a reference)
  design/boards/Q04_board.jpg      the storyboard, eight frames (six shots, 24 s)
"""
import io, math, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
W, H = 992, 432
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; REG = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
GOLD, INK, PAPER = (214, 170, 96), (16, 17, 20), (232, 232, 232)
SHEET = {'serath': 'refs/CHAR_C01_serath.jpg', 'cassiel': 'refs/CHAR_C04_cassiel.jpg', 'hierophant': 'refs/CHAR_C05_hierophant.jpg',
         'chancellor': 'refs/CHAR_C06_chancellor.jpg', 'engineer': 'refs/CHAR_C08_engineer.jpg'}
EK = 3276 / 1800.0                    # positions below are in the 1800-wide viewing copy of ENV_E02


def img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def arr(im):
    return np.asarray(im.convert('RGB')).astype(np.float32) / 255


def blur(a, s):
    return ndimage.gaussian_filter(a, (s, s, 0)) if s > 0 else a


# ------------------------------------------------------------------ cut-outs from the character sheets
def panel(who, i):
    im = Image.open(P(SHEET[who])).convert('RGB'); w, h = im.size
    return im.crop((i * w // 3, 0, (i + 1) * w // 3, h))


_cache = {}
TRIM_LEFT = {('cassiel', 0): 0.53}


def cut(who, i):
    """One panel of a sheet (0 front, head omitted; 1 rear; 2 face) keyed off its grey backdrop: RGBA floats, cropped."""
    if (who, i) in _cache:
        return _cache[(who, i)]
    a = arr(panel(who, i)); luma = a @ np.array([0.299, 0.587, 0.114], np.float32)
    sat = (a.max(2) - a.min(2)) / np.maximum(a.max(2), 1e-3)
    hh, ww = luma.shape
    edge = np.concatenate([luma[:, :36], luma[:, -36:]], 1); es = np.concatenate([sat[:, :36], sat[:, -36:]], 1)
    ok = (es < 0.08) & (edge > 0.30) & (edge < 0.64)
    rows = np.where(ok.mean(1) > 0.6)[0]
    med = np.array([np.median(edge[r][ok[r]]) for r in rows])
    bg = np.polyval(np.polyfit(rows, med, 2), np.clip(np.arange(hh), rows.min(), rows.max()))[:, None]
    m = (luma - bg > 0.085) | (luma - bg < -0.17) | (sat > 0.14)            # brighter, much darker (not a floor shadow), or coloured
    m = ndimage.binary_opening(m, iterations=2)
    lab, n = ndimage.label(m)
    size = ndimage.sum(m, lab, np.arange(1, n + 1))
    m = np.isin(lab, np.where(size > 0.02 * size.max())[0] + 1)
    m = ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=4))
    al = ndimage.gaussian_filter(m.astype(np.float32), 1.3)
    ys, xs = np.where(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    out = np.dstack([a, al])[y0:y1, x0:x1]
    if (who, i) in TRIM_LEFT:                                                     # a shadow thrown on the backdrop beside the figure
        out = out[:, int(out.shape[1] * TRIM_LEFT[(who, i)]):]
    _cache[(who, i)] = out
    return out


def over(base, rgba, cx, foot, height, soft=0.0, gain=1.0, clip_below=None, clip_right=None):
    """Lay a cut-out over a frame: its feet (bottom) at `foot`, its centre at `cx`, `height` px tall."""
    k = height / rgba.shape[0]
    w = max(2, int(round(rgba.shape[1] * k))); h = max(2, int(round(height)))
    im = Image.fromarray((np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').resize((w, h), Image.LANCZOS)
    c = np.asarray(im).astype(np.float32) / 255
    if soft:
        c = ndimage.gaussian_filter(c, (soft, soft, 0))
    x0 = int(round(cx - w / 2)); y0 = int(round(foot - h))
    bh, bw = base.shape[:2]
    xa, xb, ya, yb = max(0, x0), min(bw, x0 + w), max(0, y0), min(bh, y0 + h)
    if clip_below is not None:
        yb = min(yb, int(clip_below))
    if clip_right is not None:
        xb = min(xb, int(clip_right))
    if xa >= xb or ya >= yb:
        return base
    s = c[ya - y0:yb - y0, xa - x0:xb - x0]
    a = s[..., 3:4]
    base[ya:yb, xa:xb] = base[ya:yb, xa:xb] * (1 - a) + np.clip(s[..., :3] * gain, 0, 1) * a
    return base


def head(base, cx, top, size, skin, hair, hat=0.0, soft=0.0):
    """A plain sketched head for the front views, whose sheets omit it: skin, hair, and for the Hierophant his tall cap."""
    im = img(base); d = ImageDraw.Draw(im, 'RGBA')
    w = size * 0.78
    if hat:
        d.rounded_rectangle((cx - w * 0.52, top - hat, cx + w * 0.52, top + size * 0.30), radius=int(w * 0.12), fill=(236, 235, 232, 255))
    d.ellipse((cx - w / 2, top, cx + w / 2, top + size), fill=tuple(int(v * 255) for v in skin) + (255,))
    if not hat:
        d.pieslice((cx - w / 2 - 1, top - 1, cx + w / 2 + 1, top + size * 0.95), 180, 360, fill=tuple(int(v * 255) for v in hair) + (255,))
    out = arr(im)
    if soft:
        out = blur(out, soft) * 0.6 + out * 0.4
    return out


def skin_of(who):
    f = cut(who, 2); hh, ww = f.shape[:2]
    reg = f[int(hh * 0.38):int(hh * 0.55), int(ww * 0.38):int(ww * 0.62), :3].reshape(-1, 3)
    return tuple(np.median(reg, 0))


# ------------------------------------------------------------------ the chamber
_E = None


def chamber(x0, y0, x1, soft=0.0, size=(W, H)):
    """A crop of ENV_E02 at the frame's shape. x0, y0, x1 in the 1800-wide copy's pixels."""
    global _E
    if _E is None:
        _E = Image.open(P('refs/ENV_E02_council-chamber.jpg')).convert('RGB')
    hgt = (x1 - x0) * size[1] / size[0]
    box = tuple(int(round(v * EK)) for v in (x0, y0, x1, y0 + hgt))
    a = arr(_E.crop(box).resize(size, Image.LANCZOS))
    return blur(a, soft)


def mist(a, cx, cy, rx, ry, seed, n=22, amount=0.55, tone=(0.86, 0.87, 0.89)):
    """Cloud coming in: soft pale blobs."""
    rng = np.random.default_rng(seed)
    hh, ww = a.shape[:2]; yy, xx = np.mgrid[0:hh, 0:ww]
    m = np.zeros((hh, ww), np.float32)
    for _ in range(n):
        x = cx + rng.normal(0, rx * 0.5); y = cy + rng.normal(0, ry * 0.45); r = rng.uniform(0.25, 0.6) * ry
        m = np.maximum(m, np.exp(-(((xx - x) / (r * 2.2)) ** 2 + ((yy - y) / r) ** 2)))
    m = ndimage.gaussian_filter(m, 6)[..., None] * amount
    return a * (1 - m) + np.array(tone, np.float32) * m


# ------------------------------------------------------------------ shot 1: the opening frame
def still_cup():
    """The still cup as the cut shows it: the median of the frames used (the shot is locked off), so no noise."""
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', P('out/takes/Q02_t1.mp4'), '-vf', "select='between(n,594,625)'", '-vsync', '0',
                        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
    f = np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3).astype(np.float32) / 255
    return np.median(f, 0)


EDGE = 244                             # the marble's far edge in the still-cup frame (row)
_d = np.hypot(*np.mgrid[-3:4, -3:4]); DISK = _d <= 3.2


def cup_matte(a):
    """The cup where it stands above the marble's far edge, cut so that none of the wedding's background comes with it.

    The core is what is certainly cup: strongly gold pixels, and the wine they enclose. The pale highlights along the
    rim's lip are not strongly gold, so the core is grown by up to three pixels, only into bright warm pixels, and
    never past the core's own convex hull (a bowl seen from above is convex). Then it is drawn in by one pixel."""
    from scipy.spatial import ConvexHull
    luma = a @ np.array([0.299, 0.587, 0.114], np.float32)
    sat = (a.max(2) - a.min(2)) / np.maximum(a.max(2), 1e-3)
    box = np.zeros(luma.shape, bool); box[20:EDGE + 8, 330:665] = True
    core = (sat > 0.22) & (a[..., 0] > a[..., 2] + 0.09) & box
    core = ndimage.binary_opening(core, iterations=1)
    lab, n = ndimage.label(core)
    size = ndimage.sum(core, lab, np.arange(1, n + 1))
    core = lab == (int(np.argmax(size)) + 1)
    core = ndimage.binary_fill_holes(ndimage.binary_closing(core, iterations=2))
    ys, xs = np.where(core)
    pts = np.column_stack([xs, ys]).astype(np.float64)
    hull = pts[ConvexHull(pts).vertices]
    k = 4
    im = Image.new('L', (W * k, H * k), 0)
    ImageDraw.Draw(im).polygon([(float(x) * k + k / 2, float(y) * k + k / 2) for x, y in hull], fill=255)
    hullm = np.asarray(im.resize((W, H), Image.LANCZOS)).astype(np.float32) / 255 > 0.5
    warm = (luma > 0.55) & (sat > 0.07) & (a[..., 0] >= a[..., 2]) & hullm & box
    m = core.copy()
    for _ in range(3):
        m |= ndimage.binary_dilation(m) & warm
    m = ndimage.binary_fill_holes(m)
    # the rim is an ellipse: fit one to the outline from the top of the rim down to its widest row, and use it there
    rows = np.where(m.any(1))[0]
    lo = np.array([np.where(m[r])[0].min() for r in rows]); hi = np.array([np.where(m[r])[0].max() for r in rows])
    wide = rows[int(np.argmax(ndimage.uniform_filter1d((hi - lo).astype(np.float32), 5)))]
    sel = rows <= wide
    px = np.concatenate([lo[sel], hi[sel]]).astype(np.float64); py = np.concatenate([rows[sel], rows[sel]]).astype(np.float64)
    cx0, cy0, sc = px.mean(), py.mean(), 100.0
    for _ in range(3):                                                             # fit, drop the worst points, fit again
        u, v = (px - cx0) / sc, (py - cy0) / sc
        M = np.column_stack([u * u, u * v, v * v, u, v])
        coef = np.linalg.lstsq(M, np.ones(len(u)), rcond=None)[0]
        res = np.abs(M @ coef - 1)
        keep = res <= np.quantile(res, 0.85)
        px, py = px[keep], py[keep]
    yy, xx = np.mgrid[0:H, 0:W]
    u, v = (xx - cx0) / sc, (yy - cy0) / sc
    ell = (coef[0] * u * u + coef[1] * u * v + coef[2] * v * v + coef[3] * u + coef[4] * v) <= 1.0
    top = yy <= wide
    cols = np.where(ell.any(0))[0]                                                # below its widest row a bowl is never wider than its rim
    inside = (xx >= cols.min() + 1) & (xx <= cols.max() - 1)
    m = (ell & top) | (m & ~top & inside)
    m = ndimage.binary_closing(ndimage.binary_opening(m, structure=DISK), structure=DISK)
    m = ndimage.gaussian_filter(m.astype(np.float32), 2.0) > 0.5                   # round off what is left of any step
    return ndimage.binary_erosion(m, iterations=1)


def open_cup(scale=2):
    """Shot 1's first frame, at twice the take's size: the cup and the marble are the take's own pixels; behind the
    table's far edge, in place of the wedding guests, the Chancellor's white coat and, far and soft, the arcade."""
    a = still_cup()
    keep = cup_matte(a)
    keep[EDGE:, :] = True                                                         # the marble and everything on it
    big = (W * scale, H * scale)
    src = arr(img(a).resize(big, Image.LANCZOS))
    al = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).resize(big, Image.LANCZOS)).astype(np.float32) / 255
    al = np.clip(ndimage.gaussian_filter(al, 1.6) * 1.15 - 0.075, 0, 1)[..., None]
    # far: the foot of the arcade under cloud, well out of focus; a little greyer and cooler than the wedding
    far = chamber(640, 430, 1100, soft=0, size=big)
    far = blur(far, 15 * scale)
    far = far * np.array([0.93, 0.95, 0.98], np.float32) * 0.96
    far = mist(far, big[0] * 0.5, big[1] * 0.50, big[0] * 0.9, big[1] * 0.22, seed=4, amount=0.35)
    # near: the Chancellor, standing at the table behind the cup, from the chest to the hips, hands at her sides
    body = cut('chancellor', 0)
    bh = body.shape[0]
    part = body[int(bh * 0.20):int(bh * 0.53)]                                     # chest to hips: what stands above a table's edge
    far = over(far, part, cx=big[0] * 0.515, foot=(EDGE + 44) * scale, height=330 * scale, soft=6.0 * scale, gain=0.97)
    out = far * (1 - al) + src * al
    return out


def rings(a, k=1, n=5):
    """The wine trembling: ring inside ring, sketched."""
    im = img(a); d = ImageDraw.Draw(im, 'RGBA')
    cx, cy, rx, ry = 497 * k, 160 * k, 118 * k, 74 * k
    for i in range(1, n + 1):
        f = i / (n + 0.6)
        d.ellipse((cx - rx * f, cy - ry * f, cx + rx * f, cy + ry * f), outline=(250, 190, 170, 120), width=max(1, k))
    return arr(im)


# ------------------------------------------------------------------ the other shots
def chancellor_close(cup):
    a = chamber(420, 215, 900, soft=9)
    a = mist(a, W * 0.5, H * 0.92, W * 0.9, H * 0.16, seed=7, amount=0.30)
    f = cut('chancellor', 2)
    a = over(a, f, cx=W * 0.60, foot=H + 40, height=H * 1.16)
    # the rim of the cup, soft, low in the frame: what she cannot stop watching
    rim = np.dstack([cup, cup_matte(cup).astype(np.float32)])[38:150, 345:650]
    a = over(a, rim, cx=W * 0.27, foot=H + 118, height=235, soft=7.0)
    return a


def master():
    """The round chamber as ENV_E02 shows it, pushed in a little: who stands where."""
    x0, y0, x1 = 135, 62, 1665
    k = W / (x1 - x0)
    fx = lambda x: (x - x0) * k
    fy = lambda y: (y - y0) * k
    a = chamber(x0, y0, x1)
    clean = a.copy()
    edge = fy(547)                                                                # the table's far edge
    # Serath, apart, at an arch on the left, her back to the room
    a = over(a, cut('serath', 1), cx=fx(410), foot=fy(556), height=74)
    # the Hierophant, centred beyond the table, facing the room
    hb = cut('hierophant', 0)
    a = over(a, hb, cx=fx(872), foot=fy(618), height=78, clip_below=edge)
    a = head(a, fx(872), fy(618) - 78 - 9, 12, skin_of('hierophant'), (0.9, 0.9, 0.9), hat=17)
    # the Chancellor, beyond the table at its left, beside the cup
    a = over(a, cut('chancellor', 0), cx=fx(762), foot=fy(618), height=72, clip_below=edge)
    a = head(a, fx(762), fy(618) - 72 - 10, 12, skin_of('chancellor'), (0.62, 0.62, 0.62))
    # Cassiel by the door, hands behind his back
    a = over(a, cut('cassiel', 0), cx=fx(1500), foot=fy(616), height=80)
    a = head(a, fx(1500), fy(616) - 80 - 10, 12.5, skin_of('cassiel'), (0.55, 0.55, 0.56))
    # the table again over the two who stand behind it (its top and legs come back in front)
    tm = np.zeros(a.shape[:2], np.float32)
    tm[int(edge):int(fy(655)), int(fx(622)):int(fx(1116))] = 1
    tm = ndimage.gaussian_filter(tm, 0.8)[..., None]
    a = a * (1 - tm) + clean * tm
    # the Engineer, alone in the middle of the floor, his back to us
    a = over(a, cut('engineer', 1), cx=fx(872), foot=fy(712), height=112)
    # cloud coming over the balustrade
    a = mist(a, fx(900), fy(520), W * 1.1, 30, seed=3, amount=0.42)
    return a, fx, fy


def hierophant_medium():
    a = chamber(700, 262, 1100, soft=6)
    a = mist(a, W * 0.5, H * 0.86, W, H * 0.16, seed=9, amount=0.34)
    a = over(a, cut('hierophant', 2), cx=W * 0.5, foot=H + 395, height=H * 2.05)   # from the collar up; the cap runs out of the top
    return a


def engineer_close():
    """The reverse: he is alone, and behind him there is only the room's plain inner wall, far off and soft."""
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]; xx = np.linspace(0, 1, W, dtype=np.float32)[None, :, None]
    a = np.array([0.80, 0.81, 0.83], np.float32) * (0.90 + 0.10 * (1 - yy)) * (0.95 + 0.05 * np.cos((xx - 0.5) * 3.0)) * np.ones((H, W, 1), np.float32)
    wall = img(a); d = ImageDraw.Draw(wall)
    d.rectangle((0, 300, W, 318), fill=(176, 178, 183)); d.rectangle((120, 318, 420, 352), fill=(186, 188, 193))   # a string course and a bench, far off
    a = blur(arr(wall), 12)
    a = over(a, cut('engineer', 2), cx=W * 0.50, foot=H + 60, height=H * 1.12)
    return a


def serath_arch():
    a = chamber(150, 150, 760, soft=1.2)
    a = mist(a, W * 0.55, H * 0.93, W * 1.1, H * 0.2, seed=5, amount=0.6)
    a = mist(a, W * 0.75, H * 0.70, W * 0.5, H * 0.12, seed=6, amount=0.35)
    a = over(a, cut('serath', 1), cx=W * 0.70, foot=H + 150, height=H * 1.22)        # on the right third: she will turn to her left, into the frame
    return a


# ------------------------------------------------------------------ drawing on the boards
def arrow(d, a, b, col=GOLD, w=4):
    d.line([a, b], fill=col, width=w)
    ang = math.atan2(b[1] - a[1], b[0] - a[0]); L = 16
    d.polygon([b, (b[0] - L * math.cos(ang - 0.45), b[1] - L * math.sin(ang - 0.45)), (b[0] - L * math.cos(ang + 0.45), b[1] - L * math.sin(ang + 0.45))], fill=col)


def note(d, xy, text, size=17):
    f = ImageFont.truetype(BOLD, size)
    x, y = xy; w = d.textlength(text, font=f)
    d.rectangle((x - 5, y - 3, x + w + 5, y + size + 5), fill=(0, 0, 0))
    d.text((x, y), text, fill=GOLD, font=f)


def sheet(cells, path):
    f1 = ImageFont.truetype(BOLD, 20); f2 = ImageFont.truetype(REG, 17); f0 = ImageFont.truetype(BOLD, 24)
    pad, cap, gap, hd = 16, 104, 14, 86
    rows = (len(cells) + 1) // 2
    S = Image.new('RGB', (pad * 2 + W * 2 + gap, hd + rows * (H + cap) + pad), INK)
    d = ImageDraw.Draw(S)
    d.text((pad, 14), 'THE WEIGHT OF HEAVEN  ·  Q04  ·  THE COUNCIL: THREE DAYS LATER  ·  storyboard', fill=GOLD, font=f0)
    d.text((pad, 48), 'Assembled from the film\'s own material: the still cup that ends movement I, the council chamber reference and the '
                      'character sheets. Figures are cut-outs: staging sketches, not finished frames.', fill=PAPER, font=f2)
    for k, (im, title, text) in enumerate(cells):
        x = pad + (k % 2) * (W + gap); y = hd + (k // 2) * (H + cap)
        S.paste(im.convert('RGB'), (x, y))
        d.text((x, y + H + 8), title, fill=GOLD, font=f1)
        words, line, yy = text.split(), '', y + H + 36
        for wd in words:
            if d.textlength(line + ' ' + wd, font=f2) > W - 8:
                d.text((x, yy), line, fill=PAPER, font=f2); yy += 22; line = wd
            else:
                line = (line + ' ' + wd).strip()
        d.text((x, yy), line, fill=PAPER, font=f2)
    S.save(path, quality=90)
    print('wrote', path, S.size)


def main():
    os.makedirs(P('refs/frames'), exist_ok=True)
    big = open_cup(2)
    img(big).save(P('refs/frames/Q04_open_cup.jpg'), quality=95)
    print('wrote refs/frames/Q04_open_cup.jpg', big.shape[1], 'x', big.shape[0])
    cup1 = arr(img(big).resize((W, H), Image.LANCZOS))
    still = still_cup()

    c1 = img(cup1); d = ImageDraw.Draw(c1)
    note(d, (36, 34), 'the same cup, the same framing as the end of movement I')
    note(d, (690, 150), 'the Chancellor, soft, behind it'); arrow(d, (760, 144), (700, 70), col=PAPER, w=3)

    c2 = img(rings(cup1)); d = ImageDraw.Draw(c2)
    note(d, (36, 34), 'now the wine trembles: ring inside ring'); arrow(d, (330, 70), (420, 130), col=PAPER, w=3)
    note(d, (600, 300), 'the gold foot buzzing on the marble')

    c3 = img(chancellor_close(still)); d = ImageDraw.Draw(c3)
    note(d, (36, 34), 'she cannot stop watching it'); arrow(d, (560, 190), (380, 330), w=3)
    note(d, (36, 300), 'the cup, soft, low in the frame')

    m, fx, fy = master()
    c4 = img(m); d = ImageDraw.Draw(c4)
    note(d, (24, 150), 'Serath, apart, facing out', 15); arrow(d, (150, 176), (fx(410) - 6, fy(500)), col=PAPER, w=2)
    note(d, (250, 386), 'the Chancellor, beside the cup', 15); arrow(d, (400, 384), (fx(762), fy(600)), col=PAPER, w=2)
    note(d, (420, 150), 'the Hierophant, centred', 15); arrow(d, (500, 176), (fx(872), fy(500)), col=PAPER, w=2)
    note(d, (600, 386), 'the Engineer has the floor, his back to us', 15); arrow(d, (640, 384), (fx(872) + 30, fy(660)), col=PAPER, w=2)
    note(d, (790, 150), 'Cassiel, by the door', 15); arrow(d, (880, 176), (fx(1500), fy(520)), col=PAPER, w=2)
    note(d, (590, 60), 'cloud comes in over the balustrade', 15)

    c5 = img(hierophant_medium()); d = ImageDraw.Draw(c5)
    note(d, (36, 34), 'frontal and symmetrical, like the building')
    note(d, (36, 380), '"Then let it be broken."')

    e = engineer_close()
    c6 = img(e); d = ImageDraw.Draw(c6)
    note(d, (36, 34), 'alone in the middle of the room, nothing to lean on')
    note(d, (600, 380), 'he answers the Hierophant')

    c7 = img(e); d = ImageDraw.Draw(c7)
    note(d, (36, 34), 'he stops. He would rather not say it')
    arrow(d, (640, 150), (900, 150), w=4); note(d, (600, 100), 'his eyes go to Serath, across the room')
    note(d, (640, 380), 'the name is not said here')

    c8 = img(serath_arch()); d = ImageDraw.Draw(c8)
    note(d, (36, 34), 'his voice, off-screen, quietly: "Sarn Vale."')
    arrow(d, (640, 96), (540, 110), w=4); note(d, (300, 130), 'then her head turns to the room')
    note(d, (36, 380), 'Q05 opens on this frame, on her line')

    cells = [
        (c1, 'SHOT 1 · 0–2.6 s · the cup · 85 mm, from above, almost still',
         'Opens exactly on this frame (sent as a reference): the cup that stood still at the wedding, the same size and angle, now on the council table. "THREE DAYS LATER." goes over it in the edit.'),
        (c2, 'SHOT 1 · the wine is trembling',
         'The only change from the wedding: fine ripples cross the wine, ring inside ring, as they crossed the water in the daughter\'s bowl. The bells that no one has rung are laid in the mix, not asked of the model.'),
        (c3, 'SHOT 2 · 2.6–5 s · the Chancellor · 85 mm, eye level, a slow drift',
         'Her eyes are on the cup. Thin columns and cloud behind her, out of focus. At the end a throat is cleared across the room and her eyes lift.'),
        (c4, 'SHOT 3 · 5–10.7 s · the chamber · 28 mm, slightly high, a slow glide forward',
         'The whole room, as its reference. The Engineer, dusty to the knee, stands alone on the white floor with his back to us: "Six hundred feet since dawn. The Unrisen hold the Weir at Sarn." After the number the Chancellor\'s head bows back to the cup.'),
        (c5, 'SHOT 4 · 10.7–13.5 s · the Hierophant · 75 mm close-up, frontal, a slow push in',
         'From the collar up, his tall cap running out of the top of the frame, the cloud bright behind him. He does not have to think about it: "Then let it be broken."'),
        (c6, 'SHOT 5 · 13.5–20 s · the Engineer · 85 mm close-up, frontal',
         'The reverse: his face for the first time, alone, light from one side, the plain inner wall far behind him. Exact about the mechanism: "Break it, and it pours. All of it, at once, onto the lowest ground."'),
        (c7, 'SHOT 5 · he stops, and looks at her',
         'His mouth closes and a breath goes out. His eyes leave the Hierophant and go across the room to Serath, and stay on her. We cut on the look, before the name.'),
        (c8, 'SHOT 6 · 20–24 s · Serath at her arch · 40 mm, the camera still',
         'Her back to us, the cloud level with the floor. From behind us, quietly, the Engineer: "Sarn Vale." A moment later her head turns toward the room until she is in profile. Q05 opens on this frame with "Forty thousand people live in Sarn Vale."'),
    ]
    sheet(cells, P('design/boards/Q04_board.jpg'))


if __name__ == '__main__':
    main()
