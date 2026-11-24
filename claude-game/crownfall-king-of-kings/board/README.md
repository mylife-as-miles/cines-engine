# Crownfall: King of Kings — blocking-storyboard engine

A three.js 0.160 board for the short film *Crownfall: King of Kings*: every location built in real metres on one
shared layout, articulated mannequin figures, the bible's eleven colour keys, and tools that render a storyboard
(stills + contact sheet) and an animatic (24 fps MP4 with matte, captions, subtitles, supers and a pulse track).
It runs in headless Chromium (Playwright + SwiftShader; no GPU). Shot design lives elsewhere: this folder only
provides the sets and the API a shot list drives.

The look follows the bible (design/bible, pp.2–18) and design/VILLENEUVE.md: one hard source, low fill, exponential
fog plus a ground haze, a sky gradient, falling dust, fine grain, and **no bloom, flare or glow**: lamps are small
bright shapes that clip cleanly; the brightest thing is always small.

```
npm i                       # three@0.160.0 (node_modules is ignored)
node proof.js               # the 11 colour keys beside the bible -> proof/keys_vs_bible.jpg, proof/extras.jpg
node render.js spec.json [more.json …] --out out/board          # stills + board.jpg
node animatic.js spec.json [more.json …] --out out/animatic.mp4 --workers 3   # the animatic
```
`examples/sample_spec.json` exercises every spec feature (black + pulse, supers, keyframed state, a walk, a push,
depth of field, common and native lines, an unsubtitled chant, the ward, the title card).

| File | What it is |
|---|---|
| `board.html` | loads `engine.js` (import map to `node_modules/three`) and the EB Garamond face (OFL, `fonts/`) |
| `engine.js` | renderer, Super 35 camera, fog/haze/rim shader patches, sky, key + fill, dust, state/keyframes, figures, army, crowds, post (DOF, warp), the window API |
| `figures.js` | the cast, mannequins, poses, IK, props (banner, mirror, lamps, spear), stretchers, the hero hand |
| `compose.js` | 2D frame: 2.39:1 matte, caption, subtitles, supers, fades, sound note, grain |
| `sets/looks.js` | the colour keys (one per bible key) |
| `sets/solforiz.js` | the shared layout `L` and the builders for the city (plain, causeway, wall, gate, gatehouse, forecourt, arch, stair, block, inner wall, ziggurat, Crown, arcades, lamps) |
| `sets/*.js` | one module per location: `foundry`, `city`, `forecourt`, `gatehouse`, `crown`, `fall`, `ruins`, `ship` (alias `ward`), `hull` |
| `render.js`, `animatic.js`, `proof.js`, `lib.js` | the tools (headless Chromium) |

---

## 1. The window API

| Call | Does |
|---|---|
| `await setScene(name, opts?)` | builds a set (`foundry city forecourt gatehouse crown fall ruins ship hull`) and applies its colour key. Cached: calling it again with the same name is free. |
| `setState(obj)` | the whole state of a shot (figures, props, effects, look). Replaces the previous state. `{preset: 'name', …}` starts from a set preset and merges your keys on top. |
| `setTime(t)` | evaluates everything that moves at shot time `t` seconds (keyframes, walks, dust, salvos, the block, the collapse, the ship…). |
| `renderShot(cam, type?)` | renders the 2.39:1 picture (1280×536) and returns a data URL (PNG by default). `drawShot(cam)` renders without encoding. |
| `await frame(spec, shot, t, mode)` | the whole composed frame for a spec shot at shot time `t`: sets scene/state/time, camera move, matte, caption, subtitles, supers. `mode` = `'animatic'` (1280×720) or `'still'` (board page). |
| `presets()`, `preset(name)` | the current set's presets (`{state, cam, t}`) — the proof frames; a good starting point for a shot. |
| `where(x)` | world position of a mark, figure or figure part (see §4) as `[x, y, z]`. |
| `window.E` | the engine object (scene, camera, materials, `E.R` resolved state) for debugging. |

### The camera dictionary `cam`
`{pos: [x,y,z], target: [x,y,z], f: mm, shift?: [right, up], roll?: deg, near?, far?, dof?: {focus, fstop, max}}`

- **f** is a focal length on a Super 35 filmback **24.89 mm wide**; the picture is 2.39:1, so the frame height is
  10.41 mm. 24–35 mm for places, 50 for faces and the table, 85–135 for looks across distance (bible p.12).
  Distance for a figure filling a fraction `k` of frame height: `d = height × f / (k × 10.41)`.
- **pos / target** may also be a mark or a figure part (`"liora.wristL"`, `"arch"`).
- **shift** `[+right, +up]` (fractions of the frame) moves the subject without tilting (a lens shift, via setViewOffset).
- **roll** degrees; positive rolls the camera left (the horizon tilts down to the right). Keep 0 (eye level, no dutch).
- **dof** `{focus: metres | mark | 'liora.wristL', fstop: 2}` — physical circle of confusion for this lens; use it
  only for the wrist (3.5, 10.6), the seal (4.6) and the hands (10.8), as the bible says.
- **hand: true** frames the hero hand with the canonical insert camera (§6). `{hand: true, view: 'back'|'palm', dist, offset: [x, y]}`.
- **near** defaults to 0.08 m when the target is under 40 m away, else 0.3 m: set it for anything closer in a wide.

### Spec files (render.js / animatic.js)
```json
{ "title": "SC 3 · THE HELD STONE", "scene": "forecourt", "subtitleNames": true,
  "shots": [ { "n": "3.4", "dur": 4.5, "scene": "forecourt", "sceneOptions": {},
               "state": { … }, "cam": { … },
               "move": { "to": { "pos": [], "target": [], "roll": 0 }, "start": 0, "end": 1, "ease": "smooth" },
               "camKeys": [ { "t": 0, "pos": [], "target": [] }, … ], "camEase": "smooth",
               "handheld": 0.03, "handSeed": 0, "timeOffset": 0, "boardTime": 2.0,
               "camText": "…", "lines": [ … ], "super": { … }, "black": false, "fade": { "in": 0.5, "out": 0.5 },
               "sound": "…", "pulse": [ … ], "note": "…", "grain": 0.03 } ] }
```
- `dur` seconds (or Oren-style `"time": "12–16.5 s"`). Frames = round(dur × 24). Shots are joined in order; several
  spec files join in the order given (`node animatic.js sc01.json sc02.json …`).
- `scene` per shot (or once at the top). `black: true` is a black frame (no scene needed): CUT TO BLACK, the title.
- `state` is passed to `setState` once per shot; every value in it may be animated (§2). No `cam` with a `state.preset`
  uses the preset's camera.
- Camera motion: `move` (Oren's: an eased dolly from `cam` to `move.to` between fractions `start..end` of the shot),
  or `camKeys` (any number of keys in shot seconds), plus `handheld` (metres of breathing drift; the bible allows it
  only for 7.1–7.2).
- `timeOffset` shifts the state clock (`setTime(t + timeOffset)`) so an effect can continue across a cut.
- `boardTime` is the moment render.js draws for the still (default: mid-shot; `--at start|mid|end|<s>` overrides).
- `lines`: `[{t0, t1, who, text, native?, spoken?, sub?, note?}]` in shot seconds (the shot list's
  `{t0, t1, speaker, text, subtitle, spoken}` works too: a `subtitle` makes it a native line shown in English; a `spoken`
  line with no `subtitle` is heard, not subtitled). Everything is drawn low in frame in
  bone EB Garamond with the speaker's name in small capitals above (`"subtitleNames": false` hides names). `native:
  true` lines (Kharzani, Old Aethel, High Korvenic, High Drakonic) are set in italic — give their **English** in `text`
  and the spoken line in `spoken` (shown on the still's footer only). `sub: false` lines are not drawn in the picture
  (use it for "Ihriq! Ihriq!"); they appear in the lower matte as a sound note. Copy the screenplay's words exactly.
- `super`: `"TEXT"` or `{text, t0, t1, size?, y?, fade?}` (or an array) — small capitals, widely spaced, bone; e.g. "YEARS EARLIER.",
  "SOLFORIZ. YEAR 56.", "CROWNFALL: KING OF KINGS" (on a `black` shot).
- `pulse`: sound cues `[{at, kind, beats, interval, gain, stumble}]` → a synthesised track in the animatic. `kind`:
  `beat` (soft four-beat pulse, default `beats: 4, interval: 0.62`), `stroke` (the foundry's mechanical stroke),
  `engine` (one deep engine stroke), `lock` (the great mechanical lock), `bell` (the ward's bell note).
  `stumble: [1, 1, 0.6, 0]` scales each beat (6.10: "Three beats. Two. None.").
- `sound` is a free note printed in the lower matte.

### Tools
- `node render.js spec… [--out dir] [--only 3.4,3.5] [--at mid|start|end|<s>] [--raw] [--cols 3]` → `shot_<n>.png`
  (header: title · shot · time, camera text; footer: lines with the spoken native text, note) and `board.jpg`.
- `node animatic.js spec… [--out file.mp4] [--workers 3] [--msaa 4|0] [--shadow basic|pcf] [--only n,n] [--from n]
  [--to n] [--cache dir] [--crf 20] [--no-audio]` → 1280×720, 24 fps H.264 + AAC. Each shot is rendered to a cached
  segment named by a hash of the shot, the spec header and the engine sources, so a re-run renders only what changed and
  an interrupted run resumes. `--workers` browsers take shots from a queue in film order.
- `node proof.js [--only id,…]` → `proof/frames/*.png`, `proof/keys_vs_bible.jpg`, `proof/extras.jpg`, `proof/timing.json`.

---

## 2. State: animation, looks, generic keys

**Animated values.** Any number or array in a state can be replaced by
`{"keys": [[t, v], [t, v], …], "ease": "linear|smooth|in|out|step"}` (shot seconds; values may be arrays) or by a
running clock `{"clock": v0, "rate": 1}` (= v0 + rate·t). Example: `"coupling": {"y": {"keys": [[0, 4.5], [3.2, 0.6]],
"ease": "out"}}`, `"collapse": {"clock": 2}` (the collapse was 2 s old at the cut).

| Key | Meaning |
|---|---|
| `look` | `'predawn'` etc. (§5) or `{base: 'name', fog: {density}, exposure, key: {…}, …}` overriding any field of the set's key |
| `figures` | `{id: figureSpec}` — §3. Figures not listed are not in the shot. |
| `crowd` | `[{kind, path: [[x,y,z],…], count, spacing, speed, start, t0, width, loop, lamps, lampShare, pose, endPose, hold, figure}]` — walkers along a 3D polyline (civilians down the stair with lamps, wounded men on the causeway). Positions: arc length `start + speed·(t − t0) − i·spacing`. |
| `army` | one or an array of `{from: [x,z], to: [x,z], rows, spacing, rowGap, facing (deg), jitter, poles (share with poles), bannersOpen 0..1, notAll (max share that ever opens, default 0.82), wind (deg), scale, y, seed, color}` — instanced soldiers; rows step to the left of `from→to`. Banners are bound and near-black until `bannersOpen` rises; they open "banner after banner", never all. |
| `stretchers` | `[{id, pos: [x,z]|[x,y,z], face, carried, walking, bearers, bearersStay, color}]` — two poles and canvas; with `bearers: true` two soldiers carry it (hands on the poles). A figure lies on it with `on: 'id'`. |
| `hand` | the hero hand for inserts — §6 |
| `dust` | `{mode: 'streak'|'fall'|'drift'|'rise'|'none', center: [x,y,z] (default: in front of the camera), size: [x,y,z], count, speed, streak, drift, px, color, opacity}` overriding the key's dust |
| `warp` | up to 4 `[{at: [x,y,z]|mark, r: metres, amp}]` — heat shimmer at the edge of a held thing (the block 3.3, the stalled shutter 6.2). Screen-space, cheap. |
| `shadow` | `{center: [x,y,z], radius}` — where the key light's shadow map is fitted (default: around the camera target) |
| `post` | `true` forces the float/post path even without DOF or warp |

---

## 3. Figures

`figures: {cael: {...}, liora: {...}, s1: {kind: 'soldier', ...}}` — the id is the kind for the cast; any other id
needs `kind`. Built facing +z; **their right is −x**. Heights: Cael 1.86 (broad, cloak to the ground, bandaged right
forearm), captain 1.82 (square, short cloak), soldier 1.78 (helmet), wounded 1.76 (dust grey, bandaged head and
arm), guard 1.80 (spear), gunner, bearer 1.74 (thin; pole 1.5 × his height = 2.61 m), liora 1.62 (umber coat, hood
back, carries the mirror), boy 1.12 (respirator a size too big), envoy 1.95 (pale robe, the one clean cloth),
navigator 1.76 (plated hood pushed back, eyes filmed like glass), ward 1.74 (indigo coat, pale mask, silver collar,
pale gloves), worker 1.78 (soot, cap), solgunner (Solforiz crew, plated hood), civilian 1.66, child 1.20.

| Key | Meaning |
|---|---|
| `pos` | `[x, z]` (y from the ground under it: forecourt, stairs, terraces, floors), `[x, y, z]`, or a mark/dynamic mark (`'pod'`) |
| `face` | degrees (0 = facing +z, 90 = +x), a point `[x,z]`/`[x,y,z]`, or a figure id/part (`'cael'`, `'boy.head'`) |
| `pose` | `stand walk run kneel crouch cower sit sitUp lie carry shelter armRaised point gripTable slump lookUp handOverWrist` (`wrist` = crouch) |
| `walk` | `{to: [x,z], from?, t0, speed}` — walks along a line (walk cycle from time), then holds `pose` |
| `speed`, `phase` | for walk/run cycles |
| `aimR` / `aimL` | point the straight arm at a world point / mark / part (the open hand at the block or the shutter) |
| `reachR` / `reachL` | two-bone IK: put the wrist at a point (`'liora.wristL'` for 3.5; a seal for 4.7; the table edge) — `poleR/poleL` world elbow direction |
| `palmR` / `palmL` | `'out'` (palm toward the aim, fingers up: the gesture) or a point the palm faces |
| `handR` / `handL` | open 1 … closed 0, or `'point'` |
| `shake` (+ `shakeSide`) | fingers tremble 0..1 (6.3, 10.8) |
| `blood` | 0..1 soaks the three bands of the binding, one by one (dark, not banner red) |
| `look` | turn the head toward a point/part; `head: [yawDeg, pitchDeg]` adds; `lean` deg forward; `turn` deg spine twist; `joints: {shoulderR: [x,y,z], …}` raw degrees (`pelvis spine neck shoulderL/R elbowL/R wristL/R hipL/R kneeL/R`) |
| `on` | a stretcher id: lie (`pose: 'lie'`) or sit up (`pose: 'sitUp'`) on it |
| `banner` (bearer) | `shoulder` (bound, on his shoulder, 3.8) · `upright` · `raised` (8.2) · `lowered` (the diagonal in key p.8) · `open` · `none`; `bannerOpen` 0..1 unbinds it (10.12); `bannerWind` deg |
| `mirror`, `flash` | Liora's lantern mirror in her right hand; `flash` 0..1 makes it the one point of white (10.2) |
| `lampOn` | civilians' hand lamps (crowd `lamps: true`) |
| `hideHand` | `'R'`, `'L'` or `true` |
| `visible`, `scale`, `h`, `color` | |

Parts for aims and cameras: `head eyes chest waist handR handL wristR wristL shoulderR shoulderL mirror feet mask bannerTop`.

---

## 4. The sets and where things stand

**Axes (all sets but foundry/hull):** metres, y up. **+z points OUT of the city** (the gate, the causeway, the plain,
the army's rear); **−z points IN** (the stair, the terraces, the Crown; at sunrise, the sun and the fleet). +x is
east. The forecourt and the causeway top are y = 0; the glass plain is y = −1.2.

| Thing | Where (x, y, z) |
|---|---|
| Outer wall | along z = 0 (6 m thick, ~11–16 m, broken into stretches); ruined 2–6 m |
| Broken gate | opening x −6..6 at z = 0; fallen leaves and rubble around it |
| Gate towers | W (−11.5, 0, 0) 27 m, E (11.5, 0, 0) 22 m, 10×10 m, broken tops (ruins: ×0.8, the stumps under the ship) |
| Causeway | x −7..7, from z = 0 to z = 3200 (top y 0), posts every 38 m (not in the ruins) |
| Abandoned cannon | on the plain: (22, 120), (−34, 260), (58, 470), (−12, 52), (25, 1466), (36, 2086) |
| White truce lamp | (24, 15.6, −10.5), on a mast on the gatehouse roof; a 8-px point at any distance |
| Gatehouse (interior) | x 16..32, z −18..−3, floor 0, ceiling 8.5; broken roof over the north side |
| The breach | north wall (z = −18), jagged, x 24.2..31.3, y 0..7.9 — looks out at the forecourt, the arch (bearing ≈ 36° east of north from the SW corner), the stair and the city |
| Door | west wall, z −10.7..−8.5 (`door` 0..1 swings it) |
| Table | centre (20.4, 0.92, −10.6), 3.4 × 1.25 m, long axis turned 24° (SW–NE) |
| Seals (judgments) | A round umber (19.71, 0.99, −11.02) · B square black (20.45, 0.99, −10.71) · C brass ring (21.17, 0.99, −10.37) |
| Stretcher marks | (29.0, −6.2), (26.2, −5.0) inside the door side |
| Forecourt | x −140..140, z −90..−3 |
| Aethelgard's battery | (−62, −15), (−47, −19), (−32, −23), aimed at the Crown; `battery: {at: [x,z], spacing: [dx,dz], face: [x,z]}` moves it (key 5 puts it on the plain) |
| Lower flight of the great stair | a solid stepped mass along the tier-0 face, z −90..−78: **foot (54, 0, −84)**, rising WEST to the landing (30, 8, −84); landing x 16..30 |
| The gallery ("the terrace above her") | slab x 44..57, underside y 6.6, front edge z −82.6, projecting from the tier-0 face |
| The block | (52.4, 4.6, −85.4), 3.2 × 1.6 × 2.4 m, over the stair foot |
| Liora under the block / Cael ten paces off | (52.5, −85.0) / (59.5, −79.5) (≈ 9 m) |
| The arch (signal station) | (70, 0, −76): round-topped, span 3.4, height 5.6, depth 1.3, **opening faces +z** (toward the gatehouse and the truce lamp); the lantern hangs in its crown at y ≈ 5.3 |
| Inner wall | on the tier-0 lip, z −92, y 8..14; its gate at x 24 (7 m), at the top of the lower flight (`innerGate` 0 shut .. 1 open) |
| Ziggurat tier k (0..7) | x ±(330 − 31k), front z = −90 − 45k, top y = 8 + 24k → tops 8, 32, 56, 80, 104, 128, 152, 176; fronts −90, −135, −180, −225, −270, −315, −360, −405 |
| Great stair flights | x −12..12; flight k climbs tier k's face from (0, top(k−1), front(k) + 26) to (0, top(k), front(k)) |
| High arcades (Solforiz battery) | tier-5 face z −314.2, openings y 110..121, 15 bays (not at the stair) |
| Pressure towers (tier 3) | (38, 80, −238), (70, 80, −243), (102, 80, −248), (134, 80, −253); 56–62 m; `midTowers: [deg…]` lean east |
| The Crown | works x ±70, z −474..−410, y 176..222 (prongs to ~254); front face z = −410 with the opening x ±38, y 187..204 |
| Crown towers | (±98, 176, −414), (±96, 176, −466); 74–82 m with cross-arms |
| Amber lamps | ~400 points along the terrace lips, houses and stair flights |
| Plain | y = −1.2, 30 km square |

Marks you can name in `pos`, `target`, `face`, `aim…` (per set; `where('name')` prints them): `gate truceLamp arch
underArch stairFoot stairTop block lioraUnderBlock caelTenPaces innerGate crownShutter crown breach battery
causewayNear causewayFar` (+ gatehouse: `table sealA sealB sealC door breachCentre stretcherA stretcherB
boyUnderArch`; crown: `shutterSlit arcadeGun arcadeCrew`; foundry: `coupling ring seam worker furnace rowStart
rowEnd`; ship: `hover emitter` and the moving marks `pod podOut glass emitter`).

### foundry — Sc. 1 (key p.5 top)
A black hall; the hero coupling at the origin, **7.12 m tall (4 × the 1.78 m worker)**, radius 2.35, banded copper,
the silver ring a third of the way down (centre y ≈ 5.35 when hung at the default height), the violet seam under it.
Two chains converge upward. Two rows of identical couplings recede from (−18.4, −25) to (1.8, −112) (and 14 m/22 m
further back-left). The furnace slot in the floor glows along the rows (the only light from below); pools of furnace
light on the floor; a violet pool under the coupling. State: `coupling: {y (bottom height, default 0.6; animate it to
make it descend), turn (deg), ring 0 open..1 closed, seam 0..1 (fraction of the seam lit), violet}`, `furnace` (0..1).
Worker mark (−3.3, 0, 2.2). For the hands (1.3) use the hero hand with `style: 'worker'` (soot) and `'ward'` (pale
glove) at the ring.

### city — Sc. 2 and every exterior of the besieged city (key p.5 bottom, p.7 top)
Everything in the table above. State: `lamps: {level, breathe 0..1 (four-beat breathing, bible p.14), beat (s, default
0.62), outAt (s: all out together, 6.10), share}`, `truce: 'lit'|'out'|'gone'`, `truceBurstAt` (s: one-frame white
flash then dark — 5.3), `crown: {shutter, fire, through, towers, towerFall}` (see crown), `midTowers`, `arch`,
`block`, `innerGate`, `door`, `battery`, `gunElev`, `salvos: [{side: 'aethelgard'|'arcade', t, spread, flight, to:
'crown'|'lines'|'truce'|[x,y,z], guns, gunIndex, arc, tracers, seed}]` (muzzle flash clips to white for one frame
then amber, recoil, pale tracer arcs, amber impacts), `flashPower`.

### forecourt — Sc. 3 (key p.6 top) and the arch in 7
The city, seen close, with the held-stone key (flat grey, streaks of falling dust). State as the city, plus
`block: {y, x, z, rot: [deg], fall: {t0, y0, y1}, visible}` — `fall` drops it under gravity from `y0` at `t0` and stops
it at `y1` (tear loose and stop: y0 ≈ 7.0 → y1 4.6; release: y0 4.6 → y1 0.8, where she lay), and `arch: {broken 0..1
(right pier), stones 0..1 (crown stones loose), drop (m), lantern: 'lit'|'smashed'|'gone'}`.

### gatehouse — Sc. 4–6 (key p.6 bottom; key p.7 bottom with `look: 'burning'`)
The interior with the whole city through the breach. Lit only from the breach: inside the room the sky fill is cut to
a fifth (two stops under); the key comes in through the breach and its shadow lands on the table. Stretchers come in
through the west door; the navigator lies on one (`on`) and can sit bolt upright (`pose: 'sitUp'`, `look: 'crown'`).

### crown — the summit close set (6.1–6.2, 6.9) and the gun crew in the high arcades
The city plus the shutter mechanism (drive drums, chains to each plate, counterweights, brass pipework) and a gun
terrace at the arcades west of the stair (crew mark (−90, 104.6, −308)). `crown.shutter` = plates down 0..6 (each
plate drops from the housing to its band, top band first; **5.85 = the last plate stalled with a thin bright slit**,
6 = shut), `crown.fire` 0..1, `crown.through` 0..1 (fire shows through cracks in the plates), `crown.towers` [deg×4]
(the summit towers lean), `crown.towerFall` 0..1 (tower 0 falls across the great retaining wall, 6.9). Use `warp` at
`shutterSlit` for the air warping at its edge.

### fall — Sc. 7 (key p.8 top)
The city with every terrace above tier 1, the Crown and the towers as loose chunks on one clock:
`collapse` = seconds since it began. 0–4: the four pressure towers topple east like dominoes (east first), the summit
towers go; 1–10: terraces settle from the top down, houses lean together and go into dust; 6–14: the whole upper
city comes down; 14–26: the dust thins and the skyline is gone. Dust rises faster than the chunks fall and is lit from
above; no fireball. `dustThin` scales its opacity. A plaza is kept clear around the great stair on tiers 2–3 so the
stair reads in profile. The lantern lies smashed (`arch.lantern`).

### ruins — Sc. 8 and the ground of 9–10 (key p.8 bottom)
The same layout after the fall: towers broken to stumps, the outer wall 2–6 m, the forecourt in rubble (a clear
approach to the arch), the arch standing (`arch.broken`, `arch.stones`), a flat jagged ruin line where the city stood
(z −100..−740, mostly under 15 m), steam rising from broken pipes (`steam` 0..1). Sunrise key.

### ship — Sc. 9–10 (keys p.9 and p.10)
The ruins plus:
- **The first ship** (origin = keel bottom centre, long axis along x): body 420 × 70 × 36 m (hexagonal section,
  plated grid, re-plated patches), three lobed envelopes above (to ~122 m over the keel), keel 200 × 30 × 24 m,
  Korvenian silver points and hanging rings along both sides, rigging lines 16–56 m long, 13 weapon housings on the
  south chamfer, engines at the ends, the **observation pod** (round glass, silver rim) on the keel's south face at
  local (−36, 9, 9.5) tilted 26° down, and the **ward emitter** at the keel's bottom centre.
  `ship: {pos: [x,y,z] | approach 0..1, yaw, roll, visible}` — `approach` runs from (10, 380, −5600) far in the sunrise
  (0) to the hover (1): **keel bottom at (70, 22, −76), right over the arch**. `housings` 0..1 opens the amber points.
- **The fleet**: `fleet: {count, approach 0..1}` — the first `count` of ~70 slots in reveal order: two ships close
  behind the first (2), then the formation rows receding to z ≈ −7000 and higher (60+ = the sky filled).
- **The ward**: `ward: {drop 0..1 (the violet cone lowers from the emitter to the ground), radius (m at the ground),
  light, lamp}` — an additive cone, a violet pool and a violet spot light on the arch and the survivors.
- **Bars of sunrise through the rigging**: `bars: {count, x0, spacing, z, width, strength, sweep (m/s), top}` —
  soft shafts along the sun from the hull height to the ground; `bar: 'liora'|[x,y,z]` adds the gold spot that
  crosses her; `barPower`.
- `maskFlash` 0..1: white light inside the pod (the four flashes crossing the mask). The ward officer stands in the
  pod with `pos: 'pod', face: 'podOut'`.

### hull — 9.3 (inside the hull)
The scarred coupling at the origin, same size and hang as the foundry so **the foundry's cameras work unchanged**
(same angle and framing as 1.2/1.3); iron ribs arch over it, gold light through slots in the plating.
`coupling: {turn (deg; {clock: 0, rate: 9} turns it under load), y, ring, seam}`.

---

## 5. Colour keys (`look`)

| Key | For | Bible strip |
|---|---|---|
| `foundry` | Sc. 1 | #0C0907 #3B2415 #B66A35 #B9BEC3 #7C4DF0 |
| `predawn` | Sc. 2, city exteriors before 5.3 | #1C2731 #374651 #8D9797 #E08A3A #F2F4F1 |
| `heldStone` | Sc. 3 | #474E56 #787D7F #A9ABA4 #1B1C1E #D7D8D2 |
| `gatehouse` | Sc. 4 | #0A0A0C #424445 #A3A9A9 #8A8C88 #D8CFB8 |
| `breakCrown` | Sc. 5 | #161D26 #2E3A44 #5D696E #FF8A2E #FFF3D0 |
| `burning` | Sc. 6 (the only orange scene) | #050303 #5B2C14 #C96A25 #E69A45 #FFF6DD |
| `fall` | Sc. 7 (ochre enters) | #3B4146 #6F6D66 #3A3227 #8F7D5F #D9C69C |
| `sunrise` | Sc. 8 | #4D5761 #8B8A84 #ECD29A #6C6557 #1B1917 |
| `ship` | Sc. 9 | #0D0E10 #2B2D31 #B9BEC3 #F3C77A #CDB88C |
| `ward` | Sc. 10 (10.1–10.10) | #0A0A0D #7D7466 #FFD48A #7C4DF0 #FFFFFF |
| `banners` | Sc. 10 (10.11–10.16) | #0B0B0D #5A564E #ECD29A #8E1B1B #FFC070 |
| `hull` | 9.3 | #0D0E10 #2B2D31 #B9BEC3 #F3C77A #B66A35 |

Each key sets: `sky` (zenith/mid/horizon gradient, optional sun disc and a tight sun-side lift), `fog` (exponential,
colour = the horizon; `fog.sun` lifts the fog toward the sun), `haze` (a ground layer: amount per metre, base, falloff),
`key` (the one hard source: colour, intensity, direction toward the light, shadow softness), `fill` (hemisphere sky/ground,
low), `rim` (the back-light edge on figures, the ship, the arch), `exposure`, `grain`, `dust`. Override per shot:
`look: {base: 'sunrise', fog: {density: 0.0004}, exposure: 1.2}`. Default key per set: foundry→foundry, city→predawn,
forecourt→heldStone, gatehouse→gatehouse, crown→burning, fall→fall, ruins→sunrise, ship→ward, hull→hull.

Colour rationing is up to the shots, but the engine keeps to it: truce white only on the truce lamp and the mirror;
copper only on couplings; silver on the ring, the ship's points and the officer's collar; violet only as light (the
seam, the ward, the emitter); blood red only on opened banners (bound banners are #2c1513, near black).

---

## 6. The hero hand (the four matching inserts, bible p.13)

`hand: {attach: 'cael'|'ward'|…, side: 'R'|'L', style: 'cael'|'ward'|'liora'|'worker', open 0..1, shake, blood, view,
dist, offset}` or, unattached, `{pos: [x,y,z], face: [x,y,z] (where the palm faces), up: [0,1,0], …}`. A detailed hand
(three-segment fingers, thumb, forearm; Cael's with the three bands of the binding, the officer's pale glove with a
silver cuff) replaces the figure's own hand at its wrist. With `cam: {hand: true, f: 50}` the camera sits **1.5 m from
the palm on the 50 mm**, behind the hand (`view: 'back'`, looking at what the hand holds) or facing it (`'palm'`), so
every insert is the same size and angle: 3.4 (Cael, open, back), 6.3 (Cael, open, shaking, bloody, back), 10.3 (the
ward officer's left hand, palm view, so the thumb falls on the same side), 10.10 (Cael, closed, back). The presets
`hand34` (forecourt), `hand63` (gatehouse), `hand103`, `hand1010` (ship) are these four.

---

## 7. Speed (this container: 4 cores, no GPU, SwiftShader)

Warm picture times at 1280×536, 4× MSAA, 3×3 PCF shadows, one browser (`proof/timing.json`, `node proof.js`): the
foundry and the hull 0.2 s; the city wides 0.17–0.25 s; the forecourt, gatehouse and ship sets 0.35–0.65 s; DOF
inserts up to ~1 s. Mean over the 20 proof frames: 0.45 s. Building a set takes under 0.1 s.

The animatic is cheaper per frame because it uses one-tap shadows by default (`--shadow basic`, ~40% faster than PCF
on the big sets) and runs several browsers: `examples/sample_spec.json` (672 frames, 9 shots over 5 sets, 132 of them
black) rendered, encoded and joined in **3.0 min with 3 workers ≈ 3 frames/s** (single shots ran at 1.0–4.3 f/s per
worker). At that rate **the full ~11,400-frame animatic takes about 60–65 min**; `--msaa 0` saves roughly a third on
light sets (more shimmer on rigging, chains and poles). SwiftShader already spreads one render over the cores, so more
than 3–4 workers does not help. Re-runs only render shots whose spec or engine changed (segment cache).

The shot list's `design/shots_skeleton.json` renders as is (`node render.js ../design/shots_skeleton.json`): `id`,
`set_hint` (`ward` is an alias of `ship`) and its `{speaker, text, subtitle, spoken}` lines are understood, and shots
without a `cam` get the set's first preset camera, captioned "[placeholder camera]" — 76 stills in about 40 s.

## 8. Notes for shot designers

- **Eye level.** The camera leaves the ground only at 9.3 (inside the hull) and 10.3 (the officer's glass). Cael is
  seen from below only through Liora's eyes (3.5). No dutch angles.
- **Scale comes from a figure.** Put someone in every scale shot: the worker under the coupling (1.2), Liora under the
  block (3.3), the gate stumps under the ship (9.1).
- **The ziggurat is close and steep from inside the walls.** From the gatehouse the Crown is ~430 m away and ~27°
  up; from the forecourt the inner wall and tier faces fill the lower frame. For the city as a silhouette (keys p.5,
  p.7) shoot from the causeway/plain (the gate key is from z ≈ 2150 on a 50 mm). For the open hand (6.3) the presets
  look up 13–17° on a 21 mm through the breach.
- **Lamps are points** with a fixed pixel size (3–8 px) at any distance — they stay readable in the wides and never bloom.
- **Light sources must be visible** (bible p.11). The battery flash light, the ward spot, the bar spot and the pod's
  flash are the only extra lights; leave them at 0 when their source is out of the story.
- **Interiors:** the gatehouse cuts the sky fill inside its walls; a figure stepping into the breach is lit by the
  outside. Use the breach as the only source.
- **Dust:** before the fall it only falls (3.3, 4.10: `dust: {mode: 'fall'|'streak', center: …}`); after the fall it
  hangs (`'drift'`). Turn it off with `dust: {mode: 'none'}`.
- **Banners:** red never appears before 10.12 unless `bannersOpen`/`bannerOpen` > 0.
- **Ground:** figures given `[x, z]` stand on the forecourt, the stair, the terraces and interior floors (raycast).
  On the ship or in the air give `[x, y, z]` or a moving mark (`'pod'`).
- **What the engine does not do:** faces (mannequins have a nose to show where they look, no features); cloth
  simulation (cloaks are rigid frustums: when a figure kneels the hem goes into the ground); real volumetrics (the
  ward and the bars are additive shapes); destruction physics (the fall is choreographed chunks). The air "warps" as
  a screen-space shimmer only.
- Never change the screenplay's words in `lines`; native lines give the English in `text` and the spoken line in
  `spoken`. "Ihriq! Ihriq!" is `sub: false`.
