"""The inspection room's set: shell, ceiling grid and fixtures, door, the stainless bench, wall dressing, trays and the
luggage tag. Metres, Z up, floor at z = 0. The room runs x -2.8..2.8, y -2.2..2.6, ceiling at 2.8; the bench is centred
on the origin; the door is in the left wall (x = -2.8); the X-ray scanner stands against the back wall (y = 2.6).

Every part is real geometry with a bevel where an edge can catch the troffer; small things are joined into one mesh
per part (wires, louvres) to keep the scene light.
"""
import math

import bpy  # noqa: F401  (first: bmesh and mathutils only exist once bpy is loaded)
import bmesh
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

import setkit as sk
import inspection_room_mats as mt

XW, Y0, Y1, H = 2.8, -2.2, 2.6, 2.8          # half width, front and back wall planes, ceiling height
TOP = 0.86                                    # bench top
DOOR_Y, DOOR_W, DOOR_H = 0.30, 0.915, 2.13    # door in the left wall
M = {}
CEILING = []                                  # objects a camera above the ceiling must not see


def materials():
    if M:
        return M
    M.update(
        # darker, glossier stainless with handling marks: at 0.66 the top under the troffer was a white lightbox;
        # strong brushing smears the troffer's reflection into a streak; contact darkening seats what stands on it.
        # The ghost patch is the cleaner rectangle where the tote stood (switched on for the Ch 11 return)
        steel=mt.brushed_steel("bench steel", rgb=(0.48, 0.49, 0.5), rough=0.26, smudge=0.25, aniso=0.8, contact=0.05),
        steel_top=mt.brushed_steel("bench top steel", rgb=(0.48, 0.49, 0.5), rough=0.26, smudge=0.25, aniso=0.8,
                                   contact=0.05, ghost=(0.0, -0.23, 0.3, 0.14)),
        steel_dark=mt.satin_metal("dark steel", (0.32, 0.33, 0.34), 0.4),
        hardware=mt.satin_metal("hardware", (0.55, 0.56, 0.57), 0.3),
        wall=mt.block_wall("block wall", (0.17, 0.182, 0.185), (0.075, 0.088, 0.098), 1.07, H),
        floor=mt.vinyl_floor("vinyl tile"),
        tile=mt.ceiling_tile("ceiling tile"),
        white=mt.paint("white enamel", (0.6, 0.61, 0.6), 0.45, 0.03),
        door=mt.paint("door paint", (0.07, 0.09, 0.11), 0.42, 0.05),
        frame=mt.paint("frame paint", (0.05, 0.06, 0.07), 0.4, 0.05),
        rail=mt.plastic("bumper rail", (0.06, 0.07, 0.075), 0.42),
        base=mt.rubber("cove base", (0.018, 0.018, 0.02), 0.55),
        rubber=mt.rubber("rubber"),
        tray=mt.plastic("tray plastic", (0.12, 0.125, 0.13), 0.48),
        lens_off=mt.plastic("lens off", (0.28, 0.29, 0.3), 0.3),
        cover=mt.plastic("scanner blank plate", (0.5, 0.52, 0.53), 0.45),
        smoke=mt.plastic("smoked dome", (0.008, 0.008, 0.01), 0.06, 0.8),
        dark=mt.rubber("void", (0.004, 0.004, 0.004), 0.9),
        box=mt.paint("glove box card", (0.5, 0.53, 0.58), 0.75, 0.02),
        glove=mt.plastic("nitrile", (0.08, 0.14, 0.32), 0.45),
        line=mt.paint("floor line paint", (0.42, 0.34, 0.08), 0.5, 0.02),
        cable=mt.rubber("cable", (0.012, 0.012, 0.013), 0.5),
        sign=mt.paint("sign plate", (0.46, 0.47, 0.47), 0.5, 0.01),
        sign_band=mt.paint("sign band", (0.04, 0.06, 0.1), 0.45, 0.01),
        cork=mt.paint("board", (0.16, 0.14, 0.11), 0.85, 0.15),
        sheet=mt.paper("notice paper", (0.55, 0.55, 0.53)),
        tag=mt.paper("manila tag", (0.34, 0.24, 0.12), rough=0.85, fibre=0.05),
        tag_ring=mt.paper("tag ring", (0.4, 0.3, 0.16), rough=0.8),
        twine=mt.twine("twine", (0.26, 0.21, 0.14), 0.9),
    )
    return M


# ---------------------------------------------------------------- geometry helpers

def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0)):
    return sk.box(name, size, loc, m, bevel=bevel, rot=rot)


def mesh_obj(name, bm, m, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(m)
    return ob


def add_rod(bm, a, b, r, segs=8):
    """A cylinder from a to b into a bmesh (wires, tubes)."""
    a, b = Vector(a), Vector(b)
    d = b - a
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    mtx = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=d.length, matrix=mtx)


def add_box(bm, size, loc, rot=Matrix.Identity(3)):
    mtx = Matrix.Translation(loc) @ rot.to_4x4() @ Matrix.Diagonal((*size, 1))
    bmesh.ops.create_cube(bm, size=1.0, matrix=mtx)


def bevelled(ob, width, segs=2, angle=40):
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = width, segs, "ANGLE"
    bv.angle_limit = math.radians(angle)
    ob.modifiers.new("wn", "WEIGHTED_NORMAL")
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def keep_parent(child, parent):
    bpy.context.view_layer.update()
    mw = child.matrix_world.copy()
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()
    child.matrix_world = mw


# ---------------------------------------------------------------- shell

def shell():
    m = materials()
    sk.box("floor", (2 * XW, Y1 - Y0, 0.02), (0, (Y0 + Y1) / 2, -0.01), m["floor"])
    t = 0.12
    walls = (("wall_back", (2 * XW + 2 * t, H, t), (0, Y1 + t / 2, H / 2), (math.pi / 2, 0, 0)),
             ("wall_front", (2 * XW + 2 * t, H, t), (0, Y0 - t / 2, H / 2), (math.pi / 2, 0, 0)),
             ("wall_left", (Y1 - Y0 + 2 * t, H, t), (-XW - t / 2, (Y0 + Y1) / 2, H / 2), (math.pi / 2, 0, math.pi / 2)),
             ("wall_right", (Y1 - Y0 + 2 * t, H, t), (XW + t / 2, (Y0 + Y1) / 2, H / 2), (math.pi / 2, 0, math.pi / 2)))
    for n, s, l, r in walls:
        box(n, s, l, m["wall"], rot=r)
    # cove base and the bumper rail, broken at the door
    d0, d1 = DOOR_Y - DOOR_W / 2 - 0.06, DOOR_Y + DOOR_W / 2 + 0.06
    runs = [("b", (-XW, XW), "x", Y1 - 0.006), ("f", (-XW, XW), "x", Y0 + 0.006), ("r", (Y0, Y1), "y", XW - 0.006),
            ("l1", (Y0, d0), "y", -XW + 0.006), ("l2", (d1, Y1), "y", -XW + 0.006)]
    for tag_, (a, b), axis, c in runs:
        L, mid = b - a, (a + b) / 2
        if axis == "x":
            box(f"cove_{tag_}", (L, 0.012, 0.1), (mid, c, 0.05), m["base"], bevel=0.003)
            box(f"rail_{tag_}", (L, 0.034, 0.11), (mid, c - math.copysign(0.011, c), 1.015), m["rail"], bevel=0.012)
        else:
            box(f"cove_{tag_}", (0.012, L, 0.1), (c, mid, 0.05), m["base"], bevel=0.003)
            box(f"rail_{tag_}", (0.034, L, 0.11), (c - math.copysign(0.011, c), mid, 1.015), m["rail"], bevel=0.012)
    # stainless corner guards on the two back corners
    for sx in (-1, 1):
        x = sx * (XW - 0.001)
        box("guard_a", (0.06, 0.0025, 1.4), (x - sx * 0.03, Y1 - 0.0013, 0.82), m["steel"], bevel=0.0008)
        box("guard_b", (0.0025, 0.06, 1.4), (x - sx * 0.0013, Y1 - 0.03, 0.82), m["steel"], bevel=0.0008)


# ---------------------------------------------------------------- ceiling: lay-in grid, troffers, diffuser, CCTV

XL = [-XW, -1.8, -0.6, 0.6, 1.8, XW]                       # grid lines across x (1.2 m tiles)
YL = [Y0, -2.1, -1.5, -0.9, -0.3, 0.3, 0.9, 1.5, 2.1, Y1]  # and along y (0.6 m)
TROFFERS = {"bench": ((0.0, 0.0), 1.0), "scanner": ((1.2, 1.8), 0.075), "front": ((-1.2, -1.2), 0.0)}
DIFFUSER = (1.5, 0.6)


def ceiling(main_energy=470.0):
    m = materials()
    fixtures = {(round(c[0], 2), round(c[1], 2)) for c, _ in TROFFERS.values()}
    for x0, x1 in zip(XL, XL[1:]):
        for y0, y1 in zip(YL, YL[1:]):
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            if (round(cx, 2), round(cy, 2)) in fixtures:
                continue
            if abs(cx - 1.2) < 0.01 and abs(cy - 0.6) < 0.01:      # the diffuser's cell: a half tile beside it
                CEILING.append(box("tile", (0.6, y1 - y0, 0.016), (0.9, cy, H + 0.008), m["tile"]))
                continue
            CEILING.append(box("tile", (x1 - x0, y1 - y0, 0.016), (cx, cy, H + 0.008), m["tile"]))
    bm = bmesh.new()                                           # the T-bar grid, one mesh
    for x in XL[1:-1]:
        add_box(bm, (0.024, Y1 - Y0, 0.007), (x, (Y0 + Y1) / 2, H - 0.0035))
    for y in YL[1:-1]:
        add_box(bm, (2 * XW, 0.024, 0.007), (0, y, H - 0.0035))
    add_box(bm, (0.024, 0.6, 0.007), (1.2, 0.6, H - 0.0035))  # cross tee at the diffuser
    for y in (Y0 + 0.011, Y1 - 0.011):                         # wall angle round the edge
        add_box(bm, (2 * XW, 0.022, 0.006), (0, y, H - 0.003))
    for x in (-XW + 0.011, XW - 0.011):
        add_box(bm, (0.022, Y1 - Y0, 0.006), (x, (Y0 + Y1) / 2, H - 0.003))
    grid = bevelled(mesh_obj("tbar_grid", bm, m["white"]), 0.0015, 2)
    CEILING.append(grid)
    for name, ((cx, cy), k) in TROFFERS.items():
        troffer(name, cx, cy, k, main_energy)
    diffuser(*DIFFUSER)
    cctv((-2.42, 2.28))


def troffer(name, cx, cy, k, main_energy):
    """A recessed 2 x 4 fluorescent troffer: painted steel door frame, prismatic lens with the three tubes showing
    through, a box housing above. k scales the light (0 = switched off)."""
    m = materials()
    bm = bmesh.new()
    w, d, f = 1.2, 0.6, 0.032
    for sx in (-1, 1):
        add_box(bm, (f, d, 0.014), (cx + sx * (w / 2 - f / 2), cy, H - 0.007))
    for sy in (-1, 1):
        add_box(bm, (w - 2 * f, f, 0.014), (cx, cy + sy * (d / 2 - f / 2), H - 0.007))
    for sx in (-1, 1):                                          # housing walls above the lens
        add_box(bm, (0.01, d - 2 * f, 0.12), (cx + sx * (w / 2 - f - 0.005), cy, H + 0.06))
    for sy in (-1, 1):
        add_box(bm, (w - 2 * f, 0.01, 0.12), (cx, cy + sy * (d / 2 - f - 0.005), H + 0.06))
    add_box(bm, (w, d, 0.01), (cx, cy, H + 0.125))
    fr = bevelled(mesh_obj(f"troffer_{name}_frame", bm, m["white"]), 0.003, 2)
    CEILING.append(fr)
    if k > 0:
        lens_m = mt.glow(f"troffer_{name}_lens", (0.84, 0.93, 1.0), 9.0 * k, pattern="tubes")
    else:
        lens_m = m["lens_off"]
    lens = box(f"troffer_{name}_lens", (w - 2 * f, d - 2 * f, 0.004), (cx, cy, H + 0.004), lens_m)
    CEILING.append(lens)
    if k > 0:
        li = sk.area_light(f"troffer_{name}_light", (cx, cy, H - 0.012), (w - 2 * f - 0.02, d - 2 * f - 0.02), main_energy * k,
                           (0.84, 0.93, 1.0), spread_deg=80)
        li.visible_camera = False
        CEILING.append(li)
    return fr


def diffuser(cx, cy):
    """A square louvred supply diffuser: stepped rings into a dark duct."""
    m = materials()
    bm = bmesh.new()
    for i, (s, z) in enumerate(((0.3, 0.0), (0.235, 0.012), (0.17, 0.024), (0.105, 0.036))):
        wdt = 0.05 if i == 0 else 0.032
        for sx in (-1, 1):
            add_box(bm, (wdt, 2 * s, 0.004), (cx + sx * (s - wdt / 2), cy, H - 0.004 + z))
        for sy in (-1, 1):
            add_box(bm, (2 * s - 2 * wdt, wdt, 0.004), (cx, cy + sy * (s - wdt / 2), H - 0.004 + z))
    add_box(bm, (0.08, 0.08, 0.004), (cx, cy, H + 0.044))
    ob = bevelled(mesh_obj("diffuser", bm, m["white"]), 0.0012, 1)
    CEILING.append(ob)
    CEILING.append(box("diffuser_duct", (0.6, 0.6, 0.004), (cx, cy, H + 0.08), m["dark"]))


def cctv(xy):
    m = materials()
    x, y = xy
    b = sk.cyl("cctv_base", 0.078, 0.022, (x, y, H - 0.011), m["white"], verts=40)
    bevelled(b, 0.004, 2, 60)
    d = sk.sphere("cctv_dome", 0.062, (x, y, H - 0.02), m["smoke"], segs=40)
    CEILING.extend([b, d])


# ---------------------------------------------------------------- the door and the left wall

def door():
    """Hollow-metal door in the left wall, with a wired-glass vision panel and a line of corridor light under it."""
    m = materials()
    x = -XW
    y0, y1 = DOOR_Y - DOOR_W / 2, DOOR_Y + DOOR_W / 2
    fw = 0.05
    box("door_jamb_l", (0.032, fw, DOOR_H + fw), (x + 0.016, y0 - fw / 2, (DOOR_H + fw) / 2), m["frame"], bevel=0.006)
    box("door_jamb_r", (0.032, fw, DOOR_H + fw), (x + 0.016, y1 + fw / 2, (DOOR_H + fw) / 2), m["frame"], bevel=0.006)
    box("door_head", (0.032, DOOR_W + 2 * fw, fw), (x + 0.016, DOOR_Y, DOOR_H + fw / 2), m["frame"], bevel=0.006)
    leaf_h = DOOR_H - 0.016
    leaf = box("door_leaf", (0.045, DOOR_W - 0.008, leaf_h), (x - 0.008, DOOR_Y, 0.012 + leaf_h / 2), m["door"], bevel=0.004)
    face = x - 0.008 + 0.0225                                    # the leaf's room-side face
    vy, vz, vw, vh = DOOR_Y - 0.24, 1.53, 0.12, 0.6              # vision panel on the latch side
    box("door_glass", (0.003, vw, vh), (face + 0.001, vy, vz), mt.glow("corridor glass", (0.78, 0.86, 1.0), 2.4, "wire"))
    bm = bmesh.new()
    for sy in (-1, 1):
        add_box(bm, (0.014, 0.016, vh + 0.032), (face + 0.006, vy + sy * (vw / 2 + 0.008), vz))
    for sz in (-1, 1):
        add_box(bm, (0.014, vw, 0.016), (face + 0.006, vy, vz + sz * (vh / 2 + 0.008)))
    bevelled(mesh_obj("door_glass_bead", bm, m["hardware"]), 0.003, 2)
    # lever handle on the latch side, pointing to the hinges
    hy, hz = DOOR_Y - DOOR_W / 2 + 0.07, 1.02
    sk.cyl("door_rose", 0.029, 0.012, (face + 0.006, hy, hz), m["hardware"], rot=(0, math.pi / 2, 0), verts=32)
    sk.cyl("door_stem", 0.009, 0.05, (face + 0.03, hy, hz), m["hardware"], rot=(0, math.pi / 2, 0), verts=16)
    box("door_lever", (0.018, 0.135, 0.017), (face + 0.055, hy + 0.06, hz), m["hardware"], bevel=0.006)
    box("door_kick", (0.0025, DOOR_W - 0.06, 0.25), (face + 0.0013, DOOR_Y, 0.14), m["steel"], bevel=0.001)
    for z in (0.28, 1.08, 1.9):
        sk.cyl("door_hinge", 0.009, 0.11, (face + 0.004, y1 - 0.004, z), m["hardware"], verts=16)
    box("door_closer", (0.06, 0.3, 0.06), (face + 0.03, DOOR_Y + 0.17, DOOR_H - 0.075), m["frame"], bevel=0.01)
    box("door_closer_arm", (0.022, 0.28, 0.012), (face + 0.07, DOOR_Y + 0.07, DOOR_H - 0.03), m["frame"], bevel=0.004, rot=(0, 0, 0.18))
    # corridor light: the vision panel and the gap under the door
    box("door_gap_glow", (0.002, DOOR_W - 0.02, 0.012), (x + 0.0012, DOOR_Y, 0.006), mt.glow("gap glow", (0.78, 0.86, 1.0), 6.0))
    sk.area_light("door_glass_light", (face + 0.012, vy, vz), (vh, vw), 9.0, (0.78, 0.86, 1.0), spread_deg=110, rot=(0, -math.pi / 2, 0))
    sk.area_light("door_gap_light", (face + 0.01, DOOR_Y, 0.008), (0.012, DOOR_W - 0.04), 4.0, (0.78, 0.86, 1.0), spread_deg=150,
                  rot=(0, -math.pi / 2, 0))
    # light switch, its surface conduit up to the ceiling, and a blank sign plate
    sy = DOOR_Y - DOOR_W / 2 - 0.16
    box("switch_plate", (0.007, 0.072, 0.118), (x + 0.0035, sy, 1.22), m["white"], bevel=0.002)
    box("switch_toggle", (0.012, 0.01, 0.022), (x + 0.012, sy, 1.225), m["white"], bevel=0.003)
    sk.cyl("switch_conduit", 0.0105, H - 1.28, (x + 0.013, sy, (H + 1.28) / 2), m["steel_dark"], verts=16)
    box("sign_plate", (0.004, 0.3, 0.3), (x + 0.002, -0.95, 1.58), m["sign"], bevel=0.003)
    box("sign_band", (0.0045, 0.3, 0.075), (x + 0.0024, -0.95, 1.69), m["sign_band"], bevel=0.002)
    return leaf


# ---------------------------------------------------------------- the back wall: cable tray, conduit, gloves, trays

def back_wall(jx=-1.32, gloves_xz=(1.38, 1.34), trays_xy=(1.02, Y1 - 0.3)):
    """jx: where the conduit drops to the scanner's junction box (about 0.5 m left of the scanner's centre)."""
    m = materials()
    y = Y1
    bm = bmesh.new()                                    # wire-basket cable tray, 300 mm wide, along the back wall
    zt, w, dpt = 2.46, 0.3, 0.07
    yc = y - 0.04 - w / 2
    x0, x1 = -XW + 0.01, XW - 0.01
    for yy in (yc - w / 2, yc + w / 2):
        add_rod(bm, (x0, yy, zt + dpt), (x1, yy, zt + dpt), 0.0028, 6)
        add_rod(bm, (x0, yy, zt + dpt / 2), (x1, yy, zt + dpt / 2), 0.002, 6)
    for k in range(7):
        yy = yc - w / 2 + k * w / 6
        add_rod(bm, (x0, yy, zt), (x1, yy, zt), 0.002, 6)
    xx = x0 + 0.05
    while xx < x1:
        add_rod(bm, (xx, yc - w / 2, zt), (xx, yc + w / 2, zt), 0.0022, 6)
        for yy in (yc - w / 2, yc + w / 2):
            add_rod(bm, (xx, yy, zt), (xx, yy, zt + dpt), 0.0022, 6)
        xx += 0.1
    xx = -2.4
    while xx < XW:                                      # wall brackets
        add_box(bm, (0.03, w + 0.04, 0.008), (xx, yc + 0.02, zt - 0.006))
        add_box(bm, (0.03, 0.008, 0.12), (xx, y - 0.004, zt - 0.05))
        xx += 1.2
    mesh_obj("cable_tray", bm, m["hardware"], smooth=True)
    bm = bmesh.new()                                    # cables lying in the tray
    for yy, r in ((yc - 0.08, 0.011), (yc - 0.05, 0.008), (yc + 0.03, 0.013), (yc + 0.06, 0.007)):
        add_rod(bm, (x0, yy, zt + r + 0.002), (x1, yy, zt + r + 0.002), r, 12)
    mesh_obj("tray_cables", bm, m["cable"], smooth=True)
    # conduit from the tray down to a junction box above the scanner, then flex into the scanner's back
    sk.cyl("conduit", 0.0105, zt - 1.84, (jx, y - 0.016, (zt + 1.84) / 2), m["steel_dark"], verts=16)
    box("junction_box", (0.12, 0.05, 0.12), (jx, y - 0.026, 1.78), m["steel_dark"], bevel=0.006)
    flex = sk.arc("flex_conduit", (jx, y - 0.03, 1.72), (jx + 0.08, y - 0.2, 1.452), -0.05, m["cable"], r=0.009)
    flex.data.bevel_resolution = 3
    sk.cyl("conduit2", 0.0105, zt - 0.35, (1.95, y - 0.016, (zt + 0.35) / 2), m["steel_dark"], verts=16)
    box("outlet_box", (0.075, 0.03, 0.12), (1.95, y - 0.015, 0.33), m["steel_dark"], bevel=0.004)
    box("outlet_face", (0.07, 0.006, 0.11), (1.95, y - 0.032, 0.33), m["white"], bevel=0.002)
    gloves(gloves_xz)
    tray_stack(trays_xy, 6)


def gloves(xz):
    """A wall rack with three glove boxes, gloves pulled half out of two."""
    m = materials()
    x, z = xz
    y = Y1
    bm = bmesh.new()
    add_box(bm, (0.43, 0.004, 0.06), (x, y - 0.002, z - 0.1))
    add_box(bm, (0.43, 0.095, 0.004), (x, y - 0.05, z - 0.13))
    for sx in (-1, 1):
        add_rod(bm, (x + sx * 0.212, y - 0.004, z - 0.13), (x + sx * 0.212, y - 0.095, z - 0.13), 0.003)
        add_rod(bm, (x + sx * 0.212, y - 0.095, z - 0.13), (x + sx * 0.212, y - 0.095, z - 0.05), 0.003)
    add_rod(bm, (x - 0.212, y - 0.095, z - 0.05), (x + 0.212, y - 0.095, z - 0.05), 0.003)
    mesh_obj("glove_rack", bm, m["steel"], smooth=True)
    for i, dx in enumerate((-0.137, 0.0, 0.137)):
        bx = box(f"glove_box{i}", (0.128, 0.075, 0.245), (x + dx, y - 0.048, z - 0.128 + 0.1225), m["box"], bevel=0.003)
        hole = sk.cyl(f"glove_slot{i}", 0.03, 0.004, (x + dx, y - 0.0855, z + 0.035), m["dark"], rot=(math.pi / 2, 0, 0), verts=24)
        hole.scale = (1.35, 0.55, 1.0)
        if i != 1:
            g = sk.sphere(f"glove_tuft{i}", 0.026, (x + dx + 0.004, y - 0.094, z + 0.04), m["glove"], segs=16)
            g.scale = (1.1, 0.55, 0.8)
            dp = g.modifiers.new("crumple", "DISPLACE")
            tx = bpy.data.textures.new(f"crumple{i}", "CLOUDS")
            tx.noise_scale = 0.15
            dp.texture, dp.strength = tx, 0.012


def tray(name, loc, rot_deg=0.0, m=None):
    """A grey security-screening tray: 620 x 420 x 110 mm, flared walls, rounded corners."""
    m = m or materials()["tray"]
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Diagonal((0.6, 0.4, 0.11, 1)) @ Matrix.Translation((0, 0, 0.5)))
    top = [f for f in bm.faces if f.normal.z > 0.9][0]
    for v in top.verts:                                  # flared so they nest
        v.co.x *= 1.08
        v.co.y *= 1.12
    bmesh.ops.delete(bm, geom=[top], context="FACES_ONLY")
    ob = mesh_obj(name, bm, m)
    so = ob.modifiers.new("wall", "SOLIDIFY")
    so.thickness, so.offset = 0.004, -1.0
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = 0.012, 3, "ANGLE"
    for p in ob.data.polygons:
        p.use_smooth = True
    ob.modifiers.new("wn", "WEIGHTED_NORMAL")
    ob.location = loc
    ob.rotation_euler = (0, 0, math.radians(rot_deg))
    return ob


def tray_stack(xy, n):
    x, y = xy
    for i in range(n):
        tray(f"stack_tray{i}", (x + 0.003 * ((i * 7) % 3 - 1), y + 0.002 * ((i * 5) % 3 - 1), 0.0 + i * 0.03), 90 + ((i * 3) % 5 - 2) * 0.4)


# ---------------------------------------------------------------- the bench

def bench(top=TOP):
    """A stainless inspection bench, 2.0 x 0.8 m: top sheet with a turned-down edge, round legs on bullet feet,
    an undershelf."""
    m = materials()
    s = m["steel"]
    box("bench_top", (2.0, 0.8, 0.012), (0, 0, top - 0.006), m["steel_top"], bevel=0.004)
    # the turned-down edge: its top is rolled (a 4 mm radius over three segments), so it carries a clean specular
    # line from the troffer round the top
    for n, size, loc in (("bench_edge_f", (2.0, 0.014, 0.045), (0, -0.393, top - 0.0225)),
                         ("bench_edge_b", (2.0, 0.014, 0.045), (0, 0.393, top - 0.0225)),
                         ("bench_edge_l", (0.014, 0.772, 0.045), (-0.993, 0, top - 0.0225)),
                         ("bench_edge_r", (0.014, 0.772, 0.045), (0.993, 0, top - 0.0225))):
        e = box(n, size, loc, s)
        bevelled(e, 0.004, 3, 30)
    box("bench_stiffener", (1.8, 0.06, 0.03), (0, 0, top - 0.027), s, bevel=0.003)
    for dx in (-0.93, 0.93):
        for dy in (-0.33, 0.33):
            sk.cyl("bench_leg", 0.0205, top - 0.09, (dx, dy, 0.045 + (top - 0.09) / 2), s, verts=32)
            g = sk.cyl("bench_gusset", 0.027, 0.07, (dx, dy, top - 0.05), s, verts=32)
            bevelled(g, 0.004, 2, 60)
            f = sk.cyl("bench_foot", 0.026, 0.045, (dx, dy, 0.0225), s, verts=32, r2=0.016)
            f.rotation_euler = (math.pi, 0, 0)
            sk.cyl("bench_foot_pad", 0.017, 0.006, (dx, dy, 0.003), m["rubber"], verts=24)
            sk.cyl("bench_shelf_collar", 0.026, 0.04, (dx, dy, 0.25), s, verts=32)
    box("bench_shelf", (1.92, 0.72, 0.01), (0, 0, 0.265), s, bevel=0.003)
    for sy in (-1, 1):
        box("bench_shelf_edge", (1.92, 0.012, 0.035), (0, sy * 0.354, 0.2475), s, bevel=0.004)
    tray("shelf_tray", (-0.42, 0.02, 0.27), 2.0)
    for i, dx in enumerate((0.42, 0.56)):
        box(f"shelf_box{i}", (0.128, 0.245, 0.075), (dx, 0.12, 0.27 + 0.0375), m["box"], bevel=0.003)


def bounce(energy=18.0):
    """The light the bright bench top and the floor under the troffer throw back up at the ceiling and down again,
    which six bounces at these sample counts under-deliver: one broad, very weak, cool panel just under the ceiling
    over the front half of the room, seen by nothing but diffuse light (no camera, no reflections), so the near
    floor lifts out of black without a second pool or a second highlight."""
    li = sk.area_light("bounce_fill", (0.3, -0.85, H - 0.06), (3.6, 2.2), energy, (0.8, 0.87, 1.0), spread_deg=160)
    li.visible_camera = False
    li.visible_glossy = False
    li.visible_transmission = False
    return li


def floor_line(cx=-0.95):
    """A worn painted line on the floor in front of the scanner."""
    m = materials()
    box("floor_line", (2.6, 0.05, 0.001), (cx, 1.22, 0.0005), m["line"])


def notice_board():
    """A board on the right of the door, three blank sheets pinned to it."""
    m = materials()
    x = -XW
    box("board", (0.018, 0.62, 0.45), (x + 0.009, -1.62, 1.5), m["cork"], bevel=0.004)
    box("board_frame", (0.022, 0.64, 0.47), (x + 0.008, -1.62, 1.5), m["hardware"], bevel=0.004)
    for i, (dy, dz, r) in enumerate(((-0.17, 0.04, 0.03), (0.02, 0.06, -0.02), (0.18, -0.02, 0.05))):
        box(f"sheet{i}", (0.002, 0.21, 0.297 * 0.95 if i != 1 else 0.2), (x + 0.0195, -1.62 + dy, 1.5 + dz), m["sheet"], rot=(r, 0, 0))
        sk.sphere(f"pin{i}", 0.005, (x + 0.022, -1.62 + dy, 1.5 + dz + 0.12), m["sign_band"], segs=10)


# ---------------------------------------------------------------- the luggage tag

def surface_bvh(holder):
    """A BVH of a prop's meshes in world space, for draping things onto it."""
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    verts, polys = [], []
    for o in holder.children_recursive:
        if o.type != "MESH":
            continue
        me = o.evaluated_get(dg).to_mesh()
        mw = o.matrix_world
        base = len(verts)
        verts.extend(mw @ v.co for v in me.vertices)
        polys.extend([base + i for i in p.vertices] for p in me.polygons)
        o.evaluated_get(dg).to_mesh_clear()
    return BVHTree.FromPolygons(verts, polys)


def luggage_tag(case, frame, hole=(-0.021, -0.006), angle_deg=24.0, strap=(-0.045, 0.551)):
    """A blank manila tag lying on the suitcase's top, tied with a twine loop round the top carry handle.

    `frame` maps the suitcase's own metric space (as the probe measured it: footprint centred, floor at 0, front pocket
    +X) to the world. The tag is draped onto the case by casting rays at it; its free end curls up a little."""
    m = materials()
    tree = surface_bvh(case)

    def drop(p):
        w = frame @ Vector((p[0], p[1], 0.8))
        hit = tree.ray_cast(w, Vector((0, 0, -1)))
        return hit[0].z if hit[0] else frame.translation.z + 0.515

    a = Vector((math.cos(math.radians(angle_deg)), math.sin(math.radians(angle_deg))))
    pdir = Vector((-a.y, a.x))
    hv = Vector(hole)
    L, Wd, clip, top_off = 0.096, 0.054, 0.0095, 0.0125
    outline = [(-Wd / 2, -top_off + clip), (-Wd / 2 + clip, -top_off), (Wd / 2 - clip, -top_off), (Wd / 2, -top_off + clip),
               (Wd / 2, L), (-Wd / 2, L)]
    bm = bmesh.new()
    vs = []
    for (u0, v0), (u1, v1) in zip(outline, outline[1:] + outline[:1]):
        n = max(1, int(math.hypot(u1 - u0, v1 - v0) / 0.003))
        for k in range(n):
            t = k / n
            vs.append(bm.verts.new((u0 + (u1 - u0) * t, v0 + (v1 - v0) * t, 0)))
    edges = [bm.edges.new((vs[i], vs[(i + 1) % len(vs)])) for i in range(len(vs))]
    hr = 0.0027
    hvs = [bm.verts.new((hr * math.cos(2 * math.pi * i / 20), hr * math.sin(2 * math.pi * i / 20), 0)) for i in range(20)]
    edges += [bm.edges.new((hvs[i], hvs[(i + 1) % 20])) for i in range(20)]
    bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=edges)
    # interior points so the drape and the curl bend smoothly
    for _ in range(2):
        bmesh.ops.subdivide_edges(bm, edges=[e for e in bm.edges if not e.is_boundary], cuts=1, use_grid_fill=False)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
    z0 = frame.translation.z

    def lift(t):            # mid-plane above the case: resting, the twine under the top edge, the free end curling up
        return 0.0009 + 0.0045 * max(0.0, (t - 0.066) / (L - 0.066)) ** 2 + 0.0008 * max(0.0, min(1.0, (-t - 0.002) / 0.004))

    for v in bm.verts:
        u, t = v.co.x, v.co.y
        p = hv + a * t + pdir * u
        v.co = Vector((p.x, p.y, drop(p) - z0 + lift(t)))
    for _ in range(3):                                   # paper is stiff: smooth the drape
        new = {}
        for v in bm.verts:
            nb = [e.other_vert(v).co.z for e in v.link_edges]
            new[v] = max(v.co.z, 0.5 * v.co.z + 0.5 * sum(nb) / len(nb))
        for v, z in new.items():
            v.co.z = z
    for v in bm.verts:
        v.co = frame @ v.co
    tag = mesh_obj("luggage_tag", bm, m["tag"], smooth=True)
    so = tag.modifiers.new("card", "SOLIDIFY")
    so.thickness, so.offset = 0.00055, 0.0
    # the paper reinforcing ring round the hole
    bm = bmesh.new()
    outer = [bm.verts.new((0.0072 * math.cos(2 * math.pi * i / 28), 0.0072 * math.sin(2 * math.pi * i / 28), 0)) for i in range(28)]
    inner = [bm.verts.new((hr * math.cos(2 * math.pi * i / 28), hr * math.sin(2 * math.pi * i / 28), 0)) for i in range(28)]
    for i in range(28):
        j = (i + 1) % 28
        bm.faces.new((outer[i], outer[j], inner[j], inner[i]))
    for v in bm.verts:
        u, t = v.co.x, v.co.y
        p = hv + a * t + pdir * u
        v.co = frame @ Vector((p.x, p.y, drop(p) - z0 + lift(t) + 0.000275 + 0.00013))
    ring = mesh_obj("luggage_tag_ring", bm, m["tag_ring"], smooth=True)
    rs = ring.modifiers.new("card", "SOLIDIFY")
    rs.thickness, rs.offset = 0.00025, 0.0
    # twine: up through the hole, over the carry handle, back under it and in under the tag's top edge
    sx, sz = strap
    sh = drop(hv) - z0                                   # the case's top under the hole
    under = drop(Vector((sx + 0.026, hole[1] - 0.004))) - z0
    loc = lambda p, z: frame @ Vector((p[0], p[1], z))
    pts = [loc(hv - a * 0.0012, sh + 0.0009),
           loc(hv - a * 0.0065 + pdir * 0.0015, sh + 0.0055),
           loc((sx + 0.0165, hole[1] - 0.004), sz - 0.009),
           loc((sx, hole[1] - 0.006), sz + 0.0016),
           loc((sx - 0.0165, hole[1] - 0.005), sz - 0.009),
           loc((sx - 0.003, hole[1] + 0.001), under + 0.006),
           loc(hv - a * (top_off + 0.002) - pdir * 0.001, sh + 0.0008)]
    cu = bpy.data.curves.new("twine", "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution, cu.resolution_u = "3D", 0.0009, 3, 10
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for bp, co in zip(sp.bezier_points, pts):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    sp.use_cyclic_u = True
    tw = bpy.data.objects.new("luggage_tag_twine", cu)
    bpy.context.scene.collection.objects.link(tw)
    tw.data.materials.append(m["twine"])
    # the twine's lay: about one ridge every 3 mm along the cord (its UV runs 0..1 once round the loop)
    length = sum((pts[i] - pts[i - 1]).length for i in range(len(pts))) * 1.12
    m["twine"].node_tree.nodes["twist"].outputs[0].default_value = length / 0.003
    centre = frame @ Vector((*(hv + a * L * 0.45), drop(hv + a * L * 0.45) - frame.translation.z + 0.001))
    fx = bpy.data.objects.new("tag_focus", None)
    bpy.context.scene.collection.objects.link(fx)
    fx.location = centre
    hx = bpy.data.objects.new("tag_hole_focus", None)       # the eyelet, where the twine goes through
    bpy.context.scene.collection.objects.link(hx)
    hx.location = frame @ Vector((hv.x, hv.y, sh + 0.0012))
    for o in (tag, ring, tw, fx, hx):
        keep_parent(o, case)
    return tag
