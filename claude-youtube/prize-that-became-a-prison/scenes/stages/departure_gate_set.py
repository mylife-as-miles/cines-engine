"""The departure gate set: a holdroom at night on the upper (departures) level of a terminal.

World layout (metres, Z up, floor z = 0). The curtain wall runs along X at y = WIN (glass at GLASS_Y); the seat rows
face it (+Y). The apron is APRON below the floor. Our stand's aircraft is parked nose-in at AIR with the jet bridge
from the door section (DOOR) reaching its forward left door. Everything here is geometry built in Python, except the
gate seats (the gate-seating prop, instanced).

    floor()  ceiling()  curtain_wall()  door_section()  walls()  columns()  podium()  dressing()  seats()
    exterior()  (apron, markings, masts, jet bridge, aircraft, vehicles, distant lights, city, sky)

The gate seats are built in departure_gate_seats.py (the gate-seating prop's perforated panels rendered as lumpy
snakeskin); the airliners are lathed: an ogive nose with droop, the body and the upswept tail cone in one skin with UVs
in metres for the panel lines.
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
FX_Y = [2.9, 0.85, -1.2, -3.3, -5.4, -7.2]
FX_LEVEL = {  # night mode: one fitting burns over Dawn's seat (the lit island), one over the podium queue, three far
    (-0.6, 2.9): 1.0, (6.6, 2.9): 0.55, (-7.8, -7.2): 0.15, (-3.0, -5.4): 0.15, (4.2, -7.2): 0.15,
}
KEY_FX = (-0.6, 2.9)
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
            M[key] = mt.lens(f"fixture lens {level:.2f}", COOL, 6.0 + 9.0 * level)
        box(n + "_lens", (1.2, 0.125, 0.004), (x, y, H - 0.0135), M[key])
        area(n + "_light", (x, y, H - 0.02), (1.15, 0.11), FX_ENERGY * level, COOL, spread=100)
        if (round(x, 1), round(y, 1)) == KEY_FX:
            spot(n + "_pool", (x, y, H - 0.03), 520.0, COOL, 50, 0.7, (0, 0, 0), radius=0.3)
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
        cyl(f"column_base_{i}", 0.308, 0.14, (x, y, 0.07), m["steel"], verts=48)
        cyl(f"column_reveal_{i}", 0.292, 0.02, (x, y, 0.15), m["plastic"], verts=48)
        cyl(f"column_top_{i}", 0.29, 0.03, (x, y, H - 0.015), m["plastic"], verts=48)


def podium():
    """The gate podium, built here: laminate body, transaction ledge with an LED strip under its lip, a work surface
    on the agent's side with a monitor (screen glowing blank toward the agent), a boarding-pass printer, a scanner."""
    m = materials()
    px, py, turn = PODIUM
    p = empty("podium", (px, py, 0), turn)
    box("pod_body", (1.86, 0.64, 1.0), (0, 0.02, 0.5), m["laminate_dark"], parent=p)
    box("pod_fascia", (1.92, 0.04, 0.86), (0, -0.33, 0.53), m["laminate"], bevel=0.005, parent=p)
    box("pod_reveal", (1.9, 0.03, 0.02), (0, -0.335, 0.62), m["plastic"], parent=p)
    box("pod_kick", (1.84, 0.02, 0.1), (0, -0.3, 0.05), m["steel_x"], bevel=0.002, parent=p)
    for s in (-1, 1):
        box(f"pod_side_{s}", (0.05, 0.74, 1.06), (s * 0.97, 0.0, 0.53), m["laminate"], bevel=0.006, parent=p)
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
    charge_post("charge_post_b", -1.8, 0.45, face=-1)
    # a floor-standing wayfinding sign by the queue: a blank backlit panel with a plain arrow (a pictogram, no text)
    sx, sy = 4.75, 2.35
    box("fsign_base", (0.5, 0.36, 0.025), (sx, sy, 0.0125), m["steel"], bevel=0.006)
    box("fsign_post", (0.06, 0.06, 1.2), (sx, sy, 0.62), m["steel"], bevel=0.006)
    box("fsign_case", (0.56, 0.06, 0.62), (sx, sy, 1.5), m["sign_case"], bevel=0.01)
    box("fsign_face", (0.5, 0.004, 0.56), (sx, sy - 0.031, 1.5), m["sign_dim"])
    for k, (dx, dz, rot) in enumerate(((0.0, 0.0, 0.0), (0.07, 0.06, -0.7854), (0.07, -0.06, 0.7854))):
        L = 0.24 if k == 0 else 0.13
        box(f"fsign_arrow_{k}", (L, 0.003, 0.03), (sx + dx - (0.04 if k == 0 else 0), sy - 0.0345, 1.5 + dz), m["sign"],
            rot=(0, rot, 0))
    point("fsign_glow", (sx, sy - 0.25, 1.5), 1.5, (0.75, 0.85, 1.0), radius=0.2)
    # floor tape: a rope-less boarding lane from in front of the podium round to the door
    t = m["tape"]
    for (x0, y0, x1, y1) in ((5.3, 2.35, 9.35, 2.35), (9.35, 2.35, 9.35, 5.05), (7.75, 3.35, 8.35, 3.35), (8.35, 3.35, 8.35, 5.05)):
        L = math.hypot(x1 - x0, y1 - y0)
        box(f"tape_{x0}_{y0}", (L + 0.05, 0.05, 0.0016), ((x0 + x1) / 2, (y0 + y1) / 2, 0.0008), t,
            rot=(0, 0, math.atan2(y1 - y0, x1 - x0)))
    # a forgotten paper cup on an arm pad, a folded blank newspaper on a seat
    cx, cy, cz = seat_world(1, 0.2, (0.0, 0.03, 0.689))
    cyl("cup", 0.041, 0.11, (cx, cy, cz + 0.055), m["cup"], verts=32, r2=0.03)
    cyl("cup_lid", 0.043, 0.012, (cx, cy, cz + 0.116), m["cup_lid"], verts=32)
    cyl("cup_sip", 0.006, 0.006, (cx + 0.025, cy, cz + 0.124), m["cup_lid"], verts=12)
    nx, ny, nz = seat_world(1, -3.8, (0.3, 0.02, seatkit.seat_top(0.02)))
    box("newspaper", (0.29, 0.39, 0.012), (nx, ny, nz + 0.006), m["paper"], bevel=0.004, rot=(0, 0, math.radians(14)))
    box("newspaper_leaf", (0.28, 0.38, 0.004), (nx + 0.004, ny - 0.003, nz + 0.016), m["paper"], rot=(0, 0, math.radians(17)))


# ---------------------------------------------------------------- outside
ZC, RF = 3.75, 1.98          # fuselage axis height above the apron, fuselage radius
NOSE_L, TIP_R, DROOP = 6.25, 0.25, 0.55


def skin(y):
    """(radius, axis offset in z) of the fuselage at local y (nose tip at 0, body along +Y): an ogive nose over NOSE_L
    whose axis droops DROOP at the tip, the constant body, the upswept tail cone from 29.5 to 37.9."""
    if y <= NOSE_L:
        t = max(0.0, y / NOSE_L)
        return TIP_R + (RF - TIP_R) * (1 - (1 - t) ** 2.4), -DROOP * (1 - t) ** 2
    if y <= 29.5:
        return RF, 0.0
    t = min(1.0, (y - 29.5) / 8.4)
    return RF - (RF - 0.32) * t ** 1.25, 1.3 * t ** 1.35


def skin_point(y, th, off=0.0):
    """A point on the skin at local y and angle th (radians from the crown, toward +X), pushed `off` along the normal."""
    r, zc = skin(y)
    p = Vector((r * math.sin(th), y, ZC + zc + r * math.cos(th)))
    if off:
        e = 0.01
        r1, z1 = skin(y + e)
        r0, z0 = skin(y - e)
        dy = Vector(((r1 - r0) * math.sin(th), 2 * e, (z1 - z0) + (r1 - r0) * math.cos(th)))
        dt = Vector((r * math.cos(th), 0.0, -r * math.sin(th)))
        n = dt.cross(dy).normalized()
        if n.dot(Vector((math.sin(th), 0, math.cos(th)))) < 0:
            n = -n
        p = p + n * off
    return p


def fuselage_skin(name, m, parent, segs=64):
    """Nose cap, ogive nose, body and tail cone as one lathed skin; UVs in metres (u around at the full radius, v
    along) so the paint's panel lines keep their size."""
    ys = []
    # a spherical cap tangent to the ogive at the tip ring
    k = (RF - TIP_R) * 2.4 / NOSE_L
    rho = TIP_R * math.sqrt(1 + k * k)
    yc = TIP_R * k
    b1 = math.asin(TIP_R / rho)
    rings = [(yc - rho * math.cos(b1 * q / 5), rho * math.sin(b1 * q / 5), -DROOP) for q in range(1, 5)]
    for q in range(0, 29):
        y = NOSE_L * (q / 28) ** 1.5
        r, zc = skin(y)
        rings.append((y, r, zc))
    for y in (8.0, 11.0, 14.0, 17.0, 20.0, 23.0, 26.0, 29.5):
        rings.append((y, RF, 0.0))
    for q in range(1, 15):
        y = 29.5 + 8.4 * q / 14
        r, zc = skin(y)
        rings.append((y, r, zc))
    rings.append((38.02, 0.24, 1.3))
    apex_front = (yc - rho, -DROOP)
    apex_back = (38.08, 1.3)
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    grid = []
    for (y, r, zc) in rings:
        grid.append([bm.verts.new((r * math.sin(2 * math.pi * j / segs), y, ZC + zc + r * math.cos(2 * math.pi * j / segs)))
                     for j in range(segs)])
    tipf = bm.verts.new((0, apex_front[0], ZC + apex_front[1]))
    tipb = bm.verts.new((0, apex_back[0], ZC + apex_back[1]))
    U = 2 * math.pi * RF

    def setuv(f, coords):
        for lp, c in zip(f.loops, coords):
            lp[uv].uv = c
    for i in range(len(rings) - 1):
        for j in range(segs):
            j1 = (j + 1) % segs
            f = bm.faces.new((grid[i][j], grid[i][j1], grid[i + 1][j1], grid[i + 1][j]))
            u0, u1 = U * j / segs, U * (j + 1) / segs
            setuv(f, [(u0, rings[i][0]), (u1, rings[i][0]), (u1, rings[i + 1][0]), (u0, rings[i + 1][0])])
    for j in range(segs):
        j1 = (j + 1) % segs
        f = bm.faces.new((tipf, grid[0][j1], grid[0][j]))
        setuv(f, [(U * (j + 0.5) / segs, apex_front[0]), (U * (j + 1) / segs, rings[0][0]), (U * j / segs, rings[0][0])])
        f = bm.faces.new((tipb, grid[-1][j], grid[-1][j1]))
        setuv(f, [(U * (j + 0.5) / segs, apex_back[0]), (U * j / segs, rings[-1][0]), (U * (j + 1) / segs, rings[-1][0])])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    ob.parent = parent
    # outward normals: the crown face at mid-body must point up
    top = max(me.polygons, key=lambda p: p.center.z if 10 < p.center.y < 12 else -1e9)
    if top.normal.z < 0:
        me.flip_normals()
    return ob


def skin_patch(name, yb, yt, thb, tht, off, m, parent, hole=None, n=(6, 4)):
    """A patch on the skin over y in [yb, yt] and angle ranges thb (bottom) -> tht (top), `off` metres proud. With
    `hole` = (ea, eb) the patch is a frame: the range grown by ea/eb (fractions) with the original range left open."""
    def at(a, b):
        y = yb + b * (yt - yb)
        lo = thb[0] + b * (tht[0] - thb[0])
        hi = thb[1] + b * (tht[1] - thb[1])
        return skin_point(y, lo + a * (hi - lo), off)
    if hole:
        ea, eb = hole
        A = [-ea] + [q / n[0] for q in range(n[0] + 1)] + [1 + ea]
        B = [-eb] + [q / n[1] for q in range(n[1] + 1)] + [1 + eb]
    else:
        A = [q / n[0] for q in range(n[0] + 1)]
        B = [q / n[1] for q in range(n[1] + 1)]
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    V = [[bm.verts.new(at(a, b)) for b in B] for a in A]
    for i in range(len(A) - 1):
        for j in range(len(B) - 1):
            if hole and 0 < i < len(A) - 2 and 0 < j < len(B) - 2:
                continue
            f = bm.faces.new((V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1]))
            c = f.calc_center_median()
            f.normal_update()
            out = Vector((c.x, 0, c.z - ZC)).normalized()
            if f.normal.dot(out) < 0:
                f.normal_flip()
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    ob.parent = parent
    return ob


# the flight-deck glazing on one side (angles toward +X): windscreen, sliding window, rear side window
COCKPIT = [((2.15, 2.62), (0.025, 0.47), (0.025, 0.40)),
           ((2.40, 2.88), (0.54, 0.86), (0.47, 0.80)),
           ((2.70, 3.16), (0.92, 1.10), (0.87, 1.05))]


def aircraft(name, nose, heading=0.0, lit=0.6, seed=1, taxi=False, side=-1):
    """A generic narrow-body airliner, no livery: nose tip at `nose` (x, y), body along local +Y (the nose looks
    along local -Y), ground at the apron. Windows lit on one side (`side` -1: starboard, local -X; +1: port)."""
    m = materials()
    rng = random.Random(seed)
    root = empty(name, (nose[0], nose[1], APRON), 0.0)
    P = dict(parent=root)
    R = RF
    paint, belly = m["fuselage"], m["fuselage_dark"]
    fuselage_skin(f"{name}_skin", paint, root)
    sphere(f"{name}_fairing", 1.0, (0, 16.6, ZC - 1.25), belly, scale=(R * 0.97, 6.8, 1.15), segs=32, **P)
    # wings (low, swept 27 deg, dihedral), sharklets
    sw = math.tan(math.radians(27))
    for s in (-1, 1):
        rz = ZC - 1.4
        tip_x, tip_z = s * 17.1, rz + 1.35
        le_tip = 12.6 + (17.1 - 1.7) * sw
        slab(f"{name}_wing_{s}", [(s * 1.7, 12.6, rz), (s * 1.7, 19.8, rz), (tip_x, le_tip + 1.6, tip_z), (tip_x, le_tip, tip_z)],
             [0.5, 0.22, 0.06, 0.14], (0, 0, 1), paint, **P)
        slab(f"{name}_sharklet_{s}", [(tip_x, le_tip + 0.1, tip_z), (tip_x, le_tip + 1.6, tip_z),
                                     (tip_x + s * 0.25, le_tip + 2.3, tip_z + 2.2), (tip_x + s * 0.25, le_tip + 1.6, tip_z + 2.2)],
             [0.12, 0.06, 0.04, 0.06], (1, 0, 0), paint, **P)
        ex = s * 5.7
        cyl(f"{name}_nacelle_{s}", 0.82, 4.4, (ex, 12.6, ZC - 2.3), m["engine"], rot=(math.pi / 2, 0, 0), r2=1.02, verts=40, **P)
        cyl(f"{name}_intake_lip_{s}", 1.04, 0.12, (ex, 10.42, ZC - 2.3), m["gear"], rot=(math.pi / 2, 0, 0), verts=40, **P)
        cyl(f"{name}_intake_{s}", 0.9, 0.05, (ex, 10.36, ZC - 2.3), m["intake"], rot=(math.pi / 2, 0, 0), verts=40, **P)
        cyl(f"{name}_exhaust_{s}", 0.3, 1.1, (ex, 15.3, ZC - 2.3), m["gear"], rot=(math.pi / 2, 0, 0), r2=0.6, verts=32, **P)
        box(f"{name}_pylon_{s}", (0.28, 3.6, 0.8), (ex, 13.8, ZC - 1.55), paint, bevel=0.05, **P)
        # main gear
        gx = s * 3.8
        cyl(f"{name}_mgear_{s}", 0.13, ZC - 1.7 - 0.58, (gx, 18.6, 0.58 + (ZC - 1.7 - 0.58) / 2), m["gear"], verts=16, **P)
        for w in (-1, 1):
            cyl(f"{name}_mwheel_{s}_{w}", 0.58, 0.38, (gx + w * 0.42, 18.6, 0.58), m["tyre"], rot=(0, math.pi / 2, 0), verts=32, **P)
            cyl(f"{name}_mhub_{s}_{w}", 0.3, 0.39, (gx + w * 0.42, 18.6, 0.58), m["gear"], rot=(0, math.pi / 2, 0), verts=24, **P)
        # tailplane
        slab(f"{name}_stab_{s}", [(s * 0.7, 31.2, ZC + 0.8), (s * 0.7, 35.0, ZC + 0.8), (s * 6.3, 36.3, ZC + 1.1), (s * 6.3, 34.7, ZC + 1.1)],
             [0.24, 0.1, 0.05, 0.08], (0, 0, 1), paint, **P)
        # flight-deck glazing: near-black glass a little below a dark frame that stands proud of the skin
        for k, ((yb, yt), thb, tht) in enumerate(COCKPIT):
            thb_s, tht_s = tuple(s * t for t in thb), tuple(s * t for t in tht)
            skin_patch(f"{name}_ckpt_frame_{s}_{k}", yb, yt, thb_s, tht_s, 0.02, m["cockpit_frame"], root,
                       hole=(0.045 / (abs(thb[1] - thb[0]) * 1.4), 0.045 / (yt - yb)))
            skin_patch(f"{name}_ckpt_glass_{s}_{k}", yb, yt, thb_s, tht_s, 0.006, m["cockpit_glass"], root)
        # passenger doors, both sides: thin dark outlines on the skin (forward and aft)
        for j, yd in enumerate((4.8, 29.2)):
            skin_patch(f"{name}_door_{s}_{j}", yd - 0.42, yd + 0.42, (s * 0.74, s * 1.73), (s * 0.74, s * 1.73), 0.003,
                       belly, root, hole=(0.025 / (0.99 * RF), 0.025 / 0.84), n=(4, 2))
    # fin
    slab(f"{name}_fin", [(0, 28.6, ZC + 1.5), (0, 36.2, ZC + 1.5), (0, 37.0, ZC + 7.6), (0, 34.2, ZC + 7.6)],
         [0.42, 0.16, 0.08, 0.14], (1, 0, 0), paint, **P)
    # nose gear
    cyl(f"{name}_ngear", 0.08, ZC - 1.5 - 0.36, (0, 5.0, 0.36 + (ZC - 1.5 - 0.36) / 2), m["gear"], verts=16, **P)
    for w in (-1, 1):
        cyl(f"{name}_nwheel_{w}", 0.36, 0.24, (w * 0.19, 5.0, 0.36), m["tyre"], rot=(0, math.pi / 2, 0), verts=28, **P)
    # cabin windows on one side, following the skin
    zw = 0.45
    xw = math.sqrt(R * R - zw * zw) + 0.006
    ang = math.atan2(zw, xw)
    y = 6.6
    i = 0
    while y < 28.8:
        if not (14.6 < y < 15.6):  # over-wing exits: a plain panel
            r = rng.random()
            mat = m["cabin_lit"] if r < lit else (m["cabin_dim"] if r < lit + 0.12 else m["cabin_off"])
            box(f"{name}_win_{i}", (0.03, 0.24, 0.33), (side * xw, y, ZC + zw), mat, bevel=0.008, rot=(0, -side * ang, 0), **P)
        y += 0.76
        i += 1
    # navigation lights: beacons red, starboard tip green, port tip red, tail white
    sphere(f"{name}_beacon_top", 0.1, (0, 16.0, ZC + R + 0.08), m["nav_red"], segs=12, **P)
    sphere(f"{name}_beacon_low", 0.1, (0, 19.0, ZC - R - 0.08), m["nav_red"], segs=12, **P)
    sphere(f"{name}_nav_stbd", 0.1, (-17.15, 12.6 + 15.4 * sw + 0.5, ZC - 0.03), m["nav_green"], segs=12, **P)
    sphere(f"{name}_nav_port", 0.1, (17.15, 12.6 + 15.4 * sw + 0.5, ZC - 0.03), m["nav_red"], segs=12, **P)
    sphere(f"{name}_nav_tail", 0.08, (0, 38.1, ZC + 1.3), m["nav_white"], segs=12, **P)
    if taxi:
        sphere(f"{name}_taxi_lamp", 0.14, (0, 4.6, 1.6), m["nav_white"], segs=12, **P)
    root.rotation_euler = (0, 0, math.radians(heading))
    bpy.context.view_layer.update()
    return root


def jet_bridge():
    """Our stand's bridge: fixed link from the door, rotunda on a column, two telescoping tunnel sections (ribbed
    cladding) sloping down to a cab; a dark ridged bellows canopy closes onto the aircraft's forward left door; a wheel
    bogie; small warm side windows; two service lamps under the cab."""
    m = materials()
    cl, plain = m["bridge"], m["bridge_plain"]
    box("jb_link", (2.7, 3.0, 2.95), (DOOR_X, GLASS_Y + 1.85, 1.5), cl, bevel=0.02)
    cyl("jb_link_col", 0.32, -APRON, (DOOR_X, GLASS_Y + 2.4, APRON / 2), m["mast"], verts=24)
    rx, ry = DOOR_X, GLASS_Y + 5.0
    cyl("jb_rotunda", 2.0, 3.2, (rx, ry, 1.45), plain, verts=48)
    cyl("jb_rotunda_cap", 2.08, 0.18, (rx, ry, 3.1), m["facade"], verts=48)
    cyl("jb_rotunda_col", 0.55, -APRON - 0.1, (rx, ry, APRON / 2 - 0.05), m["mast"], verts=32)
    # the aircraft's forward left door (port side is local +X; the plane's axis is world +Y)
    dr, dzc = skin(4.8)
    door_x = AIR[0] + math.sqrt(dr * dr - (0.55 - dzc) ** 2)
    door = Vector((door_x, AIR[1] + 4.8, APRON + 3.4))
    cab = Vector((door.x + 1.6, door.y, 0))
    d = Vector((cab.x - rx, cab.y - ry, 0))
    L = d.length
    d.normalize()
    a = math.atan2(d.x, d.y)
    sill = door.z
    slope = math.atan2(-sill, L)  # floor falls from 0 at the rotunda to the door sill
    for k, (s0, s1, w, h) in enumerate(((1.8, 6.4, 2.9, 3.0), (6.0, L - 1.1, 2.76, 2.86))):
        sm = (s0 + s1) / 2
        c = Vector((rx, ry, 0)) + d * sm
        zf = -sm * math.tan(slope)
        sec = box(f"jb_tunnel_{k}", (w, s1 - s0, h), (c.x, c.y, zf + h / 2), cl, bevel=0.02, rot=(-slope, 0, -a))
        for j in range(3):  # small warm side windows, on both sides
            for side in (-1, 1):
                wb = box(f"jb_win_{k}_{j}_{side}", (0.02, 0.22, 0.3), (side * (w / 2 + 0.006), -1.2 + j * 1.2, 0.3), m["bridge_win"])
                wb.parent = sec
        box(f"jb_rib_{k}", (w + 0.06, 0.12, h + 0.06), (0, (s1 - s0) / 2 - 0.06, 0), m["facade"], parent=sec)
    # cab, its front toward the aircraft (-X)
    cz = sill + 1.45
    box("jb_cab", (3.2, 2.5, 3.0), (cab.x, cab.y, cz), plain, bevel=0.03, rot=(0, 0, -math.pi / 2))
    box("jb_cab_window", (0.02, 1.0, 0.5), (cab.x + 0.2, cab.y - 1.61, cz + 0.4), m["bridge_win"], rot=(0, 0, math.pi / 2))
    # bellows canopy: from inside the cab's front out to the skin round the door, dark, ridged
    x0, x1 = door.x - 0.06, cab.x - 1.25 + 0.15
    box("jb_bellows", (x1 - x0, 2.3, 2.45), ((x0 + x1) / 2, cab.y, sill + 1.05), m["bellows_rib"], bevel=0.12)
    box("jb_bellows_floor", (x1 - x0 + 0.1, 2.2, 0.12), ((x0 + x1) / 2, cab.y, sill - 0.1), m["mast"], bevel=0.02)
    # bogie: two legs to the apron, a beam, wheels
    b = Vector((rx, ry, 0)) + d * (L - 2.6)
    zb = -(L - 2.6) * math.tan(slope)
    for side in (-1, 1):
        off = Vector((d.y, -d.x, 0)) * side * 1.0
        p = b + off
        cyl(f"jb_leg_{side}", 0.16, zb - APRON - 0.6, (p.x, p.y, APRON + 0.6 + (zb - APRON - 0.6) / 2), m["mast"], verts=20)
        cyl(f"jb_wheel_{side}", 0.42, 0.34, (p.x, p.y, APRON + 0.42), m["tyre"], rot=(0, math.pi / 2, -a), verts=28)
    box("jb_beam", (2.4, 0.4, 0.4), (b.x, b.y, APRON + 0.8), m["mast"], rot=(0, 0, -a))
    # service lamps under the cab, lighting the door area and the apron below
    for k, dy in enumerate((-0.8, 0.8)):
        spot(f"jb_lamp_{k}", (cab.x - 0.3, cab.y + dy, sill - 0.2), 450.0, (1.0, 0.9, 0.76), 95, 0.5, (0, 0, 0), radius=0.08)
        box(f"jb_lamp_body_{k}", (0.22, 0.16, 0.07), (cab.x - 0.3, cab.y + dy, sill - 0.12), m["mast"], bevel=0.01)
        box(f"jb_lamp_lens_{k}", (0.18, 0.12, 0.004), (cab.x - 0.3, cab.y + dy, sill - 0.157), m["flood"])
    sphere("jb_amber", 0.07, (cab.x + 1.0, cab.y - 1.0, cz + 1.56), m["amber"], segs=12)


def mast(i, x, y, target, h=26.0, size=36.0, energy=170000.0):
    """A floodlight mast: a dark galvanised shaft (not emissive), a head of five lamps tilted toward `target` (x, y on
    the apron), and a spot that throws a pool there, so the concrete falls dark between pools."""
    m = materials()
    cyl(f"mast_{i}", 0.32, h, (x, y, APRON + h / 2), m["mast"], verts=20, r2=0.2)
    tx, ty = target
    a = math.atan2(tx - x, ty - y)
    head = box(f"mast_head_{i}", (3.4, 0.7, 0.35), (x, y, APRON + h + 0.2), m["mast"], bevel=0.02,
               rot=(math.radians(-24), 0, -a))
    for k in range(5):
        lb = box(f"mast_lamp_{i}_{k}", (0.5, 0.45, 0.04), (-1.32 + k * 0.66, 0.0, -0.19), m["flood"])
        lb.parent = head
    d = Vector((tx - x, ty - y, -h))
    li = spot(f"mast_light_{i}", (x, y, APRON + h - 0.15), energy, (1.0, 0.87, 0.72), size, 0.45, (0, 0, 0), radius=1.0)
    li.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def markings():
    m = materials()
    z = APRON + 0.004
    # our stand: lead-in line from the equipment line under the nose and back along the aircraft, a stop bar under the
    # nose gear; the next stands' lead-ins
    box("lead_in", (0.2, 72.5, 0.006), (AIR[0], 12.7 + 72.5 / 2, z), m["yellow"])
    box("stop_bar", (2.4, 0.3, 0.006), (AIR[0], AIR[1] + 5.0, z), m["yellow"])
    box("stop_bar_end_a", (0.3, 0.9, 0.006), (AIR[0] - 1.05, AIR[1] + 5.0, z), m["yellow"])
    box("stop_bar_end_b", (0.3, 0.9, 0.006), (AIR[0] + 1.05, AIR[1] + 5.0, z), m["yellow"])
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


def vehicles():
    m = materials()
    v = m["vehicle"]
    ax, ay = AIR
    # a belt loader at the aft hold (starboard), a tug with two baggage carts, a ground power unit by the nose
    box("belt_chassis", (1.6, 4.2, 0.9), (ax - 4.2, ay + 25.5, APRON + 0.75), v, bevel=0.04)
    box("belt_ramp", (0.9, 6.0, 0.25), (ax - 3.3, ay + 25.0, APRON + 1.75), m["bellows"], bevel=0.03,
        rot=(math.radians(18), 0, math.radians(-12)))
    for k, (dx, dy) in enumerate(((-0.7, -1.5), (0.7, -1.5), (-0.7, 1.5), (0.7, 1.5))):
        cyl(f"belt_wheel_{k}", 0.33, 0.25, (ax - 4.2 + dx, ay + 25.5 + dy, APRON + 0.33), m["tyre"], rot=(0, math.pi / 2, 0), verts=20)
    box("tug_body", (1.5, 2.6, 0.9), (ax - 9.5, ay + 22.0, APRON + 0.75), v, bevel=0.05)
    box("tug_cab", (1.3, 1.1, 1.0), (ax - 9.5, ay + 22.5, APRON + 1.7), m["bellows"], bevel=0.05)
    sphere("tug_beacon", 0.08, (ax - 9.5, ay + 22.5, APRON + 2.26), m["amber"], segs=12)
    for c in range(2):
        cy = ay + 25.2 + c * 3.6
        box(f"cart_{c}", (1.5, 3.0, 0.12), (ax - 9.5, cy, APRON + 0.6), v, bevel=0.02)
        box(f"cart_roof_{c}", (1.5, 3.0, 0.06), (ax - 9.5, cy, APRON + 2.0), m["bellows"], bevel=0.02)
        for s in (-1, 1):
            box(f"cart_post_{c}_{s}", (0.06, 3.0, 1.4), (ax - 9.5 + s * 0.72, cy, APRON + 1.3), m["mast"])
        box(f"cart_load_{c}", (1.3, 2.6, 0.9), (ax - 9.5, cy, APRON + 1.12), m["bellows"], bevel=0.08)
    box("gpu", (1.2, 2.2, 1.2), (ax - 4.0, ay + 3.0, APRON + 0.7), v, bevel=0.04)
    sphere("gpu_beacon", 0.07, (ax - 4.0, ay + 3.0, APRON + 1.36), m["amber"], segs=12)
    # a pushback tug waiting in front of the nose, its tow bar on the nose gear
    box("push_body", (2.1, 3.4, 0.85), (ax, ay - 2.4, APRON + 0.62), v, bevel=0.06)
    box("push_cab", (0.9, 1.0, 0.7), (ax - 0.55, ay - 3.4, APRON + 1.4), m["bellows"], bevel=0.05)
    box("push_glass", (0.92, 0.6, 0.4), (ax - 0.55, ay - 3.4, APRON + 1.5), m["cabin_off"], bevel=0.02)
    for k, (dx, dy) in enumerate(((-0.95, -1.2), (0.95, -1.2), (-0.95, 1.2), (0.95, 1.2))):
        cyl(f"push_wheel_{k}", 0.4, 0.3, (ax + dx, ay - 2.4 + dy, APRON + 0.4), m["tyre"], rot=(0, math.pi / 2, 0), verts=24)
    sphere("push_beacon", 0.08, (ax - 0.55, ay - 3.4, APRON + 1.83), m["amber"], segs=12)
    _bar_between("towbar", (ax, ay - 0.6, APRON + 0.45), (ax, ay + 4.7, APRON + 0.36), 0.12, m["vehicle"])
    # a belt loader at the forward hold (starboard), ramp up to the hold door
    bx, by = ax - 3.5, ay + 8.6
    box("fbelt_chassis", (1.5, 4.4, 0.8), (bx, by, APRON + 0.7), v, bevel=0.04)
    box("fbelt_ramp", (0.85, 5.4, 0.22), (bx - 0.6, by - 0.2, APRON + 1.55), m["bellows"], bevel=0.03,
        rot=(math.radians(17), 0, math.radians(-90)))
    for k, (dx, dy) in enumerate(((-0.7, -1.6), (0.7, -1.6), (-0.7, 1.6), (0.7, 1.6))):
        cyl(f"fbelt_wheel_{k}", 0.32, 0.24, (bx + dx, by + dy, APRON + 0.32), m["tyre"], rot=(0, math.pi / 2, 0), verts=20)
    sphere("fbelt_beacon", 0.07, (bx - 0.4, by + 1.8, APRON + 1.2), m["amber"], segs=12)


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
    # masts throw pools: on our aircraft's nose and port side, its tail, the next stand, the far apron
    for i, (x, y, t, e) in enumerate(((-24, 24, (-3.0, 17.0), 170000.0), (28, 30, (9.0, 24.0), 150000.0),
                                      (-4, 64, (-2.0, 42.0), 150000.0), (46, 76, (40.0, 52.0), 120000.0),
                                      (-60, 58, (-40.0, 30.0), 150000.0), (90, 44, (70.0, 30.0), 120000.0))):
        mast(i, x, y, t, energy=e)
    jet_bridge()
    aircraft("aircraft", AIR, 0.0, lit=0.55, seed=3)
    aircraft("aircraft_far", (-60.0, 160.0), 90.0, lit=0.75, seed=11, taxi=True)
    aircraft("aircraft_next", (-36.0, 16.5), 0.0, lit=0.25, seed=5, side=1)
    vehicles()
    far_lights()
    far_buildings()
    sky_dome()
