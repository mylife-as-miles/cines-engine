"""Stage: the Evidence Table (30 % of the film: Ch 00-02 the statement, the email, the passport and the tickets;
Ch 04-05 the purses and the receipt; Ch 06 the sealed envelope; Ch 07-11 the documents).

A dark, worn wooden table in a black room, lit only by an adjustable desk lamp: its head is the practical (a warm
bulb in a reflector shade throwing a cone across the table), and the rest of the room falls away to black. On the
table the investigation is laid out: an open manila folder with document sheets, boarding passes and a plain passport
on it, a letter folded in three and opened, photographic prints, a sealed envelope, a till receipt, a stack of case
folders, a mug, a pen and a highlighter. Every paper face is blank: graphics are composited later. No cast.

    <bpy python> -I scenes/shoot.py -- evidence_table <cam> out.png

Each camera carries a beat. Before every render the stage lays the table for it (spread: the documents; ch02: the
laptop open behind the passport, its screen glowing blank; ch04: the three handbags with the receipt in front of
them) by showing and hiding groups, and moves the lamp to its mark for that beat, by wrapping setkit.render for this
process only (as inspection_room.py does). Paper and small props: evidence_table_paper.py; materials:
evidence_table_mats.py.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402

import props  # noqa: E402
import setkit as sk  # noqa: E402
import evidence_table_mats as mt  # noqa: E402
import evidence_table_paper as pp  # noqa: E402

TOP = pp.TOP                       # table top height
TL, TW, TT = 2.2, 1.05, 0.045      # table length (x), depth (y), top thickness
EXPOSURE = -1.5
WARM = (1.0, 0.85, 0.68)           # the lamp: a warm-white incandescent
COOL = (0.8, 0.88, 1.0)            # the laptop screen

# The desk lamp (desk-lamp.glb at 0.55 m, turn 0, base centred on the origin): its shade looks along +Y and down. A
# ray probe of the shade's cavity puts the bulb about here and the reflector's axis 47 degrees below horizontal.
BULB = Vector((0.0, 0.072, 0.408))
AXIS = Vector((0.0, 0.68, -0.73)).normalized()
# lamp marks per beat: base (x, y) on the table and turn (degrees; the light falls along (-sin t, cos t))
LAMP = {"spread": (-0.55, 0.16, -115.0), "ch02": (-0.55, 0.16, -115.0), "ch04": (-0.75, -0.42, -57.0)}

# what each beat hides (groups are filled at build)
HIDE = {
    "spread": ("laptop", "bags", "receipt_c4", "passport_c2"),
    "ch02": ("bags", "receipt_c4", "photos", "receipt", "passport"),
    "ch04": ("laptop", "folder", "passport", "passport_c2", "letter", "photos", "receipt", "stack"),
}

LAPTOP = (0.40, 0.30, 60.0)      # base centre and turn: the screen faces (-cos t, -sin t), toward the front
# the purses for Ch 04: a staggered row lit from the lamp on the left; the darkest (burgundy) nearest the lamp, the
# cognac tote farthest. Turns put each bag's clean front toward the camera at the front left.
BAGS = {"handbag-shoulder": (-0.375, 0.195, 162.0), "handbag-satchel": (-0.06, 0.02, 153.0), "handbag-tote": (0.255, -0.155, 145.0)}
BAG_GRADE = {  # from the inspection room: size, axis, grade, finish
    "handbag-tote": (0.35, "long", dict(sat=0.9, val=1.15, hue=0.545, rough_add=0.2), dict(spec=0.4)),
    "handbag-satchel": (0.30, "long", dict(sat=0.8, rough_add=0.12), dict()),
    "handbag-shoulder": (0.32, "long", dict(sat=0.55, val=0.5, rough_add=0.25), dict(spec=0.35)),
}

CAMERAS = {
    # the whole spread from straight above (long lens, high: a flat, graphic plan): the lamp reaching in from the
    # left, its pool across the open folder, the edges of the spread falling into the dark
    "overhead": dict(loc=(-0.02, -0.03, TOP + 3.3), aim=(-0.02, -0.026, TOP), lens=85, focus="fx_overhead", fstop=11.0,
                     beat="spread"),
    # low across the table toward the lamp: the opened letter sharp in the foreground, the spread going soft, the
    # lamp's glowing head beyond
    "push": dict(loc=(0.66, -0.43, TOP + 0.065), aim=(-0.30, 0.20, TOP + 0.13), lens=35, focus="fx_push", fstop=2.0,
                 beat="spread"),
    # Ch 02: the laptop open at the back of the table, its blank screen glowing, the passport and the boarding passes
    # in front of it under the lamp
    "laptop": dict(loc=(-0.31, -0.53, TOP + 0.19), aim=(0.22, 0.22, TOP + 0.075), lens=32, focus="fx_laptop", fstop=2.8,
                   beat="ch02"),
    # Ch 04: the three handbags in the lamp's light, the receipt curling in front of them
    "purses": dict(loc=(-0.62, -1.10, TOP + 0.48), aim=(-0.05, 0.02, TOP + 0.13), lens=35, focus="fx_purses", fstop=4.0,
                   beat="ch04"),
    # controlled close-up: the passport lying across the two boarding passes on the folder
    "passport": dict(loc=(-0.08, -0.41, TOP + 0.49), aim=(-0.225, -0.03, TOP), lens=70, focus="fx_passport", fstop=2.8,
                     beat="spread"),
}

M = {}
G = {}                 # group name -> objects
_STATE = {"lamp": None, "lamp_parts": []}


def group(name, obs):
    G.setdefault(name, []).extend([o for o in (obs if isinstance(obs, (list, tuple)) else [obs]) if o is not None])
    return obs


def materials():
    if M:
        return M
    M.update(
        wood=mt.worn_wood("table wood", TW / 4, -TW / 2, rings=((0.135, 0.3, 0.039), (0.585, -0.33, 0.041), (-0.42, 0.43, 0.04)),
                          front_y=-TW / 2),
        leg=mt.worn_wood("table leg wood", 0.08, -0.04, rough=0.5),
        floor=mt.matte("floor", (0.018, 0.017, 0.016), 0.7),
        paper=mt.paper("paper", (0.7, 0.68, 0.62), 0.86, 0.05, 0.04, edge_tone=(0.21, 0.297)),
        paper2=mt.paper("paper 2", (0.66, 0.65, 0.6), 0.86, 0.05, 0.06, edge_tone=(0.21, 0.297)),
        letter=mt.paper("letter paper", (0.69, 0.665, 0.6), 0.85, 0.05, 0.05, edge_tone=(0.21, 0.297)),
        cream=mt.paper("envelope paper", (0.66, 0.6, 0.48), 0.82, 0.06, 0.05),
        manila=mt.manila("manila"),
        card=mt.boarding_card("boarding card", 0.203, 0.082, 0.0545),
        thermal=mt.thermal("thermal paper"),
        photo_l=mt.photo("print 6x4", 0.152, 0.102, 0.005),
        photo_p=mt.photo("print 5x7", 0.127, 0.178, 0.006),
        cover=mt.passport_cover("passport cover"),
        pages=mt.page_block("passport pages"),
        pen=mt.plastic("pen plastic", (0.012, 0.012, 0.014), 0.38, 0.5),
        chrome=mt.satin_metal("pen metal", (0.62, 0.62, 0.6), 0.25),
        clip=mt.satin_metal("clip wire", (0.6, 0.61, 0.62), 0.22),
        hl_body=mt.plastic("highlighter body", (0.46, 0.4, 0.04), 0.4, 0.5),
        hl_cap=mt.plastic("highlighter cap", (0.36, 0.3, 0.02), 0.35, 0.5),
        glaze=mt.glaze("mug glaze", (0.035, 0.04, 0.045)),
        bisque=mt.matte("mug foot", (0.32, 0.29, 0.25), 0.85),
        coffee=mt.liquid("coffee"),
        enamel=mt.plastic("lamp reflector enamel", (0.62, 0.6, 0.56), 0.32, 0.5, 0.05),
        bulb=mt.glow("lamp bulb", (1.0, 0.9, 0.76), 40.0),
    )
    return M


# ---------------------------------------------------------------- the room and the table

def mesh_obj(name, bm, m, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(m)
    return ob


def bevelled(ob, width, segs=3, angle=40):
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = width, segs, "ANGLE"
    bv.angle_limit = math.radians(angle)
    ob.modifiers.new("wn", "WEIGHTED_NORMAL")
    return ob


def add_box(bm, size, loc):
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(loc) @ Matrix.Diagonal((*size, 1)))


def table():
    """A heavy old table: four boards along X with hairline joints and rounded arrises, an apron, square legs."""
    m = materials()
    bm = bmesh.new()
    gap = 0.0012
    pw = TW / 4
    for i in range(4):
        y = -TW / 2 + pw * (i + 0.5)
        add_box(bm, (TL, pw - gap, TT), (0.0, y, 0.0))
    top = bevelled(mesh_obj("table_top", bm, m["wood"]), 0.0028, 3)
    top.location = (0.0, 0.0, TOP - TT / 2)
    bm = bmesh.new()
    ins, ah, at = 0.07, 0.1, 0.024
    add_box(bm, (TL - 2 * ins, at, ah), (0.0, -TW / 2 + ins, -ah / 2))
    add_box(bm, (TL - 2 * ins, at, ah), (0.0, TW / 2 - ins, -ah / 2))
    add_box(bm, (at, TW - 2 * ins, ah), (-TL / 2 + ins, 0.0, -ah / 2))
    add_box(bm, (at, TW - 2 * ins, ah), (TL / 2 - ins, 0.0, -ah / 2))
    lw = 0.085
    for sx in (-1, 1):
        for sy in (-1, 1):
            add_box(bm, (lw, lw, TOP - TT), (sx * (TL / 2 - ins), sy * (TW / 2 - ins), -(TOP - TT) / 2))
    frame = bevelled(mesh_obj("table_frame", bm, m["leg"]), 0.003, 2)
    frame.location = (0.0, 0.0, TOP - TT)
    sk.box("floor", (8.0, 8.0, 0.02), (0.0, 0.0, -0.01), m["floor"])
    pp.SUPPORT[:] = [top]
    return top


# ---------------------------------------------------------------- the lamp

def lamp_frame(beat):
    x, y, t = LAMP.get(beat, LAMP["spread"])
    return Matrix.Translation((x, y, TOP)) @ Matrix.Rotation(math.radians(t), 4, "Z")


def lamp():
    """The desk-lamp prop, its shade's inside finished as a pale reflector, a bulb in it, and its light: a spot along
    the reflector's axis (the cone) and a small sphere at the bulb for the spill round the rim and the glow inside
    the shade. Built at the origin; lamp parts move with it to each beat's mark."""
    m = materials()
    h = props.load("desk-lamp", size=0.55, axis="z", loc=(0, 0, 0), turn_deg=0, sat=0.45, val=0.85, rough_add=0.06)
    bpy.context.view_layer.update()
    n_in = 0
    for o in [c for c in h.children_recursive if c.type == "MESH"]:
        mw = o.matrix_world
        nm = mw.to_3x3().inverted().transposed()
        o.data.materials.append(m["enamel"])
        idx = len(o.data.materials) - 1
        for p in o.data.polygons:
            c = mw @ p.center
            n = (nm @ p.normal).normalized()
            d = BULB - c
            if d.length < 0.115 and n.dot(d) > 0.2 * d.length and (c - BULB).dot(AXIS) > -0.02:
                p.material_index = idx
                n_in += 1
    print(f"EVIDENCE lamp reflector faces {n_in}", flush=True)
    parts = []
    bulb = sk.sphere("lamp_bulb", 0.019, tuple(BULB), m["bulb"], segs=24)
    bulb.visible_shadow = False
    bulb.visible_diffuse = False
    bulb.visible_volume_scatter = False
    parts.append(bulb)
    li = bpy.data.lights.new("lamp_spot", "SPOT")
    li.energy, li.color = 46.0, WARM
    li.spot_size, li.spot_blend = math.radians(96.0), 0.38
    li.shadow_soft_size = 0.016
    spot = bpy.data.objects.new("lamp_spot", li)
    bpy.context.scene.collection.objects.link(spot)
    spot.matrix_world = Matrix.Translation(BULB) @ AXIS.to_track_quat("-Z", "Y").to_matrix().to_4x4()
    parts.append(spot)
    pl = bpy.data.lights.new("lamp_glow", "POINT")
    pl.energy, pl.color, pl.shadow_soft_size = 3.0, WARM, 0.012
    glow = bpy.data.objects.new("lamp_glow", pl)
    bpy.context.scene.collection.objects.link(glow)
    glow.location = BULB - AXIS * 0.004
    parts.append(glow)
    bpy.context.view_layer.update()
    _STATE["lamp"] = h
    _STATE["lamp_parts"] = [(o, o.matrix_world.copy()) for o in parts]
    return h


def set_lamp(beat):
    fr = lamp_frame(beat)
    h = _STATE["lamp"]
    x, y, t = LAMP.get(beat, LAMP["spread"])
    h.location = (x, y, TOP)
    h.rotation_euler = (0, 0, math.radians(t))
    for o, local in _STATE["lamp_parts"]:
        o.matrix_world = fr @ local
    bpy.context.view_layer.update()


# ---------------------------------------------------------------- generated props

def world_bvh(holder):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    V, P = [], []
    for o in holder.children_recursive:
        if o.type != "MESH":
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        b = len(V)
        V.extend(o.matrix_world @ v.co for v in me.vertices)
        P.extend([b + i for i in p.vertices] for p in me.polygons)
        ev.to_mesh_clear()
    return BVHTree.FromPolygons(V, P)


def laptop():
    """The laptop prop open at the back of the table, its screen switched on to a blank page: a glowing panel inset
    in the lid's bezel and a weak area light in front of it, so the glow falls on what is near."""
    m = materials()
    h = props.load("laptop", size=0.36, axis="long", loc=(0, 0, 0), turn_deg=0, sat=0.45, val=0.8, rough_add=0.12)
    # find the lid's inner face (it looks along -X in the file) by rays from the keyboard side
    tree = world_bvh(h)
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
    xs = lambda z: a + b * z                                      # noqa: E731

    def on_lid(y, z):
        r = tree.ray_cast(Vector((-0.4, y, z)), Vector((1, 0, 0)))
        return r[0] is not None and abs(r[0].x - xs(z)) < 0.008
    ymax = 0.0
    while on_lid(ymax + 0.002, 0.13) and ymax < 0.3:
        ymax += 0.002
    ymin = 0.0
    while on_lid(ymin - 0.002, 0.13) and ymin > -0.3:
        ymin -= 0.002
    ztop = 0.13
    while on_lid((ymin + ymax) / 2, ztop + 0.002) and ztop < 0.4:
        ztop += 0.002
    up = Vector((b, 0.0, 1.0)).normalized()
    nrm = Vector((-1.0, 0.0, b)).normalized()
    zbot = 0.03
    # the panel: inset 11 mm at the sides and top, 20 mm at the bottom (bezel and hinge)
    s_top = (ztop - zbot) / up.z
    s0, s1 = 0.02, s_top - 0.011
    w = (ymax - ymin) - 0.022
    hh = s1 - s0
    base = Vector((xs(zbot), (ymin + ymax) / 2, zbot))
    centre = base + up * ((s0 + s1) / 2) + nrm * 0.0009
    xaxis = up.cross(nrm).normalized()
    rot = Matrix((xaxis, up, nrm)).transposed()
    print(f"EVIDENCE laptop lid {len(hits)} hits, slope {b:.3f}, y {ymin:.3f}..{ymax:.3f}, top {ztop:.3f}; panel {w:.3f} x {hh:.3f}",
          flush=True)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5, matrix=Matrix.Diagonal((w, hh, 1, 1)))
    scr = mesh_obj("laptop_screen", bm, mt.screen("laptop screen", COOL, 2.4, w, hh), smooth=False)
    scr.matrix_world = Matrix.Translation(centre) @ rot.to_4x4()
    li = sk.area_light("laptop_screen_light", tuple(centre + nrm * 0.004), (w, hh), 0.75, COOL, spread_deg=150)
    li.matrix_world = Matrix.Translation(centre + nrm * 0.004) @ (rot @ Matrix.Rotation(math.pi, 3, "X")).to_4x4()
    li.visible_camera = False
    li.visible_glossy = False
    fx = bpy.data.objects.new("fx_laptop", None)
    bpy.context.scene.collection.objects.link(fx)
    fx.matrix_world = Matrix.Translation(centre)
    x, y, t = LAPTOP
    place = Matrix.Translation((x, y, TOP)) @ Matrix.Rotation(math.radians(t), 4, "Z")
    for o in (scr, li, fx):
        o.matrix_world = place @ o.matrix_world
    h.location = (x, y, TOP)
    h.rotation_euler = (0, 0, math.radians(t))
    return [h] + list(h.children_recursive) + [scr, li]


def bags():
    out = []
    for name, (x, y, t) in BAGS.items():
        size, axis, grade, fin = BAG_GRADE[name]
        h = props.load(name, size=size, axis=axis, loc=(x, y, TOP), turn_deg=t, **grade)
        meshes = [o for o in h.children_recursive if o.type == "MESH"]
        bpy.context.view_layer.update()
        to_m = meshes[0].matrix_world.to_scale().x if meshes else 1.0
        seen = set()
        for o in meshes:
            for slot in o.material_slots:
                if slot.material and slot.material.name not in seen:
                    seen.add(slot.material.name)
                    mt.tune_prop(slot.material, spec=fin.get("spec"), to_metres=to_m)
        out += [h] + list(h.children_recursive)
    return out


def folder_stack():
    h = props.load("file-folders", size=0.34, axis="long", loc=(-0.2, 0.385, TOP), turn_deg=4.0, sat=0.75, val=0.82, rough_add=0.1)
    h.scale.z *= 0.62                           # a stack of a dozen folders, not two dozen
    bpy.context.view_layer.update()
    return [h] + list(h.children_recursive)


# ---------------------------------------------------------------- the spread

def spread():
    """Lay the evidence out bottom to top: each paper drops onto what is already there."""
    m = materials()
    group("stack", folder_stack())
    # the open folder, fold running front to back; its back panel (with the tab) on the lamp's side
    group("folder", pp.manila_folder("open_folder", m["manila"], -0.10, -0.015, 86.0))
    group("folder", pp.sheet("sheet_b", m["paper2"], 0.21, 0.297, 0.03, 0.0, -5.0,
                             shape=pp.sheet_shape(0.21, 0.297, 7, corners=(0.0, 0.002, 0.0035, 0.0), wave=0.0008)))
    group("folder", pp.sheet("sheet_a", m["paper"], 0.21, 0.297, 0.012, -0.012, 2.5,
                             shape=pp.sheet_shape(0.21, 0.297, 3, corners=(0.0015, 0.0, 0.0045, 0.001), wave=0.0006)))
    group("folder", pp.paper_clip("clip_a", m["clip"], -0.093, 0.118, 96.0))
    group("folder", pp.boarding_pass("pass_1", m["card"], -0.212, 0.078, 3.0, seed=4))
    group("folder", pp.boarding_pass("pass_2", m["card"], -0.226, 0.024, -8.0, seed=9, lift=0.004))
    group("passport", pp.passport("passport", m["cover"], m["pages"], -0.232, -0.06, 17.0))
    group("letter", pp.sheet("letter", m["letter"], 0.21, 0.297, 0.31, -0.205, -14.0, shape="trifold"))
    group("letter", pp.pen("pen", m["pen"], m["chrome"], m["chrome"], 0.25, -0.29, 31.0))
    group("photos", pp.photo_print("photo_1", m["photo_l"], 0.152, 0.102, 0.265, 0.095, 12.0, seed=2))
    group("photos", pp.photo_print("photo_2", m["photo_p"], 0.127, 0.178, 0.372, 0.045, -8.0, seed=5))
    group("photos", pp.photo_print("photo_3", m["photo_l"], 0.152, 0.102, 0.205, 0.205, -5.0, curl=0.0022, seed=8))
    group("envelope", pp.envelope("envelope", m["cream"], -0.43, -0.285, 7.0))
    group("receipt", pp.receipt("receipt", m["thermal"], 0.49, -0.105, 64.0, seed=5))
    group("folder", pp.highlighter("highlighter", m["hl_body"], m["hl_cap"], 0.075, -0.262, -9.0))
    group("mug", pp.mug("mug", m["glaze"], m["bisque"], m["coffee"], 0.06, 0.255, 35.0))


def overlap_report():
    """Print visible items whose footprints overlap the beat's hero props (a check, not a fix)."""
    def box(obs):
        pts = []
        for o in obs:
            if o.type in ("MESH", "CURVE"):
                pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
        if not pts:
            return None
        return (min(p.x for p in pts), min(p.y for p in pts), max(p.x for p in pts), max(p.y for p in pts))
    for beat, hidden in HIDE.items():
        heroes = {"ch02": ["laptop"], "ch04": ["bags", "receipt_c4"]}.get(beat, [])
        for hname in heroes:
            for ho in [o for o in G.get(hname, []) if o.type == "EMPTY" and o.parent is None] or G.get(hname, [])[:1]:
                hb = box(list(ho.children_recursive) or [ho])
                for gname, obs in G.items():
                    if gname in hidden or gname in heroes:
                        continue
                    for o in obs:
                        ob = box([o])
                        if hb and ob and ob[0] < hb[2] and ob[2] > hb[0] and ob[1] < hb[3] and ob[3] > hb[1]:
                            print(f"EVIDENCE overlap {beat}: {ho.name} x {gname}/{o.name}", flush=True)


# ---------------------------------------------------------------- beats and cameras

def set_beat(beat):
    hidden = set(HIDE.get(beat, ()))
    for gname, obs in G.items():
        for o in obs:
            o.hide_render = gname in hidden
    set_lamp(beat)


def which_camera():
    cam = bpy.context.scene.camera
    if cam is None:
        return None
    for n, c in CAMERAS.items():
        if (cam.location - Vector(c["loc"])).length < 1e-3:
            return n
    return None


def apply_camera(name):
    cfg = CAMERAS.get(name, {})
    beat = cfg.get("beat", "spread")
    set_beat(beat)
    sc = bpy.context.scene
    sc.cycles.sample_clamp_indirect = 6.0
    sc.cycles.blur_glossy = 0.5
    sc.cycles.max_bounces = 8
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    print(f"EVIDENCE camera {name or '?'}: beat {beat}, hidden {sorted(HIDE.get(beat, ()))}", flush=True)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def empty(name, loc):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.location = loc
    return e


def build(cast=True):
    M.clear()
    G.clear()
    materials()
    table()
    lamp()
    spread()
    group("laptop", laptop())
    group("bags", bags())
    group("receipt_c4", pp.receipt("receipt_c4", M["thermal"], -0.10, -0.215, 70.0, seed=12))
    # Ch 02: the passport picked up and put down again on the documents, nearer the laptop
    group("passport_c2", pp.passport("passport_c2", M["cover"], M["pages"], 0.022, -0.03, -24.0))
    # lamp-lit air: a faint haze over the table only, so the cone has a shape in the low shots
    hz = sk.haze((2.6, 1.6, 1.0), (0.0, 0.0, TOP + 0.5), 0.0035, colour=(0.9, 0.88, 0.85))
    hz.visible_shadow = False
    pport = bpy.data.objects["passport_front"]
    bpy.context.view_layer.update()
    pc = pport.matrix_world @ Vector((0.01, 0.0, 0.0052))
    empty("fx_passport", tuple(pc))
    empty("fx_overhead", (-0.07, 0.0, TOP + 0.01))
    let = bpy.data.objects["letter"]
    empty("fx_push", tuple(let.matrix_world @ Vector((0.03, -0.02, 0.002))))
    rc = bpy.data.objects["receipt_c4"]
    empty("fx_purses", tuple(rc.matrix_world @ Vector((0.0, 0.0, 0.004))))
    overlap_report()
    set_beat("spread")
    install_hook()
