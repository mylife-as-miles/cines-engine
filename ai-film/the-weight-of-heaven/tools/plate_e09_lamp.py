#!/usr/bin/env python3
"""The hall of the Treaty House with its shutters open and most of its floor in shadow: for the lamp. Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/plate_e09_lamp.py   ->  refs/relit/ENV_E09_treaty-house-hall_lamp.jpg

In the approved reference the open shutters light the whole floor. The screenplay has Karst hold a lamp over the floor
after he has opened them, and the shot list has "paper takes the light and basalt does not": the papers are to be seen
by lamplight. The model takes its light from the reference (lesson 41), so the open hall is relit: the opening, its
leaves, the black plain outside and a pool of daylight on the floor in front of it are the reference's own (the copy
with the plain in its view, tools/plate_e09_plain.py); the rest of the room falls to the weak grey of the yard door,
as in the dark copy (tools/plate_e09_dark.py). Nothing is moved or repainted. No lamp is in the picture.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
LUMA = np.array([0.299, 0.587, 0.114], np.float32)


def main():
    a = np.asarray(Image.open(P('refs/relit/ENV_E09_treaty-house-hall_plain.jpg')).convert('RGB')).astype(np.float32) / 255
    H, W = a.shape[:2]; l = a @ LUMA
    refl = np.clip(a / (ndimage.gaussian_filter(l, 170)[..., None] + 0.06), 0, 2.6)       # the reference's own light taken out
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    amb = (0.17 * np.exp(-np.hypot(xx + 300, yy - 1650) / 1750.0) + 0.028)[..., None]      # weak grey from the yard door, behind the camera on the left
    dark = refl * amb * np.array([0.94, 0.98, 1.06], np.float32)
    # daylight kept where the opening throws it: the opening itself, its leaves and wall, and a pool on the floor before it
    dx, dy = xx - 2490, yy - 640
    near = np.exp(-(np.hypot(dx / 1.0, dy / 1.25) / 330.0) ** 2)                            # the doorway and the wall round it
    fx, fy = xx - 2440, yy - 900
    floor = np.exp(-((fx / 520.0) ** 2 + (np.clip(fy, 0, None) / 200.0) ** 2)) * (yy > 836)  # the floor just inside it
    m = np.clip(near + 0.9 * floor, 0, 1)[..., None]
    m = ndimage.gaussian_filter(m, (18, 18, 0))
    out = np.clip(dark * (1 - m) + a * m, 0, 1)
    dst = P('refs/relit/ENV_E09_treaty-house-hall_lamp.jpg')
    Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(dst, quality=95)
    lo = out @ LUMA
    print('wrote', os.path.relpath(dst, HERE), '| mean level: treaty slab %.3f, near floor %.3f, floor before the opening %.3f, whole frame %.3f' % (
        lo[250:900, 900:1800].mean(), lo[1150:1380, 300:1500].mean(), lo[860:960, 2200:2700].mean(), lo.mean()))


if __name__ == '__main__':
    main()
