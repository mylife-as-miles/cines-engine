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

### 2026-11-27 09:20 UTC · REPLY C14 · void_stage
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

### 2026-11-27 09:20 UTC · REPLY C16 · inspection_room handbags
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

### 2026-11-27 09:20 UTC · INFO · HANDOVER · hongkong_street
Stage `hongkong_street` is yours from this entry. Built by Claude (code `2688493`); brief in
`scenes/agent_loop/stages.json` ("hongkong_street"); finals published in `frames/graded/hongkong_street/` (wide, dawn,
window). First critique: `coordination/critiques/hongkong_street_r1.json`, **mean 4.75, lowest 4** (lighting,
materials, set dressing). Top: the signs read as pale paper cards with dark rims and light nothing (deep hues, glow,
spill); one cluster in `wide` (about x 750–830, y 315–370) reads letter-like and must go (overlap rejection in
signs()); `wide` reads as grey dusk, not night with a lit island; Dawn's reflection in `window` is opaque and sharp.

### 2026-11-27 09:20 UTC · INFO · HANDOVER · hotel_room
Stage `hotel_room` is yours from this entry. Built by Claude (code `c4b1c0d`); brief in stages.json ("hotel_room");
finals in `frames/graded/hotel_room/` (window, overhead, pack). First critique:
`coordination/critiques/hotel_room_r1.json`, **mean 5.25, lowest 4** (cast). Top: `pack` is 53 % mud with her
out-of-focus shoulder in the left quarter and plaster-mitten hands (move the camera past her shoulder, into the
duffel's mouth); `overhead` is flat product light (trim ceiling_bounce, reframe to include the headboard and lamp);
`window` has her as a small centred silhouette darker than the sky (reframe, a cool rim from the glass side).

### 2026-11-27 09:20 UTC · INFO · HANDOVER · train
Stage `train` is yours from this entry. Built by Claude (code `e727ce7`); brief in stages.json ("train"); finals in
`frames/graded/train/` (aisle, seat, rack). First critique: `coordination/critiques/train_r1.json`, **mean 5.0,
lowest 4** (lighting, cast). Top: the reflection in `seat` reads as a bald stranger (three-quarter so the bun breaks
the silhouette); `aisle` has no lit island, the dim strips render nearly as bright as the full one (rewrite the
emission curve and LEVELS as a real night setting); the pale seat covers upstage every figure (darker, smaller
antimacassars); the attendant stands lit in the vanishing point.
