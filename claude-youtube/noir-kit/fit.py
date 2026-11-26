"""Fit a real garment (GLB/FBX) onto a rigged mannequin from rigged.py.

The method: import the garment; scale and place it so its collar sits on the mannequin's shoulders; pose the
mannequin's arms along the garment's sleeves (measured from the mesh); bind the garment to the body's surface
(Surface Deform); return the mannequin to the scene pose. From then on the garment follows the body.

    import rigged, fit
    dawn = rigged.figure("Dawn", 1.68, outfit, pose=None)            # rest pose first
    coat = fit.garment(dawn, "assets/outfits/female_overcoat.glb", collar_height=1.43, recolour=(0.13, 0.095, 0.065))
    rigged.pose_figure(dawn, {...})                                            # then any pose; the coat follows
"""
import math
import os

import bpy  # first: bmesh and mathutils only exist once bpy is loaded
from mathutils import Matrix, Vector

import rigged


def _import(path):
    before = set(bpy.data.objects)
    if path.lower().endswith(".fbx"):
        bpy.ops.import_scene.fbx(filepath=path)
    else:
        bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    return new


def _world_verts(objs):
    out = []
    for o in objs:
        mw = o.matrix_world
        out.extend(mw @ v.co for v in o.data.vertices)
    return out


def _bake_transforms(objs):
    """Unparent meshes from importer empties and bake their transforms, so the mesh data is in world metres."""
    for o in objs:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    bpy.context.view_layer.update()
    for o in objs:
        o.data.transform(o.matrix_world)
        o.matrix_world = Matrix.Identity(4)


def garment(holder, path, units=1.0, collar_height=None, recolour=None, decimate_to=None, drop=("Icosphere",),
            part=None, top_at=None, sleeves=True, over=(), keep="all", trim_neck=False, scale_to_body=True, ease=1.07):
    """Fit the garment at `path` onto the mannequin whose holder empty is `holder`. Returns the garment objects."""
    body = bpy.data.objects[holder["body"]]
    new = _import(path)
    meshes = [o for o in new if o.type == "MESH" and not any(o.name.startswith(d) for d in drop)]
    for o in new:  # importer empties, stray armatures and junk meshes go
        if o not in meshes:
            bpy.data.objects.remove(o, do_unlink=True)
    if keep == "fewest":  # a scan shipped at several levels of detail: keep the lightest
        light = min(meshes, key=lambda o: len(o.data.polygons))
        for o in meshes:
            if o is not light:
                bpy.data.objects.remove(o, do_unlink=True)
        meshes = [light]
    _bake_transforms(meshes)
    if part in ("lower", "upper"):  # one half of a two-piece: keep the connected pieces below / above the middle
        _keep_parts(meshes, part)
    if units != 1.0:
        for o in meshes:
            o.data.transform(Matrix.Scale(units, 4))
    if decimate_to:
        tris = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
        if tris > decimate_to:
            for o in meshes:
                d = o.modifiers.new("lighter", "DECIMATE")
                d.ratio = decimate_to / tris
                with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
                    bpy.ops.object.modifier_apply(modifier=d.name)

    bpy.context.view_layer.update()
    if trim_neck:  # a display form's neck standing out of the collar: cut it away (before measuring anything)
        import bmesh
        pts = _world_verts(meshes)
        top = max(p.z for p in pts)
        cx = sum(p.x for p in pts) / len(pts)
        cy = sum(p.y for p in pts) / len(pts)
        for o in meshes:
            bm = bmesh.new()
            bm.from_mesh(o.data)
            gone = [f for f in bm.faces if f.calc_center_median().z > top - 0.075
                    and ((f.calc_center_median().x - cx) ** 2 + (f.calc_center_median().y - cy) ** 2) ** 0.5 < 0.055]
            bmesh.ops.delete(bm, geom=gone, context="FACES")
            bm.to_mesh(o.data)
            bm.free()

    # place: size the garment to the body's torso, centre it on the torso, collar (or waistband) at the right height
    pts = _world_verts(meshes)
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    bb = _body_box(body)
    mid_x = (bb[0].x + bb[1].x) / 2
    target_top = collar_height if collar_height is not None else bb[1].z - (bb[1].z - bb[0].z) * 0.135
    if top_at == "waist":  # trousers: the waistband sits just above the hips
        target_top = bb[0].z + (bb[1].z - bb[0].z) * 0.6
    body_pts = _body_points(body)
    torso = [p for p in body_pts if target_top - 0.3 < p.z < target_top - 0.08 and abs(p.x - mid_x) < 0.17]
    g_mid = (lo.x + hi.x) / 2
    g_torso = [p for p in pts if hi.z - 0.3 < p.z < hi.z - 0.08 and abs(p.x - g_mid) < 0.19]
    if scale_to_body and torso and g_torso:
        bw = _half_width(torso, mid_x)
        gw = _half_width(g_torso, g_mid)
        k = max(0.8, min(1.3, bw * ease / gw))
        piv = Vector((g_mid, sum(p.y for p in g_torso) / len(g_torso), hi.z))
        for o in meshes:
            o.data.transform(Matrix.Translation(piv) @ Matrix.Scale(k, 4) @ Matrix.Translation(-piv))
        pts = _world_verts(meshes)
        lo = Vector([min(p[i] for p in pts) for i in range(3)])
        hi = Vector([max(p[i] for p in pts) for i in range(3)])
        g_mid = (lo.x + hi.x) / 2
        g_torso = [p for p in pts if hi.z - 0.3 < p.z < hi.z - 0.08 and abs(p.x - g_mid) < 0.19]
    tc = _mean(torso)
    gc = _mean(g_torso)
    shift = Vector((tc.x - gc.x, tc.y - gc.y, target_top - hi.z))
    for o in meshes:
        o.data.transform(Matrix.Translation(shift))
    pts = [p + shift for p in pts]

    # pose the arms along the sleeves: the cuff is the sleeve point farthest from the shoulder (any arm angle)
    pose = {}
    half = _half_width([p for p in body_pts if target_top - 0.3 < p.z < target_top - 0.08 and abs(p.x - mid_x) < 0.17], mid_x)
    rig = rigged.rig_of(holder)
    arm = sum(rig.data.bones[b].length for b in ("upper_arm_fk.L", "forearm_fk.L")) * rig.matrix_world.to_scale()[0] * 1.08
    for side, key in (((1, "l_arm"), (-1, "r_arm")) if sleeves else ()):
        sh = rigged.shoulder_world(holder, side)
        # sleeve points: outside the torso, below the shoulder, and within an arm's reach (so a coat's hem is not a cuff)
        sx = [p for p in pts if side * (p.x - mid_x) > half * 0.8 and p.z < sh.z + 0.05 and (p - sh).length < arm]
        if not sx:
            continue
        far = max((p - sh).length for p in sx)
        cuff = _mean([p for p in sx if (p - sh).length > far - 0.03])
        d = (cuff - sh).normalized()
        out = math.degrees(math.atan2(abs(d.x), -d.z))
        fwd = math.degrees(math.atan2(-d.y, -d.z))
        pose[key] = (fwd, out, 4)
    if not sleeves:  # trousers: stand the body's feet in the trouser cuffs
        rig = rigged.rig_of(holder)
        cuffs = [p for p in pts if p.z < lo.z + shift.z + 0.06]
        mid_x = (bb[0].x + bb[1].x) / 2
        gx = [abs(_mean([p for p in cuffs if s_ * (p.x - mid_x) > 0]).x - mid_x) for s_ in (1, -1) if any(s_ * (p.x - mid_x) > 0 for p in cuffs)]
        rigged.pose_figure(holder, {"stance": 0.0})
        fx = [abs((rig.matrix_world @ rig.pose.bones[f"foot_ik.{k}"].head).x - mid_x) for k in ("L", "R")]
        if gx:
            pose["stance"] = sum(fx) / len(fx) - sum(gx) / len(gx)
    rigged.pose_figure(holder, pose)

    # bind each garment piece to an unmasked copy of the body (masking the visible body would break the binding)
    proxy = _proxy(body)
    bpy.context.view_layer.update()
    for o in meshes:
        if recolour is not None:
            for slot in o.material_slots:
                if slot.material and slot.material.use_nodes:
                    b = slot.material.node_tree.nodes.get("Principled BSDF")
                    if b:
                        for inp in ("Base Color", "Alpha"):  # flat colour, and fully opaque (scans often carry alpha)
                            for l in list(b.inputs[inp].links):
                                slot.material.node_tree.links.remove(l)
                        b.inputs["Base Color"].default_value = (*recolour, 1)
                        b.inputs["Alpha"].default_value = 1.0
                        if hasattr(slot.material, "surface_render_method"):
                            slot.material.surface_render_method = "DITHERED"
        sd = o.modifiers.new("fit", "SURFACE_DEFORM")
        sd.target = proxy
        sd.falloff = 4.0
        with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
            bpy.ops.object.surfacedeform_bind(modifier=sd.name)
        bpy.context.view_layer.update()
        if not sd.is_bound:
            print(f"FIT WARNING: {o.name} did not bind to {proxy.name}")
        o.parent = holder
        o.matrix_parent_inverse = holder.matrix_world.inverted()
        o.name = f"{holder.name}_{o.name}"
    hide_covered_skin(body, proxy, meshes)
    for inner in over:  # garments this one is worn over: hide what it covers
        hide_under(inner, meshes)
    for o in meshes:  # name the pieces after the file, so two garments from one file stay apart
        o.name = f"{o.name}_{os.path.splitext(os.path.basename(path))[0][:12]}_{part or 'all'}"
    return meshes


def hide_under(inner, outers, reach=0.05, inside=0.07):
    """Mask the parts of an inner garment that an outer garment covers (same ray test as for skin)."""
    from mathutils.bvhtree import BVHTree
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    trees = [(BVHTree.FromObject(g, dg), g.matrix_world.inverted()) for g in outers]
    e = inner.evaluated_get(dg)
    me = e.to_mesh()
    iw = inner.matrix_world
    nm = iw.to_3x3().inverted().transposed()
    hidden = []
    for v in me.vertices:
        p = iw @ v.co
        n = (nm @ v.normal).normalized()
        for t, mi in trees:
            d = (mi.to_3x3() @ n).normalized()
            if t.ray_cast(mi @ p, d, reach)[0] is not None or t.ray_cast(mi @ p, -d, inside)[0] is not None:
                hidden.append(v.index)
                break
    e.to_mesh_clear()
    vg = inner.vertex_groups.get("covered") or inner.vertex_groups.new(name="covered")
    vg.add(hidden, 1.0, "REPLACE")
    if "hide covered" not in inner.modifiers:
        mk = inner.modifiers.new("hide covered", "MASK")
        mk.vertex_group, mk.invert_vertex_group = "covered", True
    return len(hidden)


def _proxy(body):
    """An invisible copy of the body, sharing its mesh, deformed by the same rig, never masked: garments bind to it."""
    name = f"{body.name}_proxy"
    p = bpy.data.objects.get(name)
    if p:
        return p
    p = body.copy()
    p.name = name
    for c in body.users_collection:
        c.objects.link(p)
    for m in list(p.modifiers):
        if m.type in ("SUBSURF",) or m.name == "hide covered":
            p.modifiers.remove(m)
    for k in ("visible_camera", "visible_shadow", "visible_diffuse", "visible_glossy", "visible_transmission", "visible_volume_scatter"):
        setattr(p, k, False)
    p.modifiers.new("no concave faces", "TRIANGULATE")  # Surface Deform refuses targets with concave polygons
    return p


def _body_points(body):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    e = body.evaluated_get(dg)
    me = e.to_mesh()
    pts = [body.matrix_world @ v.co for v in me.vertices]
    e.to_mesh_clear()
    return pts


def hide_covered_skin(body, proxy, garments, reach=0.05, inside=0.09):
    """Mask the visible body wherever a garment covers it, so nothing pokes through. A vertex is covered when a ray
    cast outward along its normal meets a garment within `reach` metres; openings like collars stay visible. The test
    runs on the proxy with every mask off, so vertex numbers match the mesh; small specks are then cleaned up."""
    from mathutils.bvhtree import BVHTree
    masks = [m for m in proxy.modifiers if m.type == "MASK"]
    for m in masks:
        m.show_viewport = False
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    trees = [(BVHTree.FromObject(g, dg), g.matrix_world.inverted()) for g in garments]
    e = proxy.evaluated_get(dg)
    me = e.to_mesh()
    pw = proxy.matrix_world
    nm = pw.to_3x3().inverted().transposed()
    covered = set()
    for v in me.vertices:
        p = pw @ v.co
        n = (nm @ v.normal).normalized()
        for t, mi in trees:
            d = (mi.to_3x3() @ n).normalized()
            if t.ray_cast(mi @ p, d, reach)[0] is not None or t.ray_cast(mi @ p, -d, inside)[0] is not None:
                covered.add(v.index)       # under the garment, or poking out through it
                break
    e.to_mesh_clear()
    for m in masks:
        m.show_viewport = True
    nb = {}
    for ed in body.data.edges:
        a, b = ed.vertices
        nb.setdefault(a, []).append(b)
        nb.setdefault(b, []).append(a)
    for _ in range(3):  # fill pinholes, drop lonely specks
        add = {i for i, ns in nb.items() if i not in covered and ns and sum(n in covered for n in ns) >= len(ns) - 1}
        drop = {i for i in covered if sum(n in covered for n in nb.get(i, [])) <= 1}
        covered = (covered | add) - drop
    vg = body.vertex_groups.get("covered") or body.vertex_groups.new(name="covered")
    vg.add(list(covered), 1.0, "REPLACE")
    if "hide covered" not in body.modifiers:
        mk = body.modifiers.new("hide covered", "MASK")
        mk.vertex_group, mk.invert_vertex_group = "covered", True
        subs = [i for i, m in enumerate(body.modifiers) if m.type == "SUBSURF"]
        if subs:
            body.modifiers.move(len(body.modifiers) - 1, subs[0])
    return len(covered)


def _keep_parts(meshes, which):
    import bmesh
    zs = [v.co.z for o in meshes for v in o.data.vertices]
    mid = min(zs) + 0.55 * (max(zs) - min(zs))
    for o in meshes:
        bm = bmesh.new()
        bm.from_mesh(o.data)
        seen, parts = set(), []
        for f in bm.faces:
            if f.index in seen:
                continue
            stack, comp = [f], []
            seen.add(f.index)
            while stack:
                g = stack.pop()
                comp.append(g)
                for e in g.edges:
                    for h in e.link_faces:
                        if h.index not in seen:
                            seen.add(h.index)
                            stack.append(h)
            parts.append(comp)
        if len(parts) > 1:
            keep = {f.index for c in parts if (sum(f.calc_center_median().z for f in c) / len(c) < mid) == (which == "lower") for f in c}
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context="FACES")
            bm.to_mesh(o.data)
        bm.free()


def _half_width(ps, mid_x):
    """Half the width of a band of points about mid_x, ignoring the outermost few per cent."""
    d = sorted(abs(p.x - mid_x) for p in ps)
    return d[int(len(d) * 0.95)] if d else 0.15


def _mean(ps):
    s = Vector((0, 0, 0))
    for p in ps:
        s += p
    return s / max(1, len(ps))


def _body_box(body):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    e = body.evaluated_get(dg)
    pts = [body.matrix_world @ Vector(c) for c in e.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])
