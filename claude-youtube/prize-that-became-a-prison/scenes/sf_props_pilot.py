"""Test frame for Tripo's first props: the suitcase, the extra bag, a handbag and the X-ray scanner in the inspection room.

Same room, bench and fluorescent light as the cast frame, so the props are judged under the film's own light.
Any prop not downloaded yet is left out.

    <bpy python> scenes/sf_props_pilot.py -- out.png [--samples 32] [--res 1280x720] [--cam high|low|close] [--exposure -2.0]
"""
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "noir-kit"))
sys.path.insert(0, HERE)
import bpy  # noqa: E402,F401

import props  # noqa: E402
import setkit as sk  # noqa: E402
from sets import airport_room, bench, materials  # noqa: E402

A = sk.args(sys.argv)
TOP = 0.86
sk.reset()
t0 = time.time()
airport_room()
M = materials()
bench(M["steel"], TOP)


def maybe(name, **kw):
    if os.path.exists(os.path.join(props.PROPS, f"{name}.glb")):
        h = props.load(name, **kw)
        print("PROP", name, "dims (m):", list(h["dims"]))
        return h
    print("PROP", name, "not downloaded; left out")


# Facing in the files: the suitcase's front pocket looks along +X, the scanner's tunnel opens to +X (its only detailed
# side); the bags lie along X. Colours are pulled to the prompts: charcoal case, black bag, tan tote, pale grey machine.
maybe("dawn-suitcase", size=0.66, axis="z", loc=(0.46, 0.06, TOP), turn_deg=-62, sat=0.6)
maybe("extra-bag-closed", size=0.75, axis="long", loc=(-0.5, 0.02, TOP), turn_deg=8, sat=0.5, val=0.35, rough_add=0.3)
maybe("handbag-tote", size=0.35, axis="long", loc=(0.06, -0.22, TOP), turn_deg=162, sat=0.85, rough_add=0.22)
maybe("xray-scanner", size=1.45, axis="z", loc=(-0.75, 1.95, 0), turn_deg=0, sat=0.4)

def on(name):
    return name if name in bpy.data.objects else None


if A["cam"] == "low":
    sk.camera((-1.6, -1.9, 1.25), (0.1, 0.3, 1.0), lens=32, focus=on("dawn-suitcase"), fstop=2.8)
elif A["cam"] == "close":
    sk.camera((0.55, -1.15, 1.25), (0.0, -0.1, 1.0), lens=50, focus=on("handbag-tote"), fstop=2.8)
else:
    sk.camera((1.95, -2.05, 2.45), (-0.05, 0.25, 0.75), lens=24, focus=on("dawn-suitcase"), fstop=4.0)
EXPOSURE = float(sys.argv[sys.argv.index("--exposure") + 1]) if "--exposure" in sys.argv else -2.0  # the bench light is about two stops hot for props
sk.render(A["out"], A["samples"], A["res"], exposure=EXPOSURE)
print("TOTAL", round(time.time() - t0, 1), "s")
