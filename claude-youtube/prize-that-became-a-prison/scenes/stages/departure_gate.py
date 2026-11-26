"""Stage: the departure gate at night (Ch 02 end, Ch 03). Fluorescent Noir.

A holdroom on the departures level: rows of linked gate seats facing a tall curtain wall onto the apron a storey
below, where an airliner (no livery) waits nose-in at the jet bridge under floodlight masts, a second one taxis far
off and runway lights and the city sit on the horizon. The ceiling is off for the night but for one fitting directly
over Dawn's seat (with a spot that throws the pool: the lit island), one over the podium queue and a few far ones.
The gate podium's screens and the door sign glow and spill. Dawn sits alone at the aisle end of the front row with
her charcoal suitcase standing beside her: the ordinary calm before everything.

    <bpy python> -I scenes/shoot.py -- departure_gate <cam> out.png [--nocast]

The set is in departure_gate_set.py, its materials in departure_gate_mats.py, the beam seating (built in Python) in
departure_gate_seats.py, the airliners, the jet bridge and the flood masts in departure_gate_aircraft.py. Dawn is the
shared cast's people.dawn() (the dark umber blouse and skirt suit, black flats), as at the check-in hall the same
day; only her jacket front is relaxed and her bun set lower here. She is seated through Rigify: her legs
switch to FK, thighs turned in (knees about 0.18 m apart, feet parallel 0.12 m apart), and a small solve sets thigh and
shin angles so her seat rests on the pan and her soles on the carpet; then she slides back until her seat meets the
backrest (printed as GATE seated ...). Before each render a hook on setkit.render sets the camera's clip distance (the
sky and the horizon lie kilometres away), clamps indirect light, and applies the per-camera light trims.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import cast as castkit  # noqa: E402,F401
import people  # noqa: E402
import props  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import departure_gate_set as st  # noqa: E402
import departure_gate_seats as seatkit  # noqa: E402

EXPOSURE = -1.5

# Dawn: the aisle-end seat of the front row's right block (unit at x 0.2, seat at local x -0.9), facing the glass.
ROW_Y = st.ROWS[0]
SEAT = (st.UNITS[2] + st.SEAT_X[0], ROW_Y)
HIP_Y = -0.09                     # first guess for the hip joint (unit-local y); place_seated then slides her back
                                  # until her seat meets the backrest
SUITCASE = (SEAT[0] - 0.6, ROW_Y + 0.3, 96.0)   # in the aisle beside her, pocket toward the glass

FOCUS = {
    "fx_wide": (SEAT[0], ROW_Y + 0.2, 0.9),
    "fx_face": (SEAT[0] + 0.02, ROW_Y + 0.0, 1.16),
    "fx_dawn": (SEAT[0], ROW_Y + 0.2, 0.8),          # between her face and her knees: both inside the focus
    "fx_window": (SEAT[0], ROW_Y + 0.0, 1.1),
}


def _back_off(loc, aim, d):
    v = Vector(loc) - Vector(aim)
    return tuple(Vector(loc) + v.normalized() * d)


CAMERAS = {
    # Ch 02 end: the gate from the back corner, high: rows of empty seats in the dark, Dawn in the one pool of light
    # at the front, the glass wall with the waiting aircraft and the jet bridge, the podium glowing by the door
    "wide": dict(loc=(-4.95, -4.65, 2.6), aim=(1.2, 4.6, -0.05), lens=30, focus="fx_wide", fstop=8.0, beat="ch02",
                 exposure=-1.1),
    # Ch 03: controlled medium from the window side: Dawn under the one fitting, the suitcase, the empty rows soft
    # behind her (f/1.8)
    "seated": dict(loc=_back_off((1.35, 5.55, 0.95), (-0.95, 2.95, 0.58), 0.35), aim=(-1.13, 3.12, 0.56), lens=45,
                   focus="fx_dawn", fstop=1.8, beat="ch03", exposure=-1.25),
    # Ch 03: from the aisle behind her, low: Dawn and the seat backs against the glass and the floodlit aircraft
    "window": dict(loc=(-2.05, -1.35, 1.5), aim=(-0.35, 6.0, 0.86), lens=35, focus="fx_window", fstop=4.0, beat="ch03",
                   exposure=-1.15),
}
# per-camera light trims (multipliers on named lights)
KEY = "fx_{:+.1f}_{:+.1f}_light".format(*st.KEY_FX)
POOL = "fx_{:+.1f}_{:+.1f}_pool".format(*st.KEY_FX)
RIM = "dawn_rim"
DIMS = ["fx_{:+.1f}_{:+.1f}_light".format(*xy) for xy, lv in st.FX_LEVEL.items() if lv == st.DIM]
TRIMS = {
    # the one downlight over her row makes the island; the glass's spill is cut to a trace so the rows fall off
    "wide": {"window_spill": 0.3, RIM: 0.0, POOL: 1.5, **{n: 0.6 for n in DIMS},
             **{"fx_{:+.1f}_{:+.1f}_light".format(*xy): 1.3 for xy in st.BACK_FX}},
    # top light from the downlight over her seat is the key; the glass's spill would flatten her face; the night
    # fittings over the far rows a touch lower so the rows stay soft and dark behind her
    "seated": {"window_spill": 0.2, POOL: 0.3, KEY: 0.3, **{n: 0.6 for n in DIMS}},
    # from behind her: the fitting over the row turned down so she and the seats go dark against the glass
    "window": {"window_spill": 0.15, KEY: 0.15, POOL: 0.06, RIM: 0.0},
}
FLAGS = {"seated": ["flag_near_seats", "flag_pool"]}   # black flags (camera-invisible) used by one camera only

_STATE = {"cast": [], "base": {}}


# ---------------------------------------------------------------- people
def _parts(ob):
    """Loose parts of a mesh: [(vertex indices, min z, max z)] in world space."""
    me = ob.data
    adj = [[] for _ in me.vertices]
    for e in me.edges:
        a, b = e.vertices
        adj[a].append(b)
        adj[b].append(a)
    seen = [False] * len(me.vertices)
    mw = ob.matrix_world
    out = []
    for v0 in range(len(me.vertices)):
        if seen[v0]:
            continue
        comp, stack = [], [v0]
        seen[v0] = True
        while stack:
            v = stack.pop()
            comp.append(v)
            for w in adj[v]:
                if not seen[w]:
                    seen[w] = True
                    stack.append(w)
        zs = [(mw @ me.vertices[i].co).z for i in comp]
        out.append((set(comp), min(zs), max(zs)))
    return out


def dawn():
    """Dawn in 2014 from the shared cast (people.dawn(): the blouse and skirt suit in flat dark umber, black flats),
    so she matches the check-in hall the same day. Two stage-side touches, neither a change of wardrobe: the
    jacket's front is relaxed (a gentle Laplacian smooth on its rest shape, chest only) so it hangs off the bust
    instead of moulding it, and the bun sits a little lower and closer to the nape, so from behind the head reads as
    a head, not a cap."""
    h = people.dawn()
    suit = bpy.data.objects.get(f"{h.name}_female_elegantsuit01")
    n_drape = 0
    if suit is not None:
        me = suit.data
        zs = [v.co.z for v in me.vertices]
        top = max(zs)
        ys = [v.co.y for v in me.vertices if top - 0.45 < v.co.z < top - 0.12]
        ymid = (min(ys) + max(ys)) / 2 if ys else 0.0
        vg = suit.vertex_groups.new(name="drape")
        for v in me.vertices:
            dz = v.co.z - (top - 0.3)                 # the bust line, about 0.3 m under the collar
            if abs(dz) < 0.16 and v.co.y < ymid - 0.02:
                vg.add([v.index], max(0.0, 1.0 - (abs(dz) / 0.16) ** 2), "REPLACE")
                n_drape += 1
        ls = suit.modifiers.new("drape", "LAPLACIANSMOOTH")
        ls.vertex_group, ls.iterations, ls.lambda_factor, ls.lambda_border = "drape", 8, 0.7, 0.0
        ls.use_volume_preserve, ls.use_normalized = True, True
        suit.modifiers.move(suit.modifiers.find("drape"), 0)     # on the rest shape, before the armature
    bun = bpy.data.objects.get(f"{h['body']}_bun")
    if bun is not None:
        me = bun.data
        c = sum((v.co for v in me.vertices), Vector()) / len(me.vertices)
        for v in me.vertices:
            d = v.co - c
            v.co = c + Vector((d.x * 0.95, d.y * 0.78, d.z * 0.9)) + Vector((0.0, -0.008, -0.022))
        me.update()
    print(f"GATE wardrobe: people.dawn(), jacket front relaxed over {n_drape} vertices, bun "
          f"{'lowered' if bun is not None else 'not found'}", flush=True)
    return h


def lap_hands(holder, upper=(12, -6), fore=(64, 30), hand=(72, 40)):
    """Hands resting together in the lap: aim each arm segment (forward, inward degrees)."""
    rig = rigged.rig_of(holder)
    for side, k in ((1, "L"), (-1, "R")):
        for bone, (f, i) in (("upper_arm_fk", upper), ("forearm_fk", fore), ("hand_fk", hand)):
            rigged._aim(rig, f"{bone}.{k}", rigged._dir(0, f, side, -i))


KNEE_HALF, ANKLE_HALF = 0.088, 0.062      # knees about 0.18 m apart (centres), feet about 0.12 m apart


def sit_legs(holder, thigh, shin):
    """Legs to FK, thighs swung forward `thigh` degrees from hanging and turned in about Z so the knee centres sit
    KNEE_HALF either side of the middle; shins `shin` degrees forward and in, so the ankles sit ANKLE_HALF out; feet
    flat and parallel (their rest pitch, toes straight ahead)."""
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
        yaw = math.asin(max(-0.5, min(0.5, (abs(head.x - mid.x) - KNEE_HALF) / reach)))
        d = Matrix.Rotation(-side * yaw, 3, "Z") @ Matrix.Rotation(-math.radians(thigh), 3, "X") @ Vector((0, 0, -1))
        rigged._aim(rig, f"thigh_fk.{k}", d)
        sh, stl = mw @ pb[f"shin_fk.{k}"].head, mw @ pb[f"shin_fk.{k}"].tail
        ls = (stl - sh).length
        out = math.degrees(math.asin(max(-0.3, min(0.3, (ANKLE_HALF - abs(sh.x - mid.x)) / ls))))
        rigged._aim(rig, f"shin_fk.{k}", rigged._dir(0, shin, side, out))
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
    """Top of the seat pan under Dawn's seat bones (ray casts down onto the instanced seats, before she exists),
    checked against the shell's own profile."""
    dg = bpy.context.evaluated_depsgraph_get()
    zs = []
    for dx in (-0.08, 0.0, 0.08):
        for dy in (-0.14, -0.1, -0.06):
            hit, loc, *_ = bpy.context.scene.ray_cast(dg, Vector((x + dx, y0 + dy, 1.5)), Vector((0, 0, -1)))
            if hit and 0.3 < loc.z < 0.6:
                zs.append(loc.z)
    zs.sort()
    prof = seatkit.seat_top(-0.1)
    print(f"GATE seat pan hits {[round(z, 3) for z in zs]}, profile {prof:.3f}", flush=True)
    return zs[len(zs) // 2] if zs else prof


UPPER = {"head": (11, -10), "neck": (3, 0), "chest": (-12, 0), "fingers": 52}


def seat_figure(holder, seat_z):
    """Pose Dawn seated (built at the origin facing -Y) and solve thigh/shin so that her seat rests on the cushion
    and her soles on the floor. Returns the height the holder must sit at."""
    rig = rigged.rig_of(holder)
    body = bpy.data.objects[holder["body"]]
    thigh, shin = 82.0, 4.0
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
        dz = seat_z - 0.004 - butt                 # skin 4 mm into the steel: the trousers just touch it
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
    # hands: swing the forearms (and hands with them) until the clasped hands rest on the thighs
    fore = 64.0
    pb = rig.pose.bones
    for it in range(5):
        rigged.pose_figure(holder, UPPER)
        lap_hands(holder, fore=(fore, 30), hand=(fore + 8, 40))
        sit_legs(holder, thigh, shin)
        mw = rig.matrix_world
        hc = sum((mw @ ((pb[f"hand_fk.{k}"].head + pb[f"hand_fk.{k}"].tail) / 2) for k in "LR"), Vector()) / 2
        tops = []
        for k in "LR":
            a_, b_ = mw @ pb[f"thigh_fk.{k}"].head, mw @ pb[f"thigh_fk.{k}"].tail
            t = max(0.0, min(1.0, (hc.y - a_.y) / (b_.y - a_.y))) if abs(b_.y - a_.y) > 1e-6 else 0.5
            tops.append(a_.z + (b_.z - a_.z) * t + 0.085)
        gap = (hc.z - 0.022) - max(tops)
        print(f"GATE hands it {it}: forearm {fore:.1f} gap {gap * 1000:+.1f} mm", flush=True)
        if abs(gap) < 0.006:
            break
        fore = max(35.0, min(95.0, fore + math.degrees(-gap / 0.26)))
    return dz, hip


def back_y(z):
    """The backrest's front face (unit-local y) at height z."""
    pts = [(y, zz) for (y, zz) in seatkit.PROF if zz > 0.44]
    for (y0, z0), (y1, z1) in zip(pts, pts[1:]):
        if z0 <= z <= z1:
            return y0 + (y1 - y0) * (z - z0) / (z1 - z0)
    return pts[-1][0] if z > pts[-1][1] else pts[0][0]


def place_seated(holder, seat_xy, seat_z):
    dz, hip = seat_figure(holder, seat_z)
    # turn to face +Y (the glass) and put the hip joint over the pan
    holder.rotation_euler = (0, 0, math.radians(180))
    bpy.context.view_layer.update()
    rig = rigged.rig_of(holder)
    body = bpy.data.objects[holder["body"]]
    hip_w = sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2
    target = Vector((seat_xy[0], seat_xy[1] + HIP_Y, hip_w.z + dz))
    holder.location += target - hip_w
    bpy.context.view_layer.update()
    # slide her back until her seat meets the backrest (skin 12 mm off the steel: the trousers just touch it)
    sx, sy = seat_xy
    skin = body_points(holder, only=body, unmasked=True)
    low = [p for p in skin if seat_z + 0.03 < p.z < seat_z + 0.28 and abs(p.x - sx) < 0.2 and p.y < target.y + 0.05]
    gap = min(p.y - (sy + back_y(p.z)) for p in low)
    holder.location.y += 0.012 - gap
    bpy.context.view_layer.update()
    skin = body_points(holder, only=body, unmasked=True)
    hip_w = sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2
    up = [p for p in skin if seat_z + 0.3 < p.z < seat_z + 0.43 and abs(p.x - sx) < 0.2 and p.y < hip_w.y]
    upper = min((p.y - (sy + back_y(p.z)) for p in up), default=9.9)
    pan = [p for p in skin if seat_z - 0.05 < p.z < seat_z + 0.1 and abs(p.x - sx) < 0.2 and -0.19 < p.y - sy < 0.17]
    clear = min((p.z - seatkit.seat_top(p.y - sy) for p in pan), default=9.9)
    pts = body_points(holder)
    lo = min(p.z for p in pts)
    pb = rig.pose.bones
    mw = rig.matrix_world
    knees = (mw @ pb["shin_fk.L"].head - mw @ pb["shin_fk.R"].head).length
    ankles = (mw @ pb["foot_fk.L"].head - mw @ pb["foot_fk.R"].head).length
    print(f"GATE seated Dawn: hip at ({hip_w.x:.3f}, {hip_w.y:.3f}, {hip_w.z:.3f}) (unit-local y {hip_w.y - sy:+.3f}), "
          f"seat to backrest {gap * 1000:+.0f} -> 12 mm, upper back to backrest {upper * 1000:+.0f} mm, "
          f"thighs over the pan {clear * 1000:+.1f} mm, knees {knees:.3f} m apart, ankles {ankles:.3f} m, "
          f"lowest point {lo * 1000:+.1f} mm", flush=True)


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
    sc = bpy.context.scene
    sc.cycles.sample_clamp_indirect = 4.0      # the haze and the dark pan ceiling threw white speckle
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    trims = TRIMS.get(name, {})
    for n, ob in st.LIGHTS.items():
        base = _STATE["base"].setdefault(n, ob.data.energy)
        ob.data.energy = base * trims.get(n, 1.0)
    for cam, names in FLAGS.items():
        for n in names:
            ob = bpy.data.objects.get(n)
            if ob is not None:
                ob.hide_render = cam != name
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
    st.mt.M.clear()       # a fresh scene: never reuse materials cached from an earlier build
    st.LIGHTS.clear()
    _STATE["base"].clear()
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
    st.area("window_spill", ((st.XL + st.XR) / 2, st.WIN - 0.25, 1.9), (st.XR - st.XL - 1.0, 3.4), 60.0,
            (0.55, 0.68, 1.0), spread=110, rot=(-math.pi / 2, 0, 0))
    # a faint cool rim from behind her left shoulder (seated camera only): her back edge against the dark rows
    rim = st.area(RIM, (SEAT[0] - 1.5, ROW_Y - 1.3, 2.2), (0.6, 0.6), 36.0, (0.62, 0.74, 1.0), spread=120)
    rim.rotation_euler = (Vector((SEAT[0], ROW_Y + 0.05, 1.05)) - rim.location).to_track_quat("-Z", "Y").to_euler()
    suitcase()
    # a black flag beside the fitting over her row (seen by no camera, used by the seated one): the empty seats
    # nearest the lens fall off into shadow instead of reading as a bright cut slab at the frame edge
    flag = st.box("flag_near_seats", (0.012, 1.3, 1.1), (SEAT[0] + 0.85, ROW_Y + 0.15, st.H - 0.6),
                  st.M.setdefault("flag", sk.mat("flag black", (0.0, 0.0, 0.0), 1.0)))
    # and a second right beside the downlight, so its cone stops at the seat beside hers
    flag2 = st.box("flag_pool", (0.012, 0.9, 0.7), (SEAT[0] + 0.2, ROW_Y + 0.05, st.H - 0.38), st.M["flag"])
    for f in (flag, flag2):
        f.visible_camera = f.visible_glossy = f.visible_transmission = False
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
            0.003)
    install_hook()
