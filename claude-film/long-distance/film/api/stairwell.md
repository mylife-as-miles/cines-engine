# SETS API: stairwell.js

`SETS.stairwell` (`film/sets/stairwell.js`): the office's concrete fire stair, for Q04 *Send me one*. It is raw grey card at its heaviest grain and fibre: board-marked walls with formwork joints and tie holes, worn treads with dark anti-slip nosings, a steel balustrade over the open well, a grey-green fire door at the landing above, and one high window band in the end wall. The window's daylight falls in two cut steps down the wall on his side, and the walls lighten in cut bands toward it. He sits below the light, in the shade, where only the phone lights him. The kraft lunch bag beside him is the only warm real colour in the set.

It is a switchback stair, laid out in metres. Flight A rises ten steps from the half landing to the floor above. He sits on its seventh step, by the wall (on screen, the left). The bag sits in the empty half of the step, by the balustrade. Beyond the balustrade the well drops to the flight below, and the flight above climbs back over it: its stepped edge and soffit cut across the window band at the top right.

| View | Camera | Used in |
| --- | --- | --- |
| `wide` | From the half landing below, eye height, looking up the whole flight to the window band. He is small on the step. | Q04 0–6, 36–42 |
| `close` | From a few steps down, standing height, looking down at him a little: the stairs above behind him (the top steps, the landing, the fire door) and the treads below at the foot of the frame. | Q04 10.6–18 (he checks above, then below) |
| `tight` | The same axis, closer: his face and neck against the top steps and the door. | Q04 18–26 (the breath goes out, the colour comes up his neck) |
| `shoulder` | Over his right shoulder, from between him and the wall, looking down the flight. The phone is held up before his right shoulder, with the stair falling away behind it. The background has a slight defocus baked in. | Q04 26–36 (the blurred thread) |

**His half and the empty half.** The seam is the window band's centre mullion and the conduit that runs down from it to the landing. In `wide`, `close` and `tight` it falls between him and the bag. In `shoulder`, his head and shoulder fill the left half and the phone sits in the right.

## Using a view

```js
const v = SETS.stairwell.views.close, A = v.anchors;
v.back(c, st, { lunch: 'unopened' });                  // the stair, the wall rail, the balustrade, the bag
const look = st < 2.4 ? A.head.looks.above : st < 4.4 ? A.head.looks.below : A.head.looks.phone;
RIG.head(c, 'him', { x: A.head.x, y: A.head.y, s: A.head.s, yaw: look.yaw, pitch: look.pitch, flush: FILM.seg(st, 7.4, 15.4),
  light: RIG.light('stairwell', { keys: v.light.keys, amb: v.light.amb, phone: [A.phone.x, A.phone.y] }) });
v.front(c, st, {});                                      // nothing in front in these views; kept for the contract
```

- `back(c, t, s)` draws everything behind the characters, and `front(c, t, s)` what is in front. `front` is empty in every view: no part of the set comes between this camera and him. Call it anyway.
- **The finish.** `back` asks for the film's heaviest grain and fibre (`grain` 0.135, `fibre` 0.14, against the defaults of 0.1 and 0.09). It sets them on `c.post` only when the shot has not set its own: a shot's `post: { grain, fibre }` wins, and `s.finish: false` leaves the engine's defaults alone.
- The set is static (no animation) apart from what the sequence draws. The window band goes into the emissive buffer.
- `SETS.stairwell.prepare()` builds every view's cached layers ahead of time (about 3.4 s for all four). Call it in a sequence's `setup()`.

## State (`s`)

| key | default | what |
| --- | --- | --- |
| `lunch` | `'unopened'` | The lunch bag, which belongs to the set: brown paper, the top folded over twice, on his step by the balustrade. `'none'`: the step is empty. It is not drawn in `shoulder`, where it is out of frame behind him. |
| `finish` | true | `false`: do not raise grain and fibre. |

## Anchors

All anchors are screen points with the scale at that depth: `{x, y, scale, s, world}`. `scale` is px per metre. `s` is `0.23 × scale`, the `s` that `RIG.head` takes. `world` is the metre position. A point behind the camera or far off frame comes back as `{x: null, y: null, behind: true}`. `head` carries `yaw` and `pitch` (looking at the phone in his hands) and `looks: { phone, above, below, ahead }`, all in the `GG.head` / `RIG.head` convention (yaw 0 faces the camera; for a head turned away, a downward look has a negative pitch). `view.cam.p([x, y, z])` and `view.cam.headAngles([dx, dy, dz])` give any other point or direction.

| anchor | wide | close | tight | shoulder |
| --- | --- | --- | --- | --- |
| `head` | 884, 563 · s 66 | 897, 264 · s 159 | 929, 290 · s 420 | 620, −30 · s 572 (half above the frame: the jaw, the ear) |
| `seat` (hips, on the 7th step) | 894, 768 | 959, 655 | 1071, 1230 | 453, 1691 |
| `feet` (on the 5th step) | 854, 924 | 805, 1059 | below | 962, 1239 |
| `hands.left` / `.right` | 908, 706 / 870, 709 | 926, 632 / 847, 628 | below the frame | 682, 702 / 856, 752 |
| `phone` | 888, 694 · 320 px/m | 879, 604 · 736 px/m | 839, 1314 (below the frame) | **1182, 563 · 1717 px/m** |
| `bag` | 1026, 779 | 1215, 719 | 1777, 1509 | off frame |
| `above` (the top of the flight) | 973, 619 | 1164, 316 | 1474, 449 | behind |
| `below` (the treads below him) | 850, 1391 | 538, 2461 | behind | 1054, 1064 |
| `shoulder`, `ear` | | | | 976, 900 · s 594; 767, 43 |

- In `wide`, `close` and `tight` the phone is held in both hands over his knees, screen to his face (`world` [−0.12, 1.5, 1.38]). Its back is to us, and it lights his face from below.
- In `shoulder` the phone is held up before his right shoulder (`world` [−0.36, 1.58, 1.33]), its screen turned to his eyes. `A.phone.quad` gives the screen's four corners, true size (66×142 mm), already projected: `[tl, tr, br, bl]` as he sees it. The phone module warps its blurred grid onto that quad. It is about 260 px tall, against bare concrete.

`split`: wide 0.516, close 0.655, tight 0.70 (the conduit), shoulder 0.5.

## Light

`light` is `{ name: 'stairwell', x, y, color, amb, keys }`. The key is the window band's grey daylight from above and behind him. In `wide`, `close` and `tight` it is a rim, not a key: his face is in the shade and only the phone lights it ("the phone's smooth light is on his face only"). In `shoulder` the daylight comes from above the camera. Pass `keys` and `amb` to `RIG.light('stairwell', {...})` together with the phone's point. The red band rising up his neck is the rig's (`flush`).

## Cost

| view | set alone (warm) | first frame (builds the caches) |
| --- | --- | --- |
| `wide` | 4–7 ms | about 0.9 s |
| `close`, `tight` | 4–5 ms | about 0.95 s |
| `shoulder` | 3 ms | about 0.8 s |

These are measured in headless Chromium. A full engine frame with the finish is about 40 ms. Each view keeps one full-frame layer, a small layer per lunch state, and a quarter-size emissive layer, keyed `stairwell|<view>|...`.

## Caveats

- The stair is flipped from the usual: the wall is on his left and the balustrade on his right. That puts the open well (the void) in the empty half, and lets the `shoulder` camera stand between him and the wall with no bars between it and the phone.
- The window light is art-directed, not traced: it falls as two cut steps on the wall above him and as cut height bands on every wall. It never touches him.
- `tight` is a separate camera rather than a push on `close`, so the paper stays sharp at that size. A slow push within either view is fine.
- `close` sees only the first treads below his feet. When he checks below (Q04 13–15), he looks down past the camera; `looks.below` gives the angle.
- `shoulder`: the head is very close to the lens (about 2500 px/m). Draw it big and partly out of frame, and keep it dark, so the phone's screen is the frame's subject. The set leaves the right half (from about x = 900) clear for the screen and its glow.
