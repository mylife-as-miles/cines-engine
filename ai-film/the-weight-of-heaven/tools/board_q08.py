#!/usr/bin/env python3
"""Q08 (the Treaty House yard: her own weight, the spear, "We stopped carrying it") storyboard. Nothing generated.

Five shots in two generations: A (no speech) is the landing, the collar, and Sarn Vale alive; B is the spear and Karst's
line at the door. The frames are staging sketches cut from the approved sheets and references: they place people and
things in the frame and say what happens. The pictures are made by four shot plates, then the takes.

    /root/leonxlnx/earshot/.venv/bin/python tools/board_q08.py   ->  design/boards/Q08_board.jpg
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
b4.SHEET.update({'karst': 'refs/CHAR_C02_karst.jpg', 'marl': 'refs/CHAR_C03_marl.jpg', 'farmer': 'refs/CHAR_C09_farmer.jpg'})
DUST = np.array([0.36, 0.37, 0.38], np.float32)


def part(path, box, size):
    im = Image.open(P(path)).convert('RGB'); w, h = im.size
    return arr(im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h))).resize(size, Image.LANCZOS))


def key(a, lo=0.085, hi=0.17):
    """A figure or thing off a grey studio backdrop: RGBA floats, cropped."""
    l = a @ np.array([0.299, 0.587, 0.114], np.float32); sat = (a.max(2) - a.min(2)) / np.maximum(a.max(2), 1e-3); bg = np.median(l[:14])
    m = (l - bg > lo) | (l - bg < -hi) | (sat > 0.15)
    m = ndimage.binary_fill_holes(ndimage.binary_closing(ndimage.binary_opening(m, iterations=2), iterations=6))
    lab, n = ndimage.label(m); m = lab == (1 + int(np.argmax(ndimage.sum(m, lab, range(1, n + 1)))))
    ys, xs = np.where(m)
    return np.dstack([a, ndimage.gaussian_filter(m.astype(np.float32), 1.3)])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def dark(rgba, k):
    out = rgba.copy(); out[..., :3] *= k
    return out


def yard():
    """The yard looking at its outer wall: the rock closing the top, the tall wall and its gateway, packed dust."""
    a = np.zeros((H, W, 3), np.float32)
    top, foot = int(H * 0.13), int(H * 0.41)
    a[:top] = part('refs/candidates/E05B_t1a_fixed.jpg', (0.0, 0.0, 1.0, 0.16), (W, top)) * 0.55                # dark rock and cloud
    a[top:foot] = np.array([0.085, 0.09, 0.10], np.float32)                                                    # the outer wall, more than twice a man's height
    a[top + 22:foot, int(W * 0.72):int(W * 0.80)] = np.array([0.55, 0.57, 0.60], np.float32)                   # its gateway: the plain, pale with haze
    g = np.linspace(0.30, 0.44, H - foot, dtype=np.float32)[:, None, None]
    a[foot:] = g * np.array([1.0, 1.02, 1.05], np.float32) + np.random.default_rng(3).normal(0, 0.012, (H - foot, W, 1)).astype(np.float32)
    return a


def sheet(cells, path):
    f1 = ImageFont.truetype(BOLD, 20); f2 = ImageFont.truetype(REG, 17); f0 = ImageFont.truetype(BOLD, 24)
    pad, cap, gap, hd = 16, 104, 14, 86
    rows = (len(cells) + 1) // 2
    S = Image.new('RGB', (pad * 2 + W * 2 + gap, hd + rows * (H + cap) + pad), INK); d = ImageDraw.Draw(S)
    d.text((pad, 14), 'THE WEIGHT OF HEAVEN  ·  Q08  ·  THE TREATY HOUSE YARD  ·  storyboard  ·  five shots in two generations, 24 s', fill=GOLD, font=f0)
    d.text((pad, 48), 'Staging sketches cut from the approved sheets and references. They place people in the frame; the pictures are made by four shot plates, then the takes. '
                      'Every shot is locked off: below, the camera is planted.', fill=PAPER, font=f2)
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
    # A1. Sarn Vale, alive: the frame already in the film
    c1 = Image.open(P('refs/frames/Q08_open_sarn_vale.jpg')).convert('RGB').resize((W, H)); d = ImageDraw.Draw(c1)
    note(d, (36, 30), 'the same view as in the film, alive this time')
    arrow(d, (590, 235), (620, 175), w=3); note(d, (640, 168), 'smoke climbs and leans')
    arrow(d, (720, 300), (690, 268), w=3); note(d, (735, 300), 'three sheep walk uphill')
    note(d, (36, 388), 'wind runs through the grass; mist drifts along the far hillside')
    # A2. the landing
    a = yard()
    ship = key(part('refs/SHIP_V04_cutter.jpg', (0.255, 0.52, 0.76, 0.89), (760, 320)), lo=0.06)
    a = b4.over(a, ship, cx=W * 0.50, foot=H * 0.73, height=150)
    ser = b4.cut('serath', 0); a = b4.over(a, ser, cx=W * 0.42, foot=H * 0.86, height=H * 0.36)
    a = b4.head(a, W * 0.42, H * 0.86 - H * 0.36 - 22, 26, (0.36, 0.25, 0.19), (0.12, 0.12, 0.13))
    aide = key(part('refs/CHAR_S03_aide.jpg', (0.05, 0.0, 0.45, 1.0), (420, 600)))
    a = b4.over(a, aide, cx=W * 0.50, foot=H * 0.79, height=H * 0.36)
    for who, cx in (('farmer', W * 0.07), ('marl', W * 0.95), ('farmer', W * 0.80)):
        a = b4.over(a, dark(b4.cut(who, 1), 0.30), cx=cx, foot=H * 1.55, height=H * 1.5, soft=3.0)
    c2 = img(a); d = ImageDraw.Draw(c2)
    note(d, (150, 16), 'from among the watchers; the tall outer wall behind; rock closes the top')
    arrow(d, (W * 0.42 - 60, 250), (W * 0.42 - 60, 300), w=3); note(d, (150, 236), 'her knees almost go; she stands')
    arrow(d, (W * 0.50 + 40, 270), (W * 0.50 + 40, 330), w=3); note(d, (560, 250), 'the aide falls outright')
    note(d, (250, 392), 'the watchers do not move. Nobody laughs')
    # A3. the collar
    g = np.zeros((H, W, 3), np.float32) + np.array([0.50, 0.52, 0.55], np.float32)                     # grey cloud behind her
    g[:int(H * 0.26)] = np.array([0.07, 0.075, 0.085], np.float32)                                       # the dark rock across the top
    g = b4.blur(g, 30)
    g = b4.over(g, b4.cut('serath', 2), cx=W * 0.52, foot=H + 120, height=H * 1.42, gain=0.86)
    c3 = img(g); d = ImageDraw.Draw(c3)
    note(d, (36, 30), 'the gold collar drags at her neck like a hand')
    arrow(d, (640, 330), (640, 270), w=4); note(d, (660, 290), 'she lifts her chin level against it')
    note(d, (36, 388), 'her eyes come up and hold: also her answer to Karst, in the cut')
    # B1. the spear
    a = b4.blur(part('refs/ENV_E08_treaty-house-courtyard.jpg', (0.28, 0.12, 0.72, 0.58), (W, H)), 7) * 0.8
    y0 = int(H * 0.2); crowd = b4.blur(part('refs/CROWD_K03_refugees.jpg', (0.10, 0.10, 0.90, 0.95), (W, H - y0)), 5)
    a[y0:] = a[y0:] * 0.35 + crowd * 0.65 * np.array([0.9, 0.9, 0.92], np.float32)
    a = b4.over(a, b4.cut('marl', 2), cx=W * 0.27, foot=H + 60, height=H * 1.12, gain=0.9)
    a = b4.over(a, b4.cut('farmer', 2), cx=W * 0.74, foot=H + 60, height=H * 1.12, gain=0.9)
    c4 = img(a); d = ImageDraw.Draw(c4)
    d.line([(W * 0.515, 0), (W * 0.515, H)], fill=(150, 128, 96), width=7)
    note(d, (36, 26), 'Marl puts a spear into his hand'); note(d, (540, 60), 'his free hand goes to the bowl at his belt')
    arrow(d, (360, 360), (640, 360), w=3); note(d, (240, 388), 'then both watch her pass; neither looks into the lens')
    # B2. Karst at the door
    a = np.zeros((H, W, 3), np.float32) + 0.018
    stone = b4.blur(part('refs/ENV_E08_treaty-house-courtyard.jpg', (0.30, 0.20, 0.40, 0.60), (int(W * 0.16), H)), 2) * 0.55
    a[:, :int(W * 0.16)] = stone; a[:, W - int(W * 0.16):] = stone[:, ::-1] * 0.6
    k = b4.cut('karst', 2).copy(); sh = np.linspace(1.0, 0.45, k.shape[1], dtype=np.float32)[None, :, None]; k[..., :3] *= sh   # lit from the left; the right falls into the door's dark
    a = b4.over(a, k, cx=W * 0.50, foot=H + 70, height=H * 1.10, gain=0.85)
    c5 = img(a); d = ImageDraw.Draw(c5)
    note(d, (190, 26), 'Karst in the door\'s shadow: a frame within the frame')
    note(d, (150, 350), '"We did not attack your city, Admiral."'); note(d, (150, 384), '"We stopped carrying it."  The song cuts out')
    cells = [
        (c2, 'A · SHOT 1 · 0–5.5 s · the yard, low, from among the watchers · her own weight', 'The white cutter has set down. Serath steps onto the ground; her knees buckle; she catches herself and stands. Behind her the aide steps down and falls onto his hands and knees. The people of the ground watch and do not move. First, so that nothing can squeeze it.'),
        (c3, 'A · SHOT 2 · 5.5–9 s · close on Serath, from below · the collar', 'The collar of her rank pulls her head down. She lifts her chin level against it, and from 7 s holds: her eyes steady on someone off-screen. Those two held seconds can also follow Karst\'s line in the cut, as her answer.'),
        (c1, 'A · SHOT 3 · 9–12 s · Sarn Vale from the wall\'s top, locked off', 'The valley beyond the wall, alive: smoke rising from each chimney, sheep grazing and walking, wind in the grass, mist drifting on the far hillside. It takes the place of the still valley at the end of Q07. Last, where an overrun costs least.'),
        (c4, 'B · SHOT 1 · 0–4 s · two-shot, from the hips up · the spear and the bowl', 'Marl puts a spear into the farmer\'s hand; its butt drops to the ground. His free hand goes to the wooden bowl at his belt and stays there. Both turn and watch Serath pass, off-screen; neither looks into the lens. Their faces give nothing.'),
        (c5, 'B · SHOT 2 · 4–12 s · Karst in the doorway, from the hips up · the line', 'He looks at her for a second. Then, dry and without heat: the first sentence (about 3 s); a breath; the second, quieter, falling flat. He stays as he is. A second and a half is left after the line, so that nothing can cut it short.'),
    ]
    sheet(cells, P('design/boards/Q08_board.jpg'))


if __name__ == '__main__':
    main()
