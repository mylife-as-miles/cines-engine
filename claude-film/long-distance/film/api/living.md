# SETS.living: the flat

`film/sets/living.js`. The film's main set: kitchen and living room, one room. It is small, tidy for one and furnished for two: two stools, two mugs, a couch for two, two hooks by the door. Q06 plays it at night under the pendant, Q08–Q10 in grey daylight for the visit, and Q11 at dusk going blue.

The flat is laid out **once, in metres**, and every view is a pinhole camera on that one layout, so the pale rectangle, the mugs, the fridge and strip, the counter and salt, the couch, the door, the window and the pendant never move. Look B's materials (cut paper, a texture per piece, lifted shadows, light in posterised bands) are drawn through C's cameras: elevations with a shifted lens, verticals vertical. Nothing here is gloss. The phone (`PHONE`) and the characters (`RIG`) are drawn by the sequence between `back()` and `front()`.

Check it with `node tools/set.js living 1`, which writes `out/set_living.png` (19 demos, every view at every time of day it is used).

## Use

```js
const V = SETS.living.views.counter;
const s = { tod: 'night' };                       // state: see "State keys"
V.back(c, t, s);                                  // the room behind the actors (cached)
// ... RIG / PHONE here, placed with V.anchors (or V.shots.close.anchors for s.shot = 'close')
V.front(c, t, s);                                 // what stands in front of them (the counter, the pendant, the door frame)
```

- **Coordinates.** Anchors and splits are in the authored 1920×1080 framing. If you call `c.camera({...})` before `back()`, the cached layers move with it, so draw the characters under the same transform and the anchors still hold.
- **Anchors** are `[x, y, pxPerMetre]`: the screen point and the scale at that depth. A head is about 0.23 m and the phone is 0.15 m tall, so a phone on the salt in `counter` is `0.15 * 926 ≈ 139 px`.
- **Other points.** Use `V.project([x, y, z], shot)` for any other world point, or `V.cam.p(x, y, z)` / `V.shots[name].cam.p(...)` (returns `[x, y, depth]`). For example, use it to walk her from the door to the pale rectangle.

## The flat (metres)

X runs along the back wall, left to right as seen from the front door. Y is up. Z runs from the front wall (0) to the back wall (4.2). The room is 5.4 wide, 4.2 deep and 2.5 high. `SETS.living.world` holds every number below, and `SETS.living.anchorsWorld` holds the anchor points in metres.

```
 back wall Z=4.2 ┌──────────────────────────────────────────────────────┐
                 │kit│FRIDGE│ him  ·pendant     ▯rect  ┌────COUCH────┐ │W
                 │run│ strip│      ┌─COUNTER─┐  shelf │ L │ M │ R  │ │I
                 │   │      │      │  salt▪▫ │  mugs  └────────────┘ │N
                 │   │      │      └─────────┘   :seam X 2.70         │D
                 │          stool  stool         :                    │O
                 │                       him ●   :  ● her             │W
                 │                               :                    │
 front wall Z=0  └──────────── hooks ─ ┌door┐ ───────────────────────┘
                                        landing (Z < 0)
```

| Thing | Where (metres) |
|---|---|
| Fridge | X 0.62–1.30, front face Z 3.56, 1.80 tall; handle X 1.235 |
| Photo-booth strip | centre X 1.045, Y 1.47 on the fridge door; 0.052 × 0.19, tilted −0.045 rad, red magnet. `GG.photoStrip` seed 3 |
| Counter (island) | X 1.42–2.82, Z 3.12–3.62, top Y 0.92 |
| Salt | X 2.22, Z 3.30 on the counter. **The counter view's seam.** The phone leans on it at X 2.35 (the empty half) |
| Pan (when resting) | X 1.70, Z 3.36 |
| Pendant | X 2.00, Z 3.92 (over where he stands, 0.28 m off the wall); bulb Y 2.02 |
| Pale rectangle | X 2.70–3.18, Y 1.52–1.90 on the back wall; nail X 2.94, Y 1.948. **Its left edge (X 2.70) is the room's seam** |
| Shelf, two mugs | shelf X 2.66–3.30 at Y 1.27; his mug (mustard) X 2.80; hers (sage) X 3.14, standing in a ring of dust |
| Couch | X 3.05–4.85 against the back wall, seat Y 0.44, back 0.86; three seat cushions; **the middle cushion's centre (X 3.95) is the couch view's seam** |
| Window | on the right wall (X 5.4), Z 3.20–4.00, Y 0.95–2.25, cross mullion. By night the city; by day the building opposite |
| Front door | front wall, X 3.00–3.90, 2.04 tall, hinged at X 3.0, opening into the room. Outside: the stairwell landing |
| Hooks | front wall X 2.28 (his jacket) and X 2.62 (bare); light switch X 2.80 |
| Floor | kitchen tiles to X 2.66, boards beyond |

**Light.** At night the pendant's light is drawn the way B2 draws it.
- **On the walls**, a narrow warm beam: its straight sides converge toward the shade.
  - It is hottest just under the shade and just above the counter, a smaller step in between.
  - Around it lies a faint, blurred glow, barely above the dark, so the eye reads light and not a shape.
  - The steps between bands are small. Most of the contrast is between the lit core and the aubergine wall.
  - The same bands lie on every vertical surface they reach (the elevation convention).
- **On the counter**, a soft pool: four concentric ellipses under the shade (centre Z 3.40). The floor has a wider pool, under the counter's shadow.
- The open top of the shade lays a warm disc on the ceiling.
- Small objects take the band they sit in. The strip has a floor of lamp spill, so it reads in the fridge insert.
- Review item 9 (cut 1) replaced first the geometric cone (dunes), then a wide flat-topped wedge (a pyramid).

By day one slant of window light from the right wall crosses the back wall in her half, over the pale rectangle and the couch, with two thin mullion shadows. The kitchen side is a step dimmer, so the empty half is the bright one, and the paper is grey-green. At dusk the same light goes blue.

## State keys (`s`)

| Key | Values | What it does |
|---|---|---|
| `tod` | `'night'`, `'day'`, `'dusk'` (also `later`→night, `morning`/`afternoon`→day, `evening`→dusk) | The light. Defaults per view: room, fridge and counter default to night; the others to day. |
| `shot` | per view (below) | Picks one of the view's cameras. Anchors, split and light are on `V.shots[shot]`. |
| `blue` | 0..1 | With `tod: 'day'`, crossfades to dusk: Q11's "the daylight going blue". It draws two cached layers. |
| `door` | 0..1 (open; 1 = 100°) | The front door leaf, drawn live. In `door` it defaults to 0 (inside), 0.9 (deep) or 0.85 (close). In `between`'s reverse shot it defaults to closed. |
| `landing` | default true; `false` | The stairwell landing beyond the open door (`door`, inside). `false` leaves the opening dark for a plate of your own. |
| `phone` | `'cushion'` | Presses a soft dent into the middle cushion where the phone lies (`couch`, `room`, `door` deep). The phone itself is yours: `anchors.phoneCushion`. |
| `pan` | `'counter'` | Draws the pan, with the half-eaten pasta, resting on the counter. When he holds it, draw it yourself with `SETS.living.pan(...)`. |
| `bag` | `'counter'`, `'couch'` | Puts the floral makeup bag down on the counter's end or the couch's left arm. In hand, use `SETS.living.makeupBag(...)`. |

Each layer is cached per view, shot, `tod` and the drawn keys (`pan`, `bag`, `landing`, `phone`, and `door` in `between`). A key that changes every frame should stay live: only `door` and `blue` are designed to animate.

## Views

The split is where his half meets the empty half, as a fraction of the width; every seam comes from the architecture. Each shot's `light` is the shot's one motivated light. `lights.night/day/dusk` give it for every time of day: `{kind, x, y, color, dir, poster, levels, k, amb}`.

- `x, y` is the source on screen. It may lie off-frame, or behind the camera in the reverse shots.
- `dir` is the direction *to* the light in the heads' view space (x right, y down, z toward the camera). Pass it to `GG.head` / `RIG` lights, e.g. `{dir: L.dir, col: L.color, k: L.k, poster: L.poster, levels: L.levels}` with `amb: L.amb`.
- Night: the pendant `#FFE2AE`. Day: the window `#E6EBEE`, from the right and slightly in front (dir ≈ `[0.92, −0.18, 0.34]` in the forward views). Dusk: `#A9B8DA`.

| View / shot | What it is | Used in | Split (seam) | `front()` draws |
|---|---|---|---|---|
| `room` / `wide` | The whole room, elevation of the back wall: kitchen half left, empty half right, the window glimpsed on the right wall. It is a wide lens, so ceiling and floor show. | Q06 0–7 (night), Q08 37–50 and 57.5–66, Q10 75–86 (day), Q11 44–58 (dusk). Also "couch by day, from the bedroom door" (Q09 17) | 0.500 (pale rectangle's left edge) | counter, stools, pendant (he stands behind them) |
| `fridge` / `insert` | The fridge door close: the strip readable, four laughing frames, her head tipped against his in the last; the handle at right | Q06 7–13 (night), Q08 54–57 (day) | 0.527 (strip's right edge) | nothing |
| `counter` / `main` | B2: him behind the counter, the cone behind his head, the shade at the top, the fridge and strip left, the salt on the seam, the phone's place right of it, the pale rectangle, nail and mugs right | Q06 13–30, 53–64 (the rhyme) | 0.547 (the salt) | counter, salt, pan, pendant |
| `counter` / `close` | Tighter on him and the phone (B2's scale, 909 px/m at his head) | Q06 30–42 | 0.615 (the salt) | counter, pendant |
| `couch` / `main` | The couch along its length, the pale rectangle and mugs above left, the window at the right edge | Q08 0–17, Q09 17–22, Q11 19–31.5 (day, `blue` rising) | 0.500 (middle cushion) | nothing |
| `couch` / `close` | High three-quarter plan onto the middle cushion: B1 by day, turned. **The only shot with pitch** (verticals converge) | Q08 9.5 (close), Q11 31.5–44 (dusk) | 0.500 (middle cushion) | nothing |
| `door` / `inside` | The front door from inside, hooks (his jacket, the bare hook), the switch. Open: the landing (two-tone stairwell paint, high window band, handrail) | Q08 17.5–27 (opens; her in the doorway), Q10 70–75 (`door` 1→0, closes softly) | 0.383 (latch jamb) | the door leaf (live) |
| `door` / `deep` | From the landing through the open door: past him to the couch, the phone on the cushion in the empty half | Q08 32–37 | 0.500 (the doorway's centre) | the stairwell wall and door frame (he stands in the doorway, between) |
| `door` / `close` | From the landing, tight on him in the doorway; the room behind out of focus; the leaf's edge by his hand (`V.doorEdge(open, y, 'close')`) | Q08 27–32 | 0.188 (hinge jamb) | the stairwell wall and door frame |
| `between` / `two` | B3/C3: the same back wall in daylight. He is near camera left (his half); she stands in the empty half in front of the pale rectangle; the window's slant on her side; the fridge and strip behind him; the couch behind her | Q09 27–50, Q10 0–18, 59–70 | 0.500 (pale rectangle's left edge) | nothing |
| `between` / `her` | Close on her: the pale rectangle behind her head; background softened | Q10 21–26, 40–44 | 0.444 (pale rectangle's edge) | nothing |
| `between` / `him` | Reverse, close on him: the front wall behind him (the closed door, the hooks, his jacket, the bare hook); softened | Q10 26.5–40, 48–51 | 0.266 (door's hinge jamb) | nothing |
| `mug` / `insert` | The two mugs on the shelf seen slightly from above: his rinsed, hers in its ring of dust; the pale rectangle's lower edge above | Q08 50–52 | 0.500 (between the mugs) | nothing |
| `rect` / `insert` | The pale rectangle and its nail: plain wall left (his half), the clean rectangle right, the slant crossing it | Q08 52–54 | 0.500 (its left edge) | nothing |
| `hands` / `insert` | Close at hand height on the seam, the room heavily out of focus behind (counter end, shelf, mugs, the pale rectangle's edge above the centre) | Q09 50.5–58, Q10 54–59 | 0.500 (the meeting point) | nothing |

## Anchors (default framing of each shot, `[x, y, pxPerMetre]`)

Heads are the centre of the head; `…Feet` is the floor under the same person.

- **room/wide**:
  - him: `himCounter` 678,479,297; `himCounterFeet` 678,972; `himBetween` 659,430,502
  - her: `herInside` 1742,359,920 (just inside the door, near and right; feet below the frame); `herBetween` 1067,488,383
  - counter and phone: `salt` 796,682,341; `phoneSalt` 840,717,343
  - wall and evidence: `strip` 430,532,320; `stripLast` 431,553; `rect` 1027,471; `rectEdge` 960,471; `nail` 1027,405,279; `mugHis` 988,567; `mugHers` 1085,567,283
  - light: `bulb` 753,373; `window` 1817,491
  - couch: `couchSeam` 1360,862,320; `phoneCushion` 1424,855; `seatL` 1196,862; `seatR` 1525,862; `couchHead` 1293,818; `couchHeadL` 1143,770; `couchHeadR` 1566,770
- **fridge/insert**: `strip` 915,525,3750; `stripLast` 926,773,3750 (the last frame, for the push down); `fridgeHandle` 1676,1611
- **counter/main**:
  - him: `himCounter` 726,388,631; `himCounterChest` 724,628
  - counter and phone: `salt` 1051,880,906; `phoneSalt` 1173,979,926; `pan` 595,955,868
  - fridge: `strip` 141,491,762; `stripLast` 143,541; `fridgeHandle` 273,699
  - wall and evidence: `rect` 1410,387; `rectEdge` 1278,387; `nail` 1410,257,548; `mugHis` 1346,576; `mugHers` 1538,576,567
  - light: `bulb` 885,165,625
- **counter/close**:
  - him: `himCounter` 687,227,909; `himCounterChest` 685,572
  - counter and phone: `salt` 1182,900,1304; `phoneSalt` 1360,1040,1333; `pan` 523,1013
  - wall: `rect` 1663,237; `nail` 1663,49
  - light: `bulb` 915,−93 (above the frame)
- **couch/main**:
  - couch: `couchSeam` 960,880,707; `phoneCushion` 1101,866; `seatL` 597,880; `seatR` 1323,880; `armL` 388,744; `armR` 1532,744
  - heads: `couchHead` 822,782 (lying, head beside the seam); `couchHeadL` 501,676 (head on the left arm); `couchHeadR` 1419,676
  - wall: `rect` 425,105; `rectEdge` 298,105; `mugHis` 333,282; `mugHers` 518,282
  - light: `window` 1964,69
- **couch/close**: `couchSeam` 960,908,1224; `phoneCushion` 1207,890,1233; `couchHead` 709,753,1255; `seatL` 332,908; `seatR` 1588,908
- **door/inside**:
  - her: `herDoorway` 960,445,451; `herDoorwayFeet` 960,1149
  - him: `himDoor` 799,355,596 (inside, on the latch side, opening it); `himDoorFeet` 799,1345
  - door: `doorHandle` 776,706; `doorJamb` 735,715; `doorHinge` 1185,715,500
  - hooks: `jacket` 1559,514; `bareHook` 1380,343
- **door/deep**:
  - him: `himDoorway` 937,398,773; `himDoorwayFeet` 937,1681
  - couch: `phoneCushion` 1160,842,285; `couchSeam` 1103,848
  - wall: `rect` 830,494
  - door: `doorJamb` 1357,957; `doorHinge` 563,957
- **door/close**: `himDoorway` 1142,459,1515; `doorHinge` 360,1760
- **between/two**:
  - him: `himBetween` 339,375,1035; `himBetweenFeet` 339,2051
  - her: `herBetween` 1143,468,652; `herBetweenFeet` 1143,1485
  - between them: `phoneHeld` 975,625,750 (on the seam, between them: turn the screen to him); `handsMeet` 960,820,790; `bagHeld` 596,938,909
  - fridge: `strip` 135,525,498 (visible beside his head); `stripLast` 137,558
  - wall and evidence: `rect` 1059,426; `rectEdge` 960,426; `nail` 1059,328; `mugHis` 1002,568; `mugHers` 1145,568
  - couch and counter: `couchSeam` 1583,1038; `phoneCushion` 1683,1028; `salt` 698,771
- **between/her**: `herBetween` 1150,560,1462; `phoneHeld` 713,978,1900; `rect` 1025,453; `rectEdge` 853,453; `nail` 1025,282
- **between/him**: `himBetween` 1230,434,1800; `doorHinge` 510,890; `jacket` 942,652; `bareHook` 736,445
- **mug/insert**: `mugHis` 598,630,2128; `mugHers` 1322,630,2128
- **rect/insert**: `rect` 1384,500,1765; `rectEdge` 960,500; `nail` 1384,80
- **hands/insert**: `handsMeet` 960,649,2588; `phoneHeld` 1006,80

`V.doorEdge(open, y, shot)` gives the door leaf's free edge at height `y` (default 1.05 m) for an opening `open`. For example, his hand tightening on the door's edge in `door`/`close`.

## Helpers

- `SETS.living.pan(g, x, y, pxPerMetre, {tod, lv, handle, squash, food})`: the pan with the half-eaten tomato pasta, centred at a screen point. `handle` is the screen angle the handle points (default left); `squash` is the rim's ellipse ratio (0.34). Q06: in his hand at his chest, between the body and the hands.
- `SETS.living.makeupBag(g, x, y, pxPerMetre, {tod, lv, rot})`: B3's floral bag with the broken zip, centred at a screen point; 0.22 m wide.
- `SETS.living.levelAt(tod, x, y, z)`: the set's light level (RGB multipliers) at a world point, to tint paper props to match.
- `SETS.living.debug = true`: `front()` marks every anchor and the split line (for checking choreography; never in a render).
- `back()` also writes the light sources into the bloom buffer: the bulb by night, and the window by day (softly).

## Costs

Measured with `out/living_perf.js` and `out/living_cold.js` (headless, no GPU):

- **Per frame, once cached:** the set itself costs 1.4–3.5 ms for every view (two layer blits). The door views cost 6–7 ms (the leaf is drawn live), and `blue` blends cost 3.5 ms. The whole frame in `tools/set.js` is 37–62 ms, almost all of it the engine's finish (grain, fibre, halation, vignette).
- **First frame of a view and time of day** (building its layers): 0.4–1.4 s (room 1.2 s, between 1.4 s, inserts 0.4–0.9 s), and 2.2 s for a `blue` blend (two layers).
- **The photo-booth strip** is sculpted once per page: about 6.3 s (eight `GG.head` sculptures), on the first view that shows the fridge.
- **Cache:** each layer is one full-frame canvas (8 MB). A view uses 1–2 layers per time of day, well inside the engine's 72-frame budget. Keys start with `living|`.

## Caveats and what is weak

- **Pushes.** The layers are 1920×1080 bitmaps, so a `c.camera` push beyond about 1.15× softens them. Cut to a tighter shot instead: `counter/close`, `couch/close`, `fridge/insert`. Q11's slow push toward the strip in `room` should stay under about 1.2×, or end on `fridge`.
- **Changes from the style frames.** One room had to serve B2, B3 and C's matching cameras, so:
  - The window is on the right wall. It shows in `room` (a narrow, foreshortened glimpse of the city), at the edge of `couch`, and through the door. The counter view has no window behind him (B2 had one); its empty half carries the pale rectangle, the mugs and the streetlight's cold patch instead.
  - In `between` the fridge is behind *him*, not behind her as in B3. The strip stays visible beside his head.
- **The counter view** is wider than B2: his head is about 145 px at 631 px/m. `shot: 'close'` gives B2's scale.
- **Weak spots:**
  - The night streetlight is a soft rectangle, not slats.
  - The couch's arms read blocky in `couch/main`.
  - At night the fridge sits outside the beam: aubergine, with the strip lit only by the lamp's spill (readable in the insert, dim in the wide shots).
  - The mugs are simple cylinders.
  - The front wall is bare apart from the door, the hooks and the switch.
- **Not drawn by the set:** the characters' contact shadows on the floor and wall, the phone's smooth light on surfaces (gloss belongs to `PHONE` and the sequence), and anything in their hands.
- **Reverse shots.** `door`/`inside` and `between`/`him` look at the front wall; nothing on the back wall is drawn there. There, the night `light` source is behind the camera, so use its `dir`.
- **Rules kept:**
  - Deterministic: no `Math.random`, no `Date`.
  - Every lit paper colour is clamped between ink `#11141E` and paper `#ECE3D0`.
  - The only brighter colour is the bulb's `#FFE2AE` (Look B's), inside the shade at night.
  - Pure white `#FFFFFF` and pure black `#000000` never appear: they stay the phone's.
