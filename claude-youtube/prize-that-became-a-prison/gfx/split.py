"""Chapter 4's split frame: the tote as a gift and the same tote as evidence, side by side, then the right half cuts to
the seam's cut-away. No headings, no labels: the two lights say it (the warm evidence table, the cold inspection room).

    <gfx python> gfx/split.py --out out/gfx/split.mp4 [--len 5.6] [--cut 2.2] [--still 1.0 out.png]

Each half is 958 x 1080 with a 4 px dark gutter between them (x 958-961), never a black frame. Each plate is the raw
Blender render, framed on its tote (a window centred on it, scaled so the tote is about two thirds of the height), and
pushed in 3 % over the shot in log space, so neither half is a still. The right half's cold plate first has its tote
matched to the left's (match_tote: the cold light read it salmon pink beside the tan cognac). Both halves are then graded
together with the film's grade (scenes/shoot.py GRADE, grain fresh each frame). At --cut the right half cuts straight to gfx/seam.html
`cutaway_half`, whose red seam opens exactly where the right-hand tote's top seam was (a match cut inside the half),
eases back to the whole section and holds it open. The cut-away is drawn after the grade, so its red stays the
film's red. --still writes the frame as the film shows it: graded, and after --cut with the cut-away in the right half.
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
# Right: inspection_room `handbags` (2560 x 1440): the same tote on the inspection table. Its rim at the cut, on the
# output, is gfx/seam.html cutaway_half's tA, tB (re-measure both when the plate or its framing changes).
HALVES = [
    dict(plate="frames/raw/evidence_table/purses.png", cx=1933, cy=633, s=0.92, x0=0),
    dict(plate="frames/raw/inspection_room/handbags.png", cx=1974, cy=600, s=0.92, x0=HW + GUT, match=True),   # the native 2560 render (aec9820)
]

# The right-hand tote, graded to read as the same bag as the left's before the film's grade: the tote alone (a soft key on
# the leather's warm hues, so the cold room keeps its light) gets a hue shift, a saturation scale and a mid-tone gamma,
# fitted by a small grid search so that its front panel's median colour on the raw plate meets the left tote's (the two
# halves then share the film grade). For the 2560 render (aec9820): hue -8, saturation 0.80, gamma 1.70; raw dE 1.9, and
# in the graded frame at 2.16 s the front panels' medians are left (68, 46, 33), right (69, 48, 35): dE 0.8. Refit when
# the plate is re-rendered (the earlier 1280 render needed +8 / 0.85 / 2.45).
MATCH = dict(hue=-8.0, sat=0.80, gamma=1.70)   # fitted on the raw plates' tote panels for the 2560 render (aec9820): dE 1.9


def match_tote(img, s, hue, sat, gamma):
    rgb = img / 255.0
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)                          # float: hue in degrees
    d = np.abs((hsv[..., 0] - 18 + 180) % 360 - 180)                    # how far from the leather's hue
    key = np.clip(1 - (d - 30) / 25, 0, 1) * np.clip((hsv[..., 1] - 0.10) / 0.20, 0, 1)
    key = cv2.GaussianBlur(key, (0, 0), 2.0 / s)[..., None]             # about 2 output px of softness
    hsv[..., 0] = (hsv[..., 0] + hue) % 360
    hsv[..., 1] *= sat
    graded = np.clip(cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB), 1e-4, 1) ** gamma
    return ((rgb + key * (graded - rgb)) * 255).astype(np.float32)


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
        img = cv2.cvtColor(cv2.imread(h["plate"], cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB).astype(np.float32)
        plates.append(match_tote(img, h["s"], **MATCH) if h.get("match") else img)

    def frame(t):
        out = np.zeros((H, W, 3), np.float32)
        z = np.exp(np.log(a.z) * ease_push(t / a.len))
        for h, img in zip(HALVES, plates):
            s = h["s"] * z
            M = np.float32([[s, 0, HW / 2 - s * h["cx"]], [0, s, H / 2 - s * h["cy"]]])
            out[:, h["x0"]:h["x0"] + HW] = cv2.warpAffine(img, M, (HW, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return np.clip(out, 0, 255).astype(np.uint8)

    env = dict(os.environ, NODE_PATH=subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip())
    x1 = HW + GUT
    if a.still:                          # the frame as the film shows it: graded, the cut-away in the right half after the cut
        t = float(a.still[0])
        g = subprocess.run(["ffmpeg", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-i", "-",
                            "-vf", grade_filter(), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           input=frame(t).tobytes(), capture_output=True, check=True).stdout
        out = np.frombuffer(g, np.uint8).reshape(H, W, 3).copy()
        if t >= a.cut:
            png = os.path.join(tempfile.mkdtemp(prefix="split-"), "cut.png")
            subprocess.run(["node", os.path.join(HERE, "type_render.js"), "still", "cutaway_half", f"{t - a.cut:.4f}", png,
                            "--page", os.path.join(HERE, "seam.html")], check=True, env=env, capture_output=True)
            out[:, x1:] = cv2.cvtColor(cv2.imread(png, cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)[:, x1:]
        out[:, HW:x1] = (0x0a, 0x0c, 0x0f)
        cv2.imwrite(a.still[1], cv2.cvtColor(out, cv2.COLOR_RGB2BGR)); print("still", a.still[1]); return

    n = int(round(a.len * a.fps))
    tmp = tempfile.mkdtemp(prefix="split-")
    graded, cut = os.path.join(tmp, "plates.mp4"), os.path.join(tmp, "cut.mp4")
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(a.fps),
                           "-i", "-", "-vf", grade_filter(), "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", graded],
                          stdin=subprocess.PIPE)
    for i in range(n):
        ff.stdin.write(frame(i / a.fps).tobytes())
    ff.stdin.close(); ff.wait()
    subprocess.run(["node", os.path.join(HERE, "type_render.js"), "seq", "cutaway_half", str(a.len - a.cut), cut,
                    "--page", os.path.join(HERE, "seam.html"), "--fps", str(a.fps)], check=True, env=env)
    fc = (f"[1:v]crop={W - x1}:{H}:{x1}:0,setpts=PTS+{a.cut}/TB[c];"
          f"[0:v][c]overlay={x1}:0:enable='gte(t,{a.cut})':eof_action=pass,"
          f"drawbox=x={HW}:y=0:w={GUT}:h={H}:color=0x0a0c0f:t=fill,format=yuv420p[v]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", graded, "-i", cut, "-filter_complex", fc, "-map", "[v]", "-frames:v", str(n),
                    "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
                    "-color_trc", "bt709", a.out], check=True)
    print("wrote", a.out, n, "frames")


if __name__ == "__main__":
    main()
