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
film's red. --still writes the frame as the clip's file shows it (graded, encoded and decoded as render_clip's output
is, deliver_plates), and after --cut with the cut-away in the right half.
"""
import argparse
import colorsys
import os
import shutil
import subprocess
import tempfile

import cv2
import numpy as np

from doc_composite import TO_YUV, ease_push, grade_filter_yuv

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
# The lit leather's ceiling: the 90th percentile of the light's shape on the whole tote (graded HSL L, blurred over the tote
# at TONE_SIGMA). With the panel at TOTE the cold room's hard top light still put a third of that tote at L 0.34-0.50 (hue
# 25-27): a light caramel top over a dark base, so the same leather read lighter and yellower on the right than on the left
# (p90 0.31). Above the panel's median the light's shape is compressed (tote_tone, hue kept, detail kept) and the lit
# leather's chroma is drawn to the panel's (tote_chroma), so both totes span about the same range of one leather and only
# the direction of the light differs. The cold tote reaches 0.35 at about the strongest compression fit_tote allows.
TOTE_P90 = 0.35


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


def leather_weight(img, key, h):
    """Where the tote's colour is set (the multiplier and the chroma lock): the key, less what on it is not leather, the
    pale thread of the stitches and the metal rings (raw HSV saturation under about 0.3; the leather is 0.45-0.95, its
    hard-lit top in the cold plate the lowest). Without it the thread was dyed with the leather (reel 11's first pass:
    cream stitches went cognac and the right-hand top seam lost them). Soft by about 0.6 output px."""
    rgb = img / 255.0
    mx = rgb.max(2)
    sat = (mx - rgb.min(2)) / np.maximum(mx, 1e-3)
    return cv2.GaussianBlur(key * smooth(0.25, 0.42, sat), (0, 0), 0.6 / h["s"])


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
# is the light that differs, not the grade. Reel 11: the tote's own level is TOTE's (fit_tote pulls the lamp's lift on the
# leather back down, about a quarter: L 0.40 to 0.275), so the warmth is in the room, not in a lighter leather. With the
# tote down the half read murky again (as review 9 found it), so the room carries it: the pool on the table is wider and
# stronger and the glow on the wall warmer, moved in from the corner the vignette darkens, and both are kept off the tote
# (it stands in them; the lamp alone models it). The wall reads about luma 35-40, the table about 40, against 26 and 31.
WARM = dict(gain=(1.42, 1.06, 0.66), lift=1.30, glow=dict(x=0.12, y=0.10, r=0.75, amt=0.50, col=(1.0, 0.58, 0.24)),
            lamp=dict(x=-0.22, y=-0.16, r=0.30, at=(0.50, 0.58), stops=0.90, col=(1.04, 0.99, 0.84)),
            pool=dict(x=0.50, y=0.90, rx=0.46, ry=0.10, stops=1.80, col=(1.10, 0.96, 0.70)), knee=210.0)


def warm_light(img, h, key=None):
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
    off = 1.0 if key is None else (1 - key)       # the pool and the glow light the room, not the leather (it stands in them)
    gain += (2 ** P["stops"] - 1) * (pool * off)[..., None] * np.float32(P["col"])
    out *= gain ** np.float32(1 / 2.2)
    g = WARM["glow"]
    # the glow sits in plate pixels at the half's top left (the window's corner), so it holds still with the push
    gx, gy = x0 + g["x"] * HW / h["s"], y0 + g["y"] * H / h["s"]
    d2 = ((xx - gx) ** 2 + (yy - gy) ** 2) / (g["r"] * HW / h["s"]) ** 2
    out += (255 * g["amt"] * np.exp(-d2 * 2.2) * off)[..., None] * np.float32(g["col"])
    return out                       # before the shoulder: the tote's correction goes in first (plate_with_tote)


TONE_SIGMA = 30.0                # plate px: the scale of the light's shape on the tote, kept apart from its detail


def tote_tone(out, key, g, panel):
    """The tote's highlights compressed, hue kept: the light's broad shape on the leather (its log luma blurred over the
    tote alone, sigma TONE_SIGMA) is compressed about the front panel's median (the level TOTE sets), slope 1 below it and
    g above (a smooth turn about 0.12 wide); the detail on it (the tabs, their stitching, the folds, the handles'
    roundness) rides on unchanged. Applied as a gain on the whole pixel through the key. g = 1 leaves it as it is. (A
    compression of every pixel, tried first, flattened the tabs into the panel; one about the whole tote's median left the
    lit top 40 % over the panel, whose box sits lower, in the cold room's shade.)"""
    if g >= 0.999:
        return out
    lY = np.log(np.maximum(out @ np.float32([0.299, 0.587, 0.114]), 1e-3))
    blur = lambda a: cv2.GaussianBlur(a, (0, 0), TONE_SIGMA)
    base = blur(lY * key) / np.maximum(blur(key), 1e-4)
    x0, x1, y0, y1 = panel
    u = base - np.median(lY[y0:y1, x0:x1][key[y0:y1, x0:x1] > 0.9])
    f = np.exp(u * (g - 1) * 0.5 * (1 + np.tanh(u / 0.12)))
    return out * (1 + key * (f - 1))[..., None]


TOTE_LOCK = 0.6                  # how far each tote pixel's chroma goes to its panel's (per unit luma): one hue lit or shaded


def tote_chroma(out, key, panel):
    """One leather, lit or in shade: each tote pixel's chroma (its colour less its BT.601 luma) is moved TOTE_LOCK of the
    way to the front panel's median chroma at the pixel's own luma, so its hue and saturation follow the panel's while its
    luma (the light, the folds, the tabs and their stitching) is kept. In the cold room the hard top light had turned the
    lit leather yellower (hue 25-27 against the panel's 21-22) as well as lighter: a caramel top on a cognac base."""
    if panel is None:
        return out
    wl = np.float32([0.299, 0.587, 0.114])
    x0, x1, y0, y1 = panel
    pm = np.median(out[y0:y1, x0:x1][key[y0:y1, x0:x1] > 0.9], 0)       # key: the leather weight here
    ct = (pm - pm @ wl) / max(float(pm @ wl), 1e-3)
    Y = (out @ wl)[..., None]
    return out + (TOTE_LOCK * key)[..., None] * (Y * (1 + ct) - out)


def plate_with_tote(base, key, m, warm, g=1.0, panel=None, wc=None):
    """A half's plate with its tote corrected: `base` (the raw plate, or the gift half's light before its shoulder) times
    the per-channel multiplier m on the tote's leather (wc, leather_weight; the key where none is given), its chroma
    locked toward its panel's (tote_chroma, the leather alone), its highlights compressed by g (tote_tone, the whole tote:
    a gain, so the thread keeps its colour), then the soft shoulder (the whole gift half, as its light always had; the
    tote alone on the cold half)."""
    wc = key if wc is None else wc
    out = tote_tone(tote_chroma(base * (1 + wc[..., None] * (np.float32(m) - 1)), wc, panel), key, g, panel)
    if warm:
        return knee(out, WARM["knee"])
    # the cold half's tote: its top light is hard, and a per-channel shoulder on its brightest leather would take the red down
    # and leave the lit top a yellower tan than the rest; this one scales the whole pixel, so the leather keeps its hue lit
    mx = out.max(2, keepdims=True)
    hk = out * (knee(mx) / np.maximum(mx, 1e-3))
    return out + key[..., None] * (hk - out)


def _decode(f):
    g = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                       capture_output=True, check=True).stdout
    return np.frombuffer(g, np.uint8).reshape(H, W, 3)


TAGS = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"]


def deliver_plates(pre):
    """An ungraded frame of the two plates as the clip's file shows it: graded and encoded exactly as render_clip does it
    (the grade inside the x264 encode, then the second, tagged encode) and decoded as a player or ffmpeg decodes it. The
    tote is fitted on this, the cognac in the file and not in the RGB: inside the encode the grade's grain lands after the
    conversion to 4:2:0, and until 28 November 2026 every encoder here also converted with ffmpeg's default BT.601 matrix
    while tagging BT.709, so warm colours came back a little yellower (reel 11's first pass, fitted on the RGB grade: the
    panel read hue 22.0 in the RGB and 24.0-24.4 in the clip). The conversion is BT.709 now (doc_composite TO_YUV); the
    fit still runs on the file, so it follows whatever the encode does."""
    tmp = tempfile.mkdtemp(prefix="split-")
    try:
        a, b = os.path.join(tmp, "a.mp4"), os.path.join(tmp, "b.mp4")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-i", "-",
                        "-vf", grade_filter_yuv(), "-frames:v", "1", "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", *TAGS, a],
                       input=pre.tobytes(), check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a, "-vf", "format=yuv420p", "-c:v", "libx264", "-crf", "16",
                        "-pix_fmt", "yuv420p", *TAGS, b], check=True)
        return _decode(b)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def deliver_one(img):
    """An RGB frame drawn by gfx/type_render.js (the cut-away) as its clip shows it: its encode (x264 CRF 14, BT.709
    matrix and tags), decoded by the tag."""
    tmp = tempfile.mkdtemp(prefix="split-")
    try:
        f = os.path.join(tmp, "one.mp4")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-i", "-",
                        "-vf", TO_YUV, "-frames:v", "1", "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p", *TAGS, f],
                       input=np.ascontiguousarray(img).tobytes(), check=True)
        return _decode(f)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def fit_tote(bases, keys, wcs, frame):
    """Per half, on its tote alone: the per-channel multiplier m that brings the front panel's median, after the film's
    grade, to TOTE, and the highlight compression g (tote_tone) that keeps the whole tote's lit leather at or under TOTE_P90.
    Fitted on every run through the real grade and the clip's encodes (a frame at t = 0, deliver_plates), so a re-rendered
    plate or a change to the gift half's light is followed without a hand refit. Each step moves the panel's pre-grade
    median by the graded error mapped back through the grade's main action (its chroma at 0.55, BT.601 luma kept), and
    scales g by the ratio of the wanted to the measured log height of the tote's 90th percentile over its median."""
    T, wl = tote_target_rgb(), np.float32([0.299, 0.587, 0.114])
    back = lambda e: (wl @ e) + (e - (wl @ e)) / 0.55
    m, g = [np.ones(3, np.float32) for _ in HALVES], [1.0 for _ in HALVES]
    kout = frame(0.0, [np.repeat(k[..., None] * 255, 3, 2) for k in keys])[..., 0] > 0.9 * 255   # each tote on the output
    kf = kout.astype(np.float32)
    for it in range(12):                 # the encode's own noise moves the panel's median by about a code value
        plates = [plate_with_tote(b, k, mi, h.get("warm"), gi, h["panel"], w) for b, k, w, mi, gi, h in zip(bases, keys, wcs, m, g, HALVES)]
        pre = frame(0.0, plates); post = deliver_plates(pre)
        # the light's shape on each tote: HSL L blurred over the tote alone at the scale tote_tone works on (its detail, the
        # tabs' and handles' own highlights, is left to ride on it and is not what reads as a lighter leather)
        L = cv2.cvtColor(post.astype(np.float32) / 255, cv2.COLOR_RGB2HLS)[..., 1]
        blur = lambda a: cv2.GaussianBlur(a, (0, 0), TONE_SIGMA * HALVES[0]["s"])
        L = blur(L * kf) / np.maximum(blur(kf), 1e-4)
        err, stats = [], []
        for i, h in enumerate(HALVES):
            x0, x1, y0, y1 = panel_out(h)
            c = np.median(pre[y0:y1, x0:x1].reshape(-1, 3), 0).astype(np.float32)
            gm = np.median(post[y0:y1, x0:x1].reshape(-1, 3), 0).astype(np.float32)
            e = T - gm
            m[i] = m[i] * np.clip(c + back(e), 1, 255) / np.maximum(c, 1)
            half = np.zeros_like(kout); half[:, h["x0"]:h["x0"] + HW] = True
            Lt = L[kout & half]; med, p90 = np.median(Lt), np.percentile(Lt, 90)
            if p90 > TOTE_P90 or g[i] < 1:
                g[i] = float(np.clip(g[i] * np.log(TOTE_P90 / med) / np.log(max(p90, med * 1.01) / med), 0.2, 1.0))
            done_g = (g[i] >= 1 and p90 <= TOTE_P90) or (g[i] <= 0.2 and p90 > TOTE_P90)   # in range, or as far as it goes
            err.append(max(float(np.abs(e).max()) / 1.5, 0.0 if done_g else abs(p90 - TOTE_P90) / 0.005))
            stats.append((gm, med, p90))
        if max(err) < 1.0:
            break
    return m, g, stats, it


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
    wcs = [leather_weight(img, k, h) for h, img, k in zip(HALVES, raw, keys)]
    bases = [warm_light(img, h, k) if h.get("warm") else img for h, img, k in zip(HALVES, raw, keys)]

    def frame(t, plates):
        out = np.zeros((H, W, 3), np.float32)
        z = np.exp(np.log(a.z) * ease_push(t / a.len))
        for h, img in zip(HALVES, plates):
            s = h["s"] * z
            M = np.float32([[s, 0, HW / 2 - s * h["cx"]], [0, s, H / 2 - s * h["cy"]]])
            out[:, h["x0"]:h["x0"] + HW] = cv2.warpAffine(img, M, (HW, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return np.clip(out, 0, 255).astype(np.uint8)

    m, g, got, it = fit_tote(bases, keys, wcs, frame)
    T = tote_target_rgb()
    for h, mi, gi, (gm, med, p90) in zip(HALVES, m, g, got):
        hh, ss, ll = hsl_of(gm)
        print(f"tote {os.path.basename(h['plate'])}: x({mi[0]:.3f}, {mi[1]:.3f}, {mi[2]:.3f}) g {gi:.2f} -> graded panel RGB "
              f"({gm[0]:.0f}, {gm[1]:.0f}, {gm[2]:.0f}), HSL {hh:.1f} {ss:.2f} {ll:.3f}; whole tote L median {med:.3f}, p90 {p90:.3f}")
    print(f"  target ({T[0]:.0f}, {T[1]:.0f}, {T[2]:.0f}) HSL {TOTE['hue']:.1f} {TOTE['sat']:.2f} {TOTE['light']:.3f}, "
          f"p90 <= {TOTE_P90}, {it + 1} steps")
    plates = [plate_with_tote(b, k, mi, h.get("warm"), gi, h["panel"], w) for b, k, w, mi, gi, h in zip(bases, keys, wcs, m, g, HALVES)]
    del bases, raw
    frame_t = lambda t: frame(t, plates)

    env = dict(os.environ, NODE_PATH=subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip())
    x1 = HW + GUT
    if a.still:                          # the frame as the film shows it: graded, the cut-away in the right half after the cut
        t = float(a.still[0])
        out = deliver_plates(frame_t(t)).copy()   # graded, as the clip's file shows it
        if t >= a.cut:
            tmp = tempfile.mkdtemp(prefix="split-")                     # removed after (the disk is tight)
            try:
                png = os.path.join(tmp, "cut.png")
                subprocess.run(["node", os.path.join(HERE, "type_render.js"), "still", "cutaway_half", f"{t - a.cut:.4f}", png,
                                "--page", os.path.join(HERE, "seam.html")], check=True, env=env, capture_output=True)
                out[:, x1:] = deliver_one(cv2.cvtColor(cv2.imread(png, cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB))[:, x1:]
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
                           "-i", "-", "-vf", grade_filter_yuv(), "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", *TAGS, graded],
                          stdin=subprocess.PIPE)
    for i in range(n):
        ff.stdin.write(frame(i / a.fps).tobytes())
    ff.stdin.close(); ff.wait()
    subprocess.run(["node", os.path.join(HERE, "type_render.js"), "seq", "cutaway_half", str(a.len - a.cut), cut,
                    "--page", os.path.join(HERE, "seam.html"), "--fps", str(a.fps)], check=True, env=env)
    # both clips are BT.709 YUV, so the cut-away goes on in YUV untouched; the gutter is a strip of its RGB colour converted
    # with the BT.709 matrix (drawbox converts its colour with BT.601's)
    fc = (f"[1:v]crop={W - x1}:{H}:{x1}:0,setpts=PTS+{a.cut}/TB[c];"
          f"color=c=0x0a0c0f:s={GUT}x{H}:r={a.fps},format=rgb24,{TO_YUV}[g];"
          f"[0:v][c]overlay={x1}:0:enable='gte(t,{a.cut})':eof_action=pass[o];"
          f"[o][g]overlay={HW}:0,format=yuv420p[v]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", graded, "-i", cut, "-filter_complex", fc, "-map", "[v]", "-frames:v", str(n),
                    "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", *TAGS, a.out], check=True)
    print("wrote", a.out, n, "frames")


if __name__ == "__main__":
    main()
