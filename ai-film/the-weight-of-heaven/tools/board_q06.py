#!/usr/bin/env python3
"""Q06 (the council: "Until the bell"; Cassiel; the seal; she goes) storyboard and its opening frame. Nothing generated.

Drawn over the film's own frames wherever the film already has the set-up: Q05 take 1's last frame (where Q06 opens,
Serath's close shot) and its close-up of the Hierophant. The door with Cassiel is new: his sheet and Serath's over the
council chamber reference, staging sketches. The seal is a stand-in: the film's earlier seal shot, to show the kind of
insert meant; the seal here is the Council's, not Serath's ring.

    /root/leonxlnx/earshot/.venv/bin/python tools/board_q06.py

Writes
  refs/frames/Q06_open_serath.jpg   Q05 take 1's last frame, at twice its size: shot 1 opens on it (sent as a reference)
  design/boards/Q06_board.jpg       the storyboard, seven frames (six shots)
"""
import importlib.util, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('b4', P('tools/board_q04.py')); b4 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b4)
W, H = b4.W, b4.H
img, arr, note, arrow, GOLD, INK, PAPER, BOLD, REG = b4.img, b4.arr, b4.note, b4.arrow, b4.GOLD, b4.INK, b4.PAPER, b4.BOLD, b4.REG


def frame(path, n):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', P(path), '-vf', f"select='eq(n,{n})'", '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                       capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.uint8).reshape(H, W, 3).astype(np.float32) / 255


def door(x0, y0, x1, man, serath=None, serath_h=None):
    """The door in the right-hand wall of ENV_E02, from inside the room, with Cassiel beside it on its left.
    x0, y0, x1 are in the 1800-wide copy of the reference; man is his height in frame pixels. In Q04's wide he stands
    about six tenths as tall as the door."""
    k = W / (x1 - x0)
    fx = lambda x: (x - x0) * k
    fy = lambda y: (y - y0) * k
    a = b4.chamber(x0, y0, x1)
    foot = fy(598)
    if serath is not None:                                                         # behind him in the picture when she is in the doorway
        a = b4.over(a, b4.cut('serath', 1), cx=fx(serath), foot=foot + (6 if serath < 1560 else -4), height=serath_h)
    cx = fx(1492)
    a = b4.over(a, b4.cut('cassiel', 0), cx=cx, foot=foot + 4, height=man)
    a = b4.head(a, cx, foot + 4 - man - man * 0.125, man * 0.155, b4.skin_of('cassiel'), (0.62, 0.62, 0.63))
    return a


def sheet(cells, path):
    f1 = ImageFont.truetype(BOLD, 20); f2 = ImageFont.truetype(REG, 17); f0 = ImageFont.truetype(BOLD, 24)
    pad, cap, gap, hd = 16, 104, 14, 86
    rows = (len(cells) + 1) // 2
    S = Image.new('RGB', (pad * 2 + W * 2 + gap, hd + rows * (H + cap) + pad), INK)
    d = ImageDraw.Draw(S)
    d.text((pad, 14), 'THE WEIGHT OF HEAVEN  ·  Q06  ·  THE COUNCIL: UNTIL THE BELL  ·  storyboard  ·  22 s, six shots', fill=GOLD, font=f0)
    d.text((pad, 48), 'Frames 1, 3 and 4 are the film\'s own (Q05 take 1): the same set-ups come back. The door is new: sheets over the chamber '
                      'reference, staging sketches. Frame 5 is a stand-in from the film\'s first seal.', fill=PAPER, font=f2)
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
    last = frame('out/takes/Q05_t1.mp4', 552)
    img(last).resize((W * 2, H * 2), Image.LANCZOS).save(P('refs/frames/Q06_open_serath.jpg'), quality=95)
    print('wrote refs/frames/Q06_open_serath.jpg')
    hier = frame('out/takes/Q05_t1.mp4', 250)
    seal = frame('out/edits/I_bell_v8.mp4', 700)
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    seal = arr(img(seal[top:top + band]).resize((W, H), Image.LANCZOS))            # the film's frame without its matte

    c1 = img(last); d = ImageDraw.Draw(c1)
    note(d, (36, 34), 'where Q05 ended: she is waiting for her answer')
    note(d, (36, 64), 'his voice, off-screen:  "Until the bell."')
    note(d, (36, 380), 'her lips stay closed; she lets a breath go')

    c2 = img(door(1010, 262, 1790, 232)); d = ImageDraw.Draw(c2)
    note(d, (36, 34), 'his voice goes on, off-screen, over the man it names:')
    note(d, (36, 64), '"If it finds the Weir standing, the fleet is Vice Admiral Cassiel\'s."')
    note(d, (36, 380), 'he does not move; the camera comes slowly toward him')
    arrow(d, (330, 300), (470, 300), w=3)

    c3 = img(hier); d = ImageDraw.Draw(c3)
    note(d, (36, 34), 'slowly, for the first time, he turns his head to her')
    arrow(d, (430, 120), (300, 120), w=4)
    note(d, (36, 380), 'warmly:  "Remember who raised you."')

    c4 = img(last); d = ImageDraw.Draw(c4)
    note(d, (36, 34), 'she takes it as a blessing: one small bow of the head')
    arrow(d, (520, 250), (760, 250), w=4); note(d, (520, 280), 'then she goes, out of the frame')
    note(d, (36, 380), 'no words. We cut on her movement')

    c5 = img(seal); d = ImageDraw.Draw(c5)
    note(d, (36, 34), 'STAND-IN (the film\'s first seal): the kind of insert, not this seal')
    note(d, (36, 380), 'the order is written; the Council\'s seal goes into red wax')

    c6 = img(door(1160, 318, 1790, 330, serath=1600, serath_h=372)); d = ImageDraw.Draw(c6)
    note(d, (36, 34), 'the same view of the door, closer. She crosses to it')
    note(d, (36, 380), 'now that it is sealed, he inclines his head to her')

    c7 = img(door(1160, 318, 1790, 330, serath=1668, serath_h=250)); d = ImageDraw.Draw(c7)
    note(d, (36, 34), 'she does not look at him. She goes')
    note(d, (36, 380), 'he straightens and faces the room again')

    cells = [
        (c1, 'SHOT 1 · 0–2.6 s · Serath, her close shot · the same frame Q05 ended on',
         'Opens exactly on Q05\'s last frame (sent as a reference). She is waiting. His answer comes from off-screen: "Until the bell." Her lips stay closed; her shoulders ease a little.'),
        (c2, 'SHOT 2 · 2.6–7.6 s · Cassiel at the door · 40 mm, a slow push in',
         'New set-up. One still figure on a third, framed by the door, the room empty where he faces, while the Hierophant\'s voice names him: "If it finds the Weir standing, the fleet is Vice Admiral Cassiel\'s." Cassiel never speaks in the film.'),
        (c3, 'SHOT 3 · 7.6–11.6 s · the Hierophant · the same close-up as in Q04 and Q05',
         'His only words on screen, and the only time he looks at her. Frontal and centred, as Villeneuve holds the ones in authority; then one slow turn of the head to her, and warmly: "Remember who raised you."'),
        (c4, 'SHOT 4 · 11.6–14.4 s · Serath, the same close shot',
         'She does not hear it as a warning. She bows her head once, as an officer does, turns and walks out of the frame toward the door. The cut to the seal comes on her movement.'),
        (c5, 'SHOT 5 · 14.4–16.6 s · insert: the seal',
         'Hands only, as when she sealed the lifting warrant at the wedding. A gloved hand presses the Council\'s seal into red wax at the foot of the written order and lifts it away. The order is real now.'),
        (c6, 'SHOT 6 · 16.6–22 s · the door, the same view as shot 2, closer',
         'Serath is crossing to the door, her back to us. Cassiel has been watching the table, where the order was sealed; his eyes come to her and, as she reaches him, he inclines his head, perfectly courteous.'),
        (c7, 'SHOT 6 · she goes',
         'She passes without a look and walks away from us into the brightness of the doorway. He straightens, hands still behind his back, and faces the room. The last frame: Cassiel alone by the door.'),
    ]
    sheet(cells, P('design/boards/Q06_board.jpg'))


if __name__ == '__main__':
    main()
