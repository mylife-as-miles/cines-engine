/* ONE TOO MANY — procedural cut-paper silhouettes.
   Units: 1 = one head height. Profile figures are authored facing right (+x) and mirrored for facing:-1.
   Every part is filled in the same ink, so overlapping parts merge with no seams.
   Exports: OTM.fig.profile(id, pose), OTM.fig.skeleton(id, pose), OTM.fig.top(id, opts), OTM.fig.bust(id, opts),
            OTM.fig.hand(pose, opts), OTM.fig.drawDetails(ctx, fig, opts), OTM.fig.CHAR, OTM.fig.ik2, OTM.fig.M (affine helpers)

   Film extensions (all optional; without them every figure is exactly what it was for the style frames):
   profile pose:
     clothes: 'none' | false | 'shirt' | 'jacket' | ...   override the clothing layer (Angelo's jacket comes off: clothes:'none')
     hair: 'none' | kind                                    override the hair
     pony: false | {grip:[x,y]}                             Deena only: no ponytail, or the ponytail yanked taut to a world point (an invisible fist)
     cig: false                                             Angelo only: no cigarette behind the ear
     look: [x,y], lookAmt 0..1                              turn the head (neck + head angles) to look at a world point (behind: only half a glance)
     rot: radians, squash: 0..1                             rotate the whole figure about its anchor (lying, falling); squash x (paper turn, 3/4)
     breath: units                                          chest, shoulders and head rise by this much (the hips stay): RIG breathes 4 px at 0.25 Hz
     legN/legF: { to:[x,y], knee: 1|-1 }                    leg IK (anchor:'hip' only): ankle on a world point; knee 1 = forward (default), -1 = back
     armN/armF: { to:[x,y], elbow:-1|1 }                    two-bone IK: put the wrist on a world point. elbow -1 (default) = natural bend, +1 = the other solution
                { uk, fk }                                  upper arm / forearm length factors (foreshortening: folded arms, reaching at the camera)
                { aim:[x,y] } | { dir: radians }            point the hand at a world point, or give its angle in figure space (0 = forward, +PI/2 = down)
                { hand:'none'|'fist'|'pinch'|'grip'|... }    new hand poses ('none' draws no hand: the rig draws a holding hand instead)
   profile returns, besides {shape, joints, details, M}: headM (world head matrix), arms:{N,F:{S,E,W,hm,ang,len}}, parts:{head}, rig (skeleton)
   top opts: handPose:'flat'|[left,right] (per hand, 'tuck' = arm in the lap, 'off' = no arm), hands:[a,b] with false = tucked (no stray arm),
             foreshorten:true, headTurn, lean, wrist:[a,b], handOpts:[o,o], elbowK, nose:false. Returns torso, arms, headShape parts too.
   bust opts: waist:[x,y] (place by the waist and tilt about it), armL/armR: false (no arm) | {to:[x,y], hand, elbow:'out'|'in'} | undefined (down).
             Returns parts:{head} (head + hair, for per-part rims) and chest.
             More bust arm options: elbow:'down' (the lower elbow: a hand laid on a shoulder), handAng (radians, screen), handK (hand size).
   More profile options (film pass 2):
     legN/legF.foot: radians                                 foot angle override (0 = flat sole; + = toe down / heel up, - = toe up)
     legN/legF.knee: 'up' | 'down'                           leg IK: the higher / lower knee (sitting on the floor, kneeling)
     roll: 0..1                                              head rolled toward / away from us: the face flattens to a rounder skull (lying, slack)
     view34: 0..1                                            three-quarter cues: far shoulder and far hip step forward, the chest widens
     pony.maxLen                                             the yanked ponytail never stretches past this (head units, default 0.8)
     hand 'index'                                            side-view fist with the index finger out (pointing)
   top opts: armW (arm thickness factor), handK (hand size factor): F07's arms are about 1.25x / 1.15x the defaults.

   DELIBERATE LOOK CHANGES (not drift): with this file the style frames render identically except
     - Kay's rain beads now sit on her hair (F04, F06, S01), not at her collar;
     - Angelo's cigarette is capped as a thin sliver at large scales (F08), never a bar. */
(function (global) {
  'use strict';
  const { S, Shape, C, rng, vnoise, clamp, lerp } = global.OTM;
  const up = a => [Math.sin(a), -Math.cos(a)];
  const dn = a => [Math.sin(a), Math.cos(a)];
  const add = (p, v, k) => [p[0] + v[0] * (k == null ? 1 : k), p[1] + v[1] * (k == null ? 1 : k)];
  // affine helpers (canvas order [a,b,c,d,e,f])
  const apM = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
  const compM = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  const invM = m => { const det = m[0] * m[3] - m[1] * m[2] || 1e-9; return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det]; };
  const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  // Catmull-Rom through points -> cubic beziers. A point [x,y,1] is a hard corner (cut-paper snip).
  function smooth(pts, closed) {
    const sh = S(); const n = pts.length; const P = i => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
    sh.M(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2); const k = 1 / 6;
      const c1 = p1[2] ? [p1[0], p1[1]] : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
      const c2 = p2[2] ? [p2[0], p2[1]] : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
      sh.C(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
    }
    return sh.Z();
  }
  const mapPts = (pts, f) => pts.map(p => { const q = f(p[0], p[1]); return p[2] ? [q[0], q[1], 1] : q; });

  // two-bone IK in a plane. S shoulder, T target, U/F bone lengths, side -1|1 picks the elbow solution.
  // Angles follow the kit's limb convention: a = upper bone angle from straight down (+ = forward), b = elbow bend.
  function ik2(Sh, Tg, U, F, side) {
    let vx = Tg[0] - Sh[0], vy = Tg[1] - Sh[1]; const d0 = Math.hypot(vx, vy) || 1e-6;
    const dmax = (U + F) * 0.995, dmin = Math.abs(U - F) * 1.02 + 1e-3; const d = clamp(d0, dmin, dmax);
    vx *= d / d0; vy *= d / d0;
    const tv = Math.atan2(vx, vy); const al = Math.acos(clamp((U * U + d * d - F * F) / (2 * U * d), -1, 1));
    const a = tv + (side == null ? -1 : side) * al; const E = [Sh[0] + Math.sin(a) * U, Sh[1] + Math.cos(a) * U];
    const tf = Math.atan2(Sh[0] + vx - E[0], Sh[1] + vy - E[1]);
    return { a, b: wrapA(tf - a), E, W: [Sh[0] + vx, Sh[1] + vy], reached: d0 <= dmax + 1e-6 };
  }

  // ---------- cast ----------
  const CHAR = {
    scott: { name: 'Scott', heightK: 1.0, legK: 1.0, armK: 1.0, chestK: 1.0, hipK: 1.0, shoulderK: 1.0, female: false,
      face: { nose: 1.0, chin: 1.0, lips: 0.9, brow: 1.0 }, hair: 'scott', clothes: 'shirt', legs: 'trousers', feet: 'socks',
      idle: { lean: 0.11, neck: 0.12, head: 0.08 } },
    deena: { name: 'Deena', heightK: 0.95, legK: 0.98, armK: 0.97, chestK: 0.92, hipK: 1.0, shoulderK: 0.92, female: true,
      face: { nose: 0.85, chin: 1.08, lips: 1.15, brow: 0.95 }, hair: 'deena', clothes: 'fitted', legs: 'wide', feet: 'heel',
      idle: { lean: -0.03, neck: -0.04, head: -0.1 } },
    angelo: { name: 'Angelo', heightK: 1.07, legK: 1.06, armK: 1.1, chestK: 0.92, hipK: 0.94, shoulderK: 1.02, female: false,
      face: { nose: 1.1, chin: 1.12, lips: 0.95, brow: 1.05 }, hair: 'angelo', clothes: 'jacket', legs: 'trousers', feet: 'shoe',
      idle: { lean: 0.05, neck: 0.05, head: 0.0 } },
    kay: { name: 'Kay', heightK: 0.97, legK: 1.0, armK: 0.98, chestK: 0.95, hipK: 1.02, shoulderK: 0.94, female: true,
      face: { nose: 0.82, chin: 0.98, lips: 1.12, brow: 0.95 }, hair: 'kay', clothes: 'raincoat', legs: 'slim', feet: 'shoe',
      idle: { lean: 0.02, neck: 0.06, head: 0.06 } },
    christof: { name: 'Christof', heightK: 1.02, legK: 0.98, armK: 1.0, chestK: 1.22, hipK: 1.1, shoulderK: 1.14, female: false,
      face: { nose: 1.25, chin: 0.95, lips: 1.0, brow: 1.1 }, hair: 'christof', clothes: 'overshirt', legs: 'trousers', feet: 'shoe',
      idle: { lean: -0.06, neck: -0.02, head: -0.04 } },
    marina: { name: 'Marina', heightK: 0.98, legK: 1.0, armK: 0.98, chestK: 0.95, hipK: 0.98, shoulderK: 1.04, female: true,
      face: { nose: 0.95, chin: 1.0, lips: 1.0, brow: 1.0 }, hair: 'marina', clothes: 'blazer', legs: 'slim', feet: 'boot',
      idle: { lean: 0.0, neck: 0.0, head: 0.0 } },
  };

  // ---------- head (profile, facing right, centre 0,0, height 1) ----------
  function headProfile(f) {
    const n = f.nose, c = f.chin, l = f.lips, b = f.brow;
    return smooth([
      [0.02, -0.52], [0.22, -0.47], [0.33, -0.32], [0.37 * b, -0.17], [0.395 * b, -0.075], [0.36, -0.02, 1],
      [0.40 + 0.05 * n, 0.07], [0.47 + 0.08 * n, 0.165, 1], [0.43 + 0.03 * n, 0.205], [0.40, 0.225, 1],
      [0.425 + 0.025 * l, 0.27], [0.405, 0.305, 1], [0.42 + 0.025 * l, 0.335], [0.375, 0.385, 1],
      [0.39 + 0.03 * (c - 1), 0.44], [0.35 + 0.04 * (c - 1), 0.5 + 0.03 * (c - 1)], [0.2, 0.52 + 0.02 * (c - 1)], [0.02, 0.47],
      [-0.12, 0.36], [-0.3, 0.3], [-0.43, 0.12], [-0.47, -0.12], [-0.38, -0.38], [-0.2, -0.5],
    ], true);
  }
  // the profile head with the face rolled toward or away from us (roll 0..1): nose, lips and chin sink into a rounder skull
  function headRolled(f, roll) {
    const r = clamp(roll, 0, 1), n = f.nose, c = f.chin, l = f.lips, b = f.brow;
    const pts = [[0.02, -0.52], [0.22, -0.47], [0.33, -0.32], [0.37 * b, -0.17], [0.395 * b, -0.075], [0.36, -0.02, 1],
      [0.40 + 0.05 * n, 0.07], [0.47 + 0.08 * n, 0.165, 1], [0.43 + 0.03 * n, 0.205], [0.40, 0.225, 1],
      [0.425 + 0.025 * l, 0.27], [0.405, 0.305, 1], [0.42 + 0.025 * l, 0.335], [0.375, 0.385, 1],
      [0.39 + 0.03 * (c - 1), 0.44], [0.35 + 0.04 * (c - 1), 0.5 + 0.03 * (c - 1)], [0.2, 0.52 + 0.02 * (c - 1)], [0.02, 0.47],
      [-0.12, 0.36], [-0.3, 0.3], [-0.43, 0.12], [-0.47, -0.12], [-0.38, -0.38], [-0.2, -0.5]];
    return smooth(pts.map(p => { const x = p[0] > 0.3 ? 0.3 + (p[0] - 0.3) * (1 - 0.85 * r) + 0.04 * r * Math.max(0, 1 - Math.abs(p[1] - 0.12) * 3) : p[0];
      return (p[2] && r < 0.45) ? [x, p[1], 1] : [x, p[1]]; }), true);
  }
  // Deena's ponytail yanked taut from its tie to G (head-local), cinched where a fist would be, the ends flopping over as a plume.
  // Lifted from style frame 10. Widths are in her head's units (1/158 = one F10 'K'). The strand tapers from the scalp to a pinched
  // gather at the grip and never stretches past maxLen (the rig pulls the head toward the grip instead).
  function yankedPony(G, plume, maxLen) {
    const K = 1 / 158, T0 = [-0.3, -0.58];
    let ux = G[0] - T0[0], uy = G[1] - T0[1]; let Lg = Math.hypot(ux, uy) || 1e-3; ux /= Lg; uy /= Lg;
    if (maxLen != null) Lg = Math.min(Lg, maxLen);
    const nx = uy, ny = -ux;                                   // toward her back (local -x when the strand rises)
    const at = (t, w, c) => { const q = [T0[0] + ux * Lg * t + nx * w * K, T0[1] + uy * Lg * t + ny * w * K]; if (c) q.push(1); return q; };
    const sh = smooth([at(-0.1, 27), at(0.14, 22), at(0.42, 14), at(0.74, 8), at(0.94, 5), at(1.0, 3.6, 1), at(1.05, -3.6, 1), at(0.94, -5), at(0.74, -8), at(0.42, -12), at(0.14, -18), at(-0.1, -23)], true);
    sh.ellipse(T0[0] + ux * 8 * K, T0[1] + uy * 8 * K, 21 * K, 16 * K, Math.atan2(uy, ux));
    sh.ellipse(T0[0] + ux * Lg * 0.99, T0[1] + uy * Lg * 0.99, 8 * K, 5.5 * K, Math.atan2(uy, ux));   // the pinched gather
    if (plume !== false) {
      const g0 = at(1.03, 0); const Pp = (a, b, c) => { const q = [g0[0] + ux * a * K + nx * b * K, g0[1] + uy * a * K + ny * b * K]; if (c) q.push(1); return q; };
      sh.add(smooth([Pp(0, -7), Pp(26, -20), Pp(52, -14), Pp(66, 6), Pp(62, 34), Pp(40, 62), Pp(12, 80), Pp(-6, 86, 1), Pp(14, 66), Pp(-2, 70, 1), Pp(22, 50), Pp(10, 48, 1), Pp(34, 30), Pp(28, 12), Pp(8, 6)], true));
    }
    return sh;
  }
  // hair / signature head parts in the same head-local frame. ctl: {swing} for ponytail etc., {pony:false} no ponytail, {grip:[x,y] head-local} yanked
  function hairProfile(kind, ctl, seed) {
    const sw = (ctl && ctl.swing) || 0;
    switch (kind) {
      case 'scott': return smooth([
        [0.31, -0.3, 1], [0.34, -0.44], [0.22, -0.58], [0.0, -0.62], [-0.13, -0.61], [-0.17, -0.66], [-0.21, -0.78, 1], [-0.25, -0.66],
        [-0.3, -0.73, 1], [-0.33, -0.6], [-0.47, -0.45], [-0.53, -0.18], [-0.49, 0.06], [-0.41, 0.2, 1], [-0.3, 0.02], [0.05, -0.25]], true);
      case 'deena': {
        const cap = smooth([[0.3, -0.32, 1], [0.3, -0.48], [0.12, -0.6], [-0.15, -0.6], [-0.36, -0.55], [-0.5, -0.32], [-0.5, -0.05], [-0.42, 0.14, 1], [-0.25, 0.0], [0.05, -0.25]], true);
        const tie = S().ellipse(-0.33, -0.6, 0.09, 0.1, -0.5);
        if (ctl && ctl.pony === false) return cap.add(tie);
        if (ctl && ctl.grip) return cap.add(yankedPony(ctl.grip, ctl.plume, ctl.maxLen)).add(tie);
        const pt = smooth(mapPts([[-0.24, -0.6], [-0.44, -0.74], [-0.72, -0.72], [-0.9, -0.5], [-0.98, -0.15], [-0.96, 0.22], [-0.86, 0.55, 1],
          [-0.82, 0.18], [-0.74, -0.18], [-0.6, -0.4], [-0.4, -0.45]], (x, y) => { const a = sw, ox = -0.3, oy = -0.6; const dx = x - ox, dy = y - oy; return [ox + dx * Math.cos(a) - dy * Math.sin(a), oy + dx * Math.sin(a) + dy * Math.cos(a)]; }), true);
        return cap.add(pt).add(tie);
      }
      case 'angelo': return smooth([
        [0.3, -0.31, 1], [0.39, -0.46], [0.36, -0.62], [0.2, -0.73], [-0.05, -0.76], [-0.32, -0.68], [-0.53, -0.47], [-0.61, -0.18],
        [-0.56, 0.08], [-0.44, 0.25, 1], [-0.37, 0.08], [0.0, -0.25]], true);
      case 'kay': {
        const r = rng('kayhair' + (seed || 0));
        const tips = [[-0.66, 0.62], [-0.55, 0.72], [-0.44, 0.66], [-0.34, 0.74]];
        return smooth([
          [0.27, -0.3, 1], [0.3, -0.5], [0.08, -0.62], [-0.25, -0.6], [-0.5, -0.42], [-0.6, -0.12], [-0.64, 0.2], [-0.68, 0.45],
          [tips[0][0], tips[0][1], 1], [-0.6, 0.6], [tips[1][0], tips[1][1], 1], [-0.49, 0.6], [tips[2][0], tips[2][1], 1], [-0.4, 0.6],
          [tips[3][0], tips[3][1], 1], [-0.25, 0.5], [-0.12, 0.3], [-0.06, 0.08], [0.02, -0.12], [0.16, -0.22]], true);
      }
      case 'christof': {
        const r = rng('curls' + (seed || 0)); const sh = S();
        const base = [[0.2, -0.5, 0.17], [0.02, -0.62, 0.23], [-0.24, -0.62, 0.25], [-0.46, -0.44, 0.24], [-0.57, -0.16, 0.22], [-0.52, 0.12, 0.19],
          [-0.38, 0.28, 0.14], [0.31, -0.37, 0.13], [0.06, -0.4, 0.24], [-0.22, -0.32, 0.27], [-0.32, 0.0, 0.24], [0.15, -0.28, 0.14], [-0.6, -0.36, 0.15]];
        base.forEach(([x, y, rad], i) => sh.circle(x + (r() - 0.5) * 0.05, y + (r() - 0.5) * 0.05, rad * (0.92 + r() * 0.16)));
        return sh;
      }
      case 'marina': return smooth([
        [0.36, -0.12, 1], [0.37, -0.4], [0.2, -0.61], [-0.12, -0.65], [-0.42, -0.52], [-0.57, -0.24], [-0.59, 0.12], [-0.55, 0.43, 1],
        [-0.07, 0.43, 1], [-0.05, 0.12], [0.06, -0.08], [0.2, -0.12, 1]], true);
    }
    return S();
  }

  // ---------- hands (wrist at 0,0, fingers along +x, length 1) ----------
  // pose: relaxed | flat | point | hold | open | side | clasp | splay | fist | grip | pinch | index | none
  // side-view poses (relaxed, hold, side, fist, grip, pinch) put the thumb on the -y side: with fingers forward the thumb is up.
  function hand(pose, o) {
    o = o || {}; const sh = S(); const spread = o.spread == null ? 0.1 : o.spread; const curl = o.curl == null ? 0 : o.curl;
    if (pose === 'none' || pose === false) return sh;
    if (pose === 'fist' || pose === 'grip') {
      // a closed fist seen from the side: knuckle block, the finger roll under it, the thumb laid across the front
      sh.add(smooth([[0, -0.15], [0.2, -0.2], [0.4, -0.2], [0.52, -0.12], [0.56, 0.02], [0.5, 0.17], [0.36, 0.22], [0.18, 0.2], [0, 0.14]], true));
      sh.capsule(0.12, -0.13, 0.08, 0.42, -0.1, 0.06);
      return sh;
    }
    if (pose === 'index') {
      // pointing: a side-on fist with the index finger out straight, thumb tucked along the curled fingers
      sh.add(smooth([[0, -0.15], [0.2, -0.19], [0.42, -0.17], [0.5, -0.05], [0.47, 0.12], [0.34, 0.2], [0.16, 0.19], [0, 0.14]], true));
      sh.capsule(0.38, -0.115, 0.062, 0.96, -0.085, 0.043);
      sh.capsule(0.1, -0.13, 0.072, 0.38, -0.03, 0.052);
      return sh;
    }
    if (pose === 'pinch') {
      // thumb and index meeting at the front (a stem, a card, a cigarette); the other fingers curled back into the palm
      sh.add(smooth([[0, -0.15], [0.2, -0.19], [0.42, -0.15], [0.48, -0.02], [0.44, 0.14], [0.22, 0.18], [0, 0.14]], true));
      sh.capsule(0.38, -0.1, 0.065, 0.66, -0.02, 0.045);
      sh.capsule(0.12, -0.13, 0.075, 0.6, -0.07, 0.05);
      return sh;
    }
    if (pose === 'side' || pose === 'hold' || pose === 'relaxed') {
      // side-on mitten: palm block, curled finger mass, thumb on top
      const c = pose === 'hold' ? 0.75 : pose === 'relaxed' ? 0.35 : curl;
      sh.add(smooth([[0, -0.15], [0.18, -0.19], [0.45, -0.17], [0.52 + 0.3 * (1 - c), -0.1 + 0.25 * c], [0.55 + 0.38 * (1 - c), 0.02 + 0.35 * c],
        [0.5 + 0.25 * (1 - c), 0.14 + 0.2 * c], [0.42, 0.17], [0.2, 0.17], [0, 0.14]], true));
      sh.capsule(0.12, -0.12, 0.08, 0.4 + 0.05 * c, -0.26 + 0.12 * c, 0.055);
      return sh;
    }
    // top-down palm with five fingers
    const knuckle = [[0.47, -0.17], [0.52, -0.06], [0.51, 0.05], [0.47, 0.15]];
    const lens = [0.43, 0.48, 0.45, 0.35]; const widths = [0.065, 0.068, 0.064, 0.055];
    sh.add(smooth([[0, -0.15], [0.2, -0.2], [0.47, -0.21], [0.54, -0.04], [0.5, 0.2], [0.24, 0.21], [0, 0.15]], true));
    const fan = pose === 'splay' ? 0.22 : pose === 'open' ? 0.14 : spread;
    knuckle.forEach(([x, y], i) => {
      const a = (i - 1.5) * fan; let L = lens[i] * (1 - curl * 0.55);
      if (pose === 'point' && i > 0) L *= 0.45;
      if (pose === 'clasp') L *= 0.55;
      sh.capsule(x, y, widths[i], x + Math.cos(a) * L, y + Math.sin(a) * L, widths[i] * 0.8);
    });
    // thumb
    const ta = pose === 'clasp' ? -0.6 : pose === 'splay' ? -1.15 : -0.85;
    sh.capsule(0.14, -0.15, 0.085, 0.14 + Math.cos(ta) * 0.36, -0.15 + Math.sin(ta) * 0.36, 0.065);
    return sh;
  }

  // ---------- profile skeleton (no shapes): placement matrix, joints, head frame ----------
  // Shared by profile() and the film rig, so holds and look-ats can be planned before anything is built.
  function skeleton(id, pose) {
    const D0 = CHAR[id];
    pose = Object.assign({ facing: 1, anchor: 'feet', scale: 60, x: 0, y: 0 }, D0.idle, pose);
    let D = D0;
    if (pose.clothes != null || pose.hair != null)
      D = Object.assign({}, D0, { clothes: pose.clothes == null ? D0.clothes : (pose.clothes || 'none'), hair: pose.hair == null ? D0.hair : (pose.hair || 'none') });
    const k = D.heightK, L = pose.lean, sc = pose.scale;
    const len = { thigh: 1.85 * D.legK * k, shin: 1.75 * D.legK * k, torso: 2.4 * k, upper: 1.42 * D.armK * k, fore: 1.22 * D.armK * k, hand: 0.72 * k };
    const legN = Object.assign({ a: 0.06, b: 0.04 }, pose.legN), legF = Object.assign({ a: -0.05, b: 0.02 }, pose.legF);
    const H = [0, 0];
    const fwd = [Math.cos(L), Math.sin(L)], upv = up(L);
    // breath (head units): chest, shoulders, neck and head rise; the hips stay put
    const br = pose.breath || 0;
    const T = br ? (v, u) => { const s = clamp((u - 0.5) / 1.6, 0, 1); const u2 = u + br * s * s * (3 - 2 * s); return [H[0] + fwd[0] * v + upv[0] * u2, H[1] + fwd[1] * v + upv[1] * u2]; }
      : (v, u) => [H[0] + fwd[0] * v + upv[0] * u, H[1] + fwd[1] * v + upv[1] * u];
    const f = pose.facing, sq = pose.squash == null ? 1 : pose.squash, rot = pose.rot || 0;
    const sx = sc * f * sq, sy = sc;
    const mkM = oy => { if (rot) { const cr = Math.cos(rot), sr = Math.sin(rot); return [cr * sx, sr * sx, -sr * sy, cr * sy, pose.x - sr * sy * oy, pose.y + cr * sy * oy]; } return [sx, 0, 0, sy, pose.x, pose.y + oy * sc]; };
    // three-quarter view: the far hip and far shoulder step forward (toward the facing side)
    const v34 = pose.view34 || 0; const HF = v34 ? add(H, fwd, 0.26 * v34) : H;
    // leg IK (anchor 'hip' only): legN/legF {to:[x,y] world ankle, knee: 1 (forward, default) | -1 | 'up' | 'down'}
    if (pose.anchor !== 'feet') {
      const Mi0 = invM(mkM(0));
      [[legN, H], [legF, HF]].forEach(([lg, h0]) => {
        if (!lg.to) return; const tu = apM(Mi0, lg.to);
        const s1 = ik2(h0, tu, len.thigh, len.shin, 1), s2 = ik2(h0, tu, len.thigh, len.shin, -1);
        let s = s1.E[0] >= s2.E[0] ? s1 : s2;
        if (lg.knee === -1) s = s === s1 ? s2 : s1; else if (lg.knee === 'up') s = s1.E[1] <= s2.E[1] ? s1 : s2; else if (lg.knee === 'down') s = s1.E[1] > s2.E[1] ? s1 : s2;
        lg.a = s.a; lg.b = -s.b; lg.reached = s.reached;
      });
    }
    const kF = add(HF, dn(legF.a), len.thigh), aF = add(kF, dn(legF.a - legF.b), len.shin);
    const kN = add(H, dn(legN.a), len.thigh), aN = add(kN, dn(legN.a - legN.b), len.shin);
    let oy = 0; if (pose.anchor === 'feet') oy = -Math.max(aF[1], aN[1]) - 0.36 * k;   // lowest sole on y=0
    const M = mkM(oy);
    const Minv = invM(M), toPx = p => apM(M, p), toU = p => apM(Minv, p);
    // neck + head (with an optional look-at)
    const neckBase = T(0.0, len.torso - 0.05);
    const headAt = (nA, hA) => { const nt = add(neckBase, up(L * 0.5 + nA), 0.36 * k); const ha = hA + L * 0.3; return { nt, ha, hc: add(add(nt, up(ha), 0.36 * k), [Math.cos(ha), Math.sin(ha)], 0.06) }; };
    let neckA = pose.neck, headA = pose.head; let hd = headAt(neckA, headA);
    if (pose.look) {
      const tu = toU(pose.look); let amt = pose.lookAmt == null ? 1 : pose.lookAmt;
      const dx = tu[0] - hd.hc[0], dy = tu[1] - hd.hc[1]; let want = Math.atan2(dy, dx);
      if (dx < 0) { want = dy < 0 ? -0.6 : 0.85; amt *= 0.5; }      // behind: half a glance toward that side (to really look, turn)
      want = clamp(want, -0.62, 0.9);
      const delta = (want - hd.ha) * amt;
      neckA += delta * 0.3; headA += delta; hd = headAt(neckA, headA);
    }
    const ha = hd.ha, hc = hd.hc;
    const headM = [Math.cos(ha) * k, Math.sin(ha) * k, -Math.sin(ha) * k, Math.cos(ha) * k, hc[0], hc[1]];
    const S0 = T(-0.05, 2.12), S0F = v34 ? T(-0.05 + 0.36 * v34, 2.12 - 0.03 * v34) : S0;
    return { id, D, pose, k, L, sc, len, legN, legF, H, HF, T, kF, aF, kN, aN, oy, M, Minv, toPx, toU, neckBase, neckTop: hd.nt, neckA, headA, ha, hc, headM, S0, S0F, v34,
      shoulder: toPx(S0), head: toPx(hc), headW: compM(M, headM) };
  }

  // ---------- profile figure ----------
  // pose: {x,y,scale,facing,anchor:'feet'|'hip', lean, neck, head (+ = chin down), armN:{a,b,w,hand}, armF:{...}, legN:{a,b}, legF:{a,b}, swing, hem}
  // (+ the film extensions listed at the top of this file)
  function profile(id, pose) {
    const R = skeleton(id, pose); pose = R.pose;
    const D = R.D, k = R.k, L = R.L, sc = R.sc, len = R.len, T = R.T, H = R.H, M = R.M;
    const torso = len.torso, upper = len.upper, fore = len.fore, handL = len.hand;
    const armN = Object.assign({ a: 0.08, b: 0.25, w: 0, hand: 'relaxed' }, pose.armN), armF = Object.assign({ a: -0.05, b: 0.18, w: 0, hand: 'relaxed' }, pose.armF);
    const sh = S(); const details = [];
    const sK = D.shoulderK, cK = D.chestK, hK = D.hipK;
    // legs (far first is irrelevant: all ink)
    function leg(g, K, A, Hp) {
      const wide = D.legs === 'wide'; Hp = Hp || H;
      sh.capsule(Hp[0], Hp[1], 0.44 * hK, K[0], K[1], wide ? 0.3 : 0.27);
      if (wide) { const d = dn(g.a - g.b), p = [d[1], -d[0]]; sh.poly([add(K, p, 0.3), add(A, p, 0.44), add(A, p, -0.36), add(K, p, -0.3)]); }
      else sh.capsule(K[0], K[1], 0.25, A[0], A[1], D.legs === 'slim' ? 0.15 : 0.17);
      // foot
      const fa = g.foot != null ? g.foot : (g.a - g.b) * 0.3; const fx = Math.cos(fa), fy = Math.sin(fa);
      const F = (x, y) => [A[0] + fx * x - fy * y, A[1] + fy * x + fx * y];
      if (D.feet === 'socks') sh.add(smooth(mapPts([[-0.2, -0.05], [0.1, -0.12], [0.6, 0.02], [0.92, 0.16], [0.88, 0.3], [0.3, 0.32], [-0.18, 0.3], [-0.28, 0.12]], F), true));
      else if (D.feet === 'heel') sh.add(smooth(mapPts([[-0.18, -0.08], [0.15, -0.1], [0.62, 0.12], [0.98, 0.26], [0.95, 0.33, 1], [0.4, 0.3], [-0.05, 0.22], [-0.12, 0.38, 1], [-0.22, 0.38, 1], [-0.24, 0.15]], F), true));
      else if (D.feet === 'boot') sh.add(smooth(mapPts([[-0.22, -0.45], [0.16, -0.45], [0.2, -0.05], [0.7, 0.1], [0.98, 0.22], [0.98, 0.36, 1], [-0.24, 0.36, 1], [-0.26, 0.0]], F), true));
      else sh.add(smooth(mapPts([[-0.2, -0.08], [0.15, -0.12], [0.6, 0.06], [1.0, 0.2], [1.0, 0.35, 1], [-0.24, 0.35, 1], [-0.27, 0.1]], F), true));
      return A;
    }
    const aF = leg(R.legF, R.kF, R.aF, R.HF), aN = leg(R.legN, R.kN, R.aN);
    // torso (profile outline in torso frame v=forward, u=up)
    const bust = D.female ? [[0.5 * cK, 1.72], [0.56 * cK, 1.52, 0], [0.42, 1.32]] : [[0.5 * cK, 1.7], [0.48 * cK, 1.42]];
    const tp = [[-0.5 * hK, 0.1], [-0.56 * hK, -0.22], [-0.3, -0.36], [0.2, -0.26], [0.46 * hK, -0.02], [0.42, 0.45], [0.36, 0.95], ...bust,
      [0.4 * cK, 1.98], [0.27, 2.2], [0.12, torso + 0.02], [-0.16, torso + 0.04], [-0.36 * sK, 2.22], [-0.5 * cK, 1.92], [-0.48, 1.45], [-0.39, 0.95], [-0.42, 0.5]];
    sh.add(smooth(tp.map(([v, u]) => T(v, u)), true));
    if (R.v34) {   // three-quarter: the chest and the far shoulder read in front of the near one
      const v3 = R.v34; sh.add(smooth(tp.filter(([v, u]) => u > 0.35).map(([v, u]) => T(v + 0.24 * v3 * clamp((u - 0.35) / 1.2, 0, 1), u)), true));
      sh.circle(...R.S0F, 0.3 * sK);
    }
    // clothing silhouettes
    const hem = pose.hem || 0;
    if (D.clothes === 'jacket') {
      sh.add(smooth([[-0.58, 1.9], [-0.66, 0.6], [-0.7 - hem, -0.62, 1], [-0.2, -0.7 + hem * 0.3], [0.52, -0.6, 1], [0.58, 0.4], [0.62 * cK, 1.6], [0.36, 2.15], [-0.4, 2.2]].map(([v, u]) => T(v, u)), true));
    } else if (D.clothes === 'overshirt') {
      sh.add(smooth([[-0.6, 1.8], [-0.64, 0.4], [-0.66 - hem, -0.42, 1], [-0.1, -0.5], [0.42, -0.4, 1], [0.66, 0.2], [0.66, 0.9, 1], [0.6 * cK + 0.04, 1.65], [0.32, 2.1], [-0.4, 2.2]].map(([v, u]) => T(v, u)), true));
    } else if (D.clothes === 'raincoat') {
      sh.add(smooth([[-0.56, 1.9], [-0.6, 0.5], [-0.64 - hem, -0.55, 1], [0.0, -0.6], [0.5, -0.5, 1], [0.5, 0.5], [0.56 * cK, 1.5], [0.32, 2.1], [-0.36, 2.2]].map(([v, u]) => T(v, u)), true));
      sh.ellipse(...T(-0.42, 2.2), 0.24, 0.34, L + 0.35); // hood bunched at the collar
    } else if (D.clothes === 'blazer') {
      sh.add(smooth([[-0.5, 2.0], [-0.54, 0.5], [-0.56, -0.28, 1], [0.48, -0.22, 1], [0.46, 0.6], [0.54 * cK, 1.5], [0.3, 2.1], [-0.1, 2.38], [-0.44 * sK, 2.18]].map(([v, u]) => T(v, u)), true));
    } else if (D.clothes === 'shirt') {
      sh.add(smooth([[-0.48, 1.6], [-0.5, 0.3], [-0.52, -0.16, 1], [0.44, -0.12, 1], [0.48, 0.5], [0.52, 1.5]].map(([v, u]) => T(v, u)), true));
      // collar points
      sh.poly([T(0.08, 2.42), T(0.32, 2.16), T(0.18, 2.12)]);
    }
    // neck + head
    const neckBase = R.neckBase, neckTop = R.neckTop, ha = R.ha, hc = R.hc;
    sh.capsule(neckBase[0], neckBase[1], 0.3 * k, neckTop[0], neckTop[1], 0.21 * k);
    const headM = R.headM;
    const hairCtl = { swing: pose.swing || 0 };
    if (pose.pony === false) hairCtl.pony = false;
    else if (pose.pony && pose.pony.grip) { hairCtl.grip = apM(invM(headM), R.toU(pose.pony.grip)); hairCtl.plume = pose.pony.plume; }
    if (pose.pony && pose.pony.grip) hairCtl.maxLen = pose.pony.maxLen == null ? 0.8 : pose.pony.maxLen;
    const headSh = (pose.roll ? headRolled(D.face, pose.roll) : headProfile(D.face)).transform(headM), hairSh = hairProfile(D.hair, hairCtl, 1).transform(headM);
    sh.add(headSh); sh.add(hairSh);
    // arms
    const S0 = R.S0;
    function arm(g, Sh) {
      let a = g.a, b = g.b; const up2 = upper * (g.uk || 1), fo2 = fore * (g.fk || 1);   // uk/fk: foreshorten a bone pointing at or away from us
      if (g.to) { const s = ik2(Sh, R.toU(g.to), up2, fo2, g.elbow != null ? g.elbow : (g.side != null ? g.side : -1)); a = s.a; b = s.b; }
      const E = add(Sh, dn(a), up2), W2 = add(E, dn(a + b), fo2);
      sh.capsule(Sh[0], Sh[1], 0.3 * sK, E[0], E[1], 0.19);
      sh.capsule(E[0], E[1], 0.18, W2[0], W2[1], 0.13);
      if (D.clothes === 'shirt') { const cf = add(E, dn(a + b), fo2 * 0.18); sh.circle(cf[0], cf[1], 0.215); }
      let ang = Math.atan2(W2[1] - E[1], W2[0] - E[0]) + (g.w || 0);
      if (g.dir != null) ang = g.dir + (g.w || 0);
      if (g.aim) { const au = R.toU(g.aim); ang = Math.atan2(au[1] - W2[1], au[0] - W2[0]) + (g.w || 0); }
      const hm = [Math.cos(ang) * handL, Math.sin(ang) * handL, -Math.sin(ang) * handL * (g.flip ? -1 : 1), Math.cos(ang) * handL * (g.flip ? -1 : 1), W2[0], W2[1]];
      if (g.hand !== 'none' && g.hand !== false) sh.add(hand(g.hand, g.handOpts).transform(hm));
      return { E, W: W2, ang, hm, a, b, Sh };
    }
    const jF = arm(armF, R.S0F), jN = arm(armN, S0);
    // details (bright accents drawn after the silhouette)
    if (id === 'angelo' && pose.cig !== false) details.push({ kind: 'cigarette', a: [-0.17, 0.02], b: [0.07, -0.05], headM });
    if (id === 'deena') details.push({ kind: 'hoop', c: [-0.05, 0.25], rx: 0.07, ry: 0.12, headM });
    if (id === 'kay') details.push({ kind: 'beads', headM, seed: 3 });
    if (id === 'marina') details.push({ kind: 'rings', hm: jN.hm });
    if (id === 'scott') details.push({ kind: 'cowlick', p: [-0.21, -0.78], headM });
    // final transform: units -> px, facing, anchor (rot, squash)
    const toPx = R.toPx, f = pose.facing;
    const armOut = j => ({ S: toPx(j.Sh), E: toPx(j.E), W: toPx(j.W), ang: j.ang, a: j.a, b: j.b, hm: compM(M, j.hm), len: handL * sc });
    return { id, shape: sh.transform(M), M, details,
      joints: { H: toPx(H), head: toPx(hc), neck: toPx(neckBase), wristN: toPx(jN.W), wristF: toPx(jF.W), elbowN: toPx(jN.E), ankleN: toPx(aN), ankleF: toPx(aF), shoulder: toPx(S0),
        elbowF: toPx(jF.E), kneeN: toPx(R.kN), kneeF: toPx(R.kF), neckTop: toPx(neckTop), chest: toPx(T(0.0, 1.55)), hip: toPx(H) },
      scale: sc, facing: f, headM: compM(M, headM), arms: { N: armOut(jN), F: armOut(jF) },
      parts: { head: S().add(headSh).add(hairSh).transform(M) }, rig: R, pose };
  }

  // ---------- top-down figure (around a table) ----------
  // opts: {x,y,scale,dir (radians, the way the figure faces), hands:[[x,y],[x,y]] world targets (left,right of the figure) or null; false = tucked,
  //        handPose: pose | [left, right] ('tuck' = arm in the lap), spread, foreshorten, headTurn, lean, wrist:[a,b], handOpts:[o,o], elbowK, nose}
  function top(id, o) {
    const D = CHAR[id]; o = Object.assign({ scale: 60, dir: 0, handPose: 'flat' }, o);
    const sc = o.scale, sK = D.shoulderK;
    const cs = Math.cos(o.dir), sn = Math.sin(o.dir);
    const toW = (x, y) => [o.x + (x * cs - y * sn) * sc, o.y + (x * sn + y * cs) * sc];
    const toL = (X, Y) => { const dx = (X - o.x) / sc, dy = (Y - o.y) / sc; return [dx * cs + dy * sn, -dx * sn + dy * cs]; };
    const Mw = [cs * sc, sn * sc, -sn * sc, cs * sc, o.x, o.y];
    const torso = S(), arms = S(), head = S();
    // shoulders & upper back
    torso.add(smooth([[0.2, -1.05 * sK], [0.32, -0.6], [0.35, 0.0], [0.32, 0.6], [0.2, 1.05 * sK], [-0.15, 1.22 * sK], [-0.45, 1.0 * sK], [-0.6, 0.0], [-0.45, -1.0 * sK], [-0.15, -1.22 * sK]], true));
    if (D.chestK > 1.1) torso.ellipse(0.0, 0, 0.5, 1.15 * sK, 0);
    // arms (IK in plane) — left = -y side, right = +y side
    const lens = [1.25 * D.armK, 1.15 * D.armK];
    const out = { hands: [] };
    const poses = Array.isArray(o.handPose) ? o.handPose : [o.handPose, o.handPose];
    [[-1, o.hands && o.hands[0], 0], [1, o.hands && o.hands[1], 1]].forEach(([side, tgt, i]) => {
      const Sx = 0.0, Sy = side * 1.0 * sK; const pose = poses[i];
      if (pose === 'off') { out.hands.push(null); return; }          // no arm at all (hidden, or drawn by the rig)
      const aw = o.armW || 1, hk = 0.75 * (o.handK || 1);
      if (tgt === false || pose === 'tuck') { arms.capsule(Sx, Sy, 0.3 * aw, Sx + 0.42, Sy + side * 0.06, 0.24 * aw); out.hands.push(null); return; }
      let T2 = tgt ? toL(tgt[0], tgt[1]) : [0.9, side * 0.95];
      let dx = T2[0] - Sx, dy = T2[1] - Sy, d = Math.hypot(dx, dy);
      const lu = o.foreshorten ? clamp(d - lens[1] * 0.92, 0.42, lens[0]) : lens[0];   // upper arm foreshortens as it points down at a near target
      const maxd = (lu + lens[1]) * 0.985;
      if (d > maxd) { T2 = [Sx + dx / d * maxd, Sy + dy / d * maxd]; dx = T2[0] - Sx; dy = T2[1] - Sy; d = maxd; }
      const a = Math.atan2(dy, dx); const cosA = clamp((lu * lu + d * d - lens[1] * lens[1]) / (2 * lu * d), -1, 1);
      const ea = a + side * Math.acos(cosA) * (o.elbowK == null ? 0.55 : o.elbowK); // elbow bends outward, softly
      const E = [Sx + Math.cos(ea) * lu, Sy + Math.sin(ea) * lu];
      arms.capsule(Sx, Sy, 0.3 * aw, E[0], E[1], 0.2 * aw); arms.capsule(E[0], E[1], 0.19 * aw, T2[0], T2[1], 0.13 * aw);
      const ha = Math.atan2(T2[1] - E[1], T2[0] - E[0]) + (o.wrist ? o.wrist[i] || 0 : 0);
      const hm = [Math.cos(ha) * hk, Math.sin(ha) * hk, -Math.sin(ha) * hk * side, Math.cos(ha) * hk * side, T2[0], T2[1]];
      if (pose !== 'none') arms.add(hand(pose, Object.assign({ spread: o.spread == null ? 0.03 : o.spread }, o.handOpts && o.handOpts[i])).transform(hm));
      out.hands.push({ side, wrist: toW(T2[0], T2[1]), tip: toW(T2[0] + Math.cos(ha) * 0.8, T2[1] + Math.sin(ha) * 0.8), hm, E: toW(E[0], E[1]), elbow: toW(E[0], E[1]) });
    });
    // head from above (+ nose bump forward)
    head.ellipse(0.18, 0, 0.5, 0.39, 0); if (o.nose !== false) head.ellipse(0.66, 0, 0.09, 0.06, 0);
    // hair from above
    const r = rng('tophair' + id);
    switch (D.hair) {
      case 'christof': for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; head.circle(0.1 + Math.cos(a) * 0.36 + (r() - 0.5) * 0.06, Math.sin(a) * 0.36 + (r() - 0.5) * 0.06, 0.2 + r() * 0.06); } head.circle(0.1, 0, 0.4); break;
      case 'deena': head.ellipse(0.12, 0, 0.5, 0.38, 0); head.add(smooth([[-0.25, -0.1], [-0.6, -0.18], [-1.05, -0.05 + (o.swing || 0)], [-1.3, 0.08 + (o.swing || 0), 1], [-0.95, 0.15], [-0.55, 0.16], [-0.25, 0.1]], true)); break;
      case 'kay': head.add(smooth([[0.45, -0.3], [0.2, -0.5], [-0.3, -0.62], [-0.65, -0.55, 1], [-0.58, -0.25], [-0.78, -0.1, 1], [-0.7, 0.12], [-0.8, 0.3, 1], [-0.6, 0.45], [-0.62, 0.62, 1], [-0.3, 0.6], [0.2, 0.5], [0.45, 0.3]], true)); break;
      case 'marina': head.add(smooth([[0.5, -0.36, 1], [0.0, -0.52], [-0.42, -0.5, 1], [-0.48, 0.0], [-0.42, 0.5, 1], [0.0, 0.52], [0.5, 0.36, 1], [0.55, 0]], true)); break;
      case 'angelo': head.add(smooth([[0.6, -0.2], [0.55, -0.38], [0.1, -0.46], [-0.42, -0.4], [-0.62, 0.0], [-0.42, 0.4], [0.1, 0.46], [0.55, 0.38], [0.6, 0.2]], true)); break;
      case 'scott': head.ellipse(0.14, 0, 0.53, 0.42, 0); head.poly([[-0.28, -0.04], [-0.5, 0.05], [-0.28, 0.08]]); break;
    }
    // head turn (about the neck, between the shoulders) and lean (head pushed forward over the table)
    const ht = o.headTurn || 0, hl = o.lean || 0;
    const HM = [Math.cos(ht), Math.sin(ht), -Math.sin(ht), Math.cos(ht), Math.cos(ht) * hl, Math.sin(ht) * hl];
    const headL = (ht || hl) ? head.transform(HM) : head;
    out.shape = S().add(torso).add(arms).add(headL).transform(Mw);
    out.torso = torso.transform(Mw); out.arms = arms.transform(Mw); out.headShape = headL.transform(Mw);
    const hcL = apM(HM, [0.18, 0]);
    out.head = toW(hcL[0], hcL[1]); out.id = id; out.details = []; out.M = Mw; out.HM = HM; out.toW = toW; out.toL = toL; out.scale = sc;
    if (id === 'marina' && out.hands[1]) out.details.push({ kind: 'rings', hm: out.hands[1].hm, top: true, M: Mw });
    if (id === 'angelo' && o.cig !== false) out.details.push({ kind: 'cigTop', M: (ht || hl) ? compM(Mw, HM) : Mw });
    return out;
  }

  // ---------- bust (front view: the photo, the yard) ----------
  // opts: {x,y (head centre) | waist:[x,y] (tilt about the waist), scale, tilt, armL/armR: undefined (hanging) | false (none) | {to:[x,y], hand, elbow:'out'|'in'}}
  // armL is the arm on screen-left (shoulderL), armR screen-right.
  function bust(id, o) {
    const D = CHAR[id]; o = Object.assign({ scale: 60, tilt: 0 }, o); const sh = S(); const sK = D.shoulderK, cK = D.chestK;
    const k = D.heightK; const ct = Math.cos(o.tilt), st = Math.sin(o.tilt), s0 = o.scale * k;
    let M = [s0 * ct, s0 * st, -s0 * st, s0 * ct, o.x, o.y];
    if (o.waist) { const wl = [0, 3.6]; M[4] = o.waist[0] - (M[0] * wl[0] + M[2] * wl[1]); M[5] = o.waist[1] - (M[1] * wl[0] + M[3] * wl[1]); }
    // head
    const headP = S().add(smooth([[0, -0.52], [0.3, -0.44], [0.38, -0.12], [0.36, 0.16], [0.26, 0.38], [0.0, 0.5 * D.face.chin], [-0.26, 0.38], [-0.36, 0.16], [-0.38, -0.12], [-0.3, -0.44]], true));
    headP.ellipse(0.39, 0.06, 0.06, 0.12, 0.2); headP.ellipse(-0.39, 0.06, 0.06, 0.12, -0.2);
    sh.add(headP);
    sh.capsule(0, 0.35, 0.19, 0, 0.66, 0.22);
    // shoulders / torso: trapezius slope, rounded deltoids, taper to the waist
    const sw = 0.98 * sK;
    const extra = D.clothes === 'jacket' ? 0.08 : D.clothes === 'blazer' ? 0.05 : 0;
    const sq = D.clothes === 'blazer' ? 1 : 0;
    sh.add(smooth([[-0.2, 0.6], [-0.5, 0.78], [-(sw - 0.1), 0.9], [-(sw + extra), 1.12, sq], [-(sw + extra) + 0.02, 1.6], [-0.86 * cK, 2.4], [-0.8, 3.6, 1],
      [0.8, 3.6, 1], [0.86 * cK, 2.4], [(sw + extra) - 0.02, 1.6], [(sw + extra), 1.12, sq], [(sw - 0.1), 0.9], [0.5, 0.78], [0.2, 0.6]], true));
    const armsOut = {};
    [-1, 1].forEach(s => {
      const spec = s < 0 ? o.armL : o.armR;
      if (spec === false || spec === 'none') return;
      if (spec && spec.to) {
        const Sh = [s * (sw - 0.12), 1.2], Tl = apM(invM(M), spec.to);
        const a1 = ik2(Sh, Tl, 1.26, 1.15, 1), a2 = ik2(Sh, Tl, 1.26, 1.15, -1);
        const outward = (q => s * q.E[0]);
        let pick = outward(a1) > outward(a2) ? a1 : a2; if (spec.elbow === 'in') pick = pick === a1 ? a2 : a1;
        if (spec.elbow === 'down') pick = a1.E[1] >= a2.E[1] ? a1 : a2;
        sh.capsule(Sh[0], Sh[1], 0.24, pick.E[0], pick.E[1], 0.17); sh.capsule(pick.E[0], pick.E[1], 0.16, pick.W[0], pick.W[1], 0.13);
        let ha = Math.atan2(pick.W[1] - pick.E[1], pick.W[0] - pick.E[0]) + (spec.w || 0); const hk = 0.62 * (spec.handK || 1), fl = s < 0 ? 1 : -1;
        if (spec.handAng != null) { const ct = Math.cos(o.tilt), st2 = Math.sin(o.tilt); ha = spec.handAng - Math.atan2(st2, ct); }   // screen angle -> bust-local
        const hmL = [Math.cos(ha) * hk, Math.sin(ha) * hk, -Math.sin(ha) * hk * fl, Math.cos(ha) * hk * fl, pick.W[0], pick.W[1]];
        if (spec.hand !== 'none') sh.add(hand(spec.hand || 'relaxed', spec.handOpts).transform(hmL));
        armsOut[s < 0 ? 'L' : 'R'] = { S: apM(M, Sh), E: apM(M, pick.E), W: apM(M, pick.W), hm: hmL, reached: pick.reached };
        return;
      }
      sh.capsule(s * (sw - 0.12), 1.2, 0.24, s * (sw + 0.02), 2.45, 0.17); sh.capsule(s * (sw + 0.02), 2.45, 0.16, s * (sw - 0.04), 3.6, 0.13);
    });
    // hair, front view
    const hairF = S();
    switch (D.hair) {
      case 'scott': hairF.add(smooth([[-0.4, -0.06], [-0.42, -0.38], [-0.2, -0.6], [0.05, -0.62], [0.08, -0.72, 1], [0.13, -0.6], [0.36, -0.5], [0.42, -0.2], [0.38, -0.06], [0.3, -0.3], [0.0, -0.36], [-0.3, -0.3]], true)); break;
      case 'deena': hairF.add(smooth([[-0.4, -0.02], [-0.42, -0.36], [-0.2, -0.6], [0.2, -0.6], [0.42, -0.36], [0.4, -0.02], [0.32, -0.32], [0, -0.42], [-0.32, -0.32]], true)); hairF.ellipse(0, -0.68, 0.14, 0.12, 0); break;
      case 'angelo': hairF.add(smooth([[-0.42, 0.0], [-0.46, -0.4], [-0.25, -0.7], [0.12, -0.76], [0.4, -0.58], [0.47, -0.2], [0.42, 0.0], [0.34, -0.32], [0.05, -0.46], [-0.3, -0.36]], true)); break;
      case 'kay': hairF.add(smooth([[-0.5, 0.78], [-0.36, 0.86, 1], [-0.42, 0.4], [-0.36, -0.08], [-0.2, -0.38], [0.15, -0.4], [0.36, -0.1], [0.42, 0.4], [0.38, 0.86, 1], [0.52, 0.8], [0.56, 0.3], [0.5, -0.32], [0.2, -0.62], [-0.2, -0.62], [-0.5, -0.34], [-0.56, 0.3]], true)); break;
      case 'christof': { const r = rng('bustcurls'); for (let i = 0; i < 18; i++) { const a = Math.PI + i / 17 * Math.PI; hairF.circle(Math.cos(a) * 0.48 + (r() - 0.5) * 0.06, -0.12 + Math.sin(a) * 0.5 + (r() - 0.5) * 0.06, 0.18 + r() * 0.07); } hairF.circle(-0.47, 0.1, 0.17); hairF.circle(0.47, 0.1, 0.17); break; }
      case 'marina': hairF.add(smooth([[-0.52, 0.42, 1], [-0.55, 0.0], [-0.48, -0.42], [-0.2, -0.62], [0.2, -0.62], [0.48, -0.42], [0.55, 0.0], [0.52, 0.42, 1], [0.38, 0.42, 1], [0.38, -0.12, 1], [-0.38, -0.12, 1], [-0.38, 0.42, 1]], true)); break;
    }
    sh.add(hairF);
    const details = [];
    if (id === 'deena') details.push({ kind: 'hoopFront', M });
    if (id === 'angelo' && o.cig !== false) details.push({ kind: 'cigFront', M });
    if (id === 'kay') details.push({ kind: 'beadsFront', M });
    if (id === 'marina') ['L', 'R'].forEach(q => { if (armsOut[q] && armsOut[q].hm) details.push({ kind: 'rings', hm: armsOut[q].hm, bust: true }); });
    return { id, shape: sh.transform(M), M, details, scale: o.scale, arms: armsOut, head: [M[4], M[5]], waist: apM(M, [0, 3.6]), parts: { head: S().add(headP).add(hairF).transform(M) }, chest: apM(M, [0, 2.0]),
      shoulderL: [M[0] * -sw + M[2] * 1.05 + M[4], M[1] * -sw + M[3] * 1.05 + M[5]], shoulderR: [M[0] * sw + M[2] * 1.05 + M[4], M[1] * sw + M[3] * 1.05 + M[5]] };
  }

  // ---------- bright accents ----------
  // opts: rimColor, cigColor, hoopColor, beadColor, ringColor, light:{x,y}|{dx,dy} (puts the hoop's catch-light and Scott's cowlick on the lit side)
  const KAY_BEADS = [[-0.67, 0.28], [-0.69, 0.47], [-0.63, 0.62], [-0.61, 0.02], [-0.5, -0.38], [-0.3, -0.56], [-0.06, -0.62], [0.16, -0.54], [-0.66, 0.12], [-0.42, -0.5]];
  const cigW = sc => Math.max(2, Math.min(sc * 0.05, 3 + sc * 0.015));   // a sliver at every size, never a bar
  function lightAngle(light, p) { if (!light) return null; if (light.dx != null) return Math.atan2(light.dy, light.dx); return Math.atan2(light.y - p[1], light.x - p[0]); }
  function drawDetails(ctx, fig, o) {
    o = o || {}; const rim = o.rimColor || C.tungsten; const sc = fig.scale || 60;
    const ap = apM, comp = compM;
    (fig.details || []).forEach(d => {
      ctx.save();
      if (d.kind === 'cigarette') {
        const m = comp(fig.M, d.headM); const a = ap(m, d.a), b = ap(m, d.b);
        ctx.strokeStyle = o.cigColor || C.cardPaper; ctx.lineCap = 'round'; ctx.lineWidth = cigW(sc); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      } else if (d.kind === 'hoop') {
        const m = comp(fig.M, d.headM); const c = ap(m, d.c); ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(2, sc * 0.035);
        ctx.beginPath(); ctx.ellipse(c[0], c[1], d.rx * sc, d.ry * sc, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = o.hoopColor || rim; ctx.lineWidth = Math.max(1.5, sc * 0.03); ctx.beginPath();
        const la = lightAngle(o.light, c); const mid = la == null ? 0 : la;   // the catch-light sits on the side facing the light
        ctx.ellipse(c[0], c[1], d.rx * sc, d.ry * sc, 0, mid - 0.9, mid + 0.9); ctx.stroke();
      } else if (d.kind === 'beads') {
        const m = comp(fig.M, d.headM); const r = rng('beads' + d.seed); ctx.fillStyle = o.beadColor || C.rainSilver;
        KAY_BEADS.forEach(p => { const q = ap(m, [p[0] + (r() - 0.5) * 0.04, p[1] + (r() - 0.5) * 0.04]); const s = Math.max(1.2, sc * (0.018 + r() * 0.014)); ctx.globalAlpha = 0.6 + r() * 0.4; ctx.beginPath(); ctx.arc(q[0], q[1], s, 0, 7); ctx.fill(); });
      } else if (d.kind === 'rings') {
        const m = d.top ? comp(d.M, d.hm) : comp(fig.M, d.hm); ctx.fillStyle = o.ringColor || '#D4AF5E';
        const rr = d.bust ? Math.max(1.6, Math.hypot(fig.M[0], fig.M[1]) * 0.035) : Math.max(1.3, sc * 0.03);
        (d.bust ? [[0.5, -0.06]] : [[0.5, -0.06], [0.48, 0.05], [0.45, 0.15]]).forEach((p, i) => { const q = ap(m, p); ctx.beginPath(); ctx.arc(q[0], q[1], rr, 0, 7); ctx.fill(); });
      } else if (d.kind === 'cowlick') {
        // the tuft at the crown catches a hairline of light on its lit side (only when the light is known)
        if (o.light || o.cowlick) {
          const m = comp(fig.M, d.headM); const tip = ap(m, d.p), l = ap(m, [-0.165, -0.655]), r2 = ap(m, [-0.255, -0.655]);
          const la = lightAngle(o.light || { dx: 0, dy: -1 }, tip); const lx = Math.cos(la);
          const base = (l[0] - tip[0]) * lx > (r2[0] - tip[0]) * lx ? l : r2;
          ctx.strokeStyle = o.cowlickColor || rim; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.2, sc * 0.016);
          ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.quadraticCurveTo((base[0] + tip[0]) / 2 + lx * sc * 0.01, (base[1] + tip[1]) / 2, tip[0], tip[1]); ctx.stroke();
        }
      } else if (d.kind === 'hoopFront') {
        const la = o.light ? lightAngle(o.light, ap(d.M, [0, 0.3])) : 0;
        [-1, 1].forEach(s => { const c = ap(d.M, [s * 0.42, 0.3]); ctx.strokeStyle = o.hoopColor || rim; ctx.lineWidth = Math.max(1.5, d.M[0] * 0.03); ctx.beginPath(); if (o.light) ctx.ellipse(c[0], c[1], d.M[0] * 0.08, d.M[0] * 0.13, 0, la - 1.1, la + 1.1); else ctx.ellipse(c[0], c[1], d.M[0] * 0.08, d.M[0] * 0.13, 0, 0, Math.PI * 2); ctx.stroke(); });
      } else if (d.kind === 'cigFront') {
        const a = ap(d.M, [-0.43, -0.12]), b = ap(d.M, [-0.6, -0.36]); ctx.strokeStyle = o.cigColor || C.cardPaper; ctx.lineCap = 'round'; ctx.lineWidth = cigW(Math.hypot(d.M[0], d.M[1])); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      } else if (d.kind === 'cigTop') {
        const a = ap(d.M, [0.1, 0.42]), b = ap(d.M, [-0.25, 0.47]); ctx.strokeStyle = o.cigColor || C.cardPaper; ctx.lineCap = 'round'; ctx.lineWidth = cigW(Math.hypot(d.M[0], d.M[1])); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      } else if (d.kind === 'beadsFront') {
        const r = rng('beadsF'); ctx.fillStyle = o.beadColor || C.rainSilver; const s0 = Math.hypot(d.M[0], d.M[1]);
        [[-0.5, -0.3], [-0.36, -0.52], [-0.12, -0.62], [0.16, -0.6], [0.42, -0.42], [0.54, 0.0], [-0.55, 0.12], [0.52, 0.42]].forEach(p => { const q = ap(d.M, p); ctx.globalAlpha = 0.6 + r() * 0.4; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1.2, s0 * (0.016 + r() * 0.012)), 0, 7); ctx.fill(); });
      }
      ctx.restore();
    });
  }

  global.OTM.fig = { CHAR, profile, skeleton, top, bust, hand, headProfile, headRolled, hairProfile, drawDetails, smooth, ik2, yankedPony, M: { ap: apM, comp: compM, inv: invM } };
})(window);
