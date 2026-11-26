"""Stage: the detention corridor at night and the visitation room off it (Ch 06 "Three years without an answer").
Fluorescent Noir. No people: absence carries it.

A long corridor in a detention centre after lights-out: painted block walls with a satin dado and a dark stripe,
caged fluorescent fittings down the soffit with every other one dead, a painted concrete floor worn grey down the
middle with a floor drain and its damp stain, steel cell doors set into both walls in pressed-steel frames, a faint
night light glowing in each cell behind its barred window. At the far end the visitation room's door stands ajar and
warm light leaks out across the floor. Inside that room: a bare table under one hanging enamel light, a sealed
envelope on it, the visitor chair empty, the closed steel door behind it, a clock with no numerals.

    <bpy python> -I scenes/shoot.py -- detention_corridor <cam> out.png

Cameras: corridor (one-point down the corridor), door (controlled close-up on a cell door's barred window), chair
(the empty chair and the sealed envelope under the one light), envelope (an insert of the envelope, the chair soft
behind). Before each render a hook on setkit.render sets the camera's lens shift and near clip and the denoiser's
settings. The set is in detention_corridor_set.py, its materials in detention_corridor_mats.py.
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
NEAR_CHAIR = (-0.36, 14.98, 90.0)            # the visitor's own chair on the near side, pushed in under the table
ENVELOPE = (-0.07, 15.69, 13.0)              # x, y, turn (deg) on the table top

FOCUS = {
    "fx_corridor": (0.0, 7.5, 1.2),
    "fx_door": (st.XW + st.FRONT - 0.262, 7.6, 1.5),
    "fx_chair": (ENVELOPE[0], ENVELOPE[1] + 0.12, st.TOP + 0.05),
    "fx_envelope": (ENVELOPE[0], ENVELOPE[1], st.TOP + 0.003),
}
CAMERAS = {
    # Ch 06: one-point down the corridor at standing height, verticals true (level camera, lens shift)
    "corridor": dict(loc=(0.0, -2.6, 1.36), aim=(0.0, 13.0, 1.36), lens=28, focus="fx_corridor", fstop=8.0,
                     shift=(0.0, 0.0)),
    # Ch 06: controlled close-up on a cell door's barred window from the hinge side, 40 deg off its axis, so the
    # reveal has depth, the round bars throw shadows on the glass and the raking key grazes the leaf; the empty
    # bunk's top rail rim-lit beyond the bars
    "door": dict(loc=(0.22, 8.43, 1.56), aim=(st.XW + 0.06, 7.55, 1.47), lens=55, focus="fx_door", fstop=4.0),
    # Ch 06: the visitation room from the doorway at a seated visitor's eye height (the end wall cut away): the
    # whole table in the pendant's pool, its legs and hard shadow on the floor, the empty chair behind the envelope,
    # the visitor's own chair pushed in at frame left, the shade's glowing rim in the upper third
    "chair": dict(loc=(0.42, 12.62, 1.2), aim=(-0.08, 15.9, 0.98), lens=27, focus="fx_chair", fstop=5.6,
                  shift=(0.0, 0.07), clip=0.62),
    # Ch 06 (added): the insert: the sealed envelope in the pool of light from above the table's near edge, the
    # empty chair soft beyond it
    "envelope": dict(loc=(0.25, 15.0, 1.12), aim=(-0.03, 15.82, 0.78), lens=40, focus="fx_envelope", fstop=2.8),
}
# per-camera light changes (absolute watts by light name)
TRIMS = {
    # the corridor: the room through the gap washed warm, so it is the brightest, warmest thing at the vanishing
    # point
    "corridor": {"room_warm": 260.0},
    # the door close-up: a raking key from the hinge side does the shaping; the fitting beyond the door turned
    # down so it does not fill
    "door": {"door_rake": 9.0, "fit4_down": 150.0, "fit4_up": 4.0},
}
# per-camera value of the far (empty) chair's shell: in the insert it would otherwise outshine the envelope
CHAIR_VAL = {"envelope": 0.62}
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
    base = _STATE.setdefault("base", {})
    for n, ob in st.LIGHTS.items():
        b = base.setdefault(n, ob.data.energy)
        ob.data.energy = trims.get(n, b)
    for node, v0 in _STATE.get("chair_val", []):
        node.inputs["Value"].default_value = v0 * CHAIR_VAL.get(name, 1.0)
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
    a = math.radians(13.0)
    # it shines along -hinge (across the leaf), turned 13 deg into the wall
    rot = (-math.pi / 2, 0.0, hinge * sx * a) if hinge > 0 else (math.pi / 2, 0.0, hinge * sx * a)
    st.area("door_rake", (sx * (st.XW - 0.15), y + hinge * 0.62, 1.45), (0.08, 0.8), 0.0, (0.82, 0.9, 1.0), spread=70,
            rot=rot)


def build(cast=True):
    """`cast` is ignored: this stage has no people."""
    st.M.clear()
    st.LIGHTS.clear()
    _STATE.clear()
    st.materials()
    st.shell()
    st.cells()
    st.cell_doors()
    st.ceiling_services()
    st.drain()
    st.vis_door()
    st.room()
    far = st.chair(CHAIR[:2], CHAIR[2])
    _STATE["chair_val"] = [(n, n.inputs["Value"].default_value) for o in far.children_recursive if o.type == "MESH"
                           for s in o.material_slots if s.material for n in s.material.node_tree.nodes
                           if n.type == "HUE_SAT"]
    st.chair(NEAR_CHAIR[:2], NEAR_CHAIR[2], val=0.55)
    st.envelope(ENVELOPE[0], ENVELOPE[1], st.TOP, ENVELOPE[2])
    door_rake()
    sk.haze((2 * st.XW - 0.02, st.Y1 - st.Y0 - 0.02, st.H - 0.02), (0, (st.Y0 + st.Y1) / 2, st.H / 2), 0.004)
    room_haze = sk.haze((2 * st.RX - 0.02, st.RY1 - st.RY0 - 0.02, st.H - 0.02), (0, (st.RY0 + st.RY1) / 2, st.H / 2), 0.014)
    room_haze.name = "room_haze"
    for n, p in FOCUS.items():
        st.empty(n, p)
    install_hook()
