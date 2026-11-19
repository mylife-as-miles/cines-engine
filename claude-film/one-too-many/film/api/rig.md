# API: rig.js, _rig_demo.js, otm.js, figures.js, dialogue.js, set__rig_demo.png

RIG is a global loaded by film/load.js after the kit. Units: 1 = one head height; `scale` = px per unit. Deterministic throughout. The full reference is in the header of film/rig.js. Summary:

FIGURES
RIG.figure(id, spec) -> F. id is one of scott | deena | angelo | kay | christof | marina.
- Placement: x, y, scale, facing (1 | -1). y is the FLOOR line for every pose; the lowest contact (sole, knee, hip, back or head) lands on it.
  - Furniture: seat:[x,y] is the seat top under the hips; floor:y also IKs the feet onto the floor.
  - anchor:'hip' means y is the hip and no grounding is done.
- pose: a name, or an object of OTM.fig.profile params.
  - Standing: 'stand' | 'idle'.
  - Seated: 'sit' (chair, profile), 'sit34' (three-quarter), 'perch'.
  - Floor: 'grass' (knees up, propped on the far arm with the palm planted and foreshortened, as F02), 'kneel', 'kneelUp', 'kneelSit', 'crouch', 'slump'.
  - Lying: 'lie' (on the back; headTo:'left'|'right'), 'lieFace', 'lieCurl'.
  - Pose objects may give limbs toU:[x,y] or fn(skeleton) as unit-space IK targets, and ground:1.
- gesture (arms only): handsUp, shrug, armsFolded, flourish, expansive, handToChin, wipe, hug.
- t (sequence seconds): breath, a 4 px rise at 0.25 Hz with a per-character phase, plus that character's idle motion. Quantised on twos, Kay on ones.
  - idle:false keeps breath only; idleAmt scales the idle; breath:false or a number in px; raw:true skips quantising.
- mood:'drained' (Angelo after the kitchen): slumped, limp arms, slower and deeper breath, no flourish, and his curves change.
- look:[x,y], lookAmt.
- hold:{N: hold, F: hold}: what the near and far hands hold (see HOLDS).
- Any profile param overrides the pose; armN/armF/legN/legF are merged rather than replaced. Notable ones:
  - clothes:'none' (Angelo without the jacket), hair, cig:false.
  - pony:{grip:[x,y]}: Deena's ponytail yanked to a world point by a fist that is not there.
  - rot, squash, swing, hem.
- F is the kit profile result plus: shape (body, hands and ink props), front, props, parts.head, at (the chest), and joints (head, neck, neckTop, shoulder, chest, hip, elbowN/F, wristN/F, kneeN/F, ankleN/F).
- F.holds.N / F.holds.F give world points: tip (fingertip, top card, bottle mouth, blade tip, phone), screen, spark, and hand (the hand Shape, e.g. for a knockout under it).

RIG.draw(g, F, o) draws ink, then the per-part rim (head and body measured from their own centres), then props, then the front ink, then details.
- o.light {x,y} or {dx,dy}; o.color (default tungsten); o.w (rim px, default scale*0.04 clamped to 2..6); o.soft; o.alpha.
- o.falloff: true for automatic, or {r0, r1, steps}.
- o.spread (default 1.45 rad) and o.headSpread (default 1.2): the rim stays inside a wedge facing the light.
- o.clip (Path2D or fn); o.fill (e.g. '#070505' in dark scenes); o.em (emissive ctx: glints, screens, sparks, flames).
- o.details {cigColor, hoopColor, beadColor, ringColor, cowlick:false}; o.shadow {m, alpha}; o.props:false; o.faceLight:false.
- Works under c.camera (zoom and rotation).
- Also draws RIG.top and RIG.bust results. Top-down heads are layered over the shoulders as in F05.

RIG.path(F) / RIG.bbox(F): the figure's rough-cut Path2D exactly as drawn (cached on F), for clipping, knockouts, hiding holes and shadows.
RIG.skeleton(id, spec) -> {pose, sk}: resolved pose and skeleton without building shapes, for planning look-ats, shoulders and head points.

HOLDS (spec.hold.N / spec.hold.F)
A string is shorthand for {kind}. Every hold also takes at:[x,y] (world) and tremble (px, needs t).
- phone: at the ear, as F02: slab on the cheek, palm on its back, four fingertips over the rear edge, thumb up the front. {glow, lit, color}. On F (far ear) only the hand shows.
- phoneLook: held up in front, screen to the face. The head looks at it, the thumb taps (tap 0..1), and the face is lit automatically by RIG.faceLight.
- lighter: fist, lighter standing out of it, thumb on the wheel, as F11. strike 0..1 rolls the thumb; spark shows automatically at 0.45-0.85 or forced with spark; flame 0..1; a 2 px glint.
- glass: pinched by the stem, upright. fill 0..1; drink 0..1 raises it to the lips and tilts it; lip:true (Kay's mark); empty.
- bottle: held by the body. pour 0..1 tips it neck-down; the stream starts past 0.6. into:[x,y] is where the wine lands; stream:false.
- deck: {mode:'fan'|'square'|'card', n, spread, open, angle, cardAng}.
- knife: in a fist. {point:[x,y] | dir}; tremble for Scott's shaking hand.
- bowl: on the upturned hand {crisps}.
- bag: Kay's dripping bag of ice {drips}.
- biscuit: Christof's biscuit baton.
- cig: Angelo's cigarette in his fingers. Also pass cig:false on the figure so it leaves his ear.
- flat: palm on a surface {at, angle, view:'edge'|'above', squash, fingers, curl}. Also used for a hand on a shoulder (view:'edge', curl 0.45).
- cover: palm over {at:'throat'|'mouth'|'eyes'|[x,y]}. Side-on, palm to the skin, fingers up. Put it on both N and F for Deena's hands on her throat.
- point: {at}. reach: {at}, an open hand straining toward the target.
- clasp: {at, toward}. RIG.link(specA,'N'|'F',specB,'N'|'F',{sag}) -> {at, A, B} solves both halves; specs need an id field.

MOTION
- RIG.walk(id, t, {x0, scale, facing, t0, dist, speed, stride, mood}) -> a spec fragment (x, legs, arms, lean, walking:{n, u, stance, done, foot}).
  - On twos (Kay on ones). The stance foot is pinned: verified constant to the pixel through each step.
  - With dist it lands exactly and settles into a stand.
  - Periods: Scott 1.04 s, Deena 0.90, Christof 1.06, Marina 0.96, Angelo 1.12 (drained 1.55), Kay 1.24.
- RIG.crawl(id, t, {x0, scale, facing, t0, speed}).
- RIG.buckle(id, u): legs giving way, 0 standing -> 1 sunk on the heels. Pass it as pose:.
- RIG.thrown(id, u, {from, to, peak, spin, facing}): the blast arc, as F12.
- RIG.turn(id, t, t0, from, to, {dur}) -> {facing, squash, u}: a cut-paper flip. Durations: Deena 0.17 s, Marina 0.32, Angelo 0.38, Christof 0.42, Scott 0.5, Kay 0.62.

CHARACTER
- RIG.P (the persona table), RIG.time(id, t), RIG.curve(id, u, mood).
- How each character moves:
  - Scott: a tentative half-start, overshoots 7%, corrects, corrects again.
  - Deena: snaps there in 26% of the time, 3% past, then dead still.
  - Christof: a big sweeping overshoot.
  - Marina: an exact in-out with no overshoot.
  - Angelo: a wind-back, then outBack.
  - drained (Angelo's mood): late, heavy, no overshoot.
  - Kay: a late start, then a glide.
- RIG.key(id, t, keys, {mood, raw, curve}): FILM.key with those curves, quantised on twos. Values may be numbers, arrays or pose objects; a key's third element overrides the ease.
- RIG.arc(id, t, keys, {arc, side}): 2D paths with a per-character bulge.
- RIG.idle(id, t, mood) and RIG.blend(a, b, u) are also exported.

OTHER VIEWS
- RIG.top(id, {x, y, dir, scale, hands:[left,right], handPose:[l,r], look:[x,y], deck:true, t, foreshorten, headTurn, lean}).
  - hands are the figure's own left and right; facing the table, its left is clockwise on screen.
  - Per-hand poses add 'tuck' (arm in the lap) and 'off' (no arm).
- RIG.topLink(a, ia, b, ib, want, k): F07's clasp solver for top-down hands.
- RIG.bust(id, {x, y | waist, tilt, armL/armR: false | {to, hand, elbow:'in'|'out'}, t}): returns parts.head and chest.

HELPERS
- RIG.chair(x, floorY, scale, {facing, squash, kind:'dining'|'stool'|'armchair'}) -> {shape, seat}.
- RIG.prop.glass(g, x, y, scale, o) (a standing glass); RIG.prop.jacketOver(F) (Angelo's jacket over a lying body); RIG.paintGlass.
- RIG.faceLight(g, F, from, {color, lit, em}): the F08 screen light on a profile face.
- RIG.throat(F) -> {A, B, pt(t), crescent(t0, t1, w), down}: Deena's throat line, from F10; cut it with f.knockout or holes.
- RIG.cu.clasp(x, y, L, rot, sq) and RIG.cu.drawClasp(g, f, K, {depth}): the F13 close-up. His hand is ink; the other is only a knockout.
- RIG.cu.fan(g, x, y, s, {light}): the F06 close-up of the fanned deck.
- RIG.shadowM(floorY, shear, squash); RIG.dbg(g, F).

KIT CHANGES (all backward compatible)
- otm.js, OTM.silhouette:
  - New options: at, bbox, parts:[{shape|path, at, w, color, alpha, spread, bbox}], spread, falloff{r0, r1, steps}, clip, noFill (or fill:false), rimAlpha.
  - A bare Path2D with a point light is now measured from its own centroid (found at 1/8 resolution and cached) instead of from 0,0.
  - Rims are cut on canvases the size of each part only, and work under any ctx transform; before, they ignored the camera.
- figures.js:
  - The earlier extensions are finished and tested: clothes, hair, pony grip, cig, look, rot/squash, arm to/aim/dir/elbow, hands fist/grip/pinch/none, top per-hand poses/tuck/foreshorten/headTurn, bust waist/arm options, hoop on the light side, cowlick drawn when a light is given, the cigarette capped as a sliver, Kay's beads on her hair.
  - New: breath; leg IK legN/legF {to, knee} (anchor hip only); arm uk/fk foreshortening; look gives only half a glance at targets behind; top handPose 'off'; bust parts.head and chest.
- dialogue.js:
  - Scott's cut: a clean stub, the piece drops below, and the caret waits a clear step after it. The cut only shows once the line is fully typed.
  - Deena's pointTo works left, right, above and below.
  - say() defaults align to centre for voice and dispatcher.
  - Dispatcher band:true works without bandY: fixed band at the live-area top + 184, centred.

DEMOS (SETS._rig_demo, 20 demos, node tools/set.js _rig_demo 1)
1 idle; 2 rims before/after; 3 seated profile and 3/4 with chairs; 4 holds I; 5 holds II; 6 link, flat hand on a table, hand on a shoulder; 7 grass; 8 walk; 9 turns and look-at; 10 kneel, crouch, buckle, slump; 11 lying, jacket over, drained kneel; 12 crawl and thrown; 13 character curves with graphs; 14 top-down table in the locked seating; 15 top-down hand circle with clip; 16 bust and face light; 17 Deena grip and throat; 18 close-ups; 19 camera zoom and Path2D lights; 20 dialogue fixes.

## Known issues
- Engine change needed (film/engine.js, which I may not edit): FILM.drawLines sets o.align = L.align || o.align || 'left', so VOICE and Dispatcher lines are still left-aligned in the film. dialogue.js now defaults them to centre when align is undefined. Suggested one-line fix: o.align = L.align || o.align (leave it undefined).
- Engine change suggested: dispatcher band:true chooses its band from the live area of o.letterbox (default 1.78). The engine should pass o.letterbox = c.letterbox for dispatcher lines so the band follows the matte.
- The style frames still render with no errors. The only differences from the original out/ renders are the requested detail fixes, all under 0.1% of pixels: F08 and F04 (Angelo's cigarette is no longer a bar), F04 (Deena's hoop catch-light faces the lamp), F06 and S01 (Kay's beads moved from her collar onto her hair). F02 differs by at most 2 levels out of 255 (sub-rectangle compositing); this is invisible.
- Seated figures: x comes from seat[0] and the hip sits 0.44*hipK units above the seat. RIG.chair seats are 1.76 units high. Other sets' chairs should either use RIG.chair(...).seat or pass their own seat point.
- Look-at clamps to what a neck can do: from -0.62 (up) to 0.9 (down) around forward. Targets behind give only half a glance, so to look behind, use RIG.turn first.
- Holds are built for profile figures. Top-down figures only support deck:true (Angelo's squared deck between both hands) plus per-hand poses. Busts support arm IK targets but not props.
- The cover hold (hands on the throat or mouth) is necessarily subtle in silhouette at small scales. It reads from the raised forearms and the hand breaking the throat line. Close-ups sell it best.
- Ground contact and the walk assume a flat floor at y. There is no stairs or slope support; for the yard steps, use anchor:'hip' or leg IK (legN/legF {to}).
- RIG.link and RIG.topLink project the knot into both people's reach. If the two people stand farther apart than their combined reach, the hands stop short. Seat people within reach, as F07 did.
- Default rim width is scale*0.04. Falloff is opt-in (o.falloff:true or {r0,r1}). With falloff and a distant lamp the rim gets faint, so raise o.w or r1 for strong backlight.
- KIT.md (not assigned to me) does not yet document the new OTM.silhouette options, leg IK, uk/fk or breath. The kit file headers do.

Test sheet: out/set__rig_demo.png (20 demos, rendered with node tools/set.js _rig_demo 1). Full-resolution frames of each demo: /tmp/claude-0/-home-user-Inez-Model/8a62f68b-8b0e-5610-a72d-0c00b1ecdab5/scratchpad/rig/r2/ through /tmp/claude-0/-home-user-Inez-Model/8a62f68b-8b0e-5610-a72d-0c00b1ecdab5/scratchpad/rig/r5/. Style-frame regression renders: /tmp/claude-0/-home-user-Inez-Model/8a62f68b-8b0e-5610-a72d-0c00b1ecdab5/scratchpad/rig/final2/ (baseline: /tmp/claude-0/-home-user-Inez-Model/8a62f68b-8b0e-5610-a72d-0c00b1ecdab5/scratchpad/rig/base/).
Performance: These are browser timings on the shared, loaded headless machine.
- Building a figure (RIG.figure) takes 0.15-0.45 ms. The skeleton alone takes 0.02 ms.
- Drawing one figure (RIG.draw) at scale 60-90 takes about 0.5 ms unlit, and 3-5 ms lit with the head part, wedge and falloff.
- In a six-figure demo frame, the rig costs about 30 ms: 1.7 ms building and 26-28 ms drawing.
- The engine's fixed per-frame post-processing costs about 28-45 ms right now: the empty dialogue demo takes 28 ms.
- Demo frames measured 28-85 ms/frame on the final run.
- Large close-up figures cost more because the rim canvases grow with screen area: the scale-180 Deena demo takes 85-113 ms.
- A bare Path2D with a point light and no `at`/`bbox` costs one 1/8-resolution readback the first time that path is seen (cached per path and transform). Pass at/bbox, or use RIG.draw, which does.
