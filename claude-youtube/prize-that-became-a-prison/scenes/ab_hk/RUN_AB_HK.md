# Shot AB_HK on the GPU box (Eevee, with a 2 s Cycles comparison)

Hong Kong street at night in light rain: Dawn walks alone up the right-hand pavement with a paper carrier in each
hand; a low dolly-crane on the road tracks her. 96 frames at 24 fps plus a 10-frame handle at each end (frames 1-116;
the cut uses 11-106), 1920x1080, motion blur at a 180-degree shutter, AgX. Grade A and the BT.709 conversion are
applied by `encode.py`, not in the render.

`blend/AB_HK.blend` is self-contained (textures packed; rain, ripples and steam are node trees evaluated per frame,
so there is no cache to bake or upload). It holds both engines' settings:
- **Eevee** (the likely final): 64 samples, screen ray tracing with fast GI, three planar probes on the wet road and
  pavements (the neon in the puddles, including signs above the frame) and a sphere probe, volumetrics (tile 4,
  96 samples) for the haze and the steam, 8 motion-blur steps;
- **Cycles** (the comparison): 128 samples, adaptive threshold 0.03, the denoiser.

The box has Blender 5.3 at `/workspace/blender/blender-5.3.0-linux-x64/blender` (the default in `run_ab_hk.sh`;
override with `BLENDER=...`). Eevee was **not** tried on the build machine (it has no GPU context): run `check` and
`test` and look at the two test frames before rendering everything. Do not start until the author has approved the cost.

## 0. Unpack and verify

```sh
sha256sum -c prize_ab_hk_gpu.tar.sha256
tar xf prize_ab_hk_gpu.tar && cd prize_ab_hk_gpu
sha256sum -c MANIFEST.sha256 | grep -v ': OK$' || echo "all files OK"
apt-get install -y ffmpeg        # for the MP4s
```

## 1. Check the card (both engines)

```sh
./run_ab_hk.sh check
```

It prints the OptiX devices (`check_gpu.py` exits 1 if there are none) and renders one tiny Eevee frame, printing
`RENDER Eevee on <renderer>`. That must name the NVIDIA card. If Eevee finds only a software renderer (llvmpipe),
`render.py` exits with code 3 rather than render on the CPU; Cycles with `--device OPTIX` does the same when no OptiX
device is found.

## 2. One timed frame per engine (frame 57 warms up and compiles shaders, frame 58 is timed)

```sh
./run_ab_hk.sh test
```

Send back the two `FRAME 0058 ...` lines and `test/eevee/0058.png`, `test/cycles/0058.png`. The approved frame 58 is
the reference every later box renders first and must match.

## 3. Eevee, all 116 frames

```sh
./run_ab_hk.sh eevee                  # frames/AB_HK_eevee/0001-0116.png, one process (EEVEE_NGPU=1)
```

## 4. Cycles, the 2 s comparison (frames 35-82, the middle of the cut)

```sh
./run_ab_hk.sh cycles                 # frames/AB_HK_cycles/0035-0082.png, one process per GPU
CYCLES_FRAMES=11-58 ./run_ab_hk.sh cycles     # another 2 s, if wanted
```

Frames already on disk are skipped, so a stopped box resumes. Copy `frames/` home while it runs (anything left on a
box is lost when it stops, except /workspace).

## 5. Check and encode

```sh
./run_ab_hk.sh encode      # check_frames.py (missing, black, flat, pops), then AB_HK_eevee.mp4 and AB_HK_cycles.mp4
```

`encode.py` applies grade A with temporal grain, converts RGB to YUV with the BT.709 matrix
(`scale=out_color_matrix=bt709:out_range=tv`, as gfx/doc_composite.py TO_YUV) and tags the file BT.709, limited range.

## Direct commands

```sh
B=/workspace/blender/blender-5.3.0-linux-x64/blender
$B -b --factory-startup -P render.py -- --blend blend/AB_HK.blend --out frames/AB_HK_eevee --engine EEVEE --frames 1-116
$B -b --factory-startup -P render.py -- --blend blend/AB_HK.blend --out frames/AB_HK_cycles --engine CYCLES \
   --device OPTIX --frames 35-82 [--shard 0/2]
python3 encode.py --frames frames/AB_HK_eevee --out AB_HK_eevee.mp4 --grade grade_A.txt --first 1 --last 116
```

## Notes for this shot

- The rain is 26,000 thin rods; their streaks come from motion blur. Keep motion blur on (`--no-blur` leaves dots).
- In Eevee the rain uses its own (EEVEE) material output: see-through with a white gloss and some translucency;
  Cycles uses refractive water with translucency. Expect the two engines' rain to differ most.
- If Eevee's wet ground looks flat, the planar probes are the first thing to check (they need ray tracing on).
- `--clay` hides the volumes; `--fast` is for local Cycles previews only.
