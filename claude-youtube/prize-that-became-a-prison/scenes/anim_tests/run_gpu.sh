#!/usr/bin/env bash
# The calibration test on the GPU box, step by step. Run from the unpacked folder.
#   BLENDER=~/blender-5.3.0-linux-x64/blender ./run_gpu.sh check      # OptiX sees the card(s)
#   ./run_gpu.sh test                                                 # one timed frame per shot (after a warm-up)
#   ./run_gpu.sh all                                                  # every frame, one process per GPU
#   ./run_gpu.sh encode                                               # graded MP4s (needs ffmpeg)
set -euo pipefail
cd "$(dirname "$0")"
BLENDER=${BLENDER:-blender}
SHOTS=${SHOTS:-"A_typing B_walk C_corridor"}
NGPU=${NGPU:-$(nvidia-smi -L | wc -l)}
SAMPLES=${SAMPLES:-128}
render() { "$BLENDER" -b --factory-startup -P render.py -- "$@"; }

case "${1:-}" in
  check)
    nvidia-smi -L
    "$BLENDER" -b --factory-startup -P check_gpu.py ;;
  test)
    # frame 57 warms up (kernel load, scene sync); frame 58 is the timed one
    for s in $SHOTS; do
      render --blend "blend/$s.blend" --out "test/$s" --frames 57,58 --device OPTIX --samples "$SAMPLES" | tee "test_$s.log" | grep "FRAME\|RENDER"
    done
    grep -h "FRAME 0058" test_*.log ;;
  all)
    mkdir -p logs
    for s in $SHOTS; do
      for i in $(seq 0 $((NGPU - 1))); do
        CUDA_VISIBLE_DEVICES=$i render --blend "blend/$s.blend" --out "frames/$s" --shard "$i/$NGPU" \
          --device OPTIX --samples "$SAMPLES" > "logs/${s}_gpu$i.log" 2>&1 &
      done
      wait
      grep -h "RENDER done" logs/${s}_gpu*.log
      ls "frames/$s"/*.png | wc -l
    done ;;
  encode)
    for s in $SHOTS; do
      python3 encode.py --frames "frames/$s" --out "$s.mp4" --grade grade_A.txt --first 1 --last 116
    done ;;
  *)
    echo "usage: $0 check|test|all|encode"; exit 2 ;;
esac
