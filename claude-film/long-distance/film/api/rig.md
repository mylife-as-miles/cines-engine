# RIG: the characters

`film/rig.js` defines `window.RIG`: Him, Her, the coworker over the divider, and the passengers on the bus. It is Look B, Grain and Gloss:

- **Heads and hands are sculptures.** They are the kit's signed-distance faces (`GG.CAST`), so the strip, the waterfall and the doorway show one face. They are lit in cut bands and laid with paper.
- **Bodies and clothes are cut paper.** Each piece has hand-cut edges, its own texture, a lifted shadow, and two or three posterised bands of the shot's light. Arms have elbows and wrists, and coats have shape.
- **Faces stay quiet.** Mouths are small, lids heavy and expressions small.

Everything is deterministic: there is no `Math.random` and no `Date`.

Run `node tools/set.js rig 1` to see every demo on one sheet (`out/set_rig.png`, 33 demos with the ms per frame).

## What changed after rough cut 1 (the fix round)

All the old calls still work. What you see changes:

- **Collars and cuffs.** Collars are now thin bands of cloth lying on the garment, with the neck showing above them: a narrow rib on the crew necks, a stand and two flat points on the shirt, and a narrow turned-up collar on the coat. Under each collar the garment continues as a yoke, so the neck's end never shows. From behind, the collar band lies across the back of the neck.
  - Collars are clipped under the jaw, so a bowed chin comes in front of them.
  - An arm is now drawn hand first, then the sleeve over the forearm, then the cuff at the wrist. No bare forearm shows above a cuff.
  - A rolled sleeve (`roll`) sculpts the forearm up to the roll.
- **Necks.** Every pose has one. The default neck length follows the costume: tee 0.36, sweater 0.38, shirt 0.44, coat 0.5. `face.neck` still overrides it.
- **Daylight faces.** `day`, `dusk`, `bathroom`, `office`, `stairwell` and `flat` lights are now **soft**: one gentle cut whose shadow side keeps most of the key, a barely wobbling edge, and closer occlusion levels. This applies to sequences that pass their own `keys` too. `RIG.light(name, { soft: 0..1 })` sets it; `soft: 0` brings back the old hard bands.
- **`pale`** is now pallor: the face desaturates and cools, the blush goes and the lips grey. There is no band.
- **`flush`** is now colour on the skin. The neck, the throat and the jaw's sides deepen to a ruddy red under the same light, in two cut steps with a hand-cut edge; the ears go last. The collar lies on top of it.
- **Hands on the story beats:**
  - **The phone grip** (`phone`, `thumb`) has the fingertips round the far edge and the thumb at the near edge or on the glass. `RIG.hand` now returns `phone: {x, y, w, h, angle}`, a true-size phone (0.5 × 1.03 hand lengths) centred in the grip.
  - **The bag** is held from below in one hand, with that hand's thumb alone on the broken zip (`hands: 1`), or in two hands (the default).
  - **Her nape:** the elbow comes up and forward and the hand goes under the bob's hem behind her head.
  - **The trade:** a two-shot pose pair, and an insert built from the same poses (below).
- **The couch.** A new `couch` pose: sitting, lying along the couch with his knees bent inside it, lying down, and getting up (below).
- **Back views** for `stand`, `desk` and `bus` (`view: 'back'`).
- **Off-frame sculptures are skipped.** A head or hand well outside the camera's view is not sculpted.

Sequence workarounds the rig now covers:

| Sequence | Its own code | Use instead |
| --- | --- | --- |
| Q02 | its `CREW` band | Not needed |
| Q03, Q05 | `himBack` and `YOKE` | `RIG.draw(c, 'him', 'desk' / 'bus' / 'stand', { view: 'back', ... })` |
| Q06 | crop 2.95 to avoid the belt band | Not needed: an untucked shirt has no belt band |
| Q08 | `lieFig`, `sleeve`, the jump from the couch | `couch` with `arm: 'hold'`, then `getup` |
| Q09, Q10 | `drawSleeve`, the trade lanes | `RIG.trade` (insert) or the `trade` poses (two-shot) |
| Q11 | `sitOps`, `lieOps` | `couch`: `arm: 'ear'` sitting, `liedown`, then `arm: 'rest'` lying (the hand over the phone beside his face) |

```js
// a shot: the set's back, then the people, then the phone, then whatever covers the phone, then the set's front
const L = RIG.light('pendant', { phone: [1335, 880] });                  // the shot's light; the phone's screen in world px
const him = RIG.draw(c, 'him', 'counter', { x: 846, y: 296, s: 292, light: L, t: st, fork: 0.2,
  face: Object.assign({ yaw: 0.72, pitch: 0.48, gaze: [0.22, 0.32] }, RIG.chew(st)) });
PHONE.draw(...);                                                           // the phone module, in c.gl
him.over(c);                                                               // the fingers that hold the phone, over it, in c.gl
```

All coordinates are world pixels: the space `c.camera(...)` sets on `c.g`. The rig reads the canvas transform itself, so a head sculpted for a push stays sharp. Pass the shot time `t` (any seconds). The rig snaps characters to twos itself: breath, blinks, the murmur and chewing all run at 12 drawings a second.

## Entry points

| Call | Draws | Returns |
| --- | --- | --- |
| `RIG.draw(c, who, pose, p)` | A whole figure: cut-paper body and clothes, sculpted head and hands, props | `fig` (below) |
| `RIG.head(c, who, p)` | One sculpted head (`who`: `'him'`, `'her'`, `'coworker'`) | `head` anchors (below) |
| `RIG.hand(c, who, pose, p)` | One sculpted hand with its forearm | `hand` anchors (below) |
| `RIG.light(name, o)` | A shot light that both sculptures and paper read | A light object |
| `RIG.mouthFor(id, t)` | The mouth step for a voiced line, `t` seconds into its take | `0..3` |
| `RIG.mouthAt(lines, lt)` | The mouth for whichever of a sequence's `lines` is playing at `lt` | `0..3` |
| `RIG.murmur(t)` | His wordless murmur (Q01), as mouth steps | `0..3` |
| `RIG.chew(t)` | A chewing face: `{mouth, cheek, cheekSide}` to merge into `face` | Object |
| `RIG.breath(t, amp, hz)` | The breath offset in px (2.5 px at 0.25 Hz by default) | px |
| `RIG.blink(t, seed)` | A lid multiplier: 1 when open, dipping over three drawings every 4.6 to 6 s | `0..1` |
| `RIG.coworker(c, p)` | The coworker looking over a divider (Q03) | `fig` |
| `RIG.passenger(c, p)` | One close paper silhouette on the bus (Q05) | `fig` |
| `RIG.trade(c, u, p)` | The hands insert: phone for bag on the centre line (Q10), built from the two `trade` poses | `{phone, him, her, over(c)}` |
| `RIG.tradeTime(u)` | The trade's phases: `{reach, take, swap, back}` | Object |
| `RIG.bag(c, x, y, s, o)` | The floral makeup bag alone (the wardrobe shelf) | |
| `RIG.faceGlow(c, head, o)` | The screen's smooth light on a face, in `c.gl`, clipped to the head | |
| `RIG.cacheInfo()`, `RIG.cacheClear()` | Cache state and reset | |
| `RIG.ready` | A promise that resolves when `audio/voice_env.js` has loaded (the rig loads it itself) | |
| `RIG.demos` | The demo sheet | |

Tables: `RIG.POSES` (bodies), `RIG.HANDS` (hand poses), `RIG.LIGHTS`, `RIG.COSTUME`, `RIG.CAST`, `RIG.PROP` (proportions in head units), and `RIG.MOUTH` (the four mouth openings).

## Units and placement

- **`p.x, p.y`** is the world point between the eyes, with the head upright. With a large head turn or bow, the head pivots on its neck, so it lands a little away from this point (`fig.heads.head.x/y` gives where it went).
- **`p.s`** is px per head, from crown to chin. He is about 7.4 heads tall and she about 7, so feet stand at `y + 6.8·s` for him and `y + 6.4·s` for her. Hands are sculpted at 0.68·s for him and 0.62·s for her.
- **Phones are true size**, about 0.7·s tall (`fig.phone.h`).
- **`p.flip: true`** mirrors the figure. Every pose faces screen right (toward the empty half when he is on the left); flip it for her standing on the right facing left, as in B3.
- **`p.light`** is a `RIG.light(...)` object or a name. Use one light per shot.
- **`p.t`** is the shot's time, for the breath and blinks. `p.breath` (px) overrides the breath; `p.blink: false` stops blinks. `'still'` has neither.
- **`p.target: 'gl'`** draws into the gloss layer, with this frame's film grain laid into the piece. `p.alpha` sets the opacity.

## Light: `RIG.light(name, o)`

| Name | Shot | Sculptures | Paper |
| --- | --- | --- | --- |
| `night` | Bedroom at night (Q01, Q07) | Blue streetlight, one cut band | Deep blue, light from above right |
| `later` | Bedroom, later (Q01 22 s) | Dimmer | Darker |
| `pendant` | Living room at night (Q06, B2) | Warm lamp from above, two bands | Warm, from above |
| `day` | The visit (Q08 to Q11, B3) | Grey window from the left, two bands | Neutral, from the upper left |
| `dusk` | The couch at the end (Q11) | The daylight going blue | Blue-grey |
| `bathroom` | Mornings (Q02, Q07) | Cold window, two bands | Cold white |
| `office` | Q03 | Fluorescent from above, green-grey | Grey-green |
| `stairwell` | Q04 | One high window band | Concrete grey |
| `bus` | Q05 | Sodium orange from the window, dusk blue fill | Blue, with a sodium rim |
| `flat` | Demos | Neutral | Neutral |

Options:
- **`phone: [x, y]`** gives the world point of the lit screen. It adds the phone's light to every sculpture, smooth and never banded, as the look requires.
- **`phoneCol`, `phoneK`** (strength) and **`phoneZ`** (head units toward the camera, default 0.9) adjust that light.
- **`keyK`** scales the key lights, **`amb`** replaces the ambient, and **`paper: {...}`** overrides any paper field: `mul`, `gain`, `from` (the screen direction the light comes from), `lit`, `litA`, `shade`, `shadeA`.
- **`soft`** (0..1) softens the faces' cut. It defaults to 1 for `day` and `dusk`, 0.8 for `bathroom` and `office`, 0.6 for `flat`, 0.5 for `stairwell`, and 0 elsewhere. A key may also carry `floor` (the level of its shadow side) and `jit` (how much its edge wobbles).

The phone's light moves with the phone, quantised to 0.1 head. Every change of that light reshades a head (see costs). Keep the phone still while a face holds.

## Heads: `RIG.head(c, who, p)`

| Field | Range | Notes |
| --- | --- | --- |
| `x, y, s` | px | Between the eyes; head height |
| `yaw, pitch, roll` | rad | `yaw` + turns toward screen right, `pitch` + bows. Snapped to 0.04 |
| `lids` | 0 shut .. 1 wide | Defaults: him 0.72 (heavy-lidded), her 0.78. Snapped to 0.1. `eyes` is an alias |
| `gaze` | `[x, y]`, about −0.6..0.6 | Snapped to 0.1. + is right / down |
| `brows` | −1 knit .. 1 raised | Snapped to 0.25. Keep within ±0.4: faces are quiet |
| `smile` | 0..1 | Snapped to 1/8. 0.3 to 0.6 is his smile |
| `mouth` | integer step 0..3, or a number 0..1 | Steps are `RIG.MOUTH` = [0, 0.13, 0.26, 0.4]: closed, parted, open, wide. Feed `RIG.mouthFor` here |
| `cheek`, `cheekSide` | 0..1, −1/1 | A mouthful in one cheek ("stopped chewing": `cheek: 0.6, mouth: 0`) |
| `flush` | 0..1 | Colour rising on the skin of his neck and throat in two cut steps: 0 is below the collar, 0.8 reaches the jaw's sides, 1 is the ears too. The face's front keeps its colour. Snapped to 1/16 |
| `ears` | 0..1 | The ears alone go red, lobe first (Q05). Snapped to 1/8 |
| `pale` | 0..1 | Pallor: the colour leaving his face (Q08). The whole face desaturates and cools, the blush goes and the lips grey. Snapped to 1/12 |
| `neck` | head units | Neck length. In `RIG.draw` the default follows the costume (tee 0.36, sweater 0.38, shirt 0.44, coat 0.5); for a lone `RIG.head` it is 0.6 / 0.56 |
| `light`, `mode` | | `mode`: `'grain'` (life, the default), `'gloss'` (the generated photos), `'flash'` (the strip) |
| `shadow` | `{dx, dy, alpha}` head units, or `false` | The lifted shadow under the piece |
| `hair` | `'short'`, `'bob'`, `'long'` | Her long hair is the kit's "then" |
| `target` | `'gl'` | The gloss layer, with grain laid in |

The returned anchors are in world px: `chin`, `neck`, `neckBase`, `crown`, `earL`, `earR`, `nose`, `mouth`, `eyeL`, `eyeR`, `jawL`, `jawR`, plus `proj(lx, ly, lz)` for any point on the head.

### Face states

| State | Fields |
| --- | --- |
| Smile (Q01, Q02 through foam, Q08 texting) | `smile: 0.4..0.6, lids: 0.6` |
| Murmur (Q01, his voice unheard) | `mouth: RIG.murmur(t), smile: 0.3` |
| Speaking a take | `mouth: RIG.mouthFor('L014', lt - 31.5)` (the line's `at`) |
| Heavy lids, eyes closing (Q01, Q11) | `lids` from 0.4 to 0 over 2 to 3 s |
| Stopped chewing (Q06 30 s) | `cheek: 0.6, mouth: 0, lids: 0.82`, eyes held on the phone |
| Bites back a smile (Q03) | `smile: 0.2, mouth: 0, brows: 0.15` |
| Shock, colour leaving (Q08 27 s) | `pale: 0 → 1` over 3 s, `lids: 0.86, brows: 0.25`, `smile: 0` |
| Flush rising (Q04 18 to 26 s) | `flush: 0 → 1` |
| Ears going red (Q05 15 to 18 s) | `ears: 0 → 1` |
| Ashamed, eyes down (Q09, Q10) | `pitch: 0.45, lids: 0.25, gaze: [0, 0.6]` |
| Her, composed and tired | `lids: 0.7` |
| Her eyes travelling (Q08 50 s) | Key `yaw` and `gaze` |
| Her looking away | `yaw: -0.6, gaze: [-0.35, 0]` |
| The breath drawn, then swallowed (Q10 66.6 s) | `mouth: 1, brows: 0.25, pitch: -0.04`, then `mouth: 0, pitch: 0.06` |
| Very still (Q10 40 s) | Pose `'still'` (no breath, no blink) with `lids: 0.5, gaze: [0, 0.55]` |

## Lip sync

`tools/voice_env.py` reads every take in `audio/vo/voice_map.json`:
- It computes RMS per 1/12 s, with the picture 40 ms ahead of the sound.
- It normalises each line between its floor and its loud syllables, adds syllable contrast, smooths with a fast attack and release, and quantises to 0..3.
- It writes `audio/voice_env.js` (`window.FILM_VOICE_ENV`).

The phone's lines (`as: 'phone'`) are empty lists, so nobody's mouth moves to the phone.

Rebuild after new takes with `python3 tools/voice_env.py`. It prints each envelope as `_.oO` strings.

```js
lines: [{ id: 'L014', at: 31.5 }],
... RIG.draw(c, 'him', 'bag', { ..., face: { mouth: RIG.mouthFor('L014', lt - 31.5) } })
// or: face: { mouth: RIG.mouthAt(seq.lines, lt) }
```

## Bodies: `RIG.draw(c, who, pose, p)`

Common fields:
- `x, y, s, flip, light, t, face` (any head field, over the pose's own face), `costume`, `target`, `alpha`.
- `tau` is the body's turn: 0 faces us, +0.4 is three-quarter toward screen right.
- `crop` is a y in head units below which nothing is cut. Use it when a counter, desk or frame edge hides the rest: it saves time.

### Him

| Pose | Scene | Its own fields |
| --- | --- | --- |
| `couch` | **The couch** (Q08, Q11): `u` 0 sitting .. 1 lying on his side along the couch, facing us, knees bent and inside it. `rise` 0..1 takes him from sitting to standing | `hip: [x, y]` (world px: the seat point under his hip; give it for any transition, since the hip stays put and the body turns about it), `dir` (1: feet to screen right, head left; −1 mirrored), `fit` (world x of the far arm's inner face: the knees bend more to keep his feet inside), `arm`, `phone: [x, y]` (lying, `arm: 'rest'`: his top hand comes over from his shoulder and lies on the phone; default spot beside his face, `fig.info.phoneSpot`), `seat` (heads from hip to floor, 1.9), `lie` (the body's angle lying, −1.48). `arm` is `'rest'`, `'hold'` (the phone up in front of his face), `'ear'` (sitting), `'lap'` (sitting) or `'tuck'`. Returns `fig.info.{hip, seat, head, knee, feet, phone, phoneSpot}` (world) and `fig.phone` |
| `liedown` | Sitting to lying: `couch` with `u` 0 → 1 | as `couch` |
| `getup` | Lying to standing: `u` 0 → 0.5 sits him up, 0.5 → 1 stands him. Then cut or dissolve to `stand` placed at `fig.info.head` | as `couch` |
| `trade` | His half of the trade, two-shot (Q10 54 to 59 s) | `u` 0..1 (the same `u` for both), `line: [x, y]` (world: where phone and bag cross; stand him about 1.85 heads left of it). He holds the bag out from underneath; his other arm takes the phone's near end; after the swap he holds the phone (`fig.phone`). `fig.info.phone`, `fig.info.bag` |
| `lie` | On his side, head on the pillow at the left, facing us, under the duvet (B1, Q01, Q07). For the couch use `couch` | `arm`: `'rest'` (the hand over the phone; `reach` 0..1 brings it from by his face), `'hold'` (the phone up in front of his face, texting; `thumb`, `tap`), `'tuck'`. `phone: [x, y]` world px. `cover`: the duvet's colour (default `#29324B`) or `false` for the couch (the sweater, the whole body). `sx` is the high camera's squash (0.56 bed, 0.72 couch). `rot` (default −1.42) |
| `counter` | Eating from the pan at the counter, the phone on the salt (B2, Q06) | `fork` 0 (over the pan) .. 1 (at his mouth). Chewing goes in `face` via `RIG.chew(t)`. `info.pan`, `info.fork` |
| `basin` | Brushing at the basin, in the mirror (Q02, Q07). The tee | `brush` (stroke phase: `t * 2.2`), `foam` 0..1 |
| `desk` | At his desk, hands on the keyboard (Q03). The shirt | `reach` 0..1 sends his hand to `phone: [x, y]` and lays it flat over it (face down, `over`). `view: 'back'`: from behind, arms hidden to the keyboard, elbows out; `reach` brings his right hand out to the phone |
| `step` | Sitting on a step, forearms on his knees, the phone in both hands (Q04) | `tilt` 0..1 (tilted to his chest), `thumb` 0..1 (scrolling) |
| `bus` | Standing, one hand on the overhead rail, the phone at his chest, earbuds in (Q05) | `rail: [x, y]`, `sway` (±0.05), `thumb`. `view: 'back'`: from behind, the rail arm over his shoulder, the phone hidden in front of him |
| `walk` | In profile, arms swinging | `phase` (add 0.9 a second: the cycle on twos), `carry: 'bag'`. Move `x` by about 290 px a second at `s` = 120 |
| `door` | At the door, a hand on its edge (Q08) | `edge: [x, y]` (world px where his hand grips), `tight` 0..1. Pass `clip` in a hand insert so the fingers go behind the edge |
| `bag` | Holding the makeup bag low in front, from underneath, his thumb on the broken zip, head bowed (Q09, Q10) | `zip` (the thumb's worrying phase: `t * 0.75`), `hands` (2 by default; 1: in one hand from below, the other arm easy), `bagAt: [x, y]` (world), `view: 'back'` (over his shoulder, B3). `fig.info.bag`, `fig.info.zip` |
| `sit` | On the couch, the phone at his ear (the old pose; `couch` with `u: 0, arm: 'ear'` lies down from it) | (the phone at `fig.phone`) |
| `stand` | Standing, arms easy (stepping aside, the wardrobe) | `armL`, `armR` (arm specs, below), `lean`, `shrug`, `view: 'back'` (from behind; `tau` turns him a little, `face.yaw` about π) |

Costumes:
- `'tee'` is the faded green tee, worn at night. Its arms are bare and sculpted whole.
- `'shirt'` is the pale blue office shirt: crushed collar, cuffs, a coffee mark.
- `'sweater'` is the grey-brown sweater for the visit, with a stretched rib collar.

The defaults per pose follow SEQUENCES.md: the bed is the tee; office, stairs, bus and counter are the shirt; the visit is the sweater.

### Her

| Pose | Scene | Its own fields |
| --- | --- | --- |
| `doorway` | Square to him in the doorway, one hand on her strap (Q08 20 s) | |
| `guest` | Just inside the door like a guest, both hands at her waist, coat on (Q08 37 s) | Key `face.yaw` and `face.gaze` for her eyes travelling |
| `phone` / `phone_up` / `phone_back` | The phone held up between them, screen to him (B3). `hold` 0..1 turns it back to her, studying it | `hold`, `nape` 0..1 (her free hand rises to the back of her neck, where her hair used to be: Q10 21 to 24 s), `reach` 0..1 (her arm out: the trade), `thumb` 0..1 (her thumb on the glass) |
| `still` | Very still (Q10 40 to 44 s): the phone held low, no breath, no blink | `face` |
| `walk` | Leaving (Q10 70 s) | `phase`, `carry: 'bag'` |
| `stand` | Standing | `armL`, `armR` |
| `trade` | Her half of the trade, two-shot: the phone held out on her palm, her thumb at its edge; her other hand takes the bag by its far end; after the swap she holds the bag at her side | `u`, `line` (stand her about 1.85 heads right of it, `flip: true`). `fig.info.phone` (the phone's centre while she holds it), `fig.info.bag` |

She always wears the bottle-green coat, collar up, kept on: lapels, buttons, flap pockets, shoulder seams and turned cuffs. The tan strap crosses her to the small bag at her hip. She has the copper bob and freckles.

### The returned `fig`

- `fig.heads.head`: the head anchors.
- `fig.hands.L` / `.R`: the hand anchors. `L` and `R` are the screen-left and screen-right arms in the unflipped pose.
- `fig.info`: the pose's own points, in world px: `shoulders`, `elbows`, `wrists`, `neck`, `hips`, `phone`, `pan`, `fork`, `bag`, `edge` (and for `couch`: `hip`, `seat`, `head`, `knee`, `feet`, `phoneSpot`).
- `fig.phone`: `{x, y, w, h, angle, facing, hand}`, where a held phone goes, centred on the hand's grip. `facing` is `'out'` (screen to the camera or to him), `'her'` (turned back) or `'up'`. Draw it with PHONE.
- `fig.over(c)`: redraws the fingers that cover the phone (the thumb on the glass, the hand over it on the pillow) into `c.gl`, with this frame's grain. **Call it after the phone.** The gloss layer is composited after the world, so without it the phone would cover his hand.
- `fig.toWorld([x, y])`: maps figure units (head units from between the eyes) to world px.

### Arm specs (for `stand`, `armL`/`armR`, and new poses)

| Field | Meaning |
| --- | --- |
| `a1`, `a2` | Upper arm and forearm angles from hanging straight down, in rad. + is toward the body's centre |
| `to: [x, y]` | Or a wrist target in figure units, solved with two-bone IK (`bend` ±1 picks the elbow's side) |
| `E`, `W` | Or explicit elbow and wrist |
| `hand` | A pose name from `RIG.HANDS`, or `false` |
| `hp` | Hand fields: `close`, `tight`, `zip`, `reach`, `tap`, and `over` (which digits redraw over the phone) |
| `front` / `behind` / `order` | Draw order against the torso. `beforeHead`: in front of the body, behind the head (a hand at the nape). `over`: in front of his back in a back view |
| `handAt`, `handRot` | Place the hand at this point and turn, instead of at the wrist along the forearm (a cheat for foreshortened forearms: B2's fist, the bag) |
| `roll` | 0..1: the sleeve rolled up the forearm (his shirt, "one sleeve rolled higher") |

To build a new pose, call `RIG.person({...})` (as the poses in `rig.js` do) and draw it with `RIG.drawFigure(c, {who, x, y, s, light, ops})`.

## Hands: `RIG.hand(c, who, pose, p)`

`p` fields:
- **`x, y`** is the wrist in world px; **`s`** is px per hand length, wrist to middle fingertip (about 0.68 × the head).
- **The turn** is either `rot` (radians about the view axis) or `fore: [dx, dy]` (the screen direction from the wrist to the elbow; the pose turns so its forearm runs that way).
- **`flip`** is the other hand, mirrored with its light mirrored too.
- **`foreLen`** and **`foreR`** set the sculpted forearm's length and radius, in hand units. **`upperW: {dir, len, r}`** adds a sculpted upper arm, for bare arms.
- **`only`** is `'thumb'`, `'tips'`, `'dist'`, `'fingers'` or a list: only those digits, to draw over the phone in `c.gl`. `'hand'` is the whole hand without its forearm (a sleeved hand over the phone). **`noThumb`** drops the thumb, to lay it alone over a prop afterwards (the bag).
- **`clip: {a, b}`** keeps the part left of the line a→b, such as fingers round a door's edge.
- **`light`, `mode`, `target`, `shadow`, `alpha`**, plus each pose's own controls.

Returns world points: `tips` (4), `thumb`, `grip` (where the held object sits), `knuckles`, `elbow`/`shoulder` (sculpted arms), `angle`, `rot`, `flip`, and for `phone`/`thumb`: `phone: {x, y, w, h, angle}`, the true-size phone in the grip.

| Pose | What | Controls |
| --- | --- | --- |
| `rest` | Over the phone like a hand on a sleeping shoulder: fingers draped down its back, no thumb (B1) | `foreLen` |
| `phone` | A phone held in one hand, screen to the viewer: its back on the palm and fingers, only the fingertips round its far edge, the thumb at its near edge (B3) | `reach` 0..1 sends the thumb up the glass, `tap` 0..1 lifts it |
| `thumb` | The same grip with the thumb over the glass: typing, scrolling, swiping (the inserts, her thumb in Q10). Draw it whole on `c.g`, the phone at `hand.phone`, then `only: ['thumb', 'dist']` on `c.gl` | `reach` (default 0.5), `tap` |
| `ear` | The phone at his ear, fingers up its back | |
| `pan`, `fork` | B2's fists. The fork passes through the fist (draw it before and after) | |
| `brush` | The toothbrush at his mouth | |
| `rail` | A fist round the bus's overhead rail | |
| `door` | Round a door's edge, the back of the hand to us. Use `clip` | `tight` 0..1 (the knuckles lighten) |
| `bag` | Under the makeup bag, palm up, the fingers flat under it, the thumb over the top on the broken zip. Draw `noThumb: true`, then the bag, then `only: 'thumb'` | `zip` (the worrying phase) |
| `nape` | Her hand at the back of her neck (B3) | |
| `offer` | Holding something out, palm up (the trade) | `close` |
| `take` | Reaching to take, closing to a pinch (the trade) | `close` |
| `flat` | Palm down on a surface (the phone turned face down) | `close` |
| `keys` | On the keyboard | |
| `strap` | Her hand on her bag strap | |
| `relax`, `carry` | Hanging at the side; carrying the bag by its top | `close` |

**The trade (Q10 54 to 59 s):** the same `u` (0 to 1, keyed on twos) drives the two-shot and the insert. `RIG.tradeTime(u)` gives the phases:

| Phase | `u` | What happens |
| --- | --- | --- |
| reach | 0 to 0.35 | She holds the phone out on her palm, he holds the bag out from below |
| take | 0.35 to 0.6 | His free hand takes the phone's near end, hers takes the bag's far end |
| swap | 0.62 | The phone and the bag change hands |
| back | 0.66 to 1 | Both draw back |

The fingers never touch: about half a head separates them at the phone and about 0.4 head at the bag.

- **Two-shot:** use `RIG.draw(c, 'him', 'trade', { u, line, ... })` and `RIG.draw(c, 'her', 'trade', { u, line, flip: true, ... })`, each one arm out from the shoulder. Draw the phone (lying flat) at `him.phone || her.phone`, then call `him.over(c)` and `her.over(c)`.
- **Insert:** `RIG.trade(c, u, {x, y, s, light, t})` draws the same two poses seen close, the line at (x, y), hand length `s` (300–400). Their forearms come from shoulders off frame at the two-shot's angles: his sweater from the left, her coat from the right. It returns `{phone: {x, y, w, h, angle: 0, facing: 'flat'}, him, her, over(c)}`.

## Background people

- **`RIG.coworker(c, {x, y, s, rise, look, light, t})`** shows the coworker in a cardigan, a sculpted head of his own (`RIG.CAST.coworker`). `rise` 0..1 brings him up over the divider; `look` 0..1 turns his head to the desk. Draw the set's divider after him.
- **`RIG.passenger(c, {x, y, s, kind: 0..4, side, flip, light})`** draws close paper silhouettes in five kinds: short hair, bun, cap, long hair, hood. Each is dark paper with the window's sodium rim. `side: true` is a profile, used for "a stranger's shoulder against his arm". They have no faces.

## Costs and the cache

Measured headless (no GPU) on the demo sheet, with `out/costs.js` clearing the cache before each demo:

| What | First time | Afterwards |
| --- | --- | --- |
| A head, sculpted (geometry + shading), s = 250 to 300 | 0.8 to 1.2 s | <1 ms (one `drawImage`) |
| A close-up head, s = 420 to 460 | 2 to 3.5 s | <1 ms |
| A head reshaded on kept geometry (new `lids`, `gaze`, `brows`, `smile`, `flush`, `ears`, `pale`, or light) | 0.05 to 0.5 s | <1 ms |
| A hand, s = 150 to 250 | 0.15 to 0.35 s | <1 ms |
| A bare sculpted arm (the tee) | 0.8 to 1.4 s | <1 ms |
| A cut-paper layer (one sleeve, a torso, a collar) | 3 to 40 ms | <1 ms |
| **A whole frame once cached** (33 demos, `tools/set.js`) | | **45 to 126 ms** (B1 bed 126 ms, B3 between 61 ms, the trade insert 73 ms) |
| A cold demo frame (everything new) | 0.7 to 8 s (the six-face sheets and the trade insert, about 10 s, are the worst) | |
| A sequence frame, cold (`tools/frame.js`, Q04 to Q11) | 0.5 to 11 s (the first frame of a shot) | |

**Everything is quantised:**
- Head angles snap to 0.04 rad, lids and gaze to 0.1, smile to 1/8, brows to 1/4, flush to 1/16, pale to 1/12 and ears to 1/8.
- The mouth has four steps, but only two geometries: closed or parted, and open or wide.
- Hand turns snap to 0.05 rad.
- Render scales step by 15 % and always round up, so a slow push re-sculpts once every 15 %.
- Body layers are keyed only by what changes them, so a moving arm never re-cuts the torso. Each layer is clipped to what the camera shows.

**Two caches:**
1. **Pictures:** heads, hands and paper layers, held in a least-recently-used cache with a budget of `RIG.cacheBudgetPx` = 64 Mpx (about 256 MB).
2. **Geometry:** G-buffers, `RIG.gbufBudgetBytes` = 160 MB, about 10 MB for a 300 px head. These turn a blink, a gaze shift, the flush or the pale into a reshade instead of a sculpt.

`RIG.cacheInfo()` reports entries, Mpx, G-buffers, hits, misses, sculpts, reshades and evictions. `RIG.stats.log` lists the last 400 renders with their ms.

**Budgeting a shot:**
- Each new drawing costs a sculpt or a reshade. A held face costs nothing.
- Lip sync costs 2 geometries per head angle, then reshades.
- A head turn costs a sculpt for every 0.04 rad it passes through, so a 0.6 rad turn is about 15 sculpts, about 15 s at 300 px, paid once.
- Prefer turns that land and hold. Keep long dialogue holds at one angle, and let the eyes (`gaze`) and lids carry the movement.

## Caveats

- **The rig never draws the phone.** It tells you where the phone goes (`fig.phone`, `trade().phone`) and draws the fingers over it (`fig.over`). The demos use a stand-in black slab; the film's phone is `PHONE`.
- **The rig carries its own copy of the kit's head sculpture and renderer** (`kit/look_b.js`: `makeSDF`, `head`, `render3D`). Shape and shading are identical: checked pixel for pixel against `GG.head`. The copy adds three things:
  - the flush (colour on the skin) and the pallor
  - a small jaw drop for open mouths
  - a throat shadow under the jaw (the renderer casts none; it removes the dark jaw line the reviewers saw in B2)

  The copy also renders about twice as fast: rays start near the surface, and the face's features and the hair's noise are skipped wherever they provably cannot change the surface. **If the kit's sculpture changes, port the change into `rig.js`.** The photos (`GG.couple`, `GG.waterfall`, `GG.photoStrip`) still use the kit's own `GG.head`, so keep the two in step.
- **Necks are a little thicker** than the kit's (`neckR` 0.205 him and 0.172 her, against 0.175 and 0.152). The reviewers saw long necks; the thicker neck reads shorter. The photos keep the kit's.
- **`lie`** is the standing figure turned and squashed for B1's high camera (`sx`), under the duvet. On the couch use `couch`: its legs are cut in the world's frame and its hip stays on the seat.
- **The couch's camera:** `couch` is built for a camera in front of the couch, at or a little above seat height (the elevation). For a high camera looking down, use `lie`.
- **The couch's layers:** draw the set's seat and front panel before him and the couch's arms after him. Sitting, his shins hang in front of the front panel; lying, he is on the seat.
- **Walking** is a 12-drawing profile cycle. There is no three-quarter walk.
- **Back views** exist for `stand`, `desk`, `bus` and `bag` (`view: 'back'`). The walk, the step, the counter and her poses have none.
- **The pivoting head:** a large `pitch` or `roll` moves the head about 0.1 head off `p.x, p.y`. Read `fig.heads.head` for where it went.
- **Strings in `FILM.key`:** pose strings (`arm: 'rest'`) snap at the midpoint. Key only numbers (`reach`, `hold`, `nape`, `fork`).
