# Motion graphics review 01 (from the author, 27 November 2026)

The author passed on an editorial review of `graphics_preview_1` (27 s, silent): editorial score 8.5, visual identity
9.2, cinematography and composition 8.8, motion and pacing 8.0, narrative integration 8.2, documentary clarity 8.3.
Its strongest moment: YES changing to WHEN? over the same two bags. Its five changes, and what was done:

| # | The review | Done |
| --- | --- | --- |
| 1 | The testimony is too small on a phone: move closer to the highlighted passage | `gfx/shots/s1_yes.json` zoom 3.0–3.2 → 4.1–4.35; the lit lines read at phone size, the focus band widened to keep both lines sharp. The page stays Tim's account of what Dawn told him; the voice attributes it. |
| 2 | The second YES needs a different meaning, not a repeat: narrow the spotlight, tighten the framing, hold | `yes`: the second landing is a straight cut to a 9 % tighter frame, the light closes in on the bags over 0.9 s, YES lands harder (×2.2 with the lock punch) and holds. The plate move is in `PLATE` in `gfx/type.html` so the compositor applies it to the Blender plate. |
| 3 | DEATH SENTENCE needs its legal context on screen | `death_2017` now reads DEATH SENTENCE / WITH A TWO-YEAR REPRIEVE / 2017; the reprieve is never off screen with the sentence. |
| 4 | The twelve years pass too quickly | `counter`: camera locked, 2014 holds 1.2 s, then one year a beat with the gaps growing from 0.55 to 1.0 s, 2026 lands at about 10 s and holds. |
| 5 | Keep WHEN? for the ending | Already so in script version 2: YES only at the airport (cold open, ch 4), the counter in ch 7, WHEN? only in the last shot. The reel was a showcase of the pieces, not a sequence. |

Its closing line, kept as the rule for the graphics: make an ordinary word, object or piece of evidence mean more
every time the audience sees it.

## Fresh review of reel 2 (27 November 2026, a reviewer who saw neither reel 1 nor the first review)

**6.4 / 10, fail** against 8.5; only the place super and the document passed. Its fifteen faults and what was done:

| Fault | Done |
| --- | --- |
| The mainland leg read as a check mark and ended 700 km north of the departure | The mainland is now a soft region, no line; one unnamed departure point near Guangzhou (the sourced Baiyun market) starts both dashed lines |
| Dashed lines tangled, labels off their lines, AUSTRALIA under the scrub bar | The Chicago arc dims to 30 %, every line ends on a hollow ring, labels sit in open sea, all above y 1026 |
| "2017" stayed above LIFE IN PRISON (says life in 2017) | The date fades out before the change; no date over LIFE IN PRISON |
| Type ran over the figure | One sentence card for both moments, fitted to x 0.08–0.44 W |
| Black bar under the second YES | The plate always covers the frame |
| Glyphs jumped when a line began to change | Every glyph placed from the kerned prefix width, the same as the static line |
| Screens looked like wireframes | Real, generic, unbranded text, defocused by the composite's focus band; only the prize line and the query are sharp |
| Year digits popped and jittered; old-style numerals beside capitals | Cormorant frozen to lining tabular figures; each digit rolls in a one-line mask over 0.3 s, eased |
| The map nearly disappeared; labels too small | Land #1f2833, coast 1.5 px at 30 % white, labels 30 px, rings on places |
| Frozen plates | `gfx/plate_type.py`: push, temporal grain, plate move under every type shot |
| The sentence card's qualifier was the smallest type and the date landed mid-phrase | Reprieve at 62 % of the main line, on two lines; the date arrives last |
| The suitcase handle crowded YES and the title | Second YES 40 px higher (and lands at ×1.45, so it never leaves the frame); title 30 px higher |
| The marker spilled onto the line above | The band sits on the line, about 1.3 x-heights tall; the push ends tighter (x-height about 40 px) |
| The map's moves started at full speed; the arc's apex near the top edge | Eased camera; content lowered |
| Two frames of double exposure in the word changes | The old word finishes before the new one starts |
