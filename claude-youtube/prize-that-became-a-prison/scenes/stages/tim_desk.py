"""Stage: Tim Hunt's desk at home in Chicago, at night (Ch 09, the years of private appeals before he went public;
also Ch 01 'Tim remembers' and Ch 11 'The family's letters').

A worn oak desk under a window whose blinds are half closed. The desk lamp is the one warm light in the room: its
pool lies on the writing pad and on Tim's hands, its upper edge cut by the shade about the height of his brow. The
laptop stands open and pushed aside at his left, its page blank and cool. To his right the letters: two official
replies in window envelopes with one unfolded, a banded bundle of airmail envelopes, a loose pile of them, the phone
lying face down, a mug, a framed photograph turned toward him (the camera sees its back). Through the slats, the
night and the lit windows across the street; a street light throws the slats' stripes over the letters at the back
of the desk, the radiator and the file boxes by the wall.

Tim (scenes/people.py: people.man('Tim', age=0.58) in the dark casual suit, the shirt and trousers given their own
tones) sits facing the window (-Y), leaning in on his forearms, writing by hand, his head bowed over the page.

Cameras:
  desk     medium, from his right front at the height of the lamp's head: Tim on the left of the frame in profile,
           the lamp on the right, the pad and his hands between them, the letters soft in the foreground
  letters  straight down on the desk (Tim's chair is empty in this one: the pen lies on the pad)
  window   wide from behind, low: Tim small at the desk against the blinds and the night, the lamp past his shoulder

The set is in tim_desk_set.py, its materials in tim_desk_mats.py, the paper in tim_desk_paper.py. Seating and the
forearms on the desk follow the family home's stage (home.py), the hand solving the hearing room's (hearing_room.py);
copied here so this stage stands alone. Before each render a hook on setkit.render applies the camera's own state
(who is in the chair, which pen shows, the haze, light trims).

    <bpy python> -I scenes/shoot.py -- tim_desk <cam> out.png [--nocast]
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
import tim_desk_set as st  # noqa: E402

EXPOSURE = -1.5
TOP = st.TOP

# Tim: the brief's man of this stage. (The hearing room builds its Tim at age 0.78 and a heavier weight for the
# 2026 testimony; this is the same man some years earlier, with the same raised hairline.)
TIM_AGE, TIM_WEIGHT = 0.58, 0.6
JACKET = (0.085, 0.09, 0.105)      # read values (people.py multiplies fabric by FABRIC_VALUE): a dark slate jacket
SHIRT = (0.2, 0.2, 0.195)          # a mid-grey shirt under it, so the collar separates
TROUSERS = (0.065, 0.066, 0.072)
HIP_Y = 0.57                       # his hip joint, this far behind the desk's centre line (the edge is at 0.34)
CHAIR = (0.0, HIP_Y - 0.03, -90.0)
SINK = 0.012                       # how far he sinks into the (wooden) seat: the trousers' cloth only
KNEE_HALF, ANKLE_HALF = 0.105, 0.1

# leaning in on his forearms, head bowed over the page
UPPER = {"torso": (10, 0), "chest": (16, 0), "neck": (12, 2), "head": (20, -6), "fingers": 10}
SOLVE = dict(UPPER, l_arm=(70, 6, 30), r_arm=(70, 6, 30))
# the arms (world, Tim facing -Y; his right is -X): each elbow just off the desk's edge beside him, the forearm
# lying across the desk at ARM_IN degrees in from straight ahead, the right hand on the pad, the left at its edge
ARM_IN = {"R": 50.0, "L": 50.0}
ELBOW_Z = TOP + 0.05
HAND_REST = {"R": TOP + st.PAD_H + 0.0005, "L": TOP + st.PAD_H + 0.0005}    # what each hand rests on
PALM_TILT = {"R": 52.0, "L": 14.0}       # degrees the knuckle line dips to the little-finger side: the writing
                                         # hand lies on its edge, the other nearly flat
HAND_PITCH = {"R": 8.0, "L": 4.0}
# finger joints (knuckle, middle, end, in degrees): the right hand closed round the pen, the left loosely flat
CURLS = {"R": {"f_index": (34, 48, 26), "f_middle": (44, 58, 32), "f_ring": (58, 68, 36), "f_pinky": (64, 72, 38)},
         "L": {"f_index": (9, 15, 9), "f_middle": (10, 17, 10), "f_ring": (12, 19, 11), "f_pinky": (14, 21, 12)}}
THUMB_CURL = {"R": 22.0, "L": 10.0}
FINGERS = ("f_index", "f_middle", "f_ring", "f_pinky")
SPREAD = (2.0, 2.5, 4.5)            # degrees between neighbours: fingers together
HAND_GROUPS = ("DEF-hand", "DEF-palm", "DEF-f_", "DEF-thumb")
PEN_R = 0.0046

FOCUS = {"fx_tim": (0.0, 0.3, 1.2), "fx_letters": (-0.1, 0.0, TOP + 0.01), "fx_pad": (st.PAD[0], st.PAD[1], TOP + 0.01)}

CAMERAS = {
    # Ch 09 (and Ch 01 'Tim remembers'): medium on Tim at the desk in the lamp's pool
    "desk": dict(loc=(-1.3, -0.2, 1.1), aim=(0.1, 0.1, 1.02), lens=40, focus="fx_tim", fstop=2.8, beat="ch09"),
    # Ch 09 / Ch 11 'The family's letters': straight down on the desk (the top of the frame is the window side)
    "letters": dict(loc=(-0.06, 0.012, TOP + 3.1), aim=(-0.06, 0.008, TOP), lens=85, focus="fx_letters", fstop=11.0, beat="ch09",
                    cast=False),
    # Ch 09 (and Ch 01 'Tim himself'): wide from behind, Tim small at the desk against the window and the night
    "window": dict(loc=(1.0, 4.05, 1.15), aim=(0.12, -0.37, 1.24), lens=28, focus="fx_tim", fstop=4.0, beat="ch09"),
}
# per camera: haze density and light trims (multipliers on the built energies)
HAZE = {"desk": 0.004, "letters": 0.0, "window": 0.006}
TRIMS = {"desk": {}, "letters": {"tim_bounce": 0.0}, "window": {}}
_STATE = {"cast": [], "base": {}, "with_cast": False}


# ---------------------------------------------------------------- Tim
def _parts(ob):
    """Loose parts of a mesh: [(vertex index set, min z, max z, max |x|)] in world space."""
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
        cs = [mw @ me.vertices[i].co for i in comp]
        out.append((set(comp), min(c.z for c in cs), max(c.z for c in cs), max(abs(c.x) for c in cs)))
    return out


def suit_tones(h, suit_name="male_casualsuit05"):
    """people.man tints the whole casual suit one flat tone. Keep that tone on the jacket and give the shirt and the
    trousers their own (same fabric finish, values times people.FABRIC_VALUE): the garment's loose parts are the
    jacket with its sleeves (the widest), the trousers (the lowest) and the shirt's two pieces."""
    suit = bpy.data.objects.get(f"{h.name}_{suit_name}")
    if suit is None:
        return
    bpy.context.view_layer.update()
    parts = _parts(suit)
    if len(parts) < 3:
        return
    jacket = max(parts, key=lambda p: p[3])
    trousers = min(parts, key=lambda p: p[1])
    base = suit.material_slots[0].material

    def toned(name, rgb):
        m = base.copy()
        m.name = f"{h.name} {name}"
        for n in m.node_tree.nodes:
            if n.type == "MIX" and n.blend_type == "MULTIPLY":
                for s in n.inputs:
                    if s.name == "B" and s.type == "RGBA":
                        s.default_value = (*(c * people.FABRIC_VALUE for c in rgb), 1)
        suit.data.materials.append(m)
        return len(suit.data.materials) - 1
    i_shirt, i_trousers = toned("shirt", SHIRT), toned("trousers", TROUSERS)
    n = [0, 0]
    for poly in suit.data.polygons:
        v = poly.vertices[0]
        if v in trousers[0]:
            poly.material_index = i_trousers
            n[1] += 1
        elif v not in jacket[0]:
            poly.material_index = i_shirt
            n[0] += 1
    people.fabric(h)
    print(f"TIMDESK wardrobe: {len(parts)} garment parts; shirt faces {n[0]}, trouser faces {n[1]}", flush=True)


def recede_hair(holder, lift=((0, 0.02), (16, 0.024), (32, 0.034), (48, 0.02), (62, 0.0)), volume=0.0065):
    """The sculpted short hair's front hairline raised, further at the temples than in the middle, and the hair
    thinner over the skull (a close crop, not a cap): the hearing room's Tim has this hairline, so this one does too.
    Copied from hearing_room.py. Mesh coordinates are the body's rest space (the head faces -Y)."""
    import bmesh
    hair = bpy.data.objects.get(f"{holder['body']}_hair")
    if hair is None:
        return
    bm = bmesh.new()
    bm.from_mesh(hair.data)
    ztop = max(v.co.z for v in bm.verts)
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
    dist = {v.index: 0 for v in bm.verts if v.is_boundary}
    front, step = list(dist), 0
    while front:
        step += 1
        nxt = []
        for i in front:
            for e in bm.verts[i].link_edges:
                o = e.other_vert(bm.verts[i]).index
                if o not in dist:
                    dist[o] = step
                    nxt.append(o)
        front = nxt
    bm.to_mesh(hair.data)
    bm.free()
    vg = hair.vertex_groups.get("volume")
    if vg is not None:
        for i, d in dist.items():
            vg.add([i], min(1.0, (d / 10.0)) ** 0.7, "REPLACE")
    md = hair.modifiers.get("volume")
    if md is not None:
        md.strength = volume
    # the carving: irregular and shallow, with a fine noise over it (a ribbed cap otherwise)
    m = bpy.data.materials.get(f"hair_{holder.name}")
    if m is not None:
        nt = m.node_tree
        for n in nt.nodes:
            if n.type == "TEX_WAVE":
                n.inputs["Scale"].default_value = 95.0
                n.inputs["Distortion"].default_value = 7.0
                n.inputs["Detail"].default_value = 4.0
            if n.type == "BUMP":
                n.inputs["Strength"].default_value = 0.12
        b = nt.nodes.get("Principled BSDF")
        if b is not None:
            b.inputs["Roughness"].default_value = 0.8
    print(f"TIMDESK Tim's hairline raised: {len(kill)} faces cut", flush=True)


def tim():
    h = people.man("Tim", age=TIM_AGE, weight=TIM_WEIGHT, tone=JACKET)
    suit_tones(h)
    recede_hair(h)
    return h


def sit_legs(holder, thigh, shin):
    """Legs to FK, thighs swung forward `thigh` degrees and turned in so the knees sit KNEE_HALF either side of the
    middle; shins `shin` degrees forward; feet flat and parallel. From home.py."""
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
    """Top of the chair's seat under his seat bones (ray casts down, before he exists)."""
    dg = bpy.context.evaluated_depsgraph_get()
    zs = []
    for dx in (-0.08, 0.0, 0.08):
        for dy in (-0.05, 0.0, 0.05):
            hit, loc, *_ = bpy.context.scene.ray_cast(dg, Vector((x + dx, y + dy, 0.75)), Vector((0, 0, -1)))
            if hit and 0.3 < loc.z < 0.6:
                zs.append(loc.z)
    zs.sort()
    print(f"TIMDESK seat hits {[round(z, 3) for z in zs]}", flush=True)
    return zs[len(zs) // 2] if zs else 0.455


def seat_figure(holder, seat_z, upper=SOLVE):
    """Pose him seated (built at the origin facing -Y): thighs near level, his seat resting SINK into the chair's
    seat; if the soles hang the thighs fall, if they would sink the shins swing forward. Returns (dz, hip)."""
    rig = rigged.rig_of(holder)
    body = bpy.data.objects[holder["body"]]
    thigh, shin = 84.0, 2.0
    dz, hip = 0.0, None
    for it in range(10):
        rigged.pose_figure(holder, upper)
        sit_legs(holder, thigh, shin)
        hip = sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2
        skin = body_points(holder, only=body, unmasked=True)
        seat_pts = [p for p in skin if hip.y - 0.12 < p.y < hip.y + 0.25 and 0.035 < abs(p.x - hip.x) < 0.2 and p.z < hip.z]
        sole_pts = [p for p in body_points(holder) if p.y < hip.y - 0.25 and p.z < hip.z - 0.2]
        butt = min(p.z for p in seat_pts)
        sole = min(p.z for p in sole_pts)
        dz = seat_z - SINK - butt
        gap = sole + dz
        print(f"TIMDESK seated it {it}: thigh {thigh:.1f} shin {shin:.1f} hip z {hip.z + dz:.3f} soles {gap * 1000:+.1f} mm", flush=True)
        if abs(gap) < 0.004:
            break
        if gap > 0:                  # feet hang: straighten the shins, then let the thighs fall
            c = math.cos(math.radians(shin)) + gap / 0.45
            if c < 1.0:
                shin = math.degrees(math.acos(c))
            else:
                shin = 0.0
                thigh -= math.degrees((c - 1.0) * 0.45 / 0.43)
        else:                        # feet would sink: swing the shins forward, past 30 degrees raise the knees
            c = math.cos(math.radians(shin)) + gap / 0.45
            if c > math.cos(math.radians(30)):
                shin = math.degrees(math.acos(max(-1.0, min(1.0, c))))
            else:
                thigh += math.degrees(-gap / 0.43)
    return dz, hip


# ---------------------------------------------------------------- hands (from hearing_room.py and home.py)
@contextmanager
def fast_body(holder):
    """While solving: the body's masks and subdivision off, so evaluation is quick and vertex indices hold."""
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


def hand_points(body, k):
    """World points (numpy) of the body's vertices weighted to one hand (inside fast_body)."""
    key = (body.name, k)
    if key not in _SEL:
        gids = {g.index for g in body.vertex_groups if g.name.endswith(f".{k}") and g.name.startswith(HAND_GROUPS)}
        _SEL[key] = np.array([v.index for v in body.data.vertices
                              if any(ge.group in gids and ge.weight > 0.3 for ge in v.groups)], dtype=np.int64)
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get("co", co)
    ev.to_mesh_clear()
    mw = np.array(body.matrix_world)
    co = co.reshape(-1, 3) @ mw[:3, :3].T + mw[:3, 3]
    s = _SEL[key]
    return co[s[s < len(co)]]


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


def hand_frame(rig, k):
    """The posed hand's frame (world): along the hand, across toward the thumb, the palm side; and the index
    finger's knuckle and tip."""
    H = _wpos(rig, f"hand_fk.{k}")
    idx, mid, pnk = (_wpos(rig, f"f_{f}.01_master.{k}") for f in ("index", "middle", "pinky"))
    y_h = (mid - H).normalized()
    x_h = idx - pnk
    x_h = (x_h - y_h * x_h.dot(y_h)).normalized()
    n_p = y_h.cross(x_h).normalized()
    tip = _wpos(rig, f"f_middle.03.{k}", tail=True)
    if (tip - mid).dot(n_p) < 0:
        n_p = -n_p
    return y_h, x_h, n_p, idx, _wpos(rig, f"f_index.03.{k}", tail=True)


def pose_hand(rig, k, curls, thumb_curl, grip=False):
    """The fingers closed together (each master turned about the palm normal until SPREAD from its neighbour), then
    curled joint by joint; the thumb searched over its master's rotation onto a mark: beside the index finger for a
    resting hand, or (grip) opposite the index fingertip with a pen's width between them."""
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
    for f, ref, gap in (("f_index", "f_middle", SPREAD[0]), ("f_ring", "f_middle", SPREAD[1]), ("f_pinky", "f_ring", SPREAD[2])):
        m = pb[f"{f}.01_master.{k}"]
        a0 = _signed(_wdir(rig, f"{ref}.01.{k}"), _wdir(rig, f"{f}.01.{k}"), nrm)
        m.rotation_euler.z = math.radians(6.0)
        upd()
        a1 = _signed(_wdir(rig, f"{ref}.01.{k}"), _wdir(rig, f"{f}.01.{k}"), nrm)
        slope = (a1 - a0) / 6.0
        z = (math.copysign(gap, a0) - a0) / slope if abs(slope) > 0.2 else 0.0
        m.rotation_euler.z = math.radians(max(-25.0, min(25.0, z)))
        upd()
    for f in FINGERS:
        kn, md_, tp = curls[f]
        pb[f"{f}.01_master.{k}"].rotation_euler.x = math.radians(kn)
        pb[f"{f}.02.{k}"].rotation_euler.x = math.radians(md_)
        pb[f"{f}.03.{k}"].rotation_euler.x = math.radians(tp)
    upd()
    y_h, x_h, n_p, idx, itip = hand_frame(rig, k)
    depth = (itip - idx).dot(n_p)
    if grip:      # the thumb's end 2.3 cm from the index fingertip, on the thumb side and a little toward the palm
        target = itip + x_h * 0.021 + n_p * 0.006 - y_h * 0.006
    else:         # laid alongside the index finger at about the depth of the finger pads
        target = idx + y_h * 0.032 + x_h * 0.02 + n_p * (0.8 * depth)
    th = pb.get(f"thumb.01_master.{k}")
    best = None
    if th is not None:
        th.rotation_mode = "XYZ"
        for nm in (f"thumb.02.{k}", f"thumb.03.{k}"):
            b = pb.get(nm)
            if b is not None:
                b.rotation_mode = "XYZ"
                b.rotation_euler = (math.radians(thumb_curl), 0.0, 0.0)

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
    print(f"TIMDESK hand {k}: index tip depth {depth * 1000:.0f} mm, thumb tip {(best[0] if best else 0) * 1000:.0f} mm off its mark "
          f"at ({best[1] if best else 0}, {best[2] if best else 0})", flush=True)


def _knuckle_line(axis, side, tilt):
    """Where the line from the index knuckle to the little-finger knuckle should point for a hand lying palm down
    along `axis` (world): level and square to the hand, out to the little finger's side, dipped `tilt` degrees."""
    flat = Vector((axis.x, axis.y, 0.0))
    if flat.length < 1e-6:
        flat = Vector((0.0, -1.0, 0.0))
    lateral = side * Vector((0.0, 0.0, 1.0)).cross(flat.normalized())
    t = math.radians(tilt)
    return lateral * math.cos(t) + Vector((0.0, 0.0, -math.sin(t)))


def palm_roll(holder, side, tilt):
    """Turn the forearm about its own axis until the line from the index knuckle to the little-finger knuckle runs
    out to his side, `tilt` degrees below level (palm down, leaning onto the little finger). From home.py."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    k = "L" if side > 0 else "R"
    mw = rig.matrix_world
    fa = pb[f"forearm_fk.{k}"]
    a_i, a_p = _wpos(rig, f"f_index.01_master.{k}"), _wpos(rig, f"f_pinky.01_master.{k}")
    axis = (mw.to_3x3() @ (fa.tail - fa.head)).normalized()
    want = _knuckle_line(axis, side, tilt)
    have = a_p - a_i
    have -= axis * have.dot(axis)
    want -= axis * want.dot(axis)
    if have.length < 1e-6 or want.length < 1e-6:
        return 0.0
    have.normalize()
    want.normalize()
    ang = math.atan2(have.cross(want).dot(axis), have.dot(want))
    ax_arm = (mw.to_3x3().inverted() @ axis).normalized()
    head = fa.matrix.translation.copy()
    fa.matrix = Matrix.Translation(head) @ Matrix.Rotation(ang, 4, ax_arm) @ Matrix.Translation(-head) @ fa.matrix
    bpy.context.view_layer.update()
    return math.degrees(ang)


def arm_to(holder, side, elbow_t, wrist_t, hand_dir, tilt):
    """Aim one arm: the upper arm at the elbow target, the forearm at the wrist target and rolled palm down to
    `tilt`, the hand along `hand_dir` (world). Returns the world elbow, wrist and hand tip."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    k = "L" if side > 0 else "R"
    for n in ("upper_arm_fk", "forearm_fk", "hand_fk"):
        pb[f"{n}.{k}"].matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    inv = rig.matrix_world.to_3x3().inverted()
    mw = rig.matrix_world
    s = mw @ pb[f"upper_arm_fk.{k}"].head
    rigged._aim(rig, f"upper_arm_fk.{k}", inv @ (Vector(elbow_t) - s))
    e = mw @ pb[f"forearm_fk.{k}"].head
    rigged._aim(rig, f"forearm_fk.{k}", inv @ (Vector(wrist_t) - e))
    for _ in range(2):
        palm_roll(holder, side, tilt)
    w = mw @ pb[f"hand_fk.{k}"].head
    rigged._aim(rig, f"hand_fk.{k}", inv @ Vector(hand_dir))
    for _ in range(2):                       # the hand's own roll follows the forearm's: bring the knuckle line back
        palm_roll_hand(rig, k, side, tilt)
    bpy.context.view_layer.update()
    return e, w, mw @ pb[f"hand_fk.{k}"].tail


def palm_roll_hand(rig, k, side, tilt):
    """Roll the hand about its own axis so its knuckle line dips `tilt` degrees to the little-finger side."""
    pb = rig.pose.bones
    mw = rig.matrix_world
    hb = pb[f"hand_fk.{k}"]
    a_i, a_p = _wpos(rig, f"f_index.01_master.{k}"), _wpos(rig, f"f_pinky.01_master.{k}")
    axis = (mw.to_3x3() @ (hb.tail - hb.head)).normalized()
    want = _knuckle_line(axis, side, tilt)
    have = a_p - a_i
    have -= axis * have.dot(axis)
    want -= axis * want.dot(axis)
    if have.length < 1e-6 or want.length < 1e-6:
        return
    ang = math.atan2(have.normalized().cross(want.normalized()).dot(axis), have.normalized().dot(want.normalized()))
    ax_arm = (mw.to_3x3().inverted() @ axis).normalized()
    head = hb.matrix.translation.copy()
    hb.matrix = Matrix.Translation(head) @ Matrix.Rotation(ang, 4, ax_arm) @ Matrix.Translation(-head) @ hb.matrix
    bpy.context.view_layer.update()


def arms_on_desk(holder):
    """Both forearms on the desk. Each elbow hangs just off the desk's edge beside him (where the upper arm's
    length reaches at ELBOW_Z); the forearm lies ARM_IN degrees in across the desk; the wrist is lowered until the
    hand's lowest point rests on the pad. Returns {k: (elbow, wrist, tip)}."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    mw = rig.matrix_world
    out = {}
    with fast_body(holder) as body:
        for k in "RL":
            pose_hand(rig, k, CURLS[k], THUMB_CURL[k], grip=(k == "R"))
        for side, k in ((-1, "R"), (1, "L")):
            s = mw @ pb[f"upper_arm_fk.{k}"].head
            l1 = (mw @ pb[f"upper_arm_fk.{k}"].tail - s).length
            l2 = (mw @ pb[f"forearm_fk.{k}"].tail - mw @ pb[f"forearm_fk.{k}"].head).length
            dz = ELBOW_Z - s.z
            fwd = 0.02
            reach = math.sqrt(max(0.0, l1 * l1 - dz * dz - fwd * fwd))
            elbow = Vector((s.x + side * reach, s.y - fwd, ELBOW_Z))
            a = math.radians(ARM_IN[k])
            wrist = Vector((elbow.x - side * math.sin(a) * l2, elbow.y - math.cos(a) * l2, HAND_REST[k] + 0.03))
            a2 = a + math.radians(6.0)                      # the hand turns in a little more than the forearm
            hd = Vector((-side * math.sin(a2), -math.cos(a2), -math.tan(math.radians(HAND_PITCH[k])))).normalized()
            e = w = tip = None
            for it in range(8):
                e, w, tip = arm_to(holder, side, elbow, wrist, hd, PALM_TILT[k])
                low = float(hand_points(body, k)[:, 2].min()) - HAND_REST[k]
                if abs(low - 0.001) < 0.0012:
                    break
                wrist.z -= low - 0.001
            print(f"TIMDESK arm {k}: shoulder {tuple(round(v, 3) for v in s)}, elbow {tuple(round(v, 3) for v in e)}, wrist "
                  f"{tuple(round(v, 3) for v in w)}, hand tip {tuple(round(v, 3) for v in tip)}, lowest point {low * 1000:+.1f} mm over the pad",
                  flush=True)
            out[k] = (e, w, tip)
    return out


def pen_in_hand(holder):
    """Where the pen lies in his right hand: between the thumb's end and the index fingertip, leaning back into the
    web of the thumb, its point on the paper. Returns (tip, axis) and prints the fit."""
    rig = rigged.rig_of(holder)
    k = "R"
    y_h, x_h, n_p, idx, itip = hand_frame(rig, k)
    ttip = _wpos(rig, f"thumb.03.{k}", tail=True)
    grip = (itip + ttip) / 2
    web = idx + x_h * 0.014 - n_p * 0.004
    axis = (web - grip).normalized()
    if axis.z < 0.25:                         # never flatter than a pen is held
        axis = (axis + Vector((0, 0, 0.25 - axis.z))).normalized()
    paper = HAND_REST[k]
    s = (grip.z - paper) / axis.z
    tip = grip - axis * s
    print(f"TIMDESK pen: index tip to thumb tip {(itip - ttip).length * 1000:.0f} mm, grip {s * 1000:.0f} mm up the barrel from the point, "
          f"axis {tuple(round(v, 2) for v in axis)} ({math.degrees(math.asin(axis.z)):.0f} deg off the paper), point at "
          f"{tuple(round(v, 3) for v in tip)}", flush=True)
    return tip, axis


def seat_eyes(holder, forward=0.003, grow=1.1):
    """Seat the statue eyes a little forward and fuller in their sockets (lit from below, a dark gap opens round the
    eyeball otherwise). On the eye meshes' vertices, not their matrices. From home.py."""
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


def face_points(holder):
    """World points on his face (brow, eyes, nose, mouth, chin), the head's centre and the way it looks: from the
    body's evaluated mesh in the head bone's frame, the front found from the statue eyes."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones["DEF-spine.006"]
    mw = rig.matrix_world
    hd, tl = mw @ pb.head, mw @ pb.tail
    up = (tl - hd).normalized()
    body = bpy.data.objects[holder["body"]]
    pts = [p for p in body_points(holder, only=body) if (p - hd).dot(up) > -0.09 and (p - hd).length < 0.3]
    top = [p for p in pts if (p - hd).dot(up) > 0.02]
    c = sum(top, Vector()) / len(top)
    eyes = [o for o in holder.children_recursive if o.type == "MESH" and "_eye" in o.name]
    ec = sum((o.matrix_world @ (sum((v.co for v in o.data.vertices), Vector()) / len(o.data.vertices)) for o in eyes), Vector()) / max(1, len(eyes))
    fwd = ec - c
    fwd -= up * fwd.dot(up)
    fwd.normalize()
    out = {"centre": c, "forward": fwd, "up": up, "eyes": ec}
    for name, off in (("brow", (ec - hd).dot(up) + 0.03), ("nose", (ec - hd).dot(up) - 0.045), ("mouth", (ec - hd).dot(up) - 0.075),
                      ("chin", (ec - hd).dot(up) - 0.12)):
        ring = [p for p in pts if abs((p - hd).dot(up) - off) < 0.012 and (p - c).dot(fwd) > 0.02]
        out[name] = max(ring, key=lambda p: (p - c).dot(fwd)) if ring else ec
    return out


def place_tim(holder, seat_z):
    dz, _ = seat_figure(holder, seat_z)
    rig = rigged.rig_of(holder)
    hip_w = sum((rig.matrix_world @ rig.pose.bones[f"thigh_fk.{k}"].head for k in "LR"), Vector()) / 2
    target = Vector((CHAIR[0], HIP_Y, hip_w.z + dz))
    holder.location += target - hip_w
    bpy.context.view_layer.update()
    pts = body_points(holder)
    lo = min(p.z for p in pts)
    belly = min(p.y for p in pts if TOP - 0.02 < p.z < TOP + 0.12 and abs(p.x) < 0.15)
    knees = max(p.z for p in pts if p.y < 0.3 and abs(p.x) < 0.3 and p.z < TOP)
    print(f"TIMDESK seated Tim: hip at {tuple(round(v, 3) for v in target)}, lowest point {lo * 1000:+.1f} mm, his front {belly - st.DD / 2:+.3f} m "
          f"from the desk's edge, knees up to {knees:.3f} (drawer rail at {TOP - st.TT - 0.07:.3f})", flush=True)


# ---------------------------------------------------------------- lights
def lights():
    R, W = st.R, st.WIN
    yg = R["y0"] - st.WALL_T
    # the night at the glass: a weak cool glow onto the slats' backs, the stool and the back of the desk
    li = st.area("night_glow", (W["cx"], yg - 0.3, (W["z0"] + W["z1"]) / 2), (W["w"] - 0.1, W["z1"] - W["z0"] - 0.1), 26.0, st.NIGHT,
                 spread=150, aim=(W["cx"], 0.5, 1.0))
    li.visible_camera = False
    # a street light up the block, far and small so the slats cut clean stripes: it comes in across the room toward
    # his right, over the letters at the back of the desk, down the radiator wall and the boards by the file boxes
    d = Vector((-0.765, 0.441, -0.469)).normalized()
    target = Vector((-1.5, 0.55, 0.5))
    st.spot("street", tuple(target - d * 15.0), tuple(target), 4200.0, (0.7, 0.8, 1.0), 11.0, 0.3, 0.03)
    # the room's own dark: the faintest cool fill off the ceiling, so the far corners are shadow and not a void
    fill = st.area("room_fill", ((R["x0"] + R["x1"]) / 2, 2.2, R["h"] - 0.05), (3.0, 3.4), 2.4, (0.6, 0.72, 1.0), spread=170)
    fill.visible_camera = False
    fill.visible_glossy = False


def tim_lights(holder):
    """The page's light back up into his face: a warm panel lying on the pad that only Tim sees (the path-traced
    bounce off the paper is there too, but at a fifth of what a lit page gives a face bent over it)."""
    px, py, _ = st.PAD
    li = st.area("tim_bounce", (px, py, TOP + st.PAD_H + 0.02), (0.22, 0.3), 2.6, st.WARM, spread=160)
    li.rotation_euler = (math.pi, 0, math.radians(st.PAD[2]))          # facing up
    li.visible_camera = False
    li.visible_glossy = False
    li.visible_volume_scatter = False
    recv = bpy.data.collections.new("tim_bounce_receivers")
    for o in holder.children_recursive:
        if o.type == "MESH":
            recv.objects.link(o)
    try:
        li.light_linking.receiver_collection = recv
    except AttributeError:
        li.data.energy = 0.0
    return li


def lit_fraction(src, radius, target, ignore=()):
    """How much of a small round light at `src` a world point sees (0..1), by rays to points across the light."""
    dg = bpy.context.evaluated_depsgraph_get()
    sc = bpy.context.scene
    n = (Vector(target) - src).normalized()
    u = n.orthogonal().normalized()
    v = n.cross(u)
    free = total = 0
    for i in range(-2, 3):
        for j in range(-2, 3):
            if i * i + j * j > 4:
                continue
            p = src + (u * i + v * j) * (radius / 2.0)
            dvec = Vector(target) - p
            hit, loc, _, _, ob, _ = sc.ray_cast(dg, p + dvec.normalized() * 0.036, dvec.normalized(), distance=dvec.length - 0.05)
            total += 1
            if not hit or (ob is not None and ob.name in ignore):
                free += 1
    return free / total


# ---------------------------------------------------------------- per-camera hook
def which_camera():
    cam = bpy.context.scene.camera
    if cam is None:
        return None
    if cam.get("stage_camera") in CAMERAS:
        return cam["stage_camera"]
    for n, c in CAMERAS.items():
        if (cam.location - Vector(c["loc"])).length < 1e-3:
            return n
    return None


def apply_camera(name):
    cfg = CAMERAS.get(name, {})
    sc = bpy.context.scene
    cam = sc.camera
    if cam is not None:
        cam.data.clip_start, cam.data.clip_end = 0.03, 60.0
    seated = _STATE["with_cast"] and cfg.get("cast", True)
    for o in _STATE["cast"]:
        if o.type == "MESH" or o.type == "CURVE":
            o.hide_render = (not seated) or o.get("tim_hidden", False)
    for o in st.G.get("pen_desk", []):
        o.hide_render = seated
    ceiling = bpy.data.objects.get("room_ceiling")
    if ceiling is not None:
        ceiling.visible_camera = name != "letters"          # the overhead camera looks down through it
    for n, ob in st.LIGHTS.items():
        base = _STATE["base"].setdefault(n, ob.data.energy)
        ob.data.energy = base * TRIMS.get(name, {}).get(n, 1.0)
    hz = bpy.data.objects.get("room_haze")
    dens = HAZE.get(name, 0.004)
    if hz is not None:
        hz.hide_render = dens <= 0.0
        pv = next(n for n in hz.active_material.node_tree.nodes if n.type == "PRINCIPLED_VOLUME")
        pv.inputs["Density"].default_value = max(dens, 0.0)
    print(f"TIMDESK camera {name or '?'}: beat {cfg.get('beat', '?')}, Tim {'at the desk' if seated else 'not in the chair'}, haze {dens}",
          flush=True)


def _render(out, samples=64, res=(1920, 1080), exposure=-0.2, world=0.0, noise_threshold=None):
    """setkit.render with this stage's sampling: the denoiser is fed albedo and normals with an accurate prefilter
    (the dark gradients of the walls and the blinds blotch otherwise), eight bounces (the room is lit by what comes
    back off the page and the desk), and a final (1280 wide or more) takes a tighter adaptive threshold."""
    import time
    sc = bpy.context.scene
    w = bpy.data.worlds.new("world")
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[1].default_value = world
    final = res[0] >= 1280
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = (0.015 if final else 0.03) if noise_threshold is None else noise_threshold
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    sc.cycles.denoising_prefilter = "ACCURATE"
    sc.cycles.max_bounces = 8
    sc.cycles.volume_bounces = 0
    sc.cycles.sample_clamp_indirect = 4.0
    sc.cycles.blur_glossy = 0.5
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.view_settings.view_transform = "AgX"
    looks = [l.identifier for l in bpy.types.ColorManagedViewSettings.bl_rna.properties["look"].enum_items]
    sc.view_settings.look = "AgX - Base Contrast" if "AgX - Base Contrast" in looks else "None"
    sc.view_settings.exposure = exposure
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = out
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"RENDER {res[0]}x{res[1]} {samples} samples: {time.time() - t0:.1f} s")


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(out, samples=64, res=(1920, 1080), exposure=-0.2, world=0.0, noise_threshold=None):
        apply_camera(which_camera())
        return _render(out, samples, res, exposure, world, noise_threshold)
    render._orig = orig
    sk.render = render


# ---------------------------------------------------------------- build
def report_frame(holder):
    """Where things fall in each camera's frame (no render needed): normalised x, y (0..1 from the left / bottom)
    of Tim's head, the lamp, the laptop and the chair's feet, so a cut head or foot shows in the log."""
    from bpy_extras.object_utils import world_to_camera_view
    sc = bpy.context.scene
    marks = {"lamp head": st.lamp_bulb() + Vector((0, 0, 0.1)), "lamp base": Vector((st.LAMP[0], st.LAMP[1], TOP)),
             "laptop": Vector((st.LAPTOP[0], st.LAPTOP[1], TOP + 0.12)), "pad": Vector((st.PAD[0], st.PAD[1], TOP)),
             "window top": Vector((0, st.R["y0"], st.WIN["z1"] + 0.15)), "ceiling line": Vector((0, st.R["y0"], st.R["h"])),
             "chair foot L": Vector((0.24, CHAIR[1] + 0.26, 0.0)), "chair foot R": Vector((-0.24, CHAIR[1] + 0.26, 0.0))}
    if holder is not None:
        f = face_points(holder)
        rig = rigged.rig_of(holder)
        pb = rig.pose.bones["DEF-spine.006"]
        marks.update({"head top": rig.matrix_world @ pb.tail + f["up"] * 0.02, "nose": f["nose"], "chin": f["chin"],
                      "r hand": _wpos(rig, "hand_fk.R", tail=True), "l hand": _wpos(rig, "hand_fk.L", tail=True)})
    for name, c in CAMERAS.items():
        cam = sk.camera(c["loc"], c["aim"], lens=c.get("lens", 35))
        sc.render.resolution_x, sc.render.resolution_y = 1280, 720
        bpy.context.view_layer.update()
        row = []
        for mk, p in marks.items():
            v = world_to_camera_view(sc, cam, Vector(p))
            row.append(f"{mk} ({v.x:.2f}, {v.y:.2f}, {v.z:.2f} m)")
        print(f"TIMDESK frame {name}: " + "; ".join(row), flush=True)
        for o in [o for o in bpy.data.objects if o.type == "CAMERA" or o.name.startswith("aim")]:
            bpy.data.objects.remove(o)


def build(cast=True):
    _STATE.update(cast=[], base={}, with_cast=cast)
    _SEL.clear()
    st.materials()
    st.room()
    st.desk()
    cx, cy, ct = CHAIR
    st.chair(cx, cy, ct)
    st.lamp()
    st.group("laptop", st.laptop())
    st.papers()
    st.desk_things()
    lights()
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    holder = None
    if cast:
        seat_z = seat_height(cx, cy - 0.05)
        holder = tim()
        place_tim(holder, seat_z)
        arms_on_desk(holder)
        seat_eyes(holder)
        tip, axis = pen_in_hand(holder)
        pen = st.hand_pen(tip, axis)
        f = face_points(holder)
        bpy.data.objects["fx_tim"].location = f["eyes"]
        tim_lights(holder)
        _STATE["cast"] = [holder] + list(holder.children_recursive) + pen
        # what the lamp gives his face and hands: the share of the bulb each point sees past the shade's rim
        src = st.lamp_bulb()
        lamp_names = {o.name for o in bpy.data.objects["desk-lamp"].children_recursive} | {"lamp_bulb"}
        rig = rigged.rig_of(holder)
        seen = {n: lit_fraction(src, 0.026, f[n]) for n in ("brow", "eyes", "nose", "mouth", "chin")}
        seen["r hand"] = lit_fraction(src, 0.026, _wpos(rig, "hand_fk.R", tail=True) + Vector((0, 0, 0.03)))
        seen["pad"] = lit_fraction(src, 0.026, Vector((st.PAD[0], st.PAD[1], TOP + 0.02)))
        print("TIMDESK lamp on Tim (share of the bulb seen): " + ", ".join(f"{n} {v:.2f}" for n, v in seen.items()) +
              f"; bulb at {tuple(round(v, 3) for v in src)}, eyes at {tuple(round(v, 3) for v in f['eyes'])}, "
              f"face looks along {tuple(round(v, 2) for v in f['forward'])}; lamp parts {len(lamp_names)}", flush=True)
    R = st.R
    hz = sk.haze((R["x1"] - R["x0"] - 0.06, R["y1"] - R["y0"] - 0.06, R["h"] - 0.04),
                 ((R["x0"] + R["x1"]) / 2, (R["y0"] + R["y1"]) / 2, R["h"] / 2), 0.004, colour=(0.9, 0.9, 0.9))
    hz.name = "room_haze"
    report_frame(holder)
    install_hook()
