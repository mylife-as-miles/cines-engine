"""Render frames of one animated shot from its self-contained .blend. Needs only Blender 5.3 (the bpy module or the
blender binary); no repository, no add-ons.

    python -I render.py --blend blend/C_corridor.blend --out frames/C [--frames 1-116] [--shard 0/2]
                        [--samples 128] [--res 1920x1080] [--device OPTIX] [--format png|exr]
                        [--engine CYCLES|EEVEE] [--clay] [--lock /tmp/cines_render.lock] [--threads N]
    blender -b -P render.py -- (same arguments)

- --frames: "1-116", "11,58,106" or "1-116:5" (every fifth). Default: the file's whole range.
- --shard i/n: this process takes every n-th frame starting at the i-th (run one process per GPU, i = 0..n-1).
- --device: CPU, OPTIX, CUDA, HIP, ONEAPI or METAL. For any GPU type the script enables every device of that type,
  disables the CPU, and exits with an error (code 3) if there is none: it never falls back to the CPU.
- --engine EEVEE: Eevee at the film's settings below (64 samples unless --samples, ray tracing, volumes, motion
  blur). With a GPU --device (any but CPU) it reads the OpenGL renderer first and exits with code 3 if it is a
  software one (llvmpipe and the like): Eevee would otherwise run on the CPU without saying so.
- Frames already written are skipped (a killed render resumes); each frame is written to a temporary name and
  renamed when complete. One log line per frame: FRAME <n> <seconds> s <device> <samples> <res>.
- --clay: every surface a grey matte (volumes kept off), for the clay check.
- --lock: hold an flock on this file while each frame renders (this machine shares 4 cores between agents).
"""
import argparse
import fcntl
import os
import statistics
import sys
import time

import bpy

GPU_TYPES = ("OPTIX", "CUDA", "HIP", "ONEAPI", "METAL")


def parse():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--blend", required=True)
    p.add_argument("--out", required=True, help="output folder for frames (created)")
    p.add_argument("--frames", default=None)
    p.add_argument("--shard", default="0/1")
    p.add_argument("--samples", type=int, default=None, help="default: the file's (128)")
    p.add_argument("--noise-threshold", type=float, default=None, help="adaptive threshold; default the file's")
    p.add_argument("--res", default=None, help="WxH, default the file's (1920x1080)")
    p.add_argument("--device", default="CPU", type=str.upper)
    p.add_argument("--engine", default="cycles", type=str.lower, choices=("cycles", "eevee", "workbench"))
    p.add_argument("--format", default="png", choices=("png", "exr"))
    p.add_argument("--clay", action="store_true")
    p.add_argument("--no-blur", action="store_true", help="motion blur off (look checks only)")
    p.add_argument("--lock", default=None)
    p.add_argument("--lock-frames", type=int, default=1, help="frames rendered per hold of the lock")
    p.add_argument("--threads", type=int, default=0, help="CPU threads (0 = all)")
    p.add_argument("--prefix", default="", help="file name prefix")
    p.add_argument("--fast", action="store_true",
                   help="local preview only: fewer bounces, no caustics, coarser volume steps (never for finals)")
    return p.parse_args(argv)


def frame_list(spec, sc):
    if not spec:
        return list(range(sc.frame_start, sc.frame_end + 1))
    step = 1
    if ":" in spec:
        spec, s = spec.split(":")
        step = int(s)
    out = []
    for part in spec.split(","):
        if "-" in part:
            a, b = part.split("-")
            out.extend(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    return out[::step]


def fail(msg, code=3):
    print(f"RENDER error: {msg}", file=sys.stderr, flush=True)
    sys.exit(code)


def use_device(sc, device):
    """Cycles on the requested device, or exit with code 3. Returns a label for the log."""
    if device == "CPU":
        sc.cycles.device = "CPU"
        return "CPU"
    if device not in GPU_TYPES:
        fail(f"unknown device {device}")
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = device
    except TypeError:
        fail(f"this Blender build has no {device} backend")
    prefs.refresh_devices()
    gpus = [d for d in prefs.devices if d.type == device]
    for d in prefs.devices:
        d.use = d.type == device                  # the CPU is never added to a GPU render
    if not gpus:
        fail(f"no {device} device found; refusing to fall back to the CPU "
             f"(devices seen: {[(d.name, d.type) for d in prefs.devices]})")
    sc.cycles.device = "GPU"
    if hasattr(sc.cycles, "denoising_use_gpu"):
        sc.cycles.denoising_use_gpu = True
    names = ", ".join(sorted({d.name for d in gpus}))
    print(f"RENDER device {device}: {names}", flush=True)
    return f"{device}({names})"


SOFTWARE_GL = ("llvmpipe", "softpipe", "swrast", "swiftshader", "software")


def eevee_settings(sc, samples):
    """Eevee for the comparison with Cycles: the same camera, lights, exposure, AgX, motion blur and depth of field
    as the file; temporal samples, screen-space ray tracing, shadows and volumes set for finals."""
    sc.render.engine = "BLENDER_EEVEE"
    e = sc.eevee
    for attr, val in (("taa_render_samples", samples or 64), ("use_raytracing", True), ("ray_tracing_method", "SCREEN"),
                      ("use_shadows", True), ("shadow_ray_count", 2), ("shadow_step_count", 8),
                      ("volumetric_tile_size", "4"), ("volumetric_samples", 96), ("volumetric_start", 0.05),
                      ("volumetric_end", 30.0), ("use_volumetric_shadows", True), ("volumetric_shadow_samples", 16),
                      ("motion_blur_steps", 2), ("use_gtao", True), ("clamp_surface_indirect", 10.0)):
        if hasattr(e, attr):
            try:
                setattr(e, attr, val)
            except (TypeError, ValueError):
                pass
    if hasattr(e, "ray_tracing_options"):
        e.ray_tracing_options.resolution_scale = "1"
        e.ray_tracing_options.use_denoise = True


def freeze_bone_children(sc, frame):
    """Eevee 5.3 crashes (segfault) rendering motion blur on a mesh that is parented to a bone and carries its own
    modifier stack (the cast's sculpted hair: subdivision, shrinkwrap onto the head, displace, solidify). Bake each
    such mesh to a plain mesh as it stands at `frame`; it still follows its bone, so the head carries it as before."""
    sc.frame_set(frame)
    dg = bpy.context.evaluated_depsgraph_get()
    frozen = []
    for o in bpy.data.objects:
        if o.type == "MESH" and o.parent_type == "BONE" and len(o.modifiers) and not o.hide_render:
            me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
            o.modifiers.clear()
            o.data = me
            frozen.append(o.name)
    if frozen:
        print(f"RENDER Eevee: froze {len(frozen)} bone-parented modifier stacks ({', '.join(frozen)})", flush=True)


def gl_renderer():
    """The GPU context Eevee draws with (vendor and renderer). gpu.init() starts it in background mode."""
    try:
        import gpu
        try:
            return f"{gpu.platform.vendor_get()} {gpu.platform.renderer_get()}".strip()
        except SystemError:
            if hasattr(gpu, "init"):
                gpu.init()
            return f"{gpu.platform.vendor_get()} {gpu.platform.renderer_get()}".strip()
    except Exception as exc:                      # noqa: BLE001
        return f"unknown ({exc.__class__.__name__}: {exc})"


def clay(sc):
    """A grey matte override; volume-only boxes (haze) hidden so they do not become solid grey slabs."""
    m = bpy.data.materials.new("clay")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.42, 0.42, 0.42, 1)
    b.inputs["Roughness"].default_value = 0.8
    b.inputs["Specular IOR Level"].default_value = 0.2
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        mats = [s.material for s in o.material_slots if s.material and s.material.use_nodes]
        outs = [next((n for n in mm.node_tree.nodes if n.type == "OUTPUT_MATERIAL"), None) for mm in mats]
        if outs and all(x is not None and not x.inputs["Surface"].is_linked and x.inputs["Volume"].is_linked
                        for x in outs):
            o.hide_render = True
    bpy.context.view_layer.material_override = m


def main():
    a = parse()
    t_open = time.time()
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(a.blend), load_ui=False, use_scripts=True)
    sc = bpy.context.scene
    print(f"RENDER opened {a.blend} in {time.time() - t_open:.1f} s", flush=True)
    if a.res:
        sc.render.resolution_x, sc.render.resolution_y = (int(v) for v in a.res.lower().split("x"))
        sc.render.resolution_percentage = 100
    label = "CPU"
    if a.engine == "cycles":
        sc.render.engine = "CYCLES"
        label = use_device(sc, a.device)
        if a.samples:
            sc.cycles.samples = a.samples
        if a.noise_threshold is not None:
            sc.cycles.adaptive_threshold = a.noise_threshold
        if a.fast:
            c = sc.cycles
            c.max_bounces, c.diffuse_bounces, c.glossy_bounces, c.transmission_bounces = 4, 2, 2, 4
            c.caustics_reflective = c.caustics_refractive = False
            c.volume_step_rate = max(c.volume_step_rate, 4.0)
            c.denoising_prefilter = "ACCURATE"
            c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    elif a.engine == "eevee":
        eevee_settings(sc, a.samples)
        label = f"EEVEE({gl_renderer()})"
        print(f"RENDER Eevee draws with: {label}", flush=True)
        if a.device != "CPU" and any(w in label.lower() for w in SOFTWARE_GL + ("unknown",)):
            fail(f"Eevee would draw with a software renderer ({label}); refusing to render on the CPU")
    else:
        sc.render.engine = "BLENDER_WORKBENCH"
        sc.display.shading.light = "STUDIO"
        sc.display.shading.color_type = "SINGLE"
        label = "WORKBENCH"
    if a.threads:
        sc.render.threads_mode, sc.render.threads = "FIXED", a.threads
    if a.clay:
        clay(sc)
    if a.no_blur:
        sc.render.use_motion_blur = False
    fmt = sc.render.image_settings
    if a.format == "exr":
        fmt.file_format = "OPEN_EXR"
        fmt.color_mode = "RGB"
        fmt.color_depth = "16"
        fmt.exr_codec = "DWAA"
        ext = ".exr"
    else:
        fmt.file_format = "PNG"
        fmt.color_mode = "RGB"
        fmt.color_depth = "8"
        fmt.compression = 15
        ext = ".png"
    i, n = (int(v) for v in a.shard.split("/"))
    frames = frame_list(a.frames, sc)[i::n]
    if a.engine == "eevee" and frames:
        freeze_bone_children(sc, frames[0])
    os.makedirs(a.out, exist_ok=True)
    W, H = sc.render.resolution_x, sc.render.resolution_y
    spp = sc.cycles.samples if a.engine == "cycles" else (sc.eevee.taa_render_samples if a.engine == "eevee" else 0)
    print(f"RENDER {len(frames)} frames (shard {i}/{n}) {W}x{H} {a.engine} {spp} spp, blur "
          f"{'on' if sc.render.use_motion_blur else 'off'} -> {a.out}", flush=True)
    times = []
    lock = open(a.lock, "w") if a.lock else None
    held = 0
    for f in frames:
        final = os.path.join(a.out, f"{a.prefix}{f:04d}{ext}")
        if os.path.exists(final) and os.path.getsize(final) > 0:
            print(f"FRAME {f:04d} skip (exists)", flush=True)
            continue
        if lock and held == 0:
            fcntl.flock(lock, fcntl.LOCK_EX)
        try:
            t0 = time.time()
            sc.frame_set(f)
            tmp = os.path.join(a.out, f".{a.prefix}{f:04d}.part{ext}")
            sc.render.filepath = tmp
            bpy.ops.render.render(write_still=True)
            os.replace(tmp, final)
            dt = time.time() - t0
        finally:
            held += 1
            if lock and (held >= a.lock_frames or f == frames[-1]):
                fcntl.flock(lock, fcntl.LOCK_UN)
                held = 0
        times.append(dt)
        print(f"FRAME {f:04d} {dt:7.2f} s {label} {spp}spp {W}x{H}", flush=True)
    if times:
        print(f"RENDER done: {len(times)} frames, mean {statistics.mean(times):.2f} s, median "
              f"{statistics.median(times):.2f} s, first {times[0]:.2f} s, total {sum(times):.0f} s", flush=True)
    else:
        print("RENDER done: nothing to render", flush=True)


if __name__ == "__main__":
    main()
