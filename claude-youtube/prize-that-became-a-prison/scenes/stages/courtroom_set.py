"""The courtroom set (Ch 07 'The sentence'): a modern hall of justice reconstructed with restraint.

World layout (metres, Z up, floor z = 0). The room runs along Y: the judges' bench across the far end (+Y), the dock in
the middle of the well, the bar and the public gallery toward the near end (-Y), where the wide camera stands. Built in
Python but for the judge chairs, gallery benches and microphones (generated props, instanced).

    shell()      stone floor (600 mm tiles), painted plaster walls with a pale-wood wainscot, a perimeter bulkhead and a
                 ceiling field of lay-in opal light panels (lit over the well and the bench only), a recessed downlight
                 over the dock (the one pool of light), high frosted windows on both side walls in lined reveals, each
                 throwing a slanted beam across the room (brighter from the left)
    back_wall()  dark smoked-oak boarding behind the bench, a taller central feature with a recessed field framed by a
                 pale-ash bolection moulding where an emblem would hang (no emblem, no text), a judges' door
    dais()       the raised platform with its steps; bench() the pale-wood judges' bench (boarded fascia, cap, a centre
                 section that steps forward), chairs and microphones
    desks()      the two counsel desks facing each other across the well (empty chairs, microphones)
    dock()       the defendant's dock: waist-high pale-wood frame-and-panel enclosure with a cap rail, a deep front ledge
                 with a microphone, a small gate in the back with bronze hinges and a latch
    bar()        the balustrade between the well and the gallery, its pair of gates swung open on the aisle
    gallery()    rows of gallery benches either side of a centre aisle
    dressing()   a side door (the defendant's entrance), ceiling cameras, acoustic panels and a cornice on the side walls,
                 a vent grille, two speakers, the aisle runner; the clerk's desk at the foot of the bench (closed laptop,
                 a blank monitor glowing faintly toward the clerk's empty chair), closed folders and water glasses on
                 the counsel desks, one closed folder on the bench
"""
import math

import bpy
import bmesh
from mathutils import Matrix, Vector

import props
import setkit as sk
import courtroom_mats as mt

XW = 5.6            # half width (side walls' room faces at x = +-XW)
Y0, Y1 = -8.2, 7.0  # gallery end wall, bench wall
H = 5.6             # ceiling field
BULK, BULK_W = 5.2, 0.9   # perimeter bulkhead: underside, width
T = 0.3             # wall thickness

BENCH_Y = 4.3       # the bench wings' fascia face; the centre section stands CENTRE_OUT further forward
CENTRE_X, CENTRE_OUT = 1.05, 0.12
BENCH_X = 3.3       # half length
DAIS_Z = 0.45
DESK_Z = 1.19       # judges' work surface
CAP_Z = 1.27        # top of the fascia cap
CHAIR_X = (-1.75, 0.0, 1.75)
CHAIR_Y = BENCH_Y + 1.32        # chair fronts clear of the work surface (its arms would cut the desk)

DOCK = (0.0, 0.6)   # centre of the dock
DOCK_HX, DOCK_HY = 0.75, 0.6
DOCK_PLAT = 0.1     # its floor
DOCK_TOP = DOCK_PLAT + 1.0
LEDGE = (DOCK[1] + DOCK_HY - 0.2, DOCK[1] + DOCK_HY + 0.03)   # the front ledge's y range (inside .. outside)

BAR_Y = -2.7
ROWS = (-3.8, -4.85, -5.9, -6.95)
PEW_X = (-3.85, -1.75, 1.75, 3.85)
WIN_Y = (-5.8, -3.0, -0.2, 2.6, 5.4)
WIN_Z = (3.0, 4.95)
WIN_W = 1.1

DESK_IN, DESK_OUT = 4.0, 4.72    # counsel desks: inner (front) face and back edge, |x|
DESK_Y = (0.3, 2.9)
SIDE_DOOR_Y = -1.45

COOL = (0.84, 0.91, 1.0)         # institutional fluorescent white
DAY = (0.78, 0.87, 1.0)          # overcast daylight through frosted glass
ASH = (0.46, 0.37, 0.26)         # pale ash before the grade (warm enough to stay wood after the cool grade)
OAK = (0.058, 0.045, 0.035)      # smoked oak

# ceiling light panels: columns (x), rows (y), and how bright each row burns (the lit island is the well and the bench)
PANEL_X = (-3.0, -1.5, 0.0, 1.5, 3.0)
PANEL_Y = (-6.6, -4.6, -2.6, -0.6, 1.4, 3.4, 5.4)
ROW_LEVEL = {-6.6: 0.0, -4.6: 0.0, -2.6: 0.0, -0.6: 0.6, 1.4: 1.0, 3.4: 0.8, 5.4: 0.45}
COL_LEVEL = {-3.0: 0.22, -1.5: 0.55, 0.0: 1.0, 1.5: 0.55, 3.0: 0.22}
PANEL_W = 520.0

M = {}
LIGHTS = {}
LENS = {}           # light name -> the opal diffuser material it shines through
CEILING = []        # parts a camera above the room must see through


# ---------------------------------------------------------------- helpers
def materials():
    if M:
        return M
    M.update(
        ash=mt.veneer("pale ash", ASH, "Z", contrast=0.2),                 # vertical boards
        ash_h=mt.veneer("pale ash along", ASH, "X", contrast=0.18),         # rails, caps, desk tops (grain along X)
        ash_y=mt.veneer("pale ash across", ASH, "Y", contrast=0.18),
        oak=mt.veneer("smoked oak", OAK, "Z", contrast=0.3, rough=(0.38, 0.52), coat=0.2, ring=0.006),
        oak_h=mt.veneer("smoked oak along", OAK, "X", contrast=0.3, rough=(0.38, 0.52), coat=0.2, ring=0.006),
        field=mt.veneer("smoked oak field", tuple(c * 1.15 for c in OAK), "Z", contrast=0.22, rough=(0.5, 0.62),
                        coat=0.08, ring=0.007),
        backing=mt.satin("reveal black", (0.012, 0.011, 0.01), rough=(0.6, 0.75)),
        plinth=mt.satin("plinth", (0.02, 0.019, 0.018), rough=(0.45, 0.6), grime=0.3),
        wall=mt.plaster("wall plaster", (0.19, 0.195, 0.2)),
        jamb=mt.plaster("jamb plaster", (0.3, 0.305, 0.31), grime=0.1, bump=0.03),
        ceil=mt.plaster("ceiling plaster", (0.3, 0.305, 0.31), grime=0.15, bump=0.03),
        floor=mt.stone_floor("stone floor", (0.1, 0.101, 0.104), 0.6,
                             walk=((-0.7, 0.7, Y0, BAR_Y), (-0.9, 0.9, BAR_Y, DOCK[1]))),
        carpet=mt.carpet("dais carpet"),
        runner=mt.carpet("aisle runner", (0.045, 0.046, 0.05)),
        felt=mt.felt("acoustic felt", (0.07, 0.072, 0.076)),
        grille=mt.satin("grille", (0.2, 0.205, 0.21), rough=(0.4, 0.55), metal=0.3),
        speaker=mt.satin("speaker", (0.05, 0.05, 0.052), rough=(0.5, 0.65)),
        laptop=mt.satin("laptop shell", (0.09, 0.092, 0.095), rough=(0.32, 0.45), metal=0.7),
        tumbler=mt.glass("tumbler glass", (0.86, 0.9, 0.92)),
        bronze=mt.dark_metal("bronze"),
        frame=mt.satin("window frame", (0.035, 0.037, 0.04), rough=(0.3, 0.45), metal=0.6),
        sill=mt.blank_panel("stone sill", (0.16, 0.16, 0.158)),
        blank=mt.blank_panel("blank panel", (0.11, 0.112, 0.114)),
        trim=mt.satin("panel trim", (0.4, 0.405, 0.41), rough=(0.35, 0.45), metal=0.4),
        bezel=mt.satin("bezel", (0.012, 0.012, 0.013), rough=(0.4, 0.55)),
        dome=mt.glass("dome glass", (0.25, 0.26, 0.28)),
        white=mt.satin("white plastic", (0.45, 0.45, 0.44), rough=(0.4, 0.5)),
        opal_off=mt.opal("opal off", COOL, 0.0),
    )
    return M


def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0), segs=3, parent=None):
    ob = sk.box(name, size, loc, m, bevel=bevel, rot=rot)
    if bevel:
        bv = ob.modifiers["bevel"]
        bv.segments, bv.limit_method = segs, "ANGLE"
        bv.angle_limit = math.radians(40)
        bv.harden_normals = True
    if parent is not None:
        ob.parent = parent
    return ob


def span(name, x0, x1, y0, y1, z0, z1, m, bevel=0.0, segs=3):
    """A box given by its extents."""
    return box(name, (abs(x1 - x0), abs(y1 - y0), abs(z1 - z0)), ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), m,
               bevel=bevel, segs=segs)


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


def area(name, loc, size, energy, colour=COOL, spread=180, rot=(0, 0, 0), camera=False):
    li = sk.area_light(name, loc, size, energy, colour, spread_deg=spread, rot=rot)
    li.visible_camera = camera
    LIGHTS[name] = li
    return li


def aim_rot(frm, to):
    """Rotation that points a light's -Z from `frm` toward `to`."""
    return (Vector(to) - Vector(frm)).to_track_quat("-Z", "Y").to_euler()


def spot(name, loc, target, energy, colour, size_deg, blend, radius=0.1):
    li = bpy.data.lights.new(name, "SPOT")
    li.energy, li.color = energy, colour
    li.spot_size, li.spot_blend = math.radians(size_deg), blend
    li.shadow_soft_size = radius
    ob = bpy.data.objects.new(name, li)
    bpy.context.scene.collection.objects.link(ob)
    ob.location, ob.rotation_euler = loc, aim_rot(loc, target)
    ob.visible_camera = False
    LIGHTS[name] = ob
    return ob


def instance(src, name, loc, turn_deg):
    """A linked copy of a loaded prop (its holder and meshes; the mesh data and textures are shared)."""
    objs = [src] + list(src.children_recursive)
    copies = {}
    for o in objs:
        c = o.copy()
        c.name = f"{name}_{o.name}"
        bpy.context.scene.collection.objects.link(c)
        copies[o] = c
    for o, c in copies.items():
        if o.parent in copies:
            c.parent = copies[o.parent]
            c.matrix_parent_inverse = o.matrix_parent_inverse.copy()
    h = copies[src]
    h.location = loc
    h.rotation_euler = (0, 0, math.radians(turn_deg))
    return h


def boards(prefix, x0, x1, yf, z0, z1, m, width=0.56, thick=0.035, gap=0.008, axis="x", sign=-1, bevel=0.003):
    """A run of vertical boards whose show face is the plane `yf` (axis "x": boards along X, facing `sign`*Y) or
    x = `yf` (axis "y": along Y, facing `sign`*X), between a0 = x0 and a1 = x1, from z0 to z1; separated by reveals
    (the backing behind shows through). Returns the boards."""
    n = max(1, round((x1 - x0) / width))
    w = (x1 - x0) / n
    out = []
    for i in range(n):
        a = x0 + w * (i + 0.5)
        c = yf - sign * thick / 2
        if axis == "x":
            out.append(box(f"{prefix}{i}", (w - gap, thick, z1 - z0), (a, c, (z0 + z1) / 2), m, bevel=bevel))
        else:
            out.append(box(f"{prefix}{i}", (thick, w - gap, z1 - z0), (c, a, (z0 + z1) / 2), m, bevel=bevel))
    return out


# ---------------------------------------------------------------- shell
def shell():
    m = materials()
    span("floor", -XW - T, XW + T, Y0 - T, Y1 + T, -0.1, 0.0, m["floor"])
    # walls: back (bench) and gallery end, then the side walls built round the high windows
    span("wall_back", -XW - T, XW + T, Y1, Y1 + T, 0, H + 0.1, m["wall"])
    span("wall_front", -XW - T, XW + T, Y0 - T, Y0, 0, H + 0.1, m["wall"])
    for s, side in ((-1, "l"), (1, "r")):
        xa, xb = sorted((s * XW, s * (XW + T)))
        span(f"wall_{side}_low", xa, xb, Y0, Y1, 0, WIN_Z[0], m["wall"])
        span(f"wall_{side}_high", xa, xb, Y0, Y1, WIN_Z[1], H + 0.1, m["wall"])
        edges = [Y0] + [v for y in WIN_Y for v in (y - WIN_W / 2, y + WIN_W / 2)] + [Y1]
        for i in range(0, len(edges), 2):
            span(f"wall_{side}_pier{i}", xa, xb, edges[i], edges[i + 1], WIN_Z[0], WIN_Z[1], m["wall"])
        for j, y in enumerate(WIN_Y):
            window(f"win_{side}{j}", s, y)
    ceiling()
    wainscot()


WIN_BEAM = {"l": 420.0, "r": 150.0}     # the slanted daylight from each side's windows (left brighter)


def window(name, s, y):
    """A high window in the side wall (s = -1 left, +1 right): frosted glass set back near the outer face at the end of
    a 0.24 m reveal lined in paler plaster (the jambs catch the light off the glass), a slim dark frame with a mullion
    and a transom, a stone sill. Its light: a soft glow off the glass that lights the reveal, and a slanted beam
    (spread 32 deg) thrown down across the room, which lays a soft patch on the floor or the far wainscot and draws a
    faint shaft in the haze. The gallery's windows throw less, so the gallery stays dark."""
    m = materials()
    z0, z1 = WIN_Z
    xg = s * (XW + T - 0.06)
    left = s < 0
    gallery = y < BAR_Y
    glass = mt.frosted(f"{name}_glass", DAY, 1.15 if left else 0.8)
    g = box(f"{name}_glass", (0.01, WIN_W, z1 - z0), (xg, y, (z0 + z1) / 2), glass)
    g.visible_shadow = False
    # the reveal's lining: two jambs and a head
    xa, xb = sorted((s * XW, s * (XW + T - 0.065)))
    for k, yy in enumerate((y - WIN_W / 2 + 0.005, y + WIN_W / 2 - 0.005)):
        span(f"{name}_jamb{k}", xa, xb, yy - 0.005, yy + 0.005, z0, z1, m["jamb"])
    span(f"{name}_head", xa, xb, y - WIN_W / 2, y + WIN_W / 2, z1 - 0.01, z1, m["jamb"])
    f = 0.045
    for k, (sy, sz, cy, cz) in enumerate(((f, z1 - z0, y - WIN_W / 2 + 0.01 + f / 2, (z0 + z1) / 2),
                                          (f, z1 - z0, y + WIN_W / 2 - 0.01 - f / 2, (z0 + z1) / 2),
                                          (WIN_W - 0.02, f, y, z0 + f / 2), (WIN_W - 0.02, f, y, z1 - 0.01 - f / 2),
                                          (0.04, z1 - z0, y, (z0 + z1) / 2),              # mullion
                                          (WIN_W - 0.02, 0.04, y, z0 + (z1 - z0) * 0.68))):      # transom
        box(f"{name}_frame{k}", (0.05, sy, sz), (xg - s * 0.028, cy, cz), m["frame"], bevel=0.004, segs=2)
    sill = box(f"{name}_sill", (T + 0.05, WIN_W + 0.08, 0.05), (s * (XW + T / 2 - 0.025), y, z0 - 0.02), m["sill"],
               bevel=0.01)
    # the glow off the glass (lights the reveal and the wall about it)
    src = (s * (XW + T - 0.1), y, (z0 + z1) / 2)
    area(f"{name}_glow", src, (WIN_W - 0.12, z1 - z0 - 0.12), 9.0 if left else 6.0, DAY, spread=180,
         rot=aim_rot(src, (-s * 10.0, y, (z0 + z1) / 2)))
    # the slanted beam: the well's windows lay their patch on the floor across the room, the gallery's on the far
    # wainscot (lifting the wall, not the benches)
    src = (s * (XW + 0.02), y, (z0 + z1) / 2)
    tgt = (-s * (XW - 0.2), y + 0.9, 0.7) if gallery else (-s * 2.3, y + 0.9, 0.0)
    area(f"{name}_day", src, (WIN_W - 0.1, z1 - z0 - 0.1), WIN_BEAM["l" if left else "r"] * (0.45 if gallery else 1.0),
         DAY, spread=32, rot=aim_rot(src, tgt))
    return sill


def ceiling():
    m = materials()
    c = span("ceiling", -XW, XW, Y0, Y1, H, H + 0.1, m["ceil"])
    CEILING.append(c)
    # perimeter bulkhead with a crisp, bevelled inner edge
    for n, (x0, x1, y0, y1) in (("bulk_l", (-XW, -XW + BULK_W, Y0, Y1)), ("bulk_r", (XW - BULK_W, XW, Y0, Y1)),
                                ("bulk_b", (-XW + BULK_W, XW - BULK_W, Y1 - BULK_W, Y1)),
                                ("bulk_f", (-XW + BULK_W, XW - BULK_W, Y0, Y0 + BULK_W))):
        CEILING.append(span(n, x0, x1, y0, y1, BULK, H, m["ceil"], bevel=0.012))
    for y in PANEL_Y:
        for x in PANEL_X:
            CEILING.extend(light_panel(x, y, ROW_LEVEL[y] * COL_LEVEL[x]))
    # a linear wall-washer slot in the bulkhead over the bench wall: grazes the boarding behind the judges
    slot = box("washer_slot", (6.0, 0.06, 0.012), (0, Y1 - BULK_W + 0.18, BULK - 0.004), mt.glow("washer lens", COOL, 4.0))
    CEILING.append(slot)
    src = (0, Y1 - BULK_W + 0.18, BULK - 0.03)
    area("washer", src, (5.8, 0.05), 260.0, COOL, spread=100,
         rot=aim_rot(src, (0, Y1 + 0.6, BULK - 2.5)))
    downlight("dock_pool", DOCK[0], DOCK[1], 2600.0, size_deg=36, blend=0.5)


def light_panel(x, y, level):
    """A 0.6 x 1.2 m lay-in panel: a satin trim frame, the opal diffuser (lit or off) and its light."""
    m = materials()
    parts = []
    w, l = 0.6, 1.2
    for k, (sx, sy, cx, cy) in enumerate(((w + 0.05, 0.025, x, y - l / 2 - 0.0125), (w + 0.05, 0.025, x, y + l / 2 + 0.0125),
                                          (0.025, l, x - w / 2 - 0.0125, y), (0.025, l, x + w / 2 + 0.0125, y))):
        parts.append(box(f"panel_{x:+.1f}_{y:+.1f}_trim{k}", (sx, sy, 0.02), (cx, cy, H - 0.01), m["trim"], bevel=0.004))
    lens = mt.opal(f"opal_{x:+.1f}_{y:+.1f}", COOL, 7.5 * level) if level > 0 else m["opal_off"]
    parts.append(box(f"panel_{x:+.1f}_{y:+.1f}", (w, l, 0.01), (x, y, H - 0.012), lens))
    if level > 0:
        n = f"panel_{x:+.1f}_{y:+.1f}_light"
        area(n, (x, y, H - 0.03), (w - 0.04, l - 0.04), PANEL_W * level, COOL, spread=75)
        LENS[n] = lens            # a camera's light trim dims the diffuser with its light
    return parts


def downlight(name, x, y, energy, size_deg=32, blend=0.6):
    """A recessed round downlight in the ceiling (a satin trim ring and a glowing lens) and its spot straight down:
    the one pool of light on the dock."""
    m = materials()
    ring = sk.cyl(f"{name}_trim", 0.11, 0.02, (x, y, H - 0.01), m["trim"], verts=48)
    lens = sk.cyl(f"{name}_lens", 0.085, 0.01, (x, y, H - 0.016), mt.glow(f"{name} lens", COOL, 30.0), verts=48)
    CEILING.extend([ring, lens])
    return spot(name, (x, y, H - 0.04), (x, y, 0.0), energy, COOL, size_deg, blend, radius=0.08)


def wainscot():
    """Pale-wood wainscot to 1.1 m on the side and gallery walls: boards with reveals, a cap rail, a dark skirting."""
    m = materials()
    top = 1.1
    for s, side in ((-1, "l"), (1, "r")):
        runs = [(Y0 + 0.02, SIDE_DOOR_Y - 0.62), (SIDE_DOOR_Y + 0.62, Y1 - 0.02)] if s > 0 else [(Y0 + 0.02, Y1 - 0.02)]
        for k, (a0, a1) in enumerate(runs):
            xf = s * (XW - 0.03)
            span(f"wain_{side}{k}_back", s * XW, s * (XW - 0.01), a0, a1, 0.0, top, m["backing"])
            boards(f"wain_{side}{k}_b", a0, a1, xf, 0.12, top - 0.04, m["ash"], width=0.9, thick=0.02, axis="y", sign=-s)
            xa, xb = sorted((s * XW, s * (XW - 0.045)))
            span(f"wain_{side}{k}_cap", xa, xb, a0, a1, top - 0.04, top, m["ash_y"], bevel=0.008)
            xa, xb = sorted((s * XW, s * (XW - 0.028)))
            span(f"wain_{side}{k}_skirt", xa, xb, a0, a1, 0.0, 0.12, m["plinth"], bevel=0.003)
    span("wain_f_back", -XW, XW, Y0, Y0 + 0.01, 0.0, top, m["backing"])
    boards("wain_f_b", -XW + 0.02, XW - 0.02, Y0 + 0.03, 0.12, top - 0.04, m["ash"], width=0.9, thick=0.02, sign=1)
    span("wain_f_cap", -XW, XW, Y0, Y0 + 0.045, top - 0.04, top, m["ash_h"], bevel=0.008)
    span("wain_f_skirt", -XW, XW, Y0, Y0 + 0.028, 0.0, 0.12, m["plinth"], bevel=0.003)


# ---------------------------------------------------------------- the bench end
def back_wall():
    """Dark smoked-oak boarding across the bench wall to 3.3 m; a taller centre feature to 4.8 m that stands a little
    proud with a pale border; in it, the blank panel where a court's emblem would hang (deliberately nothing)."""
    m = materials()
    yb = Y1 - 0.01
    span("bw_backing", -XW, XW, Y1 - 0.012, Y1, 0, 3.3, m["backing"])
    door_x = (-5.35, -4.45)
    boards("bw_bl", -XW + 0.02, door_x[0] - 0.12, yb - 0.003, 0.0, 3.3, m["oak"], width=0.6, thick=0.03)
    boards("bw_bm", door_x[1] + 0.12, -2.3, yb - 0.003, 0.0, 3.3, m["oak"], width=0.6, thick=0.03)
    boards("bw_br", 2.3, XW - 0.02, yb - 0.003, 0.0, 3.3, m["oak"], width=0.6, thick=0.03)
    span("bw_lintel", door_x[0] - 0.12, door_x[1] + 0.12, yb - 0.033, yb, 2.45, 3.3, m["oak"], bevel=0.003)
    for k, (x0, x1) in enumerate(((-XW, -2.3), (2.3, XW))):      # (not through the centre feature: it would show in
        span(f"bw_cap{k}", x0, x1, yb - 0.06, yb, 3.3, 3.35, m["oak_h"], bevel=0.008)   # the niche)
    # the centre feature
    span("feat_back", -2.3, 2.3, yb - 0.04, yb, 0.0, 4.85, m["backing"])
    boards("feat_b", -2.1, 2.1, yb - 0.075, 0.0, 4.72, m["oak"], width=0.52, thick=0.035)
    for k, (x0, x1, z0, z1) in enumerate(((-2.3, -2.1, 0.0, 4.85), (2.1, 2.3, 0.0, 4.85), (-2.3, 2.3, 4.72, 4.85))):
        span(f"feat_border{k}", x0, x1, yb - 0.1, yb, z0, z1, m["ash"] if k < 2 else m["ash_h"], bevel=0.008)
    # where an emblem would hang: a recessed field in the boarding (the boards cut through to the backing), its back a
    # quiet smoked-oak field a shade lighter than the boarding, framed by a raised bolection moulding in the same oak (a
    # pale-ash one read as an empty picture frame); a wide, soft wash from above grazes the moulding, so the panel is
    # drawn by light on its profile, not by a contrasting outline (no light of its own on a rectangle)
    cz, s = 3.62, 1.2
    yf = yb - 0.075                                   # the boards' show face
    cutter = span("niche_cut", -s / 2, s / 2, yf - 0.02, yb - 0.038, cz - s / 2, cz + s / 2, m["backing"])
    cutter.hide_render = cutter.hide_viewport = True
    for o in [o for o in bpy.data.objects if o.name.startswith("feat_b") and o.name[6:].isdigit()]:
        lo = min((o.matrix_world @ Vector(c)).x for c in o.bound_box)
        hi = max((o.matrix_world @ Vector(c)).x for c in o.bound_box)
        if hi > -s / 2 and lo < s / 2:
            bo = o.modifiers.new("niche", "BOOLEAN")
            bo.operation, bo.solver, bo.object = "DIFFERENCE", "EXACT", cutter
    span("niche_field", -s / 2 - 0.01, s / 2 + 0.01, yb - 0.046, yb - 0.039, cz - s / 2 - 0.01, cz + s / 2 + 0.01,
         m["field"], bevel=0.002)
    ring_frame("niche_moulding", 0.0, cz, s - 0.02, s - 0.02, 0.085, yf - 0.032, yf + 0.006, m["oak_h"], bevel=0.01,
               segs=4)
    spot("blank_wash", (0, Y1 - 1.7, BULK - 0.12), (0, yb - 0.1, cz + 0.2), 40.0, COOL, 50, 0.9, radius=0.2)
    judges_door(door_x)


def ring_frame(name, cx, cz, iw, ih, width, y0, y1, m, bevel=0.01, segs=4):
    """A rectangular frame in the XZ plane (one mesh, so its corners read as mitres under the bevel): inner opening
    iw x ih centred on (cx, cz), `width` wide, from y0 (its face) to y1."""
    bm = bmesh.new()
    ow, oh = iw + 2 * width, ih + 2 * width
    rings = []
    for (w, h) in ((ow, oh), (iw, ih)):
        rings.append([(cx - w / 2, cz - h / 2), (cx + w / 2, cz - h / 2), (cx + w / 2, cz + h / 2), (cx - w / 2, cz + h / 2)])
    front = [[bm.verts.new((x, y0, z)) for x, z in r] for r in rings]
    back = [[bm.verts.new((x, y1, z)) for x, z in r] for r in rings]
    o, i = front
    ob, ib = back
    for k in range(4):
        n = (k + 1) % 4
        bm.faces.new((o[k], o[n], i[n], i[k]))          # the face toward the room (-Y)
        bm.faces.new((ob[k], ib[k], ib[n], ob[n]))      # the back
        bm.faces.new((o[k], ob[k], ob[n], o[n]))        # the outer edge
        bm.faces.new((i[k], i[n], ib[n], ib[k]))        # the inner edge (the reveal into the niche)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob_ = mesh_obj(name, bm, m)
    bv = ob_.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = bevel, segs, "ANGLE"
    bv.angle_limit = math.radians(40)
    bv.harden_normals = True
    for p in ob_.data.polygons:
        p.use_smooth = True
    return ob_


def door_leaf(name, cx, cy, w, h, facing, m_leaf, m_frame):
    """A flush door with a slim architrave, a lever handle and a kick plate. `facing`: the room direction ('-y' or
    '-x')."""
    m = materials()
    if facing == "-y":
        span(f"{name}_leaf", cx - w / 2, cx + w / 2, cy - 0.045, cy, 0.0, h, m_leaf, bevel=0.004)
        for k, (x0, x1, z0, z1) in enumerate(((cx - w / 2 - 0.07, cx - w / 2, 0, h + 0.07), (cx + w / 2, cx + w / 2 + 0.07, 0, h + 0.07),
                                              (cx - w / 2 - 0.07, cx + w / 2 + 0.07, h, h + 0.07))):
            span(f"{name}_arch{k}", x0, x1, cy - 0.07, cy, z0, z1, m_frame, bevel=0.006)
        hx, hy = cx + w / 2 - 0.09, cy - 0.06
        sk.cyl(f"{name}_rose", 0.026, 0.012, (hx, cy - 0.051, 1.02), m["bronze"], rot=(math.pi / 2, 0, 0), verts=32)
        box(f"{name}_lever", (0.13, 0.018, 0.018), (hx - 0.055, hy - 0.01, 1.02), m["bronze"], bevel=0.007)
        span(f"{name}_kick", cx - w / 2 + 0.02, cx + w / 2 - 0.02, cy - 0.05, cy - 0.044, 0.02, 0.24, m["bronze"], bevel=0.002)
    else:
        s = 1 if cx > 0 else -1
        span(f"{name}_leaf", cx - s * 0.045, cx, cy - w / 2, cy + w / 2, 0.0, h, m_leaf, bevel=0.004)
        for k, (y0, y1, z0, z1) in enumerate(((cy - w / 2 - 0.07, cy - w / 2, 0, h + 0.07), (cy + w / 2, cy + w / 2 + 0.07, 0, h + 0.07),
                                              (cy - w / 2 - 0.07, cy + w / 2 + 0.07, h, h + 0.07))):
            span(f"{name}_arch{k}", cx - s * 0.07, cx, y0, y1, z0, z1, m_frame, bevel=0.006)
        hy = cy + w / 2 - 0.09
        sk.cyl(f"{name}_rose", 0.026, 0.012, (cx - s * 0.051, hy, 1.02), m["bronze"], rot=(0, math.pi / 2, 0), verts=32)
        box(f"{name}_lever", (0.018, 0.13, 0.018), (cx - s * 0.07, hy - 0.055, 1.02), m["bronze"], bevel=0.007)
        span(f"{name}_kick", cx - s * 0.05, cx - s * 0.044, cy - w / 2 + 0.02, cy + w / 2 - 0.02, 0.02, 0.24, m["bronze"], bevel=0.002)


def judges_door(door_x):
    m = materials()
    cx, w = (door_x[0] + door_x[1]) / 2, door_x[1] - door_x[0]
    door_leaf("judges_door", cx, Y1 - 0.01, w, 2.3, "-y", m["oak"], m["oak"])


def dais():
    """The judges' platform across the bench end, carpeted, with a pale-wood riser and two steps at each end."""
    m = materials()
    x = 4.2
    yf = BENCH_Y + 0.02
    span("dais_body", -x, x, yf, Y1, 0.0, DAIS_Z - 0.012, m["plinth"])
    span("dais_carpet", -x, x, yf, Y1 - 0.01, DAIS_Z - 0.012, DAIS_Z, m["carpet"], bevel=0.004)
    for s in (-1, 1):
        a0, a1 = sorted((s * BENCH_X, s * x))
        span(f"dais_riser{s:+d}", a0, a1, yf - 0.02, yf, 0.0, DAIS_Z - 0.012, m["ash"], bevel=0.004)
        span(f"dais_nose{s:+d}", a0, a1, yf - 0.035, yf + 0.03, DAIS_Z - 0.03, DAIS_Z, m["ash_h"], bevel=0.008)
        # two steps up at the outer end
        b0, b1 = sorted((s * 3.5, s * x))
        for k, (z, d) in enumerate(((0.15, 0.6), (0.3, 0.3))):
            span(f"dais_step{s:+d}{k}", b0, b1, yf - d - 0.02, yf - 0.02, 0.0, z - 0.012, m["ash"], bevel=0.004)
            span(f"dais_tread{s:+d}{k}", b0, b1, yf - d - 0.035, yf - 0.02, z - 0.03, z, m["ash_h"], bevel=0.008)


def bench():
    """The judges' bench: wings and a centre section that steps forward, each a boarded pale-ash fascia over a dark
    recessed plinth, with a thick bevelled cap; end returns; the work surface behind the cap, a step lower."""
    m = materials()
    segs = [(-BENCH_X, -CENTRE_X, BENCH_Y), (-CENTRE_X, CENTRE_X, BENCH_Y - CENTRE_OUT), (CENTRE_X, BENCH_X, BENCH_Y)]
    top = CAP_Z - 0.06
    stile = 0.045
    for i, (x0, x1, yf) in enumerate(segs):
        span(f"bench_back{i}", x0, x1, yf + 0.035, yf + 0.06, 0.0, top, m["backing"])
        span(f"bench_plinth{i}", x0, x1, yf + 0.035, yf + 0.08, 0.0, 0.1, m["plinth"])
        # the centre's boards stop at its corner stiles; the wings' first boards butt against the stiles' returns
        b0 = x0 + stile if i == 1 else (x0 if i == 0 else x0 - 0.004)
        b1 = x1 - stile if i == 1 else (x1 + 0.004 if i == 0 else x1)
        boards(f"bench_b{i}_", b0, b1, yf, 0.1, top, m["ash"], width=0.55, thick=0.035, bevel=0.0035)
        ox0 = x0 - 0.025 if i in (0, 1) else x0
        ox1 = x1 + 0.025 if i in (1, 2) else x1
        # the centre cap a hair thicker, so where it runs round the corner over the wing cap their tops do not fight
        span(f"bench_cap{i}", ox0, ox1, yf - 0.025, yf + 0.34, top, CAP_Z + (0.004 if i == 1 else 0.0), m["ash_h"],
             bevel=0.01)
        # a slim bronze shadow line under the cap's nose
        span(f"bench_line{i}", x0, x1, yf - 0.004, yf + 0.01, top - 0.018, top - 0.006, m["bronze"], bevel=0.002)
    # the centre section's corner stiles: their fronts flush with its boards, their sides the returns back to the
    # wings (so the step reads as a lit return, not a gap)
    for s in (-1, 1):
        xa, xb = sorted((s * CENTRE_X, s * (CENTRE_X - stile)))
        span(f"bench_ret{s:+d}", xa, xb, BENCH_Y - CENTRE_OUT, BENCH_Y + 0.03, 0.1, top, m["ash"], bevel=0.006)
        span(f"bench_retplinth{s:+d}", xa + 0.01 * (s < 0), xb - 0.01 * (s > 0), BENCH_Y - CENTRE_OUT + 0.035,
             BENCH_Y + 0.03, 0.0, 0.1, m["plinth"])
        # end returns of the wings
        xa, xb = sorted((s * BENCH_X, s * (BENCH_X - 0.035)))
        span(f"bench_end{s:+d}", xa, xb, BENCH_Y, BENCH_Y + 0.9, 0.1, top, m["ash"], bevel=0.003)
        span(f"bench_endplinth{s:+d}", xa, xb, BENCH_Y + 0.04, BENCH_Y + 0.9, 0.0, 0.1, m["plinth"])
        xa, xb = sorted((s * (BENCH_X + 0.025), s * (BENCH_X - 0.06)))
        span(f"bench_endcap{s:+d}", xa, xb, BENCH_Y + 0.3, BENCH_Y + 0.92, top, CAP_Z, m["ash_y"], bevel=0.01)
    span("bench_desk", -BENCH_X + 0.03, BENCH_X - 0.03, BENCH_Y + 0.3, BENCH_Y + 0.92, DESK_Z - 0.035, DESK_Z,
         m["ash_h"], bevel=0.006)


def chairs_and_mics():
    """Three judges' chairs, empty, a touch apart in angle; a gooseneck microphone in front of each, its head toward
    the chair. The chair prop's back is at -X in its file (it faces +X): turn -90 faces the room."""
    out = []
    chair = props.load("judge-chair", size=1.36, axis="z", loc=(CHAIR_X[0], CHAIR_Y, DAIS_Z), turn_deg=-90 - 3.0,
                       sat=0.5, val=0.85, rough_add=0.08)
    out.append(chair)
    for k, (x, t) in enumerate(((CHAIR_X[1], -90 + 0.5), (CHAIR_X[2], -90 + 4.0))):
        out.append(instance(chair, f"judge_chair{k + 1}", (x, CHAIR_Y + (0.05 if k == 0 else -0.04), DAIS_Z), t))
    out[1].scale = tuple(v * 1.06 for v in out[1].scale)      # the presiding judge's chair a little taller
    mic = props.load("microphone", size=0.45, axis="z", loc=(CHAIR_X[0] + 0.1, BENCH_Y + 0.45, DESK_Z), turn_deg=-8,
                     sat=0.5, rough_add=0.1)
    for k, x in enumerate(CHAIR_X[1:]):
        instance(mic, f"bench_mic{k + 1}", (x + 0.1, BENCH_Y + 0.45, DESK_Z), -8 + 5 * k)
    return chair, mic


def desks(chair_src, mic_src):
    """Counsel desks either side of the well, facing each other: a boarded front to the room over a dark plinth, a
    top with a bevelled nose, empty chairs behind, two microphones each."""
    m = materials()
    z = 0.78
    for s, side in ((-1, "l"), (1, "r")):
        y0, y1 = DESK_Y
        xf = s * DESK_IN
        boards(f"desk_{side}_b", y0, y1, xf, 0.1, z - 0.04, m["ash"], width=0.65, thick=0.03, axis="y", sign=-s)
        xa, xb = sorted((s * (DESK_IN + 0.03), s * (DESK_IN + 0.06)))
        span(f"desk_{side}_back", xa, xb, y0, y1, 0.0, z - 0.04, m["backing"])
        xa, xb = sorted((s * (DESK_IN + 0.03), s * (DESK_IN + 0.07)))
        span(f"desk_{side}_plinth", xa, xb, y0, y1, 0.0, 0.1, m["plinth"])
        xa, xb = sorted((s * (DESK_IN - 0.02), s * DESK_OUT))
        span(f"desk_{side}_top", xa, xb, y0 - 0.02, y1 + 0.02, z - 0.04, z, m["ash_y"], bevel=0.008)
        for e, yy in (("a", y0), ("b", y1)):
            xa, xb = sorted((s * DESK_IN, s * (DESK_OUT - 0.02)))
            span(f"desk_{side}_end{e}", xa, xb, yy - (0.0 if e == "a" else 0.03), yy + (0.03 if e == "a" else 0.0),
                 0.0, z - 0.04, m["ash"], bevel=0.003)
        for k, yy in enumerate((0.95, 2.2)):
            t = 0.0 if s < 0 else 180.0
            instance(chair_src, f"counsel_{side}{k}", (s * 5.08, yy + 0.05 * k, 0.0), t + (4 - 7 * k) * s)
            instance(mic_src, f"counsel_mic_{side}{k}", (s * (DESK_IN + 0.24), yy + 0.12, z), -90 * s)
    # the counsel chairs are a size down from the judges'
    for o in bpy.data.objects:
        if o.name.startswith("counsel_") and o.parent is None and "mic" not in o.name:
            o.scale = tuple(v * 0.9 for v in o.scale)


# ---------------------------------------------------------------- dock and bar
def frame_panel(prefix, a0, a1, fixed, z0, z1, axis, m_panel, m_rail, post=0.07, cap=0.1, cap_t=0.045, cap_off=0.0,
                cap_len=None):
    """A frame-and-panel run along `axis` ("x": from x=a0 to a1 at y=fixed; "y": along Y at x=fixed): a dark kick, a
    bottom rail, a recessed panel, and a bevelled cap rail on top. Posts are built separately."""
    parts = []
    L = a1 - a0
    c = (a0 + a1) / 2
    def bx(n, along, across, zz0, zz1, m, bev, off=0.0):
        if axis == "x":
            return box(n, (along, across, zz1 - zz0), (c, fixed + off, (zz0 + zz1) / 2), m, bevel=bev)
        return box(n, (across, along, zz1 - zz0), (fixed + off, c, (zz0 + zz1) / 2), m, bevel=bev)
    parts.append(bx(f"{prefix}_kick", L, 0.03, z0, z0 + 0.07, materials()["plinth"], 0.003))
    parts.append(bx(f"{prefix}_rail", L, 0.045, z0 + 0.07, z0 + 0.14, m_rail, 0.005))
    parts.append(bx(f"{prefix}_panel", L, 0.025, z0 + 0.14, z1 - cap_t - 0.06, m_panel, 0.004))
    parts.append(bx(f"{prefix}_toprail", L, 0.045, z1 - cap_t - 0.06, z1 - cap_t, m_rail, 0.005))
    parts.append(bx(f"{prefix}_cap", cap_len or L + 0.02, cap, z1 - cap_t, z1, m_rail, 0.013, off=cap_off))
    return parts


def dock():
    """The defendant's dock: a low platform, four corner posts and two gate posts, frame-and-panel sides with cap
    rails, a deep front ledge with a microphone pointed back at whoever stands inside, and a small gate in the back
    (closed) on two bronze hinges with a latch."""
    m = materials()
    cx, cy = DOCK
    hx, hy = DOCK_HX, DOCK_HY
    z0, z1 = DOCK_PLAT, DOCK_TOP
    span("dock_plat", cx - hx - 0.05, cx + hx + 0.05, cy - hy - 0.05, cy + hy + 0.05, 0.0, z0, m["ash_h"], bevel=0.008)
    span("dock_plat_kick", cx - hx - 0.03, cx + hx + 0.03, cy - hy - 0.03, cy + hy + 0.03, -0.01, 0.02, m["plinth"])
    p = 0.07
    posts = [(cx - hx + p / 2, cy - hy + p / 2), (cx + hx - p / 2, cy - hy + p / 2), (cx - hx + p / 2, cy + hy - p / 2),
             (cx + hx - p / 2, cy + hy - p / 2), (cx - 0.36, cy - hy + p / 2), (cx + 0.36, cy - hy + p / 2)]
    for k, (x, y) in enumerate(posts):
        box(f"dock_post{k}", (p, p, z1 - z0 + 0.03), (x, y, (z0 + z1 + 0.03) / 2), m["ash"], bevel=0.007)
        box(f"dock_finial{k}", (p + 0.012, p + 0.012, 0.025), (x, y, z1 + 0.03 + 0.0125), m["ash_h"], bevel=0.008)
    # sides (left, right): along Y between the posts
    for s in (-1, 1):
        frame_panel(f"dock_side{s:+d}", cy - hy + p, cy + hy - p, cx + s * (hx - p / 2), z0, z1, "y", m["ash"], m["ash_y"])
    # front: along X, the cap widened into a ledge that reaches inside
    # (it butts against the side caps rather than overlapping them)
    fy = cy + hy - p / 2
    frame_panel("dock_front", cx - hx + p, cx + hx - p, fy, z0, z1, "x", m["ash"], m["ash_h"], cap=LEDGE[1] - LEDGE[0],
                cap_off=(LEDGE[0] + LEDGE[1]) / 2 - fy, cap_len=2 * (hx - p / 2 - 0.05))
    # back: two short runs either side of the gate
    for s in (-1, 1):
        a0, a1 = sorted((cx + s * (hx - p), cx + s * (0.36 + p / 2)))
        frame_panel(f"dock_back{s:+d}", a0, a1, cy - hy + p / 2, z0, z1, "x", m["ash"], m["ash_h"])
    # the gate: its own frame (stiles, rails, panel), 8 mm clear of the posts, a little below the caps
    g0, g1 = cx - 0.36 + p / 2 + 0.008, cx + 0.36 - p / 2 - 0.008
    gy = cy - hy + p / 2
    gz0, gz1 = z0 + 0.03, z1 - 0.03
    for k, (x0, x1, zz0, zz1) in enumerate(((g0, g0 + 0.06, gz0, gz1), (g1 - 0.06, g1, gz0, gz1),
                                            (g0 + 0.06, g1 - 0.06, gz0, gz0 + 0.1), (g0 + 0.06, g1 - 0.06, gz1 - 0.08, gz1))):
        span(f"dock_gate_frame{k}", x0, x1, gy - 0.022, gy + 0.022, zz0, zz1, m["ash"] if k < 2 else m["ash_h"], bevel=0.005)
    span("dock_gate_panel", g0 + 0.06, g1 - 0.06, gy - 0.012, gy + 0.012, gz0 + 0.1, gz1 - 0.08, m["ash"], bevel=0.003)
    for k, z in enumerate((gz0 + 0.14, gz1 - 0.14)):          # hinges on the left gate post
        sk.cyl(f"dock_hinge{k}", 0.011, 0.09, (g0 - 0.004, gy - 0.026, z), m["bronze"], verts=20)
        box(f"dock_hinge_leaf{k}", (0.05, 0.004, 0.08), (g0 + 0.02, gy - 0.025, z), m["bronze"], bevel=0.001)
    box("dock_latch", (0.07, 0.012, 0.03), (g1 - 0.01, gy - 0.03, gz1 - 0.2), m["bronze"], bevel=0.004)
    box("dock_keep", (0.03, 0.018, 0.05), (g1 + 0.03, gy - 0.032, gz1 - 0.2), m["bronze"], bevel=0.004)


def dock_mic(mic_src, x):
    """The dock's microphone on the front ledge in front of the defendant, its head turned back toward her."""
    h = instance(mic_src, "dock_mic", (x, LEDGE[0] + 0.1, DOCK_TOP), 180.0 + 4.0)   # clear of her, mid-ledge
    h.scale = tuple(v * 0.78 for v in h.scale)    # a short neck: its head at her chest, not beside her face
    return h


def bar():
    """The bar between the well and the public: frame-and-panel runs on posts from wall to aisle, and a pair of low
    gates on the aisle, standing open into the well."""
    m = materials()
    z0, z1 = 0.0, 0.95
    p = 0.08
    for s in (-1, 1):
        a_in, a_out = 0.85, XW
        xs = [a_in + p / 2]
        n = math.ceil((a_out - a_in) / 1.3)
        step = (a_out - p / 2 - xs[0]) / n
        xs += [xs[0] + step * (k + 1) for k in range(n)]
        for k, x in enumerate(xs):
            box(f"bar_post{s:+d}{k}", (p, p, z1 + 0.03), (s * x, BAR_Y, (z1 + 0.03) / 2), m["ash"], bevel=0.007)
            box(f"bar_finial{s:+d}{k}", (p + 0.014, p + 0.014, 0.025), (s * x, BAR_Y, z1 + 0.0425), m["ash_h"], bevel=0.008)
        for k, (xa, xb) in enumerate(zip(xs, xs[1:])):
            a0, a1 = sorted((s * (xa + p / 2), s * (xb - p / 2)))
            frame_panel(f"bar_run{s:+d}{k}", a0, a1, BAR_Y, z0, z1, "x", m["ash"], m["ash_h"])
        # the gate leaf on this side of the aisle, built closed and then swung open into the well on its hinges
        # (the open aisle leads the eye from the gallery to the dock)
        g0, g1 = sorted((s * 0.012, s * (0.85 - 0.008)))
        leaf = []
        for k, (x0, x1, zz0, zz1) in enumerate(((g0, g0 + 0.06, 0.05, z1 - 0.06), (g1 - 0.06, g1, 0.05, z1 - 0.06),
                                                (g0 + 0.06, g1 - 0.06, 0.05, 0.15), (g0 + 0.06, g1 - 0.06, z1 - 0.14, z1 - 0.06))):
            leaf.append(span(f"bar_gate{s:+d}_frame{k}", x0, x1, BAR_Y - 0.022, BAR_Y + 0.022, zz0, zz1, m["ash"], bevel=0.005))
        leaf.append(span(f"bar_gate{s:+d}_panel", g0 + 0.06, g1 - 0.06, BAR_Y - 0.012, BAR_Y + 0.012, 0.15, z1 - 0.14, m["ash"],
                         bevel=0.003))
        hx = s * (0.85 - 0.012)
        pivot = bpy.data.objects.new(f"bar_gate{s:+d}_hinge", None)
        bpy.context.scene.collection.objects.link(pivot)
        pivot.location = (hx, BAR_Y, 0.0)
        bpy.context.view_layer.update()
        for o in leaf:
            o.parent = pivot
            o.matrix_parent_inverse = pivot.matrix_world.inverted()
        pivot.rotation_euler.z = math.radians(-s * (78.0 if s > 0 else 84.0))
        for k, z in enumerate((0.25, z1 - 0.2)):
            sk.cyl(f"bar_hinge{s:+d}{k}", 0.011, 0.09, (hx, BAR_Y - 0.026, z), m["bronze"], verts=20)


def gallery():
    """The public benches: two blocks of two either side of the centre aisle, four rows deep, empty."""
    src = props.load("gallery-bench", size=2.0, axis="long", loc=(PEW_X[0], ROWS[0], 0.0), turn_deg=0.0,
                     sat=0.55, val=0.85, rough_add=0.1)
    k = 0
    for r, y in enumerate(ROWS):
        for c, x in enumerate(PEW_X):
            if r == 0 and c == 0:
                continue
            jitter = ((r * 7 + c * 3) % 5 - 2) * 0.6           # a degree or so out of true, as benches are
            instance(src, f"pew{k}", (x + ((r + c) % 3 - 1) * 0.012, y + ((r * 3 + c) % 4 - 1.5) * 0.01, 0.0), jitter)
            k += 1
    return src


# ---------------------------------------------------------------- dressing
def cctv(name, xyz):
    m = materials()
    x, y, z = xyz
    b = sk.cyl(name + "_base", 0.075, 0.022, (x, y, z - 0.011), m["white"], verts=40)
    sk.sphere(name + "_dome", 0.058, (x, y, z - 0.022), m["dome"], segs=40)
    sk.sphere(name + "_eye", 0.03, (x, y, z - 0.04), m["bezel"], segs=24)
    return b


CLERK = (1.25, 3.1)         # the clerk's desk at the foot of the bench (right of centre), facing the room
CLERK_Z = 0.76


def dressing(chair_src=None, mic_src=None):
    m = materials()
    door_leaf("side_door", XW - 0.005, SIDE_DOOR_Y, 1.0, 2.3, "-x", m["ash"], m["ash"])
    cctv("cctv_l", (-XW + BULK_W - 0.3, Y1 - BULK_W + 0.3, BULK))
    cctv("cctv_r", (XW - BULK_W + 0.3, Y1 - BULK_W + 0.3, BULK))
    cctv("cctv_g", (XW - BULK_W + 0.3, Y0 + BULK_W - 0.3, BULK))
    walls_dressing()
    span("aisle_runner", -0.3, 0.3, Y0 + 0.45, BAR_Y - 0.15, 0.0, 0.008, m["runner"], bevel=0.003)
    folder = props.load("file-folders", size=0.34, axis="long", loc=(-4.5, 0.72, 0.78), turn_deg=88.0, sat=0.5,
                        val=0.75, rough_add=0.12)
    clerk_desk(chair_src, folder)
    # counsel desks: closed folders before the chairs (clear of the microphones) and a glass of water at each; the
    # bench: one closed folder before the presiding chair
    for k, (x, y, z, t) in enumerate(((-4.48, 1.92, 0.78, 95.0), (4.5, 0.78, 0.78, -86.0),
                                      (-0.32, BENCH_Y + 0.62, DESK_Z, 2.0))):
        instance(folder, f"folder{k + 1}", (x, y, z), t)
    for k, (x, y) in enumerate(((-4.14, 1.48), (4.15, 1.98))):
        tumbler(f"tumbler{k}", (x, y, 0.78))


def tumbler(name, loc):
    """A plain glass tumbler, a third full of water."""
    m = materials()
    x, y, z = loc
    sk.cyl(f"{name}_glass", 0.034, 0.105, (x, y, z + 0.0525), m["tumbler"], verts=40)
    sk.cyl(f"{name}_water", 0.0315, 0.04, (x, y, z + 0.024), m["tumbler"], verts=40)


def clerk_desk(chair_src, folder):
    """The clerk's desk on the floor at the foot of the bench, facing the room: a boarded ash front over a dark plinth,
    ends, a bevelled top; a closed laptop, a blank monitor turned toward the clerk's empty chair (its face a faint
    cool glow, a darker bezel, a weak light in front of it that spills on the chair and the bench fascia), a folder."""
    m = materials()
    cx, cy = CLERK
    w, d, z = 1.6, 0.7, CLERK_Z
    y0, y1 = cy - d / 2, cy + d / 2
    boards("clerk_b", cx - w / 2 + 0.03, cx + w / 2 - 0.03, y0 + 0.02, 0.1, z - 0.035, m["ash"], width=0.55, thick=0.03)
    span("clerk_back", cx - w / 2 + 0.03, cx + w / 2 - 0.03, y0 + 0.05, y0 + 0.07, 0.0, z - 0.035, m["backing"])
    span("clerk_plinth", cx - w / 2 + 0.03, cx + w / 2 - 0.03, y0 + 0.05, y0 + 0.09, 0.0, 0.1, m["plinth"])
    for s in (-1, 1):
        xa, xb = sorted((cx + s * w / 2, cx + s * (w / 2 - 0.03)))
        span(f"clerk_end{s:+d}", xa, xb, y0 + 0.02, y1 - 0.02, 0.0, z - 0.035, m["ash"], bevel=0.004)
    span("clerk_top", cx - w / 2 - 0.01, cx + w / 2 + 0.01, y0, y1, z - 0.035, z, m["ash_h"], bevel=0.008)
    # the closed laptop
    lx, ly = cx - 0.4, cy + 0.05
    box("laptop_base", (0.33, 0.23, 0.011), (lx, ly, z + 0.0055), m["laptop"], bevel=0.004, rot=(0, 0, math.radians(-6)))
    box("laptop_lid", (0.328, 0.226, 0.006), (lx, ly, z + 0.0145), m["laptop"], bevel=0.0025,
        rot=(0, 0, math.radians(-6)))
    # the monitor, turned toward the clerk (+Y), a little angled
    mx, my, t = cx + 0.25, cy + 0.1, math.radians(180 + 20)
    sw, sh, neck = 0.48, 0.29, 0.09     # a low stand: its top stays under the bench cap from every camera
    root = bpy.data.objects.new("monitor", None)
    bpy.context.scene.collection.objects.link(root)
    parts = [box("monitor_base", (0.22, 0.17, 0.012), (0, 0, 0.006), m["bezel"], bevel=0.004),
             box("monitor_neck", (0.05, 0.025, neck + 0.02), (0, 0.03, (neck + 0.02) / 2), m["bezel"], bevel=0.006),
             box("monitor_shell", (sw + 0.024, 0.035, sh + 0.024), (0, 0.0, neck + sh / 2), m["speaker"], bevel=0.006),
             box("monitor_face", (sw, 0.004, sh), (0, -0.018, neck + sh / 2), mt.glow("monitor glow", COOL, 0.4))]
    for o in parts:
        o.parent = root
    root.location, root.rotation_euler = (mx, my, z), (0, 0, t)
    bpy.context.view_layer.update()
    face = bpy.data.objects["monitor_face"].matrix_world
    nrm = (face.to_3x3() @ Vector((0, -1, 0))).normalized()
    c = face.translation + nrm * 0.03
    area("monitor_light", tuple(c), (sw, sh), 5.0, COOL, spread=140, rot=aim_rot(c, c + nrm))
    instance(folder, "folder_clerk", (cx + 0.02, cy + 0.02, z), -4.0)
    if chair_src is not None:
        ch = instance(chair_src, "clerk_chair", (cx - 0.1, cy + 0.72, 0.0), -90 - 6.0)
        ch.scale = tuple(v * 0.88 for v in ch.scale)


def walls_dressing():
    """The upper side walls: fabric-wrapped acoustic panels with shadow reveals between the wainscot and the windows,
    a slim ash cornice under the bulkhead; a wall vent grille high on the left; two small speaker boxes high on the
    bench wall."""
    m = materials()
    z0, z1 = 1.32, 2.78
    for s, side in ((-1, "l"), (1, "r")):
        runs = [(Y0 + 0.35, SIDE_DOOR_Y - 0.75), (SIDE_DOOR_Y + 0.75, Y1 - 0.35)] if s > 0 else [(Y0 + 0.35, Y1 - 0.35)]
        k = 0
        for a0, a1 in runs:
            n = max(1, round((a1 - a0) / 1.25))
            pw = (a1 - a0) / n
            for i in range(n):
                ya = a0 + pw * i + 0.009
                yb = a0 + pw * (i + 1) - 0.009
                xa, xb = sorted((s * XW, s * (XW - 0.045)))
                span(f"acoustic_{side}{k}", xa, xb, ya, yb, z0, z1, m["felt"], bevel=0.012, segs=3)
                k += 1
        # the cornice under the bulkhead
        xa, xb = sorted((s * XW, s * (XW - 0.05)))
        span(f"cornice_{side}", xa, xb, Y0, Y1, BULK - 0.12, BULK, m["ash_y"], bevel=0.008)
        xa, xb = sorted((s * XW, s * (XW - 0.02)))
        span(f"cornice_{side}_bead", xa, xb, Y0, Y1, BULK - 0.15, BULK - 0.12, m["backing"])
    # the vent grille: a frame and louvres
    gx, gy, gz, gw, gh = -XW + 0.012, 4.0, 4.35, 0.7, 0.32
    for k, (y0, y1, z0_, z1_) in enumerate(((gy - gw / 2, gy + gw / 2, gz + gh / 2 - 0.03, gz + gh / 2),
                                           (gy - gw / 2, gy + gw / 2, gz - gh / 2, gz - gh / 2 + 0.03),
                                           (gy - gw / 2, gy - gw / 2 + 0.03, gz - gh / 2, gz + gh / 2),
                                           (gy + gw / 2 - 0.03, gy + gw / 2, gz - gh / 2, gz + gh / 2))):
        span(f"vent_frame{k}", gx - 0.012, gx + 0.012, y0, y1, z0_, z1_, m["grille"], bevel=0.004)
    span("vent_back", gx - 0.012, gx - 0.006, gy - gw / 2, gy + gw / 2, gz - gh / 2, gz + gh / 2, m["backing"])
    for i in range(7):
        z = gz - gh / 2 + 0.05 + i * (gh - 0.1) / 6
        box(f"vent_louvre{i}", (0.004, gw - 0.06, 0.03), (gx, gy, z), m["grille"], rot=(math.radians(-35), 0, 0))
    # speakers high on the bench wall, tipped down toward the well
    for s in (-1, 1):
        box(f"speaker{s:+d}", (0.24, 0.17, 0.36), (s * 3.9, Y1 - 0.12, 4.45), m["speaker"], bevel=0.012,
            rot=(math.radians(14), 0, math.radians(-s * 12)))
        box(f"speaker{s:+d}_bracket", (0.04, 0.06, 0.04), (s * 3.9, Y1 - 0.02, 4.45), m["bronze"], bevel=0.004)
