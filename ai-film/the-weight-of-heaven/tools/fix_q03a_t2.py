#!/usr/bin/env python3
"""Q03A take 2, fixed by editing only (the author, 26 November: "Fix these for free"). Nothing is generated.

  1. Shot 5: the stray second man in the field is painted out (the fill is the ground on either side of him).
  2. Shot 4: the ox shot ran 1.25 s. It now opens on a short held beat and ends with the crows dropping
     back to the furrows: the ox's half of the frame and the crows' half are cut separately (the camera is
     locked off and the two never overlap); the crows turn at the top of their rise and come down the way
     they went up.
  3. Shots 2, 4 and 5: the dark mass that hangs over the valley in shot 1 is put back along the top of the
     frame, behind everything in the foreground (a key on the bright, cold sky; the texture is the mass
     from shot 1 of this same take).
  4. Shot 2: the pale wooden yoke in the background is pulled down to the tone of the ground behind it.
  Shot 3 (the water) is left exactly as generated: the author loves it.

  python3 tools/fix_q03a_t2.py            ->  out/edits/Q03A_t2_fixed.mp4
"""
import os, subprocess, wave
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, 'out/takes/Q03A_t2.mp4')
DST = os.path.join(HERE, 'out/edits/Q03A_t2_fixed.mp4')
W, H, FPS = 992, 432, 24
# first frame of each shot (cuts at 3.0, 7.625, 12.125 and 13.375 s)
S1, S2, S3, S4, S5, END = 0, 72, 183, 291, 321, 385
LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
rng = np.random.default_rng(7)


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def blur(a, sigma):
    """Gaussian blur of a float array (H×W or H×W×3) in 0..1."""
    if sigma <= 0:
        return a
    if a.ndim == 2:
        return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(sigma))).astype(np.float32) / 255
    return np.stack([blur(a[..., c], sigma) for c in range(3)], -1)


def read_frames():
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
    a = np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3)
    assert len(a) == END, len(a)
    return a


# ---------------------------------------------------------------- 1. the stray man in shot 5
def paint_out(f, box=(300, 326, 384, 416), feather=3.0):
    x0, y0, x1, y1 = box
    bw = x1 - x0
    m = np.zeros((H, W), np.float32); m[y0:y1, x0:x1] = 1
    m = blur(m, feather)[..., None]
    a = np.linspace(0, 1, bw, dtype=np.float32)[None, :, None]
    left = f[y0:y1, x0 - bw:x0][:, ::-1]
    right = f[y0:y1, x1:x1 + bw][:, ::-1]
    fill = f.copy()
    fill[y0:y1, x0:x1] = left * (1 - a) + right * a
    return f * (1 - m) + fill * m


# ---------------------------------------------------------------- 3. the mass overhead
def make_lid(frame_s1, y_solid, y_end, soft, tone, flip, slope=0.0):
    """The underside of the kingdom as it would close the top of a long-lens frame: texture from shot 1."""
    tex = frame_s1[0:44, 100:760]
    if flip:
        tex = tex[:, ::-1]
    hh = y_end + 24
    tex = np.asarray(Image.fromarray((tex * 255).astype(np.uint8)).resize((W, hh), Image.LANCZOS)).astype(np.float32) / 255
    tex = blur(tex, soft)
    tex = tex * (tone / max(float((tex @ LUMA).mean()), 1e-3))
    lid = np.zeros((H, W, 3), np.float32); lid[:hh] = tex
    lid[hh:] = tex[-1:].mean((0, 1))
    x = np.arange(W, dtype=np.float32)
    ph = rng.uniform(0, 6.28, 4)
    n = 5 * np.sin(x / 61 + ph[0]) + 3 * np.sin(x / 23 + ph[1]) + 2 * np.sin(x / 9.5 + ph[2]) + slope * (x - W / 2) / W
    y = np.arange(H, dtype=np.float32)[:, None]
    alpha = 1 - smooth(y, y_solid + n[None, :], y_end + n[None, :])
    # mist: the lid lightens toward its lower edge
    lid = lid * (1 + 0.55 * smooth(y, y_solid * 0.4, y_end)[..., None])
    return lid, alpha.astype(np.float32)


def add_lid(f, lid, alpha, k0, k1):
    """Composite the lid behind the foreground: only where the frame is bright, cold sky or haze."""
    lum = f @ LUMA
    cold = smooth(f[..., 2] - f[..., 0], -0.005, 0.02)
    key = smooth(lum, k0, k1) * cold
    key = np.asarray(Image.fromarray((key * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))).astype(np.float32) / 255
    key = blur(key, 1.0)                    # grown 2 px: a dark fringe on dark foreground is invisible, a bright sliver is not
    m = (key * alpha)[..., None]
    grain = rng.normal(0, 0.006, (H, W, 1)).astype(np.float32)
    return f * (1 - m) + (lid + grain) * m


# ---------------------------------------------------------------- 4. the yoke in shot 2
def yoke_region():
    x0, y0, x1, y1 = 503, 205, 676, 312
    m = np.zeros((H, W), np.float32); m[y0:y1, x0:x1] = 1
    m = blur(m, 5)
    m[:, x1 + 2:] = 0                       # never reaches her face
    xs = np.arange(W, dtype=np.float32)
    dark = m * smooth(xs, x1 + 2, x1 - 3)[None, :]
    # the last few pixels of the yoke lie against her profile: there it is only cooled, not darkened
    m2 = np.zeros((H, W), np.float32); m2[y0:y1, x0:x1 + 9] = 1
    cool = blur(m2, 5) * smooth(xs, x1 + 10, x1 + 5)[None, :]
    return dark, cool


def dim_yoke(f, regions):
    region, cool = regions
    lum = f @ LUMA
    chroma = (f[..., 0] - f[..., 2]) / (f.max(-1) + 1e-4)
    warm = (chroma > 0.17).astype(np.uint8) * 255              # the bowl, his hand
    wimg = Image.fromarray(warm).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(17)).filter(ImageFilter.GaussianBlur(3))
    protect = np.asarray(wimg).astype(np.float32) / 255
    k = blur(region * (1 - protect), 0.8)
    ground = 0.21                                              # the tone of the field behind it
    excess = np.clip(lum - ground, 0, None)
    factor = ((lum - 0.80 * excess * k) / (lum + 1e-4))[..., None]
    out = f * factor
    kc = blur(cool * (1 - protect), 0.8)
    w = (kc * smooth(excess, 0.02, 0.15))[..., None]           # where it was pale: lose the yellow too
    grey = (out @ LUMA)[..., None] * np.array([0.93, 1.0, 1.08], dtype=np.float32)
    return out * (1 - 0.8 * w) + grey * 0.8 * w


# ---------------------------------------------------------------- 2. the ox shot, lengthened
def ox_shot(fr):
    """fr: the 30 frames of the shot (floats). Returns the lengthened shot and its (label, source) list."""
    seam = smooth(np.arange(W, dtype=np.float32), 530, 560)[None, :, None]     # 0 = ox side, 1 = crows side

    def split(left, right):
        return left * (1 - seam) + right * seam

    out, log = [], []
    for i in (0, 1, 2, 3, 4, 3, 2, 1):                                           # a held beat before it starts
        out.append(fr[i]); log.append(('hold', i, i))
    for i in range(25):                                                          # the shot as generated, to the top of the crows' rise
        out.append(fr[i]); log.append(('as generated', i, i))
    # From here the two halves of the frame run separately. The ox goes on as generated (head level).
    # The crows turn at the top of their rise and come down the way they went up: no jump, no dissolve.
    crows = list(range(23, 11, -1)) + [11, 10, 9, 10, 11, 12]                    # down to the furrows, then standing
    ox = [25, 26, 27, 28, 29, 28, 27, 26, 25, 26, 27, 28, 29, 28, 27, 26, 25, 26]
    for a, b in zip(ox, crows):
        out.append(split(fr[a], fr[b])); log.append(('crows drop back', a, b))
    return out, log


# ---------------------------------------------------------------- sound: the model's track, conformed
def conform_audio(tmp_wav, out_wav, plan):
    """plan: list of (source start s, source end s, gain). Joined with 15 ms crossfades."""
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', tmp_wav], check=True)
    with wave.open(tmp_wav) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(np.float32) / 32768
    sr, xf = 48000, int(0.015 * 48000)
    out = np.zeros((0, 2), np.float32)
    for t0, t1, g in plan:
        i0, i1 = int(round(t0 * sr)), int(round(t1 * sr))
        seg = a[max(i0 - xf, 0):min(i1, len(a))].copy() * g
        if len(out) >= xf and i0 - xf >= 0:
            ramp = np.linspace(0, 1, xf, dtype=np.float32)[:, None]
            out[-xf:] = out[-xf:] * (1 - ramp) + seg[:xf] * ramp
            out = np.concatenate([out, seg[xf:]])
        else:
            out = np.concatenate([out, seg[(xf if i0 - xf >= 0 else 0):]])
    with wave.open(out_wav, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
    return len(out) / sr


def main():
    os.makedirs(os.path.dirname(DST), exist_ok=True)
    src = read_frames()
    F = lambda i: src[i].astype(np.float32) / 255
    s1ref = F(36)
    frames = []

    for i in range(S1, S2):                                   # shot 1: as generated
        frames.append(src[i])

    lid2, a2 = make_lid(s1ref, y_solid=20, y_end=58, soft=5.0, tone=0.25, flip=False, slope=10)
    region = yoke_region()
    for i in range(S2, S3):                                   # shot 2: the mass, the yoke
        f = dim_yoke(F(i), region)
        frames.append(add_lid(f, lid2, a2, 0.36, 0.48))

    for i in range(S3, S4):                                   # shot 3: untouched
        frames.append(src[i])

    lid4, a4 = make_lid(s1ref, y_solid=14, y_end=52, soft=1.4, tone=0.24, flip=True, slope=-8)
    ox, log = ox_shot([F(i) for i in range(S4, S5)])
    for f in ox:                                              # shot 4: lengthened, the mass
        frames.append(add_lid(f, lid4, a4, 0.25, 0.50))

    lid5, a5 = make_lid(s1ref, y_solid=14, y_end=44, soft=2.5, tone=0.23, flip=False, slope=6)
    for i in range(S5, END):                                  # shot 5: the stray man, the mass
        f = paint_out(F(i))
        frames.append(add_lid(f, lid5, a5, 0.33, 0.48))

    tmp = DST.replace('.mp4', '_src.wav'); wav = DST.replace('.mp4', '.wav')
    t = lambda n: n / FPS
    plan = [(0.0, t(S4), 1.0),                                # shots 1 to 3
            (t(S4) - 8 / FPS, t(S4), 0.9),                    # the held beat: the air just before it
            (t(S4), t(S5), 1.0),                              # the ox shot as generated
            (t(S5) - 13 / FPS, t(S5), 0.6),                   # the crows dropping back: the wings again, lower
            (t(S5), t(END), 1.0)]                             # shot 5
    dur = conform_audio(tmp, wav, plan)

    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p',
                            '-af', 'apad', '-c:a', 'aac', '-b:a', '192k', '-t', f'{len(frames) / FPS:.4f}', DST], stdin=subprocess.PIPE)
    for f in frames:
        if f.dtype != np.uint8:
            f = np.clip(f * 255 + 0.5, 0, 255).astype(np.uint8)
        enc.stdin.write(f.tobytes())
    enc.stdin.close(); enc.wait()
    os.remove(tmp)
    n = len(frames)
    print(f'{DST}: {n} frames, {n / FPS:.2f} s (audio {dur:.2f} s); ox shot {len(ox)} frames = {len(ox) / FPS:.2f} s')
    cuts = [S2, S3, S4, S4 + len(ox)]
    print('cuts at', [round(c / FPS, 3) for c in cuts])


if __name__ == '__main__':
    main()
