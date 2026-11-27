"""Materials for the prison exterior at night in the rain (Cycles, Principled BSDF). Every pattern runs in world
space, in metres, so a part keeps its pattern wherever it stands and repeated panels never repeat a stain.

Cast concrete (formwork lift lines, tie holes, rain streaks that start under the coping, a damp foot); wet asphalt
whose standing water comes from one height map shared by the whole ground (gutters, wheel ruts, hand-placed dips),
with ripple rings in the puddles; wet paving; kerb stone; a dark soaked verge; painted gate steel with rust at the
seams and at the foot; galvanised steel; razor wire; dark glass; lamp lenses and lit cell windows (emitters); the
overcast night sky; rain; the mist.
"""
import bpy  # noqa: F401  (first: bmesh and mathutils only exist once bpy is loaded)

M = {}


# ---------------------------------------------------------------- node helpers (as in hongkong_street_mats)
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


def _bump(nt, b, height, strength, distance):
    n = _n(nt, "ShaderNodeBump")
    n.inputs["Strength"].default_value = strength
    n.inputs["Distance"].default_value = distance
    _link(nt, height, n.inputs["Height"])
    _link(nt, n.outputs["Normal"], b.inputs["Normal"])
    return n


def _world(nt):
    return _n(nt, "ShaderNodeNewGeometry").outputs["Position"]


def _xyz(nt, vec):
    s = _n(nt, "ShaderNodeSeparateXYZ")
    _link(nt, vec, s.inputs["Vector"])
    return s.outputs["X"], s.outputs["Y"], s.outputs["Z"]


def _scaled(nt, col, k):
    """A colour socket times a constant."""
    return _mix(nt, 1.0, col, (k, k, k), blend="MULTIPLY")


def _mulv(nt, col, val):
    """A colour socket times a value socket."""
    cc = _n(nt, "ShaderNodeCombineXYZ")
    for k in range(3):
        _link(nt, val, cc.inputs[k])
    return _mix(nt, 1.0, col, cc.outputs[0], blend="MULTIPLY")


def _lines(nt, coord, period, half_width):
    """1 on thin lines every `period` metres along a coordinate, 0 between."""
    f = _math(nt, "FRACT", _math(nt, "DIVIDE", coord, period))
    a = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", f, 0.5))
    w = half_width / period
    return _maprange(nt, a, 0.5 - w * 1.6, 0.5 - w * 0.6, 0.0, 1.0)


def pbr(name, rgb, rough=(0.4, 0.55), metal=0.0, nscale=4.0, cvar=0.1, bump=0.0, bscale=90.0, spec=0.5):
    """A principled surface whose tone and roughness vary (world space)."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Specular IOR Level"].default_value = spec
    o = _world(nt)
    _link(nt, _maprange(nt, _noise(nt, o, nscale, 4.0, 0.6), 0.32, 0.68, rough[0], rough[1]), b.inputs["Roughness"])
    dark = tuple(c * (1 - cvar) for c in rgb)
    lite = tuple(min(1.0, c * (1 + cvar)) for c in rgb)
    col = _mix(nt, _maprange(nt, _noise(nt, o, nscale * 0.37, 4.0, 0.6), 0.3, 0.7, 0.0, 1.0), dark, lite)
    _link(nt, col, b.inputs["Base Color"])
    if bump:
        _bump(nt, b, _noise(nt, o, bscale, 3.0, 0.6), bump, 0.0008)
    return m


def emit(name, rgb, strength, sampling="AUTO"):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1.0)
    em.inputs["Strength"].default_value = strength
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    m.cycles.emission_sampling = sampling
    return m


# ---------------------------------------------------------------- concrete
def concrete(name, base=(0.25, 0.25, 0.245), top=6.0, lift=1.5, ties=True, streak=0.6, foot=0.9, rough=(0.6, 0.8),
             boards=0.0):
    """Cast concrete, world space. Lift lines every `lift` metres (0: none), tie holes on a 1.2 x lift/2 grid,
    dark rain streaks that start at `top` and thin out downward, a damp, slightly green foot `foot` metres high,
    `boards`: the height of board marks (0: smooth shutter)."""
    m, nt, b = _new(name)
    o = _world(nt)
    x, y, z = _xyz(nt, o)
    hcoord = _math(nt, "ADD", x, y)                       # runs along any axis-aligned vertical face
    mott = _maprange(nt, _noise(nt, o, 0.35, 5.0, 0.6), 0.3, 0.7, 0.0, 1.0)
    col = _mix(nt, mott, tuple(c * 0.74 for c in base), tuple(c * 1.12 for c in base))
    blot = _maprange(nt, _noise(nt, o, 2.3, 4.0, 0.6), 0.3, 0.7, 0.9, 1.06)
    col = _mulv(nt, col, blot)
    # rain streaks: noise drawn out vertically, strongest under the coping
    sn = _noise(nt, o, 1.0, 4.0, 0.65, mapping=(7.0, 7.0, 0.10))
    s = _maprange(nt, sn, 0.50, 0.72, 0.0, 1.0, smooth=True)
    hm = _maprange(nt, z, top - 5.0, top, 0.12, 1.0, smooth=True)
    sf = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", s, hm), streak, clamp=True)
    col = _mix(nt, sf, col, tuple(c * 0.36 for c in base))
    sn2 = _noise(nt, o, 1.0, 3.0, 0.6, mapping=(11.0, 11.0, 0.16))
    lime = _math(nt, "MULTIPLY", _maprange(nt, sn2, 0.66, 0.8, 0.0, 1.0, smooth=True), 0.22)
    col = _mix(nt, lime, col, tuple(min(1.0, c * 1.5) for c in base))
    # damp foot
    fz = _math(nt, "ADD", z, _math(nt, "MULTIPLY", _noise(nt, o, 1.3, 3.0, 0.6), 0.5))
    damp = _maprange(nt, fz, 0.15, 0.25 + foot, 1.0, 0.0, smooth=True)
    col = _mix(nt, _math(nt, "MULTIPLY", damp, 0.6), col, (base[0] * 0.3, base[1] * 0.34, base[2] * 0.29))
    height = _math(nt, "MULTIPLY", _noise(nt, o, 55.0, 4.0, 0.6), 0.5)
    height = _math(nt, "ADD", height, _math(nt, "MULTIPLY", mott, 0.3))
    pits = _maprange(nt, _noise(nt, o, 210.0, 2.0, 0.5), 0.68, 0.76, 0.0, 1.0)
    height = _math(nt, "SUBTRACT", height, _math(nt, "MULTIPLY", pits, 0.5))
    if lift:
        ln = _lines(nt, z, lift, 0.012)
        col = _mix(nt, _math(nt, "MULTIPLY", ln, 0.4), col, tuple(c * 0.4 for c in base))
        height = _math(nt, "SUBTRACT", height, ln)
        if ties:
            u = _math(nt, "SUBTRACT", _math(nt, "FRACT", _math(nt, "DIVIDE", hcoord, 1.2)), 0.5)
            v = _math(nt, "SUBTRACT", _math(nt, "FRACT", _math(nt, "DIVIDE", z, lift * 0.5)), 0.5)
            du = _math(nt, "MULTIPLY", u, 1.2)
            dv = _math(nt, "MULTIPLY", v, lift * 0.5)
            dist = _math(nt, "SQRT", _math(nt, "ADD", _math(nt, "MULTIPLY", du, du), _math(nt, "MULTIPLY", dv, dv)))
            hole = _maprange(nt, dist, 0.02, 0.032, 1.0, 0.0)
            col = _mix(nt, _math(nt, "MULTIPLY", hole, 0.8), col, tuple(c * 0.22 for c in base))
            height = _math(nt, "SUBTRACT", height, _math(nt, "MULTIPLY", hole, 2.0))
    if boards:
        bd = _lines(nt, z, boards, 0.004)
        height = _math(nt, "SUBTRACT", height, _math(nt, "MULTIPLY", bd, 0.6))
        tone = _n(nt, "ShaderNodeTexWhiteNoise", noise_dimensions="1D")
        _link(nt, _math(nt, "FLOOR", _math(nt, "DIVIDE", z, boards)), tone.inputs["W"])
        col = _mix(nt, _maprange(nt, tone.outputs["Value"], 0.0, 1.0, 0.0, 0.12), col, tuple(c * 0.6 for c in base))
    _link(nt, col, b.inputs["Base Color"])
    r = _maprange(nt, _noise(nt, o, 3.1, 4.0, 0.6), 0.3, 0.7, rough[0], rough[1])
    r = _fmix(nt, sf, r, 0.32)
    r = _fmix(nt, damp, r, 0.36)
    _link(nt, r, b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.45
    _bump(nt, b, height, 0.4, 0.004)
    return m


# ---------------------------------------------------------------- the ground
def _height(nt, img, rect):
    """The ground's height map (0..1, low = water collects) at the shading point."""
    x0, x1, y0, y1 = rect
    mp = _n(nt, "ShaderNodeMapping")
    mp.inputs["Location"].default_value = (-x0 / (x1 - x0), -y0 / (y1 - y0), 0.0)
    mp.inputs["Scale"].default_value = (1.0 / (x1 - x0), 1.0 / (y1 - y0), 1.0)
    _link(nt, _world(nt), mp.inputs["Vector"])
    tex = _n(nt, "ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = "Cubic"
    tex.extension = "EXTEND"
    _link(nt, mp.outputs["Vector"], tex.inputs["Vector"])
    return tex.outputs["Color"]


def _ripples(nt, o, wet):
    """Rain rings on standing water: metres of height, a few rings round each drop."""
    vor = _n(nt, "ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 2.7
    _link(nt, o, vor.inputs["Vector"])
    d = vor.outputs["Distance"]
    cr, _, _ = _xyz(nt, vor.outputs["Color"])
    ring = _math(nt, "SINE", _math(nt, "ADD", _math(nt, "MULTIPLY", d, 74.0), _math(nt, "MULTIPLY", cr, 6.283)))
    env = _maprange(nt, d, 0.02, 0.30, 1.0, 0.0, smooth=True)
    act = _maprange(nt, cr, 0.42, 0.5, 0.0, 1.0)
    r = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", ring, env), _math(nt, "MULTIPLY", act, wet))
    swell = _math(nt, "SUBTRACT", _noise(nt, o, 5.0, 1.0, 0.5), 0.5)
    return _math(nt, "ADD", _math(nt, "MULTIPLY", r, 0.0011), _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", swell, wet), 0.0012))


def asphalt(name, img, rect, level=0.33, stop_x=None, stop_y=4.1):
    """Old asphalt in the rain: wet all over (a half-rough sheen that draws every lamp out into a streak), standing
    water wherever the height map dips below `level`, tar-sealed cracks, a worn stop line at x = stop_x."""
    m, nt, b = _new(name)
    o = _world(nt)
    x, y, z = _xyz(nt, o)
    h = _height(nt, img, rect)
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", _noise(nt, o, 7.0, 3.0, 0.6), 0.5), 0.11))
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", _noise(nt, o, 40.0, 2.0, 0.5), 0.5), 0.03))
    wet = _maprange(nt, h, level - 0.012, level + 0.012, 1.0, 0.0, smooth=True)
    damp = _maprange(nt, h, level, level + 0.2, 1.0, 0.0, smooth=True)
    mott = _maprange(nt, _noise(nt, o, 1.7, 5.0, 0.6), 0.3, 0.7, 0.0, 1.0)
    base = _mix(nt, mott, (0.030, 0.030, 0.032), (0.054, 0.053, 0.052))
    speck = _maprange(nt, _noise(nt, o, 300.0, 2.0, 0.5), 0.62, 0.75, 0.0, 1.0)
    base = _mix(nt, _math(nt, "MULTIPLY", speck, 0.5), base, (0.12, 0.12, 0.12))
    # tar-sealed cracks: the edges of big warped cells
    warp = _n(nt, "ShaderNodeMapping")
    _link(nt, o, warp.inputs["Vector"])
    wn = _n(nt, "ShaderNodeTexNoise")
    wn.inputs["Scale"].default_value = 0.6
    _link(nt, o, wn.inputs["Vector"])
    wadd = _n(nt, "ShaderNodeVectorMath", operation="ADD")
    _link(nt, o, wadd.inputs[0])
    _link(nt, wn.outputs["Color"], wadd.inputs[1])
    vor = _n(nt, "ShaderNodeTexVoronoi", feature="DISTANCE_TO_EDGE")
    vor.inputs["Scale"].default_value = 0.23
    _link(nt, wadd.outputs[0], vor.inputs["Vector"])
    crack = _maprange(nt, vor.outputs["Distance"], 0.004, 0.011, 1.0, 0.0)
    crack = _math(nt, "MULTIPLY", crack, _maprange(nt, _noise(nt, o, 0.5, 2.0, 0.5), 0.45, 0.55, 0.0, 1.0))
    base = _mix(nt, crack, base, (0.014, 0.014, 0.015))
    if stop_x is not None:
        mx = _maprange(nt, _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", x, stop_x)), 0.19, 0.21, 1.0, 0.0)
        my = _maprange(nt, _math(nt, "ABSOLUTE", y), stop_y, stop_y + 0.03, 1.0, 0.0)
        wear = _maprange(nt, _noise(nt, o, 11.0, 4.0, 0.7), 0.38, 0.58, 0.0, 0.85)
        paint = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", mx, my), wear)
        base = _mix(nt, paint, base, (0.36, 0.36, 0.34))
    col = _mix(nt, _math(nt, "MULTIPLY", damp, 0.4), base, (0.02, 0.02, 0.022))
    col = _mix(nt, wet, col, (0.012, 0.013, 0.015))
    _link(nt, col, b.inputs["Base Color"])
    r = _maprange(nt, _noise(nt, o, 2.2, 4.0, 0.6), 0.3, 0.7, 0.24, 0.42)
    r = _fmix(nt, crack, r, 0.16)
    r = _fmix(nt, damp, r, 0.15)
    r = _fmix(nt, wet, r, 0.012)
    _link(nt, r, b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.55
    agg = _math(nt, "ADD", _math(nt, "MULTIPLY", _noise(nt, o, 150.0, 3.0, 0.6), 0.7), _math(nt, "MULTIPLY", _noise(nt, o, 19.0, 2.0, 0.5), 0.6))
    hh = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", agg, _math(nt, "SUBTRACT", 1.0, wet)), 0.0022)
    hh = _math(nt, "ADD", hh, _ripples(nt, o, wet))
    _bump(nt, b, hh, 1.0, 1.0)
    return m


def paving(name, img, rect, level=0.25, slab=0.6, base=(0.2, 0.2, 0.195)):
    """Wet concrete paving slabs with dark joints; water stands in the few low slabs."""
    m, nt, b = _new(name)
    o = _world(nt)
    h = _height(nt, img, rect)
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", _noise(nt, o, 6.0, 3.0, 0.6), 0.5), 0.1))
    wet = _maprange(nt, h, level - 0.012, level + 0.012, 1.0, 0.0, smooth=True)
    br = _n(nt, "ShaderNodeTexBrick")
    br.offset, br.squash = 0.5, 1.0
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.006
    br.inputs["Mortar Smooth"].default_value = 0.3
    br.inputs["Bias"].default_value = 0.0
    br.inputs["Brick Width"].default_value = slab
    br.inputs["Row Height"].default_value = slab
    br.inputs["Color1"].default_value = (*[c * 0.82 for c in base], 1.0)
    br.inputs["Color2"].default_value = (*[c * 1.1 for c in base], 1.0)
    br.inputs["Mortar"].default_value = (*[c * 0.25 for c in base], 1.0)
    _link(nt, o, br.inputs["Vector"])
    mott = _maprange(nt, _noise(nt, o, 1.9, 5.0, 0.6), 0.3, 0.7, 0.0, 1.0)
    col = _mix(nt, _math(nt, "MULTIPLY", mott, 0.45), br.outputs["Color"], tuple(c * 0.5 for c in base))
    col = _mix(nt, wet, col, (0.02, 0.021, 0.023))
    _link(nt, col, b.inputs["Base Color"])
    r = _maprange(nt, _noise(nt, o, 2.8, 4.0, 0.6), 0.3, 0.7, 0.2, 0.46)
    r = _fmix(nt, wet, r, 0.015)
    _link(nt, r, b.inputs["Roughness"])
    hh = _math(nt, "MULTIPLY", _noise(nt, o, 120.0, 3.0, 0.6), 0.001)
    hh = _math(nt, "SUBTRACT", hh, _math(nt, "MULTIPLY", br.outputs["Fac"], 0.003))
    hh = _math(nt, "MULTIPLY", hh, _math(nt, "SUBTRACT", 1.0, wet))
    hh = _math(nt, "ADD", hh, _ripples(nt, o, wet))
    _bump(nt, b, hh, 1.0, 1.0)
    return m


def kerb(name, axis="y", base=(0.21, 0.21, 0.205)):
    """Kerb stones 0.9 m long, wet, worn lighter on the nosing; joints across the run (`axis`: its direction)."""
    m, nt, b = _new(name)
    o = _world(nt)
    x, y, z = _xyz(nt, o)
    ln = _lines(nt, y if axis == "y" else x, 0.915, 0.006)
    mott = _maprange(nt, _noise(nt, o, 2.4, 5.0, 0.6), 0.3, 0.7, 0.0, 1.0)
    col = _mix(nt, mott, tuple(c * 0.7 for c in base), tuple(c * 1.15 for c in base))
    col = _mix(nt, ln, col, tuple(c * 0.2 for c in base))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, _noise(nt, o, 3.0, 4.0, 0.6), 0.3, 0.7, 0.2, 0.45), b.inputs["Roughness"])
    hh = _math(nt, "SUBTRACT", _math(nt, "MULTIPLY", _noise(nt, o, 90.0, 3.0, 0.6), 0.4), ln)
    _bump(nt, b, hh, 0.5, 0.003)
    return m


def verge(name="verge"):
    """Soaked ground beside the road: dark soil and flattened grass, rough, with a few wet glints."""
    m, nt, b = _new(name)
    o = _world(nt)
    a = _maprange(nt, _noise(nt, o, 1.1, 5.0, 0.65), 0.3, 0.7, 0.0, 1.0)
    col = _mix(nt, a, (0.016, 0.015, 0.012), (0.014, 0.022, 0.012))
    gr = _maprange(nt, _noise(nt, o, 60.0, 3.0, 0.6), 0.5, 0.7, 0.0, 1.0)
    col = _mix(nt, _math(nt, "MULTIPLY", gr, 0.6), col, (0.03, 0.04, 0.022))
    _link(nt, col, b.inputs["Base Color"])
    gl = _maprange(nt, _noise(nt, o, 4.0, 4.0, 0.6), 0.55, 0.7, 0.85, 0.3)
    _link(nt, gl, b.inputs["Roughness"])
    hh = _math(nt, "ADD", _noise(nt, o, 45.0, 4.0, 0.7), _math(nt, "MULTIPLY", _noise(nt, o, 6.0, 3.0, 0.6), 1.5))
    _bump(nt, b, hh, 0.9, 0.02)
    return m


# ---------------------------------------------------------------- steel
def gate_steel(name="gate steel", paint=(0.13, 0.17, 0.22)):
    """Painted steel plate: a blue-grey institutional paint, chalked and uneven, rain running down it in glossy
    tracks, rust bleeding from the seams and rising from the foot."""
    m, nt, b = _new(name)
    o = _world(nt)
    x, y, z = _xyz(nt, o)
    mott = _maprange(nt, _noise(nt, o, 1.4, 5.0, 0.6), 0.3, 0.7, 0.0, 1.0)
    col = _mix(nt, mott, tuple(c * 0.8 for c in paint), tuple(c * 1.14 for c in paint))
    chalk = _maprange(nt, _noise(nt, o, 1.0, 3.0, 0.6, mapping=(9.0, 9.0, 0.5)), 0.55, 0.8, 0.0, 0.3)
    col = _mix(nt, chalk, col, tuple(min(1.0, c * 1.7) for c in paint))
    ao = _n(nt, "ShaderNodeAmbientOcclusion", samples=4)
    ao.inputs["Distance"].default_value = 0.07
    seam = _maprange(nt, ao.outputs["AO"], 0.35, 0.85, 1.0, 0.0, smooth=True)
    sn = _noise(nt, o, 1.0, 4.0, 0.7, mapping=(13.0, 13.0, 0.45))
    run = _maprange(nt, sn, 0.5, 0.72, 0.0, 1.0, smooth=True)
    foot = _maprange(nt, _math(nt, "ADD", z, _math(nt, "MULTIPLY", sn, 0.5)), 0.25, 0.95, 1.0, 0.0, smooth=True)
    spots = _maprange(nt, _noise(nt, o, 26.0, 4.0, 0.7), 0.6, 0.72, 0.0, 1.0)
    rust = _math(nt, "MAXIMUM", _math(nt, "MULTIPLY", seam, _math(nt, "ADD", 0.35, _math(nt, "MULTIPLY", run, 0.65))),
                 _math(nt, "MULTIPLY", foot, _math(nt, "ADD", 0.35, _math(nt, "MULTIPLY", spots, 0.65))))
    rust = _math(nt, "MAXIMUM", rust, _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", spots, run), 0.5), clamp=True)
    rcol = _mix(nt, _noise(nt, o, 40.0, 3.0, 0.6), (0.05, 0.022, 0.012), (0.11, 0.05, 0.022))
    col = _mix(nt, _math(nt, "MULTIPLY", rust, 0.85), col, rcol)
    _link(nt, col, b.inputs["Base Color"])
    r = _maprange(nt, _noise(nt, o, 5.0, 4.0, 0.6), 0.3, 0.7, 0.36, 0.52)
    wetrun = _maprange(nt, _noise(nt, o, 1.0, 3.0, 0.6, mapping=(17.0, 17.0, 0.3)), 0.48, 0.66, 0.0, 1.0, smooth=True)
    r = _fmix(nt, _math(nt, "MULTIPLY", wetrun, 0.8), r, 0.16)
    r = _fmix(nt, rust, r, 0.7)
    _link(nt, r, b.inputs["Roughness"])
    hh = _math(nt, "ADD", _math(nt, "MULTIPLY", _noise(nt, o, 70.0, 2.0, 0.5), 0.25), _math(nt, "MULTIPLY", rust, _noise(nt, o, 160.0, 3.0, 0.6)))
    _bump(nt, b, hh, 0.35, 0.0015)
    return m


def galvanised(name="galvanised", value=0.42, rough=(0.36, 0.56)):
    """Hot-dip galvanised steel: dull zinc with a spangle (roughness per crystal) and dark weather streaks."""
    m, nt, b = _new(name)
    o = _world(nt)
    b.inputs["Metallic"].default_value = 1.0
    vor = _n(nt, "ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 55.0
    _link(nt, o, vor.inputs["Vector"])
    cr, _, _ = _xyz(nt, vor.outputs["Color"])
    _link(nt, _maprange(nt, cr, 0.0, 1.0, rough[0], rough[1]), b.inputs["Roughness"])
    st = _maprange(nt, _noise(nt, o, 1.0, 4.0, 0.65, mapping=(15.0, 15.0, 0.4)), 0.5, 0.75, 0.0, 0.55, smooth=True)
    col = _mix(nt, cr, (value * 0.85, value * 0.88, value * 0.92), (value * 1.1, value * 1.12, value * 1.15))
    col = _mix(nt, st, col, (value * 0.3, value * 0.3, value * 0.29))
    _link(nt, col, b.inputs["Base Color"])
    return m


def dark_steel(name="dark steel", rgb=(0.028, 0.03, 0.034), rough=(0.38, 0.55)):
    return pbr(name, rgb, rough=rough, nscale=9.0, cvar=0.2, bump=0.1, bscale=140.0)


# ---------------------------------------------------------------- glass, emitters
def tower_glass(name="tower glass", tint=(0.42, 0.47, 0.5)):
    """Dark tinted glazing that lets a view through and takes a reflection (transparent plus a Fresnel layer)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = (*tint, 1.0)
    gl = _n(nt, "ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.03
    lw = _n(nt, "ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.22
    fac = _maprange(nt, lw.outputs["Fresnel"], 0.0, 1.0, 0.1, 0.95)
    mx = _n(nt, "ShaderNodeMixShader")
    _link(nt, fac, mx.inputs[0])
    _link(nt, tr.outputs[0], mx.inputs[1])
    _link(nt, gl.outputs[0], mx.inputs[2])
    _link(nt, mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def window_lit(name, rgb, strength, blind=0.0):
    """A lit cell window: a plain glowing pane, dimmer toward the sill; `blind` greys the upper part."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tc = _n(nt, "ShaderNodeTexCoord")
    _, _, oz = _xyz(nt, tc.outputs["Object"])
    g = _maprange(nt, oz, -0.6, 0.6, 0.55, 1.0)
    if blind:
        g = _math(nt, "MULTIPLY", g, _maprange(nt, oz, 0.6 - blind * 1.2 - 0.02, 0.6 - blind * 1.2 + 0.02, 1.0, 0.42))
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1.0)
    _link(nt, _math(nt, "MULTIPLY", g, strength), em.inputs["Strength"])
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    m.cycles.emission_sampling = "AUTO"
    return m


def sky(name="night sky", zenith=(0.034, 0.042, 0.06), horizon=(0.062, 0.074, 0.096), glow=(0.09, 0.09, 0.096)):
    """Low overcast at night, lit from below: darkest overhead, lighter toward the horizon, a little lighter still
    over the prison (toward +X), broken into soft cloud. An emitter the camera and the wet ground see."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    nrm = _n(nt, "ShaderNodeVectorMath", operation="NORMALIZE")
    _link(nt, _world(nt), nrm.inputs[0])
    dx, dy, dz = _xyz(nt, nrm.outputs[0])
    hz = _maprange(nt, dz, 0.0, 0.55, 1.0, 0.0, smooth=True)
    col = _mix(nt, hz, zenith, horizon)
    over = _math(nt, "MULTIPLY", _maprange(nt, dx, -0.1, 0.8, 0.0, 1.0, smooth=True), _maprange(nt, dz, 0.0, 0.45, 1.0, 0.0, smooth=True))
    col = _mix(nt, _math(nt, "MULTIPLY", over, 0.7), col, glow)
    cl = _noise(nt, nrm.outputs[0], 2.4, 5.0, 0.6, mapping=(1.0, 1.0, 3.2))
    em = _n(nt, "ShaderNodeEmission")
    _link(nt, col, em.inputs["Color"])
    _link(nt, _maprange(nt, cl, 0.32, 0.7, 0.62, 1.45), em.inputs["Strength"])
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    m.cycles.emission_sampling = "NONE"
    return m


def rain(name="rain", gain=1.5):
    """A falling drop drawn out by the shutter: it takes the light from any side (diffuse plus translucent)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    c = (0.82 * gain, 0.88 * gain, 0.95 * gain, 1.0)
    d = _n(nt, "ShaderNodeBsdfDiffuse")
    d.inputs["Color"].default_value = c
    t = _n(nt, "ShaderNodeBsdfTranslucent")
    t.inputs["Color"].default_value = c
    add = _n(nt, "ShaderNodeMixShader")
    add.inputs[0].default_value = 0.5
    _link(nt, d.outputs[0], add.inputs[1])
    _link(nt, t.outputs[0], add.inputs[2])
    _link(nt, add.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def mist(name="mist", density=0.006, colour=(0.8, 0.86, 0.93), veil=(0.062, 0.074, 0.096), aniso=0.15):
    """The wet air: a homogeneous volume that gives every lamp a cone, and glows faintly itself (`veil` is the
    radiance it reaches over a long view), so the far end of the wall fades to night mist, not to black."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    pv = _n(nt, "ShaderNodeVolumePrincipled")
    pv.inputs["Density"].default_value = density
    pv.inputs["Color"].default_value = (*colour, 1.0)
    pv.inputs["Anisotropy"].default_value = aniso
    pv.inputs["Emission Color"].default_value = (*[v / max(veil) for v in veil], 1.0)
    pv.inputs["Emission Strength"].default_value = max(veil) * density
    _link(nt, pv.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    m["veil"] = max(veil)
    return m


def set_mist(m, density):
    pv = next(n for n in m.node_tree.nodes if n.type == "PRINCIPLED_VOLUME")
    pv.inputs["Density"].default_value = density
    pv.inputs["Emission Strength"].default_value = m["veil"] * density


# ---------------------------------------------------------------- the set's materials
def materials(img, rect, stop_x):
    M.clear()
    M["wall"] = concrete("wall concrete", base=(0.25, 0.25, 0.245), top=6.0, lift=1.5, ties=True, streak=0.65)
    M["cope"] = concrete("coping concrete", base=(0.29, 0.29, 0.28), top=6.2, lift=0.0, streak=0.25, foot=0.0,
                         rough=(0.38, 0.6))
    M["pier"] = concrete("pier concrete", base=(0.185, 0.185, 0.18), top=6.0, lift=1.5, ties=True, streak=0.7)
    M["tower"] = concrete("tower concrete", base=(0.235, 0.235, 0.23), top=11.4, lift=2.4, ties=True, streak=0.75,
                          boards=0.2)
    M["cabin"] = concrete("cabin concrete", base=(0.12, 0.124, 0.13), top=14.1, lift=0.0, streak=0.5, foot=0.0)
    M["facade"] = concrete("block facade", base=(0.085, 0.088, 0.092), top=22.5, lift=3.1, ties=False, streak=0.8,
                           rough=(0.6, 0.85))
    M["trim"] = concrete("block trim", base=(0.15, 0.15, 0.148), top=22.5, lift=0.0, streak=0.4, foot=0.0)
    M["yard"] = concrete("yard concrete", base=(0.2, 0.2, 0.195), top=0.0, lift=0.0, streak=0.0, foot=0.0,
                         rough=(0.25, 0.5))
    M["asphalt"] = asphalt("asphalt wet", img, rect, stop_x=stop_x)
    M["paving"] = paving("paving wet", img, rect)
    M["threshold"] = paving("threshold concrete", img, rect, level=0.2, slab=2.2, base=(0.19, 0.19, 0.185))
    M["kerb_y"] = kerb("kerb y", "y")
    M["kerb_x"] = kerb("kerb x", "x")
    M["verge"] = verge()
    M["gate"] = gate_steel()
    M["galv"] = galvanised()
    M["galv_dull"] = galvanised("galvanised dull", value=0.3, rough=(0.5, 0.7))
    M["wire"] = pbr("razor wire", (0.6, 0.62, 0.65), rough=(0.3, 0.42), metal=1.0, nscale=30.0, cvar=0.12)
    M["dark"] = dark_steel()
    M["iron"] = pbr("cast iron", (0.03, 0.029, 0.028), rough=(0.4, 0.6), metal=0.6, nscale=30.0, cvar=0.25, bump=0.5,
                    bscale=260.0)
    M["rubber"] = pbr("rubber", (0.012, 0.012, 0.012), rough=(0.6, 0.8), nscale=20.0)
    M["glass"] = tower_glass()
    M["pane"] = pbr("dark pane", (0.012, 0.014, 0.017), rough=(0.06, 0.14), nscale=1.5, cvar=0.2, spec=0.8)
    M["lens_cold"] = emit("lens cold", (0.8, 0.9, 1.0), 220.0, sampling="FRONT")
    M["lens_gate"] = emit("lens gate", (1.0, 0.95, 0.86), 220.0, sampling="FRONT")
    M["lens_dead"] = pbr("lens dead", (0.02, 0.022, 0.025), rough=(0.1, 0.2), nscale=3.0, spec=0.8)
    M["lit_a"] = window_lit("window lit a", (1.0, 0.8, 0.5), 5.5)
    M["lit_b"] = window_lit("window lit b", (1.0, 0.86, 0.62), 3.2, blind=0.45)
    M["lit_c"] = window_lit("window lit c", (0.78, 0.95, 0.9), 2.6)
    M["screen"] = emit("console glow", (0.6, 0.8, 1.0), 5.0, sampling="AUTO")
    M["button"] = emit("call button", (0.75, 0.9, 1.0), 9.0, sampling="NONE")
    M["sky"] = sky()
    M["rain"] = rain()
    M["mist"] = mist()
    M["black"] = pbr("void black", (0.004, 0.004, 0.004), rough=(0.9, 0.95))
    return M
