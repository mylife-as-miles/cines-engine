"""Estimate a relative depth map for each Blender plate, for the animatic's parallax pushes (tools/assemble.py).

    <torch python> tools/depth_estimate.py frames/raw/<stage>/<cam>.png [...]     -> out/depth/<stage>/<cam>.png

Any Python with torch, transformers and Pillow will do (on this machine, earshot's: /home/user/leonxlnx/earshot/.venv).
The model is Depth Anything V2 Small (Apache-2.0), on the CPU, about 5-10 s a plate. It gives disparity (bright = near),
normalised to 0-1 and written as a 16-bit PNG at the plate's size. Only the warp uses it; nothing of it is shown.
A map newer than its plate is kept.
"""
import os
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from transformers import pipeline

ROOT = Path(__file__).resolve().parents[1]


def out_path(plate):
    p = Path(plate).resolve().relative_to(ROOT / "frames/raw")
    return ROOT / "out/depth" / p


def main(plates):
    todo = [p for p in plates if not out_path(p).exists() or out_path(p).stat().st_mtime < Path(p).stat().st_mtime]
    if not todo:
        print("depth: every map is current"); return
    torch.set_num_threads(max(1, (os.cpu_count() or 2) - 1))
    pipe = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device="cpu")
    for k, plate in enumerate(todo, 1):
        im = Image.open(plate).convert("RGB")
        w, h = im.size
        pred = pipe(im.resize((1036, round(1036 * h / w))))["predicted_depth"]
        pred = pred[None] if pred.ndim == 3 else pred[None, None]
        d = torch.nn.functional.interpolate(pred, size=(h, w), mode="bicubic", align_corners=False)[0, 0].numpy()
        d = (d - d.min()) / (d.max() - d.min() + 1e-9)
        dst = out_path(plate)
        dst.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray((np.clip(d, 0, 1) * 65535).astype(np.uint16)).save(dst)
        print(f"depth {k}/{len(todo)} {dst.relative_to(ROOT)}", flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])
