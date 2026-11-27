"""Set for the baggage_belt stage: the airside baggage hall at night (Ch 04 to Ch 05).

A long, low, tunnel-like hall of painted block walls under a concrete slab with downstand beams. One belt conveyor runs
its whole length along X: it comes out of the check-in side through a rubber strip curtain in the end wall (x = 0) and
disappears into a second, dark curtain in the far wall (x = 28). Galvanised side guards with rolled tops, a black rubber
belt (matt, scuffed, dusty at its edges), a powered-roller transfer where the in-feed belt hands over to the hall belt,
painted frame and legs, return rollers under it, the drive at the curtain end. A sorter chute leaves the belt at x = 10
on the +Y side (a yellow diverter paddle on the far guard, a stainless slide onto a gravity-roller landing). Fluorescent
battens hang over the walkway side (-Y); the last ones are dimmer and the very last is dead, so the light falls away
down the hall; a sparse, weaker service row hangs over the far side. Practicals: the battens, caged bulkhead lamps,
one sodium flood, the control panel's lamps and blank screen, the lit room behind the curtain (seen as slivers
between the strips), the far door's vision panel.

No legible text anywhere: panels and screens are blank, signs are bare pictogram shapes.
"""
import math
import random

import bpy  # noqa: F401  (bmesh and mathutils need bpy first)
import bmesh
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

import setkit as sk

# ---------------------------------------------------------------- layout (metres)
BZ = 0.62                 # belt top surface
BW = 1.0                  # belt width
GY = 0.575                # inner face of the side guards (|y|)
GH = 0.28                 # guard height above the belt
X0, X1 = -2.7, 27.85      # belt run (it starts behind the curtain wall and ends inside the far wall)
HX0, HX1 = 0.0, 28.0      # hall: curtain wall face, far wall face
YW0, YW1 = -3.2, 3.8      # side wall faces
H = 3.4                   # slab soffit
BEAMS = [1.8 + 3.6 * k for k in range(8)]
OPEN = dict(y0=-0.70, y1=0.70, z0=0.22, z1=BZ + 1.02)   # the curtain opening in the end wall
XC = 0.05                 # strip plane (hall side of the wall)
CHUTE = (9.3, 10.7)       # chute mouth along the +Y guard
BAT_Y, BAT_Z = -0.85, 2.62
BATTENS = [(1.3, 1.0), (5.6, 1.0), (9.9, 1.0), (14.2, 0.7), (18.5, 0.42), (22.8, 0.0)]
# a second, sparser row over the far side of the belt (the side the walkway is not on): one by the end wall, one
# over the sorter landing, one dead. They keep that half of the hall from going to pure black.
SERVICE_Y = 2.3
# (first try: 0.6 by the end wall lit that whole wall evenly, flat; 0.62 right over the sorter slide turned its
# stainless bed into a white slab from overhead)
SERVICE = [(1.0, 0.24), (11.2, 0.45), (19.0, 0.0)]
COOL = (0.80, 0.88, 1.0)
SODIUM = (1.0, 0.56, 0.22)
SIGN_Y = (1.2, 1.2, 2.1)   # end wall, far side of the opening: warning triangle, mandatory disc under it, isolator
TRANSFER = (0.72, 1.30)   # the powered-roller transfer between the in-feed belt and the hall belt
LACING = (6.2, 13.1, 20.0)
EYES = (0.5, 8.6)         # photo-eye pairs: after the curtain, before the diverter

M = {}
STRIPS = []               # dicts: ob, y, x, w, top, L, rows, cols, lean
LACING_OBS = []           # the belt's lacing seams (the stage moves them with the bags)
FOCUS = {}


# ---------------------------------------------------------------- node helpers (as in checkin_hall)
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


def _range(nt, val, a, b, lo, hi, smooth=False):
    mr = nt.nodes.new("ShaderNodeMapRange")
    if smooth:
        mr.interpolation_type = "SMOOTHSTEP"
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
    mx = nt.nodes.new("ShaderNodeMix")
    mx.data_type = "FLOAT"
    for sock, v in ((_in(mx, "A", "VALUE"), a), (_in(mx, "B", "VALUE"), b)):
        if isinstance(v, float):
            sock.default_value = v
        else:
            nt.links.new(v, sock)
    if isinstance(fac, float):
        _in(mx, "Factor", "VALUE").default_value = fac
    else:
        nt.links.new(fac, _in(mx, "Factor", "VALUE"))
    return _out(mx, "Result", "VALUE")


def _math(nt, op, a, b=None, clamp=False):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    n.use_clamp = clamp
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def _xyz(nt, vec):
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(vec, sep.inputs[0])
    return sep.outputs["X"], sep.outputs["Y"], sep.outputs["Z"]


def _comb(nt, x, y, z):
    c = nt.nodes.new("ShaderNodeCombineXYZ")
    for i, v in enumerate((x, y, z)):
        if isinstance(v, (int, float)):
            c.inputs[i].default_value = v
        else:
            nt.links.new(v, c.inputs[i])
    return c.outputs[0]


def _scale(nt, vec, s):
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = s
    nt.links.new(vec, mp.inputs["Vector"])
    return mp.outputs["Vector"]


def _bump(nt, b, height, strength, dist=0.001, invert=False):
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = strength
    bp.inputs["Distance"].default_value = dist
    bp.invert = invert
    nt.links.new(height, bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return bp


def _new(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    return m, nt, nt.nodes["Principled BSDF"]


def _pos(nt):
    return nt.nodes.new("ShaderNodeNewGeometry").outputs["Position"]


def pbr(name, rgb, rough=(0.4, 0.55), metal=0.0, nscale=4.0, stretch=(1, 1, 1), cvar=0.12, bump=0.0, bscale=90.0,
        aniso=0.0, coat=0.0, spec=0.5, world=False, grime=None, chips=None):
    """A principled material with roughness and tone variation (no surface reads as one flat value).
    grime=(z0, z1, k): darker and rougher toward the floor between world heights z1 (clean) and z0 (dirtiest).
    chips=(rgb, amount): painted surface chipped to `rgb` (bare metal) in small patches."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Anisotropic"].default_value = aniso
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = 0.15
    b.inputs["Specular IOR Level"].default_value = spec
    v0 = _pos(nt) if world else nt.nodes.new("ShaderNodeTexCoord").outputs["Object"]
    v = _scale(nt, v0, stretch)
    rough_s = _range(nt, _noise(nt, v, nscale), 0.32, 0.68, rough[0], rough[1])
    dark = tuple(c * (1 - cvar) for c in rgb)
    lite = tuple(min(1.0, c * (1 + cvar)) for c in rgb)
    col = _mix(nt, _range(nt, _noise(nt, v, nscale * 0.37, 4.0), 0.3, 0.7, 0.0, 1.0), dark, lite)
    if chips:
        crgb, amt = chips
        ch = _range(nt, _noise(nt, v0, 38.0, 8.0, 0.7), 0.72 - 0.12 * amt, 0.76 - 0.12 * amt, 0.0, 1.0)
        col = _mix(nt, ch, col, crgb)
        rough_s = _fmix(nt, ch, rough_s, 0.32)
    if grime:
        z0, z1, k = grime
        _, _, wz = _xyz(nt, _pos(nt))
        g = _math(nt, "MULTIPLY", _range(nt, wz, z0, z1, 1.0, 0.0),
                  _range(nt, _noise(nt, _pos(nt), 2.5, 5.0), 0.35, 0.65, 0.5, 1.0))
        col = _mix(nt, g, col, tuple(c * (1 - k) for c in rgb))
        rough_s = _fmix(nt, g, rough_s, min(1.0, rough[1] + 0.2))
    nt.links.new(rough_s, b.inputs["Roughness"])
    nt.links.new(col, b.inputs["Base Color"])
    if bump:
        _bump(nt, b, _noise(nt, v, bscale, 3.0), bump)
    return m


# ---------------------------------------------------------------- materials
def floor_mat():
    """Sealed concrete with a worn grey epoxy coat: saw-cut joints every 3 m, worn lanes where tugs and trolleys
    run, tyre streaks along the hall, the bare concrete showing through in patches. Semi-gloss where intact."""
    m, nt, b = _new("hall floor epoxy")
    p = _pos(nt)
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset, br.squash = 0.0, 1.0
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Brick Width"].default_value = 3.0
    br.inputs["Row Height"].default_value = 3.5
    br.inputs["Mortar Size"].default_value = 0.004
    br.inputs["Mortar Smooth"].default_value = 0.3
    br.inputs["Color1"].default_value = (1, 1, 1, 1)
    br.inputs["Color2"].default_value = (1, 1, 1, 1)
    br.inputs["Mortar"].default_value = (0, 0, 0, 1)
    nt.links.new(_comb(nt, _xyz(nt, p)[0], _math(nt, "ADD", _xyz(nt, p)[1], 1.75), 0.0), br.inputs["Vector"])
    joint = _math(nt, "SUBTRACT", 1.0, _out(br, "Fac"))   # 1 in the joint
    epoxy = (0.062, 0.068, 0.072)
    conc = (0.082, 0.085, 0.086)
    base = _mix(nt, _range(nt, _noise(nt, p, 1.2, 5.0), 0.3, 0.7, 0.0, 1.0), tuple(c * 0.88 for c in epoxy),
                tuple(c * 1.1 for c in epoxy))
    worn = _range(nt, _noise(nt, _scale(nt, p, (0.4, 1.6, 1.0)), 1.1, 6.0, 0.62), 0.58, 0.66, 0.0, 1.0)
    x, y, z = _xyz(nt, p)
    lane = _range(nt, _math(nt, "ABSOLUTE", _math(nt, "ADD", y, 1.85)), 0.25, 0.75, 1.0, 0.0, smooth=True)
    worn = _math(nt, "MAXIMUM", worn, _math(nt, "MULTIPLY", lane,
                                           _range(nt, _noise(nt, _scale(nt, p, (0.3, 3.0, 1.0)), 2.0, 6.0), 0.5, 0.62, 0.0, 0.8)))
    col = _mix(nt, worn, base, conc)
    tyre = _range(nt, _noise(nt, _scale(nt, p, (0.08, 9.0, 1.0)), 3.0, 4.0), 0.6, 0.7, 0.0, 0.55)
    tyre = _math(nt, "MULTIPLY", tyre, lane)
    col = _mix(nt, tyre, col, (0.025, 0.025, 0.026))
    col = _mix(nt, _math(nt, "MULTIPLY", joint, 0.85), col, (0.02, 0.02, 0.02))
    stains = _range(nt, _noise(nt, p, 7.0, 4.0), 0.65, 0.72, 0.0, 0.44)
    col = _mix(nt, stains, col, (0.035, 0.036, 0.036))
    nt.links.new(col, b.inputs["Base Color"])
    r = _range(nt, _noise(nt, p, 6.0, 6.0), 0.3, 0.7, 0.2, 0.34)
    r = _fmix(nt, worn, r, 0.72)
    r = _fmix(nt, joint, r, 0.9)
    nt.links.new(r, b.inputs["Roughness"])
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", joint, -1.0), _math(nt, "MULTIPLY", _noise(nt, p, 60.0, 4.0), 0.25))
    _bump(nt, b, h, 0.18, 0.003)
    return m


def block_mat(name, axis, lower=(0.032, 0.040, 0.050), upper=(0.105, 0.11, 0.118), dado=1.25):
    """Painted concrete block (390 x 190 with mortar joints) in two tones: a dark blue-grey dado below `dado`,
    a pale grey above, a painted line between, grime toward the floor. axis: "x" for a wall that runs along X."""
    m, nt, b = _new(name)
    p = _pos(nt)
    x, y, z = _xyz(nt, p)
    u = x if axis == "x" else y
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset, br.squash = 0.5, 1.0
    br.offset_frequency = 2
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Brick Width"].default_value = 0.40
    br.inputs["Row Height"].default_value = 0.20
    br.inputs["Mortar Size"].default_value = 0.009
    br.inputs["Mortar Smooth"].default_value = 0.35
    br.inputs["Color1"].default_value = (1, 1, 1, 1)
    br.inputs["Color2"].default_value = (0.93, 0.93, 0.93, 1)
    br.inputs["Mortar"].default_value = (0, 0, 0, 1)
    nt.links.new(_comb(nt, u, z, 0.0), br.inputs["Vector"])
    fac = _out(br, "Fac")
    tone = _out(br, "Color")
    hi = _range(nt, z, dado - 0.004, dado + 0.004, 0.0, 1.0)
    paint = _mix(nt, hi, lower, upper)
    line = _range(nt, _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", z, dado + 0.04)), 0.035, 0.04, 1.0, 0.0)
    paint = _mix(nt, line, paint, (0.035, 0.05, 0.08))
    blk = _mix(nt, 0.5, paint, tone)
    mixc = nt.nodes.new("ShaderNodeMix")
    mixc.data_type = "RGBA"
    mixc.blend_type = "MULTIPLY"
    _in(mixc, "Factor", "VALUE").default_value = 0.6
    nt.links.new(paint, _in(mixc, "A", "RGBA"))
    nt.links.new(tone, _in(mixc, "B", "RGBA"))
    col = _out(mixc, "Result", "RGBA")
    col = _mix(nt, _math(nt, "SUBTRACT", 1.0, fac), col, (0.025, 0.027, 0.03))  # mortar holds dirt
    blotch = _range(nt, _noise(nt, _comb(nt, u, z, 0.0), 1.6, 6.0), 0.3, 0.7, 0.0, 1.0)
    col = _mix(nt, _math(nt, "MULTIPLY", blotch, 0.35), col, (0.04, 0.042, 0.046))
    grime = _math(nt, "MULTIPLY", _range(nt, z, 0.0, 0.45, 1.0, 0.0),
                  _range(nt, _noise(nt, _comb(nt, u, z, 0.0), 3.0, 5.0), 0.35, 0.65, 0.4, 1.0))
    col = _mix(nt, grime, col, (0.012, 0.013, 0.014))
    streak = _range(nt, _noise(nt, _scale(nt, _comb(nt, u, z, 0.0), (14.0, 0.6, 1.0)), 2.0, 4.0), 0.62, 0.75, 0.0, 0.35)
    col = _mix(nt, _math(nt, "MULTIPLY", streak, _range(nt, z, 1.3, 2.6, 1.0, 0.2)), col, (0.03, 0.03, 0.032))
    nt.links.new(col, b.inputs["Base Color"])
    nt.links.new(_range(nt, _noise(nt, p, 8.0, 4.0), 0.3, 0.7, 0.62, 0.82), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.35
    h = _math(nt, "ADD", fac, _math(nt, "MULTIPLY", _noise(nt, _comb(nt, u, z, 0.0), 140.0, 3.0), 0.18))
    _bump(nt, b, h, 0.45, 0.004)
    return m


def concrete_mat(name, rgb=(0.062, 0.064, 0.068)):
    """Cast concrete soffit and beams: board-marked, blotchy, matt."""
    m, nt, b = _new(name)
    p = _pos(nt)
    x, y, z = _xyz(nt, p)
    board = nt.nodes.new("ShaderNodeTexWave")
    board.bands_direction = "Y"
    board.inputs["Scale"].default_value = 0.85
    board.inputs["Distortion"].default_value = 0.6
    nt.links.new(p, board.inputs["Vector"])
    col = _mix(nt, _range(nt, _noise(nt, p, 0.9, 6.0), 0.3, 0.7, 0.0, 1.0), tuple(c * 0.8 for c in rgb), tuple(c * 1.2 for c in rgb))
    col = _mix(nt, _range(nt, _out(board, "Fac"), 0.0, 1.0, 0.0, 0.25), col, tuple(c * 0.75 for c in rgb))
    nt.links.new(col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.88
    b.inputs["Specular IOR Level"].default_value = 0.3
    _bump(nt, b, _noise(nt, p, 30.0, 6.0), 0.25, 0.003)
    return m


def galvanised(name, scuff=False):
    """Hot-dip galvanised sheet: a faint spangle, satin. With scuff: the inner faces of the guards polished in a
    horizontal band where the bags rub, streaked along X, dirtier at the bottom."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = 1.0
    p = _pos(nt)
    vo = nt.nodes.new("ShaderNodeTexVoronoi")
    vo.inputs["Scale"].default_value = 76.0
    nt.links.new(p, vo.inputs["Vector"])
    cell = nt.nodes.new("ShaderNodeRGBToBW")
    nt.links.new(_out(vo, "Color"), cell.inputs[0])
    base = (0.36, 0.37, 0.38)
    col = _mix(nt, _range(nt, cell.outputs[0], 0.0, 1.0, 0.0, 1.0), tuple(c * 0.96 for c in base), tuple(c * 1.04 for c in base))
    r = _range(nt, cell.outputs[0], 0.0, 1.0, 0.44, 0.56)
    r = _fmix(nt, _range(nt, _noise(nt, p, 2.0, 5.0), 0.4, 0.7, 0.0, 1.0), r, 0.64)
    x, y, z = _xyz(nt, p)
    if scuff:
        # (the first version stretched one noise 240:1 along the run: it read as motion blur on a still rail)
        band = _math(nt, "MULTIPLY", _range(nt, z, BZ + 0.03, BZ + 0.06, 0.0, 1.0, smooth=True),
                     _range(nt, z, BZ + 0.15, BZ + 0.18, 1.0, 0.0, smooth=True))
        # fine scratches where zips and wheels drag: 5 to 30 cm long, a few mm high
        scr = _range(nt, _noise(nt, _scale(nt, p, (6.0, 1.0, 40.0)), 1.0, 3.0, 0.6), 0.66, 0.74, 0.0, 1.0)
        pol = _math(nt, "MULTIPLY", band, scr)
        col = _mix(nt, _math(nt, "MULTIPLY", pol, 0.15), col, (0.5, 0.51, 0.52))
        r = _fmix(nt, pol, r, 0.36)
        # black rubber rub marks: longer, softer, sparse
        rub = _math(nt, "MULTIPLY", band,
                    _range(nt, _noise(nt, _scale(nt, p, (1.1, 1.0, 36.0)), 1.0, 4.0), 0.6, 0.74, 0.0, 0.7))
        col = _mix(nt, rub, col, (0.07, 0.07, 0.072))
        r = _fmix(nt, rub, r, 0.72)
        dirt = _range(nt, z, BZ - 0.02, BZ + 0.05, 0.8, 0.0)
        col = _mix(nt, dirt, col, (0.08, 0.08, 0.08))
        r = _fmix(nt, dirt, r, 0.8)
    nt.links.new(col, b.inputs["Base Color"])
    nt.links.new(r, b.inputs["Roughness"])
    return m


def belt_mat():
    """The black rubber belt: worn smooth down the middle where the bags ride (a soft sheen that catches the battens),
    dusty grey toward the edges, long wear streaks along the run, a fine rough-top texture."""
    m, nt, b = _new("belt rubber")
    p = _pos(nt)
    x, y, z = _xyz(nt, p)
    ay = _math(nt, "ABSOLUTE", y)
    edge = _range(nt, ay, 0.30, 0.49, 0.0, 1.0, smooth=True)
    # (the first version's strong, glossy 8 m streaks read as brushed metal: now matt rubber, faint wear lanes,
    # short scuffs, dust mottle)
    lanes = _range(nt, _noise(nt, _scale(nt, p, (0.05, 9.0, 1.0)), 2.0, 4.0), 0.3, 0.7, 0.0, 1.0)
    scuff = _range(nt, _noise(nt, _scale(nt, p, (2.2, 70.0, 1.0)), 2.0, 3.0, 0.6), 0.62, 0.74, 0.0, 1.0)
    mott = _range(nt, _noise(nt, p, 5.0, 6.0, 0.65), 0.3, 0.7, 0.0, 1.0)
    col = _mix(nt, lanes, (0.017, 0.017, 0.018), (0.027, 0.027, 0.029))
    col = _mix(nt, _math(nt, "MULTIPLY", mott, 0.7), col, (0.042, 0.043, 0.045))
    col = _mix(nt, _math(nt, "MULTIPLY", scuff, 0.30), col, (0.045, 0.045, 0.046))
    dust = _math(nt, "MULTIPLY", edge, _range(nt, _noise(nt, p, 3.0, 6.0), 0.3, 0.7, 0.5, 1.0))
    col = _mix(nt, dust, col, (0.06, 0.06, 0.058))
    nt.links.new(col, b.inputs["Base Color"])
    # (at roughness 0.56-0.66 the grazing sheen under a batten turned the belt into a pale grey slab seen low)
    r = _fmix(nt, lanes, 0.66, 0.78)
    r = _fmix(nt, scuff, r, 0.86)
    r = _fmix(nt, edge, r, 0.9)
    nt.links.new(r, b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.3
    h = _math(nt, "ADD", _noise(nt, p, 420.0, 2.0), _math(nt, "MULTIPLY", scuff, -0.6))
    _bump(nt, b, h, 0.12, 0.0006)
    return m


def strip_mat():
    """Smoky PVC with a shallow abrasion band around luggage height."""
    m, nt, b = _new("smoke PVC")
    p = _pos(nt)
    z = _xyz(nt, p)[2]
    wear = _range(nt, _noise(nt, p, 16, 3), 0.4, 0.7, 0.0, 1.0)
    wear = _math(nt, "MULTIPLY", wear, _range(nt, z, BZ + 0.08, BZ + 0.5, 1, 0))
    col = _mix(nt, wear, (0.085, 0.099, 0.107), (0.12, 0.13, 0.135))
    nt.links.new(col, b.inputs["Base Color"])
    nt.links.new(_fmix(nt, wear, 0.245, 0.36), b.inputs["Roughness"])
    b.inputs["Transmission Weight"].default_value = 0.60
    b.inputs["IOR"].default_value = 1.51
    return m


def stripes_mat(name, direction, pitch=0.1, worn=0.3, yellow=(0.62, 0.42, 0.025)):
    """Yellow and black safety stripes (paint or tape) at 45 degrees in world space, worn and dirty."""
    m, nt, b = _new(name)
    p = _pos(nt)
    vm = nt.nodes.new("ShaderNodeVectorMath")
    vm.operation = "DOT_PRODUCT"
    vm.inputs[1].default_value = direction
    nt.links.new(p, vm.inputs[0])
    s = _math(nt, "FRACT", _math(nt, "DIVIDE", _out(vm, "Value"), pitch))
    band = _range(nt, s, 0.48, 0.52, 0.0, 1.0)
    col = _mix(nt, band, yellow, (0.012, 0.012, 0.013))
    dirt = _range(nt, _noise(nt, p, 7.0, 6.0, 0.65), 0.5, 0.75, 0.0, worn)
    col = _mix(nt, dirt, col, (0.05, 0.048, 0.045))
    nt.links.new(col, b.inputs["Base Color"])
    nt.links.new(_range(nt, _noise(nt, p, 20.0, 4.0), 0.3, 0.7, 0.45, 0.7), b.inputs["Roughness"])
    return m


def floor_paint():
    """Yellow floor line paint: worn through to the concrete in patches, dirtier at the edges of traffic."""
    m, nt, b = _new("floor line paint")
    p = _pos(nt)
    wear = _range(nt, _noise(nt, _scale(nt, p, (0.6, 2.5, 1.0)), 4.0, 8.0, 0.7), 0.56, 0.64, 0.0, 1.0)
    col = _mix(nt, _range(nt, _noise(nt, p, 2.0, 5.0), 0.3, 0.7, 0.0, 1.0), (0.42, 0.29, 0.02), (0.55, 0.38, 0.03))
    col = _mix(nt, wear, col, (0.09, 0.085, 0.08))
    nt.links.new(col, b.inputs["Base Color"])
    nt.links.new(_fmix(nt, wear, 0.42, 0.75), b.inputs["Roughness"])
    return m


def paper_mat():
    """Bag-tag paper: matt, slightly warm, a fibre tooth, a little grubby."""
    m, nt, b = _new("tag paper")
    p = nt.nodes.new("ShaderNodeTexCoord").outputs["Object"]
    col = _mix(nt, _range(nt, _noise(nt, p, 18.0, 5.0), 0.35, 0.7, 0.0, 1.0), (0.43, 0.415, 0.38), (0.36, 0.345, 0.31))
    nt.links.new(col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.86
    b.inputs["Specular IOR Level"].default_value = 0.25
    _bump(nt, b, _noise(nt, p, 900.0, 3.0), 0.06, 0.0004)
    return m


def screen_mat(name, rgb, strength, falloff=0.35):
    """A blank glowing screen or lens: brighter in the middle, falling off to the edges (no text, no UI)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    gx, gy, gz = _xyz(nt, tc.outputs["Generated"])
    acc = None
    for c in (gx, gy, gz):
        d = _math(nt, "SUBTRACT", c, 0.5)
        sq = _math(nt, "MULTIPLY", d, d)
        acc = sq if acc is None else _math(nt, "ADD", acc, sq)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    nt.links.new(_range(nt, acc, 0.0, 0.75, strength, strength * (1 - falloff)), em.inputs["Strength"])
    nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def materials():
    if M:
        return M
    M.update(
        floor=floor_mat(),
        wall_x=block_mat("block wall x", "x"),
        wall_y=block_mat("block wall y", "y"),
        wall_end=block_mat("block wall end", "y", upper=(0.07, 0.074, 0.08)),
        wall_back=block_mat("block wall back room", "y", lower=(0.02, 0.022, 0.026), upper=(0.04, 0.042, 0.045)),
        concrete=concrete_mat("concrete soffit"),
        beam=concrete_mat("concrete beam", (0.07, 0.072, 0.076)),
        galv=galvanised("galvanised"),
        guard=galvanised("guard galvanised", scuff=True),
        belt=belt_mat(),
        strip=strip_mat(),
        paper=paper_mat(),
        frame=pbr("conveyor frame paint", (0.055, 0.062, 0.07), (0.38, 0.55), nscale=6, cvar=0.12, coat=0.12, world=True,
                  chips=((0.3, 0.3, 0.31), 0.4), grime=(0.0, 0.5, 0.5)),
        leg=pbr("leg paint", (0.055, 0.062, 0.07), (0.4, 0.58), nscale=6, cvar=0.12, coat=0.1, world=True,
                chips=((0.3, 0.3, 0.31), 0.6), grime=(0.0, 0.35, 0.6)),
        yellow=pbr("safety yellow paint", (0.6, 0.41, 0.025), (0.35, 0.55), nscale=7, cvar=0.12, coat=0.15, world=True,
                   chips=((0.05, 0.05, 0.05), 0.5), grime=(0.0, 0.6, 0.45)),
        yellow_cable=pbr("pull cord sheath", (0.55, 0.38, 0.02), (0.4, 0.5), nscale=30, cvar=0.1, world=True),
        red=pbr("signal red paint", (0.25, 0.022, 0.018), (0.3, 0.45), nscale=8, cvar=0.1, coat=0.3, world=True),
        enclosure=pbr("enclosure grey", (0.16, 0.165, 0.17), (0.35, 0.5), nscale=5, cvar=0.08, coat=0.2, world=True,
                      grime=(0.4, 1.0, 0.3)),
        plastic=pbr("black plastic", (0.018, 0.018, 0.02), (0.38, 0.5), nscale=12, cvar=0.1),
        rubber=pbr("black rubber", (0.02, 0.02, 0.021), (0.62, 0.8), nscale=9, cvar=0.2, bump=0.2, bscale=200),
        roller=pbr("roller steel", (0.5, 0.51, 0.52), (0.3, 0.44), metal=1.0, nscale=5, stretch=(1, 1, 8), cvar=0.12,
                   aniso=0.3, world=True, grime=(BZ - 0.06, BZ - 0.005, 0.5)),
        steel=pbr("brushed steel", (0.58, 0.59, 0.6), (0.24, 0.38), metal=1.0, nscale=3, stretch=(1, 30, 30), cvar=0.08,
                  aniso=0.4, world=True),
        # the slide is brushed down its slope (along Y), worn duller where the bags run
        stainless=pbr("chute stainless", (0.36, 0.37, 0.38), (0.52, 0.62), metal=1.0, nscale=3, stretch=(24, 1, 1),
                      cvar=0.035, aniso=0.0),
        dark_steel=pbr("dark steel", (0.2, 0.205, 0.21), (0.35, 0.55), metal=1.0, nscale=7, cvar=0.2, world=True),
        motor=pbr("motor paint", (0.045, 0.06, 0.075), (0.3, 0.45), nscale=8, cvar=0.15, coat=0.3, world=True,
                  chips=((0.3, 0.3, 0.31), 0.3)),
        void=pbr("void", (0.004, 0.004, 0.005), (0.9, 1.0), nscale=2, cvar=0.0, spec=0.1),
        hazard_v=stripes_mat("hazard tape", (0.5, 0.5, 0.7071)),     # diagonal on faces across X and across Y alike
        hazard_vy=stripes_mat("hazard tape y", (0.0, 0.7071, 0.7071)),
        hazard_floor=stripes_mat("hazard floor", (0.7071, 0.7071, 0.0), pitch=0.2, worn=0.55, yellow=(0.45, 0.31, 0.02)),
        line=floor_paint(),
        door=pbr("door steel paint", (0.07, 0.078, 0.088), (0.35, 0.5), nscale=4, cvar=0.08, coat=0.2, world=True,
                 grime=(0.0, 0.6, 0.4)),
        cage=pbr("lamp cage", (0.03, 0.032, 0.035), (0.4, 0.55), metal=0.6, nscale=20, cvar=0.1),
        opal_off=pbr("diffuser off", (0.2, 0.205, 0.21), (0.5, 0.6), nscale=5, cvar=0.08),
        tube=sk.emission("batten diffuser", COOL, 14.0),
        tube_mid=sk.emission("batten diffuser mid", COOL, 9.0),
        tube_low=sk.emission("batten diffuser low", COOL, 5.0),
        bulk_lens=sk.emission("bulkhead lens", (0.86, 0.92, 1.0), 6.0),
        sodium=sk.emission("sodium lamp", SODIUM, 24.0),
        backglow=screen_mat("vision panel glow", (0.7, 0.8, 1.0), 1.6, 0.5),
        backroom=screen_mat("lit room behind the curtain", (0.78, 0.86, 1.0), 2.4, 0.55),
        sign_yellow=pbr("sign yellow", (0.6, 0.42, 0.03), (0.4, 0.55), nscale=9, cvar=0.08, world=True),
        sign_black=pbr("sign black", (0.015, 0.015, 0.016), (0.45, 0.6), nscale=9, cvar=0.08, world=True),
        sign_blue=pbr("sign blue", (0.02, 0.07, 0.2), (0.4, 0.55), nscale=9, cvar=0.08, world=True),
        sign_white=pbr("sign white", (0.5, 0.5, 0.48), (0.45, 0.6), nscale=9, cvar=0.06, world=True),
        exit=screen_mat("exit glow", (0.3, 1.0, 0.55), 2.2, 0.4),
        hmi=screen_mat("hmi blank", (0.55, 0.72, 1.0), 10.0, 0.45),
        led_green=sk.emission("led green", (0.25, 1.0, 0.4), 18.0),
        led_amber=sk.emission("led amber", (1.0, 0.55, 0.12), 14.0),
        led_off=pbr("led off", (0.05, 0.03, 0.02), (0.15, 0.25), nscale=10, cvar=0.05),
        glass=pbr("lamp glass", (0.6, 0.62, 0.64), (0.08, 0.12), nscale=10, cvar=0.05, spec=0.6),
    )
    return M


# ---------------------------------------------------------------- geometry helpers
def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0), segs=3):
    ob = sk.box(name, size, loc, m, bevel=bevel, rot=rot)
    if bevel:
        ob.modifiers["bevel"].limit_method = "ANGLE"
        ob.modifiers["bevel"].segments = segs
    return ob


def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=24, bevel=0.0):
    ob = sk.cyl(name, r, depth, loc, m, rot=rot, verts=verts)
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments, bv.limit_method = bevel, 2, "ANGLE"
        bv.angle_limit = math.radians(40)
        ob.modifiers.new("wn", "WEIGHTED_NORMAL")
    return ob


def light(name, loc, size, energy, colour=COOL, spread=180, rot=(0, 0, 0), camera=False):
    li = sk.area_light(name, loc, size, energy, colour, spread_deg=spread, rot=rot)
    li.visible_camera = camera
    return li


def point(name, loc, energy, colour, radius=0.03):
    li = bpy.data.lights.new(name, "POINT")
    li.energy, li.color, li.shadow_soft_size = energy, colour, radius
    ob = bpy.data.objects.new(name, li)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.visible_camera = False
    return ob


def spot(name, loc, energy, colour, size_deg, blend, rot, radius=0.08):
    li = bpy.data.lights.new(name, "SPOT")
    li.energy, li.color, li.spot_size, li.spot_blend, li.shadow_soft_size = energy, colour, math.radians(size_deg), blend, radius
    ob = bpy.data.objects.new(name, li)
    bpy.context.scene.collection.objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    ob.visible_camera = False
    return ob


class Batch:
    """Many boxes and rods in one mesh (one object, one material): bolts, brackets, rollers."""

    def __init__(self):
        self.bm = bmesh.new()

    def box(self, size, loc, rot=Matrix.Identity(3)):
        mtx = Matrix.Translation(loc) @ rot.to_4x4() @ Matrix.Diagonal((*size, 1))
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=mtx)

    def rod(self, a, b, r, segs=12):
        a, b = Vector(a), Vector(b)
        d = b - a
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        mtx = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4()
        bmesh.ops.create_cone(self.bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=d.length, matrix=mtx)

    def done(self, name, m, bevel=0.0, segs=2, smooth=True):
        me = bpy.data.meshes.new(name)
        self.bm.normal_update()
        self.bm.to_mesh(me)
        self.bm.free()
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.data.materials.append(m)
        if smooth:
            for p in me.polygons:
                p.use_smooth = True
        if bevel:
            bv = ob.modifiers.new("bevel", "BEVEL")
            bv.width, bv.segments, bv.limit_method = bevel, segs, "ANGLE"
            bv.angle_limit = math.radians(40)
            ob.modifiers.new("wn", "WEIGHTED_NORMAL")
        return ob


def tube(name, pts, r, m, res=4):
    """A cable or hose through points (poly bezier, auto handles)."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution = "3D", r, res
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for bp, co in zip(sp.bezier_points, pts):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    ob = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(m)
    return ob


def focus(name, loc):
    e = bpy.data.objects.get(name) or bpy.data.objects.new(name, None)
    if e.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(e)
    e.location = loc
    FOCUS[name] = e
    return e


# ---------------------------------------------------------------- the hall
def hall():
    m = materials()
    L = HX1 - HX0
    cx = (HX0 + HX1) / 2
    W = YW1 - YW0
    cy = (YW0 + YW1) / 2
    box("floor", (L + 6.0, W + 0.6, 0.04), (cx - 2.5, cy, -0.02), m["floor"])
    box("soffit", (L + 6.0, W + 0.6, 0.3), (cx - 2.5, cy, H + 0.15), m["concrete"])
    box("wall_s", (L + 6.0, 0.3, H), (cx - 2.5, YW0 - 0.15, H / 2), m["wall_x"])
    box("wall_n", (L + 6.0, 0.3, H), (cx - 2.5, YW1 + 0.15, H / 2), m["wall_x"])
    for x in BEAMS:   # downstand beams across the hall, pilasters under each on both walls
        box(f"beam_{x:.1f}", (0.36, W, 0.44), (x, cy, H - 0.22), m["beam"], bevel=0.012)
        for s, yw in ((-1, YW0), (1, YW1)):
            pil = box(f"pilaster_{x:.1f}_{s}", (0.42, 0.22, H), (x, yw - s * 0.11, H / 2), m["wall_x"], bevel=0.01)
            # column protector: hazard tape round the bottom metre
            box(f"pil_guard_{x:.1f}_{s}", (0.43, 0.228, 0.9), (x, yw - s * 0.11, 0.5), m["hazard_v"], bevel=0.006)
            del pil
    # a skirting kick of darker paint is in the wall shader; here only a steel kerb angle along the walkway wall
    box("kerb_s", (L, 0.05, 0.08), (cx, YW0 + 0.025, 0.04), m["yellow"], bevel=0.008)


def curtain_wall():
    """The end wall at x = 0 with the belt opening, a hazard-taped steel frame, the strip curtain on its bar, the
    control panel and a caged bulkhead lamp beside it. Behind it, the check-in side: a dark room lit near the belt."""
    m = materials()
    o = OPEN
    t = 0.3
    xw = HX0 - t / 2
    yl, yr = YW0 - 0.3, YW1 + 0.3
    box("cwall_left", (t, o["y0"] - yl, H), (xw, (yl + o["y0"]) / 2, H / 2), m["wall_end"])
    box("cwall_right", (t, yr - o["y1"], H), (xw, (yr + o["y1"]) / 2, H / 2), m["wall_end"])
    box("cwall_top", (t, o["y1"] - o["y0"], H - o["z1"]), (xw, 0, (H + o["z1"]) / 2), m["wall_end"])
    box("cwall_bottom", (t, o["y1"] - o["y0"], o["z0"]), (xw, 0, o["z0"] / 2), m["wall_end"])
    # opening reveals (the cut through the block, painted dark)
    for s, yy in ((-1, o["y0"]), (1, o["y1"])):
        box(f"reveal_{s}", (t, 0.02, o["z1"] - o["z0"]), (xw, yy - s * 0.01, (o["z0"] + o["z1"]) / 2), m["void"])
    box("reveal_top", (t, o["y1"] - o["y0"], 0.02), (xw, 0, o["z1"] - 0.01), m["void"])
    # steel frame round the opening, its face taped yellow and black
    fw, fd = 0.1, 0.025
    fr = [((fd, fw, o["z1"] - o["z0"] + 2 * fw), (HX0 + fd / 2, o["y0"] - fw / 2, (o["z0"] + o["z1"]) / 2)),
          ((fd, fw, o["z1"] - o["z0"] + 2 * fw), (HX0 + fd / 2, o["y1"] + fw / 2, (o["z0"] + o["z1"]) / 2)),
          ((fd, o["y1"] - o["y0"], fw), (HX0 + fd / 2, 0, o["z1"] + fw / 2))]
    for i, (size, loc) in enumerate(fr):
        box(f"frame_{i}", size, loc, m["hazard_vy"], bevel=0.004)
    # curtain bar with its clamp plates and bolts
    ztop = o["z1"] - 0.03
    box("curtain_bar", (0.03, o["y1"] - o["y0"] + 0.06, 0.06), (XC - 0.008, 0, ztop + 0.01), m["galv"], bevel=0.004)
    bolts = Batch()
    for i in range(9):
        y = o["y0"] + 0.06 + i * (o["y1"] - o["y0"] - 0.12) / 8
        bolts.rod((XC + 0.006, y, ztop + 0.01), (XC + 0.02, y, ztop + 0.01), 0.008, 6)
    bolts.done("curtain_bolts", m["steel"], bevel=0.002)
    # Staggered overlapping PVC strips part around the first case and expose the back room.
    strip_curtain("strip", XC + 0.012, o["y0"] + 0.02, o["y1"] - 0.02, ztop - 0.005, BZ + 0.012, 7, 0.211, gaps=0.011)
    # back room (the check-in side): the belt runs on into it; it is lit, so the strips are backlit, light spills
    # out under whatever parts them, and the gaps between strips show as cold slivers
    box("back_wall", (0.3, YW1 - YW0, H), (X0 - 0.4, (YW0 + YW1) / 2, H / 2), m["wall_back"])
    box("back_glow", (0.02, 3.2, 2.3), (X0 - 0.1, 0.0, 1.35), m["backroom"])
    bl = light("behind_curtain", (-1.6, 0.0, BZ + 0.7), (1.2, 0.5), 90.0, (0.78, 0.86, 1.0), spread=110,
               rot=(0, math.radians(-78), 0))
    bl.visible_glossy = True
    light("behind_curtain_low", (-0.9, 0.0, BZ + 0.5), (0.6, 0.3), 12.0, (0.78, 0.86, 1.0), spread=140,
          rot=(0, math.radians(-90), 0))
    control_panel()
    wall_dressing()


def control_panel():
    """A grey steel control enclosure on the end wall left of the opening (seen from the hall): blank screen, three
    pilot lamps (one green lit), a red mushroom stop on a yellow plate, conduits to the ceiling and the floor."""
    m = materials()
    y, z = -1.55, 1.32
    box("panel_body", (0.2, 0.5, 0.62), (HX0 + 0.1, y, z), m["enclosure"], bevel=0.01)
    box("panel_door_seam", (0.004, 0.46, 0.58), (HX0 + 0.2, y, z), m["plastic"], bevel=0.001)
    box("panel_door", (0.006, 0.455, 0.575), (HX0 + 0.204, y, z), m["enclosure"], bevel=0.004)
    box("panel_screen_bezel", (0.012, 0.22, 0.15), (HX0 + 0.21, y + 0.06, z + 0.13), m["plastic"], bevel=0.004)
    box("panel_screen", (0.004, 0.18, 0.115), (HX0 + 0.2165, y + 0.06, z + 0.13), m["hmi"])
    for i, mm in enumerate((m["led_green"], m["led_off"], m["led_off"])):
        cyl(f"panel_pilot_ring{i}", 0.017, 0.016, (HX0 + 0.214, y - 0.15, z + 0.17 - i * 0.07), m["dark_steel"],
            rot=(0, math.pi / 2, 0), bevel=0.002)
        cyl(f"panel_pilot{i}", 0.012, 0.006, (HX0 + 0.224, y - 0.15, z + 0.17 - i * 0.07), mm, rot=(0, math.pi / 2, 0))
    box("panel_estop_plate", (0.006, 0.09, 0.09), (HX0 + 0.21, y + 0.06, z - 0.14), m["yellow"], bevel=0.003)
    cyl("panel_estop", 0.026, 0.035, (HX0 + 0.228, y + 0.06, z - 0.14), m["red"], rot=(0, math.pi / 2, 0), bevel=0.006)
    for i in range(2):
        box(f"panel_hinge{i}", (0.02, 0.02, 0.06), (HX0 + 0.205, y - 0.24, z + 0.2 - 0.4 * i), m["dark_steel"], bevel=0.003)
    box("panel_handle", (0.025, 0.02, 0.1), (HX0 + 0.215, y + 0.215, z), m["plastic"], bevel=0.005)
    pt = point("panel_screen_spill", (HX0 + 0.35, y + 0.06, z + 0.13), 5.5, (0.6, 0.75, 1.0), 0.06)
    pt.visible_glossy = False
    point("panel_led_spill", (HX0 + 0.26, y - 0.15, z + 0.17), 0.12, (0.3, 1.0, 0.45), 0.01)
    c = Batch()
    c.rod((HX0 + 0.06, y + 0.18, z + 0.31), (HX0 + 0.06, y + 0.18, H - 0.02), 0.016)
    c.rod((HX0 + 0.06, y - 0.12, z + 0.31), (HX0 + 0.06, y - 0.12, H - 0.02), 0.012)
    c.rod((HX0 + 0.06, y, z - 0.31), (HX0 + 0.06, y, 0.0), 0.02)
    for zz in (0.3, 2.1, 2.9):
        c.box((0.03, 0.05, 0.02), (HX0 + 0.04, y + 0.18, zz + (1.5 if zz < 1 else 0)))
    c.done("panel_conduits", m["galv"], bevel=0.002)
    # caged bulkhead lamp over the panel: a practical that lights the wall and the panel
    bulkhead("bulk_panel", (HX0, -1.55, 2.32), "x")


def plate(name, yz, x, t, m, bevel=0.0):
    """A flat plate on the end wall, facing +X: the outline `yz` (list of (y, z)) extruded from x to x + t."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z)) for y, z in yz]
    f = bm.faces.new(vs)
    bmesh.ops.extrude_face_region(bm, geom=[f])
    bm.verts.ensure_lookup_table()
    for v in bm.verts[len(yz):]:
        v.co.x = x + t
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(m)
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments, bv.limit_method = bevel, 2, "ANGLE"
    return ob


def disc(name, y, z, x, r, t, m):
    ob = cyl(name, r, t, (x + t / 2, y, z), m, rot=(0, math.pi / 2, 0), verts=48)
    for p in ob.data.polygons:      # flat: smooth shading over the rim made the disc look like a dome
        p.use_smooth = False
    return ob


def wall_dressing():
    """A louvred service hatch and isolator switch flank the belt opening."""
    m = materials()
    x = HX0
    # The operator can see straight through this unmarked perforated access cover.
    y, z = 1.03, 1.32
    box("access_recess", (0.014, 0.26, 0.36), (x + 0.009, y, z), m["void"], bevel=0.006)
    grille = Batch()
    for side in (-1, 1):
        grille.box((0.026, 0.015, 0.36), (x + 0.025, y + side * 0.125, z))
        grille.box((0.026, 0.245, 0.014), (x + 0.025, y, z + side * 0.174))
    for row in range(7):
        grille.box((0.030, 0.23, 0.014), (x + 0.027, y, z - 0.135 + row * 0.045))
    grille.done("access_louvres", m["enclosure"], bevel=0.002)
    # isolator switch: a grey box with a red rotary handle on a yellow plate, conduit up to the tray
    iy, iz = SIGN_Y[2], 1.3
    box("isolator_body", (0.11, 0.2, 0.28), (x + 0.055, iy, iz), m["enclosure"], bevel=0.008)
    box("isolator_plate", (0.004, 0.11, 0.11), (x + 0.112, iy, iz + 0.03), m["yellow"], bevel=0.002)
    cyl("isolator_hub", 0.03, 0.02, (x + 0.123, iy, iz + 0.03), m["red"], rot=(0, math.pi / 2, 0), bevel=0.004)
    box("isolator_lever", (0.02, 0.022, 0.085), (x + 0.14, iy, iz + 0.045), m["red"], bevel=0.005,
        rot=(math.radians(28), 0, 0))
    c = Batch()
    c.rod((x + 0.05, iy, iz + 0.14), (x + 0.05, iy, H - 0.02), 0.013)
    c.rod((x + 0.05, iy - 0.05, iz - 0.14), (x + 0.05, iy - 0.05, 0.0), 0.013)
    for zz in (2.0, 2.8, 0.6):
        c.box((0.03, 0.05, 0.02), (x + 0.03, iy if zz > 1 else iy - 0.05, zz))
    c.done("isolator_conduit", m["galv"], bevel=0.002)
    bulkhead("bulk_far_side", (x, 1.55, 2.32), "x", lit=False)


def bulkhead(name, loc, facing, lit=True, energy=9.0):
    """A caged oval bulkhead lamp on a wall. facing: "x" (on the end wall, facing +X), "-y" or "+y"."""
    m = materials()
    x, y, z = loc
    if facing == "x":
        rot, n = (0, math.pi / 2, 0), Vector((1, 0, 0))
    elif facing == "-y":
        rot, n = (math.pi / 2, 0, 0), Vector((0, -1, 0))
    else:
        rot, n = (-math.pi / 2, 0, 0), Vector((0, 1, 0))
    base = Vector(loc)
    ob = cyl(name + "_base", 0.11, 0.05, base + n * 0.025, m["enclosure"], rot=rot, verts=32, bevel=0.008)
    ob.scale = (1.0, 0.7, 1.0) if facing == "x" else (1.0, 0.7, 1.0)
    lens = cyl(name + "_lens", 0.085, 0.045, base + n * 0.07, m["bulk_lens"] if lit else m["opal_off"], rot=rot, verts=32,
               bevel=0.01)
    lens.scale = ob.scale
    cg = Batch()
    for k in range(3):
        a = (k - 1) * 0.045
        if facing == "x":
            cg.rod(base + Vector((0.05, a * 1.0, -0.08)), base + Vector((0.05, a * 1.0, 0.08)), 0.005, 6)
            cg.rod(base + Vector((0.1, a * 1.0, -0.06)), base + Vector((0.1, a * 1.0, 0.06)), 0.005, 6)
        else:
            cg.rod(base + n * 0.05 + Vector((a, 0, -0.08)), base + n * 0.05 + Vector((a, 0, 0.08)), 0.005, 6)
            cg.rod(base + n * 0.1 + Vector((a, 0, -0.06)), base + n * 0.1 + Vector((a, 0, 0.06)), 0.005, 6)
    cg.done(name + "_cage", m["cage"], bevel=0.0015)
    if lit:
        li = light(name + "_light", tuple(base + n * 0.14), (0.16, 0.12), energy, (0.85, 0.91, 1.0), spread=160,
                   rot=n.to_track_quat("-Z", "Y").to_euler())
        return li
    return None


def far_wall():
    """The far end: the belt disappears through a second, unlit strip curtain; a steel door with a faint vision panel
    and a light line under it; a green exit glow above it (a blank box, no pictogram text)."""
    m = materials()
    t = 0.3
    xw = HX1 + t / 2
    o = dict(y0=-0.7, y1=0.7, z0=0.22, z1=BZ + 1.02)
    yl, yr = YW0 - 0.3, YW1 + 0.3
    box("fwall_left", (t, o["y0"] - yl, H), (xw, (yl + o["y0"]) / 2, H / 2), m["wall_y"])
    box("fwall_right", (t, yr - o["y1"], H), (xw, (yr + o["y1"]) / 2, H / 2), m["wall_y"])
    box("fwall_top", (t, o["y1"] - o["y0"], H - o["z1"]), (xw, 0, (H + o["z1"]) / 2), m["wall_y"])
    box("fwall_bottom", (t, o["y1"] - o["y0"], o["z0"]), (xw, 0, o["z0"] / 2), m["wall_y"])
    box("fwall_void", (0.05, o["y1"] - o["y0"], o["z1"] - o["z0"]), (HX1 + 0.5, 0, (o["z0"] + o["z1"]) / 2), m["void"])
    for i, (size, loc) in enumerate([((0.025, 0.1, o["z1"] - o["z0"] + 0.2), (HX1 - 0.0125, o["y0"] - 0.05, (o["z0"] + o["z1"]) / 2)),
                                     ((0.025, 0.1, o["z1"] - o["z0"] + 0.2), (HX1 - 0.0125, o["y1"] + 0.05, (o["z0"] + o["z1"]) / 2)),
                                     ((0.025, o["y1"] - o["y0"], 0.1), (HX1 - 0.0125, 0, o["z1"] + 0.05))]):
        box(f"fframe_{i}", size, loc, m["hazard_vy"], bevel=0.004)
    strip_curtain("fstrip", HX1 - 0.04, o["y0"] + 0.02, o["y1"] - 0.02, o["z1"] - 0.035, BZ + 0.012, 8, 0.2, drape=False)
    # the door
    dy, dw, dh = -2.1, 1.0, 2.1
    box("fdoor_frame", (0.06, dw + 0.12, dh + 0.06), (HX1 - 0.02, dy, (dh + 0.06) / 2), m["door"], bevel=0.006)
    box("fdoor_leaf", (0.05, dw - 0.02, dh - 0.02), (HX1 - 0.05, dy, dh / 2), m["door"], bevel=0.005)
    box("fdoor_panel", (0.012, 0.22, 0.5), (HX1 - 0.076, dy + 0.2, 1.45), m["backglow"])
    box("fdoor_kick", (0.006, dw - 0.06, 0.25), (HX1 - 0.078, dy, 0.14), m["steel"], bevel=0.002)
    box("fdoor_handle", (0.06, 0.15, 0.025), (HX1 - 0.1, dy - 0.36, 1.03), m["steel"], bevel=0.006)
    light("fdoor_glass_light", (HX1 - 0.09, dy + 0.2, 1.45), (0.5, 0.22), 3.0, (0.7, 0.8, 1.0), spread=150,
          rot=(0, math.radians(90), 0))
    light("fdoor_gap_light", (HX1 - 0.07, dy, 0.006), (0.01, dw - 0.06), 1.2, (0.7, 0.8, 1.0), spread=150,
          rot=(0, math.radians(90), 0))
    box("fexit_box", (0.08, 0.36, 0.14), (HX1 - 0.04, dy, 2.38), m["enclosure"], bevel=0.006)
    box("fexit_face", (0.004, 0.32, 0.1), (HX1 - 0.0815, dy, 2.38), m["exit"])
    li = light("fexit_spill", (HX1 - 0.12, dy, 2.38), (0.3, 0.1), 0.8, (0.3, 1.0, 0.55), spread=150,
               rot=(0, math.radians(90), 0))
    del li


# ---------------------------------------------------------------- the strip curtains
def strip_curtain(name, xc, y0, y1, ztop, zbot, n, w, drape=True, gaps=0.0):
    m = materials()
    pitch = (y1 - y0 - w) / (n - 1)
    rnd = random.Random(sum(map(ord, name)))
    for i in range(n):
        yc = y0 + w / 2 + i * pitch + (rnd.uniform(-gaps, gaps) if 0 < i < n - 1 else 0.0)
        xp = xc + (0.009 if i % 2 else 0.0)
        rows, cols = 40, 5
        verts = [(xp, yc - w / 2 + w * j / (cols - 1), ztop - (ztop - zbot) * r / (rows - 1))
                 for r in range(rows) for j in range(cols)]
        faces = [(r * cols + j, r * cols + j + 1, (r + 1) * cols + j + 1, (r + 1) * cols + j)
                 for r in range(rows - 1) for j in range(cols - 1)]
        me = bpy.data.meshes.new(f"{name}{i}")
        me.from_pydata(verts, [], faces)
        for p in me.polygons:
            p.use_smooth = True
        ob = bpy.data.objects.new(f"{name}{i}", me)
        bpy.context.scene.collection.objects.link(ob)
        me.materials.append(m["strip"])
        so = ob.modifiers.new("thickness", "SOLIDIFY")
        so.thickness, so.offset = 0.004, 0.0
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments, bv.limit_method = 0.0015, 2, "ANGLE"
        s = dict(ob=ob, y=yc, x=xp, w=w, top=ztop, L=ztop - zbot, rows=rows, cols=cols,
                 lean=math.radians(rnd.uniform(-1.5, 2.5)), twist=rnd.uniform(-0.01, 0.01), drape=drape)
        STRIPS.append(s)
        hang(s, None)


def _height(bvh, x, y):
    if bvh is None:
        return None
    hit = bvh.ray_cast(Vector((x, y, 3.0)), Vector((0, 0, -1)), 3.0)
    return hit[0].z if hit[0] is not None else None


def _resample(path, n, L):
    """Points at equal arc length along a polyline, out to length L (extended straight if the path is short)."""
    seg = [0.0]
    for a, b in zip(path, path[1:]):
        seg.append(seg[-1] + (b - a).length)
    out = []
    k = 0
    for i in range(n):
        s = L * i / (n - 1)
        while k < len(path) - 2 and seg[k + 1] < s:
            k += 1
        a, b = path[k], path[k + 1]
        span = max(1e-9, seg[k + 1] - seg[k])
        t = (s - seg[k]) / span
        out.append(a.lerp(b, t) if t <= 1.0 else b + (b - a).normalized() * (s - seg[k + 1]))
    return out


def _column(s, y, bvh):
    """The hanging line of one edge column of a strip: free (with its little lean), or draped over a bag pushing
    through: down from the bar, bending forward onto the bag's top, lying along it, then over its front edge."""
    xp, top, L = s["x"], s["top"], s["L"]
    h0 = _height(bvh, xp, y) if s["drape"] else None
    if h0 is None:
        ahead = None
        if s["drape"]:
            for dx in (0.03, 0.06, 0.09, 0.12):
                hh = _height(bvh, xp + dx, y)
                if hh is not None:
                    ahead = (dx, hh)
                    break
        lean = s["lean"]
        if ahead is not None:   # the bag has just gone through: the strip still rests on its tail
            dx, hh = ahead
            lean = max(lean, math.atan2(dx + 0.02, top - hh))
        path = [Vector((xp + d * math.sin(lean), y, top - d * math.cos(lean))) for d in (0.0, L * 1.02)]
        return _resample(path, s["rows"], L)
    xt = xp + 0.17
    zt = _height(bvh, xt, y)
    if zt is None or zt < h0 - 0.05:
        xt, zt = xp + 0.03, h0
    zt += 0.008
    p0, c, p1 = Vector((xp, y, top)), Vector((xp + 0.01, y, zt + 0.12)), Vector((xt, y, zt))
    path = [(1 - t) ** 2 * p0 + 2 * (1 - t) * t * c + t ** 2 * p1 for t in [i / 24 for i in range(25)]]
    x = xt
    floor = BZ + 0.004
    while len(path) < 400:
        x += 0.008
        hh = _height(bvh, x, y)
        if hh is None:
            last = path[-1]
            path.append(Vector((last.x + 0.02, y, max(floor, last.z - 0.06))))
            path.append(Vector((last.x + 0.03, y, floor)))
            path.append(Vector((last.x + 0.6, y, floor)))
            break
        path.append(Vector((x, y, max(hh + 0.005, path[-1].z - 0.03))))
    return _resample(path, s["rows"], L)


def hang(s, bvh):
    rows, cols = s["rows"], s["cols"]
    me = s["ob"].data
    for j in range(cols):
        y = s["y"] - s["w"] / 2 + s["w"] * j / (cols - 1)
        swing = 0.0
        if bvh and _height(bvh, s["x"] + 0.08, s["y"]) is None:
            for sign in (-1, 1):
                if _height(bvh, s["x"] + 0.08, s["y"] - sign * s["w"]) is not None:
                    swing = sign * 0.12
                    break
        pts = _column(s, y, bvh)
        for r, p in enumerate(pts):
            ripple = 0.0015 * math.sin(r * 0.9 + j * 0.7) + s["twist"] * (j / (cols - 1) - 0.5) * (r / rows)
            me.vertices[r * cols + j].co = (p.x + ripple, p.y + swing * (r / (rows - 1)) ** 1.6, p.z)
    me.update()


def drape_strips(bag_objects):
    """Lay the end-wall strips over whatever bags are pushing through them now."""
    bvh = bag_bvh(bag_objects) if bag_objects else None
    for s in STRIPS:
        hang(s, bvh if s["drape"] else None)


def bag_bvh(objs):
    verts, polys = [], []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        if o.type != "MESH" or o.hide_render:
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = o.matrix_world
        off = len(verts)
        verts += [mw @ v.co for v in me.vertices]
        polys += [[off + i for i in p.vertices] for p in me.polygons]
        ev.to_mesh_clear()
    return BVHTree.FromPolygons(verts, polys) if polys else None


# ---------------------------------------------------------------- the conveyor
def conveyor():
    m = materials()
    L = X1 - X0
    cx = (X0 + X1) / 2
    # the belt: carry side, its rounded nose ends, the return run below
    # in-feed belt from the check-in side, a powered-roller transfer (eight steel rollers), then the hall belt
    ta, tb = TRANSFER
    box("belt_in", (ta - X0, BW, 0.012), ((X0 + ta) / 2, 0, BZ - 0.006), m["belt"], bevel=0.004)
    box("belt", (X1 - tb, BW, 0.012), ((tb + X1) / 2, 0, BZ - 0.006), m["belt"], bevel=0.004)
    for xx in (ta, tb):    # the belts wrap round their end pulleys
        cyl(f"belt_wrap_{xx:.2f}", 0.03, BW, (xx, 0, BZ - 0.03), m["belt"], rot=(math.pi / 2, 0, 0), verts=32)
    rr, nr = 0.027, 8
    x0r, x1r = ta + 0.03 + rr + 0.012, tb - 0.03 - rr - 0.012
    rol, ends = Batch(), Batch()
    for k in range(nr):
        xr = x0r + (x1r - x0r) * k / (nr - 1)
        rol.rod((xr, -BW / 2 + 0.012, BZ - rr), (xr, BW / 2 - 0.012, BZ - rr), rr, 28)
        for s in (-1, 1):   # bearing caps against the side frames, the axle stubs
            ends.rod((xr, s * (BW / 2 - 0.012), BZ - rr), (xr, s * (BW / 2 + 0.03), BZ - rr), 0.012, 12)
    rol.done("transfer_rollers", m["roller"], bevel=0.003)
    ends.done("transfer_axles", m["dark_steel"], bevel=0.002)
    for s in (-1, 1):       # a dark infill strip each side so the gap to the guard does not show the floor
        box(f"transfer_cheek_{s}", (tb - ta + 0.06, 0.07, 0.03), ((ta + tb) / 2, s * (BW / 2 + 0.035), BZ - 0.02),
            m["dark_steel"], bevel=0.003)
    box("transfer_tray", (tb - ta + 0.06, BW + 0.06, 0.006), ((ta + tb) / 2, 0, BZ - 0.075), m["dark_steel"])
    # slider bed under the hall belt and under the in-feed belt (not under the rollers)
    box("slider_bed", (X1 - tb, BW + 0.06, 0.008), ((tb + X1) / 2, 0, BZ - 0.016), m["dark_steel"])
    box("slider_bed_in", (ta - X0, BW + 0.06, 0.008), ((X0 + ta) / 2, 0, BZ - 0.016), m["dark_steel"])
    box("belt_return", (L, BW, 0.01), (cx, 0, BZ - 0.315), m["belt"], bevel=0.003)
    # lacing seams across the belt: a row of dull steel clips (bright steel read as a white dashed line)
    for i, x in enumerate(LACING):
        lace = Batch()
        for k in range(36):
            y = -BW / 2 + 0.03 + k * (BW - 0.06) / 35
            lace.box((0.022, 0.016, 0.003), (0.0, y, BZ + 0.0008))
        ob = lace.done(f"lacing_{i}", m["dark_steel"], bevel=0.0008)
        ob.location.x = x
        LACING_OBS.append(ob)
    # side frames (painted channel) and the galvanised guards with their rolled tops
    for s in (-1, 1):
        box(f"frame_side_{s}", (L, 0.05, 0.22), (cx, s * (GY + 0.03), BZ - 0.13), m["frame"], bevel=0.004)
        box(f"frame_lip_{s}", (L, 0.09, 0.008), (cx, s * (GY + 0.01), BZ - 0.236), m["frame"], bevel=0.002)
        g = box(f"guard_{s}", (L, 0.004, GH + 0.05), (cx, s * (GY + 0.002), BZ + GH / 2 - 0.025), m["guard"])
        del g
        cyl(f"guard_roll_{s}", 0.015, L, (cx, s * (GY + 0.006), BZ + GH), m["galv"], rot=(0, math.pi / 2, 0), verts=16)
    # joints every 3 m: flanges with bolts on the outside of each guard; legs and cross braces under each
    j_flange, j_bolt, legs, plates = Batch(), Batch(), Batch(), Batch()
    xs = [x for x in [1.5 + 3.0 * k for k in range(9)] if x < X1 - 0.3] + [-1.5]
    for x in xs:
        for s in (-1, 1):
            yo = s * (GY + 0.004)
            j_flange.box((0.012, 0.04, GH + 0.05), (x, yo + s * 0.02, BZ + GH / 2 - 0.025))
            for zz in (BZ + 0.03, BZ + 0.13, BZ + 0.23):
                j_bolt.rod((x - 0.01, yo + s * 0.03, zz), (x + 0.01, yo + s * 0.03, zz), 0.0065, 6)
            ly = s * (GY + 0.02)
            legs.box((0.06, 0.06, BZ - 0.24), (x, ly, (BZ - 0.24) / 2))
            plates.box((0.16, 0.16, 0.012), (x, ly, 0.006))
            for dx in (-0.055, 0.055):
                j_bolt.rod((x + dx, ly + 0.055, 0.0), (x + dx, ly + 0.055, 0.03), 0.008, 6)
                j_bolt.rod((x + dx, ly - 0.055, 0.0), (x + dx, ly - 0.055, 0.03), 0.008, 6)
        legs.box((0.04, 2 * GY + 0.04, 0.04), (x, 0, 0.18))          # cross brace low
        legs.box((0.04, 2 * GY + 0.04, 0.05), (x, 0, BZ - 0.26))     # cross member under the frame
    seam, screws = Batch(), Batch()
    for k in range(int((X1 - 0.75) / 1.2) + 1):
        x = 0.75 + 1.2 * k
        for s in (-1, 1):
            if s > 0 and CHUTE[0] - 0.1 < x < CHUTE[1] + 0.1:
                continue
            seam.box((0.003, 0.0016, GH + 0.03), (x, s * (GY - 0.0004), BZ + GH / 2 - 0.012))
            for dx in (-0.022, 0.022):
                for zz in (BZ + 0.055, BZ + 0.14, BZ + 0.225):
                    screws.rod((x + dx, s * (GY + 0.001), zz), (x + dx, s * (GY - 0.0028), zz), 0.006, 10)
    seam.done("guard_seams", m["void"], smooth=False)
    screws.done("guard_screws", m["steel"], bevel=0.0012)
    j_flange.done("guard_flanges", m["galv"], bevel=0.002)
    j_bolt.done("conveyor_bolts", m["steel"], bevel=0.0015)
    legs.done("conveyor_legs", m["leg"], bevel=0.004)
    plates.done("leg_plates", m["leg"], bevel=0.003)
    # return rollers every 1.5 m between the side frames, under the return belt; their bearing housings
    rol, brg = Batch(), Batch()
    for k in range(int((X1 - X0) / 1.5)):
        x = X0 + 0.75 + k * 1.5
        rol.rod((x, -BW / 2 - 0.02, BZ - 0.355), (x, BW / 2 + 0.02, BZ - 0.355), 0.04, 20)
        for s in (-1, 1):
            brg.box((0.07, 0.03, 0.09), (x, s * (BW / 2 + 0.045), BZ - 0.33))
            brg.rod((x, s * (BW / 2 + 0.06), BZ - 0.295), (x, s * (GY + 0.03), BZ - 0.24), 0.008, 6)
    rol.done("return_rollers", m["roller"], bevel=0.004)
    brg.done("roller_brackets", m["frame"], bevel=0.003)
    drive(1.5)    # (at 2.3 its yellow chain guard sat in the corner of the low camera's frame)
    pull_cord()
    sensors()


def drive(x):
    """The drive at the curtain end, hung under the -Y side of the frame: a painted geared motor with cooling fins,
    the gearbox, a yellow chain guard over the drive to the head pulley, a terminal box."""
    m = materials()
    y = -(GY + 0.14)
    z = BZ - 0.42
    cyl("drive_motor", 0.095, 0.34, (x - 0.12, y - 0.02, z), m["motor"], rot=(0, math.pi / 2, 0), verts=32, bevel=0.01)
    fins = Batch()
    for k in range(12):
        a = 2 * math.pi * k / 12
        fins.box((0.26, 0.012, 0.02), (x - 0.13, y - 0.02 + 0.1 * math.cos(a), z + 0.1 * math.sin(a)),
                 Matrix.Rotation(a, 3, "X"))
    fins.done("drive_fins", m["motor"], bevel=0.002)
    cyl("drive_fan_cowl", 0.105, 0.08, (x - 0.33, y - 0.02, z), m["motor"], rot=(0, math.pi / 2, 0), verts=32, bevel=0.01)
    box("drive_gearbox", (0.2, 0.2, 0.22), (x + 0.12, y - 0.01, z + 0.02), m["motor"], bevel=0.015)
    box("drive_terminal", (0.1, 0.1, 0.08), (x - 0.12, y - 0.02, z + 0.12), m["motor"], bevel=0.008)
    box("drive_guard", (0.34, 0.05, 0.34), (x + 0.18, -(GY + 0.075), BZ - 0.2), m["yellow"], bevel=0.01)
    box("drive_bracket", (0.4, 0.1, 0.012), (x, y + 0.04, z + 0.14), m["frame"], bevel=0.003)
    tube("drive_cable", [(x - 0.12, y - 0.02, z + 0.16), (x - 0.3, y - 0.05, z + 0.12), (x - 0.6, y - 0.08, 0.05),
                         (x - 1.4, y - 0.1, 0.03)], 0.011, m["plastic"])
    # an emergency stop on the frame near the curtain
    box("estop_box", (0.11, 0.08, 0.11), (0.95, -(GY + 0.065), BZ + 0.18), m["yellow"], bevel=0.008)
    cyl("estop_button", 0.025, 0.03, (0.95, -(GY + 0.115), BZ + 0.18), m["red"], rot=(math.pi / 2, 0, 0), bevel=0.006)


def pull_cord():
    """The emergency pull-wire along the walkway side: yellow-sheathed cable on eye bolts at every joint, pull
    switches (yellow boxes) at 1 m and every 12 m."""
    m = materials()
    y = -(GY + 0.09)
    z = BZ + GH - 0.04
    xs = [1.5 + 3.0 * k for k in range(9)]
    eyes = Batch()
    pts = []
    for i, x in enumerate(xs):
        eyes.box((0.012, 0.09, 0.012), (x, -(GY + 0.045), z))
        eyes.rod((x - 0.012, y, z), (x + 0.012, y, z), 0.01, 8)
        pts.append((x, y, z))
    eyes.done("pullcord_eyes", m["steel"], bevel=0.002)
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        mid = ((a[0] + b[0]) / 2, y - 0.004, z - 0.03)
        tube(f"pullcord_{i}", [a, mid, b], 0.0042, m["yellow_cable"], res=3)
    for i, x in enumerate((0.45, 13.0, 25.0)):
        box(f"pullswitch_{i}", (0.16, 0.1, 0.15), (x, -(GY + 0.08), z - 0.02), m["yellow"], bevel=0.01)
        cyl(f"pullswitch_cap_{i}", 0.02, 0.02, (x, -(GY + 0.135), z), m["red"], rot=(math.pi / 2, 0, 0), bevel=0.004)


def sensors():
    """Photo-eye pairs clamped on the guards' rolled tops (low: a tall post stood in front of the bags from the
    walkway): just after the curtain and before the diverter. A small black head, a lens, one indicator LED."""
    m = materials()
    for i, x in enumerate(EYES):
        for s in (-1, 1):
            y = s * (GY + 0.012)
            zc = BZ + GH + 0.04
            box(f"eye_clamp_{i}_{s}", (0.05, 0.05, 0.03), (x, y, BZ + GH - 0.002), m["dark_steel"], bevel=0.004)
            box(f"eye_head_{i}_{s}", (0.036, 0.055, 0.05), (x, y, zc), m["plastic"], bevel=0.006)
            cyl(f"eye_lens_{i}_{s}", 0.009, 0.004, (x, y - s * 0.028, zc), m["glass"], rot=(math.pi / 2, 0, 0))
            led = m["led_amber"] if s < 0 else m["led_green"]
            cyl(f"eye_led_{i}_{s}", 0.004, 0.003, (x, y, zc + 0.026), led)
            tube(f"eye_cable_{i}_{s}", [(x + 0.018, y + s * 0.01, zc - 0.01), (x + 0.06, y + s * 0.03, BZ + GH - 0.05),
                                        (x + 0.07, y + s * 0.035, BZ - 0.1)], 0.0035, m["plastic"], res=3)


def chute():
    """The sorter: a yellow diverter paddle parked along the -Y guard (pivot upstream), the +Y guard opened over
    the chute mouth, a stainless gravity chute down at 20 degrees onto a gravity-roller landing with an end stop,
    yellow bollards at its corners."""
    m = materials()
    xa, xb = CHUTE
    w = xb - xa
    cx = (xa + xb) / 2
    # the paddle: a yellow steel blade lying along the -Y guard, a pivot post at its upstream end, the actuator box
    box("diverter_blade", (w + 0.25, 0.03, 0.24), (cx - 0.05, -(GY - 0.02), BZ + 0.15), m["yellow"], bevel=0.008)
    box("diverter_rubber", (w + 0.2, 0.012, 0.2), (cx - 0.05, -(GY - 0.04), BZ + 0.15), m["rubber"], bevel=0.004)
    cyl("diverter_pivot", 0.04, 0.5, (xa - 0.22, -(GY + 0.02), BZ + 0.18), m["dark_steel"], bevel=0.006)
    box("diverter_actuator", (0.7, 0.18, 0.3), (xa + 0.1, -(GY + 0.12), BZ + 0.05), m["enclosure"], bevel=0.012)
    box("diverter_act_guard", (0.72, 0.012, 0.18), (xa + 0.1, -(GY + 0.215), BZ + 0.06), m["hazard_v"], bevel=0.003)
    ax, ay, az = xa + 0.1, -(GY + 0.12), BZ + 0.2
    box("diverter_act_lid", (0.66, 0.15, 0.006), (ax, ay, az + 0.003), m["enclosure"], bevel=0.003)
    box("diverter_act_gasket", (0.672, 0.162, 0.003), (ax, ay, az + 0.0005), m["rubber"])
    sc = Batch()
    for dx in (-0.31, -0.1, 0.1, 0.31):
        for dy in (-0.06, 0.06):
            sc.rod((ax + dx, ay + dy, az + 0.005), (ax + dx, ay + dy, az + 0.0095), 0.006, 10)
    sc.rod((ax + 0.22, ay - 0.02, az + 0.005), (ax + 0.22, ay - 0.02, az + 0.03), 0.014, 12)     # cable gland
    sc.done("diverter_act_screws", m["steel"], bevel=0.0012)
    tube("diverter_act_cable", [(ax + 0.22, ay - 0.02, az + 0.028), (ax + 0.25, ay - 0.05, az + 0.07),
                                (ax + 0.33, ay - 0.1, az + 0.03), (ax + 0.36, ay - 0.105, BZ - 0.2)], 0.008, m["plastic"])
    cyl("diverter_pivot_cap", 0.05, 0.02, (xa - 0.22, -(GY + 0.02), BZ + 0.44), m["yellow"], bevel=0.004)
    # the +Y guard has a gap over the mouth: hide the continuous guard there with the chute's own side walls
    # (the guard is cut by a void-coloured box would look wrong; instead the chute walls rise above the guard)
    slope = math.radians(20)
    y0, y1 = GY - 0.02, 1.45
    run = y1 - y0
    drop = run * math.tan(slope)
    zt0 = BZ - 0.012
    bed_len = run / math.cos(slope)
    bed = box("chute_bed", (w, bed_len, 0.006), (cx, (y0 + y1) / 2, zt0 - drop / 2), m["stainless"], bevel=0.002,
              rot=(-slope, 0, 0))
    del bed
    for s, xx in ((-1, xa), (1, xb)):
        box(f"chute_wall_{s}", (0.006, bed_len + 0.04, 0.42), (xx, (y0 + y1) / 2, zt0 - drop / 2 + 0.2), m["stainless"],
            bevel=0.002, rot=(-slope, 0, 0))
        cyl(f"chute_wall_roll_{s}", 0.012, bed_len + 0.04, (xx, (y0 + y1) / 2, zt0 - drop / 2 + 0.41), m["stainless"],
            rot=(math.pi / 2 - slope, 0, 0), verts=16)
    # landing: gravity rollers between painted side frames at the chute foot, to an end stop
    zl = zt0 - drop - 0.03
    ly0, ly1 = y1, YW1 - 0.45
    rl = Batch()
    n = int((ly1 - ly0) / 0.1)
    for k in range(n):
        yy = ly0 + 0.05 + k * 0.1
        rl.rod((xa + 0.04, yy, zl - 0.03 - 0.004 * k), (xb - 0.04, yy, zl - 0.03 - 0.004 * k), 0.03, 20)
    rl.done("landing_rollers", m["roller"], bevel=0.003)
    for s, xx in ((-1, xa + 0.02), (1, xb - 0.02)):
        box(f"landing_side_{s}", (0.05, ly1 - ly0, 0.18), (xx, (ly0 + ly1) / 2, zl - 0.06 - 0.002 * n), m["frame"], bevel=0.004)
        box(f"landing_lip_{s}", (0.012, ly1 - ly0, 0.12), (xx + s * 0.02, (ly0 + ly1) / 2, zl + 0.08 - 0.002 * n),
            m["galv"], bevel=0.002)
    box("landing_stop", (w, 0.1, 0.3), (cx, ly1 + 0.05, zl + 0.08), m["yellow"], bevel=0.012)
    box("landing_buffer", (w - 0.1, 0.05, 0.18), (cx, ly1 - 0.02, zl + 0.08), m["rubber"], bevel=0.01)
    lg = Batch()
    for xx in (xa + 0.04, xb - 0.04):
        for yy in (ly0 + 0.2, ly1 - 0.15, y0 + run * 0.6):
            zz = zl - 0.15 if yy > y1 else zt0 - (yy - y0) * math.tan(slope) - 0.1
            lg.box((0.05, 0.05, zz), (xx, yy, zz / 2))
    lg.done("chute_legs", m["leg"], bevel=0.003)
    for xx in (xa - 0.25, xb + 0.25):
        cyl(f"bollard_{xx:.1f}", 0.06, 1.0, (xx, ly1 - 0.1, 0.5), m["yellow"], verts=24, bevel=0.01)
        cyl(f"bollard_cap_{xx:.1f}", 0.062, 0.06, (xx, ly1 - 0.1, 0.97), m["plastic"], verts=24, bevel=0.01)
    # the floor under and round the landing hatched (a keep-clear zone)
    box("hatch_chute", (w + 0.8, ly1 - y0 + 0.2, 0.002), (cx, (y0 + ly1) / 2 + 0.1, 0.001), m["hazard_floor"])


def guard_gaps():
    """Cut the continuous +Y guard (and its rolled top) at the chute mouth: rebuild it as two pieces."""
    m = materials()
    xa, xb = CHUTE
    for n in ("guard_1", "guard_roll_1"):
        ob = bpy.data.objects.get(n)
        if ob:
            bpy.data.objects.remove(ob)
    for i, (a, b) in enumerate(((X0, xa), (xb, X1))):
        L, cx = b - a, (a + b) / 2
        box(f"guard_1_{i}", (L, 0.004, GH + 0.05), (cx, GY + 0.002, BZ + GH / 2 - 0.025), m["guard"])
        cyl(f"guard_roll_1_{i}", 0.015, L, (cx, GY + 0.006, BZ + GH), m["galv"], rot=(0, math.pi / 2, 0), verts=16)


# ---------------------------------------------------------------- lights and services
def batten(n, x, y, k, spread=90, watts=230.0):
    """One twin-tube fluorescent batten on drop rods; k = how much of its light is left (0 = dead)."""
    m = materials()
    box(n + "_body", (1.52, 0.11, 0.07), (x, y, BAT_Z + 0.035), m["enclosure"], bevel=0.008)
    mat = m["tube"] if k >= 0.9 else m["tube_mid"] if k >= 0.6 else m["tube_low"] if k > 0 else m["opal_off"]
    box(n + "_diffuser", (1.46, 0.085, 0.03), (x, y, BAT_Z - 0.008), mat, bevel=0.012)
    for e in (-1, 1):
        box(n + f"_cap{e}", (0.02, 0.1, 0.05), (x + e * 0.74, y, BAT_Z + 0.01), m["plastic"], bevel=0.004)
    rods = Batch()
    for e in (-0.55, 0.55):
        rods.rod((x + e, y, BAT_Z + 0.07), (x + e, y, H), 0.005, 8)
        rods.box((0.06, 0.06, 0.01), (x + e, y, H - 0.005))
    rods.done(n + "_rods", m["galv"], bevel=0.001)
    if k > 0:
        li = light(n + "_light", (x, y, BAT_Z - 0.03), (1.4, 0.08), watts * k, COOL, spread=spread)
        li.visible_volume_scatter = True
        # the tubes' spill upward: the soffit and the beams over each fitting read, a rhythm down the tunnel
        up = light(n + "_up", (x, y, BAT_Z + 0.08), (1.4, 0.08), 34.0 * k, COOL, spread=160, rot=(math.pi, 0, 0))
        up.visible_glossy = False


def battens():
    """Twin-tube fluorescent battens over the walkway edge, the last ones dimmer, the last one dead; and the
    sparse service row over the far side (wider throw, weaker)."""
    for i, (x, k) in enumerate(BATTENS):
        batten(f"batten{i}", x, BAT_Y, k)
    for i, (x, k) in enumerate(SERVICE):
        batten(f"sbatten{i}", x, SERVICE_Y, k, spread=150)


def wall_lamps():
    """Caged bulkheads on the +Y wall pilasters (between them), a sodium flood further down the hall."""
    for i, x in enumerate((3.6, 10.8, 18.0, 25.2)):
        li = bulkhead(f"bulk_n{i}", (x, YW1, 2.25), "-y", lit=i < 3, energy=(12.0, 25.0, 6.0, 0)[i])
        del li
    m = materials()
    x, z = 15.3, 2.75
    box("sodium_housing", (0.36, 0.22, 0.3), (x, YW1 - 0.2, z), m["enclosure"], bevel=0.02,
        rot=(math.radians(-25), 0, 0))
    box("sodium_glass", (0.3, 0.012, 0.24), (x, YW1 - 0.32, z - 0.05), m["sodium"], bevel=0.004,
        rot=(math.radians(-25), 0, 0))
    box("sodium_bracket", (0.08, 0.2, 0.05), (x, YW1 - 0.1, z + 0.17), m["dark_steel"], bevel=0.004)
    spot("sodium_flood", (x, YW1 - 0.36, z - 0.08), 520.0, SODIUM, 95, 0.6,
         (math.radians(62), 0, math.radians(180)), radius=0.12)


def services():
    """A ladder cable tray along the +Y wall, two pipes along the -Y wall, all on brackets; a fire extinguisher at a
    pilaster on the walkway side; a lost bag tag on the floor."""
    m = materials()
    L = HX1 - HX0
    cx = (HX0 + HX1) / 2
    ty, tz = YW1 - 0.25, 2.72
    tr = Batch()
    for s in (-1, 1):
        tr.box((L, 0.012, 0.08), (cx, ty + s * 0.16, tz))
    for k in range(int(L / 0.3)):
        tr.box((0.025, 0.32, 0.012), (HX0 + 0.15 + k * 0.3, ty, tz - 0.035))
    for k in range(int(L / 1.8)):
        x = HX0 + 0.9 + k * 1.8
        tr.box((0.04, 0.42, 0.04), (x, ty + 0.03, tz - 0.06))
    tr.done("cable_tray", m["galv"], bevel=0.002)
    rnd = random.Random(11)
    for i in range(6):
        yy = ty - 0.12 + i * 0.045
        r = rnd.uniform(0.011, 0.02)
        pts = [(HX0, yy, tz - 0.03 + r), (cx, yy + rnd.uniform(-0.01, 0.01), tz - 0.03 + r), (HX1, yy, tz - 0.03 + r)]
        tube(f"tray_cable{i}", pts, r, m["plastic"], res=3)
    py = YW0 + 0.22
    pp = Batch()
    pp.rod((HX0, py, 2.95), (HX1, py, 2.95), 0.055, 24)
    pp.rod((HX0, py + 0.2, 3.05), (HX1, py + 0.2, 3.05), 0.04, 24)
    pp.done("pipes", m["enclosure"], bevel=0.0)
    cl = Batch()
    for k in range(int(L / 2.4)):
        x = HX0 + 1.0 + k * 2.4
        cl.box((0.03, 0.4, 0.02), (x, py + 0.08, H - 0.01))
        cl.rod((x, py, 3.01), (x, py, H), 0.006, 6)
        cl.rod((x, py + 0.2, 3.1), (x, py + 0.2, H), 0.006, 6)
        cl.box((0.04, 0.13, 0.13), (x, py, 2.95))
    cl.done("pipe_clamps", m["galv"], bevel=0.002)
    # extinguisher at the pilaster at x = 5.4 on the walkway side
    x = BEAMS[1] + 0.32
    ex = cyl("extinguisher", 0.085, 0.5, (x, YW0 + 0.12, 0.55), m["red"], verts=32, bevel=0.03)
    del ex
    cyl("extinguisher_neck", 0.03, 0.06, (x, YW0 + 0.12, 0.83), m["plastic"], bevel=0.005)
    box("extinguisher_head", (0.05, 0.05, 0.06), (x, YW0 + 0.12, 0.88), m["dark_steel"], bevel=0.006)
    box("extinguisher_bracket", (0.06, 0.05, 0.25), (x, YW0 + 0.03, 0.6), m["dark_steel"], bevel=0.004)
    box("extinguisher_sign", (0.2, 0.008, 0.2), (x, YW0 + 0.005, 1.45), m["red"], bevel=0.003)


def floor_marks():
    """Yellow floor lines: the walkway edge along the conveyor and along the wall, the hatched zone under the
    curtain end; no text."""
    m = materials()
    L = HX1 - HX0 - 0.6
    cx = (HX0 + HX1) / 2
    box("line_conveyor", (L, 0.08, 0.002), (cx, -(GY + 0.42), 0.001), m["line"])
    box("line_wall", (L, 0.08, 0.002), (cx, YW0 + 0.55, 0.001), m["line"])
    box("line_north", (CHUTE[0] - 0.7, 0.08, 0.002), ((0.3 + CHUTE[0] - 0.4) / 2, GY + 0.45, 0.001), m["line"])
    box("line_north2", (HX1 - CHUTE[1] - 1.1, 0.08, 0.002), ((CHUTE[1] + 0.4 + HX1 - 0.3) / 2, GY + 0.45, 0.001), m["line"])
    box("hatch_curtain", (0.9, 2 * GY + 0.6, 0.002), (0.45, 0, 0.0012), m["hazard_floor"])
    box("hatch_far", (0.9, 2 * GY + 0.6, 0.002), (HX1 - 0.45, 0, 0.0012), m["hazard_floor"])


def haze(density=0.0032):
    m = bpy.data.materials.new("hall haze")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    pv = nt.nodes.new("ShaderNodeVolumePrincipled")
    pv.inputs["Color"].default_value = (0.8, 0.86, 0.92, 1)
    pv.inputs["Density"].default_value = density
    nt.links.new(pv.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    ob = box("haze", (HX1 - X0 + 0.4, YW1 - YW0 - 0.04, H - 0.04), ((HX1 + X0 - 0.2) / 2, (YW0 + YW1) / 2, H / 2), m)
    ob.visible_shadow = False
    return ob


def build():
    M.clear()
    STRIPS.clear()
    LACING_OBS.clear()
    FOCUS.clear()
    materials()
    hall()
    curtain_wall()
    far_wall()
    conveyor()
    guard_gaps()
    chute()
    battens()
    wall_lamps()
    services()
    floor_marks()
    haze()
