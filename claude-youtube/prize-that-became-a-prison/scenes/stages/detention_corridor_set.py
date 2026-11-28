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
# the alternating rhythm runs on past the camera: the last door (R -0.4) stands half out of the corridor shot's right
# edge, its lit window throwing a cool patch across the near left wall
CELL_DOORS = (("L", 1.6), ("R", 3.6), ("L", 5.6), ("R", 7.6), ("L", 9.6), ("R", 11.6), ("R", -0.4))
CLOSE = ("R", 7.6)                        # the door of the close-up
# the near doors whose cells keep a night light on: each window spills a soft cool patch across the corridor onto
# the opposite wall at dado height, so the foreground walls read (coursing, dado) without any fill
WIN_LIT = {0: 42.0, 1: 36.0, 6: 48.0}     # door index -> W of the light inside its window
# (y, level): the two nearest are dead, so the corridor opens out of the dark; then a pool at 4.6, a dead fitting
# at 7.0 (a dark gap between the pools), a weaker pool at 9.4 (round 4: at full level it sat in front of the
# visitation door and outshone it), and by the end wall a dying tube, low enough not to wash the door under it
FITTINGS = ((-0.4, 0.0), (2.2, 0.0), (4.6, 1.0), (7.0, 0.0), (9.4, 0.4), (11.8, 0.07))
FIT_W = 160.0                             # a fitting's lamp (W) at level 1 (round 4: 280 made the pools the frame's
                                          # brightest thing, over the amber doorway)
FIT_SPREAD = 80.0                         # its down light's spread: each pool a separate ellipse with edges
FIT_UP = 5.0                              # its up light (W at level 1): the soffit between pools stays dark
DRAIN = (0.3, 2.35)
HOSE_Y, HOSE_Z = 5.0, 1.2                 # the recessed fire-hose cabinet in the right wall (centre)
HOSE_W, HOSE_H, HOSE_D = 0.7, 0.8, 0.18
OPEN_W, OPEN_H = 1.075, 2.105             # wall opening for a cell-door block
FRONT = 0.34                              # the prop's local x lying in the wall face
LEAF = 0.301                              # the prop's leaf face (set back 4 cm in its frame)
WIN_IY, WIN_IZ, WIN_FW = 0.19, 0.22, 0.05  # the vision panel's opening (half sizes) and its flat frame's width
WIN_BACK = 0.19                          # depth of the welded reveal, in door-local metres
DOOR_PAINT = (0.135, 0.165, 0.19)         # blue-grey: a step off the warm grey wall in hue and value
CELL_D, CELL_W, CELL_H = 3.2, 2.4, 2.6
RX, RY0, RY1 = 1.8, Y1 + T, 17.4          # visitation room: half width, front and back wall faces
VD_X, VD_W, VD_H, VD_OPEN = 0.0, 0.92, 2.1, 50.0
BD_X = 0.78                               # the closed door in the visitation room's back wall
TABLE, TOP = (0.0, 15.55), 0.74
PEND_Z = 1.46                             # the pendant shade's rim (0.72 m over the table)
PEND_W = 90.0                             # the lamp's wide cone (W): floor round the table, the table's shadow
POOL_W = 300.0                            # its hot centre (W): the pool on the table round the envelope
POOL_CONE = 40.0                          # the hot centre's cone (deg): the table top is the island, not the floor
GLOW_W = 18.0                             # the bare bulb lighting the inside of the shade
COOL = (0.80, 0.91, 1.0)
WARM = (1.0, 0.87, 0.7)
LEAK = (1.0, 0.70, 0.42)                  # the room's light leaking out (pushed warm: the grade halves saturation)
AMBER = (1.0, 0.40, 0.08)                 # the leak and the room seen through the gap: AgX and the grade both
                                          # wash warm light toward neutral, so the source is pushed hard
UPPER, LOWER = (0.19, 0.187, 0.172), (0.055, 0.069, 0.081)

M = {}
LIGHTS = {}
PARTS = {}


def materials():
    if M:
        return M
    M.update(
        wall_y=mt.block_wall("block wall y", UPPER, LOWER, SPLIT, "y"),
        wall_x=mt.block_wall("block wall x", UPPER, LOWER, SPLIT, "x"),
        cell_y=mt.block_wall("cell wall y", (0.16, 0.16, 0.15), (0.07, 0.08, 0.085), 1.0, "y", scuffs=0.5),
        cell_x=mt.block_wall("cell wall x", (0.16, 0.16, 0.15), (0.07, 0.08, 0.085), 1.0, "x", scuffs=0.5),
        floor=mt.floor_paint("corridor floor", paint=(0.052, 0.058, 0.06), bare=(0.085, 0.082, 0.077), drain=DRAIN,
                             joint=2.4, joint_off=0.8, path_w=0.45, wall_x=XW, rough=0.6, damp_r=0.3, path_lift=1.3),
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
        tray=mt.plastic("tray plastic", (0.32, 0.30, 0.27), 0.5, 0.4),
        # the hinges: the door's own paint, rubbed at the knuckle, no chips (the generated chips read as spatter)
        hinge=mt.paint("hinge paint", (0.12, 0.145, 0.165), 0.42, 0.04, 0.3),
        # a vinyl-covered cell mattress (a satin sheen that picks up a rim) and a grey wool blanket
        vinyl=mt.plastic("mattress vinyl", (0.075, 0.085, 0.095), 0.38, 0.45),
        blanket=mt.wool("blanket wool", (0.15, 0.15, 0.145)),
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
        laminate=mt.laminate("table laminate", rgb=(0.062, 0.065, 0.063), rough=0.58,
                             rings=((0.34, -0.13, 0.037), (-0.36, 0.21, 0.04)),
                             half=(0.55, 0.35)),
        table_steel=mt.paint("table frame", (0.045, 0.05, 0.055), 0.45, 0.03, 0.2, edge_rgb=(0.2, 0.2, 0.2)),
        # matt, warm, fibrous: under the pendant it reads as paper, not a cold white card
        paper=mt.paper("envelope paper", (0.6, 0.565, 0.49), rough=0.85, fibre=0.02, grime=0.35),
        flap=mt.paper("envelope flap", (0.558, 0.525, 0.456), rough=0.85, fibre=0.02),
        shade_out=mt.enamel("shade enamel", (0.045, 0.06, 0.056)),
        shade_in=mt.enamel("shade inside", (0.62, 0.62, 0.58), 0.4),
        bakelite=mt.plastic("bakelite", (0.015, 0.014, 0.013), 0.35),
        cord=mt.rubber("cord", (0.01, 0.01, 0.01), 0.45),
        glass=mt.thin_glass("window glass"),
        glass_close=mt.thin_glass("close window glass", refl=0.015, smear=0.025),
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
        # (brighter in the cells whose windows spill onto the corridor, so the window itself reads as lit)
        area(f"cell{i}_night", (sx * (XW + T + CELL_D * 0.65), y, CELL_H - 0.02), (0.25, 0.25),
             8.0 if i in WIN_LIT else 2.5, (0.62, 0.76, 1.0), spread=150)
    close_cell()


def close_cell():
    """The cell behind the close-up door. The door camera looks through the window from the hinge side, so it
    sees the cell's latch-side wall (toward -Y for a right-hand door): the empty bunk stands along that wall near
    the door. A caged night light on the cell's far end wall at 1.9 m, aimed back toward the door, rims the
    mattress's near edge and the folded blanket; a soft cool wash on the latch-side wall behind the bunk makes the
    rail, mattress edge and blanket fold read as a silhouette against a lit wall (round 4: the old 140 W light high
    on that wall lit the mattress top flat, a hard black-and-white pattern under the bars)."""
    m = materials()
    side, y = CLOSE
    sx = -1 if side == "L" else 1
    sy = -1                                           # the wall the window looks toward
    x_in = sx * (XW + T)
    x_far = x_in + sx * CELL_D
    wall_y = y + sy * CELL_W / 2
    bw = 0.8                                          # the prop is 1.07 m wide: a cell bunk is about 0.8
    bx, by = x_in + sx * (0.08 + 0.975), wall_y - sy * (bw / 2 + 0.01)
    # the caged night light itself, on the latch-side wall high over the bunk's head, where the window sees it
    # between the bars over the tie (a dark painted body, so the wash beside it does not make it a white block;
    # its lens dim)
    nx, ny, nz = x_in + sx * 1.7, wall_y - sy * 0.03, 2.25
    box("night_body", (0.24, 0.06, 0.13), (nx, ny, nz), m["frame"], bevel=0.012)
    box("night_lens", (0.19, 0.012, 0.085), (nx, ny - sy * 0.032, nz), mt.glow("night lens", (0.62, 0.76, 1.0), 0.6))
    bm = bmesh.new()
    for dz in (-0.03, 0.0, 0.03):
        add_rod(bm, (nx - 0.1, ny - sy * 0.045, nz + dz), (nx + 0.1, ny - sy * 0.045, nz + dz), 0.003, 6)
    mesh_obj("night_cage", bm, m["wire"], smooth=True)
    # its rim light, from the far end wall over the bunk's line, aimed back toward the door
    p = Vector((x_far - sx * 0.1, by, 1.88))
    aim = Vector((x_in + sx * 0.45, by - sy * 0.12, 1.3))       # the blanket and the mattress's near end
    # (a broad panel, out of the window's view: its shadows of the bunk frame on the floor stay soft)
    li = area("cell_close_night", tuple(p), (0.45, 0.25), 25.0, (0.62, 0.76, 1.0), spread=60)
    li.rotation_euler = (aim - p).to_track_quat("-Z", "Y").to_euler()
    # the night light's own spill: a small panel just under its lens, aimed down along the latch-side wall, so it
    # lays a soft scallop on the wall under the fixture and the bunk's rail and mattress line read as a silhouette
    # against it (round 4: a broad wash from farther in made a detached U-shaped white patch beside the fixture)
    p = Vector((nx, ny - sy * 0.16, nz - 0.1))
    aim = Vector((nx + sx * 0.12, wall_y, 1.5))
    li = area("cell_close_wall", tuple(p), (0.2, 0.08), 5.0, (0.66, 0.78, 1.0), spread=120, glossy=False)
    li.rotation_euler = (aim - p).to_track_quat("-Z", "Y").to_euler()
    bunk = props.load("bunk-bed", size=1.95, axis="long", loc=(bx, by, 0.0),
                      turn_deg=180.0 if sy < 0 else 0.0, sat=0.4, val=0.7, rough_add=0.15)
    bunk.scale = (bunk.scale.x, bunk.scale.y * bw / 1.07, bunk.scale.z)
    # the upper bunk made to read through the window: a crisp vinyl mattress 0.1 m thick over the prop's, and a grey
    # blanket folded square at its foot, the end the window sees. (Round 4 tried it 6 cm lower: the projection put
    # its top edge and the blanket behind the tie bar and left only its unlit front face below it, so it stays here,
    # its top line and the blanket just over the tie, against the washed wall.)
    ml, mw_ = 1.86, bw - 0.1
    mz = 1.47
    box("close_mattress", (ml, mw_, 0.1), (bx, by, mz), m["vinyl"], bevel=0.022)
    fx = bx - sx * (ml / 2 - 0.3)                     # the foot end, toward the door
    box("close_blanket", (0.42, mw_ - 0.12, 0.05), (fx, by - sy * 0.03, mz + 0.075), m["blanket"], bevel=0.018)
    box("close_blanket_top", (0.40, mw_ - 0.16, 0.034), (fx + sx * 0.008, by - sy * 0.035, mz + 0.115), m["blanket"],
        bevel=0.014, rot=(0, 0, math.radians(2.5)))
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
    win = lambda p: abs(p.y) < WIN_IY and abs(p.z - 1.5) < WIN_IZ
    # the prop's own bars (one flat vertical with a kink, two flat horizontals: a muntin grid) go; round bars are
    # built in cell_doors()
    bar = lambda p: abs(p.y) < 0.168 and 1.302 < p.z < 1.698 and 0.25 < p.x < 0.30
    # and their stubs where they met the reveal (not the reveal's own walls, whose normals run along y or z)
    stub = lambda p, n: abs(p.y) < 0.186 and 1.29 < p.z < 1.71 and 0.24 < p.x < 0.30 and abs(n.y) < 0.85 and \
        not (abs(n.z) > 0.85 and (p.z < 1.3 or p.z > 1.7))
    rot3 = mw.to_3x3().normalized()
    kill = []
    nbar = 0
    for f in bm.faces:
        c = mw @ f.calc_center_median()
        nn = (rot3 @ f.normal).normalized()
        if c.x < -0.1 or (c.x < 0.05 and win(c)):
            kill.append(f)
        elif bar(c) or stub(c, nn):
            kill.append(f)
            nbar += 1
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    moved = squashed = flat = hinged = 0
    hinge_z = lambda z: 0.17 < z < 0.46 or 0.83 < z < 1.16 or 1.58 < z < 1.82
    for v in bm.verts:
        p = mw @ v.co
        if p.x > LEAF + 0.002 and 0.33 < p.y < 0.55 and 1.5 < p.z < 1.90:
            p.x = LEAF + 0.0008
            v.co = inv @ p
        elif abs(p.x - LEAF) < 0.02 and abs(p.y) < 0.45 and 0.6 < p.z < 1.95 and not win(p):
            p.x = LEAF + (0.0008 if abs(p.y) < 0.33 and 1.12 < p.z < 1.88 else 0.0)
            v.co = inv @ p
            flat += 1
        elif p.x < 0.2 and win(p):
            p.x = 0.2
            v.co = inv @ p
            moved += 1
        elif p.x > LEAF + 0.0008 and abs(p.y) < 0.33 and 1.12 < p.z < 1.88:
            # the window surround (lumpy generated geometry that read as melted under the raking light) pressed
            # flat into the leaf: a flat welded frame is built over it in window_frame()
            p.x = LEAF + 0.0008
            v.co = inv @ p
            flat += 1
        elif p.x > LEAF + 0.002 and -0.54 < p.y < -0.33 and hinge_z(p.z):
            # the prop's hinges (an oversized hex bolt, read as a ship's fitting) pressed flat, the leaf part into
            # the leaf and the frame part into the frame: barrel hinges are built over them in hinges()
            p.x = LEAF + 0.0008 if p.y > -0.447 else 0.286
            v.co = inv @ p
            hinged += 1
        elif p.x > 0.33 and abs(p.y) < 0.26 and 0.66 < p.z < 1.12:
            # the food hatch stood open as a 23 cm shelf (it read as a letterbox flap down the corridor): closed,
            # it sits a few centimetres proud of the leaf
            p.x = LEAF + 0.0008
            v.co = inv @ p
            squashed += 1
    # Clear the deep backing that remains visible through the window at an
    # angle. The new welded reveal already covers the front of the opening.
    margin = 0.055
    normal_transform = mw.to_3x3().transposed()

    def cut(axis, stop, geometry):
        normal = Vector((0, 0, 0))
        normal[axis] = 1.0
        bmesh.ops.bisect_plane(bm, geom=geometry, dist=0.000001,
                               plane_co=inv @ (normal * stop), plane_no=normal_transform @ normal)

    cut(0, WIN_BACK, [*bm.verts, *bm.edges, *bm.faces])
    axes = ((1, (-WIN_IY - margin, WIN_IY + margin)),
            (2, (1.5 - WIN_IZ - margin, 1.5 + WIN_IZ + margin)))
    for axis, stops in axes:
        for stop in stops:
            rear_verts = [v for v in bm.verts if (mw @ v.co).x <= WIN_BACK + 0.00001]
            rear = set(rear_verts)
            rear_edges = [e for e in bm.edges if all(v in rear for v in e.verts)]
            rear_faces = [f for f in bm.faces if all(v in rear for v in f.verts)]
            cut(axis, stop, [*rear_verts, *rear_edges, *rear_faces])
    aperture = []
    for face in bm.faces:
        p = mw @ face.calc_center_median()
        if p.x < WIN_BACK and abs(p.y) < WIN_IY + margin and abs(p.z - 1.5) < WIN_IZ + margin:
            aperture.append(face)
    bmesh.ops.delete(bm, geom=aperture, context="FACES")
    bm.to_mesh(ob.data)
    bm.free()
    # its generated texture read as trowelled plaster: painted steel built here instead, in the door's own metres
    loc, rq, sc = mw.decompose()
    # blue-grey door paint, a step bluer and lighter than the block wall, rubbed glossy round the window frame and
    # the upper lock
    steel = mt.door_steel("cell door steel", tuple(loc), tuple(rq.to_euler()), tuple(sc), paint=DOOR_PAINT,
                          polish=((WIN_IY + WIN_FW, WIN_IZ + WIN_FW), (0.41, 1.72)))
    M["frame_steel"] = mt.door_steel("window frame steel", paint=DOOR_PAINT)
    for slot in ob.material_slots:
        slot.material = steel
    print(f"CORRIDOR cell door: {len(kill)} faces cut ({nbar} of the prop's bars), {len(aperture)} aperture pieces cut, "
          f"{moved} recess verts brought forward, "
          f"{squashed} hatch verts closed, {flat} surround verts flat, {hinged} hinge verts flat; "
          f"mesh-to-door {tuple(round(v, 3) for v in sc)}", flush=True)
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


def food_hatch(i, xf, turn, opened):
    """The near door's food hatch open: a dark slot with the cell's faint light behind it, a pressed-steel surround,
    the flap down as a shelf on two stays, and a moulded plastic meal tray pushed half out onto it, a cup in it.
    Door-local coordinates (x out of the leaf, whose face is at FRONT)."""
    m = materials()
    L = lambda n, size, p, mm, bev=0.0: box(f"cd{i}_{n}", size, xf(p), mm, bevel=bev, rot=(0, 0, turn))
    f0 = LEAF + 0.004                                 # the flattened hatch plate
    zb, zt, hw = 0.86, 1.01, 0.18                     # slot bottom, top, half width
    if opened:
        L("slot", (0.004, 2 * hw, zt - zb), (f0 + 0.001, 0.0, (zb + zt) / 2), mt.glow("hatch slot", (0.55, 0.68, 0.9), 0.05))
    for sg in (-1, 1):
        L("hatch_jamb", (0.012, 0.022, zt - zb + 0.044), (f0 + 0.006, sg * (hw + 0.011), (zb + zt) / 2), m["frame"], 0.003)
    L("hatch_head", (0.012, 2 * hw + 0.044, 0.022), (f0 + 0.006, 0.0, zt + 0.011), m["frame"], 0.003)
    L("hatch_sill", (0.012, 2 * hw + 0.044, 0.022), (f0 + 0.006, 0.0, zb - 0.011), m["frame"], 0.003)
    if not opened:
        L("closed_flap", (0.012, 0.40, 0.16), (f0 + 0.015, 0.0, (zb + zt) / 2), m["frame_steel"], 0.003)
        hardware = bmesh.new()
        for yy in (-0.14, 0.14):
            add_rod(hardware, xf((f0 + 0.022, yy - 0.024, zb)), xf((f0 + 0.022, yy + 0.024, zb)), 0.009, 16)
        mesh_obj(f"cd{i}_flap_knuckles", hardware, m["hinge"], smooth=True)
        L("slide", (0.010, 0.060, 0.014), (f0 + 0.029, 0.10, zt - 0.025), m["hardware"], 0.002)
        L("bolt_knob", (0.008, 0.009, 0.008), (f0 + 0.036, 0.117, zt - 0.022), m["hardware"], 0.002)
        return
    # the flap, down: a shelf on two stays, sagging 6 deg at its outer edge (so the tray on it tips toward the
    # corridor and its compartments show)
    fd, sag = 0.21, math.radians(6.0)
    hx, hz = f0 + 0.012, zb                           # the flap's hinge line (door-local x, z)
    Rf = Matrix.Rotation(turn, 3, "Z") @ Matrix.Rotation(sag, 3, "Y")
    fe = Rf.to_euler()
    on_flap = lambda s, y, h=0.0: (hx + s * math.cos(sag) + h * math.sin(sag), y, hz - s * math.sin(sag) + h * math.cos(sag))
    box(f"cd{i}_hatch_flap", (fd, 2 * hw + 0.02, 0.01), xf(on_flap(fd / 2, 0.0, -0.005)), m["frame"], bevel=0.003, rot=fe)
    bm = bmesh.new()
    for sg in (-1, 1):
        a = xf(on_flap(fd - 0.01, sg * (hw + 0.004)))
        b = xf((f0 + 0.012, sg * (hw + 0.004), zt + 0.005))
        add_rod(bm, a, b, 0.0035, 8)
    mesh_obj(f"cd{i}_hatch_stays", bm, m["hardware"], smooth=True)
    # the tray: 0.34 x 0.25 m, 25 mm deep, three compartments; pushed out onto the flap and left turned 18 deg
    # (its back corner still in the slot), the compartments toward the corridor
    tw, td, th, wt = 0.34, 0.25, 0.024, 0.004
    root = empty(f"cd{i}_tray", xf(on_flap(fd / 2 + 0.012, 0.012, 0.0005)))
    root.rotation_euler = (Matrix.Rotation(turn, 3, "Z") @ Matrix.Rotation(sag, 3, "Y")
                           @ Matrix.Rotation(math.radians(18.0), 3, "Z")).to_euler()
    bm = bmesh.new()
    add_box(bm, (td, tw, wt), Vector((0, 0, wt / 2)))
    for sg in (-1, 1):
        add_box(bm, (td, wt, th), Vector((0, sg * (tw - wt) / 2, th / 2)))
        add_box(bm, (wt, tw, th), Vector((sg * (td - wt) / 2, 0, th / 2)))
    add_box(bm, (wt, tw, th * 0.85), Vector((-0.03, 0, th * 0.425)))            # long divider
    add_box(bm, (td / 2 + 0.03, wt, th * 0.85), Vector(((td / 2 - 0.03) / 2, 0.045, th * 0.425)))   # short one
    tray = bevelled(mesh_obj(f"cd{i}_tray_body", bm, m["tray"]), 0.0012, 2, 40)
    tray.parent = root
    # a thin-walled plastic cup, open at the top, standing in the far front compartment
    cup = lathe(f"cd{i}_tray_cup", [(0.001, 0.0), (0.026, 0.0), (0.028, 0.004), (0.034, 0.088), (0.0345, 0.09)], m["cup"], 32)
    so = cup.modifiers.new("wall", "SOLIDIFY")
    so.thickness, so.offset = 0.0012, -1.0
    cup.parent = root
    cup.location = (0.06, 0.105, wt)
    # a covered bowl in the near front compartment: a moulded bowl and its domed lid with a knob, untouched
    bowl = lathe(f"cd{i}_tray_bowl", [(0.001, 0.0), (0.034, 0.0), (0.046, 0.012), (0.053, 0.03), (0.054, 0.032)], m["cup"], 40)
    bowl.parent = root
    bowl.location = (0.055, -0.075, wt)
    lid = lathe(f"cd{i}_tray_lid", [(0.057, 0.0), (0.057, 0.006), (0.05, 0.018), (0.034, 0.028), (0.012, 0.032),
                                    (0.011, 0.04), (0.001, 0.041)], m["tray"], 40)
    lid.parent = root
    lid.location = (0.055, -0.075, wt + 0.03)
    # a plastic spoon lying in the long back compartment
    bm = bmesh.new()
    add_box(bm, (0.012, 0.11, 0.003), Vector((0.0, 0.0, 0.0)))
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=1.0,
                              matrix=Matrix.Translation((0.0, 0.07, 0.002)) @ Matrix.Diagonal((0.018, 0.026, 0.005, 1)))
    sp = bevelled(mesh_obj(f"cd{i}_tray_spoon", bm, m["cup"]), 0.001, 1, 40)
    sp.parent = root
    sp.location = (-0.078, -0.02, wt + 0.004)
    sp.rotation_euler = (0.06, 0.0, math.radians(-9))
    # the cell's faint light coming out through the slot over the tray: it rims the tray, the lid and the cup
    area(f"cd{i}_hatch_glow", xf((f0 + 0.008, 0.0, (zb + zt) / 2 + 0.01)), (0.3, 0.1), 16.0, (0.62, 0.76, 1.0),
         spread=130, rot=(0, -math.pi / 2, turn))


def window_frame(i, xf, turn):
    """A flat welded steel frame round the cell door's vision panel, over the prop's flattened surround: 50 x 10 mm
    flat bar, square inside, a 12 mm radius outside, bevelled edges, a weld bead where it meets the leaf, eight small
    countersunk bolt heads, and steel liners lining the reveal (they hide the cut-through geometry behind the
    glass). Built in door-local metres, so the door's steel material maps onto it directly."""
    iy, iz, ri = WIN_IY, WIN_IZ, 0.004                # inner (the opening's) half sizes, corner radius
    oy, oz, ro = iy + WIN_FW, iz + WIN_FW, 0.012      # outer half sizes, corner radius
    x0, x1 = LEAF - 0.002, LEAF + 0.010
    zc = 1.5
    def outline(hy, hz, r, k=6):
        pts = []
        for cy, cz, a0 in ((hy - r, hz - r, 0.0), (-(hy - r), hz - r, 90.0), (-(hy - r), -(hz - r), 180.0), (hy - r, -(hz - r), 270.0)):
            for j in range(k + 1):
                a = math.radians(a0 + 90.0 * j / k)
                pts.append((cy + r * math.cos(a), zc + cz + r * math.sin(a)))
        return pts
    out, inn = outline(oy, oz, ro), outline(iy, iz, ri)
    bm = bmesh.new()
    vo0 = [bm.verts.new((x0, y, z)) for y, z in out]
    vo1 = [bm.verts.new((x1, y, z)) for y, z in out]
    vi0 = [bm.verts.new((x0, y, z)) for y, z in inn]
    vi1 = [bm.verts.new((x1, y, z)) for y, z in inn]
    n = len(out)
    for j in range(n):
        k = (j + 1) % n
        bm.faces.new((vo1[j], vo1[k], vi1[k], vi1[j]))       # front
        bm.faces.new((vo0[k], vo0[j], vi0[j], vi0[k]))       # back
        bm.faces.new((vo0[j], vo0[k], vo1[k], vo1[j]))       # outer edge
        bm.faces.new((vi0[k], vi0[j], vi1[j], vi1[k]))       # inner edge
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # eight countersunk bolt heads: low 5 mm domes on the bar's mid line, two per side
    my, mz = (oy + iy) / 2, (oz + iz) / 2
    spots = [(sy * 0.11, sz * mz) for sy in (-1, 1) for sz in (-1, 1)] + [(sy * my, sz * 0.13) for sy in (-1, 1) for sz in (-1, 1)]
    for y, z in spots:
        bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=1.0,
                                  matrix=Matrix.Translation((x1 - 0.0005, y, zc + z)) @ Matrix.Diagonal((0.0025, 0.0065, 0.0065, 1)))
    me = bpy.data.meshes.new(f"cd{i}_win_frame")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(f"cd{i}_win_frame", me)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(M["frame_steel"])
    ob.location = xf((0, 0, 0))
    ob.rotation_euler = (0, 0, turn)
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method, bv.angle_limit = 0.0018, 2, "ANGLE", math.radians(50)
    ob.modifiers.new("wn", "WEIGHTED_NORMAL")
    for p in me.polygons:
        p.use_smooth = True
    # the weld bead round the outside, where the bar meets the leaf: a slightly lumpy 4 mm fillet
    cu = bpy.data.curves.new(f"cd{i}_weld", "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution = "3D", 0.0022, 2
    sp = cu.splines.new("POLY")
    wpts = outline(oy + 0.0008, oz + 0.0008, ro + 0.0008, 6)
    sp.points.add(len(wpts) - 1)
    for k, (y, z) in enumerate(wpts):
        sp.points[k].co = (LEAF + 0.0012, y, z, 1)
        sp.points[k].radius = 0.85 + 0.3 * (0.5 + 0.5 * math.sin(k * 2.7))
    sp.use_cyclic_u = True
    weld = bpy.data.objects.new(f"cd{i}_weld", cu)
    bpy.context.scene.collection.objects.link(weld)
    weld.data.materials.append(M["frame_steel"])
    weld.location = xf((0, 0, 0))
    weld.rotation_euler = (0, 0, turn)
    # reveal liners from the glass to the leaf face
    L = lambda nm, size, p: box(f"cd{i}_{nm}", size, xf(p), M["frame_steel"], bevel=0.0015, rot=(0, 0, turn))
    d, xm = LEAF + 0.004 - WIN_BACK, (LEAF + 0.004 + WIN_BACK) / 2
    L("rev_b", (d, 2 * iy, 0.006), (xm, 0.0, zc - iz + 0.003))
    L("rev_t", (d, 2 * iy, 0.006), (xm, 0.0, zc + iz - 0.003))
    for sg in (-1, 1):
        L("rev_s", (d, 0.006, 2 * iz), (xm, sg * (iy - 0.003), zc))


def cell_bars(i, xf, turn):
    """Round cell bars in the window recess: four 18 mm bars at 75 mm centres, 2 cm in front of the glass, and
    one continuous flat tie at mid height that they pass through: 40 mm tall and 24 mm deep, so it stands proud of
    the bars front and back and reads as one strap from reveal to reveal, not as blocks between the bars."""
    m = materials()
    for k, yy in enumerate((-0.1125, -0.0375, 0.0375, 0.1125)):
        sk.cyl(f"cd{i}_bar{k}", 0.009, 0.46, xf((0.262, yy, 1.5)), m["bars"], verts=20)
    box(f"cd{i}_bar_tie", (0.024, 2 * WIN_IY - 0.012, 0.04), xf((0.262, 0.0, 1.5)), m["bars"], bevel=0.0015,
        rot=(0, 0, turn))


def hinges(i, xf, turn):
    """Three barrel hinges on the hinge side (door-local -y), over the prop's flattened ones: a 25 mm knuckle
    120 mm long in two parts over the gap between leaf and frame, a flush 4 mm leaf on the door with four
    countersunk screws, and its twin on the frame."""
    m = materials()
    L = lambda n, size, p, bev: box(f"cd{i}_{n}", size, xf(p), m["hinge"], bevel=bev, rot=(0, 0, turn))
    for k, zc in enumerate((0.31, 1.0, 1.69)):
        for h_, dz in ((0, -0.0305), (1, 0.0305)):
            kn = sk.cyl(f"cd{i}_knuckle{k}{h_}", 0.0125, 0.059, xf((LEAF + 0.0105, -0.447, zc + dz)), m["hinge"],
                        rot=(0, 0, turn), verts=28)
            bevelled(kn, 0.0025, 2, 40)
        L(f"hinge_leaf{k}", (0.004, 0.072, 0.118), (LEAF + 0.002, -0.403, zc), 0.0012)
        L(f"hinge_frame{k}", (0.004, 0.062, 0.118), (0.288, -0.49, zc), 0.0012)
        for sy in (-1, 1):
            for sz in (-1, 1):
                s = sk.cyl(f"cd{i}_hscrew{k}", 0.0045, 0.0014, xf((LEAF + 0.0045, -0.403 + sy * 0.019, zc + sz * 0.036)),
                           m["hinge"], rot=(0, math.pi / 2, turn), verts=16)
                bevelled(s, 0.0009, 2, 40)


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
        window_frame(i, xf, turn)
        hinges(i, xf, turn)
        box(f"cd{i}_deadlock", (0.03, 0.05, 0.16), xf((LEAF + 0.015, 0.41, 1.72)),
                      m["frame_steel"], bevel=0.003, rot=(0, 0, turn))
        sk.cyl(f"cd{i}_lock_face", 0.011, 0.002, xf((LEAF + 0.031, 0.41, 1.72)), m["hardware"],
               rot=(0, math.pi / 2, turn), verts=24)
        food_hatch(i, xf, turn, opened=i == HATCH_OPEN)
        if i in WIN_LIT:
            # the cell's night light seen through the vision panel: a small panel just inside the glass aimed out
            # across the corridor and 9 deg down, so it lays a soft cool patch on the opposite wall at dado height
            d = Matrix.Rotation(turn, 3, "Z") @ Vector((math.cos(math.radians(9)), 0.0, -math.sin(math.radians(9))))
            li = area(f"cd{i}_win_night", xf((0.17, 0.0, 1.5)), (0.2, 0.1), WIN_LIT[i], (0.66, 0.79, 1.0), spread=110)
            li.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
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
        # (the close-up door's glass reflects less: its ghost reflections filled the window's upper half)
        L("glass", (0.006, 0.374, 0.434), (0.232, 0.0, 1.5), M["glass_close"] if (side, y) == CLOSE else m["glass"])
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
        if p.x > LEAF + 0.004 and abs(p.y) < 0.27 and 0.64 < p.z < 1.13:
            p.x = LEAF + 0.004
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
    # the frame sits 2 mm down in the screed (its top 3 mm above the floor), a 3 mm dark joint round it
    for s in (-1, 1):
        add_box(bm, (o, w, 0.006), (x, y + s * (o - w) / 2, 0.0))
        add_box(bm, (w, i_, 0.006), (x + s * (o - w) / 2, y, 0.0))
    bevelled(mesh_obj("drain_frame", bm, m["iron"]), 0.002, 2)
    bm = bmesh.new()
    g = 0.003
    for s in (-1, 1):
        add_box(bm, (o + 2 * g, g, 0.001), (x, y + s * (o + g) / 2, 0.00015))
        add_box(bm, (g, o, 0.001), (x + s * (o + g) / 2, y, 0.00015))
    mesh_obj("drain_joint", bm, m["void"])
    bm = bmesh.new()
    n = 9
    for k in range(n):                             # slots across the grate
        xx = x - i_ / 2 + (k + 0.5) * i_ / n
        add_box(bm, (0.011, i_, 0.0024), (xx, y, 0.0016))
    add_box(bm, (i_, 0.012, 0.0024), (x, y, 0.0016))
    bevelled(mesh_obj("drain_grate", bm, m["iron"]), 0.001, 1)
    box("drain_void", (i_, i_, 0.0006), (x, y, 0.0003), m["void"])


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
    PARTS["vd_leaf"] = leaf

    def child(ob):
        ob.parent = leaf
        return ob
    # vision panel (wired glass, the room's light behind it) and its bead, kick plate, levers both sides
    vx, vz, vw, vh = lw - 0.2, 1.42, 0.1, 0.55
    child(box("vd_glass", (vw, lt + 0.002, vh), (vx, lt / 2, vz), mt.wired_glow("vd glass", AMBER, 1.5)))
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
    # camera (its spread is narrow, and Cycles keeps a light's power as its spread narrows: the energy is set so the
    # floor 1 m out matches a fitting's pool and fades by 3-4 m, not by multiplying the old wide light's). It is kept
    # out of reflections: the floor mirrors the real bright gap instead of a hidden emitter aimed at the lens
    area("vd_leak", (VD_X + 0.28, Y1 + 0.06, 0.95), (0.12, 1.8), 90.0, AMBER, spread=50,
         rot=(-math.radians(68), 0, 0), glossy=False)
    # for the corridor camera only (TRIMS): the room behind the gap washed warm from above, so through the gap it
    # is the brightest, warmest thing at the vanishing point
    area("room_warm", (0.55, 15.0, H - 0.05), (1.4, 1.6), 0.0, AMBER, spread=110, glossy=False)
    # for the corridor camera only (TRIMS): the room's lamp light falling out through the gap at a downward angle:
    # a spot 0.5 m inside the room, tipped 30 deg down with a wide, fully blended 60 deg cone, so the door gap (the
    # jamb on one side, the leaf's shadow on the other) cuts it into a warm wedge on the corridor floor, narrow at
    # the threshold, widening and fading over 2-3 m, with no spotlight edge (a 75 deg cone since round 4, so the
    # wedge lies 2-3 m out of the door past the dying tube's footprint)
    spot("vd_floor_wedge", (VD_X + 0.3, Y1 + T + 0.5, 1.15), 0.0, LEAK, 75.0, 1.0, radius=0.08,
         rot=(-math.radians(70), 0, 0))
    # and the corridor's cool light falling in through the open door: a faint wash across the room
    area("vd_spill", (VD_X + 0.25, Y1 + T + 0.05, 1.15), (0.4, 2.0), 16.0, COOL, spread=100, rot=(math.pi / 2, 0, 0),
         glossy=False)
    return leaf


def near_door():
    """The corridor's near end, behind the corridor camera: a steel door recessed in the end wall with a narrow
    blank-glazed strip, the lit stair beyond it leaking a faint cool light along the floor and the near walls (so
    the foreground walls are lit by something real, from behind, at a grazing angle that draws the mortar lines)."""
    m = materials()
    x0 = 0.45
    box("nd_leaf", (VD_W - 0.006, 0.05, VD_H - 0.012), (x0, Y0 + 0.02, 0.008 + (VD_H - 0.012) / 2), m["door"], 0.004)
    box("nd_glass", (0.16, 0.054, 1.5), (x0 + 0.22, Y0 + 0.02, 1.1), mt.glow("nd glass", COOL, 0.4))
    for s in (-1, 1):
        box("nd_jamb", (0.05, 0.03, VD_H + 0.05), (x0 + s * (VD_W / 2 + 0.025), Y0 + 0.015, (VD_H + 0.05) / 2), m["frame"], 0.005)
    box("nd_head", (VD_W + 0.1, 0.03, 0.05), (x0, Y0 + 0.015, VD_H + 0.025), m["frame"], 0.005)
    d = Vector((0.0, math.cos(math.radians(10)), -math.sin(math.radians(10))))
    li = area("near_leak", (x0 + 0.22, Y0 + 0.08, 1.05), (0.3, 1.8), NEAR_LEAK_W, COOL, spread=120)
    li.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


NEAR_LEAK_W = 45.0


def back_door():
    """The closed steel door in the visitation room's back wall: the one the detainee would come through."""
    m = materials()
    yc = RY1 + T / 2
    for s in (-1, 1):
        box("bd_jamb", (0.05, T + 0.03, VD_H + 0.05), (BD_X + s * (VD_W / 2 + 0.025), yc, (VD_H + 0.05) / 2), m["frame"], 0.005)
    box("bd_head", (VD_W + 0.1, T + 0.03, 0.05), (BD_X, yc, VD_H + 0.025), m["frame"], 0.005)
    lw, lt, lh = VD_W - 0.006, 0.05, VD_H - 0.012
    box("bd_leaf", (lw, lt, lh - 0.01), (BD_X, RY1 + 0.03, 0.018 + (lh - 0.01) / 2), m["door"], 0.004)
    # the corridor beyond lit: a cool sliver of light under the door (an 18 mm gap), fanning out across the floor
    # (round 4: the sliver dimmed, it read as an LED strip, and its light raised and tipped further down, so it fans
    # 30-40 cm across the tiles with a soft falloff)
    box("bd_under", (lw - 0.02, 0.01, 0.008), (BD_X, RY1 + 0.07, 0.004), mt.glow("bd under", COOL, 0.05))
    d = Vector((0.0, -math.cos(math.radians(20)), -math.sin(math.radians(20))))
    li = area("bd_under_light", (BD_X, RY1 + 0.01, 0.011), (lw - 0.04, 0.012), 3.0, COOL, spread=150)
    li.visible_camera = li.visible_glossy = False
    li.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    # its vision panel: the cold corridor on the far side, faint through wired glass
    box("bd_glass", (0.12, 0.054, 0.2), (BD_X - 0.2, RY1 + 0.03, 1.55), mt.wired_glow("bd glass", COOL, 0.012))
    bm = bmesh.new()
    for sx in (-1, 1):
        add_box(bm, (0.016, 0.01, 0.232), (BD_X - 0.2 + sx * 0.068, RY1 + 0.0, 1.55))
    for sz in (-1, 1):
        add_box(bm, (0.12, 0.01, 0.016), (BD_X - 0.2, RY1 + 0.0, 1.55 + sz * 0.108))
    bevelled(mesh_obj("bd_bead", bm, m["hardware"]), 0.003, 2)
    # the lock: a steel plate, a rose and a lever with 2 mm bevels, so one edge picks a glint off the pendant
    lx = BD_X - lw / 2 + 0.075
    box("bd_lock", (0.08, 0.008, 0.2), (lx, RY1 - 0.003, 1.02), m["hardware"], 0.002)
    r = sk.cyl("bd_rose", 0.026, 0.012, (lx, RY1 - 0.013, 1.05), m["hardware"], rot=(math.pi / 2, 0, 0), verts=40)
    bevelled(r, 0.002, 2, 40)
    sk.cyl("bd_spindle", 0.008, 0.04, (lx, RY1 - 0.035, 1.05), m["hardware"], rot=(math.pi / 2, 0, 0), verts=16)
    lv = sk.cyl("bd_lever", 0.0095, 0.13, (lx + 0.062, RY1 - 0.052, 1.05), m["hardware"], rot=(0, math.pi / 2, 0), verts=24)
    bevelled(lv, 0.002, 2, 40)
    sk.cyl("bd_keyhole", 0.009, 0.004, (lx, RY1 - 0.008, 0.97), m["void"], rot=(math.pi / 2, 0, 0), verts=16)
    box("bd_kick", (lw - 0.06, 0.003, 0.25), (BD_X, RY1 + 0.004, 0.14), m["steel"], 0.001)


# ---------------------------------------------------------------- the visitation room's furniture
def table():
    """Bolted-down institutional table: a 35 mm laminate top (its edge band chipped) on a welded steel frame, a
    75 mm steel apron, 50 mm square legs, and at each foot a 100 mm square, 6 mm floor flange with four bolts."""
    m = materials()
    x, y = TABLE
    tt = 0.035
    box("table_top", (1.1, 0.7, tt), (x, y, TOP - tt / 2), m["laminate"], 0.003)
    za = TOP - tt - 0.0375
    for s in (-1, 1):
        box("table_apron", (0.94, 0.025, 0.075), (x, y + s * 0.27, za), m["table_steel"], 0.003)
        box("table_apron", (0.025, 0.515, 0.075), (x + s * 0.46, y, za), m["table_steel"], 0.003)
    for sx in (-1, 1):
        for sy in (-1, 1):
            lx, ly = x + sx * 0.465, y + sy * 0.275
            box("table_leg", (0.05, 0.05, TOP - tt), (lx, ly, (TOP - tt) / 2), m["table_steel"], 0.004)
            box("table_foot", (0.1, 0.1, 0.006), (lx, ly, 0.003), m["table_steel"], 0.002)
            for bx in (-1, 1):
                for by in (-1, 1):
                    b = sk.cyl("table_bolt", 0.0075, 0.006, (lx + bx * 0.034, ly + by * 0.034, 0.009), m["hardware"], verts=6)
                    bevelled(b, 0.001, 1, 40)
                    sk.cyl("table_washer", 0.011, 0.0015, (lx + bx * 0.034, ly + by * 0.034, 0.0065), m["hardware"], verts=24)


def chair(xy, facing_deg, val=0.95):
    """The visitor chair, turned so its front looks along `facing_deg` (world, 0 = +X). Its front in the file is
    found from the backrest (the backrest's normal, from the back toward the seat)."""
    h = props.load("visitor-chair", size=0.82, axis="z", loc=(0, 0, 0), sat=0.55, val=val, rough_add=0.12)
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
    """A sealed envelope back up, with a folded letter, layered flaps and a gently curled corner."""
    m = materials()
    root = empty("envelope", (cx, cy, z), math.radians(ang_deg))
    cq = 0.09                                            # the curl's reach in from the corner, along the diagonal
    def pill(x, y):
        """Height of the envelope's back: pillowed by the folded letter, a gentle warp, and its far left corner
        curled up off the table (a fold line square to the diagonal, rising as the square of the distance)."""
        h = 0.0045 * max(0.0, 1 - (2 * x / W) ** 4) * max(0.0, 1 - (2 * y / D) ** 4)
        h += 0.0006 * math.sin(2.1 * math.pi * x / W + 0.6) * math.cos(1.3 * math.pi * y / D)
        h += 0.0006 * (1 + math.sin(3.0 * math.pi * x / W - 1.0)) * max(0.0, (2 * y / D) ** 2 - 0.6)
        q = ((x + W / 2) + (D / 2 - y)) * 0.70711
        h += 0.003 * max(0.0, 1 - q / cq) ** 2
        return max(h, 0.0)
    nu, nv = 46, 32
    bm = bmesh.new()
    vs = [[bm.verts.new((-W / 2 + W * i / nu, -D / 2 + D * j / nv, 0.0)) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
    for v in bm.verts:
        v.co.z = pill(v.co.x, v.co.y) + 0.0012
    body = mesh_obj("envelope_body", bm, m["paper"], smooth=True)
    so = body.modifiers.new("card", "SOLIDIFY")
    so.thickness, so.offset = 0.0012, -1.0
    body.parent = root

    def flap(name, hinge, edge, lift):
        # Sample the inside of each flap as well as its outline. The layers
        # conform to the same paper bulge without bridging across it.
        profile = []
        for (x0, y0), (x1, y1) in zip(edge, edge[1:]):
            steps = math.ceil((x1 - x0) * nu / W)
            for i in range(steps):
                t = i / steps
                profile.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
        profile.append(edge[-1])
        bm = bmesh.new()
        rows = nv // 2
        columns = []
        for x, y in profile:
            if y == hinge:
                corner = bm.verts.new((x, y, pill(x, y) + 0.0012 + lift))
                columns.append([corner] * (rows + 1))
                continue
            column = []
            for j in range(rows + 1):
                v = hinge + (y - hinge) * j / rows
                column.append(bm.verts.new((x, v, pill(x, v) + 0.0012 + lift)))
            columns.append(column)
        for left, right in zip(columns, columns[1:]):
            for j in range(rows):
                face = (left[j], right[j], right[j + 1], left[j + 1])
                if hinge > 0:
                    face = face[::-1]
                bm.faces.new(tuple(dict.fromkeys(face)))
        ob = mesh_obj(name, bm, m["flap"], smooth=True)
        s = ob.modifiers.new("card", "SOLIDIFY")
        s.thickness, s.offset = 0.0003, -1.0
        ob.parent = root
        return ob
    x, y = W / 2 - 0.0015, D / 2 - 0.0015                 # just inside the body
    tip = -D * 0.06
    flap("envelope_bottom_flap", -y, [(-x, -y), (-W * 0.1, D * 0.1), (W * 0.1, D * 0.1), (x, -y)], 0.0003)
    flap("envelope_top_flap", y, [(-x, y), (-W * 0.03, tip + 0.005),
                                  (-W * 0.012, tip + 0.001), (0.0, tip), (W * 0.012, tip + 0.001),
                                  (W * 0.03, tip + 0.005), (x, y)], 0.0006)
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
    spot("pendant_light", (x, y, z0 + 0.1), PEND_W, LEAK, 95.0, 0.35, 0.03)
    spot("pendant_pool", (x, y, z0 + 0.1), POOL_W, LEAK, POOL_CONE, 0.65, 0.03)
    g = point("pendant_glow", (x, y, z0 + 0.135), GLOW_W, WARM, radius=0.02)
    g.visible_glossy = True


def clock(xyz):
    """A plain wall clock: ticks only, no numerals."""
    m = materials()
    x, y, z = xyz
    r = sk.cyl("clock_rim", 0.16, 0.045, (x, y - 0.0225, z), m["clock_rim"], rot=(math.pi / 2, 0, 0), verts=64)
    bevelled(r, 0.006, 3, 30)
    sk.cyl("clock_face", 0.145, 0.002, (x, y - 0.0462, z), m["clock_face"], rot=(math.pi / 2, 0, 0), verts=64)
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
    ob.location = (x, y - 0.0478, z)
    sk.cyl("clock_pin", 0.006, 0.006, (x, y - 0.0505, z), m["ink"], rot=(math.pi / 2, 0, 0), verts=16)


def wall_vent(name, loc, w=0.42, h=0.26, axis="x"):
    """A blank louvred supply vent flush on a wall: a bevelled frame and angled blades, dark behind."""
    m = materials()
    x, y, z = loc
    s_ = -1                                           # the room is on the -Y side of the back wall
    box(name + "_back", (w - 0.02, 0.006, h - 0.02), (x, y - 0.002, z), m["void"])
    for sg in (-1, 1):
        box(name + "_fv", (0.022, 0.016, h), (x + sg * (w / 2 - 0.011), y + s_ * 0.008, z), m["vent"], 0.003)
        box(name + "_fh", (w, 0.016, 0.022), (x, y + s_ * 0.008, z + sg * (h / 2 - 0.011)), m["vent"], 0.003)
    n = 7
    for k in range(n):
        zz = z - h / 2 + 0.03 + k * (h - 0.06) / (n - 1)
        box(f"{name}_blade{k}", (w - 0.04, 0.028, 0.004), (x, y + s_ * 0.012, zz), m["vent"], 0.0012, rot=(math.radians(35), 0, 0))


def clock_light(xyz):
    """A small kicker 0.3 m below the clock, grazing up across its face, so it reads as a clock (ticks, hands),
    not a dark disc."""
    x, y, z = xyz
    area("clock_kick", (x, y - 0.24, z - 0.3), (0.1, 0.1), 0.8, (0.95, 0.93, 0.9), spread=90,
         rot=(math.pi - math.radians(38), 0, 0), glossy=False)


CLOCK = (-1.35, RY1, 1.9)


def room():
    table()
    pendant()
    back_door()
    clock(CLOCK)
    wall_vent("room_vent", (1.5, RY1, 0.34))
