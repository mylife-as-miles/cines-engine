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
BAG_TURN = 0.0

# where the cast stands and what each faces, per beat ("buy": at the counter; "look": Dawn inside, at the wall)
BLOCKING = {
    "buy": {"Organiser": ((0.94, 5.10), (BX, 5.10)), "Stallholder": ((2.27, 5.11), (BX, 5.11)),
            "Dawn": ((0.10, 5.72), (BX - 0.1, BY))},
    "look": {"Dawn": ((2.05, 6.02), (3.6, 5.6))},
}
FLOOR = {"Stallholder": 0.006, "Dawn": 0.0, "Organiser": 0.0}
LOOK_FLOOR = {"Dawn": 0.006}

FOCUS = {"fx_wide": (0.9, 5.2, 1.35), "fx_bag": (BX, BY - 0.08, TOP + 0.28), "fx_dawn": (2.0, 6.0, 1.55)}

CAMERAS = {
    # Ch 04: down the lane from the dark end, from the left-hand row: shut stalls both sides, wet concrete, the one
    # burning stall front at mid distance on the right, the organiser at its counter and Dawn a step back, small
    "wide": dict(loc=(-0.78, -6.9, 1.72), aim=(0.2, 5.8, 1.5), lens=28, focus="fx_wide", fstop=8.0, beat="buy",
                 exposure=-1.0),
    # Ch 04: from the lane into the stall: Dawn looking up at the wall of handbags under the battens
    "stall": dict(loc=(-0.92, 4.95, 0.9), aim=(3.6, 5.5, 1.2), lens=24, focus="fx_dawn", fstop=4.0, beat="look",
                  show=("Dawn",), exposure=-1.5),
    # Ch 04: the controlled close-up from the alley: the black extra bag passing over the counter, the stallholder's
    # hand pushing it across, the organiser's hand taking it; the wall of bags soft beyond
    "purchase": dict(loc=(1.57, 3.55, 1.6), aim=(1.62, 4.93, 1.17), lens=50, focus="fx_bag", fstop=3.2, beat="buy",
                     exposure=-1.6),
}
TRIMS = {"wide": {"hero_lane": 1.35}, "purchase": {"hero_alley": 2.0}}

_STATE = {"holders": {}, "cast": [], "cache": {}, "bag": None}


# ---------------------------------------------------------------- the hero bag
def hero_bag():
    h = props.load("extra-bag-closed", size=0.75, axis="long", loc=(BX, BY, TOP), turn_deg=BAG_TURN,
                   sat=0.5, val=0.3, rough_add=0.35)
    seen = set()
    for o in h.children_recursive:
        if o.type != "MESH":
            continue
        for s in o.material_slots:
            if s.material and s.material.name not in seen:
                seen.add(s.material.name)
                mt.tune_prop(s.material, spec=0.08)
    _STATE["bag"] = h
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


def rest_hand(holder, pose, side, wrist_target, top_z, fwd_dir, curl=4.0):
    """Lay one hand palm-down on a surface at top_z (a number, or a function of (x, y) for a curved top), wrist near
    wrist_target, fingers along fwd_dir: solve the arm on the rig's bone lengths, pronate the forearm, set the hand,
    then measure the hand's vertices and correct the height so the palm touches (about 2 mm). From check-in."""
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
    pitch = 0.0
    hv = None
    best = None
    for attempt in range(3):
        t_arm = arm_inv @ target
        best = None
        grid = [(f, o, e) for f in range(0, 91, 3) for o in range(-32, 34, 3) for e in range(0, 121, 3)]
        for step in (None, 0.5):
            if step:
                f0, o0, e0 = best[1]
                grid = [(f0 + a * step, o0 + b * step, e0 + c * step) for a in range(-6, 7) for b in range(-6, 7) for c in range(-6, 7)]
            for fwd, out, el in grid:
                w = sh + L1 * rigged._dir(0, fwd, sgn, out) + L2 * rigged._dir(0, fwd + el, sgn, out * 0.6)
                e = (w - t_arm).length
                if best is None or e < best[0]:
                    best = (e, (fwd, out, el))
        pose[key] = best[1]
        rigged.pose_figure(holder, pose)
        R = rig.matrix_world.to_3x3().normalized().inverted()
        y = (R @ Vector(fwd_dir)).normalized()
        down = R @ Vector((0, 0, -1))
        down = (down - y * down.dot(y)).normalized()
        zp = down.cross(y)                     # the pitch axis, the same for either hand
        if pitch:
            q = Matrix.Rotation(pitch, 3, zp)
            down, y = (q @ down).normalized(), (q @ y).normalized()
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
        for f in ("f_index", "f_middle", "f_ring", "f_pinky"):
            n = f"{f}.01_master.{k}"
            if n in pb:
                pb[n].rotation_mode = "XYZ"
                pb[n].rotation_euler.x = math.radians(curl)
        bpy.context.view_layer.update()
        hv = _hand_verts(holder, k)
        # clearance of every palm and finger vertex over the surface under it
        gap = lambda p: p.z - surf(p.x, p.y)
        low = min(gap(p) for p in hv["palm"] + hv["fingers"])
        palm_low, finger_low = min(gap(p) for p in hv["palm"]), min(gap(p) for p in hv["fingers"])
        if attempt < 2:
            pitch = max(-0.22, min(0.22, pitch + 0.85 * math.atan2(palm_low - finger_low, 0.08)))
            low = min(low, palm_low - 0.85 * (palm_low - finger_low) * 0.5)
            target = target + Vector((0, 0, 0.002 - low))
    gap = lambda p: p.z - surf(p.x, p.y)
    return dict(arm=pose[key], fit=best[0], palm_low=min(gap(p) for p in hv["palm"]),
                finger_low=min(gap(p) for p in hv["fingers"]),
                palm=sum(hv["palm"], Vector()) / max(1, len(hv["palm"])))


# ---------------------------------------------------------------- the cast
def build_cast():
    d = people.dawn()
    o = people.man("Organiser", age=0.4, suit="male_casualsuit03", tone=(0.1, 0.1, 0.11), shoes="shoes04")
    s = people.man("Stallholder", height_cm=167, age=0.66, weight=0.7, suit="male_casualsuit05",
                   tone=(0.125, 0.118, 0.1), shoes="shoes04")
    holders = {"Dawn": d, "Organiser": o, "Stallholder": s}
    for n, h in holders.items():
        hands_stone(h)
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
    sp = {"chest": (13, 0), "r_arm": (6, 7, 18), "fingers": 22}
    ge = aim_head_iter(s, sp, eye_centre(o) + Vector((0, 0, 0.0)))
    wx, wy = BX + 0.35, BY - 0.04
    hs = rest_hand(s, sp, "L", (wx, wy, bag_top(wx - 0.08, wy) + 0.05), bag_top, Vector((-1, 0.1, 0)).normalized(), curl=8.0)
    rep.append(f"stallholder head {ge[1]} err {ge[0]:.1f}; l_arm {tuple(round(v) for v in hs['arm'])} fit {hs['fit'] * 1000:.0f} mm "
               f"palm {hs['palm_low'] * 1000:.0f} fingers {hs['finger_low'] * 1000:.0f} mm")
    # the organiser: eyes on the stallholder, his right hand coming onto the bag's near end, fingers curling to take it
    op = {"chest": (7, 0), "l_arm": (5, 8, 16), "fingers": 26}
    go = aim_head_iter(o, op, eye_centre(s))
    wx, wy = BX - 0.29, BY - 0.04
    ho = rest_hand(o, op, "R", (wx, wy, bag_top(wx + 0.08, wy) + 0.05), bag_top, Vector((1, -0.08, 0)).normalized(), curl=11.0)
    rep.append(f"organiser head {go[1]} err {go[0]:.1f}; r_arm {tuple(round(v) for v in ho['arm'])} fit {ho['fit'] * 1000:.0f} mm "
               f"palm {ho['palm_low'] * 1000:.0f} fingers {ho['finger_low'] * 1000:.0f} mm")
    # Dawn: a step back in the lane, weight on one hip, hands loosely together in front, watching the bag change hands
    dp = {"chest": (3, 2), "l_arm": (5, 7, 14), "r_arm": (3, 6, 10), "fingers": 38}
    gd = aim_head_iter(d, dp, Vector((BX - 0.1, BY, TOP + 0.3)))
    rep.append(f"Dawn head {gd[1]} err {gd[0]:.1f}")
    print("MARKET pose buy: " + "; ".join(rep), flush=True)


def pose_look():
    d = _STATE["holders"]["Dawn"]
    # looking up at the bags high on the back wall, her chin lifted, arms easy
    dp = {"chest": (-4, 0), "l_arm": (4, 7, 12), "r_arm": (5, 6, 16), "fingers": 34}
    gd = aim_head_iter(d, dp, Vector((3.58, 5.55, 2.33)))
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
