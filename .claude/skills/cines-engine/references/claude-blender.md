# Claude Blender: animation made by driving Blender

Claude writes Python that builds the scene, the characters' motion, the cameras and the lights, renders headless, grades in ffmpeg, then cuts, scores and mixes like every other production. The rule that makes it work: **everything is a script; the `.blend` is a build output.** A scene can be rebuilt from `scenes/*.py` at any time, so every fix is a code change and every render is reproducible.

Contents: 1 Setup · 2 Workflow · 3 Scene brief and dials · 4 Building scenes · 5 Animation · 6 Cameras (camrig) · 7 Lighting and atmosphere · 8 Rendering on CPU · 9 Grade · 10 Review · 11 Gotchas · 12 Layout

## 1. Setup in this container

- **Blender as a Python module** (tested here, Blender 5.3.0): `python3 -m venv <dir> && <dir>/bin/pip install bpy`, then `<dir>/bin/python script.py`. The venv is about 1.1 GB: check `df -h` first and keep it outside the repo (the scratchpad is fine). No `blender` binary or UI is needed.
- Or the full release from download.blender.org (reachable): untar and run `blender -b scene.blend --python script.py -- args`.
- **Software OpenGL for Workbench and Eevee**: `apt-get install -y libegl1 libgl1-mesa-dri libgles2` (without it they fail with "Couldn't open libEGL.so.1"). The `EGL_BAD_MATCH` warnings that follow are harmless.
- There is **no GPU**. Measured in this container (4 cores) on a trivial test scene: **Workbench** framing sheet (three stills) in about 4 s, use it for blocking; **Eevee** on Mesa's software rasteriser about 10 s a frame at 960×540 with noisy soft shadows, so use it only for an occasional look check; **Cycles on CPU** about 5.8 s a frame at 960×540 and 16 samples (with denoising). A real set at 1920×1080 and 64–128 samples will take minutes a frame. Measure one final still before promising a length (a minute at 24 fps is 1,440 frames) and say plainly what CPU rendering allows; on a machine with a GPU, force Cycles to it in every session (OPTIX, then CUDA; headless Blender silently renders on CPU otherwise).

## 2. Workflow

1. **Brief and dials** (§3) in `design/DECISIONS.md`; a shot list in `design/SHOTS.md`.
2. **Blockout**: primitives at real scale (metres, Z up, the door at y = 0, the room deep along +Y), the camera positions roughed in. Render a clay contact sheet from the hero spots.
3. **Look frames**: two or three lit stills of the hero shot in different looks; the author chooses.
4. **Build** the scene in passes, each a script (shell, layout, dress, materials, lights, atmosphere), each followed by its check (grounding, collisions) and a contact sheet.
5. **Shots** as `shots.json` for camrig (§6): framing sheet → lens chart → stamped preview → clearance check → finals.
6. **Finals** in resumable 24-frame chunks, then **grade** (§9) and encode, verifying frame counts.
7. **Edit, sound, mix, deliver** (`sound.md`, `environment.md`).

## 3. Scene brief and dials

Write the brief before any geometry: place, time and weather; three to five mood words; the room's size in metres (real places are small; density sells realism more than size); zones; two or three hero spots where the camera will live; the practical light sources that would really be there; and a **Fiction** block — invented names for companies, signs and screens — so nothing on screen is a real brand.

Dials, each recorded with a `means` line for this scene, so a change of mood is a change of numbers: density, tidiness, wear, wetness, atmosphere, power (how much is switched on), warmth (−1..1), time_of_day (dawn/day/dusk/night), weather (clear/overcast/rain/fog/snow), look (clean/cinematic/gritty/vintage). Build the scene as a rig, so dials that only change light or grade re-render without rebuilding. (The dials vocabulary comes from anyscene; the same words make good AI Film prompt variables.)

## 4. Building scenes

- Architecture, simple exact shapes and any text that must read are modelled in code (real font text objects); props with character come from CC0 libraries (Poly Haven, ambientCG; licences listed in `assets/LICENSES.md`) or are modelled procedurally. Generated 3D props (image-to-3D services) are a paid option: quote the cost and ask first.
- Origins at the bottom centre; front faces −Y; decimate heroes to about 150k triangles.
- Dress big to small. Drop objects onto surfaces with raycasts from their lowest vertices; after every dressing pass run a validator: overlaps (BVH), props intersecting props, anything floating more than 1 cm. Re-drop after any move.
- Look from low: a contact sheet of stills about 30 cm off the floor finds floating chairs that a wide shot hides.
- Vary instances through object colour into an Object Info node rather than duplicating materials.

## 5. Animation

- Keyframe from Python with fast bulk writes: `fc.keyframe_points.add(n)` then `foreach_set("co", flat_list)`; in Blender 5 actions are layered — get curves with `action.fcurve_ensure_for_datablock(...)` (on 4.x, `action.fcurves.new`).
- Animate from elapsed time and named phases, never from hand-counted frames; ease every move (no linear except true constant rates); seed every random choice so re-renders match.
- Characters: procedural motion for simple figures (drivers, shape keys, noise modifiers), Rigify for humanoids, imported motion only with a licence that allows it. Keep the character's silhouette readable in the shot's lighting before adding detail.
- Secondary motion (cloth, steam, rain, dust) is cached per shot; clear caches between builds.

## 6. Cameras: camrig

`scripts/blender/camrig/` is anyshot's camera rig (MIT, vendored with notice; `NOTICE.md` lists the changes made here). A shot list is plain data:

```jsonc
{ "defaults": { "fps": 24, "res": [1920, 1080], "aspect": "2.39", "samples": 128, "shutter": 180, "sensor": "s35", "fstop": 2.8, "ease": "inout", "handheld": 0.0 },
  "shots": [{ "name": "counter_push", "move": "push_in", "frames": 120, "handheld": 0.15,
    "keys": [{ "t": 0, "pos": [2.95, 4.35, 1.30], "aim_obj": "bowl", "lens": 35 }, { "t": 1, "pos": [2.55, 3.60, 1.13], "aim_obj": "bowl" }],
    "focus": { "mode": "rack", "keys": [{ "t": 0, "obj": "glass" }, { "t": 0.35, "obj": "glass" }, { "t": 0.75, "obj": "bowl" }] } }] }
```

Moves: `push_in`/`dolly`, `truck`, `crane`/`pedestal`, `pan`, `tilt`, `orbit` (centre object, radius, start and end degrees, height), `path` (Catmull-Rom through 4–6 keys; a walkthrough at 0.4–0.6 m/s, eye height 1.5–1.7 m, `handheld: {"profile": "walk"}`), `dolly_zoom`. Focus `track`, `point`, `rack` (repeat a key to hold), `none`. Any position may be an object name (its bounding-box centre). Lenses: wide 18–24 mm, normal 35–50 mm, tight 85–135 mm. "Slow" is 0.2–0.4 m/s.

Rig per shot: base (baked position) → aim (Track To a target) → shake (noise only) → camera (lens, DOF), rebuilt every run in its own collection; the input `.blend` is never saved over. Moves are baked one key per frame so motion blur sees smooth sub-frames.

```sh
P=.venv-bpy/bin/python; C=.claude/skills/cines-engine/scripts/blender/camrig/shoot.py
$P $C -- --scene out/scene.blend --list bowl                                   # object names, centres, sizes
$P $C -- --scene out/scene.blend --shots design/shots.json --out out/shots --framing --engine workbench   # t0/t½/t1 sheet
$P $C -- --scene out/scene.blend --shots design/shots.json --out out/shots --lenschart counter_push --engine workbench
$P $C -- --scene out/scene.blend --shots design/shots.json --out out/shots --preview --engine workbench --step 2
$P $C -- --scene out/scene.blend --shots design/shots.json --out out/shots --only counter_push --engine cycles --frames 1-24
```

Gate each shot in that order: the framing sheet (start, middle, end), the lens chart (same position at 18–135 mm), a stamped preview (shot, frame, lens, f-stop and focus distance burned in) to judge the move and focus — previews judge framing, never the look — then a **clearance check** (the camera at least 0.45 m from any solid on every frame, ignoring haze, decals, particles and intended glass; a focus target the camera passes through is a bug), then finals. With no shot list from the author, plan the arc a good director of photography would: an establishing wide, a walk, then close dolly reveals; name each shot and give its reason. See the vendored `README.md` for every field (`fstop_keys`, `blades`, anamorphic `ratio`, `breathing`, `lens_fx`, `aim_offset`).

## 7. Lighting and atmosphere

Practical lights first (lamps, screens, windows), fills last and weak; area lights shine along their local −Z; hide fills from camera, glossy and transmission rays near glass; set `material.cycles.emission_sampling = "NONE"` on dense emissive meshes; check exposure after every practical. Room haze: a homogeneous volume is cheap (seconds per frame); a noise-driven volume costs several times more; turn object motion blur off on volume domains. Lock exposure for the whole film.

## 8. Rendering on CPU

- Finals: 1920×1080 (or 1920×804 for 2.39:1), 64–128 samples with denoising, motion blur on, PNG frames into `out/shots/<shot>/frames/`, `use_overwrite = False` so a killed render resumes; 24-frame chunks (`--frames 1-24`, `25-48`, …) in the background, one Blender render at a time (two at once fight for memory and cores).
- Never run a Blender render and a heavy ffmpeg or mix job at the same time on this machine.
- Keep each foreground command under ten minutes; background long renders and check in.

## 9. Grade in ffmpeg

Grade every shot of a film with the same filter, from the PNG frames, so the grade can change without re-rendering. Looks: **clean** (light curves), **cinematic** (blacks lifted about 0.03, teal shadows, warm highlights, `hue=s=0.88`, a slight `rgbashift`, soft `vignette`, temporal `noise`), **gritty** (more contrast, `hue=s=0.75`, stronger grain), **vintage** (faded blacks, warm cast, `hue=s=0.7`, grain, a soft glow). Example:

```sh
ffmpeg -framerate 24 -i out/shots/counter_push/frames/%04d.png -vf "curves=r='0/0.03 0.25/0.22 0.6/0.62 1/0.98':g='0/0.034 0.5/0.5 1/0.97':b='0/0.045 0.5/0.5 1/0.95',hue=s=0.88,vignette=angle=PI/4.4,noise=alls=6:allf=t+u,format=yuv420p" -c:v libx264 -crf 16 out/graded/counter_push.mp4
```

Avoid Blender's compositor colour-balance and mask nodes for grading (they misbehave); keep Glare and Lens Distortion in Blender if wanted.

## 10. Review

Every gate ends with a picture you look at (clay sheet, low-angle sheet, lit stills, framing sheet, preview, finals contact sheet). For hero work, ask an independent critic (a subagent that never saw the build) to score layout, props, materials, lighting, atmosphere, plausibility and composition 1–10 from stills only, with at most five fixes, most damaging first; pass when nothing is below 6 and the mean is 7 or more; stop after three rounds that do not improve, and say what is still short. Keep `NOTES.md`: one line for anything that cost more than ten minutes.

## 11. Gotchas

- glTF imports use quaternion rotation mode: setting `rotation_euler` does nothing until you change `rotation_mode`.
- `matrix_world` is stale until `bpy.context.view_layer.update()`.
- Re-packing an unmodified glTF image drops its data (magenta textures).
- Track To flips when the aim is exactly vertical; offset the target a little.
- Splice into an existing compositor tree; a nested group can render black.
- Eevee previews show framing, not the final look (glass reads dark, falloff flatter).

## 12. Layout

`claude-blender/<slug>/`: `README.md`, `design/` (DECISIONS.md, SHOTS.md, shots.json), `scenes/` (build scripts, one per pass, and `build.py` that runs them into `out/scene.blend`), `assets/` (with `LICENSES.md`), `tools/` (grade, edit, mix), `audio/`, `out/` (ignored: `.blend` builds, frames, previews, encodes). Start with `scripts/new_production.py claude-blender <slug> "<Title>"`.

Sources: camrig, the shot grammar and the gate ladder from anyshot; the brief, dials, validators, lighting and critic patterns from anyscene (both MIT, Apekshik Panigrahi) — `references/external.md`.
