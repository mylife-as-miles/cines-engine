# Long Distance

*Long Distance*, a film by Osita Miles. An 8 min 37 s Claude Film, animated entirely in code, from the author's screenplay. A man lives in a flat furnished for two and talks every night with the girlfriend on his phone: she says goodnight, sends photos, laughs at his day. Then someone knocks at the door, and the woman standing there is the one in the photos, older, real, come for the makeup bag she left behind. No narration: the audience believes in the long-distance girlfriend and works out with him, through the picture and the confrontation, that the voice on the phone is an app wearing hers.

## Watch

- **Master:** `out/long_distance_1080p.mp4`: 1920×1080, 24 fps, H.264 CRF 18, AAC 320 kbps, 517.5 s, the final mix at -18 LUFS. Renders are not in git; it was sent to the author. Rebuild:
  1. `node tools/export.js out/long_distance_1080p_picture.mp4 --workers 3 --crf 18 --no-audio --no-join`: the picture, frame by frame through `FILM.renderAt(t)` in headless Chromium, kept as three segments (`out/export_tmp/segs.txt`); about 40 minutes on four cores.
  2. `uv run tools/build_mix.py --mix`: the soundtrack (`audio/README.md`), written as `out/mix/long_distance_mix.wav`.
  3. Mux: `ffmpeg -f concat -safe 0 -i out/export_tmp/segs.txt -i out/mix/long_distance_mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest -movflags +faststart out/long_distance_1080p.mp4`.
- **Player:** open `film/index.html` (scrub any instant; the development soundtrack plays).
- **YouTube thumbnails:** `frames/THUMB_youtube_{a..f}.jpg` (from `src/THUMB_youtube.html` and `src/THUMB_youtube2.html`); e and f are drawn in *One Too Many*'s idiom, the author's favourite.

## How it is built

- **The look:** B, Grain and Gloss, with C's staging (`design/DECISIONS.md`, `design/look_b.md`). Everything real is cut paper with grain; only the phone and what it makes are smooth, drawn after the grain. Frames are divided into his half and the empty half, and the phone always lies in the empty half, where a person would be.
- **The engine:** the *One Too Many* / *Autopilot* Canvas 2D engine (`film/engine.js`): eleven sequences (`film/seq/`), sets with named views (`film/sets/`), the characters (`film/rig.js`), the phone (`film/phone.js`). Time is a parameter; every frame is reproducible. `film/FILM.md` is the builder's contract; `design/SEQUENCES.md` the film shot by shot.
- **The voices:** Gemini TTS, `en-us-varo` (him) and `en-us-tova` (her and the phone), chosen by the author by ear. The phone speaks in her voice, dry, close and too clean; the real woman has the room and the breath.
- **The sound:** two voices, a few quiet effects, the rooms, and a sparse score of one felt-piano motif heard twice (Lyria 3.5; under the waterfall photo, and after the last line until the cut to black). The black and the title are silent. Built from the film's own cue sheet; `audio/README.md` has the whole pipeline and its checks.
- **Reviews:** three rounds of independent director's reviews (`design/REVIEW_cut1.md` to `REVIEW_cut3.md`); the picture was locked as cut 4.

## Layout

| Path | What it is |
| --- | --- |
| `design/` | Screenplay, DECISIONS, the looks (`look_a/b/c.md`, `REVIEW_looks.md`), SEQUENCES, the cut reviews |
| `film/` | The engine, sequences, sets, rig, phone, player (`index.html`) and the builder's contract (`FILM.md`, `api/`) |
| `kit/` | Drawing kits: `otm.js` (shared, never edited), `look_b.js` (`GG`, the look's helpers) |
| `src/`, `frames/` | Style frames (A, B, C), the looks board, the thumbnails, and their rendered stills |
| `audio/` | Voices (`vo/`), the sound map and cue sheet inputs, generated and synthesised sounds (`gen/`, `synth/`, `kit/`), the score (`score/`, `score_plan.json`), reports, `CREDITS.md`, `LISTEN.md` |
| `tools/` | Export, cue sheet, mix, voice, sound-generation, score and QA tools |
| `out/` | Renders and mixes (ignored by git) |

## Credits

Written and directed by Osita Miles; made with Claude. Voices: Gemini TTS (`en-us-varo`, `en-us-tova`). Music: Lyria 3.5 (SynthID-watermarked). Sounds: Stable Audio 3.0 Small (Stability AI Community Licence), CC0 recordings from *One Too Many*, and sounds synthesised in code. Full list with sources and licences: `audio/CREDITS.md`.
