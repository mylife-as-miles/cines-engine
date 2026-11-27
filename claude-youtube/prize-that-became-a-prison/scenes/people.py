"""The film's people, built the same way in every stage so they match from scene to scene (continuity).

    import people
    d = people.dawn()                     # Dawn in 2014: blouse and skirt, plain muted colour, black flats
    p = people.dawn_prison()              # Dawn in detention / court / prison: plain grey casual suit
    a = people.officer("OfficerA", 0)     # officers: navy suit, black boots, the licence-clean peaked cap
    g = people.staff("Agent", 0)          # airline or hotel staff: dark suit, no cap
    t = people.man("Tim", age=0.55)       # other men (Tim, Gene, the trip's organisers): muted casual suit

Each returns the cast holder empty, built at the origin facing -Y, for rigged.pose_figure and then placing.
Rules from the critiques: garments well below the stone skin's value (0.5) so they read as clothes, no shimmering pinstripe (garments are tinted flat: the colour is plain, the weave's relief
stays), no sneakers (plain black shoes), no logos, and no two people alike (variants differ in height, build, age and
suit tone).
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "noir-kit"))
import bpy  # noqa: E402,F401
import bmesh  # noqa: E402

import cast  # noqa: E402
import props  # noqa: E402

CAP = os.path.join(props.PROPS, "peaked-cap.glb")  # generated with Tripo on the author's account: licence-clean
BLACK_SHOE = (0.045, 0.043, 0.042)

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


def _dress(h, items, tint, flat):
    tint = {k: (v if k.startswith("shoes") else tuple(c * FABRIC_VALUE for c in v)) for k, v in tint.items()}
    out = cast.dress(h, items, tint=tint, flat=flat)
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


def dawn_prison():
    """Dawn in detention, court and prison (Ch 06-08): the casual suit in flat institutional grey, black flats."""
    h = cast.person("DawnPrison", gender=0.0, height_cm=168, age=0.5, weight=0.42, hair="bun")
    _dress(h, ["female_casualsuit01", "shoes04"],
           tint={"female_casualsuit01": (0.075, 0.078, 0.082), "shoes04": BLACK_SHOE},
           flat=("female_casualsuit01", "shoes04"))
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


def man(name, height_cm=178, age=0.5, weight=0.55, suit="male_casualsuit05", tone=(0.12, 0.115, 0.11), shoes="shoes01"):
    """Any other man (Tim at the hearing in male_elegantsuit01 charcoal; Gene; the organisers in casual suits)."""
    h = cast.person(name, gender=1.0, height_cm=height_cm, age=age, weight=weight, hair="short")
    _dress(h, [suit, shoes], tint={suit: tone, shoes: (0.09, 0.07, 0.055)}, flat=(suit,))
    return h
