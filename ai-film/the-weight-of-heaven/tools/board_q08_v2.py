#!/usr/bin/env python3
"""Q08 again, from the approved references, opening on Q07's last frame. Storyboard. Nothing generated.

The author, 27 November, on the takes made from new stills: "But why didn't you [use] the reference instead!? Cause this
looks bad...", and then: "everything again (the landing, the collar, the spear, Karst)... And it should continue from the
last frame of the Q07". The frames are staging sketches laid over the approved yard itself (ENV_E08), with people cut
from their sheets: they place things; the takes are made from the yard and the sheets, with no stills in between.

    /root/leonxlnx/earshot/.venv/bin/python tools/board_q08_v2.py   ->  design/boards/Q08_board_v2.jpg
"""
import importlib.util, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('b8', P('tools/board_q08.py')); b8 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b8)
b4, W, H = b8.b4, b8.W, b8.H
img, arr, note, arrow, GOLD, INK, PAPER, BOLD, REG = b4.img, b4.arr, b4.note, b4.arrow, b4.GOLD, b4.INK, b4.PAPER, b4.BOLD, b4.REG
part, key, dark = b8.part, b8.key, b8.dark
E08 = 'refs/ENV_E08_treaty-house-courtyard.jpg'


def sheet(cells, path):
    f1 = ImageFont.truetype(BOLD, 20); f2 = ImageFont.truetype(REG, 17); f0 = ImageFont.truetype(BOLD, 24)
    pad, cap, gap, hd = 16, 104, 14, 86
    rows = (len(cells) + 1) // 2
    S = Image.new('RGB', (pad * 2 + W * 2 + gap, hd + rows * (H + cap) + pad), INK); d = ImageDraw.Draw(S)
    d.text((pad, 14), 'THE WEIGHT OF HEAVEN  ·  Q08 again  ·  from the approved references  ·  storyboard  ·  five shots, 23 s', fill=GOLD, font=f0)
    d.text((pad, 48), 'Made from the approved yard and the character sheets, with no stills in between. Shot 1 opens on the last frame of Q07. '
                      'Sketches over the approved yard itself; they place people, the takes make the picture.', fill=PAPER, font=f2)
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
    stern = key(part('refs/SHIP_V04_cutter.jpg', (0.785, 0.53, 0.955, 0.875), (340, 390)), lo=0.07)
    side = key(part('refs/SHIP_V04_cutter.jpg', (0.255, 0.52, 0.76, 0.89), (760, 320)), lo=0.06)
    # 1. opens on Q07's last frame; the cutter passes along the wall
    a = arr(Image.open(P('refs/frames/Q08_open_q07_last.jpg')).convert('RGB').resize((W, H)))
    a = b4.over(a, stern, cx=W * 0.86, foot=H * 0.56, height=150, gain=0.9)
    a = b4.over(a, stern, cx=W * 0.91, foot=H * 0.36, height=34, gain=0.75)
    c1 = img(a); d = ImageDraw.Draw(c1)
    note(d, (36, 26), 'opens on the last frame of Q07: no jump in the film')
    arrow(d, (W * 0.84, 170), (W * 0.905, 118), w=3); note(d, (430, 150), 'the cutter comes in close, over the wall,')
    note(d, (430, 180), 'and goes away along it')
    # 2. the landing, in the approved yard
    a = part(E08, (0.0, 0.14, 0.62, 0.90), (W, H))
    a = b4.over(a, side, cx=W * 0.33, foot=H * 0.70, height=120)
    ser = b4.cut('serath', 0); a = b4.over(a, ser, cx=W * 0.30, foot=H * 0.83, height=H * 0.34)
    a = b4.head(a, W * 0.30, H * 0.83 - H * 0.34 - 20, 24, (0.36, 0.25, 0.19), (0.12, 0.12, 0.13))
    aide = key(part('refs/CHAR_S03_aide.jpg', (0.05, 0.0, 0.45, 1.0), (420, 600)))
    a = b4.over(a, aide, cx=W * 0.37, foot=H * 0.76, height=H * 0.33)
    for who, cx in (('farmer', W * 0.04), ('marl', W * 0.97)):
        a = b4.over(a, dark(b4.cut(who, 1), 0.28), cx=cx, foot=H * 1.55, height=H * 1.5, soft=3.0)
    c2 = img(a); d = ImageDraw.Draw(c2)
    note(d, (150, 20), 'the approved yard, its own light; the cutter on the landing ground')
    arrow(d, (W * 0.30 - 55, 262), (W * 0.30 - 55, 300), w=3); note(d, (60, 232), 'her knees give for a moment')
    arrow(d, (W * 0.37 + 40, 280), (W * 0.37 + 40, 330), w=3); note(d, (430, 262), 'the aide falls: hands and knees, head up')
    note(d, (250, 392), 'the watchers do not move. Nobody laughs')
    # 3. the collar
    g = b4.blur(part(E08, (0.0, 0.0, 0.30, 0.55), (W, H)), 22) * 0.9
    g = b4.over(g, b4.cut('serath', 2), cx=W * 0.52, foot=H + 120, height=H * 1.42, gain=0.82)
    c3 = img(g); d = ImageDraw.Draw(c3)
    note(d, (36, 26), 'the gold collar is heavy on her neck'); arrow(d, (640, 330), (640, 270), w=4); note(d, (660, 290), 'she lifts her chin level')
    note(d, (36, 388), 'then holds: her eyes on who waits. Also her answer to Karst, in the cut')
    # 4. the spear
    a = b4.blur(part(E08, (0.26, 0.28, 0.52, 0.80), (W, H)), 6) * 0.85
    a = b4.over(a, b4.cut('marl', 2), cx=W * 0.27, foot=H + 60, height=H * 1.12, gain=0.85)
    a = b4.over(a, b4.cut('farmer', 2), cx=W * 0.74, foot=H + 60, height=H * 1.12, gain=0.85)
    c4 = img(a); d = ImageDraw.Draw(c4)
    d.line([(W * 0.515, 0), (W * 0.515, H)], fill=(150, 128, 96), width=7)
    note(d, (36, 26), 'Marl puts a spear into his hand'); note(d, (540, 60), 'his free hand goes to the bowl at his belt')
    note(d, (240, 388), 'then both watch her pass; neither looks into the lens')
    # 5. Karst at the approved door
    a = part(E08, (0.455, 0.36, 0.665, 0.74), (W, H)) * 0.9
    k = b4.cut('karst', 2).copy(); sh = np.linspace(1.0, 0.45, k.shape[1], dtype=np.float32)[None, :, None]; k[..., :3] *= sh
    a = b4.over(a, k, cx=W * 0.50, foot=H + 90, height=H * 1.0, gain=0.8)
    c5 = img(a); d = ImageDraw.Draw(c5)
    note(d, (120, 22), 'Karst in the fort\'s own doorway, its inside in shadow')
    note(d, (150, 350), '"We did not attack your city, Admiral."'); note(d, (150, 384), '"We stopped carrying it."  The song cuts out')
    cells = [
        (c1, 'A · SHOT 1 · 0–2.5 s · the wall\'s top, locked off · continues from Q07', 'Opens exactly on Q07\'s last frame, Sarn Vale from the wall\'s top. The white cutter comes into the frame close, flying low over the wall, and goes away along it toward the fort. The join with Q07 is one continuous shot.'),
        (c2, 'A · SHOT 2 · 2.5–8 s · the yard, low, from among the watchers · her own weight', 'The cutter has set down on the yard\'s landing ground. Serath steps onto the ground; her knees give for a moment (a dip, her hands a little way out, upright within a second); behind her the aide steps down and falls to his hands and knees. The watchers do not move.'),
        (c3, 'A · SHOT 3 · 8–11 s · close on Serath · the collar', 'The collar of her rank pulls her head down. She lifts her chin level against it and holds, her eyes steady on someone off-screen. The held end can follow Karst\'s line in the cut, as her answer.'),
        (c4, 'B · SHOT 1 · 0–4 s · two-shot, from the hips up · the spear and the bowl', 'In front of the fort\'s wall. Marl puts a spear into the farmer\'s hand; its butt drops to the ground. His free hand goes to the wooden bowl at his belt and stays. Both turn and watch Serath pass, off-screen; neither looks into the lens.'),
        (c5, 'B · SHOT 2 · 4–12 s · Karst in the doorway, from the hips up · the line', 'At the fort\'s arched door, lit from the yard, the door\'s shadow behind him. A second of looking; the first sentence; a breath; the second, quieter. A second and a half is held after the line.'),
    ]
    sheet(cells, P('design/boards/Q08_board_v2.jpg'))


if __name__ == '__main__':
    main()
