/* ONE TOO MANY — the film rig: the six friends, posed, holding things, breathing and moving in character. Global: RIG.
   Built on OTM.fig (kit/figures.js). Deterministic (no Math.random / Date). 1 unit = 1 head height; `scale` = px per unit.

   ============================== QUICK START ==============================
     const F = RIG.figure('scott', { x: 900, y: 880, scale: 84, facing: 1, pose: 'idle', t: lt,
                                     look: [1200, 500], hold: { N: { kind: 'glass', fill: 0.6 } } });
     RIG.draw(c.g, F, { light: { x: 1300, y: 300 }, falloff: true, em: c.em });   // ink + per-part rim + props + details
   `y` is the FLOOR line for every pose (standing, walking, kneeling, lying, crawling, seated on the grass or the floor);
   a figure on furniture takes `seat: [x, y]` (the seat top under the hips) plus optional `floor` (its feet are then IK'd onto it).
   Figures are memoised: the same spec at the same twos-time returns the SAME F object (do not mutate F), and RIG.draw reuses the
   composited sprite on the second frame of each pair, so a lit figure costs about one drawImage every other frame.

   ============================== RIG.figure(id, spec) -> F ==============================
   id: scott | deena | angelo | kay | christof | marina
   spec:
     x, y, scale (default 60), facing 1 | -1, seat:[x,y], floor, anchor ('feet' | 'hip': y is then the hip, no grounding)
               x is the hip. For a seated figure x comes from seat[0]; RIG.chair(...).seat gives a chair's seat point.
     pose      a name from RIG.POSES (below) or an object of OTM.fig.profile params. Default 'stand'. Pose objects may also give
               ground: 1 (lowest contact on the floor) | 'seat' (buttock on the floor) | 'rest' (settles on two contacts, see lie),
               and limbs  toU:[x,y] | fn(skeleton) (IK target in the figure's own units), or rest:[dx, h] (wrist / ankle laid on the
               floor dx units from the shoulder / hip along +facing, h units above the floor), plus elbow:'down'|'up'|'forward'|'back'.
     gesture   arms-only overlay from RIG.GESTURES: handsUp, shrug, armsFolded, flourish, expansive, handToChin, wipe, hug, handOnHip, handOnHipF
     t         sequence time in seconds: breath (4 px rise at 0.25 Hz, per-character phase) + the character's idle motion.
               Quantised on twos (Kay on ones) unless raw:true. idle:false keeps breath only; idleAmt scales it; breath:false | px.
     mood      'drained' (Angelo after the kitchen: slumped, limp arms, slower and deeper breath, no flourish; also changes his curves)
     look:[x,y], lookAmt  head turn toward a world point (clamped to what a neck can do; behind him only half a glance: turn instead)
     hold: { N: holdSpec, F: holdSpec }  what each hand holds (N = near arm, F = far arm), see HOLDS
     autoLean: true       bend at the waist until every held target is reached (see F.holds[s].reach)
     wall: x              (ground 'seat' / slump) the back rests against a wall or counter at world x behind the figure
     headTo: 'left'|'right'  (lying poses) which end the head is at;  knees:'up' (lie: both knees raised, as style frame 11)
     leanAdd, headAdd     added on top of the pose
     any OTM.fig.profile param overrides the pose: lean, neck, head, armN, armF (merged), legN, legF (merged), rot, squash, swing, hem,
               view34 (0..1 three-quarter cues), roll (0..1 face rolled away), clothes ('none' = Angelo without the jacket), hair,
               pony (false | {grip:[x,y], maxLen} Deena's ponytail yanked by nothing: the hair never stretches, the head is pulled), cig:false
     seed      rough-edge seed
   F is the OTM.fig.profile result plus: shape (body + hands + ink props), front (ink drawn over props), props, holds{N,F}, parts.head,
     at (chest point the body rim is measured from), kind:'profile', spec, pose, rig (skeleton), pony {grip} (where the yank really ends),
     joints {head, neck, neckTop, shoulder, chest, hip, H, elbowN/F, wristN/F, kneeN/F, ankleN/F}.
     holds[N|F]: kind, tip (fingertip / top card / bottle mouth / blade tip / phone), screen, spark, hand (the hand Shape),
     reach (px the arm falls short of its target; 0 = reached).

   ============================== RIG.draw(g, F, o) ==============================
     o.light {x,y}|{dx,dy}; o.color rim colour (default tungsten); o.w rim px (default 2 + 0.012*scale, 2.4..5); o.soft (only when w >= 3); o.alpha
     o.falloff  true (automatic: full rim at the figure's nearest point, r1 = 1.5x its farthest, outer band 0.5) | {near, far} (share one
                falloff across a scene: r0 = near, r1 = 1.5*far) | {r0, r1, steps, min} explicit (min defaults to 0.5)
     o.spread (body wedge, default 1.7 rad), o.headSpread (default 1.25), o.clip Path2D|fn (+ o.clipKey string to keep the cache)
     o.fill (default ink; dark scenes '#070505'), o.em (emissive ctx: glints, screens, sparks, flames)
     o.details {cigColor, hoopColor, beadColor, ringColor, cowlick:false}, o.props:false, o.faceLight:false, o.cache:false
     o.shadow {m: affine, alpha} cast first (see RIG.shadowM)
     top-down results: o.armRim (default false: only the crowns are rimmed, three stepped bands in a short wedge, as style frame 07)
   Cost: a lit standing figure at scale 64 is ~2-3 ms to build and draw; the second frame of each pair is a cache hit (~0.2 ms).
   Works under c.camera (zoom, rotation): rims are cut in device pixels.

   ============================== POSES (RIG.POSES) ==============================
     stand, idle            standing (idle = stand; give t for breath + idle motion)
     sit                    on a chair, profile.   sit34: three-quarter (both shoulders, the far thigh, wider chest).   perch: a high edge
     grass                  on the grass, knees up, propped back on the far arm (flat hand planted), as style frame 02
     kneel                  one knee down.  kneelUp: both knees, upright.  kneelSit: sitting back on the heels.  crouch
     slump                  sat on the floor, legs out, head down: the buttock is on the floor (pair with wall:x to lean on a counter)
     lie                    on the back, slack: two contacts (head and hips/heels), head rolled, near arm dropped to the floor, far arm
                            flung past the head (headTo:'left'|'right', knees:'up').  lieFace: face down.  lieCurl: curled on her side,
                            knees to the chest, back to the light
   ============================== MOTION ==============================
     RIG.walk(id, t, {x0, scale, facing, t0, dist, speed, stride, mood}) -> spec fragment: foot-planted walk on twos (Kay on ones).
                            The hip moves at a near-constant speed (+-12%), the first step starts from the stand, the stance foot never
                            slides, toe-off rolls over the ball of the foot, swing clearance ~0.25 units. With dist it lands exactly and
                            stands. Returns {x, hipH, feet{N,F:[x, h, footAngle]}, armN, armF, lean, head, walking:{n, u, stance, done, foot, prints}}
     RIG.run(id, t, {...same})  a run: flight phase, heel kick, pumping fists, forward lean
     RIG.stumble(id, u, {x0, scale, facing, dist})  the toe catches, he pitches, a lunge, a hand to the floor, recovers (u 0..1, ground:1)
     RIG.crawl(id, t, {x0, scale, facing, t0, speed})   hands and knees, on twos
     RIG.roll(id, t, {x0, scale, headTo, t0, rate, dx})  a log roll on the grass (stop, drop, roll): a cut-paper flip back <-> front
     RIG.buckle(id, u)      legs giving way: u 0 standing -> 0.3 knees going -> 0.65 dropping -> 1 sunk on the heels, head down
     RIG.thrown(id, u, {from, to, peak, spin, facing})   the blast: a body thrown along an arc, limbs flung then tucking; anchor hip
     RIG.turn(id, t, t0, from, to, {dur})  a cut-paper turn: {facing, squash, view34, u}; slow turners (Scott, Kay, Christof, drained
                            Angelo) pass through a three-quarter view instead of a sliver
   ============================== TWO BODIES ==============================
     RIG.cradle(holder, held, {x, y, scale, facing, u, t}) -> {A, B} specs: the holder kneels and catches (u 0 -> 1) and holds the other
                            across his knee, her head in the crook of his arm (Angelo and Deena on the tiles)
     RIG.grab(specA, specB, {pull}) -> {N, F, A, B}: A's two hands on B's shoulders (Deena pulls Scott back); A, B are spec patches
     RIG.link(specA, 'N'|'F', specB, 'N'|'F', {sag}) -> {at, A, B}: clasp holds for two figures' hands (specs need an id field)
     RIG.folded(box, o) -> Shape: Christof folded flat inside the oven (style frame 09), mapped into box {x,y,w,h} or quad [4 pts];
                            o.warp fn(x,y) for a projected shadow (RIG.homography(src, dst) helps); feed it to OTM.castShadow / fill
   ============================== HOLDS (spec.hold.N / .F) ==============================
   A string is shorthand for {kind}. Every hold may take at:[x,y] (world), tremble (px amplitude, needs spec.t), elbow, autoLean.
     phone      at the ear (style frame 02): slab on the cheek, palm on its back, four fingertips over the rear edge, thumb up the front.
                {glow:true (phone-white band on cheek and ear), color (slab), lit:true (screen edge)}. On F (far ear) only the hand shows.
     phoneLook  held up in front, screen to the face, head looking at it, thumb on the glass {tap:0..1, glow:true}; lights the face
     phoneLow   lowered at the hip, screen still lit, dangling from slack fingers {glow}
     phoneOffer held out at arm's length to someone, screen toward them {at, glow}
     lighter    fist with the lighter standing out of it, thumb on the wheel (style frame 11) {strike:0..1, spark:bool, flame:0..1}
     glass      wine glass pinched by the stem, upright {fill:0..1, drink:0..1 (to the lips, tilted), lip:true (Kay's mark), empty}
     bottle     by the body {pour:0..1 (tips it neck-down past 0.6), into:[x,y] where the wine lands, stream:false}
     deck       {mode:'fan'|'square'|'card', n, spread, open:0..1, cardAng}; Angelo's flourish = mode fan; tip = the top card
     knife      kitchen knife in a fist {point:[x,y] | dir (rad, figure space)}, tremble for Scott's shaking hand
     bowl       bowl of crisps on the upturned hand {crisps:n}
     bag        Kay's dripping bag of ice hung from her fist, clear of the coat, with its own rim and ice highlight {drips:true}
     biscuit    Christof's biscuit baton.   cig: Angelo's cigarette in his fingers (set cig:false so it leaves his ear)
     flat       hand flat on a surface {at:[x,y] palm point, angle (surface tilt), view:'edge'|'above' (foreshortened, F02), squash,
                fingers:'away'|'toward'|1|-1, curl}. Also for a hand on a shoulder (view:'edge', curl:0.45). autoLean:true bends to reach.
     cover      open hand over {at:'throat'|'mouth'|'eyes'|[x,y]}: the spread fingers break the front outline over the jaw (style frame 10);
                put cover on N and F for Deena's hands on her throat (the far one lower, its elbow staggered forward)
     point      {at:[x,y]} index finger out, the others curled.   reach: {at} open hand straining toward a target
     grab       {at:[x,y]} a fist closed on cloth (a shoulder, a collar), fingers over the top.   clasp: {at, toward} one half of two hands
   ============================== CHARACTER (motion personality) ==============================
     RIG.P[id]                     persona table: curve, arc, breath, turn time, walk/run {period, step, arm, lean, head}
     RIG.time(id, t)               twos (Kay: ones): use it for anything a character does
     RIG.curve(id, u, mood)        eased progress in that character's manner (may overshoot):
                                   scott  hovers (a tentative half-start), commits 7% too far, corrects back, corrects again
                                   deena  snaps: there in a quarter of the time, 3% past, dead still
                                   christof expansive: big sweeping overshoot.   marina precise: exact in-out, no overshoot
                                   angelo flourish: a wind-back, then out past and back.   drained (mood): late, heavy, no overshoot
                                   kay    unhurried: starts late, glides
     RIG.key(id, t, keys, {mood, raw, curve})   like FILM.key, but every segment moves in the character's manner (and on twos);
                                   values may be numbers, arrays or objects (poses); a key's 3rd element overrides the ease
     RIG.arc(id, t, keys, o)       2D points along the character's arcs (Christof wide, Angelo flourish, Scott a wobble, Deena/Marina straight)
     RIG.idle(id, t, mood)         the idle deltas {lean, neck, head, armN, armF} (applied automatically by RIG.figure when t is given)
   ============================== OTHER VIEWS ==============================
     RIG.top(id, spec)   top-down at the table: OTM.fig.top + look:[x,y] (head turn), deck:true (Angelo's squared deck), t (breath),
                         hands:[left, right] are the figure's OWN left/right (facing the table, its left is clockwise on screen);
                         handPose:[l, r] per hand: flat open splay point clasp ... 'tuck' (arm in the lap), 'off' (no arm).
                         Arms default to F07's weight (armW 1.25, handK 1.15) and no nose nub. Returns crown (the smooth head hull).
     RIG.topLink(a, ia, b, ib, want, k) -> clasp point between two top-down figures' hands (ia/ib: 0 = left hand, 1 = right), as F07
     RIG.bust(id, spec)  front view (photo, yard): {x, y | waist, scale, tilt, t, armL/armR: false | {to, hand, elbow:'in'|'out'|'down'} |
                         {to, on:'shoulder'} (a hand laid on that shoulder, elbow down, ring glints for Marina)}; parts.head, chest
   ============================== HELPERS ==============================
     RIG.skeleton(id, spec)        resolved pose + skeleton without building shapes (plan look-ats, shoulders, head points)
     RIG.chair(x, floorY, scale, {facing, kind:'dining'|'stool'|'armchair', squash}) -> {shape, seat:[x,y]}
     RIG.prop.glass(g, x, y, scale, o) a standing wine glass (o.fill, light, em, lip);  RIG.prop.jacketOver(F) Angelo's jacket over a body
     RIG.faceLight(g, F, from, {color, lit, em})  the light of a screen / flame on a profile face (brow and nose crescent, cheek catch-light)
     RIG.throat(F)                 Deena's throat line: {A, B, pt(t), crescent(t0, t1, w) -> Shape, down}; cut it with f.knockout
     RIG.cu.clasp(x, y, L, rot, sq) close-up of two hands holding (style frame 13): Shapes {sBack, sFing, sThumb, eBack, eArm, eFing, eThumb}
     RIG.cu.drawClasp(g, f, K, o)  Scott's hand in ink, the other hand cut through the paper, its wrist charring out in feathered steps
     RIG.cu.fan(g, x, y, s, o)     close-up of long fingers round a fanned deck (style frame 06)
     RIG.path(F) / RIG.bbox(F)    the figure's rough-cut Path2D exactly as drawn (cached on F): clip to it, knock out under it, hide holes
     RIG.shadowM(floorY, shear, squash)  affine for OTM.castShadow onto a floor;  RIG.blend(a, b, u) pose blend;  RIG.dbg(g, F) joints
     RIG.warp(shape, fn), RIG.homography(src4, dst4) -> fn(x, y)
   Bad input (NaN times or coordinates) is replaced by defaults with one warning; it never throws inside the kit.
*/
(function (global) {
  'use strict';
  const O = global.OTM, FIG = O.fig; const { S, C, clamp, lerp, rgba, mix } = O; const { ap, comp, inv } = FIG.M;
  const TAU = Math.PI * 2;
  const twos = t => Math.floor(t * 12 + 1e-6) / 12, ones = t => Math.floor(t * 24 + 1e-6) / 24;
  const sstep = u => u * u * (3 - 2 * u);
  const noise = (t, hz, seed) => O.vnoise(t * hz, 0.5, seed | 0) * 2 - 1;
  const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], addv = (a, b, k) => [a[0] + b[0] * (k == null ? 1 : k), a[1] + b[1] * (k == null ? 1 : k)];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const lerp2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  const rotv = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
  const frameM = (o, ang, s) => [Math.cos(ang) * s, Math.sin(ang) * s, -Math.sin(ang) * s, Math.cos(ang) * s, o[0], o[1]];
  const smooth = FIG.smooth, hand = FIG.hand;
  const E = {
    ioc: u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2, ios: u => -(Math.cos(Math.PI * u) - 1) / 2,
    ioq: u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, oc: u => 1 - Math.pow(1 - u, 3), iq: u => u * u,
    back: (u, s) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2),
  };
  const fin = v => typeof v === 'number' && isFinite(v);
  function warn(m) { if (global.FILM && FILM.warn) FILM.warn(m); else if (!warn[m]) { warn[m] = 1; console.warn(m); } }

  // ======================================================================== character
  const P = {
    scott: { curve: 'scott', arc: 0.05, breathPx: 4, breathHz: 0.25, phase: 0.0, turn: 0.5, turn34: true,
      walk: { period: 1.04, step: 2.3, arm: 0.26, lean: 0.17, head: 0.12, mod: 0.13 }, run: { period: 0.66, step: 3.6, arm: 0.62, lean: 0.3, head: 0.02 } },
    deena: { curve: 'deena', arc: 0, breathPx: 4, breathHz: 0.25, phase: 1.7, turn: 0.17,
      walk: { period: 0.9, step: 2.4, arm: 0.34, lean: 0.02, head: -0.06, mod: 0.1 }, run: { period: 0.6, step: 3.4, arm: 0.6, lean: 0.24, head: -0.05 } },
    christof: { curve: 'christof', arc: 0.22, breathPx: 4, breathHz: 0.25, phase: 0.6, turn: 0.42, turn34: true,
      walk: { period: 1.06, step: 2.6, arm: 0.62, lean: -0.05, head: -0.05, mod: 0.15 }, run: { period: 0.7, step: 3.5, arm: 0.72, lean: 0.16, head: -0.05 } },
    marina: { curve: 'marina', arc: 0, breathPx: 4, breathHz: 0.25, phase: 2.9, turn: 0.32,
      walk: { period: 0.96, step: 2.25, arm: 0.2, lean: 0.01, head: 0.0, mod: 0.08 }, run: { period: 0.62, step: 3.2, arm: 0.5, lean: 0.2, head: 0 } },
    angelo: { curve: 'angelo', arc: 0.16, breathPx: 4, breathHz: 0.25, phase: 1.1, turn: 0.38,
      walk: { period: 1.12, step: 2.6, arm: 0.48, lean: -0.03, head: 0.0, mod: 0.14 }, run: { period: 0.66, step: 3.7, arm: 0.66, lean: 0.22, head: 0 },
      drained: { curve: 'drained', arc: 0, breathPx: 5, breathHz: 0.17, turn: 0.8, turn34: true, walk: { period: 1.55, step: 1.5, arm: 0.05, lean: 0.2, head: 0.3, mod: 0.06 },
        run: { period: 0.8, step: 2.8, arm: 0.35, lean: 0.3, head: 0.2 } } },
    kay: { curve: 'kay', arc: 0.08, breathPx: 4, breathHz: 0.25, phase: 2.2, ones: true, turn: 0.62, turn34: true,
      walk: { period: 1.24, step: 2.2, arm: 0.18, lean: 0.03, head: 0.06, mod: 0.08 }, run: { period: 0.72, step: 3.0, arm: 0.45, lean: 0.18, head: 0.05 } },
  };
  function persona(id, mood) {
    const p = P[id] || P.scott; if (!mood || !p[mood]) return p;
    return Object.assign({}, p, p[mood], { walk: Object.assign({}, p.walk, p[mood].walk), run: Object.assign({}, p.run, p[mood].run) });
  }
  const CURVES = {
    scott(u) {
      if (u <= 0) return 0; if (u >= 1) return 1;
      if (u < 0.2) return 0.07 * sstep(u / 0.2);                                   // a tentative half-start
      if (u < 0.72) return 0.07 + (1.07 - 0.07) * E.ioc((u - 0.2) / 0.52);        // commits, a touch too far
      if (u < 0.87) return 1.07 + (0.985 - 1.07) * E.ios((u - 0.72) / 0.15);      // corrects back
      return 0.985 + 0.015 * E.ios((u - 0.87) / 0.13);                            // and again, smaller
    },
    deena(u) { if (u <= 0) return 0; if (u >= 1) return 1; if (u < 0.26) return 1.03 * (1 - Math.pow(1 - u / 0.26, 4)); if (u < 0.4) return 1.03 - 0.03 * E.ios((u - 0.26) / 0.14); return 1; },
    christof(u) { if (u <= 0) return 0; if (u >= 1) return 1; return E.back(E.ios(u), 2.2); },
    marina(u) { if (u <= 0) return 0; if (u >= 1) return 1; return E.ioc(u); },
    angelo(u) { if (u <= 0) return 0; if (u >= 1) return 1; if (u < 0.16) return -0.07 * Math.sin(Math.PI * u / 0.16); return E.back((u - 0.16) / 0.84, 1.8); },
    drained(u) { if (u <= 0.18) return 0; if (u >= 1) return 1; return E.ioq((u - 0.18) / 0.82); },
    kay(u) { if (u <= 0.08) return 0; if (u >= 1) return 1; return E.ios((u - 0.08) / 0.92); },
    linear: u => clamp(u, 0, 1),
  };
  const time = (id, t, o) => (o && o.raw) ? t : ((id === 'kay' || (o && o.ones)) ? ones(t) : twos(t));
  function curve(id, u, mood) { const c = persona(id, mood).curve; return (CURVES[c] || CURVES.marina)(u); }
  function easeOf(e, id, mood) {
    if (!e) { const c = persona(id, mood).curve; return CURVES[c]; }
    if (typeof e === 'function') return e;
    if (CURVES[e]) return CURVES[e];
    if (global.FILM && FILM.ease && FILM.ease[e]) return FILM.ease[e];
    return E[e] || CURVES.linear;
  }
  // blend two values (numbers, arrays, nested pose objects); strings switch half way; u may overshoot
  function blend(a, b, u) {
    if (a === undefined || a === null) return b; if (b === undefined || b === null) return a;
    if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * u;
    if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => blend(v, b[i], u));
    if (typeof a === 'object' && typeof b === 'object') { const o = {}; for (const k in a) o[k] = (k in b) ? blend(a[k], b[k], u) : a[k]; for (const k in b) if (!(k in a)) o[k] = b[k]; return o; }
    return u < 0.5 ? a : b;
  }
  function key(id, t, ks, o) {
    o = o || {}; const tq = o.raw ? t : time(id, t, o);
    if (tq <= ks[0][0]) return ks[0][1]; const last = ks[ks.length - 1]; if (tq >= last[0]) return last[1];
    let i = 0; while (i < ks.length - 1 && tq > ks[i + 1][0]) i++;
    const [t0, v0] = ks[i], [t1, v1, e] = ks[i + 1]; const u = (tq - t0) / ((t1 - t0) || 1e-6);
    return blend(v0, v1, easeOf(e || o.curve, id, o.mood)(u));
  }
  function arc(id, t, ks, o) {
    o = o || {}; const tq = o.raw ? t : time(id, t, o); const k = o.arc == null ? persona(id, o.mood).arc : o.arc;
    if (tq <= ks[0][0]) return ks[0][1].slice(); const last = ks[ks.length - 1]; if (tq >= last[0]) return last[1].slice();
    let i = 0; while (i < ks.length - 1 && tq > ks[i + 1][0]) i++;
    const s0 = ks[i], s1 = ks[i + 1];
    const v = easeOf(s1[2] || o.curve, id, o.mood)((tq - s0[0]) / ((s1[0] - s0[0]) || 1e-6));
    const d = sub(s1[1], s0[1]), L = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / L, d[0] / L], side = (o.side || 1) * (i % 2 ? -1 : 1);
    const bulge = k * L * Math.sin(Math.PI * clamp(v, 0, 1)) * side;
    return [s0[1][0] + d[0] * v + n[0] * bulge, s0[1][1] + d[1] * v + n[1] * bulge];
  }
  // a cut-paper turn. Quick turners flip through a sliver; slow ones (persona turn34) pass through a three-quarter view.
  function turn(id, t, t0, from, to, o) {
    o = o || {}; const pers = persona(id, o.mood); const dur = o.dur || pers.turn; const tq = time(id, t, o);
    const u = curve(id, clamp((tq - t0) / dur, 0, 1), o.mood); const c = Math.abs(Math.cos(Math.PI * clamp(u, 0, 1)));
    const slow = o.view34 != null ? o.view34 : pers.turn34;
    if (slow) return { facing: u < 0.5 ? from : to, squash: 0.62 + 0.38 * c, view34: from === to ? 0 : 1 - c, u };
    return { facing: u < 0.5 ? from : to, squash: Math.max(0.12, c), view34: 0, u };
  }
  // idle: small character motion, deterministic
  function idle(id, t, mood) {
    const d = { lean: 0, neck: 0, head: 0, armN: { a: 0, b: 0 }, armF: { a: 0, b: 0 } };
    const seed = O.hashStr(id) % 997;
    const steps = (period, amp, cv, salt) => { const k = Math.floor(t / period), u = (t - k * period) / period; const lv = j => (O.rng(seed * 131 + j * 17 + salt * 7919)() * 2 - 1) * amp; return lerp(lv(k - 1), lv(k), CURVES[cv](clamp(u / 0.55, 0, 1))); };
    const who = (id === 'angelo' && mood === 'drained') ? 'drained' : id;
    switch (who) {
      case 'scott': d.lean = steps(2.3, 0.035, 'scott', 1); d.head = steps(2.3, 0.07, 'scott', 2) + 0.015 * noise(t, 0.4, seed); d.armN.b = steps(3.1, 0.14, 'scott', 3); d.armF.a = steps(2.7, 0.06, 'scott', 4); break;
      case 'deena': d.head = steps(3.1, 0.09, 'deena', 1); d.neck = steps(3.1, 0.035, 'deena', 2); d.armN.b = steps(4.3, 0.1, 'deena', 3); break;
      case 'christof': d.lean = 0.035 * Math.sin(TAU * 0.3 * t + seed); d.armN.a = 0.22 * noise(t, 0.35, seed); d.armN.b = 0.18 * noise(t, 0.3, seed + 3); d.armF.a = 0.14 * noise(t, 0.3, seed + 5); d.head = 0.05 * noise(t, 0.25, seed + 9); break;
      case 'marina': d.head = steps(4.2, 0.022, 'marina', 1); d.lean = steps(5.1, 0.01, 'marina', 2); break;
      case 'angelo': {
        d.lean = 0.03 * noise(t, 0.35, seed); d.head = 0.05 * noise(t, 0.3, seed + 3); d.armF.a = 0.05 * noise(t, 0.4, seed + 7);
        const u = (t % 4.6) / 4.6; if (u < 0.24) { const v = Math.sin(Math.PI * CURVES.angelo(u / 0.24)); d.armN.a += 0.42 * v; d.armN.b += 0.95 * v; }   // a flourish now and then
        break;
      }
      case 'drained': d.head = 0.012 * noise(t, 0.12, seed); d.lean = 0.006 * noise(t, 0.1, seed + 2); break;
      case 'kay': d.lean = 0.02 * Math.sin(TAU * 0.13 * t + seed); d.head = 0.04 * Math.sin(TAU * 0.11 * t + 1 + seed); d.armN.a = 0.03 * Math.sin(TAU * 0.09 * t + 2); break;
    }
    return d;
  }

  // ======================================================================== poses
  const LIMB = { armN: 1, armF: 1, legN: 1, legF: 1, pony: 1 };
  const POSE_KEYS = ['lean', 'neck', 'head', 'armN', 'armF', 'legN', 'legF', 'rot', 'squash', 'swing', 'hem', 'clothes', 'hair', 'pony', 'cig', 'look', 'lookAmt', 'view34', 'roll', 'feet', 'hipH'];
  function merge(a, b) { const o = Object.assign({}, a); for (const k in b) { if (b[k] === undefined) continue; o[k] = LIMB[k] && b[k] && typeof b[k] === 'object' && a[k] ? Object.assign({}, a[k], b[k]) : b[k]; } return o; }
  const relaxed = { armN: { a: 0.08, b: 0.25, hand: 'relaxed' }, armF: { a: -0.05, b: 0.18, hand: 'relaxed' } };
  const POSES = {
    stand: () => Object.assign({}, relaxed),
    idle: () => Object.assign({}, relaxed),
    sit: () => ({ seat: 1, ground: 1, lean: 0.05, neck: 0.04, head: 0.08, legN: { a: 1.52, b: 1.52 }, legF: { a: 1.4, b: 1.42 }, armN: { a: 0.42, b: 0.95, hand: 'relaxed', w: 0.25 }, armF: { a: 0.32, b: 0.9, hand: 'relaxed' } }),
    sit34: () => ({ seat: 1, ground: 1, view34: 1, squash: 0.94, lean: 0.06, neck: 0.05, head: 0.08, legN: { a: 1.4, b: 1.42 }, legF: { a: 1.62, b: 1.78 }, armN: { a: 0.3, b: 1.0, hand: 'relaxed', w: 0.2 }, armF: { a: 0.62, b: 1.1, hand: 'relaxed' } }),
    perch: () => ({ seat: 1, ground: 1, lean: 0.1, neck: 0.06, head: 0.1, legN: { a: 0.95, b: 0.8 }, legF: { a: 0.55, b: 0.3 }, armN: { a: 0.3, b: 0.6, hand: 'relaxed' }, armF: { a: 0.05, b: 0.2, hand: 'relaxed' } }),
    grass: () => ({ ground: 1, lean: -0.12, neck: 0.3, head: 0.04, legN: { a: 2.5, b: 2.13 }, legF: { a: 2.42, b: 2.0 }, armN: { toU: R => [R.kN[0] + 0.35, R.kN[1] + 0.95], hand: 'relaxed', w: 0.3 }, hold: { F: { kind: 'flat', back: true, view: 'above' } } }),
    kneel: () => ({ ground: 1, lean: 0.12, neck: 0.1, head: 0.15, legN: { a: 1.5, b: 1.52 }, legF: { a: 0.12, b: 1.72 }, armN: { a: 0.35, b: 0.6, hand: 'relaxed' }, armF: { a: 0.1, b: 0.3, hand: 'relaxed' } }),
    kneelUp: () => ({ ground: 1, lean: 0.06, neck: 0.04, head: 0.08, legN: { a: 0.08, b: 1.62 }, legF: { a: 0.0, b: 1.6 }, armN: { a: 0.12, b: 0.3, hand: 'relaxed' }, armF: { a: 0.0, b: 0.2, hand: 'relaxed' } }),
    kneelSit: () => ({ ground: 1, lean: 0.18, neck: 0.12, head: 0.2, legN: { a: 1.35, b: 2.85 }, legF: { a: 1.28, b: 2.8 }, armN: { a: 0.35, b: 0.4, hand: 'relaxed' }, armF: { a: 0.25, b: 0.35, hand: 'relaxed' } }),
    crouch: () => ({ ground: 1, lean: 0.6, neck: 0.05, head: -0.35, legN: { a: 1.3, b: 2.5 }, legF: { a: 0.95, b: 2.45 }, armN: { a: 0.6, b: 0.45, hand: 'relaxed' }, armF: { a: 0.85, b: 0.3, hand: 'relaxed' } }),
    // sat on the floor against something: the buttock is the contact, the heels rest on the floor, the head hangs
    slump: () => ({ ground: 'seat', lean: -0.16, neck: 0.38, head: 0.55, legN: { rest: [2.75, 0.36], knee: 'up', foot: -0.3 }, legF: { rest: [3.15, 0.36], knee: 'up', foot: -0.45 },
      armN: { rest: [0.75, 0.1], hand: 'relaxed', dir: 1.25, elbow: 'back' }, armF: { a: 0.12, b: 0.35, hand: 'relaxed' } }),
    // on the back, slack: head rolled, near arm dropped to the floor (toward us, foreshortened), far arm flung past the head
    lie: (id, s) => ({ ground: 'rest', lie: 'back', lean: 0.0, neck: -0.12, head: -0.08, roll: 0.7,
      legN: s.knees === 'up' ? { rest: [2.35, 0.36], knee: 'up', foot: 0 } : { a: 0.1, b: 0.14, foot: 0.5 },
      legF: s.knees === 'up' ? { rest: [2.75, 0.36], knee: 'up', foot: 0.05 } : { a: -0.04, b: 0.06, foot: 0.62 },
      armN: { rest: [0.55, 0.06], uk: 0.62, fk: 0.82, hand: 'relaxed', dir: Math.PI / 2 + 0.25, elbow: 'back', handOpts: { curl: 0.2 } },
      armF: { rest: [-2.15, 0.1], hand: 'open', dir: -Math.PI / 2, elbow: 'back', handOpts: { spread: 0.14, curl: 0.3 } } }),
    lieFace: () => ({ ground: 'rest', lie: 'face', lean: 0.0, neck: 0.1, head: 0.3, roll: 0.75,
      legN: { a: 0.03, b: 0.05, foot: 1.35 }, legF: { a: -0.12, b: 0.55, foot: 1.2 },
      armN: { rest: [0.95, 0.08], hand: 'relaxed', dir: -1.2, elbow: 'up' }, armF: { rest: [-1.55, 0.12], hand: 'relaxed', dir: Math.PI / 2, elbow: 'back' } }),
    lieCurl: () => ({ ground: 'rest', lie: 'curl', lean: 0.62, neck: 0.5, head: 0.62, roll: 0.35, legN: { a: 2.0, b: 2.45, foot: 0.55 }, legF: { a: 1.82, b: 2.3, foot: 0.65 },
      armN: { a: 1.25, b: 1.8, hand: 'relaxed', handOpts: { curl: 0.6 } }, armF: { a: 0.95, b: 2.0, hand: 'relaxed' } }),
  };
  const GESTURES = {
    handsUp: () => ({ armN: { a: 0.9, b: 0.55, hand: 'open', w: -1.15, handOpts: { spread: 0.1 } }, armF: { a: 0.72, b: 0.75, hand: 'open', w: -1.0 } }),
    shrug: () => ({ neck: -0.06, armN: { a: 0.3, b: 1.25, hand: 'open', w: -1.3 }, armF: { a: 0.2, b: 1.2, hand: 'open', w: -1.25 } }),
    // forearms crossed in front of the chest: the near forearm and the far hand both clear the front outline
    armsFolded: () => ({ armN: { a: 0.22, b: 1.42, fk: 0.86, hand: 'side', w: -0.2, handOpts: { curl: 0.7 } }, armF: { a: 0.42, b: 1.25, fk: 0.82, hand: 'side', w: 0.1, handOpts: { curl: 0.5 } } }),
    flourish: () => ({ armN: { a: 2.15, b: -0.45, hand: 'open', w: -0.2, handOpts: { spread: 0.2 } } }),
    expansive: () => ({ armN: { a: 1.65, b: 0.25, hand: 'open', handOpts: { spread: 0.18 } }, armF: { a: -0.95, b: -0.35, hand: 'open', handOpts: { spread: 0.18 } } }),
    handToChin: () => ({ armN: { a: 0.3, b: 2.6, hand: 'side', w: -0.6, handOpts: { curl: 0.7 } } }),
    wipe: () => ({ armN: { a: 0.5, b: 2.4, hand: 'side', w: 0.4, handOpts: { curl: 0.3 } } }),
    hug: () => ({ armN: { a: 0.95, b: 1.2, hand: 'open', w: 0.6 }, armF: { a: 0.85, b: 1.35, hand: 'open', w: 0.6 } }),
    // a hand on the hip, elbow out behind (Deena in style frame 04); handOnHipF: the far arm (Kay)
    handOnHip: () => ({ armN: { a: -0.62, b: 1.85, hand: 'relaxed', w: 0.4 } }),
    handOnHipF: () => ({ armF: { a: -0.55, b: 1.78, hand: 'relaxed', w: 0.4 } }),
  };
  const DRAINED = { lean: 0.12, neck: 0.18, head: 0.3, armN: { a: 0.02, b: 0.06, hand: 'relaxed' }, armF: { a: -0.02, b: 0.05, hand: 'relaxed' } };

  // ======================================================================== gaits: walk and run (feet planted by IK, hip at near-constant speed)
  const WALK = { duty: 0.6, clear: 0.15, heel: 0.55, strike: -0.2, knee: 0.985, mod: 0.12, bob: 0 };
  const RUN = { duty: 0.36, clear: 0.95, heel: 0.95, strike: -0.08, knee: 0.93, mod: 0.05, bob: 0.07 };
  function standFrag(x, f, p) { return Object.assign({ x, facing: f, anchor: 'feet', lean: p.lean * 0.5, head: p.head * 0.5, legN: { a: 0.06, b: 0.04 }, legF: { a: -0.05, b: 0.02 } }, relaxed); }
  function gait(id, t, o, mode) {
    o = o || {}; const run = mode === 'run'; const pers = persona(id, o.mood);
    const p = Object.assign({}, run ? RUN : WALK, run ? pers.run : pers.walk, o.params || {});
    const D = FIG.CHAR[id], k = D.heightK, f = o.facing || 1, sc = o.scale || 60;
    const thigh = 1.85 * D.legK * k, shin = 1.75 * D.legK * k, Lg = thigh + shin, ah = 0.36 * k;
    const T = p.period / (o.speed || 1), h = T / 2, beta = p.duty;
    const offN = thigh * Math.sin(0.06) + shin * Math.sin(0.02), offF = thigh * Math.sin(-0.05) + shin * Math.sin(-0.07);
    const standH = ah + Math.max(thigh * Math.cos(0.06) + shin * Math.cos(0.02), thigh * Math.cos(0.05) + shin * Math.cos(0.07));
    let Sd = p.step * (o.stride || 1), n = Infinity, Dd = null;
    if (o.dist != null) { Dd = Math.abs(o.dist) / sc; n = Math.max(2, Math.round(Dd / Sd) + 1); Sd = Dd / (n - 1); }
    const v = Sd / h, tEnd = n * h, x0 = o.x0 || 0, Wx = u => x0 + f * u * sc;
    const tq = (o.raw ? t : time(id, t, o)) - (o.t0 || 0);
    if (!(tq > 0)) return Object.assign(standFrag(x0, f, p), { walking: { n: 0, u: 0, stance: 'both', done: false, foot: Wx(offN), prints: [Wx(offN), Wx(offF)] } });
    const ramp = tau => clamp(Math.min(tau / h, Dd != null ? (tEnd - tau) / h : 1), 0, 1);
    // hip distance travelled (units): eases up over the first step and down over the last; a +-mod speed wobble (fastest at double support)
    const X = tau => {
      if (tau <= 0) return 0; if (Dd != null && tau >= tEnd) return Dd;
      let x; if (tau < h) { const u = tau / h; x = v * h * (u * u * u - u * u * u * u / 2); } else x = v * (tau - h / 2);
      if (Dd != null && tau > tEnd - h) { const w = (tEnd - tau) / h; x = Dd - v * h * (w * w * w - w * w * w * w / 2); }
      return x + p.mod * v * h / TAU * Math.sin(TAU * tau / h) * sstep(ramp(tau));
    };
    // footprints (ankle x, units): j = -2 / -1 are the standing feet; footprint j lands at (j + 1) * h
    const plant = j => { if (j === -2) return offN; if (j === -1) return offF; if (Dd != null && j >= n - 2) return Dd + (j % 2 === 0 ? offN : offF); return Sd * (j + 1); };
    const PIV = { toe: [0.62, ah], heel: [-0.22, ah] };
    const footPose = (px, ang, piv) => { if (!ang) return { x: px, h: ah, ang: 0 }; const q = PIV[piv], c = Math.cos(ang), s = Math.sin(ang); return { x: px + q[0] - (q[0] * c - q[1] * s), h: q[0] * s + q[1] * c, ang }; };
    const footAt = (q, tau) => {
      let j = Math.floor(tau / h + 1e-9) - 1; if (((j - q) % 2 + 2) % 2) j -= 1; j = Math.max(j, q - 2);
      if (Dd != null) j = Math.min(j, ((n - 1) % 2 === q) ? n - 1 : n - 2);
      const Lj = (j + 1) * h; let sEnd = Lj + 2 * beta * h; if (j < 0) sEnd = Math.max(sEnd, 0.12 * h);
      const nx = j + 2, hasNext = Dd == null || nx <= n - 1, pj = plant(j);
      if (tau < sEnd || !hasNext) {
        let ang = 0;
        if (j >= 0 && tau - Lj < 0.24 * beta * h) ang = p.strike * (1 - sstep(clamp((tau - Lj) / (0.24 * beta * h), 0, 1)));   // the heel strikes, the sole rolls down
        if (hasNext) { const r0 = j === -2 ? 0 : Math.max(0, Lj + (sEnd - Lj) * 0.55); const vv = (tau - r0) / (sEnd - r0); if (vv > 0) ang = p.heel * sstep(clamp(vv, 0, 1)); }   // heel rises over the ball
        return Object.assign(footPose(pj, ang, ang < 0 ? 'heel' : 'toe'), { air: false, j });
      }
      const s1 = (nx + 1) * h, u = clamp((tau - sEnd) / (s1 - sEnd), 0, 1);
      const A0 = footPose(pj, p.heel, 'toe'), A1 = footPose(plant(nx), p.strike, 'heel'); const e = run ? E.ioc(u) : E.ios(u);
      const lift = run ? p.clear * Math.pow(Math.sin(Math.PI * u), 0.7) * (1.2 - 0.75 * u) : p.clear * Math.pow(Math.sin(Math.PI * u), 1.2);
      return { x: lerp(A0.x, A1.x, e), h: lerp(A0.h, A1.h, u) + lift, ang: lerp(p.heel, p.strike, sstep(u)) + (run ? 0.5 * Math.sin(Math.PI * u) : 0), air: true, j };
    };
    const hx = X(tq), fN = footAt(0, tq), fF = footAt(1, tq), Lm = Lg * p.knee;
    let hy = standH;
    if (run) { const r = sstep(clamp(tq / h, 0, 1)) * (Dd != null ? sstep(clamp((tEnd - tq) / h, 0, 1)) : 1); hy = lerp(standH, ah + Lm - p.bob * Math.cos(TAU * (tq / h - beta)), r); }
    [fN, fF].forEach(ft => { if (!ft.air) hy = Math.min(hy, ft.h + Math.sqrt(Math.max(0, Lm * Lm - (ft.x - hx) * (ft.x - hx)))); });
    const rr = ramp(tq), rel = ft => clamp((ft.x - hx) / (Sd / 2), -1.4, 1.4);
    const aN = -p.arm * rel(fN) * rr, aF = -p.arm * rel(fF) * rr;
    const arms = run
      ? { armN: { a: 0.12 * rr + aN, b: lerp(0.25, 1.55, rr) + 0.3 * Math.max(0, aN), hand: rr > 0.3 ? 'fist' : 'relaxed' }, armF: { a: 0.1 * rr + aF, b: lerp(0.18, 1.5, rr) + 0.3 * Math.max(0, aF), hand: rr > 0.3 ? 'fist' : 'relaxed' } }
      : { armN: { a: 0.06 + aN, b: 0.22 + 0.45 * Math.max(0, aN), hand: 'relaxed' }, armF: { a: -0.04 + aF, b: 0.16 + 0.45 * Math.max(0, aF), hand: 'relaxed' } };
    const last = Math.max(fN.j, fF.j); const prints = []; for (let j = -2; j <= (Dd != null ? n - 1 : last + 2); j++) if (j >= last - 6) prints.push(Wx(plant(j)));
    const done = Dd != null && tq >= tEnd;
    return Object.assign({ x: Wx(hx), facing: f, hipH: hy, feet: { N: [Wx(fN.x), fN.h, fN.ang], F: [Wx(fF.x), fF.h, fF.ang] },
      lean: lerp(p.lean * 0.5, p.lean, rr) + (run ? 0.03 : 0.012) * Math.cos(TAU * tq / h) * rr, head: p.head, idleAmt: 0.3,
      walking: { n: Math.min(Math.floor(tq / h), n), u: (tq / h) % 1, stance: fN.air ? (fF.air ? 'none' : 'F') : (fF.air ? 'N' : 'both'), done, foot: Wx(plant(last)), prints, speed: v * sc } }, arms);
  }
  const walk = (id, t, o) => gait(id, t, o, 'walk');
  const runG = (id, t, o) => gait(id, t, o, 'run');
  function crawl(id, t, o) {
    o = o || {}; const f = o.facing || 1, sc = o.scale || 60; const tq = time(id, t, o) - (o.t0 || 0);
    const per = 1.5 / (o.speed || 1); const ph = ((tq / per) % 1 + 1) % 1, q = TAU * ph;
    const leg = s => { const a = 0.06 + 0.26 * Math.sin(q + s); return { a, b: a + 1.48 - 0.22 * Math.max(0, Math.cos(q + s)) }; };
    const arm = s => ({ a: 0.12 + 0.3 * Math.sin(q + s), b: 0.04 + 0.4 * Math.max(0, Math.cos(q + s)), hand: 'side', dir: 0.12, handOpts: { curl: 0.15 } });
    return { ground: 1, x: (o.x0 || 0) + f * 0.55 * (o.speed || 1) * Math.max(0, tq) * sc, facing: f, lean: 1.32 + 0.03 * Math.sin(2 * q), neck: -0.35, head: -0.5,
      legN: leg(0), legF: leg(Math.PI), armN: arm(Math.PI), armF: arm(0) };
  }
  const BUCKLE = [
    [0, { lean: 0.1, neck: 0.06, head: 0.06, legN: { a: 0.06, b: 0.04 }, legF: { a: -0.05, b: 0.02 }, armN: { a: 0.1, b: 0.3 }, armF: { a: -0.05, b: 0.2 } }],
    [0.3, { lean: 0.14, neck: -0.18, head: -0.32, legN: { a: 0.38, b: 0.62 }, legF: { a: -0.12, b: 0.55 }, armN: { a: 0.5, b: 0.5 }, armF: { a: 0.35, b: 0.6 } }],
    [0.65, { lean: 0.32, neck: 0.05, head: 0.1, legN: { a: 0.62, b: 1.65 }, legF: { a: 0.22, b: 1.72 }, armN: { a: 0.45, b: 0.4 }, armF: { a: 0.3, b: 0.4 } }],
    [1, { lean: 0.48, neck: 0.28, head: 0.48, legN: { a: 1.3, b: 2.82 }, legF: { a: 1.24, b: 2.76 }, armN: { a: 0.3, b: 0.3 }, armF: { a: 0.18, b: 0.3 } }],
  ];
  function keyU(ks, u, e) { u = clamp(u, 0, 1); let i = 0; while (i < ks.length - 2 && u > ks[i + 1][0]) i++; const w = (u - ks[i][0]) / (ks[i + 1][0] - ks[i][0]); return blend(ks[i][1], ks[i + 1][1], (e || E.ios)(clamp(w, 0, 1))); }
  function buckle(id, u) { return Object.assign({ ground: 1 }, keyU(BUCKLE, u, E.ioq)); }
  const THROWN = [
    [0, { lean: -0.25, neck: 0.1, head: 0.1, armN: { a: 2.2, b: 0.4, hand: 'splay' }, armF: { a: 1.8, b: 0.3, hand: 'open' }, legN: { a: 0.6, b: 0.4 }, legF: { a: -0.2, b: 0.3 } }],
    [0.45, { lean: -0.7, neck: 0.25, head: 0.3, armN: { a: 2.42, b: 0.3, hand: 'splay' }, armF: { a: 1.72, b: 0.18, hand: 'open' }, legN: { a: 2.1, b: 0.6 }, legF: { a: 1.0, b: 1.5 } }],
    [0.8, { lean: 0.25, neck: 0.3, head: 0.5, armN: { a: 1.4, b: 1.6, hand: 'fist' }, armF: { a: 1.2, b: 1.8, hand: 'fist' }, legN: { a: 1.6, b: 2.2 }, legF: { a: 1.3, b: 2.0 } }],
    [1, { lean: 0.05, neck: 0.15, head: 0.35, armN: { a: 2.55, b: 0.45, hand: 'flat' }, armF: { a: 2.2, b: 0.7, hand: 'relaxed' }, legN: { a: 0.3, b: 0.6 }, legF: { a: -0.1, b: 0.25 } }],
  ];
  function thrown(id, u, o) {
    o = o || {}; u = clamp(u, 0, 1); const f = o.facing || 1; const from = o.from || [0, 0], to = o.to || [from[0] - 600 * f, from[1] + 100];
    const peak = o.peak == null ? 220 : o.peak; const spin = o.spin == null ? -1.45 * f : o.spin;
    return Object.assign({ anchor: 'hip', facing: f, x: lerp(from[0], to[0], u), y: lerp(from[1], to[1], u) - 4 * peak * u * (1 - u), rot: spin * E.oc(u) }, keyU(THROWN, u));
  }
  // the stumble (running out of the kitchen, down the steps): the toe catches, a pitch forward, a lunge, a hand to the floor, recover
  const STUMBLE = [
    [0, { lean: 0.3, neck: 0.0, head: 0.0, legN: { a: 0.6, b: 0.45, foot: -0.1 }, legF: { a: -0.42, b: 1.0, foot: 0.9 }, armN: { a: -0.45, b: 1.5, hand: 'fist' }, armF: { a: 0.55, b: 1.45, hand: 'fist' } }],
    [0.22, { lean: 0.72, neck: -0.25, head: -0.4, legN: { a: 0.95, b: 0.55, foot: -0.15 }, legF: { a: -0.62, b: 0.25, foot: 1.2 }, armN: { a: 1.55, b: 0.25, hand: 'open', handOpts: { spread: 0.2 } }, armF: { a: 1.2, b: 0.45, hand: 'open' } }],
    [0.45, { lean: 1.0, neck: -0.2, head: -0.35, legN: { a: 1.4, b: 1.95, foot: 0.05 }, legF: { a: -0.3, b: 0.55, foot: 1.0 }, armN: { a: 0.85, b: 0.05, hand: 'open', handOpts: { spread: 0.22 } }, armF: { a: 0.65, b: 0.15, hand: 'open' } }],
    [0.66, { lean: 0.86, neck: -0.1, head: -0.2, legN: { a: 1.2, b: 1.75, foot: 0 }, legF: { a: 0.45, b: 1.55, foot: 0.4 }, armN: { a: 0.45, b: -0.08, hand: 'flat' }, armF: { a: 0.6, b: 0.3, hand: 'open' } }],
    [1, { lean: 0.32, neck: 0.0, head: 0.0, legN: { a: 0.5, b: 0.5, foot: 0 }, legF: { a: -0.35, b: 0.9, foot: 0.8 }, armN: { a: -0.4, b: 1.45, hand: 'fist' }, armF: { a: 0.5, b: 1.4, hand: 'fist' } }],
  ];
  function stumble(id, u, o) {
    o = o || {}; const f = o.facing || 1, sc = o.scale || 60; const d = o.dist == null ? 3.4 : o.dist / sc; u = clamp(u, 0, 1);
    return Object.assign({ ground: 1, facing: f, x: (o.x0 || 0) + f * d * sc * (0.55 * u + 0.45 * E.oc(u)) }, keyU(STUMBLE, u, E.ios));
  }
  // a log roll (stop, drop, roll): lying along x, turning over about the long axis; at each half-turn the paper flips through a sliver
  function roll(id, t, o) {
    o = o || {}; const sc = o.scale || 60; const tq = Math.max(0, time(id, t, o) - (o.t0 || 0)); const rate = o.rate || 1.4;
    const ph = tq * rate, k = Math.floor(ph), w = ph - k; const back = (k % 2 === 0) === (w < 0.5);
    const headLeft = (o.headTo || 'left') === 'left';
    const tuck = { legN: { a: 0.32, b: 0.62, foot: 0.4 }, legF: { a: 0.12, b: 0.35, foot: 0.5 }, armN: { a: 0.6, b: 2.3, fk: 0.8, hand: 'relaxed' }, armF: { a: 0.5, b: 2.4, fk: 0.8, hand: 'relaxed' } };
    const pose = Object.assign({ ground: 'rest', lie: back ? 'back' : 'face', lean: 0.12, neck: 0.15, head: 0.25, roll: 0.5 }, tuck);
    const sq = Math.max(0.2, Math.abs(Math.cos(Math.PI * w)));
    return { pose, headTo: o.headTo || 'left', squash: sq, x: (o.x0 || 0) + (headLeft ? -1 : 1) * (o.dx == null ? 0.18 : o.dx) * sc * (k + sstep(w)), rolling: { k, w, back, depth: k + w } };
  }

  // ======================================================================== grounding, seats, skeleton
  function armPts(R, g) { if (!g || g.to || g.a == null) return []; const E1 = addv(R.S0, [Math.sin(g.a), Math.cos(g.a)], R.len.upper); const W1 = addv(E1, [Math.sin(g.a + g.b), Math.cos(g.a + g.b)], R.len.fore); return [[E1, 0.19], [W1, 0.16]]; }
  // y (hip anchor) that puts the lowest contact of the body on floorY
  function groundY(id, pose, floorY) {
    const R = FIG.skeleton(id, Object.assign({}, pose, { anchor: 'hip', y: 0 })); const k = R.k, hK = R.D.hipK;
    const foot = (A, g) => { const fa = g.foot != null ? g.foot : (g.a - g.b) * 0.3; return addv(A, [Math.cos(fa), Math.sin(fa)], 0.9 * k); };
    const pts = [[R.aN, 0.36 * k], [R.aF, 0.36 * k], [foot(R.aN, R.legN), 0.18], [foot(R.aF, R.legF), 0.18], [R.kN, 0.27], [R.kF, 0.27], [R.H, 0.44 * hK],
      [R.T(-0.5, 0.2), 0.02], [R.T(-0.55, 1.2), 0.02], [R.T(-0.48, 2.0), 0.02], [R.T(0.45, 1.3), 0.02], [R.hc, 0.5 * k], [R.S0, 0.3]].concat(armPts(R, pose.armN), armPts(R, pose.armF));
    let my = -1e9; pts.forEach(([p, r]) => { const w = R.toPx(p); my = Math.max(my, w[1] + r * R.sc); });
    return floorY - my;
  }
  // the seat (buttock and coat hem) on the floor
  const HEMS = { jacket: [[-0.7, -0.62], [0.52, -0.6]], overshirt: [[-0.66, -0.42], [0.42, -0.4]], raincoat: [[-0.64, -0.55], [0.5, -0.5]], blazer: [[-0.56, -0.28], [0.48, -0.22]], shirt: [[-0.52, -0.16], [0.44, -0.12]] };
  function seatY(id, pose, floorY) {
    const R = FIG.skeleton(id, Object.assign({}, pose, { anchor: 'hip', y: 0 })); const hK = R.D.hipK; let my = R.toPx(R.H)[1] + 0.44 * hK * R.sc;
    [[-0.56 * hK, -0.22], [-0.3, -0.36], [0.2, -0.26]].concat(HEMS[R.D.clothes] || []).forEach(q => { my = Math.max(my, R.toPx(R.T(q[0], q[1]))[1]); });
    return floorY - my + 0.06 * R.sc;
  }
  // lower convex hull (y down): the points a body can rest on
  function bottomHull(pts) {
    const q = pts.slice().sort((a, b) => a[0] - b[0] || b[1] - a[1]); const h = [];
    const cr = (o, a, b) => (a[0] - o[0]) * (-(b[1]) + o[1]) - (-(a[1]) + o[1]) * (b[0] - o[0]);
    q.forEach(p => { while (h.length >= 2 && cr(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop(); h.push(p); });
    return h;
  }
  // settle a lying body: rock it onto the hull edge under its centre of mass (two contacts), then drop it onto the floor
  function restGround(id, pose, floorY) {
    const base = Object.assign({}, pose, { anchor: 'hip', y: 0 });
    ['armN', 'armF', 'legN', 'legF'].forEach(q => { const g = base[q]; if (g && (g.rest || g.to || g.toU)) base[q] = q[0] === 'a' ? { a: 0.05, b: 0.05, hand: 'none' } : { a: 0.06, b: 0.12, foot: g.foot }; });
    const F0 = FIG.profile(id, base); const pts = []; F0.shape.polys.forEach(pl => { for (let i = 0; i < pl.length; i += 2) pts.push(pl[i]); });
    const J = F0.joints, com = [J.hip[0] * 0.42 + J.chest[0] * 0.42 + J.head[0] * 0.16, 0];
    const hull = bottomHull(pts); let phi = 0;
    for (let i = 0; i < hull.length - 1; i++) { const a = hull[i], b = hull[i + 1]; if (a[0] <= com[0] && b[0] >= com[0] && b[0] - a[0] > 1e-3) { phi = -Math.atan2(b[1] - a[1], b[0] - a[0]); break; } }
    phi = clamp(phi, -0.55, 0.55); const c = Math.cos(phi), s = Math.sin(phi), hx = J.hip[0], hy = J.hip[1];
    let my = -1e9; pts.forEach(p => { const dx = p[0] - hx, dy = p[1] - hy; my = Math.max(my, hy + dx * s + dy * c); });
    return { rot: (pose.rot || 0) + phi, y: floorY - my + 0.03 * pose.scale };
  }
  // resolve a spec into a profile pose (no holds built yet)
  function resolve(id, spec) {
    spec = spec || {}; const sc = spec.scale || 60, f = spec.facing || 1;
    const pers = persona(id, spec.mood);
    const t = spec.t == null ? null : time(id, spec.t, spec);
    const pn = spec.pose || 'stand';
    let pose = typeof pn === 'string' ? (POSES[pn] ? POSES[pn](id, spec) : (warn('RIG: no pose ' + pn), {})) : Object.assign({}, pn);
    let holds = Object.assign({}, pose.hold || {}, spec.hold || {}); delete pose.hold;
    if (spec.gesture) pose = merge(pose, (GESTURES[spec.gesture] || (() => (warn('RIG: no gesture ' + spec.gesture), {})))(id, spec));
    if (spec.mood === 'drained' && !spec.feet) pose = merge(pose, DRAINED);
    if (t != null && spec.idle !== false) {
      const d = idle(id, t, spec.mood), amt = spec.idleAmt == null ? 1 : spec.idleAmt;
      ['lean', 'neck', 'head'].forEach(q => { pose[q] = (pose[q] == null ? (FIG.CHAR[id].idle[q] || 0) : pose[q]) + d[q] * amt; });
      ['armN', 'armF'].forEach(q => { if (pose[q] && pose[q].a != null && !pose[q].to && !pose[q].rest) pose[q] = Object.assign({}, pose[q], { a: pose[q].a + d[q].a * amt, b: (pose[q].b || 0) + d[q].b * amt }); });
    }
    pose = merge(pose, POSE_KEYS.reduce((o, q) => { if (spec[q] !== undefined) o[q] = spec[q]; return o; }, {}));
    if (spec.leanAdd) pose.lean = (pose.lean == null ? FIG.CHAR[id].idle.lean : pose.lean) + spec.leanAdd;
    if (spec.headAdd) pose.head = (pose.head == null ? FIG.CHAR[id].idle.head : pose.head) + spec.headAdd;
    if (spec.neckAdd) pose.neck = (pose.neck == null ? FIG.CHAR[id].idle.neck : pose.neck) + spec.neckAdd;
    if (t != null && spec.breath !== false) {
      const px = typeof spec.breath === 'number' ? spec.breath : pers.breathPx;
      pose.breath = (pose.breath || 0) + px / sc * (0.5 - 0.5 * Math.cos(TAU * pers.breathHz * t + pers.phase)) * (pose.lie ? 0.6 : 1);
    }
    let facing = f;
    if (pose.lie) {   // lying: rotate the figure flat; headTo picks the end the head is at
      const lie = pose.lie; const headLeft = spec.headTo ? spec.headTo === 'left' : (lie === 'back' ? f > 0 : f < 0);
      if (lie === 'back') { facing = headLeft ? 1 : -1; pose.rot = (spec.rot || 0) - facing * Math.PI / 2; }
      else if (lie === 'face') { facing = headLeft ? -1 : 1; pose.rot = (spec.rot || 0) + facing * Math.PI / 2; }
      else { facing = headLeft ? -1 : 1; pose.rot = (spec.rot || 0) + facing * 1.15; }
    }
    pose.x = spec.x == null ? 0 : spec.x; pose.facing = facing; pose.scale = sc;
    const floorY = spec.y == null ? 0 : spec.y;
    const ground = pose.ground || spec.ground; const isSeat = pose.seat; delete pose.seat; delete pose.ground; delete pose.lie;
    if (spec.anchor) { pose.anchor = spec.anchor; pose.y = spec.y; }
    else if (pose.feet) {    // a gait: hip height and feet given in floor terms
      pose.anchor = 'hip'; pose.y = floorY - (pose.hipH || 0) * sc;
      ['N', 'F'].forEach(s => { const ft = pose.feet[s]; if (ft) pose['leg' + s] = Object.assign({}, pose['leg' + s], { to: [ft[0], floorY - ft[1] * sc], foot: ft[2], knee: 1 }); });
    }
    else if (isSeat && spec.seat) {
      const D = FIG.CHAR[id]; pose.anchor = 'hip'; pose.x = spec.seat[0]; pose.y = spec.seat[1] - 0.44 * D.hipK * sc;
      if (spec.floor != null) {
        const k = D.heightK, reach = 1.85 * D.legK * k * sc;
        const soleY = spec.floor - 0.36 * k * sc;
        pose.legN = Object.assign({}, pose.legN, { to: [pose.x + facing * reach * Math.sin(pose.legN.a) * 0.98, soleY], knee: 1 });
        pose.legF = Object.assign({}, pose.legF, { to: [pose.x + facing * reach * Math.sin(pose.legF.a) * (pose.view34 ? 0.98 : 0.92) + (pose.view34 ? facing * 0.26 * sc * pose.view34 : 0), soleY], knee: 1 });
      }
    }
    else if (ground === 'seat') {
      pose.anchor = 'hip';
      if (spec.wall != null) {   // the back against a wall / counter behind: hip out from it, lean found so the shoulder blades touch
        const dW = spec.wallGap == null ? 0.95 : spec.wallGap; pose.x = spec.wall + facing * dW * sc; const want = -dW;
        let lo = -0.7, hi = 0.5; const back = L => { const ca = Math.cos(L), sa = Math.sin(L); return Math.min(-0.5 * ca + 1.92 * sa, -0.42 * ca + 2.22 * sa, -0.44 * ca + 0.6 * sa); };
        for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (back(m) > want) hi = m; else lo = m; } pose.lean = (lo + hi) / 2;
      }
      pose.y = seatY(id, pose, floorY);
    }
    else if (ground === 'rest') { pose.anchor = 'hip'; pose.y = 0; const r = restGround(id, pose, floorY); pose.rot = r.rot; pose.y = r.y; }
    else if (ground || isSeat) { pose.anchor = 'hip'; pose.y = groundY(id, pose, floorY); }
    else { pose.anchor = pose.anchor || 'feet'; pose.y = floorY; }
    // limbs laid on the floor (rest) and unit-space IK targets (toU), resolved now that the body is placed
    const lim = ['armN', 'armF', 'legN', 'legF'];
    if (lim.some(q => pose[q] && (pose[q].toU || pose[q].rest))) {
      const R0 = FIG.skeleton(id, pose);
      lim.forEach(q => {
        const g = pose[q]; if (!g || !(g.toU || g.rest)) return; let to;
        if (g.rest) { const j = q === 'armN' ? R0.S0 : q === 'armF' ? R0.S0F : q === 'legN' ? R0.H : R0.HF; const w = R0.toPx(j); to = [w[0] + facing * g.rest[0] * sc, floorY - g.rest[1] * sc]; }
        else to = R0.toPx(typeof g.toU === 'function' ? g.toU(R0) : g.toU);
        pose[q] = Object.assign({}, g, { to, toU: undefined, rest: undefined });
      });
    }
    // elbow preferences by name -> the kit's IK side
    if ((pose.armN && typeof pose.armN.elbow === 'string' && pose.armN.to) || (pose.armF && typeof pose.armF.elbow === 'string' && pose.armF.to)) {
      const R1 = FIG.skeleton(id, pose);
      ['armN', 'armF'].forEach(q => { const g = pose[q]; if (!g || typeof g.elbow !== 'string' || !g.to) return; const sk = q === 'armF' ? Object.assign({}, R1, { S0: R1.S0F }) : R1; pose[q] = Object.assign({}, g, { elbow: elbowFor(sk, R1.toU(g.to), g.elbow, g.uk, g.fk) }); });
    }
    return { pose, holds, t, pers, floorY };
  }
  function skeleton(id, spec) { const r = resolve(id, spec); r.sk = FIG.skeleton(id, r.pose); return r; }

  // ======================================================================== holds
  // elbow side: prefer 'down' | 'up' | 'forward' | 'back' | 'downfwd' | 1 | -1
  function elbowFor(sk, tgtU, pref, uk, fk) {
    if (pref === 1 || pref === -1) return pref;
    const U = sk.len.upper * (uk || 1), Fo = sk.len.fore * (fk || 1);
    const a = FIG.ik2(sk.S0, tgtU, U, Fo, 1), b = FIG.ik2(sk.S0, tgtU, U, Fo, -1);
    const sc = e => pref === 'up' ? -e[1] : pref === 'forward' ? e[0] : pref === 'back' ? -e[0] : pref === 'downfwd' ? e[0] + e[1] : pref === 'downback' ? e[1] - e[0] : e[1];
    return sc(a.E) >= sc(b.E) ? 1 : -1;
  }
  const jitter = (h, t, salt) => (h.tremble && t != null) ? [h.tremble * noise(t, 9.5, salt), h.tremble * 0.8 * noise(t, 11.3, salt + 5)] : [0, 0];
  const atU = (sk, h, defU, t, salt) => { const j = jitter(h, t, salt); if (h.at && Array.isArray(h.at)) { const w = [h.at[0] + j[0], h.at[1] + j[1]]; return sk.toU(w); } const w = sk.toPx(defU); return sk.toU([w[0] + j[0], w[1] + j[1]]); };
  // context handed to builders: unit-space arm data
  function hctx(F, side) {
    const R = F.rig, A = F.arms[side]; const Wu = R.toU(A.W), Eu = R.toU(A.E); const hL = R.len.hand, ang = A.ang;
    const hmU = frameM(Wu, ang, hL); const fd = norm(Wu[0] - Eu[0], Wu[1] - Eu[1]);
    return { F, R, side, A, Wu, Eu, hL, ang, hmU, fd, M: F.M, sc: F.scale, k: R.k, L: p => ap(hmU, p), toW: p => ap(F.M, p) };
  }
  // paint in unit space: everything inside fn is drawn in figure units (1 = head), facing, squash and rot included
  function inUnits(g, M, fn) { g.save(); g.transform(M[0], M[1], M[2], M[3], M[4], M[5]); fn(g); g.restore(); }
  const lightDir = (light, p) => !light ? [0.6, -0.8] : light.dx != null ? norm(light.dx, light.dy) : norm(light.x - p[0], light.y - p[1]);
  function glint(g, em, p, r, col, a) { g.save(); g.globalAlpha = a == null ? 0.95 : a; g.fillStyle = col || C.cardPaper; g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fill(); g.restore(); if (em) { em.save(); em.fillStyle = col || C.cardPaper; em.globalAlpha = 0.8; em.beginPath(); em.arc(p[0], p[1], r * 3, 0, 7); em.fill(); em.restore(); } }
  function screenEdge(g, o, a, b, sc, k) {
    g.save(); g.strokeStyle = C.phoneWhite; g.lineCap = 'round'; g.lineWidth = Math.max(1.5, sc * (k || 0.016)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore();
    if (o.em) { o.em.save(); o.em.strokeStyle = C.phoneWhite; o.em.lineWidth = Math.max(2, sc * 0.05); o.em.globalAlpha = 0.7; o.em.beginPath(); o.em.moveTo(a[0], a[1]); o.em.lineTo(b[0], b[1]); o.em.stroke(); o.em.restore(); }
  }

  // ---- the wine glass (shared by the held glass and RIG.prop.glass). G = glass-local -> world (origin mid-stem, y down, 1 = head)
  const GLASS = (() => { const s = S(); s.M(-0.18, -0.6).L(0.18, -0.6).C(0.19, -0.36, 0.14, -0.17, 0.03, -0.12).L(0.03, 0.12).L(0.145, 0.18).L(0.145, 0.205).L(-0.145, 0.205).L(-0.145, 0.18).L(-0.03, 0.12).L(-0.03, -0.12).C(-0.14, -0.17, -0.19, -0.36, -0.18, -0.6).Z(); return s; })();
  function paintGlass(g, G, o) {
    o = o || {}; const sh = GLASS.transform(G); const p = sh.path(0.3, o.seed || 5); const sc = Math.hypot(G[0], G[1]);
    g.fillStyle = o.fill === false ? C.ink : (o.ink || C.ink); g.fill(p);
    if (!o.empty) {
      const lvl = -0.12 - clamp(o.level == null ? 0.55 : o.level, 0, 1) * 0.4; const s0 = ap(G, [0, lvl]);
      g.save(); g.clip(p);
      // the surface stays level in the world however the glass tips
      g.fillStyle = C.wine; g.fillRect(s0[0] - sc, s0[1], 2 * sc, sc * 1.5);
      g.fillStyle = C.blood; const s1 = ap(G, [0, lvl + (-0.12 - lvl) * 0.55]); g.fillRect(s0[0] - sc, Math.max(s0[1], s1[1]), 2 * sc, sc * 1.5);
      g.fillStyle = mix(C.wine, o.lightColor || C.tungsten, 0.45); g.fillRect(s0[0] - sc, s0[1], 2 * sc, Math.max(1.5, sc * 0.022));
      g.restore();
    }
    if (o.light) O.silhouette(g, p, { noFill: true, light: o.light, rimColor: o.rimColor || C.tungstenMid, rimW: Math.max(1.2, sc * 0.02), at: ap(G, [0, -0.36]), bbox: sh.bbox() });
    const ld = lightDir(o.light, ap(G, [0, -0.36])); const s = ld[0] * Math.sign(G[0] || 1) >= 0 ? 1 : -1;
    const a = ap(G, [s * 0.125, -0.54]), b = ap(G, [s * 0.14, -0.38]);
    g.save(); g.strokeStyle = C.cardPaper; g.globalAlpha = 0.9; g.lineCap = 'round'; g.lineWidth = Math.max(1.4, sc * 0.022); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore();
    if (o.em) { o.em.save(); o.em.fillStyle = o.lightColor || C.tungsten; o.em.globalAlpha = 0.7; o.em.beginPath(); o.em.arc((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, sc * 0.08, 0, 7); o.em.fill(); o.em.restore(); }
    if (o.lip) { const l0 = ap(G, [-0.16, -0.6]), l1 = ap(G, [-0.07, -0.605]); g.save(); g.strokeStyle = C.tKayLip; g.lineCap = 'round'; g.lineWidth = Math.max(2, sc * 0.035); g.beginPath(); g.moveTo(l0[0], l0[1]); g.lineTo(l1[0], l1[1]); g.stroke(); g.restore(); }
    return sh;
  }
  // a phone slab in unit space along axis ax from centre PC: returns paint fn
  function slabPainter(c, PC, ax, Lh, Th, frontSign, h) {
    const nrm = [-ax[1] * frontSign, ax[0] * frontSign]; const q = (s, u) => [PC[0] + ax[0] * s + nrm[0] * u, PC[1] + ax[1] * s + nrm[1] * u];
    const slab = S().poly([q(-Lh / 2, -Th / 2), q(Lh / 2, -Th / 2), q(Lh / 2, Th / 2), q(-Lh / 2, Th / 2)]); const M = c.M, sc = c.sc;
    return { q, paint: (g, o) => { g.fillStyle = h.color || mix(C.ink, C.rainSlate, 0.45); g.fill(slab.transform(M).path(0.3, 3)); if (h.lit !== false) screenEdge(g, o, ap(M, q(-Lh / 2 + 0.03, Th / 2)), ap(M, q(Lh / 2 - 0.03, Th / 2)), sc); } };
  }

  const HOLDS = {
    // ---------------- the phone at the ear (style frame 02) ----------------
    phone: {
      plan(sk, h) {
        const hm = sk.headM, Pp = q => ap(hm, q); const pTop = Pp([-0.2, -0.08]), pBot = Pp([0.2, 0.56]); const ax = norm(pBot[0] - pTop[0], pBot[1] - pTop[1]);
        const Wt = addv(pBot, ax, 0.12);
        return { arm: { to: sk.toPx(Wt), aim: sk.toPx(Pp([0.0, 0.24])), hand: 'none', elbow: elbowFor(sk, Wt, h.elbow || 'downfwd') }, pTop, pBot };
      },
      build(c, pl, h) {
        const { pTop, pBot } = pl, pLen = dist(pTop, pBot), pAng = Math.atan2(pBot[1] - pTop[1], pBot[0] - pTop[0]); const pC = [(pTop[0] + pBot[0]) / 2, (pTop[1] + pBot[1]) / 2];
        const pM = frameM(pC, pAng, 1), Pq = (x, y) => ap(pM, [x, y]); const PW = 0.15, up = -1, FY = up * PW / 2, RY = -up * PW / 2, X0 = -pLen / 2, X1 = pLen / 2;
        const slab = S().rect(X0, -PW / 2, pLen, PW).transform(pM);
        const hs = S();
        hs.add(smooth([[X0 + pLen * 0.36, RY - up * 0.03], [X0 + pLen * 0.34, FY + up * 0.035], [X1 + 0.02, FY + up * 0.05], [X1 + 0.16, FY + up * 0.02], [X1 + 0.18, RY - up * 0.01], [X1 + 0.02, RY - up * 0.06]].map(q => Pq(q[0], q[1])), true));
        [0.3, 0.44, 0.58, 0.72].forEach((u, i) => { const x = X0 + pLen * u; const a = Pq(x, RY + up * 0.02), b = Pq(x - 0.05, RY - up * (0.07 + 0.012 * (i % 2))); hs.capsule(a[0], a[1], 0.034, b[0], b[1], 0.03); });
        { const a = Pq(X1 - pLen * 0.1, FY + up * 0.02), b = Pq(X0 + pLen * 0.42, FY + up * 0.045); hs.capsule(a[0], a[1], 0.042, b[0], b[1], 0.032); }
        { const a = Pq(X1 + 0.1, (FY + RY) / 2), b = c.Wu; hs.capsule(a[0], a[1], 0.12, b[0], b[1], 0.13); }
        const far = c.side === 'F';
        const M = c.M, sc = c.sc;
        const props = far ? [] : [(g, o) => {
          const headP = c.F.parts.head.path(0.6, 11);
          if (h.glow !== false) {
            // the screen's light on cheek and ear: angular bands running with the slab, two hard steps, kept to the head
            const band = (ef, er, et) => S().poly([Pq(X0 - et, RY - up * er), Pq(X0 - et, FY + up * ef * 0.6), Pq(X1 * 0.2, FY + up * ef), Pq(X1, FY + up * ef * 1.15), Pq(X1, RY - up * er)]).transform(M);
            g.save(); g.clip(headP);
            g.fillStyle = rgba(C.phoneWhite, 0.42); g.fill(band(0.13, 0.07, 0.07).path(1.2, 5));
            g.fillStyle = rgba(C.phoneWhite, 0.92); g.fill(band(0.05, 0.008, 0.012).path(0.8, 6));
            const ear = ap(c.R.headM, [-0.27, 0.06]); const eA = S().ellipse(ear[0], ear[1], 0.074, 0.12, 0.3).transform(M), eB = S().ellipse(ear[0] - 0.035, ear[1] + 0.02, 0.06, 0.1, 0.3).transform(M);
            const cres = new Path2D(); cres.addPath(eA.path(0.4, 8)); g.clip(cres); const pE = new Path2D(); pE.addPath(eA.path(0.4, 8)); pE.addPath(eB.path(0.4, 9)); g.fillStyle = C.phoneWhite; g.fill(pE, 'evenodd');
            g.restore();
          }
          g.fillStyle = h.color || mix(C.ink, C.rainSlate, 0.45); g.fill(slab.transform(M).path(0.4, 3));
          if (h.lit !== false) screenEdge(g, o, ap(M, Pq(X0 + 0.03, FY)), ap(M, Pq(X1 - 0.03, FY)), sc, 0.0145);
        }];
        return { ink: far ? hs : null, front: far ? null : hs, props, hand: hs.transform(M), tip: ap(M, pC), screen: ap(M, Pq(0, FY)) };
      },
    },
    // ---------------- the phone held up in front, screen to the face ----------------
    phoneLook: {
      plan(sk, h, side, t) {
        const W0 = atU(sk, h, addv(sk.S0, [0.95, 0.28]), t, 31); const dir = h.dir == null ? -1.0 : h.dir;
        return { arm: { to: sk.toPx(W0), dir, hand: 'none', elbow: elbowFor(sk, W0, h.elbow || 'down') }, look: true };
      },
      build(c, pl, h) {
        const hs = hand('hold').transform(c.hmU);
        const PC = c.L([0.62, -0.18]); const eye = ap(c.R.headM, [0.3, -0.06]); const n = norm(eye[0] - PC[0], eye[1] - PC[1]); const ax = [-n[1], n[0]];
        const L = 0.62, T = 0.06; const q = (s, u) => [PC[0] + ax[0] * s + n[0] * u, PC[1] + ax[1] * s + n[1] * u];
        const slab = S().poly([q(-L / 2, -T / 2), q(L / 2, -T / 2), q(L / 2, T / 2), q(-L / 2, T / 2)]);
        const tap = clamp(h.tap || 0, 0, 1); const tb = c.L([0.25, -0.2]), tt = q(lerp(-0.05, 0.08, tap), T / 2 + lerp(0.08, 0.025, tap));
        const thumb = S().capsule(tb[0], tb[1], 0.075, tt[0], tt[1], 0.05);
        const M = c.M, sc = c.sc;
        return { ink: hs, front: thumb, hand: hs.transform(M), tip: ap(M, PC), screen: ap(M, q(0, T / 2)), faceLight: { from: ap(M, q(0, T / 2 + 0.02)), color: C.phoneWhite, lit: h.glow === false ? 0 : 1 },
          props: [(g, o) => {
            g.fillStyle = h.color || mix(C.ink, C.rainSlate, 0.45); g.fill(slab.transform(M).path(0.3, 3));
            const a = ap(M, q(-L / 2 + 0.03, T / 2)), b = ap(M, q(L / 2 - 0.03, T / 2));
            g.save(); g.strokeStyle = C.phoneWhite; g.lineCap = 'round'; g.lineWidth = Math.max(1.5, sc * 0.018); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
            // the screen's light thrown up at the face: one faint flat wedge
            if (h.glow !== false) { const e = ap(M, eye); g.globalAlpha = 0.07; g.fillStyle = C.phoneWhite; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(e[0] + (b[0] - a[0]) * 0.6, e[1] + (b[1] - a[1]) * 0.6); g.lineTo(e[0] - (b[0] - a[0]) * 0.4, e[1] - (b[1] - a[1]) * 0.4); g.closePath(); g.fill(); }
            g.restore();
            if (o.em) { o.em.save(); o.em.strokeStyle = C.phoneWhite; o.em.globalAlpha = 0.8; o.em.lineWidth = sc * 0.06; o.em.beginPath(); o.em.moveTo(a[0], a[1]); o.em.lineTo(b[0], b[1]); o.em.stroke(); o.em.restore(); }
          }] };
      },
    },
    // ---------------- the phone lowered at the hip, dangling from slack fingers, screen still lit ----------------
    phoneLow: {
      plan(sk, h, side, t) { const W0 = atU(sk, h, addv(sk.S0, [0.3, 2.45]), t, 33); return { arm: { to: sk.toPx(W0), dir: h.dir == null ? 1.25 : h.dir, hand: 'pinch', elbow: elbowFor(sk, W0, h.elbow || 'downfwd') } }; },
      build(c, pl, h) {
        const PC = c.L([0.72, 0.16]); const ax = norm(c.fd[0] * 0.3 + Math.sin(c.ang), Math.cos(c.ang) * 0.3 + 0.95); const sp = slabPainter(c, PC, ax, 0.58, 0.06, 1, h);
        return { tip: ap(c.M, PC), screen: ap(c.M, sp.q(0, 0.03)), props: [(g, o) => { sp.paint(g, o); if (h.glow !== false) { const s = ap(c.M, sp.q(0, 0.03)); g.save(); g.globalAlpha = 0.06; g.fillStyle = C.phoneWhite; g.beginPath(); g.ellipse(s[0], s[1] + c.sc * 0.5, c.sc * 0.35, c.sc * 0.55, 0, 0, 7); g.fill(); g.restore(); } }] };
      },
    },
    // ---------------- the phone held out at arm's length to someone, screen toward them ----------------
    phoneOffer: {
      plan(sk, h, side, t) { const W0 = atU(sk, h, addv(sk.S0, [1.9, 0.55]), t, 35); return { arm: { to: sk.toPx(W0), dir: h.dir == null ? -0.55 : h.dir, hand: 'hold', elbow: elbowFor(sk, W0, h.elbow || 'down') } }; },
      build(c, pl, h) {
        const PC = c.L([0.42, -0.42]); const sp = slabPainter(c, PC, [0, -1], 0.6, 0.065, -1, h); const tb = c.L([0.2, -0.2]), tt = sp.q(0.12, -0.05);
        return { front: S().capsule(tb[0], tb[1], 0.07, tt[0], tt[1], 0.05), tip: ap(c.M, PC), screen: ap(c.M, sp.q(0, 0.035)), props: [(g, o) => sp.paint(g, o)] };
      },
    },
    // ---------------- the lighter: fist, the lighter standing out of it, thumb on the wheel (style frame 11) ----------------
    lighter: {
      plan(sk, h, side, t) {
        const fc = atU(sk, h, addv(sk.S0, [1.45, -0.25]), t, 41);
        const eg = addv(sk.S0, [0.35, 1.0]); const dv = norm(fc[0] - eg[0], fc[1] - eg[1]);
        const W0 = [fc[0] - dv[0] * 0.2, fc[1] - dv[1] * 0.2 - 0.04];
        return { arm: { to: sk.toPx(W0), hand: 'none', elbow: elbowFor(sk, W0, h.elbow || 'down') }, fc };
      },
      build(c, pl, h, t) {
        const fd = c.fd; const fc = [c.Wu[0] + fd[0] * 0.2, c.Wu[1] + fd[1] * 0.2 + 0.04];
        const ink = S();
        ink.add(smooth([[0.24, -0.14], [0.05, -0.19], [-0.16, -0.16], [-0.22, 0.02], [-0.12, 0.2], [0.1, 0.22], [0.27, 0.1]].map(p => [fc[0] + p[0], fc[1] + p[1]]), true));
        const LW = 0.19, LH = 0.52, lx = fc[0] + 0.08, ly = fc[1] - 0.12;
        ink.rect(lx - LW / 2, ly - LH, LW, LH + 0.1).rect(lx - LW / 2 + 0.012, ly - LH - 0.08, LW - 0.024, 0.1).circle(lx - LW / 2 + 0.045, ly - LH - 0.075, 0.05);
        const s = clamp(h.strike || 0, 0, 1);
        const tk = [lx - LW / 2 - 0.04 + 0.02 * s, ly - LH * 0.45 + 0.06 * s];
        const tip = [lerp(lx - LW / 2, lx - LW / 2 + 0.13, s), lerp(ly - LH - 0.07, ly - LH + 0.02, E.ios(s))];
        ink.capsule(fc[0] - 0.1, fc[1] - 0.12, 0.08, tk[0], tk[1], 0.062).capsule(tk[0], tk[1], 0.062, tip[0], tip[1], 0.058);
        const M = c.M, sc = c.sc; const wheel = ap(M, [lx - LW / 2 + 0.045, ly - LH - 0.075]);
        return { ink, hand: ink.transform(M), tip: ap(M, [lx, ly - LH - 0.09]), props: [(g, o) => {
          // the glint: two pixels, the brightest point in the frame
          const gp = ap(M, [lx + LW / 2 - 0.06, ly - LH - 0.085]); const gx = Math.round(gp[0]), gy = Math.round(gp[1]); const k = Math.max(1, sc / 76);
          g.save(); g.globalCompositeOperation = 'screen';
          g.fillStyle = rgba(C.lighterCream, 0.22); g.fillRect(gx - 9 * k, gy + 0.5, 20 * k, 1); g.fillRect(gx + 0.5, gy - 9 * k, 1, 20 * k);
          g.fillStyle = rgba(C.lighterCream, 0.6); g.fillRect(gx - 3 * k, gy + 0.5, 8 * k, 1); g.fillRect(gx + 0.5, gy - 3 * k, 1, 8 * k);
          g.restore(); g.fillStyle = '#FFFFFF'; g.fillRect(gx, gy, 2, 2);
          if (o.em) { o.em.fillStyle = C.lighterCream; o.em.beginPath(); o.em.arc(gx + 1, gy + 1, 15 * k, 0, 7); o.em.fill(); }
          const spark = h.spark != null ? h.spark : (s > 0.45 && s < 0.85);
          if (spark) {
            const r = O.rng('spark' + Math.floor((t || 0) * 24)); g.save();
            for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.2, d = (0.05 + r() * 0.22) * sc, sx = wheel[0] + Math.cos(a) * d, sy = wheel[1] + Math.sin(a) * d, z = 1 + r() * 2.2 * k;
              g.fillStyle = r() < 0.5 ? C.fireCore : C.lighterCream; g.beginPath(); g.moveTo(sx, sy - z); g.lineTo(sx + z * 0.7, sy + z * 0.6); g.lineTo(sx - z * 0.7, sy + z * 0.6); g.fill(); }
            g.restore(); if (o.em) { o.em.save(); o.em.fillStyle = C.fireCore; o.em.globalAlpha = 0.9; o.em.beginPath(); o.em.arc(wheel[0], wheel[1], 0.2 * sc, 0, 7); o.em.fill(); o.em.restore(); }
          }
          if (h.flame) { const fp = ap(M, [lx + 0.02, ly - LH - 0.08]); O.flame(g, fp[0], fp[1], 0.13 * sc, 0.38 * sc * h.flame, 77, t || 0); if (o.em) { o.em.save(); o.em.fillStyle = C.fireMid; o.em.beginPath(); o.em.arc(fp[0], fp[1] - 0.2 * sc * h.flame, 0.3 * sc, 0, 7); o.em.fill(); o.em.restore(); } }
        }], spark: wheel };
      },
    },
    // ---------------- a wine glass pinched by the stem ----------------
    glass: {
      plan(sk, h, side, t) {
        const drink = clamp(h.drink || 0, 0, 1); const hL = sk.len.hand;
        let dir = lerp(-0.25, -1.05, drink), tilt = 1.15 * E.ios(drink);
        let pinch = atU(sk, h, addv(sk.S0, [0.85 + 0.6 * 0.72, 0.95 - 0.25]), t, 51);
        if (drink > 0) { const mouth = ap(sk.headM, [0.44, 0.31]); const G = rotv([-0.17, -0.6], -tilt); const pd = [mouth[0] - G[0], mouth[1] - G[1]]; pinch = blend(pinch, pd, E.ios(drink)); }
        const off = rotv([0.62 * hL, -0.06 * hL], dir); const W0 = [pinch[0] - off[0], pinch[1] - off[1]];
        return { arm: { to: sk.toPx(W0), dir, hand: 'pinch', elbow: elbowFor(sk, W0, h.elbow || 'down') }, tilt };
      },
      build(c, pl, h) {
        const pin = c.L([0.62, -0.06]); const G = comp(c.M, frameM(pin, -pl.tilt, 1));
        const front = S().capsule(0.38, -0.1, 0.065, 0.66, -0.02, 0.045).capsule(0.12, -0.13, 0.075, 0.6, -0.07, 0.05).transform(c.hmU);
        return { front, tip: ap(G, [0, -0.6]), props: [(g, o) => paintGlass(g, G, { level: h.fill, empty: h.empty, lip: h.lip, light: o.light, lightColor: o.color, em: o.em, rimColor: o.color ? mix(o.color, C.ink, 0.35) : C.tungstenMid })] };
      },
    },
    // ---------------- a wine bottle held by the body ----------------
    bottle: {
      plan(sk, h, side, t) { const W0 = atU(sk, h, addv(sk.S0, [1.45, 0.75]), t, 61); return { arm: { to: sk.toPx(W0), dir: h.dir == null ? -0.2 : h.dir, hand: 'fist', elbow: elbowFor(sk, W0, h.elbow || 'down') } }; },
      build(c, pl, h) {
        const pour = clamp(h.pour || 0, 0, 1); const grip = c.L([0.3, 0.0]); const B = frameM(grip, E.ios(pour) * 2.3 + 0.08, 1);   // bottle-local: origin in the fist, -y toward the mouth
        const b = S(); b.add(smooth([[-0.035, -0.95, 1], [0.035, -0.95, 1], [0.04, -0.62], [0.075, -0.5], [0.15, -0.38], [0.16, -0.25], [0.16, 0.42, 1], [-0.16, 0.42, 1], [-0.16, -0.25], [-0.15, -0.38], [-0.075, -0.5], [-0.04, -0.62]], true));
        const ink = b.transform(B); const M = c.M, sc = c.sc; const mouthU = ap(B, [0, -0.95]), mouth = ap(M, mouthU), axis = norm(mouthU[0] - grip[0], mouthU[1] - grip[1]);
        return { ink, tip: mouth, props: [(g, o) => {
          const p1 = ap(M, ap(B, [-0.11, -0.2])), p2 = ap(M, ap(B, [-0.11, 0.32])); g.save(); g.strokeStyle = rgba(C.cardPaper, 0.55); g.lineWidth = Math.max(1.4, sc * 0.02); g.lineCap = 'round'; g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.stroke(); g.restore();
          if (pour > 0.62 && h.stream !== false) {   // wine leaves along the neck and falls
            const into = h.into || ap(M, [mouthU[0] + axis[0] * 0.25, mouthU[1] + 1.1]); const w = Math.max(2, sc * 0.035), k = (pour - 0.62) / 0.38;
            const cp = ap(M, [mouthU[0] + axis[0] * 0.3, mouthU[1] + axis[1] * 0.3]); const end = [lerp(mouth[0], into[0], Math.min(1, k * 2)), lerp(mouth[1], into[1], Math.min(1, k * 2))];
            g.save(); g.strokeStyle = C.wine; g.lineCap = 'round'; g.lineWidth = w; g.beginPath(); g.moveTo(mouth[0], mouth[1]); g.quadraticCurveTo(cp[0], cp[1], end[0], end[1]); g.stroke();
            g.strokeStyle = mix(C.wine, C.tungsten, 0.4); g.lineWidth = Math.max(1, w * 0.3); g.beginPath(); g.moveTo(mouth[0], mouth[1]); g.quadraticCurveTo(cp[0], cp[1], end[0], end[1]); g.stroke(); g.restore();
          }
        }] };
      },
    },
    // ---------------- the deck: fanned, squared, or one card ----------------
    deck: {
      plan(sk, h, side, t) { const mode = h.mode || 'fan'; const W0 = atU(sk, h, addv(sk.S0, mode === 'fan' ? [0.8, 0.35] : [1.0, 0.7]), t, 71); return { arm: { to: sk.toPx(W0), dir: h.dir == null ? (mode === 'fan' ? -0.75 : -0.1) : h.dir, hand: mode === 'card' ? 'pinch' : 'fist', elbow: elbowFor(sk, W0, h.elbow || 'down') } }; },
      build(c, pl, h) {
        const mode = h.mode || 'fan', M = c.M; const CW = 0.27, CH = 0.38;
        const card = (g, w, hgt, alpha) => { g.globalAlpha = alpha == null ? 1 : alpha; g.fillStyle = C.cardPaper; g.beginPath(); g.roundRect(-w / 2, -hgt, w, hgt, 0.025); g.fill(); g.fillStyle = C.cardBlue; g.beginPath(); g.roundRect(-w / 2 + 0.022, -hgt + 0.022, w - 0.044, hgt - 0.044, 0.012); g.fill(); g.strokeStyle = rgba(C.cardPaper, 0.4); g.lineWidth = 0.008; g.strokeRect(-w / 2 + 0.045, -hgt + 0.045, w - 0.09, hgt - 0.09); g.globalAlpha = 1; };
        if (mode === 'fan') {
          const n = h.n || 9, spread = (h.spread == null ? 1.35 : h.spread) * (h.open == null ? 1 : h.open); const piv = c.L([0.3, -0.05]); const base = h.angle == null ? 0.22 : h.angle;
          const ang = i => base + (n > 1 ? (i / (n - 1) - 0.5) : 0) * spread;
          const thumb = S().capsule(c.L([0.12, -0.15])[0], c.L([0.12, -0.15])[1], 0.075, piv[0] + Math.sin(base) * 0.1, piv[1] - Math.cos(base) * 0.1, 0.055);
          return { front: thumb, tip: ap(M, [piv[0] + Math.sin(ang(n - 1)) * CH, piv[1] - Math.cos(ang(n - 1)) * CH]), props: [(g) => inUnits(g, M, u => { for (let i = 0; i < n; i++) { u.save(); u.translate(piv[0], piv[1]); u.rotate(ang(i)); u.translate(0, -0.02); card(u, CW, CH); u.fillStyle = C.tungsten; u.fillRect(-CW / 2 + 0.02, -CH, CW - 0.04, 0.012); u.restore(); } })] };
        }
        if (mode === 'square') {
          const ctr = c.L([0.32, -0.16]);
          return { tip: ap(M, ctr), props: [(g) => inUnits(g, M, u => { u.save(); u.translate(ctr[0], ctr[1]); u.rotate(c.ang); u.fillStyle = C.cardPaper; u.fillRect(-0.19, -0.04, 0.38, 0.075); u.fillStyle = C.cardBlue; u.fillRect(-0.19, -0.06, 0.38, 0.024); u.restore(); })], front: S().capsule(c.L([0.12, -0.14])[0], c.L([0.12, -0.14])[1], 0.075, c.L([0.4, -0.13])[0], c.L([0.4, -0.13])[1], 0.055) };
        }
        const pin = c.L([0.64, -0.05]); const ca = h.cardAng == null ? c.ang - 0.5 : h.cardAng;
        const front = S().capsule(0.38, -0.1, 0.065, 0.66, -0.02, 0.045).transform(c.hmU);
        return { front, tip: ap(M, [pin[0] + Math.sin(ca) * CH * 0.5, pin[1] - Math.cos(ca) * CH * 0.5]), props: [(g) => inUnits(g, M, u => { u.save(); u.translate(pin[0], pin[1]); u.rotate(ca); u.translate(0, 0.05); card(u, CW, CH); u.restore(); })] };
      },
    },
    // ---------------- a kitchen knife in a fist ----------------
    knife: {
      plan(sk, h, side, t) {
        const fc = atU(sk, h, addv(sk.S0, [1.3, 0.35]), t, 81); const hL = sk.len.hand;
        const dir = Math.atan2(fc[1] - sk.S0[1], fc[0] - sk.S0[0]) * 0.6 - 0.15;
        const off = rotv([0.3 * hL, 0], dir); const W0 = [fc[0] - off[0], fc[1] - off[1]];
        return { arm: { to: sk.toPx(W0), dir, hand: 'fist', elbow: elbowFor(sk, W0, h.elbow || 'down') } };
      },
      build(c, pl, h, t) {
        const fcU = c.L([0.3, 0.0]); let bd;
        if (h.point) { const pu = c.R.toU(h.point); bd = norm(pu[0] - fcU[0], pu[1] - fcU[1]); } else { const a = h.dir == null ? -0.35 : h.dir; bd = [Math.cos(a), Math.sin(a)]; }
        if (h.tremble && t != null) bd = rotv(bd, 0.05 * noise(t, 13, 91) * h.tremble / 4);
        const K = [bd[0], bd[1], -bd[1], bd[0], fcU[0], fcU[1]];     // knife-local: x along the blade, y toward the edge
        const handle = S().capsule(-0.26, 0.01, 0.042, 0.05, 0.01, 0.045).transform(K);
        const blade = S().poly([[0.07, -0.035], [0.8, -0.035], [0.92, -0.005], [0.66, 0.06], [0.36, 0.095], [0.1, 0.1], [0.07, 0.1]]).transform(K);
        const M = c.M, sc = c.sc; const tipW = ap(M, ap(K, [0.92, 0]));
        return { ink: handle, tip: tipW, props: [(g, o) => {
          const bp = blade.transform(M).path(0.25, 7); g.fillStyle = h.color || mix(C.ink, C.ash, 0.5); g.fill(bp);
          O.silhouette(g, bp, { noFill: true, light: o.light || { dx: 0.4, dy: -1 }, rimColor: C.lighterCream, rimW: Math.max(1.2, sc * 0.018), at: ap(M, ap(K, [0.45, 0.03])), bbox: blade.transform(M).bbox() });
          const a = ap(M, ap(K, [0.12, -0.03])), b = ap(M, ap(K, [0.82, -0.03])); g.save(); g.strokeStyle = rgba(C.lighterCream, 0.5); g.lineWidth = Math.max(1, sc * 0.01); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore();
          if (o.em) { o.em.save(); o.em.fillStyle = C.lighterCream; o.em.globalAlpha = 0.5; o.em.beginPath(); o.em.arc(tipW[0], tipW[1], sc * 0.08, 0, 7); o.em.fill(); o.em.restore(); }
        }] };
      },
    },
    // ---------------- a bowl of crisps on the upturned hand ----------------
    bowl: {
      plan(sk, h, side, t) { const W0 = atU(sk, h, addv(sk.S0, [1.05, 0.95]), t, 101); return { arm: { to: sk.toPx(W0), dir: h.dir == null ? -0.12 : h.dir, hand: 'hold', elbow: elbowFor(sk, W0, h.elbow || 'down') } }; },
      build(c, pl, h) {
        const x = c.Wu[0] + 0.3, y = c.Wu[1] - 0.14; const ink = S().M(x - 0.43, y - 0.07).C(x - 0.36, y + 0.31, x + 0.36, y + 0.31, x + 0.43, y - 0.07).Z();
        const M = c.M;
        return { ink, tip: ap(M, [x, y - 0.1]), props: [(g, o) => inUnits(g, M, u => {
          const r = O.rng('crisps' + (h.seed || 2)); u.fillStyle = C.cardPaper; const n = h.crisps == null ? 9 : h.crisps;
          for (let i = 0; i < n; i++) { u.save(); u.translate(x - 0.33 + r() * 0.66, y - 0.1 - r() * 0.11); u.rotate(r() * 3); u.fillRect(-0.05, -0.024, 0.1, 0.048); u.restore(); }
          u.fillStyle = o.color || C.tungsten; u.fillRect(x - 0.43, y - 0.085, 0.86, 0.024);
        })] };
      },
    },
    // ---------------- Kay's dripping bag of ice (style frame 03): hung from her fist, clear of the coat ----------------
    bag: {
      plan(sk, h, side, t) { const W0 = atU(sk, h, addv(sk.S0, [-0.5, 2.2]), t, 111); return { arm: { to: sk.toPx(W0), dir: h.dir == null ? 1.72 : h.dir, hand: 'grip', elbow: elbowFor(sk, W0, h.elbow || 'back') } }; },
      build(c, pl, h, t) {
        const k = 1 / 87; const top = c.L([0.42, 0.02]); const bx = top[0] + 2 * k, by = top[1] + 6 * k; const P2 = (dx, dy) => [bx + dx * k, by + dy * k];
        // the knotted neck in the fist, then the bag swelling below it
        const neck = S().M(...P2(-5, -10)).L(...P2(5, -10)).L(...P2(7, 6)).L(...P2(-7, 6)).Z();
        const b = S().M(...P2(-6, 2)).L(...P2(6, 2)).C(...P2(22, 18), ...P2(34, 36), ...P2(33, 54)).L(...P2(39, 62)).L(...P2(33, 70)).C(...P2(32, 90), ...P2(16, 102), ...P2(-2, 100)).L(...P2(-9, 105)).L(...P2(-15, 97))
          .C(...P2(-30, 88), ...P2(-34, 64), ...P2(-28, 48)).L(...P2(-34, 41)).L(...P2(-25, 35)).C(...P2(-18, 20), ...P2(-10, 10), ...P2(-6, 2)).Z();
        const ears = S().M(...P2(-4, -8)).L(...P2(-16, -26)).L(...P2(-6, -22)).L(...P2(0, -12)).Z().add(S().M(...P2(2, -8)).L(...P2(12, -24)).L(...P2(6, -12)).Z());
        const M = c.M, sc = c.sc; const bagW = b.transform(M);
        return { ink: neck.add(ears), tip: ap(M, P2(0, 105)), props: [(g, o) => {
          const bp = bagW.path(0.6, 13); g.fillStyle = C.ink; g.fill(bp);
          if (o.light) O.silhouette(g, bp, { noFill: true, light: o.light, rimColor: mix(C.rainSilver, o.color || C.tungsten, 0.35), rimW: Math.max(1.6, sc * 0.03), at: ap(M, P2(0, 55)), bbox: bagW.bbox(), spread: 1.3 });
          g.save(); g.strokeStyle = C.rainSilver; g.globalAlpha = 0.85; g.lineCap = 'round'; g.lineWidth = Math.max(1.4, sc * 0.02); const cc = ap(M, P2(2, 62)); const ld = lightDir(o.light, cc); const la = Math.atan2(ld[1], ld[0]);
          g.beginPath(); g.arc(cc[0], cc[1], 28 * k * sc, la - 0.42, la + 0.32); g.stroke(); g.globalAlpha = 0.5; g.beginPath(); g.arc(cc[0], cc[1], 20 * k * sc, la - 0.2, la + 0.1); g.stroke(); g.restore();
          if (h.drips !== false) { const T = t || 0; g.fillStyle = C.rainSilver; for (let i = 0; i < 3; i++) { const u = (T * 1.1 + i * 0.37) % 1; const p = ap(M, P2(-2 + i, 106 + u * 160)); g.globalAlpha = 0.9 * (1 - u * 0.6); g.beginPath(); g.ellipse(p[0], p[1], Math.max(1.2, sc * 0.022), Math.max(2, sc * 0.04), 0, 0, 7); g.fill(); } g.globalAlpha = 1; }
        }] };
      },
    },
    biscuit: {
      plan(sk, h, side, t) { const W0 = atU(sk, h, addv(sk.S0, [1.0, 0.2]), t, 121); return { arm: { to: sk.toPx(W0), dir: h.dir == null ? -0.9 : h.dir, hand: 'pinch', elbow: elbowFor(sk, W0, h.elbow || 'down') } }; },
      build(c) { const p = c.L([0.78, -0.12]); const M = c.M, sc = c.sc; const w = ap(M, p);
        return { tip: w, props: [(g, o) => { g.fillStyle = C.cardPaper; g.beginPath(); g.arc(w[0], w[1], 0.16 * sc, 0, 7); g.fill(); g.fillStyle = C.tungstenMid; [[-0.05, -0.04], [0.05, -0.02], [0, 0.05]].forEach(([dx, dy]) => { g.beginPath(); g.arc(w[0] + dx * sc, w[1] + dy * sc, Math.max(1, 0.02 * sc), 0, 7); g.fill(); }); if (o.em) { o.em.fillStyle = C.cardPaper; o.em.beginPath(); o.em.arc(w[0], w[1], 0.19 * sc, 0, 7); o.em.fill(); } }] }; },
    },
    cig: {
      plan(sk, h, side, t) { const W0 = atU(sk, h, addv(sk.S0, [0.95, 0.45]), t, 131); return { arm: { to: sk.toPx(W0), dir: h.dir == null ? -0.5 : h.dir, hand: 'pinch', elbow: elbowFor(sk, W0, h.elbow || 'down') } }; },
      build(c) { const a = c.toW(c.L([0.6, -0.08])), b = c.toW(c.L([0.98, -0.2])); const sc = c.sc;
        return { tip: b, props: [(g, o) => { g.save(); g.strokeStyle = (o.details && o.details.cigColor) || C.cardPaper; g.lineCap = 'round'; g.lineWidth = Math.max(2, Math.min(sc * 0.05, 3 + sc * 0.015)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore(); }] }; },
    },
    // ---------------- a hand flat on a surface (the grass, a table, a shoulder) ----------------
    flat: {
      plan(sk, h, side) {
        const hL = sk.len.hand; let at;
        if (h.at) at = sk.toU(h.at);
        else if (h.back) at = [-1.34, 0.45];                   // propped behind the hips, palm on the ground (style frame 02)
        else at = addv(sk.S0, [1.2, 1.6]);
        const ang = h.angle || 0; let sgn = h.fingers === 'toward' ? -1 : (h.fingers === 1 || h.fingers === -1) ? h.fingers : 1;
        if (h.fingers == null || h.fingers === 'away' || h.fingers === 'toward') { const away = at[0] >= sk.S0[0] - 0.2 ? 1 : -1; sgn = h.fingers === 'toward' ? -away : away; }
        const fdir = [Math.cos(ang) * sgn, Math.sin(ang) * sgn], up = [Math.sin(ang), -Math.cos(ang)];
        const view = h.view || 'edge'; const lift = view === 'edge' ? 0.17 * hL : 0.1 * hL;
        const W0 = [at[0] - fdir[0] * 0.38 * hL + up[0] * lift, at[1] - fdir[1] * 0.38 * hL + up[1] * lift];
        return { arm: { to: sk.toPx(W0), dir: Math.atan2(fdir[1], fdir[0]), hand: 'none', elbow: elbowFor(sk, W0, h.elbow || (h.back ? 'back' : 'down')) }, at, fdir, up, view };
      },
      build(c, pl, h) {
        const hL = c.hL, { fdir, up, view } = pl; const W0 = c.Wu;
        let hs;
        if (view === 'above') { const k = h.squash == null ? 0.34 : h.squash, s = h.thumb || 1; const dn = [-up[0], -up[1]]; hs = hand('flat', { spread: h.spread == null ? 0.1 : h.spread, curl: h.curl || 0 }).transform([fdir[0] * hL, fdir[1] * hL, dn[0] * hL * k * s, dn[1] * hL * k * s, W0[0], W0[1] + 0.06 * hL]); }
        else { const dn = [-up[0], -up[1]]; hs = hand('side', { curl: h.curl || 0 }).transform([fdir[0] * hL, fdir[1] * hL, dn[0] * hL, dn[1] * hL, W0[0], W0[1]]); }
        return { ink: hs, hand: hs.transform(c.M), tip: c.toW(ap([fdir[0] * hL, fdir[1] * hL, 0, 0, W0[0], W0[1]], [0.95, 0])) };
      },
    },
    // ---------------- open hand over the throat / mouth / eyes (style frame 10) ----------------
    // the spread hand sits on the front of the throat with its fingers up over the jaw, so it breaks the profile edge; the far hand
    // goes lower with its fingers fanned forward, its elbow staggered out in front of the near one, so both forearms read
    cover: {
      plan(sk, h, side) {
        const hL = sk.len.hand, k = sk.k; const where = h.at || 'throat'; const far = side === 'F'; let pc, fd;
        if (Array.isArray(where)) { pc = sk.toU(where); fd = norm(0.3, -1); }
        else if (where === 'throat') {
          const nb = sk.neckBase, nt = sk.neckTop; const ax = norm(nt[0] - nb[0], nt[1] - nb[1]); const fw = [-ax[1], ax[0]];
          const m = lerp2(nb, nt, far ? 0.05 : 0.55); pc = addv(m, fw, 0.27 * k + (far ? 0.2 : 0.16) * hL);
          fd = norm(ax[0] + fw[0] * (far ? 0.75 : 0.22), ax[1] + fw[1] * (far ? 0.75 : 0.22));
        } else {
          const hm = sk.headM; const q = where === 'eyes' ? [0.5, -0.06] : [0.52, 0.3]; pc = ap(hm, q); const upH = norm(-hm[2], -hm[3]), fwH = norm(hm[0], hm[1]);
          fd = norm(upH[0] + fwH[0] * 0.35, upH[1] + fwH[1] * 0.35); if (far) pc = addv(pc, fd, -0.25 * hL);
        }
        const W0 = addv(pc, fd, -0.3 * hL);
        return { arm: { to: sk.toPx(W0), dir: Math.atan2(fd[1], fd[0]), hand: h.hand || 'open', flip: true, uk: far ? 0.92 : 1,
          handOpts: { spread: far ? 0.2 : 0.15, curl: h.curl == null ? 0.05 : h.curl }, elbow: elbowFor(sk, W0, h.elbow || (far ? 'downfwd' : 'down'), far ? 0.92 : 1) } };
      },
      build(c) { return { tip: c.toW(c.L([0.9, 0])) }; },
    },
    point: {
      plan(sk, h, side) { const tu = sk.toU(h.at || sk.toPx(addv(sk.S0, [3, 0]))); const d = sub(tu, sk.S0), L = Math.hypot(d[0], d[1]) || 1; const R = (sk.len.upper + sk.len.fore) * (h.reach == null ? 0.96 : h.reach);
        const W0 = addv(sk.S0, [d[0] / L, d[1] / L], Math.min(R, Math.max(0.6, L - 0.62 * sk.len.hand))); return { arm: { to: sk.toPx(W0), aim: h.at, hand: h.hand || 'index', handOpts: h.handOpts, elbow: elbowFor(sk, W0, h.elbow || 'down') } }; },
      build(c) { return { tip: c.toW(c.L([0.96, -0.085])) }; },
    },
    reach: {
      plan(sk, h, side) { return HOLDS.point.plan(sk, Object.assign({ hand: 'open', handOpts: { spread: 0.18 }, reach: 0.99 }, h), side); },
      build(c) { return { tip: c.toW(c.L([0.95, 0])) }; },
    },
    // ---------------- a fist closed on cloth: a shoulder, a collar ----------------
    grab: {
      plan(sk, h, side) { const a = sk.toU(h.at || sk.toPx(addv(sk.S0, [1.3, -0.1]))); const dir = h.dir == null ? 1.2 : h.dir; const fd = [Math.cos(dir), Math.sin(dir)]; const W0 = addv(a, fd, -0.3 * sk.len.hand);
        return { arm: { to: sk.toPx(W0), dir, hand: 'grip', elbow: elbowFor(sk, W0, h.elbow || 'down') }, a }; },
      build(c, pl) { const kn = S(); for (let i = 0; i < 4; i++) { const p = c.L([0.38 + 0.05 * i, 0.03 + 0.07 * i]); kn.circle(p[0], p[1], 0.045 * c.hL / 0.72); } return { front: kn, tip: c.toW(pl.a) }; },
    },
    // ---------------- one half of two hands holding (the hand circle) ----------------
    clasp: {
      plan(sk, h) { const a = sk.toU(h.at), tw = h.toward ? sk.toU(h.toward) : addv(a, [1, 0.3]); const fd = norm(tw[0] - a[0], tw[1] - a[1]); const W0 = addv(a, fd, -0.3 * sk.len.hand);
        return { arm: { to: sk.toPx(W0), dir: Math.atan2(fd[1], fd[0]), hand: 'grip', elbow: elbowFor(sk, W0, h.elbow || 'down') }, a, fd }; },
      build(c, pl) { const hL = c.hL, ang = Math.atan2(pl.fd[1], pl.fd[0]); const g = S().ellipse(pl.a[0], pl.a[1], 0.3 * hL, 0.2 * hL, ang);
        for (let i = 0; i < 4; i++) { const t = (i - 1.5) * 0.11 * hL; g.circle(pl.a[0] + Math.cos(ang) * t + Math.sin(ang) * 0.17 * hL, pl.a[1] + Math.sin(ang) * t - Math.cos(ang) * 0.17 * hL, 0.065 * hL); }
        return { ink: g, tip: c.toW(pl.a) }; },
    },
  };

  // ======================================================================== the figure
  // spec sanitising (NaN / Infinity never reach the kit) and memo keys (plain data only; t replaced by its twos time)
  function sanitize(id, spec) {
    let bad = null; const out = Object.assign({}, spec);
    ['x', 'y', 'scale', 't', 'facing', 'lean', 'neck', 'head', 'rot', 'squash'].forEach(k => { if (out[k] != null && !fin(out[k])) { bad = k; out[k] = k === 'scale' ? 60 : k === 'facing' ? 1 : k === 't' ? null : (k === 'squash' ? 1 : 0); } });
    ['seat', 'look'].forEach(k => { if (out[k] && !(fin(out[k][0]) && fin(out[k][1]))) { bad = k; out[k] = undefined; } });
    if (out.scale != null && out.scale <= 0) { bad = 'scale'; out.scale = 60; }
    if (bad) warn('RIG.figure(' + id + '): bad ' + bad + ' replaced');
    return out;
  }
  function keyOf(prefix, id, spec, tq) {
    let ok = true; const s = JSON.stringify(spec, (k, v) => { if (typeof v === 'function' || (v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype)) ok = false; return k === 't' && v === spec.t ? tq : v; });
    return ok ? prefix + id + ':' + s : null;
  }
  const _memo = new Map();
  function memoGet(k) { if (!k) return null; const v = _memo.get(k); if (v) { _memo.delete(k); _memo.set(k, v); } return v || null; }
  function memoSet(k, v) { if (!k) return; _memo.set(k, v); if (_memo.size > 96) _memo.delete(_memo.keys().next().value); }

  function planAll(id, r, spec) {
    const sk = FIG.skeleton(id, r.pose); const plans = {}; const pose = r.pose;
    ['N', 'F'].forEach(side => {
      let h = r.holds[side]; if (!h) return; if (typeof h === 'string') h = { kind: h };
      const H = HOLDS[h.kind]; if (!H) { warn('RIG: no hold ' + h.kind); return; }
      const sks = side === 'F' ? Object.assign({}, sk, { S0: sk.S0F }) : sk;
      const pl = H.plan(sks, h, side, r.t); plans[side] = { h, H, pl };
      pose['arm' + side] = Object.assign({ w: 0 }, pl.arm, h.w != null ? { w: h.w } : {});
      if (pl.look && !spec.look) plans[side].wantLook = true;
      // how far the arm falls short of its target (px)
      const A = pose['arm' + side]; if (A.to) { const sh = sk.toPx(sks.S0); const reach = (sk.len.upper * (A.uk || 1) + sk.len.fore * (A.fk || 1)) * 0.995 * sk.sc; plans[side].short = Math.max(0, dist(sh, A.to) - reach); plans[side].fwd = Math.sign((A.to[0] - sh[0]) * (pose.facing || 1)) || 1; }
    });
    return { sk, plans };
  }
  function figure(id, spec) {
    if (!FIG.CHAR[id]) { warn('RIG.figure: no character ' + id); id = 'scott'; }
    spec = sanitize(id, spec || {});
    const tq = spec.t == null ? null : time(id, spec.t, spec); const mk = keyOf('F|', id, spec, tq); const hit = memoGet(mk); if (hit) return hit;
    let r = resolve(id, spec); let { plans } = planAll(id, r, spec);
    // autoLean: bend at the waist until the held targets are in reach
    const wantLean = spec.autoLean || ['N', 'F'].some(s => plans[s] && plans[s].h.autoLean);
    if (wantLean && ['N', 'F'].some(s => plans[s] && plans[s].short > 0.5)) {
      const side = ['N', 'F'].find(s => plans[s] && plans[s].short > 0.5); const dir = plans[side].fwd;
      let lo = 0, hi = 1.3, best = null;
      for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; const r2 = resolve(id, Object.assign({}, spec, { leanAdd: (spec.leanAdd || 0) + dir * m, headAdd: (spec.headAdd || 0) - dir * m * 0.45 })); const p2 = planAll(id, r2, spec);
        if (['N', 'F'].every(s => !p2.plans[s] || p2.plans[s].short <= 0.5)) { hi = m; best = { r: r2, plans: p2.plans }; } else lo = m; }
      if (!best) { const r2 = resolve(id, Object.assign({}, spec, { leanAdd: (spec.leanAdd || 0) + dir * hi, headAdd: (spec.headAdd || 0) - dir * hi * 0.45 })); best = { r: r2, plans: planAll(id, r2, spec).plans }; }
      r = best.r; plans = best.plans;
    }
    const pose = r.pose, t = r.t;
    // the phone held to look at: the head follows it
    ['N', 'F'].forEach(side => { const P0 = plans[side]; if (!P0 || !P0.wantLook) return; const tmp = FIG.profile(id, pose); pose.look = ap(tmp.arms[side].hm, [0.62, -0.18]); pose.lookAmt = 0.9; });
    // the yanked ponytail: the hair never stretches past maxLen, so the head is pulled toward the grip instead
    let ponyGrip = null;
    if (pose.pony && pose.pony.grip) {
      const maxL = pose.pony.maxLen == null ? 0.8 : pose.pony.maxLen, G = pose.pony.grip;
      const over = (hd, nk) => { const sk = FIG.skeleton(id, Object.assign({}, pose, { head: hd, neck: nk })); const g = ap(inv(sk.headW), G); return Math.hypot(g[0] + 0.3, g[1] + 0.58) / sk.k; };
      let hd = pose.head == null ? FIG.CHAR[id].idle.head : pose.head, nk = pose.neck == null ? FIG.CHAR[id].idle.neck : pose.neck; let d = over(hd, nk);
      for (let i = 0; i < 14 && d > maxL; i++) { let best = [d, hd, nk]; [[0.07, 0], [-0.07, 0], [0, 0.05], [0, -0.05]].forEach(([a, b]) => { const h2 = clamp(hd + a, -1.0, 0.6), n2 = clamp(nk + b, -0.75, 0.45); const d2 = over(h2, n2); if (d2 < best[0]) best = [d2, h2, n2]; }); if (best[0] >= d - 1e-4) break; [d, hd, nk] = best; }
      pose.head = hd; pose.neck = nk;
      const sk = FIG.skeleton(id, pose); const tie = ap(sk.headW, [-0.3, -0.58]), gl = ap(inv(sk.headW), G), gv = norm(gl[0] + 0.3, gl[1] + 0.58), L = Math.min(Math.hypot(gl[0] + 0.3, gl[1] + 0.58), maxL * sk.k);
      ponyGrip = ap(sk.headW, [-0.3 + gv[0] * L, -0.58 + gv[1] * L]); void tie;
    }
    const F = FIG.profile(id, pose);
    F.kind = 'profile'; F.spec = spec; F.holds = {}; F.props = []; F.at = F.joints.chest; F.seed = spec.seed == null ? 20 + id.length : spec.seed; F.t = t; F._mkey = mk;
    if (ponyGrip) F.pony = { grip: ponyGrip };
    const ink = S(), front = S(); let any = false, anyF = false;
    ['N', 'F'].forEach(side => {
      const P0 = plans[side]; if (!P0) return; const c = hctx(F, side); const b = P0.H.build(c, P0.pl, P0.h, t) || {};
      if (b.ink) { ink.add(b.ink); any = true; } if (b.front) { front.add(b.front); anyF = true; } if (b.props) F.props.push(...b.props);
      F.holds[side] = Object.assign({ kind: P0.h.kind, reach: Math.round((P0.short || 0) * 10) / 10 }, b, { ink: undefined, front: undefined, props: undefined });
    });
    if (any) F.shape = F.shape.add(ink.transform(F.M));
    F.front = anyF ? front.transform(F.M) : null;
    memoSet(mk, F);
    return F;
  }

  // ======================================================================== top-down and bust
  function hull2(P0) {
    const q = P0.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = []; q.forEach(p => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
    for (let i = q.length - 1; i >= 0; i--) { const p = q[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function chaikin(P0, n) { let p = P0; for (let k = 0; k < n; k++) { const o = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } p = o; } return p; }
  function top(id, spec) {
    spec = Object.assign({ armW: 1.25, handK: 1.15, nose: false }, sanitize(id, spec || {}));
    const tq = spec.t == null ? null : time(id, spec.t, spec); const mk = keyOf('T|', id, spec, tq); const hit = memoGet(mk); if (hit) return hit;
    if (spec.look) { const want = Math.atan2(spec.look[1] - spec.y, spec.look[0] - spec.x) - (spec.dir || 0); let w = want; while (w > Math.PI) w -= TAU; while (w < -Math.PI) w += TAU; spec.headTurn = (spec.headTurn || 0) + clamp(w * (spec.lookAmt == null ? 0.85 : spec.lookAmt), -1.1, 1.1); }
    if (spec.t != null && spec.breath !== false) { const p = persona(id, spec.mood); spec.lean = (spec.lean || 0) + 0.025 * (0.5 - 0.5 * Math.cos(TAU * p.breathHz * tq + p.phase)); }
    const T = FIG.top(id, spec); T.kind = 'top'; T.spec = spec; T.parts = { head: T.headShape }; T.at = T.toW(-0.1, 0); T.props = []; T.front = null; T.joints = { head: T.head }; T.seed = spec.seed == null ? 40 + id.length : spec.seed; T._mkey = mk;
    // the crown: a smooth hull of head and hair (the rim never follows notches in the hair)
    const hp = []; T.headShape.polys.forEach(pl => pl.forEach(p => hp.push(p))); T.crown = S().poly(chaikin(hull2(hp), 3));
    if (spec.deck) {
      const A = T, sc = T.scale; const p = A.toW(1.52, 0), a = (spec.dir || 0) + Math.PI / 2;
      T.props.push(g => { for (let i = 0; i < 9; i++) { const tt = (i - 4) * 0.05; const x = p[0] + Math.sin(tt) * 0.06 * sc, y = p[1] + 0.03 * sc - i * 0.008 * sc; g.save(); g.translate(x, y); g.rotate(a + tt); const w = 0.45 * sc, h = 0.64 * sc; g.fillStyle = C.cardPaper; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 0.04 * sc); g.fill(); g.fillStyle = C.cardBlue; g.beginPath(); g.roundRect(-w / 2 + 0.034 * sc, -h / 2 + 0.034 * sc, w - 0.068 * sc, h - 0.068 * sc, 0.02 * sc); g.fill(); g.restore(); } });
      const th = S(); [-1, 1].forEach(s => { const [tx, ty] = A.toW(1.6, s * 0.12); const [bx, by] = A.toW(1.34, s * 0.4); th.capsule(bx, by, 0.12 * sc, tx, ty, 0.08 * sc); }); T.front = th;
    }
    memoSet(mk, T);
    return T;
  }
  // clasp point between two top-down figures' hands (F07): want = preferred point; k = fraction of full reach allowed
  function topLink(a, ia, b, ib, want, k) {
    k = k == null ? 0.92 : k;
    const sh = (s, i) => { const D = FIG.CHAR[s.id], cs = Math.cos(s.dir || 0), sn = Math.sin(s.dir || 0), side = i === 0 ? -1 : 1, sc = s.scale || 60; return { p: [s.x - side * D.shoulderK * sn * sc, s.y + side * D.shoulderK * cs * sc], r: (1.25 + 1.15) * D.armK * sc * 0.985 * k }; };
    const A = sh(a, ia), B = sh(b, ib); let p = want ? want.slice() : [(A.p[0] + B.p[0]) / 2, (A.p[1] + B.p[1]) / 2];
    for (let i = 0; i < 80; i++) { let d = dist(p, A.p); if (d > A.r) p = [A.p[0] + (p[0] - A.p[0]) * A.r / d, A.p[1] + (p[1] - A.p[1]) * A.r / d]; d = dist(p, B.p); if (d > B.r) p = [B.p[0] + (p[0] - B.p[0]) * B.r / d, B.p[1] + (p[1] - B.p[1]) * B.r / d]; }
    return p;
  }
  function bust(id, spec) {
    spec = Object.assign({}, sanitize(id, spec || {}));
    const tq = spec.t == null ? null : time(id, spec.t, spec); const mk = keyOf('B|', id, spec, tq); const hit = memoGet(mk); if (hit) return hit;
    if (spec.t != null && spec.breath !== false) { const p = persona(id, spec.mood); const dy = (typeof spec.breath === 'number' ? spec.breath : p.breathPx) * (0.5 - 0.5 * Math.cos(TAU * p.breathHz * tq + p.phase)); if (spec.waist) spec.waist = [spec.waist[0], spec.waist[1] - dy * 0.35]; else spec.y = (spec.y || 0) - dy; }
    // an arm laid on a shoulder: elbow down, the hand resting over the top of the shoulder, fingers toward the neck
    ['armL', 'armR'].forEach((q, i) => {
      const a = spec[q]; if (!a || a.on !== 'shoulder' || !a.to) return;
      const B0 = FIG.bust(id, Object.assign({}, spec, { armL: false, armR: false })); const s = i ? 1 : -1; const sw = 0.98 * FIG.CHAR[id].shoulderK;
      const Sh = ap(B0.M, [s * (sw - 0.12), 1.2]); const dv = norm(a.to[0] - Sh[0], a.to[1] - Sh[1]); const hk = 0.62 * (a.handK || 1.05) * Math.hypot(B0.M[0], B0.M[1]);
      const ha = Math.atan2(dv[1], dv[0]) + (dv[0] > 0 ? 0.32 : -0.32);   // fingers draping a little down over the front of the shoulder
      const W = [a.to[0] - Math.cos(ha) * hk * 0.42, a.to[1] - Math.sin(ha) * hk * 0.42 - hk * 0.06];
      spec[q] = Object.assign({ hand: 'relaxed', handK: 1.05, handOpts: { curl: 0.15 } }, a, { to: W, elbow: 'down', handAng: ha });
    });
    const B = FIG.bust(id, spec); B.kind = 'bust'; B.spec = spec; B.at = B.chest; B.props = []; B.front = null; B.joints = { head: B.head }; B.seed = spec.seed == null ? 30 + id.length : spec.seed; B._mkey = mk;
    memoSet(mk, B); return B;
  }
  function link(sa, sideA, sb, sideB, o) {
    o = o || {}; const A = skeleton(sa.id || sa.who, sa).sk, B = skeleton(sb.id || sb.who, sb).sk;
    const pa = sideA === 'F' ? A.toPx(A.S0F) : A.shoulder, pb = sideB === 'F' ? B.toPx(B.S0F) : B.shoulder; const ra = (A.len.upper + A.len.fore) * A.sc * 0.97, rb = (B.len.upper + B.len.fore) * B.sc * 0.97;
    let p = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 + (o.sag == null ? 0.9 : o.sag) * Math.min(A.sc, B.sc)];
    for (let i = 0; i < 60; i++) { let d = dist(p, pa); if (d > ra) p = [pa[0] + (p[0] - pa[0]) * ra / d, pa[1] + (p[1] - pa[1]) * ra / d]; d = dist(p, pb); if (d > rb) p = [pb[0] + (p[0] - pb[0]) * rb / d, pb[1] + (p[1] - pb[1]) * rb / d]; }
    return { at: p, A: { kind: 'clasp', at: p, toward: pb }, B: { kind: 'clasp', at: p, toward: pa } };
  }
  // A's two hands on B's shoulders (from behind or in front). pull 0..1 leans A back and tips B toward A.
  function grab(sa, sb, o) {
    o = o || {}; const idB = sb.id || sb.who; const pull = clamp(o.pull || 0, 0, 1);
    const fB = sb.facing || 1, fA = sa.facing || 1, behind = Math.sign((sb.x - sa.x) * fA) > 0 && fA === fB;
    const B2 = Object.assign({}, sb, { leanAdd: (sb.leanAdd || 0) + (behind ? -0.16 : 0.12) * pull }); const sk = skeleton(idB, B2).sk;
    const top0 = sk.toPx(sk.T(-0.12, 2.3)), top1 = sk.toPx(sk.T(0.12, 2.32)), up = -0.06 * sk.sc;
    const N = { kind: 'grab', at: [top0[0], top0[1] + up], dir: behind ? 1.05 : 1.9 }, F = { kind: 'grab', at: [top1[0], top1[1] + up - 0.04 * sk.sc], dir: behind ? 0.9 : 2.05 };
    return { N, F, A: { leanAdd: (sa.leanAdd || 0) - 0.18 * pull, hold: { N, F } }, B: { leanAdd: B2.leanAdd } };
  }
  // the holder kneels and catches the held body (u 0 -> 1), then cradles it across his knee, her head in the crook of his arm
  function cradle(idA, idB, o) {
    o = o || {}; const f = o.facing || 1, sc = o.scale || 60, y = o.y == null ? 0 : o.y, x = o.x == null ? 0 : o.x; const u = E.ios(clamp(o.u == null ? 1 : o.u, 0, 1));
    const A = { id: idA, x, y, scale: sc, facing: f, t: o.t, pose: 'kneel', lean: lerp(0.3, 0.5, u), neck: 0.3, head: lerp(0.3, 0.5, u), idleAmt: 0.3, mood: o.mood };
    const skA = skeleton(idA, A).sk; const knee = skA.toPx(skA.kN);
    const DB = FIG.CHAR[idB]; const hipX = x + f * lerp(2.7, 3.15, u) * sc;
    const incline = lerp(1.15, 0.55, u);               // her torso rising from the floor toward his knee
    const B = { id: idB, x: hipX, y: lerp(y - 1.2 * sc, y - 0.42 * DB.hipK * sc, u), anchor: 'hip', scale: sc, facing: f, t: o.t, idle: false,
      rot: -f * (Math.PI / 2 - incline), lean: 0.08, neck: lerp(-0.2, -0.55, u), head: lerp(-0.2, -0.6, u), roll: lerp(0.2, 0.6, u),
      legN: { a: lerp(0.6, 0.35, u), b: lerp(0.9, 0.6, u), foot: 0.4 }, legF: { a: lerp(0.3, 0.12, u), b: lerp(0.5, 0.25, u), foot: 0.5 },
      armN: { a: lerp(0.6, -0.2, u), b: lerp(0.8, 0.25, u), hand: 'relaxed', handOpts: { curl: 0.2 } }, armF: { a: 0.7, b: 1.3, hand: 'relaxed' } };
    // her legs rest on the floor
    const skB0 = skeleton(idB, B).sk; const ah = 0.36 * DB.heightK;
    const legTo = (H0, dx) => { const w = skB0.toPx(H0); return [w[0] + f * dx * sc, y - ah * sc]; };
    B.legN = Object.assign({}, B.legN, { to: legTo(skB0.H, lerp(2.6, 3.1, u)), knee: 'up' }); B.legF = Object.assign({}, B.legF, { to: legTo(skB0.HF, lerp(3.0, 3.4, u)), knee: 'up' });
    const skB = skeleton(idB, B).sk;
    const under = skB.toPx(skB.T(-0.45, 1.85)), chest = skB.toPx(skB.T(0.35, 1.7));
    A.hold = { N: { kind: 'flat', at: under, view: 'edge', fingers: f > 0 ? 1 : -1, angle: 0.4 * f, elbow: 'down' }, F: { kind: 'flat', at: chest, view: 'edge', curl: 0.35, elbow: 'down' } };
    void knee;
    return { A, B };
  }
  // ---- Christof folded flat inside the oven (style frame 09). Local box 0..6 x 0..4 (y down), head at the left
  function foldedLocal() {
    const sh = S();
    sh.add(smooth([[5.55, 0.95], [4.6, 0.1], [3.5, 0.0], [2.3, 0.0], [1.5, 0.05], [1.05, 0.5], [1.0, 1.08], [1.4, 1.36], [2.4, 1.3], [3.6, 1.24], [4.8, 1.4], [5.5, 1.7]], true));
    sh.add(smooth([[5.2, 0.85], [5.85, 1.1], [5.98, 1.9, 1], [5.98, 2.9, 1], [5.6, 3.62], [5.0, 3.58], [5.25, 2.2]], true));
    sh.capsule(5.2, 3.2, 0.5, 3.3, 3.42, 0.36); sh.capsule(3.3, 3.42, 0.32, 1.6, 3.5, 0.23);
    sh.add(smooth([[1.8, 3.24], [1.35, 3.2], [0.85, 3.38], [0.55, 3.68, 1], [0.66, 3.92, 1], [1.85, 3.9, 1]], true));
    sh.capsule(3.3, 3.34, 0.28, 3.95, 2.45, 0.19); sh.capsule(3.95, 2.45, 0.19, 4.7, 2.72, 0.15);
    sh.capsule(1.3, 1.0, 0.36, 2.0, 1.55, 0.27);
    const a = 2.75, k = 1.42, hm = [k * Math.cos(a), k * Math.sin(a), -k * Math.sin(a), k * Math.cos(a), 2.35, 2.2];
    sh.add(FIG.headProfile(FIG.CHAR.christof.face).transform(hm)); sh.add(FIG.hairProfile('christof', {}, 2).transform(hm));
    sh.capsule(1.1, 0.95, 0.3, 0.42, 1.72, 0.21); sh.capsule(0.42, 1.72, 0.2, 0.62, 2.45, 0.15);
    sh.add(hand('splay', { spread: 0.28 }).transform([0.2, 0.62, -0.62, 0.2, 0.62, 2.45]));
    sh.polys = sh.polys.map(p => O.resample(p, 0.04).map(([x, y]) => [Math.max(Math.min(x, 5.98), 0.06), Math.max(Math.min(y, 3.92), 0.1)]));
    return sh;
  }
  let _folded = null;
  function folded(box, o) {
    o = o || {}; const L = _folded || (_folded = foldedLocal()); let fn;
    if (Array.isArray(box)) { const Hm = homography([[0, 0], [6, 0], [6, 4], [0, 4]], box); fn = (x, y) => Hm(o.mirror ? 6 - x : x, y); }
    else { const b = box || { x: 0, y: 0, w: 600, h: 400 }; fn = (x, y) => [b.x + (o.mirror ? 6 - x : x) / 6 * b.w, b.y + y / 4 * b.h]; }
    const g = o.warp; return warp(L, g ? (x, y) => g(...fn(x, y)) : fn);
  }
  function warp(shape, fn) { const s = new O.Shape(); s.polys = shape.polys.map(p => p.map(([x, y]) => fn(x, y))); return s; }
  function homography(src, dst) {
    const A = [], bv = []; for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); bv.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); bv.push(v); }
    const n = 8, M = A.map((r, i) => r.concat([bv[i]]));
    for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < n; r++) { if (r === c) continue; const k = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; } }
    const h = M.map((r, i) => r[n] / r[i]);
    return (x, y) => { const w = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]; };
  }

  // ======================================================================== drawing
  // the figure's hand-cut outline, built once per F (use it to clip, knock out, or shadow the figure exactly as drawn)
  function path(F) { return F._path || (F._path = F.shape.path(0.8, F.seed || 21)); }
  function bbox(F) { return F._bbox || (F._bbox = F.shape.bbox()); }
  // ---- composited sprite cache: characters move on twos, so the second frame of each pair reuses the first one's pixels
  const _spr = { map: new Map(), pool: [] };
  function emRecorder() { const ops = []; const p = new Proxy({}, { get(_, k) { if (k === '__ops') return ops; return (...a) => { ops.push([k, a]); }; }, set(_, k, v) { ops.push(['=', k, v]); return true; } }); return p; }
  function emReplay(em, ops) { if (!em) return; for (const op of ops) { if (op[0] === '=') em[op[1]] = op[2]; else em[op[0]](...op[1]); } }
  function drawKey(F, o, m) {
    if (!F._mkey || o.cache === false || (o.clip && !o.clipKey)) return null;
    const ok = { light: o.light, color: o.color, w: o.w, soft: o.soft, alpha: o.alpha, falloff: o.falloff, spread: o.spread, headSpread: o.headSpread, fill: o.fill, details: o.details,
      props: o.props, faceLight: o.faceLight, em: !!o.em, layered: o.layered, armRim: o.armRim, clipKey: o.clipKey, m: [m.a, m.b, m.c, m.d, m.e, m.f].map(v => Math.round(v * 1000) / 1000) };
    return F._mkey + '#' + JSON.stringify(ok);
  }
  function draw(g, F, o) {
    o = o || {};
    if (!F || !F.shape) { warn('RIG.draw: no figure'); return F; }
    const bb0 = bbox(F); if (!(fin(bb0.x) && fin(bb0.y) && fin(bb0.w) && fin(bb0.h))) { warn('RIG.draw: figure has bad coordinates, skipped'); return F; }
    if (o.shadow) O.castShadow(g, F.shape, o.shadow.m, o.shadow.alpha == null ? 0.7 : o.shadow.alpha, o.shadow.color);
    const m = g.getTransform(); const k = drawKey(F, o, m);
    if (!k) { drawRaw(g, F, o); return F; }
    let e = _spr.map.get(k);
    if (e) { _spr.map.delete(k); _spr.map.set(k, e); }
    else {
      const sc = F.scale || 60, pad = Math.max(30, 1.3 * sc); const bb = { x: bb0.x - pad, y: bb0.y - pad, w: bb0.w + 2 * pad, h: bb0.h + 2 * pad };
      const xs = [], ys = []; [[bb.x, bb.y], [bb.x + bb.w, bb.y], [bb.x, bb.y + bb.h], [bb.x + bb.w, bb.y + bb.h]].forEach(([x, y]) => { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); });
      const cw = g.canvas.width, ch = g.canvas.height; const x0 = Math.max(0, Math.floor(Math.min(...xs))), y0 = Math.max(0, Math.floor(Math.min(...ys))), x1 = Math.min(cw, Math.ceil(Math.max(...xs))), y1 = Math.min(ch, Math.ceil(Math.max(...ys)));
      if (x1 <= x0 || y1 <= y0) return F;
      const w = x1 - x0, h = y1 - y0; let cv = null;
      for (let i = 0; i < _spr.pool.length; i++) if (_spr.pool[i].width >= w && _spr.pool[i].height >= h) { cv = _spr.pool.splice(i, 1)[0]; break; }
      if (!cv) cv = O.makeCanvas(Math.max(w, 64), Math.max(h, 64));
      const sg = cv.getContext('2d'); sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalAlpha = 1; sg.globalCompositeOperation = 'source-over'; sg.clearRect(0, 0, w, h);
      sg.setTransform(m.a, m.b, m.c, m.d, m.e - x0, m.f - y0);
      const rec = o.em ? emRecorder() : null; drawRaw(sg, F, Object.assign({}, o, { em: rec, shadow: null }));
      e = { cv, x: x0, y: y0, w, h, ops: rec ? rec.__ops : [] }; _spr.map.set(k, e);
      while (_spr.map.size > 40) { const k0 = _spr.map.keys().next().value; const old = _spr.map.get(k0); _spr.map.delete(k0); if (_spr.pool.length < 16) _spr.pool.push(old.cv); }
    }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(e.cv, 0, 0, e.w, e.h, e.x, e.y, e.w, e.h); g.restore();
    emReplay(o.em, e.ops);
    return F;
  }
  function autoFalloff(F, o) {
    const fo = o.falloff; if (!fo || !o.light || o.light.x == null) return null;
    const L = [o.light.x, o.light.y]; const bb = bbox(F); const cs = [[bb.x, bb.y], [bb.x + bb.w, bb.y], [bb.x, bb.y + bb.h], [bb.x + bb.w, bb.y + bb.h]];
    const dmax = Math.max(...cs.map(q => dist(q, L))); const near = [clamp(L[0], bb.x, bb.x + bb.w), clamp(L[1], bb.y, bb.y + bb.h)]; const dmin = dist(near, L);
    if (fo === true) return { r0: Math.max(1, dmin), r1: Math.max(dmin + 2, 1.5 * dmax), steps: 3, min: 0.5 };
    if (fo.far != null || fo.near != null) return { r0: fo.near == null ? dmin : fo.near, r1: 1.5 * Math.max(fo.far == null ? dmax : fo.far, (fo.near || 0) + 1), steps: fo.steps == null ? 3 : fo.steps, min: fo.min == null ? 0.5 : fo.min };
    return Object.assign({ min: 0.5 }, fo);
  }
  function drawRaw(g, F, o) {
    const sc = F.scale || 60; const w = o.w == null ? clamp(2 + 0.012 * sc, 2.4, 5) : o.w; const col = o.color || C.tungsten;
    const falloff = autoFalloff(F, o);
    const rim = o.light ? { light: o.light, rimColor: col, rimW: w, rimSoft: o.soft && w >= 3, rimAlpha: o.alpha, falloff, clip: o.clip } : {};
    const seed = F.seed || 21, fill = o.fill || C.ink;
    if (F.kind === 'top' && o.layered !== false) {
      // ink in one fill (no seams), the crown rimmed in three stepped bands in a short wedge (style frame 07); arms only on request
      g.fillStyle = fill; g.fill(path(F));
      if (o.light) {
        const hs = o.headSpread == null ? 1.0 : o.headSpread; const crown = F.crown.path(0.2, seed + 3); const cb = F.crown.bbox();
        [[w * 2.7, mix(col, C.ink, 0.62), 0.9], [w * 1.55, mix(col, C.ink, 0.35), 1], [w * 0.75, col, 1]].forEach(([ww, cc, al]) =>
          O.silhouette(g, crown, { noFill: true, light: o.light, rimColor: cc, rimW: ww, rimAlpha: al * (o.alpha == null ? 1 : o.alpha), at: F.head, bbox: cb, spread: hs, clip: o.clip, falloff }));
        if (o.armRim) {
          const c0 = F.toW(0, 0), R = 1.15 * sc; const away = new Path2D(); away.rect(-1e5, -1e5, 2e5, 2e5); away.arc(c0[0], c0[1], R, 0, TAU, true);
          const clipFn = gg => { if (o.clip instanceof Path2D) gg.fill(o.clip); };
          g.save(); g.clip(away, 'evenodd'); O.silhouette(g, F.arms.path(0.8, seed + 5), { noFill: true, light: o.light, rimColor: mix(col, C.ink, 0.35), rimW: w * 0.7, rimAlpha: 0.8, at: F.head, bbox: F.arms.bbox(), spread: o.spread == null ? 1.7 : o.spread, clip: o.clip }); g.restore(); void clipFn;
        }
      }
    } else {
      const parts = F.parts && F.parts.head ? [{ shape: F.parts.head, at: (F.joints && F.joints.head) || F.head, spread: o.headSpread == null ? 1.25 : o.headSpread }] : [];
      O.silhouette(g, path(F), Object.assign({ fill, seed, at: F.at, bbox: bbox(F), parts: o.light ? parts : [], spread: o.spread == null ? 1.7 : o.spread }, rim));
    }
    const po = { light: o.light, color: col, em: o.em, details: o.details || {}, scale: sc };
    if (o.props !== false) F.props.forEach(fn => fn(g, po));
    if (F.front) O.silhouette(g, F.front, Object.assign({ fill, seed: seed + 7, spread: o.spread == null ? 1.7 : o.spread }, rim, { rimW: w * 0.8 }));
    ['N', 'F'].forEach(s => { const hd = F.holds && F.holds[s]; if (hd && hd.faceLight && hd.faceLight.lit && o.faceLight !== false) faceLight(g, F, hd.faceLight.from, { color: hd.faceLight.color, em: o.em, lit: hd.faceLight.lit }); });
    if (o.details !== false && F.details) FIG.drawDetails(g, F, Object.assign({ light: o.light, rimColor: col }, o.details || {}));
    return F;
  }
  // the light of a screen / flame on a profile face (style frame 08): crescents on brow and nose that die before the lips, a catch-light on the cheekbone
  const _fl = { c: null, g: null, c2: null, g2: null };
  function faceLight(g, F, from, o) {
    o = o || {}; const col = o.color || C.phoneWhite, lit = o.lit == null ? 1 : o.lit; if (!F.rig || !F.parts) return;
    const m = F.headM; const sc = F.scale; const hc = F.joints.head; const R = sc * 0.95;
    const T = g.getTransform(); const dev = (p) => [T.a * p[0] + T.c * p[1] + T.e, T.b * p[0] + T.d * p[1] + T.f]; const z = Math.sqrt(Math.abs(T.a * T.d - T.b * T.c)) || 1;
    const c0 = dev(hc), Rd = R * z; const x0 = Math.max(0, Math.floor(c0[0] - Rd)), y0 = Math.max(0, Math.floor(c0[1] - Rd)), x1 = Math.min(g.canvas.width, Math.ceil(c0[0] + Rd)), y1 = Math.min(g.canvas.height, Math.ceil(c0[1] + Rd));
    const ww = x1 - x0, hh = y1 - y0; if (ww <= 0 || hh <= 0) return;
    if (!_fl.c || _fl.c.width < ww || _fl.c.height < hh) { _fl.c = O.makeCanvas(Math.max(ww, 256), Math.max(hh, 256)); _fl.g = _fl.c.getContext('2d'); _fl.c2 = O.makeCanvas(_fl.c.width, _fl.c.height); _fl.g2 = _fl.c2.getContext('2d'); }
    const rc = _fl.g, tg = _fl.g2; const setT = q => q.setTransform(T.a, T.b, T.c, T.d, T.e - x0, T.f - y0);
    rc.setTransform(1, 0, 0, 1, 0, 0); rc.globalCompositeOperation = 'source-over'; rc.globalAlpha = 1; rc.clearRect(0, 0, ww, hh);
    const ps = F._fpath || (F._fpath = F.shape.path(0.15, 30)); const dir = norm(from[0] - hc[0], from[1] - hc[1]);
    [[0.075, 0.16], [0.04, 0.38], [0.018, 1]].forEach(([w, a]) => {
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.globalAlpha = 1; tg.clearRect(0, 0, ww, hh); setT(tg);
      tg.fillStyle = col; tg.fill(ps); tg.globalCompositeOperation = 'destination-out'; tg.translate(-dir[0] * w * sc, -dir[1] * w * sc); tg.fill(ps);
      rc.setTransform(1, 0, 0, 1, 0, 0); rc.globalAlpha = a * lit; rc.drawImage(_fl.c2, 0, 0, ww, hh, 0, 0, ww, hh);
    });
    setT(rc); rc.globalAlpha = 1;
    const g0 = ap(m, [0, 0.05]), g1 = ap(m, [0, 0.19]); const gr = rc.createLinearGradient(g0[0], g0[1], g1[0], g1[1]); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    rc.globalCompositeOperation = 'destination-in'; rc.fillStyle = gr; rc.fillRect(hc[0] - R, hc[1] - R, 2 * R, 2 * R);
    rc.beginPath(); rc.arc(hc[0], hc[1], sc * 0.85, 0, TAU); rc.fillStyle = '#fff'; rc.fill();
    rc.globalCompositeOperation = 'source-over'; rc.fillStyle = col;
    rc.globalAlpha = 0.18 * lit; rc.fill(S().M(0.27, -0.02).Q(0.27, 0.09, 0.1, 0.15).Q(0.2, 0.07, 0.2, -0.02).Z().transform(m).path(0.1, 5));
    rc.globalAlpha = 0.42 * lit; rc.fill(S().M(0.265, 0.0).Q(0.26, 0.08, 0.14, 0.13).Q(0.22, 0.07, 0.225, 0.0).Z().transform(m).path(0.1, 6));
    g.save(); g.clip(path(F)); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(_fl.c, 0, 0, ww, hh, x0, y0, ww, hh); g.restore();
    if (o.em) { o.em.save(); o.em.fillStyle = col; o.em.globalAlpha = 0.25 * lit; o.em.beginPath(); o.em.arc(hc[0] + dir[0] * sc * 0.4, hc[1] + dir[1] * sc * 0.4, sc * 0.35, 0, 7); o.em.fill(); o.em.restore(); }
  }

  // ======================================================================== props, helpers
  function chair(x, floorY, sc, o) {
    o = o || {}; const f = o.facing || 1, sq = o.squash || 1, kind = o.kind || 'dining'; const sh = S(); const seatH = 1.76;
    const X = (u, v) => [x + f * sq * u * sc, floorY - v * sc];
    if (kind === 'stool') { sh.poly([X(-0.75, seatH), X(0.75, seatH), X(0.75, seatH - 0.14), X(-0.75, seatH - 0.14)]); [-0.6, 0.55].forEach(u => sh.poly([X(u - 0.06, seatH - 0.1), X(u + 0.06, seatH - 0.1), X(u * 1.12 + 0.06, 0), X(u * 1.12 - 0.06, 0)])); }
    else if (kind === 'armchair') { sh.add(smooth([X(-1.3, 0.2), X(-1.35, 3.6), X(-1.0, 3.9), X(-0.7, 3.4), X(-0.75, seatH + 0.2), X(1.1, seatH + 0.25), X(1.35, seatH + 0.9), X(1.55, seatH + 0.75), X(1.45, 0.2)].map(p => p), true)); sh.rect(Math.min(...[X(-1.2, 0)[0], X(1.3, 0)[0]]), floorY - 0.25 * sc, Math.abs(2.5 * sc * sq), 0.25 * sc); }
    else {
      sh.poly([X(-0.85, seatH), X(0.85, seatH), X(0.85, seatH - 0.16), X(-0.85, seatH - 0.16)]);                                                 // seat
      [-0.75, 0.72].forEach(u => sh.poly([X(u - 0.07, seatH - 0.12), X(u + 0.07, seatH - 0.12), X(u + 0.06 + u * 0.06, 0), X(u - 0.06 + u * 0.06, 0)]));   // legs
      sh.poly([X(-0.86, seatH - 0.1), X(-0.72, seatH - 0.1), X(-0.9, seatH + 2.3), X(-1.06, seatH + 2.28)]);                                     // back post (raked)
      sh.poly([X(-1.08, seatH + 2.3), X(-0.88, seatH + 2.32), X(-0.86, seatH + 1.7), X(-1.02, seatH + 1.68)]);                                     // top rail
      sh.poly([X(-0.98, seatH + 1.2), X(-0.84, seatH + 1.22), X(-0.82, seatH + 0.9), X(-0.95, seatH + 0.88)]);                                     // mid rail
    }
    return { shape: sh, seat: X(kind === 'stool' ? 0 : 0.05, kind === 'armchair' ? seatH + 0.15 : seatH) };
  }
  const prop = {
    glass(g, x, y, sc, o) { o = o || {}; const G = frameM([x, y - 0.205 * sc], o.tilt || 0, sc); return paintGlass(g, G, Object.assign({ level: o.fill }, o)); },
    // Angelo's jacket laid over a lying body's chest and throat (style frame 11). Returns a Shape (ink) in world space.
    jacketOver(F) {
      const hip = F.joints.hip, hd = F.joints.head, u = F.scale; const ax = norm(hd[0] - hip[0], hd[1] - hip[1]); let upv = [ax[1], -ax[0]]; if (upv[1] > 0) upv = [-upv[0], -upv[1]];
      const P2 = (a, b) => [hip[0] + ax[0] * a * u + upv[0] * -b * u, hip[1] + ax[1] * a * u + upv[1] * -b * u];
      const j = smooth([P2(0.25, 0.45).concat([1]), P2(0.35, -0.35), P2(0.7, -0.62), P2(1.1, -0.7).concat([1]), P2(1.45, -0.6), P2(1.8, -0.8).concat([1]), P2(2.15, -0.7), P2(2.42, -0.72).concat([1]), P2(2.6, -0.48), P2(2.66, -0.2).concat([1]), P2(2.55, 0.2), P2(2.2, 0.5).concat([1])], true);
      j.poly([P2(1.35, 0), P2(1.2, 0.42), P2(0.95, 0.5), P2(0.55, 0.52), P2(0.58, 0.38), P2(0.95, 0.3)]); j.ellipse(...P2(1.5, -0.2), u * 1.0, u * 0.38, Math.atan2(ax[1], ax[0]));
      return j;
    },
  };
  // Deena's throat (style frame 10): a short arc across the front of the neck, sagging toward the chest
  function throat(F) {
    const nb = F.joints.neck, hc = F.joints.head, sc = F.scale; const ax = [hc[0] - nb[0], hc[1] - nb[1]]; const al = Math.hypot(ax[0], ax[1]); const ua = [ax[0] / al, ax[1] / al];
    let fr = [-ua[1], ua[0]]; if (fr[0] * F.facing < 0) fr = [-fr[0], -fr[1]];
    const c0 = [nb[0] + ax[0] * 0.44, nb[1] + ax[1] * 0.44], nw = 0.27 * sc * 0.95;
    const A = [c0[0] + fr[0] * nw * 1.3, c0[1] + fr[1] * nw * 1.3], B = [c0[0] - fr[0] * nw * 0.3, c0[1] - fr[1] * nw * 0.3];
    const ctl = [(A[0] + B[0]) / 2 - ua[0] * sc * 0.045, (A[1] + B[1]) / 2 - ua[1] * sc * 0.045];
    const pt = t => { const m = 1 - t; return [m * m * A[0] + 2 * m * t * ctl[0] + t * t * B[0], m * m * A[1] + 2 * m * t * ctl[1] + t * t * B[1]]; };
    const crescent = (t0, t1, wmax) => { const pts = [], back = []; const N = 30; wmax = wmax == null ? sc * 0.04 : wmax;
      for (let i = 0; i <= N; i++) { const t = t0 + (t1 - t0) * i / N; const p = pt(t), q = pt(Math.min(1, t + 0.01)); let tx = q[0] - p[0], ty = q[1] - p[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        const w = wmax * Math.pow(Math.sin(Math.PI * t), 0.7); pts.push([p[0] - ty * w * 0.5, p[1] + tx * w * 0.5]); back.push([p[0] + ty * w * 0.5, p[1] - tx * w * 0.5]); }
      return S().poly(pts.concat(back.reverse())); };
    return { A, B, ctl, pt, crescent, down: [-ua[0], -ua[1]] };
  }
  const shadowM = (floorY, shear, squash) => { const sx = shear == null ? 0.42 : shear, sy = squash == null ? -0.16 : squash; return [1, 0, sx, sy, -sx * floorY, (1 - sy) * floorY]; };
  function dbg(g, F) { g.save(); Object.entries(F.joints || {}).forEach(([k, p]) => { g.fillStyle = '#f0f'; g.beginPath(); g.arc(p[0], p[1], 4, 0, 7); g.fill(); O.text(g, k, p[0] + 6, p[1] - 6, { family: 'Barlow Condensed', size: 16, color: '#fff' }); }); g.restore(); }

  // ======================================================================== close-ups
  const _cu = { c: null };
  const cu = {
    // two hands holding, close up (style frame 13): his hand (s*) over the other's (e*). L = hand length px, rot, sq (perspective squash)
    clasp(Cx, Cy, L, rot, sq) {
      sq = sq == null ? 0.92 : sq; const m = [Math.cos(rot) * L, Math.sin(rot) * L * sq, -Math.sin(rot) * L, Math.cos(rot) * L * sq, Cx, Cy]; const T = sh => sh.transform(m);
      const sBack = smooth([[-0.62, -0.17], [-0.42, -0.25], [-0.16, -0.3], [-0.02, -0.29, 1], [0.03, -0.17], [0.05, -0.04], [0.04, 0.1], [0.0, 0.23, 1], [-0.2, 0.24], [-0.45, 0.17], [-0.62, 0.12]], true);
      const sFing = S(); [[-0.235, 0.056, 0.45], [-0.105, 0.06, 0.5], [0.025, 0.057, 0.47], [0.15, 0.048, 0.38]].forEach(([y, r, len]) => { sFing.capsule(-0.04, y, r, len * 0.68, y + 0.015, r * 0.95); sFing.capsule(len * 0.68, y + 0.015, r * 0.95, len * 0.92, y + 0.085, r * 0.82); });
      const sThumb = S().capsule(-0.4, -0.25, 0.075, -0.13, -0.36, 0.064).capsule(-0.13, -0.36, 0.064, 0.08, -0.37, 0.055);
      const eBack = smooth([[0.64, -0.2], [0.42, -0.27], [0.16, -0.31], [0.03, -0.29, 1], [-0.02, -0.15], [-0.03, 0.0], [-0.01, 0.13], [0.04, 0.25, 1], [0.24, 0.27], [0.46, 0.22], [0.64, 0.15]], true);
      const eArm = S().capsule(0.6, -0.03, 0.17, 1.3, -0.14, 0.2);
      const eFing = S(); [[-0.17, 0.056, 0.44], [-0.045, 0.06, 0.5], [0.08, 0.057, 0.47], [0.2, 0.048, 0.37]].forEach(([y, r, len]) => { eFing.capsule(0.04, y, r, -len * 0.68, y + 0.015, r * 0.95); eFing.capsule(-len * 0.68, y + 0.015, r * 0.95, -len * 0.92, y + 0.085, r * 0.82); });
      const eThumb = S().capsule(0.36, -0.27, 0.07, 0.12, -0.42, 0.058);
      const apm = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
      return { m, ap: apm, sBack: T(sBack), sFing: T(sFing), sThumb: T(sThumb), eBack: T(eBack), eArm: T(eArm), eFing: T(eFing), eThumb: T(eThumb), wrist: apm(-0.6, -0.02), L };
    },
    // his hand in ink; the other hand is only a cut through the paper: its fingers over his, his fingers over it; its wrist chars out
    // into the dark in three flat steps with a feathered, burnt edge (style frame 13)
    drawClasp(g, f, K, o) {
      o = o || {}; const ink = S().add(K.sBack).add(K.sFing).add(K.sThumb);
      if (o.drawHis !== false) { g.fillStyle = o.fill || C.ink; g.fill(ink.path(0.8, 11)); }
      const hc = f.markHoles(); hc.save(); hc.fillStyle = '#fff'; const depth = o.depth == null ? 1 : o.depth;
      hc.globalAlpha = depth; hc.fill(K.eBack.path(0.7, 21)); hc.fill(K.eThumb.path(0.7, 24));
      // the wrist, burning out: drawn on a scratch canvas the size of the forearm, stepped alpha along it, then pocked with char holes
      const a0 = K.ap(0.55, -0.03), a1 = K.ap(1.3, -0.14), armP = K.eArm.path(0.7, 22); const ab = K.eArm.bbox(); const T = hc.getTransform();
      const pad = 12, xs = [], ys = []; [[ab.x, ab.y], [ab.x + ab.w, ab.y], [ab.x, ab.y + ab.h], [ab.x + ab.w, ab.y + ab.h]].forEach(([x, y]) => { xs.push(T.a * x + T.c * y + T.e); ys.push(T.b * x + T.d * y + T.f); });
      const dx0 = Math.floor(Math.min(...xs) - pad), dy0 = Math.floor(Math.min(...ys) - pad), dw = Math.ceil(Math.max(...xs) + pad) - dx0, dh = Math.ceil(Math.max(...ys) + pad) - dy0;
      if (!_cu.c || _cu.c.width < dw || _cu.c.height < dh) _cu.c = O.makeCanvas(Math.max(dw, 256), Math.max(dh, 256));
      const tm = _cu.c.getContext('2d'); tm.setTransform(1, 0, 0, 1, 0, 0); tm.globalCompositeOperation = 'source-over'; tm.globalAlpha = 1; tm.clearRect(0, 0, _cu.c.width, _cu.c.height);
      tm.setTransform(T.a, T.b, T.c, T.d, T.e - dx0, T.f - dy0); tm.fillStyle = '#fff'; tm.fill(armP);
      tm.globalCompositeOperation = 'destination-in';
      const lg = tm.createLinearGradient(a0[0], a0[1], a1[0], a1[1]); lg.addColorStop(0, '#fff'); lg.addColorStop(0.3, '#fff'); lg.addColorStop(0.31, 'rgba(255,255,255,0.72)'); lg.addColorStop(0.46, 'rgba(255,255,255,0.72)'); lg.addColorStop(0.47, 'rgba(255,255,255,0.3)'); lg.addColorStop(0.6, 'rgba(255,255,255,0.3)'); lg.addColorStop(0.61, 'rgba(255,255,255,0)');
      tm.fillStyle = lg; tm.fillRect(ab.x - 50, ab.y - 50, ab.w + 100, ab.h + 100);
      tm.globalCompositeOperation = 'destination-out'; const fr = O.rng('wristburn'); const s = K.L / 300;
      for (let i = 0; i < 220; i++) { const u = 0.2 + fr() * 0.5, p = K.ap(0.55 + u * 0.75, -0.08 + (fr() - 0.5) * 0.46); if (fr() < u * 1.4) { tm.beginPath(); tm.ellipse(p[0], p[1], (1.5 + fr() * 5) * s, (1 + fr() * 3) * s, fr() * 3, 0, 7); tm.fill(); } else { fr(); fr(); fr(); } }
      hc.save(); hc.setTransform(1, 0, 0, 1, 0, 0); hc.globalAlpha = depth; hc.drawImage(_cu.c, 0, 0, dw, dh, dx0, dy0, dw, dh); hc.restore();
      hc.globalCompositeOperation = 'destination-out'; hc.globalAlpha = 1; hc.fill(K.sFing.path(0.8, 11)); hc.fill(K.sThumb.path(0.8, 11));
      hc.globalCompositeOperation = 'source-over'; hc.globalAlpha = depth; hc.fill(K.eFing.path(0.7, 23)); hc.restore();
      return ink;
    },
    // long fingers round a fanned deck, close up (style frame 06). (x,y) = the pivot of the fan (usually below frame), s = scale (1 = F06)
    fan(g, x, y, s, o) {
      o = o || {}; s = s || 1; const n = o.n || 13, R0 = 268 * s, cw = 112 * s, chh = 160 * s; const a0 = o.from == null ? -52 : o.from, a1 = o.to == null ? 36 : o.to;
      for (let i = 0; i < n; i++) { const a = (a0 + i * ((a1 - a0) / (n - 1))) * Math.PI / 180; g.save(); g.translate(x, y); g.rotate(a);
        g.fillStyle = C.cardPaper; g.beginPath(); g.roundRect(-cw / 2, -R0, cw, chh, 8 * s); g.fill(); g.fillStyle = mix(C.cardBlue, C.ink, 0.4); g.beginPath(); g.roundRect(-cw / 2 + 6 * s, -R0 + 6 * s, cw - 12 * s, chh - 12 * s, 4 * s); g.fill();
        g.strokeStyle = rgba(C.cardPaper, 0.22); g.lineWidth = 1.2 * s; g.strokeRect(-cw / 2 + 11 * s, -R0 + 11 * s, cw - 22 * s, chh - 22 * s); g.fillStyle = o.color || C.tungsten; g.fillRect(-cw / 2 + 3 * s, -R0 - 0.5 * s, cw - 6 * s, 2.5 * s); g.restore(); }
      const X = (px, py) => [x + (px - 1085) * s, y + (py - 1175) * s]; const hs = S();
      hs.add(smooth([X(985, 1100), X(1000, 1028), X(1050, 990), X(1125, 982), X(1180, 1005), X(1205, 1100)], true));
      const cap = (a, b, ra, rb) => { const p = X(a[0], a[1]), q = X(b[0], b[1]); hs.capsule(p[0], p[1], ra * s, q[0], q[1], rb * s); };
      cap([1045, 1012], [985, 985], 22, 16); cap([985, 985], [940, 978], 15, 12);
      [[[1112, 992, 17], [1146, 948, 13.5], [1160, 912, 11.5], [1152, 890, 10]], [[1138, 1000, 17], [1188, 962, 13.5], [1216, 930, 11.5], [1214, 906, 10]],
        [[1160, 1014, 16], [1218, 990, 13], [1254, 966, 11], [1258, 944, 9.5]], [[1176, 1036, 14.5], [1228, 1026, 12], [1264, 1010, 10], [1272, 990, 8.5]]]
        .forEach(seg => { for (let i = 0; i < seg.length - 1; i++) cap(seg[i], seg[i + 1], seg[i][2], seg[i + 1][2]); });
      O.silhouette(g, hs, { light: o.light, rimColor: o.color || C.tungsten, rimW: 3.2 * s, seed: 91, at: X(1150, 980) });
      return hs;
    },
  };

  const RIG = global.RIG = {
    P, CURVES, POSES, GESTURES, HOLDS, figure, draw, top, topLink, bust, link, grab, cradle, folded, skeleton, resolve, groundY,
    walk, run: runG, stumble, crawl, roll, buckle, thrown, turn, idle, curve, key, arc, time, blend, persona, path, bbox,
    chair, prop, faceLight, throat, cu, shadowM, dbg, paintGlass, warp, homography, CAST: ['scott', 'kay', 'marina', 'christof', 'deena', 'angelo'],
    _cache: { memo: _memo, sprites: _spr },
  };
})(window);
