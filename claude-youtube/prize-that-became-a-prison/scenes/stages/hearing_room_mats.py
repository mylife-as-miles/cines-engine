"""Materials for the hearing room (Cycles, Principled BSDF). Patterns work in object space, in metres; nothing reads
as one flat value (tone and roughness always vary).

    veneer      dark lacquered walnut for the dais, the wainscot and the doors (from courtroom_mats, copied)
    plaster     painted plaster walls and ceiling (copied)
    satin / dark_metal / blank_panel / glow   (copied)
    carpet      the room's cut-pile carpet: a small woven lattice, fleck, sheen, walked paths
    felt        the witness table's cloth: dense wool felt, a fine nap, no pattern
    velour      the drape behind the dais: pile velour, strong grazing sheen, slow shading
    upholstery  the public chairs' woven fabric: a visible weave, seams darker
    leather     the witness chair: matt hide with a fine grain, polished at the edges
    paper       matt uncoated paper, slightly warm
    glass / water   a tumbler and the water in it
Node helpers copied from courtroom_mats.py (which copied departure_gate_mats.py).
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
def veneer(name, base=(0.40, 0.30, 0.19), axis="Z", contrast=0.24, rough=(0.3, 0.44), coat=0.35, tone_var=0.07,
           grime=0.25, coat_rough=0.22):
    """Lacquered wood veneer. Straight grain runs along local `axis` (fine streaks plus a soft wavy figure across the
    leaf), pores as a faint bump, a satin lacquer coat, each object a shade apart and its grain offset, darker where
    hands and dust reach into the corners (AO)."""
    m, nt, b = _new(name)
    r = _rand(nt)
    off = _n(nt, "ShaderNodeCombineXYZ")
    for k, s in zip("XYZ", (17.3, 9.1, 23.7)):
        _link(nt, _math(nt, "MULTIPLY", r, s), off.inputs[k])
    v = _vadd(nt, _obj(nt), off.outputs["Vector"])
    along = {"X": (1.2, 110.0, 110.0), "Y": (110.0, 1.2, 110.0), "Z": (110.0, 110.0, 1.2)}[axis]
    fine = _noise(nt, v, 1.0, 6.0, 0.62, mapping=along)                  # the fine grain streaks
    along2 = {"X": (0.25, 6.0, 6.0), "Y": (6.0, 0.25, 6.0), "Z": (6.0, 6.0, 0.25)}[axis]
    broad = _noise(nt, v, 1.0, 3.0, 0.55, mapping=along2)                # broad growth bands
    wave = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction={"X": "Y", "Y": "X", "Z": "X"}[axis])
    wave.inputs["Scale"].default_value = 9.0          # straight rift-sawn grain lines ~35 mm apart, gently wavering
    wave.inputs["Distortion"].default_value = 0.9
    wave.inputs["Detail"].default_value = 2.0
    wave.inputs["Detail Scale"].default_value = 0.6
    _link(nt, v, wave.inputs["Vector"])
    fig = _out(wave, "Color")
    figf = _n(nt, "ShaderNodeRGBToBW")
    _link(nt, fig, figf.inputs["Color"])
    g = _math(nt, "ADD", _math(nt, "MULTIPLY", fine, 0.5), _math(nt, "MULTIPLY", broad, 0.35))
    g = _math(nt, "ADD", g, _math(nt, "MULTIPLY", figf.outputs[0], 0.15))
    k = _maprange(nt, g, 0.32, 0.68, 0.0, 1.0)
    dark = tuple(c * (1 - contrast) for c in base)
    lite = tuple(min(1.0, c * (1 + contrast * 0.45)) for c in base)
    col = _mix(nt, k, dark, lite)
    # each leaf a shade apart (per object), and slowly varying across the leaf
    shade = _maprange(nt, r, 0.0, 1.0, 1.0 - tone_var, 1.0 + tone_var)
    gry = _n(nt, "ShaderNodeCombineColor")
    for s in ("Red", "Green", "Blue"):
        _link(nt, shade, gry.inputs[s])
    col = _mix(nt, 1.0, col, gry.outputs[0], "MULTIPLY")
    if grime:
        col = _mix(nt, _maprange(nt, _ao(nt, 0.25), 0.25, 1.0, grime, 0.0), col, tuple(c * 0.35 for c in base))
    _link(nt, col, b.inputs["Base Color"])
    rr = _maprange(nt, _noise(nt, v, 2.5, 4.0, 0.6), 0.3, 0.7, rough[0], rough[1])
    rr = _math(nt, "ADD", rr, _maprange(nt, fine, 0.3, 0.7, -0.03, 0.03))
    _link(nt, rr, b.inputs["Roughness"])
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = coat_rough
    b.inputs["Specular IOR Level"].default_value = 0.42
    pores = _noise(nt, v, 1.0, 2.0, 0.5, mapping=tuple(s * 3.0 for s in along))
    _bump(nt, b, _math(nt, "ADD", pores, _math(nt, "MULTIPLY", fine, 0.6)), 0.05, 0.0005)
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


def carpet(name, base=(0.03, 0.034, 0.046), lattice=0.09, walk=()):
    """Cut-pile carpet with a small woven lattice (a darker diamond line every `lattice` m), dense fleck, slow shade
    variation, sheen at grazing angles; the pile flattened (a touch smoother and lighter) along walked paths."""
    m, nt, b = _new(name)
    o = _world(nt)
    fleck = _noise(nt, o, 420.0, 2.0, 0.7)
    col = _mix(nt, _maprange(nt, fleck, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.75 for c in base), tuple(c * 1.25 for c in base))
    # the lattice: two diagonal line sets
    x, y, _ = _xyz(nt, o)
    acc = None
    for s in (1.0, -1.0):
        d = _math(nt, "ADD", x, _math(nt, "MULTIPLY", y, s))
        f = _math(nt, "FRACT", _math(nt, "DIVIDE", d, lattice))
        line = _maprange(nt, _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", f, 0.5)), 0.43, 0.5, 0.0, 1.0)
        acc = line if acc is None else _math(nt, "MAXIMUM", acc, line)
    col = _mix(nt, _math(nt, "MULTIPLY", acc, 0.55), col, tuple(c * 0.55 for c in base))
    col = _mix(nt, _maprange(nt, _noise(nt, o, 0.6, 3.0, 0.5), 0.3, 0.7, 0.0, 0.45), col, tuple(c * 0.8 for c in base))
    rough = 0.95
    for (x0, x1, y0, y1) in walk:
        inx = _math(nt, "MULTIPLY", _math(nt, "GREATER_THAN", x, x0), _math(nt, "LESS_THAN", x, x1))
        iny = _math(nt, "MULTIPLY", _math(nt, "GREATER_THAN", y, y0), _math(nt, "LESS_THAN", y, y1))
        w = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", inx, iny), _maprange(nt, _noise(nt, o, 3.0, 3.0, 0.6), 0.3, 0.7, 0.2, 0.6))
        col = _mix(nt, w, col, tuple(min(1, c * 1.25) for c in base))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Sheen Weight"].default_value = 0.6
    b.inputs["Sheen Roughness"].default_value = 0.35
    b.inputs["Specular IOR Level"].default_value = 0.2
    _bump(nt, b, _math(nt, "ADD", fleck, _math(nt, "MULTIPLY", acc, -0.8)), 0.3, 0.0012)
    return m


def felt(name, rgb=(0.02, 0.026, 0.045), nap=0.3):
    """Dense wool felt (the witness table's cloth): matt, a fine fuzzy nap (cellular fibre clumps plus fine noise)
    whose pale sheen catches light at grazing angles, faint clouding in the dye, darker where it folds into the
    shadow (AO). Kept low in saturation so the grade does not leave a flat saturated blue sheet."""
    m, nt, b = _new(name)
    o = _obj(nt)
    fuzz = _noise(nt, o, 900.0, 3.0, 0.7)
    vor = _n(nt, "ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 800.0
    _link(nt, o, vor.inputs["Vector"])
    clump = _out(vor, "Distance")
    cloud = _noise(nt, o, 3.5, 4.0, 0.6)
    col = _mix(nt, _maprange(nt, cloud, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.84 for c in rgb), tuple(min(1, c * 1.14) for c in rgb))
    col = _mix(nt, _maprange(nt, fuzz, 0.4, 0.8, 0.0, 0.35), col, tuple(min(1, c * 1.5) for c in rgb))
    col = _mix(nt, _maprange(nt, clump, 0.0, 0.6, 0.25, 0.0), col, tuple(c * 0.7 for c in rgb))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.08), 0.3, 1.0, 0.5, 0.0), col, tuple(c * 0.4 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, cloud, 0.3, 0.7, 0.88, 0.97), b.inputs["Roughness"])
    b.inputs["Sheen Weight"].default_value = nap
    b.inputs["Sheen Roughness"].default_value = 0.45
    b.inputs["Sheen Tint"].default_value = (0.72, 0.78, 0.9, 1.0)
    b.inputs["Specular IOR Level"].default_value = 0.12
    _bump(nt, b, _math(nt, "ADD", _math(nt, "MULTIPLY", clump, 0.6), fuzz), 0.08, 0.0004)
    return m


def velour(name, rgb=(0.03, 0.036, 0.06)):
    """Pile velour for the drape: deep and matt face-on, a strong sheen where the folds turn away, slow shading
    along the drop, a faint vertical crush in the pile."""
    m, nt, b = _new(name)
    o = _obj(nt)
    crush = _noise(nt, o, 1.0, 4.0, 0.6, mapping=(18.0, 18.0, 1.2))
    col = _mix(nt, _maprange(nt, crush, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.8 for c in rgb), tuple(min(1, c * 1.18) for c in rgb))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.12), 0.3, 1.0, 0.6, 0.0), col, tuple(c * 0.35 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.92
    # a broad, soft sheen (a tight one drew single-pixel bright lines on the pleat crests under the washer)
    b.inputs["Sheen Weight"].default_value = 0.8
    b.inputs["Sheen Roughness"].default_value = 0.55
    b.inputs["Sheen Tint"].default_value = (0.7, 0.75, 0.95, 1.0)
    b.inputs["Specular IOR Level"].default_value = 0.08
    _bump(nt, b, _noise(nt, o, 600.0, 2.0, 0.6), 0.1, 0.0004)
    return m


def upholstery(name, rgb=(0.05, 0.055, 0.07), weave=520.0):
    """Woven upholstery: a visible basket weave (two crossed wave sets), slub in the yarn, sheen, worn lighter on
    the front edge of seats (object noise), darker into seams (AO)."""
    m, nt, b = _new(name)
    o = _obj(nt)
    w1 = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="X")
    w2 = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="Z")
    for w in (w1, w2):
        w.inputs["Scale"].default_value = weave
        w.inputs["Distortion"].default_value = 0.3
        _link(nt, o, w.inputs["Vector"])
    wv = _math(nt, "MULTIPLY", _out(w1, "Fac"), _out(w2, "Fac"))
    slub = _noise(nt, o, 1.0, 3.0, 0.6, mapping=(40.0, 400.0, 40.0))
    col = _mix(nt, _maprange(nt, wv, 0.0, 1.0, 0.0, 1.0), tuple(c * 0.8 for c in rgb), tuple(min(1, c * 1.2) for c in rgb))
    col = _mix(nt, _maprange(nt, slub, 0.4, 0.8, 0.0, 0.3), col, tuple(min(1, c * 1.35) for c in rgb))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.05), 0.3, 1.0, 0.55, 0.0), col, tuple(c * 0.4 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.88
    b.inputs["Sheen Weight"].default_value = 0.45
    b.inputs["Sheen Roughness"].default_value = 0.45
    b.inputs["Specular IOR Level"].default_value = 0.2
    _bump(nt, b, wv, 0.25, 0.0005)
    return m


def leather(name, rgb=(0.03, 0.028, 0.028), rough=(0.42, 0.6)):
    """Matt hide: a fine pebble grain, creases, a little more polish where it is handled, a dark seam line into the
    corners (AO)."""
    m, nt, b = _new(name)
    o = _obj(nt)
    grain = _n(nt, "ShaderNodeTexVoronoi")
    grain.inputs["Scale"].default_value = 260.0
    _link(nt, o, grain.inputs["Vector"])
    gd = _out(grain, "Distance")
    crease = _noise(nt, o, 40.0, 5.0, 0.65)
    col = _mix(nt, _maprange(nt, _noise(nt, o, 3.0, 4.0, 0.6), 0.3, 0.7, 0.0, 1.0), tuple(c * 0.85 for c in rgb),
               tuple(min(1, c * 1.2) for c in rgb))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.04), 0.3, 1.0, 0.5, 0.0), col, tuple(c * 0.4 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, crease, 0.3, 0.7, rough[0], rough[1]), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.45
    b.inputs["Coat Weight"].default_value = 0.08
    _bump(nt, b, _math(nt, "ADD", gd, _math(nt, "MULTIPLY", crease, 0.4)), 0.18, 0.0006)
    return m


def paper(name, rgb=(0.78, 0.76, 0.7), rough=0.85, fibre=0.05):
    """Matt uncoated paper, slightly warm: felted fibre tooth (bump), faint mottling, a little translucency."""
    m, nt, b = _new(name)
    o = _obj(nt)
    mott = _noise(nt, o, 30.0, 4.0, 0.6)
    fib = _noise(nt, o, 1.0, 3.0, 0.6, mapping=(220.0, 700.0, 220.0))
    col = _mix(nt, _maprange(nt, mott, 0.3, 0.7, 0.0, 0.08), rgb, tuple(c * 0.86 for c in rgb))
    col = _mix(nt, _maprange(nt, fib, 0.35, 0.75, 0.0, 0.06), col, tuple(c * 0.9 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _math(nt, "ADD", rough, _maprange(nt, mott, 0.3, 0.7, -0.04, 0.04), clamp=True), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.32
    b.inputs["Sheen Weight"].default_value = 0.12
    b.inputs["Sheen Roughness"].default_value = 0.6
    b.inputs["Subsurface Weight"].default_value = 0.06
    b.inputs["Subsurface Radius"].default_value = (0.0015, 0.0012, 0.0009)
    b.inputs["Subsurface Scale"].default_value = 1.0
    tooth = _noise(nt, o, 1400.0, 3.0, 0.65)
    _bump(nt, b, _math(nt, "ADD", _math(nt, "MULTIPLY", fib, 0.5), tooth), fibre, 0.0003)
    return m


def glass(name, ior=1.5, rough=0.02, tint=(0.95, 0.97, 0.98)):
    """Real glass (refractive) for a tumbler: thin walls, a faint green-grey tint."""
    m, nt, b = _new(name)
    b.inputs["Base Color"].default_value = (*tint, 1)
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["IOR"].default_value = ior
    b.inputs["Roughness"].default_value = rough
    return m


def water(name):
    return glass(name, ior=1.333, rough=0.0, tint=(0.93, 0.96, 0.98))


def lens(name, rgb, strength, off_rgb=(0.02, 0.022, 0.02)):
    """A small indicator lens: a glossy dark dome, lit from inside when `strength` > 0."""
    m, nt, b = _new(name)
    b.inputs["Base Color"].default_value = (*off_rgb, 1)
    b.inputs["Roughness"].default_value = 0.12
    b.inputs["Coat Weight"].default_value = 0.6
    if strength > 0:
        b.inputs["Emission Color"].default_value = (*rgb, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m
