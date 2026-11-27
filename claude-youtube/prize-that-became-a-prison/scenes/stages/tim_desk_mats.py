"""Materials for Tim's desk at night (Cycles, Principled BSDF). The paper, wood and small-prop materials and the node
helpers are copied from the evidence table's module (evidence_table_mats.py; only what this stage uses) so the two
tables of the film share one paper and one wood; the room's surfaces (painted plaster, enamel trim, strip oak, a wool rug, blind slats, window
glass, the night outside, cast iron) are adapted from the family home's (home_mats.py). New here: a ruled legal pad,
airmail envelopes with a chevron border, window envelopes, corrugated card for the file boxes, book cloth, and a
satin hardwood that replaces the generated chair's baked texture.

Every material works in object space (metres), so a part keeps its pattern wherever it is put. Paper props are built
flat in their own XY plane, so x and y in object space are positions on the sheet.
"""
import math

import bpy  # noqa: F401  (first: bmesh and mathutils only exist once bpy is loaded)


# ---------------------------------------------------------------- node helpers (copied from inspection_room_mats)

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


def _math(nt, op, a, b=0.0, clamp=False):
    n = _n(nt, "ShaderNodeMath", operation=op)
    n.use_clamp = clamp
    for i, v in enumerate((a, b)):
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            _link(nt, v, n.inputs[i])
    return n.outputs[0]


def _combine(nt, v):
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


def _noise(nt, vec, scale, detail=2.0, rough=0.5, mapping=None, rot=None, offset=None):
    n = _n(nt, "ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    if mapping or rot or offset:
        mp = _n(nt, "ShaderNodeMapping")
        if mapping:
            mp.inputs["Scale"].default_value = mapping
        if rot:
            mp.inputs["Rotation"].default_value = rot
        if offset:
            mp.inputs["Location"].default_value = offset
        _link(nt, vec, mp.inputs["Vector"])
        vec = mp.outputs["Vector"]
    _link(nt, vec, n.inputs["Vector"])
    return n.outputs["Fac"]


def _bump(nt, b, height, strength, distance, normal=None):
    n = _n(nt, "ShaderNodeBump")
    n.inputs["Strength"].default_value = strength
    n.inputs["Distance"].default_value = distance
    _link(nt, height, n.inputs["Height"])
    if normal is not None:
        _link(nt, normal, n.inputs["Normal"])
    _link(nt, n.outputs["Normal"], b.inputs["Normal"])
    return n


def _obj(nt):
    return _n(nt, "ShaderNodeTexCoord").outputs["Object"]


def _xyz(nt, vec):
    s = _n(nt, "ShaderNodeSeparateXYZ")
    _link(nt, vec, s.inputs["Vector"])
    return s.outputs["X"], s.outputs["Y"], s.outputs["Z"]


def _ao(nt, distance=0.35, inside=False):
    n = _n(nt, "ShaderNodeAmbientOcclusion", samples=4)
    n.inside = inside
    n.inputs["Distance"].default_value = distance
    return n.outputs["AO"]


def _scratches(nt, o, angle, density, scale=(1.0, 260.0, 1.0)):
    """Thin wandering lines along a direction `angle` (radians about Z), only where a sparse mask lets them
    through: a 0..1 mask."""
    # a Mapping node scales before it rotates, which would leave the lines along X: turn the coordinates first
    turn = _n(nt, "ShaderNodeMapping")
    turn.inputs["Rotation"].default_value = (0.0, 0.0, angle)
    _link(nt, o, turn.inputs["Vector"])
    line = _noise(nt, turn.outputs["Vector"], 1.0, 2.0, 0.4, mapping=scale)
    thin = _math(nt, "MULTIPLY", _maprange(nt, line, 0.493, 0.5, 0.0, 1.0), _maprange(nt, line, 0.507, 0.5, 0.0, 1.0))
    mask = _maprange(nt, _noise(nt, o, 6.0, 2.0, 0.5, offset=(angle * 3.0, 1.7, 0.0)), 0.5 + 0.12 * (1 - density), 0.62, 0.0, 1.0)
    return _math(nt, "MULTIPLY", thin, mask)


# ---------------------------------------------------------------- wood

def worn_wood(name, plank_w, y0, light=(0.085, 0.052, 0.03), dark=(0.032, 0.019, 0.011), rough=0.46, rings=(),
              front_y=None):
    """A dark, much-used table top of flat-sawn boards along X (board i covers y0 + i*plank_w .. +plank_w in object
    space): growth rings round a pith below each board (the cathedral figure), pores, each board its own tone and
    figure, a worn finish where arms rest along the front edge, scratches in two directions, dents, sanded-pale
    arrises and grime in the joints, and old mug rings. rings = [(x, y, radius)] in object space."""
    m, nt, b = _new(name)
    o = _obj(nt)
    x, y, z = _xyz(nt, o)
    idx = _math(nt, "FLOOR", _math(nt, "DIVIDE", _math(nt, "SUBTRACT", y, y0), plank_w))
    wn = _n(nt, "ShaderNodeTexWhiteNoise", noise_dimensions="1D")
    _link(nt, _math(nt, "MULTIPLY", idx, 7.31), wn.inputs["W"])
    rnd = _out(wn, "Value")
    yc = _math(nt, "ADD", _math(nt, "ADD", y0, _math(nt, "MULTIPLY", _math(nt, "ADD", idx, 0.5), plank_w)),
               _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", rnd, 0.5), plank_w * 0.7))
    zc = _math(nt, "SUBTRACT", -0.16, _math(nt, "MULTIPLY", rnd, 0.22))
    dy = _math(nt, "SUBTRACT", y, yc)
    dz = _math(nt, "SUBTRACT", z, zc)
    r = _math(nt, "SQRT", _math(nt, "ADD", _math(nt, "MULTIPLY", dy, dy), _math(nt, "MULTIPLY", dz, dz)))
    xs = _math(nt, "ADD", x, _math(nt, "MULTIPLY", rnd, 9.0))
    cx = _n(nt, "ShaderNodeCombineXYZ")
    _link(nt, xs, cx.inputs["X"])
    _link(nt, y, cx.inputs["Y"])
    _link(nt, z, cx.inputs["Z"])
    warp = _noise(nt, cx.outputs[0], 1.0, 3.0, 0.55, mapping=(1.1, 6.0, 6.0))
    warp2 = _noise(nt, cx.outputs[0], 1.0, 2.0, 0.5, mapping=(9.0, 40.0, 40.0))
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", warp, 0.5), 0.05))
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", warp2, 0.5), 0.004))
    t = _math(nt, "FRACT", _math(nt, "MULTIPLY", r, 190.0))
    late = _math(nt, "MULTIPLY", _maprange(nt, t, 0.55, 0.85, 0.0, 1.0), _maprange(nt, t, 1.0, 0.9, 0.0, 1.0))
    late = _math(nt, "POWER", late, 0.7)
    pores = _noise(nt, cx.outputs[0], 1.0, 2.0, 0.6, mapping=(18.0, 900.0, 900.0))
    pore_m = _maprange(nt, pores, 0.62, 0.72, 0.0, 1.0)
    tone = _maprange(nt, rnd, 0.0, 1.0, 0.8, 1.15)
    col = _mix(nt, _math(nt, "ADD", _math(nt, "MULTIPLY", late, 0.55), _math(nt, "MULTIPLY", pore_m, 0.35), clamp=True), light, dark)
    col = _mix(nt, 1.0, col, _combine(nt, tone), "MULTIPLY")
    blot = _noise(nt, o, 2.5, 4.0, 0.6)
    col = _mix(nt, _maprange(nt, blot, 0.35, 0.7, 0.25, 0.0), col, (0.012, 0.008, 0.005))
    # worn finish: duller, paler patches along the front edge and in a few places across the top
    wear_n = _noise(nt, o, 3.5, 4.0, 0.6)
    wear = _maprange(nt, wear_n, 0.52, 0.68, 0.0, 1.0)
    if front_y is not None:
        wear = _math(nt, "MAXIMUM", _math(nt, "MULTIPLY", wear, 0.35),
                     _math(nt, "MULTIPLY", _maprange(nt, y, front_y, front_y + 0.22, 1.0, 0.0), _maprange(nt, wear_n, 0.38, 0.6, 0.0, 1.0)))
    col = _mix(nt, _math(nt, "MULTIPLY", wear, 0.45), col, _mix(nt, 1.0, col, (1.45, 1.35, 1.3), "MULTIPLY"))
    # scratches through the finish into paler wood, two families of directions, and a few deep gouges
    s1 = _scratches(nt, o, 0.35, 0.6)
    s2 = _scratches(nt, o, -0.9, 0.45, scale=(1.0, 320.0, 1.0))
    s3 = _scratches(nt, o, 1.45, 0.25, scale=(2.0, 180.0, 1.0))
    scr = _math(nt, "MAXIMUM", _math(nt, "MAXIMUM", s1, s2), s3)
    col = _mix(nt, _math(nt, "MULTIPLY", scr, 0.55), col, (0.15, 0.11, 0.075))
    # pale sanded arrises (convex edges) and grime in the joints (concave)
    edge = _maprange(nt, _ao(nt, 0.004, inside=True), 0.6, 1.0, 1.0, 0.0)
    col = _mix(nt, _math(nt, "MULTIPLY", edge, 0.6), col, (0.13, 0.09, 0.06))
    grime = _maprange(nt, _ao(nt, 0.012), 0.3, 1.0, 0.85, 0.0)
    col = _mix(nt, grime, col, (0.006, 0.004, 0.003))
    rough_s = _math(nt, "ADD", rough, _maprange(nt, _noise(nt, o, 14.0, 3.0, 0.6), 0.3, 0.7, -0.05, 0.05))
    rough_s = _math(nt, "ADD", rough_s, _math(nt, "MULTIPLY", wear, 0.2))
    rough_s = _math(nt, "ADD", rough_s, _math(nt, "MULTIPLY", scr, 0.18))
    rough_s = _math(nt, "ADD", rough_s, _math(nt, "MULTIPLY", pore_m, 0.06))
    # old mug rings: a partial dark ring with a glossier rim
    ring_m = None
    for (rx, ry, rr) in rings:
        ddx = _math(nt, "SUBTRACT", x, rx)
        ddy = _math(nt, "SUBTRACT", y, ry)
        d = _math(nt, "SQRT", _math(nt, "ADD", _math(nt, "MULTIPLY", ddx, ddx), _math(nt, "MULTIPLY", ddy, ddy)))
        band = _maprange(nt, _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", d, rr)), 0.0008, 0.0032, 1.0, 0.0)
        part = _maprange(nt, _noise(nt, o, 22.0, 3.0, 0.6, offset=(rx * 5.0, ry * 5.0, 0.0)), 0.35, 0.55, 0.15, 1.0)
        inner = _math(nt, "MULTIPLY", _maprange(nt, d, rr - 0.004, rr, 0.0, 0.25), _maprange(nt, d, rr, rr + 0.001, 1.0, 0.0))
        one = _math(nt, "MAXIMUM", _math(nt, "MULTIPLY", band, part), inner)
        ring_m = one if ring_m is None else _math(nt, "MAXIMUM", ring_m, one)
    if ring_m is not None:
        col = _mix(nt, _math(nt, "MULTIPLY", ring_m, 0.6), col, (0.012, 0.007, 0.004))
        rough_s = _math(nt, "SUBTRACT", rough_s, _math(nt, "MULTIPLY", ring_m, 0.16))
    # fine streaks of use along the boards (things slid across the top): stretched noise, mostly in the roughness
    streak = _noise(nt, o, 1.0, 3.0, 0.6, mapping=(4.0, 400.0, 400.0), offset=(0.0, 0.3, 0.0))
    rough_s = _math(nt, "ADD", rough_s, _maprange(nt, streak, 0.3, 0.7, -0.08, 0.08))
    col = _mix(nt, _math(nt, "MULTIPLY", _maprange(nt, streak, 0.6, 0.72, 0.0, 1.0), 0.18), col, (0.11, 0.08, 0.055))
    if front_y is not None:
        # the band where forearms rest, 2-3 cm in from the front edge: finish rubbed off, darker with grime and rougher
        band = _math(nt, "MULTIPLY", _maprange(nt, y, front_y + 0.005, front_y + 0.012, 0.0, 1.0),
                     _maprange(nt, y, front_y + 0.03, front_y + 0.042, 1.0, 0.0))
        band = _math(nt, "MULTIPLY", band, _maprange(nt, _noise(nt, o, 9.0, 3.0, 0.6, offset=(1.3, 0.0, 0.0)), 0.3, 0.6, 0.45, 1.0))
        col = _mix(nt, _math(nt, "MULTIPLY", band, 0.55), col, (0.02, 0.013, 0.008))
        rough_s = _math(nt, "ADD", rough_s, _math(nt, "MULTIPLY", band, 0.14))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _math(nt, "ADD", rough_s, 0.0, clamp=True), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.42
    dents = _noise(nt, o, 55.0, 2.0, 0.5)
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", pores, -0.6), _math(nt, "MULTIPLY", late, 0.25))
    h = _math(nt, "SUBTRACT", h, _math(nt, "MULTIPLY", scr, 1.2))
    h = _math(nt, "SUBTRACT", h, _math(nt, "MULTIPLY", _maprange(nt, dents, 0.68, 0.78, 0.0, 1.0), 0.8))
    _bump(nt, b, h, 0.22, 0.0006)
    return m


# ---------------------------------------------------------------- papers

def _translucent(nt, b, fac, rgb):
    """Thin paper lets light through: mix a Translucent BSDF (the paper's own tint) under the Principled one, so a
    lamp-side curl or a lifted corner glows from behind."""
    out = nt.nodes["Material Output"]
    tl = _n(nt, "ShaderNodeBsdfTranslucent")
    tl.inputs["Color"].default_value = (*rgb, 1)
    if b.inputs["Normal"].is_linked:
        _link(nt, b.inputs["Normal"].links[0].from_socket, tl.inputs["Normal"])
    mx = _n(nt, "ShaderNodeMixShader")
    mx.inputs["Fac"].default_value = fac
    _link(nt, b.outputs[0], mx.inputs[1])
    _link(nt, tl.outputs[0], mx.inputs[2])
    _link(nt, mx.outputs[0], out.inputs["Surface"])
    return mx


def paper(name, rgb=(0.74, 0.71, 0.64), rough=0.86, fibre=0.05, smudge=0.05, sss=0.05, edge_tone=None, size=None,
          translucency=0.08):
    """Matt uncoated paper or card, slightly warm: felted fibre tooth and a finer fibre grain (bump), a slow +-3 %
    tone drift across the sheet and faint mottling, light coming through (translucency), grey handling smudges.
    edge_tone = (w, h) darkens the last few millimetres round the edge of a w x h sheet (old, handled paper)."""
    m, nt, b = _new(name)
    o = _obj(nt)
    mott = _noise(nt, o, 30.0, 4.0, 0.6)
    fib = _noise(nt, o, 1.0, 3.0, 0.6, mapping=(220.0, 700.0, 220.0))
    drift = _noise(nt, o, 6.0, 2.0, 0.5, offset=(len(name) * 0.37, 0.0, 0.0))
    col = _mix(nt, _maprange(nt, drift, 0.3, 0.7, 0.0, 1.0), tuple(c * 1.03 for c in rgb), tuple(c * 0.97 for c in rgb))
    col = _mix(nt, _maprange(nt, mott, 0.3, 0.7, 0.0, 0.08), col, tuple(c * 0.86 for c in rgb))
    col = _mix(nt, _maprange(nt, fib, 0.35, 0.75, 0.0, 0.06), col, tuple(c * 0.9 for c in rgb))
    if smudge:
        sm = _noise(nt, o, 9.0, 5.0, 0.65, offset=(3.1, 0.4, 0.0))
        col = _mix(nt, _maprange(nt, sm, 0.6, 0.78, 0.0, smudge * 2.0), col, (0.32, 0.31, 0.3))
    if edge_tone:
        w, h = edge_tone
        x, y, _ = _xyz(nt, o)
        ex = _math(nt, "SUBTRACT", w / 2, _math(nt, "ABSOLUTE", x))
        ey = _math(nt, "SUBTRACT", h / 2, _math(nt, "ABSOLUTE", y))
        e = _math(nt, "MINIMUM", ex, ey)
        jag = _maprange(nt, _noise(nt, o, 80.0, 3.0, 0.6), 0.3, 0.7, 0.0, 0.004)
        col = _mix(nt, _maprange(nt, _math(nt, "SUBTRACT", e, jag), 0.0, 0.006, 0.35, 0.0), col, tuple(c * 0.7 for c in (0.9, 0.8, 0.62)))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _math(nt, "ADD", rough, _maprange(nt, mott, 0.3, 0.7, -0.04, 0.04), clamp=True), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.32
    b.inputs["Sheen Weight"].default_value = 0.12
    b.inputs["Sheen Roughness"].default_value = 0.6
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (0.0015, 0.0012, 0.0009)
        b.inputs["Subsurface Scale"].default_value = 1.0
    tooth = _noise(nt, o, 1400.0, 3.0, 0.65)
    b1 = _bump(nt, b, _math(nt, "ADD", _math(nt, "MULTIPLY", fib, 0.5), tooth), fibre, 0.00015)
    # the finer felted fibre grain on top (about 1 mm features), chained on the tooth
    grain = _noise(nt, o, 900.0, 8.0, 0.6)
    _bump(nt, b, grain, 0.03, 0.0002, normal=b1.outputs["Normal"])
    if translucency:
        _translucent(nt, b, translucency, tuple(min(1.0, c * 1.05) for c in rgb))
    return m


def photo(name, w, h, border, image_rgb=(0.12, 0.12, 0.12), paper_rgb=(0.51, 0.50, 0.48), gradient=0.0):
    """A glossy photographic print, w x h with a white border: a clear coat over the image (the lamp lays a soft sheen
    across it) whose image area is left as an even blank tone for the picture to be composited in later (gradient
    darkens it toward one end), the border a little less glossy, a few fingerprints in the gloss, and the thin
    darker paper edge."""
    m, nt, b = _new(name)
    o = _obj(nt)
    x, y, _ = _xyz(nt, o)
    ix = _math(nt, "SUBTRACT", w / 2 - border, _math(nt, "ABSOLUTE", x))
    iy = _math(nt, "SUBTRACT", h / 2 - border, _math(nt, "ABSOLUTE", y))
    inside = _math(nt, "MULTIPLY", _maprange(nt, ix, -0.0002, 0.0002, 0.0, 1.0), _maprange(nt, iy, -0.0002, 0.0002, 0.0, 1.0))
    img = image_rgb
    if gradient:
        img = _mix(nt, _maprange(nt, y, -h / 2, h / 2, 0.0, 1.0), tuple(c * (1 - gradient) for c in image_rgb), image_rgb)
    col = _mix(nt, inside, paper_rgb, img)
    edge = _math(nt, "MINIMUM", _math(nt, "SUBTRACT", w / 2, _math(nt, "ABSOLUTE", x)), _math(nt, "SUBTRACT", h / 2, _math(nt, "ABSOLUTE", y)))
    col = _mix(nt, _maprange(nt, edge, 0.0, 0.0006, 0.45, 0.0), col, (0.45, 0.43, 0.4))
    _link(nt, col, b.inputs["Base Color"])
    prints = _noise(nt, o, 1.0, 2.0, 0.5, mapping=(160.0, 220.0, 160.0))
    cluster = _maprange(nt, _noise(nt, o, 14.0, 2.0, 0.5), 0.55, 0.68, 0.0, 1.0)
    fp = _math(nt, "MULTIPLY", _maprange(nt, prints, 0.58, 0.66, 0.0, 1.0), cluster)
    r = _math(nt, "ADD", _math(nt, "ADD", 0.35, _math(nt, "MULTIPLY", inside, -0.05)), _math(nt, "MULTIPLY", fp, 0.2), clamp=True)
    _link(nt, r, b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.5
    _link(nt, _math(nt, "ADD", 0.45, _math(nt, "MULTIPLY", inside, 0.25)), b.inputs["Coat Weight"])
    _link(nt, _math(nt, "ADD", 0.12, _math(nt, "MULTIPLY", fp, 0.18), clamp=True), b.inputs["Coat Roughness"])
    _bump(nt, b, _noise(nt, o, 900.0, 2.0, 0.5), 0.03, 0.0001)
    return m


def manila(name, rgb=(0.5, 0.38, 0.21), rough=0.84):
    """Manila folder board: fibre streaks and blotches, darker handled edges, felted tooth."""
    m, nt, b = _new(name)
    o = _obj(nt)
    fib = _noise(nt, o, 1.0, 4.0, 0.6, mapping=(90.0, 900.0, 90.0))
    blot = _noise(nt, o, 40.0, 3.0, 0.6)
    big = _noise(nt, o, 5.0, 3.0, 0.6)
    col = _mix(nt, _maprange(nt, fib, 0.3, 0.7, 0.0, 0.16), rgb, tuple(c * 0.82 for c in rgb))
    col = _mix(nt, _maprange(nt, blot, 0.6, 0.75, 0.0, 0.14), col, tuple(c * 0.68 for c in rgb))
    col = _mix(nt, _maprange(nt, big, 0.4, 0.7, 0.0, 0.2), col, tuple(c * 0.8 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = 0.3
    b.inputs["Subsurface Weight"].default_value = 0.05
    b.inputs["Subsurface Radius"].default_value = (0.002, 0.0015, 0.001)
    tooth = _noise(nt, o, 500.0, 4.0, 0.65)
    _bump(nt, b, _math(nt, "ADD", _math(nt, "MULTIPLY", fib, 0.4), tooth), 0.07, 0.0002)
    return m


# ---------------------------------------------------------------- the passport

def page_block(name, rgb=(0.7, 0.66, 0.58)):
    """The page edges of a booklet: fine striations of the leaves along local Z, a little uneven and soiled."""
    m, nt, b = _new(name)
    o = _obj(nt)
    _, _, z = _xyz(nt, o)
    phase = _math(nt, "MULTIPLY", z, math.tau * 2500.0)
    phase = _math(nt, "ADD", phase, _noise(nt, o, 68.0, 2.0, 0.5))
    leaves = _math(nt, "SINE", phase)
    col = _mix(nt, _maprange(nt, leaves, -1.0, 1.0, 0.0, 1.0),
               tuple(c * 0.62 for c in rgb), tuple(c * 0.82 for c in rgb))
    soil = _noise(nt, o, 90.0, 3.0, 0.6)
    col = _mix(nt, _maprange(nt, soil, 0.5, 0.75, 0.0, 0.2), col, (0.34, 0.3, 0.25))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.85
    b.inputs["Specular IOR Level"].default_value = 0.3
    _bump(nt, b, leaves, 0.35, 0.0001)
    return m


# ---------------------------------------------------------------- hard things

def satin_metal(name, rgb, rough=0.35):
    m, nt, b = _new(name)
    b.inputs["Metallic"].default_value = 1.0
    o = _obj(nt)
    n = _noise(nt, o, 180.0, 3.0, 0.6)
    _link(nt, _math(nt, "ADD", _maprange(nt, n, 0.3, 0.7, -0.06, 0.06), rough, clamp=True), b.inputs["Roughness"])
    b.inputs["Base Color"].default_value = (*rgb, 1)
    return m


def plastic(name, rgb, rough=0.45, spec=0.5, scuff=0.15):
    m, nt, b = _new(name)
    o = _obj(nt)
    n = _noise(nt, o, 90.0, 4.0, 0.6)
    sc = _maprange(nt, _noise(nt, o, 300.0, 3.0, 0.7, mapping=(1.0, 6.0, 1.0)), 0.6, 0.72, 0.0, 1.0)
    r = _math(nt, "ADD", _maprange(nt, n, 0.3, 0.7, -0.06, 0.06), _math(nt, "MULTIPLY", sc, scuff))
    _link(nt, _math(nt, "ADD", r, rough, clamp=True), b.inputs["Roughness"])
    _link(nt, _mix(nt, _math(nt, "MULTIPLY", sc, 0.5), rgb, tuple(min(1.0, c * 1.3 + 0.01) for c in rgb)), b.inputs["Base Color"])
    b.inputs["Specular IOR Level"].default_value = spec
    _bump(nt, b, _noise(nt, o, 2000.0, 1.0, 0.5), 0.02, 0.0001)
    return m


def glaze(name, rgb, rough=0.16):
    """Glazed stoneware: a glossy coat with slow waviness (bump) and pinholes; the foot ring left unglazed is a
    separate material."""
    m, nt, b = _new(name)
    o = _obj(nt)
    wav = _noise(nt, o, 60.0, 3.0, 0.5)
    pin = _maprange(nt, _noise(nt, o, 900.0, 1.0, 0.5), 0.7, 0.76, 0.0, 1.0)
    speck = _maprange(nt, _noise(nt, o, 400.0, 2.0, 0.6), 0.62, 0.7, 0.0, 1.0)
    col = _mix(nt, _math(nt, "MULTIPLY", speck, 0.5), rgb, tuple(min(1.0, c * 1.8) for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _math(nt, "ADD", rough, _math(nt, "MULTIPLY", pin, 0.3), clamp=True), b.inputs["Roughness"])
    b.inputs["Coat Weight"].default_value = 0.3
    b.inputs["Coat Roughness"].default_value = 0.08
    _bump(nt, b, _math(nt, "SUBTRACT", wav, _math(nt, "MULTIPLY", pin, 0.6)), 0.08, 0.0004)
    return m


def liquid(name, rgb=(0.018, 0.008, 0.003)):
    m, nt, b = _new(name)
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = 0.04
    b.inputs["Specular IOR Level"].default_value = 0.5
    return m


def glow(name, rgb, strength, falloff=None):
    """An emitter. falloff = (w, h, k): the face (w x h in object XY) dims toward its edges by k (backlight
    falloff of a screen)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    if falloff:
        w, h, k = falloff
        o = _obj(nt)
        x, y, _ = _xyz(nt, o)
        u = _math(nt, "DIVIDE", _math(nt, "ABSOLUTE", x), w / 2)
        v = _math(nt, "DIVIDE", _math(nt, "ABSOLUTE", y), h / 2)
        d = _math(nt, "MAXIMUM", _math(nt, "POWER", u, 3.0), _math(nt, "POWER", v, 3.0))
        _link(nt, _math(nt, "MULTIPLY", _maprange(nt, d, 0.0, 1.0, 1.0, 1.0 - k), strength), em.inputs["Strength"])
    else:
        em.inputs["Strength"].default_value = strength
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def screen(name, rgb, strength, w, h):
    """A switched-on LCD showing a blank page: emission with backlight falloff, under a thin glossy face that
    reflects the room."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.0, 0.0, 0.0, 1)
    b.inputs["Roughness"].default_value = 0.12
    b.inputs["Specular IOR Level"].default_value = 0.35
    o = _obj(nt)
    x, y, _ = _xyz(nt, o)
    u = _math(nt, "DIVIDE", _math(nt, "ABSOLUTE", x), w / 2)
    v = _math(nt, "DIVIDE", _math(nt, "ABSOLUTE", y), h / 2)
    d = _math(nt, "MAXIMUM", _math(nt, "POWER", u, 4.0), _math(nt, "POWER", v, 4.0))
    b.inputs["Emission Color"].default_value = (*rgb, 1)
    edge = _maprange(nt, d, 0.0, 1.0, 1.0, 0.94)
    falloff = _maprange(nt, y, -h / 2, h / 2, 0.94, 1.02)
    _link(nt, _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", edge, falloff), strength), b.inputs["Emission Strength"])
    m.cycles.emission_sampling = "NONE"
    return m


def matte(name, rgb, rough=0.8):
    m, nt, b = _new(name)
    o = _obj(nt)
    n = _noise(nt, o, 3.0, 3.0, 0.6)
    _link(nt, _mix(nt, _maprange(nt, n, 0.3, 0.7, 0.0, 0.3), rgb, tuple(c * 0.7 for c in rgb)), b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    return m


# ---------------------------------------------------------------- generated props

# ---------------------------------------------------------------- the room (adapted from home_mats.py)

def _pos(nt):
    return _n(nt, "ShaderNodeNewGeometry").outputs["Position"]


def wall_paint(name, rgb, rough=0.84, grime=0.3):
    """Matt latex on old plaster, in world space (the walls are built in pieces round the window and the tone must
    run through): a broad trowelled waviness (bump), roller stipple, faint patching and grime into the corners."""
    m, nt, b = _new(name)
    o = _pos(nt)
    broad = _noise(nt, o, 1.6, 3.0, 0.55)
    patch = _maprange(nt, _noise(nt, o, 0.9, 3.0, 0.6, offset=(3.0, 1.0, 0.0)), 0.55, 0.66, 0.0, 1.0)
    col = _mix(nt, _maprange(nt, broad, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.93 for c in rgb), tuple(min(1.0, c * 1.05) for c in rgb))
    col = _mix(nt, _math(nt, "MULTIPLY", patch, 0.5), col, (rgb[0] * 1.03, rgb[1] * 1.03, rgb[2] * 0.98))
    if grime:
        col = _mix(nt, _maprange(nt, _ao(nt, 0.25), 0.35, 1.0, grime, 0.0), col, tuple(c * 0.4 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, broad, 0.3, 0.7, rough - 0.05, rough + 0.05), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.35
    stip = _noise(nt, o, 260.0, 3.0, 0.65)
    _bump(nt, b, _math(nt, "ADD", _math(nt, "MULTIPLY", broad, 0.6), _math(nt, "MULTIPLY", stip, 0.25)), 0.06, 0.002)
    return m


def enamel(name, rgb, rough=0.34, grime=0.35):
    """Satin enamel on wood trim: a gentle orange peel, sheen that varies, grey in the routed corners."""
    m, nt, b = _new(name)
    o = _obj(nt)
    var = _noise(nt, o, 7.0, 3.0, 0.6)
    col = _mix(nt, _maprange(nt, var, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.95 for c in rgb), rgb)
    col = _mix(nt, _maprange(nt, _ao(nt, 0.03), 0.4, 1.0, grime, 0.0), col, tuple(c * 0.45 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, var, 0.3, 0.7, rough - 0.06, rough + 0.08), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.45
    _bump(nt, b, _noise(nt, o, 140.0, 2.0, 0.5), 0.05, 0.0006)
    return m


def oak_floor(name, strip=0.0825, light=(0.13, 0.075, 0.042), dark=(0.055, 0.03, 0.017), rough=0.42):
    """Strip oak flooring along local X: 3 1/4 in strips, random butt joints, each strip its own tone and figure,
    open-grain pores, a satin finish worn duller in traffic lanes, dark seams between strips."""
    m, nt, b = _new(name)
    o = _obj(nt)
    x, y, z = _xyz(nt, o)
    row = _math(nt, "FLOOR", _math(nt, "DIVIDE", y, strip))
    wn = _n(nt, "ShaderNodeTexWhiteNoise", noise_dimensions="1D")
    _link(nt, _math(nt, "MULTIPLY", row, 3.17), wn.inputs["W"])
    rnd = _out(wn, "Value")
    xs = _math(nt, "ADD", x, _math(nt, "MULTIPLY", rnd, 7.3))
    blen = _math(nt, "ADD", 0.7, _math(nt, "MULTIPLY", rnd, 1.1))
    bi = _math(nt, "FLOOR", _math(nt, "DIVIDE", xs, blen))
    wn2 = _n(nt, "ShaderNodeTexWhiteNoise", noise_dimensions="2D")
    cv = _n(nt, "ShaderNodeCombineXYZ")
    _link(nt, row, cv.inputs["X"])
    _link(nt, bi, cv.inputs["Y"])
    _link(nt, cv.outputs[0], wn2.inputs["Vector"])
    brnd = _out(wn2, "Value")
    gv = _n(nt, "ShaderNodeCombineXYZ")
    _link(nt, _math(nt, "ADD", x, _math(nt, "MULTIPLY", brnd, 31.0)), gv.inputs["X"])
    _link(nt, _math(nt, "ADD", y, _math(nt, "MULTIPLY", brnd, 5.0)), gv.inputs["Y"])
    _link(nt, z, gv.inputs["Z"])
    grain = _noise(nt, gv.outputs[0], 1.0, 6.0, 0.62, mapping=(2.2, 70.0, 70.0))
    fleck = _noise(nt, gv.outputs[0], 1.0, 2.0, 0.6, mapping=(14.0, 600.0, 600.0))
    col = _mix(nt, _maprange(nt, grain, 0.3, 0.7, 0.0, 1.0), light, dark)
    col = _mix(nt, _maprange(nt, fleck, 0.6, 0.72, 0.0, 0.5), col, tuple(c * 0.6 for c in dark))
    tone = _maprange(nt, brnd, 0.0, 1.0, 0.72, 1.2)
    col = _mix(nt, 1.0, col, _combine(nt, tone), "MULTIPLY")
    fy = _math(nt, "FRACT", _math(nt, "DIVIDE", y, strip))
    seam_y = _math(nt, "MAXIMUM", _maprange(nt, fy, 0.0, 0.012, 1.0, 0.0), _maprange(nt, fy, 0.988, 1.0, 0.0, 1.0))
    fx = _math(nt, "FRACT", _math(nt, "DIVIDE", xs, blen))
    seam_x = _math(nt, "MAXIMUM", _maprange(nt, fx, 0.0, 0.002, 1.0, 0.0), _maprange(nt, fx, 0.998, 1.0, 0.0, 1.0))
    seam = _math(nt, "MAXIMUM", seam_y, seam_x)
    col = _mix(nt, _math(nt, "MULTIPLY", seam, 0.85), col, (0.008, 0.005, 0.003))
    wear = _maprange(nt, _noise(nt, o, 0.8, 3.0, 0.6), 0.45, 0.7, 0.0, 1.0)
    _link(nt, col, b.inputs["Base Color"])
    r = _math(nt, "ADD", rough, _math(nt, "MULTIPLY", wear, 0.18))
    r = _math(nt, "ADD", r, _maprange(nt, _noise(nt, o, 20.0, 3.0, 0.6), 0.3, 0.7, -0.05, 0.05))
    _link(nt, _math(nt, "ADD", r, _math(nt, "MULTIPLY", seam, 0.3), clamp=True), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.45
    h = _math(nt, "SUBTRACT", _math(nt, "MULTIPLY", grain, 0.3), _math(nt, "MULTIPLY", seam, 1.0))
    _bump(nt, b, h, 0.25, 0.0008)
    return m


def rug(name, field=(0.07, 0.045, 0.04), tones=((0.03, 0.028, 0.035), (0.11, 0.085, 0.06)), size=(2.3, 1.6), band=(0.035, 0.115)):
    """A low-pile wool rug, matt: a plain field with a slow mottle, a woven two-tone border band `band` (from, to)
    metres in from the edge, a thin dark binding, a dense pile (fine bump) and fibre sheen."""
    m, nt, b = _new(name)
    o = _obj(nt)
    x, y, _ = _xyz(nt, o)
    ex = _math(nt, "SUBTRACT", size[0] / 2, _math(nt, "ABSOLUTE", x))
    ey = _math(nt, "SUBTRACT", size[1] / 2, _math(nt, "ABSOLUTE", y))
    e = _math(nt, "MINIMUM", ex, ey)
    b0, b1 = band
    inband = _math(nt, "MULTIPLY", _maprange(nt, e, b1, b1 - 0.003, 0.0, 1.0), _maprange(nt, e, b0, b0 + 0.003, 0.0, 1.0))
    binding = _maprange(nt, e, 0.012, 0.009, 0.0, 1.0)
    along = _math(nt, "ADD", x, y)
    blk = _math(nt, "FRACT", _math(nt, "DIVIDE", along, 0.044))
    row = _math(nt, "FRACT", _math(nt, "DIVIDE", _math(nt, "SUBTRACT", e, b0), (b1 - b0)))
    chk = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", _math(nt, "GREATER_THAN", blk, 0.5), _math(nt, "GREATER_THAN", row, 0.5)))
    weave = _mix(nt, chk, tones[0], tones[1])
    pile = _noise(nt, o, 900.0, 2.0, 0.6)
    mott = _noise(nt, o, 2.5, 4.0, 0.6)
    col = _mix(nt, _maprange(nt, mott, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.86 for c in field), tuple(c * 1.1 for c in field))
    col = _mix(nt, inband, col, weave)
    col = _mix(nt, binding, col, (0.02, 0.018, 0.02))
    col = _mix(nt, _maprange(nt, pile, 0.3, 0.7, 0.0, 0.35), col, tuple(c * 1.3 for c in field))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.92
    b.inputs["Sheen Weight"].default_value = 0.16        # (0.45 turned the whole rug into a pale slab at a grazing view)
    b.inputs["Sheen Roughness"].default_value = 0.5
    b.inputs["Specular IOR Level"].default_value = 0.0
    _bump(nt, b, pile, 0.3, 0.001)
    return m


def slat(name, rgb=(0.6, 0.59, 0.55), trans=0.12):
    """Vinyl venetian blind slats: satin off-white, very slightly translucent (they glow when light is behind them)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    o = _obj(nt)
    var = _noise(nt, o, 12.0, 3.0, 0.6)
    _link(nt, _mix(nt, _maprange(nt, var, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.93 for c in rgb), rgb), b.inputs["Base Color"])
    _link(nt, _maprange(nt, var, 0.3, 0.7, 0.42, 0.55), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.35
    tl = _n(nt, "ShaderNodeBsdfTranslucent")
    tl.inputs["Color"].default_value = (rgb[0] * 0.9, rgb[1] * 0.9, rgb[2] * 0.85, 1)
    mx = _n(nt, "ShaderNodeMixShader")
    mx.inputs[0].default_value = trans
    out = nt.nodes["Material Output"]
    _link(nt, b.outputs[0], mx.inputs[1])
    _link(nt, tl.outputs[0], mx.inputs[2])
    _link(nt, mx.outputs[0], out.inputs["Surface"])
    return m


def glass(name, tint=(0.88, 0.9, 0.92), refl=0.05):
    """Old window glass: transparent, reflecting the room by Fresnel, a faint film of grime."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = (*tint, 1)
    gl = _n(nt, "ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.02
    lw = _n(nt, "ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.1
    smudge = _maprange(nt, _noise(nt, _obj(nt), 3.0, 5.0, 0.6), 0.4, 0.75, 0.0, 0.03)
    fac = _math(nt, "ADD", _math(nt, "ADD", _math(nt, "MULTIPLY", _out(lw, "Fresnel"), 0.85), refl), smudge, clamp=True)
    mx = _n(nt, "ShaderNodeMixShader")
    _link(nt, fac, mx.inputs[0])
    _link(nt, tr.outputs[0], mx.inputs[1])
    _link(nt, gl.outputs[0], mx.inputs[2])
    _link(nt, mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def night(name, low=(0.035, 0.045, 0.07), high=(0.006, 0.009, 0.018), strength=1.0, z0=0.0, z1=4.0, lit=(), roof=None):
    """The night outside the window, as an emitting backdrop (local X along, local Z up): a cool glow low (the street
    and the city's sky glow), darker above, a soft mottling of trees, an optional dark roof line `roof` = (z, wave)
    of the houses across the street under the sky's glow, and lit windows `lit` = [(x, z, w, h, (r, g, b))] seen
    far off (blank: only light)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    o = _obj(nt)
    x, _, z = _xyz(nt, o)
    t = _maprange(nt, z, z0, z1, 0.0, 1.0)
    col = _mix(nt, t, low, high)
    mott = _maprange(nt, _noise(nt, o, 0.9, 5.0, 0.65), 0.35, 0.7, 0.45, 1.1)
    col = _mix(nt, 1.0, col, _combine(nt, mott), "MULTIPLY")
    if roof:
        rz, wave = roof
        step = _math(nt, "MULTIPLY", _math(nt, "FLOOR", _math(nt, "MULTIPLY", _noise(nt, o, 0.22, 0.0, 0.0, mapping=(1.0, 0.0, 0.0)), 6.0)), wave / 3.0)
        houses = _maprange(nt, _math(nt, "SUBTRACT", z, _math(nt, "ADD", rz, step)), 0.0, 0.06, 1.0, 0.0)
        col = _mix(nt, _math(nt, "MULTIPLY", houses, 0.8), col, (0.004, 0.005, 0.008))
    for (wx, wz, ww, wh, rgb) in lit:
        dx = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", x, wx))
        dz = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", z, wz))
        inside = _math(nt, "MULTIPLY", _maprange(nt, dx, ww / 2, ww / 2 + 0.03, 1.0, 0.0), _maprange(nt, dz, wh / 2, wh / 2 + 0.03, 1.0, 0.0))
        col = _mix(nt, inside, col, rgb)
    _link(nt, col, em.inputs["Color"])
    em.inputs["Strength"].default_value = strength
    _link(nt, em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    return m


def contact(name, radius, alpha=0.25, rgb=(0.004, 0.003, 0.003)):
    """A soft contact-shadow decal: a dark disc whose opacity falls off from `alpha` at its centre to nothing at its
    rim (on a plane object in metres)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    o = _obj(nt)
    x, y, _ = _xyz(nt, o)
    r = _math(nt, "SQRT", _math(nt, "ADD", _math(nt, "MULTIPLY", x, x), _math(nt, "MULTIPLY", y, y)))
    t = _maprange(nt, r, 0.0, radius, 1.0, 0.0)
    a = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", t, t), alpha)
    df = _n(nt, "ShaderNodeBsdfDiffuse")
    df.inputs["Color"].default_value = (*rgb, 1)
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    mx = _n(nt, "ShaderNodeMixShader")
    _link(nt, a, mx.inputs[0])
    _link(nt, tr.outputs[0], mx.inputs[1])
    _link(nt, df.outputs[0], mx.inputs[2])
    _link(nt, mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def cast_iron(name, rgb=(0.2, 0.2, 0.19)):
    """A painted cast-iron radiator: thick old paint, slightly pitted, darker and dustier in the gaps."""
    m, nt, b = _new(name)
    o = _obj(nt)
    n = _noise(nt, o, 45.0, 4.0, 0.6)
    col = _mix(nt, _maprange(nt, n, 0.3, 0.7, 0.0, 1.0), tuple(c * 0.86 for c in rgb), rgb)
    col = _mix(nt, _maprange(nt, _ao(nt, 0.05), 0.35, 1.0, 0.6, 0.0), col, tuple(c * 0.3 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    _link(nt, _maprange(nt, n, 0.3, 0.7, 0.42, 0.58), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.4
    _bump(nt, b, _noise(nt, o, 220.0, 3.0, 0.6), 0.2, 0.0006)
    return m


# ---------------------------------------------------------------- stationery made for this desk

def ruled(name, w, h, rgb=(0.74, 0.72, 0.65), pitch=0.0087, head=0.032, margin=0.032, rule_rgb=(0.3, 0.38, 0.52),
          margin_rgb=(0.5, 0.2, 0.18)):
    """A ruled writing-pad sheet, w x h, blank: letter paper with faint blue rules every `pitch` below a clear head
    `head` deep, and a thin double margin line `margin` in from the left edge. No writing."""
    m = paper(name, rgb, 0.86, 0.05, 0.03, translucency=0.0)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    base = b.inputs["Base Color"].links[0].from_socket
    o = _obj(nt)
    x, y, _ = _xyz(nt, o)
    top = h / 2 - head
    ph = _math(nt, "FRACT", _math(nt, "DIVIDE", _math(nt, "SUBTRACT", top, y), pitch))
    line = _maprange(nt, _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", ph, 0.5)), 0.015, 0.05, 1.0, 0.0)
    line = _math(nt, "MULTIPLY", line, _maprange(nt, y, top + 0.5 * pitch, top + 0.5 * pitch - 0.0005, 0.0, 1.0))
    col = _mix(nt, _math(nt, "MULTIPLY", line, 0.7), base, rule_rgb)
    mx = _math(nt, "SUBTRACT", x, -w / 2 + margin)
    m1 = _maprange(nt, _math(nt, "ABSOLUTE", mx), 0.0, 0.00028, 1.0, 0.0)
    m2 = _maprange(nt, _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", mx, 0.0016)), 0.0, 0.00028, 1.0, 0.0)
    col = _mix(nt, _math(nt, "MULTIPLY", _math(nt, "MAXIMUM", m1, m2), 0.5), col, margin_rgb)
    _link(nt, col, b.inputs["Base Color"])
    return m


def airmail(name, w, h, rgb=(0.66, 0.68, 0.7), band=0.0065, period=0.022, uv=False):
    """A thin airmail envelope, w x h: pale blue-white lightweight paper with the slanted red and blue bars round
    its edge (white between them). Blank: no address, no stamp, no mark. With `uv` the border follows the mesh's UV
    map (metres from each envelope's own centre: the slabs of a stack each carry theirs)."""
    m = paper(name, rgb, 0.8, 0.04, 0.05, translucency=0.0 if uv else 0.1)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    base = b.inputs["Base Color"].links[0].from_socket
    o = _n(nt, "ShaderNodeTexCoord").outputs["UV"] if uv else _obj(nt)
    x, y, _ = _xyz(nt, o)
    e = _math(nt, "MINIMUM", _math(nt, "SUBTRACT", w / 2, _math(nt, "ABSOLUTE", x)), _math(nt, "SUBTRACT", h / 2, _math(nt, "ABSOLUTE", y)))
    inband = _maprange(nt, e, band, band - 0.0004, 0.0, 1.0)
    s = _math(nt, "FRACT", _math(nt, "DIVIDE", _math(nt, "ADD", x, y), period))
    red = _math(nt, "MULTIPLY", _maprange(nt, s, 0.02, 0.04, 0.0, 1.0), _maprange(nt, s, 0.27, 0.25, 0.0, 1.0))
    blue = _math(nt, "MULTIPLY", _maprange(nt, s, 0.52, 0.54, 0.0, 1.0), _maprange(nt, s, 0.77, 0.75, 0.0, 1.0))
    col = _mix(nt, _math(nt, "MULTIPLY", inband, red), base, (0.4, 0.07, 0.06))
    col = _mix(nt, _math(nt, "MULTIPLY", inband, blue), col, (0.06, 0.1, 0.32))
    _link(nt, col, b.inputs["Base Color"])
    return m


def window_envelope(name, w, h, win=(-0.045, -0.012, 0.095, 0.038), rgb=(0.72, 0.72, 0.7)):
    """A white business envelope lying address side up, its glassine window (centre x, y, width, height in the
    sheet's own coordinates, rounded) a shade darker and glossy, with a blank sheet behind it."""
    m = paper(name, rgb, 0.8, 0.04, 0.04, translucency=0.0)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    base = b.inputs["Base Color"].links[0].from_socket
    o = _obj(nt)
    x, y, _ = _xyz(nt, o)
    cx, cy, ww, wh = win
    r = 0.006
    dx = _math(nt, "MAXIMUM", _math(nt, "SUBTRACT", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", x, cx)), ww / 2 - r), 0.0)
    dy = _math(nt, "MAXIMUM", _math(nt, "SUBTRACT", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", y, cy)), wh / 2 - r), 0.0)
    d = _math(nt, "SQRT", _math(nt, "ADD", _math(nt, "MULTIPLY", dx, dx), _math(nt, "MULTIPLY", dy, dy)))
    inside = _maprange(nt, d, r, r - 0.0004, 0.0, 1.0)
    col = _mix(nt, _math(nt, "MULTIPLY", inside, 0.75), base, (0.5, 0.5, 0.47))
    _link(nt, col, b.inputs["Base Color"])
    rr = b.inputs["Roughness"].links[0].from_socket
    _link(nt, _math(nt, "SUBTRACT", rr, _math(nt, "MULTIPLY", inside, 0.55), clamp=True), b.inputs["Roughness"])
    return m


def cardboard(name, rgb=(0.3, 0.22, 0.13)):
    """Corrugated kraft board of a file box: fibre streaks, scuffed paler edges, the flutes showing faintly."""
    m, nt, b = _new(name)
    o = _obj(nt)
    _, _, z = _xyz(nt, o)
    fib = _noise(nt, o, 1.0, 4.0, 0.6, mapping=(400.0, 400.0, 30.0))
    big = _noise(nt, o, 4.0, 3.0, 0.6)
    col = _mix(nt, _maprange(nt, fib, 0.3, 0.7, 0.0, 0.18), rgb, tuple(c * 0.8 for c in rgb))
    col = _mix(nt, _maprange(nt, big, 0.4, 0.7, 0.0, 0.25), col, tuple(c * 0.78 for c in rgb))
    edge = _maprange(nt, _ao(nt, 0.006, inside=True), 0.6, 1.0, 1.0, 0.0)
    col = _mix(nt, _math(nt, "MULTIPLY", edge, 0.5), col, tuple(min(1.0, c * 1.5) for c in rgb))
    col = _mix(nt, _maprange(nt, _ao(nt, 0.04), 0.35, 1.0, 0.5, 0.0), col, tuple(c * 0.35 for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.88
    b.inputs["Specular IOR Level"].default_value = 0.25
    flute = _math(nt, "SINE", _math(nt, "MULTIPLY", z, math.tau / 0.008))
    _bump(nt, b, _math(nt, "ADD", _math(nt, "MULTIPLY", flute, 0.12), fib), 0.1, 0.0004)
    return m


def book_cloth(name, rgb):
    """A cloth-bound book or a pressboard binder: one muted colour, a fine weave, rubbed paler at the corners."""
    m, nt, b = _new(name)
    o = _obj(nt)
    weave = _noise(nt, o, 700.0, 2.0, 0.6)
    big = _noise(nt, o, 5.0, 3.0, 0.6)
    col = _mix(nt, _maprange(nt, big, 0.3, 0.7, 0.0, 0.25), rgb, tuple(c * 0.75 for c in rgb))
    edge = _maprange(nt, _ao(nt, 0.004, inside=True), 0.6, 1.0, 1.0, 0.0)
    col = _mix(nt, _math(nt, "MULTIPLY", edge, 0.45), col, tuple(min(1.0, c * 1.7 + 0.02) for c in rgb))
    _link(nt, col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.8
    b.inputs["Specular IOR Level"].default_value = 0.25
    _bump(nt, b, weave, 0.12, 0.0003)
    return m


def satin_wood(holder, rgb=(0.07, 0.036, 0.02), rough=(0.42, 0.55)):
    """Replace a generated chair's baked texture (blotchy up close) with a satin-finished hardwood, in world space:
    grain along the seat's front-to-back axis on up-facing faces and along Z on the legs and spindles, open pores, a
    dark grime in the joints, paler rubbed arrises. Adapted from home_mats.satin_wood."""
    seen = set()
    for ob in holder.children_recursive:
        if ob.type != "MESH":
            continue
        for slot in ob.material_slots:
            m = slot.material
            if not m or m.name in seen or not m.use_nodes:
                continue
            seen.add(m.name)
            nt = m.node_tree
            b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if b is None:
                continue
            for sock in ("Base Color", "Roughness", "Normal", "Metallic"):
                for ln in list(b.inputs[sock].links):
                    nt.links.remove(ln)
            b.inputs["Metallic"].default_value = 0.0
            b.inputs["Specular IOR Level"].default_value = 0.32
            b.inputs["Coat Weight"].default_value = 0.0
            p = _pos(nt)
            geo = _n(nt, "ShaderNodeNewGeometry")
            _, _, nz = _xyz(nt, geo.outputs["Normal"])
            up = _maprange(nt, _math(nt, "ABSOLUTE", nz), 0.6, 0.8, 0.0, 1.0)
            g_seat = _noise(nt, p, 1.0, 5.0, 0.6, mapping=(55.0, 2.0, 55.0))
            g_leg = _noise(nt, p, 1.0, 5.0, 0.6, mapping=(55.0, 55.0, 2.0))
            grain = _math(nt, "ADD", _math(nt, "MULTIPLY", g_seat, up), _math(nt, "MULTIPLY", g_leg, _math(nt, "SUBTRACT", 1.0, up)))
            pores = _noise(nt, p, 1.0, 2.0, 0.6, mapping=(600.0, 600.0, 30.0))
            dark, lite = tuple(c * 0.75 for c in rgb), tuple(c * 1.18 for c in rgb)
            col = _mix(nt, _maprange(nt, grain, 0.35, 0.65, 0.0, 1.0), lite, dark)
            col = _mix(nt, _maprange(nt, pores, 0.62, 0.72, 0.0, 0.35), col, tuple(c * 0.6 for c in rgb))
            edge = _maprange(nt, _ao(nt, 0.006, inside=True), 0.6, 1.0, 1.0, 0.0)
            col = _mix(nt, _math(nt, "MULTIPLY", edge, 0.4), col, tuple(min(1.0, c * 1.9) for c in rgb))
            col = _mix(nt, _maprange(nt, _ao(nt, 0.04), 0.35, 1.0, 0.55, 0.0), col, tuple(c * 0.35 for c in rgb))
            _link(nt, col, b.inputs["Base Color"])
            _link(nt, _maprange(nt, _noise(nt, p, 14.0, 3.0, 0.6), 0.3, 0.7, rough[0], rough[1]), b.inputs["Roughness"])
            _bump(nt, b, _math(nt, "ADD", grain, _math(nt, "MULTIPLY", pores, 0.4)), 0.1, 0.0005)
    return holder
