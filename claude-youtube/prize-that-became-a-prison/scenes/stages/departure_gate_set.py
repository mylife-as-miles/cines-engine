"""The departure gate set: a holdroom at night on the upper (departures) level of a terminal.

World layout (metres, Z up, floor z = 0). The curtain wall runs along X at y = WIN (glass at GLASS_Y); the seat rows
face it (+Y). The apron is APRON below the floor. Our stand's aircraft is parked nose-in at AIR with the jet bridge
from the door section (DOOR) reaching its forward left door. Everything here is geometry built in Python, except the
gate seats (the gate-seating prop, instanced).

    floor()  ceiling()  curtain_wall()  door_section()  walls()  columns()  podium()  dressing()  seats()
    exterior()  (apron, markings, masts, jet bridge, aircraft, vehicles, distant lights, city, sky)

The gate seats are built in departure_gate_seats.py (the gate-seating prop's perforated panels rendered as lumpy
snakeskin); the airliners (a lofted skin with a drooped nose, six-pane flight deck, nose gear, hung engines), the jet
bridge (rotunda, telescoping ribbed tunnels, cab and bellows, drive bogie) and the flood masts in
departure_gate_aircraft.py.
"""
import math
import random

import bpy
import bmesh
from mathutils import Matrix, Vector

import setkit as sk
import departure_gate_mats as mt
import departure_gate_seats as seatkit

H = 3.9            # ceiling
WIN = 6.0          # room side of the curtain wall (mullion faces)
GLASS_Y = 6.1
BACK = -8.0
XL, XR = -13.0, 12.0
APRON = -4.6       # the apron is a storey below the departures floor
STRIP = 5.1        # carpet ends, the stone strip along the glass begins

ROWS = [2.9, 0.85, 0.05, -1.9, -2.7]   # seat-unit origins (y)
UNITS = [-6.2, -3.8, 0.2, 2.6]          # unit centres (x): a centre aisle between -2.6 and -1.0
SEAT_X = seatkit.SEAT_X                 # seat centres inside a unit (local x)
# (row y, turn deg, unit xs): the front row faces the glass; behind it two back-to-back pairs; a unit left out of
# each pair opens a lane toward the podium; one more unit on the right fills the floor by the column
LAYOUT = [(2.9, 0.0, UNITS), (0.85, 0.0, UNITS), (0.05, 180.0, UNITS[:3]),
          (-1.9, 0.0, UNITS + [5.9]), (-2.7, 180.0, [-6.2, -3.8, 2.6])]
PODIUM = (6.55, 4.05, -6.0)             # x, y, turn (deg); its front faces the room
DOOR = (7.2, 10.4)                      # solid door section in the curtain wall
DOOR_X = 8.8
AIR = (2.0, 15.0)                       # our aircraft: nose tip (x, y), axis +Y
COLUMNS = [(-9.6, -1.0), (8.8, -1.6), (-9.6, 5.3), (4.4, 5.3)]

COOL = (0.84, 0.92, 1.0)
FX_X = [-0.6 + 2.4 * k for k in range(-4, 5)]
FX_Y = [3.1, 0.85, -1.2, -3.3, -5.4, -7.2]
BACK_FX = [(-7.8, -7.2), (-3.0, -7.2), (4.2, -7.2)]     # far fittings behind the wide camera, out of its frame
FX_LEVEL = {  # night mode: one fitting burns just in front of Dawn's face (the lit island), one over the podium queue,
    (-0.6, 3.1): 1.0, (6.6, 3.1): 0.55, (6.6, -1.2): 0.2, **{xy: 0.4 for xy in BACK_FX},   # a few far ones dimmed
}
DIM = 0.07   # the rest of the ceiling on its night setting: every other fitting at 7 % (about 30 W each), so the
             # ceiling reads as a surface, not a void, while the pool over Dawn out-reads it by two stops and more
for _i, _x in enumerate(FX_X):
    for _j, _y in enumerate(FX_Y):
        if (_i + _j) % 2 == 0 and (round(_x, 1), round(_y, 1)) not in FX_LEVEL:
            FX_LEVEL[(round(_x, 1), round(_y, 1))] = DIM
KEY_FX = (-0.6, 3.1)
FX_ENERGY = 420.0

M = {}
LIGHTS = {}


# ---------------------------------------------------------------- helpers
def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0), parent=None):
    ob = sk.box(name, size, loc, m, bevel=bevel, rot=rot)
    if bevel:
        bv = ob.modifiers["bevel"]
        bv.limit_method, bv.segments = "ANGLE", 3
        bv.harden_normals = True
    if parent is not None:
        ob.parent = parent
    return ob


def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=32, r2=None, parent=None):
    ob = sk.cyl(name, r, depth, loc, m, rot=rot, verts=verts, r2=r2)
    if parent is not None:
        ob.parent = parent
    return ob


def sphere(name, r, loc, m, scale=(1, 1, 1), segs=24, parent=None):
    ob = sk.sphere(name, r, loc, m, segs=segs)
    ob.scale = scale
    if parent is not None:
        ob.parent = parent
    return ob


def empty(name, loc=(0, 0, 0), rot_z=0.0):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.location = loc
    e.rotation_euler = (0, 0, math.radians(rot_z))
    return e


def slab(name, quad, thick, axis, m, parent=None):
    """A thin tapered plate (wing, fin, stabiliser): `quad` four corner points of its mid-plane, `thick` the
    thickness at each corner, measured along `axis` (a unit vector)."""
    ax = Vector(axis)
    vs = [Vector(p) + ax * (t / 2) for p, t in zip(quad, thick)] + [Vector(p) - ax * (t / 2) for p, t in zip(quad, thick)]
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bv = [bm.verts.new(v) for v in vs]
    for f in ((0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
        bm.faces.new([bv[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(m)
    bv_ = ob.modifiers.new("bevel", "BEVEL")
    bv_.width, bv_.segments, bv_.limit_method = min(thick) * 0.35, 3, "ANGLE"
    ob.modifiers.new("smooth", "WEIGHTED_NORMAL")
    for p in me.polygons:
        p.use_smooth = True
    if parent is not None:
        ob.parent = parent
    return ob


def area(name, loc, size, energy, colour=COOL, spread=180, rot=(0, 0, 0)):
    li = sk.area_light(name, loc, size, energy, colour, spread_deg=spread, rot=rot)
    LIGHTS[name] = li
    return li


def spot(name, loc, energy, colour, size_deg, blend, rot, radius=0.3):
    li = bpy.data.lights.new(name, "SPOT")
    li.energy, li.color = energy, colour
    li.spot_size, li.spot_blend = math.radians(size_deg), blend
    li.shadow_soft_size = radius
    ob = bpy.data.objects.new(name, li)
    bpy.context.scene.collection.objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    LIGHTS[name] = ob
    return ob


def point(name, loc, energy, colour, radius=0.05):
    li = bpy.data.lights.new(name, "POINT")
    li.energy, li.color, li.shadow_soft_size = energy, colour, radius
    ob = bpy.data.objects.new(name, li)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    LIGHTS[name] = ob
    return ob


def materials():
    if not M:
        M.update(mt.materials())
    return M


# ---------------------------------------------------------------- the room
def floor():
    m = materials()
    cx = (XL + XR) / 2
    box("carpet", (XR - XL, STRIP - BACK, 0.1), (cx, (STRIP + BACK) / 2, -0.05), m["carpet"])
    box("stone_strip", (XR - XL, WIN + 0.25 - STRIP, 0.1), (cx, (WIN + 0.25 + STRIP) / 2, -0.05), m["stone"])
    box("carpet_edge", (XR - XL, 0.03, 0.006), (cx, STRIP, 0.003), m["steel_x"], bevel=0.0015)
    box("convector", (XR - XL - 0.2, 0.28, 0.004), (cx, 5.75, 0.002), m["convector"])
    for y in (5.6, 5.9):
        box(f"convector_frame_{y}", (XR - XL - 0.2, 0.018, 0.005), (cx, y, 0.0025), m["steel_x"], bevel=0.0015)


def fixture(x, y, level):
    """A recessed linear fitting: a thin trim flush with the pan ceiling, the opal lens just below it (lit, or mid grey
    when off; a lit lens is always brighter than its trim). The key fitting also carries a spot that throws the pool."""
    m = materials()
    n = f"fx_{x:+.1f}_{y:+.1f}"
    box(n + "_housing", (1.26, 0.17, 0.012), (x, y, H - 0.006), m["housing"], bevel=0.003)
    if level > 0:
        key = f"lens_{level:.2f}"
        if key not in M:
            # the night-setting fittings glow faintly (their reflections in the glass stay a ghost)
            M[key] = mt.lens(f"fixture lens {level:.2f}", COOL, 0.38 if level == DIM else 2.0 + 13.0 * level)
        lens = box(n + "_lens", (1.2, 0.125, 0.004), (x, y, H - 0.0135), M[key])
        lens.visible_glossy = (round(x, 1), round(y, 1)) == KEY_FX
        area(n + "_light", (x, y, H - 0.02), (1.15, 0.11), FX_ENERGY * level, COOL, spread=100)
        if (round(x, 1), round(y, 1)) == KEY_FX:
            # the downlight that throws the pool: a 1.5-2 m disc on the carpet round her seat, soft-edged
            spot(n + "_pool", (x - 0.1, y + 0.05, H - 0.03), 1450.0, (1.0, 0.88, 0.72), 29, 0.44, (math.radians(-4), 0, 0), radius=0.080)
    else:
        box(n + "_lens", (1.2, 0.125, 0.004), (x, y, H - 0.0135), m["lens_off"])


def ceiling():
    m = materials()
    cx = (XL + XR) / 2
    box("ceiling", (XR - XL, WIN - BACK, 0.06), (cx, (WIN + BACK) / 2, H + 0.03), m["ceiling"])
    box("window_bulkhead", (XR - XL, 0.62, 0.36), (cx, WIN - 0.31, H - 0.18), m["bulk"], bevel=0.006)
    box("bulkhead_diffuser", (XR - XL - 0.4, 0.07, 0.006), (cx, WIN - 0.45, H - 0.362), m["diffuser"])
    for y in FX_Y:
        for x in FX_X:
            fixture(x, y, FX_LEVEL.get((round(x, 1), round(y, 1)), 0.0))
    # sprinklers and smoke detectors on the pan grid, between the fittings
    chrome = m["steel"]
    for i, x in enumerate([-11.4 + 3.0 * k for k in range(8)]):
        for j, y in enumerate([4.6, 2.6, 0.4, -1.8, -4.0, -6.2]):
            cyl(f"spr_esc_{i}_{j}", 0.036, 0.004, (x, y, H - 0.002), m["plastic_mid"], verts=20)
            cyl(f"spr_head_{i}_{j}", 0.011, 0.035, (x, y, H - 0.02), chrome, verts=12)
            if (i + j) % 3 == 0:
                cyl(f"smoke_{i}_{j}", 0.065, 0.03, (x + 1.2, y + 0.3, H - 0.015), m["plastic_mid"], verts=28)
    for x in (-7.8, -1.8, 4.2):  # ceiling speakers
        cyl(f"spk_{x}", 0.11, 0.012, (x, 0.4, H - 0.006), m["diffuser"], verts=32)


def curtain_wall():
    m = materials()
    cx = (XL + XR) / 2
    W = XR - XL
    box("glass", (W, 0.012, H - 0.1), (cx, GLASS_Y, 0.1 + (H - 0.1) / 2), m["glass"])
    box("sill_curb", (W, 0.26, 0.1), (cx, WIN + 0.11, 0.05), m["alu"], bevel=0.004)
    box("rail_bottom", (W, 0.2, 0.05), (cx, WIN + 0.08, 0.125), m["alu"], bevel=0.004)
    box("transom", (W, 0.2, 0.06), (cx, WIN + 0.08, 2.7), m["alu"], bevel=0.004)
    x = XL + 0.9
    while x < XR:
        if not (DOOR[0] - 0.2 < x < DOOR[1] + 0.2):
            box(f"mullion_{x:+.1f}", (0.065, 0.24, H), (x, WIN + 0.1, H / 2), m["alu"], bevel=0.005)
        x += 1.8
    # outside: the building face below the glass, the roof canopy above it
    box("facade_below", (W + 120, 0.3, -APRON), (cx, GLASS_Y + 0.3, APRON / 2), m["facade"])
    box("roof_canopy", (W + 120, 2.6, 0.45), (cx, GLASS_Y + 1.3, H + 0.3), m["facade"], bevel=0.01)
    box("canopy_fascia", (W + 120, 0.06, 0.25), (cx, GLASS_Y + 2.6, H + 0.15), m["alu"])


def door_section():
    """The jet bridge door: a solid panel in the curtain wall, a steel double door with narrow vision panels onto the
    lit bridge, a card reader, and a blank backlit gate sign above."""
    m = materials()
    x0, x1 = DOOR
    w = x1 - x0
    face = WIN - 0.02
    box("door_wall", (w, 0.3, H), ((x0 + x1) / 2, WIN + 0.13, H / 2), m["wall"], bevel=0.004)
    for sx in (x0, x1):
        box(f"door_wall_trim_{sx}", (0.05, 0.32, H), (sx, WIN + 0.13, H / 2), m["alu"], bevel=0.004)
    dw, dh = 1.84, 2.32
    beyond = mt.glow("bridge interior", (0.7, 0.78, 0.9), 0.8, 0.5)
    box("door_frame", (dw + 0.14, 0.05, dh + 0.07), (DOOR_X, face - 0.005, (dh + 0.07) / 2), m["steel"], bevel=0.004)
    for s in (-1, 1):
        lx = DOOR_X + s * dw / 4
        box(f"door_leaf_{s}", (dw / 2 - 0.012, 0.05, dh), (lx, face - 0.03, dh / 2 + 0.005), m["door"], bevel=0.004)
        box(f"door_vision_{s}", (0.16, 0.052, 0.95), (lx + s * 0.2, face - 0.03, 1.45), beyond)
        box(f"door_vision_frame_{s}", (0.2, 0.054, 0.99), (lx + s * 0.2, face - 0.029, 1.45), m["steel"], bevel=0.003)
        box(f"door_kick_{s}", (dw / 2 - 0.05, 0.054, 0.25), (lx, face - 0.031, 0.14), m["steel_x"], bevel=0.002)
        cyl(f"door_bar_{s}", 0.017, dw / 2 - 0.2, (lx, face - 0.1, 1.02), m["steel_x"], rot=(0, math.pi / 2, 0), verts=16)
        for e in (-1, 1):
            box(f"door_bar_post_{s}_{e}", (0.03, 0.07, 0.05), (lx + e * (dw / 4 - 0.1), face - 0.07, 1.02), m["steel_x"], bevel=0.004)
    # the lit bridge seen through the vision panels
    area("door_beyond_light", (DOOR_X, face - 0.07, 1.45), (0.9, 0.4), 4.0, (0.7, 0.8, 1.0), spread=120,
         rot=(-math.pi / 2, 0, 0))
    # card reader by the door
    box("card_reader", (0.09, 0.03, 0.14), (x1 - 0.42, face - 0.015, 1.22), m["plastic"], bevel=0.006)
    box("card_reader_led", (0.012, 0.004, 0.006), (x1 - 0.42, face - 0.031, 1.27), m["led_green"])
    # the blank gate sign above the door (backlit, no numbers)
    box("gate_sign_case", (2.2, 0.16, 0.56), (DOOR_X, face - 0.08, 2.98), m["sign_case"], bevel=0.008)
    box("gate_sign_face", (2.1, 0.004, 0.46), (DOOR_X, face - 0.162, 2.98), m["sign"])
    area("gate_sign_light", (DOOR_X, face - 0.2, 2.98), (2.0, 0.4), 26.0, (0.78, 0.86, 1.0), spread=140,
         rot=(-math.pi / 2, 0, 0))
    point("gate_sign_under", (DOOR_X, face - 0.3, 2.62), 3.0, (0.78, 0.86, 1.0), radius=0.15)


def walls():
    m = materials()
    cx = (XL + XR) / 2
    box("back_wall", (XR - XL, 0.2, H), (cx, BACK - 0.1, H / 2), m["wall"])
    box("left_wall", (0.2, WIN - BACK, H), (XL - 0.1, (WIN + BACK) / 2, H / 2), m["wall_side"])
    box("right_wall", (0.2, WIN - BACK, H), (XR + 0.1, (WIN + BACK) / 2, H / 2), m["wall_side"])
    box("base_back", (XR - XL, 0.014, 0.1), (cx, BACK + 0.007, 0.05), m["rubber"])
    box("base_left", (0.014, WIN - BACK, 0.1), (XL + 0.007, (WIN + BACK) / 2, 0.05), m["rubber"])
    box("base_right", (0.014, WIN - BACK, 0.1), (XR - 0.007, (WIN + BACK) / 2, 0.05), m["rubber"])
    # a closed shop on the back wall: shutter down, blank fascia barely lit
    sx0, sx1 = -11.6, -6.6
    sw = sx1 - sx0
    box("shop_shutter", (sw, 0.06, 2.95), ((sx0 + sx1) / 2, BACK + 0.06, 1.475), m["shutter"])
    box("shop_bottom_bar", (sw, 0.08, 0.06), ((sx0 + sx1) / 2, BACK + 0.07, 0.03), m["steel_x"], bevel=0.003)
    for x in (sx0, sx1):
        box(f"shop_post_{x}", (0.12, 0.14, 3.05), (x, BACK + 0.07, 1.525), m["steel"], bevel=0.004)
    box("shop_hood", (sw + 0.24, 0.32, 0.36), ((sx0 + sx1) / 2, BACK + 0.16, 3.23), m["laminate_dark"], bevel=0.006)
    box("shop_fascia", (sw - 0.4, 0.004, 0.24), ((sx0 + sx1) / 2, BACK + 0.322, 3.23), m["sign_dim"])
    # departure screens on the back wall: blank, faint
    for i, x in enumerate((-4.6, -3.4)):
        box(f"fids_case_{i}", (1.16, 0.07, 0.68), (x, BACK + 0.035, 2.15), m["plastic"], bevel=0.008)
        box(f"fids_face_{i}", (1.08, 0.004, 0.6), (x, BACK + 0.072, 2.15), m["screen_dim"])
    box("fids_mount", (0.3, 0.05, 0.2), (-4.0, BACK + 0.025, 2.15), m["steel"])
    # left wall: a drinking fountain and a blank wayfinding panel
    box("fountain", (0.36, 0.46, 0.2), (XL + 0.23, -2.4, 0.86), m["steel_x"], bevel=0.01)
    box("fountain_back", (0.02, 0.5, 0.5), (XL + 0.01, -2.4, 0.95), m["steel_x"], bevel=0.003)
    box("wayfinding_case", (0.08, 1.4, 0.42), (XL + 0.04, 1.8, 2.6), m["housing"], bevel=0.006)
    box("wayfinding_face", (0.004, 1.32, 0.34), (XL + 0.082, 1.8, 2.6), m["sign_dim"])
    # right wall: a fire hose cabinet (dark glass door, no text)
    box("cabinet", (0.06, 0.7, 0.9), (XR - 0.03, -3.0, 1.3), m["steel"], bevel=0.006)
    box("cabinet_glass", (0.004, 0.6, 0.8), (XR - 0.062, -3.0, 1.3), m["glass_door"])


def columns():
    m = materials()
    for i, (x, y) in enumerate(COLUMNS):
        cyl(f"column_{i}", 0.3, H, (x, y, H / 2), m["column"], verts=48)
        for ob in (cyl(f"column_base_{i}", 0.308, 0.14, (x, y, 0.07), m["steel"], verts=48),
                   cyl(f"column_reveal_{i}", 0.292, 0.02, (x, y, 0.15), m["plastic"], verts=48),
                   cyl(f"column_top_{i}", 0.29, 0.03, (x, y, H - 0.015), m["plastic"], verts=48)):
            _bevel(ob, 0.006)


def podium():
    """The gate podium, built here: laminate body, transaction ledge with an LED strip under its lip, a work surface
    on the agent's side with a monitor (screen glowing blank toward the agent), a boarding-pass printer, a scanner."""
    m = materials()
    px, py, turn = PODIUM
    p = empty("podium", (px, py, 0), turn)
    worn = M.setdefault("laminate_worn", mt.pbr("podium laminate worn", (0.16, 0.162, 0.165), (0.24, 0.62), nscale=14,
                                                cvar=0.1, bump=0.03, bscale=300, grime=0.45))
    box("pod_body", (1.86, 0.64, 1.0), (0, 0.02, 0.5), m["laminate_dark"], bevel=0.015, parent=p)
    box("pod_fascia", (1.92, 0.04, 0.86), (0, -0.33, 0.53), worn, bevel=0.012, parent=p)
    box("pod_reveal", (1.9, 0.03, 0.02), (0, -0.352, 0.62), m["plastic"], bevel=0.004, parent=p)
    box("pod_kick", (1.88, 0.012, 0.16), (0, -0.354, 0.085), m["steel_x"], bevel=0.003, parent=p)
    for s in (-1, 1):
        box(f"pod_side_{s}", (0.05, 0.74, 1.06), (s * 0.97, 0.0, 0.53), m["laminate"], bevel=0.014, parent=p)
    box("pod_ledge", (2.02, 0.36, 0.036), (0, -0.26, 1.078), m["solid"], bevel=0.008, parent=p)
    box("pod_ledge_led", (1.86, 0.012, 0.006), (0, -0.405, 1.056), m["ledge_led"], parent=p)
    led = area("pod_ledge_light", (0, 0, 0), (1.8, 0.02), 5.0, (0.75, 0.85, 1.0), spread=150)
    led.parent = p
    led.location = (0, -0.39, 1.05)
    box("pod_work", (1.86, 0.44, 0.03), (0, 0.13, 0.765), m["solid"], bevel=0.005, parent=p)
    # monitor on the work surface, its screen toward the agent (+Y)
    cyl("pod_mon_foot", 0.1, 0.012, (-0.42, 0.18, 0.786), m["plastic"], verts=24, parent=p)
    box("pod_mon_neck", (0.05, 0.03, 0.2), (-0.42, 0.2, 0.89), m["plastic"], bevel=0.005, parent=p)
    box("pod_mon_back", (0.54, 0.045, 0.33), (-0.42, 0.19, 1.07), m["plastic"], bevel=0.008, parent=p)
    box("pod_mon_screen", (0.5, 0.004, 0.29), (-0.42, 0.214, 1.07), m["screen_front"], parent=p)
    ml = area("pod_mon_light", (0, 0, 0), (0.4, 0.25), 5.0, (0.8, 0.88, 1.0), spread=150)
    ml.parent = p
    ml.location, ml.rotation_euler = (-0.42, 0.265, 1.06), (math.pi / 2 - 0.35, 0, 0)
    # a passenger-facing display on a short stand at the ledge's left end, blank, glowing toward the room
    box("pod_disp_stand", (0.05, 0.04, 0.22), (-0.62, -0.2, 1.2), m["steel"], bevel=0.006, parent=p)
    box("pod_disp_back", (0.6, 0.05, 0.37), (-0.62, -0.215, 1.43), m["plastic"], bevel=0.01, parent=p)
    box("pod_disp_screen", (0.54, 0.004, 0.31), (-0.62, -0.242, 1.43), m["screen_front"], parent=p)
    dl = area("pod_disp_light", (0, 0, 0), (0.4, 0.25), 4.0, (0.8, 0.88, 1.0), spread=150)
    dl.parent = p
    dl.location, dl.rotation_euler = (-0.62, -0.29, 1.42), (-math.pi / 2 + 0.35, 0, 0)
    # printer, scanner cradle, phone
    box("pod_printer", (0.32, 0.26, 0.13), (0.42, 0.14, 0.845), m["plastic_mid"], bevel=0.012, parent=p)
    box("pod_printer_slot", (0.2, 0.01, 0.012), (0.42, 0.005, 0.88), m["plastic"], parent=p)
    box("pod_scanner", (0.09, 0.14, 0.05), (0.7, -0.24, 1.12), m["plastic"], bevel=0.01, parent=p)
    box("pod_scanner_led", (0.01, 0.004, 0.006), (0.7, -0.311, 1.13), m["led_green"], parent=p)
    box("pod_phone", (0.2, 0.2, 0.07), (0.78, 0.18, 0.815), m["plastic"], bevel=0.012, parent=p)
    return p


def seats():
    """The rows: one Python-built four-seat unit (departure_gate_seats), instanced per LAYOUT."""
    m = materials()
    src = seatkit.unit_collection(m)
    out = []
    for r, (y, turn, xs) in enumerate(LAYOUT):
        for u, x in enumerate(xs):
            e = bpy.data.objects.new(f"seats_r{r}_u{u}", None)
            e.instance_type, e.instance_collection = "COLLECTION", src
            bpy.context.scene.collection.objects.link(e)
            e.location = (x, y, 0)
            e.rotation_euler = (0, 0, math.radians(turn))
            out.append(e)
    bpy.context.view_layer.update()
    return out


def seat_world(row, unit_x, local):
    """World position of a point given in a seat unit's local frame."""
    y, turn, _ = LAYOUT[row]
    a = math.radians(turn)
    lx, ly, lz = local
    return (unit_x + lx * math.cos(a) - ly * math.sin(a), y + lx * math.sin(a) + ly * math.cos(a), lz)


def bin_(name, x, y):
    m = materials()
    cyl(name, 0.2, 0.78, (x, y, 0.39), m["bin"], verts=40)
    cyl(name + "_lid", 0.205, 0.05, (x, y, 0.79), m["plastic"], verts=40)
    cyl(name + "_mouth", 0.12, 0.012, (x, y, 0.81), M.setdefault("bin_mouth", mt.pbr("bin mouth", (0.003, 0.003, 0.003), (0.8, 0.9))), verts=32)
    cyl(name + "_foot", 0.19, 0.012, (x, y, 0.006), m["rubber"], verts=40)


def _bevel(ob, w):
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = w, 2, "ANGLE"
    bv.harden_normals = True
    return ob


def stanchion(name, x, y):
    """A retractable-belt stanchion: a 1 m brushed post on a 0.32 m weighted base disc, the belt cassette on top."""
    m = materials()
    _bevel(cyl(name + "_base", 0.16, 0.03, (x, y, 0.015), m["plastic"], verts=40), 0.008)
    _bevel(cyl(name + "_base_cap", 0.07, 0.02, (x, y, 0.04), m["steel"], verts=32), 0.004)
    cyl(name + "_post", 0.03, 0.92, (x, y, 0.5), m["steel"], verts=24)
    _bevel(cyl(name + "_head", 0.042, 0.08, (x, y, 0.97), m["steel"], verts=28), 0.006)
    _bevel(cyl(name + "_cap", 0.044, 0.012, (x, y, 1.016), m["plastic"], verts=28), 0.003)


def charge_post(name, x, y, face=1):
    m = materials()
    box(name, (0.16, 0.16, 1.02), (x, y, 0.51), m["steel"], bevel=0.01)
    box(name + "_face", (0.004, 0.1, 0.3), (x + face * 0.082, y, 0.78), m["plastic"], bevel=0.001)
    for z in (0.7, 0.86):
        box(f"{name}_port_{z}", (0.006, 0.05, 0.018), (x + face * 0.085, y, z), m["plastic_mid"])
    box(name + "_led", (0.006, 0.03, 0.006), (x + face * 0.085, y, 0.95), m["led_green"])


def dressing():
    m = materials()
    # bins at row ends, two charging posts
    for i, (x, y) in enumerate(((4.15, 1.05), (-7.62, 2.6), (4.0, -2.3), (-7.6, -2.3), (5.2, 4.75))):
        bin_(f"bin_{i}", x, y)
    charge_post("charge_post", -7.62, 1.1, face=1)
    charge_post("charge_post_b", 4.43, 4.90, face=1)
    # a retractable-belt stanchion pair closing the boarding lane at the podium (no text on the belt)
    for k, (x, y) in enumerate(((5.25, 2.35), (5.25, 3.45))):
        stanchion(f"stanchion_{k}", x, y)
    belt = M.setdefault("belt", mt.pbr("stanchion belt", (0.018, 0.02, 0.026), (0.45, 0.6), nscale=40, cvar=0.08))
    box("stanchion_belt", (0.012, 1.1 - 0.07, 0.05), (5.25, 2.9, 0.93), belt)
    # a floor-standing wayfinding sign by the queue: a blank backlit panel
    sx, sy = 4.75, 2.35
    box("fsign_base", (0.5, 0.36, 0.025), (sx, sy, 0.0125), m["steel"], bevel=0.006)
    box("fsign_post", (0.06, 0.06, 1.2), (sx, sy, 0.62), m["steel"], bevel=0.006)
    box("fsign_case", (0.56, 0.06, 0.62), (sx, sy, 1.5), m["sign_case"], bevel=0.01)
    box("fsign_face", (0.5, 0.004, 0.56), (sx, sy - 0.031, 1.5), m["sign_mid"])
    point("fsign_glow", (sx, sy - 0.25, 1.5), 1.5, (0.75, 0.85, 1.0), radius=0.2)
    # floor tape: a rope-less boarding lane from in front of the podium round to the door
    t = m["tape"]
    for (x0, y0, x1, y1) in ((5.3, 2.35, 9.35, 2.35), (9.35, 2.35, 9.35, 5.05), (7.75, 3.35, 8.35, 3.35), (8.35, 3.35, 8.35, 5.05)):
        L = math.hypot(x1 - x0, y1 - y0)
        box(f"tape_{x0}_{y0}", (L + 0.05, 0.05, 0.0016), ((x0 + x1) / 2, (y0 + y1) / 2, 0.0008), t,
            rot=(0, 0, math.atan2(y1 - y0, x1 - x0)))
    # a forgotten paper cup on an arm pad, a folded blank newspaper on a seat
    cx, cy, cz = seat_world(1, 0.2, (0.0, 0.03, 0.649))
    cyl("cup", 0.041, 0.11, (cx, cy, cz + 0.055), m["cup"], verts=32, r2=0.03)
    cyl("cup_lid", 0.043, 0.012, (cx, cy, cz + 0.116), m["cup_lid"], verts=32)
    cyl("cup_sip", 0.006, 0.006, (cx + 0.025, cy, cz + 0.124), m["cup_lid"], verts=12)
    nx, ny, nz = seat_world(1, -3.8, (0.3, 0.02, seatkit.seat_top(0.02)))
    box("newspaper", (0.29, 0.39, 0.012), (nx, ny, nz + 0.006), m["paper"], bevel=0.004, rot=(0, 0, math.radians(14)))
    box("newspaper_leaf", (0.28, 0.38, 0.004), (nx + 0.004, ny - 0.003, nz + 0.016), m["paper"], rot=(0, 0, math.radians(17)))


# ---------------------------------------------------------------- outside
# the airliners, the jet bridge and the flood masts are built in departure_gate_aircraft.py


def markings():
    m = materials()
    z = APRON + 0.004
    # our stand: lead-in line from the equipment line under the nose and back along the aircraft, a stop bar under the
    # nose gear; the next stands' lead-ins
    box("lead_in", (0.2, 72.5, 0.006), (AIR[0], 12.7 + 72.5 / 2, z), m["yellow"])
    box("stop_bar", (2.4, 0.3, 0.006), (AIR[0], AIR[1] + 5.2, z), m["yellow"])
    box("stop_bar_end_a", (0.3, 0.9, 0.006), (AIR[0] - 1.05, AIR[1] + 5.2, z), m["yellow"])
    box("stop_bar_end_b", (0.3, 0.9, 0.006), (AIR[0] + 1.05, AIR[1] + 5.2, z), m["yellow"])
    for x in (-36.0, 40.0):
        box(f"lead_in_{x}", (0.18, 70.0, 0.006), (x, 50.0, z), m["yellow"])
    # equipment restraint line and the service road edge along the building
    box("erl", (140.0, 0.2, 0.006), (0.0, 12.5, z), m["red"])
    box("road_edge_a", (140.0, 0.15, 0.006), (0.0, 10.0, z), m["white"])
    for k in range(-28, 28):
        box(f"road_dash_{k}", (1.5, 0.12, 0.006), (k * 2.5, 8.3, z), m["white"])
    # stand clearance box near our aircraft's side
    for (x, y, w, d) in ((-6.0, 30.0, 0.15, 12.0), (-10.0, 30.0, 0.15, 12.0), (-8.0, 24.0, 4.0, 0.15), (-8.0, 36.0, 4.0, 0.15)):
        box(f"box_{x}_{y}", (w, d, 0.006), (x, y, z), m["white"])


def belt_loader(name, base, hold, v, m):
    """A belt loader: low chassis and cab at `base` (x, y), the belt ramp rising to the hold door at `hold` (x, y, z
    above the apron), side rails, four wheels, a beacon."""
    bx, by = base
    hx, hy, hz = hold
    d = Vector((hx - bx, hy - by, 0.0))
    yaw = math.atan2(d.y, d.x)
    box(f"{name}_chassis", (4.6, 1.5, 0.55), (bx, by, APRON + 0.62), v, bevel=0.05, rot=(0, 0, yaw))
    back = Vector((bx, by, 0.0)) - d.normalized() * 1.6
    box(f"{name}_cab", (1.1, 1.3, 1.0), (back.x, back.y, APRON + 1.4), m["bellows"], bevel=0.06, rot=(0, 0, yaw))
    box(f"{name}_cab_glass", (0.6, 1.32, 0.45), (back.x, back.y, APRON + 1.55), m["cabin_off"], bevel=0.02, rot=(0, 0, yaw))
    p0 = Vector((back.x, back.y, APRON + 1.0)) + d.normalized() * 0.6
    p1 = Vector((hx, hy, APRON + hz - 0.15))
    rp = _bar_between(f"{name}_belt", p0, p1, 0.8, m["bellows"])
    rp.scale = (1.0, 1.0, 0.28)
    for s in (-1, 1):
        off = Vector((-d.normalized().y, d.normalized().x, 0.0)) * s * 0.42
        _bar_between(f"{name}_rail_{s}", p0 + off + Vector((0, 0, 0.35)), p1 + off + Vector((0, 0, 0.35)), 0.04, m["steel"])
    for k, (dl, dw) in enumerate(((-1.6, -0.7), (-1.6, 0.7), (1.6, -0.7), (1.6, 0.7))):
        p = Vector((bx, by, 0.0)) + d.normalized() * dl + Vector((-d.normalized().y, d.normalized().x, 0.0)) * dw
        cyl(f"{name}_wheel_{k}", 0.3, 0.22, (p.x, p.y, APRON + 0.3), m["tyre"], rot=(0, math.pi / 2, yaw + math.pi / 2), verts=20)
    sphere(f"{name}_beacon", 0.07, (back.x, back.y, APRON + 2.0), m["amber"], segs=12)


def cart(name, x, y, yaw, v, m, load=0.8, seed=0):
    """A covered baggage cart: deck, four corner posts, roof, a dark side curtain half drawn, a few bags."""
    rng = random.Random(seed)
    R_ = Matrix.Rotation(yaw, 3, "Z")

    def at(dx, dy):
        p = R_ @ Vector((dx, dy, 0.0))
        return x + p.x, y + p.y
    box(f"{name}_deck", (1.5, 3.0, 0.1), (x, y, APRON + 0.55), v, bevel=0.02, rot=(0, 0, yaw))
    box(f"{name}_roof", (1.55, 3.05, 0.05), (x, y, APRON + 2.05), m["bellows"], bevel=0.015, rot=(0, 0, yaw))
    for sx in (-1, 1):
        for sy in (-1, 1):
            px, py = at(sx * 0.72, sy * 1.45)
            box(f"{name}_post_{sx}_{sy}", (0.05, 0.05, 1.5), (px, py, APRON + 1.3), m["mast"], rot=(0, 0, yaw))
    px, py = at(-0.76, 0.6)
    box(f"{name}_curtain", (0.02, 1.7, 1.35), (px, py, APRON + 1.3), m["bellows"], rot=(0, 0, yaw))
    for k in range(int(3 * load) + 1):
        bx_, by_ = at(rng.uniform(-0.35, 0.35), -1.0 + k * 0.75)
        box(f"{name}_bag_{k}", (rng.uniform(0.45, 0.65), rng.uniform(0.25, 0.4), rng.uniform(0.5, 0.75)),
            (bx_, by_, APRON + 0.6 + 0.3), m["bellows"], bevel=0.06, rot=(0, 0, yaw + rng.uniform(-0.3, 0.3)))
    for k, (dx, dy) in enumerate(((-0.6, -1.1), (0.6, -1.1), (-0.6, 1.1), (0.6, 1.1))):
        px, py = at(dx, dy)
        cyl(f"{name}_wheel_{k}", 0.2, 0.14, (px, py, APRON + 0.2), m["tyre"], rot=(0, math.pi / 2, yaw), verts=16)
    px, py = at(0, -1.9)
    _bar_between(f"{name}_drawbar", (px, py, APRON + 0.35), (at(0, -1.5)[0], at(0, -1.5)[1], APRON + 0.45), 0.06, m["mast"])


def vehicles():
    """The turnaround round our aircraft, where the masts light it: a belt loader at the aft hold and a tug with
    three baggage carts on the starboard side behind the engine (seen past the wing from the gate), a belt loader at
    the forward hold, a ground power unit and a pushback tug at the nose (below the sill line)."""
    m = materials()
    v = m["vehicle"]
    ax, ay = AIR
    belt_loader("belt_aft", (ax - 5.6, ay + 25.6), (ax - 1.6, ay + 24.2, 2.75), v, m)
    belt_loader("belt_fwd", (ax - 5.4, ay + 10.8), (ax - 1.6, ay + 9.6, 2.75), v, m)
    # the baggage train: tug leading toward the nose, three carts behind it
    yaw = math.radians(8.0)
    tx, ty = ax - 9.8, ay + 21.5
    box("tug_body", (1.5, 2.4, 0.8), (tx, ty, APRON + 0.7), v, bevel=0.06, rot=(0, 0, yaw))
    box("tug_cab", (1.3, 1.0, 1.05), (tx, ty + 0.5, APRON + 1.62), m["bellows"], bevel=0.05, rot=(0, 0, yaw))
    box("tug_cab_glass", (1.32, 0.6, 0.5), (tx, ty + 0.55, APRON + 1.75), m["cabin_off"], bevel=0.02, rot=(0, 0, yaw))
    for k, (dx, dy) in enumerate(((-0.65, -0.8), (0.65, -0.8), (-0.65, 0.8), (0.65, 0.8))):
        cyl(f"tug_wheel_{k}", 0.34, 0.25, (tx + dx, ty + dy, APRON + 0.34), m["tyre"], rot=(0, math.pi / 2, yaw), verts=20)
    sphere("tug_beacon", 0.08, (tx, ty + 0.5, APRON + 2.22), m["amber"], segs=12)
    for c in range(3):
        cart(f"cart_{c}", tx - (c + 1) * 3.75 * math.sin(yaw), ty + (c + 1) * 3.75 * math.cos(yaw), yaw, v, m,
             load=0.4 + 0.3 * c, seed=c)
    box("gpu", (1.2, 2.2, 1.2), (ax - 4.0, ay + 3.0, APRON + 0.7), v, bevel=0.04)
    sphere("gpu_beacon", 0.07, (ax - 4.0, ay + 3.0, APRON + 1.36), m["amber"], segs=12)
    # a pushback tug waiting in front of the nose, its tow bar on the nose gear
    box("push_body", (2.1, 3.4, 0.85), (ax, ay - 2.4, APRON + 0.62), v, bevel=0.06)
    box("push_cab", (0.9, 1.0, 0.7), (ax - 0.55, ay - 3.4, APRON + 1.4), m["bellows"], bevel=0.05)
    box("push_glass", (0.92, 0.6, 0.4), (ax - 0.55, ay - 3.4, APRON + 1.5), m["cabin_off"], bevel=0.02)
    for k, (dx, dy) in enumerate(((-0.95, -1.2), (0.95, -1.2), (-0.95, 1.2), (0.95, 1.2))):
        cyl(f"push_wheel_{k}", 0.4, 0.3, (ax + dx, ay - 2.4 + dy, APRON + 0.4), m["tyre"], rot=(0, math.pi / 2, 0), verts=24)
    sphere("push_beacon", 0.08, (ax - 0.55, ay - 3.4, APRON + 1.83), m["amber"], segs=12)
    _bar_between("towbar", (ax, ay - 0.6, APRON + 0.45), (ax, ay + 4.9, APRON + 0.37), 0.12, m["vehicle"])


def _bar_between(name, p0, p1, w, m):
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    ob = box(name, (w, d.length, w), (p0 + p1) / 2, m, bevel=0.01)
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = d.normalized().to_track_quat("Y", "Z")
    return ob


def far_lights():
    m = materials()
    z = APRON + 0.35
    proto = {}

    def dot(name, loc, mat, r):
        key = (mat.name, r)
        if key not in proto:
            me = bpy.data.meshes.new(f"dot_{len(proto)}")
            bm = bmesh.new()
            bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=r)
            bm.to_mesh(me)
            bm.free()
            me.materials.append(mat)
            proto[key] = me
        ob = bpy.data.objects.new(name, proto[key])
        bpy.context.scene.collection.objects.link(ob)
        ob.location = loc
        ob.visible_shadow = False
        return ob

    for k, x in enumerate(range(-900, 901, 60)):
        for s in (-1, 1):
            dot(f"rwy_{k}_{s}", (x, 430 + s * 23, z), m["edge_white"], 0.7)
    for k, x in enumerate(range(-520, 521, 52)):
        for s in (-1, 1):
            dot(f"twy_{k}_{s}", (x, 205 + s * 12, z), m["edge_blue"], 0.45)
    for k, x in enumerate(range(-500, 501, 30)):
        dot(f"twc_{k}", (x, 205, APRON + 0.15), m["centre_green"], 0.3)
    # a taxilane from the apron out to the taxiway: blue edge lights every 30 m receding toward the runway, green
    # centre lights between
    for k, y in enumerate(range(48, 200, 30)):
        for x in (-12.0, 18.0):
            dot(f"lane_{k}_{x}", (x, y, APRON + 0.3), m["edge_blue_near"], 0.26)
        dot(f"lane_c_{k}", (3.0, y + 15, APRON + 0.1), m["centre_green"], 0.2)
    box("runway", (3000, 46, 0.02), (0, 430, APRON + 0.01), m["asphalt"])
    box("taxiway", (1400, 23, 0.02), (0, 205, APRON + 0.01), m["asphalt"])


def far_buildings():
    m = materials()
    # a satellite concourse across the apron, its glazing faintly lit; a control tower far off
    box("satellite", (260, 22, 13), (-210, 250, APRON + 6.5), m["facade"])
    box("satellite_glazing", (250, 0.2, 3.2), (-210, 238.9, APRON + 7.0), m["building_glow"])
    box("satellite_roof", (262, 24, 0.6), (-210, 250, APRON + 13.2), m["alu"])
    box("hangar", (120, 60, 24), (260, 330, APRON + 12), m["facade"])
    box("hangar_door_glow", (90, 0.2, 2.0), (260, 299.8, APRON + 20.0), m["building_glow"])
    cyl("tower_shaft", 3.2, 52, (150, 760, APRON + 26), m["facade"], verts=24, r2=2.6)
    cyl("tower_cab", 6.2, 5.0, (150, 760, APRON + 55.0), m["tower_glow"], verts=24)
    cyl("tower_roof", 7.0, 1.2, (150, 760, APRON + 58.1), m["facade"], verts=24)
    sphere("tower_beacon", 0.7, (150, 760, APRON + 62.0), m["nav_red"], segs=12)
    # the city on the horizon
    me = bpy.data.meshes.new("city_strip")
    W, Hc = 9000.0, 55.0
    me.from_pydata([(-W / 2, 0, 0), (W / 2, 0, 0), (W / 2, 0, Hc), (-W / 2, 0, Hc)], [], [(0, 1, 2, 3)])
    me.materials.append(m["city"])
    ob = bpy.data.objects.new("city_strip", me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = (0, 2600, APRON - 2.0)
    ob.visible_shadow = False
    ob.visible_diffuse = False


def sky_dome():
    m = materials()
    me = bpy.data.meshes.new("sky_dome")
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=3000.0)
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(m["sky"])
    ob = bpy.data.objects.new("sky_dome", me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = (0, 0, APRON)
    ob.visible_shadow = False
    return ob


def exterior():
    m = materials()
    box("apron", (520, 280, 0.1), (0, 146, APRON - 0.05), m["concrete"])
    box("airfield", (9000, 9000, 0.1), (0, 0, APRON - 0.12), m["grass"])
    markings()
    # flood masts 18-20 m high, 25-40 m from what they light, wide soft spots from above: the key on our nose from
    # the front left (out of frame), one beyond the stand on the right (its lamp head in the window frame), one over
    # the turnaround behind the engine, the next stands and the far apron
    import departure_gate_aircraft as ac
    for i, (x, y, t, h, e, show) in enumerate((
            (-19.0, 31.0, (1.5, 20.0), 20.0, 80000.0, True), (22.0, 58.0, (5.0, 26.0), 16.0, 60000.0, True),
            (-8.0, 66.0, (-6.0, 42.0), 20.0, 80000.0, True), (46.0, 76.0, (40.0, 52.0), 20.0, 100000.0, True),
            (-58.0, 56.0, (-38.0, 32.0), 20.0, 100000.0, True), (90.0, 44.0, (70.0, 30.0), 20.0, 90000.0, True))):
        # the key mast's cone is 72 deg, aimed past the nose, so only its soft edge spills through the glass onto the
        # floor and the front row (a rim, not a second pool)
        ac.mast(i, x, y, t, h=h, energy=e * (0.55 if i < 2 else 0.85), show=show, size=72.0 if i == 0 else 82.0)
    ac.jet_bridge(AIR)
    ac.aircraft("aircraft", AIR, 0.0, lit=0.55, seed=3)
    ac.aircraft("aircraft_far", (-60.0, 160.0), 90.0, lit=0.75, seed=11, taxi=True)
    ac.aircraft("aircraft_next", (-36.0, 16.5), 0.0, lit=0.25, seed=5, side=1)
    vehicles()
    far_lights()
    far_buildings()
    sky_dome()
