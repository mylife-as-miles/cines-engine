# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile", "matplotlib"]
# ///
"""Cut and judge candidate recordings with opus-sound-layer's own sfx.py (prepare = cut events, filter, fade,
peak -3 dBFS; judge = its checks), several events per file, and draw one sheet per group.

  uv run tools/prep_sounds.py SFX_PY CAND_DIR OUT_DIR PLAN.json
PLAN.json: {"key": ["type", k], ...}  ->  OUT_DIR/<key>/fs-<id>-<n>.wav + .json, OUT_DIR/<key>.png
"""
import glob, importlib.util, json, os, sys

spec = importlib.util.spec_from_file_location("sfx", sys.argv[1]); sfx = importlib.util.module_from_spec(spec); spec.loader.exec_module(sfx)
cand, out, plan = sys.argv[2], sys.argv[3], json.load(open(sys.argv[4]))
for key, (typ, k) in plan.items():
    files = []
    for mp3 in sorted(glob.glob(os.path.join(cand, key, "fs-*.mp3"))):
        meta = json.load(open(mp3[:-4] + ".json"))
        try:
            sides = sfx.prepare(mp3, typ, os.path.join(out, key), os.path.basename(mp3)[:-4], meta, k=k)
        except Exception as e:
            print(key, mp3, "skip", e); continue
        for s in sides:
            print(f"{key:12s} {sfx.line(s)}  | {meta['title'][:40]}"); files.append(s["file"])
    if files: sfx.sheet(files[:24], os.path.join(out, key + ".png"))
