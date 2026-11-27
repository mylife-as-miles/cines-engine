"""Stage: the leather market at night (Ch 04 'The gift inside the gift'). Fluorescent Noir.

A covered leather-goods market after dark: a narrow concrete lane between two rows of stall boxes under galvanised
corrugated awnings, most shut behind roller shutters, cables sagging along the awnings and across the lane, plastic
crates at the fronts, standing water on the floor. One stall at a cross alley still burns under bare fluorescent
battens, its walls hung floor to ceiling with handbags (the film's four generated bags, hung as linked copies each in
its own leather, no two neighbours alike, blank tags, no prices, no signs). At its counter the stallholder pushes the
black extra bag across to one of the trip's organisers; Dawn stands a step back in the lane. In the stall shot she has
gone in and looks up at the wall of bags.

    <bpy python> -I scenes/shoot.py -- leather_market <cam> out.png [--nocast]

Set and materials: leather_market_set.py and leather_market_mats.py. The people are the film's shared cast
(scenes/people.py): Dawn as in 2014, the organiser people.man('Organiser', age=0.4, suit='male_casualsuit03'), the
stallholder another people.man (older, shorter, heavier, in the casual jacket). This stage only finishes, poses and
places them. Before every render a hook on setkit.render blocks and poses the cast for that camera's beat (gazes and
the hands on the bag are solved, not guessed), hides whoever the camera does not want, moves the focus empties onto
the solved eyes, and applies the camera's light trims.
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
import props  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import leather_market_set as st  # noqa: E402
import leather_market_mats as mt  # noqa: E402

EXPOSURE = -1.5
WORLD = 0.012     # a breath of ambient so the far shutters sit just above the grade's black, not a fill

BX, BY = st.BAG_ON_COUNTER
TOP = st.COUNTER["top"]
BAG_TURN = 14.0

# where the cast stands and what each faces, per beat ("buy": at the counter; "look": Dawn inside, at the wall)
BLOCKING = {
    "buy": {"Organiser": ((0.94, 5.10), (BX, 5.10)), "Stallholder": ((2.29, 5.18), (BX, 5.18)),
            "Dawn": ((0.25, 4.38), (BX - 0.1, BY))},
    "look": {"Dawn": ((2.05, 6.02), (3.5, 6.1))},
}
FLOOR = {"Stallholder": 0.006, "Dawn": 0.0, "Organiser": 0.0}
LOOK_FLOOR = {"Dawn": 0.006}

FOCUS = {"fx_wide": (0.9, 5.2, 1.35), "fx_bag": (BX, BY - 0.08, TOP + 0.28), "fx_dawn": (2.0, 6.0, 1.55)}

CAMERAS = {
    # Ch 04: down the lane from the dark end, from the left-hand row: shut stalls both sides, wet concrete, the one
    # burning stall front at mid distance on the right, the organiser at its counter and Dawn a step back, small
    "wide": dict(loc=(-0.85, -1.20, 1.54), aim=(0.80, 5.35, 1.30), lens=27, focus="fx_wide", fstop=8.0, beat="buy",
                 exposure=-0.55, haze=0.006),
    # Ch 04: from the lane into the stall: Dawn looking up at the wall of handbags under the battens
    "stall": dict(loc=(-0.92, 4.95, 0.9), aim=(3.6, 5.5, 1.02), lens=24, focus="fx_dawn", fstop=4.0, beat="look",
                  show=("Dawn",), exposure=-1.5),
    # Ch 04: the organiser lifts the black duffel as the stallholder pulls his hand away.
    "purchase": dict(loc=(2.20, 3.70, 1.38), aim=(1.508, 4.942, 1.145), lens=42, focus="fx_bag", fstop=3.2, beat="buy",
                     exposure=-1.6),
}
TRIMS = {
    "wide": {"hero_lane": 0.9, "hero_ceil_a": 3.1, "hero_ceil_b": 2.7},
    "stall": {"counter_bag_rim": 0.0, "hero_alley": 1.6},
    "purchase": {"hero_alley": 2.8, "stall_spill": 0.25, "counter_bag_rim": 0.18},
}

_STATE = {"holders": {}, "cast": [], "cache": {}, "bag": None}


# ---------------------------------------------------------------- the hero bag
def hero_bag():
    # nylon with a satin sheen: black, but its folds, straps and zip must read under the battens (at val 0.3 and a
    # cut specular it was a featureless silhouette in the close-up)
    h = props.load("extra-bag-closed", size=0.75, axis="long", loc=(BX, BY, TOP), turn_deg=BAG_TURN,
                   sat=0.5, val=0.42, rough_add=0.0)
    seen = set()
    for o in h.children_recursive:
        if o.type != "MESH":
            continue
        for s in o.material_slots:
            if s.material and s.material.name not in seen:
                seen.add(s.material.name)
                mt.nylon(s.material)
    _STATE["bag"] = h
    # The far bottom edge stays on the counter as the customer takes the near end.
    bpy.context.view_layer.update()
    pivot = Vector((BX + 0.33, BY, TOP))
    h.matrix_world = (Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(9.0), 4, "Y")
                      @ Matrix.Translation(-pivot) @ h.matrix_world)
    bpy.context.view_layer.update()
    lowest = min((obj.matrix_world @ vertex.co).z for obj in h.children_recursive if obj.type == "MESH"
                 for vertex in obj.data.vertices)
    h.location.z += TOP - lowest
    bpy.context.view_layer.update()
    gx, gy = BX - 0.155, BY - 0.012
    tabs = [Vector((gx, y, bag_top(gx, y))) for y in (gy - 0.082, gy + 0.082)]
    for ob in h.children_recursive:
        if ob.type != "MESH":
            continue
        inv = ob.matrix_world.inverted().to_3x3()
        vertical = inv @ Vector((0, 0, 0.040))
        for vertex in ob.data.vertices:
            pos = ob.matrix_world @ vertex.co
            dist = min((pos - tab).length for tab in tabs)
            if dist < 0.15:
                vertex.co += vertical * (1 - dist / 0.15) ** 2
        ob.data.update()
    bpy.context.view_layer.update()
    web = sk.mat("duffel grab webbing", (0.025, 0.025, 0.027), 0.74)
    thread = sk.mat("duffel reinforcement stitching", (0.037, 0.036, 0.034), 0.89)
    rubber = sk.mat("duffel rubber grip", (0.029, 0.028, 0.03), 0.65)
    for i, tab in enumerate(tabs):
        tab.z = bag_top(tab.x, tab.y)
        # Each panel follows the nylon contour down to the stitched edge.
        pts = []
        for dx, dy in ((-0.022, -0.026), (0.022, -0.026), (0.022, 0.026), (-0.022, 0.026)):
            x, y = tab.x + dx, tab.y + dy
            pts.append(Vector((x, y, bag_top(x, y) + 0.0015)))
        me = bpy.data.meshes.new("reinforcement tab")
        me.from_pydata(pts, [], [(0, 1, 2, 3)])
        ob = bpy.data.objects.new(f"grab tab {i}", me)
        bpy.context.scene.collection.objects.link(ob)
        me.materials.append(web)
        ob.modifiers.new("webbing backing", "SOLIDIFY").thickness = 0.002
        inside = [tab.lerp(pt, 0.72) + Vector((0, 0, 0.002)) for pt in pts]
        for j, k in ((0, 1), (1, 2), (2, 3), (3, 0)):
            st.curve(f"grab seam {i} {j}", [inside[j], inside[k]], 0.00055, thread)
    # The flat strap twists out of the tabs into a short sleeve. Round both
    # shoulders of the grip, so that a continuous strip is visible at its ends.
    pts, faces, crown = [], [], []
    mid_z = max(tab.z for tab in tabs) + 0.070
    for i in range(33):
        t = i / 32
        p = tabs[0].lerp(tabs[1], t)
        arch = math.sin(math.pi * t)
        p.z += (mid_z - p.z) * arch + 0.002
        twist = math.radians(16) * math.sin(math.tau * t)
        half = Vector((0.016 * math.cos(twist), 0, 0.016 * math.sin(twist)))
        pts.extend((p - half, p + half))
        if i:
            j = i * 2
            faces.append((j - 2, j - 1, j + 1, j))
        if 12 <= i <= 20:
            crown.append(p.copy())
        if i == 16:
            _STATE["grip"] = p.copy()
    me = bpy.data.meshes.new("curved grab webbing")
    me.from_pydata(pts, [], faces)
    loop = bpy.data.objects.new("duffel grab handle", me)
    bpy.context.scene.collection.objects.link(loop)
    me.materials.append(web)
    for poly in me.polygons:
        poly.use_smooth = True
    loop.modifiers.new("webbing thickness", "SOLIDIFY").thickness = 0.002
    st.curve("duffel grip sleeve", crown, 0.012, rubber, res=4)
    rim = sk.area_light("counter bag rim", (BX + 0.39, BY + 0.25, TOP + 0.56),
                        (0.31, 0.25), 17, (0.81, 0.90, 1.0), spread_deg=80)
    rim.rotation_euler = (Vector((BX, BY, TOP + 0.21)) - rim.location).to_track_quat("-Z", "Y").to_euler()
    receivers = bpy.data.collections.new("counter bag fabric")
    for ob in h.children_recursive:
        if ob.type == "MESH":
            receivers.objects.link(ob)
    rim.light_linking.receiver_collection = receivers
    st.LIGHTS["counter_bag_rim"] = rim
    return h


def bag_top(x, y):
    """Height of the bag's top surface at (x, y), by a ray down onto its mesh."""
    best = None
    for o in _STATE["bag"].children_recursive:
        if o.type != "MESH":
            continue
        mi = o.matrix_world.inverted()
        org = mi @ Vector((x, y, TOP + 1.0))
        d = (mi.to_3x3() @ Vector((0, 0, -1))).normalized()
        ok, loc, nrm, idx = o.ray_cast(org, d)
        if ok:
            z = (o.matrix_world @ loc).z
            best = z if best is None else max(best, z)
    return best if best is not None else TOP + 0.3


# ---------------------------------------------------------------- the cast: finish, place, pose
def facing(p, t):
    return math.degrees(math.atan2(t[0] - p[0], -(t[1] - p[1])))


def place(holder, loc, facing_deg):
    holder.location = loc
    holder.rotation_euler = (0, 0, math.radians(facing_deg))
    bpy.context.view_layer.update()


def _rig(holder):
    return bpy.data.objects[holder["rig"]]


def hands_stone(holder, value=0.36):
    """The hands a shade darker stone than the face: under a top light the backs of the hands face the battens and
    the face does not, so equal albedo reads as white hands. A soft mask from the hand's deform weights."""
    body = bpy.data.objects[holder["body"]]
    gi = {g.index for g in body.vertex_groups if any(k in g.name for k in ("hand", "f_", "thumb", "palm"))}
    if not gi:
        return 0
    me = body.data
    attr = me.color_attributes.new("handmask", "FLOAT_COLOR", "POINT")
    for v in me.vertices:
        w = min(1.0, sum(g.weight for g in v.groups if g.group in gi))
        attr.data[v.index].color = (w, w, w, 1.0)
    m = me.materials[0]
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    at = nt.nodes.new("ShaderNodeAttribute")
    at.attribute_name = "handmask"
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    src = b.inputs["Base Color"].links[0].from_socket if b.inputs["Base Color"].is_linked else None
    if src is not None:
        nt.links.new(src, mix.inputs["A"])
    else:
        mix.inputs["A"].default_value = b.inputs["Base Color"].default_value
    mix.inputs["B"].default_value = (value, value, value * 1.01, 1.0)
    nt.links.new(at.outputs["Fac"], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
    return 1


def ground(holder, floor=0.0):
    """Stand a figure on the floor: soles (shoes and body only) at z = floor, after two depsgraph passes."""
    bpy.context.view_layer.update()
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    lo = 1e9
    for o in [holder] + list(holder.children_recursive):
        if o.type != "MESH" or not (o.name == holder["body"] or "shoes" in o.name):
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = o.matrix_world
        lo = min([lo] + [(mw @ v.co).z for v in me.vertices])
        ev.to_mesh_clear()
    holder.location.z += floor - lo
    bpy.context.view_layer.update()
    return lo - floor


def eye_centre(holder):
    """Between the eyes, from the head bone itself (4 cm up the bone, 7.5 cm out of the face). The statue-eye objects'
    bone-parented matrices read stale from Python here (a gaze solved on them went to the ceiling), as the inspection
    room found too."""
    bpy.context.view_layer.update()
    rig = _rig(holder)
    m = rig.pose.bones["head"].matrix
    return rig.matrix_world @ (m.translation + m.to_3x3().col[1].normalized() * 0.04 + m.to_3x3().col[2].normalized() * 0.075)


def face_local(holder):
    """The face's forward line in the head bone's frame, measured at rest (the statue looks level along -Y)."""
    if "face_local" not in holder:
        rig = _rig(holder)
        rigged.pose_figure(holder, {})
        Mh = rig.pose.bones["head"].matrix.to_3x3().normalized()
        fwd = rig.matrix_world.to_3x3().normalized().inverted() @ (holder.matrix_world.to_3x3().normalized() @ Vector((0, -1, 0)))
        holder["face_local"] = list((Mh.inverted() @ fwd.normalized()).normalized())
    return Vector(holder["face_local"])


def face_dir(holder):
    rig = _rig(holder)
    bpy.context.view_layer.update()
    return ((rig.matrix_world @ rig.pose.bones["head"].matrix).to_3x3().normalized() @ face_local(holder)).normalized()


def aim_head(holder, pose, target, max_turn=60, kw_eye=None):
    rig = _rig(holder)
    loc = face_local(holder)
    rigged.pose_figure(holder, dict(pose, head=(0, 0)))
    base = (rig.pose.bones["head"].matrix.to_3x3().normalized() @ loc).normalized()
    eye = kw_eye if kw_eye is not None else eye_centre(holder)
    R = rig.matrix_world.to_3x3().normalized()
    t = (R.inverted() @ (Vector(target) - eye)).normalized()
    rot = lambda d_, t_: Matrix.Rotation(math.radians(t_), 3, "Z") @ Matrix.Rotation(math.radians(d_), 3, "X")
    best = None
    for dn in range(-34, 46):
        for tn in range(-max_turn, max_turn + 1):
            e = (rot(dn, tn) @ base).angle(t)
            if best is None or e < best[0]:
                best = (e, (dn, tn))
    pose["head"] = best[1]
    rigged.pose_figure(holder, pose)
    return best[1]


def aim_head_iter(holder, pose, target, passes=2, **kw):
    eye = None
    for _ in range(passes):
        aim_head(holder, pose, target, kw_eye=eye, **kw)
        eye = eye_centre(holder)
    err = math.degrees(face_dir(holder).angle((Vector(target) - eye).normalized()))
    return err, pose["head"]


def _hand_verts(holder, side="L"):
    body = bpy.data.objects[holder["body"]]
    subs = [m for m in body.modifiers if m.type in ("SUBSURF", "MASK") and m.show_viewport]
    for m in subs:
        m.show_viewport = False
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    names = {g.index: g.name for g in body.vertex_groups if g.name.startswith("DEF-")}
    out = {"palm": [], "fingers": [], "thumb": []}
    for v, vo in zip(me.vertices, body.data.vertices):
        gs = [e for e in vo.groups if e.group in names]
        if not gs:
            continue
        g = max(gs, key=lambda e: e.weight)
        n = names[g.group]
        if not n.endswith("." + side) or g.weight < 0.3:
            continue
        key = ("thumb" if "thumb" in n else "fingers" if n.startswith("DEF-f_") else
               "palm" if n.startswith(("DEF-hand", "DEF-palm")) else None)
        if key:
            out[key].append(ev.matrix_world @ v.co)
    ev.to_mesh_clear()
    for m in subs:
        m.show_viewport = True
    bpy.context.view_layer.update()
    return out


def rest_hand(holder, pose, side, wrist_target, top_z, fwd_dir, *, curl, contact, palm_normal, clearance=0.018):
    """Solve a hand on the curved fabric or around the raised strap using posed mesh contacts."""
    rig = _rig(holder)
    k = side
    key = "l_arm" if k == "L" else "r_arm"
    sgn = 1 if k == "L" else -1
    arm_inv = rig.matrix_world.inverted()
    rigged.pose_figure(holder, pose)
    pb = rig.pose.bones
    sh = pb[f"upper_arm_fk.{k}"].head.copy()
    L1, L2 = pb[f"upper_arm_fk.{k}"].length, pb[f"forearm_fk.{k}"].length
    target = Vector(wrist_target)
    surf = top_z if callable(top_z) else (lambda x, y, z0=top_z: z0)
    hv = None
    for _ in range(4):
        wrist_error, pose[key] = rigged.fit_wrist(sh, arm_inv @ target, L1, L2, sgn, min_forward=0)
        rigged.pose_figure(holder, pose)
        R = rig.matrix_world.to_3x3().normalized().inverted()
        y = (R @ Vector(fwd_dir)).normalized()
        down = R @ Vector(palm_normal)
        down = (down - y * down.dot(y)).normalized()
        # the .L hand's X axis is its palm side; Rigify mirrors .R, whose X then points out of the back of the hand
        x = down if k == "L" else -down
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
        head = hb.matrix.translation.copy()
        hm = Matrix((x, y, z)).transposed().to_4x4()
        hm.translation = head
        hb.matrix = hm
        bpy.context.view_layer.update()
        for f, spread in (("f_index", -7), ("f_middle", -2), ("f_ring", 3), ("f_pinky", 8)):
            n = f"{f}.01_master.{k}"
            if n in pb:
                pb[n].rotation_mode = "XYZ"
                pb[n].rotation_euler.x = math.radians(curl)
                if curl > 45:
                    pb[n].scale.y = 0.72
                else:
                    pb[n].rotation_euler.z = math.radians(spread)
        if f"thumb.01_master.{k}" in pb:
            thumb = pb[f"thumb.01_master.{k}"]
            thumb.rotation_mode = "XYZ"
            thumb.rotation_euler.x = math.radians(36 if curl > 45 else 10)
            thumb.rotation_euler.z = math.radians(-12 if curl > 45 else -20)
        bpy.context.view_layer.update()
        if curl > 45:
            # The buyer closes the middle joints around the padded sleeve;
            # the thumb keeps its opposing contact on the near side.
            rigged.articulate_hand(holder, k, {digit: (48, 62, 36) for digit in
                                               ("f_index", "f_middle", "f_ring", "f_pinky")})
        hv = _hand_verts(holder, k)
        centre = sum(hv["palm"], Vector()) / len(hv["palm"])
        correction = contact - centre
        if callable(top_z):
            # The stallholder's hand has just released the nylon. Measure the air gap under the heel.
            palm_low = min(p.z - top_z(p.x, p.y) for p in hv["palm"])
            correction.z = clearance - palm_low
        target += correction
    gap = lambda p: p.z - surf(p.x, p.y)
    return dict(arm=pose[key], fit=wrist_error, palm_low=min(gap(p) for p in hv["palm"]),
                finger_low=min(gap(p) for p in hv["fingers"]),
                palm=sum(hv["palm"], Vector()) / max(1, len(hv["palm"])))


# ---------------------------------------------------------------- the cast
def build_cast():
    d = people.dawn()
    o = people.man("Organiser", age=0.4, suit="male_casualsuit03", tone=(0.1, 0.1, 0.11), shoes="shoes04")
    s = people.man("Stallholder", height_cm=167, age=0.66, weight=0.7, suit="male_casualsuit05",
                   tone=(0.20, 0.17, 0.12), shoes="shoes04")
    holders = {"Dawn": d, "Organiser": o, "Stallholder": s}
    for n, h in holders.items():
        hands_stone(h, value={"Organiser": 0.27, "Stallholder": 0.39}.get(n, 0.33))
        (pos, tgt) = BLOCKING["buy"][n]
        place(h, (pos[0], pos[1], 0.0), facing(pos, tgt))
        rigged.pose_figure(h, {"fingers": 30})
        print(f"MARKET grounded {n} by {-ground(h, FLOOR[n]) * 1000:+.1f} mm", flush=True)
        _STATE["cast"] += [h] + list(h.children_recursive)
    _STATE["holders"] = holders


def block(beat):
    for n, h in _STATE["holders"].items():
        spot = BLOCKING[beat].get(n)
        if spot is None:
            continue
        (pos, tgt) = spot
        h.location.x, h.location.y = pos
        h.rotation_euler.z = math.radians(facing(pos, tgt))
        bpy.context.view_layer.update()
        fl = (LOOK_FLOOR if beat == "look" else FLOOR).get(n, 0.0)
        ground(h, fl)


def pose_buy():
    H = _STATE["holders"]
    o, s, d = H["Organiser"], H["Stallholder"], H["Dawn"]
    rep = []
    # the stallholder: leaning a little over his counter, eyes on the organiser, his left hand flat on the bag's top
    # near his end, pushing it across (fingers toward the customer); his right arm easy at his side
    sp = {"chest": (10, 2), "r_arm": (-6, 5, 10), "fingers": 45}
    ge = aim_head_iter(s, sp, eye_centre(o) + Vector((0, 0, 0.0)))
    wx, wy = BX + 0.31, BY + 0.05
    push = Vector((wx, wy, bag_top(wx, wy) + 0.004))
    hs = rest_hand(s, sp, "L", push + Vector((0.10, 0, 0.12)), bag_top,
                   Vector((-0.90, 0.06, 0.44)).normalized(), curl=22,
                   contact=push + Vector((0.06, 0, 0.08)), palm_normal=(-0.55, 0.10, 0.45), clearance=0.10)
    rep.append(f"stallholder head {ge[1]} err {ge[0]:.1f}; l_arm {tuple(round(v) for v in hs['arm'])} fit {hs['fit'] * 1000:.0f} mm "
               f"palm {hs['palm_low'] * 1000:.0f} fingers {hs['finger_low'] * 1000:.0f} mm")
    # the organiser: eyes on the stallholder, his right hand coming onto the bag's near end, fingers curling to take it
    op = {"chest": (7, 0), "l_arm": (1, 3, 6), "fingers": 26}
    go = aim_head_iter(o, op, eye_centre(s))
    grip = _STATE["grip"]
    ho = rest_hand(o, op, "R", grip + Vector((-0.055, -0.02, 0.028)), grip.z,
                   Vector((0.9, 0.12, -0.28)).normalized(), curl=78,
                   contact=grip + Vector((-0.0045, -0.0023, 0.0147)), palm_normal=(0.05, 0.55, -0.82))
    rep.append(f"organiser head {go[1]} err {go[0]:.1f}; r_arm {tuple(round(v) for v in ho['arm'])} fit {ho['fit'] * 1000:.0f} mm "
               f"palm {ho['palm_low'] * 1000:.0f} fingers {ho['finger_low'] * 1000:.0f} mm")
    # Dawn: a step back in the lane, weight on one hip, hands loosely together in front, watching the bag change hands
    dp = {"chest": (3, 2), "l_arm": (4, 6, 14), "r_arm": (6, -12, 62), "fingers": 42}
    gd = aim_head_iter(d, dp, Vector((BX - 0.1, BY, TOP + 0.3)))
    rep.append(f"Dawn head {gd[1]} err {gd[0]:.1f}")
    print("MARKET pose buy: " + "; ".join(rep), flush=True)


def pose_look():
    d = _STATE["holders"]["Dawn"]
    # looking up at the bags high on the back wall, her chin lifted, arms easy
    dp = {"chest": (-8, 0), "l_arm": (4, 7, 12), "r_arm": (12, 8, 35), "fingers": 40}
    gd = aim_head_iter(d, dp, Vector((3.58, 6.35, 2.65)))
    print(f"MARKET pose look: Dawn head {gd[1]} err {gd[0]:.1f}", flush=True)


def snapshot(holder):
    rig = _rig(holder)
    return {b.name: b.matrix_basis.copy() for b in rig.pose.bones}


def restore(holder, snap):
    rig = _rig(holder)
    for b in rig.pose.bones:
        if b.name in snap:
            b.matrix_basis = snap[b.name]
    bpy.context.view_layer.update()


def pose_cast(beat):
    H = _STATE["holders"]
    cache = _STATE["cache"]
    if beat in cache:
        for n, (loc, rz, snap) in cache[beat].items():
            H[n].location = loc
            H[n].rotation_euler.z = rz
            restore(H[n], snap)
        return
    block(beat)
    (pose_buy if beat == "buy" else pose_look)()
    cache[beat] = {n: (h.location.copy(), h.rotation_euler.z, snapshot(h)) for n, h in H.items()}


# ---------------------------------------------------------------- per camera
def which_camera():
    cam = bpy.context.scene.camera
    if cam is None:
        return None
    for n, c in CAMERAS.items():
        if (cam.location - Vector(c["loc"])).length < 1e-3:
            return n
    return None


def apply_camera(name):
    cfg = CAMERAS.get(name, {})
    beat = cfg.get("beat", "buy")
    H = _STATE["holders"]
    if H:
        pose_cast(beat)
        show = cfg.get("show")
        for n, h in H.items():
            vis = show is None or n in show
            for o in [h] + list(h.children_recursive):
                o.hide_render = not vis
        e = bpy.data.objects.get("fx_dawn")
        if e is not None:
            e.location = eye_centre(H["Dawn"])
    for ln, li in st.LIGHTS.items():
        base = li.get("base_energy")
        if base is None:
            li["base_energy"] = li.data.energy
            base = li.data.energy
        li.data.energy = base * TRIMS.get(name, {}).get(ln, 1.0)
    hz = st.OBJ.get("haze")
    if hz is not None:   # thicker air down the lane for the wide, where it gives the battens' light a shape
        pv = next(n for n in hz.data.materials[0].node_tree.nodes if n.type == "PRINCIPLED_VOLUME")
        pv.inputs["Density"].default_value = cfg.get("haze", 0.004)
    sc = bpy.context.scene
    sc.cycles.sample_clamp_indirect = 2.5
    sc.cycles.blur_glossy = 0.5
    sc.cycles.volume_step_rate = 2.0
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_input_passes", "RGB_ALBEDO_NORMAL")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    for o in [o for o in bpy.data.objects if o.type == "CAMERA"]:
        o.data.clip_end = 200.0
        o.data.clip_start = 0.02
    print(f"MARKET camera {name}: beat {beat}, shown {cfg.get('show', 'all')}", flush=True)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        kw.setdefault("world", WORLD)
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def build(cast=True):
    st.build()
    hero_bag()
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    _STATE["holders"], _STATE["cast"], _STATE["cache"] = {}, [], {}
    if cast:
        build_cast()
    install_hook()
