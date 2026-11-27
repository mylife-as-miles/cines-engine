"""The Void Stage's parts: the black stage floor, the hard top spotlight and its haze, the cell box (Ch 08) and its
fittings. Materials work in world space (every part's mesh is built in place, its object at the origin), so one
painted-block material serves all the cell's walls and the floor's hardboard panels run on across the whole stage.

Light units (calibrated against the other stages): a spot or point of P watts gives E = P / (4 pi d^2) W/m2 at d
metres, and a diffuse surface of albedo a reads a * E / pi before the exposure.
"""
import math

import bpy  # noqa: F401  (first: bmesh and mathutils only exist once bpy is loaded)
import bmesh
from mathutils import Matrix, Vector

M = {}          # materials by short name
LIGHTS = {}     # lights by name


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


def _in(n, name):
    """The enabled input called `name` (the Mix node has one A, B per data type)."""
    for s in n.inputs:
        if s.name == name and s.enabled:
            return s
    return n.inputs[name]


def _out(n, name=None):
    alias = {"Fac": "Factor", "Factor": "Fac"}
    outs = [o for o in n.outputs if o.enabled and (name is None or name in (o.name, o.identifier)
                                                   or alias.get(name) in (o.name, o.identifier))]
    return outs[0]


def _set(nt, sock, v):
    if isinstance(v, (int, float)):
        sock.default_value = v
    elif isinstance(v, tuple):
        sock.default_value = (*v[:3], 1.0) if len(sock.default_value) == 4 else v
    else:
        nt.links.new(v, sock)


def _math(nt, op, a, b=0.0, clamp=False):
    n = _n(nt, "ShaderNodeMath", operation=op)
    n.use_clamp = clamp
    for i, v in enumerate((a, b)):
        _set(nt, n.inputs[i], v)
    return n.outputs[0]


def _maprange(nt, src, a, b, c, d):
    n = _n(nt, "ShaderNodeMapRange")
    n.inputs["From Min"].default_value, n.inputs["From Max"].default_value = a, b
    n.inputs["To Min"].default_value, n.inputs["To Max"].default_value = c, d
    nt.links.new(src, n.inputs["Value"])
    return _out(n, "Result")


def _mix(nt, fac, a, b, blend="MIX"):
    n = _n(nt, "ShaderNodeMix", data_type="RGBA", blend_type=blend)
    _set(nt, _in(n, "Factor"), fac)
    _set(nt, _in(n, "A"), a)
    _set(nt, _in(n, "B"), b)
    return _out(n, "Result")


def _noise(nt, vec, scale, detail=2.0, rough=0.5, stretch=None):
    n = _n(nt, "ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    if stretch:
        mp = _n(nt, "ShaderNodeMapping")
        mp.inputs["Scale"].default_value = stretch
        nt.links.new(vec, mp.inputs["Vector"])
        vec = mp.outputs["Vector"]
    nt.links.new(vec, n.inputs["Vector"])
    return n.outputs["Fac"]


def _bump(nt, b, height, strength, distance, normal=None):
    n = _n(nt, "ShaderNodeBump")
    n.inputs["Strength"].default_value = strength
    n.inputs["Distance"].default_value = distance
    nt.links.new(height, n.inputs["Height"])
    if normal is not None:
        nt.links.new(normal, n.inputs["Normal"])
    nt.links.new(n.outputs["Normal"], b.inputs["Normal"])
    return n


def _obj(nt):
    return _n(nt, "ShaderNodeTexCoord").outputs["Object"]


def _xyz(nt, vec):
    s = _n(nt, "ShaderNodeSeparateXYZ")
    nt.links.new(vec, s.inputs["Vector"])
    return s.outputs["X"], s.outputs["Y"], s.outputs["Z"]


def _vec(nt, x, y, z):
    c = _n(nt, "ShaderNodeCombineXYZ")
    for k, v in zip("XYZ", (x, y, z)):
        _set(nt, c.inputs[k], v)
    return c.outputs["Vector"]


def _ao(nt, distance=0.35):
    n = _n(nt, "ShaderNodeAmbientOcclusion", samples=4)
    n.inputs["Distance"].default_value = distance
    return _out(n, "AO")


def _brick(nt, vec, w, h, mortar, offset=0.5, c1=(1, 1, 1), c2=(0.95, 0.95, 0.95), cm=(0.75, 0.75, 0.75)):
    br = _n(nt, "ShaderNodeTexBrick", offset=offset, offset_frequency=2, squash=1.0, squash_frequency=2)
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = mortar
    br.inputs["Mortar Smooth"].default_value = 0.25
    br.inputs["Brick Width"].default_value = w
    br.inputs["Row Height"].default_value = h
    br.inputs["Bias"].default_value = 0.0
    br.inputs["Color1"].default_value = (*c1, 1)
    br.inputs["Color2"].default_value = (*c2, 1)
    br.inputs["Mortar"].default_value = (*cm, 1)
    nt.links.new(vec, br.inputs["Vector"])
    return br


# ---------------------------------------------------------------- materials

def _ridge(nt, vec, scale, stretch, lo, hi, detail=3.0):
    """Thin wandering lines: the crest of a stretched noise (1 - |2n - 1|), kept only near its top."""
    n = _noise(nt, vec, scale, detail, 0.55, stretch=stretch)
    r = _math(nt, "SUBTRACT", 1.0, _math(nt, "MULTIPLY", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", n, 0.5)), 2.0))
    return _maprange(nt, r, lo, hi, 0.0, 1.0)


def _vmath(nt, op, a, b=None):
    n = _n(nt, "ShaderNodeVectorMath", operation=op)
    _set(nt, n.inputs[0], a)
    if b is not None:
        _set(nt, n.inputs[1], b)
    return n.outputs["Value"] if op in ("DISTANCE", "LENGTH", "DOT_PRODUCT") else n.outputs["Vector"]


def stage_floor(cell=None):
    """A black-box stage floor: 1.22 x 2.44 m hardboard sheets painted matt black, each a few per cent off its
    neighbours, the butt joints a 2 mm dark groove; heel marks (thin dark streaks) and fine pale scratches along the
    traffic directions, ghosts of old spike tape (strips and crosses, a little glossier and greyer where the adhesive
    held dust), a film of dust; satin to matt (roughness 0.55-0.75). Its albedo (about 0.09) sits above the bags'
    (0.03): the lit pool reads grey and the dark bags read on it. Around the cell (`cell` = its centre) the floor
    falls to near black a short way out from the slab, so no stray spill reads there."""
    m, nt, b = _new("stage floor")
    o = _obj(nt)
    br = _brick(nt, o, 2.44, 1.22, 0.0022, offset=0.5, c1=(1.04, 1.04, 1.04), c2=(0.955, 0.955, 0.96),
                cm=(0.3, 0.3, 0.3))
    br.inputs["Mortar Smooth"].default_value = 0.1
    seam = _out(br, "Fac")
    base = _mix(nt, 1.0, (0.086, 0.086, 0.09), _out(br, "Color"), "MULTIPLY")
    mott = _noise(nt, o, 0.7, 4.0, 0.6)
    base = _mix(nt, _maprange(nt, mott, 0.3, 0.7, 0.0, 0.25), base, (0.072, 0.072, 0.076))
    # heel and case-wheel marks: thin dark streaks along X and Y, only in patches
    patch = _maprange(nt, _noise(nt, o, 1.3, 2.0, 0.5), 0.5, 0.62, 0.0, 1.0)
    dk = _math(nt, "MAXIMUM", _ridge(nt, o, 2.6, (1.0, 7.0, 1.0), 0.955, 0.99),
               _ridge(nt, _vmath(nt, "ADD", o, (3.1, 1.7, 0.0)), 2.6, (7.0, 1.0, 1.0), 0.955, 0.99))
    dk = _math(nt, "MULTIPLY", dk, patch)
    base = _mix(nt, _math(nt, "MULTIPLY", dk, 0.55), base, (0.04, 0.04, 0.042))
    # fine pale scratches (the paint scraped toward the board), sparse
    sp = _maprange(nt, _noise(nt, _vmath(nt, "ADD", o, (7.3, 2.2, 0.0)), 0.9, 2.0, 0.5), 0.52, 0.66, 0.0, 1.0)
    sc = _math(nt, "MAXIMUM", _ridge(nt, o, 11.0, (1.0, 18.0, 1.0), 0.975, 0.996, 2.0),
               _ridge(nt, _vmath(nt, "ADD", o, (1.9, 5.3, 0.0)), 11.0, (18.0, 1.0, 1.0), 0.975, 0.996, 2.0))
    sc = _math(nt, "MULTIPLY", sc, sp)
    base = _mix(nt, _math(nt, "MULTIPLY", sc, 0.5), base, (0.16, 0.158, 0.155))
    # old spike tape: per Voronoi cell, maybe a strip (or a cross) 32 x 4.8 cm, ragged, partly peeled
    vor = _n(nt, "ShaderNodeTexVoronoi", feature="F1", distance="EUCLIDEAN")
    vor.inputs["Scale"].default_value = 0.55
    nt.links.new(o, vor.inputs["Vector"])
    loc = _vmath(nt, "SUBTRACT", o, vor.outputs["Position"])
    lx, ly, _ = _xyz(nt, loc)
    cr, cg, cb = _xyz(nt, vor.outputs["Color"])
    sw = _math(nt, "GREATER_THAN", cr, 0.5)
    ax = _mix(nt, sw, lx, ly)
    ay = _mix(nt, sw, ly, lx)
    rag = _math(nt, "MULTIPLY", _noise(nt, o, 90.0, 2.0, 0.6), 0.008)
    ax = _math(nt, "ABSOLUTE", _xyz(nt, ax)[0])
    ay = _math(nt, "ABSOLUTE", _xyz(nt, ay)[0])

    def strip(u, v):
        return _math(nt, "MULTIPLY", _math(nt, "LESS_THAN", _math(nt, "ADD", u, rag), 0.16),
                     _math(nt, "LESS_THAN", _math(nt, "ADD", v, rag), 0.024))
    tape = _math(nt, "MAXIMUM", strip(ax, ay), _math(nt, "MULTIPLY", strip(ay, ax), _math(nt, "GREATER_THAN", cb, 0.6)))
    tape = _math(nt, "MULTIPLY", tape, _math(nt, "LESS_THAN", cg, 0.35))
    tape = _math(nt, "MULTIPLY", tape, _maprange(nt, _noise(nt, o, 14.0, 3.0, 0.6), 0.35, 0.55, 0.0, 1.0))
    base = _mix(nt, _math(nt, "MULTIPLY", tape, 0.7), base, (0.105, 0.104, 0.104))
    dust = _noise(nt, o, 2.2, 3.0, 0.5)
    base = _mix(nt, _maprange(nt, dust, 0.5, 0.78, 0.0, 0.14), base, (0.14, 0.137, 0.133))
    if cell is not None:
        # near black a little way out from the cell's slab (its outline about 2.9 x 3.9 m)
        p = _n(nt, "ShaderNodeNewGeometry").outputs["Position"]
        px, py, _ = _xyz(nt, p)
        dx = _math(nt, "MAXIMUM", _math(nt, "SUBTRACT", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", px, cell[0])), 1.6), 0.0)
        dy = _math(nt, "MAXIMUM", _math(nt, "SUBTRACT", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", py, cell[1])), 2.2), 0.0)
        d = _math(nt, "SQRT", _math(nt, "ADD", _math(nt, "MULTIPLY", dx, dx), _math(nt, "MULTIPLY", dy, dy)))
        near = _math(nt, "LESS_THAN", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", px, cell[0])), 20.0)
        fade = _math(nt, "MULTIPLY", _maprange(nt, d, 0.15, 1.0, 0.0, 0.88), near)
        base = _mix(nt, fade, base, (0.01, 0.01, 0.011))
    nt.links.new(base, b.inputs["Base Color"])
    rough = _maprange(nt, mott, 0.3, 0.7, 0.58, 0.68)
    rough = _math(nt, "ADD", rough, _math(nt, "MULTIPLY", dk, -0.08))
    rough = _math(nt, "ADD", rough, _math(nt, "MULTIPLY", sc, 0.08))
    rough = _math(nt, "ADD", rough, _math(nt, "MULTIPLY", tape, _math(nt, "SUBTRACT", 0.5, rough)))
    rough = _math(nt, "ADD", rough, _math(nt, "MULTIPLY", seam, 0.2), clamp=True)
    nt.links.new(rough, b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.4
    grain = _noise(nt, o, 260.0, 2.0, 0.6)
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", seam, -1.0), _math(nt, "MULTIPLY", grain, 0.1))
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", sc, -0.12))
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", tape, 0.05))
    _bump(nt, b, h, 0.35, 0.0015)
    M["floor"] = m
    return m


def block_paint():
    """Painted concrete block for the cell's walls (400 x 200 mm, running bond), world space: the coursing runs along X
    on walls that face Y and along Y on walls that face X. Institutional two-tone: a satin grey-green dado to 1.2 m,
    pale grey above; grime rising from the floor and settling into the corners; scuffs where a bunk and shoulders rub."""
    m, nt, b = _new("cell block paint")
    geo = _n(nt, "ShaderNodeNewGeometry")
    x, y, z = _xyz(nt, geo.outputs["Position"])
    nx, ny, nz = _xyz(nt, geo.outputs["True Normal"])
    ax = _math(nt, "GREATER_THAN", _math(nt, "ABSOLUTE", nx), 0.5)
    u = _math(nt, "ADD", x, _math(nt, "MULTIPLY", ax, _math(nt, "SUBTRACT", y, x)))
    uv = _vec(nt, u, z, 0.0)
    br = _brick(nt, uv, 0.40, 0.20, 0.009)
    low = _math(nt, "LESS_THAN", z, 1.32)
    base = _mix(nt, low, (0.26, 0.27, 0.255), (0.11, 0.122, 0.114))
    base = _mix(nt, 1.0, base, _out(br, "Color"), "MULTIPLY")
    w = _vec(nt, u, z, _math(nt, "MULTIPLY", ax, 7.0))
    blotch = _noise(nt, w, 2.6, 5.0, 0.62)
    grime = _math(nt, "MULTIPLY", _maprange(nt, z, 0.12, 0.6, 1.0, 0.0), _maprange(nt, blotch, 0.3, 0.7, 0.6, 1.0))
    base = _mix(nt, _math(nt, "MULTIPLY", grime, 0.35), base, (0.02, 0.022, 0.02))
    rub = _maprange(nt, _noise(nt, w, 5.0, 6.0, 0.65, stretch=(1.0, 4.0, 1.0)), 0.6, 0.72, 0.0, 1.0)
    band = _math(nt, "MULTIPLY", _maprange(nt, z, 0.9, 1.0, 0.0, 1.0), _maprange(nt, z, 1.6, 1.7, 1.0, 0.0))
    base = _mix(nt, _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", rub, band), 0.4), base, (0.12, 0.12, 0.115))
    base = _mix(nt, _math(nt, "MULTIPLY", _maprange(nt, blotch, 0.55, 0.8, 0.0, 1.0), 0.12), base, (0.30, 0.29, 0.27))
    ao = _ao(nt, 0.4)
    base = _mix(nt, _maprange(nt, ao, 0.4, 1.0, 0.45, 0.0), base, (0.0, 0.0, 0.0))
    nt.links.new(base, b.inputs["Base Color"])
    stipple = _noise(nt, w, 150.0, 3.0, 0.7)
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", _out(br, "Fac"), -1.0), _math(nt, "MULTIPLY", stipple, 0.2))
    _bump(nt, b, h, 0.45, 0.003)
    r = _math(nt, "ADD", _maprange(nt, stipple, 0.3, 0.7, -0.07, 0.06), 0.78)
    r = _math(nt, "SUBTRACT", r, _math(nt, "MULTIPLY", low, 0.24), clamp=True)
    nt.links.new(r, b.inputs["Roughness"])
    M["block"] = m
    return m


def section():
    """The cut faces of the set (wall tops, the open front's wall ends, the slab's edge): raw cast concrete, mid-dark
    and matt, so the edges that face the spot draw the box without burning out."""
    m, nt, b = _new("raw concrete section")
    o = _obj(nt)
    mott = _noise(nt, o, 3.0, 6.0, 0.6)
    fine = _noise(nt, o, 40.0, 3.0, 0.6)
    base = _mix(nt, _maprange(nt, mott, 0.3, 0.7, 0.0, 1.0), (0.16, 0.16, 0.155), (0.21, 0.205, 0.2))
    base = _mix(nt, _maprange(nt, fine, 0.4, 0.6, 0.0, 0.3), base, (0.12, 0.12, 0.118))
    nt.links.new(base, b.inputs["Base Color"])
    nt.links.new(_maprange(nt, fine, 0.3, 0.7, 0.78, 0.92), b.inputs["Roughness"])
    pores = _maprange(nt, _noise(nt, o, 220.0, 2.0, 0.5), 0.62, 0.7, 0.0, 1.0)
    _bump(nt, b, _math(nt, "ADD", _math(nt, "MULTIPLY", pores, -0.6), _math(nt, "MULTIPLY", fine, 0.3)), 0.35, 0.002)
    M["section"] = m
    return m


# the paths twelve years of feet have worn into the cell's floor paint (cell-local x, y): in from the open side, to the
# bunk's open edge, along it, and across to the basin unit in the back corner
TRAFFIC = [(0.25, -1.9), (0.2, -1.2), (0.05, -0.55), (-0.15, 0.05), (-0.2, 0.7), (-0.15, 1.25),
           (0.15, 0.6), (0.45, 1.0), (0.7, 1.25)]


def cell_floor(cell=(0.0, 0.0)):
    """The cell's floor: grey painted concrete, even in value; along the traffic paths (door side to the bunk, bunk to
    the basin) the paint is worn thin to a paler, rougher concrete in irregular strips, with thin dark scuffs from
    shoes; dirt in the corners at the wall bases. Roughness 0.6, rising to 0.8 where worn."""
    m, nt, b = _new("cell floor paint")
    o = _obj(nt)
    p = _n(nt, "ShaderNodeNewGeometry").outputs["Position"]
    q = _vmath(nt, "SUBTRACT", p, (cell[0], cell[1], 0.0))
    qx, qy, _ = _xyz(nt, q)
    flat = _vec(nt, qx, qy, 0.0)
    path = None
    for (x, y) in TRAFFIC:
        d = _vmath(nt, "DISTANCE", flat, (x, y, 0.0))
        w = _maprange(nt, d, 0.12, 0.5, 1.0, 0.0)
        path = w if path is None else _math(nt, "MAXIMUM", path, w)
    big = _n(nt, "ShaderNodeTexVoronoi", feature="F1")
    big.inputs["Scale"].default_value = 3.0
    nt.links.new(o, big.inputs["Vector"])
    rag = _maprange(nt, _noise(nt, o, 7.0, 6.0, 0.68), 0.3, 0.7, 0.0, 1.0)
    edge = _maprange(nt, _out(big, "Distance"), 0.0, 0.45, 0.6, 1.0)
    worn = _maprange(nt, _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", path, rag), edge), 0.18, 0.5, 0.0, 1.0)
    mott = _noise(nt, o, 0.8, 3.0, 0.5)
    base = _mix(nt, _maprange(nt, mott, 0.3, 0.7, 0.0, 0.3), (0.2, 0.208, 0.2), (0.188, 0.196, 0.19))
    base = _mix(nt, _math(nt, "MULTIPLY", worn, 0.8), base, (0.25, 0.243, 0.228))
    # shoe scuffs: thin dark streaks, mostly on the paths
    sc = _math(nt, "MAXIMUM", _ridge(nt, o, 4.0, (1.0, 6.0, 1.0), 0.965, 0.995),
               _ridge(nt, _vmath(nt, "ADD", o, (2.3, 0.7, 0.0)), 4.0, (6.0, 1.0, 1.0), 0.965, 0.995))
    sc = _math(nt, "MULTIPLY", sc, _math(nt, "ADD", _math(nt, "MULTIPLY", path, 0.8), 0.15))
    base = _mix(nt, _math(nt, "MULTIPLY", sc, 0.6), base, (0.09, 0.09, 0.088))
    ao = _ao(nt, 0.3)
    base = _mix(nt, _maprange(nt, ao, 0.4, 1.0, 0.6, 0.0), base, (0.03, 0.03, 0.028))
    nt.links.new(base, b.inputs["Base Color"])
    r = _math(nt, "ADD", _maprange(nt, mott, 0.3, 0.7, 0.57, 0.63), _math(nt, "MULTIPLY", worn, 0.2), clamp=True)
    r = _math(nt, "ADD", r, _math(nt, "MULTIPLY", sc, -0.1), clamp=True)
    nt.links.new(r, b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.4
    pits = _maprange(nt, _noise(nt, o, 180.0, 2.0, 0.5), 0.64, 0.72, 0.0, 1.0)
    _bump(nt, b, _math(nt, "ADD", _math(nt, "MULTIPLY", pits, -0.5), _math(nt, "MULTIPLY", worn, -0.25)), 0.3, 0.0012)
    M["cell_floor"] = m
    return m


def steel(name, rgb=(0.58, 0.59, 0.6), rough=0.32):
    """Brushed stainless (the toilet-basin unit): grain along the part's length, smudged and dulled where hands go."""
    m, nt, b = _new(name)
    o = _obj(nt)
    b.inputs["Metallic"].default_value = 1.0
    brush = _noise(nt, o, 60.0, 3.0, 0.6, stretch=(1.0, 1.0, 40.0))
    smudge = _noise(nt, o, 7.0, 4.0, 0.6)
    r = _math(nt, "ADD", _maprange(nt, brush, 0.3, 0.7, rough - 0.06, rough + 0.06),
              _maprange(nt, smudge, 0.5, 0.8, 0.0, 0.18), clamp=True)
    nt.links.new(r, b.inputs["Roughness"])
    base = _mix(nt, _maprange(nt, smudge, 0.4, 0.8, 0.0, 0.35), rgb, tuple(c * 0.7 for c in rgb))
    nt.links.new(base, b.inputs["Base Color"])
    if "Anisotropic" in b.inputs:
        b.inputs["Anisotropic"].default_value = 0.4
    M[name] = m
    return m


def painted_steel(name, rgb, rough=0.45):
    m, nt, b = _new(name)
    o = _obj(nt)
    chip = _noise(nt, o, 30.0, 4.0, 0.6)
    base = _mix(nt, _maprange(nt, chip, 0.62, 0.7, 0.0, 1.0), rgb, (0.2, 0.19, 0.18))
    nt.links.new(base, b.inputs["Base Color"])
    nt.links.new(_maprange(nt, chip, 0.3, 0.7, rough - 0.08, rough + 0.12), b.inputs["Roughness"])
    _bump(nt, b, _noise(nt, o, 300.0, 2.0, 0.5), 0.05, 0.0003)
    M[name] = m
    return m


def dark(name, rgb=(0.012, 0.012, 0.013), rough=0.6):
    m, nt, b = _new(name)
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    M[name] = m
    return m


def frosted_glow(name, rgb, strength, top_z=None, sill_z=None):
    """The window slot's pane from inside: clear glass with the lit night beyond it, a cool glow a little brighter
    toward the top (the sky over the yard wall), faint dirt on the glass. No wire mesh: the floor patch it throws
    shows only the bars, and so does the pane."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*rgb, 1)
    o = _obj(nt)
    dirt = _maprange(nt, _noise(nt, o, 22.0, 4.0, 0.62), 0.35, 0.75, 1.05, 0.82)
    s = _math(nt, "MULTIPLY", dirt, strength)
    if top_z is not None:
        z = _xyz(nt, _n(nt, "ShaderNodeNewGeometry").outputs["Position"])[2]
        s = _math(nt, "MULTIPLY", s, _maprange(nt, z, sill_z, top_z, 0.8, 1.15))
    nt.links.new(s, em.inputs["Strength"])
    nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs[0])
    m.cycles.emission_sampling = "NONE"
    M[name] = m
    return m


def materials(cell=None):
    M.clear()
    stage_floor(cell)
    block_paint()
    section()
    cell_floor(cell or (0.0, 0.0))
    steel("stainless")
    painted_steel("bar steel", (0.075, 0.078, 0.08), rough=0.4)
    dark("slot void")


# ---------------------------------------------------------------- geometry

def _link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def block(name, lo, hi, mats, face_mat=None, bevel=0.0, segs=3):
    """An axis-aligned box from corner lo to hi, built in place (object at the origin, so world-space materials line
    up). `mats` is a list of materials; `face_mat(normal)` picks each face's slot. A bevel that catches light."""
    lo, hi = Vector(lo), Vector(hi)
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    c = (lo + hi) / 2
    s = hi - lo
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(c) @ Matrix.Diagonal((*s, 1)))
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    for m in mats:
        me.materials.append(m)
    if face_mat:
        for p in me.polygons:
            p.material_index = face_mat(p.normal)
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments = bevel, segs
        bv.limit_method = "ANGLE"
        ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
        for p in me.polygons:
            p.use_smooth = True
    return ob


def floor():
    """The stage: one wide floor running off into the dark on every side."""
    me = bpy.data.meshes.new("stage_floor")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.0, matrix=Matrix.Diagonal((80.0, 40.0, 1.0, 1.0)))
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new("stage_floor", me))
    me.materials.append(M["floor"])
    return ob


def spot(name, loc, aim, energy, size_deg, blend, radius=0.035, colour=(0.93, 0.96, 1.0), scale=None):
    """The hard top spotlight: a small source (crisp shadows), a defined pool edge. `scale` (x, y) squashes the cone
    into an ellipse (local x across, local y toward the lamp's up)."""
    li = bpy.data.lights.new(name, "SPOT")
    li.energy, li.color = energy, colour
    li.spot_size, li.spot_blend = math.radians(size_deg), blend
    li.shadow_soft_size = radius
    ob = _link(bpy.data.objects.new(name, li))
    ob.location = loc
    d = Vector(aim) - Vector(loc)
    if abs(d.normalized().z) > 0.9999:
        ob.rotation_euler = (0.0, 0.0, 0.0) if d.z < 0 else (math.pi, 0.0, 0.0)
    else:
        ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    if scale:
        ob.scale = (scale[0], scale[1], 1.0)
    ob.visible_camera = False
    LIGHTS[name] = ob
    return ob


def hotspot(base, frac=0.62, gain=0.35):
    """A second, fully soft cone inside a spot, from the same point (one shadow): the pool about a third brighter at
    its centre than at its edge, as a real fresnel or profile spot throws, instead of an even disc."""
    li = base.data
    h = bpy.data.lights.new(base.name + "_hot", "SPOT")
    h.energy, h.color = li.energy * gain, li.color
    h.spot_size = 2 * math.atan(math.tan(li.spot_size / 2) * frac)
    h.spot_blend = 1.0
    h.shadow_soft_size = li.shadow_soft_size
    ob = _link(bpy.data.objects.new(h.name, h))
    ob.location, ob.rotation_euler, ob.scale = base.location.copy(), base.rotation_euler.copy(), base.scale.copy()
    ob.visible_camera = False
    LIGHTS[h.name] = ob
    return ob


def link_lights(lights, receivers=None, exclude=None, tag="link"):
    """Light linking: each light lights only `receivers`, or everything but `exclude`."""
    coll = bpy.data.collections.new(f"{tag}_recv")
    objs = receivers if receivers is not None else exclude
    for o in objs:
        coll.objects.link(o)
    if exclude is not None:
        for co in coll.collection_objects:
            co.light_linking.link_state = "EXCLUDE"
    for li in lights:
        li.light_linking.receiver_collection = coll
    return coll


def area(name, loc, aim, size, energy, colour, spread_deg=180.0):
    li = bpy.data.lights.new(name, "AREA")
    li.shape, li.size, li.size_y = "RECTANGLE", size[0], size[1]
    li.energy, li.color, li.spread = energy, colour, math.radians(spread_deg)
    ob = _link(bpy.data.objects.new(name, li))
    ob.location = loc
    d = Vector(aim) - Vector(loc)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    ob.visible_camera = False
    ob.visible_glossy = False
    LIGHTS[name] = ob
    return ob


def haze_material(name, density, colour=(0.86, 0.89, 0.93), drift=0.0, aniso=0.0):
    """Stage haze. `drift` > 0 lets the density wander (0.6-1.4 x) in slow soft clouds, as real haze hangs, so a
    beam reads as light falling through air rather than an even grey solid."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    pv = nt.nodes.new("ShaderNodeVolumePrincipled")
    pv.inputs["Color"].default_value = (*colour, 1)
    pv.inputs["Anisotropy"].default_value = aniso
    if drift:
        o = _obj(nt)
        n = _noise(nt, o, drift, 3.0, 0.55, stretch=(1.0, 1.0, 0.45))
        nt.links.new(_math(nt, "MULTIPLY", _maprange(nt, n, 0.3, 0.7, 0.55, 1.45), density), pv.inputs["Density"])
    else:
        pv.inputs["Density"].default_value = density
    nt.links.new(pv.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    return m


def haze(name, lo, hi, density, colour=(0.86, 0.89, 0.93), drift=0.0):
    ob = block(name, lo, hi, [haze_material(name, density, colour, drift)])
    ob.visible_shadow = False
    return ob


def haze_cone(name, lamp, aim, r_floor, r_top, density, drift=0.7, floor_z=-0.25, aniso=0.0):
    """Haze only around a spot's cone: a frustum from below the floor (a face lying on the floor would black it out)
    up to just under the lamp, `r_floor` wide at the floor, so the dark behind the subject stays black."""
    lamp, aim = Vector(lamp), Vector(aim)
    ax = (lamp - aim).normalized()
    t0 = (floor_z - aim.z) / ax.z
    bot = aim + ax * t0
    top = lamp - ax * 0.3
    L = (top - bot).length
    rot = ax.to_track_quat("Z", "Y").to_matrix().to_4x4()
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=r_floor, radius2=r_top, depth=L,
                          matrix=Matrix.Translation((bot + top) / 2) @ rot)
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    me.materials.append(haze_material(name, density, drift=drift, aniso=aniso))
    ob.visible_shadow = False
    return ob


def haze_box_along(name, a, b, width, depth, density, drift=0.9, aniso=0.0):
    """A haze slab along a light path from a to b (a shaft through a window), width across, depth in the plane."""
    a, b = Vector(a), Vector(b)
    d = b - a
    rot = d.to_track_quat("Z", "Y").to_matrix().to_4x4()
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((a + b) / 2) @ rot @ Matrix.Diagonal((width, depth, d.length, 1.0)))
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    me.materials.append(haze_material(name, density, drift=drift, aniso=aniso))
    ob.visible_shadow = False
    return ob


# ---------------------------------------------------------------- the cell (Ch 08)
# Interior 2.5 x 3.6 m, walls 2.75 m over a 0.12 m slab; the fourth wall (toward -Y) is open, as on a set.
CX, CY = 1.25, 1.8          # interior half width (x), half depth (y)
T = 0.22                    # wall thickness
SLAB = 0.12                 # the slab the cell stands on
WH = 2.75                   # wall height above the slab
TOPZ = SLAB + WH
SLOT = (0.22, 0.72, SLAB + 1.93, 0.3)  # window slot: centre x, width, sill z, height (in the back wall)
WINDOW_PATCH = (0.2, 0.3, SLAB)        # where the slot's light lands (cell-local): open floor right of the bunk, in
                                       # the close shot's frame (a 35-45 deg fall would land it at the lens's feet)
SPLAY = 0.24                           # the sill slopes this far down to the inner face, as thick walls' high windows do,
                                       # so a steep light gets through the slot
WINDOW_DIST = 12.0                     # the night source: a small lamp this far behind the slot (near-parallel rays:
WINDOW_W = 175000.0                    # the patch is the slot, barred, a fifth larger), W; at 125 kW the patch was
                                       # only 17 % over the top-lit floor and its bars barely read
BARS = 5                               # round bars in the slot, 25 mm
CAP = 0.0015                           # the wall-top caps (the graze light's receivers)


def _wall_faces(front_cut):
    """Slot 0 = paint, 1 = raw section. Tops are section; a side wall's end on the open front is section too."""
    def f(nrm):
        if nrm.z > 0.5:
            return 1
        if front_cut and nrm.y < -0.5:
            return 1
        return 0
    return f


def window_ray(ox, oy):
    """The slot's middle (on the wall's inner face) and the unit direction of the night light through it."""
    o = Vector((ox, oy, 0.0))
    sx, sw, sz, sh = SLOT
    mid = o + Vector((sx, CY + T * 0.5, sz + sh * 0.5))
    d = (o + Vector(WINDOW_PATCH) - mid).normalized()
    return mid, d


def cell(ox, oy):
    """The cell box at (ox, oy): slab, three walls (the back one pierced by the window slot), the slot's bars, the
    pane and the night light behind it. Returns (objects, extras) where extras names the wall-top caps, the walls and
    the window light for light linking."""
    objs = []
    P, S = M["block"], M["section"]
    o = Vector((ox, oy, 0.0))
    walls = []

    def B(name, lo, hi, mats, fm=None, bevel=0.012):
        ob = block(name, tuple(o + Vector(lo)), tuple(o + Vector(hi)), mats, fm, bevel)
        objs.append(ob)
        return ob

    # slab: the painted floor on top, raw concrete edges
    slab = B("cell_slab", (-CX - T, -CY - 0.06, 0.0), (CX + T, CY + T, SLAB), [M["cell_floor"], S],
             lambda n: 0 if n.z > 0.5 else 1, bevel=0.01)
    # side walls: from the open front to the back wall's outer face
    walls.append(B("cell_wall_l", (-CX - T, -CY, SLAB), (-CX, CY + T, TOPZ), [P, S], _wall_faces(True)))
    walls.append(B("cell_wall_r", (CX, -CY, SLAB), (CX + T, CY + T, TOPZ), [P, S], _wall_faces(True)))
    # back wall, built round the slot
    sx, sw, sz, sh = SLOT
    y0, y1 = CY, CY + T
    zs = sz - SPLAY                    # the low wall stops under the sill; the sill's wedge sits above
    walls.append(B("cell_wall_b_low", (-CX, y0, SLAB), (CX, y1, zs), [P, S], _wall_faces(False)))
    walls.append(B("cell_wall_b_mid_l", (-CX, y0, zs), (sx - sw / 2, y1, sz), [P, S], _wall_faces(False), bevel=0.008))
    walls.append(B("cell_wall_b_mid_r", (sx + sw / 2, y0, zs), (CX, y1, sz), [P, S], _wall_faces(False), bevel=0.008))
    sill = B("cell_wall_b_sill", (sx - sw / 2, y0, zs), (sx + sw / 2, y1, sz), [P, S], _wall_faces(False),
             bevel=0.006)
    sloped_top(sill, y0, SPLAY - 0.012)
    walls.append(sill)
    walls.append(B("cell_wall_b_top", (-CX, y0, sz + sh), (CX, y1, TOPZ), [P, S], _wall_faces(False)))
    walls.append(B("cell_wall_b_l", (-CX, y0, sz), (sx - sw / 2, y1, sz + sh), [P, S], _wall_faces(False), bevel=0.008))
    walls.append(B("cell_wall_b_r", (sx + sw / 2, y0, sz), (CX, y1, sz + sh), [P, S], _wall_faces(False), bevel=0.008))
    # wall-top caps: thin plates of the same raw section on the three tops, a separate object so only the graze
    # light reaches them (from far off they draw the box's outline as a fine bright line)
    caps = [B("cell_cap_l", (-CX - T, -CY, TOPZ), (-CX, CY + T, TOPZ + CAP), [S], bevel=0.001),
            B("cell_cap_r", (CX, -CY, TOPZ), (CX + T, CY + T, TOPZ + CAP), [S], bevel=0.001),
            B("cell_cap_b", (-CX, y0, TOPZ), (CX, y1, TOPZ + CAP), [S], bevel=0.001)]
    # the slot: five round bars set in the reveal (25 mm, 12 cm apart), a steel frame, the pane at the outer face
    for i in range(BARS):
        bx = sx - sw / 2 + sw * (i + 1) / (BARS + 1)
        me = bpy.data.meshes.new(f"cell_slot_bar{i}")
        bm = bmesh.new()
        zb0, zb1 = sz - SPLAY + 0.03, sz + sh + 0.012
        bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.0125, radius2=0.0125, depth=zb1 - zb0,
                              matrix=Matrix.Translation(o + Vector((bx, y0 + 0.08, (zb0 + zb1) / 2))))
        bm.to_mesh(me)
        bm.free()
        bar = _link(bpy.data.objects.new(me.name, me))
        me.materials.append(M["bar steel"])
        for p in me.polygons:
            p.use_smooth = True
        objs.append(bar)
    B("cell_slot_frame_low", (sx - sw / 2, y1 - 0.05, sz), (sx + sw / 2, y1 - 0.03, sz + 0.025), [M["bar steel"]],
      bevel=0.003)
    B("cell_slot_frame_top", (sx - sw / 2, y1 - 0.05, sz + sh - 0.025), (sx + sw / 2, y1 - 0.03, sz + sh),
      [M["bar steel"]], bevel=0.003)
    pane = frosted_glow("slot pane", (0.62, 0.74, 1.0), 2.0, top_z=sz + sh, sill_z=sz)
    glass = B("cell_slot_pane", (sx - sw / 2, y1 - 0.03, sz + 0.025), (sx + sw / 2, y1 - 0.02, sz + sh - 0.025),
              [pane], bevel=0.0)
    glass.visible_shadow = False       # the night comes through it (an emitter is opaque to light)
    # the night beyond the slot: a small lamp well behind it on the line through the slot to the patch, its cone
    # squashed to the slot, so the bars themselves lay the barred patch on the floor and cut a shaft through the haze
    mid, d = window_ray(ox, oy)
    half_w = sw / 2 + 0.06
    size = 2 * math.degrees(math.atan(half_w / WINDOW_DIST))
    li = spot("cell_window_light", tuple(mid - d * WINDOW_DIST), tuple(mid), WINDOW_W, size, 0.15, radius=0.05,
              colour=(0.6, 0.72, 1.0), scale=(1.0, 0.42))
    objs.append(li)
    return objs, dict(caps=caps, walls=walls, slab=slab, window=li)


def sloped_top(ob, y_in, drop):
    """Lower a block's top edge on its inner face by `drop`: a sill that slopes down into the cell, as a thick wall's
    high window has, so a steep light gets through the slot. The sloped face keeps the section material."""
    me = ob.data
    zt = max(v.co.z for v in me.vertices)
    for v in me.vertices:
        if abs(v.co.z - zt) < 1e-5 and abs(v.co.y - y_in) < 1e-5:
            v.co.z -= drop
    me.update()
    for p in me.polygons:
        p.material_index = 1 if p.normal.z > 0.3 else 0


def combo_unit(ox, oy, turn_deg=180.0):
    """A stainless toilet-basin combination unit, as cells have: a cabinet against the wall with a small basin in its
    top and a push button, the bowl on a pedestal in front. Built facing -Y, then turned; (ox, oy) is the back centre."""
    st = M["stainless"]
    parts = []

    def part(name, lo, hi, bevel, inset=None):
        lo, hi = Vector(lo), Vector(hi)
        me = bpy.data.meshes.new(name)
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((lo + hi) / 2) @ Matrix.Diagonal((*(hi - lo), 1)))
        if inset:
            # a recess: a flat rim, then the middle sunk with sloped sides (a basin, a bowl)
            th, depth = inset
            top = [f for f in bm.faces if f.normal.z > 0.5]
            bmesh.ops.inset_region(bm, faces=top, thickness=th, depth=0.0)
            bmesh.ops.inset_region(bm, faces=top, thickness=th * 0.6, depth=-depth)
        bm.to_mesh(me)
        bm.free()
        ob = _link(bpy.data.objects.new(name, me))
        me.materials.append(st)
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments = bevel, 3
        bv.limit_method = "ANGLE"
        ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
        for p in me.polygons:
            p.use_smooth = True
        parts.append(ob)
        return ob

    part("combo_cabinet", (-0.30, -0.27, 0.0), (0.30, 0.0, 0.94), 0.018, inset=(0.06, 0.07))
    part("combo_pedestal", (-0.15, -0.56, 0.0), (0.15, -0.26, 0.31), 0.03)
    # the bowl: an oval rim on the pedestal, its top sunk into a basin
    me = bpy.data.meshes.new("combo_bowl")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=28, radius1=1.0, radius2=1.0, depth=1.0,
                          matrix=Matrix.Translation((0.0, -0.44, 0.355)) @ Matrix.Diagonal((0.2, 0.235, 0.1, 1.0)))
    top = [f for f in bm.faces if f.normal.z > 0.5]
    bmesh.ops.inset_region(bm, faces=top, thickness=0.035, depth=0.0)
    bmesh.ops.inset_region(bm, faces=top, thickness=0.05, depth=-0.11)
    bm.to_mesh(me)
    bm.free()
    bowl = _link(bpy.data.objects.new("combo_bowl", me))
    me.materials.append(st)
    bv = bowl.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = 0.012, 3, "ANGLE"
    bowl.modifiers.new("smooth", "WEIGHTED_NORMAL")
    for p in me.polygons:
        p.use_smooth = True
    parts.append(bowl)
    # the button: a short cylinder on the cabinet face
    me = bpy.data.meshes.new("combo_button")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=0.022, radius2=0.02, depth=0.012,
                          matrix=Matrix.Translation((0.16, -0.276, 0.82)) @ Matrix.Rotation(math.radians(90), 4, "X"))
    bm.to_mesh(me)
    bm.free()
    btn = _link(bpy.data.objects.new("combo_button", me))
    me.materials.append(st)
    for p in me.polygons:
        p.use_smooth = True
    parts.append(btn)
    # the basin's tap: a small spout from the cabinet top's back edge
    me = bpy.data.meshes.new("combo_tap")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.012, radius2=0.012, depth=0.07,
                          matrix=Matrix.Translation((0.0, -0.07, 0.94 + 0.035)))
    bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.01, radius2=0.01, depth=0.06,
                          matrix=Matrix.Translation((0.0, -0.1, 0.995)) @ Matrix.Rotation(math.radians(90), 4, "X"))
    bm.to_mesh(me)
    bm.free()
    tap = _link(bpy.data.objects.new("combo_tap", me))
    me.materials.append(st)
    for p in me.polygons:
        p.use_smooth = True
    parts.append(tap)
    holder = _link(bpy.data.objects.new("combo_unit", None))
    for p in parts:
        p.parent = holder
    holder.location = (ox, oy, SLAB)
    holder.rotation_euler = (0, 0, math.radians(turn_deg))
    return [holder] + parts


def tune_prop(mat, spec=None, ceiling=None):
    """Cut a generated prop's plastic sheen (spec) and cap its base colour per channel (pale moulded bits go
    gunmetal), as the inspection room does."""
    if not (mat and mat.use_nodes):
        return
    nt = mat.node_tree
    b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if b is None:
        return
    if spec is not None:
        b.inputs["Specular IOR Level"].default_value = spec
    if "Coat Weight" in b.inputs:
        b.inputs["Coat Weight"].default_value = 0.0
    if ceiling and b.inputs["Base Color"].is_linked:
        src = b.inputs["Base Color"].links[0].from_socket
        dk = _n(nt, "ShaderNodeMix", data_type="RGBA", blend_type="DARKEN")
        _in(dk, "Factor").default_value = 1.0
        _in(dk, "B").default_value = (*ceiling, 1.0)
        nt.links.new(src, _in(dk, "A"))
        nt.links.new(_out(dk, "Result"), b.inputs["Base Color"])
