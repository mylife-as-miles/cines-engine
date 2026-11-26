"""Props generated with Tripo (or any GLB), brought into a scene at their real size and in the film's palette.

    import props
    case = props.load("dawn-suitcase", size=0.66, axis="z", loc=(0.2, 0, 0.86), turn_deg=-8, sat=0.6)

A prop is one GLB in `assets/props/<name>.glb` (outside git; record its source in `assets/README.md`). `load` joins its
meshes under one empty whose origin is the centre of the prop's footprint, at floor level, so `loc` puts it down on a
surface. `size` sets the real length of one axis (metres), because generated models come at an arbitrary scale.
`sat`, `val` and `hue` (0.5 = unchanged) pull the texture towards the film's desaturated look without touching its detail; `rough_add` takes off
the plastic sheen generated textures often have.
"""
import math
import os

import bpy
from mathutils import Vector

PROPS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "props")


def _grade(mat, sat, val, rough_add, hue=0.5):
    """Insert hue/saturation after the base colour, and lift roughness, in a glTF material."""
    if not mat or not mat.use_nodes:
        return
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if not bsdf:
        return
    base = bsdf.inputs["Base Color"]
    if base.is_linked:
        src = base.links[0].from_socket
        hsv = nt.nodes.new("ShaderNodeHueSaturation")
        hsv.inputs["Saturation"].default_value = sat
        hsv.inputs["Value"].default_value = val
        hsv.inputs["Hue"].default_value = hue
        nt.links.new(src, hsv.inputs["Color"])
        nt.links.new(hsv.outputs["Color"], base)
    else:
        import colorsys
        r, g, b, a = base.default_value
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        base.default_value = (*colorsys.hsv_to_rgb(h, s * sat, v * val), a)
    rough = bsdf.inputs["Roughness"]
    if rough_add:
        if rough.is_linked:
            src = rough.links[0].from_socket
            add = nt.nodes.new("ShaderNodeMath")
            add.operation = "ADD"
            add.use_clamp = True
            add.inputs[1].default_value = rough_add
            nt.links.new(src, add.inputs[0])
            nt.links.new(add.outputs[0], rough)
        else:
            rough.default_value = min(1.0, rough.default_value + rough_add)


def load(name, size, axis="z", loc=(0, 0, 0), turn_deg=0.0, sat=0.65, val=1.0, rough_add=0.0, hue=0.5, path=None):
    """Import a prop GLB, size it and put it down. Returns the holder empty (meshes are its children).

    axis: "x", "y" or "z" for the dimension `size` sets, or "long" for the longest horizontal one, which is then
    turned to lie along X (for machines and furniture whose length is known but not their orientation in the file).
    """
    path = path or os.path.join(PROPS, f"{name}.glb")
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    dim = hi - lo
    quarter = axis == "long" and dim.y > dim.x
    span = max(dim.x, dim.y) if axis == "long" else dim["xyz".index(axis)]
    k = size / span
    foot = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    holder = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(holder)
    inner = bpy.data.objects.new(name + "_align", None)
    bpy.context.scene.collection.objects.link(inner)
    inner.parent = holder
    inner.rotation_euler = (0, 0, math.radians(90) if quarter else 0)
    for o in new:
        if o.parent is None:  # roots: move the footprint centre to the origin, then hang under the (turned) inner empty
            o.location = o.location - foot
            o.parent = inner
    if quarter:
        dim = Vector((dim.y, dim.x, dim.z))
    hi, lo = dim, Vector((0, 0, 0))
    holder.scale = (k, k, k)
    holder.location = loc
    holder.rotation_euler = (0, 0, math.radians(turn_deg))
    seen = set()
    for o in meshes:
        for slot in o.material_slots:
            if slot.material and slot.material.name not in seen:
                seen.add(slot.material.name)
                _grade(slot.material, sat, val, rough_add, hue)
    bpy.context.view_layer.update()
    holder["dims"] = [round(v * k, 3) for v in (hi - lo)]
    return holder
