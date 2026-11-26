"""Style frame A: "Are these your bags?" An airport secondary-inspection room, 2014.

Brief: a windowless inspection room off the baggage hall. Clinical, cold, airless, quiet dread.
5.6 x 4.8 m, 2.8 m ceiling. One fluorescent panel over the steel bench is on; one at the back is weak.
Two checked bags on the bench (a hard-shell case and a soft leather holdall). Dawn on the near side,
two officers across from her; one points at the bags. Nothing on screen is a real brand or sign.

Dials: density 0.3, tidiness 0.9, wear 0.3, power 0.4, warmth -0.6, look gritty-cinematic.

    <bpy python> sf_airport.py -- out.png [--samples 64] [--res 1920x1080] [--cam high|top]
"""
import math
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "noir-kit"))
import bpy  # first: bmesh and mathutils only exist once bpy is loaded
import bmesh
from mathutils import Matrix, Vector

import mannequin as mq

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
OUT = argv[0]
SAMPLES = int(argv[argv.index("--samples") + 1]) if "--samples" in argv else 64
RES = tuple(int(v) for v in (argv[argv.index("--res") + 1] if "--res" in argv else "1920x1080").split("x"))
CAM = argv[argv.index("--cam") + 1] if "--cam" in argv else "high"

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
C = sc.collection


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


def tiles(scale, c1, c2, mortar_rgb, mortar=0.01, rough_var=True):
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


def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Diagonal((*size, 1)))
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    C.objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    ob.data.materials.append(m)
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments = bevel, 4
        ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
        for p in me.polygons:
            p.use_smooth = True
    return ob


def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=24):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r, depth=depth)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    C.objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    ob.data.materials.append(m)
    return ob


def handle_arc(name, a, b, height, m, r=0.009):
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
    C.objects.link(ob)
    ob.data.materials.append(m)
    return ob


# --- materials --------------------------------------------------------------------------------
M = dict(
    floor=mat("vinyl", (0.2, 0.2, 0.2), 0.3, nodes=tiles(1.6, (0.065, 0.07, 0.07), (0.05, 0.055, 0.055), (0.025, 0.025, 0.025), 0.004)),
    wall=mat("wall paint", (0.11, 0.125, 0.12), 0.85),
    kick=mat("kick strip", (0.05, 0.055, 0.06), 0.5),
    ceiling=mat("ceiling tile", (0.5, 0.5, 0.5), 0.9, nodes=tiles(1.65, (0.2, 0.2, 0.2), (0.19, 0.19, 0.19), (0.08, 0.08, 0.08), 0.012, False)),
    steel=mat("steel", (0.62, 0.63, 0.65), 0.28, 1.0),
    case=mat("hard case", (0.025, 0.03, 0.045), 0.35),
    leather=mat("leather", (0.085, 0.05, 0.03), 0.48),
    rubber=mat("rubber", (0.01, 0.01, 0.01), 0.7),
    tag=mat("tag paper", (0.75, 0.74, 0.68), 0.8),
    tray=mat("tray", (0.12, 0.13, 0.14), 0.5),
    door=mat("door", (0.13, 0.15, 0.17), 0.45, 0.3),
    glass=mat("wired glass", (0.02, 0.025, 0.03), 0.08),
    chair=mat("chair", (0.05, 0.06, 0.07), 0.5),
)
panel_on = bpy.data.materials.new("troffer on")
panel_on.use_nodes = True
em = panel_on.node_tree.nodes.new("ShaderNodeEmission")
em.inputs["Color"].default_value = (0.86, 0.94, 1.0, 1)
em.inputs["Strength"].default_value = 9.0
panel_on.node_tree.links.new(em.outputs[0], panel_on.node_tree.nodes["Material Output"].inputs[0])
panel_on.cycles.emission_sampling = "NONE"

# --- room: 5.6 x 4.8 x 2.8 m ----------------------------------------------------------------------
W, D, H = 5.6, 4.8, 2.8
box("floor", (W, D, 0.02), (0, 0.2, -0.01), M["floor"])
box("ceiling", (W, D, 0.02), (0, 0.2, H + 0.01), M["ceiling"])
box("wall_back", (W, 0.1, H), (0, 0.2 + D / 2 + 0.05, H / 2), M["wall"])
box("wall_left", (0.1, D, H), (-W / 2 - 0.05, 0.2, H / 2), M["wall"])
box("wall_right", (0.1, D, H), (W / 2 + 0.05, 0.2, H / 2), M["wall"])
box("wall_front", (W, 0.1, H), (0, 0.2 - D / 2 - 0.05, H / 2), M["wall"])
for n, s, l in (("kick_back", (W, 0.02, 0.1), (0, 0.2 + D / 2 - 0.01, 0.05)), ("kick_left", (0.02, D, 0.1), (-W / 2 + 0.01, 0.2, 0.05)),
                ("kick_right", (0.02, D, 0.1), (W / 2 - 0.01, 0.2, 0.05))):
    box(n, s, l, M["kick"])
# door in the left wall with a narrow wired-glass light
box("door", (0.05, 0.95, 2.1), (-W / 2 + 0.03, 1.6, 1.05), M["door"])
box("door_glass", (0.06, 0.16, 0.7), (-W / 2 + 0.035, 1.85, 1.45), M["glass"])
cyl("door_handle", 0.012, 0.14, (-W / 2 + 0.08, 1.25, 1.02), M["steel"], rot=(math.pi / 2, 0, 0))
# troffers: the one over the bench is on; the one at the back is weak
for n, loc, strength in (("troffer_bench", (0.0, 0.05, H - 0.005), 1.0), ("troffer_back", (0.0, 2.0, H - 0.005), 0.06)):
    box(n + "_housing", (1.24, 0.64, 0.03), loc, M["steel"])
    p = box(n, (1.18, 0.58, 0.01), (loc[0], loc[1], loc[2] - 0.02), panel_on)
    li = bpy.data.lights.new(n, "AREA")
    li.shape, li.size, li.size_y = "RECTANGLE", 1.18, 0.58
    li.energy, li.color = 480 * strength, (0.86, 0.94, 1.0)
    li.spread = math.radians(75)
    lo = bpy.data.objects.new(n + "_light", li)
    C.objects.link(lo)
    lo.location = (loc[0], loc[1], loc[2] - 0.03)
    if strength < 1:
        p.data.materials[0] = panel_on.copy()
        p.data.materials[0].node_tree.nodes["Emission"].inputs["Strength"].default_value = 9.0 * strength
# a dome camera in the corner
cyl("cctv_base", 0.07, 0.02, (-W / 2 + 0.25, 0.2 + D / 2 - 0.25, H - 0.01), M["door"])
dome = bpy.data.meshes.new("cctv_dome")
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=0.06)
bm.to_mesh(dome)
bm.free()
do = bpy.data.objects.new("cctv_dome", dome)
C.objects.link(do)
do.location = (-W / 2 + 0.25, 0.2 + D / 2 - 0.25, H - 0.03)
do.data.materials.append(M["glass"])

# --- inspection bench -------------------------------------------------------------------------------
TOP = 0.86
box("bench_top", (2.0, 0.8, 0.04), (0, 0, TOP - 0.02), M["steel"], bevel=0.006)
for x in (-0.94, 0.94):
    for y in (-0.34, 0.34):
        box("bench_leg", (0.04, 0.04, TOP - 0.04), (x, y, (TOP - 0.04) / 2), M["steel"])
box("bench_shelf", (1.92, 0.72, 0.02), (0, 0, 0.18), M["steel"])
box("tray", (0.5, 0.36, 0.07), (-0.68, 0.12, TOP + 0.035), M["tray"], bevel=0.01)

# --- the two checked bags ---------------------------------------------------------------------------
case = box("case", (0.72, 0.48, 0.27), (0.18, 0.02, TOP + 0.135), M["case"], bevel=0.035, rot=(0, 0, math.radians(-8)))
for i, dx in enumerate((-0.2, 0.0, 0.2)):  # moulded ridges
    r = box(f"case_ridge{i}", (0.03, 0.44, 0.012), (dx, 0, 0.137), M["case"], bevel=0.005)
    r.parent = case
for y in (-0.17, 0.17):  # wheels on one end
    w = cyl("wheel", 0.03, 0.025, (-0.37, y, -0.1), M["rubber"], rot=(math.pi / 2, 0, 0))
    w.parent = case
hd = handle_arc("case_handle", (0.36, -0.08, 0.0), (0.36, 0.08, 0.0), 0.0, M["rubber"])
hd.parent = case
grip = box("case_grip", (0.025, 0.16, 0.03), (0.375, 0, 0.0), M["rubber"], bevel=0.008)
grip.parent = case
bag = box("holdall", (0.6, 0.32, 0.3), (-0.12, -0.1, TOP + 0.15), M["leather"], bevel=0.12, rot=(0, 0, math.radians(14)))
h1 = handle_arc("holdall_handle", (-0.12, -0.05, 0.13), (0.12, -0.05, 0.13), 0.13, M["leather"], r=0.012)
h1.parent = bag
h2 = handle_arc("holdall_handle2", (-0.12, 0.05, 0.13), (0.12, 0.05, 0.13), 0.12, M["leather"], r=0.012)
h2.parent = bag
zip_ = box("holdall_zip", (0.5, 0.012, 0.004), (0, 0, 0.149), M["steel"])
zip_.parent = bag
# a paper tag hanging from the case handle (the first close-up of the film is this tag)
tg = box("tag", (0.005, 0.05, 0.1), (0.405, 0.02, -0.07), M["tag"], rot=(0, math.radians(8), 0))
tg.parent = case

# a plastic chair against the wall
box("chair_seat", (0.45, 0.45, 0.04), (2.35, -0.9, 0.46), M["chair"], bevel=0.02)
box("chair_back", (0.04, 0.45, 0.42), (2.55, -0.9, 0.7), M["chair"], bevel=0.02)
for dx in (-0.18, 0.18):
    for dy in (-0.18, 0.18):
        box("chair_leg", (0.025, 0.025, 0.45), (2.35 + dx, -0.9 + dy, 0.225), M["steel"])

# --- people ------------------------------------------------------------------------------------------
dawn = mq.build("Dawn", mq.WOMAN, mq.Outfit(top=(0.13, 0.095, 0.065), bottom=(0.04, 0.04, 0.045), coat=True),
                pose={"head_pitch": 0.32, "spine": 0.05, "l_flex": 0.18, "l_elbow": 0.35, "r_flex": 0.12, "r_elbow": 0.3,
                      "l_abd": -0.12, "r_abd": -0.1, "head_tilt": 0.06},
                location=(0.15, -0.82, 0), facing=math.pi + math.radians(6))
uniform = mq.Outfit(top=(0.025, 0.035, 0.06), bottom=(0.02, 0.028, 0.045), cap=True, cap_colour=(0.02, 0.028, 0.045))
off1 = mq.build("OfficerA", mq.MAN, uniform, pose={"r_flex": 0.95, "r_abd": 0.18, "r_elbow": 0.15, "head_pitch": 0.15, "spine": 0.06},
                location=(-0.25, 0.82, 0), facing=math.radians(-12))
off2 = mq.build("OfficerB", mq.MAN, uniform, pose={"head_pitch": 0.08, "head_turn": 0.25, "l_flex": 0.05, "r_flex": 0.05},
                location=(0.95, 1.12, 0), facing=math.radians(22))

# --- atmosphere: a faint haze so the light has a shape -----------------------------------------------
hz = box("haze", (W - 0.02, D - 0.02, H - 0.02), (0, 0.2, H / 2), bpy.data.materials.new("haze"))
hm = hz.data.materials[0]
hm.use_nodes = True
nt = hm.node_tree
nt.nodes.remove(nt.nodes["Principled BSDF"])
pv = nt.nodes.new("ShaderNodeVolumePrincipled")
pv.inputs["Density"].default_value = 0.009
pv.inputs["Color"].default_value = (0.8, 0.86, 0.92, 1)
nt.links.new(pv.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
hz.visible_shadow = False

# --- camera ------------------------------------------------------------------------------------------
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
C.objects.link(cam)
sc.camera = cam
target = bpy.data.objects.new("aim", None)
C.objects.link(target)
if CAM == "top":   # straight down over the bench: the bags between her and them
    cam.location, target.location, cam.data.lens = (0.1, 0.05, H - 0.08), (0.1, 0.06, 0), 14
else:              # high corner, looking down across her shoulder at the bags and the officers
    cam.location, target.location, cam.data.lens = (1.95, -2.05, 2.45), (-0.05, 0.25, 0.75), 24
tt = cam.constraints.new("TRACK_TO")
tt.target, tt.track_axis, tt.up_axis = target, "TRACK_NEGATIVE_Z", "UP_Y"
cam.data.sensor_width = 36
cam.data.dof.use_dof = True
cam.data.dof.focus_object = bpy.data.objects["case"]
cam.data.dof.aperture_fstop = 4.0

# --- render ------------------------------------------------------------------------------------------
w = bpy.data.worlds.new("world")
sc.world = w
w.use_nodes = True
w.node_tree.nodes["Background"].inputs[1].default_value = 0.0
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = SAMPLES
sc.cycles.use_adaptive_sampling = True
sc.cycles.adaptive_threshold = 0.03
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6
sc.cycles.volume_bounces = 0
sc.render.resolution_x, sc.render.resolution_y = RES
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Base Contrast" if "AgX - Base Contrast" in [l.name for l in bpy.types.ColorManagedViewSettings.bl_rna.properties["look"].enum_items] else "None"
sc.view_settings.exposure = -0.2
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = OUT
t0 = time.time()
bpy.ops.render.render(write_still=True)
print(f"RENDER {RES[0]}x{RES[1]} {SAMPLES} samples: {time.time() - t0:.1f} s")
