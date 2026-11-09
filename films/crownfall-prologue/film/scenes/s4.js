/* Scene 4: The Ford [L22–L25]. Hildmere's riders bring a sealed challenge to Ealdholt's gate; the seal breaks on an
   inked board, and the ink becomes the living board laid in the meadow by the ford, where the pieces take their places.
   Then the move, shown as a diagram with living pieces (verified with a small engine):
     1. dxe4    Cael, the d-pawn, steps aside and takes; the d-file opens ("he gave ground")
     1... Rd2   Hildmere's champion, the rook, charges the whole open file into Ealdholt's camp
     2. Nd5!    the knight lands on the file behind him: the door. It is guarded by Cael (e4), and it unmasks the bishop
                on b4, which now strikes d2 through c3. Every square the rook can reach is covered (d1, c2, e2, d3, d4;
                b2 and f2 are guarded pawns), so the champion is lost.
     2... Rxd5  he strikes at the door;   3. exd5  and Cael takes the champion, standing in the file again.
   Hildmere's king kneels. Ealdholt's banner goes up over the ford; push out over the valley and the road south.
   A small 3D projection (x east, y up, z north; the board's centre at the origin, White = Ealdholt at the south) carries
   the meadow shots: textured planes for the meadow, the river and the board; people as sprites at projected feet. */
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const { clamp, lerp, smooth, ease, easeOut, easeIn, span, win, rng } = K;
  const SCENES = window.SCENES = window.SCENES || {};
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- arms
  const EALD = K.LESSER;                                                         // russet, a pale sprig
  const HILD = { key: 'hildmere', field: '#36485a', charge: '#d4d9df', device: 'none' };   // blue-grey, a silver wavy bar
  // the silver wavy bar (fess wavy) across (cx, cy), w wide, band h high
  function wavyBar(x, cx, cy, w, h, col) {
    x.save(); x.fillStyle = col; x.beginPath(); const n = 24, A = h * 0.32, k = 3;
    for (let i = 0; i <= n; i++) { const u = i / n, X = cx - w / 2 + u * w, Y = cy - h / 2 + Math.sin(u * TAU * k / 2 * 2) * A; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }
    for (let i = n; i >= 0; i--) { const u = i / n, X = cx - w / 2 + u * w, Y = cy + h / 2 + Math.sin(u * TAU * k / 2 * 2) * A; x.lineTo(X, Y); }
    x.closePath(); x.fill(); x.restore();
  }
  function houseMark(x, house, cx, cy, s) {           // the charge of either house, about ±0.6 s around (cx, cy)
    if (house === HILD) wavyBar(x, cx, cy, s * 1.3, s * 0.34, HILD.charge);
    else { x.save(); x.fillStyle = EALD.charge; K.device(x, 'sprig', cx, cy, s); x.restore(); }
  }

  // ---------------------------------------------------------------- the cues
  function TT() {
    const a = K.cue('L22'), b = K.cue('L23'), c = K.cue('L24'), d = K.cue('L25'), sc = K.scene(4);
    return {
      s0: sc.start, s1: sc.end,
      seal: a.start + 1.35,                 // the challenge handed over (gate), then the insert
      cutSeal: a.start + 1.35 + 0.15,
      cutMeadow: a.start + 3.35,            // the inked board becomes the meadow board
      cutCael: b.start - 0.05,              // "Cael stood as a Pawn"
      cutTop1: b.start + 1.8,               // "He gave ground": the diagram
      m1: b.start + 1.95,                   // dxe4
      cutFile: b.start + 3.15,              // "He let them believe the open file was a mistake"
      cutCharge: c.start - 0.35,            // "And when their champion came through it"
      m2: c.start + 0.05,                   // Rd2 (the charge)
      cutTop2: c.start + 1.85,              // "he closed the door"
      m3: c.start + 1.98,                   // Nd5
      cage: c.start + 2.6,
      m4: c.start + 3.2,                    // Rxd5
      m5: c.start + 3.85,                   // exd5
      kneel: d.start + 0.55,                // Hildmere's king kneels
      cutBanner: d.start + 1.4,             // the banner goes up
      cutValley: d.start + 3.25,            // push out over the valley ("spoken of in the south")
      L25: d,
    };
  }

  // ---------------------------------------------------------------- colour helpers
  const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const toHex = (r, g, b) => '#' + ((1 << 24) | (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)).toString(16).slice(1);
  const mixHex = (a, b, u) => { const A = hexRGB(a), B = hexRGB(b); return toHex(lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u)); };
  const shadeHex = (h, k) => { const A = hexRGB(h); return toHex(A[0] * (1 + k), A[1] * (1 + k), A[2] * (1 + k)); };

  // ---------------------------------------------------------------- the world (metres)
  const SQ = 2.5, HB = 4 * SQ, BRD = 0.9, BE = HB + BRD, NEAR = 0.25;
  const sqX = f => (f - 3.5) * SQ, sqZ = r => (r - 3.5) * SQ;
  const riverX = z => 29 + 7 * Math.sin(z * 0.018 + 0.6) + 3 * Math.sin(z * 0.047 + 2.0);   // the river's line (runs north-south, east of the board)
  const RIVW = 11, FORDZ = 6;
  // the road: from the ford's west bank, south-west past the meadow, then south down the valley
  const ROAD = (() => { const pts = []; for (let i = 0; i <= 120; i++) { const z = 7 - i * 6; const x = z > -20 ? lerp(riverX(FORDZ) - RIVW / 2 - 1, 8, smooth((7 - z) / 27)) : 8 - 6 * Math.sin((z + 20) * 0.012) + 10 * Math.sin((z + 20) * 0.004); pts.push([x, z]); } return pts; })();

  // ---------------------------------------------------------------- camera and projection
  function camera(pos, tgt, f, roll = 0) {
    let fx = tgt[0] - pos[0], fy = tgt[1] - pos[1], fz = tgt[2] - pos[2]; const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
    let rx = fz, ry = 0, rz = -fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
    let ux = fy * rz - fz * ry, uy = fz * rx - fx * rz, uz = fx * ry - fy * rx;
    if (roll) { const c = Math.cos(roll), s = Math.sin(roll), r2 = [rx * c + ux * s, ry * c + uy * s, rz * c + uz * s], u2 = [ux * c - rx * s, uy * c - ry * s, uz * c - rz * s]; [rx, ry, rz] = r2; [ux, uy, uz] = u2; }
    return { px: pos[0], py: pos[1], pz: pos[2], rx, ry, rz, ux, uy, uz, fx, fy, fz, f, cx: W / 2, cy: H / 2 };
  }
  const fovF = deg => (W / 2) / Math.tan(deg * Math.PI / 360);
  function toCam(C, x, y, z) { const dx = x - C.px, dy = y - C.py, dz = z - C.pz; return [dx * C.rx + dy * C.ry + dz * C.rz, dx * C.ux + dy * C.uy + dz * C.uz, dx * C.fx + dy * C.fy + dz * C.fz]; }
  function pj(C, x, y, z) { const v = toCam(C, x, y, z); if (v[2] < NEAR) return null; const s = C.f / v[2]; return [C.cx + v[0] * s, C.cy - v[1] * s, v[2], s]; }
  // a camera from keys {t, p:[x,y,z], g:[x,y,z], fov}
  function camKeys(t, keys, roll = 0) {
    let a = keys[0], b = keys[keys.length - 1], u = 0;
    if (t <= a.t) b = a; else if (t >= b.t) a = b; else for (let i = 1; i < keys.length; i++) if (t <= keys[i].t) { a = keys[i - 1]; b = keys[i]; u = (b.e || ease)((t - a.t) / (b.t - a.t)); break; }
    const L = (p, q) => [lerp(p[0], q[0], u), lerp(p[1], q[1], u), lerp(p[2], q[2], u)];
    return camera(L(a.p, b.p), L(a.g, b.g), fovF(lerp(a.fov, b.fov, u)), roll);
  }

  // ---------------------------------------------------------------- textured planes (after the opening film's board scene)
  function mipChain(img, levels) {
    const out = [img]; let cur = img;
    for (let i = 1; i < levels; i++) { const n = K.canvas(Math.max(1, cur.width >> 1), Math.max(1, cur.height >> 1)), x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, n.width, n.height); out.push(n); cur = n; }
    return out;
  }
  function cellImg(ctx, mips, u0, v0, u1, v1, s00, s10, s11, s01, pad) {
    const du = u1 - u0, dv = v1 - v0;
    const cx = (s00[0] + s10[0] + s11[0] + s01[0]) / 4, cy = (s00[1] + s10[1] + s11[1] + s01[1]) / 4;
    const exx = (s10[0] - s00[0] + s11[0] - s01[0]) / 2, exy = (s10[1] - s00[1] + s11[1] - s01[1]) / 2;
    const eyx = (s01[0] - s00[0] + s11[0] - s10[0]) / 2, eyy = (s01[1] - s00[1] + s11[1] - s10[1]) / 2;
    const ce = Math.hypot(s00[0] - s10[0] - s01[0] + s11[0], s00[1] - s10[1] - s01[1] + s11[1]) / 4;
    let a = exx / du, b = exy / du, c = eyx / dv, d = eyy / dv;
    const sc = Math.sqrt(Math.abs(a * d - b * c)); if (!(sc > 1e-9)) return;
    let L = 0; if (mips.length > 1 && sc < 0.6) L = Math.min(mips.length - 1, Math.floor(Math.log2(0.6 / sc)) + 1);
    const m = 1 << L; a *= m; b *= m; c *= m; d *= m;
    const U0 = u0 / m, V0 = v0 / m, DU = du / m, DV = dv / m;
    const pp = Math.min(ce, 6) + pad, pu = pp / (Math.hypot(a, b) || 1), pv = pp / (Math.hypot(c, d) || 1);
    ctx.setTransform(a, b, c, d, cx - exx / 2 - eyx / 2, cy - exy / 2 - eyy / 2);
    ctx.drawImage(mips[L], U0 - pu, V0 - pv, DU + 2 * pu, DV + 2 * pv, -pu, -pv, DU + 2 * pu, DV + 2 * pv);
  }
  function cellClipped(ctx, C, mips, poly, tw, th) {
    const out = []; for (let i = 0; i < poly.length; i++) { const A = poly[i], B = poly[(i + 1) % poly.length], ia = A[2] >= NEAR, ib = B[2] >= NEAR; if (ia) out.push(A); if (ia !== ib) { const u = (NEAR - A[2]) / (B[2] - A[2]); out.push(A.map((v, j) => v + (B[j] - v) * u)); } }
    if (out.length < 3) return;
    const sp = out.map(p => [C.cx + C.f * p[0] / p[2], C.cy - C.f * p[1] / p[2], p[3] * tw, p[4] * th]);
    const [p0, p1, p2] = sp, du1 = p1[2] - p0[2], dv1 = p1[3] - p0[3], du2 = p2[2] - p0[2], dv2 = p2[3] - p0[3], det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-9) return;
    const dx1 = p1[0] - p0[0], dy1 = p1[1] - p0[1], dx2 = p2[0] - p0[0], dy2 = p2[1] - p0[1];
    const a = (dx1 * dv2 - dx2 * dv1) / det, b = (dy1 * dv2 - dy2 * dv1) / det, c = (dx2 * du1 - dx1 * du2) / det, d = (dy2 * du1 - dy1 * du2) / det;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); sp.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip();
    const us = sp.map(p => p[2]), vs = sp.map(p => p[3]), umin = Math.min(...us), umax = Math.max(...us), vmin = Math.min(...vs), vmax = Math.max(...vs);
    ctx.setTransform(a, b, c, d, p0[0] - a * p0[2] - c * p0[3], p0[1] - b * p0[2] - d * p0[3]);
    ctx.drawImage(mips[0], Math.max(0, umin - 2), Math.max(0, vmin - 2), Math.min(tw, umax - umin + 4), Math.min(th, vmax - vmin + 4), Math.max(0, umin - 2), Math.max(0, vmin - 2), Math.min(tw, umax - umin + 4), Math.min(th, vmax - vmin + 4));
    ctx.restore();
  }
  // the quad O + s·U + t·V (s, t in 0..1), textured so (s, t) -> texel (s·tw, t·th)
  function plane(ctx, C, mips, O, U, V, o = {}) {
    const tw = mips[0].width, th = mips[0].height, err = o.err || 1.5, pad = o.pad != null ? o.pad : 0.8, f = C.f, hw = W / 2 + 60, hh = H / 2 + 60, maxDep = o.maxDep || 9;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    const toC = (s, t) => toCam(C, O[0] + s * U[0] + t * V[0], O[1] + s * U[1] + t * V[1], O[2] + s * U[2] + t * V[2]);
    const [ns, nt] = o.roots || [2, 2], stack = [];
    for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) stack.push([i / ns, j / nt, (i + 1) / ns, (j + 1) / nt, 0]);
    while (stack.length) {
      const [a0, b0, a1, b1, dep] = stack.pop();
      if (o.skip && o.skip(a0, b0, a1, b1)) continue;
      const cs = [toC(a0, b0), toC(a1, b0), toC(a1, b1), toC(a0, b1)];
      let oL = 0, oR = 0, oT = 0, oB = 0, bh = 0;
      for (const c of cs) { if (f * c[0] + hw * c[2] < 0) oL++; if (-f * c[0] + hw * c[2] < 0) oR++; if (-f * c[1] + hh * c[2] < 0) oT++; if (f * c[1] + hh * c[2] < 0) oB++; if (c[2] < NEAR) bh++; }
      if (oL === 4 || oR === 4 || oT === 4 || oB === 4 || bh === 4) continue;
      const am = (a0 + a1) / 2, bm = (b0 + b1) / 2;
      if (bh) {
        if (dep < Math.min(8, maxDep)) { stack.push([a0, b0, am, bm, dep + 1], [am, b0, a1, bm, dep + 1], [a0, bm, am, b1, dep + 1], [am, bm, a1, b1, dep + 1]); continue; }
        cellClipped(ctx, C, mips, cs.map((c, i) => [c[0], c[1], c[2], (i === 1 || i === 2 ? a1 : a0), (i >= 2 ? b1 : b0)]), tw, th); continue;
      }
      const sp = cs.map(c => [C.cx + f * c[0] / c[2], C.cy - f * c[1] / c[2]]);
      if (dep < maxDep) {
        const cm = toC(am, bm);
        let e = cm[2] < NEAR ? 1e9 : Math.hypot(C.cx + f * cm[0] / cm[2] - (sp[0][0] + sp[1][0] + sp[2][0] + sp[3][0]) / 4, C.cy - f * cm[1] / cm[2] - (sp[0][1] + sp[1][1] + sp[2][1] + sp[3][1]) / 4);
        e += Math.hypot(sp[0][0] - sp[1][0] - sp[3][0] + sp[2][0], sp[0][1] - sp[1][1] - sp[3][1] + sp[2][1]) / 4;
        if (e > err) { stack.push([a0, b0, am, bm, dep + 1], [am, b0, a1, bm, dep + 1], [a0, bm, am, b1, dep + 1], [am, bm, a1, b1, dep + 1]); continue; }
      }
      cellImg(ctx, mips, a0 * tw, b0 * th, a1 * tw, b1 * th, sp[0], sp[1], sp[2], sp[3], pad);
    }
    ctx.restore();
  }
  // a polygon of world points, clipped at the near plane and projected (for hills, quads on the ground)
  function projPoly(C, pts) {
    const cs = pts.map(p => toCam(C, p[0], p[1], p[2])), out = [];
    for (let i = 0; i < cs.length; i++) { const A = cs[i], B = cs[(i + 1) % cs.length], ia = A[2] >= NEAR, ib = B[2] >= NEAR; if (ia) out.push(A); if (ia !== ib) { const u = (NEAR - A[2]) / (B[2] - A[2]); out.push([A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, NEAR]); } }
    return out.map(c => [C.cx + C.f * c[0] / c[2], C.cy - C.f * c[1] / c[2]]);
  }
  function pathPoly(ctx, sp) { ctx.beginPath(); sp.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }

  // ---------------------------------------------------------------- textures (built once)
  function blot(x, w, h, cell, amt, rgb, mode, r) {
    const cw = Math.ceil(w / cell) + 3, ch = Math.ceil(h / cell) + 3, s = K.canvas(cw, ch), sx = s.getContext('2d'), img = sx.createImageData(cw, ch);
    for (let i = 0; i < cw * ch; i++) { const v = r(), k = i * 4; img.data[k] = rgb[0]; img.data[k + 1] = rgb[1]; img.data[k + 2] = rgb[2]; img.data[k + 3] = Math.floor(255 * amt * v * v); }
    sx.putImageData(img, 0, 0);
    x.save(); x.globalCompositeOperation = mode; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(s, -cell * 1.5, -cell * 1.5, cw * cell, ch * cell); x.restore();
  }
  function strokes(x, n, w, h, r, cols, len, alpha, ang = -Math.PI / 2, spread = 0.6, lw = 1.2) {
    x.save(); x.lineCap = 'round';
    for (let i = 0; i < n; i++) { const px = r() * w, py = r() * h, L = len * (0.4 + r()), a = ang + (r() - 0.5) * spread; x.strokeStyle = cols[Math.floor(r() * cols.length)]; x.globalAlpha = alpha * (0.4 + r() * 0.6); x.lineWidth = lw * (0.6 + r() * 0.8); x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); }
    x.restore();
  }
  // the board: 2048 px over [-BE, BE]²; dark squares are turf, light squares pale stone; a stone kerb with the files and ranks cut in it
  const BT = 2048, BPM = BT / (2 * BE);
  function boardTex() {
    const c = K.canvas(BT, BT), x = c.getContext('2d'), r = rng(4401);
    const m = v => (v + BE) * BPM;                         // world x (or -z) -> texel
    // kerb: rough grey stone
    x.fillStyle = '#9c968a'; x.fillRect(0, 0, BT, BT);
    blot(x, BT, BT, 90, 0.25, [70, 64, 56], 'multiply', r); blot(x, BT, BT, 20, 0.18, [60, 56, 50], 'multiply', r); blot(x, BT, BT, 40, 0.2, [240, 236, 226], 'screen', r);
    // kerb blocks
    x.strokeStyle = 'rgba(40,36,30,0.55)'; x.lineWidth = 3;
    for (let k = 0; k < 2; k++) for (let i = 0; i < 24; i++) { const a = i / 24 * BT + r() * 20; x.beginPath(); if (k) { x.moveTo(a, 0); x.lineTo(a, BRD * BPM); x.moveTo(a, BT - BRD * BPM); x.lineTo(a, BT); } else { x.moveTo(0, a); x.lineTo(BRD * BPM, a); x.moveTo(BT - BRD * BPM, a); x.lineTo(BT, a); } x.stroke(); }
    for (let f = 0; f < 8; f++) for (let rk = 0; rk < 8; rk++) {
      const x0 = m(sqX(f) - SQ / 2), y0 = m(-(sqZ(rk) + SQ / 2)), s = SQ * BPM, dark = (f + rk) % 2 === 0;
      x.save(); x.beginPath(); x.rect(x0, y0, s, s); x.clip(); x.translate(x0, y0);
      if (dark) {   // turf
        x.fillStyle = toHex(70 + r() * 10, 96 + r() * 12, 52 + r() * 8); x.fillRect(0, 0, s, s);
        blot(x, s, s, 40, 0.3, [30, 44, 22], 'multiply', r); blot(x, s, s, 14, 0.22, [40, 60, 30], 'multiply', r); blot(x, s, s, 30, 0.18, [200, 214, 150], 'screen', r);
        strokes(x, 900, s, s, r, ['#3d5a2a', '#6f8c48', '#2c4220', '#8aa05a', '#55703a'], 7, 0.5, -Math.PI / 2 + 0.3, 1.4, 1.4);
        // mown stripes
        x.globalAlpha = 0.06; x.fillStyle = '#e8f0c0'; for (let k = 0; k < 6; k += 2) x.fillRect(k * s / 6, 0, s / 6, s); x.globalAlpha = 1;
      } else {      // pale stone flags
        x.fillStyle = toHex(212 + r() * 10, 204 + r() * 8, 184 + r() * 8); x.fillRect(0, 0, s, s);
        blot(x, s, s, 60, 0.2, [120, 110, 90], 'multiply', r); blot(x, s, s, 12, 0.14, [110, 100, 84], 'multiply', r); blot(x, s, s, 34, 0.25, [255, 252, 240], 'screen', r);
        // four flags with joints, a crack or two, lichen
        x.strokeStyle = 'rgba(70,62,50,0.5)'; x.lineWidth = 2.2; const jx = s * (0.45 + r() * 0.1), jy = s * (0.45 + r() * 0.1);
        x.beginPath(); x.moveTo(jx, 0); x.lineTo(jx + (r() - 0.5) * 6, s); x.moveTo(0, jy); x.lineTo(s, jy + (r() - 0.5) * 6); x.stroke();
        x.lineWidth = 1; x.strokeStyle = 'rgba(70,62,50,0.35)';
        for (let k = 0; k < 2; k++) { let px = r() * s, py = r() * s; x.beginPath(); x.moveTo(px, py); for (let q = 0; q < 6; q++) { px += (r() - 0.5) * 30; py += (r() - 0.3) * 22; x.lineTo(px, py); } x.stroke(); }
        for (let k = 0; k < 14; k++) { x.fillStyle = r() < 0.5 ? 'rgba(150,160,110,0.25)' : 'rgba(200,190,120,0.22)'; x.beginPath(); x.arc(r() * s, r() * s, 2 + r() * 8, 0, TAU); x.fill(); }
      }
      // the cut edge: a dark seam and a little light on the far lip
      x.strokeStyle = 'rgba(30,26,20,0.6)'; x.lineWidth = 4; x.strokeRect(0, 0, s, s);
      x.strokeStyle = 'rgba(255,250,235,0.18)'; x.lineWidth = 2; x.strokeRect(3, 3, s - 6, s - 6);
      x.restore();
    }
    // files and ranks cut into the kerb (chess notation)
    x.save(); x.font = `italic 500 ${Math.round(BRD * BPM * 0.62)}px "EB Garamond"`; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = 0; i < 8; i++) {
      for (const [tx, ty, s] of [[m(sqX(i)), BT - BRD * BPM / 2, 'abcdefgh'[i]], [m(sqX(i)), BRD * BPM / 2, 'abcdefgh'[i]], [BRD * BPM / 2, m(-sqZ(i)), String(i + 1)], [BT - BRD * BPM / 2, m(-sqZ(i)), String(i + 1)]]) {
        x.fillStyle = 'rgba(255,250,236,0.28)'; x.fillText(s, tx + 2, ty + 2); x.fillStyle = 'rgba(40,34,26,0.75)'; x.fillText(s, tx, ty);
      }
    }
    x.restore();
    return c;
  }
  const boardMips = () => K.cached('s4:boardMips', () => mipChain(boardTex(), 6));
  // the meadow near the board: 2048 px over 100 m (x -50..50, z 50..-50)
  const NT = 2048, NS = 100, NPM = NT / NS;
  function groundPaint(x, size, metres, x0, z0, r, near) {
    const ppm = size / metres, tx = X => (X - x0) * ppm, tz = Z => (z0 - Z) * ppm;
    x.fillStyle = near ? '#5f7646' : '#5e7347'; x.fillRect(0, 0, size, size);
    blot(x, size, size, size / 7, 0.35, [44, 56, 30], 'multiply', r); blot(x, size, size, size / 24, 0.25, [52, 64, 34], 'multiply', r);
    blot(x, size, size, size / 12, 0.22, [214, 210, 150], 'screen', r); blot(x, size, size, size / 60, 0.18, [40, 50, 26], 'multiply', r);
    if (near) strokes(x, 70000, size, size, r, ['#4a6232', '#7a9050', '#3a5026', '#8e9a5c', '#6a7c42', '#a0a066'], 6, 0.35, -Math.PI / 2, 1.6, 1.2);
    else { // moor and woods far off: darker patches, a few walls
      for (let i = 0; i < 70; i++) { const px = r() * size, py = r() * size, rr = (8 + r() * 30) * ppm * (near ? 1 : 1.5); const g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, 'rgba(34,48,30,0.55)'); g.addColorStop(1, 'rgba(34,48,30,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, rr, 0, TAU); x.fill(); }
      x.strokeStyle = 'rgba(70,64,52,0.35)'; x.lineWidth = Math.max(1, 0.8 * ppm);
      for (let i = 0; i < 26; i++) { let px = r() * size, py = r() * size; x.beginPath(); x.moveTo(px, py); for (let q = 0; q < 5; q++) { px += (r() - 0.5) * 140 * ppm; py += (r() - 0.5) * 140 * ppm; x.lineTo(px, py); } x.stroke(); }
      for (let i = 0; i < 40; i++) { const px = r() * size, py = r() * size, w = (20 + r() * 50) * ppm, h = (15 + r() * 40) * ppm; x.fillStyle = r() < 0.5 ? 'rgba(170,170,100,0.12)' : 'rgba(40,60,30,0.14)'; x.save(); x.translate(px, py); x.rotate(r() * 3); x.fillRect(-w / 2, -h / 2, w, h); x.restore(); }
    }
    if (near) {
      // the cut meadow round the board, paths beaten by the crowd
      x.fillStyle = 'rgba(200,210,150,0.12)'; x.fillRect(tx(-17), tz(17), 34 * ppm, 34 * ppm);
      x.strokeStyle = 'rgba(110,90,60,0.35)'; x.lineCap = 'round';
      for (const [a, b, w] of [[[-3, -14], [-6, -48], 3], [[3, -14], [10, -30], 2.2], [[-14, -6], [-40, 10], 2], [[14, 10], [24, 8], 2.4]]) { x.lineWidth = w * ppm; x.beginPath(); x.moveTo(tx(a[0]), tz(a[1])); x.quadraticCurveTo(tx((a[0] + b[0]) / 2 + 3), tz((a[1] + b[1]) / 2), tx(b[0]), tz(b[1])); x.stroke(); }
      blot(x, size, size, 6, 0.08, [60, 50, 30], 'multiply', r);
    }
    // the road
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (const [col, w] of [['rgba(92,78,56,0.8)', 5.4], ['rgba(132,114,84,0.85)', 4.2], ['rgba(98,84,62,0.5)', 0.6]]) {
      x.strokeStyle = col; x.lineWidth = Math.max(1, w * ppm);
      if (w < 1) { for (const off of [-1, 1]) { x.beginPath(); ROAD.forEach((p, i) => i ? x.lineTo(tx(p[0] + off), tz(p[1])) : x.moveTo(tx(p[0] + off), tz(p[1]))); x.stroke(); } }
      else { x.beginPath(); ROAD.forEach((p, i) => i ? x.lineTo(tx(p[0]), tz(p[1])) : x.moveTo(tx(p[0]), tz(p[1]))); x.stroke(); }
    }
    // the river: muddy banks, a gravel shoal at the ford, dark water with lighter runs
    const zs = []; for (let z = z0 + 10; z >= z0 - metres - 10; z -= metres / 200) zs.push(z);
    const bank = (off) => zs.map(z => [tx(riverX(z) + off), tz(z)]);
    const fill = (L, R, col) => { x.fillStyle = col; x.beginPath(); L.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); for (let i = R.length - 1; i >= 0; i--) x.lineTo(R[i][0], R[i][1]); x.closePath(); x.fill(); };
    fill(bank(-RIVW / 2 - 2.2), bank(RIVW / 2 + 2.2), '#6d6048');
    fill(bank(-RIVW / 2 - 0.6), bank(RIVW / 2 + 0.6), '#4a4a3e');
    fill(bank(-RIVW / 2), bank(RIVW / 2), '#3e5058');
    fill(bank(-RIVW / 4), bank(RIVW / 4), 'rgba(110,132,138,0.55)');
    // the ford: shallow gravel and stepping stones across
    const fx0 = tx(riverX(FORDZ) - RIVW / 2 - 1), fx1 = tx(riverX(FORDZ) + RIVW / 2 + 1);
    const g = x.createLinearGradient(0, tz(FORDZ + 4), 0, tz(FORDZ - 4)); g.addColorStop(0, 'rgba(150,150,128,0)'); g.addColorStop(0.5, 'rgba(160,156,130,0.75)'); g.addColorStop(1, 'rgba(150,150,128,0)');
    x.fillStyle = g; x.fillRect(fx0, tz(FORDZ + 4), fx1 - fx0, 8 * ppm);
    for (let i = 0; i <= 9; i++) { const X = riverX(FORDZ) - RIVW / 2 + i * RIVW / 9, Z = FORDZ + Math.sin(i * 1.7) * 0.4; x.fillStyle = '#8e8a7c'; x.beginPath(); x.ellipse(tx(X), tz(Z), 0.55 * ppm, 0.42 * ppm, r(), 0, TAU); x.fill(); x.fillStyle = 'rgba(30,30,26,0.35)'; x.beginPath(); x.ellipse(tx(X) + 0.12 * ppm, tz(Z) + 0.2 * ppm, 0.55 * ppm, 0.3 * ppm, 0, 0, TAU); x.fill(); }
    if (near) { x.strokeStyle = 'rgba(210,222,224,0.22)'; x.lineWidth = 1.5; for (let i = 0; i < 900; i++) { const Z = z0 - r() * metres, X = riverX(Z) + (r() - 0.5) * RIVW * 0.9; x.beginPath(); x.moveTo(tx(X), tz(Z)); x.lineTo(tx(X + (riverX(Z - 1.5) - riverX(Z))), tz(Z - 1.5)); x.stroke(); } }
  }
  const nearMips = () => K.cached('s4:nearMips', () => {
    const c = K.canvas(NT, NT), x = c.getContext('2d'); groundPaint(x, NT, NS, -NS / 2, NS / 2, rng(4502), true);
    // feather the edge into the far meadow
    x.globalCompositeOperation = 'destination-in'; const g = x.createRadialGradient(NT / 2, NT / 2, NT * 0.36, NT / 2, NT / 2, NT * 0.5); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, NT, NT);
    return mipChain(c, 6);
  });
  const FT = 1024, FX0 = -520, FZ0 = 300, FSZ = 1040;
  const farMips = () => K.cached('s4:farMips', () => { const c = K.canvas(FT, FT), x = c.getContext('2d'); groundPaint(x, FT, FSZ, FX0, FZ0, rng(4503), false); return mipChain(c, 5); });

  // clouds: an overcast sky, a long painted band wrapped by azimuth
  const cloudTex = () => K.cached('s4:clouds', () => {
    const w = 2048, h = 512, c = K.canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w / 4, h / 4), r = rng(4600);
    const pn = (X, Y, p, s) => { const xi = Math.floor(X), yi = Math.floor(Y), xf = X - xi, yf = Y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), mm = a => ((a % p) + p) % p; const a = K.hash(mm(xi), yi, s), b = K.hash(mm(xi + 1), yi, s), cc = K.hash(mm(xi), yi + 1, s), d = K.hash(mm(xi + 1), yi + 1, s); return a + (b - a) * u + (cc - a) * v + (a - b - cc + d) * u * v; };
    for (let j = 0; j < h / 4; j++) for (let i = 0; i < w / 4; i++) {
      let f = 0, amp = 0.5, n = 0, X = i / 512 * 8, Y = j / 128 * 3.2, p = 8; for (let o = 0; o < 5; o++) { f += amp * pn(X * (1 << o), Y * (1 << o), p * (1 << o), 70 + o); n += amp; amp *= 0.5; } f /= n;
      const v = j / (h / 4), dens = clamp((f - 0.38) * 2.6) * (0.55 + 0.45 * v), k = (j * w / 4 + i) * 4;
      const sh = 1 - clamp((f - 0.5) * 2.2) * 0.45;
      img.data[k] = 196 * sh + 30; img.data[k + 1] = 198 * sh + 30; img.data[k + 2] = 200 * sh + 34; img.data[k + 3] = dens * 255;
    }
    const s = K.canvas(w / 4, h / 4); s.getContext('2d').putImageData(img, 0, 0);
    x.imageSmoothingQuality = 'high'; x.drawImage(s, 0, 0, w, h); void r;
    return c;
  });

  // painted trees (alder, willow) and the hold on its rise
  function treeSprite(k) {
    return K.cached('s4:tree' + k, () => {
      const w = 256, h = 320, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(4700 + k);
      x.fillStyle = '#3a2e22'; x.beginPath(); x.moveTo(w / 2 - 7, h); x.lineTo(w / 2 - 3, h * 0.45); x.lineTo(w / 2 + 3, h * 0.45); x.lineTo(w / 2 + 8, h); x.fill();
      const cols = k === 2 ? ['#55683e', '#6c7c4a', '#44583a', '#7e8a56'] : ['#3f5634', '#526a40', '#33462c', '#627848'];
      for (let i = 0; i < 70; i++) { const a = r() * TAU, rr = Math.sqrt(r()), px = w / 2 + Math.cos(a) * rr * w * 0.38, py = h * 0.4 + Math.sin(a) * rr * h * 0.3 - (k === 2 ? 0 : 10); x.fillStyle = cols[Math.floor(r() * cols.length)]; x.globalAlpha = 0.8; x.beginPath(); x.ellipse(px, py, 16 + r() * 22, 12 + r() * 18, r() * 3, 0, TAU); x.fill(); }
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-atop';
      const g = x.createLinearGradient(0, 0, w, h * 0.6); g.addColorStop(0, 'rgba(230,236,200,0.22)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,16,10,0.3)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      return c;
    });
  }
  const holdSprite = () => K.cached('s4:hold', () => {
    const w = 640, h = 260, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(4800);
    x.fillStyle = '#4c5a42'; x.beginPath(); x.moveTo(0, h); x.bezierCurveTo(w * 0.2, h * 0.62, w * 0.45, h * 0.5, w * 0.6, h * 0.52); x.bezierCurveTo(w * 0.78, h * 0.55, w * 0.9, h * 0.7, w, h); x.fill();
    x.fillStyle = '#3a3428'; x.fillRect(w * 0.36, h * 0.38, w * 0.26, h * 0.16);
    x.beginPath(); x.moveTo(w * 0.34, h * 0.39); x.lineTo(w * 0.49, h * 0.24); x.lineTo(w * 0.64, h * 0.39); x.fill();
    x.fillStyle = '#2c271f'; for (let i = 0; i < 46; i++) { const u = i / 45, X = lerp(w * 0.22, w * 0.78, u), Y = h * 0.53 - Math.sin(u * Math.PI) * h * 0.05; x.beginPath(); x.moveTo(X - 3, Y + 18); x.lineTo(X - 3, Y); x.lineTo(X, Y - 5); x.lineTo(X + 3, Y); x.lineTo(X + 3, Y + 18); x.fill(); }
    x.fillStyle = 'rgba(200,190,170,0.25)'; for (let i = 0; i < 3; i++) x.fillRect(w * (0.4 + i * 0.07), h * 0.44, 5, 6);
    void r; return c;
  });
  // a crowd strip: villagers standing to watch (12 m of them)
  function crowdSprite(k) {
    return K.cached('s4:crowd' + k, () => {
      const w = 1024, h = 200, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(4900 + k);
      const cols = ['#5c4a36', '#6e5236', '#4e4a40', '#7a6a50', '#3e4a52', '#5a5a4a', '#8a7a5a', '#4a3a2c'];
      for (let row = 0; row < 2; row++) for (let i = 0; i < 22; i++) {
        const X = (i + 0.5 + (r() - 0.5) * 0.6) / 22 * w, hh = (row ? 150 : 165) * (0.88 + r() * 0.2), Y = h - (row ? 26 : 4);
        K.figure(x, X, Y, hh, { kind: ['tunic', 'robe', 'cloak', 'gown'][Math.floor(r() * 4)], head: ['bare', 'hood', 'hair', 'coif', 'cap'][Math.floor(r() * 5)], hold: r() < 0.15 ? 'staff' : 'none', face: r() < 0.5 ? 1 : -1, fill: mixHex(cols[Math.floor(r() * cols.length)], row ? '#7d8a80' : '#2a2620', row ? 0.35 : 0.2) });
      }
      return c;
    });
  }
  // banner cloths at one fixed size (rippled at any scale when drawn)
  const clothOf = house => K.cached('s4:cloth:' + house.key, () => {
    const w = 200, h = 340, c = K.canvas(w, h), x = c.getContext('2d');
    x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w, h * 0.84); x.lineTo(w / 2, h); x.lineTo(0, h * 0.84); x.closePath(); x.fillStyle = house.field; x.fill(); x.save(); x.clip();
    const r = rng(w + h + house.key.length); for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,250,235'},${0.03 + r() * 0.03})`; x.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
    houseMark(x, house, w / 2, h * 0.44, w * 0.42);
    x.strokeStyle = house === HILD ? '#b8bec6' : '#c9a14a'; x.lineWidth = 6; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w, h * 0.84); x.lineTo(w / 2, h); x.lineTo(0, h * 0.84); x.closePath(); x.stroke();
    x.restore(); return c;
  });
  // a hanging banner drawn in strips at (x, y) top-centre, w × h px, rippling in the wind
  function drawBanner(ctx, house, x, y, w, h, t, wind = 0.6, seed = 0, flyRight = false) {
    const cloth = clothOf(house), n = 18;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const u = i / n, sx = u * cloth.width, sw = cloth.width / n + 0.8;
      const ph = t * 2.1 + u * 5 + seed, dy = Math.sin(ph) * wind * h * 0.03 * (0.3 + u), dx = Math.sin(ph * 0.7) * wind * w * 0.02;
      const X = x - w / 2 + u * w + dx, Y = y + dy, ww = sw * w / cloth.width;
      ctx.drawImage(cloth, sx, 0, sw, cloth.height, X, Y, ww, h);
      const sh = Math.cos(ph) * wind * 0.25; ctx.fillStyle = sh > 0 ? `rgba(255,248,230,${sh * 0.45})` : `rgba(0,0,0,${-sh * 0.9})`;
      ctx.globalCompositeOperation = 'source-atop'; ctx.fillRect(X, Y, ww, h); ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = '#2a1d12'; ctx.fillRect(x - w * 0.58, y - h * 0.03, w * 1.16, h * 0.035);
    ctx.restore(); void flyRight;
  }
  // a flag streaming from a pole in the wind: its own cloth (landscape), slices displaced by a travelling wave
  const flagCloth = house => K.cached('s4:flag:' + house.key, () => {
    const w = 420, h = 260, c = K.canvas(w, h), x = c.getContext('2d');
    x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w * 0.86, h / 2); x.lineTo(w, h); x.lineTo(0, h); x.closePath(); x.fillStyle = house.field; x.fill(); x.save(); x.clip();
    const r = rng(w + house.key.length); for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,250,235'},${0.03 + r() * 0.03})`; x.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
    houseMark(x, house, w * 0.4, h * 0.5, h * 0.62);
    x.strokeStyle = house === HILD ? '#b8bec6' : '#c9a14a'; x.lineWidth = 7; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w * 0.86, h / 2); x.lineTo(w, h); x.lineTo(0, h); x.closePath(); x.stroke();
    x.restore(); return c;
  });
  function drawFlag(ctx, house, x, y, len, wid, t, wind, seed = 0) {
    const cloth = flagCloth(house), n = 28;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const u = i / n, sx = u * cloth.width, sw = cloth.width / n + 0.8, ph = t * 4.0 - u * 6.5 + seed, dy = Math.sin(ph) * wid * 0.13 * u * wind, X = x + u * len, ww = sw * len / cloth.width, hh = wid * (1 - 0.08 * u * Math.abs(Math.cos(ph)));
      ctx.drawImage(cloth, sx, 0, sw, cloth.height, X, y + dy + (wid - hh) / 2, ww, hh);
      const s2 = Math.cos(ph) * 0.3 * wind * (0.3 + u); ctx.fillStyle = s2 > 0 ? `rgba(255,248,230,${s2 * 0.5})` : `rgba(0,0,0,${-s2 * 0.9})`; ctx.globalCompositeOperation = 'source-atop'; ctx.fillRect(X - 0.5, y + dy - 2, ww + 1, wid + 4); ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the pieces
  const COL = {
    w: { cloth: '#cfc2a2', cloth2: '#b5a581', trim: '#6e5236', leg: '#7d6a50', boot: '#3b2a1c', skin: '#b48c6c', hair: '#3b2a1e', steel: '#aab0b6', wood: '#6b4b2e', gold: '#c9a14a', coat: '#b39c74', cap: '#cfc2a2', house: EALD },
    b: { cloth: '#3a4d60', cloth2: '#2c3b4b', trim: '#c8ced6', leg: '#29323c', boot: '#14181c', skin: '#b48c6c', hair: '#2a2018', steel: '#8e959e', wood: '#3a2c20', gold: '#c4c9d0', coat: '#3a2c22', cap: '#3a4d60', house: HILD },
  };
  const HT = { P: 1.75, R: 2.02, N: 2.7, B: 1.98, Q: 1.86, K: 2.02 };
  const sqOf = s => [s.charCodeAt(0) - 97, +s[1] - 1];
  // the game: the position before the move (White = Ealdholt, Black = Hildmere)
  const GAME0 = {
    w: ['Kg1', 'Qb3', 'Ra1', 'Re1', 'Bb4', 'Nc3', 'Pa2', 'Pb2', 'Pd3', 'Pe3', 'Pf2', 'Pg2', 'Ph2'],
    b: ['Kg8', 'Qc7', 'Rd8', 'Rf8', 'Bc8', 'Ng6', 'Pa6', 'Pb7', 'Pe4', 'Pf7', 'Pg7', 'Ph6'],
    capW: ['B', 'N', 'P'], capB: ['B', 'N', 'P', 'P'],                           // taken earlier: they stand at the side
  };
  function gamePieces() {
    return K.cached('s4:game', () => {
      const out = [];
      for (const side of ['w', 'b']) GAME0[side].forEach(s => { const [f, r] = sqOf(s.slice(1)); out.push({ id: side + s, side, t: s[0], f, r, cael: side === 'w' && s === 'Pd3', champ: side === 'b' && s === 'Rd8' }); });
      GAME0.capW.forEach((t, i) => out.push({ id: 'cw' + i, side: 'w', t, side0: true, x: -13.2, z: -6 + i * 2.2 }));
      GAME0.capB.forEach((t, i) => out.push({ id: 'cb' + i, side: 'b', t, side0: true, x: 13.2, z: 6 - i * 2.2 }));
      return out;
    });
  }
  // the moves, keyed to the narration: [piece id, from, to, t0, t1, captured id]
  function gameMoves(T) {
    return [
      ['wPd3', 'd3', 'e4', T.m1, T.m1 + 0.75, 'bPe4'],
      ['bRd8', 'd8', 'd2', T.m2, T.m2 + 1.55, null],
      ['wNc3', 'c3', 'd5', T.m3, T.m3 + 0.6, null],
      ['bRd8', 'd2', 'd5', T.m4, T.m4 + 0.5, 'wNc3'],
      ['wPd3', 'e4', 'd5', T.m5, T.m5 + 0.5, 'bRd8'],
    ];
  }
  const sqXZ = s => { const [f, r] = sqOf(s); return [sqX(f), sqZ(r)]; };
  // where every piece of the game stands at t (and whether it walks, kneels, or leaps)
  function gameState(t, T) {
    const ps = gamePieces(), mv = gameMoves(T), out = [];
    for (const p of ps) {
      let x, z; if (p.side0) { x = p.x; z = p.z; } else { x = sqX(p.f); z = sqZ(p.r); }
      let walk, lift = 0, kneel = 0, alpha = 1, moving = 0;
      for (const m of mv) {
        if (m[0] === p.id && t >= m[3]) {
          const [ax, az] = sqXZ(m[1]), [bx, bz] = sqXZ(m[2]), u = span(t, m[3], m[4]);
          const e = p.t === 'N' ? ease(u) : (p.champ && m[1] === 'd8' ? easeIn(clamp(u * 1.15)) * 0.0 + smooth(u) : smooth(u));
          x = lerp(ax, bx, e); z = lerp(az, bz, e);
          if (u > 0 && u < 1) { moving = 1; walk = Math.hypot(bx - ax, bz - az) * e * (p.champ ? 1.7 : 2.4); if (p.t === 'N') lift = Math.sin(u * Math.PI) * 2.2; }
        }
        if (m[5] === p.id && t >= m[3]) { const k = span(t, m[4] - 0.15, m[4] + 0.45); kneel = Math.max(kneel, k); alpha = Math.min(alpha, 1 - smooth(span(t, m[4] + 0.25, m[4] + 0.95))); }
      }
      if (p.id === 'bKg8') kneel = Math.max(kneel, smooth(span(t, T.kneel, T.kneel + 0.6)) * 0.85);
      if (alpha <= 0.01) continue;
      out.push({ p, x, z, walk, lift, kneel, alpha, moving, face: p.side === 'w' ? 1 : -1 });
    }
    return out;
  }
  // the opening position, the pieces walking in from their sides to take their places
  function setupState(t, T) {
    const back = 'RNBQKBNR', out = [], t0 = T.cutMeadow - 0.6, r = rng(4950);
    for (const side of ['w', 'b']) for (let f = 0; f < 8; f++) for (const kind of ['back', 'pawn']) {
      const rk = side === 'w' ? (kind === 'back' ? 0 : 1) : (kind === 'back' ? 7 : 6), tt = kind === 'back' ? back[f] : 'P';
      const fx = sqX(f), fz = sqZ(rk), dir = side === 'w' ? -1 : 1;
      const delay = (kind === 'pawn' ? 0 : 0.45) + Math.abs(f - 3.5) * 0.12 + r() * 0.25, dur = 1.9 + r() * 0.4;
      const u = span(t, t0 + delay, t0 + delay + dur), e = easeOut(u);
      const sx = fx * 1.35 + (f < 4 ? -4 : 4) * (kind === 'back' ? 1 : 0.4), sz = fz + dir * (11 + (kind === 'back' ? 3 : 0));
      const x = lerp(sx, fx, e), z = lerp(sz, fz, e);
      out.push({ p: { id: 's' + side + f + kind, side, t: tt, cael: side === 'w' && f === 3 && kind === 'pawn' }, x, z, walk: u < 1 ? Math.hypot(fx - sx, fz - sz) * e * 2.4 : undefined, lift: 0, kneel: 0, alpha: smooth(span(t, t0 + delay - 0.3, t0 + delay + 0.3)), moving: u < 1, face: side === 'w' ? 1 : -1 });
    }
    return out;
  }

  // ---------------------------------------------------------------- a person seen from the front or the back (feet at y = 0, crown at y = -1)
  function person(x, o) {
    const c = o.col, back = !!o.back, wk = o.walk, sw = wk != null ? Math.sin(wk) : 0;
    const F = (col, fn) => { x.fillStyle = col; x.beginPath(); fn(); x.fill(); };
    const long = o.kind === 'robe' || o.kind === 'gown', hem = long ? -0.012 : -0.3, mail = o.kind === 'armour';
    const flare = long ? (o.kind === 'gown' ? 1.2 : 1.3) : 1;
    // cloak behind (or over the back)
    const cloakShape = () => { x.moveTo(-0.11, -0.82); x.bezierCurveTo(-0.18, -0.6, -0.2 - sw * 0.01, -0.3, -0.2, -0.04); x.quadraticCurveTo(0, -0.02, 0.2, -0.04); x.bezierCurveTo(0.2 + sw * 0.01, -0.3, 0.18, -0.6, 0.11, -0.82); x.closePath(); };
    if (o.cloak && !back) F(shadeHex(o.cloak, -0.25), cloakShape);
    // legs
    if (!long) for (const s of [-1, 1]) {
      const lift = wk != null ? Math.max(0, Math.sin(wk + (s > 0 ? 0 : Math.PI))) * 0.05 : 0, lx = s * 0.05 + (wk != null ? s * 0.004 * sw : 0);
      F(mail ? shadeHex(c.steel, -0.35) : c.leg, () => { x.moveTo(lx - 0.033, -0.52); x.lineTo(lx + 0.033, -0.52); x.lineTo(lx + 0.026, -0.05 - lift); x.lineTo(lx - 0.026, -0.05 - lift); x.closePath(); });
      F(c.boot, () => { x.ellipse(lx, -0.028 - lift, 0.036, 0.03, 0, 0, TAU); x.rect(lx - 0.031, -0.085 - lift, 0.062, 0.05); });
    }
    // body
    F(mail ? c.steel : c.cloth, () => { x.moveTo(-0.035, -0.85); x.quadraticCurveTo(-0.115, -0.845, -0.122, -0.79); x.bezierCurveTo(-0.118, -0.7, -0.09, -0.64, -0.086, -0.58); x.bezierCurveTo(-0.1, -0.45, -0.15 * flare, hem - 0.1, -0.16 * flare, hem); x.quadraticCurveTo(0, hem + 0.016, 0.16 * flare, hem); x.bezierCurveTo(0.15 * flare, hem - 0.1, 0.1, -0.45, 0.086, -0.58); x.bezierCurveTo(0.09, -0.64, 0.118, -0.7, 0.122, -0.79); x.quadraticCurveTo(0.115, -0.845, 0.035, -0.85); x.closePath(); });
    if (mail) F(c.cloth, () => { x.moveTo(-0.085, -0.8); x.lineTo(0.085, -0.8); x.lineTo(0.098, -0.58); x.lineTo(0.125, hem + 0.03); x.lineTo(-0.125, hem + 0.03); x.lineTo(-0.098, -0.58); x.closePath(); });
    if (o.stole) F(c.trim, () => { x.rect(-0.07, -0.82, 0.035, 0.66); x.rect(0.035, -0.82, 0.035, 0.66); });
    if (!back && o.device && (mail || o.kind === 'tunic')) houseMark(x, c.house, 0, -0.69, mail ? 0.11 : 0.08);
    // folds
    x.save(); x.globalAlpha *= 0.2; x.strokeStyle = '#000'; x.lineWidth = 0.008; for (const fx of [-0.06, 0, 0.06]) { x.beginPath(); x.moveTo(fx * 0.6, -0.56); x.quadraticCurveTo(fx * 1.2, -0.3, fx * 1.9 * flare, hem + 0.005); x.stroke(); } x.restore();
    F(o.belt || c.trim, () => x.rect(-0.09, -0.585, 0.18, 0.024));
    if (o.cloak && back) F(o.cloak, cloakShape);
    // neck and head
    F(c.skin, () => x.rect(-0.022, -0.89, 0.044, 0.05));
    const hy = -0.935, hd = o.head;
    if (hd === 'helm') { F(c.steel, () => { x.moveTo(-0.07, -0.86); x.lineTo(-0.072, -0.97); x.quadraticCurveTo(0, -1.03, 0.072, -0.97); x.lineTo(0.07, -0.86); x.closePath(); }); if (!back) F('#15120f', () => x.rect(-0.05, -0.94, 0.1, 0.012)); if (o.crest) F(o.crest, () => { x.moveTo(-0.012, -1.0); x.quadraticCurveTo(-0.02, -1.1, 0.04, -1.13); x.quadraticCurveTo(0.012, -1.06, 0.014, -1.0); x.closePath(); }); }
    else if (hd === 'kettle') { F(back ? c.hair : c.skin, () => x.ellipse(0, hy, 0.052, 0.062, 0, 0, TAU)); F(c.steel, () => { x.moveTo(-0.1, -0.955); x.quadraticCurveTo(0, -0.975, 0.1, -0.955); x.lineTo(0.055, -0.975); x.quadraticCurveTo(0, -1.04, -0.055, -0.975); x.closePath(); }); }
    else if (hd === 'hood') { F(back ? c.hair : c.skin, () => x.ellipse(0, hy, 0.05, 0.06, 0, 0, TAU)); F(o.hoodCol || c.cap, () => { x.moveTo(-0.075, -0.84); x.quadraticCurveTo(-0.085, -1.01, 0, -1.015); x.quadraticCurveTo(0.085, -1.01, 0.075, -0.84); if (!back) { x.lineTo(0.045, -0.88); x.quadraticCurveTo(0, -0.99, -0.045, -0.88); } x.closePath(); }); }
    else if (hd === 'mitre') { F(back ? c.hair : c.skin, () => x.ellipse(0, hy, 0.05, 0.06, 0, 0, TAU)); F(o.hoodCol || c.cloth2, () => { x.moveTo(-0.07, -0.86); x.quadraticCurveTo(-0.09, -1.02, 0, -1.1); x.quadraticCurveTo(0.09, -1.02, 0.07, -0.86); if (!back) { x.lineTo(0.042, -0.9); x.quadraticCurveTo(0, -0.985, -0.042, -0.9); } x.closePath(); }); F(c.trim, () => x.rect(-0.008, -1.08, 0.016, 0.1)); }
    else {
      // bare head: hair (to the jaw for Cael), face from the front, hair from the back
      F(c.hair, () => { x.ellipse(0, hy - 0.006, 0.056, 0.066, 0, 0, TAU); if (o.longHair) { x.rect(-0.058, hy - 0.01, 0.116, 0.07); } });
      if (!back) F(c.skin, () => x.ellipse(0, hy + 0.012, 0.045, 0.052, 0, 0, TAU));
      if (hd === 'crown' || hd === 'circlet') { const top = hd === 'crown' ? 0.06 : 0.025; x.fillStyle = c.gold; x.beginPath(); x.moveTo(-0.058, -0.965); x.lineTo(0.058, -0.965); x.lineTo(0.058, -0.965 - top); if (hd === 'crown') { x.lineTo(0.03, -0.985); x.lineTo(0, -0.965 - top - 0.01); x.lineTo(-0.03, -0.985); } x.lineTo(-0.058, -0.965 - top); x.closePath(); x.fill(); }
      if (o.veil) F(o.veil, () => { x.moveTo(-0.06, -0.97); x.quadraticCurveTo(0, -1.0, 0.06, -0.97); x.lineTo(0.085, -0.8); x.quadraticCurveTo(0, back ? -0.76 : -0.84, -0.085, -0.8); x.closePath(); });
    }
    // arms and what they hold
    const arm = (s, a, b, col) => { const sx = s * 0.105, sy = -0.8, ex = sx + s * Math.sin(a) * 0.17, ey = sy + Math.cos(a) * 0.17, hx = ex + s * Math.sin(a + b) * 0.15, hy2 = ey + Math.cos(a + b) * 0.15; F(col, () => { x.moveTo(sx - 0.03, sy); x.lineTo(sx + 0.03, sy); x.lineTo(ex + 0.026, ey); x.lineTo(hx + 0.02, hy2); x.lineTo(hx - 0.02, hy2); x.lineTo(ex - 0.026, ey); x.closePath(); }); F(c.skin, () => x.ellipse(hx, hy2 + 0.012, 0.02, 0.024, 0, 0, TAU)); return [hx, hy2 + 0.012]; };
    const sleeve = mail ? c.steel : (o.sleeveCol || c.cloth), up = ['spear', 'staff', 'poleaxe', 'lance'].includes(o.hold);
    const swing = wk != null && !up ? sw * 0.25 : 0;
    arm(-1, 0.1 + swing, 0.12, shadeHex(sleeve, -0.12));
    if (o.hold === 'sword' && !back) {     // both hands on the pommel, the blade point-down before him
      F(c.steel, () => { x.moveTo(-0.012, -0.6); x.lineTo(0.012, -0.6); x.lineTo(0.004, -0.12); x.lineTo(-0.004, -0.12); x.closePath(); });
      F(c.gold, () => { x.rect(-0.055, -0.61, 0.11, 0.014); x.rect(-0.008, -0.68, 0.016, 0.07); });
      F(c.skin, () => x.ellipse(0, -0.67, 0.03, 0.022, 0, 0, TAU));
    }
    const hx = 0.17, hy3 = -0.56;
    if (up) {
      const top = o.hold === 'staff' ? -1.06 : o.hold === 'lance' ? -1.5 : -1.28;
      F(c.wood, () => x.rect(hx - 0.007, top, 0.014, -top - 0.0));
      if (o.hold === 'spear' || o.hold === 'lance') F(c.steel, () => { x.moveTo(hx, top - 0.11); x.quadraticCurveTo(hx + 0.026, top - 0.05, hx + 0.01, top + 0.005); x.lineTo(hx - 0.01, top + 0.005); x.quadraticCurveTo(hx - 0.026, top - 0.05, hx, top - 0.11); x.closePath(); });
      if (o.hold === 'poleaxe') F(c.steel, () => { x.moveTo(hx + 0.006, top + 0.02); x.quadraticCurveTo(hx + 0.12, top - 0.02, hx + 0.13, top + 0.09); x.quadraticCurveTo(hx + 0.07, top + 0.1, hx + 0.006, top + 0.12); x.closePath(); x.moveTo(hx - 0.006, top + 0.05); x.lineTo(hx - 0.06, top + 0.07); x.lineTo(hx - 0.006, top + 0.09); x.closePath(); x.moveTo(hx, top - 0.09); x.lineTo(hx + 0.01, top); x.lineTo(hx - 0.01, top); x.closePath(); });
      if (o.hold === 'staff') { x.save(); x.strokeStyle = c.gold; x.lineWidth = 0.014; x.beginPath(); x.arc(hx + 0.03, top + 0.005, 0.032, Math.PI, Math.PI * 2.15); x.stroke(); x.restore(); }
      if (o.pennon) { x.save(); x.fillStyle = o.pennon; x.beginPath(); x.moveTo(hx, top + 0.02); x.lineTo(hx + 0.2, top + 0.05 + Math.sin((o.tw || 0) * 5) * 0.01); x.lineTo(hx, top + 0.1); x.closePath(); x.fill(); x.restore(); }
      arm(1, 0.5, 0.9, sleeve);
    } else if (o.hold !== 'sword') arm(1, 0.1 - swing, 0.12, sleeve);
    void hy3;
    // a tall shield (pavise) before the body
    if (o.pavise && !back) {
      const top = -0.82, bot = -0.2, hw = 0.15;
      F(o.pavise.field, () => { x.moveTo(-hw, top + 0.04); x.quadraticCurveTo(-hw, top, 0, top - 0.01); x.quadraticCurveTo(hw, top, hw, top + 0.04); x.lineTo(hw * 0.95, bot - 0.05); x.lineTo(0, bot); x.lineTo(-hw * 0.95, bot - 0.05); x.closePath(); });
      houseMark(x, o.pavise, 0, -0.55, 0.16);
      x.save(); x.strokeStyle = o.pavise === HILD ? '#b8bec6' : '#c9a14a'; x.lineWidth = 0.012; x.beginPath(); x.moveTo(-hw, top + 0.04); x.quadraticCurveTo(-hw, top, 0, top - 0.01); x.quadraticCurveTo(hw, top, hw, top + 0.04); x.lineTo(hw * 0.95, bot - 0.05); x.lineTo(0, bot); x.lineTo(-hw * 0.95, bot - 0.05); x.closePath(); x.stroke(); x.restore();
    }
    if (o.pavise && back) F(shadeHex(o.pavise.field, -0.3), () => { x.rect(-0.15, -0.8, 0.04, 0.58); });
  }
  // a mounted knight from the front or the back (feet at 0, the rider's crown at -1)
  function knight(x, o) {
    const c = o.col, back = !!o.back, coat = c.coat, F = (col, fn) => { x.fillStyle = col; x.beginPath(); fn(); x.fill(); };
    const k = 1 / 2.7;                      // metres -> units (2.7 m tall in all)
    const legs = s => F(shadeHex(coat, -0.2), () => { x.moveTo(s * 0.12 * k * 2.7 * 0.35 - 0.02, -0.4); x.lineTo(s * 0.06 + 0.02, -0.4); x.lineTo(s * 0.06 + 0.012, -0.02); x.lineTo(s * 0.06 - 0.012, -0.02); x.closePath(); });
    void legs;
    for (const s of [-1, 1]) { F(shadeHex(coat, -0.25), () => { x.rect(s * 0.06 - 0.014, -0.42, 0.028, 0.4); }); F('#1a1410', () => x.rect(s * 0.06 - 0.016, -0.04, 0.032, 0.04)); }
    // body (barrel) seen end-on, the caparison over it
    F(coat, () => x.ellipse(0, -0.48, 0.12, 0.1, 0, 0, TAU));
    F(c.cloth, () => { x.moveTo(-0.13, -0.52); x.quadraticCurveTo(0, -0.6, 0.13, -0.52); x.lineTo(0.135, -0.33); for (let i = 0; i <= 6; i++) x.lineTo(0.135 - i * 0.045, -0.33 + (i % 2) * 0.03); x.closePath(); });
    if (!back) { // head and neck rising before the chest
      F(coat, () => { x.moveTo(-0.04, -0.5); x.quadraticCurveTo(-0.05, -0.66, -0.035, -0.74); x.lineTo(0.035, -0.74); x.quadraticCurveTo(0.05, -0.66, 0.04, -0.5); x.closePath(); });
      F(coat, () => { x.ellipse(0, -0.66, 0.034, 0.09, 0, 0, TAU); });
      F(shadeHex(coat, -0.3), () => { x.moveTo(-0.03, -0.75); x.lineTo(-0.022, -0.79); x.lineTo(-0.012, -0.74); x.moveTo(0.03, -0.75); x.lineTo(0.022, -0.79); x.lineTo(0.012, -0.74); });
      houseMark(x, c.house, 0, -0.46, 0.08);
    } else { F(shadeHex(coat, -0.15), () => x.ellipse(0, -0.5, 0.11, 0.08, 0, 0, TAU)); F('#1a1410', () => { x.moveTo(-0.015, -0.5); x.quadraticCurveTo(-0.03, -0.35, -0.01, -0.22); x.lineTo(0.01, -0.22); x.quadraticCurveTo(0.03, -0.35, 0.015, -0.5); x.closePath(); }); }
    // the rider: a person of 1.8 m sitting from y -0.52 (legs to the sides)
    x.save(); x.translate(0, -0.5); x.scale(0.62, 0.62);
    for (const s of [-1, 1]) F(c.leg, () => { x.moveTo(s * 0.1, -0.05); x.lineTo(s * 0.2, 0.05); x.lineTo(s * 0.2, 0.3); x.lineTo(s * 0.16, 0.3); x.lineTo(s * 0.15, 0.08); x.lineTo(s * 0.06, 0.02); x.closePath(); });
    x.translate(0, 0.52 - 0.0); person(x, Object.assign({}, o, { kind: 'armour', walk: undefined, hold: 'lance', pennon: c.house.field, head: 'helm', pavise: null, device: true }));
    x.restore();
  }
  // a piece -> how it looks
  function costume(p) {
    const c = COL[p.side], w = p.side === 'w';
    switch (p.t) {
      case 'P': return p.cael ? { col: Object.assign({}, c, { cloth: '#8a7a60', leg: '#4e3e2c' }), kind: 'tunic', cloak: '#6e5236', head: 'bare', longHair: true, hold: 'spear' }
        : { col: c, kind: 'tunic', head: w ? 'hood' : 'kettle', hoodCol: w ? '#9a8a6a' : c.cap, hold: 'spear', device: !w, belt: w ? '#6e5236' : '#c8ced6' };
      case 'R': return { col: c, kind: 'armour', head: 'helm', hold: p.champ ? 'poleaxe' : 'spear', pavise: c.house, device: true, crest: p.champ ? '#1b2530' : null };
      case 'N': return { col: c, knight: true };
      case 'B': return { col: c, kind: 'robe', head: 'mitre', hold: 'staff', stole: true };
      case 'Q': return { col: c, kind: 'gown', head: 'circlet', veil: w ? '#e9e2d0' : '#9aa6b2', hold: 'none' };
      case 'K': return { col: c, kind: 'robe', head: 'crown', hold: 'sword', cloak: w ? '#6e5236' : '#22303e' };
    }
    return { col: c, kind: 'tunic' };
  }
  // draw one piece into the frame at its projected feet
  const SPR = [], SCACHE = new Map();
  function scratch(i, w, h) { let c = SPR[i]; if (!c) c = SPR[i] = K.canvas(8, 8); if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); } const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, w + 2, h + 2); return c; }
  function drawPiece(ctx, C, s, t, o = {}) {
    const p = s.p, ht = HT[p.t] * (p.champ ? 1.12 : 1) * (p.cael ? 1.02 : 1) * (o.big || 1), y0 = s.lift || 0;
    const foot = pj(C, s.x, y0, s.z); if (!foot) return null;
    const head = pj(C, s.x, y0 + ht, s.z); if (!head) return null;
    const sPx = foot[3] * ht, trueH = Math.hypot(head[0] - foot[0], head[1] - foot[1]);
    const hPx = Math.max(trueH, sPx * (o.minK || 0.66)), wPx = sPx;
    if (hPx < 3 || foot[0] < -wPx || foot[0] > W + wPx || foot[1] < -40 || foot[1] - hPx > H + 40) return null;
    const back = (s.face * (C.pz - s.z)) < 0;
    const cos = costume(p), tilt = Math.atan2(head[0] - foot[0], foot[1] - head[1]) * (trueH > sPx * 0.66 ? 1 : 0.3);
    // a sprite, cached by look, view and size (quantised); walkers are drawn fresh
    const still = s.walk == null, hq = still ? Math.pow(2, Math.round(Math.log2(hPx) * 10) / 10) : hPx, aq = still ? Math.round(hPx / wPx * 20) / 20 : hPx / wPx, wq = hq / aq;
    const kq = Math.round(s.kneel * 12) / 12, key = [p.side, p.t, p.cael ? 1 : 0, p.champ ? 1 : 0, back ? 1 : 0, hq.toFixed(2), aq, kq, o.tint || ''].join('|');
    const SWp = Math.ceil(wq * (cos.knight ? 0.55 : 0.62) + 8), SHp = Math.ceil(hq * 1.18 + 8);
    let sp = still ? SCACHE.get(key) : null;
    if (!sp) {
      sp = still ? K.canvas(SWp, SHp) : scratch(0, SWp, SHp); const x = sp.getContext('2d');
      x.save(); x.translate(SWp / 2, SHp - 4); x.scale(wq, hq * (1 - kq * 0.32));
      const opts = Object.assign({}, cos, { back, walk: s.walk, tw: 0 });
      if (cos.knight) knight(x, opts); else person(x, opts);
      x.restore();
      // light: overcast from the south-west sky; a soft dark at the feet
      x.save(); x.globalCompositeOperation = 'source-atop';
      const g = x.createLinearGradient(0, 0, SWp, 0); g.addColorStop(0, 'rgba(255,250,236,0.16)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,14,20,0.28)'); x.fillStyle = g; x.fillRect(0, 0, SWp, SHp);
      const g2 = x.createLinearGradient(0, SHp, 0, SHp - hq * 0.4); g2.addColorStop(0, 'rgba(10,12,8,0.35)'); g2.addColorStop(1, 'rgba(10,12,8,0)'); x.fillStyle = g2; x.fillRect(0, 0, SWp, SHp);
      if (o.tint) { x.fillStyle = o.tint; x.fillRect(0, 0, SWp, SHp); }
      x.restore();
      if (still) { SCACHE.set(key, sp); if (SCACHE.size > 500) { const k0 = SCACHE.keys().next().value; SCACHE.delete(k0); } }
    }
    const kx = wPx / wq, ky = hPx / hq;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = s.alpha * (o.alpha != null ? o.alpha : 1);
    ctx.translate(foot[0], foot[1]); ctx.rotate(tilt); ctx.scale(kx, ky); ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sp, 0, 0, SWp, SHp, -SWp / 2, -(SHp - 4), SWp, SHp);
    ctx.restore();
    return { foot, head, hPx, wPx };
  }
  // a soft shadow on the grass under a piece (overcast: a contact blob)
  function blobShadow(ctx, C, x, z, r, a) {
    const c = pj(C, x, 0.02, z), e = pj(C, x + r, 0.02, z), n = pj(C, x, 0.02, z + r); if (!c || !e || !n) return;
    const rx = Math.hypot(e[0] - c[0], e[1] - c[1]), ry = Math.max(2, Math.hypot(n[0] - c[0], n[1] - c[1]));
    ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(16,20,10,${a})`); g.addColorStop(0.6, `rgba(16,20,10,${a * 0.4})`); g.addColorStop(1, 'rgba(16,20,10,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  }
  // a square of the board, lit (for the open file, the door, the cage)
  function squareFill(ctx, C, f, r, col, a, inset = 0.08) {
    if (a <= 0.003) return; const x0 = sqX(f) - SQ / 2 + inset, x1 = sqX(f) + SQ / 2 - inset, z0 = sqZ(r) - SQ / 2 + inset, z1 = sqZ(r) + SQ / 2 - inset;
    const sp = projPoly(C, [[x0, 0.03, z0], [x1, 0.03, z0], [x1, 0.03, z1], [x0, 0.03, z1]]); if (sp.length < 3) return;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; pathPoly(ctx, sp); ctx.fill(); ctx.restore();
  }
  function groundLine(ctx, C, ax, az, bx, bz, col, w, a, p = 1) {
    if (a <= 0.003 || p <= 0) return; const A = pj(C, ax, 0.05, az), B = pj(C, lerp(ax, bx, p), 0.05, lerp(az, bz, p)); if (!A || !B) return;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = w * (A[3] + B[3]) / 2; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.restore();
  }

  // ---------------------------------------------------------------- the meadow world
  const TREES = (() => { const r = rng(5001), out = []; for (let z = -140; z < 160; z += 7 + r() * 6) for (const s of [-1, 1]) if (r() < 0.8) out.push({ x: riverX(z) + s * (RIVW / 2 + 3 + r() * 5), z, k: Math.floor(r() * 3), s: 7 + r() * 5 }); for (let i = 0; i < 26; i++) out.push({ x: -40 - r() * 120, z: -60 + r() * 220, k: Math.floor(r() * 3), s: 8 + r() * 6 }); return out.filter(t => !(t.z > -6 && t.z < 30 && t.x < riverX(t.z)) && !(Math.abs(t.z - FORDZ) < 7 && Math.abs(t.x - riverX(FORDZ)) < 12)); })();
  const CROWDS = [{ x: -15.2, z: -4.5, ry: 0 }, { x: -15.2, z: 7.5, ry: 0 }, { x: 15.2, z: -4.5, ry: 0 }, { x: 15.2, z: 7.5, ry: 0 }, { x: -6, z: -16.5, ry: 1 }, { x: 6, z: -16.5, ry: 1 }, { x: -6, z: 16.8, ry: 1 }, { x: 6, z: 16.8, ry: 1 }];
  function hillsRing(C, R, base, amp, seed, col, lo) {
    const pts = [], n = 160;
    for (let i = 0; i <= n; i++) { const a = i / n * TAU, dirS = Math.cos(a), h = base + amp * K.fbm(Math.cos(a) * 2.2 + 5, Math.sin(a) * 2.2 + 5, 4, seed) * (1 - lo * smooth(clamp(-dirS * 1.4))); pts.push([Math.sin(a) * R, h, Math.cos(a) * R]); }
    // close the band downward (below the horizon) in camera space, drawn in visible pieces
    const cs = pts.map(p => toCam(C, C.px + p[0], p[1], C.pz + p[2]));
    let run = []; const runs = [];
    for (const c of cs) { if (c[2] > 1) run.push([C.cx + C.f * c[0] / c[2], C.cy - C.f * c[1] / c[2], C.cy - C.f * (-30) / c[2]]); else if (run.length) { runs.push(run); run = []; } }
    if (run.length) runs.push(run);
    for (const rn of runs) { if (rn.length < 2) continue; C.ctx.fillStyle = col; C.ctx.beginPath(); C.ctx.moveTo(rn[0][0], rn[0][1]); for (const q of rn) C.ctx.lineTo(q[0], q[1]); for (let i = rn.length - 1; i >= 0; i--) C.ctx.lineTo(rn[i][0], Math.max(rn[i][2], rn[i][1] + 2)); C.ctx.closePath(); C.ctx.fill(); }
  }
  function cloudShadows(ctx, C, t) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 9; i++) {
      const r = K.hash(i, 1, 61), r2 = K.hash(i, 2, 61), R = 18 + r2 * 26, span0 = 260;
      const x = -130 + ((r * span0 + t * 3.2) % span0), z = -110 + K.hash(i, 3, 61) * 200;
      const c = pj(C, x, 0, z), e = pj(C, x + R, 0, z), n = pj(C, x, 0, z + R); if (!c || !e || !n) continue;
      const rx = Math.hypot(e[0] - c[0], e[1] - c[1]), ry = Math.max(1, Math.hypot(n[0] - c[0], n[1] - c[1]));
      if (c[0] + rx < 0 || c[0] - rx > W || c[1] + ry < 0 || c[1] - ry > H || rx < 4) continue;
      ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, 'rgba(120,128,136,0.55)'); g.addColorStop(0.55, 'rgba(150,156,162,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  function drawSky(ctx, C, t) {
    const yaw = Math.atan2(C.fx, C.fz), pitch = Math.asin(clamp(C.fy, -1, 1));
    const horizon = C.cy + Math.tan(pitch) * C.f;
    const g = ctx.createLinearGradient(0, horizon - C.f * 0.9, 0, horizon + 10);
    g.addColorStop(0, '#7f8b96'); g.addColorStop(0.55, '#aeb4b6'); g.addColorStop(0.9, '#d6d4ca'); g.addColorStop(1, '#dedbd0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.min(H, Math.max(0, horizon + 40)));
    if (horizon > 0) {
      // the cloud band, wrapped by azimuth, drifting
      const cl = cloudTex(), ppr = C.f, iw = cl.width, bandH = C.f * 0.55;
      const u0 = ((((yaw - (C.cx / ppr)) / TAU + t * 0.0016) % 1) + 1) % 1 * iw, uw = W / (ppr * TAU) * iw;
      ctx.save(); ctx.globalAlpha = 0.9;
      const y0 = horizon - bandH, hh = bandH + 6;
      if (u0 + uw <= iw) ctx.drawImage(cl, u0, 0, uw, cl.height, 0, y0, W, hh);
      else { const a1 = iw - u0, w1 = W * a1 / uw; ctx.drawImage(cl, u0, 0, a1, cl.height, 0, y0, w1, hh); ctx.drawImage(cl, 0, 0, uw - a1, cl.height, w1, y0, W - w1, hh); }
      ctx.restore();
      // a brighter patch where the sun is behind the cloud (south-west, low)
      const sd = [-0.55, 0.32, -0.77], sv = [sd[0] * C.rx + sd[1] * C.ry + sd[2] * C.rz, sd[0] * C.ux + sd[1] * C.uy + sd[2] * C.uz, sd[0] * C.fx + sd[1] * C.fy + sd[2] * C.fz];
      if (sv[2] > 0.05) K.glow(ctx, C.cx + C.f * sv[0] / sv[2], C.cy - C.f * sv[1] / sv[2], C.f * 0.5, [255, 246, 220], 0.28);
    }
    return horizon;
  }
  // everything in the meadow, from the sky down; o.state (pieces), o.overlay(ctx, C) (lit squares), o.minK
  function world(ctx, C, t, o = {}) {
    C.ctx = ctx;
    const horizon = drawSky(ctx, C, t);
    // fells: three ridges of aerial perspective, the far south low (the valley the road runs down)
    if (horizon > -200) {
      hillsRing(C, 2600, 80, 420, 11, '#8e9a9e', 0.7);
      hillsRing(C, 1400, 30, 230, 12, '#77867e', 0.75);
      hillsRing(C, 700, 6, 110, 13, '#5f7158', 0.8);
    }
    plane(ctx, C, farMips(), [FX0, 0, FZ0], [FSZ, 0, 0], [0, 0, -FSZ], { roots: [4, 4], err: 14, maxDep: 6, skip: (a0, b0, a1, b1) => { const x0 = FX0 + a0 * FSZ, x1 = FX0 + a1 * FSZ, z0 = FZ0 - b1 * FSZ, z1 = FZ0 - b0 * FSZ; return x0 > -26 && x1 < 26 && z0 > -26 && z1 < 26; } });
    plane(ctx, C, nearMips(), [-NS / 2, 0.005, NS / 2], [NS, 0, 0], [0, 0, -NS], { roots: [2, 2], err: 6, maxDep: 7, skip: (a0, b0, a1, b1) => { const x0 = -NS / 2 + a0 * NS, x1 = -NS / 2 + a1 * NS, z0 = NS / 2 - b1 * NS, z1 = NS / 2 - b0 * NS; return x0 > -BE + 0.3 && x1 < BE - 0.3 && z0 > -BE + 0.3 && z1 < BE - 0.3; } });
    // haze toward the horizon (over the ground, under everything standing)
    if (horizon > 0) { const g = ctx.createLinearGradient(0, horizon - 30, 0, horizon + C.f * 0.12); g.addColorStop(0, 'rgba(214,214,206,0.7)'); g.addColorStop(0.35, 'rgba(206,208,200,0.25)'); g.addColorStop(1, 'rgba(206,208,200,0)'); ctx.fillStyle = g; ctx.fillRect(0, Math.max(0, horizon - 30), W, C.f * 0.12 + 30); }
    // cloud shadows drifting over the meadow (the light moves)
    cloudShadows(ctx, C, t);
    // the valley's sides: long ridges east and west of the road south, layered by distance
    for (const [x0, amp, h0, col, sd] of [[-420, 70, 90, '#7d8c84', 1], [520, 90, 120, '#7a8a82', 2], [-260, 40, 45, '#61745a', 3], [300, 50, 60, '#5e7258', 4]]) {
      const top = [], base = [];
      for (let z = 260; z >= -1400; z -= 40) { const x = x0 + 60 * Math.sin(z * 0.004 + sd) + (x0 < 0 ? -1 : 1) * Math.max(0, -z - 200) * 0.12, h = h0 + amp * K.fbm(z * 0.006 + sd * 7, sd, 3, 70 + sd); top.push([x, h, z]); base.push([x + (x0 < 0 ? 1 : -1) * Math.min(h * 2.4, Math.abs(x0) * 0.3), 0, z]); }
      const sp = projPoly(C, top.concat(base.reverse())); if (sp.length > 2) { ctx.fillStyle = col; pathPoly(ctx, sp); ctx.fill(); }
    }
    // the hold on its rise across the river (north-east), haze over it
    const hold = pj(C, 95, 0, 120); if (hold) { const s = hold[3] * 70; ctx.save(); ctx.globalAlpha = 0.92; ctx.drawImage(holdSprite(), hold[0] - s / 2, hold[1] - s * 260 / 640 * 0.96, s, s * 260 / 640); ctx.restore(); }
    // the river moving: light on the runs, flowing south
    ctx.save(); ctx.strokeStyle = '#e6eeee'; ctx.lineCap = 'round';
    for (let i = 0; i < 90; i++) { const r = K.hash(i, 3, 41), r2 = K.hash(i, 5, 43), L = 140, z = 80 - ((r * L + t * 1.6) % L), xx = riverX(z) + (r2 - 0.5) * RIVW * 0.8; const A = pj(C, xx, 0.04, z), B = pj(C, riverX(z - 1.4) + (r2 - 0.5) * RIVW * 0.8, 0.04, z - 1.4); if (!A || !B) continue; ctx.globalAlpha = 0.18 * Math.sin(((r * L + t * 1.6) % 6) / 6 * Math.PI); ctx.lineWidth = Math.max(0.6, A[3] * 0.08); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); }
    ctx.restore();
    // the board
    const bm = boardMips(); plane(ctx, C, bm, [-BE, 0.012, BE], [2 * BE, 0, 0], [0, 0, -2 * BE], { roots: [2, 2], err: 2.5, maxDep: 8 });
    if (o.overlay) o.overlay(ctx, C);
    // shadows, then everything standing, far to near
    const items = [];
    for (const tr of TREES) { const v = toCam(C, tr.x, 0, tr.z); if (v[2] > 2 && v[2] < 900) items.push({ d: v[2], fn: () => { const f = pj(C, tr.x, 0, tr.z); if (!f) return; const s = f[3] * tr.s, img = treeSprite(tr.k); if (s < 2 || f[0] < -s || f[0] > W + s) return; ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(img, f[0] - s * 0.4, f[1] - s, s * 0.8, s); ctx.fillStyle = `rgba(206,208,204,${clamp((v[2] - 40) / 400) * 0.7})`; ctx.globalCompositeOperation = 'source-atop'; ctx.restore(); } }); }
    if (o.crowds !== false) CROWDS.forEach((cw, i) => { const v = toCam(C, cw.x, 0, cw.z); if (v[2] > 1) items.push({ d: v[2], fn: () => {
      const len = 10, ax = cw.ry ? cw.x - len / 2 : cw.x, az = cw.ry ? cw.z : cw.z - len / 2, bx = cw.ry ? cw.x + len / 2 : cw.x, bz = cw.ry ? cw.z : cw.z + len / 2;
      const A = pj(C, ax, 0, az), B = pj(C, bx, 0, bz); if (!A || !B) return; const img = crowdSprite(i % 3), hA = A[3] * 1.85 * 200 / 165, hB = B[3] * 1.85 * 200 / 165;
      // a sheared strip between the two ends
      const n = 16; for (let k = 0; k < n; k++) { const u0 = k / n, u1 = (k + 1) / n, x0 = lerp(A[0], B[0], u0), x1 = lerp(A[0], B[0], u1), y0 = lerp(A[1], B[1], (u0 + u1) / 2), hh = lerp(hA, hB, (u0 + u1) / 2); const sway = Math.sin(t * 1.3 + k) * 0.6; ctx.drawImage(img, u0 * img.width, 0, img.width / n + 1, img.height, Math.min(x0, x1) + sway, y0 - hh, Math.abs(x1 - x0) + 1, hh); }
    } }); });
    // banners on poles at either end of the board
    for (const [bx, bz, hs, sd, big] of [[-4.5, -13.2, EALD, 1], [4.5, -13.2, EALD, 2], [-4.5, 13.2, HILD, 3], [4.5, 13.2, HILD, 4], ...(o.extraBanners || [])]) {
      const v = toCam(C, bx, 0, bz); if (v[2] < 1) continue;
      items.push({ d: v[2], fn: () => { const k = big || 1, ph = 6.5 * k, A = pj(C, bx, 0, bz), B = pj(C, bx, ph, bz); if (!A || !B) return; ctx.save(); ctx.strokeStyle = '#2a2016'; ctx.lineWidth = Math.max(1, A[3] * 0.12 * k); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.restore(); const s = B[3] * k; if (big) drawFlag(ctx, hs, B[0], B[1], s * 2.4, s * 1.5, t, 0.9, sd); else drawBanner(ctx, hs, B[0], B[1] + s * 0.3, s * 1.5, s * 2.6, t, 0.7, sd); } });
    }
    // arbiters at the middle of either side
    for (const [ax, az, fc] of [[-12.3, 0.6, 1], [12.3, -0.6, -1]]) { const v = toCam(C, ax, 0, az); if (v[2] > 1) items.push({ d: v[2], fn: () => drawPiece(ctx, C, { p: { side: 'w', t: 'B' }, x: ax, z: az, kneel: 0, alpha: 1, face: fc }, t, { tint: 'rgba(90,90,96,0.55)', minK: o.minK }), shadow: [ax, az] }); }
    for (const s of (o.state || [])) { const v = toCam(C, s.x, 0, s.z); if (v[2] > 0.5) items.push({ d: v[2], fn: () => drawPiece(ctx, C, s, t, { minK: o.minK, big: o.big, tint: s.p.cael && o.caelLight ? `rgba(255,214,150,${o.caelLight})` : null }), shadow: [s.x, s.z, s.alpha * (1 - (s.lift || 0) / 3)] }); }
    for (const it of items) if (it.shadow) blobShadow(ctx, C, it.shadow[0], it.shadow[1], 0.75, 0.42 * (it.shadow[2] != null ? it.shadow[2] : 1));
    items.sort((a, b) => b.d - a.d); for (const it of items) it.fn();
  }

  // ---------------------------------------------------------------- shots in the meadow
  const washTile = () => K.cached('s4:wash', () => {
    const n = 512, c = K.canvas(n, n), x = c.getContext('2d'), img = x.createImageData(n, n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const u = i / n * TAU, v = j / n * TAU; const f = K.fbm(Math.cos(u) * 1.6 + 3, Math.sin(u) * 1.6 + Math.cos(v) * 1.6, 4, 19) * 0.7 + K.fbm(Math.sin(v) * 5 + 1, Math.cos(v) * 5 + Math.sin(u) * 2, 3, 22) * 0.3; const k = (j * n + i) * 4, val = clamp(128 + (f - 0.5) * 120, 0, 255); img.data[k] = img.data[k + 1] = img.data[k + 2] = val; img.data[k + 3] = 255; }
    x.putImageData(img, 0, 0); return c;
  });
  function finishDay(ctx, amt = 1) {
    ctx.save(); ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.1; K.tile(ctx, washTile(), 0, 0, W / 2 + 2, H / 2 + 2, 0, 0); ctx.restore();
    K.grade(ctx, '#e8e2d2', 'soft-light', 0.22 * amt);
    K.grade(ctx, '#4a5a66', 'multiply', 0.08 * amt);
    K.vignette(ctx, 0.42, '12,14,16', 0.38);
  }
  // overlays: the open file, the door, the cage
  function boardOverlay(t, T) {
    return (ctx, C) => {
      // the open file: light running down d8..d1 while they believe it a mistake, then a faint corridor
      const run = span(t, T.cutFile + 0.35, T.cutFile + 2.4), fileA = win(t, T.cutFile + 0.2, T.m3 + 0.4, 0.4, 0.4);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let r = 6; r >= 0; r--) { const u = 6 - r, lit = smooth(clamp(run * 8 - u)) * (1 - 0.55 * smooth(clamp(run * 8 - u - 1.5))); squareFill(ctx, C, 3, r, '#ffc870', (0.08 + 0.34 * lit) * fileA, 0.02); }
      ctx.restore();
      // the champion's path as he charges
      const ch = span(t, T.m2, T.m2 + 1.55); if (t > T.m2 && t < T.m3 + 0.8) groundLine(ctx, C, sqX(3), sqZ(7), sqX(3), lerp(sqZ(7), sqZ(1), smooth(ch)), '#26384a', 0.35, 0.35 * win(t, T.m2, T.m3 + 0.8, 0.2, 0.5));
      // the door: d5 lit gold as the knight lands; the corridor behind it goes dark
      const door = smooth(span(t, T.m3 + 0.5, T.m3 + 0.8)) * (1 - smooth(span(t, T.m5 + 0.6, T.m5 + 1.4)));
      squareFill(ctx, C, 3, 4, '#f4cf6a', 0.55 * door, 0.04);
      if (door > 0) { const z = sqZ(4) + SQ / 2 - 0.08; groundLine(ctx, C, sqX(3) - SQ / 2, z, sqX(3) + SQ / 2, z, '#ffe6a0', 0.18, door); }
      // the bishop's line through c3 to the rook on d2, then the cage
      const bl = span(t, T.m3 + 0.55, T.m3 + 0.95), blA = win(t, T.m3 + 0.55, T.m4 + 0.2, 0.1, 0.3);
      groundLine(ctx, C, sqX(1), sqZ(3), sqX(3), sqZ(1), '#ffd98a', 0.16, blA, smooth(bl));
      const cage = [['d', 1], ['c', 2], ['e', 2], ['d', 3], ['d', 4], ['b', 2], ['f', 2]];
      cage.forEach(([f, r], i) => { const a = win(t, T.cage + i * 0.06, T.m4 + 0.1, 0.12, 0.25); squareFill(ctx, C, f.charCodeAt(0) - 97, r - 1, '#9b2f1f', 0.42 * a); });
      squareFill(ctx, C, 3, 1, '#9b2f1f', 0.5 * win(t, T.cage, T.m4 + 0.1, 0.12, 0.25), 0.02);
      // Cael's square: warm when he stands in the door
      squareFill(ctx, C, 3, 4, '#ffd27a', 0.45 * win(t, T.m5 + 0.45, T.s1 + 1, 0.3, 0.6));
    };
  }
  function meadowShot(ctx, t, C, T, o = {}) { world(ctx, C, t, o); finishDay(ctx); }
  // the chess notation in the margin of the diagram (allowed: chess)
  function notation(ctx, t, T, a) {
    if (a <= 0.01) return;
    const items = [['1. dxe4', T.m1 + 0.3], ['Rd2', T.m2 + 0.6], ['2. Nd5!', T.m3 + 0.4], ['Rxd5', T.m4 + 0.3], ['3. exd5', T.m5 + 0.3]];
    let x = 120; const y = H - 96;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(14,12,10,0.0)';
    for (const [s, t0] of items) { const v = smooth(span(t, t0, t0 + 0.35)); if (v <= 0) break; K.text(ctx, s, x, y, '500 30px "EB Garamond"', 'rgba(248,242,226,0.92)', 1, 'left', v); x += K.measure(ctx, s, '500 30px "EB Garamond"', 1) + 22; }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the challenge at the gate (a painted tableau)
  function gateShot(ctx, t, T) {
    const lt = t - T.s0, d = T.cutSeal - T.s0, u = clamp(lt / d), z = lerp(1.0, 1.07, ease(u)), px = lerp(-30, 20, ease(u));
    // sky: bright overcast, moving cloud
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#8a96a0'); g.addColorStop(0.55, '#c9cbc6'); g.addColorStop(1, '#d9d4c4'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const cl = cloudTex(); ctx.save(); ctx.globalAlpha = 0.85; ctx.drawImage(cl, (lt * 6) % 600 + 200, 0, 1400, 512, 0, -40, W, H * 0.7); ctx.restore();
    const par = (k, fn) => { ctx.save(); ctx.translate(W / 2, H * 0.62); ctx.scale(lerp(1, z, k), lerp(1, z, k)); ctx.translate(-W / 2 + px * k, -H * 0.62); fn(); ctx.restore(); };
    // far fells, then mist along their feet
    par(0.15, () => { ctx.fillStyle = '#8f9a9a'; ctx.beginPath(); ctx.moveTo(-100, 640); for (let i = 0; i <= 40; i++) ctx.lineTo(-100 + i * 55, 560 - 120 * K.fbm(i * 0.18, 3, 3, 81)); ctx.lineTo(W + 100, 700); ctx.lineTo(-100, 700); ctx.fill(); ctx.fillStyle = '#76857c'; ctx.beginPath(); ctx.moveTo(-100, 700); for (let i = 0; i <= 40; i++) ctx.lineTo(-100 + i * 55, 640 - 70 * K.fbm(i * 0.22, 5, 3, 82)); ctx.lineTo(W + 100, 760); ctx.lineTo(-100, 760); ctx.fill(); });
    ctx.save(); const mg = ctx.createLinearGradient(0, 520, 0, 700); mg.addColorStop(0, 'rgba(214,214,206,0)'); mg.addColorStop(0.6, 'rgba(214,214,206,0.55)'); mg.addColorStop(1, 'rgba(214,214,206,0.2)'); ctx.fillStyle = mg; ctx.fillRect(0, 520, W, 180); ctx.restore();
    // the palisade and the gate tower (Ealdholt), the russet sprig banner over the gate
    par(0.45, () => {
      const base = 760, gx = 1180;
      const gg0 = ctx.createLinearGradient(0, base, 0, base + 320); gg0.addColorStop(0, '#6a6a52'); gg0.addColorStop(1, '#4e4836'); ctx.fillStyle = gg0; ctx.fillRect(-300, base - 4, W + 600, 600);
      ctx.fillStyle = 'rgba(90,80,60,0.6)'; ctx.beginPath(); ctx.moveTo(gx - 140, base); ctx.lineTo(gx + 140, base); ctx.lineTo(gx + 520, base + 330); ctx.lineTo(gx - 700, base + 330); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4b3f30';
      for (let i = 0; i < 58; i++) { const X = -60 + i * 38, hgt = 170 + 16 * K.hash(i, 2, 83); if (X > gx - 150 && X < gx + 150) continue; ctx.beginPath(); ctx.moveTo(X, base); ctx.lineTo(X, base - hgt); ctx.lineTo(X + 17, base - hgt - 26); ctx.lineTo(X + 34, base - hgt); ctx.lineTo(X + 34, base); ctx.fill(); ctx.fillStyle = 'rgba(255,240,210,0.08)'; ctx.fillRect(X, base - hgt, 6, hgt); ctx.fillStyle = '#4b3f30'; }
      // tower over the gate
      ctx.fillStyle = '#3c3226'; ctx.fillRect(gx - 165, base - 400, 330, 40); ctx.fillRect(gx - 160, base - 360, 26, 360); ctx.fillRect(gx + 134, base - 360, 26, 360);
      ctx.beginPath(); ctx.moveTo(gx - 190, base - 400); ctx.lineTo(gx, base - 490); ctx.lineTo(gx + 190, base - 400); ctx.fill();
      ctx.fillStyle = 'rgba(255,244,220,0.1)'; ctx.fillRect(gx - 160, base - 360, 8, 360);
      // the open gate: dark within, two leaves swung in
      ctx.fillStyle = '#1c1712'; ctx.fillRect(gx - 134, base - 330, 268, 330);
      ctx.fillStyle = '#5a4a36'; ctx.beginPath(); ctx.moveTo(gx - 134, base - 330); ctx.lineTo(gx - 70, base - 300); ctx.lineTo(gx - 70, base); ctx.lineTo(gx - 134, base); ctx.fill(); ctx.beginPath(); ctx.moveTo(gx + 134, base - 330); ctx.lineTo(gx + 70, base - 300); ctx.lineTo(gx + 70, base); ctx.lineTo(gx + 134, base); ctx.fill();
      drawBanner(ctx, EALD, gx, base - 372, 120, 210, t, 0.6, 1);
      // Ealdholt's people at the gate: Edda (shawl, silver hair) to take the challenge; Cael with his spear
      K.figure(ctx, gx - 30, base + 6, 190, { kind: 'gown', head: 'veil', hold: 'none', face: -1, arm: lerp(0.2, 1.1, smooth(span(t, T.seal - 0.6, T.seal))), bend: 0.3, style: 'painted', robe: '#4a4a36', veil: '#c9c6bc', skin: '#a88466', hose: '#3a2e22' });
      K.figure(ctx, gx + 70, base + 8, 228, { kind: 'cloak', head: 'hair', hold: 'spear', face: -1, style: 'painted', robe: '#6e5236', hose: '#4e3e2c', hairCol: '#2a1e16', skin: '#a88466' });
      K.figure(ctx, gx + 150, base + 4, 216, { kind: 'tunic', head: 'hood', hold: 'spear', face: -1, style: 'painted', robe: '#8a7a5c', hose: '#4e3e2c', skin: '#a88466' });
    });
    // the riders of Hildmere, the lead one holding out the sealed challenge
    par(0.8, () => {
      const base = 960, hs = 360;
      const riders = [[640, 0, 'scroll'], [380, 0.9, 'banner'], [150, 1.7, 'spear']];
      for (const [rx, ph, hold] of riders) {
        const walk = rx === 560 ? undefined : t * 1.2 + ph, bob = Math.sin(t * 2 + ph) * 2;
        K.horse(ctx, rx, base + bob, hs, { face: 1, walk, fill: '#2a2c30', house: HILD, rider: { kind: 'armour', head: 'helm', hold: hold === 'scroll' ? 'scroll' : hold, arm: hold === 'scroll' ? lerp(0.5, 1.45, smooth(span(t, T.seal - 1.4, T.seal - 0.4))) : undefined, bend: hold === 'scroll' ? 0.1 : undefined, banner: hold === 'banner' ? HILD : undefined, t, fill: '#24272c' } });
        wavyBar(ctx, rx - hs * 0.05, base + bob - hs * 0.72, hs * 0.22, hs * 0.06, HILD.charge);
        if (hold === 'banner') { /* the banner's charge */ }
      }
      // the seal: a dot of blue-grey wax on the scroll in the lead rider's hand
      // ground: mud and puddles reflecting the sky
      ctx.fillStyle = '#4a4232'; ctx.fillRect(-200, base + 2, W + 400, 300);
      ctx.strokeStyle = 'rgba(120,120,80,0.5)'; ctx.lineWidth = 3; for (let i = 0; i < 70; i++) { const X = K.hash(i, 5, 86) * (W + 200) - 100, Y = base + 10 + K.hash(i, 6, 86) * 110, sw = Math.sin(t * 2 + i) * 4; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + sw, Y - 14 - 10 * K.hash(i, 7, 86)); ctx.stroke(); }
      const gg = ctx.createLinearGradient(0, base, 0, base + 200); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(0,0,0,0.3)'); ctx.fillStyle = gg; ctx.fillRect(-200, base, W + 400, 300);
      for (let i = 0; i < 6; i++) { const X = 100 + i * 330 + 60 * K.hash(i, 1, 85), Y = base + 40 + 60 * K.hash(i, 2, 85); ctx.fillStyle = 'rgba(190,196,196,0.35)'; ctx.beginPath(); ctx.ellipse(X, Y, 90 + 40 * K.hash(i, 3, 85), 10, 0, 0, TAU); ctx.fill(); }
    });
    finishDay(ctx);
  }
  // the seal breaks and the challenge unrolls: an inked board, the two devices either side
  function sealShot(ctx, t, T) {
    const lt = t - T.cutSeal, dur = T.cutMeadow - T.cutSeal, z = lerp(1.15, 1.72, ease(clamp(lt / (dur + 0.5))));
    // planks of a trestle at the gate, seen from above, daylight from the upper left
    const wood = K.cached('s4:planks', () => {
      const w = 2200, h = 1300, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(4420);
      for (let i = 0; i < 7; i++) { const y0 = i * h / 7; x.fillStyle = toHex(96 + r() * 18, 74 + r() * 12, 52 + r() * 10); x.fillRect(0, y0, w, h / 7); }
      blot(x, w, h, 120, 0.3, [40, 28, 16], 'multiply', r); blot(x, w, h, 18, 0.15, [40, 28, 16], 'multiply', r);
      strokes(x, 6000, w, h, r, ['#4a3420', '#7a5a3a', '#3a2814', '#8a6a48'], 60, 0.25, 0, 0.05, 1.5);
      x.fillStyle = 'rgba(20,12,6,0.7)'; for (let i = 1; i < 7; i++) x.fillRect(0, i * h / 7 - 3, w, 6);
      for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(30,22,14,0.8)'; x.beginPath(); x.arc(r() * w, (Math.floor(r() * 7) + 0.5) * h / 7, 6, 0, TAU); x.fill(); }
      return c;
    });
    ctx.save(); ctx.translate(W / 2, H / 2); const wz = Math.max(z * 0.62, 0.95); ctx.scale(wz, wz); ctx.rotate(0.03); ctx.drawImage(wood, -wood.width / 2, -wood.height / 2); ctx.restore();
    const page = K.cached('s4:challenge', () => {
      const w = 900, h = 900, c = K.parchment(w, h, 4411, { edge: 1.1, stains: 2 }), x = c.getContext('2d');
      const b0 = 160, bs = (w - 2 * b0) / 8;
      x.save(); x.globalCompositeOperation = 'multiply';
      for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) if ((f + r) % 2 === 1) { x.fillStyle = 'rgba(32,22,12,0.55)'; x.fillRect(b0 + f * bs + 2, b0 + r * bs + 2, bs - 4, bs - 4); }
      x.strokeStyle = 'rgba(32,21,12,0.9)'; x.lineWidth = 4; x.strokeRect(b0, b0, bs * 8, bs * 8); x.lineWidth = 1.5; x.strokeRect(b0 - 12, b0 - 12, bs * 8 + 24, bs * 8 + 24);
      x.restore();
      K.shield(x, w / 2, 58, 44, HILD, {}); wavyBar(x, w / 2, 76, 60, 16, HILD.charge);
      K.shield(x, w / 2, h - 118, 44, EALD, {});
      return c;
    });
    const unroll = smooth(span(t, T.cutSeal + 0.3, T.cutSeal + 1.25));
    const pw = page.width, ph = page.height * lerp(0.1, 1, unroll), top = -ph / 2;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z);
    ctx.save(); ctx.filter = 'blur(10px)'; ctx.fillStyle = 'rgba(10,6,2,0.45)'; ctx.fillRect(-pw / 2 + 18, top + 22, pw, ph); ctx.restore();
    ctx.drawImage(page, 0, (page.height - ph) / 2, pw, ph, -pw / 2, top, pw, ph);
    // the rolls: one at the head, one rolling down as it opens
    for (const yy of [top, top + ph]) { const g = ctx.createLinearGradient(0, yy - 22, 0, yy + 22); g.addColorStop(0, '#7a5e3a'); g.addColorStop(0.45, '#e6d4ac'); g.addColorStop(1, '#5e4628'); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-pw / 2 - 8, yy - 22, pw + 16, 44, 18); ctx.fill(); }
    // the seal on the head roll: blue-grey wax stamped with the wavy bar; it cracks in two as the roll opens
    const crack = smooth(span(t, T.cutSeal + 0.05, T.cutSeal + 0.4));
    for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd * crack * 30, top + crack * 14); ctx.rotate(sd * crack * 0.5); ctx.fillStyle = '#34465a'; ctx.beginPath(); ctx.arc(0, 0, 48, sd < 0 ? Math.PI / 2 : -Math.PI / 2, sd < 0 ? Math.PI * 1.5 : Math.PI / 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.arc(sd * 14 - 6, -12, 16, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = 1 - crack; wavyBar(ctx, 0, top, 54, 13, '#c8ced6'); ctx.restore();
    ctx.restore();
    K.glow(ctx, W * 0.2, H * 0.1, 900, [255, 244, 220], 0.18);
    K.vignette(ctx, 0.55, '12,8,4', 0.32);
  }
  // ---------------------------------------------------------------- the banner raised over the ford (low, looking up)
  function bannerShot(ctx, t, T) {
    const lt = t - T.cutBanner, u = clamp(lt / (T.cutValley - T.cutBanner + 0.4));
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#76848f'); g.addColorStop(0.6, '#b9bdb8'); g.addColorStop(1, '#d8d2c0'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const cl = cloudTex(); ctx.save(); ctx.globalAlpha = 0.9; ctx.drawImage(cl, 300 + lt * 30, 0, 1200, 512, -100, -80, W + 200, H * 0.9); ctx.restore();
    // a break in the cloud: sun behind, light spilling
    K.glow(ctx, W * 0.72, H * 0.18, 700, [255, 244, 214], 0.35 + 0.15 * smooth(u));
    // the pole swings up from a slant to upright; the flag unfurls and streams in the wind
    const raise = easeOut(span(t, T.cutBanner - 0.2, T.cutBanner + 1.2)), ang = lerp(-0.55, -0.04, raise) + Math.sin(t * 0.9) * 0.012;
    const bx = W * 0.4 + lerp(0, 60, u), by = H + 60, plen = 1010;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(ang);
    ctx.fillStyle = '#2a2016'; ctx.fillRect(-9, -plen, 18, plen); ctx.fillStyle = '#c9a14a'; ctx.beginPath(); ctx.arc(0, -plen - 10, 14, 0, TAU); ctx.fill();
    const unf = smooth(span(t, T.cutBanner + 0.2, T.cutBanner + 1.4));
    drawFlag(ctx, EALD, 8, -plen + 12, lerp(140, 620, unf), lerp(110, 380, unf), t, 0.6 + 0.4 * unf, 0);
    ctx.restore();
    // hands on the pole, the people hauling: silhouettes against the bright sky
    ctx.save(); ctx.fillStyle = '#1e1a16';
    for (const [hx, hy, s] of [[bx - 150, H + 40, 560], [bx + 230, H + 70, 600]]) K.figure(ctx, hx, hy, s, { kind: 'tunic', head: 'hood', hold: 'none', face: hx < bx ? 1 : -1, arm: 2.4, bend: 0.4, farArm: 2.2, farBend: 0.5, fill: '#1e1a16' });
    // the cheering crowd in the foreground: arms and spears raised
    const r = rng(5101);
    for (let i = 0; i < 14; i++) { const X = -60 + i * 150 + r() * 60, s = 380 + r() * 160, jump = Math.max(0, Math.sin(t * (5 + r() * 2) + i)) * 18 * smooth(span(t, T.cutBanner + 0.4, T.cutBanner + 1.0)); if (Math.abs(X - bx) < 120) continue; K.figure(ctx, X, H + 120 - jump, s, { kind: ['tunic', 'cloak', 'gown', 'robe'][i % 4], head: ['hood', 'hair', 'coif', 'bare'][i % 4], hold: i % 3 === 0 ? 'spear' : 'none', face: X < bx ? 1 : -1, arm: i % 3 === 0 ? undefined : 2.6 + Math.sin(t * 6 + i) * 0.2, bend: 0.2, farArm: 2.3, fill: '#1a1714' }); }
    ctx.restore();
    // birds lifting
    ctx.save(); ctx.strokeStyle = 'rgba(30,28,26,0.7)'; ctx.lineWidth = 3; for (let i = 0; i < 5; i++) { const X = 1300 + i * 70 + lt * 90, Y = 260 - i * 30 - lt * 40 + Math.sin(i) * 20, fl = Math.sin(t * 9 + i) * 10; ctx.beginPath(); ctx.moveTo(X - 18, Y + fl); ctx.quadraticCurveTo(X - 8, Y - 6, X, Y); ctx.quadraticCurveTo(X + 8, Y - 6, X + 18, Y + fl); ctx.stroke(); } ctx.restore();
    finishDay(ctx, 0.9);
    K.glow(ctx, W * 0.7, H * 0.2, 900, [255, 236, 200], 0.12);
  }

  // ---------------------------------------------------------------- the shots, in order
  function shots(T) {
    const top = (t0, t1, keys) => ({ t0, t1, keys });
    return K.cached('s4:shots', () => [
      { t0: T.s0, t1: T.cutSeal, fn: (c, t) => gateShot(c, t, T) },
      { t0: T.cutSeal, t1: T.cutMeadow, fn: (c, t) => sealShot(c, t, T) },
      // the meadow board out of the ink: from straight above (matching the drawn board), craning down as the pieces come
      { t0: T.cutMeadow, t1: T.cutCael, fade: 0.5, cam: [
        { t: T.cutMeadow - 0.5, p: [0, 52, -3.5], g: [0, 0, 0], fov: 42 },
        { t: T.cutMeadow + 0.6, p: [0, 46, -9], g: [0, 0, 0.5], fov: 44, e: easeIn },
        { t: T.cutCael + 0.3, p: [17, 13, -26], g: [2, 0, 3], fov: 48, e: easeOut }], setup: true },
      // "Cael stood as a Pawn": low behind him, among the pawns, the Hildmere lines and the river beyond
      { t0: T.cutCael, t1: T.cutTop1, cam: [
        { t: T.cutCael - 0.2, p: [-3.1, 1.4, -9.6], g: [2.6, 1.35, 4], fov: 48 },
        { t: T.cutTop1 + 0.2, p: [-2.55, 1.45, -8.7], g: [2.4, 1.4, 4], fov: 46 }] },
      // the diagram: "He gave ground"
      { t0: T.cutTop1, t1: T.cutFile, cam: [
        { t: T.cutTop1 - 0.2, p: [0.8, 29.5, -25.0], g: [0, 0, 1.4], fov: 45 },
        { t: T.cutFile + 0.2, p: [0.2, 28.5, -24.0], g: [-0.2, 0, 1.4], fov: 45 }], diagram: true },
      // "He let them believe the open file was a mistake": over the champion's shoulder, down the empty file
      { t0: T.cutFile, t1: T.cutCharge, cam: [
        { t: T.cutFile - 0.2, p: [0.05, 2.55, 12.9], g: [-1.25, 0.4, -9], fov: 44 },
        { t: T.cutCharge + 0.2, p: [-0.25, 2.4, 12.1], g: [-1.25, 0.35, -9], fov: 41 }] },
      // the charge: from the foot of the file, the champion coming straight at us
      { t0: T.cutCharge, t1: T.cutTop2, cam: [
        { t: T.cutCharge - 0.2, p: [-1.0, 1.35, -15.5], g: [-1.25, 1.6, 6], fov: 40 },
        { t: T.cutTop2 + 0.2, p: [-1.05, 1.3, -14.6], g: [-1.25, 1.5, 6], fov: 41 }], shake: true },
      // the door, the cage, the capture: the diagram again, closer
      { t0: T.cutTop2, t1: T.cutBanner, cam: [
        { t: T.cutTop2 - 0.2, p: [-0.3, 28.5, -24.5], g: [-0.4, 0, 0.4], fov: 44 },
        { t: T.cutBanner + 0.3, p: [-0.9, 25, -21.5], g: [-0.9, 0, 0.6], fov: 44 }], diagram: true },
      { t0: T.cutBanner, t1: T.cutValley, fn: (c, t) => bannerShot(c, t, T) },
      // push out over the valley and the road south
      { t0: T.cutValley, t1: T.s1 + 2, fade: 0.4, cam: [
        { t: T.cutValley - 0.4, p: [40, 9, 24], g: [4, 0.5, -4], fov: 48 },
        { t: T.cutValley + 1.6, p: [52, 22, 40], g: [6, 0, -60], fov: 50, e: easeIn },
        { t: T.s1 + 1.2, p: [74, 52, 74], g: [0, 0, -320], fov: 50, e: easeOut }], valley: true },
    ]);
  }
  function drawShot(ctx, sh, t, T) {
    if (sh.fn) { sh.fn(ctx, t); return; }
    const C = camKeys(t, sh.cam);
    if (sh.shake && t > T.m2 + 1.3) { const k = Math.exp(-(t - T.m2 - 1.4) * 4) * (t > T.m2 + 1.4 ? 1 : 0), [dx, dy] = K.shake(t, 9 * k, 7); C.cx += dx; C.cy += dy; }
    const state = sh.setup ? setupState(t, T) : gameState(t, T);
    const o = { state, minK: sh.diagram ? 0.7 : 0.66, big: sh.diagram ? 1.32 : 1, overlay: sh.setup ? null : boardOverlay(t, T), caelLight: sh.diagram ? 0.12 * win(t, T.m5 + 0.4, T.s1 + 1, 0.3, 0.5) : 0 };
    if (sh.valley) { o.extraBanners = [[riverX(FORDZ) - RIVW / 2 - 2.0, FORDZ - 1.5, EALD, 9, 2.2]]; o.poleH = 8; }
    world(ctx, C, t, o);
    finishDay(ctx);
    if (sh.diagram) notation(ctx, t, T, win(t, sh.t0 + 0.1, sh.t1, 0.25, 0.2));
  }

  SCENES[4] = {
    join: 'dissolve', joinDur: 0.8,
    draw(ctx, t, sc) {
      const T = TT(), list = shots(T);
      t = Math.min(t, sc.end + 0.8);
      let i = list.findIndex(s => t >= s.t0 && t < s.t1); if (i < 0) i = t < list[0].t0 ? 0 : list.length - 1;
      const sh = list[i], fd = sh.fade || 0.25;
      if (i > 0 && t < sh.t0 + fd && sh.fade !== 0) {
        const A = K.layer('s4:a'), B = K.layer('s4:b');
        drawShot(A.getContext('2d'), list[i - 1], t, T); drawShot(B.getContext('2d'), sh, t, T);
        ctx.drawImage(A, 0, 0); ctx.globalAlpha = smooth((t - sh.t0) / fd); ctx.drawImage(B, 0, 0); ctx.globalAlpha = 1;
      } else drawShot(ctx, sh, t, T);
    },
  };
})();
