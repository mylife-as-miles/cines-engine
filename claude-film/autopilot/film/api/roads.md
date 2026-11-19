# SETS API: roads.js

`SETS.roads` (`film/sets/roads.js`) is the journey, seen through Daniel's windscreen and his passenger window (Q06, Q10, Q11).

The streets are a small 3D world laid out in metres and seen through `LC.camera`. `travel` (metres) moves the camera, so the scenery comes at the glass with true parallax. At 20 mph, use `travel = t × 9`.

It is England:

- We drive on the left. The kerb is on our left, at x −2.0; the dashed centre line is on our right, at 1.35; the far kerb is at 4.7.
- Pavements are 2 m wide. Front gardens have low walls or hedges.
- The houses are semis, terraces and shop parades in brick or render, with hipped and gabled roofs, chimneys and bay windows.
- Street furniture: double yellow lines, lamp posts, street trees, give-way lines, UK traffic signals on poles with white-bordered backboards, a zebra crossing with Belisha beacons and zigzags.

The world beyond the glass is rendered at 0.4 size and laid in soft (C2's out-of-focus street). The pane's artefacts sit on top of it: the frit's dot-matrix, the dash ghosted in the lower glass, glare streaks, dust and wiper arcs lit by the sun.

**The rear-view mirror is in every windscreen shot and shows only the road behind**, using SETS.car's road framing, mirror-imaged. That is the restraint, and it is built in: there is no state that shows the back seat.

All views take `back(c, t, s)` and `front(c, t, s)`. In the windscreen views the dash and the wheel are nearer than any hand, so `back` draws everything and `front` is empty.

## Views

### `windscreen`: residential roads at morning (Q06)

The driver's eye looking down the road, through the windscreen:

- the headliner and the frit above;
- the right A-pillar;
- the dashboard, the binnacle's hood and the top of the wheel below. The bottom band stays dark for subtitles.

The morning is a warm white windscreen. The low sun sits in the frit at the upper left, with a broad veil of glare over everything beyond the glass.

| state | default | what |
| --- | --- | --- |
| `beat` | `'plain'` | Which stretch of road (see the table below). |
| `travel` | 0 | Metres along that stretch. Each beat is laid out so its business lies 15 to 45 m ahead of travel 0. |
| `signal` | `'red'` | The lights' aspect: `'red'`, `'redamber'`, `'green'`, `'amber'` or `'off'`. The UK sequence is red, red-and-amber, green, amber, red. A lit lens blooms in the lens and lays a soft glow on the windscreen glass: "red on the glass". |
| `vanEdge` | 0 | 0..1: the impatient van nosing out of its junction. |
| `traffic` | 0 | Metres the traffic ahead has closed on us (evening). |
| `brakes` | false | The cars ahead brake (evening). |
| `yaw`, `sway`, `dx`, `bob`, `roll` | 0 | Extra camera moves (radians, metres) on top of the beat's own. Use them for handheld or a turn. |
| `focus` | none | An extra blur (px at 0.4 size) beyond the glass. |
| `mirrorMoves` | true | Set false to keep the mirror's road still (cheaper). |

**Beats:**

| beat | what | good `travel` |
| --- | --- | --- |
| `bakery` | The road ends at a T-junction. The bakery stands across it, facing us: a striped awning, its painted name, warm light inside. Its window gives our own car back, mirrored across the glass (SETS.car.exterior), growing as we come. We turn left past it (the beat yaws the camera) and its window slides by. | 6 to 22 (approach), 22 to 30 (the turn) |
| `lights1` | A junction with signals: the primary on our kerb after the stop line, the secondary across the junction on the right. Side roads both ways, double yellows. | 14 to 22 (stopping at the line) |
| `lights2` | The second set: a pelican crossing on a shopping street. The signals sit close on both sides, with zigzags, studs and a bus shelter. | 4 to 14 |
| `crossing` | The zebra near the park: black and white stripes, flashing Belisha beacons, zigzags, the park's iron railings, grass and big trees on the left. | 4 to 18 |
| `van` | The same impatient van at the same junction: a side road on the left, the white van at the give-way line nosing out. Its windscreen is a sheet of glare, with rings of it and nothing behind. | 4 to 16 |
| `plain` | An ordinary residential stretch, for driving shots. | any |

**Anchors:**

- `mirror`: the mirror's quad.
- `wheel` [1540, 1000]: the top of the wheel.
- `horizon` 446; `vanishing` [960, 446].

**Light:** the sun at [205, 150], `#FFE9C4`.

```js
// Q06 3-6: the first lights, red on the glass, then it changes
const v = SETS.roads.views.windscreen;
v.back(c, st, { beat: 'lights1', travel: FILM.key(st, [[0, 12], [1.6, 19.5, 'outCubic']]), signal: st < 2.2 ? 'red' : st < 2.8 ? 'redamber' : 'green' });
v.front(c, st, {});
```

### `evening`: traffic home through copper heat (Q10)

The same cockpit with `beat: 'evening'`. The low sun is behind us, in the west.

- **The mirror** holds it: the sun blazes in the road behind.
- **The street ahead** is raked with copper, and the gable ends facing us are lit.
- **Long shadows**, ours first, lead the way down the road.
- **Every windscreen** coming toward us, and every rear window ahead, is a copper mirror with a hot core. Nothing can be seen through any glass.
- **Our own glass** carries the copper glare of the lit dashboard reflected in it.
- **Heat** shimmers over the far tarmac.

Traffic ahead keeps its distance (`traffic` closes it). The oncoming lane flows past and cycles.

- State: as `windscreen`, plus `brakes`.
- Light: the sun behind us (`light.note`). For rims, use a point up and behind.

```js
SETS.roads.views.evening.back(c, st, { travel: 20 + lt * 6, brakes: lt > 50 });
```

### `dusk`: the drive to the nursery (Q11)

`beat: 'dusk'`. A violet-teal sky and copper at the end of the road. The sun is down behind the roofs ahead. The lamps are coming on, windows are lit warm, and oncoming cars have their headlights on.

For Q11's growing handheld drift, pass `dx`, `bob` and `roll` from `FILM.shake`.

### `passenger`: the nursery's painted wall slipping past (Q06, A030)

SETS.car's passenger window (the frame, the glass's dust and smudge, the door mirror giving back only the road behind) with the nursery's wall outside, at about 3.5 m. At 20 mph its animals are smeared into bands of colour and out of focus. The focus is on the glass.

They are the same animals, in the same order and colours, as SETS.nursery's mural: lion, hippo, elephant, the boarded entrance, giraffe, flamingo, whale, zebra, snail, on the cream panel with its blue edge lines and brick plinth. Dusk drains them (Q11). If the nursery set ever publishes `SETS.nursery.mural.paintRaw`, the wall is painted with it instead.

- State:
  - `travel` (m): the wall is 32 m long and wraps.
  - `scale`, default 230: px per metre on the glass.
  - `tod`.
- Anchors: `window` (the glass's box).

## Functions

- `SETS.roads.street(g, s, { scale, cx, cy, f })`: draws just the world beyond the glass into any canvas, at any scale. It returns `{ cam, hzY, glows, lamps }`. SETS.car's `dash` view uses it, far out of focus.
- `SETS.roads.pass(g, box, s)`: what slides past a side window inside `box`. `s.scene` is `'street'` (the default) or `'wall'`; also `s.travel` and `s.tod`. SETS.car's `passenger` view uses it.
- `SETS.roads.beats`: the beat builders. `SETS.roads.pal`: the palettes per tod. `SETS.roads.mural`: the wall's layout and colours.

## Cost

Each view costs about 20 to 30 ms on top of the engine's own frame (about 38 ms on the headless machine). The total is 55 to 70 ms. The street is drawn live at 0.4 size; the cockpit, the glass and the mirror's still road are cached.

## Demos

Run `node tools/set.js roads 1` and see `out/set_roads.png`:

- the bakery (the approach, the turn);
- the first lights (red), the second lights (red and amber);
- the crossing, the van, a plain moving stretch;
- the passenger wall (two moments);
- evening traffic, dusk.
