"""Stage: the Hong Kong hotel room at night (Ch 03 the hotel window, Ch 04 'The gift inside the gift', the packing).

A mid-range room high in a Kowloon tower, after the shopping: a tall window onto a dense procedural city (towers
packed to the harbour, a main avenue of blank glowing signboards running away below, the far shore's skyline and the
dark ridge under a low lit overcast; nothing recognisable, no text), the bed with Dawn's suitcase lying open on it,
the black extra bag the organisers bought beside it with its zip eased open, the cognac tote laid on tissue paper,
the black satchel standing on the bedspread, crumpled tissue. The bedside lamp is the room's one warm light against
the city's cold glow. Dawn (people.dawn()) packs: the burgundy shoulder bag hangs from her right hand by its strap,
going into the extra bag's mouth, her left hand steadying the bag. Calm, unsuspecting; the bags are ordinary gifts.

Cameras:
  window    Ch 03: from the dim room behind her, Dawn at the glass drawing the sheer back with her left hand, looking
            out over the city; the lamp a warm island at the left by the bed
  overhead  Ch 04: straight down through the ceiling onto the bed: the open case, the open extra bag with the
            shoulder bag going in, the tote and the satchel, tissue; her head, shoulders and hands at the left
  pack      Ch 04: controlled close-up from behind her right side: the shoulder bag lowered into the extra bag's
            mouth, her hand on the strap, the lamp glowing warm beyond

    <bpy python> -I scenes/shoot.py -- hotel_room <cam> out.png [--nocast]

Set and lights: hotel_room_set.py, materials hotel_room_mats.py, the city hotel_room_city.py, the props and their
finishing (the case cut open, the duffel's mouth eased, the tote laid flat, tissue) hotel_room_props.py. Dawn is the
shared cast's people.dawn(), finished as in chicago_night (blouse, matt cloth, hem thickness, darker stone hands);
this stage only poses and places her. Before each render a hook on setkit.render restores the camera's beat (Dawn's
solved pose and place, which curtain hangs, whether the shoulder bag is in her hand), hides the ceiling from the
overhead camera, and sets the far clip (the city's sky dome is 15 km out).
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
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import hotel_room_set as st  # noqa: E402
import hotel_room_city as city  # noqa: E402
import hotel_room_props as hp  # noqa: E402

EXPOSURE = -1.5
WORLD = 0.006

# --- the bed's layout (world). The case lies along Y, its lid flipped toward the head of the bed; the extra bag
# along X near Dawn's edge, its mouth toward her; the tote on tissue between the pillows and the lid; the satchel
# standing between the extra bag and the tote; loose and fresh tissue at the foot on the runner.
CASE = (-0.41, 0.21, -90.0, -1)          # x, y, turn, lid side (laid frame -Y -> world -X)
BAG = (-1.05, -0.63, 210.0)              # extra bag: mouth (file +Y) toward Dawn (world -Y)
TOTE = (-1.25, 0.25, -90.0)              # top (handles) toward the pillows
SATCHEL = (-1.28, -0.12, 180.0)          # beside the extra bag, clasp face toward Dawn's side
SINK = 0.012                             # how far the bags settle into the duvet

# --- Dawn. Packing: at the bed's room-side edge facing the window (+Y); at the window: drawing the left sheer back.
PACK_SPOT = (-1.10, -1.09, 180.0)
WIN_SPOT = (-0.28, 1.40, 172.0)
CURTAIN_HOLD = (-0.60, 1.63, 1.24)       # the left palm's target in the window shot
CITY_LOOK = (250.0, 1500.0, -40.0)       # where she looks: out over the city toward the harbour
HOBO_TURN = 8.0
STANCE = dict(hip_side=0.022, hip_down=0.004, hip_tilt=3.5, foot_fwd=0.05, foot_out=9.0)

FOCUS = {"fx_window": (WIN_SPOT[0], WIN_SPOT[1], 1.5), "fx_overhead": (-0.95, -0.45, 0.95),
         "fx_accept": (-1.0, -0.92, 1.02), "fx_pack": (-1.03, -0.66, 0.85)}

CAMERAS = {
    # Ch 03: from the dim room behind her right shoulder at a standing eye line: the bed and the lamp island on the
    # left, Dawn at the glass drawing the sheer back, the city across the window
    "window": dict(loc=(0.95, -1.7, 1.55), aim=(-0.83, 1.46, 1.2), lens=33, focus="fx_window", fstop=4.0,
                   beat="window", exposure=-1.2),
    # Ch 04: straight down onto the bed through the ceiling (image top = the head of the bed)
    "overhead": dict(loc=(-1.074, -0.42, 5.0), aim=(-1.08, -0.42, 0.6), lens=42, focus="fx_overhead", fstop=8.0,
                     beat="packed", exposure=-1.0, above_ceiling=True, shift_x=0.060, shift_y=0.019),
    # Ch 04: close, from behind her right side, a little above the bag: the shoulder bag going into the open extra
    # bag's mouth, her arm and hand on its strap coming in from the left, the lamp warm beyond (f/2.8)
    "pack": dict(loc=(0.15, -1.15, 1.35), aim=(-1.06, -0.47, 0.966), lens=50, focus="fx_pack", fstop=2.8,
                 beat="pack", exposure=-0.56),
    "accept": dict(loc=(0.66, -2.27, 1.36), aim=(-1.0, -0.60, 0.94), lens=37,
                   focus="fx_accept", fstop=4.0, beat="accept", exposure=-1.10),
    "overhead_pre": dict(loc=(-1.025, -0.28, 4.75), aim=(-1.031, -0.28, 0.66), lens=46,
                         focus="fx_overhead", fstop=8.0, beat="pre", exposure=-1.0, above_ceiling=True, shift_x=0.060, shift_y=0.045),
}
TRIMS = {"window": {"duvet_bounce": 0.0, "ceiling_bounce": 0.0, "lamp_spill": 0.55, "wall_return": 1.0},
         "overhead": {"duvet_bounce": 0.0, "ceiling_bounce": 0.15, "lamp_light": 0.74}, "pack": {"lamp_spill": 1.8, "duvet_bounce": 1.25, "ceiling_bounce": 0.72},
         "overhead_pre": {"duvet_bounce": 0.0, "ceiling_bounce": 0.15, "lamp_light": 0.74},
         "accept": {"duvet_bounce": 1.2, "ceiling_bounce": 0.24}}
_STATE = {"cast": [], "dawn": None, "poses": {}, "base": {}, "hobo": None, "sheers": {}}


# ---------------------------------------------------------------- Dawn: finish (as chicago_night)

def cloth(holder, item, rough=0.9, bump=0.25):
    ob = bpy.data.objects.get(f"{holder.name}_{item}")
    if ob is None:
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
        b.inputs["Sheen Weight"].default_value = 0.0
        b.inputs["Specular IOR Level"].default_value = 0.05
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
    so = ob.modifiers.new("cloth_thickness", "SOLIDIFY")
    so.thickness, so.offset, so.use_even_offset = t, 1.0, False
    so.use_quality_normals = True
    sub = next((i for i, md in enumerate(ob.modifiers) if md.type == "SUBSURF"), None)
    if sub is not None:
        ob.modifiers.move(len(ob.modifiers) - 1, sub)


def hands_stone(holder, value=0.28):
    body = bpy.data.objects[holder["body"]]
    gi = {g.index for g in body.vertex_groups if any(k in g.name for k in ("hand", "f_", "thumb", "palm"))}
    if not gi:
        return 0
    me = body.data
    attr = me.color_attributes.new("handmask", "FLOAT_COLOR", "POINT")
    for v in me.vertices:
        w = min(1.0, sum(g.weight for g in v.groups if g.group in gi))
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
    return 1


def dawn():
    h = people.dawn()
    castkit.blouse_v(h, rgb=(0.2, 0.19, 0.18), depth=0.42, width=0.14)
    bl = bpy.data.materials.get(f"blouse_{h.name}")
    if bl is not None:
        bb = bl.node_tree.nodes["Principled BSDF"]
        bb.inputs["Specular IOR Level"].default_value = 0.05
        bb.inputs["Roughness"].default_value = 0.92
    suit = cloth(h, "female_elegantsuit01")
    if suit is not None:
        hem_thickness(suit, 0.006)
    bun = bpy.data.objects.get(f"{h['body']}_bun")
    if bun is not None:
        bun.data.transform(Matrix.Translation((0.0, -0.025, -0.02)))
    hands_stone(h)
    return h


# ---------------------------------------------------------------- Dawn: pose helpers (from chicago_night)

def ground(holder):
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


def eye_centre(holder):
    rig = rigged.rig_of(holder)
    m = rig.pose.bones["head"].matrix
    p = m.translation + m.to_3x3().col[1].normalized() * 0.04 + m.to_3x3().col[2].normalized() * 0.075
    return rig.matrix_world @ p


def head_forward(holder):
    rig = rigged.rig_of(holder)
    m = rig.pose.bones["head"].matrix.to_3x3()
    return (rig.matrix_world.to_3x3() @ m.col[2]).normalized()


def _roll(holder, bone, deg):
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones[bone]
    m = pb.matrix.copy()
    head = m.translation.copy()
    axis = (m.to_3x3() @ Vector((0, 1, 0))).normalized()
    pb.matrix = Matrix.Translation(head) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-head) @ m
    bpy.context.view_layer.update()


def palm_normal(holder, side):
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


def palm_centre(holder, side):
    rig = rigged.rig_of(holder)
    hb = rig.pose.bones[f"hand_fk.{'L' if side > 0 else 'R'}"]
    return rig.matrix_world @ (hb.head + (hb.tail - hb.head) * 0.5)


def turn_palm(holder, side, want):
    n, a = palm_normal(holder, side)
    if n is None:
        return 0.0
    want = Vector(want).normalized()
    c = a.cross(n)
    phi = math.degrees(math.atan2(c.dot(want), n.dot(want) - a.dot(n) * a.dot(want)))
    phi = max(-120.0, min(120.0, phi))
    _roll(holder, f"forearm_fk.{'L' if side > 0 else 'R'}", phi)
    return phi


def stance(holder):
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    k = 1.0 / (rig.scale[0] * holder["ks"])
    if "torso" in pb:
        m = pb["torso"].matrix.copy()
        pb["torso"].matrix = Matrix.Translation((-STANCE["hip_side"] * k, 0.0, -STANCE["hip_down"] * k)) @ m
        bpy.context.view_layer.update()
    if "hips" in pb:
        m = pb["hips"].matrix.copy()
        head = m.translation.copy()
        pb["hips"].matrix = Matrix.Translation(head) @ Matrix.Rotation(math.radians(STANCE["hip_tilt"]), 4, "Y") @ \
            Matrix.Translation(-head) @ m
    n = "foot_ik.L"
    if n in pb:
        m = pb[n].matrix.copy()
        head = m.translation.copy()
        r = Matrix.Rotation(math.radians(STANCE["foot_out"]), 4, "Z")
        pb[n].matrix = Matrix.Translation((0.0, -STANCE["foot_fwd"] * k, 0.0)) @ Matrix.Translation(head) @ r @ \
            Matrix.Translation(-head) @ m
    bpy.context.view_layer.update()


def ik_arm(holder, side, palm, pole=(0.45, 0.3, -1.0)):
    """Aim the FK arm so the palm's centre lands on `palm` (world): an analytic two-bone solve in armature space,
    the elbow bent toward `pole` (armature space: out to her side, back, down), the wrist straight."""
    rig = rigged.rig_of(holder)
    k = "L" if side > 0 else "R"
    pb = rig.pose.bones
    T = rig.matrix_world.inverted() @ Vector(palm)
    S = pb[f"upper_arm_fk.{k}"].head.copy()
    L1, L2, L3 = (pb[f"{b}.{k}"].length for b in ("upper_arm_fk", "forearm_fk", "hand_fk"))
    P = Vector((side * pole[0], pole[1], pole[2]))
    fdir = (T - S).normalized()
    for _ in range(6):
        W = T - fdir * 0.5 * L3
        d = W - S
        dist = min(d.length, (L1 + L2) * 0.995)
        u = d.normalized()
        a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist)
        h = math.sqrt(max(0.0, L1 * L1 - a * a))
        v = (P - u * P.dot(u)).normalized()
        E = S + u * a + v * h
        fdir = (W - E).normalized()
    rigged._aim(rig, f"upper_arm_fk.{k}", E - S)
    rigged._aim(rig, f"forearm_fk.{k}", W - E)
    rigged._aim(rig, f"hand_fk.{k}", fdir)
    return (palm_centre(holder, side) - Vector(palm)).length


def curl(holder, side, knuckle, joint, thumb=10.0):
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    k = "L" if side > 0 else "R"
    for i, f in enumerate(("f_index", "f_middle", "f_ring", "f_pinky")):
        for n, deg in ((f"{f}.01_master.{k}", knuckle + 2 * i), (f"{f}.02.{k}", joint + 2 * i), (f"{f}.03.{k}", joint * 0.8)):
            if n in pb:
                pb[n].rotation_mode = "XYZ"
                pb[n].rotation_euler.x = math.radians(deg)
    for n in (f"thumb.01_master.{k}", f"thumb.02.{k}", f"thumb.03.{k}"):
        if n in pb:
            pb[n].rotation_mode = "XYZ"
            pb[n].rotation_euler.x = math.radians(thumb)
    bpy.context.view_layer.update()


def place(h, spot):
    x, y, f = spot
    h.location = (x, y, 0.0)
    h.rotation_euler = (0, 0, math.radians(f))
    bpy.context.view_layer.update()


def look_at(h, pose, target, d=0.0, t=0.0, lim=(-20.0, 45.0)):
    tgt = Vector(target)
    for _ in range(4):
        pose["head"] = (d, t)
        rigged.pose_figure(h, pose)
        e, fw = eye_centre(h), head_forward(h)
        g = (tgt - e).normalized()
        dy = math.degrees(math.atan2(g.y, g.x) - math.atan2(fw.y, fw.x))
        dy = (dy + 180) % 360 - 180
        dp = math.degrees(math.asin(max(-1, min(1, fw.z))) - math.asin(max(-1, min(1, g.z))))
        t = max(-50.0, min(50.0, t + dy))
        d = max(lim[0], min(lim[1], d + dp))
    pose["head"] = (round(d, 1), round(t, 1))
    rigged.pose_figure(h, pose)
    return pose["head"]


def snapshot(h):
    rig = rigged.rig_of(h)
    return dict(loc=tuple(h.location), rot=tuple(h.rotation_euler),
                switches={pb.name: pb["IK_FK"] for pb in rig.pose.bones if "IK_FK" in pb},
                bones={pb.name: (pb.rotation_mode, pb.matrix_basis.copy()) for pb in rig.pose.bones})


def restore(h, snap):
    rig = rigged.rig_of(h)
    h.location, h.rotation_euler = snap["loc"], snap["rot"]
    for n, value in snap["switches"].items():
        rig.pose.bones[n]["IK_FK"] = value
    for pb in rig.pose.bones:
        mode, mb = snap["bones"][pb.name]
        pb.rotation_mode = mode
        pb.matrix_basis = mb
    bpy.context.view_layer.update()


# ---------------------------------------------------------------- the two poses

def pose_pack(h, grip, steady):
    """At the bed's edge, leaning in a little: the right hand holding the shoulder bag by its strap over the extra
    bag's mouth (palm down, fingers closed round the strap), the left hand resting on the extra bag's top (palm down,
    fingers curled), eyes on the bag going in."""
    place(h, PACK_SPOT)
    pose = {"chest": (18.0, 2.0), "neck": (6.0, 0.0), "fingers": 20}
    head = look_at(h, pose, grip - Vector((0, 0, 0.36)), d=20.0, lim=(-10.0, 50.0))
    stance(h)
    er = ik_arm(h, -1, grip, pole=(0.5, 0.15, -1.0))
    pr = turn_palm(h, -1, (0.0, -0.35, -1.0))
    el = ik_arm(h, 1, steady, pole=(0.55, 0.25, -1.0))
    pl = turn_palm(h, 1, (0.0, 0.0, -1.0))
    curl(h, -1, 62.0, 78.0, 28.0)
    curl(h, 1, 14.0, 20.0, 8.0)
    lo = ground(h)
    print(f"HOTEL pack pose: head {head}, palm R off {er * 1000:.0f} mm roll {pr:.0f}, palm L off {el * 1000:.0f} mm "
          f"roll {pl:.0f}, grounded {lo * 1000:+.0f} mm", flush=True)
    return snapshot(h)


def pose_packed(h, pull, steady):
    """The handbag is inside. Dawn steadies the duffel as she closes the zip."""
    place(h, (PACK_SPOT[0] - 0.02, PACK_SPOT[1] + 0.055, PACK_SPOT[2]))
    pose = {"chest": (25, 2), "neck": (6, 0), "fingers": 20}
    look_at(h, pose, pull, d=25)
    stance(h)
    ground(h)
    right = ik_arm(h, -1, pull + Vector((0.021, -0.031, 0.027)), pole=(0.57, 0.14, -1))
    turn_palm(h, -1, (0.0, 0.25, -1.0))
    curl(h, -1, 37, 52, 18)
    left = ik_arm(h, 1, steady, pole=(0.54, 0.25, -1))
    turn_palm(h, 1, (0, 0, -1))
    curl(h, 1, 17, 24, 9)
    print(f"HOTEL packed palms: right {right * 1000:.1f} mm, left {left * 1000:.1f} mm", flush=True)
    return snapshot(h)


def pose_window(h):
    """At the glass, weight on her right leg, the left hand drawing the sheer's edge back at chest height, the right
    arm easy at her side, looking out and down the avenue toward the harbour."""
    place(h, WIN_SPOT)
    pose = {"chest": (-2.0, -3.0), "neck": (0.0, 0.0), "fingers": 30, "r_arm": (4.0, 7.0, 16.0)}
    head = look_at(h, pose, CITY_LOOK, d=4.0)
    stance(h)
    el = ik_arm(h, 1, CURTAIN_HOLD, pole=(0.7, 0.35, -0.8))
    pl = turn_palm(h, 1, (-0.85, 0.35, 0.0))
    curl(h, 1, 52.0, 64.0, 24.0)
    curl(h, -1, 22.0, 30.0, 10.0)
    lo = ground(h)
    print(f"HOTEL window pose: head {head}, palm L off {el * 1000:.0f} mm roll {pl:.0f}, grounded {lo * 1000:+.0f} mm",
          flush=True)
    return snapshot(h)


# ---------------------------------------------------------------- per camera

def premarket_props(duvet):
    case = hp.load_baked("dawn-suitcase")
    co = hp.verts_np(case.data)
    # Bake the same furniture-space rotation as the open case. The glTF nodes
    # retain their import channels, including the separate webbing mesh.
    centre = (co[:, 2].max() + co[:, 2].min()) / 2
    lay = Matrix.Translation((centre, 0, -co[:, 0].min())) @ Matrix.Rotation(-math.pi / 2, 4, "Y")
    for mesh in [case] + list(case.children_recursive):
        if mesh.type == "MESH":
            mesh.data.transform(lay)
            mesh.data.update()
    hp.holder("closed_case_on_bed", (-0.98, -0.52, _on_duvet(duvet, -0.98, -0.52)), 0, [case])
    trio = []
    for style, x, angle in (("satchel", -1.32, 152), ("tote", -0.94, 160), ("shoulder", -0.50, 183)):
        root, mesh = hp.bag_upright("handbag-" + style, (x, 0.12, _on_duvet(duvet, x, 0.12)), angle)
        trio.append((root, mesh))
    bpy.context.view_layer.update()
    return case, trio


def premarket_poses(h, duvet, case, tote, tote_mesh):
    from home import sit_legs, _feet
    place(h, (PACK_SPOT[0], -1.055, PACK_SPOT[2]))
    pose = {"chest": (30, 3), "neck": (4, 0), "fingers": 14, "l_arm": (4, 6, 11)}
    palm = Vector((-1.08, -0.59, hp.surface_z([case], -1.08, -0.59) + 0.024))
    look_at(h, pose, palm, d=20)
    stance(h)
    rig = rigged.rig_of(h)
    # Bend both knees against the planted foot targets so the lower hand
    # can bear weight on the duvet while the other hand holds the lid.
    for side in "LR":
        rig.pose.bones[f"thigh_parent.{side}"]["IK_FK"] = 0.0
    bpy.context.view_layer.update()
    torso = rig.pose.bones["torso"]
    unit = 1 / (rig.scale[0] * h["ks"])
    torso.matrix = Matrix.Translation((0, -0.105 * unit, -0.238 * unit)) @ torso.matrix
    bpy.context.view_layer.update()
    ground(h)
    ik_arm(h, -1, palm)
    turn_palm(h, -1, (0, 0, -1))
    rigged.articulate_hand(h, "R", {"f_index": (15, 16, 6), "f_middle": (18, 18, 7),
                                     "f_ring": (20, 22, 8), "f_pinky": (24, 24, 10), "thumb": (9, 7, 5)})
    x, y = -1.37, -0.80
    left_target = Vector((x, y, _on_duvet(duvet, x, y) + 0.022))
    reach = left_target.copy()
    hand = rig.pose.bones["hand_fk.L"]
    frame = rig.matrix_world.to_3x3().normalized().inverted()
    forward = (frame @ Vector((0.12, 1, 0))).normalized()
    down = (frame @ Vector((0, 0, -1))).normalized()
    flat = Matrix((down, forward, down.cross(forward))).transposed().to_4x4()
    # Changing the wrist angle also moves the palm centre. Refit the reach
    # after turning the pads against the fabric.
    for _ in range(5):
        ik_arm(h, 1, reach, pole=(0.74, 1.05, -0.32))
        flat.translation = hand.matrix.translation
        hand.matrix = flat
        bpy.context.view_layer.update()
        reach += left_target - palm_centre(h, 1)
    rigged.articulate_hand(h, "L", {"f_index": (4, 6, 3), "f_middle": (6, 8, 4),
                                     "f_ring": (8, 12, 4), "f_pinky": (12, 13, 5), "thumb": (8, 7, 5)})
    _STATE["poses"]["pre"] = snapshot(h)
    place(h, (0, 0, 0))
    x, y = -1.00, -0.77
    # Seat her into the compressed duvet with both soles planted beside the bed.
    rigged.pose_figure(h, {"chest": (9, 2), "head": (23, 2), "neck": (5, 0), "fingers": 16})
    sit_legs(h, 58.35, -3)
    _feet(h, 16)
    ground(h)
    rig = rigged.rig_of(h)
    hip = sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{side}"].head for side in "LR"), Vector()) / 2
    h.location.x += x - hip.x
    h.location.y += y - hip.y
    # The tote hangs between her hands, angling back toward her lap.
    tote.location = (x, -1.055, 0.0)
    tote.rotation_euler = (math.radians(-15), 0, math.radians(178))
    bpy.context.view_layer.update()
    base = min((tote_mesh.matrix_world @ vertex.co).z for vertex in tote_mesh.data.vertices)
    tote.location.z += 0.627 - base
    bpy.context.view_layer.update()
    # Catch the two ascending sides of the same handle. The narrower left and right
    # grip stations sit below its apex, so her knuckles never meet in the middle.
    verts = [tote_mesh.matrix_world @ v.co for v in tote_mesh.data.vertices]
    high = max(p.z for p in verts)
    band = [p for p in verts if high - 0.071 < p.z < high - 0.060]
    for side, k in ((1, "L"), (-1, "R")):
        flank = [p for p in band if side * (p.x - x) > 0.015]
        nearest = min(p.y for p in flank)
        wire = [p for p in flank if p.y < nearest + 0.009]
        grip = sum(wire, Vector()) / len(wire)
        # The palm centre is outside and behind the arch. The curled index
        # and middle fingers reach back around its front, opposite the thumb.
        err = ik_arm(h, side, grip + Vector((0.035 * side, 0.016, 0.013)))
        turn_palm(h, side, (-side, 0.55, -0.12))
        rigged.articulate_hand(h, k, {"f_index": (40, 59, 38), "f_middle": (48, 65, 43),
                                     "f_ring": (55, 67, 46), "f_pinky": (59, 71, 49), "thumb": (22, 29, 17)})
        print(f"HOTEL accept {k} grip station {tuple(round(v, 3) for v in grip)}, palm error {err*1000:.1f} mm",
              flush=True)
    _STATE["poses"]["accept"] = snapshot(h)
    bpy.data.objects["fx_accept"].location = (x, y - 0.19, high + 0.035)


def which_camera():
    cam = bpy.context.scene.camera
    if cam is None:
        return None
    for n, c in CAMERAS.items():
        if (cam.location - Vector(c["loc"])).length < 1e-3:
            return n
    return None


def set_beat(beat):
    h = _STATE.get("dawn")
    _STATE["seat_impression"].value = 1.0 if h is not None and beat == "accept" else 0.0
    if h is not None and beat in _STATE["poses"]:
        restore(h, _STATE["poses"][beat])
    hobo = _STATE.get("hobo")
    if hobo is not None:
        for o in [hobo] + list(hobo.children_recursive):
            o.hide_render = beat != "pack"
    premarket = beat in ("pre", "accept")
    for o in _STATE["packing_props"]:
        o.hide_render = beat not in ("pack", "packed")
    _STATE["duffel_zip"].value = float(beat == "packed")
    for o in _STATE["packed_zip"]:
        o.hide_render = beat != "packed"
    for o in _STATE["early_props"]:
        o.hide_render = not premarket
    for o in _STATE["closed_case"]:
        o.hide_render = beat not in ("window", "pre")
    shoulder = _STATE["early_shoulder"]
    shoulder.matrix_world = _STATE["accept_shoulder" if beat == "accept" else "row_shoulder"]
    tote = _STATE["early_tote"]
    tote.matrix_world = _STATE["accept_tote" if beat == "accept" else "row_tote"]
    held = _STATE["sheers"].get("held")
    straight = _STATE["sheers"].get("straight")
    if held is not None and straight is not None:
        held.hide_render = beat != "window"
        straight.hide_render = beat == "window"
    bpy.context.view_layer.update()


def apply_camera(name):
    cfg = CAMERAS.get(name, {})
    sc = bpy.context.scene
    set_beat(cfg.get("beat", "pack"))
    sc.cycles.sample_clamp_indirect = 3.0
    sc.cycles.blur_glossy = 0.5
    sc.cycles.transparent_max_bounces = 24
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH"),
                 ("denoising_input_passes", "RGB_ALBEDO_NORMAL")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    cam = sc.camera
    if cam is not None:
        cam.data.clip_start, cam.data.clip_end = 0.05, 20000.0
        cam.data.shift_x, cam.data.shift_y = cfg.get("shift_x", 0.0), cfg.get("shift_y", 0.0)
    for o in st.CEILING:
        o.visible_camera = not cfg.get("above_ceiling", False)
    bounce = bpy.data.objects["duvet_bounce"]
    if name == "accept" and _STATE["dawn"] is not None:
        # At the edge of the bed, the pale duvet returns the bedside lamp
        # into the hands holding the gift and the face looking down at it.
        bounce.location = (-0.51, -1.30, 0.78)
        aim = eye_centre(_STATE["dawn"]).lerp(bpy.data.objects["fx_accept"].location, 0.40)
        bounce.rotation_euler = (aim - bounce.location).to_track_quat("-Z", "Y").to_euler()
    else:
        bounce.matrix_world = _STATE["duvet_bounce_rest"]
    for n, base in _STATE.get("base", {}).items():
        o = bpy.data.objects.get(n)
        if o is not None:
            o.data.energy = base * TRIMS.get(name, {}).get(n, 1.0)
            if n == "lamp_spill":
                o.visible_glossy = name == "pack"
            if n in ("window_rim", "wall_return") and name != "window":
                o.data.energy = 0
            if n == "shoulder leather return" and name != "accept":
                o.data.energy = 0
            if n == "duffel zip return" and name != "overhead":
                o.data.energy = 0
    print(f"HOTEL camera {name}: beat {cfg.get('beat')}, ceiling {'see-through' if cfg.get('above_ceiling') else 'solid'}",
          flush=True)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        kw.setdefault("world", WORLD)
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


# ---------------------------------------------------------------- build

def _on_duvet(duvet, x, y):
    z = hp.surface_z([duvet, bpy.data.objects["runner"]], x, y)
    return (z if z is not None else st.BED["top"]) - SINK


def build(cast=True):
    st.CEILING.clear()
    duvet = st.build()
    wall = bpy.data.collections.new("Window warm wall")
    for name in ("wall_left", "wall_win_l", "wall_win_head"):
        wall.objects.link(bpy.data.objects[name])
    pos = Vector((-1.49, 0.96, 1.27))
    target = Vector((-2.02, 0.7, 1.52))
    return_light = sk.area_light("wall_return", pos, (0.30, 0.47), 15.0, (1.0, 0.41, 0.17), spread_deg=116,
                                 rot=(target - pos).to_track_quat("-Z", "Y").to_euler())
    return_light.visible_camera = False
    return_light.visible_glossy = False
    return_light.light_linking.receiver_collection = wall
    bpy.context.view_layer.update()
    rest = duvet.shape_key_add(name="Basis")
    seat = duvet.shape_key_add(name="Dawn at the bed edge")
    for vertex, loaded in zip(rest.data, seat.data):
        point = duvet.matrix_world @ vertex.co
        # Taper the displacement down the hanging fabric, clear of the bed frame.
        height = min(1.0, max(0.0, (point.z - 0.30) / 0.23))
        px, py = (point.x + 1.0) / 0.17, (point.y + 0.75) / 0.15
        radius = math.hypot(px, py)
        angle = math.atan2(py, px)
        basin = -0.060 * math.exp(-radius**2)
        rim = math.exp(-((radius - 1.22) / 0.32)**2)
        folds = 0.006 * math.cos(7 * angle + 0.48 * math.sin(3 * angle))
        loaded.co.z += (basin + rim * (0.011 + folds)) * height**2 * (3 - 2 * height)
    _STATE["seat_impression"] = seat
    city.build()
    room_objects = set(bpy.context.scene.objects)
    # the bags on the bed
    cx, cy, cturn, side = CASE
    case, cinfo = hp.open_suitcase((cx, cy, _on_duvet(duvet, cx, cy) - 0.004), cturn, lid_side=side)
    bx, by, bturn = BAG
    bag_h, bag = hp.extra_bag((bx, by, _on_duvet(duvet, bx, by + 0.15)), bturn, duvet)
    tx, ty, tturn = TOTE
    sheet = hp.tissue_sheet("tissue_under_tote", (tx - 0.01, ty + 0.01, st.BED["top"] + 0.02), math.radians(10), 0.42,
                            0.40, [duvet], seed=3, folds=28, angle=30, flatten=0.45, keep=0.55)
    tote_h, tote = hp.tote_flat((tx, ty, _on_duvet(duvet, tx, ty) + 0.004), tturn, [duvet])
    sx, sy, sturn = SATCHEL
    sat_h, sat = hp.bag_upright("handbag-satchel", (sx, sy, _on_duvet(duvet, sx, sy) + 0.004), sturn)
    # tissue: stuffing puffing from the tote's mouth, a loose sheet on the runner and fresh tissue with a rolled edge
    hp.tissue_sheet("tissue_tote_stuff", (tx - 0.11, ty, st.BED["top"] + 0.03), math.radians(80), 0.5, 0.36, [duvet, tote],
                    seed=8, folds=40, angle=45, flatten=0.45, keep=0.8, scrunch=0.42)
    hp.tissue_sheet("tissue_loose", (-0.36, -0.52, st.BED["top"] + 0.02), math.radians(30), 0.4, 0.32,
                    [duvet, bpy.data.objects["runner"]], seed=11, folds=40, angle=46, flatten=0.6, keep=0.7, scrunch=0.75)
    lid = bpy.data.objects["case_lid_mesh"]
    lc = lid.matrix_world.translation
    hp.tissue_sheet("tissue_lid", (lc.x + 0.05, lc.y - 0.04, lc.z + 0.05), math.radians(-80), 0.34, 0.26, [lid], seed=17,
                    folds=34, angle=42, flatten=0.55, keep=0.65, scrunch=0.7)
    hp.tissue_sheet("tissue_fresh", (-0.31, -0.24, st.BED["top"] + 0.03), math.radians(8), 0.27, 0.19,
                    [duvet, bpy.data.objects["runner"]], seed=15, folds=23, angle=33, flatten=0.60, keep=0.82, rolled_edge=True)
    _STATE["packing_props"] = list(set(bpy.context.scene.objects) - room_objects)
    zip_key, zip_parts, pull = hp.half_closed_duffel(bag_h, bag)
    _STATE["duffel_zip"], _STATE["packed_zip"] = zip_key, zip_parts
    zip_receivers = bpy.data.collections.new("Packed duffel and zip")
    for part in [bag, *zip_parts]:
        zip_receivers.objects.link(part)
    pos = Vector((-1.64, -0.34, 1.40))
    zip_return = sk.area_light("duffel zip return", pos, (0.34, 0.24), 9.0, (1.0, 0.75, 0.51), spread_deg=72,
                               rot=(pull - pos).to_track_quat("-Z", "Y").to_euler())
    zip_return.visible_camera = zip_return.visible_glossy = False
    zip_return.light_linking.receiver_collection = zip_receivers
    before_early = set(bpy.context.scene.objects)
    closed_case, trio = premarket_props(duvet)
    early_tote, tote_mesh = trio[1]
    shoulder, _ = trio[2]
    _STATE["early_shoulder"] = shoulder
    _STATE["row_shoulder"] = shoulder.matrix_world.copy()
    shoulder.location = (-0.70, 0.36, _on_duvet(duvet, -0.70, 0.36))
    shoulder.rotation_euler.z = math.radians(29)
    bpy.context.view_layer.update()
    _STATE["accept_shoulder"] = shoulder.matrix_world.copy()
    gift_only = bpy.data.collections.new("Acceptance shoulder bag")
    for part in shoulder.children_recursive:
        if part.type == "MESH":
            gift_only.objects.link(part)
    card = Vector((-0.24, 0.03, 1.05))
    target = Vector((-0.70, 0.36, 0.72))
    gift_return = sk.area_light("shoulder leather return", card, (0.26, 0.30), 4.8, (1.0, 0.57, 0.38), spread_deg=83,
                                 rot=(target - card).to_track_quat("-Z", "Y").to_euler())
    gift_return.visible_camera = gift_return.visible_glossy = False
    gift_return.light_linking.receiver_collection = gift_only
    shoulder.matrix_world = _STATE["row_shoulder"]
    _STATE["early_props"] = list(set(bpy.context.scene.objects) - before_early)
    case_root = closed_case.parent
    _STATE["closed_case"] = [case_root] + list(case_root.children_recursive)
    _STATE["early_tote"] = early_tote
    _STATE["row_tote"] = early_tote.matrix_world.copy()
    _STATE["accept_tote"] = early_tote.matrix_world.copy()
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    # the shoulder bag (in Dawn's hand in the packing beat)
    hobo = hp.load_baked("handbag-shoulder")
    hobo_apex = hp.apex(hobo)
    hobo_h = hp.holder("hobo_held", (bx, by - 0.03, 1.0), HOBO_TURN, [hobo])
    _STATE.update(cast=[], dawn=None, poses={}, hobo=hobo_h, sheers={})
    mouth = bag_h.matrix_world @ Vector((-0.018, 0.002, 0.25))
    if cast:
        h = dawn()
        _STATE["dawn"] = h
        _STATE["cast"] = [h] + list(h.children_recursive)
        # the window beat: pose, then hang the held sheer through her left hand
        _STATE["poses"]["window"] = pose_window(h)
        # The thumb and index pads are 2.6 mm apart in this pinch. Anchor the
        # folded voile between their posed distal bones.
        rig = rigged.rig_of(h)
        thumb = rig.pose.bones["DEF-thumb.03.L"].matrix @ Vector((0.0041, 0.0093, 0.0091))
        index = rig.pose.bones["DEF-f_index.03.L"].matrix @ Vector((0.0075, 0.0088, 0.0048))
        pinch = rig.matrix_world @ ((thumb + index) * 0.5)
        _STATE["sheers"]["held"] = st.curtains(hand=tuple(pinch))
        bpy.data.objects["fx_window"].location = eye_centre(h)
        # the packing beat: the strap's apex under her closed fingers, the bag's base just entering the mouth
        grip = mouth + Vector((0, 0.015, hobo_apex.z - 0.039))
        steady = bag_h.matrix_world @ Vector((0.255, -0.09, 0.0))
        steady.z = hp.surface_z([bag], steady.x, steady.y) + 0.023
        _STATE["poses"]["pack"] = pose_pack(h, grip, steady)
        pc = palm_centre(h, -1)
        n, a = palm_normal(h, -1)
        strap = pc + (n * 0.022 if n is not None else Vector((0, 0, -0.022))) + a * 0.028
        R = Matrix.Rotation(math.radians(HOBO_TURN), 3, "Z")
        hobo_h.location = strap - R @ hobo_apex
        bpy.context.view_layer.update()
        bpy.data.objects["fx_pack"].location = (strap.x, strap.y, strap.z - hobo_apex.z * 0.40)
        print(f"HOTEL shoulder bag: strap at {tuple(round(v, 3) for v in strap)}, base z {strap.z - hobo_apex.z:.3f}, "
              f"mouth z {mouth.z:.3f}", flush=True)
        zip_key.value = 1
        bpy.context.view_layer.update()
        steady = bag_h.matrix_world @ Vector((0.20, -0.13, 0))
        steady.z = hp.surface_z([bag], steady.x, steady.y) + 0.021
        _STATE["poses"]["packed"] = pose_packed(h, pull, steady)
        zip_key.value = 0
        premarket_poses(h, duvet, closed_case, early_tote, tote_mesh)
        _STATE["accept_tote"] = early_tote.matrix_world.copy()
        # the straight sheer for the other beats
        straight = _straight_sheer()
        _STATE["sheers"]["straight"] = straight
    else:
        st.curtains(hand=None)
        hobo_h.location = mouth - Vector((0, 0, 0.065))
    bpy.context.view_layer.update()
    _STATE["duvet_bounce_rest"] = bpy.data.objects["duvet_bounce"].matrix_world.copy()
    _STATE["base"] = {o.name: o.data.energy for o in bpy.data.objects if o.type == "LIGHT"}
    install_hook()


def _straight_sheer():
    """The left sheer hanging straight (drawn to x -0.52), for the beats where Dawn is not at the window."""
    m = st.M
    return st.pleated("sheer_l_straight", lambda z: (st.W0 + 0.85, st.SHEER_Y), lambda z: (-0.52, st.SHEER_Y), m["sheer"],
                      0.015, st.H - 0.02, 9, 0.022)
