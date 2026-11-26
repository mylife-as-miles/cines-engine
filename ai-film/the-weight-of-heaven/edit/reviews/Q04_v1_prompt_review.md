# Q04 v1 — independent review before the take

Read-only. Nothing generated, no project file changed. Reviewed: `prompts/sent/Q04_v1.txt` (13,398 characters), the board, the refs board, `refs/frames/Q04_open_cup.jpg`, `refs/ENV_E02_council-chamber.jpg`, the five sheets at full size, screenplay scene 4, all 67 lessons, the voice bible, the template, `Q03B_v2`, `Q01_v1`, `prompts/Q04.md`, `tools/board_q04.py`.

## (a) Verdict

Fix first. The structure and the three lines are clean, but the first frame carries a matte fault that will be copied, shot 5 is about a second short for its line and pause, and the last shot repeats the lesson-45 fault and looks to the wrong side. Every fix is free: words, and one matte in `tools/board_q04.py`.

## (b) Fixes, most damaging first

### 1. @Image 2: the cup's matte keeps a band of the wedding (lesson 51)

`cup_matte()` fills each row between a 21-row min/max envelope, so the top of the matte is a flat box wider than the rim. In `refs/frames/Q04_open_cup.jpg` that leaves, round the upper bowl, pieces of the wedding take's background:

- a straight horizontal edge across the top of the rim (y ≈ 91, x ≈ 860–1125 in the 1984 × 864 frame);
- a grey wedge at upper left and a near-black wedge at upper right (the dark gap between two wedding guests in Q02 t1);
- a stepped grey fringe down both sides of the bowl.

Compared side by side with the take's own frame, the take's rim is a clean curve; the composite's is capped. `prompts/Q04.md` says "Checked at full size: the cup and marble are untouched take pixels": true of the pixels, not of the matte.

Change: build the matte from the gold-and-wine region itself (filled, eroded 1–2 px, feathered about 1 px) or from an ellipse fitted to the rim; re-export; check at 4× against the take.

Also in shot 1 [BLOCK] delete "and a gloved hand at her side": no hand is in the frame, and the words put one beside the cup.

Not faults: the marble and the foot are the take's own pixels (the missing contact shadow is the wedding's own look). The upright, level background behind a cup seen from about 45° above is not true perspective, but it is too soft to read.

### 2. Timing: the back of the generation has no slack (lessons 3, 16, 44)

At the model's pace (about 1.8× natural) shot 5 needs: breath 0.4 s + 14 words 3.1–3.5 s + pause 2 s + the name 0.6 s = 6.1–6.5 s. Its window is 5.8 s. Shots 4 and 5 carry all 21 on-camera words in 8.3 s. Shot 6, the last, has 2.2 s for a "slow" head turn; the last shot has come back at about half its length twice. The "two spare seconds" of `prompts/Q04.md` are not spare: all 22 s are allotted, 6.0 s of them before the first word. Lesson 44 says the still shots run long and the busiest is squeezed: here the busiest shot is also the one with the most words.

Change (still 22 s):

| Shot | [TIME] now | [TIME] to | Other wording |
| --- | --- | --- | --- |
| 1 | 0.0–3.5 s | 0.0–3.0 s | |
| 2 | 3.5–6.0 s | 3.0–5.3 s | "At 5.3 s an old man clears his throat off-screen, across the room:" → "In the last half second a throat is cleared off-screen, across the room:" |
| 3 | 6.0–11.5 s | 5.3–10.0 s | "from 6.8 s" → "half a second after the cut" |
| 4 | 11.5–14.0 s | 10.0–12.5 s | "from 12.0 s" → "half a second after the cut" |
| 5 | 14.0–19.8 s | 12.5–19.0 s | "from 14.4 s" → "half a second after the cut"; "about two seconds with no word" → "about a second and a half with no word" |
| 6 | 19.8–22.0 s | 19.0–22.0 s | see fix 3 |

Safer, if the author will pay about $0.44 more: 24 s, split 3.0 / 2.5 / 5.0 / 2.5 / 7.5 / 3.5.

### 3. Shot 6: Serath placed twice, and looking to the wrong side (lesson 45; the 180° line)

- [CAM] "from behind her right shoulder" plus [BLOCK] "Serath on the left third of the frame, from the knees up, her back to us" is the wording of Q03A t2 shot 5, which drew a foreground head and a second small man.
- The side: Serath stands at a far-left (west) arch facing out; the Engineer stands south of the table. From a camera inside the room looking out of her arch, the whole room is behind the camera and the Engineer is behind it to the left. Shot 5 has just had him look camera-right at her, so her look must answer to the left. As written both look right, and a turn to the right faces her toward the centre arch, away from the Engineer.
- "slowly", in the last and shortest shot: the turn will not finish, and Q05 opens on this frame.

Change the four lines to:

- [CAM] medium-wide, 40 mm, a little above head height, three metres inside the room, looking out through the far-left arch, deep focus; the camera drifts half a metre to the left.
- [BLOCK] Serath stands at the balustrade on the right third of the frame, from the knees up, her back to us, her gloved hands at her sides; a marble column at each side of the arch; beyond her the white terraces and a bell tower stand in cloud that lies level with the floor.
- [ACT] She is looking down at the cloud. At once her head turns to her left, toward the room; one second in, her face is in profile, facing the left of the frame, her eyes open and on the Engineer, off-screen to the left. Her lips are closed. She holds, still, to the end.
- [STATE OUT] Serath in profile, facing left, at her arch, the gold collar at her throat, her lips closed.

Board panel 8 mirrors to match. (A flop in the edit would also fix the side for free, but Q05 inherits the frame.)

### 4. Figures named twice, or only in the locks (lessons 45, 46)

- Influences: "small people held in a large symmetrical room; a man who speaks with his back to us; frontal faces, centred, in shallow focus; the quiet before a hard word" → "symmetry, stillness, a held wide, shallow focus up close, silence before speech". Lesson 45 names this line: three figures in it are figures the shots already place.
- Shot 3 [BLOCK]: "Serath far left at her arch" → "Serath far left at her arch, facing out, her back to the room". It is only in the locks, and shot 6 depends on it.
- Continuity [POSITIVE]: "white gloves on every hand but the Engineer's" → "white gloves on the Chancellor, Serath and Cassiel". @Image 5 shows the Hierophant bare-handed.

### 5. Words that may be performed (lessons 48, 52; Oren 37)

- Shot 1 [ACT] → "The surface of the wine is trembling: thin circles start at the gold rim and run inward to the centre, one after another, without stopping; a pale sheen of sky on the wine shows them. The cup itself stands still. Nothing else moves." Reasons: Q03A t2 gave one pulse from the centre "as if from a drop"; the wine in @Image 2 is black (RGB 21/2/5), so rings have nothing to show on; "shivers" fights "the cup stays where it stands".
- Delete "Three days ago it stood perfectly still." (Props) and ", when it was the one thing that did not move" (Thematic). A still first frame plus two statements of stillness invites a still cup (Q01 t1 shot 5).
- "The camera floats: every shot drifts slowly and smoothly, as if weightless, and never shakes." → "Every shot moves slowly and smoothly on a steady camera." Physics says "real weight throughout".
- "a little cooler and greyer than a wedding day" → "cool and grey".
- "explains it exactly, as a man explains a machine" → "says it exactly and evenly".
- Audio design: "the cup's gold foot shivering on the marble" → "metal on stone".
- Physics: "it never splashes or spills, and the cup stays where it stands" → "the wine stays inside the rim and the cup stands where it is". Continuity: drop "a hand touching the cup · wine spilling" from [NEGATIVE]; add "every hand at its owner's side · the wine inside the cup" to [POSITIVE].
- Physics: the cloud "pours slowly" → "flows slowly" (the Engineer says "pours").
- "thin columns" (four places) → "marble columns": the columns in @Image 1 are stout.
- "No cast shadows." → "Shadows soft and faint."

Fine as they are: "trembling" and "rings" once anchored as above; "floats in the cloud" in the intent; "clank" (sound only, and the take's sound is rebuilt in the mix).

### 6. Shot 5: its light and its eyeline (lessons 41, 46)

The global rule ("exposed for the cloud in the arches … a face is never the brightest thing") cannot hold in the one shot with no arch in it. Unanswered, the model adds a bright opening behind him or lights him flat on a grey wall, which is the board's weakest frame.

- Add to [CAM]: "The arches are behind the camera and to its right: their pale light is on his face from the right of the frame, the left side of his face falls to grey, and the wall behind him is darker than his face."
- [ACT] "on the Hierophant, just beside the lens" → "on the Hierophant, just to the right of the lens", so the look to Serath does not sweep through the lens. Shot 4: "just beside the lens" → "just to the left of the lens".

## (c) Strong: do not touch

- The three lines: whole, once each, exactly as approved (L05 split only by its pause). No word of a line is quoted in any direction. Both Voice DNA paragraphs are the bible's less the one sentence that quotes a line: right.
- Shot 3: the Engineer speaks with his back to us (12 of 33 words off any mouth), with "The others are still and their lips stay closed".
- One place per person for the whole sequence, and the eyelines of shot 2 (camera-right) and shot 5 (camera-right to Serath): both on the correct side.
- Exposure written as a decision; each close shot "alone in the frame"; eyes open with a named gaze in every shot; bells written into shots 1 and 2 only.
- The order: cup, face, room, answer, cost, the head that turns. The cause is seen before it is explained and the Engineer's face is kept back until he has to name the cost.

## (d) Could not check

- How the model will time or voice it: the figures are estimates from the 1.8× rule.
- Whether fal accepts 13,398 characters (longest accepted so far: 10,241; `prompts/Q03.md` says a refusal is not charged).
- The south wall behind the Engineer in shot 5: it is not in @Image 1.
- Q05's plan, which the mirrored shot 6 must suit.
- The sound: nothing to hear.
- The matte fix itself: I did not run `tools/board_q04.py`.
- `audio/lines.json` still has the untrimmed L03 and L05 in "say"; `design/DECISIONS.md` line 69 records the approval.

## The eight questions

### 1. Geography and eyelines

The room from @Image 1 ("north" is the centre arch; @Image 1's camera is at the south): open arches from the west round to the north-east; blind wall and the open door on the east; the table mid-floor and oblique, its left end nearer the camera; the cup on its left third, on the far half.

| Shot | Camera | In frame | Facing and looking | Verdict |
| --- | --- | --- | --- | --- |
| 1 | Over the near side of the table, looking north and about 45° down | The cup; the Chancellor's coat behind the far edge | None | Fine (no hand is in the frame) |
| 2 | South of the Chancellor, across the table, looking north | The Chancellor; the cup's rim; arches behind | She faces south; eyes down at the cup, then camera-right to the Engineer, who is south-east of her | Correct side. An eye-height 85 mm close-up cannot also hold the rim of a cup on the table (about 0.7 m below the lens); the model will fake a gold blur. Acceptable |
| 3 | South, on the centre line, looking north, as @Image 1 | All five | The Engineer's back to us; the Hierophant and the Chancellor face us; Serath far left faces out; Cassiel right, by the door | Consistent with @Image 1. The Engineer and the Hierophant stand on one centre line, head above head: intended, a small risk of the two white figures merging |
| 4 | Near side of the table, looking north | The Hierophant alone, the centre arch behind | Faces us; eyes on the Engineer beside the lens | Fine |
| 5 | At the table, looking south | The Engineer alone; the south wall | Faces us; eyes on the Hierophant, then camera-right to Serath, then the floor | Camera-right is correct: Serath, at the west, is on his left |
| 6 | Behind Serath's right shoulder, looking out | Serath's back, left third | Faces out; head turns to the right | Wrong side, and placed twice: fix 3 |

Statements about the room checked against @Image 1: table, cup, benches, balustrade, the open door on the right, terraces and bell towers outside are all there. Two that do not match: the columns are stout, not "thin"; the terraces stand level with and above the room, not "below her".

### 2. Described twice; only global

Twice: Serath in shot 6; the three figures in the influences line; "an old man" in shot 2 (a second description of the Engineer). Only global: Serath's back to the room in shot 3; the side of the light in shot 5. Fixes 3, 4 and 6.

### 3. Literal words

Fix 5.

### 4. Dialogue

Quoted whole, once each, exactly as approved. No direction quotes a word of a line ("pours" appears unquoted in Physics: changed in fix 5). Extra words: the Engineer's DNA says "he starts sentences and stops, clears his throat", which invites false starts; the guard is in AUDIO LOCKS ("Hesitation is breath and silence only") and is enough. Wrong mouth in shot 3: guarded as well as words can. Time: L03 and L04 fit; L05 is about a second short (fix 2).

### 5. Timing

Most likely lost: the pause before the valley's name and any hold after it, then the head turn. The plan as sent does not protect them (fix 2).

### 6. The first frame

Fix 1. What the prompt says about it matches, except the gloved hand.

### 7. Staging

It serves the story. Lesson 21 (never re-open on the last shot of the previous sequence) applies in the letter only: this is a deliberate rhyme, with a new background, a changed state and a title in the edit, and its hold can be trimmed. Soft spots: shot 5's plain wall (fix 6); and for a cold viewer the only visible proof that the city is sinking is the cloud coming over the balustrade in shot 3, so that sentence must stay first in shot 3's [ACT], where it is. After the trim "it pours" has no named subject and will be heard as water; Q05's first line supplies the cost. Nothing to change here. If time is ever needed, shot 2 is the one shot that could go.

### 8. Template

Every section is present and in order.
