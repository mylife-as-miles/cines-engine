#!/bin/bash
# The two files the Crownfall game plays (main game/public/video in the Crownfall repository):
#   crownfall-opening.mp4         the whole opening, on a first start
#   crownfall-opening-titles.mp4  the title sequence alone (studio mark, Year 33, title), on every later start
# Both come from the cut the creator chose: the film at commit e0b131f (George's narration, code-made sounds).
#
#   tools/game_cut.sh <video-1080p.mp4> <approved-delivery.mp4> <out-dir>
#
# <video-1080p.mp4>: the film's picture at 1080p with subtitles, as rendered at e0b131f
#   (node tools/export.js out/video.mp4 --workers 3 --subs --no-audio, on a checkout of e0b131f).
# <approved-delivery.mp4>: the delivery the creator approved; its soundtrack is copied unchanged.
# 720p keeps the grain at a size a web game can stream (27.6 MB and 1.3 MB) and is lighter for Quest to decode.
# The title sequence joins 0-7.9 s (the studio mark, faded to black) to 221.0 s-end (black, Year 33, the title);
# check those times against film/timeline.js (studio, year33) if the narration is ever re-timed.
set -e
VIDEO=$1 AUDIO=$2 OUT=$3
ENC="-c:v libx264 -preset slow -crf 28 -tune film -pix_fmt yuv420p -r 24"
SC="scale=1280:720:flags=lanczos"
ffmpeg -y -loglevel error -i "$VIDEO" -i "$AUDIO" -map 0:v -map 1:a -vf "$SC" $ENC -c:a copy -shortest -movflags +faststart "$OUT/crownfall-opening.mp4"
ffmpeg -y -loglevel error -t 7.9 -i "$VIDEO" -ss 221.0 -i "$VIDEO" -t 7.9 -i "$AUDIO" -ss 221.0 -i "$AUDIO" \
  -filter_complex "[0:v]setpts=PTS-STARTPTS,fade=t=out:st=7.1:d=0.8[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0,$SC[v];[2:a]asetpts=PTS-STARTPTS,afade=t=out:st=6.9:d=1.0[x];[3:a]asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.5[y];[x][y]concat=n=2:v=0:a=1[au]" \
  -map "[v]" -map "[au]" $ENC -c:a aac -b:a 160k -ar 48000 -movflags +faststart "$OUT/crownfall-opening-titles.mp4"
ls -l "$OUT"/crownfall-opening*.mp4
