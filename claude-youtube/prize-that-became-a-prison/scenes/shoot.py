"""Render one camera of one stage. Only one render runs on this machine at a time (4 cores): others wait their turn.

    <bpy python> -I scenes/shoot.py -- <stage> <cam> <out.png> [--res 960x540] [--spp 24] [--nocast] [--nograde] [--noise-threshold 0.03]

A stage is `scenes/stages/<stage>.py` with:

    CAMERAS = {"wide": dict(loc=(x, y, z), aim=(x, y, z), lens=24, focus="object name" or None, fstop=4.0), ...}
    EXPOSURE = -2.0               # optional (default -2.0); a camera dict may carry its own "exposure"
    def build(cast=True): ...     # builds the whole set, props and (if cast) the people into the reset scene

Writes out.png (raw) and, unless --nograde, out_graded.png (the film's grade: desaturated, blue shadows, vignette,
grain). Pass a comma-separated camera list or all to render a batch in one build. A final_<camera>.png
uses the camera's final_res if larger and includes corner-pin metadata when the stage provides it.
"""
import fcntl
import importlib
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "noir-kit"))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "stages"))
import bpy  # noqa: E402

import setkit as sk  # noqa: E402

GRADE = ("curves=r='0/0.02 0.5/0.46 1/0.95':g='0/0.03 0.5/0.5 1/0.97':b='0/0.06 0.5/0.56 1/1',"
         "hue=s=0.55,format=rgb24,vignette=angle=PI/4.4,noise=alls=6:allf=u")  # A fixed: vignette in RGB (author, 27 Nov 2026)
LOCK = "/tmp/cines_render.lock"

a = sys.argv[sys.argv.index("--") + 1:]
stage, cam_name, out = a[0], a[1], os.path.abspath(a[2])
opt = lambda k, d: a[a.index(k) + 1] if k in a else d
res = tuple(int(v) for v in opt("--res", "960x540").split("x"))
spp = int(opt("--spp", 24))

t0 = time.time()
lock = open(LOCK, "w")
print("SHOOT waiting for the render lock...", flush=True)
fcntl.flock(lock, fcntl.LOCK_EX)
t1 = time.time()
print(f"SHOOT lock acquired after {t1 - t0:.0f} s", flush=True)

sk.reset()
mod = importlib.import_module(stage)
mod.build(cast="--nocast" not in a)
t2 = time.time()
print(f"SHOOT build {t2 - t1:.1f} s", flush=True)

sc = bpy.context.scene
sc.render.threads_mode = "FIXED"
sc.render.threads = 4
names = list(mod.CAMERAS) if cam_name == "all" else cam_name.split(",")
unknown = set(names) - mod.CAMERAS.keys()
if unknown:
    raise ValueError(f"Unknown cameras for {stage}: {sorted(unknown)}")
for n in names:
    c = mod.CAMERAS[n]
    for o in [o for o in bpy.data.objects if o.type == "CAMERA"]:
        bpy.data.objects.remove(o)
    focus = c.get("focus")
    focus = focus if focus and focus in bpy.data.objects else None
    optics = {"clip_end": c["clip_end"]} if "clip_end" in c else {}
    camera = sk.camera(c["loc"], c["aim"], lens=c.get("lens", 35), focus=focus, fstop=c.get("fstop", 4.0), **optics)
    camera["stage_camera"] = n
    path = out if len(names) == 1 else out.replace(".png", f"_{n}.png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    stem = os.path.splitext(os.path.basename(path))[0]
    final = stem == "final" or stem.startswith("final_")
    render_res = res
    if final and c.get("final_res", res)[0] > res[0]:
        render_res = c["final_res"]
    threshold = opt("--noise-threshold", c.get("noise_threshold", getattr(mod, "NOISE_THRESHOLD", None)))
    sampling = {} if threshold is None else {"noise_threshold": float(threshold)}
    sk.render(path, spp, render_res, exposure=c.get("exposure", getattr(mod, "EXPOSURE", -2.0)), **sampling)
    if "--nograde" not in a:
        g = path.replace(".png", "_graded.png")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", path, "-vf", GRADE, g], check=True)
        print("SHOOT graded", g, flush=True)
    if final and hasattr(mod, "frame_metadata"):
        metadata = mod.frame_metadata(n, sc, render_res)
        if metadata is not None:
            sidecars = metadata.pop("sidecars", {})
            for suffix, data in {"corners": metadata, **sidecars}.items():
                with open(f"{os.path.splitext(path)[0]}.{suffix}.json", "w") as stream:
                    json.dump(data, stream, indent=2)
                    stream.write("\n")
    print("SHOOT wrote", path, flush=True)
print(f"SHOOT total {time.time() - t0:.0f} s (waited {t1 - t0:.0f} s)", flush=True)
