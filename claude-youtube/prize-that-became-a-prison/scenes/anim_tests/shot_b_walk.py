"""Shot B: Dawn walks through the check-in hall to the counter and the scale, pulling her case; the camera tracks.

    <bpy python> -I scenes/anim_tests/shot_b_walk.py [--out out/anim_tests/blend/B_walk.blend]

The set and cast are scenes/stages/checkin_hall.py as the film's check-in plates use them (the agent at his desk,
the lit island in the dark terminal). Dawn's bags are taken off the scale: she brings them.

The walk is a procedural gait on Dawn's own Rigify rig (no motion capture), written from the mechanics of walking:
- feet: IK, each planted at a fixed point on the floor for its stance (heel strike about the heel, foot flat, heel
  rise about the ball with the toe kept flat), so a planted foot cannot slide; the swing between plants follows a
  minimum-jerk path with a lift arc, the foot pitched toe-down after push-off and toe-up before the next strike;
- pelvis: forward at 1.05 m/s with the small surge of a real walk, lowest at double support and highest at mid-stance
  (bounded every frame by what the legs can reach, so the IK never stretches), swaying over the stance foot, turning
  and dropping on the swing side; the chest counter-turns, the head stays level;
- left arm: carries the black duffel (the extra bag) by its handles, held a little out from the body and swinging
  only slightly, the trunk leaning a degree away from the load; the duffel hangs from the closed hand and swings
  a little behind the arm, as a pendulum;
- right arm: back and a little out, holding the case's handle in a closed hand.
The case is a two-wheeled trailer of that hand: each frame its rear wheels roll toward the hand's footprint while
the handle keeps its length, so it tilts and swings behind her as a pulled case does.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C  # noqa: E402

import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

NAME = "B_walk"
DEBUG = "--debug" in sys.argv
PATH_X = 0.66                      # her line: straight up the hall to the counter, the scale on her right
SPEED = 1.05                       # m/s
CADENCE = 1.80                     # steps per second
STEP_W = 0.052                     # half the step width (each foot this far from her line)
TOE_OUT = 6.0                      # deg
END_Y = -0.62                      # where her hips are at the last frame (still walking, a step from the counter)
DUTY = 0.62                        # stance share of a stride
HEEL_PITCH, TOE_PITCH = 16.0, 38.0  # deg: toes up at heel strike, heel up at toe-off
STRIDE_T = 2.0 / CADENCE
STRIDE_L = SPEED * STRIDE_T
GRIP_FINGERS = {"f_index": (62, 70, 35), "f_middle": (66, 72, 35), "f_ring": (70, 74, 35), "f_pinky": (74, 74, 35)}


def ease(x):
    return C.smoother(x)


# ------------------------------------------------------------------ gait clock

def heel_strikes():
    """Left and right heel-strike times (s), covering the clip and one stride either side."""
    t_l0 = 0.20
    out = {"L": [], "R": []}
    for k in range(-3, 8):
        out["L"].append(t_l0 + k * STRIDE_T)
        out["R"].append(t_l0 + (k + 0.5) * STRIDE_T)
    return out


def hip_y(t):
    """Hips along the path: constant speed with a small surge (slowest at mid-stance, fastest at double support)."""
    t_end = C.t_of(C.F1)
    base = END_Y - SPEED * (t_end - t)
    return base - 0.010 * math.sin(2 * math.pi * 2 * (t - 0.20) / STRIDE_T)


def anchors(strikes):
    """Where each foot is planted flat (the ankle's floor point) for each of its stances: a step ahead of the hips."""
    out = {}
    for side, sgn in (("L", -1), ("R", 1)):
        lst = []
        for ts in strikes[side]:
            # at heel strike the hips are behind the new foot by about 40 % of a step
            y = hip_y(ts) + 0.40 * STRIDE_L / 2 + 0.035
            lst.append((ts, Vector((PATH_X + sgn * STEP_W, y, 0.0))))
        out[side] = lst
    return out


# ------------------------------------------------------------------ the foot

class Foot:
    """Rest geometry of one foot (world, holder at its mark) and the pose of its IK control for any time."""

    def __init__(self, rig, side, shoe):
        self.side = side
        pb = rig.pose.bones
        self.rest = rig.matrix_world @ rig.data.bones[f"foot_ik.{side}"].matrix_local
        self.toe_rest = rig.matrix_world @ rig.data.bones[f"toe_ik.{side}"].matrix_local
        self.ankle = self.rest.translation.copy()
        self.ball = rig.matrix_world @ rig.data.bones[f"toe_ik.{side}"].head_local
        self.ball.z = 0.0
        # heel contact: the lowest point of this shoe behind the ankle
        sgn = 1 if side == "L" else -1
        pts = shoe[side]
        back = [p for p in pts if (p - self.ankle).dot(FWD) < -0.01]
        self.heel = min(back, key=lambda p: p.z).copy()
        self.heel.z = 0.0
        self.tip = max(pts, key=lambda p: (p - self.ankle).dot(FWD)).copy()
        self.tip.z = max(0.0, self.tip.z - 0.003)

    def flat(self, anchor, yaw_deg):
        g = Vector((self.ankle.x, self.ankle.y, 0.0))
        return (Matrix.Translation(anchor) @ Matrix.Rotation(math.radians(yaw_deg), 4, "Z")
                @ Matrix.Translation(-g))

    def pivot(self, Q, point, angle_deg):
        p = Q @ point
        a = (Q.to_3x3() @ Vector((1, 0, 0))).normalized()
        return Matrix.Translation(p) @ Matrix.Rotation(math.radians(angle_deg), 4, a) @ Matrix.Translation(-p) @ Q


FWD = Vector((0, 1, 0))


def foot_state(foot, plants, t):
    """(world matrix of the foot's IK control, world matrix of the flat foot (for the toe) or None, phase,
    index of the stance)."""
    stance_t = DUTY * STRIDE_T
    yaw = TOE_OUT if foot.side == "L" else -TOE_OUT       # toes turned out from the line of walk
    for i, (ts, anc) in enumerate(plants):
        u = (t - ts) / stance_t
        if 0.0 <= u < 1.0:
            Q = foot.flat(anc, yaw)
            if u < 0.13:                                   # heel rocker: toes come down about the heel
                ang = HEEL_PITCH * (1 - ease(u / 0.13))
                return foot.pivot(Q, foot.heel, ang) @ foot.rest, None, "heel", i
            if u < 0.56:
                return Q @ foot.rest, None, "flat", i
            v = (u - 0.56) / 0.44                          # heel rise about the ball, the toe kept flat
            ang = -TOE_PITCH * v ** 1.6
            return foot.pivot(Q, foot.ball, ang) @ foot.rest, Q, "toe", i
    # swing: the foot itself (ankle position and orientation) from toe-off to the next heel strike
    prev = max((p for p in plants if p[0] + stance_t <= t), key=lambda p: p[0])
    nxt = min((p for p in plants if p[0] > t), key=lambda p: p[0])
    t0, t1 = prev[0] + stance_t, nxt[0]
    u = (t - t0) / (t1 - t0)
    FA = foot.pivot(foot.flat(prev[1], yaw), foot.ball, -TOE_PITCH) @ foot.rest
    FB = foot.pivot(foot.flat(nxt[1], yaw), foot.heel, HEEL_PITCH) @ foot.rest
    la, qa, _ = FA.decompose()
    lb, qb, _ = FB.decompose()
    loc = la.lerp(lb, ease(u))
    loc.z += 0.075 * math.sin(math.pi * u) ** 1.2 * (1.25 - 0.5 * u)    # lift: highest early in the swing
    q = qa.slerp(qb, C.smooth(min(1.0, u * 1.1)))
    F = q.to_matrix().to_4x4()
    F.translation = loc
    # the toe tip and heel never dip below the floor
    low = min((F @ foot.rest.inverted() @ p).z for p in (foot.tip, foot.heel, foot.ball))
    if low < 0.004:
        F = Matrix.Translation((0, 0, 0.004 - low)) @ F
    return F, None, "swing", None


# ------------------------------------------------------------------ build

def build(base=None, frames=None):
    if base:                                             # dev: a saved stage build instead of rebuilding it
        bpy.ops.wm.open_mainfile(filepath=base, load_ui=False)
        import importlib
        ch = importlib.import_module("checkin_hall")
    else:
        ch = C.stage("checkin_hall", cast=True)
    import rigged as rg
    C.remove_stage_cameras()
    for n in ("desk0_passport_back", "desk0_passport_pages", "desk0_passport_front", "desk0_payment_card"):
        if n in bpy.data.objects:
            bpy.data.objects[n].hide_render = True       # not on the ledge yet: she has not arrived

    d = bpy.data.objects["Dawn"]
    rig = bpy.data.objects[d["rig"]]
    pb = rig.pose.bones
    d.location = (PATH_X, hip_y(0.0), 0.0)
    d.rotation_euler = (0, 0, math.pi)                   # faces +Y, up the hall to the counter
    bpy.context.view_layer.update()
    for b in pb:
        b.matrix_basis = Matrix.Identity(4)
    for k in ("L", "R"):
        pb[f"thigh_parent.{k}"]["IK_FK"] = 0.0           # IK legs (stretch stays on: the hip height below keeps
        pb[f"upper_arm_parent.{k}"]["IK_FK"] = 1.0       # every leg inside its reach, so it never has to stretch)
    bpy.context.view_layer.update()

    # rest shoe points (world) for the foot geometry
    shoe_ob = bpy.data.objects[d.name + "_shoes04"]
    mods = [(m, m.show_viewport) for m in shoe_ob.modifiers]
    for m, _ in mods:
        m.show_viewport = m.type == "ARMATURE"
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = shoe_ob.evaluated_get(dg)
    me = ev.to_mesh()
    centre_x = d.location.x
    shoe = {"L": [], "R": []}
    for v in me.vertices:
        p = ev.matrix_world @ v.co
        shoe["R" if p.x > centre_x else "L"].append(p)
    ev.to_mesh_clear()
    for m, sv in mods:
        m.show_viewport = sv
    feet = {k: Foot(rig, k, shoe) for k in ("L", "R")}

    strikes = heel_strikes()
    plants = anchors(strikes)
    frames = frames or C.FRAMES
    leg_len = (pb["thigh_ik.L"].length + pb["MCH-shin_ik.L"].length) * 0.995

    meshes = [o for o in d.children_recursive if o.type == "MESH"]
    saved = {(o.name, i): md.show_viewport for o in meshes for i, md in enumerate(o.modifiers)}
    for o in meshes:
        for md in o.modifiers:
            md.show_viewport = False                     # bones only while posing

    inv = rig.matrix_world.inverted()
    inv3 = inv.to_3x3()
    hip_rest = (rig.matrix_world @ rig.data.bones["torso"].matrix_local).translation.copy()
    tor_rest = rig.data.bones["torso"].matrix_local.copy()

    def spin(bone, rx=0.0, ry=0.0, rz=0.0):
        """Rotate a control about its head by world-axis angles (deg): X across the walk, Y along it, Z up."""
        b = pb[bone]
        R = (Matrix.Rotation(math.radians(rz), 3, "Z") @ Matrix.Rotation(math.radians(ry), 3, "Y")
             @ Matrix.Rotation(math.radians(rx), 3, "X"))
        Ra = (inv3 @ R @ inv3.inverted()).to_4x4()
        h = b.matrix.translation.copy()
        b.matrix = Matrix.Translation(h) @ Ra @ Matrix.Translation(-h) @ b.matrix
        bpy.context.view_layer.update()

    states = {f: {k: foot_state(feet[k], plants[k], C.t_of(f)) for k in ("L", "R")} for f in frames}

    def pose(f, z):
        t = C.t_of(f)
        ph = ((t - strikes["L"][3]) / STRIDE_T) % 1.0
        w = 2 * math.pi * ph
        for b in pb:
            b.matrix_basis = Matrix.Identity(4)
        x = PATH_X - 0.016 * math.sin(w + 0.55)           # sway over the stance foot
        # from the rest matrix (the pose matrices are stale until the next update after the reset above)
        pb["torso"].matrix = Matrix.Translation(inv3 @ (Vector((x, hip_y(t), z)) - hip_rest)) @ tor_rest
        bpy.context.view_layer.update()
        spin("torso", rx=-3.0, ry=1.5)                    # a slight lean into the walk, and away from the duffel
        spin("hips", ry=2.6 * math.sin(w), rz=-4.0 * math.cos(w))   # pelvic list and turn with the legs
        spin("chest", rz=4.5 * math.cos(w))                          # the chest counter-turns
        spin("head", rx=4.0, rz=-1.5 * math.cos(w))                 # eyes level on the counter
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

    # pass 1: the hip height each frame may have (design bob, lowered where a leg could not reach)
    z_design, z_ok = [], []
    for f in frames:
        t = C.t_of(f)
        ph = ((t - strikes["L"][3]) / STRIDE_T) % 1.0
        z = hip_rest.z - 0.030 + 0.016 * math.cos(2 * (2 * math.pi * ph) - 2 * math.pi * 0.31)
        z_design.append(z)
        for _ in range(3):
            pose(f, z)
            e = reach_excess()
            if DEBUG and f <= 3:
                print("DBG", f, round(z, 4), e, [tuple(round(c, 3) for c in rig.matrix_world @ pb[n].head)
                                             for n in ("torso", "thigh_ik.L", "foot_ik.L", "thigh_ik.R", "foot_ik.R")])
            if not e > 0:
                break
            z -= e + 0.002
        z_ok.append(z)
    # smooth below the limit: a running minimum over 5 frames, then a 5-tap blur, then clamp again
    n = len(frames)
    zm = [min(z_ok[max(0, i - 2):i + 3]) for i in range(n)]
    zs = [sum(zm[max(0, min(n - 1, i + j))] * wgt for j, wgt in zip(range(-2, 3), (0.1, 0.2, 0.4, 0.2, 0.1)))
          for i in range(n)]
    z_final = [min(a, b) for a, b in zip(zs, z_ok)]
    lowered = sum(1 for a, b in zip(z_design, z_final) if b < a - 0.0005)
    print(f"ANIM walk: hip height {min(z_final):.3f}..{max(z_final):.3f} m; lowered for reach on {lowered} of {n} "
          "frames", flush=True)

    # pass 2: the full pose
    record = {}
    grips_r, grips_l = [], []
    for fi, f in enumerate(frames):
        w = pose(f, z_final[fi])
        for k in ("L", "R"):
            F, toeQ, _, _ = states[f][k]
            if toeQ is not None:                          # the toe stays flat on the floor through the heel rise
                pb[f"toe_ik.{k}"].matrix = inv @ toeQ @ feet[k].toe_rest
        # left arm carries the duffel: a little out from the body, a small swing
        fl = 4.0 - 4.0 * math.cos(w - 0.4)
        rg._aim(rig, "upper_arm_fk.L", rg._dir(0, fl, 1, LEFT_OUT[0]))
        rg._aim(rig, "forearm_fk.L", rg._dir(0, fl + 7.0, 1, LEFT_OUT[1]))
        # right arm pulls the case, back and a little out
        pull = -23.0 + 2.0 * math.sin(w)
        rg._aim(rig, "upper_arm_fk.R", rg._dir(0, pull, -1, 12.0))
        rg._aim(rig, "forearm_fk.R", rg._dir(0, pull + 8.0, -1, 9.0))
        bpy.context.view_layer.update()
        grip_hand(rig, inv, "R", Vector((1.0, 0.0, 0.0)), Vector((0.0, 1.0, 0.0)))   # bar across, knuckles forward
        grip_hand(rig, inv, "L", Vector((0.0, 1.0, 0.0)), Vector((-1.0, 0.0, 0.0)))  # handles along, knuckles out
        for k in ("L", "R"):
            for fname, (a, b_, c) in GRIP_FINGERS.items():
                for seg, ang in (("01_master", a), ("02", b_), ("03", c)):
                    bone = pb[f"{fname}.{seg}.{k}"]
                    bone.rotation_mode = "XYZ"
                    bone.rotation_euler = (math.radians(ang), 0.0, 0.0)
            th = pb[f"thumb.01_master.{k}"]
            th.rotation_mode = "XYZ"
            th.rotation_euler = (math.radians(30), 0.0, math.radians(-10))
        bpy.context.view_layer.update()
        if fi == 0:
            for k in ("L", "R"):
                d[f"grip_{k}"] = list(fist_hollow(rig, d, k))
        grips_r.append(grip_frame(rig, "R", Vector(d["grip_R"])))
        grips_l.append(grip_frame(rig, "L", Vector(d["grip_L"])))
        for b in pb:
            if not b.name.startswith(("DEF-", "ORG-", "MCH-")):
                record.setdefault(b.name, []).append(b.matrix_basis.copy())

    for o in meshes:
        for i, md in enumerate(o.modifiers):
            md.show_viewport = saved[(o.name, i)]
    bake_pose(rig, frames, record)
    case_follow(frames, grips_r)
    duffel_follow(frames, grips_l)
    report_feet(rig, feet, states, frames)
    body = [o for o in d.children_recursive if o.type == "MESH" and o.visible_camera]
    case_m = [o for o in bpy.data.objects["dawn-suitcase"].children_recursive if o.type == "MESH"]
    duffel_m = [o for o in bpy.data.objects["extra-bag-closed"].children_recursive if o.type == "MESH"]
    hand_parts = []
    test = frames[::3]
    C.clearance(body, duffel_m, test, "Dawn vs duffel")
    C.clearance(body, case_m, test, "Dawn vs case (the grip closes on its handle)")
    C.clearance(duffel_m, case_m, test, "duffel vs case")
    near = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith(("q0_", "q1_"))]
    C.clearance(body + case_m + duffel_m, near, test, "Dawn and bags vs queue posts")

    # camera: alongside on her right, tracking with her, leading a little; the lit island enters at the end
    locs, aims = [], []
    for i, f in enumerate(frames):
        t = C.t_of(f)
        y = hip_y(t)
        u = i / (n - 1)
        locs.append(Vector((CAM_X, y - 0.30 + 0.35 * C.smooth(u), CAM_Z)))
        aims.append(Vector((PATH_X - 0.2, y - 0.22 + 0.75 * C.smooth(u) ** 1.5, AIM_Z)))
    focus = [(Vector((PATH_X, hip_y(C.t_of(f)), 1.1)) - l).length for f, l in zip(frames, locs)]
    cam = C.moving_camera("anim_cam", frames, locs, aims, LENS, FSTOP, focus=focus)
    C.film_settings(exposure=ch.CAMERAS["profile"].get("exposure", ch.EXPOSURE))
    ch.render_settings()
    C.volumes_off_blur()
    print(f"ANIM {NAME}: fingerprint {C.fingerprint([cam, rig, bpy.data.objects['dawn-suitcase']])}", flush=True)
    return cam


CAM_X, CAM_Z, AIM_Z = 3.45, 1.02, 0.84
LEFT_OUT = (27.0, 30.0)            # the duffel arm: upper arm and forearm out from the side (deg), so the bag clears
                                   # the leg and skirt (at 17/12 its inner face reached the middle of the thigh)
LENS, FSTOP = 32.0, 4.0


def grip_hand(rig, inv, side, bar, knuckles):
    """A closed hand on a bar: the hand in line with the forearm, its width along the bar, the back of the hand
    (knuckles) facing `knuckles` as nearly as the forearm allows."""
    pb = rig.pose.bones
    fm = rig.matrix_world @ pb[f"forearm_fk.{side}"].matrix
    y = (fm.to_3x3() @ Vector((0, 1, 0))).normalized()
    z = (bar - y * bar.dot(y)).normalized()
    x = y.cross(z)
    dorsal = x if side == "R" else -x                   # the bone's X is the back of the hand on the right side
    if dorsal.dot(knuckles) < 0:
        z = -z
        x = y.cross(z)
    hb = pb[f"hand_fk.{side}"]
    head = rig.matrix_world @ hb.head
    hm = Matrix((x, y, z)).transposed().to_4x4()
    hm.translation = head
    hb.matrix = inv @ hm
    bpy.context.view_layer.update()


def fist_hollow(rig, holder, side, bar_r=0.0125):
    """Where a bar of radius bar_r fits inside the closed hand: the centre of the largest empty circle among the
    hand's vertices (fingers, thumb, palm; armature deformation only), in the plane across the bar, in the hand
    bone's frame. Measured once (the fist does not change during the walk)."""
    body = bpy.data.objects[holder["body"]]
    saved = [(m, m.show_viewport) for m in body.modifiers]
    for m, _ in saved:
        m.show_viewport = m.type == "ARMATURE"
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    names = {g.index: g.name for g in body.vertex_groups}
    H = rig.matrix_world @ rig.pose.bones[f"hand_fk.{side}"].matrix
    Hi = H.inverted()
    pts = []
    for v, vo in zip(me.vertices, body.data.vertices):
        gs = [g for g in vo.groups if g.group in names and g.weight > 0.3 and names[g.group].endswith("." + side)
              and names[g.group].startswith(("DEF-f_", "DEF-thumb", "DEF-palm", "DEF-hand"))]
        if gs:
            pts.append(Hi @ (ev.matrix_world @ v.co))
    ev.to_mesh_clear()
    for m, sv in saved:
        m.show_viewport = sv
    bpy.context.view_layer.update()
    # the bar runs along the hand frame's z (grip_hand); look at the slice the fingers wrap
    zs = sorted(p.z for p in pts)
    zc = 0.5 * (zs[len(zs) // 10] + zs[9 * len(zs) // 10])
    band = [p for p in pts if abs(p.z - zc) < 0.035]
    xs, ys = [p.x for p in band], [p.y for p in band]
    best = (-1.0, None)
    steps = 40
    for i in range(steps + 1):
        x = min(xs) + (max(xs) - min(xs)) * i / steps
        for j in range(steps + 1):
            y = min(ys) + (max(ys) - min(ys)) * j / steps
            # inside the fist only: hand on both sides of the point along x and along y (narrow strips)
            sx = [p.x for p in band if abs(p.y - y) < 0.008]
            sy = [p.y for p in band if abs(p.x - x) < 0.008]
            if not (sx and sy and min(sx) < x < max(sx) and min(sy) < y < max(sy)):
                continue
            dmin = min((p.x - x) ** 2 + (p.y - y) ** 2 for p in band) ** 0.5
            if dmin > best[0]:
                best = (dmin, Vector((x, y, zc)))
    print(f"ANIM grip {side}: the fist's hollow has room for a bar of radius {1000 * best[0]:.1f} mm "
          f"(handle about {1000 * bar_r:.1f} mm)", flush=True)
    return best[1]


def grip_frame(rig, side, hollow):
    """The point the bar passes through in the closed hand (its hollow, calibrated in the hand's frame) and the
    bar's direction, world space."""
    H = rig.matrix_world @ rig.pose.bones[f"hand_fk.{side}"].matrix
    return H @ hollow, (H.to_3x3() @ Vector((0, 0, 1))).normalized()


def bake_pose(rig, frames, record):
    pb = rig.pose.bones
    I4 = Matrix.Identity(4)
    n_keys = 0
    for name, mats in record.items():
        if all(_close(m, I4) for m in mats):
            continue
        b = pb[name]
        C.bake_vector(rig, f'pose.bones["{name}"].location', frames, [tuple(m.to_translation()) for m in mats],
                      group=name)
        if b.rotation_mode == "QUATERNION":
            qs, prev = [], None
            for m in mats:
                q = m.to_quaternion()
                if prev is not None and prev.dot(q) < 0:
                    q.negate()
                prev = q
                qs.append(tuple(q))
            C.bake_vector(rig, f'pose.bones["{name}"].rotation_quaternion', frames, qs, group=name)
        else:
            es, prev = [], None
            for m in mats:
                e = m.to_euler(b.rotation_mode, prev) if prev is not None else m.to_euler(b.rotation_mode)
                prev = e
                es.append(tuple(e))
            C.bake_vector(rig, f'pose.bones["{name}"].rotation_euler', frames, es, group=name)
        n_keys += 1
    print(f"ANIM walk: {n_keys} controls baked", flush=True)


def _close(a, b, eps=1e-6):
    return all(abs(a[i][j] - b[i][j]) < eps for i in range(4) for j in range(4))


# ------------------------------------------------------------------ the case and the duffel

def case_follow(frames, grips):
    """Extend the case's telescopic handle, then make the case a trailer of the right hand: its rear wheels on the
    floor rolling toward the hand's footprint, the handle's length kept, the case tilted back onto those wheels."""
    case = bpy.data.objects["dawn-suitcase"]
    shell = max((o for o in case.children_recursive if o.type == "MESH"), key=lambda o: len(o.data.vertices))
    S = case.matrix_world.to_scale()
    case.matrix_world = Matrix.Diagonal((*S, 1.0))       # neutral: at the origin, unturned, to measure in
    bpy.context.view_layer.update()
    pts = [shell.matrix_world @ v.co for v in shell.data.vertices]
    top = max(p.z for p in pts)
    grip = [p for p in pts if p.z > top - 0.02]
    gx = sum(p.x for p in grip) / len(grip)
    # the stage lifted the handle's top 4 cm and bridged the gap with two rails (0.50-0.65 m): pull it out further
    EXT = 0.30
    lift_local = shell.matrix_world.inverted().to_3x3() @ Vector((0, 0, EXT))
    moved = 0
    for v in shell.data.vertices:
        p = shell.matrix_world @ v.co
        if p.z > 0.575 and p.x < -0.06:
            v.co += lift_local
            moved += 1
    shell.data.update()
    for o in [o for o in bpy.data.objects if o.name.startswith("case grip rail")]:
        loc, rot, sc = o.matrix_world.decompose()
        h = o.dimensions.z
        o.matrix_world = Matrix.LocRotScale(loc + Vector((0, 0, EXT / 2)), rot,
                                            Vector((sc.x, sc.y, sc.z * (h + EXT) / h)))
    bpy.context.view_layer.update()
    grip_local = Vector((gx, 0.0, top + EXT - 0.012))
    wheels = [p for p in pts if p.z < 0.02 and p.x < -0.05]
    axle_local = Vector((sum(p.x for p in wheels) / len(wheels), 0.0, 0.011))
    d_local = grip_local - axle_local
    L = d_local.length
    beta0 = math.atan2(-d_local.x, d_local.z)            # the handle's own lean toward -x
    A = None
    mats = []
    for g, _ in grips:
        gp = Vector((g.x, g.y, 0.0))
        if A is None:
            A = gp - Vector((0.0, 0.65, 0.0))
        dz = g.z - axle_local.z
        horiz = math.sqrt(max(1e-6, L * L - dz * dz))
        u = gp - A
        u.z = 0.0
        u.normalize()
        A = gp - u * horiz
        gamma = math.atan2(horiz, dz)
        alpha = gamma - beta0
        yaw = math.atan2(-u.y, -u.x)                     # the case's handle side (-x) toward the hand
        mats.append(Matrix.Translation((A.x, A.y, axle_local.z)) @ Matrix.Rotation(yaw, 4, "Z")
                    @ Matrix.Rotation(-alpha, 4, "Y") @ Matrix.Translation(-axle_local))
    C.bake_object(case, frames, mats)
    case.scale = S
    err = [((m @ Matrix.Diagonal((*S, 1.0))) @ (Matrix.Diagonal((*S, 1.0)).inverted() @ grip_local) - g).length
           for m, (g, _) in zip(mats, grips)]
    tilt = [math.degrees(math.acos(max(-1, min(1, (m.to_3x3() @ Vector((0, 0, 1))).z)))) for m in mats]
    print(f"ANIM case: handle pulled out {EXT} m ({moved} vertices), {L:.3f} m axle to grip, tilt "
          f"{min(tilt):.0f}-{max(tilt):.0f} deg; grip error max {1000 * max(err):.1f} mm", flush=True)


def duffel_follow(frames, grips):
    """The duffel hangs from the left hand by its handles: its top centre just under the fist, its length along the
    walk, swinging a little behind the hand (a damped pendulum driven by the hand's own motion)."""
    duffel = bpy.data.objects["extra-bag-closed"]
    k = duffel.scale.x
    duffel.matrix_world = Matrix.Diagonal((k, k, k, 1.0))
    bpy.context.view_layer.update()
    dm = [o for o in duffel.children_recursive if o.type == "MESH"]
    dpts = [o.matrix_world @ v.co for o in dm for v in o.data.vertices]
    lo = Vector([min(p[i] for p in dpts) for i in range(3)])
    hi = Vector([max(p[i] for p in dpts) for i in range(3)])
    top = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, hi.z))
    # pendulum about the hand: angle th (about world X, along the walk) and ph (about Y, sideways)
    th = ph = 0.0
    vth = vph = 0.0
    dt = 1.0 / C.FPS
    Lp = 0.20                                            # hand to the bag's centre of mass
    prev = None
    mats = []
    swing = []
    vel_prev = None
    for g, _ in grips:
        vel = Vector((0, 0, 0)) if prev is None else (g - prev) / dt
        acc = Vector((0, 0, 0)) if vel_prev is None else (vel - vel_prev) / dt
        for _ in range(4):                               # sub-steps: the hand's acceleration swings the bag
            h = dt / 4
            # a held bag: the fist and both handles damp it hard; only part of the hand's jolt reaches it
            ath = -(9.81 / Lp) * math.sin(th) + 0.5 * acc.y / Lp * math.cos(th) - 9.0 * vth
            aph = -(9.81 / Lp) * math.sin(ph) - 0.5 * acc.x / Lp * math.cos(ph) - 9.0 * vph
            vth += ath * h
            vph += aph * h
            th += vth * h
            ph += vph * h
        prev, vel_prev = g.copy(), vel
        R = Matrix.Rotation(th, 4, "X") @ Matrix.Rotation(ph, 4, "Y") @ Matrix.Rotation(math.radians(90), 4, "Z")
        M = Matrix.Translation(g - Vector((0, 0, 0.040))) @ R @ Matrix.Translation(-top) @ Matrix.Diagonal((k, k, k, 1.0))
        mats.append(M)
        swing.append(math.degrees(max(abs(th), abs(ph))))
    duffel.parent = None
    C.bake_object(duffel, frames, mats)
    duffel.scale = (k, k, k)
    print(f"ANIM duffel: hangs from the left hand, swing up to {max(swing):.1f} deg", flush=True)


def report_feet(rig, feet, states, frames):
    """On the evaluated rig, follow each planted point (heel while the heel is down, ball while the ball is down)
    through its stance and report how far it moves: the foot slide."""
    sc = bpy.context.scene
    pb = rig.pose.bones
    rest = {k: rig.matrix_world @ rig.data.bones[f"DEF-foot.{k}"].matrix_local for k in ("L", "R")}
    local = {k: {"heel": rest[k].inverted() @ feet[k].heel, "ball": rest[k].inverted() @ feet[k].ball}
             for k in ("L", "R")}
    runs = {}
    low = 1.0
    for f in frames:
        sc.frame_set(f)
        for k in ("L", "R"):
            _, _, phase, idx = states[f][k]
            if idx is None:
                continue
            M = rig.matrix_world @ pb[f"DEF-foot.{k}"].matrix
            for pt, phases in (("heel", ("heel", "flat")), ("ball", ("flat", "toe"))):
                if phase in phases:
                    p = M @ local[k][pt]
                    runs.setdefault((k, idx, pt), []).append(p)
                    low = min(low, p.z)
    worst = max(((max((p - r[0]).length for p in r), key) for key, r in runs.items()), default=(0.0, None))
    sc.frame_set(C.F0)
    print(f"ANIM feet: planted point drift max {1000 * worst[0]:.2f} mm at {worst[1]} (limit 20 mm); lowest planted "
          f"point {1000 * low:+.1f} mm from the floor", flush=True)
    return worst[0]


if __name__ == "__main__":
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    out = a[a.index("--out") + 1] if "--out" in a else os.path.join(C.BLENDS, NAME + ".blend")
    build(base=a[a.index("--base") + 1] if "--base" in a else None,
          frames=list(range(1, int(a[a.index("--upto") + 1]) + 1)) if "--upto" in a else None)
    C.save(os.path.abspath(out))
