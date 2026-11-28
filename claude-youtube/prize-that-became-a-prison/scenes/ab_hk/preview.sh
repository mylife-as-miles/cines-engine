#!/usr/bin/env bash
# Local preview of shot AB_HK (free): every frame at 640x360 and low samples through the shared render lock, then the
# graded MP4 (grade A, BT.709, as encode.py does on the box) and the frame checks (missing, black, pops).
# Cycles: Eevee cannot draw on this machine (no GPU context).
#   scenes/ab_hk/preview.sh                 # SPP=6 FRAMES=1-116 by default
set -euo pipefail
cd "$(dirname "$0")/../.."
PY=${PY:-/tmp/claude-0/-home-user-cines-engine/73593c7c-6dfc-5879-82bf-97979958b8ab/scratchpad/bpyenv/bin/python}
SPP=${SPP:-6}
FRAMES=${FRAMES:-1-116}
OUTF=out/ab_hk/preview_frames
"$PY" -I scenes/ab_hk/render.py --blend out/ab_hk/blend/AB_HK.blend --out "$OUTF" --frames "$FRAMES" \
  --engine CYCLES --samples "$SPP" --res 640x360 --fast --simplify 1 --lock /tmp/cines_render.lock
python3 scenes/ab_hk/encode.py --frames "$OUTF" --out out/ab_hk/preview_blender.mp4 --first 1 --last 116
python3 scenes/anim_tests/check_frames.py "$OUTF"
