"""Measure what a final frame of a shot costs on this machine's CPU, as the basis of the GPU estimate.

    <bpy python> -I scenes/anim_tests/measure_cpu.py --blend out/anim_tests/blend/C_corridor.blend [--frame 58]

At the final settings (128 samples, adaptive 0.03, denoiser, motion blur) but 480x270 (1/16 of the pixels of
1920x1080, the whole composition), in one process with persistent data:
  1. frame-1 at 1 sample (warm-up: loads kernels, builds the static scene),
  2. frame at 1 sample (the per-frame overhead: animation, deformed meshes and motion steps re-synced, denoise),
  3. the same frame at 128 samples, 4. the same frame at 1 sample again (3 - 4 is the sampling alone).
Wall time and this process's CPU time (all threads) are printed for each. Sampling cost = 3 - 4; for 1920x1080 it
scales with the pixels (x16). CPU seconds are the stable measure on a shared machine (other agents' renders stretch
wall time, not the work done).
"""
import argparse
import os
import sys
import time

import bpy

ap = argparse.ArgumentParser()
ap.add_argument("--blend", required=True)
ap.add_argument("--frame", type=int, default=58)
ap.add_argument("--res", default="480x270")
ap.add_argument("--samples", type=int, default=128)
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
a = ap.parse_args(argv)
bpy.ops.wm.open_mainfile(filepath=os.path.abspath(a.blend), load_ui=False, use_scripts=True)
sc = bpy.context.scene
sc.render.resolution_x, sc.render.resolution_y = (int(v) for v in a.res.split("x"))
sc.render.resolution_percentage = 100
sc.render.threads_mode = "AUTO"
results = {}
tmp = os.path.join(os.path.dirname(os.path.abspath(a.blend)), f".measure-{os.getpid()}.png")
for label, frame, spp in (("warm-up", a.frame - 1, 1), ("new frame", a.frame, 1), ("final", a.frame, a.samples),
                          ("same frame", a.frame, 1)):
    sc.cycles.samples = spp
    w0, c0 = time.time(), time.process_time()
    if sc.frame_current != frame:
        sc.frame_set(frame)
    sc.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    w, c = time.time() - w0, time.process_time() - c0
    results[label] = (w, c)
    print(f"MEASURE {os.path.basename(a.blend)} {label:10s} frame {frame} {spp:3d} spp {a.res}: wall {w:7.1f} s, "
          f"cpu {c:7.1f} s, load {os.getloadavg()[0]:.1f}", flush=True)
os.remove(tmp)
k = (1920 * 1080) / (sc.render.resolution_x * sc.render.resolution_y)
over_c = results["new frame"][1]
samp_c = results["final"][1] - results["same frame"][1]
samp_w = results["final"][0] - results["same frame"][0]
print(f"MEASURE {os.path.basename(a.blend)} summary: per-frame overhead {over_c:.0f} cpu-s (wall {results['new frame'][0]:.0f} s); "
      f"sampling {samp_c:.0f} cpu-s at {a.res} -> {k * samp_c:.0f} cpu-s at 1920x1080 {a.samples} spp "
      f"(wall here {samp_w:.0f} s x {k:.0f})", flush=True)
