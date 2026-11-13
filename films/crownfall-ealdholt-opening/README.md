# Crownfall: House Ealdholt, the My Legacy opening

The film a player sees the first time they enter **My Legacy** in *Crownfall: Aethelgard* (a Project EON game by Osita
Miles). It runs 30 seconds at 1920×1080 and 30 fps (900 frames), and ends on the title **HOUSE EALDHOLT**. After it the
game shows My Legacy's own loading screen while the village is prepared, then opens the village. The film plays once;
later visits go straight to the loading screen.

It is **shot inside the game's own village**: every frame is drawn by the game's renderer, so the film has the
game's light, colour and detail, and the place the player has just seen is the place that opens. The creator asked
for the fast camera of **first-bloom** (github.com/Leonxlnx/first-bloom) through the village, with a beginning, an
ending, a look and a title that are Crownfall's own.

## The film

| Time | Shot | What happens |
| --- | --- | --- |
| 0:00–0:04.6 | **The watch** | Before dawn. From above the dark woods, a slow glide toward the village and the mountains behind it; the sky goes from night to rose to day (05:50 to 06:18 by the village's clock). The only slow shot. |
| 0:04.6–0:15.4 | **The run** | Full morning (07:06). Low and fast: west along the road north of the churchyard, south down the walled lane beside it, west along the south road, north up the fenced lane, through the compound gate, over the pond, a hop over its fence, then east between the long houses into the sun. A lap of the village at about 22 m a second. |
| 0:15.4–0:16.8 | **The climb** | Up through the crowns of the alders into open sky and the mountains. |
| 0:16.8–0:24 | **The spiral** | Out of the east the camera swoops down on the church, banked, and whips round its towers above the crowns. |
| 0:24–0:30 | **The rise and the title** | Still turning, it draws back and up until Ealdholt lies in its woods under the mountain. The dark gathers over it from 24.8 s; gold leaves fly in and settle as a wreath, Ealdholt's arms strike, HOUSE EALDHOLT arrives letter by letter, white-hot, and cools to gold; a band of light crosses it; MY LEGACY sits beneath. To black by 30 s. |

The run from 7.52 s (the fenced lane onward) and the climb are first-bloom's camera moves at first-bloom's cut times,
re-plotted on Ealdholt's ground. The watch, the first three seconds of the run, the spiral, the rise and the title are
this film's own.

## Watch and build

```sh
cd films/crownfall-ealdholt-opening
npm install                          # three.js only (the camera's curves)
node tools/ground.mjs                # out/ground.json: the village's ground heights, for the camera
# with the game's dev server and its private village service running (see below):
node tools/shoot.mjs --out out/look --step 5                 # every fifth frame: a quick look at the whole film
node tools/sheet.mjs out/look out/look.jpg --cols 8 --w 320  # a contact sheet of them
node tools/shoot.mjs --out out/shoot --blur run:4,canopy:4,swoop:2,flyby:2   # all 900 frames (it resumes if stopped)
node tools/title.mjs                 # out/title: the title's frames
node tools/finish.mjs                # the 1080p master and the 1280x720 cut the game ships
node tools/install_in_game.mjs       # copies the cut into the game and updates its size and hash there
```

- **The game does the drawing.** `tools/shoot.mjs` opens the game (`CROWNFALL_URL`, default `http://localhost:5173/`)
  with `?ealdholtFilm=1`, enters My Legacy and waits for the village. That address turns on a hook that exists only
  in the game's development build (`main game/src/legacy/aethelgard/village-view.ts`, `window.__ealdholtFilm`). For
  each frame the script places the camera, sets the sky's hour, the animation time and the weather, waits for the
  world to draw that pose, and captures the picture. The game's interface is hidden for the shoot.
- The game needs its dev server (`npm run dev` in `main game/`) and its private village service
  (`node scripts/serve-private-village.mjs` in the Crownfall checkout, until the branch that starts it automatically
  is merged).
- `--blur run:4,…` shoots that many moments inside each frame of the named shots and `tools/finish.mjs` averages
  them: real motion blur, half-open shutter. `--ss 1.5` would draw each frame at 2880×1620 to be scaled down; it was
  not used, since the game's cut is 1280×720 and is already scaled down from 1080p.
- The village model is **not in this repository**. `tools/server.mjs` serves it to `tools/ground.mjs` from the
  Crownfall checkout (`private-assets/elderbloom/…candidate-v5.glb`), or from the path in `EALDHOLT_VILLAGE_GLB`.
- Playwright is resolved from outside this repository, as the other films' tools do (`PLAYWRIGHT_FROM`; the default
  is the Crownfall game's `node_modules`).

## How it is made

- **Camera** (`film/src/world/timeline.js`, `layout.js`): every position, the lens and the hour for each of the 900
  frames. `layout.js` holds where things are in the village (the lanes, the pond, the church, the spiral's keys), in
  the same metres the game's village views use.
- **Hour**: the game's own clock and sun. The watch runs the last of the night into day; the rest is one morning.
- **Picture**: the game's village renderer at its High preset, unchanged. No grade, no filter.
- **Title** (`tools/title.html`): made in a canvas. Each shape (the letters, the arms, each leaf) is a mask given a
  chiselled edge from its distance field and lit as gold, in the manner of the game's CROWNFALL / AETHELGARD title.
  `tools/title.mjs` renders it as frames with a clear ground; `tools/finish.mjs` lays them over the last shot.

`LOOK.md` has the idea and the rules the picture keeps.

## Sound

Not made yet: the picture is encoded with a silent track. `audio/sfx_plan.json` is the plan for this cut: a music cue
and fourteen designed sounds, few and quiet (night air, the first birds, the rush of the run, the pond, the leaves,
the dive, one church bell as the camera passes the towers, and the strike and shimmer of the title). The tools are
here (`tools/stable_sfx.py`, `listen_sfx.py`, `music.py`, `mix.py`): sounds and music generated locally with Stable
Audio 3.0 Small through Soundbox and audio.cpp, from text prompts only, checked by ear with earshot. The models are
not downloaded.

### Making the soundtrack somewhere else

The soundtrack can be made on another machine that has the models (the creator's cloud session does). It needs only
this folder, not the picture:

```sh
export CINES_TOOLS=/path/to/tools        # where soundbox/ and the earshot venv live; or set SOUNDBOX_CLI directly
python tools/stable_sfx.py                # the fourteen sounds -> audio/sfx_sa/<id>.wav
<earshot venv>/bin/python tools/listen_sfx.py     # earshot checks each against its 'check' and 'not'; re-makes failures
python tools/music.py                     # four candidate cues -> audio/music/cand_<seed>.wav
# choose one and write audio/music/pick.json: { "file": "cand_602.wav", "offset": 0, "gain": -6, "fade_in": 0.5, "fade_out": 2.5 }
python tools/mix.py                       # out/mix.wav and audio/ealdholt-opening-mix.m4a, -16 LUFS, true peak under -1 dBTP
```

The film's clock for sound: the watch is 0 to 4.6 s (quiet); the run starts hard at 4.6 s; the pond is 10.55 to
11.7 s; the leap through the branches 11.8 to 12.4 s; the dive 13.9 to 14.5 s; the climb 15.4 to 16.79 s; the spiral
from 16.79 s, closest to the towers at about 22 s; the title's dark gathers from 24.8 s, the arms strike at 26.75 s,
the letters arrive from 26.35 to 27.9 s, the band of light crosses from 27.55 to 28.85 s, and the picture is black
by 29.95 s. Commit `audio/sfx_sa/`, `audio/music/pick.json` with the chosen take, and
`audio/ealdholt-opening-mix.m4a`. Back on the machine with the picture, `node tools/finish.mjs` picks that mix
up and `node tools/install_in_game.mjs` puts the cut with sound into the game.

## In the game

`tools/finish.mjs` writes `out/game/crownfall-ealdholt-opening.mp4` (1280×720, H.264 CRF 26 capped at 4.2 Mbit/s, AAC 160k, faststart).
The game's copy is `Crownfall/main game/public/video/crownfall-ealdholt-opening.mp4`, recorded with its size and
SHA-256 in `provenance.json` and `SOURCES.md` beside it and in `shared/menu/opening-film.ts`.

## Sources

- **Picture:** the Crownfall game's own renderer and its world: the Elderbloom village model licensed to the
  Crownfall project under the Fab Standard License, and the game's woodland, terrain, water and sky. The model is not
  redistributed here (`.gitignore` excludes `*.glb`; `out/`, which holds the ground heights baked from it, is ignored
  too), only pictures of it. Its licence forbids use in generative AI: the model and its frames go to no generative
  service.
- **Camera moves:** the low run (from the fenced lane on) and the climb through the crowns follow first-bloom by
  Leonxlnx, github.com/Leonxlnx/first-bloom, commit `713525b` (9 November 2026): the formulas in
  `film/src/world/timeline.js` (`run`, `canopy`) are adapted from its `src/world/timeline.js`, and
  `film/src/world/keys.js` (keyframe helpers) is copied from it unchanged. Nothing else of first-bloom is used: not
  its renderer, its shaders, its sky, its flower or its audio. **Its repository states a licence for its audio only,
  not for its code** (its `package.json` carries npm's default "ISC"); the author's permission for these two pieces
  should be confirmed before the film ships.
- **Title face:** Cinzel, SIL Open Font License (`fonts/OFL-Cinzel.txt`), embedded in `fonts/fonts.css`. Ealdholt's
  arms (a sprig on russet) are the creator's, from the Crownfall film kit.
- **three.js** 0.187.0, MIT (curves and vectors for the camera).
- **Sound tools:** Soundbox (github.com/HamSanders/soundbox, MIT) and earshot (github.com/Leonxlnx/earshot, MIT).
  The Stable Audio 3.0 Small weights are under the Stability AI Community License (stability.ai/license): free for
  commercial use below USD $1M annual revenue.
