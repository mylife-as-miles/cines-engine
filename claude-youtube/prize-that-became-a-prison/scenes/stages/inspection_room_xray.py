"""The inspection room's X-ray scanner, built to read as an airport machine from the room's cameras.

The generated housing (`xray-scanner`, 1.45 m) keeps its tunnel face; its own belt and console, which came out lumpy,
are cut away and rebuilt in Python: a black void inside the tunnel, a lead curtain of nine dark strips hanging in
the mouth, an exit conveyor (a rubber belt section off the tunnel, then seven steel rollers, side frames and guide
rails on square legs), two nested grey trays waiting on the rollers, and an operator's monitor on a bracket from the
housing's flank, whose blank face glows and spills toward the operator's place. Everything is built in the prop's own space (tunnel opening toward +X, floor at 0,
footprint centred; probed: face plane x = 0.16, opening y -0.425..0.225 and z 0.60..1.24, tunnel floor 0.58) and then
placed with the prop's transform, so the machine can be turned to face the cameras.
"""
import math
import random

import bpy  # noqa: F401  (first: bmesh and mathutils only exist once bpy is loaded)
import bmesh
from mathutils import Matrix, Vector

import props
import setkit as sk
import inspection_room_set as st
import inspection_room_mats as mt

FACE, CUT = 0.16, 0.19                 # the tunnel face; generated geometry beyond CUT is removed
MOUTH = (-0.425, 0.225, 0.60, 1.24)    # opening y0, y1, z0, z1
BELT_Z = 0.58
CY, WIDTH = -0.1, 0.62                 # the conveyor's centre line and width (prop y)


def build(sx, sy, turn_deg=-90.0):
    """Load, trim and place the scanner; returns a dict of its parts (holder, screen, trays, spill light)."""
    m = st.materials()
    h = props.load("xray-scanner", size=1.45, axis="z", loc=(0, 0, 0), turn_deg=0, sat=0.4, val=0.45, rough_add=0.08)
    bpy.context.view_layer.update()
    cut = 0
    for o in h.children_recursive:
        if o.type != "MESH":
            continue
        mw = o.matrix_world
        bm = bmesh.new()
        bm.from_mesh(o.data)
        kill = [v for v in bm.verts if (mw @ v.co).x > CUT]
        cut += len(kill)
        bmesh.ops.delete(bm, geom=kill, context="VERTS")
        bm.to_mesh(o.data)
        bm.free()
    M = Matrix.Translation((sx, sy, 0.0)) @ Matrix.Rotation(math.radians(turn_deg), 4, "Z")
    h.location, h.rotation_euler = (sx, sy, 0.0), (0, 0, math.radians(turn_deg))
    bpy.context.view_layer.update()
    print(f"INSPECTION scanner: {cut} generated vertices cut beyond the tunnel face", flush=True)
    out = {"holder": h, "parts": []}

    def put(ob):
        ob.matrix_basis = M @ ob.matrix_basis
        out["parts"].append(ob)
        return ob

    def bx(name, size, loc, mat, bevel=0.0, rot=(0, 0, 0)):
        return put(st.box(name, size, loc, mat, bevel=bevel, rot=rot))

    y0, y1, z0, z1 = MOUTH
    my, mw_ = (y0 + y1) / 2, y1 - y0
    # the maker's plate above the tunnel: covered by a blank plate (no legible text)
    bx("scanner_blank_plate", (0.008, 0.30, 0.10), (0.186, -0.1, 1.335), m["cover"], bevel=0.003)
    # the tunnel: a black void behind the curtain, a header bar, the slot under the belt closed
    bx("scanner_void", (0.004, mw_ + 0.01, z1 - z0 + 0.02), (0.09, my, (z0 + z1) / 2), m["dark"])
    bx("scanner_header", (0.022, mw_ + 0.01, 0.024), (0.142, my, z1 - 0.006), m["hardware"], bevel=0.004)
    bx("scanner_slot", (0.006, mw_ + 0.01, 0.17), (0.156, my, 0.49), m["bezel"], bevel=0.002)
    # lead curtain: nine overlapping strips hanging from the header, each a little turned and swung
    rnd = random.Random(7)
    n, sw = 9, 0.075
    pitch = (mw_ - sw) / (n - 1)
    for i in range(n):
        yc = y0 + sw / 2 + i * pitch
        ln = z1 - 0.018 - (BELT_Z + 0.045)
        bx(f"scanner_curtain{i}", (0.003, sw, ln), (0.134 - 0.002 * (i % 2), yc, z1 - 0.018 - ln / 2), m["curtain"],
           bevel=0.001, rot=(0, math.radians(rnd.uniform(-1.5, 1.5)), math.radians(rnd.uniform(-3.0, 3.0))))
    # the exit conveyor: belt off the tunnel, then rollers; side frames and guide rails; square legs, braces, feet
    x0, x1 = FACE + 0.005, 1.20
    half = WIDTH / 2
    bx("conv_belt", (0.40, WIDTH - 0.06, 0.016), (x0 + 0.2, CY, BELT_Z - 0.008), m["belt"], bevel=0.004)
    put(sk.cyl("conv_drum", 0.03, WIDTH - 0.06, (x0 + 0.41, CY, BELT_Z - 0.03), m["roller"], rot=(math.pi / 2, 0, 0), verts=32))
    for k in range(7):
        x = 0.64 + 0.09 * k
        put(sk.cyl(f"conv_roller{k}", 0.025, WIDTH - 0.04, (x, CY, BELT_Z - 0.025), m["roller"], rot=(math.pi / 2, 0, 0), verts=32))
    for s in (-1, 1):
        yy = CY + s * (half - 0.015)
        bx("conv_frame", (x1 - x0, 0.03, 0.09), ((x0 + x1) / 2, yy, BELT_Z - 0.035), m["steel"], bevel=0.004)
        bx("conv_guide", (x1 - x0, 0.012, 0.05), ((x0 + x1) / 2, CY + s * (half + 0.004), BELT_Z + 0.035), m["steel"], bevel=0.004)
        for lx in (0.26, 1.13):
            bx("conv_leg", (0.04, 0.04, BELT_Z - 0.08), (lx, CY + s * (half - 0.05), (BELT_Z - 0.08) / 2), m["steel"], bevel=0.004)
            put(sk.cyl("conv_foot", 0.026, 0.012, (lx, CY + s * (half - 0.05), 0.006), m["rubber"], verts=24))
        bx("conv_brace_l", (0.87, 0.03, 0.03), (0.695, CY + s * (half - 0.05), 0.12), m["steel"], bevel=0.003)
    for lx in (0.26, 1.13):
        bx("conv_brace_x", (0.03, WIDTH - 0.1, 0.03), (lx, CY, 0.12), m["steel"], bevel=0.003)
    bx("conv_stop", (0.02, WIDTH + 0.02, 0.05), (x1 + 0.01, CY, BELT_Z + 0.02), m["steel"], bevel=0.005)
    # two nested trays waiting on the rollers, long side along the run
    t0 = put(st.tray("conv_tray0", (0.885, CY, BELT_Z + 0.001), 0.0))
    t1 = put(st.tray("conv_tray1", (0.889, CY + 0.004, BELT_Z + 0.031), 0.6))
    out["trays"] = (t0, t1)
    # the operator's monitor on a bracket from the housing's room-side flank, set back from the tunnel face (so the
    # end-of-bench two-shot does not cut a glowing screen at its edge), turned to the operator and the room
    side_y = -0.56                                   # the housing's flank facing the bench (prop -Y)
    mx, mz = -0.44, 1.28
    face_deg = math.degrees(math.atan2(-0.35, 0.94))
    yaw = math.radians(face_deg)
    fwd = Vector((math.cos(yaw), math.sin(yaw), 0.0))
    c = Vector((mx, side_y - 0.22, mz))
    bx("mon_wallplate", (0.12, 0.012, 0.16), (mx, side_y - 0.006, mz - 0.06), m["steel_dark"], bevel=0.003)
    bx("mon_arm", (0.035, 0.17, 0.03), (mx, side_y - 0.095, mz - 0.07), m["steel_dark"], bevel=0.008)
    put(sk.cyl("mon_pivot", 0.02, 0.06, (mx - 0.005, side_y - 0.18, mz - 0.05), m["steel_dark"], verts=24))
    bx("mon_vesa", (0.03, 0.1, 0.1), tuple(c - fwd * 0.035), m["steel_dark"], bevel=0.005, rot=(0, 0, yaw))
    bx("mon_body", (0.045, 0.40, 0.27), tuple(c), m["bezel"], bevel=0.007, rot=(0, math.radians(-6), yaw))
    scr_m = mt.glow("scanner monitor", (0.62, 0.78, 0.95), 3.0)
    scr = bx("mon_screen", (0.002, 0.36, 0.228), tuple(c + fwd * 0.0235 + Vector((0, 0, 0.0025))), scr_m,
             rot=(0, math.radians(-6), yaw))
    out["screen"] = scr
    li = sk.area_light("mon_spill", tuple(c + fwd * 0.07), (0.3, 0.2), 5.0, (0.62, 0.78, 0.95), spread_deg=120,
                       rot=(0, math.radians(-75), yaw))         # -Z along the facing, 15 degrees down
    li.visible_camera = False
    put(li)
    out["spill"] = li
    return out
