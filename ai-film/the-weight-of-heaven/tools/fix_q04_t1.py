#!/usr/bin/env python3
"""Q04 take 1, mended by editing (the author, 26 November: "Fix this... Then merge with the compile"). Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/fix_q04_t1.py            ->  out/edits/Q04_t1_fixed.mp4 (silent, no grain, no matte)
                                                                               out/edits/Q04_t1_fixed.json (the new clock, for the sound)

What it does, shot by shot (the take's own cuts: frames 63, 116, 255, 330, 478):
  shot 1   the film's grade, taken from the film itself: the still cup that ends movement I exists ungraded (take Q02
           t1) and graded (cut v8), pixel for pixel, and shot 1 is the same cup. Slowed to three quarters speed (2.6 s ->
           3.5 s; the frame is almost still), and the wine made to tremble: concentric ripples running inward from the
           rim, drawn inside the wine's own ellipse, tracked frame by frame (the take's ripples can only be found by
           amplifying the picture). Then laid exactly over movement I's still cup (rim, foot, the bowl's edges and the
           marble's edge), so that one cup can dissolve into the other with nothing moving but the room and the wine.
  shot 4   the Hierophant, as generated, at his own speed, up to a quarter second after his last word. (Cuts v10 and
           v11 slowed him to 0.84; the author asked for his voice back.)
  shot 5   the wall behind the Engineer came back dark slate. It is raised to a mid grey with no mask edge (lift_wall).
  shots 2, 3, 6 and every face: the take's own colour, untouched. (Cuts v10 and v11 put the neutral part of shot 1's
           grade on them; it pushed the shadows of skin down and toward grey, which nobody asked for.)
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
S1_SPEED, S4_END = 0.75, 318                         # shot 4 is used up to frame 318 (13.25 s): 0.25 s after his last word
DISSOLVE = 30                                          # frames over which the still cup of movement I becomes this one
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


def cup_marks(img):
    """Where the cup stands in a frame: the top of its rim, the bottom of its foot, the bowl's left and right edges and
    the marble's far edge. Gold is the only strongly coloured thing in either shot."""
    sat = (img.max(2) - img.min(2)) / np.maximum(img.max(2), 1e-3)
    gold = (sat > 0.30) & (img[..., 0] > img[..., 2] + 0.12)
    ys = np.where(gold[:, 485:510].any(1))[0]
    xs = np.where(gold[150:175].any(0))[0]
    c = img.mean(2)[200:300, 120:200].mean(1)
    return np.array([ys.min(), ys.max(), xs.min(), xs.max(), int(np.argmax(np.diff(c))) + 200], np.float64)


def register(frames, E, hold):
    """Shot 1 laid exactly over the still cup that ends movement I, for the matched dissolve between them (the author,
    26 November: the two cups "should transition together"). The model re-framed the cup a little and drew its lip
    thinner. Each of the first `hold` frames is moved and scaled, width and height separately (they differ by about
    4 %), so that the bowl's edges, the rim's top, the foot and the marble's edge fall on the still cup's; after that
    the last of those settings is kept, so the model's own slow push carries on from there with no jump."""
    still = cup_marks(read(P('out/edits/I_bell_v8.mp4'), 1443, 1472).mean(0))
    M = np.array([cup_marks(f) for f in frames[:hold + 1]])
    tt = np.arange(len(M))
    M = np.stack([np.polyval(np.polyfit(tt, M[:, k], 2), tt) for k in range(5)], 1)   # steady from frame to frame
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    out = []
    for k, f in enumerate(frames):
        m = M[min(k, hold)]
        sx = (still[3] - still[2]) / (m[3] - m[2]); cxa, cxb = (still[2] + still[3]) / 2, (m[2] + m[3]) / 2
        ay, by = np.polyfit([m[0], m[4], m[1]], [still[0], still[4], still[1]], 1)    # rim top, marble edge, foot: one line
        src_x = (xx - cxa) / sx + cxb
        src_y = (yy - by) / ay
        out.append(np.stack([ndimage.map_coordinates(f[..., c], [src_y, src_x], order=1, mode='nearest') for c in range(3)], -1))
    return np.stack(out), [round(float(v), 1) for v in still]


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
    """The dark slate wall behind the Engineer raised to a mid grey, a shade under his robe, without cutting him out.

    The first version masked the man and lifted everything else: it thinned and greyed his white hair, left an outline
    round his head and read as a cut-out (the author, 26 November: "what did you do to the engineer"). This one has
    no edge. Every pixel is raised by an amount that depends only on itself: the darker it is the more it rises, and
    nothing at or above his hair's brightness rises at all; the curve never crosses itself, so hair stays lighter than
    the wall behind it and no rim can form. Warm pixels (his skin, lit or in shade) are not raised. The mask is used
    only well inside the figure, to keep his pupils and the dark of his mouth as they are."""
    masks = np.stack([ndimage.binary_erosion(figure_mask(f), iterations=12).astype(np.float32) for f in frames])
    masks = ndimage.uniform_filter1d(masks, 5, axis=0, mode='nearest')
    out = []
    for f, m in zip(frames, masks):
        inside = ndimage.gaussian_filter(m, 6.0)[..., None]
        luma = (f @ LUMA)[..., None]
        rb = (f[..., 0] - f[..., 2])[..., None]
        cool = np.clip((0.045 - rb) / 0.045, 0, 1); cool = cool * cool * (3 - 2 * cool)
        lift = 0.30 * np.clip(1 - luma / 0.60, 0, 1) * cool                        # 0.15 -> 0.375, 0.44 -> 0.52, 0.60 and above unchanged
        # where skin meets wall, the edge pixels are a mixture of the two: warm, so not raised, yet dark with the old
        # wall. They take a share of the wall's rise beside them, by how far they sit below the skin next to them.
        l2 = luma[..., 0]
        hi = ndimage.maximum_filter(l2, 7); lo = ndimage.minimum_filter(l2, 7)
        share = np.clip((hi - l2) / np.maximum(hi - lo, 0.04), 0, 1)
        beside = ndimage.maximum_filter(lift[..., 0], 5)
        edge = (beside * share * (1 - cool[..., 0]))[..., None]
        out.append(np.clip(f + (lift + edge) * (1 - inside), 0, 1))
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
    s1, still_cup = register(s1, ell, DISSOLVE)
    put(s1, '1 the cup', (CUTS[0], CUTS[1], S1_SPEED))
    put(read(SRC, CUTS[1], CUTS[2]), '2 the Chancellor', (CUTS[1], CUTS[2], 1.0))
    put(read(SRC, CUTS[2], CUTS[3]), '3 the chamber', (CUTS[2], CUTS[3], 1.0))
    put(read(SRC, CUTS[3], S4_END), '4 the Hierophant', (CUTS[3], S4_END, 1.0))
    put(lift_wall(read(SRC, CUTS[4], CUTS[5])), '5 the Engineer', (CUTS[4], CUTS[5], 1.0))
    put(read(SRC, CUTS[5], CUTS[6]), '6 Serath', (CUTS[5], CUTS[6], 1.0))
    enc.stdin.close()
    if enc.wait(): sys.exit('encode failed')
    rec = {'source': 'out/takes/Q04_t1.mp4', 'fps': FPS, 'frames': n_out, 'seconds': round(n_out / FPS, 4), 'shots': shots,
           'dissolve_frames': DISSOLVE, 'still_cup_marks_rim_foot_left_right_marble': still_cup,
           'grade_fit_rms': round(err, 4), 'wine_ellipse_first_last': [np.round(ell[0], 1).tolist(), np.round(ell[-1], 1).tolist()]}
    json.dump(rec, open(out.replace('.mp4', '.json'), 'w'), indent=1)
    print('wrote', os.path.relpath(out, HERE), n_out, 'frames,', rec['seconds'], 's')
    for s in shots:
        print(' ', s)


if __name__ == '__main__':
    main()
