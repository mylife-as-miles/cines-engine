"""Chapter 4's split frame: the tote as a gift and the same tote as evidence, side by side, then the right half cuts to
the seam's cut-away. No headings, no labels: the two lights say it (the warm evidence table, the cold inspection room).

    <gfx python> gfx/split.py --out out/gfx/split.mp4 [--len 5.6] [--cut 2.2] [--still 1.0 out.png]

Each half is 958 x 1080 with a 4 px dark gutter between them (x 958-961), never a black frame. Each plate is the raw
Blender render, framed on its tote (a window centred on it, scaled so the tote is about two thirds of the height), and
pushed in 3 % over the shot in log space, so neither half is a still. Both totes are then brought to the film's one cognac
(TOTE: fit_tote, through the film's grade), so the two lights differ on the table, the wall and the modelling, never in the
leather. Both halves are graded together with the film's grade (scenes/shoot.py GRADE, grain fresh each frame). At --cut the
right half cuts straight to gfx/seam.html `cutaway_half`, whose red seam opens exactly where the right-hand tote's top seam
was (a match cut inside the half), eases back to the whole section and holds it open. The cut-away is drawn after the grade, so its red stays the
film's red. --still writes the frame as the film shows it: graded, and after --cut with the cut-away in the right half.
"""
import argparse
import colorsys
import os
import shutil
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
# Right: inspection_room `handbags` (2560 x 1440): the same tote on the inspection table. Reel 10 caught the black bag beside
# it clipped against the divider (output x 963-1030): its strap ring reaches plate x 1550 and the tote starts at 1615, so the
# window's left edge sits at 1559 (scale 0.96, a little closer than the left's 0.92; its right edge at 2557, inside the plate),
# which keeps the black bag out of the half at every frame of the push. Its rim at the cut, on the output, is gfx/seam.html
# cutaway_half's HALF_SEAM (re-measure it when the plate or this framing changes).
# `panel`: a box inside the tote's front in plate pixels, where its colour is measured and fitted.
HALVES = [
    dict(plate="frames/raw/evidence_table/purses.png", cx=1933, cy=633, s=0.92, x0=0, panel=(1800, 2200, 650, 950), warm=True),
    dict(plate="frames/raw/inspection_room/handbags.png", cx=2058, cy=600, s=0.96, x0=HW + GUT,   # the native 2560 render (aec9820)
         panel=(1800, 2200, 600, 950)),
]

# The one cognac (reel 10: the gift half's warm lamp lifted the tote to a light caramel, HSL L 0.38; the cold room drained it
# to a taupe-khaki, S 0.3; and the cut-away's leather was a third, darker one, L 0.17). The tote is the film's one recurring
# object, so both totes' front panels are brought to one colour after the film's grade (the HSL of the panel's median RGB):
# a warm red-brown, never mustard, caramel or taupe. The cut-away's leather (gfx/seam.html drawLeather) is set to the same.
# The film's plate target (lead 00:40 note: graded a/b hue 60-65, C 13-14) is darker and greyer than this one (it is about
# HSL hue 26, S 0.30, L 0.19, which is the taupe the reviewer read); this one is about Lab (30, hue 55, C 25).
TOTE = dict(hue=22.0, sat=0.42, light=0.275)
TOTE_KNEE = 210.0                # the cold half's tote: where its hue-keeping shoulder starts (the gift half's light has its own)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def tote_key(img, h):
    """The tote's matte on the raw plate, 0-1: its leather is the one strongly chromatic orange-brown in either plate (chroma
    over 0.14, hue within 14 degrees of 26). The firm key's connected part that holds the panel is the tote (the wood table,
    whose hue is near but whose chroma is a third of the leather's, and the other bags fall away); small gaps in it (the pale
    stitches, the tabs' dark edges) are closed, and its edge is softened by about 1.5 output px."""
    rgb = img / 255.0
    hue = cv2.cvtColor(rgb.astype(np.float32), cv2.COLOR_RGB2HSV)[..., 0]
    k = smooth(0.06, 0.14, rgb.max(2) - rgb.min(2)) * (1 - smooth(14, 26, np.abs((hue - 26 + 180) % 360 - 180)))
    n, lab = cv2.connectedComponents((k > 0.5).astype(np.uint8), connectivity=8)
    x0, x1, y0, y1 = h["panel"]
    ids, cnt = np.unique(lab[y0:y1, x0:x1], return_counts=True)
    cnt[ids == 0] = 0
    comp = (lab == ids[np.argmax(cnt)]).astype(np.uint8)
    comp = cv2.morphologyEx(comp, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    return cv2.GaussianBlur(comp.astype(np.float32), (0, 0), 1.5 / h["s"])


def knee(out, k=TOTE_KNEE):
    k = np.float32(k)
    return np.where(out > k, k + (255 - k) * (1 - np.exp(-(out - k) / (255 - k))), out)


def tote_target_rgb():
    r, g, b = colorsys.hls_to_rgb(TOTE["hue"] / 360, TOTE["light"], TOTE["sat"])
    return np.float32([r, g, b]) * 255


def panel_out(h, z=1.0):
    """The panel box on the output frame (x0, x1, y0, y1) at push z."""
    s = h["s"] * z
    x0, x1, y0, y1 = h["panel"]
    ox = lambda x: int(round(h["x0"] + HW / 2 + s * (x - h["cx"])))
    oy = lambda y: int(round(H / 2 + s * (y - h["cy"])))
    return ox(x0), ox(x1), oy(y0), oy(y1)


def hsl_of(rgb):
    hh, ll, ss = colorsys.rgb_to_hls(*(np.asarray(rgb, float) / 255))
    return hh * 360, ss, ll


# The gift half's light: the evidence plate is lit neutral, so the two halves read dark against bright rather than warm
# against cold. The left plate is warmed before the film's grade, as a warmer lamp would warm it in Blender: a tungsten
# gain (about 3200 K against the plates' neutral) and a soft practical glow from the top left, out of frame. On that, the
# practical's own light (reel 10: the gift side read murky, the half peaking at 108 and the tote at luma 68): a lamp just
# out of frame at the top left whose light falls off with distance (inverse square, softened by its shade), worked in
# linear light and warm (its colour `col`, luma 1). It lifts the tote by `stops` at its centre, more on its near (left,
# upper) side and less toward the far corner, so the tote and table are modelled by the lamp rather than brightened flat;
# and a gentle warm pool where the lamp lands on the table at the tote's foot. Positions are fractions of the half (x of
# its width, y of its height) at the shot's first frame, held in plate pixels so the light stays put under the push. The
# lamp's extra light is only a little warmer than the tungsten gain already is (it multiplies an image that gain has
# already warmed), so the lift goes into the tote's brightness rather than piling into its red. The tungsten gain alone
# already brings the leather's red near the top, and the lamp would push a third of the tote past 255 and clip it flat; a
# soft shoulder on each channel from `knee` rolls the red off toward 255 as film does, while green and blue keep rising,
# so the lit side of the tote goes a little toward amber and keeps its modelling (a shoulder that kept the hue flattened
# it: its lit and far sides came out equal). The film's grade (A fixed) runs over both halves unchanged after it, so it
# is the light that differs, not the grade. Reel 11: the lamp, the pool and the glow still warm the table and the wall, but
# the tote's own level is TOTE's (fit_tote pulls the lamp's lift on the leather back down, about a quarter), so the warmth is
# in the room, not in a lighter leather.
WARM = dict(gain=(1.42, 1.06, 0.66), lift=1.30, glow=dict(x=0.06, y=0.04, r=0.75, amt=0.32, col=(1.0, 0.64, 0.32)),
            lamp=dict(x=-0.22, y=-0.16, r=0.30, at=(0.50, 0.58), stops=0.90, col=(1.04, 0.99, 0.84)),
            pool=dict(x=0.50, y=0.93, rx=0.40, ry=0.07, stops=0.85, col=(1.08, 0.98, 0.76)), knee=210.0)


def warm_light(img, h):
    out = img * np.float32(WARM["gain"]) * WARM["lift"]
    hh, ww = img.shape[:2]
    yy, xx = np.mgrid[0:hh, 0:ww].astype(np.float32)
    x0, y0 = h["cx"] - HW / 2 / h["s"], h["cy"] - H / 2 / h["s"]           # the half's top left at the first frame, in plate px
    fx, fy = (xx - x0) * h["s"], (yy - y0) * h["s"]                       # output px within the half
    # the practical: a linear-light gain field, 1 + a * falloff, its falloff 1 / (1 + (d / r)^2), scaled so the tote's centre
    # gets `stops`; applied to the code values as gain^(1/2.2), as the plates' own light would have been
    L = WARM["lamp"]; r = L["r"] * HW
    fall = lambda px, py: 1.0 / (1.0 + ((px - L["x"] * HW) ** 2 + (py - L["y"] * H) ** 2) / r ** 2)
    a = (2 ** L["stops"] - 1) / fall(L["at"][0] * HW, L["at"][1] * H)
    gain = 1 + a * fall(fx, fy)[..., None] * np.float32(L["col"])
    P = WARM["pool"]
    pool = np.exp(-0.5 * (((fx - P["x"] * HW) / (P["rx"] * HW)) ** 2 + ((fy - P["y"] * H) / (P["ry"] * H)) ** 2))
    gain += (2 ** P["stops"] - 1) * pool[..., None] * np.float32(P["col"])
    out *= gain ** np.float32(1 / 2.2)
    g = WARM["glow"]
    # the glow sits in plate pixels at the half's top left (the window's corner), so it holds still with the push
    gx, gy = x0 + g["x"] * HW / h["s"], y0 + g["y"] * H / h["s"]
    d2 = ((xx - gx) ** 2 + (yy - gy) ** 2) / (g["r"] * HW / h["s"]) ** 2
    out += (255 * g["amt"] * np.exp(-d2 * 2.2))[..., None] * np.float32(g["col"])
    return out                       # before the shoulder: the tote's correction goes in first (plate_with_tote)


def plate_with_tote(base, key, m, warm):
    """A half's plate with its tote corrected: `base` (the raw plate, or the gift half's light before its shoulder) times
    the per-channel multiplier m on the tote alone (the key), then the soft shoulder (the whole gift half, as its light
    always had; the tote alone on the cold half)."""
    out = base * (1 + key[..., None] * (np.float32(m) - 1))
    if warm:
        return knee(out, WARM["knee"])
    # the cold half's tote: its top light is hard, and a per-channel shoulder on its brightest leather would take the red down
    # and leave the lit top a yellower tan than the rest; this one scales the whole pixel, so the leather keeps its hue lit
    mx = out.max(2, keepdims=True)
    hk = out * (knee(mx) / np.maximum(mx, 1e-3))
    return out + key[..., None] * (hk - out)


def grade_one(img):
    g = subprocess.run(["ffmpeg", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-i", "-",
                        "-vf", grade_filter(), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                       input=img.tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(g, np.uint8).reshape(H, W, 3)


def fit_tote(bases, keys, frame):
    """The per-channel multipliers (one per half, on its tote alone) that bring each tote's front-panel median, after the
    film's grade, to TOTE. Fitted on every run through the real grade (a frame at t = 0, graded by ffmpeg), so a re-rendered
    plate or a change to the gift half's light is followed without a hand refit. Each step moves the panel's pre-grade median
    by the graded error mapped back through the grade's main action (its chroma at 0.55, BT.601 luma kept)."""
    T, wl = tote_target_rgb(), np.float32([0.299, 0.587, 0.114])
    back = lambda e: (wl @ e) + (e - (wl @ e)) / 0.55
    m = [np.ones(3, np.float32) for _ in HALVES]
    for it in range(10):
        plates = [plate_with_tote(b, k, mi, h.get("warm")) for b, k, mi, h in zip(bases, keys, m, HALVES)]
        pre = frame(0.0, plates); post = grade_one(pre)
        err = []
        for i, h in enumerate(HALVES):
            x0, x1, y0, y1 = panel_out(h)
            c = np.median(pre[y0:y1, x0:x1].reshape(-1, 3), 0).astype(np.float32)
            g = np.median(post[y0:y1, x0:x1].reshape(-1, 3), 0).astype(np.float32)
            e = T - g; err.append(float(np.abs(e).max()))
            m[i] = m[i] * np.clip(c + back(e), 1, 255) / np.maximum(c, 1)
        if max(err) < 1.0:
            break
    return m, [np.median(post[y0:y1, x0:x1].reshape(-1, 3), 0) for x0, x1, y0, y1 in (panel_out(h) for h in HALVES)], it


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
    keys = [tote_key(img, h) for h, img in zip(HALVES, raw)]
    bases = [warm_light(img, h) if h.get("warm") else img for h, img in zip(HALVES, raw)]

    def frame(t, plates):
        out = np.zeros((H, W, 3), np.float32)
        z = np.exp(np.log(a.z) * ease_push(t / a.len))
        for h, img in zip(HALVES, plates):
            s = h["s"] * z
            M = np.float32([[s, 0, HW / 2 - s * h["cx"]], [0, s, H / 2 - s * h["cy"]]])
            out[:, h["x0"]:h["x0"] + HW] = cv2.warpAffine(img, M, (HW, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return np.clip(out, 0, 255).astype(np.uint8)

    m, got, it = fit_tote(bases, keys, frame)
    T = tote_target_rgb()
    for h, mi, g in zip(HALVES, m, got):
        hh, ss, ll = hsl_of(g)
        print(f"tote {os.path.basename(h['plate'])}: x({mi[0]:.3f}, {mi[1]:.3f}, {mi[2]:.3f}) -> graded panel RGB "
              f"({g[0]:.0f}, {g[1]:.0f}, {g[2]:.0f}), HSL {hh:.1f} {ss:.2f} {ll:.3f}")
    print(f"  target ({T[0]:.0f}, {T[1]:.0f}, {T[2]:.0f}) HSL {TOTE['hue']:.1f} {TOTE['sat']:.2f} {TOTE['light']:.3f}, {it + 1} steps")
    plates = [plate_with_tote(b, k, mi, h.get("warm")) for b, k, mi, h in zip(bases, keys, m, HALVES)]
    del bases, raw
    frame_t = lambda t: frame(t, plates)

    env = dict(os.environ, NODE_PATH=subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip())
    x1 = HW + GUT
    if a.still:                          # the frame as the film shows it: graded, the cut-away in the right half after the cut
        t = float(a.still[0])
        out = grade_one(frame_t(t)).copy()
        if t >= a.cut:
            tmp = tempfile.mkdtemp(prefix="split-")                     # removed after (the disk is tight)
            try:
                png = os.path.join(tmp, "cut.png")
                subprocess.run(["node", os.path.join(HERE, "type_render.js"), "still", "cutaway_half", f"{t - a.cut:.4f}", png,
                                "--page", os.path.join(HERE, "seam.html")], check=True, env=env, capture_output=True)
                out[:, x1:] = cv2.cvtColor(cv2.imread(png, cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)[:, x1:]
            finally:
                shutil.rmtree(tmp, ignore_errors=True)
        out[:, HW:x1] = (0x0a, 0x0c, 0x0f)
        cv2.imwrite(a.still[1], cv2.cvtColor(out, cv2.COLOR_RGB2BGR)); print("still", a.still[1]); return

    n = int(round(a.len * a.fps))
    tmp = tempfile.mkdtemp(prefix="split-")                             # the graded plates and the cut-away; removed after
    try:
        render_clip(a, n, tmp, frame_t, env, x1)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def render_clip(a, n, tmp, frame, env, x1):
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
