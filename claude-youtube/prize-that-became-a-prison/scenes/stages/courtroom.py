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

DAWN = (0.0, st.DOCK[1] + 0.08)       # her feet, in the dock a step back from the front ledge, facing the bench (+Y)
HAND_X = 0.185                         # hands on the ledge, about shoulder width apart
HAND_PITCH = 0.3                       # the hand a little extended at the wrist, so the palm heel and the fingers both rest
POSE = {"head": (17, -2), "neck": (5, 0), "chest": (5, 0), "fingers": 8}

FOCUS = {
    "fx_dock": (0.0, st.DOCK[1], 1.25),
    "fx_dawn": (0.0, DAWN[1] + 0.05, 1.5),
    "fx_bench": (0.0, st.BENCH_Y, 1.3),
}

CAMERAS = {
    # Ch 07: the room from the back of the gallery, on the centre line, still: empty benches, the bar, Dawn small and
    # alone in the dock in the one pool of light, the empty bench and the blank panel beyond
    "wide": dict(loc=(0.0, -7.85, 1.62), aim=(0.0, 3.0, 1.32), lens=28, focus="fx_dock", fstop=8.0, beat="ch07"),
    # Ch 07: Dawn in the dock from behind three-quarter, her hands on the ledge, the bench and its empty chairs beyond
    "dock": dict(loc=(1.22, -1.05, 1.3), aim=(-0.75, 5.0, 1.92), lens=32, focus="fx_dawn", fstop=2.8, beat="ch07"),
    # Ch 07: low in the well, looking up at the bench: the cap's edge, the three empty chairs, the blank panel above
    "bench": dict(loc=(0.55, 1.5, 1.0), aim=(0.0, 5.6, 1.92), lens=26, focus="fx_bench", fstop=5.6, beat="ch07"),
}
# per-camera light trims (multipliers on named lights)
TRIMS = {
    "wide": {},
    "dock": {},
    "bench": {},
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
    pole = (left * side * 0.75 + back * 0.45 + Vector((0, 0, -0.35))).normalized()
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
    y_w = st.LEDGE[0] + 0.035
    report = []
    for side, k in ((1, "L"), (-1, "R")):
        sx = (mw @ pb[f"upper_arm_fk.{k}"].head).x
        x = math.copysign(HAND_X, sx) if abs(sx) > 1e-3 else side * HAND_X
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
        report.append(f"{k}: twist {twist:+.0f} palm-down {best[0]:+.2f} wrist ({wrist.x:+.3f}, {wrist.y:.3f}, "
                      f"{wrist.z:.3f}) underside gap {gap * 1000:+.1f} mm")
    print("COURT hands " + "; ".join(report), flush=True)


def dawn():
    h = people.dawn_prison()
    rigged.pose_figure(h, POSE)
    h.location = (DAWN[0], DAWN[1], 0.0)
    h.rotation_euler = (0, 0, math.radians(180.0))       # built facing -Y: turned to face the bench
    bpy.context.view_layer.update()
    dz = ground(h, st.DOCK_PLAT)
    print(f"COURT Dawn grounded on the dock floor by {dz * 1000:+.1f} mm", flush=True)
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
    print(f"COURT camera {name or '?'}: beat {CAMERAS.get(name, {}).get('beat', '?')}, trims {trims or 'none'}",
          flush=True)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


# ---------------------------------------------------------------- build
def build(cast=True):
    st.M.clear()
    st.mt.M.clear()
    st.LIGHTS.clear()
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
    st.dock_mic(mic)
    st.bar()
    st.gallery()
    st.dressing()
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    _STATE["cast"] = []
    if cast:
        d = dawn()
        _STATE["cast"] = [d] + list(d.children_recursive)
    sk.haze((2 * st.XW - 0.05, st.Y1 - st.Y0 - 0.05, st.H - 0.05), (0, (st.Y0 + st.Y1) / 2, st.H / 2), 0.0035)
    install_hook()
