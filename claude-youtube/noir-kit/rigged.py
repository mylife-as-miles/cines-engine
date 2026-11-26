"""Rigged faceless mannequins: the channel's character system.

The body is the author's "rigged human structure" (a Rigify-rigged, realistic-proportioned, featureless figure,
`assets/rigged_human_structure.blend`, kept out of git until its licence is confirmed). Every character on the
channel is this body: dressed by colouring zones of its own mesh (skin, top, trousers, shoes), sized, and posed
through Rigify's FK controls by aiming bones at directions, so a pose is a few readable numbers.

    import rigged
    off = rigged.figure("OfficerA", height=1.80, outfit=rigged.Outfit(top=(0.03,0.04,0.06), cap=True),
                        pose={"r_arm": (60, 15, 10), "head": (12, 0)}, location=(0, 1, 0), facing_deg=180)

Pose keys (degrees): "l_arm"/"r_arm": (forward, out, elbow); "head", "neck", "chest": (down, turn), relative;
"fingers": curl. Characters face -Y unturned.
"""
import math
import os
from dataclasses import dataclass

import bpy  # first: bmesh and mathutils only exist once bpy is loaded
from mathutils import Matrix, Vector

ASSET = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "rigged_human_structure.blend")
RIG, BODY = "rig.001", "lowman_shoes"
SOURCE_HEIGHT = 6.06  # metres: the source rig is at 3x scale. Scale a parent empty, never the rig itself
                      # (a scaled Rigify rig renders at its original size here; a scaled parent renders right).

ZONES = (  # vertex-group prefixes -> clothing zone; first match wins
    ("skin", ("DEF-spine.004", "DEF-spine.005", "DEF-spine.006", "DEF-hand", "DEF-palm", "DEF-f_", "DEF-thumb")),
    ("shoes", ("DEF-foot", "DEF-toe")),
    ("bottom", ("DEF-pelvis", "DEF-thigh", "DEF-shin")),  # plus "DEF-spine" exactly (the hips), in _zone_of
    ("top", ("DEF-",)),
)


@dataclass
class Outfit:
    top: tuple = (0.3, 0.3, 0.32)
    bottom: tuple = (0.05, 0.05, 0.06)
    shoes: tuple = (0.02, 0.02, 0.02)
    skin: tuple = (0.6, 0.6, 0.61)
    cap: bool = False
    cap_colour: tuple = (0.02, 0.028, 0.045)


def _mat(name, rgb, rough, sheen=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    if sheen and "Sheen Weight" in b.inputs:
        b.inputs["Sheen Weight"].default_value = sheen
    return m


def _zone_of(group_name):
    if group_name == "DEF-spine":
        return "bottom"
    for zone, prefixes in ZONES:
        if any(group_name.startswith(p) for p in prefixes):
            return zone
    return None


def _dress(body, name, o):
    mats = {"skin": _mat(f"{name}_skin", o.skin, 0.55), "top": _mat(f"{name}_top", o.top, 0.8, 0.08),
            "bottom": _mat(f"{name}_bottom", o.bottom, 0.85, 0.08), "shoes": _mat(f"{name}_shoes", o.shoes, 0.4)}
    body.data.materials.clear()
    order = list(mats)
    for k in order:
        body.data.materials.append(mats[k])
    zone_of_group = {g.index: _zone_of(g.name) for g in body.vertex_groups}
    vzone = []
    for v in body.data.vertices:
        score = {}
        for ge in v.groups:
            z = zone_of_group.get(ge.group)
            if z:
                score[z] = score.get(z, 0) + ge.weight
        vzone.append(max(score, key=score.get) if score else "top")
    for p in body.data.polygons:
        votes = {}
        for vi in p.vertices:
            votes[vzone[vi]] = votes.get(vzone[vi], 0) + 1
        p.material_index = order.index(max(votes, key=votes.get))
        p.use_smooth = True


def _aim(rig, bone, direction):
    """Rotate a pose bone about its head so its Y axis points along `direction` (armature space)."""
    pb = rig.pose.bones[bone]
    m = pb.matrix.copy()
    y = (m.to_3x3() @ Vector((0, 1, 0))).normalized()
    r = y.rotation_difference(Vector(direction).normalized()).to_matrix().to_4x4()
    head = m.translation.copy()
    pb.matrix = Matrix.Translation(head) @ r @ Matrix.Translation(-head) @ m
    bpy.context.view_layer.update()


def _turn(rig, bone, down_deg, turn_deg):
    """Rotate a pose bone about its head, relative to where it is: tip forward (toward -Y) and turn about Z."""
    pb = rig.pose.bones[bone]
    m = pb.matrix.copy()
    head = m.translation.copy()
    r = Matrix.Rotation(math.radians(turn_deg), 4, "Z") @ Matrix.Rotation(math.radians(down_deg), 4, "X")
    pb.matrix = Matrix.Translation(head) @ r @ Matrix.Translation(-head) @ m
    bpy.context.view_layer.update()


def _dir(down_from_vertical_deg, forward_deg, side, out_deg):
    """A limb direction in armature space (character faces -Y): hanging straight down, swung forward and out."""
    f, o = math.radians(forward_deg), math.radians(out_deg)
    d = Vector((0, 0, -1))
    d = Matrix.Rotation(-f, 3, "X") @ d            # forward is -Y
    d = Matrix.Rotation(-side * o, 3, "Y") @ d      # out to the character's side (.L is +X)
    return d


def figure(name, height=1.75, outfit=None, pose=None, location=(0, 0, 0), facing_deg=0.0, collection=None):
    o = outfit or Outfit()
    pose = pose or {}
    with bpy.data.libraries.load(ASSET, link=False) as (src, dst):
        dst.objects = [RIG, BODY]
    rig, body = dst.objects
    coll = collection or bpy.context.scene.collection
    for ob in (rig, body):
        coll.objects.link(ob)
    rig.name, body.name = f"{name}_rig", f"{name}_body"
    for m in list(body.modifiers):  # the source file also deforms by a leftover metarig: keep only our rig
        if m.type == "ARMATURE" and m.object is not rig:
            body.modifiers.remove(m)
    body.data = body.data.copy()
    _dress(body, name, o)
    holder = bpy.data.objects.new(name, None)
    coll.objects.link(holder)
    rig.parent = holder
    ks = height / SOURCE_HEIGHT
    holder.scale = (ks, ks, ks)
    holder.location = (location[0], location[1], location[2] + 0.1 * ks)  # the source's soles sit 0.1 m below zero
    holder.rotation_euler = (0, 0, math.radians(facing_deg))
    bpy.context.view_layer.update()

    holder["rig"], holder["body"], holder["ks"] = rig.name, body.name, ks
    pose_figure(holder, pose)

    if o.cap:  # a peaked cap sits on the head bone
        import bmesh
        me = bpy.data.meshes.new(f"{name}_cap")
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=0.104, radius2=0.118, depth=0.085,
                              matrix=Matrix.Translation((0, 0.0, 0)) @ Matrix.Rotation(math.radians(-90), 4, "X") @ Matrix.Diagonal((1, 1.15, 1, 1)))
        bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=0.11, radius2=0.11, depth=0.008,
                              matrix=Matrix.Translation((0, -0.03, -0.045)) @ Matrix.Rotation(math.radians(-90), 4, "X") @ Matrix.Diagonal((1, 1.45, 1, 1)))
        bm.to_mesh(me)
        bm.free()
        cap = bpy.data.objects.new(f"{name}_cap", me)
        coll.objects.link(cap)
        cap.data.materials.append(_mat(f"{name}_capmat", o.cap_colour, 0.6))
        cap.parent, cap.parent_type, cap.parent_bone = rig, "BONE", "head"
        total = rig.scale[0] * ks
        cap.scale = (height / 1.8 / total,) * 3          # the cap is modelled for a 1.8 m head, in metres
        cap.location = (0, -0.045 / total, -0.008 / total)  # crown seated on the head, nudged forward
    return holder


def rig_of(holder):
    return bpy.data.objects[holder["rig"]]


def shoulder_world(holder, side):
    """World position of the upper arm's root on one side (+1 = the character's left)."""
    rig = rig_of(holder)
    pb = rig.pose.bones["upper_arm_fk.L" if side > 0 else "upper_arm_fk.R"]
    bpy.context.view_layer.update()
    return rig.matrix_world @ pb.head


def pose_figure(holder, pose=None):
    """Put a figure in a pose. Always starts from rest, so calling it again replaces the pose rather than adding."""
    pose = pose or {}
    rig = rig_of(holder)
    ks = holder["ks"]
    pb = rig.pose.bones
    for b in pb:
        b.matrix_basis = Matrix.Identity(4)
    for side, k in ((1, "L"), (-1, "R")):  # FK arms so they can be aimed
        if f"upper_arm_parent.{k}" in pb:
            pb[f"upper_arm_parent.{k}"]["IK_FK"] = 1.0
    bpy.context.view_layer.update()
    for bone, key in (("chest", "chest"), ("neck", "neck"), ("head", "head")):
        dn, tn = pose.get(key, (0, 0))
        if (dn, tn) != (0, 0) and bone in pb:
            _turn(rig, bone, dn, tn)
    for side, k, key in ((1, "L", "l_arm"), (-1, "R", "r_arm")):
        fwd, out, elbow = pose.get(key, (8, 8, 12))
        _aim(rig, f"upper_arm_fk.{k}", _dir(0, fwd, side, out))
        _aim(rig, f"forearm_fk.{k}", _dir(0, fwd + elbow, side, out * 0.6))
        _aim(rig, f"hand_fk.{k}", _dir(0, fwd + elbow + 4, side, out * 0.4))
    stance = pose.get("stance", 0.07)  # metres each foot moves in from the source's wide A-pose stance
    for side, k in ((1, "L"), (-1, "R")):
        n = f"foot_ik.{k}"
        if n in pb and stance:
            m = pb[n].matrix.copy()
            pb[n].matrix = Matrix.Translation((-side * stance / (rig.scale[0] * ks), 0, 0)) @ m
    bpy.context.view_layer.update()
    curl = math.radians(pose.get("fingers", 18))
    for k in ("L", "R"):
        for f in ("f_index", "f_middle", "f_ring", "f_pinky"):
            n = f"{f}.01_master.{k}"
            if n in pb:
                pb[n].rotation_mode = "XYZ"
                pb[n].rotation_euler.x = curl
    bpy.context.view_layer.update()
