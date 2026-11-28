"""The night city outside the Hong Kong hotel window (Ch 03 / Ch 04), procedural: no real building, no text.

    import hotel_room_city as city
    city.build()

Modelled on chicago_night_city's method (one mesh per layer, per-vertex building data read by a window-grid shader,
everything emissive and faded into haze by view distance, city objects hidden from diffuse and shadow rays) but
denser and more Hong Kong, and colder:

  * the near Kowloon district, y 25..1300 m: a tight grid of narrow streets packed with slender residential towers
    (punched windows, air-conditioner boxes, cool fluorescent and some warm lit rooms) and older tenements, two near
    towers that rise past the window and frame it, a main avenue running away to the left of centre lined with
    projecting signboards (blank glowing colour panels standing out over the street, the city's signage read by shape
    and glow alone), lit rooftop sign frames (blank panels) on a few roofs, street light and traffic;
  * the harbour, y 1300..2550: dark water that mirrors the far shore;
  * the far shore, y 2550..3350: a skyline of office towers, some with blank LED strips at their corners and crowns;
  * the ridge behind, y 3350..7000: a dark hill silhouette with towers climbing its lower slopes and road lights
    winding across it, under an overcast sky lit from below, blue-grey (colder than the Chicago sky).

The hotel's floor is z = 0; the street is GROUND (about the 27th floor). The window looks along +Y.
"""
import math
import random

import bpy  # noqa: F401  (first)
import numpy as np

GROUND = -82.0
SEA = GROUND - 2.5
FOG_D = 2600.0
FOG_BUILDINGS = 700.0
# levels for the stage exposure (-1.4 .. -1.6, AgX): about twice Chicago's (tuned at -0.5)
K = 2.0
# The same violet and cool-blue tubing seen from street level.
VIOLET_SIGN, BLUE_SIGN = (0.35, 0.10, 0.95), (0.15, 0.45, 1.0)
HORIZON = tuple(v * K for v in (0.062, 0.072, 0.092))     # the haze lit by the city: cool, a faint lift
BUILDING_FOG = tuple(v * K for v in (0.026, 0.032, 0.044))
SKY_TOP = tuple(v * K for v in (0.004, 0.0055, 0.01))
AVENUE = (-100.0, 200.0, math.radians(-4.3))               # a point on the main avenue and its heading from +Y
NEAR = ((14.0, 84.0, 24.0, 20.0, 152.0), (74.0, 118.0, 22.0, 20.0, 128.0))   # framing towers: x, y, w, d, h
_RNG = random.Random(7)


# ---------------------------------------------------------------- mesh plumbing (as chicago_night_city)

def _link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def fast_mesh(name, verts, polys, k):
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(verts))
    me.vertices.foreach_set("co", np.ascontiguousarray(verts, dtype=np.float32).ravel())
    loops = np.ascontiguousarray(polys, dtype=np.int32).ravel()
    me.loops.add(len(loops))
    me.loops.foreach_set("vertex_index", loops)
    me.polygons.add(len(polys))
    me.polygons.foreach_set("loop_start", np.arange(0, len(loops), k, dtype=np.int32))
    try:
        me.polygons.foreach_set("loop_total", np.full(len(polys), k, dtype=np.int32))
    except (AttributeError, TypeError, RuntimeError):
        pass
    me.update(calc_edges=True)
    return me


def point_attr(me, name, arr):
    a = me.attributes.new(name, "FLOAT_VECTOR", "POINT")
    a.data.foreach_set("vector", np.ascontiguousarray(arr, dtype=np.float32).ravel())


def point_colour(me, name, arr):
    a = me.color_attributes.new(name, "FLOAT_COLOR", "POINT")
    rgba = np.ones((len(arr), 4), dtype=np.float32)
    rgba[:, :arr.shape[1]] = arr
    a.data.foreach_set("color", rgba.ravel())


_BOX_F = np.array([(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])


def boxes(lo, hi, rot=None):
    """(8n, 3) verts, (6n, 4) faces, (8n, 3) local coords for n boxes; rot: optional heading per box (radians about
    Z, about the box centre)."""
    lo, hi = np.asarray(lo, float), np.asarray(hi, float)
    n = len(lo)
    sel = np.array([(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0), (0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)], float)
    lco = sel[None, :, :] * (hi - lo)[:, None, :]
    v = lo[:, None, :] + lco
    if rot is not None:
        c = (lo + hi) / 2
        a = np.asarray(rot, float)[:, None]
        dx, dy = v[:, :, 0] - c[:, None, 0], v[:, :, 1] - c[:, None, 1]
        v = v.copy()
        v[:, :, 0] = c[:, None, 0] + dx * np.cos(a) - dy * np.sin(a)
        v[:, :, 1] = c[:, None, 1] + dx * np.sin(a) + dy * np.cos(a)
    f = _BOX_F[None, :, :] + 8 * np.arange(n)[:, None, None]
    return v.reshape(-1, 3), f.reshape(-1, 4), lco.reshape(-1, 3)


def octahedra(centres, radii):
    c = np.asarray(centres, float)
    r = np.asarray(radii, float)[:, None]
    dirs = np.array([(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)], float)
    v = c[:, None, :] + dirs[None, :, :] * r[:, None, :]
    tri = np.array([(0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4), (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)])
    f = tri[None, :, :] + 6 * np.arange(len(c))[:, None, None]
    return v.reshape(-1, 3), f.reshape(-1, 3)


def _city_object(ob):
    ob.visible_diffuse = False
    ob.visible_shadow = False
    ob.visible_volume_scatter = False
    return ob


# ---------------------------------------------------------------- shader plumbing

class N:
    def __init__(self, nt):
        self.nt = nt

    def _in(self, sock, v):
        if isinstance(v, (int, float)):
            sock.default_value = v
        elif isinstance(v, tuple):
            sock.default_value = v if len(v) == len(sock.default_value) else (*v, 1.0)
        else:
            self.nt.links.new(v, sock)

    def math(self, op, a, b=0.0, clamp=False):
        n = self.nt.nodes.new("ShaderNodeMath")
        n.operation, n.use_clamp = op, clamp
        self._in(n.inputs[0], a)
        self._in(n.inputs[1], b)
        return n.outputs[0]

    def add(self, a, b):
        return self.math("ADD", a, b)

    def mul(self, a, b):
        return self.math("MULTIPLY", a, b)

    def gt(self, a, b):
        return self.math("GREATER_THAN", a, b)

    def lt(self, a, b):
        return self.math("LESS_THAN", a, b)

    def comb(self, x, y, z):
        n = self.nt.nodes.new("ShaderNodeCombineXYZ")
        for i, v in enumerate((x, y, z)):
            self._in(n.inputs[i], v)
        return n.outputs[0]

    def sep(self, v):
        n = self.nt.nodes.new("ShaderNodeSeparateXYZ")
        self._in(n.inputs[0], v)
        return n.outputs

    def mixc(self, f, a, b):
        n = self.nt.nodes.new("ShaderNodeMix")
        n.data_type = "RGBA"
        self._in(n.inputs["Factor"], f)
        self._in(n.inputs["A"], a)
        self._in(n.inputs["B"], b)
        return n.outputs["Result"]

    def scale(self, colour, f):
        n = self.nt.nodes.new("ShaderNodeVectorMath")
        n.operation = "SCALE"
        self._in(n.inputs[0], colour)
        self._in(n.inputs["Scale"], f)
        return n.outputs[0]

    def vadd(self, a, b):
        n = self.nt.nodes.new("ShaderNodeVectorMath")
        n.operation = "ADD"
        self._in(n.inputs[0], a)
        self._in(n.inputs[1], b)
        return n.outputs[0]

    def attr(self, name):
        n = self.nt.nodes.new("ShaderNodeAttribute")
        n.attribute_name = name
        return n

    def white(self, vec):
        n = self.nt.nodes.new("ShaderNodeTexWhiteNoise")
        n.noise_dimensions = "3D"
        self._in(n.inputs["Vector"], vec)
        return n


def _new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.cycles.emission_sampling = "NONE"
    return m, m.node_tree, N(m.node_tree)


def _fog_out(nt, nb, surface, fog_max=0.9, fog_d=FOG_D, colour=HORIZON):
    d = nt.nodes.new("ShaderNodeCameraData").outputs["View Distance"]
    f = nb.math("SUBTRACT", 1.0, nb.math("EXPONENT", nb.math("DIVIDE", nb.math("MULTIPLY", d, -1.0), fog_d)))
    f = nb.mul(f, fog_max)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*colour, 1)
    mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(f, mx.inputs[0])
    nt.links.new(surface, mx.inputs[1])
    nt.links.new(em.outputs[0], mx.inputs[2])
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    nt.links.new(mx.outputs[0], out.inputs["Surface"])
    return mx


def emission_mat(name, colour_attr=None, rgb=(1, 1, 1), strength=1.0, fog_max=0.9, fog_d=FOG_D):
    m, nt, nb = _new_mat(name)
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = nt.nodes.new("ShaderNodeEmission")
    if colour_attr:
        nt.links.new(nb.attr(colour_attr).outputs["Color"], em.inputs["Color"])
    else:
        em.inputs["Color"].default_value = (*rgb, 1)
    em.inputs["Strength"].default_value = strength * K
    _fog_out(nt, nb, em.outputs[0], fog_max, fog_d)
    return m


def building_mat():
    """Facades with a window grid. bdata = (random, kind, lit fraction): kind 0 residential tower (small punched
    windows on 2.9 m floors, air-conditioner boxes under many), 0.5 tenement, 1 office (bands on 3.8 m floors).
    bcrown = (height / 1000, LED flag, colour pick). The facades carry a faint emission of their own: the street's
    light washing up the lower floors and the sky glow above, so near towers keep their volume against the sky."""
    m, nt, nb = _new_mat("hk_buildings")
    b = nt.nodes["Principled BSDF"]
    lx, ly, lz = nb.sep(nb.attr("lco").outputs["Vector"])
    nx, ny, nz = nb.sep(nt.nodes.new("ShaderNodeNewGeometry").outputs["Normal"])
    ax, ay, az = (nb.math("ABSOLUTE", s) for s in (nx, ny, nz))
    h = nb.add(nb.mul(lx, ay), nb.mul(ly, ax))
    rnd, kind, litf = nb.sep(nb.attr("bdata").outputs["Vector"])
    top, led, csel = nb.sep(nb.attr("bcrown").outputs["Vector"])
    office = nb.gt(kind, 0.75)
    res = nb.lt(kind, 0.25)
    ten = nb.math("SUBTRACT", nb.math("SUBTRACT", 1.0, office), res)
    bay = nb.add(nb.add(1.35, nb.mul(0.9, nb.math("FRACT", nb.mul(rnd, 7.31)))), nb.mul(office, 0.4))
    flo = nb.add(2.9, nb.mul(0.9, office))
    u, v = nb.math("DIVIDE", h, bay), nb.math("DIVIDE", lz, flo)
    cu, cv = nb.math("FLOOR", u), nb.math("FLOOR", v)
    fu, fv = nb.math("FRACT", u), nb.math("FRACT", v)
    side = nb.math("SUBTRACT", 1.0, nb.gt(az, 0.5))
    # residential: a punched window in the middle of the bay; office: a near full-width band
    seed = nb.mul(rnd, 517.0)
    cell = nb.white(nb.comb(cu, cv, seed))
    c1 = cell.outputs["Value"]
    c2 = nb.sep(cell.outputs["Color"])
    # Window width follows the apartment stack. Some rooms also have blinds
    # lowered below the lintel, knocking holes in the grid of lit windows.
    stack = nb.white(nb.comb(cu, 0.0, seed)).outputs["Value"]
    jamb = nb.add(0.10, nb.mul(nb.add(0.09, nb.mul(stack, 0.13)), res))
    m_u = nb.mul(nb.gt(fu, jamb), nb.lt(fu, nb.math("SUBTRACT", 1.0, jamb)))
    blind = nb.mul(nb.mul(c2[1], 0.21), nb.lt(c2[2], 0.32))
    head = nb.math("SUBTRACT", nb.math("SUBTRACT", 0.88, nb.mul(0.08, res)), blind)
    m_v = nb.mul(nb.gt(fv, nb.add(0.30, nb.mul(0.04, res))), nb.lt(fv, head))
    mask = nb.mul(nb.mul(nb.mul(m_u, m_v), side), nb.gt(lz, 5.5))
    lit = nb.lt(c1, litf)
    bright = nb.add(0.3, nb.mul(0.7, c2[0]))
    cool, warm, tv, green = (0.70, 0.86, 1.0), (1.0, 0.70, 0.42), (0.38, 0.52, 1.0), (0.72, 1.0, 0.82)
    col = nb.mixc(nb.lt(c2[1], 0.42), cool, warm)                      # HK homes: more cool fluorescent than warm
    col = nb.mixc(nb.mul(nb.lt(c2[1], 0.48), nb.gt(c2[1], 0.42)), col, green)
    col = nb.mixc(nb.lt(c2[2], 0.05), col, tv)
    col = nb.mixc(office, col, (0.82, 0.9, 1.0))
    # a curtain drawn across part of some lit windows (a soft dimmer half), so the grid is not a pixel pattern
    curtain = nb.add(0.45, nb.mul(0.55, nb.gt(nb.math("FRACT", nb.add(nb.mul(c2[1], 9.0), fu)), nb.mul(c2[2], 0.8))))
    emit = nb.scale(col, nb.mul(nb.mul(nb.mul(nb.mul(mask, lit), bright), curtain), 2.5 * K))
    # unlit glass catches the sky: a faint cool cell
    unlit = nb.mul(mask, nb.math("SUBTRACT", 1.0, lit))
    emit = nb.vadd(emit, nb.scale((0.5, 0.58, 0.75), nb.mul(unlit, nb.mul(K, nb.add(0.008, nb.mul(0.01, c2[0]))))))
    # air-conditioner boxes under residential windows: a grey block just below the sill in most bays, lit by the
    # windows' spill (lighter when its room is lit)
    acu = nb.mul(nb.gt(fu, 0.3), nb.lt(fu, 0.7))
    acv = nb.mul(nb.gt(fv, 0.06), nb.lt(fv, 0.24))
    ac = nb.mul(nb.mul(nb.mul(acu, acv), nb.mul(side, nb.add(res, nb.mul(ten, 0.6)))), nb.gt(c2[2], 0.35))
    emit = nb.vadd(emit, nb.scale((0.6, 0.62, 0.66), nb.mul(ac, nb.mul(K, nb.add(0.012, nb.mul(lit, 0.05))))))
    # the facade's own faint light: street glow washing up (warm-neon mix) for 40 m, sky glow above
    up = nb.math("SUBTRACT", 1.0, nb.math("DIVIDE", lz, 45.0), clamp=True)
    wash = nb.mixc(nb.math("FRACT", nb.mul(rnd, 3.7)), (1.0, 0.62, 0.4), (0.62, 0.8, 1.0))
    emit = nb.vadd(emit, nb.scale(wash, nb.mul(nb.mul(side, nb.mul(up, up)), 0.05 * K)))
    emit = nb.vadd(emit, nb.scale((0.42, 0.48, 0.6), nb.mul(side, 0.0045 * K)))
    # Parapets catch the ambient city glow above the darker roof membranes.
    width, depth, _ = nb.sep(nb.attr("extent").outputs["Vector"])
    ex = nb.math("MINIMUM", lx, nb.math("SUBTRACT", width, lx))
    ey = nb.math("MINIMUM", ly, nb.math("SUBTRACT", depth, ly))
    lip = nb.lt(nb.math("MINIMUM", ex, ey), 0.6)
    roof = nb.gt(nz, 0.5)
    roof_light = nb.mul(roof, nb.add(0.004 * K, nb.mul(lip, 0.010 * K)))
    emit = nb.vadd(emit, nb.scale((0.42, 0.48, 0.60), roof_light))
    street = nb.math("SUBTRACT", 1.0, nb.math("DIVIDE", lz, 27.0), clamp=True)
    emit = nb.vadd(emit, nb.scale((1.0, 0.55, 0.30), nb.mul(nb.mul(street, side), 0.18 * K)))
    # LED strips on a few far towers: a narrow vertical strip at each corner and a band under the roof (blank)
    tz = nb.mul(top, 1000.0)
    band = nb.mul(nb.gt(lz, nb.math("SUBTRACT", tz, 6.0)), nb.lt(lz, nb.math("SUBTRACT", tz, 3.5)))
    ledc = nb.mixc(csel, (0.45, 0.85, 1.0), (0.85, 0.9, 1.0))
    emit = nb.vadd(emit, nb.scale(ledc, nb.mul(nb.mul(nb.mul(band, led), side), 1.6 * K)))
    nt.links.new(emit, b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = 1.0
    nt.links.new(nb.mixc(office, (0.03, 0.03, 0.032), (0.012, 0.015, 0.02)), b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.35
    b.inputs["Specular IOR Level"].default_value = 0.35
    _fog_out(nt, nb, b.outputs[0], 0.82, fog_d=FOG_BUILDINGS, colour=BUILDING_FOG)
    return m


def sign_mat():
    """Projecting and rooftop signboards: blank glowing panels. A brighter neon border (an inset rim), a softer field,
    a dark edge band; no letters, no figures. Colour per sign from the `col` attribute."""
    m, nt, nb = _new_mat("hk_signs")
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    lx, ly, lz = nb.sep(nb.attr("lco").outputs["Vector"])
    sx, sy, sz = nb.sep(nb.attr("ssize").outputs["Vector"])
    col = nb.attr("col").outputs["Color"]
    # the panel face spans its two largest dimensions; distance to the nearest edge on the face (in metres)
    ex = nb.math("MINIMUM", lx, nb.math("SUBTRACT", sx, lx))
    ey = nb.math("MINIMUM", ly, nb.math("SUBTRACT", sy, ly))
    ez = nb.math("MINIMUM", lz, nb.math("SUBTRACT", sz, lz))
    wide = nb.math("MAXIMUM", ex, ey)
    d = nb.math("MINIMUM", wide, ez)
    rim = nb.mul(nb.gt(d, 0.12), nb.lt(d, 0.3))
    field = nb.gt(d, 0.3)
    f = nb.add(nb.mul(rim, 1.0), nb.mul(field, 0.42))
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(col, em.inputs["Color"])
    nt.links.new(nb.mul(f, 5.0 * K), em.inputs["Strength"])
    _fog_out(nt, nb, em.outputs[0], 0.85, FOG_D)
    return m


def sky_mat():
    m, nt, nb = _new_mat("hk_sky")
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    vn = nt.nodes.new("ShaderNodeVectorMath")
    vn.operation = "NORMALIZE"
    nt.links.new(tc.outputs["Object"], vn.inputs[0])
    e = nb.sep(vn.outputs[0])[2]
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.interpolation = "EASE"
    cr.elements[0].position, cr.elements[0].color = 0.0, (*HORIZON, 1)
    cr.elements[1].position, cr.elements[1].color = 1.0, (*SKY_TOP, 1)
    for pos, c in ((0.04, (0.052, 0.06, 0.078)), (0.12, (0.032, 0.038, 0.052)), (0.3, (0.014, 0.017, 0.026)),
                   (0.55, (0.007, 0.009, 0.015))):
        el = cr.elements.new(pos)
        el.color = (*(v * K for v in c), 1)
    nt.links.new(nb.math("MAXIMUM", e, 0.0), ramp.inputs["Fac"])
    # low overcast lit from below: broken streaks, strongest a little above the horizon
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.3, 1.3, 5.0)
    nt.links.new(vn.outputs[0], mp.inputs["Vector"])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 3.6
    nz.inputs["Detail"].default_value = 7.0
    nz.inputs["Roughness"].default_value = 0.62
    nt.links.new(mp.outputs[0], nz.inputs["Vector"])
    cloud = nb.math("MULTIPLY", nb.math("MAXIMUM", nb.math("SUBTRACT", nz.outputs["Fac"], 0.46), 0.0), 3.0, clamp=True)
    env = nb.mul(nb.gt(e, 0.01), nb.math("SUBTRACT", 1.0, nb.math("DIVIDE", e, 0.5), clamp=True))
    lift = nb.add(1.0, nb.mul(nb.mul(cloud, env), 1.1))
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(nb.scale(ramp.outputs["Color"], lift), em.inputs["Color"])
    nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def ground_mat():
    m, nt, nb = _new_mat("hk_ground")
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.006, 0.006, 0.007, 1)
    b.inputs["Emission Color"].default_value = (0.9, 0.75, 0.6, 1)
    b.inputs["Emission Strength"].default_value = 0.004 * K
    _fog_out(nt, nb, b.outputs[0], 0.9)
    return m


def water_mat():
    """The harbour: near-black water, a wind ripple that stretches the far shore's lights into vertical streaks."""
    m, nt, nb = _new_mat("hk_water")
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.004, 0.005, 0.006, 1)
    b.inputs["Roughness"].default_value = 0.06
    b.inputs["Specular IOR Level"].default_value = 0.5
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (0.02, 0.12, 1.0)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 6.0
    nz.inputs["Detail"].default_value = 6.0
    nt.links.new(mp.outputs[0], nz.inputs["Vector"])
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.35
    nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    _fog_out(nt, nb, b.outputs[0], 0.75)
    return m


def ridge_mat():
    m, nt, nb = _new_mat("hk_ridge")
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.004, 0.005, 0.005, 1)
    b.inputs["Roughness"].default_value = 0.95
    # the hill is a silhouette darker than the sky behind it: its fog colour sits under the horizon glow
    _fog_out(nt, nb, b.outputs[0], 0.7, 4200.0, tuple(v * 0.55 for v in HORIZON))
    return m


# ---------------------------------------------------------------- layout

def in_fan(x, y, margin=0.0):
    return 20.0 <= y and (-1.35 * y - 260 - margin) <= x <= (0.95 * y + 260 + margin)


def _ave(x, y):
    """Distance from the main avenue's centre line, and the distance along it."""
    x0, y0, a = AVENUE
    d = (math.sin(a), math.cos(a))
    dx, dy = x - x0, y - y0
    return abs(dx * d[1] - dy * d[0]), dx * d[0] + dy * d[1]


def ridge_height(x):
    """Ridge crest height (above sea) along x, and its distance."""
    return 330.0 + 120.0 * math.sin(x / 1400.0 + 0.7) + 70.0 * math.sin(x / 520.0 + 2.1) + 30 * math.sin(x / 190.0)


def plan(seed=7):
    rng = random.Random(seed)
    lo, hi, data, crown = [], [], [], []

    def add(x0, y0, x1, y1, z0, h, kind, litf, led=0.0, csel=0.0):
        lo.append((x0, y0, z0))
        hi.append((x1, y1, z0 + h))
        data.append((rng.random(), kind, litf))
        crown.append(((z0 - GROUND + h) / 1000.0, led, csel))

    # Kowloon: blocks 64 x 44 m between 14 m streets (avenue 30 m), lots of 9-22 m frontage packed wall to wall
    for gx in np.arange(-1900.0, 1400.0, 78.0):
        for gy in np.arange(40.0, 1300.0, 58.0):
            bx0, by0, bx1, by1 = gx + 7, gy + 7, gx + 71, gy + 51
            cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
            if not in_fan(cx, cy, 80.0):
                continue
            if any(abs(cx - n[0]) < 60 and abs(cy - n[1]) < 50 for n in NEAR):
                continue
            x = bx0
            while x < bx1 - 6:
                w = rng.uniform(9, 22)
                x1 = min(bx1, x + w)
                rows = [(by0, by1)] if rng.random() < 0.35 else [(by0, (by0 + by1) / 2 - 1), ((by0 + by1) / 2 + 1, by1)]
                for (y0, y1) in rows:
                    px, py = (x + x1) / 2, (y0 + y1) / 2
                    da, _ = _ave(px, py)
                    if da < 15:
                        continue
                    r = rng.random()
                    if r < 0.32:          # an old tenement
                        h, kind = rng.uniform(18, 42), 0.5
                    elif r < 0.9:         # a residential tower
                        h, kind = rng.lognormvariate(math.log(78), 0.32), 0.0
                    else:                 # a commercial building
                        h, kind = rng.uniform(40, 110), 1.0
                    if py < 260 and abs(px) < 150:
                        h = min(h, 70.0)  # the street below the window stays open to the eye
                    litf = rng.uniform(0.2, 0.42) if kind < 0.75 else rng.uniform(0.15, 0.3)
                    add(x + 0.6, y0, x1 - 0.6, y1, GROUND, h, kind, litf)
                    if h > 50 and rng.random() < 0.5:   # roof plant and a water tank
                        add(px - 3, py - 2.5, px + 3, py + 2.5, GROUND + h, rng.uniform(2.5, 4.5), 0.5, 0.0)
                x = x1
    # the two near towers that rise past the window and frame it
    for (x, y, w, d, h) in NEAR:
        add(x - w / 2, y - d / 2, x + w / 2, y + d / 2, GROUND, h, 0.0, 0.36)
        add(x - w * 0.24, y - d * 0.22, x - w * 0.06, y + d * 0.19, GROUND + h, 2.7, 0.5, 0.0)
        add(x + w * 0.02, y + d * 0.05, x + w * 0.27, y + d * 0.19, GROUND + h, 1.3, 0.5, 0.0)
    # the far shore: an office skyline packed along the waterfront, taller toward the middle
    for gx in np.arange(-5200.0, 3400.0, 62.0):
        for gy in (2580.0, 2650.0, 2720.0, 2800.0, 2890.0, 2990.0, 3100.0, 3210.0):
            if rng.random() < 0.18:
                continue
            cx = gx + rng.uniform(-8, 8)
            k = math.exp(-((cx + 350.0) / 1500.0) ** 2)
            h = rng.lognormvariate(math.log(70 + 170 * k), 0.38)
            if rng.random() < 0.06 * (0.3 + k):
                h = rng.uniform(260, 400)
            w, dd = rng.uniform(26, 48), rng.uniform(24, 40)
            office = rng.random() < 0.55 + 0.3 * k
            led = 1.0 if (office and h > 160 and rng.random() < 0.35) else 0.0
            add(cx - w / 2, gy, cx + w / 2, gy + dd, SEA, h, 1.0 if office else 0.0,
                rng.uniform(0.16, 0.3) if office else rng.uniform(0.25, 0.4), led, rng.random())
    # towers climbing the ridge's lower slopes (the mid-levels), standing on the terrain
    for i in range(260):
        x = rng.uniform(-5600, 3200)
        y = rng.uniform(3330, 3800)
        z0 = SEA + terrain(x, y)
        h = rng.uniform(40, 120)
        w = rng.uniform(18, 34)
        add(x - w / 2, y - w / 2, x + w / 2, y + w / 2, z0 - 4, h, 0.0, rng.uniform(0.22, 0.4))
    return np.array(lo), np.array(hi), np.array(data), np.array(crown)


def terrain(x, y):
    """Height above sea of the ridge at (x, y): rising from the shore (y 3300) to the crest (~y 4600)."""
    crest = ridge_height(x)
    t = (y - 3300.0) / 1300.0
    s = max(0.0, min(1.0, t))
    base = crest * (s ** 1.25) if t <= 1.0 else crest * max(0.0, 1.0 - 0.6 * (t - 1.0))
    return base + 12 * math.sin(x / 90.0) * math.sin(y / 70.0)


def signs(seed=13):
    """Projecting signboards along the avenue and a few cross streets; rooftop sign frames. (lo, hi, rot, colour,
    size) per sign."""
    rng = random.Random(seed)
    pal = [VIOLET_SIGN, BLUE_SIGN, (0.25, 0.85, 1.0), (1.0, 0.55, 0.12), (0.92, 0.94, 1.0),
           (0.35, 1.0, 0.55), (0.75, 0.3, 1.0), (1.0, 0.85, 0.35)]
    lo, hi, rot, col, size = [], [], [], [], []
    x0, y0, a = AVENUE
    d = np.array((math.sin(a), math.cos(a)))
    nrm = np.array((d[1], -d[0]))
    t = -220.0
    while t < 1600.0:
        for s in (-1, 1):
            if rng.random() < 0.82:
                p = np.array((x0, y0)) + d * t + nrm * s * rng.uniform(13.5, 15.0)
                # a vertical panel standing out over the street: thin along the street, wide across it
                wdt, hgt, th = rng.uniform(1.4, 4.5), rng.uniform(3.0, 11.0), 0.4
                z = GROUND + rng.uniform(4.5, 22.0)
                c = rng.choice(pal)
                k = rng.uniform(0.55, 1.0)
                pc = p - nrm * s * (wdt / 2)
                lo.append((pc[0] - th / 2, pc[1] - wdt / 2, z))
                hi.append((pc[0] + th / 2, pc[1] + wdt / 2, z + hgt))
                rot.append(-a)
                col.append(tuple(v * k for v in c))
                size.append((th, wdt, hgt))
        t += rng.uniform(5.0, 10.0)
    # a few cross streets with sparser signs (their streets run along X)
    for yy in (330.0, 504.0, 678.0, 910.0):
        for x in np.arange(-700.0, 300.0, rng.uniform(9, 14)):
            if rng.random() < 0.4 or not in_fan(x, yy):
                continue
            s = rng.choice((-1, 1))
            wdt, hgt = rng.uniform(1.2, 3.5), rng.uniform(2.5, 7.0)
            z = GROUND + rng.uniform(4.0, 16.0)
            yc = yy + s * 5.5
            lo.append((x - 0.2, yc - wdt / 2, z))
            hi.append((x + 0.2, yc + wdt / 2, z + hgt))
            rot.append(0.0)
            c = rng.choice(pal)
            col.append(tuple(v * rng.uniform(0.45, 0.85) for v in c))
            size.append((0.4, wdt, hgt))
    return lo, hi, rot, col, size


def rooftop_signs(b_lo, b_hi, b_data, seed=21):
    """Lit sign frames on a few roofs: a blank panel facing the hotel on a dark steel frame."""
    rng = random.Random(seed)
    lo, hi, rot, col, size = [], [], [], [], []
    frame_lo, frame_hi = [], []
    pal = [(0.92, 0.95, 1.0), (0.3, 0.85, 1.0), VIOLET_SIGN, (0.4, 1.0, 0.7)]
    idx = [i for i in range(len(b_lo)) if 200 < b_lo[i][1] < 1250 and b_hi[i][2] - b_lo[i][2] > 35 and
           b_data[i][1] < 0.6 and (b_hi[i][0] - b_lo[i][0]) > 12 and in_view(b_lo[i][0], b_lo[i][1])]
    rng.shuffle(idx)
    for i in idx[:48]:
        x0, y0, z0 = b_lo[i]
        x1, y1, z1 = b_hi[i]
        w = min(x1 - x0 - 2, rng.uniform(9, 16))
        hgt = rng.uniform(3.5, 6.0)
        xc = (x0 + x1) / 2
        lo.append((xc - w / 2, y0 + 1.0, z1 + 2.2))
        hi.append((xc + w / 2, y0 + 1.5, z1 + 2.2 + hgt))
        rot.append(0.0)
        # The broad near sign faces sit below the light on Dawn at the window.
        radiance = 0.52 if y0 + 1.0 < 520.0 else 0.82
        col.append(tuple(v * rng.uniform(0.6, 1.0) * radiance for v in rng.choice(pal)))
        size.append((w, 0.5, hgt))
        for sx in (xc - w / 2 + 0.3, xc + w / 2 - 0.6):
            frame_lo.append((sx, y0 + 1.6, z1))
            frame_hi.append((sx + 0.3, y0 + 1.9, z1 + 2.2 + hgt))
    return (lo, hi, rot, col, size), (frame_lo, frame_hi)


def in_view(x, y, margin=0.0):
    """Inside the window shot's view through the glass (the camera at (1.3, -2.2) sees headings -25..+2 degrees)."""
    return 1.3 + (y + 2.2) * math.tan(math.radians(-27.0)) - margin <= x <= 1.3 + (y + 2.2) * math.tan(math.radians(4.0)) + margin


def facade_signs(b_lo, b_hi, b_data, seed=31):
    """Blank vertical signboards fixed high on the fronts (the -Y faces, toward the hotel) of buildings in the
    window's view: the signage of a dense city read from above by shape and glow alone."""
    rng = random.Random(seed)
    pal = [VIOLET_SIGN, BLUE_SIGN, (0.3, 0.85, 1.0), (1.0, 0.58, 0.16), (0.9, 0.93, 1.0),
           (0.4, 1.0, 0.6), (1.0, 0.85, 0.4)]
    lo, hi, rot, col, size = [], [], [], [], []
    for i in range(len(b_lo)):
        x0, y0, z0 = b_lo[i]
        x1, y1, z1 = b_hi[i]
        h = z1 - z0
        if not (280 < y0 < 1300 and h > 28 and (x1 - x0) > 9 and in_view((x0 + x1) / 2, y0)) or rng.random() > 0.2:
            continue
        w = rng.uniform(2.2, min(5.0, x1 - x0 - 1.0))
        sh = rng.uniform(7.0, min(24.0, h - 12.0))
        zb = z0 + rng.uniform(8.0, max(8.5, h - sh - 4.0))
        xc = rng.choice((x0 + w / 2 + 0.4, x1 - w / 2 - 0.4, (x0 + x1) / 2))
        lo.append((xc - w / 2, y0 - 0.7, zb))
        hi.append((xc + w / 2, y0 - 0.1, zb + sh))
        rot.append(0.0)
        col.append(tuple(v * rng.uniform(0.5, 0.95) for v in rng.choice(pal)))
        size.append((w, 0.6, sh))
    return lo, hi, rot, col, size


def streets(seed=5):
    """Street-light points and road-glow strips for the Kowloon grid and the avenue; road lights on the ridge."""
    rng = random.Random(seed)
    pts, rad, col = [], [], []
    s_lo, s_hi, s_c, s_rot = [], [], [], []
    sodium, led = (1.0, 0.64, 0.34), (0.82, 0.9, 1.0)

    def light(x, y, z, c, k=1.0):
        pts.append((x, y, z))
        rad.append((0.45 + math.hypot(x, y) * 0.0005) * k)
        col.append(c)

    for gx in np.arange(-1900.0, 1400.0, 78.0):
        y0 = 40.0
        c = led if rng.random() < 0.55 else sodium
        y = y0
        while y < 1300:
            if in_fan(gx, y):
                light(gx + 3.5, y, GROUND + 8.0, c)
            y += 26.0
        s_lo.append((gx - 3.5, 40.0, GROUND + 0.1))
        s_hi.append((gx + 3.5, 1300.0, GROUND + 0.2))
        s_c.append(tuple(v * 0.30 for v in c))
        s_rot.append(0.0)
    for gy in np.arange(40.0, 1300.0, 58.0):
        c = led if rng.random() < 0.5 else sodium
        x = -1.35 * gy - 260
        while x < 0.95 * gy + 260:
            light(x, gy + 3.5, GROUND + 8.0, c)
            x += 28.0
        s_lo.append((-1.35 * gy - 260, gy - 3.5, GROUND + 0.1))
        s_hi.append((0.95 * gy + 260, gy + 3.5, GROUND + 0.2))
        s_c.append(tuple(v * 0.06 for v in c))
        s_rot.append(0.0)
    # the avenue: a bright road under LED lights, denser
    x0, y0, a = AVENUE
    d = np.array((math.sin(a), math.cos(a)))
    nrm = np.array((d[1], -d[0]))
    t = -260.0
    while t < 1700:
        for s in (-1, 1):
            p = np.array((x0, y0)) + d * t + nrm * s * 10.5
            light(p[0], p[1], GROUND + 9.0, led, 1.3)
        t += 22.0
    c0 = np.array((x0, y0)) + d * 720.0
    s_lo.append((c0[0] - 12, c0[1] - 980, GROUND + 0.1))
    s_hi.append((c0[0] + 12, c0[1] + 980, GROUND + 0.25))
    s_c.append((0.16, 0.15, 0.15))
    s_rot.append(-a)
    # road lights winding across the ridge: three contour roads, sodium
    for zf, ph in ((0.35, 0.3), (0.6, 1.7), (0.85, 2.9)):
        x = -6000.0
        while x < 3500.0:
            yy = 3300.0 + 1300.0 * (zf ** 0.8) + 80.0 * math.sin(x / 300.0 + ph)
            light(x, yy, SEA + terrain(x, yy) + 6.0, sodium, 1.6)
            x += rng.uniform(35, 60)
    return (np.array(pts), np.array(rad), np.array(col)), (s_lo, s_hi, s_c, s_rot)


def traffic(seed=3):
    rng = random.Random(seed)
    lo, hi, col = [], [], []
    red, white = (0.16, 0.017, 0.009), (1.0, 0.93, 0.8)
    x0, y0, a = AVENUE
    d = np.array((math.sin(a), math.cos(a)))
    nrm = np.array((d[1], -d[0]))
    t = -240.0
    while t < 1650:
        lane = rng.choice((-7.5, -4.0, 4.0, 7.5))
        toward = lane < 0
        p = np.array((x0, y0)) + d * t + nrm * lane
        c, k = (white, 2.0) if toward else (red, 1.4)
        for s in (-0.7, 0.7):
            q = p + nrm * s
            lo.append((q[0] - 0.3, q[1] - 0.3, GROUND + 0.6))
            hi.append((q[0] + 0.3, q[1] + 0.3, GROUND + 1.0))
            col.append(tuple(v * k for v in c))
        t += rng.expovariate(1 / 9.0) + 4.0
    for gy in np.arange(40.0, 1300.0, 58.0 * 2):
        x = -1.35 * gy - 260
        while x < 0.95 * gy + 260:
            toward = rng.random() < 0.5
            c, k = (white, 1.8) if toward else (red, 1.3)
            for s in (-0.7, 0.7):
                lo.append((x + s - 0.3, gy + (-2 if toward else 2) - 0.3, GROUND + 0.6))
                hi.append((x + s + 0.3, gy + (-2 if toward else 2) + 0.3, GROUND + 1.0))
                col.append(tuple(v * k for v in c))
            x += rng.expovariate(1 / 50.0) + 6
    return np.array(lo), np.array(hi), np.array(col)


# ---------------------------------------------------------------- build

def _boxes_object(name, lo, hi, mat, rot=None, attrs=None, colours=None):
    v, f, lco = boxes(lo, hi, rot)
    me = fast_mesh(name, v, f, 4)
    point_attr(me, "lco", lco)
    for k, arr in (attrs or {}).items():
        point_attr(me, k, np.repeat(np.asarray(arr, float), 8, axis=0))
    if colours is not None:
        point_colour(me, "col", np.repeat(np.asarray(colours, float), 8, axis=0))
    ob = _city_object(_link(bpy.data.objects.new(name, me)))
    ob.data.materials.append(mat)
    return ob


def build():
    import bmesh
    me = bpy.data.meshes.new("hk_sky")
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=15000.0)
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    sky = _city_object(_link(bpy.data.objects.new("hk_sky", me)))
    sky.data.materials.append(sky_mat())

    # ground (Kowloon) and harbour
    _boxes_object("hk_ground", [(-16000.0, -3000.0, GROUND - 1.0)], [(16000.0, 1320.0, GROUND)], ground_mat())
    _boxes_object("hk_water", [(-16000.0, 1320.0, SEA - 1.0)], [(16000.0, 2600.0, SEA)], water_mat())
    _boxes_object("hk_shore", [(-16000.0, 2560.0, SEA - 1.0)], [(16000.0, 3340.0, SEA + 1.5)], ground_mat())

    # the ridge: a terrain grid behind the far shore
    xs = np.linspace(-9000.0, 6000.0, 151)
    ys = np.linspace(3300.0, 7200.0, 40)
    V = np.array([(x, y, SEA + terrain(x, y)) for y in ys for x in xs])
    nx = len(xs)
    F = np.array([(j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i)
                  for j in range(len(ys) - 1) for i in range(nx - 1)])
    rd = _city_object(_link(bpy.data.objects.new("hk_ridge", fast_mesh("hk_ridge", V, F, 4))))
    rd.data.materials.append(ridge_mat())

    lo, hi, data, crown = plan()
    _boxes_object("hk_buildings", lo, hi, building_mat(), attrs={"bdata": data, "bcrown": crown, "extent": hi - lo})

    s_lo, s_hi, s_rot, s_col, s_size = signs()
    (r_lo, r_hi, r_rot, r_col, r_size), (f_lo, f_hi) = rooftop_signs(lo, hi, data)
    a_lo, a_hi, a_rot, a_col, a_size = facade_signs(lo, hi, data)
    sm = sign_mat()
    _boxes_object("hk_signs", s_lo + r_lo + a_lo, s_hi + r_hi + a_hi, sm, rot=s_rot + r_rot + a_rot,
                  attrs={"ssize": s_size + r_size + a_size}, colours=s_col + r_col + a_col)
    if f_lo:
        frame_m, fnt, fnb = _new_mat("hk_sign_frames")
        fnt.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.01, 0.01, 0.01, 1)
        _boxes_object("hk_sign_frames", f_lo, f_hi, frame_m)

    (pts, rad, col), (st_lo, st_hi, st_c, st_rot) = streets()
    v, f = octahedra(pts, rad)
    me = fast_mesh("hk_streetlights", v, f, 3)
    point_colour(me, "col", np.repeat(col, 6, axis=0))
    sl = _city_object(_link(bpy.data.objects.new("hk_streetlights", me)))
    sl.data.materials.append(emission_mat("hk_streetlight", "col", strength=6.0, fog_max=0.85))
    _boxes_object("hk_roads", st_lo, st_hi, emission_mat("hk_road", "col", strength=1.0, fog_max=0.9), rot=st_rot,
                  colours=st_c)
    t_lo, t_hi, t_c = traffic()
    _boxes_object("hk_traffic", t_lo, t_hi, emission_mat("hk_trafficlight", "col", strength=3.0, fog_max=0.88),
                  colours=t_c)
    print(f"CITY HK {len(lo)} buildings, {len(s_lo)} street signs, {len(r_lo)} roof signs, {len(a_lo)} facade signs, "
          f"{len(pts)} street lights, "
          f"{len(t_lo)} car lights", flush=True)
