# RIG: the characters

`film/rig.js` defines `window.RIG`: Daniel, Emily, Sarah, Priya and the extras. These are flat graphic figures in three skin values. Each is rimmed by the shot's one light, and their faces stay quiet. Every call is deterministic: the rig never uses `Math.random` or `Date`. Run `node tools/set.js rig 1` to see every demo on one sheet (`out/set_rig.png`).

```js
const info = RIG.draw(c.g, 'daniel', { at: [960, 980], scale: 480, view: 'three', body: 'walk', phase: p }, { light: v.light });
RIG.face(c.g, 'daniel', { at: [960, 430], size: 520, face: 'squint' }, { mode: 'reflection', mirror: true, mirrorX: 960 });
RIG.hand(c.g, 'daniel', { at: [700, 600], size: 640, pose: 'phone', view: 'palm', rot: -55 }, { light });
```

All coordinates are in the space of whatever transform is set on `g`: the frame after `c.camera(...)`, or an offscreen layer such as a mirror's cabin canvas. `at`, the light, the band, clips and screen-space arm targets all use that same space.

## Entry points

| Call | What it draws | Returns |
| --- | --- | --- |
| `RIG.draw(g, who, pose, opts)` | A full figure. | `info` (below). |
| `RIG.face(g, who, pose, opts)` | A close head-and-shoulders. `pose.at` is the point between the eyes and `pose.size` is the head's height in px from crown to chin; it works up to about 900 px. Any body works; the default is `'bust'`. | `info`, in your coordinates. |
| `RIG.hand(g, who, pose, opts)` | A large hand insert holding its object. | `{ at, tips: [[x,y]×4], thumb, scale }` |
| `RIG.mix(a, b, u)` / `RIG.key(t, keys)` | Tweening for poses. These work like `FILM.mixv` and `FILM.key`, but strings and booleans snap at the segment's midpoint, and missing fields are carried over. | A pose. |
| `RIG.CHAR`, `RIG.FACES`, `RIG.ARM`, `RIG.GRIPS`, `RIG.INSERTS`, `RIG.MAT` | The cast, the expression presets, the named arm poses, the hand grips and inserts, and the materials (`[light, mid, shade]`). | |
| `RIG.demos` | The demo sheet. | |

`who` can be `'daniel'`, `'emily'`, `'sarah'`, `'priya'`, `'colleague'` (variants 0–4), `'worker'` (variants 0–4), `'pedestrian'` (variants 0–1), `'stallman'` or `'dog'`. You can also pass a character object from `RIG.CHAR`.

**`info`** gives the screen points that choreography and props need, in your coordinates:

- `head`, `eyes` `[[x,y],[x,y]]`, `chin`, `top`, `crown` (for a kiss on the top of the head), `neck`, and `collar` (where a hand straightens it).
- `hands.R/L`, `elbows`, `shoulders`, `hips`, `knees`, `feet`.
- `stride` (metres per walk cycle), `scale`, `yaw`, and `bbox {x,y,w,h}`.

> **Tweening note (engine):** `FILM.key` and `FILM.mixv` currently throw on objects that contain strings: `'0' in 'walk'` is a TypeError. Use `RIG.key(t, [[t0, poseA], [t1, poseB, 'inOutSine']])` until the engine handles non-numbers. Snap with `FILM.twos(t)` first: characters animate on twos.

## Pose fields

A pose is a plain object of numbers and strings. Omitted fields take sensible defaults.

### Placement and camera

| Field | Range | Meaning |
| --- | --- | --- |
| `at` | `[x, y]` px | The ground point under the pelvis, with the feet on the ground. For `sit`, `sitbed`, `drive` and `carseat` it is the seat surface under the hips. For `kneel` it is the ground under the pelvis. For `climb` it is the point on the stair slope under the pelvis. |
| `scale` | px per metre | A set's anchor gives this at the figure's depth. Daniel is 1.84 m tall, so 480 px/m makes him about 880 px. |
| `view` | `'front'` `'three'` `'profile'` `'back'` `'threeBack'` | The camera's angle on the character. |
| `yaw` | degrees | Overrides `view` for a continuous turn: 0 faces us, 90 is profile, 180 is the back. |
| `facing` | `1` or `-1` | `1` turns toward screen right. `-1` mirrors the yaw, so the character's other side is the near side. |
| `pitch` | degrees | Puts the camera above the figure, looking down (laps, desks, the top of a child's head). Negative puts it below. Keep it within about ±20. |

### Body

| Field | Values | Notes |
| --- | --- | --- |
| `body` | `'stand'` `'walk'` `'hurry'` `'run'` `'climb'` `'sit'` `'drive'` `'kneel'` `'sitbed'` `'carseat'` `'bust'` | See the examples below. |
| `phase` | 0..1 | The cycle position: 0 is the right heel striking (walk, hurry, run) or the right foot lifting (climb). It also drives the sock swing for `sit`/`carseat` with `swing`. |
| `stride` | m | Overrides the cycle's stride. Defaults: walk 1.22, hurry 1.5 and run 2.3, scaled to leg length. To plant the feet, move `at` by `info.stride * scale` px per cycle along the facing direction. |
| `rise`, `going` | m | Stair geometry for `climb` (defaults 0.19 and 0.25). Each cycle climbs 2 treads: move `at` 2×`rise` up and 2×`going` forward. |
| `seat` | m | Seat height above the floor (`sit`, `sitbed`, `carseat`), so the feet land on the floor. |
| `swing` | 0..1 | Dangling legs that swing with `phase` (Emily at the table). |
| `steer` | −1..1 | Turns the wheel for `drive`. Also: `wheelAt` `[x,y,z]` in body metres, `wheelR`, and `wheel: false` if the set draws its own wheel. |
| `breath` | 0..1 | Breathing phase. For the 0.25 Hz breath use `breath: (FILM.twos(t) * 0.25) % 1`. The chest and shoulders rise by `breathPx` (default 3 px at any scale). |
| `lean` | −1..2 | Forward bend at the hips and spine. Values above 1 make a bow, and a standing figure shifts its hips back to stay balanced. |
| `twist` | −1..1 | Chest yaw against the hips. |
| `side` | −1..1 | Sideways lean, positive toward screen right in the front view (Emily leaning into the shade). |
| `weight` | −1..1 | Shifts the weight onto one leg (contrapposto). |
| `crouch` | 0..1 | Bent knees while standing. |
| `slump` | 0..1 | A seated slump. |
| `stoop` | 0..1 | Forward head and round shoulders. Daniel's default is 0.45 and Sarah's 0.05. |
| `head` | `{tilt, turn, nod}`, each −1..1 | `turn` +1 is about 80° toward the facing side. `nod` +1 is chin down (38°). `tilt` +1 rolls the top of the head toward screen right in the front view. |

### Face

| Field | Values |
| --- | --- |
| `face` | A preset (`RIG.FACES`): `'tired'` `'squint'` `'smile'` `'concentration'` `'blank'` `'drained'` `'understanding'` `'down'` `'closed'` `'sleep'` `'laugh'` `'warm'` `'past'` (looking past someone) `'solemn'` `'sleepy'` `'pout'` `'neutral'` |
| `eyes` | `'open'` `'half'` `'closed'` `'squint'` `'down'` `'wide'` |
| `mouth` | `'neutral'` `'smile'` `'tight'` `'open'` |
| Numeric overrides, all tweenable | `lid` 0 open..1 closed · `squint` 0..1 · `down` 0..1 · `brow` −1..1 · `browIn` 0..1 (inner ends up: kind, worried) · `browKnit` 0..1 · `smile` −1..1 · `open` 0..1 · `tight` 0..1 · `gaze` `[x, y]` −1..1 |
| `stubble` | 0..1, a faint day's growth. Daniel defaults to 0.4 in `'night'` and 0 by day. |

Presets set the numbers; then `eyes` and `mouth` apply; then the numbers you pass win. This lets you tween a face as numbers (for example, `lid` from 0.2 to 1 for eyes closing).

### Arms and hands

`armR` and `armL` take any one of these forms:

- **A named pose** (`RIG.ARM`): `'down'` `'relaxed'` (the standing default) `'hold'` `'phone'` `'look'` `'ear'` `'pocket'` `'hip'` `'bag'` `'strap'` `'reach'` `'reachIn'` `'reachLow'` `'reachUp'` `'collar'` `'tie'` `'face'` `'mug'` `'sip'` `'reports'` `'rail'` `'wheel'` `'desk'` `'type'` `'lap'` `'knee'` `'cross'` `'wave'` `'hug'`.
- `{ pose: 'reach', dx, dy, dz }`: a named pose nudged in metres (outward, up, forward).
- `{ to: [sx, sy], depth, pole, palm, grip }`: puts the hand on a screen point, such as `info.collar` of another figure. `depth` is in metres toward us from the shoulder (default 0.25). `pole` is the elbow direction `[out, up, fwd]`.
- `{ hand: [out, up, fwd] }`: a target in metres from the shoulder, in the chest's frame.
- `{ at: [x, y, z] }`: a target in body space, in metres.
- `'auto'`: the cycle's own swing. This is the default for walk, hurry, run and climb.

`palm` is `'in'`, `'up'`, `'down'`, `'back'` or `'fwd'`. Hands curl when they hold something.

`hold` sets what each hand carries: a string for the right hand, `{ r: 'phone', l: 'bag' }`, or `holdR` / `holdL`. The objects are `'phone'` (set `phoneLit: true` to light the screen), `'mug'` (travel mug), `'cup'` (ceramic, with a handle), `'keys'`, `'bag'` (the leather work bag), `'reports'`, `'knife'`, `'toast'`, `'rabbit'`, `'remote'` and `'icebag'`.

### Clothes and hair

| Field | Values |
| --- | --- |
| `outfit` | Daniel: `'day'` (pale-blue oxford, navy tie, charcoal trousers, brown shoes), `'office'` (the same, tie loose by default), `'night'` (grey tee, pyjama trousers, bare feet). Emily: `'day'` (mustard cardigan in `#E0B34F`, cream top, leggings, uneven yellow socks). Sarah: `'work'` (navy blazer, cream blouse). Priya: `'office'` (plum blouse) or `'coat'` (stone trench). |
| `collar` | `'crooked'` (default; the left point lifts off the chest), `'straight'` (after Emily) or `'loose'` (top button open). |
| `tie` | `'neat'`, `'loose'` (knot lowered, collar open) or `'none'`. |
| `harness` | `true` draws the car-seat straps and chest clip over Emily. |
| `variant` | Picks an extra. `colleague` and `worker` have 0..4; `pedestrian` has 0 (cap) and 1. |
| `hairStyle` | Overrides the character's hair: `'crop'` `'curls'` `'puff'` `'bun'` `'pony'` `'short'` `'cap'` `'bald'`. |

## `opts`

| Field | Meaning |
| --- | --- |
| `light: {x, y, color, back}` | The shot's one motivated light, in screen space; use the set's `view.light`. `back` runs from 0 (a key on our side of the figure) through 0.5 (from the side) to 1 (from behind: rim only, as in C3). The default is a cream key from the upper left with `back` 0.3. |
| `ambient`, `ambientK` | Grade every colour toward a hex by k from 0 to 1, for example the office teal or dusk. |
| `exposure` | Multiplies every colour (0.6 darkens, 1.2 lightens). |
| `rimW`, `rimK` | Rim width in px (default about 0.0042 × scale) and a multiplier. |
| `detail` | Scales the level of detail. Detail follows the head's size in px: features appear above about 15 px, lids, irises and lips above about 45 px, and lashes, creases, hair texture and greying above about 60–140 px. |
| `band: {y0, y1, x0, x1, slope, color, alpha, soft}` | A hard strip of light laid across the figure and clipped to it: the sun strip in the car (C2). `x1` with `soft` gives the penumbra where the headrest's shade begins. Defaults: cream `#FFF0D8` at alpha 0.62, so a squint still shows through. |

### Modes (`opts.mode`)

- **`'full'`** (the default): three values, a rim and every detail.
- **`'silhouette'`**: an ink fill with only the rim, cut along the outer outline with the head rimmed on its own (C3). Options: `ink` (`#0A0E10`), `rimColor` (the light's colour), `rimW`, `spread` (1.25), `rimSoft` (true).
- **`'reflection'`**: the figure seen in glass, with lower contrast, cooler colours and the glass's tint. By default it is screen-blended so that black glass shows only what is lit. Options: `tint` (`#8FA9A6`), `tintK` (0.32), `alpha` (0.8), `blend` (`'screen'`; use `'source-over'` for a mirror), `mirror`, `mirrorX` (the axis; default `pose.at[0]`), `crush` (0.55; deepens the darks), `lift`, `clip`, and `res` (resolution factor). Rims drop to 0.55.
- **`'blur'`**: the figure behind fogged or steamed glass. It is simplified to two values with no features, drawn small, blurred small and scaled up, so there is no full-frame filter. Options: `soft` (px, 18), `fog` (a hex to fade toward) with `fogK`, `alpha`, `blend` and `clip`.

The reflection and blur modes draw through a pooled offscreen canvas, so their cost does not grow with frame size.

## `RIG.hand(g, who, pose, opts)`

| Field | Meaning |
| --- | --- |
| `at` | The wrist's screen point. |
| `size` | The hand's length in px; 600–900 suits an insert. |
| `pose` | An insert from `RIG.INSERTS`: `'phone'` `'cable'` `'mug'` `'keys'` (hanging from one finger, swung by `phase`) `'bag'` `'knife'` (the crust) `'wipe'` (the thumb) `'wheel'` `'drum'` (two fingers, `phase` 0..1 per tap pair) `'handle'` (door) `'remote'` (`press` 0..1) `'reach'` `'relaxed'` `'fist'` `'flat'` `'point'` `'grip'`. Each insert sets a grip, an object and a default view. |
| `view` | `'back'` (back of the hand toward us), `'palm'`, `'side'` (thumb side) or `'pinky'`. |
| `rot`, `roll`, `pitch` | Degrees. `rot` turns the hand on screen: 0 points the fingers right, 90 points them down. `roll` turns it about its own long axis, between views. `pitch` turns the fingers toward or away from us. |
| `side` | `'R'` (default) or `'L'`. |
| Fine control | `grip` (a `RIG.GRIPS` name), `curl` (multiplier), `spread`, `obj` (an object name, or `null` for none), `lit` (phone screen), and `sleeve` (`'day'`, `'office'` or `'night'`; `'night'` shows the bare wrist). |

## Examples by body

```js
const L = view.light, br = (FILM.twos(c.lt) * 0.25) % 1;
// stand: Daniel by day, three-quarter, tired, the collar crooked
RIG.draw(g, 'daniel', { at: [900, 990], scale: 470, view: 'three', face: 'tired', breath: br }, { light: L });
// walk, hurry, run: the feet stay planted if `at` advances by info.stride * scale per cycle
const ph = FILM.twos(c.lt) * 0.9;                    // about 0.9 cycles per second for a tired walk
const i = RIG.draw(g, 'daniel', { at: [200 + ph * 1.22 * 260, 980], scale: 260, view: 'profile', body: 'walk', phase: ph % 1 }, { light: L });
RIG.draw(g, 'daniel', { at, scale, view: 'profile', body: 'run', phase, face: 'blank' }, { light: L });
// climb: back view, night clothes, a hand on the rail; seen in the phone's black glass
RIG.draw(g, 'daniel', { at, scale: 120, view: 'back', body: 'climb', phase, outfit: 'night', armL: 'rail' }, { light: { x, y, color: '#F6CD92', back: 0.92 }, mode: 'reflection', mirror: true });
// sit: at the desk, typing
RIG.draw(g, 'daniel', { at: seatPoint, scale, view: 'profile', body: 'sit', seat: 0.46, armR: 'type', armL: 'type', face: 'concentration', outfit: 'office' }, { light: L });
// drive: profile (the rig draws the wheel unless wheel: false), or from the front through the windscreen
RIG.draw(g, 'daniel', { at: seatPoint, scale, view: 'profile', body: 'drive', steer: 0.1 }, { light: L });
RIG.draw(g, 'daniel', { at: seatPoint, scale, view: 'front', body: 'drive', armR: 'wheel', armL: { hand: [0.05, -0.3, 0.3] } }, { light: L, mode: 'reflection', blend: 'source-over', alpha: 0.9 });
// kneel: C3, a silhouette with the near arm reaching into the car
RIG.draw(g, 'daniel', { at, scale, view: 'profile', body: 'kneel', armR: 'reachIn', armL: 'down', head: { nod: 0.8 }, face: 'down', collar: 'crooked' }, { mode: 'silhouette', light: { x: sun.x - 40, y: sun.y - 110, color: '#F4AE72' } });
// sitbed: dawn, on the edge of the bed with the phone, seen a little from above
RIG.draw(g, 'daniel', { at, scale, view: 'three', yaw: 32, body: 'sitbed', seat: 0.47, outfit: 'night', hold: 'phone', phoneLit: true, armR: 'knee', armL: 'knee', face: 'down', head: { nod: 0.5 }, pitch: 12 }, { light: L });
// carseat: Emily in the rear-view mirror (C2), drawn into the mirror's own layer, the sun strip across her face
RIG.face(cab, 'emily', { at: [700, 190], size: 230, body: 'carseat', harness: true, holdR: 'rabbit', armR: 'hug', armL: 'hug', face: 'squint', facing: -1 },
  { light: { x: 80, y: 120, color: '#FFF4DE', back: 0.45 }, band: { y0: 146, y1: 205, x1: 666, soft: 26 }, mirror: true, mirrorX: 500 });
// then she leans into the shade behind his headrest and her eyes close: tween side 0 -> 0.85, head.tilt -> 0.45, lid -> 1
// sit (Emily at the table): dangling socks, the toast, the solemn nod; reaching up to his collar
const d = RIG.draw(g, 'daniel', { at, scale, view: 'three', facing: -1, lean: 1.6, head: { nod: 0.15, turn: 0.2 }, face: 'smile' }, { light: L });
RIG.draw(g, 'emily', { at: seat, scale, view: 'three', body: 'sit', seat: 0.5, armR: { to: d.collar, palm: 'fwd' }, armL: { to: [d.collar[0] - 26, d.collar[1] + 4], palm: 'fwd' }, face: 'solemn', head: { nod: -0.42 } }, { light: L });
// face: close sizes, any mode
RIG.face(g, 'daniel', { at: [960, 420], size: 600, view: 'three', face: 'understanding', head: { nod: 0.3 } }, { light: L });
// hands: inserts
RIG.hand(g, 'daniel', { at: [640, 620], size: 720, pose: 'drum', view: 'back', rot: -15, phase: FILM.twos(c.lt) * 1.5 }, { light: L });
// extras
RIG.draw(g, 'colleague', { variant: 2, at, scale, view: 'three' }, { mode: 'reflection', blend: 'screen', alpha: 0.5 });
RIG.draw(g, 'dog', { at, scale: 300, body: 'lie', pant: 0.8, phase: FILM.twos(c.lt) * 0.6 }, { light: L });
```

The dog takes `body` (`'lie'`, `'stand'` or `'sit'`), `pant` (0..1), `facing`, `head: {nod}` and `eyes: 'closed'`.

## Notes

- **Restraint.** The rig draws whatever you ask, so the film's rules are the sequence's job. Emily is never drawn in the car after Q05, and the rabbit never appears in the seat at the end.
- **Draw order.** Draw a figure between a set view's `back(...)` and `front(...)`, so that the pane's reflections, glare and fog lie over it.
- **Cost.** At 455 px/m a full figure costs roughly 20–30 ms, a 255 px/m figure about 10 ms, and a 330 px close face about 13 ms. Silhouettes are cheaper. Reflection and blur add one small offscreen pass each. Per-frame cost scales with how much of the figure is on screen.
- **Internals.** `RIG._` holds the building blocks (the projection, `loft`, the solver, `paintPart` for painting your own shapes in the same three-value style, `makeR`). Treat them as unstable.
