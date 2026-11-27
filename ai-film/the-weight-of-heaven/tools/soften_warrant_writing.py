#!/usr/bin/env python3
"""The lifting warrant's main view with its handwriting softened to faint strokes. A local edit; nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/soften_warrant_writing.py
        ->  refs/crops/PROP_P04_lifting-warrant_hero_soft.jpg

In the approved sheet's main view the writing is the largest thing on the page, sharp, and in letters that can nearly
be read ("The", "iron", "by"). A reference beats the words that contradict it, Q09 came back with Latin-looking letters
on the treaty slab, and Q10 has a close view of one of these sheets. The band of writing is blurred along its own lines
until no letter has a shape; the paper, the small map and the red wax are untouched. The approved file is not changed.
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
ANGLE = 21.5                                   # the slope of the lines of writing in this view, degrees (down to the right)


def main():
    im = Image.open(P('refs/crops/PROP_P04_lifting-warrant_hero.jpg')).convert('RGB'); W, H = im.size
    a = np.asarray(im).astype(np.float32) / 255
    r = np.asarray(im.rotate(ANGLE, resample=Image.BICUBIC, expand=True)).astype(np.float32) / 255      # the lines made level
    r = ndimage.gaussian_filter(r, (1.2, 9, 0))                                                          # smeared along themselves
    back = Image.fromarray((np.clip(r, 0, 1) * 255).astype(np.uint8)).rotate(-ANGLE, resample=Image.BICUBIC, expand=True)
    bw, bh = back.size; back = np.asarray(back.crop(((bw - W) // 2, (bh - H) // 2, (bw - W) // 2 + W, (bh - H) // 2 + H))).astype(np.float32) / 255
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    d.polygon([(395, 262), (470, 250), (880, 405), (800, 600), (590, 585), (350, 500), (340, 380)], fill=255)   # the band of writing
    d.ellipse((392, 505, 568, 640), fill=0)                                                              # not the wax
    m = ndimage.gaussian_filter(np.asarray(m).astype(np.float32) / 255, 5)[..., None]
    paper = ndimage.gaussian_filter(a, (25, 25, 0))
    soft = back * 0.62 + paper * 0.38                                                                    # and a little fainter
    out = a * (1 - m) + soft * m
    dst = P('refs/crops/PROP_P04_lifting-warrant_hero_soft.jpg')
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst, quality=95); print('wrote', os.path.relpath(dst, HERE), (W, H))


if __name__ == '__main__':
    main()
