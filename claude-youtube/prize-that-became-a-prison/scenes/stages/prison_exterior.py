"""Stage: the outside of the prison at night in the rain (Ch 08 "What twelve years can take", establishing).

A high cast-concrete perimeter wall with a coping and a concertina coil of razor wire, seen from the wet perimeter
road. Floodlight masts stand along the far verge and throw hard, cold pools on the road and the wall; the mist
gives every lamp a cone and the rain shows only where it falls through one. The closed steel vehicle gate has its
own floodlight, carried over the wire on the outreach arm of a column that stands inside. A watchtower stands
astride the wall, its glazing dark. Beyond the wall the cell blocks are dark slabs with a few lit, barred windows;
low sodium yard lights, never seen themselves, warm the mist behind the wire. No flag, emblem, sign or text; no
people outside. With the cast, one officer stands still behind the tower's dark glass (people.officer), a
silhouette at most.

Cameras (beat ch08; the first two are level, framed upward with lens shift so the wall and the masts stay vertical):
  wall   low over the wet road, along the wall into the distance: the pools receding, the tower rising from the
         wall on the right, the gate's lamp and the far block in the mist beyond (COVERAGE "The prison wall,
         2014-2026": the sky over the vanishing point is left clear for the year line)
  gate   frontal on the closed vehicle gate under its floodlight, the cone and the rain above it, the wet approach
         in front (COVERAGE "The gate a visitor comes to")
  tower  low angle up at the watchtower, the wire running to it against the night sky

    <bpy python> -I scenes/shoot.py -- prison_exterior <cam> out.png [--nocast]

Set: prison_exterior_set.py; materials: prison_exterior_mats.py. Before every render a hook on setkit.render sets
the far clip (the sky dome is 1.1 km away), the lens shift, the mist density, that camera's rain and light trims,
and keeps the spill lamps (and, for the wall frame, the mast the camera stands under) out of the mist. A render_pre
handler lowers Cycles' adaptive threshold from setkit's 0.03 to 0.012: the mist and the rain need the samples.
The rain is geometry: short thin streaks placed only inside the floodlights' cones, in the camera's own view, each
under a pixel wide and lit by the lamps like everything else, so it is brightest near a lamp and gone outside the
cones, as rain is to the eye at night.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "noir-kit"))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402

import setkit as sk  # noqa: E402
import prison_exterior_mats as mt  # noqa: E402
import prison_exterior_set as st  # noqa: E402

EXPOSURE = -1.5
WORLD = 0.0
RES_X = 1280                 # the rain's streaks are sized to be about a pixel wide at the final resolution

CAMERAS = {
    # Ch 08: low over the wet road, level, 7 m from the wall and turned a little toward it: the wall's top and the
    # wire run from the upper right to the vanishing point, the nearest mast and its lamp stand upper left, the
    # tower rises from the wall on the right third, the gate's lamp and the far block sit in the mist beyond
    "wall": dict(loc=(-7.0, -62.0, 0.45), aim=(-4.0, 38.0, 0.45), lens=30, shift_y=0.139, exposure=-1.3, mist=0.0045,
                 beat="ch08", no_scatter=("mast_spot_0", "mast_spill_0")),
    # Ch 08: frontal and level on the approach road's centre line at a standing eye: the gate and its piers in the
    # middle, its floodlight above on the outreach arm, the cone and the rain between, the wet road below
    "gate": dict(loc=(-24.0, 0.0, 1.45), aim=(0.0, 0.0, 1.45), lens=35, shift_y=0.116, exposure=-1.25, mist=0.005,
                 beat="ch08"),
    # Ch 08: from the road, low, up at the tower: its outer face in the mast's light, the cabin dark against the
    # sky, the wire running along the wall top to it
    "tower": dict(loc=(-8.5, -9.0, 0.55), aim=(2.2, -20.2, 9.9), lens=26, shift_y=0.0, exposure=-1.2, mist=0.006,
                  beat="ch08"),
}
# light trims per camera: group -> factor (groups: mast, spill, gate, yard, yardglow, tower)
# (a key may also be the start of a lamp's name: the mast beside the wall camera is turned down for that frame, so
# the pools further along the wall are the brighter ones)
TRIMS = {"wall": {"mast_spot_0": 0.7, "mast_spill_0": 0.7}, "gate": {"yardglow": 0.52}, "tower": {}}
# Cover sets the number of streaks. Gain and max_radiance set their backscatter
# so the gate can hold fine rain without obscuring its surface.
RAIN = {"wall": dict(cover=0.045, seed=3, gain=0.12, wpx=(0.30, 0.55), length=(0.25, 0.55)),
        "gate": dict(cover=0.05, seed=5, gain=0.03, wpx=(0.30, 0.55), length=(0.18, 0.40), max_radiance=0.50),
        "tower": dict(cover=0.020, seed=8, gain=0.22, wpx=(0.30, 0.60), length=(0.23, 0.50))}
FALL = (0.07, -0.035, -1.0)   # the rain's fall line: a light wind along the wall

_STATE = {"rain": {}, "cast": []}


# ---------------------------------------------------------------- rain
def camera_frame(cfg):
    loc, aim = np.array(cfg["loc"], float), np.array(cfg["aim"], float)
    f = aim - loc
    f /= np.linalg.norm(f)
    r = np.cross(f, (0.0, 0.0, 1.0))
    r /= np.linalg.norm(r)
    u = np.cross(r, f)
    return loc, f, r, u


def irradiance(P, skip=()):
    """What the lamps put on points P (N x 3), ignoring shadows: enough to know where rain would show."""
    E = np.zeros(len(P))
    for L in st.LIGHTS:
        spill = L["name"].startswith(("mast_spill", "gate_spill"))
        if L["kind"] != "spot" and not spill or L["group"] == "yard" or any(L["name"].startswith(k) for k in skip):
            continue
        v = P - np.array(L["loc"])
        d2 = np.maximum((v * v).sum(1), 0.25)
        e = (0.30 if spill else 1.0) * L["power"] / (4 * math.pi * np.maximum(d2, 9.0))
        if L["kind"] == "spot":
            ca = (v @ np.array(L["dir"])) / np.sqrt(d2)
            ch = math.cos(L["half"])
            t = np.clip((ca - ch) / max(L["blend"] * (1 - ch), 1e-4), 0.0, 1.0)
            e = e * t * t * (3 - 2 * t)
        E += e
    return E


def make_rain(name, cfg, cover, seed, gain=0.5, wpx=(0.35, 0.75), length=(0.25, 0.6), e_min=0.8,
              d_min=4.5, d_max=75.0, d_knee=11.0, max_radiance=1.5):
    """Streaks in this camera's view, only where light falls. Even per volume near the camera and thinning beyond
    `d_knee`; each as wide as about one pixel at its distance, so near and far rain read alike."""
    loc, f, r, u = camera_frame(cfg)
    lens = cfg.get("lens", 35)
    sy = cfg.get("shift_y", 0.0) * 36.0
    rs = np.random.RandomState(seed)
    N = 1400000
    a1 = (d_knee ** 3 - d_min ** 3) / 3.0
    a2 = d_knee ** 2 * (d_max - d_knee)
    near = rs.rand(N) < a1 / (a1 + a2)
    q = rs.rand(N)
    d = np.where(near, (d_min ** 3 + q * (d_knee ** 3 - d_min ** 3)) ** (1 / 3), d_knee + q * (d_max - d_knee))
    sx_mm = (rs.rand(N) * 2 - 1) * 18.0 * 1.1
    sy_mm = (rs.rand(N) * 2 - 1) * 10.125 * 1.15 + sy
    dirs = f[None, :] + r[None, :] * (sx_mm / lens)[:, None] + u[None, :] * (sy_mm / lens)[:, None]
    P = loc[None, :] + dirs * d[:, None]
    keep = (P[:, 2] > 0.35) & (P[:, 2] < 26.0)
    for (x0, x1, y0, y1, z0, z1) in st.SOLIDS:
        keep &= ~((P[:, 0] > x0 - 0.1) & (P[:, 0] < x1 + 0.1) & (P[:, 1] > y0 - 0.1) & (P[:, 1] < y1 + 0.1) & (P[:, 2] > z0 - 0.1) & (P[:, 2] < z1 + 0.4))
    keep &= ~((P[:, 0] > st.WALL_T) & (P[:, 2] < st.COPE_TOP + 0.4))        # nothing low in the yards
    P, d = P[keep], d[keep]
    E = irradiance(P, cfg.get("no_scatter", ()))
    lit = (E > e_min) & (rs.rand(len(E)) < np.clip(E / 12.0, 0.0, 1.0) ** 0.7)
    P, d, E = P[lit], d[lit], E[lit]
    # draw them in a random order and stop when they cover enough of the frame
    order = rs.permutation(len(P))[:60000]
    P, d, E = P[order], d[order], E[order]
    length = rs.uniform(length[0], length[1], len(P))       # a short shutter
    wpx = rs.uniform(wpx[0], wpx[1], len(P))                # under a pixel wide: a streak, never a dash
    px = length * lens * RES_X / (36.0 * d) * wpx
    n = int(np.searchsorted(np.cumsum(px), cover * RES_X * RES_X * 9 / 16)) + 1
    n = min(n, len(P))
    P, d, length, wpx = P[:n], d[:n], length[:n], wpx[:n]
    energy = E[:n] * rs.uniform(0.5, 1.5, n)
    if name == "rain_tower":
        near = 35
        depth = rs.uniform(1.5, 3.0, near)
        directions = (f + rs.uniform(-18 / lens, 18 / lens, (near, 1)) * r
                      + rs.uniform(-10 / lens, 10 / lens, (near, 1)) * u)
        P = np.vstack((P, loc + depth[:, None] * directions))
        d = np.r_[d, depth]
        length = np.r_[length, rs.uniform(0.025, 0.052, near)]
        wpx = np.r_[wpx, rs.uniform(1, 1.6, near)]
        energy = np.r_[energy, rs.uniform(0.5, 1.6, near)]
        n += near
    fall = np.array(FALL, float)
    fall = fall[None, :] + rs.normal(0.0, 0.012, (n, 3))
    fall /= np.linalg.norm(fall, axis=1)[:, None]
    width = np.maximum(0.001, wpx * d * 36.0 / (lens * RES_X))
    a = np.cross(fall, f[None, :])
    a /= np.linalg.norm(a, axis=1)[:, None]
    # One tapered ribbon, integrated once per ray. The stored value is the illumination
    # at the drop, including the near-lamp clamp; the background passes through in full.
    hw = a * (width / 2)[:, None]
    drift = fall * length[:, None]
    V = np.stack((P - 0.5 * drift, P - 0.33 * drift + hw, P + 0.33 * drift + hw,
                  P + 0.5 * drift, P + 0.33 * drift - hw, P - 0.33 * drift - hw), axis=1).reshape(-1, 3)
    F = np.arange(n * 6).reshape(n, 6)
    me = bpy.data.meshes.new(name)
    me.from_pydata(V.tolist(), [], F.tolist())
    energy_attr = me.attributes.new("drop radiance", "FLOAT", "FACE")
    radiance = np.minimum(max_radiance, gain * energy * 0.40)
    energy_attr.data.foreach_set("value", radiance.astype(np.float32))
    me.update()
    me.materials.append(mt.M["rain"])
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.visible_shadow = ob.visible_diffuse = ob.visible_glossy = False
    ob.visible_volume_scatter = ob.visible_transmission = False
    ob.hide_render = True
    print(f"PRISON rain {name}: {n} streaks", flush=True)
    return ob


# ---------------------------------------------------------------- the one person
def build_cast():
    """One officer, still, behind the tower's dark glass, looking out over the road."""
    try:
        import people
        import rigged
        h = people.officer("TowerOfficer", 2)
        rigged.pose_figure(h, {"head": (6, 0), "l_arm": (3, 6, 8), "r_arm": (3, 6, 8)})
        tx, ty = st.TOWER
        # This mark clears the deck from the low camera and puts the
        # watcher behind the north pane and its dim ceiling return.
        h.location = (tx - 0.48, ty + 1.68, st.OBJ["cabin_floor"])
        h.rotation_euler.z = math.radians(197.0)
        _STATE["cast"].append(h)
        print("PRISON cast: the tower officer", flush=True)
    except Exception as e:  # the set stands without him
        print(f"PRISON cast skipped: {e!r}", flush=True)


# ---------------------------------------------------------------- per camera
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
    sc = bpy.context.scene
    cam = sc.camera
    if cam is not None:
        cam.data.clip_start, cam.data.clip_end = 0.05, 4000.0
        cam.data.shift_y = cfg.get("shift_y", 0.0)
    mt.set_mist(mt.M["mist"], cfg.get("mist", 0.006))
    for n, ob in _STATE["rain"].items():
        ob.hide_render = n != name
    trims = TRIMS.get(name, {})
    quiet = cfg.get("no_scatter", ())
    for L in st.LIGHTS:
        k = trims.get(L["group"], 1.0)
        for key, v in trims.items():
            if L["name"].startswith(key):
                k = v
        L["ob"].data.energy = L["power"] * k
        # a lamp whose cone the camera stands in would veil the whole view: it lights surfaces, not the mist.
        # The spill lamps (points) stay out of the mist too: their halos only added noise round the lamp heads
        L["ob"].visible_volume_scatter = L["group"] != "spill" and not any(L["name"].startswith(q) for q in quiet)
    sc.cycles.sample_clamp_indirect = 4.0
    sc.cycles.blur_glossy = 0.6
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.transparent_max_bounces = 12
    for k, v in (("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH"),
                 ("denoising_input_passes", "RGB_ALBEDO_NORMAL")):
        try:
            setattr(sc.cycles, k, v)
        except (AttributeError, TypeError):
            pass
    print(f"PRISON camera {name}: shift {cfg.get('shift_y', 0.0)}, mist {cfg.get('mist', 0.006)}", flush=True)


def _finer_sampling(scene, *_):
    """Mist and rain want more of the 64 samples than setkit's adaptive threshold (0.03) lets them have."""
    scene.cycles.adaptive_threshold = 0.012


def install_hook():
    hs = bpy.app.handlers.render_pre
    for h in [h for h in hs if getattr(h, "__name__", "") == "_finer_sampling"]:
        hs.remove(h)
    hs.append(_finer_sampling)
    orig = getattr(sk.render, "_orig", sk.render)

    def render(*args, **kw):
        apply_camera(which_camera())
        kw.setdefault("world", WORLD)
        return orig(*args, **kw)
    render._orig = orig
    sk.render = render


def build(cast=True):
    st.build()
    _STATE["rain"], _STATE["cast"] = {}, []
    for n, cfg in CAMERAS.items():
        _STATE["rain"][n] = make_rain(f"rain_{n}", cfg, **RAIN[n])
    if cast:
        build_cast()
    install_hook()
