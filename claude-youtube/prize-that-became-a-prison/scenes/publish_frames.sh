#!/bin/bash
# Copy a stage's final renders from out/ (not in git) into frames/ and make a strip for the boards.
# Run from the project folder (claude-youtube/prize-that-became-a-prison):
#     bash scenes/publish_frames.sh <stage> [<stage> ...]
set -e
for st in "$@"; do
  mkdir -p "frames/graded/$st" "frames/raw/$st" design/boards
  n=0
  for g in out/stages/"$st"/final_*_graded.png; do
    [ -e "$g" ] || { echo "no finals in out/stages/$st"; continue 2; }
    cam=$(basename "$g" | sed 's/^final_//; s/_graded\.png$//')
    cp "out/stages/$st/final_$cam.png" "frames/raw/$st/$cam.png"
    ffmpeg -loglevel error -y -i "$g" -q:v 2 "frames/graded/$st/$cam.jpg"
    n=$((n + 1))
  done
  total=$(ls "frames/graded/$st"/*.jpg | wc -l)
  ffmpeg -loglevel error -y -pattern_type glob -i "frames/graded/$st/*.jpg" \
    -vf "scale=480:270,tile=${total}x1" -frames:v 1 -q:v 3 "design/boards/latest_$st.jpg"
  echo "published $st: $n frames updated, $total in the strip"
done
