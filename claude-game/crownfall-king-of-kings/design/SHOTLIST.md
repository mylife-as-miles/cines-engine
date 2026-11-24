# Crownfall: King of Kings: shot list

The director of photography's shot list for the full cut: **76 shots in 10 scenes, 476 s (7:56)**, shot in Denis Villeneuve's manner. It is built from `BREAKDOWN.md`, `scenes.json`, `VILLENEUVE.md`, the visual bible (version 1, all 18 pages read as images) and the fifth-draft screenplay (all 11 pages). The machine-readable version is `shots_skeleton.json` in this folder.

**How to read it**

- Shot numbers are the bible's (1.1 to 10.16). Where the bible names a shot, the shot does what the bible says. The bible's own timed shot list was not supplied, so the other numbers are given to the script's beats in story order.
- Times inside a shot are seconds from its first frame. Timecodes are film running time.
- Distances are in metres, from the lens to the subject named. Sizes in frame are a percentage of frame height.
- Lenses are Super 35 focal lengths. For the three.js board at the default `filmGauge` of 35, multiply by 1.4 (`VILLENEUVE.md`), or set `filmGauge = 24.9` and use these numbers as they are.
- **PROPOSED** marks a bible proposal the author has not yet approved. Nothing here changes the screenplay's words or adds a story beat. Staging choices that the script leaves open are labelled as staging choices.
- Every line of dialogue is copied from `scenes.json`; a script checked all 38 entries, each used once, and the 476 s total.

| # | Scene | Timecode | Shots | Seconds |
|---|---|---|---|---|
| 1 | INT. KWIND-09 - FOUNDRY - NIGHT | 0:00.0 to 0:24.0 | 1.1-1.4 (4) | 24 |
| 2 | EXT. SOLFORIZ - THE FALLEN GATE - PRE-DAWN | 0:24.0 to 0:50.0 | 2.1-2.4 (4) | 26 |
| 3 | EXT. GATE FORECOURT - FOOT OF THE GREAT STAIR - CONTINUOUS | 0:50.0 to 1:44.0 | 3.1-3.9 (9) | 54 |
| 4 | INT. SHATTERED GATEHOUSE - CONTINUOUS | 1:44.0 to 3:11.0 | 4.1-4.11 (11) | 87 |
| 5 | INT. GATEHOUSE - THE BREACH - LATER | 3:11.0 to 4:09.0 | 5.1-5.9 (9) | 58 |
| 6 | EXT. THE CROWN / THE BREACH / THE STAIR - CONTINUOUS | 4:09.0 to 4:55.0 | 6.1-6.10 (10) | 46 |
| 7 | EXT. SOLFORIZ - THE FALL - CONTINUOUS | 4:55.0 to 5:20.0 | 7.1-7.4 (4) | 25 |
| 8 | EXT. FORECOURT - THE RUINS - SUNRISE | 5:20.0 to 5:55.0 | 8.1-8.6 (6) | 35 |
| 9 | EXT./INT. THE FIRST SHIP - SUNRISE | 5:55.0 to 6:13.0 | 9.1-9.3 (3) | 18 |
| 10 | EXT. FORECOURT - THE RUINS - CONTINUOUS | 6:13.0 to 7:56.0 | 10.1-10.16 (16) | 103 |
| | **Total** | **0:00 to 7:56** | **76** | **476** |

---

## How this film is shot

Where the bible and `VILLENEUVE.md` differ, the bible wins. Where the bible is marked PROPOSED, it is used as the working rule and flagged.

1. **A person measures everything.** No shot of scale without someone in it (bible p.2, rule 1). The smallest figure in the frame is the one the scene is about (p.10). Scale figures sit at 1-6% of frame height, lonely figures at 8-15%, with the mass above them.
2. **Eye level of whoever the shot belongs to** (p.12). Standing eye level is 1.6-1.75 m. The boy's shots sit at 1.0 m, Liora's at her height whether she stands, crouches or sits. Cael is never seen from below except through Liora's eyes (3.5). No low, heroic angles on him (p.2).
3. **The camera leaves the ground twice only:** inside the hull (9.3) and at the ward officer's glass (10.3). No aerials and no view from the ships down on the battle (p.2, p.12 ground rule, PROPOSED). This overrides `VILLENEUVE.md`'s aerials for geography.
4. **Lenses** (p.12, PROPOSED): 24-35 mm for places, 50 mm for faces and the table, 85-135 mm for looks across distance (hers at 6.5, his at 10.7). The four hand shots use 40 mm. Scale comes from moving back, never from going wider than 24 mm; this overrides `VILLENEUVE.md`'s 18-21 mm wides. No zooms: focal length is fixed in every shot.
5. **Focus is deep** for the city, the fall and the fleet. **Shallow focus only four times**: the wrist (3.5), the seal (4.6), her hand (10.6), his hand (10.8) (pp.3, 12).
6. **Still camera.** Locked-off, or one slow push per scene (p.12, PROPOSED): the pushes are 1.4 and 4.9, both at 0.1-0.2 m/s and 14-20% of the distance. A pan or tilt happens only when a look or a ship drives it: Liora's look from hand to shutter is one move (6.5); the hull is read by a slow pan (9.2). **Handheld only while Liora runs** (7.1, 7.2), and small.
7. **Holds.** Six shots run longer than feels comfortable (p.12, PROPOSED): **3.3, 5.8, 6.3, 8.4, 10.6, and 10.9 held into 10.10**. The scale wides run 6-10 s (2.1, 7.3, 8.4, 10.15). Every shot holds 1-2 s after its last line or action.
8. **Rhythm: slow, slow, then suddenly very fast** (Walker on *Sicario*). The long hold on the hand (6.3, 12 s) breaks into a burst of 2.0, 1.5 and 2.5 s cuts (6.6-6.8), then the Crown falls. Inside the fall's held wide (7.3), a terrace barely moves for four seconds, then the whole upper city goes in three.
9. **Designed frames.** Symmetry when Cael commands (4.11, 6.3, 6.8, 10.11). Liora off-centre and low (3.3, 8.5, 10.6). Offset framing with heavy negative space for isolation (4.2, 8.5, 10.12). Silhouettes against haze (6.3, 6.8, 8.3, 8.4, 10.15).
10. **The frame inside the frame.** The breach holds the boy in every gatehouse wide (4.1, 4.7, 4.9, 5.4; p.13). Other frames: the arch (3.9, 7.4), the doorway (4.4), the breach around the envoy's last climb (5.1), the round observation glass (10.3).
11. **The empty sky.** Horizon on the lower third and two-thirds sky in 2.1, 8.1 and 10.15, so that the fleet has a sky to fill (p.13).
12. **Dialogue: one angle per beat, no coverage.** There is no shot/reverse-shot and no over-the-shoulder coverage anywhere in the film. Conversations play in one designed frame: profiles side by side (4.3, 5.4, 10.9), two people facing the same thing from behind (4.9, *Arrival*'s window), a symmetrical frame with the boy between the speakers (4.7), or a voice off over a held listener (4.2, 4.5, 5.7). Reactions are held longer than lines.
13. **Light comes from things we can see, and every light has an owner** (pp.2, 11). One source per shot, fill at 10% of key or less. Shadows are charcoal, not black; armour and stone keep their texture. Faces may go half dark; hands never do. No light from below the lens except the furnace in scene 1. Haze in every exterior, its colour matching the sky.
14. **Colour is rationed** (p.4). Truce white belongs to the truce lamp (2.3-5.3) and then the mirror (10.2-10.3); copper to the coupling (1.2-1.4, 9.3); silver to the ring and the hull (1.3, 9.2-9.3); ward violet is light only (1.3, then 10.4-10.7); blood red to the banners from 10.12 (PROPOSED colour). Furnace amber leaves at 6.10 and returns only as small points at 10.14. Ochre dust never appears before 6.9. The blood on Cael's binding reads near-black, never red.
15. **Aftermath over impact.** Impacts are small and far (3.2, 5.3); we watch the place, not the hit (3.6, 5.5); the fall is held wide (7.3) and its result is an absence (7.4). Nothing glows when Cael holds something; it simply stops, and the air warps at its edge (p.17).
16. **Sound first.** Every shot has a sound note. There is no score unless a note says so: the film's music is the pulse (1.1, 2.1, 6.10, 8.5, 10.16), the hum of the hold, the bell and the engines.
17. **Finish** (p.18): cool, desaturated grade, warm dust after the fall, skin natural. Fine grain, a little heavier in the gatehouse. No flare, no bloom; highlights clip cleanly. Supers and subtitles in small capitals, widely spaced, bone, subtitles low in frame.
18. **Speech pace.** Common lines play at 2.3-3.0 words a second; Cael's weighed lines slower. Native lines play at about four syllables a second.

### The matched frames

These shots must be built from one saved camera each, so that the audience can lay one over the other (pp.13, 17).

- **The hand: 3.4, 4.8, 6.3, 10.3, 10.10.** 40 mm. The lens is 1.0 m from the back of the hand and square to it, at the hand's own height: in effect the owner's view of their own hand, from just behind the shoulder or eye. The hand is centred, fingers to frame top, thumb to frame left, filling 65% of frame height. Focus is deep, so what the hand acts on reads beyond the fingers: the block (3.4), the map (4.8), the Crown's slit (6.3), the arch far below (10.3), the army (10.10). The template is fixed to the hand, not to the world. The camera is level for 3.4, 6.3 and 10.10; it looks down from Cael's own eye at 4.8 and from the ward officer's side of the canted glass at 10.3. In the frame, all five are the same picture. Open, it saves (3.4); a closed hand forced open (4.8); open, it destroys (6.3); open, another protects (10.3); an open hand forced closed: war (10.10).
- **The wrist: 3.5, 10.6.** 50 mm, lens 1.6 m from the wrist, the wrist and the hand on it in the lower-left third at 35% of frame height, shallow focus. At 3.5 Cael's face is soft beyond it, seen from below; at 10.6 Cael is small and soft across the forecourt beyond it, and her own hand covers the place he held. 10.8 mirrors the frame from his side: his shaking hand lower right, her arch soft beyond.
- **The ring: 1.3, 9.3.** 50 mm, lens 2.4 m from the drum and square to it, level with the ring; copper fills the frame and the ring is a horizontal band 45% down. 1.3 shares 1.2's angle (level, square to the drum's side).
- **The two long-lens looks: 6.5 (hers) and 10.7 (his).** Both 135 mm, both POVs, both flat: shape, not detail.
- **The anchor: 1.2, 3.3, 9.1. The empty sky: 2.1, 8.1, 10.15.** Each set shares its proportions: one small figure under one vast thing; horizon on the lower third with two-thirds sky.


---

## Scene 1. INT. KWIND-09 - FOUNDRY - NIGHT

**0:00.0 to 0:24.0 · 24 s · shots 1.1 to 1.4**

- **Colour key:** Key 1, "The foundry" (bible p.5, top). Light: Furnace glow from below. One violet seam. Swatches: #0C0907 #3B2415 #B66A35 #B9BEC3 #7C4DF0. "Nine-tenths of the frame is black. The worker gives the scale: the coupling is four times his height. Faces are never seen here, only hands."
- **Camera note:** Sound first, then the anchor. Locked-off, with the scene's one slow push at 1.4. The furnace is the only under-light in the film (p.11). Hands and silhouettes only; no faces.

### 1.1 · 0:00.0 to 0:04.0 · 4 s

**Black (sound only)** · no lens · none · none · set: foundry

- **Subject:** Darkness; the foundry stroke
- **Position:** No picture. The fade-up at 3.4 s belongs to the 1.2 set-up.
- **Movement:** None.
- **Composition:** Full black frame. At 3.4 s a thin line of furnace glow rises along the bottom edge: the floor of 1.2.
- **Light:** None until 3.4 s, then furnace glow from below at 5% of its 1.2 level.
- **Action:** 0.0 black. 0.6 a mechanical STROKE. 2.6 another. 3.4 the glow line rises at the bottom of frame. 4.0 cut.
- **Dialogue:** none.
- **Super:** "YEARS EARLIER." 1.2-3.6 s. Small capitals, widely spaced, bone on black, centred low.
- **Sound:** Sound first: two strokes, iron on iron, each with a long dry tail. Room tone of a huge hall. No score.
- **Why:** The film's pulse arrives before any picture, so the audience leans into the dark.

### 1.2 · 0:04.0 to 0:10.0 · 6 s

**Extreme wide (the anchor)** · 32 mm · 1.6 m · eye · locked-off · set: foundry

- **Subject:** The copper coupling on its chains; the worker under it
- **Position:** On the foundry floor, 24 m from the coupling and square to its side. The worker's path crosses 2 m in front of the drum.
- **Movement:** Locked-off.
- **Composition:** The coupling hangs right of centre: a banded drum 7.2 m tall (four times the 1.8 m worker), 45% of frame height once it stops, its two chains running out of the top of frame. The worker is 11% of frame height, feet on the bottom fifth. Floor line on the bottom fifth. Nine-tenths of the frame is black; at left, a few copper edges in the dark, not yet readable as a row.
- **Light:** Furnace glow from below, from out of frame left: the only under-light in the film. Copper lit from one side; its right edge falls to black. No fill.
- **Action:** 0.0 the coupling descends from the top of frame on its chains. 2.8 a WORKER walks in from frame left. 3.2 the coupling stops, swaying 2 cm. 4.6 he passes under its edge and does not look up. 6.0 cut on his step.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Chain running through a block. The stroke again at 1.0 and 5.0. Boots on iron plate. No score.
- **Why:** Nothing has a size until a person stands under it: the film's first lesson in scale.

### 1.3 · 0:10.0 to 0:17.0 · 7 s

**Insert (the ring band)** · 50 mm · 4.8 m · eye (on the gantry) · locked-off · set: foundry

- **Subject:** Soot-black hands, pale gloved hands, the silver ring, the violet seam
- **Position:** On the loading gantry beside the drum, standing eye level there: lens 2.4 m from the copper, square to it, level with the ring 4.8 m above the foundry floor. Same angle as 1.2 (level, square to the drum's side).
- **Movement:** Locked-off.
- **Composition:** RING TEMPLATE: 50 mm, lens 2.4 m from the drum and square to it, level with the ring; copper fills the frame, the silver ring a horizontal band 45% down from frame top, wall to wall. Rivet lines run vertically. The hands enter from the frame edges at 30% of frame height. No faces, ever. 9.3 repeats this frame exactly.
- **Light:** Furnace glow from below-left grazes the copper; rivets throw short upward shadows. The ring catches it as one cold line. From 2.0 s the violet seam is the second source: a thin line along the ring's lower edge.
- **Action:** 0.0 soot-black hands enter from frame left and lock the copper (two blows). 1.0 pale gloved hands enter from frame right and close the silver ring; the clasp meets at centre frame at 1.9. 2.0 violet light runs the seam from the clasp out to both edges (0:12). 4.5 the hands withdraw, gloves last. 7.0 cut on the lit seam.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Two hammer blows. A clean silver click. As the violet runs, one thin sustained tone, the only warning of the ward. No voices.
- **Why:** The ward's only warning, hidden in plain sight; it means nothing until 10.4.

### 1.4 · 0:17.0 to 0:24.0 · 7 s

**Wide (the rows)** · 40 mm · 1.6 m · eye · slow push-in 1.4 m · set: foundry

- **Subject:** Rows of identical couplings waiting in the dark
- **Position:** On the foundry floor at the head of the row, lens on the row's axis, 10.0 m from the first waiting coupling at the start and 8.6 m at the end.
- **Movement:** Slow push-in along the row: 1.4 m over 7 s (0.2 m/s, 14% of the distance), eased in and out. The scene's one push: the rows draw us in.
- **Composition:** One-point perspective on the centre line: copper drums recede into black, each a step smaller, about seven readable before the dark takes them. The first drum's base sits on the bottom fifth. The worker from 1.2 stands at the foot of the third drum, off-centre left, 4% of frame height. Ninety per cent black.
- **Light:** The same furnace glow from below, falling off down the row; each drum rimmed on its right edge only.
- **Action:** 0.0 the rows. 2.5 the worker stops at the third drum and stands still. No one speaks. 7.0 cut to the next scene on the stroke.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Only the hall. The stroke at 6.8 lands on the cut and becomes the city's pulse.
- **Why:** Not one machine but a ledger of them: dread by repetition.


---

## Scene 2. EXT. SOLFORIZ - THE FALLEN GATE - PRE-DAWN

**0:24.0 to 0:50.0 · 26 s · shots 2.1 to 2.4**

- **Colour key:** Key 2, "The fallen gate" (bible p.5, bottom). Light: Pre-dawn sky. Amber lamps on the terraces. The white truce lamp. Swatches: #1C2731 #374651 #8D9797 #E08A3A #F2F4F1. "Two-thirds of the frame is sky. The capital steps up to the Crown, and the truce lamp is the brightest point in the film until it bursts."
- **Camera note:** The empty sky (p.13): horizon on the lower third, two-thirds sky. All locked-off, deep focus, soft and low in contrast; nothing brighter than the white lamp.

### 2.1 · 0:24.0 to 0:34.0 · 10 s

**Extreme wide (the empty sky)** · 32 mm · 1.6 m · eye · locked-off · set: city

- **Subject:** The glass plain, the causeway, the broken gate, the capital and the Crown
- **Position:** On the glass plain, 900 m from the broken gate and 30 m left of the causeway. An abandoned cannon lies 9 m in front of the lens, right.
- **Movement:** Locked-off.
- **Composition:** Key 2 (bible p.5). Horizon on the lower third line; two-thirds of the frame is pre-dawn sky, held open for the fleet. The ziggurat spans the middle third of the width, about eight tiers, the Crown a stepped block on its summit. The causeway is a long diagonal from bottom left to the gate. The cannon is a black silhouette at lower right. Three wounded men on the causeway, 1% of frame height, are the scale.
- **Light:** Pre-dawn slate sky, soft and low in contrast. The white truce lamp over the gatehouse is the brightest point in frame, tiny, at the ziggurat's foot. Amber lamps scattered up the terraces.
- **Action:** 0.0 hold. 2.0-5.0 the city's pulse, four beats; again 7.0-10.0 (PROPOSED: the terrace lamps breathe on each beat). The three men walk toward camera, barely moving at this distance. 10.0 cut.
- **Dialogue:** none.
- **Super:** "SOLFORIZ. YEAR 56." 1.0-5.0 s. Small capitals, widely spaced, bone, centred in the upper sky.
- **Sound:** The foundry stroke is now the city's pulse: four low beats, always four. Wind over glass. At 8.0 the first long note of the mourning horn, far off.
- **Why:** The city looks permanent, and the sky is left empty for something that has not come yet.

### 2.2 · 0:34.0 to 0:40.0 · 6 s

**Wide (frontal)** · 35 mm · 1.6 m · eye · locked-off · set: city

- **Subject:** Wounded men walking back along the causeway; abandoned cannon
- **Position:** On the causeway, 40 m on the plain side of the gate, lens down its axis toward the city. The men start 20 m away and pass 1.5 m left of the lens.
- **Movement:** Locked-off.
- **Composition:** The causeway's edges converge on the gate at centre. The men walk down its left half, growing from 8% to 40% of frame height, and leave frame left. An abandoned cannon's barrel crosses the right foreground, black. The capital fills the upper middle beyond the gate, its summit cut by the top of frame.
- **Light:** Pre-dawn sky behind the city; the men are near-silhouettes, their bandages bone. The truce lamp small behind them.
- **Action:** 0.0 four wounded men walk toward camera, one carried between two. 4.5 the first passes out of frame left. 6.0 cut, the last half out.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The mourning horn, one long falling note under the whole shot. Boots on glass grit. A man's laboured breath as he passes the lens.
- **Why:** The cost walks out of the city before we go in.

### 2.3 · 0:40.0 to 0:45.0 · 5 s

**Long-lens wide (the truce lamp)** · 85 mm · 1.6 m · eye · locked-off · set: gatehouse

- **Subject:** The white truce lamp over the gatehouse; civilians on the great stair
- **Position:** On the causeway, 260 m from the gatehouse; the great stair rises 150 m beyond it.
- **Movement:** Locked-off.
- **Composition:** The truce lamp just right of centre on the upper third: the brightest point in the film. The gatehouse a black block under it, one sentry on its parapet at 4% of frame height. Compressed behind it, the great stair climbs out of the top of frame, a thread of civilians coming down it as small dark marks.
- **Light:** The truce lamp, white, small and hard; pre-dawn sky. Nothing else as bright.
- **Action:** 0.0 hold. The civilians descend steadily. 3.0 the sentry turns his head toward the stair. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The horn fades. The pulse under everything. A far murmur of many feet on stone.
- **Why:** One white light keeps a whole city's people moving: a promise you can see.

### 2.4 · 0:45.0 to 0:50.0 · 5 s

**Long-lens medium wide (the high arcade)** · 100 mm · 1.6 m · eye, tilted up 6° · locked-off · set: city

- **Subject:** The Solforiz battery in the high arcades
- **Position:** From the forecourt by Aethelgard's guns, 320 m from the high arcades; lens tilted up 6°.
- **Movement:** Locked-off.
- **Composition:** Three arches of the arcade side by side across the frame, a gun muzzle in the middle one. Five crew silhouettes at 12% of frame height. The arcade sill on the lower third; the terrace above is cut by the top of frame.
- **Light:** Pre-dawn sky behind the arcades; amber lamps inside. The muzzle flash at 2.6 s is amber and small, never brighter than the truce lamp (bible p.11).
- **Action:** 0.0 the crew at the gun. 0.4 the chanted order. 2.6 the battery FIRES anyway; smoke rolls out of the middle arch. 5.0 cut as smoke fills it.
- **Dialogue:**
  - 0.4-2.0 s · BATTERY IN THE HIGH ARCADES (chanted order, from the action line): "Ihriq! Ihriq!" (Kharzani, not subtitled)
- **Super:** none.
- **Sound:** Two voices chanting. The report arrives at 3.5 s, a beat after the flash, carried 320 m. The shell's whistle runs over the cut.
- **Why:** The truce is breaking, and the king is not the one who breaks it.


---

## Scene 3. EXT. GATE FORECOURT - FOOT OF THE GREAT STAIR - CONTINUOUS

**0:50.0 to 1:44.0 · 54 s · shots 3.1 to 3.9**

- **Colour key:** Key 3, "The held stone" (bible p.6, top). Light: Flat pre-dawn light through dust. No hard shadows. Swatches: #474E56 #787D7F #A9ABA4 #1B1C1E #D7D8D2. "Nothing glows. The block has simply stopped, and dust keeps falling past it. Cael stands ten paces off, hand open."
- **Camera note:** NEAR (bible p.12), the rescue (3.5, 3.6): "The camera sits at her eye level, close enough to see his grip on her wrist. No heroic angle." Locked-off throughout; the long hold is 3.3.

### 3.1 · 0:50.0 to 0:56.0 · 6 s

**Wide (the mirror)** · 32 mm · 1.6 m · eye · locked-off · set: forecourt

- **Subject:** The arch signal station and its lit lantern; Liora bringing civilians down; the boy on her coat
- **Position:** In the forecourt, 30 m from the arch, square to the foot of the great stair.
- **Movement:** Locked-off.
- **Composition:** The great stair rises at frame left, as in key 3. The stone arch stands on the right third, its mirrored storm lantern lit on the keystone (an inverted flame; dimmer than the truce lamp). Civilians come down the stair in a loose file; Liora leads them, 10% of frame height, one hand raised in the shelter sign, the boy holding her coat. Ground on the bottom fifth.
- **Light:** Flat pre-dawn light through dust; no hard shadows. The lantern a small warm point.
- **Action:** 0.0 the file descends. 1.5 Liora reaches the lower flight, hand raised. 4.0 the boy stumbles a step and keeps hold of her coat. 6.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Feet on stone, a child's breath through a respirator, the far guns muffled. The pulse, faint.
- **Why:** Meet her working: the signal keeper bringing people down under the one lit lantern.

### 3.2 · 0:56.0 to 0:59.0 · 3 s

**Long-lens wide (the shell)** · 75 mm · 1.6 m · eye, tilted up 8° · locked-off · set: forecourt

- **Subject:** The shell hitting the terrace above Liora; the block tearing loose
- **Position:** In the forecourt, 70 m from the foot of the stair; lens tilted up 8° to the terrace 25 m above her.
- **Movement:** Locked-off.
- **Composition:** The terrace edge across the upper third; the impact point upper-left of centre. Liora and the file a small band along the bottom edge, 6% of frame height. Two-thirds of the frame is stone.
- **Light:** Flat pre-dawn. The burst is an amber flash on the terrace face for two frames.
- **Action:** 0.0 the file below. 0.9 the shell falls short and hits the terrace: flash, stone spray. 1.4 a block, about 2 m across, tears loose and starts to fall. 3.0 cut while it falls.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The whistle (carried from 2.4), a flat crack, stone grinding loose.
- **Why:** Fast and almost too small to see, so that the stop which follows is huge.

### 3.3 · 0:59.0 to 1:09.0 · 10 s

**Wide (the anchor: the held stone)** · 35 mm · 1.6 m · eye · locked-off, long hold · set: forecourt

- **Subject:** Liora and the boy under the stopped block; Cael ten paces off
- **Position:** 14 m from Liora, square to the foot of the stair. Cael stands 7.5 m (ten paces) to her right.
- **Movement:** Locked-off. One of the six long holds.
- **Composition:** Key 3 (bible p.6). The stair rises at frame left; the overhanging terrace edge crosses the top left. The block hangs upper centre, 3 m above Liora. Liora crouches with the boy left of centre and low, 9% of frame height. Cael stands at the right edge, arm stretched toward the block, hand open: at first only a darker shape in the dust. Ground on the bottom fifth.
- **Light:** Flat pre-dawn light through dust, no hard shadows. Nothing glows: the stopped block is the only wrong thing in frame.
- **Action:** 0.0 the block STOPS 3 m above her. Dust keeps falling past it in streaks. Nothing else moves but the dust, the boy's grip on her coat and her breathing. 5.5 the dust between thins and Cael resolves at frame right. 10.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The battle thins to a low hum, like pressure in the ears, over one second. Only falling grit, close and dry, inside the hum.
- **Why:** The impossible, without spectacle: we wait under the stone with her and find the cause in the frame ourselves.

### 3.4 · 1:09.0 to 1:13.0 · 4 s

**Hand close shot (Open: it saves)** · 40 mm · 1.95 m · level with the hand · locked-off · set: forecourt

- **Subject:** Cael's open hand; the block and Liora beyond it
- **Position:** 1.0 m behind the back of Cael's raised right hand, over his right shoulder and beside his head. Liora and the block are 7.5 m beyond the fingers.
- **Movement:** Locked-off.
- **Composition:** HAND TEMPLATE (see 'The matched frames'): 40 mm, lens 1.0 m from the back of the hand and square to it, level with the hand, fingers to frame top, hand centred and 65% of frame height, deep focus beyond the fingers. Bandaged forearm enters from lower left. Beyond, sharp: the block hanging and Liora and the boy small beneath it, seen in the gap right of his fingers. The edge of his head is a black shape in the lower-left corner.
- **Light:** Flat pre-dawn; the hand and bandage keep their detail (hands never go dark). No glow, nothing in the hand.
- **Action:** 0.0 the hand open and still. Each breath lifts the arm a centimetre: he is breathing too hard for a man standing still. 4.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The hum. Close to the lens, Cael's breathing, ragged and held down.
- **Why:** Open: it saves. The first time we see the hand, it does good.

### 3.5 · 1:13.0 to 1:20.0 · 7 s

**Close shot, shallow (the wrist)** · 50 mm · 0.7 m · Liora's eye, looking up 10° · locked-off · set: forecourt

- **Subject:** Cael's grip on Liora's wrist; his face beyond
- **Position:** At Liora's eye level as she crouches, 0.7 m off the ground; lens 1.6 m from her wrist. Cael kneels 0.6 m beyond it.
- **Movement:** Locked-off.
- **Composition:** WRIST TEMPLATE: 50 mm, lens 1.6 m from the wrist, wrist and the hand on it in the lower-left third at 35% of frame height, shallow focus (one of the film's four shallow shots). Beyond and above, soft: Cael's face, seen from below for the only time in the film, and only because she is on the ground. Upper right, out of focus, the block's dark underside still hanging.
- **Light:** Flat pre-dawn light. Hands lit; his face half lost against the bright overcast behind him.
- **Action:** 0.0 Cael enters at top right, coming to her. 1.4 he drops to her level. 1.9 his hand closes on her wrist. 2.4 he speaks. 4.8 she looks up at him. 7.0 cut.
- **Dialogue:**
  - 2.4-4.4 s · CAEL: "Look at me. Find your feet."
- **Super:** none.
- **Sound:** Inside the hum, his voice close and dry, no reverb. Her breath catches.
- **Why:** Near: the camera is where she is, close enough to feel the grip.

### 3.6 · 1:20.0 to 1:24.0 · 4 s

**Wide, side-on (where she lay)** · 35 mm · 1.6 m · eye · locked-off · set: forecourt

- **Subject:** The empty place under the block; the block landing
- **Position:** Side-on to the stair foot, 12 m from the spot under the block.
- **Movement:** Locked-off.
- **Composition:** The block hangs upper centre; the empty ground beneath it is the centre of frame. Liora, the boy and Cael move out at frame left; Cael's raised hand stays at the left edge last.
- **Light:** Flat pre-dawn through dust.
- **Action:** 0.0 she finds her feet; Cael pulls her and the boy clear, moving left. 2.0 they are out of frame, all but his raised hand at the edge. 2.5 only then does the hand close. 2.6 the block drops and lands where she lay. 2.8-4.0 dust rolls out across the lower half of frame. 4.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The hum snaps off at 2.5. The block lands, full and low. Then real sound returns all at once: far guns, voices.
- **Why:** Aftermath over impact: we watch the empty place she was, not the stone hitting her.

### 3.7 · 1:24.0 to 1:29.0 · 5 s

**Insert (the seal)** · 50 mm · 1 m · the boy's eye level · locked-off · set: forecourt

- **Subject:** Two fingers testing the boy's respirator seal
- **Position:** 1.1 m from the boy, in profile, at his eye level.
- **Movement:** Locked-off.
- **Composition:** The boy's head and oversized respirator in profile, right of centre, 50% of frame height. Liora's coat edge at frame left. Cael's hand enters from the left. Background: grey dust and the arch pier.
- **Light:** Flat pre-dawn; hands fully readable.
- **Action:** 0.0-1.5 Cael's hand rests on Liora's shoulder at frame left: he stays with her a moment. 1.8 his hand goes to the boy and straightens the respirator. 3.0 two fingers test the seal at the mask's edge. 4.3 the boy breathes; the valve clicks. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The respirator valve, the boy's breathing through it.
- **Why:** The hand that held the stone checks a child's seal: care at the smallest scale.

### 3.8 · 1:29.0 to 1:32.0 · 3 s

**Wide (the bound banner)** · 40 mm · 1.6 m · eye · locked-off · set: forecourt

- **Subject:** The standard-bearer turning back
- **Position:** In the forecourt, 22 m from the standard-bearer, who walks across frame toward the outer wall.
- **Movement:** Locked-off.
- **Composition:** The forecourt's gun line runs across the lower third. The standard-bearer at the right edge of frame, the edge of the group; his pole, half as tall again as he is, a near-black vertical with the banner bound to it. Grey dust as negative space to his left.
- **Light:** Flat pre-dawn; the banner reads almost black.
- **Action:** 0.0 he walks toward frame right, leaving the wall. 1.0 he stops. 1.6 he turns back to the stair. 3.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** His steps, then stillness. The pole creaks against its strap.
- **Why:** Someone saw it; the bound banner is the first sign of what it will cost.

### 3.9 · 1:32.0 to 1:44.0 · 12 s

**Wide (frame inside the frame: the arch)** · 35 mm · 1 m · the boy's eye level · locked-off · set: forecourt

- **Subject:** The boy set under the arch in sight of the truce lamp; Liora going back up
- **Position:** On the stair side of the arch, 6 m from the boy at his eye height; lens through the arch across the forecourt to the gatehouse 120 m beyond.
- **Movement:** Locked-off.
- **Composition:** The arch's opening is a dark frame on the centre line. The boy stands under it, centred, back to us, 25% of frame height, facing the lamp. Beyond, framed in the arch just above his head: the truce lamp over the gatehouse, small and white. Cael small in the distance, walking to the gatehouse. The lit signal lantern at the top of the arch.
- **Light:** Flat pre-dawn; the truce lamp the brightest point; the boy a soft silhouette against it.
- **Action:** 0.0 Cael walks away toward the gatehouse, small. 1.0 Liora kneels and sets the boy under the arch, facing the lamp. 3.0 she speaks. 4.2 she rises, already turning for the stair, toward camera. 6.2 passing close to the lens, she says the rest to no one, under her breath. 9.0 she leaves frame right, going back up. 9.0-12.0 hold: the boy alone in the arch, the lamp beyond.
- **Dialogue:**
  - 3.0-3.6 s · LIORA (in Kharzani, subtitled): spoken "Iwqif." · subtitle "Stay."
  - 6.2-8.8 s · LIORA (CONT'D) (under her breath): spoken "Lu=yaslam al-walad fi al-rash." · subtitle "May the child survive in the ash."
- **Super:** none.
- **Sound:** Her voice dry and near; the second line is almost breath, the way it has always been said. No music. The pulse returns faintly under the last three seconds.
- **Why:** She leaves the child in sight of the only promise left and goes back for the others.


---

## Scene 4. INT. SHATTERED GATEHOUSE - CONTINUOUS

**1:44.0 to 3:11.0 · 87 s · shots 4.1 to 4.11**

- **Colour key:** Key 4, "The gatehouse" (bible p.6, bottom). Light: The breach is the only source. Swatches: #0A0A0C #424445 #A3A9A9 #8A8C88 #D8CFB8. "The boy and the arch stay visible through the breach in every wide. The envoy's robe is the one clean cloth in the film; Cael is a shape against the dark."
- **Camera note:** Low exposure: about two stops under, half of each face lost, grain a little heavier (pp.3, 11, 18). The frame inside the frame holds the boy (4.1, 4.7, 4.9). No over-the-shoulder coverage: every exchange plays in one designed frame. The scene's one push is 4.9.

### 4.1 · 1:44.0 to 1:52.0 · 8 s

**Wide (frame inside the frame)** · 32 mm · 1.6 m · eye · locked-off · set: gatehouse

- **Subject:** The command post; the breach holding the arch and the boy
- **Position:** Against the gatehouse back wall, 9 m from the table. The breach is 14 m away at frame right; the arch 110 m beyond it.
- **Movement:** Locked-off.
- **Composition:** Key 4 (bible p.6). The table runs across the left and centre of the lower third. Cael is a black mass at the table, left; the captain half a step behind his shoulder; the wounded soldier leaning on the table; the envoy a pale standing column centre-right against the dark wall. The breach fills the right 40% of frame: the grey stepped city, and the small arch with the boy in it at 2% of frame height. Charcoal interior.
- **Light:** The breach is the only source, about two stops under; half of each face is lost; grain a little heavier here. The envoy reads pale; Cael reads black.
- **Action:** 0.0 hold the room. 1.5 the soldier straightens against the table to report. 4.4 he speaks. 8.0 cut.
- **Dialogue:**
  - 4.4-7.6 s · SOLDIER: "Third assault, Cyning. The inner batteries still hold."
- **Super:** none.
- **Sound:** Guns outside, muffled by stone. Dust ticking down from the broken ceiling. The pulse, faint.
- **Why:** The argument to come is about the boy in the breach, and he is in the first frame.

### 4.2 · 1:52.0 to 1:59.0 · 7 s

**Medium single, offset** · 50 mm · 1.7 m · eye · locked-off · set: gatehouse

- **Subject:** The envoy, stopped
- **Position:** 4.5 m from the envoy, square to him, from the far end of the table.
- **Movement:** Locked-off.
- **Composition:** The envoy on the left third, 55% of frame height, against the dark back wall; the right two-thirds is dark wall and empty air. The one clean cloth in the film.
- **Light:** The breach is the only source, about two stops under; half of each face is lost; grain a little heavier here. Breach light from frame right models half his face.
- **Action:** 0.0 he draws breath. 0.6 he starts. 1.5 Cael (off) cuts him off. 2.7 he stops. 2.7-7.0 hold: his eyes go to the soldier and back. No one has made him wait for a soldier.
- **Dialogue:**
  - 0.6-1.5 s · ENVOY: "The Ash-Caliph --"
  - 1.7-2.7 s · CAEL: "He was speaking."
- **Super:** none.
- **Sound:** Cael's line from off frame, flat and quiet. Then room tone only.
- **Why:** The reaction is held longer than the lines: the envoy learns his place in one silence.

### 4.3 · 1:59.0 to 2:11.0 · 12 s

**Medium two-shot in profile** · 40 mm · 1.6 m · eye · locked-off · set: gatehouse

- **Subject:** The wounded soldier and Cael; the envoy left out of frame
- **Position:** Side-on to the table, 4 m from it. The soldier and Cael face each other across the table's corner, 1.4 m apart.
- **Movement:** Locked-off.
- **Composition:** Two profiles: the soldier at frame left, grey with dust, bandaged, leaning on the table; Cael at frame right, black. The envoy is out of frame. Between their heads, deep in the background, the breach is a bright vertical sliver. Table edge on the lower third.
- **Light:** The breach is the only source, about two stops under; half of each face is lost; grain a little heavier here. The breach backlights them from the background: a rim on the soldier's dusty shoulder; Cael nearly black.
- **Action:** 0.8 the soldier reports. 3.0 he looks down. 4.2 after a beat, the rest. 6.0 Cael grips the table; his hand tightens on the edge at frame right. 6.0-8.6 it takes him a breath to answer. 8.6 he answers. 12.0 cut.
- **Dialogue:**
  - 0.8-2.8 s · SOLDIER: "Half the company reached the wall."
  - 4.2-5.8 s · SOLDIER (beat): "The slow half came back."
  - 8.6-10.6 s · CAEL: "Clear the road. Bring them in."
- **Super:** none.
- **Sound:** The soldier's voice past caring who hears him. The table creaks under Cael's grip.
- **Why:** Two soldiers, level, the diplomat shut out: the king listens to the cost first.

### 4.4 · 2:11.0 to 2:19.0 · 8 s

**Wide (the doorway)** · 27 mm · 1.6 m · eye · locked-off · set: gatehouse

- **Subject:** Two stretchers carried in; the blind navigator; the door guard; Cael's nod
- **Position:** In the corner opposite the door, 8 m from it. Cael stands 5 m from camera, right of frame. The stretchers are set down 3 m in front of the lens.
- **Movement:** Locked-off.
- **Composition:** The doorway is a grey rectangle left of centre in a black wall (a frame inside the frame). The stretchers come through it as silhouettes. The door guard stands at its left jamb. Cael in profile on the right third, 30% of frame height. When the stretchers are set down they fill the lower foreground, the navigator in profile.
- **Light:** The breach is the only source, about two stops under; half of each face is lost; grain a little heavier here. The doorway's grey sky is a second, weaker opening of the same daylight.
- **Action:** 0.0 the first stretcher, a soldier of Aethelgard, comes in. 2.6 the second: the NAVIGATOR of Solforiz; as he passes the light his eyes, filmed like glass, catch it. 4.0 the guard looks to Cael. 4.8 Cael nods. 5.4 both are set down inside, in the foreground. 8.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Bearers' boots, the creak of poles, a groan from the first stretcher. The navigator makes no sound.
- **Why:** An enemy is carried in under the king's nod: the road is cleared for both sides.

### 4.5 · 2:19.0 to 2:24.0 · 5 s

**Insert, low across the table (the judgments)** · 50 mm · 1.05 m · table level · locked-off · set: gatehouse

- **Subject:** Three judgments under three different seals, under the campaign map
- **Position:** At the table's end, lens 15 cm above the table top, 1.3 m from the nearest judgment, looking along the table.
- **Movement:** Locked-off.
- **Composition:** The three judgments in a row receding along the table, each under a seal of a different shape, their folds mended many times; the campaign map's edge lifted over them. Table top fills the lower third; the breach's grey light at the far end. Deep focus.
- **Light:** The breach is the only source, about two stops under; half of each face is lost; grain a little heavier here. Light rakes along the table; paper is the brightest thing in the room after the envoy's robe.
- **Action:** 0.0 hold. 1.1 the envoy speaks (off). 4.0 Cael's hand enters at the far end. 5.0 cut.
- **Dialogue:**
  - 1.1-3.6 s · ENVOY: "The Ash-Caliph asks for another council."
- **Super:** none.
- **Sound:** The envoy's voice off, smooth. Paper stirring in the draught from the breach.
- **Why:** Paper is the only old thing on the table: three promises, broken and kept.

### 4.6 · 2:24.0 to 2:30.0 · 6 s

**Close insert, shallow (the seal)** · 50 mm · 1.3 m · 25° down onto the table · locked-off · set: gatehouse

- **Subject:** Cael's finger on one seal
- **Position:** 0.9 m from the middle seal, 25° above the table plane, from the envoy's side of the table.
- **Movement:** Locked-off.
- **Composition:** The middle seal centred; Cael's fingertip lands on it from the top of frame. Only the seal and the fingertip are sharp (one of the four shallow shots); the other two judgments fall away soft at left and right.
- **Light:** The breach is the only source, about two stops under; half of each face is lost; grain a little heavier here. The fingertip and seal are kept readable: hands never go dark.
- **Action:** 0.4 the finger lands on the seal. 1.0 he speaks. 6.0 cut, the finger still there.
- **Dialogue:**
  - 1.0-5.0 s · CAEL: "He wagered his crown and lost it. That is his seal."
- **Super:** none.
- **Sound:** His voice low and slow. Nothing else.
- **Why:** He does not argue; he puts a finger on the evidence.

### 4.7 · 2:30.0 to 2:42.0 · 12 s

**Wide, symmetrical (frame inside the frame)** · 35 mm · 1.6 m · eye · locked-off · set: gatehouse

- **Subject:** Cael and the envoy flanking the breach; the boy small under the arch between them
- **Position:** At the back wall, 11 m from the breach and square to it. Cael stands 5 m from camera at left, the envoy 6 m from camera at right, both in profile facing each other across the breach.
- **Movement:** Locked-off.
- **Composition:** The bible's 'frame inside the frame' (p.13), made symmetrical. The breach is a bright jagged shape on the centre line; inside it, small and exact, the arch with the boy at its centre, 2.5% of frame height. Cael a black column at left, the envoy a pale column at right, flanking the breach like two pillars. The forecourt floor through the breach sits on the lower third.
- **Light:** The breach is the only source, about two stops under; half of each face is lost; grain a little heavier here. Both men are edges against the opening.
- **Action:** 0.4 the envoy speaks. 3.4 Cael looks through the breach at the boy. 4.0 Cael. 6.4 the envoy. 8.8 Cael. 10.8 the envoy. 11.5-12.0 no answer; cut on the silence.
- **Dialogue:**
  - 0.4-3.2 s · ENVOY: "The Ash-Caliph will not live beneath your law."
  - 4.0-5.8 s · CAEL: "The same law as that boy."
  - 6.4-8.2 s · ENVOY: "You do not own his people."
  - 8.8-10.3 s · CAEL: "They have never been his."
  - 10.8-11.5 s · ENVOY: "Nor yours."
- **Super:** none.
- **Sound:** Dry voices in a stone room. Under 'The same law as that boy', the city's pulse, faint. No score.
- **Why:** The whole argument is staged around a child neither man can reach.

### 4.8 · 2:42.0 to 2:48.0 · 6 s

**Hand close shot (the closed hand forced open)** · 40 mm · 1.9 m · Cael's own eye, looking down at his hand · locked-off · set: gatehouse

- **Subject:** Cael's hand on the campaign map: closes, then is made to open
- **Position:** 1.0 m above the back of his hand as it lies on the table: Cael's own eye as he leans over the table. Square to the hand.
- **Movement:** Locked-off.
- **Composition:** HAND TEMPLATE (see 'The matched frames'): 40 mm, lens 1.0 m from the back of the hand and square to it, level with the hand, fingers to frame top, hand centred and 65% of frame height, deep focus beyond the fingers. Here the hand lies on the campaign map; the edges of the three judgments show at the frame sides.
- **Light:** The breach is the only source, about two stops under; half of each face is lost; grain a little heavier here. The back of the hand is lit by the breach (hands never go dark).
- **Action:** 0.0 the hand flat. 0.8 it closes on the table, knuckles whitening. 2.5 held. 3.2 he makes it open, one finger at a time. 5.0 flat again. 6.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** No answer: silence. Map paper crackles under the fist.
- **Why:** He forces a closed hand open; holding back costs him.

### 4.9 · 2:48.0 to 2:59.0 · 11 s

**Medium-wide two-shot from behind (the window)** · 40 mm · 1.7 m · eye · slow push-in 1.1 m · set: gatehouse

- **Subject:** Cael and the envoy side by side, both facing the breach
- **Position:** Behind the two men on the room's long axis: 5.5 m from them at the start, 4.4 m at the end. They stand 1.5 m apart, 4 m from the breach.
- **Movement:** Slow push-in, 1.1 m over 11 s (0.1 m/s, 20% of the distance), eased. The scene's one push, motivated by 'Safe.'
- **Composition:** Two silhouettes from behind, side by side, both facing the breach (Arrival's window): Cael black left of centre, the envoy pale right of centre, heads on the upper third. Between their shoulders, through the breach, the stair and, small, the arch with the boy. They speak without looking at each other.
- **Light:** The breach is the only source, about two stops under; half of each face is lost; grain a little heavier here. Both are shapes against the opening; the envoy's robe holds a little grey.
- **Action:** 0.5 the envoy. 3.6 Cael repeats the word. 4.2-5.6 the envoy does not say it twice. 5.6 Cael. 7.8 the envoy. 9.4 Cael. 11.0 cut.
- **Dialogue:**
  - 0.5-2.9 s · ENVOY (CONT'D): "Come to the council. You would be safe."
  - 3.6-4.2 s · CAEL: "Safe."
  - 5.6-7.2 s · CAEL (CONT'D): "I was promised that before."
  - 7.8-8.8 s · ENVOY: "Give him time."
  - 9.4-10.8 s · CAEL: "I gave him years."
- **Super:** none.
- **Sound:** Voices close, no echo; between lines, the far guns. The pulse under 'I gave him years.'
- **Why:** Two men looking at the same city and wanting opposite things from it.

### 4.10 · 2:59.0 to 3:05.0 · 6 s

**Medium-wide, low across the table** · 35 mm · 1.05 m · table level · locked-off · set: gatehouse

- **Subject:** Dust falling on the judgments; the envoy shutting his eyes
- **Position:** At the table's end, lens 15 cm above the table top, 2 m from the judgments. The envoy stands 4 m beyond the table's far end against the dark wall.
- **Movement:** Locked-off.
- **Composition:** The three judgments in the lower third, foreground, sharp. The envoy pale and upright on the upper-right third, sharp too (deep focus). Dust falls through the breach light between them.
- **Light:** The breach is the only source, about two stops under; half of each face is lost; grain a little heavier here. The falling dust catches the breach light as a fine grey curtain.
- **Action:** 0.4 the gun in the high arcade FIRES again (off). 1.0 dust falls from the ceiling onto the judgments. 2.6 the envoy shuts his eyes. It is one of his. 6.0 cut, his eyes still shut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The arcade gun, close enough to shake the room; a rumble through the stone; grit hissing onto paper.
- **Why:** Before the fall, dust only falls: the envoy knows the shot was his own side's.

### 4.11 · 3:05.0 to 3:11.0 · 6 s

**Medium-wide, centred (Cael commands)** · 35 mm · 1.7 m · eye · locked-off · set: gatehouse

- **Subject:** Cael sends the envoy back
- **Position:** On the breach axis inside the gatehouse, 5 m in front of Cael, who stands with the breach behind him.
- **Movement:** Locked-off.
- **Composition:** Centred and symmetrical: Cael's silhouette on the centre line, the breach a bright jagged frame around him; the arch and the boy over his left shoulder, small. The captain half a step behind his right shoulder. The envoy's pale edge at frame left, half out of frame.
- **Light:** The breach is the only source, about two stops under; half of each face is lost; grain a little heavier here. Cael pure black against it.
- **Action:** 0.8 Cael, to the envoy. 2.6 he turns his head to the captain. 3.4 to the captain. 5.0 the captain steps toward the envoy. 6.0 cut.
- **Dialogue:**
  - 0.8-2.6 s · CAEL (CONT'D): "Look what he built with them."
  - 3.4-5.0 s · CAEL (CONT'D) (to his captain): "Return him to his Caliph."
- **Super:** none.
- **Sound:** Quiet, final. The far guns resume.
- **Why:** Symmetry when Cael commands: the decision has a centre.


---

## Scene 5. INT. GATEHOUSE - THE BREACH - LATER

**3:11.0 to 4:09.0 · 58 s · shots 5.1 to 5.9**

- **Colour key:** Key 5, "Break the Crown!" (bible p.7, top). Light: Sky, and gun-flash that clips to white for a frame. Swatches: #161D26 #2E3A44 #5D696E #FF8A2E #FFF3D0. "The truce lamp is gone. Amber now means fire from both sides. The standard-bearer's banner is still bound."
- **Camera note:** CLEAR (bible p.12), the decision (5.7, 6.3): "His face at 'I know.' and his hand at the shutter are fully readable. Nothing hides what he does." The order is held wide (5.8): nobody gets a close-up for "Bring it down."

### 5.1 · 3:11.0 to 3:16.0 · 5 s

**Long-lens wide through the breach** · 85 mm · 1.6 m · eye · locked-off · set: gatehouse

- **Subject:** The envoy, small on the great stair, reaching the inner wall; its gate shutting
- **Position:** Inside the gatehouse, 4 m behind the breach; lens through it up the great stair to the inner wall, 300 m away.
- **Movement:** Locked-off.
- **Composition:** The breach's dark jagged edges border the frame. Inside, compressed by the long lens, the great stair rises; the envoy is a pale fleck (2% of frame height) climbing the last flight to the inner-wall gate, upper centre.
- **Light:** Pre-dawn sky over the city. The truce lamp's white falls on the near stones from above frame.
- **Action:** 0.0 he climbs. 2.6 he reaches the gate. 3.4 it shuts behind him. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The gate's boom arrives late across the distance, at 4.3.
- **Why:** The last door closes; talking is over.

### 5.2 · 3:16.0 to 3:21.0 · 5 s

**Medium, low (the navigator)** · 50 mm · 0.6 m · the navigator's eye level, lying · locked-off · set: gatehouse

- **Subject:** The blind navigator turning his face up to where the truce lamp hangs
- **Position:** 1.8 m from the navigator, side-on, at his eye height as he lies on the stretcher.
- **Movement:** Locked-off.
- **Composition:** The navigator in profile, head on the right third, 30% of frame height, plated hood pushed back. Above him, two-thirds of the frame is dark ceiling and the broken roof edge, where white light from the truce lamp lies on the stone.
- **Light:** The truce lamp's white spill through the broken roof; the breach's grey from frame left.
- **Action:** 0.0 he lies still, in profile. 1.5 he turns his face up, square to the roof, toward where the lamp hangs. 5.0 cut: a moment before it is struck.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** His slow breath; the pulse; nothing else.
- **Why:** The blind man sees it first. (The six-minute cut loses this shot.)

### 5.3 · 3:21.0 to 3:24.0 · 3 s

**Wide (the lamp bursts)** · 50 mm · 1.6 m · eye · locked-off · set: forecourt

- **Subject:** The truce lamp over the gatehouse, shot out
- **Position:** In the forecourt, 70 m from the gatehouse, lens on the lamp. An Aethelgard gunner stands 6 m from camera at frame left.
- **Movement:** Locked-off.
- **Composition:** The gatehouse black against slate sky in the lower half; the lamp upper centre, the brightest point in the film. The gunner a silhouette at frame left, 30% of frame height.
- **Light:** The truce lamp, then nothing: the frame drops a stop when it goes.
- **Action:** 0.8 a single shot from the terraces. 1.0 the lamp bursts: glass and a spray of light, then dark. 1.6 the gunner turns his head. 3.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** One crack from the terraces, the glass, then a full second of silence.
- **Why:** White leaves the film: the truce dies as one small light going out.

### 5.4 · 3:24.0 to 3:33.0 · 9 s

**Medium two-shot in profile (between the road and the boy)** · 35 mm · 1.7 m · eye · locked-off · set: gatehouse

- **Subject:** The captain showing the open causeway; Cael looking at the boy under the arch
- **Position:** Side-on inside the gatehouse, 4.5 m from the two men. The open gate to the causeway is 6 m from them at frame left; the breach to the forecourt is 6 m from them at frame right.
- **Movement:** Locked-off.
- **Composition:** Cael centre-left and the captain centre-right, both in profile, heads on the upper third. Frame left: the gate opening and the causeway running straight away to the horizon, open and empty. Frame right: the breach, and through it the arch with the boy (2%). The king stands exactly between the road and the boy. The breach holds the boy, as at 4.1 and 4.7.
- **Light:** Sky from both openings: cold slate through the gate, grey through the breach. Faces half lost.
- **Action:** 0.0 the captain turns and shows Cael the causeway with an open hand toward frame left. 0.8 he speaks. 3.2 Cael looks the other way, through the breach, at the boy under the arch. 5.4 he answers. 9.0 cut.
- **Dialogue:**
  - 0.8-2.8 s · CAPTAIN: "We can withdraw with the wounded."
  - 5.4-7.2 s · CAEL: "And leave him to finish this?"
- **Super:** none.
- **Sound:** Wind through the gate from the plain; the forecourt's noise through the breach. One ear each.
- **Why:** The choice is laid out in space: the open road on one side, the child on the other.

### 5.5 · 3:33.0 to 3:37.0 · 4 s

**Wide through the breach (aftermath)** · 35 mm · 1.6 m · eye · locked-off · set: gatehouse

- **Subject:** Every gun on the terraces opening up; a strike into Aethelgard's lines
- **Position:** In the breach, 2 m behind its edge; lens across the forecourt to Aethelgard's lines 90 m away and the terraces beyond.
- **Movement:** Locked-off.
- **Composition:** The breach's edges frame left and right. A line of standing soldiers across the lower third, 3% each. The terraces fill the upper half.
- **Light:** Muzzle flashes ripple across the tiers, amber, each clipping to white for a frame; slate sky.
- **Action:** 0.0 every gun on the terraces opens up. 1.2 a strike lands among the lines; smoke and dust hide it. 2.6 the dust thins: gaps in the line. Men who were standing are not. 4.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The barrage as one rolling wall; the strike as a close concussion; then ringing.
- **Why:** Aftermath over impact: we see the gaps, not the bodies.

### 5.6 · 3:37.0 to 3:45.0 · 8 s

**Wide, two figures from behind (the vertical city)** · 40 mm · 1.7 m · eye · locked-off · set: gatehouse

- **Subject:** Cael looking up to the Crown; the captain following his eyes; lamps moving down the stair
- **Position:** 3.5 m behind Cael and the captain, who stand in the breach; lens level, through the breach up the terraces to the Crown, 450 m away.
- **Movement:** Locked-off.
- **Composition:** Symmetry: Cael and the captain are black shoulders-and-heads at the bottom of frame, left and right of centre, framed by the breach. Between their heads the city climbs: the great stair up the centre line with small lamps moving down it, and the Crown on the summit at the top of frame, amber in its openings.
- **Light:** Slate sky; amber from the Crown's openings and the terrace guns.
- **Action:** 0.0 Cael lifts his head past the terraces to the Crown. 1.2 the captain follows his eyes, then turns his head to Cael: he knows what he is about to be asked. 1.8 he speaks. 6.6 the lamps keep moving down; the lowest, on the lower flight, is Liora's. 8.0 cut.
- **Dialogue:**
  - 1.8-6.6 s · CAPTAIN: "Those works feed the batteries and the lower city. The stairs are still full."
- **Super:** none.
- **Sound:** The captain low and fast. The terrace guns, steady.
- **Why:** The picture says it before the line does: the stairs are full while he says so.

### 5.7 · 3:45.0 to 3:52.0 · 7 s

**Close-up, frontal (clear)** · 50 mm · 1.75 m · eye · locked-off · set: gatehouse

- **Subject:** Cael: 'I know.'
- **Position:** 1.6 m from Cael's face, frontal, on his eye line.
- **Movement:** Locked-off.
- **Composition:** Cael centred, eyes on the upper third, face 45% of frame height. Both eyes readable: the one time a face in the gatehouse is not half lost.
- **Light:** The breach sky as a soft key from frame left; for once nothing hides him (Clear).
- **Action:** 0.5 he draws breath to speak. 1.4 loses it. 2.4 steadies. 3.2 he speaks. 4.0-7.0 held: he hears the envoy's word in his captain's mouth.
- **Dialogue:**
  - 3.2-3.9 s · CAEL: "I know."
  - 5.0-6.2 s · CAPTAIN: "Then give them time."
- **Super:** none.
- **Sound:** His breath, very close. The captain's line from off frame.
- **Why:** Clear: his face at 'I know.' is fully readable. Nothing hides what he does.

### 5.8 · 3:52.0 to 4:04.0 · 12 s

**Extreme wide interior (the order, held wide)** · 24 mm · 1.6 m · eye · locked-off, long hold · set: gatehouse

- **Subject:** 'Bring it down.' The captain turning to the guns
- **Position:** In the gatehouse's far corner, 15 m from Cael. The gate to the causeway is at frame left, the breach at frame right.
- **Movement:** Locked-off. One of the six long holds.
- **Composition:** The whole room. Cael and the captain small at centre, 12% of frame height. The two stretchers on the floor in the right foreground, the navigator among them. The gate opening at left, the causeway beyond it; the breach at right, the terraces and their flashes. Nobody gets a close-up for this line.
- **Light:** Sky through both openings; gun-flash through the breach clipping to white for single frames.
- **Action:** 1.0 Cael looks at the open road once. 2.6 he looks back. 3.4 he gives the order. 4.4-8.0 the captain does not move: he warned him, he stayed. 8.0 he turns to the breach and the guns and steps into it. 9.2 he calls it to the gun line. 12.0 cut.
- **Dialogue:**
  - 3.4-4.4 s · CAEL: "Bring it down."
  - 9.2-10.8 s · CAPTAIN (in Old Aethel, subtitled): spoken "Brecath thone corune!" · subtitle "Break the Crown!"
- **Super:** none.
- **Sound:** No score. The order is quiet; the captain's cry is not. The terrace guns go on, far.
- **Why:** The worst decision in the film is held at a distance, so the audience has to sit with it.

### 5.9 · 4:04.0 to 4:09.0 · 5 s

**Wide (the batteries)** · 35 mm · 1.6 m · eye · locked-off · set: forecourt

- **Subject:** Aethelgard's batteries fire; the standard-bearer's hand stopped at the bindings
- **Position:** Behind and beside Aethelgard's gun line in the forecourt, 14 m from the standard-bearer; lens toward the ziggurat, 500 m away.
- **Movement:** Locked-off.
- **Composition:** Key 5 (bible p.7). Three gun barrels rise diagonally from the lower left; the shells arc toward the ziggurat at right. The captain a silhouette with a raised arm and the standard-bearer beside him, tall pole and bound dark banner, centre-right, 15% of frame height. Horizon near the lower third.
- **Light:** Gun-flash amber, each flash clipping to white for one frame; slate sky. Amber now means fire from both sides.
- **Action:** 0.0 the batteries swing up. 1.0 FIRE: three flashes, 0.2 s apart. 2.2 the standard-bearer reaches for the bindings of his banner. 3.0 the captain looks at him. 3.4 his hand stops. Not yet. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Three reports, then the shells' rising whistle over the cut.
- **Why:** Aethelgard fires; the colour is held back, bound.


---

## Scene 6. EXT. THE CROWN / THE BREACH / THE STAIR - CONTINUOUS

**4:09.0 to 4:55.0 · 46 s · shots 6.1 to 6.10**

- **Colour key:** Key 6, "The open hand" (bible p.7, bottom; also the cover, p.1). Light: Gun-flash behind him. The fire in the Crown. Swatches: #050303 #5B2C14 #C96A25 #E69A45 #FFF6DD. "A pure silhouette, with no fill light. The stalled shutter is the only other bright thing in frame, so the eye joins the hand to it."
- **Camera note:** CLEAR (bible p.12), as in scene 5. Cael centred (6.3, 6.8). A long hold (6.3), a burst of short cuts (6.6-6.8), then the Crown. Liora's view (6.5) is flat and long-lens: shape, not detail. The film's only orange scene.

### 6.1 · 4:09.0 to 4:14.0 · 5 s

**Long-lens wide (the Crown takes the salvo)** · 100 mm · 1.6 m · eye, tilted up 9° · locked-off · set: crown

- **Subject:** The works taking the salvo; armoured shutters closing plate by plate
- **Position:** From the forecourt, 480 m from the Crown; lens tilted up 9°.
- **Movement:** Locked-off.
- **Composition:** The Crown's pressureworks across the frame: a stepped block, a row of lit openings. Two Solforiz gunners on its gallery at 2% of frame height give the size. The summit's edge on the lower third; orange haze above.
- **Light:** The fire inside the works (furnace amber) and the shell bursts. Orange haze.
- **Action:** 0.0 the salvo strikes: flashes along the works. 0.8 armoured shutters close over the openings, plate by plate, left to right. 3.6 the last shutter starts down across the last opening. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Impacts, then the shutters as an iron cascade, each plate its own clang. The city is protecting itself.
- **Why:** The city is not a target but a body closing its eyes.

### 6.2 · 4:14.0 to 4:18.0 · 4 s

**Long-lens medium (the stalled shutter)** · 135 mm · 1.6 m · eye, tilted up 9° · locked-off · set: crown

- **Subject:** The last shutter stopping; the air warping at its edge
- **Position:** The same place as 6.1, 480 m from the Crown.
- **Movement:** Locked-off.
- **Composition:** The last opening centred: the shutter stalled two-thirds down, a bright slit of fire beneath it. A gunner's silhouette on the gallery at frame left, 8% of frame height.
- **Light:** The fire in the works through the slit: the brightest small thing in frame.
- **Action:** 0.0 the shutter moving. 0.4 it stops. 0.6-4.0 the air at its edge warps, a shimmer with no glow. 4.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The battle thins to that hum again, over one second.
- **Why:** Something is holding the city's eye open; we feel who before we see him.

### 6.3 · 4:18.0 to 4:30.0 · 12 s

**Hand close shot (Open: it destroys)** · 40 mm · 2 m · level with the hand · locked-off, long hold · set: gatehouse

- **Subject:** Cael's raised open hand in the breach; the stalled shutter beyond
- **Position:** 1.0 m behind the back of Cael's raised right hand, over his right shoulder. Through the breach, the Crown is 480 m beyond the fingers.
- **Movement:** Locked-off. One of the six long holds.
- **Composition:** HAND TEMPLATE (see 'The matched frames'): 40 mm, lens 1.0 m from the back of the hand and square to it, level with the hand, fingers to frame top, hand centred and 65% of frame height, deep focus beyond the fingers. Centred and symmetrical: the breach's jagged edges frame left and right. Bandaged forearm from lower left, three bands of binding, blood soaking through (it reads near-black, never red). In the gap right of the fingers, the Crown and its stalled bright slit: the only other bright thing in frame, so the eye joins the hand to it. The edge of his head lower left, black.
- **Light:** Gun-flash behind the hand, out in the haze: the hand is a pure silhouette, no fill, each flash putting a thin rim on the fingers so they stay readable.
- **Action:** 0.0 the hand open, holding. 2.0 the fingers start to shake. 5.0 blood darkens the binding further. He holds. 12.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The hum; his breath straining under it; gun-flashes as soft thumps, as if under water.
- **Why:** Open: it destroys. The same frame as 3.4, now doing the opposite.

### 6.4 · 4:30.0 to 4:34.0 · 4 s

**Medium, frontal (the navigator counts)** · 50 mm · 0.95 m · the navigator's eye level, sitting · locked-off · set: gatehouse

- **Subject:** The navigator sitting bolt upright, face to the Crown, striking the rail: ONE. TWO.
- **Position:** 2.2 m in front of the navigator, on his line to the Crown, beside Cael's legs.
- **Movement:** Locked-off.
- **Composition:** The navigator sits bolt upright, centred and square to the lens: he has turned square to the thing he sees. 45% of frame height. His filmed eyes look through the lens. His right hand at the stretcher rail, lower right. Cael's cloak a black vertical at the left edge.
- **Light:** Gun-flash through the breach behind the camera hits his face in orange pulses; his eyes catch it like glass.
- **Action:** 0.0 bolt upright. 1.2 he strikes the rail: ONE. 2.4 TWO. 4.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Two rail strikes, metal, even, loud inside the hum. (The six-minute cut loses this shot.)
- **Why:** The blind man counts what he sees: a Seen report, four beats ahead.

### 6.5 · 4:34.0 to 4:39.0 · 5 s

**Long-lens POV, flat (Liora's look)** · 135 mm · 1.5 m · Liora's eye · tilt up 14° · set: forecourt

- **Subject:** LIORA'S POV from the lower flight: the king at the breach, the open hand, then the stalled shutter
- **Position:** On the lower flight of the great stair, at Liora's eye, 130 m from the breach.
- **Movement:** One tilt up, 14° at 4.4°/s: 1.2 s on the hand, tilt 1.2-4.4 s, land on the shutter for 0.6 s. Her look from the hand to the shutter is one move.
- **Composition:** Start: the breach centred, Cael a small black shape in it, the open hand the readable thing (the figure 5% of frame height). End: the Crown's stalled shutter centred, the bright slit. Flat and compressed: shape, not detail.
- **Light:** Gun-flash and the fire in the works; everything flattened by haze.
- **Action:** 0.0 the king at the breach, that open hand. She knows what that hand does. 1.2 she looks up. 4.4 the stalled shutter. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Her breathing; the hum is thinner out here; grit under her feet.
- **Why:** She is the only one who has seen the hand do both things.

### 6.6 · 4:39.0 to 4:41.0 · 2 s

**Insert (THREE. FOUR.)** · 50 mm · 0.8 m · rail level · locked-off · set: gatehouse

- **Subject:** The navigator's hand striking the rail
- **Position:** 0.9 m from the rail, side-on.
- **Movement:** Locked-off.
- **Composition:** The stretcher rail across the lower third; his knuckles enter from the top and strike. Hand 40% of frame height.
- **Light:** Gun-flash, orange pulses.
- **Action:** 0.2 THREE. 1.1 FOUR. 2.0 cut on the fourth beat.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Two strikes, the same as before. Start of the burst.
- **Why:** The count completes; now the cuts speed up.

### 6.7 · 4:41.0 to 4:42.5 · 1.5 s

**Wide (the second salvo)** · 35 mm · 1.6 m · eye · locked-off · set: forecourt

- **Subject:** The second salvo going in
- **Position:** Behind Aethelgard's gun line, the 5.9 position, 6 m closer to the barrels.
- **Movement:** Locked-off.
- **Composition:** Three barrels on the lower-left diagonal, the ziggurat right; crew silhouettes 20%.
- **Light:** Muzzle flashes clip to white for one frame.
- **Action:** 0.0 FIRE. 0.4 shells away. 1.5 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Three reports at once.
- **Why:** Fast: the decision is already made.

### 6.8 · 4:42.5 to 4:45.0 · 2.5 s

**Wide (the cover frame)** · 32 mm · 1.7 m · eye · locked-off · set: gatehouse

- **Subject:** Only then does the hand come down
- **Position:** Inside the gatehouse, 6 m behind Cael, on the line from him to the Crown.
- **Movement:** Locked-off.
- **Composition:** Key 6 and the cover (bible pp.1, 7), centred: Cael's full silhouette on the centre line in the breach, the jagged edges framing left and right; the ziggurat at right with the bright slit at its summit; orange haze. Arm raised, hand open.
- **Light:** The second salvo's flashes light the haze behind him; no fill.
- **Action:** 0.0 the flashes behind him. 0.8 only then does the hand come down; the arm is at his side by 1.8. 2.5 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The hum releases at 0.8; real battle noise rushes back.
- **Why:** The cover image, used once: the moment the hand lets go.

### 6.9 · 4:45.0 to 4:50.0 · 5 s

**Long-lens wide (the Crown falls)** · 75 mm · 1.6 m · eye, tilted up 7° · locked-off · set: crown

- **Subject:** The shutter dropping shut; fire coming through; a tower falling across the great retaining wall; the wall giving
- **Position:** From the forecourt, 480 m from the Crown. An Aethelgard gunner stands 8 m from the lens at frame left.
- **Movement:** Locked-off.
- **Composition:** The summit, the tower beside the works and the great retaining wall below them fill the upper two-thirds. The gunner's silhouette, foreground left, 25% of frame height.
- **Light:** The fire in the works breaking out; ochre dust enters at 4.2 s, the first in the film.
- **Action:** 0.0 the shutter drops shut. 0.6 fire shows around its edges. 1.4 then comes through. 2.2 the tower leans. 3.4 it falls across the great retaining wall. 4.2 the wall gives; dust. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Slow, then suddenly very fast: a clang, fire building, the tower's long groan, then the wall as one huge low crack.
- **Why:** The cause is seen, so the fall that follows is his.

### 6.10 · 4:50.0 to 4:55.0 · 5 s

**Extreme wide (the city goes dark)** · 32 mm · 1.6 m · eye · locked-off · set: city

- **Subject:** The pulse stumbling; the city's lamps going out together
- **Position:** In the forecourt behind Aethelgard's gun line, 600 m from the ziggurat. Three gun crew stand 10-15 m from the lens.
- **Movement:** Locked-off.
- **Composition:** The whole terraced city across the middle band, horizon on the lower third, every terrace lamp lit amber. The three crew silhouettes along the bottom of frame.
- **Light:** The city's amber lamps and the Crown's fire, then only the fire's glow and dust.
- **Action:** 0.4 the pulse stumbles: three beats (0.4, 1.2, 2.0). Two (2.9, 3.6). None. 4.3 on the missing beat the lamps go out together (PROPOSED: the breathing lamps). 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The pulse, three beats, two, then none. Its absence is the loudest thing in the film.
- **Why:** Furnace amber leaves the film: the city's heart stops.


---

## Scene 7. EXT. SOLFORIZ - THE FALL - CONTINUOUS

**4:55.0 to 5:20.0 · 25 s · shots 7.1 to 7.4**

- **Colour key:** Key 7, "The fall" (bible p.8, top). Light: Sky through rising dust. Contrast drops as the dust climbs. Swatches: #3B4146 #6F6D66 #3A3227 #8F7D5F #D9C69C. "The dust is lit from above and rises faster than the towers fall. This is where ochre enters the film."
- **Camera note:** The only handheld in the film (7.1, 7.2), small, while Liora runs. Then the held wide (7.3) and the aftermath (7.4).

### 7.1 · 4:55.0 to 5:00.0 · 5 s

**Medium-wide, handheld (running)** · 32 mm · 1.5 m · eye · handheld, backing down · set: fall

- **Subject:** Liora driving the last civilians down; dust taking the flight behind her
- **Position:** Handheld on the great stair, backing down 3 m ahead of Liora at her pace.
- **Movement:** Handheld, small: the operator backs down the steps at about 2 m/s, keeping her 3 m away. One of only two handheld shots in the film.
- **Composition:** Liora left of centre, 40% of frame height, her raised hand driving the last civilians down past the lens. The flight behind her fills with dust rolling down from the top of frame.
- **Light:** Sky through rising dust; contrast drops as the dust arrives.
- **Action:** 0.0 she is already running. 2.0 the dust takes the flight above her. 3.5 two civilians pass the lens. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** A roar from above; feet; her breath.
- **Why:** Panic is the only thing the camera is allowed to shake for.

### 7.2 · 5:00.0 to 5:05.0 · 5 s

**Medium, handheld (the mirror)** · 35 mm · 1.4 m · eye · handheld, settles · set: fall

- **Subject:** Liora reaching the arch; the boy and a dozen others; the smashed lantern; the mirror
- **Position:** Handheld at the arch, 2 m from Liora, following her in.
- **Movement:** Handheld, small: follows her in and settles as she kneels.
- **Composition:** Under the arch: the boy and a dozen others pressed against the stone. The smashed lantern on the ground, lower right; Liora kneels to it, right third.
- **Light:** Grey dust light through the arch; the mirror shard catches the sky once.
- **Action:** 0.0 she reaches the arch. 1.0 the boy. 1.8 the lantern lies smashed. 2.4 she pulls its mirror free. 3.8 she keeps it, pressed to her coat. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Glass grinding under her knee; the roar outside.
- **Why:** She saves the one thing that can still hold light.

### 7.3 · 5:05.0 to 5:15.0 · 10 s

**Extreme wide (the fall, held wide)** · 32 mm · 1.6 m · eye · locked-off · set: fall

- **Subject:** A terrace settling; houses leaning together into dust; the stair going; the upper city coming down
- **Position:** In the forecourt, 260 m from the foot of the stair; the arch with the survivors is 40 m from the lens at lower left.
- **Movement:** Locked-off.
- **Composition:** Key 7 (bible p.8). The stair climbs from the lower left; four tall towers with cross-arms stand at right; terraces above the broken wall. The arch at lower left with the survivors in it at 3% of frame height: the anchor.
- **Light:** Sky through rising dust. The cloud is lit from above. No fireball. Ochre takes the frame.
- **Action:** Slow, then suddenly very fast. 0.0-4.0 a terrace above the broken wall settles, barely moving. 4.0 its houses lean together. 5.5 they go into dust. 6.5 the stair goes. 7.0 the whole upper city comes down: the four towers topple right into the cloud, and the dust rises faster than the buildings fall. 10.0 cut on dust.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** A low groan for four seconds; then one rising roar; at 9.0 the sound drops out to a high ringing.
- **Why:** Held wide, the fall is a fact, not a spectacle; the small arch tells us who is under it.

### 7.4 · 5:15.0 to 5:20.0 · 5 s

**Wide (frame inside the frame: the skyline gone)** · 27 mm · 1.5 m · eye · locked-off · set: fall

- **Subject:** When the dust thins, the skyline is gone
- **Position:** Under the arch, 4 m behind the survivors, lens out through the arch toward where the city stood.
- **Movement:** Locked-off.
- **Composition:** The arch's dark round-topped opening frames the view. The survivors' silhouettes fill its lower third. Beyond them dust thins to an empty, pale sky where the terraces were.
- **Light:** Ochre dust thinning to pale sky.
- **Action:** 0.0 dust thick. 2.0 it thins. 4.0 nothing above the broken wall. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The ringing fades to silence. Grit.
- **Why:** Aftermath: the absence is the image.


---

## Scene 8. EXT. FORECOURT - THE RUINS - SUNRISE

**5:20.0 to 5:55.0 · 35 s · shots 8.1 to 8.6**

- **Colour key:** Key 8, "The ruins at sunrise" (bible p.8, bottom). Light: Low sun through dust. The first direct sunlight. Swatches: #4D5761 #8B8A84 #ECD29A #6C6557 #1B1917. "The skyline is flat and the sky is empty. The banners are still bound and read almost black. One pole is lowered."
- **Camera note:** The empty sky returns (8.1). The silence is held wide (8.4). Locked-off throughout.

### 8.1 · 5:20.0 to 5:26.0 · 6 s

**Extreme wide (the empty sky, sunrise)** · 32 mm · 1.6 m · eye · locked-off · set: ruins

- **Subject:** Silence on both sides; the first direct sun; steam from broken pipes
- **Position:** In the forecourt, 150 m from the flat ruined skyline. A broken pipe vents steam 15 m from the lens at frame left; one soldier stands beside a gun near it.
- **Movement:** Locked-off.
- **Composition:** The empty sky returns: horizon on the lower third, a flat ruined skyline along it, two-thirds empty sky in ochre and gold. The sun just rising right of centre, low, through dust. The pipe's steam plume at frame left; the soldier 6% of frame height.
- **Light:** Low sun through dust: the first direct sunlight in the film. Long shadows toward camera; warm highlights.
- **Action:** 0.0 silence on both sides. Steam hisses. The soldier does not move. 6.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Air hissing from broken pipes. No guns. No score.
- **Why:** The sky is emptied out a second time, and waits.

### 8.2 · 5:26.0 to 5:32.0 · 6 s

**Wide, side-on along the army line** · 40 mm · 1.6 m · eye · locked-off · set: ruins

- **Subject:** The men who do not agree on what they have seen; 'We've won.'
- **Position:** Side-on to the army line, 9 m from it.
- **Movement:** Locked-off.
- **Composition:** The army line runs across the frame, men at 25% of frame height, gold-rimmed silhouettes against the low sun. One sinks against a gun at left; one at centre stares at the terraces; the standard-bearer at the right edge of frame.
- **Light:** Low sun from behind them: silhouettes with gold rims; the bound banners read almost black.
- **Action:** 0.0 a man sinks against a gun, simply glad. 1.2 another cannot look away from the terraces. 2.6 the standard-bearer lifts his bound banner. 3.8 he finds his voice. 6.0 cut.
- **Dialogue:**
  - 3.8-4.5 s · STANDARD-BEARER: "We've won."
- **Super:** none.
- **Sound:** Pipes hissing. His voice thin in the open air; no echo comes back.
- **Why:** One boy says the word everyone else refuses.

### 8.3 · 5:32.0 to 5:36.0 · 4 s

**Medium, from behind (Not Cael)** · 50 mm · 1.7 m · eye · locked-off · set: ruins

- **Subject:** Nobody answers; the standard-bearer lowering the pole
- **Position:** 3 m behind Cael, centred on his back. The standard-bearer is 14 m beyond, right of frame.
- **Movement:** Locked-off.
- **Composition:** Cael's back, black, centred and still, shoulders and head 50% of frame height. Past his right shoulder, small, the standard-bearer with the raised pole on the right third.
- **Light:** Low sun ahead of Cael; he is a silhouette.
- **Action:** 0.0 nobody answers. Not Cael: he does not move. 1.6 the standard-bearer hears the silence. 2.4 he lowers the pole to a diagonal. 4.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Pipes. Nothing else.
- **Why:** The king's silence is the answer.

### 8.4 · 5:36.0 to 5:46.0 · 10 s

**Extreme wide (the silence, held wide)** · 40 mm · 1.6 m · eye · locked-off, long hold · set: ruins

- **Subject:** The army as a band of small silhouettes; only the pipes
- **Position:** 70 m behind the army line, square to it, lens toward the ruins and the sun.
- **Movement:** Locked-off. One of the six long holds.
- **Composition:** Key 8 (bible p.8). Horizon about 70% down the frame. The army a band of small silhouettes (3%) across the lower band, banners bound and near-black. The standard-bearer's lowered pole a diagonal at right. Flat ruins, steam plumes, the sun just right of centre.
- **Light:** Low sun through dust; long shadows, warm highlights.
- **Action:** 0.0-10.0 the silence holds. Only the pipes. Steam drifts. Nobody moves. 10.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Only the pipes. Held longer than is comfortable.
- **Why:** Victory with nothing in it.

### 8.5 · 5:46.0 to 5:50.0 · 4 s

**Medium, offset (grit falls)** · 50 mm · 1 m · Liora's seated eye level · locked-off · set: ruins

- **Subject:** Under the arch, grit falling; Liora looking up; the pulse
- **Position:** Under the arch, 2 m from Liora, who sits with the boy, at her seated eye height.
- **Movement:** Locked-off.
- **Composition:** Liora offset on the right third, low, 35% of frame height. The arch's inner stone fills the top-left; a bar of sun lies across it, and grit falls through the bar.
- **Light:** A bar of low sun through the arch; the rest in ochre shade.
- **Action:** 0.0 grit falls from the stone. 1.4 Liora looks up. 2.2 beneath the hiss, a PULSE. 4.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** A PULSE, slower than the city's, heavier: felt more than heard.
- **Why:** The arch is failing, and something else is coming.

### 8.6 · 5:50.0 to 5:55.0 · 5 s

**Wide, the captain in the foreground third** · 32 mm · 1.7 m · eye · locked-off · set: ruins

- **Subject:** The captain looking at the sky; a shadow sliding across the army
- **Position:** 4 m from the captain, beside him; lens along the army line, which recedes 200 m toward the ruins.
- **Movement:** Locked-off.
- **Composition:** The captain on the left third from the waist up, 40% of frame height. The army line recedes behind him into the frame, sunlit.
- **Light:** Low sun, then the shadow: the frame goes from gold to charcoal from back to front.
- **Action:** 0.0 the captain turns from the ruins and looks at the sky. 1.5 a shadow edge slides across the far end of the army, toward camera. 3.5 it passes over the captain. 4.5 it reaches the lens; the frame darkens. It keeps coming. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The pulse again, closer; the pipes stop mattering.
- **Why:** Shadow before shape: the threat arrives as a change in the light.


---

## Scene 9. EXT./INT. THE FIRST SHIP - SUNRISE

**5:55.0 to 6:13.0 · 18 s · shots 9.1 to 9.3**

- **Colour key:** Key 9, "The first ship" (bible p.9, top). Light: The sun is behind the ship. Gold on its upper edge, shadow under it. Swatches: #0D0E10 #2B2D31 #B9BEC3 #F3C77A #CDB88C. "The broken gate towers give its size. Kwind-09 iron hung with Korvenian silver. Its shadow reaches the army before the ship does."
- **Camera note:** The anchor (9.1). One slow pan reads the hull's length (9.2). The camera leaves the ground for the first time, inside the hull, on the 1.3 frame (9.3).

### 9.1 · 5:55.0 to 6:00.0 · 5 s

**Extreme wide (the anchor: the first ship)** · 35 mm · 1.6 m · eye · locked-off · set: ship

- **Subject:** Out of the sunrise: lights and a dark mass in the dust; the broken gate towers
- **Position:** On the causeway, 300 m outside the broken gate; lens east through the gate, over the ruins, into the sunrise.
- **Movement:** Locked-off.
- **Composition:** Key 9 (bible p.9) as the anchor. The two broken gate-tower stumps at centre, 8% of frame height; the army line a band of silhouettes along the ground; the flat ruins beyond. Above, out of the sunrise, lights and a dark mass in the dust, already four times the towers' width. The ruins stay readable under it.
- **Light:** The sun behind the mass: a dark shape with a gold rim forming in the dust.
- **Action:** 0.0 lights in the dust. 2.0 a dark mass forms behind them. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Engines rising, felt in the chest before they are heard.
- **Why:** The towers that looked huge in scene 2 are now the small thing that measures.

### 9.2 · 6:00.0 to 6:07.0 · 7 s

**Wide, looking up (the whole vessel)** · 27 mm · 1.6 m · eye, tilted up 12° · slow pan right 14° · set: ship

- **Subject:** A keel coming clear; then the whole vessel
- **Position:** In the forecourt among the army; the ship passes 60 m overhead and 100 m ahead. Lens tilted up 12°.
- **Movement:** Slow pan right, 2°/s (14° over 7 s), following the keel as it comes clear, so the hull's length reads by travel.
- **Composition:** The keel enters from the top of frame and comes clear. Then the hull fills the upper two-thirds and runs past both frame edges: three lobed envelopes over a long armoured body, a row of silver points along it, rigging lines hanging, the keel below. Kwind-09 iron hung with Korvenian silver, re-plated, built onto. The army's heads and bound poles along the bottom edge, 6%.
- **Light:** The sun behind the ship: the hull a silhouette with a gold rim on its upper edge, shadow under it.
- **Action:** 0.0 a keel comes clear. 2.5 the lower hull: plates on plates, silver hung on iron. 5.0 it keeps coming. 7.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Its engines bury every other sound, and the picture goes quiet with them: no other sound at all.
- **Why:** Not a weapon but years of work, arriving.

### 9.3 · 6:07.0 to 6:13.0 · 6 s

**Insert (the ring band, again)** · 50 mm · 4.8 m · level with the ring (airborne, inside the hull) · locked-off · set: ship

- **Subject:** The copper coupling from the foundry, turning under load; scarred; the same silver ring
- **Position:** Inside the hull, 2.4 m from the coupling's surface, square to it, level with the ring: the 1.3 frame exactly. The camera leaves the ground here, for the first of two times.
- **Movement:** Locked-off.
- **Composition:** RING TEMPLATE: 50 mm, lens 2.4 m from the drum and square to it, level with the ring; copper fills the frame, the silver ring a horizontal band 45% down from frame top, wall to wall. Exactly 1.3. The copper is now scarred and dented; the ring is not (Korvenian silver is never dented). The drum turns under load: rivet lines travel left to right across the frame.
- **Light:** Sunrise gold through a hull port off frame right grazes the copper. No furnace, no violet.
- **Action:** 0.0-6.0 the coupling turns under load. 6.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Inside: the engine stroke, the deep version of the foundry's. The coupling groans under load.
- **Why:** What we watched being made carries the fleet: years in one cut.


---

## Scene 10. EXT. FORECOURT - THE RUINS - CONTINUOUS

**6:13.0 to 7:56.0 · 103 s · shots 10.1 to 10.16**

- **Colour key:** Key 10, "The ward" (bible p.9, bottom; shots 10.1 to 10.6) and "The banners" (bible p.10; shots 10.11 to 10.16). Light: The ward: bars of sunrise through the rigging, violet from the keel. The banners: low sun under the fleet, amber points where the housings open. Swatches: #0A0A0D #7D7466 #FFD48A #7C4DF0 #FFFFFF (ward) / #0B0B0D #5A564E #ECD29A #8E1B1B #FFC070 (banners). "Violet falls on the survivors and gold on everything else. Her mirror is the one point of white. The arch stops above their heads. Then red at last, and ragged: not every banner opens. Cael is small and does not turn. The fleet fills the sky he was given in scene 2."
- **Camera note:** FAR (bible p.12), the ending (10.6 to 10.8): "She sees him small, across dust and an army. His own close-up stays clear, so we see that he knows her." The first high angle is hers (10.3). Long holds at 10.6, and 10.9 held into 10.10.

### 10.1 · 6:13.0 to 6:17.0 · 4 s

**Wide (the arch gives)** · 32 mm · 1.6 m · eye · locked-off · set: ruins

- **Subject:** The arch beginning to give; bars of sunrise through the rigging
- **Position:** In the forecourt, 45 m from the arch and square to it. The ship's belly is 40 m overhead.
- **Movement:** Locked-off.
- **Composition:** The round-topped arch centred, its right pier broken; the survivors under it (about a dozen and the boy) at 4% of frame height. The ship's dark belly across the top fifth. Long bars of sunrise come through gaps in its rigging and cross the frame diagonally, drifting slowly left.
- **Light:** Sun in moving bars through the rigging; everything between the bars in the ship's shadow.
- **Action:** 0.0 the arch begins to give: its crown stones shift, dust runs from the joints. 2.0 one bar crosses Liora among the survivors, and the mirror in her hand glints: a single white point, as in key 10. 4.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Engines, steady. Stone grinding against stone.
- **Why:** The people who survived the fall are about to be crushed by what is left of it.

### 10.2 · 6:17.0 to 6:23.0 · 6 s

**Medium-wide, behind her shoulder (the mirror)** · 35 mm · 1.5 m · Liora's eye, tilted up 15° · locked-off · set: ruins

- **Subject:** Liora putting the mirror in a bar of sun; four flashes on the ship's belly
- **Position:** 1.8 m behind Liora's right shoulder at the edge of the arch; lens tilted up 15° toward the ship's belly.
- **Movement:** Locked-off.
- **Composition:** Liora's head and shoulder a silhouette in the lower-left third, 35% of frame height; her raised hand with the mirror in a bar of sun. The dark belly of the ship fills the upper two-thirds. Four white points land on it, up and right of centre.
- **Light:** A moving bar of sun crosses her; the mirror throws it back as the one point of white in the film.
- **Action:** 0.0 a bar crosses her. 0.8 she puts the mirror in it. 1.6, 2.4, 3.2, 4.0 FOUR flashes thrown up at the ship's dark belly. 6.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Under the engines, nothing marks the flashes; the count is silent and exact.
- **Why:** White returns, in her hand: the count her city lived by.

### 10.3 · 6:23.0 to 6:28.0 · 5 s

**Hand close shot (Open: another protects)** · 40 mm · 38 m · high: the ward officer's side of the glass, looking down 35° · locked-off · set: ship

- **Subject:** The ward officer at the round observation glass: the flashes cross her mask; she opens a hand
- **Position:** Inside the hull at the round observation glass, which is canted down toward the ground. Lens 1.0 m behind the back of her raised right hand, at her right shoulder. The lens is about 38 m above the forecourt; the arch is below and ahead.
- **Movement:** Locked-off. The camera's second and last time off the ground; the film's first high angle, and it belongs to her.
- **Composition:** HAND TEMPLATE (see 'The matched frames'): 40 mm, lens 1.0 m from the back of the hand and square to it, level with the hand, fingers to frame top, hand centred and 65% of frame height, deep focus beyond the fingers. Her pale gloved hand, the foundry's gloves again. Beyond the fingers, through the round glass, far below: the arch and its survivors in bars of gold. At the right edge of frame her pale mask in profile, silver at the collar. The frame shows the arch only, never the army or the battle below.
- **Light:** The four flashes come up through the glass and cross the mask, white; otherwise sunrise bounced off the ruins.
- **Action:** 0.0-1.6 four flashes cross the mask (the same four, overlapped in the cut). 1.8 she opens the hand. 2.4 she speaks. 5.0 cut.
- **Dialogue:**
  - 2.4-3.9 s · WARD OFFICER (in High Korvenic, subtitled): spoken "Va-ten-t el sveulea!" · subtitle "Hold the stone."
- **Super:** none.
- **Sound:** Inside the hull: a hush, the engines as a hum through the floor. Her voice level and procedural; the last t released on the beat.
- **Why:** Open: another protects. The same frame as 3.4 and 6.3, and it is not his hand.

### 10.4 · 6:28.0 to 6:34.0 · 6 s

**Wide, at the boy's eye (the ward)** · 24 mm · 1 m · the boy's eye level, tilted up 12° · locked-off · set: ward

- **Subject:** A bell note; violet light dropping from the keel; the falling arch stopping above their heads; the boy looking up
- **Position:** In the forecourt, 18 m from the arch, at the boy's eye height; lens tilted up 12°.
- **Movement:** Locked-off.
- **Composition:** Key 10, 'The ward' (bible p.9). The arch centred, its crown stones falling, then hanging in a violet cone. About ten survivors under it, the boy at the front centre, 8% of frame height. Soldiers with poles at the left edge. Bars of gold sun cross everything outside the cone.
- **Light:** Violet from the keel, falling on the survivors only: light, not a wall; they stand in it and are lit by it. Gold sun on everything else.
- **Action:** 0.5 a bell note. 0.8 violet light drops from the keel (6:29). 1.2 the arch's falling stones stop above their heads and stay there. 4.0 the boy looks up. 6.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** One bell note, long; under it the engines drop away for its length.
- **Why:** Rescue from a stranger: the same miracle as the held stone, with someone else's hand.

### 10.5 · 6:34.0 to 6:40.0 · 6 s

**Wide (more ships)** · 32 mm · 1.7 m · eye · locked-off · set: ruins

- **Subject:** Behind the first ship, two more; then a formation; and more
- **Position:** Among the army, 5 m from the captain; lens east over the ruins.
- **Movement:** Locked-off.
- **Composition:** The first ship's belly cuts across the top quarter. Below it, in the gold sky over the ruins, two more ships come out of the dust, then a formation, then more, each layer smaller and paler. The ruins stay readable along the horizon on the lower third. The captain in profile on the left third, 30% of frame height. Never the whole fleet in one frame yet.
- **Light:** Low sun under the ships; the ships are grey silhouettes in gold haze.
- **Action:** 0.0 two more ships. 2.0 a formation. 3.2 and more. 3.6 the captain names them. 6.0 cut.
- **Dialogue:**
  - 3.6-5.2 s · CAPTAIN: "These are the forward ships."
- **Super:** none.
- **Sound:** Engines layering, one pitch over another.
- **Why:** The sky held open in scene 2 begins to fill.

### 10.6 · 6:40.0 to 6:51.0 · 11 s

**Close shot, shallow (the wrist, again)** · 50 mm · 1.5 m · Liora's eye · locked-off, long hold · set: ward

- **Subject:** The boy pointing at Cael; Liora lowering his hand; her hand settling over her wrist
- **Position:** Behind Liora's right shoulder under the arch, at her eye height; lens 1.6 m from her wrist. Cael is 75 m away across the forecourt.
- **Movement:** Locked-off. One of the six long holds.
- **Composition:** WRIST TEMPLATE: 50 mm, lens 1.6 m from the wrist, wrist and the hand on it in the lower-left third at 35% of frame height, shallow focus (one of the film's four shallow shots). Same size and place in frame as 3.5. Liora off-centre and low (centre and edge, bible p.13). Beyond, soft: dust standing between the survivors and the army, and Cael small among the soldiers right of centre, 2% of frame height.
- **Light:** Violet on her hands (she stands in the ward); gold beyond.
- **Action:** 0.0 the boy's arm enters from the right, pointing across the forecourt at Cael. 2.2 Liora lowers his hand. 4.0 her own hand settles over her wrist, where he held it. 4.0-11.0 she does not look away. 11.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The engines as a floor; the bell's tail; her breath.
- **Why:** Far: she sees him small, and her own hand covers the place he held.

### 10.7 · 6:51.0 to 6:56.0 · 5 s

**Long-lens POV, flat (his look)** · 135 mm · 1.75 m · Cael's eye · locked-off · set: ward

- **Subject:** Cael sees her; then the boy; then the people under another power's protection
- **Position:** Cael's POV across the forecourt, 75 m to the arch.
- **Movement:** Locked-off.
- **Composition:** Flat and compressed. Liora under the arch on the left third, violet-lit, 12% of frame height; the boy beside her; the people standing in the violet cone across the frame; the stopped stones hanging at the top edge. Gold dust between.
- **Light:** Violet on them; gold dust between.
- **Action:** 0.0 her. 1.6 then the boy. 3.2 then the people. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Engines only.
- **Why:** His look matches hers at 6.5: the long lens is how these two see each other.

### 10.8 · 6:56.0 to 7:01.0 · 5 s

**Close shot, shallow (his hand, mirroring her wrist)** · 50 mm · 0.95 m · level with the hand · locked-off · set: ruins

- **Subject:** It goes through him; the hand at his side will not stop shaking; he looks behind him for the road
- **Position:** Lens 1.6 m behind and to the right of Cael's right hand as it hangs at his side, level with it. The arch is 75 m beyond.
- **Movement:** Locked-off.
- **Composition:** The wrist frame of 3.5 and 10.6, mirrored: his hand in the lower-right third at 35% of frame height, sharp. Beyond, soft: dust, the army's edge, and the arch in its violet cone with Liora in it, on the left third. Shallow focus (one of the four).
- **Light:** Low sun from beyond the arch rims the shaking fingers; the hand is fully lit (hands never go dark).
- **Action:** 0.0 the hand at his side will not stop shaking. It goes through him. 3.4 he turns to look behind him, for the road he was offered; the hand swings out of frame right, leaving the soft violet arch. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The engines; his breathing, uneven; the binding creaking with each tremor.
- **Why:** Far: his hand stays clear and shakes in front of her, so we see that he knows her.

### 10.9 · 7:01.0 to 7:13.0 · 12 s

**Medium two-shot in profile, symmetrical (the road between them)** · 40 mm · 1.75 m · eye · locked-off, long hold · set: ruins

- **Subject:** The road he was offered, with the fleet's shadow along it; the captain level with Cael for the first time
- **Position:** In the forecourt, 4.5 m from the pair, on the causeway's line; lens west through the broken gate and down the road. Cael and the captain stand 1.6 m apart.
- **Movement:** Locked-off. One of the six long holds; held into 10.10.
- **Composition:** Two profiles level with each other for the first time, heads on the same line on the upper third: Cael at frame left, the captain at frame right. Between them, centred, the road he was offered runs through the broken gate across the glass plain to the horizon. The shadow of the fleet lies along it.
- **Light:** Low sun from behind the camera: gold on both faces; the road beyond striped by the fleet's shadow.
- **Action:** 0.0 Cael looking down the road; it is still there. 1.0 the captain speaks. 2.8 Cael turns to him. 3.8 there is no pardon in the captain's face. 4.6 but his eyes go past the king, to the army (off frame left): the wounded, the gun crews, the standard-bearer. All waiting on one man. 8.0 the captain speaks again. 10.2-12.0 held.
- **Dialogue:**
  - 1.0-2.4 s · CAPTAIN: "The stairs were full."
  - 8.0-10.2 s · CAPTAIN (CONT'D): "You do not get to stop now."
- **Super:** none.
- **Sound:** Engines. No score. The captain's voice level and plain.
- **Why:** The road out is right there between them, and the captain will not let him take it.

### 10.10 · 7:13.0 to 7:18.0 · 5 s

**Hand close shot (Closed: war)** · 40 mm · 1.3 m · level with the hand · locked-off · set: ruins

- **Subject:** Cael making the hand close, the army beyond it
- **Position:** 1.0 m behind the back of Cael's right hand, raised to chest height in front of him; lens over his right forearm. The army is 15-60 m beyond the fingers.
- **Movement:** Locked-off.
- **Composition:** HAND TEMPLATE (see 'The matched frames'): 40 mm, lens 1.0 m from the back of the hand and square to it, level with the hand, fingers to frame top, hand centred and 65% of frame height, deep focus beyond the fingers. Beyond the fingers, sharp: the army waiting, the wounded, the gun crews and the standard-bearer with his bound pole, in gold light.
- **Light:** Low sun from beyond the army rims the fingers; the back of the hand lit by the dust's bounce. Hands never go dark.
- **Action:** 0.0 the shaking hand comes up from his side, open, into the frame's place (a staging choice, so that all four hand shots lay over each other). 1.4 he looks at them past it. No one can give this order for him. 2.4 he makes the hand close. 3.4 it is a fist, steady now. 5.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Engines. The leather of the binding creaks as the fist closes.
- **Why:** Closed: war. The last of the four hands, and the only one that does not hold anything up.

### 10.11 · 7:18.0 to 7:22.0 · 4 s

**Medium, centred (Raise the banners)** · 50 mm · 1.75 m · eye · locked-off · set: ruins

- **Subject:** Cael raising his eyes to the fleet; 'Raise the banners.'; the captain's signal
- **Position:** 2.8 m in front of Cael, on his centre line, lens level.
- **Movement:** Locked-off.
- **Composition:** Centred and symmetrical: Cael from the chest up on the centre line, 55% of frame height. The army behind him in gold dust; the captain level at the right edge.
- **Light:** Low sun under the fleet, in front of him: his face in gold for the first time.
- **Action:** 0.0 eyes down. 0.8 he raises his eyes to the fleet (above the lens). 1.8 the line lands as his eyes reach the fleet. 3.2 the captain gives the signal, his eyes on the city. 4.0 cut.
- **Dialogue:**
  - 1.8-3.0 s · CAEL: "Raise the banners."
- **Super:** none.
- **Sound:** Engines; his voice quiet, not shouted.
- **Why:** Symmetry when Cael commands: the line lands on the look, as the bible stages it.

### 10.12 · 7:22.0 to 7:30.0 · 8 s

**Medium-wide, alone in frame (the first banner)** · 40 mm · 1.6 m · eye · locked-off · set: ruins

- **Subject:** The standard-bearer seeing the signal; tearing the bindings off; his banner opening alone
- **Position:** 7 m from the standard-bearer, side-on.
- **Movement:** Locked-off.
- **Composition:** The standard-bearer alone in frame on the lower-left third, 35% of frame height; his pole rising up the left third. The right two-thirds is empty gold dust under the dark belly of the ship. When the banner opens, it fills the empty space.
- **Light:** Low sun through dust; when the cloth opens it catches the sun: blood red, the first colour on the Aethelgard side (PROPOSED colour), at 7:23.
- **Action:** 0.0 he sees the signal. 0.4 he tears the bindings off. 1.0 his banner opens, alone. 3.6 he cries out. 8.0 cut.
- **Dialogue:**
  - 3.6-4.6 s · STANDARD-BEARER (in High Drakonic, subtitled): spoken "Vael-bryna!" · subtitle "Burn the sky!"
- **Super:** none.
- **Sound:** Cloth cracking open in the wind; his cry, alone; nothing answers for a beat.
- **Why:** He wanted to be told it was worth it; now he is told to fight.

### 10.13 · 7:30.0 to 7:36.0 · 6 s

**Long-lens wide down the line (ragged)** · 85 mm · 1.7 m · eye · locked-off · set: ruins

- **Subject:** This time he is answered: banner after banner, ragged; not every man, not the captain; Cael does not turn
- **Position:** At the end of the army line, 6 m behind it and 2 m to the side; lens along the line.
- **Movement:** Locked-off.
- **Composition:** The long lens stacks the line into the frame. Banners open one after another from near to far, ragged, with gaps where men do not raise theirs. Cael mid-frame, 10% of frame height, a still black trapezoid facing the fleet; the captain beside him with no banner. The ships' bellies across the top of frame.
- **Light:** Low sun under the fleet; red cloth catching it in a broken row.
- **Action:** 0.0 the men nearest take it up. 1.5 then the line, ragged, banner after banner opening under the ships. Not every man. Not the captain. Cael does not turn. 6.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The cry taken up voice after voice, uneven. No score: the voices are the music.
- **Why:** An army choosing, not cheering.

### 10.14 · 7:36.0 to 7:40.0 · 4 s

**Wide, looking up (weapon housings)** · 50 mm · 1.6 m · eye, tilted up 25° · locked-off · set: ship

- **Subject:** Weapon housings opening along the nearest hull
- **Position:** Among the army; lens tilted up 25° to the nearest hull, 45 m overhead.
- **Movement:** Locked-off.
- **Composition:** The hull's flat underside across the upper two-thirds. Along it a row of about 13 housings open one after another, each a small amber point. A red banner's top edge in the lower-right corner as the anchor. At the left end of the row, the round observation glass seen from outside and below: a pale disc, her mask in it, 1% of frame.
- **Light:** Furnace amber's one return: small points, never floodlights. The hull's underside in shadow.
- **Action:** 0.0-3.0 the housings open left to right, one every 0.25 s. 4.0 cut.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** Thirteen mechanical clacks, one per housing, over the engines.
- **Why:** The fire comes back, on the other side.

### 10.15 · 7:40.0 to 7:48.0 · 8 s

**Extreme wide (the empty sky, filled)** · 32 mm · 1.6 m · eye · locked-off · set: ruins

- **Subject:** The army under its banners; the ruined capital between; the coalition filling the sky
- **Position:** 120 m behind the army line, centred on Cael; lens east.
- **Movement:** Locked-off.
- **Composition:** Key 10, 'The banners' (bible p.10). Horizon on the lower third. The fleet in layers fills the two-thirds of sky held open since 2.1: the nearest hull's belly across the top left with its row of amber points, further ships smaller and paler toward the horizon. The flat ruined capital between. The army a band of silhouettes along the bottom with ragged red banners. Cael small and centred, 4% of frame height. The fleet whole in one frame for the first time.
- **Light:** Low sun under the fleet; gold; amber points; red cloth.
- **Action:** 0.0-8.0 nothing moves but the banners and the fleet's slow advance. Cael does not turn. 8.0 CUT TO BLACK.
- **Dialogue:** none.
- **Super:** none.
- **Sound:** The cry dies away by 4.0. Then only engines, swelling into the cut.
- **Why:** The sky he was given in scene 2 is full.

### 10.16 · 7:48.0 to 7:56.0 · 8 s

**Black (title)** · no lens · none · none · set: ship

- **Subject:** The lock; the title; one engine stroke
- **Position:** No picture.
- **Movement:** None.
- **Composition:** Black. The title centred.
- **Light:** None.
- **Action:** 0.0 black. 0.8 a great mechanical lock CLOSES. 2.0-6.5 the title. 5.5 one deep engine STROKE. 8.0 THE END.
- **Dialogue:** none.
- **Super:** "CROWNFALL: KING OF KINGS" 2.0-6.5 s. Small capitals, widely spaced, bone on black, centred.
- **Sound:** The lock, enormous and dry. Silence. One deep engine stroke, the pulse in its last form, left to ring out.
- **Why:** The pulse, which began in the foundry, belongs to the fleet now.

---

## Conflicts and how they were resolved

**Timings.** The per-scene timings in `BREAKDOWN.md` are kept exactly; the check sums each scene and the total to 476 s. The bible's colour bar (p.4) also fixes when each accent appears. The list lands on those marks as follows:

| Colour mark (bible p.4) | Bible time | Shot and moment here | Here |
|---|---|---|---|
| Violet: the seam | 0:12 | 1.3, at 2.0 s | 0:12.0 |
| White: the truce lamp | 0:40-0:45 | 2.3, whole shot | 0:40.0-0:45.0 |
| White: the truce lamp | 1:32-1:43 | 3.9, whole shot | 1:32.0-1:44.0 |
| White: the lamp's last light and burst | 3:15-3:20 | 5.2 to the burst in 5.3 at 1.0 s | 3:16.0-3:22.0 |
| Silver and copper return | 6:00-6:12 | 9.2 and 9.3 | 6:00.0-6:13.0 |
| White: the mirror | 6:14-6:28 | 10.1 at 2.0 s (the glint) to the flashes' end in 10.3 | 6:15.0-6:24.6 |
| Violet: the ward drops | 6:28-6:29 | 10.4, at 0.8 s | 6:28.8 |
| Violet: on Liora's hands | 6:41-6:48 | 10.6, whole shot | 6:40.0-6:51.0 |
| Red: the first banner opens | 7:23 | 10.12, at 1.0 s | 7:23.0 |

Two marks drift. The lamp bursts about 2 s later than the bar suggests, because 5.1 needs five seconds to show the envoy reach the gate. The mirror's white starts a second late and ends about 3 s early, because the four flashes are a quick count and 10.4 must drop the violet at 6:28. Everything else lands within a second of the bar.

**6.3, a matched hand that is also a centred long hold.** The bible asks for 6.3 to be one of the four matching hand close shots (p.13) and also for Cael to be centred and held long (pp.3, 12), and its colour key draws his full figure in the breach. One shot cannot be both a hand close shot and a full figure without a zoom. Resolution: 6.3 is the hand template, centred and symmetrical inside the breach edges, held 12 s. The full-figure key and cover frame becomes 6.8, where the hand comes down; Cael is centred there too.

**10.3, the ward officer.** The bible says she is seen "only through the round glass, from outside and below, then once from her side" (p.16), that 10.3 is the film's first high angle and belongs to her (p.12), and that 10.3 matches the other hand shots (p.13). Resolution: 10.3 is the once from her side, the high angle, and the hand template, looking down past her hand through the glass at the arch (only the arch, never the army). The view from outside and below is kept as a detail in 10.14, where the round glass is a pale disc with her mask in it at the end of the row of housings. Her flashes are seen twice, on the belly (10.2) and across the mask (10.3), as an overlap in the cut.

**10.6, the wrist that is also "off-centre and low".** The bible needs the same size as 3.5 (p.17), Liora off-centre and low (p.13), a long hold (p.12), and "she sees him small" (p.12). Resolution: one frame holds all four: the wrist in the lower-left third at the 3.5 size, Cael tiny and soft across the forecourt beyond, held 11 s.

**10.8, his close-up and his shaking hand.** `BREAKDOWN.md` reads 10.8 as his clear close-up and his shaking hand. A face and a hand hanging at his side cannot share a close frame without a fast tilt or a camera looking up at him, and the bible forbids seeing Cael from below outside 3.5. The bible makes 10.8 one of the four shallow shots, "his" hand (p.12). Resolution: 10.8 is the hand, built as the mirror of the 10.6 wrist frame, with her arch soft beyond it; his face is clear and readable in gold light in the next shots (10.9, 10.11).

**4.8, a hand on a table.** A hand lying flat can only be square to the lens from above. The camera is at Cael's own eye as he leans over the table, about 1.9 m up, so it stands where a person stands and is not an overhead or a "high angle" in the bible's sense.

**10.10, the hand at his side.** The script's hand is "at his side". For the four hand shots to lay over each other, he brings the shaking hand up to chest height before closing it. This is a staging choice, not a story beat; drop it if the author prefers the hand at his side, and shoot 10.10 from his eye looking down instead.

**1.2, 1.3 and 9.3, "the same angle and framing".** 1.2 is a wide and 1.3 is close on the ring, so they cannot share a framing. They share the angle (level, square to the drum's side), and 9.3 repeats 1.3's framing exactly. The ring is 4.8 m up, so the 1.3 camera stands on the loading gantry, where a worker would stand; it does not leave the ground.

**9.2, "then the whole vessel".** The script shows the whole first ship; the bible says the fleet is never whole in one frame until 10.15 and its key draws the hull running past both frame edges. Resolution: the first ship's length is read by one slow pan; the fleet is whole only at 10.15.

**Speeds and lenses.** `VILLENEUVE.md` keeps pans at 3°/s or slower; 6.5 tilts at 4.4°/s because the bible makes Liora's look one move inside a five-second shot. `VILLENEUVE.md` prefers 27-50 mm; the bible's 24-35 mm for places is used, with 24 mm only twice (5.8, 10.4).

**9.1 geography.** To put the broken gate towers under the ship as in key 9, the camera stands on the causeway outside the gate, looking east through it into the sunrise. This follows `BREAKDOWN.md`'s note that the fleet comes out of the sunrise beyond the city.

**Not on screen.** The epigraph "Blood remembers what stone forgets." is not filmed: the bible lists only the two supers and the main title (p.18). Liora's testimony was cut from the film by the author and does not appear.

**Six-minute cut.** 5.2 and 6.4 (the navigator's turns) are written so they can be lifted out cleanly (p.18).

## Bible proposals used (PROPOSED)

- 2.39:1 frame.
- The lens ranges, one push per scene, the six long holds and the ground rule (p.12).
- The city's lamps breathing on the four-beat pulse (2.1) and going out together at 6.10 (pp.14, 18). Not in the script.
- Blood red for the banners from 10.12 (pp.4, 18). The script says only "banners".
- The envoy's pale, unmarked robe (p.16).
- Liora's plated respirator hood is **not** drawn: the script gives her only a coat, and the bible leaves the hood open (p.18).
