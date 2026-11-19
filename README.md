# cines-engine

Films, trailers and videos made with Claude, by Osita Miles. Every production lives in its own folder inside one of six studios, with its own README, its design decisions, its tools and its sound.

| Studio | Folder | What it makes |
| --- | --- | --- |
| **Claude Film** | `claude-film/` | Short films animated entirely in code (HTML canvas, a JS film engine, frame capture), with voiced narration, a score and a full sound mix: *One Too Many*, *Autopilot*. |
| **Claude Game** | `claude-game/` | Trailers, openings, credits, skies and in-engine films for games made with Claude: the Crownfall intro, prologue, arena skies and credits, and the House Ealdholt opening shot inside the game's own village. |
| **Claude YouTube** | `claude-youtube/` | Videos made for YouTube in the Claude Film way: long-form cuts, Shorts and vertical reframes, chapters, captions, thumbnails. |
| **Motion Graphics** | `motion-graphics/` | Product launches, ads and explainers: graphics layers (supers, captions, data cards, end cards) designed in code and composited over footage. |
| **AI Film** | `ai-film/` | Films made with video generation models (Seedance and others): the whole workflow, from treatment and shot list to prompts, generations, selects, edit and sound. |
| **Claude Blender** | `claude-blender/` | Animation made by Claude driving Blender (Python scenes, cameras, lights, renders). |

## Working here

- One branch per production, named after its slug and branched from `main`. The production stays on its branch until it is complete; then it merges into `main`, and the studio skill is updated with what it taught.
- One folder per production: `<studio>/<slug>/`, with a `README.md` (what it is, how to watch it, how it is built), the design documents (`design/DECISIONS.md` records what the author settled), `tools/`, `audio/` and an ignored `out/` for renders.
- The studio skill in `.claude/skills/cines-engine/` is the production handbook: how each studio works, from brief to delivery, what earlier productions learned, and the shared sound pipeline (Stable Audio, earshot, voices, score, mix). Claude Code loads it whenever a video job comes up here.
- Renders, generated audio and other large outputs stay out of git (`out/`, `audio/gen/`); private game assets and client footage are never committed.

Each production's README credits its sounds, voices and fonts.
