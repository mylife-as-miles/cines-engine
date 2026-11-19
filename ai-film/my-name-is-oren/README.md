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
| `design/script.json` | The screenplay as numbered elements (L01–L73 dialogue, A01–A58 action), built by `tools/parse_script.py`. Beats, shots and prompts cite these ids. |
| `design/BEATS.md` | The film in 32 beats and seven movements, with each beat's turn, script ids, and timing for the 6:45 contest cut. |
| `design/TREATMENT.md` | Logline, world, people, the camera idea (feet first), motifs, what the film never shows, three looks. |
| `design/DECISIONS.md` | What is settled, what is proposed and waiting for the author, and the draft film bible (look string, camera package, identities, Voice DNA). |
| `design/REFERENCES.md` | The character sheets, environment references and prop references to make, and what is made in code instead. |
| `design/SHOTS.md` | First draft shot list (41 sequences, 9:13 before trims). It predates the beats and the 7-minute contest cap, and will be re-cut to `BEATS.md`. |
| `prompts/`, `prompts/refs/` | Auteur prompts per sequence and filled reference prompts (to come). |
| `tools/parse_script.py` | Builds `design/script.json` from `design/screenplay.txt`. |
| `refs/`, `edit/`, `audio/` | Approved references, the edit list, sound and scripts (to come). `out/` is ignored. |

## Credits

Written and directed by Osita Miles.
