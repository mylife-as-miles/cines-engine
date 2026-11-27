/* LONG DISTANCE — LOOK A: "THE GLOW"
   A night film lit by screens. Helpers for Look A only (never edit kit/otm.js or kit/figures.js: three looks share them).
   - P        the palette: blue-black night, the phone's amber-white glow (the AI's light), the grey of the one daylight
   - 2D       gradients, paths, posterised light pools with soft risers, beams, soft shapes, perspective quads, captions
   - FIG      a small quadric ray tracer for the figures. Heads, hands and bodies are unions of ellipsoids and capsules, lit
              by the shot's own lamps (posterised bands with soft risers, cast shadows, normals blended across the parts of a
              body so a nose grows out of a face instead of being glued on). The phone's glow is a real point light on a real
              face, faces keep their likeness from any angle, and the two kinds of image (the flash strip, the generated
              waterfall) are the same two heads under two different lights.
   Deterministic: no Math.random, no Date. */
(function (G) {
  'use strict';
  const { W, H } = OTM;
  const clamp = OTM.clamp, lerp = OTM.lerp, mix = OTM.mix, rgba = OTM.rgba, hexToRgb = OTM.hexToRgb;

  // =====================================================================================================
  // PALETTE
  // =====================================================================================================
  const P = {
    // night: the flat after dark, the city through the blinds (a cold that never gets warm)
    ink: '#03050A', n0: '#060A12', n1: '#0A101C', n2: '#0F1828', n3: '#152137', n4: '#1D2D47', n5: '#283D5C', n6: '#385174',
    moon: '#5E7799', moonPale: '#9DB0CB', moonWhite: '#C9D5E6',
    // the glow: the phone. Amber-white, soft, close. The only warm light in his life.
    gCore: '#FFF7EA', gHot: '#FFE6BC', g1: '#FFCB86', g2: '#EFA459', g3: '#C47534', g4: '#874821', g5: '#4A2713', g6: '#24140B',
    // grey daylight (the visit): the first light in the flat that is not a screen
    d0: '#1C1F22', d1: '#2F3337', d2: '#474C51', d3: '#62676C', d4: '#80858A', d5: '#9FA3A5', d6: '#BDBFBE', d7: '#D9DAD6', d8: '#ECECE8',
    // type
    sub: '#F3EEE6', subHalo: 'rgba(2,4,9,0.72)',
  };

  // =====================================================================================================
  // 2D HELPERS
  // =====================================================================================================
  function layer(w, h) { return OTM.makeCanvas(w || W, h || H).getContext('2d'); }
  function blurred(src, px, base) {
    const c = OTM.makeCanvas(src.width, src.height), g = c.getContext('2d');
    if (base) g.drawImage(src, 0, 0);
    g.filter = `blur(${px}px)`; g.drawImage(src, 0, 0); g.filter = 'none'; return c;
  }
  function stops(gr, st) { st.forEach(s => gr.addColorStop(clamp(s[0], 0, 1), s.length > 2 ? rgba(s[1], s[2]) : s[1])); return gr; }
  const lg = (g, x0, y0, x1, y1, st) => stops(g.createLinearGradient(x0, y0, x1, y1), st);
  const rg = (g, x, y, r0, r1, st, fx, fy) => stops(g.createRadialGradient(fx == null ? x : fx, fy == null ? y : fy, r0, x, y, r1), st);
  function pathPts(pts, open) { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); if (!open) p.closePath(); return p; }
  // Catmull-Rom through points -> beziers; [x,y,1] is a hard corner
  function smooth(pts, open) {
    const p = new Path2D(), n = pts.length; const Q = i => open ? pts[clamp(i, 0, n - 1)] : pts[(i + n) % n];
    p.moveTo(pts[0][0], pts[0][1]); const last = open ? n - 1 : n;
    for (let i = 0; i < last; i++) {
      const p0 = Q(i - 1), p1 = Q(i), p2 = Q(i + 1), p3 = Q(i + 2), k = 1 / 6;
      const c1 = p1[2] ? [p1[0], p1[1]] : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
      const c2 = p2[2] ? [p2[0], p2[1]] : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
      p.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
    }
    if (!open) p.closePath(); return p;
  }
  function rrect(x, y, w, h, r) {
    const p = new Path2D(); r = Math.min(r, w / 2, h / 2);
    p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r); p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r); p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); p.closePath(); return p;
  }
  // rounded quad: corners q (any convex quad), corner radius k px
  function rquad(q, k) {
    const p = new Path2D(); const n = q.length; const pt = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    for (let i = 0; i < n; i++) {
      const a = q[(i - 1 + n) % n], b = q[i], c = q[(i + 1) % n];
      const la = Math.hypot(b[0] - a[0], b[1] - a[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]); const r = Math.min(k, la * 0.49, lc * 0.49);
      const p0 = pt(b, a, r / la), p1 = pt(b, c, r / lc);
      if (i === 0) p.moveTo(p0[0], p0[1]); else p.lineTo(p0[0], p0[1]);
      p.quadraticCurveTo(b[0], b[1], p1[0], p1[1]);
    }
    p.closePath(); return p;
  }
  function fill(g, path, style, alpha) { g.save(); if (alpha != null) g.globalAlpha = alpha; g.fillStyle = style; g.fill(path); g.restore(); }
  // a shape drawn soft: filled on a scratch layer, blurred, composited (shadows, contact darkening, haze)
  function soft(g, path, style, blur, alpha, op) {
    const c = layer(); c.fillStyle = style; c.fill(path);
    g.save(); g.globalAlpha = alpha == null ? 1 : alpha; if (op) g.globalCompositeOperation = op; g.filter = `blur(${blur}px)`; g.drawImage(c.canvas, 0, 0); g.restore();
  }
  // posterised radial pool: bands [[t (0..1 of radius), color, alpha]] from the centre out, soft risers (fraction of radius)
  // drawn as an ellipse (rx, ry, rot) clipped to `clip` (Path2D or null). The light falls in steps, not in a digital ramp.
  function pool(g, clip, x, y, rx, ry, rot, bands, o) {
    o = o || {}; const sft = o.soft == null ? 0.035 : o.soft;
    g.save(); if (clip) g.clip(clip); if (o.op) g.globalCompositeOperation = o.op; if (o.alpha != null) g.globalAlpha = o.alpha;
    g.translate(x, y); g.rotate(rot || 0); g.scale(rx, ry);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    // bands are listed centre-out: [t_end, color, alpha]; each band holds its colour until t_end, then steps to the next
    let prev = null;
    bands.forEach((b, i) => {
      const t = b[0], c = rgba(b[1], b[2] == null ? 1 : b[2]);
      if (i === 0) gr.addColorStop(0, c);
      else gr.addColorStop(clamp(prev[0] + sft, 0, 1), c);
      if (i < bands.length - 1) gr.addColorStop(clamp(t - sft, 0, 1), c); else gr.addColorStop(clamp(t, 0, 1), c);
      prev = b;
    });
    const last = bands[bands.length - 1]; gr.addColorStop(1, rgba(last[1], 0));
    g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore();
  }
  // linear stepped fill (posterised shading across a surface): colours from p0 to p1, soft risers
  function steps(g, clip, p0, p1, cols, sft) {
    sft = sft == null ? 0.02 : sft; g.save(); if (clip) g.clip(clip);
    const gr = g.createLinearGradient(p0[0], p0[1], p1[0], p1[1]); const n = cols.length;
    cols.forEach((c, i) => { const a = i / n, b = (i + 1) / n; gr.addColorStop(clamp(a + (i ? sft : 0), 0, 1), c); gr.addColorStop(clamp(b - (i < n - 1 ? sft : 0), 0, 1), c); });
    g.fillStyle = gr; g.fillRect(-10, -10, W + 20, H + 20); g.restore();
  }
  // a soft beam (screen blend): polygon filled with a gradient from a0 at `from` to a1 at `to`
  function beam(g, pts, color, a0, a1, from, to, op) {
    g.save(); g.globalCompositeOperation = op || 'screen';
    g.fillStyle = lg(g, from[0], from[1], to[0], to[1], [[0, color, a0], [1, color, a1]]); g.fill(pathPts(pts)); g.restore();
  }
  // draw an image (canvas) into a quad [tl,tr,br,bl] in true perspective (vertical slices with projective interpolation)
  function quadImage(g, img, q, o) {
    o = o || {}; const n = o.slices || 64, iw = img.width, ih = img.height;
    if (o.affine) {   // a small, nearly flat quad: one affine through tl, tr, bl (no slicing seams)
      g.save(); if (o.clip) g.clip(o.clip); if (o.alpha != null) g.globalAlpha = o.alpha; g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) g.lineTo(q[i][0], q[i][1]); g.closePath(); g.clip();
      g.setTransform((q[1][0] - q[0][0]) / iw, (q[1][1] - q[0][1]) / iw, (q[3][0] - q[0][0]) / ih, (q[3][1] - q[0][1]) / ih, q[0][0], q[0][1]); g.drawImage(img, 0, 0); g.restore(); return;
    }
    // projective map from the unit square to the quad (homography)
    const Hm = homography(q);
    g.save(); if (o.clip) g.clip(o.clip); if (o.alpha != null) g.globalAlpha = o.alpha; if (o.op) g.globalCompositeOperation = o.op;
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      const a = hmap(Hm, u0, 0), b = hmap(Hm, u1, 0), d = hmap(Hm, u0, 1);
      // affine for this slice: maps (u,v) in [u0,u1]x[0,1] -> screen (approximation inside the thin slice)
      const sx = iw * (u1 - u0);
      g.save();
      const c4 = hmap(Hm, u1, 1);
      const clipP = new Path2D(); const e = 0.6; clipP.moveTo(a[0] - e, a[1]); clipP.lineTo(b[0] + e, b[1]); clipP.lineTo(c4[0] + e, c4[1]); clipP.lineTo(d[0] - e, d[1]); clipP.closePath(); g.clip(clipP);
      g.setTransform((b[0] - a[0]) / sx, (b[1] - a[1]) / sx, (d[0] - a[0]) / ih, (d[1] - a[1]) / ih, a[0], a[1]);
      g.drawImage(img, iw * u0, 0, sx + 1, ih, 0, 0, sx + 1, ih);
      g.restore();
    }
    g.restore();
  }
  function homography(q) {
    // unit square (0,0),(1,0),(1,1),(0,1) -> q[0],q[1],q[2],q[3]
    const [x0, y0] = q[0], [x1, y1] = q[1], [x2, y2] = q[2], [x3, y3] = q[3];
    const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    const den = dx1 * dy2 - dx2 * dy1; const g7 = (sx * dy2 - dx2 * sy) / den, h8 = (dx1 * sy - sx * dy1) / den;
    return [x1 - x0 + g7 * x1, x3 - x0 + h8 * x3, x0, y1 - y0 + g7 * y1, y3 - y0 + h8 * y3, y0, g7, h8];
  }
  function hmap(M, u, v) { const w = M[6] * u + M[7] * v + 1; return [(M[0] * u + M[1] * v + M[2]) / w, (M[3] * u + M[4] * v + M[5]) / w]; }
  // a point inside the quad at (u,v)
  function quadAt(q, u, v) { return hmap(homography(q), u, v); }

  // pinhole camera (metres; x right, y up, z forward into the scene)
  function camera(o) {
    const cyw = Math.cos(o.yaw || 0), syw = Math.sin(o.yaw || 0), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0);
    const f = o.f || (W / 2) / Math.tan((o.fov || 0.9) / 2), cx = o.cx == null ? W / 2 : o.cx, cy = o.cy == null ? H / 2 : o.cy, e = o.eye;
    const rot = d => { const x = d[0], y = d[1], z = d[2]; const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; };
    const view = p => rot([p[0] - e[0], p[1] - e[1], p[2] - e[2]]);
    const P2 = p => { const v = view(p); const z = Math.max(v[2], 0.01); return [cx + f * v[0] / z, cy - f * v[1] / z, v[2]]; };
    const unrot = v => { const y = v[1] * cp + v[2] * sp, z1 = -v[1] * sp + v[2] * cp; return [v[0] * cyw + z1 * syw, y, -v[0] * syw + z1 * cyw]; };
    // the world ray through a screen pixel
    const ray = (px, py) => { const d = unrot([(px - cx) / f, -(py - cy) / f, 1]); const l = Math.hypot(d[0], d[1], d[2]); return [d[0] / l, d[1] / l, d[2] / l]; };
    return { f, cx, cy, eye: e, view, rot, unrot, ray, P: P2, pts: a => a.map(P2), k: z => f / z };
  }

  // a camera that looks from eye at target
  function lookAt(eye, tgt, o) {
    const d = [tgt[0] - eye[0], tgt[1] - eye[1], tgt[2] - eye[2]]; const yaw = Math.atan2(d[0], d[2]); const z1 = d[0] * Math.sin(yaw) + d[2] * Math.cos(yaw);
    return camera(Object.assign({ eye, yaw, pitch: Math.atan2(d[1], z1) }, o || {}));
  }
  // a posterised pool of light lying on a plane in the world: centre c, in-plane unit vectors u, v; bands centre-out [[r (m), colour, alpha]]
  function pool3(g, cam, c, u, v, bands, o) {
    o = o || {}; g.save(); if (o.clip) g.clip(o.clip); if (o.op) g.globalCompositeOperation = o.op; const blur = o.blur == null ? 6 : o.blur;
    for (let i = bands.length - 1; i >= 0; i--) {
      const r = bands[i][0], pts = []; const sy = o.sy || 1;
      for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2; const ca = Math.cos(a) * r, sa = Math.sin(a) * r * sy; pts.push(cam.P([c[0] + u[0] * ca + v[0] * sa, c[1] + u[1] * ca + v[1] * sa, c[2] + u[2] * ca + v[2] * sa])); }
      g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = rgba(bands[i][1], bands[i][2] == null ? 1 : bands[i][2]); g.fill(pathPts(pts)); g.restore();
    }
    g.restore();
  }

  // =====================================================================================================
  // CLOTH: heightfields (bedding, a couch cushion, a coat's fall) drawn as fine flat-shaded quads in true perspective, lit by
  // world lamps with posterised bands. Lamps (world space, metres):
  //   {type:'point', p, col (linear), d0 (m), emit (screen normal) , spill, steps, soft}
  //   {type:'dir', d (toward the light), col, steps, soft, win: {x (plane), y0,y1,z0,z1, slat, open} (light through a window with blinds)}
  //   {type:'amb', up, down}
  // o: {x:[x0,x1], z:[z0,z1], step (m), h(x,z) -> y | null, alb: hex | fn(x,z)->hex, occ: [h fns] (heightfield occluders), occFn(p, L) -> 0..1}
  // returns quads [{poly (screen), depth, col, c (world centre)}] already sorted far -> near; cloth.draw(g, quads, filter)
  function cloth(cam, o) {
    const st = o.step || 0.02; const nx = Math.max(1, Math.round((o.x[1] - o.x[0]) / st)), nz = Math.max(1, Math.round((o.z[1] - o.z[0]) / st));
    const dx = (o.x[1] - o.x[0]) / nx, dz = (o.z[1] - o.z[0]) / nz; const Y = []; 
    for (let i = 0; i <= nx; i++) { Y.push([]); for (let j = 0; j <= nz; j++) Y[i].push(o.h(o.x[0] + i * dx, o.z[0] + j * dz)); }
    const lights = o.lights; const albC = {}; const alb = (x, z) => { const hx = typeof o.alb === 'function' ? o.alb(x, z) : o.alb; return albC[hx] || (albC[hx] = L3(hx)); };
    const occ = o.occ || [];
    const shadowHF = (p, d) => {   // march toward a direction over the heightfield occluders
      for (let k = 1; k <= 26; k++) { const t = 0.012 * k * k * 0.18 + 0.01 * k; const q = [p[0] + d[0] * t, p[1] + d[1] * t, p[2] + d[2] * t];
        for (let m = 0; m < occ.length; m++) { const hh = occ[m](q[0], q[2]); if (hh != null && hh > q[1] + 0.004) return 1; } if (q[1] > 1.6) break; }
      return 0; };
    const quads = [], lastCol = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const a = Y[i][j], b = Y[i + 1][j], c = Y[i + 1][j + 1], d = Y[i][j + 1]; if (a == null || b == null || c == null || d == null) continue;
      const x0 = o.x[0] + i * dx, z0 = o.z[0] + j * dz;
      const P00 = [x0, a, z0], P10 = [x0 + dx, b, z0], P11 = [x0 + dx, c, z0 + dz], P01 = [x0, d, z0 + dz];
      const ux = [P11[0] - P00[0], P11[1] - P00[1], P11[2] - P00[2]], vz = [P01[0] - P10[0], P01[1] - P10[1], P01[2] - P10[2]];
      let nn = [vz[1] * ux[2] - vz[2] * ux[1], vz[2] * ux[0] - vz[0] * ux[2], vz[0] * ux[1] - vz[1] * ux[0]]; let l = Math.hypot(nn[0], nn[1], nn[2]) || 1; nn = [nn[0] / l, nn[1] / l, nn[2] / l];
      if (nn[1] < 0) nn = [-nn[0], -nn[1], -nn[2]];
      const C = [x0 + dx / 2, (a + b + c + d) / 4, z0 + dz / 2];
      let r = 0, gg = 0, bb = 0;
      lights.forEach((L, li) => {
        if (L.type === 'amb') { const k = 0.5 + 0.5 * nn[1]; r += lerp(L.down[0], L.up[0], k); gg += lerp(L.down[1], L.up[1], k); bb += lerp(L.down[2], L.up[2], k); return; }
        let lv, att = 1;
        if (L.type === 'point') { lv = [L.p[0] - C[0], L.p[1] - C[1], L.p[2] - C[2]]; const dd = Math.hypot(lv[0], lv[1], lv[2]); lv = [lv[0] / dd, lv[1] / dd, lv[2] / dd]; att = 1 / (1 + (dd / L.d0) * (dd / L.d0));
          if (L.emit) { const e = -(lv[0] * L.emit[0] + lv[1] * L.emit[1] + lv[2] * L.emit[2]); const s0 = L.spill == null ? 0.12 : L.spill; att *= Math.max(0, (e + s0) / (1 + s0)); } }
        else { const dl = Math.hypot(L.d[0], L.d[1], L.d[2]); lv = [L.d[0] / dl, L.d[1] / dl, L.d[2] / dl];
          if (L.win) { const w = L.win; let acc = 0; const SS = [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3], [0, 0]];
            for (let k = 0; k < SS.length; k++) { const px = C[0] + SS[k][0] * dx, pz = C[2] + SS[k][1] * dz; const t = (w.x - px) / lv[0]; if (t <= 0) continue; const yw = C[1] + lv[1] * t, zw = pz + lv[2] * t;
              if (yw < w.y0 || yw > w.y1 || zw < w.z0 || zw > w.z1) continue; let a = 1; if (w.slat) { const fr = ((yw - w.y0) / w.slat) % 1; if (fr > (w.open || 0.55)) a = w.dim == null ? 0.12 : w.dim; } acc += a; }
            att *= acc / SS.length; if (att <= 0) return; } }
        let ndl = nn[0] * lv[0] + nn[1] * lv[1] + nn[2] * lv[2]; if (L.wrap) ndl = (ndl + L.wrap) / (1 + L.wrap); if (ndl <= 0 || att <= 0) return;
        let sh = 0; if (L.shadow !== false) { sh = shadowHF([C[0] + nn[0] * 0.006, C[1] + nn[1] * 0.006, C[2] + nn[2] * 0.006], L.type === 'point' ? lv : lv); if (!sh && o.occFn) sh = o.occFn(C, L, li); }
        const I = ndl * att * (L.gain || 1) * (1 - sh * (L.shadowK == null ? 0.85 : L.shadowK));
        const q = quant(I, L.steps || STEPS.soft, L.soft == null ? 0.04 : L.soft);
        r += L.col[0] * q; gg += L.col[1] * q; bb += L.col[2] * q;
      });
      const A = alb(C[0], C[2]); const add = o.add || [0, 0, 0];
      const col = 'rgb(' + Math.round(l2s(A[0] * r + add[0])) + ',' + Math.round(l2s(A[1] * gg + add[1])) + ',' + Math.round(l2s(A[2] * bb + add[2])) + ')';
      const poly = [cam.P(P00), cam.P(P10), cam.P(P11), cam.P(P01)];
      const vd = cam.view(C), vn = cam.rot(nn); const back = vd[0] * vn[0] + vd[1] * vn[1] + vd[2] * vn[2] > 0.02 * Math.hypot(vd[0], vd[1], vd[2]);
      // a fold turned away from us: it takes its neighbour's colour (no holes, no dark slivers)
      if (back) { if (lastCol[i] == null) continue; quads.push({ poly, depth: vd[2], col: lastCol[i], c: C, n: nn }); continue; }
      lastCol[i] = col; quads.push({ poly, depth: vd[2], col, c: C, n: nn });
    }
    quads.sort((p, q) => q.depth - p.depth);
    return quads;
  }
  function drawCloth(g, quads, filter) {
    g.save(); g.lineJoin = 'round'; g.lineWidth = 1.1;
    for (let i = 0; i < quads.length; i++) { const q = quads[i]; if (filter && !filter(q)) continue; const P = q.poly;
      g.beginPath(); g.moveTo(P[0][0], P[0][1]); g.lineTo(P[1][0], P[1][1]); g.lineTo(P[2][0], P[2][1]); g.lineTo(P[3][0], P[3][1]); g.closePath();
      g.fillStyle = q.col; g.strokeStyle = q.col; g.fill(); g.stroke(); }
    g.restore();
  }
  // soft-box dome (a pillow, a cushion): centre (cx, cz), half sizes a (x) b (z), base y0, height t, squareness p (2 = ellipse, 4+ = boxy)
  function dome(cx, cz, a, b, y0, t, p, extra, sMax) {
    p = p || 4; sMax = sMax || 1;
    return (x, z) => { const u = Math.abs((x - cx) / a), v = Math.abs((z - cz) / b); const s = Math.pow(u, p) + Math.pow(v, p); if (s >= sMax) return null;
      let y = y0 + t * Math.pow(1 - s, 0.38); if (extra) y += extra(x, z, s); return y; };
  }

  // a limb in a sleeve, drawn flat: a tapered capsule between two projected points (widths in px), with a lit side
  function limb(g, a, b, w0, w1, col, o) {
    o = o || {}; const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, ang = Math.atan2(dy, dx);
    const p2 = new Path2D();
    p2.moveTo(a[0] + nx * w0 / 2, a[1] + ny * w0 / 2); p2.lineTo(b[0] + nx * w1 / 2, b[1] + ny * w1 / 2);
    p2.arc(b[0], b[1], w1 / 2, ang + Math.PI / 2, ang - Math.PI / 2, true); p2.lineTo(a[0] - nx * w0 / 2, a[1] - ny * w0 / 2);
    p2.arc(a[0], a[1], w0 / 2, ang - Math.PI / 2, ang + Math.PI / 2, true); p2.closePath();
    g.save(); g.fillStyle = col; g.fill(p2);
    if (o.lit) { g.clip(p2); const s = o.litSide || 1; g.globalAlpha = o.litA == null ? 1 : o.litA; g.fillStyle = o.lit; g.filter = 'blur(2px)';
      const q = new Path2D(); q.moveTo(a[0] + nx * s * w0, a[1] + ny * s * w0); q.lineTo(b[0] + nx * s * w1, b[1] + ny * s * w1); q.lineTo(b[0] + nx * s * w1 * 0.12, b[1] + ny * s * w1 * 0.12); q.lineTo(a[0] + nx * s * w0 * 0.12, a[1] + ny * s * w0 * 0.12); q.closePath(); g.fill(q); }
    g.restore(); return p2;
  }

  // =====================================================================================================
  // CAPTIONS: in the picture, bottom centre, sentence case, speaker named first, soft dark halo, no box
  // =====================================================================================================
  function caption(g, lines, o) {
    o = Object.assign({ x: W / 2, y: H - 70, size: 42, lead: 1.3, family: 'Libre Franklin', weight: 600, color: P.sub, halo: P.subHalo, haloBlur: 16 }, o || {});
    g.save(); g.font = `${o.weight} ${o.size}px "${o.family}"`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const L = lines.map(l => typeof l === 'string' ? { t: l } : l), n = L.length;
    L.forEach((l, i) => {
      const y = o.y - (n - 1 - i) * o.size * o.lead;
      if (o.halo) { g.save(); g.filter = `blur(${o.haloBlur}px)`; g.fillStyle = o.halo; for (let k = 0; k < 3; k++) g.fillText(l.t, o.x, y); g.restore(); }
      g.fillStyle = l.color || o.color; g.fillText(l.t, o.x, y);
    });
    g.restore();
  }

  // =====================================================================================================
  // COLOUR MATHS (linear light for the tracer)
  // =====================================================================================================
  const S2L = new Float64Array(256); for (let i = 0; i < 256; i++) { const v = i / 255; S2L[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function L3(hex) { const c = hexToRgb(hex); return [S2L[c[0]], S2L[c[1]], S2L[c[2]]]; }
  function l2s(v) { v = v <= 0 ? 0 : v >= 1 ? 1 : v; return (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255; }
  function hexL(rgbLin) { return '#' + rgbLin.map(v => Math.round(l2s(v)).toString(16).padStart(2, '0')).join(''); }
  const scale3 = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  // =====================================================================================================
  // FIG: the quadric figure tracer
  // Object space: units are head heights; x = the figure's left (screen right when it faces us), y down, z out of the face.
  // Camera space: screen pixels, y down, z toward the viewer. Rays are orthographic along -z.
  // =====================================================================================================
  function mul3(A, B) { const C = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return C; }
  function app3(M, v) { return [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]]; }
  function tr3(M) { return [M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]]; }
  // yaw + turns the face toward screen right; pitch + tips the chin down; roll + turns the head clockwise on screen
  function rot3(yaw, pitch, roll) {
    const cy = Math.cos(yaw || 0), sy = Math.sin(yaw || 0), cp = Math.cos(pitch || 0), sp = Math.sin(pitch || 0), cr = Math.cos(roll || 0), sr = Math.sin(roll || 0);
    return mul3([cr, -sr, 0, sr, cr, 0, 0, 0, 1], mul3([1, 0, 0, 0, cp, sp, 0, -sp, cp], [cy, 0, sy, 0, 1, 0, -sy, 0, cy]));
  }
  // a rotation from two desired axes (camera space): local x -> ax, local y -> (ay orthogonalised), local z = x × y
  function basis(ax, ay) { const x = norm3(ax); let y = [ay[0] - x[0] * dot3(ax, x) * 0, ay[1], ay[2]]; const d = dot3(ay, x); y = norm3([ay[0] - x[0] * d, ay[1] - x[1] * d, ay[2] - x[2] * d]); const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]]; return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]; }
  const norm3 = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  // an object: a rigid frame for a set of primitives. o = {x, y, z, s (px per head height), yaw, pitch, roll | R}
  function Obj(o) {
    const R = o.R || rot3(o.yaw, o.pitch, o.roll);
    const ob = { T: [o.x, o.y, o.z || 0], s: o.s, R, Rt: tr3(R), prims: [], mats: o.mats || {}, albedo: o.albedo || null, name: o.name || '', tag: o.tag };
    ob.toCam = p => { const q = app3(R, p); return [ob.T[0] + ob.s * q[0], ob.T[1] + ob.s * q[1], ob.T[2] + ob.s * q[2]]; };
    ob.toLoc = p => app3(ob.Rt, [(p[0] - ob.T[0]) / ob.s, (p[1] - ob.T[1]) / ob.s, (p[2] - ob.T[2]) / ob.s]);
    ob.dirCam = v => app3(R, v); ob.dirLoc = v => app3(ob.Rt, v);
    // child frame: a local point and a local rotation make a new object in camera space (hands on arms, heads on necks)
    ob.child = (p, yaw, pitch, roll, k, extra) => Obj(Object.assign({ R: mul3(R, rot3(yaw, pitch, roll)), x: ob.toCam(p)[0], y: ob.toCam(p)[1], z: ob.toCam(p)[2], s: ob.s * (k || 1), mats: ob.mats, albedo: ob.albedo }, extra || {}));
    return ob;
  }
  // the world (metres, y up) seen through a pinhole camera, linearised for the tracer about a reference depth zRef
  function space(cam, zRef) {
    const k = cam.f / zRef;
    const P = p => { const v = cam.view(p); const sc = cam.f / v[2]; return [cam.cx + v[0] * sc, cam.cy - v[1] * sc, -(v[2] - zRef) * k]; };
    const D = d => { const v = cam.rot(d); return [v[0], -v[1], -v[2]]; };
    // an object at world point p with local axes given as world directions: ax (the figure's left), ay (down, toward the chin); m metres per unit
    const obj = (p, ax, ay, m, extra) => { const c = P(p); const sp = m * cam.f / cam.view(p)[2]; return Obj(Object.assign({ x: c[0], y: c[1], z: c[2], s: sp, R: basis(D(ax), D(ay)) }, extra || {})); };
    // world-space props (pillows, duvet, arms): each primitive is placed in true perspective at its own depth.
    // c, r, a, b in metres; local axes are world x, world down, world -z. opt as for ell/cap plus mats/albedo for the object.
    const RW = () => basis(D([1, 0, 0]), D([0, -1, 0]));
    const toL = (p, c) => [p[0] - c[0], -(p[1] - c[1]), -(p[2] - c[2])];
    const wEll = (list, c, r, opt) => { opt = opt || {}; const pc = P(c); const ob = Obj({ x: pc[0], y: pc[1], z: pc[2], s: cam.f / cam.view(c)[2], R: RW(), mats: opt.mats, albedo: opt.albedo });
      ell(ob, [0, 0, 0], r, opt); list.push(ob); return ob; };
    const wCap = (list, a, b, r, opt) => { opt = opt || {}; const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; const pc = P(c);
      const ob = Obj({ x: pc[0], y: pc[1], z: pc[2], s: cam.f / cam.view(c)[2], R: RW(), mats: opt.mats, albedo: opt.albedo });
      cap(ob, toL(a, c), toL(b, c), r, opt); list.push(ob); return ob; };
    return { k, P, D, obj, ell: wEll, cap: wCap };
  }
  // ellipsoid. c, r in object units. opt: {rot:[yaw,pitch,roll] of the primitive, mat, g (normal-blend group), ao (crevice weight), mask(pl) -> bool, back (render inside), cast (false: casts no shadow)}
  function ell(ob, c, r, opt) {
    opt = opt || {}; const Rl = opt.rot ? rot3(opt.rot[0], opt.rot[1], opt.rot[2]) : null; const M = Rl ? mul3(ob.R, Rl) : ob.R;
    const C = ob.toCam(c), rr = [r[0] * ob.s, r[1] * ob.s, r[2] * ob.s];
    const p = { k: 0, C, a0: [M[0], M[3], M[6]], a1: [M[1], M[4], M[7]], a2: [M[2], M[5], M[8]], ir: [1 / rr[0], 1 / rr[1], 1 / rr[2]], rmax: Math.max(...rr), rmin: Math.min(...rr),
      mat: opt.mat || 'skin', g: opt.g == null ? 'body' : opt.g, ao: opt.ao == null ? 0 : opt.ao, mask: opt.mask || null, back: !!opt.back, cast: opt.cast !== false, ob, dark: opt.dark || 0 };
    ob.prims.push(p); return p;
  }
  function cap(ob, a, b, r, opt) {
    opt = opt || {}; const A = ob.toCam(a), B = ob.toCam(b), rr = r * ob.s;
    const ba = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
    const p = { k: 1, A, B, ba, baba: dot3(ba, ba), r: rr, rmax: rr + Math.hypot(ba[0], ba[1], ba[2]) / 2, C: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2],
      mat: opt.mat || 'skin', g: opt.g == null ? 'body' : opt.g, ao: opt.ao == null ? 0 : opt.ao, mask: opt.mask || null, cast: opt.cast !== false, ob, dark: opt.dark || 0 };
    ob.prims.push(p); return p;
  }

  // ray / primitive. Returns near root in out[0], far root in out[1]; false when missed.
  function hitE(p, ox, oy, oz, dx, dy, dz, out) {
    const rx = ox - p.C[0], ry = oy - p.C[1], rz = oz - p.C[2];
    const A = p.a0, B = p.a1, Cc = p.a2, i0 = p.ir[0], i1 = p.ir[1], i2 = p.ir[2];
    const o0 = (rx * A[0] + ry * A[1] + rz * A[2]) * i0, d0 = (dx * A[0] + dy * A[1] + dz * A[2]) * i0;
    const o1 = (rx * B[0] + ry * B[1] + rz * B[2]) * i1, d1 = (dx * B[0] + dy * B[1] + dz * B[2]) * i1;
    const o2 = (rx * Cc[0] + ry * Cc[1] + rz * Cc[2]) * i2, d2 = (dx * Cc[0] + dy * Cc[1] + dz * Cc[2]) * i2;
    const a = d0 * d0 + d1 * d1 + d2 * d2, b = o0 * d0 + o1 * d1 + o2 * d2, c = o0 * o0 + o1 * o1 + o2 * o2 - 1;
    const disc = b * b - a * c; if (disc < 0) return false; const sq = Math.sqrt(disc);
    out[0] = (-b - sq) / a; out[1] = (-b + sq) / a; return true;
  }
  function hitC(p, ox, oy, oz, dx, dy, dz) {   // |d| = 1
    const A = p.A, oax = ox - A[0], oay = oy - A[1], oaz = oz - A[2], ba = p.ba, baba = p.baba, r = p.r;
    const bard = ba[0] * dx + ba[1] * dy + ba[2] * dz, baoa = ba[0] * oax + ba[1] * oay + ba[2] * oaz, rdoa = dx * oax + dy * oay + dz * oaz, oaoa = oax * oax + oay * oay + oaz * oaz;
    const a = baba - bard * bard;
    if (a > 1e-9) {
      const b = baba * rdoa - baoa * bard, c = baba * oaoa - baoa * baoa - r * r * baba; const h = b * b - a * c;
      if (h < 0) return -1;
      const t = (-b - Math.sqrt(h)) / a, y = baoa + t * bard;
      if (y > 0 && y < baba) return t;
      let cx, cy, cz; if (y <= 0) { cx = oax; cy = oay; cz = oaz; } else { cx = ox - p.B[0]; cy = oy - p.B[1]; cz = oz - p.B[2]; }
      const b2 = dx * cx + dy * cy + dz * cz, c2 = cx * cx + cy * cy + cz * cz - r * r, h2 = b2 * b2 - c2;
      return h2 > 0 ? -b2 - Math.sqrt(h2) : -1;
    }
    // ray parallel to the axis: the nearer cap
    let best = -1;
    [p.A, p.B].forEach(S => { const cx = ox - S[0], cy = oy - S[1], cz = oz - S[2]; const b2 = dx * cx + dy * cy + dz * cz, c2 = cx * cx + cy * cy + cz * cz - r * r, h2 = b2 * b2 - c2; if (h2 > 0) { const t = -b2 - Math.sqrt(h2); if (best < 0 || t < best) best = t; } });
    return best;
  }
  // gradient direction (unnormalised) and approximate signed distance of a primitive at a camera point
  function gradF(p, x, y, z, outN) {
    if (p.k === 0) {
      const rx = x - p.C[0], ry = y - p.C[1], rz = z - p.C[2];
      const u0 = (rx * p.a0[0] + ry * p.a0[1] + rz * p.a0[2]) * p.ir[0], u1 = (rx * p.a1[0] + ry * p.a1[1] + rz * p.a1[2]) * p.ir[1], u2 = (rx * p.a2[0] + ry * p.a2[1] + rz * p.a2[2]) * p.ir[2];
      const g0 = u0 * p.ir[0], g1 = u1 * p.ir[1], g2 = u2 * p.ir[2];
      const nx = g0 * p.a0[0] + g1 * p.a1[0] + g2 * p.a2[0], ny = g0 * p.a0[1] + g1 * p.a1[1] + g2 * p.a2[1], nz = g0 * p.a0[2] + g1 * p.a1[2] + g2 * p.a2[2];
      const gl = Math.hypot(nx, ny, nz) || 1e-9; outN[0] = nx / gl; outN[1] = ny / gl; outN[2] = nz / gl;
      return (u0 * u0 + u1 * u1 + u2 * u2 - 1) / (2 * gl);
    }
    const ax = x - p.A[0], ay = y - p.A[1], az = z - p.A[2]; let h = (ax * p.ba[0] + ay * p.ba[1] + az * p.ba[2]) / p.baba; h = h < 0 ? 0 : h > 1 ? 1 : h;
    const qx = ax - p.ba[0] * h, qy = ay - p.ba[1] * h, qz = az - p.ba[2] * h; const l = Math.hypot(qx, qy, qz) || 1e-9;
    outN[0] = qx / l; outN[1] = qy / l; outN[2] = qz / l; return l - p.r;
  }

  // quantise a light intensity into flat bands with soft risers. st = [[threshold, level], ...] ascending
  function quant(I, st, sft) {
    let v = 0, prev = 0;
    for (let i = 0; i < st.length; i++) { const t = st[i][0], lv = st[i][1]; const a = t - sft, b = t + sft; let s = (I - a) / (b - a); s = s < 0 ? 0 : s > 1 ? 1 : s * s * (3 - 2 * s); v += (lv - prev) * s; prev = lv; }
    return v;
  }
  const STEPS = { smooth: [[0.5, 1]], skin: [[0.05, 0.3], [0.3, 0.68], [0.6, 1.0]], soft: [[0.03, 0.3], [0.25, 0.62], [0.55, 1.0]], hard: [[0.06, 1.0]] };

  // TRACE. objs: [Obj], lights: [{type:'point', p:[x,y,z], col:[lin], d0, steps, soft, area (px), wrap, shadow},
  //                              {type:'dir', d:[toward light], col, steps, soft, wrap, shadow},
  //                              {type:'amb', up:[lin], down:[lin], side?}]
  // o: {add:[lin] haze added after lighting, pad, rect:{x,y,w,h} (limit), ao:k, blend:k (object units), spec}
  function trace(objs, lights, o) {
    o = o || {};
    const prims = []; objs.forEach(ob => ob.prims.forEach(p => prims.push(p)));
    const NP = prims.length;
    // screen bounds of each primitive
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9, ztop = -1e9;
    const pb = prims.map(p => {
      let x0, y0, x1, y1;
      if (p.k === 0) { x0 = p.C[0] - p.rmax; x1 = p.C[0] + p.rmax; y0 = p.C[1] - p.rmax; y1 = p.C[1] + p.rmax; ztop = Math.max(ztop, p.C[2] + p.rmax); }
      else { x0 = Math.min(p.A[0], p.B[0]) - p.r; x1 = Math.max(p.A[0], p.B[0]) + p.r; y0 = Math.min(p.A[1], p.B[1]) - p.r; y1 = Math.max(p.A[1], p.B[1]) + p.r; ztop = Math.max(ztop, p.A[2] + p.r, p.B[2] + p.r); }
      bx0 = Math.min(bx0, x0); by0 = Math.min(by0, y0); bx1 = Math.max(bx1, x1); by1 = Math.max(by1, y1); return [x0, y0, x1, y1];
    });
    const pad = 2;
    let X0 = Math.floor(bx0) - pad, Y0 = Math.floor(by0) - pad, X1 = Math.ceil(bx1) + pad, Y1 = Math.ceil(by1) + pad;
    if (o.rect) { X0 = Math.max(X0, o.rect.x); Y0 = Math.max(Y0, o.rect.y); X1 = Math.min(X1, o.rect.x + o.rect.w); Y1 = Math.min(Y1, o.rect.y + o.rect.h); }
    X0 = Math.max(X0, -200); Y0 = Math.max(Y0, -200); X1 = Math.min(X1, W + 200); Y1 = Math.min(Y1, H + 200);
    const w = Math.max(1, X1 - X0), h = Math.max(1, Y1 - Y0);
    const Z0 = ztop + 10;
    // tiles
    const TS = 16, tw = Math.ceil(w / TS), th = Math.ceil(h / TS); const tiles = new Array(tw * th);
    for (let i = 0; i < tiles.length; i++) tiles[i] = [];
    pb.forEach((b, i) => { const tx0 = clamp(Math.floor((b[0] - X0) / TS), 0, tw - 1), tx1 = clamp(Math.floor((b[2] - X0) / TS), 0, tw - 1), ty0 = clamp(Math.floor((b[1] - Y0) / TS), 0, th - 1), ty1 = clamp(Math.floor((b[3] - Y0) / TS), 0, th - 1);
      if (b[2] < X0 || b[0] > X1 || b[3] < Y0 || b[1] > Y1) return;
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) tiles[ty * tw + tx].push(i); });
    // blend neighbourhoods
    const BL = Object.assign({ skin: 0.085, hair: 0.07, hand: 0.045, ear: 0.03, neck: 0.06, body: 0.06, cloth: 0.07 }, o.blend || {}), aoK = o.aoR == null ? 0.05 : o.aoR, aoS = o.ao == null ? 0.55 : o.ao;
    const LT = lights.map(L => Object.assign({ steps: STEPS.skin, soft: 0.05, wrap: 0, shadow: true, area: 0, d0: 600, gain: 1 }, L));
    const addH = o.add || [0, 0, 0];
    const out2 = [0, 0], nTmp = [0, 0, 0];
    const shadeBuf = new Float32Array(w * h * 4), idBuf = new Int32Array(w * h).fill(-1), zBuf = new Float32Array(w * h).fill(-1e9);

    function nearest(x, y, cand) {
      let bt = 1e18, bi = -1, bback = false;
      for (let j = 0; j < cand.length; j++) {
        const i = cand[j], p = prims[i], b = pb[i]; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
        if (p.k === 0) {
          if (!hitE(p, x, y, Z0, 0, 0, -1, out2)) continue;
          let t = out2[0], back = false;
          if (p.mask) { const z = Z0 - t; if (!p.mask(p.ob.toLoc([x, y, z]))) { if (!p.back) continue; t = out2[1]; back = true; if (!p.mask(p.ob.toLoc([x, y, Z0 - t]))) continue; } }
          if (t < bt) { bt = t; bi = i; bback = back; }
        } else { const t = hitC(p, x, y, Z0, 0, 0, -1); if (t > 0 && t < bt) { bt = t; bi = i; bback = false; } }
      }
      return bi < 0 ? null : { i: bi, z: Z0 - bt, back: bback };
    }
    function occluded(x, y, z, dx, dy, dz, dist, self) {
      for (let i = 0; i < NP; i++) {
        const p = prims[i]; if (!p.cast) continue;
        // bounding sphere vs ray
        const cx = p.C[0] - x, cy = p.C[1] - y, cz = p.C[2] - z; const tc = cx * dx + cy * dy + cz * dz; const rr = p.rmax;
        if (tc < -rr || tc > dist + rr) continue; const d2 = cx * cx + cy * cy + cz * cz - tc * tc; if (d2 > rr * rr) continue;
        if (p.k === 0) {
          if (!hitE(p, x, y, z, dx, dy, dz, out2)) continue;
          const eps = 0.6; let t = out2[0];
          if (t > eps && t < dist) { if (!p.mask || p.mask(p.ob.toLoc([x + dx * t, y + dy * t, z + dz * t]))) return true; }
          t = out2[1]; if (p.mask && t > eps && t < dist && p.mask(p.ob.toLoc([x + dx * t, y + dy * t, z + dz * t]))) return true;
        } else { const t = hitC(p, x, y, z, dx, dy, dz); if (t > 0.6 && t < dist) return true; }
      }
      return false;
    }
    function normalAt(hit, x, y, z, nOut) {
      const p = prims[hit.i]; gradF(p, x, y, z, nOut); let nx = nOut[0], ny = nOut[1], nz = nOut[2]; let occ = 0;
      const kb = (BL[p.g] == null ? 0.05 : BL[p.g]) * p.ob.s, ka = aoK * p.ob.s;
      if (!hit.back) for (let i = 0; i < NP; i++) {
        if (i === hit.i) continue; const q = prims[i]; if (q.ob !== p.ob && !(q.g === p.g && q.g !== 'none' && o.crossBlend)) { if (!(q.ao > 0)) continue; }
        const dc = Math.hypot(x - q.C[0], y - q.C[1], z - q.C[2]); if (dc > q.rmax + Math.max(kb, ka) * 1.5) continue;
        const f = gradF(q, x, y, z, nTmp);
        if (q.g === p.g && q.g !== 'none' && (q.ob === p.ob || o.crossBlend) && f < kb) { let wv = 1 - Math.max(0, f) / kb; wv = wv * wv; nx += nTmp[0] * wv; ny += nTmp[1] * wv; nz += nTmp[2] * wv; }
        if (q.ao > 0 && f < ka) { const a = 1 - Math.max(0, f) / ka; occ += q.ao * a * a; }
      }
      const l = Math.hypot(nx, ny, nz) || 1; nOut[0] = nx / l; nOut[1] = ny / l; nOut[2] = nz / l;
      if (hit.back) { nOut[0] = -nOut[0]; nOut[1] = -nOut[1]; nOut[2] = -nOut[2]; }
      return occ;
    }
    const nrm = [0, 0, 0];
    // light term at a camera point with normal n (linear rgb), and the key intensity
    function lightAt(x, y, z, n, mat, occ, res) {
      let r = 0, g = 0, b = 0;
      for (let li = 0; li < LT.length; li++) {
        const L = LT[li];
        if (L.type === 'amb') { const k = 0.5 - 0.5 * n[1]; const up = L.up, dn = L.down || L.up; r += lerp(dn[0], up[0], k); g += lerp(dn[1], up[1], k); b += lerp(dn[2], up[2], k); continue; }
        let lx, ly, lz, dist = 1e6, att = 1;
        if (L.type === 'point') { lx = L.p[0] - x; ly = L.p[1] - y; lz = L.p[2] - z; dist = Math.hypot(lx, ly, lz); lx /= dist; ly /= dist; lz /= dist; att = 1 / (1 + (dist / L.d0) * (dist / L.d0));
          // a screen lights only what is in front of it: emission falls off with the angle from its normal (a little spills round the edges)
          if (L.emit) { const e = -(lx * L.emit[0] + ly * L.emit[1] + lz * L.emit[2]); const sp0 = L.spill == null ? 0.12 : L.spill; att *= Math.max(0, (e + sp0) / (1 + sp0)); if (att <= 0) continue; } }
        else { lx = L.d[0]; ly = L.d[1]; lz = L.d[2]; const l = Math.hypot(lx, ly, lz); lx /= l; ly /= l; lz /= l; }
        let ndl = n[0] * lx + n[1] * ly + n[2] * lz; if (L.wrap) ndl = (ndl + L.wrap) / (1 + L.wrap);
        if (ndl <= 0) continue;
        let sh = 1;
        if (L.shadow) {
          const ex = x + n[0] * 1.2, ey = y + n[1] * 1.2, ez = z + n[2] * 1.2;
          if (L.type === 'point' && L.area > 0) {
            const offs = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]; let s = 0;
            for (let k = 0; k < offs.length; k++) { const px = L.p[0] + offs[k][0] * L.area, py = L.p[1] + offs[k][1] * L.area, pz = L.p[2]; let vx = px - ex, vy = py - ey, vz = pz - ez; const d = Math.hypot(vx, vy, vz); vx /= d; vy /= d; vz /= d; if (!occluded(ex, ey, ez, vx, vy, vz, d)) s++; }
            sh = s / offs.length;
          } else if (occluded(ex, ey, ez, lx, ly, lz, dist)) sh = 0;
        }
        const I = ndl * att * L.gain * (0.15 + 0.85 * sh) * (sh > 0 ? 1 : 0.55);
        const q = quant(I * (1 - (occ || 0) * 0.5), L.steps, L.soft);
        if (res && li === 0) res.key = q;
        r += L.col[0] * q; g += L.col[1] * q; b += L.col[2] * q;
        if (L.spec && mat) {
          const ks = (o.specMat && o.specMat[mat]) || 0; if (ks > 0) {
            let hx = lx, hy = ly, hz = lz + 1; const hl = Math.hypot(hx, hy, hz); const nh = (n[0] * hx + n[1] * hy + n[2] * hz) / hl;
            const sp = Math.pow(Math.max(0, nh), L.spec) * sh * att * L.gain; const qs = sp > 0.35 ? (sp > 0.7 ? 1 : 0.5) : 0; r += L.col[0] * qs * ks; g += L.col[1] * qs * ks; b += L.col[2] * qs * ks;
          }
        }
      }
      if (res) { res.r = r; res.g = g; res.b = b; }
      return [r, g, b];
    }
    const res = { key: 0 };
    function shadeAt(hit, x, y, outRGB) {
      const p = prims[hit.i]; const z = hit.z;
      const occ = normalAt(hit, x, y, z, nrm);
      const pl = p.ob.toLoc([x, y, z]);
      let alb = p.ob.albedo ? p.ob.albedo(p.mat, pl, p, nrm) : null; if (!alb) alb = p.ob.mats[p.mat] || [0.5, 0.5, 0.5];
      lightAt(x, y, z, nrm, p.mat, occ, res);
      const aoF = 1 - Math.min(0.85, occ * aoS);
      let k = aoF * (hit.back ? 0.45 : 1) * (1 - p.dark);
      outRGB[0] = alb[0] * res.r * k + addH[0]; outRGB[1] = alb[1] * res.g * k + addH[1]; outRGB[2] = alb[2] * res.b * k + addH[2];
      return outRGB;
    }
    const rgb = [0, 0, 0];
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const x = X0 + xx + 0.5, y = Y0 + yy + 0.5; const cand = tiles[Math.floor(yy / TS) * tw + Math.floor(xx / TS)];
      if (!cand.length) continue;
      const hit = nearest(x, y, cand); if (!hit) continue;
      shadeAt(hit, x, y, rgb); const q = (yy * w + xx);
      shadeBuf[q * 4] = rgb[0]; shadeBuf[q * 4 + 1] = rgb[1]; shadeBuf[q * 4 + 2] = rgb[2]; shadeBuf[q * 4 + 3] = 1; idBuf[q] = hit.i; zBuf[q] = hit.z;
    }
    // edges: supersample where neighbours disagree
    const outImg = new ImageData(w, h); const D = outImg.data;
    const offs = [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3], [0, -0.38], [0, 0.38], [-0.38, 0], [0.38, 0]];
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const q = yy * w + xx, id = idBuf[q];
      let edge = false;
      if (xx > 0 && idBuf[q - 1] !== id) edge = true; else if (xx < w - 1 && idBuf[q + 1] !== id) edge = true; else if (yy > 0 && idBuf[q - w] !== id) edge = true; else if (yy < h - 1 && idBuf[q + w] !== id) edge = true;
      let R0 = shadeBuf[q * 4], G0 = shadeBuf[q * 4 + 1], B0 = shadeBuf[q * 4 + 2], A0 = shadeBuf[q * 4 + 3];
      if (edge) {
        const cand = tiles[Math.floor(yy / TS) * tw + Math.floor(xx / TS)];
        let sr = R0 * A0, sg = G0 * A0, sb = B0 * A0, sa = A0, n = 1;
        for (let k = 0; k < offs.length; k++) {
          const x = X0 + xx + 0.5 + offs[k][0], y = Y0 + yy + 0.5 + offs[k][1]; n++;
          const hit = cand.length ? nearest(x, y, cand) : null; if (!hit) continue;
          shadeAt(hit, x, y, rgb); sr += rgb[0]; sg += rgb[1]; sb += rgb[2]; sa += 1;
        }
        A0 = sa / n; if (sa > 0) { R0 = sr / sa; G0 = sg / sa; B0 = sb / sa; }
      }
      if (A0 <= 0) continue;
      D[q * 4] = l2s(R0); D[q * 4 + 1] = l2s(G0); D[q * 4 + 2] = l2s(B0); D[q * 4 + 3] = Math.round(A0 * 255);
    }
    const cv = OTM.makeCanvas(w, h); cv.getContext('2d').putImageData(outImg, 0, 0);
    const R = { canvas: cv, x: X0, y: Y0, w, h, prims, lights: LT, occluded,
      draw(g, alpha) { g.save(); if (alpha != null) g.globalAlpha = alpha; g.drawImage(cv, X0, Y0); g.restore(); },
      idAt(x, y) { const xx = Math.floor(x - X0), yy = Math.floor(y - Y0); if (xx < 0 || yy < 0 || xx >= w || yy >= h) return -1; return idBuf[yy * w + xx]; },
      zAt(x, y) { const xx = Math.floor(x - X0), yy = Math.floor(y - Y0); if (xx < 0 || yy < 0 || xx >= w || yy >= h) return -1e9; return zBuf[yy * w + xx]; },
      // the surface under a local point of an object: {p (camera), n, light (lin rgb), key, vis (the point is not hidden), mat}
      surf(ob, pl, tol) {
        const c = ob.toCam(pl); const cand = []; for (let i = 0; i < NP; i++) cand.push(i);
        const hit = nearest(c[0], c[1], cand); if (!hit) return { p: c, vis: false, light: [0, 0, 0], key: 0 };
        const n = [0, 0, 0]; const occ = normalAt(hit, c[0], c[1], hit.z, n); const rr = { key: 0 };
        lightAt(c[0], c[1], hit.z, n, prims[hit.i].mat, occ, rr);
        return { p: c, z: hit.z, n, light: [rr.r, rr.g, rr.b], key: rr.key, vis: Math.abs(hit.z - c[2]) < (tol == null ? 0.03 : tol) * ob.s && prims[hit.i].ob === ob, prim: prims[hit.i], ao: occ };
      },
      // a colour (css) for an albedo hex lit by the surface light
      lit(s, hex, k) { const a = L3(hex); k = k == null ? 1 : k; return hexL([a[0] * s.light[0] * k + addH[0], a[1] * s.light[1] * k + addH[1], a[2] * s.light[2] * k + addH[2]]); },
    };
    return R;
  }

  // =====================================================================================================
  // CAST: him and her. Built in object units (1 = head height). Faces are shared by every image of them in the film:
  // the photo-booth strip, the waterfall, the app's portrait and the living people.
  // =====================================================================================================
  const FACE = {
    him: { jaw: 1.0, chin: 1.0, nose: 1.0, brow: 1.0, lips: 1.0, ear: 1.0, neck: 0.25, faceW: 1.0 },
    her: { jaw: 0.86, chin: 0.9, nose: 0.84, brow: 0.7, lips: 1.1, ear: 0.9, neck: 0.205, faceW: 0.95 },
  };
  // the head's primitives (real proportions: eyes at half height, 0.27 apart; mouth as wide as the pupils are apart)
  function head(ob, who, o) {
    o = o || {}; const F = FACE[who]; const jw = F.jaw, nz = F.nose, fw = F.faceW;
    const sk = (ao, g) => ({ mat: 'skin', g: g || 'skin', ao: ao || 0 });
    ell(ob, [0, -0.12, -0.06], [0.325 * fw, 0.4, 0.43], sk(0));                         // cranium
    ell(ob, [0, 0.06, 0.04], [0.29 * fw, 0.4, 0.3], sk(0));                              // face mass (widest at the cheekbones)
    ell(ob, [0, 0.27, 0.0], [0.245 * jw, 0.225, 0.27], sk(0));                          // jaw
    ell(ob, [0, 0.4, 0.17 + 0.01 * (F.chin - 1)], [0.1 * F.chin, 0.09, 0.1], sk(0.0));   // chin
    [-1, 1].forEach(s => ell(ob, [s * 0.165 * fw, 0.1, 0.19], [0.11, 0.09, 0.095], sk(0.0)));   // cheek pads (barely proud of the face)
    ell(ob, [0, -0.085, 0.29], [0.23 * fw, 0.055 * F.brow, 0.08], sk(0.15));            // brow ridge
    cap(ob, [0, -0.04, 0.338], [0, 0.128, 0.425 + 0.015 * (nz - 1)], 0.031 * nz, sk(0.25));   // nose bridge
    ell(ob, [0, 0.148, 0.405 + 0.015 * (nz - 1)], [0.04 * nz, 0.035, 0.038], sk(0.08));      // nose tip
    [-1, 1].forEach(s => ell(ob, [s * 0.05 * nz, 0.17, 0.37], [0.033 * nz, 0.03, 0.036], sk(0.45)));   // nostril wings
    ell(ob, [0, 0.27, 0.24], [0.15, 0.12, 0.12], sk(0.08));                              // muzzle
    const L = F.lips;
    ell(ob, [0, 0.258, 0.328], [0.09 * L, 0.017 * L, 0.028], { mat: 'lipU', g: 'skin', ao: 0.12 });
    ell(ob, [0, 0.298 + 0.003 * L, 0.32], [0.076 * L, 0.022 * L, 0.029], { mat: 'lipL', g: 'skin', ao: 0.18 });
    [-1, 1].forEach(s => ell(ob, [s * 0.315 * fw, 0.075, -0.05], [0.032, 0.115 * F.ear, 0.066 * F.ear], { mat: 'skin', g: 'ear', ao: 0.55, rot: [0, -0.12 * s, -0.16 * s] }));
    if (o.neck !== false) cap(ob, [0, 0.25, -0.1], [0, o.neckLen || 0.95, -0.12], F.neck, { mat: 'skin', g: 'neck', ao: 0 });
  }
  const FEAT = {
    eye: s => ({ c: [s * 0.13, 0.0, 0.31], inn: [s * 0.068, 0.006, 0.312], out: [s * 0.196, -0.008, 0.262], up: [s * 0.124, -0.031, 0.33], lo: [s * 0.134, 0.024, 0.318] }),
    brow: (s, k) => [[s * 0.052, -0.083 * k, 0.37], [s * 0.115, -0.104, 0.36], [s * 0.175, -0.104, 0.336], [s * 0.222, -0.086, 0.3]],
    mouth: s => [s * 0.1, 0.279, 0.318],
    nostril: s => [s * 0.032, 0.183, 0.388],
  };

  const theta = pl => Math.atan2(pl[0], pl[2] + 0.05);
  function pw(table, x) { x = Math.abs(x); for (let i = 1; i < table.length; i++) if (x <= table[i][0]) { const a = table[i - 1], b = table[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return table[table.length - 1][1]; }
  // his hair: short, dark, a little grown out (he has kept everything as it was, including the haircut)
  function hairHim(ob, o) {
    o = o || {};
    const line = [[0, -0.27], [0.45, -0.262], [0.8, -0.19], [1.05, -0.07], [1.2, 0.05], [1.34, -0.01], [1.6, 0.02], [2.1, 0.22], [Math.PI, 0.32]];
    const mask = pl => pl[1] < pw(line, theta(pl)) + 0.02 * (OTM.vnoise(theta(pl) * 11, 2, 5) - 0.5);
    const hm = { mat: 'hair', g: 'hair', ao: 0.3, mask };
    ell(ob, [0, -0.128, -0.06], [0.346, 0.43, 0.452], hm);
    // locks: the grown-out top falls forward and to his right, the crown sits up a little
    // one haircut from every angle: short at the back and sides, the front a little grown out and swept to his right
    const locks = [[-0.05, -0.37, 0.2, 0.21, 0.075, 0.15, 0.3, 0.42, 0.12], [-0.2, -0.33, 0.15, 0.13, 0.07, 0.13, 0.5, 0.35, 0.35],
      [-0.28, -0.24, 0.02, 0.085, 0.15, 0.22, 0, 0, 0.22], [0.28, -0.24, 0.02, 0.085, 0.15, 0.22, 0, 0, -0.22]];
    locks.forEach(l => ell(ob, [l[0], l[1], l[2]], [l[3], l[4], l[5]], { mat: 'hair', g: 'hair', ao: 0.4, rot: [l[6], l[7], l[8]], mask: pl => pl[1] < pw(line, theta(pl)) - 0.01 }));
  }
  // her hair. kind: 'long' (the photographs, the generated images) | 'short' (now: cut above the jaw)
  function hairHer(ob, kind) {
    const part = -0.08;   // a side part on her right; the hair sweeps across to her left
    const front = pl => { const th = theta(pl); if (Math.abs(th) > 1.0) return true; const sweep = clamp((pl[0] - part) / 0.34, 0, 1); const hl = -0.27 + 0.085 * sweep * clamp(1 - Math.abs(th) / 1.3, 0, 1); return pl[1] < hl; };
    const hm = (mask, ao) => ({ mat: 'hair', g: 'hair', ao: (ao == null ? 0.5 : ao) * 0.35, mask });
    if (kind === 'short') {
      const bot = pl => { const th = Math.abs(theta(pl)); return pl[1] < lerp(0.3, 0.24, clamp((th - 1.1) / 1.8, 0, 1)) + 0.012 * (OTM.vnoise(theta(pl) * 16, 1, 3) - 0.5); };
      // (below the temple the cap stays off the cheek: only the hanging locks frame the face there)
      ell(ob, [0, -0.11, -0.05], [0.358, 0.452, 0.468], hm(pl => front(pl) && bot(pl) && !(pl[1] > 0.0 && Math.abs(theta(pl)) < 1.35), 0.7));
      // the swept front: from the part across the forehead to above her left eye, then down past the temple
      ell(ob, [0.07, -0.33, 0.24], [0.25, 0.085, 0.16], Object.assign(hm(pl => true, 0.35), { rot: [0.25, 0.55, 0.22] }));
      ell(ob, [0.23, -0.17, 0.17], [0.11, 0.17, 0.12], Object.assign(hm(pl => true, 0.35), { rot: [0.5, 0.2, -0.15] }));
      // the sides hang straight to just above the jaw, in heavy locks; the ends turn in
      [-1, 1].forEach(s => {
        [[1.12, 0.33, 0.085], [1.45, 0.345, 0.1], [1.85, 0.34, 0.11], [2.3, 0.31, 0.12], [2.75, 0.27, 0.13]].forEach(([th, rr, wd], i) => {
          const x = Math.sin(th) * rr * s, z = Math.cos(th) * rr - 0.06;
          ell(ob, [x, 0.06 + 0.01 * i, z], [wd, 0.25 - 0.012 * i, 0.07], Object.assign(hm(bot, 0.5), { rot: [s * th, 0, -0.05 * s] }));
        });
      });
    } else {
      ell(ob, [0, -0.11, -0.05], [0.352, 0.448, 0.465], hm(front, 0.7));
      ell(ob, [0.07, -0.33, 0.24], [0.25, 0.085, 0.16], Object.assign(hm(pl => true, 0.35), { rot: [0.25, 0.55, 0.22] }));
      // long hair: past the shoulders; on each side a fall in front of the shoulder and a fall behind it, a little wave
      [-1, 1].forEach(s => {
        ell(ob, [s * 0.3, 0.12, 0.02], [0.095, 0.34, 0.2], Object.assign(hm(null, 0.4), { rot: [s * 0.25, 0, -0.06 * s] }));
        ell(ob, [s * 0.36, 0.62, 0.04], [0.12, 0.42, 0.065], Object.assign(hm(null, 0.4), { rot: [s * 0.35, 0.05, -0.08 * s] }));
        ell(ob, [s * 0.39, 1.0, 0.03], [0.1, 0.25, 0.06], Object.assign(hm(null, 0.4), { rot: [s * 0.35, 0.05, 0.1 * s] }));
        ell(ob, [s * 0.4, 0.55, -0.15], [0.13, 0.62, 0.08], Object.assign(hm(null, 0.4), { rot: [s * 0.9, 0, -0.04 * s] }));
      });
      ell(ob, [0, 0.5, -0.28], [0.42, 0.85, 0.18], hm(null, 0.3));
    }
  }

  // a bust: shoulders and chest under clothing (mat 'top'), for the photographs and the people. o: {w (shoulder width k), coat (lapels/thicker), lean}
  function bust(ob, who, o) {
    o = o || {}; const k = o.w || (who === 'him' ? 1 : 0.88); const th = o.coat ? 1.1 : 1;
    const m = { mat: o.mat || 'top', g: 'top', ao: 0 };
    // the slope of the trapezius from the neck to the shoulders, the shoulder caps, the chest below
    ell(ob, [0, 0.93, -0.1], [0.84 * k * th, 0.24, 0.3 * th], m);
    [-1, 1].forEach(s => ell(ob, [s * 0.66 * k, 1.12, -0.1], [0.24 * th, 0.3, 0.25 * th], m));
    ell(ob, [0, 2.15, -0.1], [0.84 * k * th, 1.2, 0.33 * th], m);
    // the collar of the t-shirt / the neckline
    if (o.collar !== false) ell(ob, [0, 0.79, -0.08], [0.27, 0.06, 0.25], Object.assign({}, m, { mat: o.collarMat || m.mat }));
    if (o.arms !== false) [-1, 1].forEach(s => cap(ob, [s * 0.7 * k, 1.15, -0.1], [s * 0.78 * k, 2.0, -0.08], 0.19 * th, m));
  }

  // HANDS. Wrist at the origin; fingers along +x; the palm faces +y; the thumb is on +z (right hand; side -1 mirrors z).
  // pose: {curl: [index, middle, ring, little] (0 straight .. 1 closed) or a number, spread, thumb: {a (abduction), curl}, wristLen}
  function hand(ob, side, pose, opt) {
    pose = pose || {}; opt = opt || {}; const sd = side || 1; const k = opt.k || 1;
    const mat = opt.mat || 'skin', g = opt.g || 'hand';
    const curl = Array.isArray(pose.curl) ? pose.curl : [pose.curl || 0.25, pose.curl || 0.25, pose.curl || 0.25, pose.curl || 0.25];
    const sp = pose.spread == null ? 0.06 : pose.spread;
    // palm (the back of the hand is -y)
    ell(ob, [0.2 * k, 0.0, 0.0], [0.24 * k, 0.065 * k, 0.17 * k], { mat, g, ao: 0.1 });
    ell(ob, [0.08 * k, 0.01 * k, 0.07 * sd * k], [0.13 * k, 0.07 * k, 0.09 * k], { mat, g, ao: 0.1 });   // thenar
    const fingers = [[0.12, 0.43, [0.19, 0.11, 0.085], 0.039], [0.04, 0.45, [0.21, 0.125, 0.09], 0.04], [-0.04, 0.44, [0.195, 0.115, 0.085], 0.037], [-0.115, 0.41, [0.15, 0.09, 0.075], 0.033]];
    const tips = [];
    fingers.forEach(([z0, x0, L, r0], i) => {
      const a0 = (i - 1.5) * sp * sd;   // spread about y
      let px = x0 * k, py = 0, pz = z0 * sd * k; let ang = 0; const c = curl[i];
      const bends = [c * 1.05, c * 1.35, c * 0.95];
      const pts = [[px, py, pz]];
      for (let j = 0; j < 3; j++) {
        ang += bends[j] * (j === 0 ? 1.0 : 1.0);
        const dx = Math.cos(ang) * Math.cos(a0), dy = Math.sin(ang), dz = Math.cos(ang) * Math.sin(a0);
        px += dx * L[j] * k; py += dy * L[j] * k; pz += dz * L[j] * k; pts.push([px, py, pz]);
      }
      for (let j = 0; j < 3; j++) { const ra = r0 * k * (1 - j * 0.12), rb = r0 * k * (1 - (j + 1) * 0.12); cap(ob, pts[j], pts[j + 1], (ra + rb) / 2, { mat, g, ao: 0.35 }); }
      ell(ob, [pts[0][0] - 0.01 * k, pts[0][1] - 0.015 * k, pts[0][2]], [0.05 * k, 0.04 * k, 0.045 * k], { mat, g, ao: 0.1 });   // knuckle
      tips.push(pts);
    });
    // thumb
    const th = pose.thumb || {}; const ta = th.a == null ? 0.55 : th.a, tc = th.curl == null ? 0.3 : th.curl, tdown = th.down == null ? 0.35 : th.down;
    let px = 0.06 * k, py = 0.02 * k, pz = 0.1 * sd * k; const tp = [[px, py, pz]];
    const segs = [0.17, 0.13, 0.1]; let a = ta, dn = tdown;
    for (let j = 0; j < 3; j++) {
      const dx = Math.cos(a) * Math.cos(dn), dz = Math.sin(a) * sd * Math.cos(dn), dy = Math.sin(dn);
      px += dx * segs[j] * k; py += dy * segs[j] * k; pz += dz * segs[j] * k; tp.push([px, py, pz]); a -= tc * 0.6; dn += tc * 0.5;
    }
    const tr = [0.055, 0.047, 0.042, 0.037];
    for (let j = 0; j < 3; j++) cap(ob, tp[j], tp[j + 1], tr[j + 1] * k, { mat, g, ao: 0.3 });
    // wrist / forearm stub
    if (opt.forearm !== false) cap(ob, [0.02 * k, 0, 0], [-(opt.forearm || 0.5) * k, 0.0, 0], 0.1 * k, { mat: opt.armMat || mat, g: opt.armG || g, ao: 0 });
    return { tips, thumb: tp };
  }

  // =====================================================================================================
  // ALBEDO: skin, lips, stubble, hair, cloth (linear rgb). who and flags come from ob.tag
  // =====================================================================================================
  function albedoFor(spec) {
    // spec: {skin, skinDark, lip, hair, hairHi, stubble, mole:[x,y,z]|null, smooth (AI: no blemish), cloth: {mat: hex}, flush}
    const SK = L3(spec.skin), LIP = L3(spec.lip || spec.skin), HR = L3(spec.hair), ST = spec.stubble ? L3(spec.stubble) : null;
    const UE = spec.underEye ? L3(spec.underEye) : null;
    const cloth = {}; Object.keys(spec.cloth || {}).forEach(k => { cloth[k] = L3(spec.cloth[k]); });
    const seed = spec.seed || 3;
    return function (mat, pl, prim) {
      if (mat === 'skin' || mat === 'lipU' || mat === 'lipL') {
        let c = SK;
        if (mat !== 'skin') c = LIP;
        const x = pl[0], y = pl[1], z = pl[2];
        let r = c[0], g = c[1], b = c[2];
        if (!spec.smooth) {
          // faint mottling: real skin is never one colour
          const n = OTM.vnoise(x * 22 + 3, y * 22, seed) - 0.5; r *= 1 + n * 0.05; g *= 1 + n * 0.04;
        }
        // a little warmth across the cheeks and nose
        const ck = Math.exp(-(((Math.abs(x) - 0.15) / 0.09) ** 2 + ((y - 0.12) / 0.07) ** 2)) + 0.7 * Math.exp(-((x / 0.05) ** 2 + ((y - 0.15) / 0.05) ** 2));
        r *= 1 + 0.12 * ck * (spec.flush == null ? 1 : spec.flush); b *= 1 - 0.06 * ck;
        // stubble: the lower face, broken by noise (his: a day or two too long)
        if (ST && mat === 'skin' && z > -0.05 && (!prim || prim.g === 'skin')) {
          const sm = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
          // the beard line: below the cheekbones, along the jaw, round the mouth; never on the lips' centre or the cheeks' tops
          const ax = Math.abs(x);
          let m = sm(0.13, 0.2, y + 0.25 * Math.max(0, 0.2 - ax)) * (1 - sm(0.27, 0.31, ax + 0.15 * Math.max(0, y - 0.3)));
          m = Math.max(m, sm(0.2, 0.215, y) * (1 - sm(0.232, 0.244, y)) * (1 - sm(0.08, 0.11, ax)) * 0.85);   // above the lip
          if (y > 0.24 && y < 0.33 && ax < 0.1) m *= sm(0.07, 0.1, ax);                                    // the lips themselves
          const nn = OTM.vnoise(x * 420, y * 420, seed + 7), n2 = OTM.vnoise(x * 70, y * 70, seed + 9);
          const sv = m * (0.35 + 0.65 * (nn > 0.45 ? 1 : 0.4)) * (0.8 + 0.2 * n2) * (spec.stubbleK == null ? 0.45 : spec.stubbleK);
          r = lerp(r, ST[0], sv); g = lerp(g, ST[1], sv); b = lerp(b, ST[2], sv);
        }
        if (UE && mat === 'skin') {
          [-1, 1].forEach(s => { const d = ((x - s * 0.13) / 0.06) ** 2 + ((y - 0.048) / 0.022) ** 2; const k = Math.exp(-d) * 0.5; r = lerp(r, UE[0], k); g = lerp(g, UE[1], k); b = lerp(b, UE[2], k); });
        }
        if (spec.mole && mat === 'skin') { const m = spec.mole; const d = Math.hypot(x - m[0], y - m[1]); if (d < 0.0085 && z > 0) { r *= 0.35; g *= 0.3; b *= 0.3; } }
        return [r, g, b];
      }
      if (mat === 'hair') {
        const n = spec.smooth ? 0.5 : OTM.vnoise(Math.atan2(pl[0], pl[2]) * 34, pl[1] * 5, seed + 1), n2 = spec.smooth ? 0.5 : OTM.vnoise(Math.atan2(pl[0], pl[2]) * 90, pl[1] * 9, seed + 3);
        const k = 0.72 + 0.42 * n + 0.22 * (n2 - 0.5); return [HR[0] * k, HR[1] * k, HR[2] * k];
      }
      return cloth[mat] || null;
    };
  }

  // the features: drawn on top of a traced head. o: {eyes (0 shut .. 1 open), look:[dx,dy] (iris offset), lash, brow, browCol, mouth:'closed'|'smile'|'laugh'|'chew', iris hex, sclera hex}
  function features(g, R, ob, who, o) {
    o = Object.assign({ eyes: 1, look: [0, 0], iris: '#3B2617', sclera: '#E9E1D6', lash: '#120B08', brow: who === 'him' ? 1.15 : 0.85, browCol: who === 'him' ? '#1A120E' : '#2B1C15', mouth: 'closed', lineCol: '#4A2A1E', lw: 1 }, o || {});
    const s0 = ob.s; const P2 = pl => ob.toCam(pl);
    const vis = pl => R.surf(ob, pl, 0.06);
    // eyes
    [-1, 1].forEach(sd => {
      const E = FEAT.eye(sd); const sc = vis(E.c); if (!sc.vis) return;
      const inn = P2(E.inn), out = P2(E.out), up = P2(E.up), lo = P2(E.lo), c = P2(E.c);
      const open = clamp(o.eyes, 0, 1);
      // the upper lid line drops toward the lower lid as the eye closes
      const upY = [lerp(lo[0], up[0], open), lerp(lo[1] - (lo[1] - up[1]) * 0.15, up[1], open)];
      const lidUp = [inn, [lerp(inn[0], upY[0], 0.55), lerp(inn[1], upY[1], 0.9)], upY, [lerp(out[0], upY[0], 0.45), lerp(out[1], upY[1], 0.85)], out];
      const lidLo = [out, [lerp(out[0], lo[0], 0.5), lerp(out[1], lo[1], 0.9)], lo, [lerp(inn[0], lo[0], 0.5), lerp(inn[1], lo[1], 0.9)], inn];
      const lw = Math.max(1, s0 * 0.008) * o.lw;
      if (open > 0.08) {
        const eyeP = smooth(lidUp.concat(lidLo.slice(1, -1)));
        g.save(); g.clip(eyeP);
        g.fillStyle = R.lit(sc, o.sclera, 0.8); g.fill(eyeP);
        const ir = s0 * 0.03, ix = c[0] + o.look[0] * s0 * 0.03, iy = c[1] + o.look[1] * s0 * 0.02 + (1 - open) * s0 * 0.008;
        const squash = Math.max(0.35, Math.abs(ob.dirCam([0, 0, 1])[2]));
        g.fillStyle = R.lit(sc, o.iris, 1.1); g.beginPath(); g.ellipse(ix, iy, ir * squash, ir, 0, 0, 7); g.fill();
        g.fillStyle = R.lit(sc, '#0A0605', 1); g.beginPath(); g.ellipse(ix, iy, ir * 0.45 * squash, ir * 0.45, 0, 0, 7); g.fill();
        // the lid's shadow on the eyeball
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill(smooth(lidUp.concat([[out[0], out[1] + s0 * 0.012], [inn[0], inn[1] + s0 * 0.012]])));
        // a catch-light from the key
        if (sc.key > 0.4 && o.catch !== false) { g.fillStyle = R.lit(sc, '#FFFFFF', 1.4); g.beginPath(); g.arc(ix + (o.catchOff ? o.catchOff[0] : -0.3) * ir, iy + (o.catchOff ? o.catchOff[1] : -0.35) * ir, Math.max(1, ir * 0.22), 0, 7); g.fill(); }
        g.restore();
      }
      // lash line (upper), heavier at the outer corner; a lighter lower lid line
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      if (open <= 0.3) {
        // closed or closing: the lid is a soft skin shape, its lash line a downward curve, the lashes hanging from it
        const dn = ob.dirCam([0, 1, 0]); const k = s0 * 0.014 * (1 - open);
        const mid = [lerp(inn[0], out[0], 0.5) + dn[0] * k, lerp(inn[1], out[1], 0.5) + dn[1] * k];
        const lidLine = [inn, [lerp(inn[0], mid[0], 0.5) + dn[0] * k * 0.6, lerp(inn[1], mid[1], 0.5) + dn[1] * k * 0.6], mid, [lerp(out[0], mid[0], 0.5) + dn[0] * k * 0.5, lerp(out[1], mid[1], 0.5) + dn[1] * k * 0.5], out];
        const lidShade = smooth([inn, [up[0], up[1]], out].concat(lidLine.slice(1, -1).reverse()));
        g.fillStyle = 'rgba(20,10,8,0.16)'; g.fill(lidShade);
        g.strokeStyle = R.lit(sc, o.lash, 0.9); g.lineWidth = lw * 2.4; g.stroke(smooth(lidLine, true));
        g.lineWidth = lw * 1.1;
        for (let i = 3; i <= 7; i += 1) { const t = i / 9; const q = [lerp(lidLine[0][0], lidLine[4][0], t), lerp(lidLine[0][1], lidLine[4][1], t)];
          const bow = Math.sin(t * Math.PI) * k; const qq = [q[0] + dn[0] * bow, q[1] + dn[1] * bow]; const out2 = ob.dirCam([s0 > 0 ? 0.25 * sd : 0, 1, 0.3]);
          g.beginPath(); g.moveTo(qq[0], qq[1]); g.lineTo(qq[0] + (dn[0] + out2[0] * 0.3) * s0 * 0.0065 * (0.6 + t), qq[1] + (dn[1] + out2[1] * 0.3) * s0 * 0.0065 * (0.6 + t)); g.stroke(); }
        // the crease of the closed lid, faint
        g.strokeStyle = R.lit(sc, '#3A2218', 0.8); g.globalAlpha = 0.35; g.lineWidth = lw; g.stroke(smooth([[lerp(inn[0], up[0], 0.4), lerp(inn[1], up[1], 0.6)], up, [lerp(out[0], up[0], 0.35), lerp(out[1], up[1], 0.65)]], true)); g.globalAlpha = 1;
      } else {
        g.strokeStyle = R.lit(sc, o.lash, 0.9); g.lineWidth = lw * 2.2;
        g.stroke(smooth(lidUp, true));
        g.strokeStyle = R.lit(sc, '#6A4434', 0.8); g.globalAlpha = 0.6; g.lineWidth = lw * 1.1; g.stroke(smooth(lidLo.slice(0, 4), true)); g.globalAlpha = 1;
        const cr = [[lerp(inn[0], up[0], 0.35), inn[1] - s0 * 0.012], [up[0], up[1] - s0 * 0.02], [lerp(out[0], up[0], 0.25), out[1] - s0 * 0.014]];
        g.strokeStyle = R.lit(sc, '#3A2218', 0.8); g.globalAlpha = 0.45; g.lineWidth = lw * 1.2; g.stroke(smooth(cr, true)); g.globalAlpha = 1;
      }
      g.restore();
      // brow
      const bp = FEAT.brow(sd, o.brow > 1 ? 1.05 : 1).map(q => { const sb = vis(q); return sb.vis ? P2(q) : null; }).filter(Boolean);
      if (bp.length >= 3) {
        const sb = vis(FEAT.brow(sd, 1)[1]);
        g.save(); g.strokeStyle = R.lit(sb, o.browCol, 1.0); g.lineCap = 'round'; g.lineJoin = 'round';
        for (let k = 0; k < 3; k++) { g.lineWidth = s0 * 0.02 * o.brow * (1 - k * 0.28); g.globalAlpha = 0.5 + k * 0.25; g.stroke(smooth(bp.map((q, i) => [q[0], q[1] + (i === 0 ? s0 * 0.004 * k : 0)]), true)); }
        g.restore();
      }
    });
    // nostrils
    // nostrils: only where the underside of the nose turns toward us (a face seen from below shows them; from above, never)
    { const under = ob.dirCam([0, 1, 0.35]); const showK = clamp((under[2] + 0.05) / 0.4, 0, 1);
      if (showK > 0 && o.nostrils !== false) [-1, 1].forEach(sd => { const q = FEAT.nostril(sd); const sv = vis([q[0], q[1] - 0.005, q[2] + 0.01]); const p = P2(q);
        const ax = ob.dirCam([1, 0, 0]), ay = ob.dirCam([0, 0, 1]);
        g.save(); g.fillStyle = R.lit(sv, '#2A140D', 0.8); g.globalAlpha = 0.6 * showK; g.translate(p[0], p[1]); g.transform(ax[0], ax[1], ay[0], ay[1], 0, 0);
        g.beginPath(); g.ellipse(0, 0, s0 * 0.012, s0 * 0.007, sd * 0.35, 0, 7); g.fill(); g.restore(); }); }
    // the line of the mouth
    if (o.mouth === 'none') return;
    if (o.mouth === 'laugh' || o.mouth === 'grin') {
      // an open laugh: a dark mouth shape between the lips, a line of teeth under the upper lip
      const op = o.mouth === 'laugh' ? 1 : 0.45; const sv = vis([0, 0.29, 0.33]);
      const pts = [[-0.1, 0.276], [-0.05, 0.268], [0, 0.27], [0.05, 0.268], [0.1, 0.276], [0.06, 0.3 + 0.03 * op], [0, 0.312 + 0.04 * op], [-0.06, 0.3 + 0.03 * op]].map(q => P2([q[0], q[1], 0.33 - Math.abs(q[0]) * 0.4]));
      g.save(); g.fillStyle = R.lit(sv, '#2A0E0B', 0.9); g.fill(smooth(pts));
      g.clip(smooth(pts)); const tp = [[-0.075, 0.27], [0.075, 0.27], [0.07, 0.285], [-0.07, 0.285]].map(q => P2([q[0], q[1], 0.335 - Math.abs(q[0]) * 0.4]));
      g.fillStyle = R.lit(sv, '#E8E0D6', 0.85); g.fill(pathPts(tp)); g.restore();
      return;
    }
    const mL = P2(FEAT.mouth(-1)), mR = P2(FEAT.mouth(1)), mC = P2([0, 0.282, 0.335]);
    const sm = vis([0, 0.282, 0.33]);
    g.save(); g.lineCap = 'round'; g.strokeStyle = R.lit(sm, o.lineCol, 0.75); g.globalAlpha = 0.85; g.lineWidth = Math.max(1, s0 * 0.0055);
    const up = ob.dirCam([0, -1, 0]); const lift = o.mouth === 'smile' ? 0.012 : o.mouth === 'still' ? -0.001 : o.mouth === 'chew' ? -0.002 : 0.004;
    const cL = [mL[0] + up[0] * s0 * lift, mL[1] + up[1] * s0 * lift], cR = [mR[0] + up[0] * s0 * lift, mR[1] + up[1] * s0 * lift];
    const pts = [cL, [lerp(cL[0], mC[0], 0.5) - up[0] * s0 * 0.003, lerp(cL[1], mC[1], 0.5) - up[1] * s0 * 0.003], mC, [lerp(cR[0], mC[0], 0.5) - up[0] * s0 * 0.003, lerp(cR[1], mC[1], 0.5) - up[1] * s0 * 0.003], cR];
    if (vis(FEAT.mouth(-1)).vis || vis(FEAT.mouth(1)).vis) g.stroke(smooth(pts.filter((q, i) => true), true));
    g.restore();
  }

  // =====================================================================================================
  // THE TWO KINDS OF IMAGE. The same two heads under two lights.
  // =====================================================================================================
  const CAST = {
    him: { skin: '#B07A56', lip: '#93594A', hair: '#17110D', stubble: '#2E2420' },
    her: { skin: '#E2B89C', lip: '#B56C66', hair: '#2D1C14', mole: [0.17, 0.14, 0.27], underEye: '#BC8F7D' },
  };
  // one couple (her left, him right). o: {tilt (her head tipped against his), light: [...], smooth (generated), herLong, s (head px), cx, cy, expr}
  function couple(o) {
    const sH = o.s, cx = o.cx, cy = o.cy; const e = o.expr || {};
    const himA = albedoFor(Object.assign({}, CAST.him, { smooth: o.smooth, stubble: o.smooth ? null : CAST.him.stubble, stubbleK: 0.35, seed: 4, cloth: { top: o.hisTop || '#2B3446' }, flush: o.smooth ? 1.3 : 1 }));
    const herA = albedoFor(Object.assign({}, CAST.her, { smooth: o.smooth, mole: o.smooth ? null : CAST.her.mole, underEye: o.smooth ? null : CAST.her.underEye, seed: 9, cloth: { top: o.herTop || '#D8CBB6' }, flush: o.smooth ? 1.4 : 1 }));
    const tilt = o.tilt || 0;
    const him = Obj({ x: cx + sH * 0.36, y: cy, z: 0, s: sH, yaw: e.hisYaw == null ? -0.12 : e.hisYaw, roll: -0.05 + (e.hisRoll || 0), pitch: 0.04, albedo: himA });
    head(him, 'him', { neckLen: 0.8 }); hairHim(him); bust(him, 'him', { arms: false });
    const her = Obj({ x: cx - sH * 0.36 + tilt * sH * 0.12, y: cy + sH * 0.06 + tilt * sH * 0.12, z: -sH * 0.15, s: sH * 0.95, yaw: e.herYaw == null ? 0.14 : e.herYaw, roll: 0.06 + tilt * 0.42, pitch: 0.03, albedo: herA });
    head(her, 'her', { neckLen: 0.8 }); hairHer(her, o.herLong === false ? 'short' : 'long'); bust(her, 'her', { arms: false });
    return { him, her };
  }
  // THE PHOTO-BOOTH STRIP: four frames from a cheap booth. Flash from the lens, the curtain behind, a hard shadow,
  // skin blown pale, grain, a crooked crop, the print gone a little magenta. In the last frame her head is tipped against his.
  function boothStrip(w, h) {
    const c = OTM.makeCanvas(w, h), g = c.getContext('2d');
    g.fillStyle = '#EEE9DE'; g.fillRect(0, 0, w, h);
    const fw = w * 0.86, fh = (h - w * 0.2) / 4 - w * 0.05, x0 = (w - fw) / 2;
    const exprs = [
      { him: { eyes: 0.7, mouth: 'grin' }, her: { eyes: 0.55, mouth: 'grin' } },
      { him: { eyes: 0.35, mouth: 'laugh' }, her: { eyes: 0.12, mouth: 'laugh' }, hisYaw: -0.05, herYaw: 0.05, hisRoll: 0.1 },
      { him: { eyes: 0.6, mouth: 'grin', look: [-0.9, 0.2] }, her: { eyes: 0.15, mouth: 'laugh' }, hisYaw: -0.45, herYaw: 0.1 },
      { him: { eyes: 0.6, mouth: 'grin' }, her: { eyes: 0.15, mouth: 'smile' }, tilt: 1 },
    ];
    exprs.forEach((ex, i) => {
      const fy = w * 0.08 + i * (fh + w * 0.05);
      const fr = OTM.makeCanvas(Math.ceil(fw * 2), Math.ceil(fh * 2)), fg = fr.getContext('2d');   // render at 2x, then print small
      const FW = fr.width, FH = fr.height;
      fg.fillStyle = '#5B5A60'; fg.fillRect(0, 0, FW, FH);
      // the curtain's folds
      for (let k = 0; k < 9; k++) { fg.fillStyle = k % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.05)'; fg.fillRect(k * FW / 9, 0, FW / 18, FH); }
      const rr = OTM.rng('booth' + i); const crook = (rr() - 0.5) * 0.06;
      fg.save(); fg.translate(FW / 2, FH / 2); fg.rotate(crook); fg.translate(-FW / 2, -FH / 2);
      const sH = FH * 0.62, cxp = FW * (0.5 + (rr() - 0.5) * 0.12), cyp = FH * (0.52 + (i === 3 ? 0.04 : 0) + (rr() - 0.5) * 0.06);
      const cp = couple({ s: sH, cx: cxp, cy: cyp, tilt: ex.tilt || 0, expr: ex, herTop: '#C9B9A6', hisTop: '#2E3340' });
      const flash = [{ type: 'dir', d: [0.04, -0.12, 1], col: [1.75, 1.68, 1.62], steps: [[0.05, 0.55], [0.4, 0.92], [0.75, 1.05]], soft: 0.1, shadow: false, spec: 18 },
        { type: 'amb', up: [0.08, 0.08, 0.09], down: [0.05, 0.05, 0.06] }];
      const R = trace([cp.him, cp.her], flash, { specMat: { skin: 0.25, lipL: 0.3 } });
      // the flash throws their shadow onto the curtain, down and to the right
      { const sh = OTM.makeCanvas(FW, FH), sg = sh.getContext('2d'); sg.drawImage(R.canvas, R.x + FW * 0.05, R.y + FH * 0.06); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(20,18,22,0.75)'; sg.fillRect(0, 0, FW, FH); fg.drawImage(sh, 0, 0); }
      R.draw(fg);
      features(fg, R, cp.him, 'him', Object.assign({ lw: 1.2, catch: true, catchOff: [0, -0.2] }, ex.him));
      features(fg, R, cp.her, 'her', Object.assign({ lw: 1.2, catch: true, catchOff: [0, -0.2] }, ex.her));
      fg.restore();
      // cheap print: blown highlights, a magenta lean, flash fall-off at the corners, grain
      fg.save(); fg.globalCompositeOperation = 'screen'; fg.fillStyle = 'rgba(70,40,55,0.18)'; fg.fillRect(0, 0, FW, FH); fg.restore();
      fg.save(); fg.fillStyle = rg(fg, FW / 2, FH * 0.45, FH * 0.3, FW * 0.75, [[0, '#000000', 0], [1, '#000000', 0.45]]); fg.fillRect(0, 0, FW, FH); fg.restore();
      { const id = fg.getImageData(0, 0, FW, FH), d = id.data, r2 = OTM.rng('grain' + i); for (let q = 0; q < d.length; q += 4) { const n = (r2() + r2() - 1) * 26; d[q] = clamp(d[q] * 1.06 + n + 6, 0, 255); d[q + 1] = clamp(d[q + 1] * 1.0 + n, 0, 255); d[q + 2] = clamp(d[q + 2] * 1.04 + n + 4, 0, 255); } fg.putImageData(id, 0, 0); }
      g.save(); g.filter = 'blur(0.35px)'; g.drawImage(fr, x0 + (rr() - 0.5) * w * 0.03, fy, fw, fh); g.restore();
    });
    // the paper: fingered at the edges
    g.strokeStyle = 'rgba(120,105,85,0.35)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, h - 1);
    return c;
  }
  // THE GENERATED WATERFALL: the same two faces, the same tilt of her head as the last frame of the strip. Golden, soft, even:
  // the light falls on both faces from the same side in exactly the same way; skin smooth; the water white without a texture.
  function waterfallImage(w, h, o) {
    o = o || {}; const c = OTM.makeCanvas(w, h), g = c.getContext('2d');
    const bg = OTM.makeCanvas(w, h), b = bg.getContext('2d');
    // sky, low gold
    b.fillStyle = lg(b, 0, 0, 0, h * 0.5, [[0, '#F7E9CD'], [1, '#EBD7B2']]); b.fillRect(0, 0, w, h);
    // a cliff of dark wet rock and moss across the whole image, the falls coming over its lip in white ribbons
    b.fillStyle = '#2D3A30'; b.fill(smooth([[-10, h * 0.06, 1], [w * 0.2, h * 0.04], [w * 0.5, h * 0.07], [w * 0.8, h * 0.03], [w + 10, h * 0.06, 1], [w + 10, h * 0.62, 1], [-10, h * 0.62, 1]]));
    const R = OTM.rng('rocks');
    for (let i = 0; i < 26; i++) { const x = R() * w, y = h * (0.06 + R() * 0.52), r = w * (0.05 + R() * 0.08); b.fillStyle = R() < 0.5 ? '#3E5A40' : '#24302A'; b.beginPath(); b.ellipse(x, y, r, r * 0.55, R() * 0.6 - 0.3, 0, 7); b.fill(); }
    b.fillStyle = 'rgba(214,190,120,0.35)'; for (let i = 0; i < 14; i++) { const x = R() * w * 0.5, y = h * (0.08 + R() * 0.45); b.beginPath(); b.ellipse(x, y, w * 0.04, w * 0.015, -0.2, 0, 7); b.fill(); }   // moss in the sun
    // the water: one wide fall, a curtain of white streaks with ragged edges, brightest down its middle, broken by two rocks
    { const top = h * 0.05, foot = h * 0.47, cx0 = w * 0.5;
      const half = y => w * (0.2 + 0.1 * (y - top) / (foot - top));
      for (let i = 0; i < 260; i++) {
        const u = (i / 259) * 2 - 1, wob = (OTM.vnoise(i * 0.31, 3, 11) - 0.5) * 0.12;
        const x0 = cx0 + (u + wob) * half(top) * (0.85 + 0.15 * OTM.vnoise(i * 0.7, 1, 4)), x1 = cx0 + (u + wob) * half(foot) * (1.0 + 0.1 * OTM.vnoise(i * 0.5, 7, 4));
        const y0 = top + h * 0.02 * OTM.vnoise(i * 0.9, 2, 5), y1 = foot - h * 0.03 * OTM.vnoise(i * 1.3, 5, 6);
        const edge = 1 - Math.pow(Math.abs(u), 3);
        b.strokeStyle = `rgba(255,255,255,${(0.35 + 0.65 * OTM.vnoise(i * 2.1, 9, 8)) * edge})`; b.lineWidth = w * 0.006 + w * 0.006 * OTM.vnoise(i * 1.7, 4, 3);
        b.beginPath(); b.moveTo(x0, y0); b.bezierCurveTo(x0, y0 + (y1 - y0) * 0.4, x1, y1 - (y1 - y0) * 0.4, x1, y1); b.stroke();
      }
      b.fillStyle = 'rgba(255,255,255,0.55)'; b.fill(smooth([[cx0 - half(top) * 0.5, top], [cx0 + half(top) * 0.5, top], [cx0 + half(foot) * 0.55, foot], [cx0 - half(foot) * 0.55, foot]]));
      // dark rocks the water parts round: broken, uneven shapes at different heights, so they never pair up into a face
      const RK = OTM.rng('wf-rocks');
      [[0.27, 0.4, 0.07, 0.5], [0.71, 0.13, 0.035, 0.8], [0.58, 0.47, 0.03, 0.45]].forEach(([x, y, r, sq]) => { const pts = []; for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; const rr = w * r * (0.7 + 0.5 * RK()); pts.push([w * x + Math.cos(a) * rr * 1.3, h * y + Math.sin(a) * rr * sq]); }
        b.fillStyle = '#27332B'; b.beginPath(); pts.forEach((p, i) => i ? b.lineTo(p[0], p[1]) : b.moveTo(p[0], p[1])); b.closePath(); b.fill();
        b.fillStyle = 'rgba(255,255,255,0.75)'; b.beginPath(); b.ellipse(w * x, h * y + w * r * sq * 0.8, w * r * 1.5, w * r * 0.22, 0, 0, Math.PI); b.fill(); });
    }
    // spray at the foot, rising into the light
    b.fillStyle = rg(b, w * 0.5, h * 0.52, 4, w * 0.75, [[0, '#FFFFFF', 0.95], [0.55, '#FFFFFF', 0.6], [1, '#FFFFFF', 0]]); b.fillRect(0, 0, w, h);
    b.fillStyle = lg(b, 0, 0, w, 0, [[0, '#FFC77A', 0.3], [0.55, '#FFC77A', 0.06], [1, '#FFC77A', 0]]); b.fillRect(0, 0, w, h);
    g.save(); g.filter = `blur(${Math.max(1.5, w * 0.006)}px)`; g.drawImage(bg, 0, 0); g.restore();   // a little portrait-mode softness
    // the couple, close, cheek to cheek, filling the lower half: her long hair, her head tipped against his
    const sH = w * 0.4;
    const cp = couple({ s: sH, cx: w * 0.5, cy: h * 0.66, tilt: 1, smooth: true, expr: { hisYaw: -0.12, herYaw: 0.14 }, herTop: '#9A5A3E', hisTop: '#232C3F' });
    // one golden key from the left, the same on both faces; soft and even
    const key = [{ type: 'dir', d: [-0.62, -0.3, 0.72], col: [1.65, 1.3, 0.9], steps: [[0.08, 0.5], [0.42, 0.82], [0.75, 1.0]], soft: 0.12, shadow: false, spec: 16, wrap: 0.3 },
      { type: 'amb', up: [0.24, 0.21, 0.18], down: [0.13, 0.11, 0.09] }];
    const Rt = trace([cp.him, cp.her], key, { specMat: { skin: 0.1, lipL: 0.22 } });
    Rt.draw(g);
    features(g, Rt, cp.him, 'him', { eyes: 0.7, mouth: 'smile', lw: 1.2, catchOff: [-0.35, -0.3] });
    features(g, Rt, cp.her, 'her', { eyes: 0.22, mouth: 'smile', lw: 1.2, catchOff: [-0.35, -0.3] });
    // the polish: a soft bloom, a warm lift
    g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = lg(g, 0, 0, w, h, [[0, '#FFC27A', 0.35], [1, '#FFB070', 0.15]]); g.fillRect(0, 0, w, h); g.restore();
    return c;
  }

  G.LA = { P, CAST, couple, boothStrip, waterfallImage, clamp, lerp, mix, rgba, layer, blurred, lg, rg, stops, pathPts, smooth, rrect, rquad, fill, soft, pool, steps, beam, quadImage, quadAt, homography, hmap, camera, caption,
    L3, l2s, hexL, scale3, rot3, mul3, app3, basis, Obj, space, lookAt, pool3, cloth, drawCloth, dome, limb, ell, cap, trace, quant, STEPS, head, hairHim, hairHer, hand, bust, albedoFor, features, FEAT, FACE, theta };
})(window);
