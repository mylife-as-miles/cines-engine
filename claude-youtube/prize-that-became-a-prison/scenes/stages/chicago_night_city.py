"""The night city outside the Chicago apartment window (Ch 01), built procedurally: no real building, no text.

    import chicago_night_city as city
    city.build()          # sky dome, ground, street lights, low-rise blocks, towers, a downtown cluster

The apartment's floor is z = 0; the street is GROUND (about the 19th floor). The window looks along +Y. The city is a
fan in front of it (x from -1.4 y to +0.9 y) on a Chicago-like grid (north-south streets every 200 m, cross streets
every 100 m, an arterial every 800 m, one diagonal avenue), with a cluster of towers to the left of straight ahead.

Every surface out here is emission plus a dark facade, faded with distance into the haze colour (Camera Data view
distance), so the far city sinks into the horizon glow. City objects are hidden from diffuse rays (they would only
add fireflies to the room); the room's cool window light is a controlled area light in chicago_night_set.
Buildings are one mesh: per-vertex attributes carry each building's local coordinates (`lco`) and its random,
kind (office / residential) and lit fraction (`bdata`), crown and height (`bcrown`), which the shader turns into a
window grid with lit cells, whole lit office floors and a few floodlit crowns.
"""
import math
import random

import bpy  # noqa: F401  (first)
import numpy as np

GROUND = -60.0
FOG_D = 2300.0
FOG_BUILDINGS = 1200.0             # buildings fade faster than lights, so near, mid and far layers separate
# Sky levels set for the camera exposures (-0.4 to -0.6, AgX) now that the camera sees past 1 km (clip_end 20 km):
# the horizon band lands near 70/255 raw, the sky behind Dawn's head about 30-45/255, the upper sky 12-20/255.
HORIZON = (0.104, 0.1, 0.108)      # the haze lit by the city, at the horizon (emission, linear): a faint sodium lift
BUILDING_FOG = (0.034, 0.038, 0.048)  # what far facades fade to: darker than the sky behind them, so towers stay silhouettes
SKY_TOP = (0.004, 0.005, 0.01)
DOWNTOWN = (-470.0, 1650.0)           # the tower cluster's centre: about 17 degrees left of straight out
UPTOWN = (700.0, 1700.0, 560.0, 0.62)  # a second, lower cluster to the right (x, y, radius, height factor)
_RNG = random.Random(11)


# ---------------------------------------------------------------- mesh plumbing

def _link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def fast_mesh(name, verts, polys, k):
    """A mesh from numpy arrays: verts (n, 3), polys (m, k) vertex indices."""
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


def point_attr(me, name, arr, kind="FLOAT_VECTOR"):
    a = me.attributes.new(name, kind, "POINT")
    a.data.foreach_set("vector", np.ascontiguousarray(arr, dtype=np.float32).ravel())


def point_colour(me, name, arr):
    a = me.color_attributes.new(name, "FLOAT_COLOR", "POINT")
    rgba = np.ones((len(arr), 4), dtype=np.float32)
    rgba[:, :arr.shape[1]] = arr
    a.data.foreach_set("color", rgba.ravel())


_BOX_F = np.array([(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])


def boxes(lo, hi):
    """(8n, 3) verts, (6n, 4) faces and (8n, 3) local coords for n axis-aligned boxes."""
    lo, hi = np.asarray(lo, float), np.asarray(hi, float)
    n = len(lo)
    sel = np.array([(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0), (0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)], float)
    v = lo[:, None, :] + sel[None, :, :] * (hi - lo)[:, None, :]
    lco = sel[None, :, :] * (hi - lo)[:, None, :]
    f = _BOX_F[None, :, :] + 8 * np.arange(n)[:, None, None]
    return v.reshape(-1, 3), f.reshape(-1, 4), lco.reshape(-1, 3)


def octahedra(centres, radii):
    c = np.asarray(centres, float)
    r = np.asarray(radii, float)[:, None]
    n = len(c)
    dirs = np.array([(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)], float)
    v = c[:, None, :] + dirs[None, :, :] * r[:, None, :]
    tri = np.array([(0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4), (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)])
    f = tri[None, :, :] + 6 * np.arange(n)[:, None, None]
    return v.reshape(-1, 3), f.reshape(-1, 3)


def _city_object(ob):
    """Seen by the camera, in reflections and through the glass; never lights the room by diffuse bounce."""
    ob.visible_diffuse = False
    ob.visible_shadow = False
    ob.visible_volume_scatter = False
    return ob


# ---------------------------------------------------------------- shader plumbing

class N:
    """Tiny node-expression helper: sockets or numbers in, sockets out."""

    def __init__(self, nt):
        self.nt = nt

    def _in(self, sock, v):
        if isinstance(v, (int, float)):
            sock.default_value = v
        elif isinstance(v, tuple):
            sock.default_value = v if len(v) == len(sock.default_value) else (*v, 1.0)
        else:
            self.nt.links.new(v, sock)

    def math(self, op, a, b=0.0, c=None, clamp=False):
        n = self.nt.nodes.new("ShaderNodeMath")
        n.operation, n.use_clamp = op, clamp
        self._in(n.inputs[0], a)
        self._in(n.inputs[1], b)
        if c is not None:
            self._in(n.inputs[2], c)
        return n.outputs[0]

    def add(self, a, b):
        return self.math("ADD", a, b)

    def mul(self, a, b):
        return self.math("MULTIPLY", a, b)

    def node(self, kind, **inputs):
        n = self.nt.nodes.new(kind)
        for k, v in inputs.items():
            self._in(n.inputs[k], v)
        return n

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
    """Mix a surface shader toward the haze emission by view distance."""
    cd = nt.nodes.new("ShaderNodeCameraData")
    d = cd.outputs["View Distance"]
    f = nb.math("SUBTRACT", 1.0, nb.math("EXPONENT", nb.math("DIVIDE", nb.math("MULTIPLY", d, -1.0), fog_d)))
    f = nb.mul(f, fog_max)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*colour, 1)
    em.inputs["Strength"].default_value = 1.0
    mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(f, mx.inputs[0])
    nt.links.new(surface, mx.inputs[1])
    nt.links.new(em.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return mx


def emission_mat(name, colour_attr=None, rgb=(1, 1, 1), strength=1.0, fog_max=0.9, fog_d=FOG_D):
    m, nt, nb = _new_mat(name)
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    em = nt.nodes.new("ShaderNodeEmission")
    if colour_attr:
        nt.links.new(nb.attr(colour_attr).outputs["Color"], em.inputs["Color"])
    else:
        em.inputs["Color"].default_value = (*rgb, 1)
    em.inputs["Strength"].default_value = strength
    _fog_out(nt, nb, em.outputs[0], fog_max, fog_d)
    return m


def building_mat():
    """Dark curtain-wall and masonry facades with a window grid; lit cells chosen per building."""
    m, nt, nb = _new_mat("city_buildings")
    b = nt.nodes["Principled BSDF"]
    lco = nb.attr("lco").outputs["Vector"]
    lx, ly, lz = nb.sep(lco)
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    nx, ny, nz = nb.sep(geo.outputs["Normal"])
    ax, ay, az = (nb.math("ABSOLUTE", s) for s in (nx, ny, nz))
    h = nb.add(nb.mul(lx, ay), nb.mul(ly, ax))
    bd = nb.sep(nb.attr("bdata").outputs["Vector"])
    rnd, kind, litf = bd[0], bd[1], bd[2]
    cdist = nt.nodes.new("ShaderNodeCameraData").outputs["View Distance"]
    litf = nb.mul(litf, nb.math("MAXIMUM", 0.3, nb.math("MINIMUM", 1.0, nb.math("DIVIDE", cdist, 700.0))))
    cr = nb.sep(nb.attr("bcrown").outputs["Vector"])
    top, crown, csel = cr[0], cr[1], cr[2]
    bay = nb.add(1.5, nb.mul(1.6, nb.math("FRACT", nb.mul(rnd, 7.31))))
    flo = nb.add(3.05, nb.mul(0.85, kind))
    u = nb.math("DIVIDE", h, bay)
    v = nb.math("DIVIDE", lz, flo)
    cu, cv = nb.math("FLOOR", u), nb.math("FLOOR", v)
    fu, fv = nb.math("FRACT", u), nb.math("FRACT", v)
    side = nb.math("SUBTRACT", 1.0, nb.math("GREATER_THAN", az, 0.5))
    res = nb.math("SUBTRACT", 1.0, kind)          # residential: punched windows, smaller than an office's band
    m_u = nb.mul(nb.math("GREATER_THAN", fu, nb.add(0.12, nb.mul(0.12, res))),
                 nb.math("LESS_THAN", fu, nb.math("SUBTRACT", 0.88, nb.mul(0.12, res))))
    m_v = nb.mul(nb.math("GREATER_THAN", fv, nb.add(0.28, nb.mul(-0.02, res))),
                 nb.math("LESS_THAN", fv, nb.math("SUBTRACT", 0.86, nb.mul(0.06, res))))
    mask = nb.mul(nb.mul(m_u, m_v), side)
    # no lit windows in the ground floor's height or above the roof's crown band
    mask = nb.mul(mask, nb.math("GREATER_THAN", lz, 4.0))
    seed = nb.mul(rnd, 517.0)
    cell = nb.white(nb.comb(cu, cv, seed))
    c1 = cell.outputs["Value"]
    c2 = nb.sep(cell.outputs["Color"])
    fl = nb.white(nb.comb(nb.mul(seed, 0.37), cv, 3.0)).outputs["Value"]
    lit_cell = nb.math("LESS_THAN", c1, litf)
    lit_floor = nb.mul(nb.math("LESS_THAN", fl, nb.mul(0.10, kind)), nb.math("SUBTRACT", 1.0, lit_cell))
    bright = nb.add(0.25, nb.mul(0.75, c2[0]))
    warm, cool, tv = (1.0, 0.70, 0.42), (0.74, 0.86, 1.0), (0.42, 0.55, 1.0)
    col = nb.mixc(kind, warm, cool)
    col = nb.mixc(nb.math("LESS_THAN", c2[1], 0.08), col, tv)
    col = nb.mixc(nb.mul(c2[2], 0.35), col, (0.95, 0.92, 0.85))
    emit = nb.scale(col, nb.mul(nb.mul(nb.mul(mask, lit_cell), bright), 3.6))
    # whole lit office floors: softer and warm-neutral, so they read as a lit floor, not a hard white plank
    emit = nb.vadd(emit, nb.scale((0.95, 0.85, 0.7), nb.mul(nb.mul(nb.mul(mask, lit_floor), bright), 1.5)))
    # unlit glass still catches the sky: a faint cool cell, so towers read as structure and not cut-outs
    unlit = nb.math("SUBTRACT", 1.0, nb.math("MAXIMUM", lit_cell, lit_floor))
    emit = nb.vadd(emit, nb.scale((0.55, 0.62, 0.8), nb.mul(nb.mul(mask, unlit), nb.add(0.006, nb.mul(0.006, c2[0])))))
    # floodlit crowns: the top 10 m of a few towers, a soft vertical gradient broken into vertical bays
    band = nb.math("GREATER_THAN", lz, nb.math("SUBTRACT", nb.mul(top, 1000.0), 10.0))
    fall = nb.math("SUBTRACT", 1.0, nb.math("DIVIDE", nb.math("SUBTRACT", nb.mul(top, 1000.0), lz), 12.0), clamp=True)
    bays = nb.add(0.5, nb.mul(0.5, nb.math("GREATER_THAN", fu, 0.3)))
    ccol = nb.mixc(csel, (0.70, 0.80, 1.0), (1.0, 0.86, 0.66))
    crown_e = nb.scale(ccol, nb.mul(nb.mul(nb.mul(band, crown), nb.mul(nb.mul(side, fall), bays)), 0.7))
    emit = nb.vadd(emit, crown_e)
    nt.links.new(emit, b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = 1.0
    # facade: dark glass on offices, darker masonry on the rest; a faint glossy sheen picks up the sky
    fac = nb.mixc(kind, (0.016, 0.017, 0.02), (0.012, 0.015, 0.02))
    nt.links.new(fac, b.inputs["Base Color"])
    nt.links.new(nb.add(0.22, nb.mul(0.45, nb.math("SUBTRACT", 1.0, kind))), b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.45
    _fog_out(nt, nb, b.outputs[0], 0.8, fog_d=FOG_BUILDINGS, colour=BUILDING_FOG)
    return m


def sky_mat():
    m, nt, nb = _new_mat("city_sky")
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
    # a glow that holds up to about 6 degrees (Dawn's shoulders from the window camera), then falls off cooler
    for pos, col in ((0.035, (0.086, 0.084, 0.092)), (0.1, (0.052, 0.053, 0.062)), (0.25, (0.024, 0.026, 0.034)),
                     (0.5, (0.011, 0.012, 0.018))):
        el = cr.elements.new(pos)
        el.color = (*col, 1)
    nt.links.new(nb.math("MAXIMUM", e, 0.0), ramp.inputs["Fac"])
    # low cloud lit from below by the city: soft streaks, strongest a little above the horizon
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, 1.0, 4.5)
    nt.links.new(vn.outputs[0], mp.inputs["Vector"])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 3.2
    nz.inputs["Detail"].default_value = 6.0
    nz.inputs["Roughness"].default_value = 0.62
    nt.links.new(mp.outputs[0], nz.inputs["Vector"])
    cloud = nb.math("SUBTRACT", nz.outputs["Fac"], 0.48)
    cloud = nb.math("MULTIPLY", nb.math("MAXIMUM", cloud, 0.0), 3.0, clamp=True)
    env = nb.mul(nb.math("GREATER_THAN", e, 0.015), nb.math("SUBTRACT", 1.0, nb.math("DIVIDE", e, 0.45), clamp=True))
    lift = nb.add(1.0, nb.mul(nb.mul(cloud, env), 0.9))
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(nb.scale(ramp.outputs["Color"], lift), em.inputs["Color"])
    em.inputs["Strength"].default_value = 1.0
    nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def ground_mat():
    m, nt, nb = _new_mat("city_ground")
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.006, 0.006, 0.007, 1)
    b.inputs["Roughness"].default_value = 0.9
    _fog_out(nt, nb, b.outputs[0], 0.92)
    return m


# ---------------------------------------------------------------- layout

def in_fan(x, y, margin=0.0):
    return 140.0 <= y and (-1.4 * y - 320 - margin) <= x <= (0.9 * y + 320 + margin)


XS = [37.0 + 200.0 * k for k in range(-45, 26)]          # north-south streets (run along +Y)
YS = [150.0 + 100.0 * j for j in range(0, 70)]           # cross streets (run along X)
DIAG = (math.radians(-31.0), (-120.0, 140.0))             # a diagonal avenue heading out to the left


def _diag_dist(x, y):
    a, (x0, y0) = DIAG
    dx, dy = x - x0, y - y0
    d = (math.sin(a), math.cos(a))          # unit direction (heading = a from +Y)
    along = dx * d[0] + dy * d[1]
    return abs(dx * d[1] - dy * d[0]), along


def _tower_height(x, y):
    """Distance from the nearest cluster centre, scaled so each cluster reads as 'r < 900' at its edge; and that
    cluster's height factor."""
    r1 = math.hypot(x - DOWNTOWN[0], (y - DOWNTOWN[1]) * 0.8)
    ux, uy, ur, uk = UPTOWN
    r2 = math.hypot(x - ux, (y - uy) * 0.8) * 900.0 / ur
    return (r1, 1.0) if r1 <= r2 else (r2, uk)


# Two narrow wedges of sky kept clear of towers (headings from the window, degrees from straight out): where Dawn's
# head stands against the horizon glow from the wide camera (-27) and from the window camera (+15), so her
# silhouette reads against light rather than a dark tower. (A gap between the clusters, as the river leaves.)
CLEAR = ((-31.0, -22.5), (10.5, 19.5))


def clear_sky(x, y, margin=0.0):
    a = math.degrees(math.atan2(x, y))
    return any(lo - margin <= a <= hi + margin for lo, hi in CLEAR)


def plan(seed=11):
    """Return building boxes (lo, hi, data) for low-rise blocks, mid-rises and towers."""
    rng = random.Random(seed)
    lo, hi, data, crown = [], [], [], []

    def add(x0, y0, x1, y1, h, kind, litf, cr=0.0, csel=0.0):
        r = rng.random()
        lo.append((x0, y0, GROUND))
        hi.append((x1, y1, GROUND + h))
        data.append((r, kind, litf))
        crown.append((h / 1000.0, cr, csel))

    towers = []
    for i in range(len(XS) - 1):
        for j in range(len(YS) - 1):
            bx0, bx1 = XS[i] + 12.0, XS[i + 1] - 12.0
            by0, by1 = YS[j] + 9.0, YS[j + 1] - 9.0
            cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
            if cy > 5200 or not in_fan(cx, cy, 120.0):
                continue
            dd, along = _diag_dist(cx, cy)
            r, hk = _tower_height(cx, cy)
            # lots along the block
            x = bx0
            while x < bx1 - 8:
                w = rng.uniform(16, 48) if r > 900 else rng.uniform(22, 60)
                x1 = min(bx1, x + w)
                halves = [(by0, by1)] if rng.random() < 0.5 else [(by0, (by0 + by1) / 2 - 2), ((by0 + by1) / 2 + 2, by1)]
                for (y0, y1) in halves:
                    px, py = (x + x1) / 2, (y0 + y1) / 2
                    dd, along = _diag_dist(px, py)
                    if dd < 22 and along > 0:          # the diagonal avenue cuts through
                        continue
                    if r < 850:
                        h = rng.lognormvariate(math.log(45 + 60 * (1 - r / 850)), 0.45)
                    elif r < 1800:
                        h = rng.lognormvariate(math.log(22), 0.5)
                    else:
                        h = rng.lognormvariate(math.log(13), 0.4)
                    if rng.random() < 0.012 and py < 3500:
                        h = rng.uniform(55, 120)        # a scattered mid-rise
                    h = max(6.0, min(h, 40.0 if clear_sky(px, py) else 140.0))
                    kind = 1.0 if (r < 900 and rng.random() < 0.7) or rng.random() < 0.15 else 0.0
                    litf = rng.uniform(0.06, 0.22) if kind else rng.uniform(0.12, 0.34)
                    add(x + 1.5, y0, x1 - 1.5, y1, h, kind, litf)
                x = x1
            if r < 900 and rng.random() < 0.5 * (1 - r / 1000) + 0.06:
                tx, ty = cx + rng.uniform(-30, 30), cy + rng.uniform(-8, 8)
                if not clear_sky(tx, ty, 2.0):
                    towers.append((tx, ty, r, hk))
    # the towers of the cluster: taller toward the centre, some with setbacks
    for (tx, ty, r, hk) in towers:
        h = (rng.uniform(120, 230) * (1.25 - 0.55 * r / 900) + rng.uniform(-20, 40)) * hk
        h = min(h, 320)
        w, d = rng.uniform(34, 56), rng.uniform(30, 44)
        kind = 1.0 if rng.random() < 0.75 else 0.0
        litf = rng.uniform(0.08, 0.24) if kind else rng.uniform(0.18, 0.34)
        cr = 1.0 if rng.random() < 0.2 else 0.0
        steps = rng.choice([1, 1, 2, 3])
        hh, ww, dd2 = h, w, d
        for s in range(steps):
            level_h = h * ([1.0, 0.72, 0.5][steps - 1 - s] if steps > 1 else 1.0)
            ww, dd2 = w * (1 - 0.18 * s), d * (1 - 0.18 * s)
            add(tx - ww / 2, ty - dd2 / 2, tx + ww / 2, ty + dd2 / 2, level_h, kind, litf,
                cr if s == steps - 1 else 0.0, rng.random())
        if rng.random() < 0.6:                                   # mechanical penthouse
            add(tx - ww * 0.25, ty - dd2 * 0.2, tx + ww * 0.25, ty + dd2 * 0.2, h + rng.uniform(5, 9), 0.0, 0.0)
        hh = h
        if hh > 200:
            towers_tops.append((tx, ty, GROUND + hh + 7, ww, dd2))
    # two neighbours close to the window, for scale
    for (x, y, w, d, h, kind) in ((-700.0, 760.0, 42.0, 36.0, 128.0, 1.0), (300.0, 520.0, 36.0, 30.0, 96.0, 0.0)):
        add(x - w / 2, y - d / 2, x + w / 2, y + d / 2, h, kind, 0.22 if kind else 0.3)
        add(x - w * 0.3, y - d * 0.25, x + w * 0.3, y + d * 0.25, h + 6, 0.0, 0.0)
    return np.array(lo), np.array(hi), np.array(data), np.array(crown)


towers_tops = []


def rooftops(lo, hi, data, crown, seed=23, reach=1600.0):
    """Mechanical units and stair bulkheads (1-3 small boxes, 1.5-3.5 m tall) on the near low-rise roofs, so the
    roofs seen from above are not bare slabs. Its own random stream: the city's layout is unchanged."""
    rng = np.random.default_rng(seed)
    h = hi[:, 2] - lo[:, 2]
    c = (lo[:, :2] + hi[:, :2]) / 2
    d = np.hypot(c[:, 0], c[:, 1])
    w = np.minimum(hi[:, 0] - lo[:, 0], hi[:, 1] - lo[:, 1])
    sel = np.where((h < 60) & (d < reach) & (w > 10) & (rng.random(len(h)) < 0.75))[0]
    a_lo, a_hi = [], []
    for i in sel:
        for _ in range(rng.integers(1, 4)):
            sx, sy = rng.uniform(2.0, 6.0, 2)
            sz = rng.uniform(1.5, 3.5)
            x0 = rng.uniform(lo[i, 0] + 1.5, hi[i, 0] - 1.5 - sx)
            y0 = rng.uniform(lo[i, 1] + 1.5, hi[i, 1] - 1.5 - sy)
            a_lo.append((x0, y0, hi[i, 2]))
            a_hi.append((x0 + sx, y0 + sy, hi[i, 2] + sz))
    if not a_lo:
        return lo, hi, data, crown
    n = len(a_lo)
    zd = np.zeros((n, 3))
    zd[:, 0] = rng.random(n)
    return (np.vstack([lo, a_lo]), np.vstack([hi, a_hi]), np.vstack([data, zd]),
            np.vstack([crown, np.zeros((n, 3))]))


def streets(seed=5):
    """Street-light points (centre, radius, colour) and road-surface glow strips (lo, hi, colour)."""
    rng = random.Random(seed)
    pts, rad, col = [], [], []
    strips_lo, strips_hi, strips_c = [], [], []
    sodium, led = (1.0, 0.66, 0.36), (0.86, 0.92, 1.0)

    def light(x, y, c, k=1.0):
        d = math.hypot(x, y)
        pts.append((x, y, GROUND + 9.0))
        rad.append((0.55 + d * 0.00055) * k)
        col.append(c)

    for k, x in enumerate(XS):
        arterial = (k % 4) == 1
        y0 = max(140.0, (x - 320) / 0.9 if x > 320 else (-x - 320) / 1.4 if x < -320 else 140.0)
        if y0 > 6500:
            continue
        c = led if arterial or rng.random() < 0.3 else sodium
        y = y0 + rng.uniform(0, 30)
        while y < 6800:
            for s in (-1, 1):
                light(x + s * (11 if arterial else 8), y + rng.uniform(-2, 2), c, 1.25 if arterial else 1.0)
            y += 30 if arterial else 38
        strips_lo.append((x - (9 if arterial else 6), y0, GROUND + 0.1))
        strips_hi.append((x + (9 if arterial else 6), 6800, GROUND + 0.2))
        strips_c.append(tuple(v * (0.18 if arterial else 0.09) for v in c))
    for j, y in enumerate(YS):
        if y > 6500:
            break
        arterial = (j % 8) == 3
        x0, x1 = -1.4 * y - 320, 0.9 * y + 320
        c = led if arterial or rng.random() < 0.25 else sodium
        x = x0 + rng.uniform(0, 30)
        while x < x1:
            for s in (-1, 1):
                light(x + rng.uniform(-2, 2), y + s * (10 if arterial else 7), c, 1.2 if arterial else 1.0)
            x += 32 if arterial else 40
        strips_lo.append((x0, y - (8 if arterial else 5), GROUND + 0.1))
        strips_hi.append((x1, y + (8 if arterial else 5), GROUND + 0.2))
        strips_c.append(tuple(v * (0.14 if arterial else 0.06) for v in c))
    # the diagonal avenue: denser, brighter
    a, (dx0, dy0) = DIAG
    ux, uy = math.sin(a), math.cos(a)
    t = 0.0
    while t < 7000:
        x, y = dx0 + ux * t, dy0 + uy * t
        for s in (-1, 1):
            light(x + s * 12 * uy, y - s * 12 * ux, led, 1.3)
        t += 26
    return (np.array(pts), np.array(rad), np.array(col)), (np.array(strips_lo), np.array(strips_hi), np.array(strips_c))


def traffic(seed=3):
    """Head and tail lights on the arterials and the diagonal (pairs of small emissive boxes)."""
    rng = random.Random(seed)
    lo, hi, col = [], [], []
    red, white = (1.0, 0.06, 0.03), (1.0, 0.93, 0.8)

    def car(x, y, along_y, toward):
        c, k = (white, 2.2) if toward else (red, 1.6)
        for s in (-0.7, 0.7):
            if along_y:
                px, py = x + s, y
            else:
                px, py = x, y + s
            lo.append((px - 0.35, py - 0.35, GROUND + 0.6))
            hi.append((px + 0.35, py + 0.35, GROUND + 1.0))
            col.append(tuple(v * k for v in c))

    for k, x in enumerate(XS):
        if (k % 4) != 1:
            continue
        y = 160.0
        while y < 6000:
            if in_fan(x, y):
                toward = rng.random() < 0.5
                car(x + (-3.5 if toward else 3.5), y, True, toward)
            y += rng.expovariate(1 / 45.0) + 8
    for j, y in enumerate(YS):
        if (j % 8) != 3:
            continue
        x = -1.4 * y - 320
        while x < 0.9 * y + 320:
            car(x, y + rng.choice((-3.5, 3.5)), False, rng.random() < 0.5)
            x += rng.expovariate(1 / 55.0) + 8
    a, (dx0, dy0) = DIAG
    ux, uy = math.sin(a), math.cos(a)
    t = 20.0
    while t < 6000:
        s = rng.choice((-1, 1))
        x, y = dx0 + ux * t + s * 4 * uy, dy0 + uy * t - s * 4 * ux
        car(x, y, True, s < 0)
        t += rng.expovariate(1 / 28.0) + 6
    return np.array(lo), np.array(hi), np.array(col)


# ---------------------------------------------------------------- build

def build():
    towers_tops.clear()
    # sky and ground
    sky_m = sky_mat()
    me = bpy.data.meshes.new("city_sky")
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=15000.0)
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    sky = _city_object(_link(bpy.data.objects.new("city_sky", me)))
    sky.data.materials.append(sky_m)

    g_lo, g_hi = np.array([(-16000.0, -3000.0, GROUND - 1.0)]), np.array([(16000.0, 16000.0, GROUND)])
    v, f, _ = boxes(g_lo, g_hi)
    gr = _city_object(_link(bpy.data.objects.new("city_ground", fast_mesh("city_ground", v, f, 4))))
    gr.data.materials.append(ground_mat())

    # buildings
    lo, hi, data, crown = plan()
    lo, hi, data, crown = rooftops(lo, hi, data, crown)
    v, f, lco = boxes(lo, hi)
    me = fast_mesh("city_buildings", v, f, 4)
    point_attr(me, "lco", lco)
    point_attr(me, "bdata", np.repeat(data, 8, axis=0))
    point_attr(me, "bcrown", np.repeat(crown, 8, axis=0))
    bld = _city_object(_link(bpy.data.objects.new("city_buildings", me)))
    bld.data.materials.append(building_mat())

    # street lights, road glow, traffic
    (pts, rad, col), (s_lo, s_hi, s_c) = streets()
    v, f = octahedra(pts, rad)
    me = fast_mesh("city_streetlights", v, f, 3)
    point_colour(me, "col", np.repeat(col, 6, axis=0))
    sl = _city_object(_link(bpy.data.objects.new("city_streetlights", me)))
    sl.data.materials.append(emission_mat("city_streetlight", "col", strength=7.0, fog_max=0.85))

    v, f, _ = boxes(s_lo, s_hi)
    me = fast_mesh("city_roads", v, f, 4)
    point_colour(me, "col", np.repeat(s_c, 8, axis=0))
    rd = _city_object(_link(bpy.data.objects.new("city_roads", me)))
    rd.data.materials.append(emission_mat("city_road", "col", strength=1.0, fog_max=0.9))

    t_lo, t_hi, t_c = traffic()
    v, f, _ = boxes(t_lo, t_hi)
    me = fast_mesh("city_traffic", v, f, 4)
    point_colour(me, "col", np.repeat(t_c, 8, axis=0))
    tr = _city_object(_link(bpy.data.objects.new("city_traffic", me)))
    tr.data.materials.append(emission_mat("city_trafficlight", "col", strength=3.0, fog_max=0.88))

    # aviation lights on the tallest roofs
    if towers_tops:
        c = []
        for (x, y, z, w, d) in towers_tops:
            for sx in (-0.4, 0.4):
                c.append((x + sx * w, y + d * 0.35, z))
        v, f = octahedra(np.array(c), np.full(len(c), 1.4))
        av = _city_object(_link(bpy.data.objects.new("city_aviation", fast_mesh("city_aviation", v, f, 3))))
        av.data.materials.append(emission_mat("city_aviation", rgb=(1.0, 0.05, 0.03), strength=9.0, fog_max=0.7))
    print(f"CITY {len(lo)} buildings, {len(pts)} street lights, {len(t_lo)} car lights, "
          f"{len(towers_tops)} aviation-lit towers", flush=True)
