#!/usr/bin/env python3
"""Q11, the hall: the bare hand. Storyboard and reference sheet. Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/board_q11.py
        ->  design/boards/Q11_board.jpg (five frames), design/boards/Q11_refs.jpg (the references, in attach order)

The frames are staging sketches made from the take's own references and from frames the film already has (Q10 take 2).
They place people, things and light; the take is made from the references, not from these.
"""
import importlib.util, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)


def load(name):
    spec = importlib.util.spec_from_file_location(name, P('tools', name + '.py')); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


b10 = load('board_q10')
b8, b4, W, H = b10.b8, b10.b4, b10.W, b10.H
img, arr, note, arrow, GOLD, INK, PAPER, BOLD, REG = b10.img, b10.arr, b10.note, b10.arrow, b10.GOLD, b10.INK, b10.PAPER, b10.BOLD, b10.REG
part, WARM = b8.part, b10.WARM
HALL = 'refs/crops/Q10_hall_open_floor.jpg'
SETUP = 'refs/frames/Q11_setup_shard.jpg'
REFS_HAND = [(SETUP, '@Image 1 · first frame', 'A frame of Q10 take 2: the shard on the last sheet')]
REFS_TALK = [('refs/crops/Q11_hall_wall.jpg', '@Image 1 · the hall\'s wall', 'A piece of the approved hall: dark masonry only'),
             ('refs/CHAR_C01_serath.jpg', '@Image 2 · SERATH', 'Approved sheet'),
             ('refs/CHAR_C02_karst.jpg', '@Image 3 · KARST', 'Approved sheet'),
             ('refs/frames/Q11_setup_serath.jpg', '@Image 4 · her close shot', 'A frame of Q10 take 2: the set-up she returns to')]


def frame(path, n):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', P(path), '-vf', f"select='eq(n\\,{n})'", '-vsync', '0', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    return Image.fromarray(np.frombuffer(raw, np.uint8).reshape(432, 992, 3)).resize((W, H))


def sheet(cells, path, shots):
    f1 = ImageFont.truetype(BOLD, 20); f2 = ImageFont.truetype(REG, 17); f0 = ImageFont.truetype(BOLD, 24)
    pad, cap, gap, hd = 16, 112, 14, 86; cols = 3; rows = (len(cells) + cols - 1) // cols
    S = Image.new('RGB', (pad * 2 + W * cols + gap * (cols - 1), hd + rows * (H + cap) + pad), INK); d = ImageDraw.Draw(S)
    d.text((pad, 14), f'THE WEIGHT OF HEAVEN  ·  Q11  ·  the hall: the bare hand  ·  storyboard  ·  {shots}', fill=GOLD, font=f0)
    d.text((pad, 48), 'It follows "The marriage bell." and plays straight through: every line is spoken on camera. Sketches; the take makes the picture.', fill=PAPER, font=f2)
    for k, (im, title, text) in enumerate(cells):
        x = pad + (k % cols) * (W + gap); y = hd + (k // cols) * (H + cap)
        S.paste(im.convert('RGB'), (x, y)); d.text((x, y + H + 8), title, fill=GOLD, font=f1)
        line, yl = '', y + H + 36
        for wd in text.split():
            if d.textlength(line + ' ' + wd, font=f2) > W - 8:
                d.text((x, yl), line, fill=PAPER, font=f2); yl += 22; line = wd
            else:
                line = (line + ' ' + wd).strip()
        d.text((x, yl), line, fill=PAPER, font=f2)
    S.save(path, quality=90); print('wrote', os.path.relpath(path, HERE), S.size)


def karst_close(caption):
    """Karst's close shot, sketched from his sheet's face on the dark wall: on the left half, daylight from the right."""
    bg = b4.blur(part('refs/crops/Q11_hall_wall.jpg', (0.0, 0.2, 1.0, 0.75), (W, H)), 16) * 0.5
    f = b4.cut('karst', 2).copy(); w = f.shape[1]
    grad = np.linspace(0.40, 1.10, w, dtype=np.float32)[None, :, None]       # the daylight is on the right, the side he looks to
    f[..., :3] = np.clip(f[..., :3] * grad * np.array([0.92, 0.97, 1.05], np.float32), 0, 1)
    a = b4.over(bg, f, cx=W * 0.34, foot=H + 170, height=H * 1.55)
    c = img(a); d = ImageDraw.Draw(c); note(d, (36, 22), caption)
    note(d, (36, 52), '(sketch from his sheet: in the take he is turned to the right, his eyes down)')
    return c


def refs_sheet(refs, path):
    f1 = ImageFont.truetype(BOLD, 18); f2 = ImageFont.truetype(REG, 15)
    w, h, pad, cap = 470, 260, 14, 52
    S = Image.new('RGB', (pad + len(refs) * (w + pad), pad + (h + cap) + pad), INK); d = ImageDraw.Draw(S)
    for k, (p, title, text) in enumerate(refs):
        im = Image.open(P(p)).convert('RGB'); im.thumbnail((w, h), Image.LANCZOS)
        x = pad + k * (w + pad); y = pad
        S.paste(im, (x + (w - im.width) // 2, y + (h - im.height) // 2)); d.text((x, y + h + 5), title, fill=GOLD, font=f1); d.text((x, y + h + 28), text, fill=PAPER, font=f2)
    S.save(P(path), quality=90); print('wrote', path, S.size)


def main():
    setup = Image.open(P(SETUP)).convert('RGB').resize((W, H))
    ch = setup.copy(); d = ImageDraw.Draw(ch)
    note(d, (36, 22), 'it opens on this frame of the last take: the shard on the last sheet, the lamp beside it')
    arrow(d, (330, 60), (350, 150), w=5); note(d, (36, 80), 'her bare hand comes down from the top, slowly, and lies on it')
    note(d, (36, 388), 'by 2.4 s it is at rest; it stays to the end')
    ser = Image.open(P('refs/frames/Q11_setup_serath.jpg')).convert('RGB').resize((W, H))
    c2 = ser.copy(); d = ImageDraw.Draw(c2); note(d, (36, 22), 'her close shot as the last take gave it (a frame of it): eyes lowered, on her hand')
    c4 = ser.copy(); d = ImageDraw.Draw(c4); note(d, (36, 22), 'the same set-up: now her eyes are up, on him (sketch: the frame has them down)')
    cells = [
        (ch, 'TAKE A · THE HAND · one shot, 5 s · no words',
         'She has gone down beside the rock and taken off her glove. Her bare hand comes down and lies on it, and stays. In the film it sits after Karst\'s first shot, and its still end can close the scene.'),
        (karst_close('Karst, standing over her, in the daylight from the shutters'), 'TAKE B · SHOT 1 · 0–8.4 s · Karst',
         'He looks down at the rock and says the figures, plainly: "Ninety tons." A breath. "Anvil Vale, the same hour." A breath. "Every bell is a mountain now."'),
        (c2, 'TAKE B · SHOT 2 · 8.4–12.8 s · Serath',
         'Her eyes on her hand. Quietly: "I did not read it." Then her eyes come up to him.'),
        (karst_close('the same set-up'), 'TAKE B · SHOT 3 · 12.8–18.2 s · Karst',
         'Without blame: "No one above reads them." A breath. More quietly: "I read every one."'),
        (c4, 'TAKE B · SHOT 4 · 18.2–20 s · Serath',
         'She goes on looking at him. No one speaks.'),
    ]
    sheet(cells, P('design/boards/Q11_board.jpg'), 'two takes: the hand (5 s), then the talk (20 s)')
    refs_sheet(REFS_HAND, 'design/boards/Q11H_refs.jpg'); refs_sheet(REFS_TALK, 'design/boards/Q11_refs.jpg')


if __name__ == '__main__':
    main()
