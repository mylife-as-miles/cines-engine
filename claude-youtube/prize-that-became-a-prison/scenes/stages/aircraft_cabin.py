"""Stage: the night flight to Hong Kong, 2014 (Ch 02 end / Ch 03). Fluorescent Noir.

A generic wide-body economy cabin at night, built in Python (aircraft_cabin_set.py, materials in
aircraft_cabin_mats.py): 3-3-3 rows of seats with headrests under cloth covers, tray tables and dark or blank-glowing
seat-back screens, belts left crossed on the empty cushions; side and centre overhead bins;
the curved sidewall with oval windows, most shades pulled down for the night; the blue night coves on the aisle
ceilings, a thin wash down the sidewalls and the path lights along the aisles; the galley curtains glowing at the far
end. Every reading light is off but one: Dawn's, over the port window seat in row 5, the one pool in the dark.
Outside her window the sky at altitude, a faint horizon far below, the port wing reaching out to its red tip light.

Dawn is the shared cast's people.dawn() (as at the gate the same night), seated through Rigify with the gate's
method (legs to FK, a small solve for thigh and shin so her seat sinks a little into the cushion and her soles rest on
the carpet, then slid back to the backrest), leaning back into the seat, hands resting in her lap, head turned to the
window. A few still passengers (people.man / people.staff) sit asleep in the other blocks; most seats are empty.

    <bpy python> -I scenes/shoot.py -- aircraft_cabin <cam> out.png [--nocast]

A hook on setkit.render sets the camera clip (the sky dome is 2.5 km away), clamps indirect light and applies the
per-camera trims before each render. With CABIN_EXR=<dir> in the environment it also saves the render's light groups
(key, window, coves, wash, path, screens, galley, exterior) as a multilayer EXR there, for balancing the lights.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
import bmesh  # noqa: E402,F401
from mathutils import Matrix, Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402

import people  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import aircraft_cabin_mats as mt  # noqa: E402
import aircraft_cabin_set as st  # noqa: E402

EXPOSURE = -1.5

DAWN_ROW = 5
DAWN_SEAT = (st.BLOCK_X[0] + st.SEAT_DX[0], st.row_y(DAWN_ROW))      # port window seat (x -2.47)
HEAD = Vector((-2.478, 3.993, 1.257))                                # her head's centre once seated (printed at build)
EYES = Vector((-2.502, 4.065, 1.228))
DAWN_WINDOW_Y = st.row_y(DAWN_ROW) + 0.14                            # her window: beside and a little ahead of her face
SINK = 0.045                                                         # how far a sitter sinks into the cushion

# passengers: (name, kind, row, block, seat, upper-body pose, lean back, build kwargs)
PAX = [
    ("Pax1", "man", DAWN_ROW + 2, 1, 0, {"head": (20, -14), "neck": (9, -6), "chest": (-2, 0), "fingers": 22}, 12.0,
     dict(height_cm=176, age=0.62, weight=0.66, suit="male_casualsuit05", tone=(0.10, 0.104, 0.11))),
    ("Pax2", "staff", DAWN_ROW + 5, 1, 1, {"head": (15, 16), "neck": (8, 8), "chest": (-2, 0), "fingers": 20}, 12.0,
     dict(variant=1)),
    ("Pax3", "man", DAWN_ROW + 4, 0, 2, {"head": (17, 12), "neck": (8, 6), "chest": (-3, 0), "fingers": 20}, 13.0,
     dict(height_cm=183, age=0.34, weight=0.5, suit="male_casualsuit01", tone=(0.07, 0.074, 0.084))),
    ("Pax4", "staff", DAWN_ROW + 3, 1, 2, {"head": (12, 5), "neck": (5, 0), "chest": (-2, 0), "fingers": 18}, 11.0,
     dict(variant=0)),
]
# blank-glowing seat-back screens: (row, block, seat, strength) -- the screen faces the seat behind it
LIT = [(DAWN_ROW + 3, 1, 0, 1.0), (DAWN_ROW + 5, 0, 2, 0.8), (DAWN_ROW + 8, 1, 1, 0.9), (DAWN_ROW + 10, 0, 1, 0.7),
       (DAWN_ROW + 6, 2, 0, 0.6), (DAWN_ROW + 11, 2, 1, 0.6)]


def _toward(loc, az_deg, el_deg, dist):
    """A point `dist` from loc, az degrees forward (+Y) of straight out to port (-X), el degrees above level."""
    a, e = math.radians(az_deg), math.radians(el_deg)
    return (loc[0] - dist * math.cos(a) * math.cos(e), loc[1] + dist * math.sin(a) * math.cos(e),
            loc[2] + dist * math.sin(e))


AISLE_CAM = (-1.04, 1.70, 1.56)
WINDOW_CAM = (-1.10, 4.42, 1.24)
OVER_CAM = (-2.14, 3.40, 1.37)
FOCUS = {
    "fx_aisle": tuple(HEAD),
    "fx_face": tuple(EYES),
    "fx_over": _toward(OVER_CAM, 38.0, -5.0, 3.0),
}

CAMERAS = {
    # Ch 02 end / Ch 03: standing in the port aisle two rows behind her: rows of seat backs receding to the lit galley
    # curtains, the blue night coves and the path lights, and at the left Dawn's reading light, the one pool
    "aisle": dict(loc=AISLE_CAM, aim=(AISLE_CAM[0] - 2.42, AISLE_CAM[1] + 9.70, 0.70), lens=24, focus="fx_aisle",
                  fstop=4.0, beat="ch02-03"),
    # Ch 03: from the aisle across the two empty seats of her row: Dawn in profile against the oval window, awake,
    # hands in her lap
    "window": dict(loc=WINDOW_CAM, aim=(HEAD.x, HEAD.y + 0.04, 0.985), lens=30, focus="fx_face", fstop=2.8,
                   beat="ch03"),
    # Ch 03: over her right shoulder, out of the window: the wing reaching to its red tip light, the horizon and the
    # dark below
    "over": dict(loc=OVER_CAM, aim=_toward(OVER_CAM, 46.0, -7.0, 1.2), lens=40, focus="fx_over", fstop=8.0,
                 beat="ch03"),
}
TIP_THROUGH = _toward(OVER_CAM, 37.0, -6.0, 1.077 / math.cos(math.radians(6.0)))   # where on her window's pane the
#                                                  wing-tip light shows from "over": 37 deg forward, 6 deg below level
# per-camera trims: light name (or group prefix) -> factor; "haze": the lamp's haze on or off
TRIMS = {
    "aisle": {"haze": 1.0},
    "window": {"haze": 0.0},
    "over": {"haze": 0.0},
}
READ = "reading_light"
_STATE = {"base": {}}
GROUPS = ("key", "spill", "win", "cove", "wash", "path", "screen", "galley", "ext")


# ---------------------------------------------------------------- shades (0 open, 1 closed)
def shade_plan(ys):
    """Most shades down for the night; Dawn's open, a few others half or open, far apart."""
    plan = {}
    dk = min(range(len(ys)), key=lambda k: abs(ys[k] - DAWN_WINDOW_Y))
    for side in (-1, 1):
        for k in range(len(ys)):
            h = (k * 7 + (3 if side > 0 else 0)) % 11
            plan[(side, k)] = 0.0 if h == 4 else 0.55 if h in (1, 8) else 1.0
    plan[(-1, dk)] = 0.0
    plan[(-1, dk - 1)] = 1.0
    plan[(-1, dk + 1)] = 0.72
    plan[(-1, dk + 2)] = 1.0
    return plan, dk


# ---------------------------------------------------------------- people (seating adapted from departure_gate.py)
def garment(holder):
    for o in holder.children_recursive:
        if o.type == "MESH" and o.name.startswith(holder.name + "_") and "suit" in o.name:
            return o
    return None


def dawn():
    """people.dawn() with the gate's two seated touches: the jacket front relaxed off the bust (Laplacian smooth on
    the rest shape), ease added over the seated thighs and the cuffs, and the bun set lower and closer to the nape."""
    h = people.dawn()
    suit = bpy.data.objects.get(f"{h.name}_female_elegantsuit01")
    if suit is not None:
        me = suit.data
        zs = [v.co.z for v in me.vertices]
        top = max(zs)
        ys = [v.co.y for v in me.vertices if top - 0.45 < v.co.z < top - 0.12]
        ymid = (min(ys) + max(ys)) / 2 if ys else 0.0
        vg = suit.vertex_groups.new(name="drape")
        for v in me.vertices:
            dz = v.co.z - (top - 0.3)
            if abs(dz) < 0.16 and v.co.y < ymid - 0.02:
                vg.add([v.index], max(0.0, 1.0 - (abs(dz) / 0.16) ** 2), "REPLACE")
        ls = suit.modifiers.new("drape", "LAPLACIANSMOOTH")
        ls.vertex_group, ls.iterations, ls.lambda_factor, ls.lambda_border = "drape", 8, 0.7, 0.0
        ls.use_volume_preserve, ls.use_normalized = True, True
        suit.modifiers.move(suit.modifiers.find("drape"), 0)
        ease_seated(suit)
    bun = bpy.data.objects.get(f"{h['body']}_bun")
    if bun is not None:
        me = bun.data
        c = sum((v.co for v in me.vertices), Vector()) / len(me.vertices)
        for v in me.vertices:
            d = v.co - c
            v.co = c + Vector((d.x * 0.72, d.y * 0.63, d.z * 0.68)) + Vector((0.0, -0.015, -0.041))
        me.update()
    return h


def ease_seated(suit, strength=0.013):
    me = suit.data
    ease = suit.vertex_groups.new(name="seated ease")
    deform = {g.index: g.name for g in suit.vertex_groups if g.name.startswith("DEF-")}
    for v in me.vertices:
        cuff = sum(w.weight for w in v.groups if deform.get(w.group, "").startswith("DEF-forearm.")
                   and deform[w.group].endswith(".001"))
        thigh = sum(w.weight for w in v.groups if deform.get(w.group, "").startswith("DEF-thigh"))
        weight = min(1.0, 0.58 * cuff + thigh)
        if weight > 0.0:
            ease.add([v.index], weight, "REPLACE")
    loosen = suit.modifiers.new("ease for the seated pose", "DISPLACE")
    loosen.vertex_group, loosen.strength, loosen.mid_level = ease.name, strength, 0.0


def lap_hands(holder, forearms=(67.0, 64.0), spread=0.0):
    """Rest the palms on the thighs, the left hand turned toward the right wrist (the gate's lap pose)."""
    rig = rigged.rig_of(holder)
    for side, k, angle in ((1, "L", forearms[0]), (-1, "R", forearms[1])):
        left = k == "L"
        rigged._aim(rig, f"upper_arm_fk.{k}", rigged._dir(0, 12, side, 6 + spread))
        rigged._aim(rig, f"forearm_fk.{k}", rigged._dir(0, angle, side, (-31 if left else -21) + spread))
        wrist = rig.pose.bones[f"hand_fk.{k}"]
        forward = rigged._dir(0, 81 if left else 87, side, -40 if left else -17).normalized()
        down = Vector((0.32 if left else -0.12, 0.0, -1.0))
        normal = (down - forward * down.dot(forward)).normalized()
        x = normal * side
        basis = Matrix((x, forward, x.cross(forward))).transposed().to_4x4()
        basis.translation = wrist.matrix.translation.copy()
        wrist.matrix = basis
        bpy.context.view_layer.update()


def lap_surface(holder):
    suit = garment(holder)
    evaluated = suit.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.data
    leg_groups = {g.index for g in suit.vertex_groups if g.name.startswith(("DEF-thigh", "DEF-pelvis"))}
    legs = {v.index for v in mesh.vertices if sum(w.weight for w in v.groups if w.group in leg_groups) > 0.45}
    faces = [tuple(p.vertices) for p in mesh.polygons if all(i in legs for i in p.vertices)]
    return BVHTree.FromPolygons([evaluated.matrix_world @ v.co for v in mesh.vertices], faces)


def finger_gap(body, surface, side):
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    fingers = {g.index for g in body.vertex_groups if g.name.startswith(("DEF-f_", "DEF-thumb", "DEF-palm"))
               and g.name.endswith("." + side)}
    gaps = []
    for v in evaluated.data.vertices:
        if sum(w.weight for w in v.groups if w.group in fingers) < 0.55:
            continue
        p = evaluated.matrix_world @ v.co
        hit, _, _, _ = surface.ray_cast(p + Vector((0, 0, 0.25)), Vector((0, 0, -1)), 0.6)
        if hit is not None:
            gaps.append(p.z - hit.z)
    if not gaps:
        return None
    gaps.sort()
    return gaps[len(gaps) // 40]


KNEE_HALF, ANKLE_HALF = 0.088, 0.062


def foot_rest(holder):
    """Legs to FK; the feet's rest directions (before any lean), so the soles stay flat on the carpet."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    for k in "LR":
        p = pb.get(f"thigh_parent.{k}")
        if p is not None and "IK_FK" in p.keys():
            p["IK_FK"] = 1.0
    bpy.context.view_layer.update()
    rest = {}
    for k in "LR":
        f = (pb[f"foot_fk.{k}"].matrix.to_3x3() @ Vector((0, 1, 0)))
        f.x = 0.0
        rest[k] = f.normalized()
    return rest


def sit_legs(holder, thigh, shin, rest, knee_half=KNEE_HALF, ankle_half=ANKLE_HALF):
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    for k in "LR":
        p = pb.get(f"thigh_parent.{k}")
        if p is not None and "IK_FK" in p.keys():
            p["IK_FK"] = 1.0
    bpy.context.view_layer.update()
    mw = rig.matrix_world
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


def seat_figure(holder, seat_z, upper, lean=0.0, hands=True, fit_hands=True):
    """Pose a figure seated (built at the origin facing -Y), the whole trunk leaning back `lean` degrees about the
    hips, and solve thigh/shin so that the seat sinks SINK into the cushion and the soles rest on the floor.
    Returns the height offset."""
    rig = rigged.rig_of(holder)
    body = bpy.data.objects[holder["body"]]
    thigh, shin = 80.0, 6.0
    dz = 0.0
    tag = holder.name
    rigged.pose_figure(holder, upper)
    rest = foot_rest(holder)

    def pose(forearms=None):
        rigged.pose_figure(holder, upper)
        if lean:
            rigged._turn(rig, "torso", -lean, 0.0)
        if hands:
            lap_hands(holder, forearms) if forearms else lap_hands(holder)
        sit_legs(holder, thigh, shin, rest)

    for it in range(8):
        pose()
        hip = sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2
        skin = body_points(holder, only=body, unmasked=True)
        seat_pts = [p for p in skin if hip.y - 0.12 < p.y < hip.y + 0.25 and 0.035 < abs(p.x - hip.x) < 0.2
                    and p.z < hip.z]
        sole_pts = [p for p in body_points(holder) if p.y < hip.y - 0.3]
        butt = min(p.z for p in seat_pts)
        sole = min(p.z for p in sole_pts)
        dz = seat_z - SINK - butt           # the cushion gives under the seat
        gap = sole + dz
        print(f"CABIN {tag} seated it {it}: thigh {thigh:.1f} shin {shin:.1f} soles {gap * 1000:+.1f} mm", flush=True)
        if abs(gap) < 0.005:
            break
        c = math.cos(math.radians(shin)) + gap / 0.42
        if gap > 0:
            if c < 1.0:
                shin = math.degrees(math.acos(c))
            else:
                shin = 0.0
                thigh -= math.degrees((c - 1.0) * 0.42 / 0.43)
        else:
            if c > math.cos(math.radians(32)):
                shin = math.degrees(math.acos(c))
            else:
                thigh += math.degrees(-gap / 0.43)
    if hands and fit_hands:
        surface = lap_surface(holder)
        forearms = [48.0, 43.0]
        for it in range(6):
            pose(forearms)
            gaps = [finger_gap(body, surface, side) for side in ("L", "R")]
            if None in gaps:
                print(f"CABIN {tag} hands: no lap under a hand", flush=True)
                break
            print(f"CABIN {tag} hand clearance {it}: L {gaps[0] * 1000:.1f}, R {gaps[1] * 1000:.1f} mm", flush=True)
            if max(abs(g - 0.002) for g in gaps) < 0.0025:
                break
            forearms = [max(30.0, min(95.0, a + math.degrees((0.002 - g) / 0.23))) for a, g in zip(forearms, gaps)]
    return dz


def back_y(z):
    """The backrest's front (block-local y) at height z: cushion, lumbar roll, headrest cover."""
    sr, cr = math.sin(st.RECLINE), math.cos(st.RECLINE)
    v = (z - st.PIVOT_Z) / cr
    w = -0.09 if 0.10 < v < 0.24 else -0.093 if v > 0.5 + st.DV else -0.072
    v = (z - st.PIVOT_Z + w * sr) / cr
    return -v * sr - w * cr


def place_seated(holder, seat_xy, upper, lean=0.0, hands=True, fit_hands=True):
    sx, sy = seat_xy
    seat_z = st.cushion_top(0.16)
    dz = seat_figure(holder, seat_z, upper, lean, hands, fit_hands)
    holder.rotation_euler = (0, 0, math.radians(180))
    bpy.context.view_layer.update()
    rig = rigged.rig_of(holder)
    hip_w = sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2
    target = Vector((sx, sy + 0.17, hip_w.z + dz))
    holder.location += target - hip_w
    bpy.context.view_layer.update()
    # slide back until the clothes meet the backrest somewhere (the seat's foot or the shoulders)
    top = st.PIVOT_Z + (0.72 + st.DV) * math.cos(st.RECLINE)
    pts = [p for p in body_points(holder) if abs(p.x - sx) < 0.21 and seat_z + 0.05 < p.z < top]
    low = min(p.y - (sy + back_y(p.z)) for p in pts if p.z < seat_z + 0.28)
    high = min(p.y - (sy + back_y(p.z)) for p in pts if p.z >= seat_z + 0.28)
    gap = min(low, high)
    holder.location.y += -0.006 - gap           # 6 mm into the cushion: it gives
    bpy.context.view_layer.update()
    lo = min(p.z for p in body_points(holder))
    print(f"CABIN {holder.name} seated at ({sx:.2f}, {sy:.2f}): to the backrest low {low * 1000:+.0f} mm, shoulders "
          f"{high * 1000:+.0f} mm (slid {(-0.006 - gap) * 1000:+.0f}), lowest point {lo * 1000:+.1f} mm", flush=True)


def head_points(holder):
    """Head centre, and the body's foremost point at face height (the nose), in the world."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones["head"]
    c = rig.matrix_world @ ((pb.head + pb.tail) / 2)
    fwd = (rig.matrix_world.to_3x3() @ (pb.matrix.to_3x3() @ Vector((0, 0, 1)))).normalized()
    return c, fwd


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
        cam.data.clip_start, cam.data.clip_end = 0.02, 6000.0
    sc = bpy.context.scene
    sc.cycles.sample_clamp_indirect = 3.0
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.max_bounces = 6
    sc.cycles.transparent_max_bounces = 12
    trims = TRIMS.get(name, {})
    for n, ob in st.LIGHTS.items():
        base = _STATE["base"].setdefault(n, ob.data.energy)
        k = trims.get(n, trims.get(ob.lightgroup, 1.0))
        ob.data.energy = base * k
    hz = bpy.data.objects.get("lamp haze")
    if hz is not None:
        hz.hide_render = trims.get("haze", 1.0) <= 0.0
    print(f"CABIN camera {name or '?'}: beat {CAMERAS.get(name, {}).get('beat', '?')}, trims {trims or 'none'}",
          flush=True)


def save_groups(name, out):
    """Write the finished render's passes (the light groups among them) as a multilayer EXR, for light balancing."""
    folder = os.environ.get("CABIN_EXR")
    if not folder:
        return
    try:
        os.makedirs(folder, exist_ok=True)
        sc = bpy.context.scene
        ims = sc.render.image_settings
        keep = (ims.file_format, ims.color_depth, ims.color_mode)
        ims.file_format = "OPEN_EXR_MULTILAYER"
        ims.color_depth, ims.exr_codec = "16", "ZIP"
        path = os.path.join(folder, os.path.basename(str(out)).replace(".png", "") + ".exr")
        bpy.data.images["Render Result"].save_render(path, scene=sc)
        ims.file_format = keep[0]
        ims.color_depth, ims.color_mode = keep[1], keep[2]
        print(f"CABIN light groups saved: {path}", flush=True)
    except Exception as e:  # never lose a render to the extra file
        print(f"CABIN light groups not saved: {e!r}", flush=True)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        name = which_camera()
        apply_camera(name)
        r = orig(*args, **kw)
        save_groups(name, args[0] if args else kw.get("out", "render.png"))
        return r
    render._orig = orig
    sk.render = render


# ---------------------------------------------------------------- lights
def group(ob, g):
    ob.lightgroup = g
    return ob


def lights():
    y_d = st.row_y(DAWN_ROW)
    # Dawn's reading light: the lens in the PSU over her seat, a warm-white cone onto her lap, hands and face
    lens = Vector((DAWN_SEAT[0], y_d + 0.30, PSU_Z[0] - 0.024))
    sp = st.spot(READ, lens, (DAWN_SEAT[0] + 0.02, y_d + 0.10, 0.90), 28.0, (1.0, 0.87, 0.70), 56.0, 0.45, radius=0.018)
    sp.data.use_soft_falloff = False
    group(sp, "key")
    # the lens scatters a little outside its beam: the wall, the headrests and the seat back in front
    sl = st.spot("reading_spill", lens + Vector((0, 0, -0.01)), (DAWN_SEAT[0], y_d + 0.22, 0.62), 8.0, (1.0, 0.87, 0.70),
                 150.0, 0.8, radius=0.03)
    group(sl, "spill")
    # the window's cool glow on her face (sky and moon through the pane)
    wf = st.area("window_fill", (-2.92, DAWN_WINDOW_Y, st.WIN_Z + 0.02), (0.22, 0.34), 0.9, (0.6, 0.72, 1.0),
                 spread=100, aim=(HEAD.x + 0.02, HEAD.y + 0.04, HEAD.z - 0.08))
    wf.visible_glossy = False
    wf.visible_camera = False
    group(wf, "win")
    # night coves: long thin strips hidden on the bins, washing the aisle ceilings in dim blue
    yc, length = (st.REAR_Y + st.FRONT_Y) / 2, st.FRONT_Y - st.REAR_Y - 0.4
    for side in (-1, 1):
        for x, z, rot, k in ((side * 1.52, 2.372, side * 2.10, 1), (side * 0.81, 2.432, -side * 2.02, -1)):
            a = st.area(f"cove_light_{side}_{k}", (x, yc, z), (0.03, length), 9.0, (0.36, 0.5, 1.0), spread=150)
            a.rotation_euler = (0.0, rot, 0.0)
            a.visible_camera = False
            group(a, "cove")


PSU_Z = {}


def assign_groups():
    """Light groups for every emitter (lamps were grouped where they were made; here the glowing meshes)."""
    vl = bpy.context.view_layer
    for g in GROUPS:
        if g not in [x.name for x in vl.lightgroups]:
            vl.lightgroups.add(name=g)
    rules = (("pathled_", "path"), ("pathglow_", "path"), ("path_light_", "path"), ("wash_", "wash"),
             ("cove_", "cove"), ("screenglow_", "screen"), ("screenspill_", "screen"), ("galley_", "galley"),
             ("bulk_sign_", "galley"), ("sky", "ext"), ("navlight", "ext"), ("strobe", "ext"), ("nav_red_light", "ext"),
             ("moon", "ext"), ("lens_", "key"))
    for ob in bpy.data.objects:
        if ob.lightgroup:
            continue
        for pre, g in rules:
            if ob.name.startswith(pre):
                ob.lightgroup = g
                break


def build(cast=True):
    mt.materials(lanes=st.AISLES)
    st.LIGHTS.clear()
    _STATE["base"].clear()
    ys = st.windows_y(DAWN_WINDOW_Y)
    plan, dk = shade_plan(ys)
    st.shell(plan, ys)
    occupied = {(DAWN_ROW, 0, 0)} | {(row, b, s) for _, _, row, b, s, _, _, _ in PAX}
    st.seats(lit_screens=LIT, skip=set())
    st.belts(skip=occupied)
    for r in range(st.N_ROWS):
        st.psu(r)
    PSU_Z[0] = st.bin_bottom(abs(DAWN_SEAT[0])) - 0.016
    # Dawn's lens lit
    lens = bpy.data.objects.get(f"lens_{DAWN_ROW}_0_0")
    if lens is not None:
        lens.data.materials[0] = mt.M["lens_on"]
        PSU_Z[0] = lens.location.z + 0.017
    st.path_lights()
    st.front_bulkhead()
    recv = bpy.data.collections.new("exterior receivers")
    tip_dir = (Vector(TIP_THROUGH) - Vector(OVER_CAM)).normalized()
    tip = Vector(OVER_CAM) + tip_dir * (27.0 / abs(tip_dir.x))
    st.exterior(tuple(tip), recv, moon_dir=(tip_dir.x, tip_dir.y, 0.42))
    lights()
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    # a little haze round her lamp so its cone has a shape (lit by her lamp only; the aisle camera only)
    hz = sk.haze((0.9, 1.3, 1.5), (DAWN_SEAT[0] + 0.1, st.row_y(DAWN_ROW) + 0.15, 1.05), 0.06,
                 colour=(0.85, 0.88, 0.95))
    hz.name = "lamp haze"
    hc = bpy.data.collections.new("haze only")
    hc.objects.link(hz)
    for co in hc.collection_objects:
        co.light_linking.link_state = "EXCLUDE"
    for n, ob in st.LIGHTS.items():
        if n != READ and ob.type == "LIGHT" and ob.light_linking.receiver_collection is None:
            ob.light_linking.receiver_collection = hc
    assign_groups()
    print(f"CABIN windows {len(ys)} a side, Dawn's window #{dk} at y {ys[dk]:.3f}; wing tip at "
          f"({tip.x:.1f}, {tip.y:.1f}, {tip.z:.1f}); lights {len(st.LIGHTS)}", flush=True)
    if cast:
        d = dawn()
        upper = {"head": (7, 20), "neck": (4, 10), "chest": (-4, 5), "fingers": 17}
        place_seated(d, DAWN_SEAT, upper, lean=11.0)
        hp, fwd = head_points(d)
        print(f"CABIN Dawn head centre ({hp.x:.3f}, {hp.y:.3f}, {hp.z:.3f}) (planned {tuple(round(c, 3) for c in HEAD)}),"
              f" head bone up ({fwd.x:.2f}, {fwd.y:.2f}, {fwd.z:.2f})", flush=True)
        if os.environ.get("CABIN_PAX", "1") != "0":
            for name, kind, row, b, s, up, lean, kw in PAX:
                h = people.man(name, **kw) if kind == "man" else people.staff(name, **kw)
                g = garment(h)
                if g is not None:
                    ease_seated(g, 0.010)
                place_seated(h, (st.BLOCK_X[b] + st.SEAT_DX[s], st.row_y(row)), up, lean=lean, hands=True,
                             fit_hands=False)
    install_hook()
