"""Shot C: the detention corridor, a slow dolly with haze and dust; the visitation room's door closes softly.

    <bpy python> -I scenes/anim_tests/shot_c_corridor.py [--out out/anim_tests/blend/C_corridor.blend]

The set is scenes/stages/detention_corridor.py exactly as the film's `corridor` plate uses it (its per-camera light
trims applied through its own apply_camera). On top of it:
- the camera dollies 1.2 m down the corridor's axis at a constant 0.25 m/s (eased only in the handles), level, from
  the plate's own position, lens 28 mm; f/4 focused 6.5 m out, so the near motes go soft and the far end stays sharp;
- the corridor's haze is thicker (0.0018 -> 0.0042) and no longer uniform (a large, still noise, so the light's shapes
  vary in depth and shift with the dolly's parallax);
- a shaft from the near cell's night light through its barred vision panel crosses the corridor in front of the
  lens, in a pocket of denser air that lives only inside the beam, so the bars cut it into slats;
- 5,100 seeded dust motes: half in that beam, the rest a sparse field (a little denser under the lit fitting), each
  settling and swaying slowly;
- the visitation door, ajar at 50 degrees, starts to swing shut at 1.4 s and settles closed at 4.2 s on a
  door-closer's curve (fast then slow); the cheat light in its gap fades with the opening so the warm wedge on the
  floor narrows away with it (the room's own lights are occluded by the leaf physically).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C  # noqa: E402

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

NAME = "C_corridor"
START = Vector((0.0, -2.6, 1.36))       # the plate camera ("corridor")
TRAVEL = 1.2                            # metres down the corridor over the 116 frames
AIM_Y = 13.0
LENS, FSTOP, FOCUS = 28.0, 4.0, 6.5
HAZE = 0.0042
DOOR_OPEN, DOOR_SHUT = 50.0, 0.8        # degrees
DOOR_T = (1.40, 4.20)                   # seconds from frame 1: swing starts, latches
SHAFT_FROM, SHAFT_TO = (3.6, -0.55, 2.45), (1.33, -0.40, 1.50)   # inside cell 6, aimed through its vision panel
SHAFT_W = 9000.0
SHAFT_HAZE = 0.055


def door_angle(t):
    """A door closer: an even swing that slows into the latch, then a 3 mm settle (no bounce)."""
    t0, t1 = DOOR_T
    if t <= t0:
        return DOOR_OPEN
    if t >= t1:
        return DOOR_SHUT
    u = (t - t0) / (t1 - t0)
    # ease in over the first fifth (the hand lets go), then decelerate (1 - (1-u)^2.4), blended smoothly
    k = 1.0 - (1.0 - u) ** 2.4
    k = k * C.smooth(u / 0.2) + (u * 0.5) * (1 - C.smooth(u / 0.2))
    return DOOR_OPEN + (DOOR_SHUT - DOOR_OPEN) * k


def haze_breathing(ob, density):
    """Replace a homogeneous haze with one modulated by a large, still noise: the light's shapes vary in depth and
    the dolly's parallax moves them. (A drifting noise was tried: a keyed value in a volume material makes Cycles
    rebuild the volume every frame, 25 CPU-seconds a frame here, for a drift nobody could see.)"""
    m = ob.active_material
    nt = m.node_tree
    pv = next(n for n in nt.nodes if n.type == "PRINCIPLED_VOLUME")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    drift = nt.nodes.new("ShaderNodeMapping")
    drift.vector_type = "POINT"
    nt.links.new(tc.outputs["Object"], drift.inputs["Vector"])
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 0.55
    noise.inputs["Detail"].default_value = 2.0
    noise.inputs["Roughness"].default_value = 0.55
    nt.links.new(drift.outputs["Vector"], noise.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value, ramp.inputs["From Max"].default_value = 0.30, 0.70
    ramp.inputs["To Min"].default_value, ramp.inputs["To Max"].default_value = 0.55 * density, 1.45 * density
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Value"])
    nt.links.new(ramp.outputs["Result"], pv.inputs["Density"])
    return m


def build():
    mod = C.stage("detention_corridor", cast=False)
    import detention_corridor_set as st
    C.remove_stage_cameras()
    frames = C.FRAMES
    n = len(frames)
    locs = [START + Vector((0.0, TRAVEL * C.cruise(i / (n - 1), ease=HANDLE_EASE), 0.0)) for i in range(n)]
    aims = [Vector((0.0, AIM_Y, START.z)) for _ in frames]
    focus = [(Vector((0, START.y + FOCUS, START.z)) - loc).length for loc in locs]   # one plane in the corridor
    cam = C.moving_camera("anim_cam", frames, locs, aims, LENS, FSTOP, focus=focus, clip=(0.02, 200.0))
    # the plate's own per-camera state (trims, lens shift, denoiser) as the film's corridor camera has it
    mod.apply_camera("corridor")
    cam.data.shift_x, cam.data.shift_y = mod.CAMERAS["corridor"].get("shift", (0.0, 0.0))
    cam.data.clip_start = 0.02

    # haze: the corridor's volume (the first "haze" box) thicker and breathing; the room's stays as it is
    corridor_haze = next(o for o in bpy.data.objects if o.name.startswith("haze") and o.name != "room_haze"
                         and abs(o.location.y - (st.Y0 + st.Y1) / 2) < 0.1)
    haze_breathing(corridor_haze, HAZE)

    # a shaft from the near cell's night light through its barred vision panel, across the corridor in front of
    # the lens: the bars cut it into slats in the haze. The pane stops casting shadows (a thin pane passes the light;
    # Cycles would otherwise treat it as a caustic and the shaft would never resolve).
    glass = bpy.data.objects["cd6_glass"]
    glass.visible_shadow = False
    shaft = bpy.data.lights.new("cell6_shaft", "SPOT")
    shaft.energy, shaft.color, shaft.shadow_soft_size = SHAFT_W, (0.66, 0.79, 1.0), 0.03
    shaft.spot_size, shaft.spot_blend = math.radians(17.0), 0.45
    so = bpy.data.objects.new("cell6_shaft", shaft)
    bpy.context.scene.collection.objects.link(so)
    so.location = SHAFT_FROM
    so.rotation_euler = (Vector(SHAFT_TO) - Vector(SHAFT_FROM)).to_track_quat("-Z", "Y").to_euler()
    so.visible_camera = False
    shaft.use_soft_falloff = False

    # the air the shaft crosses is thicker (a pocket with no edge), so the slats read as beams
    C.beam_haze("shaft_haze", (-st.XW + 0.01, -1.6, 0.01), (st.XW - 0.01, 1.0, 2.2), SHAFT_FROM, SHAFT_TO, 0.21,
                SHAFT_HAZE)
    axis_o, axis_d = Vector(SHAFT_FROM), (Vector(SHAFT_TO) - Vector(SHAFT_FROM)).normalized()
    reach = (Vector(SHAFT_TO) - axis_o).length

    def in_shaft(p):
        """1 inside the window's beam (its half width grows with distance from the lamp), falling to 0 just outside."""
        s = (p - axis_o).dot(axis_d)
        if s < reach:
            return 0.0
        r = (p - axis_o - axis_d * s).length
        return 1.0 - C.smooth((r - 0.20 * s / reach) / 0.12)

    # dust: motes in the beam (where they catch the light and show), a sparse field elsewhere, a little more under
    # the lit fitting
    def field(p):
        pool = math.exp(-((p.y - 4.6) / 1.1) ** 2) * (0.5 if p.z > 0.4 else 0.2)
        return min(1.0, 0.10 + pool)
    d1 = C.dust("corridor_dust", (-st.XW + 0.03, -1.9, 0.08), (st.XW - 0.03, 8.5, st.H - 0.12), 2500, seed=606,
                radius=(0.0005, 0.0014), density_fn=field)
    d2 = C.dust("shaft_dust", (-st.XW + 0.03, -1.4, 0.05), (st.XW - 0.03, 0.9, 2.2), 2600, seed=607,
                radius=(0.0005, 0.0015), density_fn=in_shaft)
    for d in (d1, d2):
        d.cycles.use_motion_blur = False   # 2-4 mm a frame: no visible streak, and it halves the frame time

    # the visitation door closing softly, and the gap's cheat light fading with its opening
    leaf = st.PARTS["vd_leaf"]
    leaf.rotation_mode = "XYZ"
    angles = [door_angle(C.t_of(f)) for f in frames]
    C.bake(leaf, "rotation_euler", frames, [math.radians(a) for a in angles], index=2)
    leak = st.LIGHTS["vd_leak"].data
    base = leak.energy
    C.bake(leak, "energy", frames, [base * min(1.0, math.sin(math.radians(a)) / math.sin(math.radians(DOOR_OPEN)))
                                    for a in angles])
    C.film_settings(exposure=mod.CAMERAS["corridor"].get("exposure", mod.EXPOSURE))
    sc = bpy.context.scene
    sc.cycles.sample_clamp_indirect = 6.0     # as the stage's apply_camera sets it
    sc.cycles.blur_glossy = 0.5
    sc.cycles.volume_step_rate = 2.0          # a coarser volume step (the check-in hall's own setting): cheaper haze
    C.volumes_off_blur()
    print(f"ANIM {NAME}: dolly {TRAVEL} m, door {DOOR_OPEN}->{DOOR_SHUT} deg over {DOOR_T} s; fingerprint "
          f"{C.fingerprint([cam, leaf])}", flush=True)
    return cam


HANDLE_EASE = 0.09   # the speed ramps only inside the handles: 10 of 116 frames is 8.6 %


if __name__ == "__main__":
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    out = a[a.index("--out") + 1] if "--out" in a else os.path.join(C.BLENDS, NAME + ".blend")
    build()
    C.save(os.path.abspath(out))
