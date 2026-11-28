#!/usr/bin/env bash
# Shot AB_HK on the GPU box, step by step. Run from the unpacked folder (prize_ab_hk_gpu/).
#   ./run_ab_hk.sh check          # the card: nvidia-smi, OptiX devices, and which GPU Eevee draws with
#   ./run_ab_hk.sh test           # one timed frame per engine (frame 57 warms up, 58 is timed)
#   ./run_ab_hk.sh eevee          # every frame (1-116) in Eevee, one process per GPU
#   ./run_ab_hk.sh cycles         # the 2 s Cycles comparison (frames 35-82), one process per GPU
#   ./run_ab_hk.sh encode         # graded BT.709 MP4s of whatever is complete
# Environment: BLENDER (default the box's 5.3), NGPU (Cycles processes, default: all GPUs), EEVEE_NGPU (default 1:
# Eevee picks its GPU through OpenGL/Vulkan, which CUDA_VISIBLE_DEVICES may not steer; raise it only after checking
# with nvidia-smi that each process lands on its own card), CYCLES_FRAMES (default 35-82).
set -euo pipefail
cd "$(dirname "$0")"
BLENDER=${BLENDER:-/workspace/blender/blender-5.3.0-linux-x64/blender}
NGPU=${NGPU:-$(nvidia-smi -L | wc -l)}
CYCLES_FRAMES=${CYCLES_FRAMES:-35-82}
BLEND=blend/AB_HK.blend
render() { "$BLENDER" -b --factory-startup -P render.py -- --blend "$BLEND" "$@"; }

shards() {   # shards <n> <out> <log name> <render args...>: n processes, one per GPU, wait for all
  local NGPU=$1 out=$2 name=$3; shift 3
  mkdir -p logs
  for i in $(seq 0 $((NGPU - 1))); do
    CUDA_VISIBLE_DEVICES=$i render --out "$out" --shard "$i/$NGPU" "$@" > "logs/${name}_gpu$i.log" 2>&1 &
  done
  wait
  grep -h "RENDER done\|RENDER error\|RENDER Eevee on" logs/${name}_gpu*.log || true
  ls "$out"/*.png | wc -l
}

case "${1:-}" in
  check)
    nvidia-smi -L
    "$BLENDER" -b --factory-startup -P check_gpu.py
    render --out test/eevee_check --engine EEVEE --frames 1 --res 320x180 --samples 4 | grep "RENDER\|FRAME" ;;
  test)
    render --out test/eevee --engine EEVEE --frames 57,58 | tee test_eevee.log | grep "FRAME\|RENDER"
    render --out test/cycles --engine CYCLES --device OPTIX --frames 57,58 | tee test_cycles.log | grep "FRAME\|RENDER"
    grep -h "FRAME 0058" test_eevee.log test_cycles.log ;;
  eevee)
    shards "${EEVEE_NGPU:-1}" frames/AB_HK_eevee eevee --engine EEVEE ;;
  cycles)
    shards "$NGPU" frames/AB_HK_cycles cycles --engine CYCLES --device OPTIX --frames "$CYCLES_FRAMES" ;;
  encode)
    if [ -d frames/AB_HK_eevee ]; then
      python3 check_frames.py frames/AB_HK_eevee --first 1 --last 116
      python3 encode.py --frames frames/AB_HK_eevee --out AB_HK_eevee.mp4 --grade grade_A.txt --first 1 --last 116
    fi
    if [ -d frames/AB_HK_cycles ]; then
      a=${CYCLES_FRAMES%-*}; b=${CYCLES_FRAMES#*-}
      python3 check_frames.py frames/AB_HK_cycles --first "$a" --last "$b"
      python3 encode.py --frames frames/AB_HK_cycles --out AB_HK_cycles.mp4 --grade grade_A.txt --first "$a" --last "$b"
    fi ;;
  *)
    echo "usage: $0 check|test|eevee|cycles|encode"; exit 2 ;;
esac
