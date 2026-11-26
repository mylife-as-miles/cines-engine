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

CHAIR = (0.07, 16.26, -81.0)                 # x, y, facing (deg; -90 = toward the door), pulled out from the table
ENVELOPE = (-0.07, 15.69, 13.0)              # x, y, turn (deg) on the table top

FOCUS = {
    "fx_corridor": (0.0, 7.5, 1.2),
    "fx_door": (st.XW + st.FRONT - 0.29, 7.6, 1.5),
    "fx_chair": (ENVELOPE[0], ENVELOPE[1] + 0.12, st.TOP + 0.05),
    "fx_envelope": (ENVELOPE[0], ENVELOPE[1], st.TOP + 0.003),
}
CAMERAS = {
    # Ch 06: one-point down the corridor at standing height, verticals true (level camera, lens shift)
    "corridor": dict(loc=(0.0, -2.6, 1.36), aim=(0.0, 13.0, 1.36), lens=28, focus="fx_corridor", fstop=8.0,
                     shift=(0.0, 0.0)),
    # Ch 06: controlled close-up on a cell door's barred window, a little off its axis, the cell's night light
    # faint beyond the bars
    "door": dict(loc=(-0.12, 7.13, 1.57), aim=(st.XW + st.FRONT - 0.29, 7.66, 1.49), lens=45, focus="fx_door",
                 fstop=2.8),
    # Ch 06: the visitation room from a visitor's eye height by the door: the empty chair across the table and
    # the sealed envelope in the pool of the one hanging light, the shade's glowing rim above
    "chair": dict(loc=(0.8, 13.45, 1.3), aim=(-0.05, 15.75, 1.05), lens=35, focus="fx_chair", fstop=4.0,
                  shift=(0.0, 0.06)),
    # Ch 06 (added): the insert: the sealed envelope in the pool of light from above the table's near edge, the
    # empty chair soft beyond it
    "envelope": dict(loc=(0.25, 15.0, 1.12), aim=(-0.03, 15.82, 0.78), lens=40, focus="fx_envelope", fstop=2.8),
}
# per-camera light changes (absolute watts by light name). The door close-up is lit from along the corridor: the
# fitting just short of it is turned down and the next one, toward the far end, burns, so light rakes across the
# leaf from the hinge side and the rivets and chipped paint get shape (the corridor shot shows the other state)
TRIMS = {"door": {"fit3_down": 80.0, "fit3_up": 5.0, "fit4_down": 300.0, "fit4_up": 18.0}}

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
        cam.data.clip_start, cam.data.clip_end = 0.02, 200.0
        sx, sy = cfg.get("shift", (0.0, 0.0))
        cam.data.shift_x, cam.data.shift_y = sx, sy
    trims = TRIMS.get(name, {})
    base = _STATE.setdefault("base", {})
    for n, ob in st.LIGHTS.items():
        b = base.setdefault(n, ob.data.energy)
        ob.data.energy = trims.get(n, b)
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
    st.chair(CHAIR[:2], CHAIR[2])
    st.envelope(ENVELOPE[0], ENVELOPE[1], st.TOP, ENVELOPE[2])
    sk.haze((2 * st.XW - 0.02, st.Y1 - st.Y0 - 0.02, st.H - 0.02), (0, (st.Y0 + st.Y1) / 2, st.H / 2), 0.004)
    room_haze = sk.haze((2 * st.RX - 0.02, st.RY1 - st.RY0 - 0.02, st.H - 0.02), (0, (st.RY0 + st.RY1) / 2, st.H / 2), 0.014)
    room_haze.name = "room_haze"
    for n, p in FOCUS.items():
        st.empty(n, p)
    install_hook()
