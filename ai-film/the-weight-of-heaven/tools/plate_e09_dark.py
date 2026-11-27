#!/usr/bin/env python3
"""The hall of the Treaty House with its shutters closed: the approved reference, relit and repainted. Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/plate_e09_dark.py   ->  refs/relit/ENV_E09_treaty-house-hall_dark.jpg

`refs/ENV_E09_treaty-house-hall.jpg` shows the hall after Karst has opened the shutters (its own note: "the
closed-shutter state is the same room in the dark"). Q09 begins before that. The video model takes its light from the
environment reference more than from the words (lesson 41), so the dark state is made as a picture of the same room:

  shutters  the two plank leaves, copied from the reference's own left leaf, shut across the opening and in shadow; a
            hairline of daylight between them and under them.
  light     the pool of daylight on the floor is taken out (each area divided by its own local brightness), and one
            new light put in: grey daylight from the door to the yard, behind the camera on the left, falling off down
            the hall. The far end is the darkest. About two and a half stops under the reference at the treaty wall.
  floor     a further stop down, so that a white coat is the palest thing in the room (the independent review, finding 8).
  kept      every stone, beam, carved mark, paper and stone on the floor, where the reference has it.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
LUMA = np.array([0.299, 0.587, 0.114], np.float32)
# the opening in the far wall, in the reference's own pixels (3276 x 1404)
X0, X1, Y0, Y1 = 2352, 2632, 378, 832           # the recess the two leaves close
LEAF = (2360, 384, 2434, 826)                   # the reference's left leaf, seen nearly flat: the wood and its iron straps


def main():
    a = np.asarray(Image.open(P('refs/ENV_E09_treaty-house-hall.jpg')).convert('RGB')).astype(np.float32) / 255
    H, W = a.shape[:2]
    # ---- the shutters, closed: the left leaf's own planks, once as they are and once mirrored
    leaf = Image.fromarray((a[LEAF[1]:LEAF[3], LEAF[0]:LEAF[2]] * 255).astype(np.uint8))
    half = (X1 - X0) // 2
    lf = np.asarray(leaf.resize((half, Y1 - Y0), Image.LANCZOS)).astype(np.float32) / 255
    a[Y0:Y1, X0:X0 + half] = lf; a[Y0:Y1, X0 + half:X0 + 2 * half] = lf[:, ::-1]
    shut = np.zeros((H, W), np.float32); shut[Y0:Y1, X0:X1] = 1
    # ---- take the reference's light out: every area over its own local brightness
    l = a @ LUMA
    local = ndimage.gaussian_filter(l, 170)
    refl = a / (local[..., None] + 0.06)                                   # about 1 everywhere, with the texture kept
    refl = np.clip(refl, 0, 2.6)
    # ---- one new light: grey daylight from behind the camera, on the left, dying down the hall
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.hypot(xx + 300, yy - 1650)
    light = 0.21 * np.exp(-d / 1750.0) + 0.030
    light *= 1 - 0.55 * ndimage.gaussian_filter(shut, 60)                   # the far wall round the shutters is the darkest thing
    out = refl * light[..., None] * np.array([0.94, 0.98, 1.06], np.float32)   # cool
    out[Y0:Y1, X0:X1] *= 0.8                                                # the leaves themselves, in shadow
    from PIL import ImageDraw                                               # the floor a further stop down: its papers were as pale as a white coat would be in this light
    fl = Image.new('L', (W, H), 0)
    ImageDraw.Draw(fl).polygon([(0, 1200), (480, 1170), (790, 1120), (1920, 884), (3000, 884), (3276, 1220), (3276, 1404), (0, 1404)], fill=255)
    out *= (1 - 0.5 * ndimage.gaussian_filter(np.asarray(fl).astype(np.float32) / 255, 14))[..., None]
    # ---- daylight through the gaps: between the leaves, under them, a thread down each side
    gap = np.zeros((H, W), np.float32)
    cx = X0 + half
    rng = np.random.default_rng(9)
    wob = lambda n, s: ndimage.gaussian_filter1d(rng.normal(0, 1, n).astype(np.float32), s)       # a gap is never even: old wood
    n = Y1 - Y0; w1 = wob(n, 30); w1 = (w1 - w1.min()) / (w1.max() - w1.min()); x1 = wob(n, 60) * 6
    for k, y in enumerate(range(Y0 + 8, Y1)):                               # between the leaves: brightest, a little crooked
        x = int(round(cx + x1[k])); gap[y, x - 4:x + 4 + int(2 * w1[k])] = 0.55 + 0.45 * w1[k]      # eight to ten pixels: three at the take's 992
    m = X1 - X0; w2 = wob(m, 25); w2 = (w2 - w2.min()) / (w2.max() - w2.min())
    gap[Y1 - 6:Y1, X0 + 6:X1 - 6] = (0.35 + 0.65 * w2[6:m - 6])[None, :]    # under them
    w3 = wob(n, 18); w3 = np.clip((w3 - np.median(w3)) / (w3.max() - np.median(w3)), 0, 1)
    gap[Y0 + 8:Y1, X0 + 1:X0 + 2] = (0.5 * w3[8:])[:, None]; gap[Y0 + 8:Y1, X1 - 2:X1 - 1] = (0.5 * w3[::-1][8:])[:, None]   # threads at the hinges, broken
    glow = np.clip(gap + 0.8 * ndimage.gaussian_filter(gap, 4) + 0.5 * ndimage.gaussian_filter(gap, 18) + 0.25 * ndimage.gaussian_filter(gap, 60), 0, 1)
    spill = np.zeros((H, W), np.float32)                                    # a blade of it along the floor, toward the camera
    for y in range(Y1, min(H, Y1 + 420)):
        t = (y - Y1) / 420.0; w = 2 + 26 * t
        x = cx - 60 * t
        spill[y, int(x - w):int(x + w) + 1] = (1 - t) ** 1.6
    spill = ndimage.gaussian_filter(spill, 5)
    day = np.array([0.93, 0.95, 1.0], np.float32)
    out = out + glow[..., None] * day * 0.95 + (spill * 0.14)[..., None] * refl * day
    out = np.clip(out, 0, 1)
    os.makedirs(P('refs/relit'), exist_ok=True)
    dst = P('refs/relit/ENV_E09_treaty-house-hall_dark.jpg')
    Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(dst, quality=95)
    lo = out @ LUMA
    print('wrote', os.path.relpath(dst, HERE), (W, H), '| mean level: treaty wall %.3f (reference %.3f), far wall %.3f, near floor %.3f, whole frame %.3f' % (
        lo[250:900, 900:1800].mean(), l[250:900, 900:1800].mean(), lo[300:800, 2100:2300].mean(), lo[1150:1380, 300:1500].mean(), lo.mean()))


if __name__ == '__main__':
    main()
