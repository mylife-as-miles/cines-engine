"""Stage: the detention corridor at night and the visitation room off it (Ch 06 "Three years without an answer").
Fluorescent Noir. No people: absence carries it.

A long corridor in a detention centre after lights-out: painted block walls with a satin dado, a dark stripe and a
kick plate, caged fluorescent fittings down the soffit (the two nearest dead, so the corridor opens out of the dark,
then a pool, a dead gap, a pool, a dying tube), an eggshell-painted concrete floor worn to concrete down the middle
with one damp stain round the floor drain, steel cell doors with round bars set into both walls, a meal tray left on
the open hatch flap of the near door, a recessed fire-hose cabinet, a CCTV dome. At the far end the visitation
room's door stands ajar and amber light leaks out across the floor. Inside that room: a bare table in the pool of
one hanging enamel light, a sealed envelope on it, the detainee's chair empty across it, the visitor's own chair at
the near corner, the closed steel door behind, a clock with no numerals, a blank vent.

    <bpy python> -I scenes/shoot.py -- detention_corridor <cam> out.png

Cameras: corridor (one-point down the corridor), door (controlled close-up on a cell door's barred window from the
hinge side, under a raking key), chair (the whole lit island from the doorway: table, its shadow, the empty chair
behind the envelope), envelope (an insert of the envelope, the chair soft behind). Before each render a hook on
setkit.render sets the camera's lens shift and near clip, the per-camera light trims (TRIMS), the far chair's value
(CHAIR_VAL), the visitation door's swing (LEAF_OPEN) and the denoiser's settings. The set is in
detention_corridor_set.py, its materials in detention_corridor_mats.py.
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

import setkit as sk  # noqa: E402
import detention_corridor_set as st  # noqa: E402

EXPOSURE = -1.5

CHAIR = (-0.12, 16.3, -90.0)                 # x, y, facing (deg; -90 = toward the door): the detainee's side, pulled out
NEAR_CHAIR = (-0.84, 15.02, 66.0)            # the visitor's own chair at the near left corner, tucked in toward the table
ENVELOPE = (0.04, 15.55, 13.0)               # x, y, turn (deg) on the table top: under the bulb

FOCUS = {
    "fx_corridor": (0.0, 7.5, 1.2),
    "fx_door": (st.XW + st.FRONT - 0.262, 7.6, 1.5),
    "fx_chair": (ENVELOPE[0], ENVELOPE[1] + 0.12, st.TOP + 0.05),
    "fx_envelope": (ENVELOPE[0], ENVELOPE[1], st.TOP + 0.003),
}
CAMERAS = {
    # Ch 06: one-point down the corridor at standing height, verticals true (level camera, lens shift)
    "corridor": dict(loc=(0.0, -2.6, 1.36), aim=(0.0, 13.0, 1.36), lens=28, focus="fx_corridor", fstop=8.0,
                     shift=(0.0, 0.0), exposure=-1.0),
    # Ch 06: controlled close-up on a cell door's barred window from the hinge side, 40 deg off its axis, so the
    # reveal has depth, the round bars throw shadows on the glass and the raking key grazes the leaf; the empty
    # bunk's top rail rim-lit beyond the bars
    "door": dict(loc=(0.14, 8.53, 1.56), aim=(st.XW, 7.56, 1.47), lens=38, focus="fx_door", fstop=5.6),
    # Ch 06: the visitation room from the doorway at a seated visitor's eye height (the end wall cut away): the
    # whole table in the pendant's pool, its legs and hard shadow on the floor, the empty chair behind the envelope,
    # the visitor's own chair pushed in at frame left, the shade's glowing rim in the upper third
    "chair": dict(loc=(0.30, 12.4, 1.16), aim=(-0.12, 15.9, 1.16), lens=25, focus="fx_chair", fstop=5.6,
                  shift=(0.0, -0.1), clip=1.0, exposure=-1.1),
    # Ch 06 (added): the insert, low over the table (17 cm above the top) on a longer lens from 1.6 m back, so the
    # table is foreshortened to the lower 40% of the frame: the sealed envelope on the lower third with its curled
    # corner and its shadow, the table falling off into the dark round it, the empty chair's back large and soft
    # beyond
    "envelope": dict(loc=(0.618, 14.06, 0.911), aim=(-0.06, 16.08, 0.80), lens=70, focus="fx_envelope",
                     fstop=2.8, exposure=-1.85),
}
# per-camera light changes (absolute watts by light name)
TRIMS = {
    # the corridor: the room through the gap washed warm, so it is the brightest, warmest thing at the vanishing
    # point, and its warm wedge on the corridor floor
    "corridor": {"room_warm": 900.0, "vd_spill": 0.0, "vd_floor_wedge": 1100.0,
                 # the pendant turned down: 15 m away nobody reads its level, and its near-white light greyed the amber
                 "pendant_light": 30.0, "pendant_pool": 80.0, "pendant_glow": 5.0},
    # the door close-up: a raking key from the hinge side does the shaping; the fitting beyond the door turned
    # down so it does not fill
    "door": {"door_rake": 11.0, "fit4_down": 150.0, "fit4_up": 4.0},
}
# per-camera light positions: in the insert the pool's hot centre comes from the far left side of the bulb (still
# inside the shade), so the curl and the envelope's edges throw their shadows toward the lens
MOVES = {"envelope": {"pendant_pool": (-0.11, 15.68, st.PEND_Z + 0.03)}}
# per-camera value of the far (empty) chair's shell: in the insert it would otherwise outshine the envelope
CHAIR_VAL = {"envelope": 0.8}
# per-camera swing of the visitation room's door leaf (deg): for the chair camera, which stands in the doorway with
# the end wall cut away, the leaf is swung back flat out of its way (the corridor shot shows it ajar at 50)
LEAF_OPEN = {"chair": 172.0}
_STATE = {}


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
    cam = bpy.context.scene.camera
    if cam is not None:
        cam.data.clip_start, cam.data.clip_end = cfg.get("clip", 0.02), 200.0
        sx, sy = cfg.get("shift", (0.0, 0.0))
        cam.data.shift_x, cam.data.shift_y = sx, sy
    trims = TRIMS.get(name, {})
    moves = MOVES.get(name, {})
    base = _STATE.setdefault("base", {})
    base_loc = _STATE.setdefault("base_loc", {})
    for n, ob in st.LIGHTS.items():
        b = base.setdefault(n, ob.data.energy)
        ob.data.energy = trims.get(n, b)
        bl = base_loc.setdefault(n, tuple(ob.location))
        ob.location = moves.get(n, bl)
    for node, v0 in _STATE.get("chair_val", []):
        node.inputs["Value"].default_value = v0 * CHAIR_VAL.get(name, 1.0)
    leaf = st.PARTS.get("vd_leaf")
    if leaf is not None:
        leaf.rotation_euler = (0, 0, math.radians(LEAF_OPEN.get(name, st.VD_OPEN)))
    sc = bpy.context.scene
    sc.cycles.sample_clamp_indirect = 6.0
    sc.cycles.blur_glossy = 0.5
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    print(f"CORRIDOR camera {name or '?'}: shift {cfg.get('shift', (0, 0))}, trims {trims or 'none'}", flush=True)


def install_hook():
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def door_rake():
    """The door close-up's key (energy 0 except for that camera): a narrow vertical strip 0.15 m out from the wall
    on the hinge side of the close door, aimed across the leaf at 77 deg from its normal, so it grazes the leaf
    and its rivets, window frame and dents, bright by the hinge and falling off toward the latch."""
    side, y = st.CLOSE
    sx = -1 if side == "L" else 1
    hinge = 1 if side == "R" else -1                 # world +Y for a right-hand door (the prop's hinges sit at -y)
    # 0.32 m out from the wall and 0.62 m along it, about 60 deg off the leaf's normal at the window: still raking
    # across the leaf, but far enough out that the hinge-side reveal does not shadow the two inboard bars
    p = Vector((sx * (st.XW - 0.32), y + hinge * 0.62, 1.5))
    aim = Vector((sx * (st.XW + 0.05), y - hinge * 0.1, 1.45))
    li = st.area("door_rake", tuple(p), (0.08, 0.8), 0.0, (0.82, 0.9, 1.0), spread=70)
    li.rotation_euler = (aim - p).to_track_quat("-Z", "Y").to_euler()


def build(cast=True):
    """`cast` is ignored: this stage has no people."""
    st.M.clear()
    st.LIGHTS.clear()
    _STATE.clear()
    st.PARTS.clear()
    st.materials()
    st.shell()
    st.cells()
    st.cell_doors()
    st.ceiling_services()
    st.drain()
    st.near_door()
    st.vis_door()
    st.room()
    far = st.chair(CHAIR[:2], CHAIR[2])
    _STATE["chair_val"] = [(n, n.inputs["Value"].default_value) for o in far.children_recursive if o.type == "MESH"
                           for s in o.material_slots if s.material for n in s.material.node_tree.nodes
                           if n.type == "HUE_SAT"]
    st.chair(NEAR_CHAIR[:2], NEAR_CHAIR[2], val=0.4)
    st.envelope(ENVELOPE[0], ENVELOPE[1], st.TOP, ENVELOPE[2])
    door_rake()
    sk.haze((2 * st.XW - 0.02, st.Y1 - st.Y0 - 0.02, st.H - 0.02), (0, (st.Y0 + st.Y1) / 2, st.H / 2), 0.0018)
    room_haze = sk.haze((2 * st.RX - 0.02, st.RY1 - st.RY0 - 0.02, st.H - 0.02), (0, (st.RY0 + st.RY1) / 2, st.H / 2), 0.014)
    room_haze.name = "room_haze"
    for n, p in FOCUS.items():
        st.empty(n, p)
    install_hook()
