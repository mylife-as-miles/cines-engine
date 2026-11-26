"""Style frame C: the empty chair. Chapter 10, "He never saw Dawn return."

Brief: a modest family dining room in Chicago, night, winter. Still, cold, absent. 4.0 x 3.6 m, 2.5 m ceiling.
The head of the table is the father's place: that chair is pulled out a little and empty. Streetlight comes
through the blinds behind it; no lamp is on. Nothing on the table. A dark picture frame
on the side wall shows nothing (we invent no family photograph). Graded black and white, dates set in the grade.

Dials: density 0.2, tidiness 0.95, wear 0.4, power 0.0 (lamp off), warmth -0.4, time night, look vintage-cinematic.

    <bpy python> sf_chair.py -- out.png [--samples 64] [--res 1920x1080]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "noir-kit"))
import bpy  # noqa: E402  (bpy before anything that uses bmesh or mathutils)
import setkit as sk  # noqa: E402

A = sk.args(sys.argv)
sk.reset()

M = dict(
    floor=sk.mat("floor boards", (0.1, 0.07, 0.05), 0.45, nodes=sk.wood((0.11, 0.075, 0.05), (0.05, 0.032, 0.02), 4.0, 20.0)),
    wall=sk.mat("wallpaper", (0.16, 0.15, 0.135), 0.9),
    ceiling=sk.mat("ceiling", (0.3, 0.3, 0.29), 0.95),
    trim=sk.mat("trim", (0.28, 0.27, 0.25), 0.5),
    table=sk.mat("table", (0.08, 0.05, 0.03), 0.78, nodes=sk.wood((0.09, 0.055, 0.032), (0.045, 0.026, 0.015), 5.0, 14.0)),
    chair=sk.mat("chair", (0.07, 0.045, 0.028), 0.4, nodes=sk.wood((0.08, 0.05, 0.03), (0.04, 0.024, 0.014), 6.0, 10.0)),
    blind=sk.mat("blind", (0.32, 0.32, 0.3), 0.6),
    glass=sk.mat("window glass", (0.02, 0.025, 0.03), 0.05),
    frame=sk.mat("picture frame", (0.02, 0.018, 0.016), 0.4),
    shade=sk.mat("lamp shade", (0.25, 0.24, 0.22), 0.6),
)

W, D, H = 4.0, 3.6, 2.5
BACK = D / 2
sk.box("floor", (W, D, 0.02), (0, 0, -0.01), M["floor"])
sk.box("ceiling", (W, D, 0.02), (0, 0, H + 0.01), M["ceiling"])
sk.box("wall_left", (0.1, D, H), (-W / 2 - 0.05, 0, H / 2), M["wall"])
sk.box("wall_right", (0.1, D, H), (W / 2 + 0.05, 0, H / 2), M["wall"])
sk.box("wall_front", (W, 0.1, H), (0, -D / 2 - 0.05, H / 2), M["wall"])
# back wall with a window 1.1 x 1.3 m, sill at 0.85 m, centred behind the head of the table
WX, WW, WZ0, WZ1 = 0.0, 1.1, 0.85, 2.15
sk.box("wall_back_l", ((W - WW) / 2, 0.1, H), (-(W + WW) / 4, BACK + 0.05, H / 2), M["wall"])
sk.box("wall_back_r", ((W - WW) / 2, 0.1, H), ((W + WW) / 4, BACK + 0.05, H / 2), M["wall"])
sk.box("wall_back_low", (WW, 0.1, WZ0), (0, BACK + 0.05, WZ0 / 2), M["wall"])
sk.box("wall_back_high", (WW, 0.1, H - WZ1), (0, BACK + 0.05, (H + WZ1) / 2), M["wall"])
sk.box("sill", (WW + 0.12, 0.16, 0.03), (0, BACK - 0.02, WZ0), M["trim"])
for n, s, l in (("frame_l", (0.05, 0.12, WZ1 - WZ0), (-WW / 2, BACK, (WZ0 + WZ1) / 2)), ("frame_r", (0.05, 0.12, WZ1 - WZ0), (WW / 2, BACK, (WZ0 + WZ1) / 2)),
                ("frame_t", (WW + 0.1, 0.12, 0.05), (0, BACK, WZ1)), ("mullion", (0.03, 0.06, WZ1 - WZ0), (0, BACK + 0.04, (WZ0 + WZ1) / 2))):
    sk.box("window_" + n, s, l, M["trim"])
g = sk.box("window_glass", (WW, 0.005, WZ1 - WZ0), (0, BACK + 0.05, (WZ0 + WZ1) / 2), M["glass"])
g.visible_shadow = False
# half-open blinds: the slats stripe the streetlight across the chair and the floor
n_slats = 26
for i in range(n_slats):
    z = WZ0 + 0.06 + i * (WZ1 - WZ0 - 0.08) / n_slats
    sk.box(f"slat{i}", (WW - 0.04, 0.035, 0.002), (0, BACK - 0.05, z), M["blind"], rot=(math.radians(10), 0, 0))
# outside: a cold streetlight, high and to one side
street = sk.area_light("streetlight", (0.7, BACK + 2.2, 2.9), (1.2, 1.2), 1100, (0.62, 0.74, 1.0), spread_deg=50)
# a faint fill from the doorway behind the camera so the room does not go fully black
sk.area_light("hall_spill", (-1.2, -D / 2 + 0.2, 1.9), (0.8, 1.6), 25, (1.0, 0.86, 0.7), spread_deg=90, rot=(math.radians(-80), 0, 0))

# the table
TZ = 0.76
sk.box("table_top", (0.95, 1.7, 0.04), (0, 0.25, TZ - 0.02), M["table"], bevel=0.008)
sk.box("table_apron", (0.85, 1.6, 0.08), (0, 0.25, TZ - 0.08), M["table"])
for x in (-0.42, 0.42):
    for y in (-0.55, 1.05):
        sk.box("table_leg", (0.06, 0.06, TZ - 0.04), (x, y, (TZ - 0.04) / 2), M["table"])


def chair(name, loc, turn_deg):
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    parts = [sk.box(name + "_seat", (0.44, 0.42, 0.035), (0, 0, 0.455), M["chair"], bevel=0.006)]
    for x in (-0.19, 0.19):
        for y in (-0.18, 0.18):
            parts.append(sk.cyl(name + "_leg", 0.018, 0.44, (x, y, 0.22), M["chair"], r2=0.014))
    for x in (-0.19, 0.19):
        parts.append(sk.box(name + "_post", (0.035, 0.03, 0.52), (x, 0.2, 0.71), M["chair"], rot=(math.radians(-6), 0, 0)))
    parts.append(sk.box(name + "_rail", (0.42, 0.03, 0.08), (0, 0.225, 0.93), M["chair"], bevel=0.006, rot=(math.radians(-6), 0, 0)))
    for z in (0.62, 0.74):
        parts.append(sk.box(name + "_slat", (0.38, 0.018, 0.04), (0, 0.21, z), M["chair"], rot=(math.radians(-6), 0, 0)))
    for p in parts:
        p.parent = root
    root.location, root.rotation_euler = loc, (0, 0, math.radians(turn_deg))
    return root


# a chair faces -Y unturned; +90 faces +X. The father's place is pulled out from the table and a little turned.
chair("chair_head", (0.06, 1.5, 0), 8)
chair("chair_r1", (0.62, 0.0, 0), -90)          # the others are tucked in
chair("chair_r2", (0.62, 0.62, 0), -90)          # (no chair at the foot: the camera stands there)

# a picture frame on the side wall, dark glass, nothing shown
sk.box("picture_frame", (0.03, 0.42, 0.55), (-W / 2 + 0.02, 0.6, 1.55), M["frame"], bevel=0.005)
sk.box("picture_glass", (0.005, 0.36, 0.49), (-W / 2 + 0.04, 0.6, 1.55), M["glass"])
sk.haze((W - 0.02, D - 0.02, H - 0.02), (0, 0, H / 2), 0.006, (0.85, 0.9, 1.0))

aim = street.constraints.new("TRACK_TO")       # the streetlight falls through the blinds onto the empty chair
aim.target, aim.track_axis, aim.up_axis = bpy.data.objects["chair_head_seat"], "TRACK_NEGATIVE_Z", "UP_Y"

# from the corner by the doorway, standing eye height: the table leads to the empty chair against the window
sk.camera((-1.3, -1.25, 1.32), (0.12, 1.5, 0.78), lens=50, focus="chair_head_seat", fstop=2.8)
sk.render(A["out"], A["samples"], A["res"], exposure=-0.2)
