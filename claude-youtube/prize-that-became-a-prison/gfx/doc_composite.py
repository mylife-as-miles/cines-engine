"""Pin a real document page onto a blank-sheet plate, light it with the plate, mark a phrase, push in, grade.

    <gfx python> gfx/doc_composite.py --shot gfx/shots/s1_yes.json --out out/gfx/s1_yes.mp4 [--still 3.0 out.png]
    <gfx python> gfx/doc_composite.py --shot gfx/shots/s1_yes.json --camlog     (the camera per frame, the strokes)

A shot file (JSON) names the plate and its corner pins (from evidence_table `page` / `pair`), the PDF page, the
phrases to mark (in order, with their timing), the phrases to keep soft (privacy), the framing and the push.
Everything is a function of t, so any frame can be rendered alone.

How it composites. The page is rasterised once (pdftoppm), its words located with pdftotext -bbox. For each frame the
page is warped straight into the output frame through one homography: page corners -> the plate's pins -> the crop
of the camera move. So the text stays sharp at any zoom, and the plate (paper falloff and wood) is resampled under
it. The page is an albedo: paper 1.0, ink about 0.07, the marker a pale yellow reflectance; it multiplies the lit
blank sheet in linear light, so the lamp's falloff, the paper's warmth and the grade all carry onto the page. The
sheet under the page gets the page's own exposure (`page_gain`, linear, with a hue-keeping shoulder), so the paper
reads white after the grade; the grade itself is never touched. A focus band keeps the marked line sharp and softens
lines away from it (two fixed blur levels, cinetic's rule), which is also what keeps private lines unreadable. The
film's grade (GRADE in scenes/shoot.py) is applied last, with its grain.
Motion numbers from cinetic: the push runs in log space, 2-8 % a shot, landing 60/85/97 % of the way at 25/50/75 %
of its time, then creeping (when `length` outlasts `duration`; the creep's rate eases in over 12 frames from the
push's own landing rate, so the end push never starts with a jolt). The push's ends are clamped to the plate, never
its path, so the centre moves on one straight eased line. An optional `drift` eases the camera on after the push
lands somewhere new (the search). A mark (`t`, `dur` a line) ends at t + dur x lines, on its spoken word; each line's
stroke is a hand's stroke (ramped speed) that spends `swipe_frames` (20) crossing the screen, with a dry, fixed-seed
edge feathered 2-3 px on screen.
Options a shot may set, all off by default: `tex_bleed_px` (a screen texture's edge pixels carried that many plate px
past the pins, over a plate whose lit face bleeds past them: the scale), `glow` ({"sigma_px", "gain"}: the lit face's
light spilling onto the bezel around it, sigma in plate px) and `focus_band.zoom_scaled` (the band's blur grows with the
push, reaching `blur_px` at the end zoom, as a lens's blur does when it moves in: the email).
"""
import argparse
import json
import os
import re
import subprocess
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
W, H = 1920, 1080


def grade_filter():
    src = open(os.path.join(ROOT, "scenes", "shoot.py")).read()
    m = re.search(r'GRADE = \((.*?)\)\s*#', src, re.S)
    g = "".join(re.findall(r'"([^"]*)"', m.group(1)))
    return g.replace("allf=u", "allf=t+u")       # the grade's grain, made temporal for moving shots (fresh each frame)


def srgb_to_lin(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def ease_push(p):            # 60 / 85 / 97 % of the move at 25 / 50 / 75 % of the time (an exponential out)
    p = min(max(p, 0.0), 1.0)
    k = 3.7
    return (1 - np.exp(-k * p)) / (1 - np.exp(-k))


def ease_push_rate(p):       # d ease_push / dp
    k = 3.7
    return k * np.exp(-k * min(max(p, 0.0), 1.0)) / (1 - np.exp(-k))


# The page and its marker. The lit paper peaked at 186-189/255 after the grade (grey, and the marker read khaki), so the
# page's own exposure lifts the sheet under the page (in linear light, the page quad only; never the grade). The marker
# is a pale highlighter yellow, multiplied into the paper like ink; its edge is feathered by a fixed amount on screen.
PAGE_GAIN = 1.6              # linear gain on the lit sheet: the paper peaks near 225/255 after the grade
PAGE_KNEE = 0.8              # linear level where the lifted sheet's brightest channel starts to roll off (no clipped red)
MARKER_RGB = [1.0, 1.0, 0.35]  # a clean pale yellow (was 0.97, 0.86, 0.30: khaki on the grey paper, after the grade)
MARKER_FEATHER_PX = 0.35     # Gaussian sigma of the stroke's edge on screen, px (with the render's softness: 2-3 px 10-90 %)

CREEP = 0.0012               # after the push lands: a one-way creep in, log zoom per frame (24 fps)
CREEP_IN = 12                # frames over which the creep's rate eases in, so the end push never starts with a jolt


def creep_log(u, r0):
    """Log zoom the creep has added u frames after landing. Its rate eases from r0 (the push's own rate as it lands) to
    CREEP over CREEP_IN frames along a smoothstep, then holds."""
    if u <= 0:
        return 0.0
    n = float(CREEP_IN)
    if u < n:
        x = u / n
        return CREEP * u - (CREEP - r0) * (u - n * (x ** 3 - x ** 4 / 2))
    return CREEP * u - (CREEP - r0) * n / 2


def ease_inout(p):           # stdInOut (the focus rack, the texture rack, the drift)
    p = min(max(p, 0.0), 1.0)
    return p * p * (3 - 2 * p)


STROKE_RAMP = 0.2            # the marker's speed ramps up over the first 20 % of a stroke's time and down over the last
SWIPE_FRAMES = 20            # frames a line's stroke spends crossing the screen, whatever part of the line runs off the
                             # frame: measured on S1, 18-19 frames of visible growth, 13 frames from 10 % to 90 % covered
LINE_GAP = 2                 # frames between one line's stroke ending and the next line's starting (the pen moves down)


def ease_stroke(u, a=STROKE_RAMP):
    """A hand's stroke: speed ramps up, holds, ramps down (a trapezoid velocity), 0..1 over u = 0..1."""
    u = min(max(u, 0.0), 1.0)
    v = 1.0 / (1.0 - a)
    if u < a:
        return 0.5 * v * u * u / a
    if u > 1 - a:
        return 1.0 - 0.5 * v * (1 - u) ** 2 / a
    return 0.5 * v * a + v * (u - a)


_U = np.linspace(0, 1, 2001)
_S = np.array([ease_stroke(u) for u in _U])


def ease_stroke_inv(s):
    return float(np.interp(s, _S, _U))


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


class Page:
    def __init__(self, pdf, page, dpi):
        self.dpi = dpi
        stem = f"/tmp/docpage_{os.path.basename(pdf)}_{page}_{dpi}"
        if not os.path.exists(stem + ".png"):
            subprocess.run(["pdftoppm", "-r", str(dpi), "-f", str(page), "-l", str(page), "-gray", "-png",
                            "-singlefile", pdf, stem], check=True)
        g = cv2.imread(stem + ".png", cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0
        self.h, self.w = g.shape
        self.ink = np.clip((1.0 - g) * 1.08, 0, 1)                 # 0 on paper, 1 on ink
        html = subprocess.run(["pdftotext", "-f", str(page), "-l", str(page), "-bbox", pdf, "-"],
                              capture_output=True, text=True, check=True).stdout
        s = dpi / 72.0
        self.words = [(m.group(5), float(m.group(1)) * s, float(m.group(2)) * s, float(m.group(3)) * s, float(m.group(4)) * s)
                      for m in re.finditer(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', html)]
        # Privacy: a real person's contact details never reach the screen. Every word that is an email address or a
        # phone number (S1's letter ends with Tim Hunt's) is erased from the ink and from the word list, on every page
        # of every document, whatever a shot frames.
        contact = re.compile(r'@|^\(?\d{3}\)?[-.\s]?\d{3}[-.]\d{4}$|^\d{3}[-.]\d{3}[-.]\d{4}$|^\d{3}[-.]\d{4}$')
        keep = []
        for w in self.words:
            if contact.search(w[0]):
                py, px = 0.06 * (w[4] - w[2]), 0.3 * (w[4] - w[2])   # tight above and below (the signature sits close above)
                y0, y1 = int(max(0, w[2] - py)), int(min(self.h, w[4] + py))
                x0, x1 = int(max(0, w[1] - px)), int(min(self.w, w[3] + px))
                self.ink[y0:y1, x0:x1] = 0.0
            else:
                keep.append(w)
        self.redacted = len(self.words) - len(keep)
        self.words = keep

    def find(self, phrase):
        """The word boxes of a phrase (first occurrence), grouped into lines: [[(x0,y0,x1,y1), ...], ...]."""
        target = [norm(w) for w in phrase.split() if norm(w)]
        toks = [norm(w[0]) for w in self.words]
        for i in range(len(toks)):
            j, k = i, 0
            while j < len(toks) and k < len(target):
                if not toks[j]:
                    j += 1
                    continue
                if toks[j] != target[k]:
                    break
                j += 1
                k += 1
            if k == len(target):
                boxes = [w[1:] for w in self.words[i:j] if norm(w[0])]
                lines = []
                for b in boxes:
                    if lines and abs(b[1] - lines[-1][-1][1]) < 0.5 * (b[3] - b[1]):
                        lines[-1].append(b)
                    else:
                        lines.append([b])
                return lines
        raise ValueError(f"phrase not found on the page: {phrase!r}")


class Texture:
    """A moving texture (the laptop screen's UI) read from a video, frame by frame in order (or seeked for a still)."""
    def __init__(self, path, fps):
        self.cap, self.fps, self.i, self.img = cv2.VideoCapture(path), fps, -1, None
        self.w, self.h = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.n = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))

    def get(self, t):
        k = min(self.n - 1, max(0, int(round(t * self.fps))))
        if k < self.i or self.img is None and k > 0:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, k); self.i = k - 1
        while self.i < k:
            ok, im = self.cap.read()
            if not ok:
                break
            self.img, self.i = cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0, self.i + 1
        return self.img


def expand_quad(q, d):
    """The quad q (4 x 2, corners in order) with each edge moved d px outward; the corners are the moved edges' crossings."""
    q = np.float64(q)
    c = q.mean(0)
    edges = []
    for i in range(4):
        a, b = q[i], q[(i + 1) % 4]
        n = np.array([b[1] - a[1], a[0] - b[0]])
        n /= np.linalg.norm(n)
        if np.dot(n, a - c) < 0:
            n = -n
        edges.append((a + d * n, b - a))
    out = []
    for i in range(4):                        # corner i joins edge i-1 (q[i-1] -> q[i]) and edge i (q[i] -> q[i+1])
        (p1, d1), (p2, d2) = edges[i - 1], edges[i]
        s = np.linalg.solve(np.array([d1, -d2]).T, p2 - p1)
        out.append(p1 + s[0] * d1)
    return np.float64(out)


def quad_mask(q):
    """An antialiased 0..1 mask of a screen-space quad."""
    m = np.zeros((H, W), np.uint8)
    cv2.fillConvexPoly(m, np.int32(np.round(np.clip(q, -1e5, 1e5) * 16)), 255, lineType=cv2.LINE_AA, shift=4)
    return m.astype(np.float32) / 255.0


def stroke_band(line, i, n, pad):
    """A line's marker band in page pixels: (x0, x1, top, bottom, em). The band is about 1.3 x-heights tall and sits on
    the line; it starts pad[0] em before the first word and ends pad[1] em past the last (0.25 em on all but the last
    line of a mark, whose end pad is per mark: a quote, a stop)."""
    x0 = min(b[0] for b in line); x1 = max(b[2] for b in line)
    y0 = min(b[1] for b in line); y1 = max(b[3] for b in line)
    em = y1 - y0                               # the word box: ascent to descent
    x0 -= pad[0] * em; x1 += (pad[1] if i == n - 1 else 0.25) * em
    base, xh = y0 + 0.77 * em, 0.42 * em       # baseline and x-height, estimated from the box
    return x0, x1, base - 1.12 * xh, base + 0.20 * xh, em


def stroke_mask(page, line, i, n, pad, p, sigma, seed):
    """Coverage 0..1 of one line's marker stroke written to fraction p (0..1, already eased), as (mask, y0, x0): the
    mask covers only the stroke's box. Edges are antialiased (fractional coverage of each pixel row, and of the
    leading column), then feathered by `sigma` page pixels (set per shot from the screen scale, so the feather is the
    same 2-3 px on screen at any zoom). A dry edge: a slow wobble of the top and bottom, fixed per line (its own seed),
    so it never boils."""
    if p <= 0:
        return None
    x0, x1, y0, y1, em = stroke_band(line, i, n, pad)
    rng = np.random.default_rng(seed)
    knots = rng.normal(0, 0.035 * em, size=(2, max(4, int((x1 - x0) // 160) + 2)))
    xe = x0 + (x1 - x0) * p
    xs = np.arange(int(np.floor(x0)), int(np.ceil(xe)))
    if len(xs) < 2:
        return None
    kx = np.linspace(x0, x1, knots.shape[1])           # the wobble is fixed along the whole line, not stretched
    top = y0 + np.interp(xs + 0.5, kx, knots[0])
    bot = y1 + np.interp(xs + 0.5, kx, knots[1])
    m = int(np.ceil(3 * sigma)) + 2
    ry0 = int(np.floor(top.min())) - m; ry1 = int(np.ceil(bot.max())) + m
    rx0 = xs[0] - m; rx1 = xs[-1] + 1 + m
    ys = np.arange(ry0, ry1)[:, None].astype(np.float32)
    cov = np.clip(np.minimum(bot[None, :], ys + 1) - np.maximum(top[None, :], ys), 0, 1)
    colw = np.clip(np.minimum(xs + 1, xe) - np.maximum(xs, x0), 0, 1)   # partial first and leading columns
    box = np.zeros((ry1 - ry0, rx1 - rx0), np.float32)
    box[:, m:m + len(xs)] = cov * colw[None, :]
    if sigma > 0.05:
        box = cv2.GaussianBlur(box, (0, 0), sigma)
    return box, ry0, rx0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shot", required=True)
    ap.add_argument("--out")
    ap.add_argument("--still", nargs=2, metavar=("T", "PNG"))
    ap.add_argument("--fps", type=float, default=24)
    ap.add_argument("--nograde", action="store_true")
    ap.add_argument("--camlog", action="store_true", help="print the zoom and its rate per frame, render nothing")
    a = ap.parse_args()
    shot = json.load(open(a.shot))
    rel = lambda p: p if os.path.isabs(p) else os.path.join(ROOT, p)

    plate = cv2.cvtColor(cv2.imread(rel(shot["plate"]), cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    PH, PW = plate.shape[:2]
    cj = json.load(open(rel(shot["corners"])))
    pins = cj["pages"][shot.get("sheet", 0)]["corners"] if "pages" in cj else cj["corners"]
    dst = np.float32([pins["top_left"], pins["top_right"], pins["bottom_right"], pins["bottom_left"]])
    tex = Texture(rel(shot["texture"]["video"]), shot["texture"].get("fps", 24)) if "texture" in shot else None
    page = tex if tex else Page(rel(shot["pdf"]), shot["page"], shot.get("dpi", 400))
    src = np.float32([[0, 0], [page.w, 0], [page.w, page.h], [0, page.h]])
    H_pp = cv2.getPerspectiveTransform(src, dst).astype(np.float64)

    # private lines: soften in page space so no frame can read them
    ink = None if tex else page.ink.copy()
    for phrase in ([] if tex else shot.get("soft", [])):
        for line in page.find(phrase):
            y0 = int(min(b[1] for b in line) - 6); y1 = int(max(b[3] for b in line) + 6)
            band = ink[y0:y1]
            ink[y0:y1] = cv2.GaussianBlur(band, (0, 0), 14) * 0.85
    marks = [(page.find(mk["phrase"]), mk["t"], mk.get("dur", 0.5), tuple(mk.get("pad_em", (0.25, 0.25))),
              mk.get("swipe_frames", shot.get("swipe_frames", SWIPE_FRAMES))) for mk in shot.get("marks", [])]
    yellow = np.float32(shot.get("marker_rgb", MARKER_RGB))   # display-referred reflectance, linearised below
    yellow_lin = srgb_to_lin(yellow)
    feather = shot.get("marker_feather_px", MARKER_FEATHER_PX)
    gain = 1.0 if tex else shot.get("page_gain", PAGE_GAIN)   # the page's own exposure: a screen keeps its glow

    # framing: the crop centre and zoom follow a log-space push toward `focus` (a phrase, in plate pixels)
    if tex:                                   # a screen: focus is a point given as fractions of the texture
        fx, fy = shot["focus_uv"][0] * page.w, shot["focus_uv"][1] * page.h
        fl = [[(fx - 10, fy - shot.get("em_px", 30) / 2, fx + 10, fy + shot.get("em_px", 30) / 2)]]
    else:
        fl = page.find(shot["focus"]) if "focus" in shot else marks[0][0]
        fx = np.mean([(b[0] + b[2]) / 2 for line in fl for b in line]); fy = np.mean([(b[1] + b[3]) / 2 for line in fl for b in line])
    focus_plate = cv2.perspectiveTransform(np.float64([[[fx, fy]]]), H_pp)[0, 0]
    z0, z1 = shot["zoom"]                     # zoom relative to the full plate (1.0 = the whole 2560 frame)
    dur = shot["duration"]
    roll = np.deg2rad(shot.get("roll_deg", 0.0))   # optional roll so the lines sit nearer level on screen
    cr, sr = np.cos(roll), np.sin(roll)

    def clamp(c, z):
        """Keep the crop inside the plate (no mirrored plate at the edges), whatever the focus point."""
        k = W / PW * z
        hw, hh = W / 2 / k * (1 + abs(sr)), H / 2 / k * (1 + abs(sr))
        return np.array([min(max(c[0], hw), PW - hw), min(max(c[1], hh), PH - hh)])

    # The push's two ends are clamped, not its path. A centre clamped frame by frame rides the moving edge of the
    # allowed region and leaves it with a kink (the scale's +3.6 -> -11.5 px/frame jolt; the mail's drift that stopped
    # dead). The allowed region's half-size changes with 1/zoom, which is convex along a log-space push, so the
    # straight path between two allowed ends stays allowed: the per-frame clamp below never acts on it.
    c0 = clamp(np.float64(shot.get("start_center", focus_plate)), z0)
    c1 = clamp(focus_plate + np.float64(shot.get("end_offset", [0, 0])), z1)

    r_land = np.log(z1 / z0) * ease_push_rate(1.0) / (dur * 24)   # the push's log-zoom rate per frame as it lands

    def push(t):
        p = ease_push(t / dur)
        z = z0 * (z1 / z0) ** p
        c = c0 + (c1 - c0) * p
        if t > dur:                           # a one-way creep after landing, its rate eased in (no jolt)
            z *= np.exp(creep_log((t - dur) * 24, r_land))
        return z, c

    def screen_matrix(z):
        k = W / PW * z
        return np.array([[k * cr, -k * sr], [k * sr, k * cr]], np.float64)

    # an optional second move on top of the push ("drift": {"t", "dur", "uv", "to"}): from t, over dur, the camera eases
    # (in and out) until the point uv (fractions of the page or texture) sits at screen position `to` ([x, y]; null
    # keeps that axis), then holds. The search uses it to bring the result that matters up out of the caption band.
    drift = shot.get("drift")
    drift_d = np.zeros(2)
    if drift:
        q = cv2.perspectiveTransform(np.float64([[[drift["uv"][0] * page.w, drift["uv"][1] * page.h]]]), H_pp)[0, 0]
        ze, ce = push(drift["t"] + drift["dur"])
        M = screen_matrix(ze)
        s_end = np.array([W / 2, H / 2]) + M @ (q - ce)
        to = drift.get("to", [None, None])
        want = np.array([s_end[0] if to[0] is None else to[0], s_end[1] if to[1] is None else to[1]], np.float64)
        drift_d = np.linalg.solve(M, s_end - want)

    def camera(t):
        z, c = push(t)
        if drift:
            c = c + drift_d * ease_inout((t - drift["t"]) / drift["dur"])
        return z, clamp(c, z)                 # a safety net only (see above); the camlog flags any frame it moves

    def view(t):
        z, c = camera(t)
        M = screen_matrix(z)
        A = np.eye(3)
        A[:2, :2] = M
        A[:2, 2] = np.array([W / 2, H / 2]) - M @ c
        return A, A @ H_pp

    # The marks. A mark ends where its (t, dur) timing always ended it, t + dur x lines, on its spoken word; each line's
    # stroke is a hand's stroke (speed ramps up, holds, ramps down) timed so it spends `swipe_frames` crossing the
    # screen: a line whose start runs off the frame begins its stroke off screen, earlier, and enters at speed. Lines
    # are written in order, the pen moving down between them. The feather is set per stroke from the screen scale.
    strokes = []
    for mi, (lines, t0, d, pad, swipe) in enumerate(marks):
        n = len(lines)
        te = t0 + d * n
        for i in reversed(range(n)):
            x0, x1, y0, y1, em = stroke_band(lines[i], i, n, pad)
            _, Ht = view(te)
            xs = np.linspace(x0, x1, 401)
            pts = cv2.perspectiveTransform(np.stack([xs, np.full_like(xs, (y0 + y1) / 2)], -1)[None], Ht)[0]
            on = np.where((pts[:, 0] >= 0) & (pts[:, 0] < W) & (pts[:, 1] >= 0) & (pts[:, 1] < H))[0]
            if len(on) and (on[-1] - on[0]) / 400 > 0.05:
                frac = ease_stroke_inv(on[-1] / 400) - ease_stroke_inv(on[0] / 400)
                nfr = min(swipe / max(frac, 1e-3), 3 * swipe)
                xm = xs[(on[0] + on[-1]) // 2]
            else:
                nfr, xm = swipe, (x0 + x1) / 2
            ab = cv2.perspectiveTransform(np.float64([[[xm, (y0 + y1) / 2], [xm, (y0 + y1) / 2 + 1]]]), Ht)[0]
            sigma = feather / max(np.hypot(*(ab[1] - ab[0])), 1e-6)   # screen px -> page px, across the line
            ts = te - nfr / a.fps
            strokes.append(dict(line=lines[i], i=i, n=n, pad=pad, t=ts, T=nfr / a.fps, sigma=sigma, seed=7 + 31 * mi + i,
                                mark=mi, on=(round(float(on[0]) / 400, 3), round(float(on[-1]) / 400, 3)) if len(on) else None))
            te = ts - LINE_GAP / a.fps

    # A screen texture's bleed (off unless the shot sets tex_bleed_px). The scale's plate lights its face 3-4 px past the
    # pins (a hairline at about raw 200, then the bezel), while the texture darkens its own edges inside them: warped
    # alone, the hairline read as a white keyline inside the bezel. The texture's edge pixels are carried out to the pins
    # moved tex_bleed_px outward, so the plate's whole lit face is under the texture. The lit face (pins plus bleed) is
    # also the source of the optional glow onto the bezel.
    bleed = float(shot.get("tex_bleed_px", 0.0)) if tex else 0.0
    face_q = expand_quad(dst, bleed) if bleed > 0 else np.float64(dst)
    glow = shot.get("glow") if tex else None
    to_screen = lambda A, q: q @ A[:2, :2].T + A[:2, 2]

    def frame(t):
        A, Ht = view(t)
        base = cv2.warpAffine(plate, A[:2], (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        fm = quad_mask(to_screen(A, face_q)) if (bleed > 0 or glow) else None
        if tex:                               # an emissive screen: the UI scales the blank display's own glow
            alb = srgb_to_lin(tex.get(t)).astype(np.float32)
        else:                                 # page albedo for this frame (marker under the ink)
            mk = np.zeros((page.h, page.w), np.float32)
            for st in strokes:
                u = (t - st["t"]) / st["T"]
                if u <= 0:
                    continue
                r = stroke_mask(page, st["line"], st["i"], st["n"], st["pad"], ease_stroke(u), st["sigma"], st["seed"])
                if r is None:
                    continue
                box, by, bx = r
                ya, yb, xa, xb = max(by, 0), min(by + box.shape[0], page.h), max(bx, 0), min(bx + box.shape[1], page.w)
                if ya < yb and xa < xb:
                    mk[ya:yb, xa:xb] = np.maximum(mk[ya:yb, xa:xb], box[ya - by:yb - by, xa - bx:xb - bx])
            ink_lin = 1.0 - 0.93 * ink              # ink reflectance about 0.07
            alb = np.stack([ink_lin * (1 - mk + mk * yellow_lin[i]) for i in range(3)], -1)
        # pre-scale the page texture near the output scale so the warp does not alias
        scale = np.sqrt(abs(np.linalg.det(Ht[:2, :2])))
        wb = dict(borderMode=cv2.BORDER_REPLICATE) if bleed > 0 else dict(borderValue=(1, 1, 1))
        if scale < 0.8:
            f = max(scale * 1.25, 0.05)
            small = cv2.resize(alb, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
            S = np.diag([1 / f, 1 / f, 1.0])
            alb_w = cv2.warpPerspective(small, Ht @ S, (W, H), flags=cv2.INTER_LINEAR, **wb)
        else:
            alb_w = cv2.warpPerspective(alb, Ht, (W, H), flags=cv2.INTER_LINEAR, **wb)
        if bleed > 0:                         # the texture's edge carried over the bleed; the plate untouched beyond it
            alb_w = 1.0 + (alb_w - 1.0) * fm[..., None]
        tb = shot.get("tex_blur_px", 0.55)                    # the render's own softness (or defocus)
        tr = shot.get("tex_blur_rack")                         # a rack focus onto the texture: [t0, t1, blur at t1]
        if tr:
            tb = tb + (tr[2] - tb) * ease_inout((t - tr[0]) / (tr[1] - tr[0]))
        alb_w = cv2.GaussianBlur(alb_w, (0, 0), tb)
        lit = srgb_to_lin(base) * alb_w
        if gain != 1.0:                       # the page's own exposure: the sheet under the page quad only, in linear light
            q = cv2.perspectiveTransform(src[None].astype(np.float64), Ht)[0]
            pm = np.zeros((H, W), np.uint8)
            cv2.fillConvexPoly(pm, np.int32(np.round(np.clip(q, -1e5, 1e5) * 16)), 255, lineType=cv2.LINE_AA, shift=4)
            pm = cv2.GaussianBlur(pm.astype(np.float32) / 255.0, (0, 0), 1.0)
            lit *= (1.0 + (gain - 1.0) * pm)[..., None]
            # a shoulder on the brightest channel, hue kept (the lamp-warm sheet's red would clip first): above KNEE
            # the largest channel rolls off toward 1.0 and the other two follow it in proportion
            mx = lit.max(-1, keepdims=True)
            over = mx > PAGE_KNEE
            if over.any():
                soft = PAGE_KNEE + (1 - PAGE_KNEE) * np.tanh((mx - PAGE_KNEE) / (1 - PAGE_KNEE))
                lit = np.where(over, lit * soft / np.maximum(mx, 1e-6), lit)
        if glow:                              # the lit face's light spilling onto the bezel: linear light, outside the pins
            kz = np.sqrt(abs(np.linalg.det(A[:2, :2])))       # plate px -> screen px, so the glow scales with the push
            spill = cv2.GaussianBlur(lit * fm[..., None], (0, 0), glow["sigma_px"] * kz)
            fp = quad_mask(to_screen(A, np.float64(dst)))     # the pins (the bleed ring takes the glow too: no dark ring)
            lit = lit + glow.get("gain", 0.1) * spill * (1.0 - fp)[..., None]
        out = lin_to_srgb(lit)
        # focus band: sharp on the focus lines, softer with distance up or down the page (two fixed blur levels, or a
        # continuous depth of field with "continuous": true)
        band = shot.get("focus_band")
        if band:
            Hinv = np.linalg.inv(Ht)
            ys, xs = np.mgrid[0:H:8, 0:W:8].astype(np.float64)
            pts = np.stack([xs.ravel(), ys.ravel()], -1)[None]
            py = cv2.perspectiveTransform(pts, Hinv)[0][:, 1].reshape(xs.shape)
            em = fl[0][0][3] - fl[0][0][1]
            fyt = fy
            rk = shot.get("focus_rack")                        # a rack focus: the focal line moves at t (a page change)
            if rk:
                fyt = fy + (rk["v"] * page.h - fy) * ease_inout((t - rk["t"]) / rk.get("dur", 0.3))
            d = np.abs(py - fyt) / em                          # distance from the focus line, in lines of text
            wgt = np.clip((d - band["sharp_lines"]) / band["ramp_lines"], 0, 1).astype(np.float32)
            wgt = cv2.resize(wgt, (W, H), interpolation=cv2.INTER_LINEAR)[..., None]
            bp = band["blur_px"]
            if band.get("zoom_scaled"):                        # the blur grows with the push: blur_px at the end zoom
                bp *= camera(t)[0] / shot["zoom"][1]
            if band.get("continuous"):
                # a lens's depth of field: the blur radius grows smoothly with distance from the focal line, the same
                # above and below, up to `blur_px` (blended between five blur levels, so no line steps to the next)
                lv = [out] + [cv2.GaussianBlur(out, (0, 0), bp * k / 4) for k in (1, 2, 3, 4)]
                pos = wgt * 4; lo = np.clip(np.floor(pos), 0, 3).astype(np.int32); fr = pos - lo
                acc = np.zeros_like(out)
                for k in range(4):
                    m = (lo == k).astype(np.float32)
                    acc += m * (lv[k] * (1 - fr) + lv[k + 1] * fr)
                out = acc
            else:
                soft = cv2.GaussianBlur(out, (0, 0), bp)
                out = out * (1 - wgt) + soft * wgt
        return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)

    if a.camlog:                              # the camera per frame, and the marks' strokes; no render
        n = int(round(shot["length"] * a.fps))
        cams = [camera(i / a.fps) for i in range(n)]
        print("frame\tt\tzoom\trate_permille\tcentre_x\tcentre_y\tscreen_vx\tscreen_vy\tclamped")
        for i in range(n):
            z, c = cams[i]
            r = (cams[i + 1][0] / z - 1) * 1000 if i + 1 < n else float("nan")
            # the screen velocity of what sits at the frame centre (px per frame, toward the next frame)
            v = screen_matrix(cams[i + 1][0]) @ (c - cams[i + 1][1]) if i + 1 < n else np.array([np.nan, np.nan])
            pz, pc = push(i / a.fps)
            raw = pc + (drift_d * ease_inout((i / a.fps - drift["t"]) / drift["dur"]) if drift else 0)
            cl = "yes" if np.abs(raw - c).max() > 1e-6 else "-"
            print(f"{i}\t{i / a.fps:.3f}\t{z:.5f}\t{r:.4f}\t{c[0]:.2f}\t{c[1]:.2f}\t{v[0]:+.2f}\t{v[1]:+.2f}\t{cl}")
        for st in strokes:
            print(f"mark {st['mark']} line {st['i'] + 1}/{st['n']}: stroke {st['t']:.3f}-{st['t'] + st['T']:.3f} s "
                  f"(frames {st['t'] * a.fps:.1f}-{(st['t'] + st['T']) * a.fps:.1f}), on screen {st['on']}, "
                  f"feather sigma {st['sigma']:.2f} page px")
        return
    vf = [] if a.nograde else ["-vf", grade_filter()]
    if a.still:
        t, png = float(a.still[0]), a.still[1]
        img = frame(t)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-i", "-",
                        *vf, "-frames:v", "1", png], input=img.tobytes(), check=True)
        print("still", png)
        return
    n = int(round(shot["length"] * a.fps))
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                           "-r", str(a.fps), "-i", "-", *vf, "-c:v", "libx264", "-crf", "16", "-preset", "slow",
                           "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
                           "-color_trc", "bt709", a.out], stdin=subprocess.PIPE)
    for i in range(n):
        ff.stdin.write(frame(i / a.fps).tobytes())
        if i % 24 == 0:
            print(f"frame {i}/{n}", flush=True)
    ff.stdin.close()
    ff.wait()
    print("wrote", a.out, n, "frames")


if __name__ == "__main__":
    main()
