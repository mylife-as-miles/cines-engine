# SETS API: nursery.js

`SETS.nursery` (`film/sets/nursery.js`) holds the film's ending: Q11 from the arrival (32 s) and all of Q12. It contains the low brick nursery with its painted animals at dusk, the silent playground, the boarded main entrance and its notice, and the open car park where Daniel's car has stood all day. That includes the dark rear window, the locked handle, the indicators, the open rear door and **C3**, held while the sun sinks out of the glass.

The look is Look C at dusk: a copper sun, a violet-teal sky, long teal shadows on copper tarmac. In C3 it ends in silence and teal-black.

## Restraint (built in; do not work around it)

- **The inside of the car is never drawn.** No pane in this set has an interior behind it.
  - The car's rear glass is a black mirror that gives back the dusk sky, the nursery and Daniel.
  - In `door` and `c3`, the doorway is edge-on behind the **hinge band**, a strip of flat shadow from the door's front edge to the B-pillar. It covers the doorway at every opening angle (checked at 0.12, 0.25, 0.4, 0.6 and 1).
  - Daniel's reaching arm goes *behind* that band. The camera stays outside, in front of the door's outer skin.
- In `carpark` the car's panes give back sky only. At that size a reflected wall band could read as headrests, so it has none.
- Draw nothing of the child, the seat or the rabbit. Phase 2 should not add any reflection or pane content that could be read as an interior.
- No words on screen except the notice (verbatim, A085). The notice has no header, logo or sign text added.

## Calling a view

```js
const v = SETS.nursery.views.c3;
v.back(c, t, s);          // everything behind the characters
/* draw characters here with RIG, at v.at(s) anchors */
v.front(c, t, s);         // the pane and what is in front of them (glass, door, flank, the light going)
```

- **`s` (state):** `tod` is `'evening'` (the low copper sun still raking the wall) or `'dusk'` (the wall in its own shade). The default is `'evening'` for the nursery exteriors; the car views are always dusk. Each view adds its own keys, listed under the view.
- **Cameras:** static layers are cached (keys `nursery|...`). Pushes and drift with `c.camera(...)` work on top, and scratch layers follow the transform.
- **`v.at(s)`:** returns the anchors for that state, merged with `light`.
- **`v.light`:** `{x, y, color}`, the shot's one motivated light, for rims.
- **`v.lightAt(s)`:** in `c3` and `door` only. Returns `{x, y, color, k}`, where `k` is the rim's strength as the sun sinks.
- **`k`:** px per metre at the anchor's depth.

### Passing a character into the glass

Three views take a character through or in glass. The view composites it correctly; you pass a draw function.

- **`s.figure(g, a)`** in `c3` and `door`: Daniel *seen through* the open door's privacy glass.
  - Draw him in world coordinates with `RIG`. Inside the glass he is multiplied by the glass tint (`s.figureTint`). Where he is outside the glass (above the door when he stands) he is left untouched.
  - In `c3` the default tint is `#C4D0D1`, the mild cooling the style frame gives its silhouette.
  - In `door` the default is `#7A8C90`: his face is seen there, so he is darkened and cooled to sit behind dark glass with the tinted world behind him.
  - Any glare, dust and the door are laid over him.
  - You may also draw him directly between `back` and `front`, untinted, as the style frame does.
- **`s.reflect(g, a)`** in `window`, `handle`, `entrance`, `boarded` and `notice`: Daniel *as the glass gives him back*.
  - Draw him front-on (a reflection faces the camera) at `a.reflection` (`x, y` = his feet or chin, see the view; `k` px/m) or at `a.face` in `notice`.
  - In the car glass and the sidelight he **occludes** the reflected sky (he replaces it, darkened by the glass's reflectance), so he reads as a dark figure in a black mirror, rimmed on his sun side.
    - Draw him in RIG's normal mode, lit by `a.light`; the view applies the glass.
    - Do not add RIG's `'reflection'` mode on top: that would darken him twice.
  - In the notice he is laid into the sleeve's glare band (see `notice`). Draw him **dark**, for example RIG `mode: 'silhouette'` with a rim from screen-right. A fully lit figure (a pale shirt) would screen in as a white ghost.

**RIG and these anchors.** The demos draw the real Daniel from `RIG` where it is loaded (falling back to stand-ins):

- **`c3`**: `RIG.draw(g, 'daniel', { at: a.kneel, scale: a.k, view: 'profile', body: 'kneel', armR: { to: a.hand, palm: 'down' }, armL: 'down', head: { nod: 0.8 }, face: 'down', collar: 'crooked' }, { mode: 'silhouette', light: a.light })`.
  - Aim the arm at `a.hand`. The rig's named `'reachIn'` drops it below the sill; the approved frame holds it level into the car at window height, behind the hinge frame.
- **`door`**: `RIG.draw(g, 'daniel', { at: [a.face[0] - 0.31 * a.k, a.face[1] + 1.41 * a.k], scale: 0.86 * a.k, view: 'profile', body: 'stand', lean: 0.9, armR: 'reachLow', head: { nod: 0.75 }, face: 'down', eyes: 'down' }, { light: Object.assign({ back: 0.9 }, a.light) })`. That places his bowed face at `a.face` with the rig as it stands today.
- **`window`**: `RIG.draw(g, 'daniel', { at: [a.reflection.x, a.reflection.y], scale: a.reflection.k, view: 'front', body: 'stand' }, { light: a.light })`.

## The site, and the sun

This is approximate; each view is composed for its own frame, but the light agrees across them.

- **The building.** The nursery is a low single-storey brick building with a pitched roof. Its long north wall faces the street across an open tarmac car park, and carries the mural and the main entrance. The east end is screen-left when you face the wall.
- **The playground** is at the west end, fenced, with the swings.
- **Daniel's car** stands alone out in the car park. It faces east, with its right flank (Emily's side, right-hand drive) toward the nursery.
- **The sun** stands low in the west-north-west:
  - it rakes the wall from screen-right;
  - it sits behind the car's tail;
  - it is ahead of the camera in `c3`, `door`, `blink` and `playground`.

## The views, in story order

| view | beat | what |
| --- | --- | --- |
| `arrive` | Q11 32–38, A080 | Through his front passenger window, the painted wall slides in and stops |
| `building` | Q11 32–38, A080 | The nursery at dusk: the long low wall and its animals running to the sun |
| `playground` | Q11 38–42, A081 | The silent playground: the swings, long shadows toward us |
| `entrance` | Q11 42–48, A082–A083 | The main entrance square on: he hurries in, he stops |
| `boarded` | Q11 48–52, A084 | The door close: the plywood, the scratched lock, the notice at eye level |
| `notice` | Q11 52–62, A085–A087 | INSERT: the notice, verbatim, then his face in the sleeve's sheen |
| `carpark` | Q11 68–72, 82–84; Q12 4–9 | The car alone in the car park, wide; he turns, he runs; the locks answer |
| `window` | Q11 72–80, A099 | The dark rear passenger window: only his own reflection, the dusk sky behind him |
| `handle` | Q12 0–4, A102 | The rear door handle, close: LOCKED, the yank; his reflection in the glass above |
| `blink` | Q12 4–9, A103 | The remote, and the indicators blinking amber into the dusk |
| `door` | Q12 9–24, A104–A107 | The open rear door from behind it: it swings open; Daniel through its glass |
| `c3` | Q12 24–60, A110–A113 | **C3, held**: the sun sinks out of the glass, the frame drops toward teal-black |

---

### `arrive`: through the passenger window (A080)

This rhymes with Q06. In the morning the painted wall slipped past this window out of focus; now it slides in and stops, in focus, drained by the dusk.

- **What it shows.** The camera sits at the front passenger seat, 16 m from the wall, looking south across the car park. The parallax is real: the sky is fixed, the wall and its roof slide at the wall's rate, and the bollards 6 m off slide faster.
- **The frame.** The window's frame (B-pillar left, the raked A-pillar right, the door top across the foot) is flat silhouette with no interior detail. The wing mirror at the lower right holds the road behind, empty.
- **State:**
  - `slide`: metres still to travel; 0 is stopped. Positive values shift the world to the right, so as `slide` → 0 the wall moves left, the way scenery passes a left-hand window.
  - `blur`: 0..1 horizontal motion smear (cached). Tie it to the speed.
  - `dip`: 0..1, the nose dipping as he brakes (up to 10 px).
  - `tod`.
- **Anchors:** `door` is the boarded door when stopped, about (858, 572). `wallK` = 78 px/m. `window` is the opening's box.
- **Light:** `{x: 2400, y: 300}`, the low sun off frame right.

```js
const k = FILM.seg(st, 0, 2.6, 'outCubic');          // braking to a stop over 2.6 s
SETS.nursery.views.arrive.back(c, t, { slide: 9 * (1 - k), blur: 1 - k, dip: Math.sin(k * Math.PI) * 0.6 });
```

### `building`: the nursery at dusk (A080)

- **What it shows.** The camera is low on the car park's edge. The long low brick wall rushes from the left edge toward the low sun at the right. The mural is in true perspective: the hippo, the elephant, the boarded door (a pale slot), the giraffe, the flamingo, the windows giving back the sunset, the whale, the zebra. The playground's fence and swing frame sit at the far end against the copper sky; the foreground is empty tarmac falling into shade.
- **State:** `tod`.
- **Anchors:**
  - `door`: (871, 672).
  - `k`: 77 px/m at the door.
  - `ground(x, z)`: a screen point and `k` for any spot on the ground, in the site's metres (x along the wall from its east end, z toward the wall; the car park is z < 0).
- **Light:** the sun, off the right edge.

Cars: to brake Daniel's car into this view, use `SETS.car.exterior(c.g, { cam, at, heading, tod: 'dusk' })` with your own camera, or composite over the frame. The view does not draw a car.

### `playground`: silent (A081)

- **What it shows.** Low, at the playground's edge, looking west into the last of the sun. The two swings hang still, broadside, the sun just beyond the frame's right leg, and their long shadows (legs, chains, seats, fence) rake toward us across the copper tarmac. The classroom wing is on the left; its window is a copper mirror at this grazing angle (the shot's pane). There is a worn painted ring on the tarmac and the low fence. No one is there.
- **State:** `tod` (`'dusk'` keeps the frame and loses the shadows).
- **Anchors:** `sun` (1279, 567); `horizon` 625.
- **Light:** the sun.

The same swing frame and colours appear far off in `c3`.

### `entrance`: the main entrance (A082–A083)

- **What it shows.** The boarded door, almost square on (the camera turns 7° to the west, so the wall recedes gently toward the sun), set in the painted wall. The elephant on the east side raises its trunk at it; the giraffe on the west side cranes over it, its head breaking out of the painted panel onto the brick. The low sun rakes the wall from the right above the shade the far trees throw, so the plywood, the lock and the notice catch the copper while the pavement and the foot of the wall lie in cool shade.
- **Depth.** The canopy and the eaves are seen from below in true perspective. The step sits before the door. Copper strips of light lie on the paving to the west, and a defocused bollard and railing stand in the left foreground.
- **The pane.** The glazed sidelight beside the door gives back the car park behind the camera, with his car small in it.
- **State:** `tod`, and `reflect(g, a)` for Daniel in the sidelight (`a.reflection` is his feet; `k` ≈ 86 px/m; clipped to the pane).
- **Anchors:**
  - `stop`: (925, 922), his feet when he stops 1.1 m from the door.
  - `k`: 254 px/m there.
  - `ground(u, d)`: any point in front of the wall, as `{x, y, k}` (u along the wall, d metres out from it).
  - `door` (933, 632), `notice` (925, 530), `lock` (1020, 637), `side` (the sidelight's box), `wallK` 204 at the door.
  - `camera`: the view's camera (`cs`, `proj`, `path`), for placing anything else in its world.
- **Light:** `{x: 2500, y: 300, color: '#F2A468'}`, from screen-right.

```js
const v = SETS.nursery.views.entrance, a = v.at({});
v.back(c, t, { tod: 'evening' });
const p = v.ground(12.4, FILM.key(st, [[0, 4.2], [4, 1.1, 'outCubic']]));    // he hurries in from behind the camera and stops (d metres from the wall)
RIG.draw(c.g, 'daniel', 'walkAway', { x: p.x, y: p.y, scale: p.k, light: a.light });
v.front(c, t, {});
```

### `boarded`: the door, close (A084)

- **What it shows.**
  - The plywood screwed over the door's broken glass, pale and fresh, with a cathedral figure in its face veneer.
  - **Fresh scratches score the lock**: a screwdriver slipping off the keyway again and again, short parallel gouges clustered at the cylinder, a scraped patch of bare metal, a few long slips and splinters at the plywood's edge. They glint in the sun.
  - The notice taped at eye level, its words legible.
  - The elephant's head and raised trunk at the left edge; the sidelight at the right, holding the car park and his car.
- **State:** `tod`, `reflect(g, a)` (his reflection in the sidelight).
- **Anchors:** `lock` (1426, 845), `notice` (1156, 541), `side`, `k` 575 px/m at the door.

The frame is still. A slow tilt from the lock up to the notice with `c.camera({ y })` works (the cache is full frame).

### `notice`: the INSERT (A085–A087)

The notice, printed on A4 paper in a punched plastic sleeve, taped to the plywood a little off true, with the low sun raking it from the right. The words are verbatim and are the only words in the set:

> DUE TO VANDALISM OVERNIGHT, PLEASE USE THE SIDE ENTRANCE. TODAY ONLY.

- **Type.** Archivo 700, black toner. The text is set as "DUE TO / VANDALISM / OVERNIGHT, / PLEASE USE THE / SIDE ENTRANCE." with "TODAY ONLY." underlined beneath. Only the line breaks are a design choice.
- **The sheen.** The sleeve's sheen is a diagonal glare band of bright western sky.
  - At `sheen` ≈ 0.2 (the default without `reflect`) the words read cleanly. This is the INSERT.
  - Raise it to 1 when he stares. The words wash out inside the glare band, except where his head blocks it: his head-and-shoulders silhouette keeps the words dark and sharp. That is how a sleeved notice really shows your reflection, and it reads as "his face in the sleeve's sheen".
- **State:**
  - `tod`.
  - `sheen`: 0..1.
  - `reflect(g, a)`: his face front-on, centred (he stands where the camera is), at `a.face` (966, 510), `a.k` 1250 px/m. Light it from screen-right (the sun on his right cheek), dark elsewhere.
  - `shadow`: 0..1, optional, his shadow sliding onto the plywood from the left edge.
- **Anchors:** `face`, `k`, `sleeve` (its rect), `paper`.

```js
v.back(c, t, { sheen: FILM.seg(st, 0, 2.5), reflect: (g, a) => RIG.face(g, 'daniel', { at: a.face, size: 0.3 * a.k, face: 'blank' }, { mode: 'silhouette', light: a.light }) });
```

### `carpark`: his car alone (Q11 68–72, 82–84; Q12)

- **What it shows.** Wide, from the entrance, at eye height. His car stands alone, side on, its dark rear window turned to us. The low sun is off frame left behind its tail, so the sky warms on the left. The car lays its long shadow east across the empty copper tarmac. Beyond are the street's low wall and railings, a lamp post, and roofs and trees.
- **The car** is the car set's model (`SETS.car.exterior`, `tod: 'dusk'`, this view's sun, sky-only reflections, `interior: false`), cached with the set. If the car set is not loaded, this set's own hatch stands in.
- **State:** `blink`: 0..1, the indicators (live). Use `SETS.car.blink(lt, 7.6)` for Q12's BEEP.
- **Anchors:**
  - `daniel`: (970, 887), a foreground spot 4 m in front of the car.
  - `k`: 248 px/m there.
  - `ground(x, z)`: any tarmac point in car coordinates (x toward us, z toward screen-right; the car's middle is at the origin).
  - `rearWindow` (916, 552), `car` (917, 739).
- **Light:** the sun, off frame left (`{x: -700, ...}`).

### `window`: the dark rear passenger window (A099)

- **What it shows.** Close on the right rear door's window from outside, as a pure black mirror. It gives back the dusk sky behind Daniel and, low across its foot, the nursery reversed and bowed by the curved glass: the real mural (whale, giraffe, the pale boarded door, elephant, hippo), dimmed.
- **Continuity.** The same mirror-world runs on across the quarter glass and the front door glass.
- **Framing.** The B-pillar, the sash, the roof's edge catching the copper toward the tail, the shoulder giving back the eastern sky, the handle, and the door falling into dark below.
- **State:** `reflect(g, a)`, and `dist` (how far he stands from the car, in metres; default 7). His reflection grows as he comes closer.
- **Anchors:**
  - `a.reflection`: his feet, below the glass's foot.
  - `a.k`: 179 px/m at 7 m. He is centred in the glass in front of the reflected door, his upper body against the sky.
  - `a.light`: his rim, from the sun on the left.
  - `glass`: the pane's box.

```js
v.back(c, t, { dist: 7, reflect: (g, a) => RIG.draw(g, 'daniel', { at: [a.reflection.x, a.reflection.y], scale: a.reflection.k, view: 'front', body: 'stand', face: 'drained' }, { light: a.light }) });
```

### `handle`: LOCKED (A102)

- **What it shows.** The rear door's pull handle, close. The dark glass above it holds the reversed nursery and sky, and his reflection, near and large.
- **Layers.** `back()` draws the door, the handle's dark recess, the glass and his reflection. **Draw his hand next:** its fingers go into the recess. `front()` then lays the pull bar over his fingers.
- **State:**
  - `pull`: 0..1, the bar drawn out 2.8 cm. It gives; the door does not.
  - `jolt`: 0..1, the car's small shudder as the lock holds. Drive it as a short impulse.
  - `reflect(g, a)`: chest and face front-on, chin near `a.reflection` (1183, 621), `k` 1000 px/m.
- **Anchors:** `handle` (757, 927), `k` 2586 px/m at the handle (for `RIG.hand`), `glassFoot`.

### `blink`: the remote, and the indicators (A103)

- **What it shows.** We stand where Daniel stands, by the rear door, and look back along the flank toward the low sun. The dark rear quarter and the tail lamp are close; the copper sunset and the far line lie beyond. The indicator segment in the tail lamp and the mirror repeater blink amber into the dusk, with a glow on the paint and bloom. The car's long shadow comes toward us.
- **State:**
  - `blink`: 0..1, the light level. Use `SETS.car.blink(lt, 7.6)` so it matches the car set's flashes and Q07's BEEP.
  - `focus`: 0..1. At 0 the car is sharp; at 1 the car is soft behind his hand and the fob in the foreground (a cached defocus, crossfaded: rack it as the beep happens).
- **Anchors:** `remote` (1480, 820), `remoteK` 2600 px/m for the hand insert; `tail`, the lamp (1113, 657); `sun`; `horizon`.

### `door`: the open rear door, from behind it (A104–A107)

C3's grammar, with the eye raised to Daniel's stooped face.

- **The camera** stands against the front door, 4 cm outside the flank. The rear door (a real 3D door on its hinge) swings from flush with the flank to open, its outer skin turning toward us.
- **What we see.** Through its privacy glass, Daniel, stooped into the doorway, his eyes going down to the right, below the frame, to something the door's panel and the hinge band hide. The doorway itself is edge-on behind the hinge band at every angle.
- **Beyond.** C3's world, re-aimed for this eye: the playground and swings on the left, the copper tarmac, the sun in the glass to the left of his head.
- **The near bodywork** on the right is out of focus: the front door's glass at a grazing angle is a dark mirror holding the horizon's copper seam.
- **State:**
  - `open`: 0..1, closed to 75°.
  - `set`: the sunset, as in `c3`; default 0.
  - `figure(g, a)`: Daniel through the glass.
  - `figureTint`: default `#7A8C90`.
- **Anchors:**
  - `face`: (1246, 496), where his stooped face sits behind the glass at full open: over the doorway's outer edge, close to the hinge band, with the sun 270 px to its left.
  - `k`: 1105 px/m there.
  - `feet`: his feet's ground point (below frame).
  - `hinge`: x 1413, his reaching arm goes behind it.
  - `sun`: (974, 500).
  - `handleAt(s)`: the door handle's screen point at that opening, for his hand as he pulls.
- **Light:** `lightAt(s)`, the sun behind-left. Rim the back of his head and shoulder. His face is in shadow, with a faint cool fill from the eastern sky behind the camera.

```js
const v = SETS.nursery.views.door, s = { open: FILM.seg(st, 0, 1.6, 'outCubic'), figure: (g, a) => RIG.draw(g, 'daniel', { at: [a.face[0] - 0.31 * a.k, a.face[1] + 1.41 * a.k], scale: 0.86 * a.k, view: 'profile', body: 'stand', lean: 0.9, armR: 'reachLow', head: { nod: 0.75 }, face: 'down', eyes: 'down' }, { light: Object.assign({ back: 0.9 }, a.light) }) };
v.back(c, t, s); v.front(c, t, s);
```

### `c3`: THE DOOR, held (the film's last image)

Ported from `src/C3_door.html`; at `set: 0.3` it reproduces the approved frame.

- **What it shows.** We look through the glass of the open rear door, the same privacy glass that hid her. The camera crouches against the car's flank at the beltline, so the doorway is exactly edge-on. Daniel kneels beyond the pane, a silhouette against the sun, head bowed, his near arm reaching into the car behind the hinge frame.
- **The light.** The horizon lies on the window's lower edge and the sun sinks out of the glass. Outside the glass, untinted and copper, the swings hang still and their long shadows rake toward us.
- **State `set` (0..1), the sunset:**

| `set` | what you see |
| --- | --- |
| `0` | The disc whole, resting just above the sill (Q12 24–30, when he drops to his knees). |
| `0.3` | Half the disc: the style frame. |
| `~0.62` | The last sliver gone. The direct light, the rims, the swings' shadows and the copper on every edge have faded with the visible disc (`lightK`). |
| `0.62 → 1` | The afterglow fades and the frame drops toward teal-black (`nightK`, from 0.5). At 1 it is very dark but not black: the door's edge and Daniel's silhouette are still just there, so the cut to black at 59.5 still lands. |

- **Recommended timing.** `set = FILM.seg(st, 0, 28)` across the hold (31.5–59.5): the disc leaves the glass over about 17 s and the last 10 s darken. The sun moves linearly, so ease `set` yourself if you want.
- **State:** `figure(g, a)`, Daniel through the glass, tinted mildly (`figureTint`); `set`. For a pure silhouette the tint is invisible: pass `figureTint: null`, or draw him between `back` and `front`, to save the scratch pass (about 3 ms).
- **Anchors:**
  - `kneel`: (1106, 1006), the ground point under him (hidden by the door panel).
  - `k`: 470 px/m at his depth.
  - `face` (1196, 470), `head` (1160, 420), `shoulder` (1090, 462).
  - `hand`: (1392, 528), where the arm passes behind the hinge frame.
  - `hinge` x 1362, `sill` y 562, `horizon` 560, `sun` (912, 568), `window` (the glass's box).
  - `path`: the window's Path2D.
- **Light:**
  - `light`: `{x: 872, y: 458, color: '#F4AE72'}`.
  - `lightAt(s)`: the sinking sun, with `k` = rim strength 1 → 0.
  - `sunY(set)`, `lightK(set)`, `nightK(set)`: the curves, exposed.
- **Post:** the style frame used `{ vig: 0.5, grain: 0.06, halation: 0.6 }`. The demos use the same.

```js
// Q12 31.5-59.5
{ at: 31.5, name: 'C3, held', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, st) {
    const v = SETS.nursery.views.c3, s = { set: FILM.seg(st, 0, 28), figure: (g, a) => RIG.draw(g, 'daniel', { at: a.kneel, scale: a.k, view: 'profile', body: 'kneel', armR: { to: a.hand, palm: 'down' }, armL: 'down', head: { nod: 0.8 }, face: 'down', collar: 'crooked' }, { mode: 'silhouette', light: a.light }) };
    v.back(c, st, s); v.front(c, st, s); } }
```

---

## The mural (`SETS.nursery.mural`): the same wall for Q06

The bright animals painted along the nursery's street wall. In Q06 the roads set blurs this exact wall past the passenger window, in morning light, "blurred to bands of colour". Every view here paints it from one vector definition, at any scale.

### The wall

- **Size.** 32 m long; the eaves at 2.9 m; a cream painted panel (`#E8DFCC`) from 0.5 to 2.42 m, edged top and bottom with a navy line (`#3A4F78`).
- **The building.** Red-brown brick (`#8C4A36`, mortar `#B9A890`) above and around the panel, on a dark plinth (`#4E3A34`). A low concrete-tile roof (`#4C4648`), a white fascia, and a black gutter.
- **Fixed elements.**
  - Two classroom windows: white frames, at u 3.1–5.5 and 18.5–20.9 m.
  - A downpipe at u 21.6.
  - **The main entrance** at u 11.55–14.05: an aluminium door (u 12.0–13.0) whose glass is boarded with plywood since last night, so it is already boarded in Q06's morning.
    - A glazed sidelight (u 13.07–13.55, wired glass, intact).
    - A canopy, and a step.
    - The lock at (12.93, 1.02); the notice at eye level (u 12.46, from 1.40 m).

### The animals

Flat shapes, no outlines, 2–3 tones each. They stand on the panel's foot (0.545 m) at the listed scale.

| u (m) | animal | colours (body / detail / accent) | pose |
| --- | --- | --- | --- |
| 1.75 | lion | `#E07A3C` / mane `#A8452A` / face `#F09A5C`, muzzle `#F6DCC0` | standing, facing east, tail curled up; round petalled mane |
| 7.0 | hippo | `#8B6BB0` / `#74579A` / snout `#B49ACF` | standing, facing east, little ears |
| 9.85 | elephant | `#4F80C2` / `#3C6AA8` / ear `#86A9DA`, tusk `#F2EAD8` | facing the door (east), trunk raised and curled |
| 15.05 | giraffe | `#DB8A45` / legs `#B86E32` / net of patches `#8E4E26`, mane `#7A3E20` | west of the door, facing it; neck rising beside the frame, head breaking out of the panel onto the brick |
| 17.15 | flamingo | `#E58397` / wing `#C9667A` / legs `#D0707F`, beak tip `#2A2A30` | on one leg, S-neck |
| 23.4 | whale | `#2C78A4` / fin `#22608A` / belly `#A8CCE0`, spout `#C4DCEA` | smiling, three-plume spout |
| 27.0 | zebra | `#F0EBDF` / stripes `#2A2C34` | standing, facing east, bold curved stripes |
| 30.2 | snail | shell `#E06E5C`, spiral `#F4D8C0` / body `#9FB4C6` | small, eye stalks up |

Small blue birds (`#5A86C8`, beak `#E08A3C`) at u 2.9, 6.2, 16.5 and 25.3, and pale clouds (`#CAD8DF`) at 5.9, 22.0 and 29.4, sit on the panel's upper part.

**The palette avoids Emily's yellow (`#E0B34F`) and the phone's green (`#7BE6A0`)**, which belong to them. The giraffe is orange-tan; the whale was blued so that the copper light cannot turn it green. Blurred, the wall gives bands of blue, violet, orange-tan, pink, teal-blue and white.

### The three lights

| light | when | what it does to the wall |
| --- | --- | --- |
| `morning` | Q06 | The north face in soft morning shade: true colours, slightly cool. |
| `evening` | Q11 | The low sun rakes from the west above a soft shade line (low at the west end, rising east). The colours are drained about 50% under a copper light (`#D6A688`) and a violet-grey shade (`#7E788C`). Copper catches the fascia, the canopy's lip and the windows' west reveals. Protruding things throw long shadows east along the wall. |
| `dusk` | late Q11, Q12 | The wall is in its own shade, drained 55% and violet, with copper only on the roof's edge. |

In every light, the glass gives back the sky.

### API

```js
const M = SETS.nursery.mural;
M.pass(c, g, { tod: 'morning', pxm: 120, x: 0, u: 6 + st * 9, yGround: 560, blur: 140 });   // Q06: the wall passing a side window
M.canvas(c, 'morning', 120, 140);       // the whole wall (u 0..32 m, y 0..3.3 m) as a cached canvas; the last argument is a smooth motion smear in px
M.paint(g, x, y, pxm, { u0, u1, y0, y1, tod, ridge });   // paint any part of the elevation into any context
M.colors, M.items, M.scale, M.length, M.eaves, M.panel, M.entrance, M.lock, M.notice   // the definition above, as data
```

- `pass` draws the wall square on, with metre `u` at screen `x` and its foot at `yGround`.
- `canvas` and `pass` cache under `nursery|mural|<tod>|<pxm>[|b<blur>]`, with the blur quantised to 8 px.

---

## Demos and cost

Render the demos with `node tools/set.js nursery 1` → `out/set_nursery.png`. There is one demo per view and state that matters, plus the mural in its three lights and the Q06 pass.

The demos draw Daniel with `RIG` where it is loaded, using the calls above; otherwise they draw stand-ins (the style frame's kneeling silhouette, and rough shapes) to show placement. The sequences draw him with `RIG` at the anchors.

The demos cover each view and state that matters:

- the mural in its three lights, the Q06 pass, and an entrance detail;
- `entrance` (evening, dusk), `boarded`, `notice` (insert; his face in the sheen);
- `window` (empty; his reflection), `handle`;
- `blink` (BEEP; the remote with focus on the hand), `carpark` (alone; the locks answer);
- `building` (evening, dusk), `arrive` (braking; stopped), `playground`;
- `door` (opening 0, 0.5, 1 with Daniel, 1 empty);
- `c3` at set 0, 0.3, 0.55, 0.75 and 1.

Measured cost (ms/frame through `tools/set.js`, engine post included). The set alone is 10–45 ms; a RIG figure adds roughly 10–40 ms depending on size.

| view | ms |
| --- | --- |
| `c3` | 25–43 |
| `door` | 20–31 (50–85 with RIG Daniel at close-up size) |
| `entrance`, `boarded`, `building`, `playground`, `carpark` | 10–17 |
| `notice` | about 30 |
| `window`, `handle` | 11–45 |
| `blink` | 12–14 |
| `arrive` | 33–35 |

The first frame of a shot builds its caches: about 100–400 ms once.

Per-frame work:

- **`c3`:** two crossfaded layers outside, two through the glass, the sun and its glows (bounded), the glass overlays, the door (lit/night crossfade) and one multiply for the night.
- **`door`:** the door is re-projected per frame from the 3D model (the glass, the sash ring and the skin are exact projected polygons); everything else is cached.
