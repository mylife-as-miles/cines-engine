"""Stage: the courtroom (Ch 07 'The sentence'). Fluorescent Noir, reconstructed with restraint: wide and still.

A modern hall of justice: a raised judges' bench in pale ash across the far end, three high-backed chairs behind it,
empty, with a microphone before each; dark smoked-oak boarding behind them and, high in the centre, the blank panel
where a court's emblem would hang (nothing on it). Counsel desks face each other across the well, empty. In the middle
of the well, the dock: waist-high pale-wood panels, a rail and a small gate. Dawn stands in it alone in grey prison
clothes, her hands on the front ledge, head bowed. Behind the bar the public benches stand empty in rows. Light: the
lay-in panels over the well and the bench burn (the lit island), the gallery's are off; overcast daylight comes
through high frosted windows, brighter from the left; a slot washer grazes the boarding behind the bench.

    <bpy python> -I scenes/shoot.py -- courtroom <cam> out.png [--nocast]

Set in courtroom_set.py, materials in courtroom_mats.py. Dawn comes from people.dawn_prison(); her arms are solved so
her palms rest on the dock's ledge (two-bone IK on the FK chain, the forearm rolled until the palm faces down, the
wrist lowered until the hand's underside meets the wood), printed as COURT hands ...
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
import courtroom_set as st  # noqa: E402

EXPOSURE = -1.6

DAWN = (0.40, st.LEDGE[0] - 0.21)     # her feet: in the dock close up to the front ledge (her front 6-8 cm from its
                                      # inner face), a little right of its middle (on the centre line her head hid the
                                      # presiding chair in the wide), facing the bench (+Y)
HAND_X = 0.22                          # wrists about 22 cm either side of her centre: elbows bent, clear of the waist
HAND_Y = 0.05                          # how far onto the ledge (from its inner edge) the wrists sit
HAND_PITCH = 0.3                       # the hand a little extended at the wrist, so the palm heel and the fingers both rest
POSE = {"head": (32, -4), "neck": (16, 0), "chest": (10, 0), "fingers": 15}
SHOULDER_ROLL = 5.0                    # shoulders rolled forward (degrees): the weight of the bowed head
GARMENT = (0.05, 0.052, 0.056)         # the prison clothes re-surfaced as matt cotton (see dress_prison)
HAZE = 0.004                           # enough for the windows' beams and the dock's downlight to draw faint shafts

FOCUS = {
    "fx_dock": (0.0, st.DOCK[1], 1.25),
    "fx_dawn": (DAWN[0], DAWN[1] + 0.05, 1.5),
    "fx_bench": (0.0, st.BENCH_Y, 1.3),
}

CAMERAS = {
    # Ch 07: the room from the back of the gallery, still and near symmetrical (a step left of the centre line, so her
    # head clears the presiding chair): empty benches, the bar's gates open on the aisle, Dawn small and alone in the
    # dock in the one pool of light, the empty bench and the blank panel beyond
    # (tilted ~1.5 deg down so the bright ceiling panels keep off the top edge)
    "wide": dict(loc=(-0.3, -7.85, 1.62), aim=(-0.05, 3.0, 0.8), lens=28, focus="fx_dock", fstop=8.0, beat="ch07"),
    # Ch 07: Dawn in the dock from behind three-quarter, her hands on the ledge, the bench and its empty chairs beyond
    "dock": dict(loc=(1.6, -1.05, 1.3), aim=(-0.15, 5.0, 1.92), lens=32, focus="fx_dawn", fstop=2.8, beat="ch07"),
    # Ch 07: from the well's left side at a standing eye height, the bench running away to the right: the cap's line on
    # the lower third, the three empty chairs whole above it, the recessed panel above the presiding one
    "bench": dict(loc=(-2.3, 0.6, 1.7), aim=(-0.45, 6.0, 2.05), lens=26, focus="fx_bench", fstop=5.6, beat="ch07",
                  exposure=-1.45),
}


def _panels(rows, level, keep=None):
    keep = keep or {}
    return {f"panel_{x:+.1f}_{y:+.1f}_light": keep.get((x, y), level) for x in st.PANEL_X for y in rows}


# per-camera light trims (multipliers on named lights; a panel's diffuser dims with its light)
TRIMS = {
    # the lit island: the well's panels low but for the centre pair over the dock, the bench rows down; the dock's own
    # downlight makes the pool
    # (the row behind her low too, so her dark back stands against the lit fascia, rimmed by the pool from above)
    "wide": {**_panels((-0.6,), 0.15), **_panels((1.4,), 0.2, {(0.0, 1.4): 0.9}), **_panels((3.4, 5.4), 0.6)},
    # the panels behind her turned down: her back goes toward silhouette against the lit bench
    "dock": {**_panels((-0.6,), 0.3), **_panels((1.4,), 0.5, {(0.0, 1.4): 1.0}), **_panels((3.4, 5.4), 0.8),
             "dock_pool": 0.6},
    # the well's panels behind the camera turned down: the fascia lit from the row above its face, bright under the
    # cap and falling away toward the floor; the chairs top-lit
    # the well's rows (3 and 5 m before it) light the fascia at a moderate angle (bright under the cap, falling away
    # toward the floor); the row straight over it down (its steep light put a shadow band under the cap and lit the
    # floor that bounced up onto the fascia's foot), the left well windows' beams halved for the same reason
    "bench": {**_panels((-0.6,), 0.6), **_panels((1.4,), 0.8), **_panels((3.4,), 0.2), "dock_pool": 0.15,
              "win_l3_day": 0.5, "win_l4_day": 0.5},
}

_STATE = {"cast": [], "base": {}}


# ---------------------------------------------------------------- Dawn
def ground(holder, floor=0.0):
    """Stand a figure on `floor`: shift it so its lowest point (the soles) sits there."""
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    lo = 1e9
    for o in [holder] + list(holder.children_recursive):
        if o.type != "MESH":
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = o.matrix_world
        lo = min([lo] + [(mw @ v.co).z for v in me.vertices])
        ev.to_mesh_clear()
    holder.location.z += floor - lo
    bpy.context.view_layer.update()
    return floor - lo


def body_points(holder, near=None, radius=0.12):
    """World points of the body mesh (evaluated), optionally only those within `radius` of `near`."""
    body = bpy.data.objects[holder["body"]]
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    mw = body.matrix_world
    pts = [mw @ v.co for v in me.vertices]
    ev.to_mesh_clear()
    if near is not None:
        pts = [p for p in pts if (p - near).length < radius]
    return pts


def _roll(rig, bone, deg):
    """Twist a pose bone about its own axis (armature space)."""
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


def solve_arm(holder, k, side, wrist, twist):
    """Two-bone IK on the FK arm: the elbow out, back and down; the forearm twisted by `twist` degrees; the hand
    pointing forward and a little down over the ledge."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    for n in ("upper_arm_fk", "forearm_fk", "hand_fk"):     # from rest each time: the twist must not accumulate
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
    left = (mw.to_3x3() @ Vector((1, 0, 0))).normalized()     # the character's left in the world
    back = (mw.to_3x3() @ Vector((0, 1, 0))).normalized()     # her back (she was built facing -Y)
    # the pole: behind and below the shoulder, only a touch outward, so the elbows drop and point back, not out
    pole = back * 0.25 + left * side * 0.05 + Vector((0, 0, -0.35))
    v = (pole - u * pole.dot(u)).normalized()
    ca = max(-1.0, min(1.0, (a * a + d * d - b * b) / (2 * a * d)))
    E = S + a * (u * ca + v * math.sqrt(1 - ca * ca))
    rigged._aim(rig, f"upper_arm_fk.{k}", inv @ (E - S))
    Ea = mw @ pb[f"forearm_fk.{k}"].head
    rigged._aim(rig, f"forearm_fk.{k}", inv @ (wrist - Ea))
    _roll(rig, f"forearm_fk.{k}", twist)
    fwd = -back
    hd = fwd * 0.97 + Vector((0, 0, HAND_PITCH)) - left * side * 0.14
    rigged._aim(rig, f"hand_fk.{k}", inv @ hd)


def hand_low(holder, k):
    """The underside of one hand: the lowest body point in a box round the hand bone (palm and fingers forward of
    the wrist; the forearm behind it rises, so it never wins)."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    mw = rig.matrix_world
    w0, w1 = mw @ pb[f"hand_fk.{k}"].head, mw @ pb[f"hand_fk.{k}"].tail
    pts = [p for p in body_points(holder) if abs(p.x - (w0.x + w1.x) / 2) < 0.075 and w0.y - 0.03 < p.y < w1.y + 0.12
           and st.DOCK_TOP - 0.15 < p.z < w0.z + 0.04]
    return min((p.z for p in pts), default=st.DOCK_TOP + 0.02)


def hands_on_ledge(holder):
    """Rest both palms on the dock's front ledge: solve each arm to a wrist target, pick the forearm twist that turns
    the palm down, then lower or raise the wrist until the hand's underside sits 2 mm above the wood."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    mw = rig.matrix_world
    top = st.DOCK_TOP
    y_w = st.LEDGE[0] + HAND_Y
    report = []
    for side, k in ((1, "L"), (-1, "R")):
        sx = (mw @ pb[f"upper_arm_fk.{k}"].head).x
        x = DAWN[0] + math.copysign(HAND_X, sx - DAWN[0])
        wrist = Vector((x, y_w, top + 0.045))
        best = None
        for twist in (side * 80.0, -side * 80.0, side * 40.0, -side * 40.0):
            solve_arm(holder, k, side, wrist, twist)
            pd = _palm_down(rig, k)
            if best is None or pd > best[0]:
                best = (pd, twist)
        twist = best[1]
        for it in range(5):
            solve_arm(holder, k, side, wrist, twist)
            gap = hand_low(holder, k) - (top + 0.002)
            if abs(gap) < 0.002:
                break
            wrist.z -= gap
        else:
            solve_arm(holder, k, side, wrist, twist)
            gap = hand_low(holder, k) - (top + 0.002)
        S = mw @ pb[f"upper_arm_fk.{k}"].head
        E = mw @ pb[f"forearm_fk.{k}"].head
        report.append(f"{k}: twist {twist:+.0f} palm-down {best[0]:+.2f} wrist ({wrist.x:+.3f}, {wrist.y:.3f}, "
                      f"{wrist.z:.3f}) underside gap {gap * 1000:+.1f} mm; elbow out of the shoulder "
                      f"{(abs(E.x - DAWN[0]) - abs(S.x - DAWN[0])) * 100:+.1f} cm, behind it {(S.y - E.y) * 100:+.1f} cm, "
                      f"below it {(S.z - E.z) * 100:.1f} cm")
    print("COURT hands " + "; ".join(report), flush=True)


def dress_prison(h):
    """people.dawn_prison() tints the casual suit flat dark grey (0.075) and MPFB's delete-group masks already hide the
    body under it (checked: Delete.female_casualsuit01 sits before the smoothing). It rendered pale all the same: a
    0.075 garment under the well's top light, through AgX, reads only ~0.6x the stone skin, and the shirt's satin
    shoulders caught the panels. Here it is re-surfaced in place as matt cotton a shade darker, with a weave."""
    out = []
    for o in h.children_recursive:
        if o.type == "MESH" and o.name.endswith("female_casualsuit01"):
            for slot in o.material_slots:
                if slot.material:
                    slot.material = slot.material.copy()
                    st.mt.refabric(slot.material, GARMENT)
                    out.append(slot.material.name)
    body = bpy.data.objects[h["body"]]
    masks = [m.name for m in body.modifiers if m.type == "MASK" and m.show_render]
    print(f"COURT prison clothes re-surfaced: {out}; body masks {masks}", flush=True)


def roll_shoulders(h, deg):
    """Roll both shoulders forward (the clavicle bones turned about the vertical so their tips come forward)."""
    rig = rigged.rig_of(h)
    for k, s in (("L", -1), ("R", 1)):
        n = f"shoulder.{k}"
        if n in rig.pose.bones:
            rigged._turn(rig, n, 0, s * deg)


def build_dawn(tries=3):
    """people.dawn_prison(), retried: cast._statue_eyes once failed (ZeroDivisionError, no eye-helper points near their
    median) in a shoot.py build that succeeded unchanged before and after; a failed attempt's objects are removed."""
    for k in range(tries):
        before = set(bpy.data.objects)
        try:
            return people.dawn_prison()
        except ZeroDivisionError as e:
            print(f"COURT dawn_prison failed ({e}); retrying ({k + 1}/{tries})", flush=True)
            for o in [o for o in bpy.data.objects if o not in before]:
                bpy.data.objects.remove(o, do_unlink=True)
            bpy.context.view_layer.update()
    raise RuntimeError("people.dawn_prison() kept failing")


def dawn():
    h = build_dawn()
    dress_prison(h)
    rigged.pose_figure(h, POSE)
    roll_shoulders(h, SHOULDER_ROLL)
    h.location = (DAWN[0], DAWN[1], 0.0)
    h.rotation_euler = (0, 0, math.radians(180.0))       # built facing -Y: turned to face the bench
    bpy.context.view_layer.update()
    dz = ground(h, st.DOCK_PLAT)
    print(f"COURT Dawn grounded on the dock floor by {dz * 1000:+.1f} mm", flush=True)
    suit = next(o for o in h.children_recursive if o.name.endswith("female_casualsuit01"))
    dg = bpy.context.evaluated_depsgraph_get()
    ev = suit.evaluated_get(dg)
    me = ev.to_mesh()
    pts = [suit.matrix_world @ v.co for v in me.vertices]
    ev.to_mesh_clear()
    front = max((p.y for p in pts if st.DOCK_TOP - 0.3 < p.z < st.DOCK_TOP + 0.08 and abs(p.x - DAWN[0]) < 0.16),
                default=0.0)
    print(f"COURT Dawn's front {(st.LEDGE[0] - front) * 100:.1f} cm from the ledge's inner face", flush=True)
    hands_on_ledge(h)
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
        cam.data.clip_start, cam.data.clip_end = 0.05, 200.0
    sc.cycles.sample_clamp_indirect = 6.0
    sc.cycles.blur_glossy = 0.5
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    trims = TRIMS.get(name, {})
    for n, ob in st.LIGHTS.items():
        base = _STATE["base"].setdefault(n, ob.data.energy)
        ob.data.energy = base * trims.get(n, 1.0)
    for n, m in st.LENS.items():                      # the diffuser's glow follows its light
        for node in m.node_tree.nodes:
            if node.type == "MAP_RANGE":
                key = (m.name, node.name)
                lo, hi = _STATE["base"].setdefault(key, (node.inputs["To Min"].default_value,
                                                         node.inputs["To Max"].default_value))
                node.inputs["To Min"].default_value = lo * trims.get(n, 1.0)
                node.inputs["To Max"].default_value = hi * trims.get(n, 1.0)
    _STATE["cam"] = name
    print(f"COURT camera {name or '?'}: beat {CAMERAS.get(name, {}).get('beat', '?')}, "
          f"{len(trims)} trims", flush=True)


def _render_pre(scene, *_):
    """setkit.render sets its own adaptive threshold (0.03) after the camera hook: tighten it here, at render start,
    so the dark walls get their samples (less denoiser mottle)."""
    scene.cycles.adaptive_threshold = 0.01
    scene.cycles.sample_clamp_indirect = 8.0
    print(f"COURT render: adaptive threshold {scene.cycles.adaptive_threshold}, clamp indirect "
          f"{scene.cycles.sample_clamp_indirect}, {scene.cycles.samples} spp", flush=True)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render
    hs = bpy.app.handlers.render_pre
    for f in [f for f in hs if getattr(f, "__name__", "") == "_render_pre"]:
        hs.remove(f)
    hs.append(_render_pre)


# ---------------------------------------------------------------- build
def build(cast=True):
    st.M.clear()
    st.mt.M.clear()
    st.LIGHTS.clear()
    st.LENS.clear()
    st.CEILING.clear()
    _STATE["base"].clear()
    st.materials()
    st.shell()
    st.back_wall()
    st.dais()
    st.bench()
    chair, mic = st.chairs_and_mics()
    st.desks(chair, mic)
    st.dock()
    st.dock_mic(mic, DAWN[0])
    st.bar()
    st.gallery()
    st.dressing(chair, mic)
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    _STATE["cast"] = []
    if cast:
        d = dawn()
        _STATE["cast"] = [d] + list(d.children_recursive)
    sk.haze((2 * st.XW - 0.05, st.Y1 - st.Y0 - 0.05, st.H - 0.05), (0, (st.Y0 + st.Y1) / 2, st.H / 2), HAZE)
    install_hook()
