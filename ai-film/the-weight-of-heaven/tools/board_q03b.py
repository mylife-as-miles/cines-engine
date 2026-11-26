#!/usr/bin/env python3
"""Q03B storyboard and continuity frames, made from Q03A take 2's own frames and the relit plate. Nothing generated.

The boards are drawn over real frames of the film so far, so framing, light and geography are the ones the next
generation has to join. Painted parts (the slab, the dust, the running figures, the arrows) are sketches.

Writes
  refs/frames/Q03B_open_anvil.jpg       shot 1's first frame: the Anvil as Q03A left it, the farmer small before it
  refs/frames/Q03B_open_daughter.jpg    shot 2's first frame: the daughter at the wall with the bowl
  design/boards/Q03B_board_v2.jpg       the storyboard
"""
import importlib.util, io, math, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('fx', P('tools/fix_q03a_t2.py')); fx = importlib.util.module_from_spec(spec); spec.loader.exec_module(fx)
W, H = 992, 432
RAW, FIXED = P('out/takes/Q03A_t2.mp4'), P('out/edits/Q03A_t2_fixed.mp4')
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; REG = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
GOLD, INK, PAPER = (214, 170, 96), (16, 17, 20), (232, 232, 232)
rng = np.random.default_rng(11)


def grab(path, n):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f"select='eq(n,{n})'", '-vsync', '0', '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'],
                       capture_output=True)
    return np.asarray(Image.open(io.BytesIO(p.stdout)).convert('RGB')).astype(np.float32) / 255


def img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def arr(im):
    return np.asarray(im.convert('RGB')).astype(np.float32) / 255


def cloud(shape, cx, cy, rx, ry, seed, n=26):
    """A soft dust cloud: many blurred discs. Returns an alpha map 0..1."""
    r = np.random.default_rng(seed)
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for _ in range(n):
        x = cx + r.normal(0, rx * 0.45); y = cy + r.normal(0, ry * 0.40); s = r.uniform(0.25, 0.6) * min(rx, ry)
        d.ellipse((x - s * 1.5, y - s, x + s * 1.5, y + s), fill=int(r.uniform(150, 255)))
    return np.asarray(m.filter(ImageFilter.GaussianBlur(9))).astype(np.float32) / 255


def arrow(d, a, b, col=GOLD, w=4):
    d.line([a, b], fill=col, width=w)
    ang = math.atan2(b[1] - a[1], b[0] - a[0]); L = 16
    d.polygon([b, (b[0] - L * math.cos(ang - 0.45), b[1] - L * math.sin(ang - 0.45)), (b[0] - L * math.cos(ang + 0.45), b[1] - L * math.sin(ang + 0.45))], fill=col)


def note(d, xy, text, size=17):
    f = ImageFont.truetype(BOLD, size)
    x, y = xy; w = d.textlength(text, font=f)
    d.rectangle((x - 5, y - 3, x + w + 5, y + size + 5), fill=(0, 0, 0))
    d.text((x, y), text, fill=GOLD, font=f)


# ------------------------------------------------------------------ the two opening frames (also sent as references)
def open_anvil():
    """Raw shot 5 with its small farmer kept and the over-the-shoulder head removed (the cliff mirrored across), the mass put back."""
    raw = grab(RAW, 380)
    clean = fx.paint_out(raw)                              # the source for the mirrored half has no man in it
    ax = 520
    out = raw.copy()
    xs = np.arange(ax, W)
    out[:, ax:] = clean[:, (2 * ax - xs).clip(0, W - 1)]
    seam = fx.smooth(np.arange(W, dtype=np.float32), ax - 14, ax + 14)[None, :, None]
    out = raw * (1 - seam) + out * seam
    s1 = grab(RAW, 36)
    lid, a = fx.make_lid(s1, y_solid=14, y_end=44, soft=2.5, tone=0.23, flip=False, slope=6)
    return np.clip(fx.add_lid(out, lid, a, 0.33, 0.48), 0, 1)


def open_daughter():
    return grab(FIXED, 178)


# ------------------------------------------------------------------ shot 1: the face lets go
SLAB = (585, 80, 800, 262)       # the part of the face that leaves: x0, y0, x1, y1


def slab_mask(grow=0, soft=5):
    """The outline of the slab: an irregular column of the cliff, soft-edged."""
    x0, y0, x1, y1 = SLAB
    r = np.random.default_rng(8)
    left = [(x0 - grow + r.uniform(-7, 7), y) for y in range(y0, y1 + 1, 18)]
    right = [(x1 + grow + r.uniform(-9, 9), y) for y in range(y1, y0 - 1, -18)]
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(left + right, fill=255)
    return np.asarray(m.filter(ImageFilter.GaussianBlur(soft))).astype(np.float32)[..., None] / 255


def scarred(plate, amount=1.0):
    m = slab_mask() * amount
    return plate * (1 - m) + (plate * 1.55 + 0.07) * m          # paler, fresh rock where the slab was


def slab_leaving(plate):
    x0, y0, x1, y1 = SLAB
    m = slab_mask()
    out = scarred(plate, 0.9)
    dy, dx = 52, 9                                               # the slab itself, dropped and leaning out
    piece = np.roll(plate, (dy, dx), axis=(0, 1)); pm = np.roll(m, (dy, dx), axis=(0, 1))
    pm[:y0 + dy - 6] = 0
    out = out * (1 - pm) + piece * 0.92 * pm
    dust = np.clip(cloud((H, W), (x0 + x1) / 2, y0 + 26, 120, 22, 3, n=18) * 0.7 + cloud((H, W), (x0 + x1) / 2, y1 + 34, 135, 22, 4, n=20) * 0.85, 0, 1)
    col = np.array([0.60, 0.585, 0.56], dtype=np.float32)
    out = out * (1 - dust[..., None] * 0.8) + col * dust[..., None] * 0.8
    im = img(out); d = ImageDraw.Draw(im)
    d.line([(x0 - 2, y0 + 6), (x0 + 5, y0 + 60), (x0 - 4, y0 + 120), (x0 + 3, y1 - 6)], fill=(8, 8, 10), width=3)      # the crack
    arrow(d, ((x0 + x1) // 2 + 20, y0 + 74), ((x0 + x1) // 2 + 28, y1 + 22))
    note(d, (x1 - 190, y0 + 34), 'a slab the height of the cliff')
    return im


def dust_rolls(plate):
    out = scarred(plate, 1.0)
    dust = np.clip(cloud((H, W), 640, 300, 330, 60, 5, n=60) * 1.1 + cloud((H, W), 690, 215, 170, 70, 6, n=40) * 0.9, 0, 1)
    col = np.array([0.60, 0.585, 0.56], dtype=np.float32)
    a = out * (1 - dust[..., None] * 0.92) + col * dust[..., None] * 0.92
    im = img(a); d = ImageDraw.Draw(im)
    arrow(d, (560, 305), (470, 372)); arrow(d, (700, 315), (700, 392)); arrow(d, (850, 305), (930, 372))
    note(d, (520, 395), 'the dust rolls out toward us')
    arrow(d, (372, 352), (425, 380), col=PAPER, w=3)
    note(d, (150, 300), 'he turns and runs for her')
    return im


# ------------------------------------------------------------------ shot 2: he has the girl
def runner_blur(base, box, lean=0.25, seed=1):
    """A dark figure coming through the frame fast: a smeared silhouette."""
    x0, y0, x1, y1 = box
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    cx = (x0 + x1) / 2
    d.ellipse((cx + 30, y0, cx + 100, y0 + 80), fill=255)                                        # head
    d.polygon([(x0 + 20, y1), (cx - 20, y0 + 70), (cx + 110, y0 + 60), (x1, y0 + 210), (x1 - 30, y1)], fill=255)   # bent back and body
    d.polygon([(cx + 70, y0 + 120), (x1 + 120, y0 + 200), (x1 + 110, y0 + 245), (cx + 40, y0 + 190)], fill=255)    # the arm reaching
    m = m.filter(ImageFilter.GaussianBlur(7)).filter(ImageFilter.BoxBlur(14))
    a = arr(base); k = (np.asarray(m).astype(np.float32) / 255)[..., None] * 0.93
    return img(a * (1 - k) + np.array([0.05, 0.055, 0.065], dtype=np.float32) * k)


def girl_taken(start):
    im = runner_blur(img(start), (150, 40, 520, 432))
    d = ImageDraw.Draw(im)
    arrow(d, (120, 250), (330, 250), w=5)
    d.arc((560, 170, 900, 420), 200, 320, fill=GOLD, width=5); arrow(d, (860, 232), (935, 262), w=5)
    note(d, (36, 196), 'he comes back into the frame at a run')
    note(d, (640, 110), 'one arm round her waist, and out')
    return im


def girl_waits(start):
    im = img(start); d = ImageDraw.Draw(im)
    arrow(d, (700, 196), (560, 120), col=PAPER, w=3)
    note(d, (360, 86), 'her eyes go up to the mountain')
    arrow(d, (640, 300), (575, 300)); note(d, (300, 318), 'she takes the bowl off the wall and holds it to her chest')
    return im


# ------------------------------------------------------------------ shot 3: the valley runs
def figure(d, cx, foot, h, col=(9, 10, 12, 255), child=False):
    """A running man seen from the front, bent forward, drawn on an RGBA layer (blurred afterwards). h = his height in px."""
    s = h / 300.0
    Q = lambda pts: [(cx + x * s, foot - y * s) for x, y in pts]
    E = lambda x, y, rx, ry: (cx + (x - rx) * s, foot - (y + ry) * s, cx + (x + rx) * s, foot - (y - ry) * s)
    d.polygon(Q([(-48, 122), (-6, 122), (-26, 0), (-58, 0)]), fill=col)                              # the leg that is down
    d.polygon(Q([(2, 122), (46, 122), (72, 46), (40, 30)]), fill=col)                               # the leg that is lifted
    d.polygon(Q([(-64, 232), (-30, 250), (32, 250), (66, 234), (50, 112), (-50, 110)]), fill=col)   # shoulders and trunk, leaning in
    d.polygon(Q([(60, 236), (98, 186), (88, 124), (62, 150)]), fill=col)                            # the free arm
    d.ellipse(E(4, 266, 25, 30), fill=col)                                                          # head, sunk between the shoulders
    if child:
        wool, skin, hair, wood = (38, 39, 43, 255), (132, 112, 100, 255), (120, 104, 82, 255), (146, 92, 56, 255)
        d.polygon(Q([(-176, 196), (-70, 214), (-52, 150), (-170, 128)]), fill=wool)                 # her body, carried level under his arm
        d.polygon(Q([(-60, 200), (20, 190), (40, 150), (-50, 150)]), fill=wool)                     # her legs behind his hip
        d.ellipse(E(-186, 176, 24, 26), fill=hair); d.ellipse(E(-190, 172, 17, 19), fill=skin)      # her head, turned to us
        d.ellipse(E(-128, 140, 30, 13), fill=wood)                                                  # the bowl, held to her chest
        d.polygon(Q([(-66, 236), (-110, 214), (-120, 160), (-84, 150), (-50, 176)]), fill=col)      # his arm over her


def valley_runs(late=False):
    plate = Image.open(P('refs/relit/ENV_E03_anvil-vale_low-light.jpg')).convert('RGB')
    plate = plate.crop((240, 150, 2440, 1108)).resize((W, H), Image.LANCZOS)
    a = arr(plate)
    amt = 1.0 if late else 0.75
    dust = np.clip(cloud((H, W), 420, 170, 420, 75, 21, n=70) * 1.15 + cloud((H, W), 430, 235, 500, 40, 22, n=60) * (1.1 if late else 0.6), 0, 1) * amt
    col = np.array([0.50, 0.49, 0.47], dtype=np.float32)
    a = a * (1 - dust[..., None] * 0.94) + col * dust[..., None] * 0.94
    im = img(a).convert('RGBA')
    far = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(far)
    for (x, f, h) in ((150, 268, 44), (215, 262, 36), (640, 272, 50), (700, 264, 38), (760, 270, 44), (60, 276, 52)):      # the valley's people, far back
        figure(d, x, f, h, col=(16, 17, 20, 255))
    im.alpha_composite(far.filter(ImageFilter.GaussianBlur(1.2)))
    near = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(near)
    figure(d, 520 if not late else 540, 540 if not late else 600, 460 if not late else 580, child=True)
    im.alpha_composite(near.filter(ImageFilter.GaussianBlur(3.2 if not late else 4.5)))
    im = im.convert('RGB')
    im = im.rotate(-2.2 if not late else 2.6, resample=Image.BICUBIC, center=(W / 2, H / 2)).crop((26, 18, W - 26, H - 18)).resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    if not late:
        note(d, (30, 28), 'HANDHELD: the camera runs backward ahead of him')
        note(d, (30, 372), 'she has the bowl')
        note(d, (640, 300), 'the whole valley is running')
    else:
        note(d, (30, 28), 'the sound arrives: the frame shakes')
        note(d, (640, 60), 'he does not look back')
    return im


# ------------------------------------------------------------------ the sheet
def sheet(cells, path):
    f1 = ImageFont.truetype(BOLD, 20); f2 = ImageFont.truetype(REG, 17); f0 = ImageFont.truetype(BOLD, 24)
    pad, cap, gap, head = 16, 96, 14, 86
    rows = (len(cells) + 1) // 2
    S = Image.new('RGB', (pad * 2 + W * 2 + gap, head + rows * (H + cap) + pad), INK)
    d = ImageDraw.Draw(S)
    d.text((pad, 14), 'THE WEIGHT OF HEAVEN  ·  Q03B  ·  THE MOUNTAIN LETS GO  ·  storyboard', fill=GOLD, font=f0)
    d.text((pad, 48), 'Drawn over real frames of Q03A take 2 and the relit Anvil Vale reference: the light and the places are the film\'s own. '
                      'The slab, the dust, the running figures and the arrows are sketches.', fill=PAPER, font=f2)
    for k, (im, title, text) in enumerate(cells):
        x = pad + (k % 2) * (W + gap); y = head + (k // 2) * (H + cap)
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
    anvil = open_anvil(); girl = open_daughter()
    img(anvil).save(P('refs/frames/Q03B_open_anvil.jpg'), quality=95)
    img(girl).save(P('refs/frames/Q03B_open_daughter.jpg'), quality=95)
    a0 = img(anvil); d = ImageDraw.Draw(a0)
    note(d, (36, 300), 'the farmer, small, his back to us'); arrow(d, (250, 330), (330, 356), col=PAPER, w=3)
    note(d, (560, 40), 'dust already sifting from the rim')
    cells = [
        (a0, 'SHOT 1 · 0–4.5 s · the face lets go · 85 mm, low, locked off',
         'Where Q03A ended: the Anvil fills the frame, the dark mass closes the top, the farmer is a small dark figure in the field with his hoe. Nothing moves but the dust on the rim.'),
        (slab_leaving(anvil), 'SHOT 1 · a crack, then a slab of the face leaves',
         'In silence. A crack runs down the cliff; a slab the height of the face leans out, hangs for a moment and drops, breaking as it falls. Cause first, then effect.'),
        (dust_rolls(anvil), 'SHOT 1 · the dust blooms and rolls toward us',
         'A pale scar where the slab was. Dust blooms at the foot of the mountain and starts across the field. He takes one step back, turns and runs toward the wall. Still no sound.'),
        (girl_waits(girl), 'SHOT 2 · 4.5–7 s · the daughter · 75 mm, her eye height, locked off',
         'The same frame Q03A left her in, at the wall with the bowl. Her eyes go up to the mountain. She takes the bowl off the wall in both hands and holds it to her chest.'),
        (girl_taken(girl), 'SHOT 2 · he has the girl under his arm before the sound arrives',
         'He comes back into the frame from the left at a run, bends, takes her round the waist under one arm and carries her out of the frame to the right. She keeps hold of the bowl.'),
        (valley_runs(False), 'SHOT 3 · 7–12 s · the valley runs · 28 mm, HANDHELD (the only handheld shot in the film)',
         'The camera runs backward ahead of him down the path. He runs straight at us, bent, his daughter under his arm, the bowl at her chest. Behind them the valley\'s people run from their houses and the dust wall comes over the field under the dark mass.'),
        (valley_runs(True), 'SHOT 3 · the sound arrives',
         'Two seconds in, the roar reaches them and the frame shakes harder. The dust has swallowed the mountain. He does not look back. Cut above: the bell\'s note, gloved applause, the gold cup perfectly still.'),
    ]
    sheet(cells, P('design/boards/Q03B_board_v2.jpg'))


if __name__ == '__main__':
    main()
