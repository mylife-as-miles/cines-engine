# SETS API: carpark.js

`SETS.carpark` (`film/sets/carpark.js`): the office car park, at 8:32 in the morning (Q07) and at about 5:40 in the evening (Q10).

A business park of blue glass. Daniel's block (**A**) faces east across four rows of bays to a second block (**B**), so every pane in the car park has something to give back:

- the car windows hold the blocks and the sky;
- the blocks hold each other;
- the entrance door holds the car park.

Every pane is a real planar mirror, computed in true perspective (`LC.camera`) over what lies behind it: an office's ceiling lights, or a dark cabin. In the evening every pane is copper, and nothing can be seen through any of it.

**Daniel's car** is drawn by `SETS.car.exterior` (the car set), given this set's camera, his space, the sun, and a reflection of this world for its glass. If the car set is not loaded (or throws), a placeholder with the same proportions is drawn: a small dark teal-grey five-door hatchback. All the other parked cars belong to this set: ordinary English cars (hatch, saloon, estate, SUV) in muted paints, with UK plates. The rear plates are bleached cream, never Emily's yellow.

## Using a view

```js
const v = SETS.carpark.views.space, s = { tod: 'morning', blink: FILM.seg(st, 3.4, 3.5) > 0 ? 1 : 0 };
v.back(c, st, s);                          // sky, block A, the tarmac, the parked cars, and Daniel's car (unless s.car === false)
RIG.draw(c.g, 'daniel', { at: [x, y], scale: k, view: 'three', body: 'walk', phase }, { light: v.light });
v.front(c, st, s);                         // the air, the heat, the pane, the subtitle band's shade
```

- `back(c, t, s)` draws everything behind the characters. `front(c, t, s)` draws what is in front of them.
- `t` is any time in seconds (shot-local is fine). It drives the heat, the creep and other animation.
- `s` is the state. `s.tod` is `'morning'` or `'evening'` where a view has both.
- Views that hold Daniel's car also have `car(c, t, s)`, which draws only the car (cached per state). Use it when he must pass behind the car: call `back` with `{car: false}`, draw Daniel, call `view.car(...)`, then `front`.
- `anchors` are screen points (1920×1080), with `scale` in px per metre at that point, for the choreography.
- `light` `{x, y, color}` is the shot's one motivated light. Pass it to `RIG.draw` as `{light}` so the rims agree.
- **Cameras.** Views are authored for the frame as it is. Use `c.camera({zoom ≥ 1, ...})` for pushes and drift on top. The caches cover exactly the frame (except `arrival`, which has 32% overscan), so do not zoom out below 1.
- **Caches** are keyed `carpark|<view>|...`. The first frame of a shot builds them (0.3 to 0.9 s); later frames are fast.

## Views

### `arrival` (Q07 4–10): through the windscreen, pulling into his usual space

Driver's POV in his stopped car. Block A's glass front fills the windscreen ahead: its ceiling lights inside, and over them the car park, the trees, block B and the sky, each pane a touch out of true. The sun's mirror image burns in the first-floor glass just under the frit, an echo of C2. As he creeps in, the facade grows (it is a plane facing us, scaled exactly). The footpath, the low hedge, the bay lines and his neighbours' bonnets are drawn live with the moving camera.

| state | default | what |
| --- | --- | --- |
| `pull` | 1 | 0..1, the last 2.3 m into the bay; 1 = stopped. |
| `engine` | 0 | 0..1, a fine shiver while it idles. |
| `windscreen` | true | Draws a plain cabin frame: frit, mirror holding only the road behind, pillars, dash. Pass `false` when the car set's driver POV is laid over this view (draw this view's `back`, then the car set's cabin). |

- **Anchors:** `ahead` (the point straight ahead on the facade), `sunGlint` (the sun's reflection), `facadeScale` (px/m on the facade).
- **Light:** the sun's glint, high left.

```js
SETS.carpark.views.arrival.back(c, st, { pull: FILM.seg(st, 0, 4, 'outCubic'), engine: st < 4.5 ? 1 : 0 });
SETS.carpark.views.arrival.front(c, st, {});          // or { windscreen: false } under the car set's cabin
```

### `space` (Q07 10–16 morning; Q10 18–28 evening): his car in its usual space

The rear three-quarter from the driver's side, low, with block A beyond.

- **Morning:** block A is front-lit, its glass holding the sky and the sun's mirror image above the car. His rear window holds only the sky and the blocks: "nobody could see in". His neighbours are quiet grey and dark blue, so his dark car reads.
- **Evening:** the low sun is behind block A, the car is in shade, his rear window is a copper mirror and the paint is rimmed in copper.

| state | default | what |
| --- | --- | --- |
| `tod` | `'morning'` | `'morning'` or `'evening'` |
| `door` | 0 | 0..1, the driver's door. |
| `blink` | 0 | 0..1, the indicators (the locks). Blink it twice: e.g. `blink: (st % 0.6) < 0.3 && st < 1.2 ? 1 : 0` from the beep. Lamps glow and bloom. |
| `car` | true | `false` leaves the car to `view.car(c, t, s)`. |

- **Anchors:**
  - `car` `{x, y, scale, heading, at, depth}`: the screen point under the car's middle, px/m there, its heading (compass radians, `3π/2` = nose to block A) and its world position. This is what `SETS.car.exterior` needs.
  - `driverDoor` `{x, y, scale}`: where he steps out.
  - `walk` `{from, to, scaleFrom, scaleTo}`: from the door toward the camera (the building is behind us).
  - `rearWindow`: the centre of the rear glass.
- **Light:** the sun behind-left (morning); copper from behind the block (evening).

```js
const v = SETS.carpark.views.space, a = v.anchors, u = FILM.seg(st, 1.5, 6);
v.back(c, st, { tod: 'morning', car: false });
RIG.draw(c.g, 'daniel', { at: [lerp(a.walk.from[0], a.walk.to[0], u), lerp(a.walk.from[1], a.walk.to[1], u)], scale: lerp(a.walk.scaleFrom, a.walk.scaleTo, u), view: 'three', facing: -1, body: 'hurry', phase: st * 1.6 }, { light: v.light });
v.car(c, st, { tod: 'morning', blink });                 // the car in front of him while he is beside it
v.front(c, st, { tod: 'morning' });
```

### `crossing` (Q07 16–24): his reflection along the windows of the parked cars

Close, behind the low hedge (out of focus in the foreground: the subtitle band's shade), with a long lens down a row of parked cars. The camera tracks with Daniel. He is only ever seen as a reflection, gliding through the cars' side glass and broken by the pillars and the gaps between cars. Above the roofs: the far side of the car park, the trees, block B, the sun's glare from the top right.

| state | default | what |
| --- | --- | --- |
| `track` | 0 | Metres travelled along the row (the cars slide past; about 1.6 m/s for a hurry). |
| `reflect(g, R)` | none | Draw Daniel into `g` at `R.x, R.y` (his virtual image's feet), `R.scale` px/m, `R.facing` (+1 walking right), `R.light`. Draw him whole: the set keeps only what falls on side glass, tints it, lays it in at the glass's reflectance with the pane's sheen over it. `R` moves with the camera, so he stays put while the cars pass. |
| `offset` | 0 | Nudge (px) of the reflection sideways. |

- **Anchors:** `reflection` `{x, y, scale, facing}` (for `track = 0`; `R` gives the live values).
- **Light:** the sun ahead-right (contre-jour), so the car flanks are in shade and the reflection reads in dark glass.

```js
SETS.carpark.views.crossing.back(c, st, { track: st * 1.6 });
SETS.carpark.views.crossing.front(c, st, { track: st * 1.6, reflect: (g, R) => RIG.draw(g, 'daniel', { at: [R.x, R.y], scale: R.scale, view: 'profile', facing: R.facing, body: 'hurry', phase: FILM.twos(st) * 1.7 }, { light: R.light }) });
```

### `door` (Q07 20–24): the glass door sighs shut behind him

Close on block A's entrance from the footpath. The right-hand leaf swings shut on its hinge. The car park, block B and the sun's glint slide across its glass as it turns (the reflection turns twice as fast as the leaf), so the glint crosses the leaf about a third of the way through the swing. Through the doorway and the glass: the cool lobby (reception desk, lifts, a tall plant, ceiling lights laid on polished stone). The leaves carry frosted manifestation dots at two heights and a steel pull that catches the sun. A tree's shade lies across the paving toward us.

| state | default | what |
| --- | --- | --- |
| `door` | 0 | 1 = open (swung out toward us, about 76°), 0 = shut. "Sighs": ease it with `FILM.ease.settle`. |

- **Anchors:** `daniel` `{from, to, scaleFrom, scaleTo}`: through the doorway, away from us into the lobby (draw him between back and front, so the glass tints him once the door is shut). `hinge`.
- **Light:** the sun behind-left.

```js
const sh = 1 - FILM.seg(st, 1.2, 4.2, FILM.ease.settle);
SETS.carpark.views.door.back(c, st, { door: sh });
RIG.draw(c.g, 'daniel', { ...through the lobby (anchors.daniel)... }, { light: { x: 900, y: -200, color: '#E3E9E3' } });
SETS.carpark.views.door.front(c, st, { door: sh });
```

### `rows` (Q10 18–24): 5:40, down the aisle

The car park in the low evening sun, looking down an aisle. The sun from the left turns the windscreens copper. The cars' long shadows stripe the tarmac, block B blazes copper on the right, and the trees at the aisle's end are rimmed. Daniel's car is in the left row (drawn by the car set). He walks up the aisle, small against the copper.

- **State:** none.
- **Anchors:** `car` (his car, as in `space`), `path` `{from, to, scaleFrom, scaleTo}` (up the aisle to his car).
- **Light:** the low sun, left.

### `heat` (Q10 24–28): the open driver's door, the heat pouring out

From the footpath behind the low hedge (out of focus across the bottom of the frame), looking east along his car's driver's flank. The driver's door stands open toward us, its glass a copper mirror of the low sun behind us. Block B blazes beyond. A dense wave of trapped heat pours out of the doorway and rises over the roof as refraction: the facade's grid wavers through it. The rear of the car recedes to the right and only its side glass shows (copper). The back seat is never in view.

| state | default | what |
| --- | --- | --- |
| `door` | 1 | 0..1, the driver's door. |
| `heat` | 1 | 0..1, the refraction's strength. It refracts whatever is drawn before `front`, including Daniel at the door, a little. |
| `car` | true | As in `space`. |

- **Anchors:** `car`; `daniel` `{x, y, scale}` (at the open door, recoiling: view `threeBack`, `lean` back); `plume` `{x, y, w, h}` (the refraction box).
- **Light:** the low sun behind the camera.

```js
const v = SETS.carpark.views.heat, a = v.anchors.daniel, s = { door: FILM.seg(st, 0, 0.8), heat: FILM.seg(st, 0.4, 1.6) };
v.back(c, st, s); RIG.draw(c.g, 'daniel', { at: [a.x, a.y], scale: a.scale, view: 'threeBack', body: 'stand', lean: -0.35 * FILM.seg(st, 0.6, 1.0, 'outBack') }, { light: v.light }); v.front(c, st, s);
```

## Helpers

`SETS.carpark.car`:

- `danielsCar(c, g, cam, pose, s, L, tod, env, o)`: Daniel's car in this world (it calls `SETS.car.exterior` with `{cam, at, heading, tod, sun, doors: {driver}, indicators, reflect, em}`).
- `anchor(cam, pose)`
- `pose` (his space: `{x: 8.45, z: 12.0, h: 3π/2}` in this set's metres; x east, z north)
- `reflect(cam, pose, L, tod, env)`: a reflection function in the car set's `(g, w)` form, which mirrors this world in each pane.

## Performance (warm frames, including the engine's post)

`arrival` 13–42 ms · `space` 13–26 · `crossing` 59–71 (live cars and the reflection) · `door` 21–32 · `rows` 22 · `heat` 27–40. First frames build caches (0.3–0.9 s).

## Notes

- **Colour script:** morning is a pale hazy sky, blue-tinted glass and warm sun only in reflections. Evening is copper on every pane and lilac in the shadows.
- **Restraint:** from outside, his car's rear glass only reflects (the car set enforces it). No view shows the back seat. The `heat` view keeps the rear of the car turned away.
- Block positions, sun directions and lighting are art-directed per view (shadows from the blocks are not computed). The world stays consistent for reflections.
