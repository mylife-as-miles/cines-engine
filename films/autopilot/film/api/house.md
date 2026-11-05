# SETS API: house.js

`SETS.house` (`film/sets/house.js`): the front of the house and the drive, for Q05 (morning) and Q11 (evening into dusk).

- **The house.** An ordinary Winchester semi in red-brown brick: a canted bay, white casements, a hipped tiled roof with a chimney on the party wall.
- **The porch.** An enclosed porch with a glazed door. Behind it stands the front door whose frosted panels blaze in the kitchen's hall views. This is where Sarah waits "behind the front door's glass".
- **The drive.** A gravel drive beside the porch, a hedge along its far side, the neighbour's house beyond, a small tree on the lawn, a low brick wall at the pavement.
- **The light.**
  - The front faces east. In the morning it takes the sun full on and the car on the drive bakes.
  - In the evening the sun is behind the roof: the front falls into cool shade, every pane gives back the dusky east (with a thin line of copper, the tops of the houses opposite), the ridge and chimney take a copper rim, and the porch glows from the hall's lamp.
  - At dusk all of this is darker, the copper low in a violet-teal sky.

## Daniel's car

The car is `SETS.car.exterior` (the car set), placed in these views' own cameras. Each view that shows it gives its ground point and heading:

```js
const v = SETS.house.views.drive;
SETS.car.exterior(c.g, { cam: v.cam, at: v.car.at, heading: v.car.heading, tod: s.tod, sun: v.sun(s), em: c.em, t, heat: s.tod === 'morning' ? 1 : 0 });
```

- `drive.car.at` = [3.75, 0, 5.05], `heading` 0: nose to the house. We see its tail and its passenger flank.
- Pass `v.sun(s)` so the car's shading and cast shadow agree with the set.
- The morning's heat shimmer off the roof is the car set's `heat: 1`.
- `front()` adds a faint shimmer over the hot gravel near the house (via `SETS.car.shimmer`, when it exists).

## Use

```js
const v = SETS.house.views.porch, s = { tod: 'evening' };
v.back(c, t, s);  /* Sarah (RIG) */  v.front(c, t, s);
```

- House metres: x runs across the front as seen from the street, y is up (the drive is 0), z goes away from the street (the front wall is at z 9, the porch's glazed front at z 7.75).
- Frame coordinates are 1920x1080. Cached layers carry a 32 px margin, enough for Q11's growing handheld drift (1 to 2 px).
- `tod`: `'morning'`, `'evening'` or `'dusk'`. `'noon'` and `'afternoon'` fall back to morning.
- The porch's front face (its brick base either side of the door, its glazed door and side panes) is drawn in `front()`, so anyone standing in the porch is behind its glass and its solid lower half.
- Caches are keyed `house:`.

---

## `drive`: the front of the house and the drive, wide

Serves Q05 0–6 (the car baking in the morning sun, heat rising) and Q11 5–10 (home in the evening, Sarah in the porch).

- From the end of the drive: the car's tail in the middle ground on the gravel, the porch to its left, the bay, the first-floor windows, the roof cut by the top of the frame.
- The hedge and the neighbour's house on the right; the next street's roofs and trees behind.

**State**: `tod`; `shimmer` 0..1 (morning gravel shimmer, default 1).

**Anchors**

- `car` [1160,975]: the ground under its middle. `carRoof` [1155,698]. `carPxPerM` 189.
- `porchDoor` [755,734].
- `sarahInPorch` [755,843]: her feet, inside the porch. `sarahPxPerM` 121.
- `steps` [[751,853],[741,905]]: the porch's step top, then its foot.
- `driverDoor` [1313,959]: the ground at the driver's door (the car's right).
- `v.cam`.

**Light**

- `light.morning` = `{x: -400, y: -300, color: '#FFE9C4'}`: the sun behind the lens, upper left, so the front is lit.
- `light.evening` = `{x: 1000, y: 120, color: '#F2A65E'}`: behind the roof, rims only.

---

## `arrive`: through the windscreen, onto the gravel (Q11 0–5)

- The driver's eye (right-hand drive) as the car turns in from the road and rolls up the drive.
- Through the windscreen, the house ahead with the porch lit. As the car comes to rest he looks left to the porch, where Sarah waits.
- The car's own frame, after C2:
  - the headliner, the A-pillars, the dash and the binnacle hood;
  - the rear-view mirror at the top. It holds only the empty road behind, as in every car shot after the mirror moment.
- The windscreen's dust, the dash's ghost low in the glass, a long sheen.

**State**

- `approach` 0..1, default 1: from the road (0) to parked (1). The world is cached per 1/48 step.
- `tod`: evening or dusk.

**Anchors**: `v.anchorsAt(approach)` gives `porchDoor`, `sarahInPorch`, `sarahPxPerM`, `stepTop`, `stepFoot` and `drive` at any moment.

- At 1: Sarah in the porch at [438,831], 257 px/m.
- At 0.5: [633,712], 125 px/m.

`v.camAt(u)` gives the camera itself.

**Light**: `{x: 1000, y: 100, color: '#F2A65E'}`, the sun behind the house ahead.

---

## `porch`: Sarah behind the porch glass (Q11 5–26)

- From beside the car, the porch close.
- Its glazed door (dark-painted timber, a solid lower panel, a brass knob) and side panes. Behind them the front door stands open on the hall, whose lamp makes the porch glow warm.
- The glass gives back the dusky east and its copper line.
- The bay window to the left, the first floor above.

**State**

- `tod`: evening (default) or dusk.
- `door` 0..1: the porch door opens out, hinged on the right, when she runs out to him (Q11 26–32). It is drawn live while open.

**Anchors**

- `sarahFeet` [1145,987]: on the porch floor. `sarahHead` [1146,351]. `sarahPxPerM` 386.
- `doorHandle` [934,718].
- `stepFoot` [886,1306]: below the frame.

**Light**: `{x: 760, y: 420, color: '#E8A45E'}`, the hall lamp behind her: a warm rim. The glass in front gives back the dusky east.

```js
const v = SETS.house.views.porch, A = v.anchors, s = { tod: 'evening' };
v.back(c, lt, s);
RIG.draw(c.g, 'sarah', { at: A.sarahFeet, scale: A.sarahPxPerM, view: 'front', face: lt < 17 ? 'warm' : 'past' }, { light: { ...v.light, back: 0.6 }, ambient: '#2A3340', ambientK: 0.1 });
v.front(c, lt, s);
```

---

## `reverse`: backing out, the house receding (Q11 26–32)

The same driver's eye and cabin as `arrive`, run backward. He starts parked, looking to the porch; the car backs down the drive, swinging its tail into the road, and the house recedes in the windscreen. Sarah runs down the steps, small (the sequence draws her at `anchorsAt(u)`).

**State**

- `back` 0..1: 0 parked, 1 out in the road.
- `tod`.

**Anchors**: `v.anchorsAt(u)` with `u = 1 - back`: the same names as `arrive`. The step's top and foot give her path down. Add Q11's handheld drift with `c.camera` on top.

---

## `wing`: pulling away, the house and Sarah in the wing mirror (Q11 26–32)

**Geometry.** While he reverses, the house is in front of the car, so no wing mirror can see it. The beat lands once the car has swung into the road and pulls away along it (heading +x, the house on its left). Then the passenger door's mirror holds the house, the porch lit, the drive, and Sarah at its end, small, receding.

**What it shows**: the driver's view left, through the passenger window:

- our side of the road sliding past at dusk;
- the door's top edge and the A-pillar;
- the mirror's housing and its glass, which holds the view behind, mirrored.

**State**

- `away` 0..1: how far down the road. At 0.15 she is about 115 px/m in the glass; by 0.5 she is small (63 px/m). The picture is cached per 1/40 step.
- `tod`: dusk (default) or evening.

**In the mirror**: `v.inGlass(c, s, fn)`. `fn(g, cam)` gets the mirror's own camera (house metres) with the mirror flip already applied, so draw her at `cam.p(x, 0, z)` (for example at the drive's end, `[2.65, 0, 0.4]`) and she lands in the glass.

**Anchors**: `v.anchorsAt(away)`

- `glass` [450,396,980,740].
- `sarahAtDriveEnd` and `sarahPxPerM`: at 0.15, [663,679] and 116.
- `porch`.

**Light**: `{x: 1200, y: 200, color: '#E89A5E'}`.

```js
const v = SETS.house.views.wing, s = { tod: 'dusk', away: FILM.seg(lt, 29, 32) };
v.back(c, lt, s);
v.inGlass(c, s, (g, cam) => { const f = cam.p(2.65, 0, 0.4), k = cam.f / cam.p(2.65, 1, 0.4)[2];
  RIG.draw(g, 'sarah', { at: [f[0], f[1]], scale: k, view: 'front', face: 'past' }, { light: { x: 700, y: 400, color: '#E89A5E' } }); });
v.front(c, lt, s);
```

---

## Helper

`SETS.house.facade(g, box, { tod })` draws the house front into any box. Use it for another set's reflection of the house (the car's side glass in Q05). The car set's own `reflect: 'house'` preset is an alternative.

## Demos (`node tools/set.js house 1` → `out/set_house.png`)

1. The drive, morning (the car set's car with `heat`).
2. The drive, evening (RIG's Sarah small in the porch).
3. Arriving through the windscreen.
4. Sarah behind the porch glass (RIG).
5. Backing out at dusk.
6. The wing mirror with Sarah (a stand-in) small in it.
7. The drive at dusk.

Times are 16 to 45 ms per frame (the car and the figures included).

## Not fully right yet

- **The POVs.** The cabin frame is a simple stand-in after C2, so as not to depend on the car set's interior. If the car set's driver POV can take a host world, these two views should adopt it.
- **The street.** It is not built: the drive view and the POVs never look at it. The wing view's "our side of the road" is the house scene seen along the road.
- **The heat.** It is the car set's shimmer plus a faint shimmer over the gravel; there is no shimmer off the roof tiles.
- **Sarah's steps.** They have only two treads.
