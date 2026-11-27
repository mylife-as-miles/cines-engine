"""The film's whole cast in one line-up, built through scenes/people.py: saved as blend/cast.blend and rendered as
frames/cast_lineup.png (raw) and frames/cast_lineup_graded.jpg (grade A).

    <bpy python> -I scenes/save_cast.py [--norender]

Every figure is a Rigify-rigged MakeHuman statue in its rest pose; pose them with noir-kit/rigged.pose_figure.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "noir-kit"))
sys.path.insert(0, HERE)
import bpy  # noqa: E402

import people  # noqa: E402
import setkit as sk  # noqa: E402
GRADE = ("curves=r='0/0.02 0.5/0.46 1/0.95':g='0/0.03 0.5/0.5 1/0.97':b='0/0.06 0.5/0.56 1/1',"
         "hue=s=0.55,vignette=angle=PI/4.4,noise=alls=6:allf=u")  # grade A, as in shoot.py (which runs on import)

ROOT = os.path.join(HERE, "..")
sk.reset()
LINE = [
    ("Dawn (2014)", lambda: people.dawn()),
    ("Dawn (detention, court, prison)", lambda: people.dawn_prison()),
    ("Officer A", lambda: people.officer("OfficerA", 0)),
    ("Officer B", lambda: people.officer("OfficerB", 1)),
    ("Officer C", lambda: people.officer("OfficerC", 2)),
    ("Airline agent", lambda: people.staff("AgentMan", 0)),
    ("Hotel or airline staff", lambda: people.staff("AgentWoman", 1)),
    ("Tim Hunt (hearing, visits)", lambda: people.man("Tim", age=0.58, suit="male_elegantsuit01", tone=(0.09, 0.09, 0.1))),
    ("Organiser", lambda: people.man("Organiser", age=0.4, suit="male_casualsuit03", tone=(0.1, 0.1, 0.11))),
    ("Gene Hunt (father)", lambda: people.man("Gene", age=0.8, weight=0.5, suit="male_casualsuit01", tone=(0.14, 0.13, 0.12))),
]
step = 0.82
x0 = -step * (len(LINE) - 1) / 2
for i, (label, make) in enumerate(LINE):
    h = make()
    h.location = (x0 + i * step, 0, 0)
    h["label"] = label
bpy.context.view_layer.update()
sk.box("floor", (12, 6, 0.01), (0, 0, -0.005), sk.mat("floor", (0.08, 0.08, 0.085), 0.8))
sk.area_light("key", (-2.5, -4.0, 4.0), (3.0, 3.0), 2200, rot=(0.75, 0, -0.5))
sk.area_light("rim", (3.0, 3.5, 3.0), (3.0, 1.0), 900, rot=(-0.9, 0, 2.6))
cam = sk.camera((0, -10.5, 1.45), (0, 0, 0.95), lens=40)
cam.name = "cam_lineup"
sc = bpy.context.scene
out_blend = os.path.join(ROOT, "blend", "cast.blend")
os.makedirs(os.path.dirname(out_blend), exist_ok=True)
sc.render.engine = "CYCLES"
sc.view_settings.view_transform = "AgX"
sc.view_settings.exposure = -1.2
sc.render.resolution_x, sc.render.resolution_y = 2400, 820
bpy.ops.wm.save_as_mainfile(filepath=out_blend, compress=True, relative_remap=True)
print("SAVED", out_blend, round(os.path.getsize(out_blend) / 1e6, 1), "MB")
if "--norender" not in sys.argv:
    raw = os.path.join(ROOT, "frames", "cast_lineup.png")
    sk.render(raw, 48, (2400, 820), exposure=-1.2)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-vf", GRADE, "-q:v", "3",
                    os.path.join(ROOT, "frames", "cast_lineup_graded.jpg")], check=True)
    print("RENDERED", raw)
