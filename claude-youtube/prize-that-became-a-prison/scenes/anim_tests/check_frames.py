"""Frame-by-frame checks on a rendered sequence: missing, black or flat frames, and pops (a frame that differs from
its neighbours much more than the motion around it does).

    python3 check_frames.py out/anim_tests/preview_frames/B [--first 1 --last 116]

For each frame it measures the mean absolute difference to the previous frame (on a small grey copy, so sensor-like
render noise averages out) and flags a frame whose step is more than 2.5x the median of the steps around it and also
larger than the step after it (a pop goes and comes back), plus frames darker than 2 % or with almost no detail.
"""
import argparse
import os
import statistics

import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("folder")
ap.add_argument("--first", type=int, default=1)
ap.add_argument("--last", type=int, default=None)
a = ap.parse_args()
names = {int(f[:-4][-4:]): f for f in os.listdir(a.folder) if f.endswith(".png") and not f.startswith(".")}
last = a.last or max(names)
frames = list(range(a.first, last + 1))
missing = [f for f in frames if f not in names]
imgs, means = {}, {}
for f in frames:
    if f in names:
        im = Image.open(os.path.join(a.folder, names[f])).convert("L").resize((160, 90), Image.BILINEAR)
        arr = np.asarray(im, dtype=np.float32) / 255.0
        imgs[f] = arr
        means[f] = float(arr.mean())
steps = {f: float(np.abs(imgs[f] - imgs[f - 1]).mean()) for f in frames if f in imgs and f - 1 in imgs}
pops = []
for f, s in steps.items():
    around = [steps[g] for g in range(f - 6, f + 7) if g in steps and g != f]
    nxt = steps.get(f + 1, 0.0)
    if around and s > 2.5 * statistics.median(around) and s > 0.004 and s > 1.5 * nxt:
        pops.append((f, round(s, 4), round(statistics.median(around), 4)))
dark = [f for f, m in means.items() if m < 0.02]
flat = [f for f, im in imgs.items() if float(im.std()) < 0.01]
print(f"CHECK {a.folder}: {len(imgs)}/{len(frames)} frames; missing {missing or 'none'}; black {dark or 'none'}; "
      f"flat {flat or 'none'}")
print(f"CHECK frame-to-frame change: median {statistics.median(steps.values()):.4f}, max "
      f"{max(steps.values()):.4f} at frame {max(steps, key=steps.get)}; pops {pops or 'none'}")
