"""The Hong Kong street: a tram street canyon at night, built procedurally (no text anywhere).

The street runs along +Y. A 9.2 m road (x = +-4.6) with a tram track pair in the middle, granite kerbs, 2.6 m
pavements of wet concrete slabs, and the building line at x = +-7.2. Along both sides stand old buildings of three
kinds, each a different width, height, colour and setback:
  tenement  five or six storeys of projecting balconies with solid parapets, some glazed in, laundry under the slabs
  slab      ten to sixteen storeys of punched windows on a ledge per floor, window-type air-conditioners, grille
            cages and laundry poles
  tower     fifteen storeys and more of small mosaic tile, paired windows, louvred air-conditioner platforms, fins
Ground floors are shops: open shops burning with fluorescent or warm light (shelves of blank goods, a counter, a
canopy with a tube under it), half-shuttered ones, closed roller shutters, and one boutique with a glazed display
(the window Dawn stops at). Projecting signboards hang from steel brackets over the pavement and the road: blank
lightboxes (one or two soft colour fields in a metal frame), neon frames (coloured tubes round a dark panel, only
rectangles and bars, nothing that reads as a character) and dead painted panels. Tram contact wires on span wires,
sagging utility cables, street lamps, kerbside railings, road paint, rails, a night sky strip and a thin haze.

Building frames: every building is made in its own local frame (a along the facade, w out toward the street, z up),
a proper rotation of the world, so normals and windings hold on both sides.
"""
import math
import random

import bpy
import bmesh
from mathutils import Matrix, Vector

import setkit as sk
import hongkong_street_mats as mt

XF = 7.2          # building line (shop fronts), |x|
RW = 4.6          # kerb face, |x|
PZ = 0.14         # pavement top
GF = 4.4          # first-floor level
TRACK = 1.25      # tram track centres at x = +-TRACK
GAUGE = 1.067
Y0, Y1 = -16.0, 200.0
END_Y = 214.0     # the building closing the vista
SPANS = [y for y in range(10, 200, 26)]   # tram span-wire positions (no sign may cross them)

M = mt.M
LIGHTS = {}
OBJ = {}
SIGNS = []        # (y0, y1, z0, z1, x_end) of every projecting sign, for the cables
LIT = []          # (frame, a mid, width, colour, spill energy) of every lit shop, for the street bounce
RECENT = {}       # side -> the last sign colours used there
# where the cast stands on the pavements (side, y): no spill-out display or standing sign within a metre or so
KEEP = [(1, 14.0), (1, 17.9), (1, 27.5), (1, 29.5), (-1, 21.1), (-1, 26.1), (-1, 33.5), (1, 43.0), (1, 41.0)]
rng = random.Random(1997)

BOUTIQUE = dict(y0=15.75, y1=23.25, disp=(16.25, 19.95), door=(20.2, 21.75), glass_x=7.25, back_x=8.55)


# ---------------------------------------------------------------- mesh builder
class MB:
    """Accumulates faces (with a material index and per-face attributes) into one mesh object."""

    def __init__(self, name, mats, merge=False):
        self.name, self.mats, self.merge = name, list(mats), merge
        self.v, self.f, self.mi, self.fa, self.ca = [], [], [], [], []
        self.cur = {}
        self.pool = {}

    def set(self, **kw):
        self.cur.update(kw)
        return self

    def _vi(self, p):
        if self.merge:
            k = (round(p[0], 4), round(p[1], 4), round(p[2], 4))
            i = self.pool.get(k)
            if i is None:
                i = self.pool[k] = len(self.v)
                self.v.append(tuple(p))
            return i
        self.v.append(tuple(p))
        return len(self.v) - 1

    def face(self, pts, mi=0, n=None, corner=None, **extra):
        pts = [Vector(p) for p in pts]
        if n is not None:
            nn = (pts[1] - pts[0]).cross(pts[-1] - pts[0])
            if nn.dot(Vector(n)) < 0:
                pts = pts[::-1]
                if corner:
                    corner = {k: v[::-1] for k, v in corner.items()}
        self.f.append(tuple(self._vi(p) for p in pts))
        self.mi.append(mi)
        d = dict(self.cur)
        d.update(extra)
        self.fa.append(d)
        self.ca.append(corner or {})

    def box(self, lo, hi, mi=0, fr=None, skip=(), **extra):
        P = [None] * 8
        for i in range(8):
            c = (hi[0] if i & 1 else lo[0], hi[1] if i & 2 else lo[1], hi[2] if i & 4 else lo[2])
            P[i] = fr.p(*c) if fr else Vector(c)
        for key, idx in (("-x", (0, 4, 6, 2)), ("+x", (1, 3, 7, 5)), ("-y", (0, 1, 5, 4)), ("+y", (2, 6, 7, 3)),
                         ("-z", (0, 2, 3, 1)), ("+z", (4, 5, 7, 6))):
            if key not in skip:
                self.face([P[j] for j in idx], mi, **extra)

    def finish(self, bevel=0.0, seg=2, angle=40.0, smooth=False):
        if not self.f:
            return None
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.v, [], self.f)
        me.polygons.foreach_set("material_index", self.mi)
        keys = {}
        for d in self.fa:
            for k, v in d.items():
                keys.setdefault(k, v)
        for k, v0 in keys.items():
            if isinstance(v0, (int, float)):
                at = me.attributes.new(k, "FLOAT", "FACE")
                at.data.foreach_set("value", [float(d.get(k, 0.0)) for d in self.fa])
            else:
                at = me.attributes.new(k, "FLOAT_COLOR", "FACE")
                flat = []
                for d in self.fa:
                    c = d.get(k, (0.0, 0.0, 0.0))
                    flat += [c[0], c[1], c[2], 1.0]
                at.data.foreach_set("color", flat)
        ckeys = {k for d in self.ca for k in d}
        for k in ckeys:
            at = me.attributes.new(k, "FLOAT_VECTOR", "CORNER")
            flat = []
            for poly, d in zip(self.f, self.ca):
                vals = d.get(k)
                for j in range(len(poly)):
                    c = vals[j] if vals else (0.0, 0.0, 0.0)
                    flat += [c[0], c[1], c[2]]
            at.data.foreach_set("vector", flat)
        me.validate(clean_customdata=False)
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        for m in self.mats:
            ob.data.materials.append(m)
        for p in me.polygons:
            p.use_smooth = smooth
        if bevel:
            bv = ob.modifiers.new("bevel", "BEVEL")
            bv.width, bv.segments = bevel, seg
            bv.limit_method = "ANGLE"
            bv.angle_limit = math.radians(angle)
            bv.use_clamp_overlap = True
        OBJ[self.name] = ob
        return ob


class Frame:
    """A building's local frame: a along the facade, w out toward the street, z up (right-handed)."""

    def __init__(self, origin, A, W):
        self.o, self.A, self.W, self.Z = Vector(origin), Vector(A), Vector(W), Vector((0, 0, 1))

    def p(self, a, w, z):
        return self.o + self.A * a + self.W * w + self.Z * z

    def d(self, a, w, z):
        return self.A * a + self.W * w + self.Z * z

    def matrix(self, a, w, z):
        """Object placement for a part modelled with its front toward -Y: local X = -A, Y = -W, Z = Z."""
        R = Matrix((-self.A, -self.W, self.Z)).transposed().to_4x4()
        R.translation = self.p(a, w, z)
        return R


def frame_for(side, y0, y1):
    if side > 0:
        return Frame((XF, y0, 0.0), (0, 1, 0), (-1, 0, 0))
    return Frame((-XF, y1, 0.0), (0, -1, 0), (1, 0, 0))


def tube(mb, pts, r, mi=0, segs=6, **extra):
    """A tube through a polyline (cables, poles, rails), its rings kept square to each segment."""
    pts = [Vector(p) for p in pts]
    rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        u = t.cross(ref).normalized()
        v = t.cross(u).normalized()
        rings.append([p + (u * math.cos(2 * math.pi * k / segs) + v * math.sin(2 * math.pi * k / segs)) * r for k in range(segs)])
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        c = (pts[i] + pts[i + 1]) / 2
        for k in range(segs):
            q = [a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]]
            mid = sum(q, Vector()) / 4
            mb.face(q, mi, n=mid - c, **extra)


def catenary(a, b, sag, n=14):
    a, b = Vector(a), Vector(b)
    return [a.lerp(b, t) - Vector((0, 0, sag * 4 * t * (1 - t))) for t in (i / n for i in range(n + 1))]


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def area(name, loc, size, energy, colour, direction, spread=150.0):
    li = sk.area_light(name, tuple(loc), size, energy, colour, spread_deg=spread)
    li.rotation_euler = Vector(direction).normalized().to_track_quat("-Z", "Y").to_euler()
    li.visible_camera = False
    LIGHTS[name] = li
    return li


def spot(name, loc, aim, energy, colour, size_deg=60.0, blend=0.4, radius=0.05):
    li = bpy.data.lights.new(name, "SPOT")
    li.energy, li.color = energy, colour
    li.spot_size, li.spot_blend = math.radians(size_deg), blend
    li.shadow_soft_size = radius
    ob = link(bpy.data.objects.new(name, li))
    ob.location = loc
    ob.rotation_euler = (Vector(aim) - Vector(loc)).normalized().to_track_quat("-Z", "Y").to_euler()
    ob.visible_camera = False
    LIGHTS[name] = ob
    return ob


# ---------------------------------------------------------------- palettes
WALLS = [(0.42, 0.41, 0.37), (0.36, 0.38, 0.33), (0.4, 0.33, 0.3), (0.33, 0.35, 0.37), (0.43, 0.4, 0.33),
         (0.3, 0.32, 0.3), (0.38, 0.36, 0.34), (0.35, 0.3, 0.27), (0.44, 0.43, 0.41), (0.32, 0.34, 0.38)]
CLOTHES = [(0.35, 0.33, 0.3), (0.12, 0.16, 0.24), (0.33, 0.12, 0.1), (0.28, 0.28, 0.3), (0.45, 0.42, 0.38),
           (0.09, 0.09, 0.1), (0.22, 0.26, 0.18), (0.4, 0.3, 0.22), (0.18, 0.12, 0.2)]
GOODS = [(0.32, 0.08, 0.06), (0.38, 0.32, 0.12), (0.1, 0.18, 0.3), (0.42, 0.4, 0.37), (0.14, 0.24, 0.12),
         (0.46, 0.4, 0.3), (0.3, 0.3, 0.33), (0.08, 0.08, 0.09), (0.5, 0.2, 0.08), (0.2, 0.3, 0.34)]
SIGN_COL = {"warm": (1.0, 0.45, 0.12), "cool": (0.15, 0.45, 1.0), "violet": (0.35, 0.10, 0.95), "amber": (1.0, 0.5, 0.12),
            "teal": (0.035, 0.75, 0.52), "green": (0.3, 0.85, 0.3), "magenta": (0.85, 0.065, 0.43),
            "blue": (0.25, 0.42, 1.0), "yellow": (1.0, 0.62, 0.05), "cream": (0.95, 0.51, 0.16)}
SIGN_W = [("warm", 3), ("cool", 0.5), ("violet", 5), ("amber", 4), ("cream", 0.5), ("teal", 2.5), ("green", 2),
          ("magenta", 2), ("blue", 2), ("yellow", 2)]
WIN_COL = [((1.0, 0.7, 0.42), 0.55), ((0.78, 0.9, 1.0), 0.4), ((0.45, 0.58, 1.0), 0.15)]


def pick(items):
    tot = sum(w for _, w in items)
    r = rng.uniform(0, tot)
    for v, w in items:
        r -= w
        if r <= 0:
            return v
    return items[-1][0]


# ---------------------------------------------------------------- base parts (instanced)
_BASE = {}


def _bevelled_mesh(name, build, width=0.012, seg=2):
    bm = bmesh.new()
    build(bm)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    edges = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(40)]
    if width and edges:
        bmesh.ops.bevel(bm, geom=edges, offset=width, segments=seg, affect="EDGES", clamp_overlap=True, profile=0.6)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return me


def _cube(bm, lo, hi):
    c = [(lo[i] + hi[i]) / 2 for i in range(3)]
    s = [hi[i] - lo[i] for i in range(3)]
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(c) @ Matrix.Diagonal((*s, 1)))


def ac_window_mesh():
    """A window-type air-conditioner, front toward -Y: an enamelled case 600 x 420, 520 deep (300 of it out of the
    wall), a recessed front grille with louvres, side intake slots, a drip tray, on an angle bracket."""
    if "acw" in _BASE:
        return _BASE["acw"]

    def b(bm):
        _cube(bm, (-0.3, -0.34, -0.21), (0.3, 0.18, 0.21))
        for i in range(7):                                  # front louvres
            z = -0.15 + i * 0.045
            _cube(bm, (-0.26, -0.355, z), (0.26, -0.338, z + 0.018))
        for s in (-1, 1):                                   # side slots
            for i in range(5):
                z = -0.12 + i * 0.05
                _cube(bm, (s * 0.3 - 0.006, -0.3, z), (s * 0.3 + 0.006, -0.08, z + 0.02))
        _cube(bm, (-0.29, -0.36, -0.235), (0.29, 0.0, -0.21))     # drip tray
        for s in (-1, 1):                                   # bracket arms and stays
            _cube(bm, (s * 0.22 - 0.02, -0.34, -0.27), (s * 0.22 + 0.02, 0.0, -0.235))
            _cube(bm, (s * 0.22 - 0.015, -0.02, -0.55), (s * 0.22 + 0.015, 0.0, -0.27))
    me = _bevelled_mesh("ac_window", b, 0.008)
    for p in me.polygons:
        c = p.center
        p.material_index = 0
        if c.y < -0.336 and abs(c.x) < 0.27 and -0.16 < c.z < 0.17:
            p.material_index = 1
        elif abs(c.x) > 0.295 and -0.3 < c.y < -0.08 and abs(c.z) < 0.16:
            p.material_index = 1
        if c.z < -0.215:
            p.material_index = 2
    me.materials.append(M["ac"])
    me.materials.append(M["ac_grille"])
    me.materials.append(M["steel_rust"])
    _BASE["acw"] = me
    return me


def ac_split_mesh():
    """A split-type outdoor unit, front toward -Y: 800 x 560 x 290 case, a round fan grille, on a wall bracket."""
    if "acs" in _BASE:
        return _BASE["acs"]

    def b(bm):
        _cube(bm, (-0.4, -0.29, 0.0), (0.4, 0.0, 0.56))
        bmesh.ops.create_cone(bm, cap_ends=True, segments=28, radius1=0.2, radius2=0.2, depth=0.02,
                              matrix=Matrix.Translation((-0.1, -0.295, 0.28)) @ Matrix.Rotation(math.radians(90), 4, "X"))
        for s in (-1, 1):
            _cube(bm, (s * 0.3 - 0.02, -0.4, -0.04), (s * 0.3 + 0.02, 0.0, 0.0))
            _cube(bm, (s * 0.3 - 0.015, -0.03, -0.3), (s * 0.3 + 0.015, 0.0, -0.04))
    me = _bevelled_mesh("ac_split", b, 0.008)
    for p in me.polygons:
        c = p.center
        p.material_index = 1 if c.y < -0.29 and (c - Vector((-0.1, -0.3, 0.28))).length < 0.21 else 0
        if c.z < 0.0:
            p.material_index = 2
    me.materials.append(M["ac"])
    me.materials.append(M["ac_grille"])
    me.materials.append(M["steel_rust"])
    _BASE["acs"] = me
    return me


def louvre_mesh():
    """An air-conditioner platform screen: a 1.0 x 0.9 m frame of slanted aluminium louvres, front toward -Y."""
    if "louvre" in _BASE:
        return _BASE["louvre"]

    def b(bm):
        _cube(bm, (-0.5, -0.04, 0.0), (-0.46, 0.0, 0.9))
        _cube(bm, (0.46, -0.04, 0.0), (0.5, 0.0, 0.9))
        _cube(bm, (-0.5, -0.04, 0.0), (0.5, 0.0, 0.04))
        _cube(bm, (-0.5, -0.04, 0.86), (0.5, 0.0, 0.9))
        for i in range(11):
            z = 0.07 + i * 0.072
            bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, -0.02, z)) @ Matrix.Rotation(math.radians(40), 4, "X")
                                  @ Matrix.Diagonal((0.92, 0.06, 0.008, 1)))
    me = _bevelled_mesh("louvre", b, 0.0)
    me.materials.append(M["alu_pale"])
    _BASE["louvre"] = me
    return me


def instance(base, fr, a, w, z, name, turn=0.0):
    ob = link(bpy.data.objects.new(name, base))
    ob.matrix_world = fr.matrix(a, w, z) @ Matrix.Rotation(math.radians(turn), 4, "Z")
    return ob


# ---------------------------------------------------------------- facade pieces
def wall_openings(mb, fr, a0, a1, z0, z1, holes, depth, w=0.0, reveal=True):
    """A facade band at w from a0..a1, z0..z1 with rectangular holes (each recessed `depth` with its reveals)."""
    us = sorted({a0, a1, *[h[0] for h in holes], *[h[1] for h in holes]})
    zs = sorted({z0, z1, *[h[2] for h in holes], *[h[3] for h in holes]})
    n = fr.W
    for i in range(len(us) - 1):
        for j in range(len(zs) - 1):
            ca, cz = (us[i] + us[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2
            if any(h[0] < ca < h[1] and h[2] < cz < h[3] for h in holes):
                continue
            mb.face([fr.p(us[i], w, zs[j]), fr.p(us[i + 1], w, zs[j]), fr.p(us[i + 1], w, zs[j + 1]), fr.p(us[i], w, zs[j + 1])], 0, n=n)
    if reveal:
        for (ha0, ha1, hz0, hz1) in holes:
            d = w - depth
            mb.face([fr.p(ha0, w, hz0), fr.p(ha1, w, hz0), fr.p(ha1, d, hz0), fr.p(ha0, d, hz0)], 0, n=fr.Z)
            mb.face([fr.p(ha0, w, hz1), fr.p(ha1, w, hz1), fr.p(ha1, d, hz1), fr.p(ha0, d, hz1)], 0, n=-fr.Z)
            mb.face([fr.p(ha0, w, hz0), fr.p(ha0, w, hz1), fr.p(ha0, d, hz1), fr.p(ha0, d, hz0)], 0, n=fr.A)
            mb.face([fr.p(ha1, w, hz0), fr.p(ha1, w, hz1), fr.p(ha1, d, hz1), fr.p(ha1, d, hz0)], 0, n=-fr.A)


def window(G, fr, a0, a1, z0, z1, w, lit=None, kind="slide"):
    """Glass and an anodised frame at w (the recess), a mullion and a transom; lit rooms glow per pane."""
    t = 0.045
    if lit is None:
        lit = rng.random() < (0.65 if z0 > 12 else 0.5)
    col, s = (0.0, 0.0, 0.0), 0.0
    if lit:
        col = pick(WIN_COL)
        s = rng.uniform(0.7, 2.2) * (0.5 if col[2] > 0.9 and col[0] < 0.5 else 1.0)
    G["win"].face([fr.p(a0, w, z0), fr.p(a1, w, z0), fr.p(a1, w, z1), fr.p(a0, w, z1)], 0, n=fr.W, lit=s, wcol=col)
    fb = G["frame"]
    fb.box((a0, w - 0.02, z0), (a1, w + 0.04, z0 + t), fr=fr)
    fb.box((a0, w - 0.02, z1 - t), (a1, w + 0.04, z1), fr=fr)
    fb.box((a0, w - 0.02, z0), (a0 + t, w + 0.04, z1), fr=fr)
    fb.box((a1 - t, w - 0.02, z0), (a1, w + 0.04, z1), fr=fr)
    am = (a0 + a1) / 2 + rng.uniform(-0.1, 0.1) * (a1 - a0)
    fb.box((am - t / 2, w - 0.01, z0), (am + t / 2, w + 0.05, z1), fr=fr)
    if kind != "plain" and z1 - z0 > 1.1:
        zt = z0 + (z1 - z0) * 0.72
        fb.box((a0, w - 0.01, zt - t / 2), (a1, w + 0.05, zt + t / 2), fr=fr)


def cage(G, fr, a0, a1, z0, z1, w, depth=0.36):
    """A steel grille cage over a window: a frame and vertical bars, standing out from the wall."""
    sb = G["steel"]
    r = 0.012
    for zz in (z0, z1):
        sb.box((a0, w, zz - r), (a1, w + depth, zz + r), fr=fr)
    for aa in (a0, a1):
        sb.box((aa - r, w + depth - 2 * r, z0), (aa + r, w + depth, z1), fr=fr)
        sb.box((aa - r, w, zz - r), (aa + r, w + depth, zz + r), fr=fr)
    n = max(3, int((a1 - a0) / 0.12))
    for i in range(1, n):
        aa = a0 + (a1 - a0) * i / n
        sb.box((aa - 0.006, w + depth - 0.012, z0), (aa + 0.006, w + depth, z1), fr=fr)
    sb.box((a0, w + depth - 0.012, (z0 + z1) / 2 - 0.006), (a1, w + depth, (z0 + z1) / 2 + 0.006), fr=fr)
    # a pot or two and a bundle inside the cage, dark shapes against the glass
    if rng.random() < 0.6:
        G["clutter"].box((a0 + 0.1, w + 0.05, z0 + 0.02), (a0 + 0.32, w + 0.28, z0 + 0.24), fr=fr)


def laundry(G, fr, a, w, z, length=1.5, along=False, n=None):
    """Laundry poles out from a window (or along a balcony), garments hung from them."""
    sb = G["steel"]
    poles = n if n is not None else rng.choice((1, 2, 2, 3))
    for k in range(poles):
        if along:
            p0, p1 = fr.p(a, w, z), fr.p(a + length, w, z)
        else:
            da = (k - (poles - 1) / 2) * 0.35
            p0, p1 = fr.p(a + da, w, z), fr.p(a + da + rng.uniform(-0.1, 0.1), w + length, z - rng.uniform(0.0, 0.12))
        tube(sb, [p0, p1], 0.012, segs=5)
        x = 0.15
        L = (p1 - p0).length
        while x < L - 0.2:
            if rng.random() < 0.72:
                gw, gh = rng.uniform(0.25, 0.6), rng.uniform(0.35, 0.85)
                c = (p0 + (p1 - p0) * (x / L))
                d = (p1 - p0).normalized()
                tilt = Vector((0, 0, 1))
                q0 = c - d * gw / 2
                q1 = c + d * gw / 2
                sag = rng.uniform(0.0, 0.04)
                G["cloth"].face([q0, q1, q1 - tilt * gh, q0 - tilt * (gh - sag)], 0, ccol=rng.choice(CLOTHES))
                x += gw + rng.uniform(0.03, 0.12)
            else:
                x += rng.uniform(0.2, 0.4)


# ---------------------------------------------------------------- one building
def building(G, side, b):
    y0, y1, H, style = b["y0"], b["y1"], b["H"], b["style"]
    W = y1 - y0
    fr = frame_for(side, y0, y1)
    sb = b["setback"]
    col = b["col"]
    fk = 1.0 if style == "tower" else (0.6 if rng.random() < 0.25 else 0.0)
    fac = G["fac"]
    fac.set(fcol=col, fk=fk)
    # the mass behind the facade: side walls (seen above lower neighbours), roof, parapet, rooftop clutter
    D = 13.0
    for aa, nrm in ((0.0, -fr.A), (W, fr.A)):
        fac.face([fr.p(aa, -D, GF), fr.p(aa, sb, GF), fr.p(aa, sb, H), fr.p(aa, -D, H)], 0, n=nrm,
                 fcol=tuple(c * 0.8 for c in col), fk=0.0)
    fac.face([fr.p(0, -D, H), fr.p(W, -D, H), fr.p(W, sb, H), fr.p(0, sb, H)], 0, n=fr.Z)
    G["slab"].box((0, sb - 0.2, H), (W, sb, H + 1.0), fr=fr)
    if rng.random() < 0.6:
        tw = rng.uniform(1.5, 3.0)
        ta = rng.uniform(0.5, max(0.6, W - tw - 0.5))
        G["slab"].box((ta, -D + 2, H), (ta + tw, -D + 2 + tw, H + rng.uniform(1.8, 3.2)), fr=fr)
    # ground floor: piers, fascia, shops
    fac.set(fcol=tuple(c * 0.7 for c in col), fk=fk)
    pier = 0.35
    fac.box((0, -0.12, PZ), (pier, 0.0, GF), fr=fr)
    fac.box((W - pier, -0.12, PZ), (W, 0.0, GF), fr=fr)
    fac.box((0, -0.12, 3.6), (W, 0.02, GF), fr=fr)
    if sb > 0.03:
        fac.face([fr.p(0, 0.02, GF), fr.p(W, 0.02, GF), fr.p(W, sb, GF), fr.p(0, sb, GF)], 0, n=-fr.Z)   # soffit of an overhang
    shops = b["shops"]
    span = W - 2 * pier
    if len(shops) == 1:
        units = [(pier, W - pier)]
    else:
        mid = pier + span / 2
        fac.box((mid - 0.2, -0.12, PZ), (mid + 0.2, 0.0, GF), fr=fr)
        units = [(pier, mid - 0.2), (mid + 0.2, W - pier)]
    for (s0, s1), kind in zip(units, shops):
        shop(G, fr, side, s0, s1, kind, b)
    fac.set(fcol=col, fk=fk)
    {"tenement": floors_tenement, "slab": floors_slab, "tower": floors_tower}[style](G, fr, W, H, sb, col, fk, b)
    signs(G, fr, side, W, H, b)


def floors_slab(G, fr, W, H, sb, col, fk, b):
    FH = b["fh"]
    nb = max(2, round(W / 2.6))
    bay = W / nb
    nf = int((H - GF) // FH)
    for f in range(nf):
        z0 = GF + f * FH
        holes = []
        for i in range(nb):
            ww = bay * b["winfrac"]
            ac = (i + 0.5) * bay
            holes.append((ac - ww / 2, ac + ww / 2, z0 + 0.85, z0 + 2.3))
        wall_openings(G["fac"], fr, 0, W, z0, z0 + FH, holes, 0.16, w=sb)
        G["slab"].box((0, sb, z0 - 0.07), (W, sb + 0.22, z0 + 0.07), fr=fr)             # floor ledge
        hi_up = z0 > 32.0
        for (ha0, ha1, hz0, hz1) in holes:
            window(G, fr, ha0, ha1, hz0, hz1, sb - 0.14)
            G["slab"].box((ha0 - 0.05, sb, hz0 - 0.06), (ha1 + 0.05, sb + 0.08, hz0), fr=fr)   # sill
            r = rng.random()
            if r < 0.5:
                instance(ac_window_mesh(), fr, (ha0 + ha1) / 2 + rng.uniform(-0.2, 0.2), sb - 0.02, hz0 - 0.33,
                         f"ac_{b['id']}_{f}_{ha0:.1f}")
            elif r < 0.62:
                instance(ac_split_mesh(), fr, (ha0 + ha1) / 2, sb, hz0 - 0.72, f"acs_{b['id']}_{f}_{ha0:.1f}")
            if not hi_up and rng.random() < 0.28:
                cage(G, fr, ha0 - 0.05, ha1 + 0.05, hz0 - 0.02, hz1 + 0.03, sb)
            if not hi_up and rng.random() < 0.22:
                laundry(G, fr, (ha0 + ha1) / 2, sb + 0.05, hz1 + 0.08, length=rng.uniform(1.0, 1.7))
    # drain pipes down two bay lines
    for i in (0, nb):
        aa = min(W - 0.12, max(0.12, i * bay))
        tube(G["steel"], [fr.p(aa, sb + 0.1, GF), fr.p(aa, sb + 0.1, H)], 0.05, segs=8)


def floors_tower(G, fr, W, H, sb, col, fk, b):
    FH = b["fh"]
    nb = max(2, round(W / 2.0))
    bay = W / nb
    nf = int((H - GF) // FH)
    for f in range(nf):
        z0 = GF + f * FH
        holes = []
        for i in range(nb):
            ac = (i + 0.5) * bay
            if i % 2 == 0:
                holes.append((ac - 0.5, ac + 0.5, z0 + 0.95, z0 + 2.2))
        wall_openings(G["fac"], fr, 0, W, z0, z0 + FH, holes, 0.12, w=sb)
        for (ha0, ha1, hz0, hz1) in holes:
            window(G, fr, ha0, ha1, hz0, hz1, sb - 0.1, kind="plain")
        for i in range(nb):
            if i % 2 == 1:
                ac = (i + 0.5) * bay
                G["slab"].box((ac - 0.55, sb, z0 + 0.6), (ac + 0.55, sb + 0.6, z0 + 0.7), fr=fr)
                instance(louvre_mesh(), fr, ac, sb + 0.6, z0 + 0.7, f"lv_{b['id']}_{f}_{i}")
                if z0 < 30 and rng.random() < 0.5:
                    instance(ac_split_mesh(), fr, ac, sb + 0.25, z0 + 0.72, f"acs_{b['id']}_{f}_{i}")
    for aa in (0.12, W - 0.12):
        G["fac"].box((aa - 0.12, sb, GF), (aa + 0.12, sb + 0.45, H + 0.6), fr=fr)


def floors_tenement(G, fr, W, H, sb, col, fk, b):
    FH = b["fh"]
    nf = int((H - GF) // FH)
    for f in range(nf):
        z0 = GF + f * FH
        z1 = z0 + FH
        # the wall behind the balcony: a door and windows
        holes = [(0.6, 1.5, z0 + 0.05, z0 + 2.4)]
        k = int((W - 2.0) // 1.7)
        for i in range(k):
            a = 2.0 + i * 1.7
            holes.append((a, a + 1.1, z0 + 0.9, z0 + 2.4))
        wall_openings(G["fac"], fr, 0, W, z0, z1, holes, 0.12, w=sb)
        for (ha0, ha1, hz0, hz1) in holes:
            window(G, fr, ha0, ha1, hz0, hz1, sb - 0.1)
        # balcony slab and solid parapet
        d = 1.05
        G["slab"].box((0.08, sb, z0 - 0.16), (W - 0.08, sb + d, z0 + 0.02), fr=fr)
        G["fac"].box((0.08, sb + d - 0.12, z0 + 0.02), (W - 0.08, sb + d, z0 + 1.05), fr=fr)
        for aa in (0.08, W - 0.2):
            G["fac"].box((aa, sb, z0 + 0.02), (aa + 0.12, sb + d - 0.12, z0 + 1.05), fr=fr)
        G["slab"].box((0.05, sb + d - 0.14, z0 + 1.05), (W - 0.05, sb + d + 0.02, z0 + 1.11), fr=fr)   # coping
        if rng.random() < 0.45:
            # glazed in above the parapet: a row of panes up to the slab above
            n = max(2, round(W / 1.2))
            for i in range(n):
                a0 = 0.1 + (W - 0.2) * i / n
                a1 = 0.1 + (W - 0.2) * (i + 1) / n
                window(G, fr, a0, a1, z0 + 1.11, z1 - 0.17, sb + d - 0.07, kind="plain")
        else:
            if rng.random() < 0.7:
                laundry(G, fr, 0.4, sb + 0.55, z1 - 0.35, length=W - 0.8, along=True, n=1)
            for i in range(rng.randint(0, 3)):
                pa = rng.uniform(0.5, W - 0.6)
                G["clutter"].box((pa, sb + 0.7, z0 + 1.11), (pa + 0.3, sb + 0.95, z0 + 1.38), fr=fr)
        if rng.random() < 0.45:
            instance(ac_window_mesh(), fr, rng.uniform(1.0, W - 1.0), sb + d + 0.18, z0 + 0.62, f"act_{b['id']}_{f}")


# ---------------------------------------------------------------- shops
def shop(G, fr, side, s0, s1, kind, b):
    """One ground-floor shop unit between a = s0..s1 (the opening 3.55 m high)."""
    top = 3.55
    shop_index = _BASE["shop_index"][side]
    _BASE["shop_index"][side] += 1
    trade = ("clothes", "grocery", "eatery", "electronics")[shop_index % 4]
    D = 3.55 if shop_index % 2 else 5.2
    I = G["int"]
    am = (s0 + s1) / 2
    W = s1 - s0
    if kind == "boutique":
        return
    warm = trade == "eatery" or (trade == "clothes" and kind.endswith("warm"))
    col = (1.0, 0.8, 0.58) if warm else (0.82, 0.92, 1.0)
    lit = kind not in ("shutter",)
    # the interior box
    I.face([fr.p(s0, -D, PZ + 0.02), fr.p(s1, -D, PZ + 0.02), fr.p(s1, -0.12, PZ + 0.02), fr.p(s0, -0.12, PZ + 0.02)], 1, n=fr.Z)
    I.face([fr.p(s0, -D, top), fr.p(s1, -D, top), fr.p(s1, -0.12, top), fr.p(s0, -0.12, top)], 2, n=-fr.Z)
    I.face([fr.p(s0, -D, PZ), fr.p(s1, -D, PZ), fr.p(s1, -D, top), fr.p(s0, -D, top)], 0, n=fr.W)
    I.face([fr.p(s0, -D, PZ), fr.p(s0, -0.12, PZ), fr.p(s0, -0.12, top), fr.p(s0, -D, top)], 0, n=fr.A)
    I.face([fr.p(s1, -D, PZ), fr.p(s1, -0.12, PZ), fr.p(s1, -0.12, top), fr.p(s1, -D, top)], 0, n=-fr.A)
    G["fac"].box((s0, -0.12, top), (s1, 0.0, 3.6), fr=fr)
    if lit:
        # ceiling lights: rows of bare tubes (cool) or square panels (warm)
        if warm:
            for i in range(max(1, int(W // 1.4))):
                for j in range(3):
                    a = s0 + (i + 0.5) * W / max(1, int(W // 1.4))
                    ww = -0.9 - j * 1.5
                    I.box((a - 0.28, ww - 0.28, top - 0.03), (a + 0.28, ww + 0.28, top - 0.005), 6, fr=fr)
        else:
            for i in range(max(1, int(W // 1.1))):
                a = s0 + (i + 0.5) * W / max(1, int(W // 1.1))
                I.box((a - 0.035, -D + 0.4, top - 0.05), (a + 0.035, -0.6, top - 0.01), 7, fr=fr)
    if kind != "shutter":
        if trade == "clothes":
            rails(G, fr, s0, s1, -D, kind)
        elif trade == "grocery":
            for aa, sgn in ((s0, 1), (s1, -1)):
                shelving(G, fr, aa, sgn, -D + 0.3, -0.7, kind)
            back_shelf(G, fr, s0 + 0.5, s1 - 0.5, -D, kind)
            if W > 3.0:
                gondola(G, fr, am, -D + 1.05, -1.6, kind)
        elif trade == "eatery":
            for i in range(3):
                aa = s0 + (i + 0.55) * W / 3.2
                ww = -2.2 if i % 2 else -D + 0.78
                tube(I, [fr.p(aa, ww, PZ+0.70), fr.p(aa, ww, PZ+0.74)], 0.28, 4, segs=18)
                tube(I, [fr.p(aa, ww, PZ), fr.p(aa, ww, PZ+0.70)], 0.038, 3)
                for dx in (-0.37, 0.37):
                    tube(I, [fr.p(aa+dx, ww, PZ), fr.p(aa+dx, ww, PZ+0.37)], 0.035, 3)
                    tube(I, [fr.p(aa+dx, ww, PZ+0.37), fr.p(aa+dx, ww, PZ+0.42)], 0.14, 4, segs=16)
                tube(I, [fr.p(aa, ww, 2.38), fr.p(aa, ww, top)], 0.006, 3)
                tube(I, [fr.p(aa, ww, 2.33), fr.p(aa, ww, 2.4)], 0.14, 6, segs=18)
        else:
            I.box((s0 + 0.25, -2.1, PZ), (s1 - 0.3, -1.63, 0.58), 3, fr=fr)
            I.box((s0 + 0.25, -2.1, 0.58), (s1 - 0.3, -1.63, 0.91), 8, fr=fr)
            for i in range(3):
                aa = s0 + (i + 0.7) * W / 3.4
                I.box((aa-0.19, -D + 0.1, 1.3), (aa+0.19, -D + 0.14, 1.57), 9, fr=fr)
    ca = s0 + 0.35 if rng.random() < 0.5 else s1 - 1.55
    I.box((ca, -1.4, PZ), (ca + 1.2, -0.75, PZ + 0.98), 4, fr=fr)
    if kind == "shutter":
        roller(G, fr, s0, s1, PZ, top)
        return
    if kind.startswith("half"):
        roller(G, fr, s0, s1, 1.35 + rng.uniform(-0.15, 0.25), top)
    # the light: through the opening onto the pavement, from just inside the head
    e = b.get("spill", 1.0) * (300.0 if warm else 260.0) * (W / 3.8) * (0.55 if kind.startswith("half") else 1.0)
    d = fr.W * math.cos(math.radians(38)) - fr.Z * math.sin(math.radians(38))
    area(f"spill_{b['id']}_{s0:.1f}", fr.p(am, -0.45, top - 0.25), (W * 0.9, 0.7), e, col, d, spread=140)
    area(f"fill_{b['id']}_{s0:.1f}", fr.p(am, -D / 2, top - 0.06), (W * 0.8, D * 0.7), e * 0.14, col, -fr.Z, spread=160)
    LIT.append((fr, am, W, col, e))
    if not kind.startswith("half") and trade in ("clothes", "grocery"):
        _BASE["shopkeepers"][side].append((fr.p(ca+0.6, -1.77, PZ), fr.p(ca+0.25, 0.5, PZ)))
    # a canopy with a tube under it, on some
    if b.get("canopy") and not kind.startswith("half"):
        G["slab"].box((s0 - 0.1, 0.0, 3.42), (s1 + 0.1, 1.15, 3.55), fr=fr)
        G["tube"].box((s0 + 0.2, 0.9, 3.39), (s1 - 0.2, 0.95, 3.42), 0 if warm else 1, fr=fr)
        area(f"canopy_{b['id']}_{s0:.1f}", fr.p(am, 0.9, 3.37), (W - 0.4, 0.12), 70.0 * W / 3.8, col, -fr.Z, spread=150)
    if kind.startswith("open") and rng.random() < 0.6:
        spill_out(G, fr, side, s0, s1)


def spill_out(G, fr, side, s0, s1):
    """Goods spilling out of an open shop onto the pavement edge: a rail of hanging garments, or a low table of
    boxed goods, at one side of the opening (clear of where the cast stands)."""
    W = s1 - s0
    left = rng.random() < 0.5
    a0 = s0 + 0.25 if left else s1 - 0.25 - min(1.6, W * 0.42)
    a1 = a0 + min(1.6, W * 0.42)
    ys = sorted((fr.p(a0, 0, 0).y, fr.p(a1, 0, 0).y))
    if any(sd == side and ys[0] - 1.1 < y < ys[1] + 1.1 for sd, y in KEEP):
        return
    if rng.random() < 0.55:
        st_ = G["steel"]
        for aa in (a0, a1):
            st_.box((aa - 0.015, 0.22, PZ), (aa + 0.015, 0.25, PZ + 2.15), fr=fr)
        st_.box((a0, 0.215, PZ + 2.1), (a1, 0.255, PZ + 2.13), fr=fr)
        x = a0 + 0.06
        k = 0
        while x < a1 - 0.25:
            gw, gh = rng.uniform(0.32, 0.5), rng.uniform(0.6, 1.0)
            w = 0.235 + (0.03 if k % 2 else -0.03)
            G["cloth"].face([fr.p(x, w, PZ + 2.08), fr.p(x + gw, w, PZ + 2.08), fr.p(x + gw, w, PZ + 2.08 - gh),
                             fr.p(x, w, PZ + 2.08 - gh + rng.uniform(0.0, 0.06))], 0, n=fr.W, ccol=rng.choice(CLOTHES))
            x += gw * rng.uniform(0.45, 0.75)
            k += 1
    else:
        I = G["int"]
        I.box((a0, 0.05, PZ), (a1, 0.5, PZ + 0.72), 4, fr=fr)
        stock(G, fr, a0 + 0.04, a1 - 0.04, 0.08, 0.47, PZ + 0.72, along_w=False)


def rails(G, fr, s0, s1, D, kind):
    """A clothes shop: two rails of hanging garments down the shop's depth, under the lights."""
    W = s1 - s0
    for k in (0.33, 0.67):
        a = s0 + W * k
        G["steel"].box((a - 0.012, D + 0.6, PZ + 1.78), (a + 0.012, -0.9, PZ + 1.81), fr=fr)
        for ww in (D + 0.6, -0.9):
            G["steel"].box((a - 0.012, ww - 0.012, PZ), (a + 0.012, ww + 0.012, PZ + 1.81), fr=fr)
        w = D + 0.7
        while w < -1.0:
            t = rng.uniform(0.06, 0.12)
            gh = rng.uniform(0.6, 1.05)
            G["cloth"].face([fr.p(a - 0.22, w, PZ + 1.76), fr.p(a + 0.22, w, PZ + 1.76), fr.p(a + 0.2, w + 0.01, PZ + 1.76 - gh),
                             fr.p(a - 0.2, w + 0.01, PZ + 1.76 - gh)], 0, n=fr.A, ccol=rng.choice(CLOTHES))
            w += t


def bounce(G):
    """The street's light thrown back up: over each lit shop a soft source low over the pavement, turned up toward
    the facade, so the balcony soffits, ledges and air-conditioner boxes above the shops read from below, fading
    with height (as the signs and the lit pavement light them in a real street)."""
    for i, (fr, am, W, col, e) in enumerate(LIT):
        d = (-fr.W * 0.42 + fr.Z * 0.91)
        c = tuple(0.6 * x + 0.4 * y for x, y in zip(col, (0.9, 0.92, 0.95)))
        y = fr.p(am, 0, 0).y
        k = 0.3
        area(f"bounce_{i}", fr.p(am, 1.9, 4.7), (W * 1.1, 1.0), e * k, c, d, spread=110)


def shelving(G, fr, aa, sgn, w0, w1, kind):
    I = G["int"]
    dep = 0.42
    for k in range(5):
        z = PZ + 0.25 + k * 0.48
        I.box((min(aa, aa + sgn * dep), w0, z), (max(aa, aa + sgn * dep), w1, z + 0.025), 3, fr=fr)
        stock(G, fr, aa + sgn * 0.02, aa + sgn * (dep - 0.02), w0 + 0.05, w1 - 0.05, z + 0.025, along_w=True)


def back_shelf(G, fr, a0, a1, wb, kind):
    I = G["int"]
    for k in range(5):
        z = PZ + 0.25 + k * 0.48
        I.box((a0, wb, z), (a1, wb + 0.4, z + 0.025), 3, fr=fr)
        stock(G, fr, a0 + 0.05, a1 - 0.05, wb + 0.02, wb + 0.38, z + 0.025, along_w=False)


def gondola(G, fr, am, w0, w1, kind):
    I = G["int"]
    I.box((am - 0.04, w0, PZ), (am + 0.04, w1, PZ + 1.5), 3, fr=fr)
    for k in range(3):
        z = PZ + 0.2 + k * 0.48
        for s in (-1, 1):
            I.box((min(am, am + s * 0.42), w0, z), (max(am, am + s * 0.42), w1, z + 0.025), 3, fr=fr)
            stock(G, fr, am + s * 0.05, am + s * 0.4, w0 + 0.05, w1 - 0.05, z + 0.025, along_w=True)


def stock(G, fr, a0, a1, w0, w1, z, along_w):
    """Packets and boxes along a shelf: varied sizes and colours, a few gaps, all blank."""
    I = G["int"]
    lo_a, hi_a = min(a0, a1), max(a0, a1)
    if along_w:
        x, end = w0, w1
        while x < end - 0.08:
            s = rng.uniform(0.07, 0.22)
            if rng.random() < 0.85:
                h = rng.uniform(0.12, 0.36)
                d = rng.uniform(0.6, 1.0) * (hi_a - lo_a)
                I.box((lo_a, x, z), (lo_a + d, x + s, z + h), 5, fr=fr, gcol=rng.choice(GOODS))
            x += s + 0.008
    else:
        x, end = lo_a, hi_a
        while x < end - 0.08:
            s = rng.uniform(0.07, 0.22)
            if rng.random() < 0.85:
                h = rng.uniform(0.12, 0.36)
                d = rng.uniform(0.6, 1.0) * (w1 - w0)
                I.box((x, w0, z), (x + s, w0 + d, z + h), 5, fr=fr, gcol=rng.choice(GOODS))
            x += s + 0.008


def roller(G, fr, s0, s1, zb, top):
    """A roller shutter down to zb (closed, or half up), its bottom rail and guides, the box over it."""
    sh = G["shut"]
    sh.face([fr.p(s0, -0.08, zb), fr.p(s1, -0.08, zb), fr.p(s1, -0.08, top), fr.p(s0, -0.08, top)], 0, n=fr.W)
    sh.face([fr.p(s0, -0.1, zb), fr.p(s1, -0.1, zb), fr.p(s1, -0.1, top), fr.p(s0, -0.1, top)], 0, n=-fr.W)
    G["steel"].box((s0, -0.11, zb - 0.05), (s1, -0.05, zb), fr=fr)
    for aa in (s0, s1 - 0.06):
        G["steel"].box((aa, -0.12, PZ), (aa + 0.06, -0.04, top), fr=fr)
    G["steel"].box((s0, -0.12, top - 0.02), (s1, 0.12, top + 0.04), fr=fr)


# ---------------------------------------------------------------- signs
def sign_box(G, fr, a, wn, wf, zb, zt, kind, col, strength, col2=None, field=None):
    """A projecting sign: its faces look along the street (+-A). wn..wf its reach out from the wall, zb..zt its height.
    kind: box (lightbox), neon (a lit panel with a luminous tube edge), dead (unlit painted panel). Always a single
    filled colour field: col2 and field are ignored (kept for the call signature)."""
    S = G["sign"]
    t = 0.15
    rim = 0.03
    for lo, hi in (((a - t, wn, zt - rim), (a + t, wf, zt)), ((a - t, wn, zb), (a + t, wf, zb + rim)),
                   ((a - t, wn, zb), (a + t, wn + rim, zt)), ((a - t, wf - rim, zb), (a + t, wf, zt))):
        S.box(lo, hi, 0, fr=fr)
    uv = {"suv": [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)]}
    lit = kind in ("box", "neon")
    panel = strength if kind == "box" else strength * 0.06
    for s in (-1, 1):
        aa = a + s * (t - 0.02)
        P = [fr.p(aa, wn + rim, zb + rim), fr.p(aa, wf - rim, zb + rim), fr.p(aa, wf - rim, zt - rim), fr.p(aa, wn + rim, zt - rim)]
        # one plain filled panel in a single colour: no inset fields, no splits, no inner strokes or open outlines,
        # nothing that could be taken for a character (nested or barred frames read as glyphs)
        if lit:
            S.face(P, 1, n=fr.A * s, corner=uv, scol=col, sstr=panel)
        else:
            S.face(P, 2, n=fr.A * s)
    # (no edge tubes: a panel dimmer than its bright edge read as an open outline, a glyph; every sign is a plain
    # filled panel, the "neon" kind only a dimmer one)
    # brackets back to the wall, a diagonal stay on long ones
    st = G["steel"]
    for zz in (zt - 0.12, zb + 0.12):
        st.box((a - 0.03, 0.0, zz - 0.03), (a + 0.03, wn + 0.02, zz + 0.03), fr=fr)
    if wf > 2.2:
        tube(st, [fr.p(a, 0.05, zt + min(1.6, wf * 0.45)), fr.p(a, wf * 0.8, zt)], 0.014, segs=5)
        st.box((a - 0.05, -0.02, zt + min(1.6, wf * 0.45) - 0.08), (a + 0.05, 0.03, zt + min(1.6, wf * 0.45) + 0.08), fr=fr)


def rect_tube(G, fr, aa, w0, w1, z0, z1, col, strength):
    N = G["neon"]
    r = 0.014
    for lo, hi in (((aa - r, w0, z0 - r), (aa + r, w1, z0 + r)), ((aa - r, w0, z1 - r), (aa + r, w1, z1 + r)),
                   ((aa - r, w0 - r, z0), (aa + r, w0 + r, z1)), ((aa - r, w1 - r, z0), (aa + r, w1 + r, z1))):
        N.box(lo, hi, 0, fr=fr, scol=col, sstr=strength)


def bar_tube(G, fr, aa, w0, w1, z, col, strength):
    r = 0.012
    G["neon"].box((aa - r, w0, z - r), (aa + r, w1, z + r), 0, fr=fr, scol=col, sstr=strength)


def separated_sign(fr, side, a, near, far, low, high, kind):
    """Reject overlaps between blank panels that would form a stepped glyph in the wide shot."""
    inv, origin = _BASE["wide_view"]
    corners = [inv @ (fr.p(a, w, z) - origin) for w in (near, far) for z in (low, high)]
    if any(p.z >= -0.1 for p in corners):
        return True
    xs = [-p.x / p.z for p in corners]
    ys = [-p.y / p.z for p in corners]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    if x1 < -0.75 or x0 > 0.75 or y1 < -0.45 or y0 > 0.65:
        return True
    depth = fr.p(a, near, low).y
    size = (x1-x0)*(y1-y0)
    for left, right, bottom, top, area0, depth0, side0, kind0 in _BASE["sign_rectangles"]:
        overlap = max(0, min(x1, right)-max(x0, left)) * max(0, min(y1, top)-max(y0, bottom))
        gap = abs(depth-depth0)
        if gap > 1.5 and overlap > 0.15 * min(size, area0):
            return False
        if overlap and gap < 6 and side == side0 and "dead" in (kind, kind0) and kind != kind0:
            return False
    _BASE["sign_rectangles"].append((x0,x1,y0,y1,size,depth,side,kind))
    return True


def signs(G, fr, side, W, H, b):
    """Projecting signs for one building: a few slots across its width, stacked up its first floors."""
    n = b["nsigns"]
    if n == 0:
        return
    slots = sorted(rng.sample([0.6 + i * (W - 1.2) / 7 for i in range(8)], min(n, 8)))
    for a in slots:
        yw = (fr.p(a, 0, 0)).y
        reach = pick([(rng.uniform(1.0, 2.2), 4), (rng.uniform(2.2, 3.6), 3), (rng.uniform(3.6, 5.6), 2)])
        x_end = XF - 0.3 - reach
        tall = rng.random() < 0.35
        if tall:
            h = rng.uniform(3.0, 7.5)
            reach = min(reach, rng.uniform(0.9, 1.5))
            x_end = XF - 0.3 - reach
        else:
            h = rng.uniform(1.0, 2.6)
        # chunky signs only (a long thin bar reads as a stroke, and strokes stacked in perspective as characters):
        # the same draws reshaped, so the rest of the street's random layout is unchanged
        if tall:
            h2 = 2.8 + (h - 3.0) * (2.4 / 4.5)
            reach2 = 1.3 + (reach - 0.9) * (0.6 / 1.3) if reach < 1.5 else 1.9
        else:
            h2 = 1.4 + (h - 1.0) * (1.4 / 1.6)
            reach2 = min(reach, 2.6 * h2)
        zmin = 4.8 if x_end > RW else (5.6 if x_end > TRACK + 1.0 else 8.4)
        zb = rng.uniform(zmin, min(H - h - 1.0, zmin + 9.0))
        if zb < zmin:
            continue
        zt = zb + h
        # keep clear of the tram span wires (7.0-8.1 m) and of the other signs on this building
        if any(abs(yw - ys) < 0.6 for ys in SPANS) and zb < 8.2 and zt > 6.9:
            continue
        if any(abs(yw - s[0]) < 0.45 and not (zt < s[2] - 0.2 or zb > s[3] + 0.2) for s in SIGNS):
            continue
        zt_drawn = zt                    # recorded for the later checks, so the random sequence stays as it was
        near_span = any(abs(yw - ys) < 0.6 for ys in SPANS)
        if near_span and zb < 8.2 and zb + h2 > 6.85:
            h2 = h if 6.85 - zb < 1.2 else 6.85 - zb
        h, reach = h2, reach2
        zt = min(zb + h, H - 0.6)
        x_end = XF - 0.3 - reach
        kind = pick([("box", 6), ("neon", 3.5), ("dead", 1.2)])
        cname = pick(SIGN_W)
        recent = RECENT.setdefault(side, [])
        if cname in recent:             # no colour twice among the last three signs on this side (they stack and merge)
            order = [c for c, _ in SIGN_W]
            i = order.index(cname)
            cname = next(order[(i + k) % len(order)] for k in range(1, len(order)) if order[(i + k) % len(order)] not in recent)
        recent.append(cname)
        del recent[:-3]
        col = SIGN_COL[cname]
        col2 = SIGN_COL[pick(SIGN_W)] if rng.random() < 0.72 else None
        # lightboxes the brightest things in the street after the shop interiors: they light the facades round them
        strength = b.get("sign_gain", 1.0) * (rng.uniform(1.0, 2.2) if kind == "box" else rng.uniform(20.0, 32.0))
        if cname in ("warm", "cream", "cool", "yellow") and kind == "box":
            strength *= 0.75
        field = None
        if kind == "box" and col2 is not None:
            field = pick([((0.12, 0.12, 0.88, 0.88), 3), ((0.0, 0.5, 1.0, 1.0), 2), ((0.08, 0.06, 0.92, 0.4), 2)])
        wn = 0.3 + max(0.0, b["setback"])         # clear of an overhanging upper facade
        if separated_sign(fr, side, a, wn, wn + reach, zb, zt, kind):
            sign_box(G, fr, a, wn, wn + reach, zb, zt, kind, col, strength, col2, field)
            if kind != "dead" and 0 < yw < 90 and zt < 20 and _BASE["sign_lights"] < 60:
                power = 8 * reach * (zt-zb) * strength * (0.06 if kind == "neon" else 1)
                for direction in (-1, 1):
                    key = f"sign spill {_BASE['sign_lights']}"
                    area(key, fr.p(a + 0.27*direction, wn+reach/2, (zb+zt)/2),
                         (0.60, zt-zb), power, col, fr.A*direction, spread=140)
                    _BASE["sign_lights"] += 1
        SIGNS.append((yw, yw, zb, zt_drawn, side * x_end))
    # a fascia sign over each shop (parallel to the wall), lit or dead
    if not b.get("boutique") and rng.random() < 0.8:
        S = G["sign"]
        S.box((0.4, 0.0, 3.62), (W - 0.4, 0.2, 4.3), 0, fr=fr)
        if rng.random() < 0.65:
            c = SIGN_COL[pick(SIGN_W)]
            S.face([fr.p(0.5, 0.205, 3.68), fr.p(W - 0.5, 0.205, 3.68), fr.p(W - 0.5, 0.205, 4.24), fr.p(0.5, 0.205, 4.24)], 1,
                   n=fr.W, corner={"suv": [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)]}, scol=c,
                   sstr=b.get("sign_gain", 1.0) * rng.uniform(2.0, 3.6))


# ---------------------------------------------------------------- the boutique (Dawn's window)
def boutique(G, props):
    """A small leather-goods boutique on the right-hand side: a glazed front in dark bronze frames on a polished stone
    stall riser, a display window with a dark felt backdrop, a plinth and a floating shelf under spots, three
    handbags (the film's tote, satchel and shoulder bag), all blank: no name, no tags, no prices. Through the
    door, a warm interior."""
    B = BOUTIQUE
    gx, bx = B["glass_x"], B["back_x"]
    d0, d1 = B["disp"]
    D0, D1 = B["door"]
    y0, y1 = B["y0"], B["y1"]
    F = G["bq"]       # materials: 0 bronze frame, 1 stone riser, 2 felt, 3 plinth, 4 dark wood, 5 interior wall
    # stall riser and frames
    F.box((gx - 0.02, d0 - 0.05, PZ), (gx + 0.12, d1 + 0.05, 0.62), 1)
    # The butt joint between two display panes, visible at the right edge of
    # the close-up. Its bead is narrower than the metal shopfront stiles.
    F.box((gx - 0.006, 18.118, 0.62), (gx + 0.009, 18.130, 3.30), 0)
    for y in (d0 - 0.06, d1, D0 - 0.06, D1):
        F.box((gx - 0.04, y, PZ), (gx + 0.06, y + 0.06, 3.62), 0)
    F.box((gx - 0.04, d0 - 0.06, 3.3), (gx + 0.06, D1 + 0.06, 3.38), 0)
    F.box((gx - 0.04, d0 - 0.06, 0.6), (gx + 0.06, d1 + 0.06, 0.66), 0)
    F.box((gx - 0.04, d0 - 0.06, 3.56), (gx + 0.06, D1 + 0.06, 3.64), 0)
    F.box((gx - 0.04, D0, 2.6), (gx + 0.06, D1, 2.66), 0)                         # door head
    F.box((gx - 0.04, D0 - 0.02, PZ), (gx + 0.06, D0 + 0.06, 2.62), 0)           # door stiles
    F.box((gx - 0.04, D1 - 0.06, PZ), (gx + 0.06, D1 + 0.02, 2.62), 0)
    F.box((gx - 0.08, D0 + 0.12, 0.95), (gx - 0.05, D0 + 0.15, 1.65), 0)          # pull handle
    for zz in (1.02, 1.58):
        F.box((gx - 0.08, D0 + 0.12, zz), (gx - 0.03, D0 + 0.15, zz + 0.02), 0)
    # the piers left and right of the front, in dark stone
    F.box((gx - 0.05, y0, PZ), (gx + 0.3, d0 - 0.06, 3.64), 1)
    F.box((gx - 0.05, D1 + 0.06, PZ), (gx + 0.3, y1, 3.64), 1)
    F.box((gx - 0.05, d1 + 0.06, PZ), (gx + 0.3, D0 - 0.06, 3.64), 1)
    # glass
    Gl = G["bqglass"]
    Gl.face([(gx, d0, 0.66), (gx, d1, 0.66), (gx, d1, 3.3), (gx, d0, 3.3)], 0, n=(-1, 0, 0))
    Gl.face([(gx, D0 + 0.06, PZ + 0.02), (gx, D1 - 0.06, PZ + 0.02), (gx, D1 - 0.06, 2.6), (gx, D0 + 0.06, 2.6)], 0, n=(-1, 0, 0))
    Gl.face([(gx, d0, 3.38), (gx, D1, 3.38), (gx, D1, 3.56), (gx, d0, 3.56)], 0, n=(-1, 0, 0))
    # the display box: felt back and sides, ceiling, floor
    F.face([(bx, d0 - 0.06, 0.62), (bx, d1 + 0.06, 0.62), (bx, d1 + 0.06, 3.3), (bx, d0 - 0.06, 3.3)], 2, n=(-1, 0, 0))
    for y, n in ((d0 - 0.06, (0, 1, 0)), (d1 + 0.06, (0, -1, 0))):
        F.face([(gx + 0.06, y, 0.62), (bx, y, 0.62), (bx, y, 3.3), (gx + 0.06, y, 3.3)], 2, n=n)
    F.face([(gx + 0.06, d0 - 0.06, 3.3), (bx, d0 - 0.06, 3.3), (bx, d1 + 0.06, 3.3), (gx + 0.06, d1 + 0.06, 3.3)], 2, n=(0, 0, -1))
    F.box((gx + 0.06, d0 - 0.06, 0.6), (bx, d1 + 0.06, 0.66), 4)
    # plinth and floating shelf
    F.box((7.62, 16.9, 0.66), (8.32, 17.9, 0.92), 3)
    F.box((7.55, 17.8, 1.08), (8.5, 19.8, 1.12), 4)
    for yy in (18.0, 19.6):                                                        # the shelf's brackets
        F.box((8.47, yy - 0.015, 0.95), (8.55, yy + 0.015, 1.08), 0)
    # LED strip under the shelf's front edge
    G["tube"].box((7.62, 17.85, 1.065), (7.66, 19.75, 1.08), 2)
    F.box((8.02, 18.12, 1.59), (8.49, 18.70, 1.615), 4)
    G["dress"].box((8.11, 18.28, 1.615), (8.39, 18.54, 1.69), 3)
    F.box((gx-0.012, 19.92, 0.63), (gx+0.028, 19.95, 3.28), 0)
    # the warm interior through the door
    for (p, n) in (([(12.5, 19.9, PZ), (12.5, 22.3, PZ), (12.5, 22.3, 3.4), (12.5, 19.9, 3.4)], (-1, 0, 0)),):
        F.face(p, 5, n=n)
    F.face([(gx + 0.06, 19.9, PZ + 0.01), (12.5, 19.9, PZ + 0.01), (12.5, 22.3, PZ + 0.01), (gx + 0.06, 22.3, PZ + 0.01)], 4, n=(0, 0, 1))
    F.face([(gx + 0.06, 19.9, 3.4), (12.5, 19.9, 3.4), (12.5, 22.3, 3.4), (gx + 0.06, 22.3, 3.4)], 5, n=(0, 0, -1))
    F.face([(gx + 0.06, 19.95, PZ), (12.5, 19.95, PZ), (12.5, 19.95, 3.4), (gx + 0.06, 19.95, 3.4)], 5, n=(0, 1, 0))
    F.face([(gx + 0.06, 22.25, PZ), (12.5, 22.25, PZ), (12.5, 22.25, 3.4), (gx + 0.06, 22.25, 3.4)], 5, n=(0, -1, 0))
    for x in (9.0, 10.5, 12.0):
        G["int"].box((x - 0.25, 20.8, 3.37), (x + 0.25, 21.4, 3.395), 6)
    F.box((10.6, 20.0, PZ), (11.6, 20.45, PZ + 1.6), 4)
    F.box((9.2, 21.6, PZ), (10.6, 22.2, PZ + 0.95), 3)
    # the fascia: a warm blank lightbox in a bronze frame
    S = G["sign"]
    S.box((gx - 0.08, y0 + 0.4, 3.66), (gx + 0.0, y1 - 0.4, 4.32), 0)
    S.face([(gx - 0.085, y0 + 0.5, 3.72), (gx - 0.085, y1 - 0.5, 3.72), (gx - 0.085, y1 - 0.5, 4.26), (gx - 0.085, y0 + 0.5, 4.26)], 1,
           n=(-1, 0, 0), corner={"suv": [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)]}, scol=(1.0, 0.86, 0.68), sstr=2.4)
    # lights: three warm spots on the bags, a soft top light, the LED strip, the spill through the glass, the
    # interior
    # (a spot's watts spread over the whole sphere: 450 W puts about 9 W/m2 on a bag 2 m below, the window's
    # brightest thing)
    spot("bq_spot_shoulder", (7.5, 17.28, 3.2), (7.97, 17.52, 1.05), 560.0, (1.0, 0.74, 0.5), 18, 0.3, 0.02)
    spot("bq_spot_satchel", (7.5, 18.25, 3.2), (8.0, 18.5, 1.25), 600.0, (1.0, 0.74, 0.5), 18, 0.3, 0.02)
    spot("bq_spot_tote", (7.5, 19.05, 3.2), (8.02, 19.3, 1.25), 600.0, (1.0, 0.74, 0.5), 18, 0.3, 0.02)
    area("bq_top", (8.0, 18.1, 3.25), (0.8, 3.4), 22.0, (1.0, 0.86, 0.7), (0, 0, -1), spread=100)
    area("bq_led", (7.64, 18.8, 1.06), (0.05, 1.9), 15.0, (1.0, 0.9, 0.78), (0, 0, -1), spread=150)
    # the display's glow on whoever stands at the glass (the light a lit window throws on a face): just inside the
    # glass at face height, turned out to the street; unseen by the camera and in reflections
    g = area("bq_glow", (7.32, 18.3, 1.45), (2.6, 0.7), 60.0, (1.0, 0.86, 0.7), (-1, 0, 0.0), spread=120)
    g.visible_glossy = False
    area("bq_spill", (7.4, 18.6, 3.15), (3.4, 0.4), 110.0, (1.0, 0.84, 0.64), (-0.75, 0, -0.66), spread=130)
    area("bq_door", (8.0, 21.0, 3.3), (1.4, 1.6), 140.0, (1.0, 0.8, 0.58), (-0.5, 0, -0.86), spread=140)
    area("bq_inside", (10.5, 21.1, 3.35), (2.5, 1.8), 120.0, (1.0, 0.8, 0.58), (0, 0, -1), spread=160)
    # the bags on display
    out = {}
    spec = {"handbag-tote": ((8.02, 19.3, 1.12), 0.35, -108.0, dict(sat=1.0, val=0.85, hue=0.515, rough_add=0.25)),
            "handbag-satchel": ((8.0, 18.5, 1.12), 0.30, -72.0, dict(sat=0.8, rough_add=0.12)),
            "handbag-shoulder": ((7.97, 17.52, 0.92), 0.32, -105.0, dict(sat=0.55, val=0.55, rough_add=0.25))}
    for name, (loc, size, turn, grade) in spec.items():
        h = props.load(name, size=size, axis="long", loc=loc, turn_deg=turn, **grade)
        for o in h.children_recursive:
            if o.type != "MESH":
                continue
            for sl in o.material_slots:
                bb = next((n for n in sl.material.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if sl.material else None
                if bb is not None:
                    bb.inputs["Specular IOR Level"].default_value = 0.35
                    if "Coat Weight" in bb.inputs:
                        bb.inputs["Coat Weight"].default_value = 0.0
        out[name] = h
    OBJ["bags"] = out
    return out


# ---------------------------------------------------------------- the street
def street(G):
    g = G["ground"]   # materials: 0 asphalt, 1 pavers, 2 granite, 3 white paint, 4 yellow paint, 5 rail, 6 iron
    ya, yb = Y0 - 20, END_Y + 4
    g.face([(-RW, ya, 0), (RW, ya, 0), (RW, yb, 0), (-RW, yb, 0)], 0, n=(0, 0, 1))
    for s in (-1, 1):
        x0, x1 = sorted((s * (RW + 0.3), s * XF))
        g.face([(x0, ya, PZ), (x1, ya, PZ), (x1, yb, PZ), (x0, yb, PZ)], 1, n=(0, 0, 1))
        # granite kerb stones, 1 m long, a hair apart
        y = ya
        while y < yb:
            L = rng.uniform(0.85, 1.15)
            xa, xb = sorted((s * RW, s * (RW + 0.3)))
            g.box((xa, y + 0.004, -0.05), (xb, y + L - 0.004, PZ), 2)
            y += L
        # double yellow lines along the kerb
        for off in (0.18, 0.38):
            xx = s * (RW - off)
            g.box((xx - 0.05, ya, 0.0), (xx + 0.05, yb, 0.0025), 4)
        # broken white line at the tram lane edge
        y = ya
        while y < yb:
            xx = s * (TRACK + 0.95)
            g.box((xx - 0.05, y, 0.0), (xx + 0.05, y + 1.0, 0.0025), 3)
            y += 3.0
        # tram rails: steel heads flush with the road and a dark groove beside each
        for r in (-1, 1):
            xr = s * TRACK + r * GAUGE / 2
            g.box((xr - 0.032, ya, -0.01), (xr + 0.032, yb, 0.003), 5)
            g.box((xr - r * 0.032 - 0.015, ya, -0.03), (xr - r * 0.032 + 0.015, yb, -0.004), 6)
        # gully gratings at the kerb, every 14 m
        y = Y0 + 4
        while y < yb:
            xx = s * (RW - 0.25)
            g.box((xx - 0.2, y, -0.004), (xx + 0.2, y + 0.75, 0.003), 6)
            y += 14.0 + rng.uniform(-2, 2)
    # manhole covers
    for (x, y) in ((-3.2, 6.5), (2.9, 23.0), (0.1, 41.0), (-2.6, 58.0), (3.1, 77.0)):
        g.box((x - 0.33, y - 0.33, -0.002), (x + 0.33, y + 0.33, 0.004), 6)
    # a zebra crossing further down
    for i in range(16):
        x = -RW + 0.35 + i * 0.55
        g.box((x, 52.0, 0.0), (x + 0.3, 55.0, 0.0028), 3)


def railings(G):
    """Kerbside pedestrian railings in runs (painted steel: top and bottom rails, close verticals)."""
    R = G["railing"]
    for side, ya, yb in ((1, -10.0, 9.5), (1, 26.0, 40.0), (-1, -6.0, 12.0), (-1, 34.0, 50.0), (1, 60.0, 74.0), (-1, 70.0, 86.0)):
        x = side * (RW + 0.42)
        y = ya
        while y < yb - 0.5:
            yl = min(y + 2.0, yb)
            for zz in (0.25 + PZ, 1.0 + PZ):
                R.box((x - 0.02, y, zz - 0.02), (x + 0.02, yl, zz + 0.02))
            R.box((x - 0.03, y, PZ), (x + 0.03, y + 0.06, 1.06 + PZ))
            n = int((yl - y) / 0.13)
            for k in range(1, n):
                yy = y + k * (yl - y) / n
                R.box((x - 0.008, yy - 0.008, 0.27 + PZ), (x + 0.008, yy + 0.008, 0.98 + PZ))
            y = yl + 0.05


def lamps(G):
    """Street lamps: tall grey poles at the kerb with an arm over the road and a warm-white head."""
    P = G["pole"]
    for (side, y, e) in ((-1, 30.0, 900.0), (1, 64.0, 1000.0), (-1, 98.0, 1100.0), (1, 132.0, 1200.0), (-1, 166.0, 1200.0)):
        x = side * (RW + 0.55)
        tube(P, [(x, y, PZ), (x, y, 9.0)], 0.09, segs=10)
        tube(P, [(x, y, 8.8), (x - side * 0.6, y, 9.35), (x - side * 1.9, y, 9.5)], 0.045, segs=8)
        hx = x - side * 2.15
        P.box((hx - 0.35, y - 0.17, 9.38), (hx + 0.35, y + 0.17, 9.55))
        G["lamp"].box((hx - 0.28, y - 0.12, 9.365), (hx + 0.28, y + 0.12, 9.38), 0)
        spot(f"lamp_{y:.0f}", (hx, y, 9.3), (hx + side * 0.6, y, 0.0), e, (1.0, 0.86, 0.68), 110, 0.6, 0.15)


def wires(G):
    """Tram contact wires on span wires across the street, and the tangle of utility cables."""
    C = G["cable"]
    for s in (-1, 1):
        x = s * TRACK
        tube(C, [(x, Y0 - 10, 5.9), (x, END_Y, 5.9)], 0.007, segs=5)
    for ys in SPANS:
        pts = catenary((-XF + 0.05, ys, 7.75), (XF - 0.05, ys, 7.75), 0.32, 16)
        tube(C, pts, 0.008, segs=5)
        for s in (-1, 1):
            x = s * TRACK
            zt = 7.75 - 0.32 * 4 * ((x + XF) / (2 * XF)) * (1 - (x + XF) / (2 * XF))
            tube(C, [(x, ys, zt), (x, ys, 5.9)], 0.006, segs=5)
            G["steel"].box((x - 0.05, ys - 0.05, 6.15), (x + 0.05, ys + 0.05, 6.4))         # insulator
            G["steel"].box((x - 0.4, ys - 0.012, 5.9), (x + 0.4, ys + 0.012, 5.93))        # pull-off arm
        for s in (-1, 1):
            G["steel"].box((s * XF - 0.08, ys - 0.1, 7.6), (s * XF + 0.08, ys + 0.1, 7.9))  # wall rosette
    # utility cables across the street, clear of the signs
    n, tries = 0, 0
    while n < 22 and tries < 300:
        tries += 1
        y = rng.uniform(Y0 + 2, 170.0)
        za, zb = rng.uniform(4.6, 9.0), rng.uniform(4.6, 9.0)
        if any(abs(y - s[0]) < 0.6 and s[2] - 0.5 < max(za, zb) and min(za, zb) < s[3] + 0.5 for s in SIGNS):
            continue
        if any(abs(y - ys) < 0.8 for ys in SPANS):
            continue
        dy = rng.uniform(-3.0, 3.0)
        count = rng.choice((1, 1, 2, 3))
        for k in range(count):
            off = Vector((0, rng.uniform(-0.05, 0.05), rng.uniform(-0.06, 0.06)))
            pts = catenary(Vector((-XF + 0.1, y, za)) + off, Vector((XF - 0.1, y + dy, zb)) + off, rng.uniform(0.3, 0.9), 16)
            tube(C, pts, rng.uniform(0.006, 0.011), segs=5)
        n += 1
    # cables festooned along both facades at the fascia, between brackets
    for s in (-1, 1):
        y = Y0
        while y < 190:
            L = rng.uniform(3.0, 6.0)
            z = rng.uniform(4.45, 4.75)
            for k in range(rng.choice((1, 2, 3))):
                pts = catenary((s * (XF - 0.12), y, z + k * 0.04), (s * (XF - 0.12), y + L, z + k * 0.04 + rng.uniform(-0.1, 0.1)),
                               rng.uniform(0.08, 0.25), 10)
                tube(C, pts, 0.008, segs=5)
            y += L


def tram(G):
    """A double-deck streetcar on the far track, readable by its stacked windows and wheels."""
    x, y = TRACK, 120.0
    car = G["railing"]
    car.box((x-1.18, y-5.7, 0.35), (x+1.18, y+5.7, 4.45), 0)
    for side in (-1, 1):
        for offset in (-3.75, 3.75):
            tube(G["steel"], [(x+side*1.02, y+offset, 0.39), (x+side*1.10, y+offset, 0.39)], 0.39, segs=18)
        for z in (1.22, 3.00):
            for i in range(8):
                yy = y-5.08+i*1.35
                G["int"].box((x+side*1.185-0.003, yy, z), (x+side*1.185+0.003, yy+1.08, z+0.85), 9)
            G["int"].box((x-0.98, y+side*5.71-0.004, z), (x+0.98, y+side*5.71+0.004, z+0.85), 9)


def end_building(G):
    """The building across the far end, closing the vista: windows and a few big lit panels, mostly in haze."""
    fr = Frame((XF + 14, END_Y, 0.0), (-1, 0, 0), (0, -1, 0))
    W = 2 * XF + 28
    fac = G["fac"]
    fac.set(fcol=(0.36, 0.35, 0.33), fk=0.0)
    holes = []
    for f in range(14):
        z0 = GF + f * 3.0
        hs = [(1.0 + i * 2.4, 2.4 + i * 2.4, z0 + 0.9, z0 + 2.3) for i in range(int((W - 2) // 2.4))]
        wall_openings(fac, fr, 0, W, z0, z0 + 3.0, hs, 0.14)
        for h in hs:
            window(G, fr, *h, -0.12)
    fac.face([fr.p(0, 0, PZ), fr.p(W, 0, PZ), fr.p(W, 0, GF), fr.p(0, 0, GF)], 0, n=fr.W)
    for a, z, w, h, c, s in ((10.0, 6.0, 3.0, 5.0, "violet", 2.2), (17.0, 9.5, 5.5, 2.0, "warm", 1.8), (26.0, 5.5, 2.4, 6.5, "teal", 1.8),
                             (12.5, 12.0, 4.0, 1.6, "cream", 1.6)):
        G["sign"].box((a, 0.0, z), (a + w, 0.25, z + h), 0, fr=fr)
        G["sign"].face([fr.p(a + 0.08, 0.255, z + 0.08), fr.p(a + w - 0.08, 0.255, z + 0.08), fr.p(a + w - 0.08, 0.255, z + h - 0.08),
                        fr.p(a + 0.08, 0.255, z + h - 0.08)], 1, n=fr.W, corner={"suv": [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)]},
                       scol=SIGN_COL[c], sstr=s * 2.0)
    area("end_glow", (0, END_Y - 3, 3.0), (12, 3), 900.0, (1.0, 0.85, 0.65), (0, -0.3, -1), spread=160)


def sky():
    me = bpy.data.meshes.new("sky")
    me.from_pydata([(-80, -60, 95), (80, -60, 95), (80, 420, 95), (-80, 420, 95)], [], [(0, 3, 2, 1)])
    ob = link(bpy.data.objects.new("sky", me))
    ob.data.materials.append(M["sky"])
    ob.visible_shadow = False
    # beyond the end building: a far backdrop so no ray escapes to the void
    me2 = bpy.data.meshes.new("sky_far")
    me2.from_pydata([(-80, 400, 0), (80, 400, 0), (80, 400, 95), (-80, 400, 95)], [], [(0, 3, 2, 1)])
    ob2 = link(bpy.data.objects.new("sky_far", me2))
    ob2.data.materials.append(M["sky"])
    OBJ["sky"] = ob


def haze(density=0.0035):
    h = sk.haze((2 * XF, END_Y - Y0 + 10, 30.0), (0, (END_Y + Y0) / 2, 15.0), density, colour=(0.78, 0.82, 0.88))
    h.visible_shadow = False
    OBJ["haze"] = h
    return h


def dressing(G):
    """A few things on the pavement: stacked crates and flattened cartons outside the open shops, a folding stool,
    bollards at the crossing, a plain litter bin."""
    D = G["dress"]   # 0 crate plastic, 1 cardboard, 2 steel
    for (x, y, n) in ((6.75, 9.2, 3), (-6.7, 25.5, 2), (6.8, 31.5, 2), (-6.75, 42.0, 4)):
        for k in range(n):
            t = rng.uniform(-0.04, 0.04)
            D.box((x - 0.3 + t, y - 0.2 + t, PZ + k * 0.28), (x + 0.3 + t, y + 0.2 + t, PZ + (k + 1) * 0.28 - 0.01), 0)
    for (x, y) in ((6.95, 10.2), (-6.95, 27.0)):
        D.box((x - 0.04, y - 0.5, PZ), (x + 0.04, y + 0.5, PZ + 1.1), 1)
    for (x, y) in ((4.9, 51.0), (4.9, 56.0), (-4.9, 51.0), (-4.9, 56.0)):
        tube(D, [(x, y, PZ), (x, y, PZ + 0.9)], 0.06, 2, segs=10)
    tube(D, [(5.1, 3.0, PZ), (5.1, 3.0, PZ + 0.95)], 0.22, 2, segs=14)
    # standing lightboxes on the pavement by the shop doors: blank glowing slabs on a weighted foot, their faces
    # along the pavement, the walkers' practicals
    S = G["sign"]
    uv = {"suv": [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)]}
    for (x, y, c, e) in ((6.6, 34.6, "warm", 1.6), (-6.6, 15.6, "violet", 2.2), (6.6, 57.5, "cream", 1.4), (-6.6, 47.5, "teal", 1.8),
                         (6.6, 88.0, "amber", 1.8), (-6.6, 70.5, "warm", 1.5)):
        S.box((x - 0.24, y - 0.16, PZ), (x + 0.24, y + 0.16, PZ + 0.08), 0)
        S.box((x - 0.22, y - 0.12, PZ + 0.08), (x + 0.22, y + 0.12, PZ + 1.32), 0)
        for sgn in (-1, 1):
            yy = y + sgn * 0.123
            S.face([(x - 0.19, yy, PZ + 0.14), (x + 0.19, yy, PZ + 0.14), (x + 0.19, yy, PZ + 1.27), (x - 0.19, yy, PZ + 1.27)], 1,
                   n=(0, sgn, 0), corner=uv, scol=SIGN_COL[c], sstr=e * 2.0)


# ---------------------------------------------------------------- plan and build
def plan(side, seed):
    """Buildings along one side, Y0 to the cross street: varied widths, kinds, heights, colours and setbacks. On the
    right a building is fixed at y 15.4..23.6 for the boutique."""
    r = random.Random(seed)
    out = []
    y = Y0
    i = 0
    fixed = (15.4, 23.6) if side > 0 else None
    stop = END_Y - 14
    while y < stop - 0.5:
        bq = False
        if fixed and abs(y - fixed[0]) < 1e-6:
            w, bq = fixed[1] - fixed[0], True
        else:
            w = r.uniform(5.6, 10.5)
            if fixed and y < fixed[0] < y + w + 4.0:
                if fixed[0] - y < 4.0 and out:
                    out[-1]["y1"] = fixed[0]
                    y = fixed[0]
                    continue
                w = fixed[0] - y
        w = min(w, stop - y)
        style = r.choices(["tenement", "slab", "tower"], [0.3, 0.45, 0.25])[0]
        if style == "tenement":
            fh = r.uniform(3.2, 3.5)
            H = GF + fh * r.randint(4, 6)
        elif style == "slab":
            fh = r.uniform(2.85, 3.05)
            H = GF + fh * r.randint(9, 16)
        else:
            fh = r.uniform(2.8, 2.95)
            H = GF + fh * r.randint(15, 24)
        out.append(dict(id=f"{'R' if side > 0 else 'L'}{i}", side=side, y0=y, y1=y + w, style=style, fh=fh, H=H,
                        setback=0.0 if bq else r.choice((0.0, 0.0, 0.15, 0.3, 0.55, -0.15)), col=r.choice(WALLS),
                        winfrac=r.uniform(0.45, 0.62), nsigns=r.choice((2, 3, 3, 4, 4, 5)),
                        canopy=r.random() < 0.45 and not bq, boutique=bq))
        y += w
        i += 1
    for b in out:
        b["nshops"] = 1 if b["boutique"] else (2 if b["y1"] - b["y0"] > 8.4 else 1)
    return out


def shop_kinds(b):
    """What each shop is tonight, by where it stands: closed near the camera (a dark foreground), lit around Dawn's
    stretch, a mix further on."""
    yc = (b["y0"] + b["y1"]) / 2
    out = []
    for k in range(b["nshops"]):
        if b.get("boutique"):
            out.append("boutique")
            continue
        if yc < 6:
            w = [("shutter", 3), ("half_cool", 3), ("open_cool", 1)]
        elif yc < 45:
            w = [("open_warm", 4), ("open_cool", 4), ("half_warm", 1)]
        else:
            w = [("open_warm", 3), ("open_cool", 3), ("half_cool", 1), ("shutter", 2)]
        out.append(pick(w))
    return out


def build(props, wide=None):
    mt.materials()
    SIGNS.clear()
    LIT.clear()
    RECENT.clear()
    LIGHTS.clear()
    OBJ.clear()
    _BASE.clear()
    wide = wide or {"loc": (1.4, 0, 1.5), "aim": (2.45, 60, 1.5)}
    origin = Vector(wide["loc"])
    inverse = (Vector(wide["aim"])-origin).to_track_quat("-Z", "Y").to_matrix().transposed()
    _BASE.update(wide_view=(inverse, origin), sign_rectangles=[], sign_lights=0,
                 shop_index={1: 0, -1: 0}, shopkeepers={1: [], -1: []})
    G = {
        "fac": MB("facades", [M["facade"]], merge=True),
        "slab": MB("slabs_ledges", [M["slab"]]),
        "win": MB("window_glass", [M["glass"]]),
        "frame": MB("window_frames", [M["alu"]]),
        "steel": MB("steelwork", [M["steel"]]),
        "clutter": MB("balcony_clutter", [M["plastic_crate"]]),
        "cloth": MB("laundry", [M["cloth"]]),
        "sign": MB("signboards", [M["frame"], M["sign"], M["sign_dead"]]),
        "neon": MB("neon_tubes", [M["neon"]]),
        "int": MB("shop_interiors", [M["int_wall"], M["int_floor"], M["int_ceiling"], M["shelf"], M["counter"], M["goods"],
                                     M["panel_warm"], M["panel_cool"], M["shelf_glass"], M["store_lcd"]]),
        "shut": MB("shutters", [M["shutter"]]),
        "tube": MB("tubes", [M["panel_warm"], M["panel_cool"], M["shelf_led"]]),
        "ground": MB("street_ground", [M["asphalt"], M["pavers"], M["granite"], M["paint_white"], M["paint_yellow"], M["rail"], M["iron"]]),
        "railing": MB("railings", [M["rail_green"]]),
        "pole": MB("lamp_poles", [M["pole"]]),
        "lamp": MB("lamp_lenses", [M["lamp_head"]]),
        "cable": MB("cables", [M["cable"]]),
        "dress": MB("pavement_dressing", [M["plastic_crate"], M["cardboard"], M["steel"], M["card_dark"]]),
        "bq": MB("boutique", [M["alu"], M["plinth"], M["felt"], M["plinth"], M["wood_dark"], M["int_wall"]]),
        "bqglass": MB("boutique_glass", [M["shop_glass"]]),
    }
    G["bq"].mats[0] = mt.pbr("bronze frame", (0.07, 0.05, 0.035), rough=(0.25, 0.4), metal=0.9, nscale=10.0, cvar=0.15)
    G["bq"].mats[1] = mt.pbr("dark stone", (0.03, 0.029, 0.03), rough=(0.32, 0.5), nscale=5.0, cvar=0.35, bump=0.04, bscale=40)
    plans = plan(1, 31) + plan(-1, 57)
    for b in plans:
        b["shops"] = shop_kinds(b)
        # around Dawn's stretch the right-hand shops burn brightest: the lit island
        yc = (b["y0"] + b["y1"]) / 2
        b["spill"] = 1.25 if (b["side"] > 0 and 8 < yc < 32) else 0.7
        b["sign_gain"] = 0.85 if yc < 10 else 1.0
        if yc < 6:
            b["nsigns"] = min(b["nsigns"], 2)
        building(G, b["side"], b)
    bounce(G)
    street(G)
    tram(G)
    railings(G)
    lamps(G)
    wires(G)
    end_building(G)
    dressing(G)
    bags = boutique(G, props)
    for key, bev in (("fac", 0.0), ("slab", 0.02), ("win", 0.0), ("frame", 0.006), ("steel", 0.004), ("clutter", 0.01),
                     ("cloth", 0.0), ("sign", 0.012), ("neon", 0.0), ("int", 0.0), ("shut", 0.0), ("tube", 0.0), ("ground", 0.008),
                     ("railing", 0.004), ("pole", 0.0), ("lamp", 0.0), ("cable", 0.0), ("dress", 0.008), ("bq", 0.006), ("bqglass", 0.0)):
        G[key].finish(bevel=bev)
    for k in ("win", "cloth", "cable", "neon"):
        o = OBJ.get(G[k].name)
        if o is not None:
            o.visible_shadow = k not in ("win", "neon")
    sky()
    haze()
    return dict(plans=plans, bags=bags)
