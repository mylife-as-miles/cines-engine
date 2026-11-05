# SETS API: kitchen.js

`SETS.kitchen` (`film/sets/kitchen.js`): the kitchen, the hall and the breakfast table. It serves Q02, Q04 and Q09, and the flash cuts of Q08, Q11 and Q12, which are `FILM.drawShot('Q02', …)` of the counter.

The `counter` view is a port of style frame C1 (`src/C1_counter.html`). The phone stands charging beside the chrome kettle against the garden window, and its black glass holds the hall: the front door blazing amber, the bag by the door, the stairs. In `frame: 'c1'` it reproduces C1.

## The house

- The kitchen is at the back. The garden window faces west / north-west. It is cool in the morning, with the garden still in the house's shadow, and the sun comes round to it in the afternoon (Q09).
- The hall runs from the kitchen to the east-facing front door, which blazes in the morning:
  - the passage on the left, with a long mirror on its wall;
  - the stairs on the right, rising toward the front to a landing window above the door;
  - the bag on the floor by the passage wall, its outside pocket open and empty.
- The kitchen-diner's second garden window looks onto the breakfast table. A side window on its left lets the higher sun in across the table (Q04).

## Use

```js
const v = SETS.kitchen.views.counter, s = { tod: 'morning', screen: 'charging' };
v.back(c, t, s);     // everything behind the characters (cached where static)
// ... characters (RIG) here, rimmed from v.light ...
v.front(c, t, s);    // the pane and everything in front of them
```

- `t` is any running clock in seconds (sequence-local is fine). Dust, steam, the pulse, the shiver and the falling cereal run on it.
- Every view draws in frame coordinates (1920x1080). Every cached layer carries a 32 px margin, so `c.camera()` pushes (zoom ≥ 1) and handheld drift never show an edge.
- Static layers are cached under `kitchen:` keys. A view costs about 0.2 to 2 ms of its own work per frame. Medians on the headless machine are 10 to 40 ms for the whole frame, finish included.
- Characters that stand behind something are drawn between `back()` and `front()`, and `front()` draws what is in front of them. For example, the breakfast table is drawn in `front()` of the `table` view, in front of Emily and Daniel.

---

## `counter`: the phone and the kettle against the garden window (C1)

This is the film's key object. It serves:

- Q02 9–30: the cable plugged in, the screen waking, the chime, his face in the kettle, the climb in the black glass, the screen sleeping to black.
- Q04 56–66: the front door closing in the black glass.
- Q09 0–12: the afternoon, the screen black, dust in the sun.
- The flash cuts: Q08 ~22 s and Q12 ~27 s of Q02.

**State**

| key | values | what |
| --- | --- | --- |
| `tod` | `'morning'` (default), `'afternoon'` | **Morning** is C1: the garden in the house's shadow, the hall blazing in the glass. **Afternoon** is Q09: the sun come round behind the garden. The sky is bleached warm, the crowns and fence are backlit with light between the boards, and a warm patch of window light lies across the oak, fading toward the lens. The phone and kettle cast long soft shadows toward us. The hall in the glass is dim and cool (the front door is in shade now). `front()` adds a faint shaft with dust turning in it. |
| `frame` | `'c1'` (default), `'wide'`, `'tight'` | **c1** is the style frame exactly. **wide** is a slightly wider lens (k 0.86): more oak at the bottom for the hand and the cable, and the window's right reveal at the edge. **tight** is close on the phone (k 1.5), the kettle half in frame on the right. The anchors move with the frame: `v.anchorsFor(frame)`. |
| `screen` | `'charging'` (default), `'wake'`, `'off'`, `'asleep'`, `'pulse'` | **charging** is C1: the 7% and the battery glyph, its fill and bolt green, over the hall's reflection. **wake** lights the screen with `wake` 0..1: 0 is black, then the backlight lifts the black a touch, then the 7% and the outline arrive (0.08–0.3), and the green bolt pops in (0.32–0.5) with a small overshoot. Pair it with the `chime` cue at about `wake` 0.35. **off** is black glass with the reflection only. **asleep** is black glass; with `pulse` > 0 the green charging glyph breathes in it (about 0.42 Hz). **pulse** (alias `'flash'`) is asleep with `pulse` 1: the flash variant, the green charging symbol pulsing in the black glass, "green and peaceful". The green also lies faintly on the oak under the phone and glints in the kettle's flank whenever the glyph is lit. |
| `wake` | 0..1 | Progress of `'wake'`. |
| `pulse` | 0..1 | Strength of the breathing green glyph in `'asleep'`. `'pulse'` defaults it to 1. |
| `cable` | `'plugged'` (default), `'loose'` | **loose**: the cable lies on the oak in easy curves, its plug pointing at the phone (before he plugs it in). |
| `plug` | `[x, y]` | The plug held by the hand, in frame px: the cable runs from its far end to this point. Use it while the hand carries the plug to the port. Also `plugAngle` (radians, default `-PI/2`, pointing up). When the plug reaches `anchors.port`, switch to `cable: 'plugged'`. |
| `bag` | true (default), false | The bag by the front door, in the glass. It is gone after the sweep (Q04 end, Q09). |
| `door` | 0..1 | The front door in the glass: 0 shut (C1), 1 swung in. When it is open, the street blazes white in the doorway and its light runs down the passage. Q04 56–66: animate it from about 0.6 to 0 (closing). |
| `climber` | 0..1 | A stand-in for C1's Daniel on the stairs, back turned (the C1 silhouette with a two-phase step on fours), from the foot of the stairs (0) to the landing (1). C1's frame is `climber` 0.17. He leaves the glass's top edge at about 0.75. `climbT` is the clock for his step (default 0). Prefer RIG through `inGlass`. |
| `inGlass` | `fn(g, cam)` | Draws the sequence's own figures into the hall before it is laid into the glass. `g` is in the hall render's pixel space (536x1160, scaled). `cam` is the hall camera (`v.hallCam`, an `LC.camera` in hall metres: x toward the stairs, y up, z toward the front door at 9.2). For example, `RIG.draw(g, 'daniel', { at: cam.p(0.64, 0.8*(z-4.4)+0.52, z).slice(0,2), scale: cam.k(z), view: 'back', body: 'climb', ... }, { light: { x: 268, y: -300, color: '#F6CD92' } })`. It is mirrored, crushed and screened into the glass with the rest. A black mirror shows only what is lit, so draw figures dark with a warm rim (C1). |
| `dust` | 0..1 | Afternoon only: the strength of the shaft and its motes. Default 1. |

**Anchors** (frame px; `v.anchors` is `anchorsFor('c1')`):

- `phone` [785,452]: the screen's centre.
- `screen`: the glass's four corners (tl, tr, br, bl).
- `port` [783,739]: where the plug goes.
- `plugLoose` [700,872].
- `cableEnd` [-77,963]: the cable's run off frame.
- `kettle` [1404,500]; `kettleBody` [[1166,292],[1642,708]].
- `worktopY` 728.
- `handIn` [420,1120]: where a hand enters.
- `pxPerM`: `{ phone: 3770, kettle: 1890 }`. The phone stands close to the lens, the kettle back by the glass. A hand at the phone is about 0.19 m × 3770 = 720 px long.
- `wide`: phone [770,373], port [768,619], pxPerM phone 3242.
- `tight`: phone [830,560], port [827,991], pxPerM phone 5655.

**Light**

- `v.light` = `{x: 960, y: 140, color: '#D9E3DF'}`: the garden window behind the phone, cool and soft. Rim hands from above and behind.
- `v.lightFor({tod: 'afternoon'})` = `{x: -260, y: -220, color: '#FFD9A0'}`: the low sun from the upper left.

```js
// Q02 9-18: the hand plugs the cable in; the screen wakes with the chime
const v = SETS.kitchen.views.counter, A = v.anchorsFor('wide');
const plugged = lt > 12.2, s = { frame: 'wide', screen: plugged ? 'wake' : 'off', wake: FILM.seg(lt, 12.2, 14.6),
  cable: plugged ? 'plugged' : undefined, plug: plugged ? undefined : FILM.key(lt, [[10, A.plugLoose], [12.2, A.port]]) };
v.back(c, lt, s); RIG.hand(c.g, 'daniel', { ... at: s.plug || A.port ... }, { light: v.light }); v.front(c, lt, s);
// Q12 30-31.5: the quick flash (the only colour in the ending), drawn by Q02 itself:  c.post = FILM.drawShot(c, 'Q02', 27);
// ...for which Q02 at ~27 s should draw  v.back(c, t, { screen: 'pulse', bag: true })
```

---

## `hall`: the front door from inside, blazing; the bag by it; the door opened with an elbow

Serves Q02 0–6 (Daniel sets the bag down) and Q04 48–56 (the sweep, the door opened with his elbow, its glass blazing). The camera is in the passage, looking down it at the door:

- The door: two frosted glazed panels and a four-pane fanlight blazing amber. Light leaks round the leaf, and two long patches of light lie on the boards.
- The long mirror on the passage wall (left).
- The stairs and banister rising on the right toward the landing window.
- Dust turning in the shafts (`front()`).

Anyone standing in the passage is a silhouette against the door.

**State**

- `door` 0..1: hinged on the left, it swings in toward us. At 1 it is about 86°. Open, the doorway is the street burnt white by the sun, a broad wash of its light runs down the passage floor, and the leaf's edge catches the light. Animate it on ones (the elbow pushes).
- `bag` true / false.

**Anchors**

- `door` [998,530] and `doorGlass` [999,412]: the panels.
- `handle` [1069,531]: the lever, shut. `v.handleAt(door)` gives it at any opening; the elbow goes there.
- `bagSpot` [954,991]: the bag's foot. `bagTop` [954,837].
- `standAt` [1029,957]: a mark in the passage just short of the bag. `pxPerM` 367 at that mark.
- `floorAt(z)` and `pxPerMAt(z)`: any depth along the passage (hall metres; the door is z 9.2).
- `mirror` [784,577]. `v.cam`: the view's `LC.camera` (hall metres).

**Light**: `{x: 945, y: 330, color: '#F6D7A0'}`, the door's glass dead ahead. Rim against it.

```js
const v = SETS.kitchen.views.hall, s = { door: FILM.seg(lt, 52.4, 53.4, 'outCubic'), bag: false };
v.back(c, lt, s); RIG.draw(c.g, 'daniel', { at: v.anchors.standAt, scale: v.anchors.pxPerM, view: 'back', ... }, { light: v.light }); v.front(c, lt, s);
```

---

## `pocket`: close on the bag, its outside pocket open and empty

Serves Q02 0–9: "Close on the bag", and "Not today": the phone in his hand comes down toward the pocket, hesitates and goes back up.

- A low camera on the bag in true perspective (the satchel of C1: flap, strap and buckle, carry handle). The slip pocket's mouth gapes: a dark slot under a lit lip, and nothing in it.
- The door blazes behind, out of focus, its shaft falling past the bag, with the long patch of light on the boards under it.
- Dust turns in the light (`front()`).

**State**: none.

**Anchors**

- `pocket` [810,845]: the pocket's mouth.
- `hover` [803,672]: about 0.15 m above it. The phone hesitates here; its black glass would catch the door's glow.
- `bag` [812,1064].
- `pxPerM` 1075.
- `handFrom` [918,-60]: the hand comes down from above.

**Light**: `{x: 1500, y: 160, color: '#F6D7A0'}`, the door's glass upper right, behind the bag.

---

## `table`: the breakfast table through the kitchen window, from the garden (Q04, the warmest image)

**What it shows**

- The camera is outside in the garden's morning shade. The window is white timber casements in red-brown brick (also in shade), with a slim stone sill.
- Inside, the room is in cool shade. The sun, higher now, comes in by a side window on the left. It lays the window's own shape warm and soft on the back wall behind Emily's place, with its cross-bars' shadow in it, and lies across the far half of the table. A faint shaft hangs in the air.
- Furniture: a dresser with plates; the hall doorway glowing warm (the front door's morning down the passage); a pendant (off); the wall clock at 7:58, small; Emily's chair with its booster cushion; an empty chair pulled out at the right end.
- On the table: Emily's plate with the toast, a bowl, her glass of milk, the steel travel mug, the cereal box.
- The glass gives back the garden, C1's own garden mirrored: the tall crowns, the fence, the young tree with the swing, the sky. It shows most where the room behind is dark (the upper glass) and least over the sunlit table. Glare streaks, dust, and a small fingers' smudge at her height.
- Wide framing only: a climbing rose's leaves, out of focus, at the upper left. We are looking in from the garden.

`back()` draws the room. `front()` draws, in order:

1. the table and the breakfast things (in front of Emily and Daniel);
2. the garden's reflection;
3. glare, dust and the smudge;
4. the frame and the brick.

**State**

| key | values | what |
| --- | --- | --- |
| `frame` | `'wide'` (default), `'close'` | **wide**: the whole window, an establishing shot (Q04 0–6). **close**: the central light, Emily and Daniel at medium size, the mullions at the frame's edges, the sun's window shape behind her head like a halo (A018, the collar). |
| `crustCut` | bool | Her toast with or without its crust (it is small here; see `plate`). |
| `mug` | true (default), false | The travel mug on the table. |
| `cereal` | true (default), false | The cereal box. |
| `reflect` | 0..1 | Strength of the garden in the glass. Default 0.36. |

**Anchors** (`anchorsFor('wide' | 'close')`; `v.anchors` is wide)

| | wide | close |
| --- | --- | --- |
| `emilySeat`: her seat (pass as RIG `at` with `body: 'sit', seat: 0.6`) | [859,815] | [799,957] |
| `emilyHead` | [859,640] | [800,676] |
| `emilyPxPerM` | 337 | 538 |
| `danielFeet`: his feet behind the table, hidden (pass as RIG `at`) | [1062,995] | [1121,1236] |
| `danielCollar` | [1062,514] | [1117,485] |
| `danielPxPerM` | 319 | 495 |
| `tableTopY` | 782 | 909 |

Also `plate`, `bowl`, `milk` and `mug` on the table; `glass` (the window's corners); `centreLight` (the central casement's box); and `at(x, y, z)` / `pxPerMAt(x, y, z)` for any point in kitchen metres (x right as seen from the garden, y up from the floor, z into the house; the glass is z 0, the table z 0.85–1.75, Emily's chair z 2.1).

**Light**: `{x: -420, y: 260, color: '#EBC68D'}`, the sun through the side window, off frame left. Rim Emily and Daniel on their left, warm, with `back` about 0.3.

```js
const v = SETS.kitchen.views.table, s = { frame: 'close', crustCut: true }, A = v.anchorsFor('close'), L = { ...v.light, back: 0.3 };
v.back(c, lt, s);
const d = RIG.draw(c.g, 'daniel', { at: A.danielFeet, scale: A.danielPxPerM, view: 'three', facing: -1, lean: 0.95, crouch: 0.12, collar: 'crooked', outfit: 'office' }, { light: L });
RIG.draw(c.g, 'emily', { at: A.emilySeat, scale: A.emilyPxPerM, view: 'three', facing: 1, body: 'sit', seat: 0.6, armR: { to: d.collar } }, { light: L });
v.front(c, lt, s);
```

---

## Close views (Q04)

All are lit by the breakfast light: the sun from the side window, warm, from frame left (except the mug, which stands at C1's counter).

### `plate`: the plate, the toast and its crust

- The table's oak, seen from above, with the sun's long warm slant across it.
- The plate, and a slice of toast with its domed top crust.
- In the near left, Emily's glass of milk, big and out of focus (`front()`): its milk white, its clear rim catching the light.

**State**: `crust` 0..1.

- 0: whole.
- 0..0.78: the knife's cut runs left to right along the line.
- 0.78..1: the crust strip slides away from the slice.

The toast is drawn live, so animate `crust` on ones with the knife.

**Anchors**

- `cutFrom` [712,269] → `cutTo` [1124,293]: the knife's path.
- `plate` [904,384].
- `pxPerM` 3247.

### `pour`: the cereal pour, through the glass milk bottle

- The bowl on the table, the back wall with the sun's slant.
- Flakes falling from above the frame (the box is out of frame) and piling in the bowl.
- The milk bottle in the near right, out of focus (`front()`): milk to its shoulder, the clear neck.

**State**

- `pour` 0..1: the stream's density.
- `fill` 0..1: how full the bowl is.

**Anchors**: `bowl` [880,690], `streamTop` [860,-60], `bottle` [1600,600].

### `mug`: the travel mug, capped

- The brushed-steel travel mug, gently tapered with a rubber grip band, at the counter by the garden window (C1's light). The garden is out of focus behind.
- The black lid has its sip slot and slider.

**State**: `cap` 0..1.

- 0: the lid is held up and off, tilted, and steam rises from the open mug.
- 0.3..0.8: it comes down and levels.
- 0.6..1: it turns on (its grip ridges travel).

**Anchors**: `mug` [900,600], `lid` [900,272], `lidOff` [900,82], `pxPerM` 2600. The hand holds the lid.

### `clock`: the wall clock's glass face at 7:58

- Kept small, as asked: the clock on the back wall, the sun's window shape beside it, the dresser's top shelf below.
- Its glass holds a soft bright band (the garden window) and a bevel.

**State**

- `time`: hours as a decimal. Default 7 + 58/60.
- `sec`: the second hand's start. It ticks on with `t`, one second per second.

**Anchors**: `clock` [826,456], `radius` 180.

### `kettle`: the kettle's chrome holding the room

- C1's kettle, close and big, with its knob, lid seam, handle, spout and base, the garden behind.
- Its chrome is environment-mapped from the breakfast room behind the lens: the sun's window shape on the back wall, the warm hall doorway, the table's warm top, the garden window behind the kettle.

Serves Q02 18–24 ("his face distorted in the kettle's chrome") and Q04 6–14.

`v.reflect(c, s, fn)` draws a figure into the chrome. `fn(g, cam)` draws it as a camera at the kettle would see the room behind the lens:

- `g` is a 960x540 canvas with a 90° view.
- `cam = { w, h, cx, cy, f }`. The centre is straight back at the viewer: a face looking at the kettle, at `[cam.cx, cam.cy]`.

It is warped onto the body (a precomputed reflection map, at half resolution) and clipped. The face counts as near, not at infinity: down the body's upright lower part each row also looks a little higher or lower by its own height, so the whole face lands in the chrome, narrow and tall, instead of one line of it smeared down. Call it between `back()` and `front()`. `front()` adds the chrome's two hot highlights.

**Anchors**: `face` [1060,640] (where the straight-back direction, `[cam.cx, cam.cy]`, lands), `bodyBox` [590,170,1530,960].

```js
const v = SETS.kitchen.views.kettle; v.back(c, lt, {});
v.reflect(c, {}, (g, cam) => RIG.face(g, 'daniel', { at: [cam.cx, cam.cy + 40], size: 380, view: 'front', face: 'tired', outfit: 'night' }, { light: { x: cam.cx - 400, y: cam.cy - 300, color: '#DCE8E4' } }));
v.front(c, lt, {});
```

---

## Demos (`node tools/set.js kitchen 1` → `out/set_kitchen.png`)

**Counter**

1. C1 (charging, the climber at 0.17).
2. Wide: the cable plugged, the screen waking.
3. Tight: asleep, the empty stairs and the bag.
4. Q04 end: the door closing, no bag.
5. Afternoon.
6. The flash (the green pulse).
7. Wide: before, the cable loose.

**Hall and pocket**

8. The hall.
9. The hall: the door opening.
10. The pocket.

**Table and close views**

11. The table, wide (with RIG's Emily and Daniel).
12. The plate.
13. The pour.
14. The mug.
15. The clock.
16. The kettle (a RIG face in the chrome).
17. The table, close.

Times on the sheet are 9 to 55 ms per frame. The demos with RIG figures include the figures' own cost.

## Not fully right yet

- **`counter` `'wake'`.** It has no full-screen charging animation, by design: it is C1's lock screen arriving. If the sequence wants a bigger moment, the green bolt's pop at `wake` 0.32–0.5 is the beat.
- **The `climber` stand-in.** It is C1's silhouette with a crude two-phase step. RIG's `climb` through `inGlass` will be better.
- **The afternoon counter's reflection.** The dim hall is a choice: "screen black". If Q09 wants the reflection lighter, it needs a hall render with the kitchen's afternoon light in it, which is not built.
- **`table` wide.** The window frame takes a lot of the frame. `close` is the stronger image.
- **The mug's steel.** It still shows broad vertical bands (a true cylinder reflects that way).
- **The kettle's warp.** It is approximate (a direction map plus a height term for a near face) and at half resolution: a face reads as distorted, narrow and tall, its edges a little stepped. That is fine for "distorted".
