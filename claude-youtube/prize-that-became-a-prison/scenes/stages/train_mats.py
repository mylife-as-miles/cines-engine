"""Materials for the night train carriage (Cycles, Principled BSDF). Patterns work in object space, in metres;
nothing reads as one flat value (tone and roughness always vary).

    upholstery  the seats' woven moquette: a visible twill, slub in the yarn, worn lighter on the front roll, darker
                into the seams
    linen       the headrest covers: a pale plain-weave cloth, a little crumpled
    plastic     the seat shells, the armrest sides and the lining: satin plastic with orange peel, scuffs and grime
    lining      the wall and ceiling panels: pale painted composite, a fine stipple, darker into the corners
    vinyl       the floor: speckled sheet vinyl, the aisle worn smoother and lighter down its middle, scuffed
    alu         satin aluminium for the rack bars, the rails and the trims (brushed along one axis)
    rubber      the window gaskets and the floor trims
    glass       the double-glazed window: transparent, Fresnel plus the panes' own reflection, faint smudges
    opal        a strip light's opal diffuser: brighter along the LED line, its ends falling off; a failing tube
                carries an uneven glow
    streak      a passing light outside: a soft horizontal smear (gaussian across, soft ends), no shape, no text
    glow        a plain emitter (the vestibule beyond the door glass, a reading lamp's lens)
Node helpers copied from hearing_room_mats.py (which copied departure_gate_mats.py).
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


def _gen(nt):
    return _n(nt, "ShaderNodeTexCoord").outputs["Generated"]


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


def _rand_offset(nt, vec):
    """Object coordinates shifted by the object's random value, so instanced parts do not repeat their pattern."""
    r = _rand(nt)
    off = _n(nt, "ShaderNodeCombineXYZ")
    for k, s in zip("XYZ", (17.3, 9.1, 23.7)):
        _link(nt, _math(nt, "MULTIPLY", r, s), off.inputs[k])
    return _vadd(nt, vec, off.outputs["Vector"]), r


# ---------------------------------------------------------------- surfaces
def upholstery(name, rgb=(0.032, 0.04, 0.062), weave=420.0, wear=0.35):
    """Woven moquette: a twill (diagonal wave bands crossed with a fine warp), slub in the yarn, a faint two-tone
    fleck, sheen at grazing angles, the front roll and the arm-side edges worn a little lighter (object noise times a
    height ramp), darker into the seams and under the welts (AO)."""
    m, nt, b = _new(name)
    o, r = _rand_offset(nt, _obj(nt))
    x, y, z = _xyz(nt, o)
    diag = _n(nt, "ShaderNodeCombineXYZ")
    _link(nt, _math(nt, "ADD", x, z), diag.inputs["X"])
    _link(nt, _math(nt, "SUBTRACT", y, z), diag.inputs["Y"])
    w1 = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="X")
    w2 = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="Y")
    w1.inputs["Scale"].default_value = weave
    w2.inputs["Scale"].default_value = weave * 1.6
    for w in (w1, w2):
        w.inputs["Distortion"].default_value = 0.4
    _link(nt, diag.outputs["Vector"], w1.inputs["Vector"])
    _link(nt, o, w2.inputs["Vector"])
    wv = _math(nt, "ADD", _math(nt, "MULTIPLY", _out(w1, "Fac"), 0.65), _math(nt, "MULTIPLY", _out(w2, "Fac"), 0.35))
    slub = _noise(nt, o, 1.0, 3.0, 0.6, mapping=(60.0, 60.0, 500.0))
    fleck = _noise(nt, o, 260.0, 2.0, 0.7)
    col = _mix(nt, _maprange(nt, wv, 0.2, 0.9, 0.0, 1.0), tuple(c * 0.78 for c in rgb), tuple(min(1, c * 1.22) for c in rgb))
    col = _mix(nt, _maprange(nt, slub, 0.45, 0.8, 0.0, 0.35), col, tuple(min(1, c * 1.4) for c in rgb))
    col = _mix(nt, _maprange(nt, fleck, 0.62, 0.72, 0.0, 0.25), col, (rgb[0] * 1.6, rgb[1] * 1.55, rgb[2] * 1.35))
    # each seat a shade apart (fading, cleaning)
    shade = _maprange(nt, r, 0.0, 1.0, 0.9, 1.08)
    gry = _n(nt, "ShaderNodeCombineColor")
    for s in ("Red", "Green", "Blue"):
        _link(nt, shade, gry.inputs[s])
    col = _mix(nt, 1.0, col, gry.outputs[0], "MULTIPLY")
    if wear:
        rub = _maprange(nt, _noise(nt, o, 7.0, 4.0, 0.6), 0.5, 0.75, 0.0, wear)
        col = _mix(nt, rub, col, tuple(min(1, c * 1.55 + 0.01) for c in rgb))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.04), 0.3, 1.0, 0.6, 0.0), col, tuple(c * 0.35 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.9
    b.inputs["Sheen Weight"].default_value = 0.5
    b.inputs["Sheen Roughness"].default_value = 0.45
    b.inputs["Sheen Tint"].default_value = (0.75, 0.8, 0.95, 1.0)
    b.inputs["Specular IOR Level"].default_value = 0.18
    _bump(nt, b, _math(nt, "ADD", wv, _math(nt, "MULTIPLY", slub, 0.5)), 0.28, 0.0006)
    return m


def linen(name, rgb=(0.36, 0.36, 0.35)):
    """The headrest cover: a pale plain-weave cloth, matt, faint creases and laundering marks, greyer at the folds."""
    m, nt, b = _new(name)
    o, r = _rand_offset(nt, _obj(nt))
    w1 = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="X")
    w2 = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="Z")
    for w in (w1, w2):
        w.inputs["Scale"].default_value = 900.0
        w.inputs["Distortion"].default_value = 0.2
        _link(nt, o, w.inputs["Vector"])
    wv = _math(nt, "MULTIPLY", _out(w1, "Fac"), _out(w2, "Fac"))
    crease = _noise(nt, o, 9.0, 5.0, 0.65)
    col = _mix(nt, _maprange(nt, crease, 0.35, 0.7, 0.0, 1.0), tuple(c * 0.9 for c in rgb), tuple(min(1, c * 1.06) for c in rgb))
    col = _mix(nt, _maprange(nt, r, 0.0, 1.0, 0.0, 0.25), col, (rgb[0] * 0.92, rgb[1] * 0.9, rgb[2] * 0.84))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.03), 0.3, 1.0, 0.5, 0.0), col, tuple(c * 0.55 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.92
    b.inputs["Sheen Weight"].default_value = 0.25
    b.inputs["Sheen Roughness"].default_value = 0.5
    b.inputs["Specular IOR Level"].default_value = 0.15
    _bump(nt, b, _math(nt, "ADD", _math(nt, "MULTIPLY", wv, 0.4), _math(nt, "MULTIPLY", crease, 1.0)), 0.18, 0.001)
    return m


def plastic(name, rgb, rough=(0.38, 0.55), grime=0.35, scuff=0.25, peel=0.04):
    """Satin moulded plastic / painted composite: tone and roughness variation, an orange-peel bump, scuffs (fine
    dark streaks) and grime into the corners (AO)."""
    m, nt, b = _new(name)
    o, r = _rand_offset(nt, _obj(nt))
    col = _mix(nt, _maprange(nt, _noise(nt, o, 2.5, 4.0, 0.6), 0.3, 0.7, 0.0, 1.0), tuple(c * 0.92 for c in rgb),
               tuple(min(1, c * 1.06) for c in rgb))
    if scuff:
        sc = _noise(nt, o, 1.0, 6.0, 0.7, mapping=(3.0, 40.0, 3.0))
        col = _mix(nt, _maprange(nt, sc, 0.66, 0.78, 0.0, scuff), col, tuple(c * 0.55 for c in rgb))
    if grime:
        col = _mix(nt, _maprange(nt, _ao(nt, 0.12), 0.3, 1.0, grime, 0.0), col, tuple(c * 0.42 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, _noise(nt, o, 5.0, 4.0, 0.6), 0.3, 0.7, rough[0], rough[1]), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.4
    if peel:
        _bump(nt, b, _noise(nt, o, 220.0, 3.0, 0.6), peel, 0.0005)
    return m


def lining(name, rgb=(0.3, 0.305, 0.31), rough=(0.5, 0.68), grime=0.4):
    """Pale painted composite panels of the walls and ceiling: broad tone variation, a fine stipple, a satin sheen,
    darker where dust and hands reach into the corners and reveals (AO), a faint yellowing in patches."""
    m, nt, b = _new(name)
    o = _world(nt)
    big = _noise(nt, o, 0.6, 4.0, 0.55)
    mid = _noise(nt, o, 3.5, 5.0, 0.6)
    col = _mix(nt, _maprange(nt, big, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.93 for c in rgb), tuple(min(1, c * 1.05) for c in rgb))
    col = _mix(nt, _maprange(nt, mid, 0.5, 0.75, 0.0, 0.15), col, (rgb[0] * 0.95, rgb[1] * 0.93, rgb[2] * 0.85))
    if grime:
        col = _mix(nt, _maprange(nt, _ao(nt, 0.2), 0.3, 1.0, grime, 0.0), col, tuple(c * 0.4 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, mid, 0.3, 0.7, rough[0], rough[1]), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.38
    _bump(nt, b, _noise(nt, o, 260.0, 3.0, 0.6), 0.04, 0.0005)
    return m


def vinyl(name, base=(0.062, 0.064, 0.071), aisle=(-0.3, 0.3)):
    """Speckled sheet vinyl: a dense two-tone chip fleck, slow clouding; the aisle (world x inside `aisle`) worn
    smoother and lighter down its middle, the worn band wandering a little; dark heel scuffs scattered along it;
    grime into the edges under the seats (AO)."""
    m, nt, b = _new(name)
    o = _world(nt)
    x, y, _ = _xyz(nt, o)
    chip = _n(nt, "ShaderNodeTexVoronoi")
    chip.inputs["Scale"].default_value = 140.0
    _link(nt, o, chip.inputs["Vector"])
    cd = _out(chip, "Distance")
    cc = _out(chip, "Color")
    ccb = _n(nt, "ShaderNodeRGBToBW")
    _link(nt, cc, ccb.inputs["Color"])
    col = _mix(nt, _maprange(nt, _noise(nt, o, 0.7, 3.0, 0.5), 0.3, 0.7, 0.0, 1.0), tuple(c * 0.9 for c in base),
               tuple(min(1, c * 1.08) for c in base))
    col = _mix(nt, _maprange(nt, ccb.outputs[0], 0.7, 0.8, 0.0, 0.55), col, (base[0] * 1.9, base[1] * 1.9, base[2] * 1.8))
    col = _mix(nt, _maprange(nt, ccb.outputs[0], 0.0, 0.12, 0.5, 0.0), col, tuple(c * 0.45 for c in base))
    # the walked band: centred on the aisle, wandering, soft-edged
    wander = _maprange(nt, _noise(nt, o, 0.25, 2.0, 0.5), 0.3, 0.7, -0.07, 0.07)
    cx = (aisle[0] + aisle[1]) / 2
    half = (aisle[1] - aisle[0]) / 2
    d = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", _math(nt, "SUBTRACT", x, cx), wander))
    walk = _maprange(nt, d, half * 0.25, half * 1.05, 1.0, 0.0)
    walk = _math(nt, "MULTIPLY", walk, _maprange(nt, _noise(nt, o, 1.6, 3.0, 0.6), 0.3, 0.7, 0.55, 1.0))
    col = _mix(nt, _math(nt, "MULTIPLY", walk, 0.6), col, (base[0] * 1.18, base[1] * 1.17, base[2] * 1.14))
    # heel scuffs: short dark streaks along the walking direction
    sc = _noise(nt, o, 1.0, 5.0, 0.7, mapping=(22.0, 5.0, 22.0))
    scuff = _math(nt, "MULTIPLY", _maprange(nt, sc, 0.68, 0.76, 0.0, 0.5), walk)
    col = _mix(nt, scuff, col, tuple(c * 0.4 for c in base))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.25), 0.3, 1.0, 0.55, 0.0), col, tuple(c * 0.35 for c in base))
    _link(nt, col, b.inputs["Base Color"])
    rr = _maprange(nt, walk, 0.0, 1.0, 0.64, 0.5)
    rr = _math(nt, "ADD", rr, _maprange(nt, _noise(nt, o, 6.0, 3.0, 0.6), 0.3, 0.7, -0.05, 0.05))
    _link(nt, rr, b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.4
    _bump(nt, b, _math(nt, "ADD", _math(nt, "MULTIPLY", cd, 0.3), _noise(nt, o, 300.0, 2.0, 0.6)), 0.05, 0.0004)
    return m


def alu(name, rgb=(0.6, 0.61, 0.63), rough=0.3, axis="Y", smudge=0.12):
    """Satin aluminium: brushed along `axis` (streaks stretched that way), smudged a little rougher in patches."""
    m, nt, b = _new(name)
    o, _ = _rand_offset(nt, _obj(nt))
    st = {"X": (3.0, 180.0, 180.0), "Y": (180.0, 3.0, 180.0), "Z": (180.0, 180.0, 3.0)}[axis]
    br = _noise(nt, o, 1.0, 6.0, 0.6, mapping=st)
    b.inputs["Metallic"].default_value = 1.0
    col = _mix(nt, _maprange(nt, br, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.92 for c in rgb), tuple(min(1, c * 1.05) for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    sm = _maprange(nt, _noise(nt, o, 4.0, 4.0, 0.6), 0.45, 0.75, 0.0, smudge)
    rr = _math(nt, "ADD", _maprange(nt, br, 0.3, 0.7, rough - 0.05, rough + 0.05), sm)
    _link(nt, rr, b.inputs["Roughness"])
    _bump(nt, b, br, 0.03, 0.0003)
    return m


def rubber(name, rgb=(0.025, 0.025, 0.027)):
    m, nt, b = _new(name)
    o = _obj(nt)
    col = _mix(nt, _maprange(nt, _noise(nt, o, 8.0, 3.0, 0.6), 0.3, 0.7, 0.0, 1.0), tuple(c * 0.85 for c in rgb),
               tuple(min(1, c * 1.3) for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, _noise(nt, o, 20.0, 3.0, 0.6), 0.3, 0.7, 0.55, 0.75), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.35
    _bump(nt, b, _noise(nt, o, 400.0, 2.0, 0.6), 0.05, 0.0003)
    return m


def grille(name, rgb=(0.05, 0.052, 0.056), pitch=0.012, axis="Y"):
    """A heater grille: dark painted slots (wave bands), the slots darker, satin metal."""
    m, nt, b = _new(name)
    o = _obj(nt)
    w = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction=axis, wave_profile="SAW")
    w.inputs["Scale"].default_value = 1.0 / pitch
    _link(nt, o, w.inputs["Vector"])
    f = _out(w, "Fac")
    slot = _maprange(nt, f, 0.55, 0.62, 0.0, 1.0)
    col = _mix(nt, slot, rgb, tuple(c * 0.12 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Metallic"].default_value = 0.4
    b.inputs["Roughness"].default_value = 0.5
    _bump(nt, b, slot, 0.4, 0.002)
    return m


def glass(name, tint=(0.88, 0.92, 0.9), refl=0.07, gain=0.85):
    """The double-glazed window: transparent (the night and its lights show through), reflecting the carriage by
    Fresnel plus a base `refl` for the second pane's surfaces, faint smudges and a dust haze toward the lower edge."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = (*tint, 1)
    gl = _n(nt, "ShaderNodeBsdfGlossy")
    o = _obj(nt)
    smudge = _maprange(nt, _noise(nt, o, 3.5, 5.0, 0.65), 0.45, 0.8, 0.0, 1.0)
    _link(nt, _maprange(nt, smudge, 0.0, 1.0, 0.012, 0.07), gl.inputs["Roughness"])
    lw = _n(nt, "ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.08
    base = _math(nt, "ADD", _math(nt, "MULTIPLY", _out(lw, "Fresnel"), gain), refl)
    m["refl_node"] = base.node.name          # inputs[1] is `refl`: the stage trims it per camera
    fac = _math(nt, "ADD", base, _math(nt, "MULTIPLY", smudge, 0.02), clamp=True)
    mx = _n(nt, "ShaderNodeMixShader")
    _link(nt, fac, mx.inputs[0])
    _link(nt, tr.outputs[0], mx.inputs[1])
    _link(nt, gl.outputs[0], mx.inputs[2])
    _link(nt, mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
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
        g = _gen(nt)
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


def opal(name, rgb, strength, flicker=0.0, off_rgb=(0.2, 0.205, 0.21)):
    """A strip light's opal diffuser (generated X along the strip, Y across): a brighter line down the middle (the
    LED row behind it), the last few centimetres at each end falling off into the end caps. With `flicker` > 0 a
    failing tube: one end dimmer and blotchy, the light along it uneven. Strength 0: an unlit opal (matt grey-white)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*off_rgb, 1)
    b.inputs["Roughness"].default_value = 0.55
    b.inputs["Transmission Weight"].default_value = 0.0
    if strength <= 0:
        return m
    gx, gy, _ = _xyz(nt, _gen(nt))
    across = _maprange(nt, _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", gy, 0.5)), 0.0, 0.5, 1.25, 0.55)
    ends = _math(nt, "MULTIPLY", _maprange(nt, gx, 0.0, 0.03, 0.35, 1.0), _maprange(nt, gx, 0.97, 1.0, 1.0, 0.35))
    s = _math(nt, "MULTIPLY", across, ends)
    if flicker:
        uneven = _maprange(nt, _noise(nt, _gen(nt), 1.0, 3.0, 0.6, mapping=(9.0, 1.0, 1.0)), 0.3, 0.7, 1.0 - flicker, 1.0)
        tail = _maprange(nt, gx, 0.0, 0.6, 1.0 - flicker * 0.9, 1.0)
        s = _math(nt, "MULTIPLY", s, _math(nt, "MULTIPLY", uneven, tail))
    s = _math(nt, "MULTIPLY", s, strength)
    b.inputs["Emission Color"].default_value = (*rgb, 1)
    _link(nt, s, b.inputs["Emission Strength"])
    m.cycles.emission_sampling = "NONE"
    return m


def streak(name, rgb, strength, soft=0.18):
    """A passing light outside, smeared by the motion: on a plane (generated X along it, Y across) a gaussian band
    across, rising and falling softly along its length (brightest a little ahead of the middle). Pure light, no
    shape, no text."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    gx, gy, _ = _xyz(nt, _gen(nt))
    dy = _math(nt, "SUBTRACT", gy, 0.5)
    across = _math(nt, "EXPONENT", _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", dy, dy), -1.0 / (2 * soft * soft)))
    up = _maprange(nt, gx, 0.0, 0.35, 0.0, 1.0)
    down = _maprange(nt, gx, 0.55, 1.0, 1.0, 0.0)
    along = _math(nt, "MULTIPLY", up, down)
    along = _math(nt, "MULTIPLY", along, along)
    s = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", across, along), strength)
    _link(nt, s, em.inputs["Strength"])
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    add = _n(nt, "ShaderNodeAddShader")
    _link(nt, em.outputs[0], add.inputs[0])
    _link(nt, tr.outputs[0], add.inputs[1])
    _link(nt, add.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def night(name, horizon=(0.012, 0.014, 0.022), top=(0.0015, 0.0018, 0.003), ground=(0.004, 0.0042, 0.005)):
    """The night beyond the glass on a far plane (generated Z up): the ground almost black, a faint low glow on the
    horizon (distant towns), the sky above it falling to nearly nothing."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    _, _, gz = _xyz(nt, _gen(nt))
    sky = _mix(nt, _maprange(nt, gz, 0.5, 0.75, 0.0, 1.0), horizon, top)
    col = _mix(nt, _maprange(nt, gz, 0.47, 0.5, 0.0, 1.0), ground, sky)
    _link(nt, col, em.inputs["Color"])
    em.inputs["Strength"].default_value = 1.0
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    return m


def flat(name, rgb, rough=0.9):
    m, nt, b = _new(name)
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    return m


def materials():
    """The carriage's palette (base values are what they should read as, before the grade)."""
    M.clear()
    M["moquette"] = upholstery("moquette", rgb=(0.05, 0.058, 0.082))
    M["moquette_dk"] = upholstery("moquette dark", rgb=(0.03, 0.035, 0.05), wear=0.2)
    M["linen"] = linen("headrest linen", rgb=(0.5, 0.5, 0.48))
    M["shell"] = plastic("seat shell", (0.2, 0.2, 0.195), rough=(0.4, 0.55))
    M["arm"] = plastic("armrest", (0.035, 0.036, 0.04), rough=(0.5, 0.65), scuff=0.15, grime=0.2)
    M["frame"] = plastic("seat frame", (0.05, 0.052, 0.058), rough=(0.45, 0.6), scuff=0.2, peel=0.0)
    M["lining"] = lining("wall lining")
    M["lining_lo"] = lining("lower lining", rgb=(0.15, 0.155, 0.165), grime=0.5)
    M["ceiling"] = lining("ceiling panels", rgb=(0.27, 0.275, 0.28), rough=(0.6, 0.8), grime=0.25)
    M["vinyl"] = vinyl("floor vinyl")
    M["alu"] = alu("aluminium rails")
    M["alu_x"] = alu("aluminium across", axis="X")
    M["alu_dark"] = alu("anodised", rgb=(0.2, 0.205, 0.21), rough=0.38)
    M["rubber"] = rubber("gasket rubber")
    M["grille"] = grille("heater grille")
    M["glass"] = glass("window glass")
    M["door_glass"] = glass("door glass", tint=(0.8, 0.84, 0.83), refl=0.05)
    M["opal_off"] = opal("opal off", (1, 1, 1), 0.0)
    M["black"] = flat("flag black", (0.0, 0.0, 0.0), 1.0)
    M["night"] = night("night")
    M["display"] = plastic("blank display", (0.012, 0.013, 0.016), rough=(0.12, 0.2), grime=0.0, scuff=0.0, peel=0.0)
    return M
