# ONE TOO MANY — "Negative Space" style-frame kit

Root: `films/one-too-many`
Screenplay (read the scenes you are drawing, quote dialogue VERBATIM): `design/screenplay.txt`
Full art-direction pitch (palette, characters, sequences): `design/negative_space.json` · judges' fixes: `design/judges.json`

## How to make a frame
1. Write `src/<ID>_<name>.html` (copy the skeleton below). Load the kit with relative script tags. Never edit files in `kit/` (other people use them at the same time). If you need a helper, write it inside your own HTML.
2. Render: `cd <root> && node tools/shoot.js src/<file>.html out/<file>.png` (1920x1080). It prints `ok` or JS errors.
3. LOOK at the PNG with the Read tool. Critique it like a film art director, fix, re-render. Iterate until it is genuinely striking (at least 3 rounds).

```html
<!doctype html><meta charset="utf-8"><title>F00</title>
<script src="../kit/otm.js"></script><script src="../kit/figures.js"></script><script src="../kit/dialogue.js"></script>
<script>
(async()=>{
  await OTM.loadFonts('../fonts/fonts.css');
  const ctx = OTM.stage(), {C, W, H} = OTM;
  const f = OTM.frame(ctx, {seed: 3});      // f.world = the paper world (draw everything here)
  const g = f.world;
  g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
  // ... light, set, shadows, characters, accents, type ...
  f.finish({letterbox: 2.0});               // knockouts -> halation -> vignette, fibre, grain -> letterbox mattes
  OTM.slate(ctx, 'ONE TOO MANY  ·  STYLE FRAME 05', 'SEVEN HANDS', 2.0);   // small labels in the matte
  window.FRAME_READY = true;
})();
</script>
```

## API (globals on `OTM`)
- `C` palette (see kit/otm.js top). Key: ink #0D0A09, soot #1E1714, tungsten/tungstenMid/tungstenLow (posterised lamp bands), tungstenTired, cardPaper, cardBlue, wine, blood (always darker than wine), rainSlate, rainSilver, underDoor, hood/hoodMid/hoodLow (kitchen's sick second light), gasBlue, backdoorNight, ember/emberHot/emberDeep (ONLY the Extra), fireCore/fireMid/fireOuter, blastWhite, flashWhite, phoneWhite, strobeRed/strobeBlue, yardNight, grass, ash. Speaker type colours: tScott, tDeena, tAngelo, tKay, tKayLip, tChristof, tMarina, tDispatcher.
- Shapes: `OTM.S()` builder with `.M .L .C .Q .Z .ellipse .circle .rect .capsule(x1,y1,r1,x2,y2,r2) .poly(pts) .add(shape)`, transforms `.translate .scale .rotate .flipX .transform([a,b,c,d,e,f])`, `.bbox()`, `.path(rough=0.8, seed)` -> Path2D with hand-cut paper edge. Fill everything with `g.fill(shape.path())`.
- Light: `OTM.lightPool(g, x, y, [{r, color} outer->inner], {sy (vertical squash for floors/tables), rot, rough, dither})` posterised flat bands with a printed dither seam. `OTM.cone(g, [4 pts], color, alpha)` hard trapezoid light cone (screen). `OTM.dust(g, poly, n, color, seed)`.
- Silhouettes: `OTM.silhouette(g, shapeOrPath2D, {fill, light:{x,y} or {dx,dy}, rimColor, rimW, rimSoft})` ink fill + crisp rim crescent on the lit side ONLY. Put the light to one side so the rim is a crescent, not an outline. `OTM.castShadow(g, shape, [affine], alpha)`.
- Figures (`OTM.fig`), 1 unit = 1 head height, all ink, overlapping parts merge:
  - `profile(id, {x, y, scale, facing:1|-1, anchor:'feet'|'hip', lean, neck, head (+ = chin down), armN:{a,b,w,hand,handOpts}, armF:{...}, legN:{a,b}, legF:{a,b}, swing, hem})`. Angles in radians: arm `a` = shoulder angle from straight down (+ = forward), `b` = elbow bend (+ = forearm swings further forward/up); leg `a` hip angle (+ forward), `b` knee bend. Sitting on a chair: `anchor:'hip'`, legN {a:1.45,b:1.45}. Returns `{shape, joints:{H, head, neck, wristN, wristF, elbowN, ankleN, shoulder}, details}`.
  - `top(id, {x, y, scale, dir (radians, the way they face), hands:[[x,y],[x,y]] world targets (their left, right) or false for one, handPose:'flat'|'open'|'clasp'|'point', swing})` top-down at a table. Returns `{shape, head, hands:[{wrist, tip}], details}`.
  - `bust(id, {x, y (head centre), scale, tilt})` front view head+shoulders+torso (the phone photo, the yard).
  - `hand(pose, {spread, curl})` local hand shape, wrist at 0,0, fingers along +x, length 1: poses `flat open splay point clasp side hold relaxed`. Use `.transform([...])` to place. Great for hand close-ups.
  - `drawDetails(g, fig, {rimColor, cigColor, hoopColor, beadColor, ringColor})` bright signature accents: Angelo's cigarette sliver, Deena's hoop arc, Kay's rain beads, Marina's ring glints.
  - Ids: scott, deena, angelo, kay, christof, marina.
- Dialogue: `OTM.say(g, who, text, x, y, opts)` — each speaker's kinetic type voice frozen at one frame (see header of kit/dialogue.js for all opts). Who: scott (caret, stress, cut '--', ash), deena (pointTo, soft), angelo (spread, blankSlot, final, big), kay (p<1 breath wipe, lipLast), christof (big, dead, bulbs, p), marina (stress, ringWord, p), dispatcher (timer, align), voice (frame:f REQUIRED, face:'angelo'|'scott'|'deena', size, depth) — the VOICE is cut THROUGH the paper and glows ember.
- Knockouts (the Extra's only way to touch the world): `f.knockout(path2D, depth)`, `f.knockoutText(str, x, y, fontOpts)`, or draw white into `f.holes`. Holes reveal the ember lightbox, char their edges and glow.
- Emissive: draw bright things (lamp cores, fire, glints, phone screens) ALSO into `f.emissive` (same coordinates, it is pre-scaled to quarter res) to get halation bloom.
- FX: `OTM.flame(g, x, y, w, h, seed, t)` flat three-tone flame tongue (base at y). `OTM.embers(g, x, y, w, h, n, seed)`. `OTM.rain(g, x, y, w, h, n, seed, color, alpha)`.
- Type utils: `OTM.text(g, str, x, y, {family, weight, style, size, color, tracking, align, alpha})`, `OTM.layout`, `OTM.knockBehind(g, x, y, w, h, alpha)`.
- Determinism: never use Math.random or Date. Use `OTM.rng(seed)()`, `OTM.vnoise`, `OTM.fbm`.

## The doctrine (non-negotiable)
- Cut paper over a lightbox. Six friends are hard INK silhouettes. One motivated light per shot, drawn as 2-3 posterised flat bands, never a smooth gradient. Rim light only on the side facing that light.
- At most four colours per shot (plus ink). Large areas of ink: party ~40-45% ink, card table ~55%, hand circle ~75%, hallway ~85%, standoff ~92%.
- THE EXTRA IS NEVER DRAWN. No figure, no outline, no eyes, no shadow. It exists only as subtraction: a gap in a count, a person-sized empty slot at Scott's RIGHT, or a cut through the paper to the ember lightbox (its VOICE letters, the line across Deena's throat, the handprint in the blood, the final hand). Ember #FF9440 appears nowhere else in the film.
- Counting is the visual grammar: compose every shot around a countable set (glasses, chairs, piles, knobs, slats, windows). The letterbox is the master counter: 1.78 (arrivals) -> 1.85 (after Kay is missed) -> 2.00 (after Christof's crash) -> 2.20 (after Deena) -> 2.39 (after Marina) -> 2.76 (lighter standoff) -> blown away in the explosion -> 1.78 in the yard.
- Dialogue is the acting. Every line is verbatim from the screenplay, sits in negative space on INK (never over a bright light band unless on a knock-behind), body size 44-56 px at 1080p, max three lines on screen.
- Violence is shape and implication: Deena's throat = a short ember arc across the front of the throat turning to blood; Christof in the oven = a folded-flat paper-doll silhouette, led by the projected shadow. Never gore detail.
- Premium finish: hand-cut edges, grain, fibre, halation, vignette are applied by `f.finish`. Compose like a film still: strong focal point, deliberate negative space, foreground/midground/background depth (foreground elements darkest and largest).
- Avoid: rim as full outline, flat empty compositions, centred-everything, cheap clip-art shapes, gradients that look digital, any un-motivated colour.
