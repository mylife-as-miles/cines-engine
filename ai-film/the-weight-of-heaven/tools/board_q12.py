#!/usr/bin/env python3
"""Q12, the hall: "Come down". Storyboard and reference sheets. Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/board_q12.py
        ->  design/boards/Q12_board.jpg (seven frames), design/boards/Q12A_refs.jpg and Q12B_refs.jpg (the references,
            in attach order)

Every frame is one the film's takes have already returned: the set-ups these takes go back to. The last is the hand
take, which the edit can play backwards. The dashed lines are the composition of each shot, drawn the way the author's
reference reel draws them. The takes are made from the references, not from these.
"""
import importlib.util, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)


def load(name):
    spec = importlib.util.spec_from_file_location(name, P('tools', name + '.py')); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


b11 = load('board_q11')
b4, W, H = b11.b4, b11.W, b11.H
img, note, arrow, part, GOLD, INK, PAPER, BOLD, REG = b11.img, b11.note, b11.arrow, b11.part, b11.GOLD, b11.INK, b11.PAPER, b11.BOLD, b11.REG
LINE = (255, 226, 60)
K_PLAIN, S_CLOSE, K_CLOSE = 'refs/frames/Q12_setup_karst_plain.jpg', 'refs/frames/Q12_setup_serath.jpg', 'refs/frames/Q12_setup_karst.jpg'
REFS_A = [(K_PLAIN, '@Image 1 · Karst before the plain', 'A frame of Q09 take 1 (a shot not in the cut): the view of shot 1'),
          ('refs/CHAR_C01_serath.jpg', '@Image 2 · SERATH', 'Approved sheet'),
          ('refs/CHAR_C02_karst.jpg', '@Image 3 · KARST', 'Approved sheet'),
          (S_CLOSE, '@Image 4 · her close shot', 'A frame of Q11 take 1: the view of shot 2')]
REFS_B = [('refs/CHAR_C01_serath.jpg', '@Image 1 · SERATH', 'Approved sheet'),
          ('refs/CHAR_C02_karst.jpg', '@Image 2 · KARST', 'Approved sheet'),
          (S_CLOSE, '@Image 3 · her close shot', 'A frame of Q11 take 1: the view of shots 2 and 4'),
          (K_CLOSE, '@Image 4 · his shot', 'A frame of Q11 take 1: the view of shots 1 and 3')]


def dash(d, a, b, n=26, w=2):
    (x0, y0), (x1, y1) = a, b
    for k in range(0, n, 2):
        d.line([(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n), (x0 + (x1 - x0) * (k + 1) / n, y0 + (y1 - y0) * (k + 1) / n)], fill=LINE, width=w)


def thirds(d, vertical=(1, 2), horizontal=()):
    for k in vertical:
        dash(d, (W * k / 3, 0), (W * k / 3, H))
    for k in horizontal:
        dash(d, (0, H * k / 3), (W, H * k / 3))


def still(path, lines):
    c = Image.open(P(path)).convert('RGB').resize((W, H), Image.LANCZOS); d = ImageDraw.Draw(c); lines(d); return c, d


def sheet(cells, path):
    f1 = ImageFont.truetype(BOLD, 20); f2 = ImageFont.truetype(REG, 17); f0 = ImageFont.truetype(BOLD, 24)
    pad, cap, gap, hd = 16, 134, 14, 86; cols = 3; rows = (len(cells) + cols - 1) // cols
    S = Image.new('RGB', (pad * 2 + W * cols + gap * (cols - 1), hd + rows * (H + cap) + pad), INK); d = ImageDraw.Draw(S)
    d.text((pad, 14), 'THE WEIGHT OF HEAVEN  ·  Q12  ·  the hall: "Come down"  ·  storyboard  ·  two takes: 13 s, then 19 s', fill=GOLD, font=f0)
    d.text((pad, 48), 'It follows "I read every one." and plays straight through: every line is spoken on camera. Dashed lines: the composition of each shot.', fill=PAPER, font=f2)
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


def main():
    def plain(d):
        dash(d, (0, H * 0.595), (W * 0.60, H * 0.595), n=20); dash(d, (W * 2 / 3, 0), (W * 2 / 3, H))
    a1, d = still(K_PLAIN, plain); note(d, (36, 22), 'a frame the film\'s takes have (Q09, a shot not in the cut): what he looks at fills the frame')
    a2, d = still(S_CLOSE, lambda d: thirds(d)); note(d, (36, 22), 'a frame the film has (Q11): her eyes are on his back')
    b1, d = still(K_CLOSE, lambda d: thirds(d)); note(d, (36, 388), 'a frame the film has (Q11); in the take his eyes are on her, low to the right')
    b2, d = still(S_CLOSE, lambda d: thirds(d)); note(d, (36, 22), 'the same set-up')
    b3, d = still(K_CLOSE, lambda d: thirds(d)); note(d, (36, 388), 'the same set-up')
    b4_, d = still(S_CLOSE, lambda d: thirds(d)); note(d, (36, 22), 'the same set-up: she has heard it, and says nothing')
    hand, d = still('refs/frames/Q11_setup_shard.jpg', lambda d: None)
    arrow(d, (350, 150), (300, 40), w=5); note(d, (36, 388), 'no take: the hand shot the film has, played backwards. Her hand lifts off the shard and is gone')
    cells = [
        (a1, 'TAKE A · SHOT 1 · 0–8.6 s · over his shoulder, to the plain',
         'He stands at the opening, his back to her. "That will carry you." A breath. "It is stone." A breath. "It has no children." Karst on the right third; the plain and the sky fill the rest; the horizon level, just under the middle.'),
        (a2, 'TAKE A · SHOT 2 · 8.6–13 s · Serath, right of centre',
         'She watches his back. Low and level: "And your price." She goes on watching.'),
        (b1, 'TAKE B · SHOT 1 · 0–7.9 s · Karst, on the left third',
         'His terms, as things already settled: "The fleet at anchor, colours struck." A breath. "And the lands that carry you are no longer yours."'),
        (b2, 'TAKE B · SHOT 2 · 7.9–11.9 s · Serath',
         'She states it; she does not plead: "You would have us fall."'),
        (b3, 'TAKE B · SHOT 3 · 11.9–16.6 s · Karst',
         'The gentlest thing he says: "No." A breath. "We would have you come down."'),
        (b4_, 'TAKE B · SHOT 4 · 16.6–19 s · Serath',
         'Neither speaks. We stay on her, hearing it.'),
        (hand, 'IN THE EDIT · FREE · the hand lifts',
         'The screenplay has her put her glove back on. Two hands working a glove is asking for trouble. Offered instead, at no cost: the bare hand leaves the shard. Yours to refuse.'),
    ]
    sheet(cells, P('design/boards/Q12_board.jpg'))
    b11.refs_sheet(REFS_A, 'design/boards/Q12A_refs.jpg'); b11.refs_sheet(REFS_B, 'design/boards/Q12B_refs.jpg')


if __name__ == '__main__':
    main()
