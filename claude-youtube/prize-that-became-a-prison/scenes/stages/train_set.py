"""The night train's carriage, built in Python: shell, windows, seats, luggage racks, strip lights, end walls and the
dark country outside with its passing lights.

Coordinates: metres, Z up, floor at z = 0. The carriage runs along +Y from the near end wall (Y0, behind the aisle
camera) to the far end wall with its vestibule door (Y1). X is across; the left wall (camera-left looking down the
carriage) is at -XW, the right at +XW. Every seat faces -Y (toward the near end): the aisle camera sees the seat
fronts and the travellers' faces over the seat backs in front of them.

Cross-section: a vertical lining with the window band (rounded-corner openings, a deep reveal, a gasket, the glass
set back), a cove curving from the wall top into a flat ceiling where two lines of strip lights run; luggage racks
of round aluminium bars on cantilever brackets above the window seats, a reading-light rail under each rack's front
edge; 2 + 2 upholstered seats (moquette with piping seams, a pale linen cover over each seat back) on a speckled
vinyl floor whose aisle is walked smooth.
"""
import math
import random

import bpy
import bmesh
from mathutils import Matrix, Vector

import setkit as sk
import train_mats as mt

M = {}
LIGHTS = {}

# ---------------------------------------------------------------- dimensions
XW = 1.45                 # inner face of the side lining
Y0, Y1 = -0.85, 17.3      # near and far end walls
H = 2.48                  # flat ceiling
WALL_TOP = 2.15           # the lining is vertical up to here, then the cove
COVE_X = 0.95             # the cove meets the flat ceiling at |x| = COVE_X
LOW = 0.62                # the window band's lining starts here (the lower lining below it)
SILL, TOP = 0.82, 1.62    # window opening
WIN_HW, WIN_R = 0.725, 0.15
REVEAL = 0.08             # lining face to glass
BAY = 2.1                 # window pitch
WIN_Y = [5.55 + BAY * n for n in range(-2, 6)]      # window centres: 1.35 ... 16.05
PITCH = 1.05
ROW_Y = [1.3 + PITCH * k for k in range(15)]          # seat rows (unit-local y = 0: about the hip point)
PAIR_X = 0.86             # seat-pair centres at -PAIR_X (left) and +PAIR_X (right)
SEAT_DX = 0.27            # seat centres either side of the pair centre
RACK_Z = 1.80             # rack bar centres
RACK_IN = 0.985           # rack front rail at |x| = RACK_IN
BAR_R = 0.0085
PSU_BOT = RACK_Z - BAR_R - 0.045   # underside of the reading-light rail (its top meets the bars)
STRIP_X = 0.6             # strip light lines at x = +-STRIP_X
COOL = (0.82, 0.9, 1.0)
LAMP = (1.0, 0.9, 0.78)   # the reading lamp: a touch warmer than the strips

# the seat's profile (unit-local, sitter faces -Y)
CUSH_FRONT, CUSH_BACK = -0.27, 0.2
CUSH_ZF, CUSH_ZB = 0.445, 0.415     # cushion top at its front and back edges
CUSH_HW = 0.215                     # cushion half width
RECLINE = math.radians(12.0)
BACK_T = 0.085                      # backrest pad thickness
BACK_Y0, BACK_Z0 = 0.205, 0.455     # front face of the backrest at its foot
BACK_TOP = 1.075                    # top of the upper pad (height)
SEAM_Z = 0.86                       # the seam between the lower and the upper pad


def cushion_top(y):
    """Height of the cushion's top at unit-local y (undeformed)."""
    t = max(0.0, min(1.0, (y - CUSH_FRONT) / (CUSH_BACK - CUSH_FRONT)))
    return CUSH_ZF + (CUSH_ZB - CUSH_ZF) * t


def back_y(z):
    """Unit-local y of the backrest's front face at height z."""
    return BACK_Y0 + (z - BACK_Z0) * math.tan(RECLINE)


# ---------------------------------------------------------------- helpers
def materials():
    if not M:
        M.update(mt.materials())
    return M


def _link(ob, coll=None):
    (coll or bpy.context.scene.collection).objects.link(ob)
    return ob


def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0), coll=None, segs=3):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Diagonal((*size, 1)))
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me), coll)
    ob.location, ob.rotation_euler = loc, rot
    me.materials.append(m)
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments = bevel, segs
        bv.limit_method = "ANGLE"
        ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
        for p in me.polygons:
            p.use_smooth = True
    return ob


def tube(name, pts, r, m, coll=None, closed=False, res=4):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution = "3D", r, res
    cu.use_fill_caps = not closed
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts):
        p.co = (*co, 1.0)
    sp.use_cyclic_u = closed
    ob = _link(bpy.data.objects.new(name, cu), coll)
    ob.data.materials.append(m)
    return ob


def mesh_obj(name, verts, faces, m, coll=None, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    ob = _link(bpy.data.objects.new(name, me), coll)
    me.materials.append(m)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    return ob


def area(name, loc, size, energy, colour=COOL, spread=180, rot=(0, 0, 0), camera=False):
    li = sk.area_light(name, loc, size, energy, colour, spread_deg=spread, rot=rot)
    li.visible_camera = camera
    li.visible_glossy = False
    LIGHTS[name] = li
    return li


def spot(name, loc, aim, energy, colour, size_deg, blend, radius=0.02):
    li = bpy.data.lights.new(name, "SPOT")
    li.energy, li.color = energy, colour
    li.spot_size, li.spot_blend = math.radians(size_deg), blend
    li.shadow_soft_size = radius
    ob = _link(bpy.data.objects.new(name, li))
    ob.location = loc
    ob.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    LIGHTS[name] = ob
    return ob


def rrect(cy, cz, hw, hh, r, n=10):
    """A rounded rectangle in the (y, z) plane, counter-clockwise from the right side's top end; returns
    [(point, outward normal, corner centre)]."""
    out = []
    corners = [((cy + hw - r, cz + hh - r), 0.0), ((cy - hw + r, cz + hh - r), 90.0),
               ((cy - hw + r, cz - hh + r), 180.0), ((cy + hw - r, cz - hh + r), 270.0)]
    for (ccy, ccz), a0 in corners:
        for i in range(n + 1):
            a = math.radians(a0 + 90.0 * i / n)
            nrm = Vector((math.cos(a), math.sin(a)))
            out.append((Vector((ccy, ccz)) + nrm * r, nrm, Vector((ccy, ccz))))
    return out


# ---------------------------------------------------------------- shell
def floor():
    m = materials()
    box("floor", (2 * XW + 0.1, Y1 - Y0, 0.1), (0, (Y0 + Y1) / 2, -0.05), m["vinyl"])
    # the seat tracks: aluminium rails let into the floor, the carriage's leading lines
    for x in (-1.33, -0.39, 0.39, 1.33):
        box(f"track_{x:+.2f}", (0.032, Y1 - Y0 - 0.1, 0.004), (x, (Y0 + Y1) / 2, 0.001), m["alu"], bevel=0.0012)
        box(f"track_slot_{x:+.2f}", (0.008, Y1 - Y0 - 0.1, 0.002), (x, (Y0 + Y1) / 2, 0.0026), m["rubber"])
    for s in (-1, 1):
        # a rubber cove skirting where the floor meets the wall
        box(f"skirting_{s}", (0.03, Y1 - Y0, 0.09), (s * (XW - 0.015), (Y0 + Y1) / 2, 0.045), m["rubber"], bevel=0.008)


def _profile():
    """The upper wall, cove and ceiling as one (x, z) polyline from the left wall top to the right."""
    pts = []
    rx, rz = XW - COVE_X, H - WALL_TOP
    n = 14
    for i in range(n + 1):                     # left cove: from the wall top up to the ceiling
        a = math.radians(180.0 - 90.0 * i / n)
        pts.append((-COVE_X + rx * math.cos(a), WALL_TOP + rz * math.sin(a)))
    for x in (-0.5, -0.2, 0.0, 0.2, 0.5):
        pts.append((x, H))
    for i in range(n + 1):
        a = math.radians(90.0 - 90.0 * i / n)
        pts.append((COVE_X + rx * math.cos(a), WALL_TOP + rz * math.sin(a)))
    return pts


def ceiling():
    m = materials()
    prof = _profile()
    ys = [Y0, Y1]
    verts = [(x, y, z) for y in ys for (x, z) in prof]
    n = len(prof)
    faces = [(i, i + 1, n + i + 1, n + i) for i in range(n - 1)]
    ob = mesh_obj("ceiling", verts, faces, m["ceiling"])
    so = ob.modifiers.new("thick", "SOLIDIFY")
    so.thickness, so.offset = 0.02, -1.0
    # faces must look down/inward: check the middle face
    me = ob.data
    mid = me.polygons[n // 2]
    if mid.normal.z > 0:
        me.flip_normals()
    # the central air diffuser: a slotted strip down the middle of the ceiling
    box("air_diffuser", (0.13, Y1 - Y0 - 0.4, 0.012), (0, (Y0 + Y1) / 2, H - 0.006), m["grille"], bevel=0.003)
    for s in (-1, 1):
        box(f"air_trim_{s}", (0.012, Y1 - Y0 - 0.4, 0.016), (s * 0.071, (Y0 + Y1) / 2, H - 0.008), m["alu_dark"], bevel=0.003)
    # the joint line where the cove meets the flat ceiling
    for s in (-1, 1):
        box(f"cove_joint_{s}", (0.008, Y1 - Y0, 0.006), (s * COVE_X, (Y0 + Y1) / 2, H - 0.002), m["rubber"])
    # on each cove: a long air-return grille set into the curve, and the panels' butt joints at every bay
    rx, rz = XW - COVE_X, H - WALL_TOP
    for s in (-1, 1):
        a = math.radians(132.0)
        pxl, pz = -COVE_X + rx * math.cos(a), WALL_TOP + rz * math.sin(a)       # the point on the left cove
        txl, tz = -rx * math.sin(a), rz * math.cos(a)                           # its tangent
        nxl, nz = -tz, txl                                                      # its normal, into the room
        px, tx, nx = (pxl, txl, nxl) if s < 0 else (-pxl, -txl, -nxl)
        ln = math.hypot(nx, nz)
        theta = -math.atan2(tz, tx)                     # turns a box's X onto the tangent (rotation about Y)
        for k, (w, mat) in enumerate(((0.075, m["alu_dark"]), (0.06, m["grille"]))):
            off = 0.004 + 0.002 * k
            box(f"cove_grille_{s}_{k}", (w, Y1 - Y0 - 0.6, 0.008), (px + nx / ln * off, (Y0 + Y1) / 2, pz + nz / ln * off), mat,
                bevel=0.002, rot=(0, theta, 0))
        prof = [(x, z) for (x, z) in _profile() if s * x > COVE_X - 0.001]
        for j in range(len(WIN_Y) + 1):
            y = WIN_Y[0] - BAY / 2 + j * BAY
            pts = [(x * 0.998, y, z - 0.002) for (x, z) in prof]
            tube(f"cove_seam_{s}_{j}", pts, 0.002, m["lining_lo"], res=2)


def window_bay(name, yc, s, m):
    """One window bay of the side lining (s = -1 left, +1 right): the panel from LOW to WALL_TOP, BAY long, with a
    rounded-corner opening; the opening's edge rolls (a 15 mm round) into a deep reveal back to the glass. Returns
    the opening's outline [(y, z)] (for the glass and the gasket)."""
    lip = 0.015
    hh = (TOP - SILL) / 2
    zc = (TOP + SILL) / 2
    inner = rrect(yc, zc, WIN_HW, hh, WIN_R, n=10)
    N = len(inner)
    # the outer rectangle, mapped point by point onto the inner outline (each corner arc onto the panel's corner)
    y0, y1, z0, z1 = yc - BAY / 2, yc + BAY / 2, LOW, WALL_TOP
    outer = []
    nper = N // 4
    rect_corners = [(y1, z1), (y0, z1), (y0, z0), (y1, z0)]
    for k in range(4):
        cy, cz = rect_corners[k]
        arc = inner[k * nper:(k + 1) * nper]
        p_first, p_last = arc[0][0], arc[-1][0]
        # path: from (panel edge at the arc's first point) to the corner to (panel edge at the arc's last point)
        if k == 0:
            a, b = Vector((y1, p_first.y)), Vector((p_last.x, z1))
        elif k == 1:
            a, b = Vector((p_first.x, z1)), Vector((y0, p_last.y))
        elif k == 2:
            a, b = Vector((y0, p_first.y)), Vector((p_last.x, z0))
        else:
            a, b = Vector((p_first.x, z0)), Vector((y1, p_last.y))
        c = Vector((cy, cz))
        half = nper // 2
        for i in range(nper):
            if i <= half:
                t = i / half
                outer.append(a.lerp(c, t))
            else:
                t = (i - half) / (nper - 1 - half)
                outer.append(c.lerp(b, t))
    x0 = s * XW
    verts, faces = [], []

    def V(p):
        verts.append(p)
        return len(verts) - 1
    o_idx = [V((x0, q.x, q.y)) for q in outer]
    loops = []
    nl = 4
    for j in range(nl + 1):                      # the round from the panel face into the reveal
        th = math.radians(90.0 * j / nl)
        loop = []
        for (p, nrm, _c) in inner:
            q = p + nrm * (lip * (1 - math.sin(th)))
            loop.append(V((x0 + s * lip * (1 - math.cos(th)), q.x, q.y)))
        loops.append(loop)
    deep = [V((x0 + s * (REVEAL + 0.012), p.x, p.y)) for (p, _n, _c) in inner]
    loops.append(deep)
    for i in range(N):
        i2 = (i + 1) % N
        faces.append((o_idx[i], o_idx[i2], loops[0][i2], loops[0][i]))
    for a_, b_ in zip(loops, loops[1:]):
        for i in range(N):
            i2 = (i + 1) % N
            faces.append((a_[i], a_[i2], b_[i2], b_[i]))
    ob = mesh_obj(name, verts, faces, m)
    me = ob.data
    # the panel's faces look into the carriage
    want = Vector((-s, 0, 0))
    if me.polygons[0].normal.dot(want) < 0:
        me.flip_normals()
    so = ob.modifiers.new("thick", "SOLIDIFY")
    so.thickness, so.offset = 0.015, -1.0
    ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
    return [(p.x, p.y) for (p, _n, _c) in inner]


def walls():
    m = materials()
    for s in (-1, 1):
        side = "L" if s < 0 else "R"
        for i, yc in enumerate(WIN_Y):
            outline = window_bay(f"bay_{side}{i}", yc, s, m["lining"])
            # the glass, set back in the reveal; its edge runs into the gasket
            gx = s * (XW + REVEAL)
            c = Vector((yc, (TOP + SILL) / 2))
            pts = []
            for (y, z) in outline:
                d = Vector((y, z)) - c
                pts.append(c + d * 1.0 + d.normalized() * 0.008)
            verts = [(gx, p.x, p.y) for p in pts]
            g = mesh_obj(f"glass_{side}{i}", verts, [list(range(len(verts)))], m["glass"], smooth=False)
            so = g.modifiers.new("thick", "SOLIDIFY")
            so.thickness, so.offset = 0.01, 1.0 if s < 0 else -1.0
            g.visible_shadow = False
            # the gasket: a black rubber round where the glass meets the reveal
            gpts = [(gx - s * 0.006, y, z) for (y, z) in outline]
            tube(f"gasket_{side}{i}", gpts, 0.009, m["rubber"], closed=True)
        # the lower lining, the heater grille along the floor, the window ledge
        L = Y1 - Y0
        box(f"lower_lining_{side}", (0.02, L, LOW), (s * (XW + 0.01), (Y0 + Y1) / 2, LOW / 2), m["lining_lo"])
        box(f"heater_{side}", (0.05, L - 0.2, 0.2), (s * (XW - 0.025), (Y0 + Y1) / 2, 0.19), m["grille"], bevel=0.006)
        box(f"heater_top_{side}", (0.056, L - 0.2, 0.012), (s * (XW - 0.028), (Y0 + Y1) / 2, 0.296), m["alu_dark"], bevel=0.004)
        box(f"ledge_{side}", (0.075, L, 0.022), (s * (XW - 0.0375), (Y0 + Y1) / 2, SILL - 0.016), m["shell"], bevel=0.008)
        box(f"ledge_lip_{side}", (0.012, L, 0.03), (s * (XW - 0.075), (Y0 + Y1) / 2, SILL - 0.02), m["alu"], bevel=0.004)
        # plain lining where the window bays stop short of the end walls
        b0, b1 = WIN_Y[0] - BAY / 2, WIN_Y[-1] + BAY / 2
        for (ya, yb) in ((Y0, b0), (b1, Y1)):
            if yb - ya > 0.01:
                box(f"lining_end_{side}_{ya:.1f}", (0.02, yb - ya, WALL_TOP - LOW), (s * (XW + 0.01), (ya + yb) / 2, (LOW + WALL_TOP) / 2),
                    m["lining"])
        # a thin joint line between the bays (the panels' butt joints)
        for i in range(len(WIN_Y) + 1):
            y = WIN_Y[0] - BAY / 2 + i * BAY
            box(f"bay_joint_{side}{i}", (0.004, 0.006, WALL_TOP - LOW), (s * (XW - 0.001), y, (LOW + WALL_TOP) / 2), m["rubber"])


def end_walls():
    """The far end: the end wall with the vestibule's sliding door (a tall glass panel in an aluminium frame, the
    vestibule beyond lit cool and dim), a blank dark display panel over it. The near end: a plain wall and door."""
    m = materials()
    DW, DH = 0.86, 2.02
    for yw, far in ((Y1, True), (Y0, False)):
        sgn = 1 if far else -1
        t = 0.06
        yc = yw + sgn * t / 2
        side_w = XW - DW / 2
        for s in (-1, 1):
            box(f"endwall_{'far' if far else 'near'}_{s}", (side_w + 0.02, t, H + 0.05),
                (s * (DW / 2 + side_w / 2), yc, (H + 0.05) / 2), m["lining"], bevel=0.004)
        box(f"endwall_head_{'far' if far else 'near'}", (DW + 0.02, t, H + 0.05 - DH), (0, yc, DH + (H + 0.05 - DH) / 2),
            m["lining"], bevel=0.004)
        # the door frame (aluminium) and the leaf
        fy = yw - sgn * 0.01
        for s in (-1, 1):
            box(f"door_jamb_{far}_{s}", (0.05, 0.05, DH), (s * (DW / 2 + 0.005), fy, DH / 2), m["alu_dark"], bevel=0.006)
        box(f"door_headbar_{far}", (DW + 0.1, 0.05, 0.05), (0, fy, DH + 0.02), m["alu_dark"], bevel=0.006)
        ly = yw + sgn * 0.02
        if far:
            # the leaf: an aluminium frame round a tall glass panel
            fw = 0.07
            box("door_stile_l", (fw, 0.035, DH - 0.02), (-DW / 2 + fw / 2, ly, DH / 2), m["alu"], bevel=0.005)
            box("door_stile_r", (fw, 0.035, DH - 0.02), (DW / 2 - fw / 2, ly, DH / 2), m["alu"], bevel=0.005)
            box("door_rail_top", (DW - 2 * fw, 0.035, 0.09), (0, ly, DH - 0.055), m["alu"], bevel=0.005)
            box("door_rail_bot", (DW - 2 * fw, 0.035, 0.38), (0, ly, 0.2), m["alu"], bevel=0.005)
            box("door_kick", (DW - 2 * fw - 0.02, 0.04, 0.3), (0, ly, 0.17), m["alu_dark"], bevel=0.004)
            g = box("door_glass", (DW - 2 * fw, 0.012, DH - 0.09 - 0.39), (0, ly, 0.39 + (DH - 0.09 - 0.39) / 2), m["door_glass"])
            g.visible_shadow = False
            box("door_pull", (0.025, 0.03, 0.32), (DW / 2 - fw - 0.03, ly - 0.03, 1.05), m["alu_dark"], bevel=0.008)
            # the blank display over the door: dark glass in a bezel, nothing on it
            box("display_bezel", (0.62, 0.04, 0.16), (0, yw - 0.02, DH + 0.2), m["frame"], bevel=0.008)
            box("display_face", (0.56, 0.01, 0.11), (0, yw - 0.042, DH + 0.2), m["display"])
            # the vestibule: a short dim room behind the glass, lit by its own ceiling panel
            vd = 1.6
            vy = yw + t + vd / 2
            box("vest_floor", (2.0, vd, 0.05), (0, vy, -0.025), m["vinyl"])
            box("vest_back", (2.0, 0.05, H), (0, yw + t + vd, H / 2), m["lining"])
            for s in (-1, 1):
                box(f"vest_side_{s}", (0.05, vd, H), (s * 1.0, vy, H / 2), m["lining"])
            box("vest_ceiling", (2.0, vd, 0.05), (0, vy, H - 0.1), m["ceiling"])
            M["vest_glow"] = mt.glow("vestibule panel", COOL, 3.0, falloff=0.6, axes=("X", "Y"))
            box("vest_panel", (0.5, 0.9, 0.01), (0, vy, H - 0.13), M["vest_glow"])
            area("vest_light", (0, vy, H - 0.15), (0.5, 0.9), 8.0, COOL, spread=150)
            # the next car's door, dark, in the vestibule's far wall
            box("vest_door", (0.8, 0.03, 1.95), (0.0, yw + t + vd - 0.04, 0.975), m["alu_dark"], bevel=0.006)
            box("vest_door_glass", (0.5, 0.01, 0.9), (0.0, yw + t + vd - 0.058, 1.35), m["display"])
        else:
            box("near_door_leaf", (DW - 0.02, 0.04, DH - 0.02), (0, ly, DH / 2), m["shell"], bevel=0.006)
            # the night light over the near door: a small opal box, a soft cool light down the carriage
            M["night_lens"] = mt.glow("night light lens", (0.6, 0.72, 1.0), 4.0, falloff=0.5, axes=("X", "Z"))
            box("nightlight_body", (0.5, 0.06, 0.1), (0, yw + 0.03, DH + 0.18), m["frame"], bevel=0.008)
            box("nightlight_lens", (0.44, 0.01, 0.07), (0, yw + 0.062, DH + 0.18), M["night_lens"])
            area("night_light", (0, yw + 0.08, DH + 0.18), (0.44, 0.07), 12.0, (0.6, 0.72, 1.0), spread=140,
                 rot=(math.pi / 2, 0, 0))         # emitting toward +Y, down the carriage


def racks():
    """The luggage racks along both walls: a wall rail, cantilever brackets at each window pier, seven round
    aluminium bars as the bed, a heavier round front rail, and under the front edge the reading-light rail (a pale
    extrusion with a small round lens over each window seat)."""
    m = materials()
    L0, L1 = Y0 + 0.15, Y1 - 0.15
    yc, L = (L0 + L1) / 2, L1 - L0
    for s in (-1, 1):
        side = "L" if s < 0 else "R"
        box(f"rack_wallrail_{side}", (0.03, L, 0.06), (s * (XW - 0.015), yc, RACK_Z), m["alu"], bevel=0.006)
        n = 7
        for i in range(n):
            x = s * (XW - 0.03 - i * (XW - 0.03 - RACK_IN - 0.02) / (n - 1))
            tube(f"rack_bar_{side}{i}", [(x, L0, RACK_Z), (x, L1, RACK_Z)], BAR_R, m["alu"])
        tube(f"rack_front_{side}", [(s * RACK_IN, L0, RACK_Z + 0.012), (s * RACK_IN, L1, RACK_Z + 0.012)], 0.017, m["alu"])
        # the reading-light rail under the front edge
        box(f"psu_{side}", (0.12, L, 0.045), (s * (RACK_IN + 0.05), yc, PSU_BOT + 0.0225), m["shell"], bevel=0.01)
        box(f"psu_strip_{side}", (0.004, L, 0.03), (s * (RACK_IN - 0.0115), yc, PSU_BOT + 0.0225), m["alu_dark"])
        # brackets at the piers between the windows
        for j in range(len(WIN_Y) + 1):
            y = WIN_Y[0] - BAY / 2 + j * BAY
            if not (L0 < y < L1):
                y = min(max(y, L0 + 0.05), L1 - 0.05)
            # a tapered plate: deep at the wall, thin at the front rail
            xa, xb = s * (XW - 0.005), s * (RACK_IN - 0.005)
            verts = []
            for dy in (-0.006, 0.006):
                verts += [(xa, y + dy, RACK_Z - 0.2), (xa, y + dy, RACK_Z - 0.012), (xb, y + dy, RACK_Z - 0.012),
                          (xb, y + dy, RACK_Z - 0.05)]
            faces = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
            ob = mesh_obj(f"rack_bracket_{side}{j}", verts, faces, m["alu_dark"], smooth=False)
            bv = ob.modifiers.new("bevel", "BEVEL")
            bv.width, bv.segments = 0.003, 2
            ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
            box(f"rack_boss_{side}{j}", (0.012, 0.05, 0.08), (s * (XW - 0.006), y, RACK_Z - 0.17), m["alu_dark"], bevel=0.004)
        # a reading lamp's lens over each window seat (unlit; the stage lights one)
        for k, ry in enumerate(ROW_Y):
            lens_xy = (s * (RACK_IN + 0.05), ry - 0.12)
            sk.cyl(f"lamp_ring_{side}{k}", 0.026, 0.006, (lens_xy[0], lens_xy[1], PSU_BOT - 0.002), m["alu_dark"], verts=20)
            sk.cyl(f"lamp_lens_{side}{k}", 0.019, 0.004, (lens_xy[0], lens_xy[1], PSU_BOT - 0.0055), m["opal_off"], verts=20)


def lamp_pos(side, row):
    s = -1 if side == "L" else 1
    return Vector((s * (RACK_IN + 0.05), ROW_Y[row] - 0.12, PSU_BOT - 0.012))


# ---------------------------------------------------------------- strip lights
def strips(levels, energy=45.0):
    """Two lines of strip lights in the ceiling, one fitting per window bay per side: an anodised housing, an opal
    diffuser (lit at its level, a failing tube with an uneven glow, or off), and an area light just under each lit
    one. `levels` maps (bay index, "L"/"R") to a level 0..1 or ("flicker", level)."""
    m = materials()
    for i, yc in enumerate(WIN_Y):
        for side, s in (("L", -1), ("R", 1)):
            lv = levels.get((i, side), 0.0)
            flick = isinstance(lv, tuple)
            level = lv[1] if flick else lv
            n = f"strip_{side}{i}"
            x = s * STRIP_X
            box(n + "_housing", (0.15, 1.9, 0.022), (x, yc, H - 0.011), m["alu_dark"], bevel=0.004)
            if level > 0:
                key = f"opal_{level:.2f}_{'f' if flick else 's'}"
                if key not in M:
                    M[key] = mt.opal(f"opal {key}", COOL, 14.0 * level ** 2.2, flicker=0.75 if flick else 0.0)   # dim tubes read grey
                # (the opal box is built along its own X and turned onto the strip, so the shader's generated X runs
                # along the tube; the area lights are long in Y, along the strip)
                box(n + "_opal", (1.84, 0.11, 0.008), (x, yc, H - 0.024), M[key], rot=(0, 0, math.pi / 2))
                area(n + "_light", (x, yc, H - 0.03), (0.08, 1.8), energy * level, COOL, spread=125)
                # the diffuser's sideways glow on the ceiling round it
                area(n + "_up", (x, yc, H - 0.06), (0.1, 1.7), energy * level * 0.1, COOL, spread=170, rot=(math.pi, 0, 0))
            else:
                box(n + "_opal", (1.84, 0.11, 0.008), (x, yc, H - 0.024), m["opal_off"], rot=(0, 0, math.pi / 2))


# ---------------------------------------------------------------- seats
def _rot_frame(cy, cz, ang):
    """Unit vectors of a pad tilted back by `ang` about X: (along its thickness toward the back, up its face)."""
    yv = Vector((0, math.cos(ang), math.sin(ang) * -1))
    zv = Vector((0, math.sin(ang), math.cos(ang)))
    return yv, zv


def _pad(name, hw, z0, z1, m, coll, t=BACK_T, bevel=0.028):
    """A backrest pad from height z0 to z1, its front face on the reclined backrest line."""
    yv, zv = _rot_frame(0, 0, RECLINE)
    zm = (z0 + z1) / 2
    hgt = (z1 - z0) / math.cos(RECLINE)
    front = Vector((0, back_y(zm), zm))
    c = front + yv * (t / 2)
    ob = box(name, (2 * hw, t, hgt), tuple(c), m, bevel=bevel, rot=(-RECLINE, 0, 0), coll=coll, segs=4)
    return ob, front, yv, zv, hgt


def _welt_on_pad(name, sx, hw, front, yv, zv, hgt, m, coll, inset=0.036, r=0.0045):
    """Piping round the pad's front face (a rounded rectangle inset from its edge)."""
    pts = []
    for (p, _n, _c) in rrect(0.0, 0.0, hw - inset, hgt / 2 - inset, 0.035, n=5):
        q = front + Vector((sx + p.x, 0, 0)) + zv * p.y - yv * 0.004
        pts.append(tuple(q))
    return tube(name, pts, r, m, coll=coll, closed=True, res=3)


def seat_unit(name="seat_pair", linen_angles=(0, 0)):
    """One 2-seat unit into a new (unlinked) collection. Origin at the pair's centre on the floor; sitters face -Y;
    y = 0 is about their hip point."""
    m = materials()
    coll = bpy.data.collections.new(name)
    for k, sx in enumerate((-SEAT_DX, SEAT_DX)):
        # the cushion: a soft block, its top raked down to the back, piping round the top, a seam behind the front roll
        cy = (CUSH_FRONT + CUSH_BACK) / 2
        ztop = (CUSH_ZF + CUSH_ZB) / 2
        th = 0.11
        rake = math.atan2(CUSH_ZF - CUSH_ZB, CUSH_BACK - CUSH_FRONT)
        cush = box(f"cushion_{k}", (2 * CUSH_HW, CUSH_BACK - CUSH_FRONT, th), (sx, cy, ztop - th / 2), m["moquette"],
                   bevel=0.03, rot=(-rake, 0, 0), coll=coll, segs=4)
        sub = cush.modifiers.new("soft", "SUBSURF")
        sub.levels = sub.render_levels = 1
        pts = []
        for (p, _n, _c) in rrect(0.0, cy, CUSH_HW - 0.034, (CUSH_BACK - CUSH_FRONT) / 2 - 0.034, 0.05, n=5):
            pts.append((sx + p.x, p.y, cushion_top(p.y) - 0.002))
        tube(f"cushion_welt_{k}", pts, 0.0045, m["moquette_dk"], coll=coll, closed=True, res=3)
        fy = CUSH_FRONT + 0.11
        tube(f"cushion_seam_{k}", [(sx - CUSH_HW + 0.03, fy, cushion_top(fy) + 0.001), (sx + CUSH_HW - 0.03, fy, cushion_top(fy) + 0.001)],
             0.003, m["moquette_dk"], coll=coll)
        # the backrest: the lower pad as a centre panel between two side bolsters that stand a little proud (the
        # seams are the grooves between them), the upper pad above a horizontal seam
        bw = 0.12                                      # centre panel half width
        lo, f1, yv, zv, h1 = _pad(f"back_lo_{k}", bw - 0.002, BACK_Z0, SEAM_Z - 0.006, m["moquette"], coll, bevel=0.022)
        lo.location.x += sx
        sides = []
        for e in (-1, 1):
            hw_b = (CUSH_HW - 0.005 - bw - 0.004) / 2
            bo, _, _, _, _ = _pad(f"bolster_{k}_{e:+d}", hw_b, BACK_Z0 + 0.01, SEAM_Z - 0.006, m["moquette"], coll,
                                  t=BACK_T + 0.018, bevel=0.024)
            bo.location += Vector((sx + e * (bw + 0.004 + hw_b), 0, 0)) - yv * 0.018
            sides.append(bo)
        up, f2, _, _, h2 = _pad(f"back_up_{k}", CUSH_HW - 0.012, SEAM_Z + 0.006, BACK_TOP, m["moquette"], coll, bevel=0.016)
        for ob in [lo] + sides:
            sub = ob.modifiers.new("soft", "SUBSURF")
            sub.levels = sub.render_levels = 1
        up.location.x += sx
        # the linen cover over the top of the seat back: a front flap, the top and a back flap
        lt = 0.006
        cw = 0.28
        ftop = f2 + zv * (h2 / 2)
        flap = 0.14
        c1 = f2 + zv * (h2 / 2 - flap / 2) - yv * (lt / 2 + 0.002)
        c2 = ftop + yv * (BACK_T / 2) + zv * (lt / 2 + 0.002)
        c3 = f2 + zv * (h2 / 2 - 0.04) + yv * (BACK_T + lt / 2 + 0.002)
        angle = linen_angles[k]
        if angle is not None:
            # Skew the leading edge without lifting the cover from the pad.
            shift = math.tan(math.radians(angle))
            for label, size, centre in (("front", (cw, lt, flap), c1), ("top", (cw, BACK_T + 2 * lt + 0.01, lt), c2),
                                        ("back", (cw, lt, 0.08), c3)):
                cover = box(f"linen_{label}_{k}", size, centre + Vector((sx, 0, 0)), m["linen"], bevel=0.0025,
                            rot=(-RECLINE, 0, 0), coll=coll)
                for v in cover.data.vertices:
                    v.co.x += shift * (v.co.z + centre.z - c2.z)
        # the moulded shell behind the back: a pale plastic skin, a fold-down tray and its latch, a dark pocket
        sh_z0, sh_z1 = 0.3, BACK_TOP - 0.02
        zm = (sh_z0 + sh_z1) / 2
        shf = Vector((sx, back_y(zm), zm)) + yv * (BACK_T + 0.016)
        box(f"shell_{k}", (2 * CUSH_HW + 0.02, 0.025, (sh_z1 - sh_z0) / math.cos(RECLINE)), tuple(shf), m["shell"], bevel=0.01,
            rot=(-RECLINE, 0, 0), coll=coll)
        tz = 0.82
        tf = Vector((sx, back_y(tz), tz)) + yv * (BACK_T + 0.03)
        box(f"tray_{k}", (0.36, 0.012, 0.25), tuple(tf), m["shell"], bevel=0.006, rot=(-RECLINE, 0, 0), coll=coll)
        lf = Vector((sx, back_y(0.955), 0.955)) + yv * (BACK_T + 0.033)
        box(f"tray_latch_{k}", (0.05, 0.012, 0.016), tuple(lf), m["alu_dark"], bevel=0.004, rot=(-RECLINE, 0, 0), coll=coll)
        pz = 0.52
        pf = Vector((sx, back_y(pz), pz)) + yv * (BACK_T + 0.03)
        box(f"pocket_{k}", (0.34, 0.014, 0.16), tuple(pf), m["moquette_dk"], bevel=0.005, rot=(-RECLINE, 0, 0), coll=coll)
    # the frame: a beam under the cushions and the side panels at both ends, a padded armrest on each, a slim one
    # between the seats on a post at the back
    box("beam", (1.0, 0.08, 0.06), (0, 0.02, 0.27), m["frame"], bevel=0.008, coll=coll)
    box("pan", (1.0, 0.44, 0.03), (0, -0.03, 0.315), m["frame"], bevel=0.006, coll=coll)
    for e in (-1, 1):
        x = e * 0.515
        verts = []
        prof = [(-0.25, 0.06), (0.24, 0.06), (0.26, 0.6), (-0.21, 0.6)]
        for dx in (-0.013, 0.013):
            verts += [(x + dx, y, z) for (y, z) in prof]
        faces = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
        sp = mesh_obj(f"side_{e}", verts, faces, m["shell"], coll=coll, smooth=False)
        bv = sp.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments = 0.01, 3
        sp.modifiers.new("smooth", "WEIGHTED_NORMAL")
        for p in sp.data.polygons:
            p.use_smooth = True
        box(f"foot_{e}", (0.05, 0.5, 0.05), (x, -0.005, 0.025), m["alu_dark"], bevel=0.008, coll=coll)
        box(f"arm_pad_{e}", (0.055, 0.42, 0.04), (x, -0.01, 0.62), m["arm"], bevel=0.016, coll=coll)
    box("arm_pad_mid", (0.05, 0.38, 0.035), (0, -0.03, 0.63), m["arm"], bevel=0.014, coll=coll)
    box("arm_post_mid", (0.03, 0.04, 0.2), (0, 0.17, 0.52), m["frame"], bevel=0.008, coll=coll)
    return coll


def seats(coll, skip=()):
    """Instance the seat unit on every row, both sides (rows listed in `skip` are left out)."""
    out = []
    for k, ry in enumerate(ROW_Y):
        for side, s in (("L", -1), ("R", 1)):
            if (k, side) in skip:
                continue
            ob = bpy.data.objects.new(f"seats_{side}{k}", None)
            ob.instance_type = "COLLECTION"
            ob.instance_collection = coll
            ob.location = (s * PAIR_X, ry, 0.0)
            _link(ob)
            out.append(ob)
    return out


def seat_world(side, row, which):
    """World (x, y) of a seat: side "L"/"R", row index, which "window"/"aisle"."""
    s = -1 if side == "L" else 1
    dx = SEAT_DX if which == "window" else -SEAT_DX
    return s * (PAIR_X + dx), ROW_Y[row]


# ---------------------------------------------------------------- curtains
def _smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def curtain_bunch(name, s, yb, m, mtie, z0=SILL + 0.045, z1=TOP + 0.1, pleats=4, phase=0.0, draw=0.0):
    """A pleated curtain gathered at the window's side and tied back: wide at its head and its hem, cinched at the
    tie; four soft folds whose depth swells where the cloth gathers; its edges meet the wall."""
    tie = 0.42
    nu, nv = 36, 26

    def width(t):
        if draw:
            return abs(draw) + 0.07 + 0.035 * math.cos(math.pi * t)
        if t < tie:
            return 0.13 + (0.058 - 0.13) * _smooth(t / tie)
        return 0.058 + (0.15 - 0.058) * _smooth((t - tie) / (1 - tie))

    verts, faces = [], []
    for j in range(nv + 1):
        t = j / nv
        z = z0 + (z1 - z0) * t
        w = width(t)
        d = 0.024 + 0.034 * min(w / 0.15, 1.0)
        for i in range(nu + 1):
            u = i / nu
            env = math.sin(math.pi * u) ** 0.6
            fold = 0.55 + 0.45 * math.cos(2 * math.pi * pleats * u + phase + 2.2 * t)
            x = s * (XW - 0.012 - d * env * fold)
            verts.append((x, yb + draw / 2 + w * (u - 0.5), z))
    for j in range(nv):
        for i in range(nu):
            a = j * (nu + 1) + i
            faces.append((a, a + 1, a + nu + 2, a + nu + 1))
    ob = mesh_obj(name, verts, faces, m)
    so = ob.modifiers.new("thick", "SOLIDIFY")
    so.thickness, so.offset = 0.003, 0.0
    sub = ob.modifiers.new("soft", "SUBSURF")
    sub.levels = sub.render_levels = 1
    if draw:
        return ob
    # the tie: a band round the gathered cloth
    zt = z0 + (z1 - z0) * tie
    w = width(tie)
    d = 0.024 + 0.034 * (w / 0.15)
    pts = []
    for k in range(24):
        a = 2 * math.pi * k / 24
        pts.append((s * (XW - 0.012 - (d / 2) * (1 + math.cos(a)) - 0.004 * math.cos(a)), yb + (w / 2 + 0.005) * math.sin(a), zt))
    tube(name + "_tie", pts, 0.009, mtie, closed=True, res=2)
    return ob


def curtains():
    """A slim rail carries the mostly tied-back window curtains."""
    m = materials()
    M.setdefault("curtain", mt.upholstery("curtain", rgb=(0.034, 0.04, 0.056), weave=700.0, wear=0.12))
    M.setdefault("curtain_tie", mt.upholstery("curtain tie", rgb=(0.025, 0.028, 0.038), weave=500.0, wear=0.0))
    drawn = {("L", 4, 1): -0.42, ("R", 3, -1): 0.37, ("R", 5, 1): -0.51}
    for s in (-1, 1):
        side = "L" if s < 0 else "R"
        tube(f"curtain_rail_{side}", [(s * (XW - 0.016), Y0 + 0.2, TOP + 0.115), (s * (XW - 0.016), Y1 - 0.2, TOP + 0.115)], 0.007,
             m["alu"])
        for i, yc in enumerate(WIN_Y):
            for e in (-1, 1):
                curtain_bunch(f"curtain_{side}{i}_{e:+d}", s, yc + e * (WIN_HW + 0.045), M["curtain"], M["curtain_tie"],
                              phase=0.7 * i + (1.3 if e > 0 else 0.0), draw=drawn.get((side, i, e), 0.0))


# ---------------------------------------------------------------- other travellers' luggage
def holdall(name, x, y, length, width, height, rgb, turn=0.0):
    """A generic soft holdall lying along the rack: a rounded fabric body (softened, sagging a little), a zip seam
    along its top, two carry handles. Muted, no marks."""
    m = materials()
    key = f"bagcloth_{rgb}"
    if key not in M:
        M[key] = mt.upholstery(f"bag cloth {len(M)}", rgb=rgb, weave=300.0, wear=0.15)
    z0 = RACK_Z + BAR_R
    body = box(name, (width, length, height), (x, y, z0 + height / 2), M[key], bevel=min(width, height) * 0.38,
               rot=(0, 0, math.radians(turn)), segs=4)
    sub = body.modifiers.new("soft", "SUBSURF")
    sub.levels = sub.render_levels = 2
    c, s_ = math.cos(math.radians(turn)), math.sin(math.radians(turn))

    def w(dx, dy, dz):
        return (x + dx * c - dy * s_, y + dx * s_ + dy * c, z0 + dz)
    tube(name + "_zip", [w(0, -length * 0.42, height - 0.004), w(0, length * 0.42, height - 0.004)], 0.004, m["rubber"])
    for dy in (-0.09, 0.09):
        sk.arc(name + f"_handle{dy:+.2f}", w(-0.03, dy - 0.05, height - 0.01), w(-0.03, dy + 0.05, height - 0.01), 0.05,
               m["rubber"], r=0.007)
    return body


def luggage():
    """Other travellers' muted canvas bags stay behind Dawn's single case."""
    holdall("bag_mid_1", -(XW - 0.19), ROW_Y[6] - 0.08, 0.39, 0.29, 0.22, (0.068, 0.061, 0.048), turn=-4.0)
    holdall("bag_mid_2", XW - 0.18, ROW_Y[6] + 0.10, 0.45, 0.28, 0.19, (0.047, 0.055, 0.062), turn=5.0)
    holdall("bag_far_1", -(XW - 0.2), ROW_Y[9] - 0.1, 0.62, 0.34, 0.27, (0.05, 0.048, 0.044), turn=2.0)
    holdall("bag_far_left", -(XW - 0.19), ROW_Y[12] - 0.13, 0.46, 0.32, 0.20, (0.067, 0.055, 0.049), turn=-1.0)
    holdall("bag_far_2", XW - 0.19, ROW_Y[7] + 0.05, 0.55, 0.3, 0.3, (0.035, 0.042, 0.05), turn=-3.0)
    holdall("bag_far_3", XW - 0.2, ROW_Y[11] - 0.05, 0.7, 0.36, 0.24, (0.06, 0.055, 0.05), turn=1.0)


# ---------------------------------------------------------------- outside
def outside(hero=(), seed=7):
    """The dark country beyond the glass: a far night plane each side (ground almost black, a faint horizon glow),
    and the passing lights as soft horizontal streaks at many distances; `hero` adds streaks at given centres
    (x, y, z, length, height, rgb, strength)."""
    m = materials()
    for s in (-1, 1):
        nm = f"night_{'L' if s < 0 else 'R'}"
        ob = box(nm, (0.1, 600.0, 160.0), (s * 150.0, 8.0, 0.0), m["night"])
        ob.visible_shadow = False
    rng = random.Random(seed)
    cols = [((1.0, 0.56, 0.24), 0.45), ((0.78, 0.86, 1.0), 0.3), ((1.0, 0.78, 0.55), 0.15), ((0.6, 0.85, 0.8), 0.1)]

    def colour():
        r = rng.random()
        for c, w in cols:
            if r < w:
                return c
            r -= w
        return cols[0][0]
    specs = []
    for s in (-1, 1):
        for i in range(18 if s < 0 else 14):
            d = 3.5 + rng.random() ** 1.6 * 55.0
            y = rng.uniform(-12.0, 60.0)
            z = rng.uniform(-2.5, 3.8) * (0.4 + d / 40.0)
            if i % 3 == 1:
                length = rng.uniform(1.2, 2.5)
            else:
                window_span = 2 * WIN_HW * (1.0 + d / 1.2)
                length = min(rng.uniform(2.4, 5.6) * (0.6 + d / 18.0), window_span * 1.65, 12.0)
            hgt = rng.uniform(0.025, 0.08) * (0.5 + d / 18.0)
            stren = rng.uniform(1.2, 4.5) * (1.0 + d / 30.0)
            specs.append((s * (XW + d), y, z, length, hgt, colour(), stren))
    specs += list(hero)
    for i, sp in enumerate(specs):
        streak_obj(f"streak_{i}", *sp)
    return specs


def streak_obj(name, x, y, z, length, hgt, rgb, stren):
    """One passing light: a quad facing the carriage (local X along the track, Y up), the streak shader on it."""
    mat = mt.streak(name, rgb, stren)
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5, matrix=Matrix.Diagonal((length, hgt * 3.0, 1, 1)))
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    ob.location = (x, y, z)
    ob.rotation_euler = (math.radians(90), 0, math.radians(90 if x < 0 else -90))
    me.materials.append(mat)
    ob.visible_shadow = False
    ob.visible_diffuse = False
    return ob
