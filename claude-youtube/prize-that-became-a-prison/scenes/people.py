"""The film's people, built the same way in every stage so they match from scene to scene (continuity).

    import people
    d = people.dawn()                     # Dawn in 2014: blouse and skirt, plain muted colour, black flats
    p = people.dawn_prison()              # Dawn in detention / court / prison: plain grey casual suit
    a = people.officer("OfficerA", 0)     # officers: navy suit, black boots, the licence-clean peaked cap
    g = people.staff("Agent", 0)          # airline or hotel staff: dark suit, no cap
    t = people.tim()                      # Tim at the hearing and on the 2026 prison visit
    g = people.man("Gene", age=0.8)       # other men in muted casual suits

Each returns the cast holder empty, built at the origin facing -Y, for rigged.pose_figure and then placing.
Rules from the critiques: garments well below the stone skin's value (0.5) so they read as clothes, no shimmering pinstripe (garments are tinted flat: the colour is plain, the weave's relief
stays), no sneakers (plain black shoes), no logos, and no two people alike (variants differ in height, build, age and
suit tone).
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "noir-kit"))
import bpy  # noqa: E402,F401
import bmesh  # noqa: E402
from mathutils import Vector  # noqa: E402

import cast  # noqa: E402
import props  # noqa: E402

CAP = os.path.join(props.PROPS, "peaked-cap.glb")  # generated with Tripo on the author's account: licence-clean
BLACK_SHOE = (0.045, 0.043, 0.042)
PRISON_UNIFORM = "male_casualsuit03"  # loose collared shirt with full sleeves and straight trousers

# Fabric (measured 26 Nov 2026): next to the stone skin (0.5), a garment at 0.09 shows as mid grey on screen (18 % of
# white is mid grey), and Blender's default specular (0.5) under the films' big soft lights adds a grey sheen even to
# pure black. So every garment tone below is written as the colour it should *read*, and is multiplied by FABRIC_VALUE
# before use (0.075 umber becomes 0.03), with fabric-like specular and roughness. Shoes keep their own values.
FABRIC_VALUE = 0.4
FABRIC_SPEC, FABRIC_ROUGH = 0.2, 0.85


def fabric(holder):
    """Give every garment of a dressed figure fabric-like specular and roughness (call it if you dress someone
    yourself with cast.dress; the functions below do it already)."""
    for o in holder.children_recursive:
        if o.type != "MESH" or not o.name.startswith(holder.name + "_") or "_shoes" in o.name or "_body" in o.name:
            continue
        for slot in o.material_slots:
            if slot.material and slot.material.node_tree:
                b = next((n for n in slot.material.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
                if b:
                    b.inputs["Specular IOR Level"].default_value = FABRIC_SPEC
                    b.inputs["Roughness"].default_value = FABRIC_ROUGH


def _sculpt_hair(holder):
    """The shared cast's carved-strand bump reads as a ribbed knit beanie in a close-up: soften it to a sculpted,
    smooth stone (bump about 0.05, a broader combed undulation)."""
    hair = bpy.data.objects.get(holder["body"] + "_hair")
    if hair is not None:
        for face in hair.data.polygons:
            face.use_smooth = True
        smooth = hair.modifiers.new("soft scalp silhouette", "SUBSURF")
        smooth.levels = smooth.render_levels = 2
        hair.modifiers.move(len(hair.modifiers) - 1, 0)
        # Pose and contact solves evaluate the viewport mesh repeatedly. The
        # outer smooth pass needs its finest subdivision only at render time.
        hair.modifiers["smooth"].levels = 1
        hair.modifiers["hug"].offset = 0.0005
        hair.modifiers["thickness"].thickness = 0.002
    bun = bpy.data.objects.get(holder["body"] + "_bun")
    if bun is not None:
        centre = sum((v.co for v in bun.data.vertices), Vector()) / len(bun.data.vertices)
        for v in bun.data.vertices:
            d = v.co - centre
            v.co = centre + Vector((d.x, 0.78 * d.y - 0.024, 0.84 * d.z - 0.004))
        bun.data.update()
    m = hair.active_material if hair is not None else None
    if not m:
        return
    nt = m.node_tree
    for n in nt.nodes:
        if n.type == "BUMP":
            n.inputs["Strength"].default_value = 0.05
        elif n.type == "TEX_WAVE":
            n.inputs["Scale"].default_value = 22.0
            n.inputs["Distortion"].default_value = 4.0
            n.inputs["Detail"].default_value = 1.5
        elif n.type == "BSDF_PRINCIPLED":
            n.inputs["Roughness"].default_value = 0.62


def _dress(h, items, tint, flat):
    _sculpt_hair(h)
    tint = {k: (v if k.startswith("shoes") else tuple(c * FABRIC_VALUE for c in v)) for k, v in tint.items()}
    out = cast.dress(h, items, tint=tint, flat=flat)
    if "shoes04" in items:
        # The normal map on the stock upper includes an embossed toe stamp.
        shoes = bpy.data.objects[h.name + "_shoes04"]
        leather = cast.stone(h.name + " plain shoe leather", tint.get("shoes04", BLACK_SHOE), 0.55)
        leather.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.2
        for slot in shoes.material_slots:
            slot.material = leather
    fabric(h)
    return out

# officer variants: (height cm, age, weight, muscle, suit navy)
OFFICERS = [(179, 0.40, 0.55, 0.60, (0.055, 0.07, 0.115)),
            (171, 0.62, 0.68, 0.45, (0.065, 0.075, 0.105)),
            (184, 0.30, 0.45, 0.55, (0.05, 0.062, 0.1))]
# staff variants: (gender, height cm, age, suit tone)
STAFF = [(1.0, 176, 0.35, (0.09, 0.095, 0.11)), (0.0, 165, 0.42, (0.1, 0.1, 0.12))]


def _plain_flats(holder):
    """Fit the stock leather uppers to Dawn's bare ankles and remove the embossed toe texture."""
    shoes = bpy.data.objects[f"{holder.name}_shoes04"]
    mesh = bmesh.new()
    mesh.from_mesh(shoes.data)
    # The two sock cuffs belong to separate mesh islands. Trace them below the collar so
    # there is no second surface between the leather and the ankle.
    cuff = {v for v in mesh.verts if v.co.z > 0.14}
    pending = list(cuff)
    while pending:
        vertex = pending.pop()
        for edge in vertex.link_edges:
            neighbour = edge.other_vert(vertex)
            if neighbour not in cuff:
                cuff.add(neighbour)
                pending.append(neighbour)
    bmesh.ops.delete(mesh, geom=list(cuff), context="VERTS")
    for v in mesh.verts:
        if v.co.z > 0.047:
            v.co.z = 0.047 + (v.co.z - 0.047) * 0.70
    mesh.to_mesh(shoes.data)
    mesh.free()
    body = bpy.data.objects[holder["body"]]
    hidden = body.vertex_groups["Delete.shoes04"]
    hidden.remove([v.index for v in body.data.vertices if v.co.z > 0.050 and v.co.y > -0.14
                   and any(g.group == hidden.index for g in v.groups)])
    leather = cast.stone("plain black flats", (0.014, 0.013, 0.013), 0.57)
    leather.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.19
    for slot in shoes.material_slots:
        slot.material = leather


def dawn():
    """Dawn in 2014 (Ch 01-05, 11 memories): the blouse and skirt in a plain dark umber, black flats. Garments must sit
    well below the stone skin (0.5) in value, or the critic reads them as bare skin (taupe 0.33 failed)."""
    h = cast.person("Dawn", gender=0.0, height_cm=168, age=0.45, hair="bun")
    _dress(h, ["female_elegantsuit01", "shoes04"],
           tint={"female_elegantsuit01": (0.075, 0.058, 0.048), "shoes04": BLACK_SHOE},
           flat=("female_elegantsuit01", "shoes04"))
    _plain_flats(h)
    return h


def _fit_uniform(holder, suit):
    """Keep the cuff with the wrist and taper the trouser pattern around the knee."""
    rig = bpy.data.objects[holder["rig"]]
    rig_to_suit = suit.matrix_world.inverted() @ rig.matrix_world
    for side in ("L", "R"):
        digit_groups = {g.index: g for g in suit.vertex_groups
                        if g.name.endswith("." + side) and g.name.startswith(("DEF-f_", "DEF-thumb", "DEF-palm"))}
        forearm = suit.vertex_groups.get("DEF-forearm." + side + ".001") or suit.vertex_groups["DEF-forearm." + side]
        for v in suit.data.vertices:
            affected = [(digit_groups[g.group], g.weight) for g in v.groups if g.group in digit_groups]
            if affected:
                for group, weight in affected:
                    group.remove([v.index])
                forearm.add([v.index], sum(weight for _, weight in affected), "ADD")
        bones = rig.data.bones
        hip, knee, ankle = (rig_to_suit @ bones[f"DEF-{part}.{side}"].head_local for part in ("thigh", "shin", "foot"))
        for v in suit.data.vertices:
            z = v.co.z
            if v.co.x * knee.x <= 0 or abs(z - knee.z) >= 0.19:
                continue
            other = hip if z > knee.z else ankle
            centre = knee.lerp(other, (z - knee.z) / (other.z - knee.z))
            radial = v.co - centre
            radial.z = 0
            amount = min(0.016, max(0.0, (radial.length - 0.060) * 0.55))
            falloff = (1 - ((z - knee.z) / 0.19) ** 2) ** 2
            v.co -= radial.normalized() * amount * falloff
    suit.data.update()


def dawn_prison(*, uniform=False):
    """Dawn in detention, court and prison (Ch 06–08). Set uniform=True for the long-sleeved outfit.

    The default keeps the short-sleeved garment used by earlier shots. For stage-local mesh work,
    the long-sleeved garment's object name is holder.name + "_" + PRISON_UNIFORM.
    """
    h = cast.person("DawnPrison", gender=0.0, height_cm=168, age=0.5, weight=0.42, hair="bun")
    garment = PRISON_UNIFORM if uniform else "female_casualsuit01"
    outfit = _dress(h, [garment, "shoes04"], tint={garment: (0.075, 0.078, 0.082), "shoes04": BLACK_SHOE},
                    flat=(garment, "shoes04"))
    if uniform:
        # The stock work shirt has pinstripes and jeans hardware in its atlas. Keep the modelled
        # collar, cuffs, placket and hems, with plain cloth on the entire fitted garment.
        suit = outfit[0]
        # The female morph narrows the stock trouser ankles to 9 cm. Put ease back into
        # the pattern below the knee so the cuffs fall over the shoes and follow the rig.
        offsets = []
        for v in suit.data.vertices:
            ease = 0.023 * max(0.0, min(1.0, (0.68 - v.co.z) / 0.44))
            normal = v.normal.copy()
            normal.z = 0.0
            offsets.append(normal.normalized() * ease)
        for v, offset in zip(suit.data.vertices, offsets):
            v.co += offset
        suit.data.update()
        _fit_uniform(h, suit)
        for slot in suit.material_slots:
            bsdf = next(n for n in slot.material.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
            for link in list(bsdf.inputs["Normal"].links):
                slot.material.node_tree.links.remove(link)
            bsdf.inputs["Specular IOR Level"].default_value = 0.13
            bsdf.inputs["Roughness"].default_value = 0.91
        _plain_flats(h)
    return h


def officer(name, variant=0, cap=True):
    """An officer: navy suit, black boots, peaked cap. `variant` 0, 1, 2 give different men."""
    hcm, age, weight, muscle, navy = OFFICERS[variant % len(OFFICERS)]
    h = cast.person(name, gender=1.0, height_cm=hcm, age=age, weight=weight, muscle=muscle, hair="short")
    _dress(h, ["male_elegantsuit01", "shoes03"], tint={"male_elegantsuit01": navy, "shoes03": BLACK_SHOE},
           flat=("male_elegantsuit01", "shoes03"))
    if cap:
        cast.hat(h, CAP, rgb=(0.03, 0.035, 0.055))
        m = bpy.data.materials.get(f"hat_{name}")
        if m:  # wool crown: matt, or from above it reads as a bald head
            b = m.node_tree.nodes["Principled BSDF"]
            b.inputs["Roughness"].default_value = 0.88
            b.inputs["Specular IOR Level"].default_value = FABRIC_SPEC  # no grey sheen: the cap read as a pale disc
    return h


def staff(name, variant=0):
    """Airline or hotel staff: a plain dark suit, no cap. Variant 0 is a man, 1 a woman."""
    g, hcm, age, tone = STAFF[variant % len(STAFF)]
    h = cast.person(name, gender=g, height_cm=hcm, age=age, hair="short" if g > 0.5 else "bun")
    suit = "male_elegantsuit01" if g > 0.5 else "female_elegantsuit01"
    _dress(h, [suit, "shoes04"], tint={suit: tone, "shoes04": BLACK_SHOE}, flat=(suit, "shoes04"))
    return h


def _elegant_suit_tones(holder, jacket, shirt, tie, tie_padding=0):
    """Use the CC0 suit atlas to separate the collar and cuffs from the striped tie and jacket."""
    import numpy as np

    suit = bpy.data.objects[f"{holder.name}_male_elegantsuit01"]
    mat = suit.material_slots[0].material
    tree = mat.node_tree
    original = next(n for n in tree.nodes if n.type == "TEX_IMAGE" and n.image)
    source = original.image
    width, height = source.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    source.pixels.foreach_get(pixels)
    rgb = pixels.reshape(height, width, 4)[..., :3]
    value = rgb.max(axis=2)
    shirt_mask = (value > 0.42) & (value - rgb.min(axis=2) < 0.15)

    # In this atlas the knot and blades share a UV island between the collar points.
    # Close gaps across the pale stripes so the tie retains its shape in a flat colour.
    y = slice(int(0.80 * height), int(0.94 * height))
    x = slice(int(0.35 * width), int(0.43 * width))
    detail = rgb[y, x]
    navy = (detail[..., 2] - detail[..., 0] > 0.06) & (value[y, x] > 0.12)
    window = np.lib.stride_tricks.sliding_window_view
    grow = max(1, round(7 * width / 2048))
    trim = max(1, round(4 * width / 2048))
    grown = window(np.pad(navy, grow), (2 * grow + 1,) * 2).any(axis=(-2, -1))
    tie_mask = window(np.pad(grown, trim), (2 * trim + 1,) * 2).all(axis=(-2, -1))
    padding = round(tie_padding * width / 2048)
    if padding > 0:
        tie_mask = window(np.pad(tie_mask, padding), (2 * padding + 1,) * 2).any(axis=(-2, -1))

    # Replace the source pattern with three constant film colours while preserving its UVs
    # and the fitted garment's existing shading. Pack the image for callers that save a scene.
    out = np.empty((height, width, 4), dtype=np.float32)
    out[..., 3] = 1
    colour = out[..., :3]
    colour[:] = np.asarray(jacket) * FABRIC_VALUE
    colour[shirt_mask] = np.asarray(shirt) * FABRIC_VALUE
    colour[y, x][tie_mask] = np.asarray(tie) * FABRIC_VALUE
    atlas = bpy.data.images.new(f"{holder.name} plain suit tones", width, height, alpha=False)
    atlas.colorspace_settings.name = "Non-Color"
    atlas.pixels.foreach_set(out.ravel())
    atlas.pack()
    plain = tree.nodes.new("ShaderNodeTexImage")
    plain.image = atlas
    if original.inputs["Vector"].is_linked:
        tree.links.new(original.inputs["Vector"].links[0].from_socket, plain.inputs["Vector"])
    bsdf = next(n for n in tree.nodes if n.type == "BSDF_PRINCIPLED")
    tree.links.new(plain.outputs["Color"], bsdf.inputs["Base Color"])


def man(name, height_cm=178, age=0.5, weight=0.55, suit="male_casualsuit05", tone=(0.12, 0.115, 0.11), shoes="shoes01",
        *, shirt_tone=None, tie_tone=None, tie_padding=0):
    """Build a man in a casual or elegant suit. On male_elegantsuit01, shirt_tone and tie_tone
    can override the jacket tone independently. tie_padding extends the tie colour at the edge,
    measured in pixels on the 2048-wide atlas."""
    split = shirt_tone is not None or tie_tone is not None
    if split and suit != "male_elegantsuit01":
        raise ValueError("shirt_tone and tie_tone require male_elegantsuit01")
    h = cast.person(name, gender=1.0, height_cm=height_cm, age=age, weight=weight, hair="short")
    _dress(h, [suit, shoes], tint={suit: tone, shoes: (0.09, 0.07, 0.055)}, flat=(suit,))
    if split:
        _elegant_suit_tones(h, tone, tone if shirt_tone is None else shirt_tone,
                           tone if tie_tone is None else tie_tone, tie_padding)
    return h


def tim_jaw(holder):
    """Give Tim the same lower-face structure at each age, fitted to his morphed chin."""
    body = bpy.data.objects[holder["body"]]
    rig = bpy.data.objects[holder["rig"]]
    chin = body.matrix_world.inverted() @ rig.matrix_world @ rig.data.bones["DEF-chin"].head_local
    groups = {g.index for g in body.vertex_groups
              if g.name in ("DEF-spine.004", "DEF-spine.005", "DEF-spine.006")
              or g.name.startswith(("DEF-jaw", "DEF-chin", "DEF-cheek.B", "DEF-lip.B"))}
    if body.data.shape_keys is None:
        body.shape_key_add(name="Basis")
    # The rig already fits his age and stature. The Basis skull can be more than
    # 10 cm lower. Measure on the mixed rest shape, then store only our lateral
    # displacement relative to Basis so those existing morphs are applied once.
    shape = body.shape_key_add(name="Mature neck and jaw", from_mix=True)
    count = 0
    for vertex, point, base in zip(body.data.vertices, shape.data, shape.relative_key.data):
        x, _, z = point.co
        point.co = base.co
        dz = z - chin.z
        neck = max(0.0, 1 - ((dz + 0.039) / 0.049) ** 2) ** 2
        jaw = max(0.0, 1 - ((dz - 0.022) / 0.040) ** 2) ** 2
        width = max(0.12 * neck, 0.08 * jaw)
        if width == 0:
            continue
        weight = min(1.0, sum(g.weight for g in vertex.groups if g.group in groups))
        point.co.x += (x - chin.x) * width * weight
        if weight > 0:
            count += 1
    shape.value = 1.0
    print(f"CAST Tim jaw and neck profile: {count} vertices", flush=True)


def _tim_hairline(holder, lift=((0, 0.02), (16, 0.024), (32, 0.034), (48, 0.02), (62, 0.0)), volume=0.0065):
    """A man of 55: the sculpted short hair's front hairline raised, further at the temples than in the middle (a
    receding M), and the hair thinner over the skull (a close crop, not a cap). The shell's faces under the new line
    are cut, the new edge snapped onto it and eased, and the volume weights (which taper the shell to nothing at its
    edge) recomputed from the new edge. Mesh coordinates are the body's rest space (the head faces -Y)."""
    hair = bpy.data.objects.get(f"{holder['body']}_hair")
    if hair is None:
        return
    bm = bmesh.new()
    bm.from_mesh(hair.data)
    zs = [v.co.z for v in bm.verts]
    ztop = max(zs)
    crown = [v.co for v in bm.verts if v.co.z > ztop - 0.06]
    cx = sum(c.x for c in crown) / len(crown)
    cy = sum(c.y for c in crown) / len(crown)

    def ang(co):
        return abs(math.degrees(math.atan2(co.x - cx, -(co.y - cy))))
    edge = sorted((ang(v.co), v.co.z) for v in bm.verts if v.is_boundary)

    def old_line(d):
        best = min(edge, key=lambda e: abs(e[0] - d))
        near = [z for a_, z in edge if abs(a_ - best[0]) < 3.0]
        return sum(near) / len(near)

    def extra(d):
        for (d0, z0), (d1, z1) in zip(lift, lift[1:]):
            if d <= d1:
                t = (d - d0) / (d1 - d0)
                t = t * t * (3 - 2 * t)
                return z0 + (z1 - z0) * t
        return 0.0
    base = {d: old_line(d) for d in range(0, 64, 2)}

    def line(d):
        d0 = min(62, int(d) // 2 * 2)
        return base[d0] + extra(d)
    kill = [f for f in bm.faces if ang(f.calc_center_median()) < 62 and f.calc_center_median().z < line(ang(f.calc_center_median()))]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    edge_v = [v for v in bm.verts if v.is_boundary]
    for v in edge_v:
        d = ang(v.co)
        if d < 62:
            v.co.z = max(v.co.z, line(d))
    ring = {e.other_vert(v) for v in edge_v for e in v.link_edges} - set(edge_v)
    bmesh.ops.smooth_vert(bm, verts=list(ring), factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.verts.index_update()
    bm.verts.ensure_lookup_table()
    from mathutils.kdtree import KDTree
    boundary = [v for v in bm.verts if v.is_boundary]
    edge_tree = KDTree(len(boundary))
    for v in boundary:
        edge_tree.insert(v.co, v.index)
    edge_tree.balance()
    distances = {v.index: edge_tree.find(v.co)[2] for v in bm.verts}
    bm.to_mesh(hair.data)
    bm.free()
    volume_group = hair.vertex_groups.get("volume")
    clumps = hair.vertex_groups.new(name="hair_clumps")
    for i, distance in distances.items():
        t = min(1.0, distance / 0.025)
        if volume_group is not None:
            volume_group.add([i], t * t * (3 - 2 * t), "REPLACE")
        clumps.add([i], max(0.0, min(1.0, (distance - 0.015) / 0.018)), "REPLACE")
    md = hair.modifiers.get("volume")
    if md is not None:
        md.strength = volume
    print(f"CAST Tim's hairline raised: {len(kill)} faces cut, front edge now {line(0):.3f} m "
          f"(was {base[0]:.3f}), temples {line(32):.3f} (was {base[32]:.3f})", flush=True)


def tim(*, shirt_tone=None, tie_tone=None, tie_padding=0):
    """Tim in the 2024–26 testimony and visit. Both sets use the same build, jaw and receding hairline."""
    holder = man("Tim", age=0.78, weight=0.7, suit="male_elegantsuit01", tone=(0.09, 0.09, 0.1),
                 shirt_tone=shirt_tone, tie_tone=tie_tone, tie_padding=tie_padding)
    tim_jaw(holder)
    _tim_hairline(holder)
    return holder
