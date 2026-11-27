"""Materials for the Hong Kong hotel room (Ch 03 / Ch 04): cool painted walls and grasscloth, a low-pile carpet, white
cotton bedding, a slate runner, dark walnut veneer, brushed aluminium, translucent tissue paper, a linen lamp shade, the
thin window glass and the props' finish.

Everything is node-built here; the stage modules only ask for a material by name from M.
"""
import math

import bpy  # noqa: F401  (first)

import setkit as sk

M = {}


# ---------------------------------------------------------------- node plumbing

def _nodes(m):
    nt = m.node_tree
    return nt, next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")


def _n(nt, kind, **inputs):
    n = nt.nodes.new(kind)
    for k, v in inputs.items():
        n.inputs[k].default_value = v
    return n


def _coord(nt, kind="Object"):
    return nt.nodes.new("ShaderNodeTexCoord").outputs[kind]


def _noise(nt, scale, detail=2.0, rough=0.5, vec=None, mapping=None):
    nz = _n(nt, "ShaderNodeTexNoise", Scale=scale, Detail=detail, Roughness=rough)
    v = vec if vec is not None else _coord(nt)
    if mapping is not None:
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = mapping
        nt.links.new(v, mp.inputs["Vector"])
        v = mp.outputs[0]
    nt.links.new(v, nz.inputs["Vector"])
    return nz


def _maprange(nt, src, lo, hi, a=0.0, b=1.0):
    mr = _n(nt, "ShaderNodeMapRange")
    mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = a, b
    mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = lo, hi
    nt.links.new(src, mr.inputs["Value"])
    return mr.outputs["Result"]


def _math(nt, op, a, b=0.0, clamp=False):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation, n.use_clamp = op, clamp
    for i, v in enumerate((a, b)):
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def _mulcol(nt, rgb, fac_socket):
    mx = nt.nodes.new("ShaderNodeMix")
    mx.data_type, mx.blend_type = "RGBA", "MULTIPLY"
    mx.inputs["Factor"].default_value = 1.0
    mx.inputs["A"].default_value = (*rgb, 1)
    nt.links.new(fac_socket, mx.inputs["B"])
    return mx.outputs["Result"]


def _bump(nt, b, height, strength, dist=0.001):
    bp = _n(nt, "ShaderNodeBump", Strength=strength, Distance=dist)
    nt.links.new(height, bp.inputs["Height"])
    if b.inputs["Normal"].is_linked:
        nt.links.new(b.inputs["Normal"].links[0].from_socket, bp.inputs["Normal"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return bp


def _rough_var(nt, b, lo, hi, scale=4.0):
    nt.links.new(_maprange(nt, _noise(nt, scale, 3.0).outputs["Fac"], lo, hi), b.inputs["Roughness"])


# ---------------------------------------------------------------- surfaces

def paint(name, rgb, rough=0.86, peel=0.05, spec=0.3):
    m = sk.mat(name, rgb, rough)
    nt, b = _nodes(m)
    b.inputs["Specular IOR Level"].default_value = spec
    _bump(nt, b, _noise(nt, 170.0, 3.0).outputs["Fac"], peel, 0.0005)
    _rough_var(nt, b, rough - 0.06, rough + 0.04, 2.0)
    tone = _maprange(nt, _noise(nt, 1.5, 3.0).outputs["Fac"], 0.94, 1.04)
    nt.links.new(_mulcol(nt, rgb, tone), b.inputs["Base Color"])
    return m


def grasscloth(name, rgb, rough=0.9):
    """Hotel wallcovering: a fine horizontal fibre (stretched noise) with a faint vertical panel seam every 0.91 m."""
    m = sk.mat(name, rgb, rough)
    nt, b = _nodes(m)
    b.inputs["Specular IOR Level"].default_value = 0.2
    fib = _noise(nt, 6.0, 8.0, 0.6, mapping=(2.0, 2.0, 60.0))      # fibres run horizontally (long in X/Y, fine in Z)
    tone = _maprange(nt, fib.outputs["Fac"], 0.82, 1.1)
    nt.links.new(_mulcol(nt, rgb, tone), b.inputs["Base Color"])
    _bump(nt, b, fib.outputs["Fac"], 0.25, 0.0008)
    return m


def carpet(name, rgb=(0.045, 0.05, 0.06), accent=(0.075, 0.075, 0.075)):
    """Low-pile hotel carpet: a dense loop texture, a quiet large lattice in a lighter yarn, matt."""
    m = sk.mat(name, rgb, 0.95)
    nt, b = _nodes(m)
    b.inputs["Specular IOR Level"].default_value = 0.08
    b.inputs["Sheen Weight"].default_value = 0.3
    o = _coord(nt)
    # the lattice: two families of thin diagonal bands (a wave texture), a 0.45 m repeat
    lat = 0.0
    out = None
    for rot in (45.0, -45.0):
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Rotation"].default_value = (0, 0, math.radians(rot))
        nt.links.new(o, mp.inputs["Vector"])
        wv = _n(nt, "ShaderNodeTexWave", Scale=2.2, Distortion=0.0)
        wv.wave_type, wv.bands_direction, wv.wave_profile = "BANDS", "X", "SIN"
        nt.links.new(mp.outputs[0], wv.inputs["Vector"])
        band = _math(nt, "GREATER_THAN", wv.outputs["Fac"], 0.93)
        out = band if out is None else _math(nt, "MAXIMUM", out, band)
    _ = lat
    loops = _noise(nt, 900.0, 2.0)
    cmix = nt.nodes.new("ShaderNodeMix")
    cmix.data_type = "RGBA"
    nt.links.new(out, cmix.inputs["Factor"])
    cmix.inputs["A"].default_value = (*rgb, 1)
    cmix.inputs["B"].default_value = (*accent, 1)
    tone = _maprange(nt, loops.outputs["Fac"], 0.75, 1.2)
    mm = nt.nodes.new("ShaderNodeMix")
    mm.data_type, mm.blend_type = "RGBA", "MULTIPLY"
    mm.inputs["Factor"].default_value = 1.0
    nt.links.new(cmix.outputs["Result"], mm.inputs["A"])
    nt.links.new(tone, mm.inputs["B"])
    nt.links.new(mm.outputs["Result"], b.inputs["Base Color"])
    _bump(nt, b, loops.outputs["Fac"], 0.5, 0.002)
    return m


def cotton(name, rgb=(0.6, 0.6, 0.6), weave=1400.0, bump=0.18):
    """White hotel cotton (percale): matt, a fine weave bump, the faintest tone drift; no sheen (it went grey)."""
    m = sk.mat(name, rgb, 0.9)
    nt, b = _nodes(m)
    b.inputs["Specular IOR Level"].default_value = 0.12
    o = _coord(nt)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(o, sep.inputs[0])
    k = 2 * math.pi * weave / 6.0
    w = [_math(nt, "SINE", _math(nt, "MULTIPLY", sep.outputs[a], k)) for a in ("X", "Y", "Z")]
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", w[0], w[1]), _math(nt, "MULTIPLY", w[1], w[2]))
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", w[2], w[0]))
    _bump(nt, b, h, bump, 0.0002)
    tone = _maprange(nt, _noise(nt, 3.0, 3.0).outputs["Fac"], 0.95, 1.03)
    nt.links.new(_mulcol(nt, rgb, tone), b.inputs["Base Color"])
    return m


def woven(name, rgb, scale=500.0, bump=0.35, rough=0.88, sheen=0.1, tone=(0.85, 1.1)):
    m = sk.mat(name, rgb, rough)
    nt, b = _nodes(m)
    b.inputs["Specular IOR Level"].default_value = 0.12
    b.inputs["Sheen Weight"].default_value = sheen
    _bump(nt, b, _noise(nt, scale, 2.0).outputs["Fac"], bump, 0.0006)
    t = _maprange(nt, _noise(nt, 5.0, 3.0).outputs["Fac"], *tone)
    nt.links.new(_mulcol(nt, rgb, t), b.inputs["Base Color"])
    return m


def channel_uphol(name, rgb, pitch=0.12):
    """Channel-tufted headboard: vertical channels (a soft sine bump across Y), a woollen weave."""
    m = woven(name, rgb, 700.0, 0.3, 0.9, 0.12)
    nt, b = _nodes(m)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(_coord(nt), sep.inputs[0])
    s = _math(nt, "SINE", _math(nt, "MULTIPLY", sep.outputs["Y"], 2 * math.pi / pitch))
    s = _math(nt, "POWER", _math(nt, "ABSOLUTE", s), 0.35)
    _bump(nt, b, s, 0.8, 0.012)
    return m


def veneer(name="walnut veneer", light=(0.075, 0.045, 0.028), dark=(0.03, 0.017, 0.01), rough=0.42, stretch=16.0):
    m = sk.mat(name, light, rough, nodes=sk.wood(light, dark, scale=4.5, stretch=stretch))
    nt, b = _nodes(m)
    _rough_var(nt, b, rough - 0.06, rough + 0.1, 6.0)
    _bump(nt, b, _noise(nt, 80.0, 2.0).outputs["Fac"], 0.05, 0.0004)
    b.inputs["Specular IOR Level"].default_value = 0.4
    return m


def stone(name, rgb=(0.36, 0.355, 0.35), rough=0.32):
    """A honed grey marble for the window ledge: soft veins, satin, not a mirror (it would clip under the lamp)."""
    m = sk.mat(name, rgb, rough)
    nt, b = _nodes(m)
    v = _noise(nt, 2.4, 9.0, 0.62, mapping=(1.0, 3.0, 1.0))
    vein = _math(nt, "POWER", _math(nt, "SUBTRACT", 1.0, _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", v.outputs["Fac"], 0.5))), 18.0)
    nt.links.new(_mulcol(nt, rgb, _maprange(nt, vein, 1.0, 0.72)), b.inputs["Base Color"])
    _rough_var(nt, b, rough - 0.05, rough + 0.1, 8.0)
    return m


def metal(name, rgb, rough=0.35, brushed=True):
    m = sk.mat(name, rgb, rough, 1.0)
    nt, b = _nodes(m)
    if brushed:
        br = _noise(nt, 40.0, 4.0, 0.5, mapping=(1.0, 1.0, 120.0))
        nt.links.new(_maprange(nt, br.outputs["Fac"], rough - 0.08, rough + 0.08), b.inputs["Roughness"])
    return m


def tissue(name="tissue paper", rgb=(0.62, 0.60, 0.55)):
    """Gift tissue: thin, matt and translucent (light shows through a single sheet), a faint fibre."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = 0.60
    b.inputs["Specular IOR Level"].default_value = 0.1
    tl = _n(nt, "ShaderNodeBsdfTranslucent")
    tl.inputs["Color"].default_value = (rgb[0] * 0.8, rgb[1] * 0.8, rgb[2] * 0.75, 1)
    mx = nt.nodes.new("ShaderNodeMixShader")
    mx.inputs[0].default_value = 0.35
    nt.links.new(b.outputs[0], mx.inputs[1])
    nt.links.new(tl.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    fib = _noise(nt, 600.0, 3.0)
    _bump(nt, b, fib.outputs["Fac"], 0.12, 0.0002)
    return m


def shade_linen(name="lamp shade", rgb=(1.0, 0.84, 0.62)):
    """The bedside shade: warm linen letting the bulb through, lit on its outside too."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tl = _n(nt, "ShaderNodeBsdfTranslucent")
    tl.inputs["Color"].default_value = (*rgb, 1)
    df = _n(nt, "ShaderNodeBsdfDiffuse")
    df.inputs["Color"].default_value = (0.62, 0.56, 0.47, 1)
    mx = nt.nodes.new("ShaderNodeMixShader")
    mx.inputs[0].default_value = 0.5
    nt.links.new(tl.outputs[0], mx.inputs[1])
    nt.links.new(df.outputs[0], mx.inputs[2])
    nz = _noise(nt, 1300.0, 2.0)
    bp = _n(nt, "ShaderNodeBump", Strength=0.2)
    nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], tl.inputs["Normal"])
    nt.links.new(bp.outputs["Normal"], df.inputs["Normal"])
    nt.links.new(mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def sheer(name="sheer voile", rgb=(0.62, 0.63, 0.64), doubled=False):
    """Voile: mostly transparent, a little diffuse and translucent, so the city glows through it."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    df = _n(nt, "ShaderNodeBsdfDiffuse")
    df.inputs["Color"].default_value = (*rgb, 1)
    tl = _n(nt, "ShaderNodeBsdfTranslucent")
    tl.inputs["Color"].default_value = (rgb[0] * 0.9, rgb[1] * 0.92, rgb[2], 1)
    a = nt.nodes.new("ShaderNodeMixShader")
    a.inputs[0].default_value = 0.5
    nt.links.new(df.outputs[0], a.inputs[1])
    nt.links.new(tl.outputs[0], a.inputs[2])
    # the weave: a little more opaque where threads cross; seen edge-on (folds) the voile is denser
    lw = _n(nt, "ShaderNodeLayerWeight", Blend=0.5)
    fac = _math(nt, "ADD", 0.34, _math(nt, "MULTIPLY", lw.outputs["Facing"], 0.45), clamp=True)
    if doubled:
        # Transmission through the turned hem is the product of its two layers.
        fac = _math(nt, "MULTIPLY", fac, _math(nt, "SUBTRACT", 2.0, fac))
    mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(fac, mx.inputs[0])
    nt.links.new(tr.outputs[0], mx.inputs[1])
    nt.links.new(a.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def thin_glass(name="window glass", refl=0.39):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = (0.86, 0.9, 0.9, 1)
    gl = _n(nt, "ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.02
    fr = _n(nt, "ShaderNodeFresnel")
    fr.inputs["IOR"].default_value = 1.52
    f = _math(nt, "MULTIPLY", fr.outputs[0], refl)
    mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(f, mx.inputs[0])
    nt.links.new(tr.outputs[0], mx.inputs[1])
    nt.links.new(gl.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def lining(name, rgb, pattern=0.0):
    """Suitcase and bag lining: a thin polyester twill, faintly glossy, optionally a quiet jacquard diamond."""
    m = woven(name, rgb, 1100.0, 0.25, 0.62, 0.0, (0.92, 1.06))
    nt, b = _nodes(m)
    b.inputs["Specular IOR Level"].default_value = 0.3
    if pattern:
        o = _coord(nt)
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Rotation"].default_value = (0, 0, math.radians(45))
        mp.inputs["Scale"].default_value = (28.0, 28.0, 28.0)
        nt.links.new(o, mp.inputs["Vector"])
        ck = _n(nt, "ShaderNodeTexChecker", Scale=1.0)
        ck.inputs["Color1"].default_value = (1, 1, 1, 1)
        ck.inputs["Color2"].default_value = (1 - pattern, 1 - pattern, 1 - pattern, 1)
        nt.links.new(mp.outputs[0], ck.inputs["Vector"])
        mm = nt.nodes.new("ShaderNodeMix")
        mm.data_type, mm.blend_type = "RGBA", "MULTIPLY"
        mm.inputs["Factor"].default_value = 1.0
        nt.links.new(b.inputs["Base Color"].links[0].from_socket, mm.inputs["A"])
        nt.links.new(ck.outputs["Color"], mm.inputs["B"])
        nt.links.new(mm.outputs["Result"], b.inputs["Base Color"])
    return m


def zip_tape(name="zip tape", rgb=(0.02, 0.02, 0.022)):
    """Coil zip on its tape: fine teeth (a sine bump along the run, object-space X of the tube)."""
    m = sk.mat(name, rgb, 0.5)
    nt, b = _nodes(m)
    b.inputs["Specular IOR Level"].default_value = 0.35
    _bump(nt, b, _noise(nt, 1500.0, 1.0).outputs["Fac"], 0.5, 0.0005)
    return m


def tune_prop(mat, spec=None, coat_off=True, backface=None):
    """A generated prop's material: its plastic sheen cut (spec), clearcoat off, and optionally its backfaces (the
    inside of a cut-open shell) shaded as a lining colour."""
    if not (mat and mat.use_nodes):
        return
    nt = mat.node_tree
    b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if b is None:
        return
    if spec is not None:
        b.inputs["Specular IOR Level"].default_value = spec
    if coat_off and "Coat Weight" in b.inputs:
        b.inputs["Coat Weight"].default_value = 0.0
    if backface is not None:
        out = nt.nodes["Material Output"] if "Material Output" in nt.nodes else \
            next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
        src = out.inputs["Surface"].links[0].from_socket
        ln = nt.nodes.new("ShaderNodeBsdfPrincipled")
        ln.inputs["Base Color"].default_value = (*backface, 1)
        ln.inputs["Roughness"].default_value = 0.8
        ln.inputs["Specular IOR Level"].default_value = 0.15
        geo = nt.nodes.new("ShaderNodeNewGeometry")
        mx = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(geo.outputs["Backfacing"], mx.inputs[0])
        nt.links.new(src, mx.inputs[1])
        nt.links.new(ln.outputs[0], mx.inputs[2])
        nt.links.new(mx.outputs[0], out.inputs["Surface"])


def materials():
    M.clear()
    M.update(
        wall=grasscloth("wall grasscloth", (0.30, 0.30, 0.29)),
        wall_paint=paint("wall paint", (0.33, 0.335, 0.34)),
        ceiling=paint("ceiling paint", (0.46, 0.465, 0.47), 0.92, 0.03),
        trim=paint("trim enamel", (0.40, 0.40, 0.395), 0.45, 0.02, 0.4),
        carpet=carpet("carpet"),
        cotton=cotton("duvet cotton", (0.56, 0.565, 0.57)),
        pillow=cotton("pillow cotton", (0.58, 0.585, 0.59), 1700.0, 0.15),
        runner=woven("bed runner", (0.091, 0.10, 0.11), 300.0, 0.56, 0.9, 0.22),
        valance=woven("bed base fabric", (0.035, 0.037, 0.042), 600.0, 0.3, 0.92, 0.05),
        headboard=channel_uphol("headboard wool", (0.06, 0.068, 0.08)),
        veneer=veneer(),
        veneer_dark=veneer("dark veneer", (0.04, 0.025, 0.016), (0.016, 0.01, 0.006), 0.45),
        stone=stone("window ledge stone"),
        alu=metal("window aluminium", (0.06, 0.062, 0.066), 0.4),
        steel=metal("brushed steel", (0.55, 0.55, 0.56), 0.3),
        brass=metal("satin brass", (0.42, 0.32, 0.17), 0.32),
        glass=thin_glass(),
        sheer=sheer(),
        sheer_hem=sheer("double voile hem", doubled=True),
        drape=woven("blackout drape", (0.05, 0.055, 0.065), 450.0, 0.4, 0.9, 0.2),
        shade=shade_linen(),
        ceramic=sk.mat("lamp ceramic", (0.08, 0.09, 0.1), 0.25),
        tissue=tissue(),
        lining=lining("case lining", (0.05, 0.055, 0.065), 0.25),
        lining_mesh=lining("lid mesh panel", (0.025, 0.027, 0.03)),
        zip=zip_tape(),
        strap=woven("compression strap", (0.03, 0.032, 0.036), 900.0, 0.4, 0.75, 0.0),
        buckle=sk.mat("buckle plastic", (0.015, 0.015, 0.016), 0.4),
        plastic=sk.mat("phone plastic", (0.025, 0.025, 0.027), 0.45),
        dark=sk.mat("baffle", (0.012, 0.012, 0.013), 0.6),
        grille=metal("grille", (0.25, 0.25, 0.25), 0.5, False),
    )
    for m in M.values():      # building the cast purges unused data: keep materials not yet on any object
        m.use_fake_user = True
    return M
