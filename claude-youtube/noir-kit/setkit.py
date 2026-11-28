"""Set-building parts shared by every investigative-noir scene: materials, simple solids, haze,
camera and the render settings. Scenes stay short and read like a brief.

    import setkit as sk
    sk.reset()
    steel = sk.mat("steel", (0.62, 0.63, 0.65), 0.28, 1.0)
    sk.box("bench_top", (2.0, 0.8, 0.04), (0, 0, 0.84), steel, bevel=0.006)
    sk.camera((1.95, -2.05, 2.45), (-0.05, 0.25, 0.75), lens=24, focus="case")
    sk.render(out, samples=64, res=(1920, 1080))
"""
import time

import bpy  # first: bmesh and mathutils only exist once bpy is loaded
import bmesh
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def _coll():
    return bpy.context.scene.collection


def mat(name, rgb, rough=0.6, metal=0.0, nodes=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if nodes:
        nodes(m.node_tree, b)
    return m


def emission(name, rgb, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def tiles(scale, c1, c2, mortar_rgb, mortar=0.01, rough_var=True):
    """Square tiles in object space (floors, ceiling grids)."""
    def build(nt, b):
        tc = nt.nodes.new("ShaderNodeTexCoord")
        br = nt.nodes.new("ShaderNodeTexBrick")
        br.offset, br.squash = 0.0, 1.0
        br.inputs["Scale"].default_value = scale
        br.inputs["Mortar Size"].default_value = mortar
        br.inputs["Color1"].default_value = (*c1, 1)
        br.inputs["Color2"].default_value = (*c2, 1)
        br.inputs["Mortar"].default_value = (*mortar_rgb, 1)
        br.inputs["Brick Width"].default_value = 1.0
        br.inputs["Row Height"].default_value = 1.0
        nt.links.new(tc.outputs["Object"], br.inputs["Vector"])
        nt.links.new(br.outputs["Color"], b.inputs["Base Color"])
        if rough_var:
            nz = nt.nodes.new("ShaderNodeTexNoise")
            nz.inputs["Scale"].default_value = 3.0
            mr = nt.nodes.new("ShaderNodeMapRange")
            mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = 0.22, 0.5
            nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
            nt.links.new(nz.outputs["Fac"], mr.inputs["Value"])
            nt.links.new(mr.outputs["Result"], b.inputs["Roughness"])
    return build


def wood(c_light, c_dark, scale=6.0, stretch=12.0):
    """Wood grain along X: stretched noise into a colour ramp."""
    def build(nt, b):
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (1.0, stretch, stretch)
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = scale
        nz.inputs["Detail"].default_value = 8.0
        cr = nt.nodes.new("ShaderNodeValToRGB")
        cr.color_ramp.elements[0].color = (*c_dark, 1)
        cr.color_ramp.elements[1].color = (*c_light, 1)
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
        nt.links.new(nz.outputs["Fac"], cr.inputs["Fac"])
        nt.links.new(cr.outputs["Color"], b.inputs["Base Color"])
    return build


def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Diagonal((*size, 1)))
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    _coll().objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    ob.data.materials.append(m)
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments = bevel, 4
        ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
        for p in me.polygons:
            p.use_smooth = True
    return ob


def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=24, r2=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    _coll().objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    ob.data.materials.append(m)
    return ob


def sphere(name, r, loc, m, segs=24):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=segs // 2, radius=r)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    _coll().objects.link(ob)
    ob.location = loc
    ob.data.materials.append(m)
    return ob


def arc(name, a, b, height, m, r=0.009):
    """A bent tube from a to b (bag handles, cables)."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution = "3D", r, 4
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(2)
    a, b = Vector(a), Vector(b)
    mid = (a + b) / 2 + Vector((0, 0, height))
    for p, co in zip(sp.bezier_points, (a, mid, b)):
        p.co = co
        p.handle_left_type = p.handle_right_type = "AUTO"
    ob = bpy.data.objects.new(name, cu)
    _coll().objects.link(ob)
    ob.data.materials.append(m)
    return ob


def area_light(name, loc, size, energy, colour=(1, 1, 1), spread_deg=180, rot=(0, 0, 0)):
    import math
    li = bpy.data.lights.new(name, "AREA")
    li.shape, li.size, li.size_y = "RECTANGLE", size[0], size[1]
    li.energy, li.color, li.spread = energy, colour, math.radians(spread_deg)
    lo = bpy.data.objects.new(name, li)
    _coll().objects.link(lo)
    lo.location, lo.rotation_euler = loc, rot
    return lo


def haze(size, centre, density, colour=(0.8, 0.86, 0.92)):
    """A homogeneous volume: cheap, gives light a shape. Casts no shadow itself."""
    m = bpy.data.materials.new("haze")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    pv = nt.nodes.new("ShaderNodeVolumePrincipled")
    pv.inputs["Density"].default_value = density
    pv.inputs["Color"].default_value = (*colour, 1)
    nt.links.new(pv.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    ob = box("haze", size, centre, m)
    ob.visible_shadow = False
    return ob


def camera(loc, aim, lens=35, focus=None, fstop=4.0, clip_end=20000.0):
    sc = bpy.context.scene
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    _coll().objects.link(cam)
    sc.camera = cam
    target = bpy.data.objects.new("aim", None)
    _coll().objects.link(target)
    cam.location, target.location, cam.data.lens = loc, aim, lens
    tt = cam.constraints.new("TRACK_TO")
    tt.target, tt.track_axis, tt.up_axis = target, "TRACK_NEGATIVE_Z", "UP_Y"
    cam.data.clip_end = clip_end
    cam.data.sensor_width = 36
    if focus:
        cam.data.dof.use_dof = True
        cam.data.dof.focus_object = bpy.data.objects[focus]
        cam.data.dof.aperture_fstop = fstop
    return cam


def plate_optics(name, scene, resolution):
    """Camera and focus-plane measurements for top-left-origin compositor tracks."""
    camera = scene.camera.evaluated_get(bpy.context.evaluated_depsgraph_get())
    lens = camera.data
    target = lens.dof.focus_object
    focus = -(camera.matrix_world.inverted() @ target.matrix_world.translation).z if target else lens.dof.focus_distance
    return {"camera": name, "resolution": list(resolution), "origin": "top-left pixel edge",
            "depth_axis": "camera forward", "focus_m": round(focus, 6), "fstop": round(lens.dof.aperture_fstop, 3),
            "lens_mm": round(lens.lens, 3), "sensor_mm": round(lens.sensor_width, 3)}


def screen_frame_metadata(name, scene, resolution, screen):
    """Project a rectangular display face modelled in local XY, facing +Z."""
    display = screen.evaluated_get(bpy.context.evaluated_depsgraph_get())
    left, right = sorted({vertex.co.x for vertex in display.data.vertices})
    bottom, top = sorted({vertex.co.y for vertex in display.data.vertices})
    width, height = resolution
    corners, depths, inside = {}, {}, {}
    for label, x, y in (("top_left", left, top), ("top_right", right, top),
                        ("bottom_right", right, bottom), ("bottom_left", left, bottom)):
        point = world_to_camera_view(scene, scene.camera, display.matrix_world @ Vector((x, y, 0)))
        corners[label] = [round(point.x * width, 3), round((1 - point.y) * height, 3)]
        depths[label] = round(point.z, 6)
        inside[label] = point.z > 0 and 0 <= point.x <= 1 and 0 <= point.y <= 1
    return {**plate_optics(name, scene, resolution), "screen": screen.name,
            "corners": corners, "depth_m": depths, "in_frame": inside}


def render(out, samples=64, res=(1920, 1080), exposure=-0.2, world=0.0, noise_threshold=0.03):
    sc = bpy.context.scene
    w = bpy.data.worlds.new("world")
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[1].default_value = world
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    if not 0.0 <= noise_threshold <= 1.0:
        raise ValueError("noise_threshold must be between 0 and 1")
    sc.cycles.adaptive_threshold = noise_threshold
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.cycles.volume_bounces = 0
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.view_settings.view_transform = "AgX"
    looks = [l.identifier for l in bpy.types.ColorManagedViewSettings.bl_rna.properties["look"].enum_items]
    sc.view_settings.look = "AgX - Base Contrast" if "AgX - Base Contrast" in looks else "None"
    sc.view_settings.exposure = exposure
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = out
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"RENDER {res[0]}x{res[1]} {samples} samples: {time.time() - t0:.1f} s")


def args(argv):
    """<script> -- out.png [--samples N] [--res WxH] [--cam name] → dict"""
    a = argv[argv.index("--") + 1:] if "--" in argv else argv[1:]
    get = lambda k, d: a[a.index(k) + 1] if k in a else d
    return dict(out=a[0], samples=int(get("--samples", 64)), res=tuple(int(v) for v in get("--res", "1920x1080").split("x")),
                cam=get("--cam", "high"))
