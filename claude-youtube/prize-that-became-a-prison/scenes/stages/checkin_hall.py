"""Stage: the airport check-in hall at night (Ch 04 "the gift inside the gift": the excess-baggage moment).

A row of six check-in positions along X, the passenger side toward -Y. Dawn's position (index 0, x = 0) is the last
one at the right end of the row and the only one open: a lit island in a dark terminal. Each position is a desk
(laminate front, dark solid-surface top, an agent's monitor glowing blank) and a baggage scale beside it (steel weigh
plate, a blank glowing weight display on a post, a rubber feed belt behind it into the collector belt that runs along
the back wall). Above the row a bulkhead carries the downlights and a blank lightbox sign per position. In front:
retractable-belt queue lanes, a trolley, a polished stone floor, suspended fluorescent fittings, a glazed end wall
with the apron at night beyond it.

No legible text anywhere: screens, displays and signs glow blank (motion graphics write OVERWEIGHT later).

Cameras: wide (the row in the hall), scale (the bags on the scale and the display), profile (Dawn side-on at the
counter with the agent), shoulder (over the agent's shoulder to Dawn, the extra one).
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import cast as castkit  # noqa: E402
import props  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402

sys.path.insert(0, HERE)
import checkin_hall_trolley  # noqa: E402
import people  # noqa: E402

# ---------------------------------------------------------------- layout (metres; counter front face at y = 0)
PITCH = 3.0
POSITIONS = [0.0 - PITCH * i for i in range(6)]   # desk centres; 0 is Dawn's (open), the row recedes to -X
LEDGE = 1.06          # passenger-side transaction ledge (top of the laminate front)
WORK = 0.92           # agent's work surface
PLATE = 0.302         # top of the scale's steel plate
SX = 1.23             # scale centre, relative to the desk centre
BELT_Y = (1.72, 2.28)  # collector belt, behind the agents
WALL_Y = 2.55         # back wall front face
HALL = dict(x0=-21.0, x1=8.0, y0=-14.0, H=5.5)
BULK = (-0.25, 3.2, 3.72)  # bulkhead over the whole row: front face y, underside z, top z

DAWN = (0.5, -0.22)   # a step from the counter, so her hand reaches the ledge with the elbow bent and clear of her side
AGENT = (0.02, 0.98)

EXPOSURE = -1.6
CAMERAS = {
    "wide": dict(loc=(4.4, -4.9, 2.10), aim=(-3.0, 1.0, 1.15), lens=27, focus="focus_dawn", fstop=5.6,
                 exposure=-1.4),   # a touch up: the far hall and the glazed end must not crush to black
    # the bags on the scale: panned clear of Dawn, focused on the duffel (the extra bag), the display the brightest thing
    "signs": dict(loc=(4.7, -3.65, 2.65), aim=(-2.1, -0.30, 3.39), lens=34, focus="focus_sign", fstop=4,
                  exposure=-1.6),
    "scale": dict(loc=(1.60, -1.98, 0.95), aim=(1.46, 0.46, 0.67), lens=46, focus="focus_duffel", fstop=2.8,
                  exposure=-2.0),
    "profile": dict(loc=(5.2, -0.38, 1.52), aim=(0.3, 0.2, 0.9), lens=45, focus="focus_dawn", fstop=2.8),
    "shoulder": dict(loc=(0.3, 1.68, 1.53), aim=(0.25, -0.3, 1.295), lens=50, focus="focus_dawn", fstop=2.4,
                     exposure=-2.65),   # her pale blouse and face fill this frame: hold them off white
}
MON = (-0.2, 0.5, 30.0)   # agent's monitor: centre x, y on the work surface, yaw (deg) of its face from +Y toward +X
POST = (SX + 0.57, 0.95)  # scale display post (relative to the desk centre): at the scale's back corner, clear of
                          # Dawn and of both bags in the profile, glowing beyond the bags in the scale shot

M = {}
COOL = (0.84, 0.92, 1.0)


# ---------------------------------------------------------------- node helpers
def _in(node, name, typ=None):
    for s in node.inputs:
        if s.name == name and (typ is None or s.type == typ) and s.enabled:
            return s
    return node.inputs[name]


def _out(node, name, typ=None):
    for s in node.outputs:
        if s.name == name and (typ is None or s.type == typ):
            return s
    return node.outputs[0]


def _noise(nt, vec, scale, detail=6.0, rough=0.6):
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = scale
    nz.inputs["Detail"].default_value = detail
    nz.inputs["Roughness"].default_value = rough
    nt.links.new(vec, nz.inputs["Vector"])
    return nz.outputs[0]


def _range(nt, val, a, b, lo, hi):
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = a, b
    mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = lo, hi
    nt.links.new(val, mr.inputs["Value"])
    return mr.outputs["Result"]


def _mix(nt, fac, a, b):
    mx = nt.nodes.new("ShaderNodeMix")
    mx.data_type = "RGBA"
    for sock, v in ((_in(mx, "A", "RGBA"), a), (_in(mx, "B", "RGBA"), b)):
        if isinstance(v, tuple):
            sock.default_value = (*v[:3], 1)
        else:
            nt.links.new(v, sock)
    if isinstance(fac, float):
        _in(mx, "Factor", "VALUE").default_value = fac
    else:
        nt.links.new(fac, _in(mx, "Factor", "VALUE"))
    return _out(mx, "Result", "RGBA")


def _fmix(nt, fac, a, b):
    """Float mix (a when fac = 0)."""
    mx = nt.nodes.new("ShaderNodeMix")
    mx.data_type = "FLOAT"
    fa, fb = _in(mx, "A", "VALUE"), _in(mx, "B", "VALUE")
    for sock, v in ((fa, a), (fb, b)):
        if isinstance(v, float):
            sock.default_value = v
        else:
            nt.links.new(v, sock)
    nt.links.new(fac, _in(mx, "Factor", "VALUE"))
    return _out(mx, "Result", "VALUE")


def pbr(name, rgb, rough=(0.4, 0.55), metal=0.0, nscale=4.0, stretch=(1, 1, 1), cvar=0.12, bump=0.0, bscale=90.0,
        aniso=0.0, coat=0.0, ribs=None, wear=None, smudge=None):
    """A principled material with roughness and tone variation (no surface reads as one flat value).

    wear=(kick_h, reveal_z): a scuffed kick zone from the floor to kick_h (darker, rougher, patchy) and a soft
    darkening band either side of a reveal at reveal_z (world heights). smudge=r: patches of hand grease at
    noise scale 3 that lift the roughness to r (counter tops)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Metallic"].default_value = metal
    b.inputs["Anisotropic"].default_value = aniso
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = 0.12
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = stretch
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    v = mp.outputs["Vector"]
    nz = _noise(nt, v, nscale)
    rough_s = _range(nt, nz, 0.32, 0.68, rough[0], rough[1])
    dark = tuple(c * (1 - cvar) for c in rgb)
    lite = tuple(min(1.0, c * (1 + cvar)) for c in rgb)
    col_s = _mix(nt, _range(nt, _noise(nt, v, nscale * 0.37, 4.0), 0.3, 0.7, 0.0, 1.0), dark, lite)
    if wear or smudge:
        geo = nt.nodes.new("ShaderNodeNewGeometry")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(geo.outputs["Position"], sep.inputs[0])
        wz = sep.outputs["Z"]
        patch = _range(nt, _noise(nt, geo.outputs["Position"], 3.0, 4.0, 0.55), 0.38, 0.62, 0.0, 1.0)
    if wear:
        kick_h, reveal_z = wear
        band = _range(nt, wz, kick_h * 0.35, kick_h, 1.0, 0.0)              # 1 at the floor, 0 above the kick zone
        mul = nt.nodes.new("ShaderNodeMath")
        mul.operation = "MULTIPLY"
        nt.links.new(band, mul.inputs[0])
        nt.links.new(_range(nt, patch, 0.0, 1.0, 0.45, 1.0), mul.inputs[1])
        scuff = mul.outputs[0]
        col_s = _mix(nt, scuff, col_s, tuple(c * 0.85 for c in rgb))
        rough_s = _fmix(nt, scuff, rough_s, min(1.0, rough[1] + 0.15))
        dist = nt.nodes.new("ShaderNodeMath")                                # soft grime either side of the reveal
        dist.operation = "ABSOLUTE"
        sub = nt.nodes.new("ShaderNodeMath")
        sub.operation = "SUBTRACT"
        nt.links.new(wz, sub.inputs[0])
        sub.inputs[1].default_value = reveal_z
        nt.links.new(sub.outputs[0], dist.inputs[0])
        col_s = _mix(nt, _range(nt, dist.outputs[0], 0.0, 0.06, 0.35, 0.0), col_s, tuple(c * 0.7 for c in rgb))
    if smudge:
        rough_s = _fmix(nt, _range(nt, patch, 0.55, 0.85, 0.0, 1.0), rough_s, smudge)
    nt.links.new(rough_s, b.inputs["Roughness"])
    nt.links.new(col_s, b.inputs["Base Color"])
    if bump or ribs:
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Distance"].default_value = 0.001
        if ribs:  # parallel ribs (rubber belts): bands across the run
            wv = nt.nodes.new("ShaderNodeTexWave")
            wv.bands_direction = ribs
            wv.inputs["Scale"].default_value = bscale
            wv.inputs["Distortion"].default_value = 0.0
            nt.links.new(tc.outputs["Object"], wv.inputs["Vector"])
            nt.links.new(wv.outputs[1], bp.inputs["Height"])
            bp.inputs["Strength"].default_value = bump or 0.3
        else:
            nt.links.new(_noise(nt, v, bscale, 3.0), bp.inputs["Height"])
            bp.inputs["Strength"].default_value = bump
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def floor_mat():
    """Polished terminal stone: 0.9 m tiles, two close tones, terrazzo fleck, wear lanes that dull the polish."""
    m = bpy.data.materials.new("terminal floor")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    v = tc.outputs["Object"]
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset, br.squash = 0.5, 1.0
    br.offset_frequency = 1
    br.inputs["Scale"].default_value = 1.0 / 0.9
    br.inputs["Brick Width"].default_value = 1.0
    br.inputs["Row Height"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.005
    br.inputs["Mortar Smooth"].default_value = 0.2
    br.inputs["Bias"].default_value = 0.0
    br.inputs["Color1"].default_value = (0.105, 0.108, 0.112, 1)
    br.inputs["Color2"].default_value = (0.085, 0.088, 0.092, 1)
    br.inputs["Mortar"].default_value = (0.035, 0.035, 0.037, 1)
    nt.links.new(v, br.inputs["Vector"])
    # terrazzo fleck: fine light and dark chips
    vo = nt.nodes.new("ShaderNodeTexVoronoi")
    vo.inputs["Scale"].default_value = 140.0
    nt.links.new(v, vo.inputs["Vector"])
    chip = _range(nt, _out(vo, "Distance"), 0.0, 0.18, 1.0, 0.0)
    col = _mix(nt, _range(nt, chip, 0.6, 0.9, 0.0, 0.3), _out(br, "Color", "RGBA"), (0.22, 0.22, 0.23))
    cloud = _range(nt, _noise(nt, v, 0.35, 3.0), 0.35, 0.65, 0.0, 1.0)
    col = _mix(nt, _range(nt, cloud, 0.0, 1.0, 0.0, 0.3), col, (0.05, 0.052, 0.055))
    nt.links.new(col, b.inputs["Base Color"])
    # roughness: polished (0.07-0.16), duller in worn lanes and scuffs, grout rough
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, 0.18, 1.0)      # lanes run along Y (passengers walk to the counters)
    nt.links.new(v, mp.inputs["Vector"])
    lanes = _range(nt, _noise(nt, mp.outputs["Vector"], 0.9, 2.0), 0.45, 0.7, 0.0, 1.0)
    fine = _range(nt, _noise(nt, v, 9.0, 8.0), 0.3, 0.7, 0.02, 0.06)
    r = _fmix(nt, _range(nt, lanes, 0.0, 1.0, 0.0, 0.6), fine, 0.16)
    r = _fmix(nt, _out(br, "Factor"), r, 0.55)
    nt.links.new(r, b.inputs["Roughness"])
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.25
    bp.inputs["Distance"].default_value = 0.002
    nt.links.new(_out(br, "Factor"), bp.inputs["Height"])
    bp.invert = True
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def ceiling_mat():
    """Linear metal slat ceiling, dark: slats along X with black gaps."""
    m = bpy.data.materials.new("slat ceiling")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    wv = nt.nodes.new("ShaderNodeTexWave")
    wv.bands_direction = "Y"
    wv.wave_profile = "SAW"
    wv.inputs["Scale"].default_value = 3.0
    wv.inputs["Distortion"].default_value = 0.0
    nt.links.new(tc.outputs["Object"], wv.inputs["Vector"])
    gap = _range(nt, wv.outputs[1], 0.86, 0.9, 0.0, 1.0)
    nt.links.new(_mix(nt, gap, (0.07, 0.075, 0.08), (0.004, 0.004, 0.005)), b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.45
    b.inputs["Metallic"].default_value = 0.6
    return m


def screen_mat(name, rgb, strength, falloff=0.35):
    """A blank glowing screen: brighter in the middle, falling off to the edges (no text, no UI)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    # vignette in the generated coordinates: 1 - falloff * (dx^2 + dz^2)
    acc = None
    for ax in ("X", "Z"):
        sub = nt.nodes.new("ShaderNodeMath")
        sub.operation = "SUBTRACT"
        nt.links.new(sep.outputs[ax], sub.inputs[0])
        sub.inputs[1].default_value = 0.5
        sq = nt.nodes.new("ShaderNodeMath")
        sq.operation = "MULTIPLY"
        nt.links.new(sub.outputs[0], sq.inputs[0])
        nt.links.new(sub.outputs[0], sq.inputs[1])
        if acc is None:
            acc = sq.outputs[0]
        else:
            ad = nt.nodes.new("ShaderNodeMath")
            nt.links.new(acc, ad.inputs[0])
            nt.links.new(sq.outputs[0], ad.inputs[1])
            acc = ad.outputs[0]
    st = _range(nt, acc, 0.0, 0.5, strength, strength * (1 - falloff))
    nt.links.new(st, em.inputs["Strength"])
    nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def sky_mat(name, strength):
    """Night outside the glazing: a glow that is brightest at the horizon (city and apron light, a little warm)
    and falls to a dark blue above, so the mullions silhouette against a gradient, not a flat card."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    h = _range(nt, sep.outputs["Z"], -0.5, 16.0, 0.0, 1.0)
    pw = nt.nodes.new("ShaderNodeMath")
    pw.operation = "POWER"
    nt.links.new(h, pw.inputs[0])
    pw.inputs[1].default_value = 0.6
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(_mix(nt, pw.outputs[0], (0.1, 0.092, 0.095), (0.03, 0.05, 0.1)), em.inputs["Color"])
    nt.links.new(_range(nt, pw.outputs[0], 0.0, 1.0, strength, strength * 0.25), em.inputs["Strength"])
    nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def stainless_plate():
    """The weigh plate: brushed stainless (grain along the belt, Y) with a fine diamond tread, no streaky tone noise."""
    m = bpy.data.materials.new("weigh plate stainless")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.6, 0.61, 0.63, 1)
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Anisotropic"].default_value = 0.5
    tg = nt.nodes.new("ShaderNodeTangent")
    tg.direction_type, tg.axis = "RADIAL", "X"           # on a horizontal plate: tangents along Y
    nt.links.new(tg.outputs[0], b.inputs["Tangent"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    v = tc.outputs["Object"]
    nt.links.new(_range(nt, _noise(nt, v, 7.0, 3.0), 0.3, 0.7, 0.29, 0.36), b.inputs["Roughness"])
    # diamond tread: |sin k(x+y)| * |sin k(x-y)|, 6 mm pitch
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(v, sep.inputs[0])
    prod = None
    for op in ("ADD", "SUBTRACT"):
        uv = nt.nodes.new("ShaderNodeMath")
        uv.operation = op
        nt.links.new(sep.outputs["X"], uv.inputs[0])
        nt.links.new(sep.outputs["Y"], uv.inputs[1])
        k = nt.nodes.new("ShaderNodeMath")
        k.operation = "MULTIPLY"
        nt.links.new(uv.outputs[0], k.inputs[0])
        k.inputs[1].default_value = math.pi / 0.006
        s = nt.nodes.new("ShaderNodeMath")
        s.operation = "SINE"
        nt.links.new(k.outputs[0], s.inputs[0])
        a = nt.nodes.new("ShaderNodeMath")
        a.operation = "ABSOLUTE"
        nt.links.new(s.outputs[0], a.inputs[0])
        if prod is None:
            prod = a.outputs[0]
        else:
            mu = nt.nodes.new("ShaderNodeMath")
            mu.operation = "MULTIPLY"
            nt.links.new(prod, mu.inputs[0])
            nt.links.new(a.outputs[0], mu.inputs[1])
            prod = mu.outputs[0]
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.08
    bp.inputs["Distance"].default_value = 0.0006
    nt.links.new(prod, bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def void_mat():
    m = bpy.data.materials.new("void")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.002, 0.002, 0.0025, 1)
    b.inputs["Roughness"].default_value = 1.0
    b.inputs["Specular IOR Level"].default_value = 0.0
    return m


def glass_mat():
    m = bpy.data.materials.new("glazing")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.8, 0.86, 0.88, 1)
    b.inputs["Roughness"].default_value = 0.03
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["IOR"].default_value = 1.5
    return m


def materials():
    if M:
        return M
    M.update(
        floor=floor_mat(),
        ceiling=ceiling_mat(),
        laminate=pbr("laminate front", (0.1, 0.097, 0.093), (0.35, 0.55), nscale=6, cvar=0.08, bump=0.04, bscale=300,
                     wear=(0.25, 0.7), smudge=0.6),
        laminate_side=pbr("laminate side", (0.052, 0.051, 0.05), (0.35, 0.55), nscale=6, cvar=0.08, bump=0.04, bscale=300,
                          wear=(0.25, 0.7), smudge=0.6),
        laminate_dark=pbr("laminate dark", (0.035, 0.036, 0.039), (0.35, 0.55), nscale=6, cvar=0.12, bump=0.04, bscale=300,
                          wear=(0.3, 0.7)),
        kick=pbr("kick plate", (0.012, 0.012, 0.013), (0.55, 0.75), nscale=12, cvar=0.2, wear=(0.1, 0.05)),
        painted=pbr("painted steel", (0.03, 0.032, 0.035), (0.4, 0.55), nscale=5, cvar=0.12, coat=0.15, wear=(0.2, 0.25)),
        stainless=stainless_plate(),
        void=void_mat(),
        pvc=pbr("pvc strip", (0.05, 0.055, 0.058), (0.3, 0.42), nscale=4, stretch=(1, 1, 0.2), cvar=0.15, coat=0.2),
        passport=pbr("passport cover", (0.021, 0.015, 0.025), (0.67, 0.76), nscale=30, cvar=0.1, bump=0.1, bscale=500),
        tray=pbr("grey tray", (0.11, 0.113, 0.118), (0.45, 0.6), nscale=9, cvar=0.1),
        top=pbr("dark solid surface", (0.028, 0.030, 0.034), (0.48, 0.59), nscale=40, cvar=0.09, coat=0.025, smudge=0.40),
        steel=pbr("brushed steel", (0.6, 0.61, 0.63), (0.22, 0.4), metal=1.0, nscale=3, stretch=(1, 30, 30), cvar=0.08, aniso=0.5),
        steel_y=pbr("longitudinal brushed steel", (0.53, 0.54, 0.56), (0.34, 0.49), metal=1.0,
                    nscale=3, stretch=(30, 1, 30), cvar=0.05, aniso=0.35),
        steel_worn=pbr("scuffed steel", (0.45, 0.46, 0.48), (0.3, 0.62), metal=1.0, nscale=7, stretch=(1, 6, 6), cvar=0.25, aniso=0.3),
        steel_dark=pbr("dull steel", (0.3, 0.305, 0.315), (0.55, 0.75), metal=1.0, nscale=7, stretch=(1, 6, 6), cvar=0.18, aniso=0.2),
        steel_v=pbr("brushed steel vertical", (0.6, 0.61, 0.63), (0.2, 0.34), metal=1.0, nscale=3, stretch=(30, 30, 1), cvar=0.06),
        satin=pbr("satin steel", (0.55, 0.56, 0.58), (0.24, 0.32), metal=1.0, nscale=60, cvar=0.04),
        chrome=pbr("satin queue steel", (0.34, 0.35, 0.36), (0.35, 0.45), metal=1.0, nscale=6, cvar=0.03),
        plate=pbr("weigh plate", (0.5, 0.51, 0.53), (0.25, 0.4), metal=1.0, nscale=9, stretch=(1, 120, 120), cvar=0.05, aniso=0.6,
                  bump=0.008, bscale=180),
        rubber=pbr("belt rubber", (0.016, 0.016, 0.018), (0.62, 0.8), nscale=5, cvar=0.25, bump=0.35, bscale=55, ribs="X"),
        belt=pbr("flat belt", (0.014, 0.014, 0.016), (0.75, 0.85), nscale=5, cvar=0.2, bump=0.12, bscale=160, ribs="Y"),
        rubber_y=pbr("belt rubber y", (0.016, 0.016, 0.018), (0.62, 0.8), nscale=5, cvar=0.25, bump=0.35, bscale=55, ribs="Y"),
        plastic=pbr("dark plastic", (0.028, 0.03, 0.033), (0.38, 0.5), nscale=8, cvar=0.1),
        plastic_mid=pbr("grey plastic", (0.12, 0.125, 0.13), (0.42, 0.55), nscale=8, cvar=0.08),
        screen_off=pbr("screen off", (0.006, 0.007, 0.009), (0.06, 0.12), nscale=10, cvar=0.05),
        wall=pbr("wall panel", (0.035, 0.038, 0.043), (0.5, 0.66), nscale=2.5, cvar=0.1, bump=0.03, bscale=200),
        wall_dark=pbr("upper wall", (0.03, 0.032, 0.036), (0.6, 0.75), nscale=1.5, cvar=0.12),
        bulk=pbr("bulkhead", (0.05, 0.053, 0.059), (0.5, 0.65), nscale=2.0, cvar=0.08),
        beam=pbr("ceiling beam", (0.06, 0.063, 0.068), (0.35, 0.5), metal=0.6, nscale=2.0, cvar=0.1),
        column=pbr("column cladding", (0.2, 0.205, 0.21), (0.3, 0.45), metal=0.0, nscale=2.0, cvar=0.08, coat=0.2),
        fabric=pbr("queue belt", (0.02, 0.026, 0.045), (0.7, 0.85), nscale=30, cvar=0.15, bump=0.15, bscale=400),
        iron=pbr("cast base", (0.018, 0.019, 0.02), (0.35, 0.55), metal=0.3, nscale=10, cvar=0.2),
        diffuser_off=pbr("diffuser off", (0.32, 0.33, 0.34), (0.5, 0.6), nscale=5, cvar=0.04),
        housing=pbr("fitting housing", (0.12, 0.125, 0.13), (0.35, 0.5), metal=0.8, nscale=4, cvar=0.08),
        glass=glass_mat(),
        mullion=pbr("mullion", (0.05, 0.053, 0.058), (0.3, 0.45), metal=0.8, nscale=3, cvar=0.08),
        tube=sk.emission("fluorescent", COOL, 5.0),
        tube_dim=sk.emission("fluorescent dim", COOL, 1.6),
        sign_on=screen_mat("sign lit", (0.72, 0.84, 1.0), 0.22, 0.45),
        sign_dim=screen_mat("sign dim", (0.6, 0.72, 0.9), 0.08, 0.3),
        monitor=screen_mat("monitor glow", (0.62, 0.78, 1.0), 1.8, 0.4),
        display=screen_mat("scale display", (0.63, 0.74, 1.0), 21.0, 0.3),
        display_edge=sk.emission("display edge bleed", (0.63, 0.74, 1.0), 6.0),
        bezel=pbr("display bezel", (0.012, 0.012, 0.014), (0.22, 0.32), nscale=8, cvar=0.08),
        display_off=pbr("display off", (0.008, 0.012, 0.012), (0.08, 0.14), nscale=10, cvar=0.05),
        curtain=pbr("curtain flaps", (0.02, 0.021, 0.022), (0.5, 0.7), nscale=6, cvar=0.2),
        night=sky_mat("night", 2.5),
        apron=sk.emission("apron lamp", (1.0, 0.82, 0.6), 60.0),
        apron_w=sk.emission("apron lamp white", (0.85, 0.92, 1.0), 45.0),
        sodium=sk.emission("sodium lamp", (1.0, 0.7, 0.45), 40.0),
        sodium_dim=sk.emission("sodium lamp dim", (1.0, 0.7, 0.45), 14.0),
        cool_dim=sk.emission("cool lamp dim", (0.85, 0.92, 1.0), 12.0),
        # the forecourt behind Dawn in the reverse: sodium and LED in mixed strengths (no bright identical orbs)
        fore=[sk.emission(f"forecourt {k}", rgb, s) for k, (rgb, s) in enumerate((
            ((0.9, 0.75, 0.55), 17.0), ((0.9, 0.75, 0.55), 10.0), ((0.9, 0.75, 0.55), 6.0), ((0.95, 0.7, 0.45), 3.5),
            ((0.8, 0.88, 1.0), 13.0), ((0.8, 0.88, 1.0), 7.0), ((0.75, 0.85, 1.0), 4.0)))],
        grip=pbr("rubber grip", (0.02, 0.02, 0.022), (0.55, 0.7), nscale=40, cvar=0.15),
        wire=pbr("trolley wire", (0.55, 0.56, 0.58), (0.18, 0.3), metal=1.0, nscale=20, cvar=0.08),
        tyre=pbr("tyre", (0.015, 0.015, 0.016), (0.6, 0.75), nscale=30, cvar=0.1),
        grille=pbr("grille", (0.05, 0.053, 0.058), (0.4, 0.55), metal=0.6, nscale=4, cvar=0.1, bump=1.0, bscale=55, ribs="Z"),
        door=pbr("door laminate", (0.09, 0.095, 0.1), (0.4, 0.55), nscale=3, cvar=0.08),
        red=pbr("extinguisher", (0.22, 0.03, 0.025), (0.25, 0.4), nscale=6, cvar=0.1, coat=0.4),
        bin=pbr("bin steel", (0.25, 0.255, 0.26), (0.3, 0.5), metal=1.0, nscale=6, stretch=(1, 1, 20), cvar=0.15, aniso=0.4),
    )
    return M


# ---------------------------------------------------------------- geometry helpers
def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0)):
    ob = sk.box(name, size, loc, m, bevel=bevel, rot=rot)
    if bevel:
        ob.modifiers["bevel"].limit_method = "ANGLE"
        ob.modifiers["bevel"].segments = 3
    return ob


def child(ob, parent):
    ob.parent = parent
    return ob


def light(name, loc, size, energy, rot=(0, 0, 0), spread=180, colour=COOL):
    return sk.area_light(name, loc, size, energy, colour, spread_deg=spread, rot=rot)


# ---------------------------------------------------------------- the hall
def hall():
    m = materials()
    x0, x1, y0, H = HALL["x0"], HALL["x1"], HALL["y0"], HALL["H"]
    cx, w = (x0 + x1) / 2, x1 - x0
    box("floor", (w + 1, WALL_Y - y0 + 1, 0.02), (cx, (WALL_Y + y0) / 2, -0.01), m["floor"])
    box("ceiling", (w + 1, WALL_Y - y0 + 1, 0.05), (cx, (WALL_Y + y0) / 2, H + 0.025), m["ceiling"])
    # back wall: tall panels below the bulkhead, a skirting, a dark upper wall above
    box("wall_back_upper", (w, 0.1, H - BULK[2] + 0.02), (cx, WALL_Y + 0.12, (H + BULK[2]) / 2), m["wall_dark"])
    box("wall_back_core", (w, 0.08, BULK[2]), (cx, WALL_Y + 0.1, BULK[2] / 2), m["wall_dark"])
    pw = 1.5
    n = int(w / pw)
    for i in range(n):
        px = x0 + pw * (i + 0.5)
        box(f"wall_panel{i}", (pw - 0.014, 0.025, BULK[1] - 0.14), (px, WALL_Y + 0.0125, 0.12 + (BULK[1] - 0.14) / 2), m["wall"], bevel=0.003)
    box("skirting", (w, 0.02, 0.11), (cx, WALL_Y - 0.008, 0.055), m["steel_worn"], bevel=0.002)
    box("wall_reveal", (w, 0.03, 0.03), (cx, WALL_Y - 0.005, BULK[1] - 0.025), m["steel"], bevel=0.003)
    # side walls: the right one plain and dark, the far-left end glazed onto the apron
    box("wall_right", (0.1, WALL_Y - y0, H), (x1 + 0.05, (WALL_Y + y0) / 2, H / 2), m["wall_dark"])
    glazing_front(y0, x0, x1)
    glazing(x0)
    back_dressing()
    # clad columns in the passenger hall (one beside the queue, one behind Dawn in the reverse, two far off)
    for i, (px, py) in enumerate(((-7.4, -3.3), (2.2, -6.6), (-16.5, -6.6), (-7.4, -12.0))):
        box(f"column{i}", (0.62, 0.62, H), (px, py, H / 2), m["column"], bevel=0.02)
        box(f"column{i}_base", (0.66, 0.66, 0.12), (px, py, 0.06), m["steel_worn"], bevel=0.004)
        for sx, sy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):  # steel corner guards
            box(f"column{i}_guard", (0.05, 0.05, 1.2), (px + sx * 0.3, py + sy * 0.3, 0.72), m["satin"], bevel=0.004)
    # an extinguisher on the near column's face toward the row, a steel litter bin beside it
    ex, ey = -7.4 + 0.31, -3.3
    box("col_ext_bracket", (0.012, 0.12, 0.08), (ex + 0.006, ey, 1.12), m["steel"], bevel=0.002)
    sk.cyl("col_ext_bottle", 0.075, 0.48, (ex + 0.085, ey, 0.86), m["red"], verts=24)
    sk.cyl("col_ext_neck", 0.03, 0.1, (ex + 0.085, ey, 1.15), m["iron"], verts=16)
    sk.cyl("col_ext_hose", 0.012, 0.36, (ex + 0.15, ey + 0.03, 0.92), m["plastic"], verts=10, rot=(0, math.radians(8), 0))
    sk.cyl("bin", 0.2, 0.75, (-6.9, -3.82, 0.375), m["bin"], verts=40)
    sk.cyl("bin_lid", 0.205, 0.04, (-6.9, -3.82, 0.77), m["plastic"], verts=40)
    sk.cyl("bin_mouth", 0.07, 0.005, (-6.9, -3.82, 0.792), m["screen_off"], verts=24)
    # slim beams under the slat ceiling, across the hall every 1.2 m: the fittings' uplight gives them form
    for k in range(int((x1 - x0) / 1.2)):
        bx = x0 + 0.6 + 1.2 * k
        box(f"beam{k}", (0.06, WALL_Y - y0 - 0.4, 0.22), (bx, (WALL_Y + y0) / 2, H - 0.11), m["beam"], bevel=0.004)
    # fluorescent fittings hung in rows over the passenger hall: some on, most off (night)
    on = {(0, 0), (3, 0), (1, 1), (4, 1), (-1, 1), (2, 2), (5, 2), (0, 3), (3, 3)}
    for j, fy in enumerate((-1.9, -5.0, -8.1, -11.2)):
        for i, fx in enumerate([1.4 - PITCH * k for k in range(-1, 7)]):
            lit = (i - 1, j) in on
            fitting(f"fit{i}_{j}", fx, fy, 4.25, lit, strong=(j == 0 and i - 1 in (0,)))
    # blank directional sign hung over the hall
    hang_sign("hall_sign", (-4.2, -5.0, 3.55), (2.6, 0.08, 0.55), m["sign_dim"])
    # moonlight: a cool soft source outside the glazed end wall, raking into the hall from the left (the glass
    # does not block shadow rays, so this reaches the floor and rims the stanchions without caustic noise)
    moon = light("moonlight", (x0 - 2.5, -3.0, 3.2), (3.0, 6.0), 260, rot=(0, math.radians(-74), 0), spread=150,
                 colour=(0.5, 0.62, 0.85))
    # The landside windows admit a broad apron reflection across the queue lanes.
    apron = light("forecourt reflected light", (-5.0, -8.6, 2.9), (7.0, 3.0), 235,
                  spread=145, colour=(0.68, 0.76, 0.9))
    apron.rotation_euler = (Vector((-3.0, -1.3, 0.5)) - apron.location).to_track_quat("-Z", "Y").to_euler()
    apron.visible_glossy = False
    moon.visible_camera = False
    moon.visible_transmission = False   # through the glass you see the night, not a white panel


def back_dressing():
    """What tells you this is the back wall of a working terminal: return-air grilles over the belt, steel trims,
    a service door and an extinguisher cabinet past the end of the row, a cable tray above the bulkhead."""
    m = materials()
    y = WALL_Y
    for i, x0 in enumerate(POSITIONS):
        box(f"grille{i}", (1.1, 0.03, 0.42), (x0 - 0.9, y - 0.01, 2.55), m["grille"], bevel=0.004)
        box(f"grille{i}_frame", (1.16, 0.02, 0.48), (x0 - 0.9, y - 0.002, 2.55), m["steel"], bevel=0.003)
        box(f"trim{i}", (0.05, 0.02, BULK[1] - 0.2), (x0 + 1.95, y - 0.01, 0.12 + (BULK[1] - 0.2) / 2), m["steel"], bevel=0.003)
    # service door
    dx = 3.6
    box("door_frame", (1.12, 0.05, 2.24), (dx, y - 0.02, 1.12), m["steel_worn"], bevel=0.004)
    box("door_leaf", (1.0, 0.045, 2.15), (dx, y - 0.04, 1.08), m["door"], bevel=0.004)
    box("door_kick", (0.96, 0.006, 0.25), (dx, y - 0.066, 0.15), m["steel_worn"], bevel=0.002)
    box("door_push", (0.1, 0.006, 0.35), (dx - 0.36, y - 0.066, 1.15), m["steel"], bevel=0.002)
    box("door_vision", (0.18, 0.006, 0.6), (dx + 0.2, y - 0.066, 1.55), m["screen_off"], bevel=0.002)
    # extinguisher cabinet: steel box, glass front, the bottle inside
    ex = 5.05
    box("ext_cab", (0.38, 0.16, 0.78), (ex, y - 0.08, 1.05), m["steel"], bevel=0.006)
    box("ext_back", (0.33, 0.01, 0.72), (ex, y - 0.012, 1.05), m["wall_dark"])
    sk.cyl("ext_bottle", 0.075, 0.5, (ex, y - 0.08, 0.98), m["red"], verts=24)
    sk.cyl("ext_neck", 0.03, 0.12, (ex, y - 0.08, 1.28), m["iron"], verts=16)
    box("ext_glass", (0.34, 0.006, 0.74), (ex, y - 0.162, 1.05), m["glass"])
    box("ext_frame", (0.38, 0.01, 0.04), (ex, y - 0.166, 0.68), m["steel"], bevel=0.002)
    # low return grille and a floor box by the door
    box("grille_low", (0.9, 0.03, 0.3), (6.4, y - 0.01, 0.35), m["grille"], bevel=0.004)
    # cable tray above the bulkhead
    L = HALL["x1"] - HALL["x0"]
    cx = (HALL["x1"] + HALL["x0"]) / 2
    box("tray_floor", (L, 0.3, 0.008), (cx, y - 0.2, 4.35), m["steel_worn"])
    box("tray_lip", (L, 0.008, 0.06), (cx, y - 0.35, 4.38), m["steel_worn"])
    for k, (dy, r) in enumerate(((-0.12, 0.012), (-0.18, 0.009), (-0.24, 0.014), (-0.3, 0.01))):
        sk.cyl(f"tray_cable{k}", r, L, (cx, y + dy, 4.354 + r), m["plastic"], rot=(0, math.radians(90), 0), verts=10)
    for k in range(int(L / 2.0)):
        box(f"tray_hanger{k}", (0.02, 0.36, 0.02), (HALL["x0"] + 1 + 2.0 * k, y - 0.2, 4.34), m["steel"])


def fitting(name, x, y, z, lit, strong=False, length=2.4):
    m = materials()
    box(name + "_housing", (length, 0.2, 0.08), (x, y, z), m["housing"], bevel=0.008)
    box(name + "_diffuser", (length - 0.06, 0.15, 0.012), (x, y, z - 0.045), m["tube"] if lit else m["diffuser_off"], bevel=0.003)
    for dx in (-length * 0.4, length * 0.4):
        sk.cyl(name + "_wire", 0.0025, HALL["H"] - z, (x + dx, y, (HALL["H"] + z) / 2), m["steel"], verts=6)
    if lit:  # a pool on the floor below, and a little uplight that shows the beams and slats above
        # the one over the queue is narrowed and lowered (its shaft in the haze outshone the desk); the rest fade 30 %
        light(name + "_light", (x, y, z - 0.06), (length - 0.1, 0.14), 240 if strong else 38, spread=72 if strong else 85)
        up = light(name + "_up", (x, y, z + 0.05), (length - 0.1, 0.14), 28 if strong else 18, rot=(math.radians(180), 0, 0), spread=160)
        up.visible_camera = False


def hang_sign(name, loc, size, face_m):
    m = materials()
    x, y, z = loc
    box(name + "_frame", (size[0] + 0.06, size[1], size[2] + 0.06), loc, m["housing"], bevel=0.008)
    for s in (-1, 1):
        box(name + "_face", (size[0] - 0.02, 0.004, size[2] - 0.02), (x, y + s * (size[1] / 2 + 0.002), z), face_m)
        sk.cyl(name + "_rod", 0.008, HALL["H"] - z - size[2] / 2, (x + s * size[0] * 0.35, y, (HALL["H"] + z + size[2] / 2) / 2), m["steel"], verts=8)


def glazing(x):
    """The far end of the hall: a glazed wall onto the apron at night (mullions, glass, distant lamps)."""
    m = materials()
    y0, H = HALL["y0"], HALL["H"]
    box("glaze_sill", (0.25, WALL_Y - y0, 0.3), (x - 0.05, (WALL_Y + y0) / 2, 0.15), m["wall_dark"], bevel=0.01)
    box("glaze_head", (0.3, WALL_Y - y0, 0.5), (x - 0.05, (WALL_Y + y0) / 2, H - 0.25), m["wall_dark"])
    for k in range(int((WALL_Y - y0) / 1.8) + 1):
        y = y0 + 1.8 * k
        box(f"mullion{k}", (0.12, 0.08, H), (x, y, H / 2), m["mullion"], bevel=0.006)
    for zz in (2.4,):
        box("transom", (0.1, WALL_Y - y0, 0.07), (x, (WALL_Y + y0) / 2, zz), m["mullion"], bevel=0.005)
    gl = box("glass", (0.012, WALL_Y - y0, H - 0.8), (x - 0.03, (WALL_Y + y0) / 2, 0.3 + (H - 0.8) / 2), m["glass"])
    gl.visible_shadow = False  # the moonlight outside reaches the hall by direct light, not caustics
    # outside: night sky glow and apron lamps far off
    box("night", (0.05, 80, 30), (x - 60, -6, 8), m["night"])
    box("apron_ground", (60, 80, 0.05), (x - 30, -6, -0.6), pbr("apron", (0.01, 0.011, 0.012), (0.3, 0.5)))
    rnd = random.Random(4)
    for row, (dx, z, step, mat_) in enumerate(((26, 12.0, 14.0, m["apron_w"]), (45, 12.0, 14.0, m["apron_w"]), (20, 0.8, 4.0, m["apron"]))):
        for k in range(int(56 / step)):
            if rnd.random() < 0.2:
                continue
            sk.sphere(f"apron_lamp{row}_{k}", 0.12 if row < 2 else 0.05, (x - dx, -34 + step * k + rnd.uniform(-0.4, 0.4), z), mat_, segs=8)
    # more apron life at varied distances and heights: mast heads, stand lights, taxiway edge lamps
    for k in range(14):
        dx = rnd.uniform(9, 55)
        z = rnd.choice((rnd.uniform(0.3, 1.2), rnd.uniform(5, 14)))
        mat_ = rnd.choice((m["sodium"], m["sodium_dim"], m["apron_w"], m["cool_dim"]))
        sk.sphere(f"apron_more{k}", rnd.uniform(0.05, 0.2), (x - dx, rnd.uniform(-30, 14), z), mat_, segs=8)


def glazing_front(y, xa, xb):
    """The landside facade behind the passengers: full-height glazing onto the forecourt at night."""
    m = materials()
    H = HALL["H"]
    cx, w = (xa + xb) / 2, xb - xa
    box("front_sill", (w, 0.25, 0.3), (cx, y + 0.05, 0.15), m["wall_dark"], bevel=0.01)
    box("front_head", (w, 0.3, 0.5), (cx, y + 0.05, H - 0.25), m["wall_dark"])
    for k in range(int(w / 1.8) + 1):
        box(f"fmullion{k}", (0.08, 0.12, H), (xa + 1.8 * k, y, H / 2), m["mullion"], bevel=0.006)
    box("ftransom", (w, 0.1, 0.07), (cx, y, 2.4), m["mullion"], bevel=0.005)
    # no glass pane on this side: its reflections of the hall fittings blur into streaks that read like writing
    box("fnight", (90, 0.05, 30), (cx, y - 60, 8), m["night"])
    box("forecourt", (90, 60, 0.05), (cx, y - 30, -0.62), pbr("forecourt", (0.01, 0.011, 0.012), (0.3, 0.5)))
    rnd = random.Random(11)
    for row, (dy, z, step, mat_) in enumerate(((22, 7.5, 9.0, m["apron"]), (38, 9.0, 12.0, m["apron_w"]), (16, 0.7, 5.5, m["apron"]))):
        for k in range(int(70 / step)):
            if rnd.random() < 0.25:
                continue  # a few lamps out
            if -8 < -38 + step * k < 8:
                continue  # the reverse's window: lit by the scattered field below instead of an even row
            sk.sphere(f"street_lamp{row}_{k}", 0.09 if row < 2 else 0.05, (-38 + step * k + rnd.uniform(-0.5, 0.5), y - dy, z), mat_, segs=8)
    # the forecourt behind Dawn in the reverse: lamps scattered in depth (16-55 m from the lens) at kerb and bollard
    # heights, sizes, strengths and colours mixed (sodium and LED), none in the top band of the reverse (a disc cut by
    # the frame edge reads as a floating orb)
    rnd = random.Random(23)
    cam = CAMERAS["shoulder"]
    n = 0
    for k in range(60):
        if n >= 17:
            break
        d = rnd.uniform(1.5, 40.0)               # metres beyond the facade line
        spread = 0.36 * (15.7 + d)
        p = (0.33 + rnd.uniform(-spread, spread), y - d, rnd.uniform(-0.2, 3.0))
        px = project(cam, p)
        if px and -40 < px[0] < 1320 and px[1] < 75:
            continue
        sk.sphere(f"fore_lamp{k}", rnd.uniform(0.03, 0.15), p, m["fore"][rnd.randrange(len(m["fore"]))], segs=10)
        n += 1


def project(cam, p, W=1280, H=720):
    """Pixel position of a world point in a camera dict (track-to, 36 mm sensor): (x, y from the top, depth)."""
    loc, aim, lens = Vector(cam["loc"]), Vector(cam["aim"]), cam["lens"]
    f = (aim - loc).normalized()
    r = f.cross(Vector((0, 0, 1))).normalized()
    u = r.cross(f)
    d = Vector(p) - loc
    z = d.dot(f)
    if z <= 0:
        return None
    return (W / 2 + d.dot(r) / z * lens / 36 * W, H / 2 - d.dot(u) / z * lens / 36 * W, z)


# ---------------------------------------------------------------- the check-in row
B = 0.007   # every counter edge that catches light: a 7 mm bevel, 3 segments


def desk(x0, idx, open_):
    m = materials()
    p = f"desk{idx}_"
    hw = 0.7
    # two-tone laminate front (dark lower band, lighter upper band, a steel reveal between), a recessed dark kick plate
    RV = 0.7
    for s in (-1, 1):
        box(p + "front_lo", (hw - 0.006, 0.03, RV - 0.11), (x0 + s * hw / 2, 0.015, 0.1 + (RV - 0.11) / 2), m["laminate_dark"], bevel=B)
        box(p + "front_hi", (hw - 0.006, 0.03, LEDGE - RV - 0.01), (x0 + s * hw / 2, 0.015, RV + (LEDGE - RV) / 2), m["laminate"], bevel=B)
    box(p + "reveal", (2 * hw - 0.02, 0.024, 0.016), (x0, 0.02, RV - 0.005), m["steel"], bevel=0.004)
    box(p + "kick", (2 * hw - 0.04, 0.02, 0.1), (x0, 0.075, 0.05), m["kick"], bevel=0.003)      # recessed 6 cm
    for s in (-1, 1):  # stainless corner guards on the front corners
        box(p + "corner", (0.04, 0.04, LEDGE - 0.12), (x0 + s * (hw - 0.012), 0.012, 0.1 + (LEDGE - 0.12) / 2), m["satin"], bevel=B)
    for s in (-1, 1):  # the ends: darker laminate (they face the lights side-on), a recessed kick along each
        box(p + "side_lo", (0.03, 0.74, RV - 0.11), (x0 + s * (hw - 0.015), 0.39, 0.1 + (RV - 0.11) / 2), m["laminate_dark"], bevel=B)
        # The end panel steps down to the worktop behind the passenger ledge.
        for name, y0, y1, top in (("ledge end", 0.02, 0.294, LEDGE - 0.006),
                                  ("desk end", 0.294, 0.76, WORK - 0.004)):
            bottom = RV + 0.005
            box(p + name, (0.03, y1 - y0, top - bottom),
                (x0 + s * (hw - 0.015), (y0 + y1) / 2, (top + bottom) / 2), m["laminate_side"], bevel=B)
        box(p + "side_reveal", (0.036, 0.72, 0.016), (x0 + s * (hw - 0.015), 0.39, RV - 0.005), m["steel"], bevel=0.004)
        box(p + "side_kick", (0.02, 0.7, 0.1), (x0 + s * (hw - 0.035), 0.41, 0.05), m["kick"], bevel=0.003)
    # dark transaction ledge (overhangs the front) with a 6 mm dull-steel nosing, the lower work surface behind it
    box(p + "ledge", (2 * hw + 0.04, 0.33, 0.035), (x0, 0.125, LEDGE + 0.0175), m["top"], bevel=0.008)
    box(p + "nosing", (2 * hw + 0.044, 0.008, 0.006), (x0, -0.0415, LEDGE + 0.0285), m["steel_dark"], bevel=0.002)
    box(p + "upstand", (2 * hw - 0.06, 0.025, LEDGE - WORK), (x0, 0.3, WORK + (LEDGE - WORK) / 2), m["top"], bevel=0.005)
    box(p + "work", (2 * hw - 0.06, 0.45, 0.03), (x0, 0.53, WORK - 0.015), m["top"], bevel=B)
    box(p + "back", (2 * hw - 0.06, 0.02, WORK - 0.2), (x0, 0.7, 0.16 + (WORK - 0.2) / 2), m["laminate_side"], bevel=0.004)
    # the agent's monitor: a 45 mm housing on a neck and foot, a dark bezel round a blank glowing screen. It stands in
    # front of the agent's right hand, its face turned three-quarter to him (so the profile sees the face, not an edge)
    mx, my, yaw = x0 + MON[0], MON[1], -math.radians(MON[2])
    R = Matrix.Rotation(yaw, 3, "Z")
    bk = R @ Vector((0, -0.075, 0))                       # the neck stands behind the screen
    box(p + "mon_foot", (0.24, 0.18, 0.014), (mx + bk.x, my + bk.y, WORK + 0.007), m["plastic"], bevel=0.005, rot=(0, 0, yaw))
    box(p + "mon_neck", (0.06, 0.035, 0.16), (mx + bk.x * 0.55, my + bk.y * 0.55, WORK + 0.09), m["plastic"], bevel=0.008, rot=(0, 0, yaw))
    zc, tilt = WORK + 0.2, math.radians(18)               # low, tilted up to him: below the passenger's eyeline
    body = box(p + "mon_body", (0.42, 0.045, 0.26), (mx, my, zc), m["plastic"], bevel=0.009, rot=(tilt, 0, yaw))
    child(box(p + "mon_bezel", (0.4, 0.004, 0.24), (0, 0.0215, 0), m["bezel"], bevel=0.002), body)
    child(box(p + "mon_screen", (0.375, 0.003, 0.205), (0, 0.0235, 0.006), m["monitor"] if open_ else m["screen_off"]), body)
    child(box(p + "mon_vent", (0.28, 0.003, 0.02), (0, -0.0235, 0.09), m["plastic_mid"]), body)     # back vent strip: blank
    # keyboard in front of the agent, a small dark bag-tag printer, the boarding-pass printer, a cable grommet
    kx = x0 + 0.14
    ky = 0.680
    box(p + "keyboard", (0.4, 0.14, 0.018), (kx, ky, WORK + 0.009), m["plastic"], bevel=0.004, rot=(math.radians(-3), 0, 0))
    if open_:
        for row in range(4):
            for col in range(15):
                dx = (col - 7) * 0.023 + (row % 2) * 0.004
                dy = (row - 1.5) * 0.024
                box(f"{p}key_{row}_{col}", (0.021, 0.021, 0.006),
                    (kx + dx, ky + dy, WORK + 0.020 - dy * 0.052),
                    m["plastic_mid"], bevel=0.0018, rot=(math.radians(-3), 0, 0))
    else:
        box(p + "keys", (0.37, 0.11, 0.004), (kx, ky, WORK + 0.02), m["plastic_mid"], rot=(math.radians(-3), 0, 0))
    box(p + "tagprinter", (0.16, 0.2, 0.13), (x0 - 0.55, 0.405, WORK + 0.065), m["plastic"], bevel=0.01)
    box(p + "tagslot", (0.1, 0.006, 0.008), (x0 - 0.55, 0.303, WORK + 0.095), m["screen_off"])
    box(p + "bpprinter", (0.24, 0.26, 0.14), (x0 - 0.58, 0.66, WORK + 0.07), m["plastic"], bevel=0.012)
    sk.cyl(p + "grommet", 0.03, 0.004, (x0 + 0.42, 0.68, WORK + 0.002), m["plastic"], verts=24)
    if open_:
        # Dawn's passport, closed, on the ledge between her hand and the agent (a plain cover, nothing printed)
        centre = (x0 + 0.239, 0.229)
        yaw_pass = math.radians(-18)
        page = pbr("passport leaves", (0.52, 0.48, 0.39), (0.80, 0.88))
        z = LEDGE + 0.035
        for part, width, depth, thick, material in (
                ("back", 0.128, 0.090, 0.0014, m["passport"]),
                ("pages", 0.125, 0.087, 0.0036, page),
                ("front", 0.128, 0.090, 0.0014, m["passport"])):
            box(p + "passport_" + part, (width, depth, thick), (*centre, z + thick / 2),
                material, bevel=0.0011, rot=(0, 0, yaw_pass))
            z += thick
        # the screen's light on the agent's face and chest, aimed by numbers
        n = R @ (Matrix.Rotation(tilt, 3, "X") @ Vector((0, 1, 0)))
        c = Vector((mx, my, zc)) + n * 0.033
        ml = light(p + "mon_light", tuple(c), (0.37, 0.20), 6, spread=92, colour=(0.55, 0.72, 1.0))
        tgt = Vector((x0 + AGENT[0] - 0.05, AGENT[1] - 0.12, 1.45))
        ml.rotation_euler = (c - tgt).to_track_quat("Z", "Y").to_euler()
        ml.visible_camera = False


def scale(x0, idx, open_):
    """The baggage scale: a stainless weigh plate (diamond tread) in a raised, bevelled steel rim on a dark painted steel
    body; the display on its own post beside it; a flat rubber belt behind it between steel rails, into the wall."""
    m = materials()
    p = f"scale{idx}_"
    xs = x0 + SX
    W, D = 0.9, 0.92
    box(p + "plinth", (W - 0.06, D - 0.06, 0.06), (xs, D / 2 + 0.01, 0.03), m["kick"], bevel=0.003)
    box(p + "body", (W, D, PLATE - 0.07), (xs, D / 2, 0.05 + (PLATE - 0.07) / 2), m["painted"], bevel=0.006)
    t, rh = 0.04, 0.03
    rz = PLATE + 0.008 - rh / 2                       # the rim stands 8 mm proud of the plate
    for nm, size, loc in (("rim_f", (W, t, rh), (xs, t / 2, rz)), ("rim_b", (W, t, rh), (xs, D - t / 2, rz)),
                          ("rim_l", (t, D - 2 * t + 0.002, rh), (xs - (W - t) / 2, D / 2, rz)),
                          ("rim_r", (t, D - 2 * t + 0.002, rh), (xs + (W - t) / 2, D / 2, rz))):
        box(p + nm, size, loc, m["steel_y" if nm in ("rim_l", "rim_r") else "steel"], bevel=0.006)
    box(p + "gap", (W - 2 * t, D - 2 * t, 0.012), (xs, D / 2, PLATE - 0.012), m["kick"])
    box(p + "plate", (W - 2 * t - 0.014, D - 2 * t - 0.014, 0.012), (xs, D / 2, PLATE - 0.006), m["stainless"], bevel=0.003)
    # the display on its own post beside the scale, facing the passenger, under a small hood
    px, py = x0 + POST[0], POST[1]
    box(p + "post_foot", (0.17, 0.17, 0.018), (px, py, 0.009), m["iron"], bevel=0.006)
    sk.cyl(p + "post", 0.024, 0.86, (px, py, 0.018 + 0.43), m["steel_v"], verts=24)
    sk.cyl(p + "post_collar", 0.032, 0.04, (px, py, 0.9), m["plastic"], verts=24)
    head = box(p + "disp_head", (0.3, 0.075, 0.15), (px, py - 0.01, 0.995), m["plastic"], bevel=0.012,
               rot=(math.radians(-14), 0, math.radians(-35)))
    child(box(p + "disp_hood", (0.31, 0.05, 0.01), (0, -0.058, 0.07), m["plastic"], bevel=0.003), head)
    child(box(p + "disp_bezel", (0.264, 0.004, 0.112), (0, -0.0385, 0.0), m["bezel"], bevel=0.002), head)
    if open_:  # backlight bleed: a hairline of light round the panel inside the bezel
        for dz in (-0.0465, 0.0465):
            child(box(p + "disp_bleed", (0.244, 0.0025, 0.0015), (0, -0.0403, dz), m["display_edge"]), head)
        for dx in (-0.1215, 0.1215):
            child(box(p + "disp_bleed", (0.0015, 0.0025, 0.094), (dx, -0.0403, 0.0), m["display_edge"]), head)
    child(box(("scale_display" if idx == 0 else p + "display"), (0.24, 0.003, 0.09), (0, -0.0405, 0.0),
              m["display"] if open_ else m["display_off"]), head)
    if open_:
        dl = light(p + "disp_light", (0, -0.06, 0.0), (0.22, 0.08), 38.0, rot=(math.radians(-90), 0, 0), spread=120,
                   colour=(0.63, 0.74, 1.0))
        dl.parent = head
        dl.visible_camera = False
        bpy.context.view_layer.update()
        target = head.matrix_world.inverted() @ Vector((xs + 0.15, 0.45, 0.45))
        dl.rotation_euler = (target - dl.location).to_track_quat("-Z", "Y").to_euler()
        # under the hood: the panel's glow falling down onto the post top, the suitcase's side and the duffel's back
        c = head.matrix_world @ Vector((0, -0.045, -0.09))
        uh = light(p + "disp_under", tuple(c), (0.18, 0.08), 3.0, spread=140, colour=(0.65, 0.76, 0.96))
        uh.rotation_euler = (c - Vector((xs + 0.05, 0.4, 0.55))).to_track_quat("Z", "Y").to_euler()
        uh.visible_camera = False
        sp = light(p + "disp_spill", tuple(head.matrix_world @ Vector((0, -0.07, 0.03))), (0.2, 0.06), 6.0, spread=150,
                   colour=(0.63, 0.74, 1.0))
        sp.rotation_euler = Vector((0.5, 0.6, 0.6)).to_track_quat("Z", "Y").to_euler()   # down onto the plate and bags
        sp.visible_camera = False
        for glow in (dl, sp, uh):
            glow.visible_glossy = False
            glow.data.specular_factor = 0.0
    belt(xs, W, D, idx)


def belt(xs, W, D, idx):
    """A flat black rubber belt between brushed-steel side rails (top 0.45 m) from the scale straight back into a dark
    opening in the back wall, hung with a curtain of PVC strips."""
    m = materials()
    p = f"belt{idx}_"
    fy0, fy1 = D + 0.012, WALL_Y
    fl, cy = fy1 - fy0, (fy0 + fy1) / 2
    bw = W - 0.12
    box(p + "body", (W - 0.04, fl, PLATE - 0.08), (xs, cy, 0.05 + (PLATE - 0.08) / 2), m["painted"], bevel=0.006)
    box(p + "plinth", (W - 0.1, fl, 0.05), (xs, cy, 0.025), m["kick"], bevel=0.003)
    box(p + "bed", (bw + 0.02, fl, 0.012), (xs, cy, PLATE - 0.03), m["steel_dark"])
    box(p + "belt", (bw, fl + 0.02, 0.014), (xs, cy, PLATE - 0.017), m["belt"], bevel=0.005)
    sk.cyl(p + "nose", 0.02, bw, (xs, fy0 + 0.012, PLATE - 0.026), m["belt"], rot=(0, math.radians(90), 0), verts=24)
    for s in (-1, 1):
        box(p + "rail", (0.032, fl, 0.2), (xs + s * (W / 2 - 0.036), cy, 0.35), m["steel_y"], bevel=0.007)
    # the mouth in the wall: black inside a satin steel frame, PVC strips over it
    oz0, oz1, ow = PLATE - 0.03, 0.86, W - 0.02
    box(p + "mouth", (ow, 0.012, oz1 - oz0), (xs, WALL_Y - 0.004, (oz0 + oz1) / 2), m["void"])
    box(p + "head", (ow + 0.14, 0.09, 0.07), (xs, WALL_Y - 0.045, oz1 + 0.035), m["satin"], bevel=0.007)
    for s in (-1, 1):
        box(p + "jamb", (0.07, 0.09, oz1 - oz0 + 0.04), (xs + s * (ow / 2 + 0.035), WALL_Y - 0.045, (oz0 + oz1) / 2 + 0.02),
            m["satin"], bevel=0.007)
    rnd = random.Random(7 + idx)
    k = 8
    sw = ow / k
    z0 = PLATE + 0.006
    for i in range(k):
        xx = xs - ow / 2 + sw * (i + 0.5)
        box(f"{p}strip{i}", (sw + 0.012, 0.004, oz1 - z0), (xx, WALL_Y - 0.07 + 0.004 * (i % 2), (z0 + oz1) / 2), m["pvc"],
            rot=(math.radians(rnd.uniform(-1.5, 3.5)), 0, math.radians(rnd.uniform(-1.5, 1.5))))


def tray(loc, turn_deg):
    """A plain grey plastic tray somebody left on a closed scale (no print)."""
    m = materials()
    root = bpy.data.objects.new("tray", None)
    bpy.context.scene.collection.objects.link(root)
    L, Wd, H, t = 0.58, 0.4, 0.1, 0.008
    parts = [((L, Wd, t), (0, 0, t / 2)), ((L, t, H), (0, Wd / 2 - t / 2, H / 2)), ((L, t, H), (0, -Wd / 2 + t / 2, H / 2)),
             ((t, Wd - 2 * t, H), (L / 2 - t / 2, 0, H / 2)), ((t, Wd - 2 * t, H), (-L / 2 + t / 2, 0, H / 2))]
    for i, (size, lc) in enumerate(parts):
        child(box(f"tray{i}", size, lc, m["tray"], bevel=0.003), root)
    for s in (-1, 1):  # a rolled lip
        child(box("tray_lip", (L + 0.012, 0.016, 0.01), (0, s * (Wd / 2 + 0.002), H - 0.004), m["tray"], bevel=0.004), root)
    root.location = loc
    root.rotation_euler = (0, 0, math.radians(turn_deg))
    return root


def bulkhead(x_left, x_right):
    m = materials()
    yf, zb, zt = BULK
    box("bulkhead", (x_right - x_left, WALL_Y - yf, zt - zb), ((x_left + x_right) / 2, (WALL_Y + yf) / 2, (zb + zt) / 2), m["bulk"], bevel=0.01)
    box("bulk_trim", (x_right - x_left + 0.02, 0.03, 0.04), ((x_left + x_right) / 2, yf - 0.015, zb + 0.02), m["steel"], bevel=0.004)


def position_lights(x0, idx, level):
    """Downlights in the bulkhead for one position (level 0..1), a linear slot diffuser beside them."""
    m = materials()
    p = f"pos{idx}_"
    yf, zb, _ = BULK
    lx = x0 + 0.6
    tube = m["tube"] if level > 0.5 else (m["tube_dim"] if level > 0 else m["diffuser_off"])
    for ly in (0.2, 1.45):  # one over the counter front and the scale, one over the agent
        if ly < 1 and level > 0.5:  # the open position's front run: bright over the passenger, dim over the scale
            box(p + "downlight", (1.35, 0.12, 0.01), (x0 + 0.075, ly, zb - 0.004), tube)
            box(p + "downlight_scale", (1.1, 0.12, 0.01), (x0 + 1.31, ly, zb - 0.004), m["tube_dim"])
        else:
            box(p + "downlight", (2.5, 0.12, 0.01), (lx, ly, zb - 0.004), tube)
    box(p + "vent", (2.0, 0.06, 0.012), (lx, 2.1, zb - 0.005), m["plastic"])
    box(p + "vent_front", (2.0, 0.06, 0.012), (lx, 0.85, zb - 0.005), m["plastic"])
    # blank lightbox sign on the bulkhead face
    face = m["sign_on"] if level > 0.5 else m["sign_dim"]
    box(p + "sign_frame", (1.5, 0.06, 0.4), (lx, yf - 0.03, (BULK[1] + BULK[2]) / 2), m["housing"], bevel=0.006)
    box(p + "sign_face", (1.42, 0.004, 0.33), (lx, yf - 0.062, (BULK[1] + BULK[2]) / 2), face)
    if level > 0:  # the front run is split: full over the passenger, only a dim pool over the scale (its display reads)
        light(p + "down_front", (x0 + 0.075, 0.45, zb - 0.02), (1.35, 0.12), 180 * level, spread=60)
        light(p + "down_scale", (x0 + 1.375, 0.2, zb - 0.02), (0.85, 0.12), 21 * level, spread=60)
        light(p + "down_agent", (lx, 1.45, zb - 0.02), (2.4, 0.12), 25 * level, spread=60)   # cut 40 %: his screen lights him
        if level > 0.5:
            # the island's soft key: a broad source in the bulkhead over the open desk, on Dawn, the ledge and the
            # counter front (unseen; the cutter below keeps it off the bags, which sit in the display's glow)
            soft = light(p + "island", (x0 + 0.15, 0.05, zb - 0.03), (1.2, 0.6), 108, rot=(math.radians(8), 0, 0), spread=75)
            soft.visible_camera = False
            # a flag over the agent (unseen, casts shadow only): he is lit by his monitor, not the downlights
            fl = box(p + "agent_flag", (1.6, 0.8, 0.01), (x0 + 0.3, 0.95, 2.35), m["plastic"])
            # and a cutter (a barn door, also unseen) at the desk's end, so the passenger run does not spill over
            # the scale: the bags sit in the dark under their own dim pool and the display's glow
            cut = box(p + "scale_cutter", (0.01, 1.5, 1.8), (x0 + 0.78, 0.15, 2.25), m["plastic"])
            dot = box(p + "hand flag", (0.28, 0.21, 0.005), (x0 + 0.30, 0.12, 1.55), m["plastic"])
            for ob in (fl, cut, dot):
                for attr in ("visible_camera", "visible_diffuse", "visible_glossy", "visible_transmission", "visible_volume_scatter"):
                    setattr(ob, attr, False)


def queue():
    """Retractable-belt queue posts: a two-row serpentine in front of the open position. Every post sits wholly inside
    the wide or wholly outside it (none cut by the frame edge); the lane turns at the far left into the approach."""
    rows = [(-2.1, [-4.6, -2.6, -0.6, 1.0]), (-3.3, [-4.6, -2.6, -0.3])]
    for j, (y, xs) in enumerate(rows):
        for i, x in enumerate(xs):
            stanchion(f"q{j}_{i}", x, y)
        for i in range(len(xs) - 1):
            if j == 0 and i == 0:
                continue   # the turn from the lane into the approach to the desk
            qbelt(f"q{j}_belt{i}", (xs[i], y), (xs[i + 1], y))
    qbelt("q_link0", (-4.6, -2.1), (-4.6, -3.3))
    # where the next passenger waits: a dark rubber inlay in the floor (no words)
    box("wait_line", (1.7, 0.05, 0.002), (0.5, -1.3, 0.0005), materials()["kick"])


def stanchion(name, x, y):
    m = materials()
    sk.cyl(name + "_base", 0.17, 0.018, (x, y, 0.009), m["iron"], verts=40, r2=0.165)
    sk.cyl(name + "_dome", 0.14, 0.035, (x, y, 0.0355), m["chrome"], verts=40, r2=0.05)
    sk.cyl(name + "_post", 0.03, 0.86, (x, y, 0.053 + 0.43), m["chrome"], verts=24)
    sk.cyl(name + "_head", 0.036, 0.1, (x, y, 0.94), m["chrome"], verts=24)
    sk.cyl(name + "_cap", 0.036, 0.014, (x, y, 0.997), m["iron"], verts=24, r2=0.028)
    return (x, y)


def qbelt(name, a, b, z=0.935):
    m = materials()
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) - 0.075
    ang = math.atan2(dy, dx)
    # A single thin ribbon bows under its own weight between the two retractors.
    mesh = bpy.data.meshes.new(name)
    vertices, faces = [], []
    for i in range(9):
        t = i / 8
        x = (t - 0.5) * L
        centre = -0.015 * 4 * t * (1 - t)
        vertices.extend([(x, 0, centre - 0.025), (x, 0, centre + 0.025)])
        if i:
            j = i * 2
            faces.append((j - 2, j, j + 1, j - 1))
    mesh.from_pydata(vertices, [], faces)
    web = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(web)
    web.location = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z)
    web.rotation_euler.z = ang
    mesh.materials.append(m["fabric"])
    web.modifiers.new("webbing thickness", "SOLIDIFY").thickness = 0.002
    ex, ey = b[0] - math.cos(ang) * 0.045, b[1] - math.sin(ang) * 0.045
    box(name + "_clip", (0.02, 0.012, 0.055), (ex, ey, z), m["iron"], bevel=0.002, rot=(0, 0, ang))


def checkin_row():
    for i, x0 in enumerate(POSITIONS):
        open_ = i == 0
        desk(x0, i, open_)
        scale(x0, i, open_)
        position_lights(x0, i, {0: 1.0, 3: 0.085}.get(i, 0.0))
    left = POSITIONS[-1] - 0.9
    right = POSITIONS[0] + SX + 0.5
    bulkhead(left - 0.3, right + 0.75)
    tray((POSITIONS[1] + SX - 0.05, 0.42, PLATE), 9)   # a closed bag drop: a tray left on the scale


# ---------------------------------------------------------------- props and people
def bags():
    xs = POSITIONS[0] + SX
    duffel = props.load("extra-bag-closed", size=0.75, axis="long", loc=(xs - 0.01, 0.25, PLATE), turn_deg=3, sat=0.5,
                        val=0.25, rough_add=0.3)
    props.load("dawn-suitcase", size=0.66, axis="z", loc=(xs + 0.07, 0.69, PLATE), turn_deg=-84, sat=0.35, val=0.5)
    checkin_hall_trolley.trolley(materials(), (-0.85, -1.1, 0), 100)   # nose toward the counter, handle to the hall
    focus("focus_duffel", (xs - 0.01, 0.25, PLATE + duffel["dims"][2] * 0.5))


def focus(name, loc):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.location = loc


def place(holder, loc, facing_deg):
    holder.location = loc
    holder.rotation_euler = (0, 0, math.radians(facing_deg))
    bpy.context.view_layer.update()


def _rig(holder):
    return bpy.data.objects[holder["rig"]]


def eye_centre(holder):
    """World centre of a statue's two eyes (they follow the head bone)."""
    bpy.context.view_layer.update()
    pts = []
    for i in (0, 1):
        o = bpy.data.objects.get(f"{holder['body']}_eye{i}")
        if o:
            pts += [o.matrix_world @ v.co for v in o.data.vertices]
    return sum(pts, Vector()) / len(pts)


def face_local(holder):
    """The face's forward line in the head bone's own frame, measured at rest, where the MakeHuman statue looks level
    along -Y. The head bone's Z axis leans with the neck, so aiming that axis put Dawn's gaze on the agent's chest."""
    if "face_local" not in holder:
        rig = _rig(holder)
        rigged.pose_figure(holder, {})
        M = rig.pose.bones["head"].matrix.to_3x3().normalized()
        fwd = rig.matrix_world.to_3x3().normalized().inverted() @ (holder.matrix_world.to_3x3().normalized() @ Vector((0, -1, 0)))
        v = (M.inverted() @ fwd.normalized()).normalized()
        holder["face_local"] = list(v)
        print(f"CAST {holder.name}: face line vs head-bone Z axis {math.degrees(v.angle(Vector((0, 0, 1)))):.1f} deg")
    return Vector(holder["face_local"])


def face_dir(holder):
    """The way the face points (the calibrated face line), in world space."""
    rig = _rig(holder)
    loc = face_local(holder)
    bpy.context.view_layer.update()
    return ((rig.matrix_world @ rig.pose.bones["head"].matrix).to_3x3().normalized() @ loc).normalized()


def aim_head(holder, pose, target, max_turn=60, kw_eye=None):
    """Choose pose["head"] = (down, turn) so the face points at a world target (a gaze checked by numbers).
    rigged turns the head about its own root by Rz(turn) Rx(down) in armature space, so the face direction is
    Rz(th) Rx(dh) applied to the face axis as the rest of the pose leaves it: solve that in numbers, then pose once."""
    rig = _rig(holder)
    loc = face_local(holder)
    p0 = dict(pose, head=(0, 0))
    rigged.pose_figure(holder, p0)
    # the face line as the rest of the pose leaves it (Rigify's head need not follow the chest), armature space
    base = (rig.pose.bones["head"].matrix.to_3x3().normalized() @ loc).normalized()
    eye = kw_eye if kw_eye is not None else eye_centre(holder)
    R = rig.matrix_world.to_3x3().normalized()
    t = (R.inverted() @ (Vector(target) - eye)).normalized()
    rot = lambda d_, t_: Matrix.Rotation(math.radians(t_), 3, "Z") @ Matrix.Rotation(math.radians(d_), 3, "X")
    best = None
    for dn in range(-30, 46):
        for tn in range(-max_turn, max_turn + 1):
            e = (rot(dn, tn) @ base).angle(t)
            if best is None or e < best[0]:
                best = (e, (dn, tn))
    pose["head"] = best[1]
    rigged.pose_figure(holder, pose)
    return best[1]


def aim_head_iter(holder, pose, target, passes=2, **kw):
    """aim_head, then again from where the turned head has carried the eyes; returns (error deg, (down, turn))."""
    eye = None
    for _ in range(passes):
        aim_head(holder, pose, target, kw_eye=eye, **kw)
        eye = eye_centre(holder)
    err = math.degrees(face_dir(holder).angle((Vector(target) - eye).normalized()))
    return err, pose["head"]


def _hand_verts(holder, side="L"):
    """World positions of one hand's vertices (rig deformation, no subdivision), split palm / fingers / thumb."""
    body = bpy.data.objects[holder["body"]]
    subs = [m for m in body.modifiers if m.type in ("SUBSURF", "MASK") and m.show_viewport]   # keep vertex order 1:1
    for m in subs:
        m.show_viewport = False
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    names = {g.index: g.name for g in body.vertex_groups if g.name.startswith("DEF-")}   # deform groups only
    out = {name: [] for name in ("palm", "fingers", "thumb", "index", "middle", "ring", "pinky")}
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
            point = ev.matrix_world @ v.co
            out[key].append(point)
            if key == "fingers":
                out[n.split(".")[0].removeprefix("DEF-f_")].append(point)
    ev.to_mesh_clear()
    for m in subs:
        m.show_viewport = True
    bpy.context.view_layer.update()
    return out


def rest_hand(holder, pose, side, wrist_target, top_z, fwd_dir, curl=12.0, palm_drop=0.005, passing=False):
    """Lay one hand palm-down and flat on a surface at top_z, wrist near wrist_target (world), fingers along fwd_dir.
    Solves the arm's (forward, out, elbow) on the rig's own bone lengths, pronates the forearm, flattens the hand,
    then measures the hand's vertices and corrects the height so the palm touches (about 2 mm)."""
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
    pitch = 0.0
    bends = {"index": curl - 2, "middle": curl - 1, "ring": curl + 2, "pinky": curl + 6}
    for attempt in range(12):
        wrist_error, pose[key] = rigged.fit_wrist(sh, arm_inv @ target, L1, L2, sgn, min_forward=-30)
        rigged.pose_figure(holder, pose)
        # hand flat: its X axis (across the palm, palm side) straight down, its Y axis along fwd_dir
        R = rig.matrix_world.to_3x3().normalized().inverted()
        y = (R @ Vector(fwd_dir)).normalized()
        x = R @ Vector((0, 0, -1))
        x = (x - y * x.dot(y)).normalized()
        x *= sgn
        z = x.cross(y)
        if pitch:  # tip the fingers up (or down) about the hand's side axis so palm and fingers lie on one plane
            q = Matrix.Rotation(sgn * pitch, 3, z)
            x, y = (q @ x).normalized(), (q @ y).normalized()
        fa = pb[f"forearm_fk.{k}"]
        fm = fa.matrix.copy()
        fy = fm.to_3x3().col[1].normalized()
        fx = fm.to_3x3().col[0].normalized()
        want = (x - fy * x.dot(fy)).normalized()
        ang = fx.angle(want) * 0.7                               # most of the twist in the forearm, the rest at the wrist
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
        if passing:
            # The thumb tracks the booklet edge, the three centre pads press its trailing half.
            joints = {"f_" + f: (bend, 4, 3) for f, bend in bends.items()}
            joints["thumb"] = (20, 7, 8, -12)
            rigged.articulate_hand(holder, k, joints)
        else:
            for finger, spread in (("index", -3), ("middle", -1), ("ring", 1), ("pinky", 3), ("thumb", -18)):
                f = "thumb" if finger == "thumb" else "f_" + finger
                bend = bends.get(finger, 52 if side == "R" else 25)
                n = f"{f}.01_master.{k}"
                if n in pb:
                    pb[n].rotation_mode = "XYZ"
                    pb[n].rotation_euler.x = math.radians(bend)
                    pb[n].rotation_euler.z = math.radians(spread)
                    pb[n].scale.y = 0.91 if f != "thumb" else 0.96
            bpy.context.view_layer.update()
        hv = _hand_verts(holder, k)
        low = min(p.z for p in hv["palm"] + hv["fingers"])
        palm_low, finger_low = min(p.z for p in hv["palm"]), min(p.z for p in hv["fingers"])
        pads = {name: min(hv[name], key=lambda p: p.z) for name in bends}
        support = ("index", "middle", "ring")
        finger_z = sum(pads[name].z for name in support) / len(support)
        height_delta = top_z - finger_z
        tilt_error = palm_low - finger_z + palm_drop
        if attempt >= 7 and max(abs(top_z - pads[name].z) for name in support) < 0.0015:
            break
        if attempt < 8:
            pitch += 0.42 * math.atan2(tilt_error, 0.085)
        for name in support:
            bends[name] = max(3.0, min(27.0, bends[name] + math.degrees((pads[name].z - finger_z) / 0.14)))
        target.z += height_delta * 0.75
    pad = sum((pads[name] for name in support), Vector()) / len(support)
    print("PAD", holder.name, side, {n: round(1000 * (pt.z - top_z), 1) for n, pt in pads.items()},
          "heel", round(1000 * (palm_low - top_z), 1), "thumb", round(1000 * (min(p.z for p in hv["thumb"]) - top_z), 1), flush=True)
    return dict(arm=pose[key], fit=wrist_error, pad=pad, low=low, palm_low=min(p.z for p in hv["palm"]),
                finger_low=min(p.z for p in hv["fingers"]), thumb=sum(hv["thumb"], Vector()) / max(1, len(hv["thumb"])),
                palm=sum(hv["palm"], Vector()) / max(1, len(hv["palm"])))


def haze(density=0.0035):
    """The hall's haze, only where it shapes the light: from the back wall to about 3 m in front of Dawn, its density
    ramping in smoothly over 2 m (no visible edge), so the forecourt, the far glazing and the bokeh stay clean."""
    m = bpy.data.materials.new("haze")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.interpolation_type = "SMOOTHSTEP"
    mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = -4.8, -2.6
    mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = 0.0, density
    nt.links.new(sep.outputs["Y"], mr.inputs["Value"])
    pv = nt.nodes.new("ShaderNodeVolumePrincipled")
    pv.inputs["Color"].default_value = (0.8, 0.86, 0.92, 1)
    nt.links.new(mr.outputs["Result"], pv.inputs["Density"])
    nt.links.new(pv.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    y0, y1 = -4.9, WALL_Y - 0.05
    ob = box("haze", (HALL["x1"] - HALL["x0"] - 0.2, y1 - y0, HALL["H"] - 0.1),
             ((HALL["x0"] + HALL["x1"]) / 2, (y0 + y1) / 2, HALL["H"] / 2), m)
    ob.visible_shadow = False
    return ob


def render_settings():
    """Clean volume and glints: clamp indirect light (stray paths from the forecourt lamps through the haze were the
    blotchy speckle in the reverse), a coarser volume step, the accurate denoiser prefilter on albedo and normal."""
    c = bpy.context.scene.cycles
    c.sample_clamp_indirect = 2.0
    c.volume_step_rate = 2.0
    c.denoising_prefilter = "ACCURATE"
    c.denoising_input_passes = "RGB_ALBEDO_NORMAL"


def build(cast=True):
    hall()
    checkin_row()
    box("agent floor platform", (0.80, 0.56, 0.041), (*AGENT, 0.0205), materials()["rubber"], bevel=0.009)
    queue()
    bags()
    haze()
    render_settings()
    pool = bpy.data.collections.new("scale display receivers")
    receivers = [ob for ob in bpy.context.scene.objects if ob.name.startswith("scale0_")]
    for root in ("dawn-suitcase", "extra-bag-closed"):
        receivers.extend(bpy.data.objects[root].children_recursive)
    for ob in receivers:
        if ob.type == "MESH":
            pool.objects.link(ob)
    for name in ("scale0_disp_light", "scale0_disp_spill", "scale0_disp_under"):
        lamp = bpy.data.objects.get(name)
        if lamp is not None:
            lamp.light_linking.receiver_collection = pool
    wash = light("service wall wash", (3.2, 1.0, 3.0), (2.5, 1.5), 48, colour=(0.72, 0.82, 1.0))
    wash.rotation_euler = (Vector((3.6, 2.55, 1.2)) - wash.location).to_track_quat("-Z", "Y").to_euler()
    wash.visible_glossy = False
    fill = light("counter eye bounce", (0.30, 0.55, 1.44), (0.52, 0.30), 2.5, spread=80, colour=(0.84, 0.90, 1.0))
    fill.rotation_euler = (Vector((DAWN[0], DAWN[1], 1.54)) - fill.location).to_track_quat("-Z", "Y").to_euler()
    fill.visible_glossy = False
    focus("focus_sign", (0.6, BULK[0] - 0.062, (BULK[1] + BULK[2]) / 2))
    focus("focus_dawn", (DAWN[0] - 0.03, DAWN[1] + 0.12, 1.5))   # her eyes
    focus("focus_agent", (AGENT[0], AGENT[1] - 0.08, 1.6))
    if not cast:
        return
    d = people.dawn()                  # the shared cast: flat taupe blouse and skirt, plain black flats
    a = people.staff("Agent", 0)       # airline staff: plain dark suit, no insignia
    place(d, (DAWN[0], DAWN[1], 0), 192)
    place(a, (*AGENT, 0.041), 6)
    eye_mat = castkit.stone("counter statue eyes", (0.42, 0.42, 0.43), 0.80)
    eye_mat.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.10
    for i in (0, 1):
        eye = bpy.data.objects[f"{d['body']}_eye{i}"]
        centre = sum((v.co for v in eye.data.vertices), Vector()) / len(eye.data.vertices)
        eye.data.transform(Matrix.Translation(centre + Vector((0, 0.0012, 0))) @ Matrix.Scale(0.955, 4) @ Matrix.Translation(-centre))
        eye.data.materials[0] = eye_mat
    pose_cast(d, a)


def pose_cast(d, a):
    """The agent, hands at the keyboard, reads his screen (the weight comes up there); Dawn looks up at his face, her
    left hand flat on the ledge, her right arm hanging. Gazes and the hand contact are solved, not guessed."""
    scr = bpy.data.objects["desk0_mon_screen"]
    bpy.context.view_layer.update()
    ap = {"chest": (10, -6), "l_arm": (22, 10, 55), "r_arm": (24, 4, 50)}
    ga = aim_head_iter(a, ap, scr.matrix_world.translation + Vector((0, 0, 0.14)))
    # Each hand has its own row of keys. The rig fitter resets both arms, so restore
    # the completed left FK chain after fitting the right.
    agent_rig = _rig(a)
    rest_hand(a, ap, "L", (0.22, 0.82, WORK + 0.055), WORK + 0.022,
              Vector((-0.08, -1.0, 0)), curl=20, palm_drop=-0.012)
    left = {b.name: b.matrix_basis.copy() for b in agent_rig.pose.bones if b.name.endswith(".L")}
    rest_hand(a, ap, "R", (-0.035, 0.82, WORK + 0.060), WORK + 0.025,
              Vector((0.30, -1.0, 0)), curl=19, palm_drop=-0.012)
    for name, basis in left.items():
        agent_rig.pose.bones[name].matrix_basis = basis
    bpy.context.view_layer.update()
    dp = {"chest": (2, 0), "r_arm": (4, 7, 10),
          "hands": {"R": {"f_index": (15, 12, 9), "f_middle": (16, 14, 10),
                          "f_ring": (17, 15, 12, 3), "f_pinky": (18, 16, 13, 6), "thumb": (22, 8, 9, -12)}}}
    gd = aim_head_iter(d, dp, eye_centre(a) + Vector((0, 0, 0.03)))
    fwd = Vector((-0.208, 0.978, 0)) + 0.52 * Vector((0.978, 0.208, 0))   # her forward, turned a little inward
    hand = rest_hand(d, dp, "L", (DAWN[0] - 0.20, 0.084, LEDGE + 0.08), LEDGE + 0.0414, fwd.normalized(), curl=8, passing=True, palm_drop=-0.002)
    # Put the booklet under the solved finger pads. Leave the far edge and a corner
    # exposed so the page block reads as a closed passport.
    for part in ("back", "pages", "front"):
        piece = bpy.data.objects["desk0_passport_" + part]
        piece.location.x = hand["pad"].x - 0.005
        piece.location.y = hand["pad"].y + 0.030
    # (the author, 26 Nov 2026: "The hand is wrong": the wrist 12 cm from her centre folded the forearm into her waist)
    print(f"CAST agent head {ga[1]} gaze error {ga[0]:.1f} deg; Dawn head {gd[1]} gaze error {gd[0]:.1f} deg")
    print(f"CAST Dawn l_arm {tuple(round(v, 1) for v in hand['arm'])} wrist fit {hand['fit'] * 1000:.0f} mm, hand low "
          f"{(hand['low'] - LEDGE - 0.035) * 1000:.1f} mm above the ledge (palm {(hand['palm_low'] - LEDGE - 0.035) * 1000:.1f}, "
          f"fingers {(hand['finger_low'] - LEDGE - 0.035) * 1000:.1f}); thumb {tuple(round(c, 3) for c in hand['thumb'])} "
          f"palm {tuple(round(c, 3) for c in hand['palm'])}")
