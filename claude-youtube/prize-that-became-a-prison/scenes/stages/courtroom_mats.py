"""Materials for the courtroom (Cycles, Principled BSDF). Patterns work in object space, in metres; nothing reads as one
flat value (tone and roughness always vary), and every wooden part takes its own grain offset and a slightly different
tone from its object's random number, so panels and boards are told apart as real veneer leaves are.

    veneer      pale lacquered ash / dark smoked oak: growth rings round the grain axis pushed about by a stretched
                noise (irregular latewood streaks, no regular stripe), a slow figure, per-board value and hue
    plaster     painted plaster walls and ceiling: trowel variation, fine bump, dust and grime into the corners
    stone_floor honed stone tiles: per-tile tone, fine chips, polish dulled along the walked lines, grooved joints,
                AO contact darkening
    refabric    turns a MakeHuman garment into matt woven cotton in place (the prison clothes); felt (acoustic panels)
    carpet      cut-pile carpet for the judges' dais
    dark_metal  satin bronze-black hardware (hinges, frames, handles), handling wear
    blank_panel a plain matt panel (where an emblem would hang: no emblem, no text)
    glow / lens / frosted   emitters: blank screens, opal light panels, frosted daylight glass
Node helpers copied from departure_gate_mats.py.
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
    if isinstance(c, (int, float)):
        n.inputs["To Min"].default_value = c
    else:
        _link(nt, c, n.inputs["To Min"])
    if isinstance(d, (int, float)):
        n.inputs["To Max"].default_value = d
    else:
        _link(nt, d, n.inputs["To Max"])
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


def _world(nt):
    return _n(nt, "ShaderNodeNewGeometry").outputs["Position"]


def _xyz(nt, vec):
    s = _n(nt, "ShaderNodeSeparateXYZ")
    _link(nt, vec, s.inputs["Vector"])
    return s.outputs["X"], s.outputs["Y"], s.outputs["Z"]


def _ao(nt, distance=0.35):
    n = _n(nt, "ShaderNodeAmbientOcclusion", samples=4)
    n.inputs["Distance"].default_value = distance
    return n.outputs["AO"]


def _rand(nt):
    return _n(nt, "ShaderNodeObjectInfo").outputs["Random"]


def _vadd(nt, vec, offset):
    n = _n(nt, "ShaderNodeVectorMath", operation="ADD")
    _link(nt, vec, n.inputs[0])
    if isinstance(offset, tuple):
        n.inputs[1].default_value = offset
    else:
        _link(nt, offset, n.inputs[1])
    return n.outputs["Vector"]


def _vscale(nt, vec, s):
    n = _n(nt, "ShaderNodeVectorMath", operation="SCALE")
    _link(nt, vec, n.inputs[0])
    if isinstance(s, (int, float)):
        n.inputs["Scale"].default_value = s
    else:
        _link(nt, s, n.inputs["Scale"])
    return n.outputs["Vector"]


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


# ---------------------------------------------------------------- surfaces
def veneer(name, base=(0.46, 0.37, 0.26), axis="Z", contrast=0.2, rough=(0.45, 0.6), coat=0.12, tone_var=0.06,
           hue_var=0.01, grime=0.25, ring=0.005):
    """Lacquered wood veneer, grown rather than printed: growth rings are cylinders round the local `axis` (the trunk),
    `ring` metres apart, their phase pushed about by a noise that is stretched 40x along the grain, so a flat board shows
    irregular, wandering latewood streaks that merge and split (no regular stripe to alias into pinstripes); a slow
    figure and mineral streaks along the grain over that. Each board (object) gets its own ring centre, a value +-
    `tone_var` and a hue +- `hue_var`, so the planks separate. Roughness follows the grain; a faint grain and pore bump;
    a thin satin lacquer coat; darker where hands and dust reach into the corners (AO)."""
    m, nt, b = _new(name)
    r = _rand(nt)
    r2 = _math(nt, "FRACT", _math(nt, "ADD", _math(nt, "MULTIPLY", r, 7.31), 0.17))
    r3 = _math(nt, "FRACT", _math(nt, "ADD", _math(nt, "MULTIPLY", r, 13.7), 0.41))
    across = [k for k in "XYZ" if k != axis]
    off = _n(nt, "ShaderNodeCombineXYZ")             # the ring centre: within +-0.35 m across the board, anywhere along
    _link(nt, _maprange(nt, r2, 0.0, 1.0, -0.35, 0.35), off.inputs[across[0]])
    _link(nt, _maprange(nt, r3, 0.0, 1.0, -0.35, 0.35), off.inputs[across[1]])
    _link(nt, _math(nt, "MULTIPLY", r, 31.0), off.inputs[axis])
    v = _vadd(nt, _obj(nt), off.outputs["Vector"])
    stretch = _n(nt, "ShaderNodeVectorMath", operation="MULTIPLY")
    _link(nt, v, stretch.inputs[0])
    stretch.inputs[1].default_value = tuple(1 / 40.0 if k == axis else 1.0 for k in "XYZ")
    vs = stretch.outputs["Vector"]
    wave = _n(nt, "ShaderNodeTexWave", wave_type="RINGS", rings_direction=axis, wave_profile="SAW")
    wave.inputs["Scale"].default_value = 0.314 / ring
    wave.inputs["Distortion"].default_value = 7.5
    wave.inputs["Detail"].default_value = 4.0
    wave.inputs["Detail Scale"].default_value = 0.45
    wave.inputs["Detail Roughness"].default_value = 0.55
    _link(nt, vs, wave.inputs["Vector"])
    lines = _maprange(nt, _out(wave, "Fac"), 0.55, 1.0, 0.0, 1.0)     # narrow latewood lines, one soft edge
    fig = _maprange(nt, _noise(nt, vs, 4.0, 3.0, 0.55), 0.3, 0.7, -1.0, 1.0)     # slow figure across the leaf
    streak = _noise(nt, vs, 40.0, 2.0, 0.6)                                       # mineral streaks along the grain
    val = _math(nt, "SUBTRACT", 1.0, _math(nt, "MULTIPLY", lines, contrast))
    val = _math(nt, "ADD", val, _math(nt, "MULTIPLY", fig, 0.07))
    val = _math(nt, "ADD", val, _maprange(nt, streak, 0.35, 0.65, -0.04, 0.04))
    val = _math(nt, "MULTIPLY", val, _maprange(nt, r, 0.0, 1.0, 1.0 - tone_var, 1.0 + tone_var))
    gry = _n(nt, "ShaderNodeCombineColor")
    for s in ("Red", "Green", "Blue"):
        _link(nt, val, gry.inputs[s])
    col = _mix(nt, 1.0, base, gry.outputs[0], "MULTIPLY")
    hs = _n(nt, "ShaderNodeHueSaturation")
    _link(nt, _maprange(nt, r2, 0.0, 1.0, 0.5 - hue_var, 0.5 + hue_var), hs.inputs["Hue"])
    _link(nt, col, hs.inputs["Color"])
    col = hs.outputs["Color"]
    if grime:
        col = _mix(nt, _maprange(nt, _ao(nt, 0.25), 0.25, 1.0, grime, 0.0), col, tuple(c * 0.35 for c in base))
    _link(nt, col, b.inputs["Base Color"])
    rr = _maprange(nt, _noise(nt, v, 2.5, 4.0, 0.6), 0.3, 0.7, rough[0], rough[1])
    rr = _math(nt, "ADD", rr, _maprange(nt, lines, 0.0, 1.0, -0.1, 0.1), clamp=True)
    _link(nt, rr, b.inputs["Roughness"])
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = 0.3
    b.inputs["Specular IOR Level"].default_value = 0.4
    pores = _noise(nt, vs, 900.0, 2.0, 0.5)
    _bump(nt, b, _math(nt, "ADD", lines, _math(nt, "MULTIPLY", pores, 0.5)), 0.03, 0.0005)
    return m


def plaster(name, rgb=(0.2, 0.205, 0.21), rough=(0.78, 0.92), grime=0.3, bump=0.06):
    """Painted plaster: broad trowel and paint variation, a fine stipple bump, darker into the corners."""
    m, nt, b = _new(name)
    o = _world(nt)
    big = _noise(nt, o, 0.35, 4.0, 0.55)
    mid = _noise(nt, o, 2.2, 5.0, 0.6)
    col = _mix(nt, _maprange(nt, big, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.92 for c in rgb), tuple(min(1, c * 1.06) for c in rgb))
    col = _mix(nt, _maprange(nt, mid, 0.45, 0.75, 0.0, 0.35), col, tuple(c * 0.85 for c in rgb))
    if grime:
        col = _mix(nt, _maprange(nt, _ao(nt, 0.5), 0.3, 1.0, grime, 0.0), col, tuple(c * 0.4 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, mid, 0.3, 0.7, rough[0], rough[1]), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.35
    if bump:
        _bump(nt, b, _noise(nt, o, 160.0, 3.0, 0.6), bump, 0.0006)
    return m


def stone_floor(name, base=(0.075, 0.076, 0.078), tile=0.6, joint=0.002, walk=(), rough=(0.35, 0.55), ao=0.4):
    """Honed stone tiles (world XY, `tile` metres square): each tile a touch apart in tone, fine chips in the stone,
    the hone dulled along the walked lines (`walk`: rectangles x0, x1, y0, y1), grooved dark joints, and darkened by
    AO (`ao` of the way to a quarter of the base) where bench feet, plinths and the dock base meet it."""
    m, nt, b = _new(name)
    o = _world(nt)
    sc = _vscale(nt, o, 1.0 / tile)
    c1 = base
    c2 = tuple(c * 0.86 for c in base)
    col, j = _brick(nt, sc, 1.0, 1.0, joint / tile, c1, c2, tuple(c * 0.35 for c in base), smooth=0.1)
    chips = _noise(nt, o, 70.0, 2.0, 0.7)
    col = _mix(nt, _maprange(nt, chips, 0.6, 0.75, 0.0, 0.25), col, tuple(min(1, c * 1.7) for c in base))
    cloud = _noise(nt, o, 1.3, 5.0, 0.62)
    col = _mix(nt, _maprange(nt, cloud, 0.35, 0.7, 0.0, 0.5), col, tuple(c * 0.75 for c in base))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.3), 0.2, 1.0, ao, 0.0), col, tuple(c * 0.25 for c in base))
    _link(nt, col, b.inputs["Base Color"])
    rough = _maprange(nt, _noise(nt, o, 3.0, 4.0, 0.6), 0.3, 0.7, rough[0], rough[1])
    x, y, _ = _xyz(nt, o)
    for (x0, x1, y0, y1) in walk:
        inx = _math(nt, "MULTIPLY", _math(nt, "GREATER_THAN", x, x0), _math(nt, "LESS_THAN", x, x1))
        iny = _math(nt, "MULTIPLY", _math(nt, "GREATER_THAN", y, y0), _math(nt, "LESS_THAN", y, y1))
        rough = _math(nt, "ADD", rough, _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", inx, iny),
                                               _maprange(nt, _noise(nt, o, 4.0, 3.0, 0.6), 0.3, 0.7, 0.04, 0.14)))
    rough = _math(nt, "ADD", rough, _math(nt, "MULTIPLY", j, 0.4), clamp=True)
    _link(nt, rough, b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.5
    _bump(nt, b, _math(nt, "MULTIPLY", j, -1.0), 0.35, 0.002)
    return m


def refabric(m, rgb, rough=0.9, sheen=0.15, weave=600.0, strength=0.05):
    """Turn a MakeHuman garment material into matt woven cotton in place (for the prison clothes): the printed texture
    and its alpha dropped, a flat colour with a slow mottle, a fine plain-weave bump (two crossed thread noises) on top
    of the garment's own normal map (its folds and seams stay), roughness `rough`, a little dark sheen at grazing
    angles, almost no specular."""
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    for s in ("Base Color", "Alpha", "Roughness"):
        for l in list(b.inputs[s].links):
            nt.links.remove(l)
    b.inputs["Alpha"].default_value = 1.0
    o = _obj(nt)
    col = _mix(nt, _maprange(nt, _noise(nt, o, 5.0, 3.0, 0.55), 0.3, 0.7, 0.0, 1.0), tuple(c * 0.9 for c in rgb),
               tuple(c * 1.1 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = 0.0
    b.inputs["Specular IOR Level"].default_value = 0.2
    b.inputs["Coat Weight"].default_value = 0.0
    b.inputs["Sheen Weight"].default_value = sheen
    b.inputs["Sheen Roughness"].default_value = 0.5
    b.inputs["Sheen Tint"].default_value = (*[min(1.0, c * 3) for c in rgb], 1)
    warp = _noise(nt, o, 1.0, 1.0, 0.5, mapping=(weave, weave * 0.06, weave * 0.06))
    weft = _noise(nt, o, 1.0, 1.0, 0.5, mapping=(weave * 0.06, weave * 0.06, weave))
    old = b.inputs["Normal"].links[0].from_socket if b.inputs["Normal"].links else None
    _bump(nt, b, _math(nt, "ADD", warp, weft), strength, 0.0004, extra=old)
    return m


def felt(name, rgb=(0.05, 0.052, 0.056)):
    """Fabric-wrapped acoustic panel: fine fleck, matt, a faint slow shade."""
    m, nt, b = _new(name)
    o = _world(nt)
    fl = _noise(nt, o, 300.0, 2.0, 0.7)
    col = _mix(nt, _maprange(nt, fl, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.85 for c in rgb), tuple(c * 1.15 for c in rgb))
    col = _mix(nt, _maprange(nt, _noise(nt, o, 0.7, 3.0, 0.5), 0.3, 0.7, 0.0, 0.4), col, tuple(c * 0.8 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.95
    b.inputs["Specular IOR Level"].default_value = 0.15
    b.inputs["Sheen Weight"].default_value = 0.3
    b.inputs["Sheen Roughness"].default_value = 0.5
    _bump(nt, b, fl, 0.15, 0.0008)
    return m


def carpet(name, base=(0.032, 0.036, 0.046)):
    """Cut-pile carpet: dense fine fleck, slow shade variation, sheen at grazing angles."""
    m, nt, b = _new(name)
    o = _world(nt)
    fleck = _noise(nt, o, 420.0, 2.0, 0.7)
    col = _mix(nt, _maprange(nt, fleck, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.75 for c in base), tuple(c * 1.25 for c in base))
    col = _mix(nt, _maprange(nt, _noise(nt, o, 0.8, 3.0, 0.5), 0.3, 0.7, 0.0, 0.5), col, tuple(c * 0.8 for c in base))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.95
    b.inputs["Sheen Weight"].default_value = 0.5
    b.inputs["Sheen Roughness"].default_value = 0.4
    b.inputs["Specular IOR Level"].default_value = 0.2
    _bump(nt, b, fleck, 0.25, 0.001)
    return m


def satin(name, rgb, rough=(0.35, 0.5), metal=0.0, bump=0.0, grime=0.0, spec=0.5):
    """A principled surface with tone and roughness variation (painted metal, solid surface, plastic)."""
    m, nt, b = _new(name)
    o = _obj(nt)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Specular IOR Level"].default_value = spec
    _link(nt, _maprange(nt, _noise(nt, o, 6.0, 4.0, 0.6), 0.3, 0.7, rough[0], rough[1]), b.inputs["Roughness"])
    col = _mix(nt, _maprange(nt, _noise(nt, o, 2.5, 4.0, 0.6), 0.3, 0.7, 0.0, 1.0), tuple(c * 0.9 for c in rgb),
               tuple(min(1, c * 1.08) for c in rgb))
    if grime:
        col = _mix(nt, _maprange(nt, _ao(nt, 0.2), 0.3, 1.0, grime, 0.0), col, tuple(c * 0.4 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    if bump:
        _bump(nt, b, _noise(nt, o, 180.0, 3.0, 0.6), bump, 0.0005)
    return m


def dark_metal(name, rgb=(0.05, 0.045, 0.04), rough=(0.32, 0.5)):
    """Satin bronze-black hardware: a dark oxidised finish polished a little where hands touch."""
    m, nt, b = _new(name)
    o = _obj(nt)
    b.inputs["Metallic"].default_value = 0.9
    wear = _maprange(nt, _noise(nt, o, 30.0, 4.0, 0.6), 0.55, 0.75, 0.0, 1.0)
    _link(nt, _mix(nt, wear, rgb, (0.2, 0.16, 0.11)), b.inputs["Base Color"])
    _link(nt, _maprange(nt, wear, 0.0, 1.0, rough[1], rough[0]), b.inputs["Roughness"])
    return m


def blank_panel(name, rgb=(0.2, 0.2, 0.205)):
    """A plain matt panel, faintly mottled like honed limestone: carries nothing."""
    m, nt, b = _new(name)
    o = _obj(nt)
    col = _mix(nt, _maprange(nt, _noise(nt, o, 3.0, 5.0, 0.6), 0.3, 0.7, 0.0, 1.0), tuple(c * 0.93 for c in rgb),
               tuple(min(1, c * 1.06) for c in rgb))
    col = _mix(nt, _maprange(nt, _noise(nt, o, 60.0, 2.0, 0.7), 0.62, 0.75, 0.0, 0.3), col, tuple(c * 0.8 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, _noise(nt, o, 8.0, 3.0, 0.6), 0.3, 0.7, 0.55, 0.7), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.35
    return m


def glass(name, tint=(0.82, 0.86, 0.88)):
    """Clear glass, thin: lets light through, reflects the room by Fresnel."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = (*tint, 1)
    gl = _n(nt, "ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.03
    lw = _n(nt, "ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.1
    mx = _n(nt, "ShaderNodeMixShader")
    _link(nt, _math(nt, "ADD", _out(lw, "Fresnel"), 0.05, clamp=True), mx.inputs[0])
    _link(nt, tr.outputs[0], mx.inputs[1])
    _link(nt, gl.outputs[0], mx.inputs[2])
    _link(nt, mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


# ---------------------------------------------------------------- emitters
def glow(name, rgb, strength, falloff=0.0, axes=("X", "Z")):
    """An emitter. With `falloff` brightest in the middle, dimmer to its edges (generated coordinates over `axes`)."""
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
        _link(nt, _maprange(nt, acc, 0.0, 0.5, strength, strength * (1 - falloff)), em.inputs["Strength"])
    else:
        em.inputs["Strength"].default_value = strength
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def opal(name, rgb, strength, off_rgb=(0.3, 0.31, 0.32)):
    """A lay-in light panel's opal diffuser: brighter toward the middle, a faint prismatic texture; with strength 0
    an unlit diffuser (pale satin plastic)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*off_rgb, 1)
    b.inputs["Roughness"].default_value = 0.4
    if strength > 0:
        g = _n(nt, "ShaderNodeTexCoord").outputs["Generated"]
        gx, gy, _ = _xyz(nt, g)
        dx = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", gx, 0.5))
        dy = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", gy, 0.5))
        d = _math(nt, "MAXIMUM", dx, dy)
        s = _maprange(nt, d, 0.3, 0.5, strength, strength * 0.72)
        b.inputs["Emission Color"].default_value = (*rgb, 1)
        _link(nt, s, b.inputs["Emission Strength"])
    m.cycles.emission_sampling = "NONE"
    return m


def frosted(name, rgb, strength, top_gain=0.35):
    """Frosted (acid-etched) window glass with overcast daylight behind it: a soft vertical gradient (brighter up
    toward the sky), a faint cloud, and the glass's own sheen so it is not a flat sticker."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.25, 0.27, 0.29, 1)
    b.inputs["Roughness"].default_value = 0.35
    g = _n(nt, "ShaderNodeTexCoord").outputs["Generated"]
    _, _, gz = _xyz(nt, g)
    o = _obj(nt)
    cloud = _maprange(nt, _noise(nt, o, 1.6, 4.0, 0.55), 0.3, 0.7, 0.88, 1.08)
    s = _math(nt, "MULTIPLY", _maprange(nt, gz, 0.0, 1.0, strength * (1 - top_gain), strength), cloud)
    b.inputs["Emission Color"].default_value = (*rgb, 1)
    _link(nt, s, b.inputs["Emission Strength"])
    m.cycles.emission_sampling = "NONE"
    return m
