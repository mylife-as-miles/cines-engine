# Mailbox: LEAD (only the original Claude session appends here; format in README.md)

### 2026-11-27 05:55 UTC · INFO · LEAD joining
At the author's request the original session works alongside you on four NEW stages: aircraft_cabin (ch 02-03, the
night flight), baggage_belt (ch 04-05, the bags riding the conveyor into the dark), prison_exterior (ch 08
establishing) and tim_desk (ch 09, the private appeals). New files only; nothing of yours is touched. Kit requests,
if any, come here addressed to CODEX (L1, L2...). Your handbacks are read when you post them.

### 2026-11-27 06:10 UTC · INFO · to CLAUDE · prison uniform everywhere
Codex's handback is read. One continuity point for your prison stages (courtroom, void_stage, visiting_room): use
`people.dawn_prison(uniform=True)` in all three, not only void_stage, so Dawn wears one prison outfit across the film.
Recorded in design/DECISIONS.md (Outfits); the author can reverse it. No reply needed.

### 2026-11-27 06:10 UTC · INFO · to CODEX and CLAUDE · open-ended shifts, and LEAD as fallback critic
README.md has a new section, "Open-ended shifts": no time limit, loop each stage until it passes, a plateau rule,
status entries every two hours. Critique requests go `to CRITIC`: Claude answers while active; LEAD answers any request
unanswered after 40 minutes (C10, departure_gate, is on that clock now) and all of them after Claude's handback.
The grade is with the author (A as it runs / A with the vignette fixed in RGB / B): `shoot.py` stays as it is until
LEAD posts the decision as request L1.

### 2026-11-27 06:20 UTC · INFO · to CODEX and CLAUDE · who takes Claude's stages at its handback
The author has decided: when Claude posts its HANDBACK, Codex takes over Claude's seven stages (detention_corridor,
void_stage, visiting_room, hearing_room, courtroom, home, chicago_night) in addition to its five; LEAD takes Claude's
three new stages (hongkong_street, hotel_room, train) and becomes the critic for all of Codex's stages. Details in
README.md, "When the Claude session hands back". CLAUDE: please push everything worth keeping before your handback,
and say in it which stages have unpushed or half-finished work.

### 2026-11-27 06:25 UTC · INFO · to CODEX · the pipeline for two
The author has set the division of work for when it is the two of us: LEAD builds each new stage to first finals and
one critique, then hands it to you with an `INFO · HANDOVER` entry here; from that entry the stage is yours to improve
in your loop, and LEAD reviews your critique requests. See README.md, "The pipeline for two". Coming first, as each
is built: aircraft_cabin, baggage_belt, prison_exterior, tim_desk. Do not touch a new stage before its HANDOVER entry.

### 2026-11-27 06:35 UTC · REQUEST L1 · to CODEX and CLAUDE · the author chose "A fixed"
Done by LEAD on the author's word (an exception to the kit ownership, because it is the author's decision and one line):
`scenes/shoot.py` GRADE now has `format=rgb24` before `vignette` (and `scenes/save_cast.py` the same). Every published
graded frame and every `design/boards/latest_<stage>.jpg` was regraded from `frames/raw/` with
`scenes/regrade_frames.sh` (new). Recorded in design/DECISIONS.md (Grade).
What you need to do: pull before your next render. CLAUDE: your separate render folder has its own copy of
shoot.py; copy the new GRADE line into it, or your next publish will carry the old grade. Anything you publish with
the old grade: run `bash scenes/regrade_frames.sh <stage>` after publishing (it reads the raw PNGs). Codex: reply L1
when you have pulled; no change needed in your files.

### 2026-11-27 06:55 UTC · REQUEST L2 · to CODEX · new cameras for the film's gaps
`design/COVERAGE.md` (new) maps all 184 picture beats of the script against the published frames: of 928 s, 262 s are
covered, 428.5 s partly, 110.5 s wait on stages being built, 127 s have nothing. It finds no further new stage is
needed; the holes close with new cameras or layouts in existing stages, graphics and documents. Its section
"New cameras in existing stages, ranked" lists 33; the ones in YOUR stages, highest first: evidence_table `page` and
`pair` (rank 1, 114.5 s: the plate for every document), evidence_table `screen` (rank 2, 39.5 s), inspection_room
`handbags` Ch 05 layout (3), inspection_room pre-discovery layout for `two_shot` and `wide` (6), inspection_room
`dawn_close` (11), inspection_room `match` (14), evidence_table `tickets` (15) and `entries` (16), then the optional
ones. Please add them to your loop, rank 1 and 2 first (they unblock the motion graphics), render their finals and
publish like any camera; ask for critiques as usual. The cameras listed for Claude's stages (void_stage, home,
chicago_night, detention_corridor, visiting_room) are Claude's until its handback, then yours.

### 2026-11-27 08:36 UTC · REPLY C11 · checkin_hall
Critique `coordination/critiques/checkin_hall_r6.json` (independent critic, checked by a second agent against the
frames at `0767015`): **mean 5.625, lowest 5** (set_dressing, cast, story_read), not pro level. Landed: wide crushed
blacks down to 6.6 %, agent typing with both hands, the trolley reads. Top fixes:
1. P1 `shoulder`: the passport is now an 18 px sliver at the bottom edge (raising the aim to 1.355 pushed it out) and
   the hand is a spread claw aimed at the lens. Aim z back to about 1.295; booklet offset y + about 0.03 so the pads
   sit on its trailing half; rest_hand curl about 8 with zero spread, knuckles 12–15 mm over the cover, thumb along
   its inner side (K4's `articulate_hand` can do this now). Check: 70 % of the booklet outline visible, 40 px inside.
2. P2 `shoulder`, `profile`: the hand is still hotter than the face (graded 165 vs 155; profile peak 224). Lower the
   hand flag to about z 1.55 so both the key and down_front paths cross it; the monitor is still the largest bright
   surface in the profile.
3. P2 `wide`: the blank sign panel is the largest bright shape; `sign_on` about 0.22, queue posts satin
   (roughness 0.35–0.45), optionally 28 mm and 0.3 m lower.

### 2026-11-27 08:36 UTC · REPLY C12 · leather_market
Critique `coordination/critiques/leather_market_r4.json` (checked, frames `d6a04c3`): **mean 5.875, lowest 5**
(materials, set_dressing, cast), not pro level. The wide is now a strong frame; the other two do not match it yet.
To the question: no, the lift and the release cannot be told apart. Top fixes:
1. P1 `purchase`: the 3.8° tilt is invisible from a lens 1 m above the counter. Tilt about 9° on the same pivot,
   raise the tent (0.040, radius 0.15), arch higher.
2. P1 `purchase`: the seller's hand hovers 18 mm over the nylon. rest_hand forces that clearance whenever top_z is
   callable; add a clearance argument and pose his hand pulling away (+0.10 back, +0.12 up), fingers relaxed.
3. P1 `wide`: the near stall's corner pinches the stallholder. Camera loc (-0.85, -1.20, 1.54), same aim and lens;
   verify every bone of his lies left of the corner's projection.
4. P2 `stall`, `wide`: the light leathers go pastel in the wide; darken them about half (values in the file), break
   the even rows and the repeated tags.

### 2026-11-27 08:36 UTC · REPLY C13 and C15 · evidence_table plates
Critique `coordination/critiques/evidence_table_r5.json` (one review of `page` at `9dd229f` and `pair`, `screen` at
`6b5702c`, checked): **mean 5.5, lowest 5**, not yet usable as plates. Geometry is right: the corner pins reproject
to the pixel and the sheet is A4. Top fixes, all scoped to the plate cameras:
1. P1: the sheet shades like a cushion (smooth-shaded grid under Solidify plus edge_tone): the far edge falls darker
   than the wood and the right corner pin lands on a dark rounded wedge. `use_smooth = False` on its polygons and a
   plate paper material without edge_tone.
2. P1: the brightest wood is a specular glint of the bulb around the pen, not the lamp pool. `visible_glossy = False`
   on the lamp parts for the plate cameras only, or rougher wood for them.
3. P1: the grade turns the warm paper neutral (149,149,149). Plate paper (0.80, 0.74, 0.60), raw R/B about 1.35–1.40;
   graded centre R−B +6 to +10. The comp should grade after pinning (the file has the method).
4. P2: turn the sheet to -18° and add a `page_foot` camera for the lower-half crop (in the file).
`pair` and `screen` have P3s in the file.

### 2026-11-27 08:50 UTC · INFO · to CODEX · C14, C16 and the handed-back stages
C14 (void_stage) and C16 (inspection_room `handbags`) are with fresh critics now, each checked by a second agent
before I post it; replies here within the hour. Per Claude's HANDBACK, the three stages it built (hongkong_street,
hotel_room, train) come to you through the pipeline for two: each gets its first critique now and then an
`INFO · HANDOVER` entry here; do not start on them before that entry. My own four are next in line: baggage_belt and
aircraft_cabin are built and waiting for their critique, prison_exterior and tim_desk are being built.

### 2026-11-27 09:05 UTC · REPLY C14 · void_stage
Critique `coordination/critiques/void_stage_r3.json` (independent, checked against the published frames at `4c5ff43`;
your newer chair, seated cell and close-up previews are not in it): **mean 5.75, lowest 4** (cast), not pro level.
The two empty shots are close to the bar (`cell_far` is the shrinking cell; `bags` is a worthy last image); the two
shots of Dawn are not. Your questions: hands no; cuffs no; trousers partly; floor light improved, not there; beam
taper yes in `dawn`, `dawn_high`, `cell_far` (but it peaks at 27–31 graded over 2–3, so it may band on YouTube).
1. P1 `dawn`, `dawn_high`: fanned fingers on the right hand, three hot dots (graded 129 on a hand of median 22) on the
   left, and both hands darker than the cloth. Close the fingers (`articulate_hand` from K4, or a wider converge
   cap in void_stage_fit), drop the hand mask's specular to 0.08 and roughness 0.85, lift the hands' value.
2. P1: the cuffs flare into pale bells (23 px against a 13 px forearm). Clamp the last 8 cm of each sleeve to the
   forearm radius + 10 mm, the last 1.5 cm to + 6 mm, like a buttoned band.
3. P1 `dawn`: trousers read as stiff tubes on short legs with a hard hem 4–5 cm off the floor; keep the one grey
   (continuity) and make the shirt hem read by form (hem_lift 0.03), raise the inseam, let the hem break on the shoe.
4. P2 `dawn`: from the front the bun is hidden and she reads as a man in a cap. DAWN_TURN 32, head (28, -6), a thin
   rim on the bun.

### 2026-11-27 09:05 UTC · REPLY C16 · inspection_room handbags
Critique `coordination/critiques/inspection_room_r6.json` (checked): **mean 5.94, lowest 5** (cast), not pro level.
The match is right: same order and marks as `evidence_table/purses`, and all three bags read whole and closed. But
the other five frames are still the round-5 renders (only regraded); e13e009's fixes are not in them yet.
1. P1 `handbags`: the top edge cuts Dawn at the neck, a headless torso behind the shoulder bag. Cheat her out of this
   camera (`"Dawn": (1.75, -1.10)` in its cheat) or hide her for it.
2. P1 `handbags` (and `overhead`): Officer A's hand is a pale claw hovering 12–16 px over the tote's handles,
   brighter than the bags. Make it a real grip on the handle apex, or take it out.
3. P2 `handbags`: the near bench top is the brightest large area (graded 125), product light, not a lit island; a
   shadow-only flag over the near bench for this camera.
4. P2 `handbags`: the tote's maker's stamp shows (+19 graded); remove it in this stage's module (details in the file).

### 2026-11-27 09:05 UTC · INFO · HANDOVER · hongkong_street
Stage `hongkong_street` is yours from this entry. Built by Claude (code `2688493`); brief in
`scenes/agent_loop/stages.json` ("hongkong_street"); finals published in `frames/graded/hongkong_street/` (wide, dawn,
window). First critique: `coordination/critiques/hongkong_street_r1.json`, **mean 4.75, lowest 4** (lighting,
materials, set dressing). Top: the signs read as pale paper cards with dark rims and light nothing (deep hues, glow,
spill); one cluster in `wide` (about x 750–830, y 315–370) reads letter-like and must go (overlap rejection in
signs()); `wide` reads as grey dusk, not night with a lit island; Dawn's reflection in `window` is opaque and sharp.

### 2026-11-27 09:05 UTC · INFO · HANDOVER · hotel_room
Stage `hotel_room` is yours from this entry. Built by Claude (code `c4b1c0d`); brief in stages.json ("hotel_room");
finals in `frames/graded/hotel_room/` (window, overhead, pack). First critique:
`coordination/critiques/hotel_room_r1.json`, **mean 5.25, lowest 4** (cast). Top: `pack` is 53 % mud with her
out-of-focus shoulder in the left quarter and plaster-mitten hands (move the camera past her shoulder, into the
duffel's mouth); `overhead` is flat product light (trim ceiling_bounce, reframe to include the headboard and lamp);
`window` has her as a small centred silhouette darker than the sky (reframe, a cool rim from the glass side).

### 2026-11-27 09:05 UTC · INFO · HANDOVER · train
Stage `train` is yours from this entry. Built by Claude (code `e727ce7`); brief in stages.json ("train"); finals in
`frames/graded/train/` (aisle, seat, rack). First critique: `coordination/critiques/train_r1.json`, **mean 5.0,
lowest 4** (lighting, cast). Top: the reflection in `seat` reads as a bald stranger (three-quarter so the bun breaks
the silhouette); `aisle` has no lit island, the dim strips render nearly as bright as the full one (rewrite the
emission curve and LEVELS as a real night setting); the pale seat covers upstage every figure (darker, smaller
antimacassars); the attendant stands lit in the vanishing point.

### 2026-11-27 09:44 UTC · REPLY C17 · departure_gate
Critique `coordination/critiques/departure_gate_r6.json` (checked, frames `114caaa`): **mean 6.06, lowest 5.5**
(materials, cast), up from 5.94; not pro level. Your measures hold (5.2 % at 6 or below by our decode; corners 17.2 /
17.6). The wide now works as an establishing shot. Answers: seats recede, mostly yes (an armrest stub at bottom
centre and two blocks cut by two edges; identical clean units); fingers at 4×: right hand yes, left hand no (it hooks
over the thigh edge like a grip and is still the brightest skin, p99 187 vs face 178); the call: not yet (she looks up
and away, nothing else moves). Top fixes:
1. P1 `seated_called`: turn her up and to HER right, past the lens, toward the podium and spk_4.2, with a small
   follow-through in the chest and the left hand lifting off the thigh (the order of `_turn` calls is in the file).
2. P1 `seated`: left hand palm back onto the thigh: 'down' about (0.45, 0, -0.89); face 10 levels above both hands.
3. P2 `window`, `wide`, `seated_called`: from behind the bun reads as a clip on a bald dome; rebuild it as a coil.
4. P2 `seated`: the flats read as clogs; flatten the toe box, thin the sole, cut the vamp back.
5. P2 `wide`, `window`: hide the stub's unit for the wide; the floor streak at the glass foot (peak 189 / 208) is as
   bright as her head; flag it.

### 2026-11-27 09:44 UTC · REPLY C18 · evidence_table page
Critique `coordination/critiques/evidence_table_r6.json` (checked, `75c2212`): **mean 5.75, lowest 5**; the stage is
scored as published (only `page` is new). **`page` is now a usable compositing plate**: all three r5 P1s are fixed and
measured (edges 0.98–1.01 of the 20 mm luma, no glint, graded centre 184.8/181.1/178.0, R−B +8.4).
Pins verified independently (half-maximum edge fits): 1.25 px top left, 0.69 top right, 0.44 bottom right, 0.42
bottom left. Every visible edge sits 0.24–0.78 px outside the pinned quad, so dilate the pinned page by 1 px in the
comp. Next:
1. P1 `pair`: the published pair is the old build (dark right and foot edges); re-render it from HEAD with fresh pins
   and the same checks.
2. P2 `page`: the highlighter reads as a khaki glue stick; drop it from the plate or rebuild it (albedo about
   0.95, 0.86, 0.02).
3. P2 `page`: plate wood still procedural (one repeating grain band, scratches around the foot, laminate end-joint);
   scratches 0.15, less ring contrast.
4. P2: add focus/fstop/depth and a paper matte to the corners JSON; publish `page_foot` with `in_frame` flags.

### 2026-11-27 09:45 UTC · INFO · HANDOVER · baggage_belt
Stage `baggage_belt` is yours from this entry. Built by LEAD; finals published at `0793765` in
`frames/graded/baggage_belt/` (curtain, belt, overhead); brief in `coordination/lead_stages.json` ("baggage_belt").
First critique: `coordination/critiques/baggage_belt_r1.json`, **mean 5.69, lowest 5** (lighting, materials). `belt`
is close (about 7). Top: `curtain` is flat front light, the lit check-in side behind the strips does not read, and her
case shows only its underside where the strips turn milky (they should read as rubber parted by a bag); `overhead` is
an even line-up with no subject (the chute slide is the brightest surface); the guard steel streaks read as wood grain.

### 2026-11-27 09:45 UTC · INFO · HANDOVER · aircraft_cabin
Stage `aircraft_cabin` is yours from this entry. Built by LEAD; finals at `0793765` in `frames/graded/aircraft_cabin/`
(aisle, over, window); brief in `coordination/lead_stages.json` ("aircraft_cabin"). First critique:
`coordination/critiques/aircraft_cabin_r1.json`, **mean 5.69, lowest 4.5** (cast). The cabin architecture is the strong
part. Top: in `window` the hands hover and splay and she faces the seat ahead, not the window; `over` is 65 %
defocused blobs, the wing crammed in the top fifth, flat mud (p99 79); in all three the reading-light pool is neither
the brightest nor the warmest thing (galley slits and cove outrank it); in `aisle` Dawn is a featureless 50 px head.

### 2026-11-27 09:45 UTC · INFO · HANDOVER · prison_exterior
Stage `prison_exterior` is yours from this entry. Built by LEAD; finals at `0793765` in
`frames/graded/prison_exterior/` (wall, gate, tower); brief in `coordination/lead_stages.json` ("prison_exterior").
First critique: `coordination/critiques/prison_exterior_r1.json`, **mean 6.75, lowest 6**: the closest of all the
stages to the bar; `tower` would pass today. Top: the rain reads as a fountain of bright spikes under the gate lamp
and ends on a ruled line in `wall` (and streaks draw dark hairlines over the lit concrete); the gate floodlight floats
(its pole and arm hide behind the lamp on the camera axis); the road reads as polished ice with one blobby puddle.

tim_desk follows when its build and critique finish.

### 2026-11-27 10:08 UTC · INFO · to CODEX · script version 2 and what it needs first
The author asked for a more intense, high-hook film, with the PDF as foundation, not text to follow. It is
`design/script/SCRIPT_V2.md` (about 12:55, ten chapters); six open questions are decided in DECISIONS.md (Gene seated
in home; Dawn seated in the cell; 2014 / CHINA on checkin_hall `wide`; red only on the seam; no black frames; match
cuts everywhere). Its direction tables name your stages and cameras. Nothing you are doing is wasted; the order of
need changes. Highest first:
1. **The cold open** (0:00–1:40) uses: checkin_hall `scale`, `shoulder`, `wide`; departure_gate `seated_called`;
   inspection_room `enter` (new: Dawn led in, the bags already on the bench), `wide`, `two_shot`, `dawn_close`,
   `match` (frontal on the two bags, dark wall above for YES; it must register with void_stage `bags` so the film can
   cut from one to the other on the bags), `handbags`; evidence_table `purses`; void_stage `dawn`, `dawn_high`,
   `bags`; prison_exterior `tower`; hearing_room `wide`, `witness`. **Match cuts**: inspection_room `match` ↔
   void_stage `bags` (bags the same size and place in frame), checkin_hall `scale` used twice (cold open and ch 3).
2. **Gene** (home): `dining` warm with Gene at the head and Tim beside him (ch 1); `dining` cold with Gene alone
   (ch 8); `chair` with Gene in profile, and the same frame empty (straight cut); void_stage `chair` matched to
   home `chair`.
3. **The void**: `pool`, `dawn_close` (room on the left for type), `divide`, `cell_far` → `cell_floor` pull back with
   Dawn seated small in the cell.
4. visiting_room `reverse` (over Dawn's shoulder through the glass to Tim), hongkong_street `company`, hotel_room
   `accept`, chicago_night `profile`, home `kitchen_over`, `blinds`, evidence_table `motifs`, `entries`, `tickets`.
Type positions: every frame that carries type needs a plain dark area (left third for the sentence frames, above the
bags for YES); I build the type and the documents in `gfx/` and will tell you if a frame needs room it lacks.

### 2026-11-27 10:10 UTC · INFO · HANDOVER · tim_desk
Stage `tim_desk` is yours from this entry; it is the last of my four. Built by LEAD; finals at `a16cc67` in
`frames/graded/tim_desk/` (desk, letters, window); brief in `coordination/lead_stages.json` ("tim_desk"; COVERAGE adds
Ch 01 and Ch 11 uses). In script version 2 it carries chapter 7 (letters, the lamp). First critique:
`coordination/critiques/tim_desk_r1.json`, **mean 5.69, lowest 5** (lighting, cast). Top: the warm key reads neutral
grey after AgX and the grade (lamp disc graded 0.685/0.681/0.686), so the "second warm interior" is cold: the warmth
has to be pushed in the scene (more saturated lamp and wood, less highlight) to survive grade A; `window` has no lit
island (Tim, chair and desk at 0.03–0.05); `letters` has the letters as its dimmest objects; in `desk` the writing hand
is a mitten behind a vertical pen. The same warmth problem will meet chicago_night and home's warm state.

### 2026-11-27 10:45 UTC · REPLY C19 · evidence_table pair
Critique `coordination/critiques/evidence_table_r7.json` (checked; `pair` at `f720f32`): the stage stays **mean 5.75,
lowest 5** because the other frames are older renders, but **`pair` is a usable compositing plate**. Pins verified
independently: 0.25–1.09 px over all eight corners, every visible edge 0.17–0.74 px outside its pinned line (my
compositor multiplies a page with white margins, so that sliver never shows). The right sheet's darker paper is lamp
falloff, not a different paper (same colour within 0.01 at matched luma). Fixes, in order:
1. P1 `pair`: a soft shadow wedge on document_left's top-left corner (raw 152 against 191–204) and a dark arc in the
   frame's top-left corner: the hidden lamp meshes still cast shadows, and that corner sits about 29° off the spot's
   axis in a 72°, blend 0.70 cone. Hide the lamp meshes from render for plate cameras, or give SPOT a 'plate' entry
   with a wider cone.
2. P2 `pair`, `page`: both are pre-8deb50b renders (scratches 0.5, the board end-joint hugging document_left's left
   edge, the khaki marker). Re-render both from HEAD with their corners and mattes.
3. P3 `pair`: no contact hairline on any edge; lift each sheet 0.25 mm for a 1–2 px shadow at 0.85–0.92 of the wood.
4. Note: the grade's vignette takes the outer columns to 85–107 graded. Harmless for my composite (it grades its own
   crop), so no change needed, only don't use a full-frame hold of the plate.
C20 (screen), C21 (inspection match) and C22 (void bags) are with critics now.
