"""The leather market's set (built in Python): a covered lane of stalls at night.

A 2.5 m lane runs along +Y between two rows of stall boxes 2.4 m deep, broken by a cross alley at y 2.55-4.05.
Each stall has painted partitions with steel posts and roller-shutter guides at the front, a board ceiling, a blank
fascia, and a galvanised corrugated awning sloping out over the lane, a bare fluorescent batten hung under it. Most
stalls are shut for the night (shutters down, one half up); the hero stall (right side, y 4.05-6.75, its alley corner
open) burns under three battens: wire-grid walls hung floor to ceiling with handbags on peg hooks, a low shelf of
standing bags, a rail of bags along the front over a laminate counter. A few other stalls glow dimly further on; the
cross aisle at the far end has one high-bay lamp. The market's high roof (steel trusses, a faint skylight strip) shows
through the gap between the awnings. Plastic crates stand at the stall fronts; cables run sagging along the awnings,
drop to each batten and cross the lane; the concrete lane is wet, with puddles toward the centre drain.

Handbags: the four generated models are loaded once each and hung as linked copies, each object carrying its own
leather colour (leather_market_mats.recolour), chosen so no two neighbours in a row or column match.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import props  # noqa: E402
import setkit as sk  # noqa: E402
import leather_market_mats as mt  # noqa: E402

LANE = 1.25            # half width of the lane: stall fronts at x = +-1.25
DEPTH = 2.4            # stall depth: back walls at x = +-3.65
CEIL = 2.75            # stall ceiling
TOPZ = 3.1             # top of the stall boxes (fascia top)
AW_IN, AW_OUT = (3.12, 2.9), 0.42   # awning: z at the fascia, z at its lane edge; the edge at x = +-0.42
ALLEY = (2.55, 4.05)
PITCH = 2.7
HERO = (4.05, 6.75)
COUNTER = dict(x0=1.30, x1=1.95, y0=4.15, y1=5.35, top=0.905)
BAG_ON_COUNTER = (1.625, 4.95)          # the extra bag's footprint centre on the counter

M = {}
LIGHTS = {}
OBJ = {}
rng = random.Random(7)


def spans():
    before = [ALLEY[0] - PITCH * (i + 1) for i in range(4)][::-1]
    after = [ALLEY[1] + PITCH * i for i in range(7)]
    return [(y, y + PITCH) for y in before + after]


# stall states, by (side, y0): "hero", "dim", "warm", "dark" (open, unlit), "half" (shutter half up), else closed
STATE = {
    (1, 4.05): "hero", (1, 9.45): "dim", (1, 17.55): "warm", (1, -0.15): "half",
    (-1, 12.15): "dim", (-1, 20.25): "warm", (-1, -2.85): "half",
}


# ---------------------------------------------------------------- geometry helpers
def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0)):
    ob = sk.box(name, size, loc, m, bevel=bevel, rot=rot)
    if bevel:
        ob.modifiers["bevel"].segments = 3
        ob.modifiers["bevel"].limit_method = "ANGLE"
    return ob


def span_box(name, x0, x1, y0, y1, z0, z1, m, bevel=0.0):
    return box(name, (abs(x1 - x0), abs(y1 - y0), abs(z1 - z0)), ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), m, bevel)


def mesh_obj(name, bm, m, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if m is not None:
        ob.data.materials.append(m)
    return ob


def tube_between(bm, a, b, r, segs=6):
    a, b = Vector(a), Vector(b)
    d = b - a
    L = d.length
    if L < 1e-6:
        return
    q = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    mtx = Matrix.Translation((a + b) / 2) @ q
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=L, matrix=mtx)


def curve(name, pts, r, m, res=2):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution = "3D", r, res
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts):
        p.co = (*co, 1.0)
    ob = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(m)
    return ob


def catenary(a, b, sag, n=16):
    a, b = Vector(a), Vector(b)
    return [tuple(a.lerp(b, t) - Vector((0, 0, sag * 4 * t * (1 - t)))) for t in (i / n for i in range(n + 1))]


def bundle(name, a, b, sag, count=3, spread=0.025, r=(0.004, 0.007), m=None):
    """A loose bundle of cables between two points, each with its own sag and a slight wander: tangled, not combed."""
    out = []
    for i in range(count):
        da = Vector((rng.uniform(-spread, spread), rng.uniform(-spread, spread), rng.uniform(-spread, spread)))
        db = Vector((rng.uniform(-spread, spread), rng.uniform(-spread, spread), rng.uniform(-spread, spread)))
        pts = catenary(Vector(a) + da, Vector(b) + db, sag * rng.uniform(0.75, 1.3), 18)
        w = [Vector(p) for p in pts]
        ph = rng.uniform(0, 6.28)
        for k in range(1, len(w) - 1):
            w[k] += Vector((math.sin(k * 0.9 + ph), math.cos(k * 0.7 + ph), 0)) * spread * 0.35
        mm = m or (M["cable"] if rng.random() > 0.25 else M["cable_grey"])
        out.append(curve(f"{name}_{i}", [tuple(p) for p in w], rng.uniform(*r), mm))
    return out


def corrugated(name, length, width, m, pitch=0.076, amp=0.009, thick=0.0008):
    """A corrugated sheet: ribs run along local X (length), the wave across local Y (width), centred on the origin."""
    bm = bmesh.new()
    nj = max(2, int(width / (pitch / 8)))
    rows = []
    for x in (-length / 2, length / 2):
        row = []
        for j in range(nj + 1):
            y = -width / 2 + width * j / nj
            row.append(bm.verts.new((x, y, amp * math.sin(2 * math.pi * y / pitch))))
        rows.append(row)
    for j in range(nj):
        bm.faces.new((rows[0][j], rows[0][j + 1], rows[1][j + 1], rows[1][j]))
    ob = mesh_obj(name, bm, m)
    so = ob.modifiers.new("thick", "SOLIDIFY")
    so.thickness, so.offset = thick, 0.0
    return ob


def frame_matrix(origin, u, v, w):
    """A placement whose local X, Y, Z run along u, v, w (orthonormal, right-handed)."""
    R = Matrix((u, v, w)).transposed().to_4x4()
    R.translation = origin
    return R


# ---------------------------------------------------------------- the lane and its roof
def lane():
    y0, y1 = -10.0, 28.0
    f = box("lane_floor_l", (8.43, y1 - y0, 0.04), (-0.072 - 8.43 / 2, (y0 + y1) / 2, -0.02), M["concrete"])
    box("lane_floor_r", (8.43, y1 - y0, 0.04), (0.072 + 8.43 / 2, (y0 + y1) / 2, -0.02), M["concrete"])
    # the centre drain: a slot grate along the lane
    g = bmesh.new()
    for i in range(int((y1 - y0) / 0.035)):
        y = y0 + 0.2 + i * 0.035
        bmesh.ops.create_cube(g, size=1.0, matrix=Matrix.Translation((0, y, -0.004)) @ Matrix.Diagonal((0.12, 0.012, 0.01, 1)))
    mesh_obj("drain_grate", g, M["steel"], smooth=False)
    box("drain_frame_l", (0.012, y1 - y0, 0.006), (-0.066, (y0 + y1) / 2, -0.001), M["steel_bare"])
    box("drain_frame_r", (0.012, y1 - y0, 0.006), (0.066, (y0 + y1) / 2, -0.001), M["steel_bare"])
    box("drain_void", (0.15, y1 - y0, 0.004), (0, (y0 + y1) / 2, -0.03), sk.mat("drain black", (0.005, 0.005, 0.005), 0.9))
    # the market hall: dark side volumes beyond the stall backs, a far wall, a near wall behind the camera
    box("hall_far_wall", (18.0, 0.3, 7.0), (0, 27.6, 3.5), M["wall_dark"])
    box("hall_near_wall", (18.0, 0.3, 7.0), (0, -10.2, 3.5), M["wall_dark"])
    return f


def roof():
    """Trusses every 6 m at 6.2-7.0 m, the roof sheet over them, a skylight strip along the ridge (night glow)."""
    st = M["roof_steel"]
    for k, y in enumerate(range(-6, 28, 6)):
        bm = bmesh.new()
        for z in (6.2, 7.0):
            bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, y, z)) @ Matrix.Diagonal((18.0, 0.12, 0.1, 1)))
        for i in range(-9, 10):
            x = i * 1.0
            tube_between(bm, (x, y, 6.2), (x, y, 7.0), 0.02, 6)
            if i < 9:
                tube_between(bm, (x, y, 6.2) if i % 2 else (x, y, 7.0), (x + 1.0, y, 7.0) if i % 2 else (x + 1.0, y, 6.2), 0.018, 6)
        mesh_obj(f"truss_{k}", bm, st)
    for x in (-6, -3, 0, 3, 6):
        box(f"purlin_{x}", (0.08, 36.0, 0.14), (x + 0.9, 9.0, 7.12), st)
    box("roof_sheet", (18.0, 38.0, 0.05), (0, 9.0, 7.25), M["galv_dark"])
    for i, y in enumerate(range(-8, 27, 3)):
        sl = box(f"skylight_{i}", (1.1, 2.7, 0.01), (0, y + 1.5, 7.21), M["sky"])
        sl.visible_shadow = False


# ---------------------------------------------------------------- stalls
def grid_panel(name, origin, u, n, length, z0, z1, pitch=0.1, r=0.0022):
    """A welded wire-grid panel on a wall: verticals and horizontals, 4.4 mm wire, standing 25 mm off the wall."""
    bm = bmesh.new()
    u, n = Vector(u), Vector(n)
    base = Vector(origin) + n * 0.025
    for i in range(int(length / pitch) + 1):
        p = base + u * (0.02 + i * pitch)
        tube_between(bm, p + Vector((0, 0, z0)), p + Vector((0, 0, z1)), r, 6)
    for j in range(int((z1 - z0) / pitch) + 1):
        z = z0 + j * pitch
        tube_between(bm, base + n * 0.0045 + Vector((0, 0, z)), base + n * 0.0045 + u * (length - 0.0) + Vector((0, 0, z)), r, 6)
    return mesh_obj(name, bm, M["wire"])


_HOOK = {}


def hook_mesh():
    """A peg hook: 140 mm arm along +Y with an upturned tip, a small bracket at its root."""
    if "me" in _HOOK:
        return _HOOK["me"]
    bm = bmesh.new()
    tube_between(bm, (0, 0.0, 0), (0, 0.14, 0), 0.0025, 8)
    tube_between(bm, (0, 0.14, 0), (0, 0.155, 0.018), 0.0025, 8)
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, 0.003, 0.012)) @ Matrix.Diagonal((0.02, 0.004, 0.035, 1)))
    me = bpy.data.meshes.new("peg_hook")
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(M["chrome_hook"])
    _HOOK["me"] = me
    return me


_TAG = {}


def tag_mesh():
    """A blank swing tag (card 34 x 52 mm, nothing printed): its string knotted at the handle (origin), running out
    and down over the bag's top edge, the card hanging against the bag's face (local -Y)."""
    if "me" in _TAG:
        return _TAG["me"]
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, -0.082, -0.118)) @ Matrix.Rotation(0.12, 4, "X")
                          @ Matrix.Diagonal((0.034, 0.0006, 0.052, 1)))
    me = bpy.data.meshes.new("blank_tag")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(M["tag"])
    bm = bmesh.new()
    tube_between(bm, (0, 0, 0), (0.0, -0.05, -0.045), 0.0006, 4)
    tube_between(bm, (0.0, -0.05, -0.045), (0.0, -0.08, -0.09), 0.0006, 4)
    ms = bpy.data.meshes.new("tag_string")
    bm.to_mesh(ms)
    bm.free()
    ms.materials.append(M["string"])
    _TAG["me"], _TAG["string"] = me, ms
    return me


def roller_shutter(name, side, y0, y1, z_bottom, m):
    """A roller shutter curtain just behind the stall front, from z_bottom up to the ceiling, with its bottom bar."""
    xf = side * (LANE + 0.06)
    h = CEIL - z_bottom
    if h > 0.05:
        sh = corrugated(name, y1 - y0 - 0.1, h, m, pitch=0.078, amp=0.007, thick=0.0012)
        sh.matrix_world = frame_matrix(Vector((xf, (y0 + y1) / 2, z_bottom + h / 2)), Vector((0, 1, 0)), Vector((0, 0, 1)),
                                       Vector((1, 0, 0)))
    span_box(name + "_bar", xf - 0.02, xf + 0.02, y0 + 0.05, y1 - 0.05, z_bottom, z_bottom + 0.05, M["steel_bare"], bevel=0.004)
    if z_bottom < 0.3:   # a padlock hasp at the foot
        box(name + "_hasp", (0.03, 0.06, 0.04), (xf - side * 0.025, (y0 + y1) / 2 + 0.4, 0.07), M["steel_bare"], bevel=0.003)


def awning(name, side, y0, y1):
    """Galvanised corrugated sheet from the fascia top sloping out over the lane, ribs running down the slope,
    a folded drip edge along its lip, two angle brackets."""
    x_in, x_out = side * LANE, side * AW_OUT
    z_in, z_out = AW_IN
    a = Vector((x_in, 0, z_in))
    b = Vector((x_out, 0, z_out))
    L = (b - a).length
    u = (b - a).normalized()
    u = Vector((u.x, 0, u.z))
    v = Vector((0, 1, 0))
    w = u.cross(v)
    if w.z < 0:
        v = -v
        w = u.cross(v)
    sh = corrugated(name, L + 0.04, y1 - y0 + 0.04, M["galv"], pitch=0.076, amp=0.009)
    mid = (a + b) / 2
    sh.matrix_world = frame_matrix(Vector((mid.x, (y0 + y1) / 2, mid.z)), u, v, w)
    box(name + "_drip", (0.03, y1 - y0 + 0.04, 0.025), (x_out, (y0 + y1) / 2, z_out - 0.012), M["galv_dark"], bevel=0.002)
    for yb in (y0 + 0.15, y1 - 0.15):
        bm = bmesh.new()
        tube_between(bm, (side * LANE, yb, z_in - 0.03), (side * (LANE - 0.55), yb, z_in - 0.03 - 0.55 * 0.265), 0.008, 6)
        tube_between(bm, (side * LANE, yb, z_in - 0.42), (side * (LANE - 0.5), yb, z_in - 0.03 - 0.5 * 0.265), 0.008, 6)
        mesh_obj(f"{name}_bracket_{yb:.1f}", bm, M["steel"])
    return sh


def batten(name, x, ya, yb, z, state, along="Y", energy=80.0, hang_to=None):
    """A bare fluorescent batten: a steel channel with the tube under it, hung on two cables. state: on, dim, off."""
    L = abs(yb - ya)
    c = Vector((x, (ya + yb) / 2, z)) if along == "Y" else Vector(((ya + yb) / 2, x, z))
    size = (0.05, L, 0.035) if along == "Y" else (L, 0.05, 0.035)
    box(name + "_body", size, (c.x, c.y, c.z + 0.02), M["batten"], bevel=0.004)
    rot = (math.pi / 2, 0, 0) if along == "Y" else (0, math.pi / 2, 0)
    tm = {"on": M["tube_on"], "dim": M["tube_dim"]}.get(state, M["diffuser_off"])
    t = sk.cyl(name + "_tube", 0.0135, L - 0.08, (c.x, c.y, c.z - 0.012), tm, rot=rot, verts=16)
    for s in (-1, 1):
        cap = c + (Vector((0, s * (L / 2 - 0.03), -0.008)) if along == "Y" else Vector((s * (L / 2 - 0.03), 0, -0.008)))
        box(f"{name}_cap{s}", (0.03, 0.025, 0.03) if along == "Y" else (0.025, 0.03, 0.03), cap, M["batten"], bevel=0.003)
    if hang_to is not None:
        for s in (-0.35, 0.35):
            p = c + (Vector((0, s * L, 0.04)) if along == "Y" else Vector((s * L, 0, 0.04)))
            curve(f"{name}_hanger{s}", [tuple(p), (p.x, p.y, hang_to)], 0.0015, M["steel_bare"])
    if state in ("on", "dim"):
        li = sk.area_light(name + "_light", (c.x, c.y, c.z - 0.03), (0.05, L - 0.1) if along == "Y" else (L - 0.1, 0.05),
                           energy, (0.84, 0.93, 1.0), spread_deg=150)
        li.visible_camera = False
        LIGHTS[name] = li
    return t


def bulb(name, loc, energy):
    """A bare warm bulb on its flex: the one warm practical, in a far stall."""
    x, y, z = loc
    sk.sphere(name + "_glass", 0.03, loc, M["tube_warm"], segs=16)
    sk.cyl(name + "_holder", 0.016, 0.05, (x, y, z + 0.045), M["steel"])
    curve(name + "_flex", [(x, y, z + 0.07), (x, y, CEIL)], 0.0025, M["cable"])
    li = bpy.data.lights.new(name + "_light", "POINT")
    li.energy, li.color, li.shadow_soft_size = energy, (1.0, 0.74, 0.46), 0.03
    lo = bpy.data.objects.new(name + "_light", li)
    bpy.context.scene.collection.objects.link(lo)
    lo.location = (x, y, z)
    LIGHTS[name] = lo


def stall(side, y0, y1, state, k):
    """One stall box: partitions, posts and shutter guides, back wall, ceiling, top, fascia, awning, floor, shutter."""
    xf, xb = side * LANE, side * (LANE + DEPTH)
    nm = f"stall_{'R' if side > 0 else 'L'}{k}"
    hero = state == "hero"
    # floor tiles
    span_box(nm + "_floor", xf, xb, y0, y1, -0.002, 0.006, M["tiles"])
    # partitions at y0 (the hero's alley side only at the back half: its corner is open) and at y1
    ends = (ALLEY[0], spans()[-1][1])
    for yy, tag in ((y0, "a"), (y1, "b")):
        if tag == "b" and not any(abs(y1 - e) < 1e-6 for e in ends):
            # the next stall builds this partition; only its shutter guides belong to this stall
            gy = yy - 0.075
            if state != "hero":
                for dx in (0.03, 0.09):
                    span_box(f"{nm}_guide_{tag}{dx}", xf + side * dx - 0.004, xf + side * dx + 0.004, gy - 0.025, gy + 0.025,
                             0.0, CEIL, M["steel_bare"])
            continue
        xa = side * 2.45 if (hero and tag == "a") else xf
        span_box(f"{nm}_part_{tag}", xa, xb, yy - 0.04, yy + 0.04, 0.0, TOPZ, M["wall_dark"], bevel=0.004)
        # the steel post and shutter guides at the front of each partition
        span_box(f"{nm}_post_{tag}", xf - 0.05, xf + 0.05, yy - 0.05, yy + 0.05, 0.0, TOPZ, M["steel"], bevel=0.006)
        if state != "hero" or tag == "b":
            gy = yy + (0.075 if tag == "a" else -0.075)
            for dx in (0.03, 0.09):
                span_box(f"{nm}_guide_{tag}{dx}", xf + side * dx - 0.004, xf + side * dx + 0.004, gy - 0.025, gy + 0.025,
                         0.0, CEIL, M["steel_bare"])
    if hero:   # the open corner's guide and post
        span_box(f"{nm}_post_corner", xf - 0.05, xf + 0.05, y0 - 0.05, y0 + 0.05, 0.0, TOPZ, M["steel"], bevel=0.006)
    span_box(nm + "_back", xb - side * 0.05, xb + side * 0.05, y0, y1, 0.0, TOPZ, M["wall"] if state in ("hero", "dim", "warm") else M["wall_dark"])
    span_box(nm + "_ceiling", xf, xb, y0, y1, CEIL, CEIL + 0.02, M["ceiling"])
    span_box(nm + "_top", xf, xb, y0, y1, TOPZ - 0.02, TOPZ, M["roof_steel"])
    fm = M["fascia"] if k % 2 else M["fascia_b"]
    span_box(nm + "_fascia", xf - side * 0.0, xf + side * 0.03, y0 + 0.05, y1 - 0.05, CEIL - 0.02, TOPZ, fm, bevel=0.005)
    # the shutter box behind the fascia's lip, its rolled curtain showing as a rounded drum below the ceiling line
    sk.cyl(nm + "_drum", 0.11, y1 - y0 - 0.12, (xf + side * 0.16, (y0 + y1) / 2, CEIL - 0.08),
           M["shutter_a"], rot=(math.pi / 2, 0, 0), verts=24)
    awning(nm + "_awning", side, y0, y1)
    shm = [M["shutter_a"], M["shutter_b"], M["shutter_c"]][k % 3]
    if state in ("closed",):
        roller_shutter(nm + "_shutter", side, y0, y1, 0.0, shm)
    elif state == "half":
        roller_shutter(nm + "_shutter", side, y0, y1, 1.15, shm)
    else:
        span_box(nm + "_shutter_bar", side * (LANE + 0.04), side * (LANE + 0.08), y0 + 0.05, y1 - 0.05, CEIL - 0.24, CEIL - 0.19,
                 M["steel_bare"], bevel=0.004)
    # the batten under the awning, over the lane
    lane_state = {"hero": "on", "dim": "off", "warm": "off"}.get(state, "off")
    batten(nm + "_lane", side * 0.88, (y0 + y1) / 2 - 0.6, (y0 + y1) / 2 + 0.6, 2.86, lane_state, energy=95.0,
           hang_to=AW_IN[0] - (LANE - 0.88) / (LANE - AW_OUT) * (AW_IN[0] - AW_IN[1]) - 0.01)
    return nm


# ---------------------------------------------------------------- handbags
BAGS = {  # model: (size, axis, median luminance of its texture, base scale)
    "handbag-tote": (0.35, 0.13),
    "handbag-satchel": (0.30, 0.0066),
    "handbag-shoulder": (0.32, 0.033),
}
# leathers (linear rgb, before the grade): cognac, tan, chocolate, oxblood, burgundy, black, charcoal, taupe, navy,
# olive, bone, mustard, bottle green, dusty rose, slate
LEATHER = [(0.30, 0.13, 0.05), (0.38, 0.24, 0.13), (0.09, 0.05, 0.03), (0.17, 0.035, 0.03), (0.2, 0.03, 0.05),
           (0.018, 0.018, 0.02), (0.06, 0.06, 0.065), (0.22, 0.19, 0.16), (0.03, 0.045, 0.09), (0.12, 0.12, 0.06),
           (0.5, 0.46, 0.4), (0.36, 0.25, 0.07), (0.03, 0.08, 0.05), (0.36, 0.2, 0.19), (0.13, 0.15, 0.17)]
_SRC = {}


def load_bag_sources():
    """Each handbag model once (out of sight), its material made to take colour from the object."""
    for name, (size, median) in BAGS.items():
        h = props.load(name, size=size, axis="long", loc=(0, 0, -20), sat=1.0, val=1.0)
        meshes = [o for o in h.children_recursive if o.type == "MESH"]
        bpy.context.view_layer.update()
        ob = meshes[0]
        rel = h.matrix_world.inverted() @ ob.matrix_world
        k = h.scale[0]
        for s in ob.material_slots:
            if s.material:
                mt.recolour(s.material, median, spec=0.38, rough_add=0.12)
        pts = [rel @ Vector(c) for c in ob.bound_box]
        lo = Vector([min(p[i] for p in pts) for i in range(3)])
        hi = Vector([max(p[i] for p in pts) for i in range(3)])
        # the handle apex: the topmost vertices' centre, in holder-local (unscaled) space
        vs = [rel @ v.co for v in ob.data.vertices]
        zt = max(v.z for v in vs)
        top = [v for v in vs if v.z > zt - 0.01 / k]
        apex = sum(top, Vector()) / len(top)
        _SRC[name] = dict(mesh=ob.data, rel=rel, k=k, lo=lo, hi=hi, apex=apex)
        for o in [h] + list(h.children_recursive):
            o.hide_render = True
            o.hide_viewport = True
    return _SRC


def place_bag(name, model, M4, colour):
    """A linked copy of a handbag at placement M4 (applied to the model in metres), in leather `colour`
    (index into LEATHER, or an explicit dict of lm_* values)."""
    src = _SRC[model]
    ob = bpy.data.objects.new(name, src["mesh"])
    bpy.context.scene.collection.objects.link(ob)
    ob.matrix_world = M4 @ Matrix.Scale(src["k"], 4) @ src["rel"]
    if isinstance(colour, dict):
        for kk, v in colour.items():
            ob[kk] = v
    else:
        ob["lm_tint"] = LEATHER[colour]
        ob["lm_tf"] = 1.0
        ob["lm_hue"], ob["lm_sat"], ob["lm_val"] = 0.0, 1.0, 1.0
    return ob


def bag_dims(model, s=1.0):
    src = _SRC[model]
    k = src["k"] * s
    return (src["hi"] - src["lo"]) * k, src["apex"] * k


class Palette:
    """Colours and models for a wall so no two neighbours (left, right, above) match."""

    def __init__(self, seed):
        self.r = random.Random(seed)
        self.rows = {}

    def pick(self, row, col):
        prev = self.rows.get((row, col - 1))
        above = self.rows.get((row - 1, col)) or self.rows.get((row - 1, col + 1))
        for _ in range(50):
            m = self.r.choice(list(BAGS))
            c = self.r.randrange(len(LEATHER))
            if prev and (c == prev[1] or m == prev[0] and self.r.random() < 0.6):
                continue
            if above and c == above[1]:
                continue
            break
        self.rows[(row, col)] = (m, c)
        return m, c


def hang_wall(name, origin, u, n, length, rows, seed, tags=0.0, hook=True):
    """Hang handbags on peg hooks along a wall: origin (world, wall surface at z = 0), u along the wall, n out of it.
    rows: hook heights. Bags face n (their broad side out), spaced by their width; each row starts half a bag in."""
    u, n = Vector(u).normalized(), Vector(n).normalized()
    yaw = math.atan2(n.y, n.x) + math.pi / 2          # the model's -Y face turned to look along n
    hyaw = math.atan2(n.y, n.x) - math.pi / 2         # the hook mesh's +Y turned to run along n
    pal = Palette(seed)
    rr = random.Random(seed + 1)
    out = []
    hme = hook_mesh()
    tme = tag_mesh() if tags else None
    for ri, z in enumerate(rows):
        s0 = 0.06 + (0.12 if ri % 2 else 0.0)
        ci = 0
        while True:
            model, col = pal.pick(ri, ci)
            sc = rr.uniform(0.92, 1.08)
            d, apex = bag_dims(model, sc)
            w = d.x
            if s0 + w > length - 0.03:
                break
            c = Vector(origin) + u * (s0 + w / 2)
            tip = c + n * 0.15 + Vector((0, 0, z))
            if hook:
                ho = bpy.data.objects.new(f"{name}_hook{ri}_{ci}", hme)
                bpy.context.scene.collection.objects.link(ho)
                ho.matrix_world = Matrix.Translation(c + n * 0.025 + Vector((0, 0, z))) @ Matrix.Rotation(hyaw, 4, "Z")
            flip = math.pi if (model != "handbag-tote" and rr.random() < 0.4) else 0.0
            if model == "handbag-tote":
                flip = math.pi        # the tote's clean face out (its dented face to the wall)
            tilt = math.radians(rr.uniform(2, 4.5))
            R = Matrix.Rotation(yaw + flip, 4, "Z")
            # turn about the wall-parallel axis so the bottom swings in toward the grid (hung, resting on the wall)
            Rt = Matrix.Rotation(tilt, 4, Vector((0, 0, 1)).cross(n))
            off = (R @ apex.to_4d()).to_3d()          # apex is already scaled by sc
            M4 = Matrix.Translation(tip + Vector((0, 0, 0.004))) @ Rt @ Matrix.Translation(-off) @ R @ Matrix.Scale(sc, 4)
            ob = place_bag(f"{name}_bag{ri}_{ci}", model, M4, col)
            out.append(ob)
            if tme is not None and rr.random() < tags:
                t = bpy.data.objects.new(f"{name}_tag{ri}_{ci}", tme)
                bpy.context.scene.collection.objects.link(t)
                side = rr.choice((-1, 1)) * rr.uniform(0.015, 0.04)
                t.matrix_world = (Matrix.Translation(tip + u * side + Vector((0, 0, 0.002)))
                                  @ Matrix.Rotation(yaw + rr.uniform(-0.25, 0.25), 4, "Z"))
                st = bpy.data.objects.new(f"{name}_tagstring{ri}_{ci}", _TAG["string"])
                bpy.context.scene.collection.objects.link(st)
                st.matrix_world = t.matrix_world
            s0 += w + rr.uniform(0.03, 0.07)
            ci += 1
    return out


def shelf_bags(name, origin, u, n, length, z, seed, depth=0.36):
    """A plywood shelf on two brackets with bags standing on it, facing out."""
    u, n = Vector(u).normalized(), Vector(n).normalized()
    c = Vector(origin) + u * (length / 2) + n * (depth / 2 + 0.03) + Vector((0, 0, z - 0.012))
    yaw_s = math.atan2(u.y, u.x)
    box(name + "_board", (length, depth, 0.024), tuple(c), M["ply"], bevel=0.003, rot=(0, 0, yaw_s))
    for t in (0.1, length - 0.1):
        p = Vector(origin) + u * t + n * (depth / 2 + 0.03) + Vector((0, 0, z - 0.06))
        box(f"{name}_bracket{t:.1f}", (0.02, depth, 0.07), tuple(p), M["steel"], rot=(0, 0, yaw_s))
    yaw = math.atan2(n.y, n.x) + math.pi / 2
    pal = Palette(seed)
    rr = random.Random(seed + 3)
    s0, ci = 0.05, 0
    while True:
        model, col = pal.pick(0, ci)
        sc = rr.uniform(0.95, 1.05)
        d, _ = bag_dims(model, sc)
        if s0 + d.x > length - 0.03:
            break
        p = Vector(origin) + u * (s0 + d.x / 2) + n * (depth / 2 + 0.03 + rr.uniform(-0.03, 0.03)) + Vector((0, 0, z))
        flip = math.pi if model == "handbag-tote" else (math.pi if rr.random() < 0.3 else 0.0)
        M4 = Matrix.Translation(p) @ Matrix.Rotation(yaw + flip + math.radians(rr.uniform(-6, 6)), 4, "Z") @ Matrix.Scale(sc, 4)
        place_bag(f"{name}_bag{ci}", model, M4, col)
        s0 += d.x + rr.uniform(0.02, 0.06)
        ci += 1


# ---------------------------------------------------------------- crates
_CRATE = {}


def crate_mesh():
    """A 600 x 400 x 280 mm stacking crate: slotted sides and ends, ribbed rim, solid floor; real geometry."""
    if "me" in _CRATE:
        return _CRATE["me"]
    W, D, H = 0.6, 0.4, 0.28
    bm = bmesh.new()

    def panel(o, ua, va, lu, lv, slots_u, slot_v=(0.06, 0.2)):
        # a grid of cells: solid except slot cells (vertical slots between ribs)
        us = [0.0]
        n = slots_u
        rib, slot = 0.022, (lu - 0.06 - (n - 1) * 0.022) / n
        t = 0.03
        us.append(t)
        for i in range(n):
            t += slot
            us.append(t)
            if i < n - 1:
                t += rib
                us.append(t)
        us.append(lu)
        vs = [0.0, slot_v[0], slot_v[1], lv]
        V = [[bm.verts.new(Vector(o) + Vector(ua) * a + Vector(va) * b) for b in vs] for a in us]
        for i in range(len(us) - 1):
            for j in range(len(vs) - 1):
                is_slot = j == 1 and i % 2 == 1 and 0 < i < len(us) - 2
                if not is_slot:
                    bm.faces.new((V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1]))

    hw, hd = W / 2, D / 2
    panel((-hw, -hd, 0), (1, 0, 0), (0, 0, 1), W, H, 9)       # front
    panel((hw, hd, 0), (-1, 0, 0), (0, 0, 1), W, H, 9)        # back
    panel((hw, -hd, 0), (0, 1, 0), (0, 0, 1), D, H, 6)        # ends
    panel((-hw, hd, 0), (0, -1, 0), (0, 0, 1), D, H, 6)
    f = [bm.verts.new(p) for p in ((-hw, -hd, 0.004), (hw, -hd, 0.004), (hw, hd, 0.004), (-hw, hd, 0.004))]
    bm.faces.new(f)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # the rim: a thick lip round the top
    for (a, b) in (((-hw, -hd), (hw, -hd)), ((hw, -hd), (hw, hd)), ((hw, hd), (-hw, hd)), ((-hw, hd), (-hw, -hd))):
        ca = Vector((*a, H - 0.012))
        cb = Vector((*b, H - 0.012))
        d = cb - ca
        L = d.length
        q = Matrix.Rotation(math.atan2(d.y, d.x), 4, "Z")
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((ca + cb) / 2) @ q @ Matrix.Diagonal((L + 0.02, 0.022, 0.024, 1)))
    me = bpy.data.meshes.new("crate")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(M["crate"])
    _CRATE["me"] = me
    return me


def crate(name, loc, turn_deg, colour):
    ob = bpy.data.objects.new(name, crate_mesh())
    bpy.context.scene.collection.objects.link(ob)
    ob.location, ob.rotation_euler = loc, (0, 0, math.radians(turn_deg))
    ob["lm_col"] = colour
    so = ob.modifiers.new("wall", "SOLIDIFY")
    so.thickness, so.offset = 0.006, -1.0
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = 0.0015, 2, "ANGLE"
    return ob


CRATE_COLS = [(0.06, 0.1, 0.16), (0.12, 0.12, 0.12), (0.18, 0.05, 0.04), (0.05, 0.1, 0.07), (0.2, 0.18, 0.12),
              (0.03, 0.03, 0.035)]


def crate_stack(name, x, y, turn, n, seed):
    rr = random.Random(seed)
    z = 0.0
    for i in range(n):
        crate(f"{name}_{i}", (x + rr.uniform(-0.02, 0.02), y + rr.uniform(-0.02, 0.02), z), turn + rr.uniform(-5, 5),
              CRATE_COLS[rr.randrange(len(CRATE_COLS))])
        z += 0.268


# ---------------------------------------------------------------- the hero stall
def hero_stall():
    y0, y1 = HERO
    xb = LANE + DEPTH
    # wire-grid display walls: the back wall, both side walls (the alley side only where the partition stands)
    walls = [
        ("back", Vector((xb - 0.05, y0 + 0.06, 0)), Vector((0, 1, 0)), Vector((-1, 0, 0)), y1 - y0 - 0.12),
        ("side_far", Vector((LANE + 0.12, y1 - 0.04, 0)), Vector((1, 0, 0)), Vector((0, -1, 0)), xb - LANE - 0.2),
        ("side_near", Vector((2.5, y0 + 0.04, 0)), Vector((1, 0, 0)), Vector((0, 1, 0)), xb - 2.5 - 0.1),
    ]
    rows_hi = [2.62, 2.18, 1.74]
    for i, (nm, o, u, n, L) in enumerate(walls):
        grid_panel(f"hero_grid_{nm}", o, u, n, L, 0.15 if nm != "back" else 0.9, 2.72)
        rows = rows_hi + ([1.30] if nm != "back" else [])
        hang_wall(f"hero_{nm}", o, u, n, L, rows, seed=11 + i * 7, tags=0.7)
    # the back wall's lower part: two shelves of standing bags
    o, u, n = walls[0][1], walls[0][2], walls[0][3]
    shelf_bags("hero_shelf_hi", o, u, n, y1 - y0 - 0.12, 0.86, 41)
    shelf_bags("hero_shelf_lo", o, u, n, y1 - y0 - 0.12, 0.42, 43)
    # the alley face of the near partition: an outside display
    hang_wall("hero_out", Vector((2.5, y0 - 0.04, 0)), Vector((1, 0, 0)), Vector((0, -1, 0)), xb - 2.5 - 0.1,
              [2.55, 2.1, 1.65], seed=61, tags=0.5)
    grid_panel("hero_grid_out", Vector((2.5, y0 - 0.04, 0)), Vector((1, 0, 0)), Vector((0, -1, 0)), xb - 2.5 - 0.1, 1.2, 2.7)
    # the front rail over the counter: a steel pipe under the fascia with a row of bags facing the lane
    ry0, ry1 = COUNTER["y0"] + 0.05, HERO[1] - 0.12
    RX, RZ = LANE - 0.1, 2.56
    sk.cyl("hero_rail", 0.012, ry1 - ry0 + 0.1, (RX, (ry0 + ry1) / 2, RZ), M["steel_bare"], rot=(math.pi / 2, 0, 0), verts=12)
    for yy in (ry0, ry1):   # hung from the awning brackets on two drop rods
        sk.cyl(f"hero_rail_drop{yy:.1f}", 0.007, 0.42, (RX, yy, RZ + 0.21), M["steel_bare"], verts=8)
    hang_wall("hero_front", Vector((RX + 0.15, ry0, 0)), Vector((0, 1, 0)), Vector((-1, 0, 0)), ry1 - ry0,
              [RZ + 0.008], seed=71, tags=0.6, hook=False)
    # a column of bags on hooks on the far front post, facing down the lane
    hang_wall("hero_post", Vector((1.04, y1 - 0.05, 0)), Vector((1, 0, 0)), Vector((0, -1, 0)), 0.4, [1.98, 1.52],
              seed=81, tags=0.5)
    counter()
    # lights: two battens on the stall ceiling (over the counter and the stallholder; over the back wall), one under
    # the alley-side eave over the outside display
    batten("hero_ceil_a", 2.05, y0 + 0.45, y1 - 0.45, CEIL - 0.06, "on", energy=55.0, hang_to=CEIL)
    batten("hero_ceil_b", 3.05, y0 + 0.45, y1 - 0.45, CEIL - 0.06, "on", energy=48.0, hang_to=CEIL)
    batten("hero_alley", y0 - 0.32, 2.5, 3.5, 2.86, "on", along="X", energy=22.0, hang_to=TOPZ)
    span_box("hero_alley_eave", 2.45, xb, y0 - 0.5, y0, TOPZ - 0.04, TOPZ, M["galv_dark"])
    # the floor of the stall: two crates of stock by the back corner, a stool for the stallholder
    crate_stack("hero_crates", 2.75, y0 + 0.32, 0, 2, 5)
    stool()
    # cables: the ceiling battens' leads to a junction box on the front post, a lead down the post to the counter
    jb = box("hero_junction", (0.08, 0.12, 0.16), (LANE + 0.09, y1 - 0.12, 2.45), sk.mat("junction grey", (0.25, 0.25, 0.24), 0.5), bevel=0.006)
    bundle("hero_lead_a", (2.05, y1 - 0.45, CEIL - 0.03), (LANE + 0.1, y1 - 0.12, 2.53), 0.05, 2, 0.01)
    bundle("hero_lead_b", (3.05, y1 - 0.45, CEIL - 0.03), (LANE + 0.1, y1 - 0.14, 2.5), 0.08, 2, 0.01)
    curve("hero_drop", [(LANE + 0.13, y1 - 0.12, 2.37), (LANE + 0.14, y1 - 0.13, 1.4), (LANE + 0.16, y1 - 0.2, 0.05),
                        (LANE + 0.3, y1 - 0.4, 0.008), (COUNTER["x0"] + 0.1, COUNTER["y1"] + 0.02, 0.008)], 0.004, M["cable"])
    return jb


def counter():
    c = COUNTER
    x0, x1, y0, y1, top = c["x0"], c["x1"], c["y0"], c["y1"], c["top"]
    span_box("counter_body", x0 + 0.02, x1, y0 + 0.02, y1 - 0.02, 0.06, top - 0.035, M["counter_front"], bevel=0.006)
    span_box("counter_kick", x0 + 0.06, x1 - 0.02, y0 + 0.06, y1 - 0.06, 0.0, 0.06, M["steel"])
    span_box("counter_top", x0 - 0.02, x1 + 0.02, y0 - 0.02, y1 + 0.02, top - 0.035, top, M["counter_top"], bevel=0.005)
    # a steel edge band along the lane face, scuffed by bags
    span_box("counter_band", x0 - 0.024, x0 - 0.018, y0, y1, top - 0.05, top - 0.004, M["steel_bare"])
    # on top, away from the bag: a roll of tape, a stack of folded black carrier bags, a bundle of blank tags
    sk.cyl("counter_tape", 0.048, 0.048, (x0 + 0.2, y1 - 0.13, top + 0.024), M["tape"], verts=32)
    sk.cyl("counter_tape_core", 0.036, 0.05, (x0 + 0.2, y1 - 0.13, top + 0.025), sk.mat("tape core", (0.3, 0.26, 0.2), 0.8), verts=24)
    box("counter_carriers", (0.26, 0.19, 0.025), (x0 + 0.38, y0 + 0.16, top + 0.0125), M["poly_bag"], bevel=0.008, rot=(0, 0, 0.2))
    for i in range(5):
        box(f"counter_tag{i}", (0.034, 0.052, 0.0006), (x0 + 0.5 + i * 0.006, y1 - 0.14 + i * 0.004, top + 0.0004 + i * 0.0007),
            M["tag"], rot=(0, 0, 0.3 + i * 0.25))


def stool():
    x, y = 2.95, 5.6
    sk.cyl("stool_seat", 0.16, 0.035, (x, y, 0.52), sk.mat("stool plastic", (0.08, 0.12, 0.17), 0.45), verts=32)
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        bm = bmesh.new()
        tube_between(bm, (x + 0.1 * math.cos(a), y + 0.1 * math.sin(a), 0.5), (x + 0.17 * math.cos(a), y + 0.17 * math.sin(a), 0.0), 0.012, 8)
        mesh_obj(f"stool_leg{i}", bm, M["steel_bare"])


def dim_stall(side, y0, y1, warm, seed):
    """An open stall further down the lane, lit by one tube (or a warm bulb): its walls of bags just readable."""
    xf, xb = side * LANE, side * (LANE + DEPTH)
    walls = [(Vector((xb - side * 0.05, y0 + 0.06, 0)), Vector((0, 1, 0)), Vector((-side, 0, 0)), y1 - y0 - 0.12)]
    if side > 0:
        walls.append((Vector((LANE + 0.12, y1 - 0.04, 0)), Vector((1, 0, 0)), Vector((0, -1, 0)), DEPTH - 0.2))
    else:
        walls.append((Vector((-LANE - 0.12, y1 - 0.04, 0)), Vector((-1, 0, 0)), Vector((0, -1, 0)), DEPTH - 0.2))
    for i, (o, u, n, L) in enumerate(walls):
        grid_panel(f"dim{seed}_grid{i}", o, u, n, L, 0.6, 2.72)
        hang_wall(f"dim{seed}_w{i}", o, u, n, L, [2.6, 2.15, 1.7, 1.25], seed=seed + i, tags=0.0)
    if warm:
        bulb(f"dim{seed}_bulb", (side * (LANE + 1.1), (y0 + y1) / 2, 2.35), 9.0)
    else:
        batten(f"dim{seed}_ceil", side * (LANE + 1.2), y0 + 0.5, y1 - 0.5, CEIL - 0.06, "dim", energy=10.0, hang_to=CEIL)


def dark_stall(side, y0, y1, seed):
    """Open but unlit (across from the hero): bags on the back wall, caught only by the hero's spill."""
    xb = side * (LANE + DEPTH)
    o, u, n = Vector((xb - side * 0.05, y0 + 0.06, 0)), Vector((0, 1, 0)), Vector((-side, 0, 0))
    grid_panel(f"dark{seed}_grid", o, u, n, y1 - y0 - 0.12, 0.6, 2.72)
    hang_wall(f"dark{seed}_w", o, u, n, y1 - y0 - 0.12, [2.6, 2.15, 1.7, 1.25], seed=seed, tags=0.0)


# ---------------------------------------------------------------- far end, crates, cables, haze
def far_end():
    """The cross aisle at the end of the lane: a high-bay lamp burning over it, closed shutters on the far wall."""
    for i, x in enumerate((-5.4, -2.7, 0.0, 2.7, 5.4)):
        roller_shutter_far(f"far_shutter{i}", x)
    x, y, z = 0.0, 25.2, 5.6
    sk.cyl("highbay_shade", 0.22, 0.18, (x, y, z + 0.08), M["batten"], verts=32, r2=0.08)
    sk.cyl("highbay_lens", 0.2, 0.01, (x, y, z - 0.015), mt.glow("highbay lens", (0.8, 0.9, 1.0), 25.0), verts=32)
    curve("highbay_chain", [(x, y, z + 0.17), (x, y, 7.0)], 0.004, M["steel_bare"])
    li = bpy.data.lights.new("highbay_light", "SPOT")
    li.energy, li.color, li.spot_size, li.spot_blend, li.shadow_soft_size = 500.0, (0.78, 0.88, 1.0), math.radians(95), 0.6, 0.15
    lo = bpy.data.objects.new("highbay_light", li)
    bpy.context.scene.collection.objects.link(lo)
    lo.location = (x, y, z - 0.03)
    LIGHTS["highbay"] = lo


def roller_shutter_far(name, x):
    sh = corrugated(name, 2.5, 3.0, M["shutter_a"], pitch=0.078, amp=0.007, thick=0.0012)
    sh.matrix_world = frame_matrix(Vector((x, 27.4, 1.5)), Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, -1, 0)))
    box(name + "_box", (2.6, 0.3, 0.35), (x, 27.3, 3.18), M["fascia"], bevel=0.005)


def dressing():
    """Crates at the stall fronts, cables along the awnings and across the lane, a coiled lead on a post."""
    crate_stack("crates_a", -LANE + 0.24, -3.9, 90, 3, 21)
    crate_stack("crates_b", -LANE + 0.26, -3.25, 84, 2, 22)
    crate_stack("crates_c", LANE - 0.24, 2.1, 90, 2, 23)
    crate_stack("crates_d", -LANE + 0.24, 8.1, 92, 1, 24)
    crate_stack("crates_e", LANE - 0.25, 13.6, 88, 3, 25)
    crate_stack("crates_f", 3.2, 3.55, 0, 2, 26)          # in the alley, under the hero stall's outside display
    crate("crate_loose", (-LANE + 0.35, 1.4, 0.0), 30, CRATE_COLS[0])
    # the runs along both rows under the awnings, sagging between the posts
    for side in (1, -1):
        x = side * (LANE - 0.06)
        for (y0, y1) in spans():
            bundle(f"run_{side}_{y0:.1f}", (x, y0 + 0.02, 2.98), (x, y1 - 0.02, 2.98), rng.uniform(0.08, 0.22), 3, 0.02)
    # cables across the lane, from one row's fascia to the other's, sagging into the light
    for i, y in enumerate((-3.0, 2.0, 7.4, 11.5, 16.0, 21.0)):
        bundle(f"cross_{i}", (-LANE + 0.02, y, 2.97), (LANE - 0.02, y + rng.uniform(-0.4, 0.4), 2.97), rng.uniform(0.2, 0.45),
               rng.choice((1, 2, 3)), 0.015)
    # a coil of spare cable hung on the post at the hero's far partition
    for i in range(5):
        r = 0.13 + 0.008 * i
        curve(f"coil_{i}", [(LANE + 0.065 + 0.006 * i, HERO[1] + 0.06 + 0.02 * math.cos(t), 1.92 - r * (1 - math.sin(t)))
                            for t in (j * 2 * math.pi / 24 for j in range(25))], 0.0045, M["cable"])


def haze(density=0.004):
    m = bpy.data.materials.new("haze")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    pv = nt.nodes.new("ShaderNodeVolumePrincipled")
    pv.inputs["Density"].default_value = density
    pv.inputs["Color"].default_value = (0.8, 0.86, 0.92, 1)
    nt.links.new(pv.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    ob = box("haze", (7.2, 37.0, 6.8), (0, 9.0, 3.42), m)
    ob.visible_shadow = False
    OBJ["haze"] = ob
    return ob


def build():
    M.clear()
    M.update(mt.materials())
    LIGHTS.clear()
    _HOOK.clear()
    _TAG.clear()
    _CRATE.clear()
    _SRC.clear()
    rng.seed(7)
    load_bag_sources()
    lane()
    roof()
    for side in (1, -1):
        for k, (y0, y1) in enumerate(spans()):
            st = STATE.get((side, round(y0, 2)), "closed")
            stall(side, y0, y1, st, k + (0 if side > 0 else 3))
            if st == "dim":
                dim_stall(side, y0, y1, False, 100 + k * 10 + (side > 0))
            elif st == "warm":
                dim_stall(side, y0, y1, True, 200 + k * 10 + (side > 0))
            elif st == "dark":
                dark_stall(side, y0, y1, 300 + k)
    hero_stall()
    far_end()
    dressing()
    haze()
