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
    dict(R=5.2, zp=0.30, zd=1.0, zc=1.1, n=8),
    dict(R=6.95, zp=0.95, zd=1.66, zc=1.78, n=10),
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
WARMISH = (1.0, 0.92, 0.82)      # the sconces, warm-neutral (the grade cools everything)
BAR_Z = 5.04                     # the broadcast lights' ceiling bars, fixed under the beams at y 1.2 and -3.6

M = {}
LIGHTS = {}


# ---------------------------------------------------------------- helpers
def materials():
    if M:
        return M
    # dark lacquered walnut: a strong figure and a clear coat, so the panels read as wood with a grazing highlight on
    # the bevels (at 0.052 with a 0.3 figure the grade turned them into flat grey board)
    # (at 0.035 / 0.02 / 0.011 under a 0.5 coat the neutral coat reflections outweighed the diffuse and the film grade
    # turned the fascia grey-blue: a little more red-brown and a lighter coat keep it reading as walnut)
    walnut = (0.044, 0.021, 0.0095)
    wv = dict(contrast=0.58, rough=(0.3, 0.44), coat=0.38, coat_rough=0.15)
    M.update(
        walnut=mt.veneer("walnut", walnut, "Z", **wv),
        walnut_h=mt.veneer("walnut along", walnut, "X", **wv),
        walnut_y=mt.veneer("walnut across", walnut, "Y", **wv),
        backing=mt.satin("reveal black", (0.012, 0.011, 0.01), rough=(0.6, 0.75)),
        plinth=mt.satin("plinth", (0.016, 0.015, 0.015), rough=(0.45, 0.6), grime=0.3),
        wall=mt.plaster("wall plaster", (0.18, 0.186, 0.198)),
        ceil=mt.plaster("ceiling plaster", (0.26, 0.265, 0.27), grime=0.2, bump=0.03),
        carpet=mt.carpet("room carpet", (0.026, 0.03, 0.044),
                         walk=((-0.7, 0.7, Y0, -1.6), (-2.2, 2.2, -1.6, 2.6))),
        dais_carpet=mt.carpet("dais carpet", (0.022, 0.024, 0.032), lattice=0.12),
        velour=mt.velour("drape velour", (0.028, 0.036, 0.068)),
        felt=mt.felt("table felt", (0.02, 0.026, 0.045)),
        leather=mt.leather("chair leather", (0.028, 0.026, 0.026)),
        fabric=mt.upholstery("public fabric", (0.048, 0.054, 0.072)),
        tube=mt.satin("black tube", (0.02, 0.02, 0.022), rough=(0.3, 0.42), metal=0.85),
        bronze=mt.dark_metal("bronze"),
        brushed=mt.satin("brushed steel", (0.42, 0.43, 0.44), rough=(0.28, 0.4), metal=1.0),
        black_plastic=mt.satin("black plastic", (0.018, 0.018, 0.019), rough=(0.35, 0.5)),
        white=mt.satin("white plastic", (0.42, 0.42, 0.41), rough=(0.4, 0.5)),
        card=mt.blank_panel("blank card", (0.22, 0.215, 0.2)),
        paper=mt.paper("paper", (0.78, 0.76, 0.7)),
        folder=mt.satin("folder board", (0.035, 0.04, 0.05), rough=(0.6, 0.75)),
        folder2=mt.satin("folder board dark", (0.022, 0.022, 0.024), rough=(0.55, 0.7)),
        barn=mt.satin("barn door", (0.05, 0.052, 0.056), rough=(0.4, 0.55), metal=0.6),
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
            y = yb - amp * (math.sin(ph + wob) * 0.92 + 0.08 * math.sin(2 * ph + 1.3))
            row.append(bm.verts.new((x, y, z)))
        rows.append(row)
    for j in range(nz):
        for i in range(nx):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    ob = mesh_obj("drape", bm, m["velour"], smooth=True)
    sub = ob.modifiers.new("smooth", "SUBSURF")      # rounder pleat crests (no single-pixel sheen lines)
    sub.levels, sub.render_levels = 1, 1
    sol = ob.modifiers.new("thick", "SOLIDIFY")
    sol.thickness, sol.offset = 0.006, 1.0
    # the pelmet, and a dark recess above it
    span("pelmet", x0 - 0.15, x1 + 0.15, yb - 0.24, Y1, z1 - 0.02, z1 + 0.34, m["walnut_h"], bevel=0.012)
    span("pelmet_lip", x0 - 0.17, x1 + 0.17, yb - 0.26, yb - 0.2, z1 + 0.26, z1 + 0.36, m["walnut_h"], bevel=0.01)
    # the washer: a slot in the ceiling in front of the pelmet, its light grazing down the folds
    slot = box("washer_slot", (9.6, 0.05, 0.012), (0, yb - 0.55, H - 0.004), mt.glow("washer lens", COOL, 1.2))
    src = (0.0, yb - 0.55, H - 0.03)
    area("washer", src, (9.4, 0.05), 380.0, COOL, spread=80, rot=aim_rot(src, (0.0, yb + 0.25, 1.2)))
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
            chair = props.load("judge-chair", size=1.32, axis="z", loc=(cpos.x, cpos.y, p["zp"]), turn_deg=t,
                               sat=0.45, val=0.8, rough_add=0.1)
        else:
            instance(chair, f"dais_chair{k}", (cpos.x, cpos.y, p["zp"]), t)
        mp = p["mic"]
        tm = facing_deg(mp.x, mp.y, c.x, c.y) - 90.0 + ((k * 5) % 3 - 1) * 6
        if mic is None:
            mic = props.load("microphone", size=0.42, axis="z", loc=(mp.x, mp.y, p["zd"]), turn_deg=tm, sat=0.45,
                             rough_add=0.1)
        else:      # not all alike: a little taller or shorter, turned a little differently
            instance(mic, f"dais_mic{k}", (mp.x, mp.y, p["zd"]), tm + ((k * 7) % 5 - 2) * 5.0,
                     scale=1.0 + ((k * 5) % 3 - 1) * 0.07)
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
    top = span("wt_cloth_top", x0, x1, y0, y1, TOP - 0.03, TOP, m["felt"], bevel=0.018, segs=6)   # rolled edge
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


def nameplate(name, x, y, turn=0.0):
    """A blank nameplate: a dark walnut plate with bevelled edges (no lettering) leaning back in a walnut holder, its
    face toward the dais. (A pale card here read as a flat grey slab in the witness close-up.)"""
    m = materials()
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    w = 0.28
    box(f"{name}_base", (w + 0.02, 0.06, 0.016), (0, 0, 0.008), m["walnut_h"], bevel=0.004, parent=root)
    card = box(f"{name}_plate", (w, 0.009, 0.07), (0, 0.004, 0.016 + 0.034), m["walnut_h"], bevel=0.003,
               rot=(math.radians(12), 0, 0), parent=root)
    box(f"{name}_slot", (w + 0.01, 0.016, 0.012), (0, -0.002, 0.022), m["walnut_h"], bevel=0.003, parent=root)
    root.location = (x, y, TOP)
    root.rotation_euler = (0, 0, math.radians(turn))
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


PAPER_TOP = TOP + 0.0016      # the top sheet's surface over its middle


def sheet(name, x, y, z, turn_deg, curl=0.0018, corner=0.0, w=0.216, l=0.279):
    """One sheet of paper, 0.1 mm thick: a fine grid whose long ends lift a little (`curl` m at the ends, a sheet
    that has been carried and handled), one corner lifting `corner` m more."""
    m = materials()
    nx, ny = 10, 13
    bm = bmesh.new()
    vs = []
    for j in range(ny + 1):
        row = []
        v = j / ny * 2 - 1                      # -1 .. 1 along the length
        for i in range(nx + 1):
            u = i / nx * 2 - 1
            dz = curl * v * v + corner * max(0.0, (u + v) / 2 - 0.55) ** 2 / 0.2
            row.append(bm.verts.new((u * w / 2, v * l / 2, dz)))
        vs.append(row)
    for j in range(ny):
        for i in range(nx):
            bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
    ob = mesh_obj(name, bm, m["paper"], smooth=True)
    sol = ob.modifiers.new("thick", "SOLIDIFY")
    sol.thickness, sol.offset = 0.0001, 1.0
    ob.location = (x, y, z)
    ob.rotation_euler = (0, 0, math.radians(turn_deg))
    return ob


def papers(x, y, n=4, turn=0.0):
    """A few blank sheets stacked a little out of square (2-6 mm offsets, 1-3 degree turns), each with a slight
    curl, the top one lifting at a corner: a stack you can count, not one weightless plane."""
    out = []
    spec = ((0.0, 0.0, -2.0, 0.0), (0.005, -0.004, 1.5, 0.0), (-0.003, 0.006, -0.8, 0.0), (0.006, 0.002, 2.6, 0.004))
    for k in range(n):
        dx, dy, a, corner = spec[k % 4]
        out.append(sheet(f"paper{k}", x + dx, y + dy, TOP + 0.0002 + 0.00035 * k, turn + a,
                         curl=0.0012 + 0.0003 * k, corner=corner))
    return out


def folder(x, y, turn):
    m = materials()
    return box("folder", (0.235, 0.31, 0.012), (x, y, TOP + 0.006), m["folder"], bevel=0.003,
               rot=(0, 0, math.radians(turn)))


TABLE_POS = dict(       # where the table's things stand (the stage module may replace entries before building)
    papers=(TIM_X + 0.01, TABLE[1] - 0.13, 0.0),
    folder=(TIM_X - 0.64, TABLE[1] - 0.02, 7.0),
    np_tim=(TIM_X, TABLE[1] + TD / 2 - 0.07, 0.0),
    np_empty=(EMPTY_X, TABLE[1] + TD / 2 - 0.07, 0.0),
    timer=(TABLE[0] + 0.2, TABLE[1] + 0.2, 0.0),
    glass_tim=(TIM_X + 0.43, TABLE[1] + 0.06, 0.6),
    glass_empty=(EMPTY_X + 0.2, TABLE[1] + 0.02, 0.85),
    mic_tim=(TIM_X - 0.17, TABLE[1] + 0.03, 194.0, 0.95),
    mic_empty=(EMPTY_X - 0.1, TABLE[1] + 0.17, 186.0, 0.95),
)


def table_dressing(mic_src, pos=None):
    """On the table: Tim's papers (his hands go on them), the blank nameplates at the front edge, the timer, the two
    microphones (one at his place, one at the empty place), two water glasses, a closed folder."""
    p = dict(TABLE_POS)
    p.update(pos or {})
    papers(p["papers"][0], p["papers"][1], turn=p["papers"][2])
    folder(*p["folder"])
    nameplate("np_tim", *p["np_tim"])
    nameplate("np_empty", *p["np_empty"])
    timer_box(*p["timer"])
    tumbler("glass_tim", *p["glass_tim"])
    tumbler("glass_empty", *p["glass_empty"])
    # microphones (head toward +Y in the file: turned to point back at the witness)
    x, y, t, s = p["mic_tim"]
    m1 = instance(mic_src, "wt_mic_tim", (x, y, TOP), t, scale=s)
    x, y, t, s = p["mic_empty"]
    m2 = instance(mic_src, "wt_mic_empty", (x, y, TOP), t, scale=s)
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
    area("corridor_spill", (0.0, yf + 0.09, 1.6), (1.2, 1.0), 30.0, (0.75, 0.82, 0.95), spread=120,
         rot=aim_rot((0, yf + 0.09, 1.6), (0, yf + 3, 1.0)))
    # the line of light under the doors grazes the centre aisle's carpet toward the well
    area("under_door", (0.0, yf + 0.09, 0.02), (1.8, 0.02), 26.0, (0.75, 0.82, 0.95), spread=160,
         rot=aim_rot((0, yf + 0.09, 0.02), (0, yf + 2, 0.0)))


SCONCE_Z = 3.15          # on the plaster above the wainscot cap (2.66), over a pilaster
# (at 38/24 W the side walls and their wainscot stayed under the grade's black in the wide: the room read as a void)
SCONCE_W = dict(up=90.0, down=110.0, glow=8.0)


def sconce(name, x, y, z, s):
    """A wall sconce on the plaster over a pilaster: a bronze back plate, an opal half-cylinder shade glowing between
    two bronze bands; an up-light and a down-light close to the wall throw the scallops on the plaster above and the
    wainscot below, a weak point glow lights the plate and the cap."""
    m = materials()
    xf = s * XW
    span(f"{name}_plate", xf - s * 0.014, xf, y - 0.07, y + 0.07, z - 0.2, z + 0.2, m["bronze"], bevel=0.004)
    shade_m = M.setdefault("sconce_shade", mt.glow("sconce shade", WARMISH, 2.0, falloff=0.45, axes=("Y", "Z")))
    cx = xf - s * 0.03                       # the shade's axis: half of it sunk into the plate (a half-cylinder)
    sh = sk.cyl(f"{name}_shade", 0.075, 0.3, (cx, y, z), shade_m, verts=40)
    for k, zz in enumerate((z - 0.15, z + 0.15)):
        sk.cyl(f"{name}_ring{k}", 0.08, 0.018, (cx, y, zz), m["bronze"], verts=40)
    up = (xf - s * 0.07, y, z + 0.17)
    dn = (xf - s * 0.07, y, z - 0.17)
    spot(f"{name}_up", up, (xf - s * 0.02, y, z + 2.0), SCONCE_W["up"], WARMISH, 110.0, 0.45, radius=0.03)
    spot(f"{name}_down", dn, (xf - s * 0.03, y, z - 2.0), SCONCE_W["down"], WARMISH, 100.0, 0.5, radius=0.03)
    point(f"{name}_glow", (xf - s * 0.16, y, z), SCONCE_W["glow"], WARMISH, radius=0.08)
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


def tv_light(name, loc, target, energy, size=(0.5, 0.4), spread=45, face_strength=4.0, doors=38.0):
    """A broadcast soft light hung from a ceiling bar, built as a fixture: a black bevelled housing 0.12 m deep with
    a bezel, an egg-crate face, four barn doors opened `doors` degrees off the beam, a yoke pivoting on the housing's
    sides, a pipe drop to the bar. The face glows (`face_strength`, so it reads near 200 graded, not clipped); the
    barn doors' satin insides catch its light, so off-axis the lens sees housing and an edge glow, not a white tile."""
    m = materials()
    loc, target = Vector(loc), Vector(target)
    rot = aim_rot(loc, target)
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    root.location, root.rotation_euler = loc, rot
    w, h = size
    hw, hh, dep = w + 0.1, h + 0.1, 0.12
    box(f"{name}_housing", (hw, hh, dep), (0, 0, dep / 2), m["housing"], bevel=0.014, parent=root)
    box(f"{name}_back", (hw - 0.08, hh - 0.08, 0.05), (0, 0, dep + 0.02), m["housing"], bevel=0.01, parent=root)
    for k, (sx, sy, px, py) in enumerate(((hw, 0.04, 0, hh / 2 - 0.02), (hw, 0.04, 0, -hh / 2 + 0.02),
                                          (0.04, hh, hw / 2 - 0.02, 0), (0.04, hh, -hw / 2 + 0.02, 0))):
        box(f"{name}_bezel{k}", (sx, sy, 0.03), (px, py, -0.01), m["housing"], bevel=0.006, parent=root)
    face = M.get("tv_face")
    if face is None:
        face = M["tv_face"] = mt.glow("broadcast face", COOL, face_strength, falloff=0.3, axes=("X", "Y"))
        face.cycles.emission_sampling = "FRONT"
    fo = box(f"{name}_face", (w, h, 0.004), (0, 0, 0.004), face, parent=root)
    fo.visible_shadow = False
    for i in range(1, 5):
        box(f"{name}_grid_v{i}", (0.004, h, 0.03), (-w / 2 + w * i / 5, 0, -0.012), m["housing"], parent=root)
        box(f"{name}_grid_h{i}", (w, 0.004, 0.03), (0, -h / 2 + h * i / 5, -0.012), m["housing"], parent=root)
    # barn doors: flaps hinged on the bezel, opened `doors` degrees out from the beam axis (-Z)
    a = math.radians(doors)
    for k, (axis, sgn, length) in enumerate((("Y", 1, 0.2), ("Y", -1, 0.2), ("X", 1, 0.16), ("X", -1, 0.16))):
        if axis == "Y":
            hinge = Vector((0, sgn * hh / 2, -0.025))
            d = Vector((0, sgn * math.sin(a), -math.cos(a)))
            size_ = (hw - 0.02, length, 0.006)
            r = (math.atan2(d.z, d.y), 0, 0)
        else:
            hinge = Vector((sgn * hw / 2, 0, -0.025))
            d = Vector((sgn * math.sin(a), 0, -math.cos(a)))
            size_ = (length, hh - 0.02, 0.006)
            r = (0, -math.atan2(d.z, d.x), 0)
        c = hinge + d * (length / 2)
        box(f"{name}_door{k}", size_, tuple(c), m["barn"], bevel=0.002, parent=root)
    # the yoke: pivots on the housing's sides (the local X axis is level), arms straight up to a cross bar, a pipe
    # drop to the ceiling bar
    bpy.context.view_layer.update()
    mw = root.matrix_world
    xw = (mw.to_3x3() @ Vector((1, 0, 0))).normalized()
    centre = mw @ Vector((0, 0, dep / 2))
    arm = 0.36
    for s_ in (-1, 1):
        p = centre + xw * s_ * (hw / 2 + 0.035)
        sk.cyl(f"{name}_pivot{s_:+d}", 0.03, 0.03, tuple(p - xw * s_ * 0.012), m["housing"],
               rot=(0, math.pi / 2, math.atan2(xw.y, xw.x)), verts=20)
        box(f"{name}_arm{s_:+d}", (0.035, 0.012, arm), tuple(p + Vector((0, 0, arm / 2))), m["housing"], bevel=0.004,
            rot=(0, 0, math.atan2(xw.y, xw.x)))
    top = centre + Vector((0, 0, arm))
    box(f"{name}_cross", (hw + 0.07 + 0.035, 0.035, 0.03), tuple(top), m["housing"], bevel=0.005,
        rot=(0, 0, math.atan2(xw.y, xw.x)))
    drop = BAR_Z - top.z
    sk.cyl(f"{name}_drop", 0.019, max(0.05, drop), (top.x, top.y, top.z + drop / 2), m["tube"], verts=16)
    sk.cyl(f"{name}_clamp", 0.04, 0.07, (top.x, top.y, BAR_Z), m["housing"], rot=(0, math.pi / 2, 0), verts=16)
    li = area(f"{name}_light", tuple(loc + (target - loc).normalized() * 0.036), size, energy, COOL, spread=spread,
              rot=rot)
    return li


SCONCE_Y = (-6.7, -1.9, 2.9, 7.7)


def dressing():
    m = materials()
    doors()
    for s in (-1, 1):
        for k, y in enumerate(SCONCE_Y):
            sconce(f"sconce{s:+d}{k}", s * XW, y + 0.0, SCONCE_Z, s)
    clock(0, 3.9, 3.4, -1)
    # the ceiling bars carrying the broadcast lights: a 48 mm black pipe on short hangers under the beams at y 1.2
    # and -3.6
    for y in (1.2, -3.6):
        sk.cyl(f"tv_bar{y:+.1f}", 0.024, 2 * XW - 1.0, (0, y, BAR_Z), m["housing"], rot=(0, math.pi / 2, 0), verts=20)
        for x in (-5.5, -2.5, 0.0, 2.5, 5.5):
            sk.cyl(f"tv_hanger{y:+.1f}_{x:+.1f}", 0.008, H - 0.32 - BAR_Z, (x, y, (H - 0.32 + BAR_Z) / 2), m["tube"],
                   verts=10)


# ---------------------------------------------------------------- secondary dressing (dim, about 10-20 graded)
def side_chair(name, x, y, turn):
    """A plain dark staff chair: the witness chair's build (leather on walnut), turned to face `turn` degrees."""
    return witness_chair(name, x, y, turn=turn)


def staff_table(name, x, y, turn, length=1.8, depth=0.6, h=0.74, folders=2, chairs=2):
    """A plain walnut table with a dark modesty panel on its front, closed blank folders on it and dark chairs
    behind it. Local frame: the table runs along X, its users sit at -Y (behind) facing +Y."""
    m = materials()
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    box(f"{name}_top", (length, depth, 0.035), (0, 0, h - 0.0175), m["walnut_h"], bevel=0.008, parent=root)
    box(f"{name}_modesty", (length - 0.08, 0.02, h - 0.2), (0, depth / 2 - 0.04, (h - 0.035) / 2 + 0.08),
        m["walnut"], bevel=0.004, parent=root)
    for sx in (-1, 1):
        box(f"{name}_end{sx:+d}", (0.04, depth - 0.04, h - 0.035), (sx * (length / 2 - 0.04), 0, (h - 0.035) / 2),
            m["walnut"], bevel=0.005, parent=root)
    for k in range(folders):
        fx = -length / 4 + k * length / 2 + ((k * 7) % 3 - 1) * 0.06
        f = box(f"{name}_folder{k}", (0.235, 0.31, 0.014 + 0.006 * k), (fx, -0.02, h + 0.007 + 0.003 * k),
                m["folder2"], bevel=0.003, rot=(0, 0, math.radians(-90 + (k * 11) % 9 - 4)), parent=root)
    root.location = (x, y, 0.0)
    root.rotation_euler = (0, 0, math.radians(turn))
    bpy.context.view_layer.update()
    out = [root]
    for k in range(chairs):
        cx = -length / 4 + k * length / 2
        p = root.matrix_world @ Vector((cx, -depth / 2 - 0.42, 0))
        out.append(witness_chair(f"{name}_chair{k}", p.x, p.y, turn=turn + ((k * 5) % 3 - 1) * 6.0))
    return out


def tripod_camera(name, x, y, turn, z_head=1.42):
    """A broadcast camera on a tripod, no markings: three splayed legs and a spreader, a fluid head, a plain box
    body, a lens hood and a small viewfinder; dark satin throughout. Looks along +Y turned by `turn` degrees."""
    m = materials()
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    spread = 0.42
    for k in range(3):
        a = math.radians(90 + 120 * k)
        foot = Vector((math.cos(a) * spread, math.sin(a) * spread, 0.0))
        top = Vector((math.cos(a) * 0.05, math.sin(a) * 0.05, z_head - 0.1))
        d = top - foot
        mid = (top + foot) / 2
        leg = sk.cyl(f"{name}_leg{k}", 0.013, d.length, tuple(mid), m["tube"], verts=12)
        leg.rotation_mode = "QUATERNION"
        leg.rotation_quaternion = d.to_track_quat("Z", "Y")
        leg.parent = root
        sk.cyl(f"{name}_foot{k}", 0.02, 0.02, tuple(foot + Vector((0, 0, 0.01))), m["black_plastic"],
               verts=12).parent = root
        sp = sk.cyl(f"{name}_spread{k}", 0.006, spread * 0.55, tuple(foot * 0.45 + Vector((0, 0, 0.22))), m["tube"],
                    rot=(0, math.pi / 2, a), verts=8)
        sp.parent = root
    box(f"{name}_head", (0.12, 0.14, 0.09), (0, 0, z_head - 0.05), m["black_plastic"], bevel=0.008, parent=root)
    box(f"{name}_body", (0.15, 0.36, 0.2), (0, 0.02, z_head + 0.1), m["housing"], bevel=0.012, parent=root)
    lens = sk.cyl(f"{name}_lens", 0.055, 0.2, (0, 0.3, z_head + 0.1), m["black_plastic"], rot=(math.pi / 2, 0, 0),
                  verts=28)
    lens.parent = root
    hood = sk.cyl(f"{name}_hood", 0.075, 0.08, (0, 0.43, z_head + 0.1), m["housing"], rot=(math.pi / 2, 0, 0),
                  verts=28, r2=0.065)
    hood.parent = root
    box(f"{name}_vf", (0.06, 0.1, 0.07), (-0.1, -0.06, z_head + 0.2), m["housing"], bevel=0.008, parent=root)
    box(f"{name}_handle", (0.02, 0.4, 0.02), (0.05, -0.32, z_head - 0.06), m["tube"], bevel=0.004, parent=root)
    root.location = (x, y, 0.0)
    root.rotation_euler = (0, 0, math.radians(turn))
    return root
