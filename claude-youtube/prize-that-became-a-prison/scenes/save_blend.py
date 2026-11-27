"""Build one stage and save it as a .blend that opens in Blender 5.3 desktop, with every camera of the stage.

    <bpy python> -I scenes/save_blend.py -- <stage> out.blend [--nocast]

The stage module stays the source of truth (it is what the renders come from); the .blend is a convenience for looking
around in Blender. Each camera in the stage's CAMERAS becomes a camera object `cam_<name>` (the first is the active one);
render settings are Cycles at the stage's exposure with the film's AgX view. Per-camera set changes that a stage makes
only at render time (for example the inspection room laying the bench out differently for Ch 05) are not baked in:
the .blend holds the stage as `build()` leaves it. Textures from the generated props are packed into the file; the
MakeHuman textures are linked by relative path to noir-kit/assets/makehuman, so keep the repository layout.
"""
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "noir-kit"))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "stages"))
import bpy  # noqa: E402

import setkit as sk  # noqa: E402

a = sys.argv[sys.argv.index("--") + 1:]
stage, out = a[0], os.path.abspath(a[1])
sk.reset()
mod = importlib.import_module(stage)
mod.build(cast="--nocast" not in a)
sc = bpy.context.scene
first = None
for name, c in mod.CAMERAS.items():
    cam = sk.camera(c["loc"], c["aim"], lens=c.get("lens", 35),
                    focus=c.get("focus") if c.get("focus") in bpy.data.objects else None, fstop=c.get("fstop", 4.0))
    cam.name = f"cam_{name}"
    for o in bpy.data.objects:  # setkit names the aim empty "aim"; keep one per camera
        if o.name == "aim":
            o.name = f"aim_{name}"
    first = first or cam
sc.camera = first
sc.render.engine = "CYCLES"
sc.cycles.samples = 64
sc.view_settings.view_transform = "AgX"
sc.view_settings.exposure = getattr(mod, "EXPOSURE", -2.0)
sc.render.resolution_x, sc.render.resolution_y = 1280, 720
os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True, relative_remap=True)
print("SAVED", out, round(os.path.getsize(out) / 1e6, 1), "MB")
