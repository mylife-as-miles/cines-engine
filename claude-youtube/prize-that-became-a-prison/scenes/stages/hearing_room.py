"""Stage: the hearing room (Ch 09 'A family makes its case in public'). Fluorescent Noir, reconstructed with restraint.

A congressional-style hearing room with nothing on it that names a place: no flags, no seal, no emblem, no lettering
(the nameplates are blank, the clock has ticks only). A curved two-tier dais of dark walnut wraps the far end, its
high-backed chairs empty, a gooseneck microphone before each; behind it a pleated blue-grey velour drape grazed by a
ceiling washer. Below and facing it, in the middle of the well, the witness table under a plain dark blue felt cloth
to the floor: a blank nameplate, the timer box with its one green lens, two microphones, two water glasses, a few
blank papers. Tim Hunt sits at it alone, leaning a little toward the microphone, his hands folded on the papers, his
eyes up at the empty dais; a second place at the table stands empty. Behind him rows of public chairs, empty but for
two still figures. Light: one downlight burns over the table (the lit island), two broadcast soft lights on a ceiling
bar key his face from the dais side, two more on a bar behind him rim him and light the dais; a few cans over the
tiers; the side walls' sconces and the light through the back doors' vision panels keep the rest of the room
readable in the dark.

    <bpy python> -I scenes/shoot.py -- hearing_room <cam> out.png [--nocast]

The set is in hearing_room_set.py, its materials in hearing_room_mats.py. Tim is people.man('Tim', age=0.55,
suit='male_elegantsuit01', tone=(0.09, 0.09, 0.1)) seated through Rigify (the seated solve is the departure gate's:
legs to FK, thigh and shin solved so the seat rests on the cushion and the soles on the carpet); his arms are solved
by two-bone IK onto the table (the courtroom's arm solve) with the forearm twist that turns each palm down and the
wrist lowered until the hand rests on the papers. Printed as HEARING ...
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

import people  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import hearing_room_set as st  # noqa: E402

EXPOSURE = -1.5

EDGE = st.TABLE[1] - st.TD / 2         # the table's near edge (Tim's side)
TORSO_GAP = 0.06                      # his jacket front this far from the table edge
TIM_UPPER = {"head": (-22, 3), "neck": (2, 0), "chest": (12, 0), "fingers": 30}
ELBOW_FWD = 0.12          # the elbow hangs this far ahead of the shoulder (the upper arm nearly plumb)

# the two still figures in the public rows: (row index, side, seat index, factory, pose)
EXTRAS = [
    (2, -1, 2, "young", {"head": (8, 6), "neck": (2, 0), "chest": (-6, 0), "fingers": 40}),
    (4, 1, 3, "old", {"head": (4, -5), "neck": (2, 0), "chest": (-9, 0), "fingers": 45}),
]

FOCUS = {
    "fx_wide": (st.TIM_X, -0.2, 1.1),
    "fx_tim": (st.TIM_X + 0.03, -0.42, 1.22),
    "fx_dais": (0.0, 5.0, 1.7),
    "fx_hands": (st.TIM_X, -0.2, st.TOP),
}

CAMERAS = {
    # Ch 09: from behind the public seats, high enough to look over the rows: Tim small at the witness table in the
    # one pool of light, facing the high curved dais and its empty chairs, the drape beyond
    "wide": dict(loc=(2.3, -9.05, 2.05), aim=(-0.35, 2.4, 1.15), lens=30, focus="fx_wide", fstop=8.0, beat="ch09"),
    # Ch 09: controlled medium from the dais side, a little above his eyeline: Tim at the microphones, hands folded on
    # the papers, the empty rows going dark behind him
    "witness": dict(loc=(st.TIM_X + 1.05, 2.15, 1.5), aim=(st.TIM_X - 0.05, -0.5, 1.02), lens=58, focus="fx_tim",
                    fstop=2.8, beat="ch09"),
    # Ch 09: from the witness table, low, up at the dais: the tiers' curve, the empty high chairs and their
    # microphones against the drape
    "dais": dict(loc=(st.TIM_X + 0.35, 0.05, 0.98), aim=(0.6, 5.6, 2.05), lens=26, focus="fx_dais", fstop=5.6,
                 beat="ch09"),
    # Ch 09 (added): overhead on the table: his folded hands on the blank papers, the microphones, the glass, the felt
    "hands": dict(loc=(st.TIM_X + 0.12, 0.05, 2.05), aim=(st.TIM_X + 0.02, -0.2, st.TOP), lens=50, focus="fx_hands",
                  fstop=4.0, beat="ch09"),
}
# per-camera light trims (multipliers on named lights)
TRIMS = {
    "wide": {},
    "witness": {},
    "dais": {},
    "hands": {},
}

if os.environ.get("HEARING_CAMS"):     # preview rounds: render a subset of the cameras with `--cam all`
    CAMERAS = {k: v for k, v in CAMERAS.items() if k in os.environ["HEARING_CAMS"].split(",")}

_STATE = {"cast": [], "base": {}}


# ---------------------------------------------------------------- measuring
def body_points(holder, only=None, unmasked=False):
    """World points of a figure's evaluated meshes (`only`: one object). With `unmasked` the body's MPFB masks (which
    delete the skin under the clothes) are switched off while measuring, so the buttocks and thighs are there."""
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


def group_points(holder, prefixes, suffix):
    """World points of the body (masks off, so indices match the rest mesh) weighted to vertex groups that start with
    one of `prefixes` and end with `suffix` (".L" / ".R")."""
    body = bpy.data.objects[holder["body"]]
    gids = {g.index for g in body.vertex_groups if g.name.endswith(suffix) and any(g.name.startswith(p) for p in prefixes)}
    sel = [v.index for v in body.data.vertices if any(ge.group in gids and ge.weight > 0.3 for ge in v.groups)]
    masks = [md for md in body.modifiers if md.type == "MASK"]
    for md in masks:
        md.show_viewport = False
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    mw = body.matrix_world
    n = len(me.vertices)
    pts = [mw @ me.vertices[i].co for i in sel if i < n]
    ev.to_mesh_clear()
    for md in masks:
        md.show_viewport = True
    bpy.context.view_layer.update()
    return pts


HAND_GROUPS = ("DEF-hand", "DEF-palm", "DEF-f_", "DEF-thumb")
HAND_PITCH = 0.2           # the hand a little extended at the wrist, so the palm and the curled fingers both rest


# ---------------------------------------------------------------- seating (from departure_gate.py)
def sit_legs(holder, thigh, shin, knee_half, ankle_half):
    """Legs to FK, thighs swung forward `thigh` degrees from hanging and turned about Z so the knee centres sit
    knee_half either side of the middle; shins `shin` degrees forward, ankles ankle_half out; feet flat, toes ahead."""
    rig = rigged.rig_of(holder)
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
    for side, k in ((1, "L"), (-1, "R")):
        head, tail = mw @ pb[f"thigh_fk.{k}"].head, mw @ pb[f"thigh_fk.{k}"].tail
        lt = (tail - head).length
        reach = lt * math.sin(math.radians(thigh))
        yaw = math.asin(max(-0.5, min(0.5, (abs(head.x - mid.x) - knee_half) / reach)))
        d = Matrix.Rotation(-side * yaw, 3, "Z") @ Matrix.Rotation(-math.radians(thigh), 3, "X") @ Vector((0, 0, -1))
        rigged._aim(rig, f"thigh_fk.{k}", d)
        sh, stl = mw @ pb[f"shin_fk.{k}"].head, mw @ pb[f"shin_fk.{k}"].tail
        ls = (stl - sh).length
        out = math.degrees(math.asin(max(-0.3, min(0.3, (ankle_half - abs(sh.x - mid.x)) / ls))))
        rigged._aim(rig, f"shin_fk.{k}", rigged._dir(0, shin, side, out))
        rigged._aim(rig, f"foot_fk.{k}", rest[k])


def lap_hands(holder, upper=(12, -6), fore=(64, 30), hand=(72, 40)):
    """Hands resting together in the lap: aim each arm segment (forward, inward degrees)."""
    rig = rigged.rig_of(holder)
    for side, k in ((1, "L"), (-1, "R")):
        for bone, (f, i) in (("upper_arm_fk", upper), ("forearm_fk", fore), ("hand_fk", hand)):
            rigged._aim(rig, f"{bone}.{k}", rigged._dir(0, f, side, -i))


def seat_figure(holder, seat_z, upper, knee_half, ankle_half, lap=False, tag="?"):
    """Pose a figure seated (built at the origin facing -Y) and solve thigh/shin so its seat rests on a cushion at
    seat_z and its soles on the floor; with `lap`, swing the forearms until the clasped hands rest on the thighs.
    Lifts the holder into place and returns (thigh, shin, fore)."""
    rig = rigged.rig_of(holder)
    body = bpy.data.objects[holder["body"]]
    thigh, shin, fore = 84.0, 6.0, 64.0
    dz = 0.0

    def pose():
        rigged.pose_figure(holder, upper)
        if lap:
            lap_hands(holder, fore=(fore, 30), hand=(fore + 8, 40))
        sit_legs(holder, thigh, shin, knee_half, ankle_half)

    z0 = holder.location.z
    for it in range(8):
        holder.location.z = z0
        pose()
        hip = sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2
        skin = body_points(holder, only=body, unmasked=True)
        seat_pts = [p for p in skin if hip.y - 0.12 < p.y < hip.y + 0.25 and 0.035 < abs(p.x - hip.x) < 0.2 and p.z < hip.z]
        sole_pts = [p for p in body_points(holder) if p.y < hip.y - 0.3]
        butt = min(p.z for p in seat_pts)
        sole = min(p.z for p in sole_pts)
        dz = seat_z - 0.004 - butt
        gap = sole + dz
        print(f"HEARING {tag} seated it {it}: thigh {thigh:.1f} shin {shin:.1f} soles {gap * 1000:+.1f} mm", flush=True)
        if abs(gap) < 0.005:
            break
        if gap > 0:      # feet hang above the floor: straighten the shins, then let the thighs fall
            c = math.cos(math.radians(shin)) + gap / 0.42
            if c < 1.0:
                shin = math.degrees(math.acos(c))
            else:
                shin = 0.0
                thigh -= math.degrees((c - 1.0) * 0.42 / 0.43)
        else:            # feet would sink: swing the shins forward, past 30 deg raise the knees instead
            c = math.cos(math.radians(shin)) + gap / 0.42
            if c > math.cos(math.radians(30)):
                shin = math.degrees(math.acos(c))
            else:
                thigh += math.degrees(-gap / 0.43)
    if lap:
        pb = rig.pose.bones
        for it in range(5):
            pose()
            mw = rig.matrix_world
            hc = sum((mw @ ((pb[f"hand_fk.{k}"].head + pb[f"hand_fk.{k}"].tail) / 2) for k in "LR"), Vector()) / 2
            tops = []
            for k in "LR":
                a_, b_ = mw @ pb[f"thigh_fk.{k}"].head, mw @ pb[f"thigh_fk.{k}"].tail
                t = max(0.0, min(1.0, (hc.y - a_.y) / (b_.y - a_.y))) if abs(b_.y - a_.y) > 1e-6 else 0.5
                tops.append(a_.z + (b_.z - a_.z) * t + 0.085)
            gap = (hc.z - 0.022) - max(tops)
            print(f"HEARING {tag} hands it {it}: forearm {fore:.1f} gap {gap * 1000:+.1f} mm", flush=True)
            if abs(gap) < 0.006:
                break
            fore = max(35.0, min(95.0, fore + math.degrees(-gap / 0.26)))
        pose()
    holder.location.z = z0 + dz
    bpy.context.view_layer.update()
    return thigh, shin, fore


def hip_world(holder):
    rig = rigged.rig_of(holder)
    bpy.context.view_layer.update()
    return sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2


# ---------------------------------------------------------------- arms on the table (from courtroom.py)
def _roll(rig, bone, deg):
    pb = rig.pose.bones[bone]
    m = pb.matrix.copy()
    head = m.translation.copy()
    y = (m.to_3x3() @ Vector((0, 1, 0))).normalized()
    pb.matrix = Matrix.Translation(head) @ Matrix.Rotation(math.radians(deg), 4, y) @ Matrix.Translation(-head) @ m
    bpy.context.view_layer.update()


def _palm_down(rig, k):
    """How far the palm faces down (-1..1): the curled middle finger's tip leans toward the palm side."""
    pb = rig.pose.bones
    mw = rig.matrix_world
    tip_bone = next((n for n in (f"f_middle.03.{k}", f"ORG-f_middle.03.{k}", f"DEF-f_middle.03.{k}") if n in pb), None)
    if tip_bone is None:
        return 0.0
    h0, h1 = mw @ pb[f"hand_fk.{k}"].head, mw @ pb[f"hand_fk.{k}"].tail
    tip = mw @ pb[tip_bone].tail
    ax = (h1 - h0).normalized()
    off = tip - h1
    off -= ax * off.dot(ax)
    return -off.normalized().z if off.length > 1e-6 else 0.0


def solve_arm(holder, k, side, wrist, twist, hand_dir):
    """Two-bone IK on the FK arm: the elbow out, back and down; the forearm twisted by `twist` degrees; the hand
    aimed along `hand_dir` (world)."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    for n in ("upper_arm_fk", "forearm_fk", "hand_fk"):
        pb[f"{n}.{k}"].matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    mw = rig.matrix_world
    inv = mw.to_3x3().inverted()
    S = mw @ pb[f"upper_arm_fk.{k}"].head
    a = (mw @ pb[f"upper_arm_fk.{k}"].tail - S).length
    b = (mw @ pb[f"forearm_fk.{k}"].tail - mw @ pb[f"forearm_fk.{k}"].head).length
    d_vec = wrist - S
    d = min(d_vec.length, (a + b) * 0.995)
    u = d_vec.normalized()
    left = (mw.to_3x3() @ Vector((1, 0, 0))).normalized()
    back = (mw.to_3x3() @ Vector((0, 1, 0))).normalized()
    pole = (left * side * 0.8 + back * 0.25 + Vector((0, 0, -0.55))).normalized()
    v = (pole - u * pole.dot(u)).normalized()
    ca = max(-1.0, min(1.0, (a * a + d * d - b * b) / (2 * a * d)))
    E = S + a * (u * ca + v * math.sqrt(1 - ca * ca))
    rigged._aim(rig, f"upper_arm_fk.{k}", inv @ (E - S))
    Ea = mw @ pb[f"forearm_fk.{k}"].head
    rigged._aim(rig, f"forearm_fk.{k}", inv @ (wrist - Ea))
    _roll(rig, f"forearm_fk.{k}", twist)
    rigged._aim(rig, f"hand_fk.{k}", inv @ hand_dir)
    return E


def solve_arm_elbow(holder, k, side, elbow, wrist, twist, hand_dir):
    """Elbow first: the upper arm aimed from the shoulder toward `elbow` (it lands where its length reaches), the
    forearm from there toward `wrist`, rolled by `twist`, the hand aimed along `hand_dir` (world). Returns the
    elbow and the wrist as posed."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    for n in ("upper_arm_fk", "forearm_fk", "hand_fk"):
        pb[f"{n}.{k}"].matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    mw = rig.matrix_world
    inv = mw.to_3x3().inverted()
    S = mw @ pb[f"upper_arm_fk.{k}"].head
    rigged._aim(rig, f"upper_arm_fk.{k}", inv @ (elbow - S))
    Ea = mw @ pb[f"forearm_fk.{k}"].head
    rigged._aim(rig, f"forearm_fk.{k}", inv @ (wrist - Ea))
    _roll(rig, f"forearm_fk.{k}", twist)
    rigged._aim(rig, f"hand_fk.{k}", inv @ hand_dir)
    return S, Ea, mw @ pb[f"hand_fk.{k}"].head


def hands_folded(holder):
    """Forearms over the table edge, the hands angled in and laid one over the other on the papers. Elbow first:
    each upper arm hangs nearly plumb from the shoulder toward a point at forearm height; the forearm runs from
    there to a wrist target on the table; the forearm twist that turns the palm down is chosen; then the wrist is
    lowered until the hand's underside rests (the right on the papers, the left on the right's fingers)."""
    rig = rigged.rig_of(holder)
    mw = rig.matrix_world
    left = (mw.to_3x3() @ Vector((1, 0, 0))).normalized()
    fwd = -(mw.to_3x3() @ Vector((0, 1, 0))).normalized()
    report = []
    rest_on = {"R": st.TOP + 0.003, "L": st.TOP + 0.024}
    pb = rig.pose.bones
    for side, k in ((-1, "R"), (1, "L")):
        inward = -left * side
        S = mw @ pb[f"upper_arm_fk.{k}"].head
        elbow = Vector((S.x, S.y + ELBOW_FWD, st.TOP + 0.04)) + left * side * 0.065
        wrist = Vector((st.TIM_X, 0, 0)) + left * side * (0.095 if k == "R" else 0.085)
        wrist.y = EDGE + (0.22 if k == "R" else 0.235)
        wrist.z = rest_on[k] + 0.03
        hd = (fwd * 0.55 + inward * 0.82 + Vector((0, 0, HAND_PITCH))).normalized()
        best = None
        for twist in (side * 80.0, -side * 80.0, side * 40.0, -side * 40.0, 0.0):
            solve_arm_elbow(holder, k, side, elbow, wrist, twist, hd)
            pdn = _palm_down(rig, k)
            if best is None or pdn > best[0]:
                best = (pdn, twist)
        twist = best[1]
        gap = 0.0
        for it in range(6):
            S, E, W = solve_arm_elbow(holder, k, side, elbow, wrist, twist, hd)
            pts = group_points(holder, HAND_GROUPS, f".{k}")
            low = min(p.z for p in pts) if pts else rest_on[k]
            gap = low - rest_on[k]
            if abs(gap) < 0.002:
                break
            wrist.z -= gap
        fore = group_points(holder, ("DEF-forearm",), f".{k}")
        flo = min((p.z for p in fore if p.y > EDGE + 0.01), default=9.9)
        report.append(f"{k}: twist {twist:+.0f} palm-down {best[0]:+.2f} shoulder ({S.x:+.3f}, {S.y:+.3f}, {S.z:.3f}) "
                      f"elbow ({E.x:+.3f}, {E.y:+.3f}, {E.z:.3f}) wrist ({W.x:+.3f}, {W.y:+.3f}, {W.z:.3f}) "
                      f"hand gap {gap * 1000:+.1f} mm, forearm low over the table {(flo - st.TOP) * 1000:+.0f} mm")
    print("HEARING hands " + "; ".join(report), flush=True)


def tim():
    """Tim at the witness table: seated, then turned to face the dais, slid so his jacket front sits TORSO_GAP from
    the table edge; his chair set behind him; his arms laid on the table."""
    h = people.man("Tim", age=0.55, suit="male_elegantsuit01", tone=(0.09, 0.09, 0.1))
    seat_figure(h, st.SEAT_Z, TIM_UPPER, 0.11, 0.11, tag="Tim")
    h.rotation_euler = (0, 0, math.radians(180.0))
    bpy.context.view_layer.update()
    hip = hip_world(h)
    h.location.x += st.TIM_X - hip.x
    h.location.y += (EDGE - 0.42) - hip.y
    bpy.context.view_layer.update()
    pts = body_points(h)
    front = max(p.y for p in pts if 0.85 < p.z < 1.2 and abs(p.x - st.TIM_X) < 0.2)
    h.location.y += (EDGE - TORSO_GAP) - front
    bpy.context.view_layer.update()
    pts = body_points(h)
    rear = min(p.y for p in pts if st.SEAT_Z + 0.02 < p.z < st.SEAT_Z + 0.2 and abs(p.x - st.TIM_X) < 0.2)
    knees = max(p.y for p in pts if p.z < st.SEAT_Z + 0.25)
    knee_top = max(p.z for p in pts if EDGE - 0.02 < p.y < EDGE + 0.3)
    lo = min(p.z for p in pts)
    hp = hip_world(h)
    print(f"HEARING Tim: hip ({hp.x:+.3f}, {hp.y:+.3f}, {hp.z:.3f}), seat rear {rear:+.3f}, knees reach {knees:+.3f} "
          f"(table front {st.TABLE[1] + st.TD / 2:+.3f}), thighs under the table top {knee_top:.3f} "
          f"(apron {st.TOP - 0.09:.3f}), lowest {lo * 1000:+.1f} mm", flush=True)
    chair = st.witness_chair("tim_chair", st.TIM_X, rear - 0.012)
    hands_folded(h)
    return h, chair


def extra(row, s, c, kind, upper, n):
    """A still figure on one of the public chairs, hands in the lap, facing the dais."""
    if kind == "young":     # (people.staff(.., 1), a woman, would not seat: her soles stayed 15-130 mm off the
                            # carpet whatever the thigh angle; see the report)
        h = people.man(f"Public{n}", height_cm=183, age=0.3, weight=0.45, suit="male_casualsuit03",
                       tone=(0.075, 0.08, 0.09), shoes="shoes04")
        kh, ah = 0.1, 0.09
    else:
        h = people.man(f"Public{n}", height_cm=172, age=0.68, weight=0.62, suit="male_casualsuit01",
                       tone=(0.105, 0.1, 0.095), shoes="shoes04")
        kh, ah = 0.11, 0.1
    seat_figure(h, st.PUB_SEAT_Z, upper, kh, ah, lap=True, tag=f"Public{n}")
    h.rotation_euler = (0, 0, math.radians(180.0))
    bpy.context.view_layer.update()
    sx, sy = s * st.SEATS_X[c], st.ROWS[row]
    hip = hip_world(h)
    h.location.x += sx - hip.x
    h.location.y += (sy - 0.1) - hip.y
    bpy.context.view_layer.update()
    body = bpy.data.objects[h["body"]]
    skin = body_points(h, only=body, unmasked=True)
    rear = min(p.y for p in skin if st.PUB_SEAT_Z + 0.03 < p.z < st.PUB_SEAT_Z + 0.25 and abs(p.x - sx) < 0.2)
    h.location.y += (sy + st.PUB_BACK_Y + 0.015) - rear
    bpy.context.view_layer.update()
    print(f"HEARING Public{n} ({kind}) on row {row} seat {s * (c + 1):+d}: hip {tuple(round(v, 3) for v in hip_world(h))}",
          flush=True)
    return h


# ---------------------------------------------------------------- per-camera hook
def which_camera():
    cam = bpy.context.scene.camera
    if cam is None:
        return None
    for n, c in CAMERAS.items():
        if (cam.location - Vector(c["loc"])).length < 1e-3:
            return n
    return None


def apply_camera(name):
    sc = bpy.context.scene
    cam = sc.camera
    if cam is not None:
        cam.data.clip_start, cam.data.clip_end = 0.03, 200.0
    sc.cycles.sample_clamp_indirect = 5.0
    sc.cycles.blur_glossy = 0.5
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    sc.cycles.transmission_bounces = 8
    sc.cycles.transparent_max_bounces = 8
    trims = TRIMS.get(name, {})
    for n, ob in st.LIGHTS.items():
        base = _STATE["base"].setdefault(n, ob.data.energy)
        ob.data.energy = base * trims.get(n, 1.0)
    print(f"HEARING camera {name or '?'}: beat {CAMERAS.get(name, {}).get('beat', '?')}, trims {trims or 'none'}",
          flush=True)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


# ---------------------------------------------------------------- lights
def lights():
    """Practicals first: the downlight over the table (the island), the broadcast soft lights (key and fill on the
    bar in front of the witness, two on the bar behind him toward the dais), the cans over the tiers, a few dim
    cans over the public rows; the washer on the drape, the sconces and the doors are built with their fittings."""
    xs, ys = st.coffer_centres()
    # the island: two cans in the coffer over the table, both aimed at Tim's place
    st.downlight("dl_table", st.TIM_X + 0.25, 0.0, 1500.0, target=(st.TIM_X + 0.05, -0.15, st.TOP), size_deg=36,
                 blend=0.75, radius=0.06)
    st.downlight("dl_table2", st.TIM_X + 0.95, 0.45, 0.0)
    # broadcast key and fill, from the dais side, on the bar at y 1.2
    face = Vector((st.TIM_X, -0.5, 1.25))
    st.tv_light("tv_key", (st.TIM_X + 2.3, 1.2, 4.55), face, 420.0)
    st.tv_light("tv_fill", (st.TIM_X - 2.6, 1.2, 4.55), face, 110.0)
    # on the bar behind him: aimed past him at the dais (they rim his shoulders and light the lower tier)
    st.tv_light("tv_back_l", (-2.2, -3.6, 4.6), (-0.8, 4.6, 1.3), 520.0, size=(0.6, 0.45), spread=50)
    st.tv_light("tv_back_r", (2.4, -3.6, 4.6), (0.9, 4.8, 1.3), 520.0, size=(0.6, 0.45), spread=50)
    # the tiers: cans over the lower tier's chairs and the upper tier's
    for x in (-2.4, 0.0, 2.4):
        st.downlight(f"dl_t0_{x:+.1f}", x, 4.8, 420.0, size_deg=70, blend=0.6)
    for x in (-4.8, -2.4, 0.0, 2.4, 4.8):
        st.downlight(f"dl_t1_{x:+.1f}", x, ys[-1], 320.0 if abs(x) < 3 else 180.0, size_deg=70, blend=0.6)
    # the public rows: a few cans on, low
    for (x, y, e) in ((-2.4, -4.8, 110.0), (2.4, -7.2, 90.0), (0.0, -2.4, 70.0)):
        st.downlight(f"dl_pub_{x:+.1f}_{y:+.1f}", x, y, e, size_deg=80, blend=0.7)
    # the rest of the cans dark
    lit = {(0.0, 4.8), (-2.4, 4.8), (2.4, 4.8), (-2.4, -4.8), (2.4, -7.2), (0.0, -2.4), (0.0, 0.0)} | \
          {(x, ys[-1]) for x in (-4.8, -2.4, 0.0, 2.4, 4.8)}
    for x in xs:
        for y in ys:
            if (round(x, 1), round(y, 1)) not in {(round(a, 1), round(b, 1)) for a, b in lit}:
                st.downlight(f"dl_off_{x:+.1f}_{y:+.1f}", x, y, 0.0)


# ---------------------------------------------------------------- build
def build(cast=True):
    st.M.clear()
    st.mt.M.clear()
    st.LIGHTS.clear()
    _STATE["base"].clear()
    st.materials()
    st.shell()
    st.drape()
    places = st.dais()
    chair_src, mic_src = st.dais_props(places)
    st.witness_table()
    st.table_dressing(mic_src)
    coll = st.public_chair_collection()
    st.public_seats(coll)
    st.dressing()
    lights()
    # the empty place's chair, pushed in under the table edge
    st.witness_chair("empty_chair", st.EMPTY_X, EDGE - 0.36, turn=3.0)
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    _STATE["cast"] = []
    if cast:
        t, _ = tim()
        _STATE["cast"] = [t] + list(t.children_recursive)
        for i, (row, s, c, kind, upper) in enumerate(EXTRAS):
            e = extra(row, s, c, kind, upper, i)
            _STATE["cast"] += [e] + list(e.children_recursive)
    else:
        st.witness_chair("tim_chair", st.TIM_X, EDGE - 0.5)
    sk.haze((2 * st.XW - 0.05, st.Y1 - st.Y0 - 0.05, st.H - 0.05), (0, (st.Y0 + st.Y1) / 2, st.H / 2), 0.0025)
    install_hook()
