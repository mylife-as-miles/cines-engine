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
# Ch 04: the lamp as near the bags as it can stand without its head entering the purses frame (checked by projecting
# the lamp's mesh), turned toward the tote so the row falls off evenly from the burgundy bag to the cognac one
LAMP = {"spread": (-0.55, 0.16, -115.0), "ch02": (-0.55, 0.16, -115.0), "ch04": (-0.84, -0.38, -70.0)}
LAMP_LEVEL = {"ch02": 0.5, "ch04": 2.2}   # Ch 02 is night at the laptop: the lamp turned down so the screen leads
# the reflector's cone per beat (full angle, blend): a pool with a soft edge, not a flood. Ch 04 opens it a little so
# the cone still reaches the tote at the far end of the row (the lamp cannot come nearer without entering the frame)
SPOT = {"spread": (75.0, 0.55), "ch02": (75.0, 0.55), "ch04": (90.0, 0.55)}
BOUNCE = {"spread": 2.0, "ch02": 2.4, "ch04": 2.4}   # the lamp's light back off the ceiling (see room_bounce)

# what each beat hides (groups are filled at build); groups in CAMERA_ONLY are hidden unless a camera shows them
HIDE = {
    "spread": ("laptop", "bags", "receipt_c4", "passport_c2", "passes_c2"),
    "ch02": ("bags", "receipt_c4", "photos", "receipt", "passport", "folder", "letter"),
    "ch04": ("laptop", "folder", "highlighter", "passport", "passport_c2", "passes_c2", "letter", "photos", "receipt", "stack"),
}
CAMERA_ONLY = ("net_passport",)

LAPTOP = (0.40, 0.30, 60.0)      # base centre and turn: the screen faces (-cos t, -sin t), toward the front
# Ch 04: the rolled receipt in front of the tote, in the pool's falloff so it is not the brightest thing in frame
# (x, y, turn: the roll at its left end, seen nearly end on)
RECEIPT_C4 = (0.14, -0.33, 73.0)
TOTE_MARK = (Vector((0.119, -0.005, 0.1401)), 0.014)   # the tote's modelled oval plate: mesh-local centre, radius (m)
# the purses for Ch 04: a staggered row lit from the lamp on the left; the darkest (burgundy) nearest the lamp, the
# cognac tote farthest. Turns put each bag's clean front toward the camera at the front left.
BAGS = {"handbag-shoulder": (-0.375, 0.195, 162.0), "handbag-satchel": (-0.06, 0.02, 153.0), "handbag-tote": (0.255, -0.155, 145.0)}
BAG_GRADE = {  # from the inspection room: size, axis, grade, finish. Hue and saturation are pushed so the tote still
    # reads cognac (and the shoulder bag burgundy) after the film grade cools and desaturates them
    "handbag-tote": (0.35, "long", dict(sat=1.25, val=1.15, hue=0.52, rough_add=0.2), dict(spec=0.4)),
    "handbag-satchel": (0.30, "long", dict(sat=0.8, rough_add=0.12), dict()),
    "handbag-shoulder": (0.32, "long", dict(sat=0.8, val=0.55, rough_add=0.25), dict(spec=0.35)),
}

CAMERAS = {
    # the whole spread from straight above (long lens, high: a flat, graphic plan): the lamp reaching in from the
    # left, its pool across the open folder, the edges of the spread falling into the dark
    "overhead": dict(loc=(0.03, 0.02, TOP + 3.6), aim=(0.03, 0.024, TOP), lens=85, focus="fx_overhead", fstop=11.0,
                     beat="spread", exposure=-1.3),
    # low across the table toward the lamp: the top sheet's lifted corner sharp in the foreground, the spread going
    # soft, the whole lamp beyond (base, arm and glowing head) with its cone in the air. The lamp is turned 20 degrees
    # off the lens for this set-up (a cheat between cuts), so its head reads in three-quarter view, the shade's outside
    # and the reflector both, and the cone crosses the frame instead of pointing down the lens
    "push": dict(loc=(0.62, -0.40, TOP + 0.10), aim=(-0.375, 0.271, TOP + 0.12), lens=28, focus="fx_push", fstop=2.2,
                 beat="spread", hide=("receipt", "letter", "envelope"), exposure=-1.15, lamp=(-0.55, 0.16, -135.0)),
    # Ch 02: the laptop open at the back of the table, its blank screen glowing, the passport and the boarding passes
    # in front of it under the lamp turned down; dark wood in the foreground
    "laptop": dict(loc=(-0.31, -0.53, TOP + 0.19), aim=(0.22, 0.22, TOP + 0.075), lens=32, focus="fx_laptop", fstop=4.0,
                   beat="ch02", hide=("envelope", "highlighter"), exposure=-1.3),
    # Ch 04: the three handbags in the lamp's light, the receipt curling in front of them
    "purses": dict(loc=(-0.62, -1.10, TOP + 0.48), aim=(-0.05, 0.02, TOP + 0.13), lens=35, focus="fx_purses", fstop=4.0,
                   beat="ch04", hide=("envelope",), exposure=-1.0),
    # controlled close-up: the passport lying across the two boarding passes on the folder, its cover sprung open.
    # For this insert the lamp is cheated to the passport's front left: the cover's sheen then reflects away from the
    # lens (from behind, it greyed the whole navy cover), the cream page edge facing the camera catches the light, and
    # the passes behind fall under it, helped by a graduated net off the lamp
    "passport": dict(loc=(-0.135, -0.41, TOP + 0.49), aim=(-0.28, -0.03, TOP), lens=70, focus="fx_passport", fstop=2.8,
                     beat="spread", show=("net_passport",), hide=("envelope",), lamp=(-0.61, -0.32, -55.0)),
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
        wood=mt.worn_wood("table wood", TW / 4, -TW / 2, rings=((-0.22, -0.235, 0.039), (0.585, -0.33, 0.041), (-0.42, 0.43, 0.04)),
                          front_y=-TW / 2),
        leg=mt.worn_wood("table leg wood", 0.08, -0.04, rough=0.5),
        floor=mt.matte("floor", (0.018, 0.017, 0.016), 0.7),
        wall=mt.plaster("wall plaster"),
        paper=mt.paper("paper", (0.74, 0.71, 0.64), 0.86, 0.05, 0.04, edge_tone=(0.21, 0.297)),
        paper2=mt.paper("paper 2", (0.71, 0.69, 0.63), 0.86, 0.05, 0.06, edge_tone=(0.21, 0.297)),
        letter=mt.paper("letter paper", (0.73, 0.7, 0.62), 0.85, 0.05, 0.05, edge_tone=(0.21, 0.297)),
        cream=mt.paper("envelope paper", (0.68, 0.62, 0.5), 0.82, 0.06, 0.05),
        manila=mt.manila("manila"),
        card=mt.boarding_card("boarding card", 0.203, 0.082, 0.0545),
        thermal=mt.thermal("thermal paper"),
        # three blank prints of different tones (the pictures are composited later): a mid print darkening toward one
        # end, a near-black one, a cooler one
        photo_1=mt.photo("print 6x4 mid", 0.152, 0.102, 0.005, image_rgb=(0.12, 0.118, 0.112), gradient=0.35),
        photo_2=mt.photo("print 5x7 dark", 0.127, 0.178, 0.005, image_rgb=(0.03, 0.03, 0.03)),
        photo_3=mt.photo("print 6x4 cool", 0.152, 0.102, 0.005, image_rgb=(0.072, 0.076, 0.08)),
        cover=mt.passport_cover("passport cover"),
        pages=mt.page_block("passport pages"),
        endpaper=mt.endpaper("passport lining"),
        pen=mt.plastic("pen plastic", (0.012, 0.012, 0.014), 0.38, 0.5),
        chrome=mt.satin_metal("pen metal", (0.62, 0.62, 0.6), 0.25),
        clip=mt.satin_metal("clip wire", (0.6, 0.61, 0.62), 0.22),
        hl_body=mt.plastic("highlighter body", (0.46, 0.4, 0.04), 0.4, 0.5),
        hl_cap=mt.plastic("highlighter cap", (0.36, 0.3, 0.02), 0.35, 0.5),
        glaze=mt.glaze("mug glaze", (0.035, 0.04, 0.045)),
        bisque=mt.matte("mug foot", (0.32, 0.29, 0.25), 0.85),
        coffee=mt.liquid("coffee"),
        enamel=mt.plastic("lamp reflector enamel", (0.4, 0.39, 0.36), 0.36, 0.5, 0.05),
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
    # The generated material is mostly bare metal (its glTF metallic channel averages 0.63, most texels 1.0), so as
    # it came the shade's top and the arm mirrored the black room and read as a black hole from above and behind. It
    # is finished here as painted enamel instead: metallic capped at 0.12, a satin roughness of 0.35 and a dark-grey
    # paint (the texture's value scaled to about 0.06 average), so the shade and arm pick up the pool, the room's
    # bounce and the rim light below.
    h = props.load("desk-lamp", size=0.55, axis="z", loc=(0, 0, 0), turn_deg=0, sat=0.45, val=0.85 * 0.26, rough_add=0.0)
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
    # painted enamel: metallic capped, satin roughness (the generated map's variation kept at a fifth of its range)
    for mat in {s.material for o in h.children_recursive if o.type == "MESH" for s in o.material_slots if s.material}:
        if mat is m["enamel"]:
            continue
        nt = mat.node_tree
        bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf is None:
            continue
        for sock, op, k, add in (("Roughness", "MULTIPLY_ADD", 0.2, 0.26), ("Metallic", "MINIMUM", 0.12, None)):
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
    parts = []
    bulb = sk.sphere("lamp_bulb", 0.019, tuple(BULB), m["bulb"], segs=24)
    bulb.visible_shadow = False
    bulb.visible_diffuse = False
    bulb.visible_volume_scatter = False
    parts.append(bulb)
    li = bpy.data.lights.new("lamp_spot", "SPOT")
    li.energy, li.color = 46.0, WARM
    li.spot_size, li.spot_blend = math.radians(SPOT["spread"][0]), SPOT["spread"][1]
    li.shadow_soft_size = 0.016
    spot = bpy.data.objects.new("lamp_spot", li)
    bpy.context.scene.collection.objects.link(spot)
    spot.matrix_world = Matrix.Translation(BULB) @ AXIS.to_track_quat("-Z", "Y").to_matrix().to_4x4()
    parts.append(spot)
    pl = bpy.data.lights.new("lamp_glow", "POINT")
    pl.energy, pl.color, pl.shadow_soft_size = 0.7, WARM, 0.012
    glow = bpy.data.objects.new("lamp_glow", pl)
    bpy.context.scene.collection.objects.link(glow)
    glow.location = BULB - AXIS * 0.004
    parts.append(glow)
    # a small warm rim from behind and above the head that only the lamp itself sees (light linking): the shade's
    # outer edge and the arm get a thin highlight against the dark, and from above the shade reads as a shape
    # (0.3 m square, well above and a little behind: from overhead it lays a sheen across the shade's back, from the
    # low push it rims the shade's top edge and the arm)
    rim_at = Vector((0.0, BULB.y - 0.2, BULB.z + 0.3))
    rim = sk.area_light("lamp_rim", tuple(rim_at), (0.3, 0.3), 2.2, (1.0, 0.86, 0.7), spread_deg=120)
    aim = (BULB + Vector((0.0, -0.04, 0.02))) - rim_at
    rim.matrix_world = Matrix.Translation(rim_at) @ aim.to_track_quat("-Z", "Y").to_matrix().to_4x4()
    rim.visible_camera = False
    rim.visible_volume_scatter = False
    recv = bpy.data.collections.new("lamp_rim_receivers")
    for o in h.children_recursive:
        if o.type == "MESH":
            recv.objects.link(o)
    try:
        rim.light_linking.receiver_collection = recv
    except AttributeError:                       # no light linking in this build: keep the rim very weak instead
        rim.data.energy = 0.3
        print("EVIDENCE warning: no light linking; lamp rim weakened", flush=True)
    parts.append(rim)
    parts.append(cone_haze())
    bpy.context.view_layer.update()
    for o in (spot, glow, rim):
        o["energy0"] = o.data.energy
    _STATE["lamp"] = h
    _STATE["lamp_parts"] = [(o, o.matrix_world.copy()) for o in parts]
    return h


def cone_haze(density=0.035, size=(0.6, 0.62, 0.44)):
    """Denser air under the shade only, so the lamp's cone reads as a wedge from the reflector down to the table in
    the low shots. A box in the lamp's own frame (it moves with the lamp), its density fading out smoothly toward
    the box's faces (an ellipsoid falloff) so no edge of the box shows where the cone crosses it."""
    sx, sy, sz = size
    c = Vector((0.0, BULB.y + 0.2, 0.004 + sz / 2))
    m = bpy.data.materials.new("cone haze")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    pv = nt.nodes.new("ShaderNodeVolumePrincipled")
    pv.inputs["Color"].default_value = (0.9, 0.88, 0.85, 1)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (2.0 / sx, 2.0 / sy, 2.0 / sz)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    ln = nt.nodes.new("ShaderNodeVectorMath")
    ln.operation = "LENGTH"
    nt.links.new(mp.outputs["Vector"], ln.inputs[0])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.interpolation_type = "SMOOTHSTEP"
    mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = 1.0, 0.45
    mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = 0.0, density
    nt.links.new(ln.outputs["Value"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], pv.inputs["Density"])
    nt.links.new(pv.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    ob = sk.box("cone_haze", size, tuple(c), m)
    ob.visible_shadow = False
    return ob


def set_lamp(beat, mark=None):
    """Put the lamp on its mark for the beat (or on `mark`, a camera's own (x, y, turn)) at the beat's level."""
    x, y, t = mark or LAMP.get(beat, LAMP["spread"])
    fr = Matrix.Translation((x, y, TOP)) @ Matrix.Rotation(math.radians(t), 4, "Z")
    h = _STATE["lamp"]
    h.location = (x, y, TOP)
    h.rotation_euler = (0, 0, math.radians(t))
    k = LAMP_LEVEL.get(beat, 1.0)
    for o, local in _STATE["lamp_parts"]:
        o.matrix_world = fr @ local
        if o.type == "LIGHT":
            o.data.energy = o.get("energy0", o.data.energy) * k
            if o.data.type == "SPOT":
                deg, blend = SPOT.get(beat, SPOT["spread"])
                o.data.spot_size, o.data.spot_blend = math.radians(deg), blend
    rb = _STATE.get("bounce")
    if rb is not None:
        rb.data.energy = BOUNCE.get(beat, 1.6)
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

    up = Vector((b, 0.0, 1.0)).normalized()
    nrm = Vector((-1.0, 0.0, b)).normalized()
    zbot = 0.03
    base = Vector((xs(zbot), 0.0, zbot))

    def dev(y, sd):
        """How far the lid's face stands proud of the fitted plane at (y, distance up the lid); None off the lid."""
        r = tree.ray_cast(base + up * sd + Vector((0.0, y, 0.0)) + nrm * 0.05, -nrm, 0.1)
        return None if r[0] is None else 0.05 - r[3]

    def edge(y, sd, dy, dsd):
        """Walk from (y, sd) until the raised bezel (or the lid's edge) is reached."""
        while True:
            d = dev(y + dy, sd + dsd)
            if d is None or d > 0.0025 or abs(y) > 0.3 or sd > 0.4 or sd < -0.05:
                return y, sd
            y, sd = y + dy, sd + dsd
    # the display is recessed inside a raised bezel: measure the recess and inset the glowing panel 3 mm in it
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
    print(f"EVIDENCE laptop lid {len(hits)} hits, slope {b:.3f}; recess y {ymin:.3f}..{ymax:.3f}, up {s_bot:.3f}..{s_top:.3f}; "
          f"panel {w:.3f} x {hh:.3f}, {proud * 1000:.1f} mm proud", flush=True)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5, matrix=Matrix.Diagonal((w, hh, 1, 1)))
    scr = mesh_obj("laptop_screen", bm, mt.screen("laptop screen", COOL, 1.5, w, hh), smooth=False)
    scr.matrix_world = Matrix.Translation(centre) @ rot.to_4x4()
    # the screen's spill: an area light the size of the panel, 2 cm in front of it, so a cool pool about 30 cm deep
    # falls on the table and the mug's side
    li = sk.area_light("laptop_screen_light", tuple(centre + nrm * 0.02), (w, hh), 2.6, COOL, spread_deg=150)
    li.matrix_world = Matrix.Translation(centre + nrm * 0.02) @ (rot @ Matrix.Rotation(math.pi, 3, "X")).to_4x4()
    li.visible_camera = False
    li.visible_glossy = False
    li.visible_shadow = False
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


def retouch(holder, box, dx, feather=8):
    """Paint a small patch of a generated prop's textures over with the same-sized patch dx pixels to its right
    (colour, roughness and normal maps alike), feathered: used to take the tote's oval maker's plate off its front
    (no badges or brands in the film)."""
    import numpy as np
    x0, y0, x1, y1 = box
    done = set()
    for o in [c for c in holder.children_recursive if c.type == "MESH"]:
        for slot in o.material_slots:
            for n in slot.material.node_tree.nodes if slot.material else ():
                if n.type != "TEX_IMAGE" or not n.image or n.image.name in done:
                    continue
                img = n.image
                done.add(img.name)
                W, H = img.size
                a = np.empty(W * H * img.channels, np.float32)
                img.pixels.foreach_get(a)
                a = a.reshape(H, W, img.channels)
                src = a[y0:y1, x0 + dx:x1 + dx].copy()
                ry = np.minimum(np.arange(y1 - y0), np.arange(y1 - y0)[::-1])
                rx = np.minimum(np.arange(x1 - x0), np.arange(x1 - x0)[::-1])
                wgt = np.clip(np.minimum.outer(ry, rx) / feather, 0.0, 1.0)[..., None]
                a[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1.0 - wgt) + src * wgt
                img.pixels.foreach_set(a.ravel())
                img.update()
                print(f"EVIDENCE retouched {img.name} ({n.label}) at {box}", flush=True)


def flatten_patch(holder, centre, radius, iters=12, fac=0.6):
    """Smooth away a small modelled relief on a generated prop (the tote's oval maker's plate, which is geometry, not
    texture: 1-1.5 mm bumps on a 5 mm mesh): vertices within `radius` metres of `centre` (mesh-local) are relaxed
    toward their neighbours along their normals only, so the surface flattens without the texture sliding."""
    o = next(c for c in holder.children_recursive if c.type == "MESH")
    bpy.context.view_layer.update()
    k = o.matrix_world.to_scale().x
    R = radius / k
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bm.normal_update()
    sel = []
    for v in bm.verts:
        d = (v.co - centre).length
        if d < R:
            sel.append((v, min(1.0, max(0.0, (R - d) / (0.4 * R)))))
    for _ in range(iters):
        new = []
        for v, w in sel:
            nb = [e.other_vert(v) for e in v.link_edges]
            if not nb:
                continue
            avg = sum((n.co for n in nb), Vector()) / len(nb)
            new.append((v, v.co + v.normal * ((avg - v.co).dot(v.normal) * fac * w)))
        for v, co in new:
            v.co = co
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()
    print(f"EVIDENCE flattened {len(sel)} vertices of {o.name[:24]} round the maker's plate", flush=True)


def bags():
    out = []
    for name, (x, y, t) in BAGS.items():
        size, axis, grade, fin = BAG_GRADE[name]
        # each bag sits 1 mm into the table: its base seats on the wood, so the contact shadow closes
        h = props.load(name, size=size, axis=axis, loc=(x, y, TOP - 0.001), turn_deg=t, **grade)
        meshes = [o for o in h.children_recursive if o.type == "MESH"]
        bpy.context.view_layer.update()
        to_m = meshes[0].matrix_world.to_scale().x if meshes else 1.0
        seen = set()
        for o in meshes:
            for slot in o.material_slots:
                if slot.material and slot.material.name not in seen:
                    seen.add(slot.material.name)
                    mt.tune_prop(slot.material, spec=fin.get("spec"), to_metres=to_m)
        if name == "handbag-tote":
            retouch(h, (445, 195, 545, 285), 100)
            flatten_patch(h, *TOTE_MARK)
        out += [h] + list(h.children_recursive)
    return out


def folder_stack():
    # a little smaller and lower than the file's (a dozen folders, not two dozen), and brought in so the whole stack
    # sits inside the overhead frame with dark wood above it
    h = props.load("file-folders", size=0.30, axis="long", loc=(-0.2, 0.29, TOP), turn_deg=4.0, sat=0.75, val=0.82, rough_add=0.1)
    h.scale.z *= 0.5
    bpy.context.view_layer.update()
    return [h] + list(h.children_recursive)


# ---------------------------------------------------------------- the spread

def spread():
    """Lay the evidence out bottom to top: each paper drops onto what is already there."""
    m = materials()
    group("stack", folder_stack())
    # the open folder, fold running front to back; its back panel (with the tab) on the lamp's side
    group("folder", pp.manila_folder("open_folder", m["manila"], -0.10, -0.015, 86.0))
    # two handled sheets, cockled (3-3.5 mm waves) and each with one corner lifted 1-1.3 cm, the lower one offset and
    # turned so both edges read
    group("folder", pp.sheet("sheet_b", m["paper2"], 0.21, 0.297, 0.036, 0.01, -4.0,
                             shape=pp.sheet_shape(0.21, 0.297, 7, corners=(0.0, 0.0, 0.010, 0.0), wave=0.003)))
    group("folder", pp.sheet("sheet_a", m["paper"], 0.21, 0.297, 0.010, -0.014, 2.5,
                             shape=pp.sheet_shape(0.21, 0.297, 3, corners=(0.0, 0.013, 0.0, 0.0), wave=0.0035)))
    group("folder", pp.paper_clip("clip_a", m["clip"], -0.093, 0.118, 96.0))
    group("folder", pp.boarding_pass("pass_1", m["card"], -0.212, 0.078, 3.0, seed=4, lift=0.003))
    group("folder", pp.boarding_pass("pass_2", m["card"], -0.226, 0.024, -8.0, seed=9, lift=0.009))
    # the passport across the passes' plain ends, clear of pass_2's bent stub
    group("passport", pp.passport("passport", m["cover"], m["pages"], -0.252, -0.06, 17.0, m_end=m["endpaper"]))
    group("letter", pp.sheet("letter", m["letter"], 0.21, 0.297, 0.31, -0.205, -14.0, shape="trifold"))
    group("letter", pp.pen("pen", m["pen"], m["chrome"], m["chrome"], 0.25, -0.29, 31.0))
    group("photos", pp.photo_print("photo_1", m["photo_1"], 0.152, 0.102, 0.265, 0.095, 12.0, seed=2))
    group("photos", pp.photo_print("photo_2", m["photo_2"], 0.127, 0.178, 0.372, 0.045, -8.0, curl=0.003, seed=5))
    group("photos", pp.photo_print("photo_3", m["photo_3"], 0.152, 0.102, 0.205, 0.205, -5.0, curl=0.0022, seed=8))
    group("envelope", pp.envelope("envelope", m["cream"], -0.43, -0.285, 7.0))
    # the till receipt on bare wood at the pool's right edge, its rolled end at the far side
    # (lying across the light, its roll at the far end: the lamp from the left throws the tube's shadow onto the wood)
    group("receipt", pp.receipt("receipt", m["thermal"], 0.6, -0.035, -100.0, seed=5))
    group("highlighter", pp.highlighter("highlighter", m["hl_body"], m["hl_cap"], 0.075, -0.262, -9.0))
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
                    if gname in hidden or gname in heroes or gname in CAMERA_ONLY:
                        continue
                    for o in obs:
                        ob = box([o])
                        if hb and ob and ob[0] < hb[2] and ob[2] > hb[0] and ob[1] < hb[3] and ob[3] > hb[1]:
                            print(f"EVIDENCE overlap {beat}: {ho.name} x {gname}/{o.name}", flush=True)


# ---------------------------------------------------------------- beats and cameras

def set_beat(beat, extra=(), show=(), lamp_mark=None):
    hidden = set(HIDE.get(beat, ())) | set(extra) | (set(CAMERA_ONLY) - set(show))
    for gname, obs in G.items():
        for o in obs:
            o.hide_render = gname in hidden
    set_lamp(beat, lamp_mark)


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
    set_beat(beat, cfg.get("hide", ()), cfg.get("show", ()), cfg.get("lamp"))
    sc = bpy.context.scene
    sc.cycles.sample_clamp_indirect = 6.0
    sc.cycles.blur_glossy = 0.5
    sc.cycles.max_bounces = 8
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    print(f"EVIDENCE camera {name or '?'}: beat {beat}, hidden {sorted(set(HIDE.get(beat, ())) | set(cfg.get('hide', ())))}", flush=True)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def room_bounce(power=1.6):
    """The lamp's own light coming back off a dark ceiling: a broad, very weak warm panel high over the table that
    only diffuse rays see (no camera, no reflections), about 2 % of the pool. Without it nothing lights the top of
    the lamp or the table beyond the pool and they vanish into a void; with it they are deep but readable shadow.
    Its level is set per beat (BOUNCE): lowest for the spread, so the outer papers fall well under the pool."""
    li = sk.area_light("room_bounce", (0.0, 0.05, TOP + 1.6), (2.4, 1.6), power, (0.95, 0.87, 0.76), spread_deg=170)
    li.visible_camera = False
    li.visible_glossy = False
    li.visible_transmission = False
    li.visible_volume_scatter = False
    _STATE["bounce"] = li
    return li


def room():
    """The room the table stands in, never lit by anything but the lamp's bounce: three walls of old dark plaster
    (back, left and right, about a metre and a half off the table) up to a 2.7 m ceiling height, so the low shots
    have a far plane falling off in deep shadow instead of a void. Built in world coordinates (the plaster darkens
    toward the floor)."""
    m = materials()
    H = 2.7
    walls = (((-2.0, 1.35), (2.0, 1.35)), ((-1.9, -2.0), (-1.9, 1.35)), ((1.9, 1.35), (1.9, -2.0)))
    bm = bmesh.new()
    for (x0, y0), (x1, y1) in walls:
        vs = [bm.verts.new(p) for p in ((x0, y0, 0.0), (x1, y1, 0.0), (x1, y1, H), (x0, y0, H))]
        bm.faces.new(vs)
    ob = mesh_obj("room_walls", bm, m["wall"], smooth=False)
    so = ob.modifiers.new("t", "SOLIDIFY")
    so.thickness = 0.1
    return ob


def passport_net(t0=-0.01, t1=0.045, level=0.6, h=0.2):
    """A graduated net in the lamp's beam for the passport close-up (as a gaffer would rig one): a plane 20 cm over
    the table that only shadow rays see, clear on the passport's side and cutting up to `level` of the light beyond
    it, the ramp landing between table y = t0 and t1, so the boarding passes fall under the passport's lit edge
    while the passport keeps the full pool. Placed for the passport camera's own lamp mark."""
    cfg = CAMERAS["passport"]
    set_lamp(cfg["beat"], cfg.get("lamp"))
    bulb = bpy.data.objects["lamp_glow"].matrix_world.translation
    bz = bulb.z - TOP
    k = h / bz

    def net_y(ty):                   # where the shadow ray from table point (., ty) crosses the net plane
        return ty + k * (bulb.y - ty)
    y0, y1 = net_y(t0), net_y(t1)
    m = bpy.data.materials.new("passport net")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    df = nt.nodes.new("ShaderNodeBsdfDiffuse")
    df.inputs["Color"].default_value = (0.0, 0.0, 0.0, 1)
    mx = nt.nodes.new("ShaderNodeMixShader")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sp = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sp.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.interpolation_type = "SMOOTHSTEP"
    mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = y0, y1
    mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = 0.0, level
    nt.links.new(sp.outputs["Y"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], mx.inputs["Fac"])
    nt.links.new(tr.outputs[0], mx.inputs[1])
    nt.links.new(df.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    bm = bmesh.new()
    for p in ((-0.75, y0 - 0.1, 0.0), (0.2, y0 - 0.1, 0.0), (0.2, 0.45, 0.0), (-0.75, 0.45, 0.0)):
        bm.verts.new(p)
    bm.faces.new(bm.verts[:])
    ob = mesh_obj("net_passport", bm, m, smooth=False)
    ob.location = (0.0, 0.0, TOP + h)          # object space y = world y, so the ramp lands where computed
    for attr in ("visible_camera", "visible_diffuse", "visible_glossy", "visible_transmission", "visible_volume_scatter"):
        setattr(ob, attr, False)
    print(f"EVIDENCE passport net: ramp y {y0:.3f}..{y1:.3f} at {h:.2f} m (table y {t0:.3f}..{t1:.3f})", flush=True)
    return ob


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
    # Ch 04: the rolled receipt on the wood in front of the bags, its roll toward the lamp, seen nearly end on
    # Ch 04's receipt, and Ch 02 (night, the email): the documents are put away; the passport and the two boarding
    # passes lie on the bare wood in front of the laptop, in the turned-down lamp's pool and the screen's cool spill.
    # These rest on the table only (the spread's papers, hidden for these beats, leave the support while they drop)
    keep = list(pp.SUPPORT)
    pp.SUPPORT[:] = [o for o in keep if o.name in ("table_top",)]
    group("receipt_c4", pp.receipt("receipt_c4", M["thermal"], *RECEIPT_C4, seed=12))
    pp.SUPPORT[:] = [o for o in keep if o.name in ("table_top",)]
    group("passes_c2", pp.boarding_pass("pass_c2a", M["card"], 0.165, -0.012, 11.0, seed=21, lift=0.003))
    group("passes_c2", pp.boarding_pass("pass_c2b", M["card"], 0.19, -0.05, -7.0, seed=23, lift=0.008))
    group("passport_c2", pp.passport("passport_c2", M["cover"], M["pages"], 0.21, 0.06, -28.0, m_end=M["endpaper"]))
    pp.SUPPORT[:] = keep + [o for o in pp.SUPPORT if o not in keep]
    # lamp-lit air: a faint haze over the table only, so the cone has a shape in the low shots (denser under the
    # shade: cone_haze, built with the lamp)
    hz = sk.haze((2.6, 1.6, 1.0), (0.0, 0.0, TOP + 0.5), 0.013, colour=(0.9, 0.88, 0.85))
    hz.visible_shadow = False
    room_bounce()
    room()
    group("net_passport", passport_net())
    pport = bpy.data.objects["passport_front"]
    bpy.context.view_layer.update()
    pc = pport.matrix_world @ Vector((0.01, 0.0, 0.0052))
    empty("fx_passport", tuple(pc))
    empty("fx_overhead", (-0.07, 0.0, TOP + 0.01))
    # the push focuses on sheet_a's lifted corner (+x -y, nearest the camera), a little in from its tip, so the sharp
    # plane shows the paper's thickness
    sha = bpy.data.objects["sheet_a"]
    dg = bpy.context.evaluated_depsgraph_get()
    me = sha.evaluated_get(dg).to_mesh()
    tip = max(me.vertices, key=lambda v: v.co.x - v.co.y)
    corner = sha.matrix_world @ (tip.co + Vector((-0.012, 0.012, 0.0)))
    sha.evaluated_get(dg).to_mesh_clear()
    empty("fx_push", tuple(corner))
    rc = bpy.data.objects["receipt_c4"]
    empty("fx_purses", tuple(rc.matrix_world @ Vector((0.0, 0.0, 0.004))))
    overlap_report()
    set_beat("spread")
    install_hook()
