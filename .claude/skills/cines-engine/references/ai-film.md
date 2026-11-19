# AI Film: films made with video generation models

Films whose picture comes from generation models (Seedance, Kling, Cinema Studio, MiniMax, Wan and others). Treat the models as a camera crew that cannot hear you twice the same way: what makes a good AI film is the paperwork around them. Lock the look and the references before generating any video, keep every prompt, and keep sound, text and finishing in our own hands.

Contents: 1 Tools · 2 Workflow · 3 Prompting · 4 Continuity · 5 Review and selects · 6 Edit · 7 Sound · 8 Finish · 9 Honesty and rights · 10 Folder layout

## 1. Tools in this environment

- **Higgsfield MCP** (`mcp__Higgsfield__*`): `models_explore` (list/get/recommend; always `get` a model before using it, parameters change), `generate_image` / `generate_image_batch` (keyframes, character sheets, plates), `generate_video` / `generate_video_batch`, `jobs_wait`, `show_generation_by_ids`, `estimate_video_cost` / `estimate_image_cost`, `media_upload` (own stills as references), `manage_reference_elements` (consistent characters and objects), `upscale_video`, `reframe` (16:9 to 9:16), `video_deflicker`, `sync_so` (lip-sync to our own voice track), `voice_change`, `separate_stems`. Read `get_workflow_instructions` before a multi-step video job and `get_workflow_instructions {workflow: "character-sheet"}` before character sheets.
- Video models offered (check `models_explore list type=video` for the current set): Seedance 2.0 / 2.0 Mini / 2.5 / 2.5 Flash (start and end frames, image, video and audio references; 2.5 has a draft mode and extension), Kling 3.0 / 3.0 Omni / 4.0 / 4.0 Flash (elements for consistent characters, multi-shot), Cinema Studio 3.0 / 4.0 (genre, camera model, up to 4K), MiniMax H3 / H3 Max, Wan 2.6, Grok Video 1.5, FLUX 3 Video and Video Edit, Kling Omni Edit. Utility: Topaz, Bytedance Video Upscale, Reframe, Video Background Remover, Deflicker, Sync Lipsync.
- **Local**: ffmpeg for the edit and finish, `scripts/contact_sheet.py` for reviewing takes, the sound pipeline in `sound.md`, `scripts/canvas_render.js` for titles and captions.

**Credits are the user's money.** Quote with `estimate_video_cost` before any batch and say the total; use draft or Flash/Mini tiers to find the prompt, then the full model for finals. Never spend free or unlimited allowances without the user's say-so (the tools ask; pass the answer back).

## 2. Workflow

1. **Treatment and decisions** (`design/TREATMENT.md`, `design/DECISIONS.md`): logline, length, aspect ratio (16:9, 2.39:1 letterboxed, or 9:16 for Shorts), the look in words (palette, lens, film stock or grade, era, lighting), the characters, what the film never shows. One page. The author approves before anything is generated.
2. **Shot list** (`design/SHOTS.md`): one row per shot, 3 to 10 s each (models are best at one clear action per clip). Columns: shot, length, framing, camera move, action, sound, transition, continuity notes, model, prompt file, chosen take, why.
3. **Look development**: generate keyframes as stills first (cheap, fast to judge): one hero frame per scene, a character sheet per character (front, three-quarter, profile, full body, expressions), location plates. Put them on a board (`scripts/contact_sheet.py` works on image sequences too, or tile them with Pillow) and have the author choose. These become the start frames and references for video.
4. **Prompts**: one file per shot in `prompts/S01.md` with the prompt, references, model, parameters, and a take log (section 3).
5. **Generate**: drafts first, two to four variants per shot with `generate_video_batch`, then finals of the winning prompt. Log each job ID, cost and verdict in the shot's prompt file as it lands.
6. **Review and select** (section 5), **edit** (section 6), **sound** (section 7), **finish** (section 8), **deliver** with the README written.

## 3. Prompting

Write each prompt in the same order, so shots read as one film:

```
[subject and who they are] [the one action, as it unfolds over the clip]
[setting, time of day, weather]
[camera: shot size, lens, height, the move and its speed]
[light: key, direction, quality, practicals]
[look string — identical in every prompt of the film]
[sound cue, only if the model generates audio and you intend to keep it]
```

- **One action per clip**, described over time ("she lifts the cup, pauses, sets it down untouched"), not a list of events.
- **Camera language** the models understand: locked-off, slow push in (dolly in), pull out, truck left/right, pedestal up/down, crane up, orbit left/right, handheld, Steadicam follow, whip pan, rack focus from X to Y, low angle, high angle, top-down, over-the-shoulder, extreme close-up, close-up, medium, wide, extreme wide; lens in mm (24 mm wide, 50 mm natural, 85 mm portrait, 135 mm compressed). Give the move a speed and an end point.
- **The look string** is a fixed sentence appended to every prompt (for example: "35 mm film, Kodak Vision3 500T, soft halation, muted teal and amber, shallow depth of field"). Changing it mid-film breaks the film.
- **Start and end frames** give the strongest control: generate or paint the first and last frame as stills, then ask the model to move between them. Use the last frame of one clip as the start frame of the next for continuous action.
- **Say what must not happen** in plain words in the prompt when the model supports no negative field ("no text, no captions, no logos, hands stay out of frame").
- **No on-screen text from the model.** Models misspell; titles, captions and signs that must read go on afterwards (section 8).
- **Never name lighting gear** ("softbox", "key light on a stand"): models draw the equipment. Describe the light as it falls on the subject ("soft window light from the left, warm on her cheek, the far side in shadow").
- Describe a reference look in words; never feed another person's frame or face in as a reference.
- Keep prompts in the user's language, short and concrete; long poetic prompts drift.

**Seedance in practice** (from MengTo's digital-twin and making-of work): pass the start still both as `start_image` and as an image reference; 5 s clips; **draft at 480p, pick, then the final from the draft** (`seedance_2_5` takes `draft` and `draft_job_id`) — one draft per still, each visibly different; for faces, 85 mm at eye level for close shots and 50–65 mm for mediums, with a very slow push-in, a slow lateral slide or a locked-off camera. Seedance re-voices an audio reference, so it cannot hold an external voice-over's timing: lip-sync our own track afterwards (`sync_so`) or cut away. Do not switch models mid-film without the author's say-so.

Prompt file template (`prompts/S04.md`):

```markdown
# S04 — Kitchen, dawn: she finds the phone (6 s)
Model: seedance_2_5 · 16:9 · 1080p · 6 s · start frame: refs/S04_start.png · element: char_amara
Prompt: …
Takes:
- t1 job 1a2b… draft, 0.x credits — hand warps at 3 s. Rejected.
- t2 job 3c4d… draft — good timing, light too warm. Adjusted look string.
- t3 job 5e6f… final 1080p — chosen (clean hands, push ends on the phone).
```

## 4. Continuity

- Lock characters as reference elements (Kling elements, Higgsfield reference elements) or as one approved character sheet passed as image references on every shot they appear in.
- Same wardrobe, same props, same time of day words across a scene. Write a continuity line per scene in `SHOTS.md` and paste it into each prompt of that scene.
- Chain clips through shared frames (end frame → next start frame) where action continues across a cut.
- Grade every select to the same look in the finish rather than hoping the model matched it.

## 5. Review and selects

- Pull a contact sheet of every take (`python3 scripts/contact_sheet.py take.mp4 sheet.jpg --n 8`) and watch the full clip at speed once. Check hands, faces and eyes, physics (liquids, cloth, collisions), morphing between frames, flicker, accidental text, and whether the camera move ends where the cut needs it.
- Choose with the author for hero shots; record the choice and the reason in `SHOTS.md`. Usable portions count: a 6 s clip with 3 good seconds is a select.

## 6. Edit

- Keep an edit list (`edit/edit.json`: clip path, in, out, transition, notes) and build the cut with ffmpeg from it, so the edit is repeatable: conform every clip first (`fps=24,scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p`), then trim/concat or `xfade`.
- Cut on action and on sound; generated clips often start and end slow, so trim the first and last half second.
- Vertical versions: re-generate with `aspect_ratio: "9:16"` for hero shots, or use the Reframe model, or crop with a keyed pan (`crop=ih*9/16:ih:x='…'`) — never letterbox a 16:9 into a Short.

## 7. Sound

Model-generated audio is a guide at most: build the soundtrack ourselves (`sound.md`). Voice with ElevenLabs or Gemini TTS (lip-sync with `sync_so` if a character speaks on camera), score with Lyria, effects with Stable Audio 3.0 Small checked by earshot, mix to the platform's loudness. Keep the generated audio only when it is genuinely the best take and say so in `DECISIONS.md`.

## 8. Finish

- **Upscale before text.** Upscalers and enhancers rewrite fine text (a FloWell upscale turned "1,000 ppm" into "1.000 ppn" and middle dots into dashes). Upscale and deflicker the clean picture, then lay titles, captions and graphics on top (`motion-graphics.md` for the graphics pipeline and the repair recipe if text was upscaled by mistake).
- Grade for consistency (ffmpeg `eq`, `curves`, `colorbalance`, or a `.cube` LUT with `lut3d`), add grain last so it unifies clips from different models.
- Titles, captions and end cards from `assets/gfx_template.html` via `scripts/canvas_render.js`.

## 9. Honesty and rights

- Do not generate real, identifiable people (or their voices) without their consent; no imitation of a specific film, studio style or copyrighted character.
- Label AI-generated work where it could be taken as real: a notice card at the end for corporate and product work (the FloWell "Visual simulation notice" pattern), and YouTube's altered or synthetic content disclosure when uploading realistic footage.
- Product claims in AI footage follow `motion-graphics.md` (every claim sourced; illustrative shots labelled as such).

## 10. Folder layout

`ai-film/<slug>/`: `README.md`, `design/` (TREATMENT.md, DECISIONS.md, SHOTS.md), `prompts/` (one per shot, with take logs), `refs/` (approved stills and sheets, if they may be committed), `edit/edit.json`, `tools/` (the edit and mix scripts), `audio/`, `out/` (ignored: generated clips, renders). Start it with `scripts/new_production.py ai-film <slug> "<Title>"`.
