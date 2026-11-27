#!/usr/bin/env python3
"""Q07's reel after two independent critics: their fixes, by editing only. Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/finish_q07.py   ->  out/edits/Q07_reel_v4.mp4 (silent), .json
    Q07_SHOT3=out/takes/Q07R_t1.mp4:4 ... tools/finish_q07.py     ->  out/edits/Q07_reel_v5.mp4: shot 3 from the remake
    Q07_POLISH=1 Q07_SHOT3=... tools/finish_q07.py               ->  out/edits/Q07_reel_v6.mp4: three more mends by editing
    Q07_CLOCK=out/edits/Q07_reel_v4.json ... tools/mix_q07.py     ->  out/review/Q07_reel_v4.mp4

The author, 27 November: "run your critics on that scene... Do this reach dune level then use edit to fix places that
don't". A cinematographer and a VFX supervisor, each shown only frames, the scene and twelve frames from Dune, Arrival
and Blade Runner 2049, both answered no (edit/reviews/Q07_reel_critics.md). Built from the reel without fog
(out/edits/Q07_reel_v2.mp4), so the fog is laid once, here.

  shot 1  ends on the descent (69 frames). The root above the cutter and the chain beside it are painted out, so it no
          longer reads as a lantern on a thread. The cloud and fog travel across the frame; they no longer swell in place.
  shot 2  starts 12 frames later, past the blank white window. Her face is lifted half a stop once the shade has fallen
          (it had sunk to a tenth of full brightness). A change to a face: shown to the author as a copy, not put in the film.
  shot 3  the last 69 frames, where the cutter is small. Its two dark legs and the pale pole under it are painted out
          and a soft shadow put under it. Heavy blue-grey fog over the upper two thirds, the far ground softened, the gates left as pale glows; the
          near ground and the cutter darker; 60 px cropped off the bottom.
  shot 4  ends before the bird shrinks on landing (48 frames). Pushed in to 120 %. The sky in the gap darker, the pier
          behind the bird's flight lifted so the black bird shows against it; haze on the far wall only, steady.
  shot 5  a pool of light on the farms, the left darker, the right edge lifted; smoke that rises laid over the plumes;
          the sky's seam feathered; the mist travels.
  all     greens 40 to 45 % less saturated outdoors, black points matched, one fine moving grain, and a slow 4 % push
          on the three locked-off exteriors so that none is a dead still.

A third critic, on the first build of this copy, found marks the fixes had left; they are corrected here: the sky in
shot 4 is keyed by brightness (a soft box left a halo at the piers), the far ground of shot 3 is hardly blurred (3 px
read as a miniature), fog travels in front of the gate lights so they are not eight constant dots, only the legs and
the pole under the cutter are filled, and the lit edge of Serath's window jamb falls with the view.
"""
import importlib.util, json, os, subprocess
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('fq', P('tools/fog_q07.py')); fq = importlib.util.module_from_spec(spec); spec.loader.exec_module(fq)
W, H, FPS, yy, xx, Layer, band, ramp = fq.W, fq.H, fq.FPS, fq.yy, fq.xx, fq.Layer, fq.band, fq.ramp
TRIM = [(0, 69), (100, 200), (236, 305), (305, 353), (396, 473)]    # frames of the reel without fog that are kept, by shot
stops = lambda s: 2 ** (s / 2.2)                                     # a gain in stops, on display values
luma = lambda a: a @ np.array([0.299, 0.587, 0.114], np.float32)


def box(x0, x1, y0, y1, s):
    m = np.zeros((H, W), np.float32); m[y0:y1, x0:x1] = 1
    return ndimage.gaussian_filter(m, s)


def ell(cx, cy, rx, ry, s):
    return ndimage.gaussian_filter((((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1).astype(np.float32), s)


def zoom(img, z):
    if abs(z - 1) < 1e-4:
        return img
    sy, sx = (yy - H / 2) / z + H / 2, (xx - W / 2) / z + W / 2
    return np.stack([ndimage.map_coordinates(img[..., c], [sy, sx], order=1, mode='nearest') for c in range(3)], -1)


def crop(img, x0, y0, x1, y1):
    im = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).crop((x0, y0, x1, y1)).resize((W, H), Image.BICUBIC)
    return np.asarray(im).astype(np.float32) / 255


def paint_rows(img, x0, x1, y0, y1):
    """Take a thin upright thing out: each row is bridged from the picture on either side of it."""
    out = img.copy(); n = x1 - x0
    l = img[y0:y1, x0 - 5:x0 - 1].mean(1, keepdims=True); r = img[y0:y1, x1 + 1:x1 + 5].mean(1, keepdims=True)
    w = np.linspace(0, 1, n, dtype=np.float32)[None, :, None]
    out[y0:y1, x0:x1] = ndimage.gaussian_filter(l * (1 - w) + r * w, (2, 0, 0))
    return out


def smooth(a, b, x):
    u = np.clip((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u)


def less_green(img, by=0.25):
    g = np.clip((img[..., 1] - np.maximum(img[..., 0], img[..., 2])) * 10, 0, 1)[..., None]
    l = luma(img)[..., None]
    return l + (img - l) * (1 - by * g)


def lay(img, layers, t):
    for L in layers:
        a = L.alpha(t)[..., None]; img = img * (1 - a) + L.colour * a
    return img


FAR = dict(period=60.0)                                              # shapes travel; they hardly change in place
L1 = [Layer(3, 190, (16, 0.5), band(176, 30) + 0.35 * band(120, 60), (0.20, 0.22, 0.26), 0.70, **FAR),
      Layer(5, 150, (-9, 0), ramp(250, 285) * (1 - 0.55 * ramp(300, 432)), (0.50, 0.53, 0.58), 0.55, **FAR),
      Layer(7, 420, (38, -3), np.ones((H, W), np.float32), (0.40, 0.43, 0.48), 0.12, gamma=1.2, **FAR)]
L3 = [Layer(15, 150, (-5, 12), np.ones((H, W), np.float32), (0.42, 0.46, 0.52), 1.0, gamma=0.8, **FAR)]
L4 = [Layer(25, 220, (8, 0), ramp(620, 992, xx) * (1 - ramp(305, 335)), (0.34, 0.37, 0.42), 0.34, gamma=0.8, **FAR)]
L5 = [Layer(33, 160, (12, 1), band(190, 70) * (1 - ramp(700, 900, xx)), (0.52, 0.55, 0.57), 0.30, gamma=2.0, **FAR),
      Layer(35, 240, (12, 0), 1 - ramp(40, 120), (0.24, 0.26, 0.30), 0.45, **FAR)]
SMOKE = fq.tex(51, 26)
GATEFOG = fq.tex(61, 34)
POLISH = bool(os.environ.get('Q07_POLISH'))                          # the author, 27 November: "Can this be fix with edit!?" -> a sixth copy
SKY3, SHADE5 = fq.tex(71, 110), fq.tex(81, 240)


def tile(m, dx, dy):
    """A window of a travelling texture: its content moves dx px right and dy px down."""
    return np.roll(m, (int(round(dy)), int(round(dx))), (0, 1))[H:2 * H, W:2 * W]


def front_view():
    """The cutter seen from ahead, from its sheet: RGBA floats. Its outline is drawn by hand on the sheet's front view
    (the shaded side of the hull and the slate roof are the backdrop's own grey, so no key finds them)."""
    from PIL import ImageDraw
    im = Image.open(P('refs/SHIP_V04_cutter.jpg')).convert('RGB'); w, h = im.size
    im = im.crop((int(0.04 * w), int(0.50 * h), int(0.24 * w), int(0.90 * h))).resize((550, 614), Image.LANCZOS)
    body = [(260, 60), (273, 150), (292, 162), (368, 205), (362, 288), (432, 294), (442, 326), (462, 342), (462, 405), (432, 405), (398, 455), (302, 496),
            (274, 518), (250, 518), (228, 498), (150, 468), (100, 400), (82, 326), (92, 298), (155, 290), (156, 206), (232, 162), (248, 150)]
    skid_l = [(128, 440), (152, 452), (218, 476), (205, 490), (152, 512), (152, 540), (96, 540), (96, 512), (118, 500)]
    skid_r = [(395, 452), (402, 440), (428, 512), (428, 540), (372, 540), (372, 512), (330, 488), (318, 478)]
    m = Image.new('L', im.size, 0); d = ImageDraw.Draw(m)
    for poly in (body, skid_l, skid_r):
        d.polygon(poly, fill=255)
    a = np.asarray(im).astype(np.float32) / 255; al = ndimage.gaussian_filter(np.asarray(m).astype(np.float32) / 255, 1.5)
    return np.dstack([a, al])[52:548, 74:470]


def cutter_far(img, cx, cy, width=30):
    """The sheet's cutter, small and far, against the light: in place of the take's dark shape."""
    global _SPR
    if '_SPR' not in globals():
        s = front_view(); k = width / s.shape[1]
        _SPR = np.asarray(Image.fromarray((np.clip(s, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').resize((width, max(2, int(round(s.shape[0] * k)))), Image.LANCZOS)).astype(np.float32) / 255
    s = np.pad(_SPR, ((2, 2), (2, 2), (0, 0)))
    y0f = cy - s.shape[0] / 2; y0 = int(np.floor(y0f)); x0 = int(round(cx - s.shape[1] / 2))
    s = ndimage.shift(s, (y0f - y0, 0, 0), order=1, mode='constant')                # its descent is smooth, not in whole pixels
    reg = img[y0:y0 + s.shape[0], x0:x0 + s.shape[1]]
    sky = reg.reshape(-1, 3).mean(0)
    rgb = s[..., :3] * 0.66 * np.array([0.97, 1.0, 1.04], np.float32)               # against the light: its near side in shade, cool
    rgb = rgb * 0.76 + sky * 0.24                                                   # and a quarter lost in the air between
    a = ndimage.gaussian_filter(s[..., 3], 0.5)[..., None] * 0.96
    img[y0:y0 + s.shape[0], x0:x0 + s.shape[1]] = reg * (1 - a) + rgb * a
    return img


def parallax(img, u, cy=130.0, amount=0.07):
    """A push that knows the ground is a plane: what is low in the frame is near and grows faster than what is far."""
    z = 1 + amount * u * (0.25 + 0.75 * np.clip((yy - 120.0) / (H - 120.0), 0, 1) ** 1.2)
    sy, sx = (yy - cy) / z + cy, (xx - W / 2) / z + W / 2
    return np.stack([ndimage.map_coordinates(img[..., c], [sy, sx], order=1, mode='nearest') for c in range(3)], -1)


def shot1(img, j, n):
    img = paint_rows(img, 634, 654, 135, 205)                        # the root above the cutter
    img = paint_rows(img, 668, 688, 198, 297)                        # the chain beside it
    if POLISH:                                                       # the take's small dark shape out; the sheet's cutter in, a third larger, coming down out of the cloud
        l = luma(img); m = (ndimage.gaussian_filter(l, 9) - l) > 0.04
        keep = np.zeros((H, W), bool); keep[190:252, 614:662] = True; m = ndimage.binary_dilation(m & keep, iterations=3) & keep
        w = (~m).astype(np.float32)
        fill = ndimage.gaussian_filter(img * w[..., None], (7, 7, 0)) / np.maximum(ndimage.gaussian_filter(w, 7), 1e-3)[..., None]
        a = ndimage.gaussian_filter(m.astype(np.float32), 1.6)[..., None]; img = img * (1 - a) + fill * a
        img = cutter_far(img, 638.0, 187.0 + 40.0 * j / (n - 1))
    img = lay(img, L1, j / FPS) * 0.92 * fq.VIG[..., None]
    return zoom(less_green(img, 0.40), 1 + 0.04 * j / (n - 1))


def shot2(img, j, n, k, fall):
    img = np.minimum(img, 0.92 + 0.08 * min(1.0, j / 14.0))          # the white window held just under clipping at the start
    if fall > 0.02:                                                  # the lit edge of the window's jamb falls with the light outside
        l = luma(img); br = l > 0.68; br[:, :140] = False; br[:, 390:] = False
        xr = np.where(br.any(1), W - 1 - np.argmax(br[:, ::-1], 1), -99)             # each row's rightmost bright pixel: the jamb's lit edge
        xr = np.where(xr > 0, ndimage.median_filter(xr, 9, mode='nearest'), -99)[:, None]
        strip = ((xx >= xr - 13) & (xx <= xr + 2) & (l > 0.58)).astype(np.float32)   # that edge only, 14 px in from it, not the view
        img = img * (1 - 0.45 * float(smooth(0.25, 0.48, fall)) * ndimage.gaussian_filter(strip, 1.2)[..., None])
    cool = (1 - ramp(520, 640, xx))[..., None]                       # the wall by the window, from warm cream to neutral; her face, hair and collar are right of it
    img = img * (1 + cool * (np.array([0.96, 1.0, 1.06], np.float32) - 1))
    up = float(np.clip((k - 140) / 20.0, 0, 1))
    if up > 0:
        img = img * (1 + (stops(0.5) - 1) * up * ell(745, 205, 135, 160, 45)[..., None])   # her face, half a stop, once the shade has fallen
    return img


def under_box(x0, x1, y0, y1):
    m = np.zeros((H, W), bool); m[max(0, y0 - 14):y1 + 18, max(0, x0 - 6):x1 + 7] = True
    return m


def shot3(img, j, n):
    l = luma(img)
    seed = ndimage.binary_opening(l > 0.55, iterations=1); seed[:90] = False
    lab, cnt = ndimage.label(seed)
    if cnt:
        seed = lab == (1 + int(np.argmax(ndimage.sum(seed, lab, range(1, cnt + 1)))))    # the brightest piece of the hull
        lab, _ = ndimage.label(ndimage.binary_closing(l > 0.42, iterations=2)); ids = np.unique(lab[seed]); hull = np.isin(lab, ids[ids > 0])
        ys, xs = np.where(hull); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max(); hw, hh = x1 - x0 + 1, y1 - y0 + 1
        solid = ndimage.binary_dilation(ndimage.binary_opening(l > 0.34, iterations=2), iterations=2)   # the hull without anything thin
        under = np.zeros((H, W), bool); under[(y0 + y1) // 2:min(H, y1 + int(0.75 * hh)), max(0, x0 - 10):x1 + 11] = True
        under &= ~solid
        gm = float(np.median(l[under])) if under.any() else 0.23
        pole = np.zeros((H, W), bool); cx = int(round((x0 + x1) / 2)); pole[y1 - 3:min(H, y1 + int(0.75 * hh)), cx - 4:cx + 5] = True   # the pale pole hangs under the middle of the hull
        under = (ndimage.binary_dilation(under & ((l < gm - 0.07) | (l > gm + 0.10)), iterations=2) | pole) & ~solid   # the two dark legs and the pole, not the ground round them
        wr = float(np.clip((45 - j) / 20.0, 0, 1)); src = np.roll(img, -(hw + 26), axis=1) * wr + np.roll(img, hw + 26, axis=1) * (1 - wr)
        a = ndimage.gaussian_filter(under.astype(np.float32), 1.1)[..., None]
        img = img * (1 - a) + src * a                                  # filled with flat basalt from beside it: from its right early (a stack stands to its left), from its left late (one comes up on its right)
        sh = ell((x0 + x1) / 2, y1 + 0.30 * hh, 0.55 * hw, 0.30 * hh, max(2, hw * 0.08)) * ~solid
        img = img * (1 - 0.34 * sh)[..., None]                         # a soft shadow under it
        img = img * (1 - (1 - 1 / stops(0.5)) * ndimage.gaussian_filter((hull | (solid & under_box(x0, x1, y0, y1))).astype(np.float32), 1.5)[..., None])   # the cutter half a stop down
    img = img * (1 - (1 - 1 / stops(0.7)) * ramp(250, 290))[..., None]                             # the near ground down
    far = (1 - ramp(120, 230))[..., None]; img = img * (1 - far) + ndimage.gaussian_filter(img, (1.2, 1.2, 0)) * far   # the far ground a little softer (3 px read as a miniature)
    gates = box(425, 570, 48, 70, 5)
    veil = smooth(0.25, 0.70, np.roll(GATEFOG, int(round(22 * j / FPS)), 1)[H:2 * H, W:2 * W])     # fog passing in front of the gates: each light comes and goes on its own
    glow = (ndimage.gaussian_filter(np.clip(luma(img) - 0.35, 0, 1) * gates, 5) * (0.35 + 0.95 * veil))[..., None] * 1.2
    a = (0.80 * (1 - ramp(46, 270)) * ramp(30, 50) * (0.72 + 0.28 * L3[0].alpha(j / FPS)) * (1 - 0.6 * gates * veil))[..., None]
    img = img * (1 - a) + L3[0].colour * a + glow * np.array([0.86, 0.88, 0.84], np.float32)
    return crop(img, 69, 0, 923, 372)


def shot3r(img, j, n):
    """The remade crossing (Q07R, a real travelling shot from its own plate): only brought to the reel's level and colour."""
    if POLISH:
        fast = float(np.clip(1.15 - j / 38.0, 0.3, 1.0))                                            # the near ground is fastest in the first second
        w = ramp(292, 432); k1 = (np.clip(w * 2, 0, 1) * fast)[..., None]; k2 = (np.clip(w * 2 - 1, 0, 1) * fast)[..., None]
        img = img * (1 - k1) + ndimage.gaussian_filter1d(img, 2.2, axis=0) * k1                     # blurred along its travel, as a shutter would
        img = img * (1 - k2) + ndimage.gaussian_filter1d(img, 5.5, axis=0) * k2
        img = img * (1 - 0.26 * ramp(325, 432))[..., None]                                          # and in the shade of what is overhead
        l = luma(img); sky = smooth(0.58, 0.76, l) * (1 - ramp(138, 158))                           # the sky, keyed by brightness, above the wall
        cloud = smooth(0.30, 0.72, tile(SKY3, 16 * j / FPS, 0))                                     # cloud in it, travelling
        img = img * (1 - sky * (0.09 + 0.17 * cloud))[..., None] * (1 + sky[..., None] * (np.array([0.985, 1.0, 1.02], np.float32) - 1))
    hi = np.clip((img - 0.72) / 0.28, 0, 1); img = img - 0.07 * hi * hi                             # the sky's top eased down: whites keep their detail
    return less_green(img * 0.95, 0.30) * (0.35 + 0.65 * fq.VIG)[..., None]


def shot4(img, j, n):
    l = luma(img)
    img = img * (1 - (1 - 1 / stops(0.5)) * smooth(0.56, 0.68, l) * (1 - ramp(215, 245)))[..., None]   # every piece of sky, right up to the stone (a soft box left a halo at the piers)
    img = img + (0.08 * box(315, 410, 120, 335, 12) * smooth(0.05, 0.10, l))[..., None] * np.array([0.9, 1.0, 1.1], np.float32)   # the pier behind the bird, not the bird
    img = lay(img, L4, j / FPS) * 0.96
    return zoom(less_green(crop(img, 90, 72, 917, 432), 0.45), 1 + 0.04 * j / (n - 1))


def shot5(img, j, n):
    hi = np.clip((luma(img) - 0.45) / 0.3, 0, 1)[..., None]; img = img * (1 + (stops(0.35) - 1) * hi)
    img = img * (1 + (stops(0.6) - 1) * ell(560 + (0.45 * j - 16 if POLISH else 0), 285, 190, 80, 45)[..., None])   # a pool of light on the farms (it drifts in the sixth copy)
    img = img * (1 - (1 - 1 / stops(0.4)) * (1 - ramp(330, 470, xx)))[..., None]
    img = img * (1 + (stops(0.5) - 1) * ramp(860, 930, xx))[..., None]
    img = img * np.array([0.97, 1.0, 1.04], np.float32)
    seam = box(853, 873, 8, 82, 4)[..., None]; img = img * (1 - seam) + ndimage.gaussian_filter(img, (0, 7, 0)) * seam
    t = j / FPS                                                       # smoke that rises: a fine texture climbing the plumes
    tx = tile(SMOKE, 15 * t, -26 * t) if POLISH else np.roll(SMOKE, (int(round(26 * t)), -int(round(15 * t))), (0, 1))[H:2 * H, W:2 * W]   # up and to the right, with the plumes (copies 4 and 5 had it running down)
    if POLISH:                                                        # the plumes themselves waver: a wave climbing each one, wider the higher it is
        l = luma(img); wisp = ndimage.gaussian_filter(np.clip((l - ndimage.gaussian_filter(l, 12)) * 9, 0, 1) * smooth(0.40, 0.50, l) * box(478, 696, 183, 258, 6), 2.5)
        amp = 3.2 * np.clip(wisp * 1.6, 0, 1) * np.clip((262.0 - yy) / 70.0, 0, 1)
        dx = amp * np.sin(2 * np.pi * (yy / 34.0 + 0.55 * t) + xx / 47.0)
        img = np.stack([ndimage.map_coordinates(img[..., c], [yy, xx - dx], order=1, mode='nearest') for c in range(3)], -1)
    l = luma(img); plume = np.clip((l - ndimage.gaussian_filter(l, 12)) * 9, 0, 1) * box(475, 700, 185, 265, 8)
    a = (0.55 * ndimage.gaussian_filter(plume, 2.0) * np.clip((tx - 0.35) / 0.4, 0, 1))[..., None]
    img = img * (1 - a) + np.array([0.66, 0.68, 0.70], np.float32) * a
    if POLISH:                                                        # the shadows of clouds crossing the fields
        l = luma(img); land = 1 - smooth(0.50, 0.62, l) * (1 - ramp(105, 150))
        sh = np.roll(SHADE5, (0, int(round(22 * t))), (0, 1))[(H + (2.2 * yy).astype(int)) % (3 * H), (W + xx.astype(int))]   # flattened, as they lie on the ground
        img = img * (1 - 0.21 * smooth(0.42, 0.72, sh) * land)[..., None]
    img = lay(img, L5, t)
    if POLISH:
        return parallax(less_green(img, 0.45), j / (n - 1))
    return zoom(less_green(img, 0.45), 1 + 0.04 * j / (n - 1))


def main():
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', P('out/edits/Q07_reel_v2.mp4'), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
    f = np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3)
    alt = os.environ.get('Q07_SHOT3')                                # 'take.mp4:first frame': the remade shot 3 in place of the pickup's
    g3 = None
    if alt:
        path, start = alt.rsplit(':', 1); start = int(start)
        p3 = subprocess.run(['ffmpeg', '-v', 'error', '-i', P(path), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
        g3 = np.frombuffer(p3.stdout, np.uint8).reshape(-1, H, W, 3)
    dst = P('out/edits/Q07_reel_v6.mp4' if POLISH else 'out/edits/Q07_reel_v5.mp4' if alt else 'out/edits/Q07_reel_v4.mp4')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                            '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dst], stdin=subprocess.PIPE)
    fn = [shot1, None, shot3, shot4, shot5]; q = 0; keep = {}
    win = np.array([luma(f[k][140:380, 180:310].astype(np.float32) / 255).mean() for k in range(*TRIM[1])]); win = ndimage.uniform_filter1d(win, 5)
    fall = 1 - win / win.max()                                       # how far the light outside her window has fallen, frame by frame
    FLOOR = [0.02, 0.05, 0.02, 0.02, 0.02]                          # shot 2's blacks sat at nothing; the others' sit on fog
    for s, (a, b) in enumerate(TRIM):
        for k in range(a, b):
            img = f[k].astype(np.float32) / 255; j, n = k - a, b - a
            if s == 2 and g3 is not None:
                img = shot3r(g3[start + j].astype(np.float32) / 255, j, n); fl = 0.0
            else:
                img = shot2(img, j, n, k, float(fall[j])) if s == 1 else fn[s](img, j, n); fl = FLOOR[s]
            img = fl + (1 - fl) * np.clip(img, 0, 1)                                                    # one black point
            g = ndimage.gaussian_filter(np.random.default_rng(1000 + q).normal(0, 0.030, (H, W)).astype(np.float32), 0.6)
            img = img + (g * (0.55 + 0.45 * (1 - luma(img))))[..., None]                              # one fine grain, moving
            out = (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)
            if j in (2, n // 2, n - 3):
                keep[(s, j)] = out.copy()
            enc.stdin.write(out.tobytes()); q += 1
    enc.stdin.close(); enc.wait()
    starts = [int(x) for x in np.cumsum([0] + [b - a for a, b in TRIM[:-1]])]
    info = {'file': os.path.relpath(dst, HERE), 'shot3_from': alt, 'frames': q, 'seconds': round(q / FPS, 3), 'shots_start_frames': starts,
            'shots_seconds': [round(x / FPS, 3) for x in starts], 'shot_lengths_s': [round((b - a) / FPS, 3) for a, b in TRIM], 'kept_frames_of_v2': TRIM}
    json.dump(info, open(dst.replace('.mp4', '.json'), 'w'), indent=1); print(info)
    dbg = os.environ.get('Q07_DEBUG')
    if dbg:
        rows = [np.concatenate([keep[(s, j)][::2, ::2] for (ss, j) in sorted(keep) if ss == s], 1) for s in range(5)]
        Image.fromarray(np.concatenate(rows, 0)).save(dbg, quality=86)


if __name__ == '__main__':
    main()
