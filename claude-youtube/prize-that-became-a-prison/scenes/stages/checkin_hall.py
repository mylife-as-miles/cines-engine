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

DAWN = (0.5, -0.34)
AGENT = (0.02, 0.98)

EXPOSURE = -1.6
CAMERAS = {
    "wide": dict(loc=(4.4, -4.9, 2.4), aim=(-3.0, 1.0, 1.15), lens=24, focus="focus_dawn", fstop=5.6),
    "scale": dict(loc=(1.6, -1.2, 1.32), aim=(1.15, 0.4, 0.6), lens=32, focus="scale_display", fstop=4.0,
                  exposure=-2.0),   # exposed for the display, the practical the beat is about
    "profile": dict(loc=(5.2, -0.5, 1.38), aim=(0.3, 0.2, 0.9), lens=45, focus="focus_dawn", fstop=2.8),
    "shoulder": dict(loc=(0.4, 1.68, 1.58), aim=(0.29, -0.3, 1.36), lens=50, focus="focus_dawn", fstop=2.0),
}

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
        laminate=pbr("laminate front", (0.15, 0.146, 0.14), (0.38, 0.5), nscale=6, cvar=0.06, bump=0.04, bscale=300,
                     wear=(0.25, 0.7)),
        laminate_dark=pbr("laminate dark", (0.04, 0.041, 0.044), (0.34, 0.48), nscale=6, cvar=0.12, bump=0.04, bscale=300,
                          wear=(0.25, 0.7)),
        top=pbr("dark solid surface", (0.022, 0.024, 0.027), (0.16, 0.3), nscale=5, cvar=0.15, coat=0.3, smudge=0.45),
        steel=pbr("brushed steel", (0.6, 0.61, 0.63), (0.22, 0.4), metal=1.0, nscale=3, stretch=(1, 30, 30), cvar=0.08, aniso=0.5),
        steel_worn=pbr("scuffed steel", (0.45, 0.46, 0.48), (0.3, 0.62), metal=1.0, nscale=7, stretch=(1, 6, 6), cvar=0.25, aniso=0.3),
        steel_dark=pbr("dull steel", (0.3, 0.305, 0.315), (0.38, 0.6), metal=1.0, nscale=7, stretch=(1, 6, 6), cvar=0.18, aniso=0.2),
        steel_v=pbr("brushed steel vertical", (0.6, 0.61, 0.63), (0.2, 0.34), metal=1.0, nscale=3, stretch=(30, 30, 1), cvar=0.06),
        satin=pbr("satin steel", (0.55, 0.56, 0.58), (0.24, 0.32), metal=1.0, nscale=60, cvar=0.04),
        chrome=pbr("polished steel", (0.78, 0.79, 0.8), (0.07, 0.14), metal=1.0, nscale=6, cvar=0.03),
        plate=pbr("weigh plate", (0.5, 0.51, 0.53), (0.25, 0.4), metal=1.0, nscale=9, stretch=(1, 120, 120), cvar=0.05, aniso=0.6,
                  bump=0.008, bscale=180),
        rubber=pbr("belt rubber", (0.016, 0.016, 0.018), (0.62, 0.8), nscale=5, cvar=0.25, bump=0.35, bscale=55, ribs="X"),
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
        tube=sk.emission("fluorescent", COOL, 9.0),
        tube_dim=sk.emission("fluorescent dim", COOL, 1.6),
        sign_on=screen_mat("sign lit", (0.72, 0.84, 1.0), 1.3, 0.45),
        sign_dim=screen_mat("sign dim", (0.6, 0.72, 0.9), 0.12, 0.3),
        monitor=screen_mat("monitor glow", (0.62, 0.78, 1.0), 5.0, 0.4),
        display=screen_mat("scale display", (0.5, 1.0, 0.86), 14.0, 0.3),
        display_edge=sk.emission("display edge bleed", (0.5, 1.0, 0.86), 4.0),
        bezel=pbr("display bezel", (0.03, 0.032, 0.035), (0.3, 0.42), nscale=8, cvar=0.08),
        display_off=pbr("display off", (0.008, 0.012, 0.012), (0.08, 0.14), nscale=10, cvar=0.05),
        curtain=pbr("curtain flaps", (0.02, 0.021, 0.022), (0.5, 0.7), nscale=6, cvar=0.2),
        night=sky_mat("night", 1.5),
        apron=sk.emission("apron lamp", (1.0, 0.82, 0.6), 60.0),
        apron_w=sk.emission("apron lamp white", (0.85, 0.92, 1.0), 45.0),
        sodium=sk.emission("sodium lamp", (1.0, 0.7, 0.45), 40.0),
        sodium_dim=sk.emission("sodium lamp dim", (1.0, 0.7, 0.45), 14.0),
        cool_dim=sk.emission("cool lamp dim", (0.85, 0.92, 1.0), 12.0),
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
        light(name + "_light", (x, y, z - 0.06), (length - 0.1, 0.14), 450 if strong else 55, spread=100 if strong else 85)
        up = light(name + "_up", (x, y, z + 0.05), (length - 0.1, 0.14), 35 if strong else 25, rot=(math.radians(180), 0, 0), spread=160)
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
    # the forecourt behind Dawn in the reverse: lamps scattered in depth (15-60 m from the lens), sizes and
    # brightnesses mixed, warm sodium and cool white, so the bokeh reads as a real night outside, not a pattern
    rnd = random.Random(23)
    mats = (m["sodium"], m["sodium_dim"], m["sodium"], m["apron_w"], m["cool_dim"])
    for k in range(22):
        d = rnd.uniform(1.5, 44.0)               # metres beyond the glazing (the lens is ~16 m from it)
        spread = 0.8 * 0.36 * (15.7 + d)           # stay roughly inside the reverse's field of view
        z = rnd.choice((rnd.uniform(0.4, 1.6), rnd.uniform(1.8, 4.5), rnd.uniform(5.0, 9.0)))
        sk.sphere(f"fore_lamp{k}", rnd.uniform(0.05, 0.25), (0.6 + rnd.uniform(-spread, spread), y - d, z), mats[k % len(mats)], segs=10)


# ---------------------------------------------------------------- the check-in row
def desk(x0, idx, open_):
    m = materials()
    p = f"desk{idx}_"
    hw = 0.7
    # two-tone laminate front (dark lower band, lighter upper band, a steel reveal between), a recessed kick plate
    RV = 0.7
    for s in (-1, 1):
        box(p + "front_lo", (hw - 0.006, 0.03, RV - 0.11), (x0 + s * hw / 2, 0.015, 0.1 + (RV - 0.11) / 2), m["laminate_dark"], bevel=0.003)
        box(p + "front_hi", (hw - 0.006, 0.03, LEDGE - RV - 0.01), (x0 + s * hw / 2, 0.015, RV + (LEDGE - RV) / 2), m["laminate"], bevel=0.003)
    box(p + "reveal", (2 * hw - 0.02, 0.024, 0.016), (x0, 0.02, RV - 0.005), m["steel"], bevel=0.003)
    box(p + "kick", (2 * hw - 0.02, 0.02, 0.1), (x0, 0.045, 0.05), m["steel_worn"], bevel=0.002)
    for s in (-1, 1):  # stainless corner guards on the front corners, a kick plate along each side
        box(p + "corner", (0.04, 0.04, LEDGE - 0.12), (x0 + s * (hw - 0.012), 0.012, 0.1 + (LEDGE - 0.12) / 2), m["satin"], bevel=0.005)
        box(p + "side_kick", (0.012, 0.68, 0.1), (x0 + s * (hw + 0.002), 0.4, 0.05), m["steel_worn"], bevel=0.002)
    for s in (-1, 1):
        box(p + "side_lo", (0.03, 0.74, RV - 0.01), (x0 + s * (hw - 0.015), 0.39, (RV - 0.01) / 2), m["laminate_dark"], bevel=0.003)
        box(p + "side_hi", (0.03, 0.74, LEDGE - RV - 0.03), (x0 + s * (hw - 0.015), 0.39, RV + (LEDGE - RV - 0.02) / 2), m["laminate"], bevel=0.003)
        box(p + "side_reveal", (0.036, 0.72, 0.016), (x0 + s * (hw - 0.015), 0.39, RV - 0.005), m["steel"], bevel=0.003)
    # dark transaction ledge (overhangs the front) and the lower work surface behind it
    box(p + "ledge", (2 * hw + 0.04, 0.33, 0.035), (x0, 0.125, LEDGE + 0.0175), m["top"], bevel=0.006)
    box(p + "upstand", (2 * hw - 0.06, 0.025, LEDGE - WORK), (x0, 0.3, WORK + (LEDGE - WORK) / 2), m["top"], bevel=0.002)
    box(p + "work", (2 * hw - 0.06, 0.45, 0.03), (x0, 0.53, WORK - 0.015), m["top"], bevel=0.005)
    box(p + "back", (2 * hw - 0.06, 0.02, WORK - 0.2), (x0, 0.7, 0.16 + (WORK - 0.2) / 2), m["laminate"], bevel=0.002)
    # agent's monitor: stand, neck, a thin body tilted to the agent, blank glowing (or dark) screen
    mx, kx = x0 - 0.3, x0 + 0.06      # monitor to the agent's right: out of the reverse, past his head
    box(p + "mon_base", (0.22, 0.17, 0.012), (mx, 0.43, WORK + 0.006), m["plastic"], bevel=0.004)
    box(p + "mon_neck", (0.05, 0.03, 0.26), (mx, 0.43, WORK + 0.14), m["plastic"], bevel=0.006)
    body = box(p + "mon_body", (0.52, 0.03, 0.33), (mx, 0.415, WORK + 0.36), m["plastic"], bevel=0.008, rot=(math.radians(8), 0, 0))
    scr = box(p + "mon_screen", (0.49, 0.002, 0.3), (0, 0.0155, 0.005), m["monitor"] if open_ else m["screen_off"])
    child(scr, body)
    box(p + "mon_badge", (0.06, 0.002, 0.012), (0, -0.0155, -0.14), m["plastic_mid"]).parent = body  # back badge: blank
    # keyboard, a bag-tag printer and a boarding-pass printer, a cable grommet
    box(p + "keyboard", (0.44, 0.15, 0.018), (kx, 0.58, WORK + 0.009), m["plastic"], bevel=0.004, rot=(math.radians(-3), 0, 0))
    box(p + "keys", (0.41, 0.12, 0.004), (kx, 0.58, WORK + 0.02), m["plastic_mid"], rot=(math.radians(-3), 0, 0))
    box(p + "tagprinter", (0.22, 0.27, 0.19), (x0 + 0.52, 0.47, WORK + 0.095), m["plastic_mid"], bevel=0.012)
    box(p + "tagslot", (0.14, 0.01, 0.012), (x0 + 0.52, 0.335, WORK + 0.14), m["plastic"])
    box(p + "bpprinter", (0.24, 0.26, 0.14), (x0 - 0.54, 0.62, WORK + 0.07), m["plastic"], bevel=0.012)
    sk.cyl(p + "grommet", 0.03, 0.004, (x0 + 0.12, 0.66, WORK + 0.002), m["plastic"], verts=24)
    if open_:  # the screen's light on the agent; a soft spill on the work surface
        ml = light(p + "mon_light", (mx, 0.44, WORK + 0.36), (0.45, 0.28), 25.0, rot=(math.radians(98), 0, 0), spread=150,
                   colour=(0.62, 0.78, 1.0))
        ml.visible_camera = False


def scale(x0, idx, open_):
    """The baggage scale: framed steel weigh plate at 0.3 m, laminate skirt, display on a post, feed belt behind."""
    m = materials()
    p = f"scale{idx}_"
    xs = x0 + SX
    W, D = 0.9, 0.92
    box(p + "plinth", (W - 0.04, D - 0.04, 0.05), (xs, D / 2 + 0.01, 0.025), m["steel_worn"], bevel=0.002)
    box(p + "skirt", (W, D, PLATE - 0.07), (xs, D / 2, 0.05 + (PLATE - 0.07) / 2), m["laminate_dark"], bevel=0.004)
    # steel rim around a slightly sunken weigh plate, rubber gap between them
    t = 0.035
    box(p + "rim_f", (W, t, 0.02), (xs, t / 2, PLATE - 0.008), m["steel"], bevel=0.004)
    box(p + "rim_b", (W, t, 0.02), (xs, D - t / 2, PLATE - 0.008), m["steel"], bevel=0.004)
    for s in (-1, 1):
        box(p + "rim_s", (t, D, 0.02), (xs + s * (W - t) / 2, D / 2, PLATE - 0.008), m["steel"], bevel=0.004)
    box(p + "gap", (W - 2 * t, D - 2 * t, 0.01), (xs, D / 2, PLATE - 0.016), m["rubber"])
    box(p + "plate", (W - 2 * t - 0.012, D - 2 * t - 0.012, 0.012), (xs, D / 2, PLATE - 0.006), m["plate"], bevel=0.003)
    # the display on its post at the front-right corner, facing the passenger
    px, py = x0 + SX + 0.43, -0.075
    box(p + "post_foot", (0.1, 0.08, 0.12), (px, -0.04, 0.2), m["steel"], bevel=0.004)
    sk.cyl(p + "post", 0.022, 0.68, (px, py, 0.26 + 0.34), m["steel_v"], verts=24)
    sk.cyl(p + "post_collar", 0.03, 0.04, (px, py, 0.95), m["plastic"], verts=24)
    head = box(p + "disp_head", (0.3, 0.07, 0.14), (px, py - 0.005, 1.02), m["plastic"], bevel=0.012,
               rot=(math.radians(-14), 0, math.radians(-10)))
    box(p + "disp_bezel", (0.262, 0.004, 0.104), (0, -0.036, 0.0), m["bezel"], bevel=0.002).parent = head
    if open_:  # backlight bleed: a hairline of light round the panel inside the bezel
        for dz in (-0.0435, 0.0435):
            box(p + "disp_bleed", (0.244, 0.0025, 0.0015), (0, -0.0383, dz), m["display_edge"]).parent = head
        for dx in (-0.1215, 0.1215):
            box(p + "disp_bleed", (0.0015, 0.0025, 0.088), (dx, -0.0383, 0.0), m["display_edge"]).parent = head
    disp = box(("scale_display" if idx == 0 else p + "display"), (0.24, 0.003, 0.084), (0, -0.0385, 0.0),
               m["display"] if open_ else m["display_off"])
    disp.parent = head
    if open_:
        dl = light(p + "disp_light", (0, -0.05, 0.0), (0.22, 0.08), 8.0, rot=(math.radians(-90), 0, 0), spread=120,
                   colour=(0.5, 1.0, 0.86))
        dl.parent = head
        dl.visible_camera = False
        # the panel's glow falling back and down onto the post collar, the plate rim and the top of the bag
        sp = light(p + "disp_spill", (px - 0.05, py + 0.02, 0.93), (0.2, 0.06), 4.0, spread=150, colour=(0.5, 1.0, 0.86))
        sp.rotation_euler = (-Vector((-0.55, 0.45, -0.7))).to_track_quat("Z", "Y").to_euler()
        sp.visible_camera = False
    # feed belt behind the scale into the collector belt
    fy0, fy1 = D + 0.02, BELT_Y[0]
    fl = fy1 - fy0
    box(p + "feed_frame", (W - 0.06, fl, PLATE - 0.04), (xs, fy0 + fl / 2, (PLATE - 0.04) / 2), m["steel_worn"], bevel=0.003)
    box(p + "feed_belt", (W - 0.14, fl + 0.02, 0.014), (xs, fy0 + fl / 2, PLATE - 0.035), m["rubber_y"], bevel=0.004)
    for s in (-1, 1):
        box(p + "feed_guard", (0.03, fl, 0.16), (xs + s * (W / 2 - 0.045), fy0 + fl / 2, PLATE + 0.04), m["steel_dark"], bevel=0.004)
    for yy in (fy0 + 0.02, fy1 - 0.02):
        sk.cyl(p + "roller", 0.025, W - 0.14, (xs, yy, PLATE - 0.045), m["steel"], rot=(0, math.radians(90), 0), verts=20)


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
        light(p + "down_front", (x0 + 0.075, 0.2, zb - 0.02), (1.35, 0.12), 505 * level, spread=60)
        light(p + "down_scale", (x0 + 1.375, 0.2, zb - 0.02), (0.85, 0.12), 30 * level, spread=60)
        light(p + "down_agent", (lx, 1.45, zb - 0.02), (2.4, 0.12), 70 * level, spread=60)
        if level > 0.5:  # a flag over the agent (unseen, casts shadow only): he is lit by his monitor, not the downlights
            fl = box(p + "agent_flag", (1.6, 0.8, 0.01), (x0 + 0.3, 0.95, 2.35), m["plastic"])
            # and a cutter (a barn door, also unseen) at the desk's end, so the passenger run does not spill over
            # the scale: the bags sit in the dark under their own dim pool and the display's glow
            cut = box(p + "scale_cutter", (0.01, 1.5, 1.8), (x0 + 0.78, 0.15, 2.25), m["plastic"])
            for ob in (fl, cut):
                for attr in ("visible_camera", "visible_diffuse", "visible_glossy", "visible_transmission", "visible_volume_scatter"):
                    setattr(ob, attr, False)


def collector(x_left, x_right):
    m = materials()
    y0, y1 = BELT_Y
    cx, L = (x_left + x_right) / 2, x_right - x_left
    box("coll_frame", (L, y1 - y0, PLATE - 0.04), (cx, (y0 + y1) / 2, (PLATE - 0.04) / 2), m["steel_worn"], bevel=0.003)
    box("coll_belt", (L, y1 - y0 - 0.08, 0.014), (cx, (y0 + y1) / 2, PLATE - 0.035), m["rubber"], bevel=0.004)
    box("coll_lip", (L, 0.03, 0.05), (cx, y0 + 0.015, PLATE - 0.01), m["steel"], bevel=0.004)
    # the belt leaves through the back wall: a plough at the end turns the bags over a short roller bridge into a
    # flapped portal (the one opening in the wall, facing the hall)
    pw, pz0, pz1 = 0.95, PLATE - 0.06, 0.82
    px0 = x_right - pw
    box("coll_guard", (px0 - x_left, 0.03, 0.3), ((x_left + px0) / 2, y1 - 0.015, PLATE + 0.1), m["steel_dark"], bevel=0.004)
    box("coll_endcap", (0.04, y1 - y0, 0.34), (x_right + 0.02, (y0 + y1) / 2, PLATE - 0.02), m["steel_dark"], bevel=0.004)
    ang = math.atan2(y1 - y0 - 0.1, pw - 0.15)
    pl = math.hypot(y1 - y0 - 0.1, pw - 0.15)
    box("coll_plough", (pl, 0.02, 0.22), (px0 + 0.08 + (pw - 0.15) / 2, (y0 + y1) / 2, PLATE + 0.1), m["steel_worn"], bevel=0.004,
        rot=(0, 0, ang))
    box("coll_plough_foot", (pl, 0.04, 0.015), (px0 + 0.08 + (pw - 0.15) / 2, (y0 + y1) / 2, PLATE - 0.02), m["rubber"], rot=(0, 0, ang))
    for k in range(4):  # roller bridge from the belt edge to the wall
        sk.cyl(f"coll_bridge_roller{k}", 0.022, pw - 0.1, (px0 + pw / 2, y1 + 0.035 + 0.06 * k, PLATE - 0.045), m["steel"],
               rot=(0, math.radians(90), 0), verts=16)
    for sx in (px0 + 0.03, x_right - 0.03):
        box("coll_bridge_side", (0.03, WALL_Y - y1, 0.12), (sx, (y1 + WALL_Y) / 2, PLATE - 0.07), m["steel_dark"], bevel=0.003)
    # the portal: a black opening in the panels, a steel frame, rubber flaps hanging over it
    pcx, pcz = px0 + pw / 2, (pz0 + pz1) / 2
    box("portal_void", (pw, 0.004, pz1 - pz0), (pcx, WALL_Y - 0.002, pcz), m["screen_off"])
    for dz in (pz1 + 0.025, pz0 - 0.025):
        box("portal_frame", (pw + 0.1, 0.05, 0.05), (pcx, WALL_Y - 0.025, dz), m["satin"], bevel=0.005)
    for dx in (px0 - 0.025, x_right + 0.025):
        box("portal_frame", (0.05, 0.05, pz1 - pz0 + 0.1), (dx, WALL_Y - 0.025, pcz), m["satin"], bevel=0.005)
    rnd = random.Random(7)
    k = 11
    for i in range(k):  # rubber curtain strips over the mouth, a few pushed back by the last bag
        xx = px0 + pw * (i + 0.5) / k
        box(f"coll_flap{i}", (pw / k - 0.006, 0.006, pz1 - pz0 - 0.01), (xx, WALL_Y - 0.04, pcz), m["curtain"],
            rot=(math.radians(rnd.uniform(-3, 9)), 0, math.radians(rnd.uniform(-3, 3))))


def queue():
    """Retractable-belt queue posts in serpentine lanes in front of the open position."""
    m = materials()
    rows = [(-2.1, [-4.6, -2.6, -0.6, 1.4], True), (-3.3, [-2.6, -0.6, 1.4, 3.0], True), (-4.5, [-4.6, -2.6, -0.6, 1.4], True)]
    posts = []
    for j, (y, xs, _) in enumerate(rows):
        for i, x in enumerate(xs):
            posts.append(stanchion(f"q{j}_{i}", x, y))
        for i in range(len(xs) - 1):
            qbelt(f"q{j}_belt{i}", (xs[i], y), (xs[i + 1], y))
    # the lane's entry side links rows 0-1 on the left and 1-2 on the right
    qbelt("q_link0", (-4.6, -2.1), (-4.6, -4.5))
    qbelt("q_link1", (3.0, -3.3), (3.0, -1.4))
    stanchion("q_end", 3.0, -1.4)
    return posts


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
    box(name, (L, 0.004, 0.05), ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z), m["fabric"], rot=(0, 0, ang))
    ex, ey = b[0] - math.cos(ang) * 0.045, b[1] - math.sin(ang) * 0.045
    box(name + "_clip", (0.02, 0.012, 0.055), (ex, ey, z), m["iron"], bevel=0.002, rot=(0, 0, ang))


def checkin_row():
    for i, x0 in enumerate(POSITIONS):
        open_ = i == 0
        desk(x0, i, open_)
        scale(x0, i, open_)
        position_lights(x0, i, {0: 1.0, 3: 0.12}.get(i, 0.0))
    left = POSITIONS[-1] - 0.9
    right = POSITIONS[0] + SX + 0.5
    collector(left, right)
    bulkhead(left - 0.3, right + 0.75)


# ---------------------------------------------------------------- props and people
def bags():
    xs = POSITIONS[0] + SX
    props.load("extra-bag-closed", size=0.75, axis="long", loc=(xs - 0.01, 0.25, PLATE), turn_deg=3, sat=0.5, val=0.25, rough_add=0.3)
    props.load("dawn-suitcase", size=0.66, axis="z", loc=(xs + 0.07, 0.69, PLATE), turn_deg=-84, sat=0.6)
    checkin_hall_trolley.trolley(materials(), (-0.85, -1.3, 0), 100)   # nose toward the counter, handle to the hall


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


def face_dir(holder):
    """The way the face points (the head bone's Z axis), in world space."""
    rig = _rig(holder)
    bpy.context.view_layer.update()
    return ((rig.matrix_world @ rig.pose.bones["head"].matrix).to_3x3() @ Vector((0, 0, 1))).normalized()


def aim_head(holder, pose, target, max_turn=60, kw_eye=None):
    """Choose pose["head"] = (down, turn) so the face points at a world target (a gaze checked by numbers).
    rigged turns the head about its own root by Rz(turn) Rx(down) in armature space, so the face direction is
    Rz(th) Rx(dh) applied to the face axis as the rest of the pose leaves it: solve that in numbers, then pose once."""
    rig = _rig(holder)
    p0 = dict(pose, head=(0, 0))
    rigged.pose_figure(holder, p0)
    # the head's face axis as posed (Rigify's head need not follow the chest), armature space
    base = rig.pose.bones["head"].matrix.to_3x3().col[2].normalized()
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
    for attempt in range(3):
        t_arm = arm_inv @ target
        best = None
        grid = [(f, o, e) for f in range(0, 91, 3) for o in range(-20, 31, 3) for e in range(0, 101, 3)]
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
        # hand flat: its X axis (across the palm, palm side) straight down, its Y axis along fwd_dir
        R = rig.matrix_world.to_3x3().normalized().inverted()
        y = (R @ Vector(fwd_dir)).normalized()
        x = R @ Vector((0, 0, -1))
        x = (x - y * x.dot(y)).normalized()
        z = x.cross(y)
        if pitch:  # tip the fingers up (or down) about the hand's side axis so palm and fingers lie on one plane
            q = Matrix.Rotation(pitch, 3, z)
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
        for f in ("f_index", "f_middle", "f_ring", "f_pinky"):
            n = f"{f}.01_master.{k}"
            if n in pb:
                pb[n].rotation_mode = "XYZ"
                pb[n].rotation_euler.x = math.radians(curl)
        bpy.context.view_layer.update()
        hv = _hand_verts(holder, k)
        low = min(p.z for p in hv["palm"] + hv["fingers"])
        palm_low, finger_low = min(p.z for p in hv["palm"]), min(p.z for p in hv["fingers"])
        if attempt < 2:
            pitch += 0.85 * math.atan2(palm_low - finger_low, 0.08)
            low = min(low, palm_low - 0.85 * (palm_low - finger_low) * 0.5)   # the palm comes down as the fingers rise
            target = target + Vector((0, 0, top_z + 0.002 - low))
    return dict(arm=pose[key], fit=best[0], low=low, palm_low=min(p.z for p in hv["palm"]),
                finger_low=min(p.z for p in hv["fingers"]), thumb=sum(hv["thumb"], Vector()) / max(1, len(hv["thumb"])),
                palm=sum(hv["palm"], Vector()) / max(1, len(hv["palm"])))


def dawn():
    h = castkit.person("Dawn", gender=0.0, height_cm=168, age=0.45, hair="bun")
    # plain dark leather shoes, texture dropped (the sneakers carried brand-like side stripes)
    castkit.dress(h, ["female_elegantsuit01", "shoes04"], tint={"female_elegantsuit01": (0.62, 0.56, 0.5), "shoes04": (0.08, 0.075, 0.07)},
                  flat=("shoes04",))
    shoe = bpy.data.objects.get(f"{h.name}_shoes04")
    if shoe:
        shoe.data.materials.clear()
        shoe.data.materials.append(shoe_mat())
    return h


def shoe_mat():
    """A court shoe: dark leather up to a top line about 6.5 cm off the floor, the leg's stone above it, so the
    MakeHuman shoe's sock reads as her ankle, not a dark band."""
    m = bpy.data.materials.new("dawn shoes")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    up = _range(nt, sep.outputs["Z"], 0.06, 0.068, 0.0, 1.0)
    nt.links.new(_mix(nt, up, (0.08, 0.075, 0.07), castkit.STONE), b.inputs["Base Color"])
    nt.links.new(_fmix(nt, up, 0.32, 0.6), b.inputs["Roughness"])
    return m


def agent():
    h = castkit.person("Agent", gender=1.0, height_cm=177, age=0.33, hair="short")
    castkit.dress(h, ["male_elegantsuit01", "shoes04"], tint={"male_elegantsuit01": (0.2, 0.235, 0.26), "shoes04": (0.07, 0.07, 0.075)},
                  flat=("shoes04",))
    return h


def build(cast=True):
    hall()
    checkin_row()
    queue()
    bags()
    sk.haze((HALL["x1"] - HALL["x0"] - 0.2, WALL_Y - HALL["y0"] - 0.2, HALL["H"] - 0.1),
            ((HALL["x0"] + HALL["x1"]) / 2, (WALL_Y + HALL["y0"]) / 2, HALL["H"] / 2), 0.0035)
    focus("focus_dawn", (DAWN[0] - 0.03, DAWN[1] + 0.12, 1.5))   # her eyes
    focus("focus_agent", (AGENT[0], AGENT[1] - 0.08, 1.6))
    if not cast:
        return
    d = dawn()
    a = agent()
    place(d, (DAWN[0], DAWN[1], 0), 192)
    place(a, (AGENT[0], AGENT[1], 0), 10)
    pose_cast(d, a)


def pose_cast(d, a):
    """The agent, hands at the keyboard, reads the scale display; Dawn looks at the agent with her left hand flat on
    the ledge and her right arm hanging clear of the display post. Gazes and the hand contact are solved, not guessed."""
    disp = bpy.data.objects["scale_display"]
    bpy.context.view_layer.update()
    ap = {"chest": (6, 8), "l_arm": (22, 10, 55), "r_arm": (20, 8, 58)}
    ga = aim_head_iter(a, ap, disp.matrix_world.translation)
    dp = {"chest": (3, 0), "r_arm": (4, 7, 10)}
    gd = aim_head_iter(d, dp, eye_centre(a))
    fwd = Vector((-0.208, 0.978, 0)) + 0.25 * Vector((0.978, 0.208, 0))   # her forward, turned a little inward
    hand = rest_hand(d, dp, "L", (DAWN[0] - 0.12, 0.01, LEDGE + 0.06), LEDGE + 0.035, fwd.normalized())
    print(f"CAST agent head {ga[1]} gaze error {ga[0]:.1f} deg; Dawn head {gd[1]} gaze error {gd[0]:.1f} deg")
    print(f"CAST Dawn l_arm {tuple(round(v, 1) for v in hand['arm'])} wrist fit {hand['fit'] * 1000:.0f} mm, hand low "
          f"{(hand['low'] - LEDGE - 0.035) * 1000:.1f} mm above the ledge (palm {(hand['palm_low'] - LEDGE - 0.035) * 1000:.1f}, "
          f"fingers {(hand['finger_low'] - LEDGE - 0.035) * 1000:.1f}); thumb {tuple(round(c, 3) for c in hand['thumb'])} "
          f"palm {tuple(round(c, 3) for c in hand['palm'])}")
