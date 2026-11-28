# Run the calibration test on a GPU box

Three 4-second shots (96 frames each, plus a 10-frame handle at each end, so frames 1-116; the cut uses 11-106),
1920x1080, Cycles at 128 samples with adaptive sampling, the denoiser on, motion blur at a 180-degree shutter, AgX.
Each `.blend` is self-contained, with its textures packed in. The box needs only Blender 5.3. Do not start this
until the author has approved the cost.

## 0. Unpack and verify

```sh
sha256sum -c prize_anim_test_gpu.tar.sha256
tar xf prize_anim_test_gpu.tar && cd prize_anim_test_gpu
sha256sum -c MANIFEST.sha256 | grep -v ': OK$' || echo "all files OK"
```

## 1. Install Blender 5.3 (the version that built the files)

Either the official build (recommended: OptiX kernels included):

```sh
cd ~ && wget https://download.blender.org/release/Blender5.3/blender-5.3.0-linux-x64.tar.xz
tar xf blender-5.3.0-linux-x64.tar.xz
export BLENDER=~/blender-5.3.0-linux-x64/blender
```

or the Python module (its wheel is for Python 3.13 only; `uv` fetches that Python):

```sh
pip install uv && uv venv -p 3.13 ~/bpy && uv pip install -p ~/bpy bpy==5.3.0
# then use: ~/bpy/bin/python -I render.py ...   instead of   $BLENDER -b -P render.py -- ...
```

For the MP4s: `apt-get install -y ffmpeg`.

## 2. Check that OptiX sees the card

```sh
nvidia-smi -L
$BLENDER -b --factory-startup -P check_gpu.py      # prints the OptiX devices; exits 1 if there are none
```

`render.py --device OPTIX` refuses to render (exit code 3) when no OptiX device is found. It never falls back to the
CPU.

## 3. One timed frame per shot

Frame 57 warms up the kernels and the scene (the first frame of a process is slower), and frame 58 is the timed one:

```sh
for s in A_typing B_walk C_corridor; do
  $BLENDER -b --factory-startup -P render.py -- --blend blend/$s.blend --out test/$s --frames 57,58 --device OPTIX | grep FRAME
done
```

Each line reads `FRAME 0058  <seconds> s OPTIX(<card>) 128spp 1920x1080`. Send these three numbers (and the three PNGs
in `test/`) back before going on. They turn the estimate into a quote. The approved test frame is the reference:
every later box renders frame 58 again first and must match it.

## 4. All frames, one process per GPU

```sh
N=$(nvidia-smi -L | wc -l)
for s in A_typing B_walk C_corridor; do
  for i in $(seq 0 $((N-1))); do
    CUDA_VISIBLE_DEVICES=$i $BLENDER -b --factory-startup -P render.py -- \
      --blend blend/$s.blend --out frames/$s --shard $i/$N --device OPTIX > logs_${s}_$i.txt 2>&1 &
  done
  wait
  grep -h "RENDER done" logs_${s}_*.txt
done
```

(`./run_gpu.sh check|test|all|encode` runs steps 2 to 5 with the same commands.) Frames already on disk are skipped,
so a stopped box resumes where it was.

Measured here, every frame of A and B has about 20 single-threaded CPU-seconds of work before the GPU starts: Dawn's
deformed body, clothes and hair are evaluated at render subdivision for the three motion-blur steps and re-synced.
C has about 5. On a box CPU this is perhaps 8-12 s a frame, and the GPU waits during it. If `nvidia-smi` shows the
GPU idle between frames, run two processes per GPU, so one syncs while the other samples. The card holds both
scenes easily. Use `--shard` over 2N, with each pair on one `CUDA_VISIBLE_DEVICES`:

```sh
for i in $(seq 0 $((2*N-1))); do
  CUDA_VISIBLE_DEVICES=$((i/2)) $BLENDER -b --factory-startup -P render.py -- \
    --blend blend/$s.blend --out frames/$s --shard $i/$((2*N)) --device OPTIX > logs_${s}_$i.txt 2>&1 &
done; wait
```

Copy `frames/` home while it runs (`rsync -a frames/ <home>:...`), because anything left on a box is lost when it
stops.

## 5. Assemble the MP4s (grade A applied here, not in the render)

```sh
for s in A_typing B_walk C_corridor; do
  python3 encode.py --frames frames/$s --out $s.mp4 --grade grade_A.txt --first 1 --last 116
done
```

`encode.py` stops if a frame is missing. Check the frame count with `ffprobe -v error -count_packets -select_streams v
-show_entries stream=nb_read_packets -of csv=p=0 A_typing.mp4` (116).

## Options

`render.py --frames 11-106` renders only the body. `--samples`, `--res 1920x1080`, `--format exr` and `--clay`
(a grey matte frame) are also available. The default is what the file holds: 128 samples, adaptive threshold
0.03, OpenImageDenoise on the GPU, and motion blur.
