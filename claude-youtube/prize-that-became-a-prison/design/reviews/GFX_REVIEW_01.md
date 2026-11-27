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

## Fresh review of reel 3 (27 November 2026, a third reviewer who had seen nothing before)

**7.0 / 10, fail** (up from 6.4); the document passes at 8.5. What was done for reel 4:

| Fault | Done |
| --- | --- |
| The mainland glow lit Taiwan under MAINLAND CHINA (a statement the sources do not make) | The region is now mainland China's own outline (Natural Earth admin 0, public domain; Taiwan, Hong Kong and Macau are separate features), lit at +12 % with a 1.5 px edge (`design/gfx/regions.json`) |
| The label sat in the Pacific | Over the mainland's interior, on the land |
| Both dashed lines left the ring labelled Hong Kong | The Hong Kong ring and the Chicago arc fade to 5 %; the lines leave from inside the mainland, with no pin |
| The Australia line ended on Sydney, a city no source names | An open arrowhead at the continent's centroid, no ring; QINGDAO (named in the sources) keeps its ring |
| The search typing glitched backwards and the caret never blinked | A fixed human rhythm (3-4 frames a letter, a pause after spaces), never backwards; the caret blinks once the query is done; the shot opens at 2.1x on the field and pulls back as results arrive |
| Digit rolls showed outside the cell | Each digit masked to its own cell (cap line - 2 px to baseline + 2 px), fading at the edges, 5 frames |
| The second YES's cap top was 24-27 px from the top, the handle tangent to the Y | YES at a cap top of about 99 px on the native, lens-shifted plates; the tighter crop is centred higher |
| The cut-away read as a bare diagram, red outlining a laser-like gap, empty | Stitches along the whole edge and through both layers, red only on the stitches; a flat neutral unlabelled layer in the opened space (no packets, no substance); a larger slab |
| "2017" vanished in one frame | It leaves letter by letter like every other change |
| The calendar's years started 49 px from the edge | Its left edge stays 120 px or more in |
| The prize line was about 21 px caps; the OVERWEIGHT ghost spoiled the reveal | The email push ends at 1.75x on the prize line; the scale shot pushes 1.35x onto the display, the unlit legend at 3.5 % |
| The counter was nearly static for 14 s | A real eased pull-back, 1.6x to 0.7x: the cell shrinks into the dark as the years pile up |
| "REPRIEVE" orphaned on its own line | WITH A TWO-YEAR REPRIEVE on one line, as wide as the block allows |
| The LIFE IN PRISON figure has a sculpted face and reads as another person | Not changed here: the matte-statue faces are the settled character design (DECISIONS, Character asset). The figure reading as a man comes from the hidden bun in the frontal pose, which Codex is fixing in void_stage (a 68-degree turn that shows the bun) |

## Reels 4 and 5 (27 November 2026, a fourth and a fifth reviewer, each seeing nothing before)

Reel 4: **7.5**, six pieces at the bar (YES twice, the mail client, the statement, LIFE IN PRISON, the cell count,
WHEN?). Reel 5: **7.2** (a different reviewer; the scale display at the bar, the cards close). The scores have
levelled around 7.2-7.5; the maps stayed the weakest (5-6.5) through every round, so for reel 6 they were rebuilt as one
system rather than tweaked.

| Fault (reels 4-5) | Done for reel 6 |
| --- | --- |
| Map labels crossing other countries (MAINLAND CHINA's leader over Korea and Kyushu, QINGDAO over the Sea of Japan, HONG KONG on Luzon) | No leader lines; place names on open water (Hong Kong and the mainland's days in the Philippine Sea east of Taiwan) or inside the lit land (QINGDAO right-aligned to its dot); one size, 48 px semibold, the day counts 68 px |
| Dashed routes nearly invisible on a phone | The arc's weight: 4 px near-white dashes over a dark under-stroke, a soft glow and a moving head |
| The Australia line ended on the coast near Darwin: an arrival she never made | It stops in the Timor Sea with an open chevron; Australia itself is lit like the mainland |
| Maps and seam plates were dead stills | Fresh grain every frame on the maps and the seam shots; the map camera keeps a slow drift; plate and trace push together |
| The statement crop left "went to the Baiyun" beside "airport security" | The push is framed so "Baiyun Leather" reads whole (the market the sources name, never the airport) |
| Year rolls sliced the digits | A six-frame cross-fade with a 12 px slide, no mask |
| The cut-away: off-centre, a short opening, flat | Centred, opens wider and holds 1.5 s, lighter top and darker sides, a contact shadow; still opens on the tote's seam (match cut). **Not done:** a packet drawn in the gap, which the reviewer asked for; the film's rule is schematic only, no packets |
| The search never finished and the page was mostly blank | The query ends by about 3 s; suggestion rows drop under the field while it is typed |
| YES landed like a stock slam, cut by the frame | It lands from its centre at about 115 %; the second is 12 % larger and lower |
| Thin secondary type | One secondary size, 48 px semibold (cap height about 30 px); the reprieve breaks at its own hyphen (WITH A TWO- / YEAR REPRIEVE) |
| "2017" popped off before the rest of the card | It leaves letter by letter with the card |
| A stale texture in reel 4 (the search and the scale display) | The reel build re-renders every texture first; a page error now stops the render |

Not changed, by design: WHEN? sits over the void bags because the film cuts from the inspection-room bags into the void
on that line (a registered match cut); the statues' faces are the settled character design; "Baiyun" names the
market.

## Reel 6 (27 November 2026, a sixth reviewer, seeing nothing before)

**7.2, fail** against 8.5. At the bar: the statement page (8.5). Close: 2014 / CHINA, YES, the date over the chair,
WHEN? (8.0). Weakest: the two-line map (5.5), the search and the calendar (6.0). Reviewers keep disagreeing about the
digit change (reel 4 asked for no slicing, so reel 5 went to a cross-fade; reel 6 calls the cross-fade a smear), so
reel 7 takes the odometer every reference uses and feathers its edges, which answers both.

| Fault (reel 6) | Done for reel 7 |
| --- | --- |
| The Qingdao line forked off the Australia line at sea | One origin point by Guangzhou for both disputed flights; the Qingdao line leaves north over the lit mainland (a domestic flight), bowing inland, and stops short of the city's ring; both lines end in the same open arrowhead (neither flight is resolved) |
| "QINGDAO" with its dot read as "QINGDAO." | A ring, not a dot; the name above and left of it, never on its line |
| MAINLAND CHINA floated in the Pacific | The section now moves twice: in on the mainland (2.5x) while it is named, the label inside the lit land where China is widest, then back and south as the Australia line draws; map labels are sized on screen, not on the map |
| Digit changes cross-dissolved | An odometer: the old and new digit one row apart at full opacity, the row's own height, its top and bottom feathered; digits drawn at whole pixels and moved at sub-pixel offsets |
| The year juddered on its slow descent | Drawn at a fixed baseline offscreen and placed with a sub-pixel offset |
| "WITH A TWO- / YEAR REPRIEVE" broke a compound; 2017 came last | A justified pair, DEATH SENTENCE over TWO-YEAR REPRIEVE at one width (683 px), the date first |
| One-frame jolts: the second YES's lock punch; the card's spacing at the change | No punch; reveal now places every word where the line's own setting puts it, so a change in place never moves a letter |
| WHEN?'s W over the fading Y | The new word starts once the last old letter is below 10 % |
| Elements under YouTube's top bar | The arc framed lower (apex about y 120); YES 18 px lower; the counter 82 % size, cap top about 114 px, clear of the cell |
| The mail client's focus stepped line by line; grey bars for the sender | A continuous depth of field (the blur grows smoothly with distance, the same above and below); the sender is ordinary generic text the focus keeps soft |
| The search page was 60 % empty; a fixed typing rhythm | Two pages like a real search: a home page with the field in the middle and suggestions under it, then on Enter a full results page (results, a side column, related searches) with a rack focus to the query; typing 2-6 frames a letter |
| The cut-away looked like a slide-deck primitive | The tote's cognac leather with a fine pebble grain, a key-light sheen on the near edge, darker sides, a twill lining, edges at 15 %; still schematic, nothing inside |
| The scale display read as a printed card; the limit was a 2 px tick | A backlit panel with a faint LCD grid; the limit has notches above and below, and the excess past it is hatched (no colour) |

Not changed: the calendar and the counter keep different layouts (different plates and moments: the calendar sits beside
the bags, the counter over the cell). New in reel 7: the cold open's flash-forward montage, the chapter titles (chapter
1 shown), the chapter 4 split frame, the chapter 7 statement (Tim's line about his father).
