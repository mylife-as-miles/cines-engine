#!/usr/bin/env bash
# The calibration test on the GPU box, step by step. Run from the unpacked folder (see RUN_ON_GPU.md).
#   ./run_gpu.sh check     OptiX sees the card(s)
#   ./run_gpu.sh test      one timed frame per shot and engine (frame 57 warms up, 58 is timed)
#   ./run_gpu.sh lean      frames 35-82 of each shot, Cycles then Eevee, PER_GPU processes per GPU (default 2)
#   ./run_gpu.sh all       frames 1-116 of each shot in $ENGINE (default cycles)
#   ./run_gpu.sh encode    graded BT.709 MP4s of whatever is in frames/
set -euo pipefail
cd "$(dirname "$0")"
BLENDER=${BLENDER:-/workspace/blender/blender-5.3.0-linux-x64/blender}
SHOTS=${SHOTS:-"A_typing B_walk C_corridor"}
NGPU=${NGPU:-$(nvidia-smi -L | wc -l)}
PER_GPU=${PER_GPU:-2}
ENGINE=${ENGINE:-cycles}
render() { "$BLENDER" -b --factory-startup -P render.py -- "$@"; }

# all frames of one shot and engine in $FRAMES, spread over NGPU x PER_GPU processes; prints the wall time
run_set() {
  local s=$1 eng=$2 frames=$3 n=$((NGPU * PER_GPU)) t0
  mkdir -p logs
  t0=$(date +%s)
  for i in $(seq 0 $((n - 1))); do
    CUDA_VISIBLE_DEVICES=$((i / PER_GPU)) render --blend "blend/$s.blend" --out "frames/${s}_$eng" --frames "$frames" \
      --shard "$i/$n" --engine "$eng" --device OPTIX > "logs/${s}_${eng}_$i.log" 2>&1 &
  done
  wait
  if grep -l "RENDER error" logs/${s}_${eng}_*.log; then echo "FAILED: $s $eng"; exit 3; fi
  echo "WALL $s $eng frames $frames: $(( $(date +%s) - t0 )) s on $NGPU GPU(s) x $PER_GPU processes"
}

case "${1:-}" in
  check)
    nvidia-smi -L
    "$BLENDER" -b --factory-startup -P check_gpu.py ;;
  test)
    for s in $SHOTS; do for eng in cycles eevee; do
      render --blend "blend/$s.blend" --out "test/${s}_$eng" --frames 57,58 --engine "$eng" --device OPTIX \
        | tee "test_${s}_$eng.log" | grep "FRAME\|RENDER"
    done; done
    grep -h "FRAME 0058" test_*.log ;;
  lean)
    for eng in cycles eevee; do for s in $SHOTS; do run_set "$s" "$eng" 35-82; done; done | tee lean_wall.log ;;
  all)
    for s in $SHOTS; do run_set "$s" "$ENGINE" 1-116; done | tee -a all_wall.log ;;
  encode)
    for d in frames/*; do
      name=$(basename "$d"); first=$(ls "$d" | grep -v '^\.' | head -1 | cut -c1-4); last=$(ls "$d" | grep -v '^\.' | tail -1 | cut -c1-4)
      python3 encode.py --frames "$d" --out "$name.mp4" --grade grade_A.txt --first $((10#$first)) --last $((10#$last))
    done ;;
  *)
    echo "usage: $0 check|test|lean|all|encode"; exit 2 ;;
esac
