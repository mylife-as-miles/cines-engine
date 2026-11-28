#!/usr/bin/env python3
"""Q12, the hall: "Come down". Storyboard and reference sheets. Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/board_q12.py
        ->  design/boards/Q12_board.jpg (seven frames), design/boards/Q12A_refs.jpg and Q12B_refs.jpg (the references,
            in attach order)

Five of the seven frames are frames the film already has (the set-ups the takes return to); the sixth is a staging
sketch of the one new set-up; the seventh is the hand take, which the edit can play backwards. The dashed lines are the
composition of each shot, drawn the way the author's reference reel draws them. The takes are made from the references,
not from these.
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
K_OPEN, S_CLOSE, K_CLOSE, OPENING = 'refs/frames/Q12_setup_karst_opening.jpg', 'refs/frames/Q12_setup_serath.jpg', 'refs/frames/Q12_setup_karst.jpg', 'refs/crops/Q12_hall_opening.jpg'
REFS_A = [(K_OPEN, '@Image 1 · Karst at the opening', 'A frame of Q10 take 2: the view of shot 1'),
          ('refs/CHAR_C01_serath.jpg', '@Image 2 · SERATH', 'Approved sheet'),
          ('refs/CHAR_C02_karst.jpg', '@Image 3 · KARST', 'Approved sheet'),
          (S_CLOSE, '@Image 4 · her close shot', 'A frame of Q11 take 1: the view of shot 2')]
REFS_B = [(OPENING, '@Image 1 · the opening', 'A piece of the approved hall: seen in shot 4'),
          ('refs/CHAR_C01_serath.jpg', '@Image 2 · SERATH', 'Approved sheet'),
          ('refs/CHAR_C02_karst.jpg', '@Image 3 · KARST', 'Approved sheet'),
          (S_CLOSE, '@Image 4 · her close shot', 'A frame of Q11 take 1: the view of shot 2'),
          (K_CLOSE, '@Image 5 · his shot', 'A frame of Q11 take 1: the view of shots 1 and 3')]


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


def two_shot():
    """the one new set-up, sketched: her dark shoulder near the lens on the right third, Karst on the left third against the opening"""
    bg = b4.blur(part(OPENING, (0.278, 0.262, 0.978, 0.665), (W, H)), 2) * 0.85
    k = b4.cut('karst', 0).copy(); k[..., :3] *= 0.20                                    # his sheet's figure (it has no head), dark against the light
    a = b4.over(bg, k, cx=W * 0.36, foot=H * 1.313, height=H * 1.043)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    def lay(a, mask, tone, soft):
        m = b4.blur(mask.astype(np.float32)[..., None], soft)[..., 0][..., None]
        return a * (1 - m) + np.array(tone, np.float32) * m
    a = lay(a, ((xx - W * 0.36) / (W * 0.036)) ** 2 + ((yy - H * 0.232) / (H * 0.105)) ** 2 < 1, (0.045, 0.045, 0.05), 1.5)      # his head
    a = lay(a, (yy > H * 0.58) & (xx > W * 0.60 + (H - yy) * 0.28), (0.20, 0.20, 0.21), 12)                                     # her shoulder: the white coat, in the dark, out of focus
    a = lay(a, ((xx - W * 0.80) / (W * 0.105)) ** 2 + ((yy - H * 0.36) / (H * 0.34)) ** 2 < 1, (0.035, 0.035, 0.04), 12)        # the back of her head
    c = img(a); d = ImageDraw.Draw(c)
    dash(d, (W * 0.60, H), (W * 0.665, H * 0.60), n=10); dash(d, (W * 0.665, H * 0.60), (W * 0.70, H * 0.04), n=14)   # the edge of the near shoulder, as the reel draws it
    dash(d, (0, H * 0.615), (W * 0.62, H * 0.615), n=22)                                 # the horizon, low
    dash(d, (W / 3, 0), (W / 3, H))
    note(d, (36, 388), 'sketch of the one new set-up: her head and shoulder dark and soft, near the lens')
    return c


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
    a1, d = still(K_OPEN, lambda d: dash(d, (0, H * 0.52), (W * 0.47, H * 0.52), n=18)); note(d, (36, 388), 'a frame the film has (Q10 take 2): he looks out at the stone; this time his head is up')
    a2, d = still(S_CLOSE, lambda d: thirds(d)); note(d, (36, 22), 'a frame the film has (Q11): her eyes are on his back')
    b1, d = still(K_CLOSE, lambda d: thirds(d)); note(d, (36, 388), 'a frame the film has (Q11); in the take his eyes are on her, low to the right')
    b2, d = still(S_CLOSE, lambda d: thirds(d)); note(d, (36, 22), 'the same set-up')
    b3, d = still(K_CLOSE, lambda d: thirds(d)); note(d, (36, 388), 'the same set-up')
    hand, d = still('refs/frames/Q11_setup_shard.jpg', lambda d: thirds(d, vertical=(), horizontal=()))
    arrow(d, (350, 150), (300, 40), w=5); note(d, (36, 388), 'no take: the hand shot the film has, played backwards. Her hand lifts off the shard and is gone')
    cells = [
        (a1, 'TAKE A · SHOT 1 · 0–8.6 s · over his shoulder, to the stone',
         'He has turned from her to the opening. "That will carry you." A breath. "It is stone." A breath. "It has no children." We see what he sees; the horizon runs level through the middle.'),
        (a2, 'TAKE A · SHOT 2 · 8.6–13 s · Serath, right of centre',
         'She watches his back. Low and level: "And your price." She goes on watching. The empty left of the frame is where he stands.'),
        (b1, 'TAKE B · SHOT 1 · 0–7.2 s · Karst, on the left third',
         'His terms, as things already settled: "The fleet at anchor, colours struck." A breath. "And the bearing-lands are no longer yours."'),
        (b2, 'TAKE B · SHOT 2 · 7.2–10.8 s · Serath',
         'She states it; she does not plead: "You would have us fall."'),
        (b3, 'TAKE B · SHOT 3 · 10.8–15 s · Karst',
         'The gentlest thing he says: "No." A breath. "We would have you come down."'),
        (two_shot(), 'TAKE B · SHOT 4 · 15–19 s · over her shoulder: the two of them and the stone',
         'Neither speaks. The first frame of either talk that holds them both: her shoulder on the right third, Karst on the left third against the light, the horizon low. No words ride on it, so if it fails the scene still stands.'),
        (hand, 'IN THE EDIT · FREE · the hand lifts',
         'The screenplay has her put her glove back on. Two hands working a glove is asking for trouble. Offered instead, at no cost: the bare hand leaves the stone. Yours to refuse.'),
    ]
    sheet(cells, P('design/boards/Q12_board.jpg'))
    b11.refs_sheet(REFS_A, 'design/boards/Q12A_refs.jpg'); b11.refs_sheet(REFS_B, 'design/boards/Q12B_refs.jpg')


if __name__ == '__main__':
    main()
