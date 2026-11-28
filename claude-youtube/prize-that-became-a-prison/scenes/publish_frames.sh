#!/bin/bash
# Publish a stage's final PNG pairs and rebuild its camera strip. Run from the project folder.
#     bash scenes/publish_frames.sh <stage> [<stage> ...]
#     bash scenes/publish_frames.sh <stage> --cameras page,pair,screen
set -eu
shopt -s nullglob
if (( $# == 0 )); then
  echo "Usage: bash scenes/publish_frames.sh <stage> [<stage> ...]" >&2
  exit 2
fi

publish_stage() (
  stage=$1
  source_dir="out/stages/$stage"
  shift
  if (( $# )); then
    graded=()
    for camera in "$@"; do graded+=( "$source_dir/final_${camera}_graded.png" ); done
  else
    graded=( "$source_dir"/final_*_graded.png )
  fi
  if (( ${#graded[@]} == 0 )); then
    echo "No graded finals in $source_dir" >&2
    exit 1
  fi

  # Finish all conversions and the board before replacing any published frame.
  work=$(mktemp -d)
  trap 'rm -rf -- "$work"' EXIT
  mkdir "$work/raw" "$work/graded" "$work/passes"
  existing=( "frames/graded/$stage"/*.jpg )
  if (( ${#existing[@]} )); then
    cp -- "${existing[@]}" "$work/graded/"
  fi

  for image in "${graded[@]}"; do
    filename=${image##*/}
    camera=${filename#final_}
    camera=${camera%_graded.png}
    raw="$source_dir/final_$camera.png"
    raw_dimensions=
    for frame in "$raw" "$image"; do
      dimensions=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$frame")
      width=${dimensions%x*}
      height=${dimensions#*x}
      if [[ ! "$dimensions" =~ ^[0-9]+x[0-9]+$ ]] || (( width < 1280 || height * 16 != width * 9 )); then
        echo "Expected a 16:9 final at least 1280 px wide at $frame, found $dimensions" >&2
        exit 1
      fi
      if [[ -n "$raw_dimensions" && "$raw_dimensions" != "$dimensions" ]]; then
        echo "Raw and graded dimensions differ for $stage/$camera" >&2
        exit 1
      fi
      raw_dimensions=$dimensions
    done
    ffmpeg -v error -xerror -i "$raw" -f null -
    cp -- "$raw" "$work/raw/$camera.png"
    for track in corners seam; do
      if [[ -f "$source_dir/final_$camera.$track.json" ]]; then
        cp -- "$source_dir/final_$camera.$track.json" "$work/raw/$camera.$track.json"
      fi
    done
    matte="$source_dir/final_$camera.mask.png"
    if [[ -f "$matte" ]]; then
      mask_format=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt -of csv=p=0 "$matte")
      if [[ "$mask_format" != "${raw_dimensions%x*},${raw_dimensions#*x},gray" ]]; then
        echo "Expected an 8-bit grayscale mask at $raw_dimensions for $stage/$camera" >&2
        exit 1
      fi
      cp -- "$matte" "$work/passes/$camera.mask.png"
    fi
    glass="$source_dir/final_$camera.glass.png"
    if [[ -f "$glass" ]]; then
      glass_dimensions=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$glass")
      if [[ "$glass_dimensions" != "$raw_dimensions" ]]; then
        echo "Glass pass dimensions differ from the plate at $stage/$camera" >&2
        exit 1
      fi
      ffmpeg -v error -xerror -i "$glass" -f null -
      cp -- "$glass" "$work/passes/$camera.glass.png"
    fi
    ffmpeg -v error -xerror -y -i "$image" -q:v 2 "$work/graded/$camera.jpg"
  done

  cameras=( "$work/graded"/*.jpg )
  total=${#cameras[@]}
  # Keep the original sampling and JPEG conversion for uniform camera strips.
  sizes=()
  for camera_image in "${cameras[@]}"; do
    sizes+=( "$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$camera_image")" )
  done
  pattern="$work/graded/*.jpg"
  scale="scale=480:270,"
  for size in "${sizes[@]}"; do
    if [[ "$size" != "${sizes[0]}" ]]; then
      # image2 resets its filter graph across a size change. Normalize mixed strips first.
      mkdir "$work/tiles"
      for camera_image in "${cameras[@]}"; do
        tile=${camera_image##*/}
        ffmpeg -v error -xerror -i "$camera_image" -vf scale=480:270 -frames:v 1 "$work/tiles/${tile%.jpg}.png"
      done
      pattern="$work/tiles/*.png"
      scale=""
      break
    fi
  done
  ffmpeg -v error -xerror -y -pattern_type glob -i "$pattern" \
    -vf "${scale}tile=${total}x1" -frames:v 1 -q:v 3 "$work/board.jpg"

  mkdir -p "frames/graded/$stage" "frames/raw/$stage" design/boards
  for raw in "$work/raw"/*.png; do
    filename=${raw##*/}
    mv -- "$raw" "frames/raw/$stage/$filename"
    mv -- "$work/graded/${filename%.png}.jpg" "frames/graded/$stage/"
  done
  for sidecar in "$work/raw"/*.corners.json "$work/raw"/*.seam.json "$work/passes"/*.png; do
    mv -- "$sidecar" "frames/raw/$stage/"
  done
  mv -- "$work/board.jpg" "design/boards/latest_$stage.jpg"
  echo "published $stage: ${#graded[@]} frames updated, $total in the strip"
)

if [[ ${2:-} == --cameras ]]; then
  if (( $# != 3 )) || [[ -z $3 ]]; then
    echo "Expected a comma-separated list after --cameras" >&2
    exit 2
  fi
  IFS=, read -r -a selection <<< "$3"
  publish_stage "$1" "${selection[@]}"
else
  for stage in "$@"; do publish_stage "$stage"; done
fi
