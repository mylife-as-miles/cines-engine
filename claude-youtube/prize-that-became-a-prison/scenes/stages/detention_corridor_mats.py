"""Materials for the detention corridor and its visitation room (Cycles, Principled BSDF).

Walls and floors work in WORLD space (metres), so a wall built from several boxes (it has holes for the cell doors)
keeps one unbroken block coursing and one floor keeps its joints. Small parts work in object space. No surface is one
flat value: tone and roughness always vary, and wear sits where hands, feet, trolleys and mops reach.

Node helpers are copied from inspection_room_mats / departure_gate_mats (the Mix-node lookup is the departure gate's,
which picks the colour sockets explicitly).
"""
import bpy  # noqa: F401  (first: bmesh and mathutils only exist once bpy is loaded)


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


def _vec(nt, x, y, z):
    c = _n(nt, "ShaderNodeCombineXYZ")
    for k, v in zip("XYZ", (x, y, z)):
        if isinstance(v, (int, float)):
            c.inputs[k].default_value = v
        else:
            _link(nt, v, c.inputs[k])
    return c.outputs[0]


def _ao(nt, distance=0.35):
    n = _n(nt, "ShaderNodeAmbientOcclusion", samples=4)
    n.inputs["Distance"].default_value = distance
    return n.outputs["AO"]


def _band(nt, v, lo, hi, soft=0.003):
    """1 inside [lo, hi] of a scalar, 0 outside, with soft edges."""
    a = _maprange(nt, v, lo - soft, lo + soft, 0.0, 1.0)
    b = _maprange(nt, v, hi + soft, hi - soft, 0.0, 1.0)
    return _math(nt, "MULTIPLY", a, b)


# ---------------------------------------------------------------- walls, floors, ceilings (world space)
def block_wall(name, upper, lower, split_z=1.2, axis="y", stripe=(0.028, 0.034, 0.042), stripe_w=0.045,
               rough_upper=0.84, rough_lower=0.38, scuffs=1.0, grime=0.3):
    """Painted concrete block (400 x 200 mm, running bond) in world space. `axis` is the direction the wall runs
    ("y" for the corridor's side walls, "x" for end walls). Two-tone paint: a tough satin dado below `split_z`
    (it catches the fittings as soft streaks) and matt emulsion above, a dark painted stripe at the split. Mortar
    joints as bump and a little darker; heel and trolley scuffs, chipped paint and grime low on the dado; dirt
    settling into corners (ambient occlusion)."""
    m, nt, b = _new(name)
    wx, wy, wz = _xyz(nt, _world(nt))
    u, depth = (wy, wx) if axis == "y" else (wx, wy)
    vec = _vec(nt, u, wz, depth)
    br = _n(nt, "ShaderNodeTexBrick", offset=0.5, offset_frequency=2, squash=1.0, squash_frequency=2)
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.0065
    br.inputs["Mortar Smooth"].default_value = 0.3
    br.inputs["Brick Width"].default_value = 0.40
    br.inputs["Row Height"].default_value = 0.20
    br.inputs["Bias"].default_value = 0.0
    br.inputs["Color1"].default_value = (1.0, 1.0, 1.0, 1)
    br.inputs["Color2"].default_value = (0.955, 0.955, 0.955, 1)
    br.inputs["Mortar"].default_value = (0.86, 0.86, 0.86, 1)
    _link(nt, vec, br.inputs["Vector"])
    low = _math(nt, "LESS_THAN", wz, split_z - stripe_w / 2)
    strip = _band(nt, wz, split_z - stripe_w / 2, split_z + stripe_w / 2, 0.0015)
    base = _mix(nt, low, upper, lower)
    base = _mix(nt, strip, base, stripe)
    # broad, faint unevenness of the paint (rollered patches, a touch-up here and there)
    patch = _noise(nt, vec, 0.9, 3.0, 0.55)
    base = _mix(nt, _maprange(nt, patch, 0.35, 0.7, 0.0, 0.12), base, tuple(c * 0.86 for c in upper))
    base = _mix(nt, 1.0, base, _out(br, "Color"), "MULTIPLY")
    # scuffs: long thin dark marks low on the dado (heels, trolleys, mop buckets), only where a broad mask allows
    sc = _noise(nt, vec, 1.0, 3.0, 0.6, mapping=(2.0, 34.0, 2.0))
    sc_m = _maprange(nt, sc, 0.63, 0.71, 0.0, 1.0)
    sc_m = _math(nt, "MULTIPLY", sc_m, _maprange(nt, _noise(nt, vec, 0.6, 2.0, 0.5), 0.45, 0.6, 0.0, 1.0))
    sc_m = _math(nt, "MULTIPLY", sc_m, _maprange(nt, wz, 0.75, 0.35, 0.0, 1.0))
    sc_m = _math(nt, "MULTIPLY", sc_m, scuffs)
    base = _mix(nt, _math(nt, "MULTIPLY", sc_m, 0.75), base, (0.012, 0.012, 0.013))
    # chipped paint: small spots of bare grey block, mostly on the lower half
    chip = _noise(nt, vec, 38.0, 3.0, 0.7)
    chip_m = _maprange(nt, chip, 0.74, 0.79, 0.0, 1.0)
    chip_m = _math(nt, "MULTIPLY", chip_m, _maprange(nt, _noise(nt, vec, 2.2, 2.0, 0.5), 0.55, 0.7, 0.0, 1.0))
    chip_m = _math(nt, "MULTIPLY", chip_m, _maprange(nt, wz, 1.4, 0.6, 0.2, 1.0))
    base = _mix(nt, chip_m, base, (0.14, 0.14, 0.135))
    g = _math(nt, "MULTIPLY", _maprange(nt, wz, 0.0, 0.35, 1.0, 0.0), _maprange(nt, _noise(nt, vec, 3.0, 4.0, 0.6), 0.3, 0.7, 0.6, 1.0))
    base = _mix(nt, _math(nt, "MULTIPLY", g, grime), base, (0.01, 0.01, 0.01))
    ao = _ao(nt, 0.4)
    base = _mix(nt, _maprange(nt, ao, 0.4, 1.0, 0.45, 0.0), base, (0.0, 0.0, 0.0))
    _link(nt, base, b.inputs["Base Color"])
    stipple = _noise(nt, vec, 170.0, 3.0, 0.7)
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", _out(br, "Fac"), -1.0), _math(nt, "MULTIPLY", stipple, 0.16))
    _bump(nt, b, h, 0.42, 0.003)
    r_up = _math(nt, "ADD", _maprange(nt, stipple, 0.3, 0.7, -0.06, 0.06), rough_upper)
    r_lo = _math(nt, "ADD", _maprange(nt, patch, 0.3, 0.7, -0.08, 0.1), rough_lower)
    r = _math(nt, "ADD", r_up, _math(nt, "MULTIPLY", low, _math(nt, "SUBTRACT", r_lo, r_up)))
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", sc_m, 0.3))
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", chip_m, 0.5))
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", _out(br, "Fac"), 0.25), clamp=True)
    _link(nt, r, b.inputs["Roughness"])
    return m


def _combine1(nt, v):
    """A grey colour from a scalar socket."""
    n = _n(nt, "ShaderNodeCombineColor")
    for k in ("Red", "Green", "Blue"):
        _link(nt, v, n.inputs[k])
    return n.outputs[0]


def floor_paint(name, paint=(0.062, 0.07, 0.072), bare=(0.13, 0.126, 0.118), path_w=0.55, lines=0.0,
                line_rgb=(0.34, 0.30, 0.17), joint=2.4, joint_off=0.0, drain=None, rough=0.24):
    """Painted (epoxy) concrete floor in world space: satin paint that shows the fittings as soft reflections, worn
    through to grey concrete along the walking line down the middle (|x| < path_w), heel marks, saw-cut joints
    across every `joint` metres, optional worn painted guide lines at |x| = `lines`, and a damp, darker, glossier
    patch with rust staining round the floor drain at `drain` = (x, y)."""
    m, nt, b = _new(name)
    p = _world(nt)
    wx, wy, wz = _xyz(nt, p)
    ax = _math(nt, "ABSOLUTE", wx)
    big = _noise(nt, p, 0.7, 4.0, 0.6)
    edge = _math(nt, "ADD", ax, _maprange(nt, big, 0.3, 0.7, -0.25, 0.25))
    path = _maprange(nt, edge, path_w - 0.15, path_w + 0.25, 1.0, 0.0)
    path = _math(nt, "MULTIPLY", path, _maprange(nt, _noise(nt, p, 2.4, 5.0, 0.6), 0.3, 0.7, 0.55, 1.0))
    # paint worn through in a speckled, ragged way where the path is
    pit = _noise(nt, p, 26.0, 4.0, 0.65)
    worn = _maprange(nt, _math(nt, "ADD", pit, _math(nt, "MULTIPLY", path, 0.42)), 0.78, 0.86, 0.0, 1.0)
    col = _mix(nt, _maprange(nt, big, 0.3, 0.7, 0.0, 0.25), paint, tuple(c * 1.25 for c in paint))
    col = _mix(nt, _math(nt, "MULTIPLY", path, 0.35), col, tuple(c * 1.35 for c in paint))
    conc = _mix(nt, _maprange(nt, _noise(nt, p, 60.0, 3.0, 0.6), 0.3, 0.7, 0.0, 1.0), bare, tuple(c * 0.75 for c in bare))
    col = _mix(nt, worn, col, conc)
    if lines:
        ln = _band(nt, ax, lines - 0.025, lines + 0.025, 0.002)
        ln_w = _maprange(nt, _noise(nt, p, 9.0, 4.0, 0.65), 0.42, 0.62, 0.0, 0.85)
        ln = _math(nt, "MULTIPLY", ln, ln_w)
        col = _mix(nt, ln, col, line_rgb)
    else:
        ln = None
    heel = _noise(nt, p, 1.0, 3.0, 0.6, mapping=(9.0, 3.0, 9.0))
    heel_m = _math(nt, "MULTIPLY", _maprange(nt, heel, 0.68, 0.74, 0.0, 1.0), _maprange(nt, _noise(nt, p, 1.3, 2.0, 0.5), 0.5, 0.62, 0.0, 1.0))
    col = _mix(nt, _math(nt, "MULTIPLY", heel_m, 0.65), col, (0.008, 0.008, 0.008))
    # saw-cut joints across the corridor
    t = _math(nt, "DIVIDE", _math(nt, "SUBTRACT", wy, joint_off), joint)
    f = _math(nt, "FRACT", t)
    d = _math(nt, "MULTIPLY", _math(nt, "MINIMUM", f, _math(nt, "SUBTRACT", 1.0, f)), joint)
    jm = _maprange(nt, d, 0.0035, 0.0015, 0.0, 1.0)
    col = _mix(nt, _math(nt, "MULTIPLY", jm, 0.85), col, (0.01, 0.01, 0.01))
    wet = None
    if drain:
        dx = _math(nt, "SUBTRACT", wx, drain[0])
        dy = _math(nt, "SUBTRACT", wy, drain[1])
        r = _math(nt, "SQRT", _math(nt, "ADD", _math(nt, "MULTIPLY", dx, dx), _math(nt, "MULTIPLY", dy, dy)))
        r = _math(nt, "ADD", r, _maprange(nt, _noise(nt, p, 3.5, 4.0, 0.6), 0.3, 0.7, -0.12, 0.12))
        wet = _maprange(nt, r, 0.16, 0.55, 1.0, 0.0)
        rust = _math(nt, "MULTIPLY", _maprange(nt, r, 0.12, 0.32, 0.8, 0.0), _maprange(nt, _noise(nt, p, 14.0, 3.0, 0.6), 0.35, 0.65, 0.3, 1.0))
        col = _mix(nt, _math(nt, "MULTIPLY", rust, 0.6), col, (0.075, 0.045, 0.022))
        col = _mix(nt, _math(nt, "MULTIPLY", wet, 0.45), col, tuple(c * 0.55 for c in paint))
    ao = _ao(nt, 0.45)
    col = _mix(nt, _maprange(nt, ao, 0.35, 1.0, 0.7, 0.0), col, (0.0, 0.0, 0.0))
    _link(nt, col, b.inputs["Base Color"])
    rr = _maprange(nt, _noise(nt, p, 1.6, 4.0, 0.55), 0.3, 0.7, rough - 0.07, rough + 0.12)
    rr = _math(nt, "ADD", rr, _math(nt, "MULTIPLY", path, 0.12))
    rr = _math(nt, "ADD", rr, _math(nt, "MULTIPLY", worn, 0.35))
    rr = _math(nt, "ADD", rr, _math(nt, "MULTIPLY", heel_m, 0.2))
    rr = _math(nt, "ADD", rr, _math(nt, "MULTIPLY", jm, 0.5))
    if ln is not None:
        rr = _math(nt, "ADD", rr, _math(nt, "MULTIPLY", ln, 0.1))
    if wet is not None:
        rr = _math(nt, "SUBTRACT", rr, _math(nt, "MULTIPLY", wet, 0.2))
    rr = _math(nt, "MAXIMUM", _math(nt, "MINIMUM", rr, 0.95), 0.05)
    _link(nt, rr, b.inputs["Roughness"])
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", jm, -1.0), _math(nt, "MULTIPLY", worn, -0.25))
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", _noise(nt, p, 300.0, 2.0, 0.5), 0.06))
    _bump(nt, b, h, 0.3, 0.002)
    return m


def tile_floor(name, tile=0.305, c1=(0.085, 0.088, 0.088), c2=(0.064, 0.068, 0.07)):
    """Vinyl composition tile (the visitation room): per-tile tone, speckle chips, scuffs, wax that varies, dirty
    joints and corners."""
    m, nt, b = _new(name)
    p = _world(nt)
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
    _link(nt, p, br.inputs["Vector"])
    col = _out(br, "Color")
    cell = _n(nt, "ShaderNodeVectorMath", operation="SNAP")
    cell.inputs[1].default_value = (tile, tile, 1.0)
    _link(nt, p, cell.inputs[0])
    wn = _n(nt, "ShaderNodeTexWhiteNoise", noise_dimensions="3D")
    _link(nt, cell.outputs[0], wn.inputs["Vector"])
    jit = _maprange(nt, _out(wn, "Value"), 0.0, 1.0, 0.86, 1.14)
    col = _mix(nt, 1.0, col, _combine1(nt, jit), "MULTIPLY")
    chips = _noise(nt, p, 140.0, 2.0, 0.5)
    col = _mix(nt, _maprange(nt, chips, 0.56, 0.76, 0.0, 0.3), col, (0.2, 0.2, 0.19))
    scuff = _noise(nt, p, 7.0, 4.0, 0.65, mapping=(1.0, 6.0, 1.0))
    scuff_m = _maprange(nt, scuff, 0.64, 0.74, 0.0, 1.0)
    col = _mix(nt, _math(nt, "MULTIPLY", scuff_m, 0.6), col, (0.012, 0.012, 0.012))
    ao = _ao(nt, 0.5)
    col = _mix(nt, _maprange(nt, ao, 0.35, 1.0, 0.7, 0.0), col, (0.0, 0.0, 0.0))
    _link(nt, col, b.inputs["Base Color"])
    wax = _noise(nt, p, 1.3, 4.0, 0.55)
    r = _maprange(nt, wax, 0.3, 0.7, 0.2, 0.42)
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", scuff_m, 0.25))
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", _out(br, "Fac"), 0.4), clamp=True)
    _link(nt, r, b.inputs["Roughness"])
    _bump(nt, b, _math(nt, "MULTIPLY", _out(br, "Fac"), -1.0), 0.25, 0.0015)
    return m


def soffit(name, rgb=(0.16, 0.162, 0.16)):
    """Painted concrete soffit: matt, faint board-formed banding, water stains and dust."""
    m, nt, b = _new(name)
    p = _world(nt)
    bands = _noise(nt, p, 1.0, 2.0, 0.5, mapping=(0.6, 6.0, 0.6))
    col = _mix(nt, _maprange(nt, bands, 0.3, 0.7, 0.0, 0.18), rgb, tuple(c * 0.85 for c in rgb))
    st = _noise(nt, p, 0.8, 5.0, 0.6)
    col = _mix(nt, _maprange(nt, st, 0.62, 0.78, 0.0, 0.35), col, (0.09, 0.08, 0.065))
    ao = _ao(nt, 0.3)
    col = _mix(nt, _maprange(nt, ao, 0.4, 1.0, 0.5, 0.0), col, (0.0, 0.0, 0.0))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.92
    _bump(nt, b, _noise(nt, p, 120.0, 3.0, 0.7), 0.15, 0.001)
    return m


# ---------------------------------------------------------------- small parts (object space)
def satin_metal(name, rgb, rough=0.35):
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = 1.0
    o = _obj(nt)
    n = _noise(nt, o, 18.0, 3.0, 0.6)
    _link(nt, _math(nt, "ADD", _maprange(nt, n, 0.3, 0.7, -0.07, 0.07), rough, clamp=True), b.inputs["Roughness"])
    smear = _maprange(nt, _noise(nt, o, 5.0, 4.0, 0.6), 0.55, 0.75, 0.0, 1.0)
    _link(nt, _mix(nt, smear, rgb, tuple(c * 0.75 for c in rgb)), b.inputs["Base Color"])
    return m


def brushed(name, rgb=(0.5, 0.51, 0.52), rough=0.3, aniso=0.6, smudge=0.2):
    """Stainless brushed along local X: fine grain, smudges and wipe marks dull it."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = 1.0
    o = _obj(nt)
    fine = _noise(nt, o, 1.0, 3.0, 0.6, mapping=(3.0, 420.0, 420.0))
    smear = _maprange(nt, _noise(nt, o, 3.2, 6.0, 0.62), 0.5, 0.74, 0.0, 1.0)
    r = _math(nt, "ADD", _maprange(nt, fine, 0.3, 0.7, -0.02, 0.02), _math(nt, "MULTIPLY", smear, smudge))
    _link(nt, _math(nt, "ADD", r, rough, clamp=True), b.inputs["Roughness"])
    _link(nt, _mix(nt, smear, rgb, tuple(c * 0.85 for c in rgb)), b.inputs["Base Color"])
    b.inputs["Anisotropic"].default_value = aniso
    _bump(nt, b, fine, 0.012, 0.0002)
    return m


def paint(name, rgb, rough=0.5, bump=0.06, wear=0.2, edge_rgb=None):
    """Painted steel: orange-peel bump, mild roughness variation, darker where hands and dirt reach. With
    `edge_rgb`, chips of that colour show through on convex edges (pointiness-free: a noise mask)."""
    m, nt, b = _new(name)
    o = _obj(nt)
    peel = _noise(nt, o, 220.0, 2.0, 0.5)
    w = _noise(nt, o, 4.0, 5.0, 0.6)
    _link(nt, _math(nt, "ADD", _maprange(nt, w, 0.35, 0.75, -0.06, 0.14), rough, clamp=True), b.inputs["Roughness"])
    col = _mix(nt, _maprange(nt, w, 0.5, 0.8, 0.0, wear), rgb, tuple(c * 0.6 for c in rgb))
    if edge_rgb:
        ch = _maprange(nt, _noise(nt, o, 30.0, 3.0, 0.7), 0.72, 0.78, 0.0, 1.0)
        col = _mix(nt, ch, col, edge_rgb)
    _link(nt, col, b.inputs["Base Color"])
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


def laminate(name, rgb=(0.12, 0.124, 0.12), rough=0.52):
    """A worn grey high-pressure laminate table top: fine speckle, a matt-ish finish (so the pendant does not turn
    it into a white sheet), polished where arms rest, fine scratches, ring stains."""
    m, nt, b = _new(name)
    o = _obj(nt)
    sp = _noise(nt, o, 520.0, 2.0, 0.5)
    col = _mix(nt, _maprange(nt, sp, 0.35, 0.65, 0.0, 0.35), rgb, tuple(c * 1.4 for c in rgb))
    col = _mix(nt, _maprange(nt, _noise(nt, o, 3.0, 4.0, 0.6), 0.55, 0.75, 0.0, 0.25), col, tuple(c * 0.75 for c in rgb))
    scr = _noise(nt, o, 1.0, 2.0, 0.5, mapping=(5.0, 160.0, 5.0))
    scr_m = _math(nt, "MULTIPLY", _maprange(nt, scr, 0.62, 0.66, 0.0, 1.0), _maprange(nt, _noise(nt, o, 4.0, 2.0, 0.5), 0.5, 0.65, 0.0, 1.0))
    col = _mix(nt, _math(nt, "MULTIPLY", scr_m, 0.5), col, tuple(c * 1.6 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    pol = _noise(nt, o, 1.8, 3.0, 0.5)
    r = _maprange(nt, pol, 0.3, 0.7, rough - 0.14, rough + 0.08)
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", scr_m, 0.2), clamp=True)
    _link(nt, r, b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.4
    _bump(nt, b, _math(nt, "ADD", _math(nt, "MULTIPLY", scr_m, -1.0), _math(nt, "MULTIPLY", sp, 0.2)), 0.06, 0.0003)
    return m


def enamel(name, rgb, rough=0.28):
    """Vitreous enamel (the pendant's shade): glossy, with a few dull smears and tiny chips."""
    m, nt, b = _new(name)
    o = _obj(nt)
    sm = _noise(nt, o, 12.0, 3.0, 0.6)
    _link(nt, _math(nt, "ADD", _maprange(nt, sm, 0.3, 0.7, -0.08, 0.12), rough, clamp=True), b.inputs["Roughness"])
    ch = _maprange(nt, _noise(nt, o, 90.0, 2.0, 0.6), 0.76, 0.8, 0.0, 1.0)
    _link(nt, _mix(nt, ch, rgb, (0.03, 0.03, 0.03)), b.inputs["Base Color"])
    b.inputs["Specular IOR Level"].default_value = 0.55
    return m


def paper(name, rgb=(0.6, 0.57, 0.5), rough=0.9, fibre=0.07):
    """Envelope paper: matt, slightly warm, faint fibre and felt tooth, a little light through its thin body."""
    m, nt, b = _new(name)
    o = _obj(nt)
    fib = _noise(nt, o, 1.0, 4.0, 0.6, mapping=(90.0, 900.0, 90.0))
    blot = _noise(nt, o, 30.0, 3.0, 0.6)
    col = _mix(nt, _maprange(nt, fib, 0.3, 0.7, 0.0, 0.1), rgb, tuple(c * 0.86 for c in rgb))
    col = _mix(nt, _maprange(nt, blot, 0.6, 0.78, 0.0, 0.12), col, tuple(c * 0.8 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = 0.3
    b.inputs["Subsurface Weight"].default_value = 0.06
    b.inputs["Subsurface Radius"].default_value = (0.002, 0.0015, 0.001)
    tooth = _noise(nt, o, 600.0, 4.0, 0.65)
    _bump(nt, b, _math(nt, "ADD", _math(nt, "MULTIPLY", fib, 0.35), tooth), fibre, 0.00015)
    return m


def glass(name, tint=(0.9, 0.93, 0.94), rough=0.04):
    """A scratched polycarbonate / glass pane: clear, reflecting by Fresnel, dull smears."""
    m, nt, b = _new(name)
    o = _obj(nt)
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["IOR"].default_value = 1.5
    b.inputs["Base Color"].default_value = (*tint, 1)
    sm = _noise(nt, o, 40.0, 4.0, 0.6)
    _link(nt, _math(nt, "ADD", _maprange(nt, sm, 0.4, 0.75, 0.0, 0.18), rough, clamp=True), b.inputs["Roughness"])
    return m


def glow(name, rgb, strength, ends=0.0, axis="Z", half=0.6):
    """An emitter. `ends` > 0 darkens it toward both ends along the object's local `axis` (a fluorescent tube's
    blackened ends): `half` is the half length."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    if ends:
        x, y, z = _xyz(nt, _obj(nt))
        a = _math(nt, "ABSOLUTE", {"X": x, "Y": y, "Z": z}[axis])
        s = _maprange(nt, a, half * 0.78, half, strength, strength * (1.0 - ends))
        _link(nt, s, em.inputs["Strength"])
    else:
        em.inputs["Strength"].default_value = strength
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def wired_glow(name, rgb, strength):
    """Light seen through wired glass: a 25 mm wire grid darkens it."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    br = _n(nt, "ShaderNodeTexBrick", offset=0.0, squash=1.0)
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.0012
    br.inputs["Brick Width"].default_value = 0.0254
    br.inputs["Row Height"].default_value = 0.0254
    _link(nt, _obj(nt), br.inputs["Vector"])
    s = _math(nt, "MULTIPLY", _maprange(nt, _out(br, "Fac"), 0.0, 1.0, 1.0, 0.1), strength)
    _link(nt, s, em.inputs["Strength"])
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def opal(name, rgb=(0.3, 0.31, 0.31)):
    """An unlit opal polycarbonate diffuser: milky, a little translucent, dusty."""
    m, nt, b = _new(name)
    o = _obj(nt)
    d = _noise(nt, o, 14.0, 3.0, 0.6)
    _link(nt, _mix(nt, _maprange(nt, d, 0.5, 0.75, 0.0, 0.4), rgb, (0.12, 0.11, 0.1)), b.inputs["Base Color"])
    _link(nt, _maprange(nt, d, 0.3, 0.7, 0.3, 0.5), b.inputs["Roughness"])
    b.inputs["Subsurface Weight"].default_value = 0.2
    b.inputs["Subsurface Radius"].default_value = (0.01, 0.01, 0.01)
    return m


def tune_prop(mat, spec=None, rough_floor=None):
    """Finish a generated prop's material in place: dielectric specular level (generated textures carry a plastic
    sheen), and a floor under its roughness."""
    if not (mat and mat.use_nodes):
        return
    nt = mat.node_tree
    b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if b is None:
        return
    if spec is not None:
        b.inputs["Specular IOR Level"].default_value = spec
    if rough_floor is not None:
        r = b.inputs["Roughness"]
        if r.is_linked:
            src = r.links[0].from_socket
            mx = _n(nt, "ShaderNodeMath", operation="MAXIMUM")
            mx.inputs[1].default_value = rough_floor
            _link(nt, src, mx.inputs[0])
            _link(nt, mx.outputs[0], r)
        else:
            r.default_value = max(r.default_value, rough_floor)
