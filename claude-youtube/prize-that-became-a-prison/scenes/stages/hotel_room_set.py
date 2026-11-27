"""The Hong Kong hotel room (Ch 03 the window, Ch 04 the packing): a mid-range room high in a Kowloon tower at night.

Plan (metres, floor z = 0, the window looks along +Y):
  room      x -2.05..1.80, y -2.55..2.00, ceiling 2.60. Low-pile carpet, grasscloth walls, a painted ceiling.
  window    in the +Y wall, x -0.80..1.50, a stone ledge at 0.45 (the fan-coil unit under it, behind a slot grille),
            two fixed panes in dark aluminium to 2.40, glass at y 2.15. Blackout drapes stacked at both sides, sheers
            in front of the glass: the left sheer is the one Dawn draws back in the window shot.
  bed       queen, headboard against the left wall (x -2.05): x -1.97..0.03, y -0.95..0.65; a white duvet over a
            dark fabric base, four pillows, a slate runner across the foot; a tall channel-tufted headboard panel.
  bedside   walnut nightstands either side; on the window side the ceramic lamp with a linen drum shade: the room's
            one warm practical.

Light, practical first: the bedside lamp (a warm bulb inside the translucent shade), the city's cool glow through
the glass (one soft area light just inside the window, hidden from the camera and from reflections), a breath of
cool ambient. The room is colder than the Chicago apartment: cool grey walls, white bedding, the city light blue.
"""
import math

import bpy  # noqa: F401
import bmesh
import numpy as np
from mathutils import Matrix, Vector

import setkit as sk
import hotel_room_mats as mt

M = mt.M
W0, W1 = -2.05, 1.80
F0, WIN_Y = -2.55, 2.00
H = 2.60
WX0, WX1 = -0.80, 1.50
SILL, HEAD = 0.45, 2.40
GLASS_Y = 2.15
MULLION_X = 0.35
LEDGE_Y = 1.80
BED = dict(x0=-1.97, x1=0.03, y0=-0.95, y1=0.65, base=0.27, top=0.60)
NIGHT_W = (-2.02, -1.56, 0.74, 1.20)          # x0, x1, y0, y1 (window side, the lamp)
NIGHT_R = (-2.02, -1.56, -1.50, -1.04)        # room side
NIGHT_TOP = 0.56
LAMP = (-1.80, 0.97)
LAMP_BULB_Z = NIGHT_TOP + 0.40
LAMP_RGB = (1.0, 0.47, 0.17)                  # tungsten pushed warm in scene: the film grade strips warmth
SHEER_Y, DRAPE_Y = 1.74, 1.66
CEILING = []                                  # objects a camera above the room looks through


# ---------------------------------------------------------------- geometry helpers

def _link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0), seg=3):
    ob = sk.box(name, size, loc, m, bevel=0.0, rot=rot)
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments, bv.limit_method = bevel, seg, "ANGLE"
        ob.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = True
        for p in ob.data.polygons:
            p.use_smooth = True
    return ob


def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=32, r2=None, bev=0.0):
    ob = sk.cyl(name, r, depth, loc, m, rot=rot, verts=verts, r2=r2)
    if bev:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments, bv.limit_method = bev, 2, "ANGLE"
        ob.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = True
    return ob


def lathe(name, profile, loc, m, segs=48, cap=True):
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / segs), r * math.sin(2 * math.pi * i / segs), z))
                      for i in range(segs)])
    for a, b in zip(rings[:-1], rings[1:]):
        for i in range(segs):
            j = (i + 1) % segs
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap:
        if profile[0][0] > 1e-4:
            bm.faces.new(list(reversed(rings[0])))
        if profile[-1][0] > 1e-4:
            bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = _link(bpy.data.objects.new(name, me))
    ob.location = loc
    ob.data.materials.append(m)
    return ob


def tube(name, pts, r, m, res=4, closed=False):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution = "3D", r, res
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts):
        p.co = (*co, 1)
    sp.use_cyclic_u = closed
    ob = _link(bpy.data.objects.new(name, cu))
    ob.data.materials.append(m)
    return ob


def soft_box(name, size, loc, m, bevel, cuts=(10, 10, 4), rot=(0, 0, 0), disp=None):
    """A box with a real round-over and enough grid for a wrinkle displacement (duvets, cushions)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for axis, n in enumerate(cuts):
        if n <= 0:
            continue
        for k in range(1, n + 1):
            t = -0.5 + k / (n + 1)
            co = [0, 0, 0]
            co[axis] = t
            no = [0, 0, 0]
            no[axis] = 1
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    ob.location, ob.rotation_euler = loc, rot
    ob.data.materials.append(m)
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = bevel, 5, "ANGLE"
    sub = ob.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = 1
    for p in me.polygons:
        p.use_smooth = True
    for i, (scale, strength) in enumerate(disp or ()):
        tx = bpy.data.textures.new(f"{name}_wr{i}", "CLOUDS")
        tx.noise_scale, tx.noise_depth = scale, 2
        d = ob.modifiers.new(f"wrinkle{i}", "DISPLACE")
        d.texture, d.strength, d.mid_level, d.texture_coords = tx, strength, 0.5, "GLOBAL"
    return ob


# ---------------------------------------------------------------- the room shell

def shell():
    m = M
    T = 0.15
    box("floor", (W1 - W0 + 0.4, WIN_Y - F0 + 0.4, 0.05), ((W0 + W1) / 2, (F0 + WIN_Y) / 2, -0.025), m["carpet"])
    ceil = box("ceiling", (W1 - W0 + 0.4, WIN_Y - F0 + 0.5, 0.05), ((W0 + W1) / 2, (F0 + WIN_Y) / 2 + 0.05, H + 0.025),
               m["ceiling"])
    CEILING.append(ceil)
    box("wall_back", (W1 - W0 + 0.4, T, H), ((W0 + W1) / 2, F0 - T / 2, H / 2), m["wall"])
    box("wall_left", (T, WIN_Y - F0 + 0.3, H), (W0 - T / 2, (F0 + WIN_Y) / 2, H / 2), m["wall"])
    box("wall_right", (T, WIN_Y - F0 + 0.3, H), (W1 + T / 2, (F0 + WIN_Y) / 2, H / 2), m["wall"])
    # the window wall around the opening (0.2 m deep reveal), painted where it returns into the reveal
    d = 0.22
    box("wall_win_l", (WX0 - W0, d, H), ((W0 + WX0) / 2, WIN_Y + d / 2, H / 2), m["wall"])
    box("wall_win_r", (W1 - WX1, d, H), ((WX1 + W1) / 2, WIN_Y + d / 2, H / 2), m["wall"])
    box("wall_win_head", (WX1 - WX0, d, H - HEAD), ((WX0 + WX1) / 2, WIN_Y + d / 2, (H + HEAD) / 2), m["wall_paint"])
    box("reveal_l", (0.012, d, HEAD - SILL), (WX0 + 0.006, WIN_Y + d / 2, (HEAD + SILL) / 2), m["wall_paint"])
    box("reveal_r", (0.012, d, HEAD - SILL), (WX1 - 0.006, WIN_Y + d / 2, (HEAD + SILL) / 2), m["wall_paint"])
    # skirting (dark walnut, 8 cm)
    sk_h, sk_t = 0.08, 0.014
    for n, size, loc in (("skirt_back", (W1 - W0, sk_t, sk_h), ((W0 + W1) / 2, F0 + sk_t / 2, sk_h / 2)),
                         ("skirt_right", (sk_t, WIN_Y - F0, sk_h), (W1 - sk_t / 2, (F0 + WIN_Y) / 2, sk_h / 2)),
                         ("skirt_left", (sk_t, WIN_Y - F0, sk_h), (W0 + sk_t / 2, (F0 + WIN_Y) / 2, sk_h / 2)),
                         ("skirt_win_l", (WX0 - W0, sk_t, sk_h), ((W0 + WX0) / 2, WIN_Y - sk_t / 2, sk_h / 2)),
                         ("skirt_win_r", (W1 - WX1, sk_t, sk_h), ((WX1 + W1) / 2, WIN_Y - sk_t / 2, sk_h / 2))):
        box(n, size, loc, m["veneer_dark"], bevel=0.003)
    # ceiling: the curtain slot along the window (dark), two downlights (off), a linear diffuser
    CEILING.append(box("curtain_slot", (W1 - W0, 0.2, 0.006), ((W0 + W1) / 2, (SHEER_Y + DRAPE_Y) / 2 + 0.01, H - 0.002),
                       m["dark"]))
    for i, (x, y) in enumerate(((-0.95, -0.15), (0.6, -1.4), (0.75, 0.9))):
        CEILING.append(cyl(f"can_trim{i}", 0.06, 0.006, (x, y, H - 0.003), m["trim"], verts=40, bev=0.002))
        CEILING.append(cyl(f"can_baffle{i}", 0.046, 0.008, (x, y, H - 0.002), m["dark"], verts=32))
    CEILING.append(box("ac_diffuser", (1.6, 0.09, 0.006), (0.55, 1.35, H - 0.003), m["grille"], bevel=0.002))
    CEILING.append(box("ac_slot", (1.54, 0.05, 0.007), (0.55, 1.35, H - 0.003), m["dark"]))


def window():
    m = M
    # the stone ledge on the fan-coil housing, and the housing's painted front with its return-air grille
    lt = 0.035
    box("ledge", (WX1 - WX0 + 0.04, GLASS_Y - LEDGE_Y + 0.02, lt), ((WX0 + WX1) / 2, (LEDGE_Y + GLASS_Y) / 2 - 0.01,
                                                                    SILL - lt / 2), m["stone"], bevel=0.004)
    box("ledge_front", (WX1 - WX0, 0.02, SILL - lt), ((WX0 + WX1) / 2, LEDGE_Y + 0.02, (SILL - lt) / 2), m["wall_paint"],
        bevel=0.002)
    box("ledge_body", (WX1 - WX0, GLASS_Y - LEDGE_Y - 0.03, SILL - lt), ((WX0 + WX1) / 2, (LEDGE_Y + GLASS_Y) / 2 + 0.02,
                                                                           (SILL - lt) / 2), m["wall_paint"])
    gw = WX1 - WX0 - 0.5
    box("grille_frame", (gw + 0.03, 0.012, 0.14), ((WX0 + WX1) / 2, LEDGE_Y + 0.006, 0.27), m["grille"], bevel=0.002)
    box("grille_void", (gw, 0.01, 0.11), ((WX0 + WX1) / 2, LEDGE_Y + 0.008, 0.27), m["dark"])
    for k in range(9):
        box(f"grille_slat{k}", (gw, 0.016, 0.004), ((WX0 + WX1) / 2, LEDGE_Y + 0.01, 0.222 + k * 0.012), m["grille"],
            rot=(math.radians(-30), 0, 0))
    # frame: sill and head rails, jambs, the one mullion; dark aluminium, 70 mm deep
    dpt, fw = 0.07, 0.05
    yc = GLASS_Y
    zb, zt = SILL, HEAD
    box("win_rail_b", (WX1 - WX0, dpt, fw), ((WX0 + WX1) / 2, yc, zb + fw / 2), m["alu"], bevel=0.003)
    box("win_rail_t", (WX1 - WX0, dpt, fw), ((WX0 + WX1) / 2, yc, zt - fw / 2), m["alu"], bevel=0.003)
    for n, x in (("win_jamb_l", WX0 + fw / 2), ("win_jamb_r", WX1 - fw / 2)):
        box(n, (fw, dpt, zt - zb), (x, yc, (zb + zt) / 2), m["alu"], bevel=0.003)
    box("win_mullion", (0.065, dpt + 0.02, zt - zb), (MULLION_X, yc - 0.01, (zb + zt) / 2), m["alu"], bevel=0.004)
    # glazing beads (a small step round each pane) and the panes
    for i, (x0, x1) in enumerate(((WX0 + fw, MULLION_X - 0.0325), (MULLION_X + 0.0325, WX1 - fw))):
        g = box(f"glass_{i}", (x1 - x0, 0.006, zt - zb - 2 * fw), ((x0 + x1) / 2, yc, (zb + zt) / 2), m["glass"])
        g.visible_shadow = False
        for n, s, l in ((f"bead_b{i}", (x1 - x0, 0.012, 0.012), ((x0 + x1) / 2, yc - 0.012, zb + fw + 0.006)),
                        (f"bead_t{i}", (x1 - x0, 0.012, 0.012), ((x0 + x1) / 2, yc - 0.012, zt - fw - 0.006))):
            box(n, s, l, m["alu"], bevel=0.002)
    # the building's own outside: a slab edge and spandrel under the window (seen when looking down) and the
    # column fins either side of the bay, dark grey cladding
    clad = sk.mat("cladding", (0.035, 0.037, 0.04), 0.6)
    box("out_spandrel", (WX1 - WX0 + 1.2, 0.08, 1.2), ((WX0 + WX1) / 2, GLASS_Y + 0.12, SILL - 0.6), clad)
    box("out_head", (WX1 - WX0 + 1.2, 0.08, 0.6), ((WX0 + WX1) / 2, GLASS_Y + 0.12, HEAD + 0.3), clad)
    for s, x in ((-1, WX0 - 0.2), (1, WX1 + 0.2)):
        box(f"out_fin{s}", (0.4, 0.5, 4.0), (x, GLASS_Y + 0.3, 1.2), clad)


def pleated(name, B, E, m, z0, z1, n_pleat, amp, nu=None, nv=40, thick=0.002, gather=None):
    """A hanging curtain as a pleated surface between a back edge B(z) and a leading edge E(z) (functions of height
    returning (x, y)); `gather` (z, k) adds pleat depth near a held point."""
    nu = nu or n_pleat * 8
    bm = bmesh.new()
    rows = []
    for j in range(nv + 1):
        v = j / nv
        z = z0 + (z1 - z0) * v
        b, e = Vector(B(z)), Vector(E(z))
        d = (e - b)
        nrm = Vector((-d.y, d.x)).normalized() if d.length > 1e-6 else Vector((0, 1))
        row = []
        for i in range(nu + 1):
            u = i / nu
            p = b.lerp(e, u)
            a = amp
            if gather is not None:
                gz, gk = gather
                a *= 1.0 + gk * u * math.exp(-((z - gz) / 0.4) ** 2)
            a *= 0.85 + 0.15 * math.sin(7.0 * v + 3 * u)                       # pleats wander a little
            phase = 2 * math.pi * u * n_pleat
            a *= 1 + 0.30 * math.sin(phase * 0.28 + 0.5 * v)
            off = a * math.sin(phase + 0.26 * math.sin(phase * 0.35 + v))
            if z - z0 < 0.04:
                off *= 0.81
            q = p + nrm * off
            row.append(bm.verts.new((q.x, q.y, z)))
        rows.append(row)
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = _link(bpy.data.objects.new(name, me))
    ob.data.materials.append(m)
    so = ob.modifiers.new("thick", "SOLIDIFY")
    so.thickness, so.offset = thick, 0.0
    return ob


def curtains(hand=None):
    """Blackout drapes stacked both sides; the right sheer stacked; the left sheer either drawn straight to x -0.55
    (hand None) or held at its leading edge by Dawn's hand (world point), the voile gathered toward the grip.
    Returns the left sheer."""
    m = M
    zt = H - 0.02
    pleated("drape_l", lambda z: (W0 + 0.78, DRAPE_Y), lambda z: (WX0 + 0.02, DRAPE_Y + 0.01), m["drape"], 0.012, zt,
            7, 0.045, thick=0.004)
    pleated("drape_r", lambda z: (WX1 - 0.06, DRAPE_Y), lambda z: (W1 - 0.03, DRAPE_Y), m["drape"], 0.012, zt,
            6, 0.042, thick=0.004)
    pleated("sheer_r", lambda z: (WX1 - 0.18, SHEER_Y), lambda z: (W1 - 0.05, SHEER_Y), m["sheer"], 0.015, zt,
            9, 0.022)
    tracks = box("curtain_track", (W1 - W0 - 0.1, 0.09, 0.02), ((W0 + W1) / 2, (SHEER_Y + DRAPE_Y) / 2, H - 0.012),
                 m["alu"], bevel=0.002)
    CEILING.append(tracks)
    back = lambda z: (W0 + 0.85, SHEER_Y)
    if hand is None:
        return pleated("sheer_l", back, lambda z: (-0.52, SHEER_Y), m["sheer"], 0.015, zt, 9, 0.022)
    hx, hy, hz = hand
    top, bot = Vector((-0.42, SHEER_Y)), Vector((-0.50, SHEER_Y - 0.01))
    hv = Vector((hx, hy))

    def lead(z):
        if z >= hz:
            t = (z - hz) / (zt - hz)
            p = hv.lerp(top, t ** 0.85)
            p.y -= 0.03 * math.sin(math.pi * t) * (1 - t)
        else:
            t = (hz - z) / hz
            p = hv.lerp(bot, 1 - (1 - t) ** 1.6)
        return (p.x, p.y)
    return pleated("sheer_l", back, lead, m["sheer"], 0.015, zt, 10, 0.022, nv=60, gather=(hz, 0.9))


# ---------------------------------------------------------------- the bed

def pillow(name, size, loc, rot, m):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=7, use_grid_fill=True)
    for v in bm.verts:
        x, y, z = v.co
        r = max(abs(x) / 0.5, abs(y) / 0.5)
        v.co.z = z * (1.0 - 0.78 * r ** 2.6)
        v.co.x *= 1.0 - 0.06 * (1 - abs(2 * y)) ** 2
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    ob.location, ob.rotation_euler = loc, rot
    ob.data.materials.append(m)
    sub = ob.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = 2
    tx = bpy.data.textures.new(name + "_wr", "CLOUDS")
    tx.noise_scale = 0.08
    d = ob.modifiers.new("wrinkle", "DISPLACE")
    d.texture, d.strength, d.texture_coords = tx, 0.006, "GLOBAL"
    for p in me.polygons:
        p.use_smooth = True
    return ob


def bed():
    m = M
    b = BED
    xc, yc = (b["x0"] + b["x1"]) / 2, (b["y0"] + b["y1"]) / 2
    L, Wd = b["x1"] - b["x0"], b["y1"] - b["y0"]
    # base: a dark upholstered divan on a recessed black plinth
    box("bed_plinth", (L - 0.12, Wd - 0.12, 0.07), (xc, yc, 0.035), m["dark"])
    box("bed_base", (L, Wd, b["base"] - 0.07), (xc, yc, 0.07 + (b["base"] - 0.07) / 2), m["valance"], bevel=0.02)
    # the duvet over the mattress: a deep rounded slab, soft wrinkles (fine) and a slow undulation (broad)
    dz0, dz1 = b["base"] - 0.02, b["top"]
    duvet = soft_box("duvet", (L + 0.03, Wd + 0.05, dz1 - dz0), (xc + 0.015, yc, (dz0 + dz1) / 2), m["cotton"], 0.07,
                     cuts=(50, 42, 8), disp=((0.06, 0.004), (0.35, 0.020)))
    # The edge hangs beyond the divan and folds back toward it below the crest.
    for vert in duvet.data.vertices:
        x, y, z = vert.co
        side = min(1, max(0, (abs(y) - Wd / 2 + 0.095) / 0.095))
        foot = min(1, max(0, (x - L / 2 + 0.10) / 0.10))
        height = max(0, min(1, (z + (dz1 - dz0) / 2) / (dz1 - dz0)))
        bow = 0.045 + 0.057 * math.sin(math.pi * height)
        vert.co.y += math.copysign(side * (bow + 0.008 * math.sin(32 * x + 3 * height)), y)
        vert.co.x += foot * (bow + 0.008 * math.sin(28 * y + 2 * height))
        vert.co.z -= max(side, foot) * 0.065
        if height >= 0.98:
            for px, py, dx, dy in ((-1.28, -0.12, 0.24, 0.10), (-1.25, 0.25, 0.21, 0.15),
                                   (-1.05, -0.63, 0.34, 0.16), (-0.41, 0.21, 0.22, 0.30)):
                r2 = ((x + duvet.location.x - px) / dx)**2 + ((y + yc - py) / dy)**2
                vert.co.z -= 0.018 * math.exp(-1.8 * r2)
    duvet.data.update()
    # the runner across the foot: the same rounded section 6 mm proud, cut to 0.5 m
    rx0, rx1 = -0.52, -0.02
    soft_box("runner", (rx1 - rx0, Wd + 0.062, dz1 - dz0 + 0.012), ((rx0 + rx1) / 2, yc, (dz0 + dz1) / 2 + 0.003),
             m["runner"], 0.074, cuts=(10, 30, 5), disp=((0.06, 0.004), (0.35, 0.012)))
    # four pillows, stacked in pairs against the headboard, the top pair leaning back on it
    for i, y in enumerate((-0.52, 0.22)):
        pillow(f"pillow_lo{i}", (0.44, 0.7, 0.16), (b["x0"] + 0.25, y, dz1 + 0.05), (0, math.radians(-6), 0), m["pillow"])
        pillow(f"pillow_hi{i}", (0.42, 0.68, 0.15), (b["x0"] + 0.2, y + 0.02 * (1 - 2 * i), dz1 + 0.17),
               (0, math.radians(-24), math.radians(2 - 4 * i)), m["pillow"])
    # the headboard: a tall channel-tufted wool panel in a walnut surround, wider than the bed and its nightstands
    hy0, hy1, hz0, hz1 = -1.60, 1.30, 0.30, 1.42
    box("headboard", (0.07, hy1 - hy0, hz1 - hz0), (W0 + 0.035 + 0.012, (hy0 + hy1) / 2, (hz0 + hz1) / 2), m["headboard"],
        bevel=0.018, seg=4)
    box("headboard_cap", (0.1, hy1 - hy0 + 0.05, 0.03), (W0 + 0.05, (hy0 + hy1) / 2, hz1 + 0.015), m["veneer_dark"],
        bevel=0.006)
    for s, y in ((-1, hy0 - 0.0125), (1, hy1 + 0.0125)):
        box(f"headboard_side{s}", (0.1, 0.025, hz1 - 0.0), (W0 + 0.05, y, (hz1) / 2), m["veneer_dark"], bevel=0.005)
    return duvet


def nightstand(name, rect, m):
    x0, x1, y0, y1 = rect
    xc, yc = (x0 + x1) / 2, (y0 + y1) / 2
    top = NIGHT_TOP
    box(f"{name}_plinth", (x1 - x0 - 0.06, y1 - y0 - 0.06, 0.06), (xc - 0.02, yc, 0.03), m["dark"])
    box(f"{name}_case", (x1 - x0, y1 - y0, top - 0.06 - 0.025), (xc, yc, 0.06 + (top - 0.085) / 2), m["veneer"], bevel=0.004)
    box(f"{name}_top", (x1 - x0 + 0.01, y1 - y0 + 0.01, 0.025), (xc + 0.005, yc, top - 0.0125), m["veneer"], bevel=0.005)
    # drawer front with a shadow gap, an open niche under it
    box(f"{name}_drawer", (0.012, y1 - y0 - 0.03, 0.14), (x1 + 0.004, yc, top - 0.11), m["veneer"], bevel=0.003)
    box(f"{name}_gap", (0.004, y1 - y0 - 0.02, 0.006), (x1 + 0.001, yc, top - 0.188), m["dark"])
    box(f"{name}_niche", (0.004, y1 - y0 - 0.05, 0.22), (x1 + 0.001, yc, 0.2), m["dark"])
    box(f"{name}_pull", (0.012, 0.09, 0.01), (x1 + 0.014, yc, top - 0.08), m["brass"], bevel=0.003)


def lamp():
    m = M
    x, y = LAMP
    z0 = NIGHT_TOP
    lathe("lamp_base", [(0.0, 0.0), (0.055, 0.0), (0.06, 0.006), (0.085, 0.06), (0.098, 0.14), (0.09, 0.21),
                        (0.06, 0.27), (0.03, 0.30), (0.018, 0.312), (0.0, 0.314)], (x, y, z0), m["ceramic"], segs=56)
    cyl("lamp_neck", 0.01, 0.06, (x, y, z0 + 0.34), m["brass"], verts=20)
    cyl("lamp_socket", 0.017, 0.05, (x, y, z0 + 0.385), m["brass"], verts=24, bev=0.002)
    for s in (-1, 1):
        tube(f"lamp_harp{s}", [(x + s * 0.055, y, z0 + 0.37), (x + s * 0.055, y, z0 + 0.52), (x, y, z0 + 0.555)],
             0.0025, m["brass"])
    cyl("lamp_finial", 0.011, 0.02, (x, y, z0 + 0.565), m["brass"], verts=20)
    zb, zt = 0.27, 0.545
    sh = lathe("lamp_shade", [(0.19, zb), (0.155, zt)], (x, y, z0), m["shade"], segs=72, cap=False)
    so = sh.modifiers.new("thick", "SOLIDIFY")
    so.thickness, so.offset = 0.003, 0.0
    for r, zz in ((0.19, zb), (0.155, zt)):
        tube("lamp_ring", [(x + r * math.cos(2 * math.pi * i / 48), y + r * math.sin(2 * math.pi * i / 48), z0 + zz)
                           for i in range(48)], 0.002, m["brass"], res=2, closed=True)
    bulb = sk.sphere("lamp_bulb", 0.03, (x, y, LAMP_BULB_Z), sk.emission("bulb", (1.0, 0.62, 0.32), 24.0))
    bulb.visible_shadow = False
    li = bpy.data.lights.new("lamp_light", "POINT")
    li.energy, li.color, li.shadow_soft_size = 110.0, LAMP_RGB, 0.035
    lo = _link(bpy.data.objects.new("lamp_light", li))
    lo.location = (x, y, LAMP_BULB_Z)
    # the shade's glow toward the bed (a lit shade is a broad soft source; through the translucent linen alone it is
    # sampled only indirectly, so a disc the size of the shade stands in for it), hidden from camera and reflections
    sp = bpy.data.lights.new("lamp_spill", "AREA")
    sp.shape, sp.size, sp.energy, sp.color = "DISK", 0.4, 60.0, LAMP_RGB
    so_ = _link(bpy.data.objects.new("lamp_spill", sp))
    so_.location = (x + 0.05, y - 0.24, LAMP_BULB_Z + 0.01)
    tgt = Vector((-0.95, -0.35, 0.7))
    so_.rotation_euler = (tgt - so_.location).to_track_quat("-Z", "Y").to_euler()
    so_.visible_camera = False
    so_.visible_glossy = False
    return lo


def bedside_dressing():
    m = M
    # a desk phone (handset on its cradle, a blank key field), on the room-side nightstand
    x, y = -1.82, -1.30
    z = NIGHT_TOP
    box("phone_body", (0.17, 0.2, 0.05), (x, y, z + 0.025), m["plastic"], bevel=0.008, rot=(0, 0, math.radians(8)))
    box("phone_handset", (0.05, 0.21, 0.035), (x + 0.045, y, z + 0.068), m["plastic"], bevel=0.012,
        rot=(0, 0, math.radians(8)))
    box("phone_keys", (0.07, 0.09, 0.004), (x - 0.03, y - 0.01, z + 0.051), sk.mat("phone keys", (0.06, 0.06, 0.065), 0.5),
        bevel=0.001, rot=(0, 0, math.radians(8)))
    box("notepad", (0.1, 0.15, 0.008), (x + 0.03, y + 0.17, z + 0.004), sk.mat("notepad paper", (0.55, 0.54, 0.5), 0.9),
        bevel=0.001, rot=(0, 0, math.radians(-10)))
    # a bottle of water and a glass by the lamp (window side), plain, no label
    bx, by = -1.68, 1.12
    lathe("water_bottle", [(0.0, 0.0), (0.032, 0.0), (0.034, 0.008), (0.034, 0.17), (0.026, 0.2), (0.014, 0.215),
                           (0.014, 0.23), (0.0, 0.23)], (bx, by, z), sk.mat("bottle glass", (0.6, 0.65, 0.66), 0.08), segs=32)
    cyl("bottle_cap", 0.0155, 0.018, (bx, by, z + 0.239), m["plastic"], verts=24, bev=0.002)


def lights(city=32.0, ambient=0.0):
    """The city's cool glow: one soft area light just inside the glass, facing the room, hidden from camera and
    reflections. Returns it."""
    li = sk.area_light("city_glow", ((WX0 + WX1) / 2, WIN_Y - 0.12, (SILL + HEAD) / 2), (WX1 - WX0, HEAD - SILL), city,
                       (0.5, 0.64, 1.0), spread_deg=110, rot=(math.radians(-90), 0, 0))
    li.visible_camera = False
    li.visible_glossy = False
    rim_pos = Vector((0.35, 1.75, 1.3))
    rim = sk.area_light("window_rim", rim_pos, (0.3, 1.2), 9.0, (0.55, 0.66, 1.0), spread_deg=85,
                        rot=(Vector((-0.28, 1.40, 1.48)) - rim_pos).to_track_quat("-Z", "Y").to_euler())
    rim.visible_camera = rim.visible_glossy = False
    # a low cool bounce off the ledge and the floor by the window (the city light hitting the stone)
    b = sk.area_light("ledge_bounce", ((WX0 + WX1) / 2, LEDGE_Y - 0.05, 0.5), (WX1 - WX0, 0.3), city * 0.12,
                      (0.55, 0.66, 1.0), spread_deg=150, rot=(math.radians(-60), 0, 0))
    b.visible_camera = False
    b.visible_glossy = False
    # for the packing close-up only (the stage trims it to zero elsewhere): the lamp's light coming back off the
    # white duvet onto the near face of the bag in her hand, a low warm card below the frame on the camera side
    c = sk.area_light("duvet_bounce", (-0.62, -0.98, 0.68), (0.4, 0.3), 4.0, (1.0, 0.62, 0.36), spread_deg=100)
    c.rotation_euler = (Vector((-1.06, -0.67, 0.92)) - Vector(c.location)).to_track_quat("-Z", "Y").to_euler()
    c.visible_camera = False
    c.visible_glossy = False
    # the lamp's up-cone lights the ceiling over the bedhead; that ceiling then lights the bed softly from above
    # (the room's own bounce, made explicit so the packing hands and bag under her are not lost in the duffel's
    # shadow); warm, broad, local to the bedhead half of the room
    cb = sk.area_light("ceiling_bounce", (-1.2, -0.4, H - 0.08), (0.9, 0.9), 22.0, (1.0, 0.7, 0.46), spread_deg=120)
    cb.visible_camera = False
    cb.visible_glossy = False
    return li


def build():
    CEILING.clear()
    mt.materials()
    shell()
    window()
    duvet = bed()
    nightstand("night_w", NIGHT_W, M)
    nightstand("night_r", NIGHT_R, M)
    lamp()
    bedside_dressing()
    lights()
    return duvet
