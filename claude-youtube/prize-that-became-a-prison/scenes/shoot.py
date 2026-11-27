"""Render one camera of one stage. Only one render runs on this machine at a time (4 cores): others wait their turn.

    <bpy python> -I scenes/shoot.py -- <stage> <cam> <out.png> [--res 960x540] [--spp 24] [--nocast] [--nograde]

A stage is `scenes/stages/<stage>.py` with:

    CAMERAS = {"wide": dict(loc=(x, y, z), aim=(x, y, z), lens=24, focus="object name" or None, fstop=4.0), ...}
    EXPOSURE = -2.0               # optional (default -2.0); a camera dict may carry its own "exposure"
    def build(cast=True): ...     # builds the whole set, props and (if cast) the people into the reset scene

Writes out.png (raw) and, unless --nograde, out_graded.png (the film's grade: desaturated, blue shadows, vignette,
grain). Prints the wait, build and render times. `--cam all` renders every camera in turn (one build).
"""
import fcntl
import importlib
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
names = list(mod.CAMERAS) if cam_name == "all" else [cam_name]
for n in names:
    c = mod.CAMERAS[n]
    for o in [o for o in bpy.data.objects if o.type == "CAMERA"]:
        bpy.data.objects.remove(o)
    focus = c.get("focus")
    focus = focus if focus and focus in bpy.data.objects else None
    sk.camera(c["loc"], c["aim"], lens=c.get("lens", 35), focus=focus, fstop=c.get("fstop", 4.0))
    path = out if len(names) == 1 else out.replace(".png", f"_{n}.png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sk.render(path, spp, res, exposure=c.get("exposure", getattr(mod, "EXPOSURE", -2.0)))
    if "--nograde" not in a:
        g = path.replace(".png", "_graded.png")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", path, "-vf", GRADE, g], check=True)
        print("SHOOT graded", g, flush=True)
    print("SHOOT wrote", path, flush=True)
print(f"SHOOT total {time.time() - t0:.0f} s (waited {t1 - t0:.0f} s)", flush=True)
