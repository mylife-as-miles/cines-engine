/* LOOK C puppets: articulated card puppets in STRICT PROFILE (Reiniger), each a tree of separate card parts
   joined by brass split pins; almond eye-HOLES that show the lamp; a brow slit; a mouth slit on a hinged jaw;
   costume filigree cut through the card per character. Plus top-down figures for the overhead table shot.
   Units: 1 = head height. Authored facing right (+x), y down. */
(function (global) {
  'use strict';
  const O = global.OTM, R = global.ROD;
  const { S, rng, vnoise, clamp, lerp } = O;
  const smooth = O.fig.smooth;
  const P = R.P;

  // ---------- matrix helpers ----------
  const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  const rot = a => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
  const tr = (x, y) => [1, 0, 0, 1, x, y];
  const ap = (M, p) => [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]];

  // almond (pointed ends) as a polygon
  function almond(cx, cy, rx, ry, tilt) {
    const pts = []; const n = 18; const c = Math.cos(tilt || 0), s = Math.sin(tilt || 0);
    for (let i = 0; i <= n; i++) { const t = i / n, x = (t * 2 - 1) * rx, y = -ry * Math.pow(Math.sin(Math.PI * t), 0.85) * (1 + 0.15 * (t - 0.5)); pts.push([cx + x * c - y * s, cy + x * s + y * c]); }
    for (let i = n - 1; i > 0; i--) { const t = i / n, x = (t * 2 - 1) * rx, y = ry * 0.82 * Math.pow(Math.sin(Math.PI * t), 0.9); pts.push([cx + x * c - y * s, cy + x * s + y * c]); }
    return pts;
  }
  // a thin curved slit (crescent) from a to b bulging by k, width w
  function slit(a, b, k, w) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); const nx = -dy / l, ny = dx / l;
    const pts = []; const n = 12;
    for (let i = 0; i <= n; i++) { const t = i / n, bx = a[0] + dx * t, by = a[1] + dy * t, bulge = 4 * t * (1 - t) * k, ww = w * Math.sin(Math.PI * t); pts.push([bx + nx * (bulge + ww), by + ny * (bulge + ww)]); }
    for (let i = n - 1; i > 0; i--) { const t = i / n, bx = a[0] + dx * t, by = a[1] + dy * t, bulge = 4 * t * (1 - t) * k, ww = w * Math.sin(Math.PI * t); pts.push([bx + nx * (bulge - ww * 0.2), by + ny * (bulge - ww * 0.2)]); }
    return pts;
  }
  // displace vertices of a shape outward/inward by noise (torn / ragged edges) within a predicate
  function jag(shape, amt, seed, pred) {
    const r = rng('jag' + seed); const out = S();
    shape.polys.forEach(poly => {
      const pts = O.resample(poly, 0.035); const n = pts.length; const np = [];
      for (let i = 0; i < n; i++) {
        const [x, y] = pts[i]; if (pred && !pred(x, y)) { np.push([x, y]); continue; }
        const [xa, ya] = pts[(i - 1 + n) % n], [xb, yb] = pts[(i + 1) % n]; let nx = yb - ya, ny = -(xb - xa); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        const big = vnoise(i * 0.31, 0, 7 + (seed.length || 0)) > 0.62 ? 2.2 : 1;
        const k = (r() - 0.45) * amt * 1.6 * big * (0.5 + vnoise(i * 0.7, 3, 1)); np.push([x + nx * k, y + ny * k]);
      }
      out.poly(np);
    });
    return out;
  }
  // pinking shears: a regular zigzag along an outline
  function pinking(shape, tooth) {
    const out = S();
    shape.polys.forEach(poly => { const pts = O.resample(poly, tooth); const n = pts.length; const np = [];
      for (let i = 0; i < n; i++) { const [x, y] = pts[i]; const [xa, ya] = pts[(i - 1 + n) % n], [xb, yb] = pts[(i + 1) % n]; let nx = yb - ya, ny = -(xb - xa); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; const k = (i % 2 ? 1 : -1) * tooth * 0.55; np.push([x + nx * k, y + ny * k]); }
      out.poly(np); });
    return out;
  }

  // ---------- cast config ----------
  const CAST = {
    scott: { color: P.scott, nose: 1.0, lips: 0.9, chin: 1.0, brow: 1.0, eye: 1.15, legK: 1.0, armK: 1.08, chest: 1.0, back: 1.0, neckL: 1.0 },
    deena: { color: P.deena, nose: 0.8, lips: 1.15, chin: 1.08, brow: 0.96, eye: 0.75, legK: 0.96, armK: 0.96, chest: 0.94, back: 0.92, neckL: 1.0, female: true },
    angelo: { color: P.angelo, nose: 1.15, lips: 0.95, chin: 1.14, brow: 1.06, eye: 0.95, legK: 1.04, armK: 1.06, chest: 1.12, back: 1.12, neckL: 0.9, belly: 1 },
    kay: { color: P.kay, nose: 0.8, lips: 1.1, chin: 0.98, brow: 0.94, eye: 1.25, legK: 1.0, armK: 0.98, chest: 0.94, back: 0.94, neckL: 1.05, female: true },
    christof: { color: P.christof, nose: 1.25, lips: 1.0, chin: 0.95, brow: 1.1, eye: 1.0, legK: 0.96, armK: 1.1, chest: 1.2, back: 1.18, neckL: 0.85 },
    marina: { color: P.marina, nose: 0.98, lips: 1.0, chin: 1.0, brow: 1.0, eye: 0.9, legK: 1.0, armK: 0.98, chest: 0.95, back: 0.94, neckL: 1.25, female: true },
  };

  // ---------- heads (profile, facing right, centre 0,0, height 1; includes the neck piece) ----------
  function headOutline(f) {
    const n = f.nose, l = f.lips, c = f.chin, b = f.brow, nl = f.neckL;
    return smooth([
      [0.02, -0.52], [0.22, -0.47], [0.33, -0.32], [0.37 * b, -0.17], [0.40 * b, -0.075], [0.355, -0.015, 1],
      [0.40 + 0.06 * n, 0.07], [0.48 + 0.09 * n, 0.165, 1], [0.44 + 0.03 * n, 0.205], [0.40, 0.228, 1],
      [0.425 + 0.03 * l, 0.272], [0.405, 0.305, 1], [0.42 + 0.03 * l, 0.338], [0.37, 0.385, 1],
      [0.39 + 0.03 * (c - 1), 0.44], [0.35 + 0.04 * (c - 1), 0.5 + 0.03 * (c - 1)], [0.2, 0.53], [0.1, 0.55],
      [0.1, 0.62 + 0.25 * nl], [0.06, 0.78 + 0.3 * nl, 1], [-0.24, 0.78 + 0.3 * nl, 1], [-0.22, 0.55 + 0.2 * nl],
      [-0.3, 0.3], [-0.43, 0.12], [-0.47, -0.12], [-0.38, -0.38], [-0.2, -0.5],
    ], true);
  }
  function headHoles(f, o) {
    const sh = S(); const ap2 = o.aperture == null ? 1 : o.aperture;
    const ex = 0.245, ey = -0.065;
    sh.poly(almond(ex, ey, 0.072 * f.eye, 0.034 * f.eye * ap2, -0.06));
    // pupil bridge (card left inside the hole) looking forward
    sh.rect(ex + 0.028 * f.eye, ey - 0.06, 0.02, 0.12);
    // brow slit
    const ba = o.brow || 0; const bc = Math.cos(ba), bs = Math.sin(ba); const B = p => [ex + (p[0] * bc - p[1] * bs), ey - 0.075 + (p[0] * bs + p[1] * bc)];
    sh.poly(slit(B([-0.085, 0.012]), B([0.075, -0.004]), -0.018, 0.0075));
    // mouth slit (hinged jaw line)
    sh.poly(slit([0.408, 0.305], [0.31, 0.318], 0.004, 0.006));
    // ear: a C cut
    sh.poly(slit([-0.04, -0.02], [-0.03, 0.15], -0.07, 0.009));
    return sh;
  }
  // hair pieces with lace filigree
  function hair(id, o) {
    const sw = (o && o.swing) || 0; const sh = S(), holes = S();
    switch (id) {
      case 'scott': {
        sh.add(smooth([[0.31, -0.3, 1], [0.36, -0.46], [0.24, -0.6], [0.02, -0.64], [-0.12, -0.63], [-0.16, -0.67], [-0.2, -0.74, 1], [-0.25, -0.67],
          [-0.3, -0.7, 1], [-0.35, -0.62], [-0.49, -0.46], [-0.54, -0.18], [-0.5, 0.06], [-0.42, 0.2, 1], [-0.3, 0.02], [-0.06, -0.12], [0.12, -0.26]], true));
        holes.poly(slit([-0.38, -0.42], [-0.08, -0.56], -0.04, 0.012)); holes.poly(slit([-0.44, -0.2], [-0.2, -0.4], -0.03, 0.011)); holes.poly(slit([0.0, -0.5], [0.24, -0.5], -0.03, 0.01));
        break;
      }
      case 'deena': {
        sh.add(smooth([[0.31, -0.3, 1], [0.32, -0.48], [0.14, -0.61], [-0.15, -0.62], [-0.38, -0.55], [-0.52, -0.3], [-0.5, -0.04], [-0.42, 0.12, 1], [-0.24, -0.02], [0.06, -0.24]], true));
        sh.ellipse(-0.36, -0.74, 0.2, 0.17, -0.4); // high bun
        sh.ellipse(-0.22, -0.63, 0.1, 0.06, -0.3);
        // two loose strands (fringe pieces)
        sh.add(smooth([[-0.45, -0.32], [-0.55, -0.05 + sw], [-0.52, 0.22 + sw, 1], [-0.5, -0.04 + sw], [-0.42, -0.3]], true));
        sh.add(smooth([[0.26, -0.45], [0.36, -0.28 + sw * 0.5], [0.33, -0.12 + sw * 0.5, 1], [0.32, -0.28], [0.22, -0.42]], true));
        holes.circle(-0.36, -0.74, 0.07); holes.circle(-0.36, -0.74, 0.04);
        holes.poly(slit([-0.3, -0.45], [-0.02, -0.56], -0.03, 0.011));
        break;
      }
      case 'angelo': {
        const r = rng('ang-curls'); const base = smooth([[0.3, -0.31, 1], [0.38, -0.46], [0.35, -0.62], [0.18, -0.72], [-0.06, -0.76], [-0.32, -0.68], [-0.52, -0.47], [-0.6, -0.18], [-0.56, 0.08], [-0.44, 0.24, 1], [-0.36, 0.06], [0.0, -0.25]], true);
        sh.add(base);
        const ring = [[0.32, -0.5], [0.22, -0.66], [0.04, -0.75], [-0.16, -0.76], [-0.34, -0.68], [-0.5, -0.52], [-0.59, -0.32], [-0.6, -0.1], [-0.55, 0.1]];
        ring.forEach(([x, y]) => { const rr = 0.1 + r() * 0.04; sh.circle(x + (r() - 0.5) * 0.03, y + (r() - 0.5) * 0.03, rr); holes.circle(x + 0.01, y + 0.01, rr * 0.38); });
        break;
      }
      case 'kay': {
        sh.add(smooth([[0.28, -0.3, 1], [0.31, -0.5], [0.08, -0.63], [-0.26, -0.61], [-0.52, -0.42], [-0.62, -0.1], [-0.66, 0.25], [-0.7, 0.55], [-0.66, 0.78, 1],
          [-0.58, 0.66], [-0.52, 0.84, 1], [-0.46, 0.64], [-0.38, 0.8, 1], [-0.3, 0.55], [-0.2, 0.32], [-0.1, 0.08], [0.02, -0.12], [0.16, -0.22]], true));
        [[-0.55, 0.1], [-0.6, 0.4], [-0.48, 0.55], [-0.4, -0.3], [-0.2, -0.48], [-0.62, 0.62], [-0.35, 0.3]].forEach(([x, y]) => holes.circle(x, y, 0.022));
        break;
      }
      case 'christof': {
        const r = rng('chr-curls'); [[0.2, -0.5, 0.17], [0.02, -0.62, 0.22], [-0.24, -0.62, 0.24], [-0.46, -0.44, 0.23], [-0.56, -0.16, 0.21], [-0.51, 0.1, 0.18], [-0.38, 0.26, 0.13], [0.31, -0.37, 0.12], [0.06, -0.4, 0.22], [-0.22, -0.32, 0.26], [-0.32, 0.0, 0.22], [0.15, -0.28, 0.12]]
          .forEach(([x, y, rr], i) => { sh.circle(x + (r() - 0.5) * 0.04, y + (r() - 0.5) * 0.04, rr); if (i < 7) holes.poly(slit([x - rr * 0.5, y - rr * 0.1], [x + rr * 0.3, y - rr * 0.45], -rr * 0.25, 0.012)); });
        break;
      }
      case 'marina': {
        sh.add(smooth([[0.37, -0.1, 1], [0.38, -0.4], [0.2, -0.62], [-0.12, -0.66], [-0.43, -0.53], [-0.58, -0.24], [-0.6, 0.12], [-0.56, 0.46, 1], [-0.05, 0.46, 1], [-0.04, 0.14], [0.06, -0.08], [0.2, -0.12, 1]], true));
        holes.poly(slit([0.28, -0.5], [-0.45, -0.18], -0.12, 0.012)); // one clean sheen line
        break;
      }
    }
    return { sh, holes };
  }

  // profile hand along +y (down) from the wrist, thumb toward +x. pose: mitten | grip | point | phone | flat | open
  function handShape(pose, o) {
    o = o || {}; const fh = O.fig.hand; let base;
    if (pose === 'none') return S();
    if (pose === 'grip') base = fh('hold'); else if (pose === 'mitten') base = fh('relaxed'); else if (pose === 'side') base = fh('side', { curl: o.curl || 0.1 });
    else if (pose === 'point') { base = fh('hold'); base.capsule(0.45, -0.1, 0.06, 1.0, -0.12, 0.045); }
    else if (pose === 'phone') { base = fh('side', { curl: 0.55 }); }
    else base = fh(pose, o);
    return base.transform([0, 1, -1, 0, 0, 0]);
  }

  // ---------- profile puppet ----------
  // pose: {x,y (hip pivot in px), scale (px per head), facing 1|-1, lean, neck, head, aperture, brow,
  //        armN:{a,b,w,hand}, armF:{...}, legN:{a,b,foot}, legF, torn, costume opts}
  function puppet(id, pose) {
    const D = CAST[id]; pose = Object.assign({ facing: 1, lean: 0, neck: 0, head: 0, scale: 90 }, pose);
    const parts = [], pins = [], details = [];
    const sc = pose.scale, f = pose.facing;
    const G = [sc * f, 0, 0, sc, pose.x, pose.y];
    const push = (name, M, outline, holes, extra) => { parts.push(Object.assign({ name, outline: outline.transform(mul(G, M)), holes: holes ? holes.transform(mul(G, M)) : null }, extra || {})); };
    const pinAt = (M, p, r, extra) => { const q = ap(mul(G, M), p); pins.push(Object.assign({ x: q[0], y: q[1], r: (r || 0.055) * sc }, extra || {})); return q; };

    // torso frame
    const T = rot(pose.lean);
    const ch = D.chest, bk = D.back;
    // torso outline (hip pivot at 0,0)
    let torsoPts;
    if (D.female) torsoPts = [[-0.4 * bk, 0.3], [-0.5 * bk, -0.25], [-0.42 * bk, -0.95], [-0.44 * bk, -1.6], [-0.36 * bk, -2.05], [-0.2, -2.3], [-0.06, -2.4], [0.14, -2.38], [0.3, -2.18], [0.42 * ch, -1.85], [0.5 * ch, -1.55], [0.44 * ch, -1.3], [0.34, -0.9], [0.36, -0.3], [0.32, 0.3], [0.0, 0.42]];
    else torsoPts = [[-0.42 * bk, 0.28], [-0.5 * bk, -0.3], [-0.47 * bk, -1.0], [-0.52 * bk, -1.6], [-0.43 * bk, -2.06], [-0.24, -2.3], [-0.06, -2.42], [0.16, -2.4], [0.33, -2.2], [0.45 * ch, -1.88], [0.47 * ch, -1.4], [0.41 * ch + (D.belly ? 0.12 : 0), -0.75], [0.38 + (D.belly ? 0.06 : 0), -0.2], [0.33, 0.28], [0.0, 0.4]];
    let torso = smooth(torsoPts, true);
    const torsoHoles = S(); const torsoGels = [];
    // costume
    const cos = S();
    if (id === 'scott') {
      // untucked shirt, hem flap hinged at the back hip
      cos.add(smooth([[-0.5, -0.4], [-0.58, 0.2], [-0.6, 0.55, 1], [-0.1, 0.5], [0.38, 0.46, 1], [0.42, -0.2], [0.46, -0.9]], true));
      cos.poly([[0.12, -2.44], [0.36, -2.18], [0.2, -2.12]]); // collar point
      // the house: four-pane windows down the placket
      for (let i = 0; i < 4; i++) { const wy = -1.92 + i * 0.36, wx = 0.2; const s2 = 0.072; [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => torsoHoles.rect(wx - s2 - 0.006 + a * (s2 + 0.012), wy - s2 - 0.006 + b * (s2 + 0.012), s2, s2)); }
    } else if (id === 'angelo') {
      cos.add(smooth([[-0.6 * bk, -2.0], [-0.66 * bk, -0.6], [-0.7, 0.62, 1], [-0.1, 0.66], [0.5, 0.6, 1], [0.6, -0.4], [0.64 * ch, -1.5], [0.4, -2.12], [-0.3, -2.25]], true));
      // card-back lattice on the jacket back (crimson gel behind)
      const lat = S(); const d = 0.13;
      for (let gy = -1.95; gy < 0.45; gy += d * 1.15) for (let gx = -0.62; gx < 0.0; gx += d * 1.15) {
        const cx = gx + ((Math.round((gy + 2) / (d * 1.15)) % 2) ? d * 0.575 : 0); lat.poly([[cx, gy - d * 0.42], [cx + d * 0.36, gy], [cx, gy + d * 0.42], [cx - d * 0.36, gy]]);
      }
      lat.polys.forEach(p => { if (p.every(([x, y]) => x > -0.6 * bk + 0.04 && x < -0.02 && y > -1.95 && y < 0.5)) torsoHoles.poly(p); });
      torsoGels.push({ color: P.angelo, region: S().rect(-0.66 * bk, -2.0, 0.66 * bk, 2.6) });
      cos.poly([[0.28, -2.2], [0.5, -1.6], [0.26, -1.7]]); // hinged lapel
    } else if (id === 'deena') {
      let jk = smooth([[-0.5, -2.05], [-0.56, -0.9], [-0.56, -0.25, 1], [0.46, -0.3, 1], [0.48, -1.0], [0.56 * ch, -1.55], [0.36, -2.15], [-0.2, -2.32]], true);
      cos.add(pinking(jk, pose.pinkTooth || 0.07));
      cos.poly([[0.2, -2.4], [0.5, -2.05], [0.28, -2.02]]); cos.poly([[-0.2, -2.36], [-0.48, -2.12], [-0.26, -2.06]]); // pointed collar
    } else if (id === 'marina') {
      cos.add(smooth([[-0.48, -2.0], [-0.5, -0.4], [-0.56, 0.62, 1], [0.44, 0.62, 1], [0.4, -0.4], [0.5 * ch, -1.5], [0.32, -2.15], [-0.1, -2.38]], true));
      const rings = [[-0.18, -1.55, 0.16], [0.06, -1.25, 0.12], [-0.22, -0.9, 0.13], [0.0, -0.55, 0.15], [-0.2, -0.15, 0.12], [0.1, 0.25, 0.13]];
      rings.forEach(([x, y, r]) => { torsoHoles.ellipse(x, y, r, r, 0); torsoHoles.ellipse(x, y, r - 0.03, r - 0.03, 0); });
    } else if (id === 'kay') {
      cos.add(smooth([[-0.54, -2.0], [-0.6, -0.5], [-0.64, 0.7, 1], [0.0, 0.74], [0.5, 0.66, 1], [0.5, -0.5], [0.56 * ch, -1.5], [0.32, -2.1], [-0.36, -2.22]], true));
      for (let i = 0; i < 9; i++) { const x = -0.45 + (i % 3) * 0.2 + (i / 3 | 0) * 0.08, y = -1.7 + (i / 3 | 0) * 0.6 + (i % 3) * 0.16; torsoHoles.add(smooth([[x, y - 0.07], [x + 0.03, y], [x, y + 0.035], [x - 0.03, y]], true).rotate(-0.4, x, y)); }
    } else if (id === 'christof') {
      cos.add(smooth([[-0.58, -1.9], [-0.64, -0.4], [-0.66, 0.42, 1], [0.0, 0.48], [0.46, 0.42, 1], [0.64, -0.3], [0.62 * ch, -1.5], [0.32, -2.12], [-0.36, -2.24]], true));
      for (let i = 0; i < 9; i++) torsoHoles.circle(-0.56 + i * 0.13, 0.34, 0.035);
    }
    let torsoFull = S().add(torso).add(cos);
    if (pose.torn) torsoFull = jag(torsoFull, pose.torn, id + 'torn', (x, y) => (x < -0.2 && y > -2.0) || y > 0.25);
    // filter holes that would fall outside the card
    push('torso', T, torsoFull, torsoHoles.polys.length ? torsoHoles : null, { gels: torsoGels.map(g2 => ({ color: g2.color, outline: g2.region.transform(mul(G, T)) })) });
    if (id === 'scott') pinAt(T, [-0.5, -0.32], 0.045); // hem-flap hinge

    // neck / head
    const N = ap(T, [0.03, -2.36]);
    const ha = pose.lean * 0.35 + pose.neck + pose.head;
    const hk = pose.headK || 1.1;
    const HM = mul(tr(N[0], N[1]), mul(rot(ha), mul([hk, 0, 0, hk, 0, 0], tr(0.06, -(0.62 + 0.25 * D.neckL)))));
    const hairP = hair(id, { swing: pose.swing });
    let headHole = headHoles(D, pose);
    if (id === 'angelo') for (let i = 0; i < 9; i++) { const t = i / 8; headHole.circle(lerp(0.05, 0.33, t), lerp(0.47, 0.42, t) + 0.025 * Math.sin(t * 3), 0.011); } // stubble pinholes
    push('head', HM, headOutline(D), headHole, { eye: true });
    push('hair', HM, hairP.sh, hairP.holes.polys.length ? hairP.holes : null, { alpha: id === 'kay' ? 0.86 : 1 });
    pinAt(HM, [-0.06, 0.66 + 0.15 * D.neckL], 0.05); // neck pin
    pinAt(HM, [-0.035, 0.065], 0.035, { small: true }); // jaw hinge at the ear
    const eyeW = ap(mul(G, HM), [0.245, -0.065]);
    if (id === 'angelo') details.push({ kind: 'cig', a: ap(mul(G, HM), [-0.2, 0.0]), b: ap(mul(G, HM), [0.06, -0.08]) });
    if (id === 'deena') details.push({ kind: 'hoop', c: ap(mul(G, HM), [-0.04, 0.27]), r: 0.075 * sc });
    if (pose.phone) details.push({ kind: 'phone', a: ap(mul(G, HM), [-0.1, -0.12]), b: ap(mul(G, HM), [0.2, 0.36]) });

    // limbs
    const armK = D.armK, legK = D.legK;
    const UA = 1.32 * armK, FA = 1.18 * armK, HL = 0.78, TH = 1.78 * legK, SH = 1.72 * legK;
    const Sh = [-0.06, -2.06];
    function arm(g, near) {
      g = Object.assign({ a: 0.1, b: 0.2, w: 0, hand: 'mitten' }, g);
      if (g.ik) { // two-bone IK: wrist (or palm) to a world target
        const inv = M => { const det = M[0] * M[3] - M[1] * M[2]; return [M[3] / det, -M[1] / det, -M[2] / det, M[0] / det, (M[2] * M[5] - M[3] * M[4]) / det, (M[1] * M[4] - M[0] * M[5]) / det]; };
        const tl = ap(inv(mul(G, T)), g.ik); const vx = tl[0] - Sh[0], vy = tl[1] - Sh[1]; const reach = FA + HL * (g.palm == null ? 0.35 : g.palm);
        let d = Math.hypot(vx, vy); d = Math.min(d, UA + reach - 0.02); d = Math.max(d, Math.abs(UA - reach) + 0.02);
        const th = Math.atan2(vx, vy); const al = Math.acos(clamp((UA * UA + d * d - reach * reach) / (2 * UA * d), -1, 1));
        g.a = th + (g.bend || -1) * al; const ex = Sh[0] + Math.sin(g.a) * UA, ey = Sh[1] + Math.cos(g.a) * UA;
        const fa = Math.atan2(Sh[0] + vx / Math.hypot(vx, vy) * d - ex, Sh[1] + vy / Math.hypot(vx, vy) * d - ey); g.b = fa - g.a;
      }
      const M0 = mul(T, mul(tr(Sh[0], Sh[1]), rot(-g.a)));
      const up = S(); const sleeve = (id === 'angelo' || id === 'christof') ? 0.29 : 0.25;
      up.capsule(0, 0, sleeve * (id === 'angelo' ? 1.15 : 1), 0, UA, 0.17);
      if (id === 'scott') up.add(S().rect(-0.2, UA - 0.32, 0.4, 0.2).rotate(0, 0, 0)); // rolled sleeve band
      let upF = up; if (id === 'deena') upF = up.add(pinking(S().rect(-0.24, UA - 0.2, 0.48, 0.16), pose.pinkTooth ? pose.pinkTooth * 0.8 : 0.06));
      if (pose.torn && near) upF = jag(upF, pose.torn * 0.7, 'sleeve', (x, y) => y > UA * 0.55);
      const M1 = mul(M0, mul(tr(0, UA), rot(-(g.b))));
      const fo = S(); fo.capsule(0, 0, 0.16, 0, FA, id === 'scott' ? 0.1 : 0.115);
      if (id === 'marina' || id === 'kay' || id === 'deena') fo.add(S().rect(-0.13, FA - 0.18, 0.26, 0.1));
      const foHoles = S();
      if (g.blister) { const r = rng('blister'); for (let i = 0; i < 14; i++) foHoles.circle((r() - 0.5) * 0.14, 0.15 + r() * (FA - 0.35), 0.012 + r() * 0.012); }
      const M2 = mul(M1, mul(tr(0, FA), rot(-(g.w || 0))));
      const hs = handShape(g.hand, g.handOpts).transform([HL * (g.flip ? -1 : 1), 0, 0, HL, 0, 0]);
      const set = near ? 'N' : 'F';
      push('upper' + set, M0, upF, null, { far: !near });
      push('fore' + set, M1, fo, foHoles.polys.length ? foHoles : null, { far: !near, blister: !!g.blister });
      push('hand' + set, M2, hs, null, { far: !near });
      if (near || g.pins) { if (near) pinAt(M0, [0, 0.05], 0.06, { arm: true }); pinAt(M1, [0, 0], 0.05, { arm: true }); if (g.hand !== 'none') pinAt(M2, [0, 0.0], 0.04, { arm: true }); }
      if (id === 'marina' && near && g.hand !== 'none') details.push({ kind: 'rings', pts: [[0.05, 0.5], [-0.02, 0.6], [-0.06, 0.68]].map(p => ap(mul(G, M2), [p[0] * HL, p[1] * HL])) });
      return { M0, M1, M2, wrist: ap(mul(G, M2), [0, 0]), tip: ap(mul(G, M2), [0, HL]) };
    }
    function leg(g, near) {
      g = Object.assign({ a: 0.05, b: 0.05, foot: 0 }, g);
      const M0 = mul(T, rot(-g.a)), M1 = mul(M0, mul(tr(0, TH), rot(g.b)));
      const th = S(); th.capsule(0, 0, 0.42 * D.back, 0, TH, 0.26);
      const sn = S(); sn.capsule(0, 0, 0.24, 0, SH, 0.15);
      // foot (sock / shoe / heel / boot) pointing forward
      const fM = mul(M1, mul(tr(0, SH), rot(g.foot || 0)));
      let ft;
      if (pose.socks) ft = smooth([[-0.18, -0.1], [0.12, -0.14], [0.6, 0.0], [0.9, 0.12], [0.86, 0.26], [0.3, 0.28], [-0.16, 0.26], [-0.24, 0.1]], true);
      else if (D.female) ft = smooth([[-0.16, -0.1], [0.15, -0.1], [0.62, 0.12], [0.96, 0.24], [0.92, 0.32, 1], [0.38, 0.28], [-0.04, 0.22], [-0.1, 0.36, 1], [-0.2, 0.36, 1], [-0.22, 0.12]], true);
      else ft = smooth([[-0.2, -0.12], [0.15, -0.14], [0.6, 0.04], [1.0, 0.18], [1.0, 0.33, 1], [-0.24, 0.33, 1], [-0.26, 0.08]], true);
      const set = near ? 'N' : 'F';
      push('thigh' + set, M0, th, null, { far: !near }); push('shin' + set, M1, sn, null, { far: !near }); push('foot' + set, fM, ft, null, { far: !near });
      if (near) { pinAt(M0, [0, 0.05], 0.065); pinAt(M1, [0, 0], 0.055); }
      return { knee: ap(mul(G, M1), [0, 0]), ankle: ap(mul(G, fM), [0, 0]) };
    }
    // draw order: far arm, far leg, torso (already pushed), near leg, head, near arm.
    const torsoPart = parts[0], headPart = [parts[1], parts[2]];
    parts.length = 0;
    const aF = arm(pose.armF, false); const farArm = parts.splice(0);
    const lF = leg(pose.legF, false); const farLeg = parts.splice(0);
    const lN = leg(pose.legN, true); const nearLeg = parts.splice(0);
    const aN = arm(pose.armN, true); const nearArm = parts.splice(0);
    // re-push torso/head/hair
    const all = [...farArm, ...farLeg, torsoPart, ...nearLeg, ...headPart, ...nearArm];
    if (pose.order === 'armBehindHead') { all.splice(all.indexOf(headPart[0]), 2); all.push(...headPart); }
    const grip = ap(mul(G, T), pose.grip || [-0.4 * D.back, -1.3]);
    return { id, parts: all, pins, details, grip, eye: eyeW, joints: { handN: aN.tip, wristN: aN.wrist, handF: aF.tip, wristF: aF.wrist, kneeN: lN.knee, ankleN: lN.ankle, neck: ap(G, N), head: ap(mul(G, HM), [0, 0]), ear: ap(mul(G, HM), [0.05, 0.14]), phoneLow: ap(mul(G, HM), [0.16, 0.36]), mouth: ap(mul(G, HM), [0.42, 0.3]), nose: ap(mul(G, HM), [0.56, 0.17]), crown: ap(mul(G, HM), [0, -0.6]), hip: [pose.x, pose.y] }, color: D.color, scale: sc, facing: f, G, T, HM };
  }

  // draw a puppet onto its own plane layer and commit it to the stage
  function draw(st, pup, o) {
    o = o || {}; const L = st.layer(); const sc = pup.scale;
    const under = new Path2D(); const rough = o.rough == null ? 0.5 : o.rough; let k = 0;
    pup.parts.forEach(pt => {
      const outline = pt.outline.path(rough, 11 + k);
      const holes = pt.holes ? pt.holes.path(0.15, 3 + k) : null;
      const hz = (o.hide2 && o.hide2.parts.test(pt.name)) ? o.hide2 : (o.hide && o.hide.parts.test(pt.name)) ? o.hide : null;
      if (hz) {
        if (!draw._hc) draw._hc = O.makeCanvas(O.W, O.H); const T = draw._hc.getContext('2d'); T.setTransform(1, 0, 0, 1, 0, 0); T.globalCompositeOperation = 'source-over'; T.globalAlpha = 1; T.clearRect(0, 0, O.W, O.H);
        R.piece(T, outline, holes, { alpha: pt.alpha, fill: o.fill }); if (k > 0 && o.seams !== false) R.seam(T, outline, under, { color: o.seamColor, w: o.seamW });
        T.globalCompositeOperation = 'destination-out'; T.fill(hz.path); T.globalCompositeOperation = 'source-over';
        L.drawImage(draw._hc, 0, 0);
      } else {
        R.piece(L, outline, holes, { alpha: pt.alpha, fill: o.fill });
        if (k > 0 && o.seams !== false) R.seam(L, outline, under, { color: o.seamColor, w: o.seamW });
      }
      // keep union of outlines for later seams
      pt.outline.polys.forEach(() => {}); under.addPath(outline); k++;
    });
    // gels behind cutouts (eg Angelo's crimson lattice) are passed to commit
    const gels = []; pup.parts.forEach(pt => (pt.gels || []).forEach(g2 => gels.push({ path: g2.outline.path(0, 1), color: g2.color, alpha: 0.85, glow: 0.3 })));
    const c = Object.assign({ from: pup.joints.neck, shadow: { d: o.shadowD || 12, blur: o.shadowBlur || 9, alpha: o.shadowA || 0.34 }, rim: { w: o.rimW || 2.2, color: o.rimColor || P.lampCore, alpha: o.rimA || 0.85 }, gels }, o.commit || {});
    st.commit(L, c);
    // eye glow (the lamp seen through the eye hole)
    if (o.eyeGlow !== false) { st.em.save(); st.em.fillStyle = o.eyeColor || P.lampCore; st.em.globalAlpha = 1; st.em.beginPath(); st.em.ellipse(pup.eye[0], pup.eye[1], sc * 0.09, sc * 0.045, 0, 0, 7); st.em.fill(); st.em.restore();
      const gg = st.ctx; gg.save(); gg.globalCompositeOperation = 'screen'; gg.fillStyle = R.rgba(o.eyeColor || P.lampCore, 0.35); gg.beginPath(); gg.ellipse(pup.eye[0], pup.eye[1], sc * 0.05, sc * 0.022, 0, 0, 7); gg.fill(); gg.restore(); }
    // details
    const g = st.ctx;
    pup.details.forEach(d => {
      if (d.kind === 'cig') { g.save(); g.lineCap = 'butt'; g.strokeStyle = P.bone; g.lineWidth = sc * 0.045; g.beginPath(); g.moveTo(d.a[0], d.a[1]); g.lineTo(d.b[0], d.b[1]); g.stroke();
        g.strokeStyle = '#C9A877'; g.beginPath(); const t = 0.72; g.moveTo(lerp(d.a[0], d.b[0], t), lerp(d.a[1], d.b[1], t)); g.lineTo(d.b[0], d.b[1]); g.stroke(); g.restore(); }
      if (d.kind === 'hoop') { const hr = d.r * (o.hoopK || 1); g.save(); g.strokeStyle = P.ink; g.lineWidth = Math.max(3, sc * 0.05); g.beginPath(); g.arc(d.c[0], d.c[1] + hr * 0.4, hr, 0, 7); g.stroke(); if (o.hoopK) { g.strokeStyle = P.lampCore; g.lineWidth = Math.max(1.6, sc * 0.022); g.beginPath(); g.arc(d.c[0], d.c[1] + hr * 0.4, hr, 0, 7); g.stroke(); st.em.strokeStyle = P.lampCore; st.em.lineWidth = 6; st.em.beginPath(); st.em.arc(d.c[0], d.c[1] + hr * 0.4, hr, 0, 7); st.em.stroke(); } else { g.strokeStyle = 'rgba(255,220,160,0.6)'; g.lineWidth = 1; g.beginPath(); g.arc(d.c[0], d.c[1], d.r + sc * 0.012, -2.4, -1.2); g.stroke(); } g.restore(); }
      if (d.kind === 'phone') {
        const ang = Math.atan2(d.b[1] - d.a[1], d.b[0] - d.a[0]), len = Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]), wd = sc * 0.15;
        g.save(); g.translate(d.a[0], d.a[1]); g.rotate(ang);
        g.shadowColor = R.rgba(P.phone, 0.9); g.shadowBlur = 16; g.fillStyle = P.ink; g.beginPath(); g.roundRect(0, -wd / 2, len, wd, 4); g.fill(); g.shadowColor = 'transparent';
        g.strokeStyle = P.phone; g.lineWidth = 2.2; g.beginPath(); g.roundRect(1, -wd / 2 + 1, len - 2, wd - 2, 4); g.stroke();
        g.fillStyle = R.rgba(P.phone, 0.85); g.fillRect(len * 0.12, -wd / 2 + 2, len * 0.76, 2.2);
        g.restore();
        st.em.save(); st.em.translate(d.a[0], d.a[1]); st.em.rotate(ang); st.em.fillStyle = P.phone; st.em.globalAlpha = 0.95; st.em.fillRect(-4, -wd * 0.9, len + 8, wd * 1.8); st.em.restore();
      }
      if (d.kind === 'rings') d.pts.forEach(p => { const rr = d.r || sc * 0.022; g.save(); g.strokeStyle = P.lampCore; g.lineWidth = Math.max(2, rr * 0.55); g.beginPath(); g.arc(p[0], p[1], rr, 0, 7); g.stroke(); g.restore(); st.em.strokeStyle = P.lampCore; st.em.lineWidth = rr * 1.4; st.em.beginPath(); st.em.arc(p[0], p[1], rr, 0, 7); st.em.stroke(); });
      if (d.kind === 'glint') { g.save(); if (d.ring) { g.strokeStyle = 'rgba(255,244,224,0.95)'; g.lineWidth = Math.max(1.6, d.r * 0.32); g.beginPath(); g.arc(d.c[0], d.c[1], d.r * 0.82, -2.6, -0.6); g.stroke(); } else { g.fillStyle = P.lampCore; g.beginPath(); g.arc(d.c[0], d.c[1], Math.max(1.6, d.r * 0.75), 0, 7); g.fill(); } g.restore();
        st.em.fillStyle = P.lampCore; st.em.beginPath(); st.em.arc(d.c[0], d.c[1], d.r * 1.6, 0, 7); st.em.fill(); }
    });
    if (o.pins !== false) pup.pins.forEach(p => { if (o.hide && g.isPointInPath(o.hide.path, p.x, p.y) && !p.arm) return; R.pin(g, p.x, p.y, Math.max(3, p.r), { legs: !p.small }); });
  }


  // ---------- top-down figure for the overhead table shot (the only top-down shot so far) ----------
  // o: {x,y, dir (radians the figure faces), scale, hands:[[x,y]|null,[x,y]|null] world wrist targets (their left, right), handPose:[..], grip:[lx,ly],
  //     reachK:[k,k] arm length multipliers, handK:[k,k], chair:true|false, headK, hole:true (a figure-shaped absence: no chair, no props)}
  function topFig(id, o) {
    const D = CAST[id] || CAST.scott; o = Object.assign({ scale: 64, dir: 0, handPose: ['flat', 'flat'], chair: true, headK: 1.3, headX: 0.6 }, o);
    const sc = o.scale; const cs = Math.cos(o.dir), sn = Math.sin(o.dir);
    const G = [cs * sc, sn * sc, -sn * sc, cs * sc, o.x, o.y];
    const parts = [], pins = [], details = [];
    const push = (name, M, outline, holes, extra) => parts.push(Object.assign({ name, outline: outline.transform(mul(G, M)), holes: holes ? holes.transform(mul(G, M)) : null }, extra || {}));
    const pinAt = (M, p, r) => { const q = ap(mul(G, M), p); pins.push({ x: q[0], y: q[1], r: r * sc }); return q; };
    const toL = (X, Y) => { const dx = (X - o.x) / sc, dy = (Y - o.y) / sc; return [dx * cs + dy * sn, -dx * sn + dy * cs]; };
    const I = [1, 0, 0, 1, 0, 0]; const sK = D.back;
    // chair seen from above: a straight back rail with spindle slots, two side rails of the seat, knobbed posts (a plan-view chair)
    if (o.chair && !o.hole) {
      const ch = S(), chH = S();
      ch.add(smooth([[-1.08, -1.34, 1], [-0.84, -1.34, 1], [-0.84, 1.34, 1], [-1.08, 1.34, 1]], true));
      ch.rect(-1.0, -1.42, 1.56, 0.16); ch.rect(-1.0, 1.26, 1.56, 0.16);
      [[-0.96, -1.34], [-0.96, 1.34], [0.5, -1.34], [0.5, 1.34]].forEach(([x, y]) => ch.circle(x, y, 0.15));
      [-0.8, -0.4, 0, 0.4, 0.8].forEach(y => chH.add(smooth([[-1.02, y - 0.11, 1], [-0.9, y - 0.11, 1], [-0.9, y + 0.11, 1], [-1.02, y + 0.11, 1]], true)));
      [[-0.96, -1.34], [-0.96, 1.34], [0.5, -1.34], [0.5, 1.34]].forEach(([x, y]) => chH.circle(x, y, 0.05));
      push('chair', I, ch, chH, { alpha: 1 });
    }
    // shoulders / back
    let back = smooth([[0.3, -0.95 * sK], [0.4, -0.45], [0.42, 0], [0.4, 0.45], [0.3, 0.95 * sK], [0.06, 1.2 * sK], [-0.3, 1.14 * sK], [-0.56, 0.72 * sK], [-0.64, 0], [-0.56, -0.72 * sK], [-0.3, -1.14 * sK], [0.06, -1.2 * sK]], true);
    if (id === 'deena' && !o.hole) back = pinking(back, 0.11);
    const bh = S(); const gels = []; const backGel = col => gels.push({ color: col, outline: back.transform(G) });
    if (!o.hole) {
      if (id === 'angelo') { const d = 0.17; for (let gx = -0.56; gx < 0.06; gx += d * 1.05) for (let gy = -1.0; gy < 1.01; gy += d * 1.05) { const cx = gx, cy = gy + ((Math.round((gx + 1) / (d * 1.05)) % 2) ? d * 0.52 : 0); if (Math.abs(cy) < 0.95 * sK && cx > -0.54 && cx < 0.06) bh.poly([[cx - d * 0.42, cy], [cx, cy - d * 0.36], [cx + d * 0.42, cy], [cx, cy + d * 0.36]]); } backGel(P.angelo); }
      if (id === 'marina') { [[-0.3, -0.62, 0.22], [-0.18, 0.46, 0.21], [-0.44, 0.08, 0.16], [0.02, -0.2, 0.15], [-0.24, 0.9, 0.12], [0.08, 0.86, 0.12]].forEach(([x, y, r]) => { bh.circle(x, y, r); bh.circle(x, y, r - 0.05); }); backGel('#C9CBCE'); }
      if (id === 'kay') { for (let i = 0; i < 8; i++) { const x = -0.42 + (i % 2) * 0.26 + (i / 4 | 0) * 0.1, y = -0.86 + (i % 4) * 0.5; bh.add(smooth([[x - 0.11, y], [x - 0.02, y - 0.05], [x + 0.055, y, 1], [x - 0.02, y + 0.05]], true).rotate(-0.5, x, y)); } backGel('#6E9CCB'); }
      if (id === 'christof') { for (let i = 0; i < 13; i++) { const a = -1.3 + i * (2.6 / 12); bh.circle(-0.52 * Math.cos(a) + 0.02, 1.0 * Math.sin(a) * sK, 0.065); } backGel('#9A4C93'); }
      if (id === 'scott') { [[-0.36, -0.62], [-0.36, 0.62], [-0.02, -0.72], [-0.02, 0.72]].forEach(([wx, wy]) => { const s2 = 0.095; [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => bh.rect(wx - s2 - 0.01 + a * (s2 + 0.02), wy - s2 - 0.01 + b * (s2 + 0.02), s2, s2)); }); backGel('#F0B04A'); }
      if (id === 'deena') { for (let i = 0; i < 7; i++) { const y = -0.78 + i * 0.26; bh.poly([[-0.36, y - 0.08], [-0.18, y], [-0.36, y + 0.08]]); bh.poly([[-0.02, y - 0.08], [0.16, y], [-0.02, y + 0.08]]); } backGel('#3F8A6C'); }
    }
    push('back', I, back, bh.polys.length ? bh : null, { gels });
    // arms (planar 2-bone IK), elbows bow outward
    const hands = []; const shoulders = [];
    [[-1, 0], [1, 1]].forEach(([side, idx]) => {
      const rk = o.reachK ? (o.reachK[idx] || 1) : 1; const UA = 1.22 * D.armK * rk, FA = 1.12 * D.armK * rk, HL = 0.66 * (o.handK ? (o.handK[idx] || 1) : 1);
      const tgt = o.hands && o.hands[idx]; const Sx = 0.02, Sy = side * 0.98 * sK;
      let T2 = tgt ? toL(tgt[0], tgt[1]) : [0.75, side * 0.9];
      let dx = T2[0] - Sx, dy = T2[1] - Sy, d = Math.hypot(dx, dy); const maxd = (UA + FA) * 0.985;
      if (d > maxd) { T2 = [Sx + dx / d * maxd, Sy + dy / d * maxd]; dx = T2[0] - Sx; dy = T2[1] - Sy; d = maxd; }
      const a = Math.atan2(dy, dx); const ca = clamp((UA * UA + d * d - FA * FA) / (2 * UA * d), -1, 1);
      const ea = a + side * Math.acos(ca); const E = [Sx + Math.cos(ea) * UA, Sy + Math.sin(ea) * UA];
      const up = S(); up.capsule(Sx, Sy, 0.31, E[0], E[1], 0.21);
      const fo = S(); fo.capsule(E[0], E[1], 0.2, T2[0], T2[1], 0.14);
      if (id === 'angelo' && !o.hole) fo.add(S().capsule(T2[0] - (T2[0] - E[0]) * 0.18, T2[1] - (T2[1] - E[1]) * 0.18, 0.15, T2[0] - (T2[0] - E[0]) * 0.05, T2[1] - (T2[1] - E[1]) * 0.05, 0.15));
      const ha = Math.atan2(T2[1] - E[1], T2[0] - E[0]) + (o.handRot ? o.handRot[idx] || 0 : 0);
      const hm = [Math.cos(ha) * HL, Math.sin(ha) * HL, -Math.sin(ha) * HL * side, Math.cos(ha) * HL * side, T2[0], T2[1]];
      const pose = o.handPose[idx] || 'flat';
      const hsh = pose === 'none' ? S() : O.fig.hand(pose, { spread: 0.04 }); if (pose === 'point') hsh.capsule(0.47, -0.17, 0.066, 1.12, -0.2, 0.05); const hs = hsh.transform(hm);
      push('up' + idx, I, up); push('fo' + idx, I, fo); if (pose !== 'none') push('hand' + idx, I, hs);
      shoulders.push(pinAt(I, [Sx + (E[0] - Sx) * 0.08, Sy + (E[1] - Sy) * 0.08], 0.06)); pinAt(I, E, 0.05); pinAt(I, T2, 0.04);
      hands.push({ wrist: ap(G, T2), tip: ap(G, [T2[0] + Math.cos(ha) * HL * 0.95, T2[1] + Math.sin(ha) * HL * 0.95]), ang: ha + o.dir, hm: mul(G, hm), elbow: ap(G, E) });
      if (id === 'marina' && pose !== 'none' && !o.hole) details.push({ kind: 'rings', r: 0.045 * sc, pts: [[0.62, -0.06], [0.6, 0.05], [0.56, 0.15]].map(p => ap(mul(G, hm), p)) });
    });
    // head from above (+ nose, ears) and a hair piece that tells you who it is
    const hk = o.headK; const HM = [hk, 0, 0, hk, o.headX - 0.16 * hk, 0];
    const head = S(); head.ellipse(0.16, 0, 0.52, 0.44, 0); head.ellipse(0.62, 0, 0.1, 0.07, 0); head.ellipse(0.14, 0.41, 0.07, 0.1, 0); head.ellipse(0.14, -0.41, 0.07, 0.1, 0);
    const hr = S(), hh = S(); const r = rng('top' + id); const glints = [];
    if (!o.hole) switch (id) {
      case 'scott': hr.ellipse(0.08, 0, 0.5, 0.43, 0); for (let i = 0; i < 7; i++) { const a = Math.PI * 0.55 + i * 0.13; hr.poly([[0.08 + Math.cos(a) * 0.36, Math.sin(a) * 0.3 - 0.16], [0.08 + Math.cos(a) * 0.66, Math.sin(a) * 0.5 - 0.14], [0.08 + Math.cos(a + 0.09) * 0.36, Math.sin(a + 0.09) * 0.3 - 0.12]]); }
        hh.poly(slit([-0.25, -0.22], [0.26, -0.18], 0.05, 0.04)); hh.poly(slit([-0.28, 0.12], [0.22, 0.2], -0.05, 0.04)); hh.poly(slit([-0.3, -0.04], [0.1, -0.02], 0.02, 0.035)); break;
      case 'deena': hr.ellipse(0.1, 0, 0.5, 0.41, 0); hr.circle(-0.42, 0, 0.27); hh.circle(-0.42, 0, 0.13); hh.circle(-0.42, 0, 0.075);
        hh.poly(slit([0.4, -0.06], [-0.2, -0.3], 0.06, 0.04)); hh.poly(slit([0.4, 0.06], [-0.2, 0.3], -0.06, 0.04));
        // hoop earrings: card rings standing off each ear, the lamp glinting through them
        [-1, 1].forEach(sd => { hr.circle(0.14, sd * 0.56, 0.13); hh.circle(0.14, sd * 0.56, 0.085); glints.push([0.14, sd * 0.56, 0.085, 'ring']); }); break;
      case 'angelo': hr.ellipse(0.08, 0, 0.5, 0.44, 0); for (let i = 0; i < 15; i++) { const a = i / 15 * Math.PI * 2; const cx = 0.06 + Math.cos(a) * 0.46, cy = Math.sin(a) * 0.42; hr.circle(cx, cy, 0.15); hh.circle(cx + 0.015, cy, 0.055); } break;
      case 'kay': hr.add(smooth([[0.5, -0.34], [0.2, -0.5], [-0.24, -0.6], [-0.62, -0.62, 1], [-0.56, -0.3], [-0.78, -0.12, 1], [-0.64, 0.1], [-0.8, 0.34, 1], [-0.6, 0.46], [-0.66, 0.66, 1], [-0.24, 0.6], [0.2, 0.5], [0.5, 0.34]], true));
        [[-0.42, -0.36], [-0.6, 0.05], [-0.36, 0.34], [-0.12, -0.14], [-0.5, 0.5], [0.06, 0.3], [-0.6, -0.42], [-0.24, 0.08], [0.2, -0.3]].forEach(([x, y]) => { hh.circle(x, y, 0.045); glints.push([x, y, 0.045, 'dot']); }); break;
      case 'christof': for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2 * 1.6; const rr2 = 0.16 + (i / 22) * 0.36; const cx = 0.06 + Math.cos(a) * rr2, cy = Math.sin(a) * rr2 * 0.92; hr.circle(cx, cy, 0.13 + r() * 0.05); hh.circle(cx + 0.01, cy - 0.01, 0.045); } break;
      case 'marina': hr.add(smooth([[0.52, -0.42, 1], [0.0, -0.54], [-0.5, -0.52, 1], [-0.58, 0.0], [-0.5, 0.52, 1], [0.0, 0.54], [0.52, 0.42, 1], [0.6, 0]], true)); hh.poly(slit([0.44, -0.3], [-0.42, -0.34], -0.06, 0.04)); hh.poly(slit([0.44, 0.3], [-0.42, 0.34], 0.06, 0.04)); hh.poly(slit([0.5, 0.0], [-0.48, 0.0], 0.0, 0.028)); break;
    }
    push('head', HM, head, hh.polys.length ? hh : null);   // the hair's lace is cut through the head card too, so it shows
    if (hr.polys.length) push('hair', HM, hr, hh.polys.length ? hh : null, { alpha: id === 'kay' ? 0.88 : 1 });
    glints.forEach(([x, y, rr, kind]) => details.push({ kind: 'glint', c: ap(mul(G, HM), [x, y]), r: rr * sc * hk, ring: kind === 'ring' }));
    if (id === 'angelo' && !o.hole) details.push({ kind: 'cig', a: ap(mul(G, HM), [0.24, 0.6]), b: ap(mul(G, HM), [-0.16, 0.66]) });
    const grip = ap(G, o.grip || [-0.4, 0]);
    // union outline (for a figure-shaped hole)
    const union = S(); parts.forEach(p => { if (p.name !== 'chair') union.add(p.outline); });
    return { id, parts, pins, details, grip, eye: ap(G, [0.5, 0]), hands, shoulders, union, joints: { neck: ap(G, [0, 0]), head: ap(mul(G, HM), [0.16, 0]) }, color: D.color, scale: sc, G };
  }

  // two hands clasped (pinned together with one split pin): x,y centre, a = angle of the link (from hand A to hand B), sc = px per head
  function clasp(st, x, y, a, sc, o) {
    o = o || {}; const L = st.layer(); const sh = S();
    // hand A from the left: palm + four finger scallops wrapping over B's knuckles
    sh.add(smooth([[-0.62, -0.17], [-0.12, -0.21], [0.08, -0.2], [0.2, -0.12], [0.22, 0.02], [0.1, 0.12], [-0.12, 0.16], [-0.62, 0.15]], true));
    [-0.02, 0.07, 0.15].forEach((fx, i) => sh.circle(fx + 0.06, -0.15 + i * 0.012, 0.075));
    sh.capsule(-0.36, -0.18, 0.07, -0.12, -0.3, 0.05); // thumb A over the top
    // hand B from the right, fingers wrapping under
    sh.add(smooth([[0.62, 0.17], [0.12, 0.21], [-0.08, 0.2], [-0.2, 0.12], [-0.22, -0.02], [-0.1, -0.12], [0.12, -0.16], [0.62, -0.15]], true));
    [0.02, -0.07, -0.15].forEach((fx, i) => sh.circle(fx - 0.06, 0.15 - i * 0.012, 0.075));
    sh.capsule(0.36, 0.18, 0.07, 0.12, 0.3, 0.05);
    const c = Math.cos(a), s2 = Math.sin(a); const M = [c * sc, s2 * sc, -s2 * sc, c * sc, x, y];
    const hp = sh.transform(M);
    // finger slits so the interlock reads
    const slits = S(); [-0.02, 0.07, 0.16].forEach(fx => slits.poly(slit([fx + 0.0, -0.06], [fx + 0.03, -0.2], 0.01, 0.008)));
    [0.02, -0.07, -0.16].forEach(fx => slits.poly(slit([fx, 0.06], [fx - 0.03, 0.2], -0.01, 0.008)));
    R.piece(L, hp.path(0.3, 4), slits.transform(M).path(0.05, 1));
    st.commit(L, { from: [x, y], shadow: { d: 8, blur: 7, alpha: 0.35 }, rim: { w: 1.8, color: P.lampCore, alpha: 0.8 } });
    if (o.rings) o.rings.forEach(p => { const q = ap(M, p); const g = st.ctx; const rr = o.ringR || sc * 0.06; g.save(); g.strokeStyle = P.lampCore; g.lineWidth = o.ringW || 3; g.beginPath(); g.ellipse(q[0], q[1], rr * 0.7, rr, a, 0, 7); g.stroke(); g.restore(); st.em.save(); st.em.strokeStyle = P.lampCore; st.em.lineWidth = 7; st.em.beginPath(); st.em.ellipse(q[0], q[1], rr * 0.7, rr, a, 0, 7); st.em.stroke(); st.em.restore(); });
    R.pin(st.ctx, x, y, Math.max(4, sc * 0.065), { legs: false });
    return { a: ap(M, [-0.6, 0]), b: ap(M, [0.6, 0]) };
  }
  global.ROD.puppet = puppet; global.ROD.topFig = topFig; global.ROD.clasp = clasp; global.ROD.drawPuppet = draw; global.ROD.CAST = CAST; global.ROD.handShape = handShape;
  global.ROD.geom = { mul, rot, tr, ap, almond, slit, jag, pinking, smooth };
})(window);
