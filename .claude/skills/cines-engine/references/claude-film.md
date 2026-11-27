# Claude Film: animated shorts made in code

The production method of *One Too Many*, *Autopilot* and *Long Distance*, written from their files so the next film can start where they ended. Read §7 first if you are starting a film; read §1–6 for how and why. Sound has its own shared reference (`sound.md`); this file keeps the film-specific parts.

Contents: 1 Phases and documents · 2 Engine · 3 Tools · 4 Sound in the films · 5 Subtitles, titles, thumbnails, cuts, player · 6 QA and lessons · 7 Start a new film · 8 Craft from outside

How *One Too Many* (`claude-film/one-too-many/`, 14:54, 12 sequences, 249 dialogue lines) *Autopilot* (`claude-film/autopilot/`, 11:27 director's cut + 10:26 YouTube cut, 12 sequences, 52 lines) and *Long Distance* (`claude-film/long-distance/`, 8:37, 11 sequences, 27 lines; §6 has what it added) were made entirely in code: HTML/Canvas 2D style frames, a deterministic JS film engine, Playwright frame capture piped to ffmpeg, generated or recorded sound, TTS voice-over, a Lyria score, an offline mix, a one-page web player, cuts and thumbnails. All paths are from the repo root (`/home/user/cines-engine`). Commands run from the film folder (`cd claude-film/<film>`). "(inferred)" marks things not stated in the files.

Sources read: both READMEs, `claude-film/one-too-many/KIT.md`, both `film/FILM.md`, `claude-film/autopilot/design/*.md`, both `audio/README.md` + `CREDITS.md`, every file in both `tools/`, both `film/engine.js` and `load.js`, `audio/*.json`, `cuts/youtube.json`, the git history (`git log --all`, commits "Autopilot: …", 5–7 Nov 2026), and the external tools installed under `/home/user/` (earshot, opus-sound-layer, Soundbox, audio.cpp).

---

## 1. Phases, in order, and the document written at each

*Autopilot* followed this order (taken from its commit history). *One Too Many* did the same steps with JSON design files instead of `DECISIONS.md`/`SEQUENCES.md`.

| # | Phase | What happens | Files written |
|---|---|---|---|
| 0 | Script | The screenplay is transcribed verbatim, then parsed into numbered elements. Nothing on screen is ever retyped. | `design/screenplay.txt`; `tools/parse_script.py` → `film/script.json` + `film/script.js` (`window.FILM_SCRIPT`: `S##` scenes, `A###` action, `L###` dialogue with `speaker`, `ext` such as `V.O.`, and `text`) |
| 1 | Looks brief | One shared brief for 3 candidate looks. It sets the non-negotiables (restraint, verbatim, craft, code only, deterministic) and the **same three moments** every look must draw, so the looks can be compared. | `claude-film/autopilot/design/LOOKS_BRIEF.md` (sections: logline + engine of the film; Non-negotiable; The three moments; Characters; Technical; The three looks A/B/C) |
| 2 | Voices early | V.O. is voiced before the engine exists, because each take's length fixes subtitle holds and beat timing. The author auditions 4 voices by ear. | `audio/vo/script_vo.json` (id, scene, text, style), `audio/vo/V##.wav`, `audio/radio/`, `audio/voice_map.json`, `audio/voice.js` |
| 3 | Looks / style frames | Three agents work in parallel, one per look. Each writes its own helper kit and draws 3 frames, critiquing each frame for at least 3 rounds. Then a comparison board. | `kit/look_{a,b,c}.js`, `src/{A,B,C}{1,2,3}_*.html` → `frames/*.jpg`, `design/look_{a,b,c}.md` (name + pitch, palette hex, colour script across the day, characters, time stamps/V.O., how the absence is carried, the hard frame, cost to build), `src/BOARD_looks.html` → `frames/BOARD_looks.jpg` |
| 4 | Decisions with the author | The author picks a look (C, with 3 changes: no letterbox, no slate, in-picture subtitles). Every later author call is appended here. | `claude-film/autopilot/design/DECISIONS.md` |
| 5 | Engine + plan | The previous film's engine and tools are ported. Then the contract and the shot-by-shot plan are written. | `film/engine.js`, `film/load.js`, `film/index.html`, `film/headless.html`, `film/settest.html`, `film/sound.js`, `tools/*`, `film/FILM.md`, `design/SEQUENCES.md` |
| 6 | Rig + sets ("phase 1") | Characters and environments, each with demo frames and an API doc for the sequence authors. | `film/rig.js` + `film/api/rig.md`; `film/sets/<set>.js` + `film/api/<set>.md` (views, anchors, state keys, cams, perf numbers, caveats) |
| 6b | Sound plan (in parallel) | The effects generation plan, then the score plan and its Lyria takes, made while sets and sequences are built. | `audio/gen_plan.json`, `audio/score_plan.json`, `audio/score/M##.{mp3,json}` |
| 7 | Sequences | Q01–Q12, in story order, from `SEQUENCES.md`. Each declares its own sound by name. | `film/seq/QNN_slug.js` (listed in `film/load.js` `FILM_SEQUENCES`) |
| 8 | Sound build | Cue sheet dump → name→sound map → generated/synth/CC0 sounds → score placement → mix → mux → QA. | `out/cuesheet.json`, `audio/sound_map.json`, `audio/kit/*.flac`, `audio/synth/*.wav`, `audio/cues.json`, `audio/README.md`, `audio/CREDITS.md` |
| 9 | Export | Picture only (`--no-audio`), then the final mix muxed over it. | `out/autopilot_picture.mp4` → `out/autopilot.mp4` |
| 10 | Player | One self-contained page, plus the mix as an MP3 beside it. | `player/autopilot.html`, `player/autopilot.mp3` |
| 11 | Thumbnails | Several rounds drawn from the film's own frames by the engine. The author picks. | `src/THUMB_youtube*.html` → `frames/THUMB_youtube_*.jpg` (1280×720) |
| 12 | Review revisions | After the review the author cut the last line ("Autopilot disengaged.") and asked for the refrain to be re-voiced. Three takes were ranked by earshot. The tail was re-rendered and spliced at a keyframe, and the mix rebuilt. | `audio/vo/refrain_v2.json`, `DECISIONS.md` updated |
| 13 | Other cuts | An edit list of removed spans, each with its reason. The picture is cut frame-exactly and the soundtrack is rebuilt on the new clock. | `cuts/youtube.json`, `tools/youtube_cut.py` |

*One Too Many*'s design trail, all in `claude-film/one-too-many/design/`:
- `proposals.json`: 3 pitches (name, one_line_pitch, influences, rendering_technique, palette, colour_arc, typography, characters, the_extra, camera_and_editing, intensity_devices, key_sequences).
- `judges.json`: 3 independent judges scoring story fit, intensity, buildability, dialogue design and originality, with a winner, grafts and must_fix. Negative Space won 125.5 to 113 and 107, and the author confirmed it.
- `final_spec.json`: the synthesised spec, including a 45-beat `beat_map` with start_sec, intensity and visual.
- `negative_space.json`: the winning pitch in full.
- `sequence_briefs.json`: 12 `{key, file, prompt}` entries. These are the prompts handed to the per-sequence builders, listing beats, line ids, sets, letterbox, duration and intensity.
- `film_review.json`: three reviews merged into `bySeq` fixes (e.g. type raised from 18–26 px to 48 px on a 7:1 matte), per-sequence `gains` in dB, and a `summary`.

The losing looks were drawn as the same 3 moments in `alt-looks/` and compared on `frames/BOARD_three_looks.jpg`.

### Document skeletons (quote these structures)

**`design/DECISIONS.md`**: `# <Film>: decisions` / "Settled with the author, <name>." / a two-column table `| Decision | Choice |`. Autopilot's rows are Ending, Daniel's V.O., Radio presenter, Scene dialogue, Emily, Restraint, YouTube cut, Look, Frame, On-screen text, Subtitles, Title and Build. Each choice records the reason, any reversal ("The author first chose no end card, then asked for one") and the file that implements it.

**`design/SEQUENCES.md`**:
- Header paragraph: times are a plan, voiced starts are fixed, screenplay order is kept.
- The recorded take lengths (`L001 3.28, L002 8.20 …`).
- A master table `| Seq | Title | Dur | Scenes | Lines | Main sets |`.
- Then, per sequence, `## Q05 · The mirror (68 s) · S05, S06, A021–A027, L014–L019 · house (driveway), car`, one paragraph of colour/intent, a table `| t | Shot | Notes |` with line placements ("L001 at 12.0"), and a `Sound:` line naming every bed and cue.
- It ends with `## Sets and views (phase 1)` (`| Set | Views the sequences need |`) and `## Characters and poses (phase 1)`.

**`film/FILM.md`** (the engine contract):
- Title + "is code. `FILM.renderAt(t)` draws any instant … never use `Math.random` or `Date`".
- "Read these first, in order" (screenplay, DECISIONS, look doctrine, style frames + look kit, SEQUENCES).
- A file table.
- `## A sequence` (a code example), `### The draw context c`, `### Subtitles (lines)` (or `### Dialogue` in OTM), `### Sound (sound(S))` (bed and cue name lists), `### Sets`, `### Characters`, `## Story-wide rules` (restraint, verbatim, look grammar, colour script, accent colours, time stamps, on-screen text, cadence/shot lengths, acting, flash safety), `## Performance` (ms budget), `## Testing` (commands + definition of done).

**`claude-film/one-too-many/KIT.md`** (style doctrine + drawing API):
- Root and screenplay pointers.
- `## How to make a frame`: write `src/<ID>_<name>.html` from the skeleton, never edit `kit/`, render with `tools/shoot.js`, LOOK at the PNG and iterate at least 3 rounds.
- The HTML skeleton (`OTM.loadFonts`, `OTM.stage()`, `OTM.frame(ctx,{seed})`, draw into `f.world`, `f.finish({letterbox})`, `OTM.slate(...)`, `window.FRAME_READY = true`).
- `## API (globals on OTM)`.
- `## The doctrine (non-negotiable)`.

**`design/look_c.md`** (the chosen look's doctrine): Pitch, The grammar, Palette (hex table), Colour script, Characters, Time stamps and V.O., How Emily's absence is carried after the mirror, At the nursery door, Cost to build (scope, team, an 18-week schedule, budget).

---

## 2. Engine architecture

**Load order** (`claude-film/autopilot/film/load.js`): `kit/otm.js`, `kit/look_c.js`, `film/script.js`, `audio/voice.js`, `film/engine.js`, `film/sound.js`, `film/rig.js`, `film/sets/*.js` (`FILM_SETS`), fonts (`OTM.loadFonts('fonts/fonts.css')`), then every `film/seq/*.js` (`FILM_SEQUENCES`). `FILM_LOAD(base, only)` with `only=['Q05']` still loads every sequence (so `FILM.drawShot` can reach them for flash cuts) but puts only the listed ones on the timeline. OTM loads `kit/figures.js` and `kit/dialogue.js` instead of `look_c.js`, and `sfx_map.js`.

**Harness pages**: `film/index.html` is the dev player. `film/headless.html?only=Q05` is used by the tools: it sets `window.FILM_READY` and mounts a 1920×1080 canvas. `film/settest.html?set=kitchen` (or `?set=rig`) wraps a set's `demos` as a fake sequence with 4 s per demo.

**Timeline**: `FILM.seq({id, title, dur, setup(), lines:[…], sound(S){…}, shots:[{at, name, draw(c, st, lt), post, fade(st,dur)}], post})`. The film is the sequences back to back; `s.start` is computed on registration and `FILM.total` is the sum. A shot lasts until the next shot's `at`. `FILM.find(t)` returns the sequence; `FILM.renderAt(t, ctx)` clamps t, runs `setup` once, builds a pooled `OTM.frame`, fills black, calls `shot.draw(c, st, lt)` (errors become `FILM.warn`), draws lines in screen space, applies the finish (`f.finish`: grain, halation, vignette, plus OTM's fibre and letterbox), then the shot's `fade`.

**Draw context `c`**:
- Buffers: `c.g` is the 1920×1080 world. `c.em` is the quarter-res emissive buffer that drives halation (draw light sources into it in world coordinates).
- Times: `c.t` (global), `c.lt` (sequence-local), `st` (shot-local).
- Frame info: `c.frame = round(t*24)`, `c.shotDur`.
- `c.camera({x,y,zoom,rot,dx,dy})`: the world point goes to frame centre, applied to both `g` and `em`. `c.reset()` returns to screen space.
- `c.cache(key, fn, w, h)`: a persistent offscreen layer. LRU-evicted within a memory budget, `FILM.cacheBudgetPx = 72*W*H`, max 240 entries.
- `c.before` / `c.after` hook lists, and `c.post` overrides. Autopilot: `grain 0.05, halation 0.55, vig 0.4, vigColor #081011`, never a letterbox. OTM: per-sequence `letterbox: lt => ratio`.
- `c.flash` is true when the shot is drawn by another sequence's `FILM.drawShot(c, 'Q02', 26.5)`. Flash cuts reuse the morning's own images and are never redrawn.

**Time helpers**:
- `FILM.seg(t,a,b,ease)` (0..1, clamped) and `FILM.key(t, [[t0,v0],[t1,v1,'outCubic']])`, which interpolates numbers, arrays and objects and snaps strings at the midpoint.
- `FILM.twos(t)`: characters animate on twos (12 fps); camera, light, type and particles run on ones.
- `FILM.wob`, `FILM.shake(t, amp, hz, seed)` for seeded handheld.
- `FILM.ease.*`: OTM adds `hover`, `tidy` and `snap`; Autopilot adds `settle` and `weary`.

**Determinism**: never `Math.random` or `Date`. Use `OTM.rng(seed)` (mulberry32 over an FNV string hash), `OTM.vnoise` and `OTM.fbm`. Grain seed = `(frame % 8) + 1`. The exporter renders frame i at `t = i/24 + 1e-4`.

**Drawing kit** (`kit/otm.js` and `kit/figures.js` are byte-identical in both films; "Never edit", because parallel agents share them):
- `OTM.W/H` (1920×1080) and the palette `OTM.C`.
- The `OTM.S()` path builder (`.M .L .C .Q .Z .ellipse .circle .rect .capsule .poly`, transforms, `.path(rough, seed)` gives a Path2D with a hand-cut edge).
- Light and shadow: `lightPool` (posterised bands), `cone`, `dust`, `silhouette` (ink + rim crescent on the lit side), `castShadow`.
- `frame(ctx, {seed, pool})` returns `{world, emissive, holes, knockout(path, depth), knockoutText(...), finish(opts)}`.
- FX: `flame`, `embers`, `rain`. Type: `text`, `layout`, `knockBehind`. `slate` (style-frame labels), `loadFonts`, `stage`, `makeCanvas`.
- `kit/figures.js` (`OTM.fig`): `profile(id, pose)`, `top`, `bust`, `hand(pose)`, `drawDetails`, `ik2`; 1 unit = 1 head height.
- `kit/dialogue.js` (OTM only): `OTM.say(g, who, text, x, y, opts)`, eight kinetic type voices.
- `kit/look_c.js` (`LC`): palette `LC.P`, pinhole `LC.camera({x,y,z,pitch,f,cx,cy})` for true-perspective sets, `quad`, `stepGrad`, `beam`, `glare`, `specks`, `smudge`, `env`/`sampler`/`chrome` (environment-mapped reflections), `vignette`, `caption` (in-picture subtitles).
- `kit/look_a.js` and `kit/look_b.js` are the losing looks' kits.

**Characters**: `film/rig.js` (Autopilot `RIG`, 213 KB): `RIG.draw(g, who, pose, opts)`, `RIG.face`, `RIG.hand`, `RIG.key/mix`, presets `RIG.CHAR/FACES/ARM/GRIPS/INSERTS/MAT`, `RIG.demos`. Modes: silhouette, reflection, fogged glass. It returns `info` points (head, eyes, collar, hands…) for choreography. OTM's `film/rig.js` builds on `OTM.fig` (IK arm targets, rims, held objects).

**Sets** (Autopilot form): `SETS.kitchen = { views: { counter: { back(c,t,s), front(c,t,s), anchors, light } }, demos: [...] }`. Characters are drawn between `back` and `front`. `s.tod` is one of `dawn|morning|noon|afternoon|evening|dusk`. OTM sets have `anchors`, `light`, `cams` and `draw` (or `back`/`front`) plus `demos`. Every set gets a doc in `film/api/<set>.md`.

**Frame capture**: Playwright Chromium (the preinstalled one, at `/opt/node-tools/node_modules/playwright` on this machine). There is no CDP screencast. Each frame is `page.evaluate(t => { FILM.renderAt(t); return canvas.toDataURL('image/jpeg', 0.93) })`, then the base64 is piped into `ffmpeg -f image2pipe -c:v mjpeg -r 24 -i - -vf scale=W:H:flags=lanczos -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p`. There is one browser plus one encoder per worker (`--workers 3`) over contiguous frame ranges, and the segments are joined with `ffmpeg -f concat -c copy`. The engine's own soundtrack comes from `FILM.wav(i, 48000)`: OfflineAudioContext per sequence, concatenated. 24 fps, 1920×1080. The log shows about 3.4 fps per worker (`claude-film/autopilot/out/export_picture.log`), so 16,488 frames take about 27 min with 3 workers. Style frames use `tools/shoot.js` (`page.goto` → wait for `FRAME_READY` → screenshot PNG).

**Performance**:
- Budgets: under 60 ms/frame (OTM) and under 80 ms (Autopilot) in `tools/strip.js`, on a machine with no GPU.
- Cache static layers.
- Never use a full-frame `ctx.filter = blur()` per frame; blur once into a cache.
- The first draw of a new full-frame cached layer costs 35–45 ms, so draw layers whose key changes every few frames live.
- Never blit a large world-space cache under a rotated or scaled camera, which costs about 11 ms (`claude-film/one-too-many/film/api/table.md`).

---

## 3. Every tool

Run from `claude-film/<film>/`. Node tools share `tools/film.js` (`open(only)` launches Chromium, loads `film/headless.html`, waits for `FILM_READY`, collects page errors).

### In both films (`claude-film/one-too-many/tools/` and `claude-film/autopilot/tools/`)

| Tool | Purpose | Invocation |
|---|---|---|
| `shoot.js` | Render one HTML style frame to PNG; prints `ok` or the JS errors | `node tools/shoot.js src/C1_counter.html out/C1.png [w h waitMs]`; thumbnails: `node tools/shoot.js "src/THUMB_youtube2.html?v=c" frames/THUMB_youtube_c.png 1280 720 3000` |
| `film.js` | Shared headless page opener (module, not a CLI) | `require('./film').open(only)` |
| `strip.js` | Contact sheet of a sequence + ms/frame + warnings | `node tools/strip.js Q05 1 [out.png] [cols]` → `out/strip_Q05.png` |
| `frame.js` | One full-resolution frame | `node tools/frame.js Q05 45.6 out/q05.png` (`ALL` = global time) |
| `set.js` | A set's (or the rig's) demo sheet with render times | `node tools/set.js car 1`, `node tools/set.js rig 1` |
| `export.js` | Picture (and the engine's dev audio) to MP4 | `node tools/export.js out/autopilot_picture.mp4 --workers 3 --no-audio [--from s --to s --scale 0.5 --only Q01,Q02]` |
| `bundle.py` | Inline kit, engine, sets and sequences (and fonts) into one artifact-format page that plays the mixed MP3 as the clock | `python3 tools/bundle.py` → `out/player/<film>.html` |
| `lyria.py` | Generate each score cue in `audio/score_plan.json` with Lyria | `python3 tools/lyria.py [--only M01,M04b] [--dry-run] [--force]` |
| `score_check.py` | earshot description, vocal/drum tags, forced choice vs the brief, and librosa tuning offset per cue | `<earshot venv>/bin/python tools/score_check.py` → `audio/score/check.json` |
| `freesound.py` | Scrape Freesound search (CC0 filter) and download HQ previews + credit sidecars | `python3 tools/freesound.py QUERIES.json OUT_DIR [--n 5]` |
| `prep_sounds.py` | Cut and judge candidates with opus-sound-layer's `sfx.py`; draws sheets | `uv run tools/prep_sounds.py SFX_PY CAND_DIR OUT_DIR PLAN.json` |
| `trim_sound.py` | Trim a whole natural event (scream, laugh, chair drag) | `uv run tools/trim_sound.py SRC DST MAX [--start S] [--stereo]` |
| `make_loop.py` | Seamless ambience loop (equal-power crossfade, 40 Hz HP, -24 dBFS RMS) | `uv run tools/make_loop.py SRC DST START LEN [--xf 1.5] [--mono]` |

`freesound.py`, `prep_sounds.py`, `trim_sound.py` and `make_loop.py` were copied into Autopilot, but Freesound refused that machine, so they were not part of its build (inferred from `claude-film/autopilot/audio/README.md`; `audio/queries.json` holds the unused search plan).

### *One Too Many* only (`claude-film/one-too-many/tools/`)

| Tool | Purpose | Invocation |
|---|---|---|
| `audio.js` | Render one sequence's engine soundtrack; print per-second peak/RMS and missing sound names | `node tools/audio.js Q05 [out.wav]` |
| `lines.js` | Dialogue audit: every L001–L249 once, in order, right speaker | `node tools/lines.js` or `node tools/lines.js Q05 L050 L081` |
| `span.js` | Contact sheet in global time, or every sequence boundary | `node tools/span.js 0 900 6 out/film_overview.png`; `node tools/span.js bounds 3 0.5 out/film_bounds.png` |
| `score.js` | Dump every sequence's cues, beds, holes and ducks on the global clock | `node tools/score.js [out/score.json]` |
| `spot.js` | Music-spotting packs per sequence (timing, beds, holes, ducks, cues, lines) | `node tools/spot.js out/spot` |
| `stem.js` | Render the engine's bed stem (`SOUND.stem='bed'`) to one WAV | `node tools/stem.js out/bed.wav [--full] [--score]` |
| `calibrate.js` | dB trims that match recorded beds to the synth beds they replace | `node tools/calibrate.js > audio/trims.json` |
| `samples.py` | Base64 the recorded beds into `audio/samples.js` for the engine | `python3 tools/samples.py [trims.json]` |
| `cuesheet.py` | Engine score → opus-sound-layer cue sheet via `film/sfx_map.js` | `python3 tools/cuesheet.py out/score.json out/bed_scored.wav audio/cues.json --kit audio/kit` |
| `score_window.py` | earshot `find` slides the cue's span across each Lyria take to choose its start | `<earshot venv>/bin/python tools/score_window.py [--only M01,M12]` → `audio/score/windows.json` |
| `score_place.py` | Window, retune to A440, normalise, HP 75 Hz, filter, fade and place the score; follow ducks and holes | `uv run tools/score_place.py out/score.json out/bed_s.wav out/bed_scored.wav [--lufs -19]` |
| `score_doc.py` | Write the readable `audio/SCORE.md` from `score_plan.json` | `python3 tools/score_doc.py` |
| `dispatcher_tts.py` | Voice the 999 Dispatcher with Gemini TTS | `python3 tools/dispatcher_tts.py out/spot [--only L237] [--force] [--voice en-gb-concierge-5]` |
| `voice_place.py` | Phone-line treatment (300 Hz–3.4 kHz, compression, soft clip) → `audio/voice/phone/` | `python3 tools/voice_place.py` |
| `tension.py` | 11 designed tension sounds with Stable Audio via Soundbox | `SOUNDBOX_AUDIOCPP_BIN=... python3 tools/tension.py [--only T01] [--force]` → `audio/tension/` |
| `listen.py` | earshot on key moments of the final mix | `<earshot venv>/bin/python tools/listen.py out/audio/mix.wav out/listen` |
| `credits.py` | Write `audio/CREDITS.md` from `audio/credits.json` + library catalogue | `python3 tools/credits.py` |

### *Autopilot* only (`claude-film/autopilot/tools/`)

| Tool | Purpose | Invocation |
|---|---|---|
| `parse_script.py` | Screenplay → `film/script.json` / `film/script.js` | `python3 tools/parse_script.py` |
| `vo_tts.py` | Generic Gemini TTS voicer (direction in `speech_metadata`, never spoken) | `python3 tools/vo_tts.py LINES.json OUT_DIR --voice en-gb-training-10 [--force]` |
| `board.js` | Labelled board of chosen moments in one browser session | `node tools/board.js PICKS.json out.jpg [cols=4] [tileWidth=480]` (PICKS: `[["Q05", 45.6, "caption"], ...]`) |
| `cuesheet.js` | Dump all beds, cues, silences, ducks and voiced takes in global seconds; count each name | `node tools/cuesheet.js out/cuesheet.json` |
| `sfx_gen.py` | Generate effects and room tones with Stable Audio 3.0 Small SFX via audio.cpp (CPU), with an optional earshot check | `python3 tools/sfx_gen.py [--only a,b] [--force] [--threads 2] [--check]` → `audio/gen/<key>.wav`, `audio/gen/check.json` |
| `sfx_variants.py` | Regenerate weak sounds as prompt×seed variants; `earshot rank` keeps the best | `python3 tools/sfx_variants.py audio/gen_variants.json [--threads 2]` → `audio/gen/picks.json` |
| `synth_sfx.py` | Designed tones in numpy: alarm, charging chime, email, laptop wake, ringtone, flash | `python3 tools/synth_sfx.py` → `audio/synth/*.wav` |
| `build_mix.py` | The whole soundtrack: bed + score + voices + effects sheet → opus-sound-layer `mix.py` → peak hold → mux | `uv run tools/build_mix.py [--mix [--mux]] [--cut NAME]` |
| `youtube_cut.py` | Remap the cue sheet and score plan onto a cut's clock; cut the picture frame-exactly | `python3 tools/youtube_cut.py [cuts/youtube.json] [--picture]` |

Skill helpers: `scripts/new_production.py` starts the folder, `scripts/contact_sheet.py` reviews any render, `scripts/canvas_render.js` renders a standalone graphics page.

---

## 4. Sound in depth

### Principle
Sequences name every sound they mean: `S.bed(name, t0, t1, {level, fi, fo})`, `S.cue(name, t, {...})`, `S.silence(t0,t1)` (Autopilot: the world drops out, voice and score stay), `S.hole(t0,dur)` (OTM: everything but the Extra's drone), and `S.duck(t0,t1,level)`. Voiced lines add their own `voice`/`radio` cue automatically. The names are the spotting notes, so "Nothing is placed by hand" (`claude-film/autopilot/audio/README.md`). `film/sound.js` is a development engine: synthesised stand-ins, and a soft tick for unknown names, so timing can be judged in the player.

### Where the effects come from
1. **Freesound CC0 (OTM).** `tools/freesound.py` scrapes Freesound's search page with the CC0 filter (Openverse's API timed out from the machine). Candidates are cut and judged with opus-sound-layer's `sfx.py` (`prep_sounds.py`), organic events trimmed whole (`trim_sound.py`), and beds looped (`make_loop.py`). Every pick was checked on waveform/spectrogram sheets. Files go in `claude-film/one-too-many/audio/{sfx,beds}`, with credits in `audio/credits.json` → `CREDITS.md`. The opus-sound-layer library (1,139 CC0 sounds, `uv run <sound-layer>/scripts/sfx.py kit` → `audio/kit`, not committed) supplies `lib:TYPE/ID` picks.
2. **Stable Audio 3.0 Small SFX, local CPU (Autopilot; OTM's tension layer).**
   - Setup: the audio.cpp binary is built from source for CPU at `/home/user/0xshug0/audio.cpp/build/linux-cpu-release/bin/audiocpp_cli`. The model is `/root/.soundbox/models/audiocpp/Stable-Audio-3-Small-SFX-GGUF/stable-audio-3-small-sfx-q8_0.gguf`.
   - Command per sound: `--task gen --family stable_audio --backend cpu --threads 2 --duration-seconds D --seed S --num-inference-steps 8 --guidance-scale 1.0`.
   - Speed: 14–23 s per sound (`claude-film/autopilot/audio/gen/gen.log`).
   - Plan: `audio/gen_plan.json` = `{"key": {"prompt": "... no music", "dur": 3, "seed": 7, "match": "a car door closing"}}` (96 keys). Every prompt ends "no music" so effects sit under the score.
   - OTM's `tension.py` calls the Soundbox CLI (`/home/user/hamsanders/soundbox/server/dist/cli.js`, model `audiocpp-stable-audio-3-sfx`) at about a minute per sound.
   - License: Stability AI Community License (free under $1M revenue).
   - Raw WAVs stay out of git (`.gitignore`: `audio/gen/*.wav`, `var/`, logs). The chosen sounds are committed as FLAC in `audio/kit/`.
3. **CC0 stand-ins.** Where the model could not make a convincing small sound (clicks, taps, latches, fabric, a creak), OTM's recordings are reused: `otm/<name>` in the sound map resolves to `claude-film/one-too-many/audio/sfx/<name>.flac`.
4. **Synthesised.** Sounds that are synthetic in life: `tools/synth_sfx.py` (mallet and bell partials, 48 kHz mono, peak -3 dBFS), plus synth beds in `build_mix.py` (`tinnitus` = a 7.2 kHz wavering tone; `heat` = noise band-passed 6.5–12 kHz). OTM keeps its drone, unison, pings, tinnitus, DTMF and heartbeats in `film/sound.js` as story devices.

### earshot: what it is and exactly how it was used
earshot (github.com/Leonxlnx/earshot, installed at `/home/user/leonxlnx/earshot`, venv `.venv/bin/earshot`; install = `python -m venv .venv; pip install torch (CPU); pip install -e ".[mcp,llm,dev]"; earshot doctor --load`) is a local CPU "ears for agents" model.
- **Commands:** `describe`, `match FILE QUERY [--alts]` (verdict strong/plausible/weak/no match, z among 322 vocabulary descriptions), `rank QUERY PATHS... --json`, `find FILE QUERY` (best window), `timeline`, `sheet`, `critique`, `measure`.
- **Cost:** each CLI call loads models (about 20–40 s). For batches use the Python API (`from earshot import api`, as `score_check.py`, `score_window.py` and `listen.py` do) or the MCP server. Threads come from `--threads N` or `EARSHOT_THREADS`.

Uses in the films:
- **Checking generated SFX:** `sfx_gen.py --check` runs `earshot match <wav> "<match text>"` and stores the line in `audio/gen/check.json`.
- **Ranking takes:** `sfx_variants.py` runs `earshot rank "<match>" 0_original.wav var/<key>/*.wav --json`; the winner replaces the take, and `audio/gen/picks.json` records `{pick, z, verdict}` (or the CC0 fallback with its source).
- **Ranking VO takes:** the 3 refrain lines were voiced 3× each and ranked against a per-slot text ("a man whispering, broken, with almost no voice"). The scores, the chosen take and the reason are in `claude-film/autopilot/audio/vo/refrain_v2.json`.
- **Score QA:** `score_check.py` checks that each cue is music only (no vocal/drum tags), runs a forced choice vs alternatives ("a pop song with vocals", "a drum beat", …), and reads the mood. Breakfast and the mirror read "sad" (75%/72%), so they were regenerated in an explicitly bright major key (98% warm). The heat cue read "uplifting orchestral" and was regenerated (`M09a_v1` kept).
- **Score windows (OTM):** `score_window.py` uses `find` with a single distinctive LISTEN_FOR element per cue.
- **Final-mix listening:** `listen.py` builds `audio/reports/earshot_listen.json`. It changed decisions: kept the original explosion layering, replaced the title typing that read as footsteps, and removed the crowd walla that read as chanting.
- **Limits:** it rates TTS voices nearer "robotic" in forced choice, and misses pianissimo score under loud beds, so judge those by ear (`LISTEN.md`).

### Voice-over
Gemini TTS, model `gemini-3.8-flash-tts`.
- **Request:** POST `https://generativelanguage.googleapis.com/v1beta/interactions` with `{"model", "response_format":{"type":"audio"}, "generation_config":{"speech_config":[{"voice": V}]}, "input":[{"type":"user_input","content":[{"type":"text","text": LINE, "annotations":[{"type":"speech_metadata","style": DIRECTION}]}]}]}`. The direction rides in the annotation, so it is never spoken.
- **Output:** 24 kHz mono WAV. Retries on 429/5xx.
- **Voices** (author picks by ear from an audition): Dispatcher `en-gb-concierge-5` (OTM); Daniel `en-gb-training-10`; radio presenter `en-gb-podcaster-3`.
- **Files:** per-line directions in `audio/vo/script_vo.json` and `audio/radio/script_radio.json`. `audio/voice_map.json` maps line id → `{file, take, dur, style}`. `audio/voice.js` embeds the takes as base64 OGG in `window.FILM_VOICES` for the dev player.
- **Mix treatment:** Daniel clean; radio through `radio()` in `build_mix.py` (HP 320, LP 3400, 1.6 kHz presence peak, tanh saturation, -8 dB); Dispatcher through `voice_place.py`'s phone line.
- **What stays as type:** scene dialogue, and Emily (a synthetic 4-year-old "more likely to sound wrong than moving", `DECISIONS.md`).
- **ElevenLabs:** not used in `claude-film/`. It appears only in `claude-game/crownfall-intro` (commit fd70c9f, "the ElevenLabs narration (George)").

### Score (Lyria)
- **Plan:** `audio/score_plan.json` keys: `palette, motifs[{name,description,where}], key_map, arc, unscored, film_start{Qnn: s}, generator, cues[{id, seq, start_s, end_s, model, level_db, prompt, why, take_history?, diegetic?, fade_in_s?, fade_out_s?}]`. OTM's version adds `replaces` (the synth beds a cue replaces) and `keep_synth`, and was made by six spotters from `spot.js` packs, a lead composer, a story critic and a technical critic (`claude-film/one-too-many/audio/README.md`). `audio/SCORE.md` is its readable form.
- **Prompts:** every prompt says "instrumental film-score cue, about N seconds … No drums, no vocals, no choir. In tune at A = 440."
- **Generation:** `lyria.py` POSTs `{"model":"lyria-3.5","input": prompt}` to the same Interactions endpoint (`lyria-3-clip-preview` for short cues). The MP3 is the base64 `audio` in the `model_output` step, with a `<id>.json` sidecar. About $0.08 a cue. Output carries a SynthID watermark. Blocked prompts are reported and never retried; reword them neutrally. Connections dropped mid-response are retried (the Autopilot version).
- **Lyria quirks:** it writes about a minute whatever length you ask for and ignores the prompt's timestamps, so each cue must be windowed. Takes came back 0 to +36 cents off A440, so retune.
- **Placement in Autopilot's `build_mix.py`:** retune by `tune_cents` from `score/check.json` (asetrate), normalise to -23 LUFS, start at the first 100 ms frame within 18 dB of the take's max, fade (default 2.0 s in for cues over 20 s, else 1.2 s; 2.5 s out), apply `level_db + 9`, and place at `start_s`. The score is not silenced by `S.silence`; only the world is. A diegetic cue (R01, the radio music) is used as a bed through the radio filter.

### Cue sheets and maps
- `out/cuesheet.json` (from `node tools/cuesheet.js`): `{total, seqs[{id,title,start,dur}], beds[{seq,name,t0,t1,t0g,t1g,p}], cues[{seq,name,t,tg,p}], silences, ducks}`. Autopilot had 72 beds, 199 cues and 4 ducks, with the world's silence from 644 to 687 s.
- `claude-film/autopilot/audio/sound_map.json` maps every name → sound:
  - Beds: `{"file": "gen/bed_kitchen", "lufs": -40, "filter": "lp:4500|hp:N|radio|speed:x", "until": s}` or `{"synth": "heat", "lufs": -52}`.
  - Cues: `{"file": "synth/alarm", "align": "peak|start|end", "weight": "hero|support"}`.
  - A list picks by order of occurrence within a sequence. `name@Q05` overrides per sequence (e.g. footsteps on stairs vs gravel). `null` = silent on purpose (a kiss, a sip, a distant lawnmower).
  - Prefixes: `gen/` (`audio/kit/*.flac`, falling back to `audio/gen/*.wav`), `otm/`, `synth/`, `score/`.
- OTM equivalent: `claude-film/one-too-many/film/sfx_map.js` (`window.FILM_SFX`: `beds_off`; `cues` with `"code"` = engine plays it, `"engine"` = engine plays the recording at its designed level, `"sfx:NAME"`, `"lib:TYPE/ID"`, `"a+b"` layers, lists rotate, `"none"`, `weight`, `hero_from`, `per`, `at`, `then`).
- `audio/cues.json` (the opus-sound-layer sheet, written by `build_mix.py`): `{fps:24, duration_s, energy:"calm", lufs:-18, kit, room:{decay_s:0.6, wet_db:-16}, music:{file:"out/mix/bed.wav", start_s:0, loop:false, fade_out_s:0.05}, voice:[{file,start_s}], duck_db:9, silence_ok:[[t0,t1],...], cues:[{id:"Q01.alarm.0", t, sound, weight, align, pan?}]}`. Cues inside a world silence are dropped, and pan is clamped to ±0.6.

### The mix (`uv run tools/build_mix.py --mix --mux`)
1. **World bed.** Each bed is loaded with ffmpeg at 48 kHz stereo, normalised to the map's `lufs`, and looped with 0.6 s equal-power crossfades from an offset seeded by an md5 of key+seq+start (`seed_t0` keeps cuts identical). Its level is the `p.level` relative to that name's median (clamped ±12 dB). Fades: 0.04 s at sequence edges, else 0.8 s.
   - **Air floor:** noise LP 900 / HP 60 at -60 LUFS from 4.5 s, so no moment is digitally dead.
   - **Silences:** ramp down in 0.04 s and back in 0.3 s.
   - **Ducks:** 0.3 s ramps.
2. **Score**, added to the bed → `out/mix/bed.wav` (also `world.wav` and `score.wav`).
3. **Voices** → `out/mix/voice/L###.wav`.
4. **Effects sheet** → `audio/cues.json`, then `uv run /home/user/bodila51/opus-sound-layer/scripts/mix.py audio/cues.json --out out/audio`. It places each effect's peak or start on its cue, solves its level against the bed in its own band, adds one shared room, ducks the bed 9 dB under the voice, and masters to **-18 LUFS with a -2 dBTP limiter** (opus-sound-layer's own default is -14; the films set -18 in the sheet).
5. **Peak hold:** `alimiter=limit=0.708` (-3 dBFS, latency-compensated), because the AAC encode overshoots glockenspiel transients by about 1.5 dB.
6. **Mux:** `-c:v copy -c:a aac -b:a 256k -movflags +faststart` → `out/autopilot.mp4`.

The sheet's music is the whole bed and its voice is the takes. With `--cut youtube` every input and output lives in `out/youtube/`.

OTM's chain was the same in separate steps: `node tools/stem.js out/bed_s.wav --score`, `uv run tools/score_place.py ...`, `python3 tools/cuesheet.py ...`, then `mix.py`. Two story beats (the scream, the kitchen crash) were played by the engine because the mixer's "just audible" levelling buried them.

**Room tone**: named beds (`room` → `gen/bed_kitchen` at -40 LUFS, `room@Q01` → `gen/bed_dawn_room` at -38, `ac`/`bed_office`, `cabin_hush`, `traffic`…), plus the air floor, plus mix.py's shared room reverb.

**Env var names** (never values): `GEMINI_API_KEY` or `GOOGLE_API_KEY` (or a network secret that injects `x-goog-api-key` for `generativelanguage.googleapis.com`, so the script never sees the key); `AUDIOCPP_CLI`, `SA3_SFX`, `EARSHOT`, `SOUND_LAYER_MIX`, `SOUNDBOX_CLI`, `SOUNDBOX_AUDIOCPP_BIN`, `EARSHOT_THREADS`; `UV_NATIVE_TLS=1` if uv fails TLS. No Freesound key is used: the page is scraped with a generic UA.

---

## 5. Subtitles, title and end cards, thumbnails, YouTube cut, player

- **Subtitles (Autopilot, burned into the picture; no SRT/VTT exists in `claude-film/`)**: `FILM.drawLines` via `LC.caption`.
  - Placement and type: Libre Franklin, bottom centre (baseline y = H-92), soft dark halo `rgba(4,10,11,0.6)` blur 14, no box. Wrapped at 1240 px to at most 2 balanced rows. Overlapping lines stack, newest at the bottom.
  - Styles: dialogue 700/44 px white; Emily 700/44 `#E0B34F`; V.O. 500/40 bone `#E6E0D2`; radio italic 500/36, alpha 0.9.
  - Speaker label "Daniel: " / "Radio: ", added late at the author's request. It is drawn only: timing is computed on the words alone.
  - Typesetting: `FILM.typeset` turns `--` into a dash and sets curly quotes and ellipses; the words stay verbatim.
  - Timing: 0.12 s fade in; hold = take + 0.35 s (voiced) or `max(1.3, 0.55 + 0.062×chars)` (read); 0.25 s out. Each line id appears exactly once, in screenplay order.
  - Keep the y 900–1060 band calm and dark in the composition, never a box. Diegetic words (6:14, BATTERY 7%, 8:32, 5:37) are drawn on glass in the world.
- **OTM kinetic type**: `OTM.say` per speaker.
  - Entrances: Scott types at 35 ms/char, Deena cuts on, Angelo deals at 160 ms/word, etc. Hold = `max(0.9, 0.35 + 0.055×chars)`.
  - Size and placement: 44–56 px on ink, at most 3 lines on screen. y is clamped into the letterbox live area.
  - Per-speaker landing sounds, and every bus silenced under the Extra's VOICE.
- **Title / end card**: Autopilot Q01 0–5 s, black, "AUTOPILOT" + "A film by Osita Miles" (Libre Franklin 500, tracked, bone), fading out by 4.6 s, silent (`silence_ok [0, 4.6]`). Q12 57–67 s: the same type after about 2.5 s of black (shot `post: {grain: 0.035, halation: 0, vig: 0}`). OTM has a whole title sequence (`film/seq/Q02_crisps_title.js` + `film/sets/title.js`). Otherwise no slates or scene headings on screen.
- **Thumbnails**: 1280×720 JPEG.
  - How they are drawn: `src/THUMB_youtube*.html` load the engine (`FILM_LOAD('../', ['Q05','Q02'])`) and `FILM.renderAt` real film frames into a canvas, then add heavy outlined YouTube type. Variants are selected with `?v=a|b|c|c2|d|d2|e|e2|f`.
  - Rules from the commits: one hook; read at feed size; keep the bottom-right clear for YouTube's running time; never show what happened; the author picks (C2, "NOBODY ANSWERED.", type at the top); for an A/B test, keep the words fixed and vary only the image.
  - OTM drew its cast/poster thumbnails directly with the kit at 1920×1080 and delivered them at 1280×720 (`src/THUMB_youtube.html`, `src/POSTER_youtube.html`).
- **YouTube cut**: `cuts/youtube.json` = `{name, why, remove: [[a, b, "reason"], ...]}` (32 spans on the director's clock).
  - `youtube_cut.py` converts spans to whole frames (`ceil(t*24)`) and refuses overlaps and any span touching a voiced take (from -0.12 s to take + 0.35 s).
  - It remaps beds, cues (dropping those inside spans), silences, ducks and the score plan with `T(t)`, and writes `out/youtube/{cuesheet.json, score_plan.json, edl.json}`.
  - With `--picture` it cuts `out/autopilot_picture.mp4` via `select='not(between(n,a,b-1)+...)',setpts=N/(24*TB)`, re-encodes at CRF 18 and verifies the frame count with ffprobe.
  - Then `uv run tools/build_mix.py --cut youtube --mix --mux` rebuilds the mix: beds run shorter and score cues end on their own fades instead of being chopped.
  - Editorial rules: no cut during a subtitle; protect the twist (no cold open, no added line); trim only wordless shot tails.
  - Delivered encodes in `out/youtube/`: 1080p two-pass x264 at about 4.6 Mb/s (379 MB) and 720p at about 0.48 Mb/s (38 MB). The commands are not in the tools (inferred: ad-hoc ffmpeg, with the small one for size-limited sending).
- **Player**: `film/index.html` is the dev player. `tools/bundle.py` inlines `fonts.css` (data-URI fonts), the player CSS and markup, `window.FILM_VOICES` (take lengths only) and every JS file, in artifact format (no doctype/html/head/body, `<meta name="claude:viewport-fit-sides" content="cover">`). It ends with `FILM.player({ poster: 2.6, audio: 'autopilot.mp3' })`.
  - The MP3 is the final mix (Autopilot 160 kb/s, 13.7 MB; OTM 112 kb/s) and drives the clock. The canvas renders live in the browser.
  - Controls: Space play/pause, ←/→ ±5 s, `[`/`]` previous/next scene, sequence ticks on the bar, `#q05` hash deep link, sound toggle, full screen.
  - Without the MP3 it renders each sequence's audio with OfflineAudioContext at 32 kHz.
  - Sizes: page about 2.5 MB, MP3 under 16 MB. Committed as `player/<film>.{html,mp3}`.

---

## 6. QA practice, lessons and gotchas

**Picture checks**:
- Every style frame is rendered and then *looked at* with the Read tool, critiqued "like a film art director", for at least 3 rounds ("stop only when it is genuinely striking").
- Per sequence: `strip.js` sheets every 1 s with ms/frame and warnings, plus `frame.js` for details.
- Per set: `set.js` demo sheets; the `out/set_*.png` and `out/strip_*.png` files are what this produces.
- Across the film: `span.js` (OTM, including `bounds` for joins) and `board.js` (chosen moments).
- Dialogue: `lines.js` audits coverage.
- Definition of done (FILM.md): every assigned line plays verbatim at the right moment, the story reads with no prior knowledge, the restraint rules hold in every frame, and each frame could hang beside the style frames.
- Flash safety: at most 3 full-frame luminance flashes per second.
- OTM's reviews came from three reviewers merged into `design/film_review.json`, with legibility fixes, per-sequence gain, and continuity at joins.

**Audio checks**:
- `audio.js` per-second peak/RMS (OTM).
- earshot at every stage (above).
- `uv run <sound-layer>/scripts/qa.py out/<film>.mp4 --audio out/audio` writes `qa-report.json`, `mix-report.json` and `qa.png`. It checks offset (0 samples), loudness (-18.20 LUFS), true peak (-2.16 dBTP), voice (bed 13.6 LU under the voice), silence, sync per frame, audibility/hero body and music dips.
- Accepted fails are explained in the README: intended quiet passages, soft foley under the score.
- `audio/LISTEN.md` lists the moments a human must judge by ear.

**Lessons recorded in the files and commits**:
- Freesound and its CDN refused the Autopilot machine, and Openverse timed out → generate locally (Stable Audio) and fall back to committed CC0.
- Stable Audio cannot make convincing tiny foley (clicks, taps, latches, fabric, creaks) → use CC0 recordings.
- Lyria returns about 60 s regardless of the asked length and ignores prompt timestamps → window each take. Tuning drifts → measure and retune to A440. The safety filter blocks some prompts → reword neutrally and don't retry. Connections drop mid-response → retry.
- The mixer's "just audible" levelling buries story beats → play them at a designed level. Crowd walla read as chanting → cut it.
- The AAC encode overshoots transients → hold sample peaks at -3 dBFS before encoding.
- Chrome batches canvas work, so naive frame timings show false spikes → `getImageData(0,0,1,1)` after each frame (`strip.js`, `set.js`).
- A count-based layer cache churned when cutting between sets → budget caches by memory (72 frames).
- `FILM.drawShot` shared before/after lists, so flashed shots' post effects ran twice → give each its own lists.
- The cut's remapped cue sheet changed room-tone loop seeds, so untouched scenes sounded different → carry `seed_t0`.
- A speaker label must never change a subtitle's timing (cuts were planned around those timings).
- Late revisions: re-render only from the change (the commit says "re-rendered from 10:03 to the end and spliced on at a keyframe (16,488 frames, frame-exact)"; presumably `export.js --from 603`, inferred), then rebuild the mix from the new cue sheet.
- Never edit the shared `kit/otm.js` and `kit/figures.js`, because parallel agents use them at once. Put helpers in `kit/look_x.js` or your own file.
- Raw generated audio and renders stay out of git; commit the chosen sounds as FLAC.

**What *Long Distance* added** (`claude-film/long-distance/`, merged 27 November 2026):
- *Grain and Gloss*: in a cut-paper world with grain, the one artificial thing (the phone, the AI girlfriend) is the only smooth surface, drawn after the grain; its voice is the real woman's TTS voice made dry, close and levelled flat with no room. The contrast carries the twist without a word of narration (`design/look_b.md`, `audio/README.md`).
- A staging grammar beats a palette: his half and the empty half of every frame, the phone always in the empty half, one room seen from matching cameras by night and by day; the visit is the first time a person fills the empty half (`design/look_c.md`).
- Cast by ear: five Gemini TTS voices per role auditioned as reels (`audio/audition/`), the author picked; one voice plays both the phone and the real woman, separated only by treatment.
- Three independent director's reviews, scored on a fixed rubric, before the picture locked as cut 4 (`design/REVIEW_cut1-3.md`).
- Silence is designed, not left: the room drops out as the screen goes dark, the app opens with no ring, the black and the title are digital silence; list them in `score_plan.json` `silences_to_keep` so no cue lands on them.
- A score can be decided last: `build_mix.py` reads `audio/score_plan.json` as a hook (an empty list builds the film without music), so the author chose a sparse score after the picture and mix were locked and only the bed changed.
- A sparse score from one take: generate several takes of one prompt (`takes`, never placed) and cut every cue from the chosen take (a cue's `take`, `from_s`), so the cues share instrument, key and room; give the last cue the take with a clean natural fade and land that fade on the cut to black.
- Grain is expensive to encode: the paper grain pushed an uncapped CRF 18 1080p encode past 40 Mbps (about 2.8 GB for 8:37; the first render filled the disk at 45 %). `export.js --crf 20 --maxrate 5.5M` (bufsize twice that) gave 5.6 Mbps and 360 MB, with no blocking in the darkest frames, under the 400 MiB send limit.
- Keep `out/export_tmp/` segments until the last encode: every later deliverable (review copy, master) is muxed or scaled from them, and deleting them costs a 30–40 minute re-render.
- Thumbnails: the author preferred illustrated posters in *One Too Many*'s idiom to frame grabs in *Autopilot*'s (`src/THUMB_youtube2.html`, e and f).

**Gotchas from the sessions that made the films** (not yet written in the films' own docs):
- *Out of memory when rendering and mixing in parallel* (it happened on Autopilot). The machine has 15 GB RAM, 4 cores and no swap. `export.js --workers 3` runs 4 Chromium pages. `build_mix.py` holds several full-length float64 stereo arrays (687 s × 48 kHz × 2 × 8 B ≈ 0.53 GB each: world, score, bed, floor, ctrl, caches), then `mix.py` loads its own copies. Run export, mix and earshot or Stable Audio jobs one at a time, with Stable Audio and earshot at `--threads 2`. The "generated after the restart" note in commit 078f1b5 suggests a session restart mid-score.
- *Send-size limits.* Files sent to the author in chat must be under 400 MiB (Autopilot's first 1080p encode was over and was re-encoded at a lower bitrate); artifact pages are limited to 16 MB per file, so keep the player page (about 2.5 MB) and MP3 (under 16 MB) small. Keep the high-bitrate master for upload. Use `scripts/contact_sheet.py` to look before sending.

---

## 7. Start a new Claude Film: checklist

1. `python3 .claude/skills/cines-engine/scripts/new_production.py claude-film <slug> "<Title>"`.
2. **Copy unchanged** from `claude-film/autopilot/`:
   - `kit/otm.js`, `kit/figures.js` (never edit), `fonts/fonts.css` (+ `fonts_alt.css`).
   - `film/engine.js`, `film/load.js`, `film/headless.html`, `film/settest.html`, `film/index.html` (retitle), `film/sound.js` (dev stand-ins).
   - `tools/{shoot,film,strip,frame,set,board,export,cuesheet}.js` and `tools/{parse_script,vo_tts,lyria,score_check,sfx_gen,sfx_variants,synth_sfx,build_mix,bundle,youtube_cut,freesound,prep_sounds,trim_sound,make_loop}.py`.
   - Fix the film name in the hard-coded paths: `export.js` OUT default, `build_mix.py` (`autopilot_picture.mp4`, `autopilot.mp4`, and `OTM` → `../one-too-many/audio/sfx` for CC0 stand-ins), `bundle.py` (title, `<film>.mp3`, the JS list), `youtube_cut.py` (picture name), `synth_sfx.py` (rewrite the tones).
   - For type-as-acting dialogue, take `kit/dialogue.js` and OTM's engine/`tools/lines.js` instead.
3. **Write fresh, in this order**:
   1. `design/screenplay.txt` (verbatim), then `python3 tools/parse_script.py`.
   2. `design/LOOKS_BRIEF.md` (three looks, same three moments).
   3. Voice early: `audio/vo/script_vo.json`, `vo_tts.py`, author audition, then `audio/voice_map.json` and `audio/voice.js`.
   4. Three looks in parallel: `kit/look_{a,b,c}.js`, `src/*`, `design/look_*.md`, then `src/BOARD_looks.html`.
   5. `design/DECISIONS.md` with the author.
   6. Adapt `film/engine.js` (subtitle styles, `speakerName`, finish defaults).
   7. `film/FILM.md` (contract + story-wide rules), then `design/SEQUENCES.md` (every take length, a table per sequence, sets and characters for phase 1).
   8. `film/rig.js` + `film/api/rig.md`, and `film/sets/*.js` + `film/api/*.md` with demos. Check with `node tools/set.js <set> 1`.
   9. `film/seq/QNN_*.js`, checked with `strip.js` until done. Name every sound.
4. **Sound**:
   1. `audio/gen_plan.json` → `sfx_gen.py --check` → `audio/gen_variants.json` → `sfx_variants.py` → convert the chosen ones to `audio/kit/*.flac`.
   2. `audio/score_plan.json` → `lyria.py` → `score_check.py` (regenerate off-mood takes). For a sparse score, several `takes` of one prompt and cues cut from the chosen one (*Long Distance*).
   3. `node tools/cuesheet.js out/cuesheet.json` → write `audio/sound_map.json` until build_mix reports no `MISSING:`.
   4. `uv run tools/build_mix.py --mix --mux` after `node tools/export.js out/<film>_picture.mp4 --workers 3 --no-audio` (run them one after the other, not at the same time).
   5. `qa.py`, earshot on key moments, then `audio/README.md`, `audio/CREDITS.md` and `LISTEN.md`.
5. **Deliver**: `python3 tools/bundle.py`, then copy `out/player/<film>.html` and encode the mix to `player/<film>.mp3` (about 160 kb/s). Write the README (Watch / Look / Sound / Layout / Tools). Make thumbnails from the film's own frames (1280×720, author's choice). Optionally `cuts/youtube.json` → `youtube_cut.py --picture` → `build_mix.py --cut youtube --mix --mux`.
6. **External tools assumed installed**: Playwright Chromium, ffmpeg/ffprobe, uv, earshot venv (`/home/user/leonxlnx/earshot`), opus-sound-layer (`/home/user/bodila51/opus-sound-layer`), audio.cpp CPU build + SA3 SFX GGUF (via Soundbox `/home/user/hamsanders/soundbox`), and a Gemini key (env or network secret).

---

## 8. Craft from outside, worth using in the next film

From the external libraries summarised in `external.md` (all MIT); adopt the mechanism, keep this studio's taste.

- **Time is a word.** Name timings after the spoken words they hang on (`T.clock`, `T.clockEnd`), so a new take retimes the film by anchors (a monotone piecewise-linear map from the new take's seconds to the old) instead of hand-shifting shots. The films already key subtitles to takes; extend it to picture beats. (MengTo `html-explainer-video`, `html-reel`.)
- **2D camera vocabulary** for the engine's `c.camera`: frame a shot as "this world point at this screen point, this big"; interpolate zoom in log space so it travels at an even rate; named moves — a 3 % push into a cut (scale breath), whip (swap on the peak), zoom-through into what was inside, punch-out from a tight crop, parallax by depth; the camera is still unless the shot declares a move, and every move starts, travels and lands; carry speed through cuts at about 0.7×. (cinetic `references/camera.md`.)
- **Easing by role**: arrivals ease out (most of the film), repositions ease in-out, exits ease in into a cut; never scale from zero; no overshoot on type. The films' `FILM.ease` presets (`settle`, `weary`, `hover`, `tidy`, `snap`) are this idea with character.
- **Motion blur as a render pass**: render sub-frames, average in float, quantise once; keep the shutter inside a shot so a cut never double-exposes (the House Ealdholt shoot does exactly this with `--blur`). Redesign moves faster than ~60–80 px a frame.
- **An early whole draft**: the ending as stills at a quarter of the schedule, a half-size draft of the whole film with its ending by half, finals started by 70 %. Never deliver a film with a missing piece.
- **An independent critic** for style frames and cuts: a subagent that sees only frames and a contact sheet ("picture alone first": what does each beat say without the words?), scores a fixed rubric, names at most five fixes most damaging first, with a pass rule and a round cap; two judges, the lower score counts. (anyscene, cinetic, MengTo.)
- **Repeatability check**: render the same `t` after visiting elsewhere and compare pixels; a difference means hidden state.
