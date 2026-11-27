#!/usr/bin/env python3
"""Q07's reel after two independent critics: their fixes, by editing only. Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/finish_q07.py   ->  out/edits/Q07_reel_v4.mp4 (silent), .json
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
  all     greens a quarter less saturated outdoors, one black point, one fine moving grain, and a slow 4 % push on the
          three locked-off exteriors so that none is a dead still.
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
    im = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).crop((x0, y0, x1, y1)).resize((W, H), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255


def paint_rows(img, x0, x1, y0, y1):
    """Take a thin upright thing out: each row is bridged from the picture on either side of it."""
    out = img.copy(); n = x1 - x0
    l = img[y0:y1, x0 - 5:x0 - 1].mean(1, keepdims=True); r = img[y0:y1, x1 + 1:x1 + 5].mean(1, keepdims=True)
    w = np.linspace(0, 1, n, dtype=np.float32)[None, :, None]
    out[y0:y1, x0:x1] = ndimage.gaussian_filter(l * (1 - w) + r * w, (2, 0, 0))
    return out


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


def shot1(img, j, n):
    img = paint_rows(img, 634, 654, 135, 205)                        # the root above the cutter
    img = paint_rows(img, 668, 688, 198, 297)                        # the chain beside it
    img = lay(img, L1, j / FPS) * 0.92 * fq.VIG[..., None]
    return zoom(less_green(img), 1 + 0.04 * j / (n - 1))


def shot2(img, j, n, k):
    img = np.minimum(img, 0.92 + 0.08 * min(1.0, j / 14.0))          # the white window held just under clipping at the start
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
        under &= ~solid                                                # the two dark legs, the pale pole and the ground round them
        wr = float(np.clip((45 - j) / 20.0, 0, 1)); src = np.roll(img, -(hw + 26), axis=1) * wr + np.roll(img, hw + 26, axis=1) * (1 - wr)
        a = ndimage.gaussian_filter(under.astype(np.float32), 1.4)[..., None]
        img = img * (1 - a) + src * a                                  # filled with flat basalt from beside it: from its right early (a stack stands to its left), from its left late (one comes up on its right)
        sh = ell((x0 + x1) / 2, y1 + 0.30 * hh, 0.55 * hw, 0.30 * hh, max(2, hw * 0.08)) * ~solid
        img = img * (1 - 0.34 * sh)[..., None]                         # a soft shadow under it
        img = img * (1 - (1 - 1 / stops(0.5)) * ndimage.gaussian_filter((hull | (solid & under_box(x0, x1, y0, y1))).astype(np.float32), 1.5)[..., None])   # the cutter half a stop down
    img = img * (1 - (1 - 1 / stops(0.7)) * ramp(250, 290))[..., None]                             # the near ground down
    far = (1 - ramp(120, 230))[..., None]; img = img * (1 - far) + ndimage.gaussian_filter(img, (3, 3, 0)) * far   # the far ground softened
    gates = box(425, 570, 48, 70, 5)
    glow = ndimage.gaussian_filter(np.clip(luma(img) - 0.35, 0, 1) * gates, 6)[..., None] * 1.6
    a = (0.80 * (1 - ramp(46, 270)) * ramp(30, 50) * (0.72 + 0.28 * L3[0].alpha(j / FPS)) * (1 - 0.6 * gates))[..., None]
    img = img * (1 - a) + L3[0].colour * a + glow * np.array([0.80, 0.90, 0.82], np.float32)
    return crop(img, 69, 0, 923, 372)


def shot4(img, j, n):
    img = img * (1 - (1 - 1 / stops(0.5)) * box(200, 310, 0, 190, 10))[..., None]                 # the sky in the gap
    img = img + 0.08 * box(315, 410, 120, 335, 12)[..., None] * np.array([0.9, 1.0, 1.1], np.float32)   # the pier behind the bird
    img = lay(img, L4, j / FPS) * 0.96
    return zoom(less_green(crop(img, 90, 72, 917, 432)), 1 + 0.04 * j / (n - 1))


def shot5(img, j, n):
    hi = np.clip((luma(img) - 0.45) / 0.3, 0, 1)[..., None]; img = img * (1 + (stops(0.35) - 1) * hi)
    img = img * (1 + (stops(0.6) - 1) * ell(560, 285, 190, 80, 45)[..., None])                    # a pool of light on the farms
    img = img * (1 - (1 - 1 / stops(0.4)) * (1 - ramp(330, 470, xx)))[..., None]
    img = img * (1 + (stops(0.5) - 1) * ramp(860, 930, xx))[..., None]
    img = img * np.array([0.97, 1.0, 1.04], np.float32)
    seam = box(853, 873, 8, 82, 4)[..., None]; img = img * (1 - seam) + ndimage.gaussian_filter(img, (0, 7, 0)) * seam
    t = j / FPS                                                       # smoke that rises: a fine texture climbing the plumes
    tx = np.roll(SMOKE, (int(round(26 * t)), -int(round(15 * t))), (0, 1))[H:2 * H, W:2 * W]
    l = luma(img); plume = np.clip((l - ndimage.gaussian_filter(l, 12)) * 9, 0, 1) * box(475, 700, 185, 265, 8)
    a = (0.55 * ndimage.gaussian_filter(plume, 2.0) * np.clip((tx - 0.35) / 0.4, 0, 1))[..., None]
    img = img * (1 - a) + np.array([0.66, 0.68, 0.70], np.float32) * a
    img = lay(img, L5, t)
    return zoom(less_green(img), 1 + 0.04 * j / (n - 1))


def main():
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', P('out/edits/Q07_reel_v2.mp4'), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
    f = np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3)
    dst = P('out/edits/Q07_reel_v4.mp4')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                            '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dst], stdin=subprocess.PIPE)
    fn = [shot1, None, shot3, shot4, shot5]; q = 0; keep = {}
    for s, (a, b) in enumerate(TRIM):
        for k in range(a, b):
            img = f[k].astype(np.float32) / 255; j, n = k - a, b - a
            img = shot2(img, j, n, k) if s == 1 else fn[s](img, j, n)
            img = 0.02 + 0.98 * np.clip(img, 0, 1)                                                    # one black point
            g = ndimage.gaussian_filter(np.random.default_rng(1000 + q).normal(0, 0.030, (H, W)).astype(np.float32), 0.6)
            img = img + (g * (0.55 + 0.45 * (1 - luma(img))))[..., None]                              # one fine grain, moving
            out = (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)
            if j in (2, n // 2, n - 3):
                keep[(s, j)] = out.copy()
            enc.stdin.write(out.tobytes()); q += 1
    enc.stdin.close(); enc.wait()
    starts = [int(x) for x in np.cumsum([0] + [b - a for a, b in TRIM[:-1]])]
    info = {'file': 'out/edits/Q07_reel_v4.mp4', 'frames': q, 'seconds': round(q / FPS, 3), 'shots_start_frames': starts,
            'shots_seconds': [round(x / FPS, 3) for x in starts], 'shot_lengths_s': [round((b - a) / FPS, 3) for a, b in TRIM], 'kept_frames_of_v2': TRIM}
    json.dump(info, open(dst.replace('.mp4', '.json'), 'w'), indent=1); print(info)
    dbg = os.environ.get('Q07_DEBUG')
    if dbg:
        rows = [np.concatenate([keep[(s, j)][::2, ::2] for (ss, j) in sorted(keep) if ss == s], 1) for s in range(5)]
        Image.fromarray(np.concatenate(rows, 0)).save(dbg, quality=86)


if __name__ == '__main__':
    main()
