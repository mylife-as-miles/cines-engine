"""Materials for the inspection room (Cycles, Principled BSDF): worn institutional surfaces with roughness variation.

Every material works in object space, so a part keeps its pattern wherever it is put. Walls are built in their own
XY plane (local Y is up), which lets one block-wall material serve all four walls.
"""
import bpy  # noqa: F401  (first: bmesh and mathutils only exist once bpy is loaded)


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
    outs = [o for o in n.outputs if o.enabled and (name is None or name in (o.name, o.identifier) or alias.get(name) in (o.name, o.identifier))]
    return outs[0]


def _link(nt, a, b):
    nt.links.new(a, b)


def _maprange(nt, src, a, b, c, d):
    n = _n(nt, "ShaderNodeMapRange")
    n.inputs["From Min"].default_value, n.inputs["From Max"].default_value = a, b
    n.inputs["To Min"].default_value, n.inputs["To Max"].default_value = c, d
    _link(nt, src, n.inputs["Value"])
    return _out(n, "Result")


def _math(nt, op, a, b, clamp=False):
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
        s = n.inputs[sock]
        if isinstance(v, (int, float)):
            s.default_value = v
        elif isinstance(v, tuple):
            s.default_value = (*v[:3], 1.0)
        else:
            _link(nt, v, s)
    return _out(n)


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


def _bump(nt, b, height, strength, distance):
    n = _n(nt, "ShaderNodeBump")
    n.inputs["Strength"].default_value = strength
    n.inputs["Distance"].default_value = distance
    _link(nt, height, n.inputs["Height"])
    _link(nt, n.outputs["Normal"], b.inputs["Normal"])
    return n


def _obj(nt):
    return _n(nt, "ShaderNodeTexCoord").outputs["Object"]


def _ao(nt, distance=0.35):
    n = _n(nt, "ShaderNodeAmbientOcclusion", samples=4)
    n.inputs["Distance"].default_value = distance
    return n.outputs["AO"]


def brushed_steel(name, rgb=(0.66, 0.67, 0.69), rough=0.33, smudge=0.1, aniso=0.5):
    """Stainless sheet brushed along local X: fine grain only (coarse streaks read as wood grain at a distance),
    with smudges and handling marks that dull the finish."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = 1.0
    o = _obj(nt)
    fine = _noise(nt, o, 1.0, 3.0, 0.6, mapping=(3.0, 420.0, 420.0))
    coarse = _noise(nt, o, 1.0, 2.0, 0.5, mapping=(1.0, 25.0, 25.0))
    smear = _noise(nt, o, 3.2, 6.0, 0.62)
    smear_m = _maprange(nt, smear, 0.5, 0.74, 0.0, 1.0)
    r = _math(nt, "ADD", _maprange(nt, fine, 0.3, 0.7, -0.02, 0.02), _maprange(nt, coarse, 0.3, 0.7, -0.012, 0.012))
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", smear_m, smudge))
    r = _math(nt, "ADD", r, rough, clamp=True)
    _link(nt, r, b.inputs["Roughness"])
    _link(nt, _mix(nt, smear_m, rgb, tuple(c * 0.94 for c in rgb)), b.inputs["Base Color"])
    b.inputs["Anisotropic"].default_value = aniso
    vt = _n(nt, "ShaderNodeVectorTransform", vector_type="VECTOR", convert_from="OBJECT", convert_to="WORLD")
    vt.inputs["Vector"].default_value = (1.0, 0.0, 0.0)
    _link(nt, vt.outputs["Vector"], b.inputs["Tangent"])
    _bump(nt, b, fine, 0.015, 0.0002)
    return m


def satin_metal(name, rgb, rough=0.35):
    """Painted or plated hardware: a little roughness variation, no brushing."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = 1.0
    o = _obj(nt)
    n = _noise(nt, o, 18.0, 3.0, 0.6)
    _link(nt, _math(nt, "ADD", _maprange(nt, n, 0.3, 0.7, -0.06, 0.06), rough, clamp=True), b.inputs["Roughness"])
    b.inputs["Base Color"].default_value = (*rgb, 1)
    return m


def paint(name, rgb, rough=0.55, bump=0.08):
    """Painted steel or board: orange-peel bump, mild roughness variation, darker where hands and dirt reach."""
    m, nt, b = _new(name)
    o = _obj(nt)
    peel = _noise(nt, o, 220.0, 2.0, 0.5)
    wear = _noise(nt, o, 4.0, 5.0, 0.6)
    _link(nt, _math(nt, "ADD", _maprange(nt, wear, 0.35, 0.75, -0.06, 0.12), rough, clamp=True), b.inputs["Roughness"])
    _link(nt, _mix(nt, _maprange(nt, wear, 0.5, 0.8, 0.0, 1.0), rgb, tuple(c * 0.8 for c in rgb)), b.inputs["Base Color"])
    _bump(nt, b, peel, bump, 0.0004)
    return m


def plastic(name, rgb, rough=0.5, spec=0.5):
    m, nt, b = _new(name)
    o = _obj(nt)
    n = _noise(nt, o, 9.0, 4.0, 0.6)
    scuff = _noise(nt, o, 30.0, 3.0, 0.7, mapping=(1.0, 6.0, 1.0))
    sc = _maprange(nt, scuff, 0.6, 0.72, 0.0, 1.0)
    r = _math(nt, "ADD", _maprange(nt, n, 0.3, 0.7, -0.07, 0.07), _math(nt, "MULTIPLY", sc, 0.18))
    _link(nt, _math(nt, "ADD", r, rough, clamp=True), b.inputs["Roughness"])
    _link(nt, _mix(nt, sc, rgb, tuple(min(1.0, c * 1.25) for c in rgb)), b.inputs["Base Color"])
    b.inputs["Specular IOR Level"].default_value = spec
    _bump(nt, b, _noise(nt, o, 400.0, 1.0, 0.5), 0.03, 0.0002)
    return m


def rubber(name, rgb=(0.02, 0.02, 0.022), rough=0.72):
    m, nt, b = _new(name)
    o = _obj(nt)
    n = _noise(nt, o, 25.0, 3.0, 0.6)
    _link(nt, _math(nt, "ADD", _maprange(nt, n, 0.3, 0.7, -0.1, 0.1), rough, clamp=True), b.inputs["Roughness"])
    b.inputs["Base Color"].default_value = (*rgb, 1)
    return m


def block_wall(name, upper, lower, split_z, height, rough=0.8):
    """Painted concrete block (400 x 200 mm, running bond): two-tone paint split at `split_z` (world height), mortar
    joints as bump, grime rising from the floor and settling into corners (ambient occlusion)."""
    m, nt, b = _new(name)
    o = _obj(nt)
    br = _n(nt, "ShaderNodeTexBrick", offset=0.5, offset_frequency=2, squash=1.0, squash_frequency=2)
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.007
    br.inputs["Mortar Smooth"].default_value = 0.35
    br.inputs["Brick Width"].default_value = 0.40
    br.inputs["Row Height"].default_value = 0.20
    br.inputs["Bias"].default_value = 0.0
    br.inputs["Color1"].default_value = (1.0, 1.0, 1.0, 1)
    br.inputs["Color2"].default_value = (0.9, 0.9, 0.9, 1)
    br.inputs["Mortar"].default_value = (0.82, 0.82, 0.82, 1)
    _link(nt, o, br.inputs["Vector"])
    sep = _n(nt, "ShaderNodeSeparateXYZ")
    _link(nt, o, sep.inputs["Vector"])
    z = _math(nt, "ADD", sep.outputs["Y"], height / 2)                      # local Y is up; world height
    low = _math(nt, "LESS_THAN", z, split_z)
    base = _mix(nt, low, upper, lower)
    base = _mix(nt, 1.0, base, _out(br, "Color"), "MULTIPLY")
    grime = _math(nt, "MULTIPLY", _maprange(nt, z, 0.0, 0.45, 1.0, 0.0), _maprange(nt, _noise(nt, o, 3.0, 4.0, 0.6), 0.3, 0.7, 0.5, 1.0))
    base = _mix(nt, _math(nt, "MULTIPLY", grime, 0.45), base, (0.0, 0.0, 0.0))
    ao = _ao(nt, 0.4)
    base = _mix(nt, _maprange(nt, ao, 0.4, 1.0, 0.5, 0.0), base, (0.0, 0.0, 0.0))
    _link(nt, base, b.inputs["Base Color"])
    stipple = _noise(nt, o, 160.0, 3.0, 0.7)
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", _out(br, "Fac"), -1.0), _math(nt, "MULTIPLY", stipple, 0.25))
    _bump(nt, b, h, 0.35, 0.002)
    r = _math(nt, "ADD", _maprange(nt, stipple, 0.3, 0.7, -0.08, 0.06), rough)
    r = _math(nt, "SUBTRACT", r, _math(nt, "MULTIPLY", low, 0.22), clamp=True)   # the lower band is a tougher, satin paint
    _link(nt, r, b.inputs["Roughness"])
    return m


def vinyl_floor(name, tile=0.305, c1=(0.105, 0.11, 0.11), c2=(0.075, 0.08, 0.082)):
    """Vinyl composition tile: per-tile tone, speckle chips, worn wax around the bench, heel scuffs, dirty joints."""
    m, nt, b = _new(name)
    o = _obj(nt)
    br = _n(nt, "ShaderNodeTexBrick", offset=0.0, squash=1.0)
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.0018
    br.inputs["Mortar Smooth"].default_value = 0.2
    br.inputs["Brick Width"].default_value = tile
    br.inputs["Row Height"].default_value = tile
    br.inputs["Bias"].default_value = 0.0
    br.inputs["Color1"].default_value = (*c1, 1)
    br.inputs["Color2"].default_value = (*c2, 1)
    br.inputs["Mortar"].default_value = (0.02, 0.02, 0.02, 1)
    _link(nt, o, br.inputs["Vector"])
    col = _out(br, "Color")
    chips = _noise(nt, o, 140.0, 2.0, 0.5)
    col = _mix(nt, _maprange(nt, chips, 0.55, 0.75, 0.0, 0.35), col, (0.2, 0.21, 0.21))
    col = _mix(nt, _maprange(nt, chips, 0.25, 0.4, 0.3, 0.0), col, (0.02, 0.02, 0.02))
    scuff = _noise(nt, o, 7.0, 4.0, 0.65, mapping=(1.0, 7.0, 1.0))
    scuff_m = _maprange(nt, scuff, 0.64, 0.74, 0.0, 1.0)
    col = _mix(nt, _math(nt, "MULTIPLY", scuff_m, 0.7), col, (0.012, 0.012, 0.012))
    # a traffic path: the floor in front of and around the bench is duller and greyer
    sep = _n(nt, "ShaderNodeSeparateXYZ")
    _link(nt, o, sep.inputs["Vector"])
    dx = _math(nt, "MULTIPLY", sep.outputs["X"], 0.55)
    dy = _math(nt, "SUBTRACT", sep.outputs["Y"], -0.2)
    d = _math(nt, "SQRT", _math(nt, "ADD", _math(nt, "MULTIPLY", dx, dx), _math(nt, "MULTIPLY", dy, dy)), 0.0)
    path = _math(nt, "MULTIPLY", _maprange(nt, d, 0.4, 1.6, 1.0, 0.0), _maprange(nt, _noise(nt, o, 2.2, 5.0, 0.6), 0.35, 0.65, 0.4, 1.0))
    col = _mix(nt, _math(nt, "MULTIPLY", path, 0.35), col, (0.16, 0.165, 0.165))
    ao = _ao(nt, 0.5)
    col = _mix(nt, _maprange(nt, ao, 0.35, 1.0, 0.65, 0.0), col, (0.0, 0.0, 0.0))
    _link(nt, col, b.inputs["Base Color"])
    wax = _noise(nt, o, 1.3, 4.0, 0.55)
    r = _maprange(nt, wax, 0.3, 0.7, 0.16, 0.36)
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", path, 0.22))
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", scuff_m, 0.25))
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", _out(br, "Fac"), 0.4), clamp=True)
    _link(nt, r, b.inputs["Roughness"])
    _bump(nt, b, _math(nt, "MULTIPLY", _out(br, "Fac"), -1.0), 0.25, 0.0015)
    return m


def ceiling_tile(name, rgb=(0.5, 0.51, 0.5)):
    """Mineral-fibre lay-in tile: fissured, matt, a little uneven from tile to tile."""
    m, nt, b = _new(name)
    o = _obj(nt)
    rnd = _n(nt, "ShaderNodeObjectInfo").outputs["Random"]            # each tile its own tone and stains
    tone = _mix(nt, rnd, rgb, tuple(c * 0.88 for c in rgb))
    st = _n(nt, "ShaderNodeTexNoise", noise_dimensions="4D")
    st.inputs["Scale"].default_value = 1.6
    st.inputs["Detail"].default_value = 5.0
    _link(nt, o, st.inputs["Vector"])
    _link(nt, _math(nt, "MULTIPLY", rnd, 40.0), st.inputs["W"])
    stain = _maprange(nt, st.outputs["Fac"], 0.6, 0.8, 0.0, 0.25)
    _link(nt, _mix(nt, stain, tone, (0.25, 0.23, 0.2)), b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.95
    fis = _noise(nt, o, 90.0, 3.0, 0.75)
    _bump(nt, b, _maprange(nt, fis, 0.55, 0.7, 0.0, 1.0), 0.6, 0.0012)
    return m


def paper(name, rgb=(0.6, 0.48, 0.3)):
    """Manila card: matt, faint fibre streaks, slightly translucent at its thin edges."""
    m, nt, b = _new(name)
    o = _obj(nt)
    fib = _noise(nt, o, 1.0, 4.0, 0.6, mapping=(90.0, 900.0, 90.0))
    blot = _noise(nt, o, 60.0, 3.0, 0.6)
    col = _mix(nt, _maprange(nt, fib, 0.3, 0.7, 0.0, 0.18), rgb, tuple(c * 0.82 for c in rgb))
    col = _mix(nt, _maprange(nt, blot, 0.6, 0.75, 0.0, 0.12), col, tuple(c * 0.7 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.88
    b.inputs["Subsurface Weight"].default_value = 0.08
    b.inputs["Subsurface Radius"].default_value = (0.002, 0.0015, 0.001)
    _bump(nt, b, fib, 0.06, 0.0002)
    return m


def twine(name, rgb=(0.4, 0.38, 0.34)):
    m, nt, b = _new(name)
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = 0.95
    b.inputs["Sheen Weight"].default_value = 0.3
    return m


def glow(name, rgb, strength, pattern=None):
    """An emitter: `pattern` "tubes" gives a troffer lens three soft bright bands along local X; "wire" a wired-glass
    grid; None a flat glow."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    o = _obj(nt)
    s = strength
    if pattern == "tubes":
        # Blender's bands run at 20 * scale radians per unit: scale 1.571 gives a 0.2 m period, so with the phase
        # turned half a cycle the three tubes sit at y = -0.2, 0, +0.2 behind the lens
        wv = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="Y", wave_profile="SIN")
        wv.inputs["Scale"].default_value = 1.571
        wv.inputs["Distortion"].default_value = 0.0
        wv.inputs["Detail"].default_value = 0.0
        if "Phase Offset" in wv.inputs:
            wv.inputs["Phase Offset"].default_value = 3.1416
        _link(nt, o, wv.inputs["Vector"])
        band = _math(nt, "POWER", _out(wv, "Fac"), 3.0)
        prism = _maprange(nt, _noise(nt, o, 400.0, 1.0, 0.5), 0.3, 0.7, 0.94, 1.06)
        s = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", _maprange(nt, band, 0.0, 1.0, 0.72, 1.12), prism), strength)
        _link(nt, s, em.inputs["Strength"])
    elif pattern == "wire":
        br = _n(nt, "ShaderNodeTexBrick", offset=0.0, squash=1.0)
        br.inputs["Scale"].default_value = 1.0
        br.inputs["Mortar Size"].default_value = 0.0012
        br.inputs["Brick Width"].default_value = 0.0254
        br.inputs["Row Height"].default_value = 0.0254
        _link(nt, o, br.inputs["Vector"])
        s = _math(nt, "MULTIPLY", _maprange(nt, _out(br, "Fac"), 0.0, 1.0, 1.0, 0.08), strength)
        _link(nt, s, em.inputs["Strength"])
    else:
        em.inputs["Strength"].default_value = strength
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m
