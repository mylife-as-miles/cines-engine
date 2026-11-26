#!/usr/bin/env python3
"""Relight a locked reference image for the world below, without generating anything.

The video model takes its light from the environment reference more than from
the words. ENV_E03 was made flat and evenly lit, with green grass, and Q03A t1
came back the same way. This makes a darker plate of the same image: exposed for
the pale band of sky at the horizon, everything else about a stop under, the
greens pulled to grey-olive, the shadows cold slate, the ground falling off
toward the camera. Nothing in the picture is moved or repainted.

  python3 tools/relight_ref.py refs/ENV_E03_anvil-vale.jpg refs/relit/ENV_E03_anvil-vale_low-light.jpg
"""
import sys
import numpy as np
from PIL import Image, ImageFilter


def relight(src, dst, horizon=0.46, stop=0.85):
    im = Image.open(src).convert("RGB")
    a = np.asarray(im).astype(np.float32) / 255.0
    h, w, _ = a.shape
    lin = a ** 2.2

    luma = (lin * [0.2126, 0.7152, 0.0722]).sum(-1, keepdims=True)

    # 1. Greens to grey-olive: desaturate by how green a pixel is.
    r, g, b = lin[..., 0:1], lin[..., 1:2], lin[..., 2:3]
    greenness = np.clip((g - np.maximum(r, b)) / (g + 1e-4) * 4.0, 0, 1)
    sat = 0.55 - 0.35 * greenness            # global 0.55, greens down to 0.20
    lin = luma + (lin - luma) * sat

    # 2. Exposure: hold the bright band, pull everything else down about a stop.
    #    The mask is a soft luma key, so the sky between mass and horizon keeps its level.
    key = np.clip((luma - 0.16) / 0.30, 0, 1) ** 1.5
    gain = (0.5 ** stop) * (1 - key) + 1.0 * key
    lin = lin * gain

    # 3. The ground falls off toward the camera; the ceiling stays heavy.
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    ground = np.clip((y - horizon) / (1 - horizon), 0, 1)
    lin = lin * (1.0 - 0.36 * ground ** 1.2)
    ceiling = np.clip((0.30 - y) / 0.30, 0, 1)
    lin = lin * (1.0 - 0.25 * ceiling)

    # 4. A soft glow along the horizon band: the only source.
    band = np.exp(-((y - (horizon - 0.07)) / 0.06) ** 2)
    lin = lin + band * 0.035 * np.array([0.92, 0.97, 1.0], dtype=np.float32) * (0.3 + key)

    # 5. Cold slate in the shadows, neutral in the highlights.
    luma2 = (lin * [0.2126, 0.7152, 0.0722]).sum(-1, keepdims=True)
    shadow = np.clip(1 - luma2 / 0.25, 0, 1)
    tint = np.array([0.90, 1.0, 1.10], dtype=np.float32)
    lin = lin * (1 + (tint - 1) * shadow * 0.9)

    # 6. Blacks deep but not crushed.
    lin = np.clip(lin, 0, 1)
    out = lin ** (1 / 2.2)
    out = 0.018 + out * (1 - 0.018)

    # 7. Light vignette.
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)[..., None]
    out = out * (1 - 0.18 * np.clip(d - 0.55, 0, 1) ** 1.5)

    res = Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8))
    # a breath of mist: a little bloom from the band only
    glow = res.filter(ImageFilter.GaussianBlur(w / 90))
    res = Image.blend(res, Image.fromarray(np.maximum(np.asarray(res), (np.asarray(glow) * 0.9).astype(np.uint8))), 0.25)
    res.save(dst, quality=95)
    print(f"wrote {dst} {res.size}")


if __name__ == "__main__":
    import os
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
    relight(src, dst)
