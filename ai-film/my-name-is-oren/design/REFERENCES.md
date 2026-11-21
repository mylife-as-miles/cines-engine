# My Name Is Oren: references for Seedance 2.5

These are the film's continuity references, made before any video. Each is cited in the auteur prompts as `@Image N`, `@Video N` or `@Audio N`, numbered in the order the files are passed. Every reference gets two to four candidates on a board, and the author chooses. The filled prompt and the chosen job id go in `prompts/refs/<ID>.md`.

## What Seedance 2.5 takes (check against Dreamina's live limits before the first batch)

- **References per generation:** up to 50 multimodal inputs, reported as about 30 images, 10 videos and 10 audio. Seedance 2.0 took 12. Dreamina's FAQ says the active mode sets the real limits.
- **Clip length** 4–30 s; **21:9** framing, matted to 2.35:1 in the finish; **native audio** with lip-synced dialogue.
- **Resolution:** 480p and 720p are confirmed; higher is claimed. Draft at 480p, then make the final from the chosen draft.
- **Audio references** give a voice its timbre. **This film uses none** (the author's choice): the voices come from the Voice Bible written into each prompt.
- **What it means for us:** the whole visual kit (both characters, the set, the props) can go into every generation, and 30 s clips let one generation carry two or three beats. That means fewer joins and steadier faces. The shot list will be re-cut to about 15 sequences of 20–30 s.

**On fal (checked 2026-11-21, `bytedance/seedance-2.5/us/reference-to-video`):** up to 30 images, 10 videos and 10 audio (50 files in all); images are named **`@Image1`, `@Image2`** (no space), videos `@Video1`, audio `@Audio1`; 4–30 s or auto; aspect 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 or auto; 480p, 720p, 1080p or 4K; a **draft** mode renders 480p and returns a `draft_id` to finish at 1080p or 4K within 14 days. Listed price per generated second: 480p $0.2205, 720p $0.473, 1080p $1.164, 4K $1.84 (a 20 s draft ≈ $4.41); any video reference switches billing to tokens over input plus output duration.

**Approved files (reviewed 2026-11-21; verdicts in each `prompts/refs/*.md`):** `refs/CHAR_oren_t1.jpg`, `CHAR_oren_detail_t1.jpg` (+ `_off` crop), `CHAR_city-unit_t1.jpg`, `ENV_laundrette_t1.jpg`, `ENV_low-wall_t1.jpg` (**wall too high: fix before Q06**), `ENV_across-street_t1.jpg`, `ENV_corner_t1.jpg`, `PROP_lunch-bag_t1.jpg`, `PROP_handset_t1.jpg`, `PROP_helena-boots_t1.jpg`, `PROP_oren-slippers_t1.jpg` (labels painted out), `PROP_sweeper_t1.jpg`. Still to make: `CHAR_helena` sheet v2 (AGE LOCK), `MOTION_helena-walk`.

## The kit

### Characters (`character-sheet.md`, each made from a chosen casting portrait)

| ID | What | Used in |
| --- | --- | --- |
| `CHAR_helena` | Three-panel sheet: front full body (head omitted), rear, three-quarter face. From `refs/CAST_helena_t1.jpg`: the cropped olive jacket with the patched left elbow, the charcoal funnel-neck knit, wide cropped pleated black trousers, and the leather boots with the loose right sole. | Every beat |
| `CHAR_oren` | Three-panel sheet: the navy band-collar work shirt with a blank badge (no coat), grey trousers, the slippers. Skin a little too even. | B04 (feet only), B05–B31 |
| `CHAR_oren_detail` | Two stills of his **right** profile in close-up (changed from left after Q03 t1): the seam below the ear and the temple light **unlit**, then **lit** (soft warm white under the skin), with the scrape on his chin. | Every close-up of Oren; B15, B20, B26–B27, B30 |
| `CHAR_city-unit` | Costume sheet from the chest down: hi-vis tabard, grey work clothes, grey gloves, seamless grey regulation shoes. One sheet serves both units. | B02 |

### Environments (`environment-reference.md`, with *YELLOW*'s blocks swapped for this film's bible)

The camera stays on the street side, so the background behind Helena is the laundrette, and the background behind Oren, when he faces her, is the street.

| ID | What | Used in |
| --- | --- | --- |
| `ENV_laundrette` | The master wide, square-on: the window (decal areas blank), the door, the wall under the window, the low brick wall right of the door, the pavement, the gutter, a kerbside bin. Overcast early afternoon, damp pavement. | B01–B09 |
| `ENV_low-wall` | The dialogue set at seated eye height: the low wall with the laundrette door and window behind it. It keeps every close-up's background the same. | B10–B29 |
| `ENV_across-street` | The reverse: what Helena sees across the street. Terraced shops, a traffic post, foot traffic, more polite machines. It is the background behind Oren's close-ups. | B04 (her view), Oren's reverses |
| `ENV_corner` | Along the pavement, left to right, to the corner at the end of the block, toward Mercer Street. | B30–B31 |

### Props (`prop-reference.md`, four views on #808080)

| ID | Identity markers | Used in |
| --- | --- | --- |
| `PROP_lunch-bag` | Brown paper, top rolled twice, a grease stain through one bottom corner, the weight of a warm boxed meal. | B04–B31 |
| `PROP_handset` | An older, thicker handset with a cracked top-left corner. Screen off; the screens are made in code. | B03, B14–B15 |
| `PROP_helena-boots` | Brown-black leather scuffed grey at the toes, worn laces, the **right** sole's rubber coming loose at the toe. | Every shot showing her feet |
| `PROP_oren-slippers` | Big, ugly grey felt slippers with wide Velcro straps and thick rubber soles; blue tape across the **right** toe. | Every shot showing his feet; B08, B21 |
| `PROP_sweeper` | A knee-high kerb robot, scuffed hi-vis yellow body, one small rotating brush, no readable text. | B01–B02, B08 |

### Look: in the prompt, not in images

**No style-frame images** (the author's choice). The look is written into every Seedance 2.5 prompt as the auteur template's MOVIE COLOR block: the palette, the six influences with their purposes, the camera package and the look string (`DECISIONS.md`, film bible). It is carried visually by the approved environment references and unified in the grade.

### Voices: the Voice Bible, in the prompt

**No audio references** (the author's choice). Each character's Voice DNA from the Voice Bible (`DECISIONS.md`) is copied word for word into every prompt where they speak, and Seedance generates the voices from it. If a voice drifts between clips, there are two fallbacks: use the first approved clip's voice as the reference for the rest, or fix the line in post.

### Motion (video reference)

| ID | What | Used in |
| --- | --- | --- |
| `MOTION_helena-walk` | 5–8 s of how she walks: a stiff back, favouring one leg, a hand going to the small of her back. Generated once from `CHAR_helena`, approved, then reused. | B04, B29–B31 |
| Previous clip's tail | The last 2–3 s of the previous sequence, so the cut joins. This one is per sequence, not a fixed asset. | Every sequence after the first |

### Keyframes (start frames)

One **start frame per sequence** (about 15), built from the kit with Dreamina's image model and passed both as the start image and as `@Image 1`. Each sequence's last frame becomes the next one's start frame where the action runs across a cut.

## A typical reference pack: dialogue at the wall (B13–B15)

| Slot | File |
| --- | --- |
| Start frame, `@Image 1` | `KEY_Q07` (the start frame for this sequence) |
| `@Image 2` · `@Image 3` · `@Image 4` | `CHAR_helena` · `CHAR_oren` · `CHAR_oren_detail` |
| `@Image 5` · `@Image 6` | `ENV_low-wall` · `ENV_across-street` |
| `@Image 7` · `@Image 8` · `@Image 9` | `PROP_lunch-bag` · `PROP_handset` · `PROP_oren-slippers` |
| `@Video 1` | The previous sequence's tail |

The look (MOVIE COLOR) and both voices (VOICE DNA) are in the prompt text.

## Order of work

1. **Casting:** three or four portraits each of Helena and Oren. The author picks.
2. **Sheets:** `CHAR_*`, `ENV_*`, `PROP_*`. The look is Look A (overcast), carried in the prompts.
3. **Voice Bible:** approved by the author, then copied unchanged into every prompt.
4. **Motion:** `MOTION_helena-walk`.
5. **Keyframes:** one per sequence.

**Must have for the contest cut:** Helena, Oren and Oren's detail; `ENV_laundrette` and `ENV_low-wall`; the bag, the slippers, the boots and the handset; the approved Voice Bible. The rest raises quality if time allows.

## Made in code (never generated)

- The laundrette decals: "FREE TRANSLATION. FREE LEGAL FORMS. FREE TUTORING WHILE YOU WAIT."
- The older sign with half its letters peeled away: "FREE WASHES FOR SCHOOL UNIFORMS".
- The handset screens: the drawing app with the boot sketch, and the share menu (NOTICES, APPOINTMENTS, RECORDINGS).
- The end super.
