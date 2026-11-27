"""Materials for the family home (Cycles, Principled BSDF). Patterns work in object space, in metres (or world space
where a part is a generated prop), so nothing reads as one flat value: tone and roughness always vary a little.

Walls in matt latex over plaster, trim in satin enamel, oak strip flooring, sheet linoleum, laminate counter, glazed
subway tile, ceramic, anodised aluminium, chrome, cast iron, paper, linen, slat vinyl that lets a little light
through, window glass, the night outside and blank screens. Node helpers are copied from the departure gate's
materials (departure_gate_mats.py) so this stage owns its own copy.
"""
import bpy  # noqa: F401  (first: bmesh and mathutils only exist once bpy is loaded)

M = {}


# ---------------------------------------------------------------- node helpers
def _new(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    return m, nt, nt.nodes["Principled BSDF"]


def _n(nt, kind, **kw):
    n = nt.nodes.new(kind)
    for k, v in kw.items():
        if k in n.inputs:
            n.inputs[k].default_value = v
        else:
            setattr(n, k, v)
    return n


def _out(n, name=None):
    alias = {"Fac": "Factor", "Factor": "Fac"}
    outs = [o for o in n.outputs if o.enabled and (name is None or name in (o.name, o.identifier)
                                                   or alias.get(name) in (o.name, o.identifier))]
    return outs[0]


def _link(nt, a, b):
    nt.links.new(a, b)


def _maprange(nt, src, a, b, c, d):
    n = _n(nt, "ShaderNodeMapRange")
    n.inputs["From Min"].default_value, n.inputs["From Max"].default_value = a, b
    n.inputs["To Min"].default_value, n.inputs["To Max"].default_value = c, d
    _link(nt, src, n.inputs["Value"])
    return _out(n, "Result")


def _math(nt, op, a, b=0.0, clamp=False):
    n = _n(nt, "ShaderNodeMath", operation=op)
    n.use_clamp = clamp
    for i, v in enumerate((a, b)):
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            _link(nt, v, n.inputs[i])
    return n.outputs[0]


def _mix(nt, fac, a, b, blend="MIX"):
    n = _n(nt, "ShaderNodeMix", data_type="RGBA", blend_type=blend)
    fs = [i for i in n.inputs if i.name == "Factor" and i.type == "VALUE"][0]
    sa = [i for i in n.inputs if i.name == "A" and i.type == "RGBA"][0]
    sb = [i for i in n.inputs if i.name == "B" and i.type == "RGBA"][0]
    for s, v in ((fs, fac), (sa, a), (sb, b)):
        if isinstance(v, (int, float)):
            s.default_value = v
        elif isinstance(v, tuple):
            s.default_value = (*v[:3], 1.0)
        else:
            _link(nt, v, s)
    return [o for o in n.outputs if o.type == "RGBA"][0]


def _noise(nt, vec, scale, detail=2.0, rough=0.5, mapping=None, offset=None):
    n = _n(nt, "ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    if mapping or offset:
        mp = _n(nt, "ShaderNodeMapping")
        if mapping:
            mp.inputs["Scale"].default_value = mapping
        if offset:
            mp.inputs["Location"].default_value = offset
        _link(nt, vec, mp.inputs["Vector"])
        vec = mp.outputs["Vector"]
    _link(nt, vec, n.inputs["Vector"])
    return n.outputs["Fac"]


def _bump(nt, b, height, strength, distance, extra=None):
    n = _n(nt, "ShaderNodeBump")
    n.inputs["Strength"].default_value = strength
    n.inputs["Distance"].default_value = distance
    _link(nt, height, n.inputs["Height"])
    if extra is not None:
        _link(nt, extra, n.inputs["Normal"])
    _link(nt, n.outputs["Normal"], b.inputs["Normal"])
    return n


def _obj(nt):
    return _n(nt, "ShaderNodeTexCoord").outputs["Object"]


def _pos(nt):
    return _n(nt, "ShaderNodeNewGeometry").outputs["Position"]


def _xyz(nt, vec):
    s = _n(nt, "ShaderNodeSeparateXYZ")
    _link(nt, vec, s.inputs["Vector"])
    return s.outputs["X"], s.outputs["Y"], s.outputs["Z"]


def _combine(nt, v):
    c = _n(nt, "ShaderNodeCombineXYZ")
    for k in "XYZ":
        _link(nt, v, c.inputs[k])
    return c.outputs[0]


def _ao(nt, distance=0.35, inside=False):
    n = _n(nt, "ShaderNodeAmbientOcclusion", samples=4)
    n.inside = inside
    n.inputs["Distance"].default_value = distance
    return n.outputs["AO"]


def _brick(nt, vec, w, h, mortar, c1, c2, cm, offset=0.5, smooth=0.2):
    br = _n(nt, "ShaderNodeTexBrick", offset=offset, squash=1.0)
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = mortar
    br.inputs["Mortar Smooth"].default_value = smooth
    br.inputs["Brick Width"].default_value = w
    br.inputs["Row Height"].default_value = h
    br.inputs["Bias"].default_value = 0.0
    br.inputs["Color1"].default_value = (*c1, 1)
    br.inputs["Color2"].default_value = (*c2, 1)
    br.inputs["Mortar"].default_value = (*cm, 1)
    _link(nt, vec, br.inputs["Vector"])
    return _out(br, "Color"), _out(br, "Fac")


def _remember(name, m):
    m.use_fake_user = True      # MPFB purges orphan data while it builds a person: keep the cached materials alive
    M[name] = m
    return m


# ---------------------------------------------------------------- general surfaces
def pbr(name, rgb, rough=(0.4, 0.55), metal=0.0, nscale=4.0, stretch=(1, 1, 1), cvar=0.1, bump=0.0, bscale=90.0,
        coat=0.0, sheen=0.0, grime=0.0, spec=0.5):
    """A principled surface with tone and roughness variation; `grime` darkens it into contact corners (AO)."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = 0.12
    b.inputs["Specular IOR Level"].default_value = spec
    if sheen:
        b.inputs["Sheen Weight"].default_value = sheen
        b.inputs["Sheen Roughness"].default_value = 0.6
    o = _obj(nt)
    mp = _n(nt, "ShaderNodeMapping")
    mp.inputs["Scale"].default_value = stretch
    _link(nt, o, mp.inputs["Vector"])
    v = mp.outputs["Vector"]
    _link(nt, _maprange(nt, _noise(nt, v, nscale, 4.0, 0.6), 0.32, 0.68, rough[0], rough[1]), b.inputs["Roughness"])
    dark = tuple(c * (1 - cvar) for c in rgb)
    lite = tuple(min(1.0, c * (1 + cvar)) for c in rgb)
    col = _mix(nt, _maprange(nt, _noise(nt, v, nscale * 0.37, 4.0, 0.6), 0.3, 0.7, 0.0, 1.0), dark, lite)
    if grime:
        col = _mix(nt, _maprange(nt, _ao(nt, 0.3), 0.3, 1.0, grime, 0.0), col, (0.0, 0.0, 0.0))
    _link(nt, col, b.inputs["Base Color"])
    if bump:
        _bump(nt, b, _noise(nt, v, bscale, 3.0, 0.6), bump, 0.0008)
    return _remember(name, m)


def wall_paint(name, rgb, rough=0.82, grime=0.3):
    """Matt latex on old plaster: a broad trowelled waviness (bump), roller stipple, faint patching in a touch
    different white, and grime into the corners."""
    m, nt, b = _new(name)
    o = _obj(nt)
    broad = _noise(nt, o, 1.6, 3.0, 0.55)
    patch = _maprange(nt, _noise(nt, o, 0.9, 3.0, 0.6, offset=(3.0, 1.0, 0.0)), 0.55, 0.66, 0.0, 1.0)
    col = _mix(nt, _maprange(nt, broad, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.94 for c in rgb), tuple(min(1, c * 1.04) for c in rgb))
    col = _mix(nt, _math(nt, "MULTIPLY", patch, 0.5), col, tuple(c * 1.03 for c in rgb[:2]) + (rgb[2] * 0.98,))
    if grime:
        col = _mix(nt, _maprange(nt, _ao(nt, 0.25), 0.35, 1.0, grime, 0.0), col, tuple(c * 0.4 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, broad, 0.3, 0.7, rough - 0.05, rough + 0.05), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.35
    stip = _noise(nt, o, 260.0, 3.0, 0.65)
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", broad, 0.6), _math(nt, "MULTIPLY", stip, 0.25))
    _bump(nt, b, h, 0.06, 0.002)
    return _remember(name, m)


def enamel(name, rgb, rough=0.32, grime=0.35):
    """Satin enamel on wood trim and cabinet doors: brush marks along the part's long axis are too fine to see; what
    shows is a gentle orange peel, sheen that varies, and grey in the routed corners and where hands touch."""
    m, nt, b = _new(name)
    o = _obj(nt)
    var = _noise(nt, o, 7.0, 3.0, 0.6)
    col = _mix(nt, _maprange(nt, var, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.95 for c in rgb), rgb)
    col = _mix(nt, _maprange(nt, _ao(nt, 0.03), 0.4, 1.0, grime, 0.0), col, tuple(c * 0.45 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, var, 0.3, 0.7, rough - 0.06, rough + 0.08), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.45
    _bump(nt, b, _noise(nt, o, 140.0, 2.0, 0.5), 0.05, 0.0006)
    return _remember(name, m)


def oak_floor(name, strip=0.0825, light=(0.13, 0.075, 0.042), dark=(0.055, 0.03, 0.017), rough=0.42):
    """Strip oak flooring along local X: 3 1/4 in strips, random butt joints, each strip its own tone and figure,
    open-grain pores, a satin finish worn duller in traffic lanes, dark seams between strips."""
    m, nt, b = _new(name)
    o = _obj(nt)
    x, y, z = _xyz(nt, o)
    row = _math(nt, "FLOOR", _math(nt, "DIVIDE", y, strip))
    wn = _n(nt, "ShaderNodeTexWhiteNoise", noise_dimensions="1D")
    _link(nt, _math(nt, "MULTIPLY", row, 3.17), wn.inputs["W"])
    rnd = _out(wn, "Value")
    # board index along the row: lengths 0.6..1.8 m, staggered per row
    xs = _math(nt, "ADD", x, _math(nt, "MULTIPLY", rnd, 7.3))
    blen = _math(nt, "ADD", 0.7, _math(nt, "MULTIPLY", rnd, 1.1))
    bi = _math(nt, "FLOOR", _math(nt, "DIVIDE", xs, blen))
    wn2 = _n(nt, "ShaderNodeTexWhiteNoise", noise_dimensions="2D")
    cv = _n(nt, "ShaderNodeCombineXYZ")
    _link(nt, row, cv.inputs["X"])
    _link(nt, bi, cv.inputs["Y"])
    _link(nt, cv.outputs[0], wn2.inputs["Vector"])
    brnd = _out(wn2, "Value")
    # grain: stretched noise warped per board
    gv = _n(nt, "ShaderNodeCombineXYZ")
    _link(nt, _math(nt, "ADD", x, _math(nt, "MULTIPLY", brnd, 31.0)), gv.inputs["X"])
    _link(nt, _math(nt, "ADD", y, _math(nt, "MULTIPLY", brnd, 5.0)), gv.inputs["Y"])
    _link(nt, z, gv.inputs["Z"])
    grain = _noise(nt, gv.outputs[0], 1.0, 6.0, 0.62, mapping=(2.2, 70.0, 70.0))
    fleck = _noise(nt, gv.outputs[0], 1.0, 2.0, 0.6, mapping=(14.0, 600.0, 600.0))
    col = _mix(nt, _maprange(nt, grain, 0.3, 0.7, 0.0, 1.0), light, dark)
    col = _mix(nt, _maprange(nt, fleck, 0.6, 0.72, 0.0, 0.5), col, tuple(c * 0.6 for c in dark))
    tone = _maprange(nt, brnd, 0.0, 1.0, 0.72, 1.2)
    col = _mix(nt, 1.0, col, _combine(nt, tone), "MULTIPLY")
    # seams: dark lines between strips (y) and at butt joints (x)
    fy = _math(nt, "FRACT", _math(nt, "DIVIDE", y, strip))
    seam_y = _math(nt, "MAXIMUM", _maprange(nt, fy, 0.0, 0.012, 1.0, 0.0), _maprange(nt, fy, 0.988, 1.0, 0.0, 1.0))
    fx = _math(nt, "FRACT", _math(nt, "DIVIDE", xs, blen))
    seam_x = _math(nt, "MAXIMUM", _maprange(nt, fx, 0.0, 0.002, 1.0, 0.0), _maprange(nt, fx, 0.998, 1.0, 0.0, 1.0))
    seam = _math(nt, "MAXIMUM", seam_y, seam_x)
    col = _mix(nt, _math(nt, "MULTIPLY", seam, 0.85), col, (0.008, 0.005, 0.003))
    wear = _maprange(nt, _noise(nt, o, 0.8, 3.0, 0.6), 0.45, 0.7, 0.0, 1.0)
    _link(nt, col, b.inputs["Base Color"])
    r = _math(nt, "ADD", rough, _math(nt, "MULTIPLY", wear, 0.18))
    r = _math(nt, "ADD", r, _maprange(nt, _noise(nt, o, 20.0, 3.0, 0.6), 0.3, 0.7, -0.05, 0.05))
    _link(nt, _math(nt, "ADD", r, _math(nt, "MULTIPLY", seam, 0.3), clamp=True), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.45
    h = _math(nt, "SUBTRACT", _math(nt, "MULTIPLY", grain, 0.3), _math(nt, "MULTIPLY", seam, 1.0))
    _bump(nt, b, h, 0.25, 0.0008)
    return _remember(name, m)


def linoleum(name, tile=0.305, c1=(0.17, 0.165, 0.155), c2=(0.075, 0.075, 0.072)):
    """Sheet linoleum laid as a two-tone tile pattern: marbled chips, a waxed sheen dulled by traffic, dirty seams."""
    m, nt, b = _new(name)
    o = _obj(nt)
    col, fac = _brick(nt, o, tile, tile, 0.0015, c1, c2, (0.03, 0.03, 0.028), offset=0.0)
    chk = _n(nt, "ShaderNodeTexChecker")
    chk.inputs["Scale"].default_value = 1.0 / tile
    chk.inputs["Color1"].default_value = (*c1, 1)
    chk.inputs["Color2"].default_value = (*c2, 1)
    mp = _n(nt, "ShaderNodeMapping")
    mp.inputs["Location"].default_value = (0.001, 0.001, 0.0)
    _link(nt, o, mp.inputs["Vector"])
    _link(nt, mp.outputs["Vector"], chk.inputs["Vector"])
    base = _out(chk, "Color")
    marb = _noise(nt, o, 9.0, 6.0, 0.7, mapping=(1.0, 2.5, 1.0))
    base = _mix(nt, _maprange(nt, marb, 0.35, 0.7, 0.0, 0.25), base, (0.1, 0.1, 0.095))
    base = _mix(nt, _math(nt, "SUBTRACT", 1.0, fac), base, (0.02, 0.02, 0.018))
    _link(nt, base, b.inputs["Base Color"])
    wear = _noise(nt, o, 1.2, 3.0, 0.6)
    _link(nt, _maprange(nt, wear, 0.3, 0.7, 0.22, 0.5), b.inputs["Roughness"])
    _bump(nt, b, fac, 0.2, 0.0005)
    return _remember(name, m)


def laminate_counter(name, rgb=(0.2, 0.195, 0.185)):
    """A speckled laminate countertop: fine chips, satin, a few glossy wipe arcs and dull patches."""
    m, nt, b = _new(name)
    o = _obj(nt)
    chips = _noise(nt, o, 380.0, 2.0, 0.5)
    col = _mix(nt, _maprange(nt, chips, 0.55, 0.62, 0.0, 1.0), rgb, tuple(c * 0.55 for c in rgb))
    col = _mix(nt, _maprange(nt, chips, 0.38, 0.32, 0.0, 0.6), col, tuple(min(1, c * 1.6) for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, _noise(nt, o, 2.0, 4.0, 0.6), 0.3, 0.7, 0.3, 0.52), b.inputs["Roughness"])
    return _remember(name, m)


def subway_tile(name, rgb=(0.46, 0.46, 0.44), grout=(0.16, 0.155, 0.15)):
    """Glazed 3 x 6 in subway tile in running bond (object X along, Z up): each tile its own wave in the glaze."""
    m, nt, b = _new(name)
    o = _obj(nt)
    x, y, z = _xyz(nt, o)
    v = _n(nt, "ShaderNodeCombineXYZ")
    _link(nt, x, v.inputs["X"])
    _link(nt, z, v.inputs["Y"])
    col, fac = _brick(nt, v.outputs[0], 0.152, 0.076, 0.003, rgb, tuple(c * 0.94 for c in rgb), grout)
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, fac, 0.0, 1.0, 0.6, 0.12), b.inputs["Roughness"])
    wav = _noise(nt, o, 30.0, 2.0, 0.5)
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", fac, 1.0), _math(nt, "MULTIPLY", wav, 0.08))
    _bump(nt, b, h, 0.35, 0.002)
    b.inputs["Coat Weight"].default_value = 0.3
    b.inputs["Coat Roughness"].default_value = 0.08
    return _remember(name, m)


def ceramic(name, rgb, rough=0.18, speck=0.0):
    """Glazed stoneware: a glossy glaze with a slight wave, thicker (darker) where it pools; optional iron specks."""
    m, nt, b = _new(name)
    o = _obj(nt)
    wav = _noise(nt, o, 40.0, 3.0, 0.6)
    col = _mix(nt, _maprange(nt, wav, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.9 for c in rgb), rgb)
    if speck:
        sp = _noise(nt, o, 900.0, 1.0, 0.5)
        col = _mix(nt, _maprange(nt, sp, 0.66, 0.7, 0.0, speck), col, (0.03, 0.025, 0.02))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, wav, 0.3, 0.7, rough - 0.04, rough + 0.06), b.inputs["Roughness"])
    b.inputs["Coat Weight"].default_value = 0.25
    b.inputs["Coat Roughness"].default_value = 0.06
    _bump(nt, b, wav, 0.04, 0.001)
    return _remember(name, m)


def aluminium(name, rgb=(0.28, 0.285, 0.3), rough=0.36):
    """Bead-blasted anodised aluminium: metallic, evenly frosted, faint handling smudges."""
    m, nt, b = _new(name)
    o = _obj(nt)
    b.inputs["Metallic"].default_value = 1.0
    fine = _noise(nt, o, 900.0, 2.0, 0.5)
    smear = _maprange(nt, _noise(nt, o, 18.0, 4.0, 0.6), 0.5, 0.75, 0.0, 1.0)
    _link(nt, _math(nt, "ADD", _math(nt, "SUBTRACT", rough, _math(nt, "MULTIPLY", smear, 0.1)),
                    _maprange(nt, fine, 0.3, 0.7, -0.02, 0.02)), b.inputs["Roughness"])
    _link(nt, _mix(nt, smear, rgb, tuple(c * 0.92 for c in rgb)), b.inputs["Base Color"])
    _bump(nt, b, fine, 0.03, 0.0002)
    return _remember(name, m)


def chrome(name, rgb=(0.62, 0.63, 0.64), rough=0.12):
    m, nt, b = _new(name)
    o = _obj(nt)
    b.inputs["Metallic"].default_value = 1.0
    sp = _maprange(nt, _noise(nt, o, 25.0, 4.0, 0.6), 0.55, 0.75, 0.0, 1.0)
    _link(nt, _math(nt, "ADD", rough, _math(nt, "MULTIPLY", sp, 0.2)), b.inputs["Roughness"])
    _link(nt, _mix(nt, sp, rgb, tuple(c * 0.8 for c in rgb)), b.inputs["Base Color"])
    return _remember(name, m)


def plastic(name, rgb, rough=0.5, spec=0.45):
    m, nt, b = _new(name)
    o = _obj(nt)
    _link(nt, _maprange(nt, _noise(nt, o, 60.0, 3.0, 0.6), 0.3, 0.7, rough - 0.06, rough + 0.06), b.inputs["Roughness"])
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Specular IOR Level"].default_value = spec
    return _remember(name, m)


def cast_iron(name, rgb=(0.26, 0.255, 0.24)):
    """A cast-iron radiator in many coats of enamel: a pitted casting texture showing through, dust in the
    recesses, satin on the high spots."""
    m, nt, b = _new(name)
    o = _obj(nt)
    pit = _noise(nt, o, 160.0, 3.0, 0.7)
    col = _mix(nt, _maprange(nt, _ao(nt, 0.03), 0.3, 1.0, 0.75, 0.0), rgb, tuple(c * 0.35 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, pit, 0.3, 0.7, 0.32, 0.55), b.inputs["Roughness"])
    _bump(nt, b, pit, 0.25, 0.0012)
    return _remember(name, m)


def paper(name, rgb=(0.62, 0.6, 0.55), rough=0.88):
    """Matt envelope paper, slightly warm: felted tooth, faint mottling, a little translucency."""
    m, nt, b = _new(name)
    o = _obj(nt)
    mott = _noise(nt, o, 30.0, 4.0, 0.6)
    col = _mix(nt, _maprange(nt, mott, 0.3, 0.7, 0.0, 0.08), rgb, tuple(c * 0.86 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = 0.3
    b.inputs["Subsurface Weight"].default_value = 0.05
    b.inputs["Subsurface Radius"].default_value = (0.0015, 0.0012, 0.0009)
    b.inputs["Subsurface Scale"].default_value = 1.0
    _bump(nt, b, _noise(nt, o, 1400.0, 3.0, 0.65), 0.05, 0.00015)
    return _remember(name, m)


def linen(name, rgb=(0.36, 0.35, 0.32), rough=0.85):
    """Woven linen: a fine warp-and-weft bump, slubs, sheen."""
    m, nt, b = _new(name)
    o = _obj(nt)
    x, y, z = _xyz(nt, o)
    wa = _math(nt, "SINE", _math(nt, "MULTIPLY", x, 2200.0))
    we = _math(nt, "SINE", _math(nt, "MULTIPLY", y, 2000.0))
    weave = _math(nt, "MULTIPLY", wa, we)
    slub = _noise(nt, o, 1.0, 2.0, 0.5, mapping=(4.0, 160.0, 4.0))
    col = _mix(nt, _maprange(nt, slub, 0.35, 0.7, 0.0, 0.3), rgb, tuple(c * 0.82 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Sheen Weight"].default_value = 0.35
    b.inputs["Sheen Roughness"].default_value = 0.5
    _bump(nt, b, _math(nt, "ADD", weave, _math(nt, "MULTIPLY", slub, 0.6)), 0.12, 0.0004)
    return _remember(name, m)


def rug(name, field=(0.085, 0.072, 0.064), tones=((0.048, 0.042, 0.042), (0.12, 0.1, 0.082)), size=(2.4, 1.7),
        band=(0.035, 0.115)):
    """A low-pile wool rug, matt (no specular): a plain warm-grey field with a slow mottle, a woven two-tone border
    band `band` (from, to) metres in from the edge (an 8 cm band of small alternating blocks, as a flat-weave border
    reads), a thin dark outer binding, a dense pile (fine bump at ~1 mm) and fibre sheen."""
    m, nt, b = _new(name)
    o = _obj(nt)
    x, y, _ = _xyz(nt, o)
    ex = _math(nt, "SUBTRACT", size[0] / 2, _math(nt, "ABSOLUTE", x))
    ey = _math(nt, "SUBTRACT", size[1] / 2, _math(nt, "ABSOLUTE", y))
    e = _math(nt, "MINIMUM", ex, ey)
    b0, b1 = band
    inband = _math(nt, "MULTIPLY", _maprange(nt, e, b1, b1 - 0.003, 0.0, 1.0), _maprange(nt, e, b0, b0 + 0.003, 0.0, 1.0))
    binding = _maprange(nt, e, 0.012, 0.009, 0.0, 1.0)
    # the woven pattern: 2.2 cm blocks alternating along the band, two rows across it
    along = _math(nt, "ADD", x, y)
    blk = _math(nt, "FRACT", _math(nt, "DIVIDE", along, 0.044))
    row = _math(nt, "FRACT", _math(nt, "DIVIDE", _math(nt, "SUBTRACT", e, b0), (b1 - b0)))
    chk = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", _math(nt, "GREATER_THAN", blk, 0.5), _math(nt, "GREATER_THAN", row, 0.5)))
    weave = _mix(nt, chk, tones[0], tones[1])
    pile = _noise(nt, o, 900.0, 2.0, 0.6)
    mott = _noise(nt, o, 2.5, 4.0, 0.6)
    col = _mix(nt, _maprange(nt, mott, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.86 for c in field), tuple(c * 1.1 for c in field))
    col = _mix(nt, inband, col, weave)
    col = _mix(nt, binding, col, (0.03, 0.028, 0.03))
    col = _mix(nt, _maprange(nt, pile, 0.3, 0.7, 0.0, 0.35), col, tuple(c * 1.3 for c in field))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.92
    b.inputs["Sheen Weight"].default_value = 0.45
    b.inputs["Sheen Roughness"].default_value = 0.5
    b.inputs["Specular IOR Level"].default_value = 0.0
    _bump(nt, b, pile, 0.3, 0.001)
    return _remember(name, m)


def brick(name, rgb=(0.05, 0.047, 0.045), mortar=(0.03, 0.03, 0.029)):
    """Old painted common brick (the neighbour's wall seen across the gangway at night): running bond, each brick
    its own tone under the paint, sunken mortar, worn paint and grime streaks down from the sills."""
    m, nt, b = _new(name)
    o = _pos(nt)            # world space: the wall is built in pieces round a window and the courses must line up
    x, y, z = _xyz(nt, o)
    v = _n(nt, "ShaderNodeCombineXYZ")
    _link(nt, x, v.inputs["X"])
    _link(nt, z, v.inputs["Y"])
    col, fac = _brick(nt, v.outputs[0], 0.215, 0.073, 0.01, rgb, tuple(c * 0.78 for c in rgb), mortar, smooth=0.3)
    streak = _noise(nt, o, 1.0, 4.0, 0.6, mapping=(9.0, 1.0, 0.6))
    col = _mix(nt, _maprange(nt, streak, 0.45, 0.7, 0.0, 0.5), col, tuple(c * 0.55 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, fac, 0.0, 1.0, 0.95, 0.7), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.3
    pit = _noise(nt, o, 120.0, 3.0, 0.65)
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", fac, 1.0), _math(nt, "MULTIPLY", pit, 0.15))
    _bump(nt, b, h, 0.35, 0.006)
    return _remember(name, m)


def satin_wood(holder, centre, facing, rgb=(0.07, 0.035, 0.02), rough=(0.45, 0.55), wear=0.15, seat_z=(0.4, 0.53)):
    """Replace a generated chair's baked texture (blotchy in close-up: a speckled-stone seat, smeared rails) with a
    satin-finished hardwood: grain along the seat's front-to-back axis on up-facing faces and along Z on the legs and
    spindles, low contrast, open pores, a dark grime in the joints, roughness 0.45-0.55, a light bump, and the seat's
    front edge worn lighter (`wear`) where legs rub. `centre` (x, y) and `facing` (unit x, y) place the wear band."""
    cx, cy = centre
    fx, fy = facing
    seen = set()
    for ob in holder.children_recursive:
        if ob.type != "MESH":
            continue
        for slot in ob.material_slots:
            m = slot.material
            if not m or m.name in seen or not m.use_nodes:
                continue
            seen.add(m.name)
            nt = m.node_tree
            b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if b is None:
                continue
            for sock in ("Base Color", "Roughness", "Normal", "Metallic"):
                for ln in list(b.inputs[sock].links):
                    nt.links.remove(ln)
            b.inputs["Metallic"].default_value = 0.0
            b.inputs["Specular IOR Level"].default_value = 0.3
            b.inputs["Coat Weight"].default_value = 0.0
            p = _pos(nt)
            geo = _n(nt, "ShaderNodeNewGeometry")
            _, _, nz = _xyz(nt, geo.outputs["Normal"])
            up = _maprange(nt, _math(nt, "ABSOLUTE", nz), 0.6, 0.8, 0.0, 1.0)
            g_seat = _noise(nt, p, 1.0, 5.0, 0.6, mapping=(2.0, 55.0, 55.0))
            g_leg = _noise(nt, p, 1.0, 5.0, 0.6, mapping=(55.0, 55.0, 2.0))
            grain = _math(nt, "ADD", _math(nt, "MULTIPLY", g_seat, up), _math(nt, "MULTIPLY", g_leg, _math(nt, "SUBTRACT", 1.0, up)))
            pores = _noise(nt, p, 1.0, 2.0, 0.6, mapping=(30.0, 600.0, 600.0))
            dark, lite = tuple(c * 0.78 for c in rgb), tuple(c * 1.14 for c in rgb)
            col = _mix(nt, _maprange(nt, grain, 0.35, 0.65, 0.0, 1.0), lite, dark)
            col = _mix(nt, _maprange(nt, pores, 0.62, 0.72, 0.0, 0.35), col, tuple(c * 0.6 for c in rgb))
            # the worn front edge of the seat: lighter where the legs rub, on the up faces at seat height only
            px, py, pz = _xyz(nt, p)
            s = _math(nt, "ADD", _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", px, cx), fx), _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", py, cy), fy))
            band = _maprange(nt, s, 0.17, 0.27, 0.0, 1.0)
            inz = _math(nt, "MULTIPLY", _maprange(nt, pz, seat_z[0] - 0.01, seat_z[0], 0.0, 1.0), _maprange(nt, pz, seat_z[1], seat_z[1] + 0.01, 1.0, 0.0))
            worn = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", band, inz), up)
            col = _mix(nt, worn, col, tuple(min(1.0, c * (1.0 + wear)) for c in rgb))
            col = _mix(nt, _maprange(nt, _ao(nt, 0.04), 0.35, 1.0, 0.55, 0.0), col, tuple(c * 0.35 for c in rgb))
            _link(nt, col, b.inputs["Base Color"])
            r = _maprange(nt, _noise(nt, p, 14.0, 3.0, 0.6), 0.3, 0.7, rough[0], rough[1])
            _link(nt, _math(nt, "ADD", r, _math(nt, "MULTIPLY", worn, 0.08)), b.inputs["Roughness"])
            _bump(nt, b, _math(nt, "ADD", grain, _math(nt, "MULTIPLY", pores, 0.4)), 0.1, 0.0005)
    return holder


def contact(name, radius, alpha=0.25, rgb=(0.004, 0.003, 0.003)):
    """A soft contact-shadow decal: a dark disc whose opacity falls off from `alpha` at its centre to nothing at its
    rim (on a plane object in metres)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    o = _obj(nt)
    x, y, _ = _xyz(nt, o)
    r = _math(nt, "SQRT", _math(nt, "ADD", _math(nt, "MULTIPLY", x, x), _math(nt, "MULTIPLY", y, y)))
    t = _maprange(nt, r, 0.0, radius, 1.0, 0.0)
    a = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", t, t), alpha)
    df = _n(nt, "ShaderNodeBsdfDiffuse")
    df.inputs["Color"].default_value = (*rgb, 1)
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    mx = _n(nt, "ShaderNodeMixShader")
    _link(nt, a, mx.inputs[0])
    _link(nt, tr.outputs[0], mx.inputs[1])
    _link(nt, df.outputs[0], mx.inputs[2])
    _link(nt, mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return _remember(name, m)


def slat(name, rgb=(0.6, 0.59, 0.55), trans=0.12):
    """Vinyl venetian blind slats: satin off-white, very slightly translucent (they glow when the street light is
    behind them), with dust along the top."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    o = _obj(nt)
    var = _noise(nt, o, 12.0, 3.0, 0.6)
    _link(nt, _mix(nt, _maprange(nt, var, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.93 for c in rgb), rgb), b.inputs["Base Color"])
    _link(nt, _maprange(nt, var, 0.3, 0.7, 0.38, 0.5), b.inputs["Roughness"])
    tl = _n(nt, "ShaderNodeBsdfTranslucent")
    tl.inputs["Color"].default_value = (rgb[0] * 0.9, rgb[1] * 0.9, rgb[2] * 0.85, 1)
    mx = _n(nt, "ShaderNodeMixShader")
    mx.inputs[0].default_value = trans
    out = nt.nodes["Material Output"]
    _link(nt, b.outputs[0], mx.inputs[1])
    _link(nt, tl.outputs[0], mx.inputs[2])
    _link(nt, mx.outputs[0], out.inputs["Surface"])
    return _remember(name, m)


def glass(name, tint=(0.88, 0.9, 0.92), refl=0.05):
    """Old window glass: transparent, reflecting the room by Fresnel, a faint film of grime."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = (*tint, 1)
    gl = _n(nt, "ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.02
    lw = _n(nt, "ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.1
    smudge = _maprange(nt, _noise(nt, _obj(nt), 3.0, 5.0, 0.6), 0.4, 0.75, 0.0, 0.03)
    fac = _math(nt, "ADD", _math(nt, "ADD", _math(nt, "MULTIPLY", _out(lw, "Fresnel"), 0.85), refl), smudge, clamp=True)
    mx = _n(nt, "ShaderNodeMixShader")
    _link(nt, fac, mx.inputs[0])
    _link(nt, tr.outputs[0], mx.inputs[1])
    _link(nt, gl.outputs[0], mx.inputs[2])
    _link(nt, mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return _remember(name, m)


def glow(name, rgb, strength, falloff=0.0, axes=("X", "Z")):
    """An emitter. With `falloff` a blank screen: brightest in the middle, dimmer to its edges (generated
    coordinates over the two `axes`). No text, no UI."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    if falloff:
        g = _n(nt, "ShaderNodeTexCoord").outputs["Generated"]
        comps = dict(zip("XYZ", _xyz(nt, g)))
        acc = None
        for ax in axes:
            d = _math(nt, "SUBTRACT", comps[ax], 0.5)
            sq = _math(nt, "MULTIPLY", d, d)
            acc = sq if acc is None else _math(nt, "ADD", acc, sq)
        s = _maprange(nt, acc, 0.0, 0.5, strength, strength * (1 - falloff))
        _link(nt, s, em.inputs["Strength"])
    else:
        em.inputs["Strength"].default_value = strength
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return _remember(name, m)


def night(name, low=(0.035, 0.045, 0.07), high=(0.006, 0.009, 0.018), strength=1.0, z0=0.0, z1=4.0, warm_windows=()):
    """The night outside a window, as an emitting backdrop (local X along, local Z up): a cool glow low (the street
    and the city's sky glow), darker above, a soft mottling of trees and roofs, and optional warm neighbour windows
    [(x, z, w, h, strength)] seen far off (blank: only light)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    o = _obj(nt)
    x, _, z = _xyz(nt, o)
    t = _maprange(nt, z, z0, z1, 0.0, 1.0)
    col = _mix(nt, t, low, high)
    mott = _maprange(nt, _noise(nt, o, 0.9, 5.0, 0.65), 0.35, 0.7, 0.45, 1.1)
    col = _mix(nt, 1.0, col, _combine(nt, mott), "MULTIPLY")
    for (wx, wz, ww, wh, ws) in warm_windows:
        dx = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", x, wx))
        dz = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", z, wz))
        inside = _math(nt, "MULTIPLY", _maprange(nt, dx, ww / 2, ww / 2 + 0.02, 1.0, 0.0), _maprange(nt, dz, wh / 2, wh / 2 + 0.02, 1.0, 0.0))
        col = _mix(nt, inside, col, (0.32 * ws, 0.2 * ws, 0.1 * ws), "ADD")
    _link(nt, col, em.inputs["Color"])
    em.inputs["Strength"].default_value = strength
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return _remember(name, m)


def liquid(name, rgb=(0.03, 0.015, 0.008)):
    m, nt, b = _new(name)
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = 0.06
    b.inputs["Specular IOR Level"].default_value = 0.5
    return _remember(name, m)


# ---------------------------------------------------------------- generated props
def tune_prop(holder, spec=0.35, top_wood=None, rough_floor=None, seam=0.6, tone=(0.85, 1.12), late_k=0.6):
    """Finish a generated prop's materials in place: dielectric specular cut to `spec` (generated textures come with
    a plastic sheen), roughness floored at `rough_floor`, and with `top_wood` = (light, dark, scale) the upward-facing
    faces replaced by a clean flat-sawn grain running along world X (the generated texture is a patchwork of grain
    directions that reads as an artefact on a big flat top), sides and legs keep their own texture."""
    seen = set()
    for o in holder.children_recursive:
        if o.type != "MESH":
            continue
        for slot in o.material_slots:
            m = slot.material
            if not m or m.name in seen or not m.use_nodes:
                continue
            seen.add(m.name)
            nt = m.node_tree
            b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if b is None:
                continue
            b.inputs["Specular IOR Level"].default_value = spec
            if rough_floor is not None:
                r = b.inputs["Roughness"]
                if r.is_linked:
                    src = r.links[0].from_socket
                    _link(nt, _math(nt, "MAXIMUM", src, rough_floor), r)
                else:
                    r.default_value = max(r.default_value, rough_floor)
            if top_wood:
                light, dark, scale = top_wood
                base = b.inputs["Base Color"]
                src = base.links[0].from_socket if base.is_linked else None
                p = _pos(nt)
                geo = _n(nt, "ShaderNodeNewGeometry")
                _, _, nz = _xyz(nt, geo.outputs["Normal"])
                up = _maprange(nt, nz, 0.86, 0.97, 0.0, 1.0)
                px, py, pz = _xyz(nt, p)
                board = _math(nt, "FLOOR", _math(nt, "DIVIDE", py, 0.14))
                wn = _n(nt, "ShaderNodeTexWhiteNoise", noise_dimensions="1D")
                _link(nt, _math(nt, "MULTIPLY", board, 5.71), wn.inputs["W"])
                rnd = _out(wn, "Value")
                gv = _n(nt, "ShaderNodeCombineXYZ")
                _link(nt, _math(nt, "ADD", px, _math(nt, "MULTIPLY", rnd, 13.0)), gv.inputs["X"])
                _link(nt, py, gv.inputs["Y"])
                _link(nt, pz, gv.inputs["Z"])
                warp = _noise(nt, gv.outputs[0], 1.0, 3.0, 0.55, mapping=(1.4, 9.0, 9.0))
                gw = _n(nt, "ShaderNodeCombineXYZ")
                _link(nt, px, gw.inputs["X"])
                _link(nt, _math(nt, "ADD", py, _math(nt, "MULTIPLY", warp, 0.05)), gw.inputs["Y"])
                _link(nt, pz, gw.inputs["Z"])
                rings = _math(nt, "FRACT", _math(nt, "MULTIPLY", _math(nt, "ADD", py, _math(nt, "MULTIPLY", warp, 0.06)), scale))
                late = _math(nt, "MULTIPLY", _maprange(nt, rings, 0.5, 0.85, 0.0, 1.0), _maprange(nt, rings, 1.0, 0.9, 0.0, 1.0))
                pores = _noise(nt, gw.outputs[0], 1.0, 2.0, 0.6, mapping=(16.0, 800.0, 800.0))
                g = _math(nt, "ADD", _math(nt, "MULTIPLY", late, late_k), _maprange(nt, pores, 0.6, 0.7, 0.0, 0.3), clamp=True)
                col = _mix(nt, g, light, dark)
                tn = _maprange(nt, rnd, 0.0, 1.0, tone[0], tone[1])
                col = _mix(nt, 1.0, col, _combine(nt, tn), "MULTIPLY")
                sf = _math(nt, "FRACT", _math(nt, "DIVIDE", py, 0.14))
                sm = _math(nt, "MAXIMUM", _maprange(nt, sf, 0.0, 0.004, 1.0, 0.0), _maprange(nt, sf, 0.996, 1.0, 0.0, 1.0))
                col = _mix(nt, _math(nt, "MULTIPLY", sm, seam), col, tuple(c * 0.4 for c in dark))
                if src is not None:
                    col = _mix(nt, up, src, col)
                _link(nt, col, base)
    return holder
