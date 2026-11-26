"""An airport luggage trolley built in Python (the generated one was lumpy at f/2.8).

25 mm steel tube frame, a 0.55 x 0.9 m wire deck of 4 mm rods at 40 mm pitch, a back mesh between the uprights,
two 200 mm rear wheels and two 100 mm swivel castors, a handle bar with a dark rubber grip and a brake bar.
Built in a local frame (nose toward +X, z up) under one empty, then placed and turned. About 3k triangles.
"""
import math

import bpy
from mathutils import Vector

import setkit as sk

TUBE = 0.0125
ROD = 0.002


def _link(ob, parent):
    ob.parent = parent
    return ob


def rod(name, a, b, r, m, parent, verts=12, caps=True):
    a, b = Vector(a), Vector(b)
    d = b - a
    ob = sk.cyl(name, r, d.length, (a + b) / 2, m, verts=verts)
    ob.rotation_euler = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_euler()
    _link(ob, parent)
    if caps:  # rounded joints, so tube corners read as bends rather than cut ends
        for i, p in enumerate((a, b)):
            _link(sk.sphere(f"{name}_j{i}", r, tuple(p), m, segs=12), parent)
    return ob


def wheel(name, centre, r, width, M, parent, spokes=False):
    x, y, z = centre
    t = sk.cyl(name + "_tyre", r, width, (x, y, z), M["tyre"], rot=(math.radians(90), 0, 0), verts=32)
    bv = t.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments = min(0.012, width * 0.3), 3
    for p in t.data.polygons:
        p.use_smooth = True
    _link(t, parent)
    _link(sk.cyl(name + "_hub", r * 0.55, width + 0.006, (x, y, z), M["plastic_mid"], rot=(math.radians(90), 0, 0), verts=24), parent)
    _link(sk.cyl(name + "_cap", r * 0.2, width + 0.014, (x, y, z), M["steel"], rot=(math.radians(90), 0, 0), verts=16), parent)


def trolley(M, loc, turn_deg):
    root = bpy.data.objects.new("trolley", None)
    bpy.context.scene.collection.objects.link(root)
    L, W, zd = 0.9, 0.55, 0.2          # deck length, width, height
    x0, x1, hw = -L / 2, L / 2, W / 2
    f = M["wire"]
    # deck perimeter (25 mm tube) and the wire mesh: rods along the length at 40 mm pitch, three cross rods
    for name, a, b in (("deck_l", (x0, -hw, zd), (x1, -hw, zd)), ("deck_r", (x0, hw, zd), (x1, hw, zd)),
                       ("deck_back", (x0, -hw, zd), (x0, hw, zd))):
        rod(name, a, b, TUBE, f, root)
    # the nose: the side tubes sweep up into a front bumper bar
    for s in (-1, 1):
        rod(f"nose_up{s}", (x1, s * hw, zd), (x1 + 0.05, s * hw, zd + 0.09), TUBE, f, root)
    rod("nose_bar", (x1 + 0.05, -hw, zd + 0.09), (x1 + 0.05, hw, zd + 0.09), TUBE, f, root)
    n = int(W / 0.04)
    for i in range(1, n):
        y = -hw + W * i / n
        rod(f"deck_rod{i}", (x0, y, zd + 0.004), (x1 + 0.02, y, zd + 0.004), ROD, f, root, verts=6, caps=False)
    for k, x in enumerate((x0 + 0.22, 0.0, x1 - 0.2)):
        rod(f"deck_cross{k}", (x, -hw, zd - 0.002), (x, hw, zd - 0.002), ROD * 1.5, f, root, verts=6, caps=False)
    # chassis under the deck: two rails from the rear axle to the castor plates
    for s in (-1, 1):
        rod(f"rail{s}", (x0 + 0.06, s * (hw - 0.07), zd - 0.05), (x1 - 0.08, s * (hw - 0.07), zd - 0.05), TUBE * 0.9, f, root)
        rod(f"rail_post_b{s}", (x0 + 0.06, s * (hw - 0.07), zd - 0.05), (x0 + 0.06, s * (hw - 0.07), zd), TUBE * 0.8, f, root)
    # rear frame: two uprights leaning back, the handle with its grip, a brake bar just under it, a back mesh
    top_x, top_z = x0 - 0.12, 1.0
    for s in (-1, 1):
        rod(f"upright{s}", (x0, s * (hw - 0.02), zd), (top_x, s * (hw - 0.02), top_z), TUBE, f, root)
    rod("handle", (top_x, -hw - 0.02, top_z), (top_x, hw + 0.02, top_z), TUBE * 1.1, f, root)
    g = sk.cyl("grip", 0.017, 0.42, (top_x, 0, top_z), M["grip"], rot=(math.radians(90), 0, 0), verts=20)
    bv = g.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments = 0.005, 3
    _link(g, root)
    for s in (-1, 1):
        rod(f"brake_arm{s}", (top_x + 0.02, s * (hw - 0.02), top_z - 0.05), (top_x + 0.1, s * (hw - 0.04), top_z - 0.09), 0.006, f, root)
    rod("brake_bar", (top_x + 0.1, -hw + 0.04, top_z - 0.09), (top_x + 0.1, hw - 0.04, top_z - 0.09), 0.009, M["plastic"], root)
    for k, z in enumerate((0.42, 0.68, 0.9)):
        t = (z - zd) / (top_z - zd)
        x = x0 + (top_x - x0) * t
        rod(f"back_cross{k}", (x, -hw + 0.02, z), (x, hw - 0.02, z), TUBE * 0.7, f, root)
    m_ = int((W - 0.04) / 0.04)
    for i in range(1, m_):
        y = -hw + 0.02 + (W - 0.04) * i / m_
        rod(f"back_rod{i}", (x0 + (top_x - x0) * (0.25 / 0.8), y, zd + 0.25), (x0 + (top_x - x0) * (0.7 / 0.8), y, zd + 0.7), ROD,
            f, root, verts=6, caps=False)
    # wheels: 200 mm rear on an axle, 100 mm swivel castors at the nose
    for s in (-1, 1):
        wheel(f"rear{s}", (x0 + 0.06, s * (hw - 0.01), 0.1), 0.1, 0.045, M, root)
    rod("axle", (x0 + 0.06, -hw + 0.01, 0.1), (x0 + 0.06, hw - 0.01, 0.1), 0.008, M["steel"], root)
    for s in (-1, 1):
        cx, cy = x1 - 0.08, s * (hw - 0.07)
        sk_plate = sk.box(f"castor_plate{s}", (0.07, 0.07, 0.006), (cx, cy, zd - 0.065), M["steel"], bevel=0.002)
        _link(sk_plate, root)
        _link(sk.cyl(f"castor_swivel{s}", 0.018, 0.02, (cx, cy, zd - 0.078), M["steel"], verts=16), root)
        for fy in (-0.02, 0.02):
            _link(sk.box(f"castor_fork{s}", (0.05, 0.004, 0.08), (cx - 0.015, cy + fy, 0.075), M["steel"], bevel=0.0015), root)
        wheel(f"front{s}", (cx - 0.03, cy, 0.05), 0.05, 0.03, M, root)
    root.location = loc
    root.rotation_euler = (0, 0, math.radians(turn_deg))
    bpy.context.view_layer.update()
    return root
