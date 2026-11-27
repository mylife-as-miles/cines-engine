"""The departure gate's airliners, the jet bridge and the apron flood masts (round 2 rebuild).

The fuselage is a loft, not a lathe: a 3.9 m barrel and a 6 m drooped nose whose crown, belly and half-width each
follow their own monotone curve, so the tip sits at 38 % of the body's height, the belly stays full and the crown
sweeps down over the windscreen. The flight-deck glazing is six panes on one straight sill line, cast onto the skin
(two near-rectangular windscreens from the front, two trapezoid side panes each side from the side), near-black
glossy glass in a proud dark gasket. The paint (departure_gate_mats.fuselage) carries the radome seam, the door
outlines and faint panel lines on the skin's UVs, which are in metres (u around at the full radius, v along).

    aircraft(name, nose, heading, ...)   jet_bridge()   mast(i, x, y, target, ...)

Every part is built in the aircraft root's frame (nose tip at the origin, body along +Y, the apron at z 0).
"""
import math
import random

import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

R = 1.95                 # barrel radius (3.9 m)
ZC = 4.25                # axis above the apron: the belly 2.3 m up at the nose gear
NOSE_L = 6.0
BODY_END, TAIL_L = 29.5, 8.4
SILL = 0.42              # the flight deck's sill line, above the axis
DOOR_Y = 6.9             # forward doors (L1 / R1): centre, metres aft of the tip
DOOR_FLOOR = -0.6        # cabin floor (door sill) below the axis
DOOR_H, DOOR_W = 1.9, 1.0

# side profile and plan of the nose (y, value relative to the axis): crown, belly, half-width
_CROWN = [(0.0, -0.47), (0.12, -0.22), (0.45, 0.0), (1.0, 0.17), (1.6, 0.31), (2.0, 0.44), (2.35, 0.75),
          (2.75, 1.08), (3.3, 1.42), (4.1, 1.75), (5.0, 1.92), (6.0, 1.95)]
_BELLY = [(0.0, -0.47), (0.12, -0.74), (0.45, -1.08), (1.0, -1.40), (1.8, -1.66), (2.8, -1.84), (4.0, -1.93),
          (5.0, -1.95), (6.0, -1.95)]
_HALF = [(0.0, 0.0), (0.12, 0.34), (0.45, 0.70), (1.0, 1.05), (1.8, 1.40), (2.8, 1.70), (4.0, 1.88), (5.0, 1.94),
         (6.0, 1.95)]


def _pchip(pts):
    """A monotone cubic through the points (no overshoot): returns f(x)."""
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    n = len(xs)
    h = [xs[i + 1] - xs[i] for i in range(n - 1)]
    d = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [d[0]] + [0.0] * (n - 2) + [0.0]
    for i in range(1, n - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])

    def f(x):
        if x <= xs[0]:
            return ys[0]
        if x >= xs[-1]:
            return ys[-1]
        for i in range(n - 1):
            if x <= xs[i + 1]:
                t = (x - xs[i]) / h[i]
                return ((2 * t ** 3 - 3 * t ** 2 + 1) * ys[i] + (t ** 3 - 2 * t ** 2 + t) * h[i] * m[i]
                        + (-2 * t ** 3 + 3 * t ** 2) * ys[i + 1] + (t ** 3 - t ** 2) * h[i] * m[i + 1])
        return ys[-1]
    return f


crown, belly, half = _pchip(_CROWN), _pchip(_BELLY), _pchip(_HALF)


def section(y):
    """(half-width, axis offset, half-height) of the skin's elliptic section at local y."""
    if y <= NOSE_L:
        top, bot = crown(y), belly(y)
        return half(y), (top + bot) / 2, (top - bot) / 2
    if y <= BODY_END:
        return R, 0.0, R
    t = min(1.0, (y - BODY_END) / TAIL_L)
    r = R - (R - 0.32) * t ** 1.25
    return r, 1.3 * t ** 1.35, r


def skin_xz(y, th):
    w, zc, hh = section(y)
    return w * math.sin(th), ZC + zc + hh * math.cos(th)


# ---------------------------------------------------------------- shared little builders
def _st():
    import departure_gate_set as st
    return st


def _mesh_obj(name, bm, m, parent=None, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if m is not None:
        me.materials.append(m)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    if parent is not None:
        ob.parent = parent
    return ob


def lathe(name, prof, m, parent=None, loc=(0, 0, 0), segs=48, cap=False):
    """A surface of revolution about the local Y axis: `prof` [(y, r)], translated to `loc`."""
    bm = bmesh.new()
    rings = []
    for (y, r) in prof:
        rings.append([bm.verts.new((loc[0] + r * math.sin(2 * math.pi * j / segs), loc[1] + y,
                                    loc[2] + r * math.cos(2 * math.pi * j / segs))) for j in range(segs)])
    for a, b in zip(rings, rings[1:]):
        for j in range(segs):
            j1 = (j + 1) % segs
            bm.faces.new((a[j], a[j1], b[j1], b[j]))
    if cap:
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _mesh_obj(name, bm, m, parent)


# ---------------------------------------------------------------- the fuselage
def fuselage_skin(name, m, parent, segs=96):
    """Nose, barrel and tail cone as one lofted skin with UVs in metres. Returns (object, BVH in the root frame)."""
    ys = [0.012 + (NOSE_L - 0.012) * (k / 40) ** 1.65 for k in range(41)]
    ys += [8.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0, 22.0, 24.0, 26.0, 28.0, BODY_END]
    ys += [BODY_END + TAIL_L * q / 16 for q in range(1, 17)]
    U = 2 * math.pi * R
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    grid = []
    for y in ys:
        ring = []
        for j in range(segs):
            th = 2 * math.pi * j / segs
            x, z = skin_xz(y, th)
            ring.append(bm.verts.new((x, y, z)))
        grid.append(ring)
    tipf = bm.verts.new((0.0, 0.0, ZC + crown(0.0)))
    r_end, zc_end, _ = section(ys[-1])
    tipb = bm.verts.new((0.0, ys[-1] + 0.08, ZC + zc_end))

    def setuv(f, coords):
        for lp, c in zip(f.loops, coords):
            lp[uv].uv = c
    for i in range(len(ys) - 1):
        for j in range(segs):
            j1 = (j + 1) % segs
            f = bm.faces.new((grid[i][j], grid[i][j1], grid[i + 1][j1], grid[i + 1][j]))
            u0, u1 = U * j / segs, U * (j + 1) / segs
            setuv(f, [(u0, ys[i]), (u1, ys[i]), (u1, ys[i + 1]), (u0, ys[i + 1])])
    for j in range(segs):
        j1 = (j + 1) % segs
        f = bm.faces.new((tipf, grid[0][j1], grid[0][j]))
        setuv(f, [(U * (j + 0.5) / segs, 0.0), (U * (j + 1) / segs, ys[0]), (U * j / segs, ys[0])])
        f = bm.faces.new((tipb, grid[-1][j], grid[-1][j1]))
        setuv(f, [(U * (j + 0.5) / segs, ys[-1] + 0.08), (U * j / segs, ys[-1]), (U * (j + 1) / segs, ys[-1])])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    # outward: the crown face at mid-body must point up
    top = max((f for f in bm.faces if 10 < f.calc_center_median().y < 12), key=lambda f: f.calc_center_median().z)
    if top.normal.z < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bvh = BVHTree.FromBMesh(bm)
    ob = _mesh_obj(name, bm, m, parent)
    return ob, bvh


def _cast(bvh, mode, side, a, b, off):
    """Project a point of a pane's drawing onto the skin: `mode` front: (a, b) = (x, z), looked at along +Y;
    side: (a, b) = (y, z), looked at from the `side` (+1 port, +X)."""
    if mode == "front":
        o, d = Vector((a, -40.0, b)), Vector((0.0, 1.0, 0.0))
    else:
        o, d = Vector((side * 40.0, a, b)), Vector((-side, 0.0, 0.0))
    loc, nrm, _, _ = bvh.ray_cast(o, d)
    if loc is None:
        return None
    if nrm.dot(d) > 0:
        nrm = -nrm
    return loc + nrm * off


def _quad_pt(c, s, t):
    """Bilinear point in quad c (bottom-a, bottom-b, top-b, top-a) at s (a->b), t (bottom->top)."""
    b0 = c[0].lerp(c[1], s)
    b1 = c[3].lerp(c[2], s)
    return b0.lerp(b1, t)


def pane(name, corners, mode, side, bvh, off, m, parent, n=(8, 6)):
    """A glass pane drawn as a quad (4 (a, b) corners) and cast onto the skin, `off` metres proud."""
    c = [Vector(p) for p in corners]
    bm = bmesh.new()
    V = []
    for i in range(n[0] + 1):
        row = []
        for k in range(n[1] + 1):
            p = _quad_pt(c, i / n[0], k / n[1])
            h = _cast(bvh, mode, side, p.x, p.y, off)
            row.append(bm.verts.new(h) if h is not None else None)
        V.append(row)
    for i in range(n[0]):
        for k in range(n[1]):
            q = (V[i][k], V[i + 1][k], V[i + 1][k + 1], V[i][k + 1])
            if all(v is not None for v in q):
                bm.faces.new(q)
    _orient(bm, mode, side)
    return _mesh_obj(name, bm, m, parent)


def gasket(name, corners, mode, side, bvh, off, width, m, parent, per=6):
    """A dark seal round a pane: the ring between the quad and the quad grown by `width`, cast onto the skin."""
    c = [Vector(p) for p in corners]
    ctr = sum(c, Vector((0.0, 0.0))) / 4
    g = [p + (p - ctr).normalized() * width * 1.4 for p in c]
    bm = bmesh.new()
    inner, outer = [], []
    for e in range(4):
        for k in range(per):
            t = k / per
            pi_ = c[e].lerp(c[(e + 1) % 4], t)
            po = g[e].lerp(g[(e + 1) % 4], t)
            inner.append(_cast(bvh, mode, side, pi_.x, pi_.y, off))
            outer.append(_cast(bvh, mode, side, po.x, po.y, off))
    vi = [bm.verts.new(p) if p is not None else None for p in inner]
    vo = [bm.verts.new(p) if p is not None else None for p in outer]
    N = len(vi)
    for k in range(N):
        q = (vi[k], vi[(k + 1) % N], vo[(k + 1) % N], vo[k])
        if all(v is not None for v in q):
            bm.faces.new(q)
    _orient(bm, mode, side)
    sol = _mesh_obj(name, bm, m, parent)
    so = sol.modifiers.new("seal", "SOLIDIFY")
    so.thickness, so.offset = 0.012, -1.0
    return sol


def _orient(bm, mode, side):
    view = Vector((0, -1, 0)) if mode == "front" else Vector((side, 0, 0))
    bm.normal_update()
    for f in bm.faces:
        if f.normal.dot(view) < 0:
            f.normal_flip()


def flight_deck(name, bvh, glass, seal, parent):
    """Six panes on one straight sill: two windscreens (drawn from the front) and two side panes each side (drawn
    from the side, raked back, tops descending), each in a proud dark seal."""
    sill = ZC + SILL
    out = []
    for s in (-1, 1):
        ws = [(s * 0.06, sill), (s * 0.68, sill), (s * 0.60, sill + 0.43), (s * 0.06, sill + 0.46)]
        out.append(pane(f"{name}_ws_{s}", ws, "front", s, bvh, 0.006, glass, parent))
        out.append(gasket(f"{name}_ws_seal_{s}", ws, "front", s, bvh, 0.004, 0.035, seal, parent))
        ob = _cast(bvh, "front", s, s * 0.68, sill, 0.0)
        ot = _cast(bvh, "front", s, s * 0.60, sill + 0.43, 0.0)
        y_ob = ob.y if ob is not None else 2.2
        y_ot = ot.y if ot is not None else 2.75
        dv = [(y_ob + 0.15, sill), (y_ob + 0.73, sill), (y_ob + 0.82, sill + 0.36), (y_ot + 0.15, sill + 0.43)]
        rear = [(dv[1][0] + 0.14, sill), (dv[1][0] + 0.64, sill), (dv[1][0] + 0.76, sill + 0.27),
                (dv[2][0] + 0.14, sill + 0.34)]
        for k, q in enumerate((dv, rear)):
            out.append(pane(f"{name}_side_{s}_{k}", q, "side", s, bvh, 0.006, glass, parent))
            out.append(gasket(f"{name}_side_seal_{s}_{k}", q, "side", s, bvh, 0.004, 0.035, seal, parent))
    return out


def aircraft(name, nose, heading=0.0, lit=0.6, seed=1, taxi=False, side=-1, nose_gear=True):
    """A generic narrow-body airliner, no livery: nose tip at `nose` (x, y), body along local +Y, the apron at z 0
    of its root. Cabin windows lit on one side (`side` -1: starboard, local -X; +1: port)."""
    st = _st()
    m = st.materials()
    rng = random.Random(seed)
    root = st.empty(name, (nose[0], nose[1], st.APRON), 0.0)
    P = dict(parent=root)
    paint, belly = m["fuselage"], m["fuselage_dark"]
    _, bvh = fuselage_skin(f"{name}_skin", paint, root)
    flight_deck(name, bvh, m["cockpit_glass"], m["cockpit_frame"], root)
    st.sphere(f"{name}_fairing", 1.0, (0, 16.6, ZC - 1.3), belly, scale=(R * 0.97, 6.8, 1.12), segs=32, **P)
    # wings (low, swept 27 deg, dihedral), sharklets
    sw = math.tan(math.radians(27))
    rz = ZC - 1.4
    for s in (-1, 1):
        tip_x, tip_z = s * 17.1, rz + 1.35
        le_tip = 12.6 + (17.1 - 1.7) * sw
        st.slab(f"{name}_wing_{s}", [(s * 1.7, 12.6, rz), (s * 1.7, 19.8, rz), (tip_x, le_tip + 1.6, tip_z), (tip_x, le_tip, tip_z)],
                [0.5, 0.22, 0.06, 0.14], (0, 0, 1), paint, **P)
        st.slab(f"{name}_sharklet_{s}", [(tip_x, le_tip + 0.1, tip_z), (tip_x, le_tip + 1.6, tip_z),
                                        (tip_x + s * 0.25, le_tip + 2.3, tip_z + 2.2), (tip_x + s * 0.25, le_tip + 1.6, tip_z + 2.2)],
                [0.12, 0.06, 0.04, 0.06], (1, 0, 0), paint, **P)
        # engine: a lathed cowl hung on a pylon, its lowest point 0.8 m above the apron
        ex, ey, ez = s * 5.7, 10.2, 0.8 + 1.07
        lathe(f"{name}_cowl_{s}", [(0.32, 0.84), (0.12, 0.88), (0.02, 0.95), (0.0, 0.99), (0.05, 1.03), (0.2, 1.06),
                                   (1.0, 1.07), (2.0, 1.04), (2.8, 0.95), (3.35, 0.8), (3.6, 0.72)],
              m["engine"], root, (ex, ey, ez), segs=48)
        lathe(f"{name}_fan_{s}", [(0.3, 0.86), (0.36, 0.5), (0.38, 0.0)], m["intake"], root, (ex, ey, ez), segs=40)
        lathe(f"{name}_spinner_{s}", [(0.36, 0.3), (0.2, 0.18), (0.05, 0.0)], m["gear"], root, (ex, ey, ez), segs=24)
        lathe(f"{name}_core_{s}", [(3.5, 0.62), (4.2, 0.52), (4.3, 0.4), (4.9, 0.18), (5.15, 0.0)], m["gear"], root,
              (ex, ey, ez), segs=32)
        st.box(f"{name}_pylon_{s}", (0.3, 4.6, 0.62), (ex, ey + 2.9, ez + 1.14), paint, bevel=0.08, **P)
        # main gear
        gx = s * 3.8
        st.cyl(f"{name}_mgear_{s}", 0.13, rz - 0.1 - 0.58, (gx, 18.6, 0.58 + (rz - 0.1 - 0.58) / 2), m["gear"], verts=16, **P)
        st.cyl(f"{name}_mgear_oleo_{s}", 0.17, 1.0, (gx, 18.6, rz - 0.6), m["gear"], verts=16, **P)
        for w in (-1, 1):
            st.cyl(f"{name}_mwheel_{s}_{w}", 0.58, 0.38, (gx + w * 0.42, 18.6, 0.58), m["tyre"], rot=(0, math.pi / 2, 0), verts=32, **P)
            st.cyl(f"{name}_mhub_{s}_{w}", 0.3, 0.39, (gx + w * 0.42, 18.6, 0.58), m["gear"], rot=(0, math.pi / 2, 0), verts=24, **P)
        # tailplane
        st.slab(f"{name}_stab_{s}", [(s * 0.7, 31.2, ZC + 0.8), (s * 0.7, 35.0, ZC + 0.8), (s * 6.3, 36.3, ZC + 1.1), (s * 6.3, 34.7, ZC + 1.1)],
                [0.24, 0.1, 0.05, 0.08], (0, 0, 1), paint, **P)
    st.slab(f"{name}_fin", [(0, 28.6, ZC + 1.5), (0, 36.2, ZC + 1.5), (0, 37.0, ZC + 7.6), (0, 34.2, ZC + 7.6)],
            [0.42, 0.16, 0.08, 0.14], (1, 0, 0), paint, **P)
    if nose_gear:
        _nose_gear(name, m, root)
    # cabin windows on one side, following the skin
    zw = 0.4
    xw = math.sqrt(R * R - zw * zw) + 0.006
    ang = math.atan2(zw, xw)
    y, i = 8.4, 0
    while y < 29.0:
        if not (14.6 < y < 15.6):  # over-wing exits: a plain panel
            r = rng.random()
            mat = m["cabin_lit"] if r < lit else (m["cabin_dim"] if r < lit + 0.12 else m["cabin_off"])
            st.box(f"{name}_win_{i}", (0.03, 0.23, 0.32), (side * xw, y, ZC + zw), mat, bevel=0.008, rot=(0, -side * ang, 0), **P)
        y += 0.56
        i += 1
    # navigation lights: beacons red, starboard tip green, port tip red, tail white
    st.sphere(f"{name}_beacon_top", 0.1, (0, 16.0, ZC + R + 0.08), m["nav_red"], segs=12, **P)
    st.sphere(f"{name}_beacon_low", 0.1, (0, 19.0, ZC - R - 0.08), m["nav_red"], segs=12, **P)
    st.sphere(f"{name}_nav_stbd", 0.1, (-17.15, 12.6 + 15.4 * sw + 0.5, rz + 1.32), m["nav_green"], segs=12, **P)
    st.sphere(f"{name}_nav_port", 0.1, (17.15, 12.6 + 15.4 * sw + 0.5, rz + 1.32), m["nav_red"], segs=12, **P)
    st.sphere(f"{name}_nav_tail", 0.08, (0, 38.0, ZC + 1.3), m["nav_white"], segs=12, **P)
    if taxi:
        st.sphere(f"{name}_taxi_lamp", 0.14, (0, 5.0, 1.5), m["nav_white"], segs=12, **P)
    root.rotation_euler = (0, 0, math.radians(heading))
    bpy.context.view_layer.update()
    return root


def _nose_gear(name, m, root):
    """Strut 1.9 m from the belly to the axle, a chrome piston below the oleo, torque links, two 0.75 m wheels, the
    bay doors hanging open either side."""
    st = _st()
    P = dict(parent=root)
    y = 5.2
    bz = ZC + belly(y) + 0.05
    ax = 0.375
    st.cyl(f"{name}_ngear_oleo", 0.11, bz - 1.0, (0, y, 1.0 + (bz - 1.0) / 2), m["gear"], verts=20, **P)
    st.cyl(f"{name}_ngear_piston", 0.075, 0.75, (0, y, ax + 0.32 + 0.37), m["chrome"], verts=20, **P)
    st.box(f"{name}_ngear_fork", (0.36, 0.12, 0.14), (0, y, ax + 0.2), m["gear"], bevel=0.02, **P)
    for k, (dz, dy) in enumerate(((0.95, 0.12), (0.72, 0.16))):
        st.box(f"{name}_ngear_link_{k}", (0.05, 0.26, 0.05), (0, y + dy, dz), m["gear"], bevel=0.01, rot=(0.5 - k, 0, 0), **P)
    st.cyl(f"{name}_ngear_axle", 0.04, 0.5, (0, y, ax), m["gear"], rot=(0, math.pi / 2, 0), verts=12, **P)
    for w in (-1, 1):
        st.cyl(f"{name}_nwheel_{w}", 0.375, 0.24, (w * 0.2, y, ax), m["tyre"], rot=(0, math.pi / 2, 0), verts=32, **P)
        st.cyl(f"{name}_nhub_{w}", 0.18, 0.25, (w * 0.2, y, ax), m["gear"], rot=(0, math.pi / 2, 0), verts=20, **P)
        st.box(f"{name}_nbay_door_{w}", (0.02, 1.5, 0.62), (w * 0.42, y - 0.2, bz - 0.3), m["fuselage_dark"], bevel=0.006, **P)
    st.box(f"{name}_nbay", (0.78, 1.7, 0.04), (0, y - 0.2, bz - 0.02), m["intake"], **P)


# ---------------------------------------------------------------- jet bridge
def door_world(air):
    """World position of the forward port (L1) door's centre on the skin, and its sill height."""
    st = _st()
    zc = (DOOR_FLOOR + DOOR_H / 2)
    x = math.sqrt(R * R - zc * zc)
    return Vector((air[0] + x, air[1] + DOOR_Y, st.APRON + ZC + zc)), st.APRON + ZC + DOOR_FLOOR


def _ribs(name, sec, length, w, h, m, pitch=0.3):
    """Corrugation as geometry: 40 mm bevelled frames round the tunnel at `pitch`, arrayed along it."""
    st = _st()
    rib = st.box(name, (w + 0.07, 0.04, h + 0.07), (0, 0.2, h / 2), m, bevel=0.008)
    rib.parent = sec
    ar = rib.modifiers.new("array", "ARRAY")
    ar.use_relative_offset, ar.use_constant_offset = False, True
    ar.constant_offset_displace = (0, pitch, 0)
    ar.count = max(1, int((length - 0.4) / pitch))
    rib.modifiers.move(rib.modifiers.find("array"), 0)
    return rib


def jet_bridge(air):
    """Our stand's bridge: the fixed link through the curtain wall, a cylindrical rotunda on its column, two
    telescoping box tunnels (3 m, ribbed with real frames, one thin warm glazing strip each side) falling to a cab,
    an accordion bellows of ten bevelled folds closing on the L1 door, a drive column with a two-wheel bogie under
    the outer tunnel, service lamps under the cab."""
    st = _st()
    m = st.materials()
    cl, plain, dark = m["bridge"], m["bridge_plain"], m["bellows"]
    dx = st.DOOR_X
    st.box("jb_link", (2.8, 3.1, 3.0), (dx, st.GLASS_Y + 1.85, 1.5), plain, bevel=0.02)
    _ribs("jb_link_ribs", st.empty("jb_link_frame", (dx, st.GLASS_Y + 0.35, 0.0), 0.0), 3.0, 2.8, 3.0, cl)
    st.cyl("jb_link_col", 0.32, -st.APRON, (dx, st.GLASS_Y + 2.4, st.APRON / 2), m["mast"], verts=24)
    rx, ry = dx, st.GLASS_Y + 5.2
    st.cyl("jb_rotunda", 2.0, 3.3, (rx, ry, 1.5), plain, verts=64)
    st.cyl("jb_rotunda_cap", 2.12, 0.2, (rx, ry, 3.2), m["facade"], verts=64)
    st.cyl("jb_rotunda_skirt", 2.06, 0.3, (rx, ry, -0.1), m["facade"], verts=64)
    st.cyl("jb_rotunda_col", 0.6, -st.APRON - 0.25, (rx, ry, st.APRON / 2 - 0.12), m["mast"], verts=32)
    door, sill = door_world(air)
    cab_c = Vector((door.x + 1.05 + 1.3, door.y, 0.0))           # bellows 1.05 m, then the cab (2.6 deep)
    d = Vector((cab_c.x - rx, cab_c.y - ry, 0.0))
    L = d.length
    d.normalize()
    yaw = math.atan2(d.x, d.y)
    s_end = L - 1.1                                                 # the tunnel runs into the cab's back
    drop = sill                                                     # floor height at the cab (below the room's 0)
    pitch = math.atan2(drop, s_end - 1.8)          # negative: the floor falls toward the cab

    def floor_z(s):
        return drop * max(0.0, (s - 1.8)) / (s_end - 1.8)
    secs = []
    for k, (s0, s1, w, h) in enumerate(((1.7, L * 0.55 + 0.4, 2.8, 2.85), (L * 0.55 - 0.3, s_end, 3.05, 3.05))):
        c0 = Vector((rx, ry, 0.0)) + d * s0
        sec = st.empty(f"jb_tunnel_{k}", (c0.x, c0.y, floor_z(s0)), 0.0)
        sec.rotation_euler = (pitch, 0.0, -yaw)
        ln = s1 - s0
        st.box(f"jb_tunnel_{k}_shell", (w, ln, h), (0, ln / 2, h / 2), plain, bevel=0.025, parent=sec)
        _ribs(f"jb_tunnel_{k}_ribs", sec, ln, w, h, cl)
        for side in (-1, 1):   # one thin warm glazing strip, dim
            st.box(f"jb_glaze_{k}_{side}", (0.03, ln - 0.5, 0.5), (side * (w / 2 + 0.004), ln / 2, 1.3), m["bridge_win"], parent=sec)
            st.box(f"jb_glaze_frame_{k}_{side}", (0.035, ln - 0.42, 0.06), (side * (w / 2 + 0.006), ln / 2, 1.58), m["mast"], parent=sec)
            st.box(f"jb_glaze_sill_{k}_{side}", (0.035, ln - 0.42, 0.06), (side * (w / 2 + 0.006), ln / 2, 1.02), m["mast"], parent=sec)
        st.box(f"jb_tunnel_{k}_skirt", (w + 0.1, 0.12, h + 0.1), (0, 0.06, h / 2), m["facade"], bevel=0.01, parent=sec)
        secs.append(sec)
    bpy.context.view_layer.update()
    # the drive column and its two-wheel bogie under the outer tunnel
    sb = s_end - 2.2
    b = Vector((rx, ry, 0.0)) + d * sb
    zb = floor_z(sb)
    perp = Vector((d.y, -d.x, 0.0))
    for side in (-1, 1):
        p = b + perp * side * 1.0
        st.box(f"jb_lift_{side}", (0.34, 0.34, zb - st.APRON - 1.0), (p.x, p.y, st.APRON + 1.0 + (zb - st.APRON - 1.0) / 2),
               m["mast"], bevel=0.02, rot=(0, 0, -yaw))
        st.box(f"jb_lift_inner_{side}", (0.26, 0.26, 0.9), (p.x, p.y, st.APRON + 0.85), m["chrome"], bevel=0.01, rot=(0, 0, -yaw))
    st.box("jb_beam", (2.5, 0.42, 0.42), (b.x, b.y, st.APRON + 0.6), m["mast"], bevel=0.03, rot=(0, 0, -yaw))
    st.box("jb_bogie", (1.0, 1.1, 0.42), (b.x, b.y, st.APRON + 0.6), dark, bevel=0.03, rot=(0, 0, -yaw))
    for w in (-1, 1):
        p = b + perp * w * 0.45
        st.cyl(f"jb_wheel_{w}", 0.42, 0.3, (p.x, p.y, st.APRON + 0.42), m["tyre"], rot=(0, math.pi / 2, -yaw), verts=32)
    # the cab, its front toward the aircraft (-X)
    cz = sill + 1.4
    st.box("jb_cab", (2.6, 3.2, 2.9), (cab_c.x, cab_c.y, cz), plain, bevel=0.04)
    st.box("jb_cab_roof", (2.7, 3.3, 0.12), (cab_c.x, cab_c.y, cz + 1.5), m["facade"], bevel=0.02)
    st.box("jb_cab_glass", (1.6, 0.03, 0.9), (cab_c.x + 0.2, cab_c.y - 1.61, cz + 0.3), m["cabin_off"])
    st.box("jb_cab_glow", (1.4, 0.03, 0.4), (cab_c.x + 0.2, cab_c.y - 1.615, cz + 0.05), m["bridge_win"])
    st.box("jb_cab_floor", (2.7, 3.3, 0.2), (cab_c.x, cab_c.y, sill - 0.1), m["mast"], bevel=0.02)
    # bellows: ten bevelled folds from the cab front to the skin round the door, turning to meet the curved skin
    x0, x1 = door.x - 0.02, cab_c.x - 1.3 + 0.05
    nf = 10
    for k in range(nf):
        t = k / (nf - 1)
        x = x1 + (x0 - x1) * t
        tilt = math.radians(-15.0) * t ** 1.5       # the last folds lean in with the skin above the door
        ww, hh = 2.45 - 0.12 * t, 2.55 - 0.1 * t
        st.box(f"jb_fold_{k}", (0.075, ww, hh), (x, cab_c.y, sill + 1.2 + 0.05 * t), dark, bevel=0.03, rot=(0, tilt, 0))
    st.box("jb_bellows_core", (x1 - x0 + 0.05, 2.25, 2.35), ((x0 + x1) / 2, cab_c.y, sill + 1.18), m["intake"])
    st.box("jb_canopy_floor", (x1 - x0 + 0.1, 2.2, 0.12), ((x0 + x1) / 2, cab_c.y, sill - 0.08), m["mast"], bevel=0.02)
    # service lamps under the cab and an amber beacon on its roof
    for k, dy in enumerate((-0.8, 0.8)):
        st.spot(f"jb_lamp_{k}", (cab_c.x - 0.6, cab_c.y + dy, sill - 0.25), 160.0, (1.0, 0.9, 0.76), 70, 0.95, (0, 0, 0), radius=0.08)
        st.box(f"jb_lamp_body_{k}", (0.22, 0.16, 0.07), (cab_c.x - 0.6, cab_c.y + dy, sill - 0.17), m["mast"], bevel=0.01)
        st.box(f"jb_lamp_lens_{k}", (0.18, 0.12, 0.004), (cab_c.x - 0.6, cab_c.y + dy, sill - 0.207), m["flood"])
    st.sphere("jb_amber", 0.07, (cab_c.x + 0.9, cab_c.y - 1.1, cz + 1.62), m["amber"], segs=12)
    return door


# ---------------------------------------------------------------- flood masts
def mast(i, x, y, target, h=20.0, energy=90000.0, size=82.0, blend=0.95, show=True):
    """An apron flood mast: a tapering galvanised pole, a lamp head of six floods in two rows on a frame tilted
    toward `target` (x, y), a service platform under it, and a wide soft spot from the head (spot_size 80 deg,
    blend 0.95), so the light falls from above with a gentle falloff, never a hard cone."""
    st = _st()
    m = st.materials()
    z0 = st.APRON
    tx, ty = target
    a = math.atan2(tx - x, ty - y)
    if show:
        st.cyl(f"mast_{i}", 0.34, h, (x, y, z0 + h / 2), m["mast"], verts=20, r2=0.2)
        st.cyl(f"mast_platform_{i}", 0.9, 0.06, (x, y, z0 + h - 1.1), m["mast"], verts=24)
        for k in range(8):
            ang = 2 * math.pi * k / 8
            st.cyl(f"mast_rail_{i}_{k}", 0.018, 0.9, (x + 0.88 * math.sin(ang), y + 0.88 * math.cos(ang), z0 + h - 0.65), m["mast"], verts=6)
        head = st.empty(f"mast_head_{i}", (x, y, z0 + h + 0.35), 0.0)
        head.rotation_euler = (0, 0, -a)
        for row, (dz, tilt) in enumerate(((0.32, 38.0), (-0.22, 30.0))):
            st.box(f"mast_bar_{i}_{row}", (3.0, 0.1, 0.1), (0, -0.12, dz + 0.22), m["mast"], bevel=0.01, parent=head)
            for k in range(3):
                lx = -1.0 + k * 1.0
                lamp = st.box(f"mast_lamp_{i}_{row}_{k}", (0.62, 0.42, 0.18), (lx, 0.1, dz), m["sign_case"], bevel=0.02, parent=head)
                lamp.rotation_euler = (math.radians(tilt), 0, 0)   # lens faces down and toward the target
                lens = st.box(f"mast_lens_{i}_{row}_{k}", (0.54, 0.34, 0.01), (0, 0, -0.092), m["flood"], parent=lamp)
                lens.visible_shadow = False
        st.box(f"mast_yoke_{i}", (0.2, 0.2, 0.9), (0, -0.2, 0.0), m["mast"], bevel=0.01, parent=head)
    d = Vector((tx - x, ty - y, -h))
    li = st.spot(f"mast_light_{i}", (x, y, z0 + h - 0.1), energy, (1.0, 0.86, 0.7), size, blend, (0, 0, 0), radius=1.3)
    li.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return li
