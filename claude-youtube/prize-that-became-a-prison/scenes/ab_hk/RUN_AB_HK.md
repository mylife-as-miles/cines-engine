# Shot AB_HK on the GPU box

Hong Kong street at night in light rain: Dawn walks alone up the right-hand pavement with a paper carrier in each
hand; a low dolly-crane on the road tracks her. 96 frames at 24 fps plus a 10-frame handle at each end (frames 1-116;
the cut uses 11-106), 1920x1080, Cycles 128 samples with adaptive sampling (threshold 0.03), the denoiser on, motion
blur at a 180-degree shutter, AgX. Grade A is applied by `encode.py`, not in the render. `blend/AB_HK.blend` is
self-contained (textures packed; rain, ripples and steam are node trees evaluated per frame, so there is no cache to
bake or upload). The box needs only Blender 5.3. Do not start until the author has approved the cost.

It uses the calibration test's tools unchanged (`render.py`, `encode.py`, `check_gpu.py`, `run_gpu.sh` from
`scenes/anim_tests`), so it can run on its own from this folder or join the calibration run: copy
`blend/AB_HK.blend` into the calibration folder's `blend/` and add `AB_HK` to `SHOTS`.

## 0. Unpack and verify

```sh
sha256sum -c prize_ab_hk_gpu.tar.sha256
tar xf prize_ab_hk_gpu.tar && cd prize_ab_hk_gpu
sha256sum -c MANIFEST.sha256 | grep -v ': OK$' || echo "all files OK"
```

## 1. Blender 5.3 and ffmpeg

As in the calibration test (`RUN_ON_GPU.md`, step 1):

```sh
cd ~ && wget https://download.blender.org/release/Blender5.3/blender-5.3.0-linux-x64.tar.xz
tar xf blender-5.3.0-linux-x64.tar.xz && export BLENDER=~/blender-5.3.0-linux-x64/blender
apt-get install -y ffmpeg
```

## 2. OptiX sees the card

```sh
BLENDER=$BLENDER SHOTS=AB_HK ./run_gpu.sh check
```

`render.py --device OPTIX` exits with code 3 when no OptiX device is found. It never falls back to the CPU.

## 3. One timed frame (frame 57 warms up, frame 58 is timed)

```sh
BLENDER=$BLENDER SHOTS=AB_HK ./run_gpu.sh test
```

The line `FRAME 0058  <seconds> s OPTIX(<card>) 128spp 1920x1080` is the number to send back, with
`test/AB_HK/0058.png`. The approved frame 58 is the reference every later box renders first and must match.

## 4. All frames, one process per GPU

```sh
BLENDER=$BLENDER SHOTS=AB_HK ./run_gpu.sh all
```

Frames already on disk are skipped, so a stopped box resumes. Copy `frames/AB_HK/` home while it runs.

## 5. Check and encode

```sh
python3 check_frames.py frames/AB_HK --first 1 --last 116     # missing, black or flat frames, pops
SHOTS=AB_HK ./run_gpu.sh encode                                 # AB_HK.mp4, grade A, frames 1-116
```

## Notes for this shot

- Rain drops are real geometry (about 15,000 thin rods), so their streaks come from Cycles' motion blur. Keep
  motion blur on: `--no-blur` turns the rain into dots.
- The street's emissive signs light most of the frame. `--fast` (fewer bounces) is for local previews only.
- The haze and the steam plume are volumes; `--clay` hides them.
