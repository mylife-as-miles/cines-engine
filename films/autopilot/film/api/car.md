# SETS API: car.js

`SETS.car` (`film/sets/car.js`): Daniel's car. A small, ordinary five-door family hatchback (about 4.2 m long, Golf-sized) in muted dark teal-grey (`#2A3B3E`, highlights `#506A69`), with privacy-tinted rear glass and a dark interior. It is English: right-hand drive (the driver sits on the right; Emily's child seat is behind him, on the right rear), with UK plates (white at the front, yellow at the back, `HN17 WKS`).

The set has two parts:

- `exterior(g, opts)`: the car seen from outside. Other sets (the driveway, the car parks, the nursery) and the sequences use it. It is a small 3D model drawn through `LC.camera`, so it sits in true perspective in any host set.
- `views`: the interior and close views (the driver's POV with the rear-view mirror, the dashboard, and the rest). They are documented below the exterior.

**Restraint, built in.** Nothing in this set shows the back seat, except the Q05 mirror states that ask for it explicitly. From outside, the rear glass only ever reflects. An open rear door shows a dark void. The front glass may show a hint of the front headrests and the wheel, and nothing behind them. It shows none of that at dusk or at night.

---

## `SETS.car.exterior(g, opts)` → `info`

This draws the whole car (ground shadow, wheels, body, glass, lamps, plates, mirrors, rim light) into `g`, which is usually `c.g`. Pass `em: c.em` to make lit lamps bloom.

### Placing it

There are two ways to place the car. Use the first one inside a set that is laid out with `LC.camera`.

**1. In your own camera (recommended for sets):**

```js
const cam = LC.camera({ x: 0, y: 1.6, z: -2, pitch: -0.12, f: 1500, cx: 960, cy: 500 });   // your set's camera
SETS.car.exterior(c.g, { cam, at: [-1.2, 0, 10], heading: Math.PI / 2, tod: 'morning', em: c.em, t });
```

- `cam`: an `LC.camera`, in your world's metres (x right, y up, z away from the camera).
- `at`: the world point on the ground under the middle of the car.
- `heading` (radians): which way the nose points.
  - `0`: away from the camera (we see the tail).
  - `PI/2`: to screen right (we see the driver's flank, the right side).
  - `PI`: toward the camera.
  - `-PI/2`: to screen left (we see the passenger flank).
  - In general the nose points along `(sin h, 0, cos h)` in world space.

**2. On its own (a framing preset):**

```js
SETS.car.exterior(c.g, { view: 'rear3q', side: 'right', x: 980, y: 900, scale: 320, tod: 'evening' });
```

- `view`: `'side'`, `'front3q'`, `'rear3q'`, `'rear'`, `'front'`, `'front3qWide'` or `'rear3qWide'`.
- `side`: `'right'` (the driver's flank toward us, the default) or `'left'`.
- `x, y`: the screen point under the middle of the car.
- `scale`: px per metre at the car.
- `dist` (m): camera distance, default 9. Smaller gives stronger perspective; about 4.5 to 5 is a close shot.
- `eye` (m): camera height, default 1.3.
- `look` (m): the height the camera aims at, default 0.7.
- `heading` overrides the preset.

### State

| opt | default | what |
| --- | --- | --- |
| `tod` | `'morning'` | `dawn`, `morning`, `noon`, `afternoon`, `evening`, `dusk`, `night`. Sets the paint values (three per surface, plus the sky laid along the roof and bonnet), the rim colour, the default reflection and the default sun. |
| `sun` | per tod | A world direction toward the sun, e.g. `[-0.6, 0.4, 0.7]`. It drives which faces are lit, where the cast shadow falls, and the rim. **Pass your set's sun** so the car agrees with your light. |
| `light` | from `sun` | `{x, y, color}`: a screen point for the rim, overriding the sun's. The rim is drawn only when the light is in front of the camera (contre-jour), or when `light` is given. |
| `rim` | 1 | Rim strength multiplier. 0 turns the rim off. |
| `doors` | all shut | `{ driver, rear, passenger, rearLeft }`, each 0..1 (1 = about 68 degrees open). `driver` is the front right door. `rear` is the right rear door: Emily's. An open door shows its inner trim and its free edge catching the light. The aperture behind it is a dark void. |
| `indicators` | 0 | Indicator light level 0..1 (all four corners and the mirror repeaters). Use `SETS.car.blink(t, t0, n)` for the lock flash. |
| `brake`, `headlights` | 0 | Lamp levels 0..1. |
| `reflect` | per tod | What all the glass reflects. A preset name (`'sky'`, `'noon'`, `'copper'`, `'dusk'`, `'building'` (an office facade), `'house'` (a brick house front), `'trees'`, `'black'`), a function `(g, win) => {}`, or a canvas or image (drawn mirrored). See *Reflections*. |
| `glass` | none | Per-pane overrides: `{ windscreen, front, rear, tailgate }`, each a preset, function or canvas. `rear` covers the rear door glass and the quarter glass. |
| `reflectStrength` | 0.82 rear / 0.66 front | How much the glass gives back. |
| `interior` | true | Lets the front glass show a hint of the front headrests and the wheel. Never anything behind them, and never at dusk or night. |
| `heat` | 0 | Heat shimmer rising off the roof, 0..1. Needs `t`. |
| `t` | none | Time in seconds, for `heat` and for reflections that move. |
| `steer` | 0 | Front wheel angle (radians). |
| `wheelRot` | 0 | Spoke rotation (radians), for a car that is moving. |
| `paint` | per tod | Override the paint values `{ deep, dark, mid, light, sheen, top }`. Use it for other cars in a car park; the demo has a red and a silver one. Daniel's car is always the default. |
| `shadow`, `shadowAlpha`, `shadowColor` | on, 0.62, `#081011` | The contact and cast shadow on the ground. |
| `alpha` | 1 | Draw the whole car faded (for a reflection of the car in a shop window, for example). |
| `only`, `skip` | none | Arrays of parts: `'shadow'`, `'wheels'`, `'body'`, `'glass'`, `'mirrors'`, `'rim'`, `'doorFR'`, `'doorRR'`, `'doorFL'`, `'doorRL'`. Use them to split the car around a character: draw `skip: ['doorRR']` behind Daniel, then `only: ['doorRR']` in front of him. |
| `em` | none | The emissive buffer (`c.em`). Indicators, brake lights and headlights bloom into it. |

### Reflections

A reflection is `fn(g, win)`. It is called with the canvas already clipped to one pane and set to screen-blend, so you draw what the glass would give back. `win` holds:

- `name`: the pane.
  - `'windscreen'`, `'tailgate'`.
  - `'winF'` / `'winR'` / `'winQ'` on the right flank: the front door, the rear door, the quarter glass.
  - `'winFL'` / `'winRL'` / `'winQL'` on the left.
- `glass`: `'windscreen'`, `'front'`, `'rear'` or `'tailgate'`.
- `privacy`: true for the rear glass.
- `pane`: the pane's own screen box `{x, y, w, h}`.
- `box`: the shared frame for that flank. Lay your picture out in `box` so a reflected world runs on across the panes.
- `yaw`: the glass's facing in radians. Slide your picture by it, so a swinging door sweeps its reflection across the glass.
- `hz`: where the horizon sits, as a fraction of the box height.
- `quad`, `path`, `ppm`, `T` (the tod palette), `t`, `door`.

Wrap a preset to add something to one pane:

```js
// Q11: the dark rear passenger window holds Daniel's own reflection
const mine = (g, w) => { SETS.car.reflect.dusk(g, w); if (w.name === 'winR') { /* RIG.draw(g, 'daniel', ...) inside w.pane, mirrored */ } };
SETS.car.exterior(c.g, { cam, at, heading, tod: 'dusk', reflect: mine });
```

`SETS.car.reflectCanvas(canvas)` makes a reflection from any canvas: it is drawn mirrored and slid by `yaw`.

### Return value `info`

- `info.points`: screen anchors for the choreography.
  - Handles: `handleFR`, `handleRR` (Emily's door), `handleFL`, `handleRL`.
  - Door centres: `doorFR`, `doorRR`, `doorFL`, `doorRL`.
  - Each visible pane's centre: `winR` and so on. `info.windows` has each pane's full `win`.
  - Mirrors and lamps: `mirrorR` / `mirrorL`, `indFR`, `indRR`, `indFL`, `indRL`.
  - Plates: `plateF`, `plateR`.
  - Wheels: `wheelFR`, `wheelRR`, `wheelFL`, `wheelRL`.
  - Body: `roof`, `centre`, `ground`, `tailgate`, `seatDriver`.
- `info.box`: the car's screen box.
- `info.path`: its silhouette (Path2D).
- `info.ppm`: px per metre at the car.
- `info.near`: `'right'`, `'left'` or `'none'`.
- `info.p(carPoint, door?)`: projects any point in car space to the screen. Car space is metres: x the car's right, y up, z forward, origin on the ground under the middle. `door` is a door name, so the point moves with that door.

### Helpers

- `SETS.car.blink(t, t0, n = 2)`: the indicators' light level for a lock or unlock confirmation that starts at `t0` (the beep). It gives two short amber flashes, falling to 0. Q07: `indicators: SETS.car.blink(lt, 13.4)`. Q12: `SETS.car.blink(lt, 7.6)`.
- `SETS.car.shimmer(g, box, t, { amp, rise, freq, row })`: heat refraction over a box (in `g`'s coordinates). It works by sliding thin rows of whatever is already drawn there. Use it for heat off the roof, or the wave of trapped heat pouring out of the open door in Q10. It costs a couple of milliseconds.
- `SETS.car.tod`: the palettes. `SETS.car.reflect`: the reflection presets.
- `SETS.car.lib.roadBehind(g, x, y, w, h, { tod, travel })`: the road behind as any rear-view mirror shows it. It is a residential street, mirror-imaged (the kerb on the left), receding as `travel` grows. In the evening the low sun blazes in it. Use it for any mirror in your own set, so every mirror in the film agrees and only ever shows the road. Also exported:
  - `SETS.car.lib.lozenge(quad, grow)`: the rear-view mirror's outline;
  - `SETS.car.lib.streetStrip(g, box, travel, tod, o)`: a passing street, motion-blurred, for any side window.

### Cost and caching

A car costs about 5 to 20 ms, depending on how much of the frame it fills. If the car does not change during a shot, draw it once into your own cached layer, together with your set:

```js
c.g.drawImage(c.cache('carpark:eve:cars', g => { /* your set ... */ SETS.car.exterior(g, { cam, at, heading, tod: 'evening' }); }), 0, 0);
```

Call it live only for what moves: indicators, doors, `heat`.

### Recipes

- **Q05, the car baking on the driveway:**
  `{ cam, at, heading, tod: 'morning', heat: 1, t, reflect: 'sky' }`. Pass your sun.
- **Q05, Daniel buckling Emily in (the rear door open, from the side):**
  draw `skip: ['doorRR']` first, then the characters, then `only: ['doorRR']`. Or use the car view `buckle` (below).
- **Q07, BEEP:**
  `{ view: 'rear3q', reflect: 'building', indicators: SETS.car.blink(lt, 13.4) }`. The rear window only reflects the office block and the sky.
- **Q10, every windscreen copper:**
  `tod: 'evening'`, `reflect: 'copper'`. For the open driver's door with heat pouring out, use `doors: { driver: 1 }`, then `SETS.car.shimmer` over the doorway.
- **Q11 and Q12, the nursery:**
  `tod: 'dusk'`. Use `reflect: fn` to put Daniel's reflection in `winR`. For the remote, use `indicators: SETS.car.blink(lt, 7.6)`. For the door, use `doors: { rear: k }`; its aperture is always a dark void.

---

## Views

`SETS.car.views.<name>` has `back(c, t, s)`, `front(c, t, s)`, `anchors` and `light`. Draw characters with RIG between `back` and `front`.

Every view takes `s.tod`. The default is the one the view is used in. Interior views know `morning` (warm white), `noon` (bleached), `evening` (copper) and `dusk`.

### `pov`: Daniel's view, the windscreen and the rear-view mirror (C2's camera)

C2, ported. The morning sun sits in the frit's dot-matrix. The cabin is in its own shade. The mirror is the frame within the frame, and its content is a state.

| state | default | what |
| --- | --- | --- |
| `tilt` | 1 | 0 = the mirror is aimed at the back seat (C2's framing: the child seat behind the driver, the rear window with the house). 1 = aimed through the rear window at the road behind. Between, the mirror turns a few degrees round its ball joint. The cabin slides out to the right and the road framing slides in from the left, through the dark C-pillar trim. **The default is the road**, so every shot after Q05 is safe without asking. |
| `mirror` | `'road'` | `'cabin'` means `tilt: 0`. An explicit `tilt` wins. |
| `inMirror(g, M)` | none | **The hook for Emily.** It is called while the cabin is showing (`tilt < 1`), with `g` already transformed into mirror space and clipped to the glass. Draw her there with RIG, as the mirror shows her: the space is the mirror image, so the car's right is the image's right. Layering: the unlit cabin, then your drawing, then the sun's hard white strip (it lies on her too), then Daniel's headrest (out of focus, near the mirror: it takes half her face when she leans into its shade). |
| `stripOver` | true | `false` draws the strip under your drawing instead of over it. Use it if RIG lights her itself. |
| `strip` | true (morning) | The hard white strip of sun across the back seat at face height. |
| `dash` | 0 | The dashboard waking (the engine starting), 0..1. The binnacle glows under its hood; the radio's light shows low at the left. |
| `vibrate` | 0 | The engine's shiver in the mirror's image, 0..1. Add your own `c.camera` shake for the frame. |
| `travel` | none | Metres travelled. Given, the road behind recedes live. Absent, the road framing is cached and still. |

`M`, passed to `inMirror`:

- `w`, `h`: 1000 × 340, C2's cabin canvas.
- `ppm`: about 900 px per metre at the child seat.
- `strip`: `{ path, yT(x), yB(x), shadeX }`. The strip's Path2D and its top and bottom edges in mirror space. Shade begins at x = 666.
- `light`: the strip's light, coming from the upper left.
- `tilt`, `pan`.
- `toScreen(x, y)`: maps a mirror-space point to the screen.
- `anchors`:
  - `headStrip` [604, 172]: her head upright with the strip across her eyes.
  - `headTurn` [650, 182]: turning away.
  - `headShade` [712, 188]: C2's pose. Leaning into the shade, half her face behind the headrest.
  - `headGone` [846, 196]: wholly behind the headrest.
  - `seat` [740, 336], `rabbit` [604, 262].

`anchors`:

- `mirror`: the glass's quad at tilt 0: `tl` [462, 334], `tr` [1322, 300], `br` [1328, 606], `bl` [468, 590].
- `ball` [898, 292]: where Daniel's hand takes the mirror to tilt it.
- `sun` [588, 244]. `dash`, `binnacle`, `mirrorAnchors`, `mirrorSpace` `{ w, h, roadX }`.

`light`: the sun at [588, 244], `#FFF6E6`.

`front` draws only the light in the air (motes near the sun). A hand on the mirror goes between `back` and `front`.

```js
// Q05 25-37: the strip across her face; 52-58: Daniel tilts the mirror to the traffic; 58-62: ignition
const v = SETS.car.views.pov;
v.back(c, st, { tod: 'morning', tilt: FILM.seg(lt, 52, 58), dash: FILM.seg(lt, 58.4, 59.4), vibrate: lt > 58.4 ? 0.6 : 0,
  inMirror: (g, M) => RIG.draw(g, 'emily', 'mirror', { at: M.anchors.headStrip, ppm: M.ppm, t: FILM.twos(lt) /* ... */ }) });
// RIG's hand on the mirror here
v.front(c, st, { tod: 'morning' });
```

After Q05, use `v.back(c, st, { tod })`. That is the road, always.

### `dash`: the clock in the windscreen (Q07), the dashboard waking (Q05)

The driver's seat looking down at the centre of the dashboard, with the windscreen above it. The clock sits in the dash top. Its digits float in the glass as seven-segment figures, doubled faintly by the glass's two faces.

The reflection reads correctly (as a head-up display does). A truly mirrored "2" would read as a "5".

The road beyond is far out of focus: SETS.roads' street, seen through a quarter-size blur.

- State:
  - `lit` 0..1, default 1: the clock and the binnacle's glow. Use 0 before the ignition.
  - `clock`, default `'8:32'`.
  - `travel`, `beat`: the roads beat seen through the glass, default `'plain'`.
- Anchors: `clock` [960, 464] (the digits in the glass), `display` [960, 788] (the pod), `binnacle`, `vents`.
- Light: the sun upper left.
- `front` is empty.

```js
SETS.car.views.dash.back(c, st, { tod: 'morning', lit: 1, travel: 30 + st * 6 });   // Q07 0-4
```

### `console`: the vents and the radio (Q10)

The centre stack close: two slatted vents, the radio's display under its glass (`98.4 FM`, with a volume bar), the climate knobs and the hazard switch. Evening copper rakes across it from the low sun behind.

- State:
  - `radio` 0..1: the display's brightness. Dim it as he turns it down.
  - `volume` 0..1: the bar.
  - `vents` 0..1: hot air. The air in front of the vents ripples and motes are blown out. Animate a cough with something like `0.9 → 0.3`.
  - `freq`, default `'98.4'`.
- Anchors:
  - `volumeKnob` [1300, 860]: where his hand turns it down.
  - `display` [1000, 600], `vents`, `hazard`.
- `front` lays the windscreen's light, a thumb's smudge and dust on the display's glass.

```js
const s = { tod: 'evening', radio: FILM.key(lt, [[46, 1], [48, 0.45]]), volume: FILM.key(lt, [[46, 0.5], [48, 0.25]]), vents: FILM.key(lt, [[36, 0], [36.4, 1], [38, 0.25]]) };
v.back(c, st, s); /* RIG hand at v.anchors.volumeKnob */ v.front(c, st, s);
```

### `wheel`: the wheel close, two fingers drumming (Q06)

From the driver's seat:

- the rim's upper left (leather, a stitched seam, its top lit), the spoke;
- the instrument cluster beyond, its glass holding the windscreen's light;
- a corner of the bright windscreen.

The sun through the windscreen lies across the rim and the dash. Trees passing overhead break it into flicker and leaf shadows as `travel` advances.

- State: `travel` (m).
- Anchors:
  - `rim10`, `rim11`, `rim12`: points on the rim at 10, 11 and 12 o'clock. The fingers drum at `rim10`.
  - `tangent10`: the rim's direction there.
  - `sleeve` [260, 1000]: where his forearm comes in.
  - `centre`; `ppm` about 1700.
- Light: upper left.

### `driving`: Daniel driving, through the driver's window from outside (Q06; Q10)

The camera travels alongside, on the driver's side, looking into the front door's window. Daniel sits in profile, facing right.

- Behind him: the driver's headrest and seat, the passenger window, and the far side of the street sliding past.
- In front of him: the wheel and the end of the dash.
- On the glass: our side of the street slides across as reflection.
- The rear door's privacy glass beside him only reflects.

`front` lays the glass on him, then the door and body around the window. So draw him whole, and the door hides what is below the window line.

- State:
  - `travel` (m), `tod`.
  - `close` 0..1: a tighter framing on his torso, his arm and the wheel. Use it for the coffee on the sleeve.
  - `window` 0..1: the glass lowered into the door. In Q10 he lowers both front windows; above the lowered glass there is no reflection.
- Anchors (screen points, live after `back`):
  - `head`, `shoulder`, `wheel` (the wheel's centre), `sleeve` (where his forearm rests);
  - `window` (the pane's box), `ppm`;
  - `facing: 'right'`.
- Light: the sun upper left.

```js
const v = SETS.car.views.driving, s = { tod: 'morning', travel: lt * 9, close: 1 };
v.back(c, st, s); const A = v.anchors; RIG.draw(c.g, 'daniel', 'driving', { at: A.head, ppm: A.ppm /* ... */ }); v.front(c, st, s);
```

### `passenger`: the passenger window, scenery sliding past (Q06)

From the passenger seat looking out of the front passenger window, on the kerb side:

- the glass between the headliner, the B-pillar, the A-pillar and the door card;
- the door mirror low in the glass's front corner, giving back only the road behind;
- dust, a smudge, a glare streak on the glass.

What slides past is `s.outside(g, box, s)`. By default it is `SETS.roads.pass`, the street. `SETS.roads.views.passenger` is this view with the nursery's painted wall.

- State: `travel` (m), `outside`.
- Anchors: `window` (the glass's box), `mirror`, `sill`.

### `hotwheel`: the hot steering wheel, through the windscreen from outside (Q05)

From just above the bonnet, looking down through the windscreen at the wheel (right-hand drive: on our left as we face the car). The morning sun comes in over our shoulder: the dash top and the seats take it, and the rim's top burns white. Behind the front seats there is only the dark.

The windscreen gives back the sky and the house behind us across its top. The bonnet in the foreground is out of focus, and heat rises off it.

- State: `heat` 0..1, default 1.
- Anchors (live after `back`): `wheel` (centre), `rimTop` (where his fingers touch and recoil), `rimR`, `ppm`, `handFrom` [1900, 700]. The hand comes in through the open driver's door.

### `buckle`: the rear door, buckling Emily in (Q05, morning only)

The rear door on the driver's side, from beside the car's front, looking back along the flank. The house is reflected in the door's privacy glass.

With the door open (`door: 1`), the glass is a tint you can see through. Behind it: the dark doorway, the child seat's side wing, and RIG's Daniel bent in, with Emily beyond.

As the door swings shut (`door` 1 → 0) its glass sweeps the reflected house across itself. Once it is shut, the glass shows nothing but the house.

- State:
  - `door` 0..1, default 1.
  - `close` 0..1, default 0.6: framing. 0 is the whole flank; 1 is tight on the window.
- Anchors (live after `back`): `doorway`, `seat`, `handle`, `roof`, `ppm`.
- Draw Daniel and Emily between `back` and `front`. `front` draws the door over them.

**After Q05 this view must not be used** (restraint).

```js
// Q05 22-24: CLICK, the harness; CLICK, the door closes on the reflected house
const v = SETS.car.views.buckle, s = { door: FILM.key(lt, [[22.6, 1], [23.6, 0, 'inCubic']]) };
v.back(c, st, s); /* RIG: Daniel stepping back */ v.front(c, st, s);
```

---

## Restraint, per view

- `pov` shows the back seat only when asked (`tilt < 1`). Use that only in Q05, before 58 s.
- `buckle` sees into the rear. Use it only in Q05.
- Every other view, and the exterior's rear glass, only ever shows the road behind or a reflection.

## Demos

Run `node tools/set.js car 1` and see `out/set_car.png`.

- **Exterior** (side both flanks, three-quarters, rear, doors open, close, a host camera, a custom reflection).
- **POV**:
  - the strip, half gone, gone (with a demo-only stand-in Emily ported from C2);
  - the tilt;
  - the road with the engine on;
  - evening.
- **dash** (lit, dark), **console** (vents, dimmed), **wheel**.
- **driving** (medium, close, evening with the window down; a demo-only stand-in Daniel).
- **passenger**, **hotwheel**, **buckle** (open, swinging shut).
