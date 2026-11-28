"""Shared parts of the three animated calibration shots (A typing, B walk, C corridor).

Each shot module calls a stage builder from scenes/stages (owned by Codex: imported, never edited), then adds its
animation, camera move and final render settings, and saves a self-contained .blend that render.py renders on any
box with only Blender 5.3 (no MPFB, no noir-kit, no repository).

Clock: 96 frames at 24 fps for the shot body plus a 10-frame handle at each end, so the file runs frames 1-116 and
the cut uses 11-106. Everything is a function of the frame number; every random choice is seeded.
"""
import hashlib
import math
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
SCENES = os.path.dirname(HERE)
PROD = os.path.dirname(SCENES)
NOIR = os.path.normpath(os.path.join(PROD, "..", "noir-kit"))
for _p in (NOIR, SCENES, os.path.join(SCENES, "stages"), HERE):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import bpy  # noqa: E402  (first: bmesh and mathutils only exist once bpy is loaded)
from mathutils import Matrix, Vector  # noqa: E402

FPS = 24
BODY = 96
HANDLE = 10
F0 = 1
F1 = F0 + BODY + 2 * HANDLE - 1          # 116
CUT0, CUT1 = F0 + HANDLE, F0 + HANDLE + BODY - 1   # 11..106, the frames the edit uses
FRAMES = list(range(F0, F1 + 1))
OUT = os.path.join(PROD, "out", "anim_tests")
BLENDS = os.path.join(OUT, "blend")


def t_of(frame):
    """Seconds from the first frame of the file (frame 1 = 0 s)."""
    return (frame - F0) / FPS


def smooth(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def smoother(x):
    x = min(1.0, max(0.0, x))
    return x * x * x * (x * (6 * x - 15) + 10)


def cruise(u, ease=0.12):
    """0..1 progress along a move with soft starts and stops but a long constant-speed middle (so the edit can cut
    anywhere in the body without a visible acceleration). `ease` is the fraction of the range spent easing at each
    end. Velocity is continuous; acceleration is piecewise constant."""
    u = min(1.0, max(0.0, u))
    e = ease
    vmax = 1.0 / (1.0 - e)            # area under the trapezoid velocity profile = 1
    if u < e:
        return 0.5 * vmax * u * u / e
    if u > 1 - e:
        v = 1 - u
        return 1.0 - 0.5 * vmax * v * v / e
    return 0.5 * vmax * e + vmax * (u - e)


def stage(name, cast=True):
    """Reset the file and build one of the film's stages exactly as shoot.py does."""
    import importlib
    import setkit as sk
    sk.reset()
    t0 = time.time()
    mod = importlib.import_module(name)
    mod.build(cast=cast)
    print(f"ANIM stage {name} built in {time.time() - t0:.0f} s", flush=True)
    return mod


# ------------------------------------------------------------------ keyframes

_INTERP = {"CONSTANT": 0, "LINEAR": 1, "BEZIER": 2}


def bake(idb, path, frames, values, index=0, interp="LINEAR", group=None):
    """Write one channel as one key per frame, fast (keyframe_points.add + foreach_set). Blender 5 layered actions."""
    ad = idb.animation_data or idb.animation_data_create()
    if ad.action is None:
        ad.action = bpy.data.actions.new(f"{idb.name} motion")
    act = ad.action
    if ad.action_slot is None:
        ad.action_slot = act.slots.new(idb.id_type, idb.name)
    fc = act.fcurve_ensure_for_datablock(idb, path, index=index, group_name=group or "")
    fc.keyframe_points.clear()
    n = len(frames)
    fc.keyframe_points.add(n)
    co = [0.0] * (2 * n)
    co[0::2] = [float(f) for f in frames]
    co[1::2] = [float(v) for v in values]
    fc.keyframe_points.foreach_set("co", co)
    fc.keyframe_points.foreach_set("interpolation", [_INTERP[interp]] * n)
    fc.update()
    return fc


def bake_vector(idb, path, frames, vectors, interp="LINEAR", group=None):
    for i in range(len(vectors[0])):
        bake(idb, path, frames, [v[i] for v in vectors], index=i, interp=interp, group=group)


def bake_object(ob, frames, matrices):
    """Key an object's location and rotation (quaternion, sign-continuous) from world matrices (no parent)."""
    ob.rotation_mode = "QUATERNION"
    locs, quats = [], []
    prev = None
    for m in matrices:
        loc, q, _ = m.decompose()
        if prev is not None and prev.dot(q) < 0:
            q.negate()
        prev = q
        locs.append(tuple(loc))
        quats.append(tuple(q))
    bake_vector(ob, "location", frames, locs)
    bake_vector(ob, "rotation_quaternion", frames, quats)


# ------------------------------------------------------------------ camera

def aim_matrix(loc, aim, roll_deg=0.0):
    loc, aim = Vector(loc), Vector(aim)
    q = (aim - loc).to_track_quat("-Z", "Y")
    m = q.to_matrix().to_4x4()
    if roll_deg:
        m = m @ Matrix.Rotation(math.radians(roll_deg), 4, "Z")
    m.translation = loc
    return m


def moving_camera(name, frames, locs, aims, lens, fstop, focus=None, rolls=None, sensor=36.0, clip=(0.02, 200.0),
                  shift=(0.0, 0.0)):
    """A camera baked one key per frame (location and rotation), so motion blur sees the exact path. `focus` is a
    distance per frame (list), an object name, or None for no depth of field."""
    cam_data = bpy.data.cameras.new(name)
    cam = bpy.data.objects.new(name, cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam_data.lens = lens if not callable(lens) else lens(frames[0])
    cam_data.sensor_width = sensor
    cam_data.sensor_fit = "HORIZONTAL"
    cam_data.clip_start, cam_data.clip_end = clip
    cam_data.shift_x, cam_data.shift_y = shift
    rolls = rolls or [0.0] * len(frames)
    bake_object(cam, frames, [aim_matrix(l, a, r) for l, a, r in zip(locs, aims, rolls)])
    if callable(lens):
        bake(cam_data, "lens", frames, [lens(f) for f in frames])
    if focus is not None:
        cam_data.dof.use_dof = True
        cam_data.dof.aperture_fstop = fstop
        cam_data.dof.aperture_blades = 7
        cam_data.dof.aperture_rotation = math.radians(12)
        if isinstance(focus, str):
            cam_data.dof.focus_object = bpy.data.objects[focus]
        else:
            bake(cam_data, "dof.focus_distance", frames, focus)
    bpy.context.scene.camera = cam
    return cam


def remove_stage_cameras():
    for o in [o for o in bpy.data.objects if o.type == "CAMERA"]:
        bpy.data.objects.remove(o, do_unlink=True)


# ------------------------------------------------------------------ dust

def dust(name, box_min, box_max, count, seed, radius=(0.0004, 0.0011), drift=(0.004, 0.002, -0.006), sway=0.045,
         sway_rate=0.09, colour=(0.5, 0.49, 0.47), density_fn=None):
    """Fine dust: `count` seeded points in a box, each drifting slowly (a constant settle plus a smooth 4D-noise sway
    of about `sway` metres, evolving at `sway_rate` per second). Positions are a pure function of scene time in a
    Geometry Nodes tree, so any frame renders on its own (no particle cache to bake) and motion blur sees the true
    sub-frame motion. Rendered as Cycles point spheres: lit only where the light reaches them.
    `density_fn(p)` (0..1) thins the points where the air should be cleaner."""
    import random
    rng = random.Random(seed)
    lo, hi = Vector(box_min), Vector(box_max)
    pts, radii = [], []
    while len(pts) < count:
        p = Vector((rng.uniform(lo.x, hi.x), rng.uniform(lo.y, hi.y), rng.uniform(lo.z, hi.z)))
        if density_fn is not None and rng.random() > density_fn(p):
            continue
        pts.append(p)
        r = rng.random()
        radii.append(radius[0] + (radius[1] - radius[0]) * r * r)   # mostly fine, a few larger flecks
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in pts], [], [])
    attr = me.attributes.new("dust_radius", "FLOAT", "POINT")
    attr.data.foreach_set("value", radii)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)

    mat = bpy.data.materials.new(name + " motes")
    mat.use_nodes = True
    nt = mat.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*colour, 1)
    b.inputs["Roughness"].default_value = 1.0
    b.inputs["Specular IOR Level"].default_value = 0.0
    tr = nt.nodes.new("ShaderNodeBsdfTranslucent")
    tr.inputs["Color"].default_value = (*colour, 1)
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.inputs[0].default_value = 0.55                      # fibres pass light: back-lit motes glow
    nt.links.new(b.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    mat.cycles.emission_sampling = "NONE"

    ng = bpy.data.node_groups.new(name + " drift", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N = ng.nodes
    L = ng.links
    gi, go = N.new("NodeGroupInput"), N.new("NodeGroupOutput")
    tnode = N.new("GeometryNodeInputSceneTime")
    pos = N.new("GeometryNodeInputPosition")
    # noise sway: 4D noise of the rest position, W = time * rate; centred on zero
    nscale = N.new("ShaderNodeVectorMath")
    nscale.operation = "SCALE"
    nscale.inputs["Scale"].default_value = 1.7
    L.new(pos.outputs[0], nscale.inputs[0])
    wmul = N.new("ShaderNodeMath")
    wmul.operation = "MULTIPLY"
    wmul.inputs[1].default_value = sway_rate
    L.new(tnode.outputs["Seconds"], wmul.inputs[0])
    wadd = N.new("ShaderNodeMath")
    wadd.inputs[1].default_value = seed * 0.371
    L.new(wmul.outputs[0], wadd.inputs[0])
    noise = N.new("ShaderNodeTexNoise")
    noise.noise_dimensions = "4D"
    noise.inputs["Scale"].default_value = 1.0
    noise.inputs["Detail"].default_value = 1.0
    noise.inputs["Roughness"].default_value = 0.4
    L.new(nscale.outputs[0], noise.inputs["Vector"])
    L.new(wadd.outputs[0], noise.inputs["W"])
    centred = N.new("ShaderNodeVectorMath")
    centred.operation = "SUBTRACT"
    centred.inputs[1].default_value = (0.5, 0.5, 0.5)
    L.new(noise.outputs["Color"], centred.inputs[0])
    amp = N.new("ShaderNodeVectorMath")
    amp.operation = "SCALE"
    amp.inputs["Scale"].default_value = sway * 2.0
    L.new(centred.outputs[0], amp.inputs[0])
    # constant settle: drift * seconds
    settle = N.new("ShaderNodeVectorMath")
    settle.operation = "SCALE"
    settle.inputs[0].default_value = drift
    L.new(tnode.outputs["Seconds"], settle.inputs["Scale"])
    off = N.new("ShaderNodeVectorMath")
    off.operation = "ADD"
    L.new(amp.outputs[0], off.inputs[0])
    L.new(settle.outputs[0], off.inputs[1])
    setp = N.new("GeometryNodeSetPosition")
    L.new(gi.outputs[0], setp.inputs["Geometry"])
    L.new(off.outputs[0], setp.inputs["Offset"])
    m2p = N.new("GeometryNodeMeshToPoints")
    rad = N.new("GeometryNodeInputNamedAttribute")
    rad.data_type = "FLOAT"
    rad.inputs["Name"].default_value = "dust_radius"
    L.new(setp.outputs[0], m2p.inputs["Mesh"])
    L.new(rad.outputs["Attribute"], m2p.inputs["Radius"])
    smat = N.new("GeometryNodeSetMaterial")
    smat.inputs["Material"].default_value = mat
    L.new(m2p.outputs[0], smat.inputs["Geometry"])
    L.new(smat.outputs[0], go.inputs[0])
    mod = ob.modifiers.new("drift", "NODES")
    mod.node_group = ng
    ob.visible_shadow = False
    print(f"ANIM dust {name}: {count} motes, seed {seed}", flush=True)
    return ob


def local_haze(name, box_min, box_max, peak, centre, sigma, colour=(0.8, 0.86, 0.92), drift=(0.012, 0.05, 0.008),
               noise_scale=0.9):
    """A denser pocket of haze where a beam should read: density `peak` at `centre`, falling off as a Gaussian of
    width `sigma` (metres, per axis; 0 = no falloff on that axis), modulated by a slow noise that drifts at `drift`
    m/s (keyed per frame), so the pocket has no edge and its texture moves."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    pv = nt.nodes.new("ShaderNodeVolumePrincipled")
    pv.inputs["Color"].default_value = (*colour, 1)
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    acc = None
    for axis, c, s in zip("XYZ", centre, sigma):
        if not s:
            continue
        sub = nt.nodes.new("ShaderNodeMath")
        sub.operation = "SUBTRACT"
        sub.inputs[1].default_value = c
        nt.links.new(sep.outputs[axis], sub.inputs[0])
        div = nt.nodes.new("ShaderNodeMath")
        div.operation = "DIVIDE"
        div.inputs[1].default_value = s
        nt.links.new(sub.outputs[0], div.inputs[0])
        sq = nt.nodes.new("ShaderNodeMath")
        sq.operation = "MULTIPLY"
        nt.links.new(div.outputs[0], sq.inputs[0])
        nt.links.new(div.outputs[0], sq.inputs[1])
        acc = sq if acc is None else _add(nt, acc, sq)
    neg = nt.nodes.new("ShaderNodeMath")
    neg.operation = "MULTIPLY"
    neg.inputs[1].default_value = -1.0
    nt.links.new(acc.outputs[0], neg.inputs[0])
    ex = nt.nodes.new("ShaderNodeMath")
    ex.operation = "EXPONENT"
    nt.links.new(neg.outputs[0], ex.inputs[0])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = noise_scale
    noise.inputs["Detail"].default_value = 2.0
    noise.inputs["Roughness"].default_value = 0.55
    nt.links.new(mp.outputs["Vector"], noise.inputs["Vector"])
    rng = nt.nodes.new("ShaderNodeMapRange")
    rng.inputs["From Min"].default_value, rng.inputs["From Max"].default_value = 0.3, 0.7
    rng.inputs["To Min"].default_value, rng.inputs["To Max"].default_value = 0.45 * peak, 1.55 * peak
    nt.links.new(noise.outputs["Fac"], rng.inputs["Value"])
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    nt.links.new(ex.outputs[0], mul.inputs[0])
    nt.links.new(rng.outputs["Result"], mul.inputs[1])
    nt.links.new(mul.outputs[0], pv.inputs["Density"])
    nt.links.new(pv.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    bake_vector(nt, f'nodes["{mp.name}"].inputs["Location"].default_value', FRAMES,
                [tuple(d * t_of(f) for d in drift) for f in FRAMES])
    import setkit as sk
    lo, hi = Vector(box_min), Vector(box_max)
    ob = sk.box(name, tuple(hi - lo), tuple((lo + hi) / 2), m)
    ob.visible_shadow = False
    ob.cycles.use_motion_blur = False
    return ob


def beam_haze(name, box_min, box_max, origin, target, half_width, peak, edge=0.10, colour=(0.8, 0.86, 0.92),
              drift=(0.0, 0.04, 0.01), noise_scale=1.6):
    """Haze that lives only inside a light's beam: denser air in the cone from `origin` through `target` (half
    width `half_width` at the target, growing linearly with distance), fading to nothing over `edge` metres outside
    it and starting at the target (the window), with a slow drifting texture. The beam then reads as a shaft without
    turning the whole frame milky; whatever blocks the light (bars) still cuts it into slats."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    o, t = Vector(origin), Vector(target)
    d = (t - o).normalized()
    reach = (t - o).length
    V = lambda op: _vm(nt, op)                                   # noqa: E731
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    rel = V("SUBTRACT")
    nt.links.new(geo.outputs["Position"], rel.inputs[0])
    rel.inputs[1].default_value = o
    along = V("DOT_PRODUCT")
    nt.links.new(rel.outputs[0], along.inputs[0])
    along.inputs[1].default_value = d
    proj = V("SCALE")
    proj.inputs[0].default_value = d
    nt.links.new(along.outputs["Value"], proj.inputs["Scale"])
    perp = V("SUBTRACT")
    nt.links.new(rel.outputs[0], perp.inputs[0])
    nt.links.new(proj.outputs[0], perp.inputs[1])
    dist = V("LENGTH")
    nt.links.new(perp.outputs[0], dist.inputs[0])
    lim = _m(nt, "MULTIPLY", along.outputs["Value"], half_width / reach)
    over = _m(nt, "SUBTRACT", dist.outputs["Value"], lim.outputs[0])
    fall = nt.nodes.new("ShaderNodeMapRange")
    fall.interpolation_type = "SMOOTHSTEP"
    fall.inputs["From Min"].default_value, fall.inputs["From Max"].default_value = 0.0, edge
    fall.inputs["To Min"].default_value, fall.inputs["To Max"].default_value = 1.0, 0.0
    nt.links.new(over.outputs[0], fall.inputs["Value"])
    start = nt.nodes.new("ShaderNodeMapRange")
    start.interpolation_type = "SMOOTHSTEP"
    start.inputs["From Min"].default_value, start.inputs["From Max"].default_value = reach - 0.05, reach + 0.10
    start.inputs["To Min"].default_value, start.inputs["To Max"].default_value = 0.0, 1.0
    nt.links.new(along.outputs["Value"], start.inputs["Value"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = noise_scale
    noise.inputs["Detail"].default_value = 2.0
    nt.links.new(mp.outputs["Vector"], noise.inputs["Vector"])
    tex = nt.nodes.new("ShaderNodeMapRange")
    tex.inputs["From Min"].default_value, tex.inputs["From Max"].default_value = 0.3, 0.7
    tex.inputs["To Min"].default_value, tex.inputs["To Max"].default_value = 0.7 * peak, 1.3 * peak
    nt.links.new(noise.outputs["Fac"], tex.inputs["Value"])
    a = _m(nt, "MULTIPLY", fall.outputs["Result"], start.outputs["Result"])
    b = _m(nt, "MULTIPLY", a.outputs[0], tex.outputs["Result"])
    pv = nt.nodes.new("ShaderNodeVolumePrincipled")
    pv.inputs["Color"].default_value = (*colour, 1)
    nt.links.new(b.outputs[0], pv.inputs["Density"])
    nt.links.new(pv.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    bake_vector(nt, f'nodes["{mp.name}"].inputs["Location"].default_value', FRAMES,
                [tuple(v * t_of(f) for v in drift) for f in FRAMES])
    import setkit as sk
    lo, hi = Vector(box_min), Vector(box_max)
    ob = sk.box(name, tuple(hi - lo), tuple((lo + hi) / 2), m)
    ob.visible_shadow = False
    ob.cycles.use_motion_blur = False
    return ob


def _vm(nt, op):
    n = nt.nodes.new("ShaderNodeVectorMath")
    n.operation = op
    return n


def _m(nt, op, a, b):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    nt.links.new(a, n.inputs[0])
    if isinstance(b, (int, float)):
        n.inputs[1].default_value = b
    else:
        nt.links.new(b, n.inputs[1])
    return n


def _add(nt, a, b):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = "ADD"
    nt.links.new(a.outputs[0], n.inputs[0])
    nt.links.new(b.outputs[0], n.inputs[1])
    return n


# ------------------------------------------------------------------ the film's render settings

def film_settings(exposure, samples=128, res=(1920, 1080), noise_threshold=0.03, max_bounces=6):
    """What setkit.render (and so shoot.py) sets for every still of the film, plus the animation settings: Cycles,
    adaptive sampling, the denoiser, AgX with Base Contrast at the stage's exposure, a black world, and motion blur
    with a 180-degree shutter. Frames 1-116 at 24 fps."""
    sc = bpy.context.scene
    w = bpy.data.worlds.new("world")
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.0
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = noise_threshold
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.max_bounces = max_bounces
    sc.cycles.volume_bounces = 0
    sc.cycles.use_animated_seed = True           # fresh noise each frame: the denoiser's residue does not crawl
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = "AgX"
    looks = [l.identifier for l in bpy.types.ColorManagedViewSettings.bl_rna.properties["look"].enum_items]
    sc.view_settings.look = "AgX - Base Contrast" if "AgX - Base Contrast" in looks else "None"
    sc.view_settings.exposure = exposure
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.5          # 180 degrees
    sc.render.motion_blur_position = "CENTER"
    sc.render.fps, sc.render.fps_base = FPS, 1.0
    sc.frame_start, sc.frame_end = F0, F1
    sc.render.use_persistent_data = True         # keep the BVH of the static set between frames
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.image_settings.color_depth = "8"
    sc.render.image_settings.compression = 15
    sc["film_grade"] = "A (scenes/shoot.py GRADE), applied after render"
    sc["cut_frames"] = [CUT0, CUT1]


def volumes_off_blur():
    """Object motion blur on a volume domain only costs time (the skill's rule): turn it off on every haze box."""
    for o in bpy.data.objects:
        if o.type == "MESH" and is_volume_only(o):
            o.cycles.use_motion_blur = False


def is_volume_only(o):
    mats = [s.material for s in o.material_slots if s.material]
    if not mats:
        return False
    for m in mats:
        if not m.use_nodes:
            return False
        out = next((n for n in m.node_tree.nodes if n.type == "OUTPUT_MATERIAL"), None)
        if out is None or out.inputs["Surface"].is_linked or not out.inputs["Volume"].is_linked:
            return False
    return True


# ------------------------------------------------------------------ checks

def _world_bvh(objs, dg):
    from mathutils.bvhtree import BVHTree
    verts, polys = [], []
    for o in objs:
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        base = len(verts)
        mw = ev.matrix_world
        verts.extend(mw @ v.co for v in me.vertices)
        polys.extend([base + i for i in p.vertices] for p in me.polygons)
        ev.to_mesh_clear()
    return BVHTree.FromPolygons(verts, polys, epsilon=0.0) if polys else None


def clearance(group_a, group_b, frames, label):
    """Intersections between two sets of meshes (evaluated, world space) on the given frames: the number of
    overlapping triangle pairs per frame. 0 everywhere means nothing passes through anything."""
    sc = bpy.context.scene
    hits = {}
    for f in frames:
        sc.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        a, b = _world_bvh(group_a, dg), _world_bvh(group_b, dg)
        n = len(a.overlap(b)) if a and b else 0
        if n:
            hits[f] = n
    sc.frame_set(F0)
    print(f"ANIM check {label}: {len(frames)} frames tested, intersecting on {len(hits)}"
          f"{' ' + str(dict(list(hits.items())[:8])) if hits else ''}", flush=True)
    return hits


# ------------------------------------------------------------------ save and fingerprint

def save(path):
    """Save a self-contained, compressed .blend: images read from disk (MakeHuman textures) are packed; images the
    glTF importer already holds in memory are left as they are (re-packing those drops their pixels)."""
    import re
    merged = 0
    for img in list(bpy.data.images):          # props.load re-imports each GLB: merge identical texture copies
        base = re.sub(r"\.\d{3}$", "", img.name)
        if base != img.name and base in bpy.data.images and tuple(bpy.data.images[base].size) == tuple(img.size) \
                and img.packed_file is not None and bpy.data.images[base].packed_file is not None \
                and img.packed_file.size == bpy.data.images[base].packed_file.size:
            img.user_remap(bpy.data.images[base])
            bpy.data.images.remove(img)
            merged += 1
    packed = 0
    for img in bpy.data.images:
        if img.packed_file is None and img.source == "FILE" and img.filepath:
            fp = bpy.path.abspath(img.filepath)
            if os.path.exists(fp):
                img.pack()
                packed += 1
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0      # no .blend1 backups
    bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)
    missing = [i.name for i in bpy.data.images if i.source == "FILE" and i.packed_file is None and i.users]
    print(f"ANIM saved {path} ({os.path.getsize(path) / 1e6:.1f} MB; {packed} images packed, {merged} duplicates "
          f"merged; unpacked file images in use: {missing or 'none'})", flush=True)


def fingerprint(objects, frames=(F0, (F0 + F1) // 2, F1)):
    """A hash of the evaluated world matrices (and pose) of the moving things at a few frames: two builds that print
    the same fingerprint animate identically."""
    sc = bpy.context.scene
    h = hashlib.sha256()
    for f in frames:
        sc.frame_set(f)
        for o in objects:
            for v in o.matrix_world:
                h.update(("%.5f %.5f %.5f %.5f" % tuple(v)).encode())
            if o.type == "ARMATURE":
                for pb in o.pose.bones:
                    for v in pb.matrix:
                        h.update(("%.5f %.5f %.5f %.5f" % tuple(v)).encode())
    sc.frame_set(F0)
    return h.hexdigest()[:16]
