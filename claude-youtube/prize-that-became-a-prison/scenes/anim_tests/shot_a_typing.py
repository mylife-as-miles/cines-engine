"""Shot A: Dawn's hands typing on the laptop, a close-up with a shallow depth of field and a slow push.

    <bpy python> -I scenes/anim_tests/shot_a_typing.py [--out out/anim_tests/blend/A_typing.blend]

The set is scenes/stages/evidence_table.py in its Ch 02 state (the beat of the film's `laptop` and `screen` plates:
night, the lamp turned down, the laptop's blank screen glowing; gfx/shots/screen_email.json names that plate). The
laptop is moved from the back of the table to its front edge and turned to face a seat, and Dawn (people.dawn(), the
film's shared statue) sits at it on a plain chair.

Typing is solved, not keyed by eye. Each finger rests on its home key; a keystroke is a small lift, a strike that
carries the key down its 1.4 mm travel, a short hold and a release, timed from a seeded script of words (about
4.5 keys a second, a thumb on the space bar between words, a pause to think). Every frame the arm is fitted to a
wrist target on the rig's own bone lengths, the forearm pronated so the palm faces the keys, and each finger's curl
solved so its pad sits exactly on (or, while striking, in) its key: the key's depth is then read from the finger,
so a key moves only when a finger pushes it.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C  # noqa: E402

import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

NAME = "A_typing"
LAPTOP_AT = (0.10, -0.30, 90.0)      # x, y, turn (deg): the screen faces -Y, toward the seat at the table's front
SEAT = (0.115, -0.845)               # chair seat centre
SEAT_TOP = 0.461
TRAVEL = 0.0014                      # key travel (m)
LIFT = 0.0055                        # how far a finger rises before it strikes
KEY_TOP_LOCAL = 0.0285 + 0.00115     # key cap top above the laptop's base (laptop-local z)
ROWS_X = [0.035 - r * 0.022 for r in range(5)]   # key row centres along laptop-local x (row 0 by the hinge)
ROW_UNITS = ((1,) * 14, (1.4,) + (1,) * 12 + (1.4,), (1.65,) + (1,) * 11 + (1.95,),
             (2,) + (1,) * 10 + (2.5,), (1.4, 1.3, 1.3, 5.9, 1.3, 1.3, 1.4))
FINGERS = ("index", "middle", "ring", "pinky")
# home keys (row 2, index into the row): laptop-local +y is the typist's left
HOME = {"L": {"index": 7, "middle": 8, "ring": 9, "pinky": 10}, "R": {"index": 4, "middle": 3, "ring": 2, "pinky": 1}}
THUMB = {"L": (4.0, -12.0), "R": (4.0, -12.0)}   # thumb out and turn (deg) on top of the solved flexion
B_MIDDLE = 52.0                      # the middle finger's middle-joint flexion at rest on its key (deg)
WRIST_UP = 0.033                     # wrist (hand bone root) height over the key tops


# ------------------------------------------------------------------ the set

def laptop_matrix(x, y, t, top):
    return Matrix.Translation((x, y, top)) @ Matrix.Rotation(math.radians(t), 4, "Z")


def move_laptop(et):
    """Carry every part of the laptop (prop, inserts, screen, its lights and focus empties) to LAPTOP_AT."""
    old = laptop_matrix(*et.LAPTOP, et.TOP)
    new = laptop_matrix(*LAPTOP_AT, et.TOP)
    D = new @ old.inverted()
    objs = set(et.G["laptop"])
    for n in ("fx_laptop", "fx_screen", "screen on the desktop", "LCD inner bezel"):
        if n in bpy.data.objects:
            objs.add(bpy.data.objects[n])
    bpy.context.view_layer.update()
    roots = [o for o in objs if o.parent not in objs]
    for o in roots:
        o.matrix_world = D @ o.matrix_world
    bpy.context.view_layer.update()
    return new


def split_keys(place):
    """The stage's key caps are one mesh; make each cap its own object (same mesh, material and bevel) so it can
    travel. Returns {(row, index): object}, origins at each cap's top centre."""
    src = bpy.data.objects["laptop blank keys"]
    me = src.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    seen, islands = set(), []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, isl = [v], []
        seen.add(v.index)
        while stack:
            a = stack.pop()
            isl.append(a.index)
            for e in a.link_edges:
                b = e.other_vert(a)
                if b.index not in seen:
                    seen.add(b.index)
                    stack.append(b)
        islands.append(isl)
    keys = {}
    for isl in islands:
        pts = [me.vertices[i].co.copy() for i in isl]
        c = sum(pts, Vector()) / len(pts)
        top = max(p.z for p in pts)
        row = min(range(5), key=lambda r: abs(ROWS_X[r] - c.x))
        origin = Vector((c.x, c.y, top))
        kb = bmesh.new()
        remap = {}
        for i in isl:
            remap[i] = kb.verts.new(me.vertices[i].co - origin)
        for f in me.polygons:
            if f.vertices[0] in remap:
                kb.faces.new([remap[i] for i in f.vertices])
        km = bpy.data.meshes.new("key")
        kb.to_mesh(km)
        kb.free()
        for p in km.polygons:
            p.use_smooth = True
        km.materials.append(me.materials[0])
        ko = bpy.data.objects.new("key", km)
        bpy.context.scene.collection.objects.link(ko)
        for md in src.modifiers:
            nm = ko.modifiers.new(md.name, md.type)
            for prop in ("width", "segments", "limit_method", "angle_limit"):
                if hasattr(md, prop):
                    setattr(nm, prop, getattr(md, prop))
        ko.matrix_world = src.matrix_world @ Matrix.Translation(origin)
        keys.setdefault(row, []).append((c.y, ko))
    bm.free()
    src.hide_render = True
    src.hide_viewport = True
    out = {}
    for row, lst in keys.items():
        for i, (_, ko) in enumerate(sorted(lst, key=lambda t: t[0])):
            ko.name = f"key r{row} k{i:02d}"
            out[(row, i)] = ko
    print(f"ANIM keys: {len(out)} caps split from the stage's deck", flush=True)
    return out


def chair(et):
    """A plain oak chair like the stage's own (same wood), its seat under Dawn."""
    import setkit as sk
    wood = et.materials()["leg"]
    x, y = SEAT
    parts = []
    for dx in (-0.185, 0.185):
        parts.append(sk.box("typing chair rear post", (0.030, 0.031, 0.86), (x + dx, y - 0.195, 0.43), wood, bevel=0.004))
        parts.append(sk.box("typing chair front leg", (0.028, 0.028, 0.445), (x + dx, y + 0.19, 0.2225), wood, bevel=0.004))
    parts.append(sk.box("typing chair seat", (0.40, 0.42, 0.032), (x, y, SEAT_TOP - 0.016), wood, bevel=0.009))
    parts.append(sk.box("typing chair top rail", (0.40, 0.030, 0.080), (x, y - 0.195, 0.82), wood, bevel=0.009))
    return parts


# ------------------------------------------------------------------ the figure

def mesh_mods(holder, on):
    """Switch the figure's mesh deformation off while solving (bones only: fast) and back on."""
    for o in holder.children_recursive:
        if o.type == "MESH":
            for md in o.modifiers:
                md.show_viewport = on


def pose_body(holder, P):
    """rigged.pose_figure with a seated torso: reset; drop and lean the torso; chest, neck and head; feet on the
    floor; arms aimed (forward, out, elbow). All in the rig's armature space."""
    import rigged
    rig = bpy.data.objects[holder["rig"]]
    pb = rig.pose.bones
    for b in pb:
        b.matrix_basis = Matrix.Identity(4)
    for k in ("L", "R"):
        pb[f"upper_arm_parent.{k}"]["IK_FK"] = 1.0
        pb[f"thigh_parent.{k}"]["IK_Stretch"] = 0.0
    bpy.context.view_layer.update()
    tor = pb["torso"]
    tor.matrix = Matrix.Translation(P["drop"]) @ tor.matrix
    bpy.context.view_layer.update()
    for bone in ("torso", "chest", "neck", "head"):
        if bone in P:
            rigged._turn(rig, bone, *P[bone])
    for side, k, key in ((1, "L", "l_arm"), (-1, "R", "r_arm")):
        fwd, out, elbow = P[key]
        rigged._aim(rig, f"upper_arm_fk.{k}", rigged._dir(0, fwd, side, out))
        rigged._aim(rig, f"forearm_fk.{k}", rigged._dir(0, fwd + elbow, side, out * 0.6))
    inv = rig.matrix_world.inverted()
    for k in ("L", "R"):
        f = pb[f"foot_ik.{k}"]
        m = f.matrix.copy()
        m.translation = inv @ Vector(P["feet"][k])
        f.matrix = m
    bpy.context.view_layer.update()


def orient_hand(holder, side, fwd_dir, pitch_deg, roll_deg=0.0):
    """Pronate the forearm (70 %) and set the hand frame: palm toward the keys, fingers along fwd_dir, tipped by
    pitch (positive raises the knuckles), rolled by roll (positive lifts the thumb side)."""
    rig = bpy.data.objects[holder["rig"]]
    pb = rig.pose.bones
    k = side
    sgn = 1 if k == "L" else -1
    R = rig.matrix_world.to_3x3().normalized().inverted()
    y = (R @ Vector(fwd_dir)).normalized()
    x = R @ Vector((0, 0, -1))
    x = (x - y * x.dot(y)).normalized() * sgn
    z = x.cross(y)
    q = Matrix.Rotation(sgn * math.radians(pitch_deg), 3, z)
    x, y = (q @ x).normalized(), (q @ y).normalized()
    if roll_deg:
        r = Matrix.Rotation(math.radians(roll_deg) * sgn, 3, y)
        x = (r @ x).normalized()
    z = x.cross(y)
    fa = pb[f"forearm_fk.{k}"]
    fm = fa.matrix.copy()
    fy = fm.to_3x3().col[1].normalized()
    fx = fm.to_3x3().col[0].normalized()
    want = (x - fy * x.dot(fy)).normalized()
    ang = fx.angle(want) * 0.7
    if fx.cross(want).dot(fy) < 0:
        ang = -ang
    h0 = fm.translation.copy()
    fa.matrix = Matrix.Translation(h0) @ Matrix.Rotation(ang, 4, fy) @ Matrix.Translation(-h0) @ fm
    bpy.context.view_layer.update()
    hb = pb[f"hand_fk.{k}"]
    hm = Matrix((x, y, z)).transposed().to_4x4()
    hm.translation = hb.matrix.translation.copy()
    hb.matrix = hm
    bpy.context.view_layer.update()


def arm_pos(f, o, e, L1, L2, side):
    """Wrist relative to the shoulder for rigged.pose_figure's arm angles (degrees), the same model as
    rigged.fit_wrist (forearm out at 60 % of the upper arm's)."""
    f, o, e = math.radians(f), math.radians(o), math.radians(e)
    a1, a2 = L1 * math.cos(f), L2 * math.cos(f + e)
    return Vector((side * (a1 * math.sin(o) + a2 * math.sin(0.6 * o)),
                   -L1 * math.sin(f) - L2 * math.sin(f + e),
                   -a1 * math.cos(o) - a2 * math.cos(0.6 * o)))


def arm_newton(shoulder, target, L1, L2, side, guess, iters=12):
    """(forward, out, elbow) in degrees that put the wrist exactly on target: Newton steps with a numeric Jacobian."""
    from mathutils import Matrix as M3
    d = Vector(target) - Vector(shoulder)
    q = Vector(guess)
    for _ in range(iters):
        r = arm_pos(*q, L1, L2, side) - d
        if r.length < 1e-7:
            break
        h = 1e-3
        cols = []
        for i in range(3):
            dq = Vector((0.0, 0.0, 0.0))
            dq[i] = h
            cols.append((arm_pos(*(q + dq), L1, L2, side) - arm_pos(*(q - dq), L1, L2, side)) / (2 * h))
        J = M3((cols[0], cols[1], cols[2])).transposed()
        try:
            q -= J.inverted() @ r
        except ValueError:
            break
    return tuple(q)


def set_finger(holder, side, finger, a, b, spread=0.0):
    """Knuckle flexion a, middle-joint flexion b, end joint 0.55 b (degrees), and spread toward the thumb."""
    rig = bpy.data.objects[holder["rig"]]
    pb = rig.pose.bones
    c = 0.55 * b
    m = pb[f"f_{finger}.01_master.{side}"]
    m.rotation_mode = "XYZ"
    m.rotation_euler = (math.radians(a), 0.0, math.radians(spread))
    for seg, ang in (("02", b), ("03", c)):
        s = pb[f"f_{finger}.{seg}.{side}"]
        s.rotation_mode = "XYZ"
        s.rotation_euler = (math.radians(ang), 0.0, 0.0)


def pad_world(holder, side, finger):
    """The finger pad (calibrated lowest skin point of the last phalanx, in that bone's frame) in world space."""
    rig = bpy.data.objects[holder["rig"]]
    b = rig.pose.bones[f"DEF-{'thumb' if finger == 'thumb' else 'f_' + finger}.03.{side}"]
    return rig.matrix_world @ b.matrix @ Vector(holder[f"pad_{side}_{finger}"])


def set_thumb(holder, side, flex, out=4.0, turn=-12.0):
    rig = bpy.data.objects[holder["rig"]]
    th = rig.pose.bones[f"thumb.01_master.{side}"]
    th.rotation_mode = "XYZ"
    th.rotation_euler = (math.radians(flex), math.radians(out), math.radians(turn))


def solve_thumb(holder, side, z_target, out=4.0, turn=-12.0, lo=-40.0, hi=70.0):
    """Bisection on the thumb's flexion so its pad is at z_target."""
    for _ in range(13):
        mid = 0.5 * (lo + hi)
        set_thumb(holder, side, mid, out, turn)
        bpy.context.view_layer.update()
        if pad_world(holder, side, "thumb").z > z_target:
            lo = mid
        else:
            hi = mid
    set_thumb(holder, side, 0.5 * (lo + hi), out, turn)
    bpy.context.view_layer.update()
    return 0.5 * (lo + hi)


def calibrate_pads(holder):
    """Measure each finger's pad (its lowest vertex in the current, palm-down pose) in its last bone's frame."""
    rig = bpy.data.objects[holder["rig"]]
    body = bpy.data.objects[holder["body"]]
    for md in body.modifiers:
        md.show_viewport = md.type == "ARMATURE"
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    names = {g.index: g.name for g in body.vertex_groups}
    best = {}
    for v, vo in zip(me.vertices, body.data.vertices):
        gs = [g for g in vo.groups if g.group in names and names[g.group].startswith(("DEF-f_", "DEF-thumb"))]
        if not gs:
            continue
        g = max(gs, key=lambda e: e.weight)
        n = names[g.group]
        if g.weight < 0.5 or ".03." not in n:
            continue
        p = ev.matrix_world @ v.co
        if n not in best or p.z < best[n].z:
            best[n] = p
    ev.to_mesh_clear()
    for side in ("L", "R"):
        for f in FINGERS + ("thumb",):
            n = f"DEF-{'thumb' if f == 'thumb' else 'f_' + f}.03.{side}"
            m = rig.matrix_world @ rig.pose.bones[n].matrix
            holder[f"pad_{side}_{f}"] = list(m.inverted() @ best[n])
    mesh_mods(holder, False)
    bpy.context.view_layer.update()


def solve_a(holder, side, finger, z_target, b, spread=0.0, lo=-25.0, hi=80.0, it=14):
    """Bisection on the knuckle angle so the pad is at z_target (the pad descends as the knuckle flexes)."""
    for _ in range(it):
        mid = 0.5 * (lo + hi)
        set_finger(holder, side, finger, mid, b, spread)
        bpy.context.view_layer.update()
        if pad_world(holder, side, finger).z > z_target:
            lo = mid
        else:
            hi = mid
    a = 0.5 * (lo + hi)
    set_finger(holder, side, finger, a, b, spread)
    bpy.context.view_layer.update()
    return a


def solve_ab(holder, side, finger, target, fwd, spread=0.0):
    """Knuckle and middle joint together: the pad on `target` in height (knuckle) and in reach along the hand's
    forward direction (middle joint: more curl brings the pad back toward the palm)."""
    lo, hi = 5.0, 100.0
    a = 0.0
    for _ in range(12):
        b = 0.5 * (lo + hi)
        a = solve_a(holder, side, finger, target.z, b, spread)
        e = (pad_world(holder, side, finger) - target).dot(fwd)
        if e > 0:
            lo = b
        else:
            hi = b
    b = 0.5 * (lo + hi)
    a = solve_a(holder, side, finger, target.z, b, spread)
    return a, b


# ------------------------------------------------------------------ the typing script

def script(seed=2014):
    """Keystrokes: (time of the strike's bottom, side, finger or 'thumb'). Words of 3-7 letters at about 4.5 keys a
    second, a space between words (the right thumb), one longer pause in the middle where she stops to think."""
    rng = random.Random(seed)
    events, t = [], 0.12
    t_end = C.t_of(C.F1) - 0.1
    while t < t_end:
        if 2.05 < t < 2.55:
            t = 2.62                                    # a pause: reading what she wrote
        n = rng.randint(3, 7)
        last = None
        for _ in range(n):
            side = rng.choice("LR")
            finger = rng.choices(FINGERS, weights=(5, 4, 2.5, 1.2))[0]
            if (side, finger) == last:                  # a different finger each stroke, as typists do
                finger = FINGERS[(FINGERS.index(finger) + 1) % 4]
            events.append((t, side, finger))
            last = (side, finger)
            t += rng.uniform(0.15, 0.27)
        events.append((t + 0.03, "R", "thumb"))
        t += rng.uniform(0.28, 0.42)
    return [e for e in events if e[0] < t_end]


def stroke(t, te):
    """Pad height above the key top for one stroke whose bottom is at te: lift, strike, hold, release. Negative
    values are inside the key's travel (the key goes down with the finger)."""
    d = t - te
    if d < -0.16 or d > 0.13:
        return 0.0
    if d < -0.07:                                       # lift (eased)
        return LIFT * C.smooth((d + 0.16) / 0.09)
    if d < 0.0:                                         # strike: fast, slightly accelerating
        u = (d + 0.07) / 0.07
        return LIFT - (LIFT + TRAVEL) * u ** 1.6
    if d < 0.045:                                       # bottomed
        return -TRAVEL
    return -TRAVEL + TRAVEL * C.smooth((d - 0.045) / 0.085)   # release: the key pushes the finger back up


# ------------------------------------------------------------------ build

def build(frames=None):
    et = C.stage("evidence_table", cast=False)
    import people
    C.remove_stage_cameras()
    et.apply_camera("laptop")                            # the Ch 02 beat as the film's laptop plate has it
    for g in ("passport_c2", "passes_c2", "envelope", "highlighter", "chair", "stack"):
        for o in et.G.get(g, []):
            o.hide_render = True
    place = move_laptop(et)
    keys = split_keys(place)
    chair(et)
    top = et.TOP + KEY_TOP_LOCAL                         # key tops (world z)

    def key_world(row, idx):
        return keys[(row, idx)].matrix_world.translation.copy()

    d = people.dawn()
    d.location = (SEAT[0], SEAT[1], 0.0)
    d.rotation_euler = (0, 0, math.pi)                   # built facing -Y: turn to face the table (+Y)
    bpy.context.view_layer.update()
    rig = bpy.data.objects[d["rig"]]
    pb = rig.pose.bones
    mesh_mods(d, False)

    # seated: torso dropped onto the chair and leaning in, feet flat under the knees
    inv3 = rig.matrix_world.to_3x3().inverted()
    hip0 = rig.matrix_world @ pb["torso"].head
    seat_hip = Vector((SEAT[0], SEAT[1] + 0.03, SEAT_TOP + 0.085))
    P = {"drop": inv3 @ (seat_hip - hip0), "torso": (13, 0), "chest": (6, 0), "neck": (8, 0), "head": (14, 0),
         "feet": {"L": (SEAT[0] - 0.105, SEAT[1] + 0.47, 0.067), "R": (SEAT[0] + 0.115, SEAT[1] + 0.44, 0.067)},
         "l_arm": (20, 8, 60), "r_arm": (20, 8, 60)}
    fwd = {"L": Vector((0.18, 1.0, 0.0)).normalized(), "R": Vector((-0.18, 1.0, 0.0)).normalized()}
    pitch = {"L": 9.0, "R": 9.0}
    roll = {"L": -10.0, "R": -10.0}

    def home_key(side, finger):
        return key_world(2, HOME[side][finger])

    # wrist targets: start 9 cm in front of the middle finger's home key, 2.4 cm over the key tops; then move the
    # wrist until the middle finger's pad sits on its key with a moderate curl
    wrist = {}
    for side in ("L", "R"):
        k = home_key(side, "middle")
        wrist[side] = Vector((k.x - fwd[side].x * 0.09, k.y - 0.09, top + WRIST_UP))

    def pose_arms(wr):
        import rigged
        sh = {k: pb[f"upper_arm_fk.{k}"].head.copy() for k in ("L", "R")}
        pose_body(d, P)
        sh = {k: pb[f"upper_arm_fk.{k}"].head.copy() for k in ("L", "R")}
        L1 = {k: pb[f"upper_arm_fk.{k}"].length for k in ("L", "R")}
        L2 = {k: pb[f"forearm_fk.{k}"].length for k in ("L", "R")}
        inv = rig.matrix_world.inverted()
        for side, key, sgn in (("L", "l_arm", 1), ("R", "r_arm", -1)):
            err, coarse = rigged.fit_wrist(sh[side], inv @ wr[side], L1[side], L2[side], sgn, min_forward=-10)
            # rigged.fit_wrist answers on a 0.5-degree grid: as the wrist target drifts, its answer steps, and the
            # whole hand jumped 1-2 mm between two frames (preview v1, frame 68). Newton from the grid answer
            # lands on the target exactly, so the arm moves continuously.
            P[key] = arm_newton(sh[side], inv @ wr[side], L1[side], L2[side], sgn, coarse)
        pose_body(d, P)
        for side in ("L", "R"):
            orient_hand(d, side, fwd[side], pitch[side], roll[side])
        return err

    pose_arms(wrist)
    for side in ("L", "R"):
        for f in FINGERS:
            set_finger(d, side, f, 25.0, 50.0)
    bpy.context.view_layer.update()
    calibrate_pads(d)

    # the wrist: moved until the middle finger, its middle joint at B_MIDDLE, has its pad on its home key
    for it in range(8):
        pose_arms(wrist)
        worst = 0.0
        for side in ("L", "R"):
            solve_a(d, side, "middle", top, B_MIDDLE)
            pad = pad_world(d, side, "middle")
            k = home_key(side, "middle")
            delta = Vector((k.x - pad.x, k.y - pad.y, 0.0))
            wrist[side] += delta
            worst = max(worst, delta.length)
        if worst < 0.0005:
            break
    pose_arms(wrist)
    # each finger: knuckle and middle joint for height and reach, spread (secant) for the side-to-side
    ab, spread = {"L": {}, "R": {}}, {"L": {}, "R": {}}
    rest_key = {}
    for side in ("L", "R"):
        fh = Vector((fwd[side].x, fwd[side].y, 0.0)).normalized()
        across = Vector((1.0, 0.0, 0.0))
        for f in FINGERS:
            k = home_key(side, f)
            target = Vector((k.x, k.y, top))
            solve_ab(d, side, f, target, fh, 0.0)
            short = (pad_world(d, side, f) - target).dot(fh)
            if short < -0.006:                        # cannot reach the home row: rest on the key in the row below
                below = min((ko for (r, i), ko in keys.items() if r == 3),
                            key=lambda ko: abs(ko.matrix_world.translation.x - k.x))
                k = below.matrix_world.translation.copy()
                target = Vector((k.x, k.y, top))
                rest_key[(side, f)] = below
                print(f"ANIM {side} {f}: {1000 * short:.0f} mm short of the home row; rests on the row below", flush=True)
            else:
                rest_key[(side, f)] = keys[(2, HOME[side][f])]
            s0, s1 = 0.0, 4.0
            ab[side][f] = solve_ab(d, side, f, target, fh, s0)
            e0 = (pad_world(d, side, f) - target).dot(across)
            sp = s0
            for _ in range(3):
                ab[side][f] = solve_ab(d, side, f, target, fh, s1)
                e1 = (pad_world(d, side, f) - target).dot(across)
                if abs(e1 - e0) < 1e-6:
                    break
                s2 = s1 - e1 * (s1 - s0) / (e1 - e0)
                s0, e0, s1 = s1, e1, max(-16.0, min(16.0, s2))
                sp = s1
            spread[side][f] = sp
            ab[side][f] = solve_ab(d, side, f, target, fh, sp)
    report = []
    for side in ("L", "R"):
        for f in FINGERS:
            set_finger(d, side, f, *ab[side][f], spread[side][f])
        bpy.context.view_layer.update()
        for f in FINGERS:
            pad = pad_world(d, side, f)
            k = rest_key[(side, f)].matrix_world.translation
            a_, b_ = ab[side][f]
            report.append(f"{side}{f[0]} {1000 * (pad.x - k.x):+.1f},{1000 * (pad.y - k.y):+.1f} "
                          f"a{a_:.0f} b{b_:.0f} s{spread[side][f]:+.0f}")
    print("ANIM home pads vs key centres (mm):", "; ".join(report), flush=True)
    sp = key_world(4, 3)
    for side in ("L", "R"):
        hand_x = home_key(side, "index").x
        aim = Vector((hand_x + (0.022 if side == "R" else -0.022) * -1.0, sp.y, top))
        best = None
        for out in range(-40, 41, 10):
            for turn in range(-60, 61, 10):
                solve_thumb(d, side, top, out, turn)
                e = (pad_world(d, side, "thumb") - aim)
                e.z = 0.0
                if best is None or e.length < best[0]:
                    best = (e.length, out, turn)
        o0, t0 = best[1], best[2]
        for out in (o0 - 5, o0, o0 + 5):
            for turn in (t0 - 5, t0, t0 + 5):
                solve_thumb(d, side, top, out, turn)
                e = (pad_world(d, side, "thumb") - aim)
                e.z = 0.0
                if e.length < best[0]:
                    best = (e.length, out, turn)
        THUMB[side] = (best[1], best[2])
        fl = solve_thumb(d, side, top, *THUMB[side])
        p = pad_world(d, side, "thumb")
        sp = key_world(4, 3)
        print(f"ANIM thumb {side}: out {THUMB[side][0]}, turn {THUMB[side][1]}, flex {fl:.0f}, pad x {p.x:.3f} (space bar {sp.x - 0.065:.3f}..{sp.x + 0.065:.3f}), "
              f"y {p.y:.3f} (row {sp.y:.3f} +-0.0085)", flush=True)

    # ---- animate
    events = script()
    frames = frames or C.FRAMES
    rng = random.Random(7)
    drift_phase = {s: (rng.uniform(0, 6.28), rng.uniform(0, 6.28)) for s in ("L", "R")}
    record = {}                                          # bone -> list of basis matrices
    key_depth = {k: [0.0] * len(frames) for k in keys}
    thumb_key = keys[(4, 3)]                             # the space bar
    contacts = []
    misses = []
    foot = {kk: (ko.matrix_world.translation.copy(), 0.5 * ko.dimensions.x, 0.5 * ko.dimensions.y)
            for kk, ko in keys.items()}

    def key_under(p):
        """The key whose cap the point is over (world x across the rows, y along them for this laptop turn)."""
        for kk, (c, hx, hy) in foot.items():
            if abs(p.x - c.x) <= hy and abs(p.y - c.y) <= hx:
                return kk
        return None
    base_wrist = {s: v.copy() for s, v in wrist.items()}
    for fi, f in enumerate(frames):
        t = C.t_of(f)
        wr = {}
        for side in ("L", "R"):
            p1, p2 = drift_phase[side]
            # the hand floats: a slow drift of a few millimetres, and a soft half-millimetre give as each of its
            # fingers strikes (a smooth 0.14 s bump: a 1.2 mm dip held for one frame read as a twitch in preview v1)
            dip = sum(0.0005 * math.exp(-((t - te - 0.02) / 0.07) ** 2) for te, s_, _ in events if s_ == side)
            wr[side] = base_wrist[side] + Vector((0.0018 * math.sin(0.9 * t + p1), 0.0015 * math.sin(0.7 * t + p2),
                                                 0.0012 * math.sin(1.3 * t + p2) - dip))
        pose_arms(wr)
        for side in ("L", "R"):
            for fg in FINGERS:
                h = sum(stroke(t, te) for te, s_, f_ in events if s_ == side and f_ == fg)
                # the neighbours of a striking finger rise a little with it (tendons are shared), still in touch
                nb = [FINGERS[i] for i in (FINGERS.index(fg) - 1, FINGERS.index(fg) + 1) if 0 <= i < 4]
                sym = sum(0.18 * max(0.0, stroke(t, te)) for te, s_, f_ in events if s_ == side and f_ in nb)
                h += min(sym, 0.0009)
                a0, b0 = ab[side][fg]
                solve_a(d, side, fg, top + h, b0 + 2600.0 * max(0.0, h), spread[side][fg], lo=a0 - 25, hi=a0 + 25,
                        it=12)
                bpy.context.view_layer.update()
                pad = pad_world(d, side, fg)
                kk = key_under(pad)
                if kk is not None:
                    key_depth[kk][fi] = max(key_depth[kk][fi], min(TRAVEL, max(0.0, top - pad.z)))
                elif pad.z < top + 0.0005:
                    misses.append((f, side, fg))
                contacts.append((f, side, fg, pad.z - top, h))
        # thumbs: the right one rests on the space bar and taps it between words; the left hovers just over it
        for side in ("L", "R"):
            if side == "R":
                tap = sum(stroke(t, te) for te, s_, f_ in events if f_ == "thumb")
                solve_thumb(d, side, top + tap, *THUMB[side])
                pad = pad_world(d, side, "thumb")
                kk = key_under(pad)
                if kk is not None:
                    key_depth[kk][fi] = max(key_depth[kk][fi], min(TRAVEL, max(0.0, top - pad.z)))
            else:
                solve_thumb(d, side, top + 0.0035, *THUMB[side])
        bpy.context.view_layer.update()
        for b in pb:
            if not b.name.startswith(("DEF-", "ORG-", "MCH-")):
                record.setdefault(b.name, []).append(b.matrix_basis.copy())

    # bake the controls that move
    n_keys = 0
    for name, mats in record.items():
        if all(_close(m, Matrix.Identity(4)) for m in mats):
            continue
        b = pb[name]
        locs = [m.to_translation() for m in mats]
        scales = [m.to_scale() for m in mats]
        C.bake_vector(rig, f'pose.bones["{name}"].location', frames, [tuple(v) for v in locs], group=name)
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
        if any(abs(s.x - 1) > 1e-4 or abs(s.y - 1) > 1e-4 or abs(s.z - 1) > 1e-4 for s in scales):
            C.bake_vector(rig, f'pose.bones["{name}"].scale', frames, [tuple(s) for s in scales], group=name)
        n_keys += 1
    for (row, idx), ko in keys.items():
        depth = key_depth[(row, idx)]
        if max(depth) > 0:
            z0 = ko.location.z
            C.bake(ko, "location", frames, [z0 - dd for dd in depth], index=2)
    mesh_mods(d, True)
    # contact report: resting fingers on their key tops, strikes inside the travel
    rest = [c[3] for c in contacts if abs(c[4]) < 1e-6]
    print(f"ANIM typing: {len(events)} keystrokes; {n_keys} controls baked; resting pads vs key top "
          f"{1000 * min(rest):+.2f}..{1000 * max(rest):+.2f} mm; pads off every key while touching: {len(misses)}",
          flush=True)

    # ---- camera
    focus_obj = bpy.data.objects.new("fx_typing", None)
    bpy.context.scene.collection.objects.link(focus_obj)
    hr = home_key("R", "middle")
    focus_obj.location = (hr.x, hr.y, top + 0.012)
    n = len(frames)
    cam_a = Vector(CAM_FROM)
    cam_b = Vector(CAM_TO)
    aim_a = Vector(AIM_FROM)
    aim_b = Vector(AIM_TO)
    locs = [cam_a.lerp(cam_b, C.cruise(i / max(1, n - 1), 0.09)) for i in range(n)]
    aims = [aim_a.lerp(aim_b, C.cruise(i / max(1, n - 1), 0.09)) for i in range(n)]
    cam = C.moving_camera("anim_cam", frames, locs, aims, LENS, FSTOP, focus="fx_typing", clip=(0.01, 50.0))
    # the screen plate's exposure (-1.6) is for the panel; this close the lit stone fingers clip there
    C.film_settings(exposure=EXPOSURE)
    sc = bpy.context.scene
    sc.cycles.sample_clamp_indirect = 6.0
    sc.cycles.blur_glossy = 0.5
    C.volumes_off_blur()
    print(f"ANIM {NAME}: fingerprint {C.fingerprint([cam, rig] + list(keys.values())[:8])}", flush=True)
    return cam


def _close(a, b, eps=1e-6):
    return all(abs(a[i][j] - b[i][j]) < eps for i in range(4) for j in range(4))


# low, from the front right beside the lid: the fronts of the right hand's fingers in the screen's light, the rows
# of keys receding, the left hand soft beyond; a slow push of 7 cm
CAM_FROM, CAM_TO = (0.43, -0.19, 0.855), (0.372, -0.222, 0.846)
AIM_FROM, AIM_TO = (0.10, -0.37, 0.795), (0.10, -0.37, 0.795)
LENS, FSTOP = 50.0, 2.8
EXPOSURE = -2.1


if __name__ == "__main__":
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    out = a[a.index("--out") + 1] if "--out" in a else os.path.join(C.BLENDS, NAME + ".blend")
    if "--dev" in a:                                    # a few frames only, for looking at the pose
        build(frames=[int(v) for v in a[a.index("--dev") + 1].split(",")])
    else:
        build()
    C.save(os.path.abspath(out))
