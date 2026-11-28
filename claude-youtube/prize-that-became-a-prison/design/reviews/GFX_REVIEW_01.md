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

## Reel 7 (27 November 2026, a seventh reviewer, seeing nothing before)

**7.7, fail** against 8.5 (up from 7.2). At the bar: YES twice, the one-second seam, the full seam, the statement's
second page, YES → WHEN? (8.5). Weakest: the two-line map and the cut-away (6.5), the split frame and the mainland
map (7.0).

| Fault (reel 7) | Done for reel 8 |
| --- | --- |
| "9 DAYS" may sit on the wrong leg | Checked against the sources: S1 gives nine days in Hong Kong and nine more on the mainland, so both labels stand |
| The cut-away seemed to show a packet in the wall (a lighter hatched fill); the leather read as a plank | The hidden space is drawn in the ground colour with only a faint dashed edge, empty (the narration says "authorities say", so nothing is shown inside); thin stitched leather (42 px) and lining (18 px) |
| The Qingdao line had a right-angle elbow; its hollow marker read as ⊘ | One smooth arc; the marker filled, so no coastline shows through |
| Outlines thickened with the zoom and the coast grew spikes | Screen-constant strokes (land 1.1 px, region 1.4 px) with round joins, on Natural Earth 1:50m land; the region stroked on its frontier only |
| The coastline ran through AUSTRALIA | Every label masks the lines under it |
| The sentence card was too small for a phone | About 12 % larger, the figure moved clear of it |
| The two totes in the split did not look like one bag | The right tote graded to the left (dE 0.8 on the front panels), on Codex's native 2560 plate without the raised blob |
| The chapter title clipped the framed print; "01" too dim | The block clear of the print; the number brighter (0.82) on a soft shade |
| The ring at the mainland's line acted as a pin | No departure marker: each disputed flight rises out of the lit land from its own unmarked point |
| The page 1 marker strokes ended at different points | Per-mark padding, so each stroke ends exactly at its line's last character |
| The year rolls showed stacked half-digits for three frames | A five-frame roll with a slot feathered at 12 % of the cap height and a vertical motion blur |
| The film title was a stock fade | The two lines staggered 0.3 s with a slow 1.5 % drift |
| The search opened on a second of soft grey | Typing from the first frame |
| The tighter YES crowded the suitcase handle | The overshoot cut from 1.25x to 1.12x, the word placed clear |
| OVERWEIGHT was soft | The plate's focus racks onto the display as the push lands, so the word is crisp when it holds; the plate is now the native 2880 render |

**After reel 8 was built (the animatic):** Codex re-rendered the evidence purses (8d47b04) and the tote turned mustard,
so the split's fixed match left a mustard tote beside a brown one. The split now refits its match on every run (raw
dE 1.0), and Codex has the numbers to bring the tote back to cognac in every stage. Chapter 3's title sits lower on the
new hotel plate, clear of the headboard rail. The editor dropped HONG KONG / 9 DAYS from the street wide: the route
map puts both on screen 2 s earlier.

## Reel 8 (28 November 2026, an eighth reviewer, seeing nothing before)

**7.5, fail** against 8.5. At the bar: 2014 / CHINA, the sentence card, the chapter title, JANUARY 25, 2026 and
WHEN?. Weakest: the cut-away (5), the search and the two-line map (6.5), the split frame (6.5).

| Fault (reel 8) | Done for reel 9 |
| --- | --- |
| The cut-away's lining was invisible on a phone and the slab looked like a slide-template plank | A pale lining, both layers lit by the plates' soft key, matched grain, and the gap held open about 1.5 s |
| The Qingdao line seemed to arrive at a bullseye; the two disputed legs were treated unequally | No ring; both lines end the same way, in the same open arrowhead with the same gap |
| "9 DAYS" at Hong Kong | Checked: S1 gives nine days in Hong Kong and nine on the mainland. It stands |
| The search double-exposed over the app tiles, and the query ended unreadably small | The dropdown pops opaque; the pull-back ends tighter on a darker query |
| Statement page 1: the marker ran into "not", and the type was small | Each stroke ends past its closing quote; both pages pushed in further |
| The split frame had no warm half | The gift half graded warm (an amber key on the table) |
| The title had no identity, and its lines ticked by a pixel | THE PRIZE THAT in small tracked caps over a hairline rule, BECAME A PRISON large; drawn offscreen and placed at fractional positions |
| The statement pages' push-in started with a jolt | Eased in over about 12 frames |
| The year counter's cadence was uneven, and 2014 crowded the cell roof | Roll times from one monotonic curve; the year raised |
| The mainland fill left out Hainan; slivers in the Arctic islands | Every PRC polygon filled except Hong Kong, Macau and Taiwan (Hainan was lit in reel 9; the reviewer's second claim was false); the map clipped in the far north |
| Map labels popped off at the joins | Not changed: in the film each map piece is separated by plate shots, so a label leaving with a straight cut is a cut |
| Left margins drifted between 132 and 145 px | One margin (140 px, measured to the ink) for every story super |

## Reel 9 (28 November 2026, a ninth reviewer, seeing nothing before)

**7.3, fail** against 8.5. Best: 2014 / CHINA, the sentence card, the chapter title, LIFE IN PRISON, page 2,
JANUARY 25, 2026 and WHEN? (8.0). Weakest: the cut-away (6.0), the mail, the two-line map and the calendar (6.5).

| Fault (reel 9) | Done for reel 10 |
| --- | --- |
| The scale shot's camera reversed at frame 16 (+3.4 to −11.7 px a frame) | The push's two ends are clamped to the crop the plate allows, not its path, so the centre moves on one eased line (−6.7 easing to 0 px a frame, never reversing) |
| The digit rolls in the calendar and the counter showed 3-4 stacked copies | A 16-sample shutter blur on the roll, weighted to the motion, in place of the stacked copies |
| The mail's prize line had a 24 px cap height | Pushed 1.83x further (cap 45 px, the line across 64 % of the frame) with a sliver of bezel kept; the mail client's sidebar narrowed to make room |
| The mail push hitched at 38.21 s | Fixed by the same endpoint clamp |
| The cut-away read as a plank or a book cover, and the lining hinged like a lid | Fine pebble grain, a painted rounded edge, a bow matched to the seam it is cut from, and a lining that stays stitched at the lip and runs parallel below the leather. In the split it fills 85 % of the half |
| The two-line map left the right 55 % empty, with dashes about 4 px | Centred on 120 E 15 N at about 1.8x, 5.5 px dashes with a dark edge and a 2 px glow, a steady 3 % push. AUSTRALIA sits on open water west of the Kimberley, because no strip of land in frame is wide enough for the name |
| "Is this contest legitimate?" was out of focus in the caption band | The camera drifts the result to y 550 and the focus racks to it |
| The highlighter swiped in 7 frames, khaki with a wide feather, on greyish paper | 20-frame eased swipes; a pale yellow with a 2-3 px edge; the paper lifted to about 225 |
| 2014 / CHINA and JANUARY 25, 2026 sat in the caption band | Lowest baseline 822 |
| The second YES was too weak | A 1.4x push, the light closed to a spot, and the word placed over the bags |
| The mail roll's weight flickered (bold snapping) | Each phrase drawn once into its own bitmap; only position and opacity animate |
| The map's moves braked in about 6 frames | A velocity curve that lands in a 25-33 frame cubic ease-out, straight into the push |
| The seam's head was a soft salmon blob | 10-12 px in the line's own red, with a hot core and a 1-2 px bloom. The line is 2.5-4 px wide and follows the leather's light |
| The OVERWEIGHT display read as printed | A backlit segment LCD: edge-lit falloff with LED hot spots, a face recessed behind the bezel glass, a soft segment shadow on the backplane. The bar lights segment by segment, and the four segments past the limit stand taller and blink with the word. No colour |
| The split's warm half was underexposed | A lamp just out of frame at top left, with a warm pool at the tote's foot (+0.6 stop on the tote), and a per-channel shoulder so the red does not clip |
