# Crownfall: Aethelgard, end credits

A cinematic end-credits film for *Crownfall: Aethelgard*, a Project EON game by Osita Miles. It is drawn entirely in code
(Canvas 2D) and scored to **Sanguis et Terra** from the Crownfall soundtrack (music by Osita Miles). It runs 3 min 2 s at
1920×1080 and 24 fps.

## The film

| Time | What |
| --- | --- |
| 0:00–0:09 | **Project EON**, the studio mark. The O is an orbit ring drawn by a spark that keeps circling it, between thin hand-drawn E and N strokes. The design is original. |
| 0:09–0:15 | Created, written and directed by Osita Miles |
| 0:15–0:27 | **Crownfall: Aethelgard**: a gold line-drawn crown, CROWNFALL in Cinzel arriving letter by letter out of a soft blur with one sweep of light, AETHELGARD in gold between two rules |
| 0:27–2:43 | The credit cards, one at a time, with small role labels over condensed names. The music card lands on the song's lift at 1:03. |
| 2:43–3:02 | The closing card in the song's quiet tail, then the fade to black |

Behind everything: black, ember-coloured bokeh drifting up, rising sparks and falling ash (blood and earth), grain and a
vignette.

## Credits data

`credits/credits-data.json` holds every credit, gathered from all 13 branches of the Crownfall repository. Each entry records the branch and file it came from, and
`credits/credits-data.md` is the readable version. `tools/build_data.js` turns it into `film/data.js`: it shortens labels
for the screen, packs cards, and leaves out the references section (works that only inspired the game; none of their
assets are used). Nothing is credited that the data does not record. The creator confirmed the music credit and the
inclusion of Codex on 8 November 2026. Open questions the data lists as unconfirmed include the authors of the supplied
artwork, the sorcerer's modeller and the Elderbloom seller.

## Watch and build

```sh
cd films/crownfall-credits
open film/index.html                         # the player: Space plays and pauses, the arrows skip five seconds
node tools/build_data.js                     # credits/credits-data.json -> film/data.js
node tools/frame.js 23 out/title.png         # one frame
node tools/strip.js 0 30 2 out/open.png 5    # a contact sheet
node tools/export.js out/crownfall-credits.mp4 --workers 3   # the MP4, with Sanguis et Terra laid under it
```

`FILM.renderAt(t)` is deterministic: no `Math.random`, no `Date`. Playwright and Chromium render the frames and ffmpeg
encodes them.

## Sources

- Music: `audio/sanguis-et-terra.mp3`, from the Crownfall soundtrack, by Osita Miles. The bytes match the game's copy
  (SHA-256 234f9f2a…).
- Typefaces in `fonts/fonts.css`, all SIL Open Font License 1.1:
  - Barlow Condensed and Archivo, from this repository's shared fonts;
  - Oswald;
  - Cinzel (The Cinzel Project Authors; `fonts/OFL-Cinzel.txt`), from the Crownfall repository.
- Everything drawn on screen is original code in `film/credits.js`. There are no images, video or generated pictures.
