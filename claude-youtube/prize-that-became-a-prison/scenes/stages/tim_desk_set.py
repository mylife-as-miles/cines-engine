"""The set for Tim Hunt's desk at home in Chicago, at night (Ch 09, the years of private appeals).

A small study in an old Chicago house. Tim sits facing -Y; the window wall is the room's -Y wall (its room face at
y = R["y0"]), so his left is +X and the room runs back to +Y behind him.

  the wall      a mulled pair of double-hung windows over the desk, wood casing, stool and apron, 2 in venetian
                blinds let down and half closed (the slats' room edge lower), the night and the houses across the
                street behind them (an emitting backdrop: a few blank lit windows, a roof line under the sky glow)
  the desk      a worn oak double-pedestal desk built here: a boarded top with rubbed arrises, two pedestals of three
                drawers with turned pulls on a recessed plinth, a pencil drawer over the kneehole, a modesty panel
  on the desk   the desk-lamp prop (enamelled, with a bulb, a spot down its reflector and the spill round it), the
                laptop prop open with a blank glowing panel set in its bezel, a ruled writing pad, loose sheets, a
                banded bundle and a loose pile of airmail and plain envelopes, two window envelopes and an unfolded
                letter, a phone lying face down, reading glasses, a mug, a framed photograph on its easel (its back
                to the window)
  the room      strip oak floor, a wool rug, painted plaster, base and crown, a cast-iron radiator and a dark
                framed picture on the right wall, a bookcase of books and binders left of the window, file boxes
                on the floor beside the desk (twelve years of paperwork)

Primitives, the window and the blind are adapted from the family home's set (home_set.py); the lamp and the laptop
finishing from the evidence table (evidence_table.py); copied so this stage stands alone.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import props  # noqa: E402
import setkit as sk  # noqa: E402
import tim_desk_mats as mt  # noqa: E402
import tim_desk_paper as pp  # noqa: E402

M = {}
LIGHTS = {}
G = {}                 # group name -> objects (hidden or shown per camera by the stage)

R = dict(x0=-1.95, x1=1.75, y0=-0.37, y1=4.45, h=2.7)      # the room's interior faces
WALL_T = 0.14
WIN = dict(cx=0.0, w=1.56, z0=0.98, z1=2.2, mullion=0.1)
BLIND_TILT = 31.0      # degrees: the slats' room-side edge lower; about 40 % open to a level eye (half closed)
DW, DD, TOP, TT = 1.40, 0.68, pp.TOP, 0.032                  # desk top: width (x), depth (y), height, thickness
PED_IN, PED_OUT, PED_Y = 0.30, 0.685, 0.315                 # pedestals: |x| from PED_IN to PED_OUT, |y| to PED_Y
PLINTH = 0.085
RUG = (0.0, 1.2, 2.3, 1.6)                                   # centre x, y, size x, y
WARM = (1.0, 0.40, 0.085)           # the lamp: an old incandescent bulb (warm enough to stay warm under the film's grade)
COOL = (0.38, 0.60, 1.0)           # the laptop's blank page
NIGHT = (0.55, 0.68, 1.0)          # the street and the sky

# the lamp prop at LAMP_SIZE (base near the origin, the shade looking along +Y and down). Measured by ray probes at
# 0.55 m: the bulb's place in the shade, the reflector's axis 47 degrees below level; light leaves the shade between
# 10 and 70 degrees below level and 38 degrees either side
LAMP_SIZE = 0.55
_K = LAMP_SIZE / 0.55
BULB = Vector((0.0, 0.072 * _K, 0.408 * _K))
AXIS = Vector((0.0, 0.68, -0.73)).normalized()
LAMP = (0.24, -0.16, 36.6)         # prop origin on the desk and turn: the light falls along (-sin t, cos t), here
                                   # from the back of the desk, left of the pad, toward the pen and Tim
SPOT_OUT = 0.012 * _K              # the bulb's glowing end, this far down the axis toward the shade's mouth: from
                                   # there (ray casts) the pad and his hands see all of it, his brow two thirds
LAPTOP = (0.50, 0.10, -75.0)       # prop origin and turn: the screen faces (-cos t, -sin t): pushed aside, toward the room
PAD = (-0.02, 0.165, 194.0)        # the writing pad: centre and turn (its head away from Tim, turned for a right hand,
                                   # pulled up to the desk's edge: he is half way down the page)
PAD_H = 0.0069                     # the pad's top surface above the desk (board, block and a sheet)


def group(name, obs):
    G.setdefault(name, []).extend([o for o in (obs if isinstance(obs, (list, tuple)) else [obs]) if o is not None])
    return obs


# ---------------------------------------------------------------- primitives (from home_set.py)
def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0), seg=3, parent=None):
    ob = sk.box(name, size, loc, m, bevel=bevel, rot=rot)
    if bevel:
        bv = ob.modifiers["bevel"]
        bv.segments = seg
        bv.limit_method = "ANGLE"
    if parent is not None:
        ob.parent = parent
    return ob


def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=32, r2=None, bevel=0.0):
    ob = sk.cyl(name, r, depth, loc, m, rot=rot, verts=verts, r2=r2)
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments, bv.limit_method = bevel, 3, "ANGLE"
        ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
    return ob


def _finish(ob, smooth_angle=35.0):
    for p in ob.data.polygons:
        p.use_smooth = True
    es = ob.modifiers.new("split", "EDGE_SPLIT")
    es.split_angle = math.radians(smooth_angle)
    return ob


def _link(name, bm, m):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if m is not None:
        ob.data.materials.append(m)
    return ob


def bevelled(ob, width, segs=3, angle=40.0):
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = width, segs, "ANGLE"
    bv.angle_limit = math.radians(angle)
    ob.modifiers.new("wn", "WEIGHTED_NORMAL")
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def add_box(bm, size, loc, rot_z=0.0):
    return bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(loc) @ Matrix.Rotation(rot_z, 4, "Z") @ Matrix.Diagonal((*size, 1)))


def lathe(name, profile, loc, m, segs=48, smooth_angle=40.0):
    """Spin a profile [(r, z)] about the Z axis."""
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0.0, z)) for r, z in profile]
    es = [bm.edges.new((a, b)) for a, b in zip(vs, vs[1:])]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 0, 1), steps=segs, angle=2 * math.pi)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = _link(name, bm, m)
    ob.location = loc
    return _finish(ob, smooth_angle)


def run(name, a, b, n, profile, m):
    """A moulding: the closed profile [(d, z)] (d out from the wall face into the room along the unit normal n)
    extruded along the wall face from a to b (x, y)."""
    bm = bmesh.new()
    rows = []
    for (px, py) in (a, b):
        rows.append([bm.verts.new((px + n[0] * d, py + n[1] * d, z)) for d, z in profile])
    k = len(profile)
    for i in range(k):
        j = (i + 1) % k
        bm.faces.new((rows[0][i], rows[0][j], rows[1][j], rows[1][i]))
    bm.faces.new(rows[0])
    bm.faces.new(list(reversed(rows[1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish(_link(name, bm, m))


def area(name, loc, size, energy, colour, spread=180, aim=None):
    li = sk.area_light(name, loc, size, energy, colour, spread_deg=spread)
    if aim is not None:
        li.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    LIGHTS[name] = li
    return li


def spot(name, loc, aim, energy, colour, size_deg, blend, radius):
    li = bpy.data.lights.new(name, "SPOT")
    li.energy, li.color = energy, colour
    li.spot_size, li.spot_blend = math.radians(size_deg), blend
    li.shadow_soft_size = radius
    ob = bpy.data.objects.new(name, li)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    LIGHTS[name] = ob
    return ob


def point(name, loc, energy, colour, radius=0.02):
    li = bpy.data.lights.new(name, "POINT")
    li.energy, li.color, li.shadow_soft_size = energy, colour, radius
    ob = bpy.data.objects.new(name, li)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    LIGHTS[name] = ob
    return ob


def on_wall(name, loc, rot_z, fn, *a, **kw):
    """Build parts with `fn` as if on a +Y wall at the origin (room face at y = 0, x along the wall, the room at
    -y), then carry them to `loc` turned `rot_z` about Z. Returns fn's result."""
    before = set(bpy.data.objects)
    out = fn(*a, **kw)
    hold = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(hold)
    for o in set(bpy.data.objects) - before:
        if o.parent is None and o is not hold:
            o.parent = hold
    hold.location = loc
    hold.rotation_euler = (0, 0, rot_z)
    bpy.context.view_layer.update()
    return out


# ---------------------------------------------------------------- materials
def materials():
    M.clear()
    G.clear()
    LIGHTS.clear()
    pp.SUPPORT.clear()
    lit = [(-5.3, -1.25, 0.85, 1.25, (0.5, 0.27, 0.1)), (-3.2, -1.2, 0.9, 1.3, (0.3, 0.17, 0.07)), (-1.1, -1.3, 0.8, 1.2, (0.07, 0.1, 0.18)),
           (1.7, -1.15, 0.9, 1.3, (0.42, 0.24, 0.1)), (3.9, -1.25, 0.85, 1.25, (0.16, 0.1, 0.05)), (5.8, -1.2, 0.9, 1.3, (0.36, 0.2, 0.08)),
           (0.3, 0.25, 0.5, 0.6, (0.2, 0.12, 0.05)), (-4.2, 0.3, 0.5, 0.6, (0.1, 0.13, 0.2))]
    M.update(
        wall=mt.wall_paint("wall paint", (0.27, 0.265, 0.24)),
        ceiling=mt.wall_paint("ceiling paint", (0.4, 0.4, 0.38), grime=0.15),
        trim=mt.enamel("trim enamel", (0.4, 0.39, 0.36)),
        oak=mt.oak_floor("oak floor"),
        rug=mt.rug("rug", size=RUG[2:]),
        slat=mt.slat("blind slat", (0.56, 0.55, 0.51), 0.14),
        blind_plastic=mt.plastic("blind rail", (0.5, 0.49, 0.45), 0.42, 0.45),
        cord=mt.plastic("blind cord", (0.45, 0.44, 0.41), 0.8, 0.3),
        glass=mt.glass("window glass"),
        chrome=mt.satin_metal("sash lock", (0.5, 0.5, 0.5), 0.3),
        night=mt.night("night outside", low=(0.05, 0.065, 0.1), high=(0.012, 0.016, 0.03), strength=2.2, z0=0.4, z1=5.0, lit=lit,
                       roof=(0.9, 0.9)),
        desk=mt.worn_wood("desk top oak", DD / 5, -DD / 2, light=(0.15, 0.066, 0.023), dark=(0.052, 0.023, 0.009),
                          rings=((0.19, 0.115, 0.041), (-0.3, -0.22, 0.04), (0.44, 0.19, 0.039)), front_y=-DD / 2),
        carcass=mt.worn_wood("desk carcass oak", 0.14, -0.07, light=(0.1, 0.06, 0.032), dark=(0.038, 0.022, 0.012), rough=0.5),
        plinth=mt.worn_wood("desk plinth", 0.1, -0.05, light=(0.05, 0.03, 0.017), dark=(0.02, 0.012, 0.007), rough=0.55),
        pull=mt.satin_metal("drawer pull brass", (0.23, 0.16, 0.075), 0.42),
        paper=mt.paper("letter paper", (0.72, 0.63, 0.48), 0.86, 0.05, 0.04, translucency=0.2, edge_tone=(0.216, 0.279)),
        paper2=mt.paper("letter paper 2", (0.70, 0.64, 0.51), 0.86, 0.05, 0.06, edge_tone=(0.216, 0.279)),
        ruled=mt.ruled("ruled sheet", 0.215, 0.274, rgb=(0.71, 0.63, 0.51)),
        block=mt.page_block("pad block", (0.7, 0.67, 0.6)),
        board=mt.manila("pad chipboard", (0.2, 0.18, 0.15)),
        tape=mt.book_cloth("pad binding", (0.05, 0.02, 0.02)),
        airmail=mt.airmail("airmail envelope", 0.19, 0.11),
        airmail_uv=mt.airmail("airmail envelope stacked", 0.19, 0.11, uv=True),
        cream=mt.paper("envelope paper", (0.66, 0.61, 0.5), 0.82, 0.06, 0.05),
        white_env=mt.paper("white envelope", (0.7, 0.7, 0.67), 0.82, 0.05, 0.05),
        window_env=mt.window_envelope("window envelope", 0.241, 0.105),
        manila=mt.manila("manila"),
        band=mt.plastic("rubber band", (0.3, 0.2, 0.1), 0.6, 0.3),
        pen=mt.plastic("pen plastic", (0.012, 0.012, 0.014), 0.38, 0.5),
        pen_metal=mt.satin_metal("pen metal", (0.62, 0.62, 0.6), 0.25),
        glaze=mt.glaze("mug glaze", (0.40, 0.35, 0.26), rough=0.25),
        bisque=mt.matte("mug foot", (0.32, 0.29, 0.25), 0.85),
        coffee=mt.liquid("coffee"),
        enamel=mt.plastic("lamp reflector enamel", (0.34, 0.26, 0.17), 0.36, 0.5, 0.05),
        bulb=mt.glow("lamp bulb", (1.0, 0.59, 0.23), 13.0),
        phone=mt.plastic("phone back", (0.02, 0.021, 0.024), 0.3, 0.5, 0.25),
        phone_edge=mt.satin_metal("phone band", (0.12, 0.12, 0.125), 0.35),
        lens=mt.plastic("phone lens", (0.004, 0.004, 0.005), 0.08, 0.6, 0.0),
        frame=mt.worn_wood("picture frame wood", 0.02, -0.01, light=(0.05, 0.03, 0.017), dark=(0.018, 0.011, 0.006), rough=0.4),
        hardboard=mt.manila("frame back", (0.12, 0.074, 0.04), 0.8),
        photo=mt.photo("framed photograph", 0.127, 0.178, 0.0, image_rgb=(0.085, 0.08, 0.075), gradient=0.3),
        iron=mt.cast_iron("radiator paint"),
        brass=mt.satin_metal("valve brass", (0.3, 0.21, 0.09), 0.35),
        card=mt.cardboard("file box board"),
        card_dark=mt.matte("box hand hole", (0.01, 0.008, 0.006), 0.9),
        case=mt.worn_wood("bookcase wood", 0.3, -0.15, light=(0.06, 0.036, 0.02), dark=(0.025, 0.015, 0.008), rough=0.5),
        canvas=mt.matte("picture canvas", (0.06, 0.065, 0.07), 0.85),
        mat_board=mt.paper("picture mount", (0.4, 0.39, 0.36), 0.9, 0.04, 0.0, sss=0.0, translucency=0.0),
        key=mt.plastic("blank laptop caps", (0.035, 0.038, 0.04), 0.54),
        deck=mt.plastic("keyboard surround", (0.026, 0.029, 0.032), 0.47),
        wire=mt.satin_metal("spectacle wire", (0.16, 0.13, 0.09), 0.42),
        acetate=mt.plastic("glasses temple tips", (0.04, 0.025, 0.019), 0.52, 0.22),
    )
    books = [(0.06, 0.035, 0.03), (0.03, 0.04, 0.055), (0.035, 0.05, 0.04), (0.08, 0.07, 0.05), (0.022, 0.022, 0.025),
             (0.07, 0.03, 0.025), (0.1, 0.095, 0.085), (0.045, 0.04, 0.05)]
    M["books"] = [mt.book_cloth(f"book cloth {i}", c) for i, c in enumerate(books)]
    return M


# ---------------------------------------------------------------- the room
BASE = [(0, 0), (0.017, 0), (0.017, 0.15), (0.013, 0.157), (0.015, 0.164), (0.011, 0.172), (0.006, 0.178), (0, 0.18)]


def _crown(h):
    return [(0, h - 0.115), (0.004, h - 0.115), (0.009, h - 0.108), (0.012, h - 0.1), (0.03, h - 0.07),
            (0.055, h - 0.04), (0.08, h - 0.018), (0.092, h - 0.012), (0.096, h - 0.006), (0.104, h - 0.003),
            (0.106, h), (0, h)]


def _sash(p, x0, x1, z0, z1, y, depth=0.042, stile=0.052, bottom=0.075, top=0.052):
    """A wood sash: stiles, rails and a glass pane at depth y (y is the sash's room face)."""
    tm = M["trim"]
    yc = y + depth / 2
    w = x1 - x0
    box(f"{p}_stileL", (stile, depth, z1 - z0), (x0 + stile / 2, yc, (z0 + z1) / 2), tm, bevel=0.004)
    box(f"{p}_stileR", (stile, depth, z1 - z0), (x1 - stile / 2, yc, (z0 + z1) / 2), tm, bevel=0.004)
    box(f"{p}_railB", (w - 2 * stile + 0.004, depth, bottom), ((x0 + x1) / 2, yc, z0 + bottom / 2), tm, bevel=0.004)
    box(f"{p}_railT", (w - 2 * stile + 0.004, depth, top), ((x0 + x1) / 2, yc, z1 - top / 2), tm, bevel=0.004)
    g = box(f"{p}_glass", (w - 2 * stile + 0.01, 0.004, z1 - z0 - bottom - top + 0.01), ((x0 + x1) / 2, yc + 0.006, (z0 + bottom + z1 - top) / 2),
            M["glass"])
    g.visible_shadow = False


def window(p, cx, w, z0, z1, y_wall, mullion=0.0, inner_depth=0.053):
    """A double-hung window (a mulled pair when `mullion` > 0) in a +Y wall whose room face is at y = y_wall: jamb
    liners, upper and lower sashes, a meeting rail lock, the interior casing with its head cap, the stool and the
    apron. Returns [(x0, x1)] of the glazed units."""
    tm = M["trim"]
    t = WALL_T
    x0, x1 = cx - w / 2, cx + w / 2
    yj = y_wall + t / 2
    box(f"{p}_jambL", (0.02, t, z1 - z0), (x0 + 0.01, yj, (z0 + z1) / 2), tm, bevel=0.002)
    box(f"{p}_jambR", (0.02, t, z1 - z0), (x1 - 0.01, yj, (z0 + z1) / 2), tm, bevel=0.002)
    box(f"{p}_jambT", (w, t, 0.02), (cx, yj, z1 - 0.01), tm, bevel=0.002)
    box(f"{p}_sillJ", (w, t, 0.02), (cx, yj, z0 + 0.01), tm, bevel=0.002)
    if mullion:
        uw = (w - 0.04 - mullion) / 2
        units = [(x0 + 0.02, x0 + 0.02 + uw), (x1 - 0.02 - uw, x1 - 0.02)]
        box(f"{p}_mullion", (mullion, t, z1 - z0), (cx, yj, (z0 + z1) / 2), tm, bevel=0.003)
        box(f"{p}_mullCasing", (mullion + 0.02, 0.022, z1 - z0), (cx, y_wall - 0.011, (z0 + z1) / 2), tm, bevel=0.004)
    else:
        units = [(x0 + 0.02, x1 - 0.02)]
    zm = (z0 + z1) / 2 + 0.03
    for i, (ux0, ux1) in enumerate(units):
        ys = y_wall + inner_depth + 0.012
        _sash(f"{p}_u{i}_lower", ux0, ux1, z0 + 0.02, zm + 0.02, ys)
        _sash(f"{p}_u{i}_upper", ux0, ux1, zm - 0.02, z1 - 0.02, ys + 0.046)
        box(f"{p}_u{i}_lock", (0.055, 0.02, 0.012), ((ux0 + ux1) / 2, ys + 0.03, zm + 0.026), M["chrome"], bevel=0.003)
        box(f"{p}_u{i}_stopL", (0.014, 0.018, z1 - z0 - 0.04), (ux0 + 0.007, ys - 0.009, (z0 + z1) / 2), tm, bevel=0.002)
        box(f"{p}_u{i}_stopR", (0.014, 0.018, z1 - z0 - 0.04), (ux1 - 0.007, ys - 0.009, (z0 + z1) / 2), tm, bevel=0.002)
    cw, ct = 0.088, 0.02
    yc = y_wall - ct / 2
    box(f"{p}_casL", (cw, ct, z1 - z0 + cw), (x0 - cw / 2 + 0.004, yc, (z0 + z1 + cw) / 2), tm, bevel=0.004)
    box(f"{p}_casR", (cw, ct, z1 - z0 + cw), (x1 + cw / 2 - 0.004, yc, (z0 + z1 + cw) / 2), tm, bevel=0.004)
    box(f"{p}_head", (w + 2 * cw + 0.02, ct + 0.004, 0.13), (cx, yc - 0.002, z1 + 0.065), tm, bevel=0.004)
    box(f"{p}_headCap", (w + 2 * cw + 0.05, ct + 0.022, 0.022), (cx, yc - 0.01, z1 + 0.141), tm, bevel=0.006)
    box(f"{p}_stool", (w + 2 * cw + 0.06, 0.15, 0.026), (cx, y_wall + t * 0.25 - 0.075 + 0.03, z0 - 0.013), tm, bevel=0.007)
    box(f"{p}_apron", (w + 2 * cw - 0.01, ct, 0.085), (cx, yc, z0 - 0.026 - 0.0425), tm, bevel=0.004)
    return units


def blind(p, ux0, ux1, z0, z1, y, tilt_deg, cords_side=1):
    """A 2 in venetian blind hung inside the opening, its slats' room-side face near `y`: head rail and valance,
    slats tilted `tilt_deg` (positive: the room-side edge lower), the bottom rail, ladder tapes, lift cords, a tilt
    wand and the lift cord with its tassel."""
    w = ux1 - ux0 - 0.012
    cx = (ux0 + ux1) / 2
    sw, st, pitch = 0.05, 0.0022, 0.0445
    yc = y + 0.03
    bp = M["blind_plastic"]
    box(f"{p}_head", (w, 0.058, 0.05), (cx, yc, z1 - 0.03), bp, bevel=0.003)
    box(f"{p}_valance", (w + 0.006, 0.012, 0.07), (cx, yc - 0.035, z1 - 0.035), bp, bevel=0.004)
    top = z1 - 0.085
    bottom = z0 + 0.015
    n = int((top - bottom) / pitch)
    tr = math.radians(tilt_deg)
    rng = random.Random(len(p) * 7 + int(ux0 * 100))
    bm = bmesh.new()
    for i in range(n):
        z = top - i * pitch
        # each slat hangs a hair off true (a degree or so of tilt, a millimetre of sag), so the gaps are not a ruled grid
        a = tr + math.radians(rng.uniform(-1.3, 1.3))
        mat = Matrix.Translation((cx, yc, z + rng.uniform(-0.0008, 0.0008))) @ Matrix.Rotation(a, 4, "X") @ \
            Matrix.Rotation(math.radians(rng.uniform(-0.12, 0.12)), 4, "Y") @ Matrix.Diagonal((w, sw, st, 1))
        bmesh.ops.create_cube(bm, size=1.0, matrix=mat)
    ob = _link(f"{p}_slats", bm, M["slat"])
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = 0.0009, 2, "ANGLE"
    for pl in ob.data.polygons:
        pl.use_smooth = True
    ob.modifiers.new("wn", "WEIGHTED_NORMAL")
    rh = 0.03
    zb = top - (n - 1) * pitch - 0.008 - rh / 2
    box(f"{p}_bottom", (w, 0.052, rh), (cx, yc, zb), bp, bevel=0.004)
    for k, xx in enumerate((ux0 + 0.13, ux1 - 0.13)):
        for s, dy in (("f", -sw / 2 * math.cos(tr) - 0.001), ("b", sw / 2 * math.cos(tr) + 0.001)):
            box(f"{p}_ladder{k}{s}", (0.009, 0.0006, top - zb + 0.02), (xx, yc + dy, (top + zb) / 2), M["cord"])
        cyl(f"{p}_lift{k}", 0.0011, top - zb + 0.04, (xx + 0.012, yc, (top + zb) / 2), M["cord"], verts=8)
    wx = ux0 + 0.05 if cords_side > 0 else ux1 - 0.05
    lx = ux1 - 0.05 if cords_side > 0 else ux0 + 0.05
    cyl(f"{p}_wand", 0.0045, 0.62, (wx, yc - 0.045, z1 - 0.06 - 0.31), bp, verts=12)
    cyl(f"{p}_wandHook", 0.006, 0.02, (wx, yc - 0.04, z1 - 0.06), bp, verts=12)
    for j, dx in enumerate((-0.004, 0.004)):
        cyl(f"{p}_cord{j}", 0.0012, 0.95, (lx + dx, yc - 0.04, z1 - 0.06 - 0.475), M["cord"], verts=8)
    cyl(f"{p}_tassel", 0.007, 0.045, (lx, yc - 0.04, z1 - 0.06 - 0.95 - 0.02), bp, verts=16, r2=0.005)
    return ob


def radiator(p, cx, y_back, sections=14, h=0.64, pitch=0.064, depth=0.21):
    """A cast-iron column radiator on its feet, a valve and pipe at one end (on a +Y wall: see on_wall)."""
    bm = bmesh.new()
    w = sections * pitch
    x0 = cx - w / 2 + pitch / 2
    yc = y_back - depth / 2
    for i in range(sections):
        x = x0 + i * pitch
        for dy in (-depth / 2 + 0.03, -0.03, 0.03, depth / 2 - 0.03):
            bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((x, yc + dy, 0.09 + h / 2)) @ Matrix.Diagonal((0.044, 0.042, h - 0.1, 1)))
        for zz in (0.09 + 0.05, 0.09 + h - 0.05):
            bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((x, yc, zz)) @ Matrix.Diagonal((0.05, depth, 0.07, 1)))
    for x in (x0, x0 + (sections - 1) * pitch):
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((x, yc, 0.05)) @ Matrix.Diagonal((0.05, depth * 0.9, 0.1, 1)))
    ob = _link(f"{p}_radiator", bm, M["iron"])
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = 0.017, 3, "ANGLE"
    for pl in ob.data.polygons:
        pl.use_smooth = True
    ob.modifiers.new("wn", "WEIGHTED_NORMAL")
    xe = cx + w / 2 + 0.04
    cyl(f"{p}_pipe", 0.016, 0.24, (xe, yc, 0.12), M["iron"], verts=16)
    cyl(f"{p}_valve", 0.022, 0.05, (xe, yc, 0.27), M["brass"], verts=16, bevel=0.004)
    cyl(f"{p}_valveStem", 0.006, 0.05, (xe, yc, 0.32), M["brass"], verts=12)
    lathe(f"{p}_valveKnob", [(0.0, 0.0), (0.03, 0.0), (0.032, 0.01), (0.03, 0.02), (0.0, 0.02)], (xe, yc, 0.34), M["iron"], segs=24)
    return ob


def picture(p, cx, zc, w=0.62, h=0.46):
    """A dark framed picture on a +Y wall (see on_wall): a blank canvas in a mount under no glass."""
    for nm, s, l in (("T", (w + 0.1, 0.035, 0.05), (cx, -0.018, zc + h / 2 + 0.025)), ("B", (w + 0.1, 0.035, 0.05), (cx, -0.018, zc - h / 2 - 0.025)),
                     ("L", (0.05, 0.035, h), (cx - w / 2 - 0.025, -0.018, zc)), ("R", (0.05, 0.035, h), (cx + w / 2 + 0.025, -0.018, zc))):
        box(f"{p}_frame{nm}", s, l, M["frame"], bevel=0.007)
    box(f"{p}_mount", (w, 0.006, h), (cx, -0.008, zc), M["mat_board"])
    box(f"{p}_canvas", (w - 0.16, 0.008, h - 0.14), (cx, -0.011, zc), M["canvas"], bevel=0.002)


def bookcase(p, w=0.92, d=0.3, h=1.95, seed=3):
    """A plain bookcase on a +Y wall (see on_wall), centred on x = 0: sides, top, five shelves, a back, a plinth;
    books and pressboard binders stand and lean on the shelves, a few lie flat, none lettered."""
    cw = M["case"]
    t = 0.022
    for sx in (-1, 1):
        box(f"{p}_side{sx}", (d, t, h), (sx * (w / 2 - t / 2), -d / 2, h / 2), cw, bevel=0.003, rot=(0, 0, math.pi / 2))
    box(f"{p}_top", (w + 0.02, d + 0.012, t), (0, -d / 2 - 0.004, h + t / 2), cw, bevel=0.004)
    box(f"{p}_back", (w - 2 * t, 0.006, h - 0.08), (0, -0.004, 0.08 + (h - 0.08) / 2), cw)
    box(f"{p}_plinth", (w - 2 * t, 0.02, 0.08), (0, -d + 0.03, 0.04), cw, bevel=0.002)
    shelves = [0.08, 0.47, 0.83, 1.17, 1.49, 1.75]
    rng = random.Random(seed)
    bms = [bmesh.new() for _ in M["books"]]
    for si, z in enumerate(shelves):
        box(f"{p}_shelf{si}", (w - 2 * t, d - 0.012, t), (0, -d / 2 - 0.002, z + t / 2), cw, bevel=0.003)
        if si == len(shelves) - 1:
            clear = h - z - t
        else:
            clear = shelves[si + 1] - z - t
        x = -w / 2 + t + 0.012
        zt = z + t
        gap_at = rng.uniform(0.25, 0.6) * w - w / 2
        piled = si in (1, 4)
        while x < w / 2 - t - 0.03:
            if x >= gap_at and not piled:                         # a gap: a few books lying flat in it
                piled = True
                wid = rng.uniform(0.2, 0.26)
                if x + wid > w / 2 - t - 0.01:
                    break
                zz = zt
                for _ in range(rng.randint(2, 4)):
                    th, dep = rng.uniform(0.022, 0.045), rng.uniform(0.15, 0.2)
                    add_box(bms[rng.randrange(len(bms))], (wid - rng.uniform(0.0, 0.04), dep, th), (x + wid / 2, -d + 0.03 + dep / 2 + rng.uniform(0, 0.02), zz + th / 2),
                            rot_z=math.radians(rng.uniform(-4, 4)))
                    zz += th
                x += wid + 0.012
                continue
            bw = rng.uniform(0.018, 0.05) if si != 1 else rng.uniform(0.045, 0.075)       # the second shelf: binders
            bh = min(clear - 0.012, rng.uniform(0.19, 0.27) if si != 1 else rng.uniform(0.3, 0.32))
            bd = rng.uniform(0.14, 0.2) if si != 1 else 0.26
            if x + bw > w / 2 - t - 0.008:
                break
            y = -d + 0.022 + rng.uniform(0.0, 0.025) + bd / 2
            mi = rng.randrange(len(bms)) if si != 1 else rng.choice((1, 4, 4, 6))
            lean = math.radians(rng.choice((0, 0, 0, 0, 0, 0, 5))) if si != 1 else 0.0
            mat = Matrix.Translation((x + bw / 2 + math.sin(lean) * bh / 2, y, zt + bh / 2 * math.cos(lean))) @ Matrix.Rotation(-lean, 4, "Y") @ Matrix.Diagonal((bw, bd, bh, 1))
            bmesh.ops.create_cube(bms[mi], size=1.0, matrix=mat)
            x += bw + math.sin(lean) * bh + rng.uniform(0.0006, 0.002)
    for i, bm in enumerate(bms):
        if len(bm.verts):
            bevelled(_link(f"{p}_books{i}", bm, M["books"][i]), 0.0022, 2)
        else:
            bm.free()


def file_box(name, x, y, turn, z=0.0, lid=True, lid_off=None, folders=0, seed=1):
    """A corrugated file box (a banker's box), 31 x 39 x 26 cm, with hand holes in its ends and a lift-off lid.
    `lid_off` = (x, y, turn, lean) lays the lid against something instead; `folders` stands that many manila
    folders in the open box."""
    w, d, h, t = 0.31, 0.39, 0.26, 0.005
    mw = Matrix.Translation((x, y, z)) @ Matrix.Rotation(math.radians(turn), 4, "Z")
    bm = bmesh.new()
    add_box(bm, (w, d, t), (0, 0, t / 2))
    for sx in (-1, 1):
        add_box(bm, (t, d, h), (sx * (w / 2 - t / 2), 0, h / 2))
    for sy in (-1, 1):
        add_box(bm, (w, t, h), (0, sy * (d / 2 - t / 2), h / 2))
    body = bevelled(_link(name, bm, M["card"]), 0.0015, 2)
    body.matrix_world = mw
    out = [body]
    for sy in (-1, 1):                                            # the hand holes: dark slots in the two ends
        hole = cyl(f"{name}_hole{sy}", 0.016, 0.0016, (0, 0, 0), M["card_dark"], verts=32)
        hole.matrix_world = mw @ Matrix.Translation((0, sy * (d / 2 + 0.0002), h - 0.065)) @ Matrix.Rotation(math.pi / 2, 4, "X") @ Matrix.Diagonal((3.0, 1.0, 1.0, 1.0))
        out.append(hole)
    rng = random.Random(seed)
    if folders:
        bm = bmesh.new()
        for i in range(folders):
            fy = -d / 2 + 0.03 + i * (d - 0.06) / max(1, folders - 1)
            add_box(bm, (w - 0.022 - rng.uniform(0, 0.006), 0.0025, 0.235 + rng.uniform(-0.004, 0.012)), (rng.uniform(-0.003, 0.003), fy, 0.12 + t),
                    rot_z=math.radians(rng.uniform(-1.5, 1.5)))
        f = bevelled(_link(f"{name}_folders", bm, M["manila"]), 0.0006, 2)
        f.matrix_world = mw
        out.append(f)
    if lid or lid_off:
        lh = 0.07
        bm = bmesh.new()
        add_box(bm, (w + 0.014, d + 0.014, t), (0, 0, lh - t / 2))
        for sx in (-1, 1):
            add_box(bm, (t, d + 0.014, lh), (sx * (w / 2 + 0.007 - t / 2), 0, lh / 2))
        for sy in (-1, 1):
            add_box(bm, (w + 0.014, t, lh), (0, sy * (d / 2 + 0.007 - t / 2), lh / 2))
        lo = bevelled(_link(f"{name}_lid", bm, M["card"]), 0.0015, 2)
        if lid_off:
            lx, ly, lt, lean = lid_off
            lo.matrix_world = Matrix.Translation((lx, ly, 0.0)) @ Matrix.Rotation(math.radians(lt), 4, "Z") @ \
                Matrix.Rotation(math.radians(lean), 4, "X") @ Matrix.Translation((0, (d + 0.014) / 2, 0))
        else:
            lo.matrix_world = mw @ Matrix.Translation((rng.uniform(-0.002, 0.002), rng.uniform(-0.002, 0.002), h - lh + t + 0.001)) @ \
                Matrix.Rotation(math.radians(rng.uniform(-1.0, 1.0)), 4, "Z")
        out.append(lo)
    return out


def room():
    x0, x1, y0, y1, h = R["x0"], R["x1"], R["y0"], R["y1"], R["h"]
    t = WALL_T
    wall = M["wall"]
    wa, wb = WIN["cx"] - WIN["w"] / 2, WIN["cx"] + WIN["w"] / 2
    # the window wall, in pieces round the opening; the other three walls whole
    for nm, (a, b, c, d) in (("L", (x0 - t, wa, 0.0, h)), ("R", (wb, x1 + t, 0.0, h)), ("B", (wa, wb, 0.0, WIN["z0"])), ("T", (wa, wb, WIN["z1"], h))):
        box(f"room_wall-y_{nm}", (b - a, t, d - c), ((a + b) / 2, y0 - t / 2, (c + d) / 2), wall)
    box("room_wall+y", (x1 - x0 + 2 * t, t, h), ((x0 + x1) / 2, y1 + t / 2, h / 2), wall)
    box("room_wall-x", (t, y1 - y0, h), (x0 - t / 2, (y0 + y1) / 2, h / 2), wall)
    box("room_wall+x", (t, y1 - y0, h), (x1 + t / 2, (y0 + y1) / 2, h / 2), wall)
    # the boards run toward the window (object x along world y)
    box("room_floor", (y1 - y0 + 0.3, x1 - x0 + 0.3, 0.1), ((x0 + x1) / 2, (y0 + y1) / 2, -0.05), M["oak"], rot=(0, 0, math.pi / 2))
    box("room_ceiling", (x1 - x0 + 0.3, y1 - y0 + 0.3, 0.1), ((x0 + x1) / 2, (y0 + y1) / 2, h + 0.05), M["ceiling"])
    walls = {"+y": ((x0, y1), (x1, y1), (0, -1)), "-y": ((x0, y0), (x1, y0), (0, 1)),
             "+x": ((x1, y0), (x1, y1), (-1, 0)), "-x": ((x0, y0), (x0, y1), (1, 0))}
    for name, prof in (("base", BASE), ("crown", _crown(h))):
        dmax = max(d for d, _ in prof)
        for side, (a, b, n) in walls.items():
            along = 0 if side in ("+y", "-y") else 1
            a, b = list(a), list(b)
            a[along] -= dmax
            b[along] += dmax
            run(f"room_{name}{side}", tuple(a), tuple(b), n, prof, M["trim"])
    # the window and its blinds, built for a +Y wall and turned onto the -Y wall

    def win():
        units = window("win", 0.0, WIN["w"], WIN["z0"], WIN["z1"], 0.0, mullion=WIN["mullion"])
        for i, (ux0, ux1) in enumerate(units):
            blind(f"blind{i}", ux0, ux1, WIN["z0"] + 0.02, WIN["z1"] - 0.02, 0.002, tilt_deg=BLIND_TILT, cords_side=1 if i == 0 else -1)
    on_wall("window_wall", (WIN["cx"], y0, 0.0), math.pi, win)
    # the night: the houses across the street, 12 m out
    bd = box("night", (26.0, 0.02, 12.0), (0.0, y0 - t - 12.0, 3.0), M["night"])
    bd.visible_shadow = False
    bd.visible_diffuse = False
    # the right wall (-X): the radiator and a dark picture over it
    on_wall("right_wall", (x0, 0.7, 0.0), math.pi / 2, lambda: (radiator("rad", 0.0, -0.055), picture("pic", -0.2, 1.5)))
    # left of the window: a bookcase against the same wall, its books facing the room
    on_wall("bookcase", (1.31, y0, 0.0), math.pi, bookcase, "case", w=0.8)
    rg = box("rug", (RUG[2], RUG[3], 0.012), (RUG[0], RUG[1], 0.006), M["rug"], bevel=0.004, seg=2)
    # twelve years of paperwork: file boxes on the floor to the right of the desk, one open
    group("boxes", file_box("filebox_a", -1.22, -0.1, 4.0, seed=1))
    group("boxes", file_box("filebox_b", -1.215, -0.095, -5.0, z=0.262, seed=2))
    group("boxes", file_box("filebox_c", -1.63, 0.2, 68.0, lid=False, lid_off=(-1.56, 0.52, 152.0, 74.0), folders=14, seed=3))
    return rg


# ---------------------------------------------------------------- the desk
def desk():
    """The worn oak desk. The top is five boards along X (hairline joints, rounded arrises); it is turned half
    round so the material's worn front band lies along Tim's edge (+Y)."""
    bm = bmesh.new()
    pw = DD / 5
    gap = 0.0005
    for i in range(5):
        y = -DD / 2 + pw * (i + 0.5)
        add_box(bm, (DW, pw - gap, TT), (0.0, y, 0.0))
    top = bevelled(_link("desk_top", bm, M["desk"]), 0.003, 3)
    top.location = (0.0, 0.0, TOP - TT / 2)
    top.rotation_euler = (0, 0, math.pi)
    cw = M["carcass"]
    zc0, zc1 = PLINTH, TOP - TT
    ch = zc1 - zc0
    pw_ = PED_OUT - PED_IN
    out = [top]
    for sx in (-1, 1):
        xc = sx * (PED_IN + PED_OUT) / 2
        # sides (their boards run front to back), back, bottom and the face frame round the drawers
        for tag, xs in (("out", sx * (PED_OUT - 0.009)), ("in", sx * (PED_IN + 0.009))):
            out.append(box(f"desk_ped{sx}_{tag}", (2 * PED_Y, 0.018, ch), (xs, 0.0, zc0 + ch / 2), cw, bevel=0.003, rot=(0, 0, math.pi / 2)))
        out.append(box(f"desk_ped{sx}_back", (pw_ - 0.03, 0.016, ch), (xc, -PED_Y + 0.008, zc0 + ch / 2), cw, bevel=0.002))
        out.append(box(f"desk_ped{sx}_floor", (pw_ - 0.03, 2 * PED_Y - 0.03, 0.018), (xc, 0.0, zc0 + 0.009), cw))
        out.append(box(f"desk_ped{sx}_plinth", (pw_ - 0.04, 2 * PED_Y - 0.05, PLINTH), (xc, -0.005, PLINTH / 2), M["plinth"], bevel=0.003))
        fy = PED_Y - 0.011
        out.append(box(f"desk_ped{sx}_face", (pw_ - 0.03, 0.02, ch), (xc, fy - 0.004, zc0 + ch / 2), cw))
        # three drawers: fronts 4 mm proud of the face, a 3 mm reveal round each, a turned pull
        z = zc1 - 0.012
        for di, dh in enumerate((0.13, 0.15, 0.3)):
            ajar = 0.014 if (sx, di) == (-1, 0) else 0.0             # one drawer not quite pushed home
            fz = z - dh / 2
            out.append(box(f"desk_drawer{sx}_{di}", (pw_ - 0.046, 0.019, dh), (xc, fy + 0.0095 + ajar, fz), cw, bevel=0.0028))
            pulls = (0.0,) if di < 2 else (-0.09, 0.09)
            for pi, px in enumerate(pulls):
                k = lathe(f"desk_pull{sx}_{di}_{pi}", [(0.0, 0.0), (0.011, 0.0), (0.0095, 0.004), (0.0065, 0.009), (0.0075, 0.014), (0.0135, 0.02),
                                                      (0.0155, 0.026), (0.0135, 0.031), (0.007, 0.034), (0.0, 0.0345)],
                          (xc + px, fy + 0.019 + ajar, fz + (0.0 if di < 2 else 0.07)), M["pull"], segs=24)
                k.rotation_euler = (-math.pi / 2, 0, 0)
                out.append(k)
            z -= dh + 0.006
    # the kneehole: a pencil drawer under the top, a modesty panel at the back
    kw = 2 * PED_IN - 0.018
    out.append(box("desk_pencil", (kw - 0.008, 0.019, 0.044), (0.0, PED_Y - 0.04, zc1 - 0.012 - 0.022), cw, bevel=0.0028))
    k = lathe("desk_pencil_pull", [(0.0, 0.0), (0.011, 0.0), (0.0095, 0.004), (0.0065, 0.009), (0.0075, 0.014), (0.0135, 0.02),
                                   (0.0155, 0.026), (0.0135, 0.031), (0.007, 0.034), (0.0, 0.0345)],
              (0.0, PED_Y - 0.0305, zc1 - 0.012 - 0.022), M["pull"], segs=24)
    k.rotation_euler = (-math.pi / 2, 0, 0)
    out.append(k)
    out.append(box("desk_pencil_rail", (kw, 0.3, 0.014), (0.0, PED_Y - 0.19, zc1 - 0.007), cw))
    out.append(box("desk_modesty", (kw, 0.016, 0.42), (0.0, -PED_Y + 0.03, zc1 - 0.21), cw, bevel=0.002))
    pp.SUPPORT[:] = [top]
    return top


def chair(x, y, turn=-90.0, size=0.91):
    """Tim's chair: the wooden dining-chair prop (its front along +X in the file), refinished as satin hardwood."""
    c = props.load("dining-chair", size=size, axis="z", loc=(x, y, 0.0), turn_deg=turn, sat=0.7, val=0.85)
    c.name = "tim_chair"
    bpy.context.view_layer.update()
    mt.satin_wood(c, rgb=(0.075, 0.04, 0.022))
    return c


# ---------------------------------------------------------------- the lamp (from evidence_table.py)
def lamp():
    """The desk-lamp prop finished as dark enamel with a pale reflector, a bulb in it, and its light: a spot down the
    reflector's axis (wider than the shade's mouth, so the shade itself cuts the pool's edge), a small point at the
    bulb for the glow inside the shade, and a weak spill behind the head (the light that leaves a real shade's vents
    and joints: it washes the blinds and the wall behind the lamp). Returns the holder."""
    x, y, t = LAMP
    place = Matrix.Translation((x, y, TOP)) @ Matrix.Rotation(math.radians(t), 4, "Z")
    h = props.load("desk-lamp", size=LAMP_SIZE, axis="z", loc=(0, 0, 0), turn_deg=0, sat=0.45, val=0.2, rough_add=0.0)
    bpy.context.view_layer.update()
    n_in = 0
    for o in [c for c in h.children_recursive if c.type == "MESH"]:
        mw = o.matrix_world
        nm = mw.to_3x3().inverted().transposed()
        o.data.materials.append(M["enamel"])
        idx = len(o.data.materials) - 1
        for p in o.data.polygons:
            c = mw @ p.center
            n = (nm @ p.normal).normalized()
            d = BULB - c
            if d.length < 0.115 * _K and n.dot(d) > 0.2 * d.length and (c - BULB).dot(AXIS) > -0.02 * _K:
                p.material_index = idx
                n_in += 1
    # the generated material is mostly bare metal, which mirrors the dark room: finish it as painted enamel
    for mat in {s.material for o in h.children_recursive if o.type == "MESH" for s in o.material_slots if s.material}:
        if mat is M["enamel"]:
            continue
        nt = mat.node_tree
        bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf is None:
            continue
        for sock, op, k, add in (("Roughness", "MULTIPLY_ADD", 0.2, 0.28), ("Metallic", "MINIMUM", 0.12, None)):
            inp = bsdf.inputs[sock]
            mm = nt.nodes.new("ShaderNodeMath")
            mm.operation = op
            mm.inputs[1].default_value = k
            if add is not None:
                mm.inputs[2].default_value = add
            if inp.is_linked:
                nt.links.new(inp.links[0].from_socket, mm.inputs[0])
            else:
                mm.inputs[0].default_value = inp.default_value
            nt.links.new(mm.outputs[0], inp)
        bsdf.inputs["Specular IOR Level"].default_value = 0.5
    # The imported shade's rim is offset from its light source. Seat the enamel
    # lining just inside the measured 79 mm radius so the mouth stays continuous.
    optical_center = BULB - AXIS.cross(Vector((1, 0, 0))) * (0.0385 * _K)
    profile = [(0.0, 0.025), (0.014, 0.027), (0.029, 0.032), (0.047, 0.040),
               (0.062, 0.049), (0.0735, 0.061), (0.0775, 0.0715)]
    liner = lathe("enamel shade lining", [(r * _K, z * _K) for r, z in profile],
                  tuple(optical_center), M["enamel"], segs=80)
    liner.rotation_euler = AXIS.to_track_quat("Z", "Y").to_euler()
    liner.visible_shadow = False
    parts = [liner]
    src = BULB + AXIS * SPOT_OUT
    bulb = sk.sphere("lamp_bulb", 0.019 * _K, tuple(optical_center + AXIS * (0.052 * _K)), M["bulb"], segs=32)
    bulb.visible_shadow = False
    bulb.visible_diffuse = False
    bulb.visible_volume_scatter = False
    parts.append(bulb)
    sp = spot("lamp_spot", tuple(src), tuple(src + AXIS), 40.0, WARM, 150.0, 0.25, 0.026)
    parts.append(sp)
    parts.append(point("lamp_glow", tuple(BULB - AXIS * 0.004), 0.22, WARM, 0.012))
    # the spill behind and over the head (outside the shade, so the shade does not cut it)
    # (aimed up and back: it washes the blinds, the wall and the bookcase behind the lamp, and the lamp's own base
    # stays in its head's shadow)
    spill_at = BULB + Vector((0.0, -0.11 * _K, 0.16 * _K))
    back = spot("lamp_spill", tuple(spill_at), tuple(spill_at + Vector((0.0, -0.5, 0.85))), 7.0, WARM, 150.0, 0.7, 0.04)
    parts.append(back)
    # a thin warm rim that only the lamp itself sees: the shade's top edge and the arm read against the dark
    rim_at = Vector((0.0, BULB.y - 0.13, BULB.z + 0.2))
    rim = area("lamp_rim", tuple(rim_at), (0.1, 0.1), 0.7, WARM, spread=120, aim=tuple(BULB + Vector((0.0, -0.04, 0.02))))
    rim.visible_camera = False
    recv = bpy.data.collections.new("lamp_rim_receivers")
    for o in h.children_recursive:
        if o.type == "MESH":
            recv.objects.link(o)
    try:
        rim.light_linking.receiver_collection = recv
    except AttributeError:
        rim.data.energy = 0.25
    parts.append(rim)
    bpy.context.view_layer.update()
    for o in parts:
        o.matrix_world = place @ o.matrix_world
    h.location = (x, y, TOP - 0.0006)
    h.rotation_euler = (0, 0, math.radians(t))
    bpy.context.view_layer.update()
    print(f"TIMDESK lamp: reflector faces {n_in}, bulb at {tuple(round(v, 3) for v in bulb.matrix_world.translation)}", flush=True)
    return h


def lamp_bulb():
    """World position of the lamp's light (the bulb's glowing end)."""
    bpy.context.view_layer.update()
    return bpy.data.objects["lamp_spot"].matrix_world.translation.copy()


# ---------------------------------------------------------------- the laptop (from evidence_table.py)
def laptop():
    """The laptop prop open, its screen switched on to a blank page: a glowing panel inset in the lid's bezel (found
    by ray casts) and a weak area light in front of it, so the glow falls on what is near; an unlettered key deck."""
    h = props.load("laptop", size=0.36, axis="long", loc=(0, 0, 0), turn_deg=0, sat=0.45, val=0.8, rough_add=0.12)
    tree = props.surface_bvh(h)
    hits = []
    for yy in (-0.1, -0.05, 0.0, 0.05, 0.1):
        for zz in (0.07, 0.1, 0.13, 0.16, 0.19):
            r = tree.ray_cast(Vector((-0.4, yy, zz)), Vector((1, 0, 0)))
            if r[0] is not None and r[0].x > 0.05:
                hits.append(r[0])
    n = len(hits)
    mz = sum(p.z for p in hits) / n
    mx = sum(p.x for p in hits) / n
    b = sum((p.z - mz) * (p.x - mx) for p in hits) / sum((p.z - mz) ** 2 for p in hits)
    a = mx - b * mz
    up = Vector((b, 0.0, 1.0)).normalized()
    nrm = Vector((-1.0, 0.0, b)).normalized()
    zbot = 0.03
    base = Vector((a + b * zbot, 0.0, zbot))

    def dev(y, sd):
        r = tree.ray_cast(base + up * sd + Vector((0.0, y, 0.0)) + nrm * 0.05, -nrm, 0.1)
        return None if r[0] is None else 0.05 - r[3]

    def edge(y, sd, dy, dsd):
        while True:
            d = dev(y + dy, sd + dsd)
            if d is None or d > 0.0025 or abs(y) > 0.3 or sd > 0.4 or sd < -0.05:
                return y, sd
            y, sd = y + dy, sd + dsd
    s_mid = 0.12
    ymax, _ = edge(0.0, s_mid, 0.001, 0.0)
    ymin, _ = edge(0.0, s_mid, -0.001, 0.0)
    _, s_top = edge((ymin + ymax) / 2, s_mid, 0.0, 0.001)
    _, s_bot = edge((ymin + ymax) / 2, s_mid, 0.0, -0.001)
    ins = 0.003
    s0, s1 = s_bot + ins, s_top - ins
    w = (ymax - ymin) - 2 * ins
    hh = s1 - s0
    base = base + Vector((0.0, (ymin + ymax) / 2, 0.0))
    proud = max(d for d in (dev((ymin + ymax) / 2 - w / 2 + w * i / 12, s0 + hh * j / 8) for i in range(13) for j in range(9))
                if d is not None)
    centre = base + up * ((s0 + s1) / 2) + nrm * (max(proud, 0.0) + 0.0007)
    xaxis = up.cross(nrm).normalized()
    rot = Matrix((xaxis, up, nrm)).transposed()
    print(f"TIMDESK laptop lid {n} hits, slope {b:.3f}; panel {w:.3f} x {hh:.3f}, {proud * 1000:.1f} mm proud", flush=True)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5, matrix=Matrix.Diagonal((w, hh, 1, 1)))
    scr = _link("laptop_screen", bm, mt.screen("laptop screen", COOL, 1.25, w, hh))
    scr.matrix_world = Matrix.Translation(centre) @ rot.to_4x4()
    li = area("laptop_screen_light", tuple(centre + nrm * 0.02), (w, hh), 3.5, COOL, spread=150)
    bpy.context.view_layer.update()
    li.matrix_world = Matrix.Translation(centre + nrm * 0.02) @ (rot @ Matrix.Rotation(math.pi, 3, "X")).to_4x4()
    li.visible_camera = False
    li.visible_glossy = False
    li.visible_shadow = False
    deck = box("laptop key well", (0.132, 0.325, 0.0034), (-0.009, 0, 0.0236), M["deck"], bevel=0.0015)
    bm = bmesh.new()
    rows = ((1,) * 14, (1.4,) + (1,) * 12 + (1.4,), (1.65,) + (1,) * 11 + (1.95,),
            (2,) + (1,) * 10 + (2.5,), (1.4, 1.3, 1.3, 5.9, 1.3, 1.3, 1.4))
    for row, units in enumerate(rows):
        pitch = 0.308 / sum(units)
        y0 = -0.154
        for unit in units:
            span = unit * pitch
            add_box(bm, (0.017, span - 0.0023, 0.0023), (0.035 - row * 0.022, y0 + span / 2, 0.026))
            y0 += span
    keys = bevelled(_link("laptop blank keys", bm, M["key"]), 0.0008, 2)
    x, y, t = LAPTOP
    place = Matrix.Translation((x, y, TOP)) @ Matrix.Rotation(math.radians(t), 4, "Z")
    bpy.context.view_layer.update()
    for o in (scr, li, deck, keys):
        o.matrix_world = place @ o.matrix_world
    h.location = (x, y, TOP - 0.0004)
    h.rotation_euler = (0, 0, math.radians(t))
    bpy.context.view_layer.update()
    return [h] + list(h.children_recursive) + [scr, li, deck, keys]


# ---------------------------------------------------------------- small things built here
def photo_frame(x, y, turn, lean=14.0):
    """A framed 5 x 7 photograph standing on its easel back, leaning `lean` degrees: a dark wood frame, glass over a
    blank print (its picture is left as one dark tone), a hardboard back with turn buttons and a hinged strut.
    Built facing local -Y; `turn` 180 faces it to +Y."""
    w, h, bar, dep = 0.127, 0.178, 0.02, 0.016
    W, H = w + 2 * bar - 0.008, h + 2 * bar - 0.008
    parts = []
    for nm, s, l in (("T", (W, dep, bar), (0, 0, H - bar / 2)), ("B", (W, dep, bar), (0, 0, bar / 2)),
                     ("L", (bar, dep, H - 2 * bar), (-W / 2 + bar / 2, 0, H / 2)), ("R", (bar, dep, H - 2 * bar), (W / 2 - bar / 2, 0, H / 2))):
        parts.append(box(f"frame_{nm}", s, l, M["frame"], bevel=0.0035))
    gl = box("frame_glass", (w + 0.004, 0.0015, h + 0.004), (0, -dep / 2 + 0.0045, H / 2), M["glass"])
    gl.visible_shadow = False
    parts.append(gl)
    ph = box("frame_photo", (0.127, 0.178, 0.0006), (0, -dep / 2 + 0.0062, H / 2), M["photo"], rot=(math.pi / 2, 0, 0))
    parts.append(ph)
    parts.append(box("frame_back", (W - 0.012, 0.003, H - 0.012), (0, dep / 2 - 0.001, H / 2), M["hardboard"], bevel=0.001))
    for i, (bx, bz) in enumerate(((-W / 2 + 0.03, H / 2), (W / 2 - 0.03, H / 2), (0, H - 0.028), (0, 0.028))):
        parts.append(box(f"frame_button{i}", (0.022, 0.0015, 0.007), (bx, dep / 2 + 0.001, bz), M["pull"], bevel=0.0006,
                         rot=(0, math.radians(90 if i < 2 else 0), 0)))
    # the strut: hinged two thirds up the back, its foot on the desk behind the frame
    a = math.radians(lean)
    hz = H * 0.66
    foot_back = hz * math.tan(a) + hz * math.tan(math.radians(17.0))
    ln = math.hypot(foot_back, hz)
    st = box("frame_strut", (0.036, 0.004, ln), (0, 0, 0), M["hardboard"], bevel=0.0012)
    hold = bpy.data.objects.new("photo_frame", None)
    bpy.context.scene.collection.objects.link(hold)
    tilt = Matrix.Rotation(-a, 4, "X")
    bpy.context.view_layer.update()
    for o in parts:
        o.matrix_world = tilt @ o.matrix_world
        o.parent = hold
    hinge = tilt @ Vector((0, dep / 2 + 0.003, hz))
    foot = Vector((0, hinge.y + hz * math.tan(math.radians(17.0)), 0.0))
    d = hinge - foot
    st.matrix_world = Matrix.Translation((hinge + foot) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4()
    st.parent = hold
    hold.location = (x, y, TOP)
    hold.rotation_euler = (0, 0, math.radians(turn))
    bpy.context.view_layer.update()
    return [hold] + parts + [st]


def phone(x, y, turn):
    """A phone lying face down: a slab with a metal band, a plain back, a small camera island. No mark of any kind."""
    mw = Matrix.Translation((x, y, TOP)) @ Matrix.Rotation(math.radians(turn), 4, "Z")
    out = []
    for nm, s, l, m, bev, seg in (("band", (0.0715, 0.1475, 0.0064), (0, 0, 0.0042), M["phone_edge"], 0.003, 4),
                                  ("back", (0.0695, 0.1455, 0.0012), (0, 0, 0.0078), M["phone"], 0.0006, 2),
                                  ("glass", (0.0695, 0.1455, 0.001), (0, 0, 0.0006), M["lens"], 0.0005, 2),
                                  ("island", (0.03, 0.03, 0.0016), (-0.0165, 0.053, 0.0088), M["phone"], 0.0008, 3)):
        o = box(f"phone_{nm}", s, (0, 0, 0), m, bevel=bev, seg=seg)
        o.matrix_world = mw @ Matrix.Translation(l)
        out.append(o)
    for i, (lx, ly) in enumerate(((-0.0225, 0.059), (-0.0105, 0.047))):
        o = cyl(f"phone_lens{i}", 0.0052, 0.0012, (0, 0, 0), M["lens"], verts=24)
        o.matrix_world = mw @ Matrix.Translation((lx, ly, 0.0099))
        out.append(o)
    return out


def reading_glasses(x, y, turn):
    """A folded wire pair, resting on its temples and nose pads on whatever is under it (from the evidence table)."""
    transform = pp.frame(x, y, turn)
    z, _, _ = pp.settle(transform, [(-0.056, -0.016), (0.056, -0.016), (0, 0.016)])
    transform = pp.frame(x, y, turn, z)
    parts = []

    def wire(name, pts, radius, mat, closed=False):
        cu = bpy.data.curves.new(name, "CURVE")
        cu.dimensions, cu.bevel_depth, cu.bevel_resolution = "3D", radius, 3
        spline = cu.splines.new("POLY")
        spline.points.add(len(pts) - 1)
        for pt, xyz in zip(spline.points, pts):
            pt.co = (*xyz, 1)
        spline.use_cyclic_u = closed
        ob = pp.link(bpy.data.objects.new(name, cu))
        cu.materials.append(mat)
        ob.matrix_world = transform
        parts.append(ob)

    for side in (-1, 1):
        contour = []
        for j in range(56):
            a = math.tau * j / 56
            contour.append((side * 0.030 + 0.0245 * math.cos(a), 0.0175 * math.sin(a), 0.0065 + 0.10 * 0.0175 * math.sin(a)))
        wire("lens rim", contour, 0.00085, M["wire"], closed=True)
        wire("folded spectacle temple", [(side * 0.055, 0.007, 0.007), (side * 0.055, 0.014, 0.0024), (-side * 0.031, 0.013, 0.0024)], 0.0009, M["wire"])
        wire("spectacle temple tip", [(-side * 0.030, 0.013, 0.0024), (-side * 0.046, 0.009, 0.002), (-side * 0.051, 0.004, 0.0018)], 0.00145, M["acetate"])
    wire("spectacle bridge", [(-0.007, 0.006, 0.007), (-0.003, 0.011, 0.009), (0.003, 0.011, 0.009), (0.007, 0.006, 0.007)], 0.00095, M["wire"])
    return parts


def hand_pen(tip, axis):
    """The pen in Tim's hand: the same capped ballpoint as the one on the pad, its point at `tip`, its barrel along
    `axis` (world, from the point toward the cap)."""
    L, r = 0.143, 0.0046
    prof = [(0.0, -L / 2), (0.0011, -L / 2 + 0.0003), (0.0016, -L / 2 + 0.003), (0.0028, -L / 2 + 0.009), (r * 0.92, -L / 2 + 0.02),
            (r, -L / 2 + 0.03), (r, L / 2 - 0.006), (r * 0.9, L / 2 - 0.0015), (r * 0.6, L / 2), (0.0, L / 2)]
    body = pp._solid_of_revolution("hand_pen", prof, M["pen"], 32)
    ring = pp._solid_of_revolution("hand_pen_ring", [(0.0, -0.0001), (r * 1.02, 0.0), (r * 1.02, 0.0016), (0.0, 0.0017)], M["pen_metal"], 32)
    ring.location = (0, 0, -L / 2 + 0.035)
    clip = box("hand_pen_clip", (0.0032, 0.0013, 0.042), (0.0, r + 0.0011, L / 2 - 0.028), M["pen_metal"], bevel=0.0005, seg=2)
    root = bpy.data.objects.new("hand_pen_root", None)
    bpy.context.scene.collection.objects.link(root)
    axis = Vector(axis).normalized()
    # The top sheet bows above the nominal pad height. Intersect the actual
    # surface along the shaft so the nib touches and the grip stays aligned.
    sheet = bpy.data.objects["pad_sheet"].evaluated_get(bpy.context.evaluated_depsgraph_get())
    inverse = sheet.matrix_world.inverted()
    hit, point, _, _ = sheet.ray_cast(inverse @ (Vector(tip) + axis * 0.025),
                                      (inverse.to_3x3() @ -axis).normalized())
    contact = sheet.matrix_world @ point if hit else Vector(tip)
    root.matrix_world = Matrix.Translation(contact + axis * (L / 2)) @ axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
    for o in (body, ring, clip):
        o.parent = root
    bpy.context.view_layer.update()
    return [root, body, ring, clip]


# ---------------------------------------------------------------- what lies on the desk
def letter_tray(x, y):
    """A shallow open card box. The envelopes stand on their long edges."""
    width, depth, height, gauge = 0.257, 0.153, 0.064, 0.0035
    tray = [box("letter tray bottom", (width, depth, gauge), (x, y, TOP + gauge / 2), M["card"])]
    for side in (-1, 1):
        tray.append(box("letter tray side", (gauge, depth, height),
                        (x + side * (width - gauge) / 2, y, TOP + height / 2), M["card"], bevel=0.0007))
        tray.append(box("letter tray end", (width - 2 * gauge, gauge, height),
                        (x, y + side * (depth - gauge) / 2, TOP + height / 2), M["card"], bevel=0.0007))
    rng = random.Random(72)
    for i in range(43):
        w, h = rng.uniform(0.194, 0.227), rng.uniform(0.091, 0.106)
        pitch = math.radians(8 + 3 * math.sin(i / 6))
        row_y = y - 0.064 + i * 0.00265
        center = (x + rng.uniform(-0.003, 0.003), row_y + h * math.sin(pitch) / 2,
                  TOP + gauge + h * math.cos(pitch) / 2)
        stock = M["white_env"] if i % 5 < 2 else M["cream"]
        tray.append(box("filed envelope", (w, 0.00125, h), center, stock,
                        bevel=0.0004, rot=(-pitch, 0, rng.uniform(-0.002, 0.002))))
    return tray


def papers(pad=PAD):
    """Lay the desk's papers bottom to top (each drops onto what is already there). Returns the top sheet of the
    pad. Tim's left is +X; the letters he has had back lie to his right (-X), in the camera's foreground."""
    m = M
    px, py, pt = pad
    # two written-over sheets pushed aside to his left, under the pad's edge (blank: only paper)
    group("papers", pp.sheet("sheet_b", m["paper2"], 0.216, 0.279, px + 0.2, py + 0.02, pt - 22.0,
                             shape=pp.sheet_shape(0.216, 0.279, 7, corners=(0.0, 0.0, 0.006, 0.0), wave=0.0009)))
    group("papers", pp.sheet("sheet_a", m["paper"], 0.216, 0.279, px + 0.17, py - 0.015, pt - 9.0,
                             shape=pp.sheet_shape(0.216, 0.279, 3, corners=(0.008, 0.0, 0.0, 0.0), wave=0.0008)))
    parts, top = pp.writing_pad("pad", m["ruled"], m["block"], m["board"], m["tape"], px, py, pt)
    group("papers", parts)
    # to his right (the camera's foreground in `desk`): two official replies in window envelopes with one letter
    # unfolded across them, a banded bundle of airmail letters in the back corner, a loose pile of them near the
    # front edge
    group("papers", pp.envelope_front("reply_env_a", m["window_env"], -0.635, 0.0, 97.0, seed=2))
    group("papers", pp.envelope_front("reply_env_b", m["window_env"], -0.6, 0.07, 84.0, seed=5))
    group("papers", pp.sheet("reply_letter", m["paper"], 0.216, 0.279, -0.47, -0.02, 100.0, shape="trifold"))
    group("papers", letter_tray(-0.54, -0.245))
    b, _ = pp.bundle("bundle", [m["airmail_uv"], m["airmail_uv"], m["cream"], m["airmail_uv"]], m["band"], -0.54, 0.22, -6.0, n=17, seed=4)
    group("papers", b)
    return top


def desk_things(pad=PAD):
    """The hard things on the desk (after the papers, so they rest on them)."""
    m = M
    px, py, pt = pad
    group("mug", pp.mug("mug", m["glaze"], m["bisque"], m["coffee"], 0.24, -0.015, 105.0))
    group("glasses", reading_glasses(px + 0.035, py - 0.105, pt - 180.0))
    group("phone", phone(-0.245, -0.03, 12.0))
    group("frame", photo_frame(-0.12, -0.19, 121.0))
    # the photograph stands with its back to the window, under the stool's shadow: the night's light on that back
    # (only the frame sees it), so the hardboard, the strut and the turn buttons read from the desk camera
    kick = area("frame_kicker", (-0.5, -0.33, TOP + 0.42), (0.2, 0.14), 1.3, NIGHT, spread=120, aim=(-0.12, -0.19, TOP + 0.1))
    kick.visible_camera = False
    recv = bpy.data.collections.new("frame_kicker_receivers")
    for o in G["frame"]:
        if o.type == "MESH":
            recv.objects.link(o)
    try:
        kick.light_linking.receiver_collection = recv
    except AttributeError:
        kick.data.energy = 0.0
    # the pen lying on the pad (shown when Tim is not holding his)
    a = math.radians(pt)
    ox, oy = 0.03, 0.02
    group("pen_desk", pp.pen("pen", m["pen"], m["pen_metal"], m["pen_metal"], px + ox * math.cos(a) - oy * math.sin(a),
                             py + ox * math.sin(a) + oy * math.cos(a), pt - 128.0))
