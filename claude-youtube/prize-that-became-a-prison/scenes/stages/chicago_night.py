"""Stage: Chicago at night, the life before (Ch 01 "A woman who loved to travel").

A high-floor apartment at night: a wall of glass onto a procedural night city (chicago_night_city: layered dark
towers with scattered lit windows, a downtown cluster, the grid of streets below as rivers of light, nothing
recognisable), a walnut console desk with a warm table lamp (the film's warmest light), the entry door with the
corridor's light under it, and Dawn's suitcase standing by the door, handle up, ready for the trip. Dawn
(people.dawn()) stands at the glass with a mug held in both hands at chest height, her weight on one leg, looking
out at the downtown towers: calm, hopeful, ordinary. A second small lamp on the side table frames the cool city
between two warm islands and rims her warm.

The script asks not to invent an image of Dawn at work, so she is at home, and the "reception desk" of the
visual notes becomes a console desk (the room's lit island).

Cameras (beat ch01):
  wide      from the room's far corner: the lamp-lit console and the door with the suitcase on the left, the glass
            wall and the city across the frame, Dawn small at the window on the right third
  window    behind Dawn, a little to her left and low: her head and shoulders dark against the horizon glow, a warm
            edge from the side lamp on her far side
  suitcase  a low, controlled close-up: the packed case by the door, the city soft in the glass beyond

Every camera gets clip_end 20 km in apply_camera() (setkit's 1000 m default cut off the sky and the downtown).

    <bpy python> -I scenes/shoot.py -- chicago_night <cam> out.png [--nocast]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import cast as castkit  # noqa: E402
import people  # noqa: E402
import props  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import chicago_night_city as city  # noqa: E402
import chicago_night_set as st  # noqa: E402

EXPOSURE = -0.5

DAWN = (0.51, 1.93, 158.0)                 # where she stands (footprint) and her facing: out of the window (+Y)
MUG = (0.08, 0.34, 1.25)                   # the mug in both hands at chest height: her frame (x right, y forward, z up)
LOOK = (-470.0, 1650.0, 190.0)             # the downtown cluster, the eyes lifted a few degrees: looking out, hopeful
# weight on her right leg: hips 2.5 cm over it and 6 mm down, the free (left) foot 6 cm forward and turned out
STANCE = dict(hip_side=0.025, hip_down=0.004, hip_tilt=4.0, foot_fwd=0.06, foot_out=10.0)

FOCUS = {
    "fx_dawn": (DAWN[0], DAWN[1], 1.2),
    "fx_head": (DAWN[0] - 0.05, DAWN[1], 1.55),
    "fx_case": (st.CASE[0], st.CASE[1], 0.42),
}

CAMERAS = {
    # Ch 01: the whole room from its far corner at a standing eye line: the warm lamp island and the door with the
    # suitcase on the left, the glass wall and the night city across, Dawn small at the window on the right third
    # (level camera, framed down with lens shift so the door casing and the mullions stay vertical)
    "wide": dict(loc=(2.7, -2.42, 1.6), aim=(-1.15, 1.75, 1.6), lens=24, focus="fx_dawn", fstop=5.6, beat="ch01",
                 exposure=0.5, shift_y=-0.085, glass_reflection=0.06),
    # Ch 01: behind her, a little to her left, low: the horizon glow crosses her shoulder blades, her head and
    # shoulders stand against the glow (the +10.5..+19.5 degree clear wedge of the skyline)
    "window": dict(loc=(0.05, 0.22, 1.20), aim=(0.15, 2.45, 1.32), lens=28, focus="fx_head", fstop=2.8, beat="ch01",
                   exposure=0.1, glass_reflection=0.06),
    # Ch 01: low and close: the packed case by the door, the city soft in the glass beyond
    "suitcase": dict(loc=(-1.0, -0.95, 0.55), aim=(-2.75, 1.7, 0.47), lens=40, focus="fx_case", fstop=2.0, beat="ch01",
                     exposure=-1.05, glass_reflection=0.06),
    "profile": dict(loc=(-1.21, 1.57, 1.44), aim=(0.52, 2.07, 1.37), lens=64, focus="fx_head",
                    fstop=2.0, beat="ch01", exposure=0.05, glass_reflection=0.04),
}
TRIMS = {"wide": {"case_card": 0.0, "entry_light": 0.6}, "window": {"lamp_bounce": 0.0},
         "profile": {"dawn_edge": 0.75}, "suitcase": {"lamp_bounce": 0.0, "dawn_edge": 0.0}}
# objects (and lights) kept out of glossy rays per camera. In the window shot her own reflection would stand beside
# her as a ghost head (the cast is hidden from glossy there) and the lamps and the entry can would float in the glass
# as bright discs; in the suitcase shot the console lamp would stand among the towers. The wide keeps them: its floor
# and walnut need the lamps' highlights, and the glass reflects at only 0.2 of its Fresnel.
GLOSSY_CTRL = ("lamp_shade", "lamp_bulb", "lamp_light", "side_lamp_", "can_lens")
NO_GLOSSY = {"window": ("lamp_shade", "lamp_bulb", "lamp_light", "side_lamp_", "can_lens"),
             "suitcase": ("lamp_shade", "lamp_bulb", "lamp_light", "can_lens")}
_STATE = {"cast": [], "dawn": None}


# ---------------------------------------------------------------- Dawn: finish, place, pose (from inspection_room)

def cloth(holder, item, rough=0.9, bump=0.25):
    """A garment finished as plain matt cloth: the normal map (whose fine stripes shimmer in wide shots) dropped
    for a woven-noise bump, almost no specular."""
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


def hands_stone(holder, value=0.36):
    """The hands a shade darker stone than the face, blended by the hand's deform weights (no seam)."""
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
    castkit.relax_sculpted_hair(h)
    n = castkit.blouse_v(h, rgb=(0.2, 0.19, 0.18), depth=0.42, width=0.14)
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
    hair = bpy.data.materials.get(f"hair_{h.name}")
    if hair and hair.use_nodes:
        shader = next(n for n in hair.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        shader.inputs["Roughness"].default_value = 0.76
        shader.inputs["Specular IOR Level"].default_value = 0.18
    hands_stone(h)
    print(f"CHICAGO Dawn: blouse {n} vertices", flush=True)
    return h


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


def _w(local):
    """Her frame (x to her right, y forward, z up) to world, for where she stands."""
    x, y, f = DAWN
    a = math.radians(f)
    fwd = Vector((math.sin(a), -math.cos(a), 0.0))        # built facing -Y, turned by f
    right = Vector((-fwd.y, fwd.x, 0.0)) * -1.0
    return Vector((x, y, 0.0)) + right * local[0] + fwd * local[1] + Vector((0, 0, local[2]))


CURL = {"R": {"f_index": (26, 34), "f_middle": (30, 38), "f_ring": (32, 40), "f_pinky": (34, 42), "thumb": (6, 16)},
        "L": {"f_index": (24, 32), "f_middle": (28, 36), "f_ring": (30, 38), "f_pinky": (32, 40), "thumb": (6, 14)}}


def stance(holder):
    """Weight on the right leg: the torso control moved over the standing leg and a touch down (the knees soften),
    the free left foot a little forward and turned out. Armature space: the figure faces -Y, +X is her left."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    k = 1.0 / (rig.scale[0] * holder["ks"])
    if "torso" in pb:
        m = pb["torso"].matrix.copy()
        pb["torso"].matrix = Matrix.Translation((-STANCE["hip_side"] * k, 0.0, -STANCE["hip_down"] * k)) @ m
        bpy.context.view_layer.update()
    if "hips" in pb:      # the pelvis tilts: the free (left) hip drops, so that knee softens and the standing leg stays long
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


def knee_angles(holder):
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    out = {}
    for k in ("L", "R"):
        a, b = pb.get(f"DEF-thigh.{k}"), pb.get(f"DEF-shin.{k}")
        if a is None or b is None:
            a, b = pb.get(f"thigh_ik.{k}"), pb.get(f"shin_ik.{k}")
        if a is None or b is None:
            continue
        va, vb = (a.tail - a.head).normalized(), (b.tail - b.head).normalized()
        out[k] = round(math.degrees(va.angle(vb)), 1)
    return out


def ik_arm(holder, side, palm, pole=(0.45, 0.3, -1.0)):
    """Aim the FK arm so the palm's centre lands on `palm` (world): an analytic two-bone solve in armature space,
    the elbow bent toward `pole` (out to her side, back and down), the wrist straight."""
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
    hb = pb[f"hand_fk.{k}"]
    got = rig.matrix_world @ (hb.head + (hb.tail - hb.head) * 0.5)
    return (got - Vector(palm)).length


def curl_fingers(holder):
    for side, fingers in CURL.items():
        rigged.articulate_hand(holder, side, {digit: (knuckle, joint, joint)
                                             for digit, (knuckle, joint) in fingers.items()})


def pose_dawn(h, mug_local=MUG):
    """Standing at the glass, the mug held in both hands at chest height, her weight on one leg, her head turned
    toward the downtown towers and lifted a touch: calm, looking out, hopeful."""
    x, y, f = DAWN
    h.location = (x, y, 0.0)
    h.rotation_euler = (0, 0, math.radians(f))
    bpy.context.view_layer.update()
    base = {"chest": (-2.0, -4.0), "neck": (0.0, 0.0), "fingers": 0}
    mug = _w(mug_local)
    right = (_w((1, 0, 0)) - _w((0, 0, 0))).normalized()
    fwd = (_w((0, 1, 0)) - _w((0, 0, 0))).normalized()
    pose = dict(base)
    d, t = -3.0, 0.0
    tgt = Vector(LOOK)
    for _ in range(4):
        pose["head"] = (d, t)
        rigged.pose_figure(h, pose)
        e, fw = eye_centre(h), head_forward(h)
        g = (tgt - e).normalized()
        dy = math.degrees(math.atan2(g.y, g.x) - math.atan2(fw.y, fw.x))
        dy = (dy + 180) % 360 - 180
        dp = math.degrees(math.asin(max(-1, min(1, fw.z))) - math.asin(max(-1, min(1, g.z))))
        t = max(-40.0, min(40.0, t + dy))
        d = max(-15.0, min(30.0, d + dp))
    pose["head"] = (round(d, 1), round(t, 1))
    rigged.pose_figure(h, pose)
    stance(h)
    # both palms on the mug's sides, a little behind its centre line (the fingers wrap forward round it)
    er = ik_arm(h, -1, mug + right * 0.052 - fwd * 0.008)
    el = ik_arm(h, 1, mug - right * 0.052 - fwd * 0.008)
    # each palm turned in to the mug (forearm roll), the fingers curled round it
    rolls = []
    for side, bone, want in ((-1, "forearm_fk.R", -right), (1, "forearm_fk.L", right)):
        n, a = palm_normal(h, side)
        phi = 0.0
        if n is not None:
            c = a.cross(n)
            phi = math.degrees(math.atan2(c.dot(want), n.dot(want) - a.dot(n) * a.dot(want)))
            _roll(h, bone, max(-110.0, min(110.0, phi)))
        rolls.append(round(phi))
    curl_fingers(h)
    lo = ground(h)
    print(f"CHICAGO Dawn pose: palms off the mug R {er * 1000:.0f} mm L {el * 1000:.0f} mm, rolls {rolls}, "
          f"head {pose['head']}, knees {knee_angles(h)}, grounded by {lo * 1000:+.0f} mm", flush=True)
    return mug - Vector((0.0, 0.0, lo))


def mug_prop(c):
    m = sk.mat("mug glaze", (0.62, 0.58, 0.52), 0.3)
    r, hgt = 0.041, 0.095
    st.lathe("mug", [(0.0, 0.004), (r - 0.004, 0.0), (r, 0.006), (r, hgt), (r - 0.004, hgt), (r - 0.004, 0.01), (0.0, 0.01)],
             (c.x, c.y, c.z - hgt / 2), m, segs=40)
    # the handle points forward, away from her (between her fingers)
    fwd = (_w((0, 1, 0)) - _w((0, 0, 0))).normalized()
    p0 = c + fwd * (r - 0.004) + Vector((0, 0, 0.028))
    p1 = c + fwd * (r + 0.025) + Vector((0, 0, 0.0))
    p2 = c + fwd * (r - 0.004) + Vector((0, 0, -0.028))
    st.tube("mug_handle", [tuple(p0), tuple(p0 + fwd * 0.02), tuple(p1), tuple(p2 + fwd * 0.02), tuple(p2)], 0.006, m, res=4)


# ---------------------------------------------------------------- per camera

def apply_camera(name):
    sc = bpy.context.scene
    sc.cycles.sample_clamp_indirect = 3.0
    sc.cycles.blur_glossy = 0.5
    sc.cycles.transparent_max_bounces = 16
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH"),
                 ("denoising_input_passes", "RGB_ALBEDO_NORMAL")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    # The 15 km sky dome uses the shared camera range.
    cam = sc.camera
    if cam is not None:
        cam.data.clip_start = 0.05
        cam.data.shift_y = CAMERAS.get(name, {}).get("shift_y", 0.0)
    # the glass's reflection strength: in the wide even 0.2 of Fresnel showed the console lamp's spill on the wall
    # as an orange smear among the towers
    g = bpy.data.materials.get("window glass")
    if g is not None and "reflection" in g.node_tree.nodes:
        g.node_tree.nodes["reflection"].inputs[1].default_value = CAMERAS.get(name, {}).get("glass_reflection", 0.2)
    for o in _STATE.get("cast", []):
        o.visible_glossy = name not in ("window", "profile")
    hide = NO_GLOSSY.get("window" if name == "profile" else name, ())
    for o in bpy.data.objects:
        if o.name.startswith(GLOSSY_CTRL):
            o.visible_glossy = not o.name.startswith(hide)
    profile = name == "profile"
    if _STATE["dawn"] and profile != _STATE["profile_pose"]:
        centre = pose_dawn(_STATE["dawn"], (-0.09, 0.34, 1.26) if profile else MUG)
        for ob, base in _STATE["mug_parts"]:
            ob.location = base + centre - _STATE["mug_centre"]
        _STATE["profile_pose"] = profile
        bpy.context.view_layer.update()
    trims = dict(TRIMS.get(name, {}), profile_fill=1.0 if profile else 0.0)
    for n, base in _STATE.get("base", {}).items():
        o = bpy.data.objects.get(n)
        if o is not None:
            o.data.energy = base * trims.get(n, 1.0)
    print(f"CHICAGO camera {name}: clip {cam.data.clip_end if cam else None}, shift_y "
          f"{cam.data.shift_y if cam else None}, trims {trims}", flush=True)


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
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def build(cast=True):
    st.M.clear()
    st.build(props)
    city.build()
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    _STATE.update(cast=[], dawn=None, profile_pose=False)
    if cast:
        h = dawn()
        mug = pose_dawn(h)
        mug_prop(mug)
        _STATE["mug_centre"] = mug.copy()
        _STATE["mug_parts"] = [(bpy.data.objects[n], bpy.data.objects[n].location.copy()) for n in ("mug", "mug_handle")]
        _STATE["dawn"] = h
        _STATE["cast"] = [h] + list(h.children_recursive)
        bpy.data.objects["fx_head"].location = eye_centre(h) + Vector((0, 0, 0.0))
    _STATE["base"] = {o.name: o.data.energy for o in bpy.data.objects if o.type == "LIGHT"}
    install_hook()
