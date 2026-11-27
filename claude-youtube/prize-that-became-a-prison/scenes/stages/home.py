"""Stage: the family home in Chicago at night (Ch 02 the email, Ch 10 the father who did not get to see her).
Fluorescent Noir, at home: no fluorescent tube burns here; each room is lit by one practical and the night.

Two rooms, side by side and closed (home_set.py):
  kitchen  Ch 02. The round kitchen table with a laptop open on it, its blank screen the only light in the room; Dawn
           seated reading the email, forearms on the table, a finger on the trackpad, head bowed to the glow; a mug,
           the mail, a pen and a phone. Behind her the counter, the sink and a double-hung window onto the night.
  dining   Ch 10. The dining table with chairs round it, the one at the head empty, set back and turned a little; a
           street light outside the foot-end window runs the venetian blind's stripes down the table onto the empty
           chair and throws its striped shadow on the wall behind it; the blinds of the side windows glow; the
           pendant over the table is off. Everything still.

Light: the kitchen has the laptop screen (an emissive face plus an area light the size of the screen just in
front of it), the night through the window and a low under-cabinet night light; the dining room two far street
lights (small spots, so the slats cut clean stripes) and the sky's glow at the side windows. Area lights are
hidden from camera rays, so the windows show the night backdrop itself.

    <bpy python> -I scenes/shoot.py -- home <cam> out.png [--nocast]

Dawn at home wears the casual suit (T-shirt and trousers) tinted flat in two muted tones and plain black flats; her
body is people.dawn()'s (168 cm, age 0.45, bun) so she matches every other scene. She is seated through Rigify the
way the departure gate seats her (legs to FK, a small solve so her seat rests on the cushion and her soles on the
floor), then each arm is aimed so the elbow rests at the table's edge and the forearm lies along the top; the laptop
is put down under her hands (its trackpad under the right hand), not the other way round.
Before each render a hook on setkit.render applies the camera's light trims and render settings.
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
from mathutils import Vector  # noqa: E402

import cast as castkit  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import home_mats as mt  # noqa: E402
import home_set as st  # noqa: E402

EXPOSURE = -1.5

KT, K_TOP = st.KT, st.K_TOP
DAWN_CHAIR = (KT[0] + 0.02, KT[1] + 0.6, -90.0)     # chair footprint centre, turned to face -Y (the table)
CHAIR_SIZE = 0.91                                    # her kitchen chair a little lower than the dining set's
HIP_LOCAL = -0.03                                    # hip joint over the seat, chair-local x (+ = toward the front)
SINK = 0.02                                          # how far she sinks into the cushion

# focus targets (empties); the kitchen one is moved onto Dawn's face once she is posed
FOCUS = {
    "fx_kitchen": (KT[0] + 0.02, KT[1] + 0.62, 1.17),
    "fx_dining": (st.HEAD_CHAIR[0] - 0.1, 0.03, 0.72),
    "fx_chair": (st.HEAD_CHAIR[0] + 0.05, st.HEAD_CHAIR[1], 0.72),     # the head chair's seat back
}

CAMERAS = {
    # Ch 02: across the table from her right, a little below her eyes: the lid's back soft in the foreground, the
    # screen's glow on her face and forearms, the counter and the night window behind
    "kitchen": dict(loc=(KT[0] - 1.07, -1.3, 1.1), aim=(KT[0] + 0.05, 0.62, 1.04), lens=50, focus="fx_kitchen", fstop=1.6, beat="ch02",
                    exposure=-1.3, spp_final=96),
    # Ch 10: from the foot of the table, in the near corner at a standing eye line: the table running away to the
    # head, the chairs pushed in, the blinds glowing on the left wall, their stripes across the table's end and the
    # one chair pulled out at the head (on the right third), clear against the lit end wall
    "dining": dict(loc=(1.45, -1.85, 1.62), aim=(4.0, 0.45, 0.42), lens=32, focus="fx_dining", fstop=5.6, beat="ch10",
                   exposure=-0.75, spp_final=128),
    # Ch 10: the empty chair, from the far side near the end wall, the wall seen edge-on: the street light's stripes
    # across the chair, its striped shadow clear of it on the end wall to the left, the table's head soft at the
    # right; the image before the cut to black
    "chair": dict(loc=(4.05, 2.05, 1.1), aim=(4.4, -0.25, 0.42), lens=32, focus="fx_chair", fstop=2.8, beat="ch10",
                  exposure=-0.95, spp_final=128),
}
TRIMS = {
    "kitchen": {},
    "dining": {},
    "chair": {"d_sky": 1.4, "d_sky_end": 0.375},    # the close-up keeps round 1's foot-end glow (36 W)
}
# the dining room's haze per camera: enough in the wide for the street light's shafts to show in the air; none in
# the chair close-up, where the shafts lay a striped veil between the lens and the chair
HAZE = {"kitchen": None, "dining": 0.012, "chair": 0.0}
ONLY = [c for c in os.environ.get("HOME_ONLY", "").split(",") if c in CAMERAS]
if ONLY:                       # a working shortcut: HOME_ONLY=dining,chair renders just those with `--cam all`
    CAMERAS = {k: v for k, v in CAMERAS.items() if k in ONLY}
_STATE = {"cast": [], "base": {}}

SHIRT = (0.075, 0.08, 0.095)       # a muted dark slate T-shirt: the stone face and arms read against it
TROUSERS = (0.06, 0.06, 0.065)
BLACK_SHOE = (0.045, 0.043, 0.042)


# ---------------------------------------------------------------- Dawn
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


def cloth(ob, rough=0.8, bump=0.22):
    """A garment finished as plain cloth: its normal map (whose fine stripes shimmer) and roughness texture dropped
    for a faint woven-noise bump and sheen."""
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
        b.inputs["Sheen Weight"].default_value = 0.3
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 900.0
        nz.inputs["Detail"].default_value = 2.0
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = bump
        bp.inputs["Distance"].default_value = 0.0004
        nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])


def hide_under_trousers(h, cas, shirt_idx, reach=0.03):
    """MPFB's delete group for the casual suit leaves the shins, which poke through the trousers once she sits. Mask
    every leg vertex of the shaped body within `reach` of the trousers (rest pose). From the departure gate."""
    from mathutils.bvhtree import BVHTree
    body = bpy.data.objects[h["body"]]
    mods = [(m, m.show_viewport) for m in body.modifiers]
    for m, _ in mods:
        m.show_viewport = False
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    em = ev.to_mesh()
    bw = body.matrix_world
    shaped = [bw @ v.co for v in em.vertices]
    ev.to_mesh_clear()
    for m, vis in mods:
        m.show_viewport = vis
    cw = cas.matrix_world
    verts = [cw @ v.co for v in cas.data.vertices]
    polys = [tuple(p.vertices) for p in cas.data.polygons if p.vertices[0] not in shirt_idx]
    bvh = BVHTree.FromPolygons(verts, polys)
    hide = [i for i, p in enumerate(shaped) if 0.1 < p.z < 0.8 and abs(p.x) < 0.2 and bvh.find_nearest(p, reach)[0] is not None]
    vg = body.vertex_groups.new(name="under_trousers")
    vg.add(hide, 1.0, "REPLACE")
    mk = body.modifiers.new("Delete.under_trousers", "MASK")
    mk.vertex_group, mk.invert_vertex_group = "under_trousers", True
    sub = [i for i, m in enumerate(body.modifiers) if m.type == "SUBSURF"]
    if sub:
        body.modifiers.move(len(body.modifiers) - 1, sub[0])
    return len(hide)


def dawn_home():
    """Dawn at home in 2014: people.dawn()'s body (168 cm, age 0.45, the low bun) in the casual suit, the T-shirt and
    the trousers each tinted flat (no print, no logo), plain black flats."""
    h = castkit.person("Dawn", gender=0.0, height_cm=168, age=0.45, hair="bun")
    items = ["female_casualsuit01", "shoes04"]
    castkit.dress(h, items, tint={"female_casualsuit01": TROUSERS, "shoes04": BLACK_SHOE}, flat=tuple(items))
    cas = bpy.data.objects[f"{h.name}_female_casualsuit01"]
    shirt = [p for p in _parts(cas) if p[1] > 0.6]
    idx = shirt[0][0] if shirt else set()
    if shirt:
        m = cas.material_slots[0].material.copy()
        for n in m.node_tree.nodes:
            if n.type == "MIX" and n.blend_type == "MULTIPLY":
                for s in n.inputs:
                    if s.name == "B" and s.type == "RGBA":
                        s.default_value = (*SHIRT, 1)
        cas.data.materials.append(m)
        for poly in cas.data.polygons:
            if poly.vertices[0] in idx:
                poly.material_index = len(cas.data.materials) - 1
    cloth(cas)
    n = hide_under_trousers(h, cas, idx)
    print(f"HOME wardrobe: T-shirt parts {len(shirt)}, {n} leg skin vertices masked under the trousers", flush=True)
    return h


KNEE_HALF, ANKLE_HALF = 0.09, 0.07


def sit_legs(holder, thigh, shin):
    """Legs to FK, thighs swung forward `thigh` degrees and turned in so the knees sit KNEE_HALF either side of the
    middle; shins `shin` degrees forward; feet flat and parallel. From the departure gate."""
    from mathutils import Matrix
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


def seat_height(x, y):
    """Top of the chair's cushion under her seat bones (ray casts down, before she exists)."""
    dg = bpy.context.evaluated_depsgraph_get()
    zs = []
    for dx in (-0.08, 0.0, 0.08):
        for dy in (-0.05, 0.0, 0.05):
            hit, loc, *_ = bpy.context.scene.ray_cast(dg, Vector((x + dx, y + dy, 0.75)), Vector((0, 0, -1)))
            if hit and 0.3 < loc.z < 0.6:
                zs.append(loc.z)
    zs.sort()
    print(f"HOME seat hits {[round(z, 3) for z in zs]}", flush=True)
    return zs[len(zs) // 2] if zs else 0.47


# reading the email: leaning in a little over the table, neck and head bowed to the screen
UPPER = {"chest": (16, 0), "neck": (8, 0), "head": (17, 3), "fingers": 12}     # neck and head 8 deg further down than
                                                                                # the first cut: she bows to the screen
# per-finger curl once she is seated: (knuckle bend on the finger's master control, flexion of each of the two
# outer joints) in degrees. The master alone only tips a straight finger down at the knuckle (a mitten); the joints
# curl it. The right index reaches ahead for the trackpad, the others curl under it, the thumb tucks in; the left
# hand lies loosely curled on the palm rest
CURL = {"R": {"f_index": (8, 5), "f_middle": (11, 12), "f_ring": (12, 14), "f_pinky": (13, 16), "thumb": (0, 16)},
        "L": {"f_index": (11, 10), "f_middle": (12, 12), "f_ring": (13, 14), "f_pinky": (14, 16), "thumb": (0, 10)}}
PITCH_MIN = -28.0          # the hand tips up at the wrist no further than this; past it the wrist rises instead


def curl_fingers(holder):
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    done = []
    for k, fingers in CURL.items():
        for f, (knuckle, joint) in fingers.items():
            for n, deg in ((f"{f}.01_master.{k}", knuckle), (f"{f}.02.{k}", joint), (f"{f}.03.{k}", joint)):
                if n in pb and deg:
                    pb[n].rotation_mode = "XYZ"
                    pb[n].rotation_euler.x = math.radians(deg)
                    done.append(n)
    bpy.context.view_layer.update()
    print(f"HOME fingers curled: {len(done)} controls", flush=True)


SOLVE = dict(UPPER, l_arm=(70, 6, 30), r_arm=(70, 6, 30))


def _feet(holder, point_deg):
    """Point both feet down (heels up, toes toward the floor) by `point_deg` from their rest pitch."""
    from mathutils import Matrix
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    for k in "LR":
        f = (pb[f"foot_fk.{k}"].matrix.to_3x3() @ Vector((0, 1, 0)))
        rigged._aim(rig, f"foot_fk.{k}", Matrix.Rotation(math.radians(point_deg), 3, "X") @ f)


def seat_figure(holder, seat_z):
    """Pose her seated (built at the origin facing -Y): thighs near level, shins a little back, her seat sunk SINK
    into the cushion; if the soles still hang, the feet point (heels up, toes down) and only past 30 deg do the
    thighs fall. If they would sink, the shins swing forward. Returns (dz, hip) for placing."""
    rig = rigged.rig_of(holder)
    body = bpy.data.objects[holder["body"]]
    thigh, shin, point = 82.0, -3.0, 0.0
    dz, hip = 0.0, None
    for it in range(10):
        rigged.pose_figure(holder, SOLVE)        # arms held forward, out of the seat while it is measured
        sit_legs(holder, thigh, shin)
        if point:
            _feet(holder, point)
        hip = sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2
        skin = body_points(holder, only=body, unmasked=True)
        seat_pts = [p for p in skin if hip.y - 0.12 < p.y < hip.y + 0.25 and 0.035 < abs(p.x - hip.x) < 0.2 and p.z < hip.z]
        sole_pts = [p for p in body_points(holder) if p.y < hip.y - 0.25 and p.z < hip.z - 0.2]
        butt = min(p.z for p in seat_pts)
        sole = min(p.z for p in sole_pts)
        dz = seat_z - SINK - butt
        gap = sole + dz
        print(f"HOME seated it {it}: thigh {thigh:.1f} shin {shin:.1f} feet {point:.0f} hip z {hip.z + dz:.3f} "
              f"(hip over seat {hip.z - butt:.3f}) soles {gap * 1000:+.1f} mm", flush=True)
        if abs(gap) < 0.004:
            break
        if gap > 0:
            if point < 30.0:
                point = min(30.0, point + math.degrees(math.asin(min(0.9, gap / 0.15))))
            else:
                thigh -= math.degrees(gap / 0.43)
        else:
            if point > 0:
                point = max(0.0, point - math.degrees(math.asin(min(0.9, -gap / 0.15))))
            else:
                c = math.cos(math.radians(shin)) + gap / 0.42
                shin = math.degrees(math.acos(max(-1.0, min(1.0, c))))
    return dz, hip


def chair_back_y(z, cy):
    """The kitchen chair's backrest front face (world y) at height z: chair-local x -0.203 at 0.55 m to -0.261 at
    0.92 m for the 0.95 m chair, scaled to CHAIR_SIZE and turned to face -Y (local -x is world +y)."""
    k = CHAIR_SIZE / 0.95
    zz = max(0.55 * k, min(0.92 * k, z))
    return cy + k * (0.203 + (0.261 - 0.203) * (zz / k - 0.55) / 0.37)


def arm_to(holder, side, elbow_t, wrist_t, hand_pitch=14.0):
    """Aim one arm: the upper arm at the elbow target (the elbow lands one upper-arm length from the shoulder along
    that line), the forearm at the wrist target, the hand on along the forearm tipped down `hand_pitch` degrees.
    Targets are world points; returns the world elbow, wrist and hand tip."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    k = "L" if side > 0 else "R"
    inv = rig.matrix_world.to_3x3().inverted()
    mw = rig.matrix_world
    s = mw @ pb[f"upper_arm_fk.{k}"].head
    rigged._aim(rig, f"upper_arm_fk.{k}", inv @ (Vector(elbow_t) - s))
    e = mw @ pb[f"forearm_fk.{k}"].head
    rigged._aim(rig, f"forearm_fk.{k}", inv @ (Vector(wrist_t) - e))
    w = mw @ pb[f"hand_fk.{k}"].head
    fd = (w - e).normalized()
    hd = (fd - Vector((0, 0, math.tan(math.radians(hand_pitch))))).normalized()
    rigged._aim(rig, f"hand_fk.{k}", inv @ hd)
    bpy.context.view_layer.update()
    tip = mw @ pb[f"hand_fk.{k}"].tail
    return e, w, tip


def place_dawn(holder, seat_z):
    cx, cy, _ = DAWN_CHAIR
    dz, _ = seat_figure(holder, seat_z)
    rig = rigged.rig_of(holder)
    body = bpy.data.objects[holder["body"]]
    hip_w = sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2
    target = Vector((cx, cy - HIP_LOCAL, hip_w.z + dz))
    holder.location += target - hip_w
    bpy.context.view_layer.update()
    # keep her back off the backrest (she leans in; at least 15 mm everywhere)
    skin = body_points(holder, only=body, unmasked=True)
    back = [p for p in skin if seat_z + 0.06 < p.z < seat_z + 0.5 and abs(p.x - cx) < 0.2]
    gap = min(chair_back_y(p.z, cy) - p.y for p in back)
    if gap < 0.015:
        holder.location.y -= 0.015 - gap
        bpy.context.view_layer.update()
    print(f"HOME seated Dawn: hip at {tuple(round(v, 3) for v in target)}, back to backrest {gap * 1000:+.0f} mm", flush=True)


def arms_on_table(holder):
    """Elbows rest at the table's edge, forearms along the top toward the laptop; the right hand reaches the
    trackpad, the left lies on the palm rest's left side. Returns the hand tips and wrists."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    mw = rig.matrix_world
    out = {}
    tx, ty = KT
    r_top = 0.446
    cx = DAWN_CHAIR[0]
    for side, k in ((1, "L"), (-1, "R")):
        s = mw @ pb[f"upper_arm_fk.{k}"].head
        l1 = (mw @ pb[f"upper_arm_fk.{k}"].tail - s).length
        l2 = (mw @ pb[f"forearm_fk.{k}"].tail - mw @ pb[f"forearm_fk.{k}"].head).length
        ez = K_TOP + 0.04                              # the elbow's bone line, its skin just on the top
        dz = ez - s.z
        dy = math.sqrt(max(0.0, l1 * l1 - 0.02 ** 2 - dz * dz))
        ey = s.y - dy
        # the forearms lie along the top and converge: the right hand to the trackpad, the left to the palm rest
        wx = cx + (0.085 if side > 0 else -0.075)
        wy = ey - math.sqrt(max(0.0, l2 * l2 - (wx - s.x) ** 2)) * 0.98
        e, w, tip = arm_to(holder, side, (s.x + side * 0.02, ey, ez), (wx, wy, K_TOP + 0.052), hand_pitch=3.0 if side < 0 else 1.0)
        edge = math.sqrt(max(0.0, r_top ** 2 - (e.x - tx) ** 2)) + ty
        print(f"HOME arm {k}: shoulder {tuple(round(v, 3) for v in s)}, elbow {tuple(round(v, 3) for v in e)} "
              f"(table edge at y {edge:.3f}), wrist {tuple(round(v, 3) for v in w)}, tip {tuple(round(v, 3) for v in tip)}", flush=True)
        out[k] = (e, w, tip, (s.x + side * 0.02, ey, ez), (wx, wy, K_TOP + 0.052))
    # the hands rest on the laptop (top at K_TOP + 0.0175): tip each hand up until its lowest finger just clears it
    body = bpy.data.objects[holder["body"]]
    mid = (out["L"][1].x + out["R"][1].x) / 2
    curl_fingers(holder)
    for side, k in ((-1, "R"), (1, "L")):
        e, w, tip, et, wt = out[k]
        pitch = 3.0 if side < 0 else 1.0
        for it in range(10):
            e, w, tip = arm_to(holder, side, et, wt, hand_pitch=pitch)
            pts = [p for p in body_points(holder, only=body)
                   if (p - tip).length < 0.13 and p.y < w.y - 0.03 and (p.x - mid) * side > 0]
            low = min((p.z for p in pts), default=K_TOP + 0.05) - (K_TOP + 0.0175)
            print(f"HOME hand {k} it {it}: pitch {pitch:+.1f} wrist +{(wt[2] - K_TOP) * 1000:.0f} mm, lowest finger "
                  f"{low * 1000:+.1f} mm over the laptop", flush=True)
            if 0.0015 < low < 0.007:
                break
            nxt = pitch + math.degrees((low - 0.004) / 0.09)
            if nxt < PITCH_MIN:            # curled fingers: lift the wrist rather than cock the hand back
                pitch = PITCH_MIN
                wt = (wt[0], wt[1], wt[2] + max(0.0, 0.004 - low))
            else:
                pitch = nxt
        out[k] = (e, w, tip)
    return out


def seat_eyes(holder, forward=0.003, grow=1.1):
    """Seat the statue eyes a little forward and fuller in their sockets. Lit from below by the screen, the render's
    finer subdivision opens a dark gap round the eyeball (one eye read as a black hole); `forward` metres out from the
    head's centre and `grow` larger, the stone eyeball fills the lids' opening. Done on the eye meshes' vertices,
    not on the objects' matrices: the eyes hang from a head bone, and writing their world matrix left one eye
    displaced and shrunk under some poses (measured 27 Nov 2026), which renders as an empty socket."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones["DEF-spine.006"]
    bpy.context.view_layer.update()
    hc = rig.matrix_world @ ((pb.head + pb.tail) / 2)
    for o in [c for c in holder.children_recursive if c.type == "MESH" and "_eye" in c.name]:
        if o.data.users > 1:
            o.data = o.data.copy()
        mw = o.matrix_world.copy()
        inv = mw.inverted()
        ws = [mw @ v.co for v in o.data.vertices]
        c = sum(ws, Vector()) / len(ws)
        off = (c - hc).normalized() * forward
        for v, w in zip(o.data.vertices, ws):
            v.co = inv @ (c + off + (w - c) * grow)
        o.data.update()
    bpy.context.view_layer.update()


def face_point(holder):
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    mw = rig.matrix_world
    for n in ("head", "DEF-spine.006", "spine_fk.006"):
        if n in pb:
            hd, tl = mw @ pb[n].head, mw @ pb[n].tail
            return hd + (tl - hd) * 0.45 + Vector((0, -0.07, 0))
    return Vector(FOCUS["fx_kitchen"])


# ---------------------------------------------------------------- dressing the kitchen table
MUG = (-0.27, 0.07)                # the mug's offset from the laptop
ENV = (0.045, -0.0085, -30.0)      # the mug's place on the mail (along, across its long side) and the mail's turn: its
                                   # long side parallel to the frame's bottom edge
def table_things(hands):
    """The laptop under her hands, then the mug, the mail, a pen and the phone round it."""
    tx, ty = KT
    if hands:
        (er, wr, tr), (el, wl, tl) = hands["R"], hands["L"]
        # the right index finger's pad lands about 5 cm past the hand bone's tip: put the trackpad's centre there.
        # The laptop is turned 180 deg (its front edge toward +Y, toward her), so its trackpad sits at +0.055 in y
        fd = (tr - wr).normalized()
        pad = tr + fd * 0.045
        tp_off = st.LAP_D / 2 - 0.012 - 0.042
        lx, ly = pad.x, pad.y - tp_off
        front = ly + st.LAP_D / 2
        print(f"HOME laptop at ({lx:.3f}, {ly:.3f}), front edge y {front:.3f}; wrists y R {wr.y:.3f} L {wl.y:.3f}, "
              f"wrist heights over the top R {(wr.z - K_TOP) * 1000:.0f} L {(wl.z - K_TOP) * 1000:.0f} mm, "
              f"hand tips R {(tr.z - K_TOP) * 1000:.0f} L {(tl.z - K_TOP) * 1000:.0f} mm", flush=True)
    else:
        lx, ly = tx - 0.04, ty + 0.2
    lap, scr = st.laptop((lx, ly, K_TOP), 180.0 + 3.0)
    # the mail, its long side along the frame's bottom edge, wholly in frame on the left of the table (its far end
    # a couple of centimetres over the rim), the mug set down on it and a pen lying on it beside the mug
    a = math.radians(ENV[2])
    ux, uy = math.cos(a), math.sin(a)                 # the mail's long axis
    vx, vy = -uy, ux
    mx, my = lx + MUG[0], ly + MUG[1]
    ex, ey = mx - ux * ENV[0] - vx * ENV[1], my - uy * ENV[0] - vy * ENV[1]
    top = st.envelopes((ex, ey, K_TOP), turn_deg=ENV[2])
    st.mug((mx, my, K_TOP + top), turn_deg=215.0)
    px, py = ex + ux * -0.035 + vx * 0.041, ey + uy * -0.035 + vy * 0.041
    st.pen((px, py, K_TOP + top), turn_deg=ENV[2] + 2.0)
    st.phone((lx + 0.25, ly + 0.02, K_TOP), turn_deg=-14.0)
    return lap, scr


def screen_light(scr):
    """The screen's spill: an area light the size of the screen just in front of it, facing where it faces."""
    mw = scr.matrix_world
    n = (mw.to_3x3() @ Vector((0, 0, 1))).normalized()
    c = mw.translation + n * 0.004
    li = sk.area_light("screen_spill", c, (st.LAP_W - 0.028, st.LID_H - 0.034), 2.6, (0.78, 0.86, 1.0), spread_deg=150)
    li.rotation_euler = n.to_track_quat("-Z", "Y").to_euler()
    # keep the screen's long side horizontal: turn about the normal until local X lies along the screen's X
    q = li.rotation_euler.to_quaternion()
    xs = (mw.to_3x3() @ Vector((1, 0, 0))).normalized()
    xl = q @ Vector((1, 0, 0))
    ang = xl.angle(xs)
    if (xl.cross(xs)).dot(n) < 0:
        ang = -ang
    from mathutils import Quaternion
    li.rotation_euler = (Quaternion(n, ang) @ q).to_euler()
    li.visible_camera = False
    st.LIGHTS["screen_spill"] = li
    return li


# ---------------------------------------------------------------- lights
def lights():
    win = st.K_WIN
    y1 = st.K["y1"]
    # the night through the kitchen window: a cool glow onto the sink, the counter and her back
    st.area("k_window", (win["cx"], y1 - 0.06, (win["z0"] + win["z1"]) / 2), (win["w"] - 0.06, win["z1"] - win["z0"] - 0.06),
            12.0, (0.55, 0.66, 0.95), spread=120, aim=(win["cx"] + 0.3, 0.2, 0.5))
    # a night light left on under the right-hand wall cabinets: a low warm strip on the tile and the counter
    ux0, ux1 = win["cx"] + win["w"] / 2 + 0.11, st.K["x1"] - 0.85
    st.box("k_ucLens", (ux1 - ux0 - 0.1, 0.03, 0.006), ((ux0 + ux1) / 2, y1 - 0.27, 1.657), mt.glow("uc_lens", (1.0, 0.86, 0.68), 2.2))
    li = st.area("k_undercab", ((ux0 + ux1) / 2, y1 - 0.25, 1.648), (ux1 - ux0 - 0.1, 0.04), 3.2, (1.0, 0.86, 0.68), spread=150)
    li.rotation_euler = (0, 0, 0)          # facing straight down
    # Ch 10: the street light through the foot-end window, far and small so the slats cut clean stripes: it runs
    # down the table onto the empty chair and throws the chair's striped shadow on the wall behind it
    d = Vector((0.9, -0.36, -0.27)).normalized()
    target = Vector((4.45, 0.0, 0.66))
    st.spot("street", tuple(target - d * 15.0), tuple(target), 26000.0, (0.74, 0.84, 1.0), size_deg=12.0, blend=0.3, radius=0.03)
    # a second, weaker street light through the side window, steep: the blinds glow and its stripes fall on the floor
    # and the far chairs between the window and the table, never on the table top (two crossing stripe sets read
    # as a lattice there)
    d2 = Vector((0.25, -0.6, -0.76)).normalized()
    t2 = Vector((3.4, 0.9, 0.0))
    st.spot("street_side", tuple(t2 - d2 * 15.0), tuple(t2), 15000.0, (0.7, 0.8, 1.0), size_deg=12.0, blend=0.3, radius=0.03)
    dw = st.D_WIN
    # the sky's faint glow through the slats: just enough to keep the room readable
    st.area("d_sky", (dw["cx"], st.D["y1"] - 0.08, (dw["z0"] + dw["z1"]) / 2), (dw["w"] - 0.1, dw["z1"] - dw["z0"] - 0.1),
            16.0, (0.5, 0.6, 0.85), spread=140, aim=(dw["cx"] + 0.6, -1.0, 0.4))
    # the night sky's glow through the foot-end blind: a weak fill so the foot of the table, the foot chair and the
    # near chair read (dimly) in the wide instead of crushing to black. Raised from 36 W after round 1: the near end sits in
    # the grade's vignette corner and still graded at ~7/255 (the critic asked 15-25); it falls off fast, so the head
    # of the table and the lit end wall barely change
    ew = st.D_END_WIN
    st.area("d_sky_end", (st.D["x0"] + 0.08, ew["cy"], (ew["z0"] + ew["z1"]) / 2), (ew["z1"] - ew["z0"] - 0.1, ew["w"] - 0.1),
            96.0, (0.5, 0.6, 0.85), spread=130, aim=(2.4, -0.75, 0.45))
    # outside the kitchen window: a faint cool lamp over the neighbour's back door rakes their painted brick
    yw = st.K["y1"] + st.K_OUT
    st.spot("k_alley", (st.WARM_WIN[0] - 0.9, yw - 0.6, 3.4), (st.WARM_WIN[0] + 0.5, yw - 0.02, 1.4), 600.0, (0.62, 0.72, 1.0),
            size_deg=110.0, blend=0.9, radius=0.08)
    # the area lights only light: through the glass the camera sees the night itself
    for li in st.LIGHTS.values():
        if li.type == "LIGHT" and li.data.type == "AREA":
            li.visible_camera = False


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
        cam.data.clip_start, cam.data.clip_end = 0.02, 60.0
    sc = bpy.context.scene
    sc.cycles.sample_clamp_indirect = 3.0
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.volume_bounces = 0
    trims = TRIMS.get(name, {})
    for n, ob in st.LIGHTS.items():
        base = _STATE["base"].setdefault(n, ob.data.energy)
        ob.data.energy = base * trims.get(n, 1.0)
    hz = bpy.data.objects.get("d_haze")
    dens = HAZE.get(name)
    if hz is not None and dens is not None:
        hz.hide_render = dens <= 0.0
        pv = next(n for n in hz.active_material.node_tree.nodes if n.type == "PRINCIPLED_VOLUME")
        pv.inputs["Density"].default_value = max(dens, 0.0)
    print(f"HOME camera {name or '?'}: beat {CAMERAS.get(name, {}).get('beat', '?')}, trims {trims or 'none'}, "
          f"dining haze {dens}", flush=True)


def _render(out, samples=64, res=(1920, 1080), exposure=-0.2, world=0.0, name=None):
    """setkit.render with this stage's sampling: a final (1280 wide or more) of a dark frame takes the camera's
    `spp_final` and a tighter adaptive threshold, and the denoiser is fed albedo and normals (prefilter accurate),
    so the big dark gradients (the window, the walls) do not blotch."""
    import time
    sc = bpy.context.scene
    w = bpy.data.worlds.new("world")
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[1].default_value = world
    final = res[0] >= 1280
    c = CAMERAS.get(name, {})
    spp = max(samples, c.get("spp_final", samples)) if final else samples
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = spp
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.012 if final else 0.03
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    sc.cycles.denoising_prefilter = "ACCURATE"
    sc.cycles.max_bounces = 6
    sc.cycles.volume_bounces = 0
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.view_settings.view_transform = "AgX"
    looks = [l.identifier for l in bpy.types.ColorManagedViewSettings.bl_rna.properties["look"].enum_items]
    sc.view_settings.look = "AgX - Base Contrast" if "AgX - Base Contrast" in looks else "None"
    sc.view_settings.exposure = exposure
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = out
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"RENDER {res[0]}x{res[1]} {spp} samples (asked {samples}): {time.time() - t0:.1f} s")


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(out, samples=64, res=(1920, 1080), exposure=-0.2, world=0.0):
        name = which_camera()
        apply_camera(name)
        return _render(out, samples, res, exposure, world, name)
    render._orig = orig
    sk.render = render


# ---------------------------------------------------------------- build
def build(cast=True):
    st.LIGHTS.clear()
    _STATE["base"].clear()
    st.materials()
    st.kitchen()
    st.kitchen_table()
    cx, cy, ct = DAWN_CHAIR
    st.dining_chair("chair_dawn", cx, cy, ct, sat=0.7, val=0.85, size=CHAIR_SIZE)
    st.dining_chair("chair_k2", KT[0] - 0.74, KT[1] - 0.05, 0.0 - 8.0, sat=0.7, val=0.85)   # pushed up on her left
    st.dining()
    st.dining_table()
    st.dining_chairs()
    lights()
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    seat_z = seat_height(cx, cy - HIP_LOCAL)
    hands = None
    _STATE["cast"] = []
    if cast:
        d = dawn_home()
        place_dawn(d, seat_z)
        hands = arms_on_table(d)
        seat_eyes(d)
        bpy.data.objects["fx_kitchen"].location = face_point(d)
        _STATE["cast"] = [d] + list(d.children_recursive)
        lo = min(p.z for p in body_points(d))
        print(f"HOME Dawn lowest point {lo * 1000:+.1f} mm", flush=True)
    lap, scr = table_things(hands)
    screen_light(scr)
    # haze: a trace in the kitchen, more in the dining room so the street light's stripes show in the air
    sk.haze((st.K["x1"] - st.K["x0"] - 0.1, st.K["y1"] - st.K["y0"] - 0.1, st.K["h"] - 0.05),
            ((st.K["x0"] + st.K["x1"]) / 2, (st.K["y0"] + st.K["y1"]) / 2, st.K["h"] / 2), 0.004).name = "k_haze"
    sk.haze((st.D["x1"] - st.D["x0"] - 0.1, st.D["y1"] - st.D["y0"] - 0.1, st.D["h"] - 0.05),
            ((st.D["x0"] + st.D["x1"]) / 2, (st.D["y0"] + st.D["y1"]) / 2, st.D["h"] / 2), 0.018).name = "d_haze"
    install_hook()
