# SETS API: bedroom.js

`SETS.bedroom` (`film/sets/bedroom.js`) is the bedroom: the film's first image (Q01), its repeat (Q07) and the wardrobe by day (Q09). Demo sheet: `node tools/set.js bedroom 1` writes `out/set_bedroom.png`.

The room is built once in metres and every view is a pinhole camera on it, so the views agree. The bed is a double bed against the headboard wall.

- **His half (x < 0):** a single duvet pulled up to his shoulder over the shape of his body, its outer corner thrown back over a triangle of creased sheet, and a dented square pillow.
- **The empty half (x > 0):** a second single duvet, tight and square, with the sheet turned down in one ruler-straight band, and a smooth square pillow with an ironed crease.
- **The seam:** between the two pillows, the two duvets and the two headboard panels, on x = 0.
- **The tall window** beside her bedside table, with vertical blinds. Its streetlight lies in dead-straight slats across her made half only.
- **The wardrobe** stands on his side wall.

Everything is cut paper in Look B's palette. The phone (PHONE) and the characters (RIG) are drawn by the sequence between `back()` and `front()`.

## The room (metres)

- x runs across the room (his side wall at −2.40, her side wall at +1.90), y is up, and z runs from the foot of the bed (0.12) to the headboard wall (2.30).
- Mattress top: 0.58. Pillows are square, 0.66 × 0.63 m: his centred at (−0.405, 1.885), hers at (0.41, 1.89).
- Bedside tables: x −1.38..−0.92 (his: a paperback face down, a glass of water, an unlit lamp) and 0.92..1.38 (hers: only the unlit lamp).
- Window: in the headboard wall, x 1.42..1.85, y 0.66..2.20, with five vertical vanes.
- Wardrobe: against his wall, x −2.40..−1.80, z 0..1.20, 2.06 m tall. Its shelf is at 1.78 and its rail at 1.66.
- `SETS.bedroom.room` exposes all of this, plus the choreography's points: `head`, `face`, `phone`, `hand`, `shoulder`, `stand` and `bag`.
- Every view exposes its camera as `v.cam`:
  - `v.cam.p(x, y, z)` returns `[sx, sy, depth]`;
  - `v.cam.k(x, y, z)` gives px per metre;
  - `v.cam.ray(sx, sy)` returns the world ray;
  - `v.cam.xy([...])` projects a list of points.

  Use these to place anything else in the same room.

**Flopped views.** `across`, `hand`, `wardrobe` and `shelf` look from her side toward his and are drawn mirrored, so the headboard (and the window's light) are on the left. This keeps B1's approved composition and C's grammar (his things on the left), and he looks screen-right in every bedroom shot. Never mirror anything yourself. Take positions from the anchors or from `v.cam.p`.

## Use

```js
const v = SETS.bedroom.views.foot, s = { tod: 'night' };
v.back(c, lt, s);
RIG.head(c, 'him', { /* at v.anchors.head, scale v.anchors.head[2] px/m */ });   // head and neck on his pillow
v.front(c, lt, s);                                                             // the duvet's turned edge over his shoulder
PHONE.draw(c, { at: v.anchors.phone /* ... */ });                              // gloss, on the smooth pillow
RIG.hand(c, 'him', { /* toward v.anchors.hand, the arm from v.anchors.shoulder */ });   // after front(): the arm lies over the duvet
```

- **Anchors** are `[x, y, pxPerM]`: the screen point and the pixels per metre at its depth. Nothing moves, so they are constant per view.
- **What the set draws and what the rig draws.**
  - The set draws his duvet and the mound of his body under it (`back()`), and the duvet's turned-back edge across his chest (`front()`).
  - The rig draws his head and neck between the two, and his arm and hand after `front()`: the arm comes out from under the duvet's edge at `shoulder` and lies over it to the phone.
- **Caching.** Layers are cached as `bedroom:<view>:…` with a 48 px margin, so pushes and drift never show an edge.
  - `s.res` (default 1) renders a view's layers larger. Use `res: 2` for any push past about 1.3× (the across "closer" and "close on his face" shots), or the paper softens.

---

## `foot`: high, from the foot of the bed (Q01 3.0, 22.0, 42.0; Q07 0.0)

C1's plan in B's palette. A long lens (7 m back, pitch −57°) over the foot, dead centre. The headboard wall and window are at the top, the two pillows below them, and the duvets fill the lower frame. The foot of the bed is just out of frame.

- **His half:** the dented pillow, askew. The duvet is up to the pillow by his body and thrown back at the outer corner over creased sheet. His shoulder, hip and drawn-up knees show under it, in posterised folds.
- **Her half:** the smooth pillow, lit warm around the phone. The duvet is tight, with the turned-down sheet in a straight band. Four streetlight slats lie diagonally across its middle, straight, and never reach his half.
- **The window (top right):** dark vanes, and between them the night lit from below in cut bands, with the building opposite and its cold lit windows.

**State**

| key | values | what |
| --- | --- | --- |
| `tod` | `'night'` (default), `'later'` | `'later'`: the windows opposite are all dark, and the slats have crept (the light turns 2°). |
| `later` | 0..1 | Dissolve from night to later (the 1 s dissolve at Q01 22.0). It defaults to 0 for night and 1 for later. |
| `glow` | 0..1 (default 1) | The phone's smooth light laid on the set: her pillow, the seam, his pillow, the duvet's edge. Set it to 0 if PHONE already lights the world here. |
| `res` | 1 (default), 1.5, 2 | Layer resolution for pushes. |

**Anchors**

| anchor | value | what |
| --- | --- | --- |
| `head` | [789, 424, 504] | His head centre on his pillow, lying on his side facing her pillow. |
| `face` | [834, 421, 504] | Where the screen's light lands. |
| `phone` | [1111, 431, 504] | The phone's centre: on its long edge on the smooth pillow, where her head would be. Its screen faces his face (world −x), with its back to the camera. |
| `hand` | [1112, 415, 508] | His hand at rest over the phone. |
| `shoulder` | [820, 514, 518] | Where his arm leaves the duvet. |
| `seam` | [[960, 327], [960, 1130]] | The pillow seam, on the centre line. |

- **Light:** the phone, `{x: 1111, y: 431, color: '#FFC5A0', kind: 'phone'}`, smooth and never banded. `light.street` (`{x: 1640, y: -40, color: '#7E93C2'}`) is the streetlight's direction, for any cold rim; it is posterised.
- **Split:** `0.5`.

## `across`: across the bed from her side (B1; Q01 8.4, 14.4, 26.0)

A long, high lens from her side (pitch −26°), flopped.

- **Left:** the headboard. Above the bed, his bedside table with the glass of water, the paperback and the lamp. The wardrobe's dark doors are on the far wall, top right.
- **His side:** his pillow, the duvet pulled up to his jaw, and the long mound of him running to the right.
- **Near us:** her smooth pillow, lit warm by the phone.
- **Her made duvet** across the lower right, with the streetlight's slats lying diagonally on it and as vertical bars down its hanging edge.

Checked against a sculpted stand-in head (demo "with a stand-in head"): the head at `face` rests on his pillow facing the phone, as in B1.

**State:** `tod`, `later`, `glow` and `res`, as for `foot`. For the closer shots, push with `c.camera` around `anchors.face` and pass `res: 2`.

**Anchors**

| anchor | value |
| --- | --- |
| `head` | [544, 320, 965] |
| `face` | [540, 347, 974] |
| `phone` | [530, 600, 1028] |
| `hand` | [539, 540, 1031] |
| `shoulder` | [799, 295, 975] |
| `seam` | [[220, 532], [2005, 594]] |

The phone's screen faces his face (away from us), with its back to us, as in B1.

- **Light:** the phone, `{x: 530, y: 600}`. `light.street` sits off-frame below-left (the window is behind and left of the camera).
- **Split:** the seam runs across the frame here. `split: 0.521` with `splitAxis: 'y'` gives the fraction of the height: his half is above it and the empty half below.

## `hand`: the insert on the smooth pillow (Q01 36.0)

The across axis, much closer (about 1750 px/m at the phone). Her pillow fills the lower frame with its ironed crease, and his pillow is at the top. The duvet's edge over his shoulder comes in at top right, the headboard is at the left, and the phone's warm light falls on both pillows.

- **State:** `tod`, `later`, `glow`, `res`.
- **Anchors:**

  | anchor | value | note |
  | --- | --- | --- |
  | `phone` | [1010, 600, 1750] | |
  | `hand` | [1028, 496, 1755] | |
  | `shoulder` | [1433, 108, 1659] | the arm enters from the top right |
  | `head` | [994, 156, 1644] | mostly out of frame, at the top |
  | `face` | [993, 198, 1659] | |
  | `seam` | [[460, 501], [3500, 609]] | |

- **Light:** the phone.
- **Split:** `0.514`, `splitAxis: 'y'`.

## `wardrobe`: the open wardrobe by day (Q09 0.0, 12.5)

An elevation of his side wall (pitch 0, verticals vertical), flopped. The wardrobe's centre is on the centre line.

- **Left half:** his clothes, crowded and seen edge-on as they hang: shirts, the green tee, the sweater, trousers, a jacket, with one pale shirt turned to us. His shoes are on the floor.
- **Right half:** five bare wooden hangers, each turned its own way, throwing shadows on the back panel.
- **The shelf above:** his folded sweaters and a shoebox on the left. On the right, the old floral makeup bag (broken zip) in a film of dust.
- **The light:** the grey daylight comes from the window, behind us and to the left. It lays a soft slanted patch on the wall, lights the right half of the interior, and puts his clothes in the side panel's shadow.

**State**

| key | values | what |
| --- | --- | --- |
| `doors` | 0..1 (default 1) | 0 is shut, 1 is open (about 105°). In between they are drawn live: animate this for "he opens it". |
| `swing` | 0..1 (default 0) | The bare hangers' swing amplitude. They swing on `t`; decay it yourself, for example `swing: Math.exp(-(lt - 1.5) * 1.2)` after the doors open (`hangers` at 1.5). |
| `bag` | `true` (default) / `false` | `false`: the bag is gone and the clean rectangle remains in the dust. It reads in `shelf`; in the wide view it is a sliver. |
| `res` | 1, 2 | Use 2 for the "close" push at 12.5. |

**Anchors**

| anchor | value | what |
| --- | --- | --- |
| `stand` | [730, 1724, 820] | His feet, below the frame: he stands in front of his clothes, 0.55 m from the wardrobe. |
| `head` | [730, 347, 820] | His head height there (1.68 m). |
| `hands` | [770, 787, 732] | Hands at the doors' height. |
| `bag` | [1143, 207, 631] | The bag on the shelf. |
| `shelf` | [960, 244, 672] | |
| `rail` | [1144, 309, 612] | |
| `split` | [960, 768, 672] | The wardrobe's centre. |

- **Light:** the window, off-frame left: `{x: -200, y: 120, color: '#E6EBEE', kind: 'window', dir: [1, 0.3]}`.
- **Split:** `0.5`.

## `shelf`: the insert on the shelf (Q09 6.0)

Just above the shelf, close, looking down under the wardrobe's top.

- **Left:** his sweaters and the shoebox.
- **Right:** the floral bag sitting in grey dust (a mottled film, flecks, fibres, a line of dust along the shelf's edge).
- **Below the edge:** the tops of his clothes and two bare hangers.
- **With the bag gone:** a crisp clean rectangle of bare wood, with dust banked along its edges.

**State:** `bag` (`true` / `false`), `doors`, `res`.

To lift the bag, set `bag: false` from the moment it leaves the shelf, and draw it at his hand with `SETS.bedroom.bag(c, x, y, pxPerM, rot)`. That is a cached sprite of the same bag (3D pouch, faded print, broken zip gaping at its right end), seen from the front and a little above. Its centre goes at (x, y); about 1600 px/m matches this view and 630 px/m the wide one.

**Anchors**

| anchor | value |
| --- | --- |
| `bag` | [1435, 683, 1614] |
| `rect` | [1423, 762, 1569] (the clean rectangle) |
| `hands` | [1393, 937, 1791] |
| `split` | [959, 874, 2025] |

- **Light:** the window, off-frame left.
- **Split:** `0.499`.

---

## Costs

Measured in `tools/set.js` and in scratch timing of 10-frame averages on this machine.

| | per frame |
| --- | --- |
| Engine finish alone (grain, fibre, halation, vignette, empty frame) | about 37 ms |
| Cached views, the set's own share | about 2–6 ms (40–45 ms whole frame) |
| Wardrobe with the doors animating or the hangers swinging | about 15–20 ms for the set (52–58 ms whole frame) |

The first draw of each view and state builds its layers once:

| view and state | first draw |
| --- | --- |
| foot (each `tod`) | 1.6–2.0 s |
| across | 2.3 s |
| hand | 3.3 s |
| wardrobe | 1.2 s |
| shelf | 1.0 s |
| later states of the same view (bag, doors 0/1) | about 50 ms |

The soft goods are height fields posterised per pixel, which is what costs. A shot's first frame stalls by that much once, so it is worth keeping a view's state keys stable (for example, do not animate `res`).

Memory per night view: one full layer per `tod`, plus small boxes for the phone's light and the duvet's edge. The wardrobe views use two full layers, plus sprites for the hangers, the bag and the doors.

## Caveats

- **The demos' stand-ins** (a black gloss slab for the phone, a sculpted `GG.head` in one across demo) are only there to judge the sheets. The film's come from PHONE and RIG.
- **The streetlight is geometric.** The slats are the five vane gaps projected along one light direction onto her duvet's plane and its hanging edge. They stay straight because her duvet is flat. If the window or the light changes, both views follow.
- **The across view is honest perspective**, so its pillows are the square pillows' short ends. They are a little taller than B1's painted pillows, which cheated the geometry.
- **The wardrobe's dust rectangle** only reads in `shelf`. Cut to it for the reveal.
- **The night views' `glow`** is the set's share of the phone's light. Keep it at 1 unless PHONE lays its own world light, or the pillow doubles up.
- **No text** anywhere in the set.
