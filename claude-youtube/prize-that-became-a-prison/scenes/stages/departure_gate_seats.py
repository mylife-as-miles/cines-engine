"""Beam gate seating, built in Python (replaces the gate-seating prop, whose Tripo panels rendered as lumpy snakeskin
up close and crawled in the wide).

One unit is four seats on a steel beam, 2.4 m long, origin at the beam's centre on the floor, the sitters facing +Y.
Each seat is one bent shell of perforated steel (a rolled front lip, a near-level pan, a bend, a back reclined 14 deg,
a rolled top), carried on a spine; polished aluminium loop arms between the seats with black polymer pads; two splayed
legs with floor glides. The shell carries UVs in metres (u across, v along the profile), so the 8 mm staggered
perforation keeps its pitch over the bend and a plain border frames each field.

    unit_collection(m) -> a collection to instance;  SEAT_TOP(y) -> the pan's top height at local y
"""
import math

import bpy
import bmesh
from mathutils import Vector

W_SEAT = 0.50            # shell width
PITCH = 0.60             # seat centres
SEAT_X = (-0.9, -0.3, 0.3, 0.9)
ARM_X = (-1.205, -0.6, 0.0, 0.6, 1.205)
BEAM_Z, BEAM_Y = 0.33, -0.03

# the shell's profile in (y, z), front lip to rolled top (sitter faces +Y)
PROFILE = [(0.262, 0.392), (0.255, 0.432), (0.228, 0.452), (0.17, 0.456), (0.0, 0.448), (-0.15, 0.438), (-0.215, 0.452),
           (-0.248, 0.5), (-0.27, 0.6), (-0.30, 0.72), (-0.33, 0.84), (-0.342, 0.872), (-0.362, 0.884)]


def _catmull(pts, n_per=8):
    """A smooth curve through the points (centripetal-ish Catmull-Rom), returned densely sampled."""
    P = [Vector((0, *p)) for p in pts]
    P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n_per):
            t = k / n_per
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return [(v.y, v.z) for v in out]


PROF = _catmull(PROFILE)


def seat_top(y):
    """Height of the pan's top surface at local y (the shell is thin: its profile is the top face)."""
    best = None
    for (y0, z0), (y1, z1) in zip(PROF, PROF[1:]):
        if min(y0, y1) <= y <= max(y0, y1) and z0 < 0.5 and z1 < 0.5:
            t = (y - y0) / (y1 - y0) if y1 != y0 else 0.0
            z = z0 + (z1 - z0) * t
            best = z if best is None else max(best, z)
    return best if best is not None else 0.45


def _link(ob, coll):
    coll.objects.link(ob)
    return ob


def shell(name, m, coll, x0=0.0, width=W_SEAT, cols=12):
    """The perforated shell: the profile swept across `width`, thickened 5 mm downward/backward, UVs in metres."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    s = [0.0]
    for (y0, z0), (y1, z1) in zip(PROF, PROF[1:]):
        s.append(s[-1] + math.hypot(y1 - y0, z1 - z0))
    grid = []
    for i in range(cols + 1):
        x = x0 - width / 2 + width * i / cols
        grid.append([bm.verts.new((x, y, z)) for (y, z) in PROF])
    for i in range(cols):
        for j in range(len(PROF) - 1):
            f = bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
            for lp in f.loops:
                ii = 0 if lp.vert in grid[i] else 1
                jj = grid[i + ii].index(lp.vert)
                lp[uv].uv = (-width / 2 + width * (i + ii) / cols, s[jj])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # normals up / forward (toward the sitter): judge on the pan's faces
    up = 0.0
    for f in bm.faces:
        f.normal_update()
        c = f.calc_center_median()
        if abs(c.y) < 0.1 and c.z < 0.47:
            up += f.normal.z
    if up < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me), coll)
    me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    so = ob.modifiers.new("thick", "SOLIDIFY")
    so.thickness, so.offset, so.use_even_offset = 0.005, -1.0, True
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method, bv.angle_limit = 0.0018, 2, "ANGLE", math.radians(50)
    ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
    ob["arc"] = s[-1]
    return ob


def _bar(name, p0, p1, w, h, m, coll, bevel=0.004):
    """A rectangular bar from p0 to p1 (w across, h in the plane of the bar and Z)."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * w, v.co.y * d.length, v.co.z * h))
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me), coll)
    ob.location = (p0 + p1) / 2
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = d.normalized().to_track_quat("Y", "Z")
    me.materials.append(m)
    if bevel:
        b = ob.modifiers.new("bevel", "BEVEL")
        b.width, b.segments = bevel, 3
        ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
        for p in me.polygons:
            p.use_smooth = True
    return ob


def _box(name, size, loc, m, coll, bevel=0.0):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me), coll)
    ob.location = loc
    me.materials.append(m)
    if bevel:
        b = ob.modifiers.new("bevel", "BEVEL")
        b.width, b.segments = bevel, 3
        ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
        for p in me.polygons:
            p.use_smooth = True
    return ob


def _tube(name, pts, r, m, coll):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution = "3D", r, 4
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts):
        p.co = (*co, 1.0)
    ob = _link(bpy.data.objects.new(name, cu), coll)
    ob.data.materials.append(m)
    return ob


def _arc_pts(pts, n=6, rad=0.04):
    """A polyline with its inner corners rounded (fillets of radius `rad`)."""
    P = [Vector(p) for p in pts]
    out = [P[0]]
    for a, b, c in zip(P, P[1:], P[2:]):
        u, v = (a - b).normalized(), (c - b).normalized()
        r = min(rad, (a - b).length / 2, (c - b).length / 2)
        p0, p1 = b + u * r, b + v * r
        for k in range(n + 1):
            t = k / n
            out.append((1 - t) ** 2 * p0 + 2 * (1 - t) * t * b + t * t * p1)
    out.append(P[-1])
    return [tuple(p) for p in out]


def unit_collection(m, name="gate_seat_unit"):
    """Build one four-seat unit into a new (unlinked) collection and return it."""
    coll = bpy.data.collections.new(name)
    perf, frame, arm, pad, glide = m["perf"], m["frame"], m["arm"], m["pad"], m["glide"]
    _bar("beam", (-1.18, BEAM_Y, BEAM_Z), (1.18, BEAM_Y, BEAM_Z), 0.09, 0.065, frame, coll, bevel=0.006)
    for e in (-1, 1):
        _box(f"beam_cap_{e}", (0.012, 0.094, 0.07), (e * 1.186, BEAM_Y, BEAM_Z), m["glide"], coll, bevel=0.003)
    # legs: a post and two splayed struts to glides
    for lx in (-0.6, 0.6):
        _bar(f"leg_post_{lx}", (lx, BEAM_Y, BEAM_Z - 0.03), (lx, BEAM_Y, 0.15), 0.05, 0.075, frame, coll, bevel=0.005)
        for s in (-1, 1):
            _bar(f"leg_strut_{lx}_{s}", (lx, BEAM_Y, 0.17), (lx, BEAM_Y + s * 0.3, 0.035), 0.05, 0.04, frame, coll, bevel=0.005)
            _box(f"leg_glide_{lx}_{s}", (0.06, 0.08, 0.022), (lx, BEAM_Y + s * 0.31, 0.011), glide, coll, bevel=0.004)
    for i, sx in enumerate(SEAT_X):
        shell(f"shell_{i}", perf, coll, x0=sx)
        # spine: a flat bar under the pan and behind the back, carried on a bracket from the beam
        _bar(f"bracket_{i}", (sx, BEAM_Y, BEAM_Z + 0.03), (sx, BEAM_Y, 0.425), 0.07, 0.12, frame, coll, bevel=0.005)
        pts = []
        for k in range(1, len(PROF) - 1):
            (ya, za), (y, z), (yb, zb) = PROF[k - 1], PROF[k], PROF[k + 1]
            if not (-0.34 <= y <= 0.12 and z < 0.83):
                continue
            t = Vector((yb - ya, zb - za)).normalized()
            pts.append((sx, y - t.y * 0.0165, z + t.x * 0.0165))   # (-t.z, t.y): under the pan, behind the back
        _tube(f"spine_{i}", pts, 0.011, frame, coll)
    # arms: polished aluminium loops from the beam up, forward, down at the front and back to the beam; black pads
    for j, ax in enumerate(ARM_X):
        path = _arc_pts([(ax, BEAM_Y - 0.02, BEAM_Z + 0.02), (ax, -0.17, 0.655), (ax, 0.19, 0.655), (ax, 0.235, 0.47),
                         (ax, 0.03, BEAM_Z + 0.02)], rad=0.05)
        _tube(f"arm_{j}", path, 0.0135, arm, coll)
        _box(f"arm_pad_{j}", (0.05, 0.27, 0.022), (ax, 0.01, 0.678), pad, coll, bevel=0.009)
    return coll
