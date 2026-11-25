#!/usr/bin/env python3
"""The share menu shown on Helena's handset (script 60-64: INSERT - HANDSET SCREEN. "A share menu. Three folders:
NOTICES. APPOINTMENTS. RECORDINGS. Her thumb hovers. She ticks two." ... "She presses send.").

ui(ticks, send) returns the display as an RGB float image (W x H, portrait), drawn flat; tools/handset_insert.py
warps it onto the tracked display. Only the script's words are used: the three folder names, plus a "Share" title
and a "Send" button. It is a share sheet risen over the dimmed screen beneath. The rows sit where her thumb goes in
the take (tools/handset_insert.py logs it): NOTICES at half height, APPOINTMENTS below, RECORDINGS where the thumb
hovers, Send where it presses in the second shot. Tick circles sit on the left, because her thumb covers the right.
    ticks: rows ticked (0 NOTICES, 1 APPOINTMENTS, 2 RECORDINGS)
    send:  'off' (nothing ticked), 'on', 'pressed' or 'sent'
    press: the row being pressed (drawn a shade darker), or None
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 540, 980
FONT = '/usr/share/fonts/opentype/inter/Inter-{}.otf'
BG, CARD, LINE = (226, 228, 232), (246, 247, 249), (214, 216, 221)
INK, DIM = (34, 36, 42), (120, 124, 132)
BLUE, BLUE_DN, GREEN = (48, 104, 196), (32, 74, 150), (56, 136, 90)
FOLDERS = ['NOTICES', 'APPOINTMENTS', 'RECORDINGS']
ROW0, ROWH = 435, 110
SHEET = 330


def font(style, size):
    return ImageFont.truetype(FONT.format(style), size)


def ui(ticks=(), send='off', press=None, time='13:33'):
    im = Image.new('RGB', (W, H), (128, 131, 138))                               # the screen beneath, dimmed
    d = ImageDraw.Draw(im)
    for y in range(90, SHEET - 30, 64):                                           # its rows, out of focus behind the sheet
        d.rounded_rectangle((40, y, W - 40, y + 40), 12, fill=(138, 141, 148))
    d.text((40, 26), time, font=font('SemiBold', 30), fill=(236, 238, 242))
    d.rounded_rectangle((452, 32, 498, 54), 5, outline=(236, 238, 242), width=3)   # battery
    d.rectangle((456, 36, 480, 50), fill=(236, 238, 242))
    d.rounded_rectangle((0, SHEET, W, H + 40), 34, fill=BG)                        # the share sheet
    d.rounded_rectangle((W // 2 - 36, SHEET + 14, W // 2 + 36, SHEET + 22), 4, fill=(180, 183, 190))
    d.text((40, SHEET + 40), 'Share', font=font('Bold', 46), fill=INK)
    d.rounded_rectangle((24, ROW0, W - 24, ROW0 + 3 * ROWH), 24, fill=CARD)
    for k, name in enumerate(FOLDERS):
        y = ROW0 + k * ROWH
        if press == k:
            d.rounded_rectangle((24, y, W - 24, y + ROWH), 24 if k in (0, 2) else 0, fill=(226, 229, 235))
        if k:
            d.line((60, y, W - 24, y), fill=LINE, width=2)
        cy, cx = y + ROWH // 2, 72
        if k in ticks:
            d.ellipse((cx - 24, cy - 24, cx + 24, cy + 24), fill=BLUE)
            d.line([(cx - 11, cy + 1), (cx - 3, cy + 10), (cx + 12, cy - 9)], fill=(255, 255, 255), width=6, joint='curve')
        else:
            d.ellipse((cx - 24, cy - 24, cx + 24, cy + 24), outline=(150, 154, 162), width=4)
        fx = 118                                                                  # folder icon
        d.rounded_rectangle((fx, cy - 14, fx + 20, cy - 4), 3, fill=(96, 128, 186))
        d.rounded_rectangle((fx, cy - 9, fx + 42, cy + 18), 5, fill=(96, 128, 186))
        d.text((176, cy), name, font=font('SemiBold', 37), fill=INK, anchor='lm')
    by = ROW0 + 3 * ROWH + 46
    fill, txt, ink = {'off': ((196, 199, 204), 'Send', (140, 144, 150)), 'on': (BLUE, 'Send', (255, 255, 255)),
                      'pressed': (BLUE_DN, 'Send', (225, 230, 240)), 'sent': (GREEN, 'Sent', (255, 255, 255))}[send]
    d.rounded_rectangle((40, by, W - 40, by + 100), 50, fill=fill)
    d.text((W // 2, by + 50), txt, font=font('SemiBold', 44), fill=ink, anchor='mm')
    return np.asarray(im, np.float32) / 255


if __name__ == '__main__':
    import sys
    states = [ui(), ui((0,), 'on', press=0), ui((0, 1), 'on'), ui((0, 1), 'pressed'), ui((0, 1), 'sent')]
    sheet = np.hstack([np.pad(s, ((10, 10), (10, 10), (0, 0)), constant_values=0.1) for s in states])
    Image.fromarray((sheet * 255).astype(np.uint8)).resize((sheet.shape[1] // 2, sheet.shape[0] // 2)).save(sys.argv[1])
