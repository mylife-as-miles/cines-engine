#!/usr/bin/env python3
"""Two free corrections to the shot plate E05B (the crossing), as a separate copy. Nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/fix_plate_e05b.py  ->  refs/candidates/E05B_t1a_fixed.jpg

The plate came back with one of the nine gates shut and the crewman in a dark coat. The screenplay has two gates shut
("Nine gates. Two are shut."), and the people of Orison wear white. Here the shut gate (the fifth) is copied over the
seventh, matched to the wall's tone there, and the crewman's coat is turned from dark to a white in shade. The plate as
generated, refs/candidates/E05B_t1a.jpg, is left as it was.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
luma = lambda a: a @ np.array([0.299, 0.587, 0.114], np.float32)


def main():
    a = np.asarray(Image.open(P('refs/candidates/E05B_t1a.jpg')).convert('RGB')).astype(np.float32) / 255
    out = a.copy(); H, W = a.shape[:2]
    # 1. the seventh gate shut: the fifth gate's stone laid over it
    sx, tx, hw, y0, y1 = 1026, 1300, 44, 324, 414
    src = a[y0:y1, sx - hw:sx + hw]
    k = a[y0:y0 + 12, tx - hw:tx + hw].mean((0, 1)) / a[y0:y0 + 12, sx - hw:sx + hw].mean((0, 1))      # the wall's tone there against here
    m = np.zeros((y1 - y0, 2 * hw), np.float32); m[4:-5, 9:-9] = 1; m = ndimage.gaussian_filter(m, 3.0)[..., None]
    out[y0:y1, tx - hw:tx + hw] = out[y0:y1, tx - hw:tx + hw] * (1 - m) + np.clip(src * k, 0, 1) * m
    # 2. the crewman's coat: from dark to a white in shade (his head, legs and the wheel are left)
    bx0, bx1, by0, by1 = 711, 757, 552, 604
    l = luma(a)
    dark = l < 0.24; lab, n = ndimage.label(dark[536:624, 712:776]); sz = ndimage.sum(dark[536:624, 712:776], lab, range(1, n + 1))
    fig = np.zeros((H, W), bool); fig[536:624, 712:776] = lab == (1 + int(np.argmax(sz)))
    sat = (a.max(2) - a.min(2)) / np.maximum(a.max(2), 1e-3)
    coat = np.zeros((H, W), bool); coat[by0:by1, bx0:bx1] = fig[by0:by1, bx0:bx1] & (sat[by0:by1, bx0:bx1] < 0.26)    # not the brown wheel behind his arm
    coat = ndimage.binary_opening(coat, iterations=1)
    m = ndimage.gaussian_filter(coat.astype(np.float32), 0.8)[..., None]
    v = np.clip(0.63 + (ndimage.gaussian_filter(l, 1.1) - 0.13) * 1.3, 0.50, 0.78)[..., None]              # its folds kept, lifted; smoothed so the grain is not lifted with them
    out = out * (1 - m) + v * np.array([0.93, 0.95, 0.98], np.float32) * m
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(P('refs/candidates/E05B_t1a_fixed.jpg'), quality=95)
    print('wrote refs/candidates/E05B_t1a_fixed.jpg', (W, H))


if __name__ == '__main__':
    main()
