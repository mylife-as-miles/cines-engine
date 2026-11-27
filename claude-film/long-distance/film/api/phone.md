# The phone (`PHONE`, `film/phone.js`)

The phone is the film's antagonist and its whole visual idea: the only smooth thing in a cut-paper world. Everything it is and makes is **gloss**: perfect vector edges, clean gradients, no texture, drawn on `c.gl`, the layer composited after the grain. Only two things it causes live in the paper world: its **light on real surfaces** (`PHONE.glow`, on `c.g`) and its **contact shadow**.

The engine loads `film/phone.js` after the rig and before the sets, so `window.PHONE` is there when a sequence's `setup()` runs. Demos: `node tools/set.js phone 1` writes `out/set_phone.png` (14 demos, 4 s each).

```js
// Q06 at 22 s: the picture opens on the phone propped against the salt
const Q06_THREAD = { clock: 'night', history: 'morning', steps: [{ stamp: '23:14', at: 0 }, { at: 20.5, her: { image: 'waterfall' } }] };
shots: [{ at: 22, name: 'phone: the image', draw(c, st, lt) {
  SETS.living.views.counter.back(c, lt, { tod: 'night' });
  const P = { x: 1338, y: 840, head: 320, yaw: -0.22, pitch: 0.14, screen: 'image',
              state: { open: FILM.seg(lt, 22.3, 23.3), thread: PHONE.exchange(lt, Q06_THREAD) } };
  PHONE.glow(c, { info: PHONE.where(P, c), sy: 0.4 });   // its light on the counter (c.g, under the grain)
  PHONE.draw(c, P);                                      // the body and the screen (c.gl, after the grain)
  SETS.living.views.counter.front(c, lt, { tod: 'night' });
} }]
```

Contents: 1 `PHONE.draw` · 2 `PHONE.glow` and `PHONE.light` · 3 Screens and states · 4 Timing helpers · 5 Constants · 6 Recipes, Q01–Q11 · 7 Costs · 8 Caveats.

---

## 1. `PHONE.draw(c, p)` → `info`

Draws the phone at true size onto `c.gl` (in the coordinates of `c.gl`'s current transform, so `c.camera()` applies), plus its contact shadow and the halation glow. It never draws on `c.g` unless you ask (`shadow`, `under`).

**Scale.** True size is about 0.7 of a head's height at the same depth. Pass `head` (the head's px height at that depth, as given to `GG.head` / `RIG.head` as `s`) and the phone sizes itself, or pass `h` (the body's height in px).

### Placing it: two ways

**3D** (any position, scale and rotation; orthographic unless you set `persp`):

| Param | Default | Meaning |
|---|---|---|
| `x`, `y` | frame centre | Where the centre of the screen face goes |
| `h` | 300 | Body height in px (the outline including the frame) |
| `head` | — | Instead of `h`: `h = 0.7 × head` |
| `spin` | 0 | Rotation about the phone's own normal, applied first. `±π/2` = landscape |
| `yaw` | 0 | Turn about the vertical. `π` = turned away (back and camera bump), `±π/2` = on its edge |
| `pitch` | 0 | Tilt the top away. `~1.1–1.3` = lying on a table seen from the front |
| `roll` | 0 | In-picture rotation, applied last |
| `persp` | 0 | Focal distance in px for foreshortening (e.g. `1600`); 0 = orthographic, which is cheaper (the screen warps in one draw) |

Order: `roll · pitch · yaw · spin`. Examples: facing camera `{}`; turned away `{yaw: Math.PI}`; on its long edge, back to us, screen tipped up toward him (B1) `{spin: -Math.PI/2, yaw: Math.PI - 0.2, pitch: -0.6}`; face down on a desk `{pitch: 1.2, yaw: Math.PI}`; face up on a desk `{pitch: 1.2, spin: -0.2, persp: 900}`.

**Quad** (an explicit perspective from a set's camera):

| Param | Meaning |
|---|---|
| `quad` | `[tl, tr, br, bl]`: the four corners of the **visible face** (the glass, not the frame), in world coordinates. For the back, list the back's own corners as you would see them head-on (the camera island is top-left). |
| `face` | `'front'` (default) or `'back'` |
| `edge` | `[dx, dy]`: where the opposite face sits, i.e. the thickness as seen. `[0,0]` = no side visible. B2's phone has about `[10, 2]` |
| `facing` | Back only: `[dx, dy]` (length 0..1) — which way the hidden screen points, for its spill of light. Default: away from `edge` |

### The screen

| Param | Default | Meaning |
|---|---|---|
| `screen` | `'black'` | One of the screens in §3 |
| `state` | `{}` | That screen's state (§3) |
| `t` | `c.lt` | Seconds, for screens with their own motion (the app's line, the caret). Quantised to ones |
| `bright` | 1 | Screen brightness 0..1 (multiplies its light too) |
| `lit` | true | `false`: the screen throws no light (no spill, no halation) |
| `tone` | from the screen | Override the light's colour: `'night'`, `'water'`, `'pink'`, `'skin'`, `'violet'` or a hex |
| `buzz` | 0 | Vibration, 0..1: a deterministic jitter on ones (about `0.006 h`). Q02's buzz on the glass and Q03's on the desk |

### The look

| Param | Default | Meaning |
|---|---|---|
| `env` | `#AAB4C8` | The room's light on the frame, the glass edge and the sheen (blue streetlight at night, `#F0D8B8` under the pendant, grey by day) |
| `lightDir` | `[-0.6, -0.8]` | Where the frame's highlight comes from (screen space) |
| `sheen` | 0.05 | The single clean sheen across the glass (the back gets twice this, frosted) |
| `alpha` | 1 | Opacity of the whole phone |
| `blur` | 0 | Defocus the whole phone, in px (a `filter` on the final blit: costs ~1–3 ms) |
| `spill` | on | When the screen is turned away or on its edge, its light escapes round the edges (smooth, warm, gloss), mostly on the side the screen faces (B1's line of light past the top edge). `false` = none, a number scales it |
| `emissive` | `0.5 × light` | How much of the phone goes into `c.em` (halation) |

### The world

| Param | Default | Meaning |
|---|---|---|
| `shadow` | none | `true` or `{dx, dy, blur, alpha}` (px): a soft contact shadow on `c.g` (it is real, so it takes the grain). For a phone lying or propped on something; not for a phone in a hand |
| `under` | `true` when `mask` is set | Also copy the phone onto `c.g`, under the grain, so an occluder's soft edge meets phone and not the floor |

### The occluder hook (a hand or thumb over the phone)

The hand stays in the paper world (with its grain): **draw the phone first with a `mask`, then draw the hand on `c.g`**. The mask is cut out of the gloss, so the paper hand shows through the glass where it is in front.

| Param | Meaning |
|---|---|
| `mask` | A `Path2D`, a `{canvas, x, y, w?, h?}` (a `GG.hand` / `GG.head` result works as is), a canvas (drawn at 0,0), a `function (m) {...}` that fills shapes into `m` (any colour; alpha counts), or an array of these. World coordinates, the same transform as `c.gl` |
| `maskShadow` | The occluder's soft shadow on the glass. On by default; `false` or `{dx, dy, blur, alpha}` |
| `over(gl, info)` | Called after the phone is on `c.gl` (with `c.gl`'s transform): draw anything that must sit on the gloss, e.g. a grain-matched piece with its own paper texture (`GG.texture`) |

```js
const hand = RIG.hand(c, 'him', pose);                          // or GG.hand({...}) -> {canvas, x, y}
PHONE.draw(c, { quad: Q, edge: [12, 4], screen: 'thread', state: S, mask: hand });
c.g.drawImage(hand.canvas, hand.x, hand.y);                      // after PHONE.draw, on the paper
```

### What it returns (`info`)

| Field | Meaning |
|---|---|
| `quad` | The screen's four corners (world) |
| `at(u, v)` | World point at normalised screen coordinates (0..1) |
| `pt(x, y)` | World point at screen points (0..360, 0..780) |
| `center` | Centre of the screen |
| `h` | Body height in px |
| `facing` | `'front'`, `'back'` or `'edge'` |
| `n2` | The screen's normal projected to the picture (length = how much it tilts sideways) |
| `light` | `{x, y, tone, k, r}`: where its light comes from, its colour, strength (0 when black or dimmed out) and a good radius. Feed it to `PHONE.glow` and `PHONE.light` |
| `targets` | Named world points on the current screen for choreography (thumbs, glances): see §3 |
| `path` | The body's silhouette (`Path2D`, world), e.g. to clip a reflection or keep a glow off it |
| `screenPath` | The screen's rounded outline (`Path2D`, world), when the face is visible |

### `PHONE.where(p, c)` → `info`

The same `info` without drawing anything: geometry and light, and the targets when the face is visible (it renders or reuses the screen, which `draw` then takes from the cache). Use it to place a thumb on `targets.send` or a glow before the phone is drawn. `c` is optional (without it the camera is ignored).

---

## 2. The light

### `PHONE.glow(c, p)`

The screen's light on the world: a smooth radial falloff with no bands, blended `screen` onto **`c.g`, the paper world, under the grain**.

**Why on `c.g`, as in B1 and B2.** It lights paper, so it belongs to the paper: drawn before the finish, it sits in the surfaces it touches and takes their grain and fibre like every lit surface, and the grain dithers the gradient so it never bands (an 8-bit gradient in the dark posterises; B1's and B2's glows were drawn the same way). What makes it the phone's light is its **shape**, not a missing grain: every lamp, window and streetlight in the film is cut into posterised bands (`GG.bands`, `OTM.lightPool`); this is the only light that falls off smoothly. The very edge of the light, at the glass, is gloss: the spill round a turned-away phone is drawn by `PHONE.draw` on `c.gl`. For the "smooth edge of its light on a face" in a close-up, `edge` adds a faint, grain-free sheen on `c.gl`, clipped to the face.

| Param | Default | Meaning |
|---|---|---|
| `info` | — | An `info` from `draw` / `where`: supplies `x, y, tone, k, r` |
| `x`, `y` | from `info` | Centre of the light (world). Put it where the light lands: on the pillow in front of the screen, on the counter below it, on his face |
| `r` | `1.9 h` | Radius in px |
| `k` | 1 | Strength (× the screen's own `light.k`). **Daylight: 0.4–0.6.** Night: 1–1.3 |
| `tone` | from `info` | `'night'` warm peach `#FFC5A0` (thread, app), `'water'` cool `#C8EEF2` (the waterfall: lock, image, wallpaper), `'pink'`, `'skin'` (the grid), `'violet'` (the default wallpaper), or a hex |
| `sy`, `angle` | 1, 0 | Squash and rotate the pool: a surface seen at an angle (counter top, pillow) wants `sy` 0.35–0.7 |
| `clip` | — | `Path2D` to keep the light on one piece (his face, the pillow) |
| `mode` | `'screen'` | Composite operation |
| `layer` | `'g'` | `'gl'` draws the whole glow grain-free on the gloss (rarely right: it floats above the paper) |
| `em` | 0.22 | Amount added to the halation buffer |
| `edge`, `edgeClip` | 0 | 0..1: the grain-free sheen on `c.gl`, clipped to `edgeClip` (or `clip`) |

Draw it after the paper pieces it lights and before the characters you want it to skip, or clip it.

### `PHONE.light(info, head, o)` → a GG light

A light spec for `GG.head` / `GG.hand` (and the rig) so a sculpted face is lit by the screen: a point light with **no `poster`**, so the sculpture renderer keeps it smooth while the room's lights stay cut (B1's `{pos, col: '#FFC09A', k: 2, falloff: 1.4, wrap: 0.25}`). `head` is `{x, y, s}` (the head's origin and px size). `o`: `z` (how far in front of the face, head units, 0.9), `tone`, `k` (1.8), `falloff` (1.4), `wrap` (0.25). The result is a plain object: cache the head by it as usual.

---

## 3. Screens and states

Every screen is drawn flat at 360 × 780 points, at a resolution chosen from its size on the frame (0.5× to 2.5×), then warped onto the glass. A still state is **cached** (`c.cache`, keyed by the state); a moving one (typing, arriving, opening, waking, dimming, the app's line, the grid's scroll, a voice playing) is drawn **live** into a pooled canvas each frame. Screens animate on ones.

**Common state keys** (every screen):

| Key | Default | Meaning |
|---|---|---|
| `clock` | by sequence | A `PHONE.CLOCK` name or `{time, date}`. Q01 `night1` 23:02 · Q02 `morning` 07:12 · Q03 `office` 10:38 · Q04 `lunch` 12:47 · Q05 `bus` 18:21 · Q06 `night` 23:14 (B2) · Q07 `morning2` 07:12, the next day · Q08–Q10 `visit` 14:07 (B3) · Q11 `later` 14:12 |
| `wallpaper` | by sequence | `'abstract'` (a default gradient) in Q01–Q05; `'waterfall'` from Q06 on, after he sets it |
| `banner` | — | A heads-up notification sliding down over the screen: `'Call me tonight?'` or `{text, in: 0..1}`. On `lock` it is the lock screen's card instead |
| `live` | — | `true` forces a live draw (pass it when you animate a value the table doesn't know, e.g. a thread's `scroll`) |

Text on the glass must be a screenplay message (`PHONE.MSG`). Anything else in a bubble, banner or draft raises a `FILM.warn` ("text on the glass is not a screenplay message").

### `thread`: the chat with "♥"

A dark-mode chat. Header: back chevron, her avatar (the pink→violet gradient with a white heart, a small green dot: always there) and the contact's name, a single heart. Her bubbles are the pink→violet gradient; his are neutral grey. Timestamps are furniture. No call buttons.

| Key | Meaning |
|---|---|
| `msgs` | The conversation, oldest first: `['her', 'Good morning.']`, `{him: '…'}`, `['stamp', '07:12']`, `{her: {image: 'waterfall'}}`, `{her: {image: 'hidden'}}` (Q04: a blurred, unreadable placeholder, two flat skin tones), `{her: {voice: 9}}` (seconds), `{her: {redact: n}}` (a bubble of n soft bars: an unscripted message that must stay unreadable, e.g. Q03's) |
| `draft`, `typed` | Text being typed in the field and how many letters show |
| `keyboard` | 0..1: the keyboard slid up |
| `press` | true: the key of the last typed letter shows its balloon |
| `caret` | Force the caret on or off (default: on while typing, or with the keyboard up and an empty field) |
| `arrive` | 0..1 for the newest message: the stack rises as it comes in from below (0.2 s for hers, 0.26 s for his) |
| `scroll` | Points: scroll back through the thread (add `live: true` while it moves) |
| `progress`, `playing` | For a voice bubble (see `voice`) |
| `hideLast` | Don't draw the newest message (the image viewer uses it while the picture opens) |

Targets: `last` (the newest bubble), `input`, `send`, `keys` (the keyboard's middle, when up), `banner`, `play` (a voice bubble's button). Build states with `PHONE.exchange` (§4).

### `voice`: a voice message (Q05)

The thread with the morning exchange, a stamp at the bus time and her voice bubble (play/pause, 33 bars, elapsed time). `progress` 0..1 colours the played bars (the waveform crawls), `playing` shows pause, `dur` (9 s) the length shown. Silent, of course. Override `msgs` for another history. Targets: `play`, `last`.

### `lock`: the lock screen

The wallpaper (the waterfall cropped round the two of them, or the abstract default), the date and a large clock, the torch and camera buttons, the gesture bar. `banner` puts a frosted notification card from ♥ just under the clock, above their faces (Q09's "Call me tonight?" with "the waterfall. Him. Her. The long hair." visible behind it). Targets: `clock`, `swipe`, `banner`.

### `banner`: a notification

`{text, in, under}`. `under: 'lock'` (default) = the lock screen with the card (Q02's "♥ Good morning." on the abstract wallpaper: the phone lighting up); any other screen name = that screen (with `state`) and a heads-up card sliding down (`in` 0..1). Any screen also takes `banner` directly.

### `image`: the waterfall full screen

The picture fitted to the width on black, the viewer's header (back, ♥) and a share glyph. `open` 0..1 opens it from its bubble in a thread: pass that thread as `thread` (e.g. the Q06 exchange); the bubble's rectangle grows to full screen while the thread fades to black. Targets: `image`, `back`.

### `wallpaper_set`: "Set as wallpaper"

The image viewer with a sheet sliding up (`in` 0..1) holding one row, "Set as wallpaper"; `press` 0..1 highlights it. Target: `row`.

### `black`: black glass

Pure black glass (the sheen still on it). `reflection`: a canvas you pass (his face, the room, from the rig and the set, as it should be seen), drawn darkened at `amount` (0.3), covering the screen (`zoom`, `offset: [dx, dy]` to place it), and cooled a little. It throws no light. Target: `center`.

### `wake`: the bloom back

`p` 0..1: from black, the `under` screen (default `lock`, with its `banner`) brightens and settles from 106 % to 100 % size (out-cubic, the light rising with it). About 0.6–0.8 s. Q06's wakes and Q11's "the waterfall blooms back".

### `dim`: letting it go dark (Q10)

`p` 0..1: the `under` screen (default `lock`) dims to a third (0–0.45), holds (to 0.7), then goes to black (0.7–1). Its light follows. Q10 51–54: `p = FILM.seg(lt, 51, 54)`; then `black`.

### `grid`: the thread scrolled back (Q04), abstract by rule

Three columns of soft square thumbnails in flat skin tones, rendered at half resolution and blurred past any shape, together with the header and the input bar: nothing in it is ever sharp or readable. This is the restraint rule, not a style: never put an image into it. `scroll` (points; it loops forever: "it keeps coming") and `blur` (px at half resolution, 4.5). Always live. Light: `skin`.

### `app`: not a phone call

Her portrait fills the screen, face and shoulders: the photo-booth face as a photograph that is too smooth. She is square to the lens with her eyes on the camera and the same even smile, lit by one soft frontal light fixed to her face. Her long copper hair falls over her shoulders in strands, over a cream sweater, and she keeps the strip's tilt toward a shoulder that isn't there. It is painted by the same photographic method as the waterfall (§4, `PHONE.art`). A small heart sits at the top. Over a dark band at the foot, a thin white line breathes on a 2.6 s cycle, waiting: a 3-point core with a soft pink glow, swelling to about ±8 points, so it reads at true size and in the insert. No number, no buttons, nothing dials, nothing rings. `amp` scales the line. Always live. Light: warm peach. Targets: `line`, `face`.

In Q01 the screen nobody sees is this one: the "call" was the app all along, so its light on his face is the app's.

---

## 4. Timing helpers

### `PHONE.exchange(t, spec)` → a `thread` state

A whole exchange on a clock: arrivals, typing on twos with a human cadence, the keyboard up for the typing, sending, the instant reply.

```js
const Q02_THREAD = { clock: 'morning', history: 'routine', steps: [
  { stamp: '07:12', at: 0 },
  { at: 7.0, her: PHONE.MSG.goodMorning },                                    // A008: arrives at 7.0
  { him: PHONE.MSG.goodMorningLove, type: [10.2, 15.4], at: 15.8 },           // A009: typed 10.2–15.4, sent 15.8
  { at: 15.95, her: PHONE.MSG.iLoveYou },                                      // A010: before his thumb lifts
] };
PHONE.draw(c, { ..., screen: 'thread', state: PHONE.exchange(lt, Q02_THREAD) });
```

- `history`: `'routine'` (yesterday's identical three messages under "Wed 07:10" — the same words every day), `'morning'` (today's three under 07:12), `'both'`, or a `msgs` array.
- A step `{at, her | him: content}` adds the message at `at` (content as in `msgs`). `{stamp, at}` adds a timestamp. A step with `type: [a, b]` types his text over `[a, b]` (shown in the field until `at`); `keyboard: [k0, k1]` overrides when the keyboard is up (default `a − 0.45` to `at + 0.55`, sliding 0.3 s).
- Returns `{msgs, draft, typed, keyboard, arrive, press, clock}`.

### `PHONE.typed(t, t0, t1, text)` → letters shown, and `PHONE.typeTimes(t0, t1, text)` → when each letter lands (on twos, longer after spaces and punctuation; deterministic per text). Use them to time `type` cues to the letters.

### `PHONE.flicks(t, {at: [t0, t1, …], dist: 420, tau: 0.32})` → scroll offset

Repeated flicks that each travel `dist` points and decelerate: "He scrolls. It keeps coming. He scrolls."

### `PHONE.prepare(['waterfall', 'portrait', 'abstract', 'hidden'])`

Renders the generated images now (§7). Call it in the `setup()` of any sequence that shows the waterfall or the app, so the first frame doesn't pay for it.

### `PHONE.screen(name, state, k, t, seqId)` → canvas

A screen rendered flat (360 k × 780 k), for a use the body doesn't cover. The canvas comes from the engine's LRU cache or a pooled live canvas: draw it at once, don't keep it.

### `PHONE.art(name)` → canvas

The generated pictures themselves: `'waterfall'` (960 × 1280, 3:4), `'portrait'` (720 × 1560), `'abstract'`, `'hidden'`.

**The same two people everywhere.** The waterfall, the lock screen, the app portrait and the photo-booth strip all show the rig's Him and Her, younger. He has medium-brown skin (`#B47C58`), short dark curly hair grown out a little, a long gentle face and heavy lids. She has pale skin, copper hair (long in every picture) and green eyes. Her freckles survive only in the strip, a real photograph; the generator smooths them away.

### `PHONE.strip(o)` → canvas (and `GG.photoStrip`)

The photo-booth strip on the fridge, a real photograph in the grain world, painted by the same face painter in `'flash'` mode. It has four laughing moments, the last one the pose the waterfall copies: her head tipped against his (`GG.COUPLE_LAST`). The booth look is the cheap strobe: near-blown faces, a hard shadow on the curtain, one frame too bright and one too dark, a drifting cast, heavy noise, a crooked crop and a crease.

It takes the kit's arguments `{w, h, seed, scale}` and is memoised, so the same arguments return the same canvas. It costs about 1 s at 240 × 876. `film/phone.js` points `GG.photoStrip` at it, so the set (`film/sets/living.js`) and the sequences that call `GG.photoStrip` (Q06, Q09, Q10) all show the same strip. The kit's original is kept as `PHONE.stripKit`.

The two generated photographs are painted by `film/phone.js` itself (no longer `GG.waterfall` / `GG.head`), as a generator would "improve" the strip's last frame. Each face is painted upright and frontal in soft, blurred layers: form shadows, sockets, the nose's soft sides, highlights on the forehead, nose and cheekbones, rosy cheeks, a dewy sheen, fine brow hairs, and eyes with iris fibres and identical catchlights. It is mirror-symmetric, with skin a little too smooth, no freckles, and his stubble only as a tint. The face is then turned to the strip's tilt (`GG.COUPLE_GLOSS`, positions and rolls exactly the strip's). Long hair is drawn strand by strand in clumps in picture space, so it hangs, with a warm rim from the sun behind the fall. In the waterfall the gorge is mirrored, the water is pure white, the background is in portrait-mode blur, and there is no vignette. Both faces are lit identically, while the scene's sun is behind them.

---

## 5. Constants

| Name | What |
|---|---|
| `PHONE.MSG` | The messages, read from `film/script.js` (the quoted text of each action line), by name and by id: `goodMorning` / `A008` "Good morning.", `goodMorningLove` / `A009` "Good morning. I love you.", `iLoveYou` / `A010` "I love you.", `sendMeOne` / `A014` "Send me one.", `goodMorning2` / `A031`, `iLoveYou2` / `A032`, `callMeTonight` / `A050` "Call me tonight?" |
| `PHONE.CLOCK`, `PHONE.SEQ_CLOCK` | The clock and date presets and the default per sequence (§3) |
| `PHONE.TONE` | The light's colours |
| `PHONE.DIM` | The body: 147 × 71.5 × 7.8 mm, 10.2 mm corners, the glass 1.4 mm inside the frame, the screen inset 1.8 mm |
| `PHONE.SW`, `PHONE.SH` | 360, 780: screen points |
| `PHONE.HISTORY`, `PHONE.KEYS` | The preset histories; the keyboard's key rectangles (points, from the keyboard's top) |
| `PHONE.demos` | The demo list (`{name, draw(c, t)}`) |

---

## 6. Recipes, Q01–Q11

| Seq | Moment | Call |
|---|---|---|
| Q01 | On its long edge on the smooth pillow, back to us, screen to him; his hand over it | `{spin: -π/2, yaw: π − 0.2, pitch: −0.6, head: H, screen: 'app', env: '#8EA2CC', mask: hand}`; `PHONE.glow` night on the pillow (`sy` 0.7, clip to the pillow) and his face lit with `PHONE.light(info, head)`; the spill draws the line of light past the top edge |
| Q02 | 7.0 the phone against the mirror lights up | `screen: 'banner', state: {text: MSG.goodMorning, in: seg(lt, 7, 7.3)}` (abstract wallpaper by default), `buzz` for ~0.4 s |
| Q02 | 9.5–17.5 the thread, full frame, his thumb at the edge | `PHONE.exchange(lt, Q02_THREAD)` (§4); thumb as `mask`, placed with `where(P, c).targets.keys` / `send` |
| Q03 | 8.0 it buzzes; we see the glow and a sliver of pink | face up at a grazing angle (`pitch` ~1.2–1.35), `buzz`, `state: {msgs: HISTORY.morning.concat([['stamp','10:38'], ['her', {redact: 1}]])}` — the message isn't in the screenplay, so it stays unreadable |
| Q03 | 16.0 turned face down | `{pitch: 1.2, yaw: π}`: a black slab; `bright: 0` once down |
| Q04 | 6.0 types "Send me one.", sends 10.0, the chime 10.2 | `exchange` with `history: 'morning'`, `{him: MSG.sendMeOne, type: [6.5, 9.5], at: 10.0}`, `{at: 10.2, her: {image: 'hidden'}}`. Nothing of the reply is shown: cut, or keep the hidden placeholder |
| Q04 | 18–26 the screen's light on his face | `PHONE.light(info, head, {tone: 'skin'})`, glow on his collar/face, no screen visible |
| Q04 | 26–36 over his shoulder, out of focus | `screen: 'grid', state: {scroll: PHONE.flicks(lt, {at: [26.4, 28.1, 29.9, 31.6, 33.5]})}`, optionally `blur: 2` on the whole phone |
| Q05 | 7–15 the waveform crawls; 24 ends; 25 again | `screen: 'voice', state: {progress, playing}` with `progress = seg(lt, 7, 16)` then `seg(lt, 25, 34)`; thumb on `targets.play` |
| Q06 | 20.5 the chime: the waterfall arrives | `exchange` with `{at: 20.5, her: {image: 'waterfall'}}` |
| Q06 | 22–30 it opens | `screen: 'image', state: {open: seg(lt, 22.3, 23.3), thread: exchange(30, Q06_THREAD)}` |
| Q06 | 42–45 set as wallpaper; then locks and wakes | `wallpaper_set {in: seg(lt, 42, 42.4), press: lt > 43.4 && lt < 43.8 ? 1 : 0}`; `black` at 47.0 / 50.0; `wake {p: seg(lt, 45.5, 46.2)}`, 48.5, 51.5; `lock` between (clock `night`, waterfall) |
| Q07 | 6.5 his thumb: "Good morning.", sent 9.0; "I love you." 9.15 | `exchange` with `history: 'routine'`, `{him: MSG.goodMorning2, type: [6.7, 8.6], at: 9.0}`, `{at: 9.15, her: MSG.iLoveYou2}` |
| Q08 | He texts on the couch; the phone left lit on the cushion | at distance: `thread` with `history: 'both'`, `keyboard: 1` (empty field: his thumbs carry it); on the cushion face up, lit: `lock` or `thread`, glow by day `k` ~0.5 |
| Q09 | 22 INSERT: the lock screen, "Call me tonight?" | `screen: 'lock', state: {banner: {text: MSG.callMeTonight, in: seg(lt, 22.1, 22.4)}}` (clock `visit`, waterfall) |
| Q09 | 38.5 she turns the screen to him (B3) | `lock` (with or without the banner), her grip as `mask`, glow `water` `k` 0.5 on her chin and coat |
| Q10 | 44 her thumb on the glass | `lock` with her thumb as `mask` |
| Q10 | 51–54 the screen dims, she lets it go dark | `screen: 'dim', state: {p: seg(lt, 51, 54)}`, then `black` |
| Q11 | 0 black glass, his face in it | `screen: 'black', state: {reflection: canvasOfHisFaceAndTheRoom, amount: 0.3}` |
| Q11 | 6 he touches it: the waterfall blooms back; 10.5 taps the banner | `screen: 'wake', state: {p: seg(lt, 6.0, 6.8), banner: MSG.callMeTonight}` (never dismissed, so still there), then `lock` with the banner; tap target `targets.banner` |
| Q11 | 11–19 INSERT the app; 19–44 at his ear, then on the cushion by his face | `screen: 'app'`; the portrait's light back on his face: `PHONE.light(info, head)` + glow night (`k` ~0.7 by day, warmer as the daylight goes blue) |

---

## 7. Costs

Measured in `tools/set.js` / 24-frame medians on this machine (no GPU). An empty engine frame (grain, fibre, halation, vignette) already costs about **38 ms**; the numbers below are what the phone adds.

| What | Cost |
|---|---|
| **One-time art** (per process, kept for the whole run) | the waterfall ~1 s, the app portrait ~1.2 s, the strip ~1 s (`PHONE.strip`, memoised), the rest < 50 ms. Call `PHONE.prepare` in `setup()` |
| A phone at true size (h ≤ 420), upright, still screen | 1–3 ms |
| + spill (turned away or on its edge) | +2–5 ms (drawn at half resolution) |
| A full-frame insert (h ≈ 960), upright | 8–12 ms |
| The same rotated, or in perspective (`quad` with perspective, `persp`) | 12–25 ms (the screen warps through 20–60 cells) |
| A live screen (typing, arriving, app, grid, wake, dim, opening, voice) | included above; the screen's own redraw is 2–6 ms at insert size |
| First draw of a new still state | 5–15 ms, then cached |
| `PHONE.glow` | 3–8 ms (grows with `r`) |
| `blur` on the phone | 1–3 ms |
| Cache memory | each still screen state is 0.13 Mpx (true size) to 1.1 Mpx (insert) in the engine's LRU cache |

The demos run at 47–75 ms per frame (median), all under 100 ms.

---

## 8. Caveats

- **Order.** Glow (on `c.g`), then `PHONE.draw`, then anything paper that sits over the phone (the hand) on `c.g`. A mask is in world coordinates under the same camera as `c.gl`.
- **Pure white and black** are only in the gloss. The `under` copy puts the phone into the paper world beneath an occluder; only the occluder's anti-aliased edge can show it.
- **Perspective** quads are warped by affine cells with a two-pixel overlap: fine for any phone-sized perspective; a phone filling the frame at a grazing angle could show a faint seam. Keep such shots in 3D mode or a little smaller.
- **Resolution.** Screens render up to 2.5× (1950 px tall). The waterfall is 960 × 1280 and the portrait 720 × 1560: both hold up to about a 1300 px tall screen on the frame.
- **The faces** in the waterfall and the app are painted, not sculpted, so they never match the paper people's sculptures exactly; that is the point (the two kinds of image). They are stylised photographs: up close a sharp eye can still find them a little illustrated, but they no longer read as 3D avatars.
- **Q04** keeps its restraint by construction: `{image: 'hidden'}` and `grid` are abstract and blurred; never draw a real image into a bubble other than the waterfall.
- **Q03 and Q08** have no scripted message: use `redact` or keep the text unreadable by distance; the verbatim check warns on anything else.
- **The heart** is a vector shape (not a font glyph), so it renders the same everywhere and never turns into an emoji.
- **State** must not be kept between frames: `draw` is a pure function of `c`, `p` and time (the repeatability check renders every demo after visiting the others and gets the same pixels).
- **The light's strength** is per screen (the thread 0.7, the waterfall 1, the app 0.9, black 0); by day pass `k` 0.4–0.6 to `glow`.
