"""Stage: the prison visiting room, 2026 (Ch 08 "What twelve years can take"). Fluorescent Noir.

A row of six visiting booths along a glazed partition: on each side a counter on a painted block knee wall, thick
security glass in painted steel frames above it, full-height steel baffles between the booths, a visiting phone on
each booth's baffle, visitor chairs on the visitors' side and fixed pedestal stools on the inmates' side, a short
caged fluorescent fitting over every counter. Only the fittings over one booth burn; the rest of the row is dim or
dark. In that booth Dawn (people.dawn_prison()) sits on the inside with the handset at her ear, her brother Tim on
the visitors' side with his, his other hand flat on the counter. No tears, no hands on the glass: the glass between
them carries it. Every other booth is empty, its handsets on their hooks.

    <bpy python> -I scenes/shoot.py -- visiting_room <cam> out.png [--nocast]

Cameras (each carries its beat): wide (the row from the back of the visitors' room, the one lit booth), glass (over
Tim's shoulder through the glass to Dawn on the phone, his faint reflection in the glass between them: they sit a
little toward their own phones so it falls beside her face, not on it), empty (an empty booth: the handset hanging
on its hook, the other side's phone across the glass; the cast hidden). A hook on setkit.render applies each camera's
light trims (TRIMS), cast visibility, exposure, the glass's marks, reflectance and milky film ("film", "refl",
"film_diffuse"), the haze ("haze"), a sample multiplier ("spp_k") and the denoiser settings. VISIT_ONLY=glass,empty
in the environment limits `--cam all` to those cameras (one build).

Stage-side finishing of the shared cast (no change of wardrobe): the garments made matt (their satin specular under
the top light read as pale stone), with shaded folds; the prison top lifted from near black to a washed mid-dark grey
(round-1 critique: it read as body paint); the sculpted hair darker with deeper combed strands (at the cast's 0.2 the
crown under the tubes rendered brighter than the face and Tim read bald), as inspection_room.py and checkin_hall.py
do.

The set is visiting_room_set.py, its materials visiting_room_mats.py. The people come from scenes/people.py; this
stage seats, poses and places them: legs to FK and solved so the seat meets the seat and the soles the floor (after
departure_gate.py), the counter hand laid flat by measurement (after checkin_hall.py), the phone hand closed on a
handset that is placed against the ear found on the head mesh, gazes solved onto the other's eyes.
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
import visiting_room_set as st  # noqa: E402

EXPOSURE = -1.6
BOUNCE_W = 7.0                              # the counters' bounce into the two faces (W)
WORLD = 0.015

BXO = st.BX[st.OCC]                         # the occupied booth's centre x
TIM_SEAT = (BXO, -st.CHAIR_Y)               # the chair's seat centre
DAWN_SEAT = (BXO, st.STOOL_Y)               # the stool's centre
EMPTY = 2                                   # the booth of the empty-booth camera
TIM_DX, DAWN_DX = 0.08, -0.12               # each sits toward their own phone (Tim's right, Dawn's right)

FOCUS = {"fx_wide": (BXO, -0.3, 1.05),
         "fx_empty": (st.BX[EMPTY] + 0.5 - st.BAF_T / 2 - 0.06, -st.PHONE_Y + 0.02, st.PHONE_Z + 0.2)}
CAMERAS = {
    # A level lens keeps the baffles vertical. The shift holds the lit fixture and the row of waiting chairs.
    "wide": dict(loc=(1.8, -3.34, 1.46), aim=(-0.25, 0.35, 1.46), lens=24, focus="fx_wide", fstop=5.6, beat="ch08",
                 exposure=-1.85, shift_y=0.023),
    # Ch 08: over Tim's left shoulder, through the glass to Dawn with the handset at her ear (set by glass_camera());
    # no haze (it grained the reflection) and twice the samples, so his ghost in the glass comes out smooth
    "glass": dict(loc=(0, 0, 0), aim=(0, 0, 1), lens=50, focus="fx_dawn", fstop=2.8, beat="ch08", haze=False,
                  spp_k=2.0, refl=1.5, film=1.3),
    "reverse": dict(loc=(BXO + 0.34, 1.67, 1.35), aim=(BXO, -0.75, 1.17), lens=53, focus="fx_tim", fstop=2.8,
                    haze=False, beat="ch08", spp_k=2.0, refl=0.7, film=1.3),
    # Ch 08: an empty booth from a visitor's seat, a little behind it: the near phone with its handset on the hook
    # in the right third, the glass and its marks across the middle (the night light on the back wall reflecting in
    # it), and the other side's phone in its own pool of light in the left third (cast hidden)
    "empty": dict(loc=(st.BX[EMPTY] - 0.32, -1.6, 1.24), aim=(st.BX[EMPTY] + 0.15, 0.5, 1.17), lens=38,
                  focus="fx_empty", fstop=2.8, beat="ch08", cast=False, exposure=-1.6, film=1.6, refl=3.0,
                  film_diffuse=2.5),
}
# per-camera light trims: multipliers by light-name prefix (fittings scale their lens glow with them). Booth 2's
# fittings and the "emp_" lights exist for the empty-booth camera only.
TRIMS = {
    "wide": {f"fitv{EMPTY}": 0.0, f"fiti{EMPTY}": 0.0, "emp": 0.0, "night": 0.35},
    # the empty booth: its inmates' side in the light beyond the glass (about twice the visitors' side), its own
    # fitting low, so the near phone is lit from above and the glass side and the far one stands in a pool (the
    # occupied booth dark: another moment)
    "empty": {f"fitv{EMPTY}": 0.15, f"fiti{EMPTY}": 0.35, f"fitv{st.OCC}": 0.0, f"fiti{st.OCC}": 0.0,
              "bounce": 0.0, "idoor2": 0.3},
    "reverse": {f"fitv{EMPTY}": 0.0, f"fiti{EMPTY}": 0.0, "emp": 0.0, "night": 0.35,
                f"fiti{st.OCC}": 0.35, f"fitv{st.OCC}_down": 0.55, "bounce_Tim": 1.0},
    # over Tim's shoulder: his own fitting turned down so the back of his head in the foreground falls darker than
    # Dawn's face, the counter's bounce into his face raised so his reflection in the glass still reads
    "glass": {f"fitv{EMPTY}": 0.0, f"fiti{EMPTY}": 0.0, "emp": 0.0, "night": 0.35, f"fitv{st.OCC}": 0.27,
              "bounce_Tim": 2.4},
}
_STATE = {"cast": [], "holders": {}, "base": {}, "lens_base": {}}
if os.environ.get("VISIT_ONLY"):     # a convenience for re-shooting some cameras in one build: VISIT_ONLY=glass,empty
    CAMERAS = {k: v for k, v in CAMERAS.items() if k in os.environ["VISIT_ONLY"].split(",")}


# ---------------------------------------------------------------- small helpers
def place(holder, loc, facing_deg):
    holder.location = loc
    holder.rotation_euler = (0, 0, math.radians(facing_deg))
    bpy.context.view_layer.update()


def _rig(holder):
    return bpy.data.objects[holder["rig"]]


def eye_centre(holder):
    """Between the eyes (world), from the head bone: 4 cm up the bone and 7.5 cm out of the face (as in
    inspection_room.py: the statue-eye objects' matrices can read stale)."""
    rig = _rig(holder)
    bpy.context.view_layer.update()
    m = rig.pose.bones["head"].matrix
    p = m.translation + m.to_3x3().col[1].normalized() * 0.04 + m.to_3x3().col[2].normalized() * 0.075
    return rig.matrix_world @ p


def head_frame(holder):
    """(origin at the eyes, up, forward, right) of the head in world space; right is the figure's right."""
    rig = _rig(holder)
    bpy.context.view_layer.update()
    R = (rig.matrix_world.to_3x3() @ rig.pose.bones["head"].matrix.to_3x3())
    up = R.col[1].normalized()
    fwd = R.col[2].normalized()
    fwd = (fwd - up * fwd.dot(up)).normalized()
    right = fwd.cross(up).normalized()
    return eye_centre(holder), up, fwd, right


def face_local(holder):
    if "face_local" not in holder:
        rig = _rig(holder)
        rigged.pose_figure(holder, {})
        M = rig.pose.bones["head"].matrix.to_3x3().normalized()
        fwd = rig.matrix_world.to_3x3().normalized().inverted() @ (holder.matrix_world.to_3x3().normalized() @ Vector((0, -1, 0)))
        holder["face_local"] = list((M.inverted() @ fwd.normalized()).normalized())
    return Vector(holder["face_local"])


def face_dir(holder):
    rig = _rig(holder)
    loc = face_local(holder)
    bpy.context.view_layer.update()
    return ((rig.matrix_world @ rig.pose.bones["head"].matrix).to_3x3().normalized() @ loc).normalized()


def aim_head(holder, pose, target, max_turn=60):
    """pose["head"] = (down, turn) so the calibrated face line points at a world target (after checkin_hall.py)."""
    rig = _rig(holder)
    loc = face_local(holder)
    rigged.pose_figure(holder, dict(pose, head=(0, 0)))
    base = (rig.pose.bones["head"].matrix.to_3x3().normalized() @ loc).normalized()
    eye = eye_centre(holder)
    R = rig.matrix_world.to_3x3().normalized()
    t = (R.inverted() @ (Vector(target) - eye)).normalized()
    rot = lambda d_, t_: Matrix.Rotation(math.radians(t_), 3, "Z") @ Matrix.Rotation(math.radians(d_), 3, "X")
    best = None
    for dn in range(-30, 46):
        for tn in range(-max_turn, max_turn + 1):
            e = (rot(dn, tn) @ base).angle(t)
            if best is None or e < best[0]:
                best = (e, (dn, tn))
    pose["head"] = best[1]
    rigged.pose_figure(holder, pose)
    err = math.degrees(face_dir(holder).angle((Vector(target) - eye_centre(holder)).normalized()))
    return err, best[1]


def body_points(holder, only=None, unmasked=False):
    objs = [only] if only is not None else [o for o in [holder] + list(holder.children_recursive) if o.type == "MESH"]
    masks = [md for o in objs for md in o.modifiers if md.type == "MASK"] if unmasked else []
    for md in masks:
        md.show_viewport = False
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objs:
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = o.matrix_world
        pts.extend(mw @ v.co for v in me.vertices)
        ev.to_mesh_clear()
    for md in masks:
        md.show_viewport = True
    bpy.context.view_layer.update()
    return pts


# ---------------------------------------------------------------- seating (after departure_gate.py)
def sit_legs(holder, thigh, shin, knee_half=0.1, ankle_half=0.085):
    """Legs to FK, thighs swung forward `thigh` degrees and turned so the knees sit knee_half either side of the
    middle; shins `shin` degrees forward; feet flat and straight."""
    rig = _rig(holder)
    pb = rig.pose.bones
    for k in "LR":
        p = pb.get(f"thigh_parent.{k}")
        if p is not None and "IK_FK" in p.keys():
            p["IK_FK"] = 1.0
    bpy.context.view_layer.update()
    mw = rig.matrix_world
    rest = {}
    for k in "LR":
        f = (pb[f"foot_fk.{k}"].matrix.to_3x3() @ Vector((0, 1, 0)))
        f.x = 0.0
        rest[k] = f.normalized()
    mid = sum((mw @ pb[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2
    mid_a = rig.matrix_world.inverted() @ mid
    for side, k in ((1, "L"), (-1, "R")):
        head, tail = pb[f"thigh_fk.{k}"].head, pb[f"thigh_fk.{k}"].tail
        lt = (tail - head).length
        reach = lt * math.sin(math.radians(thigh))
        yaw = math.asin(max(-0.5, min(0.5, (abs(head.x - mid_a.x) - knee_half / rig.matrix_world.to_scale().x) / reach)))
        d = Matrix.Rotation(-side * yaw, 3, "Z") @ Matrix.Rotation(-math.radians(thigh), 3, "X") @ Vector((0, 0, -1))
        rigged._aim(rig, f"thigh_fk.{k}", d)
        sh, stl = pb[f"shin_fk.{k}"].head, pb[f"shin_fk.{k}"].tail
        ls = (stl - sh).length
        out = math.degrees(math.asin(max(-0.3, min(0.3, (ankle_half / rig.matrix_world.to_scale().x - abs(sh.x - mid_a.x)) / ls))))
        rigged._aim(rig, f"shin_fk.{k}", rigged._dir(0, shin, side, out))
        rigged._aim(rig, f"foot_fk.{k}", rest[k])


def hip_point(holder):
    rig = _rig(holder)
    bpy.context.view_layer.update()
    return sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2


def seat_solve(holder, upper, seat_z, tag):
    """With the figure at the origin facing -Y and the upper body posed: thigh and shin angles so the seat (skin
    under the hips) rests on a pan at seat_z and the soles on the floor. Returns (thigh, shin, dz): dz is how far
    the holder must rise."""
    body = bpy.data.objects[holder["body"]]
    thigh, shin = 84.0, 6.0
    dz = 0.0
    for it in range(9):
        rigged.pose_figure(holder, upper)
        sit_legs(holder, thigh, shin)
        hip = hip_point(holder)
        skin = body_points(holder, only=body, unmasked=True)
        seat_pts = [p for p in skin if hip.y - 0.12 < p.y < hip.y + 0.2 and 0.03 < abs(p.x - hip.x) < 0.19 and p.z < hip.z]
        sole_pts = [p for p in body_points(holder) if p.y < hip.y - 0.3]
        butt = min(p.z for p in seat_pts)
        sole = min(p.z for p in sole_pts)
        dz = seat_z - 0.006 - butt
        gap = sole + dz
        print(f"VISIT {tag} seated it {it}: thigh {thigh:.1f} shin {shin:.1f} soles {gap * 1000:+.1f} mm", flush=True)
        if abs(gap) < 0.004:
            break
        if gap > 0:
            c = math.cos(math.radians(shin)) + gap / 0.42
            if c < 1.0:
                shin = math.degrees(math.acos(c))
            else:
                shin = 0.0
                thigh -= math.degrees((c - 1.0) * 0.42 / 0.43)
        else:
            c = math.cos(math.radians(shin)) + gap / 0.42
            if c > math.cos(math.radians(34)):
                shin = math.degrees(math.acos(c))
            else:
                thigh += math.degrees(-gap / 0.43)
    return thigh, shin, dz


def seat_place(holder, facing_deg, hip_xy, dz):
    """Turn the holder to its facing and move it so the hip joint sits over hip_xy, raised by dz."""
    holder.rotation_euler = (0, 0, math.radians(facing_deg))
    bpy.context.view_layer.update()
    hip = hip_point(holder)
    holder.location += Vector((hip_xy[0], hip_xy[1], hip.z + dz)) - hip
    bpy.context.view_layer.update()


# ---------------------------------------------------------------- arms and hands
def _curl(holder, side, deg, thumb=None):
    rig = _rig(holder)
    pb = rig.pose.bones
    for f in ("f_index", "f_middle", "f_ring", "f_pinky"):
        n = f"{f}.01_master.{side}"
        if n in pb:
            pb[n].rotation_mode = "XYZ"
            pb[n].rotation_euler.x = math.radians(deg)
    if thumb is not None:
        n = f"thumb.01_master.{side}"
        if n in pb:
            pb[n].rotation_mode = "XYZ"
            pb[n].rotation_euler.x = math.radians(thumb)
    bpy.context.view_layer.update()


def solve_wrist(holder, pose, side, target, prefer=None, wgt=0.0):
    """(forward, out, elbow) for pose_figure that puts the wrist (forearm tail) on a world target, on the rig's own
    bone lengths; a coarse grid then a fine one, with an optional pull toward a natural `prefer`."""
    rig = _rig(holder)
    sgn = 1 if side == "L" else -1
    rigged.pose_figure(holder, pose)
    pb = rig.pose.bones
    sh = np.array(pb[f"upper_arm_fk.{side}"].head)
    L1, L2 = pb[f"upper_arm_fk.{side}"].length, pb[f"forearm_fk.{side}"].length
    T = np.array(rig.matrix_world.inverted() @ Vector(target))

    def dirs(f, o):
        f, o = np.radians(f), np.radians(o)
        return np.stack([sgn * np.cos(f) * np.sin(o), -np.sin(f), -np.cos(f) * np.cos(o)], axis=-1)

    def search(F, O, E):
        w = sh + L1 * dirs(F, O) + L2 * dirs(F + E, O * 0.6)
        err = np.linalg.norm(w - T, axis=-1)
        cost = err.copy()
        if prefer is not None:
            cost = cost + wgt * (np.abs(F - prefer[0]) + np.abs(O - prefer[1]) + 0.5 * np.abs(E - prefer[2]))
        i = np.unravel_index(np.argmin(cost), cost.shape)
        return (float(F[i]), float(O[i]), float(E[i])), float(err[i])
    F, O, E = np.meshgrid(np.arange(-20, 121, 2.0), np.arange(-30, 71, 2.0), np.arange(0, 161, 2.0), indexing="ij")
    (f0, o0, e0), _ = search(F, O, E)
    F, O, E = np.meshgrid(np.arange(f0 - 3, f0 + 3.01, 0.5), np.arange(o0 - 3, o0 + 3.01, 0.5),
                          np.arange(e0 - 3, e0 + 3.01, 0.5), indexing="ij")
    return search(F, O, E)


def set_hand(holder, side, x_palm, y_fingers, twist=0.7):
    """Turn the hand so its palm faces x_palm and its fingers run along y_fingers (world), most of the twist taken
    in the forearm. The hand bone's own X axis is the palm side on the left hand; on the right it is checked by the
    curled fingers and flipped if need be."""
    rig = _rig(holder)
    pb = rig.pose.bones
    R = rig.matrix_world.to_3x3().normalized().inverted()
    y = (R @ Vector(y_fingers)).normalized()
    x = R @ Vector(x_palm)
    x = (x - y * x.dot(y)).normalized()
    if holder.get(f"palm_flip_{side}"):
        x = -x
    z = x.cross(y)
    fa = pb[f"forearm_fk.{side}"]
    fm = fa.matrix.copy()
    fy = fm.to_3x3().col[1].normalized()
    fx = fm.to_3x3().col[0].normalized()
    want = (x - fy * x.dot(fy)).normalized()
    ang = fx.angle(want) * twist
    if fx.cross(want).dot(fy) < 0:
        ang = -ang
    h0 = fm.translation.copy()
    fa.matrix = Matrix.Translation(h0) @ Matrix.Rotation(ang, 4, fy) @ Matrix.Translation(-h0) @ fm
    bpy.context.view_layer.update()
    hb = pb[f"hand_fk.{side}"]
    head = hb.matrix.translation.copy()
    hm = Matrix((x, y, z)).transposed().to_4x4()
    hm.translation = head
    hb.matrix = hm
    bpy.context.view_layer.update()


def palm_side(holder, side):
    """The direction (world) the palm faces, from the hand's measured vertices: from the knuckle line toward where
    the curled fingertips gather (fingers curl toward the palm)."""
    hv = rigged.hand_surface(holder, side)
    rig = _rig(holder)
    hb = rig.pose.bones[f"hand_fk.{side}"]
    a = (rig.matrix_world.to_3x3() @ (hb.tail - hb.head)).normalized()
    pc = sum(hv["palm"], Vector()) / len(hv["palm"])
    fc = sum(hv["fingers"], Vector()) / len(hv["fingers"])
    d = fc - pc
    n = d - a * d.dot(a)
    return n.normalized(), pc


def calibrate_palm(holder, pose, side):
    """Whether set_hand's X axis is the palm side for this hand: pose, set a known frame, curl, measure."""
    rigged.pose_figure(holder, pose)
    holder[f"palm_flip_{side}"] = False
    set_hand(holder, side, (0, 0, -1), (0, 1, 0))
    _curl(holder, side, 70)
    n, _ = palm_side(holder, side)
    flip = n.dot(Vector((0, 0, -1))) < 0
    holder[f"palm_flip_{side}"] = bool(flip)
    print(f"VISIT {holder.name} {side} hand: palm along bone {'-X' if flip else '+X'} (measured {tuple(round(c, 2) for c in n)})", flush=True)
    return flip


def rest_hand(holder, pose, side, wrist_target, top_z, fwd_dir, curl=16.0):
    """Lay one hand palm-down and flat on a surface at top_z, wrist near wrist_target (world), fingers along
    fwd_dir (after checkin_hall.py): solve the wrist, turn the hand flat, curl, then measure the hand's vertices
    and correct its height so the palm touches (about 2 mm) and palm and fingers lie on one plane."""
    key = "l_arm" if side == "L" else "r_arm"
    target = Vector(wrist_target)
    pitch = 0.0
    for attempt in range(6):
        arm, fit = solve_wrist(holder, pose, side, target, prefer=(20, 12, 70), wgt=0.0002)
        pose[key] = arm
        rigged.pose_figure(holder, pose)
        y = Vector(fwd_dir).normalized()
        x = Vector((0, 0, -1))
        z = x.cross(y)
        if pitch:
            q = Matrix.Rotation(pitch, 3, z)
            x, y = (q @ x).normalized(), (q @ y).normalized()
        set_hand(holder, side, x, y)
        _curl(holder, side, curl)
        hv = rigged.hand_surface(holder, side)
        palm_low, finger_low = min(p.z for p in hv["palm"]), min(p.z for p in hv["fingers"])
        low = min(palm_low, finger_low)
        if attempt < 5:
            if attempt < 4:
                pitch += 0.85 * math.atan2(palm_low - finger_low, 0.08)
                low = min(low, palm_low - 0.85 * (palm_low - finger_low) * 0.5)
            target = target + Vector((0, 0, top_z + 0.002 - low))
    rest = dict(x=x, y=y, curl=curl)
    print(f"VISIT {holder.name} {side} hand on the counter: arm {tuple(round(v, 1) for v in arm)} wrist fit {fit * 1000:.0f} mm, "
          f"palm {(palm_low - top_z) * 1000:+.1f} mm, fingers {(finger_low - top_z) * 1000:+.1f} mm over the top", flush=True)
    return rest


def ear_point(holder, side):
    """The outer surface of the ear on one side (+1 the figure's right), from the head mesh: the most lateral skin
    between 1 and 6 cm under the eyes and 5 to 12 cm behind them."""
    e, up, fwd, right = head_frame(holder)
    lat = right * side
    body = bpy.data.objects[holder["body"]]
    pts = [p for p in body_points(holder, only=body) if (p - e).length < 0.22]
    best = None
    for p in pts:
        d = p - e
        u, f, l = d.dot(up), d.dot(fwd), d.dot(lat)
        if -0.065 < u < -0.01 and -0.13 < f < -0.05 and l > 0:
            if best is None or l > best[0]:
                best = (l, p)
    return best[1] if best else e - fwd * 0.09 + lat * 0.08 - up * 0.03


def handset_frame(holder, side, tilt=0.0):
    """Where the handset sits on the face (world): its earpiece's face on the ear, the mouthpiece in front of the
    mouth's corner a little off the cheek. Returns (origin, X across, Y long toward the earpiece, Z away from the
    face)."""
    e, up, fwd, right = head_frame(holder)
    lat = right * side
    # the ear point found on the mesh is the helix's outermost skin, above the canal: the earpiece goes 2.5 cm lower
    # (round-1 critique: the earpiece sat at the temple, the mouthpiece at the jaw)
    ear = ear_point(holder, side) + lat * 0.004 - up * 0.025
    mouth = e - up * 0.10 + fwd * 0.005 + lat * 0.05
    Y = (ear - mouth).normalized()
    Z = (lat - Y * lat.dot(Y)).normalized()
    X = Y.cross(Z).normalized()
    if X.dot(fwd) < 0:
        X = -X
    if tilt:
        q = Matrix.Rotation(math.radians(tilt), 3, Z)
        X, Y = q @ X, q @ Y
    O = ear - Y * 0.072 + Z * 0.027
    return O, X, Y, Z


def two_bone(holder, side, wrist, pole):
    """Aim the upper arm and forearm directly so the wrist lands on a world point, the elbow swung toward `pole`
    (a world direction): the elbow on the circle where the two bone lengths meet, at its point nearest the pole."""
    rig = _rig(holder)
    pb = rig.pose.bones
    mw = rig.matrix_world
    k = mw.to_scale().x
    S = mw @ pb[f"upper_arm_fk.{side}"].head
    L1, L2 = pb[f"upper_arm_fk.{side}"].length * k, pb[f"forearm_fk.{side}"].length * k
    W = Vector(wrist)
    d = (W - S).length
    d = max(abs(L1 - L2) + 1e-4, min(L1 + L2 - 1e-4, d))
    n = (W - S).normalized()
    a = (L1 * L1 - L2 * L2 + d * d) / (2 * d)
    r = math.sqrt(max(0.0, L1 * L1 - a * a))
    u = Vector(pole) - n * Vector(pole).dot(n)
    u = u.normalized()
    E = S + n * a + u * r
    W2 = S + n * d
    inv = mw.to_3x3().inverted()
    rigged._aim(rig, f"upper_arm_fk.{side}", inv @ (E - S))
    rigged._aim(rig, f"forearm_fk.{side}", inv @ (W2 - E))
    flex = math.degrees(math.pi - (E - S).angle(W2 - E)) if r > 0 else 180.0
    return E, flex, (W - S).length - d


def grip_dir(frame):
    """The fingers' direction on the handset: mostly straight across its handle (X, forward-up), a little along it
    toward the earpiece (Y), so the fingers wrap the handle's front edge and the wrist sits behind and below it near
    the jaw. (Round-1 critique: at 0.6 X + 0.8 Y the fingers ran up past the earpiece and rested on the temple.)"""
    O, X, Y, Z = frame
    return (0.92 * X + 0.38 * Y).normalized()


def receiver_grip(holder, side):
    rigged.articulate_hand(holder, side, {"f_index": (45, 33, 22), "f_middle": (49, 38, 25),
                                         "f_ring": (54, 39, 26, 4), "f_pinky": (57, 41, 25, 8),
                                         "thumb": (12, 19, 14)})


def phone_hand(holder, pose, side, frame):
    """Close one hand on the handset's handle: the palm on its outer side, the fingers running forward across it and
    curling round its front edge toward the cheek, the wrist behind it. Returns the arm and the fit."""
    O, X, Y, Z = frame
    key = "l_arm" if side == "L" else "r_arm"
    rig = _rig(holder)
    L3 = rig.pose.bones[f"hand_fk.{side}"].length * rig.matrix_world.to_scale().x
    y_f = grip_dir(frame)                              # the handle runs diagonally across the palm
    # the hand bone's middle: behind the handle's outer face, a little below its centre (toward the mouthpiece) and
    # back from its front edge, so the knuckles sit just past that edge and the curled fingers close round it
    mid = O + Z * 0.033 - Y * 0.041 - X * 0.006
    wrist = mid - y_f * (0.5 * L3)
    e, up, fwd, right = head_frame(holder)
    pole = Vector((0, 0, -1)) + right * (1 if side == "R" else -1) * 0.55 + fwd * 0.35
    E, flex, miss = two_bone(holder, side, wrist, pole)
    set_hand(holder, side, -Z, y_f, twist=0.6)
    receiver_grip(holder, side)
    holder[f"phone_wrist_{side}"] = list(wrist)
    holder[f"phone_pole_{side}"] = list(pole)
    return (round(E.z, 3), round(flex, 1)), miss


# ---------------------------------------------------------------- finishing the shared cast for this light
def matt_cloth(holder, item, rough=0.92, bump=0.25, rgb=None, folds=0.0, fade=0.0):
    """A garment finished as matt cloth in its people.py colour (after inspection_room.py's cloth()): its normal map
    (whose fine stripes shimmer) dropped for a woven-noise bump, no sheen and almost no specular. Under the booth's
    top light the grazing specular of the satin garments was as bright as the stone's diffuse, so the dark suit and
    the prison top both read as pale stone.

    `rgb` replaces the garment's flat tint (already the colour it should read, after FABRIC_VALUE); `folds` darkens
    the creases (ambient occlusion over a few centimetres) so the cloth shows its folds; `fade` mottles it as a
    much-washed garment (broad patches up to that fraction lighter)."""
    ob = bpy.data.objects.get(f"{holder.name}_{item}")
    if ob is None:
        print(f"VISIT no garment {holder.name}_{item}", flush=True)
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
        b.inputs["Specular IOR Level"].default_value = 0.04
        if "Coat Weight" in b.inputs:
            b.inputs["Coat Weight"].default_value = 0.0
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
        if rgb is None and not folds and not fade:
            continue
        src = b.inputs["Base Color"].links[0].from_socket if b.inputs["Base Color"].links else None
        if rgb is not None and src is not None and src.node.type == "MIX":
            sock = [i for i in src.node.inputs if i.name == "B" and i.type == "RGBA"][0]
            sock.default_value = (*rgb, 1.0)
        col = src
        if col is None:
            continue
        if fade:
            fz = nt.nodes.new("ShaderNodeTexNoise")
            fz.inputs["Scale"].default_value = 7.0
            fz.inputs["Detail"].default_value = 3.0
            nt.links.new(tc.outputs["Object"], fz.inputs["Vector"])
            fr = nt.nodes.new("ShaderNodeMapRange")
            fr.inputs["From Min"].default_value, fr.inputs["From Max"].default_value = 0.4, 0.75
            fr.inputs["To Min"].default_value, fr.inputs["To Max"].default_value = 1.0, 1.0 + fade
            nt.links.new(fz.outputs["Fac"], fr.inputs["Value"])
            mx = nt.nodes.new("ShaderNodeMix")
            mx.data_type, mx.blend_type = "RGBA", "MULTIPLY"
            mx.inputs["Factor"].default_value = 1.0
            nt.links.new(col, [i for i in mx.inputs if i.name == "A" and i.type == "RGBA"][0])
            cc = nt.nodes.new("ShaderNodeCombineColor")
            for k in ("Red", "Green", "Blue"):
                nt.links.new(fr.outputs["Result"], cc.inputs[k])
            nt.links.new(cc.outputs[0], [i for i in mx.inputs if i.name == "B" and i.type == "RGBA"][0])
            col = [o for o in mx.outputs if o.type == "RGBA"][0]
        if folds:
            ao = nt.nodes.new("ShaderNodeAmbientOcclusion")
            ao.samples = 6
            ao.inputs["Distance"].default_value = 0.05
            ar = nt.nodes.new("ShaderNodeMapRange")
            ar.inputs["From Min"].default_value, ar.inputs["From Max"].default_value = 0.35, 1.0
            ar.inputs["To Min"].default_value, ar.inputs["To Max"].default_value = 1.0 - folds, 1.0
            nt.links.new(ao.outputs["AO"], ar.inputs["Value"])
            mx = nt.nodes.new("ShaderNodeMix")
            mx.data_type, mx.blend_type = "RGBA", "MULTIPLY"
            mx.inputs["Factor"].default_value = 1.0
            nt.links.new(col, [i for i in mx.inputs if i.name == "A" and i.type == "RGBA"][0])
            cc = nt.nodes.new("ShaderNodeCombineColor")
            for k in ("Red", "Green", "Blue"):
                nt.links.new(ar.outputs["Result"], cc.inputs[k])
            nt.links.new(cc.outputs[0], [i for i in mx.inputs if i.name == "B" and i.type == "RGBA"][0])
            col = [o for o in mx.outputs if o.type == "RGBA"][0]
        nt.links.new(col, b.inputs["Base Color"])
    return ob


def sculpt_hair(name, value=0.07, strands=0.12):
    """The shared cast's carved-strand bump reads as a ribbed knit beanie close up (checkin_hall.py's fix): a
    sculpted stone with a combed undulation, and a matt finish so the top light does not turn the darker hair as
    pale as the face. Round-1 critique: from behind, Tim's crown under the booth's fitting rendered as pale as skin
    (a bald egg): darker still, and the combed strands carved deeper so the crown has relief."""
    m = bpy.data.materials.get(f"hair_{name}")
    if not m:
        return
    for n in m.node_tree.nodes:
        if n.type == "BUMP":
            n.inputs["Strength"].default_value = strands
        elif n.type == "TEX_WAVE":
            n.inputs["Scale"].default_value = 22.0
            n.inputs["Distortion"].default_value = 4.0
            n.inputs["Detail"].default_value = 1.5
        elif n.type == "BSDF_PRINCIPLED":
            n.inputs["Roughness"].default_value = 0.95
            n.inputs["Specular IOR Level"].default_value = 0.05
            # a shade darker than the cast's 0.2: under the booth's top light the crown faces the tubes and the face
            # does not, so at 0.2 the hair rendered brighter than the face and Tim read bald
            n.inputs["Base Color"].default_value = (value, value, value * 1.05, 1.0)


# ---------------------------------------------------------------- the cast
def build_cast():
    m = st.materials()
    holders = {}
    # Tim: on the visitors' side, facing the glass (+Y), leaning in; the handset in his right hand (his right is +X,
    # toward the phone on the booth's +X baffle), his left hand flat on the counter
    t = people.tim()
    castkit.relax_sculpted_hair(t)
    d = people.dawn_prison(uniform=True)
    matt_cloth(t, "male_elegantsuit01", folds=0.35)
    # Keep the shared grey of the long-sleeved shirt and trousers under the visiting booth lights.
    matt_cloth(d, people.PRISON_UNIFORM, bump=0.22, folds=0.35, fade=0.10)
    sculpt_hair("Tim", 0.04, 0.16)
    sculpt_hair("DawnPrison", 0.045, 0.1)
    holders["Tim"], holders["Dawn"] = t, d
    sc = _STATE["tim_seat_c"]
    # Dawn sits a little to her right of the stool's centre and Tim a little to his right, so seen through the glass
    # from over his shoulder his faint reflection falls beside her face, not on it
    seats = {"Tim": (st.CHAIR_SEAT_Z, 180.0, (sc[0] + TIM_DX, sc[1] - 0.03)),
             "Dawn": (st.STOOL_Z, 0.0, (DAWN_SEAT[0] + DAWN_DX, DAWN_SEAT[1] + 0.01))}
    # Dawn sits more bowed than in round 1 (chest and neck further down): twelve years inside, weary, not upright
    upper = {"Tim": {"chest": (15, 0), "neck": (4, 0), "fingers": 22},
             "Dawn": {"chest": (17, 0), "neck": (6, 0), "fingers": 22}}
    legs = {}
    for n, h in holders.items():
        seat_z, face, hip_xy = seats[n]
        th, sh, dz = seat_solve(h, upper[n], seat_z, n)
        legs[n] = (th, sh)
        seat_place(h, face, hip_xy, dz)
    for n, h in holders.items():
        _STATE["cast"] += [h] + list(h.children_recursive)
    poses = {}
    # gazes: each onto the other's eyes (through the glass); Dawn's a little low, on his mouth (her head a few
    # degrees down: tired, listening)
    drop = {"Tim": 0.15, "Dawn": 0.07}
    for n, other in (("Tim", "Dawn"), ("Dawn", "Tim")):
        p = dict(upper[n])
        err, hd = aim_head(holders[n], p, eye_centre(holders[other]) - Vector((0, 0, drop[n])))
        poses[n] = p
        print(f"VISIT {n} head {hd}, gaze error {err:.1f} deg", flush=True)
    for n, other in (("Dawn", "Tim"), ("Tim", "Dawn")):     # again, now the other's head has turned
        err, hd = aim_head(holders[n], poses[n], eye_centre(holders[other]) - Vector((0, 0, drop[n])))
        print(f"VISIT {n} head {hd}, gaze error {err:.1f} deg (second pass)", flush=True)
    # the counter hands: Tim's left, Dawn's left; wrist about 20 cm to the side of the body's centre
    rests = {}
    for n, h in holders.items():
        calibrate_palm(h, poses[n], "L")
        calibrate_palm(h, poses[n], "R")
    # (round-1 critique: Tim's counter hand shows in no frame. Measured by ray casts: from the wide's camera, high
    # behind his right shoulder, his back hides the counter in front of him for any wrist less than ~45 cm left of
    # his centre, and the glass shot frames above the counter; so the hand stays where a resting hand goes)
    tw = (BXO + TIM_DX - 0.19, -0.27, st.TOP + 0.06)
    dw = (BXO + DAWN_DX + 0.19, 0.35, st.TOP + 0.06)
    # the phone hands: the handset on the right ear (Tim's right is +X, Dawn's -X), the hand closed on it
    frames, hs = {}, {}
    for n in ("Tim", "Dawn"):
        h = holders[n]
        rigged.pose_figure(h, poses[n])
        frames[n] = handset_frame(h, +1, tilt=25.0 if n == "Dawn" else 10.0)
        arm, fit = phone_hand(h, poses[n], "R", frames[n])
        print(f"VISIT {n} phone arm: elbow z {arm[0]}, flex {arm[1]} deg, wrist short by {fit * 1000:.0f} mm", flush=True)
    for n, w, fwd in (("Tim", tw, Vector((0.28, 1.0, 0.0))), ("Dawn", dw, Vector((-0.28, -1.0, 0.0)))):
        rests[n] = rest_hand(holders[n], poses[n], "L", w, st.TOP, fwd.normalized(), curl=16.0)
    # rest_hand re-posed the figure from its pose dict: re-close the phone hand, then the legs
    for n in ("Tim", "Dawn"):
        h = holders[n]
        rigged.pose_figure(h, poses[n])
        r = rests[n]
        set_hand(h, "L", r["x"], r["y"])
        _curl(h, "L", r["curl"])
        O, X, Y, Z = frames[n]
        y_f = grip_dir(frames[n])
        two_bone(h, "R", Vector(h["phone_wrist_R"]), Vector(h["phone_pole_R"]))
        set_hand(h, "R", -Z, y_f, twist=0.6)
        receiver_grip(h, "R")
        sit_legs(h, *legs[n])
        hv = rigged.hand_surface(h, "R")
        pc = sum(hv["palm"], Vector()) / len(hv["palm"])
        # the handset follows the hand where they disagree: its handle centred under the palm, keeping its angle
        handle = O + Z * 0.004
        palm_n, _ = palm_side(h, "R")
        want = pc + palm_n * 0.024
        shift = want - handle
        shift -= Y * shift.dot(Y) * 0.5                  # along its length the ear decides more than the hand
        O2 = O + shift
        hs[n] = st.handset(f"handset_{n}")
        hs[n].matrix_world = Matrix((X, Y, Z)).transposed().to_4x4()
        hs[n].matrix_world.translation = O2
        hs[n].location = O2
        print(f"VISIT {n} handset moved {shift.length * 1000:.0f} mm onto the hand (ear gap now "
              f"{(O2 - O).dot(Z) * 1000:+.0f} mm)", flush=True)
        _STATE["cast"] += [hs[n]] + list(hs[n].children_recursive)
    bpy.context.view_layer.update()
    # cords from the two phone boxes to the handsets
    for n, ex in (("Tim", _STATE["exit_v"]), ("Dawn", _STATE["exit_i"])):
        hsr = hs[n]
        b = hsr.matrix_world @ Vector(hsr["cord_local"])
        bdir = hsr.matrix_world.to_3x3() @ Vector((0, -1, 0))
        c = st.cord(f"cord_{n}", ex, b, bdir, sag=0.16)
        _STATE["cast"].append(c)
    # the lit counter's bounce up into each face (its top is dark, so it is weak): a soft source lying on the
    # counter in front of the sitter, aimed at the eyes, unseen by the camera and in the glass
    for n in ("Tim", "Dawn"):
        e = eye_centre(holders[n])
        cy = -0.3 if n == "Tim" else 0.3
        li = st.area(f"bounce_{n}", (e.x, cy, st.TOP + 0.03), (0.4, 0.22), BOUNCE_W, (0.85, 0.9, 0.95), spread=110,
                     glossy=False)
        li.rotation_euler = (e - li.location).to_track_quat("-Z", "Y").to_euler()
        li.visible_volume_scatter = False
        _STATE["cast"].append(li)
    eyes = eye_centre(t)
    rim = st.area("rim_Tim", tuple(eyes + Vector((0, -0.45, 0.55))), (0.3, 0.1), 6.0, st.COOL,
                  spread=65, glossy=False)
    rim.rotation_euler = (eyes + Vector((0, 0, -0.23)) - rim.location).to_track_quat("-Z", "Y").to_euler()
    rim.visible_camera = rim.visible_volume_scatter = False
    clothes = bpy.data.collections.new("Tim reverse shoulder light")
    for obj in t.children_recursive:
        if obj.type == "MESH" and "male_elegantsuit01" in obj.name:
            clothes.objects.link(obj)
    rim.light_linking.receiver_collection = clothes
    # focus marks and a report
    st.empty("fx_dawn", tuple(eye_centre(d)))
    st.empty("fx_tim", tuple(eye_centre(t)))
    for n, h in holders.items():
        pts = body_points(h)
        lo = min(p.z for p in pts)
        print(f"VISIT {n}: lowest point {lo * 1000:+.1f} mm, eyes {tuple(round(c, 3) for c in eye_centre(h))}", flush=True)
    _STATE["holders"] = holders
    _STATE["handsets"] = hs
    return holders


# ---------------------------------------------------------------- set build
def booths():
    """Chairs and stools, the phones: built ones everywhere (round-1 critique: the Tripo prop's cord ended in
    mid-air), the handsets hung in their cradles in the empty booths and in hand in the occupied one."""
    for i, bx in enumerate(st.BX):
        st.stool(i)
        if i != st.OCC:
            jit = [6.0, -4.0, 9.0, 0.0, -7.0, 3.0][i]
            dy = [0.05, -0.02, 0.12, 0.0, 0.0, 0.08][i]
            st.chair((bx + [0.03, -0.04, 0.0, 0.0, 0.05, -0.02][i], -st.CHAIR_Y - dy), 90.0 + jit, name=f"vchair{i}")
            sw = [0.02, -0.015, 0.025, 0.0, 0.018, -0.02][i]
            st.hung_phone(f"phone_v{i}", bx + P2 - st.BAF_T / 2, -st.PHONE_Y, -1, swing=sw)
            st.hung_phone(f"phone_i{i}", bx - P2 + st.BAF_T / 2, st.PHONE_Y, +1, swing=-sw)
    ch = st.chair(TIM_SEAT, 90.0, name="vchair_tim")
    # the chair stands so its seat (not its footprint) is centred in the booth, and the seat's top under Tim is
    # found by ray casts onto it
    off = Vector(ch["seat_off"])
    ch.location = (TIM_SEAT[0] - off.x, TIM_SEAT[1] - off.y, 0.0)
    _STATE["tim_seat_c"] = TIM_SEAT
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    zs = []
    for dx in (-0.06, 0.0, 0.06):
        for dy in (-0.06, 0.0, 0.06):
            hit, loc, *_ = bpy.context.scene.ray_cast(dg, Vector((TIM_SEAT[0] + dx, TIM_SEAT[1] + dy, 1.2)), Vector((0, 0, -1)))
            if hit and 0.3 < loc.z < 0.6:
                zs.append(loc.z)
    zs.sort()
    st.CHAIR_SEAT_Z = zs[len(zs) // 2] if zs else 0.45
    print(f"VISIT chair seat hits {[round(z, 3) for z in zs]} -> {st.CHAIR_SEAT_Z:.3f}", flush=True)
    _STATE["exit_v"] = st.phone_box("phone_v_occ", BXO + P2 - st.BAF_T / 2, -st.PHONE_Y, -1)
    _STATE["exit_i"] = st.phone_box("phone_i_occ", BXO - P2 + st.BAF_T / 2, st.PHONE_Y, +1)
    return ch


P2 = st.P / 2


def haze(density=0.003):
    sk.haze((2 * st.XW - 0.02, st.Y1 - st.Y0 - 0.02, st.H - 0.02), (0, (st.Y0 + st.Y1) / 2, st.H / 2), density)


def empty_lights():
    """Lights for the empty-booth camera only (trimmed to 0 for the others; round-1 critique: the glass did not
    read, the far phone stood in shadow and nothing in the frame reached a highlight). A raking strip at the head of
    the pane on the visitors' side, 3 cm off the glass and leaning into it, that lights the prints and wipe marks
    as a milky film and lays a line of light along the sill; a pool over the far phone on the inmates' counter; a
    small raking source over the near phone so its box's top edge and the handset's crown catch the light."""
    bx = st.BX[EMPTY]
    gz = st.HEAD[0] - 0.035
    st.area("emp_graze", (bx, -(st.GT / 2 + 0.05), gz), (st.P - st.MUL - 0.08, 0.035), 30.0, st.COOL, spread=40,
            rot=(math.radians(16), 0, 0))
    far = (bx - P2 + st.BAF_T / 2 + 0.14, st.PHONE_Y + 0.03, st.PHONE_Z + 0.62)
    target = Vector((bx - P2 + st.BAF_T / 2 + 0.08, st.PHONE_Y, st.PHONE_Z + 0.16))
    origin = target + Vector((0.12, 0.12, 0.35))
    key = st.area("emp_farkey", tuple(origin), (0.12, 0.25), 19.0, st.COOL, spread=45)
    key.rotation_euler = (target - origin).to_track_quat("-Z", "Y").to_euler()
    st.area("emp_pool", far, (0.3, 0.1), 45.0, st.COOL, spread=70, rot=(math.radians(-6), math.radians(14), 0),
            glossy=False)
    near = (bx + P2 - st.BAF_T / 2 - 0.16, -st.PHONE_Y + 0.02, st.PHONE_Z + 0.7)
    st.area("emp_rake", near, (0.06, 0.2), 9.0, st.COOL, spread=50, rot=(0, math.radians(-18), 0))


# ---------------------------------------------------------------- per camera
def glass_camera():
    """Register both close angles to the posed eyes."""
    hs = _STATE.get("holders")
    if not hs:
        return
    te, de = eye_centre(hs["Tim"]), eye_centre(hs["Dawn"])
    if glass := CAMERAS.get("glass"):
        loc = te + Vector((-0.30, -1.30, 0.22))
        aim = de + Vector((0.16, 0.0, -0.08))
        glass["loc"] = tuple(round(v, 4) for v in loc)
        glass["aim"] = tuple(round(v, 4) for v in aim)
    if reverse := CAMERAS.get("reverse"):
        reverse["loc"] = tuple(de + Vector((0.34, 0.94, 0.12)))
        reverse["aim"] = tuple(te + Vector((-0.08, 0, -0.075)))


def which_camera():
    cam = bpy.context.scene.camera
    if cam is None:
        return None
    for n, c in CAMERAS.items():
        if (cam.location - Vector(c["loc"])).length < 1e-3:
            return n
    return None


def apply_camera(name):
    cfg = CAMERAS.get(name, {})
    show = cfg.get("cast", True)
    reverse = name == "reverse"
    for o in _STATE["cast"]:
        o.hide_render = not show
    dawn_cord = bpy.data.objects.get("cord_Dawn")
    if dawn_cord is not None:
        # Keep the foreground cable from crossing her cheek in Tim's reverse.
        dawn_cord.visible_camera = not reverse
    trims = TRIMS.get(name, {})
    for n, ob in st.LIGHTS.items():
        b = _STATE["base"].setdefault(n, ob.data.energy)
        k = next((v for p, v in trims.items() if n == p or n.startswith(p + "_")), 1.0)
        ob.data.energy = b * k
    if rim := st.LIGHTS.get("rim_Tim"):
        rim.hide_render = not reverse
    visitor_down = st.LIGHTS[f"fitv{st.OCC}_down"].data
    spread = _STATE.setdefault("visitor down spread", visitor_down.spread)
    visitor_down.spread = math.radians(60) if reverse else spread
    for n, mat in st.PARTS.get("lens", {}).items():
        mr = mat.node_tree.nodes.get("lens_strength")
        if mr is None:
            continue
        b = _STATE["lens_base"].setdefault(n, (mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value))
        k = trims.get(n, 1.0)
        mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = b[0] * k, b[1] * k
    # the security glass: strength of its marks, its clean reflectance and the marks' milky diffuse, per camera
    mat = bpy.data.materials.get("security glass")
    for node_name, key in (("film_gain", "film"), ("refl_gain", "refl"), ("film_diffuse", "film_diffuse")):
        node = mat.node_tree.nodes.get(node_name) if mat else None
        if node is not None:
            node.outputs[0].default_value = cfg.get(key, 1.0)
    hz = bpy.data.objects.get("haze")
    if hz is not None:
        hz.hide_render = not cfg.get("haze", True)
    cam = bpy.context.scene.camera
    if cam is not None:
        cam.data.clip_start, cam.data.clip_end = 0.03, 100.0
        cam.data.shift_y = cfg.get("shift_y", 0.0)
    sc = bpy.context.scene
    sc.cycles.sample_clamp_indirect = 4.0
    sc.cycles.blur_glossy = 0.5
    sc.cycles.volume_step_rate = 2.0
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH"),
                 ("denoising_input_passes", "RGB_ALBEDO_NORMAL")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    print(f"VISIT camera {name or '?'}: beat {cfg.get('beat')}, cast {'shown' if show else 'hidden'}, trims {trims or 'none'}",
          flush=True)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        name = which_camera()
        apply_camera(name)
        kw.setdefault("world", WORLD)
        k = CAMERAS.get(name, {}).get("spp_k", 1.0)
        args = list(args)
        sc = bpy.context.scene
        sc.cycles.adaptive_min_samples = 0
        if k != 1.0 and len(args) > 1:
            args[1] = int(round(args[1] * k))         # more samples for this camera (shoot.py passes one spp)
            # setkit.render fixes the adaptive threshold at 0.03; a high floor of samples keeps the faint reflection
            # from stopping early
            sc.cycles.adaptive_min_samples = int(args[1] * 0.75)
            print(f"VISIT camera {name}: {args[1]} samples (at least {sc.cycles.adaptive_min_samples})", flush=True)
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def build(cast=True):
    st.M.clear()
    st.LIGHTS.clear()
    st.PARTS.clear()
    _STATE.clear()
    _STATE.update({"cast": [], "holders": {}, "base": {}, "lens_base": {}})
    st.materials()
    st.shell()
    st.partition()
    st.baffles()
    st.ceiling()
    st.dressing()
    booths()
    empty_lights()
    haze()
    for n, p in FOCUS.items():
        st.empty(n, p)
    if cast:
        build_cast()
        glass_camera()
    else:
        st.empty("fx_dawn", (BXO, 0.7, 1.2))
        st.empty("fx_tim", (BXO, -0.7, 1.2))
        if "glass" in CAMERAS:
            CAMERAS["glass"]["loc"] = (BXO - 0.36, -1.15, 1.32)
            CAMERAS["glass"]["aim"] = (BXO + 0.07, 0.66, 1.12)
    install_hook()
