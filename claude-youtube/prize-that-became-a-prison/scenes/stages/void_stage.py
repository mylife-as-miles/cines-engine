"""Stage: the Void Stage (20 % of the film: Ch 07 the sentence, Ch 08 what twelve years can take, Ch 11 the end).

An infinite black stage: a black-painted hardboard floor that runs off into the dark on every side, one hard spotlight
straight down from high above, faint haze that gives the beam its cone, nothing else unless the beat needs it.

    <bpy python> -I scenes/shoot.py -- void_stage <cam> out.png [--nocast]

Three islands stand far apart on the one floor, each under its own spot, and a hook on setkit.render shows only the
island the camera's beat needs (shoot.py calls render once per camera, so `--cam all` works):

- Ch 07 (dawn, dawn_high): Dawn alone in the pool of light in her prison greys, head bowed, arms down.
- Ch 08 (cell_close, cell_far): the cell as a lit box: a slab, three painted-block walls (the fourth open, as on a
  set), no ceiling, the steel bunk along one wall, a stainless toilet-basin unit in the back corner, a narrow high
  window slot whose cold light lays the barred slot across the floor. Close inside, then from far back, small in the
  black.
- Ch 11 (bags): the two bags, Dawn's charcoal case standing and the black duffel on its side, alone in the spotlight.

Set and materials in void_stage_set.py. Dawn comes from scenes/people.py (the film's shared cast); this stage only
finishes, poses and places her.
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

import people  # noqa: E402
import props  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import void_stage_set as st  # noqa: E402

EXPOSURE = -1.5

# the three islands, far apart on the one floor (x, y of each island's centre)
AT = {"dawn": (0.0, 0.0), "cell": (40.0, 0.0), "bags": (-40.0, 0.0)}

# the spots: height above the island, offset of the lamp toward the camera (-y), pool radius on the floor, watts
# (E = P / (4 pi d^2); the stone skin's crown and the cell's floor land near 1.0 and 0.5 after the exposure)
SPOTS = {
    "dawn": dict(h=7.5, fwd=1.1, pool=1.2, watts=11500.0, blend=0.18),
    # the cell's lamp nearly over the middle, its edge soft: the floor burns, the walls fall off upward into the dark
    # and the wall tops take a gentle line of light instead of a hard cone edge
    "cell": dict(h=7.6, fwd=0.3, pool=2.6, watts=13500.0, blend=0.45),
    "bags": dict(h=5.8, fwd=0.55, pool=1.15, watts=6000.0, blend=0.18),
}
# faint: 0.02-0.03 read as a grey wall behind the subject (round 1); the beam should be a ghost, not a slab
HAZE = {"dawn": 0.012, "cell": 0.006, "bags": 0.011}

DAWN_TURN = 18.0     # she faces the camera, turned a little to frame right (deg from facing -Y)
# head slightly bowed (15 + 5 read as looking straight ahead from chest height; 27 + 11 as hanging), shoulders a
# little forward, arms hanging loose with the hands just in front of the thighs, fingers curled
POSE = {"head": (20, 3), "neck": (8, 0), "chest": (6, 0), "l_arm": (7, 7, 14), "r_arm": (9, 6, 19), "fingers": 40}

# the bags (island-local x, y, turn): the case standing, its front pocket turned three-quarters to the lens; the
# duffel on its side beside it, a little forward, angled
CASE = (-0.24, 0.06, -58.0)
DUFFEL = (0.27, -0.12, 17.0)
# the bunk along the cell's left wall, its head against the back wall; its depth trimmed to a cell bunk's 0.98 m
BUNK_DEPTH = 0.82

D, C, G = AT["dawn"], AT["cell"], AT["bags"]


def _p(base, x, y, z):
    return (base[0] + x, base[1] + y, z)


FOCUS = {
    "fx_dawn": _p(D, 0.0, 0.0, 1.35),
    "fx_dawn_high": _p(D, 0.0, 0.0, 0.9),
    "fx_cell_close": _p(C, -0.55, 0.9, 1.0),
    "fx_cell_far": _p(C, 0.0, 0.0, 1.2),
    "fx_bags": _p(G, 0.0, 0.0, 0.35),
}
CAMERAS = {
    # Ch 07: Dawn alone in the pool of light, square on at chest height from the dark: the beam coming down out of the
    # black onto her bowed head, her shadow pooled at her feet, black on every side
    "dawn": dict(loc=_p(D, 0.0, -7.6, 1.2), aim=_p(D, 0.0, 0.0, 1.02), lens=50, focus="fx_dawn", fstop=4.0,
                 beat="dawn"),
    # Ch 07 (added): from high and to one side, looking down: a small figure on the floor's circle of light, the
    # stage running off into the dark around her
    "dawn_high": dict(loc=_p(D, 3.6, -5.3, 6.1), aim=_p(D, 0.0, -0.1, 0.55), lens=40, focus="fx_dawn_high",
                      fstop=5.6, beat="dawn"),
    # Ch 08: inside the cell from the open side at standing height: the bunk running into the back corner, the window
    # slot high in the back wall, its cold blade of light across the haze to the floor, the steel unit beyond
    "cell_close": dict(loc=_p(C, 0.85, -1.85, 1.4), aim=_p(C, -0.3, 1.5, 0.9), lens=20, focus="fx_cell_close",
                       fstop=5.6, beat="cell"),
    # Ch 08: far back and a little above: the lit cell a small open box in the black, the beam standing over it
    "cell_far": dict(loc=_p(C, 5.0, -23.5, 6.2), aim=_p(C, 0.0, 0.2, 1.55), lens=50, focus="fx_cell_far", fstop=8.0,
                     beat="cell"),
    # Ch 11: the end: the two bags alone in the spotlight on black, the beam behind them
    "bags": dict(loc=_p(G, 0.15, -4.7, 0.92), aim=_p(G, 0.02, 0.0, 0.5), lens=50, focus="fx_bags", fstop=4.0,
                 beat="bags"),
}

# a preview run may render only some cameras: VOID_CAMS="dawn,cell_close" (shoot.py's `all` walks CAMERAS)
if os.environ.get("VOID_CAMS"):
    CAMERAS = {k: v for k, v in CAMERAS.items() if k in os.environ["VOID_CAMS"].split(",")}

_STATE = {"groups": {}, "cast": []}


# ---------------------------------------------------------------- Dawn

def hands_stone(holder, value=0.4):
    """The hands a shade darker stone than the face (as in the inspection room): under a top light the backs of the
    hands face the lamp and the face does not. A soft mask from the hands' deform weights, so no seam at the wrist."""
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
    a_in = next(s for s in mix.inputs if s.name == "A" and s.enabled)
    b_in = next(s for s in mix.inputs if s.name == "B" and s.enabled)
    f_in = next(s for s in mix.inputs if s.name == "Factor" and s.enabled)
    src = b.inputs["Base Color"]
    if src.is_linked:
        nt.links.new(src.links[0].from_socket, a_in)
    else:
        a_in.default_value = src.default_value
    b_in.default_value = (value, value, value * 1.01, 1.0)
    nt.links.new(at.outputs["Fac"], f_in)
    out = next(s for s in mix.outputs if s.name == "Result" and s.enabled)
    nt.links.new(out, src)
    return 1


def cloth(holder, item, rough=0.85, bump=0.25):
    """A garment finished as plain matt cloth: its normal map (fine stripes shimmer at wide sizes) swapped for a
    woven-noise bump."""
    ob = bpy.data.objects.get(f"{holder.name}_{item}")
    if ob is None:
        print(f"VOID no garment {holder.name}_{item}", flush=True)
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
        b.inputs["Sheen Weight"].default_value = 0.3
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


def ground(holder, floor_z=0.0):
    """Stand a figure on the floor: its lowest point (the soles) at floor_z."""
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
    holder.location.z += floor_z - lo
    bpy.context.view_layer.update()
    return floor_z - lo


def dawn():
    h = people.dawn_prison()
    cloth(h, "female_casualsuit01", rough=0.86, bump=0.28)
    hands_stone(h)
    rigged.pose_figure(h, POSE)
    h.location = (D[0], D[1], 0.0)
    h.rotation_euler = (0, 0, math.radians(DAWN_TURN))
    bpy.context.view_layer.update()
    dz = ground(h)
    print(f"VOID Dawn grounded by {dz * 1000:+.1f} mm", flush=True)
    return h


# ---------------------------------------------------------------- props

def _meshes(h):
    return [o for o in h.children_recursive if o.type == "MESH"]


def _finish(h, spec=None, ceiling=None):
    seen = set()
    for o in _meshes(h):
        for slot in o.material_slots:
            if slot.material and slot.material.name not in seen:
                seen.add(slot.material.name)
                st.tune_prop(slot.material, spec=spec, ceiling=ceiling)


def bags():
    """The two bags with the inspection room's grade and finish (the sheen, not the colour, is what reads grey)."""
    gx, gy = G
    x, y, t = CASE
    case = props.load("dawn-suitcase", size=0.66, axis="z", loc=(gx + x, gy + y, 0.0), turn_deg=t, sat=0.6, val=0.9,
                      rough_add=0.15)
    _finish(case, spec=0.2, ceiling=(0.05, 0.052, 0.058))
    x, y, t = DUFFEL
    duf = props.load("extra-bag-closed", size=0.75, axis="long", loc=(gx + x, gy + y, 0.0), turn_deg=t, sat=0.5,
                     val=0.35, rough_add=0.3)
    _finish(duf, spec=0.12)
    return [case, duf]


def bunk():
    """The steel bunk along the cell's left wall, head to the back wall, its depth trimmed to a cell bunk's."""
    cx, cy = C
    h = props.load("bunk-bed", size=1.95, axis="long", loc=(0, 0, st.SLAB), sat=0.5, val=0.85, rough_add=0.12)
    _finish(h, spec=0.35)
    h.scale = (h.scale[0], h.scale[1] * BUNK_DEPTH, h.scale[2])
    depth = 1.196 * BUNK_DEPTH
    h.rotation_euler = (0, 0, math.radians(90.0))
    h.location = (cx - st.CX + depth / 2 + 0.03, cy + st.CY - 1.95 / 2 - 0.035, st.SLAB)
    bpy.context.view_layer.update()
    return h


# ---------------------------------------------------------------- build

def _island(name, fn):
    before = set(bpy.data.objects)
    fn()
    new = [o for o in bpy.data.objects if o not in before]
    _STATE["groups"].setdefault(name, []).extend(new)


def _spot_and_haze(name, aim_xy, aim_z=0.0, haze_box=None):
    cfg = SPOTS[name]
    ax, ay = aim_xy
    lamp = (ax, ay - cfg["fwd"], cfg["h"])
    reach = math.dist(lamp, (ax, ay, aim_z))
    size = 2 * math.degrees(math.atan(cfg["pool"] / reach))
    st.spot(f"spot_{name}", lamp, (ax, ay, aim_z), cfg["watts"], size, cfg["blend"])
    # the box starts under the floor: a bottom face lying on the floor (z = 0) blacked the floor out for any camera
    # outside the box (round 2: the pool under Dawn rendered 0-7 / 255)
    lo, hi = haze_box or ((ax - 5.0, ay - 5.0, -0.2), (ax + 5.0, ay + 5.0, cfg["h"] + 1.5))
    st.haze(f"haze_{name}", lo, hi, HAZE[name])


def build_dawn_island():
    _spot_and_haze("dawn", D)


def build_cell_island():
    cx, cy = C
    st.cell(cx, cy)
    st.combo_unit(cx + st.CX - 0.42, cy + st.CY, turn_deg=0.0)
    bunk()
    # the haze stops at the back wall's outer face, so the window source behind it lights only the slot's blade
    _spot_and_haze("cell", (cx, cy + 0.15), st.SLAB,
                   haze_box=((cx - 3.4, cy - 4.2, -0.2), (cx + 3.4, cy + st.CY + st.T, SPOTS["cell"]["h"] + 1.5)))


def build_bags_island():
    bags()
    _spot_and_haze("bags", (G[0] + 0.02, G[1]))


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
    beat = cfg.get("beat")
    for g, objs in _STATE["groups"].items():
        for o in objs:
            o.hide_render = beat is not None and g != beat
    sc = bpy.context.scene
    cam = sc.camera
    if cam is not None:
        cam.data.clip_start, cam.data.clip_end = 0.05, 300.0
        sx, sy = cfg.get("shift", (0.0, 0.0))
        cam.data.shift_x, cam.data.shift_y = sx, sy
    sc.cycles.sample_clamp_indirect = 3.0
    sc.cycles.blur_glossy = 0.5
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH"),
                 ("denoising_input_passes", "RGB_ALBEDO_NORMAL")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    print(f"VOID camera {name or '?'}: island {beat}", flush=True)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        kw.setdefault("world", 0.0)
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def build(cast=True):
    st.M.clear()
    st.LIGHTS.clear()
    _STATE["groups"] = {}
    _STATE["cast"] = []
    st.materials()
    st.floor()
    _island("dawn", build_dawn_island)
    _island("cell", build_cell_island)
    _island("bags", build_bags_island)
    if cast:
        _island("dawn", lambda: _STATE["cast"].append(dawn()))
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    install_hook()
