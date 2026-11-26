#!/usr/bin/env python3
"""Make a still cloud move, by editing. A test on one shot (the author, 26 November: "Can you make the cloud to look like
it's moving in edit... It looks like it's a painting instead of real cloud"). Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/cloud_drift.py
        ->  out/review/cloud_test_before.mp4   Q04 take 1, Serath at her arch, as generated
            out/review/cloud_test_after.mp4    the same shot with the cloud drifting

Measured first, and the first measurement was wrong. Tracked properly over the shot (4.1 s):
    the sky                      0 px        frozen
    the top of the cloud bank   -2 px        frozen      <- this is the painting
    the low mist, centre       +20 px right, 8 up        alive in the take
    under the arcade, left     +36 px right, 19 up       alive in the take
    the right opening          -15 to -27 px (leftward)  alive in the take
So only what is frozen is moved, in the direction the take's own mist moves beside it; where the take's cloud is alive
it is left exactly as generated.

How. The camera is still in this shot, so the frozen cloud can be handled as its own layer:
  frozen   a map of where the take's cloud does not change over the shot (the spread of each pixel's brightness
           through time, Serath left out of the count). The added movement is scaled by it, so it dies away smoothly
           where the take's own movement begins and there is no line between the two.
  plate    the median of the shot's frames. Under everything that is not cloud (the columns, Serath, the far stonework)
           the cloud beside it is mirrored in, so that there is cloud with texture in it to bring out from behind edges.
  motion   the plate is resampled every frame along a slow flow: the cloud drifts to the right and rises a little,
           slower high in the frame (far) than low (near), and is pushed about by two slowly changing fields so that
           it billows instead of sliding. The flow is zero at the middle of the shot, so no pixel travels far.
  veils    thin mist that is new, not taken from the plate: soft lighter and darker shapes that cross at the speed of
           the take's own low mist and change as they go, laid lightly over the frozen cloud and the far stonework.
  matte    Serath is found again in every frame (she turns her head), so the cloud reaches her edge and stops there.
  grain    only the CHANGE in the cloud's shapes is added to the take's frame, so the take's own fine pattern stays on it
           and stays still, as it is everywhere else in the picture.
"""
import os, subprocess
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
W, H, FPS = 992, 432, 24
SHOT = {'take': 'out/takes/Q04_t1.mp4', 'frames': (478, 577)}


def read(path, a, b):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f"select='between(n,{a},{b - 1})'", '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                       capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3).astype(np.float32) / 255


def write(frames, path, audio=None, ss=None, t=None):
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-']
    if audio:
        cmd += ['-ss', str(ss), '-t', str(t), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k']
    cmd += ['-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in frames:
        p.stdin.write((np.clip(f, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
    p.stdin.close(); p.wait()


def poly(points):
    im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).polygon(points, fill=255)
    return np.asarray(im) > 0


def masks():
    """Marked by hand on gridded enlargements of the plate: the opening between the two columns, down to the rail (it
    slopes), and the far stonework that stands in the cloud there. (An automatic edge detector was tried first for the
    stonework and took the cloud bank's own billows for stone.) The opening right of the right column and the cloud
    under the arcade on the left are alive in the take and are not touched."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    opening = (xx >= 364) & (xx < 747) & (yy < 405.5 - 0.055 * (xx - 364) - 3)
    stone = poly([(417, 94), (457, 94), (457, 226), (417, 226)])                     # the tower
    stone |= poly([(360, 158), (421, 158), (421, 216), (360, 216)])                  # the bridge beside it
    stone |= poly([(360, 248), (388, 248), (424, 250), (432, 256), (470, 274), (540, 272), (556, 270), (584, 282), (606, 300),
                   (606, 350), (540, 352), (520, 330), (470, 322), (410, 330), (360, 332)])   # the stair and the wall under it
    return opening, stone & opening


def frozen_map(frames, fig, opening):
    """1 where the take's cloud does not change through the shot, 0 where it is alive. From the spread of each pixel's
    brightness over time (a little blurred, Serath left out): stone and the sky give 0.2-0.3 levels of 255, the top of
    the cloud bank 0.5, the moving mist 1.1-3.5."""
    lum = np.stack([ndimage.gaussian_filter(f.mean(2), 2.5) for f in frames])
    big = np.stack([ndimage.binary_dilation(m, iterations=4) for m in fig])
    with np.errstate(all='ignore'):
        act = np.nan_to_num(np.nanstd(np.where(big, np.nan, lum), 0), nan=0.0) * 255
    act = ndimage.gaussian_filter(act, 4.0)
    x = np.clip((act - 0.7) / (1.3 - 0.7), 0, 1)
    frozen = ndimage.gaussian_filter(1 - x * x * (3 - 2 * x), 9.0)
    return (frozen * opening).astype(np.float32), act


def blur_fill(plate, known):
    out = plate * known[..., None]; k = known.astype(np.float32)
    for _ in range(80):
        if k.min() > 0.5:
            break
        num = ndimage.gaussian_filter(out * k[..., None], (10, 10, 0)); den = ndimage.gaussian_filter(k, 10)
        new = (k < 0.5) & (den > 0.08)
        out[new] = (num / np.maximum(den, 1e-4)[..., None])[new]; k[new] = 1.0
    out[k < 0.5] = out[k > 0.5].mean(0)
    return out


def fill(plate, known, reach=46):
    """Cloud under everything that is not cloud. Near an edge it is the cloud on the other side of that edge, mirrored
    (texture, so what comes out from behind a column is cloud and not a smear); further in it is a soft carry-over."""
    soft = blur_fill(plate, known)
    dist, (iy, ix) = ndimage.distance_transform_edt(~known, return_indices=True)
    yy, xx = np.mgrid[0:H, 0:W]
    my, mx = np.clip(2 * iy - yy, 0, H - 1), np.clip(2 * ix - xx, 0, W - 1)
    ok = known[my, mx] & ~known
    w = (np.clip(1 - dist / reach, 0, 1) * ok)[..., None].astype(np.float32)
    w = ndimage.gaussian_filter(w, (2, 2, 0))
    out = soft * (1 - w) + plate[my, mx] * w
    out[known] = plate[known]
    return out


def find_figure(frames, clean):
    """Serath in every frame (she turns, and her sleeve travels 20 px over the shot): whatever in her part of the
    picture is not the cloud that would be behind her. Each frame's matte is steadied over nine frames, has its bays
    closed, is joined with its neighbours' and grown by two pixels. It follows her as she is in that frame: a first
    version also took in wherever she had been in most of the shot, which left a patch of still cloud with a hard edge
    where her sleeve had been."""
    raw = []
    for f in frames:
        d = f - clean
        s = ndimage.gaussian_filter(np.abs(d.mean(2)) + 2.0 * np.abs(d[..., 0] - d[..., 2]), 1.0)
        m = s > 0.045
        m[:, :566] = False; m[:, 752:] = False
        m = ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=3))
        lab, n = ndimage.label(m)
        if n:
            m = lab == (1 + int(np.argmax(ndimage.sum(m, lab, range(1, n + 1)))))
        raw.append(m)
    steady = ndimage.median_filter(np.stack(raw).astype(np.uint8), size=(9, 1, 1), mode='nearest')
    steady = ndimage.maximum_filter(steady, size=(5, 1, 1), mode='nearest') > 0
    disk = np.hypot(*np.mgrid[-8:9, -8:9]) <= 8
    out = []
    for m in steady:
        m = ndimage.binary_closing(np.pad(m, 10), structure=disk)[10:-10, 10:-10]
        out.append(ndimage.binary_dilation(ndimage.binary_fill_holes(m), iterations=2))
    return np.stack(out)


def ease(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def field(seed, scale, t, speed, shift=(0.0, 0.0), aspect=1.0):
    """A smooth field that changes slowly and can travel: planes of noise, interpolated in time, sampled with a shift."""
    rng = np.random.default_rng(seed)
    sy, sx = scale, int(scale * aspect)
    hh, ww = H // sy + 6, W // sx + 6
    base = [rng.normal(0, 1, (hh, ww)).astype(np.float32) for _ in range(8)]
    u = t * speed + 100.0; i = int(np.floor(u)) % 8; f = u - np.floor(u); f = f * f * (3 - 2 * f)
    g = ndimage.gaussian_filter(base[i] * (1 - f) + base[(i + 1) % 8] * f, 1.0, mode='wrap')
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    g = ndimage.map_coordinates(g, [(yy - shift[1]) / sy + 2, ((xx - shift[0]) / sx + 2) % (ww - 1)], order=3, mode='wrap')
    return g / 0.6


DRIFT = (5.5, -1.6)      # px a second at the nearest: to the right and rising, as the take's own low mist goes (+20, -8 px in 4.1 s)
BILLOW = (6.0, 2.2)      # px: a large slow push and a small quicker one
VEIL = 0.016             # a veil's lift at its thickest, as a share of full white (about 6 levels of 255)


def main():
    a, b = SHOT['frames']
    frames = read(P(SHOT['take']), a, b)
    n = len(frames)
    opening, stone = masks()
    # Serath: first against cloud carried in under a rough outline of her, then the plate is taken again from the frames
    # in which each pixel is not her
    rough = poly([(606, 8), (706, 8), (712, 100), (748, 124), (748, 400), (578, 400), (584, 300), (594, 124), (612, 100)])
    plate = np.median(frames, 0)
    known = opening & ~stone & ~rough
    fig = find_figure(frames, fill(plate, ndimage.binary_erosion(known, iterations=2)))
    seen = (~fig).mean(0)                                                          # the share of frames in which a pixel is not her
    with np.errstate(all='ignore'):
        med = np.nanmedian(np.where(fig[..., None], np.nan, frames), 0)
    plate = np.where((seen > 0.15)[..., None], med, plate).astype(np.float32)
    known = opening & ~stone & (seen > 0.15)
    clean = fill(plate, ndimage.binary_erosion(known, iterations=2))
    clean[known] = plate[known]
    free, act = frozen_map(frames, fig, opening)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    near = np.clip((yy - 40) / 330.0, 0, 1)                                        # 0 far (the top of the sky), 1 near (the cloud at the rail)
    speed = (0.35 + 0.65 * near) * free
    mist = np.clip(ndimage.gaussian_filter(clean, (30, 30, 0)) + 0.03, 0, 1)       # what a veil takes far stonework toward
    # Neither Serath's matte nor the outlines of the stonework sit exactly on a real edge, so the change comes in over
    # some ten pixels beside them: no line where moved cloud meets cloud left alone.
    stone_soft = ndimage.gaussian_filter(ndimage.binary_dilation(stone, iterations=4).astype(np.float32), 4.0)
    cloud_soft = 1 - stone_soft
    open_soft = np.minimum(opening, ndimage.gaussian_filter(opening.astype(np.float32), 1.2))
    # Only the cloud's shapes are moved. The finest pattern in the take (its compression blocks, a level or two high and
    # as still as the rest of the picture) stays where it is: moved with the cloud it showed in the flat sky as a second,
    # sliding copy of itself.
    shapes = ndimage.gaussian_filter(clean, (1.1, 1.1, 0))
    out = []
    for k in range(n):
        t = k / FPS; tc = t - (n - 1) / FPS / 2                                    # tc: zero at the middle of the shot
        dx = DRIFT[0] * speed * tc + free * (BILLOW[0] * field(11, 96, t, 0.26) + BILLOW[1] * field(13, 40, t, 0.40))
        dy = DRIFT[1] * speed * tc + free * 0.6 * (BILLOW[0] * field(12, 96, t, 0.26) + BILLOW[1] * field(14, 40, t, 0.40))
        moving = np.stack([ndimage.map_coordinates(shapes[..., c], [yy - dy, xx - dx], order=3, mode='reflect') for c in range(3)], -1)
        v = 0.6 * field(31, 70, t, 0.30, shift=(DRIFT[0] * t, DRIFT[1] * t), aspect=2.6) + 0.4 * field(32, 34, t, 0.45, shift=(DRIFT[0] * 1.3 * t, DRIFT[1] * 1.3 * t), aspect=2.2)
        v = np.clip(v, -1.5, 1.5) * free * (0.45 + 0.55 * near)
        her = ease(ndimage.distance_transform_edt(~fig[k]) / 10.0).astype(np.float32)   # nothing at her edge, everything ten pixels out
        m_open = (open_soft * her)[..., None]
        m_cloud = (np.minimum(open_soft, cloud_soft) * her)[..., None]
        f = frames[k]
        g = f + (moving - shapes) * m_cloud                                        # the cloud's change, on the take's own frame
        g = g + VEIL * v[..., None] * m_open * (1 - 0.5 * stone_soft[..., None])   # veils: lighter and darker drifts of thin mist
        g = g + (mist - g) * (0.10 * np.clip(v, 0, 1.5)[..., None] * m_open * stone_soft[..., None])   # and they take a little of the far stonework with them
        out.append(np.clip(g, 0, 1))
    os.makedirs(P('out/review'), exist_ok=True)
    write(frames, P('out/review/cloud_test_before.mp4'), P(SHOT['take']), a / FPS, n / FPS)
    write(out, P('out/review/cloud_test_after.mp4'), P(SHOT['take']), a / FPS, n / FPS)
    dbg = os.environ.get('CLOUD_DEBUG')
    if dbg:
        show = np.concatenate([plate, np.stack([opening, stone, fig[n - 1]], -1).astype(np.float32), np.repeat(free[..., None], 3, 2), clean], 0)
        Image.fromarray((show * 255).astype(np.uint8)).save(os.path.join(dbg, 'masks.jpg'), quality=90)
        np.save(os.path.join(dbg, 'after.npy'), (np.stack(out) * 255 + 0.5).astype(np.uint8))
        np.save(os.path.join(dbg, 'fig.npy'), fig)
    moved = (free > 0.5) & ~stone & ~fig[0]
    print('wrote the two test clips;', n, 'frames; cloud given movement:', round(float(moved.mean()) * 100, 1), '% of the frame')


if __name__ == '__main__':
    main()
