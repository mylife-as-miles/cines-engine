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

import home_set as dining  # noqa: E402
import home_mats as dining_mats  # noqa: E402
import people  # noqa: E402
import props  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import void_stage_cell as vc  # noqa: E402
import void_stage_fit as fit  # noqa: E402
import void_stage_set as st  # noqa: E402

EXPOSURE = -1.5

# the three islands, far apart on the one floor (x, y of each island's centre)
AT = {"dawn": (0.0, 0.0), "cell": (40.0, 0.0), "bags": (-40.0, 0.0)}

# the spots: height above the island, offset of the lamp toward the camera (-y), pool radius on the floor, watts
# (E = P / (4 pi d^2); the stone skin's crown and the cell's floor land near 1.0 and 0.5 after the exposure). Each has
# a soft inner cone from the same point (st.hotspot, HOT = (frac, gain)) so the pool is brighter at its centre than its
# edge: a worked lamp's pool, not a flat CG disc.
SPOTS = {
    # low enough (5.2 m) that the cone visibly tapers: half-angle about 13 deg, so in the dawn frame the beam narrows
    # from 2.4 m on the floor to about 1.1 m at the frame top (at 9.5 m the rays were near parallel and the haze stood
    # behind her as a curtain, round 2); watts by inverse square from 18.5 kW at 9.5 m, less the hotter centre. A
    # little behind her (fwd < 0): the front of the suit falls dark, shoulders, crown and legs take a rim off the
    # black, and the bowed face stays in shadow (in front light the nose tip alone caught the lamp)
    "dawn": dict(h=5.2, fwd=-0.3, pool=1.2, watts=6400.0, blend=0.34, hot=(0.5, 0.9)),
    # the cell's lamp, its cone an ellipse that lands just inside the walls: the floor and the wall bases lit, the walls
    # falling off upward into the dark. Weaker than round 2 (13.5 kW) and its centre a little toward the open side, so
    # the window's shaft and barred patch lead after the floor (round 2: the patch 1.2:1 over a floor as bright as
    # the shaft). Pushed 0.35 forward with a short cone (preview 3) its edge crossed the close shot's floor as a
    # bright arc in front and the patch still sat in the bright half; now the edge lies at the slab's front and back
    "cell": dict(h=7.6, fwd=0.15, pool=(1.5, 1.78), watts=9500.0, blend=0.50),
    "bags": dict(h=5.8, fwd=0.2, pool=1.15, watts=7600.0, blend=0.34, hot=(0.5, 0.9)),
}
# faint: 0.02-0.03 read as a grey wall behind the subject (round 1); the beam should be a ghost, not a slab. The dawn
# and bags haze fills only a frustum round the cone, drifting a little in density
HAZE = {"dawn": 0.010, "cell": 0.006, "bags": 0.010}
SHAFT_HAZE = 0.08    # a denser slab along the window's light, so a faint shaft joins window and patch
                     # (0.02 did not show against the top spot's haze at this source's distance)

DAWN_TURN = 32.0     # she faces the camera, turned a little to frame right (deg from facing -Y)
# the head bowed (28) on a slightly bent neck (7): from the 1.2 m lens an 18 deg bow on a 1.6 m figure read as a level
# gaze with a faint grin (round 2), now the face falls into the shadow of the brow. The chest nearly upright so the
# spine stays vertical from above (round 2 read as a stoop); arms hanging close (out 2.5), elbows soft, wrists
# straight; the fingers are closed and curled by void_stage_fit.close_hands, not by pose_figure's knuckle-only curl
# (the master bone alone left open claws), so "fingers" is 0 here
POSE = {"head": (28, -6), "neck": (7, 0), "chest": (2.5, 0), "l_arm": (5, 2.5, 9), "r_arm": (6, 2.5, 8), "fingers": 0}
# legs straight (FK): her weight on the right leg, its knee locked; the left (free) knee soft, its foot a little out
LEGS = {"R": dict(thigh=(0.0, 1.5), shin=(0.0, 1.5)), "L": dict(thigh=(3.0, 3.5), shin=(-1.5, 3.5))}
SUIT_RGB = (0.03, 0.031, 0.033)    # flat charcoal prison greys: the trousers
SHIRT_RGB = (0.017, 0.0175, 0.019)  # the shirt, a shade darker (its shoulders take the top light full on)

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
    "cell_far": dict(loc=_p(C, 9.0, -23.5, 4.5), aim=_p(C, 0.0, 0.2, 1.55), lens=50, focus="fx_cell_far", fstop=8.0,
                     beat="cell"),
    # Ch 11: the end: the two bags alone in the spotlight on black, low, so they rise against the dark above the
    # pool's far edge; the beam behind them
    # pushed in (round 2 at 4.7 m: the bags a third of the frame, a band of empty lit floor in front): the case about
    # 40 % of the frame height, the whole pool edge still in frame
    "bags": dict(loc=_p(G, 0.12, -4.0, 0.55), aim=_p(G, 0.0, -0.02, 0.33), lens=50, focus="fx_bags", fstop=4.0,
                 beat="bags", shift=(0.0, 0.03), final_res=(2560, 1440)),
}

# The chair cut uses the same model, size, camera and focus plane as the family home.
CHAIR = (20.0, 0.0)
def chair_point(xyz):
    x, y, z = xyz
    return _p(CHAIR, x - dining.HEAD_CHAIR[0], y - dining.HEAD_CHAIR[1], z)


FOCUS.update(fx_chair=chair_point((dining.HEAD_CHAIR[0] + 0.05, dining.HEAD_CHAIR[1], 0.72)),
             fx_bunk=_p(C, -0.49, 0.41, 1.04), fx_patch=_p(C, *st.WINDOW_PATCH),
             fx_bowed=_p(D, 0.0, -0.04, 1.49))
CAMERAS.update({
    "pool": dict(CAMERAS["dawn"], cast=False, final_res=(2560, 1440)),
    "chair": dict(dining.HEAD_SHOT, loc=chair_point(dining.HEAD_SHOT["loc"]),
                  aim=chair_point(dining.HEAD_SHOT["aim"]), beat="chair", focus="fx_chair"),
    "cell_dawn": dict(loc=_p(C, 1.94, -4.16, 1.35), aim=_p(C, -0.23, 0.43, 0.95),
                      lens=29, fstop=4, focus="fx_bunk", beat="cell", seated=True, final_res=(2560, 1440)),
    "dawn_close": dict(loc=_p(D, -1.31, -1.71, 1.51), aim=_p(D, -0.13, 0.07, 1.41), lens=85,
                       fstop=3.2, focus="fx_bowed", beat="dawn", shift=(0.040, 0.014)),
    "cell_floor": dict(loc=_p(C, 0.50, -1.50, 0.46), aim=_p(C, -0.08, 0.28, 0.18),
                       lens=37, fstop=5.0, focus="fx_patch", beat="cell", seated=True),
    "divide": dict(loc=_p(D, -1.65, -8.8, 1.35), aim=_p(D, -1.65, 0, 0.76),
                   lens=42, fstop=5.6, focus="fx_dawn", beat="divide"),
})
CAMERAS["cell_far"]["seated"] = True
SPOTS["chair"] = dict(h=4.3, fwd=-0.32, pool=1.04, watts=3400, blend=0.44)
HAZE["chair"] = 0.007

# check frames, never in the finals: VOID_DEBUG=1 adds tight looks at Dawn (suit, hands, face) from her two cameras
if os.environ.get("VOID_DEBUG"):
    CAMERAS["dbg_dawn"] = dict(loc=_p(D, 0.0, -7.6, 1.2), aim=_p(D, 0.0, 0.0, 1.13), lens=135, focus="fx_dawn",
                               fstop=11.0, beat="dawn")
    CAMERAS["dbg_dawn_high"] = dict(loc=_p(D, 3.6, -5.3, 6.15), aim=_p(D, 0.0, -0.05, 0.95), lens=120,
                                    focus="fx_dawn_high", fstop=11.0, beat="dawn")

# a preview run may render only some cameras: VOID_CAMS="dawn,cell_close" (shoot.py's `all` walks CAMERAS)
if os.environ.get("VOID_CAMS"):
    CAMERAS = {k: v for k, v in CAMERAS.items() if k in os.environ["VOID_CAMS"].split(",")}

_STATE = {"groups": {}, "cast": []}


# ---------------------------------------------------------------- Dawn

def hands_stone(holder, value=0.4):
    """The hands a shade darker stone than the face (as in the inspection room): under a top light the backs of the
    hands face the lamp and the face does not. A soft mask from the hands' deform weights, so no seam at the wrist."""
    body = bpy.data.objects[holder["body"]]
    # the ears too: under the bowed head's hairline the top-lit ear read as a white speck at the temple (round 2)
    gi = {g.index for g in body.vertex_groups if any(k in g.name for k in ("hand", "f_", "thumb", "palm"))
          or g.name.startswith("DEF-ear")}
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
    for socket, hand_value in (("Specular IOR Level", 0.08), ("Roughness", 0.85)):
        src = b.inputs[socket]
        trim = nt.nodes.new("ShaderNodeMapRange")
        trim.inputs["To Min"].default_value = src.default_value
        trim.inputs["To Max"].default_value = hand_value
        nt.links.new(at.outputs["Fac"], trim.inputs["Value"])
        nt.links.new(trim.outputs["Result"], src)
    return 1


# the kit's prison uniform (people.dawn_prison(uniform=True), round 3): a collared shirt with full sleeves and a loose
# hem over straight trousers, one plain grey, no markings. Round 2's fitted T-shirt and leggings read as athleisure.
UNIFORM = True
GARMENT = people.PRISON_UNIFORM if UNIFORM else "female_casualsuit01"
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
        if UNIFORM:
            # the uniform: one plain grey, shirt and trousers alike (the kit's choice)
            col = rgb
        else:
            # the shirt a shade darker than the trousers (from above, the top-lit shoulders of a 0.03 shirt still came
            # out near the arms' stone value): the shirt's UV islands are the top half (front, back) and the sleeves
            uvn = nt.nodes.new("ShaderNodeUVMap")
            u, v, _ = st._xyz(nt, uvn.outputs["UV"])
            shirt = st._math(nt, "MAXIMUM", st._math(nt, "GREATER_THAN", v, 0.58),
                             st._math(nt, "MULTIPLY", st._math(nt, "GREATER_THAN", u, 0.745),
                                      st._math(nt, "MULTIPLY", st._math(nt, "GREATER_THAN", v, 0.15),
                                               st._math(nt, "LESS_THAN", v, 0.45))))
            col = st._mix(nt, shirt, rgb, SHIRT_RGB)
        if ao is not None:
            # the AO bake, softened (0.62-1.0; 0.75-1.0 on the uniform, whose atlas held jeans hardware), times the
            # flat charcoal
            mr = st._maprange(nt, ao.outputs["Color"], 0.0, 1.0, 0.75 if UNIFORM else 0.62, 1.0)
            col = st._mix(nt, 1.0, col, mr, "MULTIPLY")
        nt.links.new(col, b.inputs["Base Color"])
        b.inputs["Alpha"].default_value = 1.0
        b.inputs["Roughness"].default_value = 0.9
        b.inputs["Specular IOR Level"].default_value = 0.14
        b.inputs["Sheen Weight"].default_value = 0.0
        b.inputs["Coat Weight"].default_value = 0.0
        # cloth, not skin, where the top light lands: the jeans' own folds, pockets and seams (MakeHuman's normal map,
        # at 0.7: it is flat on the shirt), then soft horizontal creases over both (a distorted band wave), then the
        # fine weave. A smooth tight garment top-lit on the shoulders read as bare skin from above (preview 2)
        nm = next((n for n in nt.nodes if n.type == "NORMAL_MAP"), None)
        prev = None
        # (not on the uniform: its normal map carries the stock shirt's pinstripes and the jeans' rivets)
        if nm is not None and nm.inputs["Color"].is_linked and not UNIFORM:
            nm.inputs["Strength"].default_value = 0.7
            prev = nm.outputs["Normal"]
        wv = nt.nodes.new("ShaderNodeTexWave")
        wv.wave_type, wv.bands_direction = "BANDS", "Z"
        wv.inputs["Scale"].default_value = 3.5
        wv.inputs["Distortion"].default_value = 7.0
        wv.inputs["Detail"].default_value = 3.0
        wv.inputs["Detail Roughness"].default_value = 0.6
        nt.links.new(tc.outputs["Object"], wv.inputs["Vector"])
        # the band wave varies only with height, so it is flat on the shoulder tops: add soft creases in every
        # direction (a distorted noise), where the top light lands hardest
        cr = nt.nodes.new("ShaderNodeTexNoise")
        cr.inputs["Scale"].default_value = 11.0
        cr.inputs["Detail"].default_value = 3.0
        cr.inputs["Distortion"].default_value = 1.2
        nt.links.new(tc.outputs["Object"], cr.inputs["Vector"])
        fold = nt.nodes.new("ShaderNodeBump")
        fold.inputs["Strength"].default_value = 0.12
        fold.inputs["Distance"].default_value = 0.004
        nt.links.new(st._math(nt, "ADD", wv.outputs["Fac"], cr.outputs["Fac"]), fold.inputs["Height"])
        if prev is not None:
            nt.links.new(prev, fold.inputs["Normal"])
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 420.0
        nz.inputs["Detail"].default_value = 2.0
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = 0.25
        bp.inputs["Distance"].default_value = 0.0004
        nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(fold.outputs["Normal"], bp.inputs["Normal"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return ob


def _move_after_armature(ob, mod):
    idx = next(i for i, m in enumerate(ob.modifiers) if m.type == "ARMATURE")
    cur = list(ob.modifiers).index(mod)
    if cur != idx + 1:
        ob.modifiers.move(cur, idx + 1)


def suit_fit(holder, push=0.005, tuck=0.008):
    """Keep the stone body under the suit everywhere, from every camera, after posing. The suit follows the same rig
    as the body (checked); it is pushed out along its normals by `push` before its smoothing, and every body vertex the
    suit covers (an outward ray meets the suit's inside within 4 cm, or the suit lies just under the skin) goes into a group
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
        # an outward hit counts only on the suit's inside (its face turned away from the skin): an inner forearm's ray
        # meets the shirt's outside where the arm hangs by the body, and tucking it dented the arm (69 such vertices)
        if (out[0] is not None and out[1].dot(n) > 0.0) or inn[0] is not None:
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
    creases(gar)
    print(f"VOID suit fit: {len(covered)} of {len(skin)} skin vertices tucked under the suit; suit pushed out "
          f"{push * 1000:.0f} mm; body stack {[m.name for m in body.modifiers]}; suit stack "
          f"{[m.name for m in gar.modifiers]}", flush=True)
    return len(covered)


def creases(gar, strength=0.014, mid=0.25, scale=0.07, stretch=1.5):
    """Real relief in the cloth, not only a bump: soft folds a few millimetres deep, longer across the body than up it
    (horizontal wrinkles over the belly and the knees, as cotton and denim bunch), on the smoothed suit. Mostly outward
    (mid 0.25: -1.5 to +4.5 mm), so the stand-off over the skin holds. Under the hard top light a smooth tight suit
    read as painted skin; folds catch the light as cloth does. Round 3: deeper and broader (0.006 at 4.5 cm did not
    show at the camera's distance), so a few horizontal folds read at the waist, the knees and the ankles."""
    tex = bpy.data.textures.new(f"{gar.name}_creases", "CLOUDS")
    tex.noise_scale, tex.noise_depth, tex.noise_type = scale, 2, "SOFT_NOISE"
    space = bpy.data.objects.new(f"{gar.name}_crease_space", None)
    bpy.context.scene.collection.objects.link(space)
    space.scale = (stretch, stretch, 1.0)
    for m in gar.modifiers:
        if m.type == "SUBSURF":
            m.levels, m.render_levels = 2, 2
    dp = gar.modifiers.new("creases", "DISPLACE")
    dp.texture, dp.texture_coords, dp.texture_coords_object = tex, "OBJECT", space
    dp.direction, dp.mid_level, dp.strength = "NORMAL", mid, strength
    return dp


def light_suit(h, net=0.30, hair_net=0.20, body_net=0.75, bounce_w=45.0):
    """Light the suit and the hair as a cinematographer would with a net and a bounce, all invisible in frame. Round 1
    read the top-lit shirt (shoulders and the top of the bust a mid grey, the bowed head's shadow a black strip down
    the sternum, the rest black) as a pale bolero over a black leotard, skin showing through. Now the spot reaches the
    suit and the sculpted hair through a net (`net` of its power: the same lamp, the same shadows), and a weak bounce
    from the pool in front of her feet, linked to the suit alone, lifts its shaded front to a readable dark charcoal,
    so the head's shadow reads as a shadow on one garment. The face and the hands keep the hard light as it falls."""
    main, hot = st.LIGHTS.get("spot_dawn"), st.LIGHTS.get("spot_dawn_hot")
    gar = bpy.data.objects.get(f"{h.name}_{GARMENT}")
    if main is None or gar is None:
        return []
    hair = [o for o in h.children_recursive if o.type == "MESH" and (o.name.endswith("_hair") or o.name.endswith("_bun"))]
    body = bpy.data.objects[h["body"]]
    eyes = [o for o in h.children_recursive if o.type == "MESH" and "_eye" in o.name]
    netted = [gar] + hair + [body] + eyes
    st.link_lights([main, hot], exclude=netted, tag="dawn_net")

    def copies(k, tag):
        out = []
        for src in (main, hot):
            ob = src.copy()
            ob.data = src.data.copy()
            ob.name = ob.data.name = src.name + tag
            ob.data.energy = src.data.energy * k
            bpy.context.scene.collection.objects.link(ob)
            out.append(ob)
        return out
    dup = copies(net, "_net")
    st.link_lights(dup, receivers=[gar], tag="dawn_netted")
    # the sculpted hair through its own, denser net: top-lit at 0.55 the crown was the brightest thing in frame (raw
    # 0.78, a white swim cap over a black face); the lamp is lower now (5.2 m), so the bowed crown is nearer it
    hair_dup = copies(hair_net, "_hairnet")
    st.link_lights(hair_dup, receivers=hair, tag="dawn_hairnet")
    # the stone a little netted too (`body_net`): with the lamp lower and the forearms swung out to clear the hips,
    # their tops and the backs of the hands were the brightest thing on her (display 0.68 against the crown's 0.55)
    body_dup = copies(body_net, "_bodynet")
    st.link_lights(body_dup, receivers=[body] + eyes, tag="dawn_bodynet")
    # the netted lamp's shadows on the suit come from the suit alone (the bust still shades the belly): the bowed
    # head's shadow, a sharp black strip from the collar to under the bust, read as a V-neck over a leotard (preview 2
    # of this round, with the net and bounce but the head still shadowing)
    blk = bpy.data.collections.new("dawn_net_block")
    for o in [body] + hair + eyes:
        blk.objects.link(o)
    for co in blk.collection_objects:
        co.light_linking.link_state = "EXCLUDE"
    for ob in dup:
        ob.light_linking.blocker_collection = blk
    x, y = h.location.x, h.location.y
    fill = st.area("bounce_dawn", (x, y - 1.8, 0.45), (x, y, 1.1), (1.6, 1.0), bounce_w, (0.9, 0.93, 1.0))
    st.link_lights([fill], receivers=[gar], tag="dawn_bounce")
    print(f"VOID suit light: spot net {net:.2f} on the suit, {hair_net:.2f} on {[o.name for o in hair]}, bounce "
          f"{bounce_w:.0f} W on the suit", flush=True)
    hands = st.area("hand_return", (x, y - 1.4, 0.5), (x, y, 0.81), (0.60, 0.40), 26, (0.90, 0.94, 1.0),
                    spread_deg=50)
    st.link_lights([hands], receivers=[body], tag="hand_return")
    bun = [o for o in hair if o.name.endswith("_bun")]
    rim = copies(0.36, "_bun_edge") if bun else []
    if rim:
        st.link_lights(rim, receivers=bun, tag="bun_edge")
    return dup + hair_dup + body_dup + rim + [fill, hands]


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
    h = people.dawn_prison(uniform=True) if UNIFORM else people.dawn_prison()
    prison_suit(h)
    stone_finish(h)
    hands_stone(h)
    rigged.pose_figure(h, POSE)
    straight_wrists(h, POSE)
    stand_legs(h)
    # palms to the thighs, fingers closed and curled, then each forearm swung out from the elbow just clear of the
    # hips (measured), and the palms squared to the thighs again
    fit.pronate(h)
    fit.close_hands(h)
    fit.carry_arms(h, GARMENT, POSE)
    fit.pronate(h)
    rig = rigged.rig_of(h)
    pb = rig.pose.bones
    mw = rig.matrix_world
    hip, neck = mw @ pb["DEF-spine"].head, mw @ pb["DEF-spine.004"].head
    print(f"VOID spine lean {math.degrees(math.atan2(hip.y - neck.y, neck.z - hip.z)):.1f} deg forward", flush=True)
    suit_fit(h)
    fit.loosen_suit(h, GARMENT)
    fit.shoe_fit(h)
    fit.clearance(h, GARMENT)
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
    _STATE["originally_hidden"].update(ob for ob in new if ob.hide_render)
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
    st.hotspot(main, *cfg.get("hot", (0.62, 0.35)))
    # the frustum starts under the floor (a face lying on the floor blacks the floor out for cameras outside it) and
    # closes almost to a point under the lamp, so the haze follows the cone instead of a column
    st.haze_cone(f"haze_{name}", lamp, aim, cfg["pool"] + 0.4, 0.05, HAZE[name], drift=0.7)
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
    shaft = st.haze_box_along("haze_cell_shaft", mid + d * 0.1, mid + d * (t + 0.25), 0.95, 0.42, SHAFT_HAZE,
                               aniso=0.35)
    low_shaft = st.haze_box_along("haze_cell_low_shaft", mid + d * (t - 0.60 / -d.z), mid + d * t,
                                      0.89, 0.38, 0.14, aniso=0.35)
    st.link_lights([main, hot], exclude=[shaft, low_shaft], tag="cellspot")
    bedding = [bpy.data.objects[n] for n in ("mattress_low", "pillow_low", "blanket_low")]
    pillow = bedding[1]
    points = [pillow.matrix_world @ Vector(v) for v in pillow.bound_box]
    centre = sum(points, Vector()) / len(points)
    fill = st.area("lower_bunk_lip", (cx, cy - 1.55, 0.65), centre, (0.8, 0.4), 12, (0.80, 0.88, 1.0))
    st.link_lights([fill], receivers=bedding, tag="lower_bunk_lip")


def build_bags_island():
    pair = bags()
    # the spot on the bags' centroid, so they stand in the pool's hot centre
    cx = G[0] + (CASE[0] + DUFFEL[0]) / 2
    cy = G[1] + (CASE[1] + DUFFEL[1]) / 2
    _spot_and_haze("bags", (cx, cy))
    # a faint back rim linked to the two bags only (never the floor or the haze): the case's handle and top edge and
    # the duffel's straps and top seam draw a fine line against the haze, the faces stay dark (round 2: two dark lumps
    # on a dark haze)
    rim = st.area("rim_bags", (cx, cy + 2.4, 1.5), (cx, cy, 0.35), (0.6, 0.6), 40.0, (0.88, 0.92, 1.0))
    rim.visible_glossy = True
    st.link_lights([rim], receivers=_meshes(pair[0]) + _meshes(pair[1]), tag="bags_rim")
    kick = st.area("case front return", (cx - 0.9, cy - 2.6, 0.7), (G[0] + CASE[0], G[1] + CASE[1], 0.33),
                   (0.5, 0.5), 85.0, (0.88, 0.92, 1.0))
    st.link_lights([kick], receivers=_meshes(pair[0]), tag="case_front")


def build_chair():
    x, y = CHAIR
    turn = dining.HEAD_CHAIR[2]
    h = dining.dining_chair("void_family_chair", x, y, turn)
    bearing = math.radians(turn)
    dining_mats.satin_wood(h, (x, y), (math.cos(bearing), math.sin(bearing)),
                           rgb=tuple(dining.HEAD_WOOD * v for v in (0.07, 0.035, 0.02)))
    _spot_and_haze("chair", CHAIR)


def build_seated_dawn():
    from visiting_room import seat_solve, seat_place
    from hearing_room import lap_hands
    h = people.dawn_prison(uniform=True)
    prison_suit(h)
    hands_stone(h)
    stone_finish(h)
    upper = {"chest": (8, 0), "neck": (6, 0), "head": (17, 3), "fingers": 10}
    _, _, dz = seat_solve(h, upper, vc.LOW_DECK + 0.10, "bunk")
    lap_hands(h)
    for side in ("L", "R"):
        rigged.articulate_hand(h, side, {"f_index": (9, 12, 7), "f_middle": (11, 14, 9),
                                        "f_ring": (15, 17, 11, 5), "f_pinky": (17, 19, 12, 8)})
    seat_place(h, 140.0, (C[0] - st.CX + 0.03 + vc.BUNK_W - 0.12, C[1] + 0.51), dz + st.SLAB)
    fill = st.area("bunk_floor_return", _p(C, 0.58, -0.56, 0.61), _p(C, -0.52, 0.5, 1.03),
                   (0.7, 0.5), 14.0, (0.76, 0.80, 0.88), spread_deg=85)
    st.link_lights([fill], receivers=props.meshes(h), tag="bunk_floor_return")
    bpy.context.view_layer.update()


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
    beat = cfg.get("beat")
    active = {beat}
    if beat == "divide":
        active = {"bags", "dawn"}
    if cfg.get("seated") and _STATE["with_cast"]:
        if "seated" not in _STATE["groups"]:
            _island("seated", build_seated_dawn)
        active.add("seated")
    if name == "dawn_close" and _STATE["with_cast"]:
        active.add("portrait")
    if "dawn" in active and cfg.get("cast", True):
        active.add("standing")
    for group, objs in _STATE["groups"].items():
        for ob in objs:
            ob.hide_render = group not in active or ob in _STATE["originally_hidden"]
    front = bpy.data.objects.get("case front return")
    if front is not None:
        front.hide_render = name != "bags"
    for ob, x in _STATE["bag_roots"]:
        ob.location.x = x + (-3.3 - G[0] if beat == "divide" else 0.0)
    bpy.context.view_layer.update()
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
    _STATE.update(groups={}, with_cast=cast, originally_hidden=set())
    _STATE["cast"] = []
    st.materials(cell=C, bags=G)
    st.floor()
    _island("dawn", build_dawn_island)
    _island("cell", build_cell_island)
    _island("bags", build_bags_island)
    _island("chair", build_chair)
    bag_objects = set(_STATE["groups"]["bags"])
    _STATE["bag_roots"] = [(ob, ob.location.x) for ob in bag_objects if ob.parent not in bag_objects]
    if cast:
        _island("standing", lambda: _STATE["cast"].append(dawn()))
        _island("standing", lambda: light_suit(_STATE["cast"][0]))
        def face_return():
            li = st.area("portrait_floor_return", _p(D, -0.5, -0.68, 1.04), _p(D, 0.0, -0.03, 1.52),
                         (0.32, 0.40), 5.0, (0.78, 0.81, 0.9), spread_deg=65)
            receiver = bpy.data.objects[_STATE["cast"][0]["body"]]
            st.link_lights([li], receivers=[receiver], tag="portrait_floor_return")
        _island("portrait", face_return)
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    install_hook()
