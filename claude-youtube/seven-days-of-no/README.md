# What If You Said No to Everyone for 7 Days?

*What If You Said No to Everyone for 7 Days?*, by Osita Miles. A 3:45 POV explainer for YouTube, animated entirely in code in the author's flat-cartoon style. The narrator puts "you" through a week of saying no to everyone (the boss, a friend, Mom, a coworker, a stranger), finds the one answer that works ("a real answer"), and ends on the advice: say "let me think and get back to you", and choose on purpose.

## Watch

- **Video:** `out/seven_days_of_no_1080p.mp4`, 1920×1080, 24 fps, 225.5 s (217.5 s of narration and an 8 s end screen), H.264 CRF 18 capped at 12 Mbps, AAC 320 kbps stereo at -14 LUFS, -1.3 dBFS peak. Renders are not in git; it was sent to the author. Rebuild:
  1. `python3 tools/vo_edit.py`: the narration (`out/vo/narration.wav`; the slate read into the take is cut) and its word times (`audio/vo/words.json`).
  2. `node tools/cuesheet.js`: every named sound cue on the clock (`out/cuesheet.json`).
  3. `/home/user/leonxlnx/earshot/.venv/bin/python tools/build_mix.py`: the mix (`out/mix/seven_days_mix.wav`, stems, `report.json`).
  4. `node tools/export.js out/seven_days_picture.mp4 --workers 3 --crf 18 --maxrate 12M --no-audio` (about 3 minutes), then mux: `ffmpeg -i out/seven_days_picture.mp4 -i out/mix/seven_days_mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart out/seven_days_of_no_1080p.mp4`.
- **Player:** `film/index.html` scrubs the video with the narration and chapter marks.
- **For upload** (`publish/`): captions `seven_days.en.srt` / `.vtt` (89, rebuilt by `tools/make_captions.py`), `chapters.txt`, `titles.md` (8 options, top 3 paired with thumbnails), `description.md` (with tags and credits), `pinned_comment.md` (swap in your own "yes" before posting).
- **Thumbnails** (`thumbs/`, from `src/THUMB_youtube.html?v=a|b|c`): A "9 MISSED CALLS", B "PREPARED FOR WAR", C "BODY SAYS NO", for YouTube's Test & Compare.

## How it is built

- **The look:** the author's references (`design/refs/`), rebuilt in Canvas 2D: thick even outlines, flat fills with one shadow tone, a warm orange palette, the bald teal-hoodie hero and five supporting characters. `kit/pov.js` (`POV`) is a posable character rig (joint angles, 12 expressions, about 20 poses, props); `kit/sets.js` (`SETS`) draws the office, living room (three times of day), street, the plain teal ground, Mom's kitchen, the friend's flat, the party, the split-screen call, phone screens, day cards, buttons and stamps. Style frames and sheets: `frames/SF*.png`, `frames/SHEET_*.png`.
- **The engine:** the Claude Film engine ported to an explainer driven by narration (`film/engine.js`, `film/FILM.md`). Every shot and sound cue is anchored to a spoken word (`W('Monday')`, `W('photo', 2)`), so a re-timed take re-times the video. Twelve sequences in `film/seq/`, planned beat by beat in `design/SEQUENCES.md`.
- **The sound:** the author's narration; four Lyria 3.5 beds transposed into one key (main, hushed for the guilt and the insight, a lift for the photo and the advice, a closing bed); 36 cartoon-clean effects (synthesised, Stable Audio, and CC0 recordings from *One Too Many*), panned gently to their place on screen; ducked about 15 dB under the voice and mastered for YouTube (`audio/README.md`).
- **Reviews:** three independent reviews on a fixed rubric (7.2, 7.0, 7.4), each followed by a fix round (`design/REVIEW_preview2.md`).
- **Made by a team of agents** working in parallel on owned files (characters, sets, engine, sound, packaging, thumbnails), coordinated and reviewed by the orchestrator.

## Layout

| Path | What it is |
| --- | --- |
| `design/` | Brief, DECISIONS, SEQUENCES (the beat plan), the reviews, `refs/` (the author's style references) |
| `kit/` | `pov.js` (characters and props), `sets.js` (sets, screens, cards) |
| `film/` | Engine, stage helpers, the twelve sequences, player, `FILM.md` |
| `src/`, `frames/` | Style frames, sheets, set tests, thumbnails page, and their renders |
| `audio/` | Narration and word times (`vo/`), music takes (`score/`), effects (`sfx/`), sound map, README, CREDITS |
| `tools/` | Narration edit, cue sheet, mix, export, strips, captions, shoot |
| `publish/` | Captions, chapters, titles, description, pinned comment |
| `thumbs/` | The three thumbnails |
| `out/` | Renders and mixes (ignored by git) |

## Credits

Written and narrated by Osita Miles; animated and mixed with Claude. Music: Lyria 3.5 (SynthID-watermarked). Effects: synthesised in code, Stable Audio 3.0 Small (Stability AI Community Licence), and CC0 recordings (`audio/CREDITS.md`). Fonts: Nunito (SIL Open Font Licence).
