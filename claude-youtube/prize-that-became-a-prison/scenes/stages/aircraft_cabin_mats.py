"""Materials for the night cabin (Cycles, Principled BSDF). Patterns work in object space, in metres, so a part keeps
its pattern wherever it is put and no surface reads as one flat value (tone and roughness always vary).

Interior: woven seat upholstery, cloth headrest covers, moulded seat-back shells (orange-peel satin plastic, scuffed
low down by feet), the textured sidewall lining and bin doors, cabin carpet with a small woven motif and a worn aisle
lane, aluminium seat tracks, painted seat legs, matt window shades, acrylic window panes. Emitters: blank seat-back
screens, the reading-light lens, the blue night cove light, the aisle path lights. Exterior: the night sky at altitude
(dark zenith, airglow at a horizon far below, a faintly moonlit cloud deck under it), wing paint, navigation lights.
The node helpers are adapted from the departure gate's (departure_gate_mats.py), copied so this stage stands alone.
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
    return _out(n, "Fac")


def _wave(nt, vec, scale, axis="X", distortion=0.0):
    n = _n(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction=axis)
    n.inputs["Scale"].default_value = scale
    n.inputs["Distortion"].default_value = distortion
    _link(nt, vec, n.inputs["Vector"])
    return _out(n, "Fac")


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
    return _out(n, "AO")


def _spec(b, v):
    b.inputs["Specular IOR Level"].default_value = v


# ---------------------------------------------------------------- general surfaces
def pbr(name, rgb, rough=(0.4, 0.55), metal=0.0, nscale=4.0, stretch=(1, 1, 1), cvar=0.1, bump=0.0, bscale=90.0,
        coat=0.0, sheen=0.0, grime=0.0, spec=0.5):
    """A principled surface with tone and roughness variation; `grime` darkens it into contact corners (AO)."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = 0.12
    _spec(b, spec)
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
    return m


def upholstery(name, rgb=(0.050, 0.056, 0.068), pitch=420.0):
    """Woven seat cloth: a fine basket weave (two crossed band textures at about 2.4 mm), a heathered yarn tone, a
    soft sheen, flattened and slightly shinier where people sit and lean, darker in the creases (AO)."""
    m, nt, b = _new(name)
    o = _obj(nt)
    _spec(b, 0.22)
    b.inputs["Sheen Weight"].default_value = 0.55
    b.inputs["Sheen Roughness"].default_value = 0.45
    b.inputs["Sheen Tint"].default_value = (0.75, 0.8, 0.9, 1.0)
    wx = _wave(nt, o, pitch, "X")
    wz = _wave(nt, o, pitch, "Z")
    wy = _wave(nt, o, pitch, "Y")
    weave = _math(nt, "MAXIMUM", _math(nt, "MULTIPLY", wx, wz), _math(nt, "MULTIPLY", wy, _math(nt, "SUBTRACT", 1.0, wz)))
    heather = _noise(nt, o, 160.0, 2.0, 0.7)
    tone = _maprange(nt, _math(nt, "ADD", _math(nt, "MULTIPLY", heather, 0.6), _math(nt, "MULTIPLY", weave, 0.4)),
                     0.2, 0.8, 0.0, 1.0)
    col = _mix(nt, tone, tuple(c * 0.78 for c in rgb), tuple(c * 1.22 for c in rgb))
    worn = _maprange(nt, _noise(nt, o, 3.0, 3.0, 0.6), 0.45, 0.7, 0.0, 1.0)
    col = _mix(nt, _math(nt, "MULTIPLY", worn, 0.35), col, tuple(c * 1.35 for c in rgb))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.08), 0.2, 1.0, 0.55, 0.0), col, (0.0, 0.0, 0.0))
    # channel stitching: fine tucked lines every 8.5 cm up the cushions (bands across Z, in the seat block's space)
    tuck = _maprange(nt, _wave(nt, o, 3.7, "Z"), 0.972, 1.0, 0.0, 1.0)
    col = _mix(nt, _math(nt, "MULTIPLY", tuck, 0.55), col, (0.0, 0.0, 0.0))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, worn, 0.0, 1.0, 0.92, 0.78), b.inputs["Roughness"])
    _bump(nt, b, _math(nt, "SUBTRACT", weave, _math(nt, "MULTIPLY", tuck, 7.0)), 0.35, 0.0006)
    return m


def cover_cloth(name, rgb=(0.30, 0.31, 0.325)):
    """The headrest cover: a light, matt, fine twill cloth, heathered, slightly soiled where heads rest."""
    m, nt, b = _new(name)
    o = _obj(nt)
    _spec(b, 0.2)
    b.inputs["Sheen Weight"].default_value = 0.4
    b.inputs["Sheen Roughness"].default_value = 0.5
    tw = _wave(nt, o, 600.0, "Z", distortion=0.0)
    hz = _noise(nt, o, 220.0, 2.0, 0.7)
    tone = _maprange(nt, _math(nt, "ADD", _math(nt, "MULTIPLY", tw, 0.35), _math(nt, "MULTIPLY", hz, 0.65)),
                     0.2, 0.8, 0.0, 1.0)
    col = _mix(nt, tone, tuple(c * 0.88 for c in rgb), tuple(c * 1.08 for c in rgb))
    soil = _maprange(nt, _noise(nt, o, 9.0, 4.0, 0.6), 0.5, 0.75, 0.0, 0.25)
    col = _mix(nt, soil, col, (0.2, 0.19, 0.175))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.9
    _bump(nt, b, tw, 0.2, 0.0004)
    return m


def shell(name, rgb=(0.30, 0.298, 0.29)):
    """Moulded seat-back shell: satin thermoplastic with an orange-peel texture, handling smudges that change its
    roughness, scuffed darker low down where knees and shoes rub."""
    m, nt, b = _new(name)
    o = _obj(nt)
    _spec(b, 0.45)
    peel = _noise(nt, o, 900.0, 2.0, 0.5)
    smudge = _maprange(nt, _noise(nt, o, 5.0, 5.0, 0.62), 0.45, 0.72, 0.0, 1.0)
    _link(nt, _math(nt, "ADD", _maprange(nt, smudge, 0.0, 1.0, 0.38, 0.6), _maprange(nt, peel, 0.3, 0.7, -0.04, 0.04)),
          b.inputs["Roughness"])
    col = _mix(nt, _maprange(nt, _noise(nt, o, 1.6, 3.0, 0.6), 0.3, 0.7, 0.0, 1.0), tuple(c * 0.94 for c in rgb),
               tuple(c * 1.04 for c in rgb))
    _, _, z = _xyz(nt, o)
    scuff = _math(nt, "MULTIPLY", _maprange(nt, z, 0.12, 0.42, 1.0, 0.0),
                  _maprange(nt, _noise(nt, o, 14.0, 6.0, 0.7), 0.45, 0.7, 0.0, 0.55))
    col = _mix(nt, scuff, col, (0.12, 0.118, 0.115))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.06), 0.25, 1.0, 0.5, 0.0), col, (0.04, 0.04, 0.04))
    _link(nt, col, b.inputs["Base Color"])
    _bump(nt, b, peel, 0.08, 0.0003)
    return m


def lining(name, rgb=(0.40, 0.402, 0.395), seams=0.0):
    """Cabin lining (sidewalls, bins, ceiling): a fine stippled decor laminate, satin, faint handling marks and dust
    in the corners."""
    m, nt, b = _new(name)
    o = _obj(nt)
    _spec(b, 0.4)
    stip = _noise(nt, o, 650.0, 3.0, 0.6)
    marks = _maprange(nt, _noise(nt, o, 3.5, 5.0, 0.62), 0.5, 0.75, 0.0, 1.0)
    _link(nt, _math(nt, "ADD", _maprange(nt, marks, 0.0, 1.0, 0.55, 0.4), _maprange(nt, stip, 0.3, 0.7, -0.05, 0.05)),
          b.inputs["Roughness"])
    col = _mix(nt, _maprange(nt, _noise(nt, o, 0.9, 3.0, 0.6), 0.3, 0.7, 0.0, 1.0), tuple(c * 0.95 for c in rgb),
               tuple(c * 1.03 for c in rgb))
    col = _mix(nt, _maprange(nt, stip, 0.35, 0.65, 0.0, 0.08), col, tuple(c * 0.7 for c in rgb))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.12), 0.2, 1.0, 0.45, 0.0), col, (0.05, 0.05, 0.048))
    _link(nt, col, b.inputs["Base Color"])
    _bump(nt, b, stip, 0.12, 0.0004)
    return m


def carpet(name, base=(0.065, 0.074, 0.095), lane_x=()):
    """Cabin carpet: a dense cut pile with a small woven diamond motif (two tones close in value), each roll a touch
    apart, flattened and soiled along the aisles (`lane_x`: centres of the aisle lanes)."""
    m, nt, b = _new(name)
    o = _obj(nt)
    _spec(b, 0.25)
    x, y, _ = _xyz(nt, o)
    # diamond motif from two diagonal band textures
    mp = _n(nt, "ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0.0, 0.0, 0.785)
    _link(nt, o, mp.inputs["Vector"])
    mp2 = _n(nt, "ShaderNodeMapping")
    mp2.inputs["Rotation"].default_value = (0.0, 0.0, -0.785)
    _link(nt, o, mp2.inputs["Vector"])
    a = _wave(nt, mp.outputs["Vector"], 8.0, "X")
    c = _wave(nt, mp2.outputs["Vector"], 8.0, "X")
    motif = _maprange(nt, _math(nt, "MULTIPLY", a, c), 0.55, 0.62, 0.0, 1.0)
    pile = _noise(nt, o, 700.0, 2.0, 0.7)
    col = _mix(nt, motif, base, tuple(min(1, k * 1.45) for k in base))
    col = _mix(nt, _maprange(nt, pile, 0.3, 0.7, 0.0, 1.0), tuple(k * 0.8 for k in base), col, "MULTIPLY")
    lane = None
    for lx in lane_x:
        d = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", x, lx))
        w = _maprange(nt, d, 0.12, 0.3, 1.0, 0.0)
        lane = w if lane is None else _math(nt, "MAXIMUM", lane, w)
    if lane is not None:
        dirt = _math(nt, "MULTIPLY", lane, _maprange(nt, _noise(nt, o, 2.2, 5.0, 0.62), 0.35, 0.7, 0.4, 0.9))
        col = _mix(nt, dirt, col, (0.085, 0.084, 0.088))
        _link(nt, _maprange(nt, dirt, 0.0, 1.0, 0.95, 0.82), b.inputs["Roughness"])
    else:
        b.inputs["Roughness"].default_value = 0.95
    col = _mix(nt, _maprange(nt, _ao(nt, 0.15), 0.2, 1.0, 0.6, 0.0), col, (0.0, 0.0, 0.0))
    _link(nt, col, b.inputs["Base Color"])
    _bump(nt, b, _math(nt, "ADD", pile, _math(nt, "MULTIPLY", motif, 0.4)), 0.25, 0.0012)
    del y
    return m


def aluminium(name, rgb=(0.55, 0.56, 0.58), rough=0.32, axis="Y"):
    """Anodised extruded aluminium (seat tracks, frames): grain along the extrusion, dulled and scuffed."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = 1.0
    o = _obj(nt)
    st = {"X": (3.0, 380.0, 380.0), "Y": (380.0, 3.0, 380.0), "Z": (380.0, 380.0, 3.0)}[axis]
    fine = _noise(nt, o, 1.0, 3.0, 0.6, mapping=st)
    smear = _maprange(nt, _noise(nt, o, 4.0, 6.0, 0.62), 0.45, 0.75, 0.0, 1.0)
    r = _math(nt, "ADD", _maprange(nt, fine, 0.3, 0.7, -0.04, 0.04), _math(nt, "MULTIPLY", smear, 0.2))
    _link(nt, _math(nt, "ADD", r, rough, clamp=True), b.inputs["Roughness"])
    _link(nt, _mix(nt, smear, rgb, tuple(c * 0.75 for c in rgb)), b.inputs["Base Color"])
    _bump(nt, b, fine, 0.02, 0.0002)
    return m


def glass(name, tint=(0.86, 0.9, 0.92), refl=0.05, rough=0.02):
    """Thin acrylic or glass pane: transparent, reflecting by Fresnel, with faint smudges."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = (*tint, 1)
    gl = _n(nt, "ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = rough
    lw = _n(nt, "ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.08
    smudge = _maprange(nt, _noise(nt, _obj(nt), 30.0, 5.0, 0.6), 0.45, 0.8, 0.0, 0.03)
    fac = _math(nt, "ADD", _math(nt, "ADD", _math(nt, "MULTIPLY", _out(lw, "Fresnel"), 0.8), refl), smudge, clamp=True)
    mx = _n(nt, "ShaderNodeMixShader")
    _link(nt, fac, mx.inputs[0])
    _link(nt, tr.outputs[0], mx.inputs[1])
    _link(nt, gl.outputs[0], mx.inputs[2])
    _link(nt, mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def screen_off(name):
    """A switched-off seat-back screen: near-black glossy glass with finger smudges that dull the reflection."""
    m, nt, b = _new(name)
    o = _obj(nt)
    _spec(b, 0.5)
    b.inputs["Base Color"].default_value = (0.006, 0.0065, 0.008, 1)
    sm = _maprange(nt, _noise(nt, o, 40.0, 5.0, 0.65), 0.45, 0.75, 0.06, 0.3)
    _link(nt, sm, b.inputs["Roughness"])
    return m


def glow(name, rgb, strength, falloff=0.0, axes=("X", "Z"), sample=False):
    """An emitter. With `falloff` a blank screen or lens: brightest in the middle, dimmer to its edges (generated
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
    m.cycles.emission_sampling = "AUTO" if sample else "NONE"
    return m


def curtain(name, rgb=(0.045, 0.05, 0.062)):
    """The galley curtain: heavy woven cloth that lets a little of the galley light through (translucent mix)."""
    m, nt, b = _new(name)
    o = _obj(nt)
    _spec(b, 0.2)
    b.inputs["Sheen Weight"].default_value = 0.5
    b.inputs["Roughness"].default_value = 0.9
    col = _mix(nt, _maprange(nt, _noise(nt, o, 300.0, 2.0, 0.7), 0.3, 0.7, 0.0, 1.0), tuple(c * 0.85 for c in rgb),
               tuple(c * 1.15 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    nt.nodes.remove(nt.nodes["Material Output"])
    out = _n(nt, "ShaderNodeOutputMaterial")
    tl = _n(nt, "ShaderNodeBsdfTranslucent")
    tl.inputs["Color"].default_value = (0.5, 0.52, 0.56, 1)
    mx = _n(nt, "ShaderNodeMixShader")
    mx.inputs[0].default_value = 0.12
    _link(nt, b.outputs[0], mx.inputs[1])
    _link(nt, tl.outputs[0], mx.inputs[2])
    _link(nt, mx.outputs[0], out.inputs["Surface"])
    return m


def sky(name, dip=-0.059):
    """The night sky seen from cruise altitude, as an emitting dome around the aircraft (object space, centred on the
    cabin): near-black navy overhead, a faint pale airglow band along a horizon that sits `dip` (sin of the dip
    angle, about 3.4 degrees) below level, and under it a dark cloud deck faintly lit by a moon out of shot, its
    cloud cells in perspective (the direction projected onto a plane far below)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    nrm = _n(nt, "ShaderNodeVectorMath", operation="NORMALIZE")
    _link(nt, _obj(nt), nrm.inputs[0])
    d = nrm.outputs["Vector"]
    dx, dy, dz = _xyz(nt, d)
    rel = _math(nt, "SUBTRACT", dz, dip)                       # height above the horizon line (sin)
    # above: zenith navy -> slightly lighter toward the horizon
    t = _math(nt, "POWER", _maprange(nt, rel, 0.0, 0.35, 0.0, 1.0), 0.5)
    col = _mix(nt, t, (0.030, 0.040, 0.062), (0.0035, 0.005, 0.011))
    # airglow: a thin pale band right on the horizon
    band = _math(nt, "POWER", _maprange(nt, _math(nt, "ABSOLUTE", rel), 0.0, 0.022, 1.0, 0.0), 2.2)
    col = _mix(nt, _math(nt, "MULTIPLY", band, 0.85), col, (0.085, 0.095, 0.12))
    # stars: sparse points from a fine Voronoi, only above the horizon
    vo = _n(nt, "ShaderNodeTexVoronoi", feature="F1")
    vo.inputs["Scale"].default_value = 420.0
    _link(nt, d, vo.inputs["Vector"])
    star = _math(nt, "MULTIPLY", _maprange(nt, _out(vo, "Distance"), 0.0, 0.05, 1.0, 0.0),
                 _maprange(nt, _noise(nt, d, 60.0, 1.0, 0.5), 0.62, 0.72, 0.0, 1.0))
    star = _math(nt, "MULTIPLY", star, _maprange(nt, rel, 0.02, 0.12, 0.0, 1.0))
    col = _mix(nt, _math(nt, "MULTIPLY", star, 0.9), col, (0.5, 0.55, 0.65))
    # below: the cloud deck in perspective (x, y divided by depth below)
    depth = _math(nt, "MAXIMUM", _math(nt, "SUBTRACT", 0.0, dz), 0.004)
    cx = _math(nt, "DIVIDE", dx, depth)
    cy = _math(nt, "DIVIDE", dy, depth)
    cv = _n(nt, "ShaderNodeCombineXYZ")
    _link(nt, cx, cv.inputs["X"])
    _link(nt, cy, cv.inputs["Y"])
    cloud = _noise(nt, cv.outputs["Vector"], 0.9, 6.0, 0.62)
    cells = _maprange(nt, cloud, 0.4, 0.72, 0.0, 1.0)
    below = _maprange(nt, rel, 0.0, -0.004, 0.0, 1.0)
    near = _maprange(nt, rel, -0.01, -0.25, 0.25, 1.0)          # detail fades into haze near the horizon
    deck = _mix(nt, _math(nt, "MULTIPLY", cells, near), (0.006, 0.007, 0.010), (0.024, 0.028, 0.036))
    deck = _mix(nt, _maprange(nt, rel, -0.002, -0.05, 1.0, 0.0), deck, (0.05, 0.056, 0.07))   # haze at the horizon
    col = _mix(nt, below, col, deck)
    _link(nt, col, em.inputs["Color"])
    em.inputs["Strength"].default_value = 8.75
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def wing_paint(name, rgb=(0.26, 0.27, 0.28)):
    """Wing upper skin, no livery: satin grey-white paint, darker walkway and panel tones, streaks of grime aft."""
    m, nt, b = _new(name)
    o = _obj(nt)
    _spec(b, 0.5)
    x, y, _ = _xyz(nt, o)
    panels = _maprange(nt, _noise(nt, o, 0.25, 2.0, 0.5), 0.35, 0.65, 0.0, 1.0)
    col = _mix(nt, panels, tuple(c * 0.85 for c in rgb), tuple(c * 1.05 for c in rgb))
    streak = _maprange(nt, _noise(nt, o, 1.0, 4.0, 0.6, mapping=(6.0, 0.4, 1.0)), 0.5, 0.7, 0.0, 0.35)
    col = _mix(nt, streak, col, tuple(c * 0.55 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, panels, 0.0, 1.0, 0.32, 0.45), b.inputs["Roughness"])
    del x, y
    return m


def webbing(name, rgb=(0.035, 0.038, 0.046)):
    """Seat-belt webbing: tight nylon twill with a low sheen, its ribs across the strap."""
    m, nt, b = _new(name)
    o = _obj(nt)
    _spec(b, 0.3)
    b.inputs["Sheen Weight"].default_value = 0.3
    rib = _wave(nt, o, 1100.0, "Y")
    col = _mix(nt, _maprange(nt, rib, 0.2, 0.8, 0.0, 1.0), tuple(c * 0.8 for c in rgb), tuple(c * 1.25 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, _noise(nt, o, 30.0, 3.0, 0.6), 0.3, 0.7, 0.5, 0.68), b.inputs["Roughness"])
    _bump(nt, b, rib, 0.3, 0.0003)
    return m


def paper(name, rgb=(0.46, 0.45, 0.42), rough=0.82, coat=0.0):
    """A blank printed card or magazine cover (no text): matt, slightly warm, edges handled darker."""
    m, nt, b = _new(name)
    o = _obj(nt)
    _spec(b, 0.3)
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = 0.2
    tone = _maprange(nt, _noise(nt, o, 18.0, 4.0, 0.6), 0.35, 0.7, 0.0, 1.0)
    _link(nt, _mix(nt, tone, tuple(c * 0.9 for c in rgb), rgb), b.inputs["Base Color"])
    _link(nt, _maprange(nt, tone, 0.0, 1.0, rough - 0.08, rough + 0.06), b.inputs["Roughness"])
    _bump(nt, b, _noise(nt, o, 500.0, 2.0, 0.6), 0.05, 0.0002)
    return m


def halo(name, rgb, strength):
    """A soft glow round a small light: a transparent shell that emits where it faces the eye (no hard edge)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    lw = _n(nt, "ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.5
    f = _math(nt, "POWER", _math(nt, "SUBTRACT", 1.0, _out(lw, "Facing")), 5.0)
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    _link(nt, _math(nt, "MULTIPLY", f, strength), em.inputs["Strength"])
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    add = _n(nt, "ShaderNodeAddShader")
    _link(nt, tr.outputs[0], add.inputs[0])
    _link(nt, em.outputs[0], add.inputs[1])
    _link(nt, add.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    m.cycles.emission_sampling = "NONE"
    return m


def materials(lanes=()):
    M.clear()
    M["seat"] = upholstery("seat cloth")
    M["seat_dark"] = upholstery("seat cloth dark", (0.032, 0.036, 0.045))
    M["cover"] = cover_cloth("headrest cover")
    M["shell"] = shell("seat shell")
    M["dark_plastic"] = pbr("dark plastic", (0.028, 0.029, 0.032), (0.38, 0.5), spec=0.4, bump=0.05, bscale=500)
    M["mid_plastic"] = pbr("mid plastic", (0.12, 0.122, 0.125), (0.4, 0.55), spec=0.4, bump=0.05, bscale=500)
    M["lining"] = lining("sidewall lining")
    M["bin"] = lining("bin doors", (0.42, 0.42, 0.412))
    M["ceiling"] = lining("ceiling panels", (0.38, 0.385, 0.39))
    M["seam"] = pbr("panel joint", (0.06, 0.062, 0.066), (0.5, 0.62), spec=0.3)
    M["dado"] = pbr("dado panel", (0.10, 0.104, 0.11), (0.45, 0.6), spec=0.35, bump=0.05, bscale=400, grime=0.4)
    M["carpet"] = carpet("cabin carpet", lane_x=lanes)
    M["track"] = aluminium("seat track")
    M["leg"] = pbr("seat leg paint", (0.07, 0.072, 0.078), (0.32, 0.5), spec=0.45, grime=0.35)
    M["frame"] = aluminium("seat frame", (0.40, 0.41, 0.43), 0.38, "X")
    M["shade"] = pbr("window shade", (0.46, 0.46, 0.45), (0.55, 0.7), spec=0.3, bump=0.06, bscale=600)
    M["reveal"] = lining("window reveal", (0.37, 0.372, 0.37))
    M["pane"] = glass("window pane", refl=0.035)
    M["scratch_pane"] = glass("scratch pane", tint=(0.9, 0.92, 0.94), refl=0.02, rough=0.05)
    M["screen_off"] = screen_off("screen off")
    M["screen_on"] = glow("screen blank glow", (0.55, 0.66, 0.85), 0.9, falloff=0.45, axes=("X", "Z"))
    M["lens_off"] = pbr("reading lens off", (0.2, 0.2, 0.2), (0.25, 0.3), spec=0.5)
    M["lens_on"] = glow("reading lens on", (1.0, 0.86, 0.68), 60.0, falloff=0.5, axes=("X", "Y"))
    M["cove"] = glow("night cove light", (0.32, 0.45, 0.9), 3.0, sample=True)
    M["path"] = glow("aisle path light", (0.74, 0.84, 1.0), 2.6, sample=True)
    M["path_dim"] = glow("aisle path strip", (0.5, 0.75, 0.82), 0.10)
    M["wash"] = glow("sidewall wash slot", (0.36, 0.5, 0.95), 0.7)
    M["belt"] = webbing("belt webbing")
    M["buckle"] = aluminium("belt buckle", (0.62, 0.63, 0.65), 0.3, "Y")
    M["card"] = paper("safety card", (0.46, 0.455, 0.43))
    M["magazine"] = paper("magazine cover", (0.07, 0.085, 0.11), rough=0.45, coat=0.4)
    M["sign"] = glow("blank sign glow", (0.7, 0.76, 0.86), 1.2, falloff=0.3)
    M["curtain"] = curtain("galley curtain")
    M["galley"] = glow("galley glow", (0.85, 0.88, 0.95), 1.6, falloff=0.6, axes=("X", "Z"))
    M["sky"] = sky("night sky")
    M["wing"] = wing_paint("wing paint")
    M["wing_dark"] = pbr("wing edges", (0.16, 0.165, 0.17), (0.35, 0.5), spec=0.5)
    M["nav_red"] = glow("nav light red", (1.0, 0.08, 0.05), 40.0)
    M["nav_halo"] = halo("nav light halo", (1.0, 0.07, 0.04), 1.2)
    M["nav_white"] = glow("nav light white", (1.0, 0.97, 0.92), 8.0)
    M["black"] = pbr("black void", (0.005, 0.005, 0.006), (0.8, 0.9))
    return M
