"""The front of the recurring tote at macro scale.

All dimensions are metres in a rigid frame matched to the original bag.
The generated bag still provides the tabletop master and wider coverage.
"""
from bisect import bisect_left
import math

import bpy
import bmesh
from mathutils import Matrix, Vector
from mathutils.geometry import interpolate_bezier

import evidence_table_mats as mt
import props

HALF_WIDTH = 0.150
SEAM_DROP = 0.0064
STITCH_PITCH = 0.00435
STITCH_HALF = 0.00155
SLANT = 0.18
STRAP_X = 0.064
STITCH_CENTRES = [i * STITCH_PITCH for i in range(-34, 35)]


def rim_height(x):
    return 0.2524 + 0.008 * (abs(x) / HALF_WIDTH) ** 1.3


def face_depth(x, z):
    """The front face bows out below the inward slope to the lip."""
    high = max(0.0, z - 0.15)
    low = max(0.0, 0.15 - z)
    centre = 0.094 - 0.656 * high + 0.79 * high**2
    centre += 0.0656 * (low / 0.1) * math.exp(-3.0 * low / 0.1)
    edge = (abs(x) / HALF_WIDTH) ** 1.5
    pull = 0.0012 * math.exp(-((abs(x) - STRAP_X) / 0.018)**2 - ((z - 0.220) / 0.018)**2)
    return centre + 0.014 * edge * min(1.0, max(0.0, (z - 0.189) / 0.061)) + pull + 0.0003


def mesh_part(root, name, rows, material, *, closed=False, caps=False):
    width = len(rows[0])
    count = width if closed else width - 1
    faces = [
        (i * width + j, (i + 1) * width + j, (i + 1) * width + (j + 1) % width, i * width + (j + 1) % width)
        for i in range(len(rows) - 1) for j in range(count)
    ]
    if caps:
        faces.extend((tuple(range(width)), tuple(reversed(range((len(rows) - 1) * width, len(rows) * width)))))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([point for row in rows for point in row], [], faces)
    if caps:
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(mesh)
        bm.free()
    mesh.update()
    mesh.materials.append(material)
    for face in mesh.polygons:
        face.use_smooth = len(face.vertices) == 4
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = root
    ob.hide_render = True
    return ob


def thread_curve(root, name, paths, material, radius, *, cyclic=False):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions, data.bevel_depth, data.bevel_resolution = "3D", radius, 3
    data.use_fill_caps = not cyclic
    data.materials.append(material)
    for points, widths in paths:
        spline = data.splines.new("POLY")
        spline.points.add(len(points) - 1)
        spline.use_cyclic_u = cyclic
        for control, pos, width in zip(spline.points, points, widths):
            control.co = (*pos, 1.0)
            control.radius = width
    ob = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = root
    ob.hide_render = True
    return ob


def panel(root, material, back=False):
    hole_radius = 0.00031
    ends = [(centre + end, end * SLANT) for centre in STITCH_CENTRES for end in (-STITCH_HALF, STITCH_HALF)]
    hole_x = [x for x, _ in ends]
    knots = [-HALF_WIDTH + i * (2 * HALF_WIDTH / 96) for i in range(97)]
    if not back:
        knots += [x + step * hole_radius for x in hole_x for step in (-1, -0.5, 0.0, 0.5, 1)]
    knots = sorted(set(round(x, 7) for x in knots))
    # Additional rows through the seam resolve the rim and each punched dimple.
    drops = [0.013 + i * 0.232 / 43 for i in range(44)] + [0.0, 0.002, 0.010]
    if not back:
        drops += [SEAM_DROP - (end * STITCH_HALF * SLANT + step * hole_radius)
                  for end in (-1, 1) for step in (-1, -0.5, 0.0, 0.5, 1)]
    rows = []
    for drop in sorted(set(drops), reverse=True):
        row = []
        for x in knots:
            z = rim_height(x) - drop - (0.005 if back else 0.0)
            depth = face_depth(x, z)
            if back:
                row.append((x, -0.85 * depth, z))
                continue
            j = bisect_left(hole_x, x)
            dimple = 0.0
            for bx, dz in ends[max(0, j - 1):j + 1]:
                r2 = ((x - bx) / hole_radius)**2 + ((SEAM_DROP - drop - dz) / hole_radius)**2
                if r2 < 1:
                    dimple = max(dimple, 0.00025 * (1 - r2)**2)
            row.append((x, depth - dimple, z))
        rows.append(list(reversed(row)) if back else row)
    ob = mesh_part(root, "macro rear leather" if back else "macro front leather", rows, material)
    thickness = ob.modifiers.new("Leather thickness", "SOLIDIFY")
    thickness.thickness = 0.0025
    return ob


def lips(root, outer, lining, back=False):
    radius = 0.004
    rows = []
    for i in range(97):
        x = -HALF_WIDTH + i * (2 * HALF_WIDTH / 96)
        z = rim_height(x) - (0.005 if back else 0.0)
        y, sign = (0.85 * face_depth(x, z), -1) if back else (face_depth(x, z), 1)
        arc = [(x, sign * (y - radius + radius * math.cos(t * math.pi / 12)), z + radius * math.sin(t * math.pi / 12))
               for t in range(13)]
        rows.append(arc if back else list(reversed(arc)))
    rim = mesh_part(root, "macro rear rolled lip" if back else "macro front rolled lip", rows, outer)
    inner = mesh_part(root, "macro rear lining" if back else "macro front lining",
                      [[row[-1] if back else row[0] for row in rows],
                       [(x, sign * (0.075 if back else 0.091), 0.015) for x, _, _ in (row[0] for row in rows)]],
                      lining)
    return rim, inner


def gusset(root, side, material):
    rows = []
    for i in range(33):
        z = rim_height(HALF_WIDTH) * i / 32
        y = face_depth(HALF_WIDTH, z)
        falloff = max(0.0, 1.0 - z / 0.27)
        row = []
        for j in range(21):
            t = j / 20
            x = side * (HALF_WIDTH + 0.024 * falloff * math.sin(math.pi * t))
            row.append((x, y * (1 - 1.85 * t), z - 0.005 * t * (i / 32)))
        rows.append(row if side > 0 else list(reversed(row)))
    return mesh_part(root, "macro side gusset", rows, material)


def hem_thread(root, material):
    paths = []
    for centre in STITCH_CENTRES:
        pts = []
        for i in range(5):
            dx = STITCH_HALF * (i - 2) / 2
            x = centre + dx
            z = rim_height(x) - SEAM_DROP + dx * SLANT
            # The crown clears the face by less than the thickness of the yarn.
            y = face_depth(x, z) - 0.00030 + 0.00025 * (1.0 - (dx / STITCH_HALF)**2)
            pts.append((x, y, z))
        paths.append((pts, (0.52, 0.83, 1.0, 0.83, 0.52)))
    return thread_curve(root, "macro saddle stitch", paths, material, 0.000245)


def tab(root, x, mats):
    y_top = 0.052
    top = 0.2405
    outline = [(-0.0165, -0.036), (0.0, -0.044), (0.0165, -0.036), (0.015, -0.007), (0.008, 0.0),
               (-0.008, 0.0), (-0.015, -0.007)]
    face = [(x + dx, max(y_top, face_depth(x + dx, top + dz) + 0.0020), top + dz) for dx, dz in outline]
    back = [(px, py - 0.003, pz) for px, py, pz in face]
    ob = mesh_part(root, "macro handle tab", [face, back], mats["tab"], closed=True, caps=True)
    ob.data.materials.append(mats["edge"])
    for face_polygon in ob.data.polygons:
        if len(face_polygon.vertices) == 4:
            face_polygon.material_index = 1
    bevel = ob.modifiers.new("Tab edge bevel", "BEVEL")
    bevel.width, bevel.segments = 0.001, 3
    # Inset saddle stitches follow the shape of the tab and share the hem's yarn.
    path = [Vector((x + dx * 0.79, max(y_top, face_depth(x + dx * 0.79, top + dz * 0.83 - 0.003) + 0.0020),
                    top + dz * 0.83 - 0.003)) for dx, dz in outline]
    bpy.context.view_layer.update()
    surface = props.surface_bvh(ob)
    to_world = root.matrix_world
    to_local = to_world.inverted()
    inward = to_world.to_3x3() @ Vector((0, -1, 0))
    stitches = []
    for a, b in zip(path, path[1:] + path[:1]):
        count = max(1, round((b - a).length / 0.0042))
        for i in range(count):
            points = []
            for t, recess in ((0.14, -0.00020), (0.5, -0.00004), (0.86, -0.00020)):
                p = a.lerp(b, (i + t) / count)
                hit, _, _, _ = surface.ray_cast(to_world @ Vector((p.x, p.y + 0.014, p.z)), inward, 0.030)
                if hit is not None:
                    points.append(to_local @ hit + Vector((0, recess, 0)))
            if len(points) == 3:
                stitches.append((points, (0.5, 1.0, 0.5)))
    yarn = thread_curve(root, "macro tab stitch", stitches, mats["thread"], 0.00023)
    # The flat side of the D is held by the turn at the end of the strap.
    y, z = 0.0567, 0.2404
    ring = [(x - 0.0085, y, z + 0.0042), (x + 0.0085, y, z + 0.0042)]
    ring += [(x + 0.0085 * math.cos(i * math.pi / 16), y + 0.001 * math.sin(i * math.pi / 16),
              z + 0.003 - 0.0105 * math.sin(i * math.pi / 16)) for i in range(17)]
    brass = thread_curve(root, "macro aged brass D ring", [(ring, [1.0] * len(ring))], mats["brass"],
                         0.00155, cyclic=True)
    return ob, yarn, brass


def strap(root, material, back=False):
    side = -1 if back else 1
    arch = [Vector(p) for p in ((-STRAP_X, 0.057 * side, 0.2405), (-STRAP_X, 0.056 * side, 0.255),
           (-0.054, 0.051 * side, 0.295), (-0.039, 0.047 * side, 0.342), (0.0, 0.045 * side, 0.368),
           (0.039, 0.047 * side, 0.342), (0.054, 0.051 * side, 0.295),
           (STRAP_X, 0.056 * side, 0.255), (STRAP_X, 0.057 * side, 0.2405))]
    path = []
    for i, (a, b) in enumerate(zip(arch, arch[1:])):
        a_handle = a + (b - arch[max(i - 1, 0)]) / 6
        b_handle = b - (arch[min(i + 2, len(arch) - 1)] - a) / 6
        path.extend(interpolate_bezier(a, a_handle, b_handle, b, 9)[:-1])
    path.append(arch[-1])
    profile = []
    radius = 0.0014
    for i, (u, v) in enumerate(((0.0062, 0.0006), (-0.0062, 0.0006), (-0.0062, -0.0006), (0.0062, -0.0006))):
        for j in range(4):
            angle = math.pi * (i / 2 + j / 6)
            profile.append((u + radius * math.cos(angle), v + radius * math.sin(angle)))
    rows = []
    for i, point in enumerate(path):
        tangent = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        across = Vector((0, 1, 0)).cross(tangent).normalized()
        depth = tangent.cross(across)
        rows.append([point + across * u + depth * v for u, v in profile])
    return mesh_part(root, "macro rear strap" if back else "macro front strap", rows, material, closed=True, caps=True)


def build(holder):
    root = bpy.data.objects.new("tote macro front", None)
    bpy.context.scene.collection.objects.link(root)
    root.parent = holder
    root.matrix_parent_inverse = holder.matrix_world.inverted()
    root.matrix_basis = Matrix.Translation(holder.matrix_world.translation) @ holder.matrix_world.to_quaternion().to_matrix().to_4x4()
    mats = mt.macro_tote_materials()
    for back in (False, True):
        panel(root, mats["leather"], back)
        lips(root, mats["leather"], mats["lining"], back)
        strap(root, mats["strap"], back)
    for side in (-1, 1):
        gusset(root, side, mats["leather"])
        tab(root, side * STRAP_X, mats)
    hem = hem_thread(root, mats["thread"])
    return root, hem
