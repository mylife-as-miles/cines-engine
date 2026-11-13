# API: yard.js, set_yard.png

SETS.yard (film/sets/yard.js). Draws the environment only, never characters. Each view is a full 1920x1080 world composition; if you never call the camera, the authored framing is the screen. Deterministic: no Math.random or Date.

ONE HOUSE (continuity fix)
- Every view draws the same model (HM, the F02 facade).
  - A two-storey body: 3 upstairs windows (the middle one has the curtain) and the big window lower left.
  - A one-storey kitchen wing at the right, with the kitchen window and the BACK DOOR with four steps down to the lawn.
- 'backdoor' is exactly that model at 2x about the door: BD = 2*HM - [2300, 698].
- What 'backdoor' shows:
  - Main body at left: upstairs middle and right windows, the big window cut by the left edge.
  - The wing: kitchen window LEFT of the door, the door, the steps.
  - The side fence running from the wing's corner toward camera-right (the fence 'house' sees going off to the right).
- After the blast the doorway is a ragged burning hole and the door lies burning on the lawn in every view (state.blown).
  - The door lies at model [1500, 801.5], which is 'backdoor' [700, 905].
- The second blast erupts from the same kitchen point in every view.

CALLS
- back(c, t, state, view): everything behind the characters. Does not call the camera.
- front(c, t, state, view): foreground grass (sheared by the blast on 'backdoor'), then state.dim.
- draw(c, t, state, view): back() then front().
- camera(c, view, t, state, cam)
  - cam is a name from cams[view] or {x, y, zoom, rot, dx, dy}.
  - Adds the blast shake (18 px x (1-blast)^2.2) and the secondBlast shake (6 px, decaying), with a covering zoom.
  - Clamps so the frame never shows past the world. Outside the two blasts the yard never shakes.
- shakeAt(t, state): {dx, dy, a}, if you drive c.camera yourself.
- lightAt(view, t, state, pt?): {x, y, dx, dy, color, rimW, k}
  - With pt = [x, y] (the figure's centre), dx/dy point from pt toward the light (dy clamped to at most -0.15). The rim then swings as a figure passes the light: the fence crawl, either side of the door.
  - Fire views: fireMid, or hot #ff8039, from the flame noise.
  - 'backdoor', by state:
    - kitchenFlare: the flare colour, from the kitchen window.
    - Door open: hood (#E2C35B) from [1310, 600].
    - Shut: hoodMid from the kitchen window.
    - Burning or after the blast: fire from [1330, 560].
    - In the white and negative frames: blastWhite.
- figStyle(view, t, state, pt?): {fill, rimColor, rimW, light, lightPt, phase, echoes?}
  - phase 'white': fill ink, no rim.
  - phase 'negative': fill fireCore, ink rim (light dx 1, dy -0.6), echoes [fireOuter, fireMid] for F12's two smear copies.
  - 'aftermath' or 'normal': ink fill, rim from lightAt(..., pt).
- flicker(t, seed): 0..1, the shared fire noise. Big light pools use a low-passed version internally, so large discs breathe and never jitter.
- blastAt(t, tBoom): 0..1 blast clock, BLAST.dur 3 s.
  - Phases: white b < 2.5/72 (3 frames), negative b < 6.5/72 (4 frames), then the aftermath to 1, then steady burning.
  - Use state.blast = blastAt(lt, tBoom). The aftermath starts 0.271 s after the boom.
- doorHandle(doorOpen): world point of the back-door handle: [1380, 594] shut, about [1355, 594] at 0.5.
- burnThrough(c, k, {x=900, y=470, seed=5, t})
  - The black frame burning open. k 0 = black, 1 = gone.
  - At k 0.03 a spark; then a slit; then a lens with slow lobes (top and bottom differ).
  - Satellite burns bulge and overhang the edge. Pinholes open ahead as separate char-ringed islands until the burn reaches them.
  - The edge is char everywhere and glows (fireMid/fireCore plus bloom) only on crawling hot runs. It clears fully by about k 0.97.
  - Cut straight into c.g with even-odd clips: no offscreen canvas, 7-11 ms.
  - Screen space: call it LAST in the shot draw. Suggested k = FILM.seg(lt, 1.5, 5.5, 'inOutSine').
- burnMattes(c, k, aspect=2.76, {seed=31, t, x=1330})
  - The letterbox mattes burn away like paper. k 0 = intact matte at that aspect, 1 = gone.
  - Ignition points sit near the blast x (top at x, then x-760 and x+420; bottom at x-70, then x-1050 and x+520), so the first burning frames come from the explosion.
  - Intact paper keeps a clean, unlit edge; burning starts at about k 0.035. Char bands taper in as the edge ignites; the fireCore line shows only on hot runs.
  - Char-ringed holes open near the ignition first.
  - A paper flap peels into the frame from each matte: it narrows, foreshortens and curls at its free end, and shows its lighter underside past the turn.
  - Plus scraps and sparks. Drawn with even-odd paths straight onto c.g: 1.4-5 ms.
  - Screen space, call it last. The sequence's letterbox(lt) must return 1.7778 from the boom on.
  - Suggested k = FILM.seg(lt, tBoom + 4/24, tBoom + 1.6).
- fx: flat three-tone fire on c.g + c.em (Scott's shirt catching), and spark bursts.
  - fx.flame(c, x, y, w, h, seed, t)
  - fx.tongue(c, x, y, w, h, ang, seed, t)
  - fx.sparks(c, p, u, opts)
- phone = C.phoneWhite (#D7E7F3), also anchors.phone.
- defaults[view]: the resolved default state.
- BLAST, STROBE_HZ (1.6). _int is debug only.

STATE (all optional)
- fire 0..1. Default 1; fence 0.9; backdoor 0.
  - 'backdoor': fire < 0.5 is the unburnt house; the blast switches it to burning (fire at least 0.75).
- blown (default true): the doorway is a ragged burning hole and the door lies burning on the lawn.
  - false: the door is shut with fire behind its 4 panes.
  - In 'backdoor' before the blast the door is drawn by doorOpen, and the blast blows it off: it flies for about 1.1 s and lands at [700, 905].
- curtain 0..1, the upstairs-middle curtain.
  - 0 hangs inside; 0..0.5 lifts out, waving, burning tip; 0.5..1 burns away from the tip with ash; 1 gone.
  - Default 0.45 in house and scott, 1 elsewhere. Q12 should pass 1.
- roof 0..1: the roof burned through over the left bedrooms (F13). Default 1 in ending and hands, 0.35 in fence, 0 elsewhere.
- strobe 0..1: red and blue beams through the fence gaps at 1.6 Hz (posterised full / 0.42), with bars across the grass. Q01 0.2, Q12 0.5.
- glassBreak (time): the big downstairs window. 13 shards out onto the lawn, a flare.
- windowCollapse (time) + collapseWin (default 2 = upstairs right)
  - A 0.45 s creak, then the lintel chunks and mullion fall in.
  - The opening becomes a taller ragged hole, with a flare and sparks.
- kitchenFlare 0..1 ('backdoor', NEW): the frames before the white.
  - Kitchen window, door glass, the open doorway and the grass spill step hood -> mix -> fireMid -> fireCore, with a growing fireball blob and bloom.
  - Suggested kitchenFlare = FILM.seg(lt, tBoom - 0.13, tBoom - 0.02).
- blast 0..1 ('backdoor'): white (ghost house) -> the F12 negative (cached, swelling 5%) -> aftermath -> burning. The aftermath:
  - F12's ink plume hangs on for 0.3 s, collapsing into the doorway and breaking into lobes, solid ink with no bloom.
  - Fireball tongues of varied width and reach, some without the pale core, from the doorway and the kitchen window.
  - The HEAT FRONT: a ragged bright front rolls from the steps over the lawn in about 0.45 s. Behind it, 5 posterised stripes travel outward with dithered seams.
  - From the second frame on there are always at least 2 stripes. The coolest gives way to the burning lawn, the scorch and the blades as it passes, with no cut; done by about 1.2 s.
  - Then: the door flies and lands burning; glass from 4 windows lands and stays; a spark burst; windows and doorway flare, then steady burning.
  - Smoke is clipped to the sky behind the roofs.
- secondBlast (time): eruption from anchors[view].kitchen, a spark fountain (stops at the ground), a 6 px shake. Works in every view.
- doorOpen 0..1 ('backdoor'): hinged on the LEFT jamb, swings IN. The kitchen hood light spills down the steps.
- handGlow 0..1 ('ending', 'hands'): the warm posterised pool round the held hands.
- dim 0..1: everything toward ink, applied at the end of front().

VIEWS, ANCHORS, CAMS (anchors[view], cams[view])
Every view has seat {hip, scale (px per head), facing, ground}, kitchen (the secondBlast origin), and light[view] {x, y, color #FF6A1F, hot #ff8039}. Every HM view also has door and doorLands. Scott is 7.8 heads tall.
- house: the cold-open wide.
  - Ground 790. seat {hip [1250, 958], 64, -1, ground 975}.
  - windows [563, 532] [820, 532] (curtain) [1077, 532] [631, 695] (big) [1260, 680] (kitchen).
  - door [1381, 674], doorLands [1041, 846], fire [820, 470], kitchen [1355, 624], fenceFoot(x).
  - The sky is one low glow band plus a smoke bank across the top right (about 84% ink at luma < 30).
  - cams: wide; push {840, 500, 1.08}; curtain {900, 430, 1.18}.
- scott: F02, background only.
  - Ground 750. seat {hip [720, 978], 180, -1, ground 1059}.
  - fire [1300, 470], light dir {0.84, -0.55}.
  - bigWindow [1212, 673], door [1823, 655], doorLands [1546, 795], kitchen [1801, 615].
  - cams: wide; push {900, 560, 1.06}.
- ending: F13.
  - Ground 640. seat {hip [660, 889], 136, -1, ground 957}; scott {hx 660, hy 930, scale 136} is the older name for the same seat.
  - clasp [1022, 889], handLen 144, handPool [1054, 896], gapRight {x 1040, y 860, rect [890, 600, 300, 360]}.
  - fire [250, 420], door, doorLands, kitchen [574, 524].
  - cams: wide; push {900, 600, 1.06}.
- backdoor
  - Ground 800. door {x 1266, y 470, w 128, h 232, hinge left, swings in}. handle [1380, 594]. blast centre [1330, 590].
  - steps k0..3, each 25 high: y 700 x 1238..1440; y 725 x 1202..1448; y 750 x 1166..1456; y 775 x 1130..1464. The top step now reaches right of the door.
  - figScale 27 (px per head at the house: steps, doorway). figAt(groundY) = 27*(y-614)/186 on the lawn (42 at 905).
  - pull {feet [1424, 700], scale 27, facing -1}: on the top step, reaching back for the handle (the demo pose).
  - seat {hip [1150, 893], 42, -1, ground 905}. landing [1150, 905], doorLands [700, 905].
  - kitchenWindow [1104, 598], kitchen [1280, 494], fire [1330, 560].
  - cams (pre-clamped): wide; steps {1120, 630, 1.2}; door {1258, 600, 1.45}; yard {900, 600, 1.1}.
- fence: the far fence in perspective at left, the house at right.
  - Ground 690. crawl {from [1674, 739, 36], to [470, 846, 84]}. It starts where the blast threw him (the 'backdoor' landing); he passes the burning door.
  - crawlAt(u) returns [x, groundY, px per head] on the lawn's perspective (horizon 659). figAt(y) = 84*(y-659)/187.
  - seat {hip [400, 846], 88, facing 1, ground 880, back [338, 720]}.
  - door [1759, 587], steps [1752, 690], doorLands [1460, 739], kitchen [1735, 544], fenceFoot(x).
  - cams: wide; fenceFoot {560, 700, 1.12}.
- hands: low close insert.
  - Horizon 330: small burning house at left, street fence with strobes at right.
  - clasp [960, 720], handLen 290, scottWrist [600, 770], extraWrist [1320, 700], pool [990, 738].
  - seat {hip [-260, 1500], 380, 1, ground 1520, offscreen: true}: the body is off frame; only the arm enters.
  - cams: wide; close {960, 690, 1.12}.

DEMOS (19, node tools/set.js yard 1)
- house: burn-through k = t/4; curtain lifting; curtain burns and glass breaks; Q12 roof, strobe, collapse.
- scott: F02 with a placeholder; empty plate with strobe.
- ending: F13 with a placeholder.
- backdoor:
  - night, door open
  - on the top step pulling the door shut (anchors.pull, IK hand on doorHandle, rim from lightAt with pt)
  - kitchenFlare
  - white
  - negative + mattes
  - aftermath +0.15 s (ink plume, heat front)
  - aftermath +0.8 s (stripes cooling, door in the air)
  - burning, with a seat on the lawn
- fence: crawl (crawlAt, rim by pt); second blast.
- hands: placeholder clasp; dim 0.7.

DEBUG: setting SETS.yard._prof = {} accumulates JS ms per section (JS time only: rasterization is deferred).

## Known issues
- Engine (not yard.js): in headless renders an empty set draw costs 35-85 ms per frame (median about 58). The first frame after any seek costs 100-160 ms in every test, including an empty one. The spikes are in the compositor, grain or knockout path. The 'hands' demo, which uses c.f.knockout, shows 63-108 ms; the set's share is about 12 ms.
- Continuity change visible in the approved F02 composition: the kitchen wing's roof is about 36 model px higher (wing roof y 520..569, it was 560..604). The kitchen window moved to model [1660, 606, 84x84] (it was [1690, 628, 88x86]). The wing now carries the back door [1783, 584, 64x116] with 4 steps, the blown doorway fire, a lawn spill and the door lying burning at model [1500, 801.5]. Anyone comparing the film against the F02 still will see these.
- 'backdoor' is no longer the old rectangular house. It is the HM model at 2x: the main body fills the left half, the kitchen wing and door are centre-right, and the side fence is at the right. The door and the steps' y values are unchanged (top step now x 1238..1440). The F12 negative frame is rebuilt on this geometry and keeps its plume, rays, flying door, steps and star-burst windows. The old fence and tree at the left are now at the right, beyond the wing.
- Figure scale in 'backdoor': a standing adult at the door is 27 px per head (anchors.backdoor.figScale); the old demo used 50, which was 1.4x the door height. On the lawn use anchors.backdoor.figAt(groundY).
- Named cams are pre-clamped. The world is only 1920x1080, so 'backdoor' door at zoom 1.45 cannot centre the door (the x clamp is 1258), and steps at 1.2 clamps to {1120, 630}. Sequences that need a tighter door shot should accept the door being right of centre.
- The fence crawl now starts where the blast throws him (crawl.from [1674, 739, 36 px per head]) and scales by the lawn's perspective. Sequences that assumed the old [1180, 742, 50] start should call crawlAt(u) and use u around 0.15-0.3 if they want him bigger at the start.
- Ember #FF9440 still appears inside the cached F12 negative frame (backdoor blast 2.5/72 to 6.5/72), ported unchanged from the approved F12 source. If the 'ember only for the Extra' rule is enforced strictly, that layer needs a decision from the director.
- SETS.yard._int (btHoles, bandPaths, hotLv) is exposed for debugging only; do not depend on it.

Test sheet: out/set_yard.png
Performance: Set cost alone, measured on a bare canvas with forced rasterization (micro-benchmark):
- house 20, scott 18.5, ending 15, fence 14, hands 12.
- backdoor night 1.4, burning 12, aftermath 20.
- burnThrough 7-11 (was about 27 of overhead).
- burnMattes 1.4-5.3 (was 20-30).

Whole engine frames in tools/set.js and the perf harness, median of 12 consecutive frames:
- house 55, house + burnThrough 64-69, scott 61, ending 67, fence second blast 53, hands 48.
- backdoor: burning 59, burning + mattes 52, boom sequence 67, night 37.
- These include the engine's own floor: an EMPTY draw costs 35-85 ms (median 58) here, and the first frame after a seek costs 100-160 ms in every test.
