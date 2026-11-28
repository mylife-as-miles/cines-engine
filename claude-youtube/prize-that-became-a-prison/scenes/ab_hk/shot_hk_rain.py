"""Shot AB-HK: Dawn walks alone up a Hong Kong street at night in light rain, a paper carrier in each hand; the camera
tracks her on a slow, low crane from the road. One 4 s shot (96 frames at 24 fps plus 10-frame handles: frames
1-116, the cut uses 11-106), built for the Cycles calibration render on the GPU box.

    <bpy python> -I scenes/ab_hk/shot_hk_rain.py [--out out/ab_hk/blend/AB_HK.blend]
                 [--save-base <stage.blend>] [--base <stage.blend>] [--upto N]

What it is made of (every part rebuilt from code, every random choice seeded, everything a function of the frame):
- the set: scenes/stages/hongkong_street.py (Codex's stage, imported and built with cast=False, never edited): the tram
  street canyon, blank lit signs, wet asphalt and pavers with standing water, the boutique, haze. Its reds (the
  magenta sign colour, red goods and laundry) are moved off red in this scene only: red belongs to the tote's seam;
- Dawn: people.dawn() finished as the stage finishes her (hongkong_street.dawn()), and the stage's two paper carriers
  (hongkong_street.make_bags()). No other figure: the organizers are never shown;
- the walk: shot B's procedural gait (scenes/anim_tests/shot_b_walk.py, imported, its constants set for this street):
  IK feet planted for each stance (no slide), the pelvis bounded by the legs' reach, both arms carrying, closed fists;
  each carrier hangs from its fist as a damped pendulum driven by the hand's motion;
- rain: seeded drops in the street canyon, each falling at its own speed with a little wind, positions a closed-form
  function of the frame in Geometry Nodes (no particle cache to bake); every column of rain stops at the highest
  thing over it (signs, canopies, balconies), so nothing rains under cover. The streaks are Cycles' motion blur of
  real drops (refractive water with a little translucency, so they catch the neon);
- ripples: rings from rain impacts in the standing water of the stage's road and pavement (added to its materials in
  this scene only), a function of the frame;
- steam: a drifting plume from a manhole in the road behind her, and the stage's thin street haze;
- camera: a low dolly-crane on the road beside the kerb, tracking her at her speed and rising 0.45 to 1.0 m.

Render settings are scenes/anim_tests/common.film_settings (1920x1080, Cycles 128 adaptive samples, denoiser, AgX,
180-degree motion blur), rendered by scenes/anim_tests/render.py. Grade A is applied afterwards by encode.py.
"""
import colorsys
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCENES = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(SCENES, "anim_tests"))
import common as C  # noqa: E402  (puts noir-kit, scenes and scenes/stages on the path, imports bpy)
import shot_b_walk as B  # noqa: E402

import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

NAME = "AB_HK"
OUT = os.path.join(C.PROD, "out", "ab_hk")
BLEND = os.path.join(OUT, "blend", NAME + ".blend")
PZ = 0.14                        # pavement top (hongkong_street_set.PZ)

# ---- the walk (shot B's gait, set for an unhurried stroll with shopping)
PATH_X = 5.55                    # her line on the right-hand pavement (kerb face at x 4.6, shopfronts at 7.2)
SPEED = 1.0                      # m/s
CADENCE = 1.74                   # steps per second
END_Y = 15.25                    # hips at the last frame: entering the light of the doorway before the boutique
ARM_OUT = (13.0, 9.0)            # upper arm and forearm out from the side (deg), so the carriers clear the skirt
ELBOW = 7.0                      # a carrying arm is nearly straight
SWING = 3.6                      # arm swing amplitude (deg): carriers damp it
GLANCE = -13.0                   # head turn toward the shop windows on her right over the second half (deg)

# ---- the camera
LENS, FSTOP = 32.0, 2.8

# ---- rain
RAIN_COUNT = 15000
RAIN_TOP = 12.5
RAIN_SPEED = (5.2, 7.4)          # m/s: light rain, drops of about 1 mm
WIND = (0.45, -0.12)             # m/s across and along the street
RAIN_SEED = 314


def configure_gait():
    """Shot B's gait functions read these module constants at call time."""
    B.PATH_X, B.SPEED, B.CADENCE, B.END_Y = PATH_X, SPEED, CADENCE, END_Y
    B.STEP_W, B.TOE_OUT, B.DUTY = 0.050, 7.0, 0.62
    B.STRIDE_T = 2.0 / CADENCE
    B.STRIDE_L = SPEED * B.STRIDE_T


# ------------------------------------------------------------------ set and cast

def build_set():
    import setkit as sk
    sk.reset()
    import hongkong_street as hk
    import time
    t0 = time.time()
    hk.build(cast=False)
    print(f"AB stage hongkong_street (no cast) built in {time.time() - t0:.0f} s", flush=True)
    d = hk.dawn()
    bags = hk.make_bags()
    # the stage's doorway spill also lights Dawn and her carriers as she passes (as in its own build with the cast)
    rec = bpy.data.collections.get("Doorway light on Dawn and pavement")
    if rec is not None:
        for holder in [d, *bags.values()]:
            for o in holder.children_recursive:
                if o.type in ("MESH", "CURVE") and o.name not in rec.objects:
                    rec.objects.link(o)
    d["bag_R"], d["bag_L"] = bags["R"].name, bags["L"].name   # the holders (the meshes took the plain names)
    C.remove_stage_cameras()
    for n in ("fx_dawn", "fx_bags"):
        if n in bpy.data.objects:
            bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
    print(f"AB cast: {d.name} and carriers {sorted(b.name for b in bags.values())} built in {time.time() - t0:.0f} s",
          flush=True)
    return d, bags


def no_red():
    """Red is the tote seam's colour, reserved for it: move every strongly red hue in the set (sign colours, goods,
    laundry: face attributes and material colours) to amber or violet. Prints what it changed."""
    def fix(rgb):
        r, g, b = rgb[:3]
        h, s, v = colorsys.rgb_to_hsv(max(r, 0), max(g, 0), max(b, 0))
        if v < 0.02 or s < 0.38 or (0.055 <= h <= 0.89):
            return None
        h2 = 0.075 if h < 0.5 else 0.775                 # red-orange -> amber-brown, magenta/rose -> violet
        s2 = min(s, 0.85) if h < 0.5 else s
        return colorsys.hsv_to_rgb(h2, s2, v)
    changed = {}
    for me in bpy.data.meshes:
        for at in me.attributes:
            if at.data_type not in ("FLOAT_COLOR", "BYTE_COLOR") or at.name.startswith("."):
                continue
            n = len(at.data)
            if not n:
                continue
            flat = [0.0] * (4 * n)
            at.data.foreach_get("color", flat)
            k = 0
            for i in range(n):
                f = fix(flat[4 * i:4 * i + 3])
                if f is not None:
                    flat[4 * i:4 * i + 3] = f
                    k += 1
            if k:
                at.data.foreach_set("color", flat)
                changed[f"{me.name}.{at.name}"] = k
    for m in bpy.data.materials:
        if not (m.use_nodes and m.node_tree):
            continue
        for node in m.node_tree.nodes:
            for sock in node.inputs:
                if sock.type == "RGBA" and not sock.is_linked:
                    f = fix(tuple(sock.default_value))
                    if f is not None:
                        sock.default_value = (*f, sock.default_value[3])
                        changed[f"{m.name}/{node.name}.{sock.name}"] = 1
    print(f"AB no red: {sum(changed.values())} colours moved off red in {len(changed)} places "
          f"{sorted(changed)[:8]}", flush=True)


def look():
    """The stage's per-camera settings (hongkong_street.apply_camera) for a street-level walking camera, by name, so a
    dev rebuild from a saved base gets exactly the same light: the view-specific bounce lights off, the doorway spill
    trimmed, a thin haze, the sky strip dim, the glass at its street values, and the stage's sampling settings."""
    view_only = ("display shelf return", "boutique pavement spill", "display end bounce", "display far bounce",
                 "display lip bounce", "left pavement return", "reflected cheek")
    trims = {"boutique door spill": 0.55}
    for o in bpy.data.objects:
        if o.type != "LIGHT":
            continue
        if "base_energy" not in o.keys():
            o["base_energy"] = o.data.energy
        o.data.energy = 0.0 if o.name in view_only else o["base_energy"] * trims.get(o.name, 1.0)
    sky = bpy.data.materials.get("night sky")
    if sky is not None and "sky exposure" in sky.node_tree.nodes:
        sky.node_tree.nodes["sky exposure"].inputs[1].default_value = 0.35
    hz = bpy.data.objects.get("haze")
    if hz is not None:
        pv = next(n for n in hz.data.materials[0].node_tree.nodes if n.type == "PRINCIPLED_VOLUME")
        pv.inputs["Density"].default_value = 0.0026
        hz.hide_render = False
    gl = bpy.data.materials.get("shop glass")
    if gl is not None and "refl" in gl.node_tree.nodes:
        gl.node_tree.nodes["refl"].inputs["To Min"].default_value = 0.07
        gl.node_tree.nodes["refl"].inputs["To Max"].default_value = 1.0
        if "glass smudges" in gl.node_tree.nodes:
            gl.node_tree.nodes["glass smudges"].inputs["To Min"].default_value = 0.02
            gl.node_tree.nodes["glass smudges"].inputs["To Max"].default_value = 0.09
    sc = bpy.context.scene
    sc.cycles.sample_clamp_indirect = 3.0
    sc.cycles.blur_glossy = 0.5
    sc.cycles.transparent_max_bounces = 16
    sc.cycles.max_bounces = 6
    sc.cycles.transmission_bounces = 6
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH"),
                 ("denoising_input_passes", "RGB_ALBEDO_NORMAL")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass


# ------------------------------------------------------------------ the walk

def walk(d, frames):
    """Shot B's gait on Dawn's rig with both arms carrying. Posed with the holder at z = 0 (the gait's floor), then
    raised onto the pavement. Returns the world grip (fist hollow) of each hand per frame, at pavement height."""
    import rigged as rg
    rig = bpy.data.objects[d["rig"]]
    pb = rig.pose.bones
    d.location = (PATH_X, B.hip_y(0.0), 0.0)
    d.rotation_euler = (0, 0, math.pi)                   # faces +Y, up the street
    bpy.context.view_layer.update()
    for b in pb:
        b.matrix_basis = Matrix.Identity(4)
    for k in ("L", "R"):
        pb[f"thigh_parent.{k}"]["IK_FK"] = 0.0
        pb[f"upper_arm_parent.{k}"]["IK_FK"] = 1.0
    bpy.context.view_layer.update()

    shoe_ob = bpy.data.objects[d.name + "_shoes04"]
    mods = [(m, m.show_viewport) for m in shoe_ob.modifiers]
    for m, _ in mods:
        m.show_viewport = m.type == "ARMATURE"
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = shoe_ob.evaluated_get(dg)
    me = ev.to_mesh()
    shoe = {"L": [], "R": []}
    for v in me.vertices:
        p = ev.matrix_world @ v.co
        shoe["R" if p.x > d.location.x else "L"].append(p)
    ev.to_mesh_clear()
    for m, sv in mods:
        m.show_viewport = sv
    feet = {k: B.Foot(rig, k, shoe) for k in ("L", "R")}

    strikes = B.heel_strikes()
    plants = B.anchors(strikes)
    leg_len = (pb["thigh_ik.L"].length + pb["MCH-shin_ik.L"].length) * 0.995
    meshes = [o for o in d.children_recursive if o.type == "MESH"]
    saved = {(o.name, i): md.show_viewport for o in meshes for i, md in enumerate(o.modifiers)}
    for o in meshes:
        for md in o.modifiers:
            md.show_viewport = False
    inv = rig.matrix_world.inverted()
    inv3 = inv.to_3x3()
    hip_rest = (rig.matrix_world @ rig.data.bones["torso"].matrix_local).translation.copy()
    tor_rest = rig.data.bones["torso"].matrix_local.copy()

    def spin(bone, rx=0.0, ry=0.0, rz=0.0):
        b = pb[bone]
        R = (Matrix.Rotation(math.radians(rz), 3, "Z") @ Matrix.Rotation(math.radians(ry), 3, "Y")
             @ Matrix.Rotation(math.radians(rx), 3, "X"))
        Ra = (inv3 @ R @ inv3.inverted()).to_4x4()
        h = b.matrix.translation.copy()
        b.matrix = Matrix.Translation(h) @ Ra @ Matrix.Translation(-h) @ b.matrix
        bpy.context.view_layer.update()

    states = {f: {k: B.foot_state(feet[k], plants[k], C.t_of(f)) for k in ("L", "R")} for f in frames}
    n = len(frames)
    t_end = C.t_of(frames[-1])

    def glance(t):
        return GLANCE * C.smoother((t - 0.45 * t_end) / (0.4 * t_end))

    def pose(f, z):
        t = C.t_of(f)
        ph = ((t - strikes["L"][3]) / B.STRIDE_T) % 1.0
        w = 2 * math.pi * ph
        for b in pb:
            b.matrix_basis = Matrix.Identity(4)
        x = PATH_X - 0.015 * math.sin(w + 0.55)
        pb["torso"].matrix = Matrix.Translation(inv3 @ (Vector((x, B.hip_y(t), z)) - hip_rest)) @ tor_rest
        bpy.context.view_layer.update()
        spin("torso", rx=-2.5)
        spin("hips", ry=2.6 * math.sin(w), rz=-4.0 * math.cos(w))
        spin("chest", rz=4.2 * math.cos(w))
        spin("head", rx=2.0, rz=-1.4 * math.cos(w) + glance(t))
        for k in ("L", "R"):
            F, _, _, _ = states[f][k]
            pb[f"foot_ik.{k}"].matrix = inv @ F
        bpy.context.view_layer.update()
        return w

    def reach_excess():
        worst = -1.0
        for k in ("L", "R"):
            hip_j = rig.matrix_world @ pb[f"thigh_ik.{k}"].head
            ank = rig.matrix_world @ pb[f"foot_ik.{k}"].head
            worst = max(worst, (ank - hip_j).length - leg_len)
        return worst

    # pass 1: the hip height each frame may have (the design bob, lowered where a leg could not reach)
    z_design, z_ok = [], []
    for f in frames:
        t = C.t_of(f)
        ph = ((t - strikes["L"][3]) / B.STRIDE_T) % 1.0
        z = hip_rest.z - 0.028 + 0.015 * math.cos(2 * (2 * math.pi * ph) - 2 * math.pi * 0.31)
        z_design.append(z)
        for _ in range(3):
            pose(f, z)
            e = reach_excess()
            if not e > 0:
                break
            z -= e + 0.002
        z_ok.append(z)
    zm = [min(z_ok[max(0, i - 2):i + 3]) for i in range(n)]
    zs = [sum(zm[max(0, min(n - 1, i + j))] * wgt for j, wgt in zip(range(-2, 3), (0.1, 0.2, 0.4, 0.2, 0.1)))
          for i in range(n)]
    z_final = [min(a, b) for a, b in zip(zs, z_ok)]
    lowered = sum(1 for a, b in zip(z_design, z_final) if b < a - 0.0005)
    print(f"AB walk: hip height {min(z_final):.3f}..{max(z_final):.3f} m; lowered for reach on {lowered} of {n} "
          "frames", flush=True)

    # pass 2: the full pose, both arms carrying
    record = {}
    grips = {"L": [], "R": []}
    curl = {"L": 1.0, "R": 1.0}
    for fi, f in enumerate(frames):
        w = pose(f, z_final[fi])
        for k in ("L", "R"):
            F, toeQ, _, _ = states[f][k]
            if toeQ is not None:
                pb[f"toe_ik.{k}"].matrix = inv @ toeQ @ feet[k].toe_rest
        s = -math.cos(w - 0.4)                               # -1 at the left heel strike: left arm back
        for side, sgn, sw in (("L", 1, s), ("R", -1, -s)):
            fwd = 2.5 + SWING * sw
            rg._aim(rig, f"upper_arm_fk.{side}", rg._dir(0, fwd, sgn, ARM_OUT[0]))
            rg._aim(rig, f"forearm_fk.{side}", rg._dir(0, fwd + ELBOW, sgn, ARM_OUT[1]))
        bpy.context.view_layer.update()
        B.grip_hand(rig, inv, "R", Vector((0.0, 1.0, 0.0)), Vector((1.0, 0.0, 0.0)))   # cords along, knuckles out
        B.grip_hand(rig, inv, "L", Vector((0.0, 1.0, 0.0)), Vector((-1.0, 0.0, 0.0)))
        for k in ("L", "R"):
            close_hand(pb, k, curl[k])
        bpy.context.view_layer.update()
        if fi == 0:
            # open each fist until its hollow takes the gathered cords (once: the grip holds while she walks)
            for k in ("L", "R"):
                for _ in range(8):
                    close_hand(pb, k, curl[k])
                    bpy.context.view_layer.update()
                    room, hollow = fist_room(rig, d, k)
                    if room >= CORD_R[k] + 0.0015:
                        break
                    curl[k] *= 0.9
                d[f"grip_{k}"] = [float(c) for c in hollow]
                print(f"AB grip {k}: fingers at {100 * curl[k]:.0f} % of a full fist, room for a "
                      f"{2000 * room:.1f} mm bundle (cords need {2000 * CORD_R[k]:.0f})", flush=True)
        for k in ("L", "R"):
            g, _ = B.grip_frame(rig, k, Vector(d[f"grip_{k}"]))
            grips[k].append(g + Vector((0.0, 0.0, PZ)))
        for b in pb:
            if not b.name.startswith(("DEF-", "ORG-", "MCH-")):
                record.setdefault(b.name, []).append(b.matrix_basis.copy())
    for o in meshes:
        for i, md in enumerate(o.modifiers):
            md.show_viewport = saved[(o.name, i)]
    B.bake_pose(rig, frames, record)
    drift = B.report_feet(rig, feet, states, frames)
    d.location.z = PZ                                    # onto the pavement
    bpy.context.view_layer.update()
    return grips, drift


CORD_R = {"R": 0.0075, "L": 0.0055}    # the two gathered cords of each carrier, as one bundle (kraft 5 mm, card 3.5)


def close_hand(pb, side, k):
    """Curl the four fingers (shot B's GRIP_FINGERS scaled by k) and the thumb across them."""
    for fname, (a, b_, c) in B.GRIP_FINGERS.items():
        for seg, ang in (("01_master", a), ("02", b_), ("03", c)):
            bone = pb[f"{fname}.{seg}.{side}"]
            bone.rotation_mode = "XYZ"
            bone.rotation_euler = (math.radians(ang * k), 0.0, 0.0)
    th = pb[f"thumb.01_master.{side}"]
    th.rotation_mode = "XYZ"
    th.rotation_euler = (math.radians(30 * k), 0.0, math.radians(-10))


def fist_room(rig, d, side):
    """shot B's fist_hollow, whichever of its two return forms (hollow, or (room, hollow)) it has."""
    r = B.fist_hollow(rig, d, side)
    if isinstance(r, tuple):
        return r
    return 0.0058, r


# ------------------------------------------------------------------ the carriers

def carry(bag, grips, frames, arm, yaw0, damp, seed):
    """A paper carrier hanging from its cords in a closed fist: the handle apex (the bag's origin) at the fist's
    hollow, the bag free to swing about it as a damped pendulum driven by the hand's acceleration (fore-aft and
    sideways, with the vertical bob in the effective gravity), and a little twist about the cords."""
    gx, wy, z0, z1 = bag["box"]
    Lp = -(z0 + z1) / 2                                   # apex to the bag's middle
    dt = 1.0 / C.FPS
    th = ph = 0.0
    vth = vph = 0.0
    rng = random.Random(seed)
    tw = rng.uniform(0, 2 * math.pi)
    vel = [(grips[min(i + 1, len(grips) - 1)] - grips[max(i - 1, 0)]) / (dt * (min(i + 1, len(grips) - 1)
           - max(i - 1, 0))) for i in range(len(grips))]
    mats, swing = [], []
    for i, g in enumerate(grips):
        acc = (vel[min(i + 1, len(vel) - 1)] - vel[max(i - 1, 0)]) / (dt * max(1, min(i + 1, len(vel) - 1)
                                                                            - max(i - 1, 0)))
        geff = 9.81 + acc.z
        for _ in range(4):
            h = dt / 4
            ath = -(geff / Lp) * math.sin(th) - (acc.y / Lp) * math.cos(th) - damp * vth
            aph = -(geff / Lp) * math.sin(ph) + (acc.x / Lp) * math.cos(ph) - damp * vph
            vth += ath * h
            vph += aph * h
            th += vth * h
            ph += vph * h
        yaw = math.radians(yaw0) + 0.35 * th + math.radians(2.0) * math.sin(2 * math.pi * 0.37 * C.t_of(frames[i]) + tw)
        M = (Matrix.Translation(g) @ Matrix.Rotation(th, 4, "X") @ Matrix.Rotation(ph, 4, "Y")
             @ Matrix.Rotation(math.pi + yaw, 4, "Z"))
        mats.append(M)
        swing.append(math.degrees(max(abs(th), abs(ph))))
    bag.parent = None
    C.bake_object(bag, frames, mats)
    print(f"AB carrier {bag.name} ({arm} hand): pendulum {Lp:.2f} m, swing up to {max(swing):.1f} deg", flush=True)
    return mats


# ------------------------------------------------------------------ rain

def rain(cam_path, exclude):
    """Light rain over the stretch the camera sees: seeded drops, each with its own speed; position at time t
        z = floor_i + mod(z0_i - floor_i - v_i * t_r, H_i) - v_i * (t - t_r),  x = x0 + wind_x t,  y = y0 + wind_y t
    with t_r the time of the nearest whole frame, so a drop wraps from its floor to the top only between frames
    (never inside a shutter interval, where it would smear a line down the frame). floor_i is the highest surface
    over the drop's column (found by casting down from the top), or below the ground in the open."""
    rng = random.Random(RAIN_SEED)
    ys = [p.y for p in cam_path]
    y0, y1 = min(ys) - 1.0, max(ys) + 34.0
    x0, x1 = -7.15, 7.15
    hidden = []
    skip = set(exclude)
    for o in bpy.data.objects:
        if o.type in ("MESH", "CURVE") and not o.hide_viewport:
            if o in skip or C.is_volume_only(o) or o.name.startswith("sky"):
                o.hide_viewport = True
                hidden.append(o)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    sc = bpy.context.scene
    pts, attrs = [], {"floor": [], "speed": [], "radius": [], "length": []}
    covered = 0
    while len(pts) < RAIN_COUNT:
        x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
        hit, loc, _, _, ob, _ = sc.ray_cast(dg, Vector((x, y, RAIN_TOP + 0.5)), Vector((0, 0, -1)), distance=40.0)
        ground = hit and ob is not None and ob.name == "street_ground"
        if hit and not ground:
            floor = loc.z + 0.01
            covered += 1
            if floor > RAIN_TOP - 1.0:
                continue
        else:
            floor = (loc.z if hit else 0.0) - 0.35
        z = rng.uniform(floor, RAIN_TOP)
        pts.append((x, y, z))
        attrs["floor"].append(floor)
        attrs["speed"].append(rng.uniform(*RAIN_SPEED))
        r = rng.random()
        attrs["radius"].append(0.00045 + 0.0005 * r * r)
        attrs["length"].append(0.010 + 0.008 * rng.random())
    for o in hidden:
        o.hide_viewport = False
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new("rain drops")
    me.from_pydata(pts, [], [])
    for k, vals in attrs.items():
        a = me.attributes.new(k, "FLOAT", "POINT")
        a.data.foreach_set("value", vals)
    ob = bpy.data.objects.new("rain", me)
    sc.collection.objects.link(ob)

    mat = bpy.data.materials.new("rain water")
    mat.use_nodes = True
    nt = mat.node_tree
    pr = nt.nodes["Principled BSDF"]
    pr.inputs["Base Color"].default_value = (1, 1, 1, 1)
    pr.inputs["Transmission Weight"].default_value = 1.0
    pr.inputs["IOR"].default_value = 1.333
    pr.inputs["Roughness"].default_value = 0.06
    tl = nt.nodes.new("ShaderNodeBsdfTranslucent")
    tl.inputs["Color"].default_value = (0.9, 0.93, 0.97, 1)
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.inputs[0].default_value = 0.22
    nt.links.new(pr.outputs[0], mix.inputs[1])
    nt.links.new(tl.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    mat.cycles.emission_sampling = "NONE"

    ng = bpy.data.node_groups.new("rain fall", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N, L = ng.nodes, ng.links
    gi, go = N.new("NodeGroupInput"), N.new("NodeGroupOutput")

    def attr(name):
        a = N.new("GeometryNodeInputNamedAttribute")
        a.data_type = "FLOAT"
        a.inputs["Name"].default_value = name
        return a.outputs["Attribute"]

    def m(op, a, b=None):
        nd = N.new("ShaderNodeMath")
        nd.operation = op
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                nd.inputs[i].default_value = v
            else:
                L.new(v, nd.inputs[i])
        return nd.outputs[0]

    st = N.new("GeometryNodeInputSceneTime")
    fr = st.outputs["Frame"]
    t = m("DIVIDE", m("SUBTRACT", fr, float(C.F0)), float(C.FPS))                 # seconds from frame 1
    t_r = m("DIVIDE", m("SUBTRACT", m("ROUND", fr), float(C.F0)), float(C.FPS))  # nearest whole frame
    pos = N.new("GeometryNodeInputPosition")
    sep = N.new("ShaderNodeSeparateXYZ")
    L.new(pos.outputs[0], sep.inputs[0])
    floor, v = attr("floor"), attr("speed")
    H = m("SUBTRACT", RAIN_TOP, floor)
    phase = m("SUBTRACT", m("SUBTRACT", sep.outputs["Z"], floor), m("MULTIPLY", v, t_r))
    wrapped = m("FLOORED_MODULO", phase, H)
    z = m("SUBTRACT", m("ADD", floor, wrapped), m("MULTIPLY", v, m("SUBTRACT", t, t_r)))
    x = m("ADD", sep.outputs["X"], m("MULTIPLY", t, WIND[0]))
    y = m("ADD", sep.outputs["Y"], m("MULTIPLY", t, WIND[1]))
    comb = N.new("ShaderNodeCombineXYZ")
    for s_, src in zip("XYZ", (x, y, z)):
        L.new(src, comb.inputs[s_])
    setp = N.new("GeometryNodeSetPosition")
    L.new(gi.outputs[0], setp.inputs["Geometry"])
    L.new(comb.outputs[0], setp.inputs["Position"])
    # a drop: a thin 5-sided rod along the fall line (slanted by the wind), scaled per drop
    cyl = N.new("GeometryNodeMeshCylinder")
    cyl.inputs["Vertices"].default_value = 5
    cyl.inputs["Radius"].default_value = 1.0
    cyl.inputs["Depth"].default_value = 1.0
    cyl.fill_type = "NONE"
    inst = N.new("GeometryNodeInstanceOnPoints")
    L.new(setp.outputs[0], inst.inputs["Points"])
    L.new(cyl.outputs["Mesh"], inst.inputs["Instance"])
    vmean = sum(RAIN_SPEED) / 2
    slant = Vector((WIND[0], WIND[1], -vmean)).normalized()
    rot = (-slant).to_track_quat("Z", "Y").to_euler()
    rnode = N.new("FunctionNodeEulerToRotation") if hasattr(bpy.types, "FunctionNodeEulerToRotation") else None
    if rnode is not None:
        rnode.inputs[0].default_value = rot
        L.new(rnode.outputs[0], inst.inputs["Rotation"])
    else:
        inst.inputs["Rotation"].default_value = rot
    sc_v = N.new("ShaderNodeCombineXYZ")
    rad = attr("radius")
    L.new(rad, sc_v.inputs["X"])
    L.new(rad, sc_v.inputs["Y"])
    L.new(attr("length"), sc_v.inputs["Z"])
    L.new(sc_v.outputs[0], inst.inputs["Scale"])
    real = N.new("GeometryNodeRealizeInstances")
    L.new(inst.outputs[0], real.inputs[0])
    smat = N.new("GeometryNodeSetMaterial")
    smat.inputs["Material"].default_value = mat
    L.new(real.outputs[0], smat.inputs["Geometry"])
    L.new(smat.outputs[0], go.inputs[0])
    mod = ob.modifiers.new("fall", "NODES")
    mod.node_group = ng
    ob.visible_shadow = False
    ob.visible_volume_scatter = False
    ob.cycles.use_motion_blur = True
    ob.cycles.use_deform_motion = True
    ob.cycles.motion_steps = 1
    print(f"AB rain: {len(pts)} drops in x {x0}..{x1}, y {y0:.1f}..{y1:.1f}, to z {RAIN_TOP}; {covered} columns "
          f"under cover; speed {RAIN_SPEED} m/s, wind {WIND}", flush=True)
    return ob


# ------------------------------------------------------------------ ripples in the standing water

def ripples():
    """Rain rings in the stage's standing water: three seeded layers of impact cells (Voronoi in world XY); in each
    cell a ring grows from its impact point and fades over its life, the cell's random value setting its phase.
    The ring height is added as a second bump over the material's own normal, masked by the material's own wet
    (standing water) mask, found by its values; a frame-keyed time drives it (one key per frame)."""
    done = []
    for mname, wet_range, damp_range in (("asphalt wet", (0.53, 0.59), (0.34, 0.55)),
                                         ("pavers wet", (0.72, 0.8), (0.4, 0.75))):
        m = bpy.data.materials.get(mname)
        if m is None:
            print(f"AB ripples: no material {mname!r}", flush=True)
            continue
        nt = m.node_tree
        pr = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")

        def find(rng_):
            for nd in nt.nodes:
                if nd.type == "MAP_RANGE" and abs(nd.inputs["From Min"].default_value - rng_[0]) < 1e-4 and \
                        abs(nd.inputs["From Max"].default_value - rng_[1]) < 1e-4:
                    return nd.outputs["Result"]
            return None
        wet, damp = find(wet_range), find(damp_range)
        if wet is None:
            print(f"AB ripples: {mname}: wet mask not found, using roughness < 0.1", flush=True)
            rough_src = pr.inputs["Roughness"].links[0].from_socket
            mr = nt.nodes.new("ShaderNodeMapRange")
            mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = 0.13, 0.07
            nt.links.new(rough_src, mr.inputs["Value"])
            wet = mr.outputs["Result"]

        def node(kind, **kw):
            nd = nt.nodes.new(kind)
            for k, v in kw.items():
                setattr(nd, k, v)
            return nd

        def math_(op, a, b=None):
            nd = node("ShaderNodeMath", operation=op)
            for i, v in enumerate((a, b)):
                if v is None:
                    continue
                if isinstance(v, (int, float)):
                    nd.inputs[i].default_value = v
                else:
                    nt.links.new(v, nd.inputs[i])
            return nd.outputs[0]
        tval = node("ShaderNodeValue")
        tval.name = tval.label = "ripple time"
        geo = node("ShaderNodeNewGeometry")
        total = None
        for li, (cell, rate, rmax, width, off) in enumerate(((0.22, 1.30, 0.075, 0.0055, (0.0, 0.0)),
                                                             (0.31, 1.05, 0.10, 0.0065, (3.7, 1.9)),
                                                             (0.17, 1.55, 0.055, 0.0045, (7.1, 5.3)))):
            mp = node("ShaderNodeMapping")
            mp.inputs["Location"].default_value = (*off, 0.0)
            mp.inputs["Scale"].default_value = (1.0, 1.0, 0.0)
            nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])
            vor = node("ShaderNodeTexVoronoi", voronoi_dimensions="2D", feature="F1")
            vor.inputs["Scale"].default_value = 1.0 / cell
            vor.inputs["Randomness"].default_value = 0.85
            nt.links.new(mp.outputs["Vector"], vor.inputs["Vector"])
            dist = math_("MULTIPLY", vor.outputs["Distance"], cell)                 # metres to the impact point
            rnd = node("ShaderNodeSeparateColor")
            nt.links.new(vor.outputs["Color"], rnd.inputs[0])
            age = math_("FRACT", math_("ADD", math_("MULTIPLY", tval.outputs[0], rate), rnd.outputs[0]))
            radius = math_("MULTIPLY", math_("POWER", age, 0.6), rmax)
            x = math_("DIVIDE", math_("SUBTRACT", dist, radius), width)
            ring = math_("EXPONENT", math_("MULTIPLY", math_("MULTIPLY", x, x), -1.0))
            # a second, smaller ring trailing inside the first
            x2 = math_("DIVIDE", math_("SUBTRACT", dist, math_("MULTIPLY", radius, 0.55)), width * 0.8)
            ring2 = math_("MULTIPLY", math_("EXPONENT", math_("MULTIPLY", math_("MULTIPLY", x2, x2), -1.0)), 0.45)
            life = math_("POWER", math_("SUBTRACT", 1.0, age), 2.0)
            # only some cells are struck in each cycle (light rain), by their second random channel
            live = math_("GREATER_THAN", rnd.outputs[1], 0.35)
            h = math_("MULTIPLY", math_("MULTIPLY", math_("ADD", ring, ring2), life), live)
            total = h if total is None else math_("ADD", total, h)
        mask = wet if damp is None else math_("ADD", wet, math_("MULTIPLY", damp, 0.25))
        mask = math_("MINIMUM", mask, 1.0)
        height = math_("MULTIPLY", total, mask)
        bump = node("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.55
        bump.inputs["Distance"].default_value = 0.0012
        nt.links.new(height, bump.inputs["Height"])
        if pr.inputs["Normal"].is_linked:
            nt.links.new(pr.inputs["Normal"].links[0].from_socket, bump.inputs["Normal"])
        nt.links.new(bump.outputs["Normal"], pr.inputs["Normal"])
        C.bake(nt, f'nodes["{tval.name}"].outputs[0].default_value', C.FRAMES, [C.t_of(f) for f in C.FRAMES])
        done.append(mname)
    print(f"AB ripples: rain rings in {done}", flush=True)


# ------------------------------------------------------------------ steam

def steam():
    """A slow plume from the manhole in the road behind her (2.9, 23.0): denser at the cover, thinning upward, its
    texture rising and drifting with the wind."""
    return C.local_haze("steam plume", (1.6, 21.7, 0.0), (4.4, 24.6, 4.2), peak=0.16, centre=(2.95, 23.05, 0.15),
                        sigma=(0.42, 0.42, 1.25), colour=(0.86, 0.88, 0.9), drift=(-0.10, 0.02, -0.34),
                        noise_scale=1.9)


# ------------------------------------------------------------------ camera

def camera(frames):
    """A low dolly-crane on the road just off the kerb: it tracks her at her own speed from a little behind her
    left shoulder, gaining slightly so she turns from three-quarter back toward profile, and rises from 0.45 to 1.0 m
    (the wet gutter and her stride first, then the lit shopfronts and signs above her). Focus on her chest."""
    n = len(frames)
    locs, aims = [], []
    for i, f in enumerate(frames):
        t = C.t_of(f)
        u = C.cruise(i / (n - 1), 0.2)
        y = B.hip_y(t)
        locs.append(Vector((3.30 - 0.10 * u, y - 2.85 + 0.55 * u, 0.45 + 0.55 * u)))
        aims.append(Vector((5.95 + 0.10 * u, y + 2.35 - 0.45 * u, 1.02 + 0.10 * u)))
    focus = [(Vector((PATH_X - 0.1, B.hip_y(C.t_of(f)), 1.15)) - l).length for f, l in zip(frames, locs)]
    cam = C.moving_camera("anim_cam", frames, locs, aims, LENS, FSTOP, focus=focus, clip=(0.03, 600.0))
    return cam, locs


# ------------------------------------------------------------------ checks

def checks(d, bags, frames):
    test = frames[::3]
    body = [o for o in d.children_recursive if o.type == "MESH" and o.visible_camera]
    bag_body = {k: [o for o in b.children_recursive if o.type == "MESH" and not o.name.endswith("_handles")]
                for k, b in bags.items()}
    hits = {}
    for k, parts in bag_body.items():
        hits[k] = C.clearance(body, parts, test, f"Dawn vs carrier {k} (cords excluded: they are in her fist)")
    C.clearance(bag_body["L"], bag_body["R"], test, "carrier vs carrier")
    near = [o for o in bpy.data.objects if o.type == "MESH" and o.name in ("railings", "pavement_dressing", "lamp_poles")]
    C.clearance(body + bag_body["L"] + bag_body["R"], near, test, "Dawn and carriers vs railings, dressing, poles")
    # the carriers' lowest point above the pavement
    sc = bpy.context.scene
    low = 9.0
    for f in test:
        sc.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        for parts in bag_body.values():
            for o in parts:
                ev = o.evaluated_get(dg)
                me = ev.to_mesh()
                low = min([low] + [(ev.matrix_world @ v.co).z for v in me.vertices])
                ev.to_mesh_clear()
    sc.frame_set(C.F0)
    print(f"AB check carriers: lowest point {1000 * (low - PZ):.0f} mm above the pavement", flush=True)
    return hits


# ------------------------------------------------------------------ build

def build(base=None, save_base=None, frames=None):
    configure_gait()
    frames = frames or C.FRAMES
    if base:
        bpy.ops.wm.open_mainfile(filepath=base, load_ui=False)
        d = bpy.data.objects["Dawn"]
        bags = {k: bpy.data.objects[d[f"bag_{k}"]] for k in ("R", "L")}
    else:
        d, bags = build_set()
        no_red()
        if save_base:
            os.makedirs(os.path.dirname(os.path.abspath(save_base)), exist_ok=True)
            bpy.context.preferences.filepaths.save_version = 0
            bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(save_base), compress=True)
            print(f"AB saved base {save_base}", flush=True)
    grips, drift = walk(d, frames)
    carry(bags["R"], grips["R"], frames, "R", 4.0, damp=4.2, seed=11)
    carry(bags["L"], grips["L"], frames, "L", -6.0, damp=4.6, seed=12)
    cam, path = camera(frames)
    C.film_settings(exposure=-1.65)
    look()
    rain(path, [o for h in (d, *bags.values()) for o in h.children_recursive])
    ripples()
    steam()
    C.volumes_off_blur()
    checks(d, bags, frames)
    sc = bpy.context.scene
    sc["shot"] = "AB_HK: Hong Kong street at night in the rain, Dawn walking with two carriers (Ch 02, 2:36)"
    rig = bpy.data.objects[d["rig"]]
    print(f"AB {NAME}: fingerprint {C.fingerprint([cam, rig, bags['L'], bags['R']])}; foot drift "
          f"{1000 * drift:.1f} mm", flush=True)
    return cam


if __name__ == "__main__":
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    opt = lambda k: a[a.index(k) + 1] if k in a else None   # noqa: E731
    out = opt("--out") or BLEND
    upto = opt("--upto")
    build(base=opt("--base"), save_base=opt("--save-base"),
          frames=list(range(1, int(upto) + 1)) if upto else None)
    C.save(os.path.abspath(out))
