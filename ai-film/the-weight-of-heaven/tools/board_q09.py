#!/usr/bin/env python3
"""Q09, the hall of the treaty: storyboard and reference sheet. Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/board_q09.py
        ->  design/boards/Q09_board.jpg (five frames), design/boards/Q09_refs.jpg (the four references, in attach order)

The frames are staging sketches: the hall's own reference (dark, as made by tools/plate_e09_dark.py, and as approved),
with Serath and Karst cut from their sheets and, for her profile, from a frame of Q08. They place people and light; the
take is made from the references, not from these.
"""
import importlib.util, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('b8', P('tools/board_q08.py')); b8 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b8)
b4, W, H = b8.b4, b8.W, b8.H
img, arr, note, arrow, GOLD, INK, PAPER, BOLD, REG = b4.img, b4.arr, b4.note, b4.arrow, b4.GOLD, b4.INK, b4.PAPER, b4.BOLD, b4.REG
part, key, dark = b8.part, b8.key, b8.dark
DARK, DAY = 'refs/relit/ENV_E09_treaty-house-hall_dark.jpg', 'refs/relit/ENV_E09_treaty-house-hall_plain.jpg'
b4.SHEET.setdefault('karst', 'refs/CHAR_C02_karst.jpg')


def profile():
    """Serath's profile, from Q08A take 2 (frame 236), turned to face right, on a hand-drawn outline: RGBA."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', P('out/takes/Q08A_t2.mp4'), '-vf', "select='eq(n\\,236)'", '-vsync', '0', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(432, 992, 3)[:, ::-1].copy()
    pts = [(105, 432), (150, 395), (215, 345), (238, 292), (224, 252), (160, 238), (130, 160), (135, 80), (175, 20), (232, 0), (468, 0), (492, 42), (502, 78), (506, 96), (533, 126), (512, 152),
           (538, 180), (541, 200), (531, 216), (536, 250), (502, 276), (442, 292), (432, 302), (463, 330), (456, 396), (500, 410), (526, 432)]
    m = Image.new('L', (992, 432), 0); ImageDraw.Draw(m).polygon(pts, fill=255)
    al = ndimage.gaussian_filter(np.asarray(m).astype(np.float32) / 255, 1.6)
    return np.dstack([f.astype(np.float32) / 255, al])[:, 100:546]


def sheet(cells, path):
    f1 = ImageFont.truetype(BOLD, 20); f2 = ImageFont.truetype(REG, 17); f0 = ImageFont.truetype(BOLD, 24)
    pad, cap, gap, hd = 16, 128, 14, 86
    rows = (len(cells) + 1) // 2
    S = Image.new('RGB', (pad * 2 + W * 2 + gap, hd + rows * (H + cap) + pad), INK); d = ImageDraw.Draw(S)
    d.text((pad, 14), 'THE WEIGHT OF HEAVEN  ·  Q09  ·  the hall of the treaty  ·  storyboard  ·  five shots, 25 s', fill=GOLD, font=f0)
    d.text((pad, 48), 'Dark until Karst opens the shutters. Sketches over the hall\'s own reference; they place people and light, the take makes the picture.', fill=PAPER, font=f2)
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
    S.save(path, quality=90); print('wrote', os.path.relpath(path, HERE), S.size)


def main():
    ser_back, ser_face = b4.cut('serath', 1), b4.cut('serath', 2)
    kar_back, kar_front = b4.cut('karst', 1), b4.cut('karst', 0)
    def solid(rgba, keep):                                                  # a silhouette: the sheet's matte made whole, and only the top `keep` of the figure
        c = rgba[:int(rgba.shape[0] * keep)].copy(); m = ndimage.binary_fill_holes(ndimage.binary_opening(ndimage.binary_closing(c[..., 3] > 0.2, iterations=14), iterations=5))
        lab, n = ndimage.label(m); m = lab == (1 + int(np.argmax(ndimage.sum(m, lab, range(1, n + 1)))))
        c[..., 3] = ndimage.gaussian_filter(m.astype(np.float32), 1.5); return c
    # 1. the wide, dark
    a = part(DARK, (0.0, 0.0, 1.0, 1.0), (W, H))
    a = b4.over(a, dark(ser_back, 0.42), cx=330, foot=296, height=104, soft=0.4)
    a = b4.over(a, dark(kar_front, 0.20), cx=754, foot=262, height=66, soft=0.5)
    c1 = img(a); d = ImageDraw.Draw(c1)
    note(d, (36, 22), 'dark: the only light is the door behind us and the gap in the shutters')
    arrow(d, (330, 150), (330, 186), w=3); note(d, (236, 122), 'Serath at the wall, reading')
    arrow(d, (700, 150), (744, 190), w=3); note(d, (590, 122), 'Karst waits in front of the shutters')
    # 2. her profile at the wall, dark
    wall = b4.blur(part(DARK, (0.27, 0.10, 0.47, 0.50), (W, H)), 2.5) * 1.5
    glow = np.zeros((H, W), np.float32); glow[120:330, 0:150] = 1; glow = ndimage.gaussian_filter(glow, 70)
    wall = np.clip(wall + glow[..., None] * np.array([0.10, 0.11, 0.12], np.float32), 0, 1)
    pr = profile(); al = pr[..., 3]
    rim = np.clip(al - ndimage.gaussian_filter(al, 4), 0, 1) * 2.2                # light from behind her finds the edge of her face
    pr[..., :3] = pr[..., :3] * 0.40 + rim[..., None] * np.array([0.55, 0.58, 0.62], np.float32)
    a = b4.over(wall, pr, cx=330, foot=H, height=H)
    c2 = img(a); d = ImageDraw.Draw(c2)
    note(d, (520, 30), 'the carved marks, raked by weak light')
    note(d, (36, 22), 'her face is a dark shape with a rim of light')
    arrow(d, (520, 300), (600, 300), w=3); note(d, (470, 318), 'her gloved finger follows the line')
    # 3. Karst hauls the shutters open
    a = part(DAY, (0.615, 0.13, 0.905, 0.72), (W, H)) * 0.8
    a = b4.over(a, dark(solid(kar_back, 0.50), 0.16), cx=W * 0.50, foot=H + 4, height=H * 0.80)
    c3 = img(a); d = ImageDraw.Draw(c3)
    arrow(d, (410, 250), (330, 250), w=4); arrow(d, (590, 250), (670, 250), w=4)
    note(d, (36, 22), 'he pulls the two leaves in and lets them swing; a line of daylight becomes a door')
    note(d, (250, 392), 'the black plain; his back to us as he says it')
    # 4. Serath in the new light
    wall = b4.blur(part(DAY, (0.27, 0.10, 0.47, 0.50), (W, H)), 9) * 0.75
    a = b4.over(wall, ser_face, cx=400, foot=H + 150, height=H * 1.5, gain=0.92)
    c4 = img(a); d = ImageDraw.Draw(c4)
    note(d, (36, 22), 'the same view as frame 2; daylight reaches her; she turns from the wall to it')
    note(d, (620, 360), 'her eyes on the plain')
    # 5. Karst at the opening
    a = part(DAY, (0.665, 0.20, 0.805, 0.62), (W, H)) * 0.95
    k = dark(solid(kar_back, 0.40), 0.18)
    a = b4.over(a, k, cx=W * 0.78, foot=H + 4, height=H * 0.98)
    c5 = img(a); d = ImageDraw.Draw(c5)
    note(d, (36, 22), 'over his left shoulder: the black plain')
    arrow(d, (690, 110), (610, 110), w=3); note(d, (230, 94), 'he turns his head toward her for the last line')
    cells = [
        (c1, 'SHOT 1 · 0–3.8 s · the hall, wide, dark',
         'Serath in white, small, at the black wall of the treaty; Karst a dark shape at the closed shutters. She reads aloud, her back to us: "The seven cities, raised by the hands of all,"'),
        (c2, 'SHOT 2 · 3.8–9.6 s · her profile at the wall',
         'Close. Her gloved finger follows the cut marks. "and borne by the nations of the high ground," — the finger stops — "until the fire is stone."'),
        (c3, 'SHOT 3 · 9.6–15 s · Karst opens the shutters',
         'From behind him, the camera planted. He pulls the two heavy leaves toward himself, one step back, and lets them swing; daylight opens; the black plain, sharp, to the horizon. His back to us, as the leaves come to rest: "It was stone within forty years."'),
        (c4, 'SHOT 4 · 15–18.8 s · Serath, the same close view',
         'Daylight rakes along the wall and reaches her. She turns from the wall to the light, head then shoulders, and looks at the plain, past the camera. Quietly: "We were chosen."'),
        (c5, 'SHOT 5 · 18.8–25 s · Karst at the opening',
         'From a pace behind him, to his left; his head against the pale sky. Looking out: "You were sheltered." A breath. He turns his head toward her, a profile against the sky: "By then you had gardens." He holds.'),
    ]
    sheet(cells, P('design/boards/Q09_board.jpg'))

    # the references, in attach order
    f1 = ImageFont.truetype(BOLD, 19); f2 = ImageFont.truetype(REG, 16)
    refs = [(DARK, '@Image 1 · the hall, shutters closed', 'The approved hall, shutters shut and relit here (free): shots 1 and 2'),
            (DAY, '@Image 2 · the hall, shutters open', 'The approved hall, with the approved basalt plain put into its view (free): shots 3 to 5'),
            ('refs/CHAR_C01_serath.jpg', '@Image 3 · SERATH', 'Approved sheet'),
            ('refs/CHAR_C02_karst.jpg', '@Image 4 · KARST', 'Approved sheet')]
    w, h, pad, cap = 900, 386, 16, 58
    S = Image.new('RGB', (pad * 3 + w * 2, pad + 2 * (h + cap) + pad), INK); d = ImageDraw.Draw(S)
    for k, (path, title, text) in enumerate(refs):
        im = Image.open(P(path)).convert('RGB'); im.thumbnail((w, h), Image.LANCZOS)
        x = pad + (k % 2) * (w + pad); y = pad + (k // 2) * (h + cap)
        S.paste(im, (x + (w - im.width) // 2, y + (h - im.height) // 2)); d.text((x, y + h + 6), title, fill=GOLD, font=f1); d.text((x, y + h + 30), text, fill=PAPER, font=f2)
    S.save(P('design/boards/Q09_refs.jpg'), quality=90); print('wrote design/boards/Q09_refs.jpg', S.size)


if __name__ == '__main__':
    main()
