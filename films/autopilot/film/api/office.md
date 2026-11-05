# SETS API: office.js

`SETS.office` (`film/sets/office.js`): the refrigerated world of Q07, Q08, Q09 and Q10. An open-plan floor behind sealed, blue-tinted glazing, teal-grey and cool. The outside is a white rectangle.

Every view looks through a pane:

| View | The pane |
| --- | --- |
| `desk` | a meeting room's glass partition with its frosted band |
| `laptop` | the laptop's black screen |
| `photo` | the photograph's glass |
| `projector` | the projector's lens and a glass table |
| `table` | the conference table's glass |
| `print` | a framed print's glass |
| `kitchen` | the kitchenette's glass door |
| `microwave` | the microwave's door |
| `phone` | a phone's glass |
| `window` | the kitchenette window, holding the hot day back |

**Colour rule.** Emily's yellow `#E0B34F` appears in this set once: in the photograph (view `photo`), on her cardigan. The `desk` view only ever shows the frame's back.

**Diegetic time.** `laptop` shows `s.clock` in the menu bar's corner (the film's 5:37). `print` shows the conference room's clock, reflected in the print's glass (10:18 to 11:43). No other clock appears.

## Using a view

```js
const v = SETS.office.views.desk, s = { tod: 'morning' };
v.back(c, st, s);                          // room, window wall, far desks, his chair (and jacket)
RIG.draw(c.g, 'daniel', { at: v.anchors.daniel.seat, scale: v.anchors.daniel.scale, view: 'three', body: 'sit', outfit: 'office' }, { light: v.light });
v.front(c, st, s);                         // his desk and laptop (props), then the partition glass
```

- `back(c, t, s)` draws what is behind the characters and `front(c, t, s)` what is in front.
- `t` drives the animation (dust in the beam, the phone's buzz, the heat outside, the coffee machine).
- `anchors` are screen points with px-per-metre scales. For `RIG.draw` with `body: 'sit'`, `at` is the **seat** point (the rig's convention); for standing figures it is the feet.
- `light` is the one motivated light. Pass it to `RIG.draw` as `{light}`.
- **Reflection hooks.** `s.reflect(g, R)` lets the sequence draw a character into a pane's reflection. The set keeps it to the glass and lays it in as that glass gives things back (`screen` in black glass, so only the lit parts show).
- Caches are keyed `office|...`. A shot's first frame builds them (0.2–0.8 s).
- Views are authored for `c.camera` zoom ≥ 1.

## Views

### `desk` (Q07 24–54, Q09 32–44, Q10 4–18): across the floor to his desk

A medium shot through a meeting room's glass partition. The frosted manifestation band crosses the upper frame; the meeting room's lights are faint in the glass. There is a dust and glare streak, the partition's slim frame at the left, and the meeting table's edge soft at the bottom (the subtitle band's shade). Daniel sits at his desk facing us, against the white band of the window wall: sealed blue glazing, blinds lowered to different heights, the outside blown to white with faint rooftops. Colleagues sit at the next desks (quiet silhouettes with rims) under the ceiling's grid of lamps. His laptop's back faces us, along with the photo frame's easel back, a mug, papers and a small plant. His navy jacket hangs over his chair.

| state | default | what |
| --- | --- | --- |
| `tod` | `'morning'` | `'morning'`, `'afternoon'` (blinds lower) or `'evening'` (outside peach-white; far lamps off). |
| `empty` | true in the evening | Half the floor gone home: one colleague left. |
| `laptop` | `'open'` | `'closed'` once he has shut it (Q10). |
| `jacket` | true | His jacket on the chair (false: he has taken it). |
| `glow` | 0 | 0..1, the laptop's light spilling on the desk in front of him. |
| `props` | true | `false`: `front` does not draw his desk. Call `view.props(c, t, s)` yourself, e.g. after Priya passes in front of the desk. |

- **Anchors:**
  - `daniel.seat`, `daniel.scale`: seated, facing us.
  - `standing` `{x, y, scale}`: arriving beside the desk, loosening his tie.
  - `priya` `{from, to, scale}`: the aisle behind him, right to left, against the window band. Draw her after `back`; `front` puts the desk in front of her.
  - `priyaFront`: in front of the desk (call `props` before drawing her and pass `props: false` to `front`).
  - `laptop`, `photo`: screen points.
- **Light:** the window behind him (cool white) for rims; the lamps fill.

```js
const v = SETS.office.views.desk, a = v.anchors, u = FILM.seg(st, 0, 6), s = { tod: 'morning' };
v.back(c, st, s);
RIG.draw(c.g, 'daniel', { at: a.daniel.seat, scale: a.daniel.scale, view: 'three', facing: -1, body: 'sit', face: 'smile', outfit: 'office' }, { light: v.light });
RIG.draw(c.g, 'priya', { at: [lerp(a.priya.from[0], a.priya.to[0], u), lerp(a.priya.from[1], a.priya.to[1], u)], scale: a.priya.scale, view: 'three', facing: -1, body: 'walk', phase: FILM.twos(st) }, { light: v.light });
v.front(c, st, s);
```

### `laptop` (Q07 47–54, Q09 montage, Q10 0–8): the screen as a pane

Close on his laptop's screen (dark space-grey, the keyboard's edge in shade along the bottom).

- **Black:** the screen holds what is behind him: the window band, the ceiling's lamps, the far desks, and his face.
- **Waking:** the backlight comes up and the screen's light finds his face (the reflection brightens); then the interface fades in over the reflection, which survives in its dark sidebar.
- **On:** an email client. No legible words, except the time in the menu bar's top-right corner.
- **Closing:** the lid turns down toward the keys, the reflected office folds away (twice as fast as the lid), and the lid ends as its aluminium back.

| state | default | what |
| --- | --- | --- |
| `screen` | `'on'` | `'off'` (black glass) or `'on'`. |
| `wake` | from `screen` | 0..1 overrides: 0 black; about 0.35 lit face, no interface; 1 fully on. |
| `content` | `'email'` | `'email'` (a written draft with a send button), `'report'` (a document and a bar chart, morning) or `'sent'` (the draft gone). |
| `clock` | none | A string for the corner, e.g. `'5:37'` (Libre Franklin, legible at 1080p and under a push-in). |
| `lid` | 0 | 0 open .. 1 shut. |
| `tod` | `'morning'` | Tints the reflected window band (evening: peach). |
| `reflect(g, R)` | none | Draw his face into `g`: `R.x, R.y` is the centre of his reflected face, `R.scale` px/m (about 2240: a head about 540 px tall), `R.lit` 0..1 (raise the figure's `exposure` with it), `R.light`. |

- **Anchors:** `screen` (the four corners, open), `clock` (the corner point where 5:37 sits; push in on it), `face` `{x, y, scale}`.
- **Light:** the screen itself.

```js
const v = SETS.office.views.laptop, w = FILM.seg(st, 0.5, 2.5);
v.back(c, st, {}); v.front(c, st, { wake: w, content: 'report', reflect: (g, R) => RIG.draw(g, 'daniel', { at: [R.x, R.y + R.scale * 1.62], scale: R.scale, view: 'front', body: 'stand', face: w < 0.6 ? 'tired' : 'concentration', outfit: 'office' }, { light: R.light, exposure: 0.55 + 0.6 * R.lit }) });
// Q10: v.front(c, st, { wake: 1, content: st < 5 ? 'email' : 'sent', clock: '5:37', tod: 'evening', lid: FILM.seg(st, 6, 7.2, 'inOutCubic') })
```

### `photo` (Q09 44–58): the photograph on his desk

The small photograph in its thin black frame, close, on the pale desk. Sarah and Emily are both laughing, eyes closed, at something just outside the frame (to the right), on a summer afternoon in a garden. They are drawn by the rig (`face: 'laugh'`), warm-graded inside the glass; Emily's mustard cardigan carries the only yellow after the morning.

The frame's glass holds the office's lamps as soft bright shapes. As the frame turns, they slide across it (twice the frame's angle). Turned away, the glass takes the white window and the photograph goes under the glare; straightened, the glare moves aside.

| state | default | what |
| --- | --- | --- |
| `angle` | 0.5 | Radians the frame is turned away from him. 0 = straightened, facing him. |
| `tod` | `'morning'` | Tints the glare (evening: peach). |

- **Anchors:** `grip` (the frame's right edge where his fingers turn it; updated each frame for `angle`).
- **Light:** the lamps overhead.

```js
const v = SETS.office.views.photo, a = 0.5 * (1 - FILM.seg(st, 6, 8.5, FILM.ease.settle));
v.back(c, st, { tod: 'afternoon' }); v.front(c, st, { angle: a, tod: 'afternoon' });
// RIG.hand(...) at v.anchors.grip while it turns
```

### `projector` (Q08 0–6): the lens, the beam through dust, the numbers on the wall

A dim conference room, blinds drawn against the heat (their edges burning white). A projector on the glass table throws a beam across the room. The beam is a soft frustum, hot at the lens (posterised rings), with dust turning in it, landing on the side wall as a slide of figures and a bar chart (the world's own numbers, page 4). The glass table gives the slide back.

- **State:** none (the dust moves with `t`).
- **Anchors:** `seats` (two colleagues across the table, `body: 'sit'` at the seat, so their heads cut the beam), `lens`.
- **Light:** the beam.

### `table` (Q08 6–20): the glass table; the window that opens

Low at the end of the long glass table, looking down its length: chairs along both sides, Daniel at the far end before the slide, the blinds on the right wall. The glass is a dark mirror: the slide, the blinds' edges, and the colleagues (given back by the sequence). When someone opens the casement on the right, the hot white day pours in: a blaze of glare over everything, the table's glass whitening, and the papers on it lifting and fluttering. Then it shuts.

| state | default | what |
| --- | --- | --- |
| `window` | 0 | 0..1, the casement opening (about 38° at 1). Snap it open and shut. |
| `reflect(g, R)` | none | Draw the colleagues again for their reflection in the glass table. `R.seats[i]` `{x, y, scale, mirrorY}`; `R.mirror(g, y, fn)` flips your drawing about the screen line `y` (use `R.seats[i].mirrorY`). The set keeps it to the tabletop at the glass's strength. |

- **Anchors:** `daniel` `{x, y, scale}` (the far end, standing), `seats` (the six chairs: the near two are close and cut by the frame).
- **Light:** the slide behind Daniel; the window when it opens.

```js
v.front(c, st, { window: st > 3 && st < 4.4 ? FILM.seg(st, 3, 3.5) : 0, reflect: (g, R) => R.seats.forEach((p, i) => R.mirror(g, p.mirrorY, gg => RIG.draw(gg, 'extra', { at: [p.x, p.y], scale: p.scale, body: 'sit' }, { light: R.light }))) });
```

### `print` (Q08 20–26): the wall clock in the glass of a framed print

A framed print on the conference room wall: a pale coastal photograph (sand, a grey sea, dune grass) in a wide mount. Its glass holds the dim room (the blinds' white edges, a veil) and the wall clock opposite. As a reflection only adds light, the clock's white face whitens the picture and its hands are where the picture shows through. The face has no numerals (a mirror would reverse them); the hands read as seen.

| state | default | what |
| --- | --- | --- |
| `time` | 618 | Minutes after midnight (618 = 10:18, 703 = 11:43) or `[h, m]`. For the time-lapse: `time: FILM.key(st, [[0, 618], [5.5, 703, 'inOutSine']])`. |

- **Anchors:** `clock` (its centre).
- **Light:** the room behind us.

### `kitchen` (Q08 26–55): the kitchenette

Through the kitchenette's glass door from the corridor: a frosted band, glare, and the steel pull soft at the left. A galley along the left wall: base and wall cupboards, the bean-to-cup coffee machine with its amber lamp, the microwave, sink and tap, a steel fridge. At the far end, a small round table and two chairs under a window full of the hot white day. Someone's phone lies on the table.

| state | default | what |
| --- | --- | --- |
| `stutter` | false | The coffee machine stutters: its lamp blinks irregularly, a drip falls. |
| `ring` | false | The phone on the table rings: screen lit (bloom), buzzing. |
| `tod` | `'morning'` | |

- **Anchors:**
  - `daniel` `{x, y, scale}`: at the counter, by the machine and the microwave (profile, facing left).
  - `priya` `{from, to, scale}`: from behind us through the door to beside him.
  - `phone`.
- **Light:** the end window.

### `microwave` (Q08 30–36): his blank second, in the microwave's door

Close on the microwave's black door: the mesh of tiny holes over everything behind the glass, the dark control panel, the steel handle. The door holds the kitchenette's bright window and strip light behind him, and his face (via the hook), screened into the black glass under the mesh.

- **State:** `reflect(g, R)`: `R.x, R.y` is his reflected face's centre, `R.scale` about 2100 px/m.
- **Anchors:** `face`, `scale`.
- **Light:** the window behind him.

```js
SETS.office.views.microwave.front(c, st, { reflect: (g, R) => RIG.draw(g, 'daniel', { at: [R.x, R.y + R.scale * 1.62], scale: R.scale, view: 'front', body: 'stand', face: 'blank', outfit: 'office' }, { light: R.light }) });
```

### `phone` (Q08 26–30): someone's phone, ringing on the table

Top-down on the little table: a phone in a muted terracotta case (not Daniel's), face up, its call screen lit (a grey avatar, a slide bar; no green). It buzzes against the laminate. There is a mug of coffee and the window's light across the table.

| state | default | what |
| --- | --- | --- |
| `ring` | true | `false`: dark, still. |

- **Anchors:** `phone`.
- **Light:** the window.

### `window` (Q08 58–72): the hot day, held behind glass

The kitchenette window, nearly filling the frame. The city below is bleached: cream roofs, chimneys and their slit shadows, a white tower, a white sky. Heat rises off the roofs as refraction (the outside wavers in rising bands, strongest low). It is held behind the sealed, faintly blue glass, with a faint sheen, dust, the sill with two mugs and a wilting plant, and a calm, darker wall below for the long V.O.

- **State:** `reflect(g, R)`, optional: a faint figure in the glass (`R.x, R.y, R.scale`).
- **Anchors:** none.
- **Light:** the window.

## Performance (warm frames, including the engine's post)

`desk` 25–55 ms · `laptop` 27–52 · `photo` 21–37 · `projector` 13–16 · `table` 20–50 · `print` 14–46 · `kitchen` 26–33 · `microwave` 35–42 (with a RIG face) · `phone` 12–21 · `window` 13–17.

## Not built

There is no close insert of the desk surface for the Q09 montage (signs a form, ticks a box) or for Q10's sweep of bag, keys, wallet and mug. `laptop` covers "files an email", `table` and `projector` cover "another meeting", and `kitchen` covers "another cup of coffee".
