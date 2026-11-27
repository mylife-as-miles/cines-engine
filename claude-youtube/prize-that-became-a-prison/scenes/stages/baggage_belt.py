"""Stage: airside baggage handling at night (Ch 04 to Ch 05: after the check-in, the bags go on without her).

A long belt conveyor runs down a low, tunnel-like baggage hall: it comes out of the check-in side through a rubber
strip curtain in the end wall and rides away into the dark, past a sorter chute, under fluorescent battens that thin
out and die toward the far end. Dawn's two bags (her charcoal soft case lying on its back, the black extra bag) ride it
among other people's bags (recoloured copies of the same two models, so none matches hers, and a hard-shell case built
here), every bag with a blank paper airline tag. No people. Stills; camera motion comes later.

    <bpy python> -I scenes/shoot.py -- baggage_belt <cam> out.png [--nocast]

Cameras: curtain (her two bags coming through the strip curtain), belt (low along the belt, her bags leading the
others away into the dark), overhead (straight down on the belt at the sorter, her bags among the others).
Each camera carries its own layout of the bags on the belt; before each render the stage puts the bags there and
lays the curtain strips over whatever is pushing through them (shoot.py calls setkit.render once per camera, which
this module wraps). Set and materials: baggage_belt_set.py.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402

import props  # noqa: E402
import setkit as sk  # noqa: E402
import baggage_belt_set as st  # noqa: E402

BZ = st.BZ
EXPOSURE = -1.5
WORLD = 0.0

# ---------------------------------------------------------------- the bags
# Dawn's two bags take the grade the inspection room gives them (continuity). The others are copies of the same
# models recoloured by tint (the texture's own detail kept, normalised so the fabric lands on the tint), at other
# sizes, so none can be taken for hers.
DAWN = {
    "dawn_case": dict(src="dawn-suitcase", size=0.66, axis="z", lying=True,
                      grade=dict(sat=0.6, val=0.9, rough_add=0.15), spec=0.2),
    # (val 0.25, the inspection room's value under its troffer, was a pure black blob in this hall: the brief's
    # table value 0.35 keeps it black with its seams and straps still readable under the battens)
    "dawn_duffel": dict(src="extra-bag-closed", size=0.75, axis="long", lying=False,
                        grade=dict(sat=0.5, val=0.35, rough_add=0.3), spec=0.1),
}
OTHERS = {   # copy of, scale (x, y, z) relative to the source, body tint (linear albedo)
    "navy_case": ("dawn_case", (1.12, 1.08, 1.1), (0.010, 0.016, 0.042)),
    "oxblood_case": ("dawn_case", (0.86, 0.9, 0.86), (0.055, 0.013, 0.012)),
    "tan_case": ("dawn_case", (1.04, 1.12, 1.04), (0.12, 0.08, 0.045)),
    "olive_duffel": ("dawn_duffel", (0.84, 0.88, 0.86), (0.032, 0.034, 0.016)),
    "stone_duffel": ("dawn_duffel", (0.95, 1.0, 0.92), (0.15, 0.14, 0.12)),
}
SHELL = "shell_case"
FABRIC_MEDIAN = 0.03     # linear luminance of both bag textures' fabric (measured: sRGB median 0.19-0.20)

# tags: start (local x, y as fractions of the bag's half length / half width), heading (deg from +X), length (m)
# (the soft case's box includes its pulled-out handle: its body ends about 0.19 m short of the -X end)
TAGS = {
    "dawn_case": ((-0.05, 0.3), 184, 0.3),
    "dawn_duffel": ((0.02, 0.0), 58, 0.18),
    "navy_case": ((-0.1, -0.3), 174, 0.3),
    "oxblood_case": ((-0.05, 0.2), 190, 0.27),
    "tan_case": ((-0.1, 0.0), 180, 0.28),
    "olive_duffel": ((-0.1, 0.05), -66, 0.21),
    "stone_duffel": ((0.12, -0.05), 112, 0.22),
    "shell_case": ((-0.5, 0.2), 176, 0.24),
}

# ---------------------------------------------------------------- layouts per camera: bag -> (x, y, turn deg)
# The belt runs toward +X. Her extra bag went on first, her case after it: in every layout the duffel is about
# 1.3 m ahead of the case, the duffel toward the walkway side (-Y), the case toward the chute side (+Y).
LAYOUT = {
    # her soft case half through the curtain (the strips draped over it), the extra bag ahead of it on the rollers
    "curtain": {"dawn_case": (0.10, 0.20, 3.0), "dawn_duffel": (1.35, -0.24, -6.0)},
    # her two bags nearest, then a gap, then other people's bags ahead of them, away down the belt into the dark
    "belt": {"dawn_case": (3.0, 0.18, -3.0), "dawn_duffel": (4.35, -0.22, 5.0), "navy_case": (7.9, 0.1, 5.0),
             "shell_case": (10.4, -0.12, -7.0), "tan_case": (12.9, 0.06, 3.0), "stone_duffel": (15.6, -0.05, 84.0),
             "olive_duffel": (18.2, 0.07, -4.0), "oxblood_case": (20.8, -0.06, 8.0)},
    # straight down at the sorter: an olive duffel, her case, her extra bag, a navy case
    "overhead": {"olive_duffel": (8.47, -0.08, 4.0), "dawn_case": (9.45, 0.18, -4.0),
                 "dawn_duffel": (10.72, -0.22, 3.0), "navy_case": (11.74, 0.05, 86.0)},
}
CAM_FOCUS = {"curtain": "focus_curtain", "belt": "focus_belt", "overhead": "focus_over"}
CAMERAS = {
    # Ch 04 end: from over the belt, looking back at the end wall. Her soft case pushes out through the strips (lit
    # from the room behind), her extra bag ahead of it on the transfer rollers; the control panel's glow on the left.
    # (First version: from the walkway, three-quarter. The guards are as high as the bags, so they hid them, and a
    # photo-eye post stood in front of her case.)
    "curtain": dict(loc=(3.7, 0.22, 1.15), aim=(0.7, 0.0, 0.95), lens=35, focus="focus_curtain", fstop=4.0,
                    exposure=-1.35),
    # Ch 05 open: low over the belt on its centre line, one-point down the tunnel: her two bags nearest, the others
    # ahead of them, the battens thinning out and dying toward the far wall
    # (at 1.02 m, 11 cm over the guards, their inner faces filled both lower corners: 1.15 m keeps it low and
    # turns them into two leading lines)
    "belt": dict(loc=(0.9, 0.0, 1.15), aim=(14.0, -0.02, 0.23), lens=32, focus="focus_belt", fstop=4.0,
                 exposure=-1.2),
    # Ch 04/05: straight down on the belt at the sorter chute; her two bags among the others
    "overhead": dict(loc=(10.05, 0.06, 3.22), aim=(10.05, 0.0601, BZ), lens=20, focus="focus_over", fstop=8.0,
                     exposure=-1.5),
}

_STATE = {"roots": {}, "parts": {}}


# ---------------------------------------------------------------- bag building
def _meshes(ob):
    return [o for o in [ob] + list(ob.children_recursive) if o.type == "MESH"]


def _verts_world(objs):
    bpy.context.view_layer.update()
    out = []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        a = np.empty(len(me.vertices) * 3, np.float32)
        me.vertices.foreach_get("co", a)
        a = a.reshape(-1, 3)
        mw = np.array(o.matrix_world)
        out.append(a @ mw[:3, :3].T + mw[:3, 3])
        ev.to_mesh_clear()
    return np.concatenate(out) if out else np.zeros((0, 3))


def seat(holder, name):
    """Put a bag under a root empty (the root sits on the belt where the layout says): the bag centred on the root,
    its lowest point at the root's z."""
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    holder.parent = root
    holder.matrix_parent_inverse = Matrix.Identity(4)
    bpy.context.view_layer.update()
    v = _verts_world(_meshes(holder))
    lo, hi = v.min(0), v.max(0)
    holder.location = (holder.location.x - (lo[0] + hi[0]) / 2, holder.location.y - (lo[1] + hi[1]) / 2,
                       holder.location.z - lo[2])
    bpy.context.view_layer.update()
    root["half"] = [float((hi[0] - lo[0]) / 2), float((hi[1] - lo[1]) / 2), float(hi[2] - lo[2])]
    return root


def finish(holder, spec):
    """Cut the generated plastic sheen (dark fabric reads grey under the battens otherwise), no clear coat."""
    seen = set()
    for o in _meshes(holder):
        for slot in o.material_slots:
            m = slot.material
            if not m or m.name in seen or not m.use_nodes:
                continue
            seen.add(m.name)
            b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if b is None:
                continue
            if "Coat Weight" in b.inputs:
                b.inputs["Coat Weight"].default_value = 0.0
            if "tripo" in m.name:
                b.inputs["Specular IOR Level"].default_value = spec


def recolour(src, name, tint):
    """A copy of a bag material whose base colour is the tint scaled by the texture's own luminance (so seams,
    pockets and creases stay), the bright hardware (zip pulls, buckles) kept neutral metal."""
    m = src.copy()
    m.name = name
    nt = m.node_tree
    b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    tex = next((n for n in nt.nodes if n.type == "TEX_IMAGE" and n.image and n.image.name.startswith("Color")), None)
    if b is None or tex is None:
        b.inputs["Base Color"].default_value = (*tint, 1)
        return m
    bw = nt.nodes.new("ShaderNodeRGBToBW")
    nt.links.new(tex.outputs["Color"], bw.inputs[0])
    norm = st._math(nt, "MULTIPLY", bw.outputs[0], 1.0 / FABRIC_MEDIAN)
    norm_c = st._math(nt, "MINIMUM", norm, 2.6)
    tinted = nt.nodes.new("ShaderNodeMix")
    tinted.data_type = "RGBA"
    tinted.blend_type = "MULTIPLY"
    st._in(tinted, "Factor", "VALUE").default_value = 1.0
    st._in(tinted, "A", "RGBA").default_value = (*tint, 1)
    nt.links.new(st._comb(nt, norm_c, norm_c, norm_c), st._in(tinted, "B", "RGBA"))
    hw = st._range(nt, norm, 3.0, 7.0, 0.0, 1.0)
    col = st._mix(nt, hw, st._out(tinted, "Result", "RGBA"), tex.outputs["Color"])
    nt.links.new(col, b.inputs["Base Color"])
    b.inputs["Specular IOR Level"].default_value = 0.25
    return m


def clone(holder, name, tint, scale):
    """A copy of a loaded bag (sharing its meshes and textures) with its own recoloured materials and size."""
    mp = {}
    nh = holder.copy()
    bpy.context.scene.collection.objects.link(nh)
    mp[holder] = nh
    for o in holder.children_recursive:
        c = o.copy()
        bpy.context.scene.collection.objects.link(c)
        mp[o] = c
    for o, c in mp.items():
        if o.parent in mp:
            c.parent = mp[o.parent]
    nh.name = name + "_bag"
    nh.scale = tuple(s * k for s, k in zip(holder.scale, scale))
    cache = {}
    for o, c in mp.items():
        if c.type != "MESH":
            continue
        for slot in c.material_slots:
            src = slot.material
            if src is None:
                continue
            if src.name not in cache:
                if "tripo" in src.name:
                    cache[src.name] = recolour(src, f"{name} {src.name[:20]}", tint)
                else:   # the side webbing: plain nylon in the bag's colour
                    w = src.copy()
                    w.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*(t * 0.7 for t in tint), 1)
                    cache[src.name] = w
            slot.link = "OBJECT"
            slot.material = cache[src.name]
    return nh


def shell_case(name):
    """A hard-shell spinner case built here, lying on its back: two pale polycarbonate shells either side of a dark
    zip band, raised ribs on the lid, a side carry handle, the handle housing at one end, four spinner wheels at the
    other."""
    m = st.materials()
    pc = st.pbr("polycarbonate shell", (0.30, 0.31, 0.32), (0.22, 0.42), metal=0.35, nscale=6, cvar=0.1, coat=0.4,
                chips=((0.12, 0.12, 0.125), 0.25))
    holder = bpy.data.objects.new(name + "_bag", None)
    bpy.context.scene.collection.objects.link(holder)
    L, W, Hh = 0.70, 0.46, 0.27
    parts = [
        st.box(name + "_lower", (L, W, 0.125), (0, 0, 0.0625), pc, bevel=0.045, segs=6),
        st.box(name + "_upper", (L, W, 0.13), (0, 0, Hh - 0.065), pc, bevel=0.045, segs=6),
        st.box(name + "_zip", (L - 0.012, W - 0.012, 0.03), (0, 0, 0.128), m["rubber"], bevel=0.02, segs=4),
    ]
    rib = st.Batch()
    for yy in (-0.13, -0.045, 0.045, 0.13):
        rib.box((L - 0.16, 0.022, 0.012), (0, yy, Hh - 0.002))
    parts.append(rib.done(name + "_ribs", pc, bevel=0.005))
    hw = st.Batch()
    for s in (-1, 1):        # handle housing at the -X end: two bars and a cap
        hw.box((0.03, 0.03, 0.04), (-L / 2 + 0.004, s * 0.1, 0.05))
    hw.box((0.02, 0.26, 0.05), (-L / 2 - 0.004, 0, 0.06))
    for s in (-1, 1):        # spinner wheel housings at the +X end
        for zz in (0.04, 0.2):
            hw.box((0.05, 0.07, 0.06), (L / 2 + 0.012, s * (W / 2 - 0.06), zz))
    parts.append(hw.done(name + "_hardware", m["plastic"], bevel=0.008))
    wh = st.Batch()
    for s in (-1, 1):
        for zz in (0.04, 0.2):
            for dy in (-0.017, 0.017):
                wh.rod((L / 2 + 0.05, s * (W / 2 - 0.06) + dy - 0.008, zz), (L / 2 + 0.05, s * (W / 2 - 0.06) + dy + 0.008, zz),
                       0.026, 20)
    parts.append(wh.done(name + "_wheels", m["rubber"], bevel=0.004))
    parts.append(sk.arc(name + "_handle", (-0.11, W / 2 + 0.005, 0.135), (0.11, W / 2 + 0.005, 0.135), 0.0, m["plastic"],
                        r=0.012))
    hd = parts[-1]
    hd.data.splines[0].bezier_points[1].co = (0, W / 2 + 0.035, 0.135)
    for p in parts:
        p.parent = holder
    return holder


def _upper_hull(pts):
    """Upper convex hull of (s, z) points sorted by s: where a taut strip of paper touches a lumpy surface."""
    hull = []
    for q in pts:
        while len(hull) >= 2:
            (s1, z1), (s2, z2) = hull[-2], hull[-1]
            if (s2 - s1) * (q[1] - z1) - (z2 - z1) * (q[0] - s1) >= 0:
                hull.pop()
            else:
                break
        hull.append(q)
    return hull


def tag(root, spec, rnd):
    """A blank airline bag tag: a pale paper strip lying across the bag from its handle and over the edge. The strip
    is stiff paper, so it bridges straps, zips and creases (the upper hull of the bag's profile along its line, found
    by ray casts in the root's frame) and hangs a little way down the side where it runs off the bag."""
    (fx, fy), head, length = spec
    hx, hy, hz = root["half"]
    objs = [o for o in _meshes(root) if not o.name.startswith("tag_")]
    inv = root.matrix_world.inverted()
    bpy.context.view_layer.update()
    verts, polys = [], []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = inv @ o.matrix_world
        off = len(verts)
        verts += [mw @ v.co for v in me.vertices]
        polys += [[off + i for i in p.vertices] for p in me.polygons]
        ev.to_mesh_clear()
    bvh = BVHTree.FromPolygons(verts, polys)
    a = math.radians(head)
    d = Vector((math.cos(a), math.sin(a), 0))
    side = Vector((-d.y, d.x, 0))
    w = 0.04
    p0 = Vector((fx * hx, fy * hy, 0))
    step = 0.006
    prof = []                       # (s, z): the highest of three casts across the strip's width
    for i in range(int(length / step) + 1):
        q = p0 + d * (i * step)
        zs = [h[0].z for h in (bvh.ray_cast(Vector((q.x + k * side.x, q.y + k * side.y, 1.5)), Vector((0, 0, -1)), 2.0)
                               for k in (-w * 0.4, 0.0, w * 0.4)) if h[0] is not None]
        if not zs:
            if len(prof) >= 4:
                break
            continue
        if len(prof) >= 4 and max(zs) < prof[-1][1] - 0.035:     # over the edge
            break
        prof.append((i * step, max(zs)))
    if len(prof) < 4:
        return None
    hull = _upper_hull(prof)
    pts = []
    k = 0
    for s_, _z in prof:
        while k < len(hull) - 2 and hull[k + 1][0] < s_:
            k += 1
        (s1, z1), (s2, z2) = hull[k], hull[k + 1]
        z = z1 + (z2 - z1) * (s_ - s1) / max(1e-9, s2 - s1)
        pts.append(p0 + d * s_ + Vector((0, 0, z + 0.0025)))
    # off the edge: a short bend, then the tail hangs (never below the belt)
    left = length - prof[-1][0]
    hang = min(left, 0.085, max(0.0, pts[-1].z - 0.012))
    if hang > 0.012:
        e, r = pts[-1], 0.016
        for j in range(1, 7):
            t = (math.pi / 2) * j / 6
            pts.append(e + d * (r * math.sin(t)) + Vector((0, 0, -r * (1 - math.cos(t)))))
        n = max(2, int((hang - r) / 0.012))
        base = pts[-1]
        sway = rnd.uniform(0.12, 0.4)
        for j in range(1, n + 1):
            dz = (hang - r) * j / n
            pts.append(base + Vector((0, 0, -dz)) + d * (sway * dz))
    curl = rnd.uniform(-0.004, 0.004)
    vs, fs = [], []
    for i, q in enumerate(pts):
        t = i / (len(pts) - 1)
        lift = Vector((0, 0, curl * math.sin(t * math.pi * 2)))      # the paper is never perfectly flat
        vs += [q - side * (w / 2) + lift, q + side * (w / 2) - lift]
        if i:
            k = 2 * i
            fs.append((k - 2, k - 1, k + 1, k))
    me = bpy.data.meshes.new("tag_" + root.name)
    me.from_pydata([tuple(v) for v in vs], [], fs)
    for f in me.polygons:
        f.use_smooth = True
    ob = bpy.data.objects.new("tag_" + root.name, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(st.materials()["paper"])
    so = ob.modifiers.new("paper", "SOLIDIFY")
    so.thickness, so.offset = 0.0006, 1.0
    ob.parent = root
    ob.matrix_parent_inverse = Matrix.Identity(4)
    return ob


def build_bags():
    roots, rnd = {}, random.Random(5)
    loaded = {}
    for name, d in DAWN.items():
        h = props.load(d["src"], size=d["size"], axis=d["axis"], loc=(0, 0, 0), **d["grade"])
        finish(h, d["spec"])
        loaded[name] = h
    # copies first (they must copy the upright, unseated holders)
    holders = {}
    for name, (src, scale, tint) in OTHERS.items():
        holders[name] = (clone(loaded[src], name, tint, scale), DAWN[src]["lying"])
    for name, h in loaded.items():
        holders[name] = (h, DAWN[name]["lying"])
    holders[SHELL] = (shell_case(SHELL), False)
    for name, (h, lying) in holders.items():
        if lying:   # on its back: the front pocket up, the handle end toward -X
            h.rotation_euler = (0, math.radians(-90), 0)
        roots[name] = seat(h, name)
    for name, r in roots.items():
        tag(r, TAGS[name], rnd)
    _STATE["roots"] = roots
    return roots


def set_layout(cam):
    lay = LAYOUT.get(cam, LAYOUT["belt"])
    for name, r in _STATE["roots"].items():
        on = name in lay
        if on:
            x, y, t = lay[name]
            r.location = (x, y, BZ)
            r.rotation_euler = (0, 0, math.radians(t))
        for o in [r] + list(r.children_recursive):
            o.hide_render = not on
    bpy.context.view_layer.update()
    visible = [o for name in lay for o in _meshes(_STATE["roots"][name]) if not o.name.startswith("tag_")]
    st.drape_strips(visible)
    # the belt's lacing seam rides with the bags: always 0.58 m ahead of her extra bag, the next ones 7.1 m apart
    seam = lay["dawn_duffel"][0] + 0.58
    for i, ob in enumerate(st.LACING_OBS):
        x = seam + (i - 1) * 7.1
        ob.location.x = x
        ob.hide_render = not (st.TRANSFER[1] + 0.25 < x < st.X1 - 0.3)
    # focus: the bag the camera is about, at the middle of its top
    target = {"curtain": "dawn_duffel", "belt": "dawn_case", "overhead": "dawn_case"}.get(cam, "dawn_case")
    r = _STATE["roots"][target]
    if cam == "curtain":    # between the two: f/4 holds both
        a, b = _STATE["roots"]["dawn_case"].location, r.location
        st.focus("focus_curtain", ((a.x * 0.45 + b.x * 0.55), (a.y + b.y) / 2, BZ + 0.2))
    elif cam == "belt":
        st.focus("focus_belt", (r.location.x, r.location.y, BZ + 0.2))
    else:
        st.focus("focus_over", (r.location.x, r.location.y, BZ + 0.22))


# ---------------------------------------------------------------- per camera
def which_camera():
    cam = bpy.context.scene.camera
    if cam is None:
        return None
    for n, c in CAMERAS.items():
        if (cam.location - Vector(c["loc"])).length < 1e-3:
            return n
    return None


def render_settings():
    sc = bpy.context.scene
    c = sc.cycles
    c.sample_clamp_indirect = 3.0
    c.blur_glossy = 0.5
    c.volume_step_rate = 2.0
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH"),
                 ("denoising_input_passes", "RGB_ALBEDO_NORMAL")):
        try:
            setattr(c, k, v)
        except (AttributeError, TypeError):
            pass


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        cam = which_camera()
        set_layout(cam)
        # the DOF focus empty moved: re-point the camera at it (shoot.py bound it at camera creation)
        c = bpy.context.scene.camera
        fname = CAM_FOCUS.get(cam)
        if c is not None and fname and fname in bpy.data.objects:
            c.data.dof.focus_object = bpy.data.objects[fname]
        render_settings()
        kw.setdefault("world", WORLD)
        print(f"BAGGAGE camera {cam}: layout {sorted(LAYOUT.get(cam, {}))}", flush=True)
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def build(cast=True):
    """No people in this stage: `cast` is ignored."""
    st.build()
    build_bags()
    for n in ("focus_curtain", "focus_belt", "focus_over"):
        st.focus(n, (0, 0, BZ))
    set_layout("belt")
    install_hook()
