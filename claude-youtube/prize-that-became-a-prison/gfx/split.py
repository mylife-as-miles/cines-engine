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
    dict(plate="frames/raw/evidence_table/purses.png", cx=1933, cy=633, s=0.92, x0=0, panel=(1800, 2200, 650, 950), warm=True),
    dict(plate="frames/raw/inspection_room/handbags.png", cx=1974, cy=600, s=0.92, x0=HW + GUT, match=True,   # the native 2560 render (aec9820)
         panel=(1800, 2200, 600, 950)),
]

# The right-hand tote, graded to read as the same bag as the left's before the film's grade: the tote alone (a soft key on
# the leather's warm hues, so the cold room keeps its light) gets a hue shift, a saturation scale and a mid-tone gamma,
# fitted on every run by a small grid search (fit_match) so that its front panel's median colour on the raw plate meets
# the left tote's (each half's `panel`, a box inside the tote's front in plate pixels); the two halves then share the
# film grade. Fitting on every run means a re-rendered plate on either side is followed without a hand refit (the
# evidence purses re-render at 8d47b04 shifted the left tote's hue, and the old fixed values left the pair unmatched).
# The fit prints its values and its raw dE (CIE76): over 3 means the plates have drifted beyond what a grade can fix.
HUES, SATS, GAMMAS = np.arange(-24, 24.1, 2.0), np.arange(0.5, 1.61, 0.05), np.arange(0.8, 3.01, 0.1)


def lab_median(rgb):                                                    # rgb: float 0-255, any shape (..., 3)
    m = np.median(rgb.reshape(-1, 3), 0).astype(np.float32) / 255.0
    return cv2.cvtColor(m[None, None], cv2.COLOR_RGB2LAB)[0, 0]


def fit_match(left, right, lbox, rbox):
    """The hue shift, saturation scale and gamma that bring the right tote's panel median to the left's (raw plates)."""
    def crop(img, b): return img[b[2]:b[3], b[0]:b[1]]
    target = lab_median(crop(left, lbox))
    patch = crop(right, rbox)[::4, ::4].reshape(1, -1, 3) / 255.0        # every 4th pixel: the median is stable
    hsv = cv2.cvtColor(patch.astype(np.float32), cv2.COLOR_RGB2HSV)
    best = (1e9, None)
    for hue in HUES:
        for sat in SATS:
            h2 = hsv.copy(); h2[..., 0] = (h2[..., 0] + hue) % 360; h2[..., 1] *= sat
            base = np.clip(cv2.cvtColor(h2, cv2.COLOR_HSV2RGB), 1e-4, 1)
            for g in GAMMAS:
                d = float(np.linalg.norm(lab_median(base ** g * 255) - target))
                if d < best[0]:
                    best = (d, dict(hue=float(hue), sat=round(float(sat), 2), gamma=round(float(g), 2)))
    return best[1], best[0]


# The gift half's light: the evidence plate is lit neutral, so the two halves read dark against bright rather than warm
# against cold. The left plate is warmed before the film's grade, as a warmer lamp would warm it in Blender: a tungsten
# gain (about 3200 K against the plates' neutral) and a soft practical glow from the top left, out of frame. The film's
# grade (A fixed) runs over both halves unchanged after it, so it is the light that differs, not the grade.
WARM = dict(gain=(1.42, 1.06, 0.66), lift=1.30, glow=dict(x=0.06, y=0.04, r=0.75, amt=0.20, col=(1.0, 0.64, 0.32)))


def warm_light(img, h):
    out = img * np.float32(WARM["gain"]) * WARM["lift"]
    g = WARM["glow"]; hh, ww = img.shape[:2]
    # the glow sits in plate pixels at the half's top left (the window's corner), so it holds still with the push
    gx, gy = h["cx"] - HW / 2 / h["s"] + g["x"] * HW / h["s"], h["cy"] - H / 2 / h["s"] + g["y"] * H / h["s"]
    yy, xx = np.mgrid[0:hh, 0:ww].astype(np.float32)
    d2 = ((xx - gx) ** 2 + (yy - gy) ** 2) / (g["r"] * HW / h["s"]) ** 2
    out += (255 * g["amt"] * np.exp(-d2 * 2.2))[..., None] * np.float32(g["col"])
    return out


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
    raw = [cv2.cvtColor(cv2.imread(h["plate"], cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB).astype(np.float32) for h in HALVES]
    match, de = fit_match(raw[0], raw[1], HALVES[0]["panel"], HALVES[1]["panel"])
    print(f"tote match {match}: raw dE {de:.1f}" + ("  (over 3: the plates have drifted, check them)" if de > 3 else ""))
    plates = [match_tote(img, h["s"], **match) if h.get("match") else warm_light(img, h) if h.get("warm") else img for h, img in zip(HALVES, raw)]

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
