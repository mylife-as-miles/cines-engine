# SETS API: city.js

`SETS.city` (`film/sets/city.js`): the hottest hours (Q09 12–32). Bleached cream-white English streets at noon in a heatwave: terraced brick and render, glass shopfronts, sash windows full of white sky, black railings and bollards, lamp posts with hanging baskets.

The light follows look_c's noon heat:

- Shadows shrink to slits under eaves and awnings, and glare stands in for shade.
- Heat appears only as refraction ripples, in the glass and over the far tarmac.
- Nothing moves but the heat. No wind: the flag, the baskets, the awning and the trees hang still.

Every view is through a pane:

| View | Through |
| --- | --- |
| `street` | a stopped car's windscreen, with the sun pressing into its frit |
| `shopwindow` | a shop window, the street's heat boiling in its reflection |
| `crossing` | an upper sash window, looking down |
| `shelter` | a bus shelter's scratched side panel |
| `stall` | a café window |

The people and the dog come from RIG (`'pedestrian'`, `'stallman'`, `'dog'`). The views give anchors (where and how big). Shots of 3 to 5 s each.

## Using a view

```js
const v = SETS.city.views.shelter, a = v.anchors.dog;
v.back(c, st, {});
RIG.draw(c.g, 'dog', { at: [a.x, a.y], scale: a.scale, facing: a.facing, body: 'lie', pant: 1, phase: st }, { light: v.light });
v.front(c, st, {});
```

- `back(c, t, s)` draws behind the characters and `front(c, t, s)` the pane in front.
- `t` drives the heat.
- Caches are keyed `city|...`.
- Views are authored for `c.camera` zoom ≥ 1.

## Views

### `street`: glass, brick and metal under the sun

From a car stopped at the lights (not Daniel's), through its windscreen. A high street runs away to a church tower lost in haze.

- Left: the terrace in full sun, its shopfronts' glass and sash windows blazing, bollards.
- Right: the shaded terrace, plane trees, parked cars and a white van, a railing, a flag hanging dead straight.
- Lamp posts carry hanging baskets whose flowers droop.

The tarmac's far end and the tower's foot boil in the heat. The windscreen is the pane: the sun bleeding into the frit's dot-matrix (as in C2), wiper arcs and dust lit by it, the dashboard laid in the glass, the dark dash along the bottom (subtitle band).

| state | default | what |
| --- | --- | --- |
| `windscreen` | true | `false`: no cabin frame (the street alone). |
| `heat` | 1 | 0..1, the shimmer at the vanishing point. |

- **Anchors:** `horizon` (y), `zebra`.
- **Light:** the sun, high in the frit.

### `shopwindow`: heat ripples above the tarmac, seen as refraction in a shop window

On the hot pavement, at an angle to a hardware shop's window (dark green frame, a brick pier, an old tiled stall riser, a blank fascia). Through the glass: a display of electric fans on stands, three high, **not turning**. Laid over them: the street behind us (white tarmac, parked cars, the terrace opposite, the sky), with its far tarmac and the air above it boiling in the glass. The glass carries dust, glare streaks and a handprint.

| state | default | what |
| --- | --- | --- |
| `heat` | 1 | 0..1, the refraction in the reflection. |

- **Anchors:** `glass` (its four corners on screen).
- **Light:** the sun, high behind us.

### `crossing`: a pedestrian between islands of shade

From an upper sash window, looking down on the street. The road is white. There is a zebra with its Belisha beacons, manhole covers and patched tar. The islands of shade:

- a plane tree's pool on the near pavement (dappled), with its crown hanging out of focus in the top-left foreground;
- the awning's slit along the far shopfronts.

A pedestrian crosses the zebra from one to the other. The pane: the old glass's dust and a faint room in it, and the sash's painted meeting rail and stile soft across the bottom and right (the subtitle band).

- **State:** none.
- **Anchors:** `path`:
  - `from` (in the tree's shade), `kerbNear`, `kerbFar`, `to` (in the awning's slit): screen points on the ground;
  - `scaleFrom`, `scaleTo`: px/m, about 100.
  - Seen from above the figure is short; give it a dark slit of a shadow at its feet (a small ellipse, as the demo does). The demo uses `scale × 0.82` to account for the downward view.
- **Light:** the sun, high.

```js
const v = SETS.city.views.crossing, a = v.anchors.path, u = FILM.seg(st, 0.5, 4.5);
const x = lerp(a.kerbNear[0], a.kerbFar[0], u), y = lerp(a.kerbNear[1], a.kerbFar[1], u), k = lerp(a.scaleFrom, a.scaleTo, u);
v.back(c, st, {}); RIG.draw(c.g, 'pedestrian', { at: [x, y], scale: k * 0.82, view: 'profile', body: 'walk', phase: FILM.twos(st) }, { light: v.light }); v.front(c, st, {});
```

### `shelter`: a dog beneath a bus shelter, seen through its glass panel

Low, just outside a bus shelter, looking along it through its side panel. The panel is the pane: two bands of white dots, etched graffiti scratches, dust, a glare streak, and a steel frame soft in the foreground. Behind the glass, under the perch bench, in the shelter's slit of shade, the dog lies on the paving, panting. Beyond: the white pavement, the road, and the brick terrace opposite in full sun, its far end wavering.

| state | default | what |
| --- | --- | --- |
| `heat` | 1 | 0..1, the far road's shimmer. |

- **Anchors:** `dog` `{x, y, scale, facing}`: lying, head toward us.
- **Light:** the sun, high.

### `stall`: a man at a roadside stall pouring melting ice into a bucket

From inside a café, through its window: a glazing bar, a pendant lamp and a chair faint in the glass, the sill with a cup in the dark foreground (the subtitle band). On the bright pavement, a fruit-and-drinks stall under a faded striped awning, seen from beneath and hanging dead still. There are crates of fruit and a galvanised bucket of cans that catches the sun. The man pours a bag of half-melted ice into it: cubes tumbling and spinning, a sheet of water, splashes on the cans. The terrace opposite stands in full sun.

| state | default | what |
| --- | --- | --- |
| `pour` | 0.6 | 0..1, the ice falling (0: no pour). |
| `hands` | anchors.hands | A screen point where the pour starts. Pass the rig's hand position (`RIG.draw(...).hands`) so the ice leaves his hands. The ice is drawn in `front`, in front of him. |

- **Anchors:** `man` `{x, y, scale}` (behind the bucket; three-quarter, head bowed to it); `hands` (default start of the pour); `bucket` (its rim).
- **Light:** the sun, high behind.

```js
const v = SETS.city.views.stall, a = v.anchors.man, s = { pour: FILM.seg(st, 0.5, 1.0) };
v.back(c, st, s);
const inf = RIG.draw(c.g, 'stallman', { at: [a.x, a.y], scale: a.scale, view: 'three', yaw: 30, body: 'stand', armR: 'reachLow', armL: 'hold', head: { nod: 0.45 } }, { light: v.light });
if (inf) s.hands = [(inf.hands.R[0] + inf.hands.L[0]) / 2, (inf.hands.R[1] + inf.hands.L[1]) / 2];
v.front(c, st, s);
```

## Performance (warm frames, including the engine's post)

`street` 15–51 ms · `shopwindow` 38–45 · `crossing` 17–25 · `shelter` 12–16 · `stall` 19–31.

## Notes

- **Palette:** sky `#F7F3E7`; brick bleached (`#CFA88B` / `#A9846B` / `#6E5244`); render `#EFE7D3`; tarmac `#CBC4B4`; slit shadows `#2F3231`; leaves bleached `#9AA272`.
- The Belisha beacons are muted amber, never Emily's yellow.
