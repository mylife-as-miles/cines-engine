# Crownfall: Aethelgard, opening: "The Seven That Remained"

The opening film of *Crownfall: Aethelgard*, a Project EON game by Osita Miles. It is drawn entirely in code (Canvas 2D):
a narrated chronicle that begins as a book and ends as a world. 1920×1080, 24 fps, about five minutes; the length
follows the narration.

| Part | What |
| --- | --- |
| Project EON | A pen draws the studio's mark on pale paper under a close lens and pulls back to the whole emblem, engraved; the O floods vermilion. "Project EON presents". |
| 1. The King Who Vanished | Ink spreads across the map of Aethelgard. Above it, an illumination: the Hollow King over an assembly of rulers. His painted face fades and the vellum tears there; he lifts off the page; seven flames light at the seven halls. |
| 2. The Fall of the Crown | The Sovereign Crown shatters; its shards fall across the land; ash, the Scavenger Wars. Four roundels name the powers that endured: Korvenia beneath a violet eclipse, Solforiz's smoking deserts, Kwind's towers in steam and rain, and Aethelgard, whose map rises into a diorama of mountains and forests. |
| 3. The Seven Great Houses | Seven territories around the halls; each house shown by what it holds. A tapestry: the Seven join hands, and the hands become knives. |
| 4. The Beasts That Devoured Kings | A convoy on a frozen road; the shadow; a First-Born out of the cloud. A procession through the capital, the creature bridled and chained; its eye turns to us, afraid of its rider. |
| 5. A Kingdom Divided | Illuminated miniatures: who may live where, marry whom, inherit a name, be believed by a court; gates that close; a child stopped by a guard. The Seven's banners torn down. |
| 6. The King's Gambit | The battlefield becomes the board. Only the Seven may raise knights, bishops and rooks; a queen is lent between houses; Ealdholt may raise only pawns, and must borrow the rest at a price. A knight moves, a bishop falls, a king is surrounded. |
| 7. Your Legacy Begins | The chronicle burns, and the present is behind it: Year 33, the houses mustering. A small banner hall; on its table, a blank standard. |
| Title | YEAR 33 • ASH & AETHER INTERREGNUM; CROWNFALL / AETHELGARD; "Your Banner. Your People. Your Legacy." |

The story, the narration and the King's Gambit rule are the creator's (narration/script.json; the five lines that
carry the Gambit rule are marked `added` for the creator's approval). House names in the story concept are working
placeholders and are never shown; each house appears by what it holds and by its arms.

## Watch and build

```sh
cd films/crownfall-intro
open film/index.html                               # the player, synced to audio/intro-mix.m4a; tick Subtitles to see them
node tools/frame.js 27.5 out/a.png [--subs]        # one frame (prints the draw time)
node tools/strip.js 9 38 2 out/s1.png 5 --scene 1  # a contact sheet of one scene
node tools/export.js out/crownfall-intro.mp4 --workers 4 [--subs]
```

The narration drives the timeline:

```sh
python tools/narrate_kokoro.py <kokoro-v1.0.onnx> <voices-v1.0.bin>   # the working voice (local, Kokoro)
python tools/narrate_elevenlabs.py voices                            # or the final voice: list voices
python tools/narrate_elevenlabs.py <voice_id>                        # ...and record narration/final/
node tools/build_timeline.js [working|final]                         # film/timeline.js and the subtitles (cues.vtt)
python tools/mix.py [working|final]                                  # audio/intro-mix.m4a
```

Every scene keys its pictures to its narration lines (`K.cue('L19')`), so a new voice re-times the whole film.
`FILM.renderAt(t)` is deterministic: no `Math.random`, no `Date`.

## How it is made

- `film/kit.js`: the drawing kit: vellum and linen, iron-gall ink with broad-nib strokes, washes, gold leaf, spreading
  and burning reveals, figures, horses, heraldry, map glyphs, smoke, embers, snow and rain, camera and finish.
- `film/map.js` and `film/mapdata.js`: the map of Aethelgard, drawn in ink from shapes traced off the creator's working
  map "Blood-Throne of Aethelgard" (v0.2, proposals, not canon) by `tools/trace_map.py`. The creator's map is not in the
  repository. A ring the creator drew around the Hwælmearc is kept as the player's home.
- `film/scenes/s1.js` … `s7.js`: one file per scene. `LOOK.md` is the art direction and the brief for each scene.
- `film/intro.js`: the studio card, the joins between scenes, YEAR 33, the title, subtitles, grain.

## Sources

- Music by Osita Miles, from the Crownfall soundtrack: **Cyning Slieht**, then **La Fêlure Demeure** (`audio/`; the
  bytes match the game's copies, SHA-256 feed6d0e… and d961f13a…).
- Narration: the creator's text. Working voice: Kokoro (kokoro-onnx; model Apache-2.0), voice bm_lewis, until the final
  ElevenLabs recording replaces it.
- Typefaces (`fonts/fonts.css`, all SIL Open Font License 1.1): Cinzel (`fonts/OFL-Cinzel.txt`), EB Garamond
  (`fonts/OFL-EBGaramond.txt`), Barlow Condensed, Oswald, Archivo.
- Everything on screen is original code. There are no images, video or generated pictures.
