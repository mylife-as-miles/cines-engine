"""Stage: the Void Stage (20 % of the film: Ch 07 the sentence, Ch 08 what twelve years can take, Ch 11 the end).

An infinite black stage: a black-painted hardboard floor that runs off into the dark on every side, one hard spotlight
straight down from high above, faint haze that gives the beam its cone, nothing else unless the beat needs it.

    <bpy python> -I scenes/shoot.py -- void_stage <cam> out.png [--nocast]

Three islands stand far apart on the one floor, each under its own spot, and a hook on setkit.render shows only the
island the camera's beat needs (shoot.py calls render once per camera, so `--cam all` works):

- Ch 07 (dawn, dawn_high): Dawn alone in the pool of light in her prison greys (flat charcoal), standing straight,
  only her head bowed, arms hanging.
- Ch 08 (cell_close, cell_far): the cell as a lit box: a slab, three painted-block walls (the fourth open, as on a
  set), no ceiling, a painted steel bunk along one wall with its bedding, a wall desk and stool, a stainless
  toilet-basin unit in the back corner, a steel shelf, a narrow high window slot whose five bars the night light lays
  across the floor through a faint shaft of haze. The top spot lands inside the walls (they fall off upward into the
  dark); a graze of the same lamp draws the wall tops as a fine line, so from far back the box reads small in the
  black.
- Ch 11 (bags): the two bags, Dawn's charcoal case standing and the black duffel on its side, alone in the spotlight.

Every spot has a soft inner cone (a pool brighter at its centre than its edge) and haze only round its cone, drifting
a little. Set and materials in void_stage_set.py, the cell's furniture and dressing in void_stage_cell.py. Dawn comes
from scenes/people.py (the film's shared cast); this stage only finishes, fits, poses and places her.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import people  # noqa: E402
import props  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import void_stage_cell as vc  # noqa: E402
import void_stage_set as st  # noqa: E402

EXPOSURE = -1.5

# the three islands, far apart on the one floor (x, y of each island's centre)
AT = {"dawn": (0.0, 0.0), "cell": (40.0, 0.0), "bags": (-40.0, 0.0)}

# the spots: height above the island, offset of the lamp toward the camera (-y), pool radius on the floor, watts
# (E = P / (4 pi d^2); the stone skin's crown and the cell's floor land near 1.0 and 0.5 after the exposure). Each has
# a soft inner cone from the same point (st.hotspot) so the pool is about a third brighter at its centre than its edge.
SPOTS = {
    # high (9.5 m) and narrow, so the cone visibly tapers over her head instead of standing behind her like a curtain
    "dawn": dict(h=9.5, fwd=1.4, pool=1.2, watts=18500.0, blend=0.28),
    # the cell's lamp over the middle, its cone an ellipse that lands just inside the walls: the floor and the wall
    # bases lit, the walls falling off upward into the dark, no spill on the stage outside
    "cell": dict(h=7.6, fwd=0.0, pool=(1.42, 1.98), watts=13500.0, blend=0.25),
    "bags": dict(h=5.8, fwd=0.2, pool=1.15, watts=7500.0, blend=0.28),
}
# faint: 0.02-0.03 read as a grey wall behind the subject (round 1); the beam should be a ghost, not a slab. The dawn
# and bags haze fills only a frustum round the cone, drifting a little in density
HAZE = {"dawn": 0.010, "cell": 0.006, "bags": 0.010}
SHAFT_HAZE = 0.02    # a denser slab along the window's light, so a faint shaft joins window and patch

DAWN_TURN = 18.0     # she faces the camera, turned a little to frame right (deg from facing -Y)
# only the head bowed (18); the chest and neck nearly upright so the spine stays vertical from above (round 2 read as
# a stoop); arms hanging loose, elbows soft, the hands just in front of the outer thighs, wrists straight, fingers
# relaxed (40 read as claws)
POSE = {"head": (18, 3), "neck": (4, 0), "chest": (2.5, 0), "l_arm": (5, 7, 9), "r_arm": (6, 6, 8), "fingers": 16}
# legs straight (FK): her weight on the right leg, its knee locked; the left (free) knee soft, its foot a little out
LEGS = {"R": dict(thigh=(0.0, 1.5), shin=(0.0, 1.5)), "L": dict(thigh=(3.0, 3.5), shin=(-1.5, 3.5))}
SUIT_RGB = (0.034, 0.035, 0.038)   # flat charcoal prison greys (people.dawn_prison's tint, read on screen as cloth)

# the bags (island-local x, y, turn): the case standing, its front pocket turned three-quarters to the lens; the
# duffel on its side beside it, a little forward, angled; a hand's width of lit floor between them from the lens
CASE = (-0.32, 0.10, -58.0)
DUFFEL = (0.30, -0.18, 17.0)

D, C, G = AT["dawn"], AT["cell"], AT["bags"]


def _p(base, x, y, z):
    return (base[0] + x, base[1] + y, z)


FOCUS = {
    "fx_dawn": _p(D, 0.0, 0.0, 1.35),
    "fx_dawn_high": _p(D, 0.0, 0.0, 0.9),
    "fx_cell_close": _p(C, -0.6, 0.5, 1.0),
    "fx_cell_far": _p(C, 0.0, 0.0, 1.2),
    "fx_bags": _p(G, 0.0, 0.0, 0.3),
}
CAMERAS = {
    # Ch 07: Dawn alone in the pool of light, square on at chest height from the dark: the beam coming down out of the
    # black onto her bowed head, her shadow pooled at her feet, black on every side
    "dawn": dict(loc=_p(D, 0.0, -7.6, 1.2), aim=_p(D, 0.0, 0.0, 1.02), lens=50, focus="fx_dawn", fstop=4.0,
                 beat="dawn"),
    # Ch 07 (added): from high and to one side, looking down: a small figure on the floor's circle of light, the
    # stage running off into the dark around her
    "dawn_high": dict(loc=_p(D, 3.6, -5.3, 6.1), aim=_p(D, 0.0, -0.1, 0.55), lens=40, focus="fx_dawn_high",
                      fstop=5.6, beat="dawn"),
    # Ch 08: inside the cell from just off the open side, level at standing height (verticals stay vertical; the frame
    # is lowered by lens shift), looking diagonally into the back-left corner: the desk and the bunk down the left
    # wall, the window slot high in the back wall and its barred patch on the floor, the steel unit in the corner,
    # the right wall a thin strip with its shelf
    "cell_close": dict(loc=_p(C, 1.0, -2.0, 1.45), aim=_p(C, -1.2, 1.6, 1.45), lens=20, focus="fx_cell_close",
                       fstop=5.6, beat="cell", shift=(0.0, -0.1)),
    # Ch 08: far back and a little above: the lit cell a small open box in the black, the beam standing over it
    "cell_far": dict(loc=_p(C, 2.5, -23.5, 6.2), aim=_p(C, 0.0, 0.2, 1.55), lens=50, focus="fx_cell_far", fstop=8.0,
                     beat="cell"),
    # Ch 11: the end: the two bags alone in the spotlight on black, low, so they rise against the dark above the
    # pool's far edge; the beam behind them
    "bags": dict(loc=_p(G, 0.15, -4.7, 0.55), aim=_p(G, 0.02, 0.0, 0.33), lens=50, focus="fx_bags", fstop=4.0,
                 beat="bags"),
}

# a preview run may render only some cameras: VOID_CAMS="dawn,cell_close" (shoot.py's `all` walks CAMERAS)
if os.environ.get("VOID_CAMS"):
    CAMERAS = {k: v for k, v in CAMERAS.items() if k in os.environ["VOID_CAMS"].split(",")}

_STATE = {"groups": {}, "cast": []}


# ---------------------------------------------------------------- Dawn

def hands_stone(holder, value=0.4):
    """The hands a shade darker stone than the face (as in the inspection room): under a top light the backs of the
    hands face the lamp and the face does not. A soft mask from the hands' deform weights, so no seam at the wrist."""
    body = bpy.data.objects[holder["body"]]
    gi = {g.index for g in body.vertex_groups if any(k in g.name for k in ("hand", "f_", "thumb", "palm"))}
    if not gi:
        return 0
    me = body.data
    attr = me.color_attributes.new("handmask", "FLOAT_COLOR", "POINT")
    for v in me.vertices:
        w = min(1.0, sum(g.weight for g in v.groups if g.group in gi))
        attr.data[v.index].color = (w, w, w, 1.0)
    m = me.materials[0]
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    at = nt.nodes.new("ShaderNodeAttribute")
    at.attribute_name = "handmask"
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    a_in = next(s for s in mix.inputs if s.name == "A" and s.enabled)
    b_in = next(s for s in mix.inputs if s.name == "B" and s.enabled)
    f_in = next(s for s in mix.inputs if s.name == "Factor" and s.enabled)
    src = b.inputs["Base Color"]
    if src.is_linked:
        nt.links.new(src.links[0].from_socket, a_in)
    else:
        a_in.default_value = src.default_value
    b_in.default_value = (value, value, value * 1.01, 1.0)
    nt.links.new(at.outputs["Fac"], f_in)
    out = next(s for s in mix.outputs if s.name == "Result" and s.enabled)
    nt.links.new(out, src)
    return 1


GARMENT = "female_casualsuit01"
# vertex groups that stay skin whatever the suit does: neck, head, hands, feet
KEEP = ("DEF-spine.004", "DEF-spine.005", "DEF-spine.006", "DEF-hand", "DEF-palm", "DEF-f_", "DEF-thumb", "DEF-foot",
        "DEF-toe")


def prison_suit(holder, rgb=SUIT_RGB):
    """The casual suit finished as flat charcoal cotton and denim. Round 2 failed here: the earlier finish kept a 0.3
    white sheen, and under a top light seen from the side (grazing light on every front-facing surface) the sheen,
    not the 0.03 cloth, set the value, so the suit rendered as light as the 0.5 stone skin wherever it faced the
    lens; only the faces turned away from the lamp (under the bust, the crotch, the hems) read dark, a leotard on a
    nude. Now: no sheen, low specular, the baked AO kept in the colour (seams and folds), a fine weave bump."""
    ob = bpy.data.objects.get(f"{holder.name}_{GARMENT}")
    if ob is None:
        print(f"VOID no garment {holder.name}_{GARMENT}", flush=True)
        return None
    for slot in ob.material_slots:
        m = slot.material
        if not (m and m.use_nodes):
            continue
        nt = m.node_tree
        b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if b is None:
            continue
        for sock in ("Base Color", "Roughness", "Normal", "Alpha", "Specular IOR Level", "Sheen Weight", "Coat Weight"):
            for ln in list(b.inputs[sock].links):
                nt.links.remove(ln)
        ao = next((n for n in nt.nodes if n.type == "TEX_IMAGE" and n.image and "_ao" in n.image.name), None)
        tc = nt.nodes.new("ShaderNodeTexCoord")
        if ao is not None:
            # the AO bake, softened (0.75-1.0), times the flat charcoal
            mr = st._maprange(nt, ao.outputs["Color"], 0.0, 1.0, 0.62, 1.0)
            nt.links.new(st._mix(nt, 1.0, rgb, mr, "MULTIPLY"), b.inputs["Base Color"])
        else:
            b.inputs["Base Color"].default_value = (*rgb, 1)
        b.inputs["Alpha"].default_value = 1.0
        b.inputs["Roughness"].default_value = 0.9
        b.inputs["Specular IOR Level"].default_value = 0.14
        b.inputs["Sheen Weight"].default_value = 0.0
        b.inputs["Coat Weight"].default_value = 0.0
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 420.0
        nz.inputs["Detail"].default_value = 2.0
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = 0.25
        bp.inputs["Distance"].default_value = 0.0004
        nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return ob


def _move_after_armature(ob, mod):
    idx = next(i for i, m in enumerate(ob.modifiers) if m.type == "ARMATURE")
    cur = list(ob.modifiers).index(mod)
    if cur != idx + 1:
        ob.modifiers.move(cur, idx + 1)


def suit_fit(holder, push=0.004, tuck=0.008):
    """Keep the stone body under the suit everywhere, from every camera, after posing. The suit follows the same rig
    as the body (checked); it is pushed out along its normals by `push` before its smoothing, and every body vertex the
    suit covers (an outward ray meets the suit within 4 cm, or the suit lies just under the skin) goes into a group
    'under_suit', feathered over three edge rings from the uncovered skin so hems keep no step and no hole, and is
    pulled in by `tuck` (a Displace on the body, after its armature). A Displace rather than a Mask: a mask that
    removes skin at a hem opens a gap you can see into."""
    from mathutils.bvhtree import BVHTree
    body = bpy.data.objects[holder["body"]]
    gar = bpy.data.objects.get(f"{holder.name}_{GARMENT}")
    if gar is None:
        return 0
    rig = bpy.data.objects[holder["rig"]]
    arm = next((m for m in gar.modifiers if m.type == "ARMATURE"), None)
    if arm is None:
        arm = gar.modifiers.new("Armature", "ARMATURE")
        gar.modifiers.move(len(gar.modifiers) - 1, 0)
    if arm.object is not rig:
        print(f"VOID suit armature was {arm.object.name if arm.object else None}: set to {rig.name}", flush=True)
        arm.object = rig
    dp = gar.modifiers.new("standoff", "DISPLACE")
    dp.direction, dp.mid_level, dp.strength = "NORMAL", 0.0, push
    _move_after_armature(gar, dp)
    # evaluate the body with its armature only (vertex order = the mesh's) and the suit without its smoothing
    off = [(m, m.show_viewport) for m in body.modifiers if m.type != "ARMATURE"]
    off += [(m, m.show_viewport) for m in gar.modifiers if m.type == "SUBSURF"]
    for m, _ in off:
        m.show_viewport = False
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ge = gar.evaluated_get(dg)
    gm = ge.to_mesh()
    gw = gar.matrix_world
    bvh = BVHTree.FromPolygons([gw @ v.co for v in gm.vertices], [tuple(p.vertices) for p in gm.polygons])
    ge.to_mesh_clear()
    be = body.evaluated_get(dg)
    bme = be.to_mesh()
    bw, n3 = body.matrix_world, body.matrix_world.to_3x3()
    pos = [(bw @ v.co, (n3 @ v.normal).normalized()) for v in bme.vertices]
    be.to_mesh_clear()
    for m, vis in off:
        m.show_viewport = vis
    me = body.data
    if len(pos) != len(me.vertices):
        print(f"VOID suit fit skipped: evaluated {len(pos)} vs mesh {len(me.vertices)} vertices", flush=True)
        return 0
    gi_body = body.vertex_groups["body"].index if "body" in body.vertex_groups else None
    keep_g = {g.index for g in body.vertex_groups if any(g.name.startswith(k) for k in KEEP)}
    covered, skin = set(), set()
    for v in me.vertices:
        ws = {e.group: e.weight for e in v.groups}
        if gi_body is not None and ws.get(gi_body, 0.0) < 0.5:
            continue
        skin.add(v.index)
        if sum(w for g, w in ws.items() if g in keep_g) > 0.3:
            continue
        p, n = pos[v.index]
        out = bvh.ray_cast(p + n * 0.0005, n, 0.04)
        inn = bvh.ray_cast(p - n * 0.0005, -n, 0.015)
        if out[0] is not None or inn[0] is not None:
            covered.add(v.index)
    # feather: edge steps from the nearest uncovered skin vertex
    nbr = {i: [] for i in skin}
    for e in me.edges:
        a, c = e.vertices
        if a in nbr and c in nbr:
            nbr[a].append(c)
            nbr[c].append(a)
    dist = {i: 0 for i in skin if i not in covered}
    front = list(dist)
    while front:
        nxt = []
        for i in front:
            for j in nbr[i]:
                if j not in dist:
                    dist[j] = dist[i] + 1
                    nxt.append(j)
        front = nxt
    vg = body.vertex_groups.get("under_suit") or body.vertex_groups.new(name="under_suit")
    for i in covered:
        vg.add([i], min(1.0, dist.get(i, 9) / 3.0), "REPLACE")
    tk = body.modifiers.new("tuck", "DISPLACE")
    tk.direction, tk.mid_level, tk.strength, tk.vertex_group = "NORMAL", 0.0, -tuck, "under_suit"
    _move_after_armature(body, tk)
    print(f"VOID suit fit: {len(covered)} of {len(skin)} skin vertices tucked under the suit; suit pushed out "
          f"{push * 1000:.0f} mm; body stack {[m.name for m in body.modifiers]}; suit stack "
          f"{[m.name for m in gar.modifiers]}", flush=True)
    return len(covered)


def stone_finish(holder, spec=0.3, rough=0.66):
    """A shade less specular stone for Dawn under the hard top spot: at 0.5 the bowed head's nose bridge caught the
    lamp as a white speck in the shadowed face."""
    body = bpy.data.objects[holder["body"]]
    for slot in body.material_slots:
        m = slot.material
        b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m and m.use_nodes else None
        if b is not None:
            b.inputs["Specular IOR Level"].default_value = spec
            b.inputs["Roughness"].default_value = rough


def straight_wrists(holder, pose):
    """rigged.pose_figure bends each hand 4 degrees forward of its forearm: line them up (straight wrists)."""
    rig = rigged.rig_of(holder)
    for side, k, key in ((1, "L", "l_arm"), (-1, "R", "r_arm")):
        fwd, out, elbow = pose[key]
        rigged._aim(rig, f"hand_fk.{k}", rigged._dir(0, fwd + elbow, side, out * 0.6))


def stand_legs(holder, legs=LEGS):
    """Straight legs on FK (the IK rest pose keeps a 7.5 degree knee bend, which read as a stoop from above): each
    thigh and shin aimed (forward, out), the feet kept flat as at rest."""
    rig = rigged.rig_of(holder)
    pb = rig.pose.bones
    for k in ("L", "R"):
        if f"thigh_parent.{k}" in pb:
            pb[f"thigh_parent.{k}"]["IK_FK"] = 1.0
    bpy.context.view_layer.update()
    for side, k in ((1, "L"), (-1, "R")):
        foot = pb[f"foot_fk.{k}"]
        fdir = (foot.matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
        cfg = legs[k]
        rigged._aim(rig, f"thigh_fk.{k}", rigged._dir(0, cfg["thigh"][0], side, cfg["thigh"][1]))
        rigged._aim(rig, f"shin_fk.{k}", rigged._dir(0, cfg["shin"][0], side, cfg["shin"][1]))
        rigged._aim(rig, f"foot_fk.{k}", fdir)
    mw = rig.matrix_world
    for k in ("L", "R"):
        hip, knee, ank = (mw @ pb[f"DEF-thigh.{k}"].head, mw @ pb[f"DEF-shin.{k}"].head, mw @ pb[f"DEF-foot.{k}"].head)
        flex = math.degrees((knee - hip).angle(ank - knee))
        print(f"VOID leg {k}: knee flex {flex:.1f} deg, ankle ({ank.x:+.3f}, {ank.y:+.3f})", flush=True)


def ground(holder, floor_z=0.0):
    """Stand a figure on the floor: its lowest point (the soles) at floor_z."""
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    lo = 1e9
    for o in [holder] + list(holder.children_recursive):
        if o.type != "MESH":
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = o.matrix_world
        lo = min([lo] + [(mw @ v.co).z for v in me.vertices])
        ev.to_mesh_clear()
    holder.location.z += floor_z - lo
    bpy.context.view_layer.update()
    return floor_z - lo


def dawn():
    h = people.dawn_prison()
    prison_suit(h)
    stone_finish(h)
    hands_stone(h)
    rigged.pose_figure(h, POSE)
    straight_wrists(h, POSE)
    stand_legs(h)
    rig = rigged.rig_of(h)
    pb = rig.pose.bones
    mw = rig.matrix_world
    hip, neck = mw @ pb["DEF-spine"].head, mw @ pb["DEF-spine.004"].head
    print(f"VOID spine lean {math.degrees(math.atan2(hip.y - neck.y, neck.z - hip.z)):.1f} deg forward", flush=True)
    suit_fit(h)
    h.location = (D[0], D[1], 0.0)
    h.rotation_euler = (0, 0, math.radians(DAWN_TURN))
    bpy.context.view_layer.update()
    dz = ground(h)
    print(f"VOID Dawn grounded by {dz * 1000:+.1f} mm", flush=True)
    return h


# ---------------------------------------------------------------- props

def _meshes(h):
    return [o for o in h.children_recursive if o.type == "MESH"]


def _finish(h, spec=None, ceiling=None):
    seen = set()
    for o in _meshes(h):
        for slot in o.material_slots:
            if slot.material and slot.material.name not in seen:
                seen.add(slot.material.name)
                st.tune_prop(slot.material, spec=spec, ceiling=ceiling)


def bags():
    """The two bags with the inspection room's grade and finish (the sheen, not the colour, is what reads grey)."""
    gx, gy = G
    x, y, t = CASE
    case = props.load("dawn-suitcase", size=0.66, axis="z", loc=(gx + x, gy + y, 0.0), turn_deg=t, sat=0.6, val=0.9,
                      rough_add=0.15)
    _finish(case, spec=0.2, ceiling=(0.05, 0.052, 0.058))
    x, y, t = DUFFEL
    duf = props.load("extra-bag-closed", size=0.75, axis="long", loc=(gx + x, gy + y, 0.0), turn_deg=t, sat=0.5,
                     val=0.35, rough_add=0.3)
    _finish(duf, spec=0.12)
    return [case, duf]


# ---------------------------------------------------------------- build

def _island(name, fn):
    before = set(bpy.data.objects)
    fn()
    new = [o for o in bpy.data.objects if o not in before]
    _STATE["groups"].setdefault(name, []).extend(new)


def _spot_and_haze(name, aim_xy, aim_z=0.0):
    """One hard top spot (with its soft hotspot cone) and haze in a frustum round its cone only."""
    cfg = SPOTS[name]
    ax, ay = aim_xy
    lamp = (ax, ay - cfg["fwd"], cfg["h"])
    aim = (ax, ay, aim_z)
    reach = math.dist(lamp, aim)
    size = 2 * math.degrees(math.atan(cfg["pool"] / reach))
    main = st.spot(f"spot_{name}", lamp, aim, cfg["watts"], size, cfg["blend"])
    st.hotspot(main)
    # the frustum starts under the floor: a face lying on the floor blacks the floor out for cameras outside it
    st.haze_cone(f"haze_{name}", lamp, aim, cfg["pool"] + 0.4, 0.35, HAZE[name], drift=0.7)
    return main


def build_dawn_island():
    _spot_and_haze("dawn", D)


def build_cell_island():
    cx, cy = C
    _, ex = st.cell(cx, cy)
    unit = (cx + st.CX - 0.42, cy + st.CY)
    st.combo_unit(*unit, turn_deg=0.0)
    vc.furnish(cx, cy, unit)
    vc.shelf(cx, cy, cy + 0.5, st.SLAB + 1.32)
    # the top spot: straight down over the middle, its cone an ellipse landing just inside the walls, a hotspot
    cfg = SPOTS["cell"]
    rx, ry = cfg["pool"]
    lamp = (cx, cy - cfg["fwd"], cfg["h"])
    reach = cfg["h"] - st.SLAB
    size = 2 * math.degrees(math.atan(ry / reach))
    main = st.spot("spot_cell", lamp, (cx, cy - cfg["fwd"], st.SLAB), cfg["watts"], size, cfg["blend"],
                   scale=(rx / ry, 1.0))
    hot = st.hotspot(main)
    # the same lamp grazes the three wall tops (a fine bright line drawing the box from far off): a second cone from
    # the same point, linked to the thin caps only, so it lights nothing else
    graze = st.spot("spot_cell_graze", lamp, (cx, cy, st.TOPZ), 6000.0, 64.0, 0.08)
    st.link_lights([graze], receivers=ex["caps"], tag="graze")
    # a weak light far behind and to the right, linked to the walls and caps only: their outer faces and corners
    # separate from the black in the far shot; the floor and the haze never see it
    rim = st.area("rim_cell", (cx + 5.5, cy + 7.0, 4.5), (cx, cy, 1.4), (2.0, 2.0), 300.0, (0.8, 0.86, 0.95))
    st.link_lights([rim], receivers=ex["walls"] + ex["caps"] + [ex["slab"]], tag="rim")
    # haze in the box (the back wall's outer face its limit, so the window lamp lights only the slot's blade) and a
    # denser slab along the window's light, which the top spot does not light
    st.haze("haze_cell", (cx - 3.4, cy - 4.2, -0.2), (cx + 3.4, cy + st.CY + st.T, cfg["h"] + 1.5), HAZE["cell"],
            drift=0.9)
    mid, d = st.window_ray(cx, cy)
    t = (mid.z - st.SLAB) / -d.z
    shaft = st.haze_box_along("haze_cell_shaft", mid + d * 0.1, mid + d * (t + 0.25), 0.95, 0.42, SHAFT_HAZE)
    st.link_lights([main, hot], exclude=[shaft], tag="cellspot")


def build_bags_island():
    bags()
    _spot_and_haze("bags", (G[0] + 0.02, G[1]))


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
    beat = cfg.get("beat")
    for g, objs in _STATE["groups"].items():
        for o in objs:
            o.hide_render = beat is not None and g != beat
    sc = bpy.context.scene
    cam = sc.camera
    if cam is not None:
        cam.data.clip_start, cam.data.clip_end = 0.05, 300.0
        sx, sy = cfg.get("shift", (0.0, 0.0))
        cam.data.shift_x, cam.data.shift_y = sx, sy
    sc.cycles.sample_clamp_indirect = 3.0
    sc.cycles.blur_glossy = 0.5
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH"),
                 ("denoising_input_passes", "RGB_ALBEDO_NORMAL")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    print(f"VOID camera {name or '?'}: island {beat}", flush=True)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        kw.setdefault("world", 0.0)
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def build(cast=True):
    st.M.clear()
    st.LIGHTS.clear()
    _STATE["groups"] = {}
    _STATE["cast"] = []
    st.materials(cell=C)
    st.floor()
    _island("dawn", build_dawn_island)
    _island("cell", build_cell_island)
    _island("bags", build_bags_island)
    if cast:
        _island("dawn", lambda: _STATE["cast"].append(dawn()))
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    install_hook()
