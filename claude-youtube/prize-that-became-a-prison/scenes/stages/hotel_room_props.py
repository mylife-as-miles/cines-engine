"""The packing on the bed (Ch 04): the film's real props, finished for this room.

  * dawn-suitcase, opened: the generated case is cut along its zip line (a plane 35 mm in front of its middle), laid
    on its back on the duvet, the front part flipped open beside it as the lid (the fabric gusset between them), a
    lining tray in each half hides the cut shell, the tub holds her folded clothes and a tissue-wrapped parcel, the
    lid a mesh divider panel with its zip.
  * extra-bag-open: its zip mouth (a narrow slot in the file) eased open by a smooth deformation of the near lip, its
    flopped carry straps drawn in and laid onto the duvet's surface.
  * handbag-tote laid on its back on a sheet of tissue, clean face up, handles fallen past its top edge onto the
    bedspread, tissue stuffing puffing from its mouth (new bags come stuffed with paper).
  * handbag-satchel standing on the bedspread, its strap lying round it as in the file.
  * handbag-shoulder: the one in Dawn's hand, hung from her grip by its strap's apex (placed by the stage).
  * tissue paper: crumpled sheets made by successive random folds of a fine grid.

Every prop is imported through noir-kit/props.py, then baked to plain metres in its own frame (front, top) so these
operations read in the prop's terms; the stage places the result with a parent empty.
"""
import math
import random

import bpy  # noqa: F401
import bmesh
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

import props as pk
import setkit as sk
import hotel_room_mats as mt
import hotel_room_set as st

M = mt.M
PROPS = {  # size, axis, grade, finish (spec)
    "dawn-suitcase": (0.66, "z", dict(sat=0.6, val=0.9, rough_add=0.15), 0.2),
    # black nylon: at val 0.36 and a cut sheen it went to a featureless black in the lamp light (leather_market saw
    # the same): lifted, with enough sheen for its folds and straps to read
    "extra-bag-open": (0.75, "long", dict(sat=0.5, val=0.5, rough_add=0.15), 0.3),
    # cognac: the red-brown that grades to salmon turned toward orange and lifted (inspection_room's values)
    # (under the warm lamp the inspection room's orange turn read yellow-olive after the grade: less hue, less sat)
    "handbag-tote": (0.35, "long", dict(sat=1.0, val=0.66, hue=0.53, rough_add=0.2), 0.38),
    "handbag-satchel": (0.30, "long", dict(sat=0.8, rough_add=0.12), 0.35),
    # glossy raspberry darkened toward burgundy (prop table: val ~0.55, rough_add ~0.25), a touch redder
    "handbag-shoulder": (0.32, "long", dict(sat=0.75, val=0.62, hue=0.49, rough_add=0.25), 0.3),
}


def _link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def load_baked(name):
    """Import a prop at its real size and return its mesh object with the data in the prop's own frame (metres,
    footprint centred at the origin, floor at z 0, as the prop table describes its front), identity transform."""
    size, axis, grade, spec = PROPS[name]
    h = pk.load(name, size=size, axis=axis, loc=(0, 0, 0), turn_deg=0.0, **grade)
    bpy.context.view_layer.update()
    meshes = [o for o in h.children_recursive if o.type == "MESH"]
    mws = {o.name: o.matrix_world.copy() for o in meshes}
    for o in meshes:
        o.parent = None
    for o in meshes:
        o.matrix_world = Matrix.Identity(4)
        o.data.transform(mws[o.name])
        o.data.update()
    for o in [h] + [c for c in h.children_recursive if c.type != "MESH"]:
        bpy.data.objects.remove(o, do_unlink=True)
    # the main shell is the largest mesh; any small extra part (the case's handle webbing) rides on it
    meshes.sort(key=lambda o: -len(o.data.vertices))
    out = meshes[0]
    for o in meshes[1:]:
        o.parent = out
    out.name = name
    seen = set()
    for o in meshes:
        for s in o.material_slots:
            if s.material and s.material.name not in seen:
                seen.add(s.material.name)
                mt.tune_prop(s.material, spec=spec)
    return out


def holder(name, loc, turn_deg, children):
    e = _link(bpy.data.objects.new(name, None))
    e.location, e.rotation_euler = loc, (0, 0, math.radians(turn_deg))
    for c in children:
        c.parent = e
    bpy.context.view_layer.update()
    return e


def verts_np(me):
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get("co", co)
    return co.reshape(-1, 3).astype(np.float64)


def set_verts(me, co):
    me.vertices.foreach_set("co", np.ascontiguousarray(co, dtype=np.float32).ravel())
    me.update()


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- generic soft shapes

def rounded_rect(x0, x1, y0, y1, r, seg=6):
    pts = []
    for cx, cy, a0 in ((x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180), (x1 - r, y0 + r, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def tray(name, rect, z0, z1, r, m, thick=0.003, floor=True):
    """An open-top rounded tray: floor at z0, walls to z1 (lining)."""
    x0, x1, y0, y1 = rect
    pts = rounded_rect(x0, x1, y0, y1, r)
    bm = bmesh.new()
    lo = [bm.verts.new((x, y, z0)) for x, y in pts]
    hi = [bm.verts.new((x, y, z1)) for x, y in pts]
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    if floor:
        bm.faces.new(list(reversed(lo)))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    ob.data.materials.append(m)
    so = ob.modifiers.new("thick", "SOLIDIFY")
    so.thickness, so.offset = thick, -1.0
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = 0.003, 2, "ANGLE"
    for p in me.polygons:
        p.use_smooth = True
    return ob


def slab(name, size, loc, m, rot=0.0, bevel=None, sag=0.0, seed=0, disp=0.003):
    """A folded garment or a padded pouch: a soft rounded slab, edges rolled, a little sag and crumple."""
    sx, sy, sz = size
    ob = st.soft_box(name, size, loc, m, bevel or min(sz * 0.45, 0.025), cuts=(8, 8, 2), rot=(0, 0, rot),
                     disp=((0.05, disp), (0.2, disp * 1.5)))
    if sag:
        me = ob.data
        co = verts_np(me)
        r = np.sqrt((co[:, 0] / (sx / 2)) ** 2 + (co[:, 1] / (sy / 2)) ** 2)
        co[:, 2] -= sag * np.clip(r, 0, 1.4) ** 2 * (co[:, 2] > 0)
        set_verts(me, co)
    return ob


def crumple(name, w, h, m, seed=1, folds=26, angle=38.0, flatten=0.45, res=(82, 58), scrunch=1.0):
    """A crumpled sheet of tissue: a fine grid folded again and again along random lines (each fold turns every
    point on one side of a line through two random points about that line), with a fine noise, then flattened onto
    whatever it lies on. Returns the object with its lowest point at z 0, centred on its footprint."""
    rng = random.Random(seed)
    nx, ny = res
    uu, vv = np.meshgrid(np.linspace(-w / 2, w / 2, nx + 1), np.linspace(-h / 2, h / 2, ny + 1))
    uv = np.stack([uu.ravel(), vv.ravel()], 1)
    P = np.zeros((len(uv), 3))
    P[:, 0], P[:, 1] = uv[:, 0] * scrunch, uv[:, 1] * scrunch
    for _ in range(folds):
        i, j = rng.randrange(len(uv)), rng.randrange(len(uv))
        if i == j:
            continue
        a2, b2 = uv[i], uv[j]
        d2 = b2 - a2
        if np.linalg.norm(d2) < w * 0.15:
            continue
        side = (uv[:, 0] - a2[0]) * d2[1] - (uv[:, 1] - a2[1]) * d2[0] > 0
        A, B = P[i].copy(), P[j].copy()
        ax = B - A
        ax /= np.linalg.norm(ax) + 1e-9
        th = math.radians(rng.uniform(-angle, angle))
        R = np.array(Matrix.Rotation(th, 3, Vector(ax)))
        P[side] = (P[side] - A) @ R.T + A
    P[:, 2] += np.sin(uv[:, 0] * 61.0 + seed) * np.sin(uv[:, 1] * 47.0) * 0.002
    P[:, 2] *= flatten
    P[:, :2] -= (P[:, :2].min(0) + P[:, :2].max(0)) / 2
    P[:, 2] -= P[:, 2].min()
    F = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i)
         for j in range(ny) for i in range(nx)]
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in P], [], F)
    me.update()
    ob = _link(bpy.data.objects.new(name, me))
    ob.data.materials.append(m)
    so = ob.modifiers.new("thick", "SOLIDIFY")
    so.thickness, so.offset = 0.0003, 0.0
    for p in me.polygons:
        p.use_smooth = True
    return ob


def drape_on(ob, surfaces, lift=0.002, keep=0.6):
    """Lower a sheet's vertices onto the surfaces below them (BVH ray casts, world space): each vertex keeps a
    fraction `keep` of its own crumple height above the surface it lies on."""
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    trees = []
    for s in surfaces:
        trees.append((BVHTree.FromObject(s, dg), s.matrix_world.copy(), s.matrix_world.inverted()))
    mw, mi = ob.matrix_world, ob.matrix_world.inverted()
    me = ob.data
    for v in me.vertices:
        p = mw @ v.co
        best = None
        for tree, smw, smi in trees:
            o = smi @ Vector((p.x, p.y, p.z + 1.0))
            d = (smi.to_3x3() @ Vector((0, 0, -1))).normalized()
            hit, n, i, dist = tree.ray_cast(o, d)
            if hit is not None:
                z = (smw @ hit).z
                best = z if best is None else max(best, z)
        if best is not None:
            h0 = v.co.z * ob.matrix_world.to_scale().z
            p.z = best + lift + h0 * keep
            v.co = mi @ p
    me.update()


def surface_z(objs, x, y, z_from=3.0):
    """The highest surface of `objs` under (x, y), world space."""
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    best = None
    for s in objs:
        tree = BVHTree.FromObject(s, dg)
        smi = s.matrix_world.inverted()
        o = smi @ Vector((x, y, z_from))
        d = (smi.to_3x3() @ Vector((0, 0, -1))).normalized()
        hit, n, i, dist = tree.ray_cast(o, d)
        if hit is not None:
            z = (s.matrix_world @ hit).z
            best = z if best is None else max(best, z)
    return best


# ---------------------------------------------------------------- the opened suitcase

X_CUT = 0.035       # the zip plane, file X (front +X)


def _bisect(ob, keep_below):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(X_CUT, 0, 0), plane_no=(1, 0, 0), dist=1e-5,
                           clear_outer=keep_below, clear_inner=not keep_below)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()


def open_suitcase(loc, turn_deg, lid_side=-1):
    """Dawn's case on its back, opened. Laid frame (before `turn_deg`): the case's length along X (its handle end
    at -X), its width along Y, its back on the duvet; the lid flipped to the `lid_side` (+1 = +Y) and lying flat.
    Returns (holder, info)."""
    tub = load_baked("dawn-suitcase")
    co = verts_np(tub.data)
    lid = tub.copy()
    lid.data = tub.data.copy()
    _link(lid)
    tub.name, lid.name = "case_tub", "case_lid"
    _bisect(tub, True)
    _bisect(lid, False)
    # the rim outline from the cut (robust to the carry handle and the wheels crossing the plane)
    cut = verts_np(tub.data)
    cut = cut[np.abs(cut[:, 0] - X_CUT) < 2e-4]
    mid = cut[(cut[:, 2] > 0.06) & (cut[:, 2] < 0.48)]
    ry0, ry1 = np.percentile(mid[:, 1], 1.5), np.percentile(mid[:, 1], 98.5)
    band = cut[np.abs(cut[:, 1]) < 0.12]
    rz0, rz1 = np.percentile(band[:, 2], 1.5), np.percentile(band[:, 2], 98.5)
    xback = co[:, 0].min()
    zc = (rz0 + rz1) / 2
    # lay it on its back: file -X down, file +Z (the handle end) toward laid -X, centred on the rim
    lay = Matrix.Translation((zc, 0.0, -xback)) @ Matrix.Rotation(math.radians(-90), 4, "Y")
    for o in [tub, lid] + list(tub.children):
        o.data.transform(lay)
        o.data.update()
    rim_z = X_CUT - xback
    rx0, rx1 = zc - rz1, zc - rz0
    # flip the lid over its hinge on the lid side and let it down onto the duvet
    yh = ry1 if lid_side > 0 else ry0
    flip = Matrix.Translation((0, yh, rim_z)) @ Matrix.Rotation(math.pi, 4, "X") @ Matrix.Translation((0, -yh, -rim_z))
    lid.data.transform(flip)
    lco = verts_np(lid.data)
    drop = lco[:, 2].min()
    lid.data.transform(Matrix.Translation((0, 0, -drop)))
    lid.data.update()
    lid_rim = rim_z - drop
    # thickness at the cut edges, inward
    for o in (tub, lid):
        so = o.modifiers.new("wall", "SOLIDIFY")
        so.thickness, so.offset, so.use_even_offset = 0.005, -1.0, False
    parts = [tub, lid]
    inset = 0.011
    rect_t = (rx0 + inset, rx1 - inset, ry0 + inset, ry1 - inset)
    parts.append(tray("case_tub_lining", rect_t, 0.03, rim_z - 0.003, 0.045, M["lining"]))
    # the zip round the tub's rim and round the lid's rim
    for nm, rz, ys in (("case_zip_tub", rim_z - 0.002, (ry0, ry1)), ("case_zip_lid", lid_rim - 0.002, None)):
        if ys is None:
            y0, y1 = (2 * yh - ry1, 2 * yh - ry0)
            y0, y1 = min(y0, y1), max(y0, y1)
        else:
            y0, y1 = ys
        pts = rounded_rect(rx0 + 0.004, rx1 - 0.004, y0 + 0.004, y1 - 0.004, 0.05)
        parts.append(st.tube(nm, [(x, y, rz) for x, y in pts], 0.0045, M["zip"], res=2, closed=True))
    # the lid: lining tray and the mesh divider panel with a zip along its edge
    ly0, ly1 = min(2 * yh - ry1, 2 * yh - ry0), max(2 * yh - ry1, 2 * yh - ry0)
    rect_l = (rx0 + inset, rx1 - inset, ly0 + inset, ly1 - inset)
    parts.append(tray("case_lid_lining", rect_l, 0.022, lid_rim - 0.003, 0.045, M["lining"]))
    panel = st.box("case_lid_mesh", (rect_l[1] - rect_l[0] - 0.02, rect_l[3] - rect_l[2] - 0.02, 0.004),
                   ((rect_l[0] + rect_l[1]) / 2, (rect_l[2] + rect_l[3]) / 2, lid_rim - 0.03), M["lining_mesh"],
                   bevel=0.0015)
    parts.append(panel)
    zy = rect_l[2] + 0.03 if lid_side > 0 else rect_l[3] - 0.03
    parts.append(st.tube("case_lid_meshzip", [(rect_l[0] + 0.03, zy, lid_rim - 0.027), (rect_l[1] - 0.03, zy,
                                                                                         lid_rim - 0.027)],
                         0.004, M["zip"], res=2))
    parts.append(st.box("case_lid_pull", (0.03, 0.012, 0.004), (rect_l[1] - 0.05, zy, lid_rim - 0.022), M["buckle"],
                        bevel=0.0015))
    # the gusset between the halves along the hinge (the case's own charcoal fabric)
    gus_m = mt.woven("case gusset", (0.022, 0.024, 0.027), 900.0, 0.35, 0.8, 0.05)
    gy = yh + lid_side * 0.006
    g = bpy.data.meshes.new("case_gusset")
    bm = bmesh.new()
    rows = []
    for k in range(7):
        t = k / 6
        z = rim_z + (lid_rim - rim_z) * t
        y = gy + lid_side * 0.022 * math.sin(math.pi * t)
        rows.append([bm.verts.new((x, y, z)) for x in (rx0 + 0.05, rx1 - 0.05)])
    for a, b in zip(rows[:-1], rows[1:]):
        bm.faces.new((a[0], a[1], b[1], b[0]))
    bm.to_mesh(g)
    bm.free()
    gob = _link(bpy.data.objects.new("case_gusset", g))
    gob.data.materials.append(gus_m)
    gob.modifiers.new("thick", "SOLIDIFY").thickness = 0.004
    parts.append(gob)
    # what she packed: folded clothes in two stacks, a rolled scarf, a tissue-wrapped parcel, a toiletry pouch
    fx0, fx1, fy0, fy1 = rect_t
    zf = 0.033
    cl = {
        "navy": mt.woven("navy knit", (0.03, 0.035, 0.06), 300.0, 0.6, 0.92, 0.1),
        "grey": mt.woven("grey jersey", (0.16, 0.16, 0.165), 900.0, 0.3, 0.9, 0.1),
        "cream": mt.woven("cream blouse", (0.42, 0.40, 0.36), 1200.0, 0.2, 0.75, 0.15),
        "black": mt.woven("black trousers", (0.02, 0.02, 0.022), 800.0, 0.3, 0.85, 0.05),
        "scarf": mt.woven("teal scarf", (0.04, 0.08, 0.085), 700.0, 0.4, 0.9, 0.15),
        "pouch": mt.woven("pouch nylon", (0.05, 0.05, 0.055), 1000.0, 0.25, 0.55, 0.0),
    }
    w2 = (fx1 - fx0 - 0.03) / 2
    hy = fy1 - fy0 - 0.02
    stacks = [((fx0 + 0.01 + w2 / 2, (fy0 + fy1) / 2), [("black", 0.045), ("grey", 0.04), ("navy", 0.05)]),
              ((fx1 - 0.01 - w2 / 2, (fy0 + fy1) / 2 + 0.02), [("cream", 0.035), ("navy", 0.045)])]
    k = 0
    for (sx, sy), layers in stacks:
        z = zf
        for i, (c, th) in enumerate(layers):
            ww = w2 - 0.012 * i
            parts.append(slab(f"case_fold{k}", (ww, hy - 0.06 - 0.015 * i, th), (sx + 0.006 * (i % 2), sy - 0.03, z + th / 2),
                              cl[c], rot=math.radians(2.5 * (1 - 2 * (i % 2))), sag=0.006, seed=k))
            z += th * 0.92
            k += 1
    # the rolled scarf across the near end, the pouch tucked at the far corner
    parts.append(st.cyl("case_scarf", 0.033, hy - 0.08, (fx1 - 0.05, fy1 - 0.03 - (hy - 0.08) / 2 + 0.01, zf + 0.12),
                        cl["scarf"], rot=(math.radians(90), 0, 0), verts=24, bev=0.01))
    parts.append(slab("case_pouch", (0.2, 0.11, 0.07), (fx0 + 0.13, fy0 + 0.075, zf + 0.15), cl["pouch"],
                      rot=math.radians(-6), bevel=0.03))
    parcel = slab("case_parcel", (0.17, 0.12, 0.07), (fx1 - 0.16, (fy0 + fy1) / 2 - 0.03, zf + 0.115), M["tissue"],
                  rot=math.radians(9), bevel=0.012, disp=0.0025)
    parts.append(parcel)
    hd = holder("case", loc, turn_deg, parts)
    info = dict(rim_z=rim_z, lid_rim=lid_rim, rect=(rx0, rx1, ry0, ry1), lid_rect=rect_l, yh=yh)
    print(f"PROPS case: rim {rim_z:.3f} lid rim {lid_rim:.3f} rect x {rx0:.3f}..{rx1:.3f} y {ry0:.3f}..{ry1:.3f}",
          flush=True)
    return hd, info


# ---------------------------------------------------------------- the extra bag, eased open

def extra_bag(loc, turn_deg, duvet):
    """The open duffel. File frame: long along X, the zip mouth a slot along the top's +Y edge (x -0.16..0.13), the
    carry straps flopped out on the +Y side. The near (+Y) lip is pushed out and down so the mouth gapes, the straps
    are drawn in by 40 %, then the straps are laid onto the duvet."""
    ob = load_baked("extra-bag-open")
    me = ob.data
    co = verts_np(me)
    x, y, z = co[:, 0], co[:, 1], co[:, 2]
    wx = smoothstep(-0.26, -0.14, x) * (1 - smoothstep(0.11, 0.23, x))
    lip = wx * smoothstep(-0.02, 0.05, y) * smoothstep(0.07, 0.2, z) * (1 - smoothstep(0.16, 0.3, y))
    co[:, 1] += 0.065 * lip
    co[:, 2] -= 0.05 * lip * smoothstep(0.1, 0.22, z)
    strap = (y > 0.1) & (z < 0.2)
    co[strap, 1] = 0.1 + (y[strap] - 0.1) * 0.6
    set_verts(me, co)
    hd = holder("extra_bag", loc, turn_deg, [ob])
    # sink it a centimetre into the duvet and lay the straps onto the duvet's surface
    bpy.context.view_layer.update()
    mw, mi = ob.matrix_world, ob.matrix_world.inverted()
    dg = bpy.context.evaluated_depsgraph_get()
    tree = BVHTree.FromObject(duvet, dg)
    dmw, dmi = duvet.matrix_world, duvet.matrix_world.inverted()
    co = verts_np(me)
    zmin = co[strap, 2].min() if strap.any() else 0.0
    for i in np.where(strap)[0]:
        p = mw @ Vector(co[i])
        hit, n, _, _ = tree.ray_cast(dmi @ Vector((p.x, p.y, p.z + 1.0)), (dmi.to_3x3() @ Vector((0, 0, -1))).normalized())
        if hit is not None:
            p.z = (dmw @ hit).z + 0.003 + (co[i, 2] - zmin)
            co[i] = mi @ p
    set_verts(me, co)
    print(f"PROPS extra bag: {int(lip.astype(bool).sum())} lip vertices eased, {int(strap.sum())} strap vertices laid",
          flush=True)
    return hd, ob


# ---------------------------------------------------------------- the handbags

def tote_flat(loc, turn_deg, surfaces):
    """The tote on its back, its clean face (file +Y, the face turn 162 shows in the inspection room) up, its top
    toward laid -Y; the handles swung back past the top edge and let down onto the bedspread."""
    ob = load_baked("handbag-tote")
    me = ob.data
    co = verts_np(me)
    zr = 0.256                                     # the body's rim; above it, the two handles
    rim = co[np.abs(co[:, 2] - zr) < 0.01]
    ym = (rim[:, 1].min() + rim[:, 1].max()) / 2
    hnd = co[:, 2] > zr
    d = co[hnd, 2] - zr
    front = co[hnd, 1] > ym                         # the front handle (lies on top of the back one)
    # lay it on its back: file +Y up (Rx +90: y -> z, z -> -y), the back resting at z 0. The handles then reach
    # past the top edge, level, at the height of their attachments
    R = np.array(Matrix.Rotation(math.radians(90), 3, "X"))
    co = co @ R.T
    back = co[~hnd, 2].min()
    co[:, 2] -= back
    body = co[~hnd]
    co[:, 1] -= (body[:, 1].min() + body[:, 1].max()) / 2      # centre the body on the holder
    # each handle falls from its attachment's height to the bedspread over its first 8 cm (the front one comes to
    # rest on the back one); the tube's own section is kept
    hz = co[hnd, 2].copy()
    s = smoothstep(0.0, 0.08, d)
    for sel, rest in ((front, 0.021), (~front, 0.009)):
        near = sel & (d < 0.015)
        h0 = hz[near].mean() if near.any() else hz[sel].mean()
        hz[sel] -= (h0 - rest) * s[sel]
    co[hnd, 2] = hz
    set_verts(me, co)
    hd = holder("tote_flat", loc, turn_deg, [ob])
    return hd, ob


def bag_upright(name, loc, turn_deg):
    ob = load_baked(name)
    return holder(name + "_up", loc, turn_deg, [ob]), ob


def apex(ob):
    """The top of a handbag's strap or handle arch (file frame): mean of the highest vertices."""
    co = verts_np(ob.data)
    top = co[:, 2].max()
    sel = co[co[:, 2] > top - 0.006]
    return Vector(sel.mean(0))


# ---------------------------------------------------------------- tissue

def tissue_sheet(name, loc, rot, w, h, surfaces, seed, folds=26, angle=34, flatten=0.5, keep=0.6, scrunch=1.0):
    ob = crumple(name, w, h, M["tissue"], seed=seed, folds=folds, angle=angle, flatten=flatten, scrunch=scrunch)
    ob.location, ob.rotation_euler = loc, (0, 0, rot)
    if surfaces:
        drape_on(ob, surfaces, keep=keep)
    return ob


def tissue_stack(name, loc, rot, n=5):
    """A small stack of fresh tissue sheets, folded in four, each a little askew."""
    out = []
    for i in range(n):
        out.append(st.box(f"{name}{i}", (0.26, 0.19, 0.0012), (loc[0] + 0.004 * i, loc[1] - 0.003 * i, loc[2] + 0.0013 * i),
                          M["tissue"], rot=(0, 0, rot + math.radians(3 * ((i * 7) % 3 - 1)))))
    return out
