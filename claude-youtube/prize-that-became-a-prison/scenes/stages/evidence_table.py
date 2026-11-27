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
import tempfile
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view
from props import surface_bvh as world_bvh  # noqa: E402

import props  # noqa: E402
import setkit as sk  # noqa: E402
import evidence_table_art as art  # noqa: E402
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
LAMP = {"spread": (-0.48, 0.12, -111.0), "ch02": (-0.55, 0.16, -83.0), "ch04": (-0.84, -0.38, -70.0)}
LAMP_LEVEL = {"ch02": 0.25, "ch04": 2.2, "plate": 1.48}   # Ch 02 is night at the laptop: the lamp turned down so the screen leads
# the reflector's cone per beat (full angle, blend): a pool with a soft edge, not a flood. Ch 04 opens it a little so
# the cone still reaches the tote at the far end of the row (the lamp cannot come nearer without entering the frame)
SPOT = {"spread": (72.0, 0.70), "ch02": (75.0, 0.55), "ch04": (90.0, 0.55)}
BOUNCE = {"spread": 3.6, "ch02": 1.0, "ch04": 2.4}   # the lamp's light back off the ceiling (see room_bounce)

# what each beat hides (groups are filled at build); groups in CAMERA_ONLY are hidden unless a camera shows them
HIDE = {
    "spread": ("laptop", "bags", "receipt_c4", "passport_c2", "passes_c2"),
    "ch02": ("bags", "receipt_c4", "photos", "receipt", "passport", "folder", "letter"),
    "ch04": ("laptop", "folder", "highlighter", "passport", "passport_c2", "passes_c2", "letter", "photos", "receipt", "stack"),
}
DOCUMENT_PROPS = ("laptop", "bags", "receipt_c4", "passport_c2", "passes_c2", "photos", "receipt",
                  "passport", "folder", "letter", "envelope", "highlighter", "stack", "mug")
HIDE["document"] = HIDE["plate"] = DOCUMENT_PROPS
CAMERA_ONLY = ("net_passport", "cover light", "chair", "page sheet", "pair sheets", "page pen", "document tools", "page marker", "screen spill", "entry stationery", "art materials", "open booklet", "booklet on wood")

LAPTOP = (0.40, 0.30, 60.0)      # base centre and turn: the screen faces (-cos t, -sin t), toward the front
# Ch 04: the rolled receipt in front of the tote, in the pool's falloff so it is not the brightest thing in frame
# (x, y, turn: the roll at its left end, seen nearly end on)
RECEIPT_C4 = (0.14, -0.33, 73.0)
# the purses for Ch 04: a staggered row lit from the lamp on the left; the darkest (burgundy) nearest the lamp, the
# cognac tote farthest. Turns put each bag's clean front toward the camera at the front left.
BAGS = {"handbag-shoulder": (-0.375, 0.195, 162.0), "handbag-satchel": (-0.06, 0.02, 153.0), "handbag-tote": (0.255, -0.155, 145.0)}
BAG_GRADE = {  # from the inspection room: size, axis, grade, finish. Hue and saturation are pushed so the tote still
    # reads cognac (and the shoulder bag burgundy) after the film grade cools and desaturates them
    "handbag-tote": (0.35, "long", dict(sat=1.0, val=0.84, hue=0.50, rough_add=0.2), dict(spec=0.4)),
    "handbag-satchel": (0.30, "long", dict(sat=0.8, rough_add=0.12), dict()),
    "handbag-shoulder": (0.32, "long", dict(sat=0.8, val=0.55, rough_add=0.25), dict(spec=0.35)),
}

CAMERAS = {
    # the whole spread from straight above (long lens, high: a flat, graphic plan): the lamp reaching in from the
    # left, its pool across the open folder, the edges of the spread falling into the dark
    "overhead": dict(loc=(0.03, 0.02, TOP + 3.6), aim=(0.03, 0.024, TOP), lens=75, focus="fx_overhead", fstop=11.0,
                     beat="spread", exposure=-1.3),
    # low across the table toward the lamp: the top sheet's lifted corner sharp in the foreground, the spread going
    # soft, the whole lamp beyond (base, arm and glowing head) with its cone in the air. The lamp is turned 20 degrees
    # off the lens for this set-up (a cheat between cuts), so its head reads in three-quarter view, the shade's outside
    # and the reflector both, and the cone crosses the frame instead of pointing down the lens
    "push": dict(loc=(0.69, -0.45, TOP + 0.095), aim=(-0.375, 0.241, TOP + 0.145), lens=28, focus="fx_push", fstop=2.2,
                 beat="spread", hide=("receipt", "letter", "envelope", "highlighter"), exposure=-0.85, lamp=(-0.475, 0.315, -141.0)),
    # Ch 02: the laptop open at the back of the table, its blank screen glowing, the passport and the boarding passes
    # in front of it under the lamp turned down; dark wood in the foreground
    "laptop": dict(loc=(-0.31, -0.53, TOP + 0.19), aim=(0.26, 0.22, TOP + 0.075), lens=32, focus="fx_laptop", fstop=4.0,
                   beat="ch02", show=("chair",), hide=("envelope", "highlighter"), exposure=-1.3),
    # Ch 04: the three handbags in the lamp's light, the receipt curling in front of them
    "purses": dict(loc=(-0.62, -1.10, TOP + 0.48), aim=(-0.05, 0.02, TOP + 0.13), lens=35, focus="fx_tote_edge", fstop=4.0,
                   beat="ch04", hide=("envelope",), exposure=-1.0, final_res=(2560, 1440)),
    # controlled close-up: the passport lying across the two boarding passes on the folder, its cover sprung open.
    # For this insert the lamp is cheated to the passport's front left: the cover's sheen then reflects away from the
    # lens (from behind, it greyed the whole navy cover), the cream page edge facing the camera catches the light, and
    # the passes behind fall under it, helped by a graduated net off the lamp
    "passport": dict(loc=(-0.102, -0.41, TOP + 0.27), aim=(-0.252, -0.056, TOP + 0.010), lens=64, focus="fx_passport", fstop=4.8,
                     beat="spread", show=("net_passport", "cover light"), hide=("envelope",), lamp=(-0.81, -0.36, -64.0)),
    "page": dict(loc=(0.05, -0.47, TOP + 0.785), aim=(0.05, -0.012, TOP), lens=50,
                 focus="fx_page", fstop=5.6, beat="plate", show=("page sheet", "page pen", "page marker"),
                 lamp=(-0.35, 0.20, -123.0), exposure=-1.18, final_res=(2560, 1440)),
    "pair": dict(loc=(0.07, -0.508, TOP + 0.82), aim=(0.05, -0.008, TOP), lens=54,
                 focus="fx_page", fstop=6.3, beat="plate", show=("pair sheets", "document tools"),
                 lamp=(-0.35, 0.20, -122.0), spot=(88.0, 0.60), exposure=-1.22, final_res=(2560, 1440)),
    "screen": dict(loc=(0.025, -0.22, TOP + 0.26), aim=(0.43, 0.37, TOP + 0.110), lens=50,
                   focus="fx_screen", fstop=2.2, beat="ch02", show=("screen spill",), hide=("passport_c2", "passes_c2", "envelope", "highlighter", "stack"),
                   exposure=-1.6, final_res=(2560, 1440)),

}

CAMERAS["page_foot"] = dict(CAMERAS["page"], loc=(0.03, -0.306, TOP + 0.346), aim=(0.03, -0.105, TOP),
                           focus="fx_page_foot", fstop=8.0, show=("page sheet",))
CAMERAS["laptop_before"] = dict(CAMERAS["laptop"],
                               hide=CAMERAS["laptop"]["hide"] + ("passes_c2", "passport_c2"),
                               show=CAMERAS["laptop"]["show"] + ("booklet on wood",))
CAMERAS["tickets"] = dict(loc=(0.026, -0.405, TOP + 0.310), aim=(0.177, 0.017, TOP), lens=50,
                         focus="fx_tickets", fstop=6.3, beat="tickets", exposure=-1.6,
                         hide=("laptop", "envelope", "highlighter", "stack", "mug"), lamp=(-0.41, -0.28, -68))
CAMERAS["entries"] = dict(loc=(-0.085, -0.65, TOP + 0.48), aim=(-0.025, 0.032, TOP + 0.022), lens=42,
                         focus="fx_entries", fstop=4.8, beat="entries", exposure=-1.60,
                         show=("entry stationery",), lamp=(-0.45, 0.18, -117))
CAMERAS["motifs"] = dict(loc=(0.11, -0.62, TOP + 0.44), aim=(-0.015, -0.002, TOP + 0.006), lens=54,
                        focus="fx_entries", fstop=4, beat="document", show=("art materials",),
                        lamp=(-0.42, 0.16, -120), exposure=-1.5)
CAMERAS["seam"] = dict(loc=(0.012, -0.47, TOP + 0.34), aim=(0.22, -0.19, TOP + 0.248), lens=63,
                      focus="fx_tote_edge", fstop=4.5, beat="ch04", exposure=-1.50, hide=("receipt_c4", "mug"),
                      lamp=(-0.32, -0.43, -73))
CAMERAS["visa"] = dict(loc=(0.105, -0.29, TOP + 0.30), aim=(-0.028, 0.002, TOP + 0.018), lens=69,
                      focus="fx_open_booklet", fstop=6.3, beat="document", show=("open booklet",),
                      lamp=(-0.44, -0.17, -74), exposure=-1.45)
HIDE["tickets"] = HIDE["ch02"]
HIDE["entries"] = tuple(g for g in DOCUMENT_PROPS if g != "mug")


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
        wood=mt.worn_wood("table wood", TW / 4, -TW / 2, rings=((0.585, -0.33, 0.041), (-0.42, 0.43, 0.04)),
                          front_y=-TW / 2),
        leg=mt.worn_wood("table leg wood", 0.08, -0.04, rough=0.5),
        floor=mt.matte("floor", (0.018, 0.017, 0.016), 0.7),
        wall=mt.plaster("wall plaster"),
        paper=mt.paper("paper", (0.74, 0.71, 0.64), 0.86, 0.05, 0.04, translucency=0.24, edge_tone=(0.21, 0.297)),
        plate_paper=mt.paper("plate paper", (0.91, 0.70, 0.43), 0.88, fibre=0.02, smudge=0.0, translucency=0.10),
        plate_wood=mt.worn_wood("document plate wood", TW / 4, -TW / 2, rough=0.63,
                                rings=((0.585, -0.33, 0.041), (-0.42, 0.43, 0.04)), front_y=-TW / 2, scratches=0.15, ring_contrast=0.38, pore_contrast=0.62),
        paper2=mt.paper("paper 2", (0.71, 0.69, 0.63), 0.86, 0.05, 0.06, edge_tone=(0.21, 0.297)),
        letter=mt.paper("letter paper", (0.73, 0.7, 0.62), 0.85, 0.05, 0.05, edge_tone=(0.21, 0.297)),
        cream=mt.paper("envelope paper", (0.68, 0.62, 0.5), 0.82, 0.06, 0.05),
        manila=mt.manila("manila"),
        card=mt.boarding_card("boarding card", 0.203, 0.082, 0.0545),
        thermal=mt.thermal("thermal paper"),
        # three blank prints of different tones (the pictures are composited later): a mid print darkening toward one
        # end, a near-black one, a cooler one
        photo_1=mt.photo("print 6x4 mid", 0.152, 0.102, 0.003, image_rgb=(0.36, 0.32, 0.26), gradient=0.35),
        photo_2=mt.photo("print 5x7 dark", 0.127, 0.178, 0.003, image_rgb=(0.13, 0.135, 0.14)),
        photo_3=mt.photo("print 6x4 cool", 0.152, 0.102, 0.003, image_rgb=(0.21, 0.22, 0.24)),
        cover=mt.passport_cover("passport cover", (0.010, 0.016, 0.045)),
        pages=mt.page_block("passport pages"),
        endpaper=mt.endpaper("passport lining"),
        pen=mt.plastic("pen plastic", (0.012, 0.012, 0.014), 0.38, 0.5),
        chrome=mt.satin_metal("pen metal", (0.62, 0.62, 0.6), 0.25),
        clip=mt.satin_metal("clip wire", (0.6, 0.61, 0.62), 0.22),
        hl_body=mt.plastic("highlighter body", (0.46, 0.4, 0.04), 0.4, 0.5),
        hl_cap=mt.plastic("highlighter cap", (0.36, 0.3, 0.02), 0.35, 0.5),
        glaze=mt.glaze("mug glaze", (0.14, 0.15, 0.16)),
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
        joint = (-0.48, 0.54, -0.60, 0.69)[i]
        for x0, x1 in ((-TL / 2, joint - gap / 2), (joint + gap / 2, TL / 2)):
            add_box(bm, (x1 - x0, pw - gap, TT), ((x0 + x1) / 2, y, 0.0))
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
    h = props.load("desk-lamp", size=0.55, axis="z", loc=(0, 0, 0), turn_deg=0, sat=0.45, val=0.22, rough_add=0.0)
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
    li.shadow_soft_size = 0.026
    spot = bpy.data.objects.new("lamp_spot", li)
    bpy.context.scene.collection.objects.link(spot)
    spot.matrix_world = Matrix.Translation(BULB) @ AXIS.to_track_quat("-Z", "Y").to_matrix().to_4x4()
    parts.append(spot)
    pl = bpy.data.lights.new("lamp_glow", "POINT")
    pl.energy, pl.color, pl.shadow_soft_size = 0.26, WARM, 0.012
    glow = bpy.data.objects.new("lamp_glow", pl)
    bpy.context.scene.collection.objects.link(glow)
    glow.location = BULB - AXIS * 0.004
    parts.append(glow)
    # a small warm rim from behind and above the head that only the lamp itself sees (light linking): the shade's
    # outer edge and the arm get a thin highlight against the dark, and from above the shade reads as a shape
    # (0.3 m square, well above and a little behind: from overhead it lays a sheen across the shade's back, from the
    # low push it rims the shade's top edge and the arm)
    rim_at = Vector((0.0, BULB.y - 0.13, BULB.z + 0.18))
    rim = sk.area_light("lamp_rim", tuple(rim_at), (0.10, 0.10), 0.8, (1.0, 0.86, 0.7), spread_deg=120)
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
    arm_at = Vector((-0.24, -0.18, 0.43))
    arm = sk.area_light("lamp arm edge", tuple(arm_at), (0.12, 0.34), 2.8, WARM)
    arm.rotation_euler = (Vector((0, -0.03, 0.21)) - arm_at).to_track_quat("-Z", "Y").to_euler()
    arm.visible_volume_scatter = False
    arm.light_linking.receiver_collection = recv
    bpy.context.view_layer.update()
    parts.extend((arm, cone_haze(density=0.055)))
    bpy.context.view_layer.update()
    for o in (spot, glow, rim, arm):
        o["energy0"] = o.data.energy
    _STATE["lamp"] = h
    _STATE["lamp_meshes"] = [ob for ob in h.children_recursive if ob.type == "MESH" and not ob.hide_render]
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

def laptop():
    """The laptop prop open at the back of the table, its screen switched on to a blank page: a glowing panel inset
    in the lid's bezel and a weak area light in front of it, so the glow falls on what is near."""
    m = materials()
    h = props.load("laptop", size=0.36, axis="long", loc=(0, 0, 0), turn_deg=0, sat=0.45, val=0.8, rough_add=0.45)
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
    scr = mesh_obj("laptop_screen", bm, mt.screen("laptop screen", COOL, 3.2, w, hh), smooth=False)
    scr.matrix_world = Matrix.Translation(centre) @ rot.to_4x4()
    # A narrow matte bezel covers the uneven strip between the generated lid and the flat LCD.
    gasket = mt.matte("LCD bezel", (0.011, 0.012, 0.013), 0.83)
    gasket.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.14
    liner = sk.box("LCD inner bezel", (w + 0.011, hh + 0.010, 0.0003), (0, 0, 0), gasket)
    liner.matrix_world = Matrix.Translation(centre - nrm * 0.00032) @ rot.to_4x4()
    # The generated chin bows out beyond the inner gasket. Fit a blank strip
    # in front of its highest point without moving the active display.
    chin_y = s0 - 0.012
    chin_height = 0.020
    chin_depths = [dev(w * (i / 80 - 0.5), chin_y + chin_height * (j / 6 - 0.5))
                   for i in range(81) for j in range(7)]
    chin_proud = max(d for d in chin_depths if d is not None)
    chin = sk.box("plain laptop lid chin", (w + 0.011, chin_height, 0.0004), (0, 0, 0), gasket, bevel=0.00015)
    chin.matrix_world = Matrix.Translation(base + up * chin_y + nrm * (chin_proud + 0.0005)) @ rot.to_4x4()
    group("screen spill", liner)
    # the screen's spill: an area light the size of the panel, 2 cm in front of it, so a cool pool about 30 cm deep
    # falls on the table and the mug's side
    li = sk.area_light("laptop_screen_light", tuple(centre + nrm * 0.02), (w, hh), 22.0, COOL, spread_deg=150)
    li.matrix_world = Matrix.Translation(centre + nrm * 0.02) @ (rot @ Matrix.Rotation(math.pi, 3, "X")).to_4x4()
    li.visible_camera = False
    li.visible_glossy = False
    li.visible_shadow = False
    fx = bpy.data.objects.new("fx_laptop", None)
    bpy.context.scene.collection.objects.link(fx)
    fx.matrix_world = Matrix.Translation(centre)
    # The generated key deck has pale shapes on the keycaps. Fit an unlettered
    # insert over the measured deck (23 mm above the slab) for the screen close-up.
    surround = mt.plastic("keyboard surround", (0.019, 0.021, 0.023), 0.65, spec=0.24)
    deck = sk.box("laptop key well", (0.132, 0.325, 0.004), (-0.009, 0, 0.025), surround, bevel=0.0015)
    deck_back = 0.057
    lid_foot = xs(zbot) - 0.002
    hinge = sk.box("laptop hinge cover", (lid_foot - deck_back, 0.325, 0.004),
                   ((lid_foot + deck_back) / 2, 0, 0.0252), surround, bevel=0.0015)
    bm = bmesh.new()
    rows = ((1,) * 14, (1.4,) + (1,) * 12 + (1.4,), (1.65,) + (1,) * 11 + (1.95,),
            (2,) + (1,) * 10 + (2.5,), (1.4, 1.3, 1.3, 5.9, 1.3, 1.3, 1.4))
    for row, units in enumerate(rows):
        pitch = 0.308 / sum(units)
        y0 = -0.154
        for unit in units:
            span = unit * pitch
            add_box(bm, (0.017, span - 0.0023, 0.0023), (0.035 - row * 0.022, y0 + span / 2, 0.0285))
            y0 += span
    keys = bevelled(mesh_obj("laptop blank keys", bm, mt.plastic("blank laptop caps", (0.023, 0.025, 0.027), 0.77, spec=0.18, scuff=0.05)),
                    0.0008, 2)
    x, y, t = LAPTOP
    place = Matrix.Translation((x, y, TOP)) @ Matrix.Rotation(math.radians(t), 4, "Z")
    for o in (scr, li, fx, deck, keys, liner, hinge, chin):
        o.matrix_world = place @ o.matrix_world
    h.location = (x, y, TOP)
    h.rotation_euler = (0, 0, math.radians(t))
    return [h] + list(h.children_recursive) + [scr, li, deck, keys, hinge, chin]


def tote_topstitch(holder):
    """The line of saddle stitching just under the front lip, interrupted by the handle tabs."""
    surface = world_bvh(holder)
    base = holder.matrix_world.translation
    rotation = holder.matrix_world.to_quaternion()
    front = rotation @ Vector((0, 1, 0))
    yarn = bpy.data.curves.new("tote hem stitching", "CURVE")
    yarn.dimensions = "3D"
    yarn.bevel_depth = 0.00032
    yarn.bevel_resolution = 2
    yarn.materials.append(sk.mat("tobacco saddle thread", (0.13, 0.066, 0.024), 0.84))
    for i in range(69):
        centre = (i - 34) * 0.00435
        points = []
        for offset in (-0.00155, 0.0, 0.00155):
            x = centre + offset
            z = 0.246 + 0.008 * (abs(x) / 0.15) ** 1.3
            pos, normal, _, _ = surface.ray_cast(base + rotation @ Vector((x, 0.15, z)), -front)
            # The raised handle tabs cover the hem. Never project thread onto a tab.
            if pos is None or (pos - base).dot(front) > 0.054:
                break
            points.append(pos + normal * (0.00015 if offset == 0 else -0.00010))
        if len(points) == 3:
            stitch = yarn.splines.new("POLY")
            stitch.points.add(2)
            for point, pos, radius in zip(stitch.points, points, (0.5, 1.0, 0.5)):
                point.co = (*pos, 1)
                point.radius = radius
    ob = bpy.data.objects.new("tote front hem", yarn)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = holder
    ob.matrix_parent_inverse = holder.matrix_world.inverted()


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
            tote_topstitch(h)
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

def reading_glasses():
    """A folded wire pair beside the letter, resting on its temples and nose pads."""
    centre = (0.477, -0.240)
    transform = pp.frame(*centre, -18)
    z, _, _ = pp.settle(transform, [(-0.056, -0.016), (0.056, -0.016), (0, 0.016)])
    transform = pp.frame(*centre, -18, z)
    rim = mt.satin_metal("spectacle wire", (0.16, 0.13, 0.09), 0.42)
    acetate = mt.plastic("glasses temple tips", (0.040, 0.025, 0.019), 0.52, 0.22)
    parts = []

    def wire(name, pts, radius, mat=rim, closed=False):
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
            x = side * 0.030 + 0.0245 * math.cos(a)
            y = 0.0175 * math.sin(a)
            contour.append((x, y, 0.0065 + 0.10 * y))
        wire("lens rim", contour, 0.00085, closed=True)
        wire("folded spectacle temple", [(side * 0.055, 0.007, 0.007),
                                        (side * 0.055, 0.014, 0.0024), (-side * 0.031, 0.013, 0.0024)], 0.0009)
        wire("spectacle temple tip", [(-side*0.030, 0.013, 0.0024), (-side*0.046, 0.009, 0.002),
                                     (-side*0.051, 0.004, 0.0018)], 0.00145, acetate)
    wire("spectacle bridge", [(-0.007, 0.006, 0.007), (-0.003, 0.011, 0.009),
                              (0.003, 0.011, 0.009), (0.007, 0.006, 0.007)], 0.00095)
    return parts


def pulled_chair():
    """A plain oak chair pulled back from the far side, just visible beyond the laptop work surface."""
    parts = []
    wood = materials()["leg"]
    for x in (-0.43, -0.065):
        parts.append(sk.box("chair rear post", (0.030, 0.031, 0.85), (x, 0.76, 0.425), wood, bevel=0.004))
        parts.append(sk.box("chair front leg", (0.028, 0.028, 0.43), (x, 0.39, 0.215), wood, bevel=0.004))
    parts.append(sk.box("chair seat", (0.40, 0.42, 0.032), (-0.248, 0.58, 0.445), wood, bevel=0.009))
    parts.append(sk.box("chair top rail", (0.40, 0.030, 0.080), (-0.248, 0.76, 0.813), wood, bevel=0.009))
    return parts


def document_plates():
    """Flat blank sheets on bare wood so artwork can be corner-pinned without distortion."""
    m = materials()
    keep = list(pp.SUPPORT)
    wood = [o for o in keep if o.name == "table_top"]
    for group_name, name, x, y, turn in (("page sheet", "document_single", 0.05, 0, -18),
                                          ("pair sheets", "document_left", -0.064, 0.004, 1.8),
                                          ("pair sheets", "document_right", 0.165, -0.005, -1.5)):
        # A flat A4 spans the narrow board joints instead of conforming to their bevels.
        pp.SUPPORT.clear()
        sheet = pp.sheet(name, m["plate_paper"], 0.210, 0.297, x, y, turn, step=0.014, stiff=0)
        if group_name == "pair sheets":
            sheet.location.z += 0.00025
        sheet.pass_index = 1
        for face in sheet.data.polygons:
            face.use_smooth = False
        group(group_name, sheet)
    pp.SUPPORT[:] = wood
    group("document tools", pp.pen("document_pen", m["pen"], m["chrome"], m["chrome"], -0.21, 0.02, 80))
    group("page pen", pp.pen("working_pen", m["pen"], m["chrome"], m["chrome"], -0.17, -0.08, 30))
    # A flat-ended pocket highlighter with a separate plug and a sprung cap clip.
    marker = mt.plastic("fluorescent yellow marker", (0.82, 0.95, 0.009), 0.6, spec=0.28)
    shader = marker.node_tree.nodes["Principled BSDF"]
    shader.inputs["Emission Color"].default_value = (0.78, 0.94, 0.002, 1.0)
    shader.inputs["Emission Strength"].default_value = 0.12
    cap = mt.plastic("marker cap", (0.43, 0.55, 0.009), 0.56, spec=0.24)
    parts = []
    for label, size, loc, mat, bevel in (
            ("barrel", (0.083, 0.0155, 0.0115), (-0.011, 0, 0.0060), marker, 0.0032),
            ("tail plug", (0.002, 0.0147, 0.0107), (-0.0530, 0, 0.0060), cap, 0.0008),
            ("cap", (0.031, 0.0168, 0.0120), (0.0455, 0, 0.0060), cap, 0.0030),
            ("clip bridge", (0.0045, 0.0032, 0.0035), (0.056, 0, 0.0128), cap, 0.00075),
            ("pocket clip", (0.029, 0.0032, 0.0017), (0.044, 0, 0.0141), cap, 0.00065)):
        part = sk.box("document highlighter " + label, size, loc, mat, bevel=bevel)
        parts.append(part)
    root = empty("document highlighter", (0.22, -0.04, TOP))
    root.rotation_euler.z = math.radians(115)
    for part in parts:
        part.parent = root
    group("page marker", [root, *parts])
    pp.SUPPORT[:] = keep
    empty("fx_page", (0.05, -0.055, TOP + 0.0003))
    empty("fx_page_foot", (0.03, -0.105, TOP + 0.0003))


def entry_stationery():
    """Three partly overlapping, unlettered entry cards, two envelopes and the second cup."""
    m = materials()
    saved = list(pp.SUPPORT)
    wood = [o for o in saved if o.name == "table_top"]
    forms = []
    rule = mt.matte("entry card rules", (0.27, 0.25, 0.22), 0.90)
    for i, (x, y, angle) in enumerate(((-0.084, 0.035, 21), (-0.032, 0.010, 7), (0.018, -0.020, -7))):
        # Stiff cardstock bridges the boards and rests on the previous card.
        pp.SUPPORT.clear()
        name = f"entry card {i + 1}"
        card = pp.sheet(name, m["cream"], 0.152, 0.104, x, y, angle, thick=0.00034, step=0.025, stiff=0)
        card.location.z += i * 0.00038
        forms.append(card)
        bm = bmesh.new()
        # Printed rules and the four sides of each empty box share one coplanar ink mesh.
        def line(cx, cy, width, height):
            vs = [bm.verts.new((cx + dx * width, cy + dy * height, 0.00042))
                  for dx, dy in ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5))]
            bm.faces.new(vs)
        for yy, length in ((0.029, 0.113), (0.016, 0.122), (0.003, 0.091)):
            line(-0.061 + length / 2, yy, length, 0.00040)
        for cx in (-0.056, -0.023):
            cy, half, ink = -0.026, 0.0033, 0.00042
            for sign in (-1, 1):
                line(cx, cy + sign * half, 2 * half + ink, ink)
                line(cx + sign * half, cy, ink, 2 * half - ink)
        lines = mesh_obj(name + " ruling", bm, rule, smooth=False)
        lines.parent = card
        forms.append(lines)
    pp.SUPPORT[:] = wood
    forms.extend(pp.envelope("entry cream envelope", m["cream"], -0.215, 0.085, 17, w=0.17, h=0.115))
    forms.extend(pp.envelope("entry kraft envelope", m["manila"], -0.224, 0.103, 24, w=0.16, h=0.106))
    pp.SUPPORT[:] = wood
    forms.extend(pp.pen("entry pen", m["pen"], m["chrome"], m["chrome"], 0.112, -0.112, 35))
    forms.extend(pp.mug("second mug", mt.glaze("second mug glaze", (0.27, 0.22, 0.16)), m["bisque"], m["coffee"],
                        0.22, 0.10, 28))
    pp.SUPPORT[:] = wood
    supplies = art.swatches() + art.art_tools(m) + [art.tape()]
    pp.SUPPORT[:] = wood
    supplies.extend(pp.passport("travel booklet corner", m["cover"], m["pages"], 0.217, 0.124, 13,
                                m_end=m["endpaper"]))
    group("art materials", supplies)
    pp.SUPPORT[:] = wood
    group("open booklet", pp.passport("travel booklet open", m["cover"], m["pages"], 0, 0, -13,
                                     open_deg=151, m_end=m["endpaper"]))
    # The front lip between the handles stays sharp during the editorial push.
    empty("fx_tote_edge", (0.219, -0.173, TOP + 0.2505))
    empty("fx_open_booklet", (-0.022, 0.002, TOP + 0.008))
    pp.SUPPORT[:] = saved
    group("entry stationery", forms)
    empty("fx_entries", (0.018, -0.020, TOP + 0.001))
    empty("fx_tickets", (0.184, -0.061, TOP + 0.002))


def seam_paths(scene, resolution):
    """Project the visible thread left to right, lifting the editorial trace at each handle tab."""
    hem = bpy.data.objects["tote front hem"]
    surfaces = [world_bvh(bpy.data.objects[name]) for name in BAGS]
    eye = scene.camera.matrix_world.translation
    width, height = resolution
    paths = []
    previous = None
    for spline in reversed(hem.data.splines[:]):
        for control in reversed(spline.points[:]):
            point = hem.matrix_world @ Vector(control.co[:3])
            ray = point - eye
            # Ignore the leather carrying the stitch itself (its surface is within 0.2 mm).
            if any(surface.ray_cast(eye, ray.normalized(), ray.length - 0.0007)[0] is not None
                   for surface in surfaces):
                previous = None
                continue
            if previous is None or (point - previous).length > 0.008:
                paths.append([])
            uv = world_to_camera_view(scene, scene.camera, point)
            paths[-1].append([round(uv.x * width, 3), round((1 - uv.y) * height, 3)])
            previous = point
    return [path for path in paths if len(path) >= 2]


def frame_metadata(name, scene, resolution):
    """Export compositor coordinates in top-left-origin frame pixels."""
    if name in ("purses", "seam"):
        return {**sk.plate_optics(name, scene, resolution), "seam_paths_px": seam_paths(scene, resolution)}
    names = {"page": ("document_single",), "page_foot": ("document_single",),
             "pair": ("document_left", "document_right"), "screen": ("laptop_screen",)}
    if name not in names:
        return None
    pages = []
    width, height = resolution
    dg = bpy.context.evaluated_depsgraph_get()
    meta = sk.plate_optics(name, scene, resolution)
    for sheet_name in names[name]:
        sheet = bpy.data.objects[sheet_name].evaluated_get(dg)
        corners, depths, inside = {}, {}, {}
        xmax = max(v.co.x for v in sheet.data.vertices)
        ymax = max(v.co.y for v in sheet.data.vertices)
        for label, x, y in (("top_left", -xmax, ymax), ("top_right", xmax, ymax),
                            ("bottom_right", xmax, -ymax), ("bottom_left", -xmax, -ymax)):
            vertex = min(sheet.data.vertices, key=lambda v: ((v.co.x - x)**2 + (v.co.y - y)**2, -v.co.z))
            p = world_to_camera_view(scene, scene.camera, sheet.matrix_world @ vertex.co)
            corners[label] = [round(p.x * width, 3), round((1 - p.y) * height, 3)]
            depths[label] = round(p.z, 6)  # distance along the optical axis, in metres
            inside[label] = p.z > 0 and 0 <= p.x <= 1 and 0 <= p.y <= 1
        tracking = {"corners": corners, "depth_m": depths, "in_frame": inside}
        if name == "screen":
            return {**meta, "screen": sheet_name, **tracking}
        pages.append({"sheet": sheet_name, **tracking})
    return {**meta, "pages": pages}


def spread():
    """Lay the evidence out bottom to top: each paper drops onto what is already there."""
    m = materials()
    group("stack", folder_stack())
    # the open folder, fold running front to back; its back panel (with the tab) on the lamp's side
    group("folder", pp.manila_folder("open_folder", m["manila"], -0.10, -0.015, 86.0))
    # two handled sheets, cockled (3-3.5 mm waves) and each with one corner lifted 1-1.3 cm, the lower one offset and
    # turned so both edges read
    group("folder", pp.sheet("sheet_b", m["paper2"], 0.21, 0.297, 0.036, 0.01, -4.0,
                             shape=pp.sheet_shape(0.21, 0.297, 7, corners=(0.0, 0.0, 0.015, 0.0), wave=0.0012)))
    group("folder", pp.sheet("sheet_a", m["paper"], 0.21, 0.297, 0.010, -0.014, 2.5,
                             shape=pp.sheet_shape(0.21, 0.297, 3, corners=(0.0, 0.014, 0.0, 0.0), wave=0.0011)))
    group("folder", pp.paper_clip("clip_a", m["clip"], -0.093, 0.118, 96.0))
    group("folder", pp.boarding_pass("pass_1", m["card"], -0.212, 0.078, 3.0, seed=4, lift=0.003))
    group("folder", pp.boarding_pass("pass_2", m["card"], -0.226, 0.024, -8.0, seed=9, lift=0.009))
    # the passport across the passes' plain ends, clear of pass_2's bent stub
    group("passport", pp.passport("passport", m["cover"], m["pages"], -0.252, -0.06, -123.0, open_deg=4.0, m_end=m["endpaper"], m_slip=m["card"]))
    group("letter", pp.sheet("letter", m["letter"], 0.21, 0.297, 0.31, -0.205, -14.0, shape="trifold"))
    group("letter", pp.pen("pen", m["pen"], m["chrome"], m["chrome"], 0.475, -0.265, 72.0))
    group("photos", pp.photo_print("photo_1", m["photo_1"], 0.152, 0.102, 0.265, 0.095, 12.0, seed=2))
    group("photos", pp.photo_print("photo_2", m["photo_2"], 0.127, 0.178, 0.372, 0.045, -8.0, curl=0.003, seed=5))
    group("photos", pp.photo_print("photo_3", m["photo_3"], 0.152, 0.102, 0.205, 0.205, -5.0, curl=0.0022, seed=8))
    group("envelope", pp.envelope("envelope", m["cream"], -0.43, -0.285, 7.0))
    # the till receipt on bare wood at the pool's right edge, its rolled end at the far side
    # (lying across the light, its roll at the far end: the lamp from the left throws the tube's shadow onto the wood)
    group("receipt", pp.receipt("receipt", m["thermal"], 0.52, -0.035, -100.0, seed=5))
    group("highlighter", pp.highlighter("highlighter", m["hl_body"], m["hl_cap"], 0.075, -0.262, -9.0))
    group("letter", reading_glasses())
    group("chair", pulled_chair())
    group("mug", pp.mug("mug", m["glaze"], m["bisque"], m["coffee"], 0.06, 0.255, 178.0))


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
    if cam.get("stage_camera") in CAMERAS:
        return cam["stage_camera"]
    for n, c in CAMERAS.items():
        if (cam.location - Vector(c["loc"])).length < 1e-3:
            return n
    return None


def apply_camera(name):
    cfg = CAMERAS.get(name, {})
    beat = cfg.get("beat", "spread")
    # The crop shows the matte key deck immediately beneath the luminous panel.
    bpy.data.objects["laptop_screen_light"].data.energy = 5.0 if name == "screen" else 22.0
    set_beat(beat, cfg.get("hide", ()), cfg.get("show", ()), cfg.get("lamp"))
    plate = beat == "plate"
    for ob in _STATE["lamp_meshes"]:
        ob.hide_render = plate
    if "spot" in cfg:
        degrees, blend = cfg["spot"]
        spot = bpy.data.objects["lamp_spot"].data
        spot.spot_size, spot.spot_blend = math.radians(degrees), blend
    bpy.data.objects["cone_haze"].hide_render = plate
    for obj_name in ("lamp_spot", "lamp_glow", "lamp_bulb"):
        ob = bpy.data.objects[obj_name]
        ob.visible_glossy = not plate
        if ob.type == "LIGHT":
            ob.data.specular_factor = 0.0 if plate else 1.0
        else:
            ob.visible_camera = not plate
    bpy.data.objects["table_top"].data.materials[0] = M["plate_wood" if plate else "wood"]
    sc = bpy.context.scene
    air = bpy.data.objects["table air"].data.materials[0]
    volume = next(n for n in air.node_tree.nodes if n.type == "PRINCIPLED_VOLUME")
    volume.inputs["Density"].default_value = 0.0 if plate else (0.006 if name == "purses" else 0.013)
    sc.cycles.sample_clamp_indirect = 6.0
    sc.cycles.blur_glossy = 0.5
    sc.cycles.max_bounces = 8
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    print(f"EVIDENCE camera {name or '?'}: beat {beat}, hidden {sorted(set(HIDE.get(beat, ())) | set(cfg.get('hide', ())))}", flush=True)


def render_paper_mask(render, path, *args, **kwargs):
    """Write an ungraded, antialiased paper silhouette alongside the ordinary colour render."""
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    layer = bpy.context.view_layer
    previous_index = layer.use_pass_object_index
    previous_tree = scene.compositing_node_group
    tree = bpy.data.node_groups.new("Paper ID matte", "CompositorNodeTree")
    try:
        layer.use_pass_object_index = True
        scene.compositing_node_group = tree
        tree.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        inputs = tree.nodes.new("CompositorNodeRLayers")
        inputs.scene = scene
        composite = tree.nodes.new("NodeGroupOutput")
        tree.links.new(inputs.outputs["Image"], composite.inputs["Image"])
        mask = tree.nodes.new("CompositorNodeIDMask")
        mask.inputs["Index"].default_value = 1
        mask.inputs["Anti-Alias"].default_value = True
        tree.links.new(inputs.outputs["Object Index"], mask.inputs["ID value"])
        writer = tree.nodes.new("CompositorNodeOutputFile")
        writer.format.media_type = "IMAGE"
        writer.format.file_format = "PNG"
        writer.format.color_mode = "BW"
        writer.format.color_depth = "8"
        writer.file_output_items.clear()
        item = writer.file_output_items.new("FLOAT", "paper")
        item.save_as_render = False
        writer.save_as_render = False
        tree.links.new(mask.outputs["Alpha"], writer.inputs[item.name])
        with tempfile.TemporaryDirectory(dir=Path(path).parent) as directory:
            writer.directory, writer.file_name = directory, "mask"
            result = render(path, *args, **kwargs)
            matte, = Path(directory).rglob("*.png")
            os.replace(matte, Path(path).with_suffix(".mask.png"))
            return result
    finally:
        scene.compositing_node_group = previous_tree
        layer.use_pass_object_index = previous_index
        bpy.data.node_groups.remove(tree)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        name = which_camera()
        apply_camera(name)
        if name in ("page", "page_foot", "pair") and os.path.basename(args[0]).startswith("final"):
            return render_paper_mask(orig, *args, **kw)
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


def passport_net(t0=-0.042, t1=0.024, level=0.86, h=0.2):
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
    document_plates()
    entry_stationery()
    group("laptop", laptop())
    bpy.context.view_layer.update()
    empty("fx_screen", tuple(bpy.data.objects["laptop_screen"].matrix_world.translation))
    group("bags", bags())
    # Ch 04: the rolled receipt on the wood in front of the bags, its roll toward the lamp, seen nearly end on
    # Ch 04's receipt, and Ch 02 (night, the email): the documents are put away; the passport and the two boarding
    # passes lie on the bare wood in front of the laptop, in the turned-down lamp's pool and the screen's cool spill.
    # These rest on the table only (the spread's papers, hidden for these beats, leave the support while they drop)
    keep = list(pp.SUPPORT)
    pp.SUPPORT[:] = [o for o in keep if o.name in ("table_top",)]
    group("receipt_c4", pp.receipt("receipt_c4", M["thermal"], *RECEIPT_C4, seed=12))
    pp.SUPPORT[:] = [o for o in keep if o.name in ("table_top",)]
    # Before the tickets arrive, the same booklet rests flat on bare boards.
    group("booklet on wood", pp.passport("passport before", M["cover"], M["pages"], 0.21, 0.06, -28.0,
                                         m_end=M["endpaper"]))
    pp.SUPPORT[:] = [o for o in keep if o.name == "table_top"]
    group("passes_c2", pp.boarding_pass("pass_c2a", M["card"], 0.165, -0.012, 11.0, seed=21, lift=0.003))
    group("passes_c2", pp.boarding_pass("pass_c2b", M["card"], 0.19, -0.05, -7.0, seed=23, lift=0.008))
    group("passport_c2", pp.passport("passport_c2", M["cover"], M["pages"], 0.21, 0.06, -28.0, m_end=M["endpaper"]))
    pp.SUPPORT[:] = keep + [o for o in pp.SUPPORT if o not in keep]
    # lamp-lit air: a faint haze over the table only, so the cone has a shape in the low shots (denser under the
    # shade: cone_haze, built with the lamp)
    hz = sk.haze((2.6, 1.6, 1.0), (0.0, 0.0, TOP + 0.5), 0.013, colour=(0.9, 0.88, 0.85))
    hz.name = "table air"
    hz.visible_shadow = False
    room_bounce()
    # Low spill on the boards opens the wood grain outside the cone without flattening the documents.
    edge = sk.area_light("table edge bounce", (0.54, 0.0, TOP + 0.85), (1.4, 0.85), 7.5, WARM)
    recv = bpy.data.collections.new("table surface receivers")
    for ob in bpy.context.scene.objects:
        if ob.type == "MESH" and M["wood"].name in ob.data.materials:
            recv.objects.link(ob)
    edge.light_linking.receiver_collection = recv
    # The direct screen spill mostly falls on the key deck. Its diffuse return on
    # the boards is just visible around the near corners of the keyboard.
    return_light = sk.area_light("screen on the desktop", (0.35, 0.24, TOP + 0.23), (0.30, 0.17), 9.0, COOL)
    return_light.rotation_euler = (Vector((0.22, 0.07, TOP)) - return_light.location).to_track_quat("-Z", "Y").to_euler()
    return_light.light_linking.receiver_collection = recv
    return_light.visible_glossy = False
    return_light.visible_volume_scatter = False
    group("screen spill", [return_light])
    edge.visible_glossy = False
    edge.visible_volume_scatter = False
    room()
    group("net_passport", passport_net())
    pport = bpy.data.objects["passport_front"]
    bpy.context.view_layer.update()
    pc = pport.matrix_world @ Vector((0.042, 0.040, 0.010))
    loc = pport.matrix_world @ Vector((-0.20, 0.16, 0.12))
    kicker = sk.area_light("passport reflected light", loc, (0.10, 0.05), 1.25, WARM, spread_deg=120)
    kicker.rotation_euler = (pport.matrix_world.translation - loc).to_track_quat("-Z", "Y").to_euler()
    receivers = bpy.data.collections.new("passport cloth covers")
    for n in ("passport_front", "passport_back"):
        receivers.objects.link(bpy.data.objects[n])
    kicker.light_linking.receiver_collection = receivers
    kicker.visible_volume_scatter = False
    group("cover light", [kicker])
    empty("fx_passport", tuple(pc))
    empty("fx_overhead", (-0.07, 0.0, TOP + 0.01))
    # the push focuses on sheet_a's lifted corner (+x -y, nearest the camera), a little in from its tip, so the sharp
    # plane shows the paper's thickness
    sha = bpy.data.objects["sheet_a"]
    dg = bpy.context.evaluated_depsgraph_get()
    me = sha.evaluated_get(dg).to_mesh()
    tip = max(me.vertices, key=lambda v: v.co.x - v.co.y)
    on_sheet = min(me.vertices, key=lambda v: (v.co - tip.co - Vector((-0.040, 0.035, 0.0))).length)
    corner = sha.matrix_world @ on_sheet.co
    sha.evaluated_get(dg).to_mesh_clear()
    empty("fx_push", tuple(corner))
    overlap_report()
    set_beat("spread")
    install_hook()
