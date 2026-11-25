# The Weight of Heaven

*The Weight of Heaven*, written by Osita Miles. A short film of about fourteen minutes made with video generation models: a floating kingdom, sinking under its own weight, is brought down out of the sky by the admiral sent to save it. Eleven scenes, about 140 shots, 2.39:1.

Status: pre-production. The reference set is locked: 64 approved images in `refs/` (locations, props, ships, character sheets, supporting characters, crowds), each with its prompt, every take and its verdict under `prompts/refs/`. Next: voices, then the shot list and the video prompts.

## Watch

Nothing to watch yet.

## How it is built

Treatment, decisions and the film bible first (`design/`), then a reference still for every character, location and recurring prop, approved by the author, then one auteur video prompt per sequence (`prompts/`), drafts before finals, selects, an edit list built with ffmpeg, our own sound, and a finish that mattes to 2.39:1, grades, adds grain and sets the supers and title. The handbook is `.claude/skills/cines-engine/references/ai-film.md`; the author's prompt templates are in `.claude/skills/cines-engine/assets/ai-film/`.

## Layout

| Path | What it is |
| --- | --- |
| `design/source/` | The screenplay (third draft) and the Visual Bible (v1), the production's sources of truth |
| `design/TREATMENT.md` | The film on one page: logline, deliverable, look, people, what it never shows, structure |
| `design/DECISIONS.md` | What is settled, what the bible proposes, what is still open, and the film bible blocks for the templates |
| `design/SHOTS.md` | The shot list, one row per shot |
| `prompts/` | One auteur prompt per sequence with its take log; `prompts/refs/` the reference-still prompts with chosen job ids |
| `refs/` | Approved reference stills |
| `edit/edit.json` | The edit list |
| `tools/env_prompts.py`, `prop_prompts.py`, `char_prompts.py` | Build the location, prop and ship, and character prompts from the author's templates and this film's bible |
| `tools/fal_seedream.py` | Generates on fal (Seedream 5.5, Nano Banana Pro, Nano Banana 2.1), saves previews and logs every take |
| `tools/` | Edit, finish and mix scripts |
| `design/VOICE_BIBLE.md` | How everyone speaks: registers, a Voice DNA paragraph per speaker, delivery, rooms, how the voices are made |
| `audio/lines.json` | Every spoken line, exactly as written, with speaker, scene, direction and room |
| `audio/` | Sound sources and mix |
| `out/` | Generated clips and renders (not committed) |

## Credits

Written by Osita Miles. Visual Bible by Osita Miles. Voices, music, sounds and fonts to be listed as they are made, with licences.
