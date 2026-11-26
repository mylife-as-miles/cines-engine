#!/usr/bin/env python3
"""Q05 (the council: the arithmetic; "Give me until the evening bell") storyboard and its opening frame. Nothing generated.

Drawn over the film's own frames wherever the film already has the set-up: Q04 take 1's last frame (where Q05 opens),
its close-up of the Hierophant and its close-up of the Chancellor. Serath's close shot is new: her sheet's face over the
council chamber reference, a staging sketch.

    /root/leonxlnx/earshot/.venv/bin/python tools/board_q05.py

Writes
  refs/frames/Q05_open_serath.jpg   Q04 take 1's last frame, at twice its size: shot 1 opens on it (sent as a reference)
  design/boards/Q05_board.jpg       the storyboard, seven frames (six shots)
"""
import importlib.util, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('b4', P('tools/board_q04.py')); b4 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b4)
W, H = b4.W, b4.H
img, arr, note, arrow, GOLD, INK, PAPER, BOLD, REG = b4.img, b4.arr, b4.note, b4.arrow, b4.GOLD, b4.INK, b4.PAPER, b4.BOLD, b4.REG
TAKE = P('out/takes/Q04_t1.mp4')


def frame(n):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', TAKE, '-vf', f"select='eq(n,{n})'", '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                       capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.uint8).reshape(H, W, 3).astype(np.float32) / 255


def serath_close():
    """Serath turned to the room, close: the arch and the cloud behind her, bright; her face a little under them."""
    a = b4.chamber(170, 205, 560, soft=7)
    a = b4.mist(a, W * 0.5, H * 0.9, W, H * 0.2, seed=12, amount=0.5)
    a = b4.over(a, b4.cut('serath', 2), cx=W * 0.46, foot=H + 70, height=H * 1.18, gain=0.92)
    return a


def sheet(cells, path):
    f1 = ImageFont.truetype(BOLD, 20); f2 = ImageFont.truetype(REG, 17); f0 = ImageFont.truetype(BOLD, 24)
    pad, cap, gap, hd = 16, 104, 14, 86
    rows = (len(cells) + 1) // 2
    S = Image.new('RGB', (pad * 2 + W * 2 + gap, hd + rows * (H + cap) + pad), INK)
    d = ImageDraw.Draw(S)
    d.text((pad, 14), 'THE WEIGHT OF HEAVEN  ·  Q05  ·  THE COUNCIL: THE ARITHMETIC  ·  storyboard', fill=GOLD, font=f0)
    d.text((pad, 48), 'Frames 1, 3 and 5 are the film\'s own (Q04 take 1): the same set-ups come back. Serath\'s close shot is new: '
                      'her sheet over the chamber reference, a staging sketch.', fill=PAPER, font=f2)
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
    os.makedirs(P('refs/frames'), exist_ok=True)
    last = frame(576)
    img(last).resize((W * 2, H * 2), Image.LANCZOS).save(P('refs/frames/Q05_open_serath.jpg'), quality=95)
    print('wrote refs/frames/Q05_open_serath.jpg')
    hier, chan, ser = frame(300), frame(100), serath_close()

    c1 = img(last); d = ImageDraw.Draw(c1)
    note(d, (36, 34), 'where Q04 ended: she has looked back over her shoulder')
    arrow(d, (800, 250), (720, 250), w=4); note(d, (500, 290), 'she turns to face the room')

    c2 = img(ser); d = ImageDraw.Draw(c2)
    note(d, (36, 34), 'the first thing she says in the film')
    note(d, (36, 380), '"Forty thousand people live in Sarn Vale."')
    arrow(d, (640, 200), (860, 200), w=3); note(d, (600, 150), 'to the Council, past the camera')

    c3 = img(hier); d = ImageDraw.Draw(c3)
    note(d, (36, 34), 'he does not turn to her')
    note(d, (36, 380), '"And four million here."')

    c4 = img(ser); d = ImageDraw.Draw(c4)
    note(d, (36, 34), 'his voice, off-screen, gently, almost warmly:')
    note(d, (36, 64), '"Heaven has done your arithmetic for you."')
    note(d, (600, 380), 'she takes it. Her lips stay closed')

    c5 = img(chan); d = ImageDraw.Draw(c5)
    note(d, (430, 34), 'her eyes on the cup; a tremor in the voice')
    note(d, (430, 64), '"I have grandchildren on the lower terraces."')

    c6 = img(frame(112)); d = ImageDraw.Draw(c6)
    note(d, (430, 34), 'her eyes lift; her head turns a little toward Serath')
    arrow(d, (640, 110), (470, 110), w=4)
    note(d, (430, 380), '"Break it."  and we cut on the word')

    c7 = img(ser); d = ImageDraw.Draw(c7)
    note(d, (36, 34), 'she waits before she answers')
    note(d, (36, 380), '"Give me until the evening bell."')
    note(d, (640, 380), 'Q06 opens on this frame')

    cells = [
        (c1, 'SHOT 1 · 0–2 s · Serath at her arch · the same frame Q04 ended on',
         'Opens exactly on Q04\'s last frame (sent as a reference). No words. She turns her shoulders round from the cloud to face the room. The edit can run this straight on from Q04, or cut past it.'),
        (c2, 'SHOT 2 · 2–5.5 s · Serath · 75 mm, at her eye height, a slow drift',
         'Close, for the first time: the arch and the cloud bright behind her, her face a little under them. Even and factual, the first time she weighs anything: "Forty thousand people live in Sarn Vale."'),
        (c3, 'SHOT 3 · 5.5–8.5 s · the Hierophant · the same close-up as in Q04',
         'His eyes stay on the Engineer. He answers her without turning: "And four million here."'),
        (c4, 'SHOT 4 · 8.5–12 s · Serath, the same close shot · she listens',
         'The rest of his line falls on her, as the valley\'s name did: from off-screen, gently, "Heaven has done your arithmetic for you." Her eyes drop a little and come back up. She says nothing.'),
        (c5, 'SHOT 5 · 12–17.5 s · the Chancellor · the same close-up as in Q04',
         'She is still looking at the cup. Plain, a slight tremor in the middle of it: "I have grandchildren on the lower terraces."'),
        (c6, 'SHOT 5 · then the order',
         'Her eyes come up from the cup and her head turns a little toward Serath, behind her. Quiet and final: "Break it." The shot ends on the word.'),
        (c7, 'SHOT 6 · 17.5–22 s · Serath, the same close shot',
         'She does not answer at once. Then, measured, a bargain stated and not pleaded: "Give me until the evening bell." She holds, waiting. Q06 opens here, on the Hierophant\'s answer.'),
    ]
    sheet(cells, P('design/boards/Q05_board.jpg'))


if __name__ == '__main__':
    main()
