#!/usr/bin/env python3
"""Q07R: shot 3 of Q07 (the crossing of the basalt plain) remade. Storyboard. Nothing generated.

Three critics judged the Q07 reel (edit/reviews/Q07_reel_critics.md): the plain read as a tabletop seen from too high
to show sky, and the cutter as an empty toy boat on stilts unlike the one in shot 1. This board places the new shot:
behind the cutter and a little above it, the horizon in the upper third, the kingdom overhead with its rim ahead, the
Weir across the horizon with its gates as openings, the plain dying into mist. The frames are staging sketches made
from shot 1's plate, the plain's plate and the cutter's sheet; they only place things in the frame.

    /root/leonxlnx/earshot/.venv/bin/python tools/board_q07r.py   ->  design/boards/Q07R_board.jpg
"""
import importlib.util, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('b4', P('tools/board_q04.py')); b4 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b4)
W, H = b4.W, b4.H
img, arr, note, arrow, GOLD, INK, PAPER, BOLD, REG = b4.img, b4.arr, b4.note, b4.arrow, b4.GOLD, b4.INK, b4.PAPER, b4.BOLD, b4.REG
HAZE = np.array([0.56, 0.59, 0.63], np.float32)
HZ = int(H * 0.39)                                                   # the horizon: the upper third


def part(path, box, size):
    im = Image.open(P(path)).convert('RGB'); w, h = im.size
    return arr(im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h))).resize(size, Image.LANCZOS))


def stern():
    """The cutter's view from behind, from its sheet, keyed off the grey backdrop: RGBA floats."""
    a = part('refs/SHIP_V04_cutter.jpg', (0.785, 0.53, 0.955, 0.875), (340, 390))
    luma = a @ np.array([0.299, 0.587, 0.114], np.float32); sat = (a.max(2) - a.min(2)) / np.maximum(a.max(2), 1e-3)
    bg = np.median(luma[:12])
    m = (luma - bg > 0.10) | (sat > 0.16) | (luma - bg < -0.20)
    m = ndimage.binary_fill_holes(ndimage.binary_closing(ndimage.binary_opening(m, iterations=2), iterations=5))
    lab, n = ndimage.label(m); m = lab == (1 + int(np.argmax(ndimage.sum(m, lab, range(1, n + 1)))))
    ys, xs = np.where(m)
    return np.dstack([a, ndimage.gaussian_filter(m.astype(np.float32), 1.2)])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def frame(t):
    """The shot at t = 0 (first frame) or 1 (last frame): the camera keeps pace with the cutter; the ground comes on."""
    a = np.zeros((H, W, 3), np.float32)
    a[:HZ] = part('refs/candidates/E04A_t1a.jpg', (0.43, 0.30 - 0.015 * t, 1.0, 0.53 - 0.015 * t), (W, HZ)) * 0.92     # the kingdom overhead and the band of day: shot 1's own plate, clear of its near chain
    g = part('refs/candidates/E05A_t2a.jpg', (0.0, 0.39 - 0.07 * t, 1.0, 1.0 - 0.07 * t), (W, H - HZ)) * 0.85         # the plain from the air
    far = np.clip(1 - np.arange(H - HZ, dtype=np.float32) / (0.62 * (H - HZ)), 0, 1)[:, None, None] ** 1.3
    a[HZ:] = g * (1 - 0.94 * far) + HAZE * 0.94 * far                                                                # the pattern dies into mist by the middle distance
    a = b4.mist(a, W * 0.50, HZ + 54, W * 0.50, 30, seed=3, amount=0.55, tone=tuple(HAZE + 0.08))
    im = img(a); d = ImageDraw.Draw(im)
    # column stacks standing out of the mist, left and right: "a city no one finished"
    rng = np.random.default_rng(7); k = 1 + 0.22 * t
    for cx, base, hh, n in ((150 - 40 * t, HZ + 70 + 26 * t, 62, 13), (300 - 20 * t, HZ + 40 + 10 * t, 30, 9), (820 + 44 * t, HZ + 78 + 30 * t, 70, 14), (690 + 18 * t, HZ + 36 + 8 * t, 26, 8)):
        for _ in range(n):
            x = cx + rng.normal(0, 16 * k); h2 = hh * k * rng.uniform(0.35, 1.0); w2 = rng.uniform(4, 8) * k
            tone = int(34 + 60 * max(0.0, 1 - (base - HZ) / 110.0))
            d.rectangle((x, base - h2, x + w2, base + rng.uniform(0, 5)), fill=(tone, tone + 2, tone + 6))
    # the Weir across the horizon: a straight black wall, nine tall gates, two shut
    wl, wr, wh = W * (0.20 - 0.012 * t), W * (0.80 + 0.012 * t), H * (0.062 + 0.006 * t)
    d.rectangle((wl, HZ - wh, wr, HZ + 2), fill=(26, 28, 32))
    gw = (wr - wl) / 9.0
    for i in range(9):
        gx = wl + gw * (i + 0.5); r = gw * 0.20; top = HZ - wh * 0.78
        col = (26, 28, 32) if i in (2, 6) else (168, 184, 160)
        d.pieslice((gx - r, top, gx + r, top + 2 * r), 180, 360, fill=col); d.rectangle((gx - r, top + r, gx + r, HZ + 1), fill=col)
    d.line([(wl - 40, HZ + 3), (wr + 40, HZ + 3)], fill=(120, 126, 104), width=2)                                     # the grass at its foot
    # one great chain, far to the right, from the rock to the plain
    for y in range(int(H * 0.10), HZ + 60, 9):
        d.ellipse((W * 0.86 - 4, y, W * 0.86 + 4, y + 11), outline=(60, 64, 70), width=2)
    a = arr(im)
    a = b4.mist(a, W * 0.5, HZ + 20, W * 0.6, 16, seed=5, amount=0.42, tone=tuple(HAZE + 0.10))                       # haze over the wall's foot and the far plain
    a = b4.over(a, stern(), cx=W * 0.47, foot=H * (0.72 - 0.03 * t), height=66 * (1 - 0.10 * t), gain=0.96)
    im = img(a); d = ImageDraw.Draw(im)
    fx, fy = W * 0.47 + 2, H * (0.72 - 0.03 * t) - 30 * (1 - 0.10 * t)
    d.rectangle((fx - 2, fy - 13, fx + 2, fy), fill=(226, 226, 220)); d.ellipse((fx - 2, fy - 18, fx + 2, fy - 13), fill=(60, 48, 40))   # the crewman at the tiller
    return im


def before():
    p = subprocess.run(['ffmpeg', '-v', 'error', '-ss', '11.25', '-i', P('out/edits/Q07_reel_v2.mp4'), '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
    if len(p.stdout) != W * H * 3:
        return Image.new('RGB', (W, H), (30, 30, 34))
    return Image.fromarray(np.frombuffer(p.stdout, np.uint8).reshape(H, W, 3))


def elevation():
    """A side view of where everything is."""
    im = Image.new('RGB', (W, H), (22, 24, 28)); d = ImageDraw.Draw(im); f = ImageFont.truetype(REG, 15); fb = ImageFont.truetype(BOLD, 15)
    gy = 360
    d.rectangle((0, gy, W, H), fill=(12, 13, 15)); d.line([(0, gy), (W, gy)], fill=(90, 94, 100), width=2)
    d.polygon([(0, 0), (700, 0), (690, 60), (640, 95), (560, 80), (470, 120), (380, 96), (270, 130), (150, 100), (60, 126), (0, 110)], fill=(44, 46, 52))     # the kingdom, from the side
    d.text((20, 18), 'ORISON, overhead: rock, roots, chains', fill=PAPER, font=fb); d.text((596, 100), 'its rim', fill=GOLD, font=fb)
    for y in range(120, gy, 12):
        d.ellipse((330, y, 338, y + 14), outline=(120, 124, 130), width=2)
    d.text((346, 220), 'a chain,\nthick as a tower', fill=PAPER, font=f)
    d.rectangle((900, gy - 70, 930, gy), fill=(8, 8, 10), outline=(120, 124, 130)); d.pieslice((906, gy - 50, 924, gy - 32), 180, 360, fill=(150, 170, 140)); d.rectangle((906, gy - 41, 924, gy), fill=(150, 170, 140))
    d.text((858, gy - 96), 'THE WEIR', fill=GOLD, font=fb); d.text((936, gy - 40), 'Sarn\nVale', fill=(150, 170, 140), font=f)
    d.text((730, 30), 'open sky beyond the rim:\nthe band of day', fill=PAPER, font=f)
    cx, cy = 250, gy - 62                                                                                           # the cutter
    d.polygon([(cx - 26, cy - 6), (cx + 30, cy - 6), (cx + 22, cy + 6), (cx - 22, cy + 6)], fill=(230, 230, 224)); d.rectangle((cx + 6, cy - 16, cx + 18, cy - 6), fill=(230, 230, 224))
    d.line([(cx - 14, cy + 12), (cx + 14, cy + 12)], fill=(90, 80, 70), width=2); d.rectangle((cx - 20, cy - 16, cx - 17, cy - 6), fill=(230, 230, 224))
    d.text((cx - 60, cy + 20), 'the cutter, 30 m up', fill=GOLD, font=fb); arrow(d, (cx + 40, cy), (cx + 110, cy), w=3)
    kx, ky = 120, gy - 96                                                                                           # the camera
    d.rectangle((kx - 12, ky - 8, kx + 12, ky + 8), fill=GOLD); d.polygon([(kx + 12, ky), (kx + 24, ky - 9), (kx + 24, ky + 9)], fill=GOLD)
    d.line([(kx + 24, ky), (920, gy - 60)], fill=GOLD, width=1); d.line([(kx + 24, ky), (520, gy)], fill=GOLD, width=1); d.line([(kx + 24, ky), (700, 40)], fill=GOLD, width=1)
    d.text((kx - 100, ky - 44), 'camera: 45 m up, 60 m behind,\n35 mm, travelling at its speed', fill=GOLD, font=fb)
    d.line([(130, gy + 22), (900, gy + 22)], fill=PAPER, width=1); d.text((440, gy + 28), 'about two kilometres of basalt and mist', fill=PAPER, font=f)
    return im


def sheet(cells, path):
    f1 = ImageFont.truetype(BOLD, 20); f2 = ImageFont.truetype(REG, 17); f0 = ImageFont.truetype(BOLD, 24)
    pad, cap, gap, hd = 16, 104, 14, 86
    rows = (len(cells) + 1) // 2
    S = Image.new('RGB', (pad * 2 + W * 2 + gap, hd + rows * (H + cap) + pad), INK); d = ImageDraw.Draw(S)
    d.text((pad, 14), 'THE WEIGHT OF HEAVEN  ·  Q07R  ·  THE CROSSING (shot 3 of Q07, remade)  ·  storyboard  ·  one shot, 5 s', fill=GOLD, font=f0)
    d.text((pad, 48), 'Staging sketches from shot 1\'s plate, the plain\'s plate and the cutter\'s sheet. They place things in the frame; the picture is made by the plate, then the take.', fill=PAPER, font=f2)
    for k, (im, title, text) in enumerate(cells):
        x = pad + (k % 2) * (W + gap); y = hd + (k // 2) * (H + cap)
        S.paste(im.convert('RGB'), (x, y)); d.text((x, y + H + 8), title, fill=GOLD, font=f1)
        line, yy = '', y + H + 36
        for wd in text.split():
            if d.textlength(line + ' ' + wd, font=f2) > W - 8:
                d.text((x, yy), line, fill=PAPER, font=f2); yy += 22; line = wd
            else:
                line = (line + ' ' + wd).strip()
        d.text((x, yy), line, fill=PAPER, font=f2)
    S.save(path, quality=90); print('wrote', path, S.size)


def main():
    c0 = before(); d = ImageDraw.Draw(c0)
    note(d, (36, 34), 'no sky; the pattern sharp to the horizon: a tabletop'); note(d, (36, 380), 'the cutter: an empty toy boat, unlike shot 1\'s')
    c1 = frame(0.0); d = ImageDraw.Draw(c1)
    note(d, (36, 22), 'the kingdom overhead; its rim ahead; the band of day beyond it'); note(d, (560, HZ - 62), 'the Weir: nine gates, two shut')
    note(d, (540, 318), 'the cutter, from behind: cabin, spire,'); note(d, (540, 346), 'a crewman at the tiller'); note(d, (36, 392), 'column tops readable only here, under us')
    c2 = frame(1.0); d = ImageDraw.Draw(c2)
    arrow(d, (W * 0.47, 250), (W * 0.47, 205), w=3); note(d, (500, 222), 'it flies on toward the gates; we keep pace')
    arrow(d, (120, 250), (70, 300), w=3); arrow(d, (860, 256), (915, 306), w=3); note(d, (330, 392), 'the stacks pass on either side; the wall hardly grows')
    c3 = elevation()
    cells = [
        (c0, 'BEFORE · the pickup\'s shot 3, as three critics saw it', 'From a hundred and fifty metres, pointed steeply down: no sky and no kingdom in the frame, the honeycomb as sharp far as near, the cutter a white dinghy on two legs with no one aboard.'),
        (c1, 'NEW · first frame (the shot plate) · behind the cutter, 45 m up, 35 mm', 'The horizon sits in the upper third. Above it the band of day and, across the top, the black underside of Orison running out of the frame. On the horizon the Weir, black and straight, its gates open to the green beyond. The plain is black near and lost in mist far off. The cutter is white, an eighth of the frame wide, flying away from us.'),
        (c2, 'NEW · last frame, 5 s · the camera has kept pace', 'The column tops have streamed under us and the nearest stacks have passed on either side: real movement in depth, not a zoom. The cutter has pulled a little ahead. The wall is two kilometres off and has hardly grown: slow and enormous.'),
        (c3, 'WHERE EVERYTHING IS · side view', 'The cutter flies thirty metres above the plain, out from under the kingdom toward the Weir. The camera follows above and behind it, looking ahead and slightly down, so that rock, sky, wall and plain are all in one frame.'),
    ]
    sheet(cells, P('design/boards/Q07R_board.jpg'))


if __name__ == '__main__':
    main()
