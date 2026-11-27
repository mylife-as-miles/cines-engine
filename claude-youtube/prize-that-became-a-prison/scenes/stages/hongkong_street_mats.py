"""Materials for the Hong Kong street at night (Cycles, Principled BSDF). Patterns run in world or object space, in
metres, so a part keeps its pattern wherever it is put, and no surface is one flat value (tone and roughness vary).

Wet asphalt with puddles in the gutters and the rail grooves; wet concrete pavers; granite kerbs; tram-rail steel;
worn road paint; facades that take their colour per face (painted render and small mosaic tile, rain streaks, soot at
the foot); window glass that glows per face when a room is lit (curtained, warm or cool); anodised frames; enamelled
air-conditioner cases; painted steel; roller shutters; lightbox faces and neon tubes that take their colour and
brightness per face (blank: no characters, only a soft field and a frame); shop interiors; laundry cloth; cable
rubber; the paper shopping bags; shop-window glass that reflects without blocking light (transparent plus a Fresnel
glossy layer, so the display lights still reach the pavement).
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


def _link(nt, a, b):
    nt.links.new(a, b)


def _val(nt, v):
    n = _n(nt, "ShaderNodeValue")
    n.outputs[0].default_value = v
    return n.outputs[0]


def _maprange(nt, src, a, b, c, d, smooth=False):
    n = _n(nt, "ShaderNodeMapRange")
    if smooth:
        n.interpolation_type = "SMOOTHSTEP"
    n.inputs["From Min"].default_value, n.inputs["From Max"].default_value = a, b
    n.inputs["To Min"].default_value, n.inputs["To Max"].default_value = c, d
    _link(nt, src, n.inputs["Value"])
    return n.outputs["Result"]


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
        if sock == "Factor":
            s = [i for i in n.inputs if i.name == "Factor" and i.type == "VALUE"][0]
        else:
            s = [i for i in n.inputs if i.name == sock and i.type == "RGBA"][0]
        if isinstance(v, (int, float)):
            s.default_value = v
        elif isinstance(v, tuple):
            s.default_value = (*v[:3], 1.0)
        else:
            _link(nt, v, s)
    return [o for o in n.outputs if o.type == "RGBA"][0]


def _fmix(nt, fac, a, b):
    n = _n(nt, "ShaderNodeMix", data_type="FLOAT")
    socks = [i for i in n.inputs if i.type == "VALUE"]
    for s, v in zip(socks[:3], (fac, a, b)):
        if isinstance(v, (int, float)):
            s.default_value = v
        else:
            _link(nt, v, s)
    return [o for o in n.outputs if o.type == "VALUE"][0]


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


def _attr(nt, name, kind="GEOMETRY"):
    a = _n(nt, "ShaderNodeAttribute")
    a.attribute_type = kind
    a.attribute_name = name
    return a


def _ao(nt, distance=0.35):
    n = _n(nt, "ShaderNodeAmbientOcclusion", samples=4)
    n.inputs["Distance"].default_value = distance
    return n.outputs["AO"]


def _emit_out(m, nt, shader):
    out = nt.nodes["Material Output"]
    _link(nt, shader, out.inputs["Surface"])


# ---------------------------------------------------------------- general
def pbr(name, rgb, rough=(0.4, 0.55), metal=0.0, nscale=4.0, stretch=(1, 1, 1), cvar=0.1, bump=0.0, bscale=90.0,
        grime=0.0, spec=0.5, world=False):
    """A principled surface with tone and roughness variation; `grime` darkens it into contact corners (AO)."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Specular IOR Level"].default_value = spec
    o = _world(nt) if world else _obj(nt)
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
    return m


def emit(name, rgb, strength, sampling="AUTO"):
    """A plain emitter that lights what is near it."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    em.inputs["Strength"].default_value = strength
    _emit_out(m, nt, em.outputs[0])
    m.cycles.emission_sampling = sampling
    return m


def _attr_emitter(name, col_attr, str_attr, gain=1.0, base_rgb=(0.05, 0.05, 0.05), panel=True, sampling="AUTO",
                  hotspot=0.0):
    """Emission whose colour and strength come from face attributes; under it a matt acrylic panel (so an unlit face
    reads as a faded plastic sign, not a hole). `hotspot` brightens toward the middle of each face (tubes behind
    the diffuser), via the generated UV the builder writes."""
    m, nt, b = _new(name)
    ca = _attr(nt, col_attr)
    sa = _attr(nt, str_attr)
    b.inputs["Roughness"].default_value = 0.42
    b.inputs["Specular IOR Level"].default_value = 0.35
    bc = _mix(nt, 0.15 if hotspot else 0.55, ca.outputs["Color"], base_rgb)
    _link(nt, bc, b.inputs["Base Color"])
    strength = _math(nt, "MULTIPLY", sa.outputs["Factor"], gain)
    if hotspot:
        uv = _attr(nt, "suv").outputs["Vector"]
        u, v, _ = _xyz(nt, uv)
        du = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", u, 0.5))
        dv = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", v, 0.5))
        edge = _math(nt, "MAXIMUM", du, dv)
        fall = _maprange(nt, edge, 0.2, 0.5, 1.0, 1.0 - hotspot, smooth=True)
        # faint banding of the tubes behind the acrylic, running along the face's long side
        w = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="Y")
        w.inputs["Scale"].default_value = 3.0
        _link(nt, uv, w.inputs["Vector"])
        band = _maprange(nt, w.outputs["Factor"], 0.0, 1.0, 0.94, 1.0)
        strength = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", strength, fall), band)
    _link(nt, ca.outputs["Color"], b.inputs["Emission Color"])
    _link(nt, strength, b.inputs["Emission Strength"])
    m.cycles.emission_sampling = sampling
    return m


# ---------------------------------------------------------------- ground
def asphalt(name="asphalt wet"):
    """Old asphalt after rain: dark, fine aggregate, polished tyre lanes, patched; wet all over (half-rough sheen that
    stretches every light into a long streak), standing water along the gutters, in the rail grooves and in the
    shallow ruts, mirror-flat with a damp rim."""
    m, nt, b = _new(name)
    o = _world(nt)
    x, y, z = _xyz(nt, o)
    ax = _math(nt, "ABSOLUTE", x)
    mott = _maprange(nt, _noise(nt, o, 3.0, 5.0, 0.6), 0.3, 0.7, 0.0, 1.0)
    base = _mix(nt, mott, (0.028, 0.028, 0.03), (0.05, 0.049, 0.048))
    speck = _maprange(nt, _noise(nt, o, 260.0, 2.0, 0.5), 0.62, 0.75, 0.0, 1.0)
    base = _mix(nt, _math(nt, "MULTIPLY", speck, 0.5), base, (0.1, 0.1, 0.1))
    # patches: rectangular-ish darker newer asphalt (voronoi cells, few)
    vor = _n(nt, "ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 0.09
    mp = _n(nt, "ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.6, 0.35, 1.0)
    _link(nt, o, mp.inputs["Vector"])
    _link(nt, mp.outputs["Vector"], vor.inputs["Vector"])
    patch = _maprange(nt, vor.outputs["Color"], 0.0, 1.0, 0.0, 1.0)
    patch = _maprange(nt, _math(nt, "MULTIPLY", patch, 1.0), 0.82, 0.84, 0.0, 1.0)
    base = _mix(nt, _math(nt, "MULTIPLY", patch, 0.7), base, (0.022, 0.022, 0.024))
    # puddle field: gutters (|x| near the kerb), the rail grooves, ruts along the lanes, all broken by noise
    field = _maprange(nt, _noise(nt, o, 0.35, 3.0, 0.55, mapping=(1.0, 0.3, 1.0)), 0.3, 0.7, 0.0, 1.0)
    gutter = _maprange(nt, ax, 3.95, 4.55, 0.0, 0.55, smooth=True)
    rails = 0.0
    for rx in (-1.7835, -0.7165, 0.7165, 1.7835):
        d = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", x, rx))
        r = _maprange(nt, d, 0.02, 0.09, 0.28, 0.0, smooth=True)
        rails = r if isinstance(rails, float) else _math(nt, "MAXIMUM", rails, r)
    ruts = 0.0
    for rx in (-3.95, -2.65, 2.65, 3.95):
        d = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", x, rx))
        r = _maprange(nt, d, 0.1, 0.45, 0.16, 0.0, smooth=True)
        ruts = r if isinstance(ruts, float) else _math(nt, "MAXIMUM", ruts, r)
    f2 = _math(nt, "ADD", _math(nt, "ADD", _math(nt, "MULTIPLY", field, 0.62), gutter), _math(nt, "ADD", rails, ruts))
    wet = _maprange(nt, f2, 0.53, 0.59, 0.0, 1.0, smooth=True)
    damp = _maprange(nt, f2, 0.34, 0.55, 0.0, 1.0, smooth=True)
    col = _mix(nt, _math(nt, "MULTIPLY", damp, 0.35), base, (0.022, 0.022, 0.024))
    col = _mix(nt, wet, col, (0.012, 0.012, 0.014))
    _link(nt, col, b.inputs["Base Color"])
    # roughness: wet sheen everywhere, polished along the tyre lines, puddles mirror-flat
    lanes = _maprange(nt, _noise(nt, o, 1.2, 3.0, 0.6, mapping=(1.0, 0.06, 1.0)), 0.3, 0.7, 0.0, 1.0)
    # (wetter after pv2: the signs' colours must streak down the road, the street's signature)
    r = _maprange(nt, _noise(nt, o, 2.2, 4.0, 0.6), 0.3, 0.7, 0.15, 0.3)
    r = _fmix(nt, _math(nt, "MULTIPLY", lanes, 0.5), r, 0.1)
    r = _fmix(nt, damp, r, 0.06)
    r = _fmix(nt, wet, r, _maprange(nt, _noise(nt, o, 14, 2, 0.55), 0.3, 0.7, 0.04, 0.12))
    _link(nt, r, b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.55
    agg = _math(nt, "ADD", _math(nt, "MULTIPLY", _noise(nt, o, 140.0, 3.0, 0.6), 0.7), _noise(nt, o, 18.0, 2.0, 0.5))
    h = _math(nt, "MULTIPLY", agg, _math(nt, "SUBTRACT", 1.0, wet))
    rip = _math(nt, "MULTIPLY", _noise(nt, o, 9.0, 1.0, 0.5), _math(nt, "MULTIPLY", wet, 0.05))
    _bump(nt, b, _math(nt, "ADD", h, rip), 0.18, 0.0015)
    return m


def pavers(name="pavers wet"):
    """The pavement: 300 mm grey concrete slabs, a few of them a shade warmer or darker (relaid), dark joints, a wet
    sheen, standing water in sunken slabs, grime toward the shopfronts and gum spots."""
    m, nt, b = _new(name)
    o = _world(nt)
    x, y, z = _xyz(nt, o)
    br = _n(nt, "ShaderNodeTexBrick", offset=0.0, squash=1.0)
    br.inputs["Scale"].default_value = 1.0 / 0.3
    br.inputs["Mortar Size"].default_value = 0.012
    br.inputs["Mortar Smooth"].default_value = 0.3
    br.inputs["Brick Width"].default_value = 1.0
    br.inputs["Row Height"].default_value = 1.0
    br.inputs["Color1"].default_value = (0.0, 0.0, 0.0, 1)
    br.inputs["Color2"].default_value = (1.0, 1.0, 1.0, 1)
    br.inputs["Mortar"].default_value = (0.0, 0.0, 0.0, 1)
    br.inputs["Bias"].default_value = 0.0
    _link(nt, o, br.inputs["Vector"])
    tone = br.outputs["Color"]                          # per-slab random grey (color1..color2)
    joint = _math(nt, "SUBTRACT", 1.0, br.outputs["Factor"])
    t = _maprange(nt, _n(nt, "ShaderNodeRGBToBW").outputs[0], 0.0, 1.0, 0.0, 1.0)
    bw = nt.nodes[-2]
    _link(nt, tone, bw.inputs["Color"])
    base = _mix(nt, t, (0.085, 0.084, 0.082), (0.13, 0.126, 0.12))
    odd = _maprange(nt, t, 0.9, 0.93, 0.0, 1.0)
    base = _mix(nt, odd, base, (0.12, 0.1, 0.085))
    mott = _maprange(nt, _noise(nt, o, 9.0, 4.0, 0.6), 0.3, 0.7, 0.85, 1.1)
    base = _mix(nt, 1.0, base, _n(nt, "ShaderNodeCombineColor").outputs[0], blend="MULTIPLY")
    cc = nt.nodes[-2]
    for s in ("Red", "Green", "Blue"):
        _link(nt, mott, cc.inputs[s])
    # grime toward the shopfronts (|x| near 6.5) and a darker band along the kerb
    ax = _math(nt, "ABSOLUTE", x)
    near = _maprange(nt, ax, 6.3, 7.15, 0.0, 0.55, smooth=True)
    base = _mix(nt, near, base, (0.05, 0.048, 0.045))
    gum = _maprange(nt, _noise(nt, o, 30.0, 1.0, 0.5), 0.74, 0.78, 0.0, 0.7)
    base = _mix(nt, gum, base, (0.04, 0.04, 0.04))
    wetf = _maprange(nt, _noise(nt, o, 0.7, 2.0, 0.5), 0.35, 0.65, 0.0, 1.0)
    sunk = _math(nt, "MULTIPLY", _maprange(nt, t, 0.05, 0.12, 1.0, 0.0), 0.5)
    w = _math(nt, "ADD", wetf, sunk)
    wet = _maprange(nt, w, 0.72, 0.8, 0.0, 1.0, smooth=True)
    damp = _maprange(nt, w, 0.4, 0.75, 0.0, 1.0, smooth=True)
    col = _mix(nt, _math(nt, "MULTIPLY", damp, 0.4), base, (0.04, 0.04, 0.042))
    col = _mix(nt, joint, col, (0.012, 0.012, 0.012))
    col = _mix(nt, wet, col, (0.03, 0.03, 0.032))
    _link(nt, col, b.inputs["Base Color"])
    r = _maprange(nt, _noise(nt, o, 4.0, 3.0, 0.6), 0.3, 0.7, 0.22, 0.4)
    r = _fmix(nt, damp, r, 0.12)
    r = _fmix(nt, wet, r, 0.03)
    r = _fmix(nt, _math(nt, "MULTIPLY", joint, 1.0), r, 0.9)
    _link(nt, r, b.inputs["Roughness"])
    h = _math(nt, "SUBTRACT", _math(nt, "MULTIPLY", _noise(nt, o, 90.0, 3.0, 0.6), _math(nt, "SUBTRACT", 1.0, wet)),
              _math(nt, "MULTIPLY", joint, 0.4))
    _bump(nt, b, h, 0.08, 0.001)
    return m


def granite(name="kerb granite"):
    m, nt, b = _new(name)
    o = _obj(nt)
    sp = _maprange(nt, _noise(nt, o, 220.0, 2.0, 0.5), 0.35, 0.65, 0.0, 1.0)
    col = _mix(nt, sp, (0.07, 0.07, 0.072), (0.17, 0.165, 0.16))
    blk = _maprange(nt, _noise(nt, o, 600.0, 1.0, 0.5), 0.7, 0.75, 0.0, 1.0)
    col = _mix(nt, blk, col, (0.02, 0.02, 0.02))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, _noise(nt, o, 3.0, 3.0, 0.5), 0.3, 0.7, 0.18, 0.4), b.inputs["Roughness"])
    _bump(nt, b, _noise(nt, o, 300.0, 2.0, 0.5), 0.15, 0.0005)
    return m


def road_paint(name, rgb):
    """Worn road paint: thick, rough, rubbed off in patches toward the asphalt's tone."""
    m, nt, b = _new(name)
    o = _world(nt)
    wear = _maprange(nt, _noise(nt, o, 3.5, 5.0, 0.65), 0.38, 0.62, 0.0, 1.0)
    fine = _maprange(nt, _noise(nt, o, 70.0, 2.0, 0.6), 0.3, 0.7, 0.0, 1.0)
    wear = _math(nt, "MULTIPLY", wear, _fmix(nt, 0.5, fine, 1.0))
    col = _mix(nt, wear, (0.035, 0.035, 0.037), rgb)
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _fmix(nt, wear, 0.2, 0.42), b.inputs["Roughness"])
    _bump(nt, b, _noise(nt, o, 120.0, 2.0, 0.5), 0.2, 0.0006)
    return m


# ---------------------------------------------------------------- buildings
def facade(name="facade"):
    """Facades: colour per face (attribute fcol), kind per face (fk: 0 painted render, 1 small mosaic tile): rain
    streaks running down from every ledge, soot darkening toward the street, damp patches, the tile's grid and
    glaze. World space, so neighbouring panels of one building continue."""
    m, nt, b = _new(name)
    o = _world(nt)
    x, y, z = _xyz(nt, o)
    fc = _attr(nt, "fcol").outputs["Color"]
    fk = _attr(nt, "fk").outputs["Factor"]
    # rain streaks: noise stretched hard along Z
    streak = _maprange(nt, _noise(nt, o, 2.2, 4.0, 0.62, mapping=(3.0, 3.0, 0.12)), 0.35, 0.68, 0.0, 1.0)
    blot = _maprange(nt, _noise(nt, o, 0.5, 3.0, 0.6), 0.4, 0.7, 0.0, 1.0)
    dirt = _math(nt, "ADD", _math(nt, "MULTIPLY", streak, 0.55), _math(nt, "MULTIPLY", blot, 0.3))
    soot = _maprange(nt, z, 3.0, 9.0, 0.45, 0.0, smooth=True)
    dirt = _math(nt, "MINIMUM", _math(nt, "ADD", dirt, soot), 1.0)
    col = _mix(nt, _math(nt, "MULTIPLY", dirt, 0.62), fc, (0.035, 0.034, 0.032), blend="MIX")
    # mosaic: 30 mm tiles, each a slightly different glaze, dark grout
    br = _n(nt, "ShaderNodeTexBrick", offset=0.0, squash=1.0)
    br.inputs["Scale"].default_value = 1.0 / 0.03
    br.inputs["Mortar Size"].default_value = 0.08
    br.inputs["Brick Width"].default_value = 1.0
    br.inputs["Row Height"].default_value = 1.0
    br.inputs["Color1"].default_value = (0.88, 0.88, 0.88, 1)
    br.inputs["Color2"].default_value = (1.08, 1.08, 1.08, 1)
    br.inputs["Mortar"].default_value = (0.6, 0.6, 0.6, 1)
    mp = _n(nt, "ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0.0, 1.5708, 0.0)   # the facades stand in YZ: run the grid there
    _link(nt, o, mp.inputs["Vector"])
    vv = mp.outputs["Vector"]
    _link(nt, vv, br.inputs["Vector"])
    tile = _mix(nt, 1.0, col, br.outputs["Color"], blend="MULTIPLY")
    col = _mix(nt, fk, col, tile)
    _link(nt, col, b.inputs["Base Color"])
    rr = _maprange(nt, _noise(nt, o, 3.0, 3.0, 0.6), 0.3, 0.7, 0.72, 0.92)
    r = _fmix(nt, fk, rr, _fmix(nt, br.outputs["Factor"], 0.85, 0.34))
    _link(nt, r, b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.4
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", _noise(nt, o, 40.0, 3.0, 0.6), _math(nt, "SUBTRACT", 1.0, fk)),
              _math(nt, "MULTIPLY", br.outputs["Factor"], _math(nt, "MULTIPLY", fk, 0.6)))
    _bump(nt, b, h, 0.25, 0.002)
    return m


def window_glass(name="window glass"):
    """Window glass: dark, reflective; a lit room (face attribute lit, colour wcol) glows through drawn curtains whose
    folds and a hem show as soft vertical banding; some rooms only a blue flicker of a screen deep inside."""
    m, nt, b = _new(name)
    o = _world(nt)
    lit = _attr(nt, "lit").outputs["Factor"]
    wc = _attr(nt, "wcol").outputs["Color"]
    b.inputs["Base Color"].default_value = (0.012, 0.013, 0.015, 1)
    b.inputs["Roughness"].default_value = 0.06
    b.inputs["Specular IOR Level"].default_value = 0.5
    folds = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="Y")
    folds.inputs["Scale"].default_value = 9.0
    folds.inputs["Distortion"].default_value = 1.5
    _link(nt, o, folds.inputs["Vector"])
    f2 = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="X")
    f2.inputs["Scale"].default_value = 9.0
    f2.inputs["Distortion"].default_value = 1.5
    _link(nt, o, f2.inputs["Vector"])
    fold = _maprange(nt, _math(nt, "MULTIPLY", folds.outputs["Factor"], f2.outputs["Factor"]), 0.0, 1.0, 0.55, 1.0)
    vary = _maprange(nt, _noise(nt, o, 1.3, 2.0, 0.5), 0.3, 0.7, 0.7, 1.15)
    strength = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", lit, fold), vary)
    _link(nt, wc, b.inputs["Emission Color"])
    _link(nt, strength, b.inputs["Emission Strength"])
    _link(nt, _maprange(nt, _noise(nt, o, 6.0, 2.0, 0.5), 0.3, 0.7, 0.03, 0.1), b.inputs["Roughness"])
    m.cycles.emission_sampling = "NONE"     # many tiny emitters: seen, and lighting by bounce only
    return m


def ac_case(name="ac case"):
    """Enamelled air-conditioner cases: off-white to beige to grey per object, chalky, rust bleeding from the seams,
    grime washed down the front."""
    m, nt, b = _new(name)
    o = _obj(nt)
    info = _n(nt, "ShaderNodeObjectInfo")
    rnd = info.outputs["Random"]
    c0 = _mix(nt, rnd, (0.36, 0.35, 0.32), (0.26, 0.255, 0.235))
    c0 = _mix(nt, _maprange(nt, rnd, 0.75, 0.8, 0.0, 1.0), c0, (0.2, 0.205, 0.2))
    streak = _maprange(nt, _noise(nt, o, 9.0, 4.0, 0.6, mapping=(2.0, 2.0, 0.2)), 0.4, 0.75, 0.0, 1.0)
    rust = _maprange(nt, _noise(nt, o, 14.0, 5.0, 0.7), 0.62, 0.74, 0.0, 1.0)
    col = _mix(nt, _math(nt, "MULTIPLY", streak, 0.55), c0, (0.07, 0.065, 0.055))
    col = _mix(nt, _math(nt, "MULTIPLY", rust, 0.8), col, (0.11, 0.05, 0.02))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _fmix(nt, rust, _maprange(nt, _noise(nt, o, 5.0, 3.0, 0.5), 0.3, 0.7, 0.42, 0.62), 0.85), b.inputs["Roughness"])
    _bump(nt, b, _noise(nt, o, 80.0, 3.0, 0.6), 0.1, 0.0008)
    return m


def shutter(name="roller shutter"):
    """Roller-shutter slats (horizontal ribs every 75 mm), galvanised and painted grey-green, the paint chalky and worn
    to bare zinc at hand height, grime and rust at the foot."""
    m, nt, b = _new(name)
    o = _world(nt)
    x, y, z = _xyz(nt, o)
    rib = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="Z")
    rib.inputs["Scale"].default_value = 1.0
    mp = _n(nt, "ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0 / 0.075 / 6.28, 1.0 / 0.075 / 6.28, 1.0 / 0.075 / 6.28)
    _link(nt, o, mp.inputs["Vector"])
    _link(nt, mp.outputs["Vector"], rib.inputs["Vector"])
    wear = _maprange(nt, _noise(nt, o, 3.0, 5.0, 0.65), 0.55, 0.7, 0.0, 1.0)
    hand = _maprange(nt, _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", z, 1.1)), 0.1, 0.5, 1.0, 0.0, smooth=True)
    bare = _math(nt, "MULTIPLY", wear, _fmix(nt, hand, 0.3, 1.0))
    col = _mix(nt, bare, (0.14, 0.155, 0.15), (0.25, 0.25, 0.25))
    foot = _maprange(nt, z, 0.15, 0.7, 0.7, 0.0, smooth=True)
    col = _mix(nt, _math(nt, "MULTIPLY", foot, _maprange(nt, _noise(nt, o, 6.0, 4.0, 0.6), 0.3, 0.7, 0.4, 1.0)), col, (0.06, 0.045, 0.03))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _fmix(nt, bare, 0.62, 0.38), b.inputs["Roughness"])
    b.inputs["Metallic"].default_value = 0.25
    _bump(nt, b, rib.outputs["Factor"], 0.5, 0.006)
    return m


def cloth(name="laundry"):
    """Laundry: matt cotton in muted colours per face (attribute ccol), a soft weave and creases."""
    m, nt, b = _new(name)
    o = _obj(nt)
    c = _attr(nt, "ccol").outputs["Color"]
    crease = _maprange(nt, _noise(nt, o, 7.0, 3.0, 0.6, mapping=(1.0, 1.0, 0.3)), 0.3, 0.7, 0.75, 1.05)
    col = _mix(nt, 1.0, c, _n(nt, "ShaderNodeCombineColor").outputs[0], blend="MULTIPLY")
    cc = nt.nodes[-2]
    for s in ("Red", "Green", "Blue"):
        _link(nt, crease, cc.inputs[s])
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.9
    b.inputs["Specular IOR Level"].default_value = 0.15
    _bump(nt, b, _noise(nt, o, 60.0, 2.0, 0.5), 0.15, 0.001)
    return m


def goods(name="goods"):
    """Merchandise on the shelves: packets and boxes, a colour per face (attribute gcol), satin printed card with no
    print (blank), a little gloss variation."""
    m, nt, b = _new(name)
    c = _attr(nt, "gcol").outputs["Color"]
    _link(nt, c, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.45
    b.inputs["Specular IOR Level"].default_value = 0.4
    return m


def sky(name="night sky"):
    """The strip of sky over the canyon: low cloud lit from below by the city, a dull blue-grey that glows a little
    warmer toward the horizon (the street's far end), never black."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    o = _world(nt)
    x, y, z = _xyz(nt, o)
    cloud = _maprange(nt, _noise(nt, o, 0.012, 4.0, 0.6), 0.3, 0.7, 0.6, 0.9)
    far = _maprange(nt, y, 40.0, 260.0, 0.0, 1.0, smooth=True)
    col = _mix(nt, far, (0.035, 0.045, 0.065), (0.070, 0.060, 0.060))
    em = _n(nt, "ShaderNodeEmission")
    _link(nt, col, em.inputs["Color"])
    _link(nt, cloud, em.inputs["Strength"])
    _emit_out(m, nt, em.outputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def shop_glass(name="shop glass", refl=0.9, tint=(0.92, 0.96, 0.95)):
    """Shop-window glass that lets the display's light through to the pavement (Transparent BSDF passes shadow rays,
    where a real refracting glass would block them and leave the pavement dark) and reflects the street and
    passers-by by Fresnel, a little more than plain glass so a figure's reflection shows over the dark backdrop."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = (*tint, 1)
    gl = _n(nt, "ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.012
    gl.inputs["Color"].default_value = (refl, refl, refl, 1)
    fr = _n(nt, "ShaderNodeLayerWeight")
    fr.inputs["Blend"].default_value = 0.22
    fac = _maprange(nt, fr.outputs["Fresnel"], 0.0, 1.0, 0.07, 1.0)
    fac.node.name = "refl"            # per camera: the reflection floor (inputs To Min)
    mix = _n(nt, "ShaderNodeMixShader")
    _link(nt, fac, mix.inputs[0])
    _link(nt, tr.outputs[0], mix.inputs[1])
    _link(nt, gl.outputs[0], mix.inputs[2])
    # faint smudges: the reflection's roughness varies a little
    o = _obj(nt)
    _link(nt, _maprange(nt, _noise(nt, o, 7.0, 3.0, 0.6), 0.55, 0.75, 0.02, 0.09), gl.inputs["Roughness"])
    _emit_out(m, nt, mix.outputs[0])
    return m


def walnut(name="dark walnut"):
    """Oiled dark walnut (the boutique shelf and floor): long grain along Y with darker latewood lines and pores,
    a soft satin sheen that breaks up along the grain."""
    m, nt, b = _new(name)
    o = _obj(nt)
    mp = _n(nt, "ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (14.0, 0.8, 14.0)
    _link(nt, o, mp.inputs["Vector"])
    w = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="X")
    w.inputs["Scale"].default_value = 3.0
    w.inputs["Distortion"].default_value = 6.0
    w.inputs["Detail"].default_value = 3.0
    _link(nt, mp.outputs["Vector"], w.inputs["Vector"])
    g = _maprange(nt, w.outputs["Factor"], 0.2, 0.9, 0.0, 1.0)
    col = _mix(nt, g, (0.05, 0.032, 0.02), (0.022, 0.014, 0.009))
    pores = _maprange(nt, _noise(nt, mp.outputs["Vector"], 60.0, 2.0, 0.5), 0.62, 0.7, 0.0, 0.5)
    col = _mix(nt, pores, col, (0.01, 0.007, 0.005))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, g, 0.0, 1.0, 0.28, 0.42), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.45
    _bump(nt, b, _math(nt, "ADD", g, pores), 0.08, 0.0008)
    return m


def kraft(name="kraft paper"):
    """Kraft paper shopping bag: warm tan, fibrous, matt, faint crumple."""
    m, nt, b = _new(name)
    o = _obj(nt)
    fib = _maprange(nt, _noise(nt, o, 900.0, 2.0, 0.6, mapping=(1.0, 1.0, 0.25)), 0.3, 0.7, 0.86, 1.06)
    base = _mix(nt, _maprange(nt, _noise(nt, o, 12.0, 3.0, 0.6), 0.3, 0.7, 0.0, 1.0), (0.21, 0.135, 0.075), (0.26, 0.17, 0.095))
    col = _mix(nt, 1.0, base, _n(nt, "ShaderNodeCombineColor").outputs[0], blend="MULTIPLY")
    cc = nt.nodes[-2]
    for s in ("Red", "Green", "Blue"):
        _link(nt, fib, cc.inputs[s])
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.88
    b.inputs["Specular IOR Level"].default_value = 0.25
    crumple = _math(nt, "ADD", _noise(nt, o, 18.0, 3.0, 0.6), _math(nt, "MULTIPLY", _noise(nt, o, 700.0, 2.0, 0.5), 0.15))
    _bump(nt, b, crumple, 0.12, 0.002)
    return m


def coated_card(name, rgb, rough=0.4):
    """A boutique bag's coated card: a deep colour, a soft satin sheen, faint creases."""
    m, nt, b = _new(name)
    o = _obj(nt)
    col = _mix(nt, _maprange(nt, _noise(nt, o, 10.0, 3.0, 0.6), 0.3, 0.7, 0.0, 1.0), tuple(c * 0.9 for c in rgb), rgb)
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, _noise(nt, o, 6.0, 3.0, 0.6), 0.3, 0.7, rough - 0.06, rough + 0.08), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.4
    _bump(nt, b, _noise(nt, o, 14.0, 3.0, 0.6), 0.06, 0.002)
    return m


def tube(name, strength, rgb=(0.88, 0.95, 1.0)):
    """A burning fluorescent tube or LED strip: emission with faint phosphor banding."""
    m = emit(name, rgb, strength)
    return m


def materials():
    """All the set's shared materials, once."""
    M.clear()
    M["asphalt"] = asphalt()
    M["pavers"] = pavers()
    M["granite"] = granite()
    M["paint_white"] = road_paint("road paint white", (0.42, 0.42, 0.4))
    M["paint_yellow"] = road_paint("road paint yellow", (0.42, 0.3, 0.06))
    M["rail"] = pbr("rail steel", (0.32, 0.31, 0.3), rough=(0.12, 0.3), metal=1.0, nscale=30.0, stretch=(8, 0.2, 8), world=True)
    M["iron"] = pbr("cast iron", (0.03, 0.029, 0.028), rough=(0.35, 0.7), metal=0.6, nscale=25.0, cvar=0.35, grime=0.4)
    M["facade"] = facade()
    M["glass"] = window_glass()
    M["alu"] = pbr("anodised frame", (0.11, 0.105, 0.1), rough=(0.32, 0.5), metal=0.85, nscale=12.0, cvar=0.2)
    M["alu_pale"] = pbr("pale frame", (0.3, 0.3, 0.29), rough=(0.38, 0.55), metal=0.7, nscale=12.0, cvar=0.2)
    M["slab"] = pbr("balcony concrete", (0.17, 0.165, 0.155), rough=(0.75, 0.92), nscale=2.0, cvar=0.25, grime=0.5, world=True)
    M["ac"] = ac_case()
    M["ac_grille"] = pbr("ac grille", (0.03, 0.03, 0.03), rough=(0.5, 0.7), metal=0.3, nscale=40.0, cvar=0.3)
    M["steel"] = pbr("painted steel", (0.05, 0.052, 0.05), rough=(0.45, 0.7), metal=0.3, nscale=8.0, cvar=0.3, grime=0.3)
    M["steel_rust"] = pbr("rusty steel", (0.07, 0.045, 0.03), rough=(0.6, 0.85), metal=0.2, nscale=10.0, cvar=0.35)
    M["rail_green"] = pbr("railing paint", (0.11, 0.13, 0.12), rough=(0.35, 0.55), metal=0.2, nscale=6.0, cvar=0.2, grime=0.3)
    M["pole"] = pbr("lamp pole", (0.14, 0.145, 0.15), rough=(0.4, 0.6), metal=0.5, nscale=5.0, cvar=0.15)
    M["shutter"] = shutter()
    M["cloth"] = cloth()
    M["goods"] = goods()
    M["cable"] = pbr("cable rubber", (0.012, 0.012, 0.013), rough=(0.4, 0.6), nscale=20.0, cvar=0.2)
    M["sky"] = sky()
    M["sign"] = _attr_emitter("sign face", "scol", "sstr", gain=1.0, base_rgb=(0.01, 0.01, 0.01), hotspot=0.6)
    M["neon"] = _attr_emitter("neon tube", "scol", "sstr", gain=1.0, base_rgb=(0.2, 0.2, 0.2))
    M["sign_dead"] = pbr("sign panel unlit", (0.09, 0.09, 0.088), rough=(0.5, 0.75), nscale=6.0, cvar=0.3, grime=0.2)
    M["frame"] = pbr("sign frame", (0.06, 0.058, 0.056), rough=(0.57, 0.66), metal=0.6, nscale=10.0, cvar=0.25, grime=0.25)
    # shop walls a mid-dark painted board, not white (at 0.4 under the fill the open shops read as empty white bays)
    M["int_wall"] = pbr("shop wall", (0.2, 0.195, 0.185), rough=(0.6, 0.8), nscale=1.5, cvar=0.12, grime=0.45)
    M["int_floor"] = pbr("shop floor", (0.11, 0.105, 0.1), rough=(0.12, 0.3), nscale=3.0, cvar=0.15)
    M["int_ceiling"] = pbr("shop ceiling", (0.35, 0.35, 0.34), rough=(0.8, 0.9), nscale=1.0, cvar=0.05)
    M["shelf"] = pbr("shelf white", (0.32, 0.32, 0.31), rough=(0.35, 0.5), nscale=4.0, cvar=0.1)
    M["counter"] = pbr("counter", (0.06, 0.05, 0.042), rough=(0.25, 0.45), nscale=4.0, cvar=0.15)
    M["store_lcd"] = emit("unlettered display", (0.69, 0.75, 0.79), 0.82)
    M["shelf_led"] = emit("boutique shelf diffuser", (1, 0.84, 0.63), 1.8)
    M["panel_warm"] = emit("ceiling panel warm", (1.0, 0.82, 0.6), 6.0)
    M["panel_cool"] = emit("ceiling panel cool", (0.82, 0.92, 1.0), 6.0)
    M["lamp_head"] = emit("street lamp lens", (1.0, 0.88, 0.72), 30.0, sampling="NONE")
    M["wood_dark"] = walnut()
    M["felt"] = pbr("display felt", (0.012, 0.011, 0.012), rough=(0.88, 0.96), nscale=6.0, cvar=0.15, bump=0.1, bscale=300, spec=0.2)
    M["plinth"] = pbr("display plinth", (0.12, 0.115, 0.11), rough=(0.18, 0.3), nscale=3.0, cvar=0.08)
    M["shop_glass"] = shop_glass()
    M["shelf_glass"] = shop_glass("shelf glass", refl=0.6, tint=(0.9, 0.95, 0.93))
    M["kraft"] = kraft()
    M["card_dark"] = coated_card("boutique card", (0.035, 0.028, 0.032), 0.38)
    M["tissue"] = pbr("tissue paper", (0.5, 0.48, 0.44), rough=(0.75, 0.9), nscale=40.0, cvar=0.08, bump=0.2, bscale=30)
    M["rope"] = pbr("bag rope", (0.03, 0.026, 0.024), rough=(0.6, 0.8), nscale=200.0, cvar=0.2, bump=0.3, bscale=400)
    M["kraft_rope"] = pbr("paper twist", (0.17, 0.11, 0.06), rough=(0.75, 0.9), nscale=200.0, cvar=0.2, bump=0.3, bscale=400)
    M["plastic_crate"] = pbr("crate plastic", (0.12, 0.13, 0.15), rough=(0.4, 0.55), nscale=8.0, cvar=0.2)
    M["cardboard"] = pbr("cardboard", (0.2, 0.14, 0.085), rough=(0.8, 0.92), nscale=10.0, cvar=0.2, bump=0.15, bscale=60)
    M["void"] = sk_black()
    for m in M.values():      # the cast build (MPFB) purges orphan data: keep materials not yet assigned alive
        m.use_fake_user = True
    return M


def sk_black():
    m = bpy.data.materials.new("void black")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.004, 0.004, 0.004, 1)
    b.inputs["Roughness"].default_value = 0.95
    return m
