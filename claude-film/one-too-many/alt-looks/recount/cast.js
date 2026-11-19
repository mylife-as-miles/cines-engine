/* RECOUNT - cast rig v2: organic tapered limbs (swept outlines, not capsule chains), form-lit paper pieces,
   and the high-detail hand rig from the pitch (palm polygon + 5 fingers x 3 phalanges, tapered round-capped,
   layered: form light, occlusion, knuckle creases, nails with a specular, rim). Deterministic. */
(function (G) {
  'use strict';
  const { P, rgba, mix, clamp, lerp, lin, rad, paper, rim, polyPath } = RC;

  // Catmull-Rom over [x,y,r] triples
  function smooth3(pts, steps) {
    steps = steps || 6; const n = pts.length, out = [];
    if (n < 2) return pts.slice();
    const get = i => pts[clamp(i, 0, n - 1)];
    for (let i = 0; i < n - 1; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      for (let k = 0; k < steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t; const o = [];
        for (let j = 0; j < 3; j++) o.push(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3));
        out.push(o);
      }
    }
    out.push(pts[n - 1].slice());
    return out;
  }
  // swept tapered tube with round caps -> {path, L, R, mid}
  function sweep(pts, o) {
    o = o || {}; const sm = smooth3(pts, o.steps || 6), n = sm.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = sm[Math.max(0, i - 1)], b = sm[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const nx = -ty, ny = tx, r = sm[i][2]; L.push([sm[i][0] + nx * r, sm[i][1] + ny * r]); R.push([sm[i][0] - nx * r, sm[i][1] - ny * r]);
    }
    const p = new Path2D(); p.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) p.lineTo(L[i][0], L[i][1]);
    // end cap
    const e = sm[n - 1], ea = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]);
    if (o.capEnd !== false) p.arc(e[0], e[1], e[2], ea, ea - Math.PI, true); else p.lineTo(R[n - 1][0], R[n - 1][1]);
    for (let i = n - 1; i >= 0; i--) p.lineTo(R[i][0], R[i][1]);
    const s = sm[0], sa = Math.atan2(R[0][1] - s[1], R[0][0] - s[0]);
    if (o.capStart !== false) p.arc(s[0], s[1], s[2], sa, sa - Math.PI, true);
    p.closePath(); return { path: p, L, R, mid: sm };
  }
  // closed smooth outline from points -> Path2D
  function blobPath(pts, steps) { return polyPath(RC.smooth(pts, true, steps || 8), true); }

  // light helpers: a light is {x,y} (point, screen) or {dx,dy} (direction toward light)
  function dirTo(light, x, y) { if (light.dx != null) { const l = Math.hypot(light.dx, light.dy) || 1; return [light.dx / l, light.dy / l]; } const dx = light.x - x, dy = light.y - y, l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }

  // FORM-LIT PIECE. base = shadow-side colour; lit = lit colour; band = width of the lit side (px); soft = blur
  // o.cx,o.cy reference point for the light direction; o.rimC rim colour; o.rimW; o.rimA; o.shadow; o.ao occlusion line alpha;
  // o.bounce {color, a, w} reflected light on the side away from the key; o.shade extra fn
  function form(g, path, o) {
    const [ux, uy] = dirTo(o.light, o.cx, o.cy); const band = o.band || 10;
    paper(g, path, o.base, {
      shadow: o.shadow || null,
      shade: (h) => {
        if (o.pre) o.pre(h);
        if (o.lit && (o.litA == null || o.litA > 0)) rim(h, path, { dx: ux, dy: uy, w: band, color: o.lit, alpha: o.litA == null ? 1 : o.litA, blur: o.soft == null ? band * 0.55 : o.soft, mode: 'source-over' });
        if (o.lit2) rim(h, path, { dx: ux, dy: uy, w: band * 0.45, color: o.lit2, alpha: o.lit2A == null ? 0.8 : o.lit2A, blur: (o.soft == null ? band * 0.55 : o.soft) * 0.6, mode: 'screen' });
        if (o.bounce) rim(h, path, { dx: -ux, dy: -uy, w: o.bounce.w || band * 0.5, color: o.bounce.color, alpha: o.bounce.a == null ? 0.3 : o.bounce.a, blur: (o.bounce.w || band * 0.5) * 0.7, mode: 'screen' });
        if (o.shade) o.shade(h);
      },
    });
    if (o.rimC) rim(g, path, { dx: ux, dy: uy, w: o.rimW || 1.6, color: o.rimC, alpha: o.rimA == null ? 0.9 : o.rimA, blur: o.rimBlur == null ? 0.4 : o.rimBlur });
    if (o.ao) { g.save(); g.strokeStyle = rgba(o.aoColor || '#0A0605', o.ao); g.lineWidth = o.aoW || 1; g.stroke(path); g.restore(); }
  }

  // ---------------- THE HAND RIG ----------------
  // local: wrist (0,0), +x toward the fingers, +y toward the pinky side (side=+1); unit = hand length (wrist -> middle tip)
  const MCP = [[0.47, -0.155], [0.505, -0.052], [0.485, 0.048], [0.44, 0.14]];
  const SEG = [[0.22, 0.13, 0.10], [0.25, 0.15, 0.105], [0.23, 0.14, 0.10], [0.18, 0.105, 0.09]];
  const RAD = [[0.052, 0.046, 0.041, 0.033], [0.054, 0.048, 0.043, 0.034], [0.051, 0.045, 0.04, 0.032], [0.044, 0.04, 0.035, 0.028]];
  const SPLAY = [-0.1, -0.03, 0.04, 0.12];
  const PALM = [[0.0, -0.13], [0.1, -0.19], [0.26, -0.215], [0.46, -0.205], [0.52, -0.1], [0.53, 0.0], [0.51, 0.095], [0.455, 0.19], [0.3, 0.205], [0.12, 0.175], [0.0, 0.13]];
  // poses: per finger {b:[3 bends], f:[3 foreshortening], s: splay add}, thumb {a, b:[2], f:[2], l}
  const POSES = {
    flat: { F: [{ b: [0.02, 0.03, 0.02] }, { b: [0, 0.03, 0.02] }, { b: [-0.01, 0.03, 0.02] }, { b: [-0.03, 0.04, 0.03] }], T: { a: -0.62, b: [0.32, 0.18], f: [1, 1] } },
    relaxed: { F: [{ b: [0.12, 0.25, 0.15], f: [0.95, 0.85, 0.8] }, { b: [0.14, 0.3, 0.2], f: [0.95, 0.8, 0.75] }, { b: [0.18, 0.35, 0.22], f: [0.92, 0.78, 0.72] }, { b: [0.24, 0.4, 0.25], f: [0.9, 0.75, 0.7] }], T: { a: -0.55, b: [0.35, 0.25], f: [0.95, 0.9] } },
    // fingers curl DOWN over something (back of the hand seen from the front-above), tips pointing down
    drape: { F: [{ b: [0.25, 0.85, 0.6], f: [0.95, 0.8, 0.62] }, { b: [0.25, 0.9, 0.65], f: [0.95, 0.8, 0.6] }, { b: [0.3, 0.95, 0.65], f: [0.92, 0.78, 0.58] }, { b: [0.38, 1.0, 0.65], f: [0.9, 0.75, 0.56] }], T: { a: 0.35, b: [0.55, 0.45], f: [0.9, 0.85] } },
    grip: { F: [{ b: [0.5, 1.2, 0.8], f: [0.85, 0.6, 0.5] }, { b: [0.5, 1.25, 0.8], f: [0.85, 0.6, 0.5] }, { b: [0.55, 1.25, 0.8], f: [0.82, 0.58, 0.48] }, { b: [0.6, 1.25, 0.8], f: [0.8, 0.55, 0.45] }], T: { a: -0.2, b: [0.6, 0.5], f: [0.9, 0.8] } },
    phone: { F: [{ b: [-0.15, 0.35, 0.2], f: [0.98, 0.9, 0.85] }, { b: [-0.1, 0.4, 0.22], f: [0.98, 0.88, 0.82] }, { b: [-0.05, 0.45, 0.25], f: [0.96, 0.85, 0.8] }, { b: [0.05, 0.5, 0.3], f: [0.94, 0.82, 0.75] }], T: { a: -0.9, b: [0.25, 0.3], f: [0.8, 0.8] } },
  };

  function handGeom(o) {
    const s = o.s, a = o.a || 0, side = o.side || 1, c = Math.cos(a), sn = Math.sin(a);
    const T = (x, y) => [o.x + s * (x * c - y * side * sn), o.y + s * (x * sn + y * side * c)];
    const pose = typeof o.pose === 'string' ? POSES[o.pose] : (o.pose || POSES.relaxed);
    const fingers = [];
    for (let i = 0; i < 4; i++) {
      const fp = Object.assign({ b: [0, 0, 0], f: [1, 1, 1], s: 0 }, pose.F[i] || {}, (o.fingers && o.fingers[i]) || {});
      const f = fp.f || [1, 1, 1];
      let ang = SPLAY[i] * (o.spread == null ? 1 : o.spread) + (fp.s || 0); let p = MCP[i].slice(); const chain = [[p[0], p[1], RAD[i][0]]];
      for (let k = 0; k < 3; k++) { ang += fp.b[k]; const L = SEG[i][k] * f[k]; p = [p[0] + Math.cos(ang) * L, p[1] + Math.sin(ang) * L]; chain.push([p[0], p[1], RAD[i][k + 1]]); }
      fingers.push({ i, chain, ang, fore: f });
    }
    const tp = Object.assign({ a: -0.8, b: [0.25, 0.2], f: [1, 1], l: 1 }, pose.T || {}, o.thumb || {});
    let ta = tp.a; let q = [0.07, -0.12]; const tch = [[q[0], q[1], 0.075]];
    const TL = [0.2, 0.15, 0.12].map(v => v * (tp.l || 1)), TR = [0.062, 0.055, 0.047];
    q = [q[0] + Math.cos(ta) * TL[0], q[1] + Math.sin(ta) * TL[0]]; tch.push([q[0], q[1], TR[0]]);
    for (let k = 0; k < 2; k++) { ta += tp.b[k]; const L = TL[k + 1] * (tp.f[k] == null ? 1 : tp.f[k]); q = [q[0] + Math.cos(ta) * L, q[1] + Math.sin(ta) * L]; tch.push([q[0], q[1], TR[k + 1] * 0.95]); }
    const toW = ch => ch.map(p => { const w = T(p[0], p[1]); return [w[0], w[1], p[2] * s]; });
    fingers.forEach(f => { f.w = toW(f.chain); });
    return { T, s, a, side, fingers, thumb: { chain: tch, w: toW(tch), ang: ta }, palm: PALM.map(p => T(p[0], p[1])) };
  }

  // o: x,y,s,a,side, pose, fingers, thumb, view 'back'|'palm', skin, light {x,y}|{dx,dy}, keyColor, k (0..1 light amount), amb (ambient darkness 0..1)
  //    under {color,k}, rimC, nails (colour or false), rings [idx], soot 0..1, seed, hide [5 bools: index..pinky, thumb], thumbFirst, order
  //    shadow {dx,dy,blur,alpha}, cuff fn
  function hand(g, o) {
    const geo = handGeom(o), s = o.s, k = o.k == null ? 1 : o.k, skin = o.skin;
    const base = mix(skin, P.umber, o.amb == null ? 0.62 : o.amb);
    const lit = mix(mix(skin, o.keyColor || P.tungsten, 0.26), '#FFFFFF', 0.06);
    const litK = mix(base, lit, clamp(k, 0, 1));
    const light = o.light || { dx: 0, dy: -1 };
    const hide = o.hide || [];
    const C = geo.T(0.35, 0);
    const piece = (path, cx, cy, band, extra) => form(g, path, Object.assign({
      light, cx, cy, base, lit: litK, band: band, soft: band * 0.7, lit2: k > 0.25 ? mix(litK, '#FFF3E0', 0.25) : null, lit2A: 0.35 * k,
      bounce: o.under ? { color: o.under.color, a: 0.35 * o.under.k, w: band * 0.6 } : null,
      rimC: o.rimC === false ? null : (o.rimC || mix(lit, '#FFF0D8', 0.4)), rimW: Math.max(1, s * 0.012), rimA: 0.75 * k + 0.1,
      ao: 0.35, aoW: Math.max(0.7, s * 0.007),
      shade: (h) => {
        if (o.soot) { const r = OTM.rng((o.seed || 'hs') + cx); h.save(); h.globalCompositeOperation = 'multiply'; for (let i = 0; i < 7; i++) { const x = cx + (r() - 0.5) * s * 0.4, y = cy + (r() - 0.5) * s * 0.3, rr = s * (0.04 + r() * 0.08); h.fillStyle = rad(h, x, y, 0, rr, [[0, '#2A2420', 0.6 * o.soot], [1, '#2A2420', 0]]); h.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); } h.restore(); }
        if (o.fillLight) o.fillLight(h);
        if (extra) extra(h);
      },
    }, o.formOpts || {}));
    const fingerShadow = { dx: -dirTo(light, C[0], C[1])[0] * s * 0.025, dy: -dirTo(light, C[0], C[1])[1] * s * 0.025 + s * 0.01, blur: s * 0.04, alpha: 0.45, color: '#0A0604' };
    const drawThumb = () => { if (hide[4]) return; const t = geo.thumb.w; const sw = sweep(t); piece(sw.path, t[2][0], t[2][1], s * 0.05, (h) => nailOn(h, t, 0.062)); };
    const nailOn = (h, ch, rr) => {
      if (o.nails === false || o.view === 'palm') return; const n = ch.length, a = ch[n - 2], b = ch[n - 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < s * 0.04) return;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), nx = lerp(a[0], b[0], 0.62), ny = lerp(a[1], b[1], 0.62);
      h.save(); h.translate(nx, ny); h.rotate(ang); const nl = Math.min(L * 0.5, s * 0.06), nw = b[2] * 0.72;
      h.fillStyle = o.nails ? o.nails : rgba(mix(skin, '#F4E4D8', 0.45), 0.55); h.beginPath(); h.ellipse(0, 0, nl, nw, 0, 0, Math.PI * 2); h.fill();
      h.fillStyle = rgba('#FFFFFF', 0.25 + 0.4 * k); h.beginPath(); h.ellipse(-nl * 0.15, -nw * 0.35, nl * 0.45, nw * 0.18, 0, 0, Math.PI * 2); h.fill(); h.restore();
    };
    if (o.thumbFirst && !o.tipsOnly) drawThumb();
    // palm / back of hand
    const palmP = blobPath(geo.palm, 6);
    if (!o.tipsOnly) piece(palmP, C[0], C[1], s * 0.11, (h) => {
      if (o.view !== 'palm') { // tendons + knuckle bumps on the back of the hand
        h.save(); h.globalCompositeOperation = 'screen'; geo.fingers.forEach((f, i) => { if (hide[i]) return; const a = geo.T(0.08, MCP[i][1] * 0.4), b = f.w[0]; h.strokeStyle = rgba(litK, 0.1 * k); h.lineWidth = s * 0.016; h.beginPath(); h.moveTo(a[0], a[1]); h.lineTo(b[0], b[1]); h.stroke();
          h.fillStyle = rad(h, b[0], b[1], 0, s * 0.06, [[0, mix(litK, '#FFFFFF', 0.2), 0.5 * k], [1, litK, 0]]); h.fillRect(b[0] - s * 0.07, b[1] - s * 0.07, s * 0.14, s * 0.14); }); h.restore();
      } else { h.save(); h.strokeStyle = rgba(P.umber, 0.35); h.lineWidth = s * 0.008; const a = geo.T(0.15, -0.12), b = geo.T(0.3, 0.05), c = geo.T(0.45, 0.12); h.beginPath(); h.moveTo(a[0], a[1]); h.quadraticCurveTo(b[0], b[1], c[0], c[1]); h.stroke(); h.restore(); }
    });
    // fingers, back to front
    const order = o.order || [3, 2, 1, 0];
    order.forEach(i => {
      if (hide[i]) return; const f = geo.fingers[i], ch = f.w; const ext = o.tipsOnly ? [[lerp(ch[1][0], ch[2][0], 0.35), lerp(ch[1][1], ch[2][1], 0.35), ch[2][2]], ch[2], ch[3]] : [[lerp(ch[0][0], ch[1][0], -0.35), lerp(ch[0][1], ch[1][1], -0.35), ch[0][2]]].concat(ch);
      const sw = sweep(ext);
      form(g, sw.path, { light, cx: ch[2][0], cy: ch[2][1], base, lit: litK, band: ch[1][2] * 1.05, soft: ch[1][2] * 0.7, lit2: k > 0.25 ? mix(litK, '#FFF3E0', 0.25) : null, lit2A: 0.3 * k,
        bounce: o.under ? { color: o.under.color, a: 0.3 * o.under.k, w: ch[1][2] * 0.6 } : null, shadow: fingerShadow,
        rimC: o.rimC === false ? null : (o.rimC || mix(lit, '#FFF0D8', 0.4)), rimW: Math.max(1, s * 0.011), rimA: 0.7 * k + 0.1, ao: 0.38, aoW: Math.max(0.7, s * 0.007),
        shade: (h) => {
          // knuckle creases at PIP and DIP (back of the hand)
          if (o.view !== 'palm') [1, 2].forEach(j => { const p = ch[j], q = ch[j + 1], an = Math.atan2(q[1] - p[1], q[0] - p[0]), r = p[2]; h.save(); h.translate(p[0], p[1]); h.rotate(an); h.strokeStyle = rgba(P.umber, 0.26); h.lineWidth = Math.max(0.6, s * 0.0055); h.filter = 'blur(0.4px)';
            for (let m = 0; m <= 1; m++) { h.beginPath(); h.moveTo(m * r * 0.22 - r * 0.05, -r * 0.42); h.quadraticCurveTo(m * r * 0.22 + r * 0.1, 0, m * r * 0.22 - r * 0.05, r * 0.42); h.stroke(); } h.restore(); });
          if (o.soot) { const r = OTM.rng((o.seed || 'fs') + i); h.save(); h.globalCompositeOperation = 'multiply'; for (let m = 0; m < 3; m++) { const p = ch[1 + Math.floor(r() * 3)], rr = s * (0.03 + r() * 0.04); h.fillStyle = rad(h, p[0], p[1], 0, rr, [[0, '#2A2420', 0.6 * o.soot], [1, '#2A2420', 0]]); h.fillRect(p[0] - rr, p[1] - rr, 2 * rr, 2 * rr); } h.restore(); }
          if (o.fillLight) o.fillLight(h);
          nailOn(h, ch, RAD[i][3]);
        } });
      if (o.rings && o.rings.includes(i)) ring(g, ch, s, k, o);
    });
    if (!o.thumbFirst && !o.tipsOnly && !o.noThumb) drawThumb();
    if (o.after) o.after(g, geo);
    return geo;
  }
  // Marina's rings: a band across the proximal phalanx, hot highlight
  function ring(g, ch, s, k, o) {
    const a = ch[0], b = ch[1], x = lerp(a[0], b[0], 0.55), y = lerp(a[1], b[1], 0.55), r = lerp(a[2], b[2], 0.55), an = Math.atan2(b[1] - a[1], b[0] - a[0]);
    g.save(); g.translate(x, y); g.rotate(an);
    g.fillStyle = lin(g, 0, -r * 1.1, 0, r * 1.1, [[0, '#F4F6F8'], [0.35, '#9AA2AA'], [0.7, '#4A5058'], [1, '#2A2E34']]);
    g.beginPath(); g.ellipse(0, 0, Math.max(1.4, s * 0.016), r * 1.12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFFFFF'; g.shadowColor = '#FFF4DC'; g.shadowBlur = 6 + 6 * k; g.beginPath(); g.arc(0, -r * 0.7, Math.max(1.2, s * 0.012), 0, Math.PI * 2); g.fill(); g.restore();
  }

  // a sleeve / limb piece in cloth, form-lit, with optional fold strokes
  function cloth(g, pts, o) {
    const sw = sweep(pts, { capStart: o.capStart, capEnd: o.capEnd });
    form(g, sw.path, Object.assign({ cx: pts[Math.floor(pts.length / 2)][0], cy: pts[Math.floor(pts.length / 2)][1] }, o, {
      shade: (h) => { if (o.folds) folds(h, sw, o.folds); if (o.shade) o.shade(h, sw); },
    }));
    return sw;
  }
  // soft fold creases along a swept piece: o = {n, a, seed, color, lit}
  function folds(h, sw, f) {
    const r = OTM.rng(f.seed || 'folds'), mid = sw.mid, n = mid.length;
    h.save(); h.lineCap = 'round';
    for (let i = 0; i < (f.n || 4); i++) {
      const u = 0.15 + r() * 0.7, j = Math.floor(u * (n - 1)), p = mid[j], q = mid[Math.min(n - 1, j + 1)];
      const an = Math.atan2(q[1] - p[1], q[0] - p[0]) + Math.PI / 2 + (r() - 0.5) * 0.9, L = p[2] * (0.9 + r() * 0.8), off = (r() - 0.5) * p[2] * 0.6;
      const x0 = p[0] + Math.cos(an) * (-L * 0.5 + off), y0 = p[1] + Math.sin(an) * (-L * 0.5 + off), x1 = p[0] + Math.cos(an) * (L * 0.5 + off), y1 = p[1] + Math.sin(an) * (L * 0.5 + off);
      h.filter = `blur(${Math.max(1, p[2] * 0.08)}px)`;
      h.strokeStyle = rgba(f.color || '#000000', f.a || 0.35); h.lineWidth = Math.max(1.5, p[2] * 0.14); h.beginPath(); h.moveTo(x0, y0); h.quadraticCurveTo((x0 + x1) / 2 + (r() - 0.5) * L * 0.4, (y0 + y1) / 2 + (r() - 0.5) * L * 0.4, x1, y1); h.stroke();
      if (f.lit) { h.strokeStyle = rgba(f.lit, f.litA || 0.18); h.lineWidth = Math.max(1, p[2] * 0.08); h.beginPath(); h.moveTo(x0 - 2, y0 - 2); h.quadraticCurveTo((x0 + x1) / 2 - 2, (y0 + y1) / 2 - 2, x1 - 2, y1 - 2); h.stroke(); }
    }
    h.restore();
  }

  // TWO HANDS HELD, seen side-on (the iconic grip): FRONT hand shows its back + knuckles, fingers running toward the other
  // wrist and turning away round its edge; the BACK hand sits behind, its thumb laid across the front hand's knuckles and
  // its fingertips curling up under the front hand's lower edge. o.c centre, o.s hand length, o.dir = front hand's finger direction.
  function clasp(g, o) {
    const c = Math.cos(o.dir), sn = Math.sin(o.dir); let px = -sn, py = c; if (py < 0) { px = -px; py = -py; }
    const Pt = (u, v) => [o.c[0] + o.s * (u * c + v * px), o.c[1] + o.s * (u * sn + v * py)];
    // side so that the rig's local +y (pinky side) maps to screen-down for both hands
    const sideF = c >= 0 ? 1 : -1, sideB = -sideF;
    const base = { light: o.light, under: o.under };
    const wf = Pt(-0.5 + (o.fu || 0), 0.02 + (o.fv || 0)), wb = Pt(0.6 + (o.bu || 0), -0.03 + (o.bv || 0));
    const frontPose = { F: [{ b: [0.06, 0.22, 0.3], f: [0.86, 0.6, 0.36] }, { b: [0.1, 0.26, 0.32], f: [0.86, 0.58, 0.34] }, { b: [0.14, 0.3, 0.34], f: [0.84, 0.56, 0.34] }, { b: [0.2, 0.34, 0.36], f: [0.8, 0.54, 0.32] }], T: { a: -0.5, b: [0.2, 0.2], f: [0.8, 0.8] } };
    const backPose = { F: [{ b: [0.0, -0.1, -0.2], f: [1, 0.9, 0.7] }, { b: [0.02, -0.15, -0.3], f: [1, 0.9, 0.7] }, { b: [0.04, -0.45, -0.7], f: [1, 0.85, 0.7] }, { b: [0.06, -0.6, -0.8], f: [1, 0.85, 0.7] }], T: { a: 0.02, b: [0.08, 0.1], f: [1, 0.95], l: 1.08 } };
    if (o.backArm) o.backArm(wb);
    const B = Object.assign({}, base, { x: wb[0], y: wb[1], s: o.s * (o.bScale || 0.97), a: o.dir + Math.PI + (o.bTilt || 0), side: sideB, pose: backPose, view: 'palm', noThumb: true, nails: false }, o.back);
    hand(g, B);
    if (o.frontArm) o.frontArm(wf);
    hand(g, Object.assign({}, base, { x: wf[0], y: wf[1], s: o.s, a: o.dir + (o.fTilt || 0), side: sideF, pose: frontPose, view: 'back', noThumb: true, order: [0, 1, 2, 3] }, o.front));
    // the back hand's ring + little fingertips curl up under the front hand's lower edge, its thumb lies across the knuckles
    hand(g, Object.assign({}, B, { tipsOnly: true, hide: [true, true, false, false, true], nails: o.back && o.back.nails != null ? o.back.nails : null, view: 'back' }));
    const th = handGeom(B).thumb.w; const thumbP = sweep(th).path;
    const [ux, uy] = dirTo(o.light, th[2][0], th[2][1]); const k = (o.back && o.back.k != null) ? o.back.k : 1, skin = B.skin;
    const tb = mix(skin, P.umber, 0.62), tl = mix(tb, mix(mix(skin, P.tungsten, 0.26), '#FFFFFF', 0.06), clamp(k, 0, 1));
    const thumbFn = () => form(g, thumbP, { light: o.light, cx: th[2][0], cy: th[2][1], base: tb, lit: tl, band: o.s * 0.05, soft: o.s * 0.035, shadow: { dx: -ux * o.s * 0.02, dy: o.s * 0.02, blur: o.s * 0.04, alpha: 0.55, color: '#0A0604' },
      rimC: mix(tl, '#FFF0D8', 0.4), rimW: Math.max(1, o.s * 0.011), rimA: 0.7 * k + 0.1, ao: 0.38, aoW: Math.max(0.7, o.s * 0.007),
      shade: (h) => { const n = th.length, a2 = th[n - 2], b2 = th[n - 1], an = Math.atan2(b2[1] - a2[1], b2[0] - a2[0]); h.save(); h.translate(lerp(a2[0], b2[0], 0.6), lerp(a2[1], b2[1], 0.6)); h.rotate(an); const nw = b2[2] * 0.7, nl = o.s * 0.055;
        h.fillStyle = (o.back && o.back.nails) || rgba(mix(skin, '#F4E4D8', 0.45), 0.55); h.beginPath(); h.ellipse(0, -nw * 0.15, nl, nw, 0, 0, Math.PI * 2); h.fill(); h.fillStyle = rgba('#FFFFFF', 0.25 + 0.4 * k); h.beginPath(); h.ellipse(-nl * 0.1, -nw * 0.5, nl * 0.45, nw * 0.18, 0, 0, Math.PI * 2); h.fill(); h.restore(); } });
    if (o.thumbOver !== false) thumbFn();
    return { Pt, wf, wb };
  }

  G.CAST = { clasp, smooth3, sweep, blobPath, dirTo, form, hand, handGeom, POSES, ring, cloth, folds };
})(window);
