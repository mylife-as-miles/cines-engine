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


def garment(holder, path, units=1.0, collar_height=None, recolour=None, decimate_to=None, drop=("Icosphere",)):
    """Fit the garment at `path` onto the mannequin whose holder empty is `holder`. Returns the garment objects."""
    body = bpy.data.objects[holder["body"]]
    new = _import(path)
    meshes = [o for o in new if o.type == "MESH" and not any(o.name.startswith(d) for d in drop)]
    for o in new:  # importer empties, stray armatures and junk meshes go
        if o not in meshes:
            bpy.data.objects.remove(o, do_unlink=True)
    _bake_transforms(meshes)
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

    # place: centre on the body in X/Y, collar at the body's collar height
    bpy.context.view_layer.update()
    pts = _world_verts(meshes)
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    bb = _body_box(body)
    target_top = collar_height if collar_height is not None else bb[1].z - (bb[1].z - bb[0].z) * 0.135
    shift = Vector(((bb[0].x + bb[1].x) / 2 - (lo.x + hi.x) / 2, (bb[0].y + bb[1].y) / 2 - (lo.y + hi.y) / 2, target_top - hi.z))
    for o in meshes:
        o.data.transform(Matrix.Translation(shift))
    pts = [p + shift for p in pts]

    # pose the arms along the sleeves: cuff centre minus shoulder point, each side
    pose = {}
    for side, key in ((1, "l_arm"), (-1, "r_arm")):
        sx = [p for p in pts if side * (p.x - (bb[0].x + bb[1].x) / 2) > 0]
        if not sx:
            continue
        far = max(side * p.x for p in sx)
        cuff = _mean([p for p in sx if side * p.x > far - 0.05])
        sh = rigged.shoulder_world(holder, side)
        d = (cuff - sh).normalized()
        out = math.degrees(math.atan2(abs(d.x), -d.z))
        fwd = math.degrees(math.atan2(-d.y, -d.z))
        pose[key] = (fwd, out, 4)
    rigged.pose_figure(holder, pose)

    # bind each garment piece to the body's surface as it stands now
    for o in meshes:
        if recolour is not None:
            for slot in o.material_slots:
                if slot.material and slot.material.use_nodes:
                    b = slot.material.node_tree.nodes.get("Principled BSDF")
                    if b:
                        for l in list(b.inputs["Base Color"].links):
                            slot.material.node_tree.links.remove(l)
                        b.inputs["Base Color"].default_value = (*recolour, 1)
        sd = o.modifiers.new("fit", "SURFACE_DEFORM")
        sd.target = body
        sd.falloff = 4.0
        with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
            bpy.ops.object.surfacedeform_bind(modifier=sd.name)
        o.parent = holder
        o.matrix_parent_inverse = holder.matrix_world.inverted()
        o.name = f"{holder.name}_{o.name}"
    hide_covered_skin(body, meshes)
    return meshes


def hide_covered_skin(body, garments, reach=0.05):
    """Mask the body wherever a garment covers it, so nothing pokes through: a body vertex is covered when a ray
    cast outward along its normal meets the garment within `reach` metres (openings like collars stay visible)."""
    from mathutils.bvhtree import BVHTree
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    trees = [BVHTree.FromObject(g, dg) for g in garments]
    mats = [g.matrix_world.inverted() for g in garments]
    eb = body.evaluated_get(dg)
    me = eb.to_mesh()
    bw = body.matrix_world
    nm = bw.to_3x3().inverted().transposed()
    covered = []
    for v in me.vertices:
        p = bw @ v.co
        n = (nm @ v.normal).normalized()
        for t, mi in zip(trees, mats):
            lp, ld = mi @ p, (mi.to_3x3() @ n).normalized()
            hit = t.ray_cast(lp, ld, reach / max(mi.to_scale()[0], 1e-6) if False else reach)
            if hit[0] is not None:
                covered.append(v.index)
                break
    eb.to_mesh_clear()
    vg = body.vertex_groups.get("covered") or body.vertex_groups.new(name="covered")
    vg.add(covered, 1.0, "REPLACE")
    if "hide covered" not in body.modifiers:
        mk = body.modifiers.new("hide covered", "MASK")
        mk.vertex_group, mk.invert_vertex_group = "covered", True
    return len(covered)


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
