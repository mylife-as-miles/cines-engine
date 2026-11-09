/* Scene 5: The Muster [L26, L28–L32]. The great hall of the capital, the board under its shafts of light, the born and the
   front rank; the clerk who reads the register twice; the final trial, the pawn on the last rank, four ghost pieces, the
   Knight chosen and the royal fork (1. f8=N#, forking the king on h7 and the queen on d7); the knighting and the silver
   star; a hooded man in the high gallery. The hall is a small 3D world (after the intro's King's Gambit: projected planes
   for floor and board, lit by a per-pixel light image, living chessmen drawn as lit sprites, sorted far to near); the
   register, the clerk, the knighting and the star are painted close shots. Registers window.SCENES[5]; see LOOK.md. */
(function () {
  'use strict';
  const K = window.KIT, P = K.P, W = K.W, H = K.H;
  const { clamp, lerp, smooth, ease, easeOut, easeIn, span, win, rng } = K;
  const SCENES = window.SCENES = window.SCENES || {};
  const TAU = Math.PI * 2, NEAR = 0.25;

  // ================================================================ helpers adapted from the intro (projection, textured planes, stone, living chessmen)
  // ---------------------------------------------------------------- colour helpers (hex in, hex out: K.figure parses hex)
  const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const toHex = (r, g, b) => '#' + ((1 << 24) | (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)).toString(16).slice(1);
  const mixHex = (a, b, u) => { const A = hexRGB(a), B = hexRGB(b); return toHex(lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u)); };
  const litHex = (h, L) => { const A = hexRGB(h); return toHex(A[0] * L[0], A[1] * L[1], A[2] * L[2]); };
  const rgbs = (c, a) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
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
    const pp = Math.min(ce, 6) + pad, pu = pp / (Math.hypot(a, b) || 1), pv = pp / (Math.hypot(c, d) || 1);
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
        const mag = Math.max(Math.hypot(sp[1][0] - sp[0][0], sp[1][1] - sp[0][1]) / ((a1 - a0) * tw || 1), Math.hypot(sp[3][0] - sp[0][0], sp[3][1] - sp[0][1]) / ((b1 - b0) * th || 1)) * k;
        if (e * k > err * clamp(mag / 1.4, 1, 2.2)) { stack.push([a0, b0, am, bm, dep + 1], [am, b0, a1, bm, dep + 1], [a0, bm, am, b1, dep + 1], [am, bm, a1, b1, dep + 1]); continue; }
      }
      cellImg(ctx, mips, u0 + a0 * tw, v0 + b0 * th, u0 + a1 * tw, v0 + b1 * th, sp[0], sp[1], sp[2], sp[3], k, pad);
    }
  }
  // ---------------------------------------------------------------- noise helpers for tileable textures
  function pnoise(x, y, p, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), m = a => ((a % p) + p) % p; const x0 = m(xi), x1 = m(xi + 1), y0 = m(yi), y1 = m(yi + 1); const a = K.hash(x0, y0, s), b = K.hash(x1, y0, s), c = K.hash(x0, y1, s), d = K.hash(x1, y1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function pfbm(x, y, p, oct, s) { let f = 0, a = 0.5, n = 0; for (let i = 0; i < oct; i++) { f += a * pnoise(x, y, p, s + i * 17); n += a; x *= 2; y *= 2; p *= 2; a *= 0.5; } return f / n; }

  // ---------------------------------------------------------------- textures (built once)
  function pixels(n, m, fn) { const c = K.canvas(n, m), x = c.getContext('2d'), img = x.createImageData(n, m), d = img.data; for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { const k = (j * n + i) * 4, v = fn(i, j); d[k] = v[0]; d[k + 1] = v[1]; d[k + 2] = v[2]; d[k + 3] = v[3] == null ? 255 : v[3]; } x.putImageData(img, 0, 0); return c; }
  // pale limestone with veins, dark basalt with flecks (512 x 512, cropped per square)
  function lightStone() {
    return K.cached('p5:stoneL', () => {
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
    return K.cached('p5:stoneD', () => {
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
  function unproj(C, sx, sy) { const X = (sx - C.cx) / C.f, Y = -(sy - C.cy) / C.f, dx = X * C.rx + Y * C.ux + C.fx, dy = X * C.ry + Y * C.uy + C.fy, dz = X * C.rz + Y * C.uz + C.fz; if (dy > -1e-6) return null; const t = -C.py / dy; return [C.px + t * dx, C.pz + t * dz, t]; }
  // the board's outline on screen (clipped at the near plane)
  function quadPath(ctx, C, pts, k = 1) {
    const cs = pts.map(p => toCam(C, p[0], p[1], p[2])), out = [];
    for (let i = 0; i < cs.length; i++) { const A = cs[i], B = cs[(i + 1) % cs.length], ia = A[2] >= NEAR, ib = B[2] >= NEAR; if (ia) out.push(A); if (ia !== ib) { const u = (NEAR - A[2]) / (B[2] - A[2]); out.push(A.map((v, j) => v + (B[j] - v) * u)); } }
    ctx.beginPath(); out.forEach((p, i) => { const X = (C.cx + C.f * p[0] / p[2]) * k, Y = (C.cy - C.f * p[1] / p[2]) * k; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath();
    return out.length >= 3;
  }


  function glowSprite(rgb) { return K.cached('p5:glow:' + rgb.join(','), () => { const n = 128, c = K.canvas(n, n), x = c.getContext('2d'), g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.4, `rgba(${rgb},0.35)`); g.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = g; x.fillRect(0, 0, n, n); return c; }); }
  function glowS(ctx, x, y, r, rgb, a) { if (a <= 0.003 || r < 1) return; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowSprite(rgb), x - r, y - r, 2 * r, 2 * r); ctx.restore(); }
  function blobSprite() { return K.cached('p5:blob', () => { const n = 128, c = K.canvas(n, n), x = c.getContext('2d'), g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(5,3,2,1)'); g.addColorStop(0.5, 'rgba(5,3,2,0.4)'); g.addColorStop(1, 'rgba(5,3,2,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); return c; }); }
  // ---------------------------------------------------------------- a person, drawn for this scene (side or front view)
  // Units: feet at y = 0, the crown of the head at y = -1, facing +x in side view (the caller mirrors). Fills only, in
  // colours already lit. o: { view: 'side'|'front'|'back', kind: 'robe'|'gown'|'tunic'|'mail'|'rags', cloak, head, hold,
  //   pavise (house|null), arms (house|null), armsA, walk, sway, col: { cloth, cloth2, trim, skin, hair, steel, wood, gold,
  //   leg, boot, veil, field, charge }, beard, seated }
  function person(x, o) {
    const c = o.col, v = o.view || 'side', front = v !== 'side', back = v === 'back', lod = o.lod || 0;
    const long = o.kind === 'robe' || o.kind === 'gown', hemY = o.seated ? -0.43 : long ? -0.012 : o.kind === 'rags' ? -0.25 : -0.29;
    const wk = o.walk, sw = wk != null ? Math.sin(wk) : 0, sw2 = wk != null ? Math.cos(wk) : 0, bob = wk != null ? -Math.abs(Math.cos(wk)) * 0.012 : 0;
    const F = (col, fn) => { x.fillStyle = col; x.beginPath(); fn(); x.fill(); };
    const sway = o.sway || 0;
    x.save(); x.translate(0, bob);
    // ---- what lies behind: cloak, far limbs
    if (o.cloak) {
      const cw = front ? 0.17 : 0.0, cl = o.cloakLen || -0.06;
      if (front) F(c.cloak || c.cloth2, () => { x.moveTo(-0.11, -0.83); x.bezierCurveTo(-0.19, -0.6, -0.21 - sway, -0.3, -0.2 - sway * 2, cl); x.lineTo(0.2 + sway * 2, cl); x.bezierCurveTo(0.21 + sway, -0.3, 0.19, -0.6, 0.11, -0.83); x.closePath(); });
      else F(c.cloak || c.cloth2, () => { const s2 = sw * 0.03; x.moveTo(-0.02, -0.845); x.quadraticCurveTo(-0.13, -0.82, -0.14, -0.75); x.bezierCurveTo(-0.17, -0.45, -0.22 - s2, -0.2, -0.24 - s2 * 2, cl); x.lineTo(0.02, cl + 0.01); x.lineTo(0.05, -0.75); x.closePath(); });
      void cw;
    }
    const legs = !long && !o.seated;
    const leg = (side, phase, col) => {
      // a leg from the hip, swinging with the walk (side view) or standing apart (front)
      if (front) { const lx = side * 0.05, lift = wk != null ? Math.max(0, Math.sin(wk + (side > 0 ? 0 : Math.PI))) * 0.03 : 0; F(col, () => { x.moveTo(lx - 0.032, -0.5); x.lineTo(lx + 0.032, -0.5); x.lineTo(lx + 0.026, -0.05 - lift); x.lineTo(lx - 0.026, -0.05 - lift); x.closePath(); }); F(c.boot, () => { x.ellipse(lx, -0.03 - lift, 0.035, 0.03, 0, 0, TAU); x.rect(lx - 0.033, -0.07 - lift, 0.066, 0.045); }); return; }
      const th = wk != null ? 0.38 * Math.sin(phase) : side * 0.04, fl = wk != null ? 0.05 + 0.55 * Math.max(0, Math.cos(phase)) : 0.02;
      const kx = Math.sin(th) * 0.235, ky = -0.49 + Math.cos(th) * 0.235, sa = th - fl, ax = kx + Math.sin(sa) * 0.215, ay = ky + Math.cos(sa) * 0.215;
      F(col, () => { x.moveTo(-0.035, -0.5); x.lineTo(0.04, -0.5); x.lineTo(kx + 0.03, ky); x.lineTo(ax + 0.022, ay - 0.02); x.lineTo(ax - 0.024, ay - 0.02); x.lineTo(kx - 0.03, ky); x.closePath(); });
      F(c.boot, () => { x.moveTo(ax - 0.028, ay - 0.05); x.lineTo(ax + 0.03, ay - 0.05); x.quadraticCurveTo(ax + 0.075, ay - 0.02, ax + 0.078, ay + 0.012); x.lineTo(ax - 0.03, ay + 0.012); x.closePath(); });
    };
    if (legs && !front) leg(-1, (wk || 0) + Math.PI, shadeHex(c.leg, -0.3));
    // far arm (side view)
    const arm = (near, a, b, sleeve, hand, wide) => {
      const sx = near ? 0.01 : -0.02, sy = -0.795, ex = sx + Math.sin(a) * 0.165, ey = sy + Math.cos(a) * 0.165, hx = ex + Math.sin(a + b) * 0.15, hy = ey + Math.cos(a + b) * 0.15;
      F(sleeve, () => { const n = Math.atan2(ey - sy, ex - sx) + Math.PI / 2, m = Math.atan2(hy - ey, hx - ex) + Math.PI / 2; x.moveTo(sx + Math.cos(n) * 0.04, sy + Math.sin(n) * 0.04); x.lineTo(ex + Math.cos(n) * 0.033, ey + Math.sin(n) * 0.033); x.lineTo(hx + Math.cos(m) * 0.026, hy + Math.sin(m) * 0.026); x.lineTo(hx - Math.cos(m) * 0.026, hy - Math.sin(m) * 0.026); x.lineTo(ex - Math.cos(n) * 0.033, ey - Math.sin(n) * 0.033); x.lineTo(sx - Math.cos(n) * 0.04, sy - Math.sin(n) * 0.04); x.closePath(); });
      if (wide) F(sleeve, () => { x.moveTo(ex, ey); x.quadraticCurveTo(lerp(ex, hx, 0.8) - 0.03, lerp(ey, hy, 0.8) + 0.06, hx - 0.05, hy + 0.1); x.lineTo(hx + 0.02, hy - 0.01); x.closePath(); });
      F(shadeHex(hand, -0.18), () => { x.ellipse(hx + Math.sin(a + b) * 0.014, hy + Math.cos(a + b) * 0.014, 0.017, 0.021, a + b, 0, TAU); });
      return [hx + Math.sin(a + b) * 0.02, hy + Math.cos(a + b) * 0.02];
    };
    const wide = o.kind === 'robe';
    const upHold = ['spear', 'crozier', 'lance', 'banner'].includes(o.hold);
    if (!front) arm(false, wk != null ? 0.35 * sw : -0.08, 0.25, shadeHex(o.kind === 'mail' ? c.steel : c.cloth, -0.28), shadeHex(c.skin, -0.25), wide);
    // ---- front view: both legs, then arms hang behind the hands' items
    if (legs && front) { leg(-1, 0, shadeHex(c.leg, -0.15)); leg(1, 0, c.leg); }
    // ---- the body: torso and skirt in one
    const flare = long ? (o.kind === 'gown' ? 1.15 : 1.25) : 0.95;
    if (front) {
      if (lod) x.strokeStyle = '#000';
      F(o.kind === 'mail' ? c.steel : c.cloth, () => { x.moveTo(-0.035, -0.85); x.quadraticCurveTo(-0.115, -0.845, -0.122, -0.79); x.bezierCurveTo(-0.118, -0.7, -0.088, -0.64, -0.085, -0.58); x.bezierCurveTo(-0.1, -0.45, -0.15 * flare + sway, hemY - 0.1, -0.16 * flare + sway, hemY); x.quadraticCurveTo(0, hemY + 0.015, 0.16 * flare + sway, hemY); x.bezierCurveTo(0.15 * flare + sway, hemY - 0.1, 0.1, -0.45, 0.085, -0.58); x.bezierCurveTo(0.088, -0.64, 0.118, -0.7, 0.122, -0.79); x.quadraticCurveTo(0.115, -0.845, 0.035, -0.85); x.closePath(); });
      // a surcoat or tabard over mail, in the house colours
      if (o.kind === 'mail') F(c.cloth, () => { x.moveTo(-0.08, -0.8); x.lineTo(0.08, -0.8); x.lineTo(0.095, -0.58); x.lineTo(0.12, hemY + 0.02); x.lineTo(-0.12, hemY + 0.02); x.lineTo(-0.095, -0.58); x.closePath(); });
      // folds
      if (!lod) x.save(); if (!lod) x.globalAlpha *= 0.22; x.strokeStyle = '#000'; x.lineWidth = 0.008;
      if (!lod) { for (const fx of [-0.06, 0.0, 0.06]) { x.beginPath(); x.moveTo(fx * 0.6, -0.56); x.quadraticCurveTo(fx * 1.2, -0.3, fx * 1.9 * flare, hemY + 0.005); x.stroke(); } x.restore(); }
      if (o.belt !== false) F(c.trim, () => x.rect(-0.088, -0.585, 0.176, 0.022));
    } else {
      F(o.kind === 'mail' ? c.steel : c.cloth, () => { const s3 = wk != null ? Math.sin(wk * 2) * 0.01 : 0; x.moveTo(-0.025, -0.85); x.quadraticCurveTo(-0.075, -0.84, -0.075, -0.79); x.bezierCurveTo(-0.08, -0.7, -0.07, -0.63, -0.065, -0.58); x.bezierCurveTo(-0.09, -0.45, -0.13 * flare + sway, hemY - 0.12, -0.14 * flare - s3 + sway, hemY); x.quadraticCurveTo(0, hemY + 0.012, 0.14 * flare + s3 + sway + (wk != null ? 0.02 : 0), hemY); x.bezierCurveTo(0.12 * flare + sway, hemY - 0.12, 0.08, -0.45, 0.07, -0.58); x.bezierCurveTo(0.075, -0.64, 0.085, -0.72, 0.075, -0.79); x.quadraticCurveTo(0.07, -0.84, 0.03, -0.85); x.closePath(); });
      if (o.kind === 'mail') F(c.cloth, () => { x.moveTo(-0.06, -0.8); x.lineTo(0.065, -0.8); x.lineTo(0.075, -0.58); x.lineTo(0.11, hemY + 0.02); x.lineTo(-0.11, hemY + 0.02); x.lineTo(-0.065, -0.58); x.closePath(); });
      if (!lod) { x.save(); x.globalAlpha *= 0.2; x.strokeStyle = '#000'; x.lineWidth = 0.008;
      for (const fx of [-0.05, 0.02, 0.07]) { x.beginPath(); x.moveTo(fx * 0.5, -0.56); x.quadraticCurveTo(fx * 0.9, -0.3, fx * 1.6 * flare, hemY + 0.005); x.stroke(); }
      x.restore(); }
      if (o.belt !== false) F(c.trim, () => x.rect(-0.07, -0.585, 0.145, 0.022));
    }
    if (legs && !front) leg(1, wk || 0, c.leg);
    // a mantle's fall over the shoulders, ermine for a king
    if (o.collar) F(c.trim2 || '#ece6da', () => { if (front) { x.moveTo(-0.125, -0.8); x.quadraticCurveTo(0, -0.7, 0.125, -0.8); x.lineTo(0.12, -0.75); x.quadraticCurveTo(0, -0.64, -0.12, -0.75); x.closePath(); } else { x.moveTo(-0.08, -0.83); x.quadraticCurveTo(0.0, -0.76, 0.08, -0.8); x.lineTo(0.075, -0.75); x.quadraticCurveTo(0, -0.7, -0.08, -0.77); x.closePath(); } });
    // ---- the tabard's device (the law's colours)
    if (o.arms && o.arms.device !== 'none' && (front && !back || !front)) { x.save(); x.globalAlpha *= (o.armsA != null ? o.armsA : 1) * (front ? 1 : 0.85); x.fillStyle = c.charge; K.device(x, o.arms.device, front ? 0 : 0.01, -0.69, front ? 0.075 : 0.055); x.restore(); }
    // ---- neck and head
    F(c.skin, () => x.rect(front ? -0.022 : -0.018, -0.885, front ? 0.044 : 0.038, 0.05));
    head(x, o, c, front, back);
    // ---- arms and what the hands hold
    let hand;
    if (front) {
      const ha = upHold ? 0.5 : 0.12, hb = upHold ? 0.9 : 0.15;
      // right (screen-left when facing us) hangs; left holds
      const s = o.hold === 'none' && wk != null ? sw * 0.15 : 0;
      if (!(o.hero && !o.lod)) { x.save(); x.scale(-1, 1); arm(true, 0.12 + s, 0.15, o.kind === 'mail' ? c.steel : c.cloth, c.skin, wide); x.restore(); }
      if (o.hold === 'spear' || o.hold === 'lance' || o.hold === 'banner') { hand = [0.165, -0.56]; holdItem(x, o, c, hand, true); }
      if (o.hold === 'crozier') { hand = [0.16, -0.6]; holdItem(x, o, c, hand, true); }
      if (!(o.hero && !o.lod)) { x.save(); arm(true, upHold ? 0.42 : 0.12 - s, upHold ? 0.95 : 0.15, o.kind === 'mail' ? c.steel : c.cloth, c.skin, wide); x.restore(); }
      if (o.hold === 'sceptre' && !(o.hero && !o.lod)) holdItem(x, o, c, [0.15, -0.55], true);
      if (o.hero && !o.lod && !back) heroHands(x, o, c);
      if (o.pavise && !back) pavise(x, o, c, true);
    } else {
      const a = upHold ? 0.45 : o.hold === 'sceptre' ? 0.9 : (wk != null ? -0.35 * sw : 0.08), b = upHold ? 1.05 : o.hold === 'sceptre' ? 0.9 : 0.25;
      hand = [0.01 + Math.sin(a) * 0.165 + Math.sin(a + b) * 0.17, -0.795 + Math.cos(a) * 0.165 + Math.cos(a + b) * 0.17];
      if (upHold || o.hold === 'sceptre') holdItem(x, o, c, hand, false);
      arm(true, a, b, o.kind === 'mail' ? c.steel : c.cloth, c.skin, wide);
      if (o.pavise) pavise(x, o, c, false);
    }
    x.restore();
  }
  function shadeHex(h, k) { const A = hexRGB(h); return toHex(A[0] * (1 + k), A[1] * (1 + k), A[2] * (1 + k)); }
  // hands folded on a sceptre held upright before the body (kings), or clasped (queens)
  function heroHands(x, o, c) {
    const F = (col, fn) => { x.fillStyle = col; x.beginPath(); fn(); x.fill(); };
    if (o.hold === 'sceptre' || o.kind === 'robe') { F(c.gold || '#c9a14a', () => x.rect(-0.008, -0.78, 0.016, 0.42)); F(c.gold || '#c9a14a', () => x.arc(0, -0.8, 0.024, 0, TAU)); }
    for (const s of [-1, 1]) F(shadeHex(c.cloth, -0.1), () => { x.moveTo(s * 0.11, -0.74); x.quadraticCurveTo(s * 0.09, -0.62, s * 0.03, -0.585); x.lineTo(s * 0.012, -0.55); x.quadraticCurveTo(s * 0.08, -0.6, s * 0.135, -0.7); x.closePath(); });
    F(shadeHex(c.skin, -0.12), () => { x.ellipse(-0.012, -0.575, 0.026, 0.02, 0.3, 0, TAU); x.ellipse(0.014, -0.565, 0.026, 0.02, -0.3, 0, TAU); });
  }
  function head(x, o, c, front, back) {
    const F = (col, fn) => { x.fillStyle = col; x.beginPath(); fn(); x.fill(); };
    const hy = -0.935, hd = o.head;
    // hair or veil behind the head
    if (hd === 'veil') F(c.veil, () => { if (front) { x.moveTo(-0.07, -0.96); x.quadraticCurveTo(0, -1.04, 0.07, -0.96); x.lineTo(0.1, -0.78); x.quadraticCurveTo(0, -0.74, -0.1, -0.78); x.closePath(); } else { x.moveTo(0.04, -0.995); x.quadraticCurveTo(-0.05, -1.02, -0.075, -0.95); x.quadraticCurveTo(-0.11, -0.86, -0.13, -0.74); x.lineTo(-0.02, -0.76); x.lineTo(0.03, -0.87); x.closePath(); } });
    if (hd === 'hood') F(c.cloth2 || c.cloth, () => { if (front) { x.moveTo(-0.075, -0.86); x.quadraticCurveTo(-0.085, -1.03, 0, -1.035); x.quadraticCurveTo(0.085, -1.03, 0.075, -0.86); x.lineTo(0.11, -0.79); x.lineTo(-0.11, -0.79); x.closePath(); } else { x.moveTo(0.045, -0.87); x.quadraticCurveTo(0.06, -1.02, -0.02, -1.03); x.quadraticCurveTo(-0.1, -1.02, -0.1, -0.92); x.quadraticCurveTo(-0.13, -0.84, -0.12, -0.79); x.lineTo(0.06, -0.79); x.closePath(); } });
    if ((hd === 'hair' || hd === 'crown' || hd === 'circlet' || hd === 'bare') && !o.bald) F(c.hair, () => { if (front) x.ellipse(0, hy - 0.008, 0.055, 0.068, 0, 0, TAU); else x.ellipse(-0.012, hy - 0.006, 0.052, 0.064, -0.2, 0, TAU); });
    // the face
    if (back) { if (hd !== 'hood' && hd !== 'veil' && hd !== 'helm') F(c.hair, () => x.ellipse(0, hy, 0.05, 0.066, 0, 0, TAU)); }
    else if (front) {
      F(c.skin, () => x.ellipse(0, hy + 0.008, 0.045, 0.06, 0, 0, TAU));
      if (o.hero && !o.lod) {
        // a finer face: shaded cheek, brows, eyes, nose, mouth
        const g = x.createRadialGradient(0.012, hy - 0.01, 0.005, 0, hy + 0.01, 0.07); g.addColorStop(0, 'rgba(255,230,210,0.12)'); g.addColorStop(1, 'rgba(40,20,10,0.32)'); x.fillStyle = g; x.beginPath(); x.ellipse(0, hy + 0.008, 0.045, 0.06, 0, 0, TAU); x.fill();
        x.strokeStyle = 'rgba(40,24,14,0.7)'; x.lineWidth = 0.0045; x.lineCap = 'round';
        x.beginPath(); x.moveTo(-0.03, hy - 0.016); x.quadraticCurveTo(-0.018, hy - 0.022, -0.007, hy - 0.016); x.moveTo(0.007, hy - 0.016); x.quadraticCurveTo(0.018, hy - 0.022, 0.03, hy - 0.016); x.stroke();
        x.fillStyle = 'rgba(30,16,10,0.8)'; x.beginPath(); x.ellipse(-0.018, hy - 0.004, 0.008, 0.0042, 0, 0, TAU); x.ellipse(0.018, hy - 0.004, 0.008, 0.0042, 0, 0, TAU); x.fill();
        x.fillStyle = 'rgba(255,240,220,0.5)'; x.beginPath(); x.arc(-0.016, hy - 0.006, 0.0018, 0, TAU); x.arc(0.02, hy - 0.006, 0.0018, 0, TAU); x.fill();
        x.strokeStyle = 'rgba(60,30,18,0.45)'; x.lineWidth = 0.004; x.beginPath(); x.moveTo(0.002, hy - 0.002); x.lineTo(0.006, hy + 0.024); x.lineTo(-0.004, hy + 0.027); x.stroke();
        x.strokeStyle = 'rgba(70,24,16,0.6)'; x.lineWidth = 0.004; x.beginPath(); x.moveTo(-0.012, hy + 0.04); x.quadraticCurveTo(0, hy + 0.043, 0.012, hy + 0.04); x.stroke();
      }
      else if (!o.lod) { x.fillStyle = 'rgba(20,10,6,0.55)'; x.beginPath(); x.ellipse(-0.017, hy, 0.007, 0.004, 0, 0, TAU); x.ellipse(0.017, hy, 0.007, 0.004, 0, 0, TAU); x.fill();
      x.fillStyle = 'rgba(40,20,10,0.25)'; x.beginPath(); x.moveTo(0, hy + 0.005); x.lineTo(0.006, hy + 0.025); x.lineTo(-0.004, hy + 0.027); x.closePath(); x.fill(); }
      if (o.beard) { F(c.beard || c.hair, () => { x.moveTo(-0.044, hy + 0.0); x.quadraticCurveTo(-0.046, hy + 0.06, -0.016, hy + 0.083); x.quadraticCurveTo(0, hy + 0.09, 0.016, hy + 0.083); x.quadraticCurveTo(0.046, hy + 0.06, 0.044, hy + 0.0); x.quadraticCurveTo(0.03, hy + 0.04, 0.012, hy + 0.034); x.quadraticCurveTo(0, hy + 0.05, -0.012, hy + 0.034); x.quadraticCurveTo(-0.03, hy + 0.04, -0.044, hy + 0.0); x.closePath(); }); if (o.hero && !o.lod) { x.strokeStyle = 'rgba(0,0,0,0.18)'; x.lineWidth = 0.003; for (const bx of [-0.03, -0.015, 0, 0.015, 0.03]) { x.beginPath(); x.moveTo(bx, hy + 0.045); x.lineTo(bx * 0.8, hy + 0.078); x.stroke(); } } }
    } else {
      F(c.skin, () => { x.ellipse(0.006, hy + 0.004, 0.044, 0.06, 0, 0, TAU); x.moveTo(0.042, hy - 0.012); x.lineTo(0.06, hy + 0.012); x.lineTo(0.044, hy + 0.022); x.closePath(); });
      x.fillStyle = 'rgba(20,10,6,0.55)'; x.beginPath(); x.ellipse(0.028, hy - 0.004, 0.006, 0.004, 0, 0, TAU); x.fill();
      if (o.beard) F(c.beard || c.hair, () => { x.moveTo(0.044, hy + 0.03); x.quadraticCurveTo(0.04, hy + 0.075, 0.004, hy + 0.072); x.quadraticCurveTo(-0.02, hy + 0.05, -0.015, hy + 0.025); x.closePath(); });
    }
    // what sits on the head
    const gold = (path) => K.gold(x, path, -0.07, -1.1, 0.07, -0.9, { sheen: o.sheen != null ? o.sheen : 0.5, outline: false });
    if (hd === 'crown' || hd === 'circlet' || o.crown2) {
      const y0 = hd === 'veil' || o.crown2 ? -0.985 : -0.975, w = front ? 0.056 : 0.05, hh = hd === 'circlet' ? 0.022 : 0.05;
      const path = q => { q.beginPath(); q.moveTo(-w, y0); if (hd === 'circlet') { q.lineTo(-w, y0 - hh); q.lineTo(w, y0 - hh); } else if (front) { q.lineTo(-w, y0 - hh * 0.7); q.lineTo(-w * 0.6, y0 - hh * 0.35); q.lineTo(-w * 0.3, y0 - hh); q.lineTo(0, y0 - hh * 0.4); q.lineTo(w * 0.3, y0 - hh); q.lineTo(w * 0.6, y0 - hh * 0.35); q.lineTo(w, y0 - hh * 0.7); } else { q.lineTo(-w, y0 - hh * 0.75); q.lineTo(-w * 0.4, y0 - hh * 0.35); q.lineTo(0.005, y0 - hh); q.lineTo(w * 0.5, y0 - hh * 0.35); q.lineTo(w, y0 - hh * 0.7); } q.lineTo(w, y0); q.closePath(); };
      if (o.iron) { x.fillStyle = c.steel; path(x); x.fill(); } else gold(path);
    }
    if (hd === 'mitre') {
      F(c.mitre || '#efe7d6', () => { if (front) { x.moveTo(-0.05, -0.975); x.quadraticCurveTo(-0.06, -1.1, 0, -1.19); x.quadraticCurveTo(0.06, -1.1, 0.05, -0.975); x.closePath(); } else { x.moveTo(-0.045, -0.975); x.quadraticCurveTo(-0.055, -1.1, -0.005, -1.18); x.quadraticCurveTo(0.05, -1.1, 0.045, -0.975); x.closePath(); } });
      x.fillStyle = c.gold || '#c9a14a'; x.fillRect(-0.05, -0.99, 0.1, 0.018); x.fillRect(-0.006, -1.17, 0.012, 0.18);
      if (!front || back) F(c.mitre || '#efe7d6', () => { x.moveTo(-0.04, -0.975); x.lineTo(-0.055, -0.86); x.lineTo(-0.035, -0.86); x.lineTo(-0.025, -0.97); x.closePath(); });
    }
    if (hd === 'kettle') F(c.steel, () => { const w = front ? 0.1 : 0.095; x.moveTo(-w, -0.955); x.quadraticCurveTo(0, -0.985, w, -0.955); x.lineTo(w * 0.55, -0.975); x.quadraticCurveTo(0, -1.08, -w * 0.55, -0.975); x.closePath(); });
    if (hd === 'helm') {
      F(c.steel, () => { if (front) { x.moveTo(-0.055, -0.86); x.lineTo(-0.058, -1.0); x.quadraticCurveTo(0, -1.035, 0.058, -1.0); x.lineTo(0.055, -0.86); x.closePath(); } else { x.moveTo(-0.055, -0.86); x.lineTo(-0.058, -1.0); x.quadraticCurveTo(0, -1.03, 0.055, -1.0); x.lineTo(0.062, -0.9); x.lineTo(0.055, -0.86); x.closePath(); } });
      x.fillStyle = 'rgba(0,0,0,0.75)'; if (front) { x.fillRect(-0.045, -0.952, 0.09, 0.009); x.fillRect(-0.004, -0.952, 0.008, 0.07); } else x.fillRect(0.012, -0.952, 0.05, 0.008);
      if (o.crest) { x.fillStyle = o.crest; x.beginPath(); if (front) { x.moveTo(-0.012, -1.02); x.lineTo(-0.02, -1.1); x.quadraticCurveTo(0, -1.15, 0.02, -1.1); x.lineTo(0.012, -1.02); } else { x.moveTo(-0.02, -1.02); x.quadraticCurveTo(-0.03, -1.12, 0.02, -1.14); x.quadraticCurveTo(0.07, -1.13, 0.075, -1.1); x.lineTo(0.03, -1.095); x.lineTo(0.025, -1.02); } x.closePath(); x.fill(); }
    }
    if (hd === 'coif') F(c.steel, () => { if (front) { x.moveTo(-0.06, -0.85); x.quadraticCurveTo(-0.07, -1.0, 0, -1.005); x.quadraticCurveTo(0.07, -1.0, 0.06, -0.85); x.lineTo(0.04, -0.85); x.quadraticCurveTo(0.045, -0.96, 0, -0.965); x.quadraticCurveTo(-0.045, -0.96, -0.04, -0.85); x.closePath(); } else { x.moveTo(0.03, -0.87); x.quadraticCurveTo(0.05, -1.0, -0.01, -1.0); x.quadraticCurveTo(-0.075, -0.99, -0.07, -0.88); x.lineTo(-0.08, -0.82); x.lineTo(0.03, -0.83); x.closePath(); } });
    if (hd === 'cap') F(c.cloth2 || c.cloth, () => { x.ellipse(0, -0.975, 0.055, 0.03, 0, Math.PI, 0); x.rect(-0.058, -0.978, 0.116, 0.014); });
  }
  function holdItem(x, o, c, hand, front) {
    const F = (col, fn) => { x.fillStyle = col; x.beginPath(); fn(); x.fill(); };
    const [hx, hy] = hand;
    if (o.hold === 'spear' || o.hold === 'lance') {
      const top = -1.42, bot = 0.0;
      F(c.wood, () => x.rect(hx - 0.009, top, 0.018, bot - top));
      F(c.steel, () => { x.moveTo(hx, top - 0.13); x.quadraticCurveTo(hx + 0.028, top - 0.06, hx + 0.012, top + 0.005); x.lineTo(hx - 0.012, top + 0.005); x.quadraticCurveTo(hx - 0.028, top - 0.06, hx, top - 0.13); x.closePath(); });
      if (o.pennant) F(o.pennant, () => { const w = o.t ? Math.sin(o.t * 3) * 0.02 : 0; x.moveTo(hx + 0.009, top + 0.02); x.quadraticCurveTo(hx + 0.12, top + 0.04 + w, hx + 0.22, top + 0.06 + w * 2); x.lineTo(hx + 0.009, top + 0.13); x.closePath(); });
    }
    if (o.hold === 'crozier') {
      const top = -1.16;
      F(c.gold, () => x.rect(hx - 0.009, top, 0.018, -top));
      x.strokeStyle = c.gold; x.lineWidth = 0.016; x.lineCap = 'round'; x.beginPath(); x.moveTo(hx, top); x.bezierCurveTo(hx, top - 0.09, hx + 0.09, top - 0.1, hx + 0.085, top - 0.03); x.quadraticCurveTo(hx + 0.08, top + 0.0, hx + 0.045, top - 0.01); x.stroke();
    }
    if (o.hold === 'sceptre') { F(c.gold, () => x.rect(hx - 0.007, hy - 0.26, 0.014, 0.3)); F(c.gold, () => x.arc(hx, hy - 0.27, 0.022, 0, TAU)); }
    void front;
  }
  function pavisePath2(x, cx, top, bot, hw) { x.beginPath(); x.moveTo(cx - hw, top + hw * 0.35); x.quadraticCurveTo(cx - hw, top, cx, top - hw * 0.06); x.quadraticCurveTo(cx + hw, top, cx + hw, top + hw * 0.35); x.lineTo(cx + hw * 0.94, bot - hw * 0.3); x.lineTo(cx, bot); x.lineTo(cx - hw * 0.94, bot - hw * 0.3); x.closePath(); }
  function pavise(x, o, c, front) {
    const cx = front ? 0.0 : 0.115, top = -0.79, bot = -0.17, hw = front ? 0.15 : 0.035;
    pavisePath2(x, cx, top, bot, hw); x.fillStyle = c.field; x.fill();
    if (front && o.pavise && o.pavise.device !== 'none') { x.save(); pavisePath2(x, cx, top, bot, hw); x.clip(); x.globalAlpha *= o.armsA != null ? o.armsA : 1; x.fillStyle = c.charge; K.device(x, o.pavise.device, cx, (top + bot) / 2 - 0.03, hw * 1.25); x.restore(); }
    // the shield's curve catches light on one side
    x.save(); pavisePath2(x, cx, top, bot, hw); x.clip(); const g = x.createLinearGradient(cx - hw, 0, cx + hw, 0); g.addColorStop(0, 'rgba(255,240,210,0.16)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.3)'); x.fillStyle = g; x.fillRect(cx - hw, top - 0.05, hw * 2, bot - top + 0.1); x.restore();
    pavisePath2(x, cx, top, bot, hw); x.strokeStyle = c.gold; x.lineWidth = front ? 0.012 : 0.008; x.stroke();
  }

  // the horse seen from the front or behind (K.horse draws the profile)
  function horseFront(x, coat, cap, back, headOnly) {
    const F = (col, fn) => { x.fillStyle = col; x.beginPath(); fn(); x.fill(); };
    if (headOnly) {
      // the horse's head and neck stand in front of the rider's body
      F(shadeHex(coat, -0.12), () => { x.moveTo(-0.1, -0.98); x.lineTo(0.1, -0.98); x.lineTo(0.07, -1.2); x.lineTo(-0.07, -1.2); x.closePath(); });
      F(coat, () => { x.moveTo(-0.07, -1.47); x.quadraticCurveTo(0, -1.51, 0.07, -1.47); x.lineTo(0.052, -1.1); x.quadraticCurveTo(0, -1.05, -0.052, -1.1); x.closePath(); });
      F(shadeHex(coat, -0.25), () => { x.moveTo(-0.06, -1.45); x.lineTo(-0.085, -1.56); x.lineTo(-0.035, -1.49); x.closePath(); x.moveTo(0.06, -1.45); x.lineTo(0.085, -1.56); x.lineTo(0.035, -1.49); x.closePath(); });
      F(shadeHex(coat, 0.15), () => { x.moveTo(-0.012, -1.46); x.lineTo(0.012, -1.46); x.lineTo(0.008, -1.15); x.lineTo(-0.008, -1.15); x.closePath(); });
      x.fillStyle = 'rgba(0,0,0,0.6)'; x.beginPath(); x.ellipse(-0.052, -1.36, 0.011, 0.008, 0, 0, TAU); x.ellipse(0.052, -1.36, 0.011, 0.008, 0, 0, TAU); x.ellipse(-0.022, -1.1, 0.01, 0.012, 0, 0, TAU); x.ellipse(0.022, -1.1, 0.01, 0.012, 0, 0, TAU); x.fill();
      if (cap && cap.device !== 'none') F(cap.field, () => { x.moveTo(-0.075, -1.47); x.lineTo(0.075, -1.47); x.lineTo(0.06, -1.3); x.lineTo(-0.06, -1.3); x.closePath(); });
      return;
    }
    for (const s of [-1, 1]) F(shadeHex(coat, s < 0 ? -0.2 : 0), () => { x.moveTo(s * 0.09, -0.62); x.lineTo(s * 0.17, -0.62); x.lineTo(s * 0.15, -0.06); x.lineTo(s * 0.1, -0.06); x.closePath(); x.rect(s > 0 ? 0.095 : -0.155, -0.07, 0.06, 0.07); });
    F(coat, () => x.ellipse(0, -0.8, back ? 0.27 : 0.23, 0.25, 0, 0, TAU));
    if (back) F(shadeHex(coat, -0.3), () => { x.moveTo(-0.03, -0.98); x.quadraticCurveTo(0.02, -0.7, -0.01, -0.42); x.lineTo(0.03, -0.42); x.quadraticCurveTo(0.06, -0.7, 0.03, -0.98); x.closePath(); });
    if (cap) {
      F(cap.field, () => { x.moveTo(-0.28, -1.0); x.lineTo(0.28, -1.0); x.lineTo(0.3, -0.48); for (let k = 0; k <= 8; k++) x.lineTo(lerp(0.3, -0.3, k / 8), -0.46 + (k % 2) * 0.04); x.closePath(); });
      if (cap.device && cap.device !== 'none') { x.fillStyle = cap.charge; K.device(x, cap.device, 0, -0.73, 0.14); }
    }
  }
  // a fire: tongues of flame swaying on the noise, bright at the root (additive). s = metres to pixels
  function flame(ctx, x, y, s, tw, amt = 1) {
    if (s < 0.4 || amt <= 0) return;
    if (s < 9) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; const h2 = s * (0.8 + 0.3 * K.noise(tw * 2, 1, 61)) * clamp(amt, 0, 1.4); ctx.fillStyle = 'rgba(255,170,80,0.55)'; ctx.beginPath(); ctx.ellipse(x, y - h2 * 0.4, s * 0.38, h2 * 0.55, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,240,200,0.7)'; ctx.beginPath(); ctx.ellipse(x, y - h2 * 0.2, s * 0.18, h2 * 0.28, 0, 0, TAU); ctx.fill(); ctx.restore(); return; }
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


  // ================================================================ helpers adapted from the intro's last scene (rim-lit silhouettes, fog, finish)
  function view(ctx, c, d = 1) {
    const z = 1 + (c.z - 1) * d;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(W / 2, H / 2);
    if (c.r) ctx.rotate(c.r * Math.min(1, d)); ctx.scale(z, z); ctx.translate(-W / 2 - c.x * d, -H / 2 - c.y * d);
  }
  // project a point of a layer at depth d to the screen (no roll)
  function proj(c, d, x, y) { const z = 1 + (c.z - 1) * d; return [W / 2 + (x - W / 2 - c.x * d) * z, H / 2 + (y - H / 2 - c.y * d) * z, z]; }
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const flick = (t, s, sp = 9) => 0.78 + 0.14 * Math.sin(t * sp + s * 3.7) + 0.1 * Math.sin(t * sp * 2.3 + s * 1.3) + 0.06 * (K.noise(t * 6, s * 7.1, 3) - 0.5) * 2;

  // a soft round light, cached per colour; drawn additively
  function glowImg(rgb) {
    return K.cached('p5s:glow:' + rgb, () => {
      const s = 128, c = K.canvas(s, s), x = c.getContext('2d'), g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, rgbs(rgb, 1)); g.addColorStop(0.12, rgbs(rgb, 0.62)); g.addColorStop(0.35, rgbs(rgb, 0.2)); g.addColorStop(0.65, rgbs(rgb, 0.06)); g.addColorStop(1, rgbs(rgb, 0));
      x.fillStyle = g; x.fillRect(0, 0, s, s); return c;
    });
  }
  function glow(ctx, rgb, x, y, r, a) {
    if (a <= 0.004 || r < 0.5) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowImg(rgb), x - r, y - r, 2 * r, 2 * r); ctx.restore();
  }
  // a tinted copy of a white-alpha canvas
  function tinted(img, rgb, key) {
    return K.cached('p5s:tint:' + key + ':' + rgb, () => {
      const c = K.canvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
      x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${rgb})`; x.fillRect(0, 0, c.width, c.height); return c;
    });
  }
  // a small flame: a teardrop of fire with a hot core, licking upward; (x, y) is its base, s its height
  function flame7(ctx, x, y, s, t, seed, heat = 1) {
    if (s < 1.5) { glow(ctx, [255, 190, 110], x, y - s * 0.4, s * 2, 0.7 * heat); return; }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const ph = seed * 1.7 + k * 2.1, sw = Math.sin(t * 7.3 + ph) * 0.18 + (K.noise(t * 5, seed + k, 9) - 0.5) * 0.35;
      const hh = s * (1 - k * 0.22) * (0.85 + 0.25 * K.noise(t * 6.5 + k * 3, seed, 4)), ww = s * (0.36 - k * 0.07);
      const col = k === 0 ? [235, 96, 30] : k === 1 ? [255, 158, 60] : [255, 236, 190];
      ctx.globalAlpha = (k === 0 ? 0.6 : k === 1 ? 0.75 : 0.9) * heat;
      ctx.fillStyle = rgbs(col, 1);
      ctx.beginPath(); ctx.moveTo(x - ww, y);
      ctx.bezierCurveTo(x - ww * 1.1, y - hh * 0.45, x + sw * ww * 2 - ww * 0.3, y - hh * 0.7, x + sw * s * 0.5, y - hh);
      ctx.bezierCurveTo(x + sw * ww * 2 + ww * 0.3, y - hh * 0.7, x + ww * 1.1, y - hh * 0.45, x + ww, y);
      ctx.quadraticCurveTo(x, y + ww * 0.5, x - ww, y); ctx.fill();
    }
    ctx.restore();
  }
  // rimLit(ctx, draw, o): silhouettes lit along one edge. draw(c, fill) paints them in a colour; a dark pass shifted by
  // (o.dx, o.dy) screen px covers all but a sliver, which is the rim. o.rim, o.mid (an inner, dimmer rim), o.dark
  function rimLit(ctx, draw, o) {
    const n = o.steps || 4, bx = o.box ? Math.max(0, Math.floor(o.box[0])) : 0, by = o.box ? Math.max(0, Math.floor(o.box[1])) : 0;
    const bw = o.box ? Math.max(1, Math.min(W - bx, Math.ceil(o.box[2]))) : W, bh = o.box ? Math.max(1, Math.min(H - by, Math.ceil(o.box[3]))) : H;
    const L = K.layer(o.box ? 'p5s:rimb:' + (o.key || 'k') : 'p5s:rim', bw, bh), lc = L.getContext('2d'), m = ctx.getTransform();
    lc.setTransform(m.a, m.b, m.c, m.d, m.e - bx, m.f - by); draw(lc, o.rim);
    lc.globalCompositeOperation = 'source-atop';
    // dark passes pushed progressively further from the light: the rim fades into the body instead of outlining it
    for (let i = 1; i <= n; i++) { const k = i / n; lc.setTransform(m.a, m.b, m.c, m.d, m.e - bx + o.dx * k, m.f - by + o.dy * k); lc.globalAlpha = i === n ? 1 : 0.42; draw(lc, i === 1 && o.mid ? o.mid : o.dark); }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if (o.alpha != null) ctx.globalAlpha = o.alpha; ctx.drawImage(L, bx, by); ctx.restore();
  }
  // cheap bloom: the frame shrunk twice, its brights raised, laid back over it with screen
  function bloom7(ctx, a = 0.3, th = 2) {
    if (a <= 0) return;
    const A = K.layer('p5s:bl1', W / 4, H / 4), B = K.layer('p5s:bl2', W / 8, H / 8), ax = A.getContext('2d'), bx = B.getContext('2d');
    ax.imageSmoothingQuality = 'low'; ax.drawImage(ctx.canvas, 0, 0, W / 4, H / 4);
    bx.drawImage(A, 0, 0, W / 8, H / 8);
    bx.globalCompositeOperation = 'multiply'; for (let i = 0; i < th; i++) bx.drawImage(B, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = a; ctx.imageSmoothingQuality = 'medium'; ctx.drawImage(B, 0, 0, W, H); ctx.restore();
  }
  // a horizontal band of mist (tileable texture), scrolled
  function fogTex(seed) {
    return K.cached('p5s:fog:' + seed, () => {
      const w = 512, h = 128, c = K.canvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const u = i / w, f = K.fbm(i / 70, j / 34, 4, seed) * (1 - u) + K.fbm((i - w) / 70, j / 34, 4, seed) * u, v = Math.sin(Math.PI * j / h);
        const k = (j * w + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = 255 * clamp((f - 0.3) * 2.4) * v * v;
      }
      x.putImageData(img, 0, 0); return c;
    });
  }
  function fog(ctx, seed, rgb, y, h, scroll, a, x0 = -200, w = W + 400) {
    if (a <= 0) return; const tex = tinted(fogTex(seed), rgb, 'fog' + seed), tw = h * 4;
    ctx.save(); ctx.globalAlpha = a; for (let X = x0 - (((scroll % tw) + tw) % tw); X < x0 + w; X += tw) ctx.drawImage(tex, X, y, tw + 1, h); ctx.restore();
  }
  // rain: streaks at three depths; near lights they warm and brighten. o.n, o.angle, o.speed, o.len, o.alpha, o.lights [{x,y,r,rgb,a}]
  function vignetteImg(a, inner) {
    const qa = Math.round(a * 40) / 40, qi = Math.round(inner * 40) / 40;
    return K.cached(`p5s:vig:${qa}:${qi}`, () => { const c = K.canvas(W, H), x = c.getContext('2d'); K.vignette(x, qa, '0,0,0', qi); return c; });
  }
  let MIXING = false;   // while two shots dissolve, each skips its bloom and the mix gets one
  function finish(ctx, o = {}) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (o.bloom && !MIXING) bloom7(ctx, o.bloom, o.bloomTh || 2);
    // a cold cast in the shadows: a pale wash multiplied over the frame (cheaper than a soft-light grade)
    if (o.shadow) { const n = parseInt(o.shadow.slice(1), 16), k = (o.shadowA || 0.3) * 0.55, m = (v) => Math.round(255 - (255 - v) * k); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${m(n >> 16 & 255) + 0},${m(n >> 8 & 255)},${m(n & 255)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (o.warm) K.grade(ctx, o.warm, 'overlay', o.warmA || 0.08);
    ctx.drawImage(vignetteImg(o.vig != null ? o.vig : 0.6, o.vigIn != null ? o.vigIn : 0.32), 0, 0);
    if (o.lift) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgbs(o.lift, 1); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }

  function sil(ctx, o) {
    const f = o.face || 1, h = o.h, bulk = o.bulk || 1, kid = !!o.child;
    const TH = kid ? 0.2 : 0.245, SH = kid ? 0.2 : 0.235, TOR = kid ? 0.29 : 0.31, UA = kid ? 0.15 : 0.175, FA = kid ? 0.13 : 0.155, HR = kid ? 0.085 : 0.062;
    // legs (forward kinematics from the hip; the lower foot is put on the ground)
    const legPose = (s) => {
      if (o.sit) return s ? [1.45, 1.5] : [1.35, 1.35];
      if (o.walk != null) { const ph = o.walk + (s ? Math.PI : 0); return [0.38 * Math.sin(ph), 0.08 + 0.75 * Math.max(0, Math.cos(ph + 0.4))]; }
      return (s ? o.legF : o.legN) || (s ? [-0.06, 0.04] : [0.07, 0.03]);
    };
    const legs = [0, 1].map(s => { const [a1, b1] = legPose(s), kx = Math.sin(a1) * TH, ky = Math.cos(a1) * TH, a2 = a1 - b1, ax = kx + Math.sin(a2) * SH, ay = ky + Math.cos(a2) * SH; return { kx, ky, ax, ay, a2 }; });
    const lowest = o.sit ? 0 : Math.max(legs[0].ay, legs[1].ay) + 0.03;
    const hipY = o.sit ? -o.sit : -lowest;          // hip height above the ground (in h)
    const lean = (o.lean || 0) + (o.stoop || 0) * 0.5, dir = [Math.sin(lean), -Math.cos(lean)];
    const P = (lx, ly) => [o.x + f * lx * h, o.y + ly * h];     // local (h units, x forward) to ctx units
    const hip = [0, hipY], neck = [hip[0] + dir[0] * TOR, hip[1] + dir[1] * TOR];
    const sh = [neck[0] - dir[0] * 0.035 - 0.012, neck[1] - dir[1] * 0.035];
    const fillC = o.fill || '#000';
    ctx.save(); ctx.fillStyle = fillC; ctx.strokeStyle = fillC; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const cap = (a, b, ra, rb) => {   // a tapered capsule between two local points (quad and end discs filled apart)
      const A = P(a[0], a[1]), B = P(b[0], b[1]), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, r1 = ra * h, r2 = rb * h;
      ctx.beginPath(); ctx.moveTo(A[0] + nx * r1, A[1] + ny * r1); ctx.lineTo(B[0] + nx * r2, B[1] + ny * r2); ctx.lineTo(B[0] - nx * r2, B[1] - ny * r2); ctx.lineTo(A[0] - nx * r1, A[1] - ny * r1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(A[0] + r1, A[1]); ctx.arc(A[0], A[1], r1, 0, TAU); ctx.moveTo(B[0] + r2, B[1]); ctx.arc(B[0], B[1], r2, 0, TAU); ctx.fill();
    };
    const poly = (pts) => { ctx.beginPath(); pts.forEach((p, i) => { const q = P(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill(); };
    const curve = (pts) => { // closed smooth shape through local points (quadratic midpoints)
      const Q = pts.map(p => P(p[0], p[1])), n = Q.length; ctx.beginPath(); ctx.moveTo((Q[n - 1][0] + Q[0][0]) / 2, (Q[n - 1][1] + Q[0][1]) / 2);
      for (let i = 0; i < n; i++) { const a = Q[i], b = Q[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } ctx.closePath(); ctx.fill();
    };
    // arms: angles, or IK toward a target
    const armAt = (near) => {
      const S = [sh[0] + (near ? 0.01 : -0.02), sh[1] + (near ? 0 : 0.005)];
      const tgt = near ? o.reachN : o.reachF;
      if (tgt) {
        const T = [(tgt[0] - o.x) / (f * h), (tgt[1] - o.y) / h], dx = T[0] - S[0], dy = T[1] - S[1], d = clamp(Math.hypot(dx, dy), 0.05, UA + FA - 0.002);
        const base = Math.atan2(dx, dy), cosE = clamp((UA * UA + d * d - FA * FA) / (2 * UA * d), -1, 1), ang = base + Math.acos(cosE) * (o.elbowOut ? -1 : 1);
        const E = [S[0] + Math.sin(ang) * UA, S[1] + Math.cos(ang) * UA], el = Math.hypot(T[0] - E[0], T[1] - E[1]) || 1, wr = [E[0] + (T[0] - E[0]) / el * FA, E[1] + (T[1] - E[1]) / el * FA];
        return { S, E, wr };
      }
      const [a, b] = (near ? o.armN : o.armF) || (o.walk != null ? [(near ? -0.35 : 0.35) * Math.sin(o.walk), 0.25] : [near ? 0.08 : -0.06, 0.18]);
      const E = [S[0] + Math.sin(a) * UA, S[1] + Math.cos(a) * UA], wr = [E[0] + Math.sin(a + b) * FA, E[1] + Math.cos(a + b) * FA];
      return { S, E, wr };
    };
    const AN = armAt(true), AF = armAt(false);
    const limbW = (kid ? 0.03 : 0.037) * bulk, armW = (kid ? 0.027 : 0.033) * bulk;
    const drawArm = (A) => { cap(A.S, A.E, armW * 1.05, armW * 0.85); cap(A.E, A.wr, armW * 0.85, armW * 0.62); const hd = [A.wr[0] + (A.wr[0] - A.E[0]) * 0.18, A.wr[1] + (A.wr[1] - A.E[1]) * 0.18]; cap(A.wr, hd, armW * 0.75, armW * 0.62); };
    const drawLeg = (lg) => { const K2 = [hip[0] + lg.kx, hip[1] + lg.ky], A2 = [hip[0] + lg.ax, hip[1] + lg.ay]; cap([hip[0], hip[1] - 0.02], K2, limbW * 1.35, limbW); cap(K2, A2, limbW, limbW * 0.7); poly([[A2[0] - 0.03, A2[1] - 0.012], [A2[0] + 0.075, A2[1] + 0.006], [A2[0] + 0.08, A2[1] + 0.03], [A2[0] - 0.035, A2[1] + 0.03]]); return { K2, A2 }; };
    // the far side first: far leg, far arm, a cloak behind
    const farLeg = drawLeg(legs[1]);
    if (o.dress === 'cloak') { const sw = Math.sin((o.t || 0) * 1.3 + o.x * 0.01) * 0.02 + (o.wind || 0); curve([[sh[0] + 0.02, sh[1] - 0.01], [sh[0] - 0.09, sh[1] + 0.02], [hip[0] - 0.13 - sw, hip[1] + 0.05], [hip[0] - 0.17 - sw * 2, hip[1] + 0.36], [hip[0] + 0.03, hip[1] + 0.3], [hip[0] + 0.04, hip[1]]]); }
    drawArm(AF);
    // torso, with chest and back
    const nrm = [-dir[1], dir[0]], at = (k, w) => [hip[0] + dir[0] * TOR * k + nrm[0] * w, hip[1] + dir[1] * TOR * k + nrm[1] * w];
    const st = (o.stoop || 0);
    curve([at(-0.02, -0.07 * bulk), at(0.35, -0.066 * bulk), at(0.72, -0.08 * bulk - st * 0.06), at(0.97, -0.07 * bulk - st * 0.05), at(1.05, -0.01), at(1.0, 0.065 * bulk), at(0.74, 0.082 * bulk), at(0.42, 0.068 * bulk), at(-0.02, 0.072 * bulk)]);
    // neck and head
    const hd = [neck[0] + dir[0] * 0.07 + Math.sin(lean + (o.tilt || 0)) * 0.02 + st * 0.03, neck[1] + dir[1] * 0.06 - 0.02];
    cap(neck, [hd[0], hd[1] + 0.03], 0.028, 0.026);
    { const q = P(hd[0], hd[1]); ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(f, 1); ctx.rotate(lean * 0.5 + (o.tilt || 0)); const r = HR * h;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.92, r * 1.12, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.8, -r * 0.25); ctx.lineTo(r * 1.12, r * 0.12); ctx.lineTo(r * 0.82, r * 0.38); ctx.quadraticCurveTo(r * 0.7, r * 0.95, r * 0.15, r * 1.08); ctx.lineTo(0, r * 0.5); ctx.closePath(); ctx.fill();
      if (o.beard) { ctx.beginPath(); ctx.moveTo(r * 0.85, r * 0.45); ctx.quadraticCurveTo(r * 0.75, r * (1.6 + o.beard), r * 0.1, r * (1.75 + o.beard * 1.4)); ctx.quadraticCurveTo(-r * 0.1, r * 0.9, -r * 0.2, r * 0.5); ctx.closePath(); ctx.fill(); }
      const hat = o.hat || 'bare';
      if (hat === 'hair' || hat === 'bare') { ctx.beginPath(); ctx.ellipse(-r * 0.18, -r * 0.18, r * 1.0, r * 1.02, -0.3, 0, TAU); ctx.fill(); if (o.long) { ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.2); ctx.quadraticCurveTo(-r * 1.3, r * 1.4, -r * 0.6, r * 2.4); ctx.lineTo(-r * 0.1, r * 1.2); ctx.closePath(); ctx.fill(); } }
      if (hat === 'hood') { ctx.beginPath(); ctx.moveTo(r * 0.95, r * 0.7); ctx.quadraticCurveTo(r * 1.5, -r * 1.25, -r * 0.1, -r * 1.42); ctx.quadraticCurveTo(-r * 1.6, -r * 1.3, -r * 1.75, r * 0.2); ctx.quadraticCurveTo(-r * 2.1, r * 1.6, -r * 1.2, r * 2.2); ctx.lineTo(r * 1.0, r * 1.7); ctx.closePath(); ctx.fill(); }
      if (hat === 'kettle') { ctx.beginPath(); ctx.moveTo(-r * 1.85, -r * 0.18); ctx.quadraticCurveTo(0, -r * 0.55, r * 1.85, -r * 0.18); ctx.lineTo(r * 0.95, -r * 0.55); ctx.quadraticCurveTo(0, -r * 1.85, -r * 0.95, -r * 0.55); ctx.closePath(); ctx.fill(); }
      if (hat === 'helm') { ctx.beginPath(); ctx.moveTo(-r * 1.08, r * 0.2); ctx.quadraticCurveTo(-r * 1.15, -r * 1.3, r * 0.05, -r * 1.75); ctx.quadraticCurveTo(r * 1.15, -r * 1.3, r * 1.08, r * 0.2); ctx.closePath(); ctx.fill(); ctx.fillRect(r * 0.62, -r * 0.3, r * 0.3, r * 1.1); }
      if (hat === 'cap') { ctx.beginPath(); ctx.ellipse(-r * 0.1, -r * 0.5, r * 1.1, r * 0.75, -0.15, Math.PI, 0); ctx.fill(); }
      if (hat === 'veil') { ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.6); ctx.quadraticCurveTo(r * 0.2, -r * 1.6, -r * 1.0, -r * 0.8); ctx.quadraticCurveTo(-r * 2.0, r * 1.2, -r * 1.6, r * 3.2); ctx.lineTo(-r * 0.2, r * 2.6); ctx.quadraticCurveTo(r * 0.3, r * 1.0, r * 0.9, -r * 0.6); ctx.closePath(); ctx.fill(); }
      ctx.restore(); }
    // near leg, the dress over the legs, then the near arm
    const nearLeg = drawLeg(legs[0]);
    const kneeY = hip[1] + TH * 0.95, hemFront = Math.max(nearLeg.K2[0], farLeg.K2[0]) + 0.06, hemBack = Math.min(nearLeg.K2[0], farLeg.K2[0], 0) - 0.07;
    const waist = at(0.42, 0);
    if (o.sit && o.dress) {   // seated: the skirts lie along the thighs and fall from the knees
      const K2 = nearLeg.K2, A2 = nearLeg.A2, long = o.dress === 'robe' || o.dress === 'gown', hy2 = long ? A2[1] - 0.01 : K2[1] + 0.13;
      curve([at(0.55, 0.078 * bulk), [K2[0] + 0.035, K2[1] - 0.045], [K2[0] + 0.065, K2[1] + 0.02], [K2[0] + 0.07, hy2], [K2[0] - 0.07, hy2 + 0.01], [K2[0] - 0.05, K2[1] + 0.04], [hip[0] - 0.02, hip[1] + 0.05], [hip[0] - 0.095, hip[1] + 0.035], [hip[0] - 0.09, hip[1] - 0.06], at(0.55, -0.08 * bulk)]);
    } else if (o.dress === 'tunic' || o.dress === 'cloak' || o.dress === 'apron' || o.dress === 'mail') {
      const hy = o.dress === 'mail' ? kneeY - 0.04 : kneeY + 0.01;
      curve([at(0.5, 0.075 * bulk), [hemFront + 0.01, hy - 0.04], [hemFront + 0.025, hy + 0.01], [(hemFront + hemBack) / 2, hy + 0.03], [hemBack - 0.025, hy + 0.01], [hemBack - 0.005, hy - 0.05], at(0.5, -0.075 * bulk)]);
    }
    if (!o.sit && (o.dress === 'robe' || o.dress === 'gown')) {
      const hy = -0.02, fr = Math.max(nearLeg.A2[0], farLeg.A2[0]) + 0.09, bk = Math.min(nearLeg.A2[0], farLeg.A2[0]) - 0.08 - (o.dress === 'robe' ? 0.03 : 0);
      curve([at(0.55, 0.076 * bulk), [fr - 0.02, kneeY], [fr + 0.025, hy - 0.01], [(fr + bk) / 2, hy + 0.015], [bk - 0.035, hy], [bk, kneeY], at(0.55, -0.08 * bulk)]);
    }
    if (o.dress === 'apron') curve([at(0.85, 0.075), [hemFront + 0.04, kneeY - 0.05], [hemFront + 0.045, kneeY + 0.04], [hemFront - 0.06, kneeY + 0.05], at(0.5, 0.05)]);
    if (o.belt !== false && o.dress !== 'robe' && o.dress !== 'gown') { const w1 = at(0.42, 0.074 * bulk), w2 = at(0.42, -0.074 * bulk); cap(w1, w2, 0.012, 0.012); }
    void waist;
    // what the near hand holds
    const hand = AN.wr, out = { head: P(hd[0], hd[1]), hand: P(hand[0], hand[1]), handF: P(AF.wr[0], AF.wr[1]) };
    const pole = (top, bot, w) => cap(top, bot, w, w);
    if (o.hold === 'spear') { pole([hand[0], hand[1] - 0.8], [hand[0], hand[1] + 0.42], 0.008); poly([[hand[0], hand[1] - 0.94], [hand[0] + 0.022, hand[1] - 0.84], [hand[0], hand[1] - 0.78], [hand[0] - 0.022, hand[1] - 0.84]]); }
    if (o.hold === 'staff') { pole([hand[0] + 0.01, hand[1] - 0.12], [hand[0] + 0.05, -0.005 - hipY * 0], 0.012); ctx.lineWidth = 0.02 * h; const q = P(hand[0] + 0.01, hand[1] - 0.12), q2 = P(hand[0] + 0.07, hand[1] - 0.2); ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.quadraticCurveTo(q[0] + f * 0.05 * h, q[1] - 0.05 * h, q2[0], q2[1]); ctx.stroke(); }
    if (o.hold === 'torch') { const top = [hand[0] + 0.03, hand[1] - 0.26]; pole(top, [hand[0] - 0.01, hand[1] + 0.08], 0.011); out.torch = P(top[0], top[1] - 0.01); }
    if (o.hold === 'hammer') { const e = [hand[0] + 0.02, hand[1] + 0.2]; pole(hand, e, 0.009); poly([[e[0] - 0.05, e[1] - 0.02], [e[0] + 0.06, e[1] - 0.02], [e[0] + 0.06, e[1] + 0.04], [e[0] - 0.05, e[1] + 0.04]]); }
    if (o.hold === 'fork') { const top = [hand[0] + 0.08, hand[1] - 0.6]; pole(top, [hand[0] - 0.05, hand[1] + 0.4], 0.008); for (const dx of [-0.03, 0, 0.03]) pole([top[0] + dx * 0.5, top[1]], [top[0] + dx, top[1] - 0.12], 0.005); pole([top[0] - 0.032, top[1]], [top[0] + 0.032, top[1]], 0.006); }
    drawArm(AN);
    ctx.restore();
    return out;
  }
  // fire(ctx, x, y, w, h, t, seed, o): a living flame standing on (x, y): tongues that lick, split and sway, an orange
  // body, a yellow heart, a white core; drawn at half size and enlarged so the edges stay soft. o.heat, o.n
  // ================================================================ the timeline, keyed to the voices
  let T = null;
  function TT() {
    if (T) return T;
    const sc = K.scene(5), c = K.cue; T = { s: sc.start, e: sc.end };
    for (const n of [26, 28, 29, 30, 31, 32]) { const q = c('L' + n); T['a' + n] = q.start; T['b' + n] = q.end; }
    const at = (n, u) => lerp(T['a' + n], T['b' + n], u);
    // shots: the hall, the born take the great pieces, Cael takes the front rank (L26); the clerk and the register (L28);
    // the trial from above and beside him (L29-L30); the knighting and the star (L31); the gallery (L32)
    T.sB1 = at(26, 0.3); T.sB2 = at(26, 0.7); T.sC1 = T.a28 - 0.1; T.sC2 = T.a28 + 2.35;
    // the arbiter's "Mate. The king is dead." (A03) and the herald's "Rise, Knight of Ealdholt." (A04), when present
    const A03 = c('A03'), A04 = c('A04'), ok = q => q && q.end > q.start;
    T.a03 = ok(A03) ? A03.start : T.b30 + 0.5; T.b03 = ok(A03) ? A03.end : T.a03 + 2.4;
    T.a04 = ok(A04) ? A04.start : T.b31 + 0.3; T.b04 = ok(A04) ? A04.end : T.a04 + 2.4;
    T.sD1 = T.a29 - 0.25; T.sD2 = T.a29 + 3.0; T.sE2 = T.a30 + 1.4; T.sE3 = T.a03 - 0.1; T.sF1 = T.a31 + 0.3; T.sF2 = T.a31 + 2.0; T.sF3 = T.a04 - 0.1; T.sG = T.a32 - 0.15;
    // events
    T.nob0 = T.sB1 - 1.2;                                   // the born walk to their squares
    T.cael0 = T.sB2 + 0.15; T.cael1 = T.sB2 + 1.35;          // Cael steps into f2
    T.adv0 = T.a29 + 0.7; T.adv1 = T.a29 + 2.7;              // f7 to f8
    T.gh0 = T.sD2 + 0.15;                                   // the four ghosts rise
    T.kn0 = T.a30 + 0.1; T.kn1 = T.a30 + 1.25;               // the Knight is chosen and becomes solid
    T.fork0 = T.sE2 + 0.25; T.fork1 = T.fork0 + 0.55;        // two gold lines leap
    T.fall0 = T.a30 + 3.0; T.fall1 = T.fall0 + 0.75;         // the king falls
    T.hush0 = T.fall1; T.rise0 = T.b03 - 0.1;                // a hush (the arbiter speaks into it), then the hall rises
    T.strike = T.b03 - 0.35;                                // held high through his words, the staff strikes the stone
    T.up0 = T.a04 + 0.15; T.up1 = T.a04 + 1.6;               // Cael rises to his feet
    T.sword0 = T.sF1 + 0.1; T.touch = T.sF1 + 0.75;          // the sword comes down to his shoulder
    T.pin0 = T.sF2 + 0.15; T.pin1 = T.sF2 + 0.85;            // the star is pinned
    T.ask = T.a32 + 2.2; T.turn = T.b32 - 0.3;               // the hooded man speaks to a clerk, then turns away
    return T;
  }

  // ================================================================ the world (metres; floor on x/z, y up)
  // The hall runs along z: the dais of the Seven at the far end (-z), its great doors at +z. The board lies in the middle
  // on a low slab. Chess: the a-file is at +x (it reads on the left for a camera at White's end looking down the hall),
  // rank 1 at +z. White is Cael's side (ivory), Black the other (ebony).
  const SQ = 2.2, HB = 4 * SQ, BRD = 1.1, BE = HB + BRD, SLAB = 0.3;
  const HW = 19.5, ZF = -32, ZN = 34, COLX = 14.5, COLR = 0.78, GALY = 7.0, ROOF = 28;
  const COLZ = [-28, -21, -14, -7, 0, 7, 14, 21, 28];
  const WINZ = [-24.5, -17.5, -10.5, -3.5, 3.5, 10.5, 17.5, 24.5], WY0 = 12.6, WY1 = 21.6, WHW = 1.45;
  const DAIS = { z0: -30, z1: -24, y: 1.5, x: 12 };
  const sqX = f => (3.5 - f) * SQ, sqZ = r => (3.5 - r) * SQ;
  const CAND = [[BE + 0.9, BE + 0.9], [-BE - 0.9, BE + 0.9], [BE + 0.9, -BE - 0.9], [-BE - 0.9, -BE - 0.9], [BE + 0.9, 0], [-BE - 0.9, 0]];
  const CANDH = 2.6;
  const norm3 = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const FARDIR = norm3([0, -0.9, 0.95]);

  // ================================================================ light: the day's shafts, dusk, candlelight
  const MODES = {
    day: { amb: [58, 52, 50], shaft: [255, 214, 150], sa: 1.0, sdir: norm3([-1.0, -0.85, 0.22]), far: 1.0, cand: 0.4, win: [255, 236, 200], winA: 1.0, door: 0.9, haze: [150, 118, 84], hazeA: 0.34, gal: 0.55 },
    dusk: { amb: [30, 25, 28], shaft: [255, 120, 62], sa: 0.42, sdir: norm3([-1.0, -0.44, 0.12]), far: 0, cand: 1.0, win: [255, 132, 74], winA: 0.8, door: 0, haze: [86, 48, 34], hazeA: 0.26, gal: 1.0 },
    night: { amb: [22, 22, 30], shaft: [120, 150, 220], sa: 0, sdir: norm3([-1.0, -0.44, 0.12]), far: 0, cand: 1.0, win: [52, 70, 128], winA: 0.55, door: 0, haze: [60, 40, 34], hazeA: 0.2, gal: 1.0 },
  };
  const flk = (t, s) => 0.86 + 0.08 * Math.sin(t * 9.1 + s * 2) + 0.06 * Math.sin(t * 15.7 + s * 5) + 0.05 * (K.noise(t * 3, s * 7, 51) - 0.5);
  function lights(t, mode, boost = 1) {
    const M = MODES[mode], ls = [];
    CAND.forEach(([x, z], i) => ls.push({ x, y: CANDH, z, r: 12, c: [255, 168, 96], a: 1.25 * M.cand * flk(t, i) * boost, fire: true }));
    if (M.door > 0) ls.push({ x: 0, y: 3, z: ZN - 4, r: 22, c: [255, 232, 196], a: 0.8 * M.door });
    // the dais of the Seven has two fires of its own
    for (const s of [-1, 1]) ls.push({ x: s * 9.5, y: 3.2, z: -23.2, r: 10, c: [255, 150, 80], a: 0.9 * M.cand * flk(t, s + 9), fire: true });
    return { M, mode, lights: ls, amb: M.amb };
  }
  // how much of a shaft falls on a point (0..~1): trace back along the light to the windows
  function shaftAt(M, x, y, z) {
    let v = 0;
    if (M.sa > 0) {
      const d = M.sdir, s = (HW - x) / -d[0];
      if (s > 0) {
        const wy = y - d[1] * s, wz = z - d[2] * s;
        if (wz > -26.5 && wz < 26.5) {
          const m = Math.abs(((wz - 3.5) % 7 + 10.5) % 7 - 3.5), ez = 1 - smooth((m - WHW + 0.45) / 0.7), ey = smooth((wy - WY0) / 0.8) * (1 - smooth((wy - WY1 - 0.4) / 1.2));
          v += M.sa * ez * ey;
        }
      }
    }
    if (M.far > 0 && z > ZF) {
      const d = FARDIR, s = (z - ZF) / d[2], wx = x - d[0] * s, wy = y - d[1] * s;
      v += M.far * 0.8 * (1 - smooth((Math.abs(wx) - 2.3) / 1.0)) * smooth((wy - 13) / 1.2) * (1 - smooth((wy - 24.5) / 1.5));
    }
    return v;
  }
  function lightAt(L, x, y, z) {
    const M = L.M; let r = M.amb[0] / 255, g = M.amb[1] / 255, b = M.amb[2] / 255, best = null, bw = 0;
    for (const l of L.lights) {
      const dx = x - l.x, dz = z - l.z, dy = y - l.y, e = (dx * dx + dz * dz + dy * dy * 0.4) / (l.r * l.r);
      if (e >= 1.4) continue;
      const f = l.a * Math.max(0, 1.4 - e) / 1.4 / (1 + e * 3);
      r += l.c[0] / 255 * f; g += l.c[1] / 255 * f; b += l.c[2] / 255 * f;
      if (f > bw) { bw = f; best = l; }
    }
    const sh = shaftAt(M, x, y, z);
    if (sh > 0) { r += M.shaft[0] / 255 * sh * 1.1; g += M.shaft[1] / 255 * sh * 1.1; b += M.shaft[2] / 255 * sh * 1.1; if (sh * 1.1 > bw) { bw = sh; best = { shaft: true }; } }
    return { c: [r, g, b], key: best, keyAmt: bw };
  }

  // ================================================================ textures (built once)
  // flagstones, tileable: 1024 px over 6 m
  const FT = { n: 1024, m: 6 };
  function floorTile() {
    return K.cached('p5:floor', () => {
      const n = FT.n, c = pixels(n, n, (i, j) => {
        const u = i / n, v = j / n, m = pfbm(u * 6, v * 6, 6, 5, 211), w = pfbm(u * 24, v * 24, 24, 3, 223), g = K.hash(i, j, 227) - 0.5;
        const k = (m - 0.5) * 0.55 + (w - 0.5) * 0.24 + g * 0.07;
        return [clamp(146 + k * 110, 0, 255), clamp(132 + k * 100, 0, 255), clamp(114 + k * 88, 0, 255)];
      });
      const x = c.getContext('2d'), r = rng(229), s = n / 3;
      for (let row = 0; row < 3; row++) {
        const off = row % 2 ? s / 2 : 0;
        for (let k2 = -1; k2 < 4; k2++) {
          const x0 = k2 * s + off, y0 = row * s, tn = (r() - 0.5) * 0.16;
          x.fillStyle = tn > 0 ? `rgba(255,240,220,${tn})` : `rgba(20,12,6,${-tn})`; x.fillRect(x0, y0, s, s);
          const g = x.createLinearGradient(x0, y0, x0 + s, y0 + s); g.addColorStop(0, 'rgba(255,245,230,0.08)'); g.addColorStop(0.1, 'rgba(0,0,0,0)'); g.addColorStop(0.9, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.18)'); x.fillStyle = g; x.fillRect(x0, y0, s, s);
          if (r() < 0.4) { const pts = K.wobble(K.resample([[x0 + r() * s, y0], [x0 + s * (0.3 + r() * 0.4), y0 + s * (0.3 + r() * 0.4)], [x0 + r() * s, y0 + s]], 4), 8, 0.04, 400 + row * 9 + k2); x.strokeStyle = 'rgba(40,28,18,0.35)'; x.lineWidth = 1.2; K.line(x, pts, 0.3 + r() * 0.6); }
        }
      }
      x.strokeStyle = 'rgba(16,10,6,0.85)'; x.lineWidth = 5;
      for (let row = 0; row <= 3; row++) { x.beginPath(); x.moveTo(0, row * s); x.lineTo(n, row * s); x.stroke(); }
      for (let row = 0; row < 3; row++) { const off = row % 2 ? s / 2 : 0; for (let k2 = -1; k2 < 4; k2++) { const X = k2 * s + off; x.beginPath(); x.moveTo(X, row * s); x.lineTo(X, row * s + s); x.stroke(); } }
      return c;
    });
  }
  const floorMips = () => K.cached('p5:floorMips', () => mipChain(floorTile(), 5));
  // the board seen from above: 2048 px over the slab (squares, seams, a border with gold inlay)
  const BT = { n: 2048 }; BT.ppm = BT.n / (2 * BE);
  function boardTex() {
    return K.cached('p5:board', () => {
      const N = BT.n, ppm = BT.ppm, c = K.canvas(N, N), x = c.getContext('2d'), r = rng(5061), X = v => (v + BE) * ppm;
      const Ls = lightStone(), Ds = darkStone();
      for (let yy = 0; yy < N; yy += 384) for (let xx = 0; xx < N; xx += 384) { x.save(); x.translate(xx + 192, yy + 192); x.rotate(Math.floor(r() * 4) * Math.PI / 2); x.drawImage(Ds, r() * 120, r() * 120, 384, 384, -192, -192, 384, 384); x.restore(); }
      x.fillStyle = 'rgba(40,26,14,0.3)'; x.fillRect(0, 0, N, N);
      x.strokeStyle = 'rgba(8,6,4,0.8)'; x.lineWidth = 3;
      const b0 = X(-BE), b1 = X(-HB), b2 = X(HB), b3 = X(BE);
      for (let i = 0; i <= 18; i++) { const u = lerp(b0, b3, i / 18); x.beginPath(); x.moveTo(u, b0); x.lineTo(u, b1); x.moveTo(u, b2); x.lineTo(u, b3); x.moveTo(b0, u); x.lineTo(b1, u); x.moveTo(b2, u); x.lineTo(b3, u); x.stroke(); }
      const goldBand = (d, w) => { const a = X(-HB - d), bb = X(HB + d); const g = x.createLinearGradient(0, 0, N, N); g.addColorStop(0, '#8a6a2c'); g.addColorStop(0.3, '#d8b866'); g.addColorStop(0.5, '#7a5a22'); g.addColorStop(0.7, '#e2c47a'); g.addColorStop(1, '#8a6a2c'); x.strokeStyle = g; x.lineWidth = w * ppm; x.strokeRect(a, a, bb - a, bb - a); };
      goldBand(0.16, 0.06); goldBand(0.92, 0.045);
      x.save(); x.fillStyle = 'rgba(6,4,2,0.55)'; x.strokeStyle = 'rgba(200,170,110,0.3)'; x.lineWidth = 1.2;
      const mid = HB + 0.54, nL = 40;
      for (const side of [0, 1, 2, 3]) for (let i = 0; i < nL; i++) {
        const u = -HB - 0.54 + (2 * HB + 1.08) * (i + 0.5) / nL; let cx, cy; if (side === 0) { cx = X(u); cy = X(-mid); } else if (side === 1) { cx = X(u); cy = X(mid); } else if (side === 2) { cx = X(-mid); cy = X(u); } else { cx = X(mid); cy = X(u); }
        const s = 0.22 * ppm; x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s, cy); x.lineTo(cx, cy + s); x.lineTo(cx - s, cy); x.closePath(); x.fill(); x.stroke();
        x.beginPath(); x.arc(cx, cy, s * 0.22, 0, TAU); x.fillStyle = 'rgba(214,180,100,0.6)'; x.fill(); x.fillStyle = 'rgba(6,4,2,0.55)';
      }
      x.restore();
      const s = SQ * ppm;
      for (let fi = 0; fi < 8; fi++) for (let ri = 0; ri < 8; ri++) {
        const light = (fi + ri) % 2 === 1, x0 = X(sqX(fi) - SQ / 2), y0 = X(sqZ(ri) - SQ / 2), tile = light ? Ls : Ds;
        x.save(); x.translate(x0 + s / 2, y0 + s / 2); x.rotate(Math.floor(r() * 4) * Math.PI / 2);
        x.drawImage(tile, r() * (512 - s), r() * (512 - s), s, s, -s / 2, -s / 2, s, s);
        const tint = (r() - 0.5) * 0.12; x.fillStyle = tint > 0 ? `rgba(255,240,215,${tint})` : `rgba(20,12,6,${-tint})`; x.fillRect(-s / 2, -s / 2, s, s);
        const g = x.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); g.addColorStop(0, light ? 'rgba(255,248,230,0.16)' : 'rgba(160,150,140,0.08)'); g.addColorStop(0.12, 'rgba(0,0,0,0)'); g.addColorStop(0.88, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.22)');
        x.fillStyle = g; x.fillRect(-s / 2, -s / 2, s, s);
        if (r() < 0.3) { const pts = K.wobble(K.resample([[-s / 2 + r() * s, -s / 2], [(r() - 0.5) * s * 0.5, (r() - 0.5) * s * 0.5], [-s / 2 + r() * s, s / 2 * (r() < 0.5 ? 1 : 0.2)]], 3), 6, 0.05, 300 + fi * 8 + ri); x.strokeStyle = light ? 'rgba(80,62,40,0.45)' : 'rgba(0,0,0,0.55)'; x.lineWidth = 1.2; K.line(x, pts, 0.4 + r() * 0.6); }
        x.restore();
      }
      x.strokeStyle = 'rgba(10,7,4,0.9)'; x.lineWidth = 0.035 * ppm;
      for (let i = 0; i <= 8; i++) { const u = X(-HB + i * SQ); x.beginPath(); x.moveTo(u, X(-HB)); x.lineTo(u, X(HB)); x.moveTo(X(-HB), u); x.lineTo(X(HB), u); x.stroke(); }
      return c;
    });
  }
  const boardMips = () => K.cached('p5:boardMips', () => mipChain(boardTex(), 5));
  // spectators in the galleries: heads and shoulders above the parapet (2048 px over 20 m, 2.4 m tall); cheer lifts arms
  const CS = { w: 2048, h: 256, m: 20, hm: 2.4 };
  function crowdStrip(cheer) {
    return K.cached('p5:crowd' + (cheer ? 'C' : ''), () => {
      const c = K.canvas(CS.w, CS.h), x = c.getContext('2d'), r = rng(cheer ? 7711 : 7711), ppm = CS.w / CS.m;
      const cols = K.HOUSES.map(h => h.field).concat(['#5d4c3c', '#4e4236', '#3a3a44', '#6e5236']);
      for (let row = 0; row < 3; row++) {
        const n = 46 - row * 4, base = CS.h - row * 22 - 70, sc = 1 - row * 0.12, dark = row * 0.22;
        for (let i = 0; i < n; i++) {
          const px = (i + 0.5 + (r() - 0.5) * 0.6) / n * CS.w, hs = ppm * 0.62 * sc * (0.9 + r() * 0.2), col = cols[Math.floor(r() * cols.length)], up = cheer && r() < 0.7;
          const shade = (h, k) => mixHex(h, '#0a0806', k);
          const bod = shade(col, 0.35 + dark), skin = shade(['#c49a76', '#a87a58', '#8a6248', '#d0a882'][Math.floor(r() * 4)], 0.25 + dark), hair = shade(['#2a1c12', '#4a3020', '#1e1610', '#6a5a4a'][Math.floor(r() * 4)], dark);
          const hy = base - hs * (cheer ? 1.0 + r() * 0.08 : 0.95) - (cheer ? hs * 0.12 : 0);
          if (up) { x.strokeStyle = bod; x.lineCap = 'round'; x.lineWidth = hs * 0.16; for (const s of [-1, 1]) if (s < 0 || r() < 0.6) { x.beginPath(); x.moveTo(px + s * hs * 0.32, hy + hs * 0.55); x.lineTo(px + s * hs * (0.42 + r() * 0.2), hy - hs * (0.4 + r() * 0.3)); x.stroke(); } }
          x.fillStyle = bod; x.beginPath(); x.ellipse(px, base + hs * 0.2, hs * 0.48, hs * 0.85, 0, Math.PI, 0); x.fill(); x.fillRect(px - hs * 0.48, base + hs * 0.2, hs * 0.96, 40);
          x.fillStyle = skin; x.beginPath(); x.ellipse(px, hy + hs * 0.18, hs * 0.2, hs * 0.25, 0, 0, TAU); x.fill();
          const hk = r(); x.fillStyle = hk < 0.4 ? hair : hk < 0.7 ? bod : shade('#2a2420', dark);
          x.beginPath(); if (hk < 0.4) x.ellipse(px - hs * 0.03, hy + hs * 0.1, hs * 0.22, hs * 0.2, 0, Math.PI * 1.05, Math.PI * 1.95 + 0.5); else x.ellipse(px, hy + hs * 0.12, hs * 0.26, hs * 0.28, 0, Math.PI, 0); x.fill();
          // candlelight from below on the faces of the front row
          if (row === 0) { x.fillStyle = 'rgba(255,190,120,0.18)'; x.beginPath(); x.ellipse(px, hy + hs * 0.32, hs * 0.15, hs * 0.1, 0, 0, TAU); x.fill(); }
        }
      }
      return mipChain(c, 4);
    });
  }
  // the gallery's parapet: a rail over balusters (2048 px over 20 m, 1.1 m tall)
  function parapetTex() {
    return K.cached('p5:parapet', () => {
      const c = K.canvas(2048, 112), x = c.getContext('2d'), ppm = 2048 / 20;
      x.fillStyle = '#2a221c'; x.fillRect(0, 0, 2048, 112);
      for (let i = 0; i < 80; i++) { const X = (i + 0.5) / 80 * 2048; const g = x.createLinearGradient(X - 9, 0, X + 9, 0); g.addColorStop(0, '#1a1410'); g.addColorStop(0.35, '#5a4a3c'); g.addColorStop(1, '#16110d'); x.fillStyle = g; x.beginPath(); x.moveTo(X - 6, 22); x.quadraticCurveTo(X - 13, 60, X - 7, 98); x.lineTo(X + 7, 98); x.quadraticCurveTo(X + 13, 60, X + 6, 22); x.closePath(); x.fill(); }
      x.fillStyle = '#0c0a08'; for (let i = 0; i <= 80; i++) { const X = i / 80 * 2048; x.fillRect(X - 3, 22, 6, 76); }
      const g = x.createLinearGradient(0, 0, 0, 22); g.addColorStop(0, '#8a7258'); g.addColorStop(0.5, '#4a3c30'); g.addColorStop(1, '#1e1812'); x.fillStyle = g; x.fillRect(0, 0, 2048, 22);
      x.fillStyle = '#c9a14a'; x.fillRect(0, 3, 2048, 2);
      x.fillStyle = '#1a1410'; x.fillRect(0, 98, 2048, 14);
      void ppm; return mipChain(c, 4);
    });
  }

  // ================================================================ the light image (floor and board), multiplied, plus its excess added
  const LW = 192, LH = 108; let LIMG = null, LADD = null;
  function lightImage(C, L) {
    const c = K.cached('p5:limg', () => K.canvas(LW, LH)), a = K.cached('p5:ladd', () => K.canvas(LW, LH)), x = c.getContext('2d'), ax = a.getContext('2d');
    if (!LIMG) { LIMG = x.createImageData(LW, LH); LADD = ax.createImageData(LW, LH); }
    const d = LIMG.data, e2 = LADD.data, ls = L.lights, nl = ls.length, LC = new Float64Array(nl * 7), M = L.M;
    for (let q = 0; q < nl; q++) { const l = ls[q]; LC[q * 7] = l.x; LC[q * 7 + 1] = l.z; LC[q * 7 + 2] = 1 / (l.r * l.r); LC[q * 7 + 3] = l.c[0] * l.a; LC[q * 7 + 4] = l.c[1] * l.a; LC[q * 7 + 5] = l.c[2] * l.a; LC[q * 7 + 6] = l.y; }
    const sx = W / LW, sy = H / LH, f = C.f, sh0 = M.shaft[0] * 1.15, sh1 = M.shaft[1] * 1.15, sh2 = M.shaft[2] * 1.15;
    for (let j = 0; j < LH; j++) {
      const Y = -((j + 0.5) * sy - C.cy) / f;
      for (let i = 0; i < LW; i++) {
        const k = (j * LW + i) * 4, X = ((i + 0.5) * sx - C.cx) / f;
        const dx = X * C.rx + Y * C.ux + C.fx, dy = X * C.ry + Y * C.uy + C.fy, dz = X * C.rz + Y * C.uz + C.fz;
        if (dy > -1e-6) { d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = 0; e2[k + 3] = 0; continue; }
        let tt = (SLAB - C.py) / dy, px = C.px + tt * dx, pz = C.pz + tt * dz, py = SLAB;
        if (!(px <= BE && px >= -BE && pz <= BE && pz >= -BE)) { tt = -C.py / dy; px = C.px + tt * dx; pz = C.pz + tt * dz; py = 0; }
        let r = M.amb[0], g = M.amb[1], b = M.amb[2];
        for (let q = 0; q < nl * 7; q += 7) { const ex = px - LC[q], ez = pz - LC[q + 1], ey = (py - LC[q + 6]) * 0.6, e = (ex * ex + ez * ez + ey * ey) * LC[q + 2]; if (e < 1) { const w = (1 - e) * (1 - e) / (1 + e * 6); r += LC[q + 3] * w; g += LC[q + 4] * w; b += LC[q + 5] * w; } }
        const s = shaftAt(M, px, py, pz); if (s > 0) { r += sh0 * s; g += sh1 * s; b += sh2 * s; }
        // the hall's far reaches sink into shadow
        const far = Math.max(Math.abs(px) - COLX + 1, 0) * 0.12 + Math.max(-pz - 24, 0) * 0.05; if (far > 0) { const kk = Math.max(0.2, 1 - far); r *= kk; g *= kk; b *= kk; }
        d[k] = r > 255 ? 255 : r; d[k + 1] = g > 255 ? 255 : g; d[k + 2] = b > 255 ? 255 : b; d[k + 3] = 255;
        e2[k] = r > 255 ? (r - 255) * 0.5 : 0; e2[k + 1] = g > 255 ? (g - 255) * 0.5 : 0; e2[k + 2] = b > 255 ? (b - 255) * 0.5 : 0; e2[k + 3] = 255;
      }
    }
    x.putImageData(LIMG, 0, 0); ax.putImageData(LADD, 0, 0);
    return { mul: c, add: a };
  }

  // ================================================================ the pieces: living people on the squares
  const HS = K.HOUSES, BACK = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  const W_ARMS = [3, 5, 4, 2, 0, 1, 6, 3], B_ARMS = [4, 3, 1, 6, 2, 0, 5, 4];
  const HEIGHT = { P: 1.8, R: 1.95, B: 1.98, Q: 1.86, K: 2.02, N: 3.05 };
  const PENS = ['#4a5a6a', '#5a6a4a', '#7a5a4a', '#4a4a5a', '#6a6a5a', '#6e5236', '#3a4a3a', '#5a4a5a'];
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function mk(id, side, type, f, r, o = {}) { return Object.assign({ id, side, type, f, r, h: HEIGHT[type], seed: hashStr(id) }, o); }
  let SETS = null;
  function sets() {
    if (SETS) return SETS; const T = TT();
    const start = [], fin = [];
    // the born walk to their squares from the doors' end (in the hall shot they wait there with the crowd)
    const order = [4, 3, 2, 5, 1, 6, 0, 7];
    for (let f = 0; f < 8; f++) {
      const i = order.indexOf(f);
      start.push(mk('W' + BACK[f] + f, 'W', BACK[f], f, 0, { house: HS[W_ARMS[f]], walkIn: { t0: T.nob0 + i * 0.2, dur: 2.5, x: sqX(f) + (f - 3.5) * 0.25, z: BE + 3.4 + (i % 2) * 0.6 } }));
      if (f !== 5) start.push(mk('WP' + f, 'W', 'P', f, 1, { pen: PENS[f] }));
      start.push(mk('B' + BACK[f] + f, 'B', BACK[f], f, 7, { house: HS[B_ARMS[f]] }));
      start.push(mk('BP' + f, 'B', 'P', f, 6));
    }
    start.push(mk('CAEL', 'W', 'P', 5, 1, { cael: true, walkIn: { t0: T.cael0, dur: T.cael1 - T.cael0, x: sqX(5) + 0.25, z: sqZ(1) + 1.5, hold: true } }));
    // the final trial, White to move: 1. f8=N# forks the king on h7 and the queen on d7
    const W2 = [['K', 6, 0, 0], ['R', 5, 0, 3], ['B', 2, 3, 1], ['P', 0, 1], ['P', 1, 1], ['P', 6, 1], ['P', 7, 1]];
    const B2 = [['K', 7, 6, 2], ['Q', 3, 6, 6], ['R', 7, 7, 4], ['N', 6, 7, 5], ['B', 1, 6, 1], ['P', 0, 6], ['P', 1, 5], ['P', 6, 6], ['P', 7, 5]];
    for (const [ty, f, r, h] of W2) fin.push(mk('fW' + ty + f + r, 'W', ty, f, r, { house: h != null ? HS[h] : null, pen: ty === 'P' ? PENS[f] : null }));
    for (const [ty, f, r, h] of B2) fin.push(mk('fB' + ty + f + r, 'B', ty, f, r, { house: h != null ? HS[h] : null, fall: ty === 'K' ? [T.fall0, T.fall1] : null }));
    fin.push(mk('CAELF', 'W', 'P', 5, 7, { cael: true, walkIn: { t0: T.adv0, dur: T.adv1 - T.adv0, x: sqX(5), z: sqZ(6) }, promote: true }));
    SETS = { start, fin }; return SETS;
  }
  function where(p, t) {
    let x = sqX(p.f), z = sqZ(p.r), ang = p.side === 'W' ? Math.PI : 0, moving = false, phase = 0;
    const w = p.walkIn;
    if (w) {
      const u = (t - w.t0) / w.dur, e = smooth(u), d = Math.hypot(x - w.x, z - w.z);
      if (u < 1) { const tx = x, tz = z; x = lerp(w.x, tx, clamp(e)); z = lerp(w.z, tz, clamp(e)); if (u > 0) { moving = true; phase = d * e / 0.62 * Math.PI; ang = Math.atan2(tx - w.x, tz - w.z); } }
    }
    return { x, z, ang, moving, phase };
  }
  const IVORY = { cloth: '#d8ccb2', cloth2: '#c0b296', trim: '#7a5a34', skin: '#c99f7b', hair: '#4a3324', steel: '#a2a4a8', wood: '#6a4a2c', gold: '#c9a14a', leg: '#ad9d80', boot: '#3a2a1c', veil: '#efe7d6', cloak: '#c4b598' };
  const EBONY = { cloth: '#2f2825', cloth2: '#262020', trim: '#141010', skin: '#8a6a52', hair: '#16100c', steel: '#5a5c60', wood: '#2a1d12', gold: '#8a6a2c', leg: '#221c19', boot: '#100c0a', veil: '#4a4440', cloak: '#241e1c' };
  const COMMON = ['#6e6252', '#5d4c3c', '#7a6a58', '#4e4236', '#655440', '#584536', '#5a5a52'];
  const CAELC = { cloth: '#4e3a28', cloth2: '#3e2e20', trim: '#2a1d12', skin: '#b88a68', hair: '#17100b', steel: '#8a8a8c', wood: '#5c4026', gold: '#c9a14a', leg: '#3a2e24', boot: '#1e1610', veil: '#efe7d6', cloak: '#6e5236' };
  function costume(p, type) {
    const hs = p.house, r = rng(p.seed), base = p.side === 'W' ? IVORY : EBONY, col = Object.assign({}, base), o = { col, kind: 'robe', head: 'bare', hold: 'none', arms: null, armsA: 0, beard: false };
    if (p.cael) {
      Object.assign(col, CAELC);
      if (type === 'N') { Object.assign(o, { kind: 'tunic', head: 'hair', hold: 'spear', cloak: true, seated: true, coat: '#3e2a1c', pennant: '#6e5236' }); col.cloak = '#6e5236'; }
      else Object.assign(o, { kind: 'tunic', head: 'hair', hold: 'spear', cloak: true, cloakLen: -0.2, pennant: '#6e5236' });
      return o;
    }
    if (hs) { col.field = mixHex(base.cloth2, hs.field, 1); col.charge = hs.charge; o.arms = hs; o.armsA = 1; o.pavise = null; }
    const dye = h => hs ? hs.field : h;
    switch (type) {
      case 'K': Object.assign(o, { kind: 'robe', head: 'crown', hold: 'sceptre', cloak: true, collar: true, beard: true, hero: true }); col.beard = mixHex(base.hair, base.skin, 0.45); col.cloth = dye(base.cloth); col.cloak = hs ? shadeHex(hs.field, -0.25) : base.cloak; col.trim2 = '#ece6da'; break;
      case 'Q': Object.assign(o, { kind: 'gown', head: 'veil', hold: 'none', crown2: true, cloak: true, cloakLen: 0.01, hero: true }); col.cloth = dye(base.cloth); col.cloak = hs ? shadeHex(hs.field, -0.3) : base.cloak; col.veil = '#efe7d6'; break;
      case 'B': Object.assign(o, { kind: 'robe', head: 'mitre', hold: 'crozier', cloak: true, cloakLen: -0.03 }); col.cloth = base.cloth; col.cloak = dye(base.cloak); col.mitre = p.side === 'W' ? '#efe7d6' : '#4a4440'; break;
      case 'R': Object.assign(o, { kind: 'mail', head: 'helm', hold: 'spear', pavise: hs || { device: 'none' } }); col.cloth = dye(base.cloth2); col.field = hs ? hs.field : base.cloth2; col.leg = base.steel; break;
      case 'N': Object.assign(o, { kind: 'mail', head: 'helm', hold: 'lance', seated: true }); col.cloth = dye(base.cloth2); col.leg = base.steel; o.pennant = hs ? hs.field : null; o.coat = p.side === 'W' ? '#b5ada0' : '#211b18'; break;
      case 'P':
        if (p.side === 'W') { Object.assign(o, { kind: r() < 0.35 ? 'rags' : 'tunic', head: ['hood', 'hair', 'coif', 'hair', 'cap', 'hood'][Math.floor(r() * 6)], hold: 'spear', pennant: p.pen }); }
        else Object.assign(o, { kind: r() < 0.4 ? 'rags' : 'tunic', head: ['hood', 'hair', 'coif', 'cap'][Math.floor(r() * 4)], hold: 'none' });
        col.cloth = COMMON[Math.floor(r() * COMMON.length)]; col.cloth2 = COMMON[Math.floor(r() * COMMON.length)]; col.leg = '#3a2e24'; col.boot = '#1e1610';
        col.hair = ['#2a1c12', '#4a3020', '#6a5040', '#1e1610'][Math.floor(r() * 4)]; col.skin = ['#c49a76', '#a87a58', '#8a6248', '#d0a882'][Math.floor(r() * 4)]; col.steel = '#6a6a6c';
        if (p.side === 'B') { col.cloth = mixHex(col.cloth, '#1a1614', 0.45); col.cloth2 = mixHex(col.cloth2, '#1a1614', 0.45); }
        break;
    }
    return o;
  }

  // ================================================================ drawing a figure (lit colours, a painterly grain, a rim of light)
  const SPR = {};
  function scratch(name, w, h) {
    w = Math.ceil(w); h = Math.ceil(h);
    let c = SPR[name];
    if (!c || c.width < w || c.height < h) c = SPR[name] = K.canvas(Math.min(2048, Math.max(w, c ? c.width : 0, 256)), Math.min(2048, Math.max(h, c ? c.height : 0, 256)));
    const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.lineCap = 'butt'; x.lineJoin = 'miter'; x.clearRect(0, 0, Math.min(c.width, w + 2), Math.min(c.height, h + 2));
    return c;
  }
  function brushTex() {
    return K.cached('p5:brush', () => {
      const n = 256, c = K.canvas(n, n), x = c.getContext('2d'), r = rng(808);
      for (let i = 0; i < 900; i++) { const px = r() * n, py = r() * n, rw = 3 + r() * 9, rh = 2 + r() * 6, a = r() * Math.PI, dark = r() < 0.55; for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) { x.fillStyle = dark ? `rgba(0,0,0,${0.04 + r() * 0.08})` : `rgba(255,246,228,${0.03 + r() * 0.07})`; x.beginPath(); x.ellipse(px + ox, py + oy, rw, rh, a, 0, TAU); x.fill(); } }
      return c;
    });
  }
  // the figure itself (horse and rider, or a person), in lit colours, feet at (ox, oy), hs pixels tall
  function drawFigureInto(x, ox, oy, o, view, face, hs, lc, walk, flat) {
    const knight = !!o.seated, hh = knight ? hs / 1.85 : hs;
    const C2 = {}; for (const key in o.col) C2[key] = flat || litHex(o.col[key], lc);
    const po = Object.assign({}, o, { col: C2, view, walk, sway: 0, t: 0, sheen: 0.55, pennant: o.pennant ? (flat || litHex(o.pennant, lc)) : null, lod: hs < 70 ? 1 : 0 });
    if (flat) { po.arms = o.arms ? { field: flat, charge: flat, device: 'none' } : null; po.pavise = o.pavise ? { device: 'none' } : null; }
    if (knight) {
      const coat = flat || litHex(o.coat || '#3a2c22', lc), withArms = o.arms && o.armsA > 0.4 && !flat;
      const cap = withArms ? { field: litHex(o.arms.field, lc), charge: litHex(o.arms.charge, lc), device: o.arms.device } : { field: flat || litHex(mixHex(o.col.cloth2 || o.col.cloth, '#000000', 0.1), lc), charge: 'none', device: 'none' };
      x.save(); x.translate(ox, oy);
      if (view === 'side') {
        K.horse(x, 0, 0, hh, { face, walk: walk != null ? walk * 0.75 : undefined, fill: coat, house: withArms ? cap : null, caparison: withArms ? null : (o.cael ? null : cap.field) });
        x.translate(face * -0.02 * hh, -0.97 * hh); x.scale(face * hh * 1.08, hh * 1.08); x.translate(0, 0.5);
        person(x, Object.assign(po, { view: 'side' }));
        x.fillStyle = C2.leg; x.beginPath(); x.moveTo(-0.02, -0.5); x.lineTo(0.06, -0.5); x.lineTo(0.2, -0.36); x.lineTo(0.17, -0.12); x.lineTo(0.12, -0.12); x.lineTo(0.13, -0.33); x.closePath(); x.fill();
        x.fillStyle = C2.boot; x.beginPath(); x.moveTo(0.11, -0.14); x.lineTo(0.18, -0.14); x.lineTo(0.22, -0.08); x.lineTo(0.11, -0.08); x.closePath(); x.fill();
      } else {
        x.scale(hh, hh); horseFront(x, coat, o.cael && !withArms ? null : cap, view === 'back', false);
        x.save(); x.translate(0, -0.95); x.scale(1.08, 1.08); x.translate(0, 0.5);
        for (const s of [-1, 1]) { x.fillStyle = C2.leg; x.fillRect(s * 0.2 - 0.03, -0.5, 0.06, 0.36); x.fillStyle = C2.boot; x.fillRect(s * 0.2 - 0.035, -0.16, 0.07, 0.06); }
        person(x, po); x.restore();
        if (view !== 'back') horseFront(x, coat, o.cael && !withArms ? null : cap, false, true);
      }
      x.restore();
    } else {
      x.save(); x.translate(ox, oy); x.scale((view === 'side' ? face : 1) * hs, hs); person(x, po); x.restore();
    }
  }
  // view and facing of a piece standing at (x, z) facing ang, seen by camera C
  function viewOf(C, x, z, ang) {
    const dx = Math.sin(ang), dz = Math.cos(ang), sr = dx * C.rx + dz * C.rz, toward = -(dx * (x - C.px) + dz * (z - C.pz)) / (Math.hypot(x - C.px, z - C.pz) || 1);
    return { view: toward > 0.62 ? 'front' : toward < -0.62 ? 'back' : 'side', face: sr >= 0 ? 1 : -1 };
  }
  // draw a figure at a projected foot point, as a lit sprite with grain, shading and a rim toward the key light
  function figureAt(ctx, C, wx, wy, wz, hgt, o, view, face, lt, t, opt = {}) {
    const foot = pj(C, wx, wy, wz); if (!foot) return null;
    const head = pj(C, wx, wy + hgt, wz); if (!head) return null;
    const kx = clamp(foot[3] * hgt / Math.max(1, Math.hypot(head[0] - foot[0], head[1] - foot[1])), 1, 2.0);
    const hp = Math.hypot(head[0] - foot[0], head[1] - foot[1]); if (hp < 3) return null;
    if (foot[0] < -hp * 1.6 || foot[0] > W + hp * 1.6 || foot[1] < -hp * 0.3 || foot[1] > H + hp * 2.4) return null;
    const tilt = Math.atan2(head[0] - foot[0], foot[1] - head[1]), lc = lt.c, walk = opt.walk, alpha = opt.alpha != null ? opt.alpha : 1;
    const rot = opt.rot || 0;
    if (hp < 64) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha; ctx.translate(foot[0], foot[1]); ctx.rotate(tilt + rot); ctx.scale(kx, 1);
      drawFigureInto(ctx, 0, 0, o, view, face, hp, lc.map(v => v * 0.92), walk);
      ctx.restore(); return { foot, head, hp };
    }
    const knight = !!o.seated, hh = knight ? hp / 1.85 : hp;
    const SW = Math.ceil(knight ? hh * (view === 'side' ? 2.2 : 1.1) + 20 : hp * (o.pavise || o.cloak ? 0.78 : 0.62) + 20), SH = Math.ceil(knight ? hh * 2.75 + 16 : hp * 1.62 + 16);
    const ox = SW / 2, oy = SH - 6, spr = scratch('spr', SW, SH), x = spr.getContext('2d');
    drawFigureInto(x, ox, oy, o, view, face, hp, lc, walk);
    const fig = knight ? hh * 2.6 : hp, top = oy - fig;
    x.globalCompositeOperation = 'source-atop';
    x.globalAlpha = 0.4; const bs = Math.max(0.5, fig / 300); x.save(); x.scale(bs, bs); x.fillStyle = x.createPattern(brushTex(), 'repeat'); x.fillRect(0, 0, SW / bs, SH / bs); x.restore(); x.globalAlpha = 1;
    // the key light's direction in the sprite's frame
    let lx = -0.6, ly = -0.8; if (opt.key) { const a = Math.atan2(opt.key[1], opt.key[0]) - tilt; lx = Math.cos(a); ly = Math.sin(a); }
    let g = x.createLinearGradient(ox + lx * fig * 0.3, 0, ox - lx * fig * 0.3, 0);
    g.addColorStop(0, rgbs([255, 196, 130], 0.12 * clamp(lt.keyAmt))); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,10,20,0.4)');
    x.fillStyle = g; x.fillRect(0, 0, SW, SH);
    g = x.createLinearGradient(0, top, 0, oy); g.addColorStop(0, 'rgba(255,240,220,0.05)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(4,2,2,0.45)'); x.fillStyle = g; x.fillRect(0, 0, SW, SH);
    if (opt.fog > 0.01) { x.fillStyle = rgbs(opt.fogCol || [30, 22, 20], opt.fog); x.fillRect(0, 0, SW, SH); }
    x.globalCompositeOperation = 'source-over';
    const ka = clamp(lt.keyAmt * 1.1);
    if (ka > 0.05) {
      const rs = scratch('rim', SW, SH), rx = rs.getContext('2d'), d = clamp(hp / 110, 1.2, 4.5);
      rx.drawImage(spr, 0, 0, SW, SH, 0, 0, SW, SH);
      rx.globalCompositeOperation = 'destination-out'; rx.drawImage(spr, 0, 0, SW, SH, -lx * d, -ly * d, SW, SH);
      rx.globalCompositeOperation = 'source-in'; rx.fillStyle = opt.rim || 'rgb(255,190,120)'; rx.fillRect(0, 0, SW, SH);
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = ka * 0.9; x.drawImage(rs, 0, 0, SW, SH, 0, 0, SW, SH); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha;
    ctx.translate(foot[0], foot[1]); ctx.rotate(tilt + rot); ctx.scale(kx, 1);
    ctx.drawImage(spr, 0, 0, SW, SH, -ox, -oy, SW, SH);
    ctx.restore();
    return { foot, head, hp };
  }
  // the screen direction from a point toward its key light
  function keyDir(C, L, x, y, z, lt) {
    const fp = pj(C, x, y, z); if (!fp) return null;
    let src = null;
    if (lt.key && lt.key.shaft) { const d = L.M.sdir; src = [x - d[0] * 6, y - d[1] * 6, z - d[2] * 6]; }
    else if (lt.key) src = [lt.key.x, lt.key.y, lt.key.z];
    if (!src) return null;
    const q = pj(C, src[0], src[1], src[2]); if (q) return [q[0] - fp[0], q[1] - fp[1]];
    const v = toCam(C, src[0], src[1], src[2]); return [v[0], -v[1]];
  }
  function drawPiece(ctx, C, p, t, L) {
    const T = TT(), w = where(p, t), y = SLAB;
    let type = p.type, alpha = 1, mount = 0;
    if (p.promote) { mount = smooth(span(t, T.kn0 + 0.45, T.kn1)); }
    const lt = lightAt(L, w.x, y + 1.2, w.z), key = keyDir(C, L, w.x, y + 1.2, w.z, lt);
    const fogd = toCam(C, w.x, 1, w.z)[2], fog = clamp((fogd - 26) / 60) * 0.5;
    const vf = viewOf(C, w.x, w.z, w.ang), walk = w.moving ? w.phase : undefined;
    let rot = 0;
    if (p.fall) { const u = span(t, p.fall[0], p.fall[1]), dir = C.rx * -1 >= 0 ? 1 : -1; rot = dir * (easeIn(u) * 1.52 + (u > 0.92 ? Math.sin((u - 0.92) * 40) * 0.04 * (1 - u) * 10 : 0)); }
    const opt = { key, walk, fog, rot, alpha, rim: lt.key && lt.key.shaft ? 'rgb(255,226,170)' : 'rgb(255,178,106)' };
    let res = null;
    if (mount < 1) { opt.alpha = 1 - mount; res = figureAt(ctx, C, w.x, y, w.z, p.h, costume(p, type), vf.view, vf.face, lt, t, opt); }
    if (mount > 0) { opt.alpha = mount; const v2 = vf.view === 'front' || vf.view === 'back' ? { view: 'side', face: vf.face } : vf; res = figureAt(ctx, C, w.x, y, w.z, HEIGHT.N, costume(p, 'N'), v2.view, v2.face, lt, t, opt) || res; }
    return res;
  }

  // ================================================================ L29-L30: the four ghosts and the gold lines of the fork
  const GH = [{ type: 'R', x: -0.4, z: -7.3 - 1.6, a: 0.42 }, { type: 'Q', x: -1.5, z: -9.6, a: 0.85 }, { type: 'B', x: -5.0, z: -9.3, a: 0.42 }, { type: 'N', x: -6.1, z: -8.5, a: 0.5 }];
  function ghostCostume(type) { return costume({ side: 'W', house: null, seed: 99 + type.charCodeAt(0) }, type); }
  function drawGhosts(ctx, C, t, items) {
    const T = TT(), cael = [sqX(5), sqZ(7)];
    GH.forEach((g, i) => {
      const up = smooth(span(t, T.gh0 + i * 0.28, T.gh0 + i * 0.28 + 1.3));
      if (up <= 0) return;
      let gx = g.x, gz = g.z, a = g.a * up, y = SLAB - 1.2 * (1 - up), solid = 0;
      if (g.type === 'N') { const m = smooth(span(t, T.kn0, T.kn0 + 0.75)); gx = lerp(g.x, cael[0], m); gz = lerp(g.z, cael[1], m); a = lerp(a, 0.95, m); solid = smooth(span(t, T.kn0 + 0.45, T.kn1)); a *= 1 - solid; }
      else { const s = smooth(span(t, T.kn0, T.kn0 + 0.7)); a *= 1 - s; y -= s * 0.8; }
      if (a <= 0.005) return;
      const d = toCam(C, gx, 1, gz)[2]; if (d < NEAR) return;
      items.push({ d: d - (g.type === 'N' ? 0.4 : 0), draw: () => ghost(ctx, C, g.type, gx, y, gz, a, t, g.type === 'Q' ? 1 : 0) });
    });
  }
  function ghost(ctx, C, type, x, y, z, a, t, queen) {
    const hgt = HEIGHT[type], foot = pj(C, x, y, z), head = pj(C, x, y + hgt, z); if (!foot || !head) return;
    const hp = Math.hypot(head[0] - foot[0], head[1] - foot[1]); if (hp < 4) return;
    const o = ghostCostume(type), vf = type === 'N' ? { view: 'side', face: -1 } : { view: 'front', face: 1 };
    const knight = type === 'N', hh = knight ? hp / 1.85 : hp, SW = Math.ceil(knight ? hh * 2.3 + 30 : hp * 0.8 + 30), SH = Math.ceil(knight ? hh * 2.8 + 20 : hp * 1.7 + 20), ox = SW / 2, oy = SH - 8;
    const spr = scratch('ghost', SW, SH), x2 = spr.getContext('2d');
    drawFigureInto(x2, ox, oy, o, vf.view, vf.face, hp, [1, 1, 1], undefined, '#ffffff');
    // an inner light: brighter at the heart, rising shimmer
    x2.globalCompositeOperation = 'source-in';
    const g = x2.createLinearGradient(0, oy - (knight ? hh * 2.6 : hp), 0, oy);
    const sh = 0.5 + 0.5 * Math.sin(t * 3 + x);
    g.addColorStop(0, `rgba(255,246,214,${0.95})`); g.addColorStop(0.5, `rgba(250,214,140,${0.75 + 0.15 * sh})`); g.addColorStop(1, 'rgba(220,160,80,0.25)');
    x2.fillStyle = g; x2.fillRect(0, 0, SW, SH);
    const tilt = Math.atan2(head[0] - foot[0], foot[1] - head[1]), cy = lerp(foot[1], head[1], 0.55), cx = lerp(foot[0], head[0], 0.55);
    glowS(ctx, cx, cy, hp * (queen ? 1.25 : 0.75), [255, 200, 120], a * (queen ? 0.55 : 0.3));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
    ctx.translate(foot[0], foot[1]); ctx.rotate(tilt); ctx.drawImage(spr, 0, 0, SW, SH, -ox, -oy, SW, SH); ctx.restore();
    if (queen) { star4(ctx, lerp(foot[0], head[0], 1.02), lerp(foot[1], head[1], 1.02), hp * 0.22 * (0.8 + 0.2 * Math.sin(t * 2.3)), a * 0.9); }
  }
  function star4(ctx, x, y, r, a) {
    if (a <= 0 || r <= 0.5) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
    for (const [rx, ry] of [[r, r * 0.06], [r * 0.06, r], [r * 0.45, r * 0.03], [r * 0.03, r * 0.45]]) { const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); g.addColorStop(0, `rgba(255,246,220,${a})`); g.addColorStop(1, 'rgba(255,220,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  // two gold lines leap from the Knight on f8 to the king on h7 and the queen on d7, burning into the stone
  function drawFork(ctx, C, t) {
    const T = TT(), a = win(t, T.fork0, T.sF1 + 0.5, 0.05, 0.6); if (a <= 0) return;
    const y = SLAB + 0.03, f8 = [sqX(5), sqZ(7)], tg = [[sqX(7), sqZ(6)], [sqX(3), sqZ(6)]];
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.lineCap = 'round';
    tg.forEach((q, i) => {
      const p = easeOut(span(t, T.fork0 + i * 0.08, T.fork1 + i * 0.08)); if (p <= 0) return;
      const ex = lerp(f8[0], q[0], p), ez = lerp(f8[1], q[1], p), A = pj(C, f8[0], y, f8[1]), B = pj(C, ex, y, ez); if (!A || !B) return;
      const s = (A[3] + B[3]) / 2;
      for (const [w, col, al] of [[0.5, '255,170,60', 0.22], [0.22, '255,210,120', 0.55], [0.07, '255,248,220', 0.95]]) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(${col},${al * a})`; ctx.lineWidth = Math.max(1.5, w * s); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); }
      // the strike: a ring on the target's square
      if (p >= 1) {
        const hit = span(t, T.fork1 + i * 0.08, T.fork1 + i * 0.08 + 0.9), Q = pj(C, q[0], y, q[1]);
        if (Q) {
          glowS(ctx, Q[0], Q[1], Q[3] * (1.2 + hit * 0.8), [255, 190, 90], 0.75 * a * (1 - hit * 0.6));
          ctx.strokeStyle = `rgba(255,220,150,${0.8 * a * (1 - hit)})`; ctx.lineWidth = Math.max(1.5, 0.08 * Q[3]);
          ctx.beginPath(); ctx.ellipse(Q[0], Q[1], Q[3] * (0.4 + hit * 0.9), Q[3] * (0.4 + hit * 0.9) * Math.abs(C.uy < 0.3 ? 1 : 0.5 + 0.5 * (1 - C.uy)), 0, 0, TAU); ctx.stroke();
          glowS(ctx, Q[0], Q[1], Q[3] * 0.5, [255, 240, 200], 0.6 * a);
        }
      }
    });
    const A = pj(C, f8[0], y, f8[1]); if (A) glowS(ctx, A[0], A[1], A[3] * 1.4, [255, 200, 110], 0.6 * a);
    ctx.restore();
  }

  // ================================================================ the crowd of candidates on the floor, in house colours
  let CROWD = null;
  function crowd() {
    if (CROWD) return CROWD; const r = rng(5151), out = [];
    const groups = [];
    for (const s of [-1, 1]) for (let g = 0; g < 4; g++) groups.push({ x0: s * (BE + 2.0), x1: s * (BE + 3.8), z0: -BE + g * (2 * BE / 4) + 0.4, z1: -BE + (g + 1) * (2 * BE / 4) - 0.4, house: (g * 2 + (s > 0 ? 1 : 0)) % 7, face: s > 0 ? -1 : 1 });
    for (let g = 0; g < 4; g++) groups.push({ x0: -BE + g * (2 * BE / 4) + 0.5, x1: -BE + (g + 1) * (2 * BE / 4) - 0.5, z0: BE + 4.6, z1: BE + 6.6, house: [7, 8, 9, 3][g], near: true });
    for (let g = 0; g < 3; g++) groups.push({ x0: -10 + g * 7, x1: -5 + g * 7, z0: -BE - 3.6, z1: -BE - 2.2, house: [4, 2, 5][g], far: true });
    groups.forEach((G, gi) => {
      const n = Math.round(Math.abs((G.x1 - G.x0) * (G.z1 - G.z0)) / 0.85);
      for (let i = 0; i < n; i++) { const x = lerp(G.x0, G.x1, r()), z = lerp(G.z0, G.z1, r()); out.push({ x, z, h: 1.62 + r() * 0.24, house: G.house, v: Math.floor(r() * 4), face: G.face || (r() < 0.5 ? 1 : -1), ph: r() * TAU, gi, cheer: r() < 0.75, back: !!G.near || !!G.far }); }
      out.push({ x: (G.x0 + G.x1) / 2, z: (G.z0 + G.z1) / 2, h: 4.2, house: G.house, banner: true, gi, ph: r() * TAU });
    });
    CROWD = out; return out;
  }
  const LESS = [{ key: 'l1', field: '#4a5a6a', charge: '#d8d4c8', device: 'none' }, { key: 'l2', field: '#5a6a4a', charge: '#e0d8c0', device: 'none' }, { key: 'l3', field: '#7a4a3a', charge: '#e4d5b2', device: 'none' }];
  const houseOf = i => i < 7 ? HS[i] : i === 9 ? K.LESSER : LESS[i - 7];
  // a candidate, painted once per house, pose and light level, then placed by projection
  function crowdSprite(hi, v, lv, cheer) {
    return K.cached(`p5:cs:${hi}:${v}:${lv}:${cheer ? 1 : 0}`, () => {
      const hs = houseOf(hi), Hs = 150, c = K.canvas(Hs * 0.8, Hs * 1.25), x = c.getContext('2d'), r = rng(hi * 31 + v * 7 + 3);
      const lvl = [0.32, 0.5, 0.72, 0.95, 1.2][lv], lc = [lvl * 1.05, lvl * 0.95, lvl * 0.85];
      const col = { cloth: mixHex(hs.field, '#2a2420', 0.25), cloth2: shadeHex(hs.field, -0.3), trim: '#3a2a1a', skin: ['#c49a76', '#a87a58', '#8a6248', '#d0a882'][v], hair: ['#2a1c12', '#4a3020', '#1e1610', '#6a5a4a'][v], steel: '#7a7a7e', wood: '#4a3424', gold: '#a8822f', leg: '#3a2e24', boot: '#1e1610', veil: '#d8d0c0', cloak: shadeHex(hs.field, -0.4), field: hs.field, charge: hs.charge };
      const C2 = {}; for (const k in col) C2[k] = litHex(col[k], lc);
      const o = { col: C2, view: 'front', kind: ['robe', 'tunic', 'gown', 'tunic'][v], head: ['hood', 'hair', 'veil', 'cap'][v], hold: 'none', cloak: v !== 1, arms: hs.device !== 'none' ? hs : null, armsA: 1, lod: 1 };
      if (o.arms) C2.charge = litHex(hs.charge, lc);
      x.save(); x.translate(c.width / 2, Hs * 1.2); x.scale(Hs, Hs); person(x, o);
      if (cheer) { x.fillStyle = C2.cloth; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 0.1, -0.78); x.lineTo(s * 0.2, -1.12); x.lineTo(s * 0.25, -1.1); x.lineTo(s * 0.15, -0.74); x.closePath(); x.fill(); } x.fillStyle = C2.skin; for (const s of [-1, 1]) { x.beginPath(); x.arc(s * 0.22, -1.13, 0.024, 0, TAU); x.fill(); } }
      x.restore();
      void r; return c;
    });
  }
  function crowdItems(ctx, C, t, L, items, o = {}) {
    const P = crowd(), T = TT(), rise = o.rise || 0;
    for (const p of P) {
      const v = toCam(C, p.x, 1, p.z); if (v[2] < 0.6) continue;
      const lt = lightAt(L, p.x, 1.2, p.z), b = (lt.c[0] + lt.c[1] + lt.c[2]) / 3, lv = b < 0.38 ? 0 : b < 0.58 ? 1 : b < 0.82 ? 2 : b < 1.05 ? 3 : 4;
      items.push({ k: 'crowd', d: v[2], draw: () => {
        if (p.banner) { crowdBanner(ctx, C, p, t, L, lt); return; }
        const sw = Math.sin(t * 0.7 + p.ph) * 0.03, bob = rise > 0 && p.cheer ? Math.abs(Math.sin(t * 6 + p.ph)) * 0.06 * rise : 0;
        const foot = pj(C, p.x + sw, bob, p.z), head = pj(C, p.x + sw, p.h + bob, p.z); if (!foot || !head) return;
        const hp = Math.hypot(head[0] - foot[0], head[1] - foot[1]); if (hp < 2 || foot[0] < -hp || foot[0] > W + hp || foot[1] < -10 || head[1] > H + 10) return;
        const spr = crowdSprite(p.house, p.v, lv, rise > 0.5 && p.cheer), k = hp / 150;
        ctx.save(); ctx.setTransform(k * p.face, 0, 0, k, foot[0], foot[1]);
        ctx.drawImage(spr, -spr.width / 2, -150 * 1.2);
        ctx.restore();
      } });
    }
    void T;
  }
  function crowdBanner(ctx, C, p, t, L, lt) {
    const hs = houseOf(p.house), base = pj(C, p.x, 0, p.z), top = pj(C, p.x, p.h, p.z); if (!base || !top) return;
    const s = top[3], lc = lt.c;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = litHex('#3a2a1a', lc); ctx.lineWidth = Math.max(1, s * 0.05); ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();
    const img = K.bannerCloth(hs, 64, 112, 'p5c' + p.house), bw = 0.95 * s, bh = bw * 112 / 64, n = 6;
    for (let i = 0; i < n; i++) { const u = i / n, wv = Math.sin(t * 1.8 + u * 4 + p.ph) * bw * 0.05 * u; ctx.drawImage(img, u * 64, 0, 64 / n + 0.5, 112, top[0] - bw * 0.06 + u * bw, top[1] + wv + s * 0.05, bw / n + 0.6, bh); }
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgbs([clamp(lc[0]) * 255, clamp(lc[1]) * 255, clamp(lc[2]) * 255], 1); ctx.fillRect(top[0] - bw * 0.1, top[1], bw * 1.2, bh * 1.1);
    ctx.restore();
  }

  // ================================================================ the hall's architecture
  function polyW(ctx, C, pts) { return quadPath(ctx, C, pts); }
  function fillW(ctx, C, pts, fill) { if (!quadPath(ctx, C, pts)) return false; ctx.fillStyle = fill; ctx.fill(); return true; }
  function hazeCol(L, d, base) { const k = clamp((d - 12) / 70) * L.M.hazeA * 1.6; return mixHex(base, toHex(L.M.haze[0] * 0.55, L.M.haze[1] * 0.55, L.M.haze[2] * 0.55), clamp(k)); }
  // a pointed lancet window on a wall: points along its outline in world space
  function lancet(cx, cz, y0, y1, hw, onX, side) {
    const pts = [], n = 10, spring = y1 - hw * 1.6;
    const P = (u, y) => onX ? [side * HW, y, cz + u] : [cx + u, y, ZF];
    pts.push(P(-hw, y0)); pts.push(P(-hw, spring));
    for (let i = 1; i <= n; i++) { const a = i / n; pts.push(P(-hw + hw * (1 - Math.cos(a * Math.PI / 2)) * 1.0, spring + (y1 - spring) * Math.sin(a * Math.PI / 2))); }
    for (let i = n - 1; i >= 0; i--) { const a = i / n; pts.push(P(hw - hw * (1 - Math.cos(a * Math.PI / 2)) * 1.0, spring + (y1 - spring) * Math.sin(a * Math.PI / 2))); }
    pts.push(P(hw, spring)); pts.push(P(hw, y0));
    return pts;
  }
  function drawWindow(ctx, C, pts, L, bright, glowAmt) {
    const M = L.M; if (!quadPath(ctx, C, pts)) return;
    const sp = pts.map(p => pj(C, p[0], p[1], p[2])).filter(Boolean); if (sp.length < 3) return;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of sp) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    const g = ctx.createLinearGradient(0, y0, 0, y1), wc = M.win.map(v => v * bright);
    g.addColorStop(0, rgbs(wc.map(v => Math.min(255, v * 1.05)), M.winA)); g.addColorStop(1, rgbs(wc.map(v => v * 0.7), M.winA));
    ctx.fillStyle = g; ctx.fill();
    // mullion and transom, dark against the light
    ctx.strokeStyle = 'rgba(10,8,8,0.85)'; ctx.lineWidth = Math.max(1, (x1 - x0) * 0.07);
    ctx.beginPath(); ctx.moveTo((x0 + x1) / 2, y0 + (y1 - y0) * 0.12); ctx.lineTo((x0 + x1) / 2, y1); ctx.moveTo(x0, y0 + (y1 - y0) * 0.55); ctx.lineTo(x1, y0 + (y1 - y0) * 0.55); ctx.stroke();
    if (glowAmt > 0) glowS(ctx, (x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) * 1.1, wc.map(v => Math.min(255, v)), glowAmt * M.winA);
  }
  function drawWalls(ctx, C, t, L) {
    const M = L.M;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    // the far wall: dark ashlar, a great lancet, pilasters
    const fd = toCam(C, 0, 10, ZF)[2];
    if (fd > NEAR) {
      if (quadPath(ctx, C, [[-HW, 0, ZF], [HW, 0, ZF], [HW, ROOF, ZF], [-HW, ROOF, ZF]])) {
        const a = pj(C, 0, ROOF, ZF), b = pj(C, 0, 0, ZF);
        const g = ctx.createLinearGradient(0, a ? a[1] : 0, 0, b ? b[1] : H); g.addColorStop(0, '#08070a'); g.addColorStop(0.45, hazeCol(L, fd, '#2a221e')); g.addColorStop(1, hazeCol(L, fd, '#1a1512'));
        ctx.fillStyle = g; ctx.fill();
      }
      for (const px of [-15.5, -6, 6, 15.5]) fillW(ctx, C, [[px - 0.8, 0, ZF + 0.05], [px + 0.8, 0, ZF + 0.05], [px + 0.8, ROOF, ZF + 0.05], [px - 0.8, ROOF, ZF + 0.05]], hazeCol(L, fd, '#332a24'));
      drawWindow(ctx, C, lancet(0, 0, 13, 25.5, 3.0, false, 0), L, 1.0, 0.55);
      for (const px of [-10.8, 10.8]) drawWindow(ctx, C, lancet(px, 0, 17, 24, 1.3, false, 0), L, 0.8, 0.3);
    }
    // the side walls above the galleries, their lancets; the near wall with its open doors
    for (const side of [-1, 1]) {
      const X = side * HW; if ((C.px - X) * -side < 0.5) continue;
      if (quadPath(ctx, C, [[X, GALY, ZF], [X, GALY, ZN], [X, ROOF, ZN], [X, ROOF, ZF]])) { ctx.fillStyle = hazeCol(L, 30, side > 0 ? '#241d18' : '#1c1714'); ctx.fill(); }
      for (const wz of WINZ) { const d = toCam(C, X, 16, wz)[2]; if (d < NEAR) continue; drawWindow(ctx, C, lancet(0, wz, WY0, WY1, WHW, true, side), L, side > 0 ? 1.0 : 0.55, side > 0 ? 0.35 : 0.15); }
      // a string course under the windows, catching the light
      const sc = [[X, 11.8, ZF], [X, 11.8, ZN], [X, 12.1, ZN], [X, 12.1, ZF]]; fillW(ctx, C, sc, '#4a3c30');
    }
    if ((C.pz - ZN) < -0.5) {
      if (quadPath(ctx, C, [[-HW, 0, ZN], [HW, 0, ZN], [HW, ROOF, ZN], [-HW, ROOF, ZN]])) { ctx.fillStyle = '#16120f'; ctx.fill(); }
      const door = [[-3.6, 0, ZN - 0.05], [3.6, 0, ZN - 0.05], [3.6, 7, ZN - 0.05]]; void door;
      const dp = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * i / 16; dp.push([3.6 * Math.cos(a), 7 + 3.6 * Math.sin(a) * 0.9, ZN - 0.05]); }
      const dpts = [[3.6, 0, ZN - 0.05], ...dp, [-3.6, 0, ZN - 0.05]];
      if (quadPath(ctx, C, dpts)) { ctx.fillStyle = M.door > 0 ? 'rgb(255,240,214)' : rgbs(M.win.map(v => v * 0.6), 1); ctx.fill(); const q = pj(C, 0, 5, ZN); if (q && M.door > 0) glowS(ctx, q[0], q[1], q[3] * 12, [255, 230, 190], 0.5 * M.door); }
    }
    ctx.restore();
  }
  // the galleries: the dark aisle beneath, the slab's edge, the watchers, the parapet; lamps on the rail
  function drawGalleries(ctx, C, t, L, o = {}) {
    const M = L.M, lean = o.lean || 0, rise = o.rise || 0;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const side of [-1, 1]) {
      const X = side * COLX;
      if ((C.px - X) * -side < -0.2 && !o.inGallery) continue;
      const inside = (C.px - X) * -side > 0;
      if (!inside) { fillW(ctx, C, [[X, GALY, ZF], [side * HW, GALY, ZF], [side * HW, GALY, ZN], [X, GALY, ZN]], '#0c0a09'); fillW(ctx, C, [[side * (HW - 0.05), GALY, ZF], [side * (HW - 0.05), GALY, ZN], [side * (HW - 0.05), GALY + 4.5, ZN], [side * (HW - 0.05), GALY + 4.5, ZF]], '#0a0808'); }
      // the aisle beneath (a dark band through the colonnade) and the gallery's slab
      if (inside) {
        if (quadPath(ctx, C, [[X + side * 0.6, 0, ZF], [X + side * 0.6, 0, ZN], [X + side * 0.6, GALY - 0.6, ZN], [X + side * 0.6, GALY - 0.6, ZF]])) { ctx.fillStyle = '#0b0908'; ctx.fill(); }
        fillW(ctx, C, [[X, GALY - 0.6, ZF], [X, GALY - 0.6, ZN], [X, GALY, ZN], [X, GALY, ZF]], hazeCol(L, 20, M.gal > 0.8 ? '#3a2c22' : '#3a3028'));
      }
      // the watchers (lean forward in L29, rise in L30); spectators are only on the hall side of a camera in the gallery
      const XS = X + side * (0.5 - lean * 0.35), y0 = GALY + rise * 0.18 + lean * 0.1, mips = crowdStrip(rise > 0.5 && o.cheer);
      for (let k = 0; k < 3; k++) {
        const z0 = -30 + k * 20; if (o.skipZ && z0 + 20 > o.skipZ[0] && z0 < o.skipZ[1]) continue;
        plane(ctx, C, mips, [XS, y0 + CS.hm, z0], [0, 0, 20], [-side * lean * 0.25, -CS.hm, 0], CS.w, CS.h, { err: 5, roots: [3, 1] });
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // gallery light: warm from lamps below the rail
      for (let k = 0; k < 3; k++) { const z0 = -30 + k * 20; if (o.skipZ && z0 + 20 > o.skipZ[0] && z0 < o.skipZ[1]) continue; if (quadPath(ctx, C, [[XS, y0, z0], [XS, y0, z0 + 20], [XS, y0 + CS.hm, z0 + 20], [XS, y0 + CS.hm, z0]])) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; const l = M.gal; ctx.fillStyle = rgbs([lerp(150, 235, l), lerp(130, 190, l), lerp(120, 150, l)], 1); ctx.fill(); ctx.restore(); } }
      for (let k = 0; k < 3; k++) plane(ctx, C, parapetTex(), [X, GALY + 1.1, -30 + k * 20], [0, 0, 20], [0, -1.1, 0], 2048, 112, { err: 5, roots: [3, 1] });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // lamps along the rail
      for (const z of COLZ) for (const dz of [-3.5]) {
        const q = pj(C, X - side * 0.1, GALY + 1.35, z + dz); if (!q) continue; const fl = flk(t, z + side * 3);
        glowS(ctx, q[0], q[1], q[3] * 2.6, [255, 150, 70], 0.28 * fl * M.gal); flame(ctx, q[0], q[1] + q[3] * 0.1, q[3] * 0.32 * fl, t * 1.2 + z, 1);
      }
    }
    ctx.restore();
  }
  function drawColumn(ctx, C, x, z, L) {
    const M = L.M, top = 24, b0 = pj(C, x, 0, z), b1 = pj(C, x, top, z); if (!b0 || !b1) return;
    const d = toCam(C, x, 8, z)[2], wb = COLR * b0[3], wt = COLR * b1[3];
    if (Math.max(b0[0], b1[0]) + wb < -50 || Math.min(b0[0], b1[0]) - wb > W + 50) return;
    // which side faces the light: day shafts and windows from +x; at night, the candles of the board
    const lightDirX = M.sa > 0.5 ? 1 : -Math.sign(x), r = toCam(C, x + lightDirX, 8, z), c0 = toCam(C, x, 8, z), litRight = (r[0] - c0[0]) > 0;
    const base = hazeCol(L, d, '#3e3329'), lit = hazeCol(L, d, M.sa > 0.5 ? '#9a8064' : '#7a5a40'), dark = hazeCol(L, d, '#120e0c');
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath(); ctx.moveTo(b0[0] - wb, b0[1]); ctx.lineTo(b0[0] + wb, b0[1]); ctx.lineTo(b1[0] + wt, b1[1]); ctx.lineTo(b1[0] - wt, b1[1]); ctx.closePath();
    const g = ctx.createLinearGradient(b0[0] - wb, 0, b0[0] + wb, 0);
    if (litRight) { g.addColorStop(0, dark); g.addColorStop(0.55, base); g.addColorStop(0.86, lit); g.addColorStop(1, base); } else { g.addColorStop(0, base); g.addColorStop(0.14, lit); g.addColorStop(0.45, base); g.addColorStop(1, dark); }
    ctx.fillStyle = g; ctx.fill();
    // flutes
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = Math.max(1, wb * 0.05);
    for (const u of [-0.6, -0.3, 0, 0.3, 0.6]) { ctx.beginPath(); ctx.moveTo(b0[0] + u * wb, b0[1]); ctx.lineTo(b1[0] + u * wt, b1[1]); ctx.stroke(); }
    // the vault's darkness swallows the top
    const vg = ctx.createLinearGradient(0, b1[1], 0, b0[1]); vg.addColorStop(0, 'rgba(6,5,6,0.95)'); vg.addColorStop(0.35, 'rgba(6,5,6,0.25)'); vg.addColorStop(1, 'rgba(6,5,6,0)'); ctx.fillStyle = vg; ctx.fillRect(Math.min(b0[0], b1[0]) - wb * 2, Math.min(b0[1], b1[1]), wb * 4 + Math.abs(b1[0] - b0[0]), Math.abs(b0[1] - b1[1]));
    ctx.restore();
    // plinth and a band at the gallery's height
    for (const [y0, y1, k] of [[0, 0.9, 1.3], [GALY - 0.6, GALY, 1.18]]) { const p0 = pj(C, x, y0, z), p1 = pj(C, x, y1, z); if (!p0 || !p1) continue; ctx.fillStyle = hazeCol(L, d, '#2e261f'); ctx.beginPath(); ctx.moveTo(p0[0] - COLR * k * p0[3], p0[1]); ctx.lineTo(p0[0] + COLR * k * p0[3], p0[1]); ctx.lineTo(p1[0] + COLR * k * p1[3], p1[1]); ctx.lineTo(p1[0] - COLR * k * p1[3], p1[1]); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function drawCandelabrum(ctx, C, x, z, t, L, i) {
    const b = pj(C, x, 0, z), tp = pj(C, x, CANDH, z); if (!b || !tp) return;
    const fr = L.M.cand * flk(t, i), s = tp[3];
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = '#141010'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, s * 0.07); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke();
    for (const a of [-0.5, 0.5]) { const f = pj(C, x + Math.sin(a) * 0.45, 0, z + Math.cos(a) * 0.3); if (f) { ctx.lineWidth = Math.max(1, s * 0.05); ctx.beginPath(); ctx.moveTo(f[0], f[1]); ctx.lineTo(lerp(b[0], tp[0], 0.15), lerp(b[1], tp[1], 0.15)); ctx.stroke(); } }
    const ring = []; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + 0.3, q = pj(C, x + Math.cos(a) * 0.38, CANDH, z + Math.sin(a) * 0.38); if (q) ring.push(q); }
    ctx.lineWidth = Math.max(1, s * 0.05); ctx.beginPath(); ring.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#d8cbb0'; for (const q of ring) ctx.fillRect(q[0] - s * 0.025, q[1] - s * 0.22, s * 0.05, s * 0.22);
    ctx.restore();
    glowS(ctx, tp[0], tp[1] - s * 0.4, Math.min(700, s * 5.5), [255, 150, 70], 0.3 * fr);
    glowS(ctx, tp[0], tp[1] - s * 0.35, Math.min(260, s * 1.6), [255, 214, 150], 0.35 * fr);
    for (const q of ring) flame(ctx, q[0], q[1] - s * 0.22, Math.max(1, s * 0.16 * (0.85 + 0.2 * fr)), t * 1.3 + q[0] * 0.01, 1);
  }
  function drawSlab(ctx, C, L) {
    const E = BE, hb = SLAB;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const [ax, az, bx, bz, nx, nz] of [[-E, E, E, E, 0, 1], [E, -E, -E, -E, 0, -1], [E, E, E, -E, 1, 0], [-E, -E, -E, E, -1, 0]]) {
      const mx = (ax + bx) / 2, mz = (az + bz) / 2; if ((C.px - mx) * nx + (C.pz - mz) * nz <= 0) continue;
      const l2 = lightAt(L, mx * 0.95, 0.2, mz * 0.95).c;
      fillW(ctx, C, [[ax, 0, az], [bx, 0, bz], [bx, hb, bz], [ax, hb, az]], litHex('#5a4a3a', l2));
      fillW(ctx, C, [[ax, hb - 0.02, az], [bx, hb - 0.02, bz], [bx, hb - 0.07, bz], [ax, hb - 0.07, az]], litHex('#c9a14a', l2));
    }
    ctx.restore();
  }
  // the dais of the Seven: steps, seven high seats, the Seven standing before them
  function daisItems(ctx, C, t, L, items) {
    const D = DAIS, M = L.M;
    const d0 = toCam(C, 0, 1, D.z1)[2]; if (d0 < NEAR) return;
    items.push({ d: toCam(C, 0, 1, D.z1 + 1.5)[2] + 0.5, draw: () => {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const lt = lightAt(L, 0, 1, D.z1 + 1).c;
      for (let s = 0; s < 3; s++) { const z = D.z1 + 1.5 - s * 0.5, y0 = s * 0.5, y1 = y0 + 0.5; fillW(ctx, C, [[-D.x, y0, z], [D.x, y0, z], [D.x, y1, z], [-D.x, y1, z]], litHex('#5a4a3c', lt)); fillW(ctx, C, [[-D.x, y1, z], [D.x, y1, z], [D.x, y1, z - 0.5], [-D.x, y1, z - 0.5]], litHex('#3a3028', lt)); }
      fillW(ctx, C, [[-D.x, D.y, D.z1], [D.x, D.y, D.z1], [D.x, D.y, D.z0], [-D.x, D.y, D.z0]], litHex('#2e2620', lt));
      ctx.restore();
    } });
    for (let k = 0; k < 7; k++) {
      const x = (k - 3) * 3.1, z = -28.2, hs = HS[[3, 6, 1, 0, 4, 2, 5][k]];
      items.push({ d: toCam(C, x, 3, z)[2], draw: () => {
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        const lt = lightAt(L, x, 3, z + 1.5).c;
        const back = [[x - 0.85, D.y, z], [x + 0.85, D.y, z], [x + 0.85, D.y + 4.8, z], [x, D.y + 5.4, z], [x - 0.85, D.y + 4.8, z]];
        fillW(ctx, C, back, litHex(mixHex(hs.field, '#1a1410', 0.35), lt));
        if (quadPath(ctx, C, back)) { ctx.strokeStyle = litHex('#c9a14a', lt); ctx.lineWidth = Math.max(1, pj(C, x, 4, z)[3] * 0.08); ctx.stroke(); }
        const q = pj(C, x, D.y + 3.6, z + 0.02); if (q && q[3] > 3) { ctx.fillStyle = litHex(hs.charge, lt); K.device(ctx, hs.device, q[0], q[1], q[3] * 0.9); }
        ctx.restore();
        const o = costume({ side: 'W', house: hs, seed: 700 + k }, 'K'); o.head = k === 3 ? 'crown' : 'bare'; o.col.cloth = mixHex(hs.field, '#3a2a20', 0.2); o.col.cloak = shadeHex(hs.field, -0.35); o.beard = k % 2 === 0;
        const lt2 = lightAt(L, x, D.y + 1.2, z + 1.2);
        figureAt(ctx, C, x, D.y, z + 1.0, 1.95, o, 'front', 1, lt2, t, { key: keyDir(C, L, x, D.y + 1.2, z + 1.0, lt2), fog: clamp((toCam(C, x, 1, z)[2] - 26) / 60) * 0.5 });
      } });
    }
  }
  // a banner hanging from a bar, rippling (projected in strips)
  function hangBanner(ctx, C, x, y, z, w, h, hs, tw, L) {
    const cloth = K.bannerCloth(hs, 128, 384, 'p5g:' + hs.key), mips = K.cached('p5:bm:' + hs.key, () => mipChain(cloth, 3));
    const q = pj(C, x, y - h / 2, z); if (!q) return; if (q[0] < -q[3] * w * 2 || q[0] > W + q[3] * w * 2) return;
    const n = 4;
    for (let k = 0; k < n; k++) {
      const s0 = k / n, s1 = (k + 1) / n, wv0 = Math.sin(tw * 1.1 + s0 * 4) * 0.12, wv1 = Math.sin(tw * 1.1 + s1 * 4) * 0.12;
      const X0 = x + w * (0.5 - s0), X1 = x + w * (0.5 - s1);
      plane(ctx, C, mips, [X0, y, z + wv0], [X1 - X0, 0, wv1 - wv0], [0, -h, 0], 128 / n, 384, { err: 5, roots: [1, 2], u0: k * 128 / n });
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const lt = lightAt(L, x, y - h * 0.6, z + 1.5).c, sh = shaftAt(L.M, x, y - h * 0.3, z + 0.5);
    if (quadPath(ctx, C, [[x + w / 2, y, z], [x - w / 2, y, z], [x - w / 2, y - h, z], [x + w / 2, y - h, z]])) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgbs([clamp(lt[0] + sh * 0.5 + 0.25) * 255, clamp(lt[1] + sh * 0.4 + 0.22) * 255, clamp(lt[2] + sh * 0.3 + 0.22) * 255], 1); ctx.fill(); ctx.restore(); }
  }
  function drawGreatBanners(ctx, C, t, L) {
    for (let k = 0; k < 7; k++) {
      const x = [-10.6, -7.3, -4.0, 0, 4.0, 7.3, 10.6][k], top = k === 3 ? 12.6 : 15.0, hs = HS[[3, 6, 1, 0, 4, 2, 5][k]];
      hangBanner(ctx, C, x, top, ZF + 0.6, 2.4, 7.4, hs, t * 0.8 + k * 1.3, L);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      fillW(ctx, C, [[x + 1.5, top + 0.15, ZF + 0.6], [x - 1.5, top + 0.15, ZF + 0.6], [x - 1.5, top - 0.05, ZF + 0.6], [x + 1.5, top - 0.05, ZF + 0.6]], '#1a120c');
    }
  }
  // shafts of light and the haze they make visible, at quarter resolution, with dust turning in them
  function drawAir(ctx, C, t, L, o = {}) {
    const M = L.M, q = 4, A = K.layer('p5:air', W / q, H / q), ax = A.getContext('2d');
    ax.setTransform(1 / q, 0, 0, 1 / q, 0, 0);
    // a general haze, heavier high in the hall where the light hangs
    const hz = M.haze, g = ax.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgbs(hz, M.hazeA * 0.5)); g.addColorStop(0.5, rgbs(hz, M.hazeA * 0.3)); g.addColorStop(1, rgbs(hz, M.hazeA * 0.12)); ax.fillStyle = g; ax.fillRect(0, 0, W, H);
    ax.globalCompositeOperation = 'lighter';
    const slab = (pts, a, col) => { const sp = []; for (const p of pts) { const v = toCam(C, p[0], p[1], p[2]); if (v[2] < NEAR) return; sp.push([C.cx + C.f * v[0] / v[2], C.cy - C.f * v[1] / v[2]]); } ax.fillStyle = rgbs(col, a); ax.beginPath(); sp.forEach((p, i) => i ? ax.lineTo(p[0], p[1]) : ax.moveTo(p[0], p[1])); ax.closePath(); ax.fill(); };
    if (M.sa > 0) {
      const d = M.sdir, n = 16;
      for (const wz of WINZ) {
        const sMax = M.sa > 0.6 ? (WY1) / -d[1] : 2 * HW / -d[0];
        for (let i = 0; i < n; i++) {
          const s = (i + 0.5) / n * sMax, a = 0.075 * M.sa * (1 - i / n * 0.6) * (o.shaftK || 1);
          const pts = [[HW, WY0, wz - WHW], [HW, WY0, wz + WHW], [HW, WY1, wz + WHW], [HW, WY1, wz - WHW]].map(p => [p[0] + d[0] * s, p[1] + d[1] * s, p[2] + d[2] * s]);
          if (pts.every(p => p[1] < 0)) break;
          slab(pts.map(p => [p[0], Math.max(0, p[1]), p[2]]), a, M.shaft);
        }
      }
    }
    if (M.far > 0) {
      const d = FARDIR, n = 18;
      for (let i = 0; i < n; i++) { const s = (i + 0.5) / n * 26, a = 0.09 * M.far * (1 - i / n * 0.7); const pts = [[-2.6, 13.5, ZF], [2.6, 13.5, ZF], [2.6, 24, ZF], [-2.6, 24, ZF]].map(p => [p[0], Math.max(0, p[1] + d[1] * s), p[2] + d[2] * s]); slab(pts, a, M.shaft); }
    }
    // candle halos in the haze
    for (const l of L.lights) { if (!l.fire) continue; const p = pj(C, l.x, l.y, l.z); if (!p) continue; const r = Math.min(900, p[3] * 7); const gg = ax.createRadialGradient(p[0], p[1], 0, p[0], p[1], r); gg.addColorStop(0, rgbs(l.c, 0.16 * l.a)); gg.addColorStop(1, rgbs(l.c, 0)); ax.fillStyle = gg; ax.fillRect(p[0] - r, p[1] - r, r * 2, r * 2); }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.imageSmoothingQuality = 'medium'; ctx.drawImage(A, 0, 0, W, H); ctx.restore();
    // dust in the light
    if (M.sa > 0 || M.far > 0) {
      const r = rng(9191), tw = o.still != null ? lerp(t, o.still, 0.94) : t;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 520; i++) {
        const x = lerp(-HW, HW, r()), y = 0.3 + r() * 20, z = lerp(-28, 20, r()), ph = r() * TAU;
        const px = x + Math.sin(tw * 0.13 + ph) * 0.6, py = y + Math.sin(tw * 0.09 + ph * 2) * 0.4 + ((tw * 0.05 + ph) % 1) * 0.3, pz = z + Math.cos(tw * 0.11 + ph) * 0.6;
        const sh = shaftAt(M, px, py, pz); if (sh < 0.15) continue;
        const p = pj(C, px, py, pz); if (!p || p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > H) continue;
        const s = clamp(p[3] * 0.02, 0.6, 4), a = sh * (0.35 + 0.35 * Math.sin(tw * 1.3 + ph * 5));
        ctx.fillStyle = `rgba(255,236,200,${a})`; ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
      }
      ctx.restore();
    }
  }

  // ================================================================ the camera: keyed shots, eased through Hermite curves
  let CK = null;
  function camKeys() {
    if (CK) return CK; const T = TT();
    const k = (t, pos, tgt, f, o = {}) => Object.assign({ t, pos, tgt, f }, o);
    CK = [
      // L26: high among the Seven's banners, then a crane down and back over the whole hall
      k(T.s - 1.6, [0.4, 13.2, -16.5], [0.1, 12.0, ZF], 1650, { cut: true, shot: 'A' }),
      k(T.s + 0.9, [0.8, 12.2, -9.5], [0.1, 9.6, ZF], 1450),
      k(T.sB1 + 0.3, [3.4, 9.2, 21], [-0.4, 1.6, -6], 1150),
      // the born stride into their squares, seen low along White's back rank
      k(T.sB1, [11.2, 1.3, 11.6], [-2.5, 1.55, 5.6], 1250, { cut: true, shot: 'B1' }),
      k(T.sB2 + 0.3, [10.2, 1.45, 10.1], [-4.2, 1.5, 5.4], 1400),
      // Cael steps into the front rank
      k(T.sB2, [sqX(5) - 2.5, 1.05, 1.4], [sqX(5) + 0.4, 1.35, 6.4], 1300, { cut: true, shot: 'B2' }),
      k(T.sC1 + 0.3, [sqX(5) - 1.8, 1.25, 2.6], [sqX(5) + 0.2, 1.5, 6.2], 1450),
      // L29: the final trial seen from above; the pawn walks to the eighth rank
      k(T.sD1, [-0.6, 31, 9.5], [-1.2, 0, -1.6], 1500, { cut: true, shot: 'D1' }),
      k(T.sD2 + 0.3, [-2.6, 22.5, 1.2], [-3.0, 0, -5.4], 1550),
      // low behind him as the ghosts rise and the Knight is chosen
      k(T.sD2, [-0.8, 1.45, -1.4], [-3.6, 2.2, -10.0], 1300, { cut: true, shot: 'D2' }),
      k(T.sE2 + 0.3, [-1.6, 1.6, -2.6], [-3.5, 2.3, -10.0], 1450),
      // L30: from above, the fork; the king falls; a hush; then down and out as the hall rises
      k(T.sE2, [-3.1, 18.5, -1.0], [-3.2, 0, -6.4], 1650, { cut: true, shot: 'E2' }),
      k(T.sE3 + 0.3, [-3.0, 16.2, -1.9], [-3.2, 0, -6.6], 1720),
      // A03: low across the board to the arbiter in the hush; as the hall rises the camera lifts toward the galleries
      k(T.sE3, [-1.8, 1.35, 0.8], [-6.6, 2.3, -9.5], 1300, { cut: true, shot: 'E3' }),
      k(T.rise0, [-2.2, 1.42, 0.2], [-6.6, 2.4, -9.5], 1360),
      k(T.sF1 + 0.3, [-1.4, 2.4, 2.0], [-6.2, 4.2, -10.0], 1220),
      // L32: up and back into the high gallery
      k(T.sG, [1.6, 1.85, -13.6], [0, 1.0, -21.5], 1350, { cut: true, shot: 'G' }),
      k(T.sG + 2.6, [8.6, 7.4, -9.0], [-0.4, 1.4, -20.5], 1200),
      k(T.e + 2, [COLX + 2.5, GALY + 1.8, -5.0], [-1.5, 1.2, -19.5], 1100),
    ];
    return CK;
  }
  function camAt(t, id) {
    const ks = camKeys();
    let s0 = Math.max(0, ks.findIndex(k => k.shot === id)), s1 = s0; while (s1 < ks.length - 1 && !ks[s1 + 1].cut) s1++;
    let i = s0; while (i < s1 && t >= ks[i + 1].t) i++;
    const get = (j) => [...ks[j].pos, ...ks[j].tgt, Math.log(ks[j].f)];
    const sec = (j) => { const pa = get(j), pb = get(j + 1), dt = ks[j + 1].t - ks[j].t; return pa.map((v, q) => (pb[q] - v) / dt); };
    const tan = (j) => {
      const dL = j > s0 ? sec(j - 1) : null, dR = j < s1 ? sec(j) : null;
      if (!dL && !dR) return get(j).map(() => 0);
      if (!dL) return dR.map(v => v * 0.5);
      if (!dR) return dL.map(v => v * 0.5);
      return dL.map((a, q) => { const b = dR[q]; if (a * b <= 0) return 0; const m = (a + b) / 2, lim = 3 * Math.min(Math.abs(a), Math.abs(b)); return Math.sign(m) * Math.min(Math.abs(m), lim); });
    };
    let out;
    if (t < ks[s0].t) { const p = get(s0), m = tan(s0), dt = t - ks[s0].t; out = p.map((v, q) => v + m[q] * dt); }
    else if (i >= s1) { const p = get(s1), m = tan(s1), dt = Math.max(0, t - ks[s1].t); out = p.map((v, q) => v + m[q] * dt * Math.exp(-dt * 0.5)); }
    else {
      const t0 = ks[i].t, t1 = ks[i + 1].t, u = clamp((t - t0) / (t1 - t0)), dt = t1 - t0, p0 = get(i), p1 = get(i + 1), m0 = tan(i), m1 = tan(i + 1);
      const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
      out = p0.map((v, q) => h00 * v + h10 * dt * m0[q] + h01 * p1[q] + h11 * dt * m1[q]);
    }
    const T = TT(), still = 1 - 0.8 * win(t, T.hush0, T.rise0, 0.2, 0.2), n = (s, k) => (K.fbm(t * 0.35 + k * 10, s, 2, 991) - 0.5) * 2;
    return { pos: [out[0] + n(1, 1) * 0.05 * still, Math.max(0.6, out[1] + n(2, 2) * 0.04 * still), out[2] + n(3, 3) * 0.05 * still], tgt: [out[3] + n(4, 4) * 0.04 * still, out[4] + n(5, 5) * 0.03 * still, out[5] + n(6, 6) * 0.04 * still], f: Math.exp(out[6]), roll: n(7, 7) * 0.004 * still };
  }

  // ================================================================ the hall frame
  function hall(ctx, t, sh) {
    const PR = window.__prof = window.__prof || {}; let _t0 = performance.now(); const mark = k => { const n = performance.now(); PR[k] = (PR[k] || 0) + n - _t0; _t0 = n; };
    const T = TT(), cam = camAt(t, sh.id), C = camera(cam.pos, cam.tgt, cam.f, cam.roll), mode = sh.mode;
    const riseA = sh.id === 'E3' ? smooth(span(t, T.rise0, T.rise0 + 0.5)) : sh.id === 'G' ? 0.6 : 0;
    const L = lights(t, mode, 1 + 0.25 * riseA);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#060506'; ctx.fillRect(0, 0, W, H);
    drawWalls(ctx, C, t, L);
    mark('drawWalls(ctx,');
    drawGreatBanners(ctx, C, t, L);
    mark('drawGreatBanne');
    // the floor at half resolution, lit; the board at full resolution, lit
    const Li = lightImage(C, L);
    mark('const Li = lig');
    const G = K.layer('p5:ground', W / 2, H / 2), gx = G.getContext('2d');
    gx.fillStyle = '#2a221c'; gx.fillRect(0, 0, W / 2, H / 2);
    const fm = floorMips(), Rv = 70;
    for (let i = -4; i < 4; i++) for (let j = -6; j < 6; j++) {
      const x0 = i * FT.m, z0 = j * FT.m; if (x0 + FT.m < -HW || x0 > HW || z0 + FT.m < ZF || z0 > ZN) continue;
      if (x0 >= -BE && x0 + FT.m <= BE && z0 >= -BE && z0 + FT.m <= BE) continue;
      const c = toCam(C, x0 + 3, 0, z0 + 3); if (c[2] > Rv) continue;
      plane(gx, C, fm, [x0, 0, z0], [FT.m, 0, 0], [0, 0, FT.m], FT.n, FT.n, { k: 0.5, err: 4, roots: [1, 1] });
    }
    gx.setTransform(1, 0, 0, 1, 0, 0); gx.globalCompositeOperation = 'multiply'; gx.imageSmoothingQuality = 'low'; gx.drawImage(Li.mul, 0, 0, W / 2, H / 2); gx.globalCompositeOperation = 'lighter'; gx.drawImage(Li.add, 0, 0, W / 2, H / 2); gx.globalCompositeOperation = 'source-over';
    mark('gx.setTransfor');
    // the floor only below the horizon (walls already drawn above it)
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (quadPath(ctx, C, [[-HW, 0, ZF], [HW, 0, ZF], [HW, 0, ZN], [-HW, 0, ZN]])) { ctx.clip(); ctx.imageSmoothingQuality = 'low'; ctx.drawImage(G, 0, 0, W, H); }
    ctx.restore();
    drawSlab(ctx, C, L);
    plane(ctx, C, boardMips(), [-BE, SLAB, -BE], [2 * BE, 0, 0], [0, 0, 2 * BE], BT.n, BT.n, { roots: [8, 8], err: 4 });
    mark('plane(ctx, C, ');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save(); if (quadPath(ctx, C, [[-BE, SLAB, -BE], [BE, SLAB, -BE], [BE, SLAB, BE], [-BE, SLAB, BE]])) { ctx.clip(); ctx.globalCompositeOperation = 'multiply'; ctx.imageSmoothingQuality = 'low'; ctx.drawImage(Li.mul, 0, 0, W, H); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(Li.add, 0, 0, W, H); } ctx.restore();
    drawReflections(ctx, C, L);
    mark('drawReflection');
    drawFork(ctx, C, t);
    // the galleries stand behind everything on the floor
    const lean = sh.id === 'D2' ? smooth(span(t, T.sD2, T.sD2 + 2.2)) : 0;
    drawGalleries(ctx, C, t, L, { lean, rise: riseA, cheer: sh.id === 'E3', inGallery: sh.id === 'G', skipZ: sh.id === 'G' ? [-14, 6] : null });
    mark('drawGalleries(');
    // everything that stands, far to near
    const items = [];
    const set = sh.set === 'start' ? sets().start : sh.set === 'fin' ? sets().fin : [];
    for (const p of set) { const w = where(p, t), v = toCam(C, w.x, 1, w.z); if (v[2] > NEAR) items.push({ k: 'piece', d: v[2], draw: () => drawPiece(ctx, C, p, t, L) }); }
    for (const s of [-1, 1]) for (const z of COLZ) { const v = toCam(C, s * COLX, 6, z); if (v[2] > 0.8) items.push({ k: 'col', d: v[2] + 0.3, draw: () => drawColumn(ctx, C, s * COLX, z, L) }); }
    CAND.forEach(([x, z], i) => { const v = toCam(C, x, 1.5, z); if (v[2] > 1.0) items.push({ k: 'cand', d: v[2], draw: () => drawCandelabrum(ctx, C, x, z, t, L, i) }); });
    for (const s of [-1, 1]) { const v = toCam(C, s * 9.5, 2, -23.2); if (v[2] > 1) items.push({ d: v[2], draw: () => daisFire(ctx, C, s * 9.5, -23.2, t, L, s) }); }
    crowdItems(ctx, C, t, L, items, { rise: sh.id === 'E3' ? riseA : 0 });
    daisItems(ctx, C, t, L, items);
    if (sh.id === 'D2') drawGhosts(ctx, C, t, items);
    if (sh.id === 'G') knightingItems(ctx, C, t, L, items);
    if (sh.id === 'E3') arbiterItems(ctx, C, t, L, items);
    items.sort((a, b) => b.d - a.d);
    for (const it of items) { const q0 = performance.now(); ctx.save(); it.draw(); ctx.restore(); PR['it:' + (it.k || '?')] = (PR['it:' + (it.k || '?')] || 0) + performance.now() - q0; }
    mark('for (const it ');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    drawAir(ctx, C, t, L, { still: (sh.id === 'E2' || sh.id === 'E3') && t > T.hush0 && t < T.rise0 ? T.hush0 : null });
    mark('drawAir(ctx, C');
    if (sh.id === 'D2') drawGhostSparks(ctx, C, t);
    if (riseA > 0 && sh.id === 'E3') drawRiseFx(ctx, C, t, riseA);
    return C;
  }
  function daisFire(ctx, C, x, z, t, L, s) {
    const q = pj(C, x, 2.4, z), b = pj(C, x, 0, z); if (!q || !b) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1a1410'; const w = q[3] * 0.5;
    ctx.beginPath(); ctx.moveTo(b[0] - w * 0.6, b[1]); ctx.lineTo(b[0] + w * 0.6, b[1]); ctx.lineTo(q[0] + w, q[1]); ctx.lineTo(q[0] - w, q[1]); ctx.closePath(); ctx.fill(); ctx.restore();
    const fr = L.M.cand * flk(t, s + 9);
    flame(ctx, q[0], q[1], q[3] * 1.1 * fr, t * 1.1 + s * 7, fr);
    glowS(ctx, q[0], q[1] - q[3] * 0.5, Math.min(600, q[3] * 5), [255, 140, 60], 0.32 * fr);
  }
  function drawReflections(ctx, C, L) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!quadPath(ctx, C, [[-BE, SLAB, -BE], [BE, SLAB, -BE], [BE, SLAB, BE], [-BE, SLAB, BE]])) { ctx.restore(); return; }
    ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    for (const l of L.lights) {
      if (!l.fire) continue;
      const my = 2 * SLAB - l.y, q = pj(C, l.x, my, l.z); if (!q) continue;
      const u = (C.py - SLAB) / (C.py - my), fx = C.px + (l.x - C.px) * u, fz = C.pz + (l.z - C.pz) * u;
      if (Math.abs(fx) > BE + 1 || Math.abs(fz) > BE + 1) continue;
      const fp = pj(C, fx, SLAB, fz); if (!fp) continue;
      const rx = Math.min(240, fp[3] * 0.5), ry = Math.min(700, fp[3] * 2.2), a = 0.14 * clamp(l.a);
      ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(rx, ry);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(255,190,110,${a})`); g.addColorStop(0.35, `rgba(255,140,60,${a * 0.45})`); g.addColorStop(1, 'rgba(255,120,50,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  // motes of gold rising from the ghosts
  function drawGhostSparks(ctx, C, t) {
    const T = TT(), a = win(t, T.gh0, T.kn1 + 0.6, 0.6, 0.6); if (a <= 0) return;
    const r = rng(4747);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const g = GH[i % 4], life = 1.6 + r() * 1.6, off = r() * life, age = ((t + off) % life) / life, x = g.x + (r() - 0.5) * 1.2, z = g.z + (r() - 0.5) * 0.8, y = SLAB + age * 3.2;
      const p = pj(C, x + Math.sin(t + i) * 0.1, y, z); if (!p) continue; const s = clamp(p[3] * 0.03, 0.8, 3.5);
      ctx.fillStyle = `rgba(255,220,150,${a * Math.sin(age * Math.PI) * 0.8})`; ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
    }
    ctx.restore();
  }
  // the hall rises: a swell of light and a lift of dust and petals in the air
  function drawRiseFx(ctx, C, t, a) {
    const T = TT(), r = rng(3131), lt = t - T.rise0;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 160; i++) {
      const x = lerp(-13, 13, r()), z = lerp(-14, 12, r()), y0 = 7 + r() * 9, sp = 0.6 + r() * 1.2, ph = r() * TAU;
      const p = pj(C, x + Math.sin(lt * 1.5 + ph) * 0.5, y0 - lt * sp, z); if (!p) continue; const s = clamp(p[3] * 0.05, 1, 5);
      ctx.fillStyle = `rgba(255,${200 + (i % 3) * 18},140,${0.55 * a})`; ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(lt * 2 + ph); ctx.fillRect(-s, -s * 0.4, s * 2, s * 0.8); ctx.restore();
    }
    ctx.restore();
    K.grade(ctx, '#ffd9a0', 'soft-light', 0.12 * a * (1 - smooth(span(t, T.rise0 + 0.4, T.rise0 + 2.0))));
  }

  // ================================================================ A03: the arbiter, robed, his white staff struck on the stone
  const ARB = { x: -BE + 0.45, z: sqZ(6) + 0.2 };
  function arbiterItems(ctx, C, t, L, items) {
    const T = TT(), v = toCam(C, ARB.x, 1, ARB.z); if (v[2] < NEAR) return;
    items.push({ d: v[2], draw: () => {
      const lt = lightAt(L, ARB.x, 1.3, ARB.z), o = { col: { cloth: '#3a3634', cloth2: '#2a2624', trim: '#c9a14a', skin: '#b08868', hair: '#8a8278', steel: '#8a8a8c', wood: '#d8cfbc', gold: '#c9a14a', leg: '#2a2420', boot: '#141010', veil: '#efe7d6', cloak: '#1e1a18', beard: '#9a948a', trim2: '#ece6da' }, kind: 'robe', head: 'cap', hold: 'none', cloak: true, collar: true, beard: true, arms: null, armsA: 0 };
      const vf = viewOf(C, ARB.x, ARB.z, Math.atan2(sqX(5) - ARB.x, sqZ(7) - ARB.z));
      const r = figureAt(ctx, C, ARB.x, SLAB, ARB.z, 1.96, o, vf.view, vf.face, lt, t, { key: keyDir(C, L, ARB.x, 1.3, ARB.z, lt), rim: 'rgb(255,178,106)' });
      // the staff: lifted, then struck down on "Mate"; a ring of dust and light where it lands
      const lift = smooth(span(t, T.sE3 - 0.6, T.sE3 + 0.5)) * (1 - easeIn(span(t, T.strike - 0.22, T.strike))), sx = ARB.x + 0.42, sz = ARB.z + 0.25, y0 = SLAB + lift * 1.05;
      const b = pj(C, sx, y0, sz), tp = pj(C, sx, y0 + 2.5, sz); if (!b || !tp) return;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.lineCap = 'round';
      ctx.strokeStyle = litHex('#d8cfbc', lt.c); ctx.lineWidth = Math.max(1.5, b[3] * 0.045); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke();
      K.gold(ctx, c => { c.beginPath(); c.arc(tp[0], tp[1], Math.max(2, tp[3] * 0.07), 0, TAU); }, tp[0] - 10, tp[1] - 10, tp[0] + 10, tp[1] + 10, { outline: false });
      ctx.restore();
      const hit = span(t, T.strike, T.strike + 0.8);
      if (hit > 0 && hit < 1) { const g = pj(C, sx, SLAB + 0.02, sz); if (g) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.strokeStyle = `rgba(255,214,160,${0.7 * (1 - hit)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(g[0], g[1], g[3] * (0.2 + hit * 1.4), g[3] * (0.08 + hit * 0.5), 0, 0, TAU); ctx.stroke(); ctx.restore(); glowS(ctx, g[0], g[1], g[3] * 0.8, [255, 220, 170], 0.5 * (1 - hit)); } }
      void r;
    } });
  }

  // ================================================================ L32: Cael knelt at the dais, the lord, the hooded man in the gallery
  const KNEEL = { x: 0, z: -20.8 };
  function knightingItems(ctx, C, t, L, items) {
    const v = toCam(C, KNEEL.x, 1, KNEEL.z); if (v[2] < NEAR) return;
    items.push({ d: v[2], draw: () => {
      const lt = lightAt(L, KNEEL.x, 1, KNEEL.z), lc = lt.c;
      const b = pj(C, KNEEL.x, 0, KNEEL.z), hd = pj(C, KNEEL.x, 1.85, KNEEL.z); if (!b || !hd) return;
      const h = hd[1] < b[1] ? b[1] - hd[1] : 10, face = -C.rz >= 0 ? 1 : -1;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const fillC = litHex('#5a3e28', lc.map(c => c * 0.8)), rimC = 'rgba(255,186,120,0.9)';
      const kneel = (fill, dx, dy) => sil(ctx, { x: b[0] + dx, y: b[1] + dy, h, face, fill, dress: 'cloak', hat: 'hair', hold: 'spear', armN: [0.3, 0.9], armF: [0.05, 0.2] });
      kneel(rimC, -h * 0.012, -h * 0.008); kneel(fillC, 0, 0);
      const lb = pj(C, KNEEL.x, 0.5, KNEEL.z - 1.25); if (lb) { const lord = (fill, dx) => sil(ctx, { x: lb[0] + dx, y: lb[1], h: h * 1.05, face: -face, fill, dress: 'robe', hat: 'bare', beard: 0.4, armN: [1.5, 0.05], armF: [0.1, 0.2] }); lord(rimC, -h * 0.012); lord(litHex('#4a2a2a', lc.map(c => c * 0.8)), 0); }
      ctx.restore();
    } });
  }
  // the hooded man: a still shape in the dark of the gallery, a thin gold chain; he speaks to a clerk, then turns away
  const HOOD = { x: COLX + 0.85, z: -9.6 };
  function hoodedMan(ctx, C, t, L) {
    const T = TT(), turn = smooth(span(t, T.turn, T.turn + 0.6)), walk = Math.max(0, t - T.turn - 0.35);
    const z = HOOD.z + walk * 1.0, x = HOOD.x + walk * 0.15;
    const b = pj(C, x, GALY, z), hd = pj(C, x, GALY + 1.92, z); if (!b || !hd) return;
    const h = b[1] - hd[1]; if (h < 8) return;
    const face = turn < 0.5 ? -1 : 1, fade = 1 - smooth(span(t, T.turn + 1.0, T.turn + 2.4));
    const pose = { x: b[0], y: b[1], h, face, dress: 'robe', hat: 'hood', armN: [0.25, 0.9], armF: [0.1, 0.8], lean: 0.04, walk: walk > 0 ? walk * 5.5 : undefined, tilt: turn < 0.5 ? 0.12 : 0 };
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = fade;
    rimLit(ctx, (c, fill) => sil(c, Object.assign({}, pose, { fill })), { rim: '#d9a066', mid: '#4a2c1c', dark: '#070505', dx: face * h * 0.012 + h * 0.004, dy: h * 0.006, steps: 3, box: [b[0] - h * 0.7, b[1] - h * 1.15, h * 1.4, h * 1.25], key: 'hood' });
    // the chain of office: a thin gold arc on the breast, and its glint
    if (turn < 0.6) {
      const cx = b[0] + face * h * 0.035, cy = b[1] - h * 0.66, rw = h * 0.07;
      ctx.strokeStyle = 'rgba(214,170,80,0.9)'; ctx.lineWidth = Math.max(1, h * 0.004);
      ctx.beginPath(); ctx.moveTo(cx - rw, cy - h * 0.06); ctx.quadraticCurveTo(cx, cy + h * 0.05, cx + rw * 0.8, cy - h * 0.07); ctx.stroke();
      const gl = 0.5 + 0.5 * Math.sin(t * 1.7), gp = 0.5 + 0.35 * Math.sin(t * 0.9);
      star4(ctx, cx - rw + gp * rw * 1.8, cy - h * 0.012 + Math.abs(gp - 0.5) * h * 0.04, h * 0.05 * (0.6 + 0.6 * gl), 0.9 * fade * (1 - turn));
      glowS(ctx, cx, cy, h * 0.12, [255, 200, 110], 0.25 * fade * (1 - turn));
    }
    ctx.restore();
    // the clerk who is sent for the records: he comes, bows, and hurries off into the dark
    const c0 = T.ask - 0.8, cu = span(t, c0, T.ask + 1.6); if (cu <= 0 || cu >= 1) return;
    const cz = HOOD.z + 1.3 + (cu < 0.3 ? (1 - cu / 0.3) * 1.8 : cu > 0.7 ? -(cu - 0.7) / 0.3 * 2.6 : 0), cx2 = HOOD.x + 0.6;
    const cb = pj(C, cx2, GALY, cz), ch = pj(C, cx2, GALY + 1.7, cz); if (!cb || !ch) return;
    const hh = cb[1] - ch[1], bow = cu > 0.32 && cu < 0.68 ? Math.sin((cu - 0.32) / 0.36 * Math.PI) * 0.5 : 0, cface = cu > 0.7 ? 1 : -1;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = Math.min(1, cu * 6, (1 - cu) * 4);
    sil(ctx, { x: cb[0] - hh * 0.01, y: cb[1], h: hh, face: cface, fill: '#7a4a2a', dress: 'robe', hat: 'cap', lean: bow, armN: [0.6, 1.2], walk: cu < 0.3 || cu > 0.7 ? t * 7 : undefined });
    sil(ctx, { x: cb[0], y: cb[1], h: hh, face: cface, fill: '#0a0807', dress: 'robe', hat: 'cap', lean: bow, armN: [0.6, 1.2], walk: cu < 0.3 || cu > 0.7 ? t * 7 : undefined });
    ctx.restore();
  }

  // ================================================================ 2D: a hall out of focus behind a close shot (cached)
  function bokehBG(key, o) {
    return K.cached('p5:bk:' + key, () => {
      const c = K.canvas(W + 400, H + 300), x = c.getContext('2d'), r = rng(o.seed || 5);
      const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, o.top || '#0c0908'); g.addColorStop(0.6, o.mid || '#1c1410'); g.addColorStop(1, o.bot || '#0e0a08'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      // columns and banners, soft
      x.filter = 'blur(14px)';
      for (const cx of o.cols || []) { const gg = x.createLinearGradient(cx - 70, 0, cx + 70, 0); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(0.3, 'rgba(70,54,40,0.55)'); gg.addColorStop(0.5, 'rgba(110,86,62,0.6)'); gg.addColorStop(1, 'rgba(10,8,6,0.7)'); x.fillStyle = gg; x.fillRect(cx - 80, 0, 160, c.height); }
      for (const [bx, hi] of o.banners || []) { x.fillStyle = HS[hi].field; x.globalAlpha = 0.5; x.fillRect(bx - 40, 40, 80, 260); x.globalAlpha = 1; }
      if (o.win) { const [wx, wy, wr, col] = o.win; const gg = x.createRadialGradient(wx, wy, 0, wx, wy, wr); gg.addColorStop(0, rgbs(col, 0.8)); gg.addColorStop(1, rgbs(col, 0)); x.fillStyle = gg; x.fillRect(wx - wr, wy - wr, wr * 2, wr * 2); }
      x.filter = 'none';
      // candle bokeh: soft discs with brighter rims
      for (let i = 0; i < (o.n || 40); i++) {
        const px = r() * c.width, py = (o.by0 || 0.3) * c.height + r() * (o.bh || 0.5) * c.height, rad = 14 + r() * 46, col = P.ember[Math.floor(r() * 4)], a = 0.08 + r() * 0.18;
        const gg = x.createRadialGradient(px, py, 0, px, py, rad); gg.addColorStop(0, rgbs(col, a * 0.6)); gg.addColorStop(0.78, rgbs(col, a)); gg.addColorStop(0.9, rgbs(col, a * 0.7)); gg.addColorStop(1, rgbs(col, 0));
        x.globalCompositeOperation = 'lighter'; x.fillStyle = gg; x.beginPath(); x.arc(px, py, rad, 0, TAU); x.fill(); x.globalCompositeOperation = 'source-over';
      }
      return c;
    });
  }

  // ================================================================ L28: the clerk at his desk; his eyes over his spectacles
  function shotClerk(ctx, t, sh) {
    const lt = t - sh.a, u = span(t, sh.a - 0.3, sh.b + 0.3);
    const c = { x: lerp(-30, 20, ease(u)), y: lerp(10, -10, ease(u)), z: lerp(1.0, 1.07, ease(u)) };
    const BG = bokehBG('clerk', { seed: 28, cols: [240, 1650], banners: [[520, 4], [1900, 2]], n: 46, by0: 0.15, bh: 0.6, mid: '#1a120e' });
    view(ctx, c, 0.45); ctx.drawImage(BG, -200, -150);
    // the eyes: reading (down), a look over the spectacles (up), reading again
    const up = smooth(span(lt, 0.95, 1.25)) * (1 - smooth(span(lt, 1.75, 2.05)));
    const read = lt < 1.0 ? span(lt, 0.0, 0.95) : span(lt, 1.95, 2.9);
    const fl = flick(t, 3, 8);
    view(ctx, c, 1);
    clerkFigure(ctx, t, up, read, fl);
    // the candle and the register's edge in the near foreground
    view(ctx, c, 1.35);
    const cx = 330, cy = 760;
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(cx - 14, cy - 150, 28, 150);
    const cg = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0); cg.addColorStop(0, 'rgba(255,220,170,0.4)'); cg.addColorStop(1, 'rgba(60,40,20,0.5)'); ctx.fillStyle = cg; ctx.fillRect(cx - 14, cy - 150, 28, 150);
    ctx.fillStyle = '#2a1e14'; ctx.beginPath(); ctx.ellipse(cx, cy, 70, 16, 0, 0, TAU); ctx.fill();
    glow(ctx, [255, 170, 90], cx, cy - 175, 420 * fl, 0.32); glow(ctx, [255, 230, 180], cx, cy - 172, 70 * fl, 0.7);
    flame7(ctx, cx, cy - 152, 46 * fl, t, 3, 1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    finish(ctx, { bloom: 0.3, vig: 0.7, vigIn: 0.25, warm: '#ffb070', warmA: 0.08 });
  }
  function clerkFigure(ctx, t, up, read, fl) {
    // the desk and the open register (lit by the candle at the left)
    ctx.save();
    const dg = ctx.createLinearGradient(0, 760, 0, 1080); dg.addColorStop(0, '#2a1c12'); dg.addColorStop(1, '#0c0806'); ctx.fillStyle = dg; ctx.fillRect(-300, 780, W + 600, 500);
    // the book: two pages fanned
    ctx.save(); ctx.translate(820, 930); ctx.rotate(-0.06);
    const pg = ctx.createLinearGradient(-600, 0, 400, 0); pg.addColorStop(0, '#d8c49a'); pg.addColorStop(0.55, '#a88a5c'); pg.addColorStop(1, '#4a3820'); ctx.fillStyle = pg;
    ctx.beginPath(); ctx.moveTo(-620, -120); ctx.quadraticCurveTo(-300, -150, -10, -130); ctx.lineTo(10, 140); ctx.quadraticCurveTo(-300, 120, -640, 150); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, -130); ctx.quadraticCurveTo(250, -150, 520, -110); ctx.lineTo(560, 160); ctx.quadraticCurveTo(260, 120, 10, 140); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40,24,12,0.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) { const y = -95 + i * 26; ctx.beginPath(); ctx.moveTo(-580, y + 4); ctx.quadraticCurveTo(-300, y - 18, -40, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(30, y); ctx.quadraticCurveTo(250, y - 16, 500, y + 6); ctx.stroke(); }
    ctx.restore();
    // body: a dark scholar's robe with a pale collar band, shoulders hunched over the desk
    const bx = 1150, by = 640;
    ctx.fillStyle = '#15130f'; ctx.beginPath(); ctx.moveTo(bx - 430, 1080); ctx.bezierCurveTo(bx - 420, 760, bx - 300, by + 30, bx - 120, by); ctx.lineTo(bx + 150, by - 10); ctx.bezierCurveTo(bx + 360, by + 30, bx + 470, 760, bx + 500, 1080); ctx.closePath(); ctx.fill();
    const rg = ctx.createLinearGradient(bx - 430, 0, bx + 300, 0); rg.addColorStop(0, 'rgba(255,170,100,0.22)'); rg.addColorStop(0.35, 'rgba(255,170,100,0.05)'); rg.addColorStop(1, 'rgba(0,0,0,0.3)'); ctx.fillStyle = rg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,120,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx - 425, 1060); ctx.bezierCurveTo(bx - 415, 770, bx - 300, by + 36, bx - 120, by + 6); ctx.stroke();
    ctx.fillStyle = '#c8baa0'; ctx.beginPath(); ctx.moveTo(bx - 120, by + 4); ctx.quadraticCurveTo(bx - 10, by + 60, bx + 120, by); ctx.lineTo(bx + 100, by + 40); ctx.quadraticCurveTo(bx - 10, by + 95, bx - 100, by + 44); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(30,20,12,0.5)'; ctx.fillRect(bx - 20, by + 50, 40, 110);
    // the near arm and the hand that holds the quill, moving along the line
    const hx = lerp(560, 860, read) + Math.sin(read * 18) * 4, hy = 880 - read * 14;
    ctx.fillStyle = '#121010'; ctx.beginPath(); ctx.moveTo(bx - 330, 820); ctx.quadraticCurveTo(bx - 420, 900, hx + 80, hy + 30); ctx.lineTo(hx + 60, hy + 80); ctx.quadraticCurveTo(bx - 380, 980, bx - 250, 1000); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a5038'; ctx.beginPath(); ctx.ellipse(hx + 30, hy + 30, 46, 30, -0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,190,130,0.35)'; ctx.beginPath(); ctx.ellipse(hx + 16, hy + 22, 30, 16, -0.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#efe6d2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx + 10, hy + 18); ctx.quadraticCurveTo(hx + 90, hy - 120, hx + 170, hy - 230); ctx.stroke();
    ctx.fillStyle = 'rgba(240,232,214,0.75)'; ctx.beginPath(); ctx.moveTo(hx + 90, hy - 110); ctx.quadraticCurveTo(hx + 170, hy - 200, hx + 175, hy - 240); ctx.quadraticCurveTo(hx + 120, hy - 190, hx + 70, hy - 100); ctx.closePath(); ctx.fill();
    ctx.restore();
    clerkHead(ctx, 1100, 420, 330, t, up, read, fl);
  }
  // the clerk's head, three-quarter to the left, lit from the candle at the left: cap, grey hair, spectacles low on the nose
  function clerkHead(ctx, X, Y, S, t, up, read, fl) {
    const yaw = (read - 0.5) * 0.04 * (1 - up), tiltUp = up * 0.06;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(-0.05 + yaw - tiltUp); ctx.scale(S, S);
    const F = (col, fn) => { ctx.fillStyle = col; ctx.beginPath(); fn(); ctx.fill(); };
    // neck into the collar
    F('#3a2418', () => { ctx.moveTo(-0.12, 0.38); ctx.lineTo(0.18, 0.3); ctx.lineTo(0.24, 0.72); ctx.lineTo(-0.16, 0.74); ctx.closePath(); });
    // the head's shape
    const face = () => { ctx.moveTo(0.06, -0.5); ctx.bezierCurveTo(-0.14, -0.5, -0.27, -0.4, -0.29, -0.24); ctx.quadraticCurveTo(-0.33, -0.14, -0.325, -0.1); ctx.quadraticCurveTo(-0.31, -0.06, -0.315, -0.03); ctx.lineTo(-0.405, 0.1); ctx.quadraticCurveTo(-0.41, 0.135, -0.37, 0.14); ctx.lineTo(-0.335, 0.16); ctx.quadraticCurveTo(-0.33, 0.2, -0.335, 0.215); ctx.quadraticCurveTo(-0.315, 0.24, -0.325, 0.255); ctx.quadraticCurveTo(-0.33, 0.29, -0.31, 0.3); ctx.bezierCurveTo(-0.3, 0.36, -0.28, 0.42, -0.2, 0.46); ctx.bezierCurveTo(-0.1, 0.5, 0.02, 0.46, 0.12, 0.38); ctx.bezierCurveTo(0.22, 0.3, 0.26, 0.14, 0.29, 0.02); ctx.bezierCurveTo(0.34, -0.2, 0.28, -0.48, 0.06, -0.5); ctx.closePath(); };
    const g = ctx.createLinearGradient(-0.42, 0, 0.3, 0); g.addColorStop(0, '#c48a5e'); g.addColorStop(0.2, '#9a6644'); g.addColorStop(0.5, '#4a2c1c'); g.addColorStop(1, '#1e1209'); F(g, face);
    ctx.save(); face(); ctx.clip();
    // planes of the face: a shadow under the brow, along the cheek, under the nose; a warm cheekbone
    const sh = (x, y, rx, ry, a, col = '20,10,4') => { const gg = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); gg.addColorStop(0, `rgba(${col},${a})`); gg.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = gg; ctx.save(); ctx.translate(x, y); ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); ctx.translate(-x, -y); ctx.beginPath(); ctx.arc(x, y, Math.max(rx, ry), 0, TAU); ctx.fill(); ctx.restore(); };
    sh(-0.16, -0.05, 0.14, 0.06, 0.55); sh(-0.06, 0.18, 0.12, 0.2, 0.35); sh(-0.3, 0.17, 0.06, 0.03, 0.5); sh(-0.24, 0.06, 0.06, 0.05, 0.4, '255,190,130'); sh(-0.3, -0.25, 0.08, 0.1, 0.3, '255,200,140');
    // wrinkles: the forehead, the eye, the fold from nose to mouth
    ctx.strokeStyle = 'rgba(30,14,6,0.45)'; ctx.lineWidth = 0.006; ctx.lineCap = 'round';
    for (const yy of [-0.33, -0.29, -0.25]) { ctx.beginPath(); ctx.moveTo(-0.27, yy + up * 0.012); ctx.quadraticCurveTo(-0.12, yy - 0.02 + up * 0.01, 0.02, yy + up * 0.008); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-0.29, 0.13); ctx.quadraticCurveTo(-0.24, 0.22, -0.26, 0.31); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.02, -0.02); ctx.lineTo(0.06, 0.0); ctx.moveTo(0.02, 0.01); ctx.lineTo(0.06, 0.04); ctx.stroke();
    ctx.restore();
    // the rim of candlelight along the profile
    ctx.save(); ctx.strokeStyle = `rgba(255,200,140,${0.55 * fl})`; ctx.lineWidth = 0.008; ctx.beginPath(); ctx.moveTo(-0.27, -0.38); ctx.bezierCurveTo(-0.3, -0.3, -0.33, -0.15, -0.325, -0.1); ctx.quadraticCurveTo(-0.31, -0.06, -0.315, -0.03); ctx.lineTo(-0.405, 0.1); ctx.moveTo(-0.33, 0.22); ctx.quadraticCurveTo(-0.32, 0.3, -0.3, 0.34); ctx.bezierCurveTo(-0.28, 0.42, -0.24, 0.45, -0.19, 0.46); ctx.stroke(); ctx.restore();
    // the ear, grey hair, the cap
    F('#3a2216', () => ctx.ellipse(0.17, 0.03, 0.05, 0.085, 0.15, 0, TAU)); F('#1e120a', () => ctx.ellipse(0.165, 0.035, 0.022, 0.05, 0.15, 0, TAU));
    F('#8a8278', () => { ctx.moveTo(0.06, -0.18); ctx.quadraticCurveTo(0.32, -0.2, 0.31, 0.05); ctx.quadraticCurveTo(0.28, 0.12, 0.24, 0.1); ctx.quadraticCurveTo(0.26, -0.02, 0.12, -0.1); ctx.closePath(); });
    ctx.strokeStyle = 'rgba(200,192,180,0.35)'; ctx.lineWidth = 0.004; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(0.12 + i * 0.02, -0.16); ctx.quadraticCurveTo(0.28, -0.1 + i * 0.01, 0.27, 0.04 + i * 0.008); ctx.stroke(); }
    F('#0e0c0b', () => { ctx.moveTo(-0.27, -0.33); ctx.bezierCurveTo(-0.24, -0.56, 0.2, -0.6, 0.33, -0.3); ctx.quadraticCurveTo(0.34, -0.2, 0.3, -0.16); ctx.quadraticCurveTo(0.02, -0.3, -0.27, -0.33); ctx.closePath(); });
    ctx.strokeStyle = 'rgba(255,190,120,0.3)'; ctx.lineWidth = 0.006; ctx.beginPath(); ctx.moveTo(-0.27, -0.34); ctx.bezierCurveTo(-0.25, -0.5, -0.1, -0.56, 0.05, -0.56); ctx.stroke();
    // brows (they lift when he looks up)
    const bu = up * 0.025;
    ctx.strokeStyle = '#a49c90'; ctx.lineWidth = 0.022; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-0.29, -0.1 - bu); ctx.quadraticCurveTo(-0.25, -0.13 - bu, -0.2, -0.115 - bu); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.13, -0.12 - bu); ctx.quadraticCurveTo(-0.05, -0.15 - bu, 0.03, -0.11 - bu); ctx.stroke();
    // eyes above the spectacles: lids lowered when reading, open and looking at us when he looks up
    for (const [ex, ey, rx, near] of [[-0.245, -0.055, 0.03, false], [-0.075, -0.06, 0.045, true]]) {
      const open = lerp(0.18, 1, up), ry = 0.024 * open;
      F('#120a06', () => ctx.ellipse(ex, ey + 0.005, rx * 1.15, 0.03, 0, 0, TAU));
      if (open > 0.25) {
        F(near ? '#b8a890' : '#8a7a68', () => ctx.ellipse(ex, ey + 0.004, rx, ry, 0, 0, TAU));
        const ix = ex + rx * (0.25 * up - 0.3 * (1 - up) + (read - 0.5) * 0.4 * (1 - up)), iy = ey + 0.004 + (1 - up) * ry * 0.4;
        ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey + 0.004, rx, ry, 0, 0, TAU); ctx.clip();
        F('#2a1a10', () => ctx.arc(ix, iy, rx * 0.5, 0, TAU)); F('#050302', () => ctx.arc(ix, iy, rx * 0.24, 0, TAU));
        ctx.restore();
        if (up > 0.5) F(`rgba(255,236,200,${(up - 0.5) * 1.8 * fl})`, () => ctx.arc(ix - rx * 0.18, iy - ry * 0.3, 0.006, 0, TAU));
      }
      // the upper lid line
      ctx.strokeStyle = '#1a0e08'; ctx.lineWidth = 0.009; ctx.beginPath(); ctx.ellipse(ex, ey + 0.004, rx * 1.05, Math.max(0.006, ry * 1.05), 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      if (open <= 0.25) { ctx.beginPath(); ctx.moveTo(ex - rx, ey + 0.008); ctx.quadraticCurveTo(ex, ey + 0.022, ex + rx, ey + 0.006); ctx.stroke(); }
    }
    // the spectacles, slid low on the nose; their glass holds two small flames
    const lens = [[-0.262, 0.03, 0.04, 0.042], [-0.07, 0.032, 0.07, 0.055]];
    ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 0.009;
    for (const [lx, ly, rx, ry] of lens) { ctx.beginPath(); ctx.ellipse(lx, ly, rx, ry, 0, 0, TAU); ctx.stroke(); F('rgba(200,180,150,0.08)', () => ctx.ellipse(lx, ly, rx, ry, 0, 0, TAU)); }
    ctx.beginPath(); ctx.moveTo(-0.222, 0.025); ctx.quadraticCurveTo(-0.18, 0.005, -0.14, 0.025); ctx.moveTo(0.0, 0.03); ctx.lineTo(0.15, 0.0); ctx.stroke();
    ctx.strokeStyle = `rgba(255,214,150,${0.7 * fl})`; ctx.lineWidth = 0.006;
    for (const [lx, ly, rx, ry] of lens) { ctx.beginPath(); ctx.ellipse(lx, ly, rx, ry, 0, Math.PI * 0.95, Math.PI * 1.45); ctx.stroke(); }
    for (const [lx, ly, rx] of lens) { const gx = lx - rx * 0.35, gy = ly - 0.012; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.restore(); F(`rgba(255,240,210,${0.85 * fl})`, () => ctx.ellipse(gx, gy, 0.008, 0.012, 0.3, 0, TAU)); }
    ctx.restore();
  }

  // ================================================================ L28: the register; a finger under the words, twice
  function registerPage() {
    return K.cached('p5:reg', () => {
      const w = 1800, h = 1200, c = K.parchment(w, h, 2828, { stains: 2, edge: 0.8 }), x = c.getContext('2d');
      x.save(); x.globalCompositeOperation = 'multiply';
      x.strokeStyle = 'rgba(120,80,40,0.28)'; x.lineWidth = 1.3;
      for (let i = 0; i < 13; i++) { const y = 150 + i * 78; x.beginPath(); x.moveTo(120, y); x.lineTo(w - 110, y); x.stroke(); }
      x.beginPath(); x.moveTo(520, 90); x.lineTo(520, h - 80); x.moveTo(1240, 90); x.lineTo(1240, h - 80); x.stroke();
      // other entries: an iron-gall hand, unreadable at this distance
      const r = rng(2929);
      const scrib = (x0, y0, len, seed) => { const pts = []; for (let k = 0; k <= len; k += 3) pts.push([x0 + k, y0 - Math.abs(Math.sin(k * 0.21 + seed)) * 16 * (0.4 + 0.6 * K.noise(k * 0.05, seed, 7)) + 6 * Math.sin(k * 0.6 + seed)]); x.fillStyle = 'rgba(40,24,12,0.82)'; K.nib(x, pts, { w: 4, angle: -0.6, min: 0.25, taper: 0.04, jit: 0.3, seed }); };
      for (let i = 0; i < 13; i++) { if (i === 6 || i === 7) continue; const y = 140 + i * 78; scrib(150, y, 220 + r() * 140, i * 3 + 1); scrib(560, y, 300 + r() * 280, i * 3 + 2); if (r() < 0.7) scrib(1280, y, 180 + r() * 220, i * 3 + 5); }
      x.restore();
      return c;
    });
  }
  const REG = { name: [150, 600], ward: [560, 600], par: [560, 678] };
  function regText(x, s, X, Y, font, a = 1) {
    x.save(); x.globalCompositeOperation = 'multiply'; x.font = font; x.textBaseline = 'alphabetic';
    x.globalAlpha = 0.3 * a; x.filter = 'blur(1.2px)'; x.fillStyle = '#4a2c14'; x.fillText(s, X, Y + 1); x.filter = 'none';
    x.globalAlpha = 0.92 * a; x.fillStyle = '#26160a'; x.fillText(s, X, Y); x.restore();
  }
  function shotRegister(ctx, t, sh) {
    const T = TT(), lt = t - T.a28, u = span(t, sh.a - 0.3, sh.b + 0.3), page = registerPage();
    // the camera settles on the entry, then pushes in on "unknown"
    const push = ease(span(lt, 3.6, 6.8)), z = lerp(1.0, 1.85, push) * lerp(1, 1.04, u);
    const fx = lerp(820, 905, push), fy = lerp(640, 662, push);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0a0705'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.025 + 0.01 * u); ctx.scale(z, z); ctx.translate(-fx, -fy);
    ctx.drawImage(page, 0, 0);
    regText(ctx, 'Cael', REG.name[0], REG.name[1], 'italic 600 74px "EB Garamond"');
    regText(ctx, 'ward of Ealdholt', REG.ward[0], REG.ward[1], 'italic 500 56px "EB Garamond"');
    regText(ctx, 'parentage: unknown', REG.par[0], REG.par[1], 'italic 500 56px "EB Garamond"');
    // the finger: under "ward of Ealdholt", then down to "parentage: unknown", where it rests and taps
    const s1 = span(lt, 2.55, 3.55), s2 = span(lt, 3.75, 4.35), s3 = span(lt, 4.35, 5.3);
    let px = lerp(560, 960, ease(s1)), py = 616;
    if (s2 > 0) { px = lerp(960, 560, ease(s2)); py = lerp(616, 694, ease(s2)); }
    if (s3 > 0) { px = lerp(560, 1000, ease(s3)); py = 694; }
    const tap = lt > 5.4 ? Math.max(0, Math.sin((lt - 5.4) * 7)) * 6 * (1 - span(lt, 5.4, 6.4)) : 0;
    const enter = smooth(span(lt, 2.0, 2.6));
    finger(ctx, px + (1 - enter) * 400, py + tap + (1 - enter) * 300, 1.0);
    ctx.restore();
    // the candle's light across the page, flickering; darkness at the edges
    const fl = flick(t, 7, 8);
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createRadialGradient(W * 0.25, H * 0.3, 60, W * 0.4, H * 0.5, W * 0.85); g.addColorStop(0, `rgb(255,${226 + 20 * fl | 0},${180 + 20 * fl | 0})`); g.addColorStop(0.55, 'rgb(190,140,96)'); g.addColorStop(1, 'rgb(40,26,16)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    glow(ctx, [255, 170, 90], W * 0.12, H * 0.12, 600 * fl, 0.12);
    finish(ctx, { bloom: 0.18, vig: 0.62, vigIn: 0.3 });
  }
  // an old forefinger in a dark sleeve, pointing along the line
  function finger(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.35);
    // shadow on the page
    ctx.save(); ctx.translate(26, 30); ctx.filter = 'blur(10px)'; ctx.fillStyle = 'rgba(30,16,6,0.45)'; ctx.beginPath(); ctx.ellipse(130, 40, 210, 60, 0.1, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#16120e'; ctx.beginPath(); ctx.moveTo(180, -40); ctx.lineTo(700, -120); ctx.lineTo(760, 140); ctx.lineTo(210, 120); ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(0, -40, 0, 100); g.addColorStop(0, '#c89070'); g.addColorStop(0.5, '#9a6648'); g.addColorStop(1, '#4a2c1c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-8, 4); ctx.quadraticCurveTo(-10, -14, 10, -16); ctx.lineTo(120, -22); ctx.quadraticCurveTo(170, -40, 230, -30); ctx.lineTo(230, 110); ctx.quadraticCurveTo(160, 120, 110, 80); ctx.quadraticCurveTo(60, 60, 50, 40); ctx.lineTo(10, 22); ctx.quadraticCurveTo(-6, 20, -8, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,10,0.5)'; ctx.lineWidth = 2; for (const kx of [55, 62, 110, 117]) { ctx.beginPath(); ctx.moveTo(kx, -14); ctx.quadraticCurveTo(kx + 4, 2, kx, 20); ctx.stroke(); }
    ctx.fillStyle = 'rgba(240,210,180,0.55)'; ctx.beginPath(); ctx.ellipse(10, -4, 14, 8, -0.1, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ================================================================ L31: the knighting, in the last shaft of the day
  function knightBG() {
    return K.cached('p5:knbg', () => {
      const c = K.canvas(W + 400, H + 300), x = c.getContext('2d'), OX = 200, OY = 150;
      x.fillStyle = '#0b0807'; x.fillRect(0, 0, c.width, c.height);
      // the board receding: squares in perspective, dark, catching the light
      const hy = 560 + OY, cx = 960 + OX;
      for (let r = 0; r < 18; r++) for (let f = -14; f < 14; f++) {
        const z0 = 1 + r * 0.7, z1 = z0 + 0.7, X = v => cx + v * 900 / zz, Y = z => hy + 1100 / z; let zz = z0;
        const y0 = Y(z0), y1 = Y(z1); zz = z0; const a0 = X(f), a1 = X(f + 1); zz = z1; const b0 = X(f), b1 = X(f + 1);
        const light = (r + f + 100) % 2 === 0, k = 1 - r / 18;
        x.fillStyle = light ? `rgba(${120 * k + 20 | 0},${100 * k + 16 | 0},${80 * k + 14 | 0},1)` : `rgba(${30 * k + 8 | 0},${24 * k + 7 | 0},${20 * k + 6 | 0},1)`;
        x.beginPath(); x.moveTo(a0, y0); x.lineTo(a1, y0); x.lineTo(b1, y1); x.lineTo(b0, y1); x.closePath(); x.fill();
      }
      const fg = x.createLinearGradient(0, hy, 0, hy + 300); fg.addColorStop(0, 'rgba(11,8,7,1)'); fg.addColorStop(1, 'rgba(11,8,7,0)'); x.fillStyle = fg; x.fillRect(0, hy - 10, c.width, 320);
      x.filter = 'blur(6px)';
      // the crowd's ring, the columns, banners and a high window
      for (let i = 0; i < 70; i++) { const px = (i + 0.5) / 70 * c.width, h = 150 + (i * 37 % 50); x.fillStyle = '#060504'; x.beginPath(); x.ellipse(px, hy - h * 0.45, 22, h * 0.5, 0, 0, TAU); x.fill(); x.beginPath(); x.arc(px, hy - h * 0.98, 14, 0, TAU); x.fill(); }
      for (const px of [180, 640, 1460, 1980]) { const g = x.createLinearGradient(px - 60, 0, px + 60, 0); g.addColorStop(0, '#0a0807'); g.addColorStop(0.7, '#3a2a1e'); g.addColorStop(1, '#0a0807'); x.fillStyle = g; x.fillRect(px - 60, 0, 120, hy - 120); }
      for (const [px, hi] of [[420, 1], [860, 0], [1220, 6], [1720, 4]]) { x.fillStyle = mixHex(HS[hi].field, '#0a0807', 0.45); x.fillRect(px - 50, 30, 100, 300); }
      const wg = x.createRadialGradient(330, 90, 0, 330, 90, 260); wg.addColorStop(0, 'rgba(255,150,80,0.7)'); wg.addColorStop(1, 'rgba(255,120,60,0)'); x.fillStyle = wg; x.fillRect(0, 0, 700, 400);
      x.filter = 'none';
      const r = rng(31); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 30; i++) { const px = r() * c.width, py = hy - 260 + r() * 200, rad = 10 + r() * 30, col = P.ember[Math.floor(r() * 3)]; const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, rgbs(col, 0.2)); g.addColorStop(0.8, rgbs(col, 0.14)); g.addColorStop(1, rgbs(col, 0)); x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, TAU); x.fill(); }
      return { c, OX, OY };
    });
  }
  function shotKnighting(ctx, t, sh) {
    const T = TT(), u = span(t, sh.a - 0.3, sh.b + 0.3), lt = t - sh.a, F3 = sh.id === 'F3', ru = F3 ? smooth(span(t, T.up0, T.up1)) : 0;
    // F1: a slow push as the sword comes down; F3 ("Rise, Knight of Ealdholt"): the camera lifts with him as he stands
    const c = F3 ? { x: lerp(10, -20, ease(u)), y: lerp(-5, -70, ru) + lerp(0, -10, u), z: lerp(1.1, 1.16, ease(u)) } : { x: lerp(-40, 30, ease(u)), y: lerp(20, -10, ease(u)), z: lerp(1.04, 1.13, ease(u)) };
    const BG = knightBG();
    view(ctx, c, 0.5); ctx.drawImage(BG.c, -BG.OX, -BG.OY);
    view(ctx, c, 1);
    // the shaft: from a high window at the upper left, down across them
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createLinearGradient(260, -100, 900, 900); sg.addColorStop(0, 'rgba(255,150,80,0.32)'); sg.addColorStop(0.6, 'rgba(255,130,70,0.16)'); sg.addColorStop(1, 'rgba(255,120,60,0.04)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(150, -100); ctx.lineTo(560, -100); ctx.lineTo(1250, 980); ctx.lineTo(560, 980); ctx.closePath(); ctx.fill();
    ctx.restore();
    // the pool of light on the stone where he kneels
    glow(ctx, [255, 140, 70], 880, 905, 420, 0.3);
    const ground = 900, h = 560;
    // Cael kneels, head bowed, his spear laid down beside him
    if (!F3) { ctx.fillStyle = '#0a0807'; ctx.fillRect(520, ground - 8, 560, 7); }
    const kneel = { x: 760, y: ground, h, face: 1, dress: 'cloak', hat: 'hair', legN: [lerp(1.45, 0.07, ru), lerp(1.45, 0.03, ru)], legF: [lerp(0.12, -0.06, ru), lerp(1.62, 0.04, ru)], lean: lerp(0.2, 0.0, ru), tilt: lerp(0.42, -0.05, ru), armN: [lerp(0.55, 0.06, ru), lerp(0.7, 0.2, ru)], armF: [lerp(0.25, -0.05, ru), lerp(0.5, 0.18, ru)], long: false, t };
    const cael = sil(K.layer('p5:dummy', 4, 4).getContext('2d'), Object.assign({}, kneel, { fill: '#000' }));
    rimLit(ctx, (cc, fill) => sil(cc, Object.assign({}, kneel, { fill })), { rim: '#ffb070', mid: '#5a2c18', dark: '#0d0806', dx: 7, dy: 6, steps: 4, box: [380, 140, 760, 780], key: 'kn1' });
    // a touch of russet in the cloak where the light falls
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.16; sil(ctx, Object.assign({}, kneel, { fill: '#6e5236' })); ctx.restore();
    // the lord: tall, robed, the sword held out and brought down onto his shoulder
    const sw = F3 ? 0 : smooth(span(t, T.sword0, T.touch)), lift = !F3 && t > T.touch + 0.45 ? smooth(span(t, T.touch + 0.45, T.touch + 0.9)) * 0.25 : 0;
    let ang = lerp(-1.25, 0.12, sw) - lift;                       // the blade's angle from horizontal (pointing left)
    const lord = F3 ? { x: 1330, y: ground, h: 760, face: -1, dress: 'robe', hat: 'bare', beard: 0.5, armN: [0.35, 0.3], armF: [0.1, 0.2], t } : { x: 1290, y: ground, h: 760, face: -1, dress: 'robe', hat: 'bare', beard: 0.5, armN: [lerp(2.2, 1.45, sw), lerp(0.4, 0.05, sw)], armF: [lerp(2.0, 1.35, sw), lerp(0.5, 0.15, sw)], t };
    if (F3) ang = -1.5;                                            // the sword lowered, point to the stone
    const hand = sil(K.layer('p5:dummy', 4, 4).getContext('2d'), Object.assign({}, lord, { fill: '#000' })).hand;
    rimLit(ctx, (cc, fill) => sil(cc, Object.assign({}, lord, { fill })), { rim: '#ff9a5a', mid: '#4a1c18', dark: '#0b0606', dx: 6, dy: 5, steps: 4, box: [1000, 80, 600, 860], key: 'kn2' });
    // the sword: a long blade from the lord's hands, its edge catching the shaft
    const L2 = 520, bx = hand[0], by = hand[1], ex = bx - Math.cos(ang) * L2, ey = by + Math.sin(ang) * L2;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(bx + Math.cos(ang) * 40, by - Math.sin(ang) * 40); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#b08a3a'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(bx - Math.sin(ang) * 34, by - Math.cos(ang) * 34); ctx.lineTo(bx + Math.sin(ang) * 34, by + Math.cos(ang) * 34); ctx.stroke();
    const bg = ctx.createLinearGradient(bx, by, ex, ey); bg.addColorStop(0, '#8a8c92'); bg.addColorStop(0.5, '#e8e4dc'); bg.addColorStop(1, '#7a7c80');
    ctx.strokeStyle = bg; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,200,0.85)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(bx, by - 3); ctx.lineTo(ex, ey - 3); ctx.stroke();
    ctx.restore();
    // the touch: a glint where the steel meets his shoulder; once he stands, the star at his throat catches the light
    const gl = F3 ? 0 : win(t, T.touch - 0.05, T.touch + 0.7, 0.06, 0.5);
    if (F3) { const sa = smooth(span(t, T.up1 - 0.4, T.up1 + 0.4)), sx2 = cael.head[0] + h * 0.012, sy2 = cael.head[1] + h * 0.115; silverStar(ctx, sx2, sy2, 10, span(t, T.up1, T.up1 + 0.8), 1); if (sa > 0) { star4(ctx, sx2, sy2, 90 * sa * (0.85 + 0.15 * Math.sin(t * 3)), 0.9 * sa); glow(ctx, [255, 240, 220], sx2, sy2, 60, 0.5 * sa); } }
    if (gl > 0) { star4(ctx, ex, ey, 120 * gl, 0.9 * gl); glow(ctx, [255, 220, 170], ex, ey, 160, 0.45 * gl); }
    // dust in the shaft
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const r = rng(3131);
    for (let i = 0; i < 140; i++) { const s0 = r(), w0 = r(), px = lerp(lerp(150, 560, w0), lerp(560, 1250, w0), s0) + Math.sin(t * 0.4 + i) * 10, py = lerp(-100, 980, s0) + Math.sin(t * 0.3 + i * 2) * 8 - lt * 6; ctx.fillStyle = `rgba(255,214,170,${0.25 + 0.3 * Math.sin(t * 1.3 + i)})`; ctx.fillRect(px, py, 2.2, 2.2); }
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    finish(ctx, { bloom: 0.34, vig: 0.68, vigIn: 0.28, warm: '#ff9a50', warmA: 0.08 });
  }

  // ================================================================ L31: the star pinned at the throat of his russet cloak
  function cloakTex() {
    return K.cached('p5:cloak', () => {
      const w = W + 400, h = H + 300, c = K.linen(w, h, 3131, { base: [118, 84, 54], dark: [40, 24, 12], step: 5 }), x = c.getContext('2d');
      // folds: soft ridges falling from the shoulder, and the cloak's edge over the tunic
      const r = rng(77);
      for (let i = 0; i < 16; i++) {
        const x0 = r() * w, sw = 60 + r() * 120;
        const g = x.createLinearGradient(x0 - sw, 0, x0 + sw, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, 'rgba(255,220,180,0.12)'); g.addColorStop(0.55, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.save(); x.translate(x0, 0); x.rotate(0.18 - r() * 0.36); x.translate(-x0, 0); x.fillStyle = g; x.fillRect(x0 - sw, -200, sw * 2, h + 400); x.restore();
      }
      // the opening of the cloak: a darker tunic below and to the left, a quilted edge
      x.fillStyle = '#2a1e14'; x.beginPath(); x.moveTo(0, 520); x.bezierCurveTo(400, 600, 780, 760, 980, h); x.lineTo(0, h); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 3; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(0, 600 + i * 70); x.bezierCurveTo(300, 650 + i * 70, 600, 760 + i * 60, 760 + i * 20, h); x.stroke(); }
      x.strokeStyle = 'rgba(255,200,150,0.25)'; x.lineWidth = 6; x.beginPath(); x.moveTo(0, 515); x.bezierCurveTo(400, 595, 780, 755, 980, h); x.stroke();
      // his jaw and hair in shadow at the top right
      x.fillStyle = '#0f0a07'; x.beginPath(); x.moveTo(1150, -10); x.bezierCurveTo(1180, 160, 1320, 260, 1520, 240); x.bezierCurveTo(1700, 230, 1800, 120, 1820, -10); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,180,120,0.3)'; x.lineWidth = 4; x.beginPath(); x.moveTo(1160, 40); x.bezierCurveTo(1200, 170, 1320, 250, 1520, 238); x.stroke();
      return c;
    });
  }
  // the silver eight-pointed star: faceted, a boss at its heart; sh moves a glint across it
  function silverStar(ctx, x, y, R, sh, a = 1) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= a;
    ctx.save(); ctx.translate(R * 0.06, R * 0.1); ctx.filter = 'blur(6px)'; ctx.fillStyle = 'rgba(20,10,4,0.6)'; ctx.beginPath(); for (let k = 0; k < 16; k++) { const rr = k % 2 ? R * 0.42 : R, aa = k / 16 * TAU - Math.PI / 2; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.fill(); ctx.restore();
    for (let k = 0; k < 16; k++) {
      const a0 = k / 16 * TAU - Math.PI / 2, a1 = (k + 1) / 16 * TAU - Math.PI / 2, r0 = k % 2 ? R * 0.42 : R, r1 = k % 2 ? R : R * 0.42;
      const lit = 0.5 + 0.5 * Math.cos(a0 + 0.2 - 2.4), v = Math.round(lerp(90, 235, lit * (k % 2 ? 0.75 : 1)));
      ctx.fillStyle = `rgb(${v},${v},${v + 8})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * r0, Math.sin(a0) * r0); ctx.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(40,40,46,0.8)'; ctx.lineWidth = Math.max(1, R * 0.025); ctx.beginPath(); for (let k = 0; k < 16; k++) { const rr = k % 2 ? R * 0.42 : R, aa = k / 16 * TAU - Math.PI / 2; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.stroke();
    const bg = ctx.createRadialGradient(-R * 0.06, -R * 0.06, 0, 0, 0, R * 0.2); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.5, '#b8b8c0'); bg.addColorStop(1, '#5a5a62'); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, R * 0.18, 0, TAU); ctx.fill();
    // the glint travelling across the facets
    if (sh > 0 && sh < 1) { ctx.save(); ctx.beginPath(); for (let k = 0; k < 16; k++) { const rr = k % 2 ? R * 0.42 : R, aa = k / 16 * TAU - Math.PI / 2; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.clip(); ctx.globalCompositeOperation = 'lighter'; const gx = lerp(-R * 1.4, R * 1.4, sh); const g = ctx.createLinearGradient(gx - R * 0.3, -R, gx + R * 0.3, R); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,250,235,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3); ctx.restore(); }
    ctx.restore();
  }
  function shotStar(ctx, t, sh) {
    const T = TT(), u = span(t, sh.a - 0.3, sh.b + 0.3);
    const c = { x: lerp(-20, 30, ease(u)), y: lerp(10, -10, ease(u)), z: lerp(1.0, 1.12, ease(u)) };
    view(ctx, c, 0.9); ctx.drawImage(cloakTex(), -200, -150);
    view(ctx, c, 1);
    const sx = 900, sy = 560, R = 74;
    const into = smooth(span(t, T.pin0, T.pin1)), away = smooth(span(t, T.pin1 + 0.1, T.pin1 + 0.7));
    const px = lerp(sx + 520, sx, into) + away * 560, py = lerp(sy + 260, sy, into) + away * 300;
    const starX = t < T.pin1 ? px : sx, starY = t < T.pin1 ? py : sy;
    // the light: warm from the upper left; the star brightens when the hand lets go
    const shine = smooth(span(t, T.pin1 + 0.2, T.pin1 + 0.9));
    glow(ctx, [255, 220, 170], sx - 40, sy - 40, 520, 0.14 + 0.12 * shine);
    silverStar(ctx, starX, starY, R * lerp(1.15, 1, into), span(t, T.pin1 + 0.25, T.pin1 + 1.1), 1);
    // the lord's hand: a dark sleeve with a gold cuff, fingers holding the star's edge
    if (away < 1) {
      ctx.save(); ctx.translate(px, py); ctx.rotate(-0.5);
      ctx.fillStyle = '#2a1414'; ctx.beginPath(); ctx.moveTo(70, -70); ctx.lineTo(700, -150); ctx.lineTo(760, 160); ctx.lineTo(110, 90); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b08a3a'; ctx.fillRect(100, -78, 26, 170);
      const hg = ctx.createLinearGradient(0, -60, 0, 80); hg.addColorStop(0, '#c08a68'); hg.addColorStop(1, '#5a3424'); ctx.fillStyle = hg;
      ctx.beginPath(); ctx.moveTo(30, -50); ctx.quadraticCurveTo(70, -76, 110, -60); ctx.lineTo(110, 80); ctx.quadraticCurveTo(70, 90, 40, 60); ctx.quadraticCurveTo(10, 40, 20, 10); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(38, -36, 34, 14, -0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(40, 30, 32, 14, 0.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (shine > 0) { star4(ctx, sx - R * 0.35, sy - R * 0.45, 180 * shine * (0.8 + 0.2 * Math.sin(t * 3)), 0.8 * shine); glow(ctx, [255, 245, 225], sx, sy, 220, 0.3 * shine); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    finish(ctx, { bloom: 0.3, vig: 0.72, vigIn: 0.22, warm: '#ffb070', warmA: 0.06 });
  }

  // ================================================================ the 3D shots, framed and finished
  function hallShot(ctx, t, sh) {
    const C = hall(ctx, t, sh);
    if (sh.id === 'G') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      hoodedMan(ctx, C, t, lights(t, sh.mode));
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (!MIXING) K.bloom(ctx, sh.mode === 'day' ? 0.22 : 0.3, 10);
    if (sh.mode === 'day') K.grade(ctx, '#ffd59a', 'soft-light', 0.12);
    else if (sh.mode === 'dusk') K.grade(ctx, '#ff9a5a', 'soft-light', 0.1);
    else K.grade(ctx, '#3a4a70', 'soft-light', 0.14);
    ctx.drawImage(vignetteImg(sh.mode === 'day' ? 0.55 : 0.68, 0.3), 0, 0);
  }

  // ================================================================ the plan of shots, and the scene
  let PLAN = null;
  function plan() {
    if (PLAN) return PLAN; const T = TT();
    const S = [
      { id: 'A', fn: hallShot, mode: 'day', set: 'start', x: 0 },
      { id: 'B1', fn: hallShot, mode: 'day', set: 'start', x: 0 },
      { id: 'B2', fn: hallShot, mode: 'day', set: 'start', x: 0 },
      { id: 'C1', fn: shotClerk, x: 0.35 },
      { id: 'C2', fn: shotRegister, x: 0.4 },
      { id: 'D1', fn: hallShot, mode: 'dusk', set: 'fin', x: 0.5 },
      { id: 'D2', fn: hallShot, mode: 'dusk', set: 'fin', x: 0.25 },
      { id: 'E2', fn: hallShot, mode: 'dusk', set: 'fin', x: 0 },
      { id: 'E3', fn: hallShot, mode: 'dusk', set: 'fin', x: 0 },
      { id: 'F1', fn: shotKnighting, x: 0.35 },
      { id: 'F2', fn: shotStar, x: 0.3 },
      { id: 'F3', fn: shotKnighting, x: 0.3 },
      { id: 'G', fn: hallShot, mode: 'night', set: 'none', x: 0.5 },
    ];
    const b = [T.s - 3, T.sB1, T.sB2, T.sC1, T.sC2, T.sD1, T.sD2, T.sE2, T.sE3, T.sF1, T.sF2, T.sF3, T.sG, T.e + 4];
    S.forEach((s, i) => { s.a = b[i]; s.b = b[i + 1]; });
    PLAN = S; return S;
  }
  window.__p5 = { camAt: (t, id) => camAt(t, id), TT, plan };
  SCENES[5] = {
    join: 'dissolve', joinDur: 1.2,
    draw(ctx, t, sc) {
      void sc; const S = plan();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
      let i = S.findIndex(s => t < s.b); if (i < 0) i = S.length - 1;
      const cur = S[i], nxt = S[i + 1];
      const into = cur.x > 0 && i > 0 && t < cur.a + cur.x / 2, out = nxt && nxt.x > 0 && t > nxt.a - nxt.x / 2;
      if (into || out) {
        const A = into ? S[i - 1] : cur, B = into ? cur : nxt, k = smooth((t - (B.a - B.x / 2)) / B.x);
        MIXING = true; A.fn(ctx, t, A);
        const Lr = K.layer('p5:next'), lx = Lr.getContext('2d'); B.fn(lx, t, B);
        MIXING = false;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = k; ctx.drawImage(Lr, 0, 0); ctx.globalAlpha = 1;
        K.bloom(ctx, 0.2, 10);
      } else cur.fn(ctx, t, cur);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    },
  };
})();
