"""Stage: Chicago at night, the life before (Ch 01 "A woman who loved to travel").

A high-floor apartment at night: a wall of glass onto a procedural night city (chicago_night_city: layered dark
towers with scattered lit windows, a downtown cluster, the grid of streets below as rivers of light, nothing
recognisable), a walnut console desk with a warm table lamp (the film's warmest light), the entry door with the
corridor's light under it, and Dawn's suitcase standing by the door, handle up, ready for the trip. Dawn
(people.dawn()) stands at the glass with a mug in both hands, looking out at the city: calm, hopeful, ordinary.

The script asks not to invent an image of Dawn at work, so she is at home, and the "reception desk" of the
visual notes becomes a console desk (the room's lit island).

Cameras (beat ch01):
  wide      from the room's far corner: the lamp-lit console and the door with the suitcase on the left, the glass
            wall and the city across the frame, Dawn small at the window on the right third
  window    behind Dawn and a little to her left: her figure dark against the skyline, a warm edge from the lamp
  suitcase  a low, controlled close-up: the packed case by the door, the city soft in the glass beyond

    <bpy python> -I scenes/shoot.py -- chicago_night <cam> out.png [--nocast]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import cast as castkit  # noqa: E402
import people  # noqa: E402
import props  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import chicago_night_city as city  # noqa: E402
import chicago_night_set as st  # noqa: E402

EXPOSURE = -1.5

DAWN = (0.51, 1.93, 190.0)                 # where she stands (footprint) and her facing: out of the window (+Y)
MUG = (0.11, 0.32, 1.05)                   # the mug in her right hand: her frame (x to her right, y forward, z up)
LOOK = (-650.0, 1200.0, 70.0)              # the downtown cluster, a little left of it

FOCUS = {
    "fx_dawn": (DAWN[0], DAWN[1], 1.2),
    "fx_head": (DAWN[0] - 0.05, DAWN[1], 1.55),
    "fx_case": (st.CASE[0], st.CASE[1], 0.42),
}

CAMERAS = {
    # Ch 01: the whole room from its far corner at a standing eye line: the warm lamp island and the door with the
    # suitcase on the left, the glass wall and the night city across, Dawn small at the window on the right third
    "wide": dict(loc=(2.7, -2.42, 1.6), aim=(-1.15, 1.75, 1.0), lens=24, focus="fx_dawn", fstop=5.6, beat="ch01",
                 exposure=-1.0),
    # Ch 01: behind her, a little to her left and below her eyes: her figure dark against the lit skyline
    "window": dict(loc=(0.05, 0.22, 1.45), aim=(0.15, 2.45, 1.33), lens=28, focus="fx_head", fstop=2.8, beat="ch01",
                   exposure=-0.9),
    # Ch 01: low and close: the packed case by the door, the city soft in the glass beyond
    "suitcase": dict(loc=(-1.0, -0.95, 0.55), aim=(-2.75, 1.95, 0.47), lens=40, focus="fx_case", fstop=2.0, beat="ch01",
                     exposure=-1.1),
}
TRIMS = {"wide": {}, "window": {}, "suitcase": {}}
_STATE = {"cast": [], "dawn": None}


# ---------------------------------------------------------------- Dawn: finish, place, pose (from inspection_room)

def cloth(holder, item, rough=0.9, bump=0.25):
    """A garment finished as plain matt cloth: the normal map (whose fine stripes shimmer in wide shots) dropped
    for a woven-noise bump, almost no specular."""
    ob = bpy.data.objects.get(f"{holder.name}_{item}")
    if ob is None:
        return None
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
        b.inputs["Sheen Weight"].default_value = 0.0
        b.inputs["Specular IOR Level"].default_value = 0.05
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 400.0
        nz.inputs["Detail"].default_value = 2.0
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = bump
        bp.inputs["Distance"].default_value = 0.0004
        nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return ob


def hem_thickness(ob, t=0.006):
    so = ob.modifiers.new("cloth_thickness", "SOLIDIFY")
    so.thickness, so.offset, so.use_even_offset = t, 1.0, False
    so.use_quality_normals = True
    sub = next((i for i, md in enumerate(ob.modifiers) if md.type == "SUBSURF"), None)
    if sub is not None:
        ob.modifiers.move(len(ob.modifiers) - 1, sub)


def hands_stone(holder, value=0.36):
    """The hands a shade darker stone than the face, blended by the hand's deform weights (no seam)."""
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
    mix.inputs["A"].default_value = b.inputs["Base Color"].default_value
    mix.inputs["B"].default_value = (value, value, value * 1.01, 1.0)
    nt.links.new(at.outputs["Fac"], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
    return 1


def dawn():
    h = people.dawn()
    n = castkit.blouse_v(h, rgb=(0.2, 0.19, 0.18), depth=0.42, width=0.14)
    bl = bpy.data.materials.get(f"blouse_{h.name}")
    if bl is not None:
        bb = bl.node_tree.nodes["Principled BSDF"]
        bb.inputs["Specular IOR Level"].default_value = 0.05
        bb.inputs["Roughness"].default_value = 0.92
    suit = cloth(h, "female_elegantsuit01")
    if suit is not None:
        hem_thickness(suit, 0.006)
    bun = bpy.data.objects.get(f"{h['body']}_bun")
    if bun is not None:
        bun.data.transform(Matrix.Translation((0.0, -0.025, -0.02)))
    hands_stone(h)
    print(f"CHICAGO Dawn: blouse {n} vertices", flush=True)
    return h


def ground(holder):
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
    holder.location.z -= lo
    bpy.context.view_layer.update()
    return lo


def _arm_dirs(fwd, out, side):
    f, o = np.radians(fwd), np.radians(out)
    return np.stack([side * np.cos(f) * np.sin(o), -np.sin(f), -np.cos(f) * np.cos(o)], axis=-1)


def solve_arm(holder, side, target, prefer=(40.0, 8.0, 80.0), fwd=(-10, 100), elbow=(0, 140), out=(-12, 40)):
    """(forward, out, elbow) for rigged.pose_figure that puts the palm's centre on `target` (world). From
    inspection_room: analytic forward kinematics of pose_figure's arm, searched on a grid, pulled to `prefer`."""
    rig = rigged.rig_of(holder)
    k = "L" if side > 0 else "R"
    pb = rig.pose.bones
    S = np.array(pb[f"upper_arm_fk.{k}"].head)
    L1, L2, L3 = (pb[f"{b}.{k}"].length for b in ("upper_arm_fk", "forearm_fk", "hand_fk"))
    T = np.array(rig.matrix_world.inverted() @ Vector(target))
    F, O, E = np.meshgrid(np.arange(fwd[0], fwd[1] + 1, 2.0), np.arange(out[0], out[1] + 1, 2.0), np.arange(elbow[0], elbow[1] + 1, 2.0),
                          indexing="ij")
    palm = S + L1 * _arm_dirs(F, O, side) + L2 * _arm_dirs(F + E, O * 0.6, side) + 0.5 * L3 * _arm_dirs(F + E + 4, O * 0.4, side)
    err = np.linalg.norm(palm - T, axis=-1)
    cost = err + 0.0004 * (np.abs(F - prefer[0]) + np.abs(O - prefer[1]) + 0.5 * np.abs(E - prefer[2]))
    i = np.unravel_index(np.argmin(cost), cost.shape)
    return (float(F[i]), float(O[i]), float(E[i])), float(err[i])


def eye_centre(holder):
    rig = rigged.rig_of(holder)
    m = rig.pose.bones["head"].matrix
    p = m.translation + m.to_3x3().col[1].normalized() * 0.04 + m.to_3x3().col[2].normalized() * 0.075
    return rig.matrix_world @ p


def head_forward(holder):
    rig = rigged.rig_of(holder)
    m = rig.pose.bones["head"].matrix.to_3x3()
    return (rig.matrix_world.to_3x3() @ m.col[2]).normalized()


def _roll(holder, bone, deg):
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones[bone]
    m = pb.matrix.copy()
    head = m.translation.copy()
    axis = (m.to_3x3() @ Vector((0, 1, 0))).normalized()
    pb.matrix = Matrix.Translation(head) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-head) @ m
    bpy.context.view_layer.update()


def palm_normal(holder, side):
    rig = rigged.rig_of(holder)
    k = "L" if side > 0 else "R"
    pb = rig.pose.bones
    mw = rig.matrix_world
    hand = pb[f"hand_fk.{k}"]
    a = (mw.to_3x3() @ (hand.tail - hand.head)).normalized()
    fb = pb.get(f"f_middle.01_master.{k}")
    if fb is None:
        return None, a
    f = (mw.to_3x3() @ (fb.tail - fb.head)).normalized()
    n = f - a * f.dot(a)
    return (n.normalized() if n.length > 1e-4 else None), a


def _w(local):
    """Her frame (x to her right, y forward, z up) to world, for where she stands."""
    x, y, f = DAWN
    a = math.radians(f)
    fwd = Vector((math.sin(a), -math.cos(a), 0.0))        # built facing -Y, turned by f
    right = Vector((-fwd.y, fwd.x, 0.0)) * -1.0
    return Vector((x, y, 0.0)) + right * local[0] + fwd * local[1] + Vector((0, 0, local[2]))


CURL = {"R": {"f_index": (26, 34), "f_middle": (30, 38), "f_ring": (32, 40), "f_pinky": (34, 42), "thumb": (6, 16)},
        "L": {"f_index": (10, 12), "f_middle": (12, 15), "f_ring": (14, 17), "f_pinky": (15, 19), "thumb": (0, 8)}}


def curl_fingers(holder):
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    for k, fingers in CURL.items():
        for f, (knuckle, joint) in fingers.items():
            for n, deg in ((f"{f}.01_master.{k}", knuckle), (f"{f}.02.{k}", joint), (f"{f}.03.{k}", joint)):
                if n in pb and deg:
                    pb[n].rotation_mode = "XYZ"
                    pb[n].rotation_euler.x = math.radians(deg)
    bpy.context.view_layer.update()


def pose_dawn(h):
    """Standing at the glass, a mug in her right hand at her waist, the left arm loose at her side, her head turned
    a little toward the towers and lifted a touch: calm, looking out."""
    x, y, f = DAWN
    h.location = (x, y, 0.0)
    h.rotation_euler = (0, 0, math.radians(f))
    bpy.context.view_layer.update()
    base = {"chest": (-2.0, -4.0), "neck": (0.0, 0.0), "fingers": 0, "l_arm": (5.0, 7.0, 16.0)}
    rigged.pose_figure(h, base)
    mug = _w(MUG)
    right = (_w((1, 0, 0)) - _w((0, 0, 0))).normalized()
    fwd = (_w((0, 1, 0)) - _w((0, 0, 0))).normalized()
    tr = mug + right * 0.052 - fwd * 0.006
    ra, er = solve_arm(h, -1, tr, prefer=(22.0, 6.0, 80.0), fwd=(5, 70), elbow=(40, 130))
    pose = dict(base, r_arm=ra)
    d, t = -3.0, 0.0
    tgt = Vector(LOOK)
    for _ in range(4):
        pose["head"] = (d, t)
        rigged.pose_figure(h, pose)
        e, fw = eye_centre(h), head_forward(h)
        g = (tgt - e).normalized()
        dy = math.degrees(math.atan2(g.y, g.x) - math.atan2(fw.y, fw.x))
        dy = (dy + 180) % 360 - 180
        dp = math.degrees(math.asin(max(-1, min(1, fw.z))) - math.asin(max(-1, min(1, g.z))))
        t = max(-40.0, min(40.0, t + dy))
        d = max(-15.0, min(30.0, d + dp))
    pose["head"] = (round(d, 1), round(t, 1))
    rigged.pose_figure(h, pose)
    # the right palm turned in to the mug (forearm roll), fingers round it; the left hand loosely curled
    n, a = palm_normal(h, -1)
    want = -right
    phi = 0.0
    if n is not None:
        c = a.cross(n)
        phi = math.degrees(math.atan2(c.dot(want), n.dot(want) - a.dot(n) * a.dot(want)))
        _roll(h, "forearm_fk.R", max(-110.0, min(110.0, phi)))
    curl_fingers(h)
    lo = ground(h)
    print(f"CHICAGO Dawn pose: r_arm {ra} ({er * 1000:.0f} mm), roll {phi:.0f}, head {pose['head']}, "
          f"grounded by {lo * 1000:+.0f} mm", flush=True)
    return mug


def mug_prop(c):
    m = sk.mat("mug glaze", (0.42, 0.4, 0.37), 0.3)
    r, hgt = 0.041, 0.095
    st.lathe("mug", [(0.0, 0.004), (r - 0.004, 0.0), (r, 0.006), (r, hgt), (r - 0.004, hgt), (r - 0.004, 0.01), (0.0, 0.01)],
             (c.x, c.y, c.z - hgt / 2), m, segs=40)
    # the handle points forward, away from her (between her fingers)
    fwd = (_w((0, 1, 0)) - _w((0, 0, 0))).normalized()
    p0 = c + fwd * (r - 0.004) + Vector((0, 0, 0.028))
    p1 = c + fwd * (r + 0.025) + Vector((0, 0, 0.0))
    p2 = c + fwd * (r - 0.004) + Vector((0, 0, -0.028))
    st.tube("mug_handle", [tuple(p0), tuple(p0 + fwd * 0.02), tuple(p1), tuple(p2 + fwd * 0.02), tuple(p2)], 0.006, m, res=4)


# ---------------------------------------------------------------- per camera

def apply_camera(name):
    sc = bpy.context.scene
    sc.cycles.sample_clamp_indirect = 3.0
    sc.cycles.blur_glossy = 0.5
    sc.cycles.transparent_max_bounces = 16
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH"),
                 ("denoising_input_passes", "RGB_ALBEDO_NORMAL")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    trims = TRIMS.get(name, {})
    for n, base in _STATE.get("base", {}).items():
        o = bpy.data.objects.get(n)
        if o is not None:
            o.data.energy = base * trims.get(n, 1.0)
    print(f"CHICAGO camera {name}: trims {trims}", flush=True)


def which_camera():
    cam = bpy.context.scene.camera
    if cam is None:
        return None
    for n, c in CAMERAS.items():
        if (cam.location - Vector(c["loc"])).length < 1e-3:
            return n
    return None


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def build(cast=True):
    st.M.clear()
    st.build(props)
    city.build()
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    _STATE["cast"] = []
    if cast:
        h = dawn()
        mug = pose_dawn(h)
        mug_prop(mug)
        _STATE["dawn"] = h
        _STATE["cast"] = [h] + list(h.children_recursive)
        bpy.data.objects["fx_head"].location = eye_centre(h) + Vector((0, 0, 0.0))
    _STATE["base"] = {o.name: o.data.energy for o in bpy.data.objects if o.type == "LIGHT"}
    install_hook()
