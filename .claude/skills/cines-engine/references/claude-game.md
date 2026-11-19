# Claude Game: trailers, openings and in-engine films for games made with Claude

How the five Crownfall productions in `claude-game/` were made, so new game videos can reuse their tools: painted-in-code openings and credits, code-painted sky textures, and a film shot inside the game's own three.js village. Facts come from the files unless marked **(inference)**. The game repository for the in-engine film is the House Ealdholt repo (a local clone at `/home/user/mylife-as-miles/house-ealdholt`, read-only from here; never push to it from this work).

Contents: 0 The five at a glance · 1 Per production · 2 The in-engine shoot · 3 Tools · 4 Shared patterns, sound, gotchas · 5 Checklist for a new game video · 6 Shooting a built game without a GPU · 7 Craft from outside

Every production is `claude-game/<slug>/` with `README.md`, `LOOK.md`, `tools/`, `audio/` and a git-ignored `out/`.

## 0. The five at a glance

| Production | What it is | Picture made by | Format | Length | Sound | Shipped to the game as |
|---|---|---|---|---|---|---|
| `claude-game/crownfall-intro` | Game opening "The Seven That Remained" (narrated chronicle, then title) | Canvas 2D in code (`film/kit.js` + 7 scene files) | 1920×1080, 24 fps | 4:01 (`total` 241.398 s, set by the narration) | ElevenLabs George + creator's music + SFX | `crownfall-opening.mp4` + `crownfall-opening-titles.mp4`, both 1280×720 (`tools/game_cut.sh`) |
| `claude-game/crownfall-prologue` | Story mode prologue "The Name They Buried" (approved film; painterly finish is the parked WIP) | Canvas 2D + optional WebGL "paint" pass (`film/paint.js`, off by default) | 1920×1080, 24 fps | ~5:56 (`total` 356.029 s) | 9 ElevenLabs voices + 4 music tracks + 11 quiet SFX | No README and no game-delivery step recorded |
| `claude-game/crownfall-arena-skies` | Two sky panoramas (Eclipse, Violet Night) for the chess arenas | Canvas 2D, seeded noise (`film/skies.js`) | 4096×1280 cylindrical still | n/a | none | `out/sky-eclipse.webp`, `out/sky-violet.webp` (WebP q0.9) → `Crownfall/main game/src/play/sky/` |
| `claude-game/crownfall-credits` | End credits scored to "Sanguis et Terra" | Canvas 2D (`film/credits.js`, cards from `film/data.js`) | 1920×1080, 24 fps | 3:02 (`TOTAL = 182.25`) | the music track only, muxed raw | MP4 from `tools/export.js`; game path not recorded |
| `claude-game/crownfall-ealdholt-opening` | House Ealdholt "My Legacy" opening, ending on the title HOUSE EALDHOLT | **The game's own three.js village renderer**, driven frame by frame via the DEV hook `window.__ealdholtFilm`, plus a canvas title overlay | 1920×1080 master, 30 fps, 900 frames | 30 s | Stable Audio 3.0 Small music cue + 14 SFX, no voice, −16 LUFS | `out/game/crownfall-ealdholt-opening.mp4` (1280×720) → `Crownfall/main game/public/video/` via `tools/install_in_game.mjs` |

Outputs on disk: only `claude-game/crownfall-arena-skies/out/` exists (`sky-eclipse.webp` 141 KB, `sky-violet.webp`
216 KB, plus `-preview.jpg`). The other `out/` folders are absent (git-ignored renders).

## 1. Per production

### 1.1 crownfall-intro (opening and title sequence, narrated)
- **Purpose**: the opening the game plays. The whole film plays on first start; only the title sequence (studio mark,
  YEAR 33, title) plays on later starts. The order is Project EON card → 7 scenes → `YEAR 33 • ASH & AETHER INTERREGNUM` →
  CROWNFALL / AETHELGARD → tagline.
- **LOOK.md doctrine** (`claude-game/crownfall-intro/LOOK.md`): "the chronicle becomes the world". S01–S02 are vellum,
  ink and gold. Then a map and a tapestry, an ink-wash diorama with parallax, illuminated miniatures, a projected-3D
  chess board, and finally burning pages giving way to the present. The rules:
  - **Deterministic**: `draw(ctx,t,sc)` uses no `Math.random`, `Date` or `performance.now`. Use `K.rng/hash/noise/fbm`.
  - **Keyed to narration**: `K.cue('L19').start/.end` and `sc.start/sc.end`. Never hard-code seconds.
  - **Always moving** (eased camera). **Fast enough**: under ~120 ms a frame; use `K.cached`, keep `K.mask` ≤960×540
    and pages ≤~3000×2000, no full-frame `filter: blur()`.
  - **Content**: no house names on screen (houses appear by device: `K.HOUSES`/`K.LESSER`/`K.BLANK`). Violence is
    told, not lingered on; discrimination shown through registries, never skin colour; no real flags or religious marks.
  - **Joins** `'dissolve'` (with `joinDur`), `'black'` or `'cut'`. One file per scene, `film/scenes/sN.js`, registering
    `SCENES[n] = {join, joinDur, draw}`; authors touch only their own file.
- **Build**: `film/kit.js` (`window.KIT`; W=1920, H=1080, FPS=24) is the drawing kit: parchment, nib strokes, washes,
  gold leaf, reveal masks, figures, horses, heraldry, maps, smoke/embers/snow/rain, `cam`/`camPath`/`shake`,
  `grade`/`bloom`/`vignette`, grain. `film/map.js` + `mapdata.js` draw the map of Aethelgard; `film/assets/worldmap.js`
  embeds the creator's painted world map (the only image). `film/intro.js` defines `FILM` (`renderAt(t)`, `total`,
  `opts{subs,sceneOnly}`, `loadFonts`, `mount`, `mountHeadless`) and draws the studio card, joins, YEAR 33, title,
  subtitles and grain. `film/timeline.js` is generated (do not edit). `film/index.html` is the player synced to
  `audio/intro-mix.m4a`; `film/headless.html` takes `?subs=1` and `?scene=N`.
- **Capture**: Playwright Chromium opens `film/headless.html` (`file://`, 1920×1080). Each frame is
  `FILM.renderAt(i/24 + 1e-4)` → `canvas.toDataURL('image/jpeg',0.94)` → ffmpeg (`image2pipe mjpeg`, libx264 medium,
  CRF 17, `-tune grain`). N workers render contiguous ranges; segments are concatenated and the mix muxed (AAC 256k).
- **Narration**: `narration/script.json` (50 lines; fields `cut`/`added`/`say`/`pause`; full text in
  `script-full.json`).
  - Working voice: Kokoro (kokoro-onnx, Apache-2.0), `bm_lewis`, en-gb → `narration/working/` (and `working-long/`).
  - Final voice: **ElevenLabs "George"** (`JBFqnCBsd6RMkjVDRZzb`), model `eleven_v4`, tempo 1.06 →
    `narration/final/*.mp3` (WAVs git-ignored). Each line is sent with `previous_text`/`next_text` so the reading flows.
  - The key never appears in code: "the session's proxy adds it to requests to api.elevenlabs.io". It is a network
    secret on that host; there is no env var.
- **Music**: Osita Miles, "Cyning Slieht" then "La Fêlure Demeure" (`audio/*.mp3`, bytes match the game's copies).
- **SFX**: `tools/sfx.py` makes numpy code sounds (`audio/sfx/*.wav`); Stable Audio takes are in `audio/sfx_sa/` (33,
  E01–E33; earshot passed 32, `E27_chains_taut` failed). **The game ships the creator-chosen cut at commit `e0b131f`,
  "George's narration, the code-made sounds"**, not the Stable Audio set. `audio/sfx_plan.json` places sounds by
  structure (`{cue,edge,offset}`, `{scene}`, `{studio}`, `{year33}`, `{title}`), with `align`, `level` (dB against
  the narrator's loudest 0.4 s), `duck`, `check` and `not`.
- **Mix** (`tools/mix.py [working|final]`): music ducks −19 dB under the voice (lines closer than 1.4 s merge; attack
  0.45 s, release 1.1 s) and dips 3–8 dB under loud SFX. Bus weights: music 1 / voice 1.25 / sfx 1; 3 s fade-out.
  `loudnorm=I=-16:TP=-1.5:LRA=11` (single pass) → `audio/intro-mix.m4a` (AAC 192k).
- **Game cut** (`tools/game_cut.sh`): input is the 1080p picture with burned subtitles rendered at `e0b131f`, plus the
  approved delivery (its audio copied unchanged). Encode: 1280×720 lanczos, libx264 slow, CRF 28, tune film, 24 fps,
  faststart. Outputs `crownfall-opening.mp4` (27.6 MB) and `crownfall-opening-titles.mp4` (0–7.9 s + 221.0 s–end,
  1.3 MB, AAC 160k). The game records bytes and SHA-256 in `main game/public/video/provenance.json`.

### 1.2 crownfall-prologue (painterly prologue, parked WIP)
- **Purpose**: the Story mode prologue. Cold open with a whisper and the title (scene 0), 8 scenes, then the card
  "CHAPTER ONE / THE PAWN WHO WOULD NOT DIE". There is **no README**; `LOOK.md` is the brief. The creator asked for the
  epic of the Elden Ring and Clair Obscur openings, with Cael dying "like Saint Lawrence on the gridiron".
- **LOOK.md doctrine**: "a painted legend that wakes up". Every shot is a painted tableau: parallax ink-wash and
  gouache, rim light, haze, silhouettes, faces rarely seen. A palette per scene and a character/motif bible (Cael's
  russet cloak `#6e5236`, the silver star, the register page "parentage: unknown", the oak-leaf clasp, the curse as
  vermilion veins, real chess). Same rules as the intro, plus **cuts inside scenes** on line boundaries (6–10 frame
  dissolves) and a 150 ms/frame budget. On-screen text: register lines and chess only. In-world lines are in Old Aethel
  and High Drakonic (`narration/LANGUAGES.md`) with English subtitles.
- **Build**: the intro's structure. `film/kit.js`, `map.js` and `mapdata.js` are byte-identical to the intro's.
  `film/prologue.js` replaces `intro.js`. `film/paint.js` is a WebGL2 painterly shader `K.paint(ctx, look)`: edge
  wobble, an SNN filter, brush strokes, edge pooling, canvas weave, bloom, grade and vignette. It is enabled by
  `?paint=1` or `--paint` and is "work in progress, off by default; the approved film renders without it".
- **Voices**: `narration/script.json` → `voices` maps speakers to ElevenLabs voices: narrator George, cael Harry,
  voice Lily, plus rider, captain, guard, arbiter, herald and killer, each with its own stability and style. Model
  `eleven_v4`; tempo 1.06 for the narrator only; audio tags like `[whispers]`, `[laughs]` go in `say`; subtitles carry
  VTT `<v SPEAKER>` tags.
- **Music**: four Osita Miles tracks handed over by scene (Le Roi Muet → Slay the Iron Slave → Krom Shahid → La Felure
  Demure).
- **SFX**: 11 sounds, "few and quiet on purpose: the creator found the opening film's 33 effects too many and too loud".
  Levels sit −11 to −22 against the narrator, with `duck: 0`.
- **Mix**: the intro's design, plus an FFT-convolved cold reverb (rt 2.4 s, wet 0.42) on the speaker `voice`. Same
  loudnorm (−16 LUFS, −1.5 dBTP) → `audio/prologue-mix.m4a`.
- **Export**: `tools/export.js` at CRF 19. Note: export opens the page with `{subs}` only, so `--paint` works in
  `frame`/`strip`/`perf` but **not in export** (from the code).

### 1.3 crownfall-arena-skies (Eclipse, Violet Night)
- **Purpose**: the dome skies behind the chess arenas, painted in code from seeded noise. No generators, no photos.
- **Format**: cylindrical panorama 4096×1280; azimuth −180..+180° (eclipse at 0°), elevation +78° (top) to −12°
  (bottom), eclipse at 20.3° where the game hangs it. The noise wraps in x (`pnoise` with a period): no seam.
- **Painted vs. left to the game**: painted are the light fall, horizon ring and airglow, far cloud, star river and
  nebula, and a three-range skyline. The game's shader adds the stars, drifting cloud, aurora and the eclipse itself.
  Doctrine (README): no tall thin towers (one crossed by cloud read as a cross); no real-world religious symbol.
- **Capture**: `tools/export.js` calls `SKIES.paint(name)` → WebP q0.9 and PNG → ffmpeg 1600-wide preview JPG. It
  prints bytes and SHA-256 for the game's provenance (`SOURCES.md` in `Crownfall/main game/src/play/sky/`).

### 1.4 crownfall-credits
- **Purpose**: end credits. 0:00–0:09 Project EON mark (orbit ring drawn by a spark); 0:09–0:15 creator card;
  0:15–0:27 gold crown, CROWNFALL letter by letter with a light sweep, AETHELGARD between rules; 0:27–2:43 cards (the
  music card lands on the song's lift at 1:03); 2:43–3:02 closing card and fade. Behind: ember bokeh, sparks, ash,
  grain, vignette.
- **Data pipeline**: `credits/credits-data.json` was gathered read-only from all 13 Crownfall branches, with source
  branch and file per entry (`credits-data.md` is the readable version). `tools/build_data.js` → `film/data.js`
  (`window.CREDITS`) shortens labels, packs cards at most 3 groups a row, and drops the references section.
  "Nothing is credited that the data does not record." Unconfirmed items are listed in the data.
- **Picture**: self-contained `film/credits.js` with its own rng/ease helpers and no kit. Fonts are Barlow Condensed,
  Archivo, Oswald and Cinzel (OFL).
- **Sound**: `audio/sanguis-et-terra.mp3` muxed as is (AAC 256k). There is no mix or loudnorm. The film length is
  pinned to the song (182.28 s).

### 1.5 crownfall-ealdholt-opening (in-engine, three.js village)
- **Purpose**: plays once on first entry to My Legacy. The loading screen follows, then the village. The film is shot
  inside the game's own village so "the place the player has just seen is the place that opens". The camera is
  first-bloom's fast run (github.com/Leonxlnx/first-bloom, commit `713525b`); the beginning, ending, look and title are
  Crownfall's.
- **Shots** (`film/src/world/timeline.js` `TIMES`/`SHOTS`):

  | Shot | Time | Notes |
  |---|---|---|
  | `watch` | 0–4.6 s | pre-dawn glide; sky minute 350→378 |
  | `run` | 4.6–15.4 s | low lap at ~22 m/s through real gaps: lane, gate, pond, fence hop, long houses; minute 426→436 |
  | `canopy` | 15.4–16.79 s | climb through the crowns |
  | `swoop` | 16.79–20.72 s | banked dive on the church |
  | `flyby` | 20.72–23.7 s | round the towers |
  | `rise` | 23.7–30 s | draw back over the village |

  The title (`tools/title.html`, `T0 = 24.8`) runs from the dark at 24.8 s, the arms strike at 26.75 s, the letters
  arrive 26.35–27.9 s and the light band crosses 27.55–28.85 s. The picture is black by 29.95 s.
- **LOOK.md doctrine** (`claude-game/crownfall-ealdholt-opening/LOOK.md`): "the house wakes".
  - **The picture is the game's**: High preset, no grade, filter or paint-over. "If the film should look different,
    the game should look different." The village is as the player finds it; the hour is the game's clock.
  - **The camera never passes through anything** (check with `--step 5`). The middle keeps first-bloom's moves; the
    ends are ours. No villagers are faked; no religious symbol is added.
  - The title is "forged, not typeset": SDF-chiselled gold (`#f6d98a`/`#c8963c`/`#8a5f22`), russet arms `#6e5236`,
    dark `#080504`. Known limits: the model is a 152 m square (keep the ending below ~50 m); alpha-tested foliage
    sparkles in the dark.
- **Camera code**: `film/src/world/layout.js` holds village anchors in model metres (+x east, +z south): `BOUNDS`,
  `POND`, `CHURCH`, the run plan. `timeline.js` exports `makeFilm(ground).at(t)` →
  `{pos,target,roll,fov,near,focus,minute,cloud}` and `shotAt(t)`. `keys.js` (monotone cubic keys) is copied unchanged
  from first-bloom. `ground.js` bakes a 0.5 m height grid from the GLB.
- **Sound**: no voice; the music leads.
  - Music: Stable Audio 3.0 Small **Music** (`audiocpp-stable-audio-3-small-music`), 32 s, seeds 601–604. Seed 602
    was picked for its shape (`audio/music/pick.json`: offset 0, gain −6, fade_in 4.0, fade_out 1.0).
  - SFX: 14 Stable Audio 3.0 Small **SFX** sounds L01–L14 (`audio/sfx_sa/`), all 14 passed earshot. They were
    generated 13 Nov 2026 on the Linux CPU build of audio.cpp (git `f7ac446`).
  - Mix: `tools/mix.py` (two-pass linear loudnorm to −16 LUFS, TP −1 dBTP, LRA 14; `peak` puts a sound's loudest
    50 ms on a film time) → `audio/ealdholt-opening-mix.m4a` (30.0 s, AAC 192k, 48 kHz). **README's "Sound: not made
    yet" section is stale.**
- **Deliverables**: master `out/house-ealdholt-opening-1080p.mp4` (CRF 15, BT.709, AAC 256k); game cut
  `out/game/crownfall-ealdholt-opening.mp4` (1280×720, CRF 26 capped at 4.2 Mbit/s, AAC 160k, faststart) →
  `Crownfall/main game/public/video/`, with size and SHA-256 in `provenance.json`, `SOURCES.md` and
  `shared/menu/opening-film.ts`.

## 2. The in-engine shoot in detail (crownfall-ealdholt-opening)

**The game side** (`/home/user/mylife-as-miles/house-ealdholt/main game/src/legacy/aethelgard/village-view.ts` ≈ lines
2325–2377):
- Created only when `import.meta.env.DEV && ?ealdholtFilm=1`; production builds never have it; nothing is saved.
  `window.__ealdholtFilm` has:
  - `take()`: takes the camera and the clock from the player. It disables OrbitControls and damping, installs a film
    observer link (simulated ms, sky override, speed 1) and requests a render.
  - `pose(position[3], quaternion[4], fov, focus[3], near=.15)`: sets the camera. `focus` becomes `controls.target`,
    which steers the shadow cascade and level of detail. It marks `shadowDirty` so every frame gets a fresh shadow map.
  - `clock({residentMilliseconds, skyMinute, seconds, sky})`: villager time (forward only), the absolute village minute
    for the sun, the animation seconds, and weather (`{weather, cloudCoverage, windStrength}`).
  - `state()`: returns `{presented, renders, dirty, frameQueued, gpuPending, preparationPending, observationPending,
    initialDayMinute, millisecondsPerWorldMinute, environment{hour,minute,daylight,sunIntensity},
    materialProgramsPending, queue, gpu, populationStatus, population, ...}`.
  - `render()`: requests a render. It is not called by `shoot.mjs`.
- The hook's comment in the game cites the old path `cines-engine, films/crownfall-ealdholt-opening/...`; the folder now lives in
  `claude-game/` (cines-engine was reorganised into studios in November 2026).

**Serving the game for a shoot**:
- In the cines README the game is "the Crownfall checkout" (Windows default `C:/Users/MILES/Documents/Crownfall`); the
  local standalone `house-ealdholt` has the same layout. Its dev `index.html` is the full Crownfall menu
  (`.menu-shell`, "My Legacy"); `house.html` is the standalone production entry.
- Run the **Vite dev server**, not `preview` (the hook is DEV-only): `npm --prefix 'main game' run dev`
  (`vite --host 0.0.0.0`; port 5173 in `main game/vite.config.ts`).
- Run the private village service: `node scripts/serve-private-village.mjs` serves the verified
  `private-assets/elderbloom/` on `http://127.0.0.1:4188/`. `scripts/configure-private-village.mjs` writes
  `main game/.env.development.local` with `VITE_ELDERBLOOM_PREVIEW_URL` and `VITE_ELDERBLOOM_POND_PROBES`; the dev
  build loads the model from the former (`LegacyLayer.tsx`).
- Assets: `gh release download elderbloom-village-2026-11-06 --repo mylife-as-miles/Crownfall`, then
  `npm run assets:village:verify` and `npm run assets:house:install` (house-ealdholt README).

**`tools/shoot.mjs`, step by step**:
1. It needs `out/ground.json`, from `node tools/ground.mjs`. That script serves `film/` and the GLB via
   `tools/server.mjs`, then loads `film/ground.html`, which calls `bakeGround()` from `film/src/world/ground.js`.
2. It builds jobs from `makeFilm(ground).at(t)`. `lookQuaternion(pos,target,roll)` uses three.js in Node.
   - Modes: all frames `--from 0 --to 899`; `--step 5` for a quick look; `--times 2,6.5` → `tNN.NN.png`; or
     `--scout scout.json` → `[{name,p,t,fov,minute,focus?,roll?,near?,cloud?}]`.
   - It resumes by skipping files that exist. The first pending frame is treated as a cut.
3. It launches Playwright Chromium (`headless: true, channel: 'chromium'`) with
   `--use-angle=d3d11 --ignore-gpu-blocklist --enable-gpu --mute-audio` (a Windows GPU path). Viewport is `--size`
   (default 1920x1080) and `deviceScaleFactor` is `--ss`.
   - **No SwiftShader flags exist anywhere in the repo.** On a GPU-less Linux box you would have to edit these args,
     e.g. `--use-angle=swiftshader --enable-unsafe-swiftshader`. Expect it to be very slow with a 166 MiB village
     **(inference)**.
4. An init script presets localStorage so the game's own films do not play (`crownfall.opening.seen`,
   `crownfall.legacy.ealdholt-opening.seen.v1`) and pins `crownfall.main-game.preferences` = `{quality:'high',
   automaticGraphics:false, renderScale:100, frameLimit:0, motion:true}`.
5. It opens `${CROWNFALL_URL}?ealdholtFilm=1` and waits for `.menu-shell` and for `.loading-screen` to detach. It
   presses Escape until `data-opening-film` is closed and `data-boot-state=ready`. It clicks the Home tab, then the
   "My Legacy" button. It waits up to 12 min for `.ealdholt-preview[data-ealdholt-world]` to read `ready` (or `error`).
6. It injects CSS so only `.ealdholt-world canvas` is visible and the cursor is hidden. It calls `take()` and stores a
   token on `window`. After every frame, `alive()` checks that the token, the hook and `presented` are still there. A
   reloaded page (Vite HMR after sleep or a source edit) or a PNG under 60 KB aborts the shoot. On failure it writes
   `shoot-error.png`.
7. Clock per frame (`DAY = 1440`: the film's morning is the village's second day): `skyMinute = 1440 + minuteAt(t)`,
   `seconds = 100 + t`, `residentMilliseconds = residentStart + t·1000` with `residentStart = (1440 + 400 −
   initialDayMinute) × msPerWorldMinute` (villagers from 06:40), sky `{weather:'clear', cloudCoverage: 0.34,
   windStrength: 0.22}`; then `pose(p, q, fov, focus, near)`.
8. **Settling**: `settle(minRenders, minMs, maxMs)` polls `state()` every 60 ms. It returns once
   `renders ≥ r0 + minRenders` **and** `elapsed ≥ minMs` **and** `!observationPending`, or when `maxMs` passes.

   | Frame kind | minRenders | minMs | maxMs |
   |---|---|---|---|
   | cut (lets detail and shadows stream in) | 8 | 7000 (9000 for scout or `--times`) | 40000 |
   | `--step` jump | 3 | 1500 | 20000 |
   | normal frame | 2 | 0 | 8000 |

   It then calls `page.screenshot()`, which captures the page, not `toDataURL`.
9. **Motion blur**: `--blur run:4,canopy:4,swoop:2,flyby:2` sets subframes per shot. Subframe k is shot at
   `t + (k/n)·0.5/30` (a half-open shutter), clamped to `shot.t1 − 1e-4` so it never looks across a cut. Files are
   `fNNNNN_k.png`. With `--step > 1`, blur is off.
10. Other options: `--battery N` (Windows only; exit code 3, then resume). The PowerShell output is split with `/s+/`
    rather than `/\s+/`, so the check probably never fires **(inference from code)**.

**The title**: `node tools/title.mjs [--out out/title] [--times 26,27.5]`. It renders `tools/title.html`
(`window.TITLE.build()` / `draw(ctx,t)`, Cinzel from `fonts/fonts.css`) to transparent `tNNNNN.png` files, from frame
⌈T0·30−1⌉ to 899. `title.html?t=27` previews one moment in a browser.

**`tools/finish.mjs`** (`[--frames out/shoot] [--title out/title] [--mix out/mix.wav] [--size 1280x720]`):
- For each of the 900 frames it copies `fNNNNN.png` or averages its subframes (ffmpeg `mix=inputs=n:normalize=1`),
  lanczos-scaled to `--size`, into `out/frames/` (incremental by mtime and size). It checks the title frames run to 899.
- Audio: `out/mix.wav`, else the committed `audio/ealdholt-opening-mix.m4a`, else silent `anullsrc`.
- Master: 1.6 s fade in from black; the title overlaid at `PTS+first/30`; libx264 slow CRF 15; BT.709 tags; AAC 256k
  48 kHz; `-t 30`; faststart.
- Game cut: scaled to 1280×720, CRF 26, `-maxrate 4200k -bufsize 8400k -tune film`, AAC 160k.

**`tools/install_in_game.mjs`** (`[--game <Crownfall checkout>] [--cut out/game/...mp4]`):
copies the cut to `main game/public/video/crownfall-ealdholt-opening.mp4` and replaces the old SHA-256 and byte count
(plain and en-US grouped) in `provenance.json`, `SOURCES.md` and `shared/menu/opening-film.ts`. Soundtrack wording is
edited by hand; the Quest copy comes from the game's own asset sync (`npm run build` / `check:sync`).

## 3. Every tool, by folder

### claude-game/crownfall-ealdholt-opening/tools/ (README "Watch and build", run from the folder after `npm install`)

| File | Purpose | Invocation |
|---|---|---|
| `ground.mjs` | Bake village ground heights and pond level → `out/ground.json` | `node tools/ground.mjs` |
| `server.mjs` | Static server: `film/`, `node_modules/` and `/village.glb` (from `EALDHOLT_VILLAGE_GLB` or the Windows default) | `node tools/server.mjs [port=5177]`; also imported by `ground.mjs` |
| `shoot.mjs` | Drive the game hook and capture frames (§2) | `node tools/shoot.mjs --out out/look --step 5` · `node tools/shoot.mjs --out out/shoot --blur run:4,canopy:4,swoop:2,flyby:2` · `--times …` · `--scout scout.json` · `--from/--to/--size/--ss/--battery` |
| `sheet.mjs` | Labelled contact sheet (ffmpeg xstack) | `node tools/sheet.mjs out/look out/look.jpg --cols 8 --w 320` |
| `title.html` / `title.mjs` | Forged-gold title layer, transparent frames | `node tools/title.mjs` |
| `finish.mjs` | Average subframes, overlay title, add sound, encode master and game cut | `node tools/finish.mjs` |
| `install_in_game.mjs` | Copy the cut into the game and update size/hash records | `node tools/install_in_game.mjs` |
| `stable_sfx.py` | Stable Audio SFX via Soundbox → `audio/sfx_sa/<id>.wav` + `plan.json` | `python tools/stable_sfx.py [--only L01_night_air,L10_bell] [--force]` |
| `listen_sfx.py` | earshot check, auto re-take of failures | `<earshot venv>/bin/python tools/listen_sfx.py [--only …] [--tries 3] [--check-only] [--recheck] [--improve]`; one take: `--only L03_launch --prompt "…" [--seed] [--dur]` |
| `music.py` | Music candidates (one per seed) plus a loudness-shape table | `python tools/music.py [--only 601,603] [--force]` |
| `mix.py` | Place music and SFX, two-pass loudnorm | `python tools/mix.py` → `out/mix.wav`, `audio/ealdholt-opening-mix.m4a` |

### claude-game/crownfall-intro/tools/

| File | Purpose | Invocation |
|---|---|---|
| `film.js` | Shared Playwright opener (`open({subs,scene})`, `flags`) | module |
| `frame.js` | One frame and its draw time | `node tools/frame.js 27.5 out/a.png [--subs] [--scene N]` |
| `strip.js` | Contact sheet (from, to, step, out, cols) | `node tools/strip.js 9 38 2 out/s1.png 5 --scene 1` |
| `perf.js` | Warm-cache frame times | `node tools/perf.js <t1> <t2> … [--scene N]` |
| `export.js` | Parallel render → MP4 + mix | `node tools/export.js out/crownfall-intro.mp4 --workers 4 [--subs] [--from] [--to] [--scale] [--no-audio]` |
| `build_timeline.js` | Narration takes → `film/timeline.js`, `cues.vtt`, `placement.json` | `node tools/build_timeline.js [working\|final]` |
| `narrate_kokoro.py` | Local working voice | `python tools/narrate_kokoro.py <kokoro-v1.0.onnx> <voices-v1.0.bin> [--voice bm_lewis] [--speed] [--set working]` |
| `narrate_elevenlabs.py` | Final voice | `python tools/narrate_elevenlabs.py voices` · `… <voice_id> [--model eleven_multilingual_v2] [--only L01] [--stability 0.5] [--tempo]` · `--reprocess [--tempo 1.06]` |
| `mix.py` | Music under voice with ducking, SFX, −16 LUFS | `python tools/mix.py [working\|final]` |
| `sfx.py` | Code-made numpy SFX (shipped in the game cut) | `python tools/sfx.py` → `audio/sfx/*.wav` |
| `stable_sfx.py` | Stable Audio SFX (defaults `/home/user/tools/...`) | `python3 tools/stable_sfx.py [--only E05_tear] [--force]` |
| `listen_sfx.py` | earshot check and re-take, with `RETRY` prompt ladders | `<earshot-venv>/bin/python tools/listen_sfx.py [--check-only]` |
| `game_cut.sh` | The two 720p game files | `tools/game_cut.sh <video-1080p.mp4> <approved-delivery.mp4> <out-dir>` |
| `trace_map.py` | Creator's map PNG → `film/mapdata.js` (numpy, pillow, scikit-image) | `python tools/trace_map.py <coloured-layout.png> [debug-dir]` |
| `clean_worldmap.py` | One-off: inpaint the gold rings, re-letter labels in Cinzel (OpenCV) | `python tools/clean_worldmap.py <map.jpg> <out.jpg> <Cinzel[wght].ttf> <preview.jpg>` |
| `map_demo.js` / `kit_demo.js` | Look at the map and the kit pieces | `node tools/map_demo.js [out.png] [cx cy zoom]` · `node tools/kit_demo.js [out.png]` |

### claude-game/crownfall-prologue/tools/
`frame.js`, `strip.js`, `perf.js`, `export.js`, `stable_sfx.py` and `listen_sfx.py` match the intro's (`perf.js` and
`listen_sfx.py` byte-identical; `export.js` uses CRF 19 and `prologue-mix.m4a`). Differences:
- `film.js` adds `--paint` and treats `--scene 0` as valid.
- `build_timeline.js [final]` adds speakers, the scene 0 title, the chapter card and VTT voice tags.
- `narrate_elevenlabs.py`: `python tools/narrate_elevenlabs.py voices` ·
  `… record [--model eleven_v4] [--only C02,L01] [--tempo 1.06]` · `--reprocess [--tempo 1.06]`.
- `mix.py [final]` has four music tracks and the reverb on the "voice" speaker.
- LOOK.md workflow: `node tools/frame.js 152.0 out/s3a.png --scene 3` · `node tools/strip.js 132 164 2 out/s3.png 4
  --scene 3` · `node tools/frame.js 152.0 out/s3s.png --subs`.

### claude-game/crownfall-credits/tools/ and claude-game/crownfall-arena-skies/tools/
- Credits: `film.js` (opener module) · `node tools/frame.js 23 out/title.png` · `node tools/strip.js 0 30 2
  out/open.png 5` · `node tools/export.js out/crownfall-credits.mp4 --workers 3 [--from] [--to] [--scale] [--no-audio]`
  · `node tools/build_data.js [credits/credits-data.json]`.
- Skies: `node tools/export.js [out dir] [--only eclipse|violet]`; `open film/index.html` views both skies.

## 4. Shared patterns, the Stable Audio pipeline, and gotchas

**What a "game video" pipeline looks like here**:
- A deterministic `renderAt(t)` or per-frame pose drives every frame.
- Headless Playwright Chromium captures the frames (canvas `toDataURL`, or a page screenshot for the game).
- ffmpeg does the rest: encode, contact sheets, averaging, overlay, mux.
- The sound is planned in JSON on the film's own clock (`audio/sfx_plan.json`) and mixed in numpy/ffmpeg to −16 LUFS.
- A 1080p master is cut down to a 720p game file (faststart, H.264, AAC 160k).
- Bytes and SHA-256 are recorded in the game repo (`provenance.json`, `SOURCES.md`, the TS registry). Each README has
  a "Sources" credits section with licences.
- Look and doctrine live in `LOOK.md`. Review is by `frame`/`strip`/`sheet` stills before a full render.

**Stable Audio via Soundbox + audio.cpp, on CPU** (`tools/stable_sfx.py`; the ealdholt copy is the most general):
- Each sound runs `node $SOUNDBOX_CLI run audiocpp-stable-audio-3-sfx "<prompt>" --duration <dur> --seed <seed>
  --out take.wav`. Soundbox defaults are 8 steps and guidance 1.0. The model is q8_0 GGUF.
  - audio.cpp writes 44.1 kHz 16-bit and generates 6 s past the asked duration, then truncates.
  - `music.py` passes `model='audiocpp-stable-audio-3-small-music'` and `trim=False`.
- **Finish**:
  - Resample to 48 kHz with soxr.
  - Onset trim: the first 1 ms frame within 40 dB of the peak, held in 3 of 10 frames, cut 3 ms early, with a 2 ms
    de-click.
  - Peak-normalise to −1 dBFS, apply a 0.15 s raised-cosine fade-out, write 24-bit WAV.
  - Near-silent takes (< −70 dBFS) are rejected. Clipped samples are counted.
- **Records**: `audio/sfx_sa/plan.json` holds the model, licence, engine, and per-sound prompt, seed, duration, trim
  and gain. It flags `differs_from_sfx_plan`.
- **Plan entries**: `{id, prompt, dur, seed, at, gain|level, in, out, peak?, check, not}`. Ealdholt uses absolute `at`
  and `peak` (the loudest 50 ms lands at `peak`). Intro and prologue use structural `at` and `level` against the voice.
- **Prompt style**: concrete texture and space ("a fast airy whoosh, a sudden rush of air passing close, short, no
  impact"), with a duration of 2–11 s and one seed per sound. Retakes move the seed by +1000 or follow a hand-written
  `RETRY` ladder.
- **Env var names**: `CINES_TOOLS` (ealdholt), `SOUNDBOX_CLI`, `SOUNDBOX_AUDIOCPP_BIN`, `SOUNDBOX_DATA_DIR` (default
  `~/.soundbox`). Installing the runtime is `npx soundbox model install audiocpp`.
- **On this machine** (observed, not in docs): `SOUNDBOX_CLI=/home/user/hamsanders/soundbox/server/dist/cli.js`,
  `SOUNDBOX_AUDIOCPP_BIN=/home/user/0xshug0/audio.cpp/build/linux-cpu-release/bin/audiocpp_cli`, earshot venv
  `/home/user/leonxlnx/earshot/.venv/bin/python`. `~/.soundbox/models/audiocpp/` holds only the **SFX** GGUF (1.6 GB);
  the Music weights are not present. The intro default `/home/user/tools` does not exist.
- **earshot** (`listen_sfx.py`): earshot 0.4.1 uses CLAP `laion/larger_clap_general` and the AudioSet AST tagger.
  `api.describe` runs, then `api.match(check, alts=not)`.
  - Pass rule: the check beats every alternative in the forced choice **and** is z ≥ 3 ("strong"), or has ≥ 60% of
    the choice and twice the best alternative.
  - Kept retakes rewrite their line in `sfx_plan.json`. Every take is logged in `audio/sfx_sa/check.json`.
  - A failed check is not a veto: intro and prologue ship with some failures, and the ear decides.

**Gotchas recorded in docs and code**:
- "**no music**" in a prompt tends to *bring music in*, because the text encoder ignores negation. Describe the texture
  instead (`listen_sfx.py` comment).
- Soundbox prompts before a 1.7 GB weight download. With stdin closed it declines, so install the weights first.
- `np.convolve` with a 24,000-tap window took half an hour per take on CPU, so `music.py` uses running sums.
- **The creator wants few, quiet effects**: 33 was "too many and too loud". The prologue and Ealdholt sit at −11 to −24
  dB, and the shipped intro used the code sounds.
- The intro's default ElevenLabs model is `eleven_multilingual_v2`, but the final used `eleven_v4` and `--tempo 1.06`.
  Pass these flags explicitly.
- `game_cut.sh` hard-codes the title join at 7.9 s and 221.0 s. Re-check them against `film/timeline.js` after any
  re-time.
- Canvas films: determinism, cue keying and the performance budgets are covered in §1.1.
- The in-engine shoot:
  - Do not edit the game's source or let the machine sleep during a shoot; a dev reload aborts it.
  - Cuts need about 7–9 s for detail and shadows to settle.
  - A changed camera path must be checked at `--step 5` for clipping.
- Contradictions to resolve before reuse:
  - LOOK says "the shoot supersamples to calm" foliage sparkle; the README says `--ss 1.5` was **not used** (the
    720p game cut already downscales).
  - Hours differ slightly between LOOK, README and `minuteAt` (05:50–06:18 / 07:06–07:33 in code). The code wins.
  - `TIMES.title` is 25.3, but `title.html` `T0` is 24.8, and the title frames start there.
  - `music.py`'s docstring is stale ("bloom at 6.0 s", and a `tools/listen_music.py` that does not exist).
  - The README sound section and its `pick.json` example are stale.
- Windows defaults are hard-coded and need env vars or flags on Linux: `PLAYWRIGHT_FROM` (default
  `C:/Users/MILES/Documents/Crownfall/main game/package.json`), `EALDHOLT_VILLAGE_GLB`, `install_in_game --game`,
  `CINES_TOOLS`, and the `--use-angle=d3d11` launch args.
- Playwright resolution: the intro, prologue, credits and skies tools call a bare `require('playwright')`, and those
  folders have no `package.json`. Playwright must be resolvable, for example via `NODE_PATH` **(inference)**.
- Licences: the Elderbloom model is Fab Standard License with NoAI. Never commit `*.glb` (the ealdholt `.gitignore`
  excludes it, and `out/` with the baked ground), and **never send its frames to a generative service**. first-bloom
  has no code licence, so its author's permission is still to confirm before shipping. Stable Audio weights: Stability
  AI Community License, free under USD 1M revenue. The creator's reference maps and images stay out of the repo.

## 5. Checklist: a new game trailer or in-engine film

1. **Brief and doctrine**: write `<slug>/README.md` (purpose, the film table, watch/build commands, sources) and
   `LOOK.md` (the idea, rules, palette, known limits). Copy the structure of `claude-game/crownfall-ealdholt-opening/LOOK.md`
   (in-engine) or `claude-game/crownfall-intro/LOOK.md` (painted, with scene briefs).
2. **Shot list on one clock**: one source of timing. For in-engine films, copy
   `crownfall-ealdholt-opening/film/src/world/timeline.js` (`TIMES`, `SHOTS`, `shotAt`, `minuteAt`, `makeFilm().at`)
   and `layout.js`. For narrated films, copy `script.json` and `tools/build_timeline.js` so the voice sets the clock.
   Put the sound clock (key moments in seconds) in the README.
3. **Choose the capture method**:
   - **In-engine hook**: best when the film should be the game's picture. You need a DEV-only hook in the game like
     `__ealdholtFilm`, gated by `import.meta.env.DEV && ?<name>Film=1`: `take` (takes the camera, freezes controls,
     swaps in a film clock), `pose(p, quat, fov, focus, near)` (marks shadows dirty), `clock({sky minute, anim
     seconds, sim ms, weather})`, `state()` (render count and pending work) and `render()`. Copy `tools/shoot.mjs`, `finish.mjs`, `sheet.mjs`, `title.html`/`title.mjs`, `install_in_game.mjs`, plus
     `ground.mjs`/`server.mjs` if the camera needs terrain, and `film/src/world/*`. Edit the selectors, the
     localStorage presets, the launch args (SwiftShader on Linux) and the frame count and fps. Shoot `--step 5` →
     `sheet.mjs` → fix the path → full shoot with `--blur` on fast shots.
   - **Painted in code**: best for openings, prologues, cards and stills. Copy the `crownfall-intro` skeleton
     (`film/kit.js`, `intro.js` with the FILM API, `headless.html`, `index.html`, `scenes/sN.js`; `tools/film.js`,
     `frame.js`, `strip.js`, `perf.js`, `export.js`). For credits, copy `crownfall-credits` (`build_data.js`, recorded
     data only). For still textures, copy `crownfall-arena-skies` (seamless wrap noise, `export.js` printing SHA-256).
   - **Screen capture of normal gameplay**: none of the five used it, so there is no tool here. **(inference)** Use the
     Playwright launch and localStorage presets from `shoot.mjs` with `page.screenshot` or `recordVideo`. Prefer a hook
     for anything that needs frame accuracy.
4. **Narration** (optional):
   - Write `narration/script.json` (ids, `say`, `pause`, `cut`, `speaker`, and a `voices` map for a cast).
   - Kokoro working takes (`narrate_kokoro.py`) → `build_timeline.js working` → scenes keyed to `K.cue` → ElevenLabs
     final takes (`narrate_elevenlabs.py`, prologue version for several voices) → `build_timeline.js final`.
   - The ElevenLabs key comes through a network secret for `api.elevenlabs.io`. If none exists, request a credential;
     never paste the key. Gemini TTS and Lyria tools exist in `claude-film/` (`GEMINI_API_KEY`/`GOOGLE_API_KEY`).
5. **Music**:
   - The creator's own tracks (`audio/*.mp3`, SHA-256 matched to the game's copies), placed and handed over in
     `mix.py`.
   - Or Stable Audio Music: copy `tools/music.py`, write a `music` block in the plan (prompt, dur, 4 seeds, check/not),
     generate, read the shape table, and pick a take by its shape against the picture → `audio/music/pick.json`.
6. **SFX**:
   - Copy ealdholt `tools/stable_sfx.py` and `listen_sfx.py` (env-configurable).
   - Write `audio/sfx_plan.json`: few and quiet, concrete prompts with no negations, a `check` and `not` list per
     sound.
   - Run `python tools/stable_sfx.py`, then `<earshot venv>/bin/python tools/listen_sfx.py`. Commit `audio/sfx_sa/`
     with its `plan.json` and `check.json`.
7. **Mix**:
   - No voice: ealdholt `tools/mix.py` (place, fade, `peak` alignment, two-pass linear loudnorm to **−16 LUFS, TP −1
     dBTP**, LRA 14).
   - With voice: intro or prologue `tools/mix.py` (duck −19 dB under the voice, dips under loud SFX, weights 1/1.25/1,
     `loudnorm I=-16:TP=-1.5:LRA=11`).
   - Output `audio/<slug>-mix.m4a` (AAC 192k) and commit it, so the picture machine can pick it up.
8. **Deliverables**:
   - Master: 1080p H.264 (CRF 15–17), BT.709, AAC 256k, faststart.
   - Game cut: 1280×720 H.264 (CRF 26 capped at 4.2 Mbit/s, as ealdholt; or CRF 28, as the intro), AAC 160k,
     faststart, at the film's own fps (24 painted, 30 in-engine).
   - Stills: WebP q0.9 plus a preview JPG.
   - Install into `<game>/main game/public/video/` (or the asset's folder) and update the size and SHA-256 in
     `provenance.json`, `SOURCES.md` and the TS registry (`install_in_game.mjs` does this for videos).
   - Credit sounds, voices, fonts, models and borrowed code with licences in the README "Sources".

## 6. Shooting a built game without a GPU (House Ealdholt trailer, November 2026)

What happened when a 75 s gameplay trailer of House Ealdholt was wanted fast, for a hackathon (NEAR, "games with real economies"), in this container:

- **The film hook is DEV-only.** A production build (`npm run build`, then `vite preview`) has no `window.__ealdholtFilm`. Either run the Vite dev server (`npm --prefix 'main game' run dev`) with the private village service, or build with a **local, never-pushed** patch that drops the `import.meta.env.DEV &&` gate (and, for raids, give the film's observer link a `raid` function so the film can stage torches and fire). Restore the file afterwards.
- **Software WebGL is very slow**: Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` loaded the 174 MB Elderbloom village in about 3 minutes and then rendered at about 1.5 fps (4 cores). Playwright's `page.screenshot()` timed out at that rate; CDP `Page.captureScreenshot` (via `page.context().newCDPSession(page)`) worked. The page is ready when the loading percentage disappears from the body text.
- So real-time capture is impossible here; **frame-by-frame capture is the only way to smooth footage**: the hook's `clock()` sets the film time per frame and `pose()` the camera, then wait for `state()` to settle and capture (24 frames a second of film at a few seconds each: about 1,800 frames for 75 s, an hour or more of capture). Alternatively override `requestAnimationFrame`, `performance.now` and `Date.now` with an init script that advances 1/24 s per captured frame (virtual time) for parts of the UI that animate on their own.
- **Under a hard deadline, a stills trailer** (game screenshots at 1280×720 with slow zoompan moves, 0.6 s crossfades, Barlow titles from the game's own fonts, the game's soundtrack, a George narration from ElevenLabs, ducked and levelled to −14 LUFS) shipped in time; the author then asked for real moving footage, which the frame-by-frame route above provides. Say plainly which you are making.
- **Hide the HUD with injected CSS** for cinematic shots, keep it for interface beats (the market panel, the NEAR testnet tab); UI text found by exact match fails when CSS uppercases it — select by `data-` attributes (`data-ealdholt-view`, `data-ealdholt-tool`) or case-insensitive text.
- **Private assets**: the Elderbloom village comes from the private Crownfall release (`gh api repos/mylife-as-miles/Crownfall/releases/...` with `Accept: application/octet-stream`); its licence (Fab Standard, NoAI) allows the author's frame review but forbids sending frames to generative services and redistributing the files. Never commit the GLB, the built `dist/` or captured frames that would let someone rebuild it; deliver the finished video to the author.

## 7. Craft from outside

From the external libraries in `external.md` (MIT unless noted):

- **Deterministic capture rules** (MengTo `making-of-film`, `game-dev-combat-skill-polish`): every video frame is one game tick on a fake or stepped clock; CSS animations paused and seeked to their age; menus driven by page events and test hooks, not clicks timed by sleep; abort on console or shader errors; never edit served source during a shoot (the dev server reloads). Plates: the game renders its own world with the camera flown through the hook, player hidden, enemies cleared, HUD off, one eased move per plate.
- **Camera direction** (scottstts three.js `threejs-camera-direction`): write a camera contract per shot (subject, scale, fov/near/far, who owns the camera); derive offsets from the subject's size, not fixed distances; **a handoff uses one interpolation stage only** — `eased = 1 − (1 − t)^1.8`, lerp the position and slerp the orientation, with no follow smoother stacked on top (stacked smoothing makes a half-halt mid-move), and copy the exact pose at the end; frame-rate-independent smoothing `α = 1 − exp(−λ·dt)`; each cinematic shot saves and restores the fov, near and far it changes.
- **Authored routes** (MengTo `3d-virtual-tour`): timed Hermite keys of position, gaze and fov; arc-length sampling where speed must be even; keys before, inside and after doorways; check the whole interpolated path for clearance; one controller writes the camera once per frame; derive doors, captions and exposure from the route coordinate so seeking gives the right world.
- **Image pipeline order** for WebGL beauty shots (three.js `threejs-image-pipeline`, `threejs-exposure-color-grading`, `threejs-bloom`): scene HDR → screen-space lighting → atmosphere and transparency → bloom (in HDR, before tone mapping) → exposure → tone map once → grade/LUT → lens and film effects → output. For an offline render, pin exposure to the film clock. Film-stage finishing: highlight desaturation ≤ 0.15, vignette ≤ 0.11, fine drifting grain.
- **Visual validation** (three.js `threejs-visual-validation`): before tuning, write what must stay true and observable ("the rim stays visible without bloom"); freeze seed, camera, viewport, pixel ratio and time; capture a design view, a near and a far view, and a no-post baseline; judge temporal artefacts from clips, never stills.
- **A construction reveal** for titles and trailers (MengTo `threejs-towers`): a clipping plane rising through a building (with `clipShadows`, or the shadow builds early), a cap mesh at the cut, scaffolding that ignores the clip and stands one step ahead; four to five seconds with a sound per stage.
- **Trailer grammar for feeds** (anyscene `breakdown/trailer.py`): few words, big and bold, on cards between the footage rather than over it; a hero loop that crossfades the last shot into the first; check every part for black or frozen frames.
- **Set dressing that holds up in a hero shot**: the three.js pack's sky, cloud, ocean, water and vegetation skills (link only; several need WebGPU and a real GPU; three examples are GPL-3.0 — do not copy those).
- **Engine handoff**: anyscene bakes camera shots per frame to Unreal (axis and unit conversion, a same-camera wipe to verify). Windows and UE 5.8 specific: read it there, adapt only the conventions.
