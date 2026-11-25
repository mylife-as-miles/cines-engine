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


def share_menu(ticks=(), send='off', press=None):
    """the share menu by name, for tools/handset_insert.py configs (edits/screen_Q10.json)"""
    return ui(tuple(ticks), send, press)


# --- A10: "A drawing app. Half a page of sketched boots. Hers. The laces unfinished." ---------------------------------
# Two studies of a combat boot in pencil, side view, across the top half of a page: the first drawn out (toe cap,
# seams, tread, eyelets) with its laces through the lower eyelets only, the upper ones left empty; the second with no
# laces at all yet. Hers: the sole drawn coming away at the toe (A07, "Rubber coming loose from one sole"). The strokes
# are heavy for a drawing app, because the display is ~140 px wide in the shot: a real pencil weight would vanish.
# The app is only chrome: toolbar icons and the time, no words.

def _spline(pts, n=14):
    """Catmull-Rom through the points: a pencil line, not a polygon"""
    p = np.array(pts, np.float32)
    p = np.vstack([p[0], p, p[-1]])
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(p[-2])
    return np.array(out)


# one boot facing left in a 300 x 300 box (y down)
BOOT = {
    'outline': [(20, 262), (150, 263), (280, 262), (285, 238), (282, 200), (276, 150), (272, 90), (270, 42),
                (236, 28), (201, 32), (197, 80), (192, 140), (160, 166), (110, 190), (60, 209), (31, 227), (18, 246),
                (20, 262)],
    'midsole': [(17, 247), (90, 249), (200, 249), (286, 247)],
    'heel': [(226, 249), (223, 262)],
    'toecap': [(100, 248), (93, 216), (72, 200)],
    'vamp': [(152, 248), (172, 196), (192, 152)],
    'collar': [(204, 50), (236, 46), (266, 56)],
    'tab': [(270, 42), (277, 28), (283, 44)],
    'loose_sole': [(20, 262), (44, 271), (78, 268), (104, 263)],
}
EYELETS = [(199, 50 + k * 16) for k in range(6)]                   # down the front of the shaft


def _boot(strokes, ox, oy, s, laces=0, weight=1.0):
    T = lambda pts: [(ox + x * s, oy + y * s) for x, y in pts]
    strokes.append((_spline(T(BOOT['outline'])), 1.0 * weight))
    strokes.append((_spline(T(BOOT['midsole'])), 0.85 * weight))
    for k in ('heel', 'toecap', 'vamp', 'collar', 'tab'):
        strokes.append((_spline(T(BOOT[k])), 0.75 * weight))
    if laces:                                                         # hers: the sole coming away at the toe
        strokes.append((_spline(T(BOOT['loose_sole'])), 0.8 * weight))
    for x in range(34, 280, 18):                                      # tread
        strokes.append((np.array(T([(x, 262), (x + 5, 254)])), 0.6 * weight))
    pts = [(ox + (x - 1.0 * i) * s, oy + y * s) for i, (x, y) in enumerate(EYELETS)]
    ang = np.linspace(0, 2 * np.pi, 13)
    for cx, cy in pts:                                                # eyelets
        strokes.append((np.c_[cx + 5 * s * np.cos(ang), cy + 5 * s * np.sin(ang)], 0.8 * weight))
    for i in range(len(pts) - 1 - laces, len(pts) - 1):              # laces: only the lowest `laces` crossings
        (x1, y1), (x2, y2) = pts[i], pts[i + 1]
        strokes.append((np.array([(x2 - 3 * s, y2), (x1 - 14 * s, y1 - 3 * s)]), 0.95 * weight))
        strokes.append((np.array([(x1 - 3 * s, y1), (x2 - 14 * s, y2 - 3 * s)]), 0.95 * weight))
    for k in range(6):                                                # hatching down the back of the shaft
        y = 80 + k * 26
        strokes.append((np.array(T([(254, y), (270, y - 12)])), 0.5 * weight))


def boot_sketch(time='13:29', w=540, h=1052):
    S = 2                                                             # drawn at twice the size, then reduced
    W2, H2 = w * S, h * S
    im = Image.new('RGB', (W2, H2), (244, 243, 239))                  # the page
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W2, 150 * S), fill=(228, 229, 233))            # the app's bar
    d.text((36 * S, 22 * S), time, font=font('SemiBold', 28 * S), fill=INK)
    d.rounded_rectangle((452 * S, 28 * S, 498 * S, 50 * S), 5 * S, outline=INK, width=3 * S)
    d.rectangle((456 * S, 32 * S, 476 * S, 46 * S), fill=INK)
    y = 104 * S                                                       # toolbar: back, pencil (chosen), eraser, undo
    d.line([(44 * S, y), (30 * S, y + 14 * S), (44 * S, y + 28 * S)], fill=INK, width=4 * S, joint='curve')
    d.rounded_rectangle((150 * S, y - 6 * S, 206 * S, y + 34 * S), 10 * S, fill=(205, 212, 226))
    d.polygon([(162 * S, y + 26 * S), (190 * S, y - 2 * S), (197 * S, y + 5 * S), (169 * S, y + 33 * S)], fill=INK)
    d.rounded_rectangle((246 * S, y + 4 * S, 282 * S, y + 26 * S), 4 * S, outline=INK, width=3 * S)
    d.arc((340 * S, y, 372 * S, y + 32 * S), 200, 470, fill=INK, width=4 * S)
    d.polygon([(338 * S, y + 6 * S), (350 * S, y + 2 * S), (344 * S, y + 14 * S)], fill=INK)
    d.ellipse((440 * S, y + 2 * S, 470 * S, y + 32 * S), fill=(60, 62, 68))   # the pencil's colour
    # the sketch: graphite strokes, each drawn twice with a little jitter, darkness accumulating like pencil
    rng = np.random.default_rng(10)
    strokes = []
    _boot(strokes, 8, 236, 0.82, laces=3)                              # the first study, laces through the lower three
    _boot(strokes, 278, 214, 0.82, laces=0, weight=0.8)                # the second, no laces yet
    dark = np.zeros((H2, W2), np.float32)
    for pts, weight in strokes:
        for _ in range(2):
            layer = Image.new('L', (W2, H2), 0)
            ImageDraw.Draw(layer).line([tuple(p) for p in (pts + rng.normal(0, 0.7, pts.shape)) * S],
                                       fill=int(255 * min(1, weight) * 0.72), width=int(4.5 * S), joint='curve')
            a = np.asarray(layer, np.float32) / 255
            dark = 1 - (1 - dark) * (1 - a)
    page = np.asarray(im, np.float32) / 255
    graphite = np.array([0.30, 0.30, 0.33], np.float32)
    page = page * (1 - dark[..., None]) + graphite * dark[..., None]
    out = Image.fromarray((page * 255 + .5).astype(np.uint8)).resize((w, h), Image.LANCZOS)
    return np.asarray(out, np.float32) / 255
