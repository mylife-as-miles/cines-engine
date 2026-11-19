/* LOOK C type: every voice is a physical object in the theatre — tissue strips, card plates, playing cards, a cold phone
   rectangle — except the VOICE, which is letters punched through the paper. */
(function (global) {
  'use strict';
  const O = global.OTM, R = global.ROD; const { W, H, rng, vnoise, clamp, lerp } = O; const P = R.P;

  function fontStr(o) { return `${o.style || 'normal'} ${o.weight || 400} ${o.size}px "${o.family}"`; }
  function measure(g, str, o) { g.save(); g.font = fontStr(o); g.letterSpacing = (o.tracking || 0) + 'px'; if (o.stretch) g.fontStretch = o.stretch; const m = g.measureText(str); g.restore(); return m.width; }
  // deckled / torn edge polygon for a strip [x0,y0]-[x1,y1] with rough left/right ends
  function stripPoly(x0, y0, x1, y1, o) {
    o = o || {}; const r = rng(o.seed || 'strip'); const pts = [];
    const dk = o.deckle || 3, tear = o.tear || 0;
    for (let x = x0; x <= x1; x += 10) pts.push([x, y0 + (vnoise(x * 0.08, 1, 3) - 0.5) * 2.5]);
    // right end: torn (big jagged) or deckled
    for (let y = y0; y <= y1; y += tear ? 5 : 6) pts.push([x1 + (tear ? (r() - 0.3) * tear : (vnoise(y * 0.2, 5, 1) - 0.5) * dk * 2), y]);
    for (let x = x1; x >= x0; x -= 10) pts.push([x, y1 + (vnoise(x * 0.08, 9, 3) - 0.5) * 2.5]);
    for (let y = y1; y >= y0; y -= 6) pts.push([x0 + (o.tearL ? (r() - 0.7) * o.tearL : (vnoise(y * 0.2, 7, 2) - 0.5) * dk * 2), y]);
    return pts;
  }
  function polyPath(pts) { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(q => p.lineTo(q[0], q[1])); p.closePath(); return p; }
  function paperTex(g, path, alpha, seed) {
    g.save(); g.clip(path); g.globalCompositeOperation = 'multiply'; g.globalAlpha = alpha; g.drawImage(R.fibreTex(), (seed || 0) % 300, 0); g.restore();
  }

  // ---------------- DISPATCHER: cold light in a rectangle ----------------
  function dispatcher(st, text, x, y, o) {
    o = Object.assign({ size: 40, cursor: true }, o); const g = st.ctx;
    const F = { family: 'IBM Plex Mono', weight: 400, size: o.size }; const tw = measure(g, text, F);
    const padX = o.size * 0.55, padY = o.size * 0.42; const cw = o.size * 0.58;
    const bw = tw + padX * 2 + (o.cursor ? cw + o.size * 0.25 : 0), bh = o.size * 1.05 + padY * 2;
    // the cold rectangle of light it throws on the scrim
    g.save(); g.globalCompositeOperation = 'screen'; g.filter = 'blur(26px)'; g.fillStyle = 'rgba(160,200,230,0.28)'; g.fillRect(x - 18, y - 18, bw + 36, bh + 36); g.restore();
    g.save(); g.fillStyle = R.rgba(P.dispBg, 0.86); g.beginPath(); g.roundRect(x, y, bw, bh, 2); g.fill();
    // scanlines
    g.beginPath(); g.roundRect(x, y, bw, bh, 2); g.clip(); g.fillStyle = 'rgba(207,227,242,0.06)'; for (let yy = y; yy < y + bh; yy += 3) g.fillRect(x, yy, bw, 1);
    g.restore();
    g.save(); g.strokeStyle = 'rgba(207,227,242,0.22)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1); g.restore();
    const by = y + padY + o.size * 0.82;
    g.save(); g.font = fontStr(F); g.fillStyle = P.phone; g.textBaseline = 'alphabetic'; g.shadowColor = 'rgba(207,227,242,0.55)'; g.shadowBlur = 10; g.fillText(text, x + padX, by); g.restore();
    if (o.cursor) { g.save(); g.fillStyle = P.phone; g.fillRect(x + padX + tw + o.size * 0.22, by - o.size * 0.78, cw, o.size * 0.92); g.restore(); }
    st.em.save(); st.em.globalAlpha = 0.35; st.em.fillStyle = P.phone; st.em.fillRect(x + padX, by - o.size * 0.75, tw + cw + o.size * 0.3, o.size * 0.9); st.em.restore();
    return { w: bw, h: bh };
  }


  // ---------------- DISPATCHER (projected): a soft rectangle of cold PHONE_GLOW light thrown on the scrim beside his head ----------------
  function dispatcherLight(st, text, x, y, o) {
    o = Object.assign({ size: 56, cursor: true }, o); const g = st.ctx;
    const F = { family: 'IBM Plex Mono', weight: 400, size: o.size }; const tw = measure(g, text, F);
    const padX = o.size * 0.62, padY = o.size * 0.5, cw = o.size * 0.56;
    const bw = tw + padX * 2 + (o.cursor ? cw + o.size * 0.3 : 0), bh = o.size * 1.0 + padY * 2;
    // wide cold spill on the warm paper
    g.save(); g.globalCompositeOperation = 'screen'; g.filter = 'blur(38px)'; g.fillStyle = 'rgba(150,190,225,0.30)'; g.fillRect(x - 40, y - 34, bw + 80, bh + 68); g.restore();
    // the projected rectangle: soft-edged, brightest in the middle, light falling off toward its edges
    const t = R.tmp(); t.filter = 'blur(9px)'; t.fillStyle = '#fff'; t.fillRect(x + 4, y + 4, bw - 8, bh - 8); t.filter = 'none';
    t.globalCompositeOperation = 'source-in'; const rg = t.createRadialGradient(x + bw * 0.45, y + bh * 0.5, 0, x + bw * 0.45, y + bh * 0.5, bw * 0.62);
    rg.addColorStop(0, '#EAF3FB'); rg.addColorStop(0.55, P.phone); rg.addColorStop(1, '#93AFC6'); t.fillStyle = rg; t.fillRect(x - 20, y - 20, bw + 40, bh + 40);
    g.save(); g.globalAlpha = o.alpha || 0.93; g.drawImage(t.canvas, 0, 0); g.restore();
    // it is light on paper: the scrim fibre shows through it
    const rp = new Path2D(); rp.rect(x - 6, y - 6, bw + 12, bh + 12); g.save(); g.clip(rp); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.85; g.drawImage(R.fibreTex(), -137, -61); g.restore();
    // faint projector scanlines
    g.save(); g.beginPath(); g.rect(x, y, bw, bh); g.clip(); g.fillStyle = 'rgba(30,50,70,0.07)'; for (let yy = y; yy < y + bh; yy += 3) g.fillRect(x, yy, bw, 1); g.restore();
    const by = y + padY + o.size * 0.8;
    g.save(); g.font = fontStr(F); g.fillStyle = '#0B0F14'; g.textBaseline = 'alphabetic'; g.filter = 'blur(0.35px)'; g.fillText(text, x + padX, by); g.restore();
    if (o.cursor) { g.save(); g.fillStyle = '#0B0F14'; g.globalAlpha = 0.92; g.fillRect(x + padX + tw + o.size * 0.24, by - o.size * 0.76, cw, o.size * 0.9); g.restore(); }
    st.em.save(); st.em.globalAlpha = 0.32; st.em.fillStyle = P.phone; st.em.fillRect(x, y, bw, bh); st.em.restore();
    return { w: bw, h: bh };
  }

  // ---------------- SCOTT (torn): the strip rips at the dash; the cut-off half falls, mid-air, with a matching torn edge ----------------
  function scottTear(st, text, x, y, o) {
    o = Object.assign({ size: 100, stretch: 'extra-condensed', weight: 700, fallDx: 30, fallDy: 150, fallRot: 0.42, blur: 7 }, o); const g = st.ctx;
    const F = { family: 'Archivo', weight: o.weight, size: o.size, stretch: o.stretch };
    const cut = text.indexOf('--'); const kept = text.slice(0, cut), lost = text.slice(cut);
    const kw = measure(g, kept, F), lwT = measure(g, lost, Object.assign({}, F, { tracking: o.size * 0.035 }));
    const sh = o.size * 1.18, pad = o.size * 0.34;
    const x0 = x, x1 = x + pad * 1.35 + kw + o.size * 0.12, y0 = y, y1 = y + sh;
    const r = rng('tear' + text);
    // one jagged tear line, shared by both halves
    const tearPts = []; for (let yy = y0; yy <= y1 + 0.1; yy += sh / 14) { const k = (yy - y0) / sh; const big = (k > 0.3 && k < 0.42) ? 1.6 : (k > 0.66 && k < 0.74) ? -1.3 : 0; tearPts.push([(r() - 0.5) * o.size * 0.16 + big * o.size * 0.09, yy]); }
    const deck = (a, b, n, axis, seed) => { const pts = []; for (let i = 0; i <= n; i++) { const t2 = i / n; pts.push([lerp(a[0], b[0], t2) + (axis ? (vnoise(i * 0.9, seed, 3) - 0.5) * 5 : 0), lerp(a[1], b[1], t2) + (axis ? 0 : (vnoise(i * 0.9, seed, 3) - 0.5) * 3.2)]); } return pts; };
    const strip = [].concat(deck([x0, y0], [x1, y0], 12, 0, 1), tearPts.map(([dx, yy]) => [x1 + dx, yy]), deck([x1, y1], [x0, y1], 12, 0, 2), deck([x0, y1], [x0, y0], 6, 1, 3));
    const p = polyPath(strip);
    g.save(); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 16; g.shadowOffsetX = 7; g.shadowOffsetY = 9; g.fillStyle = R.rgba(P.scott, 0.94); g.fill(p); g.restore();
    paperTex(g, p, 0.55, 40);
    g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.2; g.fillStyle = '#FFE2A8'; g.fill(p); g.restore();
    // torn fibres along the rip: the paper's white core shows
    g.save(); g.strokeStyle = 'rgba(255,236,196,0.75)'; g.lineWidth = 1.6; g.beginPath(); tearPts.forEach(([dx, yy], i) => i ? g.lineTo(x1 + dx - 1.5, yy) : g.moveTo(x1 + dx - 1.5, yy)); g.stroke(); g.restore();
    g.save(); g.font = fontStr(F); g.fontStretch = o.stretch; g.fillStyle = P.ink; g.textBaseline = 'alphabetic'; g.fillText(kept, x0 + pad * 1.35, y0 + sh * 0.8); g.restore();
    R.pin(g, x0 + o.size * 0.16, y0 + o.size * 0.17, Math.max(6, o.size * 0.075), { legs: false });
    // the lost half: same tear on its left edge
    const lw = lwT + pad * 1.6; const ox = tearPts[0][0];
    const piece = [].concat(tearPts.map(([dx, yy]) => [dx - ox, yy - y0]), deck([0, sh], [lw, sh], 10, 0, 4), deck([lw, sh], [lw, 0], 6, 1, 5), deck([lw, 0], [0, 0], 10, 0, 6));
    const qp = polyPath(piece);
    const drawPiece = (c, a, dark) => {
      c.save(); c.globalAlpha = a; c.fillStyle = R.rgba(P.scott, 0.92); c.fill(qp); paperTex(c, qp, 0.6, 90);
      c.save(); c.strokeStyle = 'rgba(255,236,196,0.7)'; c.lineWidth = 1.5; c.beginPath(); tearPts.forEach(([dx, yy], i) => i ? c.lineTo(dx - ox + 1.5, yy - y0) : c.moveTo(dx - ox + 1.5, yy - y0)); c.stroke(); c.restore();
      c.font = fontStr(F); c.fontStretch = o.stretch; c.letterSpacing = (o.size * 0.035) + 'px'; c.fillStyle = P.ink; c.textBaseline = 'alphabetic'; c.fillText(lost, pad * 0.75, sh * 0.8);
      if (dark) { const fg = c.createLinearGradient(0, 0, lw * 0.8, sh); fg.addColorStop(0, 'rgba(10,5,3,0)'); fg.addColorStop(1, `rgba(10,5,3,${dark})`); c.fillStyle = fg; c.fill(qp); }
      c.restore(); };
    const px = x1 + ox + o.fallDx, py = y0 + o.fallDy;
    // a short vertical smear (it is falling): many faint copies stepped 1.5px back up the fall line, then the piece itself
    const P2 = R.tmp(); P2.save(); P2.translate(px, py); P2.rotate(o.fallRot); drawPiece(P2, 1, 0.38); P2.restore();
    const sm = O.makeCanvas(W, H), smg = sm.getContext('2d'); smg.drawImage(P2.canvas, 0, 0);
    g.save(); for (let k = o.blur * 2; k >= 1; k--) { g.globalAlpha = 0.085 * (1 - k / (o.blur * 2.4)); g.drawImage(sm, 0, -k * 2.2); } g.restore();
    g.save(); g.shadowColor = 'rgba(0,0,0,0.42)'; g.shadowBlur = 16; g.shadowOffsetX = 9; g.shadowOffsetY = 12; g.filter = 'blur(0.6px)'; g.globalAlpha = 0.96; g.drawImage(sm, 0, 2); g.restore();
    return { x1, y1, piece: [px, py, lw, sh] };
  }

  // ---------------- SCOTT: a torn strip of amber tissue, pinned; Archivo narrowing under stress ----------------
  function scottTorn(st, text, x, y, o) {
    o = Object.assign({ size: 48, squeeze: 0.5 }, o); const g = st.ctx;
    const stretch = o.squeeze > 0.8 ? 'extra-condensed' : o.squeeze > 0.55 ? 'condensed' : o.squeeze > 0.3 ? 'semi-condensed' : 'normal';
    const F = { family: 'Archivo', weight: 500, size: o.size, stretch };
    const cut = text.indexOf('--'); const kept = cut >= 0 ? text.slice(0, cut) : text, lost = cut >= 0 ? text.slice(cut) : '';
    const kw = measure(g, kept, F); const sh = o.size * 1.28; const pad = o.size * 0.42;
    const x0 = x, x1 = x + kw + pad * 2 + o.size * 0.2, y0 = y, y1 = y + sh;
    const pts = stripPoly(x0, y0, x1, y1, { seed: 'sc' + text, tear: lost ? o.size * 0.42 : 0, deckle: 3 });
    const p = polyPath(pts);
    // strip: amber tissue, backlit
    g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 14; g.shadowOffsetX = 6; g.shadowOffsetY = 8; g.fillStyle = R.rgba(P.scott, 0.9); g.fill(p); g.restore();
    paperTex(g, p, 0.55, 40);
    g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.18; g.fillStyle = '#FFE2A8'; g.fill(p); g.restore();
    g.save(); g.font = fontStr(F); g.fontStretch = stretch; g.fillStyle = P.ink; g.textBaseline = 'alphabetic'; g.fillText(kept, x0 + pad, y0 + sh * 0.76); g.restore();
    R.pin(g, x0 + o.size * 0.2, y0 + o.size * 0.2, Math.max(5, o.size * 0.1), { legs: false });
    // the torn-off half falls away into the dark
    if (lost) {
      const lw = measure(g, lost, F) + pad * 1.4; const q = stripPoly(0, 0, lw, sh, { seed: 'sc2', tearL: o.size * 0.42, deckle: 3 });
      g.save(); g.translate(x1 + (o.fallDx || -10), y1 + (o.fallDy || o.size * 1.25)); g.rotate(o.fallRot || 0.72);
      const qp = polyPath(q); g.globalAlpha = 0.82; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 12; g.shadowOffsetX = 5; g.shadowOffsetY = 6; g.fillStyle = R.rgba(P.scott, 0.85); g.fill(qp);
      g.shadowColor = 'transparent'; paperTex(g, qp, 0.6, 90);
      g.font = fontStr(F); g.fontStretch = stretch; g.fillStyle = P.ink; g.fillText(lost, pad * 0.9, sh * 0.76);
      // it darkens as it falls out of the light
      const fg = g.createLinearGradient(0, 0, lw, sh); fg.addColorStop(0, 'rgba(10,5,3,0)'); fg.addColorStop(1, 'rgba(10,5,3,0.55)'); g.fillStyle = fg; g.fill(qp);
      g.restore();
    }
    return { x1, y1 };
  }
  // Scott, untorn line
  function scottLine(st, text, x, y, o) {
    o = Object.assign({ size: 44, squeeze: 0.3 }, o); const g = st.ctx;
    const stretch = o.squeeze > 0.8 ? 'extra-condensed' : o.squeeze > 0.55 ? 'condensed' : o.squeeze > 0.3 ? 'semi-condensed' : 'normal';
    const F = { family: 'Archivo', weight: 500, size: o.size, stretch }; const tw = measure(g, text, F); const sh = o.size * 1.28, pad = o.size * 0.42;
    const pts = stripPoly(x, y, x + tw + pad * 2, y + sh, { seed: 'sl' + text }); const p = polyPath(pts);
    g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 14; g.shadowOffsetX = 6; g.shadowOffsetY = 8; g.fillStyle = R.rgba(P.scott, 0.9); g.fill(p); g.restore(); paperTex(g, p, 0.55, 20);
    g.save(); g.font = fontStr(F); g.fontStretch = stretch; g.fillStyle = P.ink; g.fillText(text, x + pad, y + sh * 0.76); g.restore();
    R.pin(g, x + o.size * 0.2, y + o.size * 0.2, Math.max(5, o.size * 0.1), { legs: false });
  }

  // ---------------- DEENA: Anton capitals on a bottle-green card plate cut with pinking shears ----------------
  function deena(st, text, x, y, o) {
    o = Object.assign({ size: 72, tracking: 6, rot: -0.03, upper: true }, o); const g = st.ctx;
    const s = o.upper ? text.toUpperCase() : text; const F = { family: 'Anton', weight: 400, size: o.size, tracking: o.tracking };
    const tw = measure(g, s, F), padX = o.size * 0.45, padY = o.size * 0.3; const bw = tw + padX * 2, bh = o.size * 1.18 + padY * 2;
    g.save(); g.translate(x, y); g.rotate(o.rot);
    // pinking-shear zigzag outline
    const pts = []; const tooth = 9; const zig = (ax, ay, bx, by) => { const l = Math.hypot(bx - ax, by - ay), n = Math.round(l / tooth); const nx = (by - ay) / l, ny = -(bx - ax) / l; for (let i = 0; i < n; i++) { const t = i / n; const k = (i % 2 ? 1 : -1) * 3.6; pts.push([ax + (bx - ax) * t + nx * k, ay + (by - ay) * t + ny * k]); } };
    zig(0, 0, bw, 0); zig(bw, 0, bw, bh); zig(bw, bh, 0, bh); zig(0, bh, 0, 0);
    const p = polyPath(pts);
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 18; g.shadowOffsetX = 8; g.shadowOffsetY = 10; g.fillStyle = P.deena; g.fill(p); g.shadowColor = 'transparent';
    paperTex(g, p, 0.45, 130);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1; g.stroke(p);
    g.font = fontStr(F); g.letterSpacing = o.tracking + 'px'; g.fillStyle = '#F2EBDC'; g.textBaseline = 'alphabetic'; g.fillText(s, padX, padY + o.size * 1.0);
    R.pin(g, 16, 16, 6, { legs: false });
    g.restore();
    return { w: bw, h: bh };
  }

  // ---------------- ANGELO: Alfa Slab One on bone playing-card plates ----------------
  function spade(g, x, y, s, color) {
    g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = color; g.beginPath();
    g.moveTo(0, -1); g.bezierCurveTo(0.35, -0.55, 1.0, -0.25, 0.85, 0.25); g.bezierCurveTo(0.75, 0.62, 0.3, 0.6, 0.08, 0.35);
    g.lineTo(0.28, 1.0); g.lineTo(-0.28, 1.0); g.lineTo(-0.08, 0.35); g.bezierCurveTo(-0.3, 0.6, -0.75, 0.62, -0.85, 0.25); g.bezierCurveTo(-1.0, -0.25, -0.35, -0.55, 0, -1); g.fill(); g.restore();
  }
  function angeloCard(st, text, x, y, o) {
    o = Object.assign({ size: 42, rot: 0.05, w: null, faceDown: false, blank: false }, o); const g = st.ctx;
    const F = { family: 'Alfa Slab One', weight: 400, size: o.size }; const lines = text ? text.split('\n') : [''];
    const tw = Math.max(...lines.map(l => measure(g, l, F)));
    const cw = o.w || Math.max(tw + o.size * 1.6, o.size * 3.2), ch = o.h || Math.max(o.size * 1.45 * lines.length + o.size * 1.1, o.size * 2.6);
    g.save(); g.translate(x, y); g.rotate(o.rot);
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 14; g.shadowOffsetX = 6; g.shadowOffsetY = 9;
    g.fillStyle = P.bone; g.beginPath(); g.roundRect(0, 0, cw, ch, 14); g.fill(); g.shadowColor = 'transparent';
    const rr = new Path2D(); rr.roundRect(0, 0, cw, ch, 14); paperTex(g, rr, 0.35, 200);
    g.strokeStyle = 'rgba(60,40,30,0.55)'; g.lineWidth = 1; g.stroke(rr);
    if (o.faceDown) { lattice(g, 8, 8, cw - 16, ch - 16); g.restore(); return { w: cw, h: ch }; }
    spade(g, o.size * 0.42, o.size * 0.48, o.size * 0.2, P.angelo);
    spade(g, cw - o.size * 0.42, ch - o.size * 0.48, o.size * 0.2, P.angelo);
    if (!o.blank) { g.font = fontStr(F); g.fillStyle = '#1C1410'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; lines.forEach((l, i) => g.fillText(l, cw / 2, ch / 2 + o.size * 0.36 + (i - (lines.length - 1) / 2) * o.size * 1.3)); }
    g.restore();
    return { w: cw, h: ch };
  }
  // crimson card-back lattice
  function lattice(g, x, y, w, h, o) {
    o = o || {}; g.save(); g.beginPath(); g.roundRect(x, y, w, h, o.r || 8); g.clip();
    g.fillStyle = o.bg || P.angelo; g.fillRect(x, y, w, h);
    const d = o.d || 12; g.strokeStyle = o.line || 'rgba(236,230,220,0.85)'; g.lineWidth = o.lw || 1.6;
    for (let k = -h; k < w + h; k += d) { g.beginPath(); g.moveTo(x + k, y); g.lineTo(x + k + h, y + h); g.stroke(); g.beginPath(); g.moveTo(x + k, y + h); g.lineTo(x + k + h, y); g.stroke(); }
    g.restore(); g.save(); g.strokeStyle = o.line || 'rgba(236,230,220,0.85)'; g.lineWidth = 2; g.beginPath(); g.roundRect(x + 3, y + 3, w - 6, h - 6, (o.r || 8) - 2); g.stroke(); g.restore();
  }

  // ---------------- VOICE (O.S.): letters punched THROUGH the paper in a borrowed face ----------------
  function voice(st, text, x, y, o) {
    o = Object.assign({ face: 'angelo', size: 64, rot: 0, align: 'center' }, o);
    const F = o.face === 'angelo' ? { family: 'Alfa Slab One', weight: 400, size: o.size } : o.face === 'deena' ? { family: 'Anton', weight: 400, size: o.size, tracking: 4 } : { family: 'Archivo', weight: 500, size: o.size };
    const tw = measure(st.ctx, text, F);
    R.holes(st, (m) => { m.save(); m.translate(x, y); m.rotate(o.rot); m.font = fontStr(F); m.letterSpacing = (F.tracking || 0) + 'px'; m.textAlign = o.align; m.textBaseline = 'alphabetic'; m.fillText(text, 0, 0); m.restore(); },
      { charW: o.charW || 2.4, flecks: o.flecks == null ? 6 : o.flecks, seed: 'v' + text, box: [x - tw / 2 - 10, y - o.size, tw + 20, o.size * 1.2], bloom: o.bloom == null ? 0.9 : o.bloom, emberRim: 0.95 });
    return { w: tw };
  }


  // ---------------- VOICE, burnt through: rough-eaten letter holes, an ember lip, a black char ring, a toasted singe on the paper around ----------------
  function burnVoice(st, text, x, y, o) {
    o = Object.assign({ face: 'angelo', size: 108, flecks: 16, seed: 'burn', singe: '#8A3A12' }, o); const g = st.ctx;
    const F = o.face === 'angelo' ? { family: 'Alfa Slab One', weight: 400, size: o.size } : o.face === 'deena' ? { family: 'Anton', weight: 400, size: o.size, tracking: 4 } : { family: 'Archivo', weight: 700, size: o.size };
    const tw = measure(g, text, F); const pad = 30; const bx = Math.floor(x - tw / 2 - pad), by = Math.floor(y - o.size * 0.95 - pad), bw = Math.ceil(tw + pad * 2), bh = Math.ceil(o.size * 1.25 + pad * 2);
    const mk = O.makeCanvas(bw, bh), mg = mk.getContext('2d'); mg.fillStyle = '#fff'; mg.font = fontStr(F); mg.letterSpacing = (F.tracking || 0) + 'px'; mg.textAlign = 'center'; mg.textBaseline = 'alphabetic'; mg.fillText(text, x - bx, y - by);
    const blurOf = r => { const c = O.makeCanvas(bw, bh), cg = c.getContext('2d'); cg.filter = `blur(${r}px)`; cg.drawImage(mk, 0, 0); return cg.getImageData(0, 0, bw, bh).data; };
    const b1 = blurOf(1.7), b4 = blurOf(3.6), b10 = blurOf(9);
    const base = g.getImageData(bx, by, bw, bh); const d = base.data; const em = new ImageData(bw, bh);
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
      const k = (j * bw + i) * 4; const X = bx + i, Y = by + j;
      const n = O.fbm(X * 0.22, Y * 0.22, 17, 3) - 0.5, n2 = O.fbm(X * 0.045, Y * 0.045, 23, 3) - 0.5;
      const a1 = b1[k + 3] / 255, a4 = b4[k + 3] / 255, a10 = b10[k + 3] / 255;
      const tCore = 0.5 + n * 0.42, tEmber = 0.27 + n * 0.3, tChar = 0.11 + n2 * 0.24 + n * 0.06, tSinge = 0.03 + n2 * 0.06;
      let r = d[k], gg = d[k + 1], b = d[k + 2];
      if (a1 > tCore) { const hot = Math.min(1, (a4 - 0.5) * 2.2); r = 255; gg = lerp(226, 246, hot); b = lerp(168, 226, hot); em.data[k] = 255; em.data[k + 1] = 240; em.data[k + 2] = 210; em.data[k + 3] = 255; }
      else if (a1 > tEmber) { const t = (a1 - tEmber) / Math.max(0.01, tCore - tEmber); r = 255; gg = lerp(90, 170, t); b = lerp(20, 60, t); em.data[k] = 255; em.data[k + 1] = 110; em.data[k + 2] = 30; em.data[k + 3] = 255; }
      else if (a4 > tChar) { const t = Math.min(1, (a4 - tChar) * 3); r = lerp(r, 26, 0.6 + 0.4 * t); gg = lerp(gg, 11, 0.6 + 0.4 * t); b = lerp(b, 5, 0.6 + 0.4 * t); }
      else if (a10 > tSinge) { const t = Math.min(1, (a10 - tSinge) * 4) * 0.62; const sc = R.hex(o.singe); r = lerp(r, sc[0], t); gg = lerp(gg, sc[1], t); b = lerp(b, sc[2], t); }
      d[k] = r; d[k + 1] = gg; d[k + 2] = b;
    }
    // write back (screen space)
    const pc = O.makeCanvas(bw, bh); pc.getContext('2d').putImageData(base, 0, 0);
    const ec = O.makeCanvas(bw, bh); ec.getContext('2d').putImageData(em, 0, 0);
    const gm = g.getTransform(); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(pc, bx, by); g.restore();
    const emM = st.em.getTransform(); st.em.save(); st.em.setTransform(0.5, 0, 0, 0.5, 0, 0); st.em.globalAlpha = o.bloom == null ? 0.55 : o.bloom; st.em.drawImage(ec, bx, by); st.em.restore();
    // ember flecks lifting off, and a few black ash flakes
    const r = rng('bfl' + o.seed); g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < o.flecks; i++) { const fx = bx + pad + r() * tw, fy = by + pad * 0.4 + r() * o.size * 0.5 - r() * 30; const s2 = 1 + r() * 2.2;
      if (i % 4 === 3) { g.fillStyle = 'rgba(20,10,6,0.85)'; g.save(); g.translate(fx, fy - 10); g.rotate(r() * 3); g.fillRect(-s2 * 1.6, -s2 * 0.7, s2 * 3.2, s2 * 1.4); g.restore(); continue; }
      g.fillStyle = r() < 0.5 ? '#FF7A2A' : '#FFD27A'; g.beginPath(); g.arc(fx, fy, s2, 0, 7); g.fill();
      st.em.save(); st.em.setTransform(0.5, 0, 0, 0.5, 0, 0); st.em.fillStyle = '#FF6A20'; st.em.beginPath(); st.em.arc(fx, fy, s2 * 2.6, 0, 7); st.em.fill(); st.em.restore(); }
    g.restore();
    return { w: tw, box: [bx, by, bw, bh] };
  }

  R.type = { burnVoice, dispatcher, dispatcherLight, scottTear, scottTorn, scottLine, deena, angeloCard, lattice, spade, voice, measure, fontStr, stripPoly, polyPath, paperTex };
})(window);
