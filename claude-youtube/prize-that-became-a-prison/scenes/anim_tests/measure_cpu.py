"""Measure what a final frame of a shot costs on this machine's CPU, as the basis of the GPU estimate.

    <bpy python> -I scenes/anim_tests/measure_cpu.py --blend out/anim_tests/blend/C_corridor.blend [--frame 58]

At the final settings (128 samples, adaptive 0.03, denoiser, motion blur) but 480x270 (1/16 of the pixels of
1920x1080, the whole composition), in one process with persistent data:
  1. frame-1 at 1 sample (warm-up: loads kernels, builds the static scene),
  2. frame at 1 sample (the per-frame overhead: animation, deformed meshes and motion steps re-synced, denoise),
  3. frame+1 at 128 samples (overhead + sampling).
Wall time and this process's CPU time (all threads) are printed for each. Sampling cost = 3 - 2; for 1920x1080 it
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
sc.render.filepath = "/tmp/claude-measure-%d.png" % os.getpid()
results = []
for label, frame, spp in (("warm-up", a.frame - 1, 1), ("overhead", a.frame, 1), ("final", a.frame + 1, a.samples)):
    sc.cycles.samples = spp
    w0, c0 = time.time(), time.process_time()
    sc.frame_set(frame)
    bpy.ops.render.render(write_still=False)
    w, c = time.time() - w0, time.process_time() - c0
    results.append((label, frame, spp, w, c))
    print(f"MEASURE {os.path.basename(a.blend)} {label:8s} frame {frame} {spp:3d} spp {a.res}: wall {w:7.1f} s, "
          f"cpu {c:7.1f} s, load {os.getloadavg()[0]:.1f}", flush=True)
(_, _, _, wo, co), (_, _, _, wf, cf) = results[1], results[2]
k = (1920 * 1080) / (sc.render.resolution_x * sc.render.resolution_y)
print(f"MEASURE {os.path.basename(a.blend)} summary: per-frame overhead cpu {co:.1f} s; sampling cpu {cf - co:.1f} s at "
      f"{a.res} -> {k * (cf - co):.0f} cpu-s at 1920x1080 {a.samples} spp (wall here {wf - wo:.0f} s x {k:.0f})",
      flush=True)
