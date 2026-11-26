"""The family home in Chicago at night: the kitchen (Ch 02) and the dining room (Ch 10), built side by side as two
closed rooms so their lights never mix. Metres, Z up, floor at z = 0.

Kitchen  x 6.0 .. 10.8, y -2.4 .. 2.4, ceiling 2.6 (on the dining room's +X side: the dining room's street light
         comes in from -X and must find open night there). A counter run with a sink and a range under a double-hung
         window on the +Y wall (the night outside), shaker cabinets, subway tile; the round pedestal kitchen table in
         the middle with Dawn's chair on its +Y side.
Dining   x 1.0 .. 5.0, y -2.3 .. 2.3, ceiling 2.75. Wainscot, chair rail, crown; a pair of double-hung windows on the
         +Y wall with 2 in venetian blinds and a cast-iron radiator under them, and a third blinded window in the
         foot-end (-X) wall: a street light outside it runs the blind's stripes down the table onto the empty chair
         and throws the chair's striped shadow on the wall behind it. The dining table runs along X with six
         chairs: four along the sides and one at the foot pushed in, the father's at the head (+X) set back and a
         little turned. A pendant lamp (off) over the table, a sideboard on the -Y wall.

Every edge that catches light is bevelled; mouldings are real profiles extruded along the walls.
"""
import math

import bpy  # noqa: F401  (first)
import bmesh
from mathutils import Matrix, Vector

import home_mats as mt
import props
import setkit as sk

LIGHTS = {}
M = mt.M

# ---------------------------------------------------------------- room extents
K = dict(x0=6.0, x1=10.8, y0=-2.4, y1=2.4, h=2.6)
D = dict(x0=1.0, x1=5.0, y0=-2.3, y1=2.3, h=2.75)
WALL_T = 0.14

# kitchen
KT = (K["x0"] + 2.35, 0.0)                    # kitchen table centre (round pedestal, top at 0.76)
K_TOP = 0.76
K_WIN = dict(cx=K["x0"] + 2.4, w=0.92, z0=1.07, z1=2.13)
COUNTER_TOP = 0.91
COUNTER_D = 0.635

# dining
DT = (3.0, 0.0)                      # dining table centre, long axis X, 1.8 x 0.97, top at 0.753
D_TOP = 0.753
D_WIN = dict(cx=3.3, w=1.66, z0=0.78, z1=2.24, mullion=0.1)
D_END_WIN = dict(cy=1.25, w=1.2, z0=0.86, z1=2.24)   # in the foot-end (-X) wall: the street light's way in
                                                     # (a cottage sash: short lower sash, tall upper one)
HEAD_CHAIR = (4.42, 0.02, 180.0 + 6.0)   # the father's chair: set back from the head, turned a little
CHAIR_RAIL = 0.84


# ---------------------------------------------------------------- primitives
def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0), seg=3, parent=None):
    ob = sk.box(name, size, loc, m, bevel=bevel, rot=rot)
    if bevel:
        bv = ob.modifiers["bevel"]
        bv.segments = seg
        bv.limit_method = "ANGLE"
    if parent is not None:
        ob.parent = parent
    return ob


def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=32, r2=None, bevel=0.0):
    ob = sk.cyl(name, r, depth, loc, m, rot=rot, verts=verts, r2=r2)
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments, bv.limit_method = bevel, 3, "ANGLE"
        ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
    return ob


def _finish(ob, smooth_angle=35.0, subsurf=0):
    me = ob.data
    for p in me.polygons:
        p.use_smooth = True
    es = ob.modifiers.new("split", "EDGE_SPLIT")
    es.split_angle = math.radians(smooth_angle)
    if subsurf:
        ob.modifiers.new("sub", "SUBSURF").levels = subsurf
    return ob


def _link(name, bm, m):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if m is not None:
        ob.data.materials.append(m)
    return ob


def lathe(name, profile, loc, m, segs=48, smooth_angle=40.0, subsurf=0):
    """Spin a profile [(r, z)] (a polyline, open or closed) about the Z axis."""
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0.0, z)) for r, z in profile]
    es = [bm.edges.new((a, b)) for a, b in zip(vs, vs[1:])]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 0, 1), steps=segs, angle=2 * math.pi)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = _link(name, bm, m)
    ob.location = loc
    return _finish(ob, smooth_angle, subsurf)


def tube(name, pts, r, m, res=6, closed=False):
    """A round tube along a smooth path through `pts` (cords, a faucet, a handle)."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution = "3D", r, res
    cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for p, co in zip(sp.bezier_points, pts):
        p.co = co
        p.handle_left_type = p.handle_right_type = "AUTO"
    sp.use_cyclic_u = closed
    ob = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(m)
    return ob


def prism(name, pts2d, length, loc, m, axis="X", rot_z=0.0):
    """Extrude a closed 2D profile [(u, v)] along `axis` (profile in the plane across it: for X, u = y, v = z)."""
    bm = bmesh.new()
    rows = []
    for s in (-length / 2, length / 2):
        row = []
        for u, v in pts2d:
            co = {"X": (s, u, v), "Y": (u, s, v), "Z": (u, v, s)}[axis]
            row.append(bm.verts.new(co))
        rows.append(row)
    n = len(pts2d)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((rows[0][i], rows[0][j], rows[1][j], rows[1][i]))
    bm.faces.new(rows[0])
    bm.faces.new(list(reversed(rows[1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = _link(name, bm, m)
    ob.location = loc
    ob.rotation_euler = (0, 0, rot_z)
    return _finish(ob)


def run(name, a, b, n, profile, m):
    """A moulding: the closed profile [(d, z)] (d out from the wall face into the room along the unit normal n)
    extruded along the wall face from a to b (x, y)."""
    bm = bmesh.new()
    rows = []
    for (px, py) in (a, b):
        rows.append([bm.verts.new((px + n[0] * d, py + n[1] * d, z)) for d, z in profile])
    k = len(profile)
    for i in range(k):
        j = (i + 1) % k
        bm.faces.new((rows[0][i], rows[0][j], rows[1][j], rows[1][i]))
    bm.faces.new(rows[0])
    bm.faces.new(list(reversed(rows[1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish(_link(name, bm, m))


def area(name, loc, size, energy, colour, spread=180, aim=None, rot=(0, 0, 0)):
    li = sk.area_light(name, loc, size, energy, colour, spread_deg=spread, rot=rot)
    if aim is not None:
        li.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    LIGHTS[name] = li
    return li


def spot(name, loc, aim, energy, colour, size_deg, blend, radius):
    li = bpy.data.lights.new(name, "SPOT")
    li.energy, li.color = energy, colour
    li.spot_size, li.spot_blend = math.radians(size_deg), blend
    li.shadow_soft_size = radius
    ob = bpy.data.objects.new(name, li)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    LIGHTS[name] = ob
    return ob


# ---------------------------------------------------------------- materials
def materials():
    M.clear()
    mt.wall_paint("k_wall", (0.42, 0.42, 0.39))
    mt.wall_paint("k_ceiling", (0.46, 0.46, 0.44), grime=0.15)
    mt.wall_paint("d_wall", (0.25, 0.29, 0.3))              # a muted grey-green upper wall
    mt.wall_paint("d_ceiling", (0.44, 0.44, 0.42), grime=0.15)
    mt.enamel("trim", (0.5, 0.49, 0.46))                    # satin off-white trim, wainscot, sashes
    mt.enamel("k_cab", (0.36, 0.38, 0.36), rough=0.36)      # painted shaker cabinets, a soft sage grey
    mt.oak_floor("oak")
    mt.linoleum("lino")
    mt.laminate_counter("counter")
    mt.subway_tile("tile")
    mt.chrome("chrome")
    mt.pbr("steel_sink", (0.5, 0.51, 0.52), rough=(0.25, 0.4), metal=1.0, nscale=30.0)
    mt.pbr("enamel_black", (0.02, 0.02, 0.022), rough=(0.2, 0.32), nscale=10.0, spec=0.5)
    mt.pbr("range_white", (0.42, 0.42, 0.4), rough=(0.22, 0.34), nscale=8.0, coat=0.3)
    mt.pbr("grate", (0.03, 0.03, 0.03), rough=(0.5, 0.7), nscale=40.0, bump=0.3)
    mt.glass("glass")
    mt.pbr("oven_glass", (0.006, 0.006, 0.007), rough=(0.05, 0.1), nscale=5.0)
    mt.cast_iron("radiator", (0.3, 0.295, 0.28))
    mt.slat("slat")
    mt.plastic("blind_plastic", (0.58, 0.57, 0.53), rough=0.4)
    mt.plastic("cord", (0.5, 0.49, 0.46), rough=0.8, spec=0.3)
    mt.pbr("sideboard", (0.045, 0.026, 0.016), rough=(0.32, 0.45), stretch=(1.0, 18.0, 18.0), nscale=3.0, cvar=0.25,
           coat=0.2, grime=0.3)
    mt.pbr("brass", (0.36, 0.25, 0.11), rough=(0.25, 0.4), metal=1.0, nscale=20.0)
    mt.pbr("bronze_shade", (0.05, 0.045, 0.04), rough=(0.35, 0.5), metal=0.8, nscale=20.0)
    mt.pbr("shade_inside", (0.55, 0.54, 0.5), rough=(0.5, 0.6), nscale=10.0)
    mt.pbr("bulb_off", (0.6, 0.6, 0.58), rough=(0.25, 0.35), nscale=10.0, spec=0.6)
    mt.ceramic("mug", (0.15, 0.17, 0.19))                  # a slate glaze
    mt.ceramic("bowl", (0.4, 0.39, 0.36), rough=0.3, speck=0.6)
    mt.ceramic("jar", (0.12, 0.14, 0.13), rough=0.22)
    mt.liquid("coffee")
    mt.paper("envelope", (0.6, 0.58, 0.53))
    mt.paper("envelope_kraft", (0.42, 0.33, 0.21))
    mt.linen("runner", (0.33, 0.32, 0.29))
    mt.linen("towel", (0.3, 0.33, 0.36))
    mt.rug("rug", size=(2.6, 1.9))
    mt.aluminium("alu")
    mt.plastic("key", (0.018, 0.018, 0.02), rough=0.55, spec=0.4)
    mt.pbr("bezel", (0.004, 0.004, 0.005), rough=(0.08, 0.14), nscale=10.0, spec=0.5)
    mt.pbr("trackpad", (0.2, 0.205, 0.215), rough=(0.25, 0.32), metal=0.6, nscale=40.0)
    mt.pbr("phone", (0.012, 0.012, 0.014), rough=(0.18, 0.3), nscale=20.0, coat=0.5)
    mt.pbr("pen", (0.02, 0.03, 0.06), rough=(0.25, 0.35), nscale=20.0)
    mt.pbr("frame_wood", (0.03, 0.02, 0.014), rough=(0.35, 0.5), stretch=(1.0, 14.0, 14.0), nscale=3.0, cvar=0.2)
    mt.pbr("canvas", (0.14, 0.15, 0.15), rough=(0.7, 0.85), nscale=3.0, cvar=0.35, bump=0.15, bscale=300.0)
    mt.pbr("plaster_med", (0.46, 0.46, 0.44), rough=(0.6, 0.75), nscale=6.0)
    mt.pbr("dark_void", (0.005, 0.005, 0.006), rough=(0.6, 0.8))
    # the screen: a blank cool white glow, a little brighter in the middle
    mt.glow("screen", (0.78, 0.86, 1.0), 4.0, falloff=0.25, axes=("X", "Y"))
    mt.night("k_night", low=(0.05, 0.062, 0.09), high=(0.008, 0.011, 0.02), z0=-2.0, z1=4.0,
             warm_windows=[(-1.25, 1.2, 0.5, 0.7, 0.55), (1.6, 0.9, 0.36, 0.55, 0.35)])
    mt.night("d_night", low=(0.07, 0.085, 0.12), high=(0.01, 0.014, 0.025), z0=-2.0, z1=5.0)


# ---------------------------------------------------------------- rooms
def _walls(p, R, wall_m, openings):
    """Four walls (boxes WALL_T thick outside the interior faces), a floor slab and a ceiling slab. `openings` =
    {side: [(a, b, z0, z1)]} along the wall (x for the +/-Y walls, y for the +/-X walls)."""
    x0, x1, y0, y1, h = R["x0"], R["x1"], R["y0"], R["y1"], R["h"]
    t = WALL_T
    sides = {
        "+y": ((x0 - t, x1 + t), lambda a, b, z0, z1: ((b - a, t, z1 - z0), ((a + b) / 2, y1 + t / 2, (z0 + z1) / 2))),
        "-y": ((x0 - t, x1 + t), lambda a, b, z0, z1: ((b - a, t, z1 - z0), ((a + b) / 2, y0 - t / 2, (z0 + z1) / 2))),
        "+x": ((y0, y1), lambda a, b, z0, z1: ((t, b - a, z1 - z0), (x1 + t / 2, (a + b) / 2, (z0 + z1) / 2))),
        "-x": ((y0, y1), lambda a, b, z0, z1: ((t, b - a, z1 - z0), (x0 - t / 2, (a + b) / 2, (z0 + z1) / 2))),
    }
    for side, ((lo, hi), shape) in sides.items():
        ops = sorted(openings.get(side, []))
        cur = lo
        i = 0
        for (a, b, z0, z1) in ops:
            if a > cur:
                s, l = shape(cur, a, 0.0, h)
                box(f"{p}_wall{side}_{i}", s, l, wall_m)
                i += 1
            s, l = shape(a, b, 0.0, z0)
            if z0 > 0:
                box(f"{p}_wall{side}_{i}", s, l, wall_m)
                i += 1
            s, l = shape(a, b, z1, h)
            box(f"{p}_wall{side}_{i}", s, l, wall_m)
            i += 1
            cur = b
        if hi > cur:
            s, l = shape(cur, hi, 0.0, h)
            box(f"{p}_wall{side}_{i}", s, l, wall_m)
    return x0, x1, y0, y1, h


BASE = [(0, 0), (0.017, 0), (0.017, 0.15), (0.013, 0.157), (0.015, 0.164), (0.011, 0.172), (0.006, 0.178), (0, 0.18)]


def _crown(h):
    return [(0, h - 0.115), (0.004, h - 0.115), (0.009, h - 0.108), (0.012, h - 0.1), (0.03, h - 0.07),
            (0.055, h - 0.04), (0.08, h - 0.018), (0.092, h - 0.012), (0.096, h - 0.006), (0.104, h - 0.003),
            (0.106, h), (0, h)]


def _rail(z):
    return [(0, z - 0.04), (0.01, z - 0.04), (0.016, z - 0.032), (0.02, z - 0.02), (0.025, z - 0.006),
            (0.027, z + 0.004), (0.024, z + 0.014), (0.016, z + 0.02), (0, z + 0.02)]


def _mouldings(p, R, profiles, skip=()):
    """Run each profile round the room's four walls, broken where `skip` = [(side, a, b)] says (openings)."""
    x0, x1, y0, y1 = R["x0"], R["x1"], R["y0"], R["y1"]
    walls = {"+y": ((x0, y1), (x1, y1), (0, -1)), "-y": ((x0, y0), (x1, y0), (0, 1)),
             "+x": ((x1, y0), (x1, y1), (-1, 0)), "-x": ((x0, y0), (x0, y1), (1, 0))}
    for name, prof in profiles:
        dmax = max(d for d, _ in prof)
        for side, (a, b, n) in walls.items():
            along = 0 if side in ("+y", "-y") else 1
            a, b = list(a), list(b)
            a[along] -= dmax
            b[along] += dmax
            spans = [(a[along], b[along])]
            for (s, lo, hi) in skip:
                if s == side and name in ("rail", "wainscot"):
                    spans = [piece for (u, v) in spans for piece in ((u, min(v, lo)), (max(u, hi), v)) if piece[1] - piece[0] > 0.01]
            for k, (u, v) in enumerate(spans):
                pa, pb = list(a), list(b)
                pa[along], pb[along] = u, v
                run(f"{p}_{name}{side}_{k}", tuple(pa), tuple(pb), n, prof, M["trim"])


def _floor_ceiling(p, R, floor_m, ceil_m):
    x0, x1, y0, y1, h = R["x0"], R["x1"], R["y0"], R["y1"], R["h"]
    box(f"{p}_floor", (x1 - x0 + 0.3, y1 - y0 + 0.3, 0.1), ((x0 + x1) / 2, (y0 + y1) / 2, -0.05), floor_m)
    box(f"{p}_ceiling", (x1 - x0 + 0.3, y1 - y0 + 0.3, 0.1), ((x0 + x1) / 2, (y0 + y1) / 2, h + 0.05), ceil_m)


# ---------------------------------------------------------------- windows
def on_wall(name, loc, rot_z, fn, *a, **kw):
    """Build parts with `fn` as if on a +Y wall at the origin (room face at y = 0, x along the wall), then carry
    them to `loc` turned `rot_z` about Z (90 deg puts them on a -X wall). Returns fn's result."""
    before = set(bpy.data.objects)
    out = fn(*a, **kw)
    hold = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(hold)
    for o in set(bpy.data.objects) - before:
        if o.parent is None and o is not hold:
            o.parent = hold
    hold.location = loc
    hold.rotation_euler = (0, 0, rot_z)
    bpy.context.view_layer.update()
    return out


def _sash(p, x0, x1, z0, z1, y, depth=0.042, stile=0.052, bottom=0.075, top=0.052, muntins=False):
    """A wood sash: stiles, rails and a glass pane at depth y (y is the sash's room face)."""
    tm = M["trim"]
    yc = y + depth / 2
    w = x1 - x0
    box(f"{p}_stileL", (stile, depth, z1 - z0), (x0 + stile / 2, yc, (z0 + z1) / 2), tm, bevel=0.004)
    box(f"{p}_stileR", (stile, depth, z1 - z0), (x1 - stile / 2, yc, (z0 + z1) / 2), tm, bevel=0.004)
    box(f"{p}_railB", (w - 2 * stile + 0.004, depth, bottom), ((x0 + x1) / 2, yc, z0 + bottom / 2), tm, bevel=0.004)
    box(f"{p}_railT", (w - 2 * stile + 0.004, depth, top), ((x0 + x1) / 2, yc, z1 - top / 2), tm, bevel=0.004)
    box(f"{p}_glass", (w - 2 * stile + 0.01, 0.004, z1 - z0 - bottom - top + 0.01), ((x0 + x1) / 2, yc + 0.006, (z0 + bottom + z1 - top) / 2),
        M["glass"])
    if muntins:  # a prairie border: one bar across near the top, one down each side
        gx0, gx1, gz0, gz1 = x0 + stile, x1 - stile, z0 + bottom, z1 - top
        mw, md = 0.016, depth * 0.7
        box(f"{p}_munH", (gx1 - gx0, md, mw), ((gx0 + gx1) / 2, yc - 0.002, gz1 - 0.11), tm, bevel=0.003)
        for s, xx in (("L", gx0 + 0.11), ("R", gx1 - 0.11)):
            box(f"{p}_munV{s}", (mw, md, gz1 - gz0), (xx, yc - 0.002, (gz0 + gz1) / 2), tm, bevel=0.003)


def window(p, cx, w, z0, z1, y_wall, mullion=0.0, inner_depth=0.053, meet=None):
    """A double-hung window (or a mulled pair when `mullion` > 0) in a +Y wall whose room face is at y = y_wall:
    jamb liners, upper and lower sashes, a meeting rail lock, the interior casing with its head cap, the stool and
    the apron. Returns [(x0, x1)] of the glazed units."""
    tm = M["trim"]
    t = WALL_T
    x0, x1 = cx - w / 2, cx + w / 2
    yj = y_wall + t / 2
    # jamb liners round the opening
    box(f"{p}_jambL", (0.02, t, z1 - z0), (x0 + 0.01, yj, (z0 + z1) / 2), tm, bevel=0.002)
    box(f"{p}_jambR", (0.02, t, z1 - z0), (x1 - 0.01, yj, (z0 + z1) / 2), tm, bevel=0.002)
    box(f"{p}_jambT", (w, t, 0.02), (cx, yj, z1 - 0.01), tm, bevel=0.002)
    box(f"{p}_sillJ", (w, t, 0.02), (cx, yj, z0 + 0.01), tm, bevel=0.002)
    units = []
    if mullion:
        uw = (w - 0.04 - mullion) / 2
        units = [(x0 + 0.02, x0 + 0.02 + uw), (x1 - 0.02 - uw, x1 - 0.02)]
        box(f"{p}_mullion", (mullion, t, z1 - z0), (cx, yj, (z0 + z1) / 2), tm, bevel=0.003)
        box(f"{p}_mullCasing", (mullion + 0.02, 0.022, z1 - z0), (cx, y_wall - 0.011, (z0 + z1) / 2), tm, bevel=0.004)
    else:
        units = [(x0 + 0.02, x1 - 0.02)]
    zm = (z0 + z1) / 2 + 0.03 if meet is None else meet
    for i, (ux0, ux1) in enumerate(units):
        ys = y_wall + inner_depth + 0.012
        _sash(f"{p}_u{i}_lower", ux0, ux1, z0 + 0.02, zm + 0.02, ys)
        _sash(f"{p}_u{i}_upper", ux0, ux1, zm - 0.02, z1 - 0.02, ys + 0.046, muntins=True)
        box(f"{p}_u{i}_lock", (0.055, 0.02, 0.012), ((ux0 + ux1) / 2, ys + 0.03, zm + 0.026), M["chrome"], bevel=0.003)
        box(f"{p}_u{i}_stopL", (0.014, 0.018, z1 - z0 - 0.04), (ux0 + 0.007, ys - 0.009, (z0 + z1) / 2), tm, bevel=0.002)
        box(f"{p}_u{i}_stopR", (0.014, 0.018, z1 - z0 - 0.04), (ux1 - 0.007, ys - 0.009, (z0 + z1) / 2), tm, bevel=0.002)
    # interior casing: sides, head with a cap, stool and apron
    cw, ct = 0.088, 0.02
    yc = y_wall - ct / 2
    box(f"{p}_casL", (cw, ct, z1 - z0 + cw), (x0 - cw / 2 + 0.004, yc, (z0 + z1 + cw) / 2), tm, bevel=0.004)
    box(f"{p}_casR", (cw, ct, z1 - z0 + cw), (x1 + cw / 2 - 0.004, yc, (z0 + z1 + cw) / 2), tm, bevel=0.004)
    box(f"{p}_head", (w + 2 * cw + 0.02, ct + 0.004, 0.13), (cx, yc - 0.002, z1 + 0.065), tm, bevel=0.004)
    box(f"{p}_headCap", (w + 2 * cw + 0.05, ct + 0.022, 0.022), (cx, yc - 0.01, z1 + 0.141), tm, bevel=0.006)
    box(f"{p}_stool", (w + 2 * cw + 0.06, 0.15, 0.026), (cx, y_wall + t * 0.25 - 0.075 + 0.03, z0 - 0.013), tm, bevel=0.007)
    box(f"{p}_apron", (w + 2 * cw - 0.01, ct, 0.085), (cx, yc, z0 - 0.026 - 0.0425), tm, bevel=0.004)
    return units, zm


def blind(p, ux0, ux1, z0, z1, y, tilt_deg, cords_side=1):
    """A 2 in venetian blind hung inside the opening, its slats' room-side face near `y`: head rail and valance,
    slats tilted `tilt_deg` (positive: the room-side edge lower), the bottom rail, ladder tapes, lift cords through
    the slats, a tilt wand and the lift cord with its tassel."""
    w = ux1 - ux0 - 0.012
    cx = (ux0 + ux1) / 2
    sw, st, pitch = 0.05, 0.0022, 0.0445
    yc = y + 0.03
    bp = M["blind_plastic"]
    box(f"{p}_head", (w, 0.058, 0.05), (cx, yc, z1 - 0.03), bp, bevel=0.003)
    box(f"{p}_valance", (w + 0.006, 0.012, 0.07), (cx, yc - 0.035, z1 - 0.035), bp, bevel=0.004)
    top = z1 - 0.085
    bottom = z0 + 0.015
    n = int((top - bottom) / pitch)
    tr = math.radians(tilt_deg)
    bm = bmesh.new()
    for i in range(n):
        z = top - i * pitch
        mat = Matrix.Translation((cx, yc, z)) @ Matrix.Rotation(tr, 4, "X") @ Matrix.Diagonal((w, sw, st, 1))
        bmesh.ops.create_cube(bm, size=1.0, matrix=mat)
    ob = _link(f"{p}_slats", bm, M["slat"])
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = 0.0009, 2, "ANGLE"
    for pl in ob.data.polygons:
        pl.use_smooth = True
    ob.modifiers.new("wn", "WEIGHTED_NORMAL")
    zb = top - n * pitch
    box(f"{p}_bottom", (w, 0.052, 0.012), (cx, yc, zb), bp, bevel=0.003)
    # ladder tapes (front and back) and the lift cords, at two stations
    for k, xx in enumerate((ux0 + 0.13, ux1 - 0.13)):
        for s, dy in (("f", -sw / 2 * math.cos(tr) - 0.001), ("b", sw / 2 * math.cos(tr) + 0.001)):
            box(f"{p}_ladder{k}{s}", (0.009, 0.0006, top - zb + 0.02), (xx, yc + dy, (top + zb) / 2), M["cord"])
        cyl(f"{p}_lift{k}", 0.0011, top - zb + 0.04, (xx + 0.012, yc, (top + zb) / 2), M["cord"], verts=8)
    # the wand on one side, the lift cord and tassel on the other
    wx = ux0 + 0.05 if cords_side > 0 else ux1 - 0.05
    lx = ux1 - 0.05 if cords_side > 0 else ux0 + 0.05
    cyl(f"{p}_wand", 0.0045, 0.62, (wx, yc - 0.045, z1 - 0.06 - 0.31), bp, verts=12)
    cyl(f"{p}_wandHook", 0.006, 0.02, (wx, yc - 0.04, z1 - 0.06), bp, verts=12)
    for j, dx in enumerate((-0.004, 0.004)):
        cyl(f"{p}_cord{j}", 0.0012, 0.95, (lx + dx, yc - 0.04, z1 - 0.06 - 0.475), M["cord"], verts=8)
    cyl(f"{p}_tassel", 0.007, 0.045, (lx, yc - 0.04, z1 - 0.06 - 0.95 - 0.02), bp, verts=16, r2=0.005)
    return ob


def radiator(p, cx, y_back, sections=16, h=0.64, pitch=0.064, depth=0.21):
    """A cast-iron column radiator on its feet, a valve and pipe at one end."""
    bm = bmesh.new()
    w = sections * pitch
    x0 = cx - w / 2 + pitch / 2
    yc = y_back - depth / 2
    for i in range(sections):
        x = x0 + i * pitch
        for dy in (-depth / 2 + 0.03, -0.03, 0.03, depth / 2 - 0.03):   # four columns per section
            bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((x, yc + dy, 0.09 + h / 2)) @ Matrix.Diagonal((0.044, 0.042, h - 0.1, 1)))
        for zz in (0.09 + 0.05, 0.09 + h - 0.05):                         # top and bottom hubs
            bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((x, yc, zz)) @ Matrix.Diagonal((0.05, depth, 0.07, 1)))
    for x in (x0, x0 + (sections - 1) * pitch):                               # feet on the end sections
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((x, yc, 0.05)) @ Matrix.Diagonal((0.05, depth * 0.9, 0.1, 1)))
    ob = _link(f"{p}_radiator", bm, M["radiator"])
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = 0.017, 3, "ANGLE"
    for pl in ob.data.polygons:
        pl.use_smooth = True
    ob.modifiers.new("wn", "WEIGHTED_NORMAL")
    xe = cx + w / 2 + 0.04
    cyl(f"{p}_pipe", 0.016, 0.24, (xe, yc, 0.12), M["radiator"], verts=16)
    cyl(f"{p}_valve", 0.022, 0.05, (xe, yc, 0.27), M["brass"], verts=16, bevel=0.004)
    cyl(f"{p}_valveStem", 0.006, 0.05, (xe, yc, 0.32), M["brass"], verts=12)
    lathe(f"{p}_valveKnob", [(0.0, 0.0), (0.03, 0.0), (0.032, 0.01), (0.03, 0.02), (0.0, 0.02)], (xe, yc, 0.34), M["radiator"], segs=24)
    cyl(f"{p}_spud", 0.014, 0.06, (xe - 0.03, yc, 0.15), M["radiator"], rot=(0, math.pi / 2, 0), verts=16)
    return ob


# ---------------------------------------------------------------- kitchen
def shaker(p, x0, x1, z0, z1, y_face, m, rails=0.06, knob=None, knob_m=None, normal=-1):
    """A shaker door or drawer front in an X-Z plane at y = y_face, facing `normal` (-1: toward -Y)."""
    t = 0.019
    w, h = x1 - x0, z1 - z0
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    yc = y_face - normal * t / 2
    box(f"{p}_slab", (w - 0.004, t, h - 0.004), (cx, yc, cz), m, bevel=0.002)
    r = min(rails, w / 4, h / 4)
    yf = y_face + normal * 0.004
    box(f"{p}_stL", (r, 0.008, h - 0.006), (x0 + r / 2 + 0.002, yf, cz), m, bevel=0.0025)
    box(f"{p}_stR", (r, 0.008, h - 0.006), (x1 - r / 2 - 0.002, yf, cz), m, bevel=0.0025)
    box(f"{p}_rlT", (w - 2 * r - 0.004, 0.008, r), (cx, yf, z1 - r / 2 - 0.002), m, bevel=0.0025)
    box(f"{p}_rlB", (w - 2 * r - 0.004, 0.008, r), (cx, yf, z0 + r / 2 + 0.002), m, bevel=0.0025)
    if knob is not None:
        kx, kz = knob
        lathe(f"{p}_knob", [(0.0, 0.0), (0.008, 0.0), (0.006, 0.012), (0.013, 0.02), (0.0145, 0.027), (0.011, 0.032), (0.0, 0.033)],
              (kx, yf + normal * 0.004, kz), knob_m or M["chrome"], segs=24).rotation_euler = (normal * math.pi / 2 * -1, 0, 0)


def kitchen():
    R = K
    win = K_WIN
    _walls("k", R, M["k_wall"], {"+y": [(win["cx"] - win["w"] / 2, win["cx"] + win["w"] / 2, win["z0"], win["z1"])]})
    _floor_ceiling("k", R, M["lino"], M["k_ceiling"])
    _mouldings("k", R, [("base", BASE), ("crown", _crown(R["h"]))])
    y1 = R["y1"]
    units, _ = window("k_win", win["cx"], win["w"], win["z0"], win["z1"], y1)
    # outside: the night, a neighbour's lit window far off
    bd = box("k_night", (5.0, 0.02, 7.0), (win["cx"], y1 + 4.0, 1.5), M["k_night"])
    bd.visible_shadow = False
    # counter run along the +Y wall: base cabinets, range, sink, countertop, backsplash, uppers
    cx0, cx1 = R["x0"], R["x1"] - 0.85
    yf = y1 - COUNTER_D + 0.025          # cabinet face
    range_x = (R["x0"] + 0.48, R["x0"] + 1.24)
    sink_x = (win["cx"] - 0.38, win["cx"] + 0.38)
    box("k_toekick", (cx1 - cx0, 0.02, 0.1), ((cx0 + cx1) / 2, yf + 0.06, 0.05), M["enamel_black"])
    # carcass
    for i, (a, b) in enumerate(((cx0, range_x[0]), (range_x[1], cx1))):
        box(f"k_carcass{i}", (b - a, y1 - yf - 0.02, 0.775), ((a + b) / 2, (yf + 0.02 + y1) / 2, 0.1 + 0.3875), M["k_cab"])
    # door and drawer fronts
    fronts = []
    for a, b in ((cx0 + 0.02, range_x[0] - 0.005), (range_x[1] + 0.005, cx1 - 0.005)):
        n = max(1, round((b - a) / 0.46))
        wdt = (b - a) / n
        for k in range(n):
            fronts.append((a + k * wdt, a + (k + 1) * wdt))
    for i, (a, b) in enumerate(fronts):
        shaker(f"k_drw{i}", a + 0.002, b - 0.002, 0.7, 0.86, yf, M["k_cab"], rails=0.05, knob=((a + b) / 2, 0.78))
        shaker(f"k_door{i}", a + 0.002, b - 0.002, 0.105, 0.695, yf, M["k_cab"], knob=((b - 0.04) if i % 2 == 0 else (a + 0.04), 0.62))
    # countertop around the sink cut-out
    ct = 0.035
    cz = COUNTER_TOP - ct / 2
    yfront = yf - 0.028
    for i, (a, b) in enumerate(((cx0, range_x[0]), (range_x[1], sink_x[0]), (sink_x[1], cx1))):
        box(f"k_counter{i}", (b - a, y1 - yfront, ct), ((a + b) / 2, (yfront + y1) / 2, cz), M["counter"], bevel=0.004)
    sy0, sy1 = yfront + 0.06, y1 - 0.08
    box("k_counterF", (sink_x[1] - sink_x[0], sy0 - yfront, ct), ((sink_x[0] + sink_x[1]) / 2, (yfront + sy0) / 2, cz), M["counter"], bevel=0.004)
    box("k_counterB", (sink_x[1] - sink_x[0], y1 - sy1, ct), ((sink_x[0] + sink_x[1]) / 2, (sy1 + y1) / 2, cz), M["counter"], bevel=0.004)
    # the sink: a stainless basin with a rolled rim
    sxc = (sink_x[0] + sink_x[1]) / 2
    syc = (sy0 + sy1) / 2
    sw, sd = sink_x[1] - sink_x[0], sy1 - sy0
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((sxc, syc, COUNTER_TOP - 0.1)) @ Matrix.Diagonal((sw - 0.02, sd - 0.02, 0.2, 1)))
    top_face = [f for f in bm.faces if f.normal.z > 0.9]
    bmesh.ops.delete(bm, geom=top_face, context="FACES")
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    sink = _link("k_basin", bm, M["steel_sink"])
    bv = sink.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = 0.03, 4, "ANGLE"
    sink.modifiers.new("solid", "SOLIDIFY").thickness = 0.002
    for pl in sink.data.polygons:
        pl.use_smooth = True
    for nm, s, l in (("F", (sw, 0.02, 0.006), (sxc, sy0 + 0.01, COUNTER_TOP + 0.003)), ("B", (sw, 0.02, 0.006), (sxc, sy1 - 0.01, COUNTER_TOP + 0.003)),
                     ("L", (0.02, sd, 0.006), (sink_x[0] + 0.01, syc, COUNTER_TOP + 0.003)), ("R", (0.02, sd, 0.006), (sink_x[1] - 0.01, syc, COUNTER_TOP + 0.003))):
        box(f"k_sinkRim{nm}", s, l, M["steel_sink"], bevel=0.0028)
    # gooseneck faucet at the back of the sink, a little to the right
    fx, fy = sxc + 0.02, sy1 + 0.035
    cyl("k_faucetBase", 0.028, 0.03, (fx, fy, COUNTER_TOP + 0.015), M["chrome"], verts=32, bevel=0.006)
    tube("k_faucet", [(fx, fy, COUNTER_TOP + 0.02), (fx, fy, COUNTER_TOP + 0.3), (fx, fy - 0.1, COUNTER_TOP + 0.36),
                      (fx, fy - 0.2, COUNTER_TOP + 0.27), (fx, fy - 0.21, COUNTER_TOP + 0.23)], 0.011, M["chrome"])
    for s, dx in (("L", -0.11), ("R", 0.11)):
        cyl(f"k_tap{s}", 0.018, 0.05, (fx + dx, fy, COUNTER_TOP + 0.025), M["chrome"], verts=24, bevel=0.004)
        box(f"k_tapLever{s}", (0.012, 0.06, 0.01), (fx + dx, fy - 0.03, COUNTER_TOP + 0.055), M["chrome"], bevel=0.004)
    # a tea towel over the oven door handle is too busy: a folded towel on the counter edge instead
    box("k_towel", (0.22, 0.13, 0.022), (sink_x[1] + 0.2, yfront + 0.1, COUNTER_TOP + 0.011), M["towel"], bevel=0.008)
    # range: white enamel body, black glass oven door, a back guard, four burner grates and a kettle
    rx0, rx1 = range_x
    rxc = (rx0 + rx1) / 2
    box("k_range", (rx1 - rx0, y1 - yfront - 0.01, 0.89), (rxc, (yfront + 0.01 + y1) / 2, 0.445), M["range_white"], bevel=0.01)
    box("k_ovenDoor", (rx1 - rx0 - 0.06, 0.025, 0.5), (rxc, yfront, 0.38), M["range_white"], bevel=0.008)
    box("k_ovenGlass", (rx1 - rx0 - 0.22, 0.004, 0.24), (rxc, yfront - 0.013, 0.39), M["oven_glass"], bevel=0.002)
    cyl("k_ovenHandle", 0.011, rx1 - rx0 - 0.12, (rxc, yfront - 0.05, 0.66), M["chrome"], rot=(0, math.pi / 2, 0), verts=16)
    for s, dx in (("L", -(rx1 - rx0) / 2 + 0.08), ("R", (rx1 - rx0) / 2 - 0.08)):
        box(f"k_ovenHandleArm{s}", (0.016, 0.045, 0.016), (rxc + dx, yfront - 0.03, 0.66), M["chrome"], bevel=0.005)
    box("k_backguard", (rx1 - rx0, 0.05, 0.12), (rxc, y1 - 0.03, 0.95), M["range_white"], bevel=0.008)
    for i, dx in enumerate((-0.17, 0.17)):
        for j, dy in enumerate((-0.15, 0.1)):
            gx, gy = rxc + dx, (yfront + y1) / 2 + dy
            cyl(f"k_burner{i}{j}", 0.045, 0.01, (gx, gy, 0.895), M["enamel_black"], verts=24, bevel=0.003)
            for a in range(4):
                ang = a * math.pi / 2 + math.pi / 4
                box(f"k_grate{i}{j}{a}", (0.16, 0.012, 0.014), (gx, gy, 0.91), M["grate"], bevel=0.004, rot=(0, 0, ang))
            lathe(f"k_grateRing{i}{j}", [(0.09, 0.0), (0.098, 0.0), (0.098, 0.012), (0.09, 0.012)], (gx, gy, 0.903), M["grate"], segs=32)
    for i in range(4):
        cyl(f"k_knob{i}", 0.018, 0.022, (rxc - 0.24 + i * 0.16, y1 - 0.06, 0.95), M["chrome"], rot=(math.pi / 2, 0, 0), verts=24, bevel=0.004)
    kx, ky = rxc + 0.17, (yfront + y1) / 2 - 0.15
    lathe("k_kettle", [(0.0, 0.0), (0.085, 0.0), (0.095, 0.01), (0.1, 0.05), (0.097, 0.1), (0.085, 0.14), (0.06, 0.165),
                       (0.035, 0.172), (0.0, 0.173)], (kx, ky, 0.918), M["chrome"], segs=48)
    tube("k_kettleHandle", [(kx - 0.06, ky, 0.918 + 0.16), (kx - 0.03, ky, 0.918 + 0.25), (kx + 0.04, ky, 0.918 + 0.25), (kx + 0.06, ky, 0.918 + 0.155)],
         0.008, M["enamel_black"])
    tube("k_kettleSpout", [(kx + 0.08, ky - 0.04, 0.918 + 0.06), (kx + 0.12, ky - 0.08, 0.918 + 0.12), (kx + 0.15, ky - 0.1, 0.918 + 0.16)], 0.011, M["chrome"])
    # backsplash between the counter and the uppers, broken by the window
    up0, up1 = 1.43, 2.2
    wx0, wx1 = win["cx"] - win["w"] / 2 - 0.09, win["cx"] + win["w"] / 2 + 0.09
    for i, (a, b, z0, z1) in enumerate(((cx0, wx0, COUNTER_TOP, up0), (wx1, cx1, COUNTER_TOP, up0),
                                        (wx0, wx1, COUNTER_TOP, win["z0"] - 0.11))):
        if b - a > 0.01 and z1 - z0 > 0.01:
            box(f"k_splash{i}", (b - a, 0.008, z1 - z0), ((a + b) / 2, y1 - 0.004, (z0 + z1) / 2), M["tile"])
    # upper cabinets either side of the window
    ud = 0.33
    for i, (a, b) in enumerate(((cx0, wx0 - 0.02), (wx1 + 0.02, cx1))):
        box(f"k_upper{i}", (b - a, ud - 0.02, up1 - up0), ((a + b) / 2, y1 - (ud - 0.02) / 2, (up0 + up1) / 2), M["k_cab"])
        n = max(1, round((b - a) / 0.42))
        wdt = (b - a) / n
        for k in range(n):
            xa, xb = a + k * wdt, a + (k + 1) * wdt
            shaker(f"k_up{i}{k}", xa + 0.002, xb - 0.002, up0 + 0.002, up1 - 0.002, y1 - ud, M["k_cab"],
                   knob=((xb - 0.04) if k % 2 == 0 else (xa + 0.04), up0 + 0.06))
    for i, (a, b) in enumerate(((cx0, wx0 - 0.02), (wx1 + 0.02, cx1))):
        box(f"k_upperCrown{i}", (b - a + 0.03, ud + 0.03, 0.04), ((a + b) / 2, y1 - (ud + 0.03) / 2, up1 + 0.02), M["k_cab"], bevel=0.006)
    # light switch plate by the doorway side
    box("k_switch", (0.075, 0.008, 0.115), (R["x1"] - 0.6, y1 - 0.004, 1.2), M["trim"], bevel=0.003)


def kitchen_table():
    t = props.load("kitchen-table", size=0.76, axis="z", loc=(KT[0], KT[1], 0.0), turn_deg=45.0, sat=0.62, val=0.72)
    mt.tune_prop(t, spec=0.3, rough_floor=0.42,
                 top_wood=((0.2, 0.11, 0.05), (0.09, 0.045, 0.02), 55.0))
    return t


def dining_chair(name, x, y, turn, sat=0.7, val=0.85, size=0.95):
    c = props.load("dining-chair", size=size, axis="z", loc=(x, y, 0.0), turn_deg=turn, sat=sat, val=val)
    c.name = name
    mt.tune_prop(c, spec=0.3, rough_floor=0.35)
    return c


# ---------------------------------------------------------------- the laptop, built in Python (no logo, no legends)
LAP_W, LAP_D, LAP_T = 0.312, 0.218, 0.0155
LID_H, LID_T = 0.208, 0.0055


def laptop(loc, turn_deg, open_deg=112.0):
    """A plain aluminium laptop, front edge toward local -Y: bevelled base, keyboard well with 78 dark keys (no
    legends), a trackpad, a hinge barrel, the lid with a black glass bezel and a blank glowing screen, opened
    `open_deg` from closed. Returns (holder, screen object, lid frame matrix)."""
    hold = bpy.data.objects.new("laptop", None)
    bpy.context.scene.collection.objects.link(hold)
    parts = []
    base = box("lap_base", (LAP_W, LAP_D, LAP_T), (0, 0, LAP_T / 2 + 0.002), M["alu"], bevel=0.0045, seg=4)
    parts.append(base)
    for i, (fx, fy) in enumerate(((-0.13, -0.09), (0.13, -0.09), (-0.13, 0.09), (0.13, 0.09))):
        parts.append(cyl(f"lap_foot{i}", 0.006, 0.002, (fx, fy, 0.001), M["key"], verts=16))
    # keyboard well and keys
    kw, kd = 0.272, 0.112
    ky = LAP_D / 2 - 0.018 - kd / 2
    parts.append(box("lap_well", (kw, kd, 0.0012), (0, ky, LAP_T + 0.002 - 0.0004), M["bezel"], bevel=0.0006))
    bm = bmesh.new()
    pitch = 0.0186
    rows = [(14, 0.0), (14, 0.0), (13, 0.0), (13, 0.0), (12, 0.0)]
    for r, (n, off) in enumerate(rows):
        yy = ky + kd / 2 - 0.009 - r * pitch
        widths = [1.0] * n
        if r == 1:
            widths[0], widths[-1] = 1.45, 1.45
        if r == 2:
            widths[0], widths[-1] = 1.75, 1.75
        if r == 3:
            widths[0], widths[-1] = 2.3, 2.3
        tot = sum(widths) * pitch
        xx = -tot / 2
        for wdt in widths:
            kwid = wdt * pitch - 0.0032
            bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((xx + wdt * pitch / 2, yy, LAP_T + 0.0026)) @ Matrix.Diagonal((kwid, pitch - 0.0032, 0.0013, 1)))
            xx += wdt * pitch
    # bottom row: modifiers, a long space bar, arrow keys
    yy = ky + kd / 2 - 0.009 - 5 * pitch
    for (x0, wdt) in ((-0.13, 1.0), (-0.111, 1.0), (-0.092, 1.0), (-0.073, 1.3), (-0.048, 5.6), (0.058, 1.3), (0.083, 1.0)):
        kwid = wdt * pitch - 0.0032
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((x0 + kwid / 2, yy, LAP_T + 0.0026)) @ Matrix.Diagonal((kwid, pitch - 0.0032, 0.0013, 1)))
    for (x0, y0, h) in ((0.104, yy + 0.0045, 0.5), (0.104, yy - 0.0045, 0.5), (0.0855, yy - 0.0045, 0.5), (0.1225, yy - 0.0045, 0.5)):
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((x0, y0, LAP_T + 0.0026)) @ Matrix.Diagonal((pitch - 0.0032, h * pitch - 0.0016, 0.0013, 1)))
    keys = _link("lap_keys", bm, M["key"])
    bv = keys.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = 0.0009, 2, "ANGLE"
    for pl in keys.data.polygons:
        pl.use_smooth = True
    parts.append(keys)
    tp_y = -LAP_D / 2 + 0.012 + 0.042
    parts.append(box("lap_trackpad", (0.125, 0.08, 0.0008), (0, tp_y, LAP_T + 0.002 + 0.0001), M["trackpad"], bevel=0.0004))
    # hinge barrel
    hy, hz = LAP_D / 2 - 0.004, LAP_T + 0.002 - 0.002
    parts.append(cyl("lap_hinge", 0.0055, LAP_W - 0.07, (0, hy, hz), M["alu"], rot=(0, math.pi / 2, 0), verts=24))
    # the lid, built standing then turned about the hinge: lid local frame (x across, v up the lid, n toward the user)
    a = math.radians(open_deg - 90.0)      # lean back past vertical
    lid_frame = Matrix.Translation((0, hy, hz)) @ Matrix.Rotation(-a, 4, "X")
    lid = box("lap_lid", (LAP_W, LID_T, LID_H), (0, 0, 0), M["alu"], bevel=0.003, seg=4)
    lid.matrix_world = lid_frame @ Matrix.Translation((0, LID_T / 2, LID_H / 2 + 0.004))
    parts.append(lid)
    bez = box("lap_bezel", (LAP_W - 0.006, 0.0008, LID_H - 0.006), (0, 0, 0), M["bezel"], bevel=0.0004)
    bez.matrix_world = lid_frame @ Matrix.Translation((0, -0.0004, LID_H / 2 + 0.004))
    parts.append(bez)
    sw, sh = LAP_W - 0.028, LID_H - 0.034
    me = bpy.data.meshes.new("lap_screen")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5, matrix=Matrix.Diagonal((sw, sh, 1, 1)))
    bm.to_mesh(me)
    bm.free()
    scr = bpy.data.objects.new("lap_screen", me)
    bpy.context.scene.collection.objects.link(scr)
    scr.data.materials.append(M["screen"])
    # the grid lies in XY facing +Z: stand it up facing -Y (toward the user) in the lid frame
    scr.matrix_world = lid_frame @ Matrix.Translation((0, -0.0011, 0.004 + 0.011 + sh / 2 + 0.006)) @ Matrix.Rotation(math.radians(90), 4, "X")
    parts.append(scr)
    for o in parts:
        mw = o.matrix_world.copy()
        o.parent = hold
        o.matrix_world = mw
    hold.location = loc
    hold.rotation_euler = (0, 0, math.radians(turn_deg))
    bpy.context.view_layer.update()
    return hold, scr


def mug(loc, turn_deg=0.0):
    x, y, z = loc
    prof = [(0.0, 0.0), (0.03, 0.0), (0.036, 0.004), (0.04, 0.012), (0.041, 0.06), (0.042, 0.092), (0.0405, 0.096),
            (0.0375, 0.094), (0.0365, 0.06), (0.035, 0.012), (0.0, 0.009)]
    body = lathe("mug", prof, (x, y, z), M["mug"], segs=48)
    lathe("mug_coffee", [(0.0, 0.0), (0.0362, 0.0), (0.0362, 0.001), (0.0, 0.001)], (x, y, z + 0.062), M["coffee"], segs=48)
    a = math.radians(turn_deg)
    d = Vector((math.cos(a), math.sin(a), 0.0))
    p = lambda r, zz: (x + d.x * r, y + d.y * r, z + zz)
    tube("mug_handle", [p(0.038, 0.078), p(0.066, 0.074), p(0.072, 0.048), p(0.062, 0.024), p(0.038, 0.02)], 0.0065, M["mug"])
    return body


def envelopes(loc, turn_deg):
    x, y, z = loc
    objs = []
    for i, (w, d, dt, dx, dy, m) in enumerate(((0.235, 0.105, 4.0, 0.0, 0.0, "envelope"), (0.22, 0.11, -3.0, 0.01, 0.006, "envelope_kraft"),
                                                 (0.24, 0.105, 9.0, -0.006, -0.004, "envelope"))):
        o = box(f"mail{i}", (w, d, 0.0016), (x + dx, y + dy, z + 0.0008 + i * 0.0017), M[m], bevel=0.0005,
                rot=(0, 0, math.radians(turn_deg + dt)))
        objs.append(o)
    return objs


def pen(loc, turn_deg):
    x, y, z = loc
    a = math.radians(turn_deg)
    cyl("pen", 0.0048, 0.14, (x, y, z + 0.0048), M["pen"], rot=(0, math.pi / 2, a), verts=16)
    cyl("pen_clip", 0.0012, 0.04, (x + math.cos(a) * 0.04, y + math.sin(a) * 0.04, z + 0.0102), M["chrome"], rot=(0, math.pi / 2, a), verts=8)
    lathe("pen_tip", [(0.0, 0.0), (0.0048, 0.0), (0.0015, 0.016), (0.0, 0.017)], (x - math.cos(a) * 0.07, y - math.sin(a) * 0.07, z + 0.0048),
          M["chrome"], segs=16).rotation_euler = (0, -math.pi / 2, a)


def phone(loc, turn_deg):
    x, y, z = loc
    box("phone", (0.072, 0.148, 0.008), (x, y, z + 0.004), M["phone"], bevel=0.0035, seg=4, rot=(0, 0, math.radians(turn_deg)))


# ---------------------------------------------------------------- dining room
def dining():
    R = D
    win = D_WIN
    wa, wb = win["cx"] - win["w"] / 2, win["cx"] + win["w"] / 2
    ew = D_END_WIN
    ea, eb = ew["cy"] - ew["w"] / 2, ew["cy"] + ew["w"] / 2
    _walls("d", R, M["d_wall"], {"+y": [(wa, wb, win["z0"], win["z1"])], "-x": [(ea, eb, ew["z0"], ew["z1"])]})
    _floor_ceiling("d", R, M["oak"], M["d_ceiling"])
    y1 = R["y1"]
    # wainscot: a flat panelled board to the chair rail with a stile every 0.6 m, then the rail, base and crown
    x0, x1, y0 = R["x0"], R["x1"], R["y0"]
    walls = {"+y": ((x0, x1), (0, -1), y1), "-y": ((x0, x1), (0, 1), y0), "+x": ((y0, y1), (-1, 0), x1), "-x": ((y0, y1), (1, 0), x0)}
    for side, ((lo, hi), n, at) in walls.items():
        spans = [(lo, hi)]
        if side == "+y":
            spans = [(lo, wa - 0.09), (wb + 0.09, hi)]
        if side == "-x":
            spans = [(lo, ea - 0.09), (eb + 0.09, hi)]
        for k, (a, b) in enumerate(spans):
            L = b - a
            if L < 0.05:
                continue
            c = (a + b) / 2
            zt = CHAIR_RAIL - 0.04
            if side in ("+y", "-y"):
                box(f"d_wainscot{side}{k}", (L, 0.012, zt), (c, at + n[1] * 0.006, zt / 2), M["trim"])
            else:
                box(f"d_wainscot{side}{k}", (0.012, L, zt), (at + n[0] * 0.006, c, zt / 2), M["trim"])
            m = max(1, round(L / 0.62))
            for j in range(m + 1):
                s = a + j * L / m
                s = min(max(s, a + 0.04), b - 0.04)
                if side in ("+y", "-y"):
                    box(f"d_stile{side}{k}{j}", (0.075, 0.01, zt - 0.18), (s, at + n[1] * 0.017, 0.18 + (zt - 0.18) / 2), M["trim"], bevel=0.003)
                else:
                    box(f"d_stile{side}{k}{j}", (0.01, 0.075, zt - 0.18), (at + n[0] * 0.017, s, 0.18 + (zt - 0.18) / 2), M["trim"], bevel=0.003)
            if side in ("+y", "-y"):
                box(f"d_wrail{side}{k}", (L, 0.01, 0.07), (c, at + n[1] * 0.017, zt - 0.035), M["trim"], bevel=0.003)
            else:
                box(f"d_wrail{side}{k}", (0.01, L, 0.07), (at + n[0] * 0.017, c, zt - 0.035), M["trim"], bevel=0.003)
    _mouldings("d", R, [("base", [(d + 0.012, z) if d > 0 else (d, z) for d, z in BASE]), ("rail", _rail(CHAIR_RAIL)),
                        ("crown", _crown(R["h"]))], skip=[("+y", wa - 0.09, wb + 0.09), ("-x", ea - 0.09, eb + 0.09)])
    units, zm = window("d_win", win["cx"], win["w"], win["z0"], win["z1"], y1, mullion=win["mullion"])
    for i, (ux0, ux1) in enumerate(units):
        blind(f"d_blind{i}", ux0, ux1, win["z0"] + 0.02, win["z1"] - 0.02, y1 + 0.002, tilt_deg=BLIND_TILT, cords_side=1 if i == 0 else -1)
    radiator("d", win["cx"], y1 - 0.055, sections=17)
    # the foot-end window, built on a +Y wall at the origin and turned 90 deg onto the -X wall (its x runs along +Y
    # there and its outside, +y, along -X)
    def end_window():
        units, _ = window("d_ewin", ew["cy"], ew["w"], ew["z0"], ew["z1"], 0.0, meet=ew["z0"] + 0.42)
        for i, (ux0, ux1) in enumerate(units):
            blind(f"d_eblind{i}", ux0, ux1, ew["z0"] + 0.02, ew["z1"] - 0.02, 0.002, tilt_deg=BLIND_TILT_END, cords_side=-1)
        bd = box("d_enight", (10.0, 0.02, 8.0), (ew["cy"], 6.0, 2.0), M["d_night"])
        bd.visible_shadow = False
    on_wall("d_endwin", (R["x0"], 0.0, 0.0), math.pi / 2, end_window)
    bd = box("d_night", (14.0, 0.02, 9.0), (win["cx"], y1 + 6.0, 2.0), M["d_night"])
    bd.visible_shadow = False
    # ceiling medallion and the pendant (off) over the table
    h = R["h"]
    px, py = DT
    lathe("d_medallion", [(0.0, 0.0), (0.2, 0.0), (0.205, -0.006), (0.19, -0.014), (0.16, -0.016), (0.13, -0.024), (0.08, -0.026),
                          (0.06, -0.034), (0.0, -0.036)], (px, py, h), M["plaster_med"], segs=64)
    cyl("d_canopy", 0.06, 0.045, (px, py, h - 0.036 - 0.0225), M["bronze_shade"], verts=32, bevel=0.006)
    drop = 1.0
    cyl("d_cord", 0.0035, drop, (px, py, h - 0.08 - drop / 2), M["enamel_black"], verts=12)
    zt = h - 0.08 - drop
    cyl("d_socket", 0.022, 0.07, (px, py, zt - 0.02), M["bronze_shade"], verts=24, bevel=0.003)
    outer = [(0.025, 0.0), (0.05, -0.01), (0.1, -0.04), (0.15, -0.09), (0.185, -0.15), (0.2, -0.2), (0.203, -0.205)]
    inner = [(r - 0.003, z - 0.001) for r, z in reversed(outer)]
    lathe("d_shade", outer + inner, (px, py, zt), M["bronze_shade"], segs=64)
    lathe("d_shadeIn", [(r - 0.0035, z - 0.0012) for r, z in outer], (px, py, zt), M["shade_inside"], segs=64)
    lathe("d_bulb", [(0.0, 0.0), (0.012, 0.0), (0.016, -0.02), (0.03, -0.05), (0.032, -0.075), (0.022, -0.1), (0.0, -0.106)],
          (px, py, zt - 0.05), M["bulb_off"], segs=32)
    # rug under the table, a runner and a bowl on it
    box("d_rug", (2.6, 1.9, 0.008), (DT[0], DT[1], 0.004), M["rug"], bevel=0.003)
    box("d_runner", (1.3, 0.34, 0.003), (DT[0] - 0.05, DT[1], D_TOP + 0.0015), M["runner"], bevel=0.001)
    lathe("d_bowl", [(0.0, 0.0), (0.05, 0.0), (0.06, 0.004), (0.1, 0.03), (0.135, 0.062), (0.14, 0.068), (0.136, 0.07),
                     (0.13, 0.064), (0.095, 0.034), (0.055, 0.012), (0.0, 0.01)], (DT[0] - 0.08, DT[1] + 0.02, D_TOP + 0.003), M["bowl"], segs=64)
    # sideboard on the -Y wall, a lidded jar and a pair of candlesticks; a dark framed picture above
    sx, sy = 2.7, y0 + 0.24
    box("d_sb_body", (1.5, 0.44, 0.7), (sx, sy, 0.14 + 0.35), M["sideboard"], bevel=0.006)
    box("d_sb_top", (1.56, 0.48, 0.03), (sx, sy + 0.01, 0.855), M["sideboard"], bevel=0.008)
    for i in range(4):
        lx = sx - 0.7 if i % 2 == 0 else sx + 0.7
        ly = sy - 0.18 if i < 2 else sy + 0.18
        cyl(f"d_sb_leg{i}", 0.024, 0.14, (lx, ly, 0.07), M["sideboard"], verts=16, r2=0.018)
    fy = sy + 0.22
    for i, (a, b) in enumerate(((sx - 0.74, sx - 0.25), (sx - 0.245, sx + 0.245), (sx + 0.25, sx + 0.74))):
        shaker(f"d_sb_drw{i}", a, b, 0.66, 0.83, fy, M["sideboard"], rails=0.03, knob=((a + b) / 2, 0.745), knob_m=M["brass"], normal=1)
        shaker(f"d_sb_door{i}", a, b, 0.15, 0.655, fy, M["sideboard"], rails=0.06, knob=((a + b) / 2, 0.6), knob_m=M["brass"], normal=1)
    lathe("d_jar", [(0.0, 0.0), (0.05, 0.0), (0.075, 0.04), (0.085, 0.12), (0.07, 0.2), (0.045, 0.23), (0.045, 0.245), (0.0, 0.245)],
          (sx + 0.45, sy, 0.87), M["jar"], segs=48)
    lathe("d_jarLid", [(0.0, 0.0), (0.052, 0.0), (0.052, 0.012), (0.02, 0.025), (0.016, 0.045), (0.0, 0.05)], (sx + 0.45, sy, 0.87 + 0.245),
          M["jar"], segs=48)
    for i, dx in enumerate((-0.45, -0.25)):
        lathe(f"d_candle{i}", [(0.0, 0.0), (0.045, 0.0), (0.045, 0.01), (0.02, 0.025), (0.012, 0.06), (0.016, 0.1), (0.011, 0.2),
                               (0.02, 0.24), (0.02, 0.25), (0.0, 0.25)], (sx + dx, sy, 0.87), M["brass"], segs=32)
        cyl(f"d_candleWax{i}", 0.011, 0.16, (sx + dx, sy, 0.87 + 0.25 + 0.08), M["bowl"], verts=16)
    fx0, fz = sx, 1.62
    for nm, s, l in (("T", (0.92, 0.04, 0.05), (fx0, y0 + 0.02, fz + 0.335)), ("B", (0.92, 0.04, 0.05), (fx0, y0 + 0.02, fz - 0.335)),
                     ("L", (0.05, 0.04, 0.72), (fx0 - 0.435, y0 + 0.02, fz)), ("R", (0.05, 0.04, 0.72), (fx0 + 0.435, y0 + 0.02, fz))):
        box(f"d_frame{nm}", s, l, M["frame_wood"], bevel=0.008)
    box("d_mat", (0.83, 0.006, 0.63), (fx0, y0 + 0.01, fz), M["shade_inside"])
    box("d_canvas", (0.62, 0.01, 0.42), (fx0, y0 + 0.012, fz), M["canvas"], bevel=0.002)


BLIND_TILT = 14.0
BLIND_TILT_END = 8.0


def dining_table():
    t = props.load("dining-table", size=1.8, axis="long", loc=(DT[0], DT[1], 0.0), turn_deg=0.0, sat=0.6, val=0.62)
    mt.tune_prop(t, spec=0.32, rough_floor=0.38,
                 top_wood=((0.11, 0.05, 0.028), (0.045, 0.02, 0.011), 70.0))
    return t


# chairs round the dining table: (name, x, y, turn); the native chair faces +X
DINING_CHAIRS = [
    ("chair_foot", 1.88, -0.02, 0.0),
    ("chair_s1", 2.55, 0.7, -90.0), ("chair_s2", 3.42, 0.7, -90.0),
    ("chair_n1", 2.58, -0.7, 90.0), ("chair_n2", 3.45, -0.7, 90.0),
]


def dining_chairs():
    out = []
    for (n, x, y, t) in DINING_CHAIRS:
        out.append(dining_chair(n, x, y, t))
    hx, hy, ht = HEAD_CHAIR
    out.append(dining_chair("chair_head", hx, hy, ht))
    return out
