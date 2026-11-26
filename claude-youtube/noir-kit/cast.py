"""The cast: MakeHuman (MPFB 2, CC0) bodies finished as matte statues, with sculpted hair, on a Rigify rig.

Natural MakeHuman faces, kept sculptural so the picture itself says "reconstruction" (no labels): one matte
stone finish, blank statue eyes in the sockets, hair as a sculpted shape rather than strands. Faces are generic
and never modelled on a real person. Characters are posed through rigged.pose_figure, like every figure in the kit.

    import cast
    dawn = cast.person("Dawn", gender=0.0, height_cm=168, age=0.45, hair="bun")
    rigged.pose_figure(dawn, {"head": (20, 0), ...})

Needs MPFB 2 installed as a Blender extension (bl_ext.user_default.mpfb, from github.com/makehumancommunity/mpfb2)
and the Rigify add-on.
"""
import importlib
import math
import sys

import bpy  # first: bmesh and mathutils only exist once bpy is loaded
import bmesh
from mathutils import Matrix, Vector

STONE = (0.5, 0.5, 0.51)
HAIR = (0.2, 0.2, 0.21)
_ready = False


def _dyn(suffix, key):
    for m in list(sys.modules):
        if m.endswith(suffix):
            return getattr(importlib.import_module(m), key)
    raise ValueError(suffix)


def _setup():
    global _ready, HS, RS, TS, HOP
    if _ready:
        return
    bpy.ops.preferences.addon_enable(module="bl_ext.user_default.mpfb")
    bpy.ops.preferences.addon_enable(module="rigify")
    HS = _dyn("mpfb.services.humanservice", "HumanService")
    RS = _dyn("mpfb.services.rigservice", "RigService")
    TS = _dyn("mpfb.services.targetservice", "TargetService")
    HOP = _dyn("mpfb.entities.objectproperties", "HumanObjectProperties")
    _ready = True


def stone(name, rgb=STONE, rough=0.6, strands=False):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    if strands:  # carved strands: fine waves running from the crown, as a bump only
        tc = nt.nodes.new("ShaderNodeTexCoord")
        wv = nt.nodes.new("ShaderNodeTexWave")
        wv.wave_type, wv.bands_direction = "BANDS", "X"     # lines that run front to back, combed
        wv.inputs["Scale"].default_value = 70.0
        wv.inputs["Distortion"].default_value = 2.5
        wv.inputs["Detail"].default_value = 3.0
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = 0.25
        bp.inputs["Distance"].default_value = 0.002
        nt.links.new(tc.outputs["Object"], wv.inputs["Vector"])
        nt.links.new(wv.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def _group_centre(obj, mesh, group):
    gi = obj.vertex_groups[group].index
    pts = [v.co for v in mesh.vertices if any(g.group == gi and g.weight > 0.5 for g in v.groups)]
    return sum(pts, Vector()) / len(pts), pts


def _head_frame(h):
    """Head centre, radii and joints from the evaluated mesh (helpers included), in the human's local space."""
    mask = h.modifiers.get("Hide helpers")
    if mask:
        mask.show_viewport = False
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = h.evaluated_get(dg).to_mesh()
    base, _ = _group_centre(h, me, "joint-head")
    top, _ = _group_centre(h, me, "joint-head-2")
    eyes = [_group_centre(h, me, f"helper-{s}-eye") for s in ("l", "r")]
    body = h.vertex_groups["body"].index
    band = [v.co.copy() for v in me.vertices if any(g.group == body for g in v.groups) and v.co.z > base.z + 0.02]
    h.evaluated_get(dg).to_mesh_clear()
    if mask:
        mask.show_viewport = True
    lo = Vector([min(c[i] for c in band) for i in range(3)])
    hi = Vector([max(c[i] for c in band) for i in range(3)])
    return dict(base=base, crown=hi.z, lo=lo, hi=hi, eyes=eyes)


def _statue_eyes(h, frame, m):
    out = []
    for i, (c, pts) in enumerate(frame["eyes"]):
        # the eye helper's own points, ignoring strays: keep the cluster around the median point
        med = Vector(sorted(p.x for p in pts)[len(pts) // 2:len(pts) // 2 + 1] + sorted(p.y for p in pts)[len(pts) // 2:len(pts) // 2 + 1]
                     + sorted(p.z for p in pts)[len(pts) // 2:len(pts) // 2 + 1])
        near = [p for p in pts if (p - med).length < 0.03]
        c = sum(near, Vector()) / len(near)
        r = max((p - c).length for p in near) * 0.97
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=16, radius=r, matrix=Matrix.Translation(c))
        me = bpy.data.meshes.new(f"{h.name}_eye{i}")
        bm.to_mesh(me)
        bm.free()
        for p in me.polygons:
            p.use_smooth = True
        eo = bpy.data.objects.new(me.name, me)
        bpy.context.scene.collection.objects.link(eo)
        eo.matrix_world = h.matrix_world.copy()
        eo.data.materials.append(m)
        out.append(eo)
    return out


def _hair(h, frame, style, m):
    """A sculpted hair shape: a shell around the skull, cut at a hairline, hugging the head, with a bun if asked."""
    if not style:
        return []
    lo, hi = frame["lo"], frame["hi"]
    c = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2 + 0.008, (frame["base"].z + frame["crown"]) / 2 + 0.01))
    r = Vector(((hi.x - lo.x) / 2 + 0.014, (hi.y - lo.y) / 2 + 0.016, (frame["crown"] - frame["base"].z) / 2 + 0.018))
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=112, v_segments=64, radius=1.0, matrix=Matrix.Translation(c) @ Matrix.Diagonal((*r, 1)))
    brow = min(e[0].z for e in frame["eyes"]) + 0.03
    ear = frame["base"].z + 0.035                            # just above the ear
    nape = frame["base"].z - (0.012 if style == "short" else 0.03)
    # the hairline as a height for each direction around the head (0 deg = the middle of the forehead)
    line = [(0, brow + 0.052), (28, brow + 0.048), (52, brow + 0.012), (72, ear + 0.012), (98, ear), (122, nape), (180, nape)]

    def hairline(deg):
        for (d0, z0), (d1, z1) in zip(line, line[1:]):
            if deg <= d1:
                t = (deg - d0) / (d1 - d0)
                t = t * t * (3 - 2 * t)
                return z0 + (z1 - z0) * t
        return line[-1][1]
    kill = [f for f in bm.faces
            if f.calc_center_median().z < hairline(abs(math.degrees(math.atan2(f.calc_center_median().x - c.x, -(f.calc_center_median().y - c.y)))))]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    # snap the cut edge onto the hairline curve itself, so the edge is smooth rather than stepped
    edge = [v for v in bm.verts if v.is_boundary]
    for v in edge:
        z = hairline(abs(math.degrees(math.atan2(v.co.x - c.x, -(v.co.y - c.y)))))
        t = max(-0.99, min(0.99, (z - c.z) / r.z))
        sq = math.sqrt(1 - t * t)
        ang = math.atan2((v.co.y - c.y) / r.y, (v.co.x - c.x) / r.x)
        v.co = Vector((c.x + r.x * sq * math.cos(ang), c.y + r.y * sq * math.sin(ang), z))
    ring = {e.other_vert(v) for v in edge for e in v.link_edges} - set(edge)
    bmesh.ops.smooth_vert(bm, verts=list(ring), factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.verts.index_update()
    # volume tapers to nothing at the hairline: weight by edge steps from the open boundary
    bm.verts.ensure_lookup_table()
    dist = {v.index: 0 for v in bm.verts if v.is_boundary}
    front, step = list(dist), 0
    while front:
        step += 1
        nxt = []
        for i in front:
            for e in bm.verts[i].link_edges:
                o = e.other_vert(bm.verts[i]).index
                if o not in dist:
                    dist[o] = step
                    nxt.append(o)
        front = nxt
    me = bpy.data.meshes.new(f"{h.name}_hair")
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    hair = bpy.data.objects.new(me.name, me)
    bpy.context.scene.collection.objects.link(hair)
    hair.matrix_world = h.matrix_world.copy()
    vg = hair.vertex_groups.new(name="volume")
    for i, d in dist.items():
        vg.add([i], min(1.0, (d / 10.0)) ** 0.7, "REPLACE")
    sw = hair.modifiers.new("hug", "SHRINKWRAP")
    sw.target, sw.wrap_method, sw.wrap_mode = h, "NEAREST_SURFACEPOINT", "OUTSIDE_SURFACE"
    sw.offset = 0.0015
    dp = hair.modifiers.new("volume", "DISPLACE")
    dp.direction, dp.mid_level, dp.vertex_group = "NORMAL", 0.0, "volume"
    dp.strength = 0.009 if style == "short" else 0.013
    so = hair.modifiers.new("thickness", "SOLIDIFY")
    so.thickness, so.offset = 0.002, -1.0
    hair.modifiers.new("smooth", "SUBSURF").levels = 2
    hair.data.materials.append(m)
    parts = [hair]
    if style == "bun":  # a low bun at the back of the head
        bc = Vector((c.x, hi.y + 0.03, frame["base"].z + 0.035))
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=20, radius=1.0, matrix=Matrix.Translation(bc) @ Matrix.Diagonal((0.05, 0.04, 0.043, 1)))
        bme = bpy.data.meshes.new(f"{h.name}_bun")
        bm.to_mesh(bme)
        bm.free()
        for p in bme.polygons:
            p.use_smooth = True
        bun = bpy.data.objects.new(bme.name, bme)
        bpy.context.scene.collection.objects.link(bun)
        bun.matrix_world = h.matrix_world.copy()
        bun.data.materials.append(m)
        parts.append(bun)
    return parts


def shoes(holder, rgb=(0.03, 0.03, 0.032), height=0.085):
    """Simple sculpted shoes: the body's own feet below the ankle, thickened outward, following the rig."""
    import bmesh
    body = bpy.data.objects[holder["body"]]
    rig = bpy.data.objects[holder["rig"]]
    me = body.data
    feet = {body.vertex_groups[g].index for g in ("DEF-foot.L", "DEF-foot.R", "DEF-toe.L", "DEF-toe.R") if g in body.vertex_groups}
    keep = set()
    for v in me.vertices:
        if any(g.group in feet and g.weight > 0.2 for g in v.groups):
            keep.add(v.index)
    # the body as shaped (shape keys mixed, no rig, no masks), so the shoes sit on this character's feet
    mods = [(m, m.show_viewport) for m in body.modifiers]
    for m, _ in mods:
        m.show_viewport = False
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    shaped = [v.co.copy() for v in body.evaluated_get(dg).to_mesh().vertices]
    body.evaluated_get(dg).to_mesh_clear()
    for m, vis in mods:
        m.show_viewport = vis
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    for v in bm.verts:
        v.co = shaped[v.index]
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(v.index in keep for v in f.verts)], context="FACES")
    sm = bpy.data.meshes.new(f"{holder.name}_shoes")
    bm.to_mesh(sm)
    bm.free()
    ob = bpy.data.objects.new(sm.name, sm)
    for c in body.users_collection:
        c.objects.link(ob)
    ob.parent, ob.matrix_parent_inverse = body.parent, body.matrix_parent_inverse.copy()
    for g in body.vertex_groups:  # same names, same weights (copied with the mesh): the rig deforms them alike
        if g.name not in ob.vertex_groups:
            ob.vertex_groups.new(name=g.name)
    am = ob.modifiers.new("rig", "ARMATURE")
    am.object = rig
    dp = ob.modifiers.new("thick", "DISPLACE")
    dp.direction, dp.mid_level, dp.strength = "NORMAL", 0.0, 0.006
    so = ob.modifiers.new("sole", "SOLIDIFY")
    so.thickness, so.offset = 0.004, -1.0
    ob.modifiers.new("smooth", "SUBSURF").levels = 1
    for p in sm.polygons:
        p.use_smooth = True
    ob.data.materials.clear()
    ob.data.materials.append(stone(f"shoes_{holder.name}", rgb, 0.35))
    return ob


def blouse_v(holder, rgb=(0.42, 0.41, 0.39), depth=0.26, width=0.13):
    """Inside an open collar, show a blouse: the body's own neck-to-chest front, coloured as fabric and kept visible
    (removed from the hidden-skin group), so the V of a coat is clean instead of a ragged skin edge."""
    body = bpy.data.objects[holder["body"]]
    me = body.data
    gi = body.vertex_groups["joint-neck"].index if "joint-neck" in body.vertex_groups else None
    pts = [v.co for v in me.vertices if gi is not None and any(g.group == gi and g.weight > 0.5 for g in v.groups)]
    neck = sum(pts, Vector()) / len(pts) if pts else Vector((0, 0, max(v.co.z for v in me.vertices) * 0.84))
    m = stone(f"blouse_{holder.name}", rgb, 0.75)
    if m.name not in [x.name for x in me.materials if x]:
        me.materials.append(m)
    mi = [x.name if x else None for x in me.materials].index(m.name)
    keep = set()
    for p in me.polygons:
        c = p.center
        if neck.z - depth < c.z < neck.z - 0.015 and c.y < neck.y and abs(c.x - neck.x) < width:
            p.material_index = mi
            keep.update(p.vertices)
    if "covered" in body.vertex_groups:
        body.vertex_groups["covered"].remove(list(keep))
    return len(keep)


def hat(holder, path, rgb=(0.025, 0.03, 0.045), brim_above_brow=0.03, fit=1.06):
    """Put a hat model on a figure: sized to the head, seated just above the brow, following the head bone."""
    _setup()
    before = set(bpy.data.objects)
    (bpy.ops.import_scene.fbx if path.lower().endswith(".fbx") else bpy.ops.import_scene.gltf)(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    parts = [o for o in new if o.type == "MESH"]
    for o in new:
        if o not in parts:
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.context.view_layer.update()
    for o in parts:
        mw = o.matrix_world.copy()
        o.parent = None
        o.data.transform(mw)
        o.matrix_world = Matrix.Identity(4)
    pts = [v.co for o in parts for v in o.data.vertices]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    body = bpy.data.objects[holder["body"]]
    frame = _head_frame(body)
    head_w = frame["hi"].x - frame["lo"].x
    k = head_w * fit / (hi.x - lo.x)
    brow = min(e[0].z for e in frame["eyes"]) + brim_above_brow
    hc = Vector(((frame["lo"].x + frame["hi"].x) / 2, (frame["lo"].y + frame["hi"].y) / 2 - 0.005, brow))
    m = stone(f"hat_{holder.name}", rgb, 0.55)
    for o in parts:
        o.data.transform(Matrix.Translation(hc) @ Matrix.Scale(k, 4) @ Matrix.Translation(-Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))))
        o.data.materials.clear()
        o.data.materials.append(m)
        o.matrix_world = body.matrix_world.copy()
        o.name = f"{holder.name}_{o.name}"
    _to_bone(parts, bpy.data.objects[holder["rig"]], "DEF-spine.006")
    return parts


def _to_bone(objs, rig, bone):
    bpy.context.view_layer.update()
    for o in objs:
        mw = o.matrix_world.copy()
        o.parent, o.parent_type, o.parent_bone = rig, "BONE", bone
        bpy.context.view_layer.update()
        o.matrix_world = mw


def person(name, gender=0.0, height_cm=170, age=0.5, weight=0.5, muscle=0.5, proportions=0.5, hair="short",
           location=(0, 0, 0), facing_deg=0.0, skin=STONE, hair_tone=HAIR):
    """Build a statue figure; returns its holder empty (keys rig, body, ks), ready for rigged.pose_figure."""
    _setup()
    h = HS.create_human()
    h.name = f"{name}_body"
    # MakeHuman's height macro: 0.5 is the average for the gender; about 0.6 cm per 0.01 near the middle
    avg = 164.5 if gender < 0.5 else 175.0
    vals = dict(gender=gender, age=age, weight=weight, muscle=muscle, proportions=proportions,
                height=max(0.0, min(1.0, 0.5 + (height_cm - avg) / 60.0)))
    for k, v in vals.items():
        HOP.set_value(k, v, entity_reference=h)
    TS.reapply_macro_details(h)
    bpy.context.view_layer.update()
    skin_m = stone(f"stone_{name}", skin)
    h.data.materials.clear()
    h.data.materials.append(skin_m)
    for p in h.data.polygons:
        p.use_smooth = True
    frame = _head_frame(h)
    eyes = _statue_eyes(h, frame, skin_m)
    hair_parts = _hair(h, frame, hair, stone(f"hair_{name}", hair_tone, 0.7, strands=True))

    meta = HS.add_builtin_rig(h, "rigify.human")
    rig = RS.generate_rigify_rig(meta, meta_rig_action="delete")
    rig.name = f"{name}_rig"
    seen = set()
    for md in list(h.modifiers):  # keep one armature modifier per rig
        if md.type == "ARMATURE":
            target = md.object
            if target in seen:
                h.modifiers.remove(md)
            else:
                seen.add(target)
    h.modifiers.new("smooth", "SUBSURF").levels = 1
    _to_bone(eyes + hair_parts, rig, "DEF-spine.006")
    for o in list(bpy.data.objects):  # Rigify's control shapes are for the UI; some sit on the face
        if o.name.startswith("WGT-") and o.parent is None and o.users_collection and o.type == "MESH":
            bpy.data.objects.remove(o, do_unlink=True)

    holder = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(holder)
    rig.parent = holder
    holder["rig"], holder["body"], holder["ks"] = rig.name, h.name, 1.0
    holder["stance"] = 0.02  # MakeHuman stands narrower than the source mannequin
    holder.location = location
    holder.rotation_euler = (0, 0, math.radians(facing_deg))
    bpy.context.view_layer.update()
    return holder
