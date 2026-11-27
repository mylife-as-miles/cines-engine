"""Chapter 4's split frame: the tote as a gift and the same tote as evidence, side by side, then the right half cuts to
the seam's cut-away. No headings, no labels: the two lights say it (the warm evidence table, the cold inspection room).

    <gfx python> gfx/split.py --out out/gfx/split.mp4 [--len 5.6] [--cut 2.2] [--still 1.0 out.png]

Each half is 958 x 1080 with a 4 px dark gutter between them (x 958-961), never a black frame. Each plate is the raw
Blender render, framed on its tote (a window centred on it, scaled so the tote is about two thirds of the height), and
pushed in 3 % over the shot in log space, so neither half is a still. Both halves are graded together with the film's
grade (scenes/shoot.py GRADE, grain fresh each frame). At --cut the right half cuts straight to gfx/seam.html
`cutaway_half`, whose red seam opens exactly where the right-hand tote's top seam was (a match cut inside the half),
eases back to the whole section and holds it open. The cut-away is drawn after the grade, so its red stays the
film's red.
"""
import argparse
import os
import subprocess
import tempfile

import cv2
import numpy as np

from doc_composite import ease_push, grade_filter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
W, H, HW, GUT = 1920, 1080, 958, 4

# Each half: the plate, the window's centre in plate pixels and its scale (output px per plate px).
# Left: evidence_table `purses` (2560 x 1440): the cognac tote, the paper note at its foot.
# Right: inspection_room `handbags` (1280 x 720): the same tote under the officer's hand (upscaled until the plate is
# rendered at 2560). Its top seam at the cut, on the output: x 1147-1673, y 424 (gfx/seam.html cutaway_half's tA, tB).
HALVES = [
    dict(plate="frames/raw/evidence_table/purses.png", cx=1933, cy=633, s=0.92, x0=0),
    dict(plate="frames/raw/inspection_room/handbags.png", cx=987, cy=300, s=1.84, x0=HW + GUT),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--len", type=float, default=5.6)
    ap.add_argument("--cut", type=float, default=2.2)
    ap.add_argument("--z", type=float, default=1.03)
    ap.add_argument("--fps", type=float, default=24)
    ap.add_argument("--still", nargs=2, metavar=("T", "PNG"))
    a = ap.parse_args()
    os.chdir(ROOT)
    plates = []
    for h in HALVES:
        img = cv2.cvtColor(cv2.imread(h["plate"], cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)
        plates.append(img.astype(np.float32))

    def frame(t):
        out = np.zeros((H, W, 3), np.float32)
        z = np.exp(np.log(a.z) * ease_push(t / a.len))
        for h, img in zip(HALVES, plates):
            s = h["s"] * z
            M = np.float32([[s, 0, HW / 2 - s * h["cx"]], [0, s, H / 2 - s * h["cy"]]])
            out[:, h["x0"]:h["x0"] + HW] = cv2.warpAffine(img, M, (HW, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return np.clip(out, 0, 255).astype(np.uint8)

    if a.still:
        cv2.imwrite(a.still[1], cv2.cvtColor(frame(float(a.still[0])), cv2.COLOR_RGB2BGR)); print("still", a.still[1]); return

    n = int(round(a.len * a.fps))
    tmp = tempfile.mkdtemp(prefix="split-")
    graded, cut = os.path.join(tmp, "plates.mp4"), os.path.join(tmp, "cut.mp4")
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(a.fps),
                           "-i", "-", "-vf", grade_filter(), "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", graded],
                          stdin=subprocess.PIPE)
    for i in range(n):
        ff.stdin.write(frame(i / a.fps).tobytes())
    ff.stdin.close(); ff.wait()
    env = dict(os.environ, NODE_PATH=subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip())
    subprocess.run(["node", os.path.join(HERE, "type_render.js"), "seq", "cutaway_half", str(a.len - a.cut), cut,
                    "--page", os.path.join(HERE, "seam.html"), "--fps", str(a.fps)], check=True, env=env)
    x1 = HW + GUT
    fc = (f"[1:v]crop={W - x1}:{H}:{x1}:0,setpts=PTS+{a.cut}/TB[c];"
          f"[0:v][c]overlay={x1}:0:enable='gte(t,{a.cut})':eof_action=pass,"
          f"drawbox=x={HW}:y=0:w={GUT}:h={H}:color=0x0a0c0f:t=fill,format=yuv420p[v]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", graded, "-i", cut, "-filter_complex", fc, "-map", "[v]", "-frames:v", str(n),
                    "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
                    "-color_trc", "bt709", a.out], check=True)
    print("wrote", a.out, n, "frames")


if __name__ == "__main__":
    main()
