"""Stage: the airport inspection room (Ch 00 the question, Ch 05 the discovery, Ch 11 the return). Fluorescent Noir.

Starting point assembled from the props test frame and the cast frame; the agents improve it. Render with
`scenes/shoot.py -- inspection_room <cam> out.png`.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
import bpy  # noqa: E402

import cast  # noqa: E402
import props  # noqa: E402
import rigged  # noqa: E402
from sets import airport_room, bench, materials  # noqa: E402

TOP = 0.86
EXPOSURE = -2.0  # the bench troffer is about two stops hot for props
CAMERAS = {
    "wide": dict(loc=(1.95, -2.05, 2.45), aim=(-0.05, 0.25, 0.75), lens=24, focus="dawn-suitcase", fstop=4.0),
    "low": dict(loc=(-1.6, -1.9, 1.25), aim=(0.1, 0.3, 1.0), lens=32, focus="dawn-suitcase", fstop=2.8),
    "close": dict(loc=(0.55, -1.15, 1.25), aim=(0.0, -0.1, 1.0), lens=50, focus="handbag-tote", fstop=2.8),
}


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
    cast.hat(h, os.path.join(props.PROPS, "peaked-cap.glb"), rgb=(0.02, 0.025, 0.04))  # Tripo cap: licence-clean
    return h


def build(cast=True):
    airport_room()
    M = materials()
    bench(M["steel"], TOP)
    # Facing in the files: the suitcase's front pocket looks along +X; the scanner's tunnel opens to +X (its only
    # detailed side). The tote's turn of 162 keeps its dented face away from camera.
    props.load("dawn-suitcase", size=0.66, axis="z", loc=(0.46, 0.06, TOP), turn_deg=-62, sat=0.6)
    props.load("extra-bag-closed", size=0.75, axis="long", loc=(-0.5, 0.02, TOP), turn_deg=8, sat=0.5, val=0.35, rough_add=0.3)
    props.load("handbag-tote", size=0.35, axis="long", loc=(0.06, -0.22, TOP), turn_deg=162, sat=0.85, rough_add=0.22)
    props.load("xray-scanner", size=1.45, axis="z", loc=(-0.75, 1.95, 0), turn_deg=0, sat=0.4)
    if not cast:
        return
    d = dawn()
    a = officer("OfficerA", 179, 0.4)
    b = officer("OfficerB", 176, 0.5)
    rigged.pose_figure(d, {"head": (22, 0), "chest": (5, 0), "l_arm": (4, 4, 14), "r_arm": (4, 4, 12)})
    rigged.pose_figure(a, {"r_arm": (55, 14, 8), "l_arm": (4, 4, 10), "head": (16, 0), "chest": (4, 0)})
    rigged.pose_figure(b, {"head": (6, -20), "l_arm": (6, 6, 14), "r_arm": (6, 6, 14)})
    place(d, (0.15, -0.82, 0), 186)
    place(a, (-0.25, 0.85, 0), -12)
    place(b, (0.95, 1.12, 0), 22)
