"""The Void Stage's cell furniture and the signs of twelve years in it (Ch 08), built part by part in Python.

The steel bunk replaces the generated one (its rails rendered as crumpled foil): square posts, rectangular-tube rails,
round bars and strap slats with real bevels, painted institutional grey-green. On it a vinyl mattress per deck, a
grey wool blanket that sags and creases and falls over the open side, a pillow, a folded blanket stack above. Around
it a few restrained signs of long occupancy, none with text: a towel over the upper guard rail, a stack of plain books
at the foot of the lower bunk, a plastic cup and a toothbrush on the basin unit, a steel shelf with folded greys.

Everything is built in place in world space (objects at the origin) so the cell's world-space materials line up.
"""
import math
import random

import bpy  # noqa: F401  (first: bmesh and mathutils only exist once bpy is loaded)
import bmesh
from mathutils import Matrix, Vector

import void_stage_set as st

M = {}


# ---------------------------------------------------------------- materials

def _tc(nt):
    return st._n(nt, "ShaderNodeTexCoord").outputs["Object"]


def bunk_paint(rgb=(0.27, 0.30, 0.285)):
    """Institutional enamel on steel: a satin grey-green, orange-peel in the coat, a few chips to dark steel on the
    edges, darker grime toward the floor. Not metal: painted steel hides small facet wobble that chrome exaggerates."""
    m, nt, b = st._new("bunk paint")
    o = _tc(nt)
    geo = st._n(nt, "ShaderNodeNewGeometry")
    z = st._xyz(nt, geo.outputs["Position"])[2]
    chips = st._maprange(nt, st._noise(nt, o, 38.0, 5.0, 0.68), 0.70, 0.73, 0.0, 1.0)
    tone = st._noise(nt, o, 4.0, 3.0, 0.55)
    base = st._mix(nt, st._maprange(nt, tone, 0.3, 0.7, 0.0, 0.25), rgb, tuple(c * 0.86 for c in rgb))
    grime = st._maprange(nt, z, 0.12, 0.45, 0.45, 0.0)
    base = st._mix(nt, grime, base, (0.07, 0.075, 0.07))
    base = st._mix(nt, st._math(nt, "MULTIPLY", chips, 0.85), base, (0.05, 0.05, 0.052))
    nt.links.new(base, b.inputs["Base Color"])
    r = st._math(nt, "ADD", st._maprange(nt, tone, 0.3, 0.7, 0.56, 0.64), st._math(nt, "MULTIPLY", chips, -0.12))
    nt.links.new(r, b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.3
    peel = st._noise(nt, o, 300.0, 2.0, 0.5)
    st._bump(nt, b, st._math(nt, "ADD", peel, st._math(nt, "MULTIPLY", chips, -0.6)), 0.1, 0.0004)
    M["bunk"] = m
    return m


def vinyl(name, rgb=(0.04, 0.05, 0.066)):
    """A prison mattress's wipe-clean vinyl cover: dark navy, a soft satin, faint wrinkles."""
    m, nt, b = st._new(name)
    o = _tc(nt)
    wr = st._noise(nt, o, 9.0, 4.0, 0.62, stretch=(1.0, 3.0, 1.0))
    base = st._mix(nt, st._maprange(nt, wr, 0.35, 0.65, 0.0, 0.3), rgb, tuple(c * 1.25 for c in rgb))
    nt.links.new(base, b.inputs["Base Color"])
    nt.links.new(st._maprange(nt, wr, 0.3, 0.7, 0.42, 0.55), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.4
    st._bump(nt, b, st._math(nt, "ADD", wr, st._math(nt, "MULTIPLY", st._noise(nt, o, 220.0, 2.0, 0.5), 0.15)),
             0.18, 0.002)
    M[name] = m
    return m


def wool(name, rgb=(0.085, 0.08, 0.074), sheen=0.12):
    """A coarse grey-brown wool blanket: matt, a little fuzz at grazing light, a visible weave and pilling."""
    m, nt, b = st._new(name)
    o = _tc(nt)
    pill = st._noise(nt, o, 70.0, 3.0, 0.6)
    base = st._mix(nt, st._maprange(nt, st._noise(nt, o, 6.0, 3.0, 0.6), 0.3, 0.7, 0.0, 0.35), rgb,
                   tuple(c * 0.8 for c in rgb))
    nt.links.new(base, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.95
    b.inputs["Specular IOR Level"].default_value = 0.15
    b.inputs["Sheen Weight"].default_value = sheen
    b.inputs["Sheen Tint"].default_value = (0.5, 0.5, 0.5, 1.0)
    wx = st._n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="X")
    wx.inputs["Scale"].default_value = 160.0
    wy = st._n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="Y")
    wy.inputs["Scale"].default_value = 160.0
    nt.links.new(o, wx.inputs["Vector"])
    nt.links.new(o, wy.inputs["Vector"])
    weave = st._math(nt, "MULTIPLY", wx.outputs["Color"], wy.outputs["Color"])
    h = st._math(nt, "ADD", st._math(nt, "MULTIPLY", weave, 0.4), st._math(nt, "MULTIPLY", pill, 0.6))
    st._bump(nt, b, h, 0.3, 0.0012)
    M[name] = m
    return m


def cotton(name, rgb, rough=0.88, bump=0.15, scale=500.0):
    m, nt, b = st._new(name)
    o = _tc(nt)
    tone = st._noise(nt, o, 8.0, 3.0, 0.6)
    nt.links.new(st._mix(nt, st._maprange(nt, tone, 0.3, 0.7, 0.0, 0.3), rgb, tuple(c * 0.85 for c in rgb)),
                 b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = 0.18
    st._bump(nt, b, st._noise(nt, o, scale, 2.0, 0.6), bump, 0.0008)
    M[name] = m
    return m


def plain(name, rgb, rough=0.5, spec=0.4, bump=0.0, scale=200.0):
    m, nt, b = st._new(name)
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = spec
    if bump:
        st._bump(nt, b, st._noise(nt, _tc(nt), scale, 2.0, 0.55), bump, 0.0006)
    M[name] = m
    return m


def pages(name="book pages"):
    """Page edges: pale, matt, finely ruled along the block (the leaves seen edge on)."""
    m, nt, b = st._new(name)
    geo = st._n(nt, "ShaderNodeNewGeometry")
    z = st._xyz(nt, geo.outputs["Position"])[2]
    ln = st._n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="Z")
    ln.inputs["Scale"].default_value = 1.0
    sc = st._math(nt, "MULTIPLY", z, 900.0)
    nt.links.new(st._vec(nt, 0.0, 0.0, sc), ln.inputs["Vector"])
    base = st._mix(nt, st._math(nt, "MULTIPLY", ln.outputs["Fac"], 0.25), (0.40, 0.385, 0.35), (0.3, 0.29, 0.26))
    nt.links.new(base, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.92
    b.inputs["Specular IOR Level"].default_value = 0.2
    M[name] = m
    return m


def materials():
    M.clear()
    bunk_paint()
    vinyl("mattress vinyl")
    wool("blanket wool")
    wool("blanket wool folded", rgb=(0.07, 0.072, 0.075), sheen=0.1)
    cotton("pillow cotton", (0.2, 0.2, 0.195), rough=0.85, bump=0.1)
    cotton("towel terry", (0.15, 0.158, 0.165), rough=0.97, bump=0.6, scale=900.0)
    cotton("prison greys", (0.045, 0.047, 0.05), rough=0.9, bump=0.2)
    plain("cup plastic", (0.26, 0.28, 0.31), rough=0.32, spec=0.5)
    plain("brush handle", (0.3, 0.33, 0.36), rough=0.3, spec=0.5)
    plain("brush bristle", (0.5, 0.5, 0.5), rough=0.7, spec=0.3, bump=0.3, scale=900.0)
    for i, rgb in enumerate(((0.055, 0.065, 0.085), (0.085, 0.058, 0.045), (0.05, 0.066, 0.056),
                             (0.07, 0.07, 0.07))):
        plain(f"book cover {i}", rgb, rough=0.62, spec=0.25, bump=0.15, scale=300.0)
    pages()
    st.painted_steel("shelf steel", (0.2, 0.21, 0.205), rough=0.5)
    M["shelf steel"] = st.M["shelf steel"]


# ---------------------------------------------------------------- geometry helpers

def _link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def _smooth(me):
    for p in me.polygons:
        p.use_smooth = True


def _bevel(ob, width, segs=3, angle=30.0):
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = width, segs, "ANGLE"
    bv.angle_limit = math.radians(angle)
    bv.harden_normals = False
    ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
    _smooth(ob.data)
    return ob


def box(name, lo, hi, mat, bevel=0.004, segs=3):
    ob = st.block(name, lo, hi, [mat])
    if bevel:
        _bevel(ob, bevel, segs)
    return ob


def tube(name, a, b, r, mat, segs=20, bevel=0.002):
    """A round bar from a to b."""
    a, b = Vector(a), Vector(b)
    d = b - a
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rot = d.to_track_quat("Z", "Y").to_matrix().to_4x4()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=d.length,
                          matrix=Matrix.Translation((a + b) / 2) @ rot)
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    me.materials.append(mat)
    if bevel:
        _bevel(ob, bevel, 2, angle=40.0)
    else:
        _smooth(me)
    return ob


def _grid_mesh(name, nu, nv, fn, mat):
    """A surface from a function (i, j) -> (x, y, z) over an (nu+1) x (nv+1) grid."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [[bm.verts.new(fn(i, j)) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    me.materials.append(mat)
    _smooth(me)
    return ob


def _cloth_finish(ob, thick, subd=1):
    so = ob.modifiers.new("thickness", "SOLIDIFY")
    so.thickness, so.offset = thick, 0.0
    so.use_even_offset = True
    ob.modifiers.new("smooth", "SUBSURF").levels = subd
    ob.modifiers["smooth"].render_levels = subd
    return ob


def soft_box(name, lo, hi, mat, round_=0.02, sag=0.0, puff=0.0, cuts=8, seed=0, wobble=0.0):
    """A soft block (mattress, pillow, folded cloth): a subdivided box, rounded edges, its top sagging in the middle
    (`sag`) or puffed (`puff`, a pillow), with a little irregularity (`wobble`)."""
    lo, hi = Vector(lo), Vector(hi)
    c, s = (lo + hi) / 2, hi - lo
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
    rng = random.Random(seed)
    ph = [rng.uniform(0, 6.28) for _ in range(4)]
    for v in bm.verts:
        u, w, h = v.co.x + 0.5, v.co.y + 0.5, v.co.z + 0.5        # 0..1 across the box
        x, y, z = lo.x + u * s.x, lo.y + w * s.y, lo.z + h * s.z
        bell = math.sin(math.pi * u) * math.sin(math.pi * w)
        if h > 0.5:
            z -= sag * bell
        if puff:
            z = c.z + (z - c.z) * (0.35 + 0.65 * bell ** 0.6)
            z += puff * bell * (1 if h > 0.5 else -1)
        if wobble:
            z += wobble * math.sin(u * 7.0 + ph[0]) * math.sin(w * 5.0 + ph[1]) * h
            x += wobble * 0.5 * math.sin(w * 6.0 + ph[2]) * (h - 0.5)
        v.co = Vector((x, y, z))
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    me.materials.append(mat)
    bv = ob.modifiers.new("round", "BEVEL")
    bv.width, bv.segments, bv.limit_method = round_, 4, "ANGLE"
    bv.angle_limit = math.radians(35.0)
    ob.modifiers.new("smooth", "SUBSURF").levels = 1
    _smooth(me)
    return ob


# ---------------------------------------------------------------- the bunk

# the frame's footprint against the cell's left wall (cell-local): 0.80 wide, 1.95 long, head to the back wall
BUNK_W, BUNK_L = 0.80, 1.95
POST = 0.05                     # 50 mm square tube posts
RAIL_H, RAIL_W = 0.05, 0.025    # 50 x 25 mm rectangular tube rails
LOW_DECK, UP_DECK, TOP = 0.36, 1.42, 1.72   # rail tops above the slab: lower deck, upper deck, post tops


def bunk(ox, oy):
    """The steel bunk in the cell at (ox, oy) (the cell's centre). Returns (objects, a dict of key positions)."""
    P = M["bunk"]
    z0 = st.SLAB
    xL = ox - st.CX + 0.03
    xR = xL + BUNK_W
    yB = oy + st.CY - 0.03
    yF = yB - BUNK_L
    objs = []
    # posts, each on a welded foot plate
    for i, (px, py) in enumerate(((xL, yF), (xR - POST, yF), (xL, yB - POST), (xR - POST, yB - POST))):
        objs.append(box(f"bunk_post{i}", (px, py, z0), (px + POST, py + POST, z0 + TOP), P, 0.004))
        objs.append(box(f"bunk_foot{i}", (px - 0.015, py - 0.015, z0), (px + POST + 0.015, py + POST + 0.015, z0 + 0.006),
                        P, 0.002, 2))
    zl, zu = z0 + LOW_DECK, z0 + UP_DECK
    for tag, zt in (("low", zl), ("up", zu)):
        # side rails along the length (inside face flush with the posts' inside), end rails across
        for side, x0 in (("w", xL), ("o", xR - RAIL_W)):
            objs.append(box(f"bunk_{tag}_rail_{side}", (x0, yF + POST, zt - RAIL_H), (x0 + RAIL_W, yB - POST, zt), P, 0.003))
        for end, y0 in (("f", yF), ("h", yB - RAIL_W)):
            objs.append(box(f"bunk_{tag}_end_{end}", (xL + POST, y0, zt - RAIL_H), (xR - POST, y0 + RAIL_W, zt), P, 0.003))
        # strap slats across, every 0.15 m, flush with the rail tops
        n = int((BUNK_L - 2 * POST) / 0.15)
        for k in range(n):
            y = yF + POST + 0.06 + k * (BUNK_L - 2 * POST - 0.12) / (n - 1)
            objs.append(box(f"bunk_{tag}_slat{k}", (xL + RAIL_W, y - 0.025, zt - 0.006), (xR - RAIL_W, y + 0.025, zt),
                            P, 0.0015, 2))
    # head end: a top rail at the post tops and a guard rail above the lower deck, three round bars in each panel
    for end, y0 in (("h", yB - RAIL_W), ("f", yF)):
        objs.append(box(f"bunk_top_end_{end}", (xL + POST, y0, z0 + TOP - RAIL_H), (xR - POST, y0 + RAIL_W, z0 + TOP),
                        P, 0.003))
        objs.append(box(f"bunk_mid_end_{end}", (xL + POST, y0, z0 + 0.80 - RAIL_H), (xR - POST, y0 + RAIL_W, z0 + 0.80),
                        P, 0.003))
    yc = yB - RAIL_W / 2
    for k in range(3):
        x = xL + POST + (k + 1) * (BUNK_W - 2 * POST) / 4
        objs.append(tube(f"bunk_hbar_low{k}", (x, yc, zl), (x, yc, z0 + 0.80 - RAIL_H), 0.0095, P))
        objs.append(tube(f"bunk_hbar_up{k}", (x, yc, zu), (x, yc, z0 + TOP - RAIL_H), 0.0095, P))
    # foot end: ladder rungs between the decks
    yc = yF + RAIL_W / 2
    for k, z in enumerate((z0 + 1.08,)):
        objs.append(tube(f"bunk_rung{k}", (xL + POST, yc, z), (xR - POST, yc, z), 0.0125, P))
    # the upper deck's guard rail along the open side, post to post
    objs.append(box("bunk_guard", (xR - RAIL_W, yF + POST, z0 + TOP - RAIL_H), (xR, yB - POST, z0 + TOP), P, 0.003))
    # a wall bracket: two flat plates bolting the head posts to the back wall
    for k, z in enumerate((zl - 0.02, zu - 0.02)):
        objs.append(box(f"bunk_bracket{k}", (xL - 0.03, yB - POST - 0.06, z - 0.04), (xL, yB - POST + 0.06, z), P, 0.002, 2))
    key = dict(xL=xL, xR=xR, yF=yF, yB=yB, zl=zl, zu=zu, top=z0 + TOP)
    return objs, key


def blanket(name, x_wall, x_edge, y0, y1, z_top, drop, mat, sag=0.014, fold=0.24, seed=3):
    """A blanket over a mattress against the wall: flat on top from the wall to the open edge, round over the edge and
    down the side by `drop` (its hem rippling), sagging with the mattress, creased; its head end turned back over
    itself by `fold` metres (a turned-down top)."""
    rng = random.Random(seed)
    waves = [(rng.uniform(5, 13), rng.uniform(0, math.tau), rng.uniform(-0.8, 0.8), rng.uniform(0.002, 0.005))
             for _ in range(6)]
    r = 0.035
    wt = x_edge - x_wall
    sv = wt + r * math.pi / 2 + drop
    rf = 0.01
    L = (y1 - y0)
    su = L + math.pi * rf + fold
    nu, nv = 90, 46

    def fn(i, j):
        s = su * i / nu
        t = sv * j / nv
        # across: top, round, hang
        if t <= wt:
            x, zz, hang = x_wall + t, 0.0, 0.0
        elif t <= wt + r * math.pi / 2:
            a = (t - wt) / r
            x, zz, hang = x_edge + r * math.sin(a), -r * (1 - math.cos(a)), 0.0
        else:
            d = t - wt - r * math.pi / 2
            x, zz, hang = x_edge + r, -r - d, d / drop
        # along: main length, the fold's round, the turned-back strip
        layer = 0.0
        if s <= L:
            y = y0 + s
        elif s <= L + math.pi * rf:
            a = (s - L) / rf
            y = y1 + rf * math.sin(a)
            layer = rf * (1 - math.cos(a))
        else:
            y = y1 - (s - L - math.pi * rf)
            layer = 2 * rf
        u = (y - y0) / L
        top = 1.0 - hang
        z = z_top + zz + layer
        w = max(0.0, min(1.0, (x - x_wall) / wt))
        z -= sag * math.sin(math.pi * min(1.0, max(0.0, u))) * math.sin(math.pi * w) * top
        cr = sum(a * math.sin(f * (y * math.cos(k) + x * math.sin(k)) + p) for f, p, k, a in waves)
        z += cr * top * min(1.0, w * 6.0) * (0.4 if layer > rf else 1.0)
        if hang > 0:
            x += 0.016 * hang * (0.5 + 0.5 * math.sin(y * 21.0 + 1.3)) + 0.01 * hang * hang
            z += 0.012 * hang * math.sin(y * 11.0 + 0.4)
        return (x, y, z)

    ob = _grid_mesh(name, nu, nv, fn, mat)
    return _cloth_finish(ob, 0.006, 1)


def towel_over_rail(name, x, y0, y1, z_rail, r_rail, mat, hang_in=0.2, hang_out=0.3, seed=5):
    """A thin towel folded lengthwise and hung over a round or square rail: down the inside, over, down the outside."""
    rng = random.Random(seed)
    ph = [rng.uniform(0, 6.28) for _ in range(3)]
    R = r_rail + 0.004
    sv = hang_in + math.pi * R + hang_out
    nu, nv = 24, 40

    def fn(i, j):
        y = y0 + (y1 - y0) * i / nu
        t = sv * j / nv
        if t <= hang_in:
            d = hang_in - t
            xx, z, k = x - R, z_rail - d, d / hang_in
        elif t <= hang_in + math.pi * R:
            a = (t - hang_in) / R
            xx, z, k = x - R * math.cos(a), z_rail + R * math.sin(a), 0.0
        else:
            d = t - hang_in - math.pi * R
            xx, z, k = x + R, z_rail - d, d / hang_out
        side = -1 if t <= hang_in else 1
        xx += side * k * (0.012 + 0.01 * math.sin(y * 30 + ph[0]))
        z -= k * k * 0.015 * (1 + math.sin(y * 17 + ph[1]))
        return (xx, y, z)

    ob = _grid_mesh(name, nu, nv, fn, mat)
    return _cloth_finish(ob, 0.006, 1)


def book(name, cx, cy, z, w, l, t, turn_deg, cover):
    """A plain hardback lying flat: covers top, bottom and spine, the page block on three sides, no text."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Diagonal((w, l, t, 1.0)))
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    me.materials.append(cover)
    me.materials.append(M["book pages"])
    for p in me.polygons:
        n = p.normal
        p.material_index = 0 if (abs(n.z) > 0.5 or n.x < -0.5) else 1
    ob.location = (cx, cy, z + t / 2)
    ob.rotation_euler = (0, 0, math.radians(turn_deg))
    _bevel(ob, 0.0015, 2)
    return ob


def cup(name, x, y, z, mat, r=0.036, h=0.095):
    """A plain moulded plastic cup, slightly tapered, open at the top (its wall has thickness)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=r * 0.82, radius2=r, depth=h,
                          matrix=Matrix.Translation((x, y, z + h / 2)))
    top = [f for f in bm.faces if f.normal.z > 0.5]
    bmesh.ops.inset_region(bm, faces=top, thickness=0.0025, depth=0.0)
    bmesh.ops.inset_region(bm, faces=top, thickness=0.0005, depth=-(h - 0.004))
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    me.materials.append(mat)
    _smooth(me)
    ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
    return ob


def toothbrush(name, base, tip):
    """A plain toothbrush standing in a cup: a flat handle and a small bristle head."""
    base, tip = Vector(base), Vector(tip)
    d = (tip - base)
    L = d.length
    rot = d.to_track_quat("Z", "Y").to_matrix().to_4x4()
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(base + d / 2) @ rot @ Matrix.Diagonal((0.011, 0.006, L, 1)))
    bm.to_mesh(me)
    bm.free()
    h = _link(bpy.data.objects.new(name, me))
    me.materials.append(M["brush handle"])
    _bevel(h, 0.0025, 2)
    me2 = bpy.data.meshes.new(name + "_bristle")
    bm = bmesh.new()
    head = base + d * 0.93
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(head) @ rot @ Matrix.Translation((0, 0.008, 0))
                          @ Matrix.Diagonal((0.01, 0.011, 0.024, 1)))
    bm.to_mesh(me2)
    bm.free()
    br = _link(bpy.data.objects.new(name + "_bristle", me2))
    me2.materials.append(M["brush bristle"])
    _bevel(br, 0.002, 2)
    return [h, br]


# ---------------------------------------------------------------- the cell's furniture and dressing

def furnish(ox, oy, unit_xy):
    """Bunk, bedding and the signs of long occupancy. `unit_xy` is the basin unit's back centre (world)."""
    materials()
    objs, k = bunk(ox, oy)
    z0 = st.SLAB
    xL, xR, yF, yB, zl, zu = k["xL"], k["xR"], k["yF"], k["yB"], k["zl"], k["zu"]
    # mattresses on the slats
    for tag, zt in (("low", zl), ("up", zu)):
        objs.append(soft_box(f"mattress_{tag}", (xL + RAIL_W + 0.006, yF + POST + 0.008, zt),
                             (xR - RAIL_W - 0.006, yB - POST - 0.008, zt + 0.10), M["mattress vinyl"],
                             round_=0.03, sag=0.012, cuts=10, seed=1 if tag == "low" else 2, wobble=0.003))
    m_top_l = zl + 0.10
    m_top_u = zu + 0.10
    xin, xout = xL + RAIL_W + 0.006, xR - RAIL_W - 0.006
    # lower bunk: the pillow at the head, the blanket from the foot to below the pillow, turned down, over the open side
    objs.append(soft_box("pillow_low", (xin + 0.06, yB - POST - 0.44, m_top_l - 0.01),
                         (xout - 0.08, yB - POST - 0.06, m_top_l + 0.09), M["pillow cotton"], round_=0.03,
                         puff=0.015, cuts=8, seed=4, wobble=0.004))
    objs.append(blanket("blanket_low", xin + 0.01, xout + 0.004, yF + POST + 0.02, yB - POST - 0.42,
                        m_top_l + 0.004, 0.2, M["blanket wool"], seed=3))
    # upper bunk: pillow, and a folded blanket and sheet stacked at the foot
    objs.append(soft_box("pillow_up", (xin + 0.08, yB - POST - 0.42, m_top_u - 0.01),
                         (xout - 0.06, yB - POST - 0.06, m_top_u + 0.08), M["pillow cotton"], round_=0.03,
                         puff=0.012, cuts=8, seed=6, wobble=0.004))
    objs.append(soft_box("fold_blanket_up", (xin + 0.12, yF + POST + 0.06, m_top_u - 0.012),
                         (xin + 0.58, yF + POST + 0.42, m_top_u + 0.07), M["blanket wool folded"], round_=0.02,
                         sag=-0.006, cuts=6, seed=7, wobble=0.004))
    objs.append(soft_box("fold_sheet_up", (xin + 0.15, yF + POST + 0.09, m_top_u + 0.066),
                         (xin + 0.53, yF + POST + 0.36, m_top_u + 0.095), M["pillow cotton"], round_=0.012,
                         cuts=6, seed=8, wobble=0.002))
    # a towel hung over the upper guard rail, near the foot
    objs.append(towel_over_rail("towel", xR - RAIL_W / 2, yF + 0.30, yF + 0.62, z0 + TOP + 0.004, 0.026,
                                M["towel terry"], hang_in=0.16, hang_out=0.34))
    # the wall desk and stool in front of the bunk's foot; on the desk a stack of plain books, a little askew
    objs += desk(ox, oy)
    bx, by = ox - st.CX + 0.2, oy + DESK[1] + 0.2
    z = z0 + DESK[2]
    for i, (w, l, t, turn) in enumerate(((0.165, 0.235, 0.032, 8.0), (0.15, 0.225, 0.026, -4.0),
                                         (0.14, 0.205, 0.036, 15.0), (0.13, 0.2, 0.02, 3.0))):
        objs.append(book(f"book{i}", bx + 0.006 * i, by - 0.004 * i, z, w, l, t, turn, M[f"book cover {i}"]))
        z += t
    # a few loose sheets beside them (blank: no writing anywhere in 3D)
    px0 = ox - st.CX + 0.04
    objs.append(box("desk_papers", (px0, by + 0.125, z0 + DESK[2]), (px0 + 0.21, by + 0.41, z0 + DESK[2] + 0.003),
                    M["pillow cotton"], 0.0005, 1))
    # the basin unit's top: a plastic cup with a toothbrush in it, on the rim's back corner
    ux, uy = unit_xy
    cx, cy, cz = ux - 0.30 + 0.042, uy - 0.04, z0 + 0.94
    objs.append(cup("cup", cx, cy, cz, M["cup plastic"]))
    objs += toothbrush("toothbrush", (cx + 0.006, cy - 0.004, cz + 0.012), (cx + 0.03, cy - 0.022, cz + 0.19))
    return objs, k


DESK = (0.42, -1.12, 0.74, 0.62)   # depth from the left wall, front-most y (cell-local), top height, width along y


def desk(ox, oy):
    """A cell desk bolted to the left wall: a folded steel top with a front lip on two gusset brackets, and a round
    stool on a post bolted to the floor in front of it. Bunk paint."""
    P = M["bunk"]
    z0 = st.SLAB
    dd, y0, zt, w = DESK
    x0 = ox - st.CX
    y0 = oy + y0
    objs = [box("desk_top", (x0, y0, z0 + zt - 0.025), (x0 + dd, y0 + w, z0 + zt), P, 0.004),
            box("desk_lip", (x0 + dd - 0.025, y0, z0 + zt - 0.07), (x0 + dd, y0 + w, z0 + zt - 0.02), P, 0.003)]
    for k, yy in enumerate((y0 + 0.07, y0 + w - 0.07)):
        me = bpy.data.meshes.new(f"desk_gusset{k}")
        bm = bmesh.new()
        pts = [(x0, yy - 0.004, z0 + zt - 0.025), (x0 + dd - 0.05, yy - 0.004, z0 + zt - 0.025), (x0, yy - 0.004, z0 + zt - 0.33)]
        vs = [bm.verts.new(p) for p in pts] + [bm.verts.new((p[0], p[1] + 0.008, p[2])) for p in pts]
        bm.faces.new((vs[0], vs[1], vs[2]))
        bm.faces.new((vs[3], vs[5], vs[4]))
        for a, b in ((0, 1), (1, 2), (2, 0)):
            bm.faces.new((vs[a], vs[a + 3], vs[b + 3], vs[b]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        g = _link(bpy.data.objects.new(me.name, me))
        me.materials.append(P)
        _bevel(g, 0.0015, 2)
        objs.append(g)
    sx, sy = x0 + dd + 0.2, y0 + w * 0.45
    objs.append(tube("stool_post", (sx, sy, z0), (sx, sy, z0 + 0.43), 0.03, P, bevel=0.002))
    objs.append(tube("stool_flange", (sx, sy, z0), (sx, sy, z0 + 0.008), 0.09, P, segs=32, bevel=0.002))
    objs.append(tube("stool_seat", (sx, sy, z0 + 0.43), (sx, sy, z0 + 0.455), 0.17, P, segs=40, bevel=0.004))
    return objs


def shelf(ox, oy, y_c, z, length=0.62, depth=0.22):
    """A steel shelf on the right wall (folded plate with a front lip, two gusset brackets), folded prison greys and a
    cup on it. Returns its objects."""
    S = M["shelf steel"]
    xw = ox + st.CX
    objs = [box("shelf_plate", (xw - depth, y_c - length / 2, z - 0.004), (xw, y_c + length / 2, z), S, 0.0015, 2),
            box("shelf_lip", (xw - depth, y_c - length / 2, z - 0.035), (xw - depth + 0.004, y_c + length / 2, z), S,
                0.0015, 2)]
    for k, yy in enumerate((y_c - length / 2 + 0.06, y_c + length / 2 - 0.06)):
        me = bpy.data.meshes.new(f"shelf_gusset{k}")
        bm = bmesh.new()
        pts = [(xw, yy - 0.003, z - 0.004), (xw - depth + 0.02, yy - 0.003, z - 0.004), (xw, yy - 0.003, z - 0.16)]
        vs = [bm.verts.new(p) for p in pts] + [bm.verts.new((p[0], p[1] + 0.006, p[2])) for p in pts]
        bm.faces.new((vs[0], vs[1], vs[2]))
        bm.faces.new((vs[3], vs[5], vs[4]))
        for a, b in ((0, 1), (1, 2), (2, 0)):
            bm.faces.new((vs[a], vs[a + 3], vs[b + 3], vs[b]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        g = _link(bpy.data.objects.new(me.name, me))
        me.materials.append(S)
        _bevel(g, 0.001, 1)
        objs.append(g)
    G = M["prison greys"]
    objs.append(soft_box("shelf_fold0", (xw - depth + 0.02, y_c - 0.27, z), (xw - 0.015, y_c - 0.02, z + 0.055), G,
                         round_=0.012, cuts=6, seed=11, wobble=0.003))
    objs.append(soft_box("shelf_fold1", (xw - depth + 0.03, y_c - 0.25, z + 0.052), (xw - 0.025, y_c - 0.04, z + 0.09),
                         M["blanket wool folded"], round_=0.01, cuts=6, seed=12, wobble=0.002))
    objs.append(cup("shelf_cup", xw - 0.1, y_c + 0.15, z, M["cup plastic"], r=0.034, h=0.09))
    return objs
