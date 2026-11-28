"""Materials for the leather market (Cycles, Principled BSDF). Every pattern works in object space, in metres, so a
part keeps its pattern wherever it is put, and no surface reads as one flat value (tone and roughness always vary).

Lane concrete with saw-cut joints, stains and standing water; stall floor tiles; galvanised corrugated sheet with
run-off streaks; painted roller-shutter steel; painted board; powder-coated wire; moulded crate plastic coloured per
object; worn counter laminate; cable rubber; matt card for the blank tags; fluorescent tubes and their opal
diffusers. `recolour` turns a generated handbag's material into one that takes its colour from the object, so linked
copies of one bag hang side by side in different leathers.
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


def _maprange(nt, src, a, b, c, d, smooth=False):
    n = _n(nt, "ShaderNodeMapRange")
    if smooth:
        n.interpolation_type = "SMOOTHSTEP"
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


def _xyz(nt, vec):
    s = _n(nt, "ShaderNodeSeparateXYZ")
    _link(nt, vec, s.inputs["Vector"])
    return s.outputs["X"], s.outputs["Y"], s.outputs["Z"]


def _ao(nt, distance=0.35):
    n = _n(nt, "ShaderNodeAmbientOcclusion", samples=4)
    n.inputs["Distance"].default_value = distance
    return n.outputs["AO"]


def _attr(nt, name, kind="OBJECT"):
    a = _n(nt, "ShaderNodeAttribute")
    a.attribute_type = kind
    a.attribute_name = name
    return a


# ---------------------------------------------------------------- general surfaces
def pbr(name, rgb, rough=(0.4, 0.55), metal=0.0, nscale=4.0, stretch=(1, 1, 1), cvar=0.1, bump=0.0, bscale=90.0,
        grime=0.0, spec=0.5):
    """A principled surface with tone and roughness variation; `grime` darkens it into contact corners (AO)."""
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Specular IOR Level"].default_value = spec
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


def concrete_wet(name="lane concrete"):
    """The lane: power-floated concrete, darker with age along the stall fronts, saw-cut joints every 3 m across the
    lane and one along it, oil and tea stains, and standing water: puddles where the slab dips toward the centre
    drain and in the joints. Puddles are dark and mirror-smooth with a damp, half-rough rim; dry concrete keeps a fine
    aggregate bump that the water flattens."""
    m, nt, b = _new(name)
    o = _n(nt, "ShaderNodeNewGeometry").outputs["Position"]     # world space: the slab is in several pieces
    x, y, z = _xyz(nt, o)
    # puddle field: two octaves of noise, biased toward the lane centre (|x| small) where the drain runs
    big = _noise(nt, o, 0.78, 1.0, 0.55, mapping=(1.0, 0.55, 1.0))
    small = _noise(nt, o, 1.6, 2.0, 0.5)
    field = _math(nt, "ADD", _math(nt, "MULTIPLY", big, 0.8), _math(nt, "MULTIPLY", small, 0.06))
    centre = _maprange(nt, _math(nt, "ABSOLUTE", x), 0.15, 1.1, 0.22, -0.12, smooth=True)
    field = _math(nt, "ADD", field, centre)
    for px, py in ((0.30, 4.90), (-0.25, -4.1), (0.42, -1.5), (0.15, 10.8)):
        dx = _math(nt, "SUBTRACT", x, px)
        dy = _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", y, py), 0.64)
        r2 = _math(nt, "ADD", _math(nt, "MULTIPLY", dx, dx), _math(nt, "MULTIPLY", dy, dy))
        pool = _maprange(nt, r2, 0.03, 0.64, 0.28, 0.0, smooth=True)
        field = _math(nt, "ADD", field, pool)
    wet = _maprange(nt, field, 0.60, 0.62, 0.0, 1.0, smooth=True)          # standing water
    damp = _maprange(nt, field, 0.52, 0.60, 0.0, 1.0, smooth=True)          # the darker damp rim around it
    # tone: aggregate mottling, darker grime toward the stall fronts, stains
    mott = _maprange(nt, _noise(nt, o, 7.0, 6.0, 0.62), 0.3, 0.7, 0.0, 1.0)
    base = _mix(nt, mott, (0.105, 0.104, 0.1), (0.15, 0.148, 0.142))
    edge = _maprange(nt, _math(nt, "ABSOLUTE", x), 0.6, 1.22, 0.0, 0.5, smooth=True)
    base = _mix(nt, edge, base, (0.07, 0.068, 0.064))
    stain = _maprange(nt, _noise(nt, o, 1.1, 4.0, 0.65), 0.6, 0.72, 0.0, 0.55, smooth=True)
    base = _mix(nt, stain, base, (0.06, 0.055, 0.05))
    # saw-cut joints: thin dark lines across the lane every 3 m and along it at x = +-0.6
    jy = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", _math(nt, "FRACT", _math(nt, "DIVIDE", y, 3.0)), 0.5))
    jline = _maprange(nt, jy, 0.4975, 0.4995, 0.0, 1.0)
    jx = _maprange(nt, _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", _math(nt, "ABSOLUTE", x), 0.6)), 0.002, 0.0035, 1.0, 0.0)
    joint = _math(nt, "MAXIMUM", jline, jx)
    base = _mix(nt, _math(nt, "MULTIPLY", joint, 0.85), base, (0.03, 0.03, 0.03))
    col = _mix(nt, _math(nt, "MULTIPLY", damp, 0.60), base, (0.055, 0.055, 0.056))
    col = _mix(nt, wet, col, (0.03, 0.031, 0.034))
    _link(nt, col, b.inputs["Base Color"])
    dry_r = _maprange(nt, _noise(nt, o, 3.0, 4.0, 0.6), 0.3, 0.7, 0.55, 0.8)
    r = _fmix(nt, damp, dry_r, 0.25)
    r = _fmix(nt, wet, r, 0.035)
    _link(nt, r, b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.5
    # aggregate and trowel bump, flattened by the water; the joints are cut 3 mm deep
    agg = _math(nt, "ADD", _math(nt, "MULTIPLY", _noise(nt, o, 180.0, 3.0, 0.6), 0.6), _noise(nt, o, 25.0, 2.0, 0.5))
    h = _math(nt, "SUBTRACT", _math(nt, "MULTIPLY", agg, _math(nt, "SUBTRACT", 1.0, wet)), _math(nt, "MULTIPLY", joint, 2.0))
    # a few fine ripples on the water
    rip = _math(nt, "MULTIPLY", _noise(nt, o, 22.0, 1.0, 0.5), _math(nt, "MULTIPLY", wet, 0.06))
    _bump(nt, b, _math(nt, "ADD", h, rip), 0.22, 0.0012)
    return m


def floor_tiles(name="stall tiles"):
    """Stall floors: 400 mm glazed porcelain tiles, warm grey, dark grout, scuffed and dirtier at the edges."""
    m, nt, b = _new(name)
    o = _obj(nt)
    br = _n(nt, "ShaderNodeTexBrick", offset=0.0, squash=1.0)
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.004
    br.inputs["Mortar Smooth"].default_value = 0.2
    br.inputs["Brick Width"].default_value = 0.4
    br.inputs["Row Height"].default_value = 0.4
    br.inputs["Bias"].default_value = 0.0
    br.inputs["Color1"].default_value = (0.24, 0.23, 0.215, 1)
    br.inputs["Color2"].default_value = (0.27, 0.26, 0.245, 1)
    br.inputs["Mortar"].default_value = (0.05, 0.048, 0.045, 1)
    _link(nt, o, br.inputs["Vector"])
    dirt = _maprange(nt, _noise(nt, o, 2.2, 5.0, 0.6), 0.35, 0.7, 0.0, 0.83)
    col = _mix(nt, dirt, _out(br, "Color"), (0.09, 0.085, 0.078))
    _link(nt, col, b.inputs["Base Color"])
    pos = _out(nt.nodes.new("ShaderNodeNewGeometry"), "Position")
    x = _xyz(nt, pos)[0]
    path = _maprange(nt, _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", x, 1.85)), 0.15, 0.7, 1.0, 0.0)
    wear = _math(nt, "MULTIPLY", path, dirt)
    _link(nt, _mix(nt, wear, col, (0.05, 0.046, 0.042)), b.inputs["Base Color"])
    rough = _maprange(nt, _noise(nt, o, 5.0, 4.0, 0.6), 0.3, 0.7, 0.16, 0.42)
    _link(nt, _math(nt, "ADD", rough, _math(nt, "MULTIPLY", wear, 0.12)), b.inputs["Roughness"])
    _bump(nt, b, _out(br, "Fac"), 0.3, 0.002)
    return m


def galvanised(name, rgb=(0.36, 0.365, 0.37), streak=0.55, metal=0.75):
    """Galvanised sheet (awnings, flashing): spangle, dull oxide, rust and run-off streaks down the slope (local X
    runs down the sheet), dirt in the troughs."""
    m, nt, b = _new(name)
    o = _obj(nt)
    x, y, z = _xyz(nt, o)
    sp = _maprange(nt, _noise(nt, o, 60.0, 1.0, 0.5), 0.35, 0.65, 0.85, 1.12)
    base = _mix(nt, 1.0, rgb, _math(nt, "MULTIPLY", sp, 1.0), blend="MULTIPLY")
    # streaks: noise stretched hard along the run of the sheet (local X)
    st = _maprange(nt, _noise(nt, o, 3.0, 4.0, 0.6, mapping=(0.12, 6.0, 1.0)), 0.45, 0.75, 0.0, streak)
    base = _mix(nt, st, base, (0.13, 0.1, 0.075))
    rust = _maprange(nt, _noise(nt, o, 6.0, 6.0, 0.7), 0.66, 0.76, 0.0, 0.7)
    base = _mix(nt, rust, base, (0.16, 0.075, 0.035))
    _link(nt, base, b.inputs["Base Color"])
    b.inputs["Metallic"].default_value = metal
    met = _maprange(nt, _math(nt, "ADD", st, rust), 0.0, 0.8, metal, 0.1)
    _link(nt, met, b.inputs["Metallic"])
    _link(nt, _maprange(nt, _noise(nt, o, 8.0, 3.0, 0.6), 0.3, 0.7, 0.42, 0.7), b.inputs["Roughness"])
    return m


def shutter_paint(name, rgb):
    """Painted roller-shutter steel: chalky faded paint, scuffs to bare grey metal at hand height, grime at the foot."""
    m, nt, b = _new(name)
    o = _obj(nt)
    x, y, z = _xyz(nt, o)
    chalk = _maprange(nt, _noise(nt, o, 2.5, 5.0, 0.6), 0.3, 0.7, 0.85, 1.1)
    col = _mix(nt, 1.0, rgb, chalk, blend="MULTIPLY")
    foot = _maprange(nt, z, 0.0, 0.5, 0.75, 0.0, smooth=True)
    col = _mix(nt, foot, col, (0.04, 0.038, 0.035))
    scuff = _math(nt, "MULTIPLY", _maprange(nt, _noise(nt, o, 9.0, 5.0, 0.7), 0.62, 0.72, 0.0, 1.0),
                  _maprange(nt, z, 0.6, 1.5, 1.0, 0.0, smooth=True))
    col = _mix(nt, scuff, col, (0.2, 0.2, 0.2))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, _noise(nt, o, 4.0, 3.0, 0.6), 0.3, 0.7, 0.5, 0.75), b.inputs["Roughness"])
    _link(nt, _math(nt, "MULTIPLY", scuff, 0.6), b.inputs["Metallic"])
    return m


def crate_plastic(name="crate plastic"):
    """Moulded polypropylene crate: colour per object (custom property lm_col), a satin moulded finish, scuffs and
    grime lighter in the edges."""
    m, nt, b = _new(name)
    o = _obj(nt)
    a = _attr(nt, "lm_col")
    dirt = _maprange(nt, _noise(nt, o, 9.0, 5.0, 0.6), 0.35, 0.75, 0.0, 0.55)
    col = _mix(nt, dirt, _out(a, "Color"), (0.06, 0.06, 0.058))
    scuff = _maprange(nt, _noise(nt, o, 40.0, 3.0, 0.6), 0.64, 0.74, 0.0, 0.35)
    col = _mix(nt, scuff, col, (0.3, 0.3, 0.3))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, _noise(nt, o, 12.0, 3.0, 0.6), 0.3, 0.7, 0.4, 0.62), b.inputs["Roughness"])
    _bump(nt, b, _noise(nt, o, 300.0, 2.0, 0.5), 0.08, 0.0005)
    return m


def laminate(name, rgb=(0.2, 0.19, 0.175)):
    """A counter top: worn laminate, smoother and lighter where hands and goods slide over it, edge chips."""
    m, nt, b = _new(name)
    o = _obj(nt)
    wear = _maprange(nt, _noise(nt, o, 1.8, 4.0, 0.6), 0.4, 0.7, 0.0, 1.0)
    col = _mix(nt, wear, rgb, tuple(min(1, c * 1.25) for c in rgb))
    speck = _maprange(nt, _noise(nt, o, 120.0, 2.0, 0.5), 0.6, 0.7, 0.0, 0.3)
    col = _mix(nt, speck, col, (0.06, 0.06, 0.06))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, wear, 0.0, 1.0, 0.62, 0.4), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.4
    # fine scratches dragged along the counter's depth (local X) by goods pushed across it
    scr = _maprange(nt, _noise(nt, o, 90.0, 2.0, 0.6, mapping=(0.08, 6.0, 1.0)), 0.62, 0.7, 0.0, 1.0)
    _bump(nt, b, _math(nt, "ADD", _noise(nt, o, 90.0, 3.0, 0.6), _math(nt, "MULTIPLY", scr, -0.6)), 0.08, 0.0006)
    return m


def paper(name, rgb=(0.6, 0.585, 0.54)):
    """Matt card (the blank tags): slightly warm, fibrous, a faint grime."""
    m, nt, b = _new(name)
    o = _obj(nt)
    col = _mix(nt, _maprange(nt, _noise(nt, o, 60.0, 4.0, 0.6), 0.3, 0.7, 0.0, 0.3), rgb, tuple(c * 0.8 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.92
    b.inputs["Specular IOR Level"].default_value = 0.25
    _bump(nt, b, _noise(nt, o, 900.0, 2.0, 0.5), 0.15, 0.0002)
    return m


def tube(name, strength, rgb=(0.86, 0.94, 1.0)):
    """A burning fluorescent tube: emission with the faint banding of a phosphor coat; the value node `strength` can
    be changed per camera."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    sv = _n(nt, "ShaderNodeValue", name="strength", label="strength")
    sv.outputs[0].default_value = strength
    o = _obj(nt)
    prism = _maprange(nt, _noise(nt, o, 80.0, 1.0, 0.5), 0.3, 0.7, 0.93, 1.05)
    _link(nt, _math(nt, "MULTIPLY", prism, sv.outputs[0]), em.inputs["Strength"])
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"   # the area light beside it does the lighting
    return m


def glow(name, rgb, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    em.inputs["Strength"].default_value = strength
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


# ---------------------------------------------------------------- the handbags: colour from the object
def recolour(mat, median_lum, gamma=0.65, spec=0.4, rough_add=0.15):
    """Make a generated bag's material take its leather colour from the object that wears it, so linked copies of one
    model hang side by side in different leathers. Each object carries lm_tint (rgb), lm_tf (0 = the texture's own
    colour through hue / saturation / value, 1 = the tint) and lm_hue, lm_sat, lm_val. The tint keeps the texture's
    own light and dark (its luminance about its median, softened by `gamma`), so seams, creases and panels survive.
    The clasps keep their brass tint with a subdued satin finish."""
    nt = mat.node_tree
    b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if b is None or not b.inputs["Base Color"].is_linked:
        return
    src = b.inputs["Base Color"].links[0].from_socket
    hsv = _n(nt, "ShaderNodeHueSaturation")
    _link(nt, src, hsv.inputs["Color"])
    _link(nt, _math(nt, "ADD", _out(_attr(nt, "lm_hue"), "Fac"), 0.5), hsv.inputs["Hue"])
    _link(nt, _out(_attr(nt, "lm_sat"), "Fac"), hsv.inputs["Saturation"])
    _link(nt, _out(_attr(nt, "lm_val"), "Fac"), hsv.inputs["Value"])
    bw = _n(nt, "ShaderNodeRGBToBW")
    _link(nt, src, bw.inputs["Color"])
    rel = _math(nt, "POWER", _math(nt, "DIVIDE", bw.outputs[0], median_lum), gamma)
    rel = _math(nt, "MINIMUM", _math(nt, "MAXIMUM", rel, 0.35), 1.8)
    tinted = _mix(nt, 1.0, _out(_attr(nt, "lm_tint"), "Color"), rel, blend="MULTIPLY")
    col = _mix(nt, _out(_attr(nt, "lm_tf"), "Fac"), hsv.outputs["Color"], tinted)
    met = b.inputs["Metallic"]
    if met.is_linked:
        original_metal = met.links[0].from_socket
        brass = _n(nt, "ShaderNodeHueSaturation", Saturation=0.35, Value=0.8)
        _link(nt, src, brass.inputs["Color"])
        col = _mix(nt, _maprange(nt, original_metal, 0.3, 0.6, 0.0, 1.0), col, brass.outputs["Color"])
        _link(nt, _math(nt, "MINIMUM", original_metal, 0.17), met)
    else:
        met.default_value = min(met.default_value, 0.17)
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Specular IOR Level"].default_value = spec
    if "Coat Weight" in b.inputs:
        b.inputs["Coat Weight"].default_value = 0.0
    rough = b.inputs["Roughness"]
    if rough.is_linked:
        s = rough.links[0].from_socket
        if rough_add:
            s = _math(nt, "ADD", s, rough_add, clamp=True)
        _link(nt, _math(nt, "MAXIMUM", s, 0.66), rough)
    else:
        rough.default_value = max(rough.default_value, 0.66)


def stock_leather():
    m, nt, b = _new("market stock leather")
    tint = _out(_attr(nt, "lm_tint"), "Color")
    obj = _obj(nt)
    wear = _maprange(nt, _noise(nt, obj, 15, 3, 0.55), 0.2, 0.8, 0.79, 1.08)
    _link(nt, _mix(nt, 1.0, tint, wear, blend="MULTIPLY"), b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.64
    b.inputs["Specular IOR Level"].default_value = 0.21
    _bump(nt, b, _noise(nt, obj, 430, 2, 0.56), 0.14, 0.0012)
    return m


def nylon(mat):
    """Give the existing black cloth a fine weave while preserving the model's normal map."""
    tune_prop(mat, spec=0.45)
    nt = mat.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    for link in list(b.inputs["Roughness"].links):
        nt.links.remove(link)
    b.inputs["Roughness"].default_value = 0.48
    tex = _obj(nt)
    weave = _noise(nt, tex, 1000, 2, 0.55, mapping=(1, 3.0, 1))
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.03
    bump.inputs["Distance"].default_value = 0.00035
    if b.inputs["Normal"].links:
        nt.links.new(b.inputs["Normal"].links[0].from_socket, bump.inputs["Normal"])
    nt.links.new(weave, bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])


def tune_prop(mat, spec=None, sat=None, val=None, rough_add=0.0, hue=0.5):
    """The hero duffel: hue / saturation / value after its texture, specular cut (generated textures come with a
    plastic sheen that greys black fabric), roughness lifted."""
    nt = mat.node_tree
    b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if b is None:
        return
    base = b.inputs["Base Color"]
    if base.is_linked and (sat is not None or val is not None):
        src = base.links[0].from_socket
        hsv = _n(nt, "ShaderNodeHueSaturation")
        hsv.inputs["Hue"].default_value = hue
        hsv.inputs["Saturation"].default_value = 1.0 if sat is None else sat
        hsv.inputs["Value"].default_value = 1.0 if val is None else val
        _link(nt, src, hsv.inputs["Color"])
        _link(nt, hsv.outputs["Color"], base)
    if spec is not None:
        b.inputs["Specular IOR Level"].default_value = spec
    if "Coat Weight" in b.inputs:
        b.inputs["Coat Weight"].default_value = 0.0
    r = b.inputs["Roughness"]
    if rough_add:
        if r.is_linked:
            s = r.links[0].from_socket
            _link(nt, _math(nt, "ADD", s, rough_add, clamp=True), r)
        else:
            r.default_value = min(1.0, r.default_value + rough_add)


def materials():
    """All the set's materials, once."""
    if M:
        return M
    M["concrete"] = concrete_wet()
    M["tiles"] = floor_tiles()
    M["galv"] = galvanised("awning galv")
    M["galv_dark"] = galvanised("awning galv dark", rgb=(0.2, 0.205, 0.21), streak=0.7)
    M["shutter_a"] = shutter_paint("shutter grey", (0.2, 0.215, 0.225))
    M["shutter_b"] = shutter_paint("shutter blue", (0.12, 0.16, 0.2))
    M["shutter_c"] = shutter_paint("shutter green", (0.13, 0.17, 0.15))
    M["wall"] = pbr("stall wall paint", (0.32, 0.325, 0.31), rough=(0.6, 0.8), nscale=3.0, cvar=0.12, grime=0.35,
                    bump=0.04, bscale=200.0)
    M["wall_dark"] = pbr("partition paint", (0.16, 0.165, 0.16), rough=(0.6, 0.8), nscale=3.0, cvar=0.15, grime=0.4,
                         bump=0.04, bscale=200.0)
    M["ceiling"] = pbr("stall ceiling board", (0.26, 0.26, 0.25), rough=(0.7, 0.85), nscale=2.0, cvar=0.12, grime=0.3)
    M["fascia"] = pbr("fascia board", (0.18, 0.2, 0.22), rough=(0.45, 0.65), nscale=2.0, cvar=0.15, grime=0.3)
    M["fascia_b"] = pbr("fascia board b", (0.22, 0.19, 0.16), rough=(0.45, 0.65), nscale=2.0, cvar=0.15, grime=0.3)
    M["wire"] = pbr("powder-coat wire", (0.025, 0.025, 0.027), rough=(0.35, 0.5), nscale=20.0, cvar=0.2, spec=0.45)
    M["chrome_hook"] = pbr("hook steel", (0.55, 0.56, 0.57), rough=(0.25, 0.4), metal=1.0, nscale=30.0)
    M["steel"] = pbr("painted steel", (0.06, 0.062, 0.065), rough=(0.4, 0.6), metal=0.3, nscale=6.0, cvar=0.2, grime=0.3)
    M["steel_bare"] = pbr("bare steel", (0.4, 0.4, 0.41), rough=(0.35, 0.55), metal=1.0, nscale=8.0, cvar=0.15)
    M["roof_steel"] = pbr("roof steel", (0.05, 0.052, 0.055), rough=(0.5, 0.7), metal=0.4, nscale=1.0, cvar=0.2)
    M["crate"] = crate_plastic()
    M["counter_top"] = laminate("counter top", (0.062, 0.06, 0.057))
    M["counter_front"] = pbr("counter front", (0.04, 0.038, 0.037), rough=(0.4, 0.6), nscale=3.0, cvar=0.25, grime=0.3,
                             bump=0.03, bscale=150.0)
    M["ply"] = pbr("plywood shelf", (0.26, 0.2, 0.14), rough=(0.6, 0.8), nscale=2.0, stretch=(1, 12, 1), cvar=0.25)
    M["cable"] = pbr("cable rubber", (0.018, 0.018, 0.019), rough=(0.45, 0.6), nscale=40.0, cvar=0.3, spec=0.4)
    M["cable_grey"] = pbr("cable grey", (0.16, 0.16, 0.155), rough=(0.5, 0.65), nscale=40.0, cvar=0.2)
    M["tag"] = paper("blank tag card", (0.35, 0.34, 0.31))
    M["string"] = pbr("tag string", (0.32, 0.3, 0.27), rough=(0.85, 0.95), nscale=200.0, cvar=0.2, spec=0.2)
    M["tube_on"] = tube("tube on", 9.0)
    M["tube_dim"] = tube("tube dim", 2.5)
    M["tube_warm"] = tube("bulb warm", 14.0, (1.0, 0.72, 0.42))
    M["diffuser_off"] = pbr("tube off", (0.36, 0.37, 0.38), rough=(0.25, 0.35), nscale=10.0, cvar=0.05)
    M["batten"] = pbr("batten body", (0.42, 0.43, 0.44), rough=(0.4, 0.55), nscale=12.0, cvar=0.12, grime=0.4)
    M["sky"] = glow("skylight night", (0.32, 0.42, 0.6), 0.35)
    M["tape"] = pbr("tape roll", (0.46, 0.27, 0.095), rough=(0.18, 0.27), nscale=30.0, cvar=0.1)
    M["stock_kraft"] = pbr("corrugated kraft", (0.33, 0.23, 0.13), rough=(0.81, 0.89), bump=0.05, bscale=220)
    M["packing"] = pbr("plain paper tape", (0.29, 0.21, 0.14), rough=(0.54, 0.68))
    M["stock_wrap"] = pbr("clear stock sleeves", (0.80, 0.83, 0.85), rough=(0.21, 0.29), bump=0.15, bscale=40)
    film = next(n for n in M["stock_wrap"].node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    film.inputs["Transmission Weight"].default_value = 0.65
    film.inputs["IOR"].default_value = 1.46
    M["poly_bag"] = pbr("folded carrier bags", (0.02, 0.02, 0.022), rough=(0.25, 0.4), nscale=25.0, cvar=0.3, spec=0.5)
    return M
