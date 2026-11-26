#!/usr/bin/env python3
"""Q07 (beneath Orison: the underside) storyboard. Nothing generated.

A montage reel: five separate views, hard cuts, one clear thing each, to be cut to the song's bars in the edit. The
frames are staging sketches made from the approved references (drawn from the ground) and the sheets; three of the five
shots are from the air, which no reference shows, so the sketches only place things in the frame.

    /root/leonxlnx/earshot/.venv/bin/python tools/board_q07.py   ->  design/boards/Q07_board.jpg
"""
import importlib.util, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('b4', P('tools/board_q04.py')); b4 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b4)
W, H = b4.W, b4.H
img, arr, note, arrow, GOLD, INK, PAPER, BOLD, REG = b4.img, b4.arr, b4.note, b4.arrow, b4.GOLD, b4.INK, b4.PAPER, b4.BOLD, b4.REG


def env(name, box):
    """A crop of a reference, as fractions of its width and height (x0, y0, x1, y1), at the frame's shape."""
    im = Image.open(P('refs', name)).convert('RGB'); w, h = im.size
    return arr(im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h))).resize((W, H), Image.LANCZOS))


def cutter():
    """The cutter's main view from its sheet, keyed off the grey backdrop: RGBA floats."""
    im = Image.open(P('refs/SHIP_V04_cutter.jpg')).convert('RGB'); w, h = im.size
    a = arr(im.crop((int(0.14 * w), int(0.10 * h), int(0.55 * w), int(0.62 * h))))
    luma = a @ np.array([0.299, 0.587, 0.114], np.float32); sat = (a.max(2) - a.min(2)) / np.maximum(a.max(2), 1e-3)
    bg = np.median(luma[:20])
    m = (luma - bg > 0.10) | (sat > 0.16) | (luma - bg < -0.22)
    m = ndimage.binary_fill_holes(ndimage.binary_closing(ndimage.binary_opening(m, iterations=2), iterations=5))
    lab, n = ndimage.label(m); m = lab == (1 + int(np.argmax(ndimage.sum(m, lab, range(1, n + 1)))))
    ys, xs = np.where(m)
    return np.dstack([a, ndimage.gaussian_filter(m.astype(np.float32), 1.2)])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def sheet(cells, path):
    f1 = ImageFont.truetype(BOLD, 20); f2 = ImageFont.truetype(REG, 17); f0 = ImageFont.truetype(BOLD, 24)
    pad, cap, gap, hd = 16, 104, 14, 86
    rows = (len(cells) + 1) // 2
    S = Image.new('RGB', (pad * 2 + W * 2 + gap, hd + rows * (H + cap) + pad), INK)
    d = ImageDraw.Draw(S)
    d.text((pad, 14), 'THE WEIGHT OF HEAVEN  ·  Q07  ·  BENEATH ORISON: THE UNDERSIDE  ·  storyboard  ·  montage, 14 s, five shots', fill=GOLD, font=f0)
    d.text((pad, 48), 'Staging sketches from the approved references as they are sent (cropped to what each shot needs). Shots 1, 3 and 5 are from the air. '
                      'Five separate views, hard cuts, to be cut to the song in the edit.', fill=PAPER, font=f2)
    for k, (im, title, text) in enumerate(cells):
        x = pad + (k % 2) * (W + gap); y = hd + (k // 2) * (H + cap)
        S.paste(im.convert('RGB'), (x, y))
        d.text((x, y + H + 8), title, fill=GOLD, font=f1)
        words, line, yy = text.split(), '', y + H + 36
        for wd in words:
            if d.textlength(line + ' ' + wd, font=f2) > W - 8:
                d.text((x, yy), line, fill=PAPER, font=f2); yy += 22; line = wd
            else:
                line = (line + ' ' + wd).strip()
        d.text((x, yy), line, fill=PAPER, font=f2)
    S.save(path, quality=90)
    print('wrote', path, S.size)


def main():
    boat = cutter()
    # 1. the cutter drops out of the cloud under the mass
    a = env('crops/Q07_underside.jpg', (0.0, 0.0, 1.0, 1.0))                       # the reference as it is sent: the underside and the band only
    a[:int(H * 0.80)] = a[:int(H * 0.80)] * 0.80                                   # the mass two stops under the band, roughly
    a[int(H * 0.95):] = a[int(H * 0.95):] * 0.35                                   # a thin strip of the plain
    a = b4.mist(a, W * 0.63, H * 0.66, W * 0.22, H * 0.12, seed=4, amount=0.8, tone=(0.74, 0.76, 0.79))
    a = b4.over(a, boat, cx=W * 0.63, foot=H * 0.80, height=19)
    c1 = img(a); d = ImageDraw.Draw(c1)
    note(d, (36, 34), 'the underside fills the sky; the cutter is a white fleck in the band of day')
    arrow(d, (625, 270), (625, 318), w=3); note(d, (650, 280), 'it comes down out of the cloud')
    note(d, (36, 380), 'raw rock, roots, chains thick as towers')
    # 2. her face at the window
    g = np.zeros((H, W, 3), np.float32) + np.array([0.80, 0.82, 0.85], np.float32)
    g = b4.mist(g, W * 0.3, H * 0.5, W * 0.8, H * 0.8, seed=8, amount=0.5, tone=(0.92, 0.93, 0.94))
    g[:, int(W * 0.62):] *= 0.42                                                    # the pilothouse wall
    g = b4.over(g, b4.cut('serath', 2), cx=W * 0.60, foot=H + 150, height=H * 1.55, gain=0.80)
    c2 = img(g); d = ImageDraw.Draw(c2)
    d.line([(int(W * 0.30), 0), (int(W * 0.30), H)], fill=(60, 62, 66), width=7); d.line([(0, int(H * 0.50)), (int(W * 0.30), int(H * 0.50))], fill=(60, 62, 66), width=5)
    note(d, (36, 34), 'inside the cutter: cloud on the glass, then it tears away')
    arrow(d, (560, 150), (470, 70), w=4); note(d, (250, 100), 'her chin lifts; her eyes go up to it')
    note(d, (36, 380), 'the shade of the kingdom falls on her face. No words')
    # 3. the plain from the cutter's height
    a = env('ENV_E05_basalt-plain.jpg', (0.10, 0.52, 0.90, 1.0)); a = a * 0.9
    a[:int(H * 0.10)] = a[:int(H * 0.10)] * 0.4 + 0.5                               # a strip of pale horizon
    c3 = img(a); d = ImageDraw.Draw(c3)
    d.polygon([(0, H), (0, H - 34), (300, H - 12), (300, H)], fill=(205, 204, 198)); d.line([(0, H - 40), (310, H - 16)], fill=(96, 74, 52), width=5)
    note(d, (36, 34), 'she looks down: black basalt in columns, to the horizon')
    note(d, (36, 64), '"like a city no one finished"')
    note(d, (330, 380), 'from the cutter, three hundred metres up; its rail in the corner')
    # 4. the wall and the bird
    a = env('crops/Q07_wall.jpg', (0.005, 0.385, 0.265, 0.535))                     # close on the first open gate, from the reference as it is sent
    c4 = img(a); d = ImageDraw.Draw(c4)
    bx, by = 250, 120
    d.line([(bx - 14, by - 6), (bx, by), (bx + 14, by - 6)], fill=(10, 10, 12), width=4)
    for yy in range(by + 12, 300, 16):
        d.line([(bx, yy), (bx, yy + 8)], fill=GOLD, width=3)
    arrow(d, (bx, 288), (bx, 316), w=3)
    note(d, (36, 34), 'the wall that takes the weight of Orison. Nothing visible pours through')
    note(d, (36, 64), '(sketch: the gate would run out of the top of the frame)')
    note(d, (300, 110), 'a crow, black against the light in the open gate...')
    note(d, (300, 250), '...its wings shut and it drops like a stone')
    note(d, (36, 380), 'the grass in front of the gate lies combed flat')
    # 5. the vale beyond
    a = env('crops/Q07_vale.jpg', (0.0, 0.14, 1.0, 0.74))                           # the reference as it is sent: the valley only
    a[int(H * 0.90):] = a[int(H * 0.90):] * 0.15                                    # the wall's top, a black edge under us
    c5 = img(a); d = ImageDraw.Draw(c5)
    note(d, (36, 34), 'beyond the wall: Sarn Vale. Terraces, orchards, the smoke of many hearths')
    note(d, (36, 380), 'from above the wall\'s top. The first green in the film')

    cells = [
        (c1, 'SHOT 1 · 0–3 s · from the air, extreme wide, locked off · the cutter under the kingdom',
         'The underside of Orison fills the top two thirds of the frame and runs out of it. The white cutter, small, comes straight down out of a bank of cloud into the pale band of day, beside a chain whose every link is longer than it is.'),
        (c2, 'SHOT 2 · 3–6 s · inside the cutter · Serath, close, in profile at the window',
         'Cloud streams past the glass and tears away: the top of the window goes dark with rock. The light on her face falls to its cold shade. Her chin lifts and her eyes go up to it, and stay. She has never seen it from below.'),
        (c3, 'SHOT 3 · 6–8 s · from the cutter, looking down and ahead · the basalt plain',
         'Below: the tops of black six-sided columns in rows and steps, mist between them, and far off the black wall along the plain\'s edge. The cutter\'s brass rail is soft in the corner, so the height can be felt.'),
        (c4, 'SHOT 4 · 8–11.4 s · on the ground, low and locked off, close to an open gate · the bird',
         'The open gate fills the left half of the frame, the wall running away to the right. The grass in the gateway lies pressed flat. A crow crosses the bright opening; its wings shut and it falls straight down. The weight is invisible; this is how it shows.'),
        (c5, 'SHOT 5 · 11.4–14 s · from just above the wall\'s top, locked off · Sarn Vale',
         'Beyond the wall, the valley she has been ordered to drown: green terraces, orchards, farms, smoke rising from many chimneys. Nothing happens in it. It is held.'),
    ]
    sheet(cells, P('design/boards/Q07_board.jpg'))


if __name__ == '__main__':
    main()
