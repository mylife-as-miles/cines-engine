#!/usr/bin/env python3
"""The hall of the Treaty House, shutters open, with the black basalt plain outside. A local composite; nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/plate_e09_plain.py   ->  refs/relit/ENV_E09_treaty-house-hall_plain.jpg

The approved hall (`refs/ENV_E09_treaty-house-hall.jpg`) shows pale hills through its opening. The screenplay has the
shutters open on "the black plain", and Karst's line "It was stone within forty years" is about that ground. The ground
seen through the opening is replaced, below the horizon only, with a piece of the approved plain (`refs/ENV_E05_basalt-
plain.jpg`: black basalt in hexagonal columns). The sky, the shutters, the room and its light are the reference's own.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
LUMA = np.array([0.299, 0.587, 0.114], np.float32)


def main():
    a = np.asarray(Image.open(P('refs/ENV_E09_treaty-house-hall.jpg')).convert('RGB')).astype(np.float32) / 255
    e5 = Image.open(P('refs/ENV_E05_basalt-plain.jpg')).convert('RGB')
    l = a @ LUMA
    rows = np.arange(400, 620)                                             # the sky between the leaves: its left and right edge on each row
    lo, hi = [], []
    for y in rows:
        xs = np.where(l[y, 2400:2620] > 0.9)[0]; lo.append(2400 + xs.min()); hi.append(2400 + xs.max())
    pl, ph = np.polyfit(rows, lo, 1), np.polyfit(rows, hi, 1)
    HZ, BOT = 640, 824                                                     # the horizon in the opening, and the sill
    w = int(max(hi) - min(lo)) + 40; h = BOT - HZ
    W5, H5 = e5.size
    g = e5.crop((int(0.30 * W5), int(0.585 * H5), int(0.52 * W5), int(0.90 * H5))).resize((w, h), Image.LANCZOS)   # the plain's ground: from just under its horizon down
    g = np.asarray(g).astype(np.float32) / 255
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    haze = np.array([0.80, 0.82, 0.85], np.float32)
    g = g * (0.55 + 0.45 * yy) + haze * 0.45 * (1 - yy) ** 2.2             # air between here and the horizon; nearer ground a little darker and clearer
    out = a.copy(); x0 = int(min(lo)) - 20
    m = np.zeros(a.shape[:2], np.float32)
    for y in range(HZ, BOT):
        xa, xb = int(np.polyval(pl, y)) + 2, int(np.polyval(ph, y)) + 7
        wood = (a[y, xa:xb, 0] - a[y, xa:xb, 2] > 0.06) & (l[y, xa:xb] < 0.8)          # never over the leaf itself: its wood is warm
        m[y, xa:xb] = np.where(wood, 0, min(1.0, (y - HZ + 1) / 7.0))      # and the horizon comes in over seven rows, in haze
    m = ndimage.gaussian_filter(m, 1.0)
    sub = np.zeros_like(a); sub[HZ:BOT, x0:x0 + w] = g
    out = out * (1 - m[..., None]) + sub * m[..., None]
    dst = P('refs/relit/ENV_E09_treaty-house-hall_plain.jpg')
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst, quality=95)
    print('wrote', os.path.relpath(dst, HERE), '| opening edges at the horizon:', int(np.polyval(pl, HZ)), int(np.polyval(ph, HZ)), '| pixels changed:', int((m > 0.5).sum()))


if __name__ == '__main__':
    main()
