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
from bpy_extras.object_utils import world_to_camera_view
import setkit as sk
from mathutils import Vector
from mathutils.bvhtree import BVHTree

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


def _plain_suitcase_side(ob, topstitch=False):
    """Sew an unmarked nylon reinforcement from each side handle to the upper seam.

    The generated case has four bright metal bars above each handle. Both reinforcements follow
    the sidewall in the source GLB's Z-up coordinates and cover the bars from every camera.
    """
    mesh = ob.data
    world = ob.matrix_world
    local = world.inverted()
    coords = [world @ v.co for v in mesh.vertices]
    tree = BVHTree.FromPolygons(coords, [p.vertices[:] for p in mesh.polygons])
    # Recess the metal beneath the stitching so the reinforcement lies flat.
    for vertex, point in zip(mesh.vertices, coords):
        x, y, z = point
        if -0.082 < x < 0.019 and 0.076 < z < 0.184 and abs(y) > 0.271:
            vertex.co = local @ Vector((x, math.copysign(0.271, y), z))
    mesh.update()
    verts, quads = [], []
    stitch_paths = []
    # Each side has its own curvature. Sample the shell just outside the bars and span the
    # hardware, tapering the strip into the upper seam and overlapping its lower handle anchor.
    for side in (-1, 1):
        rails = [[], []]
        for j in range(26):
            t = j / 25
            z = 0.032 + 0.326 * t
            half = 0.054 - 0.018 * max(0.0, (t - 0.75) / 0.25)
            left = tree.ray_cast((-0.10, side * 0.60, z), (0, -side, 0))[0]
            right = tree.ray_cast((0.032, side * 0.60, z), (0, -side, 0))[0]
            if left is None or right is None:
                break
            for i in range(7):
                x = -0.031 + (i / 3 - 1) * half
                u = (x - left.x) / (right.x - left.x)
                y = (1 - u) * left.y + u * right.y
                crown = 1 - ((i - 3) / 3) ** 4
                verts.append(local @ Vector((x, y + side * (0.003 + 0.004 * crown), z)))
                if i and j:
                    k = len(verts) - 1
                    face = (k - 8, k - 1, k, k - 7)
                    quads.append(face if side == 1 else face[::-1])
            if topstitch:
                # Interpolate on the actual face, 4 mm inside each longitudinal edge.
                for rail, a, b in ((rails[0], -7, -6), (rails[1], -1, -2)):
                    edge, neighbour = world @ verts[a], world @ verts[b]
                    point = edge.lerp(neighbour, 0.004 / abs(edge.x - neighbour.x))
                    rail.append(point + Vector((0, side * 0.00055, 0)))
        if topstitch:
            stitch_paths.extend((side, rail) for rail in rails if len(rail) > 1)
    panel = bpy.data.meshes.new("suitcase side webbing")
    panel.from_pydata(verts, [], quads)
    band = bpy.data.objects.new("suitcase handle reinforcement", panel)
    bpy.context.scene.collection.objects.link(band)
    band.parent = ob
    mat = bpy.data.materials.new("charcoal nylon webbing")
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.016, 0.017, 0.019, 1)
    b.inputs["Roughness"].default_value = 0.85
    b.inputs["Specular IOR Level"].default_value = 0.16
    nodes = mat.node_tree.nodes
    weave = nodes.new("ShaderNodeTexNoise")
    weave.inputs["Scale"].default_value = 750
    weave.inputs["Detail"].default_value = 2
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Distance"].default_value = 0.00035
    bump.inputs["Strength"].default_value = 0.13
    mat.node_tree.links.new(nodes.new("ShaderNodeTexCoord").outputs["Object"], weave.inputs["Vector"])
    mat.node_tree.links.new(weave.outputs["Fac"], bump.inputs["Height"])
    mat.node_tree.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    panel.materials.append(mat)
    for face in panel.polygons:
        face.use_smooth = True
    edge = band.modifiers.new("webbing edge", "SOLIDIFY")
    edge.thickness = 0.0016

    if stitch_paths:
        thread = bpy.data.curves.new("side seam thread", "CURVE")
        thread.dimensions, thread.bevel_depth, thread.bevel_resolution = "3D", 0.00062, 2
        thread.use_fill_caps = True
        for side, path in stitch_paths:
            for start, end in zip(path, path[1:]):
                count = max(1, round((end - start).length / 0.0036))
                step = (end - start) / count
                for i in range(count):
                    first = start + step * (i + 0.10)
                    last = start + step * (i + 0.83)
                    high = first.lerp(last, 0.5) + Vector((0, side * 0.0004, 0))
                    stitch = thread.splines.new("POLY")
                    stitch.points.add(2)
                    for pt, co in zip(stitch.points, (first, high, last)):
                        pt.co = (*(local @ co), 1)
        seam = bpy.data.objects.new("suitcase side topstitch", thread)
        bpy.context.scene.collection.objects.link(seam)
        seam.parent = band
        yarn = bpy.data.materials.new("charcoal lockstitch")
        yarn.use_nodes = True
        yarn_bsdf = yarn.node_tree.nodes["Principled BSDF"]
        yarn_bsdf.inputs["Base Color"].default_value = (0.028, 0.028, 0.030, 1)
        yarn_bsdf.inputs["Roughness"].default_value = 0.86
        thread.materials.append(yarn)



def meshes(holder):
    """All mesh parts of a prop, including a reinforcement parented under its shell."""
    return [o for o in (holder, *holder.children_recursive) if o.type == "MESH"]


def surface_bvh(holder):
    """World-space ray surface of the complete evaluated prop."""
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    vertices, polygons = [], []
    for part in meshes(holder):
        ev = part.evaluated_get(dg)
        mesh = ev.to_mesh()
        base = len(vertices)
        vertices.extend(ev.matrix_world @ v.co for v in mesh.vertices)
        polygons.extend([base + i for i in face.vertices] for face in mesh.polygons)
        ev.to_mesh_clear()
    return BVHTree.FromPolygons(vertices, polygons)


def tote_topstitch(holder):
    """The line of saddle stitching just under the front lip, interrupted by the handle tabs."""
    surface = surface_bvh(holder)
    base = holder.matrix_world.translation
    rotation = holder.matrix_world.to_quaternion()
    front = rotation @ Vector((0, 1, 0))
    yarn = bpy.data.curves.new("tote hem stitching", "CURVE")
    yarn.dimensions = "3D"
    yarn.bevel_depth = 0.00032
    yarn.bevel_resolution = 2
    yarn.materials.append(sk.mat("tobacco saddle thread", (0.13, 0.066, 0.024), 0.84))
    for i in range(69):
        centre = (i - 34) * 0.00435
        points = []
        for offset in (-0.00155, 0.0, 0.00155):
            x = centre + offset
            z = 0.246 + 0.008 * (abs(x) / 0.15) ** 1.3
            pos, normal, _, _ = surface.ray_cast(base + rotation @ Vector((x, 0.15, z)), -front)
            # The raised handle tabs cover the hem. Never project thread onto a tab.
            if pos is None or (pos - base).dot(front) > 0.054:
                break
            points.append(pos + normal * (0.00015 if offset == 0 else -0.00010))
        if len(points) == 3:
            stitch = yarn.splines.new("POLY")
            stitch.points.add(2)
            for point, pos, radius in zip(stitch.points, points, (0.5, 1.0, 0.5)):
                point.co = (*pos, 1)
                point.radius = radius
    ob = bpy.data.objects.new("tote front hem", yarn)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = holder
    ob.matrix_parent_inverse = holder.matrix_world.inverted()
    return ob


def tote_seam_paths(hem, blockers, scene, resolution):
    """Project the visible thread left to right, lifting the editorial trace at each handle tab."""
    surfaces = [surface_bvh(obj) for obj in blockers]
    eye = scene.camera.matrix_world.translation
    width, height = resolution
    paths = []
    previous = None
    for spline in reversed(hem.data.splines[:]):
        for control in reversed(spline.points[:]):
            point = hem.matrix_world @ Vector(control.co[:3])
            ray = point - eye
            # Ignore the leather carrying the stitch itself (its surface is within 0.2 mm).
            if any(surface.ray_cast(eye, ray.normalized(), ray.length - 0.0007)[0] is not None
                   for surface in surfaces):
                previous = None
                continue
            if previous is None or (point - previous).length > 0.008:
                paths.append([])
            uv = world_to_camera_view(scene, scene.camera, point)
            paths[-1].append([round(uv.x * width, 3), round((1 - uv.y) * height, 3)])
            previous = point
    return [path for path in paths if len(path) >= 2]


def _retouch_tote_textures(holder, box, dx, feather=8):
    """Paint a small patch of a generated prop's textures over with the same-sized patch dx pixels to its right
    (colour, roughness and normal maps alike), feathered: used to take the tote's oval maker's plate off its front
    (no badges or brands in the film)."""
    import numpy as np
    x0, y0, x1, y1 = box
    done = set()
    for o in [c for c in holder.children_recursive if c.type == "MESH"]:
        for slot in o.material_slots:
            for n in slot.material.node_tree.nodes if slot.material else ():
                if n.type != "TEX_IMAGE" or not n.image or n.image.name in done:
                    continue
                img = n.image
                done.add(img.name)
                W, H = img.size
                a = np.empty(W * H * img.channels, np.float32)
                img.pixels.foreach_get(a)
                a = a.reshape(H, W, img.channels)
                src = a[y0:y1, x0 + dx:x1 + dx].copy()
                ry = np.minimum(np.arange(y1 - y0), np.arange(y1 - y0)[::-1])
                rx = np.minimum(np.arange(x1 - x0), np.arange(x1 - x0)[::-1])
                wgt = np.clip(np.minimum.outer(ry, rx) / feather, 0.0, 1.0)[..., None]
                a[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1.0 - wgt) + src * wgt
                img.pixels.foreach_set(a.ravel())
                img.update()
                print(f"PROP retouched {img.name} ({n.label}) at {box}", flush=True)


def _plain_tote_panel(holder):
    import numpy as np
    # The macro reveals a small piece of hardware in the old donor swatch.
    # This part of the atlas is uninterrupted leather in all three maps.
    _retouch_tote_textures(holder, (446, 177, 566, 284), 342, feather=12)
    mesh = next(o.data for o in holder.children_recursive if o.type == "MESH")
    co = np.empty(len(mesh.vertices) * 3, np.float32)
    mesh.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    y, z = (co[:, 1] + 0.004) / 0.049, (co[:, 2] - 0.136) / 0.031
    radius = np.hypot(y, z)
    # The front panel slopes back toward the lip. Sample only this face of
    # the bag when fitting the curvature of the leather around the old stamp.
    front = np.abs(co[:, 0] - (0.114 - 0.50 * (co[:, 2] - 0.136))) < 0.017
    verts = np.empty(len(mesh.loops), np.int32)
    mesh.loops.foreach_get("vertex_index", verts)
    uv = np.empty((len(verts), 2), np.float32)
    mesh.uv_layers.active.uv.foreach_get("vector", uv.ravel())
    u, v = (uv * 4096).T
    outer = np.zeros(len(co), dtype=bool)
    outer[verts[(u > 410) & (u < 630) & (v > 140) & (v < 350)]] = True
    leather = front & outer
    ring = leather & (radius > 1.0) & (radius < 1.62)
    fit = np.column_stack((np.ones(len(y)), y, z, y * y, z * z, y * z))
    coeff = np.linalg.lstsq(fit[ring], co[ring, 0], rcond=None)[0]
    blend = np.clip((1.37 - radius) / 0.43, 0, 1)
    blend = blend * blend * (3.0 - 2.0 * blend)
    weight = blend * leather
    skin = fit @ coeff
    co[:, 0] += weight * (skin - co[:, 0])
    # Keep the lining inside. Collapsing both skins onto one fitted surface
    # makes their triangles coincide in the macro.
    inner = np.zeros(len(co), dtype=bool)
    inner[verts[(u > 2350) & (u < 2630) & (v > 3800)]] = True
    lining = front & inner
    co[lining, 0] += blend[lining] * np.minimum(skin[lining] - 0.005 - co[lining, 0], 0)
    mesh.vertices.foreach_set("co", co.ravel())
    mesh.update()
    # The GLB also carries a normal field baked from the raised stamp. Blend
    # its corner normals into the fitted surface, preserving the rest of the bag.
    if mesh.has_custom_normals:
        normals = np.empty((len(mesh.loops), 3), np.float32)
        mesh.corner_normals.foreach_get("vector", normals.ravel())
        surface = np.column_stack((np.ones(len(y)), -(coeff[1] + 2 * coeff[3] * y + coeff[5] * z) / 0.049,
                                   -(coeff[2] + 2 * coeff[4] * z + coeff[5] * y) / 0.031))
        surface /= np.linalg.norm(surface, axis=1)[:, None]
        normals += weight[verts, None] * (surface[verts] - normals)
        normals /= np.maximum(np.linalg.norm(normals, axis=1)[:, None], 1e-9)
        mesh.normals_split_custom_set(normals)
    print(f"PROP tote panel: {np.count_nonzero(weight)} vertices from {ring.sum()} leather samples", flush=True)


def remove_tote_plate(holder):
    """Remove the recurring handbag's modelled oval plate and its baked relief in memory."""
    if holder.get("plain_tote_panel"):
        return
    _plain_tote_panel(holder)
    holder["plain_tote_panel"] = True


def load(name, size, axis="z", loc=(0, 0, 0), turn_deg=0.0, sat=0.65, val=1.0, rough_add=0.0, hue=0.5, path=None, *, case_topstitch=False):
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
    if name == "dawn-suitcase" and os.path.abspath(path) == os.path.join(PROPS, "dawn-suitcase.glb"):
        for ob in meshes:
            _plain_suitcase_side(ob, topstitch=case_topstitch)
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
    if name == "handbag-tote" and os.path.abspath(path) == os.path.join(PROPS, "handbag-tote.glb"):
        remove_tote_plate(holder)
    return holder
