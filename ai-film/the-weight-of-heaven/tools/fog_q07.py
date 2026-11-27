#!/usr/bin/env python3
"""Q07's reel made more ominous by editing: drifting fog and cloud laid into its exterior shots. Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/fog_q07.py
        ->  out/edits/Q07_reel_v3.mp4 (silent), out/review/Q07_reel_v3_fog.mp4 (with the reel's own sound)

The author, 27 November, on the reel with the two remade shots: "Now use edit to make it more ominous with a bit of fog
and cloud around to be like in dune". A separate copy: out/review/Q07_reel_v2.mp4 is left as it was, to compare.

What is laid in (all of it made here from seeded noise, moving and changing shape through each shot):
  shot 1  the underside: dark cloud hanging along the rock's lower edge, which dims the bright band and hides the thin
          line above the cutter; fog over the far plain; a faint veil passing near the camera.
  shot 3  the plain from the air: haze thickening toward the wall, mist over the plain moving with the ground, and
          cloud passing under the camera as it flies.
  shot 4  the wall and the bird: fog along the ground and in the distance; nothing over the bright gate, where the bird is.
  shot 5  Sarn Vale: mist in the valley, darker cloud drifting over it.
  shot 2  Serath at the window: untouched (a face is not regraded without the author seeing it first).
Each exterior is also a little darker, with its edges darker still. The fog is laid toward one grey per layer; where it
is thin the picture is unchanged.
"""
import json, os, subprocess
import numpy as np
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
W, H, FPS = 992, 432, 24
SRC = 'out/edits/Q07_reel_v2'
CLOCK = json.load(open(P(SRC + '.json')))
ST = CLOCK['shots_start_frames'] + [CLOCK['frames']]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def tex(seed, scale):
    """A soft cloud texture three frames wide and high, 0..1, that tiles."""
    rng = np.random.default_rng(seed); out = np.zeros((H * 3, W * 3), np.float32)
    for k, (s, a) in enumerate(((scale, 0.6), (scale / 2, 0.28), (scale / 4, 0.12))):
        g = rng.normal(0, 1, (int(H * 3 / s) + 2, int(W * 3 / s) + 2)).astype(np.float32)
        g = ndimage.zoom(ndimage.gaussian_filter(g, 0.8, mode='wrap'), (H * 3 / g.shape[0], W * 3 / g.shape[1]), order=3, mode='wrap')[:H * 3, :W * 3]
        out += a * (g - g.mean()) / (g.std() + 1e-6)
    return np.clip(0.5 + 0.28 * out, 0, 1)


class Layer:
    def __init__(self, seed, scale, vel, density, colour, amax, gamma=1.6, period=7.0):
        self.a, self.b = tex(seed, scale), tex(seed + 100, scale)
        self.vel, self.density, self.colour, self.amax, self.gamma, self.period = vel, density, np.array(colour, np.float32), amax, gamma, period

    def alpha(self, t):
        ox, oy = int(round(self.vel[0] * t)), int(round(self.vel[1] * t))
        s = lambda m, k: np.roll(m, (-oy * k, -ox * k), (0, 1))[H:2 * H, W:2 * W]
        w = 0.5 - 0.5 * np.cos(2 * np.pi * t / self.period)                         # the shapes change as well as travel
        n = s(self.a, 1) * (1 - w) + s(self.b, 1) * w
        return np.clip(self.amax * self.density * np.clip((n - 0.30) / 0.55, 0, 1) ** self.gamma, 0, 0.92)


def band(y0, sigma):
    return np.exp(-0.5 * ((yy - y0) / sigma) ** 2)


def ramp(a, b, v=None):
    v = yy if v is None else v
    return np.clip((v - a) / (b - a), 0, 1)


VIG = 1 - 0.22 * np.clip(np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)) - 0.55, 0, 1) ** 1.5
SHOTS = {
    0: dict(gain=0.90, layers=[
        Layer(3, 190, (11, 0.5), band(176, 30) + 0.35 * band(120, 60), (0.20, 0.22, 0.26), 0.95),          # dark cloud under the rock
        Layer(5, 150, (-7, 0), ramp(250, 285) * (1 - 0.55 * ramp(300, 432)), (0.50, 0.53, 0.58), 0.60),      # fog on the far plain
        Layer(7, 420, (38, -3), np.ones((H, W), np.float32), (0.40, 0.43, 0.48), 0.22, gamma=1.2)]),        # a veil near the camera
    2: dict(gain=0.90, layers=[
        Layer(13, 210, (5, 3), 1 - ramp(40, 170), (0.30, 0.33, 0.38), 0.70),                                # haze toward the wall and the roof
        Layer(15, 130, (-4, 9), ramp(90, 200), (0.50, 0.53, 0.58), 0.42, gamma=2.0),                         # mist over the plain, moving with the ground
        Layer(17, 460, (-10, 85), 0.45 + 0.55 * ramp(120, 432), (0.46, 0.49, 0.54), 0.50, gamma=2.2)]),      # cloud passing under the camera
    3: dict(gain=0.92, layers=[
        Layer(23, 170, (9, 0), ramp(310, 400) * ramp(260, 420, xx) , (0.48, 0.51, 0.55), 0.55),             # fog along the ground, away from the gate
        Layer(25, 220, (6, 0), ramp(520, 800, xx) * (1 - ramp(330, 432)), (0.34, 0.37, 0.42), 0.50)]),       # the far wall lost in haze
    4: dict(gain=0.92, layers=[
        Layer(33, 160, (7, 1), band(190, 70) * (1 - ramp(700, 900, xx)), (0.52, 0.55, 0.57), 0.40, gamma=2.0),   # mist in the valley
        Layer(35, 240, (10, 0), 1 - ramp(40, 120), (0.24, 0.26, 0.30), 0.60)]),                              # darker cloud over it
}


def main():
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', P(SRC + '.mp4'), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
    f = np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3)
    dst = P('out/edits/Q07_reel_v3.mp4')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                            '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dst], stdin=subprocess.PIPE)
    keep = {}
    for k in range(len(f)):
        s = max(i for i in range(5) if ST[i] <= k); img = f[k].astype(np.float32) / 255
        if s in SHOTS:
            t = (k - ST[s]) / FPS; cfg = SHOTS[s]
            for L in cfg['layers']:
                a = L.alpha(t)[..., None]; img = img * (1 - a) + L.colour * a
            img = img * cfg['gain'] * VIG[..., None]
        out = (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)
        if k in (ST[s] + 2, (ST[s] + ST[s + 1]) // 2, ST[s + 1] - 3):
            keep[k] = (f[k].copy(), out.copy())
        enc.stdin.write(out.tobytes())
    enc.stdin.close(); enc.wait()
    wav = P(SRC + '_mix.wav'); rev = P('out/review/Q07_reel_v3_fog.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', dst, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', rev], check=True)
    print('wrote', os.path.relpath(rev, HERE), len(f), 'frames')
    dbg = os.environ.get('FOG_DEBUG')
    if dbg:
        from PIL import Image
        ks = sorted(keep); rows = [np.concatenate([np.concatenate([keep[k][0], keep[k][1]], 0)[::2, ::2] for k in ks[i:i + 3]], 1) for i in (0, 6, 9, 12)]
        Image.fromarray(np.concatenate(rows, 0)).save(dbg, quality=86)


if __name__ == '__main__':
    main()
