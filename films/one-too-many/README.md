# One Too Many

*One Too Many*, a film by Osita Miles, animated entirely in code (Canvas 2D, Web Audio, Google Fonts). No image or video generators are used.

## Watch

- `player/one_too_many.html` is the whole film in one page. It plays the mixed soundtrack `player/one_too_many.mp3` that sits beside it, which is the same mix as the MP4. Open it in a browser and press Play (headphones recommended). Space plays and pauses, the arrows skip five seconds, and `[` / `]` jump between scenes.
- `film/index.html` is the same player loading the source files directly, for development.
- `node tools/export.js out/one_too_many.mp4 --workers 3` renders the picture. The engine's own soundtrack goes with it. The final soundtrack is built as described in `audio/README.md` and muxed over the picture.

## Sound

The soundtrack uses real CC0 recordings: fire, glass, a scream, laughter, cards, footsteps, a heartbeat, a doorbell, the gas, the explosion. They were found on Freesound and placed from the film's own timing with [opus-sound-layer](https://github.com/Bodila51/opus-sound-layer). Its mixer sets each level and masters to -18 LUFS, and its QA measured the result. The score and the sounds that are synthetic in life (tinnitus, phone tones) are still made in code. `audio/README.md` explains how the soundtrack is built and what the checks show. `audio/CREDITS.md` credits every recording, and `audio/LISTEN.md` lists five moments to judge by ear.

## Look: "Negative Space"

The six friends are hard ink cut-paper silhouettes, and each shot has one motivated light, drawn as flat posterised bands. The extra guest is never drawn. It appears only as something missing: a gap in a count, an empty place at Scott's right, or a cut through the paper to an ember lightbox behind the world. Every speaker's dialogue is designed kinetic type, and the script's words are kept verbatim.

Three looks were pitched and scored by three independent judges (story, buildability, craft). Negative Space won 125.5 to 113 (*One Rod Too Many*) and 107 (*Recount*), and the author chose it. The proposals, verdicts and the synthesised spec, including a 45-beat map of the whole film, are in `design/`.

## Layout

| Path | What it is |
| --- | --- |
| `KIT.md` | The style doctrine and the drawing API. Read this first. |
| `kit/otm.js` | Palette, seeded RNG and noise, cut-paper shapes, posterised light, rim light, the ember lightbox and knockouts, the frame compositor (halation, grain, fibre, vignette, letterbox). |
| `kit/figures.js` | Procedural silhouettes for Scott, Deena, Angelo, Kay, Christof and Marina: profile, top-down, front bust, and hands. |
| `kit/dialogue.js` | The eight type voices (`OTM.say`). |
| `fonts/fonts.css` | Google Fonts (OFL), inlined as data URIs so frames render offline. |
| `film/` | The film engine, the sound engine (`sound.js`), the cue-to-sound map (`sfx_map.js`), the sets and the 12 sequences. |
| `audio/` | The recordings (`sfx/`, `beds/`), the cue sheet, credits and QA reports. |
| `tools/shoot.js` | Renders an HTML frame to a 1920x1080 PNG with the preinstalled Playwright Chromium. |
| `src/` | Style-frame sources. |
| `frames/` | Rendered style frames (JPEG). |
| `design/` | Screenplay text, the three pitches, judge verdicts, the final spec. |
| `alt-looks/` | The two looks not chosen (Recount, One Rod Too Many), drawn as the same three moments for comparison; `frames/BOARD_three_looks.jpg` shows all three side by side. |

## Style frames

There are 13 story frames, in story order: title, cold open, Kay at the door, the party, seven hands, six hands on six cards, the hand circle, the photo, the oven, Deena, the lighter, the kitchen erupts, and "Two.". There are also three reference sheets: the cast, the dialogue voices, and the colour script with the letterbox counter. All of them are in `frames/`, and `frames/SHEET_negative_space.jpg` shows the whole set at once. Each frame is a single HTML file in `src/` that uses the shared kit.

## Render a frame

```sh
cd films/one-too-many
node tools/shoot.js src/S01_cast.html /tmp/S01_cast.png
```
