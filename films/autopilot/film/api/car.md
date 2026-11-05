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

*In progress; documented here as each one lands.*
