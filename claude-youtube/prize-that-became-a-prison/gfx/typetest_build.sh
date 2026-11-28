#!/usr/bin/env bash
# Builds the motion-typography style test (gfx/typetest.html) into out/gfx/typetest/type_test_v1.mp4.
#   bash gfx/typetest_build.sh prep     cut the hearing clip (three lines, 24 fps), frames + voice envelope for the page
#   bash gfx/typetest_build.sh render   render the page (all three looks) to a silent video
#   bash gfx/typetest_build.sh mux      add the testimony audio, convert to BT.709 and tag it, faststart
#   bash gfx/typetest_build.sh clean    delete the scratch frames and intermediates (keeps the deliverable)
#   bash gfx/typetest_build.sh all      prep, render, mux, clean
# Run from the production folder (claude-youtube/prize-that-became-a-prison).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=out/gfx/typetest
SRC=archive/media/cecc2026_tim_cspan_long.mp4
RENDER=/home/user/cines-engine/.claude/skills/cines-engine/scripts/canvas_render.js
mkdir -p "$OUT"

# The edit: three lines from Tim Hunt's 2026 testimony, each cut in the room-tone pause around it
# (speech onsets measured on the level envelope, not taken from the ASR, which runs 0.1-0.3 s early).
#   A 160.500 + 83 f  "There are no happy stories I can tell you about reunification."
#   B 169.100 + 69 f  "There is no story about Dawn rebuilding her life."
#   C 178.550 + 109 f "It has been 12 years. 12 years."
# 261 frames = 10.875 s at 24 fps. The page's T_SEGS must match.
SEGS=("160.500 83" "169.100 69" "178.550 109")
NFR=261
TOTAL_FR=815            # 261 testimony + 230 case file + 324 years; the page's LOOKS must match

prep() {
  rm -rf "$OUT/tframes"; mkdir -p "$OUT/tframes"
  local fc="" cat="" i=0
  for s in "${SEGS[@]}"; do
    set -- $s; local st=$1 n=$2
    local d; d=$(python3 -c "print(f'{$n/24:.6f}')")
    local en; en=$(python3 -c "print(f'{$st+$n/24:.6f}')")
    fc+="[0:v]trim=start=$st:end=$en,setpts=PTS-STARTPTS,fps=24,trim=end_frame=$n,setpts=N/(24*TB)[v$i];"
    fc+="[0:a]atrim=start=$st:end=$en,asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=$(python3 -c "print(f'{$n/24-0.03:.4f}')"):d=0.03[a$i];"
    cat+="[v$i][a$i]"; i=$((i+1))
  done
  fc+="${cat}concat=n=3:v=1:a=1[v][a]"
  ffmpeg -v error -y -i "$SRC" -filter_complex "$fc" -map "[v]" -map "[a]" -c:v libx264 -crf 12 -pix_fmt yuv420p \
    -c:a pcm_s16le -ar 48000 "$OUT/testimony_edit.mov"
  ffmpeg -v error -y -i "$OUT/testimony_edit.mov" -frames:v $NFR -q:v 2 "$OUT/tframes/f_%04d.jpg"
  local got; got=$(ls "$OUT/tframes" | wc -l)
  [ "$got" = "$NFR" ] || { echo "expected $NFR frames, got $got"; exit 1; }
  # dialogue-anchored loudness: the testimony to -16 LUFS, true peak -1.5 dBTP (two-pass loudnorm, linear gain)
  local js; js=$(ffmpeg -hide_banner -i "$OUT/testimony_edit.mov" -vn -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  local mi mtp mlra mth off
  mi=$(echo "$js" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
  set -- $mi
  ffmpeg -v error -y -i "$OUT/testimony_edit.mov" -vn \
    -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$1:measured_TP=$2:measured_LRA=$3:measured_thresh=$4:offset=$5:linear=true,aresample=48000" \
    -c:a pcm_s16le -ar 48000 "$OUT/testimony.wav"
  echo "testimony loudness before: I=$1 TP=$2"
  # the voice envelope for the page's waveform: RMS per half frame (48 per second), in dBFS
  python3 - "$OUT/testimony.wav" "$OUT/testimony_env.js" <<'PY'
import sys, wave, numpy as np
w = wave.open(sys.argv[1]); sr = w.getframerate(); ch = w.getnchannels()
a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float).reshape(-1, ch).mean(1) / 32768
hop = sr // 48; n = len(a) // hop
r = np.sqrt((a[:n * hop].reshape(n, hop) ** 2).mean(1)); db = 20 * np.log10(r + 1e-9)
open(sys.argv[2], 'w').write('window.TENV=[' + ','.join(f'{v:.1f}' for v in db) + '];\n')
print('envelope', n, 'values')
PY
}

render() {
  NODE_PATH=$(npm root -g) node "$RENDER" gfx/typetest.html seq all 0 "$(python3 -c "print($TOTAL_FR/24)")" "$OUT/_silent.mp4"
  local got; got=$(ffprobe -v error -count_packets -select_streams v -show_entries stream=nb_read_packets -of csv=p=0 "$OUT/_silent.mp4")
  echo "rendered $got frames (want $TOTAL_FR)"
}

mux() {
  # canvas_render encodes RGB to yuv420p with swscale's default BT.601 matrix: convert to BT.709 and tag it (accurate
  # rounding and full chroma interpolation, or the conversion loses up to 4 levels; tools/check_colour.py)
  ffmpeg -v error -y -i "$OUT/_silent.mp4" -i "$OUT/testimony.wav" \
    -filter_complex "[0:v]scale=in_color_matrix=bt601:out_color_matrix=bt709:in_range=tv:out_range=tv:flags=bicubic+accurate_rnd+full_chroma_int,format=yuv420p[v];[1:a]apad,atrim=end=$(python3 -c "print($TOTAL_FR/24)")[a]" \
    -map "[v]" -map "[a]" -frames:v $TOTAL_FR -c:v libx264 -preset slow -crf 16 -profile:v high -pix_fmt yuv420p \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -c:a aac -b:a 256k -ar 48000 -movflags +faststart "$OUT/type_test_v1.mp4"
  ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate,nb_frames -of compact "$OUT/type_test_v1.mp4"
}

clean() { rm -rf "$OUT/tframes" "$OUT/_silent.mp4" "$OUT/testimony_edit.mov"; }

case "${1:-all}" in
  prep) prep ;; render) render ;; mux) mux ;; clean) clean ;;
  all) prep; render; mux; clean ;;
  *) echo "usage: $0 prep|render|mux|clean|all"; exit 1 ;;
esac
