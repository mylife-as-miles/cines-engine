"""Render frames of shot AB_HK (or any self-contained shot .blend) in Eevee or Cycles. Needs only Blender 5.3 (the
blender binary or the bpy module); no repository, no add-ons. The flags of scenes/anim_tests/render.py, plus Eevee.

    blender -b --factory-startup -P render.py -- --blend blend/AB_HK.blend --out frames/AB_HK_eevee --engine EEVEE
    blender -b --factory-startup -P render.py -- --blend blend/AB_HK.blend --out frames/AB_HK_cycles --engine CYCLES \\
            --device OPTIX --frames 35-82
    python -I render.py --blend ... (with the bpy module)

- --engine EEVEE | CYCLES | WORKBENCH (any case). Default CYCLES.
- --frames: "1-116", "35-82", "11,58,106" or "1-116:5" (every fifth). Default: the file's whole range.
- --shard i/n: this process takes every n-th frame starting at the i-th (one process per GPU, i = 0..n-1).
- --samples: Cycles samples (file: 128, adaptive 0.03) or Eevee TAA samples (file: 64).
- --device (Cycles): CPU, OPTIX, CUDA, HIP, ONEAPI or METAL. A GPU type enables every device of that type, disables
  the CPU, and exits with code 3 if there is none: never a silent CPU fallback.
- Eevee runs on the GPU through OpenGL or Vulkan. Before the first frame a tiny frame is rendered (it also compiles the
  shaders) and the GPU that drew it is read: if it is a software renderer (llvmpipe, softpipe, SwiftShader) the script
  exits with code 3 unless --allow-software is given.
- Frames already written are skipped (a killed render resumes); each frame is written to a temporary name and renamed
  when complete. One log line per frame: FRAME <n> <seconds> s <device> <samples> <res>.
- --clay: every surface a grey matte (volumes off). --no-blur: motion blur off (look checks only: the rain becomes
  dots). --fast (Cycles, local previews only): fewer bounces, coarser volume steps.
- --lock: hold an flock on this file while each frame renders (a machine shared between agents).
"""
import argparse
import fcntl
import os
import statistics
import sys
import time

import bpy

GPU_TYPES = ("OPTIX", "CUDA", "HIP", "ONEAPI", "METAL")
SOFTWARE = ("llvmpipe", "softpipe", "swiftshader", "software", "lavapipe")


def parse():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--blend", required=True)
    p.add_argument("--out", required=True, help="output folder for frames (created)")
    p.add_argument("--frames", default=None)
    p.add_argument("--shard", default="0/1")
    p.add_argument("--engine", default="CYCLES", type=str.upper, choices=("CYCLES", "EEVEE", "WORKBENCH"))
    p.add_argument("--samples", type=int, default=None, help="default: the file's (Cycles 128, Eevee 64)")
    p.add_argument("--noise-threshold", type=float, default=None, help="Cycles adaptive threshold; default the file's")
    p.add_argument("--res", default=None, help="WxH, default the file's (1920x1080)")
    p.add_argument("--device", default="CPU", type=str.upper)
    p.add_argument("--allow-software", action="store_true", help="Eevee: accept a software OpenGL/Vulkan renderer")
    p.add_argument("--format", default="png", choices=("png", "exr"))
    p.add_argument("--clay", action="store_true")
    p.add_argument("--no-blur", action="store_true")
    p.add_argument("--fast", action="store_true")
    p.add_argument("--lock", default=None)
    p.add_argument("--threads", type=int, default=0, help="CPU threads (0 = all)")
    p.add_argument("--prefix", default="", help="file name prefix")
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
        d.use = d.type == device
    if not gpus:
        fail(f"no {device} device found; refusing to fall back to the CPU "
             f"(devices seen: {[(d.name, d.type) for d in prefs.devices]})")
    sc.cycles.device = "GPU"
    if hasattr(sc.cycles, "denoising_use_gpu"):
        sc.cycles.denoising_use_gpu = True
    names = ", ".join(sorted({d.name for d in gpus}))
    print(f"RENDER device {device}: {names}", flush=True)
    return f"{device}({names})"


def eevee_engine_id():
    ids = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    for k in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        if k in ids:
            return k
    fail(f"no Eevee in this build (engines: {ids})")


def eevee_check(sc, tmp_dir, allow_software):
    """Render a tiny frame (compiles the shaders, builds the scene), then read which GPU drew it."""
    W, H, P = sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage
    spp = sc.eevee.taa_render_samples
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 64, 36, 100
    sc.eevee.taa_render_samples = 1
    t0 = time.time()
    sc.render.filepath = os.path.join(tmp_dir, ".eevee_warmup.png")
    bpy.ops.render.render(write_still=True)
    try:
        os.remove(sc.render.filepath)
    except OSError:
        pass
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, H, P
    sc.eevee.taa_render_samples = spp
    import gpu
    try:
        renderer = f"{gpu.platform.renderer_get()} ({gpu.platform.backend_type_get()})"
    except Exception as e:                                   # noqa: BLE001
        renderer = f"unknown ({e})"
    print(f"RENDER Eevee on {renderer}; warm-up (shaders, scene) {time.time() - t0:.1f} s", flush=True)
    if any(s in renderer.lower() for s in SOFTWARE) and not allow_software:
        fail(f"Eevee is drawing with a software renderer ({renderer}); refusing (pass --allow-software to accept)")
    return renderer


def clay(sc):
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
    print(f"RENDER opened {a.blend} in {time.time() - t_open:.1f} s (Blender {bpy.app.version_string})", flush=True)
    if a.res:
        sc.render.resolution_x, sc.render.resolution_y = (int(v) for v in a.res.lower().split("x"))
        sc.render.resolution_percentage = 100
    if a.threads:
        sc.render.threads_mode, sc.render.threads = "FIXED", a.threads
    if a.clay:
        clay(sc)
    if a.no_blur:
        sc.render.use_motion_blur = False
    fmt = sc.render.image_settings
    if a.format == "exr":
        fmt.file_format, fmt.color_mode, fmt.color_depth, fmt.exr_codec = "OPEN_EXR", "RGB", "16", "DWAA"
        ext = ".exr"
    else:
        fmt.file_format, fmt.color_mode, fmt.color_depth, fmt.compression = "PNG", "RGB", "8", 15
        ext = ".png"
    os.makedirs(a.out, exist_ok=True)
    if a.engine == "CYCLES":
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
        spp = sc.cycles.samples
    elif a.engine == "EEVEE":
        sc.render.engine = eevee_engine_id()
        if a.device != "CPU":
            print("RENDER note: Eevee draws on the GPU through OpenGL/Vulkan; --device is for Cycles", flush=True)
        if a.samples:
            sc.eevee.taa_render_samples = a.samples
        spp = sc.eevee.taa_render_samples
        label = "EEVEE " + eevee_check(sc, a.out, a.allow_software)
    else:
        sc.render.engine = "BLENDER_WORKBENCH"
        sc.display.shading.light = "STUDIO"
        sc.display.shading.color_type = "SINGLE"
        label, spp = "WORKBENCH", 0
    i, n = (int(v) for v in a.shard.split("/"))
    frames = frame_list(a.frames, sc)[i::n]
    W, H = sc.render.resolution_x, sc.render.resolution_y
    print(f"RENDER {len(frames)} frames (shard {i}/{n}) {W}x{H} {a.engine} {spp} spp, blur "
          f"{'on' if sc.render.use_motion_blur else 'off'} -> {a.out}", flush=True)
    times = []
    lock = open(a.lock, "w") if a.lock else None
    for f in frames:
        final = os.path.join(a.out, f"{a.prefix}{f:04d}{ext}")
        if os.path.exists(final) and os.path.getsize(final) > 0:
            print(f"FRAME {f:04d} skip (exists)", flush=True)
            continue
        if lock:
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
            if lock:
                fcntl.flock(lock, fcntl.LOCK_UN)
        times.append(dt)
        print(f"FRAME {f:04d} {dt:7.2f} s {label} {spp}spp {W}x{H}", flush=True)
    if times:
        print(f"RENDER done: {len(times)} frames, mean {statistics.mean(times):.2f} s, median "
              f"{statistics.median(times):.2f} s, first {times[0]:.2f} s, total {sum(times):.0f} s", flush=True)
    else:
        print("RENDER done: nothing to render", flush=True)


if __name__ == "__main__":
    main()
