#!/usr/bin/env python3
"""Q10, second version: the floor of papers as one continuous take of four shots. Storyboard and reference sheet.
Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/board_q10v2.py
        ->  design/boards/Q10v2_board.jpg (four frames), design/boards/Q10v2_refs.jpg (the five references, in attach order)

The frames are staging sketches made from the take's own references and from frames the film already has. They place
people, things and light; the take is made from the references, not from these.
"""
import importlib.util, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)


def load(name):
    spec = importlib.util.spec_from_file_location(name, P('tools', name + '.py')); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


b10, b9 = load('board_q10'), load('board_q09')
b8, b4, W, H = b10.b8, b10.b4, b10.W, b10.H
img, arr, note, GOLD, INK, PAPER, BOLD, REG = b10.img, b10.arr, b10.note, b10.GOLD, b10.INK, b10.PAPER, b10.BOLD, b10.REG
part, key, dark, lit, WARM = b8.part, b8.key, b8.dark, b10.lit, b10.WARM
HALL = 'refs/crops/Q10_hall_open_floor.jpg'
LAMP, SHARD, PAGE = 'refs/crops/PROP_P09_karsts-lamp_hero.jpg', 'refs/crops/PROP_P05_the-shard_hero.jpg', 'refs/crops/PROP_P04_lifting-warrant_hero_soft.jpg'


def sheet(cells, path):
    f1 = ImageFont.truetype(BOLD, 20); f2 = ImageFont.truetype(REG, 17); f0 = ImageFont.truetype(BOLD, 24)
    pad, cap, gap, hd = 16, 112, 14, 86
    S = Image.new('RGB', (pad * 2 + W * 2 + gap, hd + 2 * (H + cap) + pad), INK); d = ImageDraw.Draw(S)
    d.text((pad, 14), 'THE WEIGHT OF HEAVEN  ·  Q10, second version  ·  the floor of papers  ·  storyboard  ·  one take, four shots, 18 s', fill=GOLD, font=f0)
    d.text((pad, 48), 'It follows "We were chosen." and plays straight through: every line is spoken on camera. Sketches; the take makes the picture.', fill=PAPER, font=f2)
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
    ser_back, kar_back = b4.cut('serath', 1), b4.cut('karst', 1).copy()
    m = ndimage.binary_fill_holes(ndimage.binary_closing(kar_back[..., 3] > 0.3, iterations=14))      # his sheet's matte is ragged: made whole
    kar_back[..., 3] = ndimage.gaussian_filter(m.astype(np.float32), 1.5)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # 1. Karst at the opening: a frame the film has of this set-up (Q09 take 1), where he is already turned
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', P('out/takes/Q09_t1.mp4'), '-vf', "select='eq(n\\,566)'", '-vsync', '0', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    c1 = Image.fromarray(np.frombuffer(raw, np.uint8).reshape(432, 992, 3)).resize((W, H)); d = ImageDraw.Draw(c1)
    note(d, (36, 22), 'the set-up Q09 already gave (a frame of that take): turned to her, his eyes off to the left')
    # 2. the view of the plate: both among the papers, the lamp on the paving between them
    a = part(HALL, (0.0, 0.0, 1.0, 1.0), (W, H))
    a = b4.over(a, dark(ser_back, 0.34), cx=W * 0.40, foot=H * 0.93, height=H * 0.52, soft=0.3)
    a = b4.over(a, dark(kar_back, 0.16), cx=W * 0.58, foot=H * 0.93, height=H * 0.53, soft=0.3)
    glow = np.clip(1 - np.hypot((xx - W * 0.49) / 120, (yy - H * 0.86) / 60), 0, 1)[..., None] ** 1.5
    a = np.clip(a * (1 + 0.5 * glow * WARM), 0, 1)
    a = b4.over(a, lamp, cx=W * 0.49, foot=H * 0.90, height=H * 0.13)
    c2 = img(a); d = ImageDraw.Draw(c2)
    note(d, (36, 22), 'the hall as its reference shows it: daylight along the floor of papers')
    note(d, (36, 52), '(sketch: in the take both are seen from the side, facing each other)')
    note(d, (150, 392), 'Serath, left')
    note(d, (500, 392), 'Karst, right; the lamp between them')
    # 3. the shard on the last sheet
    pg = part(PAGE, (0.05, 0.25, 0.95, 0.98), (W, H))
    a = lit(pg, 600, 240, 620, base=0.42, gain=1.05)
    a = b4.over(a, shard, cx=450, foot=310, height=200)
    c3 = img(a); d = ImageDraw.Draw(c3)
    note(d, (36, 22), 'the last sheet: where the others have a stone, a grey shard with a white vein')
    note(d, (560, 388), 'a thread of dust slips from it')
    # 4. Serath in near profile, her eyes lowered
    bg = b4.blur(part(HALL, (0.05, 0.05, 0.45, 0.50), (W, H)), 18) * 0.28
    pale = np.clip(1 - np.hypot((xx - W * 0.93) / 46, (yy - H * 0.42) / 90), 0, 1)[..., None] ** 1.2
    bg = np.clip(bg + pale * 0.55, 0, 1)                                      # the open shutters, far off and soft
    pr = b9.profile()[:, ::-1].copy()                                        # facing right
    pr[..., :3] = np.clip(pr[..., :3] * WARM * 0.9, 0, 1)
    a = b4.over(bg, pr, cx=W * 0.36, foot=H, height=H)
    c4 = img(a); d = ImageDraw.Draw(c4)
    note(d, (36, 22), 'near profile, level, as Q09 gave her at the slab; her eyes lowered to the shard, below the frame')
    note(d, (470, 300), '(sketch: in the take her head is bowed)')
    cells = [
        (c1, 'SHOT 1 · 0–5.8 s · Karst at the opening',
         'Already turned to her. He answers what she said: "You were sheltered." A breath. More quietly: "By then you had gardens." Then his eyes go down to the floor of the hall.'),
        (c2, 'SHOT 2 · 5.8–11.4 s · the floor of papers',
         'Time has passed: both stand among the papers, his lamp on the paving between them, the doorway empty behind. To the sheets: "I drew where each one would fall." Then, quieter: "You sealed them." Her eyes go along the row and stop on the last sheet.'),
        (c3, 'SHOT 3 · 11.4–13.8 s · the shard',
         'What she is looking at: the last sheet, her red wax new on it, and in place of a stone a broken piece of grey rock. No one speaks.'),
        (c4, 'SHOT 4 · 13.8–18 s · Serath',
         'Close, in near profile, the lamp on her face from below. She looks at it. Quietly: "The marriage bell." She does not look up; the shot holds on her.'),
    ]
    sheet(cells, P('design/boards/Q10v2_board.jpg'))

    f1 = ImageFont.truetype(BOLD, 18); f2 = ImageFont.truetype(REG, 15)
    refs = [(HALL, '@Image 1 · the hall, shutters open', 'The approved hall as Q09 used it, cropped below its beams'),
            ('refs/CHAR_C01_serath.jpg', '@Image 2 · SERATH', 'Approved sheet'),
            ('refs/CHAR_C02_karst.jpg', '@Image 3 · KARST', 'Approved sheet'),
            (LAMP, '@Image 4 · Karst\'s lamp', 'Approved sheet\'s main view'),
            (SHARD, '@Image 5 · the shard', 'Approved sheet\'s main view')]
    w, h, pad, cap = 470, 260, 14, 52
    S = Image.new('RGB', (pad + 3 * (w + pad), pad + 2 * (h + cap) + pad), INK); d = ImageDraw.Draw(S)
    for k, (path, title, text) in enumerate(refs):
        im = Image.open(P(path)).convert('RGB'); im.thumbnail((w, h), Image.LANCZOS)
        x = pad + (k % 3) * (w + pad); y = pad + (k // 3) * (h + cap)
        S.paste(im, (x + (w - im.width) // 2, y + (h - im.height) // 2)); d.text((x, y + h + 5), title, fill=GOLD, font=f1); d.text((x, y + h + 28), text, fill=PAPER, font=f2)
    S.save(P('design/boards/Q10v2_refs.jpg'), quality=90); print('wrote design/boards/Q10v2_refs.jpg', S.size)


if __name__ == '__main__':
    main()
