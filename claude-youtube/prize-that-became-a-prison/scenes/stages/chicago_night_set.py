"""The Chicago apartment (Ch 01): a high-floor living room at night, a wall of glass onto the city.

Plan (metres, floor z = 0, the window looks along +Y):
  room      x -3.0..3.0, y -2.6..2.4, ceiling 2.85. Oak floor (planks running toward the window), painted walls.
  window    the whole +Y wall is floor-to-ceiling glazing in four bays (dark bronze mullions, a transom at 2.2 m),
            from the left wall's corner to a column at the right (x 2.6..3.0, y 1.95..2.4).
  door      the entry, in the left wall (x = -3.0), y 0.49..1.41: a flush painted door in a cased opening, a lever
            handle; the corridor's light shows as a thin line under it and fans out across the floor.
  console   a walnut console desk against the left wall (y -1.45..-0.05) with a ceramic table lamp and a linen
            drum shade at its window end (the room's one warm practical), a framed abstract print above it, a bowl
            and a closed sketchbook on the top.
  suitcase  Dawn's soft case stands by the door, handle up, ready.
  living    a wool rug, a low walnut coffee table, a lounge chair and a side table in the right corner by the window.

Light, practical first: the table lamp (a warm bulb inside the translucent shade: pools of light up the wall and on
the desk), the corridor light under the door, and the city's cool glow through the glass (one large soft area light
just inside the window, hidden from camera and reflections). Nothing else: the room falls off into dark.
"""
import math

import bpy  # noqa: F401
import bmesh
import numpy as np
from mathutils import Matrix, Vector

import setkit as sk

W0, W1 = -3.0, 3.0           # side walls (inner faces)
F0, WIN_Y = -2.6, 2.4        # front wall, window wall (inner line)
H = 2.85
GLASS_Y = 2.45
XM = [-2.97, -1.5775, -0.185, 1.2075, 2.6]     # mullions: four bays
DOOR = (0.49, 1.41, 2.13)                       # y0, y1, height
CONSOLE = (-1.45, -0.05, 0.78)                  # y0, y1, top
LAMP = (-2.79, -0.36)                           # lamp base centre on the console
LAMP_BULB_Z = 1.30
CASE = (-2.42, 1.12, -62.0)                     # suitcase footprint centre and turn (deg)
ENTRY_CAN = (-2.38, 1.0)                        # the entry downlight in the ceiling, by the door
ENTRY_POWER = 30.0
M = {}


# ---------------------------------------------------------------- geometry helpers

def _link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0), seg=3):
    ob = sk.box(name, size, loc, m, bevel=0.0, rot=rot)
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments, bv.limit_method = bevel, seg, "ANGLE"
        bv.harden_normals = False
        ob.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = True
        for p in ob.data.polygons:
            p.use_smooth = True
    return ob


def bevel(ob, w, seg=3):
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = w, seg, "ANGLE"
    ob.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = True
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def lathe(name, profile, loc, m, segs=48, cap=True):
    """A surface of revolution about Z from (r, z) points, bottom to top."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        ring = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring)
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


def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=32, r2=None, bev=0.0):
    ob = sk.cyl(name, r, depth, loc, m, rot=rot, verts=verts, r2=r2)
    if bev:
        bevel(ob, bev, 2)
    return ob


def tube(name, pts, r, m, res=6):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution = "3D", r, res
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts):
        p.co = (*co, 1)
    ob = _link(bpy.data.objects.new(name, cu))
    ob.data.materials.append(m)
    return ob


# ---------------------------------------------------------------- materials

def _nodes(m):
    nt = m.node_tree
    return nt, nt.nodes["Principled BSDF"]


def _noise(nt, scale, detail=2.0, coord="Object", rough=0.5):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = scale
    nz.inputs["Detail"].default_value = detail
    nz.inputs["Roughness"].default_value = rough
    nt.links.new(tc.outputs[coord], nz.inputs["Vector"])
    return nz


def _bump(nt, b, height, strength, dist=0.001):
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = strength
    bp.inputs["Distance"].default_value = dist
    nt.links.new(height, bp.inputs["Height"])
    if b.inputs["Normal"].is_linked:
        nt.links.new(b.inputs["Normal"].links[0].from_socket, bp.inputs["Normal"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return bp


def _rough_var(nt, b, lo, hi, scale=4.0):
    nz = _noise(nt, scale, 3.0)
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = lo, hi
    nt.links.new(nz.outputs["Fac"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], b.inputs["Roughness"])


def paint(name, rgb, rough=0.86, orange_peel=0.05):
    m = sk.mat(name, rgb, rough)
    nt, b = _nodes(m)
    b.inputs["Specular IOR Level"].default_value = 0.35
    nz = _noise(nt, 160.0, 3.0)
    _bump(nt, b, nz.outputs["Fac"], orange_peel, 0.0005)
    _rough_var(nt, b, rough - 0.06, rough + 0.04, 2.0)
    return m


def oak_floor():
    """Wide oak planks along Y, satin lacquer: per-plank tone, grain, a dark seam, roughness that varies."""
    m = sk.mat("oak floor", (0.2, 0.12, 0.07), 0.35)
    nt, b = _nodes(m)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(90))     # planks run along Y
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset, br.offset_frequency, br.squash, br.squash_frequency = 0.37, 1, 1.0, 1
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Brick Width"].default_value = 1.85
    br.inputs["Row Height"].default_value = 0.185
    br.inputs["Mortar Size"].default_value = 0.0022
    br.inputs["Mortar Smooth"].default_value = 0.2
    br.inputs["Bias"].default_value = 0.0
    br.inputs["Color1"].default_value = (0.235, 0.145, 0.085, 1)
    br.inputs["Color2"].default_value = (0.15, 0.088, 0.048, 1)
    br.inputs["Mortar"].default_value = (0.03, 0.018, 0.01, 1)
    nt.links.new(mp.outputs[0], br.inputs["Vector"])
    # grain: noise stretched along the plank
    mg = nt.nodes.new("ShaderNodeMapping")
    mg.inputs["Scale"].default_value = (1.2, 38.0, 1.0)
    mg.inputs["Rotation"].default_value = (0, 0, math.radians(90))
    nt.links.new(tc.outputs["Object"], mg.inputs["Vector"])
    gz = nt.nodes.new("ShaderNodeTexNoise")
    gz.inputs["Scale"].default_value = 3.0
    gz.inputs["Detail"].default_value = 9.0
    gz.inputs["Roughness"].default_value = 0.6
    nt.links.new(mg.outputs[0], gz.inputs["Vector"])
    gr = nt.nodes.new("ShaderNodeMapRange")
    gr.inputs["To Min"].default_value, gr.inputs["To Max"].default_value = 0.72, 1.12
    nt.links.new(gz.outputs["Fac"], gr.inputs["Value"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type, mul.blend_type = "RGBA", "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    nt.links.new(br.outputs["Color"], mul.inputs["A"])
    nt.links.new(gr.outputs["Result"], mul.inputs["B"])
    nt.links.new(mul.outputs["Result"], b.inputs["Base Color"])
    # roughness: satin with scuffs, seams matt
    sc = _noise(nt, 2.2, 4.0)
    rr = nt.nodes.new("ShaderNodeMapRange")
    rr.inputs["To Min"].default_value, rr.inputs["To Max"].default_value = 0.24, 0.46
    nt.links.new(sc.outputs["Fac"], rr.inputs["Value"])
    mx = nt.nodes.new("ShaderNodeMath")
    mx.operation = "MAXIMUM"
    nt.links.new(rr.outputs["Result"], mx.inputs[0])
    nt.links.new(br.outputs["Fac"], mx.inputs[1])
    nt.links.new(mx.outputs[0], b.inputs["Roughness"])
    inv = nt.nodes.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    nt.links.new(br.outputs["Fac"], inv.inputs[1])
    add = nt.nodes.new("ShaderNodeMath")
    add.operation = "ADD"
    nt.links.new(inv.outputs[0], add.inputs[0])
    g2 = nt.nodes.new("ShaderNodeMath")
    g2.operation = "MULTIPLY"
    g2.inputs[1].default_value = 0.06
    nt.links.new(gz.outputs["Fac"], g2.inputs[0])
    nt.links.new(g2.outputs[0], add.inputs[1])
    _bump(nt, b, add.outputs[0], 0.35, 0.0012)
    b.inputs["Specular IOR Level"].default_value = 0.5
    return m


def walnut(name="walnut", scale=5.0, light=(0.12, 0.07, 0.04), dark=(0.055, 0.03, 0.017), rough=0.38):
    m = sk.mat(name, light, rough, nodes=sk.wood(light, dark, scale=scale, stretch=14.0))
    nt, b = _nodes(m)
    _rough_var(nt, b, rough - 0.06, rough + 0.1, 6.0)
    nz = _noise(nt, 70.0, 2.0)
    _bump(nt, b, nz.outputs["Fac"], 0.06, 0.0004)
    return m


def fabric(name, rgb, scale=900.0, bump=0.25, sheen=0.25):
    m = sk.mat(name, rgb, 0.92)
    nt, b = _nodes(m)
    b.inputs["Specular IOR Level"].default_value = 0.15
    b.inputs["Sheen Weight"].default_value = sheen
    nz = _noise(nt, scale, 2.0)
    _bump(nt, b, nz.outputs["Fac"], bump, 0.0006)
    tone = _noise(nt, 6.0, 3.0)
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = 0.85, 1.1
    nt.links.new(tone.outputs["Fac"], mr.inputs["Value"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type, mul.blend_type = "RGBA", "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    mul.inputs["A"].default_value = (*rgb, 1)
    nt.links.new(mr.outputs["Result"], mul.inputs["B"])
    nt.links.new(mul.outputs["Result"], b.inputs["Base Color"])
    return m


def thin_glass(name="window glass"):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = (0.9, 0.93, 0.94, 1)
    gl = nt.nodes.new("ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.015
    fr = nt.nodes.new("ShaderNodeFresnel")
    fr.inputs["IOR"].default_value = 1.52
    mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(fr.outputs[0], mx.inputs[0])
    nt.links.new(tr.outputs[0], mx.inputs[1])
    nt.links.new(gl.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def shade_linen():
    """The lamp's drum shade: warm linen that lets the bulb through (translucent) and is lit on its outside too."""
    m = bpy.data.materials.new("lamp shade linen")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tl = nt.nodes.new("ShaderNodeBsdfTranslucent")
    tl.inputs["Color"].default_value = (1.0, 0.86, 0.66, 1)
    df = nt.nodes.new("ShaderNodeBsdfDiffuse")
    df.inputs["Color"].default_value = (0.72, 0.66, 0.56, 1)
    mx = nt.nodes.new("ShaderNodeMixShader")
    mx.inputs[0].default_value = 0.45
    nt.links.new(tl.outputs[0], mx.inputs[1])
    nt.links.new(df.outputs[0], mx.inputs[2])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 1400.0
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.2
    nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], tl.inputs["Normal"])
    nt.links.new(bp.outputs["Normal"], df.inputs["Normal"])
    nt.links.new(mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def print_image():
    """A mid-century abstract print, drawn with numpy: no text, no figure."""
    w, h = 270, 370
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    img = np.ones((h, w, 3), np.float32) * np.array([0.78, 0.75, 0.68], np.float32)
    rng = np.random.default_rng(4)
    img *= (0.97 + 0.03 * rng.random((h, w, 1))).astype(np.float32)

    def blend(mask, col, a=1.0):
        img[mask] = img[mask] * (1 - a) + np.array(col, np.float32) * a

    blend(((xx - 105) ** 2 + (yy - 250) ** 2) < 78 ** 2, (0.52, 0.27, 0.17), 0.95)        # terracotta sun
    blend((xx > 140) & (xx < 225) & (yy > 70) & (yy < 300), (0.16, 0.22, 0.30), 0.95)     # slate panel
    blend(((xx - 182) ** 2 + (yy - 112) ** 2 < 42 ** 2) & (yy < 112), (0.66, 0.52, 0.26), 0.95)  # ochre half moon
    r = np.sqrt((xx - 150) ** 2 + (yy - 330) ** 2)
    blend((np.abs(r - 120) < 2.2) & (yy < 330), (0.08, 0.07, 0.07), 0.9)                   # a thin arc
    blend((xx > 40) & (xx < 120) & (yy > 52) & (yy < 58), (0.08, 0.07, 0.07), 0.85)        # a short bar
    im = bpy.data.images.new("chicago_print", w, h, alpha=False, float_buffer=True)
    rgba = np.concatenate([img, np.ones((h, w, 1), np.float32)], axis=2)
    im.pixels.foreach_set(rgba[::-1].ravel())      # (image rows go bottom-up)
    im.pack()
    m = sk.mat("print paper", (0.78, 0.75, 0.68), 0.9)
    nt, b = _nodes(m)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    com = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(sep.outputs["Y"], com.inputs[0])
    nt.links.new(sep.outputs["Z"], com.inputs[1])
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = im
    tx.interpolation = "Cubic"
    nt.links.new(com.outputs[0], tx.inputs["Vector"])
    nt.links.new(tx.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Specular IOR Level"].default_value = 0.2
    return m


def materials():
    M.clear()
    M.update(
        floor=oak_floor(),
        wall=paint("wall paint", (0.43, 0.41, 0.38)),
        ceiling=paint("ceiling paint", (0.46, 0.455, 0.44), 0.92, 0.03),
        trim=paint("trim enamel", (0.5, 0.49, 0.46), 0.42, 0.02),
        door=paint("door enamel", (0.40, 0.39, 0.37), 0.4, 0.02),
        bronze=sk.mat("bronze aluminium", (0.05, 0.044, 0.038), 0.36, 0.85),
        glass=thin_glass(),
        steel=sk.mat("brushed steel", (0.5, 0.5, 0.5), 0.3, 1.0),
        brass=sk.mat("aged brass", (0.42, 0.31, 0.15), 0.34, 1.0),
        walnut=walnut(),
        glaze=sk.mat("charcoal glaze", (0.03, 0.035, 0.042), 0.18),
        stoneware=sk.mat("stoneware", (0.32, 0.29, 0.25), 0.55),
        shade=shade_linen(),
        rug=fabric("wool rug", (0.06, 0.057, 0.053), 700.0, 0.45, 0.08),
        rug_border=fabric("wool rug border", (0.028, 0.027, 0.026), 700.0, 0.45, 0.08),
        uphol=fabric("upholstery", (0.16, 0.115, 0.07), 1100.0, 0.3, 0.3),
        leatherette=sk.mat("book cloth", (0.07, 0.08, 0.1), 0.7),
        paper=sk.mat("sketch paper", (0.62, 0.6, 0.55), 0.9),
        print=print_image(),
        mat_board=sk.mat("mat board", (0.66, 0.64, 0.6), 0.9),
        frame=sk.mat("black frame", (0.02, 0.02, 0.022), 0.45),
        concrete=paint("slab concrete", (0.12, 0.12, 0.12), 0.9, 0.1),
        dark=sk.mat("can baffle", (0.015, 0.015, 0.016), 0.6),
        rubber=sk.mat("rubber", (0.012, 0.012, 0.012), 0.75),
    )
    return M


# ---------------------------------------------------------------- the room

def room():
    m = M
    T = 0.12
    box("floor", (W1 - W0 + 0.4, WIN_Y - F0 + 0.35, 0.05), ((W0 + W1) / 2, (F0 + WIN_Y) / 2 + 0.12, -0.025), m["floor"])
    box("ceiling", (W1 - W0 + 0.4, WIN_Y - F0 + 0.4, 0.05), ((W0 + W1) / 2, (F0 + WIN_Y) / 2, H + 0.025), m["ceiling"])
    # front and right walls
    box("wall_front", (W1 - W0 + 0.4, T, H), ((W0 + W1) / 2, F0 - T / 2, H / 2), m["wall"])
    box("wall_right", (T, WIN_Y - F0 + 0.2, H), (W1 + T / 2, (F0 + WIN_Y) / 2, H / 2), m["wall"])
    # left wall with the door opening
    y0, y1, dh = DOOR
    box("wall_left_a", (T, y0 - F0, H), (W0 - T / 2, (F0 + y0) / 2, H / 2), m["wall"])
    box("wall_left_b", (T, WIN_Y + 0.1 - y1, H), (W0 - T / 2, (y1 + WIN_Y + 0.1) / 2, H / 2), m["wall"])
    box("wall_left_head", (T, y1 - y0, H - dh), (W0 - T / 2, (y0 + y1) / 2, (H + dh) / 2), m["wall"])
    # the corridor behind the door: a closed dark box, so nothing leaks
    box("corridor_floor", (1.6, 2.4, 0.04), (W0 - T - 0.8, (y0 + y1) / 2, -0.02), m["concrete"])
    box("corridor_back", (0.05, 2.4, 2.4), (W0 - T - 1.6, (y0 + y1) / 2, 1.2), m["concrete"])
    box("corridor_top", (1.6, 2.4, 0.05), (W0 - T - 0.8, (y0 + y1) / 2, 2.4), m["concrete"])
    for s, yy in ((-1, y0 - 1.2), (1, y1 + 1.2)):
        box(f"corridor_side{s}", (1.6, 0.05, 2.4), (W0 - T - 0.8, (y0 + y1) / 2 + s * 1.2, 1.2), m["concrete"])
    # the column at the right end of the glazing
    box("column", (W1 - XM[-1], 0.45, H), ((XM[-1] + W1) / 2, WIN_Y - 0.225, H / 2), m["wall"], bevel=0.004)
    # above the window head: the bulkhead face
    box("window_head_wall", (W1 - W0, 0.12, H - 2.62), ((W0 + W1) / 2, WIN_Y + 0.06, (H + 2.62) / 2), m["wall"])
    # baseboards
    bb = (0.1, 0.016)
    box("base_front", (W1 - W0, bb[1], bb[0]), ((W0 + W1) / 2, F0 + bb[1] / 2, bb[0] / 2), m["trim"], bevel=0.003)
    box("base_right", (bb[1], WIN_Y - 0.45 - F0, bb[0]), (W1 - bb[1] / 2, (F0 + WIN_Y - 0.45) / 2, bb[0] / 2), m["trim"], bevel=0.003)
    box("base_left_a", (bb[1], y0 - 0.075 - F0, bb[0]), (W0 + bb[1] / 2, (F0 + y0 - 0.075) / 2, bb[0] / 2), m["trim"], bevel=0.003)
    box("base_left_b", (bb[1], WIN_Y - y1 - 0.075, bb[0]), (W0 + bb[1] / 2, (y1 + 0.075 + WIN_Y) / 2, bb[0] / 2), m["trim"], bevel=0.003)
    box("base_column", (W1 - XM[-1], bb[1], bb[0]), ((XM[-1] + W1) / 2, WIN_Y - 0.45 - bb[1] / 2, bb[0] / 2), m["trim"], bevel=0.003)
    # recessed cans in the ceiling (off): a trim ring and a dark baffle
    for i, (x, y) in enumerate((ENTRY_CAN, (0.4, -0.9), (0.4, 1.0), (-1.4, -1.0), (2.0, 0.1))):
        cyl(f"can_trim{i}", 0.065, 0.006, (x, y, H - 0.003), m["trim"], verts=40, bev=0.002)
        cyl(f"can_baffle{i}", 0.05, 0.008, (x, y, H - 0.002), m["dark"], verts=32)
    # the entry light is on: a warm lens in its can, and a downlight pooling on the floor by the door
    cyl("can_lens", 0.034, 0.004, (ENTRY_CAN[0], ENTRY_CAN[1], H - 0.012), sk.emission("can_lens", (1.0, 0.82, 0.62), 14.0), verts=32)
    li = bpy.data.lights.new("entry_light", "SPOT")
    li.energy, li.color, li.shadow_soft_size = ENTRY_POWER, (1.0, 0.72, 0.48), 0.03
    li.spot_size, li.spot_blend = math.radians(64), 0.55
    lo = _link(bpy.data.objects.new("entry_light", li))
    lo.location = (ENTRY_CAN[0], ENTRY_CAN[1], H - 0.02)
    window()
    door()


def window():
    m = M
    y_in, depth = WIN_Y - 0.02, 0.14
    yc = y_in + depth / 2
    zb, zt = 0.10, 2.62
    # the slab edge under the glass and the sill
    box("sill", (XM[-1] - W0, 0.2, zb), ((W0 + XM[-1]) / 2, WIN_Y + 0.08, zb / 2), m["concrete"], bevel=0.004)
    box("slab_out", (W1 - W0 + 4, 0.8, 0.45), ((W0 + W1) / 2, WIN_Y + 0.58, -0.2), m["concrete"])
    # frame: sill rail, head rail, transom, mullions
    box("win_rail_bottom", (XM[-1] - XM[0], depth, 0.06), ((XM[0] + XM[-1]) / 2, yc, zb + 0.03), m["bronze"], bevel=0.003)
    box("win_rail_top", (XM[-1] - XM[0], depth, 0.06), ((XM[0] + XM[-1]) / 2, yc, zt - 0.03), m["bronze"], bevel=0.003)
    box("win_transom", (XM[-1] - XM[0], depth * 0.8, 0.05), ((XM[0] + XM[-1]) / 2, yc + 0.01, 2.2), m["bronze"], bevel=0.003)
    for i, x in enumerate(XM):
        w = 0.07 if 0 < i < len(XM) - 1 else 0.05
        xx = x if 0 < i < len(XM) - 1 else (x + w / 2 if i == 0 else x - w / 2)
        box(f"win_mullion{i}", (w, depth + (0.03 if 0 < i < len(XM) - 1 else 0), zt - zb), (xx, yc + 0.01, (zb + zt) / 2),
            m["bronze"], bevel=0.003)
    # glass: one thin pane per bay below and above the transom
    for i in range(len(XM) - 1):
        x0, x1 = XM[i] + 0.03, XM[i + 1] - 0.03
        for (z0, z1, n) in ((zb + 0.05, 2.175, "lo"), (2.225, zt - 0.05, "hi")):
            g = box(f"glass_{i}_{n}", (x1 - x0, 0.006, z1 - z0), ((x0 + x1) / 2, GLASS_Y, (z0 + z1) / 2), m["glass"])
            g.visible_shadow = False


def door():
    m = M
    y0, y1, dh = DOOR
    yc = (y0 + y1) / 2
    # casing on the room side
    cw, ct = 0.075, 0.018
    box("casing_l", (ct, cw, dh + cw), (W0 + ct / 2, y0 - cw / 2, (dh + cw) / 2), m["trim"], bevel=0.004)
    box("casing_r", (ct, cw, dh + cw), (W0 + ct / 2, y1 + cw / 2, (dh + cw) / 2), m["trim"], bevel=0.004)
    box("casing_top", (ct, y1 - y0 + 2 * cw, cw), (W0 + ct / 2, yc, dh + cw / 2), m["trim"], bevel=0.004)
    # jamb lining the opening
    for n, s, l in (("jamb_l", (0.12, 0.02, dh), (W0 - 0.06, y0 + 0.01, dh / 2)), ("jamb_r", (0.12, 0.02, dh), (W0 - 0.06, y1 - 0.01, dh / 2)),
                    ("jamb_top", (0.12, y1 - y0, 0.02), (W0 - 0.06, yc, dh - 0.01))):
        box(n, s, l, m["trim"], bevel=0.002)
    # the door leaf: flush, 45 mm, set back in the opening; a 12 mm gap at the floor
    leaf = box("door_leaf", (0.045, y1 - y0 - 0.046, dh - 0.034), (W0 - 0.05, yc, 0.012 + (dh - 0.034) / 2), m["door"], bevel=0.003)
    # two-panel shaker face on the room side: stiles and rails 6 mm proud of the panels, all bevelled
    fx = W0 - 0.05 + 0.0225 + 0.003
    ly0, ly1 = y0 + 0.023, y1 - 0.023
    lz0, lz1 = 0.012, dh - 0.022
    sw, rw = 0.115, 0.13
    box("door_stile_a", (0.006, sw, lz1 - lz0), (fx, ly0 + sw / 2, (lz0 + lz1) / 2), m["door"], bevel=0.002)
    box("door_stile_b", (0.006, sw, lz1 - lz0), (fx, ly1 - sw / 2, (lz0 + lz1) / 2), m["door"], bevel=0.002)
    for n, zc, hh in (("door_rail_bottom", lz0 + 0.11, 0.22), ("door_rail_mid", 0.98, rw), ("door_rail_top", lz1 - rw / 2, rw)):
        box(n, (0.006, ly1 - ly0 - 2 * sw, hh), (fx, (ly0 + ly1) / 2, zc), m["door"], bevel=0.002)
    # lever handle and rose (room side), at the latch edge (the window side)
    hy = y1 - 0.09
    cyl("door_rose", 0.026, 0.012, (W0 - 0.016, hy, 0.98), m["steel"], rot=(0, math.radians(90), 0), bev=0.002)
    lever = box("door_lever", (0.018, 0.12, 0.016), (W0 + 0.002, hy - 0.06, 0.98), m["steel"], bevel=0.006)
    cyl("door_lever_neck", 0.009, 0.04, (W0 - 0.008, hy, 0.98), m["steel"], rot=(0, math.radians(90), 0))
    cyl("door_viewer", 0.009, 0.01, (W0 - 0.025, yc, 1.52), m["steel"], rot=(0, math.radians(90), 0))
    # deadbolt thumb-turn above the lever
    cyl("door_deadbolt", 0.022, 0.01, (W0 - 0.017, hy, 1.12), m["steel"], rot=(0, math.radians(90), 0), bev=0.002)
    _ = (leaf, lever)
    # the corridor's light: a bright strip in the gap under the door (the corridor side is lit)
    em = sk.emission("corridor_glow", (1.0, 0.88, 0.7), 5.0)
    box("door_gap_glow", (0.04, y1 - y0 - 0.06, 0.004), (W0 - 0.09, yc, 0.004), em)


# ---------------------------------------------------------------- furniture and dressing

def console():
    m = M
    y0, y1, top = CONSOLE
    x0, x1 = W0, W0 + 0.40
    yc, xc = (y0 + y1) / 2, (x0 + x1) / 2
    box("console_top", (x1 - x0, y1 - y0, 0.03), (xc, yc, top - 0.015), m["walnut"], bevel=0.005)
    box("console_case", (x1 - x0 - 0.04, y1 - y0 - 0.06, 0.15), (xc - 0.01, yc, top - 0.03 - 0.075), m["walnut"], bevel=0.003)
    dw = (y1 - y0 - 0.08) / 2
    for i in range(2):
        cy = y0 + 0.04 + dw / 2 + i * dw
        box(f"console_drawer{i}", (0.02, dw - 0.008, 0.13), (x1 - 0.022, cy, top - 0.03 - 0.075), m["walnut"], bevel=0.003)
        box(f"console_pull{i}", (0.012, 0.12, 0.012), (x1 - 0.006, cy, top - 0.03 - 0.075 + 0.035), m["brass"], bevel=0.004)
    # tapered, slightly splayed legs
    for sx, sy in ((0, 0), (0, 1), (1, 0), (1, 1)):
        lx = x0 + 0.05 if sx == 0 else x1 - 0.05
        ly = y0 + 0.06 if sy == 0 else y1 - 0.06
        ax = (-1 if sx == 0 else 1) * math.radians(4)
        ay = (-1 if sy == 0 else 1) * math.radians(4)
        hgt = top - 0.18
        cyl(f"console_leg{sx}{sy}", 0.021, hgt, (lx, ly, hgt / 2), m["walnut"], rot=(-ay, ax, 0), r2=0.013, verts=24)
        cyl(f"console_foot{sx}{sy}", 0.014, 0.012, (lx + math.sin(ax) * hgt / 2, ly - math.sin(ay) * hgt / 2 * -1, 0.006), m["brass"])
    # the lamp at the window end
    lamp()
    # a stoneware bowl (keys) and a closed sketchbook with a pencil
    lathe("console_bowl", [(0.0, 0.0), (0.05, 0.0), (0.075, 0.012), (0.095, 0.04), (0.1, 0.055), (0.093, 0.055),
                           (0.088, 0.042), (0.068, 0.016), (0.0, 0.01)], (W0 + 0.21, -0.98, top), m["stoneware"], segs=48)
    sb = box("sketchbook", (0.21, 0.28, 0.018), (W0 + 0.2, -0.66, top + 0.009), m["leatherette"], bevel=0.003,
             rot=(0, 0, math.radians(8)))
    box("sketchbook_pages", (0.2, 0.27, 0.014), (0.0, 0.004, 0.0), m["paper"]).parent = sb
    cyl("pencil", 0.0035, 0.17, (W0 + 0.27, -0.6, top + 0.0215), m["walnut"], rot=(math.radians(90), 0, math.radians(-12)), verts=6)
    # the framed print above
    pc_y, pc_z, pw, ph = (y0 + y1) / 2 - 0.08, 1.66, 0.62, 0.82
    box("print_frame", (0.03, pw, ph), (W0 + 0.015, pc_y, pc_z), m["frame"], bevel=0.004)
    box("print_mat", (0.004, pw - 0.06, ph - 0.06), (W0 + 0.031, pc_y, pc_z), m["mat_board"])
    box("print_art", (0.004, pw - 0.2, ph - 0.22), (W0 + 0.033, pc_y, pc_z + 0.01), m["print"])


def lamp():
    m = M
    x, y = LAMP
    z0 = CONSOLE[2]
    lathe("lamp_base", [(0.0, 0.0), (0.06, 0.0), (0.066, 0.006), (0.08, 0.05), (0.092, 0.13), (0.088, 0.2),
                        (0.07, 0.27), (0.04, 0.315), (0.022, 0.33), (0.0, 0.333)], (x, y, z0), m["glaze"], segs=56)
    cyl("lamp_neck", 0.011, 0.07, (x, y, z0 + 0.365), m["brass"], verts=20)
    cyl("lamp_socket", 0.018, 0.05, (x, y, z0 + 0.42), m["brass"], verts=24, bev=0.002)
    # harp: two thin uprights to the finial
    for s in (-1, 1):
        tube(f"lamp_harp{s}", [(x + s * 0.06, y, z0 + 0.4), (x + s * 0.06, y, z0 + 0.62), (x, y, z0 + 0.665)], 0.0025, m["brass"])
    cyl("lamp_finial", 0.012, 0.022, (x, y, z0 + 0.677), m["brass"], verts=20)
    # drum shade: open top and bottom, 3 mm linen on a wire ring
    zb, zt = z0 + 0.4, z0 + 0.655
    sh = lathe("lamp_shade", [(0.2, zb - (z0)), (0.172, zt - z0)], (x, y, z0), m["shade"], segs=72, cap=False)
    so = sh.modifiers.new("thick", "SOLIDIFY")
    so.thickness, so.offset = 0.003, 0.0
    for r, zz in ((0.2, zb), (0.172, zt)):
        tor = bpy.data.meshes.new("ring")
        bm = bmesh.new()
        segs = 48
        vs = [bm.verts.new((r * math.cos(2 * math.pi * i / segs), r * math.sin(2 * math.pi * i / segs), 0)) for i in range(segs)]
        for i in range(segs):
            bm.edges.new((vs[i], vs[(i + 1) % segs]))
        bm.to_mesh(tor)
        bm.free()
        ob = _link(bpy.data.objects.new("lamp_ring", tor))
        ob.location = (x, y, zz)
        ob.modifiers.new("skin", "SKIN")
        ob.data.materials.append(m["brass"])
        for v in ob.data.skin_vertices[0].data:
            v.radius = (0.0022, 0.0022)
    # the bulb: a soft warm globe and the light itself
    b = sk.sphere("lamp_bulb", 0.03, (x, y, LAMP_BULB_Z), sk.emission("bulb", (1.0, 0.8, 0.6), 30.0))
    b.visible_shadow = False
    li = bpy.data.lights.new("lamp_light", "POINT")
    li.energy, li.color, li.shadow_soft_size = 38.0, (1.0, 0.62, 0.33), 0.035
    lo = _link(bpy.data.objects.new("lamp_light", li))
    lo.location = (x, y, LAMP_BULB_Z)
    return lo


def suitcase(props):
    """Dawn's soft case, standing by the door with its telescopic handle drawn up: packed and waiting."""
    import props as pk  # noqa: F401
    x, y, t = CASE
    h = props.load("dawn-suitcase", size=0.66, axis="z", loc=(x, y, 0.0), turn_deg=t, sat=0.6)
    bpy.context.view_layer.update()
    meshes = [o for o in h.children_recursive if o.type == "MESH"]
    # draw the handle up: the grip is the part above the shell at the back (file -X): lift it 0.36 m and add the
    # two telescoping tubes under it
    lift = 0.36
    moved = 0
    grip_pts = []
    for o in meshes:
        mw = o.matrix_world
        inv = mw.inverted()
        for v in o.data.vertices:
            p = mw @ v.co
            loc = Matrix.Rotation(math.radians(-t), 4, "Z") @ (p - Vector((x, y, 0)))
            if p.z > 0.535 and loc.x < -0.06:
                v.co = inv @ (p + Vector((0, 0, lift)))
                grip_pts.append(loc)
                moved += 1
    if grip_pts:
        ys = [p.y for p in grip_pts]
        xs = [p.x for p in grip_pts]
        gy0, gy1 = min(ys), max(ys)
        gx = (min(xs) + max(xs)) / 2
        R = Matrix.Rotation(math.radians(t), 4, "Z")
        for s, yy in (("a", gy0 + 0.007), ("b", gy1 - 0.007)):
            a = Vector((x, y, 0)) + R @ Vector((gx, yy, 0.50))
            b = Vector((x, y, 0)) + R @ Vector((gx, yy, 0.61 + lift))
            tube(f"case_handle_{s}", [tuple(a), tuple(b)], 0.0085, M["steel"], res=4)
    print(f"SET suitcase handle: {moved} vertices lifted", flush=True)
    return h


def rug():
    m = M
    cx, cy, w, d = 0.35, 0.45, 2.7, 1.9
    box("rug_border", (w, d, 0.01), (cx, cy, 0.005), m["rug_border"], bevel=0.004)
    box("rug_field", (w - 0.16, d - 0.16, 0.0104), (cx, cy, 0.0052), m["rug"], bevel=0.003)


def coffee_table():
    m = M
    cx, cy = -0.25, 0.45
    box("ctable_top", (1.1, 0.56, 0.032), (cx, cy, 0.384), m["walnut"], bevel=0.012)
    box("ctable_apron", (0.98, 0.44, 0.05), (cx, cy, 0.343), m["walnut"], bevel=0.003)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl(f"ctable_leg{sx}{sy}", 0.02, 0.33, (cx + sx * 0.47, cy + sy * 0.2, 0.165), m["walnut"],
                rot=(-sy * math.radians(5), sx * math.radians(5), 0), r2=0.012, verts=20)
    # two closed books and a low stoneware vase with three dry stems
    box("book_a", (0.26, 0.2, 0.03), (cx - 0.28, cy + 0.04, 0.415), m["leatherette"], bevel=0.003, rot=(0, 0, math.radians(-7)))
    bk = sk.mat("book cloth 2", (0.2, 0.16, 0.11), 0.75)
    box("book_b", (0.22, 0.17, 0.024), (cx - 0.27, cy + 0.03, 0.442), bk, bevel=0.003, rot=(0, 0, math.radians(5)))
    lathe("vase", [(0.0, 0.0), (0.05, 0.0), (0.07, 0.04), (0.068, 0.12), (0.03, 0.2), (0.022, 0.24), (0.026, 0.25),
                   (0.018, 0.25), (0.0, 0.2)], (cx + 0.3, cy - 0.05, 0.4), m["stoneware"], segs=48)
    stem = sk.mat("dry stem", (0.17, 0.13, 0.08), 0.8)
    for i, (dx, dy, h) in enumerate(((0.0, 0.0, 0.62), (0.05, 0.02, 0.5), (-0.04, -0.03, 0.55))):
        tube(f"stem{i}", [(cx + 0.3, cy - 0.05, 0.6), (cx + 0.3 + dx * 0.6, cy - 0.05 + dy * 0.6, 0.6 + h * 0.6),
                          (cx + 0.3 + dx, cy - 0.05 + dy, 0.6 + h)], 0.0025, stem, res=2)


def lounge_chair():
    m = M
    cx, cy, turn = 1.95, 1.05, math.radians(205)
    R = Matrix.Rotation(turn, 4, "Z")
    parts = []

    def part(name, size, local, mm, bev, tilt=0.0):
        p = Vector((cx, cy, 0)) + R @ Vector(local)
        ob = box(name, size, tuple(p), mm, bevel=bev, rot=(tilt, 0, turn))
        parts.append(ob)
        return ob

    part("chair_frame", (0.72, 0.74, 0.08), (0, 0, 0.32), m["walnut"], 0.01)
    part("chair_seat", (0.62, 0.66, 0.13), (0, 0.02, 0.425), m["uphol"], 0.045)
    part("chair_back", (0.62, 0.14, 0.5), (0, -0.33, 0.7), m["uphol"], 0.05, tilt=math.radians(-14))
    for s in (-1, 1):
        part(f"chair_arm{s}", (0.06, 0.62, 0.035), (s * 0.35, 0.02, 0.6), m["walnut"], 0.012)
        part(f"chair_armpost{s}", (0.04, 0.04, 0.25), (s * 0.35, 0.25, 0.46), m["walnut"], 0.01)
    for sx in (-1, 1):
        for sy in (-1, 1):
            p = Vector((cx, cy, 0)) + R @ Vector((sx * 0.3, sy * 0.3, 0.14))
            cyl(f"chair_leg{sx}{sy}", 0.02, 0.28, tuple(p), m["walnut"], r2=0.013, verts=20)
    # the side table beside it, a small lamp-less tray table
    tx, ty = 2.25, 1.62
    cyl("side_top", 0.22, 0.025, (tx, ty, 0.52), m["walnut"], verts=64, bev=0.006)
    cyl("side_stem", 0.022, 0.5, (tx, ty, 0.26), m["walnut"], verts=24)
    cyl("side_foot", 0.17, 0.02, (tx, ty, 0.01), m["walnut"], verts=64, bev=0.005)
    return parts


def window_light(power=30.0):
    """The city's cool glow through the glass: one large soft area light just inside the window, facing the room,
    hidden from the camera and from reflections (the glass and floor reflect the real city instead)."""
    li = sk.area_light("city_glow", ((W0 + XM[-1]) / 2, WIN_Y - 0.08, 1.35), (XM[-1] - W0, 2.4), power, (0.55, 0.68, 1.0),
                       spread_deg=120, rot=(math.radians(-90), 0, 0))
    li.visible_camera = False
    li.visible_glossy = False
    return li


def door_light(power=1.6):
    """The corridor light under the door: a thin warm-neutral sheet at floor level, fanning across the floor."""
    y0, y1, _ = DOOR
    li = sk.area_light("under_door", (W0 + 0.004, (y0 + y1) / 2, 0.007), (0.012, y1 - y0 - 0.08), power, (1.0, 0.86, 0.68),
                       spread_deg=160, rot=(0, math.radians(-90), 0))
    li.visible_camera = False
    li.visible_glossy = False
    return li


def build(props):
    materials()
    room()
    console()
    rug()
    coffee_table()
    lounge_chair()
    case = suitcase(props)
    window_light()
    door_light()
    return case
