# SETS API: bathroom.js

`SETS.bathroom` (`film/sets/bathroom.js`): the bathroom for Q03, the routine, a montage on a mechanical rhythm. It also holds the wardrobe's mirrored door.

- **The room.** A cool teal room, tiled, its own frosted window giving a flat cool light from the upper left. The morning sun reaches it only as a reflection: the landing window, blazing through the open bathroom door behind the lens, laid warm in the shower glass until the steam burns it off.
- **Every view is a pane:** the shower door's glass, the steamed mirror with its wiped band, the chrome of the mixer, the gloss of the door round the towel hook, the wardrobe's mirror sliding away.

## Use

```js
const v = SETS.bathroom.views.shower, s = { steam: 0.6, water: 1 };
v.back(c, t, s);
v.behind(c, s, g => RIG.draw(g, 'daniel', { ... }));   // a figure seen THROUGH fogged glass: blurred and veiled
v.front(c, t, s);                                       // the glass: fog, runnels, beads, the warm reflection, the handle
```

- Figures seen through fogged glass go through `v.behind(c, s, fn)`. Figures seen in a mirror or in chrome go through `v.inGlass(c, s, fn)`. Otherwise draw characters between `back()` and `front()` as usual.
- Frame coordinates are 1920x1080. Cached layers carry a 32 px margin. Caches are keyed `bathroom:`.
- The fog is rendered at half resolution (it is soft anyway), so a fogged view costs about 30 to 50 ms whole-frame.

---

## `shower`: the shower door's glass (Q03 2–15)

- A frameless glass door, frontal, its chrome handle bar and hinges.
- Behind it, the tiled cubicle: the riser rail and the rose, the mixer on the right wall, the tray. When the water runs, a fine spray falls from the rose.
- On the glass:
  - the landing's warm window, reflected (a tall window with its cross-bars);
  - steam blooming from the bottom and climbing, a smooth milky condensation;
  - clear runnels where water has run down through it, each ending in a bead;
  - water beads, some running;
  - a long sheen.
- The warm reflection fades as the steam climbs, and the fog takes its glow: "steam burns it off".

**State**

| key | values | what |
| --- | --- | --- |
| `steam` | 0..1, default 0.5 | The fog: its density, and how high its front has climbed. At 0 the glass is clear; by about 0.75 it is fogged to the top. |
| `water` | 0..1, default 1 | The spray, and how many beads there are and how many run. |
| `streams` | 0..1 | Runnels clearing lines through the fog (the rinse, Q03 8–10). Their number and length grow with it. |

**Behind the glass**: `v.behind(c, s, fn)`. `fn(g)` draws the figure in frame coordinates. It is drawn at quarter resolution, blurred more as the steam thickens, deepened to the darker, warmer mass a body makes through condensation, and clipped to the glass. The fog in `front()` then veils it. Call it between `back()` and `front()`. Pass the same `s`.

**Anchors**

- `glass`: corners; it runs off the bottom of the frame.
- `figureFeet` [930,1338]: on the tray, below the frame. `figureHead` [930,345].
- `pxPerM` 591.
- `rose` [996,270].

**Light**: `{x: 560, y: 120, color: '#DCE8E6'}`, the frosted window, high on the left.

```js
// Q03 5-8: his shape, hands at his head (shampoo)
const v = SETS.bathroom.views.shower, A = v.anchors, s = { water: 1, steam: FILM.key(lt, [[2, 0.1], [9, 0.75]]) };
v.back(c, lt, s);
v.behind(c, s, g => RIG.draw(g, 'daniel', { at: A.figureFeet, scale: A.pxPerM, view: 'front', armR: { hand: [0.02, 0.4, 0.06] }, armL: { hand: [0.02, 0.4, 0.06] }, head: { nod: 0.25 } }, { light: v.light }));
v.front(c, lt, s);
```

The figure's outfit behind the fog is the sequence's choice. The demo uses RIG's night clothes, which the blur reduces to a soft shape.

---

## `mirror`: the mirror over the sink (Q03 10–17, 39–42)

- Close on the steamed mirror (its thin frame, the tiles round it).
- In it, the bathroom behind the lens: the door on the left, open on the landing's warm light, its towel hook; the towel rail; the shower's fogged glass on the right.
- The condensation covers it, except a band wiped clear by a hand: near straight, slightly arched, with an irregular wet rim.

**State**

| key | values | what |
| --- | --- | --- |
| `steam` | 0..1, default 0.85 | The fog's density. |
| `wipe` | 0..1, default 1 | The wipe's progress, left to right: his hand clears the band. |
| `band` | false | No band (before the wipe). |
| `bandY`, `bandH` | metres | The band's centre height and its height on the glass. Defaults 1.52 and 0.17: a face's eyes-to-chin. |
| `refog` | 0..1 | The band fogging over again (Q03 39–42). |
| `door` | 0..1, default 0.35 | The door behind, in the glass: 0 shut, 1 wide open on the landing. Q03 39–42: "the steamed mirror shows the door and him leaving". |

**In the glass**: `v.inGlass(c, s, fn)`. `fn(g, mc)` draws in frame coordinates, clipped to the mirror. `mc` is the mirror camera (bathroom metres, as the glass shows them).

Draw the half face (shaving foam, the razor's stroke, the toothbrush) inside, before `front()`. The fog in `front()` then covers it except in the band, which is the "half a face… the face cropped by the steam" of the script.

**Anchors**

- `glass`: the mirror's corners; it fills the frame.
- `band` [[-56,282],[1647,612]]: the band's box at the defaults.
- `faceInMirror` [1038,403] and `facePxPerM` 1392: a face 0.35 m in front of the glass, seen in it.
- `doorInMirror` [764,694].
- `toothbrushInMirror` [1090,587]: his toothbrush, in the glass.

The sink is below this frame.

**Light**: `{x: 300, y: 200, color: '#DCE8E6'}`, the frosted window. In the glass the landing light through the door is warm.

```js
const v = SETS.bathroom.views.mirror, s = { steam: 0.9, wipe: FILM.seg(lt, 10.1, 10.9), door: 0 };
v.back(c, lt, s);
v.inGlass(c, s, (g, mc) => RIG.face(g, 'daniel', { at: v.anchors.faceInMirror, size: 520, view: 'three', ... }, { mode: 'reflection', light: v.light }));
v.front(c, lt, s);
```

---

## `tap`: the chrome mixer (Q03 0–2 on, 17–19 off)

- Close on the shower's mixer: a chrome dome escutcheon, environment-mapped from the bathroom (the window, the dark doorway behind him, the landing's warm slot), on big wet tiles.
- A chrome lever on it.
- With the water on, sheets of fine streaks run down the tiles behind (the rose is above the frame). When it is off, the last drips fall.

**State**

- `lever` 0..1, default 1: 0 points down (off), 1 swings it up and round (on). The hand turns it.
- `flow` 0..1: the water. It defaults to `lever`.
- `drips` 0..1: the last drips after it is off.

**His reflection in the tap**: `v.inGlass(c, s, fn)`. `fn(g)` draws him in frame coordinates. That is pinched into the dome and multiplied into its chrome.

**Anchors**

- `hub` [900,520].
- `leverTipOff` [900,900], `leverTipOn` [1257,390]. `v.leverTipAt(lever)` gives the tip at any angle; the hand holds it there.
- `dome` [900,520,230] (centre, radius).
- `pxPerM` 3200.

**Light**: `{x: 200, y: 0, color: '#E6F0EE'}`.

---

## `hook`: the towel hook, worn pale where the towel always goes (Q03 34–37)

- The back of the bathroom door: gloss paint gone teal-grey in the cool light, its panel moulding, condensation beads.
- A chrome hook. Under it, an oval of paint worn paler and duller, its gloss gone and finely scuffed, where the towel always rubs. It is visible before the towel goes up.
- Steam drifts across (`front()`).

**State**: `towel` 0..1.

- 0: the hook is bare.
- 0..0.7: the towel falls the last few centimetres onto it and swings.
- 1: it settles.

It is a sage-grey terry towel with folds, nap and a hem.

**Anchors**

- `hook` [1010,390]: where the towel hangs.
- `hookPlate` [960,330].
- `wornPatch` [960,560].
- `towelFrom` [1360,30]: the hand comes in from the upper right.
- `pxPerM` 2200.

**Light**: `{x: 0, y: 0, color: '#E6F0EE'}`.

---

## `wardrobe`: the mirrored door slides to a row of identical pale-blue shirts (Q03 37–39)

- A built-in wardrobe with two mirrored sliding doors. The left door slides away on its track and reveals the rail: eleven of the same pale-blue oxford shirts on the same hangers, hung edge-on, each with its collar, its sleeve and cuff. The room's light from the left is on their shoulders.
- The mirrors give back the bedroom in morning light: the blind up and the window bright, the bed.

**State**: `slide` 0..1, default 0.6. 0 is shut; 1 has the door gone to the left.

**In the mirror**: `v.inGlass(c, s, fn)`. `fn(g, mc)` draws him, reflected, into whichever mirror panes are visible.

**Anchors**

- `theShirt` [740,224]: "the same shirt", the fifth from the left. His hand reaches for it.
- `hanger` [740,114].
- `shirtsPxPerM` 783.
- `doorEdgeAt(slide)`: the moving door's edge, for a hand that pushes it.

**Light**: `{x: 0, y: 380, color: '#DCE8EC'}`, the bedroom window, morning, off to the left.

---

## Demos (`node tools/set.js bathroom 1` → `out/set_bathroom.png`)

1. The tap turned on.
2. The shower: water, steam starting, the sun in the glass.
3. The shower fogged, his shape behind (RIG through `behind`).
4. The shower: the rinse runnels.
5. The mirror: the band wiped.
6. The mirror: he leaves, the door in it, the band fogging.
7. The tap off, the last drips.
8. The hook with the towel.
9. The wardrobe sliding.

Times are 12 to 53 ms per frame (the RIG figure is included in demo 3).

## Not fully right yet

- **The mirror's composition.** The mirror fills the frame. The sink, the toothbrush glass and the tap exist in the set but sit below the frame; a wider mirror view is not built.
- **The tap's lever.** It is drawn as a flat gradient bar (not environment-mapped like the dome).
- **The wardrobe's shirts.** They are stylised edge-on shapes. The reflected bedroom is a simple room, not the bedroom set itself.
