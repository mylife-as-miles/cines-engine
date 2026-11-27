#!/usr/bin/env python3
"""Free corrections to Q08's four shot plates, each as a separate copy. Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/fix_plates_q08.py
        ->  refs/candidates/E08A_t1a_crop.jpg, E08B_t1a_fixed.jpg, E08C_t1a_fixed.jpg, E08D_t1a_fixed.jpg

The plates as generated (refs/candidates/E08?_t1a.jpg) are left as they were.

  A  the landing     came back as drawn but wider: Serath is a fifth of the frame tall, and a knee that buckles would be
                     a few pixels at 480p. Cropped to 76 % (from the full-size image), so that she is a third of it.
  B  the spear       a sailing boat with a mast stands on the plain, seen through a gateway behind the farmer. Painted
                     out: each row of the opening is bridged from its own sky, hills and ground.
  C  Karst's door    the camera came back inside the doorway looking out: behind him an arch full of bright sky, a castle
                     with battlements and a balloon. Everything seen through the arch is made the black inside of the
                     door, as the shot was drawn. He is cut out by GrabCut from a hand-drawn outline; a colour key failed
                     (the sky and the pale ground are as warm as his coat).
  D  the collar      the fort and its arched door are readable behind her, though she is walking toward that door. The
                     background is thrown further out of focus and the right side taken down, so that it is only grey
                     and dark.
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
luma = lambda a: a @ np.array([0.299, 0.587, 0.114], np.float32)
K = 2048 / 1500.0                                                   # positions below were read off a 1500-wide viewing copy


def load(code):
    return np.asarray(Image.open(P(f'refs/candidates/{code}_t1a.jpg')).convert('RGB')).astype(np.float32) / 255


def save(a, name):
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(P('refs/candidates', name), quality=95); print('wrote refs/candidates/' + name, a.shape[1::-1])


def poly(shape, pts, feather):
    m = Image.new('L', (shape[1], shape[0]), 0); ImageDraw.Draw(m).polygon([(x * K, y * K) for x, y in pts], fill=255)
    return ndimage.gaussian_filter(np.asarray(m).astype(np.float32) / 255, feather)


def plate_a():
    full = P('out/refs/E08A_t1a.png')
    im = Image.open(full if os.path.exists(full) else P('refs/candidates/E08A_t1a.jpg')).convert('RGB'); s = im.width / 2048.0
    im = im.crop((int(300 * s), int(130 * s), int(1860 * s), int(799 * s))).resize((2048, 878), Image.LANCZOS)
    im.save(P('refs/candidates/E08A_t1a_crop.jpg'), quality=95); print('wrote refs/candidates/E08A_t1a_crop.jpg', im.size)


def plate_b():
    a = load('E08B'); out = a.copy(); l = luma(a)
    x0, y0, y1 = 1630, 258, 456                                                     # the boat, its mast and its trestle, inside the gateway's opening
    edge = l[y0 - 22:y0 - 6, 1700:1840].mean(0); x1 = 1700 + int(np.argmax(edge < 0.5 * edge[:20].mean()))   # where the opening meets its right jamb, read above the boat
    left = ndimage.gaussian_filter(a[y0:y1, x0 - 9:x0 - 2].mean(1, keepdims=True), (2, 0, 0))                # each row's own sky, hill or ground, from the clear side
    fill = np.repeat(left, x1 - x0, 1) + ndimage.gaussian_filter(np.random.default_rng(2).normal(0, 0.012, (y1 - y0, x1 - x0, 1)).astype(np.float32), (1.2, 1.2, 0))
    m = np.zeros(a.shape[:2], np.float32); m[y0:y1, x0:x1] = 1
    m = ndimage.gaussian_filter(m, 2.5); m[:, x1:] = 0                                                       # soft into the sky and ground, hard at the jamb
    out = out * (1 - m[..., None]); out[y0:y1, x0:x1] += fill * m[y0:y1, x0:x1, None]
    r = (slice(y0 - 9, y1 + 9), slice(x0 - 9, x0)); out[r] = out[r] + a[r] * 0                                # (the feather outside the box keeps the picture's own pixels)
    edge_m = m.copy(); edge_m[y0:y1, x0:x1] = 0; out += a * edge_m[..., None]
    save(out, 'E08B_t1a_fixed.jpg')


def cut_out(a, sure, maybe, rounds=6):
    """A person's matte by GrabCut: `sure` is well inside them, `maybe` is a generous outline; everything else is background."""
    import cv2
    m = np.full(a.shape[:2], cv2.GC_BGD, np.uint8); m[maybe > 0.5] = cv2.GC_PR_FGD; m[sure > 0.5] = cv2.GC_FGD
    img = (np.clip(a, 0, 1) * 255).astype(np.uint8)[..., ::-1].copy()
    cv2.grabCut(img, m, None, np.zeros((1, 65)), np.zeros((1, 65)), rounds, cv2.GC_INIT_WITH_MASK)
    fg = (m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD)
    fg = ndimage.binary_fill_holes(ndimage.binary_opening(fg, iterations=2))
    lab, n = ndimage.label(fg)
    return lab == (1 + int(np.argmax(ndimage.sum(fg, lab, range(1, n + 1)))))


def plate_c():
    a = load('E08C'); H, W = a.shape[:2]
    sure = poly(a.shape, [(596, 100), (630, 90), (662, 102), (672, 128), (672, 200), (666, 225), (756, 302), (796, 470), (770, 560), (764, 643), (486, 643), (474, 470), (522, 302), (596, 232), (580, 180), (580, 125)], 1.0)   # his hair is as dark as the arch: it is given, not guessed
    maybe = poly(a.shape, [(628, 76), (590, 90), (568, 125), (566, 180), (585, 238), (540, 250), (490, 282), (455, 400), (446, 450), (456, 480), (495, 560), (498, 643),
                           (770, 643), (776, 555), (812, 485), (834, 448), (822, 400), (788, 285), (730, 250), (680, 238), (696, 180), (696, 125), (672, 90)], 1.0)
    man = cut_out(a, sure, maybe)
    l = luma(a); head = poly(a.shape, [(556, 76), (706, 76), (706, 246), (556, 246)], 1.0) > 0.5
    man &= ~ndimage.binary_dilation(head & (l > 0.46) & (a[..., 0] - a[..., 2] < 0.035), iterations=2)    # pale cool wall left beside his temple: his skin is warmer and his hair darker (measured)
    keep = poly(a.shape, [(0, 0), (690, 0), (688, 200), (700, 236), (745, 250), (800, 290), (840, 448), (802, 474), (767, 540), (763, 643), (0, 643)], 1.0) > 0.5
    man &= keep                                                                                         # and pale ground left beside his coat: his right-hand outline, drawn
    man = ndimage.binary_opening(man, iterations=2)
    zone = poly(a.shape, [(452, 0), (452, 643), (1102, 643), (1102, 0)], 1.0) > 0.5                     # between the door's leaves: where the arch shows through
    bg = zone & ~ndimage.binary_erosion(man, iterations=1)                                              # everything there but him: sky, castle, balloon, pale ground
    bg = ndimage.binary_closing(np.pad(bg, 6, mode='edge'), iterations=3)[6:-6, 6:-6]                   # (padded, so the frame's own edge is not left out)
    m = ndimage.gaussian_filter(bg.astype(np.float32), 1.3)[..., None]
    inside = np.array([0.018, 0.019, 0.022], np.float32) + 0.006 * ndimage.gaussian_filter(np.random.default_rng(5).normal(0, 1, (H, W, 1)).astype(np.float32), (8, 8, 0))
    save(a * (1 - m) + inside * m, 'E08C_t1a_fixed.jpg')


def plate_d():
    a = load('E08D')
    sure = poly(a.shape, [(545, 0), (962, 0), (968, 60), (935, 330), (980, 450), (1150, 540), (1260, 643), (520, 643), (560, 580), (690, 520), (640, 440), (600, 380), (560, 280), (540, 60)], 1.0)   # her hair is as dark as the rock above it: it is given, not guessed
    maybe = poly(a.shape, [(505, 0), (510, 160), (525, 300), (575, 400), (600, 470), (662, 548), (505, 560), (438, 643), (1330, 643), (1316, 584), (1175, 500), (1015, 430), (968, 340), (1002, 150), (992, 0)], 1.0)
    her = ndimage.gaussian_filter(cut_out(a, sure, maybe).astype(np.float32), 1.6)
    w = (1 - np.clip(ndimage.gaussian_filter(her, 3) * 3, 0, 1))[..., None]                             # the background only: she is kept out of the blur, so she does not bleed into it
    s = 17.0
    soft = ndimage.gaussian_filter(a * w, (s, s, 0)) / np.maximum(ndimage.gaussian_filter(w, (s, s, 0)), 1e-3)
    xx = np.arange(a.shape[1], dtype=np.float32)[None, :, None]
    soft = soft * (1 - 0.28 * np.clip((xx - 1250) / 500.0, 0, 1))                                       # the fort's side taken down
    m = her[..., None]
    save(a * m + soft * (1 - m), 'E08D_t1a_fixed.jpg')


if __name__ == '__main__':
    plate_a(); plate_b(); plate_c(); plate_d()
