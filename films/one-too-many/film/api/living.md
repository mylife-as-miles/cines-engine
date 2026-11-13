# SETS API: living.js, title.js

ONE TOO MANY: SETS.living and SETS.title (fix pass, complete API)

Both files draw in WORLD coordinates (1920x1080) on c.g / c.em, so c.camera() applies. Without a c.camera() call you get the authored framing. Neither file uses Math.random or Date.

======================================================================
SETS.living (film/sets/living.js): ports F04 and the party tile of S03
======================================================================

Each view is its own 1920x1080 world.

Calls
- draw(c,t,s,view): back, then table, then front.
- back(c,t,s,view): room, lamp, dining glimpse, floor, dust, wet prints, speaker cone, floor crisps. The inserts draw everything in back.
- table(c,t,s,view): wide only. The coffee trunk, glasses, bowl, wine ring, mats, flat bag.
- front(c,t,s,view):
  - In the wide it draws the FG couch (left) and the FG armchair (right), as two small caches.
  - In every view it then applies the lamp dimmer, unless s.dimLast is set.
- dim(c, lamp, view): the dimmer on its own, so you can call it after the characters.
  - It draws three flat ink bands, camera-aware. Lower lamp values shrink the pool toward the shade and step the posterised bands down a tone.
  - The emissive buffer is cut by (1-lamp).
  - Use it with s.dimLast:true so Angelo in the armchair and Scott on the arm dim as well.
- Typical wide order: back → figures behind the table (Kay, Marina, Christof, Deena, Scott standing) → table → front(s with dimLast:true) → Angelo in the armchair, Scott on the couch arm → dim(c, s.lamp, 'wide').

Caching
- Static layers are cached once at 1x over each view's extent. The c.cache keys are 'living.<view>.back', 'living.wide.frontL' and 'living.wide.frontR'.
- Extents, as SETS.living.ext [x0,y0,x1,y1]:
  - wide [-600,-240,2520,1320]
  - crisps [-240,-160,2160,1240]
  - glasses [-200,-160,2120,1240]
  - doorway [-240,-160,2160,1240]
  - couch [-320,-160,2240,1240]
  - coaster [-240,-160,2160,1240]
  - frontL [-600,640,460,1320]; frontR [1480,440,2520,1320]
- Every named cam with a 4 s push, and a 0.7 zoom-out of the wide, stays inside these extents.
- Close framings (zoom above 1.16):
  - The layer is cached again at 1.5, 2, 2.5 or 3x, for only the region the camera sees (+12% margin, snapped to 64 px).
  - That cache is reused while the framing stays inside it, so pushes and drift cost nothing extra.
  - Hysteresis: the hi-res cache is made above 1.16 and still used down to 1.10.
  - The first frame of a new close framing pays one paint, about 40-80 ms.
  - The cache holds at most 8 entries and about 24 Mpx in total (LRU), in a module-level cache rather than c.cache.
  - Steady-state cost: wideDining ~17-21 ms; wideTable, wideKay, wideCouch and wideLamp ~18-30 ms.
- Rims (rimIn) now touch only the shape's device bbox.

Views

'wide' (F04 geometry)
- Wall base y872. Lamp x930, shade 334-414, foot 904.
- Kitchen doorway x92-330, top 188, warm, with a kettle.
- Coffee trunk x612-1316, top 792.
- Picture crooked at (452,262).
- Little speaker on the floor at x392 (base 872); its cone pumps with s.music.
- Dining opening x1300-1652, top 332:
  - Round table at (1452,742), rx80 ry15, on a pedestal, under an unlit pendant.
  - SIX solid ladder-back chairs: two pushed in at the near side with their backs below the table top, one in profile at each side, two beyond the table.
  - SIX ink-rimmed ivory plates.
  - No chair is hidden behind the FG armchair, so all six chairs and six places count at 2.3x (cam wideDining).
- Off F04's left edge, seen in wideKay, wideCouch and wideDoor:
  - The way in from the hall at x-430..-236, top 196 (dim).
  - The FG couch continues left: seat ~y930, back rising at x<-430.

'crisps' (low insert on the trunk lid)
- Bowl at (1080,676), rim rx206 ry46.
- Lamp shade top right at x1660, y40-170. Its bloom is now held to the shade: no wall smear.
- Default bag mouth at (742,452).

'glasses' (the match-cut insert)
- The title's exact field (SETS.title.drawField) and floor line y884.
- Six glasses, 340 px tall, at the title bars' cx: 169, 738, 1005, 1147, 1317, 1610.

'doorway' (Kay, medium)
- Left jamb x552-600, opening 600-1110, lintel 74.
- The left jamb's inner face is a hot tungsten strip with a WARM core, so Kay's leaning back reads against it.
- Kitchen pool behind her head at (760,330); cupboard, counter, kettle, six plates.
- Ink for type at the left (0-540) and on the right wall.

'couch' (medium)
- Couch x380-1300; back top 584; seat 772.
- Big rolled left arm about 250 px wide (x336-586), top ≈ y658.
- Three back cushions (w190, from x562); the middle one is karate-chopped.
- Right arm.
- One solid ink silhouette, rimmed only along its outer lit (top-right) edge.
- Throw fringe hangs off the roll's front.
- Lamp at x1452 (shade 150-262); floor y968.

'coaster' (high-angle insert)
- Table edge y860. The pool falls off to ink at the left and toward us, leaving ink below 860 for type.
- Marina's glass foot at (1250,600), scale 1.45.
- Wine ring at (720,640); mat stack at (1660,700).
- Crisps bowl cropped top-left.

State s (all optional)

Wide
- glasses: n (the first n of 6), or an array of 6 where null = picked up, a number = fill, or {fill, mat}. Default 6.
- fill: a number or an array. Default F04 [.55,.2,.7,.45,.85,.35]; fill:0 gives Q02's empty glasses.
- mats: [indices] of glasses standing on a coaster.
- ring: 0..1 (default 0).
- matStack: n (default 4).
- bowl: 0..1. bowlOn: false removes the bowl (draw it with props.bowl).
- bagOnTable: the emptied bag lies on the trunk.
- crisps: [{x,y,rot}] floor crisps. Default: F04's four; [] = none.
- glassX: overrides the six x positions.
- prints: 0..1 or true. Q04's wet footprints: three trails (heel, shoe, big) from the hall doorway into the room, wettest at the door, toes glinting with the lamp. Visible in the default wide between the couch arm and the table, and fully in wideDoor/wideKay. Default 0.
- printsDry: 0..1.
- music: 0..1 (the speaker cone pumps). bpm: default 112.

crisps view
- crisps: [{x,y,rot,s,flip,shape,phase:'air'|'rest'|'held',onTable}].
- bowl: 0..1.
- bag: {x,y,rot,s} (mouth centre; the way it faces, in rad); null = no bag.

glasses view
- glints: [6 × 0..1]. A hard ivory sliver runs along the rim's lit edge and down the shoulder, plus an emissive ping.
- fill: 0 (default) or wine.
- glasses: n.
- glassX, glassH.

coaster view
- ring: 0..1 (default 1); wipe: 0..1 (the smear); ringAt: [x,y].
- glassAt: [x,y]; glassOn: false hides the glass; fill.
- coaster: {x,y,rot,lift,z}. The mat in Scott's hand: lift > 0.5 draws it OVER Marina's glass. z:'over'|'under' forces the order. Its rest spot under the glass is anchors.coaster.coasterUnderGlass.
- matStack: n (default 5).
- cloth: {x,y,rot,s}.
- crisps: list.

All views
- lamp: 0..1 (default 1).
- dimLast: bool.
- walla: 0..1 (room loudness; visual only):
  - Dust always draws its full mote count. walla only brightens more motes and adds a bounded ±7 px quick jitter, so motes never jump when walla ramps or cuts. Motes fade at the box edges where they wrap.
  - Wine-surface shimmer in the wide glasses.
  - ±5% lamp bloom breath at 1.1 Hz.

Helpers

pour(o) → {at(t), list, picks, missed, mode, end}. A deterministic crisps plan for Q02.
- Options (defaults): mode 'pour', seed 'q02', n 18, t0 .6, t1 2.4, miss .5 (exactly half miss), bowl0 .35, bowl1 .85, mouth [742,452], picks 'auto', pickT0 3.6, pickGap .6, pickDur .55, scoops 3, scoopBag {x:652,y:470,rot:-π/2+.24,s:.86}, rest [470,120].
- Default auto picks end at 8.95 s with 9 misses. Pass picks: [{i,t,dur}] to choose your own.
- mode 'pour': the bag is tipped and shaken on twos.
  - During the pour, at(t).hand = the grip on the bag's shoulder, grip 'bag', handA = the way the fingers point.
- mode 'scoop' (matches the screenplay's "A hand scoops crisps from a bag"):
  - The bag stands open on the lid.
  - Per scoop (D = (t1-t0)/scoops) the hand goes reach 0-.3D → rummage 'scoop' .3-.42D → 'carry' a handful (crisps phase 'held' at the fist, on twos) .42-.78D → 'release' over the bowl at .8D. The crisps fall: half in, half miss with rim bounces, hops and slides. Then 'return' to rest.
- at(t) returns:
  - {crisps, bowl, bag}: pass these straight into the crisps state.
  - hand: [x,y], the target for Scott's hand IK, or null.
  - grip: 'bag'|'reach'|'scoop'|'carry'|'release'|'return'|'held'|'drop'.
  - handA: finger direction in rad. 2.45 while picking up.
  - picked, misses, mode.
- Held crisps move on twos.

countGlints(t, t0, gap=3/24, n=6) → [6]
- A 1-frame ping, a fast decay, then a 0.12 residue. Ping i lands at t0 + i·gap; cue S.cue('ping', t0+i·gap, {i, sour:0}).

Other helpers
- bagFrame(bag, lx, ly, a, scale) → an affine for placing a hand in the bag's local frame.
- glassList(s).
- rimDir(view, x, y) → unit vector toward that view's light.

props (world-space)
- crisp(g,k,lightDir)
- bag(g,x,y,rot,s,lightDir,em)
- coaster(g,x,y,rot,size,sy,lift)
- cloth(g,x,y,rot,s)
- bowl(g,x,y,s,fill): the wide-size bowl, e.g. in Scott's hands
- glass(g,em,x,y,s,fill,lightPt,{shimmer,mat}): the F04 side-view glass
- glassHigh(g,em,x,y,s,fill)
- wineRing(g,x,y,amt,wipe,k)
- biscuit(g,em,x,y,s): Christof's
- cardBox(g,x,y,rot,s,open,deck): Angelo's; the deck slides out along local -y

Lights
- SETS.living.light = lights.wide = {x:930, y:404, rim: C.tungsten, rimLow: C.tungstenMid}. Use rim for figures and rimLow for furniture.
- crisps {1660,140}; glasses {1500,-400}; couch {1452,230}; coaster {1900,-260}.
- doorway {2500,260, rim tungstenMid, back [760,330], jamb [594,560]}. Rim Kay's back from 'jamb' to sell the lean.

Cams
- Use c.camera(SETS.living.cams.X), or cam(name, st, push=0.0035) for the Act 1 slow push.
- Wide cams:
  - wide {960,540,1}
  - wideTable {960,760,1.18}
  - wideKay {300,560,1.25}
  - wideCouch {330,760,1.22}
  - wideDining {1452,650,2.3}: re-centred on the new table; six chairs and six places for A006
  - wideLamp {930,520,1.2}
  - wideDoor {-120,640,1.3}: NEW. The hall doorway and the wet prints, for the Q04 opener.
- Insert cams:
  - crisps {960,540,1}; crispsBowl {1000,640,1.15}
  - glasses {960,540,1}; doorway {960,540,1}
  - couch {960,540,1}; couchArm {620,640,1.2}
  - coaster {960,540,1}

Anchors (SETS.living.anchors)

wide
- wallBase 872; lamp [930,404]; shade; kitchen {x0:92,x1:330,top:188,base}; table.
- glasses [[x,784]×6]; ring [948,784]; bowl [868,786]; mats [646,790].
- couchArm [118,852]; armchairSeat [1700,860].
- hall {x0:-430,x1:-236,top:196,base:872}; speaker [392,832]; prints [[-330,884],[380,925]].
- dining:
  - opening {x0:1300,x1:1652,top:332,floor:806,cx:1452,cy:742,rx:80,ry:15}.
  - table [1452,742]; pendant [1452,610].
  - places: [[1426,750],[1401,742],[1426,734],[1478,734],[1503,742],[1478,750]].
  - chairs (feet): [[1403,816],[1348,806],[1409,796],[1495,796],[1556,806],[1501,816]].
- words (F04's type spots):
  - top [960,118] (align centre)
  - bottomRight [1880,1012] (align right)
  - left [-300,330] (ink in wideKay, wideCouch and wideDoor)
- pose (F04 blocking for OTM.fig.profile):
  - kay {150,880,76, facing 1, lean -.14}
  - scott {486,914,84}
  - scottOnArm {132,862,104, anchor hip}
  - marina {724,724,82, hip}
  - christof {1150,900,88, facing -1}
  - deena {1452,902,84, -1}
  - angelo {1690,892,114, -1, hip}

crisps
- bowl, mouth [742,452], tableBack 600, lamp [1660,140], words [90,170].

glasses
- floor 884, h 340, x[6].

doorway
- opening; kay {x:704, y:1500, scale:172, facing 1, lean -.14}. x moved +20 so a sliver of the hot jamb shows behind her back.
- jamb [600,560]; words {left [90,330], right [1260,420]}.

couch
- armSeat [466,664].
- scottStand {200,1050,112, facing 1}.
- scottOnArm {x:466, y:670, scale:112, facing -1, anchor:'hip'}.
- floor 968, lamp [1452,230], words [70,300].

coaster
- glass [1250,600]; ring [720,640]; stack [1660,700]; edge 860; coasterUnderGlass [1250,604].
- words {bottom [90,950], bottom2 [90,1028], right [1830,990] (align right)}.

Demos (12; node tools/set.js living 1)
1. wide Q02 empty
2. wide Q04 party with placeholders, walla 1, prints and music, biscuit and card box
3. wideDining 2.3x
4. wideKay +4 s push with the hall door and prints
5. wideTable with lamp .5 dimmed after the figures
6. crisps pour
7. crisps scoop
8. crisps pick-up
9. glasses count
10. doorway Kay
11. couch: Scott on the arm
12. coaster: wipe + a lifted mat over the glass

=====================================================================
SETS.title (film/sets/title.js): ports F01, the tallies and the end card
=====================================================================

draw(c, t, o)
- Alias title(c,t,o). t is seconds since the title's first frame. o overrides SETS.title.T:
  - count .125: one bar every 3 frames.
  - rise .30.
  - stub 340.
  - bars 'rise' | 'cut' | 'all'.
  - words [1.00, 1.25, 1.50]: ONE, TOO and MANY stamp in over 2 frames. ONE is ink on the low band.
  - burn 2.10, burnDur .36: a 14-stage burn front. Scorch and the emberHot edge are pre-composited into one paper layer per stage.
  - ember 1.05: the hold.
    - The ember breathes on ones: ±6% in the bloom and ±3% in the cut.
  - outDur .45: then out, leaving damage:
    - A ragged, unblurred soot rim with browned paper just outside it.
    - Seven ragged ember pin-holes inside ONE that never close (knockout damage persists until black).
  - credit 3.60: 'SCREENPLAY BY OSITA MILES', letter by letter.
  - end 5.60: black from here on; null = never.
- Returns {phase: 'title'|'burning'|'ember'|'going out'|'out'|'black'}.
- The knockout and pin-holes follow c.camera().
- Suggested shot post: SETS.title.post = {halation:.85, vignette:.45}.
- Sound: tally/ping at i·0.125; drone7 swell from about 2.1 to 3.5.

tally(c, t, o)
- Scratched marks on black, drawn in screen space.
- o = {marks:6, faint:false, gapT:null (= T.count .125, 3 frames), h:440, gap:92 (px), cx:960, cy:540, seed, damage:1, extra:false}.
- Mark i starts at i·gapT, so the count is countable and echoes the six bars and six glasses. Each scratch takes 1.5 frames, with a hot head.
- Marks boil on twos. Also: gate weave, flicker, ghost double, hairlines, dust, running scratches.
- faint:true adds a seventh:
  - It starts 1.5 gaps after the last mark.
  - It scratches to 58% and sticks there, its hot head stalled.
  - Its alpha per frame is .5,.5,.5,.44,.5,.4,.5, then flickers on ones 0,.35,0,.2,.1, then it is gone (12 frames).
- extra:true cuts the last mark through to the ember.
- Interstitials: Q03 {marks:6, faint:true}; Q07 {marks:5}; Q09 {marks:4}; end {marks:2}.

Tally timing
- tallyTimes(o) → [{i, t, t0, faint}]:
  - t is the sound time: a mark's first frame, or for the faint mark its stall.
  - Cue: S.cue('tally', at + m.t, {faint: m.faint}).
  - For six + faint: 0, .125, .25, .375, .5, .625, then faint t0 .8125 (sound .854).
- tallyDur(o): the seconds needed on screen. 6+faint = 1.31; 5 = .58. Make each interstitial shot at least that long.

endcard(c, t, o)
- SETS.title.endT = {marks:0, hold:2.4, title:2.9, credit:3.9, end:7.0}.
- Sequence: two marks, then black, then ONE TOO MANY (ONE cut to the ember; oneEmber:false = ivory), then the credit, then black.
- showTitle:false gives the marks, then black only. extra:true makes the second mark ember.

Other title exports
- layout() → {bars:[{id,x,w,k,top,cx,h,path}], glyphs, one, slot, seamMid, seamCore, FLOOR:884}.
  - The result is cached only once Six Caps is loaded (document.fonts.check), so an early call never freezes the fallback metrics. Assets rebuild until then.
- drawField(g).
- anchors {floor, slot(), bars()}; cams {title, slot}; T; endT.

Title demos (13; node tools/set.js title 1)
1. stubs rise
2. words
3. burning
4. ember
5. out + credit, showing the char rim and pin-holes
6. tally six counting (frame 10)
7. six + faint stuck at 58% (frame 22)
8. faint flickers out (frame 28)
9. five (1.85)
10. four (2.00)
11. two
12. end card marks
13. end card title

## Known issues
- Engine: f.finish() costs about 20 ms whenever a hole is marked (quarter-res blur, lightbox, tint). Most of the title's burn, ember and out cost (the out phase now keeps 7 ember pin-holes) is engine-side; the title's own draw calls are deferred and nearly free. The burn frames sit at 50-55 ms, just under budget. A cheaper finish path for small hole areas (for example a dirty-rect crop of the holes canvas) would bring them to about 35 ms.
- The hi-res close-framing caches live in a module-level LRU in living.js (up to 8 entries, about 24 Mpx, roughly 96 MB), not in c.cache, so c.cache's 40-entry LRU is not crowded. The first frame of each new close framing costs one paint (about 40-80 ms). Shots that cut between many close framings pay it once per framing.
- Breaking geometry changes for anyone who used the previous values: wideDining cam x 1470 → 1452. Dining opening x0 1372 → 1300, table cx 1506 → 1452, rx 84 → 80. couch.armTop 648 → 704, with anchors.couch.scottOnArm moved to {466,670}. doorway.kay x 684 → 704. Coaster edge 1000 → 860, glass [1250,640] → [1250,600], ring [720,700] → [720,640], stack [1640,880] → [1660,700].
- Behaviour changes in pour() and tally(): pour() now defaults to pickGap .6 and pickDur .55 (default picks end at 8.95 s). tally() drops o.dur and spaces marks by o.gapT (default .125 s). An interstitial needs at least SETS.title.tallyDur(o) seconds: 1.31 s for six + faint, 0.58 s for five.
- The insert views' cached extents reach only about 200-320 px past the frame (tested with every named cam at push st=4). Zooming an insert out below about 0.8 shows the extent edge. The wide is safe down to 0.7.
- Q04's wet footprints are now the wide's s.prints. The hall doorway they lead from sits off F04's left edge (x -430..-236), visible in cams wideDoor, wideKay and wideCouch. The trail's toe glints are lamp tungsten, not the hall set's rainSilver.
- Every character in the demos is a placeholder (OTM.fig.profile silhouettes and capsule hands). The scoop and pick-up hand targets (pour().at(t).hand / grip / handA) are meant to drive rig.js IK.

Test sheet: out/set_living.png and out/set_title.png (cam check at st=4 and zoom 0.7: /tmp/claude-0/-home-user-Inez-Model/8a62f68b-8b0e-5610-a72d-0c00b1ecdab5/scratchpad/livfix/cams1.png)
Performance: Headless, from tools/set.js plus a probe that takes the median of 5-11 frames.

Living:
- wide 31-38 ms with placeholders.
- wideDining 17-21 ms (was 69 ms).
- wideKay, wideCouch, wideTable, wideLamp: 18-43 ms. The upper end includes the lamp dimmer and placeholders.
- crisps 16-18 ms; glasses 11 ms; doorway 13-19 ms; couch 12-15 ms; coaster 14 ms.
- The first frame of a new close framing (zoom above 1.16) pays a one-time hi-res cache paint of about 40-80 ms.

Title:
- Stubs 31 ms; words 11 ms.
- Burning 51-55 ms. About 20 ms of this is the engine's holes pipeline.
- Ember hold 30-34 ms; out + credit 29-31 ms.
- Tallies 9-15 ms; end-card title 28 ms.
