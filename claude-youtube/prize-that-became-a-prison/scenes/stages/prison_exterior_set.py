"""The set for the prison exterior (Ch 08): everything outside the wall, the wall itself, and what shows over it.

Plan (metres, Z up, ground at 0). The wall's outer face is the plane x = 0 and runs along Y; the world outside is
x < 0. Along the wall: a paved apron, a kerb, the perimeter road (x -9.75 .. -1.75), the far kerb and a soaked verge
with the floodlight masts (x = -11) and an outer post-and-wire fence. The vehicle gate is at y = 0, an approach
road meets the perimeter road in front of it. The watchtower stands astride the wall at y = -22. Inside: the
gate's lamp column (its outreach arm carries the floodlight over the wall), low sodium yard lights that are never
seen themselves, and two cell blocks (y 10..40 and y 46..140) that show over the wall as dark slabs with a few
lit, barred windows.

Parts, in build order: ground (asphalt with the fillets of the junction, kerbs, apron, verge, yard), wall (bevelled
panels, plinth, coping, wire posts, line wires, the razor-wire coil as two counter-wound helices with barbs, built
as three 6 m sections and instanced), gate (piers, lintel, two ribbed leaves, hinges, lock box, drop bolts, wicket
door, threshold), tower (shaft, corbel, deck and railing, canted glazed cabin, roof, searchlight, aerial,
downlights), masts, blocks, dressing (bollards, intercom post, camera, gully grates, manhole, the outer fence), a
few sodium lamps of a road far off across the fields, sky dome, mist.

LIGHTS lists every lamp (position, axis, cone, power) so the stage can place rain only where light falls.
"""
import math
import random

import bpy  # first: bmesh and mathutils only exist once bpy is loaded
import bmesh
import numpy as np
from mathutils import Matrix, Vector

import setkit as sk
import prison_exterior_mats as mt

# ---------------------------------------------------------------- dimensions
WALL_T, WALL_H, COPE_H = 0.55, 6.0, 0.16
COPE_TOP = WALL_H + COPE_H
WALL_CX = WALL_T / 2
PANEL = 6.0
GATE_W, GATE_H, PIER_W = 6.4, 5.0, 1.2
GATE_X = 0.17                                  # the leaves' sheet, outer face
PIER_OUT = GATE_W / 2 + PIER_W                 # 4.4
Y0 = -PIER_OUT - PANEL * 15                    # -94.4
Y1 = PIER_OUT + PANEL * 38                     # 232.4
KERB = 0.12
ROAD_A, ROAD_B = -9.75, -1.75                  # the perimeter road
APRON_X = -1.6
APPROACH, FILLET = 4.5, 3.0                    # half-width of the approach road, radius of the junction kerbs
APPROACH_END = -170.0
AP_END = GATE_W / 2 + 0.25                     # where the apron stops either side of the gate crossover
TOWER = (1.2, -22.0)                           # centre of the shaft
SHAFT, SHAFT_H = 1.7, 10.4                     # half-width, height to the corbel
DECK, DECK_Z = 2.8, 11.4                       # half-width of the deck, its underside
MAST_X, MAST_TOP = -11.0, 9.05
MAST_Y = (-56.0, -28.0, 28.0, 56.0, 84.0, 112.0, 140.0, 168.0, 196.0, 224.0)
DEAD_HEAD = (84.0, 1)                          # one lamp out: (mast, which head)
COIL_R, COIL_PITCH = 0.40, 0.28
IMG_RECT = (-80.0, 2.0, -100.0, 240.0)
STOP_X = -10.6
COLD = (0.78, 0.9, 1.0)
GATE_WHITE = (1.0, 0.95, 0.86)
SODIUM = (1.0, 0.76, 0.52)
# hand-placed dips in the road where water stands: (x, y, radius x, radius y, depth)
PUDDLES = [(-7.6, -60.6, 0.8, 1.3, 0.34), (-5.1, -59.1, 0.52, 0.98, 0.28),
           (-6.8, -57.4, 0.66, 1.35, 0.29), (-8.1, -55.8, 0.47, 0.76, 0.33),
           (-4.4, -53.5, 0.71, 1.18, 0.29), (-6.0, -55.0, 1.3, 3.0, 0.3), (-4.2, -49.5, 1.0, 3.2, 0.3), (-8.3, -52.0, 0.9, 2.6, 0.26),
           (-6.2, -44.5, 1.3, 3.2, 0.3), (-3.9, -37.0, 1.0, 3.6, 0.3), (-7.9, -31.0, 1.3, 4.5, 0.26),
           (-5.2, -22.0, 1.5, 4.0, 0.28), (-4.2, -6.0, 1.6, 4.5, 0.28), (-7.0, 9.0, 1.4, 5.0, 0.26),
           (-4.6, 24.0, 1.6, 5.0, 0.28), (-6.5, 44.0, 1.5, 6.0, 0.28), (-4.0, 70.0, 1.6, 7.0, 0.28),
           (-14.3, 0.1, 4.3, 1.85, 0.44), (-16.7, -0.75, 1.8, 1.1, 0.39), (-11.6, 2.9, 1.3, 0.9, 0.3), (-19.5, 1.6, 2.6, 1.2, 0.28),
           (-6.6, 1.0, 1.5, 2.8, 0.3), (-3.7, -1.6, 1.0, 2.0, 0.28), (-8.6, -2.6, 0.9, 1.8, 0.26),
           (-0.9, 1.4, 0.5, 1.1, 0.42), (-1.1, -2.2, 0.4, 0.8, 0.4)]

LIGHTS = []
OBJ = {}
SOLIDS = []      # (x0, x1, y0, y1, z0, z1): rain is not placed inside these
M = mt.M


# ---------------------------------------------------------------- helpers
def _link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def bx(name, x0, x1, y0, y1, z0, z1, m, bevel=0.0):
    return sk.box(name, (x1 - x0, y1 - y0, z1 - z0), ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), m, bevel=bevel)


def bake(ob):
    """Apply the modifiers into the mesh, so copies of the object share one mesh (true instances)."""
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)
    return ob


def inst(src, name, loc, rot=(0.0, 0.0, 0.0)):
    ob = src.copy()
    ob.name = name
    _link(ob)
    ob.location, ob.rotation_euler = loc, rot
    return ob


def mesh_obj(name, verts, faces, mats, smooth=False, mat_index=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.update()
    for m in (mats if isinstance(mats, (list, tuple)) else [mats]):
        me.materials.append(m)
    if mat_index is not None:
        for p, i in zip(me.polygons, mat_index):
            p.material_index = i
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    return _link(bpy.data.objects.new(name, me))


def add_box(bm, x0, x1, y0, y1, z0, z1, mi=0):
    mat = Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal((x1 - x0, y1 - y0, z1 - z0, 1.0))
    r = bmesh.ops.create_cube(bm, size=1.0, matrix=mat)
    for v in r["verts"]:
        for f in v.link_faces:
            f.material_index = mi


def bm_obj(name, bm, mats, bevel=0.0, smooth=False, loc=(0.0, 0.0, 0.0)):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in (mats if isinstance(mats, (list, tuple)) else [mats]):
        me.materials.append(m)
    ob = _link(bpy.data.objects.new(name, me))
    ob.location = loc
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments = bevel, 3
        ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
        smooth = True
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    return ob


def beam(name, p0, p1, w, d, m, bevel=0.0):
    """A bar of section w x d from p0 to p1."""
    p0, p1 = Vector(p0), Vector(p1)
    v = p1 - p0
    ob = sk.box(name, (w, d, v.length), (p0 + p1) / 2, m, bevel=bevel)
    ob.rotation_euler = v.to_track_quat("Z", "Y").to_euler()
    return ob


def tube(name, p0, p1, r, m, verts=12, r2=None):
    p0, p1 = Vector(p0), Vector(p1)
    v = p1 - p0
    return sk.cyl(name, r, v.length, (p0 + p1) / 2, m, rot=v.to_track_quat("Z", "Y").to_euler(), verts=verts, r2=r2)


def studs(name, pts, r, m, flat=(0.5, 1.0, 1.0)):
    """Bolt heads: flattened little domes at the given points, one mesh."""
    bm = bmesh.new()
    for p in pts:
        bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=4, radius=r,
                                  matrix=Matrix.Translation(p) @ Matrix.Diagonal((*flat, 1.0)))
    return bm_obj(name, bm, m, smooth=True)


def spot(name, loc, aim, power, size_deg, blend, colour, radius=0.1, group="mast"):
    li = bpy.data.lights.new(name, "SPOT")
    li.energy, li.color = power, colour
    li.spot_size, li.spot_blend, li.shadow_soft_size = math.radians(size_deg), blend, radius
    ob = _link(bpy.data.objects.new(name, li))
    d = (Vector(aim) - Vector(loc)).normalized()
    ob.location = loc
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    LIGHTS.append(dict(name=name, kind="spot", loc=tuple(loc), dir=tuple(d), half=math.radians(size_deg) / 2,
                       blend=blend, power=power, group=group, ob=ob))
    return ob


def point(name, loc, power, colour, radius=0.15, group="spill"):
    li = bpy.data.lights.new(name, "POINT")
    li.energy, li.color, li.shadow_soft_size = power, colour, radius
    ob = _link(bpy.data.objects.new(name, li))
    ob.location = loc
    LIGHTS.append(dict(name=name, kind="point", loc=tuple(loc), dir=(0.0, 0.0, -1.0), half=math.pi, blend=0.0,
                       power=power, group=group, ob=ob))
    return ob


def flood_head(name, pos, aim, lens_mat, size=1.0):
    """A floodlight: finned housing with a visor, and its lens (an emitter the camera and the wet road see; the
    light itself comes from the spot lamp placed with it). Returns the unit aim direction."""
    pos = Vector(pos)
    d = (Vector(aim) - pos).normalized()
    q = d.to_track_quat("-Z", "Y").to_euler()
    s = size
    bm = bmesh.new()
    add_box(bm, -0.21 * s, 0.21 * s, -0.16 * s, 0.16 * s, 0.0, 0.11 * s)
    for i in range(6):
        add_box(bm, (-0.19 + i * 0.073) * s, (-0.19 + i * 0.073 + 0.014) * s, -0.14 * s, 0.14 * s, 0.11 * s, 0.155 * s)
    add_box(bm, -0.215 * s, 0.215 * s, 0.16 * s, 0.17 * s, -0.09 * s, 0.03 * s)
    add_box(bm, -0.235 * s, -0.21 * s, -0.03 * s, 0.03 * s, 0.02 * s, 0.09 * s)
    add_box(bm, 0.21 * s, 0.235 * s, -0.03 * s, 0.03 * s, 0.02 * s, 0.09 * s)
    body = bm_obj(name, bm, M["dark"], bevel=0.006 * s)
    body.location, body.rotation_euler = pos, q
    lv = [(-0.19 * s, -0.14 * s, -0.003), (-0.19 * s, 0.14 * s, -0.003), (0.19 * s, 0.14 * s, -0.003), (0.19 * s, -0.14 * s, -0.003)]
    lens = mesh_obj(name + "_lens", lv, [(0, 1, 2, 3)], lens_mat)
    lens.location, lens.rotation_euler = pos, q
    lens.visible_diffuse = lens.visible_volume_scatter = lens.visible_transmission = False
    lens.visible_shadow = False
    OBJ.setdefault("lenses", []).append(lens)
    return d


# ---------------------------------------------------------------- the ground
def height_image():
    """The ground's height map: low where water collects (gutters, wheel ruts, the hand-placed dips)."""
    x0, x1, y0, y1 = IMG_RECT
    ppm = 8
    W, H = int((x1 - x0) * ppm), int((y1 - y0) * ppm)
    rs = np.random.RandomState(11)
    X = x0 + (np.arange(W) + 0.5) / ppm
    Y = y0 + (np.arange(H) + 0.5) / ppm

    def octave(cell):
        gw, gh = int((x1 - x0) / cell) + 3, int((y1 - y0) / cell) + 3
        g = rs.rand(gh, gw).astype(np.float32)
        xs, ys = (X - x0) / cell, (Y - y0) / cell
        xi, yi = xs.astype(int), ys.astype(int)
        xf, yf = xs - xi, ys - yi
        xf, yf = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
        a, b = g[np.ix_(yi, xi)], g[np.ix_(yi, xi + 1)]
        c, d = g[np.ix_(yi + 1, xi)], g[np.ix_(yi + 1, xi + 1)]
        return (a * (1 - xf)[None, :] + b * xf[None, :]) * (1 - yf)[:, None] + (c * (1 - xf)[None, :] + d * xf[None, :]) * yf[:, None]

    h = 0.5 * octave(5.0) + 0.3 * octave(2.0) + 0.2 * octave(0.8)
    XX, YY = np.meshgrid(X, Y)
    perim = ((XX > ROAD_A) & (XX < ROAD_B)).astype(np.float32)
    appr = ((XX <= ROAD_A) & (np.abs(YY) < APPROACH)).astype(np.float32)
    h += perim * 0.10 * (1 - ((XX - (ROAD_A + ROAD_B) / 2) / 4.0) ** 2)
    h -= perim * 0.30 * np.exp(-np.abs(ROAD_B - XX) / 0.45)
    h -= perim * (np.abs(YY) > APPROACH + FILLET) * 0.26 * np.exp(-np.abs(XX - ROAD_A) / 0.45)
    for xr in (-3.2, -4.9, -6.6, -8.3):
        h -= perim * 0.06 * np.exp(-((XX - xr) / 0.28) ** 2)
    h += appr * 0.08 * (1 - (YY / APPROACH) ** 2)
    h -= appr * (XX < ROAD_A - FILLET) * 0.26 * np.exp(-(APPROACH - np.abs(YY)) / 0.45)
    for yr in (-2.9, -1.2, 1.2, 2.9):
        h -= appr * 0.06 * np.exp(-((YY - yr) / 0.28) ** 2)
    rim_x = (octave(1.7) - 0.5) * 1.6
    rim_y = (octave(2.3) - 0.5) * 1.35
    for px, py, rx, ry, dep in PUDDLES:
        h -= dep * np.exp(-(((XX + rim_x - px) / rx) ** 2 + ((YY + rim_y - py) / ry) ** 2))
    img = bpy.data.images.new("prison_ground_height", W, H, alpha=False, float_buffer=True, is_data=True)
    px = np.empty((H, W, 4), np.float32)
    px[..., 0] = px[..., 1] = px[..., 2] = h
    px[..., 3] = 1.0
    img.pixels.foreach_set(px.ravel())
    img.update()
    try:
        img.pack()
    except RuntimeError:
        pass
    OBJ["height"] = h
    return img


def _arc(cx, cy, r, a0, a1, n=14):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n)))
            for i in range(n + 1)]


def ground():
    ya, yb = Y0 - 8.0, Y1 + 8.0
    jx, jy = ROAD_A - FILLET, APPROACH + FILLET          # centre of the +y junction fillet: (jx, jy)
    # asphalt: the perimeter road and the approach with its two fillets
    road = [(ROAD_A, ya), (ROAD_B, ya), (ROAD_B, yb), (ROAD_A, yb)]
    appr = _arc(jx, jy, FILLET, 0, -90) + [(APPROACH_END, APPROACH), (APPROACH_END, -APPROACH)] + _arc(jx, -jy, FILLET, 90, 0)
    verts = [(x, y, 0.0) for x, y in road + appr]
    mesh_obj("asphalt", verts, [tuple(range(4)), tuple(range(4, 4 + len(appr)))], M["asphalt"])
    # verges either side of the approach road, and a base under everything
    vz = KERB - 0.012
    kr = FILLET - 0.15
    vp = [(ROAD_A - 0.15, yb), (ROAD_A - 0.15, jy)] + _arc(jx, jy, kr, 0, -90)[1:] + [(APPROACH_END, APPROACH + 0.15), (APPROACH_END, yb)]
    mesh_obj("verge_a", [(x, y, vz) for x, y in vp], [tuple(range(len(vp)))], M["verge"])
    vn = [(x, -y, vz) for x, y in reversed(vp)]
    mesh_obj("verge_b", vn, [tuple(range(len(vn)))], M["verge"])
    mesh_obj("base", [(-1500, -1500, -0.03), (1500, -1500, -0.03), (1500, 1500, -0.03), (-1500, 1500, -0.03)], [(0, 1, 2, 3)], M["verge"])
    mesh_obj("yard", [(WALL_T, ya, 0.0), (90.0, ya, 0.0), (90.0, yb, 0.0), (WALL_T, yb, 0.0)], [(0, 1, 2, 3)], M["yard"])
    # kerbs: wall side (with returns at the gate crossover), far side, the junction fillets, the approach
    for s, tag in ((-1, "a"), (1, "b")):
        y_in, y_out = s * AP_END, (ya if s < 0 else yb)
        lo, hi = min(y_in, y_out), max(y_in, y_out)
        bx(f"kerb_wall_{tag}", ROAD_B, APRON_X, lo, hi, -0.1, KERB, M["kerb_y"], bevel=0.022)
        r0, r1 = (y_in - 0.15, y_in) if s > 0 else (y_in, y_in + 0.15)
        bx(f"kerb_return_{tag}", ROAD_B, -0.3, r0, r1, -0.1, KERB, M["kerb_x"], bevel=0.022)
        bx(f"apron_{tag}", APRON_X, 0.02, lo, hi, -0.1, KERB - 0.006, M["paving"])
        f0, f1 = (jy, yb) if s > 0 else (ya, -jy)
        bx(f"kerb_far_{tag}", ROAD_A - 0.15, ROAD_A, f0, f1, -0.1, KERB, M["kerb_y"], bevel=0.022)
        a0, a1 = (APPROACH, APPROACH + 0.15) if s > 0 else (-APPROACH - 0.15, -APPROACH)
        bx(f"kerb_approach_{tag}", APPROACH_END, jx, a0, a1, -0.1, KERB, M["kerb_x"], bevel=0.022)
        # the fillet: a quarter ring, chamfered on the road side
        prof = [(FILLET, -0.1), (FILLET, KERB - 0.02), (FILLET - 0.02, KERB), (kr, KERB), (kr, -0.1)]
        n = 16
        vs, fs = [], []
        for i in range(n + 1):
            a = math.radians(-90.0 * i / n)
            for r, z in prof:
                vs.append((jx + r * math.cos(a), s * (jy + r * math.sin(a)), z))
        for i in range(n):
            for k in range(len(prof) - 1):
                p = i * len(prof) + k
                q = p + len(prof)
                fs.append((p, p + 1, q + 1, q))
        mesh_obj(f"kerb_fillet_{tag}", vs, fs, M["kerb_x"])
    # the gate crossover: a concrete threshold at road level, a channel drain across it
    bx("threshold", ROAD_B, 0.95, -AP_END + 0.15, AP_END - 0.15, -0.2, 0.006, M["threshold"])
    bx("threshold_drain", ROAD_B - 0.02, ROAD_B + 0.16, -AP_END + 0.15, AP_END - 0.15, -0.05, 0.009, M["iron"], bevel=0.003)


# ---------------------------------------------------------------- the razor wire
def coil_section(name, length=PANEL, seed=0, wire_r=0.010, seg=36, barbs=9):
    """6 m of concertina wire: two counter-wound helices (their crossing loops are what a concertina coil looks
    like from the side), a core wire with flat four-point barbs. Irregular, but its ends meet the next section."""
    rng = random.Random(seed)
    verts, faces = [], []
    loops = round(length / COIL_PITCH)
    axis = Vector((0.0, 1.0, 0.0))
    for hand, rad, ph0 in ((1.0, COIL_R, 0.0), (-1.0, COIL_R * 0.93, math.pi * 0.6)):
        jr = [0.0] + [rng.uniform(-0.06, 0.06) for _ in range(loops - 1)] + [0.0]
        jx = [0.0] + [rng.uniform(-0.03, 0.03) for _ in range(loops - 1)] + [0.0]
        jz = [0.0] + [rng.uniform(-0.035, 0.015) for _ in range(loops - 1)] + [0.0]
        jy = [0.0] + [rng.uniform(-0.05, 0.05) for _ in range(loops - 1)] + [0.0]
        n = loops * seg

        def centre(t):
            k = min(t * loops, loops - 1e-6)
            i0 = int(k)
            f = k - i0
            f = f * f * (3 - 2 * f)
            lerp = lambda a: a[i0] * (1 - f) + a[i0 + 1] * f
            ang = hand * 2 * math.pi * loops * t + ph0
            r = rad * (1 + lerp(jr))
            return Vector((lerp(jx) + r * math.cos(ang), t * length + lerp(jy), lerp(jz) + r * 0.94 * math.sin(ang))), ang

        pts = [centre(i / n) for i in range(n + 1)]
        base = len(verts)
        for i, (p, ang) in enumerate(pts):
            a, b = pts[max(i - 1, 0)][0], pts[min(i + 1, n)][0]
            t = (b - a).normalized()
            nr = Vector((math.cos(ang), 0.0, math.sin(ang)))
            bn = t.cross(nr).normalized()
            nr = bn.cross(t)
            for v in (nr, bn, -nr, -bn):
                verts.append(p + v * wire_r)
        for i in range(n):
            for k in range(4):
                a = base + i * 4 + k
                b = base + i * 4 + (k + 1) % 4
                faces.append((a, b, b + 4, a + 4))
        nb = loops * barbs
        for j in range(nb):
            t = (j + 0.5) / nb
            p, ang = centre(t)
            p2, _ = centre(min(1.0, t + 0.5 / n))
            tg = (p2 - p).normalized()
            ax = (axis - tg * axis.dot(tg)).normalized()
            nr = Vector((math.cos(ang), 0.0, math.sin(ang)))
            p = p + nr * wire_r * 1.1
            for sgn in (-1.0, 1.0):
                b0 = len(verts)
                for u, w in ((0.025, 0.011), (0.009, 0.004), (0.009, -0.004), (0.025, -0.011)):
                    verts.append(p + tg * (sgn * u) + ax * w)
                faces.append((b0, b0 + 1, b0 + 2, b0 + 3))
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    me.materials.append(M["wire"])
    return me                                     # flat shaded: the wire is about a pixel wide



# ---------------------------------------------------------------- the wall
def wall():
    panel = bake(sk.box("wall_panel", (WALL_T, PANEL, WALL_H), (0, 0, 0), M["wall"], bevel=0.02))
    plinth = bake(sk.box("wall_plinth", (WALL_T + 0.12, PANEL, 0.35), (0, 0, 0), M["wall"], bevel=0.02))
    centres = [-PIER_OUT - PANEL * (k + 0.5) for k in range(15)] + [PIER_OUT + PANEL * (k + 0.5) for k in range(38)]
    for i, yc in enumerate(centres):
        (panel if i == 0 else inst(panel, f"wall_panel_{i}", (0, 0, 0))).location = (WALL_CX, yc, WALL_H / 2)
        (plinth if i == 0 else inst(plinth, f"wall_plinth_{i}", (0, 0, 0))).location = (WALL_CX, yc, 0.175)
    cope = bake(sk.box("wall_cope", (0.75, 3.0, COPE_H), (0, 0, 0), M["cope"], bevel=0.018))
    post = bake(sk.box("wire_post", (0.05, 0.012, 0.95), (0, 0, 0), M["galv"]))
    n = int(math.ceil((Y1 - Y0) / 3.0))
    for i in range(n):
        (cope if i == 0 else inst(cope, f"wall_cope_{i}", (0, 0, 0))).location = (WALL_CX, Y0 + 1.5 + 3.0 * i, WALL_H + COPE_H / 2)
        (post if i == 0 else inst(post, f"wire_post_{i}", (0, 0, 0))).location = (WALL_CX, Y0 + 3.0 * i, COPE_TOP + 0.475)
    for k, dz in enumerate((0.14, 0.5, 0.86)):
        tube(f"line_wire_{k}", (WALL_CX, Y0, COPE_TOP + dz), (WALL_CX, Y1, COPE_TOP + dz), 0.003, M["wire"], verts=6)
    meshes = [coil_section(f"coil_{v}", seed=31 + v) for v in range(3)]
    zc = COPE_TOP + 0.045 + COIL_R * 0.94
    k = 0
    y = Y0
    while y < Y1 + 1.0:
        ob = _link(bpy.data.objects.new(f"coil_{k:02d}", meshes[(k * 7 + 3) % 3]))
        ob.location = (WALL_CX, y, zc)
        k += 1
        y += PANEL
    SOLIDS.append((0.0, WALL_T, Y0, Y1, 0.0, COPE_TOP))


# ---------------------------------------------------------------- the gate
def gate():
    hw = GATE_W / 2
    for s, tag in ((-1, "a"), (1, "b")):
        y0, y1 = (s * hw, s * PIER_OUT) if s > 0 else (s * PIER_OUT, s * hw)
        bx(f"pier_{tag}", -0.3, 0.85, y0, y1, 0.0, WALL_H, M["pier"], bevel=0.04)
        bx(f"pier_plinth_{tag}", -0.36, 0.91, y0 - 0.06, y1 + 0.06, 0.0, 0.45, M["pier"], bevel=0.03)
        bx(f"pier_cap_{tag}", -0.4, 0.95, y0 - 0.1, y1 + 0.1, WALL_H, WALL_H + 0.2, M["cope"], bevel=0.03)
    bx("lintel", -0.1, WALL_T, -hw, hw, GATE_H, WALL_H, M["pier"], bevel=0.03)
    bx("gate_head_stop", GATE_X + 0.03, GATE_X + 0.09, -hw, hw, GATE_H - 0.14, GATE_H, M["dark"])
    bx("gate_dark_behind", GATE_X + 0.2, GATE_X + 0.25, -hw, hw, 0.0, GATE_H, M["black"])
    z0, z1 = 0.07, GATE_H - 0.07
    fx0, fx1 = GATE_X - 0.05, GATE_X + 0.02              # frame members stand 50 mm proud of the sheet
    rails = [z0 + (z1 - z0) * k / 4 for k in range(5)]
    door = (-2.38, -1.48, 0.22, 2.24)                    # the wicket door: y0, y1, z0, z1
    bolts = []
    for s, tag in ((-1, "a"), (1, "b")):
        ya, yb = (s * (hw - 0.03), s * 0.012) if s > 0 else (s * 0.012, s * (hw - 0.03))
        ya, yb = min(ya, yb), max(ya, yb)
        ym = (ya + yb) / 2
        bm = bmesh.new()
        add_box(bm, GATE_X, GATE_X + 0.006, ya, yb, z0, z1)                                   # the sheet
        fr = bmesh.new()
        for yy in (ya, ym - 0.05, yb - 0.1):                                                    # stiles
            add_box(fr, fx0, fx1, yy, yy + 0.1, z0, z1)
        for k, zz in enumerate(rails):                                                          # rails
            lo = zz if k == 0 else (zz - 0.12 if k == 4 else zz - 0.05)
            add_box(fr, fx0 + 0.002, fx1, ya, yb, lo, lo + (0.12 if k in (0, 4) else 0.1))
        ribs = bmesh.new()
        for c0, c1 in ((ya + 0.1, ym - 0.05), (ym + 0.05, yb - 0.1)):
            for k in range(4):
                b0 = rails[k] + (0.12 if k == 0 else 0.05) + 0.05
                b1 = rails[k + 1] - (0.12 if k == 3 else 0.05) - 0.05
                for j in range(3):
                    yc = c0 + (c1 - c0) * (j + 1) / 4
                    if s < 0 and door[0] - 0.05 < yc < door[1] + 0.05 and b0 < door[3]:
                        continue
                    add_box(ribs, GATE_X - 0.02, GATE_X + 0.002, yc - 0.035, yc + 0.035, b0, b1)
        bm_obj(f"gate_sheet_{tag}", bm, M["gate"])
        bm_obj(f"gate_frame_{tag}", fr, M["gate"], bevel=0.008)
        bm_obj(f"gate_ribs_{tag}", ribs, M["gate"], bevel=0.009)
        for zz in rails[1:4]:
            bolts += [(fx0, ya + 0.2 + 0.15 * i, zz) for i in range(int((yb - ya - 0.3) / 0.15))]
        for yy in (ya + 0.05, yb - 0.05):
            bolts += [(fx0, yy, z0 + 0.2 + 0.3 * i) for i in range(int((z1 - z0 - 0.3) / 0.3))]
        # hinges on the pier side: barrel, strap on the leaf, plate on the pier's reveal
        yh = ya if s < 0 else yb
        for zz in (0.62, 2.5, 4.38):
            sk.cyl(f"hinge_{tag}_{zz}", 0.036, 0.26, (fx0 - 0.03, yh - s * 0.005, zz), M["dark"], verts=14)
            bx(f"hinge_strap_{tag}_{zz}", fx0 - 0.014, fx0, min(yh, yh - s * 0.5), max(yh, yh - s * 0.5), zz - 0.045, zz + 0.045, M["dark"], bevel=0.004)
            bx(f"hinge_plate_{tag}_{zz}", fx0 - 0.07, fx0 + 0.09, min(yh + s * 0.012, yh + s * 0.03), max(yh + s * 0.012, yh + s * 0.03), zz - 0.13, zz + 0.13, M["dark"], bevel=0.003)
            bolts += [(fx0 - 0.014, yh - s * (0.12 + 0.14 * i), zz) for i in range(3)]
        # drop bolt near the meeting stile
        yd = (yb - 0.22) if s < 0 else (ya + 0.22)
        tube(f"drop_bolt_{tag}", (fx0 - 0.03, yd, 0.012), (fx0 - 0.03, yd, 1.05), 0.013, M["galv"], verts=10)
        tube(f"drop_handle_{tag}", (fx0 - 0.03, yd, 1.05), (fx0 - 0.03, yd + s * 0.1, 1.05), 0.013, M["galv"], verts=10)
        for zz in (0.22, 0.86):
            bx(f"drop_guide_{tag}_{zz}", fx0 - 0.055, fx0, yd - 0.035, yd + 0.035, zz - 0.03, zz + 0.03, M["dark"], bevel=0.004)
        bx(f"gate_skirt_{tag}", GATE_X - 0.004, GATE_X + 0.008, ya, yb, 0.018, z0 + 0.01, M["rubber"])
    studs("gate_bolts", bolts, 0.013, M["gate"])
    # where the leaves meet: a cover strip, the lock box and its pull
    bx("gate_astragal", fx0 - 0.012, fx0, -0.07, 0.05, z0, z1, M["gate"], bevel=0.003)
    bx("gate_lock", fx0 - 0.085, fx0, -0.30, 0.10, 1.12, 1.42, M["dark"], bevel=0.01)
    bx("gate_lock_plate", fx0 - 0.092, fx0 - 0.085, -0.2, -0.08, 1.2, 1.34, M["galv_dull"], bevel=0.002)
    tube("gate_pull", (fx0 - 0.07, 0.3, 1.1), (fx0 - 0.07, 0.3, 1.45), 0.014, M["galv"], verts=10)
    for zz in (1.12, 1.43):
        tube(f"gate_pull_post_{zz}", (fx0, 0.3, zz), (fx0 - 0.07, 0.3, zz), 0.01, M["galv"], verts=8)
    # the wicket door in the leaf on the -y side
    d0, d1, dz0, dz1 = door
    dx = fx0 - 0.012
    wk = bmesh.new()
    add_box(wk, dx, dx + 0.02, d0, d1, dz0, dz1)
    for (a0, a1, b0, b1) in ((d0 - 0.05, d0, dz0 - 0.05, dz1 + 0.05), (d1, d1 + 0.05, dz0 - 0.05, dz1 + 0.05),
                             (d0, d1, dz1, dz1 + 0.05), (d0, d1, dz0 - 0.05, dz0)):
        add_box(wk, dx - 0.012, dx + 0.02, a0, a1, b0, b1)
    bm_obj("wicket", wk, M["gate"], bevel=0.006)
    bx("wicket_hatch", dx - 0.012, dx, (d0 + d1) / 2 - 0.14, (d0 + d1) / 2 + 0.14, 1.5, 1.66, M["dark"], bevel=0.004)
    bx("wicket_hatch_rim", dx - 0.006, dx, (d0 + d1) / 2 - 0.17, (d0 + d1) / 2 + 0.17, 1.47, 1.69, M["gate"], bevel=0.003)
    bx("wicket_lock", dx - 0.012, dx, d1 - 0.16, d1 - 0.07, 0.98, 1.2, M["galv_dull"], bevel=0.003)
    tube("wicket_handle", (dx - 0.05, d1 - 0.115, 1.0), (dx - 0.05, d1 - 0.115, 1.16), 0.011, M["galv"], verts=8)
    for zz in (0.5, 1.95):
        sk.cyl(f"wicket_hinge_{zz}", 0.016, 0.14, (dx - 0.014, d0 - 0.012, zz), M["dark"], verts=10)
    # the threshold: a steel track the leaves close onto, and the centre stop
    bx("gate_track", GATE_X - 0.12, GATE_X + 0.14, -hw, hw, 0.0, 0.014, M["galv_dull"], bevel=0.003)
    bx("gate_stop", GATE_X - 0.17, GATE_X - 0.06, -0.07, 0.07, 0.0, 0.06, M["galv_dull"], bevel=0.008)
    SOLIDS.append((-0.3, 0.95, -PIER_OUT, PIER_OUT, 0.0, WALL_H + 0.2))


# ---------------------------------------------------------------- the watchtower
def tower():
    tx, ty = TOWER
    sh = SHAFT
    bx("tower_shaft", tx - sh, tx + sh, ty - sh, ty + sh, 0.0, SHAFT_H, M["tower"], bevel=0.1)
    bx("tower_plinth", tx - sh - 0.08, tx + sh + 0.08, ty - sh - 0.08, ty + sh + 0.08, 0.0, 0.5, M["tower"], bevel=0.04)
    # the corbel: the shaft flares out under the deck
    c0, c1, zc0, zc1 = sh, DECK - 0.3, SHAFT_H - 0.02, DECK_Z
    vs = [(tx + sx * c, ty + sy * c, z) for c, z in ((c0, zc0), (c1, zc1)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    mesh_obj("tower_corbel", vs, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7), (3, 2, 1, 0)], M["tower"])
    dz = DECK_Z + 0.22
    bx("tower_deck", tx - DECK, tx + DECK, ty - DECK, ty + DECK, DECK_Z, dz, M["cabin"], bevel=0.03)
    # railing: posts, top and mid rails, a toe board
    rl = DECK - 0.07
    post = bake(sk.box("rail_post", (0.045, 0.045, 1.1), (0, 0, 0), M["galv"], bevel=0.006))
    k = 0
    for i in range(6):
        f = -rl + 2 * rl * i / 6
        for p in ((tx + f, ty - rl), (tx + rl, ty + f), (tx - f, ty + rl), (tx - rl, ty - f)):
            (post if k == 0 else inst(post, f"rail_post_{k}", (0, 0, 0))).location = (p[0], p[1], dz + 0.55)
            k += 1
    for (ax0, ax1, ay0, ay1), tag in (((-rl, rl, -rl, -rl), "s"), ((-rl, rl, rl, rl), "n"), ((-rl, -rl, -rl, rl), "w"), ((rl, rl, -rl, rl), "e")):
        for h, w, nm in ((1.1, 0.05, "top"), (0.56, 0.032, "mid")):
            bx(f"rail_{nm}_{tag}", tx + ax0 - w / 2, tx + ax1 + w / 2, ty + ay0 - w / 2, ty + ay1 + w / 2, dz + h - w / 2, dz + h + w / 2, M["galv"], bevel=0.006)
        bx(f"rail_toe_{tag}", tx + ax0 - 0.005, tx + ax1 + 0.005, ty + ay0 - 0.005, ty + ay1 + 0.005, dz + 0.02, dz + 0.16, M["galv_dull"])
    # the cabin: a solid spandrel, a band of dark glazing canted outward, a flat roof that oversails
    cb, ct = 1.9, 2.14                              # half-width at the sill and at the head of the glazing
    zs, zh = dz + 0.95, dz + 2.25
    bx("cabin_spandrel", tx - cb, tx + cb, ty - cb, ty + cb, dz, zs, M["cabin"], bevel=0.025)
    gv, gf = [], []
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        gv.append((tx + sx * cb, ty + sy * cb, zs))
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        gv.append((tx + sx * ct, ty + sy * ct, zh))
    for i in range(4):
        j = (i + 1) % 4
        gf.append((i, j, j + 4, i + 4))
    glass = mesh_obj("cabin_glass", gv, gf, M["glass"])
    glass.visible_shadow = False
    for i, (sx, sy) in enumerate(((-1, -1), (1, -1), (1, 1), (-1, 1))):
        beam(f"cabin_corner_{i}", (tx + sx * cb, ty + sy * cb, zs - 0.02), (tx + sx * ct, ty + sy * ct, zh + 0.02), 0.12, 0.12, M["dark"], bevel=0.01)
    k = 0
    for f in (-0.34, 0.34):
        for (sx, sy, along) in ((0, -1, "x"), (0, 1, "x"), (-1, 0, "y"), (1, 0, "y")):
            if along == "x":
                p0 = (tx + f * 2 * cb, ty + sy * cb, zs)
                p1 = (tx + f * 2 * ct, ty + sy * ct, zh)
            else:
                p0 = (tx + sx * cb, ty + f * 2 * cb, zs)
                p1 = (tx + sx * ct, ty + f * 2 * ct, zh)
            beam(f"cabin_mullion_{k}", p0, p1, 0.06, 0.06, M["dark"], bevel=0.006)
            k += 1
    for (h, z, w, nm) in ((cb, zs, 0.08, "sill"), (ct, zh, 0.09, "head")):
        for (ax0, ax1, ay0, ay1), tag in (((-h, h, -h, -h), "s"), ((-h, h, h, h), "n"), ((-h, -h, -h, h), "w"), ((h, h, -h, h), "e")):
            bx(f"cabin_{nm}_{tag}", tx + ax0 - w / 2, tx + ax1 + w / 2, ty + ay0 - w / 2, ty + ay1 + w / 2, z - w / 2, z + w / 2, M["dark"], bevel=0.008)
    rz = zh + 0.045
    bx("tower_roof", tx - 2.55, tx + 2.55, ty - 2.55, ty + 2.55, rz, rz + 0.22, M["cabin"], bevel=0.035)
    bx("tower_roof_trim", tx - 2.6, tx + 2.6, ty - 2.6, ty + 2.6, rz + 0.17, rz + 0.25, M["dark"], bevel=0.01)
    # inside: a console whose blank screen is the only light (it puts a faint cold tone on the ceiling)
    bx("cabin_console", tx - 0.2, tx + 0.5, ty - 0.7, ty + 0.7, dz, dz + 0.85, M["dark"], bevel=0.02)
    point("console_return", (tx, ty, dz + 0.92), 0.5, COLD, radius=0.18, group="tower")
    mesh_obj("cabin_screen", [(tx - 0.1, ty - 0.3, dz + 0.856), (tx + 0.4, ty - 0.3, dz + 0.856), (tx + 0.4, ty + 0.3, dz + 0.856), (tx - 0.1, ty + 0.3, dz + 0.856)], [(0, 1, 2, 3)], M["screen"])
    # roof: a searchlight on its yoke (unlit), an aerial, a small vent
    top = rz + 0.25
    sx0 = tx - 1.85
    bx("search_base", sx0 - 0.14, sx0 + 0.14, ty - 0.14, ty + 0.14, top, top + 0.12, M["dark"], bevel=0.01)
    for s in (-1, 1):
        bx(f"search_yoke_{s}", sx0 - 0.03, sx0 + 0.03, ty + s * 0.26 - 0.015, ty + s * 0.26 + 0.015, top + 0.1, top + 0.62, M["dark"], bevel=0.005)
    bx("search_yoke_bar", sx0 - 0.03, sx0 + 0.03, ty - 0.27, ty + 0.27, top + 0.1, top + 0.14, M["dark"], bevel=0.005)
    tilt = math.radians(-104.0)                     # the drum's axis: out over the road and a little down
    ax = Vector((math.sin(tilt), 0.0, math.cos(tilt)))
    sk.cyl("search_drum", 0.23, 0.42, (sx0, ty, top + 0.5), M["dark"], rot=(0.0, tilt, 0.0), verts=20)
    sk.cyl("search_lens", 0.2, 0.012, Vector((sx0, ty, top + 0.5)) + ax * 0.211, M["pane"], rot=(0.0, tilt, 0.0), verts=20)
    sk.cyl("search_rim", 0.245, 0.05, Vector((sx0, ty, top + 0.5)) + ax * 0.19, M["galv_dull"], rot=(0.0, tilt, 0.0), verts=20)
    tube("tower_aerial", (tx + 2.0, ty + 1.9, top), (tx + 2.0, ty + 1.9, top + 3.4), 0.016, M["dark"], verts=8, r2=0.006)
    bx("tower_aerial_base", tx + 1.9, tx + 2.1, ty + 1.8, ty + 2.0, top, top + 0.18, M["dark"], bevel=0.01)
    sk.cyl("tower_vent", 0.16, 0.35, (tx + 0.9, ty - 1.2, top + 0.17), M["galv_dull"], verts=14)
    sk.cyl("tower_vent_cap", 0.22, 0.05, (tx + 0.9, ty - 1.2, top + 0.4), M["galv_dull"], verts=14)
    # services on the shaft: a rainwater pipe from the deck, a conduit, brackets
    px, py = tx - sh - 0.07, ty - sh + 0.35
    tube("tower_pipe", (px, py, 0.25), (px, py, DECK_Z - 0.6), 0.05, M["galv_dull"], verts=12)
    tube("tower_conduit", (px + 0.02, py + 0.25, 0.4), (px + 0.02, py + 0.25, DECK_Z - 0.8), 0.018, M["galv_dull"], verts=8)
    for i in range(5):
        bx(f"tower_pipe_clip_{i}", px - 0.06, px + 0.07, py - 0.07, py + 0.32, 1.2 + 2.2 * i, 1.26 + 2.2 * i, M["galv"], bevel=0.004)
    # two floodlights under the deck's outer edge, down along the wall either way; a dome camera at the corner
    for s, tag in ((1, "n"), (-1, "s")):
        pos = (tx - DECK + 0.25, ty + s * 1.7, DECK_Z - 0.14)
        aim = (-0.8, ty + s * 8.6, 0.5)
        tube(f"tower_flood_stem_{tag}", (pos[0], pos[1], DECK_Z), (pos[0], pos[1], pos[2] + 0.05), 0.022, M["dark"], verts=8)
        d = flood_head(f"tower_flood_{tag}", pos, aim, M["lens_cold"], size=0.72)
        spot(f"tower_spot_{tag}", Vector(pos) + d * 0.09, aim, 4500.0, 64.0, 0.3, COLD, radius=0.07, group="tower")
    sk.sphere("tower_dome_cam", 0.09, (tx - DECK + 0.3, ty + DECK - 0.3, DECK_Z - 0.1), M["pane"], segs=16)
    sk.cyl("tower_dome_cam_base", 0.1, 0.06, (tx - DECK + 0.3, ty + DECK - 0.3, DECK_Z - 0.03), M["dark"], verts=16)
    SOLIDS.append((tx - sh, tx + sh, ty - sh, ty + sh, 0.0, SHAFT_H))
    SOLIDS.append((tx - DECK, tx + DECK, ty - DECK, ty + DECK, SHAFT_H - 0.5, rz + 0.3))
    OBJ["cabin_floor"] = dz
    OBJ["cabin_sill"] = zs


# ---------------------------------------------------------------- floodlight masts
def mast(ym, k):
    x = MAST_X
    bx(f"mast_plinth_{k}", x - 0.3, x + 0.3, ym - 0.3, ym + 0.3, 0.0, 0.42, M["cope"], bevel=0.03)
    bx(f"mast_flange_{k}", x - 0.2, x + 0.2, ym - 0.2, ym + 0.2, 0.42, 0.45, M["galv"], bevel=0.004)
    studs(f"mast_bolts_{k}", [(x + sx * 0.15, ym + sy * 0.15, 0.465) for sx in (-1, 1) for sy in (-1, 1)], 0.022, M["galv_dull"], flat=(1.0, 1.0, 0.7))
    sk.cyl(f"mast_pole_{k}", 0.115, MAST_TOP - 0.45, (x, ym, 0.45 + (MAST_TOP - 0.45) / 2), M["galv"], verts=16, r2=0.06)
    bx(f"mast_door_{k}", x + 0.1, x + 0.114, ym - 0.05, ym + 0.05, 0.75, 1.1, M["galv_dull"], bevel=0.002)
    bx(f"mast_arm_{k}", x + 0.02, x + 0.1, ym - 0.6, ym + 0.6, MAST_TOP - 0.1, MAST_TOP - 0.02, M["galv"], bevel=0.006)
    bx(f"mast_cap_{k}", x - 0.07, x + 0.11, ym - 0.07, ym + 0.07, MAST_TOP - 0.14, MAST_TOP + 0.03, M["galv"], bevel=0.008)
    for i, s in enumerate((-1, 1)):
        pos = (x + 0.3, ym + s * 0.42, MAST_TOP - 0.2)
        aim = (-1.0, ym + s * 2.4, 0.8)
        dead = DEAD_HEAD == (ym, i)
        tube(f"mast_stub_{k}_{i}", (x + 0.06, ym + s * 0.42, MAST_TOP - 0.06), (pos[0] - 0.05, pos[1], pos[2] + 0.06), 0.018, M["galv"], verts=8)
        d = flood_head(f"mast_head_{k}_{i}", pos, aim, M["lens_dead"] if dead else M["lens_cold"])
        if not dead:
            spot(f"mast_spot_{k}_{i}", Vector(pos) + d * 0.11, aim, 17000.0, 74.0, 0.3, COLD, radius=0.09, group="mast")
    point(f"mast_spill_{k}", (x + 0.55, ym, MAST_TOP - 0.55), 1200.0, COLD, radius=0.12, group="spill")


def gate_lamp():
    """A column inside the wall behind the gate; its stayed outreach arm carries the gate's floodlight out over the
    wire. The lamp hangs 3.6 m in front of the wall and looks almost straight down: the gate takes an arch of
    light that fades toward its top corners, the lintel and the wire above stay dim, and from the approach road
    the lens shows as a bright bar under the housing."""
    px, py, top = 1.2, 3.2, 9.6
    sk.cyl("gate_mast_pole", 0.125, top, (px, py, top / 2), M["galv"], verts=16, r2=0.075)
    SOLIDS.append((px - 0.13, px + 0.13, py - 0.13, py + 0.13, 0, top))
    # One continuous sloping arm crosses the column at its collar and carries both lamps.
    out = Vector((-3.78, 0, 8.60))
    collar = Vector((px, py, 8.52))
    inner = collar + (collar - out) * 0.26
    beam("gate_mast_arm", inner, out, 0.07, 0.1, M["galv"], bevel=0.008)
    tube("gate_mast_stay", (px, py, top - 0.05), out.lerp(collar, 0.23), 0.014, M["galv"], verts=8)
    tube("gate_mast_stay_in", (px, py, top - 0.05), inner, 0.014, M["galv"], verts=8)
    bx("gate_mast_cap", px - 0.09, px + 0.09, py - 0.09, py + 0.09, top - 0.06, top + 0.05, M["galv"], bevel=0.01)
    bx("gate_mast_collar", px - 0.11, px + 0.11, py - 0.11, py + 0.11, 8.42, 8.66, M["galv"], bevel=0.01)
    pos, aim = (-3.6, 0.0, 8.4), (-1.9, 0.0, 0.6)
    tube("gate_lamp_stub", (pos[0], 0.0, 8.56), (pos[0], 0.0, pos[2] + 0.1), 0.02, M["galv"], verts=8)
    d = flood_head("gate_lamp", pos, aim, M["lens_gate"], size=1.1)
    spot("gate_spot", Vector(pos) + d * 0.12, aim, 14000.0, 80.0, 0.55, GATE_WHITE, radius=0.1, group="gate")
    point("gate_spill", (pos[0] - 0.05, 0.0, pos[2] - 0.45), 900.0, GATE_WHITE, radius=0.12, group="spill")
    # the same column lights the vehicle yard behind the gate
    pos2, aim2 = (inner.x, inner.y, inner.z - 0.11), (9.5, 2.6, 0.0)
    d = flood_head("gate_lamp_in", pos2, aim2, M["lens_cold"])
    spot("yard_spot", Vector(pos2) + d * 0.12, aim2, 9000.0, 80.0, 0.3, COLD, radius=0.1, group="yard")


def yard_lights():
    """Low sodium lights in the yards, hidden by the wall: they put a warm glow in the mist behind the wire."""
    for i, y in enumerate((-70.0, -42.0, -12.0, 15.0, 42.0, 70.0, 98.0, 126.0)):
        point(f"yard_glow_{i}", (4.6, y, 5.2), 1200.0 if y == 15.0 else 800.0, SODIUM, radius=0.2, group="yardglow")


# ---------------------------------------------------------------- the blocks beyond the wall
def window_mesh(name, pane, bars):
    """A cell window facing local -X: concrete surround and sill, the pane set back, bars in front if lit."""
    w, h = 0.9, 1.2
    bm = bmesh.new()
    add_box(bm, -0.05, 0.0, -w / 2 - 0.08, -w / 2, -h / 2 - 0.08, h / 2 + 0.08, 0)
    add_box(bm, -0.05, 0.0, w / 2, w / 2 + 0.08, -h / 2 - 0.08, h / 2 + 0.08, 0)
    add_box(bm, -0.05, 0.0, -w / 2, w / 2, h / 2, h / 2 + 0.08, 0)
    add_box(bm, -0.1, 0.0, -w / 2 - 0.1, w / 2 + 0.1, -h / 2 - 0.09, -h / 2, 0)
    add_box(bm, -0.022, -0.018, -w / 2, w / 2, -h / 2, h / 2, 1)
    mats = [M["trim"], pane]
    if bars:
        for i in range(5):
            y = -w / 2 + w * (i + 1) / 6
            add_box(bm, -0.052, -0.034, y - 0.011, y + 0.011, -h / 2, h / 2, 2)
        add_box(bm, -0.054, -0.032, -w / 2, w / 2, -0.02, 0.02, 2)
        mats.append(M["dark"])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    return me


def block(name, x0, x1, y0, y1, H, lit, faces=("w", "s"), floors=7, seed=5):
    """A cell block as a dark slab: parapet, roof plant, a grid of windows of which `lit` are on.
    lit: {(face, column, floor): variant}; a few more come on at random."""
    bx(name, x0, x1, y0, y1, 0.0, H, M["facade"], bevel=0.03)
    for (a0, a1, b0, b1), tag in (((x0, x0 + 0.3, y0, y1), "w"), ((x1 - 0.3, x1, y0, y1), "e"), ((x0, x1, y0, y0 + 0.3), "s"), ((x0, x1, y1 - 0.3, y1), "n")):
        bx(f"{name}_parapet_{tag}", a0 - 0.04, a1 + 0.04, b0 - 0.04, b1 + 0.04, H, H + 0.75, M["trim"], bevel=0.02)
    rng = random.Random(seed)
    xm = (x0 + x1) / 2
    bx(f"{name}_plant", xm - 2.5, xm + 2.5, y0 + 8.0, y0 + 15.0, H, H + 3.1, M["facade"], bevel=0.03)
    bx(f"{name}_stair", xm - 2.0, xm + 2.0, y1 - 9.0, y1 - 4.0, H, H + 2.6, M["facade"], bevel=0.03)
    sk.cyl(f"{name}_tank", 1.3, 2.4, (xm + 1.0, (y0 + y1) / 2, H + 1.5), M["galv_dull"], verts=20)
    for i in range(3):
        sk.cyl(f"{name}_stack_{i}", 0.2, 1.8, (x0 + 2.0, y0 + 20.0 + 9.0 * i, H + 0.9), M["galv_dull"], verts=12)
    dark = window_mesh(f"{name}_win_dark", M["pane"], False)
    lits = {v: window_mesh(f"{name}_win_{v}", M[f"lit_{v}"], True) for v in "abc"}
    count = 0
    for face in faces:
        if face in ("w", "e"):
            cols = [y0 + 1.6 + 2.8 * i for i in range(int((y1 - y0 - 2.4) / 2.8) + 1)]
        else:
            cols = [x0 + 1.8 + 2.8 * i for i in range(int((x1 - x0 - 2.6) / 2.8) + 1)]
        for ci, c in enumerate(cols):
            for fl in range(2, floors):
                z = 1.6 + 3.1 * fl
                if z + 1.0 > H:
                    continue
                v = lit.get((face, ci, fl), "?")          # "?": not set by hand, a few come on by chance
                if v == "?":
                    v = rng.choice("abc") if rng.random() < 0.035 else None
                me = lits[v] if v in lits else dark
                ob = _link(bpy.data.objects.new(f"{name}_w_{face}_{ci}_{fl}", me))
                if face == "w":
                    ob.location, ob.rotation_euler = (x0, c, z), (0, 0, 0)
                elif face == "e":
                    ob.location, ob.rotation_euler = (x1, c, z), (0, 0, math.pi)
                elif face == "s":
                    ob.location, ob.rotation_euler = (c, y0, z), (0, 0, math.pi / 2)
                else:
                    ob.location, ob.rotation_euler = (c, y1, z), (0, 0, -math.pi / 2)
                if v in lits:
                    normal = ob.rotation_euler.to_matrix() @ Vector((-1, 0, 0))
                    colour = (0.70, 0.86, 1.0) if v == "c" else (1.0, 0.78, 0.50)
                    light = sk.area_light(ob.name + "_spill", ob.location + normal * 0.13,
                                          (0.78, 1.0), 3.0, colour, spread_deg=130)
                    light.rotation_euler = normal.to_track_quat("-Z", "Y").to_euler()
                    light.visible_glossy = False
                count += 1
    SOLIDS.append((x0, x1, y0, y1, 0.0, H + 3.0))
    return count


# ---------------------------------------------------------------- set dressing
def dressing():
    # bollards guarding the piers
    k = 0
    for s in (-1, 1):
        for x in (-0.85, -1.4):
            y = s * (AP_END + 0.42)
            sk.cyl(f"bollard_{k}", 0.085, 1.0, (x, y, KERB + 0.5), M["galv_dull"], verts=18)
            sk.sphere(f"bollard_cap_{k}", 0.085, (x, y, KERB + 1.0), M["galv_dull"], segs=18).scale = (1, 1, 0.5)
            sk.cyl(f"bollard_foot_{k}", 0.12, 0.03, (x, y, KERB + 0.012), M["galv_dull"], verts=18)
            k += 1
    # the call post a driver stops at, on the left of the approach
    ix, iy = STOP_X - 0.6, APPROACH - 0.94
    bx("call_island", ix - 0.23, ix + 0.23, iy - 0.20, iy + 0.20, 0, KERB, M["kerb_y"], bevel=0.035)
    bx("call_post", ix - 0.05, ix + 0.05, iy - 0.05, iy + 0.05, KERB - 0.02, 1.12, M["galv"], bevel=0.006)
    bx("call_post_foot", ix - 0.11, ix + 0.11, iy - 0.11, iy + 0.11, KERB - 0.02, KERB + 0.012, M["galv_dull"], bevel=0.004)
    bx("call_box", ix - 0.11, ix + 0.11, iy - 0.075, iy + 0.065, 1.08, 1.42, M["dark"], bevel=0.012)
    bx("call_hood", ix - 0.13, ix + 0.13, iy - 0.16, iy + 0.075, 1.42, 1.435, M["dark"], bevel=0.003)
    bx("call_grille", ix - 0.07, ix + 0.07, iy - 0.079, iy - 0.074, 1.25, 1.36, M["iron"])
    sk.cyl("call_button", 0.017, 0.006, (ix, iy - 0.078, 1.17), M["button"], rot=(math.pi / 2, 0, 0), verts=16)
    bl = bpy.data.lights.new("call_glow", "POINT")
    bl.energy, bl.color, bl.shadow_soft_size = 3.0, (0.75, 0.9, 1.0), 0.035
    lo = _link(bpy.data.objects.new("call_glow", bl))
    lo.location = (ix, iy - 0.13, 1.17)
    spot("call_down", (ix, iy - 0.15, 1.416), (ix, iy - 0.31, 0.11), 1.0,
         70, 0.6, COLD, radius=0.025, group="gate")
    # a camera on the -y pier, looking down the approach
    cy = -(GATE_W / 2 + PIER_W / 2)
    bx("cctv_plate", -0.32, -0.3, cy - 0.08, cy + 0.08, 5.22, 5.42, M["dark"], bevel=0.003)
    tube("cctv_arm", (-0.3, cy, 5.32), (-0.62, cy, 5.32), 0.018, M["dark"], verts=8)
    cam = bx("cctv_body", -0.09, 0.09, -0.05, 0.05, -0.05, 0.05, M["galv_dull"], bevel=0.01)
    cam.location, cam.rotation_euler = (-0.72, cy, 5.26), (0.0, math.radians(-28), 0.0)
    hood = bx("cctv_hood", -0.11, 0.1, -0.058, 0.058, 0.05, 0.058, M["dark"], bevel=0.002)
    hood.location, hood.rotation_euler = (-0.72, cy, 5.26), (0.0, math.radians(-28), 0.0)
    # gully grates in the wall-side gutter, a manhole on the approach
    grate = bmesh.new()
    add_box(grate, -0.18, 0.18, -0.25, 0.25, -0.03, 0.004)
    for i in range(7):
        add_box(grate, -0.14, 0.14, -0.21 + i * 0.063, -0.21 + i * 0.063 + 0.03, 0.004, 0.012)
    add_box(grate, -0.18, -0.14, -0.25, 0.25, 0.004, 0.012)
    add_box(grate, 0.14, 0.18, -0.25, 0.25, 0.004, 0.012)
    add_box(grate, -0.18, 0.18, -0.25, -0.21, 0.004, 0.012)
    add_box(grate, -0.18, 0.18, 0.2, 0.25, 0.004, 0.012)
    g = bm_obj("gully_0", grate, M["iron"])
    g.data.polygons.foreach_set("use_smooth", [False] * len(g.data.polygons))
    for i, y in enumerate((-74.0, -46.0, -18.0, 14.0, 42.0, 70.0, 98.0, 126.0)):
        (g if i == 0 else inst(g, f"gully_{i}", (0, 0, 0))).location = (ROAD_B - 0.2, y, 0.0)
    sk.cyl("manhole", 0.33, 0.012, (-6.4, -2.5, 0.004), M["iron"], verts=28)
    sk.cyl("manhole_rim", 0.39, 0.008, (-6.4, -2.5, 0.002), M["galv_dull"], verts=28)
    # the outer fence beyond the masts: concrete posts and strained wires
    fpost = bake(sk.box("fence_post", (0.12, 0.12, 1.9), (0, 0, 0), M["cope"], bevel=0.012))
    fx = -13.6
    k = 0
    y = Y0 - 6.0
    while y < Y1 + 6.0:
        if abs(y) > APPROACH + FILLET + 1.0:
            (fpost if k == 0 else inst(fpost, f"fence_post_{k}", (0, 0, 0))).location = (fx, y, KERB + 0.93)
            k += 1
        y += 3.0
    for i, z in enumerate((0.45, 0.85, 1.25, 1.62, 1.86)):
        tube(f"fence_wire_a{i}", (fx, Y0 - 6.0, KERB + z), (fx, -(APPROACH + FILLET + 1.6), KERB + z), 0.0028, M["wire"], verts=6)
        tube(f"fence_wire_b{i}", (fx, APPROACH + FILLET + 1.4, KERB + z), (fx, Y1 + 6.0, KERB + z), 0.0028, M["wire"], verts=6)


def far_lights():
    """A road far off across the fields: a few sodium lamps on the horizon, small and soft in the mist. They give
    the dark side of the wall frame a distance; nothing here is lit by them."""
    rng = random.Random(21)
    for i, az in enumerate((-24.0, -22.5, -21.8, -12.0, -9.5)):
        r = 520.0 + 45.0 * i + rng.uniform(-30.0, 30.0)
        a = math.radians(az)
        p = (-7.0 + r * math.sin(a), -62.0 + r * math.cos(a), rng.uniform(11, 16))
        ob = sk.sphere(f"far_lamp_{i}", rng.uniform(0.5, 1.3), p, M["far_lamp"], segs=8)
        lamp = M["far_lamp"].copy()
        ob.data.materials[0] = lamp
        em = next(n for n in lamp.node_tree.nodes if n.type == "EMISSION")
        em.inputs["Strength"].default_value *= rng.uniform(0.4, 1)
        ob.visible_diffuse = ob.visible_glossy = ob.visible_shadow = False
    # The distant unlit embankment interrupts the line of lamps at the horizon.
    terrain = []
    for i in range(45):
        x = -400 + i * 10
        terrain.extend([(x, 355, -1), (x, 355, 6.2 + 1.3 * math.sin(i * 0.62) + rng.uniform(-0.55, 0.65))])
    mesh_obj("far_embankment", terrain, [(i, i+1, i+3, i+2) for i in range(0, len(terrain)-2, 2)], M["verge"])


def sky_and_mist():
    dome = sk.sphere("sky", 1100.0, (0.0, 0.0, 0.0), M["sky"], segs=48)
    dome.visible_shadow = False
    dome.visible_volume_scatter = False
    hz = sk.box("mist", (190.0, 372.0, 46.0), (-15.0, 70.0, 22.5), M["mist"])
    hz.visible_shadow = False
    OBJ["mist"] = hz
    OBJ["sky"] = dome


# ---------------------------------------------------------------- build
def build():
    LIGHTS.clear()
    OBJ.clear()
    SOLIDS.clear()
    img = height_image()
    mt.materials(img, IMG_RECT, STOP_X)
    ground()
    wall()
    gate()
    tower()
    for k, ym in enumerate(MAST_Y):
        mast(ym, k)
    gate_lamp()
    yard_lights()
    # block A shows in the gate frame (its near windows); block B stands in the mist at the far end of the wall
    na = block("block_a", 10.5, 24.5, 10.0, 40.0, 16.0,
               {("w", 0, 3): "a", ("w", 1, 4): "b", ("s", 1, 4): None, ("w", 6, 3): "a", ("w", 2, 3): None, ("w", 0, 4): None,
                ("w", 3, 3): None, ("w", 3, 4): None, ("s", 2, 3): None, ("s", 2, 4): None,
                ("w", 1, 3): None, ("w", 2, 4): None, ("s", 0, 3): None, ("s", 0, 4): None, ("s", 1, 3): None},
               floors=5, seed=5)
    nb = block("block_b", 10.5, 24.5, 46.0, 140.0, 22.5,
               {("w", 4, 6): "a", ("w", 11, 5): "b", ("w", 14, 6): "a", ("w", 19, 5): "c", ("w", 23, 6): "a", ("w", 29, 5): "b"},
               floors=7, seed=9)
    dressing()
    far_lights()
    sky_and_mist()
    print(f"PRISON set: {len(bpy.data.objects)} objects, {len(LIGHTS)} lamps, windows {na}+{nb}", flush=True)
