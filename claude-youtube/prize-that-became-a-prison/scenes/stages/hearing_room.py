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

The set is in hearing_room_set.py, its materials in hearing_room_mats.py. Tim is people.man('Tim', age=TIM_AGE,
weight=TIM_WEIGHT, suit='male_elegantsuit01', tone=(0.09, 0.09, 0.1)) with a pale shirt and dark tie split out of the
suit's texture and a receding hairline, seated through Rigify (the seated solve is the departure gate's: legs to FK,
thigh and shin solved so the seat rests on the cushion and the soles on the carpet); his arms are placed elbow first
onto the table with the forearm twist that turns each palm down; the fingers are closed and curled joint by joint
through Rigify's finger controls, the right hand laid on the papers, the left over its back (a BVH keeps them apart).
Printed as HEARING ...
"""
import math
import os
import sys
from contextlib import contextmanager

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import people  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import hearing_room_set as st  # noqa: E402

EXPOSURE = -1.5

EDGE = st.TABLE[1] - st.TD / 2         # the table's near edge (Tim's side)
TORSO_GAP = 0.06                      # his jacket front this far from the table edge
# Tim: MakeHuman's age macro is 0.5 = 25 years, 1.0 = 90 (linear between), so 55 years is 0.73 (at 0.55 he read as a
# man of about 30). Head: chin up toward the dais and turned toward the camera side, so the eyeline passes a little
# above and beside the witness lens; fingers curled 18 degrees (40 curled them into claws), thumbs 10.
# At 0.73 / 0.6 the smooth stone still read as a man of 30 (a statue loses the skin's age): 0.78 (about 60 on the
# macro) and a heavier 0.7 give the jaw, neck and middle of a man in his mid fifties, with the receding hairline.
TIM_AGE, TIM_WEIGHT = 0.78, 0.7
TIM_UPPER = {"head": (-8, -8), "neck": (2, 0), "chest": (12, 0), "fingers": 18}
THUMB_CURL = 10.0
ELBOW_FWD = 0.12          # the elbow hangs this far ahead of the shoulder (the upper arm nearly plumb)
SHIRT = (0.78, 0.8, 0.84)       # read values (x people.FABRIC_VALUE): a pale shirt so the collar's V separates
TIE = (0.06, 0.062, 0.085)      # a dark navy tie, flat (the texture's striped tie would shimmer)

# the two still figures in the public rows: (row index, side, seat index, factory, pose). The young one sits a seat
# further out than before: in the witness frame his lit head floated just over the microphone's head (a tangency)
EXTRAS = [
    (0, -1, 3, "young", {"head": (8, 6), "neck": (2, 0), "chest": (-6, 0), "fingers": 20}),
    (1, 1, 3, "old", {"head": (4, -5), "neck": (2, 0), "chest": (-9, 0), "fingers": 22}),
]

FOCUS = {
    "fx_wide": (st.TIM_X, -0.2, 1.1),
    "fx_tim": (st.TIM_X + 0.03, -0.42, 1.22),
    "fx_dais": (0.8, 5.1, 1.6),
    "fx_hands": (st.TIM_X, -0.2, st.TOP),
}

CAMERAS = {
    # Ch 09: from behind the public seats, high enough to look over the rows: Tim small at the witness table in the
    # one pool of light, facing the high curved dais and its empty chairs, the drape beyond
    # (a quarter stop over the stage: the grade's vignette takes the frame's edges, where the side walls are, to black)
    "wide": dict(loc=(2.3, -9.05, 2.40), aim=(-0.35, 2.4, 1.60), lens=30, focus="fx_wide", fstop=8.0, beat="ch09",
                 exposure=EXPOSURE + 0.25),
    # Ch 09: controlled medium from the dais side, a little above his eyeline: Tim at the microphones, hands folded on
    # the papers, the empty rows going dark behind him
    "witness": dict(loc=(st.TIM_X + 1.25, 1.95, 1.44), aim=(st.TIM_X - 0.1, -0.5, 1.04), lens=54, focus="fx_tim",
                    fstop=2.8, beat="ch09"),
    # Ch 09: from the left end of the witness table, low, up at the dais: off the arcs' centre, so the tiers curve
    # away to the right, the empty high chairs and their microphones receding against the drape
    # (low, near the floor beside the table's left end: the lower fascia sweeps away in an arc from the left
    # foreground to the tier's right end, the upper tier and the drape above)
    "dais": dict(loc=(-1.65, 0.15, 0.62), aim=(1.0, 5.4, 2.3), lens=28, focus="fx_dais", fstop=5.6,
                 beat="ch09"),
    # Ch 09 (added): overhead on the table: his folded hands on the blank papers, the microphones, the glass, the felt
    # (a stop under the stage: the table downlight lands square on the papers and his sleeves from above)
    # (with the trims below and 0.45 under the stage: paper about 150 graded, the charcoal sleeve 30-45; a full stop
    # under left the paper at 110 and the frame muddy)
    "hands": dict(loc=(st.TIM_X + 0.04, 0.05, 2.05), aim=(st.TIM_X + 0.02, -0.2, st.TOP), lens=50, focus="fx_hands",
                  fstop=4.0, beat="ch09", exposure=EXPOSURE - 0.45),
}


def mic_place(base, at, scale=1.0):
    """The table microphone prop's (x, y, turn, scale) so its base disc stands at `base` and its head (0.118 m ahead of
    the prop's origin, the base 0.066 behind it, along the file's +Y) points at `at` in plan."""
    d = Vector((at[0] - base[0], at[1] - base[1])).normalized()
    o = Vector(base) + d * 0.066 * scale
    return (o.x, o.y, math.degrees(math.atan2(-d.x, d.y)), scale)


# the table's things (overrides of hearing_room_set.TABLE_POS). His microphone at his front left, its base clear of his
# left forearm, the gooseneck's head about 0.25 m before his mouth (he speaks into it; at 0.5 m to his side he did
# not); his glass to his right, whole in the witness frame; the nameplate (facing the dais) moved to his left so the
# witness frame does not cut it; the timer off to the empty place's side.
TABLE_POS = {
    "mic_tim": mic_place((st.TIM_X - 0.12, EDGE + 0.30), (st.TIM_X - 0.02, EDGE - 0.10), 1.15),
    "glass_tim": (st.TIM_X + 0.36, EDGE + 0.23, 0.86),
    "np_tim": (st.TIM_X - 0.3, st.TABLE[1] + st.TD / 2 - 0.07, 0.0),
    "timer": (st.TIM_X + 0.75, EDGE + 0.17, -8.0),
    "mic_empty": (st.EMPTY_X + 0.12, st.TABLE[1] + 0.17, 186.0, 0.95),
}
# the shadow floor per camera (scene-linear lift after the exposure; about 0.003 lifts pure black to ~6/255 raw)
LIFT = {"wide": 0.0045, "witness": 0.0018, "dais": 0.0024, "hands": 0.0014}
# objects a camera does not see (by name or name prefix)
HIDE = {}
# per-camera light trims (multipliers on named lights)
# The broadcast soft lights' narrow spread concentrates their power (a 30 deg spread is roughly 15x a bare panel), and
# the table downlight lands on the tops of his shoulders, hands and papers: the close cameras take both down so the
# stone face sits near 0.65 and the charcoal suit well under it (at full level the suit read as mid grey beside a
# near-white face: AgX compresses the highlights)
TRIMS = {
    "wide": {"washer": 0.55, "glass rim return": 0.0, "side aisle chair tops": 0.0},
    # (the witness frame: the young figure behind him in darkness, not a lone half-lit face over his shoulder; the
    # fill under the key and the table downlight a little up, so the overhead light models his brow and cheeks)
    "witness": {"tv_key_light": 0.27, "tv_fill_light": 0.06, "dl_table_spot": 0.55, "dl_fig_-2.4_-2.4_spot": 0.15},
    "dais": {"washer": 0.75, "glass rim return": 0.0, "side aisle chair tops": 0.0},
    "hands": {"side aisle chair tops": 0.0, "tv_key_light": 0.3, "tv_fill_light": 0.3, "dl_table_spot": 0.4},
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


TIP_GROUPS = ("DEF-f_index.03", "DEF-f_middle.03", "DEF-f_ring.03", "DEF-f_pinky.03")
PALM_GROUPS = ("DEF-palm", "DEF-hand")
FINGER_GROUPS = ("DEF-f_",)
# where the palms go (world, relative to Tim's place): the right palm just right of his centre line on the papers, the
# left palm laid over the right hand's back, L_BACK toward the right wrist (over the back of the hand, not the fingers:
# over the knuckles its fingers fanned across the right hand's fingers)
R_PALM = (st.TIM_X + 0.025, EDGE + 0.255)
L_BACK = 0.022
L_CLEAR = 0.0025          # the left hand rests this far above the right hand's surface (no interpenetration)
# the hands' fingers: knuckle, middle and end joint curls (degrees) through Rigify's finger controls (the master's
# rotation bends the knuckle only, the finger stays straight, which read as stiff spread claws); the right hand lies
# flat on the papers with the fingertips just down, the left drapes its fingers over the right hand's thumb side
FINGERS = ("f_index", "f_middle", "f_ring", "f_pinky")
CURL = {"R": (9.0, 16.0, 9.0), "L": (20.0, 31.0, 14.0)}
SPREAD = (2.0, 2.5, 4.5)  # degrees between neighbours (index-middle, ring-middle, pinky-ring): fingers together


@contextmanager
def fast_body(holder):
    """While solving: the body's masks and subdivision off, so evaluation is quick and the evaluated vertices are the
    base mesh's (indices hold). The cage sits a hair outside the subdivided surface, so contacts stay conservative."""
    body = bpy.data.objects[holder["body"]]
    mods = [md for md in body.modifiers if md.type in ("MASK", "SUBSURF") and md.show_viewport]
    for md in mods:
        md.show_viewport = False
    bpy.context.view_layer.update()
    try:
        yield body
    finally:
        for md in mods:
            md.show_viewport = True
        bpy.context.view_layer.update()


_SEL = {}


def _sel(body, prefixes, suffix):
    key = (body.name, prefixes, suffix)
    if key not in _SEL:
        gids = {g.index for g in body.vertex_groups if g.name.endswith(suffix) and g.name.startswith(prefixes)}
        _SEL[key] = np.array([v.index for v in body.data.vertices
                              if any(ge.group in gids and ge.weight > 0.3 for ge in v.groups)], dtype=np.int64)
    return _SEL[key]


def _coords(body):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get("co", co)
    ev.to_mesh_clear()
    mw = np.array(body.matrix_world)
    return co.reshape(-1, 3) @ mw[:3, :3].T + mw[:3, 3]


def hpts(body, prefixes, suffix, co=None):
    """World points (numpy) of the body's vertices weighted to the groups (inside fast_body)."""
    co = _coords(body) if co is None else co
    s = _sel(body, prefixes, suffix)
    return co[s[s < len(co)]]


def hand_bvh(body, k):
    """A BVH of the body's hand surface on side `k` (inside fast_body: the base mesh's polygons)."""
    from mathutils.bvhtree import BVHTree
    co = _coords(body)
    sel = [int(i) for i in _sel(body, HAND_GROUPS, f".{k}") if i < len(co)]
    idx = {i: j for j, i in enumerate(sel)}
    verts = [Vector(co[i]) for i in sel]
    polys = [[idx[i] for i in p.vertices] for p in body.data.polygons if all(i in idx for i in p.vertices)]
    return BVHTree.FromPolygons(verts, polys)


def clearances(pts, bvh, floor_z):
    """Each point's height over what is under it: the surface in `bvh` (cast from above, so a point inside the other
    hand counts negative) or the floor (the papers)."""
    out = np.empty(len(pts))
    down = Vector((0, 0, -1))
    for i, p in enumerate(pts):
        v = Vector(p)
        hit = bvh.ray_cast(v + Vector((0, 0, 0.25)), down, 0.5)
        sup = floor_z if hit[0] is None else max(floor_z, hit[0].z)
        out[i] = v.z - sup
    return out


def _wdir(rig, name):
    pb = rig.pose.bones[name]
    mw = rig.matrix_world
    return (mw @ pb.tail - mw @ pb.head).normalized()


def _wpos(rig, name, tail=False):
    pb = rig.pose.bones[name]
    return rig.matrix_world @ (pb.tail if tail else pb.head)


def _signed(a, b, n):
    a_ = (a - n * a.dot(n)).normalized()
    b_ = (b - n * b.dot(n)).normalized()
    return math.degrees(math.atan2(a_.cross(b_).dot(n), a_.dot(b_)))


def pose_hand(rig, k, curl):
    """A relaxed hand: the fingers closed together (each master turned about its palm normal until the angle to its
    neighbour is SPREAD), then curled at the knuckle (master), middle and end joints (the finger controls .02/.03);
    the thumb laid alongside the index finger at about the depth of the finger pads (searched over the thumb
    master's rotation), its joints eased. Returns the hand frame for the report."""
    pb = rig.pose.bones
    upd = bpy.context.view_layer.update
    for f in FINGERS:
        m = pb[f"{f}.01_master.{k}"]
        m.rotation_mode = "XYZ"
        m.rotation_euler = (0.0, 0.0, 0.0)
        for s in ("01", "02", "03"):
            b = pb.get(f"{f}.{s}.{k}")
            if b is not None:
                b.rotation_mode = "XYZ"
                b.rotation_euler = (0.0, 0.0, 0.0)
    upd()
    mid_m = pb[f"f_middle.01_master.{k}"]
    nrm = (rig.matrix_world.to_3x3() @ mid_m.matrix.to_3x3() @ Vector((0, 0, 1))).normalized()
    spread = {}
    for f, ref, gap in (("f_index", "f_middle", SPREAD[0]), ("f_ring", "f_middle", SPREAD[1]),
                        ("f_pinky", "f_ring", SPREAD[2])):
        m = pb[f"{f}.01_master.{k}"]
        a0 = _signed(_wdir(rig, f"{ref}.01.{k}"), _wdir(rig, f"{f}.01.{k}"), nrm)
        m.rotation_euler.z = math.radians(6.0)
        upd()
        a1 = _signed(_wdir(rig, f"{ref}.01.{k}"), _wdir(rig, f"{f}.01.{k}"), nrm)
        slope = (a1 - a0) / 6.0
        z = (math.copysign(gap, a0) - a0) / slope if abs(slope) > 0.2 else 0.0
        z = max(-25.0, min(25.0, z))
        m.rotation_euler.z = math.radians(z)
        upd()
        spread[f] = (a0, _signed(_wdir(rig, f"{ref}.01.{k}"), _wdir(rig, f"{f}.01.{k}"), nrm), z)
    kn, md_, tp = curl
    for f in FINGERS:
        pb[f"{f}.01_master.{k}"].rotation_euler.x = math.radians(kn)
        pb[f"{f}.02.{k}"].rotation_euler.x = math.radians(md_)
        pb[f"{f}.03.{k}"].rotation_euler.x = math.radians(tp)
    upd()
    # the hand frame: along the hand, across toward the thumb, and the palm side (where the fingers curl)
    H = _wpos(rig, f"hand_fk.{k}")
    I, M, P = (_wpos(rig, f"f_{f}.01_master.{k}") for f in ("index", "middle", "pinky"))
    y_h = (M - H).normalized()
    x_h = (I - P)
    x_h = (x_h - y_h * x_h.dot(y_h)).normalized()
    n_p = y_h.cross(x_h).normalized()
    tip = _wpos(rig, f"f_middle.03.{k}", tail=True)
    if (tip - M).dot(n_p) < 0:
        n_p = -n_p
    itip = _wpos(rig, f"f_index.03.{k}", tail=True)
    depth = (itip - I).dot(n_p)
    # the thumb: its tip beside the index finger's middle joint, toward the thumb side, at 0.8 of the index fingertip's
    # depth below the knuckles (so on a table it rests with the fingertips, not under them)
    target = I + y_h * 0.032 + x_h * 0.02 + n_p * (0.8 * depth)
    th = pb.get(f"thumb.01_master.{k}")
    best = None
    if th is not None:
        th.rotation_mode = "XYZ"
        for nm in (f"thumb.02.{k}", f"thumb.03.{k}"):
            b = pb.get(nm)
            if b is not None:
                b.rotation_mode = "XYZ"
                b.rotation_euler = (math.radians(THUMB_CURL), 0.0, 0.0)

        def try_(x, z):
            th.rotation_euler = (math.radians(x), 0.0, math.radians(z))
            upd()
            return (_wpos(rig, f"thumb.03.{k}", tail=True) - target).length
        for x in range(-50, 51, 10):
            for z in range(-50, 51, 10):
                d = try_(x, z)
                if best is None or d < best[0]:
                    best = (d, x, z)
        _, bx, bz = best
        for x in range(bx - 8, bx + 9, 4):
            for z in range(bz - 8, bz + 9, 4):
                d = try_(x, z)
                if d < best[0]:
                    best = (d, x, z)
        try_(best[1], best[2])
    print(f"HEARING hand {k}: spread " + ", ".join(f"{f} {a:+.1f}->{b:+.1f} deg (z {z:+.1f})"
                                                     for f, (a, b, z) in spread.items()) +
          f", index tip depth {depth * 1000:.0f} mm, thumb tip off its mark "
          f"{(best[0] if best else 0) * 1000:.0f} mm at ({best[1] if best else 0}, {best[2] if best else 0})", flush=True)


def hands_folded(holder):
    """Forearms over the table edge, the hands angled in, folded: the right hand laid flat on the papers, the left
    laid over the right hand's back, its fingers draping over the right hand's thumb side. Elbow first: each upper
    arm hangs nearly plumb from the shoulder toward a point at forearm height; the forearm runs from there to a wrist
    target on the table; the forearm twist that turns the palm down is chosen. Each hand's pitch is chosen so its heel
    and its curled fingertips both rest (the right on the papers, the left on the right hand's back), the right wrist
    lowered until the hand rests on the papers, the left until it clears the right hand's surface (a BVH of it) and
    the papers by L_CLEAR. Both wrists' targets are corrected until the palms land where they are meant to."""
    rig = rigged.rig_of(holder)
    mw = rig.matrix_world
    left = (mw.to_3x3() @ Vector((1, 0, 0))).normalized()
    fwd = -(mw.to_3x3() @ Vector((0, 1, 0))).normalized()
    pb = rig.pose.bones
    report = []
    paper = st.PAPER_TOP
    solved = {}
    with fast_body(holder) as body:
        for k in "RL":
            pose_hand(rig, k, CURL[k])
        bvh_r = None
        for side, k in ((-1, "R"), (1, "L")):
            inward = -left * side
            S = mw @ pb[f"upper_arm_fk.{k}"].head
            elbow = Vector((S.x, S.y + ELBOW_FWD, st.TOP + 0.04)) + left * side * 0.065
            wrist = Vector((st.TIM_X, 0, 0)) + left * side * (0.07 if k == "R" else 0.04)
            wrist.y = EDGE + (0.22 if k == "R" else 0.22)
            wrist.z = paper + (0.03 if k == "R" else 0.06)

            def hdir(p):
                return (fwd * 0.55 + inward * 0.82 + Vector((0, 0, p))).normalized()
            best = None
            for twist in (side * 80.0, -side * 80.0, side * 40.0, -side * 40.0, 0.0):
                solve_arm_elbow(holder, k, side, elbow, wrist, twist, hdir(HAND_PITCH))
                pdn = _palm_down(rig, k)
                if best is None or pdn > best[0]:
                    best = (pdn, twist)
            twist = best[1]

            def gaps():
                """(lowest point, fingertips, heel) heights over their support, and the palm centroid."""
                co = _coords(body)
                allp = hpts(body, HAND_GROUPS, f".{k}", co)
                tp = hpts(body, TIP_GROUPS, f".{k}", co)
                hl = hpts(body, PALM_GROUPS, f".{k}", co)
                pc = hpts(body, ("DEF-palm",), f".{k}", co).mean(0)
                if k == "R":
                    return (allp[:, 2].min() - paper, tp[:, 2].min() - paper, hl[:, 2].min() - paper, pc)
                return (clearances(allp, bvh_r, paper).min(), clearances(tp, bvh_r, paper).min(),
                        clearances(hl, bvh_r, paper).min(), pc)

            def rest(pitch):
                """Lower (or lift) the wrist until the hand's lowest point is on its support."""
                g = None
                want = 0.0008 if k == "R" else L_CLEAR
                for _ in range(7):
                    solve_arm_elbow(holder, k, side, elbow, wrist, twist, hdir(pitch))
                    g = gaps()
                    if abs(g[0] - want) < 0.0012:
                        break
                    wrist.z -= g[0] - want
                return g

            pitch = HAND_PITCH
            for it in range(4):              # slide the wrist (and the elbow with it) until the palm lands on its mark
                if it == 0:      # the pitch at which the heel and the fingertips both rest
                    scores = []
                    for p_ in (-0.2, -0.1, 0.0, 0.1, 0.2, 0.3, 0.4):
                        g = rest(p_)
                        scores.append((g[1] + g[2] + 0.5 * abs(g[1] - g[2]), p_, g[1], g[2]))
                    _, pitch, tips, heel = min(scores)
                    print(f"HEARING hands {k} pitch scores " + ", ".join(
                        f"{p_:+.1f}: tips {t * 1000:+.0f} heel {h * 1000:+.0f}" for _, p_, t, h in scores), flush=True)
                g = rest(pitch)
                if k == "R":
                    goal = Vector((R_PALM[0], R_PALM[1], 0))
                else:
                    goal = solved["R_palm"] + solved["R_back"] * L_BACK
                err = Vector((goal.x - g[3][0], goal.y - g[3][1], 0))
                if err.length < 0.004:
                    break
                wrist += err
                elbow += err * 0.8
            g = rest(pitch)
            if k == "R":
                solved["R_palm"] = Vector(g[3])
                hd = -_wdir(rig, "hand_fk.R")       # from the knuckles back toward the wrist, level
                hd.z = 0.0
                solved["R_back"] = hd.normalized()
                bvh_r = hand_bvh(body, "R")
                extra = f"pitch {pitch:+.2f} fingertips {g[1] * 1000:+.1f} mm heel {g[2] * 1000:+.1f} mm over the papers"
            else:
                pts = hpts(body, HAND_GROUPS, ".L")
                inside = int((clearances(pts, bvh_r, paper) < 0.0).sum())
                pc = g[3]
                extra = (f"pitch {pitch:+.2f} clearance {g[0] * 1000:+.1f} mm, fingertips {g[1] * 1000:+.1f} mm, heel "
                         f"{g[2] * 1000:+.1f} mm over their support, vertices inside the right hand {inside}, palm "
                         f"offset from the right palm ({(pc[0] - solved['R_palm'].x) * 1000:+.0f}, "
                         f"{(pc[1] - solved['R_palm'].y) * 1000:+.0f}) mm")
            S, E, W = solve_arm_elbow(holder, k, side, elbow, wrist, twist, hdir(pitch))
            fore = hpts(body, ("DEF-forearm",), f".{k}")
            fore = fore[fore[:, 1] > EDGE + 0.01]
            flo = fore[:, 2].min() if len(fore) else 9.9
            report.append(f"{k}: twist {twist:+.0f} palm-down {best[0]:+.2f} elbow ({E.x:+.3f}, {E.y:+.3f}, "
                          f"{E.z:.3f}) wrist ({W.x:+.3f}, {W.y:+.3f}, {W.z:.3f}) {extra}, forearm low over the table "
                          f"{(flo - st.TOP) * 1000:+.0f} mm")
    print("HEARING hands " + "; ".join(report), flush=True)


def hand_relief(holder):
    """Model the slight ridge over the four metacarpal heads on the backs of the folded hands."""
    rig = rigged.rig_of(holder)
    with fast_body(holder) as body:
        shape = body.shape_key_add(name="Knuckle ridges", from_mix=False)
        ev = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = ev.to_mesh()
        normal_matrix = ev.matrix_world.to_3x3().inverted().transposed()
        offsets = []
        for side in ("L", "R"):
            marks = [rig.matrix_world @ rig.pose.bones[f"DEF-{finger}.01.{side}"].head for finger in FINGERS]
            for ix in _sel(body, ("DEF-hand", "DEF-palm", "DEF-f_"), "." + side):
                v = mesh.vertices[int(ix)]
                normal = (normal_matrix @ v.normal).normalized()
                if normal.z < 0.35:
                    continue
                pt = ev.matrix_world @ v.co
                distance = min((pt - mark).length for mark in marks)
                if distance < 0.018:
                    relief = (1 - (distance / 0.018) ** 2) ** 2 * 0.0011 * normal.z
                    offsets.append((int(ix), relief))
        ev.to_mesh_clear()
        for ix, lift in offsets:
            normal = body.data.vertices[ix].normal
            shape.data[ix].co += normal * (lift / max(1e-6, (body.matrix_world.to_3x3() @ normal).length))
        shape.value = 1.0
    print(f"HEARING knuckle relief: {len(offsets)} dorsal vertices", flush=True)


def age_neck_and_jaw(holder):
    """Broaden the lower jaw and neck of the witness without shifting his eyelids or hairline."""
    body = bpy.data.objects[holder["body"]]
    rig = rigged.rig_of(holder)
    head = body.matrix_world.inverted() @ rig.matrix_world @ rig.data.bones["DEF-spine.006"].head_local
    groups = {g.index for g in body.vertex_groups if g.name in ("DEF-spine.004", "DEF-spine.005", "DEF-spine.006")}
    if body.data.shape_keys is None:
        body.shape_key_add(name="Basis")
    shape = body.shape_key_add(name="Mature neck and jaw", from_mix=False)
    count = 0
    for v in body.data.vertices:
        if not any(g.group in groups and g.weight > 0.18 for g in v.groups):
            continue
        dz = v.co.z - head.z
        neck = max(0.0, 1 - ((dz + 0.045) / 0.07) ** 2) ** 2
        jaw = max(0.0, 1 - ((dz - 0.032) / 0.045) ** 2) ** 2
        if neck or jaw:
            shape.data[v.index].co.x += (v.co.x - head.x) * max(0.12 * neck, 0.08 * jaw)
            count += 1
    shape.value = 1.0
    print(f"HEARING jaw and neck profile: {count} vertices", flush=True)


def soften_hair(holder):
    """The sculpted short hair read as a ribbed swim cap: a regular groove bump over a perfectly even shell. Break
    the shell with a slow clumpy displacement (inside the volume group, so the hairline stays tapered) and make the
    carving irregular and shallow (a strongly distorted wave plus a fine noise)."""
    hair = bpy.data.objects.get(f"{holder['body']}_hair")
    if hair is not None:
        tx = bpy.data.textures.new(f"{holder.name}_hair_clumps", "CLOUDS")
        tx.noise_scale, tx.noise_depth = 0.018, 2
        dp = hair.modifiers.new("clumps", "DISPLACE")
        dp.texture, dp.texture_coords = tx, "LOCAL"
        dp.direction, dp.mid_level, dp.strength, dp.vertex_group = "NORMAL", 0.5, 0.004, "hair_clumps"
        i, j = hair.modifiers.find("clumps"), hair.modifiers.find("volume") + 1
        if 0 < j < i:
            hair.modifiers.move(i, j)
    m = bpy.data.materials.get(f"hair_{holder.name}")
    if m is None:
        return
    nt = m.node_tree
    for n in nt.nodes:
        if n.type == "TEX_WAVE":
            n.inputs["Scale"].default_value = 95.0
            n.inputs["Distortion"].default_value = 7.0
            n.inputs["Detail"].default_value = 4.0
            n.inputs["Detail Roughness"].default_value = 0.7
        if n.type == "BUMP":
            n.inputs["Strength"].default_value = 0.12
    b = nt.nodes.get("Principled BSDF")
    bump = next((n for n in nt.nodes if n.type == "BUMP"), None)
    if b is not None and bump is not None:
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 260.0
        nz.inputs["Detail"].default_value = 4.0
        b2 = nt.nodes.new("ShaderNodeBump")
        b2.inputs["Strength"].default_value = 0.2
        b2.inputs["Distance"].default_value = 0.002
        nt.links.new(nz.outputs["Fac"], b2.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], b2.inputs["Normal"])
        nt.links.new(b2.outputs["Normal"], b.inputs["Normal"])
        b.inputs["Roughness"].default_value = 0.78


def recede_hair(holder, lift=((0, 0.02), (16, 0.024), (32, 0.034), (48, 0.02), (62, 0.0)), volume=0.0065):
    """A man of 55: the sculpted short hair's front hairline raised, further at the temples than in the middle (a
    receding M), and the hair thinner over the skull (a close crop, not a cap). The shell's faces under the new line
    are cut, the new edge snapped onto it and eased, and the volume weights (which taper the shell to nothing at its
    edge) recomputed from the new edge. Mesh coordinates are the body's rest space (the head faces -Y)."""
    import bmesh
    hair = bpy.data.objects.get(f"{holder['body']}_hair")
    if hair is None:
        return
    bm = bmesh.new()
    bm.from_mesh(hair.data)
    zs = [v.co.z for v in bm.verts]
    ztop = max(zs)
    crown = [v.co for v in bm.verts if v.co.z > ztop - 0.06]
    cx = sum(c.x for c in crown) / len(crown)
    cy = sum(c.y for c in crown) / len(crown)

    def ang(co):
        return abs(math.degrees(math.atan2(co.x - cx, -(co.y - cy))))
    edge = sorted((ang(v.co), v.co.z) for v in bm.verts if v.is_boundary)

    def old_line(d):
        best = min(edge, key=lambda e: abs(e[0] - d))
        near = [z for a_, z in edge if abs(a_ - best[0]) < 3.0]
        return sum(near) / len(near)

    def extra(d):
        for (d0, z0), (d1, z1) in zip(lift, lift[1:]):
            if d <= d1:
                t = (d - d0) / (d1 - d0)
                t = t * t * (3 - 2 * t)
                return z0 + (z1 - z0) * t
        return 0.0
    base = {d: old_line(d) for d in range(0, 64, 2)}

    def line(d):
        d0 = min(62, int(d) // 2 * 2)
        return base[d0] + extra(d)
    kill = [f for f in bm.faces if ang(f.calc_center_median()) < 62 and f.calc_center_median().z < line(ang(f.calc_center_median()))]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    edge_v = [v for v in bm.verts if v.is_boundary]
    for v in edge_v:
        d = ang(v.co)
        if d < 62:
            v.co.z = max(v.co.z, line(d))
    ring = {e.other_vert(v) for v in edge_v for e in v.link_edges} - set(edge_v)
    bmesh.ops.smooth_vert(bm, verts=list(ring), factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.verts.index_update()
    bm.verts.ensure_lookup_table()
    from mathutils.kdtree import KDTree
    boundary = [v for v in bm.verts if v.is_boundary]
    edge_tree = KDTree(len(boundary))
    for v in boundary:
        edge_tree.insert(v.co, v.index)
    edge_tree.balance()
    distances = {v.index: edge_tree.find(v.co)[2] for v in bm.verts}
    bm.to_mesh(hair.data)
    bm.free()
    volume_group = hair.vertex_groups.get("volume")
    clumps = hair.vertex_groups.new(name="hair_clumps")
    for i, distance in distances.items():
        t = min(1.0, distance / 0.025)
        if volume_group is not None:
            volume_group.add([i], t * t * (3 - 2 * t), "REPLACE")
        clumps.add([i], max(0.0, min(1.0, (distance - 0.015) / 0.018)), "REPLACE")
    md = hair.modifiers.get("volume")
    if md is not None:
        md.strength = volume
    print(f"HEARING Tim's hairline raised: {len(kill)} faces cut, front edge now {line(0) - base[0] + base[0]:.3f} m "
          f"(was {base[0]:.3f}), temples {line(32):.3f} (was {base[32]:.3f})", flush=True)


def tim():
    """Tim at the witness table: seated, then turned to face the dais, slid so his jacket front sits TORSO_GAP from
    the table edge; his chair set behind him; his arms laid on the table."""
    h = people.man("Tim", age=TIM_AGE, weight=TIM_WEIGHT, suit="male_elegantsuit01", tone=(0.09, 0.09, 0.1),
                   shirt_tone=SHIRT, tie_tone=TIE)
    age_neck_and_jaw(h)
    recede_hair(h)
    soften_hair(h)
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
    hand_relief(h)
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
    # the shadow floor: a small black lift in scene linear (applied before the view transform and the exposure), so
    # the deepest shadows sit a few levels above zero instead of being crushed by the film grade
    lift = LIFT.get(name, 0.0) / (2.0 ** CAMERAS.get(name, {}).get("exposure", EXPOSURE))
    vs = sc.view_settings
    vs.use_curve_mapping = lift > 0
    if lift > 0:
        vs.curve_mapping.black_level = (-lift, -lift, -lift)
        vs.curve_mapping.update()
    for cam_, names in HIDE.items():
        for n in names:
            for ob in [o for o in bpy.data.objects if o.name == n or o.name.startswith(n + "_")]:
                ob.hide_render = cam_ == name
    print(f"HEARING camera {name or '?'}: beat {CAMERAS.get(name, {}).get('beat', '?')}, trims {trims or 'none'}, "
          f"black lift {lift:.4f}", flush=True)


def _render(out, samples=64, res=(1920, 1080), exposure=-0.2, world=0.0):
    """setkit.render, but with the light-path depth the water glass needs: setkit fixes max_bounces at 6, and a ray
    through a tumbler and its water (six refractions before it reaches anything lit) ended there, so the glass
    rendered as an opaque black cup. Everything else as setkit does it."""
    import time
    sc = bpy.context.scene
    w = bpy.data.worlds.new("world")
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[1].default_value = world
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.03
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 12
    sc.cycles.diffuse_bounces = 4
    sc.cycles.glossy_bounces = 4
    sc.cycles.transmission_bounces = 12
    sc.cycles.volume_bounces = 0
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.view_settings.view_transform = "AgX"
    looks = [lk.identifier for lk in bpy.types.ColorManagedViewSettings.bl_rna.properties["look"].enum_items]
    sc.view_settings.look = "AgX - Base Contrast" if "AgX - Base Contrast" in looks else "None"
    sc.view_settings.exposure = exposure
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = out
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"RENDER {res[0]}x{res[1]} {samples} samples: {time.time() - t0:.1f} s")


def install_hook():
    def render(*args, **kw):
        apply_camera(which_camera())
        return _render(*args, **kw)
    render._orig = getattr(sk.render, "_orig", sk.render)
    sk.render = render


# ---------------------------------------------------------------- lights
def extra_seat(row, s, c):
    return s * st.SEATS_X[c], st.ROWS[row]


def under_cap_strips(energy=(0.55, 0.45)):
    """A warm line of light hidden under each tier's cap nose, grazing down the fascia: the panels' bevels catch it
    and the fascia falls off from the cap to the floor rail (the cans over the tiers sit behind the fascia and the
    broadcast lights are too far away to give a vertical panel any falloff)."""
    for k, t in enumerate(st.TIERS):
        R, zc, n = t["R"], t["zc"], t["n"]
        angs = st.angles(n)
        for i, (a0, a1) in enumerate(zip(angs, angs[1:])):
            mid, u, nrm, L = st.facet(R, a0, a1)
            p = mid + nrm * 0.03
            loc = (p.x, p.y, zc - 0.072)
            tgt = mid + nrm * 0.16
            st.area(f"cap_strip{k}_{i}", loc, (L - 0.12, 0.012), energy[k], WARM_STRIP, spread=100,
                    rot=st.aim_rot(loc, (tgt.x, tgt.y, 0.0)))


WARM_STRIP = (1.0, 0.9, 0.78)


def lights():
    """Practicals first: the downlight over the table (the island), the broadcast soft lights (key and fill on the
    bar in front of the witness, two on the bar behind him toward the dais), the cans over the tiers, the light
    hidden under the tiers' caps, a can on each still figure in the public rows and a few dim cans over the rows,
    one over the press table; the washer on the drape, the sconces and the doors are built with their fittings."""
    gx, gy, _ = TABLE_POS["glass_tim"]
    st.point("glass rim return", (gx - 0.09, gy - 0.12, st.TOP + 0.21), 0.40, st.COOL, radius=0.01)
    graze_at = (st.TIM_X - 2, -3.0, 2.6)
    aisle = st.area("side aisle chair tops", graze_at, (1.6, 0.20), 32, st.COOL, spread=60,
                    rot=st.aim_rot(graze_at, (st.TIM_X, -3.7, 0.62)))
    aisle.visible_glossy = False
    xs, ys = st.coffer_centres()
    # the island: two cans in the coffer over the table, both aimed at Tim's place
    st.downlight("dl_table", st.TIM_X + 0.25, 0.0, 450.0, target=(st.TIM_X + 0.05, -0.15, st.TOP), size_deg=30,
                 blend=0.75, radius=0.06)
    st.downlight("dl_table2", st.TIM_X + 0.95, 0.45, 0.0)
    # broadcast key and fill, from the dais side, on the bar at y 1.2 (hung 0.5 m below it on their pipes)
    face = Vector((st.TIM_X, -0.5, 1.25))
    st.tv_light("tv_key", (st.TIM_X + 2.3, 1.2, 4.2), face, 66.0, spread=30)
    st.tv_light("tv_fill", (st.TIM_X - 2.6, 1.2, 4.2), face, 10.5, spread=30)
    # on the bar behind him: aimed past him at the dais chairs (they rim his shoulders and light the tiers)
    st.tv_light("tv_back_l", (-2.2, -3.6, 4.25), (-0.8, 4.6, 1.8), 55.0, size=(0.6, 0.45), spread=36)
    st.tv_light("tv_back_r", (2.4, -3.6, 4.25), (0.9, 4.8, 1.8), 55.0, size=(0.6, 0.45), spread=36)
    # the tiers: narrower cans over the lower tier's desks and the upper tier's chairs
    r0 = st.TIERS[0]["R"] + 0.5
    for x in (-2.4, 0.0, 2.4):
        a = math.asin(x / r0)
        p = st.P(r0, a)
        st.downlight(f"dl_t0_{x:+.1f}", x, 4.8, 520.0, target=(p.x, p.y, st.TIERS[0]["zd"]), size_deg=32, blend=0.5)
    for x in (-4.8, -2.4, 0.0, 2.4, 4.8):
        st.downlight(f"dl_t1_{x:+.1f}", x, ys[-1], 460.0 if abs(x) < 3 else 260.0, target=(x * 0.95, 6.6, 0.9),
                     size_deg=46, blend=0.7)
    under_cap_strips()
    # the still figures: each in a faint cone from the can in front of it (toward the dais), aimed at its head
    lit = set()
    for (row, s, c, kind, upper) in EXTRAS:
        x, y = extra_seat(row, s, c)
        cx = min(xs, key=lambda v: abs(v - x))
        cy = min((v for v in ys if v > y), default=ys[-1])
        st.downlight(f"dl_fig_{cx:+.1f}_{cy:+.1f}", cx, cy, FIG_LIGHT, target=(x, y - 0.12, 1.05), size_deg=40,
                     blend=0.8, radius=0.1)
        lit.add((round(cx, 1), round(cy, 1)))
    # the public rows: a few cans on, low
    for (x, y, e) in PUB_CANS:
        if (round(x, 1), round(y, 1)) in lit:
            continue
        st.downlight(f"dl_pub_{x:+.1f}_{y:+.1f}", x, y, e, size_deg=60 if e > 100 else 85, blend=0.85)
        lit.add((round(x, 1), round(y, 1)))
    # the press table at the side of the well
    px, py = PRESS[0], PRESS[1]
    cx = min(xs, key=lambda v: abs(v - px))
    cy = min(ys, key=lambda v: abs(v - py))
    st.downlight(f"dl_press_{cx:+.1f}_{cy:+.1f}", cx, cy, 110.0, target=(px, py, 0.74), size_deg=50, blend=0.8)
    lit.add((round(cx, 1), round(cy, 1)))
    # the rest of the cans dark
    lit |= {(0.0, 4.8), (-2.4, 4.8), (2.4, 4.8), (0.0, 0.0), (round(st.TIM_X + 0.95, 1), 0.5)} | \
           {(round(x, 1), round(ys[-1], 1)) for x in (-4.8, -2.4, 0.0, 2.4, 4.8)}
    for x in xs:
        for y in ys:
            if (round(x, 1), round(y, 1)) not in lit:
                st.downlight(f"dl_off_{x:+.1f}_{y:+.1f}", x, y, 0.0)


FIG_LIGHT = 160.0
# the cans over the public rows: the back rows (the wide's foreground) a little up, so the chair backs read as rows
PUB_CANS = ((-2.4, -4.8, 160.0), (2.4, -4.8, 160.0), (2.4, -7.2, 120.0), (-2.4, -7.2, 120.0), (-2.4, -8.9, 80.0),
            (2.4, -8.9, 45.0))
PRESS = (-4.6, 1.3, -90.0)          # the press table: centre x, y, turn (its users face the witness table)
CLERK = (1.6, 2.6)                  # the clerk's desk, under the lower tier, right of centre
TRIPOD = (-3.7, -0.9, -75.0)        # a press camera on its tripod at the front of the public, aimed at the witness


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
    st.table_dressing(mic_src, TABLE_POS)
    # the tumblers cast no shadow: Cycles blocks shadow rays at refractive glass (no caustics), so each stood on a black
    # disc of its own shadow and read as an opaque black cup; without it the felt under the glass shows through
    for ob in bpy.data.objects:
        if ob.name.startswith("glass_"):
            ob.visible_shadow = False
    coll = st.public_chair_collection()
    st.public_seats(coll)
    st.dressing()
    # secondary dressing, kept dim: the press table at the side of the well, the clerk's desk under the lower tier,
    # a press camera on its tripod at the front of the public
    st.staff_table("press", PRESS[0], PRESS[1], PRESS[2], length=1.8, folders=3, chairs=2)
    a = math.degrees(math.atan2(CLERK[0], CLERK[1] - st.DC))
    st.staff_table("clerk", CLERK[0], CLERK[1], 180.0 - a, length=1.4, folders=1, chairs=0)
    behind = Vector(CLERK) + Vector((math.sin(math.radians(a)), math.cos(math.radians(a)))) * 0.72
    st.witness_chair("clerk_chair", behind.x, behind.y, turn=180.0 - a + 4.0)
    st.tripod_camera("presscam", TRIPOD[0], TRIPOD[1], TRIPOD[2])
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
