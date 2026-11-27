#!/bin/bash
# Re-apply the film's grade (as defined in scenes/shoot.py) to published raw frames, rewriting the graded JPEGs and
# each stage's strip in design/boards/latest_<stage>.jpg. Run from the project folder:
#     bash scenes/regrade_frames.sh [<stage> ...]      (no stage: every stage in frames/raw)
set -e
GRADE=$(python3 -c "import re; s=open('scenes/shoot.py').read(); m=re.search(r'GRADE = \((.*?)\)\n', s, re.S); print(eval('(' + m.group(1) + ')'))")
STAGES=${*:-$(ls frames/raw)}
for st in $STAGES; do
  mkdir -p "frames/graded/$st" design/boards
  for raw in frames/raw/$st/*.png; do
    cam=$(basename "$raw" .png)
    ffmpeg -loglevel error -y -i "$raw" -vf "$GRADE" -q:v 2 "frames/graded/$st/$cam.jpg"
  done
  total=$(ls frames/graded/$st/*.jpg | wc -l)
  ffmpeg -loglevel error -y -pattern_type glob -i "frames/graded/$st/*.jpg" \
    -vf "scale=480:270,tile=${total}x1" -frames:v 1 -q:v 3 "design/boards/latest_$st.jpg"
  echo "regraded $st: $total frames"
done
