"""Materials for the departure gate (Cycles, Principled BSDF). Every pattern works in object space, in metres, so a
part keeps its pattern wherever it is put; no surface reads as one flat value (tone and roughness always vary).

Interior: carpet tiles laid quarter-turned, a honed stone strip along the glass, a floor convector grille, a metal
pan ceiling, laminate wall panels, painted columns, brushed steel, the podium's laminates and solid surface, thin
architectural glass that reflects the room and lets the apron through. Exterior: apron concrete in slabs, worn line
paint, aircraft paint, a night sky dome and a strip of distant city lights. Emitters: blank screens, blank backlit
panels, linear fixture lenses, small lamps.
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


def _set(nt, sock, v):
    if isinstance(v, (int, float)):
        sock.default_value = v
    elif isinstance(v, tuple):
        sock.default_value = (*v[:3], 1.0) if len(sock.default_value) == 4 else v
    else:
        _link(nt, v, sock)


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
    for sock, v in (("Factor", fac), ("A", a), ("B", b)):
        s = n.inputs[sock] if sock == "Factor" else [i for i in n.inputs if i.name == sock and i.type == "RGBA"][0]
        if sock == "Factor":
            s = [i for i in n.inputs if i.name == "Factor" and i.type == "VALUE"][0]
        if isinstance(v, (int, float)):
            s.default_value = v
        elif isinstance(v, tuple):
            s.default_value = (*v[:3], 1.0)
        else:
            _link(nt, v, s)
    return [o for o in n.outputs if o.type == "RGBA"][0]


def _noise(nt, vec, scale, detail=2.0, rough=0.5, mapping=None):
    n = _n(nt, "ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    if mapping:
        mp = _n(nt, "ShaderNodeMapping")
        mp.inputs["Scale"].default_value = mapping
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


def _xyz(nt, vec):
    s = _n(nt, "ShaderNodeSeparateXYZ")
    _link(nt, vec, s.inputs["Vector"])
    return s.outputs["X"], s.outputs["Y"], s.outputs["Z"]


def _ao(nt, distance=0.35):
    n = _n(nt, "ShaderNodeAmbientOcclusion", samples=4)
    n.inputs["Distance"].default_value = distance
    return n.outputs["AO"]


def _brick(nt, vec, w, h, mortar, c1, c2, cm, offset=0.0, smooth=0.2):
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


# ---------------------------------------------------------------- general surfaces
def pbr(name, rgb, rough=(0.4, 0.55), metal=0.0, nscale=4.0, stretch=(1, 1, 1), cvar=0.1, bump=0.0, bscale=90.0,
        coat=0.0, aniso=0.0, sheen=0.0, grime=0.0):
    """A principled surface with tone and roughness variation; `grime` darkens it into contact corners (AO)."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = 0.1
    b.inputs["Anisotropic"].default_value = aniso
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
    if aniso:
        vt = _n(nt, "ShaderNodeVectorTransform", vector_type="VECTOR", convert_from="OBJECT", convert_to="WORLD")
        vt.inputs["Vector"].default_value = (1.0, 0.0, 0.0)
        _link(nt, vt.outputs["Vector"], b.inputs["Tangent"])
    return m


def brushed(name, rgb=(0.6, 0.61, 0.63), rough=0.3, axis="X", smudge=0.12):
    """Brushed stainless: fine grain along the local axis, handling smudges that dull it."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = 1.0
    o = _obj(nt)
    st = {"X": (3.0, 420.0, 420.0), "Y": (420.0, 3.0, 420.0), "Z": (420.0, 420.0, 3.0)}[axis]
    fine = _noise(nt, o, 1.0, 3.0, 0.6, mapping=st)
    smear = _maprange(nt, _noise(nt, o, 3.2, 6.0, 0.62), 0.5, 0.74, 0.0, 1.0)
    r = _math(nt, "ADD", _maprange(nt, fine, 0.3, 0.7, -0.03, 0.03), _math(nt, "MULTIPLY", smear, smudge))
    _link(nt, _math(nt, "ADD", r, rough, clamp=True), b.inputs["Roughness"])
    _link(nt, _mix(nt, smear, rgb, tuple(c * 0.9 for c in rgb)), b.inputs["Base Color"])
    b.inputs["Anisotropic"].default_value = 0.5
    vt = _n(nt, "ShaderNodeVectorTransform", vector_type="VECTOR", convert_from="OBJECT", convert_to="WORLD")
    vt.inputs["Vector"].default_value = {"X": (1.0, 0, 0), "Y": (0, 1.0, 0), "Z": (0, 0, 1.0)}[axis]
    _link(nt, vt.outputs["Vector"], b.inputs["Tangent"])
    _bump(nt, b, fine, 0.012, 0.0002)
    return m


def carpet(name, base=(0.030, 0.036, 0.047), tile=0.5, lanes_xy=()):
    """Loop-pile carpet tiles laid quarter-turned (the rib runs along X on one tile, along Y on the next, and the two
    orientations sit 8 % apart in value, as pile direction does), each tile a shade apart, a fleck in the yarn, tight
    seams, flattened and paler lanes where people walk, darker at contacts. `lanes_xy`: rectangles (x0, x1, y0, y1) in
    object space of soiled, darker traffic lanes (the queue in front of the podium)."""
    m, nt, b = _new(name)
    o = _obj(nt)
    x, y, _ = _xyz(nt, o)
    cell = _n(nt, "ShaderNodeVectorMath", operation="FLOOR")
    sc = _n(nt, "ShaderNodeVectorMath", operation="SCALE")
    sc.inputs["Scale"].default_value = 1.0 / tile
    _link(nt, o, sc.inputs[0])
    _link(nt, sc.outputs["Vector"], cell.inputs[0])
    cx, cy, _ = _xyz(nt, cell.outputs["Vector"])
    parity = _math(nt, "FLOORED_MODULO", _math(nt, "ADD", cx, cy), 2.0)
    wn = _n(nt, "ShaderNodeTexWhiteNoise", noise_dimensions="3D")
    _link(nt, cell.outputs["Vector"], wn.inputs["Vector"])
    tone = _out(wn, "Value")
    # ribs: 9 mm loops, along X or Y by tile
    rib_x = _math(nt, "SINE", _math(nt, "MULTIPLY", y, 6.2832 / 0.009))
    rib_y = _math(nt, "SINE", _math(nt, "MULTIPLY", x, 6.2832 / 0.009))
    rib = _math(nt, "ADD", _math(nt, "MULTIPLY", rib_x, _math(nt, "SUBTRACT", 1.0, parity)), _math(nt, "MULTIPLY", rib_y, parity))
    rib = _maprange(nt, rib, -1.0, 1.0, 0.0, 1.0)
    fleck = _noise(nt, o, 260.0, 2.0, 0.6)
    col = _mix(nt, _maprange(nt, tone, 0.0, 1.0, 0.0, 1.0), tuple(c * 0.93 for c in base), tuple(c * 1.07 for c in base))
    col = _mix(nt, parity, _mix(nt, 1.0, col, (0.92, 0.92, 0.92), blend="MULTIPLY"), _mix(nt, 1.0, col, (1.08, 1.08, 1.08), blend="MULTIPLY"))
    col = _mix(nt, _maprange(nt, rib, 0.0, 1.0, 0.18, 0.0), col, (0.0, 0.0, 0.0))
    col = _mix(nt, _maprange(nt, fleck, 0.6, 0.72, 0.0, 0.45), col, (0.085, 0.09, 0.1))
    col = _mix(nt, _maprange(nt, fleck, 0.28, 0.36, 0.35, 0.0), col, (0.008, 0.009, 0.012))
    # seams between tiles
    _, seam = _brick(nt, o, tile, tile, 0.003, (1, 1, 1), (1, 1, 1), (0, 0, 0))
    col = _mix(nt, _math(nt, "MULTIPLY", seam, 0.14), col, (0.0, 0.0, 0.0))   # tight seams: barely there
    # traffic: lanes along X in front of the rows and down the aisle, pile flattened (paler, glossier sheen)
    lanes = _maprange(nt, _noise(nt, o, 0.5, 3.0, 0.55, mapping=(0.25, 1.0, 1.0)), 0.45, 0.7, 0.0, 1.0)
    blot = _maprange(nt, _noise(nt, o, 1.6, 5.0, 0.6), 0.55, 0.75, 0.0, 1.0)
    wear = _math(nt, "MINIMUM", _math(nt, "ADD", _math(nt, "MULTIPLY", lanes, 0.6), _math(nt, "MULTIPLY", blot, 0.35)), 1.0)
    col = _mix(nt, _math(nt, "MULTIPLY", wear, 0.3), col, (0.07, 0.075, 0.085))
    stain = _maprange(nt, _noise(nt, o, 3.0, 4.0, 0.6), 0.66, 0.74, 0.0, 0.35)
    col = _mix(nt, stain, col, (0.012, 0.012, 0.012))
    for (x0, x1, y0, y1) in lanes_xy:
        r = _math(nt, "MULTIPLY", _maprange(nt, x, x0 - 0.35, x0 + 0.35, 0.0, 1.0), _maprange(nt, x, x1 - 0.35, x1 + 0.35, 1.0, 0.0))
        r = _math(nt, "MULTIPLY", r, _math(nt, "MULTIPLY", _maprange(nt, y, y0 - 0.35, y0 + 0.35, 0.0, 1.0),
                                           _maprange(nt, y, y1 - 0.35, y1 + 0.35, 1.0, 0.0)))
        r = _math(nt, "MULTIPLY", r, _maprange(nt, _noise(nt, o, 1.4, 4.0, 0.6), 0.3, 0.7, 0.35, 0.6))
        col = _mix(nt, r, col, tuple(c * 0.45 for c in base))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.4), 0.3, 1.0, 0.7, 0.0), col, (0.0, 0.0, 0.0))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.96
    b.inputs["Specular IOR Level"].default_value = 0.25
    b.inputs["Sheen Weight"].default_value = 0.55
    b.inputs["Sheen Roughness"].default_value = 0.45
    b.inputs["Sheen Tint"].default_value = (0.55, 0.6, 0.7, 1)
    # pile: loops plus a fibre noise (scale ~400), the seams only a slight dip
    pile = _math(nt, "ADD", _noise(nt, o, 420.0, 3.0, 0.7), _math(nt, "MULTIPLY", _noise(nt, o, 1300.0, 2.0, 0.6), 0.5))
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", rib, 0.4), _math(nt, "MULTIPLY", pile, 0.6))
    h = _math(nt, "SUBTRACT", h, _math(nt, "MULTIPLY", seam, 0.3))
    _bump(nt, b, h, 0.3, 0.0015)
    return m


def stone(name, base=(0.13, 0.132, 0.135)):
    """Honed terrazzo strip: fine chips in a grey matrix, 0.6 m slabs, polish dulled by feet near the carpet edge."""
    m, nt, b = _new(name)
    o = _obj(nt)
    slab, joint = _brick(nt, o, 0.6, 0.6, 0.002, base, tuple(c * 0.94 for c in base), (0.03, 0.03, 0.032), offset=0.5)
    vo = _n(nt, "ShaderNodeTexVoronoi")
    vo.inputs["Scale"].default_value = 160.0
    _link(nt, o, vo.inputs["Vector"])
    chip = _maprange(nt, _out(vo, "Distance"), 0.0, 0.2, 1.0, 0.0)
    col = _mix(nt, _maprange(nt, chip, 0.62, 0.9, 0.0, 0.5), slab, (0.3, 0.3, 0.31))
    vo2 = _n(nt, "ShaderNodeTexVoronoi")
    vo2.inputs["Scale"].default_value = 90.0
    _link(nt, o, vo2.inputs["Vector"])
    col = _mix(nt, _maprange(nt, _out(vo2, "Distance"), 0.0, 0.12, 0.6, 0.0), col, (0.03, 0.03, 0.032))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.3), 0.3, 1.0, 0.6, 0.0), col, (0.0, 0.0, 0.0))
    _link(nt, col, b.inputs["Base Color"])
    r = _maprange(nt, _noise(nt, o, 2.0, 5.0, 0.6), 0.3, 0.7, 0.12, 0.3)
    _link(nt, _math(nt, "ADD", r, _math(nt, "MULTIPLY", joint, 0.5), clamp=True), b.inputs["Roughness"])
    _bump(nt, b, _math(nt, "MULTIPLY", joint, -1.0), 0.3, 0.0015)
    return m


def grille(name, rgb=(0.05, 0.052, 0.056), pitch=0.012, axis="X"):
    """Linear bar grille (floor convector, slot diffuser): dark gaps between satin bars running along local `axis`."""
    m, nt, b = _new(name)
    o = _obj(nt)
    x, y, _ = _xyz(nt, o)
    across = y if axis == "X" else x
    bars = _math(nt, "SINE", _math(nt, "MULTIPLY", across, 6.2832 / pitch))
    gap = _maprange(nt, bars, 0.45, 0.65, 0.0, 1.0)
    col = _mix(nt, gap, rgb, (0.002, 0.002, 0.002))
    col = _mix(nt, _maprange(nt, _noise(nt, o, 6.0, 3.0, 0.6), 0.55, 0.75, 0.0, 0.4), col, (0.01, 0.01, 0.01))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Metallic"].default_value = 0.7
    _link(nt, _maprange(nt, gap, 0.0, 1.0, 0.35, 0.9), b.inputs["Roughness"])
    _bump(nt, b, _math(nt, "MULTIPLY", gap, -1.0), 0.6, 0.004)
    return m


def ceiling_pan(name, rgb=(0.17, 0.175, 0.18)):
    """Metal pan ceiling, 1.2 x 0.6 m lay-in panels: hairline shadow joints, each panel a touch apart in tone."""
    m, nt, b = _new(name)
    o = _obj(nt)
    col, joint = _brick(nt, o, 1.2, 0.6, 0.004, rgb, tuple(c * 0.9 for c in rgb), (0.01, 0.01, 0.011))
    col = _mix(nt, _maprange(nt, _noise(nt, o, 0.6, 3.0, 0.5), 0.3, 0.7, 0.0, 0.5), col, tuple(c * 0.8 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Metallic"].default_value = 0.2
    _link(nt, _maprange(nt, _noise(nt, o, 3.0, 3.0, 0.6), 0.3, 0.7, 0.4, 0.55), b.inputs["Roughness"])
    _bump(nt, b, _math(nt, "MULTIPLY", joint, -1.0), 0.4, 0.002)
    return m


def wall_panels(name, rgb, width=1.2, grime=0.35, along="X"):
    """Laminate wall cladding in vertical panels with shadow-gap reveals (panels follow local `along`, local Z up);
    darker into the corners and low down where luggage rubs."""
    m, nt, b = _new(name)
    o = _obj(nt)
    x, y, z = _xyz(nt, o)
    sel = _n(nt, "ShaderNodeCombineXYZ")
    _link(nt, x if along == "X" else y, sel.inputs["X"])
    _link(nt, z, sel.inputs["Y"])
    col, joint = _brick(nt, sel.outputs["Vector"], width, 50.0, 0.006, rgb, tuple(c * 0.93 for c in rgb), (0.005, 0.005, 0.006))
    col = _mix(nt, _maprange(nt, _noise(nt, o, 1.2, 4.0, 0.6), 0.3, 0.7, 0.0, 0.6), col, tuple(c * 0.85 for c in rgb))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.4), 0.3, 1.0, grime, 0.0), col, (0.0, 0.0, 0.0))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, _noise(nt, o, 4.0, 4.0, 0.6), 0.3, 0.7, 0.35, 0.55), b.inputs["Roughness"])
    _bump(nt, b, _math(nt, "MULTIPLY", joint, -1.0), 0.5, 0.003)
    return m


def shutter(name, rgb=(0.1, 0.104, 0.11)):
    """A closed roller shutter: 80 mm horizontal slats (local Z up), satin galvanised, dulled and streaked."""
    m, nt, b = _new(name)
    o = _obj(nt)
    _, _, z = _xyz(nt, o)
    w = _math(nt, "FRACT", _math(nt, "MULTIPLY", z, 1.0 / 0.08))
    prof = _math(nt, "SINE", _math(nt, "MULTIPLY", w, 3.1416))
    groove = _maprange(nt, w, 0.0, 0.08, 1.0, 0.0)
    col = _mix(nt, groove, rgb, (0.01, 0.01, 0.011))
    streak = _noise(nt, o, 1.0, 4.0, 0.6, mapping=(8.0, 8.0, 0.6))
    col = _mix(nt, _maprange(nt, streak, 0.4, 0.7, 0.0, 0.5), col, tuple(c * 0.6 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Metallic"].default_value = 0.8
    _link(nt, _maprange(nt, streak, 0.3, 0.7, 0.3, 0.6), b.inputs["Roughness"])
    _bump(nt, b, prof, 0.5, 0.006)
    return m


def glass(name, tint=(0.86, 0.9, 0.92), refl=0.06):
    """Thin architectural glass: transparent (lets light and the apron through), reflecting the room by Fresnel."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = (*tint, 1)
    gl = _n(nt, "ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.015
    lw = _n(nt, "ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.08
    smudge = _maprange(nt, _noise(nt, _obj(nt), 2.5, 5.0, 0.6), 0.4, 0.75, 0.0, 0.02)
    fac = _math(nt, "ADD", _math(nt, "ADD", _math(nt, "MULTIPLY", _out(lw, "Fresnel"), 0.85), refl), smudge, clamp=True)
    mx = _n(nt, "ShaderNodeMixShader")
    _link(nt, fac, mx.inputs[0])
    _link(nt, tr.outputs[0], mx.inputs[1])
    _link(nt, gl.outputs[0], mx.inputs[2])
    _link(nt, mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def glow(name, rgb, strength, falloff=0.0, axes=("X", "Z")):
    """An emitter. With `falloff` a blank screen or backlit panel: brightest in the middle, dimmer to its edges
    (generated coordinates over the two `axes`). No text, no UI."""
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
    return m


def lens(name, rgb, strength):
    """A linear fixture's opal lens: a soft brighter line down the middle (the LED strip behind it)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    g = _n(nt, "ShaderNodeTexCoord").outputs["Generated"]
    _, gy, _ = _xyz(nt, g)
    d = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", gy, 0.5))
    s = _maprange(nt, d, 0.0, 0.5, strength * 1.25, strength * 0.55)
    _link(nt, s, em.inputs["Strength"])
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def perforated(name, steel=0.32, hole=0.01, pitch=0.008, radius=0.0025, border=0.028):
    """Perforated steel on the shell's UVs (metres): round holes on a staggered 8 mm grid, a plain border round each
    field and across the bend. Holes drive colour and a gentle bump only (no real holes: no shimmer in the wide)."""
    m, nt, b = _new(name)
    uvn = _n(nt, "ShaderNodeUVMap")
    u, v, _ = _xyz(nt, uvn.outputs["UV"])
    us, vs = _math(nt, "DIVIDE", u, pitch), _math(nt, "DIVIDE", v, pitch)
    row = _math(nt, "FLOOR", vs)
    us = _math(nt, "ADD", us, _math(nt, "MULTIPLY", _math(nt, "FLOORED_MODULO", row, 2.0), 0.5))
    fu = _math(nt, "SUBTRACT", _math(nt, "FRACT", us), 0.5)
    fv = _math(nt, "SUBTRACT", _math(nt, "FRACT", vs), 0.5)
    d = _math(nt, "MULTIPLY", _math(nt, "SQRT", _math(nt, "ADD", _math(nt, "MULTIPLY", fu, fu), _math(nt, "MULTIPLY", fv, fv))), pitch)
    hole_m = _maprange(nt, d, radius - 0.0004, radius + 0.0004, 1.0, 0.0)
    # fields: inside the side borders, on the pan (v 0.09..0.44) and the back (v 0.60..0.91); plain lip, bend and top
    side = _maprange(nt, _math(nt, "ABSOLUTE", u), 0.25 - border - 0.002, 0.25 - border, 1.0, 0.0)
    pan = _math(nt, "MULTIPLY", _maprange(nt, v, 0.085, 0.089, 0.0, 1.0), _maprange(nt, v, 0.385, 0.389, 1.0, 0.0))
    back = _math(nt, "MULTIPLY", _maprange(nt, v, 0.545, 0.549, 0.0, 1.0), _maprange(nt, v, 0.851, 0.855, 1.0, 0.0))
    field = _math(nt, "MULTIPLY", side, _math(nt, "ADD", pan, back, clamp=True))
    hole_m = _math(nt, "MULTIPLY", hole_m, field)
    wear = _maprange(nt, _noise(nt, _obj(nt), 9.0, 4.0, 0.6), 0.3, 0.7, 0.92, 1.06)
    st = _math(nt, "MULTIPLY", wear, steel)
    cs = _n(nt, "ShaderNodeCombineXYZ")
    for k, f in zip("XYZ", (1.0, 1.01, 1.04)):
        _link(nt, _math(nt, "MULTIPLY", st, f), cs.inputs[k])
    col = _mix(nt, hole_m, cs.outputs["Vector"], (hole, hole, hole))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Metallic"].default_value = 0.55       # powder-coated silver, not bare chrome: it must read in the dark
    _link(nt, _maprange(nt, hole_m, 0.0, 1.0, 0.44, 0.8), b.inputs["Roughness"])
    _bump(nt, b, _math(nt, "MULTIPLY", hole_m, -1.0), 0.08, 0.0015)
    return m


def _rrect(nt, u, v, uc, vc, hu, hv, rad, width):
    """A groove line along a rounded rectangle in (u, v) (centre, half sizes, corner radius): 1 on the line."""
    qx = _math(nt, "SUBTRACT", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", u, uc)), hu - rad)
    qy = _math(nt, "SUBTRACT", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", v, vc)), hv - rad)
    ox, oy = _math(nt, "MAXIMUM", qx, 0.0), _math(nt, "MAXIMUM", qy, 0.0)
    outside = _math(nt, "SQRT", _math(nt, "ADD", _math(nt, "MULTIPLY", ox, ox), _math(nt, "MULTIPLY", oy, oy)))
    inside = _math(nt, "MINIMUM", _math(nt, "MAXIMUM", qx, qy), 0.0)
    dist = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", _math(nt, "ADD", outside, inside), rad))
    return _maprange(nt, dist, width * 0.5, width, 1.0, 0.0)


# doors on the skin, in the skin's UVs (u around from the crown toward +X at radius 1.95, v aft of the tip):
# (u centre, v centre, half u, half v): L1 / R1 forward, L2 / R2 aft, the forward and aft cargo doors (starboard)
_RF = 1.95
_U = 2 * 3.14159265 * _RF
DOORS = [(_RF * 1.362, 6.9, 1.0, 0.5), (_U - _RF * 1.362, 6.9, 1.0, 0.5),
         (_RF * 1.362, 29.0, 1.0, 0.45), (_U - _RF * 1.362, 29.0, 1.0, 0.45),
         (_U - _RF * 2.25, 9.6, 0.62, 0.9), (_U - _RF * 2.25, 24.2, 0.62, 0.9),
         (_U - _RF * 1.45, 15.1, 0.5, 0.26), (_U - _RF * 1.45, 16.1, 0.5, 0.26)]


def fuselage(name, top=(0.55, 0.555, 0.56), belly=(0.37, 0.374, 0.38)):
    """Aircraft paint, no livery: satin white-grey (base 0.55, roughness 0.35, a clear coat 0.3), a darker belly by
    the surface normal; on the skin's UVs in metres: faint panel lines (1.6 m along, 0.9 m around, staggered, bump
    0.05), the radome seam ring 1.6 m back from the tip (the radome a shade apart), and the door outlines as 8 mm
    grooves."""
    m, nt, b = _new(name)
    uvn = _n(nt, "ShaderNodeUVMap")
    u, v, _ = _xyz(nt, uvn.outputs["UV"])
    pv = _n(nt, "ShaderNodeCombineXYZ")
    _link(nt, _math(nt, "ADD", v, 0.8), pv.inputs["X"])        # parts without UVs (0, 0) land mid-panel
    _link(nt, _math(nt, "ADD", u, 0.45), pv.inputs["Y"])
    _, joint = _brick(nt, pv.outputs["Vector"], 1.6, 0.9, 0.003, (1, 1, 1), (1, 1, 1), (0, 0, 0), offset=0.5, smooth=0.0)
    nrm = _n(nt, "ShaderNodeNewGeometry").outputs["Normal"]
    _, _, nz = _xyz(nt, nrm)
    bel = _maprange(nt, nz, 0.25, -0.7, 0.0, 1.0)
    col = _mix(nt, bel, top, belly)
    o = _obj(nt)
    col = _mix(nt, _maprange(nt, _noise(nt, o, 0.4, 4.0, 0.6), 0.3, 0.7, 0.0, 0.12), col, tuple(c * 0.82 for c in belly))
    # the radome: a shade warmer and duller forward of its seam (v < 1.6), the seam itself a dark groove
    rad = _maprange(nt, v, 1.58, 1.62, 1.0, 0.0)
    col = _mix(nt, _math(nt, "MULTIPLY", rad, 0.5), col, (0.5, 0.495, 0.48))
    seam = _maprange(nt, _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", v, 1.6)), 0.004, 0.008, 1.0, 0.0)
    grooves = seam
    for (uc, vc, hu, hv) in DOORS:
        grooves = _math(nt, "MAXIMUM", grooves, _rrect(nt, u, v, uc, vc, hu, hv, 0.14, 0.014))
    lines = _math(nt, "MAXIMUM", _math(nt, "MULTIPLY", joint, 0.35), grooves)
    col = _mix(nt, _math(nt, "MULTIPLY", lines, 0.55), col, (0.04, 0.04, 0.042))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Specular IOR Level"].default_value = 0.4
    b.inputs["Coat Weight"].default_value = 0.3
    b.inputs["Coat Roughness"].default_value = 0.12
    r = _maprange(nt, _noise(nt, o, 1.2, 4.0, 0.6), 0.3, 0.7, 0.31, 0.4)
    _link(nt, _math(nt, "ADD", r, _math(nt, "MULTIPLY", rad, 0.12)), b.inputs["Roughness"])
    _bump(nt, b, _math(nt, "ADD", _math(nt, "MULTIPLY", joint, -0.4), _math(nt, "MULTIPLY", grooves, -1.0)), 0.05, 0.003)
    return m


def acoustic(name, rgb=(0.3, 0.302, 0.3), tile=0.6):
    """Mineral-fibre ceiling tiles on a 0.6 m grid: a 4 mm dark grooved reveal round each tile, a fissured face
    (pinholes and worm fissures), each tile a shade apart."""
    m, nt, b = _new(name)
    o = _obj(nt)
    col, joint = _brick(nt, o, tile, tile, 0.007, rgb, tuple(c * 0.92 for c in rgb), (0.02, 0.021, 0.022), smooth=0.3)
    vo = _n(nt, "ShaderNodeTexVoronoi")
    vo.inputs["Scale"].default_value = 140.0
    _link(nt, o, vo.inputs["Vector"])
    pin = _maprange(nt, _out(vo, "Distance"), 0.0, 0.06, 1.0, 0.0)
    fis = _maprange(nt, _noise(nt, o, 45.0, 6.0, 0.7), 0.62, 0.68, 0.0, 1.0)
    pits = _math(nt, "MAXIMUM", pin, fis)
    col = _mix(nt, _math(nt, "MULTIPLY", pits, 0.5), col, tuple(c * 0.45 for c in rgb))
    col = _mix(nt, _maprange(nt, _noise(nt, o, 0.8, 3.0, 0.6), 0.3, 0.7, 0.0, 0.3), col, tuple(c * 0.82 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.92
    _bump(nt, b, _math(nt, "SUBTRACT", _math(nt, "MULTIPLY", pits, -0.4), joint), 0.5, 0.004)
    return m


def cockpit_glass(name):
    """Flight-deck glazing: near-black glass, glossy (roughness 0.08), the faintest instrument glow from inside."""
    m, nt, b = _new(name)
    b.inputs["Base Color"].default_value = (0.003, 0.0035, 0.004, 1)
    b.inputs["Roughness"].default_value = 0.08
    b.inputs["Specular IOR Level"].default_value = 0.7
    b.inputs["Coat Weight"].default_value = 0.5
    b.inputs["Coat Roughness"].default_value = 0.04
    b.inputs["Emission Color"].default_value = (0.45, 0.58, 0.8, 1)
    b.inputs["Emission Strength"].default_value = 0.04
    return m


def ribbed(name, rgb=(0.13, 0.135, 0.14), pitch=0.30, axis="Y", metal=0.5):
    """Corrugated cladding (jet bridge tunnel, bellows): ribs across local `axis` at `pitch`, as a bump."""
    m, nt, b = _new(name)
    o = _obj(nt)
    comp = dict(zip("XYZ", _xyz(nt, o)))[axis]
    w = _math(nt, "SINE", _math(nt, "MULTIPLY", comp, 6.2832 / pitch))
    rib = _maprange(nt, w, -1.0, 1.0, 0.0, 1.0)
    col = _mix(nt, _maprange(nt, _noise(nt, o, 0.9, 4.0, 0.6), 0.3, 0.7, 0.0, 0.5), rgb, tuple(c * 0.75 for c in rgb))
    col = _mix(nt, _maprange(nt, rib, 0.0, 0.35, 0.6, 0.0), col, tuple(c * 0.35 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Metallic"].default_value = metal
    _link(nt, _maprange(nt, _noise(nt, o, 3.0, 3.0, 0.6), 0.3, 0.7, 0.45, 0.65), b.inputs["Roughness"])
    _bump(nt, b, rib, 0.1, 0.02)
    return m


# ---------------------------------------------------------------- exterior
def concrete(name, base=(0.12, 0.121, 0.123), slab=5.0):
    """Apron concrete: 5 m slabs with sealed joints, tyre and oil darkening, patchy roughness, and wet patches
    (roughness 0.15 in a broad noise mask) that pick up the masts' reflections."""
    m, nt, b = _new(name)
    o = _obj(nt)
    col, joint = _brick(nt, o, slab, slab, 0.006, base, tuple(c * 0.9 for c in base), (0.012, 0.012, 0.012))
    col = _mix(nt, _maprange(nt, _noise(nt, o, 0.08, 4.0, 0.6), 0.35, 0.65, 0.0, 0.6), col, tuple(c * 0.55 for c in base))
    oil = _maprange(nt, _noise(nt, o, 0.35, 5.0, 0.65), 0.6, 0.72, 0.0, 0.7)
    col = _mix(nt, oil, col, (0.015, 0.015, 0.016))
    col = _mix(nt, _maprange(nt, _noise(nt, o, 6.0, 3.0, 0.6), 0.3, 0.7, 0.0, 0.25), col, tuple(c * 1.3 for c in base))
    wet = _maprange(nt, _noise(nt, o, 0.045, 3.0, 0.55), 0.56, 0.62, 0.0, 1.0)
    col = _mix(nt, _math(nt, "MULTIPLY", wet, 0.45), col, tuple(c * 0.5 for c in base))
    _link(nt, col, b.inputs["Base Color"])
    r = _maprange(nt, _noise(nt, o, 0.12, 4.0, 0.6), 0.3, 0.7, 0.4, 0.8)
    r = _math(nt, "SUBTRACT", r, _math(nt, "MULTIPLY", oil, 0.3), clamp=True)
    mx = _n(nt, "ShaderNodeMix", data_type="FLOAT")
    _link(nt, wet, mx.inputs["Factor"])
    _link(nt, r, mx.inputs["A"])
    mx.inputs["B"].default_value = 0.15
    _link(nt, mx.outputs["Result"], b.inputs["Roughness"])
    _bump(nt, b, _math(nt, "ADD", _math(nt, "MULTIPLY", joint, -1.0), _math(nt, "MULTIPLY", _noise(nt, o, 40.0, 3.0, 0.6), 0.2)), 0.3, 0.01)
    return m


def line_paint(name, rgb):
    """Ground marking paint, scuffed through to the concrete by tyres."""
    m, nt, b = _new(name)
    o = _obj(nt)
    scuff = _maprange(nt, _noise(nt, o, 1.2, 5.0, 0.65), 0.45, 0.7, 0.0, 0.75)
    _link(nt, _mix(nt, scuff, rgb, (0.06, 0.06, 0.062)), b.inputs["Base Color"])
    _link(nt, _maprange(nt, scuff, 0.0, 1.0, 0.45, 0.75), b.inputs["Roughness"])
    return m


def sky(name, horizon=(0.15, 0.15, 0.17), zenith=(0.004, 0.0065, 0.014), haze=(0.42, 0.27, 0.13)):
    """The night sky as an emitting dome: near black overhead, a low band of city glow along the horizon."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    nrm = _n(nt, "ShaderNodeVectorMath", operation="NORMALIZE")
    _link(nt, _obj(nt), nrm.inputs[0])
    _, _, z = _xyz(nt, nrm.outputs["Vector"])
    t = _maprange(nt, z, -0.01, 0.22, 0.0, 1.0)
    t = _math(nt, "POWER", t, 0.55)
    col = _mix(nt, t, horizon, zenith)
    glowband = _maprange(nt, z, -0.005, 0.06, 1.0, 0.0)          # a low sodium glow over the city
    col = _mix(nt, _math(nt, "MULTIPLY", _math(nt, "POWER", glowband, 1.6), 0.9), col, haze)
    cloud = _maprange(nt, _noise(nt, _obj(nt), 0.0012, 4.0, 0.6, mapping=(1.0, 1.0, 3.0)), 0.35, 0.7, 0.85, 1.25)
    _link(nt, col, em.inputs["Color"])
    _link(nt, cloud, em.inputs["Strength"])
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def city(name, strength=14.0):
    """Distant city lights on a vertical strip (local X along, local Z up): scattered points, sodium and white, denser
    low down, over a faint glow."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    o = _obj(nt)
    _, _, z = _xyz(nt, o)
    vo = _n(nt, "ShaderNodeTexVoronoi")
    vo.inputs["Scale"].default_value = 0.11
    vo.inputs["Randomness"].default_value = 1.0
    mp = _n(nt, "ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, 1.0, 2.2)
    _link(nt, o, mp.inputs["Vector"])
    _link(nt, mp.outputs["Vector"], vo.inputs["Vector"])
    dot = _maprange(nt, _out(vo, "Distance"), 0.0, 0.06, 1.0, 0.0)
    cr = _out(vo, "Color")
    sp = _xyz(nt, cr)
    keep = _maprange(nt, sp[0], 0.45, 0.47, 0.0, 1.0)                 # about half the cells have a light
    warm = _maprange(nt, sp[1], 0.48, 0.52, 0.0, 1.0)
    colr = _mix(nt, warm, (0.75, 0.85, 1.0), (1.0, 0.62, 0.3))
    low = _maprange(nt, z, 0.0, 30.0, 1.0, 0.15)
    mask = _maprange(nt, _noise(nt, o, 0.004, 3.0, 0.6), 0.4, 0.6, 0.15, 1.0)  # districts, gaps between them
    s = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", dot, keep), _math(nt, "MULTIPLY", low, mask))
    s = _math(nt, "MULTIPLY", s, strength)
    base = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", low, mask), 0.05)
    _link(nt, colr, em.inputs["Color"])
    _link(nt, _math(nt, "ADD", s, base), em.inputs["Strength"])
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def materials():
    if M:
        return M
    M.update(
        # the soiled queue lane in front of the podium (carpet object space: world minus (-0.5, -1.45))
        carpet=carpet("carpet tiles", base=(0.088, 0.094, 0.108), lanes_xy=[(4.6 + 0.5, 9.9 + 0.5, 2.2 + 1.45, 4.4 + 1.45)]),
        stone=stone("terrazzo strip"),
        convector=grille("floor convector", (0.04, 0.042, 0.046), 0.014, "X"),
        diffuser=grille("slot diffuser", (0.06, 0.062, 0.066), 0.02, "X"),
        ceiling=acoustic("acoustic ceiling tiles"),
        wall=wall_panels("wall cladding", (0.11, 0.115, 0.125)),
        wall_side=wall_panels("side wall cladding", (0.095, 0.1, 0.11), width=1.5, along="Y"),
        bulk=pbr("bulkhead plaster", (0.15, 0.155, 0.16), (0.6, 0.75), nscale=1.5, cvar=0.08),
        column=pbr("column paint", (0.3, 0.305, 0.31), (0.72, 0.85), nscale=2.0, cvar=0.06, bump=0.06, bscale=300, grime=0.3),
        steel=brushed("brushed steel", (0.6, 0.61, 0.63), 0.28, "Z"),
        steel_x=brushed("brushed steel x", (0.6, 0.61, 0.63), 0.26, "X"),
        alu=pbr("anodised mullion", (0.045, 0.047, 0.052), (0.28, 0.42), metal=0.85, nscale=3, stretch=(1, 1, 30), cvar=0.08),
        rubber=pbr("rubber base", (0.012, 0.012, 0.013), (0.55, 0.75), nscale=8, cvar=0.2, grime=0.2),
        laminate=pbr("podium laminate", (0.16, 0.162, 0.165), (0.32, 0.46), nscale=5, cvar=0.06, bump=0.03, bscale=300, grime=0.3),
        laminate_dark=pbr("podium laminate dark", (0.03, 0.031, 0.034), (0.3, 0.45), nscale=5, cvar=0.12, grime=0.2),
        solid=pbr("solid surface top", (0.02, 0.021, 0.023), (0.12, 0.3), nscale=4, cvar=0.15, coat=0.35),
        plastic=pbr("dark plastic", (0.022, 0.023, 0.026), (0.38, 0.52), nscale=8, cvar=0.12),
        plastic_mid=pbr("grey plastic", (0.12, 0.124, 0.13), (0.4, 0.55), nscale=8, cvar=0.08),
        screen_off=pbr("screen glass off", (0.004, 0.005, 0.006), (0.05, 0.1), nscale=10, cvar=0.05),
        housing=pbr("fixture housing", (0.2, 0.205, 0.21), (0.45, 0.6), metal=0.3, nscale=4, cvar=0.06),
        sign_case=pbr("sign case", (0.06, 0.062, 0.066), (0.4, 0.55), metal=0.5, nscale=4, cvar=0.08),
        lens_off=pbr("lens off", (0.22, 0.225, 0.23), (0.35, 0.45), nscale=5, cvar=0.04),
        door=pbr("door steel", (0.07, 0.074, 0.08), (0.35, 0.5), metal=0.4, nscale=3, cvar=0.08, grime=0.3),
        shutter=shutter("roller shutter"),
        bin=brushed("bin steel", (0.42, 0.43, 0.45), 0.32, "Z"),
        glass=glass("window glass", refl=0.075),
        glass_door=glass("door glass", (0.6, 0.66, 0.7), 0.08),
        # emitters (no text anywhere)
        lens_on=lens("fixture lens", (0.84, 0.92, 1.0), 9.0),
        screen=glow("blank screen", (0.6, 0.76, 1.0), 2.2, 0.45),
        screen_dim=glow("blank screen dim", (0.55, 0.7, 0.95), 0.16, 0.4),
        sign=glow("blank sign", (0.78, 0.86, 1.0), 1.6, 0.35),
        sign_dim=glow("blank sign dim", (0.62, 0.72, 0.9), 0.22, 0.3),
        sign_mid=glow("blank sign mid", (0.75, 0.84, 1.0), 0.9, 0.35),
        ledge_led=glow("ledge strip", (0.75, 0.85, 1.0), 6.0),
        led_green=glow("indicator green", (0.4, 1.0, 0.6), 4.0),
        # exterior
        concrete=concrete("apron concrete"),
        asphalt=pbr("runway asphalt", (0.025, 0.025, 0.026), (0.55, 0.8), nscale=0.05, cvar=0.25),
        grass=pbr("airfield grass", (0.012, 0.014, 0.012), (0.8, 0.95), nscale=0.02, cvar=0.3),
        yellow=line_paint("yellow line", (0.35, 0.28, 0.06)),
        tape=pbr("floor tape", (0.25, 0.20, 0.06), (0.42, 0.55), nscale=6, cvar=0.12, grime=0.2),
        cup=pbr("paper cup", (0.55, 0.52, 0.47), (0.72, 0.82), nscale=30, cvar=0.04),
        cup_lid=pbr("cup lid", (0.03, 0.03, 0.032), (0.35, 0.45), nscale=30, cvar=0.05),
        paper=pbr("newsprint", (0.46, 0.45, 0.42), (0.82, 0.92), nscale=20, cvar=0.08, bump=0.05, bscale=400),
        # gate seating (built in departure_gate_seats.py)
        perf=perforated("perforated steel"),
        frame=pbr("seat frame", (0.035, 0.036, 0.04), (0.32, 0.45), metal=0.7, nscale=6, cvar=0.12, grime=0.2),
        arm=pbr("polished aluminium", (0.6, 0.61, 0.63), (0.33, 0.4), metal=1.0, nscale=10, cvar=0.06),
        pad=pbr("arm pad", (0.016, 0.016, 0.017), (0.5, 0.65), nscale=20, cvar=0.15),
        glide=pbr("glide", (0.01, 0.01, 0.011), (0.6, 0.8), nscale=20, cvar=0.15),
        white=line_paint("white line", (0.42, 0.42, 0.42)),
        red=line_paint("red line", (0.3, 0.03, 0.025)),
        facade=pbr("facade cladding", (0.05, 0.053, 0.058), (0.3, 0.5), metal=0.6, nscale=0.6, cvar=0.12),
        fuselage=fuselage("aircraft paint"),
        fuselage_dark=pbr("aircraft belly", (0.3, 0.302, 0.305), (0.38, 0.5), nscale=0.3, cvar=0.1),
        cockpit_glass=cockpit_glass("cockpit glass"),
        cockpit_frame=pbr("cockpit seal", (0.018, 0.019, 0.02), (0.45, 0.6), nscale=4, cvar=0.1),
        engine=pbr("nacelle", (0.42, 0.425, 0.43), (0.3, 0.42), metal=0.2, nscale=0.6, cvar=0.08, coat=0.4),
        chrome=pbr("chrome piston", (0.75, 0.76, 0.78), (0.12, 0.2), metal=1.0, nscale=6, cvar=0.04),
        intake=pbr("intake dark", (0.01, 0.01, 0.011), (0.3, 0.5), metal=0.6, nscale=3, cvar=0.2),
        tyre=pbr("tyre", (0.012, 0.012, 0.013), (0.6, 0.8), nscale=5, cvar=0.2),
        gear=pbr("gear strut", (0.3, 0.3, 0.31), (0.2, 0.35), metal=1.0, nscale=4, cvar=0.1),
        bridge=pbr("jet bridge ribs", (0.1, 0.104, 0.11), (0.35, 0.5), metal=0.5, nscale=0.8, cvar=0.12),
        bridge_plain=pbr("jet bridge plate", (0.075, 0.078, 0.084), (0.4, 0.55), metal=0.5, nscale=0.8, cvar=0.15, grime=0.3),
        bellows=pbr("bridge bellows", (0.02, 0.021, 0.022), (0.6, 0.8), nscale=2, cvar=0.2),
        bellows_rib=ribbed("bellows ribs", (0.022, 0.023, 0.025), 0.09, "X", metal=0.0),
        mast=pbr("galvanised mast", (0.18, 0.18, 0.185), (0.55, 0.68), metal=0.0, nscale=0.4, cvar=0.15),
        vehicle=pbr("ground vehicle", (0.06, 0.062, 0.066), (0.35, 0.55), nscale=1.0, cvar=0.12, coat=0.2),
        cabin_lit=glow("cabin window", (1.0, 0.88, 0.72), 7.0),
        cabin_dim=glow("cabin window dim", (0.9, 0.8, 0.7), 1.2),
        cabin_off=pbr("cabin window off", (0.01, 0.011, 0.013), (0.05, 0.1), nscale=10, cvar=0.05),

        bridge_win=glow("bridge glazing", (1.0, 0.8, 0.58), 0.32, 0.3, ("Y", "Z")),
        screen_front=glow("blank screen front", (0.82, 0.9, 1.0), 2.6, 0.35),
        flood=glow("flood lamp", (1.0, 0.9, 0.78), 160.0),
        nav_red=glow("nav red", (1.0, 0.08, 0.05), 60.0),
        nav_green=glow("nav green", (0.1, 1.0, 0.35), 50.0),
        nav_white=glow("nav white", (1.0, 1.0, 1.0), 40.0),
        amber=glow("beacon amber", (1.0, 0.5, 0.08), 30.0),
        edge_white=glow("runway edge", (1.0, 0.92, 0.8), 80.0),
        edge_blue=glow("taxiway edge", (0.2, 0.4, 1.0), 70.0),
        edge_blue_near=glow("taxiway edge near", (0.2, 0.42, 1.0), 40.0),
        centre_green=glow("taxiway centre", (0.2, 1.0, 0.45), 50.0),
        building_glow=glow("concourse glazing", (0.8, 0.85, 0.95), 0.9),
        tower_glow=glow("tower cab", (0.6, 0.85, 0.8), 1.6),
        sky=sky("night sky"),
        city=city("city lights"),
    )
    return M
