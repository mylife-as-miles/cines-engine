# AI Film: films made with video generation models

Films whose picture comes from generation models (Seedance, Kling, Cinema Studio, MiniMax, Wan and others). Treat the models as a camera crew that cannot hear you twice the same way: what makes a good AI film is the paperwork around them. Lock the look and the references before generating any video, keep every prompt, and keep sound, text and finishing in our own hands.

Contents: 1 Tools · 2 Workflow · 3a The author's templates · 3 Prompting · 4 Continuity · 5 Review and selects · 6 Edit · 7 Sound · 8 Finish · 9 Honesty and rights · 10 Folder layout · 11 Lessons in progress (My Name Is Oren)

## 1. Tools in this environment

- **Higgsfield MCP** (`mcp__Higgsfield__*`): `models_explore` (list/get/recommend; always `get` a model before using it, parameters change), `generate_image` / `generate_image_batch` (keyframes, character sheets, plates), `generate_video` / `generate_video_batch`, `jobs_wait`, `show_generation_by_ids`, `estimate_video_cost` / `estimate_image_cost`, `media_upload` (own stills as references), `manage_reference_elements` (consistent characters and objects), `upscale_video`, `reframe` (16:9 to 9:16), `video_deflicker`, `sync_so` (lip-sync to our own voice track), `voice_change`, `separate_stems`. Read `get_workflow_instructions` before a multi-step video job and `get_workflow_instructions {workflow: "character-sheet"}` before character sheets.
- Video models offered (check `models_explore list type=video` for the current set): Seedance 2.0 / 2.0 Mini / 2.5 / 2.5 Flash (start and end frames, image, video and audio references; 2.5 has a draft mode and extension), Kling 3.0 / 3.0 Omni / 4.0 / 4.0 Flash (elements for consistent characters, multi-shot), Cinema Studio 3.0 / 4.0 (genre, camera model, up to 4K), MiniMax H3 / H3 Max, Wan 2.6, Grok Video 1.5, FLUX 3 Video and Video Edit, Kling Omni Edit. Utility: Topaz, Bytedance Video Upscale, Reframe, Video Background Remover, Deflicker, Sync Lipsync.
- **Local**: ffmpeg for the edit and finish, `scripts/contact_sheet.py` for reviewing takes, the sound pipeline in `sound.md`, `scripts/canvas_render.js` for titles and captions.

**Credits are the user's money.** Quote with `estimate_video_cost` before any batch and say the total; use draft or Flash/Mini tiers to find the prompt, then the full model for finals. Never spend free or unlimited allowances without the user's say-so (the tools ask; pass the answer back).

## 2. Workflow

1. **Treatment and decisions** (`design/TREATMENT.md`, `design/DECISIONS.md`): logline, length, aspect ratio (16:9, 2.39:1 letterboxed, or 9:16 for Shorts), the look in words (palette, lens, film stock or grade, era, lighting), the characters, what the film never shows. One page. The author approves before anything is generated.
2. **Shot list** (`design/SHOTS.md`): one row per shot, 3 to 10 s each (models are best at one clear action per clip). Columns: shot, length, framing, camera move, action, sound, transition, continuity notes, model, prompt file, chosen take, why.
3. **Reference images, before any video** (the author's templates in `assets/ai-film/`, §3a): a **character sheet** per character, generated from the author's reference photo of them (`character-sheet.md`); an **environment reference** per location (`environment-reference.md`); a **prop reference** per story object that recurs (`prop-reference.md`). Fill each template from the film bible and the scene, generate two to four candidates, put them on a board and let the author choose; save the filled prompt and the chosen job id in `prompts/refs/`. Hero keyframes (one per scene) come after, built from these references. These images are the film's continuity: every video prompt cites them as @Image N.
4. **Prompts**: one **auteur video prompt** per sequence in `prompts/<SEQ>.md` (`auteur-video-prompt.md`, §3a), with its references, model, parameters, and a take log beneath it.
5. **Generate**: drafts first, two to four variants per shot with `generate_video_batch`, then finals of the winning prompt. Log each job ID, cost and verdict in the shot's prompt file as it lands.
6. **Review and select** (section 5), **edit** (section 6), **sound** (section 7), **finish** (section 8), **deliver** with the README written.

## 3a. The author's templates (use these)

`assets/ai-film/` holds the author's own prompt templates. Use them as written; fill every bracket from the film bible and the scene; never pad them with generic prose.

| Template | For | Output |
| --- | --- | --- |
| `environment-reference.md` | A location's master reference: identity, spatial geography, architecture, materials, production design, colour identity, light, camera/optics, composition, atmosphere, realism, continuity and negative locks | One wide or medium-wide eye-level still that later wides, mediums, close-ups, reverses, entrances and exits can all be generated from |
| `character-sheet.md` | A three-panel character sheet from the author's reference image: front full body (head omitted), rear full body (scale-locked to the front), three-quarter face close-up, on #808080 | The character's identity and wardrobe reference |
| `prop-reference.md` | One exact object in four views (hero 3/4, front, side, back, optional detail) on #808080, with material, colour, wear, identity markers, components, scale, state and physics locks | The prop's identity reference |
| `auteur-video-prompt.md` | One generated sequence: title, references, mode/duration/shot count/2.35:1, scene intent, global locks (identity with explicit wardrobe override, location, props and temporal state), movie colour (influences with purpose, camera package), immutable voice DNA, audio design, first-frame anchor, shot by shot (TIME, CAM, BLOCK, ACT, DIALOGUE/V.O., SFX, STATE OUT), performance arc, thematic logic, physics, audio and continuity locks (POSITIVE / NEGATIVE), generation priority order, final state | The video generation prompt |

- **References in plain syntax**: `@Image 1`, `@Image 2`, `@Video 1` — never markdown links. Pass the files to the model's reference slots (`image_references`, `video_references`; the start frame also as `start_image` when the shot must open on it) in the same order as their numbers, and list what each number is under the prompt's title.
- **The film bible**: the environment and prop templates were written for *YELLOW* and carry its locks — palette (muted yellow, softened lime, warm cream, desaturated olive, restrained amber, warm-neutral blacks; felt, never neon, never teal-and-orange), soft low-contrast motivated light, ARRI Alexa XT, 2.35:1, restrained 1.5× anamorphic, Cooke Speed Panchro-inspired rendering. For another film, keep the structure and swap those blocks for that film's bible, recorded in its DECISIONS.
- **2.35:1**: the video models render 21:9 (2.33:1) at most (Seedance 2.0/2.5, Kling 4.0, Cinema Studio 3.0/4.0 and MiniMax H3 offer 21:9). Generate at 21:9 and matte to 2.35:1 in the finish (1920×817 picture, or bars inside a 1920×1080 frame); compose with the matte in mind.
- **Voice DNA is immutable** and **wardrobe overrides are explicit**: copy a character's voice paragraph unchanged into every sequence; if they wear something other than their sheet, say exactly what replaces it.
- **STATE OUT** of the last shot of one sequence is the **first-frame anchor** of the next.
- Image models for the sheets: ask `models_explore` (`action: recommend`, `type: image`, `input: image`) for one that holds identity from a reference; upload the author's reference with `media_upload` first; quote cost and wait for the author's yes before batches.

## 3. Prompting (single inserts and general rules)

The auteur prompt (§3a) is the standard for every sequence. For a single insert or a b-roll clip, write a short prompt in the same order every time, so shots read as one film:

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
- Length is not the problem; vagueness is. A long auteur prompt where every line names this film's people, places, objects, light and sound holds; generic or poetic prose drifts. Write in the user's language.

**Seedance in practice** (from MengTo's digital-twin and making-of work): pass the start still both as `start_image` and as an image reference; 5 s clips; **draft at 480p, pick, then the final from the draft** (`seedance_2_5` takes `draft` and `draft_job_id`) — one draft per still, each visibly different; for faces, 85 mm at eye level for close shots and 50–65 mm for mediums, with a very slow push-in, a slow lateral slide or a locked-off camera. Seedance re-voices an audio reference, so it cannot hold an external voice-over's timing: lip-sync our own track afterwards (`sync_so`) or cut away. Do not switch models mid-film without the author's say-so.

Take log beneath each prompt (`prompts/Q04.md`, after the auteur prompt):

```markdown
# Q04 — Kitchen, dawn: she finds the phone (12 s, 3 shots)
Model: seedance_2_5 omni_reference · 21:9 · 1080p · 12 s · @Image 1 refs/CHAR_amara.png · @Image 2 refs/ENV_kitchen.png · @Image 3 refs/PROP_phone.png
Prompt: (the auteur video prompt above)
Takes:
- t1 job 1a2b… draft, 0.x credits — hand warps at 3 s. Rejected.
- t2 job 3c4d… draft — good timing, light too warm. Adjusted look string.
- t3 job 5e6f… final 1080p — chosen (clean hands, push ends on the phone).
```

## 4. Continuity

- Lock characters with their approved character sheet (and, where the model supports them, reference elements: Kling elements, Higgsfield reference elements), locations with their environment reference, recurring objects with their prop reference — cited as @Image N in every sequence they appear in.
- Same wardrobe, same props, same time-of-day words across a scene: the GLOBAL LOCKS and CONTINUITY LOCKS blocks of the auteur prompt carry them; keep a continuity line per scene in `SHOTS.md` so every sequence copies the same words.
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

Write `design/SOUND_BIBLE.md` with the visual bible (`score-and-sound-design.md`), and decide per take what the video model's own sound keeps, replaces and adds. **Check every take with `earshot describe`:** Seedance can slip a score under the dialogue even when the prompt names only the street and the voices (Oren's Q10 read AudioSet Music 0.85). A scored take keeps its voices through a Demucs stem (`ai-film/my-name-is-oren/tools/stems.py`) over the film's own beds. Level sequences on dialogue, run one bed under every join, and fill the generator's dead air (Oren's `audio/README.md`).

Model-generated audio is a guide at most: build the soundtrack ourselves (`sound.md`). Voice with ElevenLabs or Gemini TTS (lip-sync with `sync_so` if a character speaks on camera), score with Lyria, effects with Stable Audio 3.0 Small checked by earshot, mix to the platform's loudness. Keep the generated audio only when it is genuinely the best take and say so in `DECISIONS.md`.

## 8. Finish

Grade before the finish, in the order of `color.md`: management path (generated video is display-referred Rec.709), per-shot correction matched to the best shot (CDL in ACEScct), the author's chosen look (an OpenEmulsion look board first), grain once, framing, then measured QA. Oren's `grade/` and `tools/grade_*.py` are the worked example.

- **Upscale before text.** Upscalers and enhancers rewrite fine text (a FloWell upscale turned "1,000 ppm" into "1.000 ppn" and middle dots into dashes). Upscale and deflicker the clean picture, then lay titles, captions and graphics on top (`motion-graphics.md` for the graphics pipeline and the repair recipe if text was upscaled by mistake).
- Grade for consistency (ffmpeg `eq`, `curves`, `colorbalance`, or a `.cube` LUT with `lut3d`), add grain last so it unifies clips from different models.
- Titles, captions and end cards from `assets/gfx_template.html` via `scripts/canvas_render.js`.

## 9. Honesty and rights

- Do not generate real, identifiable people (or their voices) without their consent; no imitation of a specific film, studio style or copyrighted character.
- Label AI-generated work where it could be taken as real: a notice card at the end for corporate and product work (the FloWell "Visual simulation notice" pattern), and YouTube's altered or synthetic content disclosure when uploading realistic footage.
- Product claims in AI footage follow `motion-graphics.md` (every claim sourced; illustrative shots labelled as such).

## 10. Folder layout

`ai-film/<slug>/`: `README.md`, `design/` (TREATMENT.md, DECISIONS.md with the film bible, SHOTS.md), `prompts/` (one auteur prompt per sequence with its take log; `prompts/refs/` the filled reference prompts with chosen job ids), `refs/` (the approved sheets and stills, if they may be committed), `edit/edit.json`, `tools/` (the edit and mix scripts), `audio/`, `out/` (ignored: generated clips, renders). Start it with `scripts/new_production.py ai-film <slug> "<Title>"`.

## 11. Lessons in progress: *My Name Is Oren*

> **In progress.** These come from a production that the author has not yet signed off (`ai-film/my-name-is-oren/`, branch `ccr-a1ca9fd6-0m96vq`). The author asked for them to be recorded now. At sign-off, confirm each one against the finished film, move it into its section above, and delete this box. The running list with its evidence is the production's `LESSONS.md`.

**Reading and planning**
- **Read the author's screenplay page by page.** Render it with `pdftoppm -r 110 -png`, look at every page, and keep the text (`pdftotext -layout`). The author expects this. Number the screenplay (`tools/parse_script.py`: L01… dialogue, A01… action) and cite lines by id everywhere; never retype dialogue.
- **If the author has the prose story behind the script**, file it as the world bible (`design/story.pdf`). The screenplay stays the source of every line and event, and wins wherever the two differ.
- **Beat sheet first** (`design/BEATS.md`): one change per beat, its turn, its script ids, and its time from word counts at each character's pace (about 2.3–2.7 words a second). Then threads (names, objects, motifs) across beats. Render it to PDF on request (`tools/beats_pdf.js`).
- **Check contest rules on day one**: the length cap (often 7:00), the required tool, deadlines with their time zone, and public-posting or public-prompt rules. A public online release before a qualifying run has historically disqualified Oscar shorts.
- **Ask which platform the author generates on; never assume a connector.** When the author generates (on Dreamina, for example), Claude writes every prompt with its settings and a take log, then reviews what comes back.

**Seedance 2.5 and Dreamina**
- **Seedance 2.5 (reported):** up to about 50 references per generation (roughly 30 images, 10 videos, 10 audio), 4–30 s clips, 21:9, native lip-synced dialogue. One generation can carry two or three beats, which means fewer joins.
- **The prompt box holds about 2,000–3,500 characters** (third-party figures; no official limit found). The author's templates fill out to 5,000–11,500 characters, so keep a **short version under 3,500** beside every full one, with the same content.

**Characters and references**
- **Casting first.** `character-sheet.md` needs a reference image, so generate a casting portrait at 2:3 (crop a 16:9 one) and let the author pick.
- **Any change to the reference is an explicit override** (a condition such as hunger, or corrections), placed right after the template's opening. A condition override can age a face, so add an **age lock**.
- **Models mirror side-specific details** (which boot, which slipper, which elbow). Check every take; adopt what the approved image shows, and update the bible rather than fighting it.
- **A sheet may drop small identity tells** (a seam, a scrape). A dedicated detail sheet carries them.
- **Review takes with full-resolution crops** of faces, hands, feet and markers; the downscaled view hides flaws (wires read as a seam, a red mark as a scrape).
- **Keep real brands out**, even when the source text names one (a blank badge instead).
- **A grounded future**: buildings as they stand today, retrofitted; quiet technology that doesn't glow; clothes a few seasons on, mended. "Futuristic", "sci-fi" and "cyberpunk" appear only in negatives.

**Look and voices as text (the author's choice on this film)**
- **No style frames:** a MOVIE COLOR block (palette, influences each with its purpose, camera package, the camera grammar) is copied unchanged into every prompt, and the approved environment references carry the light.
- **No audio references:** a Voice Bible (VOICE DNA per speaking character, including the pronunciation of names) is copied unchanged into every prompt. If a voice drifts between clips, use the first approved clip's voice as the reference, or fix it in post.

**Performance and dialogue** (`design/DIRECTION.md` fills the auteur template's fields; the template is never changed)
- **Behaviour, never emotion labels.** Plain anatomy first, FACS codes as optional shorthand. Seedance reads them empirically, with no guarantee.
- **Three or four expressions per generation, one or two tells per beat.** Give every line a before, a during and an after beat.
- **A restraint scale out of 10, with a ceiling per character.** No tears unless scripted (wet eyes that catch the light, never spilling). Name every gaze target. Reactions lag 0.3–0.5 s. Listeners are never statues. Apply the anti-template test.
- **For each character, write how they change under pressure and what they must never do.** Vary the interaction verb beat by beat. Give distances in metres.
- **Never reword or trim a line to fit a shot; change the coverage instead.**
  - Decide which lines must show the speaker's mouth.
  - Hands never cross the mouth during a line, and nothing overlaps inside one generation.
  - Delivery stays mid-register.
  - Hold 0.5–1 s of room tone before impact lines.
  - Split long lines at the script's own beats.
- **Camera words in a fixed order**: size, framing, camera level (ground, knee, hip, shoulder, eye), lens in mm, movement, light, composition. "Push in, the camera travels; no zoom." A camera-height arc can carry a film's idea.
- **A private reference archive** (Cinekive, MIT; search by intention tags) helps planning. Frames from other films are never attached to a generation.

