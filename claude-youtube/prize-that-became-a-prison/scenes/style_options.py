"""Three style options, each drawn as the same three moments, so the author compares looks and not content.

  A  Fluorescent noir   real rooms, cold fluorescent light, deep shadow; the archive lives inside the rooms.
  B  Evidence table     the investigation laid out on a table under one lamp; the 3D scenes arrive as prints
                        among the real documents and photographs; the route is red thread on a printed map.
  C  Void stage         figures and only the props that matter, on a black stage under hard light; archive and
                        graphics float in the dark as light.

Moments: question (the airport), record (Tim Hunt's 2024 statement, "yes" lit), ending (the empty chair, the date).
Characters are the rigged mannequins in placeholder clothing zones until the real outfits arrive.

    <bpy python> scenes/style_options.py -- out.png --option a|b|c --moment question|record|ending [--samples 32] [--res 1280x720]
Needs out/archive/s1_page1_yes.png (tools/prep_archive.py) and out/gfx/route_map.png (tools/render_gfx.js);
option B also uses out/style/A_question.png and out/style/A_ending.png as its prints.
"""
import math
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "..", "noir-kit"))
import bpy  # noqa: E402  (before anything that uses bmesh or mathutils)
import bmesh  # noqa: E402
from mathutils import Vector  # noqa: E402

import rigged  # noqa: E402
import setkit as sk  # noqa: E402

ARGS = sk.args(sys.argv)
argv = sys.argv[sys.argv.index("--") + 1:]
OPTION = argv[argv.index("--option") + 1]
MOMENT = argv[argv.index("--moment") + 1]
IMG = dict(page=os.path.join(ROOT, "out/archive/s1_page1_yes.png"), hk=os.path.join(ROOT, "archive/hong_kong_skyline_cc0.jpg"),
           route=os.path.join(ROOT, "out/gfx/route_map.png"), question=os.path.join(ROOT, "out/style/A_question.png"),
           chair=os.path.join(ROOT, "out/style/A_ending.png"))
FONT = "/usr/share/fonts/opentype/inter/Inter-Light.otf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
sk.reset()
C = bpy.context.scene.collection


# --- pieces ----------------------------------------------------------------------------------------------
def img_mat(name, path, rough=0.85, emit=0.0):
    m = sk.mat(name, (1, 1, 1), rough)
    nt = m.node_tree
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = bpy.data.images.load(path, check_existing=True)
    b = nt.nodes["Principled BSDF"]
    nt.links.new(tx.outputs["Color"], b.inputs["Base Color"])
    if emit:
        nt.links.new(tx.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = emit
    return m


def card(name, m, w, h, loc, rot=(0, 0, 0), curl=0.0, segs=12, thick=0.0004):
    """A sheet of paper or a photo print, w x h metres, lying in XY, with UVs; curl bends it a little."""
    verts, faces, uvs = [], [], []
    for j in range(segs + 1):
        for i in range(segs + 1):
            u, v = i / segs, j / segs
            verts.append(((u - 0.5) * w, (v - 0.5) * h, curl * ((u - 0.5) * 2) ** 2 * w * 0.04))
    for j in range(segs):
        for i in range(segs):
            a = j * (segs + 1) + i
            faces.append((a, a + 1, a + segs + 2, a + segs + 1))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    uv = me.uv_layers.new()
    for p in me.polygons:
        for li in p.loop_indices:
            x, y, _ = verts[me.loops[li].vertex_index]
            uv.data[li].uv = (x / w + 0.5, y / h + 0.5)
    ob = bpy.data.objects.new(name, me)
    C.objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    ob.data.materials.append(m)
    if thick:
        so = ob.modifiers.new("thick", "SOLIDIFY")
        so.thickness = thick
    for p in me.polygons:
        p.use_smooth = True
    return ob


def photo(name, path, w, loc, rot=(0, 0, 0), border=0.008, curl=0.15):
    im = bpy.data.images.load(path, check_existing=True)
    h = w * im.size[1] / im.size[0]
    card(name + "_border", sk.mat(name + "_paper", (0.78, 0.77, 0.73), 0.6), w + 2 * border, h + 2 * border,
         (loc[0], loc[1], loc[2] - 0.0002), rot, curl)
    return card(name, img_mat(name, path, 0.4), w, h, loc, rot, curl)


def text(name, body, size, loc, rot=(0, 0, 0), font=FONT, m=None, align="CENTER", extrude=0.0):
    cu = bpy.data.curves.new(name, "FONT")
    cu.body, cu.size, cu.align_x, cu.extrude = body, size, align, extrude
    cu.font = bpy.data.fonts.load(font, check_existing=True)
    ob = bpy.data.objects.new(name, cu)
    C.objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    ob.data.materials.append(m or sk.mat(name, (0.05, 0.05, 0.05), 0.6))
    return ob


def spot(name, loc, target, energy, colour, size_deg=40, blend=0.4, radius=0.05):
    li = bpy.data.lights.new(name, "SPOT")
    li.energy, li.color, li.spot_size, li.spot_blend, li.shadow_soft_size = energy, colour, math.radians(size_deg), blend, radius
    ob = bpy.data.objects.new(name, li)
    C.objects.link(ob)
    ob.location = loc
    t = bpy.data.objects.new(name + "_aim", None)
    C.objects.link(t)
    t.location = target
    c = ob.constraints.new("TRACK_TO")
    c.target, c.track_axis, c.up_axis = t, "TRACK_NEGATIVE_Z", "UP_Y"
    return ob


def bench_and_bags(steel, case_m, leather, rubber, tag_m, top=0.86, x=0.0, y=0.0):
    sk.box("bench_top", (2.0, 0.8, 0.04), (x, y, top - 0.02), steel, bevel=0.006)
    for dx in (-0.94, 0.94):
        for dy in (-0.34, 0.34):
            sk.box("bench_leg", (0.04, 0.04, top - 0.04), (x + dx, y + dy, (top - 0.04) / 2), steel)
    sk.box("bench_shelf", (1.92, 0.72, 0.02), (x, y, 0.18), steel)
    case = sk.box("case", (0.72, 0.48, 0.27), (x + 0.18, y + 0.02, top + 0.135), case_m, bevel=0.035, rot=(0, 0, math.radians(-8)))
    for i, dx in enumerate((-0.2, 0.0, 0.2)):
        sk.box(f"case_ridge{i}", (0.03, 0.44, 0.012), (dx, 0, 0.137), case_m, bevel=0.005).parent = case
    for yy in (-0.17, 0.17):
        sk.cyl("wheel", 0.03, 0.025, (-0.37, yy, -0.1), rubber, rot=(math.pi / 2, 0, 0)).parent = case
    sk.box("case_grip", (0.025, 0.16, 0.03), (0.375, 0, 0.0), rubber, bevel=0.008).parent = case
    sk.box("tag", (0.005, 0.05, 0.1), (0.405, 0.02, -0.07), tag_m, rot=(0, math.radians(8), 0)).parent = case
    bag = sk.box("holdall", (0.6, 0.32, 0.3), (x - 0.12, y - 0.1, top + 0.15), leather, bevel=0.12, rot=(0, 0, math.radians(14)))
    sk.arc("holdall_handle", (-0.12, -0.05, 0.13), (0.12, -0.05, 0.13), 0.13, leather, r=0.012).parent = bag
    sk.arc("holdall_handle2", (-0.12, 0.05, 0.13), (0.12, 0.05, 0.13), 0.12, leather, r=0.012).parent = bag
    return case, bag


def cast(dawn_at=(0.15, -0.82, 0), facing_dawn=186, off1=(-0.25, 0.85, 0), off2=(0.95, 1.12, 0)):
    uniform = rigged.Outfit(top=(0.025, 0.035, 0.06), bottom=(0.02, 0.028, 0.045), cap=True)
    rigged.figure("Dawn", 1.68, rigged.Outfit(top=(0.13, 0.095, 0.065), bottom=(0.035, 0.035, 0.04)),
                  pose={"head": (24, 0), "chest": (5, 0), "l_arm": (10, 6, 22), "r_arm": (8, 6, 18)}, location=dawn_at, facing_deg=facing_dawn)
    rigged.figure("OfficerA", 1.80, uniform, pose={"r_arm": (62, 14, 6), "head": (14, 0)}, location=off1, facing_deg=-12)
    rigged.figure("OfficerB", 1.78, uniform, pose={"head": (6, -20), "l_arm": (6, 6, 10), "r_arm": (6, 6, 10)}, location=off2, facing_deg=22)


def dining_chair(name, loc, turn_deg, m):
    root = bpy.data.objects.new(name, None)
    C.objects.link(root)
    parts = [sk.box(name + "_seat", (0.44, 0.42, 0.035), (0, 0, 0.455), m, bevel=0.006)]
    for x in (-0.19, 0.19):
        for y in (-0.18, 0.18):
            parts.append(sk.cyl(name + "_leg", 0.018, 0.44, (x, y, 0.22), m, r2=0.014))
    for x in (-0.19, 0.19):
        parts.append(sk.box(name + "_post", (0.035, 0.03, 0.52), (x, 0.2, 0.71), m, rot=(math.radians(-6), 0, 0)))
    parts.append(sk.box(name + "_rail", (0.42, 0.03, 0.08), (0, 0.225, 0.93), m, bevel=0.006, rot=(math.radians(-6), 0, 0)))
    for z in (0.62, 0.74):
        parts.append(sk.box(name + "_slat", (0.38, 0.018, 0.04), (0, 0.21, z), m, rot=(math.radians(-6), 0, 0)))
    for p in parts:
        p.parent = root
    root.location, root.rotation_euler = loc, (0, 0, math.radians(turn_deg))
    return root


M = dict(steel=sk.mat("steel", (0.62, 0.63, 0.65), 0.28, 1.0), case=sk.mat("hard case", (0.025, 0.03, 0.045), 0.35),
         leather=sk.mat("leather", (0.085, 0.05, 0.03), 0.48), rubber=sk.mat("rubber", (0.01, 0.01, 0.01), 0.7),
         tag=sk.mat("tag paper", (0.75, 0.74, 0.68), 0.8), paper=sk.mat("paper", (0.78, 0.77, 0.73), 0.8),
         chair=sk.mat("chair", (0.07, 0.045, 0.028), 0.45, nodes=sk.wood((0.08, 0.05, 0.03), (0.04, 0.024, 0.014), 6.0, 10.0)))


# --- A: fluorescent noir ---------------------------------------------------------------------------------
def airport_room():
    W, D, H = 5.6, 4.8, 2.8
    floor = sk.mat("vinyl", (0.2, 0.2, 0.2), 0.3, nodes=sk.tiles(1.6, (0.065, 0.07, 0.07), (0.05, 0.055, 0.055), (0.025, 0.025, 0.025), 0.004))
    wall = sk.mat("wall paint", (0.11, 0.125, 0.12), 0.85)
    ceil = sk.mat("ceiling tile", (0.2, 0.2, 0.2), 0.9, nodes=sk.tiles(1.65, (0.2, 0.2, 0.2), (0.19, 0.19, 0.19), (0.08, 0.08, 0.08), 0.012, False))
    sk.box("floor", (W, D, 0.02), (0, 0.2, -0.01), floor)
    sk.box("ceiling", (W, D, 0.02), (0, 0.2, H + 0.01), ceil)
    for n, s, l in (("wall_back", (W, 0.1, H), (0, 0.2 + D / 2 + 0.05, H / 2)), ("wall_left", (0.1, D, H), (-W / 2 - 0.05, 0.2, H / 2)),
                    ("wall_right", (0.1, D, H), (W / 2 + 0.05, 0.2, H / 2)), ("wall_front", (W, 0.1, H), (0, 0.2 - D / 2 - 0.05, H / 2))):
        sk.box(n, s, l, wall)
    door = sk.mat("door", (0.13, 0.15, 0.17), 0.45, 0.3)
    sk.box("door", (0.05, 0.95, 2.1), (-W / 2 + 0.03, 1.6, 1.05), door)
    for n, loc, k in (("troffer_bench", (0.0, 0.05, H - 0.005), 1.0), ("troffer_back", (0.0, 2.0, H - 0.005), 0.06)):
        sk.box(n + "_housing", (1.24, 0.64, 0.03), loc, M["steel"])
        sk.box(n, (1.18, 0.58, 0.01), (loc[0], loc[1], loc[2] - 0.02), sk.emission(n + "_em", (0.86, 0.94, 1.0), 9.0 * k))
        sk.area_light(n + "_light", (loc[0], loc[1], loc[2] - 0.03), (1.18, 0.58), 480 * k, (0.86, 0.94, 1.0), spread_deg=75)
    sk.haze((W - 0.02, D - 0.02, H - 0.02), (0, 0.2, H / 2), 0.009)


def A(moment):
    if moment == "question":
        airport_room()
        bench_and_bags(M["steel"], M["case"], M["leather"], M["rubber"], M["tag"])
        cast()
        sk.camera((1.95, -2.05, 2.45), (-0.05, 0.25, 0.75), lens=24, focus="case", fstop=4.0)
        return -0.2
    if moment == "record":  # the statement on the bench beside the bags, under the same light
        airport_room()
        bench_and_bags(M["steel"], M["case"], M["leather"], M["rubber"], M["tag"])
        card("statement", img_mat("statement", IMG["page"], 0.9), 0.21, 0.297, (-0.62, -0.1, 0.8605), (0, 0, math.radians(-82)), curl=0.25)
        tgt = bpy.data.objects.new("page_focus", None)
        C.objects.link(tgt)
        tgt.location = (-0.6, -0.12, 0.86)
        sk.camera((-0.86, -0.43, 1.07), (-0.58, -0.06, 0.86), lens=50, focus="page_focus", fstop=2.4)
        return -1.5  # paper under a fluorescent panel: expose for the page
    raise SystemExit("A ending is the chair frame already rendered (scenes/sf_chair.py)")


# --- B: evidence table -----------------------------------------------------------------------------------
def evidence_table():
    top = sk.mat("table", (0.06, 0.04, 0.025), 0.55, nodes=sk.wood((0.07, 0.045, 0.028), (0.03, 0.019, 0.012), 3.0, 18.0))
    sk.box("table", (2.2, 1.4, 0.05), (0, 0, -0.025), top)
    spot("lamp", (-0.55, 0.45, 0.9), (0.0, 0.0, 0.0), 160, (1.0, 0.78, 0.55), size_deg=70, blend=0.6, radius=0.06)
    sk.area_light("window_fill", (0.9, -0.6, 0.8), (1.0, 1.0), 6, (0.55, 0.68, 1.0), rot=(math.radians(50), 0, math.radians(55)))


def pen(loc, turn):
    p = sk.cyl("pen", 0.0045, 0.14, loc, sk.mat("pen", (0.02, 0.02, 0.025), 0.3), rot=(0, math.pi / 2, math.radians(turn)), verts=16)
    return p


def B(moment):
    evidence_table()
    cam_h = 0.78
    if moment == "question":
        card("statement", img_mat("statement", IMG["page"], 0.9), 0.21, 0.297, (0.12, 0.06, 0.0004), (0, 0, math.radians(-12)), curl=0.1)
        photo("print_question", IMG["question"], 0.26, (-0.08, -0.04, 0.0016), (0, 0, math.radians(5)))
        tag = card("tag", M["tag"], 0.05, 0.1, (0.24, -0.13, 0.0024), (0, 0, math.radians(32)))
        pen((-0.27, 0.12, 0.005), 64)
        sk.camera((0.0, -0.02, cam_h), (0.0, 0.0, 0.0), lens=42, focus="print_question", fstop=5.6)
    elif moment == "record":
        card("statement", img_mat("statement", IMG["page"], 0.9), 0.21, 0.297, (0.02, 0.0, 0.0004), (0, 0, math.radians(3)), curl=0.1)
        photo("print_hk", IMG["hk"], 0.15, (0.2, 0.12, 0.0016), (0, 0, math.radians(-9)))
        mp = photo("print_route", IMG["route"], 0.24, (-0.22, -0.1, 0.0018), (0, 0, math.radians(-4)), curl=0.05)
        # red thread between pins on the printed map: Chicago and Hong Kong at their pixel positions on route_map.png
        w, h = 0.24, 0.24 * 1080 / 1920
        def onmap(px, py):
            v = Vector(((px / 1920 - 0.5) * w, (0.5 - py / 1080) * h, 0.0))
            return Vector(mp.location) + (mp.rotation_euler.to_matrix() @ v)
        chi, hk = onmap(1717, 331), onmap(546, 500)
        red = sk.mat("thread", (0.5, 0.02, 0.02), 0.6)
        for n, at in (("pin_chicago", chi), ("pin_hk", hk)):
            sk.sphere(n, 0.0035, (at.x, at.y, 0.006), red)
        sk.arc("thread", (chi.x, chi.y, 0.006), (hk.x, hk.y, 0.006), 0.004, red, r=0.0006)
        pen((0.27, -0.16, 0.005), -20)
        sk.camera((0.0, -0.02, cam_h), (0.0, 0.0, 0.0), lens=42, focus="statement", fstop=5.6)
    else:
        photo("print_chair", IMG["chair"], 0.24, (0.0, 0.03, 0.0016), (0, 0, math.radians(-3)))
        card("index_card", M["paper"], 0.127, 0.076, (0.1, -0.13, 0.0018), (0, 0, math.radians(7)))
        text("dates", "1933 – 2026", 0.011, (0.1, -0.132, 0.0023), (0, 0, math.radians(7)), font=MONO, m=sk.mat("ink", (0.03, 0.03, 0.035), 0.7))
        sk.camera((0.0, -0.02, cam_h), (0.0, 0.0, 0.0), lens=42, focus="print_chair", fstop=5.6)
    return 0.4


# --- C: void stage ---------------------------------------------------------------------------------------
def void_floor():
    sk.box("stage", (40, 40, 0.02), (0, 0, -0.01), sk.mat("stage", (0.008, 0.008, 0.009), 0.22))


def C_(moment):
    void_floor()
    if moment == "question":
        bench_and_bags(M["steel"], M["case"], M["leather"], M["rubber"], M["tag"])
        cast()
        tube = sk.cyl("tube", 0.02, 1.3, (0.0, 0.05, 2.5), sk.emission("tube_em", (0.86, 0.94, 1.0), 25), rot=(0, math.pi / 2, 0))
        sk.area_light("tube_light", (0.0, 0.05, 2.47), (1.3, 0.08), 520, (0.86, 0.94, 1.0), spread_deg=90)
        sk.haze((5, 5, 3), (0, 0, 1.5), 0.012)
        sk.camera((2.3, -3.1, 1.25), (0.0, 0.1, 0.95), lens=32, focus="case", fstop=4.0)
    elif moment == "record":
        page = card("statement", img_mat("statement", IMG["page"], 0.9, emit=0.35), 0.42, 0.594, (0.0, 0.0, 1.45), (math.radians(90), 0, math.radians(-8)))
        hk = card("hk_pane", img_mat("hk", IMG["hk"], 0.8, emit=0.6), 1.2, 0.9, (-1.4, 2.6, 1.7), (math.radians(90), 0, math.radians(14)))
        glow = sk.emission("route_glow", (1.0, 0.92, 0.8), 6)
        cu = bpy.data.curves.new("route", "CURVE")
        cu.dimensions, cu.bevel_depth = "3D", 0.006
        sp = cu.splines.new("BEZIER")
        sp.bezier_points.add(2)
        for p, co in zip(sp.bezier_points, ((-2.4, 3.8, 0.9), (0.3, 3.9, 3.0), (2.6, 3.4, 1.3))):  # an arc behind, over the top
            p.co, p.handle_left_type, p.handle_right_type = co, "AUTO", "AUTO"
        ob = bpy.data.objects.new("route", cu)
        C.objects.link(ob)
        ob.data.materials.append(glow)
        spot("key", (-0.6, -1.6, 2.4), (0.0, 0.0, 1.45), 260, (0.9, 0.95, 1.0), size_deg=28, blend=0.3)
        sk.haze((8, 8, 4), (0, 1, 2), 0.01)
        sk.camera((0.45, -1.55, 1.42), (0.0, 0.2, 1.48), lens=40, focus="statement", fstop=2.8)
    else:
        dining_chair("chair", (0.0, 0.0, 0.0), 18, M["chair"])
        spot("cone", (0.0, -0.2, 3.4), (0.0, 0.0, 0.0), 900, (0.9, 0.95, 1.0), size_deg=26, blend=0.25, radius=0.02)
        text("dates", "1933 – 2026", 0.16, (0.15, -0.95, 0.002), (0, 0, math.radians(12)), m=sk.emission("date_em", (0.92, 0.94, 0.96), 2.2))
        sk.haze((8, 8, 5), (0, 0, 2.5), 0.02)
        sk.camera((1.4, -3.4, 1.15), (0.0, -0.3, 0.45), lens=35, focus="chair_seat", fstop=4.0)
    return -0.1


exposure = {"a": A, "b": B, "c": C_}[OPTION](MOMENT)
sk.render(ARGS["out"], ARGS["samples"], ARGS["res"], exposure=exposure)
