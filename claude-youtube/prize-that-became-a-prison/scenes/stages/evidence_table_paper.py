"""Paper props and small things for the evidence table, built in Python: sheets with real thickness, curl and folds,
dropped onto whatever lies under them; photographic prints with white borders; boarding passes with a perforated
stub; a thermal receipt with a torn edge that curls; a sealed envelope; an open manila folder; a plain passport
booklet; a pen, a highlighter, a paper clip and a mug. Every face is blank (graphics are composited later).

A flat item is a grid in its own XY plane (object space = position on the sheet, so materials can key on it). It
is placed by a world matrix (a turn about Z and a position on the table), then each vertex is dropped by a ray onto
the table and everything already placed; the support is smoothed so stiff paper ramps over an edge instead of
following it, then the item's own rest shape (curl, folds, puff) is added, and a Solidify gives it thickness.
"""
import math
import random
from zlib import crc32

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


def receipt_shape(w, h, radius, cup=0.0015, seed=3):
    """Thermal paper rolled for days: the strip arcs up toward both ends round a radius, and cups across."""
    rng = random.Random(seed)
    y0 = rng.uniform(-0.15, 0.15) * h

    def f(x, y):
        d = min(abs(y - y0), radius * 0.95)
        z = radius - math.sqrt(radius * radius - d * d)
        z += cup * (2 * x / w) ** 2
        return z
    return f


# ---------------------------------------------------------------- the items

def sheet(name, m, w, h, x, y, turn, thick=0.00022, step=0.005, shape=None, stiff=6):
    nx, ny = max(2, round(w / step)), max(2, round(h / step))
    if shape == "trifold":
        ny = 3 * max(1, round(h / step / 3))
        shape = trifold_shape(w, h, crc32(name.encode()) % 997)
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


def boarding_pass(name, m, x, y, turn, seed=2, lift=0.0025, perf=0.0545):
    """203 x 82 mm card with its stub at +x, beyond the perforation at local x = perf. The stub has been bent along
    the perforation (half torn): it rises from that line like a hinge, lift at its far end, a little twisted."""
    w, h = 0.203, 0.082
    sh0 = sheet_shape(w, h, seed, corners=(0.0, 0.0, lift * 0.15, 0.0), wave=0.0006, bow=0.0)
    span = w / 2 - perf

    def sh(px, py):
        z = sh0(px, py)
        if px > perf:
            t = (px - perf) / span
            z += lift * (t ** 1.15) * (1.0 + 0.22 * py / (h / 2))
        return z
    return place_flat(name, grid_bm(w, h, 52, 21), frame(x, y, turn), m, 0.00028, shape=sh, stiff=8)


def receipt(name, m, x, y, turn, w=0.08, L=0.24, roll=0.07, roll_deg=200.0, r0=0.024, cup=0.0028, seed=5):
    """A till receipt that has spent days rolled up: an 80 x 240 mm thermal strip 0.06 mm thick lying on the table,
    its last `roll` metres rolled back up over itself into a tightening curl (radius r0 easing in, about roll_deg of
    turn), the other end lifting slightly, cupped across its width, and that end torn on the cutter's teeth (a 1 mm
    zig-zag). Built along local y (the roll at +y); placed on whatever is under its flat part."""
    rng = random.Random(seed)
    nx, ns = 80, 170
    ds = L / ns
    s_roll = L - roll
    ramp = 0.015
    k_end = 1.0 / 0.06                          # the flat end's memory curl
    # the strip's centre line: curvature along its length, integrated both ways from where it lies on the table
    theta_total = math.radians(roll_deg)
    # curvature of the roll grows as it tightens; scale it so the whole roll turns theta_total
    def kappa_raw(s):
        if s < 0.025:                           # concave up, like the roll: the end lifts off the table
            return k_end * (1.0 - s / 0.025) ** 1.5
        if s < s_roll:
            return 0.0
        u = s - s_roll
        k = (1.0 / r0) * (1.0 + 0.6 * u / roll)
        return k * min(1.0, u / ramp) ** 1.5
    tot = sum(kappa_raw(s_roll + (i + 0.5) * roll / 400) for i in range(400)) * roll / 400
    kscale = theta_total / tot
    kappa = lambda s: kappa_raw(s) * (kscale if s >= s_roll else 1.0)   # noqa: E731
    s_flat = 0.025
    yy = [0.0] * (ns + 1)
    zz = [0.0] * (ns + 1)
    th = [0.0] * (ns + 1)
    i0 = round(s_flat / ds)
    yy[i0] = i0 * ds - L / 2
    for i in range(i0, ns):                      # forward into the roll
        s = (i + 0.5) * ds
        t_mid = th[i] + 0.5 * kappa(s) * ds
        yy[i + 1] = yy[i] + math.cos(t_mid) * ds
        zz[i + 1] = zz[i] + math.sin(t_mid) * ds
        th[i + 1] = th[i] + kappa(s) * ds
    for i in range(i0, 0, -1):                   # back toward the lifted flat end
        s = (i - 0.5) * ds
        t_mid = th[i] - 0.5 * kappa(s) * ds
        yy[i - 1] = yy[i] - math.cos(t_mid) * ds
        zz[i - 1] = zz[i] - math.sin(t_mid) * ds
        th[i - 1] = th[i] - kappa(s) * ds
    bm = bmesh.new()
    rows = []
    teeth = [(0.0005 if k % 2 else -0.0005) + rng.uniform(-0.00012, 0.00012) for k in range(nx + 1)]
    for j in range(ns + 1):
        row = []
        ny_, nz_ = -math.sin(th[j]), math.cos(th[j])     # the strip's normal in the y-z plane
        for i in range(nx + 1):
            px = (i / nx - 0.5) * w
            c = cup * (2 * px / w) ** 2 * (1.0 if j <= i0 else max(0.25, 1.0 - (j - i0) * ds / roll))
            py, pz = yy[j] + ny_ * c, zz[j] + nz_ * c
            if j == 0:                            # the torn end: the teeth stick out along the strip
                py += teeth[i] * math.cos(th[0])
                pz += teeth[i] * math.sin(th[0])
            if i in (0, nx):
                px += rng.uniform(-0.00008, 0.00008)
            row.append(bm.verts.new((px, py, pz)))
        rows.append(row)
    for j in range(ns):
        for i in range(nx):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    mw = frame(x, y, turn)
    tree = support_tree(_footprint(mw, [(-w / 2, -L / 2), (w / 2, L / 2)]))
    base = max(drop(tree, mw @ Vector((px, py, 0.0))) for px in (-w / 2, 0.0, w / 2) for py in (-L / 4, 0.0, L / 4))
    zmin = min(v.co.z for v in bm.verts)
    for v in bm.verts:
        v.co.z += base - TOP + 0.00006 - min(0.0, zmin)
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
    so.thickness, so.offset, so.use_even_offset, so.use_quality_normals = 0.00006, 1.0, True, True
    SUPPORT.append(ob)
    print(f"PAPER {name}: roll height {max(zz) * 1000:.1f} mm, end turn {math.degrees(th[-1]):.0f} deg, flat end lift {zz[0] * 1000:.1f} mm",
          flush=True)
    return ob


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


def passport(name, m_cover, m_pages, x, y, turn, open_deg=2.5, m_end=None, m_slip=None):
    """A plain passport booklet, 125 x 88 mm: two covers of grained board (rounded corners) wrapped round a rounded
    spine at -x, the cream page block (3.5 mm) inset 1.5 mm between them, the front cover hinged at the spine and
    sprung open open_deg so a wedge of the page block and the cover's cream lining shows toward the fore-edge. No
    crest, no lettering. It settles on whatever is under it."""
    w, h, T = 0.088, 0.125, 0.0052
    cov, r = 0.00090, 0.0036
    mw = frame(x, y, turn)
    samples = [(-w / 2 * 0.97 + w * 0.97 * i / 8, -h / 2 * 0.95 + h * 0.95 * j / 6) for i in range(9) for j in range(7)]
    z0, a, b = settle(mw, samples, 4.0)
    mw = frame(x, y, turn, z0 + 0.00005) @ tilt_matrix(a, b)
    # The torn stub can lift between the coarse tilt samples. Check the finished
    # bottom plane across the whole cover before seating it.
    under = support_tree(_footprint(mw, samples, 0.012))
    lift = 0.0
    for i in range(25):
        for j in range(33):
            point = mw @ Vector((w * (i / 24 - 0.5), h * (j / 32 - 0.5), 0))
            lift = max(lift, drop(under, point) - point.z + 0.00010)
    mw.translation = mw.translation + Vector((0, 0, lift))
    z0 += lift
    print(f"PAPER {name} settles at {(z0 - TOP) * 1000:.2f} mm, tilt {math.degrees(math.atan(a)):+.2f} / {math.degrees(math.atan(b)):+.2f} deg",
          flush=True)
    parts = []
    # back cover
    bm = bmesh.new()
    _rounded_rect(bm, w, h, r, 0.0, cov)
    parts.append(("back", bm, m_cover))
    # page block, inset 1.5 mm at head, tail and fore-edge, flush at the spine
    bm = bmesh.new()
    _rounded_rect(bm, w - 0.0015, h - 0.003, r * 0.75, cov, T - cov)
    bmesh.ops.translate(bm, verts=bm.verts[:], vec=(-0.00075, 0.0, 0.0))
    parts.append(("pages", bm, m_pages))
    # front cover, hinged at the spine and lifted at the fore-edge; its underside is lined with cream endpaper
    bm = bmesh.new()
    fs = _rounded_rect(bm, w, h, r, T - cov, T)
    if m_end is not None:
        fs[1].material_index = 1
    # Press the hinge into the cover and bow the board between the binding and fore-edge.
    # Crosscuts give the broad cover actual curvature under the moving highlight.
    for abscissa in (-w / 2 + 0.004, -w / 2 + 0.007, -w / 2 + 0.010, -0.018, 0.0, 0.022, 0.036):
        bmesh.ops.bisect_plane(bm, geom=[*bm.verts, *bm.edges, *bm.faces], dist=1e-7,
                               plane_co=(abscissa, 0, 0), plane_no=(1, 0, 0))
    for vert in bm.verts:
        u = (vert.co.x + w / 2) / w
        crease = math.exp(-((u * w - 0.007) / 0.0022) ** 2)
        vert.co.z += 0.0017 * math.sin(math.pi * u) - 0.00055 * crease
    hinge = Vector((-w / 2 + 0.002, 0.0, T - cov))
    rot = Matrix.Translation(hinge) @ Matrix.Rotation(math.radians(-open_deg), 4, "Y") @ Matrix.Translation(-hinge)
    bmesh.ops.transform(bm, matrix=rot, verts=bm.verts[:])
    parts.append(("front", bm, m_cover))
    # A blank boarding slip protrudes at one corner under the sprung cover.
    if m_slip is not None and m_end is not None:
        # Five thin leaves spring away from the bound block. Their staggered edges and
        # narrow shadows remain visible across the opening in the close-up.
        for index, fraction in enumerate((0.12, 0.25, 0.40, 0.55, 0.70)):
            leaf = bmesh.new()
            _rounded_rect(leaf, w - 0.0021 - index * 0.0003, h - 0.0028, r * 0.74,
                          T - cov + 0.00010, T - cov + 0.00020)
            leaf_rot = Matrix.Rotation(math.radians(-open_deg * fraction), 3, "Y")
            for vert in leaf.verts:
                vert.co = hinge + leaf_rot @ (vert.co - hinge)
            parts.append((f"leaf_{index}", leaf, m_end))
        slip = bmesh.new()
        _rounded_rect(slip, 0.075, 0.042, 0.0004, T - cov, T - cov + 0.00015)
        insert_x = w / 2 - 0.0105
        for xcut in (0.0105, 0.017, 0.024, 0.031):
            bmesh.ops.bisect_plane(slip, geom=[*slip.verts, *slip.edges, *slip.faces], dist=1e-8,
                                   plane_co=(xcut, 0, 0), plane_no=(1, 0, 0))
        table = support_tree((x - 0.13, y - 0.13, x + 0.13, y + 0.13))
        inv = mw.inverted()
        for vert in slip.verts:
            vert.co += Vector((insert_x, -0.015, 0.00020))
            free = max(0.0, min(1.0, (vert.co.x - w / 2) / 0.027))
            if free:
                pt = mw @ vert.co
                contact = drop(table, pt)
                landing = (inv @ Vector((pt.x, pt.y, contact + 0.0002))).z
                vert.co.z += (landing - (T - cov)) * free ** 1.35
        parts.append(("slip", slip, m_slip))
    # the spine: a half round of cover stock joining the boards
    bm = bmesh.new()
    seg = 10
    ring = []
    for k in range(seg + 1):
        a = math.pi / 2 + math.pi * k / seg
        ring.append((-w / 2 + 0.0026 + (T / 2) * math.cos(a) * 0.9, T / 2 + (T / 2) * math.sin(a)))
    yy = h / 2 - r * 0.5
    a_ = [bm.verts.new((px, -yy, pz)) for px, pz in ring]
    b_ = [bm.verts.new((px, yy, pz)) for px, pz in ring]
    for i in range(seg):
        bm.faces.new((a_[i], a_[i + 1], b_[i + 1], b_[i]))
    parts.append(("spine", bm, m_cover))
    obs = []
    for tag, bm_, mat in parts:
        me = bpy.data.meshes.new(f"{name}_{tag}")
        bm_.to_mesh(me)
        bm_.free()
        ob = link(bpy.data.objects.new(f"{name}_{tag}", me))
        ob.matrix_world = mw
        ob.data.materials.append(mat)
        if tag == "front" and m_end is not None:
            ob.data.materials.append(m_end)
        if tag == "spine":
            so = ob.modifiers.new("t", "SOLIDIFY")
            so.thickness, so.offset = cov, 1.0
            for p in me.polygons:
                p.use_smooth = True
        else:
            bv = ob.modifiers.new("bevel", "BEVEL")
            bv.width, bv.segments, bv.limit_method = (0.00035 if tag != "pages" else 0.00015), 2, "ANGLE"
            ob.modifiers.new("wn", "WEIGHTED_NORMAL")
            for p in me.polygons:
                p.use_smooth = True
        obs.append(ob)
    SUPPORT.extend(obs)
    return obs


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


def highlighter(name, m_body, m_cap, x, y, turn):
    """A chunky highlighter (no print): oval body, a cap with a stepped grip, lying on its flat side."""
    L, r = 0.122, 0.0082
    mw = frame(x, y, turn)
    z, pitch = _resting(mw, L / 2, r * 0.82)
    body = _solid_of_revolution(name, [(0.0, -L / 2), (r * 0.8, -L / 2 + 0.0008), (r * 0.97, -L / 2 + 0.006), (r, -L / 2 + 0.012),
                                       (r, L / 2 - 0.046), (r * 0.94, L / 2 - 0.044), (r * 0.94, L / 2 - 0.04), (0.0, L / 2 - 0.04)], m_body, 40)
    cap = _solid_of_revolution(name + "_cap", [(0.0, L / 2 - 0.0425), (r * 1.04, L / 2 - 0.0425), (r * 1.05, L / 2 - 0.012), (r * 0.95, L / 2 - 0.003),
                                              (r * 0.7, L / 2), (0.0, L / 2)], m_cap, 40)
    for o in (body, cap):
        o.scale = (1.0, 0.82, 1.0)
    root = link(bpy.data.objects.new(name + "_root", None))
    root.matrix_world = Matrix.Translation((x, y, z)) @ Matrix.Rotation(math.radians(turn), 4, "Z") @ \
        Matrix.Rotation(-pitch, 4, "Y") @ Matrix.Rotation(math.radians(90), 4, "Y") @ Matrix.Rotation(math.radians(90), 4, "Z")
    for o in (body, cap):
        o.parent = root
    return [root, body, cap]


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
