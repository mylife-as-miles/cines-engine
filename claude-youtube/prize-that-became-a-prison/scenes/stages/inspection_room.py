"""Stage: the airport inspection room (Ch 00 the question, Ch 05 the discovery, Ch 11 the return). Fluorescent Noir.

A windowless secondary-inspection room: painted block walls with a two-tone dado and bumper rail, a lay-in ceiling
with one 2 x 4 troffer burning over a stainless bench, the X-ray scanner and its belt against the back wall, a steel
door with a wired-glass vision panel and a line of corridor light under it. Dawn stands on the near side of the bench;
two officers face her across it.

    <bpy python> -I scenes/shoot.py -- inspection_room <cam> out.png [--nocast]

Each camera carries its chapter beat. Before every render the stage sets the bench for that beat (Ch 00: suitcase,
extra bag and tote; Ch 05: the extra bag open and the three handbags out; Ch 11: the two bags alone), hides the cast
for a camera that wants an empty room, and lets the overhead camera look through the ceiling. It does this by
wrapping `setkit.render` for this process only (shoot.py calls it once per camera), so `--cam all` works too.
Sets, materials and the tag: inspection_room_set.py and inspection_room_mats.py.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import cast as castkit  # noqa: E402
import props  # noqa: E402
import rigged  # noqa: E402
import setkit as sk  # noqa: E402
import inspection_room_set as st  # noqa: E402

TOP = st.TOP
EXPOSURE = -2.0  # the bench troffer is about two stops hot for the props

# Where things stand. The suitcase's front pocket looks along +X in its file and its top carry handle runs along the
# file's Y; turned -75 the pocket faces Dawn. The tote's turn of 162 keeps its dented face from the camera.
SUITCASE_BENCH = (0.45, 0.02, TOP, -75.0)
LAYOUT = {
    "ch00": {"dawn-suitcase": SUITCASE_BENCH, "extra-bag-closed": (-0.56, 0.15, TOP, 4.0), "handbag-tote": (0.0, -0.23, TOP, 162.0)},
    "ch05": {"dawn-suitcase": (1.34, -0.16, 0.0, -82.0), "extra-bag-open": (-0.53, 0.02, TOP, 0.0),
             "handbag-tote": (0.08, -0.06, TOP, 92.0), "handbag-satchel": (0.40, -0.07, TOP, 84.0),
             "handbag-shoulder": (0.70, -0.05, TOP, 97.0)},
    "ch11": {"dawn-suitcase": SUITCASE_BENCH, "extra-bag-closed": (-0.56, 0.15, TOP, 4.0)},
}
PROPS = {  # size, axis, grade
    # The bags' own textures are already dark (surface albedo about 0.03 for both soft bags); what made them read light
    # and mid grey under the troffer was the generated plastic specular sheen, so it is cut (FINISH) rather than the
    # colour crushed to a void. The charcoal case keeps its tone and gets a woven face; the black duffel goes darker.
    "dawn-suitcase": (0.66, "z", dict(sat=0.6, val=0.9, rough_add=0.15)),
    "extra-bag-closed": (0.75, "long", dict(sat=0.5, val=0.55, rough_add=0.3)),
    "extra-bag-open": (0.75, "long", dict(sat=0.5, val=0.55, rough_add=0.3)),
    # the tote's leather is a red-brown that grades to salmon: turned toward orange (hue +0.045) and lifted, it lands
    # near (0.32, 0.15, 0.06) linear, cognac, the one warm thing in the room
    "handbag-tote": (0.35, "long", dict(sat=1.0, val=1.1, hue=0.545, rough_add=0.2)),
    "handbag-satchel": (0.30, "long", dict(sat=0.8, rough_add=0.12)),
    "handbag-shoulder": (0.32, "long", dict(sat=0.55, val=0.5, rough_add=0.25)),
}
FINISH = {  # specular level and woven face (period m, bump strength) per prop
    "dawn-suitcase": dict(spec=0.2, weave=(0.002, 0.25), ceiling=(0.05, 0.052, 0.058)),
    "extra-bag-closed": dict(spec=0.22),
    "extra-bag-open": dict(spec=0.22),
    "handbag-tote": dict(spec=0.4),
    "handbag-shoulder": dict(spec=0.35),
}
# The scanner stands to the right of the officers: its 1.4 m housing is at shoulder height, so anywhere behind them its
# top edge cuts through their necks in the wide. Mirrored in Y so its control monitor stands on the room side; the
# tunnel and belt open to +X (housing x -1.1..+0.2 from its origin, console to +0.5, belt to +1.1)
SCANNER = (1.65, 1.99)

DAWN = (0.15, -0.80)        # in front of the tote, clear of it in the wide
OFFICER_A = (-0.30, 0.62)  # the one asking, close to the bench, his open hand over the bags
OFFICER_B = (-0.10, 1.32)  # the scanner operator, a step back by the machine, hands behind his back; in the wide he
                           # stands in the gap between the asking officer and the scanner housing
# where the cast stands for each beat when it differs from the above (Ch 05 is later: both officers at the bench)
BLOCKING = {"ch05": {"OfficerA": (0.30, 0.62), "OfficerB": (-0.65, 0.66)}}
# Poses (rigged.pose_figure keys; "behind": hands behind the back). Dawn still, weight on one hip, arms down with the
# hands loosely closed, head a little bowed; the officer asking looks down at the bags, his open, cupped right hand
# over them (it reads in the wide, left of the suitcase); the other waits by the machine, hands behind him
POSES = {
    "Dawn": {"head": (9, -3), "chest": (5, 4), "l_arm": (5, 7, 14), "r_arm": (3, 6, 9), "fingers": 40},
    "OfficerA": {"head": (14, -4), "chest": (4, -3), "r_arm": (52, -6, 32), "l_arm": (6, 5, 14), "fingers": 42},
    "OfficerB": {"head": (10, -4), "chest": (-2, 0), "fingers": 30, "behind": True},
}

FOCUS = {"fx_wide": (0.3, 0.1, 1.2), "fx_two": (0.1, 0.0, 1.35), "fx_overhead": (0.0, 0.0, 1.0), "fx_empty": (0.2, 0.08, 1.1)}
CAMERAS = {
    # Ch 00: the establishing view, high in the corner behind Dawn
    "wide": dict(loc=(2.55, -2.3, 2.35), aim=(-0.3, 0.55, 0.75), lens=24, focus="fx_wide", fstop=5.6, beat="ch00",
                 wild=("wall_front", "cove_f", "rail_f")),
    # Ch 05: straight down on the bench through the ceiling, the bags laid out, the three figures round it. A little
    # bench's centre toward Dawn, so her head clears the bottom edge and the scanner's foot stays out of the top
    "overhead": dict(loc=(0.05, -0.15, 5.3), aim=(0.05, -0.146, 0.86), lens=35, focus="fx_overhead", fstop=8.0, beat="ch05",
                     above_ceiling=True, exposure=-3.6),
    # Ch 00: the tag on the suitcase's top, from Dawn's side; the zip pulls as bokeh at the bottom, the officer an
    # out-of-focus silhouette beyond (cheated into the gap between the trolley tubes for this angle)
    "tag": dict(loc=(0.487, -0.307, 1.612), aim=(0.455, 0.058, 1.352), lens=50, focus="tag_hole_focus", fstop=1.8,
                beat="ch00", cheat={"OfficerA": (0.38, 0.58)}, raking=True, exposure=-3.9,
                pose={"OfficerA": {"head": (24, 0), "chest": (8, 0), "r_arm": (12, 6, 26), "l_arm": (10, 6, 24), "fingers": 40}}),
    # Ch 00: low at the end of the bench, Dawn and the questioning officer facing each other over the bags, the door's
    # vision panel glowing between them
    "two_shot": dict(loc=(2.5, -0.45, 1.0), aim=(0.13, -0.05, 1.24), lens=30, focus="fx_two", fstop=3.5, beat="ch00"),
    # Ch 11: the two bags alone on the bench in the empty room, the steel where the tote stood at the centre of the
    # lit top
    "empty": dict(loc=(2.05, -1.95, 1.5), aim=(-0.05, 0.0, 0.92), lens=26, focus="fx_empty", fstop=4.5, beat="ch11", cast=False),
}

WILD = ("wall_front", "cove_f", "rail_f")
_STATE = {"props": {}, "cast": []}


def place(holder, loc, facing_deg):
    holder.location = loc
    holder.rotation_euler = (0, 0, math.radians(facing_deg))
    bpy.context.view_layer.update()


def facing(p, t):
    """The facing (deg) that turns a figure built facing -Y toward point t."""
    return math.degrees(math.atan2(t[0] - p[0], -(t[1] - p[1])))


def clasp(holder, upper=(10, 0), fore=(34, 44), hand=(32, 40)):
    """Hands clasped low in front: aim each arm segment (forward, inward degrees) on top of a pose."""
    rig = rigged.rig_of(holder)
    for side, k in ((1, "L"), (-1, "R")):
        for bone, (f, i) in (("upper_arm_fk", upper), ("forearm_fk", fore), ("hand_fk", hand)):
            rigged._aim(rig, f"{bone}.{k}", rigged._dir(0, f, side, -i))


def behind(holder):
    """Hands held behind the back: upper arms a little back and out, forearms in toward the spine behind the hips."""
    clasp(holder, upper=(-14, -10), fore=(-22, 52), hand=(-26, 66))


def pose(holder, p):
    rigged.pose_figure(holder, {k: v for k, v in p.items() if k != "behind"})
    if p.get("behind"):
        behind(holder)


def cloth(holder, item, rough=0.75, bump=0.25):
    """A garment finished as plain cloth: its printed texture and its normal map (whose fine stripes shimmer at wide
    sizes) dropped for a faint woven-noise bump."""
    ob = bpy.data.objects.get(f"{holder.name}_{item}")
    if ob is None:
        print(f"INSPECTION no garment {holder.name}_{item}", flush=True)
        return
    for slot in ob.material_slots:
        m = slot.material
        if not (m and m.use_nodes):
            continue
        nt = m.node_tree
        b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if b is None:
            continue
        for sock in ("Roughness", "Normal"):
            for ln in list(b.inputs[sock].links):
                nt.links.remove(ln)
        b.inputs["Roughness"].default_value = rough
        b.inputs["Sheen Weight"].default_value = 0.25
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 900.0
        nz.inputs["Detail"].default_value = 2.0
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = bump
        bp.inputs["Distance"].default_value = 0.0004
        nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])


def ground(holder):
    """Stand a figure on the floor: lift or lower it so its lowest point (the soles) sits at z = 0."""
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
    holder.location.z -= lo
    bpy.context.view_layer.update()
    return lo


def dawn():
    h = castkit.person("Dawn", gender=0.0, height_cm=168, age=0.45, hair="bun")
    # a plain travelling suit: flat dark taupe, no knit pinstripe (it shimmered at wide sizes)
    castkit.dress(h, ["female_elegantsuit01", "shoes05"], tint={"female_elegantsuit01": (0.18, 0.17, 0.16), "shoes05": (0.12, 0.11, 0.1)},
                  flat=("female_elegantsuit01",))
    cloth(h, "female_elegantsuit01")
    return h


def officer(name, height_cm, age, weight=0.5, muscle=0.5, proportions=0.5, suit=(0.2, 0.26, 0.4)):
    h = castkit.person(name, gender=1.0, height_cm=height_cm, age=age, weight=weight, muscle=muscle,
                       proportions=proportions, hair="short")
    castkit.dress(h, ["male_elegantsuit01", "shoes06"], tint={"male_elegantsuit01": suit, "shoes06": (0.15, 0.15, 0.16)})
    castkit.hat(h, os.path.join(props.PROPS, "peaked-cap.glb"), rgb=(0.03, 0.035, 0.055))  # Tripo cap: licence-clean
    cap = bpy.data.materials.get(f"hat_{name}")
    if cap:  # wool crown: matt and nearly without specular, or under the troffer it reads as a bald head from above
        b = cap.node_tree.nodes["Principled BSDF"]
        b.inputs["Roughness"].default_value = 0.9
        b.inputs["Specular IOR Level"].default_value = 0.12
        b.inputs["Sheen Weight"].default_value = 0.15
    return h


def scanner():
    """The X-ray scanner (generated prop), mirrored so its monitor is on the room side, with its maker's plate covered
    by a blank plate, the monitor glowing blank, and a tray waiting on the belt."""
    m = st.materials()
    X0, Y0 = SCANNER
    # a shade darker than the generated beige: it is the biggest pale shape behind the cast
    h = props.load("xray-scanner", size=1.45, axis="z", loc=(X0, Y0, 0), turn_deg=0, sat=0.4, val=0.45, rough_add=0.08)
    h.scale.y *= -1
    bpy.context.view_layer.update()
    w = lambda x, y, z: Vector((X0 + x, Y0 - y, z))  # the probe's metric space -> world (mirrored)
    st.box("scanner_blank_plate", (0.007, 0.32, 0.12), w(0.2145, -0.06, 1.333), m["cover"], bevel=0.003)
    n = Vector((0.964, 0.023, 0.266)).normalized()
    c = w(0.333, 0.46, 0.935) + n * 0.005
    scr = st.box("scanner_screen", (0.002, 0.172, 0.108), c, st.mt.glow("blank screen", (0.6, 0.78, 0.95), 5.0),
                 rot=(0, -math.atan2(n.z, n.x), math.atan2(n.y, n.x)))
    tree = st.surface_bvh(h)
    hits = []
    for dx in (-0.25, 0.0, 0.25):
        for dy in (-0.17, 0.0, 0.17):
            p = w(0.78 + dx, -0.10 + dy, 1.3)
            r = tree.ray_cast(p, Vector((0, 0, -1)))
            if r[0] is not None:
                hits.append(r[0].z)
    hits.sort()
    z = hits[len(hits) // 2] if hits else 0.58
    print(f"INSPECTION belt hits {[round(v, 3) for v in hits]} -> tray at {z:.3f}")
    st.tray("belt_tray", w(0.78, -0.10, z + 0.003), 0.0)
    return h, scr


def load_props():
    out = {}
    for name, (size, axis, grade) in PROPS.items():
        h = props.load(name, size=size, axis=axis, loc=(0, 0, -5), **grade)
        fin = FINISH.get(name)
        if fin:
            meshes = [o for o in h.children_recursive if o.type == "MESH"]
            bpy.context.view_layer.update()
            to_m = meshes[0].matrix_world.to_scale().x if meshes else 1.0
            seen = set()
            for o in meshes:
                for slot in o.material_slots:
                    if slot.material and slot.material.name not in seen:
                        seen.add(slot.material.name)
                        st.mt.tune_prop(slot.material, spec=fin.get("spec"), weave=fin.get("weave"), to_metres=to_m,
                                       ceiling=fin.get("ceiling"))
        out[name] = h
    return out


def set_beat(beat):
    lay = LAYOUT.get(beat, LAYOUT["ch00"])
    for name, h in _STATE["props"].items():
        on = name in lay
        if on:
            x, y, z, t = lay[name]
            h.location = (x, y, z)
            h.rotation_euler = (0, 0, math.radians(t))
        for o in [h] + list(h.children_recursive):
            o.hide_render = not on
    bpy.context.view_layer.update()


def block(beat, cheat=None):
    """Stand the cast where this beat (and this camera's cheat, if any) puts them, each turned toward Dawn."""
    spots = {"Dawn": DAWN, "OfficerA": OFFICER_A, "OfficerB": OFFICER_B}
    spots.update(BLOCKING.get(beat, {}))
    spots.update(cheat or {})
    for n, h in _STATE["holders"].items():
        x, y = spots[n]
        h.location.x, h.location.y = x, y
        if n != "Dawn":
            h.rotation_euler.z = math.radians(facing((x, y), spots["Dawn"]))
    bpy.context.view_layer.update()


def apply_camera(name):
    cfg = CAMERAS.get(name, {})
    beat = cfg.get("beat", "ch00")
    set_beat(beat)
    show_cast = cfg.get("cast", True)
    for o in _STATE["cast"]:
        o.hide_render = not show_cast
    if _STATE.get("holders"):
        block(beat, cfg.get("cheat"))
        for n, h in _STATE["holders"].items():
            pose(h, cfg.get("pose", {}).get(n, POSES[n]))
    for o in st.CEILING:
        o.visible_camera = not cfg.get("above_ceiling", False)
    for n in WILD:  # a wild wall: out for a camera standing where the wall is, as on a set
        o = bpy.data.objects.get(n)
        if o:
            o.visible_camera = n not in cfg.get("wild", ())
    top = bpy.data.materials.get("bench top steel")
    if top and "ghost" in top.node_tree.nodes:  # the cleaner patch where the tote stood: only once it has gone
        top.node_tree.nodes["ghost"].outputs[0].default_value = 1.0 if beat == "ch11" else 0.0
    rake = bpy.data.objects.get("tag_rake")
    if rake:
        rake.hide_render = not cfg.get("raking", False)
    sc = bpy.context.scene  # settings setkit.render leaves alone: tame fireflies and glossy noise for the denoiser
    sc.cycles.sample_clamp_indirect = 8.0
    sc.cycles.blur_glossy = 0.6
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    print(f"INSPECTION camera {name or '?'}: beat {beat}, cast {'shown' if show_cast and _STATE['cast'] else 'hidden'}, "
          f"ceiling {'see-through' if cfg.get('above_ceiling') else 'solid'}, cheat {cfg.get('cheat')}, "
          f"rake {'on' if cfg.get('raking') else 'off'}", flush=True)


def which_camera():
    cam = bpy.context.scene.camera
    if cam is None:
        return None
    for n, c in CAMERAS.items():
        if (cam.location - Vector(c["loc"])).length < 1e-3:
            return n
    return None


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def build(cast=True):
    st.M.clear()
    st.CEILING.clear()
    st.materials()
    st.shell()
    st.ceiling()
    st.door()
    st.notice_board()
    st.back_wall(jx=SCANNER[0] - 0.52, gloves_xz=(2.38, 1.34), trays_xy=(-2.55, 2.0))
    st.floor_line(cx=SCANNER[0] + 0.05)
    st.bench(TOP)
    scanner()
    _STATE["props"] = load_props()
    # the tag is built on the suitcase where it stands in Ch 00 and then travels with it
    case = _STATE["props"]["dawn-suitcase"]
    x, y, z, t = SUITCASE_BENCH
    case.location, case.rotation_euler = (x, y, z), (0, 0, math.radians(t))
    bpy.context.view_layer.update()
    frame = Matrix.Translation((x, y, z)) @ Matrix.Rotation(math.radians(t), 4, "Z")
    st.luggage_tag(case, frame, hole=(0.0, -0.04), angle_deg=90.0)
    st.bounce()
    rake_light()
    sk.haze((2 * st.XW - 0.02, st.Y1 - st.Y0 - 0.02, st.H - 0.03), (0, (st.Y0 + st.Y1) / 2, st.H / 2 - 0.01), 0.002)
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    _STATE["cast"] = []
    _STATE["holders"] = {}
    if cast:
        d = dawn()
        # two different men: the one asking is younger, taller and lean; the scanner operator older, shorter,
        # heavier, in a suit a shade lighter
        a = officer("OfficerA", 179, 0.38, weight=0.42, muscle=0.62, proportions=0.6)
        b = officer("OfficerB", 171, 0.7, weight=0.68, muscle=0.38, proportions=0.35, suit=(0.24, 0.28, 0.36))
        for h in (d, a, b):
            pose(h, POSES[h.name])
        place(d, (*DAWN, 0), facing(DAWN, OFFICER_A))
        place(a, (*OFFICER_A, 0), facing(OFFICER_A, DAWN))
        place(b, (*OFFICER_B, 0), facing(OFFICER_B, DAWN))
        for h in (d, a, b):
            print(f"INSPECTION grounded {h.name} by {-ground(h) * 1000:+.1f} mm", flush=True)
            _STATE["cast"] += [h] + list(h.children_recursive)
        _STATE["holders"] = {"Dawn": d, "OfficerA": a, "OfficerB": b}
    set_beat("ch00")
    install_hook()


def rake_light():
    """For the tag close-up only: a small hard source low behind and to the right, in the direction of the scanner's
    troffer (its motivation), grazing the case top at about 27 degrees so the weave and the zips get shape and the
    tag's lifted end throws a shadow. Kept out of the haze."""
    hole = bpy.data.objects["tag_hole_focus"].matrix_world.translation
    d = Vector((0.397, 0.918, 0.51)).normalized()
    li = sk.area_light("tag_rake", tuple(hole + d * 1.8), (0.3, 0.05), 400.0, (0.84, 0.92, 1.0), spread_deg=60)
    li.visible_camera = False
    li.visible_volume_scatter = False
    tt = li.constraints.new("TRACK_TO")
    tt.target, tt.track_axis, tt.up_axis = bpy.data.objects["tag_hole_focus"], "TRACK_NEGATIVE_Z", "UP_Y"
    li.hide_render = True
    return li
