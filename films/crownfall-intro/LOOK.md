# The Seven That Remained: look, rules and scene briefs

The opening film of *Crownfall: Aethelgard* (a Project EON game by Osita Miles). Order: the Project EON card, the
narrated chronicle in seven scenes, `YEAR 33 • ASH & AETHER INTERREGNUM`, then CROWNFALL / AETHELGARD and the
tagline. 1920×1080, 24 fps, drawn entirely in Canvas 2D. The story and narration are the creator's (narration/script.json).

## The idea: the chronicle becomes the world

The film begins as a book and ends as a world. Each scene is a step further from the page:

| Scene | What it is made of | Light and colour |
| --- | --- | --- |
| S01–S02 | Vellum, iron-gall ink, gold leaf, vermilion rubrics. Flat pages, ink spreading across them, a slow camera. | Warm, flat, candle vignette |
| S03 | The map of Aethelgard; then a woven tapestry (linen, wool thread). | Warm; red borders, heraldic colour |
| S04 | The page gains depth: ink-wash layers in parallax, fog, falling snow, camera shake. Still painted, now moving like a diorama. | Cold blue-grey ink; the creature's gold eye |
| S05 | Illuminated miniatures under real light: arched frames, figures painted in mineral colours. | Candle-gold for the houses, cold blue for the commons |
| S06 | A board in perspective (projected 3D), figures standing on it, braziers, fog. Painterly but spatial. | Dark arena, gold and red heraldry |
| S07 | The pages burn away. The present: dark, smoke, fire, rain, rim-lit silhouettes, depth. Then a small banner hall. | Night, fire, a warm hall |

Reference sheets: in the scratchpad `intro-ref/` (kcd0.png, kcd1.png: Kingdom Come's painted chronicle; tlou1.png:
The Last of Us Part I's ink spread; tlous2.png: the Season 2 titles; yt.png: a studio card). The creator's map of
Aethelgard (proposals, not canon) is in the uploads (`b30c0d58-image.png` ink map, `5ab231f9-image.png` coloured layout,
`632c5643-image.png` diorama). Draw from them; never copy them into the repository.

## Rules

- **Deterministic.** `draw(ctx, t, sc)` must give the same picture for the same `t`: no `Math.random`, `Date`,
  `performance.now` or frame counters in drawing. Use `K.rng(seed)`, `K.hash`, `K.noise`, `K.fbm`.
- **Keyed to the narration.** Never hard-code seconds. Use `K.cue('L19').start` / `.end` and `sc.start` / `sc.end`, so a
  new voice re-times the film. Lines are in `film/timeline.js` (built by `tools/build_timeline.js`).
- **Always moving.** The camera drifts, pushes or pans, eased, never parked. Things in the world breathe: smoke, cloth,
  snow, flames, dust in light.
- **Fast enough.** Aim under ~120 ms a frame (frame.js prints it). Build anything static once with `K.cached(key, make)`
  (pages, textures, sprites, the board); avoid full-frame `filter: blur()` every frame; `K.mask` at no more than 960×540.
  Pages bigger than ~3000×2000 cost too much memory.
- **The houses have no names on screen.** The names in the story concept are working placeholders. Show a house by
  what it holds and by its arms (`K.HOUSES`: armies/tower, grain/sheaf, roads/scales, iron/hammer, laws/tree,
  frontier/thorn, beasts/wyvern). Ealdholt, a lesser banner, is `K.LESSER` (a sprig on russet). The player's banner is
  `K.BLANK`.
- **Text on screen** is rare: place names on maps (Cinzel), nothing else. Subtitles are drawn by intro.js.
- **Care.** Violence is told, not lingered on: a shadow, a closing jaw, a spray of vermilion ink, a fallen banner.
  Discrimination by ancestry is shown through the registries: seals, sashes and tokens, a name struck from a tree,
  a gate closed. Never by skin colour or caricature. No real-world flags or religious symbols.
- **Joins.** A scene opens out of the one before: `join: 'dissolve'` (default, over `joinDur` seconds), `'black'`, or
  `'cut'` when the scene draws its own way in. The outgoing scene is drawn for up to `joinDur` seconds after its `end`,
  so clamp your animation there. S07 burns the last picture of S06 itself (`join: 'cut'`).

## How a scene is written

`film/scenes/sN.js` registers the scene. Work only in your own file (no edits to kit.js, intro.js, the html, the
timeline or the tools); if you need a helper, write it in your file and mention it in your notes.

```js
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const SCENES = window.SCENES = window.SCENES || {};
  SCENES[4] = {
    join: 'dissolve', joinDur: 1.4,
    draw(ctx, t, sc) {
      const L18 = K.cue('L18'), u = K.span(t, sc.start, sc.end);
      // ... draw the whole frame (opaque), finish with your own grade / vignette if you want them
    },
  };
})();
```

Look at your work while you build it:

```sh
node tools/frame.js 120.5 out/s4/a.png --scene 4          # one frame, prints the draw time
node tools/strip.js 104.8 144 2 out/s4/strip.png 5 --scene 4 # a contact sheet across the scene
node tools/frame.js 120.5 out/s4/a.png                      # the whole film at that time (joins, subtitles off)
node tools/frame.js 120.5 out/s4/a.png --subs               # with subtitles
```

`--scene N` draws only your scene at any time. Put your outputs in `out/sN/`.

## The kit (film/kit.js, `window.KIT`, here `K`)

- Time: `clamp lerp smooth ease easeOut easeIn span(t,a,b) win(t,a,b,fadeIn,fadeOut)`; random: `rng(seed)`, `hash`,
  `noise(x,y,s)`, `fbm(x,y,oct,s)`.
- Canvases: `canvas(w,h)`, `cached(key, make)`, `release(prefix)`, `layer(name[,w,h])` (a cleared full-frame scratch).
- Colour: `K.P` (ink, inkBrown, sepia, inkBlue, parch, parchDark, gold, goldHi, goldDeep, vermilion, crimson,
  ultramarine, azure, violet, verdigris, green, ochre, umber, bone, ash, snow, ember[]), `rgba(hex, a)`, `shade(hex, k)`.
- Textures: `parchment(w,h,seed,{base,dark,edge,foxing,stains,folds})`, `linen(w,h,seed)`, `paperTooth(ctx,a)` (fine
  grain over the frame), `tile(ctx,img,x,y,w,h)`.
- Ink: `bez(points)` (cubic chain to polyline), `resample`, `wobble(pts,amp,freq,seed)`, `nib(ctx,pts,{w,angle,min,taper,p,jit})`
  (broad-nib stroke; `p` draws it on), `line(ctx,pts,p)`, `poly`, `ink(ctx, fn, {color,alpha,bleed})` (multiply, so the
  vellum shows through), `wash(ctx, pathFn, color, alpha, {bbox})` (watercolour with pooled edges), `gold(ctx, pathFn,
  x0,y0,x1,y1,{sheen})` (burnished leaf).
- Reveals: `field(gw,gh,seeds,seed,{warp,scale,grain})` (an arrival-time field), `mask(F,p,soft)` (alpha where the front
  has passed), `rim(F,p,width)` (the band at the front: char, glow, pooled ink), `cutBy(layer, mask)`.
- People: `figure(ctx,x,y,h,{kind,head,hold,walk,arm,bend,face,style,fill,mode,shield,banner,t})` (kinds robe, gown,
  tunic, armour, cloak, child, rags; heads bare, hair, hood, crown, helm, kettle, cap, coif, veil, mitre; holds spear,
  staff, banner, sword, raised, scroll, torch, bundle, basket; `style:'painted'` with robe/hose/skin/hairCol colours and
  ink outline), `crowd(ctx,x0,x1,y,h,n,seed,o)`, `horse(ctx,x,y,h,{walk,face,house,rider:{...}})`.
  They are good stand-ins; draw your own where a figure is the subject of a shot.
- Heraldry: `HOUSES`, `LESSER`, `BLANK`, `shieldPath`, `device(ctx,name,x,y,s)`, `shield(ctx,x,y,s,house)`,
  `banner(ctx,x,y,w,h,house,t,{wind})`, `bannerCloth`.
- Maps: `mountain`, `tree`, `compass`, `coast`, `hachure`.
- Air: `smoke(ctx,t,{n,x,y,w,h,color,alpha,rise,size,seed})`, `embers(ctx,t,{n,heat,...})`,
  `specks(ctx,t,{kind:'snow'|'ash'|'dust',n,wind,alpha})`, `rain(ctx,t,{n,angle,alpha})`.
- Camera and finish: `cam(ctx,cx,cy,zoom,rot)`, `camPath(t,[{t,x,y,z}])`, `shake(t,amp,seed)`, `vignette`, `grade(ctx,
  color, mode, alpha)`, `glow(ctx,x,y,r,rgb,a)`, `bloom(ctx,strength)`. intro.js adds film grain over everything.
- Timeline: `K.cue(id)` → `{id,text,start,end}`, `K.scene(n)`, `K.TL`.

## Scene briefs

Narration ids in brackets; every beat is keyed to its line. The scene's own picture runs from `sc.start` (a few
seconds before its first line) to `sc.end` (a few seconds after the last).

### S01 The King Who Vanished [L01–L05] and S02 The Fall of the Crown [L06–L11]
The creator's map in ink, spreading across vellum; the Hollow King, crowned, above an assembly of rulers; his painted
face fades and the parchment tears there; he vanishes; seven flames light at the seven halls. The Sovereign Crown
shatters, its shards fall across the land; Korvenia beneath a violet eclipse, Solforiz's smoking mineral deserts,
Kwind's towers in steam and rain, then into Aethelgard's mountains. (Built with the shared map.)

### S03 The Seven Great Houses [L12–L17]
The map of Aethelgard unfolds into seven territories, each house shown by what it controls (soldiers on mountain
passes, crowded granaries, merchants counting coin, furnaces, clerks sealing records, patrols escorting travellers
through forests, a rookery of the First-Born). A tapestry: the Seven joining hands; as the camera nears, the hands
become knives pointed at one another.

### S04 The Beasts That Devoured Kings [L18–L24]
- Before L18: a convoy crosses a frozen mountain road (parallax ink-wash: sky, far peaks, cliffs, the road ledge;
  wagons, riders, spearmen, a banner; snow on the wind).
- L18: a gigantic shadow sweeps over the convoy; it halts; heads turn up.
- L19: a wyvern-like First-Born (two legs, great wings, long neck and tail; colossal against the men) descends out of
  the cloud and tears into the convoy: men scatter, a mounted knight disappears into its jaws (tasteful), the camera
  shakes; a settlement burns beneath passing wings.
- L20: the purple banner of the beasts' house (K.HOUSES[6]) unfurls over a proclamation.
- L21: crowds in the capital rejoice.
- L22: a ceremonial procession: a First-Born, bridled and chained, walks through the capital, riders of the house on
  its back, handlers with poles and chains, crowds on both sides.
- L23: closer: the bit, the chains, iron apparatus on its neck; hooded riders.
- L24: the price of protection (a tithe taken under its shadow).
- After L24 (the scene's tail, about four seconds): the creature turns its head toward us. Its great eye (gold iris,
  slit pupil, a wet highlight) meets the camera, then flicks up toward its rider, the pupil widening: for an instant
  it looks afraid of its own rider. This is the scene's most cinematic shot; give it time.

### S05 A Kingdom Divided [L25–L30]
- Before L25: a flourishing capital (gold and ink skyline, banners).
- L25: the Seven's banners hang above a council chamber.
- L26 (long): a run of illuminated miniatures in arched frames, each lit: a noble family dining in a bright hall
  against families queueing for bread in the cold; a marriage refused at a registry desk; a child's name struck from a
  family tree; a man testifying before a court whose judges turn away.
- L27: refugees turned away as fortified gates close; labourers carrying for the houses; a school procession of
  children, one stopped by a guard's hand because the child carries no registry seal; the procession goes on.
- L28: the council chamber; the seven banners stir.
- L29: accusing hands, the shadow of a gallows, vermilion spreading; the banners are pulled down violently, one by one.
- L30: the empty chamber, torn banners on the floor, a single candle.

### S06 The King's Gambit [L31–L42]
- Before L31: a battlefield crowded with fallen soldiers, broken spears, banners in the mud, a red sky.
- L31: ink lines run across the field; it becomes an immense ceremonial board (the Wæl-Tafel, the arena of the Gambit
  beside Blodsetl on the creator's map); the dead sink into its squares.
- L32: sixteen living representatives take their places against sixteen (king, queen, bishops, knights, rooks, pawns,
  as people: crowned, robed and mitred, horsed or horse-crested, tower-shielded, spearmen and commoners).
- L33: everything stills; the law is coming.
- L34: knights, bishops and rooks take on the arms of the Seven (their shields and tabards in house colours, gold glints).
- L35: a queen is brought across from one great house to another, her own arms unlike the side she joins (a marriage,
  a debt: a ring, a coin).
- L36: the other side: a lesser house, Ealdholt among them (K.LESSER), fields only pawns: plain, unarmed commoners;
  its back rank stands empty.
- L37: figures bearing the Seven's arms step into those empty squares, and each brings a price (a coin dropped, a chain
  that binds to a pawn).
- L38: play: a knight moves; at the board's edge the stakes appear (land, a road, a child, a crown).
- L39: wide: the arena, the board where armies were.
- L40: a bishop falls.
- L41: the defeated stand in shadow; a pawn's fists close.
- L42: a king remains, surrounded by the surviving formation; red runs into the board's seams.

### S07 Your Legacy Begins [L43–L50]
- Before L43: the chronicle burns: the last picture of S06 catches at its edges (ember rim, char, smoke) and burns
  away to reveal the present behind it. `join: 'cut'`; draw S06's final frame once into a cached canvas with
  `SCENES[6].draw(c, K.scene(6).end - 0.05, K.scene(6))`.
- L43: the Seven muster: armies with torches and banners on a hillside in rain.
- L44: First-Born circle mountain heights in a storm; soldiers drag a suspected traitor from a house by torchlight.
- L45: a road barred; a royal messenger rides with a sealed challenge (a red wax seal, close); in an archive, a page of
  history scraped away under candlelight.
- L46: the camera comes to a small banner hall at night (rain outside, a hearth inside).
- L47: the hall: a handful of people by the fire, silhouettes in warm light.
- L48: on the table lies a blank heraldic standard (K.BLANK): cloth in folds, no device, candle and hearth light.
- L49–L50: the camera settles on the blank banner; the light rises on it; then the picture fades to near black by
  `sc.end` (embers may remain) for the YEAR 33 card.
