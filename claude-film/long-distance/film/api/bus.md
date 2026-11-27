# SETS API: bus.js

`SETS.bus` (`film/sets/bus.js`): the packed evening bus of Q05 *The voice message*. Dusk blue fills the windows, in cut bands over a low skyline with its lit windows. Sodium streetlights line the far road, warm shopfronts sit low in the glass, and dark posts sweep past. Inside: a cool strip light, mustard poles, grey rails and hanging straps, moquette seats. The passengers are close paper silhouettes against the glass. None faces the camera: you see profiles and the backs of heads, each with a cool rim from the window and a paler one from the strip light, and their faint reflections in the dark glass.

Each streetlight that passes throws one cut band of sodium light across everyone inside, about every 3.4 s. That stays within the brief's limit of one luminance change a second, and well inside the film's rule of three a second.

This is the one set where the empty half is not empty: strangers fill both halves (C's grammar breaks here; he is not alone, only lonely). The seam is still there: the centre window pillar and its pole.

The bus is laid out in metres: x along the bus (+x toward the front), z across it (the far windows at z = +1.2, the near ones at −1.2), floor at y = 0.

| View | Camera | Used in |
| --- | --- | --- |
| `interior` | Across the aisle to the far windows, standing height. He stands left of the pole, one hand on the overhead rail, turned three-quarters toward the glass, so his face is *in* the glass (see `s.reflect`). A stranger is pressed against his left arm, others stand and sit all round him, and two foreground strangers frame the edges. | Q05 0–6, 26–30 ("the window: his reflection in the dark glass among the others") |
| `close` | From the window side, back at him: his face against the near windows sliding past behind him, a stranger's shoulder and the back of his head against his arm (right), and the pole between them. | Q05 15–23 (ears go red, a glance at the stranger, then the floor) |

## Using a view

```js
const v = SETS.bus.views.interior, A = v.anchors;
v.back(c, st, { reflect: (g, R) => RIG.head(c, 'him', { target: g, x: R.x, y: R.y, s: R.s, yaw: R.yaw, pitch: R.pitch, shadow: false, light: v.lightAt(st) }) });
RIG.head(c, 'him', { x: A.head.x, y: A.head.y, s: A.head.s, yaw: A.head.yaw, pitch: A.head.pitch, ears: earsRed,
  light: RIG.light('bus', { keys: v.lightAt(st).keys, amb: v.light.amb, phone: [A.phone.x, A.phone.y] }) });
RIG.hand(c, 'him', 'rail', { at: A.hands.rail, ... });
v.front(c, st, {});            // the foreground strangers (interior) or the pressed stranger (close), then the passing sodium band
```

- `back(c, t, s)` draws, in order: the street outside sliding past (live, clipped to the panes); the dark glass and what it gives back (cached); the reflection hook; the bus's shell with the glass cut out (cached); then the seats, poles, rails, straps and the strangers behind him (cached).
- `front(c, t, s)` draws the strangers between us and him (cached), then the sodium band. The band is a soft-light overlay with cut edges, laid over everything, him included, so the passing light falls on his face too.
- `t` drives the street and the sodium sweeps. The outside layers slide at speeds set by their depth (the bus at 6.5 m/s): far skyline slow, shopfronts faster, posts fastest. The far side slides to screen left in `interior` and to screen right in `close`.
- `view.sweep(t)` returns `{ x, k, color, period }`: the band's screen x, and `k` (0, 0.5 or 1, in cut steps) for how much of it is on his head.
- `view.lightAt(t)` is the shot's light, with a posterised sodium key added while the band crosses his head. Give it to the rig on twos for the face.
- `SETS.bus.prepare()` builds every view's cached layers (about 3.9 s for both). Call it in a sequence's `setup()`.

## State (`s`)

| key | default | what |
| --- | --- | --- |
| `reflect(g, R)` | none | **Interior only.** Draws his reflection. Draw him into `g` (a scratch layer under the same camera; with `RIG.head`, pass `target: g`) at `R`: the mirror of his head across the window plane, with `R.yaw` and `R.pitch` as the reflected head should face, and `R.flip: true` (draw it mirrored left to right). The set lays the result into the panes with `screen` at 0.42 strength, among the other passengers' reflections. |
| `crowd` | true | `false`: `front` leaves out the foreground strangers (interior) or the pressed stranger (close). |
| `sweep` | true | `false`: no sodium band, for a frame that must hold still. |

The set has no `tod`: the bus is only seen at dusk.

## Anchors

All anchors are screen points with the scale at that depth: `{x, y, scale, s, world}`. `scale` is px per metre. `s` is `0.23 × scale`, the `s` that `RIG.head` takes. Off-frame or behind-camera points come back with `behind: true`. `head` carries `yaw` and `pitch` (looking at the phone) and `looks: { window, phone, stranger, floor }` in the `GG.head` / `RIG.head` convention. In `interior` he is turned away from the camera, so a downward look has a negative pitch.

| anchor | interior | close | what |
| --- | --- | --- | --- |
| `head` | 616, 339 · 813 px/m · s 187 | 896, 425 · 1559 px/m · s 359 | His head. In `interior` it is silhouetted against the window band, between the pressed stranger and the pole; in `close`, against the near windows, left of the pole. |
| `hands.rail` | 754, 230 | 848, −224 (above the frame) | His right hand on the overhead rail. |
| `hands.phone` / `phone` | 578, 644 / 595, 608 · 704 px/m | 1185, 1138 / 1161, 1062 (at the foot of the frame) | The phone in his left hand at his chest, screen to his face. In `close` it is below the frame, so its glow comes up from below. |
| `hips` | 616, 892 | 891, 1429 | Where his body stands. |
| `stranger` | 502, 474 | 1373, 700 | The pressed stranger's shoulder against his left arm. The set draws the stranger: in `back()` for `interior`, and in `front()` for `close`. |
| `reflection` | 848, 447 · 297 px/m · s 68 | none | His head in the glass, with `yaw`, `pitch` and `flip`. It lands in the pane right of his own head, clear of the strangers. |

`split`: interior 0.477 (the centre pillar and pole), close 0.622 (the pole between him and the stranger).

## Light

`light` is `{ name: 'bus', x, y, color, amb, keys }`. In `interior` the keys are the dusk window behind him (a cool rim from behind) and the strip light from above. In `close` they are the far windows behind the camera (a cool key from the front) and the strip light. `lightAt(t)` adds the sodium key while a band crosses him. His ears going red is the rig's (`ears`), and the waveform is the phone module's.

## Cost

| view | set alone (warm) | first frame (builds the caches) |
| --- | --- | --- |
| `interior` | 12–18 ms (the street is live: sky, two strips, posts) | about 2.3 s |
| `close` | 13–20 ms | about 1.6 s |

These are measured in headless Chromium. A full engine frame with the finish is about 50 ms. Each view keeps four full-frame layers (sky, glass, shell, crowd), a front layer, a quarter-size emissive layer and two street strips, keyed `bus|<view>|...`. With the hook, the reflection costs about 3 ms more plus the rig's head.

## Caveats

- The strangers are drawn by the set as cut-paper silhouettes. The rig draws only him. If the rig later brings its own passengers, set `crowd: false` and use the anchors, but the strangers behind him are baked into `back()`.
- The street is art-directed for the picture. It is a wide road at dusk, so the sky shows above a low skyline: from a real bus at kerb level you would see only shopfronts.
- Flash safety: any point in the frame is crossed by one sodium band every 3.4 s. A band takes about 3 s to cross the frame, and the next enters as it leaves, so the frame's overall brightness barely changes: no part of it ever flickers. Each band has cut edges and a two-step core, and covers a third of the frame at most. Keep `sweep` on its own clock; do not speed it up.
- In `interior` he is turned three-quarters away, toward the glass. His face is seen in the reflection (Q05 26–30), and in `close`, which is shot from the window side.
- The window ghosts are the other passengers' reflections. His own comes only through `s.reflect`.
