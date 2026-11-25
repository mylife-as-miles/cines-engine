# Third-party notices

This skill adapts ideas from the projects below (summarised and rewritten in this repo's voice; see `references/external.md`). Code copied verbatim keeps its own licence file:

- `scripts/blender/camrig/` — from **anyshot** (https://github.com/apekshik/anyshot), Copyright (c) 2026 Apekshik Panigrahi, MIT. Full licence in `scripts/blender/camrig/LICENSE`; changes listed in `scripts/blender/camrig/NOTICE.md`.

Projects whose techniques are summarised (no code copied), all under the MIT licence:

- **earshot**, Copyright (c) 2026 Leon Lin — https://github.com/Leonxlnx/earshot
- **cinetic**, Copyright (c) 2026 Leonxlnx — https://github.com/Leonxlnx/cinetic
- **anyscene**, Copyright (c) 2026 Apekshik Panigrahi — https://github.com/apekshik/anyscene
- **Threejs-Awesome-Graphics-Agent-Skills**, Copyright (c) 2026 Scott Sun — https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills (its GPL-3.0 examples are not used)
- **MengTo/Skills**, Copyright (c) 2026 Meng To — https://github.com/MengTo/Skills
- **Agent Reach**, Copyright (c) 2025 Agent Eyes — https://github.com/Panniantong/agent-reach (used as an installed tool, not copied)

The MIT licence: Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Sound, score and music sources (November 2026)

- `references/score-and-sound-design.md` §6 adapts the cue-list method of **Story-Film-Skills** `skills/sound-design` by Alan Guice (Badgids), https://github.com/badgids/Story-Film-Skills, licensed under the Apache License, Version 2.0 (https://www.apache.org/licenses/LICENSE-2.0). Changes: rewritten in this repo's voice and merged with other sources; no files copied.
- **snowfrost/skill-movie** (https://github.com/snowfrost/skill-movie) has no licence file, so its methods are summarised in this repo's own words only; no text, scripts or bundled sound files are copied.
- **FME-24** (https://github.com/rubycrocker/FME-24-dataset; R. Crocker and G. Fazekas, SMC 2024) is open for research use; the findings in `score-and-sound-design.md` §5 are this handbook's own analysis. No data or audio is committed.
- **Freesound** (https://github.com/MTG/freesound) server code is AGPL-3.0 and is not included. Sounds fetched from freesound.org keep their individual Creative Commons licences and are credited per production in `audio/CREDITS.md`.
- `references/score-and-sound-design.md` adapts `references/genres/film-tv-scoring.md` from **music-composition** (https://github.com/SJY051/music-composition). Based on "Music Composition Agent Skill v1.0" by the Music Composition Agent Skill contributors, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changes: summarised and rewritten in this repo's voice, merged with other sources, composer lists left out, mechanics kept.
- `references/score-and-sound-design.md` adapts `skills/production/audio-craft/sound-design-foley/SKILL.md` from **generative-media-skills** (https://github.com/calesthio/generative-media-skills), Copyright (c) 2026 generative-media-skills contributors, MIT licence (text above). Changes: summarised and rewritten; no files copied.

## Colour sources (November 2026)

- `references/color.md` adapts `color-grading-finishing` from **generative-media-skills** (https://github.com/calesthio/generative-media-skills), Copyright (c) 2026 generative-media-skills contributors, MIT licence. Changes: summarised and rewritten.
- `references/color.md` adapts the text of the `colourist`, `colour-grade` and `reframing` skills from **Vidmoat Skills** (https://github.com/vidmoat/skills), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/); scripts there are Apache-2.0 and none are copied. Changes: summarised, rewritten and merged.
- **OpenEmulsion** (https://github.com/technomancer702/openemulsion), MPL-2.0: built and run outside this repo (`tools/oe_look.py` drives its ColorBench library); no OpenEmulsion source is included here.
- **OpenColorIO** (https://github.com/AcademySoftwareFoundation/OpenColorIO), BSD-3-Clause, used as an installed library.
- **Open Display Transform / OpenDRT** (https://github.com/jedypod/open-display-transform), GPL-3.0: referenced only; nothing is copied.
- **YuNet** face detector (https://huggingface.co/opencv/face_detection_yunet), used as a downloaded model outside the repo (see its licence there).
