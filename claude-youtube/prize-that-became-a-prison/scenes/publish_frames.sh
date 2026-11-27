#!/bin/bash
# Publish a stage's final PNG pairs and rebuild its camera strip. Run from the project folder.
#     bash scenes/publish_frames.sh <stage> [<stage> ...]
set -eu
shopt -s nullglob
if (( $# == 0 )); then
  echo "Usage: bash scenes/publish_frames.sh <stage> [<stage> ...]" >&2
  exit 2
fi

publish_stage() (
  stage=$1
  source_dir="out/stages/$stage"
  graded=( "$source_dir"/final_*_graded.png )
  if (( ${#graded[@]} == 0 )); then
    echo "No graded finals in $source_dir" >&2
    exit 1
  fi

  # Finish all conversions and the board before replacing any published frame.
  work=$(mktemp -d)
  trap 'rm -rf -- "$work"' EXIT
  mkdir "$work/raw" "$work/graded"
  existing=( "frames/graded/$stage"/*.jpg )
  if (( ${#existing[@]} )); then
    cp -- "${existing[@]}" "$work/graded/"
  fi

  for image in "${graded[@]}"; do
    filename=${image##*/}
    camera=${filename#final_}
    camera=${camera%_graded.png}
    raw="$source_dir/final_$camera.png"
    for frame in "$raw" "$image"; do
      dimensions=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$frame")
      if [[ "$dimensions" != 1280x720 ]]; then
        echo "Expected a 1280x720 final at $frame, found $dimensions" >&2
        exit 1
      fi
    done
    ffmpeg -v error -xerror -i "$raw" -f null -
    cp -- "$raw" "$work/raw/$camera.png"
    ffmpeg -v error -xerror -y -i "$image" -q:v 2 "$work/graded/$camera.jpg"
  done

  cameras=( "$work/graded"/*.jpg )
  total=${#cameras[@]}
  ffmpeg -v error -xerror -y -pattern_type glob -i "$work/graded/*.jpg" \
    -vf "scale=480:270,tile=${total}x1" -frames:v 1 -q:v 3 "$work/board.jpg"

  mkdir -p "frames/graded/$stage" "frames/raw/$stage" design/boards
  for raw in "$work/raw"/*.png; do
    filename=${raw##*/}
    mv -- "$raw" "frames/raw/$stage/$filename"
    mv -- "$work/graded/${filename%.png}.jpg" "frames/graded/$stage/"
  done
  mv -- "$work/board.jpg" "design/boards/latest_$stage.jpg"
  echo "published $stage: ${#graded[@]} frames updated, $total in the strip"
)

for stage in "$@"; do
  publish_stage "$stage"
done
