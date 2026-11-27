"""Pin a real document page onto a blank-sheet plate, light it with the plate, mark a phrase, push in, grade.

    <gfx python> gfx/doc_composite.py --shot gfx/shots/s1_yes.json --out out/gfx/s1_yes.mp4 [--still 3.0 out.png]

A shot file (JSON) names the plate and its corner pins (from evidence_table `page` / `pair`), the PDF page, the
phrases to mark (in order, with their start times), the phrases to keep soft (privacy), the framing and the push.
Everything is a function of t, so any frame can be rendered alone.

How it composites. The page is rasterised once (pdftoppm), its words located with pdftotext -bbox. For each frame the
page is warped straight into the output frame through one homography: page corners -> the plate's pins -> the crop
of the camera move. So the text stays sharp at any zoom, and the plate (paper falloff and wood) is resampled under
it. The page is an albedo: paper 1.0, ink about 0.07, the marker a yellow reflectance; it multiplies the lit blank
sheet in linear light, so the lamp's falloff, the paper's warmth and the grade all carry onto the page. A focus band
keeps the marked line sharp and softens lines away from it (two fixed blur levels, cinetic's rule), which is also
what keeps private lines unreadable. The film's grade (GRADE in scenes/shoot.py) is applied last, with its grain.
Motion numbers from cinetic: the push runs in log space, 2-8 % a shot, landing 60/85/97 % of the way at 25/50/75 %
of its time, then creeping; the marker writes each line in about half a second with a dry, fixed-seed edge.
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


def ease_inout(p):           # the marker's stroke: stdInOut
    p = min(max(p, 0.0), 1.0)
    return p * p * (3 - 2 * p)


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


def marker_mask(page, lines, progress, seed=7, pad=(0.25, 0.25)):
    """Coverage 0..1 of a marker stroke over `lines`, written left to right, line after line; progress 0..1 overall."""
    m = np.zeros((page.h, page.w), np.float32)
    if progress <= 0:
        return m
    rng = np.random.default_rng(seed)
    n = len(lines)
    for i, line in enumerate(lines):
        p = ease_inout(progress * n - i)
        if p <= 0:
            continue
        x0 = min(b[0] for b in line); x1 = max(b[2] for b in line)
        y0 = min(b[1] for b in line); y1 = max(b[3] for b in line)
        em = y1 - y0                           # the word box: ascent to descent
        x0 -= pad[0] * em; x1 += (pad[1] if i == n - 1 else 0.25) * em   # the last line's end pad is per mark (a quote, a stop)
        base, xh = y0 + 0.77 * em, 0.42 * em   # baseline and x-height, estimated from the box
        y0, y1 = base - 1.12 * xh, base + 0.20 * xh   # a band about 1.3 x-heights tall, sitting on the line
        xe = x0 + (x1 - x0) * p
        xs = np.arange(int(x0), int(xe) + 1)
        if len(xs) < 2:
            continue
        # a dry edge: low-frequency wobble of the top and bottom, fixed per line so it never boils
        knots = rng.normal(0, 0.06 * em, size=(2, max(4, len(xs) // 60 + 2)))
        top = y0 + np.interp(xs, np.linspace(xs[0], xs[-1], knots.shape[1]), knots[0])
        bot = y1 + np.interp(xs, np.linspace(xs[0], xs[-1], knots.shape[1]), knots[1])
        for x, a, b in zip(xs, top, bot):
            m[max(0, int(a)):min(page.h, int(b)), x] = 1.0
    m = cv2.GaussianBlur(m, (0, 0), 0.06 * (lines[0][0][3] - lines[0][0][1]))
    return np.clip(m, 0, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shot", required=True)
    ap.add_argument("--out")
    ap.add_argument("--still", nargs=2, metavar=("T", "PNG"))
    ap.add_argument("--fps", type=float, default=24)
    ap.add_argument("--nograde", action="store_true")
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
    marks = [(page.find(mk["phrase"]), mk["t"], mk.get("dur", 0.5), tuple(mk.get("pad_em", (0.25, 0.25)))) for mk in shot.get("marks", [])]
    yellow = np.float32(shot.get("marker_rgb", [0.97, 0.86, 0.30]))   # display-referred reflectance, linearised below
    yellow_lin = srgb_to_lin(yellow)

    # framing: the crop centre and zoom follow a log-space push toward `focus` (a phrase, in plate pixels)
    if tex:                                   # a screen: focus is a point given as fractions of the texture
        fx, fy = shot["focus_uv"][0] * page.w, shot["focus_uv"][1] * page.h
        fl = [[(fx - 10, fy - shot.get("em_px", 30) / 2, fx + 10, fy + shot.get("em_px", 30) / 2)]]
    else:
        fl = page.find(shot["focus"]) if "focus" in shot else marks[0][0]
        fx = np.mean([(b[0] + b[2]) / 2 for line in fl for b in line]); fy = np.mean([(b[1] + b[3]) / 2 for line in fl for b in line])
    focus_plate = cv2.perspectiveTransform(np.float64([[[fx, fy]]]), H_pp)[0, 0]
    z0, z1 = shot["zoom"]                     # zoom relative to the full plate (1.0 = the whole 2560 frame)
    c0 = np.float64(shot.get("start_center", focus_plate)); c1 = focus_plate + np.float64(shot.get("end_offset", [0, 0]))
    dur = shot["duration"]
    roll = np.deg2rad(shot.get("roll_deg", 0.0))   # optional roll so the lines sit nearer level on screen

    def frame(t):
        p = ease_push(t / dur)
        z = z0 * (z1 / z0) ** p
        c = c0 + (c1 - c0) * p
        if t > dur:                           # a one-way creep after landing
            z *= 1 + 0.0012 * (t - dur) * 24
        k = W / PW * z
        # keep the crop inside the plate (no mirrored plate at the edges), whatever the focus point
        hw, hh = W / 2 / k * (1 + abs(np.sin(roll))), H / 2 / k * (1 + abs(np.sin(roll)))
        c = np.array([min(max(c[0], hw), PW - hw), min(max(c[1], hh), PH - hh)])
        cr, sr = np.cos(roll), np.sin(roll)
        A = np.array([[k * cr, -k * sr, 0], [k * sr, k * cr, 0], [0, 0, 1]], np.float64)
        A[:2, 2] = np.array([W / 2, H / 2]) - A[:2, :2] @ c
        base = cv2.warpAffine(plate, A[:2], (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        Ht = A @ H_pp
        if tex:                               # an emissive screen: the UI scales the blank display's own glow
            alb = srgb_to_lin(tex.get(t)).astype(np.float32)
        else:                                 # page albedo for this frame (marker under the ink)
            mk = np.zeros((page.h, page.w), np.float32)
            for lines, t0, d, pad in marks:
                prog = (t - t0) / (d * len(lines))
                if prog > 0:
                    mk = np.maximum(mk, marker_mask(page, lines, min(prog, 1.0), pad=pad))
            ink_lin = 1.0 - 0.93 * ink              # ink reflectance about 0.07
            alb = np.stack([ink_lin * (1 - mk + mk * yellow_lin[i]) for i in range(3)], -1)
        # pre-scale the page texture near the output scale so the warp does not alias
        scale = np.sqrt(abs(np.linalg.det(Ht[:2, :2])))
        if scale < 0.8:
            f = max(scale * 1.25, 0.05)
            small = cv2.resize(alb, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
            S = np.diag([1 / f, 1 / f, 1.0])
            alb_w = cv2.warpPerspective(small, Ht @ S, (W, H), flags=cv2.INTER_LINEAR, borderValue=(1, 1, 1))
        else:
            alb_w = cv2.warpPerspective(alb, Ht, (W, H), flags=cv2.INTER_LINEAR, borderValue=(1, 1, 1))
        tb = shot.get("tex_blur_px", 0.55)                    # the render's own softness (or defocus)
        tr = shot.get("tex_blur_rack")                         # a rack focus onto the texture: [t0, t1, blur at t1]
        if tr:
            tb = tb + (tr[2] - tb) * ease_inout((t - tr[0]) / (tr[1] - tr[0]))
        alb_w = cv2.GaussianBlur(alb_w, (0, 0), tb)
        out = lin_to_srgb(srgb_to_lin(base) * alb_w)
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
            if band.get("continuous"):
                # a lens's depth of field: the blur radius grows smoothly with distance from the focal line, the same
                # above and below, up to `blur_px` (blended between five blur levels, so no line steps to the next)
                lv = [out] + [cv2.GaussianBlur(out, (0, 0), band["blur_px"] * k / 4) for k in (1, 2, 3, 4)]
                pos = wgt * 4; lo = np.clip(np.floor(pos), 0, 3).astype(np.int32); fr = pos - lo
                acc = np.zeros_like(out)
                for k in range(4):
                    m = (lo == k).astype(np.float32)
                    acc += m * (lv[k] * (1 - fr) + lv[k + 1] * fr)
                out = acc
            else:
                soft = cv2.GaussianBlur(out, (0, 0), band["blur_px"])
                out = out * (1 - wgt) + soft * wgt
        return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)

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
