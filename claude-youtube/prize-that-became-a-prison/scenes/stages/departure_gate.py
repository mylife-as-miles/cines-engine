"""Stage: the departure gate at night (Ch 02 end, Ch 03). Fluorescent Noir.

A holdroom on the departures level: rows of linked gate seats facing a tall curtain wall onto the apron a storey
below, where an airliner (no livery) waits nose-in at the jet bridge under floodlight masts, a second one taxis far
off and runway lights and the city sit on the horizon. Most of the ceiling fittings are dimmed for the night; one
burns over the front row. The gate podium glows by the jet bridge door. Dawn sits alone at the aisle end of the
front row with her charcoal suitcase standing beside her: the ordinary calm before everything.

    <bpy python> -I scenes/shoot.py -- departure_gate <cam> out.png [--nocast]

The set is in departure_gate_set.py, its materials in departure_gate_mats.py. Dawn is seated through Rigify: her legs
switch to FK, thighs and shins are aimed, and a small solve sets thigh and shin angles so her seat rests on the seat
cushion and her soles on the carpet (printed as GATE seated ...). Before each render a hook on setkit.render sets the
camera's clip distance (the sky and the horizon lie kilometres away) and any per-camera light trims.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import cast as castkit  # noqa: E402
import props  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import departure_gate_set as st  # noqa: E402

EXPOSURE = -1.5

# Dawn: the aisle-end seat of the front row's right block (unit at x 0.2, seat at local x -0.9), facing the glass.
ROW_Y = st.ROWS[0]
SEAT = (st.UNITS[2] + st.SEAT_X[0], ROW_Y)
HIP_Y = 0.22                      # hip joint, unit-local y (the backrest's face is near 0.07 at cushion height)
SUITCASE = (SEAT[0] - 0.62, ROW_Y + 0.36, 96.0)   # in the aisle beside her, pocket toward the glass

FOCUS = {
    "fx_wide": (SEAT[0], ROW_Y + 0.2, 0.9),
    "fx_face": (SEAT[0] + 0.02, ROW_Y + 0.13, 1.16),
    "fx_window": (SEAT[0], ROW_Y + 0.15, 1.1),
}
CAMERAS = {
    # Ch 02 end: the gate from the back corner, high: rows of empty seats, Dawn small at the front, the glass wall
    # with the waiting aircraft and the jet bridge, the podium glowing by the door
    "wide": dict(loc=(-6.6, -7.1, 3.15), aim=(1.2, 4.6, 0.55), lens=22, focus="fx_wide", fstop=8.0, beat="ch02"),
    # Ch 03: controlled medium from the window side: Dawn and the suitcase, the empty rows behind her soft
    "seated": dict(loc=(0.95, 5.25, 1.12), aim=(-0.92, 2.95, 0.82), lens=55, focus="fx_face", fstop=2.8, beat="ch03"),
    # Ch 03: from the aisle behind her, low: Dawn and the seat backs against the glass and the apron lights
    "window": dict(loc=(-2.05, -1.35, 1.3), aim=(-0.35, 6.0, 0.98), lens=35, focus="fx_window", fstop=4.0, beat="ch03"),
}
# per-camera light trims (multipliers on named lights)
TRIMS = {
    "window": {"window_spill": 0.35},
}

_STATE = {"cast": [], "base": {}}


# ---------------------------------------------------------------- people
def dawn():
    h = castkit.person("Dawn", gender=0.0, height_cm=168, age=0.45, hair="bun")
    castkit.dress(h, ["female_elegantsuit01", "shoes05"], tint={"female_elegantsuit01": (0.62, 0.56, 0.5), "shoes05": (0.12, 0.11, 0.1)})
    return h


def lap_hands(holder, upper=(16, -4), fore=(62, 34), hand=(70, 44)):
    """Hands resting together in the lap: aim each arm segment (forward, inward degrees)."""
    rig = rigged.rig_of(holder)
    for side, k in ((1, "L"), (-1, "R")):
        for bone, (f, i) in (("upper_arm_fk", upper), ("forearm_fk", fore), ("hand_fk", hand)):
            rigged._aim(rig, f"{bone}.{k}", rigged._dir(0, f, side, -i))


def sit_legs(holder, thigh, shin, knees=2.0):
    """Legs to FK, thighs swung forward `thigh` degrees from hanging, shins `shin` degrees forward, feet kept at their
    rest angle (flat on the floor)."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    for k in "LR":
        p = pb.get(f"thigh_parent.{k}")
        if p is not None and "IK_FK" in p.keys():
            p["IK_FK"] = 1.0
    bpy.context.view_layer.update()
    rest = {k: (pb[f"foot_fk.{k}"].matrix.to_3x3() @ Vector((0, 1, 0))).normalized() for k in "LR"}
    for side, k in ((1, "L"), (-1, "R")):
        rigged._aim(rig, f"thigh_fk.{k}", rigged._dir(0, thigh, side, knees))
        rigged._aim(rig, f"shin_fk.{k}", rigged._dir(0, shin, side, knees * 0.4))
        rigged._aim(rig, f"foot_fk.{k}", rest[k])


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


def seat_height(x, y0):
    """Top of the seat cushion under Dawn (ray casts down onto the instanced seats, before she exists)."""
    dg = bpy.context.evaluated_depsgraph_get()
    zs = []
    for dx in (-0.08, 0.0, 0.08):
        for dy in (0.1, 0.18, 0.26):
            hit, loc, *_ = bpy.context.scene.ray_cast(dg, Vector((x + dx, y0 + dy, 1.5)), Vector((0, 0, -1)))
            if hit and 0.3 < loc.z < 0.6:
                zs.append(loc.z)
    zs.sort()
    print(f"GATE seat cushion hits {[round(z, 3) for z in zs]}", flush=True)
    return zs[len(zs) // 2] if zs else 0.44


UPPER = {"head": (6, -10), "neck": (2, 0), "chest": (-5, 0), "fingers": 34}


def seat_figure(holder, seat_z):
    """Pose Dawn seated (built at the origin facing -Y) and solve thigh/shin so that her seat rests on the cushion
    and her soles on the floor. Returns the height the holder must sit at."""
    rig = rigged.rig_of(holder)
    body = bpy.data.objects[holder["body"]]
    thigh, shin = 88.0, 4.0
    dz = 0.0
    for it in range(8):
        rigged.pose_figure(holder, UPPER)
        lap_hands(holder)
        sit_legs(holder, thigh, shin)
        hip = sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2
        skin = body_points(holder, only=body, unmasked=True)
        seat_pts = [p for p in skin if hip.y - 0.12 < p.y < hip.y + 0.25 and 0.035 < abs(p.x - hip.x) < 0.2 and p.z < hip.z]
        sole_pts = [p for p in body_points(holder) if p.y < hip.y - 0.3]
        butt = min(p.z for p in seat_pts)
        sole = min(p.z for p in sole_pts)
        dz = seat_z - 0.012 - butt
        gap = sole + dz
        print(f"GATE seated it {it}: thigh {thigh:.1f} shin {shin:.1f} hip z {hip.z + dz:.3f} seat {butt + dz:.3f} "
              f"soles {gap * 1000:+.1f} mm", flush=True)
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
    return dz, hip


def place_seated(holder, seat_xy, seat_z):
    dz, hip = seat_figure(holder, seat_z)
    # turn to face +Y (the glass) and put the hip joint over the cushion
    holder.rotation_euler = (0, 0, math.radians(180))
    bpy.context.view_layer.update()
    rig = rigged.rig_of(holder)
    hip_w = sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2
    target = Vector((seat_xy[0], seat_xy[1] + HIP_Y, hip_w.z + dz))
    holder.location += target - hip_w
    bpy.context.view_layer.update()
    # report: soles and seat after placement
    pts = body_points(holder)
    lo = min(p.z for p in pts)
    print(f"GATE seated Dawn: hip at ({target.x:.3f}, {target.y:.3f}, {target.z:.3f}), lowest point {lo * 1000:+.1f} mm",
          flush=True)


def suitcase():
    x, y, t = SUITCASE
    return props.load("dawn-suitcase", size=0.66, axis="z", loc=(x, y, 0.0), turn_deg=t, sat=0.6)


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
    cam = bpy.context.scene.camera
    if cam is not None:
        cam.data.clip_start, cam.data.clip_end = 0.05, 8000.0
    trims = TRIMS.get(name, {})
    for n, ob in st.LIGHTS.items():
        base = _STATE["base"].setdefault(n, ob.data.energy)
        ob.data.energy = base * trims.get(n, 1.0)
    print(f"GATE camera {name or '?'}: beat {CAMERAS.get(name, {}).get('beat', '?')}, trims {trims or 'none'}", flush=True)


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
    st.LIGHTS.clear()
    st.materials()
    st.floor()
    st.ceiling()
    st.curtain_wall()
    st.door_section()
    st.walls()
    st.columns()
    st.podium()
    st.seats()
    st.dressing()
    st.exterior()
    # the apron's glow and the night sky through the glass: a soft cool spill onto the front rows
    st.area("window_spill", ((st.XL + st.XR) / 2, st.WIN - 0.25, 1.9), (st.XR - st.XL - 1.0, 3.4), 90.0,
            (0.55, 0.68, 1.0), spread=110, rot=(-math.pi / 2, 0, 0))
    suitcase()
    seat_z = seat_height(SEAT[0], ROW_Y)
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    _STATE["cast"] = []
    if cast:
        d = dawn()
        place_seated(d, SEAT, seat_z)
        _STATE["cast"] = [d] + list(d.children_recursive)
    sk.haze((st.XR - st.XL - 0.1, st.WIN - st.BACK - 0.1, st.H - 0.05), ((st.XL + st.XR) / 2, (st.WIN + st.BACK) / 2, st.H / 2),
            0.0028)
    install_hook()
