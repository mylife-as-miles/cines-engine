# SETS API: office.js

`SETS.office` (`film/sets/office.js`): the grey office of Q03 *Face down*. Open plan in flat grey card: carpet tiles laid in quarter turns, fabric dividers with a darker top rail, a suspended ceiling, and fluorescent panels whose pale green-grey light falls down every divider in cut bands and lies in pools on the carpet. Nothing in the room has a colour, so when the phone buzzes the edge of the pink bubble is the only colour on the floor. The phone's spot is bare grey card, so the phone face down reads as "a black gloss slab on grey paper".

The room is laid out in metres and seen through a pinhole camera. Both views look at the same desk.

| View | Camera | Used in |
| --- | --- | --- |
| `wide` | From behind the divider row, standing eye height (1.62 m), behind his right shoulder. The open plan recedes to a band of windows with the blinds down. | Q03 0–6 and 13–18 (the coworker looks over, he turns the phone face down) |
| `desk` | Over his right shoulder and the keyboard: the monitor's spreadsheet, and the phone's spot alone on the bare right half of the desk. | Q03 6–13 (the buzz, he reads, bites back a smile) and 18–24 |

**His half and the empty half.** The seam is the divider post behind the desk (x = 0.25 m). His half holds his chair, the monitor, keyboard, mouse, mug, a stack of paper and a printout pinned to the divider. The empty half holds the bare desk with the phone's spot, the empty neighbouring desk, and, pinned to the divider fabric, four pins round a square of cleaner fabric where something used to hang.

## Using a view

```js
const v = SETS.office.views.desk, A = v.anchors;
v.back(c, st, { row: 6 });                                   // the room, the desk, the monitor (with the selected cell)
RIG.head(c, 'him', { x: A.head.x, y: A.head.y, s: A.head.s, yaw: A.head.phoneYaw, pitch: A.head.phonePitch,
  light: RIG.light('office', { keys: v.light.keys, amb: v.light.amb, phone: [A.phone.x, A.phone.y] }) });
v.front(c, st, {});                                           // wide only: his chair's back and the foreground divider
// then the phone (film/phone.js), lying on the desk at A.phone, its footprint A.phone.quad
```

- `back(c, t, s)` draws everything behind the characters, and `front(c, t, s)` draws what is in front of them. Characters go between the two. Draw `front` after the rig and before `PHONE`. The phone is gloss, composited after the finish, so it always sits on top.
- The set draws in world coordinates (the authored 1920×1080 frame) under whatever `c.camera(...)` the sequence has set. Cached layers carry a 48 px margin, so a slow push or a small drift never shows an edge.
- `t` drives the spreadsheet: the selected cell steps down one row every 1.6 s, on twos ("he works down a spreadsheet").
- `SETS.office.prepare()` builds every view's cached layers ahead of time. Call it in a sequence's `setup()` so the first frame of a shot does not pay for the build. You can pass `(['wide'])` to build one view.

## State (`s`)

| key | default | what |
| --- | --- | --- |
| `row` | from `t` | The spreadsheet's selected row (0..15). Fix it to stop the cursor, for example while he reads the phone. |
| `col` | 3 | The selected column (0..7). |
| `screen` | `'sheet'` | `'off'`: the monitor is dark grey card. |
| `coworker(c, a)` | none | **Wide only.** A hook that runs at the coworker's depth, after the far office and before his cubicle's back divider. Anything you draw there is cut by the divider's top edge. `a` holds the coworker's anchors (below). |
| `chairBack` | true | **Wide only.** `false` leaves out his chair's mesh back. It is drawn in `front()`, over his back, which is what the camera sees from behind him. |

The set has no `tod`: the office is only seen by day, under the tubes.

## Anchors

All anchors are screen points with the scale at that depth: `{x, y, scale, s, world}`. `scale` is px per metre. `s` is `0.23 × scale`, the `s` that `RIG.head` takes (px per head height). `world` is the metre position. Heads also carry `yaw` and `pitch` in the `GG.head` / `RIG.head` convention (yaw 0 faces the camera, + turns to screen right; pitch is applied in view space after yaw, so for a head turned away (|yaw| > π/2) a downward look has a *negative* pitch). Every view also exposes `view.cam`: `cam.p([x, y, z])` gives `[sx, sy, px per metre]` for any world point, and `cam.headAngles([dx, dy, dz])` gives the head angles for any world direction.

| anchor | wide | desk | what |
| --- | --- | --- | --- |
| `head` | 646, 466 · 449 px/m · s 103 | 205, 540 · 1775 px/m · s 408 | His head seated at the desk (between the eyes). `yaw`/`pitch` face the monitor; `phoneYaw`/`phonePitch` look down at the phone. In `desk` the head is half out of frame at the left (an over-the-shoulder): turned to the phone, it shows in profile. |
| `seat` | 630, 792 | 313, 1611 (below the frame) | The chair seat, where his hips are. |
| `hands.left` / `hands.right` | 767, 603 / 921, 621 | 471, 726 / 932, 738 | On the keyboard and on the mouse. |
| `phone` | 1099, 643 · 405 px/m | 1371, 734 · 962 px/m | The phone's spot on the desk, right of the keyboard, in the empty half. `quad` is the footprint of a 71×147 mm phone lying flat (long side front to back, top away from him), already projected: `[tl, tr, br, bl]`. |
| `monitor` | 875, 465 | 656, 313 | The screen's centre; `quad` gives its four corners. |
| `coworker.down` / `.over` | 1213, 424 / 1140, 343 · 333 px/m | none | **Wide only.** The coworker's head behind the back divider, sitting (hidden) and looking over it (`over.yaw`/`over.pitch` look at him). `clipY` (407) is the divider's top edge at that x. Rise the head from `down` to `over` inside the `coworker` hook. |

`split`: wide 0.536, desk 0.522 (the post).

## Light

`light` is the shot's one motivated light, the tubes overhead, in a form `RIG` reads: `{ name: 'office', x, y, color, amb, keys }`. `keys` are `GG.head` light specs (posterised): the tubes from above and slightly behind the camera. In `desk` there is a second, weaker key from the monitor, in front of him (cut, not smooth: the monitor is real, and only the phone's light is smooth). Pass it whole as a light (`RIG.asLight` merges it with `RIG.LIGHTS.office`), or take `keys` and `amb` into `RIG.light('office', {...})` as above, adding the phone's point when the screen is lit.

## Cost

These figures were measured in `tools/set.js`'s headless Chromium. "Set alone" is `back` and `front` together, warm, without the engine's finish.

| view | set alone (warm) | first frame (builds the caches) |
| --- | --- | --- |
| `wide` | 5–7 ms | about 1.9 s |
| `desk` | 4 ms | about 1.8 s |

A full engine frame with the finish is about 40 ms. `prepare()` builds both views in about 3.5 s. Each view keeps three full-frame layers (the far office, his cubicle, the foreground) plus a quarter-size emissive layer, keyed `office|<view>|...`.

## Caveats

- The coworker is the rig's. The set only leaves the divider and the hook. In the wide, the coworker's head rises over the divider in the empty half, above the phone: the world leaning into her half.
- The monitor is cut paper, not gloss: the spreadsheet is a grid of cells and dashes, with no words and no numbers to read. Its light is banded.
- The tubes go into the emissive buffer at low strength. Fluorescent panels are the brightest real thing in the room, but they stay below paper white.
- The `desk` camera sits behind his right shoulder, so the rig draws his head, shoulder and right arm big at the left edge. His left hand on the keyboard is mostly hidden by his body.
- The phone lying flat is small in the `wide` (about 30 px across). The script's "insert-feel" for the turn at 16.0 wants either a push in or a cut to `desk`.
