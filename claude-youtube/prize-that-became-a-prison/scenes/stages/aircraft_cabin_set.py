"""The set for the night cabin: a generic wide-body economy cabin built in Python (no livery, no logos, no text).

World: metres, Z up, cabin floor at z = 0, the aircraft's nose toward +Y, starboard +X, port -X. Rows of 3-3-3
economy seats at a 0.79 m pitch (row i's seat reference, the foot of the backrest, at y = i * PITCH). The sidewall
lining follows the fuselage curve from a dark dado at the floor to the side bins; oval window reveals cut through it
at a 0.53 m pitch, each with a pull-down shade (most closed for the night) and a pane. Side and centre overhead bins
in door segments with latch recesses; passenger service units under them with reading lights; curved aisle ceilings
lit by blue night coves; aisle path-light strips on the floor; a front bulkhead with lit galley curtains in the two
aisle openings. Outside: the night sky dome at altitude and the port wing with its red tip light.

One three-seat block (moulded shells with tray tables and blank screens, cloth headrest covers, armrests, aisle end
bays, legs, beams and floor tracks) is built once into a collection and instanced per row and block.
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
WIN_PITCH, WIN_Z, WIN_W, WIN_H = 0.53, 1.12, 0.27, 0.42


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
    top = CUSHION[5:] [::-1]
    pts = sorted(set([(y_, z_) for y_, z_ in CUSHION if z_ > 0.44]))
    for (y0, z0), (y1, z1) in zip(pts, pts[1:]):
        if y0 <= y <= y1:
            return z0 + (z1 - z0) * (y - y0) / (y1 - y0)
    del top
    return 0.447 if y < 0.2 else 0.47


def back_front_y(z):
    """The backrest cushion's front face (block-local y) at height z."""
    sr, cr = math.sin(RECLINE), math.cos(RECLINE)
    w = -0.072
    v = (z - PIVOT_Z + w * sr) / cr
    return -v * sr - w * cr


def seat_parts(coll, sx, aisle_side=0):
    """One seat at block-local x = sx."""
    # seat cushion: the profile across x, then rounded
    c = prism_x(f"cushion_{sx:+.2f}", CUSHION, sx - 0.212, sx + 0.212, M["seat"], coll)
    finish(c, 0.03, 4, angle=30)
    sub = c.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = 1
    c.modifiers.move(c.modifiers.find("sub"), 0)
    # the backrest cushion with a gentle lumbar roll, the headrest with side wings, the cover
    back_box(f"backcush_{sx:+.2f}", (sx - 0.208, sx + 0.208), (0.03, 0.50), (-0.072, 0.0), M["seat"], coll, 0.03, 4)
    back_box(f"lumbar_{sx:+.2f}", (sx - 0.19, sx + 0.19), (0.10, 0.24), (-0.09, -0.05), M["seat"], coll, 0.03, 4)
    back_box(f"headrest_{sx:+.2f}", (sx - 0.17, sx + 0.17), (0.50, 0.722), (-0.085, 0.0), M["seat_dark"], coll, 0.035, 4)
    for k in (-1, 1):
        w = back_box(f"wing_{sx:+.2f}_{k}", (sx + k * 0.19 - 0.03, sx + k * 0.19 + 0.03), (0.52, 0.71), (-0.10, -0.01),
                     M["seat_dark"], coll, 0.022, 3)
        w.rotation_euler.z = -k * 0.25
    back_box(f"cover_{sx:+.2f}", (sx - 0.165, sx + 0.165), (0.53, 0.735), (-0.093, -0.086), M["cover"], coll, 0.003, 2)
    back_box(f"covertop_{sx:+.2f}", (sx - 0.165, sx + 0.165), (0.726, 0.738), (-0.093, 0.035), M["cover"], coll, 0.004, 2)
    # the moulded shell behind: a deep tray with its rim forward round the cushions
    back_box(f"shell_{sx:+.2f}", (sx - 0.232, sx + 0.232), (-0.10, 0.725), (0.0, 0.048), M["shell"], coll, 0.03, 4)
    for k in (-1, 1):
        back_box(f"shellside_{sx:+.2f}_{k}", (sx + k * 0.222 - 0.012, sx + k * 0.222 + 0.012), (-0.06, 0.70),
                 (-0.075, 0.03), M["shell"], coll, 0.01, 3)
    # the back of the shell: tray table, latch, screen in its bezel, literature pocket
    back_box(f"tray_{sx:+.2f}", (sx - 0.185, sx + 0.185), (0.10, 0.37), (0.046, 0.061), M["shell"], coll, 0.008, 3)
    back_box(f"traygap_{sx:+.2f}", (sx - 0.19, sx + 0.19), (0.095, 0.375), (0.044, 0.055), M["dark_plastic"], coll, 0.004, 2)
    back_box(f"latch_{sx:+.2f}", (sx - 0.022, sx + 0.022), (0.377, 0.392), (0.046, 0.068), M["mid_plastic"], coll, 0.004, 2)
    back_box(f"bezel_{sx:+.2f}", (sx - 0.135, sx + 0.135), (0.418, 0.582), (0.044, 0.058), M["dark_plastic"], coll, 0.006, 3)
    back_box(f"screen_{sx:+.2f}", (sx - 0.121, sx + 0.121), (0.432, 0.567), (0.055, 0.0595), M["screen_off"], coll, 0.0, 1)
    back_box(f"pocket_{sx:+.2f}", (sx - 0.17, sx + 0.17), (-0.07, 0.07), (0.046, 0.072), M["seat_dark"], coll, 0.012, 3)
    back_box(f"pocketrim_{sx:+.2f}", (sx - 0.175, sx + 0.175), (0.062, 0.078), (0.046, 0.076), M["mid_plastic"], coll,
             0.005, 2)
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


def instance(name, coll, loc):
    ob = bpy.data.objects.new(name, None)
    ob.instance_type = "COLLECTION"
    ob.instance_collection = coll
    ob.location = loc
    _coll().objects.link(ob)
    return ob


def screen_pos(bx, sx, row):
    """World centre of a seat's screen glass and the shell's back normal (toward the row behind)."""
    p = back_pt(bx + sx, 0.4995, 0.0595) + Vector((0, row_y(row), 0))
    nrm = Vector((0, -math.cos(RECLINE), -math.sin(RECLINE)))
    return p, nrm


def seats(lit_screens=(), skip=()):
    coll = block_collection()
    for r in range(N_ROWS):
        for b, bx in enumerate(BLOCK_X):
            if (r, b) in skip:
                continue
            instance(f"row{r:02d}_b{b}", coll, (bx, row_y(r), 0.0))
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
def windows_y():
    from aircraft_cabin import DAWN_WINDOW_Y  # noqa: E402  (the stage decides where Dawn's window falls)
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
    for x, a, b in ((x_in - 0.016, 0.205, 0.288), (x_in - 0.006, 0.188, 0.268), (x_in + 0.01, 0.172, 0.25),
                    (x_in + 0.09, 0.148, 0.222), (3.02, 0.132, 0.205)):
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
    return rv


def shell(shades):
    """Lining, dado, bins, aisle ceilings and coves, crown, floor, bulkheads. `shades`: {(side, index): fraction}."""
    ys = windows_y()
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
        cv = box(f"cove_{side}", (0.03, y1 - y0 - 0.2, 0.012), (side * 1.53, (y0 + y1) / 2, 2.355), M["cove"])
        cv.visible_camera = False
        cv2 = box(f"cove_c_{side}", (0.03, y1 - y0 - 0.2, 0.012), (side * 0.80, (y0 + y1) / 2, 2.415), M["cove"])
        cv2.visible_camera = False
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
    box("crown", (3.6, y1 - y0, 0.04), (0.0, (y0 + y1) / 2, 2.62), M["black"])
    box("floor", (5.3, y1 - y0, 0.02), (0.0, (y0 + y1) / 2, -0.01), M["carpet"])
    box("rear_bulkhead", (5.8, 0.06, 2.7), (0.0, y0 - 0.03, 1.35), M["lining"], bevel=0.01)
    return ys


def psu(row):
    """Passenger service units under the bins over each block: reading lenses, gaspers, a blank sign panel."""
    y = row_y(row) + 0.30
    for b, bx in enumerate(BLOCK_X):
        z = 1.80 if b != 1 else 1.925
        if b != 1:
            # under the sloping side bin: its bottom height at x
            z = 1.785 + (2.74 - abs(bx)) / (2.74 - 1.44) * 0.05 - 0.035
        p = box(f"psu_{row}_{b}", (0.80, 0.70, 0.03), (bx, y - 0.02, z), M["bin"], bevel=0.006)
        del p
        box(f"psu_sign_{row}_{b}", (0.10, 0.06, 0.006), (bx, y - 0.16, z - 0.017), M["dark_plastic"], bevel=0.002)
        for s, sx in enumerate(SEAT_DX):
            cyl(f"lens_{row}_{b}_{s}", 0.022, 0.006, (bx + sx, y, z - 0.017), M["lens_off"], verts=20)
            cyl(f"lensring_{row}_{b}_{s}", 0.03, 0.004, (bx + sx, y, z - 0.016), M["mid_plastic"], verts=20)
            cyl(f"gasper_{row}_{b}_{s}", 0.018, 0.022, (bx + sx + 0.09, y - 0.03, z - 0.024), M["mid_plastic"],
                verts=16, r2=0.012)


def path_lights():
    """Floor path-light strips along both edges of both aisles."""
    for ax in AISLES:
        for k in (-1, 1):
            x = ax + k * 0.225
            s = box(f"pathstrip_{ax}_{k}", (0.016, FRONT_Y - REAR_Y - 0.6, 0.008), (x, (FRONT_Y + REAR_Y) / 2, 0.004),
                    M["path"])
            s.visible_shadow = False
            box(f"pathhousing_{ax}_{k}", (0.026, FRONT_Y - REAR_Y - 0.6, 0.006), (x, (FRONT_Y + REAR_Y) / 2, 0.003),
                M["dark_plastic"])


def front_bulkhead():
    """The front of the cabin: a lined bulkhead with the two aisle openings to the galley, curtains half drawn
    across them, galley light behind; a blank glowing panel over each opening."""
    y = FRONT_Y
    wall = mesh_obj("front_wall", [], [], M["lining"])
    del wall
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
        area(f"galley_light_{ax}", (ax, y + 0.55, 2.1), (0.5, 0.5), 18.0, (0.85, 0.9, 1.0), spread=120,
             aim=(ax, y + 0.3, 0.0))


# ---------------------------------------------------------------- exterior
def exterior(tip, recv):
    """The night outside: the sky dome, the port wing (root far forward, swept back to a raked tip near eye level), its
    red navigation light and the white tail strobe beside it. Lights linked to `recv` (the exterior) only."""
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
    root_x, root_z = -3.0, tz - 2.9
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
    wing = loft("wing", rings, M["wing"], closed_end=True)
    finish(wing, 0.0)
    recv.objects.link(wing)
    # a raked tip cap and the nav light housing at the tip's leading edge
    x, le, chord, thick, z = sections[-1]
    light_pos = Vector((x - 0.15, le - 0.45, z + 0.05))
    cyl("navlight_housing", 0.09, 0.22, light_pos, M["wing_dark"], rot=(0, math.pi / 2, 0), verts=16)
    nl = bpy.data.objects.new("navlight", bpy.data.meshes.new("navlight"))
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=0.07)
    bm.to_mesh(nl.data)
    bm.free()
    _coll().objects.link(nl)
    nl.location = light_pos + Vector((-0.12, 0, 0.0))
    nl.data.materials.append(M["nav_red"])
    nl.visible_shadow = False
    st = bpy.data.objects.new("strobe", bpy.data.meshes.new("strobe"))
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=6, radius=0.05)
    bm.to_mesh(st.data)
    bm.free()
    _coll().objects.link(st)
    st.location = Vector((x - 0.05, le - chord + 0.2, z + 0.06))
    st.data.materials.append(M["nav_white"])
    st.visible_shadow = False
    red = point("nav_red_light", nl.location + Vector((-0.2, 0.2, 0.25)), 60.0, (1.0, 0.12, 0.06), 0.06)
    red.light_linking.receiver_collection = recv
    # the moon, out of shot above and ahead: a cool soft sun on the wing only
    li = bpy.data.lights.new("moon", "SUN")
    li.energy, li.color, li.angle = 0.06, (0.62, 0.72, 1.0), math.radians(1.0)
    mo = bpy.data.objects.new("moon", li)
    _coll().objects.link(mo)
    mo.rotation_euler = Vector((0.35, -0.55, 0.75)).to_track_quat("Z", "Y").to_euler()
    mo.light_linking.receiver_collection = recv
    LIGHTS["moon"] = mo
    return wing, nl
