"""The set for the night cabin: a generic wide-body economy cabin built in Python (no livery, no logos, no text).

World: metres, Z up, cabin floor at z = 0, the aircraft's nose toward +Y, starboard +X, port -X. Rows of 3-3-3
economy seats at a 0.79 m pitch (row i's seat reference, the foot of the backrest, at y = i * PITCH). The sidewall
lining follows the fuselage curve from a dark dado at the floor to the side bins, in panels three windows wide with
fine joints between them; oval window reveals cut through it at a 0.53 m pitch, each with an inner scratch pane, a
pull-down shade (most closed for the night) and the outer pane. Side and centre overhead bins in door segments with
latch recesses; passenger service units under them with reading lenses and gaspers; curved aisle ceilings lit by blue
night coves, with the soft light the ceiling gives back; a lit slot washing each sidewall; LED dashes in a floor
strip along the aisles; a front bulkhead with lit galley curtains in the two aisle openings. Outside: the night sky
dome at altitude and the port wing with its winglet, recessed white tip strobe.

One three-seat block (moulded shells with rounded tops, tray tables, blank screens, a card and a magazine in each
pocket, headrests under draped cloth covers, armrests, aisle end bays, legs, beams and floor tracks) is built once
into a collection and instanced per row and block; so is the lap belt left crossed on each empty seat.
"""
import math

import bpy
import bmesh
from mathutils import Matrix, Vector

import aircraft_cabin_mats as mt

M = mt.M
LIGHTS = {}

# ---------------------------------------------------------------- dimensions
PITCH = 0.79
N_ROWS = 18
BLOCK_X = (-1.98, 0.0, 1.98)
SEAT_DX = (-0.49, 0.0, 0.49)
ARM_DX = (-0.735, -0.245, 0.245, 0.735)
AISLES = (-0.99, 0.99)
REAR_Y, FRONT_Y = -2.05, 14.55
RECLINE = math.radians(16.0)
PIVOT_Z = 0.44                     # the backrest's hinge line above the seat reference point (y = 0)
BACK_TOP = 0.79                    # the shell's top along the reclined back (the seat's top is 1.20 m off the floor)
DV = BACK_TOP - 0.725              # how far the headrest and the screen sit above the first, shorter seat
WIN_PITCH, WIN_Z, WIN_W, WIN_H = 0.53, 1.15, 0.27, 0.42


def row_y(i):
    return i * PITCH


# the sidewall lining (starboard, x > 0): dado at the floor, then the curved wall up to the side bin
DADO = [(2.60, 0.0), (2.615, 0.30), (2.67, 0.39)]
SIDEWALL = [(2.66, 0.37), (2.70, 0.42), (2.78, 0.62), (2.83, 0.85), (2.852, 1.05), (2.856, 1.20), (2.848, 1.36),
            (2.81, 1.55), (2.75, 1.70), (2.70, 1.83)]
SIDE_BIN = [(2.74, 1.785), (1.44, 1.835), (1.405, 1.875), (1.39, 1.98), (1.395, 2.10), (1.415, 2.20), (1.45, 2.28),
            (1.50, 2.335), (2.30, 2.42), (2.66, 2.20)]
CENTRE_BIN = [(-0.70, 1.945), (0.70, 1.945), (0.735, 1.985), (0.75, 2.09), (0.765, 2.21), (0.79, 2.32),
              (0.82, 2.40), (0.70, 2.56), (-0.70, 2.56), (-0.82, 2.40), (-0.79, 2.32), (-0.765, 2.21), (-0.75, 2.09),
              (-0.735, 1.985)]
AISLE_CEIL = [(1.56, 2.36), (1.45, 2.46), (1.30, 2.55), (1.15, 2.59), (1.00, 2.585), (0.86, 2.53), (0.76, 2.44)]


def lining_x(z):
    """The sidewall's |x| at height z (for placing things against it)."""
    pts = DADO[:2] + SIDEWALL[1:]
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        if z0 <= z <= z1:
            return x0 + (x1 - x0) * (z - z0) / (z1 - z0)
    return pts[-1][0]


# ---------------------------------------------------------------- mesh helpers
def _coll():
    return bpy.context.scene.collection


def mesh_obj(name, verts, faces, m, smooth=True, coll=None, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.validate()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    (coll or _coll()).objects.link(ob)
    ob.location = loc
    if m is not None:
        ob.data.materials.append(m)
    return ob


def finish(ob, bevel=0.0, segs=3, wn=True, angle=None):
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments = bevel, segs
        bv.limit_method = "ANGLE"
        bv.angle_limit = math.radians(angle or 35)
        bv.harden_normals = False
    if wn:
        ob.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = True
    return ob


def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0), coll=None, segs=3):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Diagonal((*size, 1)))
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    (coll or _coll()).objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    ob.data.materials.append(m)
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments = bevel, segs
        ob.modifiers.new("wn", "WEIGHTED_NORMAL")
        for p in me.polygons:
            p.use_smooth = True
    return ob


def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=24, r2=None, coll=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    (coll or _coll()).objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    ob.data.materials.append(m)
    return ob


def tube(name, a, b, r, m, coll=None, verts=16):
    a, b = Vector(a), Vector(b)
    d = b - a
    ob = cyl(name, r, d.length, (a + b) / 2, m, verts=verts, coll=coll)
    ob.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    return ob


def sweep(name, profile, y0, y1, m, coll=None, closed=False, flip_x=False, cap=True):
    """Extrude a 2D profile [(x, z)] along Y from y0 to y1 (closed: a solid prism with end caps)."""
    s = -1.0 if flip_x else 1.0
    n = len(profile)
    verts = [(s * x, y0, z) for x, z in profile] + [(s * x, y1, z) for x, z in profile]
    faces = []
    rng = n if closed else n - 1
    for i in range(rng):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    if closed and cap:
        faces.append(tuple(reversed(range(n))))
        faces.append(tuple(range(n, 2 * n)))
    ob = mesh_obj(name, verts, faces, m, coll=coll)
    if flip_x:
        me = ob.data
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
        bm.to_mesh(me)
        bm.free()
    return ob


def prism_x(name, profile_yz, x0, x1, m, coll=None):
    """Extrude a closed (y, z) profile across X from x0 to x1 (cushions, armrests)."""
    n = len(profile_yz)
    verts = [(x0, y, z) for y, z in profile_yz] + [(x1, y, z) for y, z in profile_yz]
    faces = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    faces.append(tuple(reversed(range(n))))
    faces.append(tuple(range(n, 2 * n)))
    ob = mesh_obj(name, verts, faces, m, coll=coll)
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    return ob


def superellipse(a, b, n=2.6, N=40):
    pts = []
    for k in range(N):
        t = 2 * math.pi * k / N
        c, s = math.cos(t), math.sin(t)
        pts.append((a * math.copysign(abs(c) ** (2 / n), c), b * math.copysign(abs(s) ** (2 / n), s)))
    return pts


def loft(name, rings, m, coll=None, closed_end=False):
    """A tube through rings of equal point count (each ring a list of 3D points)."""
    N = len(rings[0])
    verts = [v for r in rings for v in r]
    faces = []
    for k in range(len(rings) - 1):
        for i in range(N):
            j = (i + 1) % N
            faces.append((k * N + i, k * N + j, (k + 1) * N + j, (k + 1) * N + i))
    if closed_end:
        faces.append(tuple(range((len(rings) - 1) * N, len(rings) * N)))
    return mesh_obj(name, verts, faces, m, coll=coll)


def area(name, loc, size, energy, colour, spread=180, rot=(0, 0, 0), aim=None, shape="RECTANGLE"):
    li = bpy.data.lights.new(name, "AREA")
    li.shape = shape
    li.size, li.size_y = size
    li.energy, li.color, li.spread = energy, colour, math.radians(spread)
    ob = bpy.data.objects.new(name, li)
    _coll().objects.link(ob)
    ob.location = loc
    if aim is not None:
        ob.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    else:
        ob.rotation_euler = rot
    LIGHTS[name] = ob
    return ob


def spot(name, loc, aim, energy, colour, size_deg, blend, radius=0.02):
    li = bpy.data.lights.new(name, "SPOT")
    li.energy, li.color = energy, colour
    li.spot_size, li.spot_blend = math.radians(size_deg), blend
    li.shadow_soft_size = radius
    ob = bpy.data.objects.new(name, li)
    _coll().objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    LIGHTS[name] = ob
    return ob


def point(name, loc, energy, colour, radius=0.03):
    li = bpy.data.lights.new(name, "POINT")
    li.energy, li.color, li.shadow_soft_size = energy, colour, radius
    ob = bpy.data.objects.new(name, li)
    _coll().objects.link(ob)
    ob.location = loc
    LIGHTS[name] = ob
    return ob


# ---------------------------------------------------------------- the seat block (instanced)
def back_pt(x, v, w):
    """A point in the backrest frame (v up the reclined back from the hinge, w behind its front plane) -> block local."""
    sr, cr = math.sin(RECLINE), math.cos(RECLINE)
    return Vector((x, -v * sr - w * cr, PIVOT_Z + v * cr - w * sr))


def back_rot():
    return (RECLINE, 0.0, 0.0)          # a box built in the backrest frame (v along +Z, w along -Y) rotated about X


def back_box(name, xs, vs, ws, m, coll, bevel, segs=3):
    """A box in the backrest frame: xs, vs, ws are (min, max)."""
    size = (xs[1] - xs[0], ws[1] - ws[0], vs[1] - vs[0])
    c = back_pt((xs[0] + xs[1]) / 2, (vs[0] + vs[1]) / 2, (ws[0] + ws[1]) / 2)
    return box(name, size, c, m, bevel=bevel, rot=back_rot(), coll=coll, segs=segs)


CUSHION = [(-0.03, 0.36), (0.44, 0.36), (0.485, 0.385), (0.497, 0.425), (0.485, 0.458), (0.45, 0.470), (0.30, 0.468),
           (0.12, 0.457), (0.0, 0.447), (-0.03, 0.44)]


def cushion_top(y):
    """Height of the seat cushion's top at block-local y (the sitter's side of the profile)."""
    pts = [(-0.03, 0.44), (0.0, 0.447), (0.12, 0.457), (0.30, 0.468), (0.45, 0.470), (0.485, 0.458)]
    for (y0, z0), (y1, z1) in zip(pts, pts[1:]):
        if y0 <= y <= y1:
            return z0 + (z1 - z0) * (y - y0) / (y1 - y0)
    return pts[0][1] if y < pts[0][0] else pts[-1][1]


def back_front_y(z):
    """The backrest cushion's front face (block-local y) at height z."""
    sr, cr = math.sin(RECLINE), math.cos(RECLINE)
    w = -0.072
    v = (z - PIVOT_Z + w * sr) / cr
    return -v * sr - w * cr


def rslab(name, xs, vs, ws, m, coll, rt=0.06, rb=0.02, bevel=0.012, segs=3, arc=6):
    """A slab in the backrest frame with rounded corners in its face (top radius rt, bottom rb), edges bevelled."""
    (x0, x1), (v0, v1) = xs, vs
    pts = []

    def corner(cx, cv, r, a0):
        for k in range(arc + 1):
            t = a0 + (math.pi / 2) * k / arc
            pts.append((cx + r * math.cos(t), cv + r * math.sin(t)))
    corner(x1 - rt, v1 - rt, rt, 0.0)
    corner(x0 + rt, v1 - rt, rt, math.pi / 2)
    corner(x0 + rb, v0 + rb, rb, math.pi)
    corner(x1 - rb, v0 + rb, rb, 1.5 * math.pi)
    n = len(pts)
    verts = [back_pt(x, v, ws[0]) for x, v in pts] + [back_pt(x, v, ws[1]) for x, v in pts]
    faces = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    faces.append(tuple(range(n)))
    faces.append(tuple(reversed(range(n, 2 * n))))
    ob = mesh_obj(name, verts, faces, m, coll=coll)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(ob.data)
    bm.free()
    return finish(ob, bevel, segs, angle=50)


def cover_cloth(name, sx, coll, half=0.15):
    """The headrest cover: a strip of cloth draped over the seat's top (rounded where it turns over the front and the
    back edge), 19 cm down the front and 9 cm down the back, with a little thickness and a slight crumple."""
    top, front, back, r = BACK_TOP + 0.0045, -0.0885, 0.0515, 0.027
    prof = [(front, 0.60 + (top - r - 0.60) * k / 6) for k in range(6)]
    prof += [(front + r - r * math.cos(math.pi / 2 * k / 6), top - r + r * math.sin(math.pi / 2 * k / 6)) for k in range(7)]
    prof += [(front + r + (back - front - 2 * r) * k / 3, top) for k in (1, 2)]
    prof += [(back - r + r * math.sin(math.pi / 2 * k / 6), top - r + r * math.cos(math.pi / 2 * k / 6)) for k in range(7)]
    prof += [(back, top - r - (top - r - 0.70) * k / 3) for k in (1, 2, 3)]
    nx = 14
    verts, faces = [], []
    for i in range(nx + 1):
        x = sx - half + 2 * half * i / nx
        across = 2 * i / nx - 1
        edge = abs(across) ** 6
        for j, (w, v) in enumerate(prof):
            front_hem = max(0.0, 1.0 - j / 5)
            back_hem = max(0.0, 1.0 - (len(prof) - 1 - j) / 3)
            ripple = 0.0025 * math.sin(0.72 * i + 4 * sx)
            dv = front_hem * (-0.006 * edge - 0.012 * (1 - across**2) + ripple)
            dv += back_hem * (-0.005 * (1 - across**2) + 0.7 * ripple)
            verts.append(back_pt(x, v + dv, w))
    n = len(prof)
    for i in range(nx):
        for j in range(n - 1):
            faces.append((i * n + j, i * n + j + 1, (i + 1) * n + j + 1, (i + 1) * n + j))     # normals outward
    ob = mesh_obj(name, verts, faces, M["cover"], coll=coll)
    sub = ob.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = 1
    tex = bpy.data.textures.get("cover crumple") or bpy.data.textures.new("cover crumple", "CLOUDS")
    tex.noise_scale = 0.05
    dm = ob.modifiers.new("crumple", "DISPLACE")
    dm.texture, dm.strength, dm.mid_level, dm.texture_coords = tex, 0.006, 0.4, "GLOBAL"
    so = ob.modifiers.new("thick", "SOLIDIFY")
    so.thickness, so.offset = 0.0025, 1.0
    return ob


def seat_parts(coll, sx, aisle_side=0):
    """One seat at block-local x = sx."""
    # seat cushion: the profile across x, then rounded
    c = prism_x(f"cushion_{sx:+.2f}", CUSHION, sx - 0.212, sx + 0.212, M["seat"], coll)
    finish(c, 0.03, 4, angle=30)
    sub = c.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = 1
    c.modifiers.move(c.modifiers.find("sub"), 0)
    fixed_parts = set(coll.objects)
    # the backrest cushion with a gentle lumbar roll, the headrest with side wings
    rslab(f"backcush_{sx:+.2f}", (sx - 0.208, sx + 0.208), (0.03, 0.50 + DV), (-0.072, 0.0), M["seat"], coll, 0.035, 0.03,
          0.028, 4)
    back_box(f"lumbar_{sx:+.2f}", (sx - 0.19, sx + 0.19), (0.10, 0.24), (-0.09, -0.05), M["seat"], coll, 0.03, 4)
    rslab(f"headrest_{sx:+.2f}", (sx - 0.17, sx + 0.17), (0.50 + DV, 0.722 + DV), (-0.085, 0.0), M["seat_dark"], coll,
          0.05, 0.03, 0.03, 4)
    for k in (-1, 1):
        w = back_box(f"wing_{sx:+.2f}_{k}", (sx + k * 0.19 - 0.03, sx + k * 0.19 + 0.03), (0.52 + DV, 0.70 + DV),
                     (-0.10, -0.01), M["seat_dark"], coll, 0.022, 3)
        w.rotation_euler.z = k * 0.25
    # the headrest cover: one cloth laid over the top, hanging down the front and a little down the back
    cover_cloth(f"cover_{sx:+.2f}", sx, coll)
    # the moulded shell behind: a deep tray with its rim forward round the cushions
    rslab(f"shell_{sx:+.2f}", (sx - 0.232, sx + 0.232), (-0.10, BACK_TOP), (0.0, 0.048), M["shell"], coll, 0.075, 0.03,
          0.016, 4)
    for k in (-1, 1):
        back_box(f"shellside_{sx:+.2f}_{k}", (sx + k * 0.222 - 0.012, sx + k * 0.222 + 0.012), (-0.06, 0.70),
                 (-0.075, 0.03), M["shell"], coll, 0.01, 3)
    # the back of the shell: tray table, latch, screen in its bezel, literature pocket with a card and a magazine
    back_box(f"tray_{sx:+.2f}", (sx - 0.185, sx + 0.185), (0.10, 0.37), (0.046, 0.061), M["shell"], coll, 0.008, 3)
    back_box(f"traygap_{sx:+.2f}", (sx - 0.19, sx + 0.19), (0.095, 0.375), (0.044, 0.055), M["dark_plastic"], coll, 0.004, 2)
    back_box(f"latch_{sx:+.2f}", (sx - 0.022, sx + 0.022), (0.377, 0.392), (0.046, 0.068), M["mid_plastic"], coll, 0.004, 2)
    back_box(f"bezel_{sx:+.2f}", (sx - 0.135, sx + 0.135), (0.418 + DV, 0.582 + DV), (0.044, 0.058), M["dark_plastic"],
             coll, 0.006, 3)
    back_box(f"screen_{sx:+.2f}", (sx - 0.121, sx + 0.121), (0.432 + DV, 0.567 + DV), (0.055, 0.0595), M["screen_off"],
             coll, 0.0, 1)
    back_box(f"hook_{sx:+.2f}", (sx + 0.150, sx + 0.166), (0.600 + DV, 0.626 + DV), (0.046, 0.062), M["mid_plastic"], coll,
             0.004, 2)
    back_box(f"pocket_{sx:+.2f}", (sx - 0.17, sx + 0.17), (-0.07, 0.07), (0.046, 0.072), M["seat_dark"], coll, 0.012, 3)
    back_box(f"pocketrim_{sx:+.2f}", (sx - 0.175, sx + 0.175), (0.062, 0.078), (0.046, 0.076), M["mid_plastic"], coll,
             0.005, 2)
    back_box(f"card_{sx:+.2f}", (sx - 0.135, sx - 0.005), (-0.04, 0.097), (0.053, 0.0545), M["card"], coll, 0.0, 1)
    back_box(f"magazine_{sx:+.2f}", (sx - 0.06, sx + 0.14), (-0.04, 0.089), (0.057, 0.0615), M["magazine"], coll, 0.001, 1)
    for part in set(coll.objects) - fixed_parts:
        part["back station"] = sx
    # under the cushion: the pan, the life-vest pouch
    box(f"pan_{sx:+.2f}", (0.40, 0.42, 0.03), (sx, 0.22, 0.345), M["dark_plastic"], bevel=0.006, coll=coll)
    box(f"vest_{sx:+.2f}", (0.22, 0.12, 0.05), (sx, 0.36, 0.305), M["mid_plastic"], bevel=0.008, coll=coll)


def armrest(coll, ax, aisle=0):
    """An armrest at block-local x = ax; `aisle` (+1/-1) adds the aisle end bay on that side."""
    pad = prism_x(f"armpad_{ax:+.3f}", [(-0.04, 0.605), (0.33, 0.605), (0.37, 0.615), (0.38, 0.635), (0.36, 0.648),
                                        (-0.04, 0.648)], ax - 0.026, ax + 0.026, M["dark_plastic"], coll)
    finish(pad, 0.01, 3)
    body = prism_x(f"armbody_{ax:+.3f}", [(-0.07, 0.40), (0.12, 0.40), (0.22, 0.58), (0.30, 0.61), (-0.05, 0.61),
                                         (-0.09, 0.50)], ax - 0.018, ax + 0.018, M["shell"], coll)
    finish(body, 0.008, 2)
    if aisle:
        x = ax + aisle * 0.03
        bay = prism_x(f"endbay_{ax:+.3f}", [(-0.10, 0.12), (0.40, 0.12), (0.42, 0.16), (0.30, 0.56), (0.10, 0.60),
                                           (-0.12, 0.58), (-0.14, 0.30)], x - 0.012, x + 0.012, M["shell"], coll)
        finish(bay, 0.008, 3)


def block_collection():
    coll = bpy.data.collections.new("seat_block")
    for i, sx in enumerate(SEAT_DX):
        seat_parts(coll, sx)
    for i, ax in enumerate(ARM_DX):
        armrest(coll, ax, aisle=(-1 if i == 0 else 1 if i == 3 else 0))
    # legs: two splayed frames on the floor tracks, two beams across, the baggage bar
    for lx in (-0.40, 0.40):
        tube(f"leg_front_{lx}", (lx, 0.44, 0.02), (lx, 0.30, 0.34), 0.019, M["leg"], coll)
        tube(f"leg_rear_{lx}", (lx, -0.24, 0.02), (lx, 0.02, 0.34), 0.017, M["leg"], coll)
        box(f"leg_foot_{lx}", (0.035, 0.74, 0.03), (lx, 0.10, 0.017), M["leg"], bevel=0.008, coll=coll)
        box(f"leg_web_{lx}", (0.012, 0.30, 0.14), (lx, 0.16, 0.27), M["leg"], bevel=0.005, coll=coll)
        for fy in (-0.22, 0.42):
            box(f"track_fit_{lx}_{fy}", (0.045, 0.06, 0.022), (lx, fy, 0.011), M["frame"], bevel=0.006, coll=coll)
    for by in (0.02, 0.30):
        tube(f"beam_{by}", (-0.74, by, 0.34), (0.74, by, 0.34), 0.024, M["frame"], coll)
    tube("bag_bar", (-0.62, 0.46, 0.10), (0.62, 0.46, 0.10), 0.009, M["frame"], coll)
    for lx in (-0.62, 0.0, 0.62):
        tube(f"bag_post_{lx}", (lx, 0.46, 0.10), (lx, 0.32, 0.33), 0.008, M["frame"], coll)
    return coll


def slab(name, a, b, width, thick, m, coll=None, bevel=0.0):
    """A flat strap or plate from a to b, `width` across and `thick` through, lying with its face up."""
    a, b = Vector(a), Vector(b)
    d = b - a
    length = d.length
    d.normalize()
    side = d.cross(Vector((0, 0, 1))).normalized()
    up = side.cross(d).normalized()
    ob = box(name, (width, length, thick), (a + b) / 2, m, bevel=bevel, coll=coll, segs=2)
    ob.rotation_euler = Matrix((side, d, up)).transposed().to_euler()
    return ob


def belt_collection():
    """An empty seat's lap belt, left crossed on the cushion (seat-local: x from the seat's centre)."""
    coll = bpy.data.collections.new("seat_belt")
    z = lambda y: cushion_top(y) + 0.0035          # noqa: E731
    la, lb = (-0.203, 0.03, z(0.03)), (0.105, 0.285, z(0.285))
    ra, rb = (0.203, 0.03, z(0.03) + 0.002), (-0.085, 0.262, z(0.262) + 0.0045)
    slab("belt_l", la, lb, 0.047, 0.003, M["belt"], coll)
    slab("belt_r", ra, rb, 0.047, 0.003, M["belt"], coll)
    d = (Vector(rb) - Vector(ra)).normalized()
    slab("buckle", Vector(rb) - d * 0.012, Vector(rb) + d * 0.058, 0.054, 0.014, M["buckle"], coll, bevel=0.004)
    slab("buckle_flap", Vector(rb) + d * 0.004 + Vector((0, 0, 0.008)), Vector(rb) + d * 0.05 + Vector((0, 0, 0.0085)),
         0.046, 0.003, M["buckle"], coll, bevel=0.001)
    d = (Vector(lb) - Vector(la)).normalized()
    slab("tongue", Vector(lb) - d * 0.006, Vector(lb) + d * 0.05, 0.03, 0.0025, M["buckle"], coll, bevel=0.0008)
    slab("tongue_shoe", Vector(lb) - d * 0.03, Vector(lb) + d * 0.004, 0.052, 0.006, M["buckle"], coll, bevel=0.002)
    return coll


def belts(skip=()):
    """Belts on every seat but the occupied ones (`skip`: (row, block, seat)); every other one mirrored."""
    coll = belt_collection()
    for r in range(N_ROWS):
        for b, bx in enumerate(BLOCK_X):
            for s_, sx in enumerate(SEAT_DX):
                if (r, b, s_) in skip:
                    continue
                ob = instance(f"belt_{r:02d}_{b}_{s_}", coll, (bx + sx, row_y(r), 0.0))
                if (r * 7 + b * 3 + s_ * 5) % 3 == 0:
                    ob.scale.x = -1.0


def instance(name, coll, loc):
    ob = bpy.data.objects.new(name, None)
    ob.instance_type = "COLLECTION"
    ob.instance_collection = coll
    ob.location = loc
    _coll().objects.link(ob)
    return ob


def screen_pos(bx, sx, row):
    """World centre of a seat's screen glass and the shell's back normal (toward the row behind)."""
    p = back_pt(bx + sx, 0.4995 + DV, 0.0595) + Vector((0, row_y(row), 0))
    nrm = Vector((0, -math.cos(RECLINE), -math.sin(RECLINE)))
    return p, nrm


def reclined_block(original, seat, angle, cover_offset):
    """Share the base and the adjacent seats. Pivot the entire selected back at its hinge."""
    variant = bpy.data.collections.new(f"seat block reclined {seat} {angle}")
    sx = SEAT_DX[seat]
    pivot = Matrix.Translation((0, 0, PIVOT_Z))
    recline = pivot @ Matrix.Rotation(math.radians(angle), 4, "X") @ pivot.inverted()
    for part in original.objects:
        if part.get("back station") != sx:
            variant.objects.link(part)
            continue
        cover = part.name.startswith("cover_")
        if cover and cover_offset is None:
            continue
        moved = part.copy()
        variant.objects.link(moved)
        moved.matrix_basis = recline @ part.matrix_basis
        if cover:
            moved.location.x += cover_offset
    return variant


def tray_with_cup(original, seat):
    """A folded-down tray at the sleeper's place, pivoted on the existing hinge."""
    variant = bpy.data.collections.new("seat block with open tray")
    sx = SEAT_DX[seat]
    hinge = back_pt(sx, 0.10, 0.054)
    pivot = Matrix.Translation(hinge)
    down = pivot @ Matrix.Rotation(math.pi / 2 - RECLINE, 4, "X") @ pivot.inverted()
    for part in original.objects:
        if part.name == f"tray_{sx:+.2f}":
            tray = part.copy()
            variant.objects.link(tray)
            tray.matrix_basis = down @ part.matrix_basis
        else:
            variant.objects.link(part)
    # The outward face of the folded tray faces down. The inner face carries the cup.
    base = down @ back_pt(sx + 0.064, 0.28, 0.046)
    rings = ((0.025, 0), (0.036, 0.064), (0.037, 0.066), (0.0355, 0.067),
             (0.034, 0.064), (0.024, 0.003))
    verts, faces = [], []
    for j, (radius, z) in enumerate(rings):
        for i in range(40):
            rad = math.tau * i / 40
            verts.append((radius * math.cos(rad), radius * math.sin(rad), z))
            if j:
                k = (i + 1) % 40
                faces.append(((j-1)*40+i, (j-1)*40+k, j*40+k, j*40+i))
    faces.append(tuple(reversed(range(40))))
    faces.append(tuple(range(5 * 40, 6 * 40)))
    mesh_obj("plain paper cup", verts, faces, M["card"], coll=variant, loc=base)
    return variant


def folded_blankets():
    """A single continuous piece of cloth folded three times, shared by the empty seats."""
    linen = bpy.data.collections.new("folded cabin blanket")
    profile = [(-0.130, 0.003), (-0.105, 0.004), (0.101, 0.006), (0.120, 0.008),
               (0.124, 0.012), (0.120, 0.015), (0.098, 0.017), (-0.107, 0.015),
               (-0.122, 0.019), (-0.125, 0.023), (-0.119, 0.027), (-0.100, 0.029),
               (0.084, 0.030), (0.108, 0.028), (0.116, 0.025)]
    verts, faces = [], []
    for j in range(13):
        v = j / 12
        for i, (x, z) in enumerate(profile):
            y = (v - 0.5) * 0.265 + 0.009 * math.sin(13 * x + 2 * v)
            wave = math.sin(7 * v + 11 * x) * (0.002 + 0.001 * i / len(profile))
            verts.append((x + 0.006 * math.sin(5 * v), y, z + wave))
            if i and j:
                b = len(verts) - 1
                n = len(profile)
                faces.append((b-n-1, b-n, b, b-1))
    cloth = mesh_obj("folded wool", verts, faces, M["blanket"], coll=linen)
    sub = cloth.modifiers.new("rounded folds", "SUBSURF")
    sub.levels = sub.render_levels = 2
    cloth.modifiers.new("wool thickness", "SOLIDIFY").thickness = 0.0025
    for row, block, seat, turn in ((3, 1, 0, -8), (5, 2, 0, 8), (6, 0, 2, -12), (8, 1, 1, 15),
                                   (10, 2, 1, -5), (12, 1, 0, 12), (15, 0, 1, -11)):
        loc = (BLOCK_X[block] + SEAT_DX[seat], row_y(row) + 0.23, cushion_top(0.23) + 0.006)
        fold = instance(f"folded blanket {row} {block}", linen, loc)
        fold.rotation_euler.z = math.radians(turn)


def seats(lit_screens=(), skip=(), occupied=()):
    coll = block_collection()
    protected = set(occupied) | {(r, b, s) for r, b, s, _ in lit_screens}
    # The row under the reading lamp and its sightlines are fixed. Elsewhere
    # some passengers left the seat reclined or the cloth slightly displaced.
    variants = [reclined_block(coll, 0, 6, -0.025), reclined_block(coll, 1, 8, None),
                reclined_block(coll, 2, 5, 0.028)]
    drinks = tray_with_cup(coll, 0)
    folded_blankets()
    for r in range(N_ROWS):
        for b, bx in enumerate(BLOCK_X):
            if (r, b) in skip:
                continue
            seat = (r // 2 + 2 * b) % 3
            reclined = (r + 2 * b) % 3 == 1 and (r, b, seat) not in protected and not (b == 0 and 4 <= r <= 6)
            block = variants[seat] if reclined else coll
            if (r, b) == (8, 1):
                block = drinks
            instance(f"row{r:02d}_b{b}", block, (bx, row_y(r), 0.0))
    # floor tracks under the legs, the whole length
    for bx in BLOCK_X:
        for lx in (-0.40, 0.40):
            box(f"track_{bx + lx:+.2f}", (0.032, FRONT_Y - REAR_Y - 0.3, 0.004), (bx + lx, (FRONT_Y + REAR_Y) / 2, 0.002),
                M["track"], bevel=0.0015)
    # lit screens: a blank glow on the glass, a faint spill toward the row behind
    for (r, b, s, k) in lit_screens:
        p, nrm = screen_pos(BLOCK_X[b], SEAT_DX[s], r)
        g = box(f"screenglow_{r}_{b}_{s}", (0.236, 0.002, 0.131), p + nrm * 0.0012, M["screen_on"], rot=back_rot())
        g.visible_shadow = False
        g.data.materials[0] = M["screen_on"]
        a = area(f"screenspill_{r}_{b}_{s}", p + nrm * 0.03, (0.24, 0.135), 0.35 * k, (0.62, 0.72, 0.95), spread=70,
                 aim=p + nrm * 1.0)
        a.data.specular_factor = 0.3
    return coll


# ---------------------------------------------------------------- shell of the cabin
def windows_y(DAWN_WINDOW_Y):
    """Window centres along the cabin at WIN_PITCH, one of them at DAWN_WINDOW_Y."""
    k0 = math.floor((DAWN_WINDOW_Y - (REAR_Y + 0.5)) / WIN_PITCH)
    first = DAWN_WINDOW_Y - k0 * WIN_PITCH
    ys = []
    y = first
    while y < FRONT_Y - 0.5:
        ys.append(y)
        y += WIN_PITCH
    return ys


def window_cutter(side, ys):
    verts, faces = [], []
    ring = superellipse(0.185, 0.265, 2.6, 32)
    for y in ys:
        base = len(verts)
        for x in (2.55, 3.2):
            for u, v in ring:
                verts.append((side * x, y + u, WIN_Z + v))
        n = len(ring)
        for i in range(n):
            j = (i + 1) % n
            faces.append((base + i, base + j, base + n + j, base + n + i))
        faces.append(tuple(base + i for i in reversed(range(n))))
        faces.append(tuple(base + n + i for i in range(n)))
    ob = mesh_obj(f"cutter_{side}", verts, faces, None, smooth=False)
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    ob.hide_render = True
    ob.hide_viewport = True
    return ob


def window(side, y, shade, name, glass=True):
    """One window: a flared bezel on the lining, a tapering reveal to the pane, the shade pulled `shade` (0 open,
    1 closed) down from the top, the pane."""
    N = 40
    x_in = lining_x(WIN_Z)
    rings = []
    # the flange follows the curved lining (offsets from the wall at each point's height), the tunnel goes straight
    for off, a, b in ((0.004, 0.207, 0.29), (-0.012, 0.204, 0.287), (-0.007, 0.189, 0.269), (0.012, 0.172, 0.25)):
        rings.append([(side * (lining_x(WIN_Z + v) + off), y + u, WIN_Z + v) for u, v in superellipse(a, b, 2.6, N)])
    for x, a, b in ((x_in + 0.09, 0.148, 0.222), (3.02, 0.132, 0.205)):
        rings.append([(side * x, y + u, WIN_Z + v) for u, v in superellipse(a, b, 2.6, N)])
    rv = loft(f"{name}_reveal", rings, M["reveal"])
    finish(rv, 0.0)
    # the shade: a panel across the tunnel at the pane end, its pull lip at the bottom
    if shade > 0.02:
        h = 0.43 * shade
        top = WIN_Z + 0.215
        sx = side * 2.985
        sh = box(f"{name}_shade", (0.006, 0.30, h), (sx, y, top - h / 2), M["shade"], bevel=0.002)
        lip = box(f"{name}_lip", (0.02, 0.10, 0.014), (side * 2.976, y, top - h + 0.006), M["shade"], bevel=0.005)
        del sh, lip
    if glass:
        pane = box(f"{name}_pane", (0.004, 0.30, 0.44), (side * 3.0, y, WIN_Z), M["pane"])
        pane.visible_shadow = False
        # the inner scratch pane, in the reveal's throat (the shade runs behind it)
        ring = [(side * (x_in + 0.088), y + u, WIN_Z + v) for u, v in superellipse(0.150, 0.225, 2.6, N)]
        sp = mesh_obj(f"{name}_scratch", ring, [tuple(range(N))], M["scratch_pane"], smooth=False)
        sp.visible_shadow = False
    return rv


def inset(profile, d):
    """A profile [(x, z)] moved d toward the cabin's inside (to the left of its direction of travel)."""
    out = []
    n = len(profile)
    for i, (x, z) in enumerate(profile):
        (xa, za), (xb, zb) = profile[max(0, i - 1)], profile[min(n - 1, i + 1)]
        dx, dz = xb - xa, zb - za
        k = math.hypot(dx, dz) or 1.0
        out.append((x - dz / k * d, z + dx / k * d))
    return out


def shell(shades, ys, joint_phase=0):
    """Lining, dado, bins, aisle ceilings and coves, crown, floor, bulkheads. `shades`: {(side, index): fraction}.
    The sidewall panels are three windows wide; `joint_phase` picks which gaps between windows carry their joints."""
    y0, y1 = REAR_Y, FRONT_Y
    for side in (-1, 1):
        d = sweep(f"dado_{side}", DADO, y0, y1, M["dado"], flip_x=side < 0)
        finish(d, 0.0)
        wall = sweep(f"sidewall_{side}", SIDEWALL, y0, y1, M["lining"], flip_x=side < 0)
        cut = window_cutter(side, ys)
        bo = wall.modifiers.new("windows", "BOOLEAN")
        bo.operation, bo.solver, bo.object = "DIFFERENCE", "EXACT", cut
        wall.modifiers.new("wn", "WEIGHTED_NORMAL")
        for k, y in enumerate(ys):
            window(side, y, shades.get((side, k), 1.0), f"win_{'p' if side < 0 else 's'}{k:02d}")
        # panel joints: a fine dark line down the lining between every pair of windows, and across the aisle ceiling
        for k, y in enumerate(ys[:-1]):
            if (k - joint_phase) % 3:
                continue
            sweep(f"wallseam_{side}_{k}", inset(SIDEWALL, 0.0012), y + WIN_PITCH / 2 - 0.002, y + WIN_PITCH / 2 + 0.002,
                  M["seam"], flip_x=side < 0)
        for k in range(int((y1 - y0) / (2 * WIN_PITCH))):
            yy = y0 + 0.4 + k * 2 * WIN_PITCH
            sweep(f"ceilseam_{side}_{k}", inset(AISLE_CEIL, 0.0012), yy - 0.002, yy + 0.002, M["seam"], flip_x=side < 0)
        # return-air grille slots along the dado
        for k in range(int((y1 - y0) / 0.6)):
            yy = y0 + 0.3 + k * 0.6
            box(f"grille_{side}_{k}", (0.006, 0.30, 0.05), (side * 2.612, yy, 0.16), M["black"], bevel=0.002)
        # side bins in door segments (two rows each), latch recess on the lower lip
        seg, gap = 2 * PITCH, 0.006
        n = int(math.ceil((y1 - y0) / seg))
        for k in range(n):
            a, b = y0 + k * seg + gap / 2, min(y1, y0 + (k + 1) * seg - gap / 2)
            bn = sweep(f"sidebin_{side}_{k}", SIDE_BIN, a, b, M["bin"], closed=True, flip_x=side < 0)
            finish(bn, 0.006, 2, angle=40)
            box(f"latch_{side}_{k}", (0.03, 0.18, 0.035), (side * 1.398, (a + b) / 2, 1.905), M["dark_plastic"],
                bevel=0.006)
        # the aisle ceiling (a gentle vault) and the cove light hidden on top of the bin
        cl = sweep(f"aisleceil_{side}", AISLE_CEIL, y0, y1, M["ceiling"], flip_x=side < 0)
        finish(cl, 0.0)
        # the sidewall wash: a thin lit slot where the lining meets the bin, washing the wall and the reveals
        box(f"wash_slot_{side}", (0.012, y1 - y0 - 0.2, 0.006), (side * 2.712, (y0 + y1) / 2, 1.792), M["wash"])
        wl = area(f"wash_light_{side}", (side * 2.70, (y0 + y1) / 2, 1.778), (0.03, y1 - y0 - 0.4), 20.0,
                  (0.42, 0.56, 1.0), spread=140)
        wl.rotation_euler = (0.0, -side * 0.30, 0.0)         # down the wall, turned a little outboard
        wl.visible_camera = False
        cv = box(f"cove_{side}", (0.03, y1 - y0 - 0.2, 0.012), (side * 1.53, (y0 + y1) / 2, 2.355), M["cove"])
        cv.visible_camera = False
        cv2 = box(f"cove_c_{side}", (0.03, y1 - y0 - 0.2, 0.012), (side * 0.80, (y0 + y1) / 2, 2.415), M["cove"])
        cv2.visible_camera = False
        # what the lit ceiling gives back to the cabin: a wide, soft, dim strip under each aisle vault
        am = area(f"amb_light_{side}", (side * 1.15, (y0 + y1) / 2, 2.53), (0.3, y1 - y0 - 0.4), 88.0, (0.40, 0.54, 1.0),
                  spread=170)
        am.visible_camera = False
    # centre bins
    seg = 2 * PITCH
    n = int(math.ceil((y1 - y0) / seg))
    for k in range(n):
        a, b = y0 + k * seg + 0.003, min(y1, y0 + (k + 1) * seg - 0.003)
        bn = sweep(f"centrebin_{k}", CENTRE_BIN, a, b, M["bin"], closed=True)
        finish(bn, 0.006, 2, angle=40)
        for side in (-1, 1):
            box(f"clatch_{side}_{k}", (0.03, 0.18, 0.035), (side * 0.742, (a + b) / 2, 2.02), M["dark_plastic"],
                bevel=0.006)
    # crown and the floor
    box("crown", (5.8, y1 - y0, 0.04), (0.0, (y0 + y1) / 2, 2.62), M["black"])
    box("floor", (5.3, y1 - y0, 0.02), (0.0, (y0 + y1) / 2, -0.01), M["carpet"])
    box("rear_bulkhead", (5.8, 0.06, 2.7), (0.0, y0 - 0.03, 1.35), M["lining"], bevel=0.01)
    return ys


LENS_Y = 0.38          # a reading lens sits this far ahead of its seat's reference point, over the sitter's lap


def psu(row):
    """Passenger service units under the bins over each block: reading lenses, gaspers, a blank sign panel."""
    y = row_y(row) + 0.30
    for b, bx in enumerate(BLOCK_X):
        if b == 1:
            zc, slope = 1.945 - 0.016, 0.0
        else:
            side = 1 if bx > 0 else -1
            zc = bin_bottom(abs(bx)) - 0.016
            slope = side * 0.05 / 1.30                 # the side bin's bottom rises toward the aisle
        rot = (0.0, math.atan(slope), 0.0)
        box(f"psu_{row}_{b}", (0.80, 0.70, 0.03), (bx, y - 0.02, zc), M["bin"], bevel=0.006, rot=rot)
        zat = lambda x: zc - slope * (x - bx)          # noqa: E731
        box(f"psu_sign_{row}_{b}", (0.10, 0.06, 0.006), (bx, y - 0.20, zat(bx) - 0.017), M["dark_plastic"], bevel=0.002,
            rot=rot)
        for s, sx in enumerate(SEAT_DX):
            x = bx + sx
            yl = row_y(row) + LENS_Y
            cyl(f"lens_{row}_{b}_{s}", 0.022, 0.006, (x, yl, zat(x) - 0.017), M["lens_off"], verts=20, rot=rot)
            cyl(f"lensring_{row}_{b}_{s}", 0.03, 0.004, (x, yl, zat(x) - 0.016), M["mid_plastic"], verts=20, rot=rot)
            cyl(f"gasper_{row}_{b}_{s}", 0.018, 0.022, (x + 0.09, y + 0.02, zat(x + 0.09) - 0.024), M["mid_plastic"],
                verts=16, r2=0.012, rot=rot)


def bin_bottom(ax):
    """The side bin's underside height at |x| = ax."""
    (x0, z0), (x1, z1) = SIDE_BIN[0], SIDE_BIN[1]
    return z0 + (z1 - z0) * (x0 - ax) / (x0 - x1)


def path_lights():
    """Floor path lights along both edges of both aisles: a dark strip in the carpet with one short LED dash a row,
    and a hidden strip light under the seat ends that carries their spill onto the aisle carpet."""
    L = FRONT_Y - REAR_Y - 0.6
    yc = (FRONT_Y + REAR_Y) / 2
    for ax in AISLES:
        for k in (-1, 1):
            x = ax + k * 0.228
            box(f"pathhousing_{ax}_{k}", (0.026, L, 0.006), (x, yc, 0.003), M["dark_plastic"], bevel=0.002)
            g = box(f"pathglow_{ax}_{k}", (0.010, L, 0.002), (x, yc, 0.0065), M["path_dim"])
            g.visible_shadow = False
            n = int(L / (PITCH / 2))
            for i in range(n):
                d = box(f"pathled_{ax}_{k}_{i}", (0.011, 0.085, 0.004), (x, REAR_Y + 0.45 + i * PITCH / 2, 0.0075),
                        M["path"], bevel=0.0015)
                d.visible_shadow = False
            sl = area(f"path_light_{ax}_{k}", (x + k * 0.02, yc, 0.105), (0.02, L), 24.0, (0.62, 0.74, 1.0), spread=150)
            sl.rotation_euler = (0.0, k * 0.75, 0.0)          # down and in toward the aisle's middle
            sl.visible_camera = False


def front_bulkhead():
    """The front of the cabin: a lined bulkhead with the two aisle openings to the galley, curtains half drawn
    across them, galley light behind; a blank glowing panel over each opening."""
    y = FRONT_Y
    # the wall as boxes around the two openings
    xs = [-2.9, AISLES[0] - 0.36, AISLES[0] + 0.36, AISLES[1] - 0.36, AISLES[1] + 0.36, 2.9]
    for a, b in ((xs[0], xs[1]), (xs[2], xs[3]), (xs[4], xs[5])):
        box(f"bulk_{a:+.2f}", (b - a, 0.08, 2.65), ((a + b) / 2, y, 1.325), M["lining"], bevel=0.012)
    for ax in AISLES:
        box(f"bulk_head_{ax}", (0.72, 0.08, 0.62), (ax, y, 2.33), M["lining"], bevel=0.012)
        box(f"bulk_sign_{ax}", (0.36, 0.012, 0.10), (ax, y - 0.046, 2.12), M["sign"], bevel=0.003)
        box(f"bulk_signbez_{ax}", (0.39, 0.01, 0.13), (ax, y - 0.041, 2.12), M["dark_plastic"], bevel=0.004)
        # the curtain: a folded cloth panel hanging from a rail, stopping short of the floor
        n = 22
        verts, faces = [], []
        w = 0.62
        for i in range(n + 1):
            t = i / n
            xx = ax - w / 2 + w * t
            yy = y + 0.10 + 0.035 * math.sin(t * math.pi * 7)
            for z in (0.14, 2.0):
                verts.append((xx, yy, z))
        for i in range(n):
            faces.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
        c = mesh_obj(f"curtain_{ax}", verts, faces, M["curtain"])
        sol = c.modifiers.new("thick", "SOLIDIFY")
        sol.thickness = 0.006
        box(f"rail_{ax}", (0.72, 0.03, 0.02), (ax, y + 0.10, 2.01), M["frame"], bevel=0.004)
        # the galley behind: a pale wall, glowing, and its light
        box(f"galley_wall_{ax}", (1.2, 0.02, 2.2), (ax, y + 0.9, 1.1), M["galley"])
        box(f"galley_floor_{ax}", (1.2, 1.0, 0.02), (ax, y + 0.5, -0.01), M["dado"])
        box(f"galley_ceil_{ax}", (1.2, 1.0, 0.02), (ax, y + 0.5, 2.2), M["lining"])
        for k in (-1, 1):
            box(f"galley_side_{ax}_{k}", (0.02, 1.0, 2.2), (ax + k * 0.6, y + 0.5, 1.1), M["lining"])
        area(f"galley_light_{ax}", (ax, y + 0.55, 2.1), (0.5, 0.5), 23.0, (0.85, 0.9, 1.0), spread=120,
             aim=(ax, y + 0.3, 0.0))


# ---------------------------------------------------------------- exterior
def wing_details(sections, rings, recv):
    """Panel joints on the upper skin and the three fairings under the flap tracks."""
    skin_offset = Vector((0, 0, 0.0015))
    strips = []
    for k in (3, 5, 6, 8):
        # Interpolate along the two adjacent loft sections so the joint follows the airfoil.
        span = abs(sections[k + 1][0] - sections[k][0])
        strip = []
        for j in range(2, 8):
            centre = Vector(rings[k][j])
            near = centre.lerp(Vector(rings[k - 1][j]), 0.005 / span)
            far = centre.lerp(Vector(rings[k + 1][j]), 0.005 / span)
            strip.append((near + skin_offset, far + skin_offset))
        strips.append(strip)
    hinge = []
    for k in range(2, len(sections)):
        _, _, chord, _, _ = sections[k]
        a, b = Vector(rings[k][5]), Vector(rings[k][6])
        half = 0.007 / (0.20 * chord)
        hinge.append((a.lerp(b, 0.5 - half) + skin_offset, a.lerp(b, 0.5 + half) + skin_offset))
    strips.append(hinge)
    for i, strip in enumerate(strips):
        verts = [p for pair in strip for p in pair]
        faces = [(j, j + 1, j + 3, j + 2) for j in range(0, len(verts) - 2, 2)]
        joint = mesh_obj(f"wing skin joint {i}", verts, faces, M["wing_dark"], smooth=False)
        recv.objects.link(joint)
    for k in (3, 5, 7):
        x, le, chord, thick, z = sections[k]
        tail = le - chord
        rings_fairing = []
        for dy, radius in ((1.45, 0.025), (1.12, 0.16), (0.40, 0.22), (-0.35, 0.17), (-0.92, 0.015)):
            ring = [(x + radius * math.cos(i * math.tau / 16), tail + dy,
                     z - thick * 0.12 + 0.72 * radius * math.sin(i * math.tau / 16)) for i in range(16)]
            rings_fairing.append(ring)
        recv.objects.link(loft(f"flap track fairing {k}", rings_fairing, M["wing"], closed_end=True))


def exterior(tip, recv, moon_dir=(-0.75, 0.55, 0.38)):
    """The night outside: the sky dome, the port wing (root far forward, swept back to a raked tip near eye level), its
    white aft-facing anti-collision strobe. Lights linked to `recv` (the exterior) only."""
    sky = bpy.data.objects.new("sky", bpy.data.meshes.new("sky"))
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=2500.0)
    bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    bm.to_mesh(sky.data)
    bm.free()
    for p in sky.data.polygons:
        p.use_smooth = True
    _coll().objects.link(sky)
    sky.location = (tip[0] + 27.0, tip[1] - 9.0, 1.2)
    sky.data.materials.append(M["sky"])
    sky.visible_shadow = False
    # the wing: tapered, swept, with dihedral; sections from root to tip, an aerofoil-like section
    tx, ty, tz = tip
    root_x, root_z = -3.0, tz - 0.97     # maintain the carry-through's height below the tip
    span = abs(tx - root_x)
    sweep_le = span * math.tan(math.radians(31))
    root_le = ty + sweep_le
    sections = []
    K = 9
    for k in range(K + 1):
        t = k / K
        x = root_x + (tx - root_x) * t
        le = root_le + (ty - root_le) * t
        chord = 11.0 + (2.6 - 11.0) * t
        thick = 1.25 + (0.22 - 1.25) * t
        z = root_z + (tz - root_z) * t + 0.35 * t * t       # a little flex toward the tip
        sections.append((x, le, chord, thick, z))
    # aerofoil: upper/lower curves (fraction of chord, fraction of thickness)
    af = [(0.0, 0.0), (0.02, 0.32), (0.08, 0.58), (0.2, 0.62), (0.4, 0.55), (0.65, 0.38), (0.85, 0.18), (1.0, 0.02)]
    afl = [(1.0, -0.01), (0.85, -0.08), (0.65, -0.16), (0.4, -0.25), (0.2, -0.28), (0.08, -0.26), (0.02, -0.16)]
    ring_def = af + afl
    rings = []
    for (x, le, chord, thick, z) in sections:
        rings.append([(x, le - c * chord, z + h * thick) for c, h in ring_def])
    # a blended winglet: the tip section swept up, back and a little out
    x, le, chord, thick, z = sections[-1]
    for t, up, out, back, ch in ((0.15, 0.08, -0.12, 0.10, 2.4), (0.35, 0.22, -0.30, 0.25, 2.1),
                                (0.7, 0.75, -0.50, 0.75, 1.5), (1.0, 1.75, -0.72, 1.9, 0.45)):
        rings.append([(x + out - h * thick * 0.6 * (1 - t), le - back - c * ch, z + up + h * thick * 0.25 * (1 - t))
                      for c, h in ring_def])
    wing = loft("wing", rings, M["wing"], closed_end=True)
    finish(wing, 0.0)
    recv.objects.link(wing)
    wing_details(sections, rings, recv)
    # The flight is seen from inside. The aft strobe is visible and the outboard
    # position light is screened by the tip fairing. Red is reserved for the bag seam.
    aim = Vector((0.52, -0.85, 0.18)).normalized()
    mount = Vector((x + 0.09, le - chord + 0.12, z + 0.09))
    rot = aim.to_track_quat("Z", "Y").to_euler()
    housing = cyl("strobe housing", 0.034, 0.045, mount, M["wing_dark"], rot=rot)
    recv.objects.link(housing)
    st = cyl("strobe", 0.015, 0.003, mount + aim * 0.023, M["nav_white"], rot=rot)
    halo = bpy.data.objects.new("navlight_halo", bpy.data.meshes.new("navlight_halo"))
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=0.35)
    bm.to_mesh(halo.data)
    bm.free()
    for p in halo.data.polygons:
        p.use_smooth = True
    _coll().objects.link(halo)
    halo.location = st.location
    halo.data.materials.append(M["nav_halo"])
    halo.visible_shadow = False
    spill = point("strobe spill", st.location + aim * 0.04, 4.0, (0.92, 0.96, 1.0), 0.035)
    spill.light_linking.receiver_collection = recv
    # the moon, out of shot above and ahead: a cool soft sun on the wing only
    li = bpy.data.lights.new("moon", "SUN")
    li.energy, li.color, li.angle = 0.17, (0.62, 0.72, 1.0), math.radians(4.0)
    mo = bpy.data.objects.new("moon", li)
    _coll().objects.link(mo)
    # low and ahead of the wing, so its upper skin carries a long soft sheen toward the cabin
    mo.rotation_euler = Vector(moon_dir).to_track_quat("Z", "Y").to_euler()
    mo.light_linking.receiver_collection = recv
    LIGHTS["moon"] = mo
    return wing, st
