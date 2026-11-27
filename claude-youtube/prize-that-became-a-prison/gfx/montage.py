"""The cold open's flash-forward (SCRIPT_V2 1:27): ten shots of what is coming, 0.5-0.8 s each, the cuts getting
faster toward the score's peak, where the title lands (type.html `title`, a separate shot). Straight cuts only.

    <gfx python> gfx/montage.py --out out/gfx/montage.mp4

Every shot moves: a constant-speed push in log space (no easing, so the energy carries across the cuts), alternating
in and out, the larger moves late. Plates are the raw Blender renders, graded per shot with the film's grade (grain
fresh each frame). The red seam is gfx/seam.html `flash` over the graded purses plate, drawn after the grade so the
red stays the film's red.
"""
import argparse
import os
import subprocess
import tempfile

import cv2
import numpy as np

from doc_composite import grade_filter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
W, H, FPS = 1920, 1080, 24

# (plate or 'seam', frames, zoom from, zoom to, centre x, centre y as plate fractions)
SHOTS = [
    ("leather_market/purchase", 19, 1.00, 1.05, 0.50, 0.50),
    ("seam", 16, 0, 0, 0, 0),
    ("baggage_belt/curtain", 17, 1.06, 1.00, 0.50, 0.45),
    ("courtroom/dock", 16, 1.00, 1.06, 0.50, 0.55),
    ("detention_corridor/door", 15, 1.07, 1.00, 0.50, 0.45),
    ("visiting_room/glass", 15, 1.00, 1.07, 0.50, 0.50),
    ("prison_exterior/gate", 14, 1.08, 1.00, 0.50, 0.55),
    ("home/chair", 13, 1.00, 1.08, 0.50, 0.55),
    ("void_stage/cell_far", 12, 1.10, 1.00, 0.50, 0.50),
    ("hearing_room/witness", 12, 1.00, 1.10, 0.50, 0.45),
]


def plate_shot(path, n, z0, z1, cx, cy, out):
    img = cv2.cvtColor(cv2.imread(os.path.join(ROOT, "frames/raw", path + ".png"), cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB).astype(np.float32)
    ph, pw = img.shape[:2]
    base = max(W / pw, H / ph)
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-vf", grade_filter(), "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for i in range(n):
        z = z0 * (z1 / z0) ** (i / max(1, n - 1))          # constant speed in log space
        s = base * z
        # keep the window inside the plate: the centre is clamped so no edge is ever pulled in
        hx, hy = W / (2 * s), H / (2 * s)
        x = min(max(cx * pw, hx), pw - hx); y = min(max(cy * ph, hy), ph - hy)
        M = np.float32([[s, 0, W / 2 - s * x], [0, s, H / 2 - s * y]])
        frame = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        ff.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
    ff.stdin.close(); ff.wait()


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--out", required=True); a = ap.parse_args()
    tmp = tempfile.mkdtemp(prefix="montage-")
    env = dict(os.environ, NODE_PATH=subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip())
    parts = []
    for k, (p, n, z0, z1, cx, cy) in enumerate(SHOTS):
        out = os.path.join(tmp, f"{k:02d}.mp4"); parts.append(out)
        if p == "seam":
            subprocess.run(["node", os.path.join(HERE, "type_render.js"), "seq", "flash", str(n / FPS), out, "--page", os.path.join(HERE, "seam.html"),
                            "--bg", os.path.join(ROOT, "frames/graded/evidence_table/purses.jpg")], check=True, env=env, stdout=subprocess.DEVNULL)
        else:
            plate_shot(p, n, z0, z1, cx, cy, out)
    lst = os.path.join(tmp, "list.txt")
    ins = sum([["-i", f] for f in parts], [])
    fc = "".join(f"[{i}:v]fps={FPS},scale={W}:{H},setsar=1,format=yuv420p[v{i}];" for i in range(len(parts)))
    fc += "".join(f"[v{i}]" for i in range(len(parts))) + f"concat=n={len(parts)}:v=1:a=0[v]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", fc, "-map", "[v]", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p",
                    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", a.out], check=True)
    print("wrote", a.out, sum(s[1] for s in SHOTS), "frames")


if __name__ == "__main__":
    main()
