---
name: cines-engine
description: Production handbook for the cines-engine studios — films, trailers and videos made with Claude. Use it for any video job in this repo or for Osita Miles, even if "skill" or "cines-engine" is never said — an animated short made in code (Claude Film, like One Too Many or Autopilot); a trailer, opening, credits or in-engine film for a game made with Claude (Claude Game, like Crownfall or House Ealdholt); a YouTube video, Short, cut, thumbnail or captions (Claude YouTube); a product launch, ad or explainer with supers, captions, data cards or disclaimers (Motion Graphics, like FloWell); a film made with Seedance, Kling or other video models, with reference sheets, auteur video prompts and shot lists (AI Film); or animation made by driving Blender with Python (Claude Blender). Also for online reference research, the shared sound work (voice-over, score, Stable Audio, earshot, mixing to LUFS) and fixing, re-cutting, upscaling or re-titling a finished video.
---

# cines-engine studios

Six studios, one way of working. Every production is a folder `<studio>/<slug>/` that holds its own README, decisions, tools and sound, so it can be rebuilt and changed long after it was made. The author is Osita Miles; credit "a film by Osita Miles" unless told otherwise.

## Pick the studio, then read its reference

| The job | Studio folder | Read |
| --- | --- | --- |
| Short film animated in code: canvas sets and characters, a JS film engine, narration, score | `claude-film/` | `references/claude-film.md` |
| Trailer, opening, prologue, credits, skies or in-engine film for a game made with Claude | `claude-game/` | `references/claude-game.md` |
| A video for YouTube: long-form, Short, a YouTube cut, chapters, captions, thumbnails, post copy | `claude-youtube/` | `references/claude-youtube.md` |
| Product launch, ad, explainer: graphics layers over footage or previs, VO, score | `motion-graphics/` | `references/motion-graphics.md` |
| Film made with video generation models (Seedance, Kling, …): treatment → prompts → selects → edit | `ai-film/` | `references/ai-film.md` |
| Animation made by Claude driving Blender (bpy scenes, cameras, lights, renders) | `claude-blender/` | `references/claude-blender.md` |

Always also read `references/sound.md` when the job has any audio (it almost always does), and `references/environment.md` before the first render in a session (headless browser, GPU-less WebGL, memory, disk and size limits). `references/research.md` is how to look things up (built-in web search first, then Agent Reach for YouTube, Reddit, GitHub, X and clean page reading) without leaking private details. `references/external.md` summarises the outside skill libraries this handbook learned from, with pointers for deeper techniques (three.js graphics, Blender, cinematic camera language, motion design).

A job can span studios: a game trailer for YouTube is Claude Game for the picture and Claude YouTube for the packaging; a product video with AI shots is AI Film for the shots and Motion Graphics for the graphics. File it under the studio of its main deliverable.

## The way of working (every studio)

1. **Brief and decisions first.** Restate the brief in a few lines: what, for whom, length, aspect, deliverables, deadline. Ask only what you cannot reasonably decide. Record every choice the author settles in `design/DECISIONS.md` (a two-column table: Decision | Choice, with the reason) — it is the memory of the production, and later sessions will read it before changing anything.
2. **Start the branch and the folder.** Every production lives on its own branch, named after its slug, from `main` (`git checkout -b <slug> origin/main`), and stays there until the author signs it off. Then `python3 .claude/skills/cines-engine/scripts/new_production.py <studio> <slug> "<Title>"` (README, DECISIONS, the studio's folders, an `.gitignore` for `out/` and generated audio).
3. **Look before building.** Draw style frames, keyframes, a board or test stills and let the author choose between two or three looks before any long render. Cheap pictures settle taste; long renders do not.
4. **Build in code, deterministically.** Every frame should be reproducible from source: time is a parameter, not the wall clock; random numbers are seeded; assets have paths in the repo or a documented location.
5. **Look at your work.** Before sending anything, look at it: `scripts/contact_sheet.py` on the render (whole film, and crops of the smallest text at full size), listen to the mix's hardest moments, check frame count and duration with `ffprobe`. Report what you checked; never claim a full watch you did not do.
6. **Sound is half the film.** Voice, score, effects, room tone, mix and loudness — `references/sound.md`.
7. **Deliver and document.** Send the file (`SendUserFile`; under 400 MiB), and update the README (what it is, how to watch, how it is built, layout, credits) and DECISIONS. Commit source, not renders, to the production's branch.
8. **When the author says it is complete: merge to `main`, then update this skill.** Merge the production's branch into `main` (a pull request if the author wants one), and only then, on `main`, write what the production taught into the skill: its studio reference (new tools, numbers, settings that worked), the principles here if one changed, a line per lesson. The skill always describes finished, accepted work; experiments on a branch do not change it until they are signed off.

## Principles the productions taught

- **The author's taste decides; offer real alternatives.** Three looks drawn as the same three moments (Autopilot's `frames/BOARD_looks.jpg`) beat a description of three looks. When the author picks, write it down and keep to it.
- **Restraint carries emotion.** Autopilot never shows the inside of the car at the end; a line that names the film's idea right after the human consequence was cut. Prefer what the audience discovers to what it is told.
- **Text is part of the picture.** Subtitles name their speaker ("Emily: …"); captions stay legible on a phone (`motion-graphics.md` §8); a bigger caption can cover a disclaimer — check every card.
- **Upscalers rewrite text.** Upscale the clean picture, then add graphics. If a texted video was upscaled, repair it with the mask recipe in `motion-graphics.md` §9.
- **Fix the cause, cut nothing silently.** A YouTube cut rebuilds the soundtrack on its new clock rather than chopping the mix; a re-voiced line gets three takes ranked before one is chosen.
- **Honesty.** Sources on every claim; "illustrative" where it is; a notice card for simulated or AI visuals; YouTube's synthetic-content disclosure for realistic generated footage; no real person's likeness or voice without consent; no recreation of someone else's film, game or characters.
- **Speed when the author is under deadline, quality otherwise.** Under a hard deadline, ship the best version that fits (a stills trailer beat no trailer) and say plainly what a fuller version would take. When the deadline lifts, do it properly.

## Review before the author sees it

For anything the author will judge (looks, a cut, a thumbnail set), get an independent read: one or two fresh subagents that see only frames and a contact sheet — "picture alone first": what does each beat say without the words? — score a fixed rubric for the studio, name at most five fixes most damaging first, and pass or fail against a stated bar. The lower score counts; fix what they agree on; stop when two rounds do not improve, and tell the author plainly what is still short.

## What this skill ships

| Path | Use |
| --- | --- |
| `scripts/new_production.py <studio> <slug> "<Title>"` | Start a production folder with README, DECISIONS, the studio's folders and `.gitignore`. |
| `scripts/contact_sheet.py video out.jpg [times] [--crop] [--scale]` | Look at a render: evenly spaced or chosen frames, or one crop at full size. |
| `scripts/canvas_render.js page.html stills|seq …` | Render a graphics page frame by frame (stills to review, `.mov` with alpha or opaque `.mp4`). |
| `assets/gfx_template.html` + `assets/plan_example.json` | Supers, route bar, captions, product title, end card and notice card, all driven by one JSON plan. |
| `assets/ai-film/` | The author's AI Film templates: environment reference, character sheet, prop reference, auteur video prompt. |
| `scripts/blender/camrig/` | Blender camera rigs from a `shots.json` (vendored from anyshot, MIT): framing sheets, lens charts, previews, finals. |
| `references/*.md` | One per studio, plus `sound.md`, `environment.md`, `research.md`, `external.md`. |
| `THIRD_PARTY.md` | Licences of the outside work this skill adapts. |

## Keys, privacy and private assets

API keys live in the environment (`ELEVENLABS_API_KEY` and the Gemini key are provided there; Higgsfield is an MCP connector) — never in the repo, a commit, a log or chat. Do not send the user's name, email or project details to outside services unless they ask. Private game assets (for example the Elderbloom village in the House Ealdholt repo, fetched from the private Crownfall releases) and client footage are never committed, hosted or forwarded; render from them locally and commit only code and documents. Do not push to the game repos from here.

## Git

- **One branch per production**, named after its slug (as `autopilot`, `one-too-many`, `crownfall-intro` were), branched from `main`. All of the production's commits go there; push it after each working session so nothing lives only in the container.
- **Completed means the author said so.** Then the branch merges into `main` (open a pull request only when the author asks for one; otherwise merge and push `main` once they have signed off), and the skill update follows on `main` (way of working, step 8).
- Commit messages say what changed and why, in the README style: plain, specific prose. Large outputs stay ignored (`out/`, `audio/gen/`, renders); if a deliverable must be kept, send it to the author rather than committing it.
