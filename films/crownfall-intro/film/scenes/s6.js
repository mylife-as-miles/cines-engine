/* Scene 6: The King's Gambit [L31–L42]. The chronicle's step into space.
   A battlefield painted in the manner of the chronicle (a red sky, the fallen, broken spears, banners in the mud, crows);
   ink lines run across it and it becomes the Wæl-Tafel, an immense ceremonial board in true perspective. A small 3D
   projection carries the scene: world x/z on the board, y up; a camera with position, target and focal length; floors
   drawn as perspective cells (one drawImage per cell under its least-squares affine), lit by a per-pixel light field;
   people placed at projected foot points, drawn as sprites, lit by the braziers and sorted far to near.
   The heart is the creator's law of the Gambit: the Seven's arms bloom on the knights, bishops and rooks; a queen is
   lent across from another great house; Ealdholt (a lesser house) fields only pawns, its back rank empty and dark, and
   borrows the rest from the Seven at a price (a coin, a chain on a pawn). Then play, a bishop falls, the defeated stand in
   shadow, a pawn's fists close, and a king is surrounded while red runs into the seams of the board. */
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const { clamp, lerp, smooth, ease, easeOut, easeIn, span, win, rng } = K;
  const SCENES = window.SCENES = window.SCENES || {};
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- the world (metres; the board on x/z, y up)
  // the board: 8 x 8 squares of 2.5 m inside a 1.25 m border; side A (a great house) at -z, side B (Ealdholt) at +z;
  // the dais of the Seven at +x; the arena walls at +-AW; braziers at the four corners
  const SQ = 2.5, HB = 4 * SQ, BRD = 1.25, BE = HB + BRD, STEP = 0.8, AW = 26, NEAR = 0.25;
  const BRZ = BE + STEP + 1.5, BRZH = 3.3;                        // brazier corners and fire height
  const BRAZ = [[-BRZ, -BRZ], [BRZ, -BRZ], [-BRZ, BRZ], [BRZ, BRZ]];
  const sqX = f => (f - 3.5) * SQ, sqZ = r => (r - 3.5) * SQ;

  // ---------------------------------------------------------------- colour helpers (hex in, hex out: K.figure parses hex)
  const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const toHex = (r, g, b) => '#' + ((1 << 24) | (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)).toString(16).slice(1);
  const mixHex = (a, b, u) => { const A = hexRGB(a), B = hexRGB(b); return toHex(lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u)); };
  const litHex = (h, L) => { const A = hexRGB(h); return toHex(A[0] * L[0], A[1] * L[1], A[2] * L[2]); };
  const rgbs = (c, a) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

  // ---------------------------------------------------------------- the timeline, keyed to the narration
  let T = null;
  function TT() {
    if (T) return T;
    const sc = K.scene(6); T = { s: sc.start, e: sc.end };
    for (let i = 31; i <= 42; i++) { const q = K.cue('L' + i); T['a' + i] = q.start; T['b' + i] = q.end; }
    const at = (i, u) => lerp(T['a' + i], T['b' + i], u);
    T.ink0 = at(31, 0.06); T.fill0 = at(31, 0.2); T.fill1 = at(31, 0.72);       // ink lines run, squares fill, the dead sink
    T.rise0 = at(31, 0.45); T.rise1 = T.b31 + 0.6;                               // the arena rises out of the field
    T.lit0 = at(31, 0.62);                                                       // braziers take fire
    T.walk0 = at(31, 0.58); T.walk1 = T.b32 - 0.2;                               // sixteen against sixteen walk in
    T.still0 = T.a33 - 0.5; T.still1 = T.a34 + 0.15;                             // everything stills
    T.blood0 = at(34, 0.08); T.blood1 = at(34, 0.85);                            // the law of blood runs to the majors
    T.q0 = T.b34 + 0.1; T.q1 = at(35, 0.6); T.ring = at(35, 0.66); T.coinQ = at(35, 0.84); // the queen lent across
    T.dis0 = at(36, 0.12); T.dis1 = at(36, 0.6);                                 // Ealdholt's back rank empties
    T.bor0 = at(37, 0.02); T.bor1 = at(37, 0.86);                                // the borrowed step in, each at a price
    T.kn0 = at(38, 0.08); T.kn1 = at(38, 0.3);                                   // a knight moves
    T.stake = [0.43, 0.55, 0.66, 0.82].map(u => at(38, u));                      // land, passage, custody, the right to govern
    T.fall0 = at(40, 0.22); T.fall1 = at(40, 0.62);                              // a bishop falls
    T.fist0 = at(41, 0.45); T.fist1 = at(41, 0.95);                              // a pawn's fists close
    T.red0 = at(42, 0.12); T.red1 = T.b42 + 1.2;                                 // red runs into the seams
    T.form = T.a41 + 0.05;                                                       // (the final formation is set while we look away)
    return T;
  }
  // world time for things that breathe: it nearly stops while the law is spoken (L33)
  function worldT(t) {
    const T = TT(), a = T.still0, b = T.still1;
    if (t <= a) return t;
    const tt = Math.min(t, b), n = 48; let acc = 0;
    for (let i = 0; i < n; i++) { const u = a + (tt - a) * (i + 0.5) / n; acc += 1 - 0.93 * win(u, a, b, 0.5, 0.4); }
    return a + acc * (tt - a) / n + Math.max(0, t - b);
  }


  // ---------------------------------------------------------------- camera and projection
  function camera(pos, tgt, f, roll = 0) {
    let fx = tgt[0] - pos[0], fy = tgt[1] - pos[1], fz = tgt[2] - pos[2]; const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
    let rx = fz, ry = 0, rz = -fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
    let ux = fy * rz - fz * ry, uy = fz * rx - fx * rz, uz = fx * ry - fy * rx;
    if (roll) { const c = Math.cos(roll), s = Math.sin(roll), r2 = [rx * c + ux * s, ry * c + uy * s, rz * c + uz * s], u2 = [ux * c - rx * s, uy * c - ry * s, uz * c - rz * s]; [rx, ry, rz] = r2; [ux, uy, uz] = u2; }
    return { px: pos[0], py: pos[1], pz: pos[2], rx, ry, rz, ux, uy, uz, fx, fy, fz, f, cx: W / 2, cy: H / 2 };
  }
  function toCam(C, x, y, z) { const dx = x - C.px, dy = y - C.py, dz = z - C.pz; return [dx * C.rx + dy * C.ry + dz * C.rz, dx * C.ux + dy * C.uy + dz * C.uz, dx * C.fx + dy * C.fy + dz * C.fz]; }
  // pj: world point -> [sx, sy, depth, px-per-metre] or null when behind the camera
  function pj(C, x, y, z) { const v = toCam(C, x, y, z); if (v[2] < NEAR) return null; const s = C.f / v[2]; return [C.cx + v[0] * s, C.cy - v[1] * s, v[2], s]; }

  // ---------------------------------------------------------------- textured planes
  // A plane is cut into cells (a quadtree, refined until the affine error is small); each cell is drawn with one
  // drawImage under the least-squares affine of its four projected corners, padded a little so neighbours overlap.
  function mipChain(img, levels) {
    const out = [img]; let cur = img;
    for (let i = 1; i < levels; i++) { const n = K.canvas(Math.max(1, cur.width >> 1), Math.max(1, cur.height >> 1)), x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, n.width, n.height); out.push(n); cur = n; }
    return out;
  }
  const STAT = { cells: 0 };
  // s00..s01: screen corners of texels (u0,v0), (u1,v0), (u1,v1), (u0,v1) of mip level 0
  function cellImg(ctx, mips, u0, v0, u1, v1, s00, s10, s11, s01, k, pad) {
    const du = u1 - u0, dv = v1 - v0;
    const cx = (s00[0] + s10[0] + s11[0] + s01[0]) / 4 * k, cy = (s00[1] + s10[1] + s11[1] + s01[1]) / 4 * k;
    const exx = (s10[0] - s00[0] + s11[0] - s01[0]) / 2 * k, exy = (s10[1] - s00[1] + s11[1] - s01[1]) / 2 * k;
    const eyx = (s01[0] - s00[0] + s11[0] - s10[0]) / 2 * k, eyy = (s01[1] - s00[1] + s11[1] - s10[1]) / 2 * k;
    const ce = Math.hypot(s00[0] - s10[0] - s01[0] + s11[0], s00[1] - s10[1] - s01[1] + s11[1]) / 4 * k;
    let a = exx / du, b = exy / du, c = eyx / dv, d = eyy / dv;
    const sc = Math.sqrt(Math.abs(a * d - b * c)); if (!(sc > 1e-9)) return;
    let L = 0; if (mips.length > 1 && sc < 0.6) L = Math.min(mips.length - 1, Math.floor(Math.log2(0.6 / sc)) + 1);
    const m = 1 << L; a *= m; b *= m; c *= m; d *= m;
    const U0 = u0 / m, V0 = v0 / m, DU = du / m, DV = dv / m;
    const pu = (ce + pad) / (Math.hypot(a, b) || 1), pv = (ce + pad) / (Math.hypot(c, d) || 1);
    ctx.setTransform(a, b, c, d, cx - exx / 2 - eyx / 2, cy - exy / 2 - eyy / 2);
    ctx.drawImage(mips[L], U0 - pu, V0 - pv, DU + 2 * pu, DV + 2 * pv, -pu, -pv, DU + 2 * pu, DV + 2 * pv);
    STAT.cells++;
  }
  // a cell that crosses the near plane: clip in camera space, then draw through a clip path
  function cellClipped(ctx, C, mips, poly, tw, th, k) {
    const out = []; for (let i = 0; i < poly.length; i++) { const A = poly[i], B = poly[(i + 1) % poly.length], ia = A[2] >= NEAR, ib = B[2] >= NEAR; if (ia) out.push(A); if (ia !== ib) { const u = (NEAR - A[2]) / (B[2] - A[2]); out.push(A.map((v, j) => v + (B[j] - v) * u)); } }
    if (out.length < 3) return;
    const sp = out.map(p => [(C.cx + C.f * p[0] / p[2]) * k, (C.cy - C.f * p[1] / p[2]) * k, p[3] * tw, p[4] * th]);
    const [p0, p1, p2] = sp, du1 = p1[2] - p0[2], dv1 = p1[3] - p0[3], du2 = p2[2] - p0[2], dv2 = p2[3] - p0[3], det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-9) return;
    const dx1 = p1[0] - p0[0], dy1 = p1[1] - p0[1], dx2 = p2[0] - p0[0], dy2 = p2[1] - p0[1];
    const a = (dx1 * dv2 - dx2 * dv1) / det, b = (dy1 * dv2 - dy2 * dv1) / det, c = (dx2 * du1 - dx1 * du2) / det, d = (dy2 * du1 - dy1 * du2) / det;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); sp.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip();
    const us = sp.map(p => p[2]), vs = sp.map(p => p[3]), umin = Math.min(...us), umax = Math.max(...us), vmin = Math.min(...vs), vmax = Math.max(...vs);
    ctx.setTransform(a, b, c, d, p0[0] - a * p0[2] - c * p0[3], p0[1] - b * p0[2] - d * p0[3]);
    ctx.drawImage(mips[0], umin - 2, vmin - 2, umax - umin + 4, vmax - vmin + 4, umin - 2, vmin - 2, umax - umin + 4, vmax - vmin + 4);
    ctx.restore(); STAT.cells++;
  }
  // plane(ctx, C, mips, O, U, V, tw, th, o): the quad O + s·U + t·V, s and t in [0, 1], textured so (s, t) -> texel (s·tw, t·th).
  //   o.roots [ns, nt] starting grid, o.err max affine error (px), o.k screen scale (0.5 for half-resolution layers), o.pad
  function plane(ctx, C, mips, O, U, V, tw, th, o = {}) {
    const k = o.k || 1, err = o.err || 1.5, pad = o.pad != null ? o.pad : 0.8, f = C.f, hw = W / 2 + 60, hh = H / 2 + 60, maxDep = o.maxDep || 10;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = o.q || 'low';
    const [ns, nt] = o.roots || [1, 1], S0 = o.s0 || 0, S1 = o.s1 != null ? o.s1 : 1, T0 = o.t0 || 0, T1 = o.t1 != null ? o.t1 : 1, u0 = o.u0 || 0, v0 = o.v0 || 0;
    const toC = (s, t) => toCam(C, O[0] + s * U[0] + t * V[0], O[1] + s * U[1] + t * V[1], O[2] + s * U[2] + t * V[2]);
    const stack = [];
    for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) stack.push([lerp(S0, S1, i / ns), lerp(T0, T1, j / nt), lerp(S0, S1, (i + 1) / ns), lerp(T0, T1, (j + 1) / nt), 0]);
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
        cellClipped(ctx, C, mips, cs.map((c, i) => [c[0], c[1], c[2], (i === 1 || i === 2 ? a1 : a0) + u0 / tw, (i >= 2 ? b1 : b0) + v0 / th]), tw, th, k); continue;
      }
      const sp = cs.map(c => [C.cx + f * c[0] / c[2], C.cy - f * c[1] / c[2]]);
      if (dep < maxDep) {
        // how far the true centre falls from the centre of the projected corners
        const cm = toC(am, bm);
        let e = cm[2] < NEAR ? 1e9 : Math.hypot(C.cx + f * cm[0] / cm[2] - (sp[0][0] + sp[1][0] + sp[2][0] + sp[3][0]) / 4, C.cy - f * cm[1] / cm[2] - (sp[0][1] + sp[1][1] + sp[2][1] + sp[3][1]) / 4);
        e += Math.hypot(sp[0][0] - sp[1][0] - sp[3][0] + sp[2][0], sp[0][1] - sp[1][1] - sp[3][1] + sp[2][1]) / 4;
        if (e * k > err) { stack.push([a0, b0, am, bm, dep + 1], [am, b0, a1, bm, dep + 1], [a0, bm, am, b1, dep + 1], [am, bm, a1, b1, dep + 1]); continue; }
      }
      cellImg(ctx, mips, u0 + a0 * tw, v0 + b0 * th, u0 + a1 * tw, v0 + b1 * th, sp[0], sp[1], sp[2], sp[3], k, pad);
    }
  }
  const floorPlane = (ctx, C, mips, x0, z0, x1, z1, tw, th, o) => plane(ctx, C, mips, [x0, 0, z0], [x1 - x0, 0, 0], [0, 0, z1 - z0], tw, th, o);
  // the tiled ground: a clipmap of pre-tiled levels, so far cells are drawn from coarse, wide textures
  function groundPlane(ctx, C, levels, tileM, R, o = {}) {
    // levels[s] covers 2^s x 2^s tiles in one canvas; root cells are (tileM * 2^top) metres
    const k = o.k || 1, err = o.err || 2.5, f = C.f, hw = W / 2 + 60, hh = H / 2 + 60, top = levels.length - 1;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = o.q || 'low';
    const size0 = tileM * (1 << top), n = Math.ceil(R / size0), stack = [];
    for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) stack.push([i * size0, j * size0, size0, top, 0]);
    while (stack.length) {
      const [x0, z0, sz, lev, dep] = stack.pop();
      if (o.skip && o.skip(x0, z0, x0 + sz, z0 + sz)) continue;
      const cs = [toCam(C, x0, 0, z0), toCam(C, x0 + sz, 0, z0), toCam(C, x0 + sz, 0, z0 + sz), toCam(C, x0, 0, z0 + sz)];
      let oL = 0, oR = 0, oT = 0, oB = 0, bh = 0;
      for (const c of cs) { if (f * c[0] + hw * c[2] < 0) oL++; if (-f * c[0] + hw * c[2] < 0) oR++; if (-f * c[1] + hh * c[2] < 0) oT++; if (f * c[1] + hh * c[2] < 0) oB++; if (c[2] < NEAR) bh++; }
      if (oL === 4 || oR === 4 || oT === 4 || oB === 4 || bh === 4) continue;
      const span = tileM * (1 << lev), mips = levels[lev], tex = mips[0], tpm = (tex.width - 2 * GUT) / span;
      const ux = ((x0 % span) + span) % span, uz = ((z0 % span) + span) % span;
      const h2 = sz / 2;
      const kids = () => { const nl = sz / 2 >= tileM * (1 << Math.max(0, lev - 1)) && lev > 0 ? lev - 1 : lev; stack.push([x0, z0, h2, nl, dep + 1], [x0 + h2, z0, h2, nl, dep + 1], [x0, z0 + h2, h2, nl, dep + 1], [x0 + h2, z0 + h2, h2, nl, dep + 1]); };
      if (bh) { if (dep < 9) { kids(); continue; } cellClipped(ctx, C, mips, cs.map((c, i) => [c[0], c[1], c[2], (GUT / tpm + ux + (i === 1 || i === 2 ? sz : 0)) / span, (GUT / tpm + uz + (i >= 2 ? sz : 0)) / span]), span * tpm, span * tpm, k); continue; }
      const sp = cs.map(c => [C.cx + f * c[0] / c[2], C.cy - f * c[1] / c[2]]);
      const ext = Math.max(Math.hypot(sp[1][0] - sp[0][0], sp[1][1] - sp[0][1]), Math.hypot(sp[3][0] - sp[0][0], sp[3][1] - sp[0][1])) * k;
      if (dep < 12) {
        const cm = toCam(C, x0 + h2, 0, z0 + h2);
        let e = cm[2] < NEAR ? 1e9 : Math.hypot(C.cx + f * cm[0] / cm[2] - (sp[0][0] + sp[1][0] + sp[2][0] + sp[3][0]) / 4, C.cy - f * cm[1] / cm[2] - (sp[0][1] + sp[1][1] + sp[2][1] + sp[3][1]) / 4);
        e += Math.hypot(sp[0][0] - sp[1][0] - sp[3][0] + sp[2][0], sp[0][1] - sp[1][1] - sp[3][1] + sp[2][1]) / 4;
        // refine when the affine is off, or when this level's texels are being magnified
        if (e * k > err || (lev > 0 && ext > sz * tpm * 1.3)) { kids(); continue; }
      }
      cellImg(ctx, mips, GUT + ux * tpm, GUT + uz * tpm, GUT + (ux + sz) * tpm, GUT + (uz + sz) * tpm, sp[0], sp[1], sp[2], sp[3], k, o.pad != null ? o.pad : 1);
    }
  }

  // ---------------------------------------------------------------- noise helpers for tileable textures
  function pnoise(x, y, p, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), m = a => ((a % p) + p) % p; const x0 = m(xi), x1 = m(xi + 1), y0 = m(yi), y1 = m(yi + 1); const a = K.hash(x0, y0, s), b = K.hash(x1, y0, s), c = K.hash(x0, y1, s), d = K.hash(x1, y1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function pfbm(x, y, p, oct, s) { let f = 0, a = 0.5, n = 0; for (let i = 0; i < oct; i++) { f += a * pnoise(x, y, p, s + i * 17); n += a; x *= 2; y *= 2; p *= 2; a *= 0.5; } return f / n; }

  // ---------------------------------------------------------------- textures (built once)
  function pixels(n, m, fn) { const c = K.canvas(n, m), x = c.getContext('2d'), img = x.createImageData(n, m), d = img.data; for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { const k = (j * n + i) * 4, v = fn(i, j); d[k] = v[0]; d[k + 1] = v[1]; d[k + 2] = v[2]; d[k + 3] = v[3] == null ? 255 : v[3]; } x.putImageData(img, 0, 0); return c; }
  // pale limestone with veins, dark basalt with flecks (512 x 512, cropped per square)
  function lightStone() {
    return K.cached('s6:stoneL', () => {
      const n = 512, c = pixels(n, n, (i, j) => {
        const u = i / n, v = j / n, m = K.fbm(u * 3.2, v * 3.2, 5, 61), w = K.fbm(u * 9 + m * 3, v * 9, 3, 67), g = K.hash(i, j, 71) - 0.5, g2 = K.noise(i * 0.35, j * 0.35, 73) - 0.5;
        const k = (m - 0.5) * 0.55 + (w - 0.5) * 0.25 + g * 0.07 + g2 * 0.06;
        return [clamp(205 + k * 120, 0, 255), clamp(192 + k * 112, 0, 255), clamp(162 + k * 96, 0, 255)];
      });
      const x = c.getContext('2d'), r = rng(77);
      // veins
      for (let i = 0; i < 9; i++) {
        const y0 = r() * n, pts = K.wobble(K.resample(K.bez([[-40, y0], [n * 0.3, y0 + (r() - 0.5) * 300], [n * 0.6, y0 + (r() - 0.5) * 300], [n + 40, y0 + (r() - 0.5) * 200]], 24), 3), 10 + r() * 14, 0.012, 80 + i);
        x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = `rgba(120,100,74,${0.18 + r() * 0.25})`; x.lineWidth = 0.6 + r() * 1.4; x.filter = 'blur(0.6px)'; K.line(x, pts, 1);
        x.strokeStyle = 'rgba(150,128,96,0.08)'; x.lineWidth = 6 + r() * 6; x.filter = 'blur(3px)'; K.line(x, pts, 1); x.restore();
      }
      return c;
    });
  }
  function darkStone() {
    return K.cached('s6:stoneD', () => {
      const n = 512, c = pixels(n, n, (i, j) => {
        const u = i / n, v = j / n, m = K.fbm(u * 4, v * 4, 5, 91), w = K.fbm(u * 14, v * 14, 3, 97), g = K.hash(i, j, 99), fleck = g > 0.985 ? 38 : g > 0.96 ? 14 : 0;
        const k = (m - 0.5) * 0.5 + (w - 0.5) * 0.3 + (K.hash(i, j, 101) - 0.5) * 0.12;
        return [clamp(46 + k * 46 + fleck, 0, 255), clamp(42 + k * 42 + fleck, 0, 255), clamp(40 + k * 38 + fleck * 0.9, 0, 255)];
      });
      const x = c.getContext('2d'), r = rng(103);
      for (let i = 0; i < 6; i++) {
        const y0 = r() * n, pts = K.wobble(K.resample(K.bez([[-40, y0], [n * 0.3, y0 + (r() - 0.5) * 260], [n * 0.6, y0 + (r() - 0.5) * 260], [n + 40, y0 + (r() - 0.5) * 180]], 24), 3), 8 + r() * 10, 0.015, 110 + i);
        x.save(); x.globalCompositeOperation = 'screen'; x.strokeStyle = `rgba(120,116,108,${0.1 + r() * 0.16})`; x.lineWidth = 0.5 + r(); x.filter = 'blur(0.5px)'; K.line(x, pts, 1); x.restore();
      }
      return c;
    });
  }
  // the board seen from above: 2048 px over the 22.5 m slab (squares, seams, border with gold inlay)
  const BT = { n: 2048 }; BT.ppm = BT.n / (2 * BE);
  function boardTex() {
    return K.cached('s6:board', () => {
      const N = BT.n, ppm = BT.ppm, c = K.canvas(N, N), x = c.getContext('2d'), r = rng(6061), X = v => (v + BE) * ppm;
      const Ls = lightStone(), Ds = darkStone();
      // the border: dark stone, worn
      for (let yy = 0; yy < N; yy += 384) for (let xx = 0; xx < N; xx += 384) { x.save(); x.translate(xx + 192, yy + 192); x.rotate(Math.floor(r() * 4) * Math.PI / 2); x.drawImage(Ds, r() * 120, r() * 120, 384, 384, -192, -192, 384, 384); x.restore(); }
      x.fillStyle = 'rgba(30,22,16,0.35)'; x.fillRect(0, 0, N, N);
      // border blocks
      x.strokeStyle = 'rgba(8,6,4,0.8)'; x.lineWidth = 3;
      const b0 = X(-BE), b1 = X(-HB), b2 = X(HB), b3 = X(BE);
      for (let i = 0; i <= 18; i++) { const u = lerp(b0, b3, i / 18); x.beginPath(); x.moveTo(u, b0); x.lineTo(u, b1); x.moveTo(u, b2); x.lineTo(u, b3); x.moveTo(b0, u); x.lineTo(b1, u); x.moveTo(b2, u); x.lineTo(b3, u); x.stroke(); }
      // inlaid gold bands around the field
      const goldBand = (d, w) => { const a = X(-HB - d), bb = X(HB + d); const g = x.createLinearGradient(0, 0, N, N); g.addColorStop(0, '#8a6a2c'); g.addColorStop(0.3, '#d8b866'); g.addColorStop(0.5, '#7a5a22'); g.addColorStop(0.7, '#e2c47a'); g.addColorStop(1, '#8a6a2c'); x.strokeStyle = g; x.lineWidth = w * ppm; x.strokeRect(a, a, bb - a, bb - a); };
      goldBand(0.18, 0.05); goldBand(1.02, 0.04);
      // a carved run of lozenges between the bands
      x.save(); x.fillStyle = 'rgba(6,4,2,0.55)'; x.strokeStyle = 'rgba(200,170,110,0.25)'; x.lineWidth = 1.2;
      const mid = HB + 0.6, nL = 36;
      for (const side of [0, 1, 2, 3]) for (let i = 0; i < nL; i++) {
        const u = -HB - 0.6 + (2 * HB + 1.2) * (i + 0.5) / nL; let cx, cy; if (side === 0) { cx = X(u); cy = X(-mid); } else if (side === 1) { cx = X(u); cy = X(mid); } else if (side === 2) { cx = X(-mid); cy = X(u); } else { cx = X(mid); cy = X(u); }
        const s = 0.26 * ppm; x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s, cy); x.lineTo(cx, cy + s); x.lineTo(cx - s, cy); x.closePath(); x.fill(); x.stroke();
        x.beginPath(); x.arc(cx, cy, s * 0.22, 0, TAU); x.fillStyle = 'rgba(214,180,100,0.55)'; x.fill(); x.fillStyle = 'rgba(6,4,2,0.55)';
      }
      x.restore();
      // the sixty-four squares
      const s = SQ * ppm;
      for (let fi = 0; fi < 8; fi++) for (let ri = 0; ri < 8; ri++) {
        const light = (fi + ri) % 2 === 1, x0 = X(-HB + fi * SQ), y0 = X(-HB + ri * SQ), tile = light ? Ls : Ds;
        x.save(); x.translate(x0 + s / 2, y0 + s / 2); x.rotate(Math.floor(r() * 4) * Math.PI / 2);
        x.drawImage(tile, r() * (512 - s), r() * (512 - s), s, s, -s / 2, -s / 2, s, s);
        const tint = (r() - 0.5) * 0.12; x.fillStyle = tint > 0 ? `rgba(255,240,215,${tint})` : `rgba(20,12,6,${-tint})`; x.fillRect(-s / 2, -s / 2, s, s);
        // worn bevels: a lit upper edge and a shadowed lower one
        const g = x.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); g.addColorStop(0, light ? 'rgba(255,248,230,0.16)' : 'rgba(160,150,140,0.08)'); g.addColorStop(0.12, 'rgba(0,0,0,0)'); g.addColorStop(0.88, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.22)');
        x.fillStyle = g; x.fillRect(-s / 2, -s / 2, s, s);
        // a crack or a chip now and then
        if (r() < 0.35) { const pts = K.wobble(K.resample([[-s / 2 + r() * s, -s / 2], [(r() - 0.5) * s * 0.5, (r() - 0.5) * s * 0.5], [-s / 2 + r() * s, s / 2 * (r() < 0.5 ? 1 : 0.2)]], 3), 6, 0.05, 300 + fi * 8 + ri); x.strokeStyle = light ? 'rgba(80,62,40,0.5)' : 'rgba(0,0,0,0.6)'; x.lineWidth = 1.2; K.line(x, pts, 0.4 + r() * 0.6); }
        x.restore();
      }
      // seams between the squares
      x.strokeStyle = 'rgba(10,7,4,0.9)'; x.lineWidth = 0.035 * ppm;
      for (let i = 0; i <= 8; i++) { const u = X(-HB + i * SQ); x.beginPath(); x.moveTo(u, X(-HB)); x.lineTo(u, X(HB)); x.moveTo(X(-HB), u); x.lineTo(X(HB), u); x.stroke(); }
      x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 0.09 * ppm; x.filter = 'blur(2px)';
      for (let i = 0; i <= 8; i++) { const u = X(-HB + i * SQ); x.beginPath(); x.moveTo(u, X(-HB)); x.lineTo(u, X(HB)); x.moveTo(X(-HB), u); x.lineTo(X(HB), u); x.stroke(); }
      x.filter = 'none';
      return c;
    });
  }
  const boardMips = () => K.cached('s6:boardMips', () => mipChain(boardTex(), 5));
  // battlefield mud, tileable: 1024 px over 6 m
  const GT = { n: 1024, m: 6 };
  function mudTile() {
    return K.cached('s6:mud', () => {
      const n = GT.n, p = 6;
      const c = pixels(n, n, (i, j) => {
        const u = i / n * p, v = j / n * p, m = pfbm(u, v, p, 5, 201), w = pfbm(u * 4, v * 4, p * 4, 3, 211), g = K.hash(i, j, 219) - 0.5;
        const wet = smooth(clamp((m - 0.52) * 5));
        const k = (w - 0.5) * 0.35 + g * 0.08;
        return [clamp(lerp(82, 46, wet) * (1 + k), 0, 255), clamp(lerp(64, 34, wet) * (1 + k), 0, 255), clamp(lerp(46, 26, wet) * (1 + k), 0, 255)];
      });
      const x = c.getContext('2d'), r = rng(223);
      const wrap = (fn) => { for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) { x.save(); x.translate(ox, oy); fn(); x.restore(); } };
      // boot and hoof prints
      for (let i = 0; i < 70; i++) { const px = r() * n, py = r() * n, a = r() * TAU, s = 14 + r() * 16, hoof = r() < 0.4; wrap(() => { x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = 'rgba(20,12,8,0.35)'; x.beginPath(); if (hoof) { x.arc(0, 0, s * 0.6, 0.4, TAU - 0.4); x.lineTo(s * 0.2, 0); } else x.ellipse(0, 0, s, s * 0.42, 0, 0, TAU); x.fill(); x.strokeStyle = 'rgba(140,110,80,0.18)'; x.lineWidth = 1.5; x.stroke(); x.restore(); }); }
      // stones
      for (let i = 0; i < 260; i++) { const px = r() * n, py = r() * n, s = 2 + r() * r() * 12, a = r() * 3; wrap(() => { x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(px + s * 0.3, py + s * 0.3, s, s * 0.7, a, 0, TAU); x.fill(); const v = 90 + r() * 70; x.fillStyle = `rgb(${v},${v * 0.92},${v * 0.82})`; x.beginPath(); x.ellipse(px, py, s, s * 0.7, a, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,240,220,0.18)'; x.beginPath(); x.ellipse(px - s * 0.25, py - s * 0.2, s * 0.45, s * 0.3, a, 0, TAU); x.fill(); }); }
      // trampled grass and straw
      for (let i = 0; i < 1600; i++) { const px = r() * n, py = r() * n, L = 6 + r() * 22, a = r() * TAU, g = r() < 0.6; wrap(() => { x.strokeStyle = g ? `rgba(${70 + r() * 30},${70 + r() * 30},${36 + r() * 16},${0.35 + r() * 0.4})` : `rgba(${150 + r() * 40},${120 + r() * 30},${70},${0.25 + r() * 0.3})`; x.lineWidth = 0.8 + r() * 1.4; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * L * 0.5 + (r() - 0.5) * 6, py + Math.sin(a) * L * 0.5 + (r() - 0.5) * 6, px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); }); }
      return c;
    });
  }
  // clipmap levels: level s holds 2^s x 2^s tiles in one 1024 px canvas (plus a wrapped gutter so padded cells never
  // sample past an edge), each with its own mips
  const GUT = 32;
  function mudLevels() {
    return K.cached('s6:mudLevels', () => {
      const tile = mudTile(), out = []; let prev = tile;
      for (let s = 0; s < 6; s++) {
        let core = tile;
        if (s) { core = K.canvas(1024, 1024); const x = core.getContext('2d'); x.imageSmoothingQuality = 'high'; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) x.drawImage(prev, i * 512, j * 512, 512, 512); }
        prev = core;
        const c = K.canvas(1024 + 2 * GUT, 1024 + 2 * GUT), x = c.getContext('2d');
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) x.drawImage(core, GUT + i * 1024, GUT + j * 1024);
        out.push(mipChain(c, 5));
      }
      return out;
    });
  }

  // ---------------------------------------------------------------- the light on the floor (multiplied over it)
  // Every pixel of a small image is cast onto the floor and lit from the scene's lights; upscaled, it is multiplied over
  // the ground and the board. L = { amb: [r,g,b], lights: [{x, z, r, c:[r,g,b], a}], far: fade beyond a radius, fn(x, z) }
  function unproj(C, sx, sy) { const X = (sx - C.cx) / C.f, Y = -(sy - C.cy) / C.f, dx = X * C.rx + Y * C.ux + C.fx, dy = X * C.ry + Y * C.uy + C.fy, dz = X * C.rz + Y * C.uz + C.fz; if (dy > -1e-6) return null; const t = -C.py / dy; return [C.px + t * dx, C.pz + t * dz, t]; }
  // the part of the screen below the horizon (where the floor is), as a path
  function floorPath(ctx, C, k = 1) {
    const hx = C.fx, hz = C.fz, l = Math.hypot(hx, hz) || 1, pts = [];
    for (const a of [-1.2, 1.2]) { const c = Math.cos(a), s = Math.sin(a), dx = (hx * c - hz * s) / l, dz = (hx * s + hz * c) / l; const X = dx * C.rx + dz * C.rz, Y = dx * C.ux + dz * C.uz, Z = dx * C.fx + dz * C.fz; pts.push([C.cx + C.f * X / Z, C.cy - C.f * Y / Z]); }
    const [a, b] = pts; let ux = b[0] - a[0], uy = b[1] - a[1]; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
    let nx = -uy, ny = ux; if (!unproj(C, a[0] + nx * 40, a[1] + ny * 40)) { nx = -nx; ny = -ny; }
    const R = 8000;
    ctx.beginPath(); ctx.moveTo((a[0] - ux * R) * k, (a[1] - uy * R) * k); ctx.lineTo((a[0] + ux * R) * k, (a[1] + uy * R) * k); ctx.lineTo((a[0] + ux * R + nx * R) * k, (a[1] + uy * R + ny * R) * k); ctx.lineTo((a[0] - ux * R + nx * R) * k, (a[1] - uy * R + ny * R) * k); ctx.closePath();
    return { a, ux, uy, nx, ny };
  }
  const LW = 192, LH = 108;
  let LIMG = null;
  function lightImage(C, L, by) {
    const c = K.cached('s6:limg', () => K.canvas(LW, LH)), x = c.getContext('2d');
    if (!LIMG) LIMG = x.createImageData(LW, LH);
    const d = LIMG.data, ls = L.lights, nl = ls.length;
    for (let j = 0; j < LH; j++) for (let i = 0; i < LW; i++) {
      const k = (j * LW + i) * 4, X = ((i + 0.5) * W / LW - C.cx) / C.f, Y = -((j + 0.5) * H / LH - C.cy) / C.f;
      const dx = X * C.rx + Y * C.ux + C.fx, dy = X * C.ry + Y * C.uy + C.fy, dz = X * C.rz + Y * C.uz + C.fz;
      if (dy > -1e-6) { d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = 0; continue; }
      let tt = (by - C.py) / dy, px = C.px + tt * dx, pz = C.pz + tt * dz;
      if (!(by > 0.005 && Math.abs(px) <= BE && Math.abs(pz) <= BE)) { tt = -C.py / dy; px = C.px + tt * dx; pz = C.pz + tt * dz; }
      let r = L.amb[0], g = L.amb[1], b = L.amb[2];
      for (let q = 0; q < nl; q++) { const l = ls[q], ex = px - l.x, ez = pz - l.z, e = (ex * ex + ez * ez) / (l.r * l.r); if (e < 1) { const f = l.a * (1 - e) * (1 - e) / (1 + e * 6); r += l.c[0] * f; g += l.c[1] * f; b += l.c[2] * f; } }
      if (L.fn) { const m = L.fn(px, pz, tt); r *= m[0]; g *= m[1]; b *= m[2]; }
      d[k] = r > 255 ? 255 : r; d[k + 1] = g > 255 ? 255 : g; d[k + 2] = b > 255 ? 255 : b; d[k + 3] = 255;
    }
    x.putImageData(LIMG, 0, 0);
    return c;
  }
  // the board's outline on screen (clipped at the near plane)
  function quadPath(ctx, C, pts, k = 1) {
    const cs = pts.map(p => toCam(C, p[0], p[1], p[2])), out = [];
    for (let i = 0; i < cs.length; i++) { const A = cs[i], B = cs[(i + 1) % cs.length], ia = A[2] >= NEAR, ib = B[2] >= NEAR; if (ia) out.push(A); if (ia !== ib) { const u = (NEAR - A[2]) / (B[2] - A[2]); out.push(A.map((v, j) => v + (B[j] - v) * u)); } }
    ctx.beginPath(); out.forEach((p, i) => { const X = (C.cx + C.f * p[0] / p[2]) * k, Y = (C.cy - C.f * p[1] / p[2]) * k; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath();
    return out.length >= 3;
  }


  // ---------------------------------------------------------------- more textures: walls, the crowd, the sky, masks
  // ashlar for the arena walls (512 px over 4 m, already in shadow)
  function wallTex() {
    return K.cached('s6:wall', () => {
      const n = 512, c = pixels(n, n, (i, j) => { const m = K.fbm(i / 90, j / 90, 4, 401), g = K.hash(i, j, 403) - 0.5; const v = 46 + (m - 0.5) * 30 + g * 8; return [v * 1.05, v * 0.9, v * 0.78]; });
      const x = c.getContext('2d'), r = rng(405), bh = n / 8;
      for (let row = 0; row < 8; row++) {
        let xx = -r() * 120; const y0 = row * bh;
        while (xx < n) { const bw = 90 + r() * 90, tone = (r() - 0.5) * 0.3; x.fillStyle = tone > 0 ? `rgba(255,230,200,${tone * 0.25})` : `rgba(0,0,0,${-tone * 0.5})`; x.fillRect(xx, y0, bw, bh); x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(xx, y0, 3, bh); x.fillStyle = 'rgba(255,220,180,0.06)'; x.fillRect(xx + 3, y0 + 3, bw - 6, 3); xx += bw; }
        x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(0, y0, n, 3);
      }
      // rain streaks and soot
      for (let i = 0; i < 60; i++) { const px = r() * n, L = 40 + r() * 200, g = x.createLinearGradient(0, 0, 0, L); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.save(); x.translate(px, r() * n); x.fillRect(0, 0, 2 + r() * 5, L); x.restore(); }
      return c;
    });
  }
  // the crowd on the tiers: nine rows of seated watchers (1024 px over 12 m of tier, tiled along it)
  function crowdTex() {
    return K.cached('s6:crowd', () => {
      const w = 1024, h = 512, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(411), rows = 9, rh = h / rows;
      x.fillStyle = '#1a1310'; x.fillRect(0, 0, w, h);
      for (let k = 0; k < rows; k++) {
        const y0 = k * rh;
        // the stone step
        const g = x.createLinearGradient(0, y0, 0, y0 + rh); g.addColorStop(0, '#2a201a'); g.addColorStop(0.15, '#1c1511'); g.addColorStop(1, '#0d0907'); x.fillStyle = g; x.fillRect(0, y0, w, rh);
        x.fillStyle = 'rgba(200,150,100,0.10)'; x.fillRect(0, y0, w, 2);
        // the people of this row, wrapped so the tile repeats
        let px = r() * 10;
        while (px < w + 30) {
          const s = rh * (0.55 + r() * 0.2), hd = s * 0.2, cx = px, by = y0 + rh * 0.92, tone = 14 + r() * 22, hooded = r() < 0.35, warm = r() < 0.5;
          for (const ox of [0, -w, w]) {
            x.fillStyle = `rgb(${tone + 6},${tone},${tone - 3})`;
            x.beginPath(); x.moveTo(cx + ox - s * 0.32, by); x.quadraticCurveTo(cx + ox - s * 0.34, by - s * 0.52, cx + ox, by - s * 0.58); x.quadraticCurveTo(cx + ox + s * 0.34, by - s * 0.52, cx + ox + s * 0.32, by); x.closePath(); x.fill();
            x.beginPath(); x.ellipse(cx + ox, by - s * 0.66, hd, hd * 1.15, 0, 0, TAU); x.fill();
            if (hooded) { x.beginPath(); x.moveTo(cx + ox - hd * 1.3, by - s * 0.55); x.quadraticCurveTo(cx + ox - hd * 1.2, by - s * 0.66 - hd * 1.9, cx + ox, by - s * 0.66 - hd * 1.5); x.quadraticCurveTo(cx + ox + hd * 1.2, by - s * 0.66 - hd * 1.9, cx + ox + hd * 1.3, by - s * 0.55); x.closePath(); x.fill(); }
            // warm light from the arena on faces and shoulders
            x.fillStyle = warm ? 'rgba(220,140,80,0.22)' : 'rgba(170,120,100,0.12)';
            x.beginPath(); x.ellipse(cx + ox, by - s * 0.66 + hd * 0.2, hd * 0.75, hd * 0.8, 0, 0, TAU); x.fill();
            x.fillRect(cx + ox - s * 0.25, by - s * 0.5, s * 0.5, 2);
          }
          px += s * (0.62 + r() * 0.5);
          if (r() < 0.04) px += s * 1.2;
        }
        // now and then a pennant held up
        for (let q = 0; q < 2; q++) { const hx = r() * w, hy = y0 + rh * 0.3, col = K.HOUSES[Math.floor(r() * 7)].field; x.fillStyle = '#0a0705'; x.fillRect(hx, hy - rh * 0.4, 2, rh * 0.9); x.fillStyle = col; x.globalAlpha = 0.6; x.beginPath(); x.moveTo(hx + 2, hy - rh * 0.4); x.lineTo(hx + 26, hy - rh * 0.3); x.lineTo(hx + 2, hy - rh * 0.18); x.closePath(); x.fill(); x.globalAlpha = 1; }
      }
      return c;
    });
  }
  // a painted band of cloud for the red sky (mapped around the horizon by azimuth)
  function cloudTex() {
    return K.cached('s6:clouds', () => {
      const w = 3072, h = 720, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(421);
      for (let i = 0; i < 260; i++) {
        const cy = h * (0.18 + Math.pow(r(), 0.8) * 0.78), cx = r() * w, rw = 120 + r() * 520, rh = 10 + r() * 34 * (1 - cy / h * 0.5), dark = r() < 0.72;
        for (const ox of [0, -w, w]) {
          const g = x.createRadialGradient(cx + ox, cy, 0, cx + ox, cy, rw);
          if (dark) { g.addColorStop(0, `rgba(36,8,10,${0.22 + r() * 0.25})`); g.addColorStop(1, 'rgba(36,8,10,0)'); }
          else { g.addColorStop(0, `rgba(255,${120 + r() * 70},${70 + r() * 40},${0.08 + r() * 0.12})`); g.addColorStop(1, 'rgba(255,140,80,0)'); }
          x.fillStyle = g; x.save(); x.translate(cx + ox, cy); x.scale(1, rh / rw); x.translate(-cx - ox, -cy); x.beginPath(); x.arc(cx + ox, cy, rw, 0, TAU); x.fill(); x.restore();
        }
      }
      // bright under-edges near the horizon, where the low sun catches the cloud
      x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 70; i++) { const cy = h * (0.55 + r() * 0.42), cx = r() * w, L = 100 + r() * 400; for (const ox of [0, -w, w]) { x.strokeStyle = `rgba(255,${140 + r() * 60},${80 + r() * 40},${0.05 + r() * 0.08})`; x.lineWidth = 1 + r() * 3; x.beginPath(); x.moveTo(cx + ox - L / 2, cy); x.quadraticCurveTo(cx + ox, cy + (r() - 0.5) * 10, cx + ox + L / 2, cy + (r() - 0.5) * 6); x.stroke(); } }
      return c;
    });
  }
  // the far horizon of the battlefield: low hills, the towers of the seat of the Blood-Throne, a smoking peak (by azimuth)
  function farTex() {
    return K.cached('s6:far', () => {
      const w = 4096, h = 360, c = K.canvas(w, h), x = c.getContext('2d'), r = rng(431);
      const ridge = (base, amp, fq, seed, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, h); for (let i = 0; i <= w; i += 8) { const v = K.fbm(i / fq, 0.5, 4, seed) - 0.5; x.lineTo(i, base - amp * (0.5 + v * 1.6)); } x.lineTo(w, h); x.closePath(); x.fill(); };
      // the smoking peak (Blodfell), far off
      x.fillStyle = 'rgba(70,20,22,0.55)'; x.beginPath(); x.moveTo(2500, h); x.lineTo(2760, 120); x.lineTo(2800, 112); x.lineTo(2830, 122); x.lineTo(3150, h); x.closePath(); x.fill();
      ridge(300, 60, 340, 433, 'rgba(70,22,22,0.6)');
      ridge(320, 40, 200, 435, 'rgba(46,14,14,0.8)');
      // the seat of the Blood-Throne: walls and towers on a rise
      const cx = 1250; x.fillStyle = 'rgba(30,8,9,0.92)';
      x.beginPath(); x.moveTo(cx - 420, h); x.quadraticCurveTo(cx, 250, cx + 420, h); x.fill();
      for (let i = 0; i < 26; i++) { const tx = cx - 300 + i * 24 + (r() - 0.5) * 10, th = 30 + r() * 70 + (Math.abs(i - 13) < 4 ? 60 : 0), tw = 8 + r() * 10; x.fillRect(tx, 290 - th, tw, th + 60); if (r() < 0.6) { x.beginPath(); x.moveTo(tx - 2, 290 - th); x.lineTo(tx + tw / 2, 290 - th - tw * 1.4); x.lineTo(tx + tw + 2, 290 - th); x.fill(); } }
      x.fillRect(cx - 330, 268, 660, 40);
      ridge(345, 22, 120, 437, 'rgba(26,8,8,1)');
      // smoke columns
      for (let i = 0; i < 7; i++) { const sx = 400 + r() * 3300; for (let k = 0; k < 14; k++) { const y = 320 - k * 22, rad = 10 + k * 6; const g = x.createRadialGradient(sx + k * k * 0.8, y, 0, sx + k * k * 0.8, y, rad); g.addColorStop(0, `rgba(30,12,12,${0.18 * (1 - k / 14)})`); g.addColorStop(1, 'rgba(30,12,12,0)'); x.fillStyle = g; x.beginPath(); x.arc(sx + k * k * 0.8, y, rad, 0, TAU); x.fill(); } }
      return c;
    });
  }
  // dissolve masks (alpha = noise above a threshold): an ink figure lifting away in flakes
  function dissolveMasks() {
    return K.cached('s6:dis', () => {
      const w = 96, h = 192, f = new Float32Array(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) f[j * w + i] = K.fbm(i / 14, j / 14, 4, 441) * 0.75 + (1 - j / h) * 0.25;
      let mn = 1e9, mx = -1e9; for (const v of f) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
      const out = [];
      for (let k = 0; k <= 16; k++) {
        const th = k / 16, c = K.canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h);
        for (let i = 0; i < w * h; i++) { const v = (f[i] - mn) / (mx - mn); img.data[i * 4 + 3] = clamp((v - th) / 0.06) * 255; }
        x.putImageData(img, 0, 0); out.push(c);
      }
      return out;
    });
  }


  // ---------------------------------------------------------------- the state of the world over time
  const BYMAX = 0.55;                                    // the board's slab rises this far above the arena floor
  function boardY(t) { const T = TT(); return BYMAX * ease(span(t, T.rise0 + 0.6, T.rise1)); }
  function arenaRise(t) { const T = TT(); return ease(span(t, T.rise0, T.rise1)); }
  function battle(t) { const T = TT(); return 1 - smooth(span(t, T.fill0 + 0.6, T.rise1)); }   // 1 on the field, 0 in the arena
  // brazier fire: 0 before it is lit, flaring, then breathing
  function fire(i, t) { const T = TT(), t0 = T.lit0 + [0.0, 0.35, 0.7, 0.18][i]; if (t < t0) return 0; const u = t - t0; return clamp(u / 0.25) * (1 + 0.6 * Math.exp(-u * 2.5)); }
  function flick(i, tw) { return 0.86 + 0.08 * Math.sin(tw * 9.1 + i * 2) + 0.06 * Math.sin(tw * 15.7 + i * 5) + 0.05 * (K.noise(tw * 3, i * 7, 51) - 0.5); }
  // all the light in the arena: ambient, braziers, the board's top light, the cold light of the law, the king's pool
  function lights(t) {
    const T = TT(), tw = worldT(t), bf = battle(t), L = { amb: [0, 0, 0], lights: [], cold: 0 };
    // the field under a red sky
    const sky = [lerp(40, 205, bf), lerp(30, 116, bf), lerp(32, 92, bf)];
    L.amb = sky;
    const still = win(t, T.still0, T.still1 + 0.6, 0.5, 0.8), eald = win(t, T.dis0 - 0.8, T.bor1 + 0.6, 1.0, 1.4);
    for (let i = 0; i < 4; i++) {
      const fr = fire(i, t); if (fr <= 0) continue;
      const fl = flick(i, tw) * fr * (1 - 0.35 * still);
      const [bx, bz] = BRAZ[i], dimB = bz > 0 ? 1 - 0.4 * eald : 1;
      L.lights.push({ x: bx, z: bz, r: 19, c: [255, 158, 82], a: 1.15 * fl * dimB, y: BRZH, fire: true });
    }
    const arena = 1 - bf;
    L.lights.push({ x: 0, z: -2, r: 17, c: [150, 118, 104], a: 0.62 * arena * (1 - 0.45 * still), y: 14 });
    // the dais of the Seven
    L.lights.push({ x: 21, z: 0, r: 11, c: [255, 150, 90], a: 0.7 * arena * flick(5, tw), y: 4 });
    // the cold light of the law (L33-L34)
    L.cold = still;
    if (still > 0) L.lights.push({ x: 2, z: 0, r: 22, c: [120, 140, 190], a: 0.5 * still, y: 20 });
    // the pool on the surrounded king (L42)
    const kp = smooth(span(t, T.a42 - 0.6, T.a42 + 1.2));
    if (kp > 0) L.lights.push({ x: sqX(3), z: sqZ(4), r: 7, c: [255, 200, 150], a: 0.9 * kp, y: 9 });
    // Ealdholt's side goes cold and dim while its back rank empties (L36-L37)
    L.eald = eald;
    L.fn = (x, z) => {
      let r = 1, g = 1, b = 1;
      if (eald > 0 && z > 2) { const k = eald * smooth(clamp((z - 2) / 6)); r -= 0.45 * k; g -= 0.38 * k; b -= 0.2 * k; }
      if (arena > 0) { const d = Math.max(Math.abs(x), Math.abs(z)); if (d > AW - 1) { const k = arena * clamp((d - AW + 1) / 2); r *= 1 - k; g *= 1 - k; b *= 1 - k; } }
      return [r, g, b];
    };
    return L;
  }
  // the light falling on a point at height y (for people and things): [r, g, b] in 0..~1.6, and the strongest source
  function lightAt(L, x, y, z) {
    let r = L.amb[0] / 255, g = L.amb[1] / 255, b = L.amb[2] / 255, best = null, bw = 0;
    for (const l of L.lights) {
      const dx = x - l.x, dz = z - l.z, dy = y - (l.y || 3), e = (dx * dx + dz * dz + dy * dy * 0.3) / (l.r * l.r);
      if (e >= 1.4) continue;
      const f = l.a * Math.max(0, 1.4 - e) / 1.4 / (1 + e * 3);
      r += l.c[0] / 255 * f; g += l.c[1] / 255 * f; b += l.c[2] / 255 * f;
      if (f > bw) { bw = f; best = l; }
    }
    if (L.fn) { const m = L.fn(x, z); r *= m[0]; g *= m[1]; b *= m[2]; }
    return { c: [r, g, b], key: best, keyAmt: bw };
  }


  // ---------------------------------------------------------------- the pieces: living people on the squares
  // side A: a great house (the armies: red, a tower); its queen is lent from the roads (blue, the scales).
  // side B: Ealdholt (russet, a sprig), a lesser house; its own back rank dissolves (L36) and the Seven's champions are
  // borrowed into it (L37), each binding a pawn with a chain.
  const HS = K.HOUSES, AH = HS[0], QH = HS[2], EH = K.LESSER;
  const BACK = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  const LEND = [HS[3], HS[6], HS[4], HS[1], null, HS[2], HS[5], HS[3]];     // iron, beasts, laws, grain, -, roads, frontier, iron
  const HEIGHT = { P: 1.82, R: 1.95, B: 1.98, Q: 1.86, K: 2.02, N: 3.05 };
  let PCS = null;
  function pieces() {
    if (PCS) return PCS;
    const T = TT(), r = rng(6606); PCS = [];
    const mk = (o) => { o.segs = []; o.seed = Math.floor(r() * 1e6); o.h = HEIGHT[o.type] * (0.97 + r() * 0.06); PCS.push(o); return o; };
    const walk = (p, t0, t1, x0, z0, x1, z1, kind = 'walk') => p.segs.push({ t0, t1, x0, z0, x1, z1, kind });
    const jump = (p, t, x1, z1, ang) => p.segs.push({ t0: t, t1: t, x0: x1, z0: z1, x1, z1, kind: 'jump', ang });
    // side A: everyone but the queen walks in from behind their squares
    for (let f = 0; f < 8; f++) for (const rank of [0, 1]) {
      const type = rank ? 'P' : BACK[f]; if (type === 'Q') continue;
      const p = mk({ id: 'A' + type + f, side: 'A', type, f, rank, house: rank ? null : AH, ang: 0 });
      const st = (f % 4) * 0.12 + (rank ? 0.0 : 0.25) + r() * 0.15;
      walk(p, T.walk0 + st, T.walk1 - (0.3 - st * 0.5), sqX(f), sqZ(rank) - 9 - rank * 0.6, sqX(f), sqZ(rank));
    }
    // side A's queen, lent from the roads: she walks out of her house's retinue into her square (L35)
    { const p = mk({ id: 'AQ', side: 'A', type: 'Q', f: 3, rank: 0, house: QH, ang: 0, lent: true }); walk(p, T.q0, T.q1, sqX(3) - 0.4, -16.5, sqX(3), sqZ(0)); }
    // side B: commoner pawns, its own back rank (which the law will not let stand), and its lord
    for (let f = 0; f < 8; f++) {
      const p = mk({ id: 'BP' + f, side: 'B', type: 'P', f, rank: 6, house: null, ang: Math.PI });
      const st = ((7 - f) % 4) * 0.12 + r() * 0.15;
      walk(p, T.walk0 + st, T.walk1 - (0.3 - st * 0.5), sqX(f), sqZ(6) + 9.6, sqX(f), sqZ(6));
      const type = BACK[f];
      const q = mk({ id: 'B' + type + f, side: 'B', type, f, rank: 7, house: type === 'K' ? EH : null, ang: Math.PI, own: type !== 'K' });
      walk(q, T.walk0 + st + 0.25, T.walk1 - (0.3 - st * 0.5), sqX(f), sqZ(7) + 9, sqX(f), sqZ(7));
      if (q.own) { const d0 = T.dis0 + [0.0, 0.5, 0.25, 0.75, 0, 0.35, 0.6, 0.1][f] * (T.dis1 - T.dis0) * 0.75; q.dis = [d0, d0 + 1.1]; }
      // the borrowed champion of one of the Seven, with its price (a coin and a chain on the pawn before it)
      if (type !== 'K') {
        const i = [0, 1, 2, 3, -1, 4, 5, 6][f], t0 = T.bor0 + i * (T.bor1 - T.bor0 - 1.7) / 6;
        const b = mk({ id: 'BB' + type + f, side: 'B', type, f, rank: 7, house: LEND[f], ang: Math.PI, borrowed: true, arrive: t0 + 1.7 });
        walk(b, t0, t0 + 1.7, sqX(f) + (r() - 0.5) * 0.6, sqZ(7) + 6.5, sqX(f), sqZ(7));
        b.chain = { pawn: 'BP' + f, t0: t0 + 1.55, t1: t0 + 2.6 };
        b.coin = t0 + 1.62;
      }
    }
    const P = id => PCS.find(p => p.id === id);
    // play (L38-L39): a knight moves; pawns advance; a borrowed bishop crosses
    walk(P('AN6'), T.kn0, T.kn1, sqX(6), sqZ(0), sqX(5), sqZ(2), 'leap');
    walk(P('AP4'), T.a39 - 0.3, T.a39 + 1.8, sqX(4), sqZ(1), sqX(4), sqZ(3));
    walk(P('BP3'), T.a39 + 0.4, T.a39 + 2.4, sqX(3), sqZ(6), sqX(3), sqZ(4));
    walk(P('BBB2'), T.a39 + 0.9, T.b39 + 0.3, sqX(2), sqZ(7), sqX(6), sqZ(4) + 0.15, 'slide');
    // L40: the knight takes the borrowed bishop, who falls
    walk(P('AN6'), T.fall0 - 0.75, T.fall0 + 0.15, sqX(5), sqZ(2), sqX(6), sqZ(4) - 0.9, 'leap');
    P('BBB2').fall = [T.fall0, T.fall1];
    // L41-L42, set while the camera is on the defeated: Ealdholt's lord surrounded in the middle of the board, the
    // defeated in shadow beyond the far edge
    const kx = sqX(3), kz = sqZ(4);
    jump(P('BK4'), T.form, kx, kz, Math.PI * 0.92);
    const ring = [['AR0', 2, 3], ['AN1', 3, 3], ['AB2', 4, 3], ['AQ', 2, 4], ['AN6', 4, 4], ['AB5', 2, 5], ['AR7', 3, 5], ['AP2', 4, 5]];
    for (const [id, f, rk] of ring) { const p = P(id), x = sqX(f), z = sqZ(rk); jump(p, T.form, x, z, Math.atan2(kx - x, kz - z)); }
    const outer = [['AP0', 1, 2], ['AP1', 2, 2], ['AP3', 5, 3], ['AP4', 1, 4], ['AP5', 5, 5], ['AP6', 3, 6], ['AP7', 5, 4], ['AK4', 3, 1]];
    for (const [id, f, rk] of outer) { const p = P(id), x = sqX(f), z = sqZ(rk); jump(p, T.form, x, z, Math.atan2(kx - x, kz - z)); }
    // the defeated: Ealdholt's pawns and its borrowed champions, in a row beyond the far edge
    const dz = BE + STEP + 2.2; let di = 0;
    for (const p of PCS) if (p.side === 'B' && p.id !== 'BK4' && !p.own) { const x = -9.5 + (di++) * 1.35; jump(p, T.form, x + (K.hash(di, 3, 9) - 0.5) * 0.5, dz + (di % 2) * 0.9, Math.PI); p.defeated = true; }
    return PCS;
  }
  // where a piece is at time t: x, z, the facing angle, whether it walks (and its stride phase), a leap height
  function where(p, t) {
    let x = p.segs.length ? p.segs[0].x0 : sqX(p.f), z = p.segs.length ? p.segs[0].z0 : sqZ(p.rank), ang = p.ang, moving = false, phase = 0, lift = 0, sp = 0;
    for (const s of p.segs) {
      if (t < s.t0) break;
      if (s.kind === 'jump') { x = s.x1; z = s.z1; ang = s.ang; continue; }
      const u = clamp((t - s.t0) / Math.max(1e-6, s.t1 - s.t0)), L = Math.hypot(s.x1 - s.x0, s.z1 - s.z0);
      // walks accelerate and settle (a trapezoid of speed); leaps and slides ease
      const A = 0.18, V = 1 / (1 - A), ee = s.kind === 'walk' ? (u < A ? 0.5 * V / A * u * u : u > 1 - A ? 1 - 0.5 * V / A * (1 - u) * (1 - u) : 0.5 * V * A + V * (u - A)) : ease(u);
      x = lerp(s.x0, s.x1, ee); z = lerp(s.z0, s.z1, ee);
      if (u < 1 && L > 0.01) { moving = true; ang = Math.atan2(s.x1 - s.x0, s.z1 - s.z0); phase = ee * L / 0.72 * Math.PI; sp = L / (s.t1 - s.t0); if (s.kind === 'leap') lift = Math.sin(u * Math.PI) * 1.1; }
      else if (u >= 1 && L > 0.01 && s.kind !== 'slide') ang = p.side === 'A' ? 0 : Math.PI;
      if (s.kind === 'slide' && u >= 1) ang = Math.atan2(s.x1 - s.x0, s.z1 - s.z0);
    }
    return { x, z, ang, moving, phase, lift, sp };
  }
  // is the piece there at all at time t (alpha), and how far it has dissolved
  function presence(p, t) {
    const T = TT(), s0 = p.segs[0];
    let a = 1;
    if (p.id === 'AQ') a = smooth(span(t, T.q0 - 0.6, T.q0 + 0.4));
    else if (p.borrowed) a = smooth(span(t, s0.t0 - 0.5, s0.t0 + 0.3));
    else a = smooth(span(t, s0.t0 - 0.4, s0.t0 + 0.3));
    let dis = 0; if (p.dis) dis = clamp((t - p.dis[0]) / (p.dis[1] - p.dis[0]));
    if (dis >= 1) a = 0;
    return { a, dis };
  }


  // ---------------------------------------------------------------- people: drawn into a sprite, then lit
  const SPR = {};
  function scratch(name, w, h) {
    w = Math.ceil(w); h = Math.ceil(h);
    let c = SPR[name];
    if (!c || c.width < w || c.height < h) c = SPR[name] = K.canvas(Math.min(2400, Math.max(w, c ? c.width : 0, 256)), Math.min(2400, Math.max(h, c ? c.height : 0, 256)));
    const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, w + 2, h + 2);
    return c;
  }
  const NEUTRAL_A = '#cbbd9e', NEUTRAL_B = '#3b302a';
  const COMMON = ['#6e5236', '#5d4c3c', '#7a6248', '#4e4236', '#655440', '#584536'];
  // the costume of a piece at time t (K.figure options in the house colours, before light)
  function costume(p, t) {
    const T = TT(), hs = p.house;
    let bloom = 1;
    if (p.side === 'A' && p.type !== 'P' && !p.lent) bloom = p.bloom != null ? smooth(span(t, p.bloom, p.bloom + 0.7)) : 0;
    const base = p.side === 'A' ? NEUTRAL_A : NEUTRAL_B;
    const field = hs ? mixHex(base, hs.field, bloom) : base;
    const c = { kind: 'robe', head: 'bare', hold: 'none', robe: field, hose: p.side === 'A' ? '#5c4a38' : '#2a221c', skin: '#cfa784', hair: '#3b2716', veil: '#ece4d2', arms: hs && bloom > 0.02 ? hs : null, armsA: bloom, crownGold: true };
    const r = rng(p.seed);
    switch (p.type) {
      case 'K': Object.assign(c, { kind: p.side === 'A' ? 'robe' : 'cloak', head: 'crown', hold: 'staff', crownGold: p.side === 'A', collar: p.side === 'A' }); if (p.side === 'B') { c.robe = '#6e5236'; c.hose = '#3a2a1a'; } break;
      case 'Q': Object.assign(c, { kind: 'gown', head: 'veil', hold: 'none', crown2: true }); break;
      case 'B': Object.assign(c, { kind: 'robe', head: 'mitre', hold: 'staff' }); break;
      case 'R': Object.assign(c, { kind: 'armour', head: 'helm', hold: 'spear', pavise: true, hose: '#3a3836' }); break;
      case 'N': Object.assign(c, { kind: 'armour', head: 'helm', hold: 'spear', horse: true, coat: p.side === 'A' ? '#8f897f' : (hs && hs.key === 'beasts' ? '#231d1a' : '#5a3a24') }); break;
      case 'P':
        if (p.side === 'A') Object.assign(c, { kind: 'tunic', head: 'kettle', hold: 'spear', robe: '#c2b391', hose: '#5c4a38' });
        else Object.assign(c, { kind: r() < 0.4 ? 'rags' : 'tunic', head: ['hood', 'coif', 'bare', 'hair', 'hood', 'cap'][Math.floor(r() * 6)], hold: 'none', robe: COMMON[Math.floor(r() * COMMON.length)], hose: '#3a2e24', hair: ['#2a1c12', '#4a3020', '#6a5040', '#1e1610'][Math.floor(r() * 4)] });
        break;
    }
    if (p.own) { c.robe = NEUTRAL_B; c.arms = null; }
    return c;
  }
  // the heraldic extras drawn over a figure in its own units (feet at 0, crown at -1, facing +x): a tabard device, a pavise
  function pavisePath(x, cx, top, bot, hw) { x.beginPath(); x.moveTo(cx - hw, top + hw * 0.5); x.quadraticCurveTo(cx - hw, top, cx, top - hw * 0.1); x.quadraticCurveTo(cx + hw, top, cx + hw, top + hw * 0.5); x.lineTo(cx + hw * 0.92, bot - hw * 0.4); x.lineTo(cx, bot); x.lineTo(cx - hw * 0.92, bot - hw * 0.4); x.closePath(); }
  function drawPavise(x, c, front, lw) {
    const cx = 0.11, top = -0.8, bot = -0.2, hw = 0.135 * Math.max(0.4, front);
    pavisePath(x, cx, top, bot, hw);
    if (front < 0) { x.fillStyle = c.lit('#4a3524'); x.fill(); x.strokeStyle = c.lit('#2a1d12'); x.lineWidth = lw; x.stroke(); return; }
    const hs = c.arms; x.fillStyle = c.lit(hs ? mixHex('#a8a49c', hs.field, c.armsA) : '#a8a49c'); x.fill();
    x.save(); pavisePath(x, cx, top, bot, hw); x.clip();
    if (hs && hs.device !== 'none' && c.armsA > 0.05) { x.globalAlpha = c.armsA; x.fillStyle = c.lit(hs.charge); K.device(x, hs.device, cx, (top + bot) / 2 - 0.02, hw * 1.3); x.globalAlpha = 1; }
    const g = x.createLinearGradient(cx - hw, 0, cx + hw, 0); g.addColorStop(0, 'rgba(255,240,210,0.18)'); g.addColorStop(0.45, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)'); x.fillStyle = g; x.fillRect(cx - hw, top - 0.1, hw * 2, bot - top + 0.2);
    x.restore();
    pavisePath(x, cx, top, bot, hw); x.strokeStyle = c.lit(hs && c.armsA > 0.5 ? '#c9a14a' : '#5a5650'); x.lineWidth = lw * 1.6; x.stroke();
  }
  function drawTabard(x, c, front) {
    if (!c.arms || front < -0.1 || c.arms.device === 'none') return;
    const a = c.armsA * clamp((front + 0.1) / 0.5);
    x.save(); x.globalAlpha *= a; x.fillStyle = c.lit(c.arms.charge);
    K.device(x, c.arms.device, 0.012, c.kind === 'gown' ? -0.66 : -0.68, 0.06); x.restore();
  }
  function drawCrown2(x, c, lw) {
    const hx = 0.012, hy = -0.915, R = 0.05, Ry = 0.061, cy0 = hy - Ry * 1.05, cw = R * 1.05, chh = Ry * 0.95;
    const path = q => { q.beginPath(); q.moveTo(hx - cw, cy0); q.lineTo(hx - cw, cy0 - chh * 0.7); q.lineTo(hx - cw * 0.5, cy0 - chh * 0.35); q.lineTo(hx, cy0 - chh); q.lineTo(hx + cw * 0.5, cy0 - chh * 0.35); q.lineTo(hx + cw, cy0 - chh * 0.7); q.lineTo(hx + cw, cy0); q.closePath(); };
    K.gold(x, path, hx - cw, cy0 - chh, hx + cw, cy0, { sheen: 0.55, outlineW: lw });
  }
  function drawCollar(x, c, lw) { x.fillStyle = c.lit('#ece6da'); x.beginPath(); x.moveTo(-0.11, -0.82); x.quadraticCurveTo(0, -0.76, 0.11, -0.82); x.lineTo(0.1, -0.77); x.quadraticCurveTo(0, -0.7, -0.1, -0.77); x.closePath(); x.fill(); x.fillStyle = c.lit('#1a1410'); for (const q of [-0.07, -0.02, 0.04, 0.08]) { x.beginPath(); x.ellipse(q, -0.77, 0.006, 0.01, 0, 0, TAU); x.fill(); } void lw; }
  // drawPiece: the whole pipeline for one person (or a knight and his horse) at time t
  function drawPiece(ctx, C, p, t, L, opt = {}) {
    const pr = presence(p, t); if (pr.a <= 0.003) return;
    const w = where(p, t), T = TT();
    const y = floorAt(w.x, w.z, t) + (w.lift || 0);
    const foot = pj(C, w.x, y, w.z); if (!foot) return;
    const H0 = p.h, head = pj(C, w.x, y + H0, w.z); if (!head) return;
    let hp = Math.hypot(head[0] - foot[0], head[1] - foot[1]); if (hp < 4) return;
    if (foot[0] < -hp * 1.5 || foot[0] > W + hp * 1.5 || foot[1] < -hp * 0.2 || foot[1] > H + hp * 2.2) return;
    const tilt = Math.atan2(head[0] - foot[0], foot[1] - head[1]);
    const c = costume(p, t);
    const lt = lightAt(L, w.x, y + 1.2, w.z), lc = lt.c;
    c.lit = h => litHex(h, lc);
    const dx = Math.sin(w.ang), dz = Math.cos(w.ang), sr = dx * C.rx + dz * C.rz, tc = -(dx * C.fx + dz * C.fz);
    const face = Math.abs(sr) < 0.12 ? (p.side === 'A' ? 1 : -1) * (p.f < 4 ? 1 : -1) : (sr >= 0 ? 1 : -1);
    const knight = !!c.horse, hw = knight ? hp / 1.81 : 0;
    const SW = knight ? hw * 2.3 + 24 : hp * 1.15 + 24, SH = knight ? hw * 2.45 + 20 : hp * 1.6 + 20;
    const ox = SW / 2, oy = SH - (knight ? 0.04 * hw : 0.06 * hp) - 8;
    const spr = scratch('fig', SW, SH), x = spr.getContext('2d');
    const lw = clamp(hp / 170, 0.8, 2.6);
    const walk = w.moving && w.sp > 0.3 ? w.phase : undefined;
    const tw = worldT(t);
    // breathing: a slight sway when standing (stilled while the law is spoken)
    const sway = (K.noise(tw * 0.4, p.seed % 97, 7) - 0.5) * 0.012;
    if (knight) {
      const sq = Math.max(0.42, Math.abs(sr));
      x.save(); x.translate(ox, oy); x.scale(sq, 1);
      K.horse(x, 0, 0, hw, { face, walk: w.moving ? w.phase * 0.7 : undefined, fill: c.lit(c.coat), house: c.arms && c.armsA > 0.5 ? c.arms : null, caparison: c.arms && c.armsA > 0.5 ? null : c.lit(mixHex('#bdb19a', c.robe, 0.6)), rider: { style: 'painted', kind: 'armour', head: 'helm', hold: 'spear', robe: c.lit(c.robe), hose: c.lit('#4a4642'), skin: c.lit(c.skin), outline: lw, shield: c.arms && c.armsA > 0.5 ? c.arms : undefined } });
      x.restore();
    } else {
      const fo = { style: 'painted', kind: c.kind, head: c.head, hold: c.hold, face, walk, robe: c.lit(c.robe), hose: c.lit(c.hose), skin: c.lit(c.skin), hairCol: c.lit(c.hair), veil: c.lit(c.veil), crownGold: c.crownGold, outline: lw, t: tw, sheen: 0.45 + 0.2 * Math.sin(tw * 0.7 + p.seed), sway, arm: opt.arm, bend: opt.bend };
      if (c.pavise && tc < -0.25) { x.save(); x.translate(ox, oy); x.scale(face * hp, hp); drawPavise(x, c, -1, lw / hp); x.restore(); }
      K.figure(x, ox, oy, hp, fo);
      x.save(); x.translate(ox, oy); x.scale(face * hp, hp);
      if (c.collar) drawCollar(x, c, lw / hp);
      drawTabard(x, c, tc);
      if (c.crown2) drawCrown2(x, c, lw / hp);
      if (c.pavise && tc >= -0.25) drawPavise(x, c, Math.abs(tc) < 0.3 ? 0.45 : Math.abs(tc), lw / hp);
      x.restore();
    }
    // light: darker toward the feet, the far side in shadow, a warm edge toward the strongest fire
    let kx = 0, ky = -1;
    if (lt.key) { const kp = pj(C, lt.key.x, lt.key.y || 3, lt.key.z); if (kp) { kx = kp[0] - foot[0]; ky = kp[1] - (foot[1] + head[1]) / 2; } else { const v = toCam(C, lt.key.x, lt.key.y || 3, lt.key.z); kx = v[0]; ky = -v[1]; } const kl = Math.hypot(kx, ky) || 1; kx /= kl; ky /= kl; }
    // rotate the light direction into the sprite's frame (the sprite is drawn tilted)
    const ct = Math.cos(-tilt), st = Math.sin(-tilt), lx = kx * ct - ky * st, ly = kx * st + ky * ct;
    const big = hp > 46;
    x.globalCompositeOperation = 'source-atop';
    let g = x.createLinearGradient(0, oy - (knight ? hw * 2 : hp), 0, oy);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, 'rgba(6,4,4,0.12)'); g.addColorStop(1, 'rgba(6,4,4,0.55)');
    x.fillStyle = g; x.fillRect(0, 0, SW, SH);
    if (big) {
      g = x.createLinearGradient(ox + lx * SW * 0.35, oy - SH * 0.45 + ly * SH * 0.3, ox - lx * SW * 0.35, oy - SH * 0.45 - ly * SH * 0.3);
      g.addColorStop(0, rgbs([255, 190, 120], 0.10 * clamp(lt.keyAmt))); g.addColorStop(0.45, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,6,12,0.42)');
      x.fillStyle = g; x.fillRect(0, 0, SW, SH);
    }
    // aerial perspective
    const fog = clamp((foot[2] - 16) / 60) * 0.55 * (1 - battle(t) * 0.4);
    if (fog > 0.01) { x.fillStyle = rgbs(opt.fogCol || [34, 20, 20], fog); x.fillRect(0, 0, SW, SH); }
    x.globalCompositeOperation = 'source-over';
    // Ealdholt's own champions lift away like ink (L36)
    if (pr.dis > 0) { const m = dissolveMasks()[Math.min(16, Math.round(pr.dis * 16))]; x.globalCompositeOperation = 'destination-in'; x.imageSmoothingEnabled = true; x.drawImage(m, 0, 0, SW, SH); x.globalCompositeOperation = 'source-over'; }
    // the warm edge
    let rim = null;
    if (big && lt.key && lt.keyAmt > 0.05) {
      const rs = scratch('rim', SW, SH), rx = rs.getContext('2d'), d = clamp(hp / 110, 1.2, 4.5);
      rx.drawImage(spr, 0, 0, SW, SH, 0, 0, SW, SH);
      rx.globalCompositeOperation = 'destination-out'; rx.drawImage(spr, 0, 0, SW, SH, -lx * d, -ly * d, SW, SH);
      rx.globalCompositeOperation = 'source-in'; rx.fillStyle = rgbs([255, 176, 104], 1); rx.fillRect(0, 0, SW, SH);
      rim = { c: rs, a: clamp(lt.keyAmt * 1.1) * (lt.key.fire ? 1 : 0.5) };
    }
    // the fall (L40): toppling about the feet
    let rot = 0;
    if (p.fall) { const u = span(t, p.fall[0], p.fall[1]); const dir = (0 * C.rx + 1 * C.rz) >= 0 ? 1 : -1; rot = dir * (easeIn(u) * 1.48 - (u >= 1 ? 0 : 0) + (u > 0.9 ? Math.sin((u - 0.9) * 30) * 0.03 * (1 - u) : 0)); }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = pr.a * (opt.alpha != null ? opt.alpha : 1);
    ctx.translate(foot[0], foot[1]); ctx.rotate(tilt + rot);
    ctx.drawImage(spr, 0, 0, SW, SH, -ox, -oy, SW, SH);
    if (rim) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= rim.a; ctx.drawImage(rim.c, 0, 0, SW, SH, -ox, -oy, SW, SH); }
    ctx.restore();
    // a gold glint as the arms take (L34)
    if (p.bloom != null) { const gl = win(t, p.bloom + 0.15, p.bloom + 1.1, 0.12, 0.7); if (gl > 0) { const cy = lerp(foot[1], head[1], 0.62), cxp = lerp(foot[0], head[0], 0.62); K.glow(ctx, cxp, cy, hp * 0.5, [255, 214, 140], 0.55 * gl); star(ctx, cxp + hp * 0.05, cy - hp * 0.05, hp * 0.35 * gl, 0.9 * gl); } }
    return { foot, head, hp, x: w.x, z: w.z, y };
  }
  // a four-pointed glint
  function star(ctx, x, y, r, a) {
    if (a <= 0 || r <= 0.5) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
    for (const [rx, ry] of [[r, r * 0.06], [r * 0.06, r], [r * 0.45, r * 0.03], [r * 0.03, r * 0.45]]) { const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); g.addColorStop(0, `rgba(255,246,220,${a})`); g.addColorStop(1, 'rgba(255,220,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  // where the walking surface is: the board's slab, its step, or the arena floor
  function floorAt(x, z, t) {
    const by = boardY(t), d = Math.max(Math.abs(x), Math.abs(z));
    if (d <= BE) return by; if (d <= BE + STEP) return by * 0.5; return 0;
  }


  // ---------------------------------------------------------------- the arena: walls, tiers of watchers, towers, banners, the dais
  const WALLH = 4.4, TIER0 = AW, TIER1 = AW + 10, TIERH = 13.2, RIMH = 15.6;
  function wallStrip() {
    return K.cached('s6:wallstrip', () => {
      const w = 2048, h = 256, c = K.canvas(w, h), x = c.getContext('2d'), t = wallTex();
      for (let i = 0; i < 4; i++) x.drawImage(t, i * 512, 0, 512, 256);
      // a gilded rail along the top, a dark plinth along the foot
      const g = x.createLinearGradient(0, 0, 0, 14); g.addColorStop(0, '#6a4a1c'); g.addColorStop(0.4, '#c9a14a'); g.addColorStop(1, '#3a2a10'); x.fillStyle = g; x.fillRect(0, 0, w, 12);
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, h - 26, w, 26);
      return mipChain(c, 4);
    });
  }
  const crowdMips = () => K.cached('s6:crowdMips', () => { const t = crowdTex(), c = K.canvas(2048, 512), x = c.getContext('2d'); x.drawImage(t, 0, 0); x.drawImage(t, 1024, 0); return mipChain(c, 4); });
  // the four sides, each seen from inside: a = left end, b = right end, n = inward normal
  const SIDES = [
    { a: [-AW, AW], b: [AW, AW], n: [0, -1] }, { a: [AW, -AW], b: [-AW, -AW], n: [0, 1] },
    { a: [AW, AW], b: [AW, -AW], n: [-1, 0] }, { a: [-AW, -AW], b: [-AW, AW], n: [1, 0] },
  ];
  function polyFill(ctx, C, pts, fill) {
    if (!quadPath(ctx, C, pts)) return false; ctx.fillStyle = fill; ctx.fill(); return true;
  }
  function drawArena(ctx, C, t, L) {
    const rise = arenaRise(t); if (rise <= 0.001) return;
    const tw = worldT(t), wh = WALLH * rise, th = TIERH * rise, rh = RIMH * rise;
    ctx.save();
    const sides = SIDES.map((s, i) => { const mx = (s.a[0] + s.b[0]) / 2 - s.n[0] * 5, mz = (s.a[1] + s.b[1]) / 2 - s.n[1] * 5; const v = toCam(C, mx, 6, mz); return { s, i, d: v[2] }; }).sort((p, q) => q.d - p.d);
    for (const { s, i } of sides) {
      const ax = s.a[0], az = s.a[1], bx = s.b[0], bz = s.b[1], nx = s.n[0], nz = s.n[1];
      const ux = bx - ax, uz = bz - az, back = TIER1 - TIER0;
      // tiers of watchers (two textured halves), then the parapet against the sky
      for (const h0 of [0, 0.5]) plane(ctx, C, crowdMips(), [ax + ux * h0 - nx * back, th, az + uz * h0 - nz * back], [ux * 0.5, 0, uz * 0.5], [nx * back, wh - th, nz * back], 2048, 512, { err: 4, roots: [2, 1] });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const pb = [[ax - nx * back - ux * 0.3, th, az - nz * back - uz * 0.3], [bx - nx * back + ux * 0.3, th, bz - nz * back + uz * 0.3], [bx - nx * back + ux * 0.3, rh, bz - nz * back + uz * 0.3], [ax - nx * back - ux * 0.3, rh, az - nz * back - uz * 0.3]];
      polyFill(ctx, C, pb, '#140d0a');
      // merlons
      if (rise > 0.95) {
        ctx.fillStyle = '#100a08';
        for (let k = 0; k < 30; k++) { const u0 = -0.3 + (k + 0.25) / 30 * 1.6, u1 = u0 + 0.6 / 30 * 1.6; const P0 = [ax - nx * back + ux * u0, rh, az - nz * back + uz * u0], P1 = [ax - nx * back + ux * u1, rh, az - nz * back + uz * u1]; if (quadPath(ctx, C, [P0, P1, [P1[0], rh + 1.2, P1[2]], [P0[0], rh + 1.2, P0[2]]])) ctx.fill(); }
      }
      // the wall face with its gilded rail
      plane(ctx, C, wallStrip(), [ax, wh, az], [ux, 0, uz], [0, -wh, 0], 2048, 256 * Math.max(0.05, rise), { err: 4, roots: [4, 1] });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // torches along the top of the wall
      if (rise > 0.9) for (let k = 1; k < 8; k++) {
        const u = k / 8, X = ax + ux * u + nx * 0.3, Z = az + uz * u + nz * 0.3, q = pj(C, X, wh + 0.5, Z); if (!q) continue;
        const fl = 0.8 + 0.2 * Math.sin(tw * 11 + k * 3 + i), s = q[3];
        K.glow(ctx, q[0], q[1], s * 3.2, [255, 150, 70], 0.32 * fl);
        K.glow(ctx, q[0], q[1] + s * 1.6, s * 2.4, [255, 120, 60], 0.12 * fl);
        flame(ctx, q[0], q[1] + s * 0.15, s * 0.55, tw * 1.3 + k + i * 7, 1);
      }
      // banners of the Seven hung over the tiers (the dais side has its own seven)
      if (i !== 2 && rise > 0.98) for (let k = 0; k < 6; k++) {
        const u = (k + 0.5) / 6, hs = HS[(k * 3 + i * 2) % 7], X = ax + ux * u - nx * (back + 0.2), Z = az + uz * u - nz * (back + 0.2);
        hangBanner(ctx, C, X, rh - 0.4, Z, ux / 52, uz / 52, 2.2, 6.5, hs, tw + k * 1.7 + i, L);
      }
    }
    // the corner towers
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) drawTower(ctx, C, sx * (TIER1 + 1), sz * (TIER1 + 1), rise, tw);
    ctx.restore();
  }
  function drawTower(ctx, C, cx, cz, rise, tw) {
    const s = 6, h = 24 * rise, faces = [[[cx - s, cz - s], [cx + s, cz - s]], [[cx + s, cz - s], [cx + s, cz + s]], [[cx + s, cz + s], [cx - s, cz + s]], [[cx - s, cz + s], [cx - s, cz - s]]];
    for (const [a, b] of faces) {
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, nx = mx - cx, nz = mz - cz; if ((C.px - mx) * nx + (C.pz - mz) * nz <= 0) continue;
      const shade = nx * 0.3 + nz * 0.1 > 0 ? '#1a110d' : '#120b08';
      polyFill(ctx, C, [[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h, b[1]], [a[0], h, a[1]]], shade);
      // lit slits
      for (let k = 0; k < 3; k++) { const u = 0.5, y = h * (0.45 + k * 0.17), q = pj(C, lerp(a[0], b[0], u) + nx * 0.02, y, lerp(a[1], b[1], u) + nz * 0.02); if (q && rise > 0.95) { ctx.fillStyle = `rgba(255,${150 + k * 20},80,${0.5 + 0.2 * Math.sin(tw * 2 + k + cx)})`; ctx.fillRect(q[0] - q[3] * 0.18, q[1] - q[3] * 0.6, q[3] * 0.36, q[3] * 1.2); } }
    }
    if (rise > 0.9) { const top = [cx, 24 + 9, cz]; for (const [a, b] of faces) { const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if ((C.px - mx) * (mx - cx) + (C.pz - mz) * (mz - cz) <= -50) continue; polyFill(ctx, C, [[a[0] - (a[0] - cx) * -0.15, 24, a[1] - (a[1] - cz) * -0.15], [b[0] - (b[0] - cx) * -0.15, 24, b[1] - (b[1] - cz) * -0.15], top], '#0e0806'); } }
  }
  // a banner hanging from a bar: vertical strips, rippling
  function hangBanner(ctx, C, x, y, z, ux, uz, w, h, hs, tw, L, o = {}) {
    const cloth = K.bannerCloth(hs, 128, 384, 's6:' + hs.key), mips = K.cached('s6:bm:' + hs.key, () => mipChain(cloth, 3));
    const lt = L ? lightAt(L, x, y - h / 2, z).c : [0.5, 0.4, 0.4], n = o.strips || 4;
    const q = pj(C, x, y - h / 2, z); if (!q) return; if (q[0] < -q[3] * w * 2 || q[0] > W + q[3] * w * 2) return;
    for (let k = 0; k < n; k++) {
      const s0 = k / n, s1 = (k + 1) / n, wv0 = Math.sin(tw * 1.3 + s0 * 4) * 0.12 * (o.wind || 1), wv1 = Math.sin(tw * 1.3 + s1 * 4) * 0.12 * (o.wind || 1);
      const X0 = x + ux * w * (s0 - 0.5), Z0 = z + uz * w * (s0 - 0.5), X1 = x + ux * w * (s1 - 0.5), Z1 = z + uz * w * (s1 - 0.5);
      plane(ctx, C, mips, [X0 - uz * wv0, y, Z0 + ux * wv0], [X1 - X0 - uz * (wv1 - wv0), 0, Z1 - Z0 + ux * (wv1 - wv0)], [0, -h, 0], 128 / n, 384, { err: 6, roots: [1, 1], u0: k * 128 / n });
    }
    // the cloth in the arena's light
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (quadPath(ctx, C, [[x - ux * w / 2, y, z - uz * w / 2], [x + ux * w / 2, y, z + uz * w / 2], [x + ux * w / 2, y - h, z + uz * w / 2], [x - ux * w / 2, y - h, z - uz * w / 2]])) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgbs([clamp(lt[0]) * 255, clamp(lt[1]) * 255, clamp(lt[2]) * 255], 1); ctx.fill(); ctx.restore(); }
  }
  // the dais of the Seven: a platform at the head of the arena, seven high seats, seven great banners, two fires
  function drawDais(ctx, C, t, L) {
    const rise = arenaRise(t); if (rise <= 0.01) return [];
    const tw = worldT(t), x0 = 19.5, top = 3.0 * rise, z0 = -10.5, z1 = 10.5, items = [];
    // seven great banners behind the seats
    for (let i = 0; i < 7; i++) { const z = lerp(-8, 8, i / 6); hangBanner(ctx, C, AW + 0.6, (RIMH + 1.5) * rise, z, 0, -1, 2.0, 9.5 * rise, HS[i], tw * 0.8 + i * 0.9, L, { strips: 3, wind: 0.6 }); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // the platform: its front, with a frieze of gold, and its sides
    polyFill(ctx, C, [[x0, 0, z0], [x0, 0, z1], [x0, top, z1], [x0, top, z0]], '#1b120d');
    const fq = [[x0 - 0.02, top - 0.25, z0], [x0 - 0.02, top - 0.25, z1], [x0 - 0.02, top - 0.12, z1], [x0 - 0.02, top - 0.12, z0]];
    polyFill(ctx, C, fq, '#8a6a2c');
    polyFill(ctx, C, [[x0, top, z0], [AW, top, z0], [AW, top, z1], [x0, top, z1]], '#20160f');
    // steps
    for (let k = 0; k < 3; k++) { const xs = x0 - (k + 1) * 0.45, ys = top * (1 - (k + 1) / 4); polyFill(ctx, C, [[xs, 0, -4], [xs, 0, 4], [xs, ys, 4], [xs, ys, -4]], k % 2 ? '#1d140e' : '#241911'); polyFill(ctx, C, [[xs, ys, -4], [xs + 0.45, ys, -4], [xs + 0.45, ys, 4], [xs, ys, 4]], '#2c2016'); }
    // the seats and their lords (returned as sortable items so they stand among the other figures)
    for (let i = 0; i < 7; i++) {
      const z = lerp(-7.5, 7.5, i / 6), hs = HS[i];
      items.push({ d: toCam(C, 24, top + 1, z)[2], draw: () => drawSeat(ctx, C, 24, top, z, hs, t, L, i) });
    }
    return items;
  }
  function drawSeat(ctx, C, x, y, z, hs, t, L, i) {
    const tw = worldT(t), foot = pj(C, x, y, z), head = pj(C, x, y + 1.95, z); if (!foot || !head) return;
    const hp = Math.hypot(head[0] - foot[0], head[1] - foot[1]); if (hp < 3) return;
    const lt = lightAt(L, x - 2, y + 1.5, z).c, s = hp / 1.95;
    // a high-backed seat
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bx = foot[0], by = foot[1];
    ctx.fillStyle = litHex('#2a1a10', lt); ctx.beginPath(); ctx.moveTo(bx - s * 0.5, by); ctx.lineTo(bx - s * 0.5, by - s * 2.6); ctx.lineTo(bx, by - s * 3.3); ctx.lineTo(bx + s * 0.5, by - s * 2.6); ctx.lineTo(bx + s * 0.5, by); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = litHex('#9a7a34', lt); ctx.lineWidth = Math.max(1, s * 0.05); ctx.stroke();
    ctx.fillStyle = litHex(hs.field, lt); ctx.beginPath(); ctx.moveTo(bx - s * 0.38, by - s * 1.2); ctx.lineTo(bx - s * 0.38, by - s * 2.5); ctx.lineTo(bx, by - s * 3.0); ctx.lineTo(bx + s * 0.38, by - s * 2.5); ctx.lineTo(bx + s * 0.38, by - s * 1.2); ctx.closePath(); ctx.fill();
    ctx.restore();
    // the lord, robed and still
    const heads = ['crown', 'hood', 'crown', 'coif', 'crown', 'hood', 'crown'];
    K.figure(ctx, bx, by, hp, { style: 'painted', kind: 'robe', head: heads[i], hold: i === 4 ? 'scroll' : 'none', face: -1, robe: litHex(mixHex(hs.field, '#1a1210', 0.35), lt), skin: litHex('#c9a07c', lt), hose: '#1a1210', crownGold: true, outline: Math.max(0.8, hp / 170), sheen: 0.5 + 0.2 * Math.sin(tw + i), t: tw });
  }
  // ---------------------------------------------------------------- the board's slab and its step (rising in L31)
  function drawSlab(ctx, C, t, L) {
    const by = boardY(t); if (by < 0.01) return;
    const hb = by * 0.5, E = BE, F = BE + STEP;
    const faces = [];
    // outer step faces, the step's top, then the slab faces
    for (const [s, ax, az, bx, bz, nx, nz] of [[F, -F, F, F, F, 0, 1], [F, F, -F, -F, -F, 0, -1], [F, F, F, F, -F, 1, 0], [F, -F, -F, -F, F, -1, 0]]) faces.push({ pts: [[ax, 0, az], [bx, 0, bz], [bx, hb, bz], [ax, hb, az]], n: [nx, nz], m: [(ax + bx) / 2, (az + bz) / 2], col: '#1a1410', s });
    const lt = lightAt(L, 0, 0.3, 0).c;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const f of faces) if ((C.px - f.m[0]) * f.n[0] + (C.pz - f.m[1]) * f.n[1] > 0) { const l2 = lightAt(L, f.m[0] * 0.9, 0.2, f.m[1] * 0.9).c; polyFill(ctx, C, f.pts, litHex('#4a3c30', l2)); }
    // the step's top (a dark stone frame)
    polyFill(ctx, C, [[-F, hb, -F], [F, hb, -F], [F, hb, F], [-F, hb, F]], litHex('#3a3028', lt));
    for (const [ax, az, bx, bz, nx, nz] of [[-E, E, E, E, 0, 1], [E, -E, -E, -E, 0, -1], [E, E, E, -E, 1, 0], [-E, -E, -E, E, -1, 0]]) {
      const mx = (ax + bx) / 2, mz = (az + bz) / 2; if ((C.px - mx) * nx + (C.pz - mz) * nz <= 0) continue;
      const l2 = lightAt(L, mx * 0.95, 0.3, mz * 0.95).c;
      polyFill(ctx, C, [[ax, hb, az], [bx, hb, bz], [bx, by, bz], [ax, by, az]], litHex('#5a4a3a', l2));
      // a gilded lip along the slab's edge
      const q = [[ax, by - 0.02, az], [bx, by - 0.02, bz], [bx, by - 0.07, bz], [ax, by - 0.07, az]]; polyFill(ctx, C, q, litHex('#c9a14a', l2));
    }
    ctx.restore();
  }
  // ---------------------------------------------------------------- braziers: an iron tripod and a fire
  function drawBrazier(ctx, C, i, t, L) {
    const [bx, bz] = BRAZ[i], rise = arenaRise(t); if (rise <= 0.01) return;
    const tw = worldT(t), top = BRZH * rise, ring = top - 0.35, fr = fire(i, t) * flick(i, tw);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const lt = lightAt(L, bx, 1.5, bz).c;
    // three legs
    ctx.strokeStyle = litHex('#3a3430', [lt[0] * 0.8 + fr * 0.5, lt[1] * 0.8 + fr * 0.3, lt[2] * 0.8 + fr * 0.15]); ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + 0.4, fx = bx + Math.cos(a) * 0.75, fz = bz + Math.sin(a) * 0.75, rx = bx + Math.cos(a) * 0.32, rz = bz + Math.sin(a) * 0.32; const p0 = pj(C, fx, 0, fz), p1 = pj(C, rx, ring, rz); if (!p0 || !p1) continue; ctx.lineWidth = Math.max(1, p1[3] * 0.07); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(lerp(p0[0], p1[0], 0.5), lerp(p0[1], p1[1], 0.6), p1[0], p1[1]); ctx.stroke(); }
    // the bowl
    const pts = []; for (let k = 0; k <= 24; k++) { const a = k / 24 * TAU, q = pj(C, bx + Math.cos(a) * 0.62, top, bz + Math.sin(a) * 0.62); if (q) pts.push(q); }
    const bot = []; for (let k = 0; k <= 24; k++) { const a = k / 24 * TAU, q = pj(C, bx + Math.cos(a) * 0.32, ring, bz + Math.sin(a) * 0.32); if (q) bot.push(q); }
    if (pts.length > 20 && bot.length > 20) {
      ctx.fillStyle = litHex('#2a221c', [lt[0] + fr * 0.4, lt[1] + fr * 0.25, lt[2] + fr * 0.1]);
      ctx.beginPath(); pts.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); for (let k = bot.length - 1; k >= 0; k--) ctx.lineTo(bot[k][0], bot[k][1]); ctx.closePath(); ctx.fill();
      ctx.fillStyle = fr > 0 ? `rgba(255,${140 + fr * 60},70,${0.9 * clamp(fr)})` : '#1a1410';
      ctx.beginPath(); pts.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    if (fr > 0) { const q = pj(C, bx, top, bz); if (q) { flame(ctx, q[0], q[1], q[3] * 1.25 * clamp(fr, 0, 1.3), tw * 1.1 + i * 13, fr); K.glow(ctx, q[0], q[1] - q[3] * 0.5, q[3] * 4.5, [255, 140, 60], 0.38 * clamp(fr)); K.glow(ctx, q[0], q[1] - q[3] * 0.4, q[3] * 1.4, [255, 220, 150], 0.4 * clamp(fr)); } }
  }
  // a fire: tongues of flame swaying on the noise, bright at the root (additive). s = metres to pixels
  function flame(ctx, x, y, s, tw, amt = 1) {
    if (s < 0.4 || amt <= 0) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
    const n = s > 30 ? 9 : 6;
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n - 0.5, ph = tw * (2.2 + k * 0.37) + k * 1.7, hgt = s * (0.7 + 0.55 * K.noise(tw * 1.8 + k * 3.1, k, 61)) * (1 - Math.abs(u) * 0.9) * clamp(amt, 0, 1.4);
      const bx = x + u * s * 0.9, lean = (K.noise(tw * 1.1 + k, 2 + k, 63) - 0.5) * s * 0.5, tipx = bx + lean, tipy = y - hgt, wdt = s * (0.2 + 0.08 * Math.sin(ph));
      const g = ctx.createLinearGradient(0, y, 0, tipy); g.addColorStop(0, 'rgba(255,236,180,0.55)'); g.addColorStop(0.3, 'rgba(255,170,70,0.42)'); g.addColorStop(0.7, 'rgba(220,80,30,0.2)'); g.addColorStop(1, 'rgba(160,40,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx - wdt, y); ctx.bezierCurveTo(bx - wdt, y - hgt * 0.4, tipx - wdt * 0.3, tipy + hgt * 0.3, tipx, tipy); ctx.bezierCurveTo(tipx + wdt * 0.3, tipy + hgt * 0.3, bx + wdt, y - hgt * 0.4, bx + wdt, y); ctx.closePath(); ctx.fill();
    }
    const g = ctx.createRadialGradient(x, y - s * 0.15, 0, x, y - s * 0.15, s * 0.5); g.addColorStop(0, 'rgba(255,248,220,0.7)'); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - s * 0.15, s * 0.55, s * 0.35, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }


  // ---------------------------------------------------------------- the sky (a red sky over the field; a dusk over the arena)
  function drawSky(ctx, C, t) {
    const bf = battle(t), T = TT(), tw = worldT(t);
    // the horizon line at the centre of the frame, and the camera's heading
    const yaw = Math.atan2(C.fx, C.fz), pitch = Math.asin(clamp(C.fy, -1, 1));
    const hy = C.cy + Math.tan(pitch) * C.f;           // where a level line of sight meets the frame (no roll)
    const g = ctx.createLinearGradient(0, hy - 1400, 0, hy + 40);
    const k = bf;
    g.addColorStop(0, toHex(lerp(10, 40, k), lerp(4, 6, k), lerp(8, 10, k)));
    g.addColorStop(0.35, toHex(lerp(24, 92, k), lerp(8, 16, k), lerp(12, 14, k)));
    g.addColorStop(0.7, toHex(lerp(60, 170, k), lerp(16, 42, k), lerp(16, 24, k)));
    g.addColorStop(0.93, toHex(lerp(120, 236, k), lerp(40, 104, k), lerp(30, 58, k)));
    g.addColorStop(1, toHex(lerp(130, 246, k), lerp(52, 150, k), lerp(40, 90, k)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // the low sun, behind haze, sinking as the arena rises
    const sunAz = 0.35, sunEl = lerp(-0.012, 0.03, k), sd = [Math.sin(sunAz) * Math.cos(sunEl), Math.sin(sunEl), Math.cos(sunAz) * Math.cos(sunEl)];
    const sv = [sd[0] * C.rx + sd[1] * C.ry + sd[2] * C.rz, sd[0] * C.ux + sd[1] * C.uy + sd[2] * C.uz, sd[0] * C.fx + sd[1] * C.fy + sd[2] * C.fz];
    if (sv[2] > 0.05) { const sx = C.cx + C.f * sv[0] / sv[2], sy = C.cy - C.f * sv[1] / sv[2]; K.glow(ctx, sx, sy, 900, [255, 140, 70], 0.35 * (0.3 + 0.7 * k)); K.glow(ctx, sx, sy, 260, [255, 210, 150], 0.45 * k); if (k > 0.02) { ctx.save(); ctx.globalAlpha = k * 0.9; ctx.fillStyle = '#ffe2b0'; ctx.beginPath(); ctx.arc(sx, sy, C.f * 0.009, 0, TAU); ctx.fill(); ctx.restore(); } }
    // painted cloud, mapped by azimuth
    const cl = cloudTex(), pxr = C.f, cw = cl.width;
    let x0 = C.cx - (yaw + Math.PI) / TAU * cw * 2.2 * (pxr / 1400); void x0;
    const span2 = TAU * pxr * 0.9;                  // the band's width in screen pixels for a full turn
    const off = ((-(yaw / TAU) * span2 + tw * 3) % span2 + span2) % span2;
    ctx.save(); ctx.globalAlpha = 0.85 - 0.25 * (1 - k);
    for (let q = -1; q <= 1; q++) ctx.drawImage(cl, off + q * span2 - span2 * 0.5 + C.cx * 0, hy - 760 * (pxr / 1400), span2, 760 * (pxr / 1400) + 40);
    ctx.restore();
    // the far horizon of the field (gone once the arena stands)
    if (k > 0.01) { const fr = farTex(), off2 = ((-(yaw / TAU) * span2) % span2 + span2) % span2; ctx.save(); ctx.globalAlpha = k; for (let q = -1; q <= 1; q++) ctx.drawImage(fr, off2 + q * span2 - span2 * 0.5, hy - 300 * (pxr / 1400) + 6, span2, 360 * (pxr / 1400)); ctx.restore(); }
    void T;
    return hy;
  }
  // ---------------------------------------------------------------- the field before the board: the fallen, spears, banners, crows
  let FIELD = null;
  function field() {
    if (FIELD) return FIELD;
    const r = rng(7707), F = { bodies: [], spears: [], flags: [], crows: [], puddles: [], stains: [] };
    const inBoard = (x, z) => Math.abs(x) < BE && Math.abs(z) < BE;
    for (let i = 0; i < 70; i++) {
      // the dead lie thickest across the board-to-be and toward the camera's path
      const x = (r() - 0.5) * 44, z = -24 + r() * 40, a = r() * TAU;
      F.bodies.push({ x, z, a, len: 1.7 + r() * 0.2, kind: r() < 0.6 ? 'armour' : r() < 0.5 ? 'tunic' : 'cloak', head: ['helm', 'kettle', 'bare', 'hood', 'coif'][Math.floor(r() * 5)], shield: r() < 0.35 ? HS[Math.floor(r() * 7)] : null, col: ['#4a3a30', '#3a3230', '#5a4636', '#33302c'][Math.floor(r() * 4)], seed: Math.floor(r() * 1e5), board: inBoard(x, z) });
    }
    for (let i = 0; i < 46; i++) { const x = (r() - 0.5) * 48, z = -26 + r() * 46, len = 1.2 + r() * 2.4; F.spears.push({ x, z, len, tilt: 0.15 + r() * 0.75, az: r() * TAU, broken: r() < 0.55, pennant: r() < 0.18 ? HS[Math.floor(r() * 7)] : null, seed: i }); }
    for (let i = 0; i < 9; i++) { const x = (r() - 0.5) * 30, z = -20 + r() * 32; F.flags.push({ x, z, a: r() * TAU, hs: HS[Math.floor(r() * 7)], w: 1.6 + r() * 0.6, h: 2.2 + r() * 0.8, pole: r() < 0.4, tilt: 0.3 + r() * 0.5, seed: i }); }
    for (let i = 0; i < 14; i++) { const b = F.bodies[Math.floor(r() * F.bodies.length)]; F.crows.push({ x: b.x + (r() - 0.5) * 1.2, z: b.z + (r() - 0.5) * 1.2, a: r() * TAU, seed: i, lift: 0.4 + r() * 0.5 }); }
    for (let i = 0; i < 26; i++) F.puddles.push({ x: (r() - 0.5) * 60, z: -30 + r() * 56, rx: 0.6 + r() * 2.4, rz: 0.4 + r() * 1.4, a: r() * TAU });
    for (let i = 0; i < 40; i++) F.stains.push({ x: (r() - 0.5) * 44, z: -24 + r() * 40, r: 0.5 + r() * 1.6, a: r() * TAU, seed: i });
    return (FIELD = F);
  }
  // how far a square (or a point on the board) has turned to stone: 0 mud .. 1 stone
  function stoneAt(x, z, t) {
    const T = TT(); if (Math.abs(x) > BE || Math.abs(z) > BE) return 0;
    const d = Math.max(Math.abs(x), Math.abs(z)) / BE, j = K.hash(Math.floor((x + BE) / SQ), Math.floor((z + BE) / SQ), 17) * 0.12;
    return smooth(span(t, lerp(T.fill0, T.fill1 - 0.7, d * 0.85 + j), lerp(T.fill0, T.fill1 - 0.7, d * 0.85 + j) + 0.7));
  }
  // the ground beneath the field's things: puddles holding the red sky, dark stains
  function drawFieldDecals(ctx, C, t) {
    const bf = battle(t); if (bf <= 0.01) return;
    const F = field();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const s of F.stains) {
      const sk = 1 - stoneAt(s.x, s.z, t); if (sk <= 0) continue;
      const e = floorEllipse(C, s.x, 0, s.z, s.r); if (!e) continue;
      ctx.globalAlpha = 0.5 * bf * sk; ctx.fillStyle = '#1e0d08'; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'screen';
    for (const p of F.puddles) {
      const sk = 1 - stoneAt(p.x, p.z, t); if (sk <= 0) continue;
      const e = floorEllipse(C, p.x, 0, p.z, p.rx, p.rz / p.rx); if (!e) continue;
      const g = ctx.createRadialGradient(e.x, e.y - e.ry * 0.3, 0, e.x, e.y, e.rx);
      g.addColorStop(0, `rgba(250,120,60,${0.55 * bf * sk})`); g.addColorStop(0.7, `rgba(200,70,40,${0.35 * bf * sk})`); g.addColorStop(1, 'rgba(120,30,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // a circle on the floor as a screen ellipse (centre, radii); asp squashes it along z
  function floorEllipse(C, x, y, z, r, asp = 1) {
    const c = pj(C, x, y, z); if (!c) return null;
    const a = pj(C, x + C.rx * r, y, z + C.rz * r), hx = C.fx, hz = C.fz, hl = Math.hypot(hx, hz) || 1, b = pj(C, x + hx / hl * r * asp, y, z + hz / hl * r * asp);
    if (!a || !b) return null;
    return { x: c[0], y: c[1], rx: Math.max(0.5, Math.hypot(a[0] - c[0], a[1] - c[1])), ry: Math.max(0.3, Math.abs(b[1] - c[1])), s: c[3], d: c[2] };
  }
  // the field's things as sortable items
  function fieldItems(ctx, C, t, L) {
    const bf = battle(t), T = TT(); if (bf <= 0.01) return [];
    const F = field(), items = [], tw = worldT(t);
    for (const b of F.bodies) {
      const st = b.board ? stoneAt(b.x, b.z, t) : smooth(span(t, T.fill0 + 0.8, T.rise1 - 0.4)) * 0.999;
      if (st >= 1) continue;
      const v = toCam(C, b.x, 0.2, b.z); if (v[2] < NEAR) continue;
      items.push({ d: v[2], draw: () => drawBody(ctx, C, b, st, L, tw) });
    }
    for (const s of F.spears) {
      const st = Math.abs(s.x) < BE && Math.abs(s.z) < BE ? stoneAt(s.x, s.z, t) : smooth(span(t, T.fill0 + 0.6, T.rise1 - 0.6));
      if (st >= 1) continue;
      const v = toCam(C, s.x, 1, s.z); if (v[2] < NEAR) continue;
      items.push({ d: v[2], draw: () => drawSpear(ctx, C, s, st, L, tw) });
    }
    for (const f of F.flags) {
      const st = Math.abs(f.x) < BE && Math.abs(f.z) < BE ? stoneAt(f.x, f.z, t) : smooth(span(t, T.fill0 + 0.7, T.rise1 - 0.5));
      if (st >= 1) continue;
      const v = toCam(C, f.x, 0.5, f.z); if (v[2] < NEAR) continue;
      items.push({ d: v[2] + 0.5, draw: () => drawFlag(ctx, C, f, st, L, tw) });
    }
    for (const c of F.crows) {
      const up = smooth(span(t, T.ink0 + c.lift * 0.5, T.ink0 + c.lift * 0.5 + 1.2));
      if (up >= 1) continue;
      const v = toCam(C, c.x, 0.3, c.z); if (v[2] < NEAR) continue;
      items.push({ d: v[2] - 0.1, draw: () => drawGroundCrow(ctx, C, c, t, up, tw) });
    }
    return items;
  }
  function drawBody(ctx, C, b, st, L, tw) {
    const ca = Math.cos(b.a), sa = Math.sin(b.a), sink = st * 0.35;
    const foot = pj(C, b.x - sa * b.len * 0.5, 0.12 - sink, b.z - ca * b.len * 0.5), head = pj(C, b.x + sa * b.len * 0.5, 0.12 - sink, b.z + ca * b.len * 0.5); if (!foot || !head) return;
    const mid = pj(C, b.x, 0.12, b.z); if (!mid) return;
    const len = Math.hypot(head[0] - foot[0], head[1] - foot[1]), s = mid[3];
    if (s * b.len < 6) return;
    const lt = lightAt(L, b.x, 0.3, b.z).c, ink = 1 - st;
    // the body lies along foot -> head; its thickness rises toward the camera
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = clamp(ink * 1.3);
    // a dark pool under it
    ctx.fillStyle = 'rgba(16,6,4,0.55)'; ctx.beginPath(); ctx.ellipse(mid[0], mid[1], Math.max(len * 0.6, s * 0.5), s * 0.25, Math.atan2(head[1] - foot[1], head[0] - foot[0]) * 0.3, 0, TAU); ctx.fill();
    const ang = Math.atan2(head[1] - foot[1], head[0] - foot[0]);
    ctx.translate(foot[0], foot[1]); ctx.rotate(ang + Math.PI / 2);
    // figure units: feet at 0, crown at -1; scale along the body by len, across by the depth scale (flattened as it sinks)
    const across = s * b.len * (0.75 - st * 0.5), side = Math.cos(b.a * 3) > 0 ? 1 : -1;
    ctx.scale(across / len * side, -1);
    const col = litHex(mixHex(b.col, '#0c0806', st), lt);
    K.figure(ctx, 0, 0, len, { style: 'painted', kind: b.kind, head: b.head, hold: 'none', face: 1, arm: 1.4, bend: 0.4, farArm: -0.6, robe: col, hose: litHex('#2a2420', lt), skin: litHex(mixHex('#9a8270', '#0c0806', st), lt), outline: 1.2 });
    ctx.restore();
    if (b.shield && st < 0.6) { const q = pj(C, b.x + ca * 0.45, 0.1, b.z - sa * 0.45); if (q) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = (1 - st / 0.6) * 0.9; ctx.translate(q[0], q[1]); ctx.scale(1, 0.4); K.shield(ctx, 0, 0, q[3] * 0.32, { field: litHex(b.shield.field, lt), charge: litHex(b.shield.charge, lt), device: b.shield.device }, { shape: 'kite' }); ctx.restore(); } }
    void tw;
  }
  function drawSpear(ctx, C, s, st, L, tw) {
    const dx = Math.sin(s.tilt) * Math.cos(s.az), dz = Math.sin(s.tilt) * Math.sin(s.az), dy = Math.cos(s.tilt);
    const L0 = s.len * st * 1.05, L1 = s.len;                          // sinking: the part below the ground grows
    const a = pj(C, s.x + dx * L0, dy * L0 - s.len * st * 0.0, s.z + dz * L0), b = pj(C, s.x + dx * L1, dy * L1, s.z + dz * L1); if (!a || !b) return;
    const lt = lightAt(L, s.x, 1, s.z).c;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - st * 0.6;
    ctx.strokeStyle = litHex('#3a2a1c', lt); ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, a[3] * 0.045);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hl = b[3] * 0.3;
    if (s.broken) { ctx.strokeStyle = litHex('#6a5038', lt); ctx.lineWidth = Math.max(0.8, b[3] * 0.03); for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] + Math.cos(ang + k * 0.4) * hl * 0.3, b[1] + Math.sin(ang + k * 0.4) * hl * 0.3); ctx.stroke(); } }
    else { ctx.fillStyle = litHex('#6a6a6a', lt); ctx.beginPath(); ctx.moveTo(b[0] + Math.cos(ang) * hl, b[1] + Math.sin(ang) * hl); ctx.lineTo(b[0] + Math.cos(ang + 1.6) * hl * 0.16, b[1] + Math.sin(ang + 1.6) * hl * 0.16); ctx.lineTo(b[0] + Math.cos(ang - 1.6) * hl * 0.16, b[1] + Math.sin(ang - 1.6) * hl * 0.16); ctx.closePath(); ctx.fill(); }
    if (s.pennant) { const wv = Math.sin(tw * 4 + s.seed) * 0.3; ctx.fillStyle = litHex(s.pennant.field, lt); ctx.beginPath(); const px = lerp(a[0], b[0], 0.85), py = lerp(a[1], b[1], 0.85); ctx.moveTo(px, py); ctx.lineTo(px + b[3] * 0.6, py + b[3] * (0.1 + wv * 0.2)); ctx.lineTo(px, py + b[3] * 0.25); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function drawFlag(ctx, C, f, st, L, tw) {
    const lt = lightAt(L, f.x, 0.5, f.z).c, ca = Math.cos(f.a), sa = Math.sin(f.a);
    const cloth = K.bannerCloth(f.hs, 128, 384, 's6:' + f.hs.key), mips = K.cached('s6:bm:' + f.hs.key, () => mipChain(cloth, 3));
    ctx.save();
    ctx.globalAlpha = 1 - st;
    if (!f.pole) {
      // trampled flat into the mud
      plane(ctx, C, mips, [f.x - ca * f.w / 2, 0.03, f.z + sa * f.w / 2], [ca * f.w, 0, -sa * f.w], [sa * f.h, 0, ca * f.h], 128, 384, { err: 4 });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (quadPath(ctx, C, [[f.x - ca * f.w / 2, 0.03, f.z + sa * f.w / 2], [f.x + ca * f.w / 2, 0.03, f.z - sa * f.w / 2], [f.x + ca * f.w / 2 + sa * f.h, 0.03, f.z - sa * f.w / 2 + ca * f.h], [f.x - ca * f.w / 2 + sa * f.h, 0.03, f.z + sa * f.w / 2 + ca * f.h]])) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgbs([clamp(lt[0] * 0.8) * 255, clamp(lt[1] * 0.7) * 255, clamp(lt[2] * 0.7) * 255], 1); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(40,24,14,0.35)'; ctx.fill(); }
    } else {
      // a standard on a leaning, broken pole
      const top = [f.x + Math.sin(f.tilt) * ca * 3.2, Math.cos(f.tilt) * 3.2, f.z + Math.sin(f.tilt) * sa * 3.2];
      const a = pj(C, f.x, 0, f.z), b = pj(C, top[0], top[1], top[2]);
      if (a && b) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.strokeStyle = litHex('#2a1d12', lt); ctx.lineWidth = Math.max(1, b[3] * 0.06); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      hangBanner(ctx, C, top[0] + C.rx * 0.6, top[1], top[2] + C.rz * 0.6, C.rx, C.rz, 1.1, 1.8, f.hs, tw * 1.4 + f.seed, L, { strips: 3, wind: 1.6 });
    }
    ctx.restore();
  }
  function crowShape(ctx, x, y, s, flap, face, peck) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s);
    ctx.fillStyle = '#0a0706';
    ctx.beginPath(); ctx.ellipse(0, -0.35, 0.42, 0.22, -0.15 + peck * 0.5, 0, TAU); ctx.fill();               // body
    ctx.beginPath(); ctx.ellipse(0.38 + peck * 0.05, -0.52 + peck * 0.3, 0.14, 0.13, 0, 0, TAU); ctx.fill();    // head
    ctx.beginPath(); ctx.moveTo(0.5, -0.55 + peck * 0.3); ctx.lineTo(0.72, -0.5 + peck * 0.4); ctx.lineTo(0.5, -0.47 + peck * 0.3); ctx.fill(); // beak
    ctx.beginPath(); ctx.moveTo(-0.38, -0.36); ctx.lineTo(-0.72, -0.26); ctx.lineTo(-0.66, -0.4); ctx.closePath(); ctx.fill();                  // tail
    if (flap != null) { const a = Math.sin(flap) * 0.9; ctx.beginPath(); ctx.moveTo(-0.1, -0.42); ctx.quadraticCurveTo(-0.3, -0.42 - 0.6 * a - 0.2, -0.75, -0.5 - 0.9 * a); ctx.quadraticCurveTo(-0.2, -0.5, 0.2, -0.38); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = '#0a0706'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(0.02, -0.18); ctx.lineTo(0.0, 0); ctx.moveTo(0.12, -0.18); ctx.lineTo(0.14, 0); ctx.stroke();
    ctx.restore();
  }
  function drawGroundCrow(ctx, C, c, t, up, tw) {
    const y = up > 0 ? easeIn(up) * 6 : 0, x = c.x + up * 3 * Math.cos(c.a), z = c.z + up * 3 * Math.sin(c.a);
    const q = pj(C, x, y, z); if (!q) return;
    const s = q[3] * 0.42; if (s < 1.5) return;
    const peck = up > 0 ? 0 : Math.max(0, Math.sin(tw * 3 + c.seed * 2)) ** 6;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - smooth(span(up, 0.7, 1));
    crowShape(ctx, q[0], q[1], s, up > 0 ? tw * 18 + c.seed : null, Math.cos(c.a) * C.rx + Math.sin(c.a) * C.rz > 0 ? 1 : -1, peck);
    ctx.restore();
  }
  // crows circling high over the field (and, thinned, over the arena)
  function drawSkyCrows(ctx, C, t) {
    const tw = worldT(t), bf = battle(t), n = Math.round(6 + 14 * bf), T = TT();
    const startle = smooth(span(t, T.ink0, T.ink0 + 2.5));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < n; i++) {
      const r = 8 + K.hash(i, 1, 81) * 22, h = 9 + K.hash(i, 2, 81) * 18 + startle * 6 * K.hash(i, 5, 81), sp = (0.12 + K.hash(i, 3, 81) * 0.1) * (1 + startle), a = tw * sp + K.hash(i, 4, 81) * TAU;
      const cx = (K.hash(i, 6, 81) - 0.5) * 30, cz = (K.hash(i, 7, 81) - 0.5) * 30;
      const q = pj(C, cx + Math.cos(a) * r, h, cz + Math.sin(a) * r); if (!q) continue;
      const s = q[3] * 0.5; if (s < 1) continue;
      const dirx = -Math.sin(a), dirz = Math.cos(a), face = dirx * C.rx + dirz * C.rz > 0 ? 1 : -1;
      ctx.globalAlpha = 0.85;
      crowShape(ctx, q[0], q[1], s, tw * 9 + i * 1.3, face, 0);
    }
    ctx.restore();
  }


  // ---------------------------------------------------------------- the board itself, square by square while the ink lays it
  function drawBoardTop(ctx, C, t, Li, L) {
    const T = TT(), by = boardY(t), O = [-BE, by, -BE], U = [2 * BE, 0, 0], V = [0, 0, 2 * BE];
    if (t < T.fill0) return;
    if (t >= T.fill1 + 0.05) plane(ctx, C, boardMips(), O, U, V, BT.n, BT.n, { roots: [18, 18], err: 3 });
    else {
      const n = 18, bAlpha = smooth(span(t, T.fill1 - 0.9, T.fill1));
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x0 = -BE + i * 1.25, z0 = -BE + j * 1.25, border = i === 0 || j === 0 || i === n - 1 || j === n - 1;
        const a = border ? bAlpha : stoneAt(x0 + 0.62, z0 + 0.62, t); if (a <= 0.003) continue;
        ctx.globalAlpha = a;
        plane(ctx, C, boardMips(), O, U, V, BT.n, BT.n, { roots: [1, 1], s0: i / n, s1: (i + 1) / n, t0: j / n, t1: (j + 1) / n, err: 3 });
      }
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // the light over the board
    ctx.save(); if (quadPath(ctx, C, [[-BE, by, -BE], [BE, by, -BE], [BE, by, BE], [-BE, by, BE]])) { ctx.clip(); ctx.globalCompositeOperation = 'multiply'; ctx.imageSmoothingQuality = 'low'; ctx.drawImage(Li, 0, 0, W, H); } ctx.restore();
    // ink washing through each square as it turns to stone
    if (t < T.fill1 + 0.3) {
      ctx.save();
      for (let fi = 0; fi < 8; fi++) for (let ri = 0; ri < 8; ri++) {
        const x0 = sqX(fi) - SQ / 2, z0 = sqZ(ri) - SQ / 2, p = stoneAt(x0 + SQ / 2, z0 + SQ / 2, t), a = Math.sin(clamp(p) * Math.PI) * 0.7; if (a <= 0.01) continue;
        if (quadPath(ctx, C, [[x0, by + 0.005, z0], [x0 + SQ, by + 0.005, z0], [x0 + SQ, by + 0.005, z0 + SQ], [x0, by + 0.005, z0 + SQ]])) { ctx.fillStyle = `rgba(18,10,6,${a})`; ctx.fill(); }
      }
      ctx.restore();
    }
    void L;
  }
  // a strip on the floor of a given width (world), between two points, as a screen polygon
  function stripPath(ctx, C, x0, y0, z0, x1, y1, z1, w0, w1) {
    const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    return quadPath(ctx, C, [[x0 + nx * w0 / 2, y0, z0 + nz * w0 / 2], [x1 + nx * w1 / 2, y1, z1 + nz * w1 / 2], [x1 - nx * w1 / 2, y1, z1 - nz * w1 / 2], [x0 - nx * w0 / 2, y0, z0 - nz * w0 / 2]]);
  }
  // L31: ink lines run across the field, the board's lines drawing themselves outward from its heart
  function inkLines() {
    return K.cached('s6:inklines', () => {
      const T = TT(), out = [];
      for (let i = 0; i <= 8; i++) {
        const c = -HB + i * SQ, d = Math.abs(i - 4) / 4, st = T.ink0 + d * 0.75;
        out.push([c, 0, c, -HB, st, 1.05], [c, 0, c, HB, st, 1.05], [0, c, -HB, c, st + 0.1, 1.05], [0, c, HB, c, st + 0.1, 1.05]);
      }
      const b0 = T.ink0 + 1.4;
      for (const e of [BE - 0.06, HB + 0.18]) { out.push([-e, -e, e, -e, b0, 0.9], [e, -e, e, e, b0 + 0.2, 0.9], [e, e, -e, e, b0 + 0.4, 0.9], [-e, e, -e, -e, b0 + 0.6, 0.9]); }
      return out;
    });
  }
  function drawInkLines(ctx, C, t) {
    const T = TT(); if (t < T.ink0) return;
    const fade = 1 - smooth(span(t, T.fill1 + 0.2, T.fill1 + 1.6)); if (fade <= 0) return;
    const y = boardY(t) + 0.012;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const tips = [];
    for (const [x0, z0, x1, z1, st, du] of inkLines()) {
      const u = easeOut(clamp((t - st) / du)); if (u <= 0) continue;
      const xe = lerp(x0, x1, u), ze = lerp(z0, z1, u);
      if (stripPath(ctx, C, x0, y, z0, xe, y, ze, 0.32, 0.22)) { ctx.fillStyle = `rgba(14,8,4,${0.22 * fade})`; ctx.fill(); }
      if (stripPath(ctx, C, x0, y, z0, xe, y, ze, 0.075, 0.05)) { ctx.fillStyle = `rgba(10,6,3,${0.92 * fade})`; ctx.fill(); }
      if (u < 1) tips.push([xe, ze, 1 - u]);
    }
    for (const [x, z, k] of tips) { const q = pj(C, x, y + 0.05, z); if (!q) continue; K.glow(ctx, q[0], q[1], q[3] * 1.4, [255, 190, 100], 0.6 * Math.min(1, k * 3) * fade); ctx.fillStyle = `rgba(255,236,190,${0.9 * fade})`; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1, q[3] * 0.06), 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  // ---------------------------------------------------------------- L34: the law of blood runs from the dais to the champions
  function bloodPaths() {
    return K.cached('s6:blood', () => {
      const T = TT(), r = rng(9191), out = [], spd = 13;
      const trunk = K.resample(K.bez([[19.2, 0], [16, 0.5], [14, -3.5], [11.6, -5.2]], 20), 0.35);
      const tl = K.polyLen(trunk), t0 = T.blood0, tTrunk = t0 + tl / spd;
      out.push({ pts: trunk, t0, t1: tTrunk, w: 0.16 });
      for (const id of ['AR7', 'AN6', 'AB5', 'AK4', 'AB2', 'AN1', 'AR0']) {
        const f = +id.slice(2), tx = sqX(f), tz = sqZ(0), sx = 11.6, sz = -5.2, bow = (r() - 0.5) * 2.5;
        const pts = K.wobble(K.resample(K.bez([[sx, sz], [lerp(sx, tx, 0.35), sz - 2.6 + bow], [lerp(sx, tx, 0.7), tz + 2.2 - bow * 0.5], [tx, tz]], 24), 0.3), 0.12, 0.3, 30 + f);
        const L = K.polyLen(pts), s = tTrunk + r() * 0.15, e = s + L / spd;
        out.push({ pts, t0: s, t1: e, w: 0.1, id });
      }
      return out;
    });
  }
  function setBlooms() { const P = pieces(); for (const b of bloodPaths()) if (b.id) { const p = P.find(q => q.id === b.id); if (p) p.bloom = b.t1; } }
  function drawBlood(ctx, C, t) {
    const T = TT(); if (t < T.blood0) return;
    const fade = 1 - smooth(span(t, T.b35 - 1.5, T.b35 + 0.5)); if (fade <= 0) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const b of bloodPaths()) {
      const u = clamp((t - b.t0) / (b.t1 - b.t0)); if (u <= 0) continue;
      const n = Math.max(2, Math.ceil(b.pts.length * u)), pts = b.pts.slice(0, n);
      const proj = pts.map(([x, z]) => pj(C, x, floorAt(x, z, t) + 0.015, z));
      for (const [wm, col, a, mode] of [[3.2, [140, 20, 12], 0.18, 'lighter'], [1.0, [70, 4, 4], 0.95, 'source-over'], [0.38, [220, 60, 30], 0.9, 'lighter']]) {
        ctx.globalCompositeOperation = mode; ctx.strokeStyle = rgbs(col, a * fade);
        for (let k = 0; k + 1 < proj.length; k += 3) {
          const seg = proj.slice(k, k + 4).filter(Boolean); if (seg.length < 2) continue;
          ctx.lineWidth = Math.max(0.8, seg[0][3] * b.w * wm); ctx.beginPath(); ctx.moveTo(seg[0][0], seg[0][1]); for (const q of seg.slice(1)) ctx.lineTo(q[0], q[1]); ctx.stroke();
        }
      }
      if (u < 1) { const q = proj[proj.length - 1]; if (q) K.glow(ctx, q[0], q[1], q[3] * 0.8, [255, 80, 40], 0.7 * fade); }
    }
    ctx.restore();
  }
  // ---------------------------------------------------------------- L37: the price: a chain to a pawn, a coin on the stone
  function chainPts(b, pawn, t) {
    const by = boardY(t), x0 = sqX(b.f), z0 = sqZ(7) - 0.35, pw = where(pawn, t), x1 = pw.x + 0.18, z1 = pw.z + 0.25, side = (b.f % 2 ? 1 : -1) * 0.35, out = [];
    for (let k = 0; k <= 24; k++) { const u = k / 24; out.push([lerp(x0, x1, u) + Math.sin(u * Math.PI) * side, by + 0.03, lerp(z0, z1, u)]); }
    // up to the wrist
    for (let k = 1; k <= 6; k++) { const u = k / 6; out.push([x1 + 0.06 * u, by + 0.03 + u * pawn.h * 0.47, z1 - 0.1 * u]); }
    return out;
  }
  function drawChains(ctx, C, t, L) {
    const P = pieces(); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const b of P) {
      if (!b.chain || t < b.chain.t0 || b.defeated && t >= TT().form) continue;
      const pawn = P.find(q => q.id === b.chain.pawn), u = easeOut(clamp((t - b.chain.t0) / (b.chain.t1 - b.chain.t0)));
      const pts = chainPts(b, pawn, t);
      // walk along the path laying links every 0.12 m
      let acc = 0, total = 0; for (let k = 1; k < pts.length; k++) total += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1], pts[k][2] - pts[k - 1][2]);
      const end = total * u, lt = lightAt(L, sqX(b.f), 0.5, sqZ(6.5)).c, col = litHex('#7d7f84', [lt[0] + 0.15, lt[1] + 0.15, lt[2] + 0.2]), hi = litHex('#d8dce4', [lt[0] + 0.3, lt[1] + 0.3, lt[2] + 0.3]);
      let li = 0;
      for (let k = 1; k < pts.length && acc < end; k++) {
        const A = pts[k - 1], B = pts[k], d = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
        for (let s = (li * 0.12) - acc; s < d && acc + s < end; s += 0.12, li++) {
          const f = s / d, X = lerp(A[0], B[0], f), Y = lerp(A[1], B[1], f), Z = lerp(A[2], B[2], f), q = pj(C, X, Y, Z); if (!q) continue;
          const r0 = q[3] * 0.06, flat = li % 2 === 0, ang = Math.atan2(B[2] - A[2], B[0] - A[0]) * 0 + (flat ? 0.3 : 1.2);
          ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.7, q[3] * 0.018); ctx.beginPath(); ctx.ellipse(q[0], q[1], Math.max(0.8, r0), Math.max(0.5, r0 * (flat ? 0.45 : 0.18)), ang, 0, TAU); ctx.stroke();
          ctx.strokeStyle = hi; ctx.lineWidth = Math.max(0.4, q[3] * 0.006); ctx.beginPath(); ctx.ellipse(q[0], q[1] - r0 * 0.1, Math.max(0.6, r0 * 0.8), Math.max(0.3, r0 * (flat ? 0.3 : 0.1)), ang, Math.PI * 1.1, Math.PI * 1.8); ctx.stroke();
        }
        acc += d;
      }
      if (u >= 1) { const end2 = pts[pts.length - 1], q = pj(C, end2[0], end2[1], end2[2]); if (q) { const fl = win(t, b.chain.t1 - 0.05, b.chain.t1 + 0.5, 0.05, 0.4); if (fl > 0) star(ctx, q[0], q[1], q[3] * 0.5 * fl, fl * 0.8); ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, q[3] * 0.03); ctx.beginPath(); ctx.ellipse(q[0], q[1], q[3] * 0.06, q[3] * 0.035, 0, 0, TAU); ctx.stroke(); } }
    }
    ctx.restore();
  }
  // a coin: falls, rings on the stone, spins down, lies
  function drawCoin(ctx, C, x, z, t0, t, L) {
    if (t < t0) return; const u = t - t0, by = boardY(t);
    let y, spin;
    if (u < 0.38) { y = 1.4 * (1 - (u / 0.38) ** 2); spin = u * 18; } else if (u < 0.62) { const v = (u - 0.38) / 0.24; y = 0.14 * Math.sin(v * Math.PI); spin = 7 + v * 6; } else { y = 0; spin = 10 + (1 - Math.exp(-(u - 0.62) * 3)) * 9; }
    const flat = u > 1.6 ? 1 : clamp(Math.abs(Math.sin(spin)) * (1 - clamp((u - 0.62) / 1)) + clamp((u - 0.62) / 1), 0.12, 1);
    const q = pj(C, x, by + y + 0.01, z); if (!q) return;
    const r = Math.max(1.2, q[3] * 0.06), lt = lightAt(L, x, 0.5, z).c;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(q[0] - r, q[1] - r, q[0] + r, q[1] + r); g.addColorStop(0, litHex('#f4dfa0', [lt[0] + 0.5, lt[1] + 0.45, lt[2] + 0.3])); g.addColorStop(0.5, litHex('#c9a14a', [lt[0] + 0.4, lt[1] + 0.35, lt[2] + 0.2])); g.addColorStop(1, litHex('#7c5a22', lt));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(q[0], q[1], r, r * (u > 0.62 ? lerp(flat, 0.35, clamp((u - 0.62) / 1)) : flat), 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,10,0.8)'; ctx.lineWidth = Math.max(0.6, r * 0.12); ctx.stroke();
    const hit = win(u, 0.36, 0.9, 0.03, 0.45); if (hit > 0) star(ctx, q[0], q[1] - r * 0.4, Math.max(14, q[3] * 0.7) * hit, hit);
    const tw2 = win(u, 0.6, 3.5, 0.3, 1.5); if (tw2 > 0) K.glow(ctx, q[0], q[1], r * 4, [255, 210, 130], 0.22 * tw2);
    ctx.restore();
  }
  // ---------------------------------------------------------------- L38: what the board can award, at its edge
  const STAKES = [-6.25, -1.75, 2.75, 7.0].map((z, i) => ({ x: -(BE + STEP + 1.9), z, i }));
  function stakeItems(ctx, C, t, L) {
    const T = TT(), items = [];
    for (const s of STAKES) {
      const a = smooth(span(t, T.stake[s.i] - 0.3, T.stake[s.i] + 0.5)); if (a <= 0 || t > T.a40 + 0.5) continue;
      const v = toCam(C, s.x, 1, s.z); if (v[2] < NEAR) continue;
      items.push({ d: v[2], draw: () => drawStake(ctx, C, s, t, a, L) });
    }
    return items;
  }
  function drawStake(ctx, C, s, t, a, L) {
    const tw = worldT(t), T = TT(), ph = 1.05, lt0 = lightAt(L, s.x, 1, s.z).c, fireA = a * flick(6 + s.i, tw);
    const lt = [lt0[0] + 0.9 * fireA, lt0[1] + 0.55 * fireA, lt0[2] + 0.3 * fireA];
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a;
    // the plinth
    const hw = 0.45, faces = [[[s.x + hw, s.z - hw], [s.x + hw, s.z + hw], [1, 0]], [[s.x - hw, s.z - hw], [s.x + hw, s.z - hw], [0, -1]], [[s.x - hw, s.z + hw], [s.x + hw, s.z + hw], [0, 1]], [[s.x - hw, s.z - hw], [s.x - hw, s.z + hw], [-1, 0]]];
    for (const [A, B, n] of faces) { if ((C.px - (A[0] + B[0]) / 2) * n[0] + (C.pz - (A[1] + B[1]) / 2) * n[1] <= 0) continue; polyFill(ctx, C, [[A[0], 0, A[1]], [B[0], 0, B[1]], [B[0], ph, B[1]], [A[0], ph, A[1]]], litHex(n[0] > 0 ? '#5a4a3a' : '#3a3028', lt)); }
    polyFill(ctx, C, [[s.x - hw, ph, s.z - hw], [s.x + hw, ph, s.z - hw], [s.x + hw, ph, s.z + hw], [s.x - hw, ph, s.z + hw]], litHex('#6a5a48', lt));
    const q = pj(C, s.x, ph, s.z); if (!q) { ctx.restore(); return; }
    const S = q[3], X = q[0], Y = q[1], grow = easeOut(clamp(a * 1.2));
    if (s.i === 0) { // land: a clod of earth, a sheaf rising from it, a boundary stone
      ctx.fillStyle = litHex('#3a2a1c', lt); ctx.beginPath(); ctx.ellipse(X, Y - S * 0.06, S * 0.36, S * 0.14, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = litHex('#8a8a3a', lt); ctx.lineWidth = Math.max(1, S * 0.02); for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(X + k * S * 0.03, Y - S * 0.12); ctx.quadraticCurveTo(X + k * S * 0.05, Y - S * 0.35 * grow, X + k * S * 0.08, Y - S * 0.5 * grow); ctx.stroke(); }
      ctx.fillStyle = litHex('#c9a24a', lt); for (let k = -4; k <= 4; k += 2) { ctx.beginPath(); ctx.ellipse(X + k * S * 0.08, Y - S * 0.52 * grow, S * 0.025, S * 0.06, k * 0.1, 0, TAU); ctx.fill(); }
      ctx.fillStyle = litHex('#8a8478', lt); ctx.beginPath(); ctx.moveTo(X + S * 0.2, Y - S * 0.05); ctx.lineTo(X + S * 0.2, Y - S * 0.3); ctx.quadraticCurveTo(X + S * 0.26, Y - S * 0.38, X + S * 0.32, Y - S * 0.3); ctx.lineTo(X + S * 0.32, Y - S * 0.05); ctx.closePath(); ctx.fill();
    } else if (s.i === 1) { // passage: a gate with its bar lifted, a lantern
      ctx.fillStyle = litHex('#4a3420', lt); ctx.fillRect(X - S * 0.3, Y - S * 0.62, S * 0.06, S * 0.62); ctx.fillRect(X + S * 0.24, Y - S * 0.62, S * 0.06, S * 0.62);
      ctx.save(); ctx.translate(X - S * 0.27, Y - S * 0.5); ctx.rotate(-1.0 * grow); ctx.fillStyle = litHex('#8a2a1d', lt); ctx.fillRect(0, -S * 0.025, S * 0.62, S * 0.05); ctx.fillStyle = litHex('#eadfc6', lt); for (let k = 1; k < 5; k += 2) ctx.fillRect(k * S * 0.12, -S * 0.025, S * 0.06, S * 0.05); ctx.restore();
      K.glow(ctx, X + S * 0.27, Y - S * 0.7, S * 0.35, [255, 190, 110], 0.5 * a);
    } else if (s.i === 2) { // custody: a child, a hand on her shoulder
      K.figure(ctx, X, Y, S * 1.05, { style: 'painted', kind: 'child', head: 'hood', hold: 'none', face: 1, robe: litHex('#7a6a52', lt), hose: litHex('#3a2e24', lt), skin: litHex('#d8b48e', lt), outline: Math.max(0.8, S / 120) });
      ctx.fillStyle = litHex('#2a1d14', lt); ctx.beginPath(); ctx.ellipse(X - S * 0.06, Y - S * 0.82, S * 0.07, S * 0.04, 0.3, 0, TAU); ctx.fill(); ctx.fillRect(X - S * 0.32, Y - S * 0.86, S * 0.26, S * 0.05);
    } else { // the right to govern: a crown on a red cushion
      ctx.fillStyle = litHex('#7a1d17', lt); ctx.beginPath(); ctx.ellipse(X, Y - S * 0.07, S * 0.3, S * 0.08, 0, 0, TAU); ctx.fill(); ctx.fillRect(X - S * 0.3, Y - S * 0.07, S * 0.6, S * 0.06);
      const cw = S * 0.19, cy = Y - S * 0.13, hh = S * 0.2 * grow;
      K.gold(ctx, c => { c.beginPath(); c.moveTo(X - cw, cy); c.lineTo(X - cw, cy - hh * 0.7); c.lineTo(X - cw * 0.5, cy - hh * 0.35); c.lineTo(X, cy - hh); c.lineTo(X + cw * 0.5, cy - hh * 0.35); c.lineTo(X + cw, cy - hh * 0.7); c.lineTo(X + cw, cy); c.closePath(); }, X - cw, cy - hh, X + cw, cy, { sheen: 0.4 + 0.3 * Math.sin(tw * 0.8) });
      const gl = win(t, T.stake[3] + 0.2, T.stake[3] + 1.4, 0.15, 0.8); if (gl > 0) star(ctx, X + cw * 0.3, cy - hh * 0.8, S * 0.5 * gl, gl);
    }
    // the plinth's fire bowl
    flame(ctx, X - S * 0.38, Y - S * 0.02, S * 0.22 * fireA, tw * 1.4 + s.i * 3, fireA);
    K.glow(ctx, X - S * 0.38, Y - S * 0.1, S * 1.4, [255, 150, 70], 0.3 * fireA);
    ctx.restore();
  }
  // ---------------------------------------------------------------- L42: red runs into the seams of the board
  function redNodes() {
    return K.cached('s6:red', () => {
      const T = TT(), arr = [];
      for (let i = 0; i <= 8; i++) { arr.push([]); for (let j = 0; j <= 8; j++) { const d = Math.min(...[[3, 4], [4, 4], [3, 5], [4, 5]].map(([a, b]) => Math.abs(i - a) + Math.abs(j - b))); arr[i].push(T.red0 + d * 0.36 + K.hash(i, j, 99) * 0.3 + (d ? 0.25 : 0)); } }
      return arr;
    });
  }
  function drawRedSeams(ctx, C, t) {
    const T = TT(); if (t < T.red0) return;
    const N = redNodes(), by = boardY(t) + 0.01;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const segs = [];
    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) { if (i < 8) segs.push([i, j, i + 1, j]); if (j < 8) segs.push([i, j, i, j + 1]); }
    for (const pass of [0, 1, 2]) {
      for (const [i0, j0, i1, j1] of segs) {
        let a = N[i0][j0], b = N[i1][j1], A = [i0, j0], B = [i1, j1]; if (b < a) { [a, b] = [b, a]; [A, B] = [B, A]; }
        const u = clamp((t - a) / (b - a + 0.45)); if (u <= 0) continue;
        const x0 = -HB + A[0] * SQ, z0 = -HB + A[1] * SQ, x1 = lerp(x0, -HB + B[0] * SQ, u), z1 = lerp(z0, -HB + B[1] * SQ, u);
        if (pass === 0) { if (stripPath(ctx, C, x0, by, z0, x1, by, z1, 0.5, 0.5)) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(120,14,8,0.16)'; ctx.fill(); } }
        else if (pass === 1) { if (stripPath(ctx, C, x0, by, z0, x1, by, z1, 0.09, 0.07)) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(92,8,6,0.95)'; ctx.fill(); } }
        else { if (stripPath(ctx, C, x0, by, z0, x1, by, z1, 0.03, 0.022)) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(230,60,30,0.7)'; ctx.fill(); } }
      }
    }
    // the pool beneath the surrounded king
    const pl = smooth(span(t, T.red0 - 0.2, T.red0 + 2.5)), e = floorEllipse(C, sqX(3), by, sqZ(4), 0.9 * pl + 0.01);
    if (e && pl > 0) { ctx.globalCompositeOperation = 'source-over'; const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.rx); g.addColorStop(0, 'rgba(70,6,4,0.75)'); g.addColorStop(1, 'rgba(70,6,4,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  // ---------------------------------------------------------------- shadows on the floor: contact, and long ones from the fires
  function drawShadows(ctx, C, t, L, P) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const fires = L.lights.filter(l => l.fire);
    for (const p of P) {
      const pr = presence(p, t); if (pr.a <= 0.01) continue;
      const w = where(p, t), y = floorAt(w.x, w.z, t) + 0.01, a0 = pr.a * (1 - pr.dis);
      const e = floorEllipse(C, w.x, y, w.z, p.type === 'N' ? 0.9 : 0.42); if (!e) continue;
      ctx.globalAlpha = 0.55 * a0; const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.rx); g.addColorStop(0, 'rgba(4,2,2,0.9)'); g.addColorStop(1, 'rgba(4,2,2,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, TAU); ctx.fill();
      // from each fire nearby, a long soft shadow
      const near = fires.map(l => ({ l, d: Math.hypot(w.x - l.x, w.z - l.z) })).filter(q => q.d < 22).sort((a, b) => a.d - b.d).slice(0, 2);
      for (const { l, d } of near) {
        const hgt = p.h, len = Math.min(9, hgt * d / Math.max(0.5, BRZH - hgt * 0.75)), dx = (w.x - l.x) / d, dz = (w.z - l.z) / d, k = clamp(l.a) * (1 - d / 22);
        const x1 = w.x + dx * len, z1 = w.z + dz * len;
        if (!stripPath(ctx, C, w.x, y, w.z, x1, y, z1, 0.55, 1.1)) continue;
        const q0 = pj(C, w.x, y, w.z), q1 = pj(C, x1, y, z1); if (!q0 || !q1) continue;
        const sg = ctx.createLinearGradient(q0[0], q0[1], q1[0], q1[1]); sg.addColorStop(0, `rgba(6,3,2,${0.5 * k * a0})`); sg.addColorStop(1, 'rgba(6,3,2,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = sg; ctx.fill();
      }
    }
    ctx.restore();
  }
  // ---------------------------------------------------------------- air: low fog, sparks and smoke from the fires
  let FOG = null;
  function fogBanks() { if (FOG) return FOG; const r = rng(5151); FOG = []; for (let i = 0; i < 34; i++) { const a = r() * TAU, d = 9 + r() * 15; FOG.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, y: 0.6 + r() * 1.2, s: 5 + r() * 7, a: 0.05 + r() * 0.09, sp: 0.15 + r() * 0.3, ph: r() * TAU }); } return FOG; }
  function fogItems(ctx, C, t, L, amt) {
    const tw = worldT(t), items = [], img = K.puff();
    for (const f of fogBanks()) {
      const x = f.x + Math.sin(tw * 0.05 * f.sp + f.ph) * 2.5, z = f.z + Math.cos(tw * 0.04 * f.sp + f.ph) * 2;
      const v = toCam(C, x, f.y, z); if (v[2] < 1.5) continue;
      items.push({ d: v[2], draw: () => { const q = pj(C, x, f.y, z); if (!q) return; const s = q[3] * f.s; if (s < 8) return; const lt = lightAt(L, x, f.y, z).c, near = clamp((q[2] - 1.5) / 4); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = f.a * amt * near; ctx.globalCompositeOperation = 'screen'; ctx.drawImage(tintPuff(lt), q[0] - s, q[1] - s * 0.45, s * 2, s * 0.9); ctx.restore(); } });
    }
    void img;
    return items;
  }
  function tintPuff(lt) {
    const k = [clamp(lt[0] / 1.4), clamp(lt[1] / 1.4), clamp(lt[2] / 1.4)].map(v => Math.round(v * 8) / 8), key = 's6:fp:' + k.join(',');
    return K.cached(key, () => { const p = K.puff(), c = K.canvas(p.width, p.height), x = c.getContext('2d'); x.drawImage(p, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = rgbs([60 + 195 * k[0], 50 + 170 * k[1], 50 + 150 * k[2]], 1); x.fillRect(0, 0, c.width, c.height); return c; });
  }
  function drawSparks(ctx, C, t) {
    const tw = worldT(t);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const fr = fire(i, t); if (fr <= 0) continue;
      const [bx, bz] = BRAZ[i];
      for (let k = 0; k < 26; k++) {
        const life = 1.6 + K.hash(i, k, 71) * 2.2, ph = (tw / life + K.hash(k, i, 73)) % 1, seedx = K.hash(k, 11, 77) - 0.5, seedz = K.hash(k, 13, 77) - 0.5;
        const x = bx + seedx * 0.6 + Math.sin(tw * 1.3 + k) * ph * 0.8, z = bz + seedz * 0.6 + Math.cos(tw * 1.1 + k) * ph * 0.8, y = BRZH + 0.3 + ph * (2.5 + K.hash(k, 17, 77) * 4);
        const q = pj(C, x, y, z); if (!q) continue;
        const a = Math.sin(ph * Math.PI) * (1 - ph * 0.5) * clamp(fr), s = Math.max(0.8, q[3] * 0.025);
        ctx.fillStyle = `rgba(255,${170 + K.hash(k, 19, 77) * 70},90,${a})`; ctx.beginPath(); ctx.arc(q[0], q[1], s, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }
  function smokeItems(ctx, C, t) {
    const tw = worldT(t), items = [];
    for (let i = 0; i < 4; i++) {
      const fr = fire(i, t); if (fr <= 0) continue; const [bx, bz] = BRAZ[i];
      for (let k = 0; k < 6; k++) {
        const life = 7, ph = (tw / life + k / 6) % 1, x = bx + Math.sin(tw * 0.3 + k) * ph * 2 + ph * 3, z = bz + ph * 1.5, y = BRZH + 1 + ph * 9;
        const v = toCam(C, x, y, z); if (v[2] < 2) continue;
        items.push({ d: v[2], draw: () => { const q = pj(C, x, y, z); if (!q) return; const s = q[3] * (1.2 + ph * 4); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.16 * Math.sin(ph * Math.PI) * clamp(fr); ctx.drawImage(tintPuff([0.25, 0.18, 0.16]), q[0] - s, q[1] - s, s * 2, s * 2); ctx.restore(); } });
      }
    }
    return items;
  }


  // ---------------------------------------------------------------- the camera: keyed shots, eased through Hermite curves
  // [time, position, target, focal length (px), options]; a key with cut starts a new shot
  let CK = null;
  function camKeys() {
    if (CK) return CK; const T = TT();
    const k = (t, pos, tgt, f, o = {}) => Object.assign({ t, pos, tgt, f }, o);
    CK = [
      // the field: low over the fallen, pushing toward the low sun
      k(T.s - 1.5, [-3.2, 1.4, -28.5], [1.6, 0.9, -11], 1500),
      k(T.a31, [-2.5, 1.55, -25], [1.0, 0.8, -8], 1500),
      // L31: the ink runs; the camera rises and draws back as the board and the arena form
      k(T.a31 + 2.0, [-4.5, 4.8, -25.5], [0, 0, -5.5], 1400),
      k(T.b31 + 0.2, [-17, 15, -27], [0, 0, -2], 1250),
      // L32: down to the ranks as the living take their places
      k(T.a32 + 1.2, [-17.5, 6.5, -15], [0, 1, -6], 1350),
      k(T.b32 + 0.1, [-14.5, 1.75, -7.3], [6, 1.3, -7.0], 1500),
      // L33: all is still; a slow push toward the dais of the Seven
      k(T.b33 + 0.2, [-12.2, 1.85, -7.45], [14, 2.6, -3], 1650),
      // L34: the law of blood runs from the dais to the champions of side A
      k(T.a34 + 1.7, [-4.2, 5.8, -3.2], [12, 0.4, -6.5], 1400),
      k(T.b34 + 0.2, [1.6, 3.0, -1.2], [-1.5, 1.2, -9.8], 1500),
      // L35: the queen lent across, framed between two pawns
      k(T.a35 + 1.6, [-0.1, 2.5, -1.2], [-0.9, 1.5, -10.5], 1700),
      k(T.ring, [-0.25, 2.1, -4.4], [-0.1, 1.55, -8.9], 2150),
      k(T.b35 + 0.3, [-0.05, 2.0, -4.9], [-0.3, 1.5, -8.9], 2300),
      // L36: across the board to Ealdholt, whose back rank empties
      k(T.a36 + 1.8, [3.2, 6.2, -2.5], [0, 0.4, 7.2], 1350),
      k(T.b36 + 0.1, [1.0, 2.25, 0.8], [0, 1.2, 9.6], 1600),
      // L37: the borrowed step in; each binds a pawn
      k(T.a37 + 2.6, [-9.5, 3.0, 3.4], [0, 0.8, 7.8], 1450),
      k(T.b37 + 0.2, [-12.8, 2.4, 6.0], [0, 0.8, 7.5], 1550),
      // L38: play; along the edge where the stakes appear
      k(T.a38 + 0.9, [-16.8, 2.7, -10.8], [2, 0.8, -3], 1400),
      k(T.b38 + 0.1, [-17.6, 2.3, 4.6], [-10.5, 1.0, 9.6], 1500),
      // L39: wide over the arena
      k(T.b39 + 0.1, [-22, 31, -25], [2, 0, 2], 1150),
      // L40: down to the bishop as he falls
      k(T.a40 + 0.5, [12.5, 3.6, 0.4], [6, 1.0, 1.5], 1600),
      k(T.a41, [10.4, 1.6, 1.25], [6, 0.9, 1.8], 1800),
      // L41: the defeated in shadow (cut)
      k(T.a41, [11.2, 1.7, 12.4], [-6, 1.3, 14.8], 1600, { cut: true }),
      k(T.a42, [7.6, 1.6, 13.1], [-6, 1.3, 14.8], 1850),
      // L42: the surrounded king (cut); rising as red fills the seams; held
      k(T.a42, [0.7, 2.6, -2.3], [-1.25, 2.0, 1.25], 2200, { cut: true }),
      k(T.a42 + 3.4, [2.6, 7.4, -6.6], [-1.25, 0.6, 1.25], 1500),
      k(T.e - 1.6, [3.7, 12.6, -10.1], [-1.2, 0.05, 1.45], 1360),
      k(T.e + 2, [3.85, 13.2, -10.5], [-1.2, 0.0, 1.5], 1350),
    ];
    return CK;
  }
  function camAt(t) {
    const ks = camKeys();
    let i = 0; while (i < ks.length - 1 && t >= ks[i + 1].t) i++;
    // shot bounds
    let s0 = i; while (s0 > 0 && !ks[s0].cut) s0--;
    let s1 = i; while (s1 < ks.length - 1 && !ks[s1 + 1].cut) s1++;
    const val = (j, f) => f === 'f' ? Math.log(ks[j].f) : null;
    const get = (j) => [...ks[j].pos, ...ks[j].tgt, Math.log(ks[j].f)];
    const tan = (j) => {
      const a = Math.max(s0, j - 1), b = Math.min(s1, j + 1); if (a === b) return get(j).map(() => 0);
      const pa = get(a), pb = get(b), dt = ks[b].t - ks[a].t, m = pa.map((v, q) => (pb[q] - v) / dt);
      return (j === s0 || j === s1) ? m.map(v => v * 0.5) : m;
    };
    let out;
    if (i >= s1) { const p = get(s1), m = tan(s1), dt = Math.max(0, t - ks[s1].t); out = p.map((v, q) => v + m[q] * dt * Math.exp(-dt * 0.5)); }
    else {
      const t0 = ks[i].t, t1 = ks[i + 1].t, u = clamp((t - t0) / (t1 - t0)), dt = t1 - t0, p0 = get(i), p1 = get(i + 1), m0 = tan(i), m1 = tan(i + 1);
      const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
      out = p0.map((v, q) => h00 * v + h10 * dt * m0[q] + h01 * p1[q] + h11 * dt * m1[q]);
    }
    void val;
    // a hand on the camera: a little drift, stiller while the law is spoken
    const T = TT(), hand = 1 - 0.75 * win(t, T.still0, T.still1, 0.4, 0.4), n = (s, k) => (K.fbm(t * 0.35 + k * 10, s, 2, 991) - 0.5) * 2;
    return { pos: [out[0] + n(1, 1) * 0.05 * hand, out[1] + n(2, 2) * 0.04 * hand, out[2] + n(3, 3) * 0.05 * hand], tgt: [out[3] + n(4, 4) * 0.04 * hand, out[4] + n(5, 5) * 0.03 * hand, out[5] + n(6, 6) * 0.04 * hand], f: Math.exp(out[6]), roll: n(7, 7) * 0.004 * hand };
  }

  // ---------------------------------------------------------------- the frame
  let BLOOMS = false;
  function frame(ctx, t) {
    const T = TT(), P = pieces(); if (!BLOOMS) { setBlooms(); BLOOMS = true; }
    const cam = camAt(t), C = camera(cam.pos, cam.tgt, cam.f, cam.roll), L = lights(t), by = boardY(t), bf = battle(t);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.fillStyle = '#0b0807'; ctx.fillRect(0, 0, W, H);
    drawSky(ctx, C, t);
    // the floor: the field / arena ground at half resolution, lit; the board at full resolution, lit
    const Li = lightImage(C, L, by);
    const G = K.layer('s6:ground', W / 2, H / 2), gx = G.getContext('2d');
    gx.fillStyle = '#3e2f22'; floorPath(gx, C, 0.5); gx.fill();
    const boardDone = t > T.fill1 + 0.1;
    groundPlane(gx, C, mudLevels(), GT.m, bf > 0.02 ? 150 : 40, { k: 0.5, err: 5, skip: boardDone ? (a0, b0, a1, b1) => a0 >= -BE + 0.01 && a1 <= BE - 0.01 && b0 >= -BE + 0.01 && b1 <= BE - 0.01 : null });
    gx.setTransform(1, 0, 0, 1, 0, 0); gx.globalCompositeOperation = 'multiply'; gx.imageSmoothingQuality = 'low'; gx.drawImage(Li, 0, 0, W / 2, H / 2); gx.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingQuality = 'low'; ctx.drawImage(G, 0, 0, W, H);
    drawFieldDecals(ctx, C, t);
    drawSlab(ctx, C, t, L);
    drawBoardTop(ctx, C, t, Li, L);
    drawInkLines(ctx, C, t);
    drawShadows(ctx, C, t, L, P);
    drawRedSeams(ctx, C, t);
    drawBlood(ctx, C, t);
    drawChains(ctx, C, t, L);
    // the arena stands behind everything on the floor
    drawArena(ctx, C, t, L);
    // everything that stands, far to near
    const items = [];
    for (const p of P) { const w = where(p, t), v = toCam(C, w.x, 1, w.z); if (v[2] > NEAR) items.push({ d: v[2], draw: () => drawPiece(ctx, C, p, t, L) }); }
    for (let i = 0; i < 4; i++) { const v = toCam(C, BRAZ[i][0], 2, BRAZ[i][1]); if (v[2] > NEAR) items.push({ d: v[2], draw: () => drawBrazier(ctx, C, i, t, L) }); }
    items.push(...drawDais(ctx, C, t, L), ...fieldItems(ctx, C, t, L), ...stakeItems(ctx, C, t, L), ...fogItems(ctx, C, t, L, 1 - bf * 0.6), ...smokeItems(ctx, C, t));
    // the coins: the queen's debt, and the price of each borrowed champion
    if (t > T.coinQ) items.push({ d: toCam(C, sqX(3) + 0.5, 0, sqZ(0) + 0.9)[2], draw: () => drawCoin(ctx, C, sqX(3) + 0.5, sqZ(0) + 0.9, T.coinQ, t, L) });
    for (const p of P) if (p.coin && t > p.coin && t < T.form) { const x = sqX(p.f) - 0.55, z = sqZ(7) - 0.95; items.push({ d: toCam(C, x, 0, z)[2], draw: () => drawCoin(ctx, C, x, z, p.coin, t, L) }); }
    items.sort((a, b) => b.d - a.d);
    for (const it of items) { ctx.save(); it.draw(); ctx.restore(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    drawSparks(ctx, C, t);
    drawSkyCrows(ctx, C, t);
    return C;
  }
  function finish(ctx, t) {
    const T = TT(), bf = battle(t);
    K.bloom(ctx, 0.32, 12);
    K.grade(ctx, bf > 0.5 ? '#ff7a40' : '#c06030', 'soft-light', 0.12 + 0.1 * bf);
    K.vignette(ctx, 0.62, '8,4,3', 0.28);
    K.paperTooth(ctx, 0.07 + 0.05 * bf);
    void T;
  }
  SCENES[6] = {
    join: 'dissolve', joinDur: 1.4,
    draw(ctx, t, sc) {
      void sc;
      const T = TT(); t = clamp(t, T.s - 1.5, T.e + 1.5);
      frame(ctx, t);
      insert(ctx, t);
      finish(ctx, t);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    },
  };
  // close inserts drawn over the frame (the pawn's fists in L41)
  function insert(ctx, t) {
    const T = TT(), a = win(t, T.fist0 - 0.45, T.a42 - 0.02, 0.18, 0.05);
    if (a <= 0) return;
    fists(ctx, t, a);
  }
  function fists(ctx, t, a) {
    // placeholder until the close-up is painted
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.fillStyle = '#0b0706'; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
})();
