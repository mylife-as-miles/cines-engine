"""The hearing room set (Ch 09 'A family makes its case in public'): a congressional-style hearing room reconstructed
with restraint. No flags, no seals, no emblems, no text: nameplates are blank, the clock has ticks only.

World layout (metres, Z up, floor z = 0). The room runs along Y: the curved two-tier dais across the far end (+Y),
concave toward the witness table in the middle of the well; the public seats in rows behind the witness (-Y), where
the wide camera stands. Built in Python but for the judge chairs and microphones (generated props, instanced).

    shell()        carpeted floor, plaster walls over a walnut wainscot with pilasters, a coffered ceiling with
                   recessed downlights (only those over the witness table and the dais burn: the lit island)
    drape()        the pleated velour drape behind the dais where flags and a seal would hang (nothing on it), under a
                   walnut pelmet, grazed by a wall-washer
    dais()         the dais: two concentric tiers of faceted frame-and-panel walnut fascia with bevelled caps, privacy
                   shelves, desks, carpeted platforms and end returns; empty high-backed chairs and gooseneck
                   microphones (props) along both tiers
    witness_table() a long table under a plain dark blue felt cloth that skirts to the floor on three sides, a blank
                   nameplate holder, two water glasses, the timer box, two microphones, a few blank papers, a folder
    chairs         the witness chair (leather, built), the public chairs (woven fabric on black tube frames, built
                   once and instanced in rows either side of a centre aisle)
    dressing()     the back wall's double doors (light through their frosted vision panels and under them), the
                   wall sconces, the clock (ticks only), the broadcast lights on their ceiling bars
"""
import math

import bpy
import bmesh
from mathutils import Matrix, Vector

import props
import setkit as sk
import hearing_room_mats as mt

XW = 7.0                 # half width (side walls' room faces at x = +-XW)
Y0, Y1 = -9.4, 8.3       # back wall (behind the public), dais wall
H = 5.4                  # ceiling slab underside
T = 0.3                  # wall thickness

# the dais: two tiers on concentric arcs about C = (0, DC), angles measured from +Y toward +X
DC = -1.2
SPAN = math.radians(38.0)
TIERS = (   # fascia face radius, platform z, desk z, cap z, facets
    dict(R=5.2, zp=0.30, zd=1.04, zc=1.25, n=8),
    dict(R=6.95, zp=0.80, zd=1.54, zc=1.76, n=10),
)
BACK_R = 6.95 + 1.85     # back edge of the upper platform
DESK_D = 0.8             # desk back edge, behind the fascia face
CHAIR_D = 1.16           # chair centre behind the fascia face (its front clear of the desk: the arms would cut it)

# the witness table (centre, size) and Tim's place
TABLE = (0.0, 0.0)
TW, TD = 2.4, 0.76
TOP = 0.762              # the cloth's top surface
TIM_X = -0.3
EMPTY_X = 0.72           # the second place at the table, its chair pushed in, empty
SEAT_Z = 0.47            # witness chair cushion top

# public seats: rows (y) and seat centres (|x|) either side of the centre aisle
ROWS = (-2.55, -3.5, -4.45, -5.4, -6.35, -7.3, -8.25)
SEATS_X = tuple(1.0 + 0.58 * k for k in range(9))
PUB_SEAT_Z = 0.455
PUB_BACK_Y = -0.23       # the public chair's backrest front face (local y; the chair faces +Y, its back at -Y)

COOL = (0.82, 0.9, 1.0)          # broadcast / institutional white, cool
WARMISH = (0.95, 0.93, 0.88)     # the sconces, a hair warmer (the grade cools everything)

M = {}
LIGHTS = {}


# ---------------------------------------------------------------- helpers
def materials():
    if M:
        return M
    walnut = (0.075, 0.05, 0.034)
    M.update(
        walnut=mt.veneer("walnut", walnut, "Z", contrast=0.3, rough=(0.3, 0.44), coat=0.3),
        walnut_h=mt.veneer("walnut along", walnut, "X", contrast=0.3, rough=(0.3, 0.44), coat=0.3),
        walnut_y=mt.veneer("walnut across", walnut, "Y", contrast=0.3, rough=(0.3, 0.44), coat=0.3),
        backing=mt.satin("reveal black", (0.012, 0.011, 0.01), rough=(0.6, 0.75)),
        plinth=mt.satin("plinth", (0.016, 0.015, 0.015), rough=(0.45, 0.6), grime=0.3),
        wall=mt.plaster("wall plaster", (0.15, 0.158, 0.17)),
        ceil=mt.plaster("ceiling plaster", (0.26, 0.265, 0.27), grime=0.2, bump=0.03),
        carpet=mt.carpet("room carpet", (0.026, 0.03, 0.044),
                         walk=((-0.7, 0.7, Y0, -1.6), (-2.2, 2.2, -1.6, 2.6))),
        dais_carpet=mt.carpet("dais carpet", (0.022, 0.024, 0.032), lattice=0.12),
        velour=mt.velour("drape velour", (0.028, 0.036, 0.068)),
        felt=mt.felt("table felt", (0.016, 0.026, 0.068)),
        leather=mt.leather("chair leather", (0.028, 0.026, 0.026)),
        fabric=mt.upholstery("public fabric", (0.048, 0.054, 0.072)),
        tube=mt.satin("black tube", (0.02, 0.02, 0.022), rough=(0.3, 0.42), metal=0.85),
        bronze=mt.dark_metal("bronze"),
        brushed=mt.satin("brushed steel", (0.42, 0.43, 0.44), rough=(0.28, 0.4), metal=1.0),
        black_plastic=mt.satin("black plastic", (0.018, 0.018, 0.019), rough=(0.35, 0.5)),
        white=mt.satin("white plastic", (0.42, 0.42, 0.41), rough=(0.4, 0.5)),
        card=mt.blank_panel("blank card", (0.34, 0.33, 0.31)),
        paper=mt.paper("paper", (0.56, 0.55, 0.51)),
        folder=mt.satin("folder board", (0.035, 0.04, 0.05), rough=(0.6, 0.75)),
        glass=mt.glass("tumbler glass"),
        water=mt.water("water"),
        clock_face=mt.blank_panel("clock face", (0.36, 0.36, 0.35)),
        housing=mt.satin("fixture housing", (0.02, 0.021, 0.023), rough=(0.35, 0.5), metal=0.4),
        trim=mt.satin("downlight trim", (0.32, 0.325, 0.33), rough=(0.3, 0.4), metal=0.5),
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


def mesh_obj(name, bm, m, smooth=False, bevel=0.0, segs=3, angle=30):
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
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments, bv.limit_method = bevel, segs, "ANGLE"
        bv.angle_limit = math.radians(angle)
        bv.harden_normals = True
        ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
        for p in me.polygons:
            p.use_smooth = True
    return ob


def area(name, loc, size, energy, colour=COOL, spread=180, rot=(0, 0, 0)):
    li = sk.area_light(name, loc, size, energy, colour, spread_deg=spread, rot=rot)
    li.visible_camera = False
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


def point(name, loc, energy, colour, radius=0.05):
    li = bpy.data.lights.new(name, "POINT")
    li.energy, li.color, li.shadow_soft_size = energy, colour, radius
    ob = bpy.data.objects.new(name, li)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.visible_camera = False
    LIGHTS[name] = ob
    return ob


def instance(src, name, loc, turn_deg, scale=None):
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
    if scale:
        h.scale = tuple(v * scale for v in h.scale)
    return h


def collection_instance(coll, name, loc, turn_deg):
    e = bpy.data.objects.new(name, None)
    e.instance_type = "COLLECTION"
    e.instance_collection = coll
    bpy.context.scene.collection.objects.link(e)
    e.location = loc
    e.rotation_euler = (0, 0, math.radians(turn_deg))
    return e


# ---------------------------------------------------------------- arcs
def P(r, a):
    """A point on the dais arcs: radius r about C, angle a (radians) from +Y toward +X."""
    return Vector((math.sin(a) * r, DC + math.cos(a) * r, 0.0))


def angles(n, a0=-SPAN, a1=SPAN):
    return [a0 + (a1 - a0) * i / n for i in range(n + 1)]


def ring(name, r0, r1, z0, z1, m, n, a0=-SPAN, a1=SPAN, bevel=0.0, segs=3):
    """A faceted annular sector: n flat facets between angles a0..a1, from radius r0 (the front, toward C) to r1,
    z0..z1. Facet joints are 9-10 degrees: the bevel's angle limit leaves them sharp and rounds the real edges."""
    bm = bmesh.new()
    vs = {}
    for i, a in enumerate(angles(n, a0, a1)):
        for ri, r in enumerate((r0, r1)):
            p = P(r, a)
            for zi, z in enumerate((z0, z1)):
                vs[i, ri, zi] = bm.verts.new((p.x, p.y, z))
    for i in range(n):
        bm.faces.new((vs[i, 0, 1], vs[i, 1, 1], vs[i + 1, 1, 1], vs[i + 1, 0, 1]))
        bm.faces.new((vs[i, 0, 0], vs[i + 1, 0, 0], vs[i + 1, 1, 0], vs[i, 1, 0]))
        bm.faces.new((vs[i, 0, 0], vs[i, 0, 1], vs[i + 1, 0, 1], vs[i + 1, 0, 0]))
        bm.faces.new((vs[i, 1, 0], vs[i + 1, 1, 0], vs[i + 1, 1, 1], vs[i, 1, 1]))
    bm.faces.new((vs[0, 0, 0], vs[0, 1, 0], vs[0, 1, 1], vs[0, 0, 1]))
    bm.faces.new((vs[n, 0, 0], vs[n, 0, 1], vs[n, 1, 1], vs[n, 1, 0]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm, m, bevel=bevel, segs=segs, angle=25)


def facet(R, a0, a1):
    """The facet's chord midpoint, unit tangent, unit normal toward C, and chord length."""
    p0, p1 = P(R, a0), P(R, a1)
    mid = (p0 + p1) / 2
    u = (p1 - p0).normalized()
    nrm = Vector((0.0, DC, 0.0)) - mid
    nrm.z = 0.0
    nrm.normalize()
    return mid, u, nrm, (p1 - p0).length


def facet_box(name, R, a0, a1, off, depth, z0, z1, m, inset=0.0, bevel=0.0, segs=3):
    """A box standing on the facet's chord plane, `off` in front of it (toward C), `depth` deep, inset from its ends."""
    mid, u, nrm, L = facet(R, a0, a1)
    c = mid + nrm * (off + depth / 2)
    return box(name, (L - 2 * inset, depth, z1 - z0), (c.x, c.y, (z0 + z1) / 2), m, bevel=bevel, segs=segs,
               rot=(0, 0, math.atan2(u.y, u.x)))


def facing_deg(x, y, tx, ty):
    """The turn (degrees about Z) that points local +X from (x, y) toward (tx, ty)."""
    return math.degrees(math.atan2(ty - y, tx - x))


# ---------------------------------------------------------------- shell
def shell():
    m = materials()
    span("floor", -XW - T, XW + T, Y0 - T, Y1 + T, -0.1, 0.0, m["carpet"])
    span("wall_back", -XW - T, XW + T, Y1, Y1 + T, 0, H + 0.1, m["wall"])
    span("wall_front", -XW - T, XW + T, Y0 - T, Y0, 0, H + 0.1, m["wall"])
    for s, side in ((-1, "l"), (1, "r")):
        xa, xb = sorted((s * XW, s * (XW + T)))
        span(f"wall_{side}", xa, xb, Y0, Y1, 0, H + 0.1, m["wall"])
    ceiling()
    wainscot()


COFFER_X = (-6.0, -3.6, -1.2, 1.2, 3.6, 6.0)          # beam lines
COFFER_Y = (-9.4, -8.4, -6.0, -3.6, -1.2, 1.2, 3.6, 6.0, 8.3)


def ceiling():
    """A coffered ceiling: a slab, a grid of deep beams with a bevelled soffit, a cornice round the walls; recessed
    downlight cans in the coffers (lit or dark)."""
    m = materials()
    span("ceiling", -XW, XW, Y0, Y1, H, H + 0.1, m["ceil"])
    d, w = 0.32, 0.26
    for i, x in enumerate(COFFER_X):
        span(f"beam_x{i}", x - w / 2, x + w / 2, Y0, Y1, H - d, H, m["ceil"], bevel=0.01)
    for j, y in enumerate(COFFER_Y[1:-1]):
        span(f"beam_y{j}", -XW, XW, y - w / 2, y + w / 2, H - d, H, m["ceil"], bevel=0.01)
    # cornice: a stepped moulding where the wall meets the ceiling
    for k, (dd, hh) in enumerate(((0.16, 0.12), (0.09, 0.26))):
        span(f"cornice_l{k}", -XW, -XW + dd, Y0, Y1, H - hh, H, m["ceil"], bevel=0.008)
        span(f"cornice_r{k}", XW - dd, XW, Y0, Y1, H - hh, H, m["ceil"], bevel=0.008)
        span(f"cornice_b{k}", -XW, XW, Y0, Y0 + dd, H - hh, H, m["ceil"], bevel=0.008)
        span(f"cornice_f{k}", -XW, XW, Y1 - dd, Y1, H - hh, H, m["ceil"], bevel=0.008)


def downlight(name, x, y, energy, target=None, size_deg=60, blend=0.7, colour=COOL, radius=0.08):
    """A recessed can: a satin trim ring, a dark baffle and, when lit, a glowing lens and its spot."""
    m = materials()
    sk.cyl(f"{name}_trim", 0.11, 0.012, (x, y, H - 0.006), m["trim"], verts=40)
    if energy > 0:
        lensm = M.setdefault(f"dl_lens_{int(energy)}", mt.glow(f"downlight lens {energy:.0f}", colour, 30.0, falloff=0.4,
                                                               axes=("X", "Y")))
        sk.cyl(f"{name}_lens", 0.075, 0.004, (x, y, H - 0.014), lensm, verts=40)
        tgt = target if target is not None else (x, y, 0.0)
        spot(f"{name}_spot", (x, y, H - 0.05), tgt, energy, colour, size_deg, blend, radius=radius)
    else:
        sk.cyl(f"{name}_lens", 0.075, 0.004, (x, y, H - 0.014), m["housing"], verts=40)


def coffer_centres():
    xs = [(a + b) / 2 for a, b in zip(COFFER_X, COFFER_X[1:])]
    ys = [(a + b) / 2 for a, b in zip(COFFER_Y, COFFER_Y[1:])]
    return xs, ys


def wainscot():
    """Walnut wainscot to 2.6 m on the side and back walls: raised panels between pilasters, a cap moulding, a dark
    skirting; plaster above."""
    m = materials()
    top = 2.6
    pil = 2.4
    # side walls
    for s, side in ((-1, "l"), (1, "r")):
        xf = s * XW
        xa, xb = sorted((xf, xf - s * 0.012))
        span(f"wain_{side}_back", xa, xb, Y0, Y1, 0.0, top, m["backing"])
        ys = [Y0 + 0.3 + pil * k for k in range(8) if Y0 + 0.3 + pil * k < Y1 - 0.2]
        for k, y in enumerate(ys):
            xa, xb = sorted((xf, xf - s * 0.07))
            span(f"wain_{side}_pil{k}", xa, xb, y - 0.14, y + 0.14, 0.0, top + 0.06, m["walnut"], bevel=0.006)
        edges = ys + [Y1 - 0.02]
        for k, (a0, a1) in enumerate(zip([Y0 + 0.02] + [y + 0.14 for y in ys], [y - 0.14 for y in ys] + [Y1 - 0.02])):
            if a1 - a0 < 0.3:
                continue
            xa, xb = sorted((xf, xf - s * 0.03))
            span(f"wain_{side}_field{k}", xa, xb, a0, a1, 0.12, top, m["walnut"], bevel=0.003)
            for j, (z0, z1) in enumerate(((0.3, 1.0), (1.18, top - 0.18))):
                xa, xb = sorted((xf - s * 0.03, xf - s * 0.052))
                span(f"wain_{side}_panel{k}_{j}", xa, xb, a0 + 0.12, a1 - 0.12, z0, z1, m["walnut"], bevel=0.014)
        xa, xb = sorted((xf, xf - s * 0.1))
        span(f"wain_{side}_cap", xa, xb, Y0, Y1, top, top + 0.06, m["walnut_y"], bevel=0.01)
        xa, xb = sorted((xf, xf - s * 0.045))
        span(f"wain_{side}_skirt", xa, xb, Y0, Y1, 0.0, 0.12, m["plinth"], bevel=0.003)
    # back wall (behind the public): doors in the middle
    yf = Y0
    span("wain_b_back", -XW, XW, yf, yf + 0.012, 0.0, top, m["backing"])
    for s in (-1, 1):
        a0, a1 = sorted((s * 1.15, s * (XW - 0.02)))
        n = 4
        w = (a1 - a0) / n
        for k in range(n):
            x0, x1 = a0 + w * k, a0 + w * (k + 1)
            span(f"wain_b{s:+d}_field{k}", x0 + 0.01, x1 - 0.01, yf, yf + 0.03, 0.12, top, m["walnut_h"], bevel=0.003)
            for j, (z0, z1) in enumerate(((0.3, 1.0), (1.18, top - 0.18))):
                span(f"wain_b{s:+d}_panel{k}_{j}", x0 + 0.13, x1 - 0.13, yf + 0.03, yf + 0.052, z0, z1, m["walnut_h"],
                     bevel=0.014)
            span(f"wain_b{s:+d}_pil{k}", x1 - 0.12, x1 + 0.12, yf, yf + 0.07, 0.0, top + 0.06, m["walnut"], bevel=0.006)
        span(f"wain_b{s:+d}_cap", a0, a1, yf, yf + 0.1, top, top + 0.06, m["walnut_h"], bevel=0.01)
        span(f"wain_b{s:+d}_skirt", a0, a1, yf, yf + 0.045, 0.0, 0.12, m["plinth"], bevel=0.003)


# ---------------------------------------------------------------- the dais end
def drape():
    """Pleated velour behind the dais (where flags and a seal would hang: nothing), from a walnut pelmet to the
    floor; the folds deepen and loosen toward the hem. A slot washer in the ceiling grazes it."""
    m = materials()
    x0, x1 = -5.0, 5.0
    z0, z1 = 0.02, H - 0.62
    yb = Y1 - 0.16
    nx, nz = 420, 36
    lam = 0.21
    bm = bmesh.new()
    rows = []
    for j in range(nz + 1):
        z = z0 + (z1 - z0) * j / nz
        t = 1.0 - j / nz          # 0 at the top, 1 at the hem
        amp = 0.045 + 0.02 * t
        row = []
        for i in range(nx + 1):
            x = x0 + (x1 - x0) * i / nx
            ph = 2 * math.pi * x / lam
            wob = 0.35 * math.sin(x * 1.7 + 0.6) * t       # pleats wander a little toward the hem
            y = yb - amp * (math.sin(ph + wob) * 0.85 + 0.15 * math.sin(2 * ph + 1.3))
            row.append(bm.verts.new((x, y, z)))
        rows.append(row)
    for j in range(nz):
        for i in range(nx):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    ob = mesh_obj("drape", bm, m["velour"], smooth=True)
    sol = ob.modifiers.new("thick", "SOLIDIFY")
    sol.thickness, sol.offset = 0.006, 1.0
    # the pelmet, and a dark recess above it
    span("pelmet", x0 - 0.15, x1 + 0.15, yb - 0.24, Y1, z1 - 0.02, z1 + 0.34, m["walnut_h"], bevel=0.012)
    span("pelmet_lip", x0 - 0.17, x1 + 0.17, yb - 0.26, yb - 0.2, z1 + 0.26, z1 + 0.36, m["walnut_h"], bevel=0.01)
    # the washer: a slot in the ceiling in front of the pelmet, its light grazing down the folds
    slot = box("washer_slot", (9.6, 0.05, 0.012), (0, yb - 0.55, H - 0.004), mt.glow("washer lens", COOL, 3.0))
    src = (0.0, yb - 0.55, H - 0.03)
    area("washer", src, (9.4, 0.05), 900.0, COOL, spread=60, rot=aim_rot(src, (0.0, yb + 0.25, 1.2)))
    return ob


def dais():
    """Both tiers: platform (carpeted), fascia (frame and panel on a dark backing over a recessed plinth), cap,
    privacy shelf riser, desk; end returns. Returns per-tier chair and microphone positions."""
    m = materials()
    places = []
    for k, t in enumerate(TIERS):
        R, zp, zd, zc, n = t["R"], t["zp"], t["zd"], t["zc"], t["n"]
        floor_z = 0.0 if k == 0 else TIERS[0]["zp"]
        back = TIERS[1]["R"] if k == 0 else BACK_R
        # platform
        ring(f"dais{k}_platform", R + 0.06, back, 0.0, zp - 0.012, m["plinth"], n)
        ring(f"dais{k}_carpet", R + 0.06, back - 0.002, zp - 0.012, zp, m["dais_carpet"], n, bevel=0.004)
        # fascia: recessed plinth, dark backing, posts at the joints, a raised panel in each facet
        ring(f"dais{k}_kick", R + 0.05, R + 0.09, floor_z, floor_z + 0.1, m["plinth"], n)
        ring(f"dais{k}_backing", R, R + 0.06, floor_z + 0.1, zc - 0.06, m["backing"], n)
        angs = angles(n)
        for i, a in enumerate(angs):
            p = P(R - 0.03, a)
            box(f"dais{k}_post{i}", (0.1, 0.06, zc - 0.06 - floor_z - 0.1), (p.x, p.y, (floor_z + 0.1 + zc - 0.06) / 2),
                m["walnut"], bevel=0.006, rot=(0, 0, -a))
        for i, (a0, a1) in enumerate(zip(angs, angs[1:])):
            # rails above and below the panel, then the raised panel with a broad bevelled field
            facet_box(f"dais{k}_rail_lo{i}", R, a0, a1, 0.0, 0.04, floor_z + 0.1, floor_z + 0.24, m["walnut_h"],
                      inset=0.05, bevel=0.004)
            facet_box(f"dais{k}_rail_hi{i}", R, a0, a1, 0.0, 0.04, zc - 0.2, zc - 0.06, m["walnut_h"], inset=0.05,
                      bevel=0.004)
            facet_box(f"dais{k}_field{i}", R, a0, a1, 0.0, 0.02, floor_z + 0.24, zc - 0.2, m["walnut"], inset=0.05,
                      bevel=0.003)
            facet_box(f"dais{k}_panel{i}", R, a0, a1, 0.02, 0.022, floor_z + 0.31, zc - 0.27, m["walnut"], inset=0.12,
                      bevel=0.016, segs=2)
        # the cap (a thick bevelled shelf with a nose), its slim bronze shadow line, the riser behind, the desk
        ring(f"dais{k}_cap", R - 0.045, R + 0.33, zc - 0.06, zc, m["walnut_h"], n, bevel=0.012)
        ring(f"dais{k}_riser", R + 0.29, R + 0.33, zd, zc - 0.06, m["walnut"], n)
        ring(f"dais{k}_desk", R + 0.33, R + DESK_D, zd - 0.035, zd, m["walnut_h"], n, bevel=0.006)
        ring(f"dais{k}_modesty", R + 0.33, R + 0.36, zp, zd - 0.035, m["backing"], n)
        # end returns: radial panels closing the tier at both ends, as high as the cap
        for s in (-1, 1):
            a = s * SPAN
            r0, r1 = R - 0.045, (TIERS[1]["R"] if k == 0 else BACK_R)
            mid = (P(r0, a) + P(r1, a)) / 2
            rot = (0, 0, math.atan2(math.cos(a), math.sin(a)))
            off = Vector((math.cos(a), -math.sin(a), 0)) * (s * 0.035)       # outward, off the tier's end
            c = mid + off
            box(f"dais{k}_end{s:+d}", (r1 - r0, 0.07, zc), (c.x, c.y, zc / 2), m["walnut"],
                bevel=0.008, rot=rot)
            c2 = mid + off * 1.0
            box(f"dais{k}_endcap{s:+d}", (r1 - r0 + 0.02, 0.1, 0.06), (c2.x, c2.y, zc - 0.03 + 0.001), m["walnut_h"],
                bevel=0.012, rot=rot)
        # places: chairs at the facet centres, microphones on the desk in front of each
        for i, (a0, a1) in enumerate(zip(angs, angs[1:])):
            a = (a0 + a1) / 2
            places.append(dict(tier=k, a=a, chair=P(R + CHAIR_D, a), mic=P(R + 0.5, a + 0.035), zp=zp, zd=zd))
    # the back of the upper platform (seen by no camera but closed)
    return places


def dais_props(places):
    """The empty high-backed chairs (the judge-chair prop, back at -X in its file: it faces +X), each turned to face
    the witness table with a touch of disorder; the gooseneck microphones (head toward +Y in the file) pointing
    back at the chairs."""
    chair = None
    mic = None
    k = 0
    for p in places:
        c = p["chair"]
        jitter = ((k * 7) % 5 - 2) * 2.2
        pull = ((k * 3) % 4) * 0.03
        cpos = c + (Vector((0, DC, 0)) - c).normalized() * (-pull)      # some pushed back a little
        t = facing_deg(cpos.x, cpos.y, TABLE[0], TABLE[1]) + jitter
        if chair is None:
            chair = props.load("judge-chair", size=1.25, axis="z", loc=(cpos.x, cpos.y, p["zp"]), turn_deg=t,
                               sat=0.45, val=0.8, rough_add=0.1)
        else:
            instance(chair, f"dais_chair{k}", (cpos.x, cpos.y, p["zp"]), t)
        mp = p["mic"]
        tm = facing_deg(mp.x, mp.y, c.x, c.y) - 90.0 + ((k * 5) % 3 - 1) * 6
        if mic is None:
            mic = props.load("microphone", size=0.42, axis="z", loc=(mp.x, mp.y, p["zd"]), turn_deg=tm, sat=0.45,
                             rough_add=0.1)
        else:
            instance(mic, f"dais_mic{k}", (mp.x, mp.y, p["zd"]), tm)
        k += 1
    return chair, mic


# ---------------------------------------------------------------- the witness table
def skirt_panel(name, x0, x1, y, z0, z1, facing, m, pleat=0.16, amp=0.007):
    """A cloth skirt hanging from the table edge: soft vertical folds (deeper toward the hem), a slight flare, as a
    thin solid. Runs along X at `y` (facing = +1: toward +Y) or along Y at x = `y` (facing = +-2: toward +-X)."""
    nx = max(8, int(abs(x1 - x0) / 0.01))
    nz = 16
    bm = bmesh.new()
    rows = []
    for j in range(nz + 1):
        z = z1 - (z1 - z0) * j / nz
        t = j / nz
        a = amp * (0.35 + 0.65 * t)
        flare = 0.012 * t * t
        row = []
        for i in range(nx + 1):
            s = x0 + (x1 - x0) * i / nx
            ph = 2 * math.pi * (s - x0) / pleat
            d = a * math.sin(ph + 0.4 * math.sin(s * 3.1)) + flare
            if abs(facing) == 1:
                row.append(bm.verts.new((s, y + math.copysign(d, facing), z)))
            else:
                row.append(bm.verts.new((y + math.copysign(d, facing), s, z)))
        rows.append(row)
    for j in range(nz):
        for i in range(nx):
            f = (rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i])
            bm.faces.new(f)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_obj(name, bm, m, smooth=True)
    sol = ob.modifiers.new("thick", "SOLIDIFY")
    sol.thickness, sol.offset = 0.004, 0.0
    return ob


def witness_table():
    """The long table, its top and three sides under one dark blue felt cloth (the top's edge rounded over), the
    skirt to the floor; legs and the frame hidden inside; Tim's side open."""
    m = materials()
    cx, cy = TABLE
    x0, x1 = cx - TW / 2, cx + TW / 2
    y0, y1 = cy - TD / 2, cy + TD / 2
    # the board under the cloth, and the cloth over it (a rounded slab)
    span("wt_board", x0 + 0.01, x1 - 0.01, y0 + 0.01, y1 - 0.01, TOP - 0.04, TOP - 0.006, m["plinth"])
    top = span("wt_cloth_top", x0, x1, y0, y1, TOP - 0.03, TOP, m["felt"], bevel=0.012, segs=4)
    # the skirt: front (toward the dais) and both ends
    skirt_panel("wt_skirt_front", x0 + 0.004, x1 - 0.004, y1 + 0.004, 0.012, TOP - 0.012, 1, m["felt"])
    skirt_panel("wt_skirt_l", y0 + 0.02, y1, x0 - 0.004, 0.012, TOP - 0.012, -2, m["felt"])
    skirt_panel("wt_skirt_r", y0 + 0.02, y1, x1 + 0.004, 0.012, TOP - 0.012, 2, m["felt"])
    # legs seen from Tim's side under the open back: dark steel
    for lx in (x0 + 0.08, x1 - 0.08):
        for ly in (y0 + 0.08, y1 - 0.08):
            box("wt_leg", (0.04, 0.04, TOP - 0.04), (lx, ly, (TOP - 0.04) / 2), m["tube"], bevel=0.004)
    return top


def tumbler(name, x, y, fill):
    """A plain glass tumbler (a lathed thin wall with a thick base) and the water in it."""
    m = materials()
    r_top, r_bot, h = 0.036, 0.03, 0.105
    prof = [(0.0, 0.0), (r_bot - 0.002, 0.0), (r_bot, 0.002), (r_top, h), (r_top - 0.0025, h), (r_bot - 0.0025, 0.012),
            (0.0, 0.012)]
    g = lathe(name, prof, (x, y, TOP), m["glass"])
    if fill > 0:
        zf = 0.012 + (h - 0.012) * fill
        rw = r_bot - 0.0026 + (r_top - r_bot) * (zf / h)
        wp = [(0.0, 0.0121), (r_bot - 0.0026, 0.0121), (rw, zf), (0.0, zf)]
        lathe(name + "_water", wp, (x, y, TOP), m["water"])
    return g


def lathe(name, prof, loc, m, segs=48):
    bm = bmesh.new()
    rings = []
    for (r, z) in prof:
        ring_v = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            ring_v.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring_v)
    for j in range(len(rings) - 1):
        for i in range(segs):
            a, b = rings[j][i], rings[j][(i + 1) % segs]
            c, d = rings[j + 1][(i + 1) % segs], rings[j + 1][i]
            if len({a, b, c, d}) == 4:
                try:
                    bm.faces.new((a, b, c, d))
                except ValueError:
                    pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_obj(name, bm, m, smooth=True)
    ob.location = loc
    return ob


def nameplate(x, y):
    """A blank nameplate in a dark walnut holder, its blank face toward the dais."""
    m = materials()
    w = 0.3
    box("np_base", (w + 0.02, 0.06, 0.018), (x, y, TOP + 0.009), m["walnut_h"], bevel=0.004)
    card = box("np_card", (w, 0.006, 0.075), (x, y + 0.004, TOP + 0.018 + 0.036), m["card"], bevel=0.0015,
               rot=(math.radians(12), 0, 0))
    box("np_slot", (w + 0.01, 0.016, 0.012), (x, y - 0.002, TOP + 0.024), m["walnut_h"], bevel=0.003)
    return card


def timer_box(x, y, turn=0.0):
    """The witness timer: a small black box on the table with three round lenses facing the witness (the first lit
    a dim green, the others dark), no markings."""
    m = materials()
    root = bpy.data.objects.new("timer", None)
    bpy.context.scene.collection.objects.link(root)
    box("timer_body", (0.16, 0.07, 0.055), (0, 0, 0.0275), m["black_plastic"], bevel=0.006, parent=root)
    box("timer_face", (0.15, 0.004, 0.044), (0, -0.036, 0.0275), m["black_plastic"], bevel=0.001, parent=root)
    for i, (rgb, s) in enumerate((((0.35, 1.0, 0.45), 6.0), ((1.0, 0.8, 0.3), 0.0), ((1.0, 0.25, 0.2), 0.0))):
        ln = sk.sphere(f"timer_lens{i}", 0.013, (-0.045 + 0.045 * i, -0.036, 0.0285),
                       mt.lens(f"timer lens {i}", rgb, s), segs=20)
        ln.scale = (1, 0.45, 1)
        ln.parent = root
    root.location = (x, y, TOP)
    root.rotation_euler = (0, 0, math.radians(turn))
    if True:
        point("timer_glow", (x, y - 0.06, TOP + 0.03), 0.06, (0.4, 1.0, 0.5), radius=0.01)
    return root


def papers(x, y, n=4):
    """A few blank sheets, squared roughly, each a touch apart in angle, with one turned over at the corner."""
    m = materials()
    out = []
    for k in range(n):
        a = math.radians((-3.0, 2.0, -1.0, 4.5)[k % 4])
        dx, dy = (0.0, 0.008, -0.006, 0.014)[k % 4], (0.0, -0.006, 0.004, 0.01)[k % 4]
        out.append(box(f"paper{k}", (0.216, 0.279, 0.0004), (x + dx, y + dy, TOP + 0.0003 + 0.0005 * k), m["paper"],
                       rot=(0, 0, a)))
    return out


def folder(x, y, turn):
    m = materials()
    return box("folder", (0.235, 0.31, 0.012), (x, y, TOP + 0.006), m["folder"], bevel=0.003,
               rot=(0, 0, math.radians(turn)))


def table_dressing(mic_src):
    """On the table: Tim's papers (his hands go on them), the blank nameplate at the front edge, the timer, the two
    microphones (one at his place, one at the empty place), two water glasses, a closed folder."""
    cx, cy = TABLE
    papers(TIM_X + 0.01, cy - 0.13)
    folder(TIM_X - 0.48, cy - 0.1, 7.0)
    nameplate(TIM_X, cy + TD / 2 - 0.07)
    nameplate(EMPTY_X, cy + TD / 2 - 0.07)
    timer_box(cx + 0.2, cy + 0.2, 0.0)
    tumbler("glass_tim", TIM_X + 0.36, cy - 0.06, 0.55)
    tumbler("glass_empty", EMPTY_X + 0.2, cy + 0.02, 0.85)
    # microphones (head toward +Y in the file: turned to point back at the witness)
    m1 = instance(mic_src, "wt_mic_tim", (TIM_X - 0.17, cy + 0.03, TOP), 180.0 + 14.0, scale=0.95)
    m2 = instance(mic_src, "wt_mic_empty", (EMPTY_X - 0.1, cy + 0.17, TOP), 180.0 + 6.0, scale=0.95)
    return m1, m2


# ---------------------------------------------------------------- chairs
def witness_chair(name, x, y_back, turn=0.0):
    """An upholstered side chair in dark leather on walnut legs, facing +Y; its origin is on the floor at the
    backrest's front face (y_back), the seat in front of it. Seat cushion top at SEAT_Z."""
    m = materials()
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    sw, sd = 0.5, 0.48
    yc = sd / 2
    box(f"{name}_seat", (sw, sd, 0.09), (0, yc, SEAT_Z - 0.045), m["leather"], bevel=0.025, segs=4, parent=root)
    box(f"{name}_rail", (sw - 0.04, sd - 0.04, 0.06), (0, yc, SEAT_Z - 0.115), m["walnut_h"], bevel=0.006, parent=root)
    for lx in (-sw / 2 + 0.035, sw / 2 - 0.035):
        for ly in (0.035, sd - 0.035):
            box(f"{name}_leg", (0.04, 0.04, SEAT_Z - 0.1), (lx, ly, (SEAT_Z - 0.1) / 2), m["walnut"], bevel=0.005,
                parent=root)
    # the back: two posts and an upholstered pad, leaning back 9 degrees
    tilt = math.radians(9)
    for s in (-1, 1):
        box(f"{name}_post{s:+d}", (0.04, 0.045, 0.62), (s * (sw / 2 - 0.035), -0.05, SEAT_Z + 0.21),
            m["walnut"], bevel=0.005, rot=(tilt, 0, 0), parent=root)
    box(f"{name}_back", (sw - 0.04, 0.07, 0.44), (0, -0.035 - 0.03, SEAT_Z + 0.31), m["leather"], bevel=0.022, segs=4,
        rot=(tilt, 0, 0), parent=root)
    root.location = (x, y_back, 0.0)
    root.rotation_euler = (0, 0, math.radians(turn))
    return root


def public_chair_collection():
    """One public chair, built once into a collection (not linked to the scene) for instancing: a woven-fabric seat
    and back on a black steel tube frame with glides. Faces +Y (its back at -Y); origin under the seat centre."""
    m = materials()
    coll = bpy.data.collections.new("public_chair")
    objs = []
    sw, sd = 0.49, 0.46
    z = PUB_SEAT_Z
    objs.append(box("pc_seat", (sw, sd, 0.075), (0, 0.0, z - 0.0375), m["fabric"], bevel=0.022, segs=4))
    objs.append(box("pc_pan", (sw - 0.03, sd - 0.03, 0.02), (0, 0.0, z - 0.085), m["black_plastic"], bevel=0.004))
    tilt = math.radians(11)
    yb = PUB_BACK_Y - 0.03
    objs.append(box("pc_back", (sw - 0.01, 0.06, 0.4), (0, yb, z + 0.29), m["fabric"], bevel=0.022, segs=4,
                    rot=(tilt, 0, 0)))
    objs.append(box("pc_backshell", (sw - 0.03, 0.012, 0.37), (0, yb - 0.034, z + 0.285), m["black_plastic"],
                    bevel=0.004, rot=(tilt, 0, 0)))
    for s in (-1, 1):
        x = s * (sw / 2 - 0.03)
        # front leg, back leg (rising into the back post), side rail
        objs.append(sk.cyl("pc_legf", 0.011, z - 0.09, (x, sd / 2 - 0.05, (z - 0.09) / 2), m["tube"], verts=12))
        objs.append(sk.cyl("pc_legb", 0.011, z + 0.5, (x, -sd / 2 - 0.01, (z + 0.5) / 2 - 0.005), m["tube"],
                           verts=12, rot=(tilt * 0.55, 0, 0)))
        objs.append(sk.cyl("pc_rail", 0.009, sd - 0.06, (x, 0.0, z - 0.1), m["tube"], verts=12,
                           rot=(math.pi / 2, 0, 0)))
        for gy in (sd / 2 - 0.05, -sd / 2 - 0.13):
            objs.append(sk.cyl("pc_glide", 0.014, 0.012, (x, gy, 0.006), m["black_plastic"], verts=12))
    for o in objs:
        for c in o.users_collection:
            c.objects.unlink(o)
        coll.objects.link(o)
    return coll


def public_seats(coll, skip=()):
    """The rows: centre aisle 1.4 m, side aisles at the walls; every chair a hair out of line."""
    out = []
    k = 0
    for r, y in enumerate(ROWS):
        for s in (-1, 1):
            for c, ax in enumerate(SEATS_X):
                if (r, s, c) in skip:
                    pass
                jx = (((r * 7 + c * 3 + (s > 0) * 5) % 5) - 2) * 0.006
                jy = (((r * 3 + c * 5 + (s > 0)) % 5) - 2) * 0.008
                jt = (((r * 11 + c * 7 + (s > 0) * 3) % 7) - 3) * 0.6
                out.append(collection_instance(coll, f"pub_{r}_{s:+d}_{c}", (s * ax + jx, y + jy, 0.0), jt))
                k += 1
    return out


# ---------------------------------------------------------------- dressing
def doors():
    """The public doors in the back wall: a pair of walnut leaves under a deep architrave, tall frosted vision
    panels lit from the corridor, a line of light under them, bronze push plates."""
    m = materials()
    yf = Y0
    w, h = 1.9, 2.45
    for k, (x0, x1, z0, z1) in enumerate(((-w / 2 - 0.12, -w / 2, 0, h + 0.12), (w / 2, w / 2 + 0.12, 0, h + 0.12),
                                          (-w / 2 - 0.12, w / 2 + 0.12, h, h + 0.12))):
        span(f"door_arch{k}", x0, x1, yf, yf + 0.085, z0, z1, m["walnut"], bevel=0.008)
    span("door_back", -w / 2, w / 2, yf, yf + 0.014, 0.0, h, m["backing"])
    corridor = mt.glow("corridor glass", (0.75, 0.82, 0.95), 1.6, falloff=0.3, axes=("X", "Z"))
    for s in (-1, 1):
        lx0, lx1 = sorted((s * 0.006, s * (w / 2 - 0.004)))
        span(f"door_leaf{s:+d}", lx0, lx1, yf + 0.014, yf + 0.058, 0.014, h - 0.004, m["walnut"], bevel=0.004)
        vx = s * w / 4
        span(f"door_vision{s:+d}", vx - 0.075, vx + 0.075, yf + 0.058, yf + 0.06, 1.15, 2.05, corridor)
        for k, (x0, x1, z0, z1) in enumerate(((vx - 0.1, vx - 0.075, 1.12, 2.08), (vx + 0.075, vx + 0.1, 1.12, 2.08),
                                              (vx - 0.1, vx + 0.1, 1.12, 1.15), (vx - 0.1, vx + 0.1, 2.05, 2.08))):
            span(f"door_vframe{s:+d}{k}", x0, x1, yf + 0.058, yf + 0.072, z0, z1, m["bronze"], bevel=0.003)
        px = s * 0.12
        span(f"door_push{s:+d}", px - 0.05, px + 0.05, yf + 0.058, yf + 0.064, 0.95, 1.35, m["bronze"], bevel=0.002)
    span("door_gap_glow", -w / 2, w / 2, yf + 0.014, yf + 0.05, 0.0, 0.012, mt.glow("under door", (0.75, 0.82, 0.95), 3.0))
    area("corridor_spill", (0.0, yf + 0.09, 1.6), (1.2, 1.0), 14.0, (0.75, 0.82, 0.95), spread=120,
         rot=aim_rot((0, yf + 0.09, 1.6), (0, yf + 3, 1.0)))
    area("under_door", (0.0, yf + 0.09, 0.02), (1.8, 0.02), 6.0, (0.75, 0.82, 0.95), spread=160,
         rot=aim_rot((0, yf + 0.09, 0.02), (0, yf + 2, 0.0)))


def sconce(name, x, y, z, s):
    """A wall sconce on a pilaster: a bronze back plate and arm, an opal half-cylinder shade glowing, a point light
    under it washing the walnut."""
    m = materials()
    xf = s * (XW - 0.07)
    span(f"{name}_plate", xf - s * 0.012, xf, y - 0.05, y + 0.05, z - 0.11, z + 0.11, m["bronze"], bevel=0.003)
    shade_m = M.setdefault("sconce_shade", mt.glow("sconce shade", WARMISH, 2.2, falloff=0.35, axes=("Y", "Z")))
    sh = sk.cyl(f"{name}_shade", 0.07, 0.2, (xf - s * 0.09, y, z), shade_m, verts=32)
    for k, zz in enumerate((z - 0.1, z + 0.1)):
        sk.cyl(f"{name}_ring{k}", 0.074, 0.012, (xf - s * 0.09, y, zz), m["bronze"], verts=32)
    point(f"{name}_light", (xf - s * 0.1, y, z - 0.02), 9.0, WARMISH, radius=0.06)
    return sh


def clock(x, y, z, s):
    """A plain wall clock: a dark bezel, a pale face with twelve ticks and two hands, no numerals, no name."""
    m = materials()
    xf = s * XW
    rot = (0, math.pi / 2, 0)
    sk.cyl("clock_bezel", 0.2, 0.05, (xf - s * 0.03, y, z), m["black_plastic"], rot=rot, verts=64)
    sk.cyl("clock_face", 0.18, 0.004, (xf - s * 0.057, y, z), m["clock_face"], rot=rot, verts=64)
    for i in range(12):
        a = 2 * math.pi * i / 12
        ln = 0.03 if i % 3 == 0 else 0.016
        r = 0.155
        box(f"clock_tick{i}", (0.002, 0.006, ln), (xf - s * 0.06, y + r * math.sin(a) * 1.0, z + r * math.cos(a)),
            m["black_plastic"], rot=(-a, 0, 0))
    for k, (ang, ln, wd) in enumerate(((math.radians(-62), 0.1, 0.008), (math.radians(118), 0.14, 0.005))):
        c = (xf - s * 0.063, y + math.sin(ang) * ln / 2, z + math.cos(ang) * ln / 2)
        box(f"clock_hand{k}", (0.002, wd, ln), c, m["black_plastic"], rot=(-ang, 0, 0))
    sk.cyl("clock_hub", 0.008, 0.008, (xf - s * 0.064, y, z), m["black_plastic"], rot=rot, verts=16)


def tv_light(name, loc, target, energy, size=(0.5, 0.4), spread=45):
    """A broadcast soft light hung from a ceiling bar: a dark housing with a grid face, aimed; its light."""
    m = materials()
    loc, target = Vector(loc), Vector(target)
    rot = aim_rot(loc, target)
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    root.location, root.rotation_euler = loc, rot
    w, h = size
    box(f"{name}_housing", (w + 0.06, h + 0.06, 0.2), (0, 0, 0.1), m["housing"], bevel=0.012, parent=root)
    face = M.setdefault("tv_face", mt.glow("broadcast face", COOL, 6.0, falloff=0.25, axes=("X", "Y")))
    fo = box(f"{name}_face", (w, h, 0.004), (0, 0, -0.002), face, parent=root)
    fo.visible_shadow = False
    for i in range(1, 5):
        box(f"{name}_grid_v{i}", (0.004, h, 0.03), (-w / 2 + w * i / 5, 0, -0.016), m["housing"], parent=root)
        box(f"{name}_grid_h{i}", (w, 0.004, 0.03), (0, -h / 2 + h * i / 5, -0.016), m["housing"], parent=root)
    # the yoke and the drop to the ceiling bar
    drop = H - 0.32 - loc.z
    sk.cyl(f"{name}_drop", 0.016, max(0.05, drop), (loc.x, loc.y, loc.z + 0.15 + drop / 2), m["tube"], verts=12)
    li = area(f"{name}_light", tuple(loc + (target - loc).normalized() * 0.036), size, energy, COOL, spread=spread,
              rot=rot)
    return li


def dressing():
    m = materials()
    doors()
    for s in (-1, 1):
        for k, y in enumerate((-6.7, -1.9, 2.9)):
            sconce(f"sconce{s:+d}{k}", s * XW, y + 0.0, 2.2, s)
    clock(0, 3.9, 3.4, -1)
    # the ceiling bars carrying the broadcast lights (steel tube between the beams)
    for y in (1.2, -3.6):
        sk.cyl(f"tv_bar{y:+.1f}", 0.025, 2 * XW - 1.0, (0, y, H - 0.42), m["tube"], rot=(0, math.pi / 2, 0), verts=16)
