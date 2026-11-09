# The Name They Buried: look, rules and scene briefs

The Story mode prologue of *Crownfall: Aethelgard* (a Project EON game by Osita Miles). 1920×1080, 24 fps, about
5 min 37 s, drawn entirely in Canvas 2D with the kit (`film/kit.js`, `window.KIT`, called `K`). Voices: George narrates;
Harry is Cael; Lily is the voice in the dark (`narration/script.json`, takes in `narration/final/`). The story is the
creator's ("The Name They Buried"). The creator asked for it to feel cinematic and epic, on the level of the openings of
Elden Ring and Clair Obscur: Expedition 33, and for Cael to die like Saint Lawrence on the gridiron, mocking his killers.

## The idea: a painted legend that wakes up

The opening film (`../crownfall-intro`) was a chronicle that became a world. The prologue starts in that world. Every
shot is a **painted tableau**: deep layers of ink-wash and gouache in parallax, rim light, haze, a slow camera. Think of
the Elden Ring opening's golden, mythic tableaux and Expedition 33's intimate light. Faces are rarely seen; people are
silhouettes and shapes against fire, sky and mist. That is the house style, and it keeps violence told, not shown.

| Scene | Lines | Palette and light |
| --- | --- | --- |
| S0 Cold open and title | C00 | Black, one ember. Drawn by `prologue.js`; do not touch. |
| S1 The Broken Seal | L01–L10 | Night capital, cold blue-black; council candles gold; then the First-Born's fire, orange on black; dawn grey for the rewritten history |
| S2 The Unsworn | L11–L17 | Burning streets (orange, smoke); the gate; the cold road north (snow, blue); Ealdholt grey-green at dawn; the register page by a candle |
| S3 A Son of Ealdholt | L18–L21 | Northern fells: wet greens, peat brown, rain and low cloud; a warm smithy at dusk |
| S4 The Ford | L22–L25 | Bright overcast meadow by a river; banners; the living board laid on the grass |
| S5 The Muster | L26–L32 | A vast stone hall in the capital: shafts of light, the Seven's banners, gold and stone; the board under candlelight; the gallery in shadow |
| S6 The Road Home | L33–L38 | Autumn: amber market light, then a grey forest road in rain; dusk; mud |
| S7 The Fire | C01–C03, L39–L41 | Night forest; the fire is the only light: orange, red, black; at the end embers rising into a dark sky |
| S8 The Unreturned | V01, C04, V02 | Black, then a pale, colourless otherworld: ash-grey plain, white mist, a cold low sun |

## Characters and motifs (keep these consistent across scenes)

- **Cael**: lean, dark hair to the jaw, no beard. A russet wool cloak (Ealdholt's colour, `#6e5236`), a plain spear,
  leather and quilted cloth, no plate. After the Muster: a small **silver eight-pointed star** pinned at the cloak's
  throat. In silhouette, the spear and the cloak make him readable.
- **Oswyn of Stanhyrst**: older, grey-bearded, a heavy dark-red robe with the tower device. **Elswyth**: his wife,
  only glimpsed. **The infant**: a small bundle in plain grey wool.
- **Sive**: a Fenfolk nursemaid in a grey hooded wool cloak. Her standing is shown by an **unsworn cord**: a plain
  knotted grey cord at the wrist that sworn people do not wear. Never mark the Fenfolk, or anyone, by skin colour or
  features.
- **Edda**: old, silver hair, rough hands, a dark green-brown shawl. **Runa**: a young healer's apprentice with braids
  and a satchel, also with an unsworn cord.
- **The killers**: hooded, faces covered by plain dark cloth masks, no colours or heraldry, dark leather. Never shown
  in detail; shapes and torchlight.
- **The hooded man** in the Muster gallery: one still shape in shadow; a thin gold chain of office is the only glint.
- **Arms.** The Seven appear by their devices (`K.HOUSES`): **Stanhyrst** = the tower (`armies`), **Sorn** = the
  wyvern (`beasts`), and the grain, roads, iron, laws and frontier houses. **Ealdholt** = `K.LESSER` (a sprig on
  russet). **Hildmere** (the rival lesser house) = draw your own: a silver wavy bar on deep blue-grey (`#36485a`).
  House names may be spoken by the narrator, but no house names are written on screen.
- **The register**: a long ledger page in iron-gall ink; a line reading `Cael` and beside it `parentage: unknown`. It
  appears in S2 (Edda's register) and again in S5 (the Muster clerk) and S6 (the torn Muster page). Use `K.parchment` +
  EB Garamond or a hand-drawn script. This is the only writing allowed on screen besides chess notation.
- **The oak-leaf clasp**: a small bronze-silver clasp shaped like an oak leaf, a present for Edda (S6), last seen in the
  mud or in his hand (S7).
- **Chess**: the board is real chess on an 8×8 board; the pieces are living people standing on squares (see the intro's
  S06 board for the projected-3D board). Promotion in S5: the pawn on the eighth rank becomes a **Knight**, which gives
  check and attacks the Queen at once (a royal fork); then mate.
- **The First-Born**: colossal winged beasts. Only shapes: a wing over the moon, an eye, a shadow across rooftops (see
  the intro's S04 creature for the language).

## Rules

- **Deterministic.** `draw(ctx, t, sc)` must give the same picture for the same `t`: no `Math.random`, `Date`,
  `performance.now` or frame counters in drawing. Use `K.rng(seed)`, `K.hash`, `K.noise`, `K.fbm`.
- **Keyed to the voices.** Never hard-code seconds. Use `K.cue('L19').start` / `.end` and `sc.start` / `sc.end` (lines
  are in `film/timeline.js`, built by `tools/build_timeline.js`; every line has `speaker`).
- **Cinematic.** Every shot has a camera move (push, pull, pan, crane, a slow rack between layers), eased, never parked.
  Use **cuts** inside a scene where a film would cut: change the shot on a line boundary, with a 6–10 frame dissolve or a
  hard cut on an impact. Vary the scale: wide establishing shots, mid shots, close inserts (a hand, a seal, a page, an
  eye). Light moves too: flicker, shafts, lightning, firelight. The world breathes: smoke, cloth, rain, snow, embers,
  dust in light, mist.
- **Fast enough.** Aim under ~150 ms a frame (`tools/frame.js` prints it). Build anything static once with
  `K.cached(key, make)`; avoid full-frame `filter: blur()` every frame (blur a quarter-size layer and scale up, as the
  intro's S02 does); `K.mask` at no more than 960×540; pages bigger than ~3000×2000 cost too much memory.
- **Care.** Violence is told, not lingered on: a shadow on a wall, a falling body as a silhouette, an arrow streak, the
  fire. In S7 the burning is shown through fire, silhouette, posture and the killers' reaction: never burnt flesh or
  wounds. Discrimination is shown through institutions: cords, registers, closed gates, a clerk's quill.
- **No real-world symbols**: no real flags, crosses or religious marks (Saint Lawrence is an inspiration, not a
  depiction).
- **Text on screen**: only the register lines and chess. Titles and subtitles are drawn by `prologue.js`.
- **Joins.** A scene opens out of the one before: `join: 'dissolve'` (default, over `joinDur` seconds), `'black'`, or
  `'cut'` when the scene draws its own way in. The outgoing scene is drawn for up to `joinDur` seconds after its `end`,
  so clamp your animation there. Scene 8 is overlapped at its end by the Chapter One card (from `K.TL.chapter[0]`).

## How a scene is written

`film/scenes/sN.js` registers the scene. Work only in your own file(s) (no edits to kit.js, prologue.js, the html, the
timeline or the tools); if you need a helper, write it in your file. The intro's scenes are good references for the
kit: `../crownfall-intro/film/scenes/s4.js` (snow, the First-Born, parallax ink-wash diorama, camera shake),
`s6.js` (the board in projected 3D with figures standing on it, braziers, fog), `s7.js` (burning pages, rain,
rim-lit silhouettes, fire, a hall), `s1.js` (candlelit desk, a blur rack between two pictures).

```js
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const SCENES = window.SCENES = window.SCENES || {};
  SCENES[4] = {
    join: 'dissolve', joinDur: 1.0,
    draw(ctx, t, sc) {
      const L22 = K.cue('L22'), u = K.span(t, sc.start, sc.end);
      // ... draw the whole frame (opaque), then your own grade / vignette / bloom
    },
  };
})();
```

Look at your work while you build it (from `films/crownfall-prologue`):

```sh
node tools/frame.js 152.0 out/s3a.png --scene 3          # one frame of one scene (prints draw time)
node tools/strip.js 132 164 2 out/s3.png 4 --scene 3      # a contact sheet: from, to, step, out, columns
node tools/frame.js 152.0 out/s3s.png --subs              # the whole film at that time, with subtitles
```

Read the PNGs you make to check them; review a contact sheet of the whole scene before you finish. Keep your outputs in
`out/` (git-ignored) and delete big ones you no longer need: the disk is small.

## Scene briefs

Times below are from the current takes; always key to the cues.

### S1 The Broken Seal (L01–L10, 0:14–1:24)

- L01–L02: Out of black, a crane down through night cloud onto the capital: towers, walls, a volcanic height with a
  red glow, great shapes circling it far off. Then inside the council chamber: seven tall seats in a ring around a
  dark stone throne (the Blood-Throne: black stone veined with red), each seat backed by its house's banner. Candles.
- L03: Oswyn at a tall window, his back to us, the city below. A slow push. (Elswyth with the bundle, a soft shape by
  the hearth.)
- L04–L05: Insert: the reform document on the table; six wax seals pressed one after another (each in its house's
  colour, stamped with its device); the seventh place (Sorn's wyvern) stays empty. The candle gutters.
- L06: Night exterior: the northern rookery tower; its bells swing; birds (or small wyverns) burst from it.
- L07: The First-Born: a colossal wing blots out the moon; fire falls on rooftops; the city's people look up (a crowd in
  silhouette, faces turned up, lit orange).
- L08: Inside, the council chamber: a shadow play on the wall: the captain's shadow behind Oswyn's, a knife, Oswyn
  falling across the table; the document and its seals slide to the floor and red ink (blood, as vermilion ink)
  spreads across the parchment. No gore.
- L09: Dawn, grey: a scribe's hand at a ledger; a quill strikes names through (Oswyn, a wife, an infant); a new line is
  written. Smoke over the city through the window.
- L10: Hold on the struck-through names, then a match cut to a small grey bundle in someone's arms in the dark: the
  infant, alive.

### S2 The Unsworn (L11–L17, 1:24–2:12)

- L11: Sive, hooded, running through a servants' passage by torchlight, the bundle held close; the unsworn cord at her
  wrist (insert).
- L12: The burning streets: a long tracking shot, Sive small against walls of fire and smoke, crowds fleeing, embers.
- L13: The lower gate: a guard in a helm lifts the blanket (we see only the bundle and his hand). He looks up: down the
  stairs behind him come soldiers with swords (silhouettes, blades catching fire). He swings the gate open.
- L14: Beat. From outside, through the bars, the guard's silhouette as the soldiers reach him; he falls (silhouette)
  as the gate closes. Hold.
- L15: The road north: a montage of four nights (forest, snow, a ridge, a frozen stream), Sive smaller each time; then
  dawn over the fells and a poor hold: an old palisade, a modest longhall, a ford below.
- L16: Inside the longhall by the hearth: Edda (old, silver hair) looking down at the bundle in her arms; Sive, standing.
- L17: The register: a candle, the ledger page; a quill writes `Cael`; then beside it `parentage: unknown`. Push in on
  the word *unknown* as the ink dries.

### S3 A Son of Ealdholt (L18–L21, 2:12–2:44)

- L18: Twenty-one winters in a few shots: the ford under seasons (snow, thaw, summer, rain); a boy then a young man
  mending a spear at a bench; standing in the rain at the gate of a great house, waiting. (A small on-screen dateline is
  allowed here: `YEAR 33` in Cinzel, lower left, fading.)
- L19: Training: Cael with a spear in the practice yard at dusk, a sparring partner; his hands bound in cloth; he reads
  the strike before it comes (a slowed moment, rain drops hanging).
- L20: The smithy at dusk: Cael and Runa sitting outside, the forge glow behind them; she is mending a strap; far off on
  a mountain, the lights of a great house.
- L21: Close on Cael looking at those lights. He does not believe her. Not yet.

### S4 The Ford (L22–L25, 2:44–3:13)

- L22: Hildmere's riders at Ealdholt's gate with a sealed challenge; then the meadow by the ford where a giant board has
  been laid out (pale and dark squares of turf and stone), arbiters, banners: Ealdholt's russet sprig vs Hildmere's
  blue-grey wavy bar. The living pieces take their places.
- L23: Cael as a Pawn among pawns; he steps back; a file opens (show it from high above: the board as a chess diagram
  with living pieces).
- L24: Hildmere's champion (a tall armoured Rook or Knight) charges down the open file; Cael's side closes the door
  behind him: the trap springs (a quick, clear chess move: the champion is captured / the king is cornered).
- L25: Ealdholt's banner raised over the ford; the people cheer; the wind takes the banner; push out to the valley and
  the road south.

### S5 The Muster (L26–L32, 3:13–3:57)

- L26: The great Muster hall in the capital: vast stone, shafts of light, the Seven's banners hanging high, crowds of
  candidates in house colours.
- L27: The pieces: nobles in fine armour take Knight, Bishop, Rook and Queen places (with their house colours); the
  front rank of pawns is plain cloth, lesser banners, Cael among them.
- L28: The clerk's desk: a quill, the register (`Cael`, `ward of Ealdholt`, `parentage: unknown`); the clerk's eyes
  over his spectacles; reads it twice.
- L29: The final trial on the great board under candlelight: from above, Cael's pawn advances to the eighth rank;
  the gallery leans in. Four translucent ghost pieces rise around him: Queen, Rook, Bishop, Knight; the Queen glows
  brightest.
- L30: He chooses the Knight: the ghost Knight solidifies; two gold lines leap from it to the enemy King and Queen (the
  fork); then the enemy king falls (mate). A hush, then the hall rises.
- L31: The knighting: Cael kneels; a sword touches his shoulder; the silver star is pinned at his cloak; light on the
  star.
- L32: Pull up and back into the high gallery: a hooded man in shadow, the glint of a gold chain; he turns away.

### S6 The Road Home (L33–L38, 3:57–4:33)

- L33: Cael leaving the capital at dawn on horseback, the north road ahead.
- L34: A market stall: his hand turns over a small oak-leaf clasp; he smiles (we see the smile only in shape and light).
- L35: The north road in autumn rain, trees closing in; an overturned cart across the road; no driver, no horse. A
  beat of silence. Then arrows (streaks out of the dark trees); his escort falls; his horse goes down.
- L36: Men come out of the trees: hooded, masked, no colours, torches. They encircle him.
- L37: Close: a gloved hand tears the first page from the Muster record (his name) and holds it to a torch; then,
  wider: they build a fire in a clearing; an iron grate is set over it on stones.
- L38: Close on Cael, bound, on his knees in the mud, rain on his face, looking up at them. He does not beg. Cut to
  black or straight into S7.

### S7 The Fire (C01–C03, L39–L41, 4:33–5:11)

This is the heart of the film. Composition is everything: the gridiron and the fire as the centre of the frame, the
ring of masked killers as silhouettes around it, the forest black beyond. Cael lies on the iron above the flames,
bound, but his head is raised and turned towards them.

- C01 (Cael): low angle across the fire to the ring of masked men; he speaks to them; firelight flickers across their
  masks.
- C02 (Cael, laughing: "Turn me over, cowards. This side is done."): close on his silhouette against the flames; he
  laughs; the killers step back, uneasy; one turns his face away.
- C03 (Cael: "Burn the name. Burn the boy. I will come back for both."): the fire roars up; on "I will come back for
  both" he looks straight at the leader; the leader's torch lowers.
- L39: Wide: the fire alone in the dark forest; the shapes of the men retreating; the flames die down to embers.
- L40: The oak-leaf clasp in the mud by the ashes, rain hissing on it; or the torn page's last corner curling in the
  embers.
- L41: Embers rise from the dead fire up through the black canopy into the night sky, becoming stars; far above, a
  First-Born's shape crosses the moon. Fade to black (S8 opens in black).

### S8 The Unreturned (V01, C04, V02, 5:11–5:26, then the Chapter One card)

- Opens in black. A bell (in the mix), a heartbeat. A hand on wet stone, fingers moving (close, pale grey light).
- V01: an eye opening (stylised, in silhouette and light) or Cael rising onto his elbows on black wet stone.
- C04: he looks at his hands; then the reveal: a vast colourless plain under a cold low sun in mist (the Stillmarch),
  and far away a long line of figures walking slowly towards a distant light.
- V02: the camera rises and draws back until Cael is a speck at the edge of that endless land. The Chapter One card
  fades in over it from `K.TL.chapter[0]`; keep drawing a calm, slowly drifting picture until `sc.end + 2`.
