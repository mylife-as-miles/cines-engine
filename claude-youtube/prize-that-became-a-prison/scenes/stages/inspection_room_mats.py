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


def _math_vec_add(nt, vec, offset):
    n = _n(nt, "ShaderNodeVectorMath", operation="ADD")
    _link(nt, vec, n.inputs[0])
    n.inputs[1].default_value = offset
    return n.outputs[0]


def _combine(nt, v):
    """A grey colour from a scalar socket."""
    n = _n(nt, "ShaderNodeCombineColor")
    for k in ("Red", "Green", "Blue"):
        _link(nt, v, n.inputs[k])
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


def brushed_steel(name, rgb=(0.66, 0.67, 0.69), rough=0.33, smudge=0.1, aniso=0.5, contact=0.0, ghost=None):
    """Stainless sheet brushed along local X: fine grain only (coarse streaks read as wood grain at a distance),
    with smudges, fingerprints and wipe arcs that dull the finish.

    contact > 0 darkens the sheet where something stands on it (ambient occlusion over that distance), so bags sit
    on the steel rather than float over it. ghost = (cx, cy, w, h) in object space adds a cleaner, glossier patch
    (where a bag stood), switched by the node named "ghost" (0 = off, 1 = on)."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = 1.0
    o = _obj(nt)
    fine = _noise(nt, o, 1.0, 3.0, 0.6, mapping=(3.0, 420.0, 420.0))
    coarse = _noise(nt, o, 1.0, 2.0, 0.5, mapping=(1.0, 25.0, 25.0))
    smear = _noise(nt, o, 3.2, 6.0, 0.62)
    smear_m = _maprange(nt, smear, 0.5, 0.74, 0.0, 1.0)
    # handling marks: small oval prints in clusters, and long wipe arcs from a cloth dragged across the top
    prints = _noise(nt, o, 1.0, 2.0, 0.5, mapping=(38.0, 52.0, 38.0))
    cluster = _maprange(nt, _noise(nt, o, 1.6, 2.0, 0.5), 0.52, 0.66, 0.0, 1.0)
    prints_m = _math(nt, "MULTIPLY", _maprange(nt, prints, 0.6, 0.68, 0.0, 1.0), cluster)
    wipe = _noise(nt, o, 1.0, 3.0, 0.55, mapping=(2.2, 9.0, 2.2))
    wipe_m = _maprange(nt, wipe, 0.56, 0.62, 0.0, 0.7)
    marks = _math(nt, "MAXIMUM", _math(nt, "MAXIMUM", smear_m, prints_m), wipe_m)
    r = _math(nt, "ADD", _maprange(nt, fine, 0.3, 0.7, -0.02, 0.02), _maprange(nt, coarse, 0.3, 0.7, -0.012, 0.012))
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", marks, smudge))
    r = _math(nt, "ADD", r, rough, clamp=True)
    col = _mix(nt, marks, rgb, tuple(c * 0.9 for c in rgb))
    if ghost:
        cx, cy, w, h = ghost
        sep = _n(nt, "ShaderNodeSeparateXYZ")
        _link(nt, o, sep.inputs["Vector"])
        dx = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", sep.outputs["X"], cx), 0.0)
        dy = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", sep.outputs["Y"], cy), 0.0)
        inside = _math(nt, "MULTIPLY", _maprange(nt, dx, w / 2 - 0.012, w / 2, 1.0, 0.0), _maprange(nt, dy, h / 2 - 0.012, h / 2, 1.0, 0.0))
        sw = _n(nt, "ShaderNodeValue", name="ghost", label="ghost")
        sw.outputs[0].default_value = 0.0
        g = _math(nt, "MULTIPLY", inside, sw.outputs[0])
        r = _math(nt, "SUBTRACT", r, _math(nt, "MULTIPLY", g, _math(nt, "ADD", _math(nt, "MULTIPLY", marks, smudge), 0.045)), clamp=True)
        col = _mix(nt, g, col, rgb)
    if contact:
        ao = _ao(nt, contact)
        col = _mix(nt, _maprange(nt, ao, 0.25, 1.0, 0.85, 0.0), col, tuple(c * 0.12 for c in rgb))
        r = _math(nt, "ADD", r, _maprange(nt, ao, 0.25, 1.0, 0.25, 0.0), clamp=True)
    _link(nt, r, b.inputs["Roughness"])
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Anisotropic"].default_value = aniso
    vt = _n(nt, "ShaderNodeVectorTransform", vector_type="VECTOR", convert_from="OBJECT", convert_to="WORLD")
    vt.inputs["Vector"].default_value = (1.0, 0.0, 0.0)
    _link(nt, vt.outputs["Vector"], b.inputs["Tangent"])
    _bump(nt, b, fine, 0.015, 0.0002)
    return m


def bench_steel(name, rgb=(0.30, 0.305, 0.31), metal=0.9, rough=(0.35, 0.5), aniso=0.6, contact=0.05, ghost=None):
    """The bench top: brushed stainless read as lines, not clouds. A Noise stretched 60:1 across the sheet (so it runs
    in long streaks along local X, the bench's length) drives the roughness between rough[0] and rough[1]; a finer
    grain on top; anisotropy with the tangent along X; a darker base than polished steel so the troffer's reflection
    from straight above stays below white.

    ghost = (cx, cy, w, h, deg) in object space: a rounded rectangle (the tote's footprint) blurred over 3 cm, inside
    which the sheet is cleaner and a touch shinier (roughness -0.06, reflectance +25 %), never darker. Switched by the
    Value node named "ghost" (0 = off, 1 = on)."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = metal
    o = _obj(nt)
    streak = _noise(nt, o, 1.0, 8.0, 0.62, mapping=(1.0, 60.0, 1.0))
    grain = _noise(nt, o, 1.0, 3.0, 0.6, mapping=(2.0, 700.0, 700.0))
    r = _maprange(nt, streak, 0.3, 0.7, rough[0], rough[1])
    r = _math(nt, "ADD", r, _maprange(nt, grain, 0.3, 0.7, -0.025, 0.025))
    # a few faint, large wipe marks only (no clouds): long, low and rare
    wipe = _noise(nt, o, 1.0, 2.0, 0.5, mapping=(1.4, 5.0, 1.4))
    wipe_m = _maprange(nt, wipe, 0.62, 0.7, 0.0, 1.0)
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", wipe_m, 0.05))
    col = _mix(nt, _math(nt, "MULTIPLY", _maprange(nt, streak, 0.3, 0.7, 0.0, 1.0), 0.5), rgb, tuple(c * 0.9 for c in rgb))
    if ghost:
        cx, cy, w, h, deg = ghost
        import math as _m
        cs, sn = _m.cos(_m.radians(deg)), _m.sin(_m.radians(deg))
        sep = _n(nt, "ShaderNodeSeparateXYZ")
        _link(nt, o, sep.inputs["Vector"])
        dx = _math(nt, "SUBTRACT", sep.outputs["X"], cx)
        dy = _math(nt, "SUBTRACT", sep.outputs["Y"], cy)
        u = _math(nt, "ADD", _math(nt, "MULTIPLY", dx, cs), _math(nt, "MULTIPLY", dy, sn))      # into the tote's frame
        v = _math(nt, "SUBTRACT", _math(nt, "MULTIPLY", dy, cs), _math(nt, "MULTIPLY", dx, sn))
        rad = 0.03
        ax = _math(nt, "MAXIMUM", _math(nt, "SUBTRACT", _math(nt, "ABSOLUTE", u, 0.0), w / 2 - rad), 0.0)
        ay = _math(nt, "MAXIMUM", _math(nt, "SUBTRACT", _math(nt, "ABSOLUTE", v, 0.0), h / 2 - rad), 0.0)
        dist = _math(nt, "SUBTRACT", _math(nt, "SQRT", _math(nt, "ADD", _math(nt, "MULTIPLY", ax, ax), _math(nt, "MULTIPLY", ay, ay)), 0.0), rad)
        inside = _maprange(nt, dist, -0.03, 0.0, 1.0, 0.0)
        sw = _n(nt, "ShaderNodeValue", name="ghost", label="ghost")
        sw.outputs[0].default_value = 0.0
        g = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", inside, inside), sw.outputs[0])
        r = _math(nt, "SUBTRACT", r, _math(nt, "MULTIPLY", g, 0.06))
        col = _mix(nt, g, col, tuple(min(1.0, c * 1.25) for c in rgb))
    if contact:
        ao = _ao(nt, contact)
        col = _mix(nt, _maprange(nt, ao, 0.25, 1.0, 0.8, 0.0), col, tuple(c * 0.15 for c in rgb))
        r = _math(nt, "ADD", r, _maprange(nt, ao, 0.25, 1.0, 0.2, 0.0))
    _link(nt, _math(nt, "ADD", r, 0.0, clamp=True), b.inputs["Roughness"])
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Anisotropic"].default_value = aniso
    vt = _n(nt, "ShaderNodeVectorTransform", vector_type="VECTOR", convert_from="OBJECT", convert_to="WORLD")
    vt.inputs["Vector"].default_value = (1.0, 0.0, 0.0)
    _link(nt, vt.outputs["Vector"], b.inputs["Tangent"])
    _bump(nt, b, _math(nt, "ADD", streak, _math(nt, "MULTIPLY", grain, 0.5)), 0.02, 0.0002)
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
    # block coursing first: 400 x 200 mm units, 9 mm tooled joints, joints a quarter darker; per-block tone is
    # kept small (painted block reads even), so the coursing, not blotches, carries the texture
    br = _n(nt, "ShaderNodeTexBrick", offset=0.5, offset_frequency=2, squash=1.0, squash_frequency=2)
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.009
    br.inputs["Mortar Smooth"].default_value = 0.25
    br.inputs["Brick Width"].default_value = 0.40
    br.inputs["Row Height"].default_value = 0.20
    br.inputs["Bias"].default_value = 0.0
    br.inputs["Color1"].default_value = (1.0, 1.0, 1.0, 1)
    br.inputs["Color2"].default_value = (0.95, 0.95, 0.95, 1)
    br.inputs["Mortar"].default_value = (0.75, 0.75, 0.75, 1)
    _link(nt, o, br.inputs["Vector"])
    sep = _n(nt, "ShaderNodeSeparateXYZ")
    _link(nt, o, sep.inputs["Vector"])
    z = _math(nt, "ADD", sep.outputs["Y"], height / 2)                      # local Y is up; world height
    low = _math(nt, "LESS_THAN", z, split_z)
    base = _mix(nt, low, upper, lower)
    base = _mix(nt, 1.0, base, _out(br, "Color"), "MULTIPLY")
    grime = _math(nt, "MULTIPLY", _maprange(nt, z, 0.0, 0.4, 1.0, 0.0), _maprange(nt, _noise(nt, o, 3.0, 4.0, 0.6), 0.3, 0.7, 0.75, 1.0))
    base = _mix(nt, _math(nt, "MULTIPLY", grime, 0.3), base, (0.0, 0.0, 0.0))
    ao = _ao(nt, 0.4)
    base = _mix(nt, _maprange(nt, ao, 0.4, 1.0, 0.4, 0.0), base, (0.0, 0.0, 0.0))
    _link(nt, base, b.inputs["Base Color"])
    stipple = _noise(nt, o, 160.0, 3.0, 0.7)
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", _out(br, "Fac"), -1.0), _math(nt, "MULTIPLY", stipple, 0.18))
    _bump(nt, b, h, 0.4, 0.003)
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
    # each tile its own tone (+-12 %): the tile's cell index hashed through white noise
    cell = _n(nt, "ShaderNodeVectorMath", operation="SNAP")
    cell.inputs[1].default_value = (tile, tile, 1.0)
    _link(nt, o, cell.inputs[0])
    wn = _n(nt, "ShaderNodeTexWhiteNoise", noise_dimensions="3D")
    _link(nt, _math_vec_add(nt, cell.outputs[0], (0.37, 0.11, 0.0)), wn.inputs["Vector"])
    jit = _maprange(nt, _out(wn, "Value"), 0.0, 1.0, 0.88, 1.12)
    col = _mix(nt, 1.0, col, _combine(nt, jit), "MULTIPLY")
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
    # trolley-wheel and drag marks: a few long thin streaks across the room (along X), only where a broad mask lets
    # them through, so there are two or three, not a pattern
    streak = _noise(nt, o, 1.0, 2.0, 0.45, mapping=(0.35, 9.0, 1.0))
    streak_m = _math(nt, "MULTIPLY", _maprange(nt, streak, 0.585, 0.6, 0.0, 1.0), _maprange(nt, streak, 0.615, 0.6, 0.0, 1.0))
    streak_m = _math(nt, "MULTIPLY", streak_m, _maprange(nt, _noise(nt, o, 0.45, 1.0, 0.5), 0.55, 0.62, 0.0, 1.0))
    col = _mix(nt, _math(nt, "MULTIPLY", streak_m, 0.08), col, (0.0, 0.0, 0.0))
    # grime where the mop does not reach: a dark band round the bench's footprint (2.0 x 0.8 m, centred at y = -0.2
    # in the floor's object space)
    bx = _math(nt, "ABSOLUTE", sep.outputs["X"], 0.0)
    by = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", sep.outputs["Y"], -0.2), 0.0)
    edge = _math(nt, "MINIMUM", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", bx, 1.0), 0.0), _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", by, 0.4), 0.0))
    inside = _math(nt, "MULTIPLY", _math(nt, "LESS_THAN", bx, 1.06), _math(nt, "LESS_THAN", by, 0.46))
    band = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", _maprange(nt, edge, 0.0, 0.07, 1.0, 0.0), inside),
                 _maprange(nt, _noise(nt, o, 9.0, 3.0, 0.6), 0.35, 0.65, 0.3, 1.0))
    col = _mix(nt, _math(nt, "MULTIPLY", band, 0.4), col, (0.01, 0.01, 0.009))
    ao = _ao(nt, 0.5)
    col = _mix(nt, _maprange(nt, ao, 0.35, 1.0, 0.65, 0.0), col, (0.0, 0.0, 0.0))
    _link(nt, col, b.inputs["Base Color"])
    wax = _noise(nt, o, 1.3, 4.0, 0.55)
    r = _maprange(nt, wax, 0.3, 0.7, 0.16, 0.36)
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", path, 0.22))
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", streak_m, 0.15))
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", band, 0.2))
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


def paper(name, rgb=(0.6, 0.48, 0.3), rough=0.88, fibre=0.0):
    """Manila card: matt, faint fibre streaks, slightly translucent at its thin edges. fibre > 0 adds the card's
    millimetre-scale felted tooth as a bump of that strength."""
    m, nt, b = _new(name)
    o = _obj(nt)
    fib = _noise(nt, o, 1.0, 4.0, 0.6, mapping=(90.0, 900.0, 90.0))
    blot = _noise(nt, o, 60.0, 3.0, 0.6)
    col = _mix(nt, _maprange(nt, fib, 0.3, 0.7, 0.0, 0.18), rgb, tuple(c * 0.82 for c in rgb))
    col = _mix(nt, _maprange(nt, blot, 0.6, 0.75, 0.0, 0.12), col, tuple(c * 0.7 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = 0.3
    b.inputs["Subsurface Weight"].default_value = 0.08
    b.inputs["Subsurface Radius"].default_value = (0.002, 0.0015, 0.001)
    h = fib
    if fibre:
        tooth = _noise(nt, o, 400.0, 4.0, 0.65)
        h = _math(nt, "ADD", _math(nt, "MULTIPLY", fib, 0.35), tooth)
    _bump(nt, b, h, 0.06 if not fibre else fibre, 0.0002)
    return m


def twine(name, rgb=(0.26, 0.21, 0.14), rough=0.9):
    """Jute twine: three twisted plies (a helical ridge along the cord, from the curve's own UVs: U along the cord,
    V round it), fibre fuzz, a little colour variation from ply to ply. The node "twist" holds the ridges per unit U;
    set it from the cord's length so the lay is about 3 mm."""
    m, nt, b = _new(name)
    o = _obj(nt)
    uv = _n(nt, "ShaderNodeTexCoord").outputs["UV"]
    sep = _n(nt, "ShaderNodeSeparateXYZ")
    _link(nt, uv, sep.inputs["Vector"])
    tw = _n(nt, "ShaderNodeValue", name="twist", label="twist")
    tw.outputs[0].default_value = 60.0
    phase = _math(nt, "ADD", _math(nt, "MULTIPLY", sep.outputs["X"], tw.outputs[0]), _math(nt, "MULTIPLY", sep.outputs["Y"], 3.0))
    ridge = _math(nt, "ABSOLUTE", _math(nt, "SINE", _math(nt, "MULTIPLY", phase, 3.14159), 0.0), 0.0)
    fuzz = _noise(nt, o, 2600.0, 3.0, 0.7)
    h = _math(nt, "ADD", ridge, _math(nt, "MULTIPLY", fuzz, 0.6))
    col = _mix(nt, _maprange(nt, ridge, 0.0, 1.0, 0.55, 0.0), rgb, tuple(c * 0.6 for c in rgb))
    col = _mix(nt, _maprange(nt, fuzz, 0.45, 0.75, 0.0, 0.5), col, tuple(min(1.0, c * 1.35) for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = 0.25
    b.inputs["Sheen Weight"].default_value = 0.25
    b.inputs["Sheen Roughness"].default_value = 0.6
    _bump(nt, b, h, 0.3, 0.0003)
    return m


def tune_prop(mat, spec=None, weave=None, to_metres=1.0, ceiling=None):
    """Finish a generated prop's material in place. spec sets the dielectric specular level (generated textures come
    with a plastic sheen: on dark fabric under a troffer the sheen, not the colour, is what the eye reads, so dark
    bags go grey unless it is cut). weave = (period_m, strength) adds a plain-weave bump on top of the prop's own
    normal map; `to_metres` converts the mesh's object space to metres. ceiling = rgb caps the base colour per channel
    (the case's pale moulded zip pulls go gunmetal; its dark fabric is below the cap and untouched)."""
    if not (mat and mat.use_nodes):
        return
    nt = mat.node_tree
    b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if b is None:
        return
    if spec is not None:
        b.inputs["Specular IOR Level"].default_value = spec
    if ceiling and b.inputs["Base Color"].is_linked:
        src = b.inputs["Base Color"].links[0].from_socket
        dk = _n(nt, "ShaderNodeMix", data_type="RGBA", blend_type="DARKEN")
        dk.inputs["Factor"].default_value = 1.0
        dk.inputs["B"].default_value = (*ceiling, 1.0)
        _link(nt, src, dk.inputs["A"])
        _link(nt, _out(dk), b.inputs["Base Color"])
    if weave:
        period, strength = weave
        o = _obj(nt)
        sep = _n(nt, "ShaderNodeSeparateXYZ")
        _link(nt, o, sep.inputs["Vector"])
        k = 2 * 3.14159265 * to_metres / period
        waves = [_math(nt, "SINE", _math(nt, "MULTIPLY", sep.outputs[a], k), 0.0) for a in ("X", "Y", "Z")]
        # warp and weft cross at right angles: the product of two waves gives the over-under basket of a plain weave
        h = _math(nt, "ADD", _math(nt, "MULTIPLY", waves[0], waves[1]), _math(nt, "MULTIPLY", waves[1], waves[2]))
        h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", waves[2], waves[0]))
        h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", _noise(nt, o, 1.0, 2.0, 0.5, mapping=(k / 8,) * 3), 0.6))
        bump = _n(nt, "ShaderNodeBump")
        bump.inputs["Strength"].default_value = strength
        bump.inputs["Distance"].default_value = period * 0.25
        _link(nt, h, bump.inputs["Height"])
        nrm = b.inputs["Normal"]
        if nrm.is_linked:
            _link(nt, nrm.links[0].from_socket, bump.inputs["Normal"])
        _link(nt, bump.outputs["Normal"], nrm)


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
    sv = _n(nt, "ShaderNodeValue", name="strength", label="strength")   # per camera, a stage may change it
    sv.outputs[0].default_value = strength
    strength = sv.outputs[0]
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
        _link(nt, strength, em.inputs["Strength"])
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m
