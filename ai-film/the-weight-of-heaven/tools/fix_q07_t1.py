#!/usr/bin/env python3
"""Q07 take 1 with its last shot made long enough to use. Editing only; nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/fix_q07_t1.py   ->  out/edits/Q07_t1_fixed.mp4 (silent), .json

The take's five shots came back 3.12, 4.67, 3.92, 3.79 and 0.54 s: Sarn Vale, the last, is thirteen frames. The author
(26 November) was offered a stretch by editing or a paid pickup; the stretch is made here.

  shots 1-4   the take's frames, untouched.
  shot 5      locked off, and its thirteen frames hardly change (two levels from first to last), so they are stretched
              to 77 frames (3.2 s, the length asked for) by motion-compensated interpolation. That alone is close to a
              still, so two things in it are given movement, as the cloud at Serath's arch was (tools/cloud_drift.py):
              the smoke of the chimneys flows along its own lean and billows, and the cloud above the far ridge drifts.
              Only the change is added to the stretched frames; the farms, the fields, the sheep and the wall are theirs.
"""
import importlib.util, json, os, subprocess
import numpy as np
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
W, H, FPS = 992, 432, 24
TAKE = P('out/takes/Q07_t1.mp4')
SHOTS = [0, 75, 187, 281, 372, 385]               # the take's cuts (frames)
N5 = 77                                           # shot 5's new length in frames


def frames(args):
    p = subprocess.run(['ffmpeg', '-v', 'error'] + args + ['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3)


def field(seed, scale, t, speed):
    rng = np.random.default_rng(seed); hh, ww = H // scale + 4, W // scale + 4
    base = [rng.normal(0, 1, (hh, ww)).astype(np.float32) for _ in range(8)]
    u = t * speed + 50; i = int(np.floor(u)) % 8; f = u - np.floor(u); f = f * f * (3 - 2 * f)
    g = ndimage.gaussian_filter(base[i] * (1 - f) + base[(i + 1) % 8] * f, 1.0)
    return ndimage.zoom(g, scale, order=3)[:H, :W] / 0.6


def warp(img, dx, dy):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    return np.stack([ndimage.map_coordinates(img[..., c], [yy - dy, xx - dx], order=3, mode='reflect') for c in range(3)], -1)


def main():
    take = frames(['-i', TAKE])
    a, b = SHOTS[4], SHOTS[5]; k = N5 / (b - a)
    slow = frames(['-i', TAKE, '-vf', f"select='gte(n,{a})',setpts=N/{FPS}/TB,minterpolate=fps={FPS * k:.4f}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,setpts={k:.6f}*PTS,fps={FPS}"])
    slow = np.concatenate([slow, np.repeat(slow[-1:], max(0, N5 - len(slow)), 0)])[:N5].astype(np.float32) / 255
    plate = np.median(take[a + 2:b].astype(np.float32) / 255, 0)                   # the shot's still (its first two frames are the cut settling)
    shapes = ndimage.gaussian_filter(plate, (1.0, 1.0, 0))
    luma = plate.mean(2); sat = plate.max(2) - plate.min(2)
    # the smoke: what the take itself moves near the farms (roofs and walls do not change through its thirteen frames; a
    # first mask by paleness alone took in the slate roofs, which would then have swum)
    real = np.stack([ndimage.gaussian_filter(f.astype(np.float32).mean(2) / 255, 1.2) for f in take[a + 2:b]])
    moving = real.std(0)
    box = np.zeros((H, W), bool); box[140:300, 420:720] = True
    smoke = ndimage.binary_opening((moving > 0.0045) & (sat < 0.10) & box, iterations=1)
    m_smoke = np.clip(ndimage.gaussian_filter(ndimage.binary_dilation(smoke, iterations=5).astype(np.float32), 3.0) * 1.3, 0, 1)
    # the sky: bright, grey, above the far ridge
    sky = (luma > 0.50) & (sat < 0.07); sky[150:] = False
    lab, n = ndimage.label(sky); sky = lab == (1 + int(np.argmax(ndimage.sum(sky, lab, range(1, n + 1)))))
    core = ndimage.binary_erosion(sky, iterations=3)
    m_sky = np.minimum(ndimage.gaussian_filter(core.astype(np.float32), 2.0), sky)
    spec = importlib.util.spec_from_file_location('cd', P('tools/cloud_drift.py')); cd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cd)
    skyplate = ndimage.gaussian_filter(cd.fill(plate, core), (1.0, 1.0, 0))       # cloud mirrored in under the ridge, so the drift never drags the hills into the sky
    axis = np.array([0.55, -0.83], np.float32)                                     # the way the plumes lean: up and to the right
    T, V = 2.2, 5.0                                                                # the smoke's flow repeats every T s; V px a second along the lean
    out = []
    for i in range(N5):
        t = i / FPS; tc = t - (N5 - 1) / FPS / 2
        # smoke: two copies flowing along the lean, half a period apart, crossfaded, so it flows without ever travelling far
        s = np.zeros_like(plate); wsum = 0.0
        bx = 2.2 * field(41, 28, t, 0.55); by = 2.2 * field(42, 28, t, 0.55)
        for ph in ((t / T) % 1.0, (t / T + 0.5) % 1.0):
            w = 1 - abs(2 * ph - 1); d = V * T * (ph - 0.5)
            s += w * warp(shapes, axis[0] * d + bx, axis[1] * d + by); wsum += w
        change = (s / wsum - shapes) * m_smoke[..., None]
        # sky: a slow drift to the right and a billow, as at the arch
        dx = 3.5 * tc + 4.0 * field(11, 96, t, 0.26); dy = 2.0 * field(12, 96, t, 0.26)
        change += (warp(skyplate, dx, dy) - skyplate) * m_sky[..., None]
        change += 0.012 * (field(31, 70, t + 0.0, 0.30) * m_sky)[..., None]
        out.append(np.clip(slow[i] + change, 0, 1))
    os.makedirs(P('out/edits'), exist_ok=True)
    dst = P('out/edits/Q07_t1_fixed.mp4')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                            '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dst], stdin=subprocess.PIPE)
    enc.stdin.write(take[:a].tobytes())
    for f in out:
        enc.stdin.write((f * 255 + 0.5).astype(np.uint8).tobytes())
    enc.stdin.close(); enc.wait()
    starts = SHOTS[:5]
    info = {'file': 'out/edits/Q07_t1_fixed.mp4', 'frames': a + N5, 'seconds': round((a + N5) / FPS, 3), 'shots_start_frames': starts,
            'shots_seconds': [round(x / FPS, 3) for x in starts], 'shot_lengths_s': [round((y - x) / FPS, 3) for x, y in zip(starts, starts[1:] + [a + N5])],
            'shot5': {'take_frames': b - a, 'frames_now': N5, 'smoke_share_of_frame': round(float((m_smoke > 0.5).mean()), 4), 'sky_share_of_frame': round(float((m_sky > 0.5).mean()), 4)}}
    json.dump(info, open(dst.replace('.mp4', '.json'), 'w'), indent=1); print(info)
    dbg = os.environ.get('Q07_DEBUG')
    if dbg:
        from PIL import Image
        c = lambda im: im[130:340, 380:740]
        ov = plate.copy(); ov[..., 0] = np.maximum(ov[..., 0], m_smoke)
        show = np.concatenate([np.concatenate([c(ov), c(out[0])], 1), np.concatenate([c(out[N5 // 2]), c(out[-1])], 1)], 0)
        Image.fromarray((show * 255).astype(np.uint8)).resize((1440, 840)).save(dbg, quality=88)
        d = np.abs(np.stack(out) - slow).mean(3)
        print('largest change: on the near farms %.1f levels, on the wall %.1f, in the smoke %.1f, in the sky %.1f' % (d[:, 268:330, 408:540].max() * 255, d[:, 250:432, 760:992].max() * 255, d[:, 180:262, 560:700].max() * 255, d[:, 0:60].max() * 255))


if __name__ == '__main__':
    main()
