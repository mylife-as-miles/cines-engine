# Run the calibration test on a GPU box

There are three animated test shots. Each file runs frames 1-116 at 24 fps, and the cut uses frames 11-106. Each
`.blend` is self-contained, with its textures packed in. The render is 1920x1080 with motion blur at a 180-degree
shutter and the film's AgX view. Cycles runs at 128 samples with adaptive sampling and the denoiser on. Eevee runs at
64 samples with ray tracing and volumes. Grade A is applied afterwards in `encode.py`, never in the render.

Do not start until the author has approved the cost. The author's budget for the whole film's GPU work is 300-500
credits, so the test is lean: frames 35-82 of each shot (2 s, the middle of the cut), once in Cycles and once in
Eevee. That is 288 frames, estimated at 50-80 credits on one RTX PRO 6000 (98 credits an hour).

## 0. Unpack and verify

```sh
cd /workspace
sha256sum -c prize_anim_test_gpu.tar.sha256
tar xf prize_anim_test_gpu.tar && cd prize_anim_test_gpu
sha256sum -c MANIFEST.sha256 | grep -v ': OK$' || echo "all files OK"
```

## 1. On every new box

Blender 5.3.0 is already on the persistent storage. Only `/workspace` survives a box, so reinstall its system
libraries on every new box:

```sh
apt-get update && apt-get install -y xz-utils libxi6 libxrender1 libxkbcommon0 libsm6 libice6 libgl1 libegl1 \
  libxxf86vm1 libxfixes3 libxext6 libx11-6 libglu1-mesa
export BLENDER=/workspace/blender/blender-5.3.0-linux-x64/blender
$BLENDER --version | head -1          # Blender 5.3.0: the version that built the files
```

## 2. Check the card

```sh
nvidia-smi -L
$BLENDER -b --factory-startup -P check_gpu.py      # lists the OptiX devices; exits 1 if there are none
```

`render.py` never falls back to the CPU. With `--device OPTIX`, Cycles exits with code 3 if no OptiX device is found.
Eevee reads its OpenGL renderer first and exits with code 3 if that is a software one, such as llvmpipe.

## 3. One timed frame per shot and engine (optional, about 10 minutes)

Skip this step to save credits: the lean run in step 4 times every frame too. Frame 57 is a warm-up: the first frame of a process loads kernels and shaders and builds the scene. Frame 58 is the
timed one.

```sh
./run_gpu.sh test        # = for each shot and engine:
# $BLENDER -b --factory-startup -P render.py -- --blend blend/A_typing.blend --out test/A_typing_cycles \
#     --frames 57,58 --engine CYCLES --device OPTIX
# $BLENDER -b --factory-startup -P render.py -- --blend blend/A_typing.blend --out test/A_typing_eevee \
#     --frames 57,58 --engine EEVEE --device OPTIX
```

Each line reads `FRAME 0058  <seconds> s OPTIX(<card>) 128spp 1920x1080`, or `EEVEE(NVIDIA ...)` for Eevee. Send
the six numbers and the six PNGs back before going on. The approved frame 58 becomes the reference, and every later
box renders it again first and must match it.

## 4. The lean test: 48 frames per shot per engine

```sh
./run_gpu.sh lean        # frames 35-82, Cycles then Eevee, two processes per GPU
```

Each frame of A and B carries about 20 single-threaded CPU-seconds of work before the GPU starts, measured on this
project's 2.1 GHz machine. Dawn's deformed body, clothes and hair are evaluated at render subdivision for the
motion-blur steps and synced. C carries about 5. On the box's CPU this is perhaps 8-12 s a frame for A and B, and the
GPU would wait during it. So `lean` runs two processes per GPU, interleaving frames, and one syncs while the other
samples. The card's 96 GB holds two copies of any of these scenes. Its log ends with the wall time per shot and
engine, and that divided by 48 is the cost per frame to quote. Set `PER_GPU=1` for one process per GPU.

Frames already on disk are skipped, so a stopped box resumes where it was. Copy `frames/` home while it runs (for
example `rsync -a frames/ <home>:...`), because anything left outside `/workspace` is lost when the box stops.

## 5. Assemble the MP4s (at home, or on the box after `apt-get install -y ffmpeg`)

```sh
./run_gpu.sh encode      # = python3 encode.py --frames frames/<shot>_<engine> --out <shot>_<engine>.mp4 \
#                              --grade grade_A.txt --first 35 --last 82
```

`encode.py` stops if a frame is missing. It applies grade A, converts to YUV with the BT.709 matrix and tags the file
BT.709, as the rest of the film does.

## Later: every frame

`./run_gpu.sh all` renders frames 1-116 of each shot in Cycles. `ENGINE=eevee ./run_gpu.sh all` does the same in
Eevee. `render.py` also takes `--frames 11-106` (the cut only), `--shard i/n`, `--samples`, `--res 1920x1080`,
`--format exr` and `--clay` (a grey matte frame).
