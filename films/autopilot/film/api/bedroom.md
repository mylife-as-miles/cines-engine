# SETS API: bedroom.js

`SETS.bedroom` (`film/sets/bedroom.js`): the bedroom at dawn, 6:14, for Q01.

The room is teal-black. The phone's cold white screen is its only light, and its glass is the film's first pane. Then comes the dark window: its bare glass gives back the bed, where the far side is empty and the pillow smooth (Sarah has already gone). Above it, the roller blind begins to glow at its edges as the dawn grows, and Daniel sits up against it.

## The room (bedroom metres)

- x runs across the room, y is up, and z goes toward the window (the window wall is z 4.0).
- The bed's head is against the wall at z 0, its foot toward the window. Daniel sleeps on the left (x < 0, his bedside table at x −1.13), Sarah on the right.
- The window (x −0.7..0.7, sill 0.85, head 2.1) has a linen roller blind drawn most of the way down. Its hem is at 1.27 m, which leaves a strip of bare glass beneath (0.85–1.27). There is a radiator under the sill.

## Use

```js
const v = SETS.bedroom.views.window, s = { dawn: 0.2 };
v.back(c, t, s);  /* characters */  v.front(c, t, s);
```

- Frame coordinates are 1920x1080, and cached layers carry a 32 px margin for pushes and drift.
- Caches are keyed `bedroom:`. The window and the edge views cache their room per dawn step (20 to 24 steps), so a slow dawn costs one new layer every second or so.

---

## `table`: the phone on the bedside table (Q01 5–11)

- The phone lies face up on Daniel's bedside table, shivering while it rings.
- The alarm screen: cold, pale, a bell swinging on the ring's beat, **6:14** large, a wordless slider at the bottom.
- The screen is the only light. It lays a posterised pool on the table top (three flat values), lights the lamp's base and its shade's inner rim from below, and catches the duvet's edge and the pillow. A glass of water throws a small caustic beside it. The room beyond is black.
- `front()` adds the screen glass's sheen, dust and the faint haze of its light.

**State**

| key | values | what |
| --- | --- | --- |
| `screen` | `'alarm'` (default), `'lock'`, `'off'` | **alarm**: the bright alarm screen. **lock**: after he silences it, the dark lock screen with 6:14 smaller; the room's light drops to about a third. **off**: black. |
| `shiver` | 0..1 | The vibration. It defaults to 1 while `'alarm'` and 0 otherwise. It jitters on ones in bursts, the way a phone buzzes. |
| `glow` | 0..1 | Scales the screen's light. Fade it to 0 for a cut to black. |

**Anchors**

- `screen`: the glass's corners (tl, tr, br, bl as the screen reads; its top lies away from us).
- `phone` [976,523].
- `stop` [987,594]: the slider, where the thumb goes to silence it.
- `pxPerM` 3291.
- `handFrom` [-80,640]: the hand comes from the bed, which is frame left.

**Light**: the screen itself, from below: `{x: 976, y: 523, color: '#DCE8EC'}`. Rim the hand from the phone.

```js
const v = SETS.bedroom.views.table, silenced = lt > 9.2, s = { screen: silenced ? 'lock' : 'alarm' };
v.back(c, lt, s); RIG.hand(c.g, 'daniel', { /* to v.anchors.stop */ }, { light: v.light }); v.front(c, lt, s);
```

---

## `screen`: the screen, close (Q01 11–20)

- The phone held close and tipped a little toward him, filling the frame's height in the black room.
- The screen, from the top down:
  - the island;
  - a dark panel with **BATTERY** (small tracked capitals), **7%**, and the battery glyph with its red sliver;
  - then black glass, where his face reflects;
  - then a clutter of background apps still running, stacked low like a deck (a map, a message thread, a calendar, a news page, a podcast), dim.
- `front()` adds the glass: a long sheen, dust, a thumb's smudge, the bevel.

**State**

- `swing` 0..1: he turns the phone over. It rotates about its long axis; the glass foreshortens to an edge, the light going with it, and past 0.5 we see its dark back with the camera bump. The screen's glow fades with it.
- `glow` 0..1: the screen's brightness.
- `reflect` 0..1: passed to `inGlass` (default 0.42).

**The reflected face**: `v.inGlass(c, s, fn)`. `fn(g)` draws in frame coordinates. It is clipped to the glass and screened over the screen's own light, so it shows where the glass is dark (between the panel and the cards) and barely over the bright cards. Call it between `back()` and `front()`.

**Anchors**

- `screen`: the glass's corners.
- `face` [930,420] and `faceScale` 1: where a face sized about 560 px sits in the black glass.
- `battery` [880,190], `cards` [960,820].
- `thumb` [1240,980]: his thumb at the glass's lower right.
- `pxPerM` 6600 at the glass.

**Light**: `{x: 960, y: 560, color: '#DCE8EC'}`. The screen lights his face from the front and below; the room is black.

```js
const v = SETS.bedroom.views.screen, s = { swing: FILM.seg(lt, 19.2, 20.4, 'inOutSine') };
v.back(c, lt, s);
v.inGlass(c, { reflect: 0.36 }, g => RIG.face(g, 'daniel', { at: v.anchors.face, size: 560, view: 'front', face: 'squint', outfit: 'night' }, { mode: 'reflection', light: { x: 930, y: 1100, color: '#DCE8EC' } }));
v.front(c, lt, s);
```

---

## `window`: the dark window, the bed in its glass (Q01 20–29)

- Close on the strip of bare glass under the blind. The blind's dark hem bar is above it, the blind's lower part above that, and below are the sill, the wall and the radiator's ribs (calm for type).
- Through the glass: the garden's dark fence, a tree, the roofs opposite against a sky only just paling.
- In it, the room mirrored through the pane: the headboard, two bedside lamps and the bed seen from its foot. His half is darker, the duvet thrown back on a darker sheet, his pillow low and dented. Her half is pale and smooth, her pillow plump. The central mullion divides the two halves.
- It is screened over the dark outside, so it shows only what is lit, and it fades as the dawn brightens the outside.
- As `dawn` grows, the blind's edges glow first (thin slivers between the blind and the jambs), then the cloth itself pales.
- `front()` adds dust and a faint sheen on the glass.

**State**

- `dawn` 0..1, default 0.18. Q01 20–29: from about 0.12 to 0.35, with the push.
- `phoneLight` 0..1: the phone's cold light on the bed, in the glass, while it is still on. It goes as he turns the phone over.
- `reflect` 0..1: the reflection's strength (default 0.78).

**Figures in the glass**: `v.inGlass(c, s, fn)`. `fn(g, mc)` gets the mirror camera (`v.reflectCam`, an `LC.camera` in bedroom metres that draws any point as the glass shows it) and is clipped to the strip and screened.

**Anchors**

- `strip` [[150,314],[1620,751]]: the bare glass.
- `hisPillowInGlass` [825,517], `emptyPillowInGlass` [1060,512].
- `hisPlaceInGlass` [811,555]: his place in the bed, in the glass.
- `pxPerMInGlass` 319.
- `blind` [894,-147]: above the frame here.

Note: a sitting figure's head rises above the hem in the glass. Show him lying or half-propped (his head on the pillow), or keep him out of the glass.

**Light**: `{x: 960, y: 260, color: '#9DB0B6'}`, the window ahead. The bed in the glass is lit from the window too.

```js
const v = SETS.bedroom.views.window, s = { dawn: FILM.key(lt, [[20, 0.12], [29, 0.36]]), phoneLight: 1 - FILM.seg(lt, 20, 21.2) };
c.camera({ zoom: 1 + 0.004 * (lt - 20) }); v.back(c, lt, s);
v.inGlass(c, s, (g, mc) => { /* RIG or a shape at mc.p(-0.4, 0.62, 0.4) ... lying on his side */ }); v.front(c, lt, s);
```

---

## `edge`: Daniel on the bed's edge against the blind (Q01 29–40)

- A low camera in the corner by the head of the bed, set on the line from the blind through his head. When he sits on the bed's left edge, his bowed head and shoulders cut out against the glowing blind.
- The window: the blind glowing, its edges blazing, a little dawn outside the bare strip below. The radiator under it, the walls in teal shade, the bed on the right catching the light.
- Slow dust turns in the dawn (`front()`).

**State**: `dawn` 0..1, default 0.6. It grows across the shot, toward 1 at about 40 s.

**Anchors**

- `seat` [1145,865]: his hips on the edge. Pass it as RIG `at` with `body: 'sitbed', seat: 0.47`.
- `pxPerM` 661.
- `headSeated` [999,484]: where his head falls when he leans forward over his knees. It is on the blind.
- `feet` [838,1383]: below the frame.
- `facing`: profile, facing left (RIG `view: 'profile', facing: -1`).
- `blind` [1000,483].

**Light**: `{x: 1000, y: 479, color: '#F3E6CC'}`, the blind behind him: a rim, growing with `dawn`. RIG `mode: 'silhouette'` is the intended read.

```js
const v = SETS.bedroom.views.edge, A = v.anchors, s = { dawn: FILM.key(lt, [[29, 0.4], [40, 1]]) };
v.back(c, lt, s);
RIG.draw(c.g, 'daniel', { at: A.seat, scale: A.pxPerM, view: 'profile', facing: -1, body: 'sitbed', seat: 0.47, outfit: 'night', hold: 'phone', armR: 'knee', armL: 'knee', face: 'down', head: { nod: 0.35 } }, { mode: 'silhouette', light: v.light });
v.front(c, lt, s);
```

---

## Demos (`node tools/set.js bedroom 1` → `out/set_bedroom.png`)

1. The alarm.
2. Silenced, with a stand-in hand, the lock screen.
3. The screen close (with RIG's face reflected).
4. Turned over (`swing` 0.35).
5. The window with a stand-in for him lying in the glass.
6. The blind's edges glowing.
7. The edge at dawn 0.5 (RIG's Daniel as a silhouette).
8. The edge at dawn 1.

The views run 12 to 49 ms. The screen-close demo reads about 175 ms because of RIG's 560 px face in reflection mode; the view alone costs about 22 ms (demo 4).

## Not fully right yet

- **`table`.** The lamp's base reads a little like a vase.
- **`window`.** The reflected bed is legible but boxy (flat quads with rounded pillows), and small: the push helps.
- **`edge`.** The bed's planes at the right are simple.
- **The blind's weave.** It is a faint line pattern, visible only when lit.
