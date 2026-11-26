"""The detention corridor's set: shell, cell doors set into the walls, the cells behind them, caged fittings, floor
drain, services, and the visitation room at the far end with its table, chair, envelope and pendant.

Metres, Z up, floor at z = 0. The corridor runs along +Y from the near wall (y = Y0) to the end wall (y = Y1),
x -XW..XW, ceiling at H. Cell doors stand in both side walls; behind each is a cell (dark, a faint night light).
The visitation room lies beyond the end wall, entered by a door in the middle of it that stands ajar.

The cell-door prop is a 1.1 m-deep block with a good front (+X in its file): it is set into the wall so that its
local x = FRONT lies in the wall face, wrapped by a pressed-steel frame. Its window recess is opened through (the
recess floor and the block's back are cut away, the recess shortened to a door's thickness and glazed) so the cell's
faint light shows through the bars.
"""
import math

import bpy  # noqa: F401  (first: bmesh and mathutils only exist once bpy is loaded)
import bmesh
from mathutils import Matrix, Vector

import props
import setkit as sk
import detention_corridor_mats as mt

XW, H, T = 1.25, 2.7, 0.2                 # corridor half width, ceiling, wall thickness
Y0, Y1 = -4.0, 13.0                       # near wall and end wall (corridor faces)
SPLIT = 1.2                               # dado line
CELL_DOORS = (("L", 1.6), ("R", 3.6), ("L", 5.6), ("R", 7.6), ("L", 9.6), ("R", 11.6))
CLOSE = ("R", 7.6)                        # the door of the close-up
# (y, level): the two nearest are dead, so the corridor opens out of the dark; then a pool at 4.6, a dead fitting
# at 7.0 (a dark gap between the pools), a pool at 9.4, and by the end wall a dying tube
FITTINGS = ((-0.4, 0.0), (2.2, 0.0), (4.6, 1.0), (7.0, 0.0), (9.4, 1.0), (11.8, 0.3))
FIT_W = 300.0                             # a fitting's lamp (W) at level 1
FIT_SPREAD = 115.0                        # its down light's spread: pools end on the walls instead of merging
FIT_UP = 8.0                              # its up light (W at level 1): the soffit between pools stays dark
DRAIN = (0.3, 2.35)
HOSE_Y, HOSE_Z = 5.0, 1.2                 # the recessed fire-hose cabinet in the right wall (centre)
HOSE_W, HOSE_H, HOSE_D = 0.7, 0.8, 0.18
OPEN_W, OPEN_H = 1.075, 2.105             # wall opening for a cell-door block
FRONT = 0.34                              # the prop's local x lying in the wall face
CELL_D, CELL_W, CELL_H = 3.2, 2.4, 2.6
RX, RY0, RY1 = 1.8, Y1 + T, 17.4          # visitation room: half width, front and back wall faces
VD_X, VD_W, VD_H, VD_OPEN = 0.0, 0.92, 2.1, 50.0
BD_X = 0.78                               # the closed door in the visitation room's back wall
TABLE, TOP = (0.0, 15.55), 0.74
PEND_Z = 1.46                             # the pendant shade's rim (0.72 m over the table)
PEND_W = 210.0                            # the lamp's wide cone (W): table, floor round it, the table's shadow
POOL_W = 260.0                            # its hot centre (W): the pool on the table round the envelope
GLOW_W = 18.0                             # the bare bulb lighting the inside of the shade
COOL = (0.80, 0.91, 1.0)
WARM = (1.0, 0.87, 0.7)
LEAK = (1.0, 0.70, 0.42)                  # the room's light leaking out (pushed warm: the grade halves saturation)
UPPER, LOWER = (0.19, 0.187, 0.172), (0.055, 0.069, 0.081)

M = {}
LIGHTS = {}


def materials():
    if M:
        return M
    M.update(
        wall_y=mt.block_wall("block wall y", UPPER, LOWER, SPLIT, "y"),
        wall_x=mt.block_wall("block wall x", UPPER, LOWER, SPLIT, "x"),
        cell_y=mt.block_wall("cell wall y", (0.16, 0.16, 0.15), (0.07, 0.08, 0.085), 1.0, "y", scuffs=0.5),
        cell_x=mt.block_wall("cell wall x", (0.16, 0.16, 0.15), (0.07, 0.08, 0.085), 1.0, "x", scuffs=0.5),
        floor=mt.floor_paint("corridor floor", drain=DRAIN, joint=2.4, joint_off=0.2, path_w=0.45, wall_x=XW,
                             rough=0.6, damp_r=0.38),
        cell_floor=mt.floor_paint("cell floor", path_w=-1.0, joint=40.0, rough=0.5),
        room_floor=mt.tile_floor("visit floor", c1=(0.15, 0.15, 0.145), c2=(0.12, 0.122, 0.12)),
        soffit=mt.soffit("soffit"),
        frame=mt.paint("frame paint", (0.075, 0.088, 0.1), 0.42, 0.05, 0.25, edge_rgb=(0.16, 0.16, 0.16)),
        door=mt.paint("door paint", (0.09, 0.105, 0.12), 0.4, 0.05, 0.2, edge_rgb=(0.18, 0.18, 0.18)),
        fit_white=mt.paint("fitting enamel", (0.42, 0.42, 0.4), 0.4, 0.03, 0.35),
        wire=mt.satin_metal("cage wire", (0.36, 0.37, 0.38), 0.42),
        steel=mt.brushed("steel"),
        hardware=mt.satin_metal("hardware", (0.5, 0.51, 0.52), 0.3),
        iron=mt.satin_metal("drain iron", (0.13, 0.13, 0.135), 0.45),
        void=mt.rubber("void", (0.003, 0.003, 0.003), 0.9),
        # the skirting / kick plate: darker satin paint that keeps the knocks of trolleys and boots
        base=mt.paint("skirting", (0.022, 0.025, 0.028), 0.32, 0.04, 0.35, edge_rgb=(0.09, 0.09, 0.09)),
        bars=mt.paint("bar paint", (0.1, 0.112, 0.125), 0.4, 0.03, 0.25, edge_rgb=(0.2, 0.2, 0.2)),
        tray=mt.plastic("tray plastic", (0.2, 0.19, 0.165), 0.5, 0.4),
        cup=mt.plastic("cup plastic", (0.3, 0.3, 0.28), 0.35, 0.5),
        reel=mt.paint("hose reel", (0.16, 0.045, 0.035), 0.45, 0.04, 0.3),
        hose=mt.rubber("hose", (0.09, 0.07, 0.055), 0.6),
        cab=mt.satin_metal("cabinet steel", (0.3, 0.31, 0.32), 0.38),
        cab_back=mt.paint("cabinet back", (0.05, 0.05, 0.05), 0.6, 0.02, 0.2),
        vent=mt.paint("vent paint", (0.17, 0.17, 0.16), 0.5, 0.03, 0.3),
        pipe=mt.paint("pipe paint", (0.19, 0.2, 0.2), 0.45, 0.03, 0.3),
        conduit=mt.satin_metal("conduit", (0.34, 0.35, 0.36), 0.42),
        opal=mt.opal("diffuser off"),
        # dark, matt, worn: under the pendant it must stay a table top, not a grey lightbox, and the envelope reads
        # against it
        laminate=mt.laminate("table laminate", rgb=(0.068, 0.07, 0.068), rough=0.55,
                             rings=((0.34, -0.13, 0.037), (0.385, -0.06, 0.036), (-0.36, 0.21, 0.04))),
        table_steel=mt.paint("table frame", (0.045, 0.05, 0.055), 0.45, 0.03, 0.2, edge_rgb=(0.2, 0.2, 0.2)),
        paper=mt.paper("envelope paper", (0.80, 0.76, 0.68), grime=0.35),
        flap=mt.paper("envelope flap", (0.78, 0.74, 0.66)),
        shade_out=mt.enamel("shade enamel", (0.045, 0.06, 0.056)),
        shade_in=mt.enamel("shade inside", (0.62, 0.62, 0.58), 0.4),
        bakelite=mt.plastic("bakelite", (0.015, 0.014, 0.013), 0.35),
        cord=mt.rubber("cord", (0.01, 0.01, 0.01), 0.45),
        glass=mt.thin_glass("window glass"),
        clock_face=mt.paint("clock face", (0.5, 0.5, 0.47), 0.65, 0.01, 0.1),
        clock_rim=mt.plastic("clock rim", (0.02, 0.02, 0.022), 0.35),
        ink=mt.rubber("clock hands", (0.01, 0.01, 0.012), 0.5),
        dome=mt.plastic("smoked dome", (0.008, 0.008, 0.01), 0.06, 0.8),
        white=mt.paint("white paint", (0.45, 0.45, 0.43), 0.45, 0.03, 0.3),
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
    if isinstance(m, (list, tuple)):
        for mm in m:
            ob.data.materials.append(mm)
    else:
        ob.data.materials.append(m)
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


def spot(name, loc, energy, colour, size_deg, blend, radius=0.03, rot=(0, 0, 0)):
    li = bpy.data.lights.new(name, "SPOT")
    li.energy, li.color, li.shadow_soft_size = energy, colour, radius
    li.spot_size, li.spot_blend = math.radians(size_deg), blend
    li.show_cone = False
    ob = bpy.data.objects.new(name, li)
    bpy.context.scene.collection.objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    ob.visible_camera = False
    LIGHTS[name] = ob
    return ob


def point(name, loc, energy, colour, radius=0.03):
    li = bpy.data.lights.new(name, "POINT")
    li.energy, li.color, li.shadow_soft_size = energy, colour, radius
    ob = bpy.data.objects.new(name, li)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.visible_camera = False
    LIGHTS[name] = ob
    return ob


# ---------------------------------------------------------------- walls
def wall_run(name, axis, plane, sign, a0, a1, openings, m, z1=H, thick=T):
    """A straight wall whose room face is the plane (x = plane for axis "y", y = plane for axis "x"); its body lies
    on the `sign` side of that plane. openings: (centre, width, height[, sill]) along the run; each gets a lintel
    above and, with a sill, a wall piece below."""
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


def cove_run(name, axis, plane, sign, a0, a1, openings, m):
    """A 0.15 m painted kick plate along a wall, broken at its door openings (openings with a sill don't break
    it)."""
    cur, runs = a0, []
    for op in sorted(openings):
        if len(op) > 3 and op[3] > 0:
            continue
        c, w = op[:2]
        s, e = c - w / 2 - 0.07, c + w / 2 + 0.07
        if s > cur:
            runs.append((cur, s))
        cur = e
    if cur < a1:
        runs.append((cur, a1))
    off = plane - sign * 0.007
    for i, (s, e) in enumerate(runs):
        if axis == "y":
            box(f"{name}_{i}", (0.014, e - s, 0.15), (off, (s + e) / 2, 0.075), m, bevel=0.003)
        else:
            box(f"{name}_{i}", (e - s, 0.014, 0.15), ((s + e) / 2, off, 0.075), m, bevel=0.003)


def shell():
    m = materials()
    box("floor", (2 * XW, Y1 - Y0, 0.02), (0, (Y0 + Y1) / 2, -0.01), m["floor"])
    box("ceiling", (2 * XW + 2 * T, Y1 - Y0 + T, 0.15), (0, (Y0 + Y1) / 2, H + 0.075), m["soffit"])
    left = [(y, OPEN_W, OPEN_H) for s, y in CELL_DOORS if s == "L"]
    right = [(y, OPEN_W, OPEN_H) for s, y in CELL_DOORS if s == "R"]
    wall_run("wall_l", "y", -XW, -1, Y0 - T, Y1, left, m["wall_y"])
    wall_run("wall_r", "y", XW, +1, Y0 - T, Y1, right + [(HOSE_Y, HOSE_W, HOSE_Z + HOSE_H / 2, HOSE_Z - HOSE_H / 2)],
             m["wall_y"])
    wall_run("wall_near", "x", Y0, -1, -XW, XW, [], m["wall_x"])
    vd = [(VD_X, VD_W + 0.1, VD_H + 0.05)]
    wall_run("wall_end", "x", Y1, +1, -RX - T, RX + T, vd, m["wall_x"])
    cove_run("cove_l", "y", -XW, -1, Y0, Y1, left, m["base"])
    cove_run("cove_r", "y", XW, +1, Y0, Y1, right, m["base"])
    cove_run("cove_end", "x", Y1, +1, -XW, XW, vd, m["base"])
    # the visitation room
    box("room_floor", (2 * RX, RY1 - RY0, 0.02), (0, (RY0 + RY1) / 2, -0.01), m["room_floor"])
    box("threshold", (VD_W + 0.1, T + 0.02, 0.006), (VD_X, Y1 + T / 2, 0.003), m["steel"], bevel=0.002)
    box("room_ceiling", (2 * RX + 2 * T, RY1 - RY0 + 2 * T, 0.15), (0, (RY0 + RY1) / 2, H + 0.075), m["soffit"])
    wall_run("room_wall_l", "y", -RX, -1, RY0, RY1 + T, [], m["wall_y"])
    wall_run("room_wall_r", "y", RX, +1, RY0, RY1 + T, [], m["wall_y"])
    bd = [(BD_X, VD_W + 0.1, VD_H + 0.05)]
    wall_run("room_wall_back", "x", RY1, +1, -RX - T, RX + T, bd, m["wall_x"])
    cove_run("rcove_l", "y", -RX, -1, RY0, RY1, [], m["base"])
    cove_run("rcove_r", "y", RX, +1, RY0, RY1, [], m["base"])
    cove_run("rcove_b", "x", RY1, +1, -RX, RX, bd, m["base"])
    cove_run("rcove_f", "x", RY0, -1, -RX, RX, vd, m["base"])


# ---------------------------------------------------------------- cells behind the doors
def cells():
    m = materials()
    for i, (side, y) in enumerate(CELL_DOORS):
        sx = -1 if side == "L" else 1
        x_in, x_far = sx * (XW + T), sx * (XW + T + CELL_D)
        xc = (x_in + x_far) / 2
        box(f"cell{i}_floor", (CELL_D, CELL_W, 0.02), (xc, y, -0.01), m["cell_floor"])
        box(f"cell{i}_ceiling", (CELL_D, CELL_W, 0.1), (xc, y, CELL_H + 0.05), m["soffit"])
        box(f"cell{i}_far", (0.15, CELL_W + 0.3, CELL_H + 0.1), (x_far + sx * 0.075, y, CELL_H / 2), m["cell_y"])
        for sy in (-1, 1):
            box(f"cell{i}_side", (CELL_D, 0.15, CELL_H + 0.1), (xc, y + sy * (CELL_W / 2 + 0.075), CELL_H / 2), m["cell_x"])
        if (side, y) == CLOSE:
            continue
        # a faint night light on the cell ceiling, toward the back
        area(f"cell{i}_night", (sx * (XW + T + CELL_D * 0.65), y, CELL_H - 0.02), (0.25, 0.25), 2.5,
             (0.62, 0.76, 1.0), spread=150)
    close_cell()


def close_cell():
    """The cell behind the close-up door. The door camera looks through the window from the hinge side, so it
    sees the cell's latch-side wall (toward -Y for a right-hand door): the empty bunk stands along that wall near
    the door, and a caged night light high on the same wall, just above the window's view, throws its light down
    over the bunk's top rail and mattress edge, so they read as a rim-lit silhouette against the lit wall."""
    m = materials()
    side, y = CLOSE
    sx = -1 if side == "L" else 1
    sy = -1                                           # the wall the window looks toward
    x_in = sx * (XW + T)
    wall_y = y + sy * CELL_W / 2
    nx, nz = x_in + sx * 1.45, 2.2
    ny = wall_y - sy * 0.03
    box("night_body", (0.24, 0.06, 0.13), (nx, ny, nz), m["white"], bevel=0.012)
    box("night_lens", (0.19, 0.012, 0.085), (nx, ny - sy * 0.032, nz), mt.glow("night lens", (0.62, 0.76, 1.0), 1.0))
    bm = bmesh.new()
    for dz in (-0.03, 0.0, 0.03):
        add_rod(bm, (nx - 0.1, ny - sy * 0.045, nz + dz), (nx + 0.1, ny - sy * 0.045, nz + dz), 0.003, 6)
    mesh_obj("night_cage", bm, m["wire"], smooth=True)
    # out from the wall and tipped 45 deg down over the bunk
    area("cell_close_night", (nx, ny - sy * 0.06, nz - 0.02), (0.19, 0.085), 45.0, (0.62, 0.76, 1.0), spread=120,
         rot=(sy * math.radians(-45), 0, 0))
    bw = 0.8                                          # the prop is 1.07 m wide: a cell bunk is about 0.8
    bunk = props.load("bunk-bed", size=1.95, axis="long", loc=(x_in + sx * (0.08 + 0.975), wall_y - sy * (bw / 2 + 0.01), 0.0),
                      turn_deg=180.0 if sy < 0 else 0.0, sat=0.4, val=0.7, rough_add=0.15)
    bunk.scale = (bunk.scale.x, bunk.scale.y * bw / 1.07, bunk.scale.z)
    return bunk


# ---------------------------------------------------------------- cell doors
def door_proto():
    """Load the cell door once and open its window through: cut the recess floor and the block's back away, bring
    the recess's back edge forward to a door's thickness. Returns (holder, mesh object)."""
    h = props.load("cell-door", size=2.1, axis="z", loc=(0, 0, 0), sat=0.5, val=0.82, rough_add=0.1)
    bpy.context.view_layer.update()
    ob = [o for o in h.children_recursive if o.type == "MESH"][0]
    mw = ob.matrix_world.copy()
    inv = mw.inverted()
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    win = lambda p: abs(p.y) < 0.19 and 1.28 < p.z < 1.72
    # the prop's own bars (one flat vertical with a kink, two flat horizontals: a muntin grid) go; round bars are
    # built in cell_doors()
    bar = lambda p: abs(p.y) < 0.168 and 1.302 < p.z < 1.698 and 0.25 < p.x < 0.30
    kill = []
    nbar = 0
    for f in bm.faces:
        c = mw @ f.calc_center_median()
        if c.x < -0.1 or (c.x < 0.05 and win(c)):
            kill.append(f)
        elif bar(c):
            kill.append(f)
            nbar += 1
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    moved = squashed = 0
    for v in bm.verts:
        p = mw @ v.co
        if p.x < 0.2 and win(p):
            p.x = 0.2
            v.co = inv @ p
            moved += 1
        elif p.x > 0.33 and abs(p.y) < 0.26 and 0.66 < p.z < 1.12:
            # the food hatch stood open as a 23 cm shelf (it read as a letterbox flap down the corridor): closed,
            # it sits a few centimetres proud of the leaf
            p.x = 0.33 + (p.x - 0.33) * 0.22
            v.co = inv @ p
            squashed += 1
    bm.to_mesh(ob.data)
    bm.free()
    # its generated texture read as trowelled plaster: painted steel built here instead, in the door's own metres
    loc, rq, sc = mw.decompose()
    steel = mt.door_steel("cell door steel", tuple(loc), tuple(rq.to_euler()), tuple(sc))
    for slot in ob.material_slots:
        slot.material = steel
    print(f"CORRIDOR cell door: {len(kill)} faces cut ({nbar} of the prop's bars), {moved} recess verts brought forward, "
          f"{squashed} hatch verts closed; mesh-to-door {tuple(round(v, 3) for v in sc)}", flush=True)
    return h, ob


def _dup(o, parent=None):
    c = o.copy()
    bpy.context.scene.collection.objects.link(c)
    c.parent = parent
    for ch in o.children:
        _dup(ch, c)
    return c


def door_xf(side, y):
    """Door-local (x out of the wall, y along it, z up; the prop's own metric space) to world."""
    turn = 0.0 if side == "L" else math.pi
    ox = -XW - FRONT if side == "L" else XW + FRONT
    R = Matrix.Rotation(turn, 3, "Z")
    base = Vector((ox, y, 0.0))
    return (lambda p: base + R @ Vector(p)), turn


HATCH_OPEN = 0                                    # the door (index) whose food hatch stands open, a tray on its flap


def open_hatch(i, xf, turn):
    """The near door's food hatch open: a dark slot with the cell's faint light behind it, a pressed-steel surround,
    the flap down as a shelf on two stays, and a moulded plastic meal tray pushed half out onto it, a cup in it.
    Door-local coordinates (x out of the leaf, whose face is at FRONT)."""
    m = materials()
    L = lambda n, size, p, mm, bev=0.0: box(f"cd{i}_{n}", size, xf(p), mm, bevel=bev, rot=(0, 0, turn))
    f0 = FRONT + 0.005                                # the flattened hatch plate
    zb, zt, hw = 0.86, 1.01, 0.18                     # slot bottom, top, half width
    L("slot", (0.004, 2 * hw, zt - zb), (f0 + 0.001, 0.0, (zb + zt) / 2), mt.glow("hatch slot", (0.55, 0.68, 0.9), 0.05))
    for sg in (-1, 1):
        L("hatch_jamb", (0.012, 0.022, zt - zb + 0.044), (f0 + 0.006, sg * (hw + 0.011), (zb + zt) / 2), m["frame"], 0.003)
    L("hatch_head", (0.012, 2 * hw + 0.044, 0.022), (f0 + 0.006, 0.0, zt + 0.011), m["frame"], 0.003)
    L("hatch_sill", (0.012, 2 * hw + 0.044, 0.022), (f0 + 0.006, 0.0, zb - 0.011), m["frame"], 0.003)
    fd = 0.17                                         # the flap, down: a shelf
    L("hatch_flap", (fd, 2 * hw + 0.02, 0.01), (f0 + 0.012 + fd / 2, 0.0, zb - 0.005), m["frame"], 0.003)
    bm = bmesh.new()
    for sg in (-1, 1):
        a = xf((f0 + 0.012 + fd - 0.01, sg * (hw + 0.004), zb))
        b = xf((f0 + 0.012, sg * (hw + 0.004), zt + 0.005))
        add_rod(bm, a, b, 0.0035, 8)
    mesh_obj(f"cd{i}_hatch_stays", bm, m["hardware"], smooth=True)
    # the tray: 0.34 x 0.25 m, 25 mm deep, three compartments; half on the flap, half back in the slot
    tw, td, th, wt = 0.34, 0.25, 0.024, 0.004
    tx = f0 + 0.012 + fd + 0.015 - td / 2             # its centre, out from the leaf
    tz = zb + 0.0005
    root = empty(f"cd{i}_tray", xf((tx, 0.0, tz)), turn + math.radians(4))
    bm = bmesh.new()
    add_box(bm, (td, tw, wt), Vector((0, 0, wt / 2)))
    for sg in (-1, 1):
        add_box(bm, (td, wt, th), Vector((0, sg * (tw - wt) / 2, th / 2)))
        add_box(bm, (wt, tw, th), Vector((sg * (td - wt) / 2, 0, th / 2)))
    add_box(bm, (wt, tw, th * 0.85), Vector((-0.03, 0, th * 0.425)))            # long divider
    add_box(bm, (td / 2 + 0.03, wt, th * 0.85), Vector(((td / 2 - 0.03) / 2, 0.045, th * 0.425)))   # short one
    tray = bevelled(mesh_obj(f"cd{i}_tray_body", bm, m["tray"]), 0.0012, 2, 40)
    tray.parent = root
    # a thin-walled plastic cup, open at the top, standing in the big compartment
    cup = lathe(f"cd{i}_tray_cup", [(0.001, 0.0), (0.026, 0.0), (0.028, 0.004), (0.034, 0.088), (0.0345, 0.09)], m["cup"], 32)
    so = cup.modifiers.new("wall", "SOLIDIFY")
    so.thickness, so.offset = 0.0012, -1.0
    cup.parent = root
    cup.location = (0.055, -0.075, wt)
    # the cell's faint light coming out through the slot over the tray
    area(f"cd{i}_hatch_glow", xf((f0 + 0.008, 0.0, (zb + zt) / 2 + 0.01)), (0.3, 0.1), 1.6, (0.62, 0.76, 1.0),
         spread=130, rot=(0, -math.pi / 2, turn))


def cell_bars(i, xf, turn):
    """Round cell bars in the window recess: four 18 mm bars at 75 mm centres, 2 cm in front of the glass, and
    one flat tie across them at mid height."""
    m = materials()
    for k, yy in enumerate((-0.1125, -0.0375, 0.0375, 0.1125)):
        sk.cyl(f"cd{i}_bar{k}", 0.009, 0.46, xf((0.262, yy, 1.5)), m["bars"], verts=20)
    box(f"cd{i}_bar_tie", (0.008, 0.372, 0.04), xf((0.262, 0.0, 1.5)), m["bars"], bevel=0.001, rot=(0, 0, turn))


def cell_doors():
    m = materials()
    proto, pob = door_proto()
    mw = pob.matrix_world.copy()
    inv = mw.inverted()
    holders = []
    for i, (side, y) in enumerate(CELL_DOORS):
        h = proto if i == 0 else _dup(proto)
        xf, turn = door_xf(side, y)
        cell_bars(i, xf, turn)
        if i == HATCH_OPEN:
            open_hatch(i, xf, turn)
        h.location = xf((0, 0, 0))
        h.rotation_euler = (0, 0, turn)
        holders.append(h)
        L = lambda n, size, p, mm, bev=0.0: box(f"cd{i}_{n}", size, xf(p), mm, bevel=bev, rot=(0, 0, turn))
        d = FRONT + 0.012 - 0.25                      # the pressed-steel frame wraps the reveal
        cx = 0.25 + d / 2
        for sg in (-1, 1):
            L("liner", (d, 0.008, OPEN_H), (cx, sg * (OPEN_W / 2 - 0.004), OPEN_H / 2), m["frame"], 0.002)
            L("trim", (0.014, 0.065, OPEN_H + 0.062), (FRONT + 0.007, sg * (OPEN_W / 2 + 0.0285), (OPEN_H + 0.062) / 2),
              m["frame"], 0.004)
        L("head_liner", (d, OPEN_W, 0.008), (cx, 0.0, OPEN_H + 0.004), m["frame"], 0.002)
        L("head_trim", (0.014, OPEN_W + 0.122, 0.065), (FRONT + 0.007, 0.0, OPEN_H + 0.0285), m["frame"], 0.004)
        # glazing behind the bars, and a call plate on the latch side
        L("glass", (0.006, 0.372, 0.432), (0.232, 0.0, 1.5), m["glass"])
        L("call_plate", (0.008, 0.085, 0.135), (FRONT + 0.004, OPEN_W / 2 + 0.2, 1.38), m["hardware"], 0.003)
        L("call_grille", (0.003, 0.05, 0.035), (FRONT + 0.009, OPEN_W / 2 + 0.2, 1.41), m["void"], 0.001)
        b = sk.cyl(f"cd{i}_call_button", 0.011, 0.012, xf((FRONT + 0.012, OPEN_W / 2 + 0.2, 1.355)), m["steel"],
                   rot=(0, math.pi / 2, turn), verts=24)
        bevelled(b, 0.002, 2, 50)
    # the open-hatch door gets its own mesh with the (closed) hatch pressed flat: the open hatch is built over it.
    # Done after the duplicates are made, so they keep the shared mesh.
    hob = [o for o in holders[HATCH_OPEN].children_recursive if o.type == "MESH"][0]
    me = pob.data.copy()
    n = 0
    for v in me.vertices:
        p = mw @ v.co
        if p.x > FRONT + 0.005 and abs(p.y) < 0.26 and 0.64 < p.z < 1.14:
            p.x = FRONT + 0.005
            v.co = inv @ p
            n += 1
    hob.data = me
    print(f"CORRIDOR open hatch on door {HATCH_OPEN}: {n} verts pressed flat", flush=True)
    return holders


# ---------------------------------------------------------------- ceiling: caged fittings, conduit, CCTV
def fitting(i, y, level):
    m = materials()
    box(f"fit{i}_body", (0.15, 1.3, 0.055), (0, y, H - 0.0275), m["fit_white"], bevel=0.008)
    for s in (-1, 1):
        box(f"fit{i}_cap", (0.13, 0.025, 0.08), (0, y + s * 0.615, H - 0.06), m["fit_white"], bevel=0.006)
    if level > 0:
        lens = mt.glow(f"fit{i}_lens", COOL, 9.0 * level, ends=0.55, axis="Z", half=0.6)
    else:
        lens = m["opal"]
    d = sk.cyl(f"fit{i}_diffuser", 0.05, 1.2, (0, y, H - 0.058), lens, rot=(math.pi / 2, 0, 0), verts=40)
    d.scale = (1.0, 0.82, 1.0)
    bm = bmesh.new()                              # the wire guard: hoops and runners round the diffuser
    cz, r = H - 0.055, 0.074
    arc = lambda a: (r * math.cos(a), cz - r * math.sin(a))
    for k in range(7):
        yy = y - 0.555 + k * 0.185
        pts = [arc(math.pi * j / 10) for j in range(11)]
        for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
            add_rod(bm, (x0, yy, z0), (x1, yy, z1), 0.0028, 6)
    for a in (0.12, 0.32, 0.5, 0.68, 0.88):
        x0, z0 = arc(math.pi * a)
        add_rod(bm, (x0, y - 0.6, z0), (x0, y + 0.6, z0), 0.0025, 6)
    for s in (-1, 1):                             # foot tabs
        add_box(bm, (0.012, 1.2, 0.008), (s * r, y, cz + 0.002))
    mesh_obj(f"fit{i}_cage", bm, m["wire"], smooth=True)
    area(f"fit{i}_down", (0, y, H - 0.112), (0.08, 1.1), FIT_W * level, COOL, spread=FIT_SPREAD)
    # the opal diffuser also throws a little light sideways and up onto the soffit round the fitting
    area(f"fit{i}_up", (0, y, H - 0.118), (0.4, 1.4), FIT_UP * level, COOL, spread=180, rot=(math.pi, 0, 0),
         glossy=False)


def ceiling_services():
    m = materials()
    for i, (y, level) in enumerate(FITTINGS):
        fitting(i, y, level)
    # conduit along the soffit feeding the fittings, with saddles; a junction box at each fitting
    sk.cyl("conduit", 0.011, Y1 - Y0, (0.13, (Y0 + Y1) / 2, H - 0.012), m["conduit"], rot=(math.pi / 2, 0, 0), verts=16)
    bm = bmesh.new()
    yy = Y0 + 0.4
    while yy < Y1:
        add_box(bm, (0.04, 0.018, 0.026), (0.13, yy, H - 0.013))
        yy += 1.2
    for y, _ in FITTINGS:
        add_box(bm, (0.075, 0.075, 0.04), (0.13, y - 0.72, H - 0.02))
    bevelled(mesh_obj("conduit_hw", bm, m["conduit"]), 0.003, 1)
    # a water main along the right wall, high, on brackets
    sk.cyl("pipe", 0.032, Y1 - Y0, (XW - 0.07, (Y0 + Y1) / 2, 2.42), m["pipe"], rot=(math.pi / 2, 0, 0), verts=28)
    bm = bmesh.new()
    yy = Y0 + 0.9
    while yy < Y1:
        add_box(bm, (0.075, 0.03, 0.012), (XW - 0.035, yy, 2.375))
        add_rod(bm, (XW - 0.07 - 0.036, yy, 2.42), (XW - 0.07 + 0.036, yy, 2.42), 0.006, 8)
        yy += 1.8
    bevelled(mesh_obj("pipe_brackets", bm, m["conduit"]), 0.002, 1)
    cctv("cctv_corridor", (-0.85, Y1 - 0.45))
    cctv("cctv_mid", (XW - 0.24, 6.5))
    cctv("cctv_room", (RX - 0.3, RY0 + 0.3))
    hose_cabinet()


def hose_cabinet():
    """A fire-hose cabinet recessed into the right wall between two cells: a steel box 0.18 m deep in the wall,
    a flush bevelled steel door frame with a blank glazed panel, the red reel and its coiled hose dim behind the
    glass. No sign, no words."""
    m = materials()
    y, z, w, h, d = HOSE_Y, HOSE_Z, HOSE_W, HOSE_H, HOSE_D
    xb = XW + d                                       # the back of the recess
    box("hose_back", (0.01, w, h), (xb - 0.005, y, z), m["cab_back"])
    for sg in (-1, 1):
        box("hose_side", (d, 0.012, h), (XW + d / 2, y + sg * (w / 2 - 0.006), z), m["cab"], 0.002)
        box("hose_tb", (d, w, 0.012), (XW + d / 2, y, z + sg * (h / 2 - 0.006)), m["cab"], 0.002)
    # the door: a 45 mm frame standing 12 mm proud of the block, its glass 15 mm behind the frame's face
    fw, fz = 0.045, 0.012
    for sg in (-1, 1):
        box("hose_frame_v", (0.03, fw, h + 0.03), (XW - fz + 0.015, y + sg * (w / 2 - fw / 2 + 0.015), z), m["cab"], 0.004)
        box("hose_frame_h", (0.03, w + 0.03, fw), (XW - fz + 0.015, y, z + sg * (h / 2 - fw / 2 + 0.015)), m["cab"], 0.004)
    box("hose_glass", (0.004, w - 2 * fw + 0.03, h - 2 * fw + 0.03), (XW + 0.004, y, z), m["glass"])
    box("hose_latch", (0.012, 0.02, 0.09), (XW - fz - 0.004, y - w / 2 + 0.06, z), m["hardware"], 0.003)
    # the reel: a drum on a wall bracket, the hose coiled round it
    rx = xb - 0.09
    drum = sk.cyl("hose_drum", 0.07, 0.11, (rx, y, z + 0.02), m["reel"], rot=(0, math.pi / 2, 0), verts=40)
    bevelled(drum, 0.004, 2, 40)
    for k, rr in enumerate((0.1, 0.13, 0.16, 0.19, 0.22, 0.25)):
        for j, dx in enumerate((-0.035, 0.0, 0.035)):
            if rr > 0.2 and j == 0:
                continue
            ring = bpy.data.objects.new(f"hose_coil{k}{j}", bpy.data.curves.new(f"hose_coil{k}{j}", "CURVE"))
            cu = ring.data
            cu.dimensions, cu.bevel_depth, cu.bevel_resolution = "3D", 0.0125, 2
            sp = cu.splines.new("POLY")
            sp.points.add(47)
            for q, pt in enumerate(sp.points):
                a = 2 * math.pi * q / 48
                pt.co = (0.0, rr * math.cos(a), rr * math.sin(a) * 0.93, 1)
            sp.use_cyclic_u = True
            bpy.context.scene.collection.objects.link(ring)
            ring.data.materials.append(m["hose"])
            ring.location = (rx + dx, y, z + 0.02)
    sk.cyl("hose_nozzle", 0.012, 0.12, (rx - 0.05, y - 0.22, z - 0.24), m["hardware"], rot=(0.4, 0, 0), verts=16)


def cctv(name, xy):
    m = materials()
    x, y = xy
    b = sk.cyl(name + "_base", 0.075, 0.022, (x, y, H - 0.011), m["white"], verts=40)
    bevelled(b, 0.004, 2, 60)
    sk.sphere(name + "_dome", 0.058, (x, y, H - 0.022), m["dome"], segs=40)


# ---------------------------------------------------------------- floor drain
def drain():
    m = materials()
    x, y = DRAIN
    o, i_ = 0.25, 0.2
    bm = bmesh.new()
    w = (o - i_) / 2
    for s in (-1, 1):
        add_box(bm, (o, w, 0.006), (x, y + s * (o - w) / 2, 0.002))
        add_box(bm, (w, i_, 0.006), (x + s * (o - w) / 2, y, 0.002))
    bevelled(mesh_obj("drain_frame", bm, m["iron"]), 0.002, 2)
    bm = bmesh.new()
    n = 9
    for k in range(n):                             # slots across the grate
        xx = x - i_ / 2 + (k + 0.5) * i_ / n
        add_box(bm, (0.011, i_, 0.005), (xx, y, 0.0015))
    add_box(bm, (i_, 0.012, 0.005), (x, y, 0.0015))
    bevelled(mesh_obj("drain_grate", bm, m["iron"]), 0.0015, 1)
    box("drain_void", (i_, i_, 0.001), (x, y, 0.0003), m["void"])


# ---------------------------------------------------------------- the visitation room's door (ajar)
def vis_door():
    m = materials()
    yc = Y1 + T / 2
    for s in (-1, 1):
        box("vd_jamb", (0.05, T + 0.03, VD_H + 0.05), (VD_X + s * (VD_W / 2 + 0.025), yc, (VD_H + 0.05) / 2), m["frame"], 0.005)
    box("vd_head", (VD_W + 0.1, T + 0.03, 0.05), (VD_X, yc, VD_H + 0.025), m["frame"], 0.005)
    hinge = Vector((VD_X - VD_W / 2 + 0.002, Y1 + T - 0.052, 0.0))
    bm = bmesh.new()
    lw, lt, lh = VD_W - 0.006, 0.045, VD_H - 0.012
    add_box(bm, (lw, lt, lh), (lw / 2, lt / 2, 0.008 + lh / 2))
    leaf = bevelled(mesh_obj("vd_leaf", bm, m["door"]), 0.004, 2)
    leaf.location = hinge
    leaf.rotation_euler = (0, 0, math.radians(VD_OPEN))

    def child(ob):
        ob.parent = leaf
        return ob
    # vision panel (wired glass, the room's light behind it) and its bead, kick plate, levers both sides
    vx, vz, vw, vh = lw - 0.2, 1.42, 0.1, 0.55
    child(box("vd_glass", (vw, lt + 0.002, vh), (vx, lt / 2, vz), mt.wired_glow("vd glass", LEAK, 1.8)))
    bm = bmesh.new()
    for yy in (-0.004, lt + 0.004):
        for sx in (-1, 1):
            add_box(bm, (0.016, 0.008, vh + 0.032), (vx + sx * (vw / 2 + 0.008), yy, vz))
        for sz in (-1, 1):
            add_box(bm, (vw, 0.008, 0.016), (vx, yy, vz + sz * (vh / 2 + 0.008)))
    child(bevelled(mesh_obj("vd_bead", bm, m["hardware"]), 0.003, 2))
    child(box("vd_kick", (lw - 0.06, 0.003, 0.25), (lw / 2, -0.0015, 0.14), m["steel"], 0.001))
    for yy, sgn in ((-0.004, -1), (lt + 0.004, 1)):
        child(sk.cyl("vd_rose", 0.028, 0.01, (lw - 0.07, yy, 1.02), m["hardware"], rot=(math.pi / 2, 0, 0), verts=32))
        child(box("vd_lever", (0.13, 0.018, 0.017), (lw - 0.125, yy + sgn * 0.05, 1.02), m["hardware"], 0.006))
    for z in (0.25, 1.05, 1.9):
        child(sk.cyl("vd_hinge", 0.009, 0.11, (0.0, lt / 2, z), m["hardware"], verts=16))
    # the leak: the room's warm light thrown out through the gap between the leaf and the jamb, a narrow strip in
    # the gap aimed down the corridor and tipped 12 deg down, so it lays a warm wedge along the floor toward the
    # camera (its spread is narrow, and Cycles keeps a light's power as its spread narrows: the energy is set for
    # the floor 2-3 m out to sit near the fittings' pools, not by multiplying the old wide light's)
    area("vd_leak", (VD_X + 0.28, Y1 + 0.06, 0.98), (0.12, 1.9), 170.0, LEAK, spread=40,
         rot=(-math.radians(78), 0, 0))
    # for the corridor camera only (TRIMS): the room behind the gap washed warm from above, so through the gap it
    # is the brightest, warmest thing at the vanishing point
    area("room_warm", (0.55, 15.0, H - 0.05), (1.4, 1.6), 0.0, LEAK, spread=150, glossy=False)
    # and the corridor's cool light falling in through the open door: a faint wash across the room
    area("vd_spill", (VD_X + 0.25, Y1 + T + 0.05, 1.15), (0.4, 2.0), 16.0, COOL, spread=100, rot=(math.pi / 2, 0, 0),
         glossy=False)
    return leaf


def back_door():
    """The closed steel door in the visitation room's back wall: the one the detainee would come through."""
    m = materials()
    yc = RY1 + T / 2
    for s in (-1, 1):
        box("bd_jamb", (0.05, T + 0.03, VD_H + 0.05), (BD_X + s * (VD_W / 2 + 0.025), yc, (VD_H + 0.05) / 2), m["frame"], 0.005)
    box("bd_head", (VD_W + 0.1, T + 0.03, 0.05), (BD_X, yc, VD_H + 0.025), m["frame"], 0.005)
    lw, lt, lh = VD_W - 0.006, 0.05, VD_H - 0.012
    box("bd_leaf", (lw, lt, lh), (BD_X, RY1 + 0.03, 0.008 + lh / 2), m["door"], 0.004)
    # its vision panel: the cold corridor on the far side, faint through wired glass
    box("bd_glass", (0.12, 0.054, 0.2), (BD_X - 0.2, RY1 + 0.03, 1.55), mt.wired_glow("bd glass", COOL, 0.12))
    bm = bmesh.new()
    for sx in (-1, 1):
        add_box(bm, (0.016, 0.01, 0.232), (BD_X - 0.2 + sx * 0.068, RY1 + 0.0, 1.55))
    for sz in (-1, 1):
        add_box(bm, (0.12, 0.01, 0.016), (BD_X - 0.2, RY1 + 0.0, 1.55 + sz * 0.108))
    bevelled(mesh_obj("bd_bead", bm, m["hardware"]), 0.003, 2)
    box("bd_lock", (0.1, 0.012, 0.16), (BD_X - lw / 2 + 0.08, RY1 - 0.001, 1.05), m["frame"], 0.004)
    box("bd_kick", (lw - 0.06, 0.003, 0.25), (BD_X, RY1 + 0.004, 0.14), m["steel"], 0.001)


# ---------------------------------------------------------------- the visitation room's furniture
def table():
    m = materials()
    x, y = TABLE
    box("table_top", (1.1, 0.7, 0.03), (x, y, TOP - 0.015), m["laminate"], 0.004)
    for s in (-1, 1):
        box("table_apron", (0.94, 0.02, 0.06), (x, y + s * 0.27, TOP - 0.06), m["table_steel"], 0.003)
        box("table_apron", (0.02, 0.52, 0.06), (x + s * 0.46, y, TOP - 0.06), m["table_steel"], 0.003)
    for sx in (-1, 1):
        for sy in (-1, 1):
            lx, ly = x + sx * 0.47, y + sy * 0.28
            box("table_leg", (0.04, 0.04, TOP - 0.03), (lx, ly, (TOP - 0.03) / 2), m["table_steel"], 0.004)
            box("table_foot", (0.09, 0.09, 0.006), (lx, ly, 0.003), m["table_steel"], 0.002)
            for bx in (-1, 1):
                for by in (-1, 1):
                    sk.cyl("table_bolt", 0.006, 0.008, (lx + bx * 0.031, ly + by * 0.031, 0.008), m["hardware"], verts=6)


def chair(xy, facing_deg):
    """The visitor chair, turned so its front looks along `facing_deg` (world, 0 = +X). Its front in the file is
    found from the backrest (the backrest's normal, from the back toward the seat)."""
    h = props.load("visitor-chair", size=0.82, axis="z", loc=(0, 0, 0), sat=0.55, val=0.95, rough_add=0.12)
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
    ang = 0.5 * math.atan2(2 * sxy, sxx - syy)          # the backrest's width direction
    n = Vector((-math.sin(ang), math.cos(ang), 0))
    if n.dot(cs - cb) < 0:
        n = -n
    front = math.degrees(math.atan2(n.y, n.x))
    turn = facing_deg - front
    h.location = (xy[0], xy[1], 0.0)
    h.rotation_euler = (0, 0, math.radians(turn))
    for o in h.children_recursive:
        for slot in getattr(o, "material_slots", []):
            mt.tune_prop(slot.material, spec=0.35)
    print(f"CORRIDOR chair: file front {front:.1f} deg, turned {turn:.1f} deg", flush=True)
    return h


def envelope(cx, cy, z, ang_deg, W=0.229, D=0.162):
    """A sealed envelope lying back up: its body pillowed by the folded letter inside, the bottom flap and the
    sealed top flap laid over it as thin sheets, so their edges draw the envelope's seams."""
    m = materials()
    root = empty("envelope", (cx, cy, z), math.radians(ang_deg))
    def pill(x, y):
        """Height of the envelope's back: pillowed by the folded letter, a gentle warp from handling and damp, and
        its front right corner curled up off the table."""
        h = 0.0026 * max(0.0, 1 - (2 * x / W) ** 4) * max(0.0, 1 - (2 * y / D) ** 4)
        h += 0.0007 * math.sin(2.1 * math.pi * x / W + 0.6) * math.cos(1.3 * math.pi * y / D)
        h += 0.0007 * (1 + math.sin(3.0 * math.pi * x / W - 1.0)) * max(0.0, (2 * y / D) ** 2 - 0.6)
        dc = math.hypot(x - W / 2, y + D / 2)
        h += 0.0032 * max(0.0, 1 - dc / 0.07) ** 2
        return max(h, 0.0)
    nu, nv = 30, 22
    bm = bmesh.new()
    vs = [[bm.verts.new((-W / 2 + W * i / nu, -D / 2 + D * j / nv, 0.0)) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
    for v in bm.verts:
        v.co.z = pill(v.co.x, v.co.y) + 0.0004
    body = mesh_obj("envelope_body", bm, m["paper"], smooth=True)
    so = body.modifiers.new("card", "SOLIDIFY")
    so.thickness, so.offset = 0.0004, -1.0
    body.parent = root

    def flap(name, poly, lift, mat):
        bm = bmesh.new()
        vv = [bm.verts.new((x, y, 0.0)) for x, y in poly]
        bm.faces.new(vv)
        for _ in range(3):
            bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        for v in bm.verts:
            v.co.z = pill(v.co.x, v.co.y) + 0.0004 + lift
        ob = mesh_obj(name, bm, mat, smooth=True)
        s = ob.modifiers.new("card", "SOLIDIFY")
        s.thickness, s.offset = 0.00025, -1.0
        ob.parent = root
        return ob
    e = 0.0015                                           # flaps stop just short of the body's edges
    flap("envelope_bottom_flap", [(-W / 2 + e, -D / 2 + e), (W / 2 - e, -D / 2 + e), (W * 0.1, D * 0.1), (-W * 0.1, D * 0.1)],
         0.00035, m["flap"])
    flap("envelope_top_flap", [(-W / 2 + e, D / 2 - e), (-W * 0.035, -D * 0.06), (W * 0.035, -D * 0.06), (W / 2 - e, D / 2 - e)],
         0.0007, m["flap"])
    return root


def lathe(name, profile, mats, segs=56):
    """A surface of revolution about Z from (r, z) points, outward normals; a second material on the inner shell
    made by a solidify."""
    bm = bmesh.new()
    rings = []
    for k in range(segs):
        a = 2 * math.pi * k / segs
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for r, z in profile])
    for k in range(segs):
        r0, r1 = rings[k], rings[(k + 1) % segs]
        for j in range(len(profile) - 1):
            bm.faces.new((r0[j], r1[j], r1[j + 1], r0[j + 1]))
    bm.normal_update()
    bm.faces.ensure_lookup_table()
    f = bm.faces[len(profile) // 2]
    c = f.calc_center_median()
    if f.normal.dot(Vector((c.x, c.y, 0))) < 0:
        for ff in bm.faces:
            ff.normal_flip()
    return mesh_obj(name, bm, mats, smooth=True)


def pendant():
    """One enamel pendant over the table on a cord: dark outside, white inside, a warm bulb under the rim."""
    m = materials()
    x, y = TABLE
    z0 = PEND_Z
    # a shallow industrial dome (RLM): steep neck, rounded shoulder, wide flared skirt
    prof = [(0.028, 0.2), (0.036, 0.192), (0.06, 0.172), (0.1, 0.14), (0.14, 0.1), (0.168, 0.062), (0.186, 0.03),
            (0.196, 0.01), (0.2, 0.0)]
    sh = lathe("pendant_shade", prof, [m["shade_out"], m["shade_in"]])
    so = sh.modifiers.new("enamel", "SOLIDIFY")
    so.thickness, so.offset, so.material_offset, so.material_offset_rim = 0.0016, -1.0, 1, 0
    sh.location = (x, y, z0)
    rim = bpy.data.objects.new("pendant_rim", bpy.data.curves.new("pendant_rim", "CURVE"))
    cu = rim.data
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution = "3D", 0.0035, 3
    sp = cu.splines.new("POLY")
    sp.points.add(63)
    for k, p in enumerate(sp.points):
        a = 2 * math.pi * k / 64
        p.co = (0.2 * math.cos(a), 0.2 * math.sin(a), 0.0, 1)
    sp.use_cyclic_u = True
    bpy.context.scene.collection.objects.link(rim)
    rim.data.materials.append(m["shade_out"])
    rim.location = (x, y, z0)
    sk.cyl("pendant_cap", 0.032, 0.04, (x, y, z0 + 0.215), m["shade_out"], verts=32)
    sk.cyl("pendant_socket", 0.021, 0.055, (x, y, z0 + 0.165), m["bakelite"], verts=24)
    bulb = sk.sphere("pendant_bulb", 0.033, (x, y, z0 + 0.1), mt.glow("bulb", WARM, 30.0), segs=32)
    bulb.visible_shadow = False                  # the lamp's light sits inside it
    sk.cyl("pendant_cord", 0.0035, H - z0 - 0.235, (x, y, (H + z0 + 0.235) / 2), m["cord"], verts=12)
    b = sk.cyl("pendant_rose", 0.05, 0.022, (x, y, H - 0.011), m["white"], verts=40)
    bevelled(b, 0.004, 2, 60)
    # the lamp: a spot straight down from the bulb for the cone (table, the floor round it, the table's hard
    # rectangular shadow), a second, narrower one from the same bulb for the pool's hot centre round the envelope
    # (falling off about 0.35 m out, so the table's ends sit 2-3 stops down), and a weak bare point inside the
    # shade for its white inner glow and rim
    spot("pendant_light", (x, y, z0 + 0.1), PEND_W, WARM, 95.0, 0.35, 0.03)
    spot("pendant_pool", (x, y, z0 + 0.1), POOL_W, WARM, 50.0, 0.6, 0.03)
    g = point("pendant_glow", (x, y, z0 + 0.135), GLOW_W, WARM, radius=0.02)
    g.visible_glossy = True


def clock(xyz):
    """A plain wall clock: ticks only, no numerals."""
    m = materials()
    x, y, z = xyz
    r = sk.cyl("clock_rim", 0.16, 0.045, (x, y - 0.0225, z), m["clock_rim"], rot=(math.pi / 2, 0, 0), verts=64)
    bevelled(r, 0.006, 3, 30)
    sk.cyl("clock_face", 0.145, 0.002, (x, y - 0.042, z), m["clock_face"], rot=(math.pi / 2, 0, 0), verts=64)
    bm = bmesh.new()
    for k in range(12):                       # clockwise from twelve, seen from the room (-Y): +X is to the right
        a = 2 * math.pi * k / 12
        L = 0.024 if k % 3 == 0 else 0.013
        rr = 0.128 - L / 2
        add_box(bm, (0.006 if k % 3 == 0 else 0.0035, 0.001, L), (rr * math.sin(a), 0, rr * math.cos(a)),
                Matrix.Rotation(a, 3, "Y"))
    # hands: ten to four, the hour hand short and broad
    for ln, wd, a in ((0.065, 0.008, math.radians(115)), (0.105, 0.005, math.radians(300))):
        c = ln / 2 - 0.012
        add_box(bm, (wd, 0.001, ln), (c * math.sin(a), -0.002, c * math.cos(a)), Matrix.Rotation(a, 3, "Y"))
    ob = mesh_obj("clock_marks", bm, m["ink"])
    ob.location = (x, y - 0.0445, z)
    sk.cyl("clock_pin", 0.006, 0.006, (x, y - 0.047, z), m["ink"], rot=(math.pi / 2, 0, 0), verts=16)


def room():
    table()
    pendant()
    back_door()
    clock((-1.3, RY1, 2.06))
