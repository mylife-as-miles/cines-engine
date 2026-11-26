# Q04: reference repos check

Read-only; nothing generated or run. All eight repos cloned. Wording is mine. Not mine: Q04_board.jpg, Q04_open_cup.jpg and board_q04.py changed on disk at 13:42 UTC during this check; the new first frame still shows still wine.

Prefixes: **HF** = /home/user/taohuahuangxiaoxie/video_skills/skills/higgsfield-prompt-writing/skills · **CD** = /home/user/taohuahuangxiaoxie/video_skills/skills/cinematic-director/references · **DS** = /home/user/wuwangzhang1216/DirectorSKILL/references · **SF** = /home/user/badgids/Story-Film-Skills/references · **MT** = /home/user/MengTo/Skills/agent-skills

## 1. Changes, biggest risk first

| # | Finding | Source | Change in Q04_v1.txt |
|---|---|---|---|
| 1 | **The lines do not fit their shots.** At 2.5 words/s planned (≈3 measured on Seedance), shot 5's 16 words and 2 s pause need 7.3–9.8 s, not 5.4: "Sarn Vale" lands on Serath or the pause goes. A dialogue shot wants 3–7 s; shot 4 gives 2.0 s and no hold. | DS/sound-and-dialogue.md · HF/higgsfield-seedance/FAILURE-MODES.md · HF/higgsfield-camera/SKILL.md · SF/DIALOGUE_TIMING_PREFLIGHT.md | `duration=26` (≈$5.73, +$0.88). [TIME]: 0–3.0 · 3.0–5.5 · 5.5–11.5 · 11.5–14.7 · 14.7–23.5 · 23.5–26.0. A length on each line, as in Q01. Free first: time the lines read aloud. Or make shots 1–2 their own 6 s take. |
| 2 | Timestamps are a budget; anchor lines to a visible cue. With our cut drift, "from 12.0 s" can fall in the wrong shot. | HF/higgsfield-seedance-vfx/references/dialogue-timing.md · HF/higgsfield-seedance-2-5/SKILL.md | "(from 6.8 s)" → "(after the wide has held a second, on his first lifted breath)"; "(from 12.0 s)" → "(after his one breath in)"; likewise shot 5 and "At 5.3 s". |
| 3 | Dead air beside a short line fills with mumble or a repeat: script the silence with a named sound. | HF/higgsfield-seedance/FAILURE-MODES.md | Shot 5 as three cues: the line (about 5 s) · "about 2 s, no voice: his swallow, one breath out, the air" · `THE ENGINEER again, the same voice, quieter, once: "Sarn Vale."` "to the floor" → "his eyes drop; his head stays level, his mouth in view". |
| 4 | A voice block locks sound only (register, tempo, accent, manner), verbatim. The Engineer's DNA asks for false starts and throat-clearing, against AUDIO LOCKS, and names no accent or pace. First use: the free moment to fix it. | HF/higgsfield-seedance/HELL-GRIND.md · HF/higgsfield-acting/SKILL.md · CD/sound-and-dialogue.md | Author's call: "THE ENGINEER: The high speech, older and technical: English, Received Pronunciation. A man of seventy-two with a thin, reedy tenor, dry and quiet; slow, one short sentence to a breath." Same labels everywhere, as Q01. |
| 5 | Sheets leak their grey studio and flat light; shot 5 asks for exactly that: frontal face, grey wall, front light. | HF/higgsfield-seedance-2-5/SKILL.md | Locks: "From the sheets take face, hair and clothes only." Shot 5: "behind him, soft, the curved wall and a stone bench; light from frame-right, from the arches; the left of his face falls off." |
| 6 | Visible non-speakers need a positive at-rest mouth; "nobody moves" phrases freeze the frame. | HF/higgsfield-seedance/FAILURE-MODES.md · HF/higgsfield-seedance/HELL-GRIND.md | Shot 3: "The Hierophant watches him, lips at rest, breathing; the Chancellor's eyes return to the cup, lips at rest." Delete "Nothing else moves"; "does not move" → "stands by the door, watching". |
| 7 | At 480p a medium face (110–140 px) goes soft, and small faces sync badly; in our 432 px frame the Hierophant is under 100 px on the film's first visible line. | MT/media/digital-twin/references/video.md · HF/higgsfield-audio/SKILL.md | Optional: shot 4 "close-up, from the collar up; the cap runs out of the top of the frame". |
| 8 | A handle forces its subject into frame. Cassiel is tiny, once, and a third grey old face to swap. | HF/higgsfield-seedance-2-5/SKILL.md | Drop @Image 7; describe him in one line. Add: "Each face, costume, place, voice and line stays with its one person." |
| 9 | Lock the camera during a head turn; a first frame carries state; a pair's eyelines oppose; "NO BGM" reads as a spec and audio weighs more early (both unproven in the source). | DS/blocking-and-staging.md · DS/cinematic-language.md · HF/higgsfield-seedance-2-5/VFX-PIPELINE.md · HF/higgsfield-audio/SKILL.md | Shot 6: locked off, "over 1.5 s her head turns a quarter-turn to her right". Shot 1: "From the first frame the wine is already trembling". Shot 4 "just left of the lens", shot 5 "just right". Header: "· English: two speakers, three lines, each once · NO BGM". |

## 2. What confirms the draft

- Two speakers in one generation, tagged, quoted and timed: CD/sound-and-dialogue.md (Seedance-tested; overrides upstream DirectorSKILL's one-speaker and six-word ceilings: the repos disagree).
- The Hierophant's voice text and sheet match Q01's exactly; 2.5 ties voice to the sheet (HF/higgsfield-seedance-2-5/VFX-PIPELINE.md). No guarantee.
- L03 with his back to us hides the mouth (DS/failure-modes.md, F15); head-lower and quarter-turn (DS/blocking-and-staging.md); symmetry, slow push, small figures (DS/director_styles/11_villeneuve.md).
- Sheets follow face, headless front, back; seven images sit in 2.5's stable 1–8; upload order is a tie-breaker; first-frame wording matches the vendor's (HF/higgsfield-seedance/HELL-GRIND.md, HF/higgsfield-seedance-2-5/SKILL.md).

## 3. Not found, or disagreeing

- **Prompt length:** no limit or truncation warning for 2.5 anywhere. English block prompts: no character cap; medians 1,433 words (p90 2,648), one pipeline 3,000–4,000 (HF/higgsfield-seedance/SKILL.md, HELL-GRIND.md). The draft is 2,481: cut duplicates, not length.
- **Invented words:** rare names "get a transcription" (HELL-GRIND.md); no form avoids our spoken-twice fault. Keep none; check the take's transcript.
- **Speaking too fast:** only a pace word in the voice block, and seconds per line.
- Speakers' sheets lack an open-mouth view, so teeth are invented (HF/higgsfield-seedance-2-5/SKILL.md): a paid image, later.
- Mildly against the draft: open on a one-second wide (HELL-GRIND.md).
- /home/user/apekshik/anyshot/agent/SHOTS.md (a Blender camera tool): silent on coverage, eyelines, the 180° line. cinekive: a tag taxonomy. Story-Film, screenwriting-skills: nothing Seedance-specific.
- Licences: MIT, except Story-Film (Apache-2.0); video_skills has none repo-wide (cited sub-packages are MIT); skill-movie none outside seedance-20.
