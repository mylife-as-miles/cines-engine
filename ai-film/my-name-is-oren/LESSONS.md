# My Name Is Oren: lessons (running list)

What this production teaches, kept as it happens. At the author's request (2026-11-19) these are **also** in the skill now, as `.claude/skills/cines-engine/references/ai-film.md` §11 (marked "in progress") and in `references/external.md`. **At sign-off:** confirm each lesson against the finished film, move the confirmed ones into the right section of `ai-film.md`, drop what didn't hold, and delete §11's in-progress box.

| # | Lesson | Evidence in this production | Goes to (at sign-off) |
| --- | --- | --- | --- |
| 1 | Read the author's screenplay page by page, as rendered images, and number its lines (L/A ids); cite by id, never retype. | The author asked for page frames; `design/pages/`, `tools/parse_script.py`, `design/script.json`. | §2 Workflow |
| 2 | The prose story behind a screenplay is the world bible; the screenplay wins where they differ. | `design/story.pdf`: AI got cheaper, not smarter; patched-up rented bodies; Oren's shirt. The story ends "Slow down, buddy", the screenplay "Slow down, Oren". | §2 Workflow |
| 3 | Beat sheet with turns, ids, timing from word counts, and threads; a PDF render on request. | `design/BEATS.md`, `BEATS.pdf`: 32 beats, 7:42 natural, 6:45 target. Found the film's spine: "Oren" said by Helena only once. | §2 Workflow |
| 4 | Check contest rules on day one: length cap, tool, deadline and time zone, public-prompt and public-post rules, and Oscar eligibility. | 1 Billion Summit (5–7 min, Dreamina Seedance) and the Higgsfield Talent Contest (3–7 min, made in Higgsfield, public prompts and a public post). | §2 Workflow (new: contests) |
| 5 | Ask which platform the author generates on; never assume a connector. | Higgsfield was wrongly assumed at first; the author generates themselves. | §1 Tools |
| 6 | Seedance 2.5 limits (reported): about 50 references, 4–30 s, 21:9, native lip-sync. | Third-party sources, cited in the chat log; to verify on Dreamina's live UI. | §1 Tools, §3 Prompting |
| 7 | Dreamina's prompt box is about 2,000–3,500 characters, so keep a short version (under 3,500) beside every full template prompt. | ENV and PROP prompts are 10,000–11,500 characters in full, and 2,700–3,400 short. | §3a Templates |
| 8 | Casting before sheets; crop to 2:3; review with full-resolution crops. | `refs/CAST_*`; Oren came back 16:9; wires and a red mark only showed in crops. | §3a Templates |
| 9 | Changes to a reference are explicit overrides; a condition override needs an age lock. | Helena's hunger override aged her about ten years (sheet t1); v2 adds AGE LOCK. Result: *pending*. | §3a Templates |
| 10 | Models mirror side-specific details; adopt the approved image's sides. | Helena's loose sole (right, not left), her patch (left elbow), Oren's tape (right slipper), Oren's seam (right, not left; Q03 t1), Oren's bag (left hand; Q02 t1). | §4 Continuity |
| 11 | A sheet can drop small tells; a dedicated detail sheet carries them. | Oren's sheet t1 lost the seam and scrape; `CHAR_oren_detail` carries them. Result: *pending*. | §4 Continuity |
| 12 | Keep real brands out, even if the source names one. | The story's badge says "Grok"; the film's badge is blank. | §9 Honesty |
| 13 | A grounded future: today's buildings retrofitted, quiet technology, clothes a few seasons on and mended; sci-fi words only in negatives. | The author asked for "future, not sci-fi or cyberpunk, fashionable"; Helena's casting take hit it first time. | §3 Prompting |
| 14 | Look and voices can travel as text (a MOVIE COLOR block and a Voice Bible) instead of style frames and audio references; the fallback if a voice drifts. | The author's choice. Voice consistency across clips: *pending*. | §3a Templates, §7 Sound |
| 15 | Performance direction fills the template's fields: behaviour not labels; 3–4 expressions per generation; before/during/after each line; a restraint scale; no unscripted tears; named gazes; staggered reactions; pressure and must-not lines; interaction verbs; metres. | `design/DIRECTION.md`. Whether Seedance plays it: *pending*. | §3 Prompting (new: performance) |
| 16 | Lip-sync and coverage: never trim a line; mouth visibility per line; hands off the mouth; no overlaps in a generation; mid-register; room-tone silence; split long lines at the script's beats. | `DIRECTION.md`; the 50-word doors line (L61) is the test. Result: *pending*. | §3 Prompting, §6 Edit |
| 17 | Camera words in a fixed order, with a camera-level arc; a push-in is never a zoom. | `DIRECTION.md`, from ShotBench, CineTechBench, CineScale and MovieNet. | §3 Prompting |
| 18 | A private reference archive (Cinekive) for planning; frames from other films are never attached to a generation. | The author's pointer; `DIRECTION.md`. | §9 Honesty, `research.md` |

| 19 | Set 21:9 on every generation, and check: the first take came back 16:9, so 2.35:1 crops 12% top and bottom. Check that framing survives the matte. | Q01 t1 came back 854×480. | §3a Templates (2.35:1) |
| 20 | A plain, evenly lit grey screen is a natural key: the composited UI sits behind fingers without rotoscoping. Still ask for the finger to hover, not touch. | Q01 t1 shot 5. | §8 Finish |
| 21 | Keep good shots and regenerate only the failed ones as a short pickup, starting from the frame at the cut. | Q01 t1: shots 1–3 kept, a pickup for 4–6. *Pending.* | §5 Review and selects |
| 22 | A held prop needs "held, never set down": told that the bag "stops", the model put it on the ground. | Q02 t1 shot 5. | §3 Prompting |
| 23 | Without speech recognition, a voice-band loudness map still shows whether lines fall in the right shots, but the words need ears or speech recognition (huggingface.co must be allowed for Whisper models). | Q02 t1: three bursts in the calling shot; the last line at 19.2 s. | §5 Review and selects |
| 24 | Write eyes as open with a named gaze: "her eyes drop" made the model close her eyes, and she read as asleep. | Q03 t1 shot 5. | §3 Prompting |
| 25 | Check frame 0 of every take for a stray frame, and trim it. | Q03 t1 (frame 0 differs from frame 1). | §6 Edit |

Rows marked *pending* need a generated result before they can be called a lesson.
