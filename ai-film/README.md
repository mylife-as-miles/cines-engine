# AI Film

Films made with video generation models (Seedance and others): the entire workflow kept with the film, so it can be repeated and improved. The treatment, the shot list, the reference stills and character sheets, every prompt and its settings, which take was chosen and why, the edit, the sound and the finish.

Each film gets its own folder: `ai-film/<slug>/` with a `README.md`, `design/` (treatment, `DECISIONS.md`, `SHOTS.md`), `prompts/` (one file per shot, with every generation's model, settings, seed and result), `refs/` (reference stills, if they may be committed), `edit/` (the edit list), `tools/`, `audio/` and an ignored `out/` for the generated clips.

How to make one: `.claude/skills/cines-engine/references/ai-film.md`.
