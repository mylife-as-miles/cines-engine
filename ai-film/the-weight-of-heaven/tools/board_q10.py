#!/usr/bin/env python3
"""Q10, the hall: the warrants and the shard. Storyboard and reference sheet. Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/board_q10.py
        ->  design/boards/Q10_board.jpg (five frames), design/boards/Q10_refs.jpg (the eight references, in attach order)

The frames are staging sketches made from the take's own references: the last frame of Q09, the hall, the sheets and
the props. They place people, things and light; the take is made from the references, not from these.
"""
import importlib.util, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('b8', P('tools/board_q08.py')); b8 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b8)
b4, W, H = b8.b4, b8.W, b8.H
img, arr, note, arrow, GOLD, INK, PAPER, BOLD, REG = b4.img, b4.arr, b4.note, b4.arrow, b4.GOLD, b4.INK, b4.PAPER, b4.BOLD, b4.REG
part, key = b8.part, b8.key
HALL = 'refs/relit/ENV_E09_treaty-house-hall_plain.jpg'
FIRST = 'refs/frames/Q10_open_q09_last.jpg'
LAMP, PAGE, STONES, SHARD = ('refs/crops/PROP_P09_karsts-lamp_hero.jpg', 'refs/crops/PROP_P04_lifting-warrant_hero_soft.jpg',
                             'refs/crops/PROP_P14_warrant-stones_hero.jpg', 'refs/crops/PROP_P05_the-shard_hero.jpg')
WARM = np.array([1.0, 0.80, 0.55], np.float32)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def pool(cx, cy, r):
    return np.clip(1 - np.hypot(xx - cx, (yy - cy) * 1.5) / r, 0, 1)[..., None] ** 1.4


def lit(a, cx, cy, r, base=0.16, gain=1.25):
    """A dark frame with one warm pool of lamplight in it."""
    p = pool(cx, cy, r)
    return np.clip(a * (base * np.array([0.9, 0.95, 1.05], np.float32) * (1 - p) + gain * WARM * p), 0, 1)


def sheet(cells, path):
    f1 = ImageFont.truetype(BOLD, 20); f2 = ImageFont.truetype(REG, 17); f0 = ImageFont.truetype(BOLD, 24)
    pad, cap, gap, hd = 16, 128, 14, 86
    rows = (len(cells) + 1) // 2
    S = Image.new('RGB', (pad * 2 + W * 2 + gap, hd + rows * (H + cap) + pad), INK); d = ImageDraw.Draw(S)
    d.text((pad, 14), 'THE WEIGHT OF HEAVEN  ·  Q10  ·  the hall: the warrants and the shard  ·  storyboard  ·  five shots, 25 s', fill=GOLD, font=f0)
    d.text((pad, 48), 'It opens on the last frame of Q09. Daylight at the opening, lamplight on the floor. Sketches from the references; the take makes the picture.', fill=PAPER, font=f2)
    for k, (im, title, text) in enumerate(cells):
        x = pad + (k % 2) * (W + gap); y = hd + (k // 2) * (H + cap)
        S.paste(im.convert('RGB'), (x, y)); d.text((x, y + H + 8), title, fill=GOLD, font=f1)
        line, yl = '', y + H + 36
        for wd in text.split():
            if d.textlength(line + ' ' + wd, font=f2) > W - 8:
                d.text((x, yl), line, fill=PAPER, font=f2); yl += 22; line = wd
            else:
                line = (line + ' ' + wd).strip()
        d.text((x, yl), line, fill=PAPER, font=f2)
    S.save(path, quality=90); print('wrote', os.path.relpath(path, HERE), S.size)


def main():
    lamp = key(arr(Image.open(P(LAMP)).convert('RGB')), lo=0.07)
    shard = key(arr(Image.open(P(SHARD)).convert('RGB')), lo=0.06)
    face = b4.cut('serath', 2)
    # 1. the last frame of Q09: Karst at the opening
    c1 = Image.open(P(FIRST)).convert('RGB').resize((W, H)); d = ImageDraw.Draw(c1)
    note(d, (36, 22), 'the last frame of Q09: he has turned to her')
    # 2. the lamp over the warrants
    a = part(HALL, (0.06, 0.66, 0.50, 0.98), (W, H))
    a = lit(a, 330, 250, 520)
    a = b4.over(a, lamp, cx=150, foot=250, height=250)
    c2 = img(a); d = ImageDraw.Draw(c2)
    note(d, (300, 22), 'paper takes the lamplight; the dark floor does not')
    arrow(d, (260, 150), (420, 150), w=4); note(d, (300, 166), 'the lamp travels along the row')
    note(d, (36, 388), 'a stone on every sheet: a roof slate, a hearthstone, a doorstep; her red seal on every one')
    # 3. Serath, lit from below
    bg = b4.blur(part(HALL, (0.60, 0.10, 0.90, 0.75), (W, H)), 14) * 0.45
    f = face.copy(); h = f.shape[0]
    grad = np.linspace(0.55, 1.15, h, dtype=np.float32)[:, None, None]
    f[..., :3] = np.clip(f[..., :3] * grad * WARM * 1.05, 0, 1)
    a = b4.over(bg, f, cx=420, foot=H + 150, height=H * 1.5)
    c3 = img(a); d = ImageDraw.Draw(c3)
    note(d, (36, 22), 'the camera is planted; she walks into her close-up, eyes down but seen')
    note(d, (640, 300), 'the open shutters, far behind')
    # 4. the shard on the last sheet
    pg = part(PAGE, (0.05, 0.25, 0.95, 0.98), (W, H))
    a = lit(pg, 560, 240, 560, base=0.20, gain=1.15)
    a = b4.over(a, shard, cx=430, foot=300, height=190)
    a = b4.over(a, lamp, cx=880, foot=330, height=300)
    c4 = img(a); d = ImageDraw.Draw(c4)
    note(d, (36, 22), 'the last sheet: a grey shard with a white vein, still shedding dust')
    note(d, (520, 388), 'the wax on this one is new')
    # 5. Serath: she knows it
    f = face.copy(); f[..., :3] = np.clip(f[..., :3] * grad * WARM * 1.05, 0, 1)
    a = b4.over(bg.copy(), f, cx=470, foot=H + 250, height=H * 1.85)
    c5 = img(a); d = ImageDraw.Draw(c5)
    note(d, (36, 22), 'from low, looking up at her downturned face; her eyes on the shard')
    cells = [
        (c1, 'SHOT 1 · 0–5.6 s · Karst at the opening · opens on Q09\'s last frame',
         'He looks at her and answers what she said: "You were sheltered." A breath. More quietly: "By then you had gardens." Then his eyes go down to the floor between them.'),
        (c2, 'SHOT 2 · 5.4–10 s · the lamp over the floor',
         'From knee height, looking down, travelling with the brass lamp in his ink-stained hand: sheet after sheet of pale paper, a stone from a house on every sheet (a roof slate, a hearthstone, a doorstep), the same red seal on every sheet. No one speaks.'),
        (c3, 'SHOT 3 · 10–16.6 s · Serath walks the row',
         'She walks slowly toward a planted camera, lit from below by the lamp, her eyes on the floor. Karst, off-screen, the same voice: "I drew where each one would fall." She slows and stops. "You sealed them."'),
        (c4, 'SHOT 4 · 16.6–20 s · the last sheet',
         'From a forearm\'s height. His hand sets the lamp down beside the last sheet of the row. On it lies a grey shard of rock; as the lamp touches the floor a thread of dust slips from it onto the paper. The wax of its seal is new and bright.'),
        (c5, 'SHOT 5 · 20–25 s · Serath, from low',
         'The camera at knee height, looking up at her face in the lamplight; her eyes on the shard at her feet. She knows it. Quietly, in her own voice: "The marriage bell." Then she is still, and the shot holds on her.'),
    ]
    sheet(cells, P('design/boards/Q10_board.jpg'))

    f1 = ImageFont.truetype(BOLD, 18); f2 = ImageFont.truetype(REG, 15)
    refs = [(FIRST, '@Image 1 · first frame', 'The last frame of Q09 take 1'),
            ('refs/relit/ENV_E09_treaty-house-hall_lamp.jpg', '@Image 2 · the hall, shutters open', 'The approved hall, relit here (free)'),
            ('refs/CHAR_C01_serath.jpg', '@Image 3 · SERATH', 'Approved sheet'),
            ('refs/CHAR_C02_karst.jpg', '@Image 4 · KARST', 'Approved sheet'),
            (LAMP, '@Image 5 · Karst\'s lamp', 'Approved sheet\'s main view'),
            (PAGE, '@Image 6 · a lifting warrant', 'Approved sheet\'s main view, its writing softened'),
            (STONES, '@Image 7 · the stones', 'A hearthstone, a slate, a doorstep (approved)'),
            (SHARD, '@Image 8 · the shard', 'Approved sheet\'s main view')]
    w, h, pad, cap = 470, 260, 14, 52
    S = Image.new('RGB', (pad + 4 * (w + pad), pad + 2 * (h + cap) + pad), INK); d = ImageDraw.Draw(S)
    for k, (path, title, text) in enumerate(refs):
        im = Image.open(P(path)).convert('RGB'); im.thumbnail((w, h), Image.LANCZOS)
        x = pad + (k % 4) * (w + pad); y = pad + (k // 4) * (h + cap)
        S.paste(im, (x + (w - im.width) // 2, y + (h - im.height) // 2)); d.text((x, y + h + 5), title, fill=GOLD, font=f1); d.text((x, y + h + 28), text, fill=PAPER, font=f2)
    S.save(P('design/boards/Q10_refs.jpg'), quality=90); print('wrote design/boards/Q10_refs.jpg', S.size)


if __name__ == '__main__':
    main()
