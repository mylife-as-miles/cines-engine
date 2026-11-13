# API: kitchen.js

SETS.kitchen (film/sets/kitchen.js) — FIX PASS, complete API. Environment only; characters are drawn by the sequence. Deterministic (no Math.random/Date). Ember is never painted: the Extra's marks are knockouts only. A backup of the pre-fix file is at scratchpad/kitchen_work/kitchen_v2_prefix.js.

USE (per frame, after c.camera(...)):
  const K = SETS.kitchen;
  K.back(c, t, state, view)    everything behind the characters
  ...draw characters (rims: K.light[view]; clip with K.clip(view))...
  K.mid(c, t, state, view)     props lying ON a character: Angelo's jacket over Deena ('floor', 'standoff'). It also erases any hole under the jacket (handprint, throat).
  K.front(c, t, state, view)   foreground architecture: hall-door jambs and lintel ('entry'), hall jamb/wall ('stove'), Marina's ring ('doorway'). Applies state.occluders.
  K.occlude(c, figurePath2D, keep?)  REQUIRED for every figure standing over perforations or the handprint, because holes are composited at frame end. The optional `keep` Path2D is spared (e.g. a throat cut already made on Deena). Alternatively call occlude first and cut the throat after. state.occluders = [Path2D | {path, keep}] does the same inside front().
  K.draw(c, t, state, view, chars?) = back + chars(c) + mid + front.
  t = any running clock in seconds (sequence lt is fine). Each view uses its own world coordinates (1920x1080; 'knobs' is 1920x2400).
  Coverage guarantee: every named cam, with a ±4 px shake and sway 1, lands on painted paper. Tested on 156 cam/shake combinations with a magenta sentinel. All cached layers carry margins (FULL margin 24 px or more; stove/oven paint x -420..W+460, y -220..H+260; counter to x 2296; deena -96..W+96; standoff 48 px; knobs y -130..2424; entry jambs ±320 px).

VIEWS
- 'entry': the empty kitchen through the hall doorway.
  - Back door at left: night-blue glass, 4 panes.
  - Counter run. Its LAST upper cupboard stands open: a VOID mouth with two lit shelves, five jar and tin silhouettes rimmed hoodMid, and the door swung out about 117 degrees on its right-hand hinge. The door's inner face carries a hoodLow spill and a hoodMid edge band toward the lamp.
  - The low cabinet left of the stove is open too: its inner face is lit (hoodLow, hoodMid edge), with a shelf, the gas pipe and a bottle inside, and knob shards on the tiles at its foot.
  - Stove and hood at right: the one light.
  - Breakfast counter with THREE chairs, built in 3D (chair3D, projected boxes, so a turned chair foreshortens properly). Two are tucked in with their backs to camera. The third is pushed out past the bar's LEFT end (X -1.38, z 3.06), turned toward the stove (yaw 0.95), with a lamp-cast floor shadow. It is clear of the stove, the oven door and Scott's path.
  - front(): jambs drawn first (filled and rimmed), then the lintel; the lintel's underside rim is clipped between the jambs, so no hairline crosses the beam.
- 'stove': port of F09.
  - Hood cone, gas haze, 4 knob positions, the oven door (ovenOpen, thud), the open low cabinet with plastic under it.
  - Christof's folded paper-doll shadow, with his curl cloud, is thrown up the wall and folded onto the ceiling.
  - The throw now grows FROM the oven: first a thin streak along the wall just above the cabinet (-2.96 rad from the crack), then it climbs. Order: the folded legs (about ovenOpen 0.03), the splayed hand (about 0.06), the curls (about 0.1), the hips (about 0.28), the whole cavity by 0.75. Alpha ramps in as clamp(ovenOpen*6). The throw passes behind the cone, hood and cabinet.
  - Jamb/hall wall in front() (now solid to x -600).
- 'oven': the same world magnified 1.45x about the crack, re-cached sharp. This is the reveal; the bottom-left is ink.
- 'knobs': stove-front insert, 1920x2400, built for a tilt. Panel with printed scales; knobs:2 shows bare D-spindles, snapped collars and scratches. The door handle bar now has a 5 px hoodMid band plus a 3 px hood top line, with a faint emissive line. ovenOpen drops the door up to 210 px. thud jolts the door (x3.7 scale) and flashes the seam (5 px hoodMid). Toe-kick and checker floor with the split knob, the snapped ring and the shards.
- 'deena': port of F10 (tight hood cone, scallop bands, grout, counter top, burning hood lip). Painted from x -96 to W+96, so cams.deena.wide at 0.94 is clean.
- 'counter': counter run side-lit from the right (the light is off-frame at 2050,470). Knife block with five handles silhouetted (knives:4 leaves a lit empty slot), kettle, cutting board, upper cabinets with the open cupboard and jars. 'Scott.' perforates the upper cabinets. Painted to x 2296 (cams.counter.block was previously unpainted past x 1928).
- 'floor': low on the checker tiles. The blood pool grows from under her neck (dark core, thin red edge, lamp lip). Also the handprint knockout, the cigarette, the stove base with the open oven's glow at right, and the jacket in mid().
- 'doorway': reverse angle on the hall doorway. Raking hood bands, light switch, spill on the hall floor, the hall to black. The 'Angelo.' perforation is now at x 372, y 652, size 84 (step 3, dmin 0.26), legible from perforations of about 0.3. ring>0 hangs Marina's last full stop (tMarina ring) in the empty doorway (front).
- 'standoff': port of F11, about 92% ink.
  - Back door as a night-blue rectangle onto the yard fence (backDoor swings it in), hood cone and lamp, stove with 4 knobs.
  - Deena's near-black pool, the handprint and the cigarette. The handprint is now in the pool's tail in front of her thighs, clear of the jacket.
  - The jacket in mid(). 'Scott.' and 'Angelo.' (now x 62, size 70) burned in as perforations.
  - Back layer cached at 1x with a 48 px margin. The old 1.25x cache is no longer needed because the push ends at 1.0.

STATE (K.defaults; K.normState(s) normalises and coerces strings: knobs '4', knives '4', backDoor 'open'|'closed'|'0.4', numeric strings)
- knobs: 4|2 (default 2: positions 2 and 3 missing).
- ovenOpen: 0..1. The bulb, crack glare and throw follow it.
- gas: 0..1, the haze strength.
- hoodFlicker: 0..1. K.hoodLevel(t, st) returns the same 0.3..1 level, for scaling character rims.
- blood: 0..1 (48 cached steps).
- handprint: 0..1 (floor max depth 0.55, standoff max 0.34).
- jacket: 0..1. 0 = none; between 0 and 1 it is being lowered (lifted 1.25 heads and tipped, sleeve hanging); 1 = laid.
- cig: 0|1.
- perforations: 0..1, in 24 burn steps.
- backDoor: 'open'|'closed'|0..1.
- sway: 0..1.
- pull: 0..1.
- NEW thud: 0..1. An impulse: set it to 1 at "something heavy shifts inside" and decay it to 0 over about 0.3 s, e.g. thud = max(0, 1 - (lt - t0)/0.3). The oven door jolts about 3.6 px down (plus a small sideways rattle), the handle bar rattles extra, and the shut door's seam flashes hoodMid while thud > 0.55. It works in 'stove', 'oven' and 'knobs'.
- knives: 5|4.
- ring: 0..1.
- occluders: [Path2D | {path, keep}].

DYNAMIC ANCHORS (follow ovenOpen, pull and thud)
- K.at('stove'|'oven', 'ovenHandle'|'crack'|'doorTop'|'hb0'|'hb1', state). K.at('knobs', 'ovenHandle'|'doorTop', state).
- K.at('stove','ovenHandle',{}) = [1372,611]
- {ovenOpen:1} = [1339,652]
- {pull:1} = [1352,617]
- {thud:1} = [1370,615]
- K.at('knobs','ovenHandle',{ovenOpen:0.5}) = [1160,753]

STATIC ANCHORS (K.anchors[view], world px; figure marks are {x, y(feet), scale(px/head), facing})
- entry
  - stove [1496,626], ovenHandle [1496,599], backDoor [433,348,598,716], counter [960,555], bar [929,593].
  - chairs [[810,867],[1042,865],[509,953]]; pushedChair [509,953] (MOVED from 1393,955).
  - hallDoorway [960,1080], wallFloorY 716, lamp [1437,430].
  - marks: scott 1130,985 s81.5 f1; deena 760,950 s76.4 f1; marina 330,985 s81.5 f1 (MOVED from 470,925, clear of the chair); angelo 1010,895 s68.3 f-1.
- stove
  - stove [1300,690], hob [1300,448], knobs[4], ovenHandle [1372,611], ovenHandleOpen [1339,652], crack [1256,629], ovenMouth [1300,749].
  - plastic [1040,915], cupboard [856,790], floorY 1000, deenaFall [760,1004], hallJamb [118,1000], hood [1315,182].
  - shadowHead [606,396], shadowHand [355,386], shadowCurls [689,447].
  - marks: scott {1720,1068,s112,f-1}; deena {360,1000,s76,f1}.
- oven: the same names mapped by 1.45x (crack [1714,788], shadowHead [772,449], shadowHand [408,435], shadowCurls [892,523], ovenHandle [1882,762], ovenHandleOpen [1834,821], knobs, hood [1800,140]). Off-frame names are removed.
- knobs
  - knobs[4] at y 408 (x 465/795/1125/1455), knobR 78, missing [1,2], spindles.
  - ovenHandle [1154,656], hob [960,222], doorTop [960,592].
  - plastic [560,1632], plasticUnder [150,1552], floorY 1556, cabinetOpen [180,860].
- deena: deena {x1270,y1150,anchor:'hip',scale 222,facing -1}; angelo {120,1520,hip,s290,f1}; angeloReach [758,900]; lamp [1250,60]; counterTop 790; line [610,450].
- counter (RECONCILED)
  - block [1562,530], knife [1539,402] (the grip of the middle handle; knifeDir [-0.43,-0.90]), handles[5], counterTop 598.
  - hip [1352,608]: where Scott's back meets the counter edge at hip height.
  - scott {x1290, y1202, s150, f-1}: at this mark his hip (3.96 heads up) sits at the counter edge, and the grip is about 2 heads behind his shoulder.
  - scottStart {x1010, y1202, s150, f-1}: back in from here.
  - cupboard [1490,160], kettle [452,540], board [930,480].
- floor
  - deena {x640, y363.8, scale 122.8, rot PI/2}: use K.deenaLying('floor').
  - head [995,386]: the true head centre (was the hair end).
  - throat [941,334]: FIXED to the front of the neck. The old 2.85u value was the head centre.
  - neck [935,364], jacketEnd [985,334], floorY 437.5, pool [972,478], handprint [830,534], cig [542,510].
  - angelo {910,380,s98.3,f-1, kneeling behind}; kick 347.7; ovenGlow [1700,348].
- doorway: door [770,176,1110,966], centre [940,571], marina {948,1000,s100,f-1}, ring [1004,452], floorY 966, hallEnd [905,530].
- standoff
  - lamp [1607,378], backDoor [321,272,532,746], backDoorCentre [426,509], backDoorHandle [507,521], stove [1681,599], hob [1681,533], wallFloorY 746, counterTop 539, cone (4 pts).
  - scott {x560, y1170 (feet, NEW), scale 132, headTop 204, facing 1}; K.persp.standoff.scaleAt(1170) = 137.
  - angelo {1472, 851.2, s76, f-1}.
  - deena {1121.8, 821, s76, rot PI/2}: she now lies at z 3.48 (7 px higher than before).
  - deenaFall [1250,866.6], head [1341,835], throat [1308,803], jacketEnd [1335,803], pool [1262,868] (red reaches y 887).
  - handprint [1032,875] (MOVED from 1150 to stay clear of the jacket), cig [952,870] (MOVED).

LIGHT (K.light[view] = {x,y,color:hood,mid:hoodMid,low:hoodLow}; top-level K.light.x/y/color = the standoff lamp)
- entry 1437,430
- stove 1315,182, plus bulb {1256,629, CORE #FFF4CC, rim hood}
- oven 1800,140, plus bulb {1714,788}
- knobs 960,-160
- deena 1250,60
- counter 2050,470
- floor 1700,250
- doorway 2300,300
- standoff 1607,378 (glint lighterCream)
- K.clip(view) returns the lit-region Path2D for clipping rims.

CAMS (K.cams[view].name = {x,y,zoom})
- entry: wide; push (1010,560,1.07); stove (1420,560,1.35, was 1450); cupboard (1040,470,1.5, NEW); chair (760,690,1.3, re-aimed at the moved chair).
- stove: wide; hob (1290,470,1.35); handle (1330,700,1.3); deena (560,600,1.15); shadow (700,400,1.2). All now fully painted.
- oven: reveal; head (892,509,1.18); crack (1500,760,1.12). All fully painted.
- knobs: panel (y470); twoGone (1.18); handle (1.1); door; plastic (960,1640); tilt(u) (panel to plastic).
- deena: tight; throat (1.25); wide (0.94, now painted).
- counter: block (1450,500,1.2); wide; backIn (1060,560,1.06).
- floor: wide; hand (1.35); jacket (1.25); pool (1.15).
- doorway: wide; door (1.12); ring (1.4).
- standoff: start {960,540,0.97}; end {975,548,1.0}; push(u) lerps between them, for the 50 s take alongside the 2.39 to 2.76 squeeze.
  - At 2.76 the slit holds world x 15..1935 and y 200..896. Angelo's crown (206 level, about 216 bowed), all of 'Angelo.', 'Scott.', the whole pool, the handprint and the jacket cuff are inside, with 3 px shake room. Verified in kitchen_work/fx/so_end.png and so_end_zoom.png.
  - Do NOT zoom past 1.0 at 2.76: Angelo is 8.6 heads tall at scale 76 and the slit is 696 px.

HELPERS
- K.ovenShadow(g, {quad:[TL,TR,BR,BL], foldY, pool:{x,y,r,sy,rot}, k}) → {boxP, shP, fn}. Not cached.
- K.foldedShape(): the body in cavity units (0..6 x 0..4).
- K.deenaLying(view, {x,y,scale}?): Deena's F11 lying Shape (head toward +x).
- K.jacketShape(u): REDESIGNED, in her hip frame, with the floor at +0.6u. The body runs 0.05u..2.81u: it covers the throat (2.45u) and tucks a turned-up collar under her chin, leaving her brow and hair visible. It has a notched lapel at about 2.38u, a lapel line, a collar line and a fold. The near sleeve trails off the shoulder onto the tiles beside her head (cuff at 3.28u, 0.79u), into the blood, with a lit cuff lip. The cloth is #16110E (one value above ink) with a hoodMid rim on the lamp side, and a soft cast shadow on the floor.
- K.knock(c, path, depth), K.hoodLevel(t, st).
- K.persp.entry / standoff / floor = {P(X,h,z)->[x,y], zAt(yFeet), scaleAt(yFeet)}.
- Engine hint: every hole the set cuts (perforations, handprint) unions its SCREEN rect into c.f.holeBox = {x0,y0,x1,y1}.

PERFORATIONS: the words' holes are now one cached 2x-res mask canvas per view, redrawn only when the 24-step burn level changes. The loose pinholes are 6 cached Path2D fills. Per frame this is one drawImage into the holes buffer, instead of about 1000 ellipse fills (about 10 ms saved).

DEMOS (16, node tools/set.js kitchen 1)
- entry with four walkers
- stove F09 opening
- stove: knobs 4, Scott pulls in jerks, the thud at 0.95 s (with shake)
- knobs panel
- knobs handle, door ajar (the placeholder hand is rimmed from K.light.knobs)
- knobs plastic
- oven reveal at 0.45
- oven open with push
- deena F10
- counter: Scott backs in from scottStart to the mark, reaches behind for the grip, then draws a knife (knives 5 to 4)
- floor: blood and handprint
- floor: jacket lowered then laid, cigarette
- doorway: Marina
- doorway: empty, with the ring
- standoff start (2.39, zoom 0.97)
- standoff end with the door opening (2.76)

## Known issues
- ENGINE (for the engine owner): every third FILM.renderAt stalls 100-140 ms even for an empty shot with no set code (repro: scratchpad/kitchen_work/timing9.js), and 170-250 ms when c.f.holes is used (timing8.js). This, not the set, is why mean frame times read 75-90 ms. Medians are 8 ms empty and 29 ms with holes. Worth profiling FILM.renderAt and f.finish (pooled canvases, lightbox and halation passes) for a periodic flush or GC.
- ENGINE: the hole compositor costs about 21 ms (median) as soon as any knockout exists: full-res destination-out of the holes canvas, quarter-res blur and tint, lightbox. Suggestion: composite only inside a dirty rect. This set now writes c.f.holeBox = {x0,y0,x1,y1} in SCREEN px for every hole it cuts. The engine would need to union its own knockouts too (VOICE text, the sequences' throat cut) before using it. Also lightboxSmall renders a 480x270 per-pixel fbm for each new (seed, q) pair: up to 8 seeds x 24 q = 192 renders, which spike the first hole frames.
- ENGINE note: the world buffer is pre-filled with ink before each shot, so unpainted regions show as flat ink seams, not transparency. Coverage must be tested with a sentinel colour (kitchen_work/cover.js paints magenta first). With that test, the pre-fix set also had unpainted areas on cams.counter.block (right 25%), counter.backIn, stove.deena/hob/handle and oven.crack. All of these are now painted.
- ANCHOR CHANGES the choreographers must pick up: (1) floor/standoff throat moved to the true front of the neck (floor [941,334], standoff [1308,803]); the old value was the head centre. head is now the real head centre. (2) Standoff Deena lies 7 px higher (z 3.48): deena y 821, pool y 868, handprint [1032,875], cig [952,870]. (3) The entry pushed chair moved to the bar's left end [509,953] and Marina's entry mark moved to [330,985]. (4) counter.scott is now {1290,1202} with hip [1352,608] and the new scottStart {1010,1202}. (5) standoff.scott has y 1170 (feet). (6) cams.standoff start/end/push changed to 0.97 -> 1.0. (7) cams.entry.chair re-aimed, entry.stove x 1420, new entry.cupboard.
- Standoff composition limit: at 2.76 the content from Angelo's crown (y 206) to the pool's near edge (y 887) fills the 696 px slit. Do not zoom the standoff past 1.0 at 2.76, or move Angelo nearer the camera. The push therefore starts slightly wide (0.97) and the letterbox squeeze does most of the work.
- Jacket covers the throat to just under the chin (ends at 2.81u), not the face. The screenplay says 'covers her throat'; the reviewer's 3.05u figure came from the old, wrong throat anchor. K.mid() erases holes under the jacket, so a throat knockout or the handprint never cuts through it. Draw the jacket after any throat arc.
- The standoff 'Angelo.' perforation stays faint by design (keep 0.5, dmax 0.55) as in F11; the doorway one is now larger (84 px) and denser.
- Still a sequence decision: the thud envelope (thud 1 to 0 over about 0.3 s) and the 'pull' jerks are driven by the sequence; the set only renders the state. The 'stove' view draws no hiss: gas is visual haze only, and the sound bed 'gas' is the hiss.

Test sheet: out/set_kitchen.png (official, node tools/set.js kitchen 1). Full-res checks are in /tmp/claude-0/-home-user-Inez-Model/8a62f68b-8b0e-5610-a72d-0c00b1ecdab5/scratchpad/kitchen_work/fx/:
- so_end.png and so_end_zoom.png: end of the push at 2.76 with shake; crown, 'Angelo.', pool, handprint and cuff all inside.
- r4_14.png: standoff start.
- r1_00.png, en_wide.png, en_cup.png, en_chair.png: open cupboard, open low cabinet, the 3D pushed chair.
- jk_cam.png, jk_floor_dbg.png, jk_so.png, st_jl.png: jacket over the throat, and the lowering and thud strips.
- st_wedge.png: the oven throw growing from the oven at ovenOpen 0.02 to 0.6.
- ct_block.png, dw_perf.png, ov_crack.png, st_deena.png: previously unpainted cams, and 'Angelo.' legible at perforations 0.35.
- r1_02.png (thud), r1_04.png (handle highlight), r1_09.png (counter backing in), r1_11.png (jacket).
Performance: Whole-frame MEDIAN over 30 frames (kitchen_work/timing_med.js, full state, first cam of each view):
- empty shot 7.9 ms; empty plus one tiny knockout 29.4 ms.
- entry 35.1, stove 13.5, oven 14.4, knobs 10.1, deena 10.8, counter 36.9, floor 38.5, doorway 36.5, standoff 40.2.
- All are under 60 ms at the median.

The set's own JavaScript time per frame (timing7.js) is 0.1-0.9 ms. Perforation drawing went from about 10 ms to about 1 ms (cached mask). Gas haze adds about 8 ms of rasterisation on the full-width views.

MEAN timings (the reviewer's metric, about 75-90 ms) are dominated by an ENGINE-LEVEL stall: every third FILM.renderAt takes 100-140 ms even for an EMPTY shot with no set code (timing9.js: 84 48 98 7 11 133 6 10 137 ...), and 170-250 ms when holes exist (timing8.js).

set.js single-frame figures are noisy for the same reason: 11-115 ms.
