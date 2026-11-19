# API: table.js, set_table.png

SETS.table (= T), in film/sets/table.js. The file header (lines 1-120) holds the same reference.

## Fix pass: what changed

All 9 must_fix items and all 12 nice_to_have items are applied. I did 6 render-look-fix rounds, at full resolution and on the sheet.

**Must-fix**
1. The photo ghost is removed. `null` slots draw nothing, and the neighbours' leans shape the gap.
2. The wall gap is person-sized, with about 390 px of wall between Angelo's and Scott's shoulders.
   - Slots are deena 262, angelo 566 (+0.07), gap 970, scott 1376 (-0.07), marina 1688.
   - `T.photo` is now literally the wall view's flash frame, cropped and scaled (k 0.83, x0 = 970 - 760/0.83, y0 30). The positions, leans and room are identical.
   - Marina's hand rests on Scott's shoulder as in F08.
3. `bottleSide` hood glint:
   - clipped to the bottle;
   - kept inside the shadow-side edge;
   - alpha scales with `state.kitchenLight`, so it is absent when that is 0 (the same applies to the top-view bottle).
4. `fanDeck` faces: the centre pip is gone. Each card shows a small index and suit in its visible corner strip, with an edge shadow. The default is n 16 and spread 100; the gathering demo uses 24 cards at 168 degrees.
5. The VOICE in 'top' is placed by its F07 screen position under `cams.circle`:
   - "Scott." baseline centre (1306, 682), size 140, so x is about 1160-1450;
   - "Angelo." at (1298, 742), size 36;
   - both clear of the clasp (1059, 682) and the fifth glass (1017, 619).
   - The perforations follow automatically.
6. Re-stamps can now be drawn over: `state.restamp:false`, `state.overShade(cx)`, `state.overScreen(cx)`, `T.shade()`, `T.phoneScreen()` and `T.sayAbove()`.
7. `T.bottleAt(state, view)` covers 'bottle', 'top' and 'low'. Fresh index 2 is Deena's glass.
8. Crash state:
   - The top-view bottle moves to clock 168, r 318: behind Scott on the gap side, clear of his glass and forearms.
   - The fresh glasses form an arc at r 140, clocks 136-224, clear of the shade and the pile ring.
9. The static layers are cached:
   - top: floor, boards, hood wedge, chair shadows, chairs, table rings, grain, lip;
   - low: wall, and table rings.
   - The cache is screen-aligned, not world-space, because a rotated or scaled blit costs about 11 ms in software, slower than drawing live under the -6 deg cams.
   - A cached frame matches live drawing (mean difference 0.01).
   - `T.cacheLayer` is available for the Q08 bodies.

**Nice-to-have**
- `gapPress`
- soft-bottle THUMP demo
- numeric piles resolve to the people present
- tired-lamp value ladder
- `perforationLevel` (default 0.6)
- `chairAt` / `seatAt` (top and low)
- riffle shuffle with `riffleHands`
- phone placeholder rims use `T.lights.phone.color`
- hood sliver in 'two'
- the far insert doorway now has a casing, half-open leaf, wall spill and threshold
- smudged partial lip print
- `perforate` uses the `t` argument

## Drawing

Call order: `c.camera(T.cams.X); T.back(c, t, state, view); draw characters; T.front(c, t, state, view)`. `T.draw(c, t, state, view)` runs back and front together.

'low' has three layers:
1. `T.back(c,t,s,'low',{part:'wall'})`
2. the far bodies: Angelo, Scott, Kay
3. `T.back(c,t,s,'low',{part:'table'})`
4. the hands and near bodies
5. `T.front`

`t` is any seconds value. It drives dust, ember flicker and tremble. `T.bare = true` hides the demo placeholders, and `T.noCache = true` forces live drawing.

## Views

- **'top'**: overhead, centre (960,540), radius 352 px (533 px/m).
  - Locked seats in clock degrees: scott 180, kay 240, marina 300, christof 0, deena 60, angelo 120. The gap is at 150.
  - People sit shifted in their chairs away from the gap (`T.top.SHIFT6`).
  - The pendant is a black disc inside three posterised rings.
  - `layout:'circle'` gives the F07 hand circle: scott 210.5, marina 290.2, deena 9.8, angelo 89.5.
- **'low'**: F06, with the hall doorway behind the gap and the kitchen doorway at screen right.
- **'two'**: Kay at left facing right, Scott at right facing left. `state.behind` sets the soft shapes behind. kitchenLight adds a far hood sliver behind Kay.
- **'kayglass'**: big tulip glass, first pour, a partial smudged #D9262F print on the rim. `tapT` ripples the wine.
- **'bottle'**: five fresh glasses (`freshWho` = ['marina','angelo','deena','scott',null]: index 2 is Deena's, index 4 is the unclaimed fifth) and Kay's glass apart.
- **'wall'**: four busts with the person-sized gap, door frame, picture frame, and a foreground of table edge plus two chair backs.
- **'phone'**: F08. The screen shows `T.photo(who)`.

## State

Every key is optional; `T.DEFAULTS` lists them.

**Light**
- `lampTired` 0..1: the hot band goes 75% of the way to #C98A4B, the mid band is held darker, and the pool shrinks 15%. 'wall' and 'phone' default to 1.
- `kitchenLight` 0..1:
  - 'low': the doorway, with spill and bloom;
  - 'top': a floor wedge at lower left, with chair shadows in it;
  - 'two': the sliver;
  - inserts: the defocused doorway;
  - bottles: the hood glint.

**Perforations**
- `perforations`: 0..1 or {scott, angelo}.
- `perforationLevel`: default 0.6.
- `perfCut`: real knockouts (about +20 ms).

**Cards**
- `piles`:
  - 7 gives the F05 seven-ring.
  - n < 7 gives one pile per person present (`s.empty` and empty chairs are skipped). If n = present + 1, the gap pile is added. If n is smaller, the first n are taken starting from Scott.
  - Or a list of entries: a name, clock degrees, {clock, r}, [x,y], or {at, n, mess, ring} (entries nest).
- `ring`: 'seven' or 'seats'.
- `pileCards`, `mess`.
- `gapPress` 0..1: the gap card starts lifted with a drop shadow and is pressed flat by no hand (top and low).
- `flying`: [{from, to, u, h, spin}].
- `deck`: true or {at, rot, fan, n, split 0..1, riffle 0..1}.

**Glasses**
- `glasses`: {id: fill | {fill 0..1.3, lip, hide, at}}.
- `glassSwap`, `fifthGlass`.
- `bottle`: 0..1 or {u, at (top) | x, y, h (bottle view) | mouth, rot, soft 0..1}.
- `fresh` 0..5, `freshFill`, `freshAt`.
- `pour` {i, level, flow}, `thumpT` (every glass jolts), `kayGlass:false`.
- `tapT`, `kayFill`, `lip:false`.

**Chairs**
- `biscuit`.
- `chairs`: {id: false | {out, dc, rot, empty, alpha}}.
- `empty`: [ids].
- `extraChair`.
- `extraHand` 0..1.

**Wall**
- `flash` 0..1 and `figs` [Shape|Path2D].

**Phone**
- {x, y, rot, s}, `hand:false`, `screen` 'photo' | 'glow' | 'off', `who`, `zoom` 1..4, `focus` [u,v] (default [0.5, 0.42], the gap), `tremble` (true or 0..1).

**Re-stamps**
- `restamp:false` skips both re-stamps (the top shade and the phone screen).
- `overShade(cx)` / `overScreen(cx)` run right after the re-stamp, with the camera transform set, so they draw in world coordinates.

**Other**
- `dust:false`.

## Helpers

**Cards**
- `T.cardInFlight(c, from, to, u, {view, state, h, spin})`
- `T.fanDeck(c, x, y, {n, u, spread, r, w, h, rot, face, dark, lampTired})`
- `T.deck(c, x, y, rot, {fan, n, split, riffle})`
- `T.riffleHands(at=dealer deck, rot, {split, riffle, n})` returns [[left], [right]] hand targets.
- `T.card(c, x, y, rot, k)`

**Glasses and bottle**
- `T.glassTop(c, [x,y], {fill, lip, coaster}, state)`
- `T.glassSide(c, x, y, h, {fill, lip, lipSide}, state, light)`
- `T.bottleSide(c, x, y, h, rot, state, light)` returns {foot, mouth, neck, shoulder, grip, rot, height, up, M}.
- `T.bottleAt(state, 'bottle'|'top'|'low')` returns {foot, mouth, neck, shoulder, grip (body), rot, height, up}.

**Wall and photo**
- `T.photo(who = ['deena','angelo',null,'scott','marina'])` returns a 1520x668 canvas.
- `T.wallBusts(who, {tremble, t, hand:false, opts})` returns [{id, slot, x, lean, b, handOn}].
- `T.wallBust(id, opts)`
- `T.flashFigs(c, shapes, flash)`

**VOICE**
- `T.voiceCut(c, view, 'scott'|'angelo', depth)`
- `T.voiceAt(view, which, cam)` returns {x, y, size, rot, face, text}. Under `cams.circle` it gives (1306, 682), size 132, rot 0.

**Re-stamps and lines**
- `T.shade(c, state, cx, m)` and `T.phoneScreen(c, state, cx, m)`. Capture `m = c.g.getTransform()` in your draw, then push into `c.before`.
- `T.sayAbove(c, who, text, x, y, opts)`: use it in a line's `draw` to put that line above the re-stamps.

**Caching**
- `T.cacheLayer(c, key, g => {...world drawing...}, sig)`: fn may only touch `g`, not `c.em`.

**Other**
- `T.castTop(c, shape, alpha, k)`
- `T.camAt(world, screen, zoom, rot)`
- `T.silFill(g, path, fill, ux, uy, w, rim, alpha)`
- `T.pal(tired)`

**Geometry**
- `T.top`: P, Z, shadow, kz, seat(id, layout), seatAt(id, state) (follows the chair: clock, x, y, dir, chair, hands), chairAt(id, state), present(state), pile(spec, state), piles(state), glass(id, state), fresh(i), bottle(), PLACE7, SEAT6, SHIFT6, GAP, G, circle.
- `T.low`: P3, CL, pxm, onTable, lamp, seat, seatAt(id, state) (head, scale, facing, depth, near), fresh(i), bottle().

## Anchors

- **`anchors.top`**:
  - seats{id: {clock, chairClock, x, y, dir, chair, pile7, pile, glass, hands}}
  - gap{clock, seat, pile7, edge, floor, fifthGlass, voice, voiceSoft}
  - dealer{deck, hands, dir}
  - circle{figScale 120, seatR, seats, clasps{scottMarina, marinaDeena, deenaAngelo, angeloScott}, hands, fifthGlass}
  - pendant{x, y, r, height}
  - bottle, fresh[5], freshWho, figScale 94
- **`anchors.low`**:
  - seats{id: {clock, head, scale, facing, near, card7, card, depth}}
  - gap{card, door, elbow, shoulder, voice, voiceSoft}
  - kitchenDoor, hallDoor, dealer{deck, hands, scale}, light
- **`anchors.two`**: kay/scott {x, y (hip), scale, facing, glass, hand}, lamp, table, behind, voice.
- **`anchors.kayglass`**: {foot, height, rim, tap, lip}.
- **`anchors.bottle`**: {fresh, freshWho, deena: 2, glassH, kay, bottle{foot, mouth, neck, shoulder, grip, rot, height, up}}.
- **`anchors.wall`**: {slots, order, waistY 930, scale 160, floorY, flashOffset, voice, voiceSoft, bust, busts, photoCrop}.
- **`anchors.phone`**: {phone, heads, light}.
- **`T.lights.<view>`**: the key light for rims. 'phone' carries color C.phoneWhite.

## Cams

top (F05, rot -6 deg), topCentre, topWide, topGap, topDealer, circle (F07; the VOICE is placed by it), gapFloor, low, lowPush, two, kayglass, bottle, wall, phone.

## Demos (20; node tools/set.js table 1)

1. top: gathering (chairs dragged, glass swap, the face-up flourish)
2. top: riffle (topDealer)
3. top: seven piles (F05) with a card in flight
4. top: six cards, sixth hand from the dark
5. top: piles:5 with Kay gone (rotating cam)
6. top: after the crash
7. top: Deena catches the wrist, Angelo shoves his chair back
8. top: hand circle with the VOICE cut (bodies through cacheLayer)
9. top: perforations persist
10. low: six hands on six cards (F06)
11. low: gapPress
12. low: tired lamp, hood-yellow kitchen door, perforations
13. two: Scott and Kay
14. two: later
15. kayglass: the lip print and the tap
16. bottle: the THUMP, soft then cut
17. bottle: the overpour, with the hand on bottleAt
18. wall: the four against the wall
19. wall: FLASH
20. phone: F08, pinch zoom with overScreen

## Known issues
- ENGINE/KIT: in headless playback, even an EMPTY shot spikes to about 100 ms on every third frame (example frame times: 5 8 98 5 8 98 ...). That puts p90 at about 120 ms for every demo and makes the single-frame numbers from tools/set.js and tools/strip.js noisy. It is outside the set. It looks like GC or a periodic flush in engine.js or otm.js frame/finish; worth profiling before the export.
- KIT: OTM.lightboxSmall caches its 480x270 fbm ember field per (frame%8 seed, 1/6 s bucket), up to 192 builds of about 25-40 ms each. During a first pass, almost every VOICE frame (Q08 cut, Deena's throat, the handprint) pays this, so the hand circle measures 56 ms sequentially against 33 ms when warm. Suggestion: key it only on the time bucket, or precompute the buckets once.
- c.cache is a 40-entry LRU shared by the whole film. The table's layer caches are (W+192)x(H+192) and are created only for keys that hold still. During a push or a rotating cam the layers draw live (about +10 ms). Long top-view shots should use static cams or pure pans/drifts to stay cached.
- Never draw a large world-space cached canvas under a rotated or scaled camera: in software that blit costs about 11 ms, slower than drawing live. T.cacheLayer is screen-aligned for this reason. Q08 should cache its still clasped bodies with T.cacheLayer(c, 'Q08:bodies', g => ...).
- The re-stamps (the top-view shade and the phone screen) run in c.before, after dialogue is drawn, so by default they paint over any line that overlaps them. Use state.overShade/overScreen, restamp:false with T.shade/T.phoneScreen, or a line draw: (c,s,o) => T.sayAbove(c, s.T.who, s.T.text, x, y, o).
- T.photo no longer takes a ghost option: null slots draw nothing (doctrine). Marina's left arm in wallBusts is a short reach to Scott's shoulder (armL 'none' plus an extra arm shape, as in the approved F08). Pass {hand:false} for the hanging-arm pose.
- Breaking changes to the old default positions: the top-view bottle moved from tP(194, 298) to tP(168, 318), the fresh glasses moved from a straight row to an arc (r 140, clocks 136-224), and numeric piles below 7 now resolve to people (ring 'seats') instead of 360/n spacing. Any choreography written against the old positions needs updating.

Test sheet: out/set_table.png
Performance: These are steady-state medians from sequential playback, excluding the engine's periodic spike (see issues). The node tools/set.js sheet times a single cold second frame, so its numbers jump (14-90 ms).
- Hand circle with four bodies through T.cacheLayer and the VOICE cut: about 33 ms in isolation (56 ms uncached). The engine's VOICE hole pass alone costs about 32 ms, so the set plus bodies add only 1-3 ms.
- Top views: 14 ms bare with a static cam, 27-47 ms with placeholder figures.
- Low: 22-28 ms. Two: 21-23 ms. Inserts: 16-26 ms. Wall: 23-32 ms. Phone: 27-29 ms.
- Static layer blit: about 0.8 ms, against about 10-13 ms live.
