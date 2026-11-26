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
    "dawn-suitcase": (0.66, "z", dict(sat=0.6)),
    "extra-bag-closed": (0.75, "long", dict(sat=0.5, val=0.35, rough_add=0.3)),
    "extra-bag-open": (0.75, "long", dict(sat=0.5, val=0.35, rough_add=0.3)),
    "handbag-tote": (0.35, "long", dict(sat=0.85, rough_add=0.22)),
    "handbag-satchel": (0.30, "long", dict(sat=0.8, rough_add=0.12)),
    "handbag-shoulder": (0.32, "long", dict(sat=0.7, val=0.55, rough_add=0.25)),
}
SCANNER = (-0.80, 1.98)  # mirrored in Y so its control monitor stands on the room side; tunnel and belt open to +X

DAWN = (0.32, -0.80)
OFFICER_A = (0.02, 0.86)   # the one asking
OFFICER_B = (-0.72, 0.98)  # the scanner operator, come over from the belt

FOCUS = {"fx_wide": (0.3, 0.1, 1.2), "fx_two": (0.1, 0.0, 1.35), "fx_overhead": (0.0, 0.0, 1.0), "fx_empty": (0.2, 0.08, 1.1)}
CAMERAS = {
    # Ch 00: the establishing view, high in the corner behind Dawn
    "wide": dict(loc=(2.25, -1.95, 2.2), aim=(-0.3, 0.55, 0.9), lens=22, focus="fx_wide", fstop=5.6, beat="ch00"),
    # Ch 05: straight down on the bench through the ceiling, the bags laid out, the three figures round it
    "overhead": dict(loc=(0.05, 0.12, 4.9), aim=(0.05, 0.124, 0.86), lens=35, focus="fx_overhead", fstop=8.0, beat="ch05",
                     above_ceiling=True, exposure=-2.35),
    # Ch 00: the tag on the suitcase's top, from Dawn's side; the officer out of focus beyond
    "tag": dict(loc=(0.49, -0.339, 1.666), aim=(0.458, 0.026, 1.388), lens=50, focus="tag_focus", fstop=3.2, beat="ch00"),
    # Ch 00: low at the end of the bench, Dawn and the questioning officer facing each other over the bags, the door's
    # vision panel glowing between them
    "two_shot": dict(loc=(2.5, -0.45, 1.0), aim=(0.13, -0.05, 1.32), lens=30, focus="fx_two", fstop=3.5, beat="ch00"),
    # Ch 11: the two bags alone on the bench in the empty room, from the opening's side of the room, lower
    "empty": dict(loc=(2.05, -1.95, 1.5), aim=(-0.25, 0.3, 0.95), lens=26, focus="fx_empty", fstop=4.5, beat="ch11", cast=False),
}

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
    castkit.dress(h, ["female_elegantsuit01", "shoes05"], tint={"female_elegantsuit01": (0.62, 0.56, 0.5), "shoes05": (0.12, 0.11, 0.1)})
    return h


def officer(name, height_cm, age):
    h = castkit.person(name, gender=1.0, height_cm=height_cm, age=age, hair="short")
    castkit.dress(h, ["male_elegantsuit01", "shoes06"], tint={"male_elegantsuit01": (0.2, 0.26, 0.4), "shoes06": (0.15, 0.15, 0.16)})
    castkit.hat(h, os.path.join(props.PROPS, "peaked-cap.glb"), rgb=(0.03, 0.035, 0.055))  # Tripo cap: licence-clean
    cap = bpy.data.materials.get(f"hat_{name}")
    if cap:  # wool crown: matt, or under the troffer it reads as a bald head from above
        b = cap.node_tree.nodes["Principled BSDF"]
        b.inputs["Roughness"].default_value = 0.88
        b.inputs["Sheen Weight"].default_value = 0.25
    return h


def scanner():
    """The X-ray scanner (generated prop), mirrored so its monitor is on the room side, with its maker's plate covered
    by a blank plate, the monitor glowing blank, and a tray waiting on the belt."""
    m = st.materials()
    X0, Y0 = SCANNER
    h = props.load("xray-scanner", size=1.45, axis="z", loc=(X0, Y0, 0), turn_deg=0, sat=0.4, rough_add=0.08)
    h.scale.y *= -1
    bpy.context.view_layer.update()
    w = lambda x, y, z: Vector((X0 + x, Y0 - y, z))  # the probe's metric space -> world (mirrored)
    st.box("scanner_blank_plate", (0.007, 0.32, 0.12), w(0.2145, -0.06, 1.333), m["cover"], bevel=0.003)
    n = Vector((0.964, 0.023, 0.266)).normalized()
    c = w(0.333, 0.46, 0.935) + n * 0.005
    scr = st.box("scanner_screen", (0.002, 0.172, 0.108), c, st.mt.glow("blank screen", (0.55, 0.74, 0.92), 1.6),
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
        out[name] = props.load(name, size=size, axis=axis, loc=(0, 0, -5), **grade)
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


def apply_camera(name):
    cfg = CAMERAS.get(name, {})
    beat = cfg.get("beat", "ch00")
    set_beat(beat)
    show_cast = cfg.get("cast", True)
    for o in _STATE["cast"]:
        o.hide_render = not show_cast
    for o in st.CEILING:
        o.visible_camera = not cfg.get("above_ceiling", False)
    print(f"INSPECTION camera {name or '?'}: beat {beat}, cast {'shown' if show_cast and _STATE['cast'] else 'hidden'}, "
          f"ceiling {'see-through' if cfg.get('above_ceiling') else 'solid'}", flush=True)


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
    st.back_wall()
    st.floor_line()
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
    sk.haze((2 * st.XW - 0.02, st.Y1 - st.Y0 - 0.02, st.H - 0.03), (0, (st.Y0 + st.Y1) / 2, st.H / 2 - 0.01), 0.004)
    for n, p in FOCUS.items():
        e = bpy.data.objects.new(n, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = p
    _STATE["cast"] = []
    if cast:
        d = dawn()
        a = officer("OfficerA", 179, 0.4)
        b = officer("OfficerB", 176, 0.5)
        # Dawn still, arms down, head a little bowed; the officer asking turns an open hand toward the suitcase
        rigged.pose_figure(d, {"head": (9, 0), "chest": (5, 0), "l_arm": (5, 3, 12), "r_arm": (5, 3, 12), "fingers": 32})
        rigged.pose_figure(a, {"head": (11, 0), "chest": (3, 0), "l_arm": (36, 20, 22), "r_arm": (6, 5, 12), "fingers": 24})
        rigged.pose_figure(b, {"head": (7, 0), "chest": (2, 0), "l_arm": (6, 6, 14), "r_arm": (6, 6, 14), "fingers": 30})
        place(d, (*DAWN, 0), facing(DAWN, OFFICER_A))
        place(a, (*OFFICER_A, 0), facing(OFFICER_A, DAWN))
        place(b, (*OFFICER_B, 0), facing(OFFICER_B, DAWN))
        for h in (d, a, b):
            print(f"INSPECTION grounded {h.name} by {-ground(h) * 1000:+.1f} mm", flush=True)
            _STATE["cast"] += [h] + list(h.children_recursive)
    set_beat("ch00")
    install_hook()
