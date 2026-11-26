"""Style frame: the airport question with the real cast (Fluorescent Noir).

Dawn as a MakeHuman statue with sculpted hair, dressed in the overcoat, dark trousers and shoes; two officers in the
uniform jacket (recoloured navy, insignia gone with the texture), dark trousers, peaked caps and shoes. Every
character is built and fitted at the origin facing -Y, then moved to its mark.

    <bpy python> scenes/sf_airport_cast.py -- out.png [--samples 32] [--res 1280x720] [--cam high|low]
"""
import math
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "noir-kit"))
sys.path.insert(0, HERE)
import bpy  # noqa: E402

import cast  # noqa: E402
import fit  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
from sets import airport_room, bench_and_bags, materials  # noqa: E402

A = sk.args(sys.argv)
O = os.path.join(HERE, "..", "..", "noir-kit", "assets", "outfits")
NAVY, DARK = (0.022, 0.03, 0.05), (0.03, 0.03, 0.035)
sk.reset()
t0 = time.time()


def place(holder, loc, facing_deg):
    holder.location = loc
    holder.rotation_euler = (0, 0, math.radians(facing_deg))
    bpy.context.view_layer.update()


def dawn():
    h = cast.person("Dawn", gender=0.0, height_cm=168, age=0.45, hair="bun")
    trousers = fit.garment(h, os.path.join(O, "scrubs_clothing.glb"), recolour=DARK, part="lower", top_at="waist", sleeves=False,
                           snug=0.008)
    cast.blouse_v(h)
    fit.garment(h, os.path.join(O, "female_overcoat.glb"), recolour=(0.16, 0.115, 0.075), over=trousers, snug=0.012)
    cast.shoes(h)
    return h


def officer(name, height_cm, age):
    h = cast.person(name, gender=1.0, height_cm=height_cm, age=age, hair="short")
    trousers = fit.garment(h, os.path.join(O, "scrubs_clothing.glb"), recolour=NAVY, part="lower", top_at="waist", sleeves=False,
                           snug=0.008)
    fit.garment(h, os.path.join(O, "uniform_jacket_raf.glb"), recolour=NAVY, keep="all", decimate_to=36000, trim_neck=True, ease=1.1,
                over=trousers, snug=None)  # a stiff museum scan: conforming crumples it, so it is only sized and bound
    cast.hat(h, os.path.join(O, "peaked_cap_1.fbx"), rgb=(0.02, 0.025, 0.04))
    cast.shoes(h)
    return h


airport_room()
M = materials()
bench_and_bags(M["steel"], M["case"], M["leather"], M["rubber"], M["tag"])
d = dawn()
print("DAWN", round(time.time() - t0, 1), "s")
a = officer("OfficerA", 179, 0.4)
print("OFFICER A", round(time.time() - t0, 1), "s")
b = officer("OfficerB", 176, 0.5)
print("OFFICER B", round(time.time() - t0, 1), "s")
rigged.pose_figure(d, {"head": (22, 0), "chest": (5, 0), "l_arm": (4, 4, 14), "r_arm": (4, 4, 12)})
# the scanned uniform's sleeves bind close to the torso: officers keep their arms near the fitted pose
rigged.pose_figure(a, {"r_arm": (16, 4, 22), "l_arm": (2, 2, 6), "head": (16, 0), "chest": (4, 0)})
rigged.pose_figure(b, {"head": (6, -20), "l_arm": (2, 2, 6), "r_arm": (2, 2, 6)})
place(d, (0.15, -0.82, 0), 186)
place(a, (-0.25, 0.85, 0), -12)
place(b, (0.95, 1.12, 0), 22)
if A["cam"] == "low":
    sk.camera((-1.6, -1.9, 1.25), (0.1, 0.3, 1.15), lens=32, focus="case", fstop=2.8)
else:
    sk.camera((1.95, -2.05, 2.45), (-0.05, 0.25, 0.75), lens=24, focus="case", fstop=4.0)
sk.render(A["out"], A["samples"], A["res"], exposure=-0.2)
print("TOTAL", round(time.time() - t0, 1), "s")
