# Autopilot

*Autopilot*, a film by Osita Miles, animated entirely in code (Canvas 2D). 11 min 27 s. No image or video generators were used for the picture.

Daniel leaves his phone charging by the kettle, an ordinary slip. On the hottest day of the year he drives his daughter Emily toward nursery; she leans out of the sun into the shade behind his headrest, and in his mirror her face disappears. The film lets the audience make his mistake with him.

## Watch

- `player/autopilot.html` is the whole film in one page. It plays the mixed soundtrack `player/autopilot.mp3` beside it (the same mix as the MP4). Space plays and pauses, the arrows skip five seconds, and `[` / `]` jump between scenes.
- `film/index.html` is the same player loading the source files directly, for development.
- The MP4 is rendered with `node tools/export.js out/autopilot_picture.mp4 --workers 3 --no-audio`, and the soundtrack is muxed over it (`audio/README.md`).
- **The YouTube cut** (10 min 26 s) sits beside this director's cut: no title card, so it starts on the 6:14 alarm, and about 61 s of wordless shot tails trimmed from the routine, the drive, the office, the heat and 5:37 (`cuts/youtube.json`, every span with its reason). Breakfast, the mirror, the routine montage and the whole ending are untouched; no cut lands during a subtitle. The picture is cut from the director's cut's and the soundtrack rebuilt on the new clock, not chopped: `python3 tools/youtube_cut.py --picture`, then `uv run tools/build_mix.py --cut youtube --mix --mux` (-> `out/youtube/autopilot_youtube.mp4`).

## Look: "Through Glass"

Every shot is framed through a pane: the phone's screen, the kettle's chrome, steam on the shower glass, the rear-view mirror, the windscreen, the office's sealed window, the laptop's black glass, and at last the dark rear window where Daniel sees only his own reflection. Graphic realism with flat shapes, glare, reflections and a little refraction, in desaturated teal and amber. The author chose it from three looks drawn as the same three moments (`frames/BOARD_looks.jpg`), full 16:9, with no title or slate on screen and the subtitles in the picture. `design/look_c.md` is the doctrine; `design/DECISIONS.md` records what the author settled.

**Restraint.** Emily is never shown in the car after the mirror moment; from then on the mirror shows only the road and the rear glass only reflects. The inside of the car is never shown at the end ("We do not see inside.").

## Sound

Daniel's narration and the radio presenter are voiced with Gemini text-to-speech, in British voices the author chose by ear. The score is 15 cues from Lyria 3.5 built on one felt-piano figure for the routine, which stops on "Where's Emily?". The effects and room tones were generated locally with Stable Audio 3.0 Small SFX and checked by ear-model (earshot), with some CC0 recordings from *One Too Many* and a few designed tones. From the door, the world falls silent except Daniel's voice. `audio/README.md` explains the build and the checks; `audio/CREDITS.md` credits everything.

## Layout

| Path | What it is |
| --- | --- |
| `film/FILM.md` | How the film is built: the engine's contract, subtitles, sound, sets, characters, story-wide rules. Read this first. |
| `design/` | The screenplay, the decisions, the look's doctrine, the three looks' brief, and `SEQUENCES.md` (the film shot by shot). |
| `kit/otm.js`, `kit/look_c.js` | The shared drawing kit (from *One Too Many*) and Look C's helpers (palette, pinhole camera, glass, chrome, captions). |
| `film/engine.js` | Timeline, shots, camera, Look C subtitles timed to the recorded voices, `FILM.drawShot` (the flash cuts are the morning's own images), score collection, player, export hooks. |
| `film/rig.js` | The characters: Daniel, Emily, Sarah, Priya and the extras, with silhouette, reflection and fogged-glass modes (`film/api/rig.md`). |
| `film/sets/*.js` | Ten sets: bedroom, kitchen, bathroom, house, car, roads, city, car park, office, nursery (`film/api/*.md`). |
| `film/seq/Q01_*.js` to `Q12_*.js` | The twelve sequences, in story order. |
| `audio/` | The voices, the score, the sound kit, the sound map, the cue sheet, credits and the sound README. |
| `tools/` | strip, frame, set and board sheets; export; the cue sheet; the sound generation, the score, the mix builder; the player bundle; the YouTube cut. |
| `cuts/` | Edit lists for other cuts of the film (`youtube.json`). |
| `src/`, `frames/` | The style frames, the looks board and the YouTube thumbnails (`src/THUMB_youtube2.html` draws C, D and E from the film's own frames). |

## Tools

```sh
cd films/autopilot
node tools/strip.js Q05 1                 # a sequence's contact sheet -> out/strip_Q05.png
node tools/frame.js Q05 45.6 out/q05.png  # one frame
node tools/set.js car 1                   # a set's (or the rig's) demos
node tools/export.js out/autopilot_picture.mp4 --workers 3 --no-audio
node tools/cuesheet.js out/cuesheet.json && uv run tools/build_mix.py --mix --mux
python3 tools/bundle.py                   # out/player/autopilot.html
```
