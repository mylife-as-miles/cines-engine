"""Story type over a living plate: the raw Blender plate pushed in slowly, graded with the film's grade (its grain fresh
every frame), then the type laid on top, clean. So no type shot is a frozen still.

    <gfx python> gfx/plate_type.py <mode> <seconds> <raw plate.png> <out.mp4> [--look B] [--push 1.0 1.04] [--fps 24]

The type comes from gfx/type.html (`node gfx/type_render.js seq <mode> ... .mov`, alpha); the plate's own move for the
moment (the second YES's cut and closing light) from window.plateCam, multiplied by the push. The push runs in log
space on an ease-in-out, 2-8 % a shot (cinetic); the grade is GRADE in scenes/shoot.py, with allf=t+u.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from doc_composite import grade_filter  # noqa: E402

W, H = 1920, 1080


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode"); ap.add_argument("seconds", type=float); ap.add_argument("plate"); ap.add_argument("out")
    ap.add_argument("--look", default="B"); ap.add_argument("--push", nargs=2, type=float, default=[1.0, 1.04])
    ap.add_argument("--fps", type=float, default=24)
    a = ap.parse_args()
    n = int(round(a.seconds * a.fps))
    tmp = tempfile.mkdtemp(prefix="platetype-")
    env = dict(os.environ, NODE_PATH=subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip())
    tr = os.path.join(HERE, "type_render.js")
    layer, camf = os.path.join(tmp, "type.mov"), os.path.join(tmp, "cam.json")
    subprocess.run(["node", tr, "seq", a.mode, str(a.seconds), layer, "--look", a.look, "--fps", str(a.fps)], check=True, env=env)
    subprocess.run(["node", tr, "cam", a.mode, str(a.seconds), camf, "--fps", str(a.fps)], check=True, env=env)
    cams = json.load(open(camf))
    plate = cv2.cvtColor(cv2.imread(a.plate, cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    ph, pw = plate.shape[:2]
    edge = tuple(float(v) for v in np.median(np.concatenate([plate[:4].reshape(-1, 3), plate[-4:].reshape(-1, 3), plate[:, :4].reshape(-1, 3), plate[:, -4:].reshape(-1, 3)]), 0))
    graded = os.path.join(tmp, "plate.mp4")
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(a.fps),
                           "-i", "-", "-vf", grade_filter(), "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", graded], stdin=subprocess.PIPE)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    for i in range(n):
        p = i / max(1, n - 1); e = p * p * (3 - 2 * p)
        push = a.push[0] * (a.push[1] / a.push[0]) ** e
        c = cams[i] or {"z": 1, "cx": 0.5, "cy": 0.5, "spot": None}
        k = max(W / pw, H / ph) * c["z"] * push
        dw, dh = pw * k, ph * k
        # cover the frame when the plate is larger; when a pull-back makes it smaller (the counter), centre it in the
        # void, filled with the plate's own edge colour
        bx = min(0.0, max(W - dw, W * 0.5 - dw * c["cx"])) if dw >= W else W * 0.5 - dw * c["cx"]
        by = min(0.0, max(H - dh, H * 0.5 - dh * c["cy"])) if dh >= H else H * 0.5 - dh * c["cy"]
        A = np.float32([[k, 0, bx], [0, k, by]])
        img = cv2.warpAffine(plate, A, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=edge)
        if c.get("spot"):            # the light closing in, in the plate (before the grade), as in type.html's preview
            r1, r0 = W * c["spot"]["r"], W * c["spot"]["r"] * 0.55
            d = np.sqrt((xx - W / 2) ** 2 + (yy - H * 0.58) ** 2)
            m = np.clip((d - r0) / (r1 - r0), 0, 1) * c["spot"]["dark"]
            img = img * (1 - m[..., None]) + np.float32([3, 4, 6]) / 255 * m[..., None]
        ff.stdin.write((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
    ff.stdin.close(); ff.wait()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", graded, "-i", layer, "-filter_complex",
                    "[1:v]format=rgba[t];[0:v][t]overlay=format=auto:eof_action=pass,format=yuv420p[v]", "-map", "[v]",
                    "-frames:v", str(n), "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-colorspace", "bt709",
                    "-color_primaries", "bt709", "-color_trc", "bt709", a.out], check=True)
    print("wrote", a.out, n, "frames")


if __name__ == "__main__":
    main()
