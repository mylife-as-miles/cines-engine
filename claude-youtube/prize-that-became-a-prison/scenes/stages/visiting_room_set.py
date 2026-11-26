"""The prison visiting room's set: two rooms either side of a glazed partition, a row of booths along it.

Metres, Z up, floor at z = 0. The partition runs along X at y = 0; the visitors' room is on the -Y side (y Y0..0),
the inmates' side on +Y (y 0..Y1), x -XW..XW, ceiling at H. N booths at pitch P, centred on x = BX[i]. Each booth,
on each side: a counter (dark solid surface, a painted steel fascia) on a painted block knee wall, the security glass
above it in a painted steel frame (sill, head, a mullion at every booth division, glazing stops both faces), a
full-height painted steel side baffle at each division, a visiting phone on the booth's right-hand baffle as you sit
(visitors: the +X baffle; inmates: the -X one), a visitor chair on the visitors' side and a fixed pedestal stool on
the inmates' side. A short caged fluorescent fitting over each booth's counter on both sides; only some burn.

Phones: the Tripo visiting-phone prop (steel box, handset on its hook, armoured cord: front +X in its file) in every
booth but the occupied one, whose two phones are built here (same proportions) so their handsets can be in hand.
"""
import math

import bpy  # noqa: F401  (first: bmesh and mathutils only exist once bpy is loaded)
import bmesh
from mathutils import Matrix, Vector

import props
import setkit as sk
import visiting_room_mats as mt

H, T = 2.75, 0.2                          # ceiling, wall thickness
XW = 3.6                                  # room half width (x)
Y0, Y1 = -3.6, 2.7                        # visitors' back wall face, inmates' back wall face
P, N = 1.0, 6                             # booth pitch and count
BX = [(i - (N - 1) / 2) * P for i in range(N)]
OCC = 3                                   # the occupied booth (x = 0.5)
KW = 0.1                                  # knee wall / upper wall half thickness
TOP, CT = 0.78, 0.036                     # counter top height and thickness
CD = 0.46                                 # counters run out to |y| = CD
SILL = (0.78, 0.845)                      # frame bottom rail (z)
HEAD = (1.965, 2.045)                     # frame head rail (z)
FD = 0.055                                # frame half depth (y)
GT = 0.025                                # glass thickness
MUL = 0.07                                # mullion width (x)
BAF_D, BAF_H, BAF_T = 0.80, 1.78, 0.045   # side baffles: out to |y|, height, thickness
SPLIT = 1.15                              # dado line on the walls
STOOL_Y = 0.74                            # inmates' stools (y); visitors' chairs at -CHAIR_Y
CHAIR_Y = 0.80
STOOL_Z = 0.44                            # stool seat top
PHONE_Y = 0.25                            # phone box centre |y| on its baffle
PHONE_Z = 1.05                            # bottom of the phone prop (its cord loop); box from about +0.09 to +0.30
FIT_Y = 0.42                              # fittings' centre |y| (over the counters, ahead of the sitters' faces)
FIT_L = 0.64                              # fitting length (x)
FIT_W = 210.0                             # a fitting's lamp (W) at level 1
# fitting levels per booth, visitors' side and inmates' side: the occupied booth burns, a few others glow low
LEVEL_V = [0.28, 0.0, 0.1, 1.0, 0.0, 0.22]
LEVEL_I = [0.0, 0.22, 0.0, 1.0, 0.1, 0.0]
COOL = (0.80, 0.90, 1.0)
UPPER, LOWER = (0.40, 0.405, 0.385), (0.10, 0.118, 0.13)    # pale emulsion above, satin blue-grey dado
STEEL_PAINT = (0.16, 0.175, 0.185)        # booth steel: baffles, frames
VD = dict(y=-2.35, w=0.95, h=2.1)         # visitors' door in the left wall (x = -XW)
ID = dict(x=-2.15, w=0.95, h=2.1)         # inmates' door in the back wall (y = Y1)
CLOCK = (1.75, Y1, 2.12)

M = {}
LIGHTS = {}
PARTS = {}


def materials():
    if M:
        return M
    M.update(
        wall_x=mt.block_wall("vr block x", UPPER, LOWER, SPLIT, "x", scuffs=0.8, grime=0.25),
        wall_y=mt.block_wall("vr block y", UPPER, LOWER, SPLIT, "y", scuffs=0.8, grime=0.25),
        knee=mt.block_wall("vr knee wall", LOWER, LOWER, 5.0, "x", scuffs=1.2, grime=0.35),
        floor_v=mt.tile_floor("vr visit floor", c1=(0.2, 0.2, 0.192), c2=(0.165, 0.168, 0.162)),
        floor_i=mt.floor_paint("vr inmate floor", paint=(0.085, 0.092, 0.092), bare=(0.15, 0.145, 0.135),
                               path_w=-1.0, joint=3.0, joint_off=0.4, rough=0.55),
        soffit=mt.soffit("vr soffit", (0.3, 0.302, 0.295)),
        steel=mt.paint("booth steel", STEEL_PAINT, 0.42, 0.05, 0.3, edge_rgb=(0.3, 0.3, 0.3)),
        frame=mt.paint("frame steel", (0.085, 0.095, 0.105), 0.38, 0.04, 0.25, edge_rgb=(0.22, 0.22, 0.22)),
        kick=mt.paint("kick paint", (0.03, 0.033, 0.036), 0.35, 0.04, 0.35, edge_rgb=(0.12, 0.12, 0.12)),
        counter=mt.solid_surface("counter top", (0.07, 0.072, 0.073), 0.55),
        glass=mt.security_glass("security glass"),
        glass_edge=mt.glass_edge("glass edge"),
        stainless=mt.brushed("phone stainless", (0.52, 0.53, 0.54), 0.3, 0.6, 0.2),
        hardware=mt.satin_metal("hardware", (0.5, 0.51, 0.52), 0.3),
        screw=mt.satin_metal("screw heads", (0.3, 0.3, 0.31), 0.35),
        armour=mt.armour("armoured cord"),
        handset=mt.moulded("handset plastic"),
        fit_white=mt.paint("fitting enamel", (0.42, 0.42, 0.4), 0.4, 0.03, 0.35),
        wire=mt.satin_metal("cage wire", (0.36, 0.37, 0.38), 0.42),
        opal=mt.opal("diffuser off"),
        stool=mt.paint("stool paint", (0.05, 0.056, 0.062), 0.4, 0.04, 0.3, edge_rgb=(0.25, 0.25, 0.25)),
        door=mt.paint("door paint", (0.12, 0.135, 0.15), 0.4, 0.05, 0.2, edge_rgb=(0.2, 0.2, 0.2)),
        void=mt.rubber("void", (0.003, 0.003, 0.003), 0.9),
        rubber=mt.rubber("grommet", (0.012, 0.012, 0.013), 0.6),
        conduit=mt.satin_metal("conduit", (0.34, 0.35, 0.36), 0.42),
        dome=mt.plastic("smoked dome", (0.008, 0.008, 0.01), 0.06, 0.8),
        white=mt.paint("white paint", (0.45, 0.45, 0.43), 0.45, 0.03, 0.3),
        clock_face=mt.paint("clock face", (0.5, 0.5, 0.47), 0.65, 0.01, 0.1),
        clock_rim=mt.plastic("clock rim", (0.02, 0.02, 0.022), 0.35),
        ink=mt.rubber("clock hands", (0.01, 0.01, 0.012), 0.5),
        vent=mt.paint("vent paint", (0.3, 0.3, 0.29), 0.5, 0.03, 0.3),
    )
    # a hidden holder for every material, so none is an orphan when the cast's build purges unused data
    me = bpy.data.meshes.new("material_keeper")
    me.from_pydata([(0, 0, -9), (0.01, 0, -9), (0, 0.01, -9)], [], [(0, 1, 2)])
    keep = bpy.data.objects.new("material_keeper", me)
    bpy.context.scene.collection.objects.link(keep)
    for mm in M.values():
        keep.data.materials.append(mm)
    keep.hide_render = keep.hide_viewport = True
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
    for mm in (m if isinstance(m, (list, tuple)) else [m]):
        ob.data.materials.append(mm)
    return ob


def add_rod(bm, a, b, r, segs=8):
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


def empty(name, loc, rot_z=0.0):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.location = loc
    e.rotation_euler = (0, 0, rot_z)
    return e


def area(name, loc, size, energy, colour=COOL, spread=180, rot=(0, 0, 0), camera=False, glossy=True):
    li = sk.area_light(name, loc, size, energy, colour, spread_deg=spread, rot=rot)
    li.visible_camera = camera
    li.visible_glossy = glossy
    LIGHTS[name] = li
    return li


def point(name, loc, energy, colour, radius=0.03):
    li = bpy.data.lights.new(name, "POINT")
    li.energy, li.color, li.shadow_soft_size = energy, colour, radius
    ob = bpy.data.objects.new(name, li)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.visible_camera = False
    LIGHTS[name] = ob
    return ob


def curve_tube(name, pts, r, m, res=4, uv_len=True):
    """A smooth tube through points (a cable, a cord): a bevelled NURBS-free Bezier with auto handles."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution = "3D", r, res
    cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for p, co in zip(sp.bezier_points, pts):
        p.co = co
        p.handle_left_type = p.handle_right_type = "AUTO"
    ob = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(m)
    return ob


# ---------------------------------------------------------------- walls
def wall_run(name, axis, plane, sign, a0, a1, openings, m, z1=H, thick=T):
    """A straight wall whose room face is the plane (x = plane for axis "y", y = plane for axis "x"); its body lies
    on the `sign` side of that plane. openings: (centre, width, height[, sill]) along the run."""
    pieces, cur = [], a0
    for op in sorted(openings):
        c, w, h = op[:3]
        z0 = op[3] if len(op) > 3 else 0.0
        s, e = c - w / 2, c + w / 2
        if s > cur:
            pieces.append((cur, s, 0.0, z1))
        pieces.append((s, e, h, z1))
        if z0 > 0:
            pieces.append((s, e, 0.0, z0))
        cur = e
    if cur < a1:
        pieces.append((cur, a1, 0.0, z1))
    n = plane + sign * thick / 2
    for i, (s, e, za, zb) in enumerate(pieces):
        L, mid, hh, zc = e - s, (s + e) / 2, zb - za, (za + zb) / 2
        if axis == "y":
            box(f"{name}_{i}", (thick, L, hh), (n, mid, zc), m)
        else:
            box(f"{name}_{i}", (L, thick, hh), (mid, n, zc), m)


def kick_run(name, axis, plane, sign, a0, a1, gaps, m, h=0.12):
    """A dark painted kick plate along a wall, broken at door openings (gaps: (centre, width))."""
    cur, runs = a0, []
    for c, w in sorted(gaps):
        s, e = c - w / 2 - 0.07, c + w / 2 + 0.07
        if s > cur:
            runs.append((cur, s))
        cur = e
    if cur < a1:
        runs.append((cur, a1))
    off = plane - sign * 0.006
    for i, (s, e) in enumerate(runs):
        if axis == "y":
            box(f"{name}_{i}", (0.012, e - s, h), (off, (s + e) / 2, h / 2), m, bevel=0.003)
        else:
            box(f"{name}_{i}", (e - s, 0.012, h), ((s + e) / 2, off, h / 2), m, bevel=0.003)


def shell():
    m = materials()
    box("floor_v", (2 * XW, -Y0, 0.02), (0, Y0 / 2, -0.01), m["floor_v"])
    box("floor_i", (2 * XW, Y1, 0.02), (0, Y1 / 2, -0.01), m["floor_i"])
    box("ceiling", (2 * XW + 2 * T, Y1 - Y0 + 2 * T, 0.15), (0, (Y0 + Y1) / 2, H + 0.075), m["soffit"])
    wall_run("wall_l", "y", -XW, -1, Y0 - T, Y1 + T, [(VD["y"], VD["w"] + 0.1, VD["h"] + 0.05)], m["wall_y"])
    wall_run("wall_r", "y", XW, +1, Y0 - T, Y1 + T, [], m["wall_y"])
    wall_run("wall_near", "x", Y0, -1, -XW, XW, [], m["wall_x"])
    wall_run("wall_back", "x", Y1, +1, -XW, XW, [(ID["x"], ID["w"] + 0.1, ID["h"] + 0.05)], m["wall_x"])
    kick_run("kick_l_v", "y", -XW, -1, Y0, -KW, [(VD["y"], VD["w"] + 0.1)], m["kick"])
    kick_run("kick_l_i", "y", -XW, -1, KW, Y1, [], m["kick"])
    kick_run("kick_r_v", "y", XW, +1, Y0, -KW, [], m["kick"])
    kick_run("kick_r_i", "y", XW, +1, KW, Y1, [], m["kick"])
    kick_run("kick_near", "x", Y0, -1, -XW, XW, [], m["kick"])
    kick_run("kick_back", "x", Y1, +1, -XW, XW, [(ID["x"], ID["w"] + 0.1)], m["kick"])


# ---------------------------------------------------------------- the partition and the booths
def partition():
    """Knee wall, counters, the glazed frame and the upper wall; solid block piers beyond the row."""
    m = materials()
    x0, x1 = BX[0] - P / 2, BX[-1] + P / 2
    # the knee wall (block) under the counters, and the upper wall over the frame's head, the full room width
    box("knee_wall", (2 * XW, 2 * KW, TOP - CT), (0, 0, (TOP - CT) / 2), m["knee"])
    box("upper_wall", (2 * XW, 2 * KW, H - HEAD[1]), (0, 0, (H + HEAD[1]) / 2), m["wall_x"])
    for s, (a, b) in ((-1, (-XW, x0 - BAF_T / 2)), (1, (x1 + BAF_T / 2, XW))):
        box(f"pier_{s}", (b - a, 2 * KW, HEAD[1] - TOP + CT + 0.002), ((a + b) / 2, 0, (TOP - CT + HEAD[1]) / 2), m["wall_x"])
    for sy in (-1, 1):
        y_in, y_out = sy * FD, sy * CD
        cy = (y_in + y_out) / 2
        top = box(f"counter_{sy}", (x1 - x0 + BAF_T, abs(y_out - y_in), CT), (0, cy, TOP - CT / 2), m["counter"])
        bevelled(top, 0.006, 3, 30)
        # a painted steel fascia under the counter's front edge, set back 6 mm
        box(f"fascia_{sy}", (x1 - x0, 0.016, 0.07), (0, y_out - sy * 0.014, TOP - CT - 0.035), m["steel"], bevel=0.003)
        # the counter's front edge: a rounded nosing
        sk.cyl(f"nosing_{sy}", CT / 2, x1 - x0 + BAF_T, (0, y_out, TOP - CT / 2), m["counter"], rot=(0, math.pi / 2, 0), verts=20)
        kick_run(f"kick_knee_{sy}", "x", sy * KW, -sy, x0, x1, [], m["kick"])
    # the frame: sill and head rails the length of the row, a mullion at every booth division
    for nm, (za, zb) in (("sill", SILL), ("head", HEAD)):
        box(f"frame_{nm}", (x1 - x0 + MUL, 2 * FD, zb - za), (0, 0, (za + zb) / 2), m["frame"], bevel=0.004)
    gz0, gz1 = SILL[1] - 0.012, HEAD[0] + 0.012
    for k in range(N + 1):
        x = x0 + k * P
        box(f"mullion_{k}", (MUL, 2 * FD, HEAD[0] - SILL[1]), (x, 0, (SILL[1] + HEAD[0]) / 2), m["frame"], bevel=0.004)
    # the glass, one pane per bay, its edges green where they show; glazing stops both faces; tamper screws
    bm_stop = bmesh.new()
    screws = bmesh.new()
    for i, bx in enumerate(BX):
        w = P - MUL + 0.024
        pane = box(f"glass_{i}", (w, GT, gz1 - gz0), (bx, 0, (gz0 + gz1) / 2), m["glass"])
        pane.data.materials.append(m["glass_edge"])
        for poly in pane.data.polygons:
            if abs(poly.normal.y) < 0.5:
                poly.material_index = 1
        pane.visible_shadow = False
        PARTS.setdefault("glass", []).append(pane)
        iw, ih = P - MUL, HEAD[0] - SILL[1]
        cz = (SILL[1] + HEAD[0]) / 2
        for sy in (-1, 1):
            yy = sy * (GT / 2 + 0.009)
            for sx in (-1, 1):
                add_box(bm_stop, (0.018, 0.018, ih), (bx + sx * (iw / 2 - 0.009), yy, cz))
            for sz in (-1, 1):
                add_box(bm_stop, (iw, 0.018, 0.018), (bx, yy, cz + sz * (ih / 2 - 0.009)))
            for sx in (-1, 1):
                for zz in (SILL[1] + 0.12, cz, HEAD[0] - 0.12):
                    add_rod(screws, (bx + sx * (iw / 2 - 0.009), sy * (GT / 2 + 0.0175), zz),
                            (bx + sx * (iw / 2 - 0.009), sy * (GT / 2 + 0.0205), zz), 0.0045, 10)
    bevelled(mesh_obj("glazing_stops", bm_stop, m["frame"]), 0.003, 2)
    mesh_obj("stop_screws", screws, m["screw"], smooth=True)
    # the frame's face screws on the mullions (both sides)
    screws = bmesh.new()
    for k in range(N + 1):
        x = x0 + k * P
        for sy in (-1, 1):
            for zz in (SILL[1] + 0.06, 1.4, HEAD[0] - 0.06):
                add_rod(screws, (x, sy * FD, zz), (x, sy * (FD + 0.003), zz), 0.005, 10)
    mesh_obj("mullion_screws", screws, m["screw"], smooth=True)


def baffles():
    """Full-height painted steel side panels between the booths on both sides: a rounded steel nosing on the front
    edge, a dark kick at the floor, fixing angles to the frame."""
    m = materials()
    x0 = BX[0] - P / 2
    for k in range(N + 1):
        x = x0 + k * P
        for sy in (-1, 1):
            y_in, y_out = sy * FD, sy * BAF_D
            cy, L = (y_in + y_out) / 2, abs(y_out - y_in)
            b = box(f"baffle_{k}_{sy}", (BAF_T, L, BAF_H), (x, cy, BAF_H / 2), m["steel"])
            bevelled(b, 0.006, 3, 30)
            sk.cyl(f"baffle_nose_{k}_{sy}", BAF_T / 2 + 0.004, BAF_H - 0.01, (x, y_out, BAF_H / 2), m["frame"], verts=20)
            sk.sphere(f"baffle_cap_{k}_{sy}", BAF_T / 2 + 0.004, (x, y_out, BAF_H - 0.006), m["frame"], segs=20)
            box(f"baffle_kick_{k}_{sy}", (BAF_T + 0.006, L - 0.02, 0.1), (x, cy - sy * 0.01, 0.05), m["kick"], bevel=0.002)
            box(f"baffle_cap_rail_{k}_{sy}", (BAF_T + 0.008, L, 0.014), (x, cy, BAF_H - 0.005), m["frame"], bevel=0.003)


def stool(i):
    """A fixed pedestal stool (inmates' side): a floor flange bolted down, a steel post, a round seat with a rolled
    edge."""
    m = materials()
    x, y = BX[i], STOOL_Y
    f = sk.cyl(f"stool{i}_flange", 0.11, 0.012, (x, y, 0.006), m["stool"], verts=40)
    bevelled(f, 0.003, 2, 40)
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        sk.cyl(f"stool{i}_bolt", 0.009, 0.01, (x + 0.08 * math.cos(a), y + 0.08 * math.sin(a), 0.016), m["screw"], verts=6)
    sk.cyl(f"stool{i}_post", 0.032, STOOL_Z - 0.06, (x, y, (STOOL_Z - 0.06) / 2 + 0.01), m["stool"], verts=28)
    sk.cyl(f"stool{i}_cone", 0.06, 0.05, (x, y, STOOL_Z - 0.062), m["stool"], verts=32, r2=0.035)
    s = sk.cyl(f"stool{i}_seat", 0.175, 0.04, (x, y, STOOL_Z - 0.02), m["stool"], verts=56)
    bevelled(s, 0.012, 4, 30)
    PARTS.setdefault("stools", []).append(s)


def chair(xy, facing_deg, val=0.9, name="vchair"):
    """The visitor chair prop, turned so its front looks along `facing_deg` (world, 0 = +X). Its front in the file
    is found from the backrest (from the back toward the seat)."""
    h = props.load("visitor-chair", size=0.82, axis="z", loc=(0, 0, 0), sat=0.5, val=val, rough_add=0.12)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in h.children_recursive:
        if o.type == "MESH":
            me = o.evaluated_get(dg).to_mesh()
            pts += [o.matrix_world @ v.co for v in me.vertices]
            o.evaluated_get(dg).to_mesh_clear()
    back = [p for p in pts if p.z > 0.62]
    seat = [p for p in pts if 0.36 < p.z < 0.46]
    cb = sum(back, Vector()) / len(back)
    cs = sum(seat, Vector()) / len(seat)
    sxx = sum((p.x - cb.x) ** 2 for p in back)
    syy = sum((p.y - cb.y) ** 2 for p in back)
    sxy = sum((p.x - cb.x) * (p.y - cb.y) for p in back)
    ang = 0.5 * math.atan2(2 * sxy, sxx - syy)
    n = Vector((-math.sin(ang), math.cos(ang), 0))
    if n.dot(cs - cb) < 0:
        n = -n
    front = math.degrees(math.atan2(n.y, n.x))
    turn = facing_deg - front
    # the seat's centre relative to the footprint centre, so the chair can be placed by its seat
    off = Vector((cs.x, cs.y, 0))
    h.name = name
    h.location = (xy[0], xy[1], 0.0)
    h.rotation_euler = (0, 0, math.radians(turn))
    for o in h.children_recursive:
        for slot in getattr(o, "material_slots", []):
            mt.tune_prop(slot.material, spec=0.3, rough_floor=0.45)
    h["seat_off"] = list(Matrix.Rotation(math.radians(turn), 3, "Z") @ off)
    print(f"VISIT chair {name}: file front {front:.1f} deg, turned {turn:.1f} deg, seat offset "
          f"{tuple(round(v, 3) for v in h['seat_off'])}", flush=True)
    return h


def phone_prop(name, x_face, y, facing):
    """The visiting-phone prop hung on a baffle face at x = x_face, its front looking along +X (facing = +1) or -X
    (facing = -1). The file's front is +X and its back plane is 0.049 m behind the footprint centre."""
    turn = 0.0 if facing > 0 else 180.0
    h = props.load("visiting-phone", size=0.30, axis="z", loc=(x_face + facing * 0.049, y, PHONE_Z), turn_deg=turn,
                   sat=0.55, val=0.85, rough_add=0.08)
    h.name = name
    for o in h.children_recursive:
        for slot in getattr(o, "material_slots", []):
            mt.tune_prop(slot.material, spec=0.4)
    return h


def phone_box(name, x_face, y, facing):
    """A phone like the prop, built so its handset can be in hand: a brushed stainless wall box (0.04 x 0.14 x
    0.21 m, its front along +X * facing) on the baffle, tamper screws, the empty cradle hook, the cord's ferrule
    and grommet under the box. Returns the cord's exit point (world)."""
    m = materials()
    z0, z1 = PHONE_Z + 0.09, PHONE_Z + 0.30
    cz = (z0 + z1) / 2
    d = 0.04
    xc = x_face + facing * d / 2
    b = box(f"{name}_box", (d, 0.14, z1 - z0), (xc, y, cz), m["stainless"])
    bevelled(b, 0.007, 3, 30)
    fx = x_face + facing * d
    for sy in (-1, 1):
        for zz in (z0 + 0.018, z1 - 0.018):
            sk.cyl(f"{name}_screw", 0.0042, 0.003, (fx + facing * 0.001, y + sy * 0.055, zz), m["screw"],
                   rot=(0, math.pi / 2, 0), verts=12)
    # the cradle: a stainless hook plate standing off the front, a lip at its bottom (empty)
    hp = box(f"{name}_hook", (0.012, 0.05, 0.09), (fx + facing * 0.006, y + 0.02, z1 - 0.07), m["stainless"])
    bevelled(hp, 0.003, 2, 30)
    lip = box(f"{name}_hook_lip", (0.03, 0.05, 0.012), (fx + facing * 0.022, y + 0.02, z1 - 0.112), m["stainless"])
    bevelled(lip, 0.003, 2, 30)
    # ferrule and grommet where the armoured cord leaves the box's underside
    ex = Vector((xc + facing * 0.006, y + 0.02, z0 - 0.012))
    sk.cyl(f"{name}_grommet", 0.011, 0.006, (ex.x, ex.y, z0 - 0.003), m["rubber"], verts=20)
    sk.cyl(f"{name}_ferrule", 0.0085, 0.022, (ex.x, ex.y, z0 - 0.015), m["hardware"], verts=20)
    return Vector((ex.x, ex.y, z0 - 0.026))


def handset(name):
    """A black prison handset in its own frame: long axis +Y (mouthpiece at -Y, earpiece at +Y), the cups facing
    -Z (toward the face), +X across. 0.2 m long. The cord leaves the mouthpiece end's bottom. Returns the root
    empty; its children: the body. `cord_local` (on the root) is the cord's entry point in the handset frame."""
    m = materials()
    root = empty(name, (0, 0, 0))
    bm = bmesh.new()
    # the handle: a bar 0.034 x 0.13 x 0.024, a little arched away from the face
    add_box(bm, (0.032, 0.13, 0.024), (0, 0, 0.004))
    # the two cups: squat cylinders whose axes face the face (-Z), joined to the handle by short necks
    for yy, r, hh in ((0.072, 0.03, 0.034), (-0.072, 0.027, 0.03)):
        bmesh.ops.create_cone(bm, cap_ends=True, segments=28, radius1=r, radius2=r * 0.92, depth=hh,
                              matrix=Matrix.Translation((0, yy, -0.008)))
        add_box(bm, (0.03, 0.03, 0.026), (0, yy * 0.8, 0.0))
    ob = mesh_obj(f"{name}_body", bm, m["handset"])
    rm = ob.modifiers.new("remesh", "REMESH")
    rm.mode, rm.voxel_size = "VOXEL", 0.0035
    sm = ob.modifiers.new("smooth", "CORRECTIVE_SMOOTH")
    sm.iterations, sm.factor = 6, 0.5
    sub = ob.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = 1
    for p in ob.data.polygons:
        p.use_smooth = True
    ob.parent = root
    # the perforated ear and mouth caps: dark discs with a ring of holes, flush on the cups' faces
    for yy, r in ((0.072, 0.024), (-0.072, 0.021)):
        c = sk.cyl(f"{name}_cap", r, 0.002, (0, yy, -0.0262), m["void"], verts=28)
        c.parent = root
        hb = bmesh.new()
        for k in range(8):
            a = 2 * math.pi * k / 8
            add_rod(hb, (r * 0.55 * math.cos(a), yy + r * 0.55 * math.sin(a), -0.0272),
                    (r * 0.55 * math.cos(a), yy + r * 0.55 * math.sin(a), -0.0262), 0.0022, 8)
        add_rod(hb, (0, yy, -0.0272), (0, yy, -0.0262), 0.0025, 8)
        holes = mesh_obj(f"{name}_holes", hb, m["handset"], smooth=True)
        holes.parent = root
    # the cord's strain relief at the mouthpiece end
    sr = sk.cyl(f"{name}_relief", 0.008, 0.03, (0, -0.104, 0.002), m["hardware"], rot=(math.pi / 2, 0, 0), verts=16)
    sr.parent = root
    root["cord_local"] = (0.0, -0.118, 0.002)
    return root


def cord(name, a, b, b_dir, sag=0.2):
    """The armoured cord from a (the box's ferrule) down out of the box, swinging low, and up into b (the handset's
    strain relief), arriving along b_dir (the direction it leaves the handset)."""
    m = materials()
    a, b, b_dir = Vector(a), Vector(b), Vector(b_dir).normalized()
    lo = min(a.z, b.z) - sag
    mid = a.lerp(b, 0.45)
    mid.z = lo
    pts = [a, a + Vector((0, 0, -0.07)), mid, b + b_dir * 0.07, b]
    ob = curve_tube(name, [tuple(p) for p in pts], 0.0058, m["armour"], res=3)
    return along_mesh(ob)


def along_mesh(ob, samples=24):
    """Turn a bevelled curve object into a mesh carrying a float attribute "along" (metres along the curve's
    centreline at each vertex), so a material can put rings along it (the armoured cord's coils)."""
    import numpy as np
    from mathutils.geometry import interpolate_bezier
    sp = ob.data.splines[0]
    bp = sp.bezier_points
    line = []
    for a, b in zip(bp, bp[1:]):
        seg = interpolate_bezier(a.co, a.handle_right, b.handle_left, b.co, samples)
        line += [Vector(p) for p in (seg if not line else seg[1:])]
    L = np.array([tuple(p) for p in line])
    cum = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(L, axis=0), axis=1))])
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    V = np.array([tuple(v.co) for v in me.vertices])
    A, B = L[:-1], L[1:]
    AB = B - A
    t = np.clip(np.einsum("vsk,sk->vs", V[:, None, :] - A[None], AB) / np.maximum((AB ** 2).sum(1), 1e-12), 0, 1)
    P = A[None] + t[..., None] * AB[None]
    dist = np.linalg.norm(V[:, None, :] - P, axis=2)
    k = dist.argmin(1)
    s_ = cum[k] + t[np.arange(len(V)), k] * np.linalg.norm(AB[k], axis=1)
    at = me.attributes.new("along", "FLOAT", "POINT")
    at.data.foreach_set("value", s_.astype(np.float32))
    for poly in me.polygons:
        poly.use_smooth = True
    mats = list(ob.data.materials)
    name, mw = ob.name, ob.matrix_world.copy()
    bpy.data.objects.remove(ob)
    new = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(new)
    new.matrix_world = mw
    if not me.materials:
        for mm in mats:
            me.materials.append(mm)
    return new


def fitting(name, x, y, level):
    """A short caged fluorescent fitting surface-mounted on the soffit along X: an enamel body, an opal diffuser
    (glowing when lit, its ends darker), a wire guard of hoops and runners, a down light and a faint up light."""
    m = materials()
    L = FIT_L
    box(f"{name}_body", (L, 0.15, 0.05), (x, y, H - 0.025), m["fit_white"], bevel=0.008)
    for s in (-1, 1):
        box(f"{name}_cap", (0.022, 0.13, 0.075), (x + s * (L / 2 - 0.02), y, H - 0.06), m["fit_white"], bevel=0.006)
    lens = mt.glow(f"{name}_lens", COOL, 8.0 * level, ends=0.5, axis="Z", half=L / 2 - 0.03) if level > 0 else m["opal"]
    if level > 0:
        PARTS.setdefault("lens", {})[name] = lens
    d = sk.cyl(f"{name}_diffuser", 0.048, L - 0.05, (x, y, H - 0.056), lens, rot=(0, math.pi / 2, 0), verts=40)
    d.scale = (0.82, 1.0, 1.0)
    d.visible_shadow = False
    bm = bmesh.new()
    cz, r = H - 0.052, 0.072
    arc = lambda a: (r * math.cos(a), cz - r * math.sin(a))
    nh = 5
    for k in range(nh):
        xx = x - (L / 2 - 0.06) + k * (L - 0.12) / (nh - 1)
        pts = [arc(math.pi * j / 10) for j in range(11)]
        for (y0, z0), (y1, z1) in zip(pts, pts[1:]):
            add_rod(bm, (xx, y + y0, z0), (xx, y + y1, z1), 0.0026, 6)
    for a in (0.14, 0.32, 0.5, 0.68, 0.86):
        y0, z0 = arc(math.pi * a)
        add_rod(bm, (x - L / 2 + 0.04, y + y0, z0), (x + L / 2 - 0.04, y + y0, z0), 0.0024, 6)
    mesh_obj(f"{name}_cage", bm, m["wire"], smooth=True)
    if level > 0:
        area(f"{name}_down", (x, y, H - 0.105), (L - 0.1, 0.07), FIT_W * level, COOL, spread=120)
        area(f"{name}_up", (x, y, H - 0.11), (L, 0.3), 6.0 * level, COOL, spread=180, rot=(math.pi, 0, 0), glossy=False)


def ceiling():
    m = materials()
    for i, bx in enumerate(BX):
        fitting(f"fitv{i}", bx, -FIT_Y, LEVEL_V[i])
        fitting(f"fiti{i}", bx, FIT_Y, LEVEL_I[i])
    # a conduit run feeding each row of fittings, with junction boxes
    for sy in (-1, 1):
        y = sy * (FIT_Y + 0.13)
        sk.cyl(f"conduit_{sy}", 0.011, 2 * XW, (0, y, H - 0.012), m["conduit"], rot=(0, math.pi / 2, 0), verts=16)
        bm = bmesh.new()
        for bx in BX:
            add_box(bm, (0.075, 0.075, 0.04), (bx + 0.42, y, H - 0.02))
            add_rod(bm, (bx + 0.2, y, H - 0.012), (bx + 0.2, sy * (FIT_Y + 0.075), H - 0.012), 0.009, 10)
        bevelled(mesh_obj(f"conduit_hw_{sy}", bm, m["conduit"]), 0.003, 1)
    # the visitors' room's own fittings further back (off), and two CCTV domes
    for k, x in enumerate((-1.8, 1.2)):
        fitting(f"fitback{k}", x, -2.3, 0.0)
    cctv("cctv_v", (-2.9, -1.4))
    cctv("cctv_i", (2.9, 1.9))


def cctv(name, xy):
    m = materials()
    x, y = xy
    b = sk.cyl(name + "_base", 0.075, 0.022, (x, y, H - 0.011), m["white"], verts=40)
    bevelled(b, 0.004, 2, 60)
    sk.sphere(name + "_dome", 0.058, (x, y, H - 0.022), m["dome"], segs=40)


# ---------------------------------------------------------------- doors, clock, vent
def door_leaf(name, centre, axis, sign, w, h, glow_rgb, glow_s):
    """A painted steel door in an opening (wall face plane at `centre`'s axis coordinate), a pressed-steel frame, a
    wired-glass vision panel with the corridor's light behind it, a kick plate, a lever and a lock plate. `sign`:
    the side the room is on (-1 or +1) along the wall's normal."""
    m = materials()
    cx, cy = centre
    ft = T + 0.03

    def bx(nm, size_along, size_n, size_z, along, n, z, mat, bev=0.004):
        if axis == "x":      # wall runs along X, normal along Y
            return box(nm, (size_along, size_n, size_z), (cx + along, cy + n, z), mat, bev)
        return box(nm, (size_n, size_along, size_z), (cx + n, cy + along, z), mat, bev)
    for s in (-1, 1):
        bx(f"{name}_jamb", 0.05, ft, h + 0.05, s * (w / 2 + 0.025), -sign * T / 2, (h + 0.05) / 2, m["frame"])
    bx(f"{name}_head", w + 0.1, ft, 0.05, 0.0, -sign * T / 2, h + 0.025, m["frame"])
    bx(f"{name}_leaf", w - 0.006, 0.05, h - 0.012, 0.0, -sign * 0.04, 0.008 + (h - 0.012) / 2, m["door"])
    gw, gh, gz = 0.12, 0.5, 1.5
    g = bx(f"{name}_glass", gw, 0.054, gh, -w / 2 + 0.2, -sign * 0.04, gz, mt.wired_glow(f"{name} glass", glow_rgb, glow_s), 0.0)
    for s in (-1, 1):
        bx(f"{name}_bead", 0.016, 0.01, gh + 0.032, -w / 2 + 0.2 + s * (gw / 2 + 0.008), -sign * 0.011, gz, m["hardware"], 0.003)
        bx(f"{name}_bead", gw, 0.01, 0.016, -w / 2 + 0.2, -sign * 0.011, gz + s * (gh / 2 + 0.008), m["hardware"], 0.003)
    bx(f"{name}_kick", w - 0.06, 0.003, 0.25, 0.0, -sign * 0.0135, 0.14, m["stainless"], 0.001)
    bx(f"{name}_lock", 0.08, 0.008, 0.2, w / 2 - 0.075, -sign * 0.011, 1.02, m["hardware"], 0.002)
    bx(f"{name}_lever", 0.13, 0.018, 0.017, w / 2 - 0.13, sign * 0.03, 1.05, m["hardware"], 0.006)
    return g


def clock(xyz):
    """A plain wall clock: ticks only, no numerals (on a wall whose room is on -Y)."""
    m = materials()
    x, y, z = xyz
    r = sk.cyl("clock_rim", 0.16, 0.045, (x, y - 0.0225, z), m["clock_rim"], rot=(math.pi / 2, 0, 0), verts=64)
    bevelled(r, 0.006, 3, 30)
    sk.cyl("clock_face", 0.145, 0.002, (x, y - 0.042, z), m["clock_face"], rot=(math.pi / 2, 0, 0), verts=64)
    bm = bmesh.new()
    for k in range(12):
        a = 2 * math.pi * k / 12
        L = 0.024 if k % 3 == 0 else 0.013
        rr = 0.128 - L / 2
        add_box(bm, (0.006 if k % 3 == 0 else 0.0035, 0.001, L), (rr * math.sin(a), 0, rr * math.cos(a)),
                Matrix.Rotation(a, 3, "Y"))
    for ln, wd, a in ((0.065, 0.008, math.radians(-44)), (0.105, 0.005, math.radians(192))):
        c = ln / 2 - 0.012
        add_box(bm, (wd, 0.001, ln), (c * math.sin(a), -0.002, c * math.cos(a)), Matrix.Rotation(a, 3, "Y"))
    ob = mesh_obj("clock_marks", bm, m["ink"])
    ob.location = (x, y - 0.0445, z)
    sk.cyl("clock_pin", 0.006, 0.006, (x, y - 0.047, z), m["ink"], rot=(math.pi / 2, 0, 0), verts=16)
    # a cage over it, as in a secure area: a few bars on a ring
    bm = bmesh.new()
    for k in range(5):
        xx = -0.12 + k * 0.06
        add_rod(bm, (xx, -0.07, -0.15), (xx, -0.07, 0.15), 0.003, 6)
    for zz in (-0.1, 0.0, 0.1):
        add_rod(bm, (-0.15, -0.07, zz), (0.15, -0.07, zz), 0.003, 6)
    cg = mesh_obj("clock_cage", bm, m["wire"], smooth=True)
    cg.location = (x, y, z)


def wall_vent(name, loc, w=0.42, h=0.26, normal=-1):
    m = materials()
    x, y, z = loc
    s_ = normal
    box(name + "_back", (w - 0.02, 0.006, h - 0.02), (x, y - 0.002 * s_ * -1, z), m["void"])
    for sg in (-1, 1):
        box(name + "_fv", (0.022, 0.016, h), (x + sg * (w / 2 - 0.011), y + s_ * 0.008, z), m["vent"], 0.003)
        box(name + "_fh", (w, 0.016, 0.022), (x, y + s_ * 0.008, z + sg * (h / 2 - 0.011)), m["vent"], 0.003)
    n = 7
    for k in range(n):
        zz = z - h / 2 + 0.03 + k * (h - 0.06) / (n - 1)
        box(f"{name}_blade{k}", (w - 0.04, 0.028, 0.004), (x, y + s_ * 0.012, zz), m["vent"], 0.0012,
            rot=(math.radians(35), 0, 0))


def dressing():
    m = materials()
    # doors: the visitors' door in the left wall, the inmates' door in the back wall; the corridors beyond lit
    door_leaf("vdoor", (-XW, VD["y"]), "y", +1, VD["w"], VD["h"], (0.75, 0.86, 1.0), 2.2)
    door_leaf("idoor", (ID["x"], Y1), "x", -1, ID["w"], ID["h"], (0.75, 0.86, 1.0), 1.6)
    # light under the doors (the corridor beyond)
    area("vdoor_under", (-XW + 0.04, VD["y"], 0.012), (0.02, VD["w"] - 0.1), 3.0, COOL, spread=150,
         rot=(0, -math.pi / 2, 0))
    area("idoor_under", (ID["x"], Y1 - 0.04, 0.012), (ID["w"] - 0.1, 0.02), 2.5, COOL, spread=150,
         rot=(-math.pi / 2, 0, 0))
    # the vision panels throw a little cool light into each room
    area("vdoor_spill", (-XW + 0.08, VD["y"] + VD["w"] / 2 - 0.2, 1.5), (0.5, 0.12), 5.0, COOL, spread=110,
         rot=(0, -math.pi / 2, 0), glossy=False)
    area("idoor_spill", (ID["x"] - ID["w"] / 2 + 0.2, Y1 - 0.08, 1.5), (0.12, 0.5), 4.0, COOL, spread=110,
         rot=(-math.pi / 2, 0, 0), glossy=False)
    clock(CLOCK)
    wall_vent("vent_i", (0.9, Y1, 2.35), normal=-1)
    wall_vent("vent_v", (-0.4, Y0, 2.35), normal=1)
    # a moulded bin by the visitors' door
    sk.cyl("bin", 0.17, 0.5, (-XW + 0.3, VD["y"] + 0.85, 0.25), mt.plastic("bin plastic", (0.05, 0.055, 0.06), 0.45), verts=40)
