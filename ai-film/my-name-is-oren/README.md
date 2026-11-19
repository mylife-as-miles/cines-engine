# My Name Is Oren

*My Name Is Oren*, a film by Osita Miles: an AI film, made with video generation models, from the author's eight-page screenplay. On a street run by polite machines, a hungry ex-army officer stops a care android carrying someone else's lunch, and by the corner he has learned to walk at her pace. About 7½ to 8½ minutes, 2.35:1.

## Status

In development. The screenplay has been read and filed. The treatment, the open decisions, the reference list and a draft shot list are written. Nothing has been generated yet, and the video model and platform are still to be chosen by the author.

## How it is built

The workflow is the AI Film one (`.claude/skills/cines-engine/references/ai-film.md`): treatment and decisions, then the shot list, then reference sheets (characters, environments, props), then one auteur video prompt per sequence with its take log, then selects, edit, sound and finish. The author runs the generations. The look, the camera rules and every open proposal are in `design/DECISIONS.md`.

## Layout

| Path | What it is |
| --- | --- |
| `design/screenplay.pdf` | The screenplay as the author wrote it: the source of truth for every line. |
| `design/screenplay.txt` | The same, as text (`pdftotext -layout`). |
| `design/pages/page-1.png` … `page-9.png` | The screenplay rendered one page per image (`pdftoppm -r 110`): the title page and script pages 1–8. |
| `design/story.pdf`, `story.txt`, `story-pages/` | The author's prose short story *My Name Is Oren*, told by Helena (6 pages): the world bible behind the screenplay. The screenplay stays the source of every line. |
| `design/script.json` | The screenplay as numbered elements (L01–L73 dialogue, A01–A58 action), built by `tools/parse_script.py`. Beats, shots and prompts cite these ids. |
| `design/BEATS.md` | The film in 32 beats and seven movements, with each beat's turn, script ids, and timing for the 6:45 contest cut. |
| `design/BEATS.pdf` | The beat sheet as a printable PDF (A4 landscape, 7 pages), rendered from `BEATS.md` by `tools/beats_pdf.js`. |
| `design/DIRECTION.md` | Performance and intention for each beat (FACS-informed tells, delivery by line id, lip-sync rules, interaction verbs, distances, camera words and the camera-height arc). It fills the auteur template's fields and never changes the template. |
| `LESSONS.md` | What this production teaches, as it happens, and where each lesson goes in the skill at sign-off. |
| `design/TREATMENT.md` | Logline, world, people, the camera idea (feet first), motifs, what the film never shows, three looks. |
| `design/DECISIONS.md` | What is settled, what is proposed and waiting for the author, and the draft film bible (look string, camera package, identities, Voice DNA). |
| `design/REFERENCES.md` | The character sheets, environment references and prop references to make, and what is made in code instead. |
| `design/SHOTS.md` | The 22 generations of 20 s (Q01–Q22) for Seedance 2.5: the beats in each, lengths, lines, images to attach, continuity, and the order of generation. The first 41-sequence draft is in `design/archive/SHOTS_draft1.md`. |
| `prompts/`, `prompts/refs/` | Auteur prompts per sequence and filled reference prompts (to come). |
| `tools/parse_script.py` | Builds `design/script.json` from `design/screenplay.txt`. |
| `tools/beats_pdf.js` | Renders `design/BEATS.md` to `design/BEATS.pdf` with the pre-installed Chromium (`node tools/beats_pdf.js`). |
| `refs/`, `edit/`, `audio/` | Approved references, the edit list, sound and scripts (to come). `out/` is ignored. |

## Credits

Written and directed by Osita Miles.
