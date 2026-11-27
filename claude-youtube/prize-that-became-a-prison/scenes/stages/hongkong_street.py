"""Stage: a Hong Kong street at night (Ch 03 'The vacation that made it believable'). Fluorescent Noir.

The nine days of sightseeing and shopping. A narrow tram street canyon of old residential blocks (balconies,
air-conditioner boxes, grille cages, laundry poles), projecting signboards that are all blank (lightboxes with soft
colour fields, neon frames round dark panels, dead painted panels: shape, frame and glow only, no characters), tram
contact wires and sagging cables overhead, wet asphalt and rails taking every light as a long streak. The light is the
shops': open fronts burning fluorescent or warm, spilling onto the wet pavement; the street between is dark.
A few generic tourists (stone statues from scenes/people.py, no two alike) walk or stand at a distance. Dawn
(people.dawn()) is small, seen from behind, unhurried, a paper shopping bag in one hand and a small boutique bag
(tissue paper at its mouth: a gift) in the other; in the closer shots she stops at a boutique's lit window.

    <bpy python> -I scenes/shoot.py -- hongkong_street <cam> out.png [--nocast]

Set: hongkong_street_set.py (street, buildings, shops, signs, wires, the boutique and its bags) and
hongkong_street_mats.py. The people come from scenes/people.py; this stage only finishes (flat matt cloth, the
bun drawn to the nape, the shoes' embossed stamp removed, dark tights, hands a shade darker), poses (a walking
stride solved so the leading heel and the trailing toes both touch the ground; gazes solved onto targets) and
places them, and hangs the bags from Dawn's hands. Before every render a hook on setkit.render blocks and poses the
cast for that camera's beat, moves the focus empty onto Dawn, sets the lens shift, haze and light trims.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402
from mathutils.kdtree import KDTree  # noqa: E402,F401

import cast as castkit  # noqa: E402
import people  # noqa: E402
import props  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import hongkong_street_set as st  # noqa: E402
import hongkong_street_mats as mt  # noqa: E402

EXPOSURE = -1.9
WORLD = 0.0

# ---------------------------------------------------------------- blocking
# per beat: name -> (x, y, facing target (x, y), action). "walk": Dawn walking up the right-hand pavement toward the
# boutique; "window": Dawn stopped at the boutique's display, looking at the bags on the shelf.
BLOCK = {
    "walk": {
        "Dawn": ((5.5, 16.30), (5.5, 30.0), "walk_bags"),
        "T1": ((6.35, 27.5), (6.2, 10.0), "walk_up"),
        "M2": ((-5.55, 21.2), (-5.4, 5.0), "walk_talk"),
        "W1": ((-6.2, 21.0), (-6.3, 5.0), "walk_talk_w"),
        "M3": ((-6.55, 33.5), (-7.4, 33.9), "stand_look"),
        "Organiser": ((-5.7, 33.4), (-6.4, 32.8), "walk_talk"),
        "ShopNear": ((8.1, 11.0), (5.6, 9.8), "at_counter"),
        "ShopFar": ((-8.2, 24.5), (-5.7, 23.1), "at_counter"),
        "M4": ((5.25, 43.0), (5.3, 60.0), "walk_away"),
    },
    "company": {
        "Dawn": ((5.64, 16.4), (5.62, 32.0), "walk_away"),
        "Organiser": ((6.31, 17.22), (6.25, 30.5), "walk_away"),
        "T1": ((4.95, 15.70), (5.01, 31.0), "walk_away"),
    },
    "window": {
        "Dawn": ((6.55, 17.9), (8.0, 18.9), "stand_bags"),
        "T1": ((6.1, 29.5), (6.0, 10.0), "walk_up"),
        "M2": ((-5.55, 26.2), (-5.4, 5.0), "walk_talk"),
        "W1": ((-6.2, 26.0), (-6.3, 5.0), "walk_talk_w"),
        "M3": ((-6.55, 33.5), (-7.4, 33.9), "stand_look"),
        "M4": ((5.0, 41.0), (5.1, 60.0), "walk_away"),
    },
    # the window close-up: Dawn a step back from the glass, square to it, so her reflection stands over the dark felt
    # between the two bags on the shelf (only she is shown)
    "reflect": {
        "Dawn": ((6.45, 18.80), (8.0, 19.40), "stand_bags"),
    },
}

FOCUS = {"fx_dawn": (5.5, 14.0, 1.4), "fx_bags": (7.95, 18.9, 1.25)}

CAMERAS = {
    # Ch 03: down the street canyon from the road between the tram tracks, a standing eye line, level with the lens
    # shifted up (verticals stay vertical, the balconies and signs stack overhead); the wet road and rails lead to
    # the vanishing point; Dawn small on the right-hand pavement among the walkers, bags in her hands, walking
    # toward the lit boutique
    "wide": dict(loc=(1.4, 0.0, 1.5), aim=(2.45, 60.0, 1.5), lens=24, focus="fx_dawn", fstop=5.6, beat="walk",
                 shift_y=0.12, haze=0.0022, sky_gain=0.16, exposure=-1.9),
    # Ch 03: Dawn from behind, three-quarter from her right, stopped at the boutique's lit window, the bags at her
    # sides; the street soft beyond on the left, its signs and shops melting into the haze
    "dawn": dict(loc=(5.33, 13.47, 1.36), aim=(7.24, 23.29, 1.0), lens=35, focus="fx_dawn", fstop=2.8, beat="window",
                 shift_y=0.0, haze=0.0025, exposure=-1.5, glass_refl=0.02),
    # Ch 03: a controlled close-up through the boutique glass: the handbags on the lit shelf, blank, and Dawn's
    # reflection faint over the dark felt above them
    "window": dict(loc=(6.75, 18.0, 1.40), aim=(8.0, 18.83, 1.39), lens=40, focus="fx_bags", fstop=8.0, beat="reflect",
                   shift_y=0.0, haze=0.0, exposure=-1.15, only=("Dawn",), glass_refl=0.017, glass_grazing=0.36,
                   hide_glossy=("shop_interiors", "tubes")),
}
CAMERAS["company"] = dict(loc=(5.32, 11.6, 1.47), aim=(5.8, 18.3, 1.12), lens=35, focus="fx_dawn",
                          fstop=4.0, beat="company", shift_y=0.0, haze=0.0022, exposure=-1.65)
TRIMS = {
    "dawn": {"boutique door spill": 0, "display shelf return": 12 / 28},
    "window": {"bq_glow": 0.55, "boutique door spill": 0},
    "company": {"boutique door spill": 0.31},
}
WIDE_VIEW = CAMERAS["wide"]
# a run may render only some cameras: HK_CAMS="wide,dawn" (shoot.py's `all` walks CAMERAS)
if os.environ.get("HK_CAMS"):
    CAMERAS = {k: v for k, v in CAMERAS.items() if k in os.environ["HK_CAMS"].split(",")}

_STATE = {"holders": {}, "cast": [], "cache": {}, "bags": {}}
rng = random.Random(3)


# ---------------------------------------------------------------- finishing the cast
def cloth(holder, item, rough=0.92, bump=0.28, tint=None):
    """A garment as plain matt cloth: the normal map (fine stripes that shimmer) dropped for a woven-noise bump,
    almost no specular, optionally a new flat tint on people.py's colour mix."""
    ob = bpy.data.objects.get(f"{holder.name}_{item}")
    if ob is None:
        return None
    for slot in ob.material_slots:
        m = slot.material
        if not (m and m.use_nodes):
            continue
        nt = m.node_tree
        b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if b is None:
            continue
        if tint is not None:
            mix = next((n for n in nt.nodes if n.type == "MIX" and getattr(n, "data_type", "") == "RGBA"), None)
            if mix is not None:
                mix.inputs["B"].default_value = (*[c * people.FABRIC_VALUE for c in tint], 1.0)
        for sock in ("Roughness", "Normal"):
            for ln in list(b.inputs[sock].links):
                nt.links.remove(ln)
        b.inputs["Roughness"].default_value = rough
        b.inputs["Sheen Weight"].default_value = 0.0
        b.inputs["Specular IOR Level"].default_value = 0.05
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 400.0
        nz.inputs["Detail"].default_value = 2.0
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = bump
        bp.inputs["Distance"].default_value = 0.0004
        nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return ob


def hem_thickness(ob, t=0.006):
    so = ob.modifiers.new("cloth_thickness", "SOLIDIFY")
    so.thickness, so.offset, so.use_even_offset = t, 1.0, False
    so.use_quality_normals = True
    sub = next((i for i, md in enumerate(ob.modifiers) if md.type == "SUBSURF"), None)
    if sub is not None:
        ob.modifiers.move(len(ob.modifiers) - 1, sub)


def _body_mask(holder, name, groups, scale=None):
    body = bpy.data.objects[holder["body"]]
    gi = {g.index: (scale or {}).get(g.name, 1.0) for g in body.vertex_groups if any(g.name.startswith(k) for k in groups)}
    me = body.data
    attr = me.color_attributes.new(name, "FLOAT_COLOR", "POINT")
    for v in me.vertices:
        w = min(1.0, sum(g.weight * gi[g.group] for g in v.groups if g.group in gi))
        attr.data[v.index].color = (w, w, w, 1.0)
    return body


def _mask_mix(holder, mask, rgb):
    body = bpy.data.objects[holder["body"]]
    m = body.data.materials[0]
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    at = nt.nodes.new("ShaderNodeAttribute")
    at.attribute_name = mask
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    src = b.inputs["Base Color"].links[0].from_socket if b.inputs["Base Color"].is_linked else None
    if src is not None:
        nt.links.new(src, mix.inputs["A"])
    else:
        mix.inputs["A"].default_value = b.inputs["Base Color"].default_value
    mix.inputs["B"].default_value = (*rgb, 1.0)
    nt.links.new(at.outputs["Factor"], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])


def hands_stone(holder, value=0.36):
    """The hands a shade darker stone than the face (shop light comes from the side and below; equal albedo made
    the hands read white), blended by the hand's deform weights so there is no seam."""
    _body_mask(holder, "handmask", ("DEF-hand", "DEF-palm", "DEF-f_", "DEF-thumb"))
    _mask_mix(holder, "handmask", (value, value, value * 1.01))


def tights(holder, value=0.07):
    """A continuous stocking colour from the thigh under the skirt to the foot."""
    _body_mask(holder, "legmask", ("DEF-shin", "DEF-thigh", "DEF-foot"))
    _mask_mix(holder, "legmask", (value, value * 0.97, value * 0.95))


def plain_shoes(holder):
    """Flatten the shoes' embossed toe stamp (it read as a brand, the gate critique): the normal and bump maps off,
    a plain matt-satin black leather."""
    for o in holder.children_recursive:
        if o.type != "MESH" or "shoes" not in o.name:
            continue
        for slot in o.material_slots:
            m = slot.material
            if not (m and m.use_nodes):
                continue
            nt = m.node_tree
            b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
            for n in nt.nodes:
                if n.type in ("NORMAL_MAP", "BUMP"):
                    n.inputs["Strength"].default_value = 0.0
            if b is not None:
                for ln in list(b.inputs["Normal"].links):
                    nt.links.remove(ln)
                b.inputs["Roughness"].default_value = 0.45
                b.inputs["Specular IOR Level"].default_value = 0.3


def dawn():
    h = people.dawn()
    n = castkit.blouse_v(h, rgb=(0.2, 0.19, 0.18), depth=0.42, width=0.14)
    bl = bpy.data.materials.get(f"blouse_{h.name}")
    if bl is not None:
        bb = bl.node_tree.nodes["Principled BSDF"]
        bb.inputs["Specular IOR Level"].default_value = 0.05
        bb.inputs["Roughness"].default_value = 0.92
    suit = cloth(h, "female_elegantsuit01")
    if suit is not None:
        hem_thickness(suit, 0.006)
    # the bun drawn low to the nape and made smaller, so from behind the head reads as a head, not a cap
    bun = bpy.data.objects.get(f"{h['body']}_bun")
    if bun is not None:
        me = bun.data
        c = sum((v.co for v in me.vertices), Vector()) / len(me.vertices)
        for v in me.vertices:
            d = v.co - c
            v.co = c + Vector((d.x * 0.82, d.y * 0.72, d.z * 0.8)) + Vector((0.0, -0.012, -0.034))
        me.update()
    plain_shoes(h)
    tights(h)
    hands_stone(h)
    print(f"HK Dawn: blouse {n} vertices, bun lowered, shoes plain, tights", flush=True)
    return h


def woman(name, height_cm, age, weight, tone, hair="short"):
    """A woman tourist in a T-shirt and jeans (female_casualsuit01, flat tinted: no print), plain black shoes."""
    h = castkit.person(name, gender=0.0, height_cm=height_cm, age=age, weight=weight, hair=hair)
    people._dress(h, ["female_casualsuit01", "shoes04"], tint={"female_casualsuit01": tone, "shoes04": people.BLACK_SHOE},
                  flat=("female_casualsuit01", "shoes04"))
    return h


def build_cast():
    holders = {"Dawn": dawn()}
    # the walkers: four men and a woman, each a different height, build, age, hair and outfit
    holders["T1"] = people.man("T1", height_cm=186, age=0.32, weight=0.5, suit="male_casualsuit05",
                               tone=(0.20, 0.18, 0.15), shoes="shoes04")
    holders["M2"] = people.man("M2", height_cm=175, age=0.56, weight=0.7, suit="male_casualsuit03",
                               tone=(0.14, 0.125, 0.105), shoes="shoes04")
    holders["W1"] = woman("W1", 160, 0.36, 0.42, (0.105, 0.12, 0.15))
    holders["M3"] = people.man("M3", height_cm=168, age=0.64, weight=0.62, suit="male_casualsuit06",
                               tone=(0.2, 0.2, 0.19), shoes="shoes04")
    holders["M4"] = people.man("M4", height_cm=172, age=0.24, weight=0.42, suit="male_casualsuit01",
                               tone=(0.075, 0.08, 0.085), shoes="shoes04")
    holders["Organiser"] = people.man("Organiser", age=0.4, suit="male_casualsuit03",
                                      tone=(0.1, 0.1, 0.11), shoes="shoes04")
    holders["ShopNear"] = people.staff("ShopNear", 0)
    holders["ShopFar"] = people.staff("ShopFar", 1)
    _STATE["subdivisions"] = {}
    for n, h in holders.items():
        _STATE["subdivisions"][n] = []
        if n != "Dawn":
            for o in h.children_recursive:
                if o.type == "MESH" and o.name.startswith(n + "_") and "shoes" not in o.name and "_body" not in o.name:
                    cloth(h, o.name[len(n) + 1:])
            plain_shoes(h)
            hands_stone(h, 0.33 if n in ("M2", "M3") else 0.37)
        _STATE["cast"] += [h] + list(h.children_recursive)
        # Python-side evaluation (posing, grounding, clearances) without the subdivision: several times faster; the
        # render uses each modifier's render switch, so the figures still render smooth
        for o in [h] + list(h.children_recursive):
            for md in getattr(o, "modifiers", []):
                if md.type == "SUBSURF":
                    md.show_viewport = False
                    _STATE["subdivisions"][n].append((md, md.render_levels))
    _STATE["dawn_glossy"] = [o for o in holders["Dawn"].children_recursive if o.type == "MESH" and o.visible_glossy]
    _STATE["holders"] = holders
    return holders


# ---------------------------------------------------------------- posing helpers
def ground(holder, floor=st.PZ):
    """Soles (shoes and body only) at z = floor, after two depsgraph passes."""
    bpy.context.view_layer.update()
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    lo = 1e9
    for o in [holder] + list(holder.children_recursive):
        if o.type != "MESH" or not (o.name == holder["body"] or "shoes" in o.name):
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = o.matrix_world
        lo = min([lo] + [(mw @ v.co).z for v in me.vertices])
        ev.to_mesh_clear()
    holder.location.z += floor - lo - 0.002      # the render's subdivision lifts the soles by about 2 mm
    bpy.context.view_layer.update()
    return lo - floor


def eye_centre(holder):
    bpy.context.view_layer.update()
    rig = rigged.rig_of(holder)
    m = rig.pose.bones["head"].matrix
    return rig.matrix_world @ (m.translation + m.to_3x3().col[1].normalized() * 0.04 + m.to_3x3().col[2].normalized() * 0.075)


def head_forward(holder):
    rig = rigged.rig_of(holder)
    m = rig.pose.bones["head"].matrix.to_3x3()
    return (rig.matrix_world.to_3x3() @ m.col[2]).normalized()


def solve_head(holder, pose, target, passes=4, lim=(-30.0, 40.0, 60.0)):
    """Turn and tip the head (pose 'head') so the face looks at target (world), for the trunk as posed."""
    d, t = pose.get("head", (0.0, 0.0))
    tgt = Vector(target)
    dy = dp = 0.0
    for _ in range(passes):
        pose["head"] = (d, t)
        rigged.pose_figure(holder, pose)
        e, f = eye_centre(holder), head_forward(holder)
        g = (tgt - e).normalized()
        dy = math.degrees(math.atan2(g.y, g.x) - math.atan2(f.y, f.x))
        dy = (dy + 180) % 360 - 180
        dp = math.degrees(math.asin(max(-1, min(1, f.z))) - math.asin(max(-1, min(1, g.z))))
        t = max(-lim[2], min(lim[2], t + dy))
        d = max(lim[0], min(lim[1], d + dp))
    pose["head"] = (round(d, 1), round(t, 1))
    rigged.pose_figure(holder, pose)
    return pose["head"], (round(dy, 1), round(dp, 1))


CURL_GRIP = {"f_index": (75, 85), "f_middle": (80, 88), "f_ring": (80, 85), "f_pinky": (78, 80), "thumb": (35, 40)}
CURL_EASY = {"f_index": (18, 24), "f_middle": (22, 28), "f_ring": (24, 30), "f_pinky": (26, 32), "thumb": (6, 12)}


def curl(holder, side, spec):
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    for f, (knuckle, joint) in spec.items():
        for n, deg in ((f"{f}.01_master.{side}", knuckle), (f"{f}.02.{side}", joint), (f"{f}.03.{side}", joint)):
            if n in pb and deg:
                pb[n].rotation_mode = "XYZ"
                pb[n].rotation_euler.x = math.radians(deg)
    bpy.context.view_layer.update()


def _foot_lows(holder):
    """The lowest point of each shoe (world z), the feet told apart by the figure's own left/right."""
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    inv = holder.matrix_world.inverted()
    lows = {"L": 1e9, "R": 1e9}
    for o in holder.children_recursive:
        if o.type != "MESH" or "shoes" not in o.name:
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = o.matrix_world
        for v in me.vertices:
            p = mw @ v.co
            k = "L" if (inv @ p).x > 0 else "R"
            if p.z < lows[k]:
                lows[k] = p.z
        ev.to_mesh_clear()
    return lows


def legs_walk(holder, lead, tf=19.0, tb=12.0, kf=5.0, pitch_lead=10.0, pitch_trail=-30.0):
    """A walking stride on FK legs: the leading leg forward and nearly straight, its heel striking (toes up); the
    trailing leg back, knee bent, heel lifted and toes flat on the ground. The trailing knee is solved so both feet
    touch the same ground plane."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    for k in "LR":
        p = pb.get(f"thigh_parent.{k}")
        if p is not None and "IK_FK" in p.keys():
            p["IK_FK"] = 1.0
    bpy.context.view_layer.update()
    rest = {k: (pb[f"foot_fk.{k}"].matrix.to_3x3() @ Vector((0, 1, 0))).normalized() for k in "LR"}
    toe_rest = {k: (pb[f"toe_fk.{k}"].matrix.to_3x3() @ Vector((0, 1, 0))).normalized() for k in "LR" if f"toe_fk.{k}" in pb}
    trail = "R" if lead == "L" else "L"
    side = {"L": 1, "R": -1}

    def leg(k, thigh, knee, pitch, toe_flat=False):
        s = side[k]
        rigged._aim(rig, f"thigh_fk.{k}", rigged._dir(0, thigh, s, 2.0))
        rigged._aim(rig, f"shin_fk.{k}", rigged._dir(0, thigh - knee, s, 1.0))
        rigged._aim(rig, f"foot_fk.{k}", Matrix.Rotation(-math.radians(pitch), 3, "X") @ rest[k])
        if k in toe_rest:
            t = toe_rest[k].copy()
            if toe_flat:
                t.z = 0.0
            rigged._aim(rig, f"toe_fk.{k}", t.normalized())

    leg(lead, tf, kf, pitch_lead)
    lo, hi = 0.0, 75.0
    kb = 35.0
    for _ in range(7):
        kb = (lo + hi) / 2
        leg(trail, -tb, kb, pitch_trail, toe_flat=True)
        lows = _foot_lows(holder)
        f = lows[trail] - lows[lead]
        if abs(f) < 0.002:
            break
        if f > 0:
            hi = kb
        else:
            lo = kb
    return kb, f


def stance(holder, hip_side=0.022, hip_down=0.004, foot_fwd=0.07, foot_out=10.0, free="L"):
    """Weight on one leg (IK legs): the torso over the standing leg, the free foot a little forward, turned out."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    for k in "LR":
        p = pb.get(f"thigh_parent.{k}")
        if p is not None and "IK_FK" in p.keys():
            p["IK_FK"] = 0.0
    k = 1.0 / (rig.scale[0] * holder["ks"])
    sgn = 1.0 if free == "L" else -1.0
    if "torso" in pb:
        m = pb["torso"].matrix.copy()
        pb["torso"].matrix = Matrix.Translation((-sgn * hip_side * k, 0.0, -hip_down * k)) @ m
        bpy.context.view_layer.update()
    n = f"foot_ik.{free}"
    if n in pb:
        m = pb[n].matrix.copy()
        head = m.translation.copy()
        r = Matrix.Rotation(math.radians(sgn * foot_out), 4, "Z")
        pb[n].matrix = Matrix.Translation((0.0, -foot_fwd * k, 0.0)) @ Matrix.Translation(head) @ r @ Matrix.Translation(-head) @ m
    bpy.context.view_layer.update()


def grip_point(holder, side):
    """Seat the gathered cords against the inside of the posed index and middle fingers."""
    body = bpy.data.objects[holder["body"]]
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    groups = {body.vertex_groups[f"DEF-f_{finger}.01.{side}"].index for finger in ("index", "middle")}
    knuckles = [evaluated.matrix_world @ v.co for v in evaluated.data.vertices
                if any(g.group in groups and g.weight > 0.5 for g in v.groups)]
    centre = sum(knuckles, Vector()) / len(knuckles)
    rig = rigged.rig_of(holder)
    bones = rig.pose.bones
    hand = bones[f"DEF-hand.{side}"]
    across = bones[f"DEF-f_index.01.{side}"].head - bones[f"DEF-f_pinky.01.{side}"].head
    inward = (rig.matrix_world.to_3x3() @ (hand.tail - hand.head).cross(across)).normalized()
    fingers = rig.matrix_world @ bones[f"DEF-f_middle.03.{side}"].tail - centre
    if inward.dot(fingers) < 0:
        inward.negate()
    contact = centre + 0.015 * inward
    skin = min(knuckles, key=lambda p: (p - contact).length_squared)
    # Both paper handles have cord radii above 3 mm. Let the cord graze the
    # skin even when the fingers curl a little differently between strides.
    apex = skin + (contact - skin).normalized() * 0.002
    print(f"HK {side} handle centre to finger skin {1000 * (apex - skin).length:.1f} mm", flush=True)
    return apex


# ---------------------------------------------------------------- the shopping bags
def bag_mesh(name, w, g, h, drop, body_m, handle_m, rope_r=0.0045, tissue_m=None):
    """A paper carrier bag hanging from its handles: the handle apex at the origin, the bag below it (top edge at
    -drop), width along local Y, gusset along X. Open top with a turned hem, the gussets folded in (a V crease down
    each narrow side), a flat bottom; two rope handles, one on each broad face, gathered into the hand."""
    bm = bmesh.new()
    z1 = -drop
    z0 = -drop - h
    gx, wy = g / 2, w / 2
    crease = g * 0.22

    def V(x, y, z):
        return bm.verts.new((x, y, z))
    # broad faces (+x and -x), narrow gusset faces folded in, bottom
    for s in (-1, 1):
        a, b_, c, d = V(s * gx, -wy, z0), V(s * gx, wy, z0), V(s * gx, wy, z1), V(s * gx, -wy, z1)
        bm.faces.new((a, b_, c, d) if s > 0 else (d, c, b_, a))
    for s in (-1, 1):
        y = s * wy
        p = [V(-gx, y, z0), V(0, y - s * crease, z0), V(gx, y, z0), V(gx, y, z1), V(0, y - s * crease, z1), V(-gx, y, z1)]
        f1 = (p[0], p[1], p[4], p[5])
        f2 = (p[1], p[2], p[3], p[4])
        for f in (f1, f2):
            bm.faces.new(f if s < 0 else f[::-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bot = [V(-gx, -wy, z0), V(gx, -wy, z0), V(gx, wy, z0), V(-gx, wy, z0)]
    bm.faces.new(bot)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(body_m)
    so = ob.modifiers.new("card", "SOLIDIFY")
    so.thickness, so.offset = 0.0018, -1.0
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width, bv.segments, bv.limit_method = 0.003, 2, "ANGLE"
    parts = [ob]
    # the turned hem: a band round the inside of the mouth
    hem = st.MB(name + "_hem", [body_m])
    for s in (-1, 1):
        hem.box((s * gx - (0.004 if s > 0 else -0.0), -wy + 0.002, z1 - 0.035), (s * gx + (0.0 if s > 0 else 0.004), wy - 0.002, z1), 0)
    parts.append(hem.finish(bevel=0.0015))
    # handles: each from two holes on its broad face, up to the hand
    hm = st.MB(name + "_handles", [handle_m])
    for s in (-1, 1):
        A = Vector((s * (gx - 0.004), -0.055, z1 - 0.022))
        B = Vector((s * (gx - 0.004), 0.055, z1 - 0.022))
        # Both curves pass through the holder origin at t=1/2. A control
        # point at the grip itself would leave the actual cord below the hand.
        control = -(A + B) * 0.5
        pts = []
        for i in range(25):
            t = i / 24
            pts.append((1 - t) ** 2 * A + 2 * (1 - t) * t * control + t ** 2 * B)
        st.tube(hm, pts, rope_r, segs=6)
        for P in (A, B):
            hm.box((P.x - 0.004, P.y - 0.007, P.z - 0.007), (P.x + 0.004, P.y + 0.007, P.z + 0.007), 0)
    parts.append(hm.finish())
    if tissue_m is not None:
        # Three sheets tucked into the bag, with folded, uneven free edges.
        tb = bmesh.new()
        r = random.Random(11)
        for sheet, centre_y in enumerate((-0.058, 0.0, 0.058)):
            phase = r.uniform(0, math.tau)
            rows = []
            for j in range(6):
                v = j / 5
                row = []
                for i in range(9):
                    u = i / 8
                    fold = math.sin(2.5 * math.pi * u + phase + 1.2 * v)
                    x = (sheet - 1) * 0.012 + (0.009 + 0.018 * v) * fold
                    y = centre_y + (u - 0.5) * (0.065 + 0.042 * v)
                    edge = 0.032 + 0.026 * math.sin(math.pi * u + phase) + 0.016 * abs(fold)
                    z = z1 - 0.055 + v * (0.055 + edge)
                    row.append(tb.verts.new((x + r.uniform(-0.002, 0.002), y, z + r.uniform(-0.004, 0.004))))
                if rows:
                    for i in range(len(row) - 1):
                        tb.faces.new((rows[-1][i], rows[-1][i + 1], row[i + 1], row[i]))
                rows.append(row)
        tme = bpy.data.meshes.new(name + "_tissue")
        tb.to_mesh(tme)
        tb.free()
        to = bpy.data.objects.new(name + "_tissue", tme)
        bpy.context.scene.collection.objects.link(to)
        to.data.materials.append(tissue_m)
        parts.append(to)
    holder = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(holder)
    for p in parts:
        p.parent = holder
    holder["box"] = (gx, wy, z0, z1)
    return holder


def make_bags():
    M = mt.M
    big = bag_mesh("bag_kraft", 0.32, 0.12, 0.36, 0.16, M["kraft"], M["kraft_rope"], 0.005)
    small = bag_mesh("bag_boutique", 0.25, 0.1, 0.27, 0.14, M["card_dark"], M["rope"], 0.0035, tissue_m=M["tissue"])
    _STATE["bags"] = {"R": big, "L": small}
    return _STATE["bags"]


def hang_bag(holder, side, bag, yaw_extra=0.0):
    p = grip_point(holder, side)
    f = holder.rotation_euler.z
    bag.matrix_world = Matrix.Translation(p) @ Matrix.Rotation(f + math.radians(yaw_extra), 4, "Z")
    bpy.context.view_layer.update()
    return p


def bag_clearance(holder, bag):
    """How far the figure's nearest vertex (hands excluded) is inside the bag's box grown by 6 mm (> 0: a clash)."""
    gx, wy, z0, z1 = bag["box"]
    inv = bag.matrix_world.inverted()
    dg = bpy.context.evaluated_depsgraph_get()
    worst = -1.0
    for o in [holder] + list(holder.children_recursive):
        if o.type != "MESH" or not (o.name == holder["body"] or "suit" in o.name or "casual" in o.name):
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = o.matrix_world
        for v in me.vertices:
            q = inv @ (mw @ v.co)
            if z0 - 0.006 < q.z < z1 - 0.03:
                d = min(gx + 0.006 - abs(q.x), wy + 0.006 - abs(q.y))
                if d > worst:
                    worst = d
        ev.to_mesh_clear()
    return worst


# ---------------------------------------------------------------- per-figure actions
def act(name, h, action, beat):
    rep = name + ": "
    if action in ("walk_bags", "stand_bags"):
        bags = _STATE["bags"]
        walking = action == "walk_bags"
        look = ((h.location.x + 0.6, h.location.y + 8.0, 1.5) if walking else (8.0, 18.5, 1.24) if beat == "window"
                else (8.02, 19.40, 1.28))
        # In the shop three-quarter the far carrier must clear her skirt in
        # projection as well as in space. Let that arm trail behind the hip.
        left_swing = -24.0 if beat == "window" else (-3.0 if walking else 2.0)
        out = 14.0 if beat == "window" else 10.0
        for attempt in range(8):
            pose = {"chest": (3.0, 3.0) if walking else (6.0, 0.0), "neck": (2.0, 0.0),
                    "l_arm": (left_swing, out, 8.0), "r_arm": (4.0 if walking else 1.0, out + 1.0, 6.0), "fingers": 0}
            hd, err = solve_head(h, pose, look, lim=(-25.0, 45.0, 40.0))
            if walking:
                kb, f = legs_walk(h, "L", tf=17.0, tb=11.0)
            else:
                kb, f = 0.0, 0.0
                stance(h, free="L")
            curl(h, "L", CURL_GRIP)
            curl(h, "R", CURL_GRIP)
            ground(h)
            hang_bag(h, "R", bags["R"], 4.0)
            hang_bag(h, "L", bags["L"], -6.0)
            cr, cl = bag_clearance(h, bags["R"]), bag_clearance(h, bags["L"])
            if max(cr, cl) <= 0.0:
                break
            out += 1.5
        rep += f"arms out {out} head {hd} (err {err}) trail knee {kb:.0f} feet {f * 1000:+.0f} mm, bag clash R {cr * 1000:+.0f} L {cl * 1000:+.0f} mm"
    elif action == "at_counter":
        rigged.pose_figure(h, {"chest": (3, 0), "head": (9, -7), "fingers": 22,
                              "l_arm": (6, 5, 12), "r_arm": (19, 8, 30)})
        ground(h)
    elif action.startswith("walk"):
        lead = {"walk_up": "R", "walk_talk": "L", "walk_talk_w": "R", "walk_away": "R"}[action]
        if beat == "company" and name in ("Dawn", "T1"):
            lead = "L"
        sw = 14.0
        la, ra = ((-sw * 0.7, 6.0, 10.0), (sw, 7.0, 22.0)) if lead == "L" else ((sw, 6.0, 22.0), (-sw * 0.7, 7.0, 10.0))
        pose = {"chest": (4.0, 4.0 if lead == "L" else -4.0), "l_arm": la, "r_arm": ra, "fingers": 0}
        fwd = Vector((math.sin(h.rotation_euler.z), -math.cos(h.rotation_euler.z), 0.0))
        e = h.location + Vector((0, 0, 1.6))
        if action == "walk_up":            # a tourist looking up at the signs as he walks
            look = e + fwd * 6.0 + Vector((0.0, 0.0, 4.0)) + Vector((-1.5, 0, 0))
        elif action == "walk_talk":        # the couple talking: he turns to her
            look = (eye_centre(_STATE["holders"]["W1"]) + fwd * 1.2) if "W1" in _STATE["holders"] else e + fwd * 5.0
        elif action == "walk_talk_w":
            look = e + fwd * 6.0 + Vector((1.2, 0, -0.3))
        else:
            look = e + fwd * 8.0 + Vector((0, 0, -0.4))
        if beat == "company" and name in ("Organiser", "Dawn"):
            # A small glance toward one another, still seen from behind.
            turn = 12 if name == "Organiser" else -7
            look = e + Matrix.Rotation(math.radians(turn), 3, "Z") @ fwd * 6
        hd, err = solve_head(h, pose, look)
        front, back = rng.uniform(17.0, 21.0), rng.uniform(11.0, 14.0)
        if beat == "company" and name == "T1":
            front, back = 13.0, 8.0
        kb, f = legs_walk(h, lead, tf=front, tb=back)
        curl(h, "L", CURL_EASY)
        curl(h, "R", CURL_EASY)
        ground(h)
        rep += f"lead {lead} head {hd} (err {err}) trail knee {kb:.0f} feet {f * 1000:+.0f} mm"
    elif action == "stand_look":
        # an older man stopped at a shop window, hands clasped behind his back, looking at the goods
        pose = {"chest": (5.0, 0.0), "fingers": 30}
        hd, err = solve_head(h, pose, (-7.6, 33.9, 1.35))
        rig = rigged.rig_of(h)
        for side in (1, -1):
            k = "L" if side > 0 else "R"
            for bone, (fw, i) in (("upper_arm_fk", (-14, -10)), ("forearm_fk", (-22, 52)), ("hand_fk", (-26, 66))):
                rigged._aim(rig, f"{bone}.{k}", rigged._dir(0, fw, side, -i))
        stance(h, free="R", foot_fwd=0.05)
        ground(h)
        rep += f"head {hd} (err {err})"
    print("HK pose " + rep, flush=True)


def snapshot(holder):
    rig = rigged.rig_of(holder)
    return {b.name: b.matrix_basis.copy() for b in rig.pose.bones}, \
        {k: rig.pose.bones[f"thigh_parent.{k}"]["IK_FK"] for k in "LR"}


def restore(holder, snap):
    rig = rigged.rig_of(holder)
    mats, ikfk = snap
    for k, v in ikfk.items():
        rig.pose.bones[f"thigh_parent.{k}"]["IK_FK"] = v
    for b in rig.pose.bones:
        if b.name in mats:
            b.matrix_basis = mats[b.name]
    bpy.context.view_layer.update()


def facing(p, t):
    return math.degrees(math.atan2(t[0] - p[0], -(t[1] - p[1])))


def pose_cast(beat):
    H = _STATE["holders"]
    cache = _STATE["cache"]
    if beat in cache:
        for n, (loc, rz, snap) in cache[beat]["cast"].items():
            H[n].location = loc
            H[n].rotation_euler.z = rz
            restore(H[n], snap)
        for k, mw in cache[beat]["bags"].items():
            _STATE["bags"][k].matrix_world = mw
        bpy.context.view_layer.update()
        return
    order = ["W1", "M2", "T1", "M3", "M4", "Organiser", "ShopNear", "ShopFar", "Dawn"]
    for n in order:
        if n not in H or n not in BLOCK[beat]:
            continue
        (x, y), tgt, action = BLOCK[beat][n]
        h = H[n]
        h.location = (x, y, 0.0)
        h.rotation_euler = (0, 0, math.radians(facing((x, y), tgt)))
        bpy.context.view_layer.update()
        act(n, h, action, beat)
    cache[beat] = {"cast": {n: (h.location.copy(), h.rotation_euler.z, snapshot(h)) for n, h in H.items()},
                   "bags": {k: b.matrix_world.copy() for k, b in _STATE["bags"].items()}}


# ---------------------------------------------------------------- per camera
def which_camera():
    cam = bpy.context.scene.camera
    if cam is None:
        return None
    for n, c in CAMERAS.items():
        if (cam.location - Vector(c["loc"])).length < 1e-3:
            return n
    return None


def apply_camera(name, width=1280):
    cfg = CAMERAS.get(name, {})
    beat = cfg.get("beat", "walk")
    H = _STATE["holders"]
    if H:
        pose_cast(beat)
        only = cfg.get("only")
        eye = Vector(cfg.get("loc", (0, 0, 0)))
        forward = (Vector(cfg.get("aim", (0, 1, 0))) - eye).normalized()
        for n, h in H.items():
            vis = n in BLOCK[beat] and (only is None or n in only)
            # In the wide a whole walker is under 100 pixels high. Stacking two
            # level-two subdivisions on each scalp can exhaust memory across a
            # nine-person street. Keep full detail in portraits and reflections.
            depth = (h.location - eye).dot(forward)
            distant = depth > 0 and cfg.get("lens", 35) * width * 1.9 < 128 * 36 * depth
            for modifier, original in _STATE["subdivisions"][n]:
                modifier.render_levels = min(original, 1) if distant else original
            for o in [h] + list(h.children_recursive):
                o.hide_render = not vis
        # In the three-quarter view her reflected head looks like a second
        # person behind the satchel. Keep her reflection for the window insert.
        for obj in _STATE["dawn_glossy"]:
            obj.visible_glossy = name != "dawn"
        for bag in _STATE["bags"].values():
            for ob in [bag] + list(bag.children_recursive):
                ob.hide_render = beat == "company"
        face_key = st.LIGHTS.get("reflected cheek")
        if face_key is not None:
            face_key.hide_render = name != "window"
            if name == "window":
                face_key.location = eye_centre(H["Dawn"]) + Vector((0.42, -0.48, 0.18))
        e = bpy.data.objects.get("fx_dawn")
        if e is not None:
            e.location = eye_centre(H["Dawn"]) - Vector((0, 0, 0.25))
    for ln, li in st.LIGHTS.items():
        base = li.get("base_energy")
        if base is None:
            li["base_energy"] = li.data.energy
            base = li.data.energy
        li.data.energy = base * TRIMS.get(name, {}).get(ln, 1.0)
        view = {"display shelf return": "dawn", "boutique pavement spill": "wide",
                "display end bounce": "window"}.get(ln)
        if view is not None and name != view:
            li.data.energy = 0
        if ln.startswith(("spill_", "fill_", "canopy_", "bounce_")):
            li.visible_glossy = name not in ("window", "dawn")
    mt.M["sky"].node_tree.nodes["sky exposure"].inputs[1].default_value = cfg.get("sky_gain", 1.0)
    hz = st.OBJ.get("haze")
    if hz is not None:
        pv = next(n for n in hz.data.materials[0].node_tree.nodes if n.type == "PRINCIPLED_VOLUME")
        d = cfg.get("haze", 0.0035)
        pv.inputs["Density"].default_value = d
        hz.hide_render = d <= 0.0
    gl = mt.M.get("shop_glass")
    if gl is not None and "refl" in gl.node_tree.nodes:
        fresnel = gl.node_tree.nodes["refl"]
        fresnel.inputs["To Min"].default_value = cfg.get("glass_refl", 0.07)
        fresnel.inputs["To Max"].default_value = cfg.get("glass_grazing", 1.0)
        smudge = gl.node_tree.nodes["glass smudges"]
        smudge.inputs["To Min"].default_value = 0.025 if name == "window" else 0.02
        smudge.inputs["To Max"].default_value = 0.06 if name == "window" else 0.09
    for key in ("shop_interiors", "tubes", "signboards"):
        o = st.OBJ.get(key)
        if o is not None:
            o.visible_glossy = key not in cfg.get("hide_glossy", ())
    sc = bpy.context.scene
    sc.cycles.sample_clamp_indirect = 3.0
    sc.cycles.blur_glossy = 0.5
    sc.cycles.transparent_max_bounces = 16
    sc.cycles.max_bounces = 6
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH"),
                 ("denoising_input_passes", "RGB_ALBEDO_NORMAL")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    cam = sc.camera
    if cam is not None:
        cam.data.clip_start, cam.data.clip_end = 0.03, 600.0
        cam.data.shift_y = cfg.get("shift_y", 0.0)
    print(f"HK camera {name}: beat {beat}, shift {cfg.get('shift_y', 0.0)}, haze {cfg.get('haze', 0.0035)}, "
          f"only {cfg.get('only', 'all')}", flush=True)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        resolution = kw.get("res", args[2] if len(args) > 2 else (1920, 1080))
        apply_camera(which_camera(), resolution[0])
        kw.setdefault("world", WORLD)
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def build(cast=True):
    st.build(props, wide=WIDE_VIEW)
    # A shop doorway just behind the walking group throws warm light across
    # the nearer shoulder, carry handles and a short patch of wet sidewalk.
    door = Vector((7.15, 15.00, 1.94))
    lamp = st.area("boutique door spill", door, (0.66, 1.28), 142.0, (1.0, 0.59, 0.34),
                   Vector((5.57, 16.34, 0.84)) - door, spread=68)
    lamp.visible_glossy = False
    doorway_receivers = bpy.data.collections.new("Doorway light on Dawn and pavement")
    doorway_receivers.objects.link(bpy.data.objects["street_ground"])
    lamp.light_linking.receiver_collection = doorway_receivers
    # From across the road the lower shopfront throws a second, broader reflection
    # at her feet. Its light stays on the paving so her coat retains its shape.
    source = Vector((6.88, 15.55, 2.05))
    paving_light = st.area("boutique pavement spill", source, (1.5, 0.8), 280.0, (1.0, 0.70, 0.51),
                           Vector((5.56, 16.70, st.PZ)) - source, spread=90)
    paving_light.visible_glossy = False
    receivers = bpy.data.collections.new("Boutique pavement")
    receivers.objects.link(bpy.data.objects["street_ground"])
    paving_light.light_linking.receiver_collection = receivers
    # Low spill from the display's end return keeps the shadow detail in the
    # insert. The receiver set excludes the bags and the reflected face.
    source = Vector((7.50, 17.94, 1.66))
    end = Vector((8.46, 18.05, 1.38))
    bounce = st.area("display end bounce", source, (0.19, 0.65), 9.0, (1.0, 0.87, 0.72), end - source, spread=63)
    bounce.visible_glossy = False
    ends = bpy.data.collections.new("Boutique display edges")
    for surface in ("boutique", "boutique pane joint", "display felt sides"):
        ends.objects.link(bpy.data.objects[surface])
    bounce.light_linking.receiver_collection = ends
    for name, side, target_y in (("ShopNear", 1, 13.0), ("ShopFar", -1, 25.0)):
        mark, look = min(st._BASE["shopkeepers"][side], key=lambda pair: abs(pair[0].y-target_y))
        BLOCK["walk"][name] = ((mark.x, mark.y), (look.x, look.y), "at_counter")
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    _STATE["holders"], _STATE["cast"], _STATE["cache"], _STATE["bags"] = {}, [], {}, {}
    if cast:
        build_cast()
        bags = make_bags()
        # A warm bounce off the left side of the window models her cheek
        # against the felt. Position it from the posed eyes for the insert.
        face_key = st.area("reflected cheek", (0, 0, 0), (0.40, 0.26), 6.0,
                           (1.0, 0.85, 0.71), (-0.42, 0.48, -0.18), spread=60)
        face_receivers = bpy.data.collections.new("Window bounce on Dawn")
        face_receivers.objects.link(bpy.data.objects[_STATE["holders"]["Dawn"]["body"]])
        face_key.light_linking.receiver_collection = face_receivers
        face_key.visible_glossy = False
        for holder in [*bags.values(), _STATE["holders"]["Dawn"]]:
            for obj in holder.children_recursive:
                if obj.type in ("MESH", "CURVE"):
                    doorway_receivers.objects.link(obj)
        source = Vector((6.95, 16.58, 0.93))
        light = st.area("display shelf return", source, (0.75, 0.45), 28, (1.0, 0.76, 0.55),
                        Vector((6.55, 17.88, 0.65)) - source, spread=70)
        receivers = bpy.data.collections.new("Display return on bags and suit")
        for bag in bags.values():
            for obj in bag.children_recursive:
                if obj.type in ("MESH", "CURVE"):
                    receivers.objects.link(obj)
        for obj in _STATE["holders"]["Dawn"].children_recursive:
            if obj.type == "MESH" and "suit" in obj.name.lower():
                receivers.objects.link(obj)
        light.light_linking.receiver_collection = receivers
        light.visible_glossy = False
    install_hook()
