"""Style frame: the airport question with the real cast (Fluorescent Noir).

Dawn as a MakeHuman statue with sculpted hair, in MakeHuman's own CC0 blouse and skirt (made for this body, so it fits
and follows the rig); two officers in MakeHuman's suit recoloured navy, with peaked caps. Every character is built at
the origin facing -Y, then moved to its mark.

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
    cast.dress(h, ["female_elegantsuit01", "shoes05"], tint={"female_elegantsuit01": (0.62, 0.56, 0.5), "shoes05": (0.12, 0.11, 0.1)})
    return h


def officer(name, height_cm, age):
    h = cast.person(name, gender=1.0, height_cm=height_cm, age=age, hair="short")
    cast.dress(h, ["male_elegantsuit01", "shoes06"], tint={"male_elegantsuit01": (0.2, 0.26, 0.4), "shoes06": (0.15, 0.15, 0.16)})
    cast.hat(h, os.path.join(O, "peaked_cap_1.fbx"), rgb=(0.02, 0.025, 0.04))
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
rigged.pose_figure(a, {"r_arm": (55, 14, 8), "l_arm": (4, 4, 10), "head": (16, 0), "chest": (4, 0)})
rigged.pose_figure(b, {"head": (6, -20), "l_arm": (6, 6, 14), "r_arm": (6, 6, 14)})
place(d, (0.15, -0.82, 0), 186)
place(a, (-0.25, 0.85, 0), -12)
place(b, (0.95, 1.12, 0), 22)
if A["cam"] == "low":
    sk.camera((-1.6, -1.9, 1.25), (0.1, 0.3, 1.15), lens=32, focus="case", fstop=2.8)
else:
    sk.camera((1.95, -2.05, 2.45), (-0.05, 0.25, 0.75), lens=24, focus="case", fstop=4.0)
sk.render(A["out"], A["samples"], A["res"], exposure=-0.2)
print("TOTAL", round(time.time() - t0, 1), "s")
