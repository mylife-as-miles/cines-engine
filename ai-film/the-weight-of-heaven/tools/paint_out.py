#!/usr/bin/env python3
"""Paint a small static thing out of a locked-off shot, frame by frame, without generating anything.

The hole is filled from the picture on either side of it, mirrored about each edge and cross-faded,
so the fill meets its surroundings at both seams and carries each frame's own grain.
Only for a small region of soft, even ground (a field, mist, sky) in a shot where the camera does not move.

  python3 tools/paint_out.py in.mp4 out.mp4 --box 303 328 382 414 --from 13.375 [--to 16.1]
"""
import argparse, subprocess
import numpy as np
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--box', type=int, nargs=4, required=True, metavar=('X0', 'Y0', 'X1', 'Y1'))
ap.add_argument('--from', dest='t0', type=float, default=0.0)
ap.add_argument('--to', dest='t1', type=float, default=1e9)
ap.add_argument('--feather', type=float, default=3.0)
o = ap.parse_args()

probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                        'stream=width,height,r_frame_rate', '-of', 'csv=p=0', o.src], capture_output=True, text=True).stdout.strip().split(',')
w, h = int(probe[0]), int(probe[1]); num, den = probe[2].split('/'); fps = int(num) / int(den)
x0, y0, x1, y1 = o.box
bw = x1 - x0
mask = Image.new('L', (w, h), 0)
mask.paste(255, (x0, y0, x1, y1))
m = np.asarray(mask.filter(ImageFilter.GaussianBlur(o.feather))).astype(np.float32)[..., None] / 255.0
a = np.linspace(0, 1, bw, dtype=np.float32)[None, :, None]          # 0 at the left edge, 1 at the right

dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', o.src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', f'{num}/{den}', '-i', '-',
                        '-i', o.src, '-map', '0:v', '-map', '1:a?', '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p',
                        '-c:a', 'copy', o.dst], stdin=subprocess.PIPE)
n = done = 0
while True:
    buf = dec.stdout.read(w * h * 3)
    if len(buf) < w * h * 3:
        break
    t = n / fps
    if o.t0 - 1e-6 <= t < o.t1:
        f = np.frombuffer(buf, np.uint8).reshape(h, w, 3).astype(np.float32)
        left = f[y0:y1, x0 - bw:x0][:, ::-1]        # mirrored about the left edge
        right = f[y0:y1, x1:x1 + bw][:, ::-1]       # mirrored about the right edge
        fill = f.copy()
        fill[y0:y1, x0:x1] = left * (1 - a) + right * a
        f = f * (1 - m) + fill * m
        buf = np.clip(f + 0.5, 0, 255).astype(np.uint8).tobytes(); done += 1
    enc.stdin.write(buf); n += 1
enc.stdin.close(); enc.wait()
print(f'{o.dst}: {n} frames, {done} painted, box {o.box}')
