"""Stage: the airport inspection room (Ch 00 the question, Ch 05 the discovery, Ch 11 the return). Fluorescent Noir.

A windowless secondary-inspection room under a low lay-in ceiling: painted block walls with a two-tone dado and
bumper rail, one 2 x 4 troffer burning over a stainless bench, the X-ray scanner against the back wall with its tunnel,
lead curtain and exit conveyor turned to the room, a steel door with a wired-glass vision panel and a line of corridor
light under it. Dawn stands on the near side of the bench; two officers face her across it.

    <bpy python> -I scenes/shoot.py -- inspection_room <cam> out.png [--nocast]

Each camera carries its chapter beat. Before every render the stage sets the bench for that beat (Ch 00: suitcase,
extra bag and tote; Ch 05: the extra bag open and the three handbags out; Ch 11: the two bags alone), stands and poses
the cast for it (gazes and reaches are solved, not guessed), hides the cast for a camera that wants an empty room,
and lets the overhead camera look through the ceiling. It does this by wrapping `setkit.render` for this process only
(shoot.py calls it once per camera), so `--cam all` works too.
Set, materials and the tag: inspection_room_set.py and inspection_room_mats.py; the scanner: inspection_room_xray.py.
The people come from scenes/people.py (the film's shared cast); this stage only finishes, poses and places them.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import cast as castkit  # noqa: E402
import people  # noqa: E402
import props  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import inspection_room_set as st  # noqa: E402
import inspection_room_xray as xr  # noqa: E402

TOP = st.TOP
EXPOSURE = -2.0   # the bench troffer is about two stops hot for the props
WORLD = 0.02      # a breath of ambient so the far walls sit just above the grade's black, not a fill

# Where things stand. The suitcase's front pocket looks along +X in its file and its top carry handle runs along the
# file's Y; turned -75 the pocket faces Dawn. The tote's turn of 162 keeps its dented face from the camera.
# Ch 00 is laid out for the wide and the end-of-bench two-shot together: the case on Dawn's side near the camera
# end, the tote in the middle, the extra bag at the far end on the officers' side.
CASE = (0.60, -0.20, TOP, -75.0)
TOTE00 = (0.12, -0.05, TOP, 162.0)
DUFFEL = (-0.56, 0.18, TOP, 4.0)
LAYOUT = {
    "ch00": {"dawn-suitcase": CASE, "extra-bag-closed": DUFFEL, "handbag-tote": TOTE00},
    "ch05": {"dawn-suitcase": (1.30, -0.22, 0.0, -82.0), "extra-bag-open": (-0.53, 0.02, TOP, 0.0),
             "handbag-tote": (0.06, 0.08, TOP, 92.0), "handbag-satchel": (0.40, -0.07, TOP, 84.0),
             "handbag-shoulder": (0.70, -0.05, TOP, 97.0)},
    "ch11": {"dawn-suitcase": CASE, "extra-bag-closed": DUFFEL},
}
st.GHOST = (TOTE00[0], TOTE00[1], 0.35, 0.16, TOTE00[3])   # the cleaner patch where the tote stood (Ch 11)
PROPS = {  # size, axis, grade
    # The bags' own textures are already dark (surface albedo about 0.03 for both soft bags); what made them read light
    # was the generated plastic specular sheen, so it is cut (FINISH). The black duffel takes the prop table's grade.
    "dawn-suitcase": (0.66, "z", dict(sat=0.6, val=0.9, rough_add=0.15)),
    # (the prop table's val 0.35 still read mid grey on the lit top seen low across the bench: 0.25)
    "extra-bag-closed": (0.75, "long", dict(sat=0.5, val=0.25, rough_add=0.35)),
    "extra-bag-open": (0.75, "long", dict(sat=0.5, val=0.25, rough_add=0.35)),
    # the tote's leather is a red-brown that grades to salmon: turned toward orange (hue +0.045) and lifted, it lands
    # near (0.32, 0.15, 0.06) linear, cognac, the one warm thing in the room
    "handbag-tote": (0.35, "long", dict(sat=1.12, val=0.78, hue=0.52, rough_add=0.2)),
    "handbag-satchel": (0.30, "long", dict(sat=0.8, rough_add=0.12)),
    "handbag-shoulder": (0.32, "long", dict(sat=0.55, val=0.5, rough_add=0.25)),
}
FINISH = {  # specular level and woven face (period m, bump strength) per prop
    "dawn-suitcase": dict(spec=0.2, weave=(0.002, 0.25), ceiling=(0.05, 0.052, 0.058)),
    "extra-bag-closed": dict(spec=0.06),
    "extra-bag-open": dict(spec=0.06),
    "handbag-tote": dict(spec=0.4),
    "handbag-shoulder": dict(spec=0.35),
}
# The scanner: turned so its tunnel, curtain and exit conveyor face the room (-Y), its back to the back wall,
# right of the bench. Housing x 1.04..1.98, y 1.25..2.52; conveyor x 1.19..1.81 running to y 0.21.
SCANNER = (1.60, 1.41, -90.0)

DAWN = (0.10, -0.80)        # across the bench from the officer asking, clear of her case in the two-shot
OFFICER_A = (-0.30, 0.62)   # the one asking, close to the bench
OFFICER_B = (0.15, 1.10)    # the scanner operator, a step back between the bench and his machine
# where the cast stands for each beat when it differs from the above (Ch 05 is later: both officers at the bench, the
# one asking leaning in to lift the tote)
BLOCKING = {"ch05": {"OfficerA": (0.23, 0.535), "OfficerB": (-0.65, 0.66)}}
# what each figure faces (a name or a point) per beat
FACE = {"ch00": {"Dawn": "OfficerA", "OfficerA": "Dawn", "OfficerB": "Dawn"},
        "ch05": {"Dawn": (0.06, 0.08), "OfficerA": (0.23, -0.06), "OfficerB": (0.06, 0.08)}}
# Poses (rigged.pose_figure keys) plus: "look" (a name, a prop or a point: the head is solved onto it), "reach_r" (a
# target the right palm is solved onto), "palm" ("up" / "down": the forearm is rolled so the palm faces that way),
# "behind_l" (the left hand behind the back), "behind" (both).
POSES = {
    "ch00": {
        # Dawn still, weight on one hip, hands loosely closed, answering him: her eyes on his
        "Dawn": {"chest": (2, 2), "l_arm": (5, 7, 14), "r_arm": (3, 6, 9), "fingers": 40, "look": "OfficerA"},
        # the officer asking: eyes on her, his right hand open and palm up just over the extra bag ("this one?"),
        # his left hand behind his back
        "OfficerA": {"chest": (4, 0), "fingers": 24, "look": "Dawn", "reach_r": "duffel_hover", "palm": "up",
                     "behind_l": True},
        "OfficerB": {"chest": (-2, 0), "fingers": 52, "look": "Dawn", "behind": True},
    },
    "ch05": {
        "Dawn": {"chest": (6, 0), "l_arm": (5, 7, 14), "r_arm": (3, 6, 9), "fingers": 40, "look": "handbag-tote"},
        # leaning in, his right hand closing over the tote's handles
        "OfficerA": {"chest": (16, 0), "fingers": 35, "look": "handbag-tote", "reach_r": "tote_handle", "palm": "down",
                     "behind_l": True},
        "OfficerB": {"chest": (6, 0), "fingers": 30, "look": "extra-bag-open", "behind": True},
    },
}

# The tag close-up is defined in the suitcase's own frame (so it follows the case): from the front, about 42 degrees
# down onto the handle, the tag hanging from the grip toward the lens; the front zip and its pulls below the frame.
TAG_CAM_LOCAL = ((0.33, -0.065, 0.79), (0.028, -0.016, 0.53))


def _case_frame(c=CASE):
    return Matrix.Translation(c[:3]) @ Matrix.Rotation(math.radians(c[3]), 4, "Z")


_TL, _TA = (tuple(round(v, 4) for v in _case_frame() @ Vector(p)) for p in TAG_CAM_LOCAL)

FOCUS = {"fx_wide": (0.0, 0.1, 1.2), "fx_two": (-0.12, -0.1, 1.5), "fx_overhead": (0.0, 0.0, 1.0),
         "fx_empty": (TOTE00[0], TOTE00[1], 0.95)}
CAMERAS = {
    # Ch 00: the establishing view, high in the front corner behind Dawn: the door and its corridor light on the
    # left, the bench and the three people in the middle, the scanner with its tunnel and conveyor on the right
    "wide": dict(loc=(2.6, -2.9, 2.35), aim=(0.05, 0.6, 0.7), lens=24, focus="fx_wide", fstop=5.6, beat="ch00",
                 wild=("wall_front", "cove_f", "rail_f")),
    # Ch 05: straight down on the bench through the ceiling, the bags laid out, the three figures round it. The bench
    # reflects the troffer's lens here, not the (much brighter) light that stands in for it
    "overhead": dict(loc=(0.05, -0.15, 5.3), aim=(0.05, -0.146, 0.86), lens=35, focus="fx_overhead", fstop=8.0, beat="ch05",
                     above_ceiling=True, exposure=-3.9, lens_glow=60.0),
    # Ch 00: the tag on the suitcase's handle, from Dawn's side; the officer by the scanner an out-of-focus mass beyond
    "tag": dict(loc=_TL, aim=_TA, lens=50, focus="tag_hole_focus", fstop=2.0, beat="ch00", raking=True, exposure=-3.95),
    # Ch 00: from the end of the bench, a little low: Dawn and the questioning officer face each other over the bags,
    # the door's vision panel behind them and the scanner officer set farther back
    "two_shot": dict(loc=(2.60, 0.14, 1.41), aim=(-0.1, -0.12, 1.37), lens=31, focus="fx_two", fstop=4.0, beat="ch00", cheat={"OfficerB": (-0.02, 0.94)}),
    # Ch 11: the two bags alone on the bench in the empty room, the cleaner steel where the tote stood near the centre
    "empty": dict(loc=(2.5, -2.5, 1.5), aim=(0.25, 0.1, 0.92), lens=24, focus="fx_empty", fstop=4.5, beat="ch11", cast=False,
                  wild=("wall_front", "cove_f", "rail_f")),
}

WILD = ("wall_front", "cove_f", "rail_f")
_STATE = {"props": {}, "cast": [], "holders": {}, "dressing": [], "pose_cache": {}}


# ---------------------------------------------------------------- the cast: finish, place, pose

def place(holder, loc, facing_deg):
    holder.location = loc
    holder.rotation_euler = (0, 0, math.radians(facing_deg))
    bpy.context.view_layer.update()


def facing(p, t):
    """The facing (deg) that turns a figure built facing -Y toward point t."""
    return math.degrees(math.atan2(t[0] - p[0], -(t[1] - p[1])))


def cloth(holder, item, rough=0.8, bump=0.25):
    """A garment finished as plain cloth: its normal map (whose fine stripes shimmer at wide sizes) dropped for a
    woven-noise bump while retaining the shared wardrobe colour."""
    ob = bpy.data.objects.get(f"{holder.name}_{item}")
    if ob is None:
        print(f"INSPECTION no garment {holder.name}_{item}", flush=True)
        return None
    for slot in ob.material_slots:
        m = slot.material
        if not (m and m.use_nodes):
            continue
        nt = m.node_tree
        b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if b is None:
            continue
        for sock in ("Roughness", "Normal"):
            for ln in list(b.inputs[sock].links):
                nt.links.remove(ln)
        b.inputs["Roughness"].default_value = rough
        # matt wool: no sheen and almost no dielectric specular. Under the troffer (a small source of very high
        # radiance, overhead) the grazing specular of rough cloth was as bright as the stone's diffuse, so navy and
        # the dark taupe both read pale grey, like the stone (the "suit reads as skin" note)
        b.inputs["Sheen Weight"].default_value = 0.0
        b.inputs["Specular IOR Level"].default_value = 0.04
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 400.0
        nz.inputs["Detail"].default_value = 2.0
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = bump
        bp.inputs["Distance"].default_value = 0.0004
        nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return ob


def hem_thickness(ob, t=0.006):
    """Give a garment real cloth thickness (outward), so hems, cuffs and the jacket's front edge throw an edge."""
    so = ob.modifiers.new("cloth_thickness", "SOLIDIFY")
    so.thickness, so.offset, so.use_even_offset = t, 1.0, False   # (even offset spikes at the garment's seams)
    so.use_quality_normals = True
    sub = next((i for i, md in enumerate(ob.modifiers) if md.type == "SUBSURF"), None)
    if sub is not None:
        ob.modifiers.move(len(ob.modifiers) - 1, sub)


def hands_stone(holder, value=0.34):
    """The hands a shade darker stone than the face (0.34 against 0.5): under a top light the backs of the hands face
    the troffer and the face does not, so equal albedo reads as white hands. A soft mask from the hand's deform
    weights, so there is no seam at the wrist."""
    body = bpy.data.objects[holder["body"]]
    gi = {g.index for g in body.vertex_groups if any(k in g.name for k in ("hand", "f_", "thumb", "palm"))}
    if not gi:
        return 0
    me = body.data
    attr = me.color_attributes.new("handmask", "FLOAT_COLOR", "POINT")
    n = 0
    for v in me.vertices:
        w = min(1.0, sum(g.weight for g in v.groups if g.group in gi))
        n += w > 0.5
        attr.data[v.index].color = (w, w, w, 1.0)
    m = me.materials[0]
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    at = nt.nodes.new("ShaderNodeAttribute")
    at.attribute_name = "handmask"
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = b.inputs["Base Color"].default_value
    mix.inputs["B"].default_value = (value, value, value * 1.01, 1.0)
    nt.links.new(at.outputs["Fac"], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
    return n


def blouse(holder, suit):
    """Cut a separate, gently draped blouse front from the rigged body's exposed neckline."""
    mat = castkit.stone("inspection blouse", (0.070, 0.060, 0.048), 0.92)
    mat.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.04
    body = bpy.data.objects[holder["body"]]
    castkit.blouse_v(holder, rgb=(0.070, 0.060, 0.048), depth=0.42, width=0.14)
    bpy.context.view_layer.update()
    ev = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    source = ev.to_mesh()
    slot = source.materials.find("blouse_" + holder.name)
    faces = [p.vertices[:] for p in source.polygons if p.material_index == slot]
    indices = sorted({i for face in faces for i in face})
    lookup = {old: new for new, old in enumerate(indices)}
    mesh = bpy.data.meshes.new("blouse front")
    mesh.from_pydata([source.vertices[i].co.copy() for i in indices], [],
                     [[lookup[i] for i in face] for face in faces])
    ev.to_mesh_clear()
    panel = bpy.data.objects.new("Dawn_blouse_front", mesh)
    bpy.context.scene.collection.objects.link(panel)
    panel.matrix_world = body.matrix_world.copy()
    mesh.materials.append(mat)
    for face in mesh.polygons:
        face.use_smooth = True
    smooth = panel.modifiers.new("relax fabric", "LAPLACIANSMOOTH")
    smooth.iterations, smooth.lambda_factor = 15, 0.65
    smooth.use_volume_preserve = False
    shell = panel.modifiers.new("fabric thickness", "SOLIDIFY")
    shell.thickness, shell.offset = 0.002, 1.0
    rig = bpy.data.objects[holder["rig"]]
    castkit._to_bone([panel], rig, "DEF-spine.003")
    # The buttons sit on the actual front face of the jacket before the cast takes its marks.
    tree = st.surface_bvh(suit)
    button_mat = castkit.stone("plain umber button", (0.013, 0.010, 0.009), 0.41)
    buttons = []
    for z in (1.035, 1.115):
        hit, normal, _, _ = tree.ray_cast(Vector((0.006, -0.6, z)), Vector((0, 1, 0)))
        if hit is not None:
            button = sk.cyl("jacket_button", 0.006, 0.0025, hit + normal * 0.0015, button_mat,
                            rot=normal.to_track_quat("Z", "Y").to_euler(), verts=24)
            buttons.append(button)
    castkit._to_bone(buttons, rig, "DEF-spine.002")


def dawn():
    h = people.dawn()
    suit = cloth(h, "female_elegantsuit01", rough=0.92, bump=0.2)
    if suit is not None:
        hem_thickness(suit, 0.008)
        blouse(h, suit)
    bun = bpy.data.objects.get(f"{h['body']}_bun")
    if bun is not None:
        bun.data.transform(Matrix.Translation((0.0, -0.025, -0.02)))
    hands_stone(h, value=0.27)
    return h


def officer(name, variant):
    h = people.officer(name, variant)
    cloth(h, "male_elegantsuit01", rough=0.92, bump=0.25)
    hands_stone(h, value=0.22)
    crown = bpy.data.materials["hat_" + name]
    b = crown.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.009, 0.013, 0.022, 1)
    b.inputs["Specular IOR Level"].default_value = 0.08
    peak = castkit.stone(name + "_cap_peak", (0.008, 0.009, 0.010), 0.35)
    for ob in h.children_recursive:
        if ob.type != "MESH" or ob.data.materials.find(crown.name) < 0:
            continue
        mesh = ob.data
        low = Vector([min(v.co[i] for v in mesh.vertices) for i in range(3)])
        high = Vector([max(v.co[i] for v in mesh.vertices) for i in range(3)])
        centre = (low + high) / 2
        # The source peak faces +X and hangs below the band. Put it over the brow (-Y),
        # lifting its outer lip away from the eyes before seating the crown.
        band_z = low.z + (high.z - low.z) * 0.39
        mesh.materials.append(peak)
        for face in mesh.polygons:
            if face.center.z < band_z:
                face.material_index = len(mesh.materials) - 1
        for v in mesh.vertices:
            x, y, z = v.co.x - centre.x, v.co.y - centre.y, v.co.z - band_z
            if z < 0:
                x -= 0.50 * z
                z *= 0.33
            v.co = (centre.x + 1.18 * y, centre.y - 1.54 * x + 0.009, band_z + z * 1.82 - 0.035)
        mesh.update()
    return h


def ground(holder):
    """Stand a figure on the floor: lift or lower it so its lowest point (the soles) sits at z = 0. Measured on the
    shoes and the body only, after two depsgraph passes (a single pass sometimes read a stale garment)."""
    bpy.context.view_layer.update()
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    lo = 1e9
    for o in [holder] + list(holder.children_recursive):
        if o.type != "MESH" or not (o.name == holder["body"] or "shoes" in o.name):
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = o.matrix_world
        lo = min([lo] + [(mw @ v.co).z for v in me.vertices])
        ev.to_mesh_clear()
    holder.location.z -= lo
    bpy.context.view_layer.update()
    return lo


def _arm_dirs(fwd, out, side):
    """rigged._dir(0, fwd, side, out) for arrays (degrees): armature-space unit vectors."""
    f, o = np.radians(fwd), np.radians(out)
    return np.stack([side * np.cos(f) * np.sin(o), -np.sin(f), -np.cos(f) * np.cos(o)], axis=-1)


def solve_arm(holder, side, target, prefer=(45.0, 10.0, 40.0), fwd=(-20, 100), elbow=(0, 130)):
    """(forward, out, elbow) for pose_figure that puts the palm's centre on `target` (world), for the trunk as it is
    posed now. Analytic forward kinematics of rigged.pose_figure's arm (upper arm, forearm at out * 0.6, hand at
    elbow + 4 and out * 0.4), searched on a grid, with a light pull toward a natural `prefer`."""
    rig = rigged.rig_of(holder)
    k = "L" if side > 0 else "R"
    pb = rig.pose.bones
    S = np.array(pb[f"upper_arm_fk.{k}"].head)
    L1, L2, L3 = (pb[f"{b}.{k}"].length for b in ("upper_arm_fk", "forearm_fk", "hand_fk"))
    T = np.array(rig.matrix_world.inverted() @ Vector(target))
    F, O, E = np.meshgrid(np.arange(fwd[0], fwd[1] + 1, 2.0), np.arange(-30, 51, 2.0), np.arange(elbow[0], elbow[1] + 1, 2.0),
                          indexing="ij")
    palm = S + L1 * _arm_dirs(F, O, side) + L2 * _arm_dirs(F + E, O * 0.6, side) + 0.5 * L3 * _arm_dirs(F + E + 4, O * 0.4, side)
    err = np.linalg.norm(palm - T, axis=-1)
    cost = err + 0.0004 * (np.abs(F - prefer[0]) + np.abs(O - prefer[1]) + 0.5 * np.abs(E - prefer[2]))
    i = np.unravel_index(np.argmin(cost), cost.shape)
    return (float(F[i]), float(O[i]), float(E[i])), float(err[i])


def eye_centre(holder):
    """Between the eyes (world), from the head bone itself: 4 cm up the bone and 7.5 cm out of the face. (Reading the
    statue-eye objects instead proved unreliable here: their bone-parented matrices were sometimes stale when read
    from Python, which sent gazes to the ceiling.)"""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones["head"]
    m = pb.matrix
    p = m.translation + m.to_3x3().col[1].normalized() * 0.04 + m.to_3x3().col[2].normalized() * 0.075
    return rig.matrix_world @ p


def head_forward(holder):
    rig = rigged.rig_of(holder)
    m = rig.pose.bones["head"].matrix.to_3x3()
    return (rig.matrix_world.to_3x3() @ m.col[2]).normalized()   # the head bone's local Z points out of the face


def _behind(holder, side):
    rig = rigged.rig_of(holder)
    k = "L" if side > 0 else "R"
    for bone, (f, i) in (("upper_arm_fk", (-14, -10)), ("forearm_fk", (-22, 52)), ("hand_fk", (-26, 66))):
        rigged._aim(rig, f"{bone}.{k}", rigged._dir(0, f, side, -i))


def _roll(holder, bone, deg):
    """Turn a pose bone about its own length (forearm pronation / supination); its children follow."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones[bone]
    m = pb.matrix.copy()
    head = m.translation.copy()
    axis = (m.to_3x3() @ Vector((0, 1, 0))).normalized()
    pb.matrix = Matrix.Translation(head) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-head) @ m
    bpy.context.view_layer.update()


def palm_normal(holder, side):
    """The palm's facing (world): the curled middle finger bends toward it, away from the hand's length."""
    rig = rigged.rig_of(holder)
    k = "L" if side > 0 else "R"
    pb = rig.pose.bones
    mw = rig.matrix_world
    hand = pb[f"hand_fk.{k}"]
    a = (mw.to_3x3() @ (hand.tail - hand.head)).normalized()
    fb = pb.get(f"f_middle.01_master.{k}")
    if fb is None:
        return None, a
    f = (mw.to_3x3() @ (fb.tail - fb.head)).normalized()
    n = f - a * f.dot(a)
    return (n.normalized() if n.length > 1e-4 else None), a


def apply_pose(holder, p):
    """pose_figure plus this stage's extras (one or both hands behind the back, a forearm roll)."""
    rigged.pose_figure(holder, {k: v for k, v in p.items() if k in ("head", "neck", "chest", "l_arm", "r_arm", "fingers", "stance")})
    if p.get("behind"):
        _behind(holder, 1)
        _behind(holder, -1)
    elif p.get("behind_l"):
        _behind(holder, 1)
    if p.get("roll_r"):
        _roll(holder, "forearm_fk.R", p["roll_r"])


def _target(name, holders):
    """A look or reach target (world) by name: a figure's eyes, a prop's top centre, or a stage point."""
    if isinstance(name, (tuple, list)):
        return Vector(name)
    if name in holders:
        return eye_centre(holders[name])
    if name in _STATE["props"]:
        lo, hi = _bbox(_STATE["props"][name])
        return Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, hi.z))
    raise KeyError(name)


def _bbox(holder):
    pts = [o.matrix_world @ Vector(c) for o in holder.children_recursive if o.type == "MESH" for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def _reach_point(kind):
    if kind == "duffel_hover":       # palm 8 cm over the extra bag's top, over its middle, toward the near end
        lo, hi = _bbox(_STATE["props"]["extra-bag-closed"])
        return Vector(((lo.x + hi.x) / 2 + 0.12, (lo.y + hi.y) / 2 + 0.045, hi.z + 0.08))
    if kind == "tote_handle":        # palm just over the tote's handles, fingers to close round them
        lo, hi = _bbox(_STATE["props"]["handbag-tote"])
        return Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2 + 0.01, hi.z + 0.035))
    return Vector(kind)


def solve_pose(holder, spec, holders):
    """Turn a pose spec into a concrete pose for where the figure stands now: the right arm onto its reach target,
    the forearm rolled to turn the palm up or down, then the head onto its look target (iterated)."""
    p = {k: v for k, v in spec.items() if k not in ("look", "reach_r", "palm")}
    report = [holder.name]
    if spec.get("reach_r"):
        apply_pose(holder, p)                        # the trunk first: the shoulder moves with the chest
        tgt = _reach_point(spec["reach_r"])
        arm, err = solve_arm(holder, -1, tgt, fwd=(5, 100), elbow=(10, 85))   # a natural reach: no waiter's arm
        p["r_arm"] = arm
        report.append(f"r_arm {arm} palm error {err * 1000:.0f} mm")
        if spec.get("palm"):
            apply_pose(holder, p)
            n, a = palm_normal(holder, -1)
            want = Vector((0, 0, 1 if spec["palm"] == "up" else -1))
            if n is not None:
                c = a.cross(n)
                phi = math.degrees(math.atan2(c.dot(want), n.dot(want) - a.dot(n) * a.dot(want)))
                p["roll_r"] = max(-162.0, min(162.0, phi))
                report.append(f"palm {spec['palm']}: roll {p['roll_r']:.0f}")
    if spec.get("look"):
        d, t = p.get("head", (0.0, 0.0))
        tgt = _target(spec["look"], holders)
        for _ in range(3):
            p["head"] = (d, t)
            apply_pose(holder, p)
            e, f = eye_centre(holder), head_forward(holder)
            g = (tgt - e).normalized()
            dy = math.degrees(math.atan2(g.y, g.x) - math.atan2(f.y, f.x))
            dy = (dy + 180) % 360 - 180
            dp = math.degrees(math.asin(max(-1, min(1, f.z))) - math.asin(max(-1, min(1, g.z))))
            t = max(-60.0, min(60.0, t + dy))
            d = max(-25.0, min(45.0, d + dp))
        p["head"] = (round(d, 1), round(t, 1))
        report.append(f"head {p['head']} (last error yaw {dy:.1f} pitch {dp:.1f})")
    apply_pose(holder, p)
    print("INSPECTION pose", "; ".join(report), flush=True)
    return p


# ---------------------------------------------------------------- props and beats

def open_zip(holder):
    """Spread the two existing zip lips and let the inset nylon lining catch the overhead key."""
    lining = castkit.stone("duffel lining", (0.055, 0.060, 0.065), 0.91)
    for ob in holder.children_recursive:
        if ob.type != "MESH":
            continue
        mesh = ob.data
        world = Matrix.Translation(-holder.location) @ ob.matrix_world
        local = world.inverted()
        mesh.materials.append(lining)
        for face in mesh.polygons:
            x, y, z = world @ face.center
            if (x / 0.15) ** 2 + ((y - 0.025) / 0.065) ** 2 < 1 and 0.12 < z < 0.28:
                face.material_index = len(mesh.materials) - 1
        for v in mesh.vertices:
            x, y, z = world @ v.co
            across = y - 0.022
            weight = max(0, 1 - (x / 0.24) ** 4) * max(0, 1 - (across / 0.15) ** 2)
            weight *= min(1, max(0, (z - 0.12) / 0.10))
            v.co = local @ Vector((x, y + 0.033 * weight * math.tanh(across / 0.020), z))
        mesh.update()


def load_props():
    out = {}
    for name, (size, axis, grade) in PROPS.items():
        h = props.load(name, size=size, axis=axis, loc=(0, 0, -5), **grade)
        fin = FINISH.get(name)
        if fin:
            meshes = [o for o in h.children_recursive if o.type == "MESH"]
            bpy.context.view_layer.update()
            to_m = meshes[0].matrix_world.to_scale().x if meshes else 1.0
            seen = set()
            for o in meshes:
                for slot in o.material_slots:
                    if slot.material and slot.material.name not in seen:
                        seen.add(slot.material.name)
                        st.mt.tune_prop(slot.material, spec=fin.get("spec"), weave=fin.get("weave"), to_metres=to_m,
                                       ceiling=fin.get("ceiling"))
                        b = next((n for n in slot.material.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
                        if b is not None and "Coat Weight" in b.inputs:
                            b.inputs["Coat Weight"].default_value = 0.0
        if name == "extra-bag-open":
            open_zip(h)
        out[name] = h
    return out


def set_beat(beat):
    lay = LAYOUT.get(beat, LAYOUT["ch00"])
    for name, h in _STATE["props"].items():
        on = name in lay
        if on:
            x, y, z, t = lay[name]
            h.location = (x, y, z)
            h.rotation_euler = (0, 0, math.radians(t))
        for o in [h] + list(h.children_recursive):
            o.hide_render = not on
    for o in _STATE["dressing"]:     # the return: the bench cleared to the two bags
        o.hide_render = beat == "ch11"
    bpy.context.view_layer.update()


def block(beat, cheat=None):
    """Stand the cast where this beat (and this camera's cheat, if any) puts them, each turned to what it faces."""
    spots = {"Dawn": DAWN, "OfficerA": OFFICER_A, "OfficerB": OFFICER_B}
    spots.update(BLOCKING.get(beat, {}))
    spots.update(cheat or {})
    faces = FACE.get(beat, FACE["ch00"])
    for n, h in _STATE["holders"].items():
        x, y = spots[n]
        h.location.x, h.location.y = x, y
        f = faces.get(n, "Dawn")
        tgt = spots[f] if isinstance(f, str) else f
        h.rotation_euler.z = math.radians(facing((x, y), tgt))
    bpy.context.view_layer.update()


def pose_cast(beat, cfg):
    key = (beat, tuple(sorted((cfg.get("cheat") or {}).items())))
    cache = _STATE["pose_cache"]
    specs = POSES.get(beat, POSES["ch00"])
    holders = _STATE["holders"]
    order = ["OfficerA", "OfficerB", "Dawn"]          # Dawn last: she looks at the officer's eyes as posed
    if key in cache:
        for n in order:
            apply_pose(holders[n], cache[key][n])
        return
    cache[key] = {}
    for n in order:
        cache[key][n] = solve_pose(holders[n], dict(specs[n]), holders)


# ---------------------------------------------------------------- per camera

def apply_camera(name):
    cfg = CAMERAS.get(name, {})
    beat = cfg.get("beat", "ch00")
    set_beat(beat)
    show_cast = cfg.get("cast", True)
    for o in _STATE["cast"]:
        o.hide_render = not show_cast
    if _STATE.get("holders") and show_cast:
        block(beat, cfg.get("cheat"))
        pose_cast(beat, cfg)
    for o in st.CEILING:   # (the lights among them stay unseen by every camera: the lens is what the eye sees)
        o.visible_camera = o.type != "LIGHT" and not cfg.get("above_ceiling", False)
    for n in WILD:  # a wild wall: out for a camera standing where the wall is, as on a set
        o = bpy.data.objects.get(n)
        if o:
            o.visible_camera = n not in cfg.get("wild", ())
    top = bpy.data.materials.get("bench top steel")
    if top and "ghost" in top.node_tree.nodes:  # the cleaner patch where the tote stood: only once it has gone
        top.node_tree.nodes["ghost"].outputs[0].default_value = 1.0 if beat == "ch11" else 0.0
    # Seen from straight above, the bench mirrors the fitting: it must mirror the lens (what a camera would see), not
    # the area light that stands in for the tubes' output, which is many times brighter than the lens
    lens = bpy.data.materials.get("troffer_bench_lens")
    if lens and "strength" in lens.node_tree.nodes:
        lens.node_tree.nodes["strength"].outputs[0].default_value = cfg.get("lens_glow", 6.0)
    li = bpy.data.objects.get("troffer_bench_light")
    if li:
        li.visible_glossy = "lens_glow" not in cfg
    bpy.data.objects["floor_return"].hide_render = name != "overhead"
    rake = bpy.data.objects.get("tag_rake")
    if rake:
        rake.hide_render = not cfg.get("raking", False)
    sc = bpy.context.scene  # settings setkit.render leaves alone: tame fireflies and blotches for the denoiser
    sc.cycles.sample_clamp_indirect = 3.0
    sc.cycles.blur_glossy = 0.6
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH"),
                 ("denoising_input_passes", "RGB_ALBEDO_NORMAL")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    print(f"INSPECTION camera {name or '?'}: beat {beat}, cast {'shown' if show_cast and _STATE['cast'] else 'hidden'}, "
          f"ceiling {'see-through' if cfg.get('above_ceiling') else 'solid'}, cheat {cfg.get('cheat')}, "
          f"rake {'on' if cfg.get('raking') else 'off'}", flush=True)


def which_camera():
    cam = bpy.context.scene.camera
    if cam is None:
        return None
    for n, c in CAMERAS.items():
        if (cam.location - Vector(c["loc"])).length < 1e-3:
            return n
    return None


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        kw.setdefault("world", WORLD)
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def build(cast=True):
    st.M.clear()
    st.CEILING.clear()
    st.materials()
    st.shell()
    st.ceiling()
    st.door()
    st.notice_board()
    sx, sy, sturn = SCANNER
    st.back_wall(jx=sx - 0.1, gloves_xz=(2.38, 1.34), trays_xy=(0.55, 2.2), trays_n=4, outlet_x=2.45)
    st.floor_line(x=0.86, y0=0.3)
    st.bench(TOP)
    _STATE["dressing"] = st.dressing(TOP)
    _STATE["scanner"] = xr.build(sx, sy, sturn)
    _STATE["props"] = load_props()
    # the tag is built on the suitcase where it stands in Ch 00 and then travels with it
    case = _STATE["props"]["dawn-suitcase"]
    x, y, z, t = CASE
    case.location, case.rotation_euler = (x, y, z), (0, 0, math.radians(t))
    bpy.context.view_layer.update()
    st.luggage_tag(case, _case_frame(), hole=(-0.008, -0.005), grip=(-0.045, 0.542), grip_r=(0.0125, 0.0115))
    st.bounce()
    st.wall_wash()
    st.linked_light("floor_return", (0, -0.2, 2.30), (2.4, 2.2), 35, (0.80, 0.87, 1.0), [bpy.data.objects["floor"]])
    st.room_fill([_STATE["scanner"]["holder"]] + [o for o in _STATE["scanner"]["parts"] if o.type == "MESH"])
    rake_light()
    sk.haze((2 * st.XW - 0.02, st.Y1 - st.Y0 - 0.02, st.H - 0.03), (0, (st.Y0 + st.Y1) / 2, st.H / 2 - 0.01), 0.002)
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    _STATE["cast"] = []
    _STATE["holders"] = {}
    _STATE["pose_cache"] = {}
    set_beat("ch00")
    if cast:
        # the shared cast: Dawn, and two different officers (the one asking younger, taller and lean; the scanner
        # operator older, shorter, heavier)
        d = dawn()
        a = officer("OfficerA", 0)
        b = officer("OfficerB", 1)
        place(d, (*DAWN, 0), facing(DAWN, OFFICER_A))
        place(a, (*OFFICER_A, 0), facing(OFFICER_A, DAWN))
        place(b, (*OFFICER_B, 0), facing(OFFICER_B, DAWN))
        for h in (d, a, b):
            rigged.pose_figure(h, {"fingers": 30})
            print(f"INSPECTION grounded {h.name} by {-ground(h) * 1000:+.1f} mm", flush=True)
            _STATE["cast"] += [h] + list(h.children_recursive)
        _STATE["holders"] = {"Dawn": d, "OfficerA": a, "OfficerB": b}
    install_hook()


def rake_light():
    """For the tag close-up only: a small hard source low behind and to the right, in the direction of the scanner's
    troffer (its motivation), grazing the case top so the weave, the twine and the grip get shape and the tag throws
    a shadow on the lid. Kept out of the haze."""
    hole = bpy.data.objects["tag_hole_focus"].matrix_world.translation
    d = Vector((0.397, 0.918, 0.51)).normalized()
    li = sk.area_light("tag_rake", tuple(hole + d * 1.8), (0.3, 0.05), 150.0, (0.84, 0.92, 1.0), spread_deg=60)
    li.visible_camera = False
    li.visible_volume_scatter = False
    tt = li.constraints.new("TRACK_TO")
    tt.target, tt.track_axis, tt.up_axis = bpy.data.objects["tag_hole_focus"], "TRACK_NEGATIVE_Z", "UP_Y"
    li.hide_render = True
    return li
