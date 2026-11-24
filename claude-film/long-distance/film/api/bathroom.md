# SETS API: bathroom.js

`SETS.bathroom` (`film/sets/bathroom.js`) is the morning routine (Q02, Q07). Demo sheet: `node tools/set.js bathroom 1` writes `out/set_bathroom.png`.

A small tiled bathroom built once in metres and seen through pinhole cameras, so both views agree.

- **The basin wall** is cold white tile paper. Its light is cut into bands: a step lighter toward the window, a step darker on his side and under the basin.
- **The mirror cabinet** hangs over the basin. Its two mirrored doors meet on the centre line.
- **The shelf** under it holds the glass on the centre line, with two toothbrushes:
  - his blue one, leaning left;
  - the other, leaning right, grey, its bristles furred with dust and loose fibres.
- **His half of the shelf** holds a squeezed tube of toothpaste and a razor.
- **The phone** stands in the empty half, propped against the right-hand mirror. It is drawn by PHONE.
- **A small frosted window** right of the cabinet is the grey light. A cut patch of that light lies on his side wall.
- **The mirror shows the room behind us.** It is computed by reflecting the room's geometry in the mirror's plane: the tiled wall, and the open door with the hall dark beyond it.
  - The dark doorway falls behind the phone in the empty half, so the phone's warmth stands against it.
  - His reflection, drawn by the rig, goes in his door.

Foam and every white thing are cut paper, never pure white. The brightest real tone is the frosted glass, `#DADEDE`, below the paper limit.

## The room (metres)

- x runs across the basin wall (his half < 0 < the empty half), y is up, and z points away from the camera. The basin wall is z = 0.
- Mirror cabinet: x ±0.45, y 1.16..1.90. Its front, z −0.13, is the mirror's plane.
- Shelf: y 1.06, from the wall to z −0.27. The glass stands at (0, 1.06, −0.182).
- Basin rim: y 0.85, x ±0.30. The frosted window is at x 0.64..1.00, y 1.16..1.90.
- The door behind us (seen only in the mirror) is at x 0.12..0.92 on the wall z −2.6.
- `SETS.bathroom.room` exposes all of this, including `face` (his face at the basin), `phone` and `phoneLean`.
- `v.cam.p`, `v.cam.k`, `v.cam.ray` and `v.cam.xy` place anything else in the same room. A point's reflection is `[x, y, 2 * room.cab.z - z]`.

## Use

```js
const v = SETS.bathroom.views.mirror, s = { glow: lt > 7 ? 1 : 0, foam: true };
v.back(c, lt, s);                                                   // the wall, the window, the mirror with the room in it
v.inMirror(c, g => RIG.draw(g, 'him', { /* his reflection at v.anchors.reflection */ }));
v.front(c, lt, s);                                                  // the cabinet's frames, the shelf and its glass and brushes, the basin, the towel
// optional: his real back, soft and dark, at v.anchors.back (after front(): he stands in front of the basin)
PHONE.draw(c, { at: v.anchors.phone, lean: v.phoneLean /* ... */ });   // gloss, propped against the mirror
```

**Anchors** are `[x, y, pxPerM]`. Layers are cached as `bathroom:<view>:…` with a 48 px margin. `s.res` (default 1) renders larger for pushes.

---

## `glass`: the insert, two toothbrushes in a glass (Q02 0.0)

Close and level with the brushes; the glass is on the centre line.

- **Behind the brush heads:** the mirror's lower edge, with the reflected room in it (tiles on his side, the dark doorway on hers).
- **Between the shelf and the mirror:** a strip of tiles. The cabinet's seam runs down behind the glass.
- **His half of the shelf:** the toothpaste tube and the razor.
- **The empty half:** the dusty brush stands against the dark reflection. The phone's left edge comes into frame at the right.
- **The light:** from the window to the right. It rims the glass's right side, and shadows fall left.

**State**

| key | values | what |
| --- | --- | --- |
| `lift` | 0..1 (default 0) | His brush leaves the glass. 0 to 0.55: it slides up along its own axis until it clears the rim. 0.55 to 1: it is taken up and left and turns upright, out past the top of the frame. Animate it under the hand at Q02 1.5–3.0. |
| `brush` | `'in'` (default) / `'out'` | `'out'` hides his brush (already in his hand). |
| `glow` | 0..1 (default 0) | The phone's smooth warm light on the shelf beside it. |
| `res` | 1, 1.5, 2 | |

`v.brushAt(s)` returns where his brush is at that state: `{grip: [x, y, pxPerM], base, tip, angle}`. `grip` is a third of the way up the handle, where the thumb and fingers close. Track the rig's hand to it while `lift` runs:

| lift | grip |
| --- | --- |
| 0 | (892, 672) |
| 0.3 | (829, 460) |
| 0.55 | (790, 330) |
| 1 | (322, −158), out of frame |

His brush is a cached sprite moved by a 2D transform, so lifting costs nothing extra. The hand goes after `back()`: the brush, the glass's front and everything else are in `back()`, and `front()` is empty.

**Anchors**

| anchor | value | what |
| --- | --- | --- |
| `glass` | [960, 566, 2833] | The rim's centre. |
| `brush` | [892, 672, 2809] | His brush's grip at rest. |
| `dusty` | [1144, 327, 2872] | The other brush's head. |
| `phone` | [1670, 655, 2783] | The phone's centre, mostly out of frame right. |
| `handFrom` | [−60, 980] | The hand comes in from the lower left. |

- **Light:** the window, off-frame right: `{x: 2300, y: 300, color: '#D3D8D9', kind: 'window', dir: [-1, 0.2]}`.
- **Split:** `0.5` (the glass).

## `mirror`: him at the basin, seen in the mirror (Q02 4.5, 17.5; Q07 11.0)

An elevation of the basin wall from the doorway, at a little above his eye height (pitch 0, verticals vertical). The cabinet's seam is on the centre line.

- **His half:** his towel on a ring, his things on the shelf, and his door of the mirror (the reflected tiles).
- **Centre:** the glass with the dusty brush (and his brush when `brush: 'in'`).
- **The empty half:** the phone against the right-hand mirror, in front of the reflected dark doorway, and the frosted window.
- **Below:** the basin, its tap and the soap.
- **His figure is the rig's.**
  - **His reflection:** draw it through `v.inMirror(c, fn)`. That clips to the two mirror glasses and greys what `fn` draws a step toward the glass's own tone, so it sits in the mirror rather than on it.
  - **His real self:** in this geometry he stands at the basin between us and the mirror. A physically honest frame shows his back as a soft dark shape at the left (anchor `back`) beside his reflection.

  Whether to draw the real back is the sequence's call. The sheet's last-but-one demo shows the space with flat stand-ins.

**State**

| key | values | what |
| --- | --- | --- |
| `brush` | `'out'` (default here) / `'in'` | `'out'`: only the dusty brush stands in the glass (he is brushing). `'in'`: both. |
| `glow` | 0..1 (default 0) | The phone's smooth warm light on the shelf. Raise it when the screen wakes (Q02 7.0, the banner). |
| `foam` | `false` (default) / `true` | Flecks of cut-paper foam in the basin. |
| `res` | 1, 1.5, 2 | |

**Anchors**

| anchor | value | what |
| --- | --- | --- |
| `reflection` | [680, 243, 701] | His face in the mirror (left door). |
| `back` | [515, 287, 1113] | The back of his real head, if drawn. |
| `basin` | [960, 981, 886] | The bowl, for his hands and the foam. |
| `tap` | [960, 910, 852] | |
| `phone` | [1178, 721, 857] | The phone's centre: portrait, standing on the shelf, its top leaning back against the mirror by `phoneLean` (0.47 rad), screen to the room. |
| `glass` | [960, 695, 861] | |
| `dusty` | [1015, 624, 862] | |
| `window` | [1578, 373, 754] | |

- **Light:** the window, `{x: 1578, y: 373, color: '#D3D8D9', kind: 'window'}`, cut into bands (the frosted glass, the patch on his side wall, rims on the shelf's things).
- **Split:** `0.5` (the cabinet's seam).
- `v.mirrorPath` is the mirror glasses' Path2D in screen coordinates, if you need your own clip.

---

## Costs

| | first draw | per frame, cached |
| --- | --- | --- |
| `glass` | 2.1 s | set's own share about 4–8 ms (41–51 ms whole frame, of which the engine's finish is about 37 ms) |
| `mirror` | 2.2 s | set's own share about 4–8 ms |
| a new state (`foam`, `brush`, a `glow` box) | 50–800 ms | |

The lift is a sprite transform: about 43 ms whole frame while it animates. Most of the first-draw cost is the tile light, traced per pixel through the camera onto each wall, so band edges are exact curves on the tiles.

## Caveats

- **The demos' stand-ins** (the black gloss phone, the flat paper figure) only judge the sheets.
- **The mirror's reflection is of the room only.** The brushes, the glass and the phone are not reflected: their reflections read as ghosts and a second tumbler, so they were left out.
- **Under the basin.** The mirror view's lower band (y 930–1060) is the pale basin. No line is spoken over this view in the current plan. If one is, darken it with the shot's own means (a push up with `c.camera`, or `post.vig`).
- **No text** anywhere in the set.
