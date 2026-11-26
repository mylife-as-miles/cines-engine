#!/usr/bin/env python3
"""Q04 take 1, mended by editing (the author, 26 November: "Fix this... Then merge with the compile"). Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/fix_q04_t1.py            ->  out/edits/Q04_t1_fixed.mp4 (silent, no grain, no matte)
                                                                               out/edits/Q04_t1_fixed.json (the new clock, for the sound)

What it does, shot by shot (the take's own cuts: frames 63, 116, 255, 330, 478):
  colour   the film's grade, taken from the film itself: the still cup that ends movement I exists ungraded (take Q02 t1)
           and graded (cut v8), pixel for pixel. Shot 1, the same cup, gets the whole fitted transform, so the two cups
           match; the other shots get only its neutral part (white balance and tone), so skin is left alone.
  shot 1   slowed to three quarters speed (2.6 s -> 3.5 s; the frame is almost still), and the wine made to tremble:
           concentric ripples running inward from the rim, drawn inside the wine's own ellipse, tracked frame by frame.
           The take's ripples can only be found by amplifying the picture.
  shot 4   the Hierophant's five words took under a second. From the cut to a quarter second after his last word, slowed
           to 0.84 speed (motion-interpolated); the hold after the line is dropped, so the shot ends on the word.
  shot 5   the wall behind the Engineer came back dark slate. Only the background (the dark region joined to the frame's
           edges) is lifted to a pale grey, a shade under his robe; the face is not touched.
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
W, H, FPS = 992, 432, 24
SRC = P('out/takes/Q04_t1.mp4')
CUTS = [0, 63, 116, 255, 330, 478, 577]
S1_SPEED, S4_SPEED, S4_END = 0.75, 0.84, 318          # shot 4 is used up to frame 318 (13.25 s): 0.25 s after his last word
LUMA = np.array([0.299, 0.587, 0.114], np.float32)


def read(path, a=None, b=None, ss=None, t=None, vf=None):
    cmd = ['ffmpeg', '-v', 'error']
    if ss is not None: cmd += ['-ss', str(ss)]
    if t is not None: cmd += ['-t', str(t)]
    cmd += ['-i', path]
    f = []
    if a is not None: f.append(f"select='between(n,{a},{b - 1})'")
    if vf: f.append(vf)
    if f: cmd += ['-vf', ','.join(f), '-vsync', '0']
    cmd += ['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    p = subprocess.run(cmd, capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3).astype(np.float32) / 255


def retime(a, b, speed, mode):
    """Frames a..b of the take at `speed`, by ffmpeg's interpolation."""
    n_out = int(round((b - a) / speed))
    vf = (f"select='between(n,{a},{b - 1})',setpts=(PTS-STARTPTS)/{speed},"
          f"minterpolate=fps={FPS}:mi_mode={mode}" + (":mc_mode=aobmc:me_mode=bidir:vsbmc=1" if mode == 'mci' else ''))
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
    f = np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3).astype(np.float32) / 255
    if len(f) < n_out:
        f = np.concatenate([f, np.repeat(f[-1:], n_out - len(f), 0)])
    return f[:n_out]


# ------------------------------------------------------------------ the film's grade, learned from the still cup
def learn_grade():
    raw = np.median(read(P('out/takes/Q02_t1.mp4'), 594, 625), 0)                 # ungraded
    gr = read(P('out/review/I_bell_v8.mp4'), ss=57.6, t=3.2).mean(0)              # graded; the mean takes the grain out
    sl = (slice(12, 420), slice(4, 988))
    r, g = raw[sl].reshape(-1, 3), gr[sl].reshape(-1, 3)
    sat = (r.max(1) - r.min(1)) / np.maximum(r.max(1), 1e-3)
    # neutral part: one curve per channel, from the pixels with almost no colour, pinned at black and white
    neu = sat < 0.08
    curves = []
    for c in range(3):
        x = np.concatenate([r[neu, c], np.zeros(4000), np.ones(4000)]); y = np.concatenate([g[neu, c], np.zeros(4000), np.ones(4000)])
        curves.append(np.polyfit(x, y, 3))
    # whole transform: second-order in the three channels
    idx = np.random.default_rng(4).choice(len(r), 120000, replace=False)
    A = feats(r[idx]); M = np.linalg.lstsq(A, g[idx], rcond=None)[0]
    err = float(np.sqrt(((feats(r) @ M - g) ** 2).mean()))
    return curves, M, err


def feats(v):
    r, g, b = v[..., 0], v[..., 1], v[..., 2]
    return np.stack([r, g, b, r * r, g * g, b * b, r * g, r * b, g * b, np.ones_like(r)], -1)


def neutral(img, curves):
    return np.clip(np.stack([np.polyval(curves[c], img[..., c]) for c in range(3)], -1), 0, 1)


def whole(img, M):
    return np.clip(feats(img) @ M, 0, 1).astype(np.float32)


# ------------------------------------------------------------------ shot 1: the wine trembles
def wine_ellipse(img):
    """Centre and half-axes of the wine's surface: the dark red region inside the bowl."""
    luma = img @ LUMA
    m = (luma < 0.30) & (img[..., 0] > img[..., 1] * 1.6)
    m[:, :330] = False; m[:, 665:] = False; m[300:] = False
    lab, n = ndimage.label(ndimage.binary_opening(m, iterations=2))
    size = ndimage.sum(m, lab, np.arange(1, n + 1))
    m = lab == (int(np.argmax(size)) + 1)
    ys, xs = np.where(m)
    return np.array([xs.mean(), ys.mean(), (xs.max() - xs.min()) / 2.0, (ys.max() - ys.min()) / 2.0])


def ripples(frames):
    n = len(frames)
    E = np.array([wine_ellipse(f) for f in frames])
    t = np.arange(n) / FPS
    E = np.stack([np.polyval(np.polyfit(t, E[:, k], 2), t) for k in range(4)], 1)   # the slow push in, smoothed
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    rng = np.random.default_rng(7)
    wob = ndimage.gaussian_filter1d(rng.normal(0, 1, n + 48), 5)[:n]                # the tremor is never quite even
    out = []
    for i, f in enumerate(frames):
        cx, cy, ax, ay = E[i]
        u, v = (xx - cx) / ax, (yy - cy) / ay
        rho = np.sqrt(u * u + v * v); th = np.arctan2(v, u)
        inside = np.clip((0.985 - rho) / 0.07, 0, 1)
        phase = 2 * np.pi * (rho * 8.5 + 1.7 * t[i]) + 0.35 * np.sin(3 * th + 1.1 * t[i])
        crest = np.clip(np.sin(phase), 0, 1) ** 3
        trough = np.clip(-np.sin(phase), 0, 1)
        amp = (0.78 + 0.22 * np.sin(2 * np.pi * 0.9 * t[i]) + 0.5 * wob[i]) * (0.12 + 0.88 * rho ** 2)   # strongest at the rim, the centre almost still
        sheen = 0.40 + 0.60 * np.clip((0.25 - v) / 1.05, 0, 1)                    # the far side of the surface catches more of the sky
        k = ndimage.gaussian_filter(crest * amp * sheen * inside, 0.8)[..., None]
        d = ndimage.gaussian_filter(trough * amp * inside, 0.8)[..., None]
        g = f * (1 - 0.16 * d) + np.array([0.60, 0.44, 0.46], np.float32) * 0.27 * k
        out.append(np.clip(g, 0, 1))
    return np.stack(out), E


# ------------------------------------------------------------------ shot 5: the wall
def figure_mask(f):
    """The Engineer: his skin (the only warm thing in the shot), the hair round it, and the robe joined to it.
    The pale columns behind him are bright too, but a column runs to the top of the frame and a shoulder does not."""
    luma = f @ LUMA; rb = f[..., 0] - f[..., 2]
    skin = ndimage.binary_opening((rb > 0.05) & (luma > 0.12), iterations=2)
    lab, n = ndimage.label(skin)
    size = ndimage.sum(skin, lab, np.arange(1, n + 1))
    skin = lab == (int(np.argmax(size)) + 1)
    ys, xs = np.where(skin)
    x0, x1, y1 = xs.min(), xs.max(), ys.max()
    near = ndimage.binary_dilation(skin, iterations=30)
    head = skin | (near & (luma > 0.20) & (np.arange(H)[:, None] < y1))           # hair, lit or in shade, is lighter than the wall
    bright = luma > 0.31
    col = bright[30:150].mean(0) > 0.5                                            # bright all the way up: a column
    col[max(0, x0 - 25):x1 + 25] = False
    bright[:, col] = False
    bright[:int(ys.min())] = False
    lab, n = ndimage.label(bright | head)
    body = np.isin(lab, np.unique(lab[skin])) | head
    body = ndimage.binary_erosion(ndimage.binary_dilation(body, iterations=7), iterations=7, border_value=1)
    return ndimage.binary_fill_holes(body)


def lift_wall(frames):
    """Everything that is not the man is raised from dark slate to the room's pale grey, keeping its own shading."""
    masks = np.stack([figure_mask(f).astype(np.float32) for f in frames])
    masks = ndimage.uniform_filter1d(masks, 5, axis=0, mode='nearest')            # steady from frame to frame
    out = []
    for f, m in zip(frames, masks):
        m = ndimage.minimum_filter(m, 5)                                          # drawn in two pixels: no dark rim of old wall round his hair
        fig = np.clip(ndimage.gaussian_filter(m, 1.6) * 1.6 - 0.3, 0, 1)[..., None]
        luma = (f @ LUMA)[..., None]
        up = 0.40 + (luma - 0.14) * 0.667                                         # wall 0.14 -> 0.40, the pale columns 0.44 -> 0.60
        w = np.clip((0.62 - luma) / 0.16, 0, 1)                                   # nothing already bright is raised (a shoulder against a column)
        lifted = np.clip(f + (up - luma) * w, 0, 1)                               # the same lift on each channel: its cool cast stays
        out.append(f * fig + lifted * (1 - fig))
    return np.stack(out)


def main():
    curves, M, err = learn_grade()
    print(f'grade learned from the still cup: second-order fit, rms error {err:.4f}')
    out = P('out/edits/Q04_t1_fixed.mp4')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb48le', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-an', '-c:v', 'libx264', '-crf', '10', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709',
                            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', out], stdin=subprocess.PIPE)
    shots, n_out = [], 0

    def put(frames, name, src):
        nonlocal n_out
        for f in frames:
            enc.stdin.write((np.clip(f, 0, 1) * 65535 + 0.5).astype('<u2').tobytes())
        shots.append({'shot': name, 'out_start_frame': n_out, 'frames': len(frames), 'out_start_s': round(n_out / FPS, 4),
                      'src_start_s': round(src[0] / FPS, 4), 'src_end_s': round(src[1] / FPS, 4), 'speed': src[2]})
        n_out += len(frames)

    s1 = whole(retime(CUTS[0], CUTS[1], S1_SPEED, 'blend'), M)
    s1, ell = ripples(s1)
    put(s1, '1 the cup', (CUTS[0], CUTS[1], S1_SPEED))
    put(neutral(read(SRC, CUTS[1], CUTS[2]), curves), '2 the Chancellor', (CUTS[1], CUTS[2], 1.0))
    put(neutral(read(SRC, CUTS[2], CUTS[3]), curves), '3 the chamber', (CUTS[2], CUTS[3], 1.0))
    put(neutral(retime(CUTS[3], S4_END, S4_SPEED, 'mci'), curves), '4 the Hierophant', (CUTS[3], S4_END, S4_SPEED))
    put(lift_wall(neutral(read(SRC, CUTS[4], CUTS[5]), curves)), '5 the Engineer', (CUTS[4], CUTS[5], 1.0))
    put(neutral(read(SRC, CUTS[5], CUTS[6]), curves), '6 Serath', (CUTS[5], CUTS[6], 1.0))
    enc.stdin.close()
    if enc.wait(): sys.exit('encode failed')
    rec = {'source': 'out/takes/Q04_t1.mp4', 'fps': FPS, 'frames': n_out, 'seconds': round(n_out / FPS, 4), 'shots': shots,
           'grade_fit_rms': round(err, 4), 'wine_ellipse_first_last': [np.round(ell[0], 1).tolist(), np.round(ell[-1], 1).tolist()]}
    json.dump(rec, open(out.replace('.mp4', '.json'), 'w'), indent=1)
    print('wrote', os.path.relpath(out, HERE), n_out, 'frames,', rec['seconds'], 's')
    for s in shots:
        print(' ', s)


if __name__ == '__main__':
    main()
