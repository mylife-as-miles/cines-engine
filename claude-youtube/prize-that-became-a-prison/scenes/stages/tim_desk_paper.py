"""Paper and small things on Tim's desk, built in Python: sheets with real thickness, curl and folds, dropped onto
whatever lies under them; sealed envelopes; a ruled writing pad; a banded bundle and loose stacks of envelopes; an
open manila folder; a pen, a paper clip and a mug. Every face is blank.

The sheet, envelope, folder, pen, clip and mug builders are copied from the evidence table's module
(evidence_table_paper.py) so this stage stands alone; the pad, the bundle and the address-side envelope are new.

A flat item is a grid in its own XY plane (object space = position on the sheet, so materials can key on it). It
is placed by a world matrix (a turn about Z and a position on the desk), then each vertex is dropped by a ray onto
the desk and everything already placed; the support is smoothed so stiff paper ramps over an edge instead of
following it, then the item's own rest shape (curl, folds, puff) is added, and a Solidify gives it thickness.
"""
import math
import random

import bpy  # noqa: F401  (first)
import bmesh
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

TOP = 0.76
SUPPORT = []            # objects later items rest on (the table top, then every item as it is placed)


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def frame(x, y, turn_deg, z=None):
    return Matrix.Translation((x, y, TOP if z is None else z)) @ Matrix.Rotation(math.radians(turn_deg), 4, "Z")


def support_tree(footprint=None):
    """A BVH of the support objects (evaluated, so a Solidify counts) in world space. footprint = (xmin, ymin, xmax,
    ymax) skips objects whose bounds miss it."""
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    V, P = [], []
    for o in SUPPORT:
        if o.type not in ("MESH", "CURVE"):
            continue
        mw = o.matrix_world
        if footprint:
            pts = [mw @ Vector(c) for c in o.bound_box]
            if (max(p.x for p in pts) < footprint[0] or min(p.x for p in pts) > footprint[2] or
                    max(p.y for p in pts) < footprint[1] or min(p.y for p in pts) > footprint[3]):
                continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        base = len(V)
        V.extend(mw @ v.co for v in me.vertices)
        P.extend([base + i for i in p.vertices] for p in me.polygons)
        ev.to_mesh_clear()
    return BVHTree.FromPolygons(V, P) if P else None


def drop(tree, p, top=None):
    """The support height under world point p (x, y)."""
    if tree is None:
        return TOP
    hit = tree.ray_cast(Vector((p[0], p[1], (top or TOP) + 0.8)), Vector((0, 0, -1)))
    return hit[0].z if hit[0] is not None else TOP


def settle(mw, samples, max_deg=6.0, step_deg=0.25):
    """A rigid flat thing at mw (local XY), resting on the support: the tilt (about local x and y) that brings its
    origin lowest while every sample point (local x, y) stays on or above the support. Returns (z0, a, b) for the
    plane z = z0 + a*x + b*y in local space (heights world)."""
    tree = support_tree(_footprint(mw, samples, 0.02))
    sup = [(x, y, drop(tree, mw @ Vector((x, y, 0.0)))) for x, y in samples]
    best = None
    n = int(max_deg / step_deg)
    for i in range(-n, n + 1):
        a = math.tan(math.radians(i * step_deg))
        for j in range(-n, n + 1):
            b = math.tan(math.radians(j * step_deg))
            z0 = max(sz - a * x - b * y for x, y, sz in sup)
            if best is None or z0 < best[0] - 1e-7:
                best = (z0, a, b)
    return best


def tilt_matrix(a, b):
    """Rotation taking local +Z to the normal of the plane z = a*x + b*y."""
    nrm = Vector((-a, -b, 1.0)).normalized()
    return Vector((0, 0, 1)).rotation_difference(nrm).to_matrix().to_4x4()


def _footprint(mw, pts, pad=0.01):
    w = [mw @ Vector((x, y, 0)) for x, y in pts]
    return (min(p.x for p in w) - pad, min(p.y for p in w) - pad, max(p.x for p in w) + pad, max(p.y for p in w) + pad)


def grid_bm(w, h, nx, ny, edit=None):
    """A w x h grid of quads centred on the origin, normals +Z. edit(x, y) -> (x, y) moves outline vertices (torn
    edges)."""
    bm = bmesh.new()
    rows = []
    for j in range(ny + 1):
        row = []
        for i in range(nx + 1):
            x, y = (i / nx - 0.5) * w, (j / ny - 0.5) * h
            if edit:
                x, y = edit(x, y, i, j)
            row.append(bm.verts.new((x, y, 0.0)))
        rows.append(row)
    for j in range(ny):
        for i in range(nx):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    return bm


def outline_bm(pts, step=0.004):
    """A triangulated, evenly subdivided polygon from an outline (counter-clockwise, local XY)."""
    bm = bmesh.new()
    vs = []
    for (u0, v0), (u1, v1) in zip(pts, pts[1:] + pts[:1]):
        n = max(1, int(math.hypot(u1 - u0, v1 - v0) / step))
        for k in range(n):
            t = k / n
            vs.append(bm.verts.new((u0 + (u1 - u0) * t, v0 + (v1 - v0) * t, 0.0)))
    edges = [bm.edges.new((vs[i], vs[(i + 1) % len(vs)])) for i in range(len(vs))]
    bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=edges)
    for _ in range(3):
        long_e = [e for e in bm.edges if not e.is_boundary and e.calc_length() > step * 1.4]
        if not long_e:
            break
        bmesh.ops.subdivide_edges(bm, edges=long_e, cuts=1, use_grid_fill=False)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bmesh.ops.beautify_fill(bm, faces=bm.faces[:], edges=bm.edges[:])
    bm.normal_update()
    down = [f for f in bm.faces if f.normal.z < 0]
    if down:
        bmesh.ops.reverse_faces(bm, faces=down)
    bm.normal_update()
    return bm


def place_flat(name, bm, mw, m, thick, shape=None, gap=0.00006, stiff=6, solid_offset=1.0, support=True,
               footprint_pts=None, normalize=True):
    """Drop a flat bmesh (local XY) onto the support under world matrix mw, add the rest shape, give it thickness.
    Returns the object (its matrix_world is mw, so object space stays the sheet's own flat coordinates)."""
    vs = list(bm.verts)
    fp = _footprint(mw, footprint_pts or [(v.co.x, v.co.y) for v in vs[:: max(1, len(vs) // 200)]] +
                    [(min(v.co.x for v in vs), min(v.co.y for v in vs)), (max(v.co.x for v in vs), max(v.co.y for v in vs))])
    tree = support_tree(fp)
    z0 = mw.translation.z
    base = {}
    for v in vs:
        p = mw @ Vector((v.co.x, v.co.y, 0.0))
        base[v] = drop(tree, p) - z0 + gap
    sm = dict(base)
    for _ in range(stiff):           # stiff sheet: it ramps over an edge instead of following it
        new = {}
        for v in vs:
            nb = [sm[e.other_vert(v)] for e in v.link_edges]
            new[v] = max(base[v], 0.5 * sm[v] + 0.5 * sum(nb) / len(nb)) if nb else sm[v]
        sm = new
    lift = {v: (shape(v.co.x, v.co.y) if shape else 0.0) for v in vs}
    lo = min(lift.values()) if normalize else 0.0
    for v in vs:
        v.co.z = sm[v] + lift[v] - lo
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = link(bpy.data.objects.new(name, me))
    ob.matrix_world = mw
    ob.data.materials.append(m)
    so = ob.modifiers.new("thickness", "SOLIDIFY")
    so.thickness, so.offset, so.use_even_offset = thick, solid_offset, True
    so.use_quality_normals = True
    if support:
        SUPPORT.append(ob)
    return ob


# ---------------------------------------------------------------- rest shapes

def waves(rng, amp, wl=0.16):
    """Gentle low-frequency waviness (metres)."""
    terms = [(rng.uniform(0.6, 1.4) * 2 * math.pi / wl, rng.uniform(0.6, 1.4) * 2 * math.pi / wl, rng.uniform(0, 6.3),
              rng.uniform(0, 6.3), rng.uniform(0.5, 1.0)) for _ in range(3)]
    return lambda x, y: amp * sum(a * math.sin(kx * x + px) * math.sin(ky * y + py) for kx, ky, px, py, a in terms) / 2.0


def sheet_shape(w, h, seed, corners=(0.0, 0.0, 0.0, 0.0), edge=None, wave=0.0006, bow=0.0):
    """corners: lifts (m) at (-x-y, +x-y, +x+y, -x+y); edge = (side, lift) curls a whole edge ('x-', 'x+', 'y-',
    'y+'); bow lifts both long ends (a sheet that was rolled)."""
    rng = random.Random(seed)
    wv = waves(rng, wave)

    def f(x, y):
        u, v = 2 * x / w, 2 * y / h
        z = wv(x, y)
        for (sx, sy), c in zip(((-1, -1), (1, -1), (1, 1), (-1, 1)), corners):
            if c:
                z += c * (max(0.0, (sx * u + sy * v) / 2.0 - 0.35) / 0.65) ** 2.2
        if edge:
            side, c = edge
            t = {"x-": -u, "x+": u, "y-": -v, "y+": v}[side]
            z += c * max(0.0, (t - 0.55) / 0.45) ** 2
        if bow:
            z += bow * v * v
        return z
    return f


def trifold_shape(w, h, seed, up=(8.0, 5.0)):
    """A letter folded in three and opened out: the middle panel flat, the outer panels rising from the creases
    (degrees), a slight ridge along each crease."""
    rng = random.Random(seed)
    wv = waves(rng, 0.0004)
    a_top, a_bot = math.tan(math.radians(up[0])), math.tan(math.radians(up[1]))

    def f(x, y):
        z = wv(x, y)
        if y > h / 6:
            z += a_top * (y - h / 6) * (1.0 + 0.25 * x / w)
        if y < -h / 6:
            z += a_bot * (-h / 6 - y) * (1.0 - 0.3 * x / w)
        z += 0.0007 * math.exp(-((abs(y) - h / 6) / 0.0035) ** 2)
        return z
    return f


# ---------------------------------------------------------------- the items

def sheet(name, m, w, h, x, y, turn, thick=0.00022, step=0.005, shape=None, stiff=6):
    nx, ny = max(2, round(w / step)), max(2, round(h / step))
    if shape == "trifold":
        ny = 3 * max(1, round(h / step / 3))
        shape = trifold_shape(w, h, hash(name) % 997)
    return place_flat(name, grid_bm(w, h, nx, ny), frame(x, y, turn), m, thick, shape=shape, stiff=stiff)


def photo_print(name, m, w, h, x, y, turn, curl=0.0016, seed=1, stiff=60):
    """A print curls toward its face along its long side. A print is stiff card: where it lies across another print's
    edge it rides over it as a gentle ramp (many smoothing passes), not a crease."""
    rng = random.Random(seed)
    wv = waves(rng, 0.0002)
    long_x = w >= h

    def f(px, py):
        t = (2 * px / w) if long_x else (2 * py / h)
        return curl * t * t + wv(px, py)
    return place_flat(name, grid_bm(w, h, max(2, round(w / 0.004)), max(2, round(h / 0.004))), frame(x, y, turn), m,
                      0.0003, shape=f, stiff=stiff)


def manila_folder(name, m, x, y, turn, w=0.30, d=0.235, tab=(0.02, 0.12)):
    """An open top-tab folder: two panels either side of the fold (local x along the fold, panels at +-y), the
    scored fold standing a little proud, the back panel's cut tab beyond its far edge."""
    rng = random.Random(11)
    wv = waves(rng, 0.0005, 0.2)

    def f(px, py):
        z = 0.0032 * math.exp(-(py / 0.011) ** 2) + 0.0012 * math.exp(-((abs(py) - 0.009) / 0.003) ** 2)
        z += 0.0025 * (abs(py) / d) ** 2.5 + wv(px, py)
        return z
    mw = frame(x, y, turn)
    body = place_flat(name, grid_bm(w, 2 * d, 60, 120), mw, m, 0.00038, shape=f, stiff=4)
    t0, t1 = tab
    tx0, tx1 = -w / 2 + t0, -w / 2 + t1
    pts = [(tx0, d - 0.0008), (tx1, d - 0.0008), (tx1 - 0.006, d + 0.0125), (tx0 + 0.006, d + 0.0125)]
    SUPPORT.remove(body)
    tabob = place_flat(name + "_tab", outline_bm(pts, 0.003), mw, m, 0.00038, shape=lambda px, py: f(px, d) - 0.00005, stiff=0,
                       normalize=False)
    SUPPORT.insert(len(SUPPORT) - 1, body)
    return body, tabob


def envelope(name, m, x, y, turn, w=0.229, h=0.162, puff=0.0028):
    """A sealed C5 envelope lying flap up: the body puffed by what is inside, the bottom and side flaps' seams, the
    sealed top flap a layer above."""
    mw = frame(x, y, turn)

    def body_shape(px, py):
        u, v = 2 * px / w, 2 * py / h
        return puff * max(0.0, 1 - u ** 6) * max(0.0, 1 - v ** 4)
    body = place_flat(name, grid_bm(w, h, 56, 40), mw, m, 0.00045, shape=body_shape, stiff=3)
    # bottom flap: a trapezoid from the bottom edge up past the middle (its seams run to the corners)
    bot = [(-w / 2 + 0.002, -h / 2 + 0.001), (w / 2 - 0.002, -h / 2 + 0.001), (w / 2 - 0.004, -h / 2 + 0.006),
           (0.035, 0.018), (-0.035, 0.018), (-w / 2 + 0.004, -h / 2 + 0.006)]
    b = place_flat(name + "_bottom", outline_bm(bot, 0.005), mw, m, 0.00018, stiff=1)
    # sealed top flap: the pointed flap folded down over it
    top = [(-w / 2 + 0.001, h / 2 - 0.0005), (-w / 2 + 0.006, h / 2 - 0.006), (-0.02, -0.012), (0.0, -0.016),
           (0.02, -0.012), (w / 2 - 0.006, h / 2 - 0.006), (w / 2 - 0.001, h / 2 - 0.0005)]
    t = place_flat(name + "_flap", outline_bm(top[::-1] if _area(top) < 0 else top, 0.005), mw, m, 0.00018, stiff=1)
    return body, b, t


def _area(pts):
    return 0.5 * sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]))


def _rounded_rect(bm, w, h, r, z0, z1, segs=6):
    """A prism with rounded corners from z0 to z1, centred on the origin, into bm. Returns its faces."""
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for k in range(segs + 1):
            a = math.radians(a0 + 90 * k / segs)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    bot = [bm.verts.new((x, y, z0)) for x, y in pts]
    top = [bm.verts.new((x, y, z1)) for x, y in pts]
    fs = [bm.faces.new(top), bm.faces.new(bot[::-1])]
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        fs.append(bm.faces.new((bot[i], bot[j], top[j], top[i])))
    return fs


# ---------------------------------------------------------------- small hard props

def _resting(mw_xy, half_len, r, n=13):
    """A round bar of radius r lying along local x (half length half_len): its centre height and pitch (radians,
    + lifts the +x end) resting on the support at its lowest."""
    samples = [(-half_len + 2 * half_len * k / (n - 1), dy) for k in range(n) for dy in (-r * 0.5, 0.0, r * 0.5)]
    z0, a, _ = settle(mw_xy, samples, 10.0, 0.2)
    return z0 + r, math.atan(a)


def _solid_of_revolution(name, profile, m, segs=48):
    """A lathe: profile = [(radius, z), ...] round local Z, capped where radius is 0."""
    bm = bmesh.new()
    rings = []
    for rr, zz in profile:
        if rr < 1e-6:
            rings.append([bm.verts.new((0.0, 0.0, zz))])
        else:
            rings.append([bm.verts.new((rr * math.cos(2 * math.pi * k / segs), rr * math.sin(2 * math.pi * k / segs), zz)) for k in range(segs)])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for k in range(segs):
                bm.faces.new((a[0], b[k], b[(k + 1) % segs]))
        elif len(b) == 1:
            for k in range(segs):
                bm.faces.new((a[(k + 1) % segs], a[k], b[0]))
        else:
            for k in range(segs):
                bm.faces.new((a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = link(bpy.data.objects.new(name, me))
    ob.data.materials.append(m)
    return ob


def pen(name, m_body, m_tip, m_clip, x, y, turn):
    """A plain capped ballpoint, 143 mm, lying on its side: body, cap with clip, a metal tip ring. No print."""
    L, r = 0.143, 0.0046
    mw = frame(x, y, turn)
    z, pitch = _resting(mw, L / 2, r)
    prof = [(0.0, -L / 2), (0.0011, -L / 2 + 0.0003), (0.0016, -L / 2 + 0.003), (0.0028, -L / 2 + 0.009), (r * 0.92, -L / 2 + 0.02),
            (r, -L / 2 + 0.03), (r, L / 2 - 0.006), (r * 0.9, L / 2 - 0.0015), (r * 0.6, L / 2), (0.0, L / 2)]
    body = _solid_of_revolution(name, prof, m_body, 32)
    ring = _solid_of_revolution(name + "_ring", [(0.0, -0.0001), (r * 1.02, 0.0), (r * 1.02, 0.0016), (0.0, 0.0017)], m_tip, 32)
    ring.location = (0, 0, -L / 2 + 0.035)
    tip = _solid_of_revolution(name + "_tip", [(0.0, -L / 2 - 0.0012), (0.0006, -L / 2 - 0.0006), (0.0011, -L / 2 + 0.0004), (0.0, -L / 2 + 0.0004)], m_tip, 16)
    clip = bpy.data.objects.new(name + "_clip", bpy.data.meshes.new(name + "_clip"))
    link(clip)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0.0, r + 0.0011, L / 2 - 0.028)) @ Matrix.Diagonal((0.0032, 0.0013, 0.042, 1)))
    bm.to_mesh(clip.data)
    bm.free()
    clip.data.materials.append(m_clip)
    bv = clip.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments = 0.0005, 2
    root = link(bpy.data.objects.new(name + "_root", None))
    # the pen lies along local x: its own axis (Z) turned to X, rolled so the clip sits a little off the top
    root.matrix_world = Matrix.Translation((x, y, z)) @ Matrix.Rotation(math.radians(turn), 4, "Z") @ \
        Matrix.Rotation(-pitch, 4, "Y") @ Matrix.Rotation(math.radians(90), 4, "Y") @ Matrix.Rotation(math.radians(30), 4, "Z")
    for o in (body, ring, tip, clip):
        o.parent = root
    return [root, body, ring, tip, clip]


def paper_clip(name, m, x, y, turn, z=None):
    """A 33 mm gem clip lying flat (a wire curve)."""
    r = 0.00042
    pts2 = [(0.0, 0.0), (0.024, 0.0), (0.028, 0.0035), (0.024, 0.0068), (-0.004, 0.0068), (-0.0075, 0.0034),
            (-0.004, 0.0009), (0.019, 0.0009), (0.0215, 0.0034), (0.019, 0.0058), (0.0035, 0.0058)]
    mw = frame(x, y, turn)
    if z is None:
        tree = support_tree(_footprint(mw, [(-0.01, -0.002), (0.03, 0.008)]))
        z = max(drop(tree, mw @ Vector((px, py, 0))) for px, py in pts2[:6]) + r
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution, cu.resolution_u = "3D", r, 3, 6
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts2) - 1)
    for p, (px, py) in zip(sp.points, pts2):
        p.co = (px, py, 0.0, 1.0)
    ob = link(bpy.data.objects.new(name, cu))
    ob.data.materials.append(m)
    ob.matrix_world = frame(x, y, turn, z)
    return ob


def mug(name, m_glaze, m_foot, m_coffee, x, y, turn):
    """A stoneware mug, 85 mm across, 95 mm tall, glazed inside and out with a bare foot ring, coffee in it, the
    handle a D of glazed clay."""
    R, H, t = 0.0425, 0.095, 0.0045
    outer = [(0.0, 0.0), (R - 0.006, 0.0), (R - 0.003, 0.0012), (R - 0.0015, 0.006), (R, 0.012), (R, H - 0.004), (R - 0.0006, H - 0.0008),
             (R - t * 0.5, H), (R - t + 0.0006, H - 0.0008), (R - t, H - 0.004), (R - t, 0.012), (R - t - 0.004, t + 0.002), (0.0, t + 0.0015)]
    body = _solid_of_revolution(name, outer, m_glaze, 64)
    body.data.materials.append(m_foot)
    for p in body.data.polygons:           # the unglazed foot ring
        c = p.center
        if c.z < 0.0035 and math.hypot(c.x, c.y) > R - 0.009:
            p.material_index = 1
    coffee = _solid_of_revolution(name + "_coffee", [(0.0, H - 0.024), (R - t - 0.0002, H - 0.024), (R - t - 0.0002, H - 0.0255), (0.0, H - 0.0255)], m_coffee, 64)
    cu = bpy.data.curves.new(name + "_handle", "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution, cu.resolution_u = "3D", 0.0052, 4, 12
    sp = cu.splines.new("BEZIER")
    hp = [(R - 0.003, 0.0, H - 0.017), (R + 0.022, 0.0, H - 0.026), (R + 0.026, 0.0, H - 0.05), (R + 0.016, 0.0, H - 0.07), (R - 0.003, 0.0, H - 0.076)]
    sp.bezier_points.add(len(hp) - 1)
    for bp, co in zip(sp.bezier_points, hp):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    handle = link(bpy.data.objects.new(name + "_handle", cu))
    handle.data.materials.append(m_glaze)
    handle.scale = (1.0, 1.35, 1.0)
    mw = frame(x, y, turn)
    tree = support_tree(_footprint(mw, [(-R, -R), (R, R)]))
    z = max(drop(tree, mw @ Vector((R * 0.8 * math.cos(a), R * 0.8 * math.sin(a), 0))) for a in (0, 1.6, 3.1, 4.7))
    root = link(bpy.data.objects.new(name + "_root", None))
    root.matrix_world = frame(x, y, turn, z)
    for o in (body, coffee, handle):
        o.parent = root
    return [root, body, coffee, handle]


# ---------------------------------------------------------------- made for Tim's desk

def envelope_front(name, m, x, y, turn, w=0.241, h=0.105, puff=0.002, seed=1):
    """An envelope lying address side up (no flaps on this face): one puffed panel, a little cockled."""
    rng = random.Random(seed)
    wv = waves(rng, 0.0004, 0.12)

    def body_shape(px, py):
        u, v = 2 * px / w, 2 * py / h
        return puff * max(0.0, 1 - u ** 6) * max(0.0, 1 - v ** 4) + wv(px, py)
    return place_flat(name, grid_bm(w, h, max(8, round(w / 0.005)), max(6, round(h / 0.005))), frame(x, y, turn), m, 0.0005,
                      shape=body_shape, stiff=3)


def _slab_stack(name, mats, w, h, n, seed, thick=(0.0013, 0.002), slip=0.004, twist=2.5, z0=0.0):
    """n envelopes as thin bevelled slabs stacked from z0 up in one mesh (local frame), each slipped and turned a
    little; mats cycle per slab. Returns (object, height)."""
    rng = random.Random(seed)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    z = z0
    spans = []
    for i in range(n):
        t = rng.uniform(*thick)
        mat = (Matrix.Translation((rng.uniform(-slip, slip), rng.uniform(-slip, slip), z + t / 2)) @
               Matrix.Rotation(math.radians(rng.uniform(-twist, twist)), 4, "Z") @ Matrix.Diagonal((w - rng.uniform(0.0, 0.004), h - rng.uniform(0.0, 0.003), t * 0.82, 1)))
        before = len(bm.faces)
        bmesh.ops.create_cube(bm, size=1.0, matrix=mat)
        bm.faces.ensure_lookup_table()
        inv = mat.inverted()
        sx, sy = mat.to_scale().x, mat.to_scale().y
        for f in bm.faces[before:]:
            f.material_index = i % len(mats)
            for lp in f.loops:                     # each envelope's own coordinates (metres from its centre)
                lc = inv @ lp.vert.co
                lp[uv].uv = (lc.x * sx, lc.y * sy)
        z += t
        spans.append(z)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = link(bpy.data.objects.new(name, me))
    for m in mats:
        ob.data.materials.append(m)
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = 0.0004, 2, "ANGLE"
    ob.modifiers.new("wn", "WEIGHTED_NORMAL")
    return ob, z - z0


def bundle(name, mats, m_band, x, y, turn, n=16, w=0.19, h=0.11, seed=4, band_at=0.012):
    """A bundle of n envelopes kept together with a rubber band round its middle (across the short side), resting
    on the desk. The band is a thin loop that bites the stack's edges a little. Returns the parts."""
    mw = frame(x, y, turn)
    tree = support_tree(_footprint(mw, [(-w / 2, -h / 2), (w / 2, h / 2)]))
    z = max(drop(tree, mw @ Vector((px, py, 0.0))) for px in (-w / 2, 0.0, w / 2) for py in (-h / 2, 0.0, h / 2))
    ob, height = _slab_stack(name, mats, w, h, n, seed)
    ob.matrix_world = frame(x, y, turn, z + 0.00005)
    hh, r = h / 2 - 0.0015, 0.0011
    top = height + r * 0.6
    pts = [(band_at, -hh, 0.004), (band_at, -hh - r, height * 0.5), (band_at, -hh + 0.002, top), (band_at + 0.002, 0.0, top + 0.0002),
           (band_at + 0.001, hh - 0.002, top), (band_at, hh + r, height * 0.5), (band_at, hh, 0.004), (band_at, 0.0, r * 0.5)]
    cu = bpy.data.curves.new(name + "_band", "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution, cu.resolution_u = "3D", r, 3, 8
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts):
        p.co = (*co, 1.0)
    sp.use_cyclic_u = True
    band = link(bpy.data.objects.new(name + "_band", cu))
    band.data.materials.append(m_band)
    band.scale = (2.6, 1.0, 1.0)            # a flat band, 6 mm wide
    band.matrix_world = frame(x, y, turn, z + 0.00005) @ Matrix.Translation((band_at * (1 - 2.6), 0, 0)) @ Matrix.Diagonal((2.6, 1.0, 1.0, 1.0))
    SUPPORT.append(ob)
    return [ob, band], z + height


def loose_stack(name, mats, x, y, turn, n=6, w=0.19, h=0.11, seed=7, slip=0.014, twist=9.0):
    """A handful of envelopes dropped in a loose pile: slipped and fanned more than a bundle."""
    mw = frame(x, y, turn)
    tree = support_tree(_footprint(mw, [(-w / 2, -h / 2), (w / 2, h / 2)]))
    z = max(drop(tree, mw @ Vector((px, py, 0.0))) for px in (-w / 2, 0.0, w / 2) for py in (-h / 2, 0.0, h / 2))
    ob, height = _slab_stack(name, mats, w, h, n, seed, slip=slip, twist=twist)
    ob.matrix_world = frame(x, y, turn, z + 0.00005)
    SUPPORT.append(ob)
    return ob, z + height


def writing_pad(name, m_sheet, m_block, m_board, m_tape, x, y, turn, w=0.216, h=0.298, block=0.0055, seed=5, corner=0.007):
    """A ruled writing pad, bound at its head (local +y): the chipboard back, the block of sheets (its edges the
    leaves), a cloth tape over the binding, and the top sheet lying on the block with its near corner lifted.
    Returns (parts, top sheet)."""
    mw = frame(x, y, turn)
    tree = support_tree(_footprint(mw, [(-w / 2, -h / 2), (w / 2, h / 2)]))
    z = max(drop(tree, mw @ Vector((px, py, 0.0))) for px in (-w / 2, 0.0, w / 2) for py in (-h / 2, 0.0, h / 2))
    base = frame(x, y, turn, z + 0.00005)
    parts = []
    for tag, size, loc, m, bev in (("board", (w + 0.002, h + 0.002, 0.0012), (0, 0, 0.0006), m_board, 0.0003),
                                   ("block", (w, h, block), (0, 0, 0.0012 + block / 2), m_block, 0.0002),
                                   ("tape", (w + 0.0006, 0.024, block + 0.0019), (0, h / 2 - 0.0117, (block + 0.0019) / 2 + 0.0002), m_tape, 0.0006)):
        me = bpy.data.meshes.new(f"{name}_{tag}")
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(loc) @ Matrix.Diagonal((*size, 1)))
        bm.to_mesh(me)
        bm.free()
        ob = link(bpy.data.objects.new(me.name, me))
        ob.data.materials.append(m)
        ob.matrix_world = base
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments, bv.limit_method = bev, 2, "ANGLE"
        ob.modifiers.new("wn", "WEIGHTED_NORMAL")
        for p in me.polygons:
            p.use_smooth = True
        parts.append(ob)
    SUPPORT.extend(parts[:2])
    # the top sheet: held under the tape at its head, its near right corner (toward the writer's hand) lifted
    sh = h - 0.024
    shape = sheet_shape(w - 0.001, sh, seed, corners=(0.0, corner, 0.0, 0.0), wave=0.0005)
    top = place_flat(name + "_sheet", grid_bm(w - 0.001, sh, 44, 56), base @ Matrix.Translation((0, -0.012, 0)), m_sheet, 0.00018,
                     shape=shape, stiff=4)
    parts.append(top)
    SUPPORT.append(parts[2])
    return parts, top
