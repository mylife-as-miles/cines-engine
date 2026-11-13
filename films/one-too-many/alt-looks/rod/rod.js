/* ONE TOO MANY — LOOK C: "ONE ROD TOO MANY" — a backlit shadow-puppet theatre.
   Own toolkit (does not modify kit/). Uses only the generic parts of OTM: stage, S shape builder, rng/vnoise/fbm.
   Layer model: L0 lamp -> L1 paper scrim (fibre multiplied) -> multiplane card planes (contact shadow, gels, rim)
   -> atmosphere -> stage lip + rods -> type plates -> film finish. Deterministic: no Math.random / Date. */
(function (global) {
  'use strict';
  const O = global.OTM;
  const { W, H, rng, vnoise, fbm, clamp, lerp, S, makeCanvas } = O;

  // ---------------- palette (from the pitch) ----------------
  const P = {
    lampCore: '#FFF4E0', tungsten: '#F2A541', umber: '#5A2E1A', ink: '#17110E', brass: '#B8893B',
    wine: '#7A0F22', wineDark: '#4A0814', lipstick: '#C8102E', rainSlate: '#3E5C76', pilot: '#2B6CF0',
    ember: '#FF5A1F', flameHot: '#FFE7A8', char: '#2A1208', phone: '#CFE3F2', strobeRed: '#E0242C', strobeBlue: '#1F4FD8',
    scott: '#E9A23B', deena: '#2F6E55', angelo: '#B01E2E', kay: '#5B88B5', christof: '#7E3F78', marina: '#A7A9AC',
    bareRod: '#3B2A20', bone: '#ECE6DC', dispBg: '#0B0F14',
  };
  const hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); };

  // ---------------- fonts ----------------
  async function fonts(extra) {
    await O.loadFonts('../../fonts/fonts.css');
    await new Promise(res => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '../../fonts/fonts_alt.css'; l.onload = res; l.onerror = res; document.head.appendChild(l); });
    const faces = ['400 48px "IM Fell English SC"', '400 48px "IBM Plex Mono"', '500 48px "IBM Plex Mono"', '500 48px "Archivo"', '700 48px "Archivo"', '900 48px "Archivo"',
      '400 48px "Anton"', '400 48px "Alfa Slab One"', '500 48px "Caveat"', '700 48px "Caveat"', 'italic 600 48px "Fraunces"', '700 48px "Bodoni Moda"', '400 48px "Bodoni Moda"'].concat(extra || []);
    await Promise.all(faces.map(f => document.fonts.load(f, 'AaBbSs0123?!-.')));
    await document.fonts.ready;
  }

  // ---------------- textures ----------------
  let _fibre = null;
  // Backlit paper: cloudy formation (fbm) + short dark fibres + long kozo fibres + sheet seams. White = no change under multiply.
  function fibreTex(seed) {
    if (_fibre) return _fibre;
    seed = seed || 5;
    const lw = 480, lh = 270, sm = makeCanvas(lw, lh), sg = sm.getContext('2d'), img = sg.createImageData(lw, lh);
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      const n = fbm(x * 0.05, y * 0.05, seed, 5), m = fbm(x * 0.16 + 9, y * 0.16, seed + 4, 3);
      const v = 0.9 + 0.1 * clamp((n - 0.25) * 1.6, 0, 1) - 0.035 * m;
      const o = (y * lw + x) * 4; img.data[o] = 255 * v; img.data[o + 1] = 250 * v; img.data[o + 2] = 238 * v; img.data[o + 3] = 255;
    }
    sg.putImageData(img, 0, 0);
    const c = makeCanvas(W, H), g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(sm, 0, 0, W, H);
    const r = rng('fibre' + seed); g.lineCap = 'round';
    for (let i = 0; i < 3200; i++) {
      const x = r() * W, y = r() * H, a = r() * Math.PI * 2, l = 6 + r() * 26;
      g.strokeStyle = `rgba(70,42,24,${0.04 + r() * 0.07})`; g.lineWidth = 0.5 + r() * 0.6; g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 8, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 8, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    for (let i = 0; i < 260; i++) { // long kozo fibres
      let x = r() * W, y = r() * H, a = r() * Math.PI * 2; g.strokeStyle = `rgba(90,55,30,${0.035 + r() * 0.05})`; g.lineWidth = 0.6 + r() * 0.8; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 14; y += Math.sin(a) * 14; g.lineTo(x, y); } g.stroke();
    }
    for (let i = 0; i < 900; i++) { const x = r() * W, y = r() * H; g.fillStyle = `rgba(80,50,30,${0.05 + r() * 0.12})`; g.fillRect(x, y, 1 + r() * 1.5, 1 + r() * 1.5); }
    // two glued sheet seams (overlap = double paper = darker band)
    [[W * 0.36, 0.06], [W * 0.71, 0.05]].forEach(([sx, a]) => { for (let y = 0; y < H; y += 2) { const w = 7 + 3 * vnoise(0, y * 0.02, 3); g.fillStyle = `rgba(90,50,25,${a})`; g.fillRect(sx + (vnoise(1, y * 0.01, 7) - 0.5) * 6, y, w, 2); } });
    return (_fibre = c);
  }
  let _cardTex = null;
  function cardTex() {
    if (_cardTex) return _cardTex;
    const lw = 640, lh = 360, c = makeCanvas(lw, lh), g = c.getContext('2d'), img = g.createImageData(lw, lh);
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      const n = fbm(x * 0.05, y * 0.05, 31, 4); const o = (y * lw + x) * 4; const v = clamp((n - 0.3) * 1.5, 0, 1);
      img.data[o] = 34 + 26 * v; img.data[o + 1] = 25 + 17 * v; img.data[o + 2] = 19 + 11 * v; img.data[o + 3] = 255 * (0.3 + 0.7 * v);
    }
    g.putImageData(img, 0, 0); const big = makeCanvas(W, H); big.getContext('2d').drawImage(c, 0, 0, W, H); return (_cardTex = big);
  }
  const _grain = {};
  function grainTile(seed) {
    if (_grain[seed]) return _grain[seed];
    const c = makeCanvas(384, 384), g = c.getContext('2d'), img = g.createImageData(384, 384), r = rng('rodgrain' + seed);
    for (let i = 0; i < img.data.length; i += 4) { const v = clamp(Math.floor(128 + (r() + r() + r() - 1.5) * 140), 0, 255); img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); return (_grain[seed] = c);
  }

  // ---------------- stage ----------------
  function stage(o) {
    o = o || {};
    const ctx = O.stage();
    const em = makeCanvas(W / 2, H / 2).getContext('2d'); em.scale(0.5, 0.5);
    const st = { ctx, em, lamp: o.lamp || [W / 2, H * 0.4], seed: o.seed || 1 };
    st.layer = () => { const c = makeCanvas(W, H).getContext('2d'); return c; };
    // direction (unit) from point toward lamp
    st.toLamp = (x, y) => { const dx = st.lamp[0] - x, dy = st.lamp[1] - y, l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    st.commit = (L, c) => commit(st, L, c || {});
    return st;
  }

  // the lamp + scrim. stops: [[t, color]...] over radius R. extra glows: [{x,y,r,color,alpha,op}]
  function scrim(st, o) {
    const g = st.ctx, [lx, ly] = o.lamp || st.lamp, R = o.R || Math.hypot(W, H) * 0.9;
    g.save();
    const gr = g.createRadialGradient(lx, ly, 0, lx, ly, R);
    (o.stops || [[0, P.lampCore], [0.18, P.tungsten], [0.62, '#B5622A'], [1, P.umber]]).forEach(([t, c]) => gr.addColorStop(t, c));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    (o.glows || []).forEach(q => { const rg = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r); rg.addColorStop(0, rgba(q.color, q.alpha == null ? 0.5 : q.alpha)); rg.addColorStop(1, rgba(q.color, 0)); g.globalCompositeOperation = q.op || 'source-over'; g.fillStyle = rg; g.fillRect(0, 0, W, H); });
    g.globalCompositeOperation = 'source-over';
    if (o.after) o.after(g);
    // keep the bare lamp (no paper) for figure-shaped absences in the scrim
    st.lampOnly = makeCanvas(W, H); st.lampOnly.getContext('2d').drawImage(g.canvas, 0, 0); st.fibreM = g.getTransform();
    // paper fibre multiplied over the lamp so the sheet glows from behind
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = o.fibre == null ? 1 : o.fibre; g.drawImage(fibreTex(o.fibreSeed), 0, 0);
    g.restore();
  }

  // ---------------- plane compositing ----------------
  const _t1 = { c: null }, _t2 = { c: null };
  function tmp(slot) { if (!slot.c) slot.c = makeCanvas(W, H); const g = slot.c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, W, H); return g; }
  // c: {shadow:{d (px away from lamp), blur, alpha, from:[x,y]}, gels:[{path|fn, color, alpha, glow}], rim:{w, color, alpha, from:[x,y]}, alpha, blur, texture}
  function commit(st, L, c) {
    const g = st.ctx; const from = c.from || [W / 2, H / 2]; const [ux, uy] = st.toLamp(from[0], from[1]);
    if (c.texture !== false) { L.save(); L.globalCompositeOperation = 'source-atop'; L.globalAlpha = c.texture == null ? 0.5 : c.texture; L.drawImage(cardTex(), 0, 0); L.restore(); }
    if (c.shadow) {
      const s = c.shadow, t = tmp(_t1); t.filter = `blur(${s.blur || 10}px)`; const sox = s.ox != null ? s.ox : -ux * (s.d || 10), soy = s.oy != null ? s.oy : -uy * (s.d || 10) + (s.dy || 0); t.drawImage(L.canvas, sox, soy); t.filter = 'none';
      t.globalCompositeOperation = 'source-in'; t.fillStyle = s.color || '#000'; t.fillRect(0, 0, W, H);
      g.save(); g.globalAlpha = s.alpha == null ? 0.32 : s.alpha; g.drawImage(_t1.c, 0, 0); g.restore();
    }
    (c.gels || []).forEach(q => gel(g, q.path || q.fn, q.color, q.alpha, q.glow));
    g.save(); if (c.alpha != null) g.globalAlpha = c.alpha; if (c.blur) g.filter = `blur(${c.blur}px)`; g.drawImage(L.canvas, 0, 0); g.restore();
    if (c.rim) {
      const r = c.rim, w = r.w || 1.6, t = tmp(_t2); t.drawImage(L.canvas, ux * w, uy * w); t.globalCompositeOperation = 'destination-out'; t.drawImage(L.canvas, 0, 0);
      t.globalCompositeOperation = 'source-in'; t.fillStyle = r.color || P.lampCore; t.fillRect(0, 0, W, H);
      g.save(); g.globalAlpha = r.alpha == null ? 0.9 : r.alpha; g.globalCompositeOperation = r.op || 'source-over'; g.drawImage(_t2.c, 0, 0); g.restore();
    }
  }
  // coloured tissue: light passes through coloured paper (multiply), then a screen pass for glow
  function gel(g, pathOrFn, color, alpha, glow) {
    const fillIt = () => { g.fillStyle = color; if (typeof pathOrFn === 'function') pathOrFn(g); else g.fill(pathOrFn); };
    g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = alpha == null ? 0.75 : alpha; fillIt(); g.restore();
    g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = glow == null ? 0.25 : glow; fillIt(); g.restore();
    if (pathOrFn instanceof Path2D) { g.save(); g.clip(pathOrFn); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.7; g.drawImage(fibreTex(), 37, 23); g.restore(); }
  }

  // card piece: fill + optional holes (destination-out) + optional gel behind holes, drawn onto a plane layer
  function piece(L, outline, holes, o) {
    o = o || {};
    if (!holes) { L.fillStyle = o.fill || P.ink; L.fill(outline); return; }
    const t = tmp(_t1); t.fillStyle = o.fill || P.ink; t.fill(outline);
    t.globalCompositeOperation = 'destination-out'; t.fill(holes, 'evenodd'); t.globalCompositeOperation = 'source-over';
    L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = o.alpha == null ? 1 : o.alpha; L.drawImage(_t1.c, 0, 0); L.restore();
  }
  // seam: the card edge of a piece lying over earlier pieces catches a little front light
  function seam(L, outline, under, o) {
    o = o || {}; L.save(); L.clip(under); L.strokeStyle = o.color || 'rgba(214,150,80,0.2)'; L.lineWidth = o.w || 1.3; L.stroke(outline); L.restore();
  }

  // ---------------- split pin (brass) ----------------
  function pin(g, x, y, r, o) {
    o = o || {}; r = r || 5; const light = o.light || [-0.6, -0.8];
    g.save();
    // legs (bent split-pin prongs)
    if (o.legs !== false && r >= 6.5) { g.strokeStyle = 'rgba(122,90,34,0.75)'; g.lineWidth = Math.max(0.8, r * 0.26); g.lineCap = 'round'; const a = o.legA == null ? 0.55 : o.legA;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(Math.PI / 2 + a) * r * 1.55, y + Math.sin(Math.PI / 2 + a) * r * 1.55); g.moveTo(x, y); g.lineTo(x + Math.cos(Math.PI / 2 - a) * r * 1.55, y + Math.sin(Math.PI / 2 - a) * r * 1.55); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.arc(x + r * 0.25, y + r * 0.3, r * 1.05, 0, 7); g.fill();
    const gr = g.createRadialGradient(x + light[0] * r * 0.45, y + light[1] * r * 0.45, r * 0.1, x, y, r * 1.05);
    gr.addColorStop(0, '#F3D58C'); gr.addColorStop(0.45, P.brass); gr.addColorStop(1, '#5E4216');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,240,200,0.95)'; g.lineWidth = Math.max(0.8, r * 0.22); g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r * 0.62, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
    g.restore();
  }

  // ---------------- stage lip + rods ----------------
  // lip: worn wooden rail across the bottom. returns {top}
  function lip(st, o) {
    o = o || {}; const g = st.ctx, top = o.top || (H - 78), h = H - top;
    // contact shadow onto the scrim above
    g.save(); const sg = g.createLinearGradient(0, top - 26, 0, top); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = sg; g.fillRect(0, top - 26, W, 26); g.restore();
    // wood body
    const lw = 960, lh = Math.ceil(h / 2) + 2, c = makeCanvas(lw, lh), cg = c.getContext('2d'), img = cg.createImageData(lw, lh);
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      const grain = fbm(x * 0.012, y * 0.32, 77, 4), streak = vnoise(x * 0.004, y * 0.9, 12), wear = fbm(x * 0.03, y * 0.08, 91, 3);
      const lines = Math.pow(Math.abs(Math.sin((y * 0.55 + grain * 9 + x * 0.002) * 1.7)), 6);
      let v = 0.62 + 0.75 * grain + 0.3 * streak - 0.35 * lines; const t = y / lh; v *= 1.2 - t * 0.6; if (wear > 0.6 && t < 0.4) v += (wear - 0.6) * 3.2;
      const o2 = (y * lw + x) * 4; img.data[o2] = 40 * v + 5; img.data[o2 + 1] = 25 * v + 4; img.data[o2 + 2] = 15 * v + 3; img.data[o2 + 3] = 255;
    }
    cg.putImageData(img, 0, 0);
    g.save(); g.imageSmoothingQuality = 'high';
    const edge = new Path2D(); edge.moveTo(0, top + 2); for (let x = 0; x <= W; x += 12) edge.lineTo(x, top + (vnoise(x * 0.02, 0, 5) - 0.5) * 2.2); edge.lineTo(W, H); edge.lineTo(0, H); edge.closePath();
    g.clip(edge); g.drawImage(c, 0, top - 2, W, h + 4);
    // bevel: lit top edge, a darker groove
    const bv = g.createLinearGradient(0, top, 0, top + 14); bv.addColorStop(0, 'rgba(255,200,130,0.0)'); bv.addColorStop(0.15, 'rgba(255,190,120,0.16)'); bv.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = bv; g.fillRect(0, top, W, 14);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, top + 22, W, 2); g.fillStyle = 'rgba(255,190,120,0.07)'; g.fillRect(0, top + 24, W, 1);
    g.restore();
    g.save(); g.strokeStyle = rgba(o.rimColor || P.tungsten, 0.85); g.lineWidth = 1.2; g.beginPath(); for (let x = 0; x <= W; x += 12) { const y = top + (vnoise(x * 0.02, 0, 5) - 0.5) * 2.2 + 0.6; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.restore();
    // brass tacks along the rail
    (o.tacks || [70, W - 70]).forEach(x => pin(g, x, top + h * 0.55, 4, { legs: false }));
    return { top };
  }
  // a rod from the lip up to a grip point. colour = ferrule colour or null for the bare seventh rod.
  function rod(st, x0, x1, y1, o) {
    o = o || {}; const g = st.ctx, top = o.lipTop || (H - 78), wdt = o.w || 4.2;
    const bare = !o.color; const body = bare ? P.bareRod : P.ink; const yb = H + 10;
    const dx = (x1 - x0) / (y1 - yb); const at = y => x0 + (y - yb) * dx;
    g.save(); g.lineCap = 'butt';
    // soft shadow on the scrim
    g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = wdt + 4; g.filter = 'blur(3px)'; g.beginPath(); g.moveTo(at(top) + 5, top); g.lineTo(x1 + 5, y1 + 3); g.stroke(); g.filter = 'none';
    g.strokeStyle = body; g.lineWidth = wdt; g.beginPath(); g.moveTo(at(top + 4), top + 4); g.lineTo(x1, y1); g.stroke();
    // lamp-side highlight so the rod reads over ink
    const [ux, uy] = st.toLamp((at(top) + x1) / 2, (top + y1) / 2); const nx = -1 / Math.hypot(1, dx), ny = dx / Math.hypot(1, dx);
    const side = (nx * ux + ny * uy) > 0 ? 1 : -1;
    g.strokeStyle = bare ? 'rgba(190,150,110,0.55)' : 'rgba(255,205,140,0.42)'; g.lineWidth = 1.1; g.beginPath();
    g.moveTo(at(top + 4) + side * nx * wdt * 0.45, top + 4 + side * ny * wdt * 0.45); g.lineTo(x1 + side * nx * wdt * 0.45, y1 + side * ny * wdt * 0.45); g.stroke();
    // ferrule band 40px above the lip
    if (!bare) {
      const fy = top - (o.fy || 40), fh = o.fh || 14; const fx = at(fy);
      g.save(); g.translate(fx, fy); g.rotate(Math.atan(-dx)); const fw = o.fw || (wdt + 6);
      const fg = g.createLinearGradient(-fw / 2, 0, fw / 2, 0); if (o.metal) { fg.addColorStop(0, '#55575B'); fg.addColorStop(0.28, '#F2F3F4'); fg.addColorStop(0.45, '#B9BBBE'); fg.addColorStop(0.8, '#7C7E82'); fg.addColorStop(1, '#4A4C50'); } else { fg.addColorStop(0, mix(o.color, '#000000', 0.4)); fg.addColorStop(0.3, mix(o.color, '#ffffff', 0.12)); fg.addColorStop(0.55, o.color); fg.addColorStop(1, mix(o.color, '#000000', 0.35)); }
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.roundRect(-fw / 2 + 2, -fh / 2 + 3, fw, fh, 2); g.fill();
      g.fillStyle = fg; g.beginPath(); g.roundRect(-fw / 2, -fh / 2, fw, fh, 2); g.fill();
      if (o.fw) { // lacquered band: a specular stripe and a thin dark wrap line so it reads as a painted ferrule
        g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(-fw / 2 + fw * 0.22, -fh / 2 + 2, fw * 0.12, fh - 4);
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(-fw / 2, -fh / 2 + fh * k / 3); g.lineTo(fw / 2, -fh / 2 + fh * k / 3); g.stroke(); } }
      // brass collars either end of the band
      const cw2 = o.fw ? 4 : 2.5; g.fillStyle = '#C79A48'; g.fillRect(-fw / 2 - 1, -fh / 2 - cw2, fw + 2, cw2); g.fillRect(-fw / 2 - 1, fh / 2, fw + 2, cw2);
      g.fillStyle = 'rgba(255,236,190,0.6)'; g.fillRect(-fw / 2 - 1, -fh / 2 - cw2, fw + 2, 1); g.fillRect(-fw / 2 - 1, fh / 2, fw + 2, 1);
      g.fillStyle = 'rgba(255,240,200,0.5)'; g.fillRect(-fw / 2 + 1.2, -fh / 2 + 1, 1.2, fh - 2); g.restore();
    } else {
      // unvarnished card-brown: a split end, no band
      g.strokeStyle = 'rgba(20,12,8,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 + 0.3, y1 + 12); g.stroke();
    }
    // the slot where it enters the lip
    if (!o.noSlot) { g.fillStyle = 'rgba(0,0,0,0.7)'; g.beginPath(); g.ellipse(at(top + 3), top + 3, wdt + 3, 2.2, 0, 0, 7); g.fill(); }
    if (o.socket) { const sx = at(top + 2); g.fillStyle = '#6B4E24'; g.beginPath(); g.ellipse(sx, top + 3, wdt + 6, 3.4, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(240,200,130,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(sx, top + 2.4, wdt + 6, 3.4, 0, Math.PI, Math.PI * 2); g.stroke(); g.fillStyle = 'rgba(0,0,0,0.8)'; g.beginPath(); g.ellipse(sx, top + 3, wdt * 0.7, 1.6, 0, 0, 7); g.fill(); }
    // grip: a wire loop through the card
    if (o.grip !== false && !bare) { g.strokeStyle = '#6B5530'; g.lineWidth = 1.4; g.beginPath(); g.arc(x1, y1, 4.5, 0, 7); g.stroke(); }
    g.restore();
    return { lipX: at(top + 3), at, tip: [x1, y1] };
  }
  function rodSlot(st, x, top, w) { const g = st.ctx; g.save(); g.fillStyle = 'rgba(0,0,0,0.75)'; g.beginPath(); g.ellipse(x, top + 3, (w || 5) + 3, 2.4, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,190,120,0.25)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, top + 4, (w || 5) + 4, 2.8, 0, 0.2, Math.PI - 0.2); g.stroke(); g.restore(); }

  // ---------------- the Extra: holes through the paper ----------------
  // mask: fn(ctx) that fills the hole shape in white. charW: singe width. flecks: ember count
  function holes(st, maskFn, o) {
    o = o || {}; const g = st.ctx; const charW = o.charW || 2.5;
    const m = tmp(_t1); m.fillStyle = '#fff'; maskFn(m);
    // char halo: dilate with blur, modulated by noise for a burnt, uneven singe
    const c2 = tmp(_t2); c2.filter = `blur(${charW * 1.2}px)`; c2.drawImage(_t1.c, 0, 0); c2.drawImage(_t1.c, 0, 0); c2.filter = 'none';
    c2.globalCompositeOperation = 'source-in'; c2.fillStyle = P.char; c2.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = o.charAlpha == null ? 0.95 : o.charAlpha; g.drawImage(_t2.c, 0, 0); g.drawImage(_t2.c, 0, 0); g.restore();
    // scorched ember rim just inside the char
    const c3 = tmp(_t2); c3.filter = `blur(${Math.max(0.8, charW * 0.5)}px)`; c3.drawImage(_t1.c, 0, 0); c3.filter = 'none'; c3.globalCompositeOperation = 'source-in'; c3.fillStyle = o.rimColor || P.ember; c3.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = o.emberRim == null ? 0.9 : o.emberRim; g.drawImage(_t2.c, 0, 0); g.restore();
    // raw lamp core
    const c4 = tmp(_t2); c4.drawImage(_t1.c, 0, 0); c4.globalCompositeOperation = 'source-in'; c4.fillStyle = o.core || P.lampCore; c4.fillRect(0, 0, W, H);
    // erode the core 1px so the ember rim survives
    g.save(); g.drawImage(_t2.c, 0, 0); g.restore();
    // bloom into emissive
    st.em.save(); st.em.globalAlpha = o.bloom == null ? 0.85 : o.bloom; st.em.drawImage(_t2.c, 0, 0); st.em.restore();
    // ember flecks near the edges
    if (o.flecks) { const r = rng('flk' + (o.seed || 1)); const box = o.box; for (let i = 0; i < o.flecks; i++) { const x = box[0] + r() * box[2], y = box[1] + r() * box[3]; const s = 0.8 + r() * 1.8; g.fillStyle = rgba(r() < 0.5 ? P.ember : P.flameHot, 0.6 + r() * 0.4); g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); st.em.fillStyle = P.ember; st.em.beginPath(); st.em.arc(x, y, s * 2.5, 0, 7); st.em.fill(); } }
  }

  // a person-shaped patch where the paper fibre is missing: the bare lamp, a few % too bright, optional 1px char edge
  function fibreMean() {
    if (fibreMean.v) return fibreMean.v; const c = makeCanvas(96, 54), cg = c.getContext('2d'); cg.drawImage(fibreTex(), 0, 0, 96, 54); const d = cg.getImageData(0, 0, 96, 54).data; let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; return (fibreMean.v = [r / n, gg / n, b / n]);
  }
  // a mean-neutral version of the fibre (128 = no change) for soft-light detail passes that show the paper without darkening it
  let _fibreDetail = null;
  function fibreDetail(k) {
    if (_fibreDetail) return _fibreDetail; const src = fibreTex(), c = makeCanvas(W, H), cg = c.getContext('2d'); cg.drawImage(src, 0, 0); const id = cg.getImageData(0, 0, W, H), d = id.data; const m = fibreMean(); k = k || 2.6;
    for (let i = 0; i < d.length; i += 4) { const v = clamp(128 + ((d[i] - m[0]) * 0.5 + (d[i + 1] - m[1]) * 0.3 + (d[i + 2] - m[2]) * 0.2) * k, 0, 255); d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    cg.putImageData(id, 0, 0); return (_fibreDetail = c);
  }
  // a person-shaped patch where the paper fibre is missing: the bare lamp at the sheet's average density, a few % too bright, no fibre, no grain
  let _fibreLow = null;
  function fibreLow() { if (_fibreLow) return _fibreLow; const c = makeCanvas(W, H), cg = c.getContext('2d'); cg.drawImage(fibreTex(), 0, 0); cg.filter = 'blur(18px)'; cg.drawImage(fibreTex(), 0, 0); return (_fibreLow = c); }
  function fibrePatch(st, path, o) {
    o = o || {}; const g = st.ctx; if (!st.lampOnly) return; const b = o.bright == null ? 0.04 : o.bright;
    // the same sheet, same local density, but with its fibre missing, and a few % too bright
    const off = makeCanvas(W, H), oc = off.getContext('2d'); oc.drawImage(st.lampOnly, 0, 0); oc.globalCompositeOperation = 'multiply'; if (st.fibreM) oc.setTransform(st.fibreM); oc.drawImage(fibreLow(), 0, 0); oc.setTransform(1, 0, 0, 1, 0, 0);
    const off2 = makeCanvas(W, H), o2 = off2.getContext('2d'); o2.drawImage(off, 0, 0); o2.globalCompositeOperation = 'lighter'; o2.globalAlpha = b; o2.drawImage(off, 0, 0);
    const tm = g.getTransform(); g.save(); g.clip(path); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(off2, 0, 0); g.restore();
    if (o.charA) { g.save(); g.strokeStyle = rgba(P.char, o.charA); g.lineWidth = o.charW || 1; g.stroke(path); g.restore(); }
    st.patches = (st.patches || []).concat([{ path, m: tm }]);
  }
  // paper detail: soft-light the mean-neutral fibre over everything except the patches
  function paperDetail(st, alpha) {
    const g = st.ctx; const t = tmp(_t2); t.drawImage(fibreDetail(), 0, 0);
    if (st.patches) { t.globalCompositeOperation = 'destination-out'; st.patches.forEach(p => { t.setTransform(p.m); t.fill(p.path); }); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; }
    g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = alpha == null ? 0.6 : alpha; g.drawImage(_t2.c, 0, 0); g.restore();
  }

  // ---------------- finish ----------------
  function finish(st, o) {
    o = Object.assign({ halation: 0.7, grain: 0.08, vignette: 0.55, vigR: 1.15, vigColor: '#1a0c06', weave: 0 }, o || {});
    const g = st.ctx;
    if (o.halation > 0) {
      const hc = makeCanvas(W / 2, H / 2).getContext('2d'); hc.filter = 'blur(7px)'; hc.drawImage(st.em.canvas, 0, 0); hc.filter = 'blur(22px)'; hc.globalAlpha = 0.9; hc.drawImage(st.em.canvas, 0, 0);
      g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = o.halation; g.imageSmoothingQuality = 'high'; g.drawImage(hc.canvas, 0, 0, W, H); g.restore();
    }
    if (o.beforeVignette) o.beforeVignette(g);
    if (o.vignette > 0) {
      const cx = o.vigCenter ? o.vigCenter[0] : W / 2, cy = o.vigCenter ? o.vigCenter[1] : H / 2;
      g.save(); g.translate(cx, cy); g.scale(1, 0.72);
      const vg = g.createRadialGradient(0, 0, H * 0.35, 0, 0, H * o.vigR); vg.addColorStop(0, rgba(o.vigColor, 0)); vg.addColorStop(0.6, rgba(o.vigColor, o.vignette * 0.45)); vg.addColorStop(1, rgba(o.vigColor, o.vignette));
      g.fillStyle = vg; g.fillRect(-W * 2, -H * 2, W * 4, H * 4); g.restore();
    }
    if (o.grain > 0) { const t = tmp(_t2); t.fillStyle = t.createPattern(grainTile(st.seed), 'repeat'); t.fillRect(0, 0, W, H);
      if (st.patches && o.patchNoGrain !== false) { t.globalCompositeOperation = 'destination-out'; st.patches.forEach(p => { t.setTransform(p.m); t.fill(p.path); }); t.setTransform(1, 0, 0, 1, 0, 0); }
      g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = o.grain; g.drawImage(_t2.c, 0, 0); g.restore(); }
  }
  // slate: utility face (IBM Plex Mono), small caps feel, low opacity, top corners
  function slate(st, left, right, o) {
    o = o || {}; const g = st.ctx; g.save(); g.font = '500 19px "IBM Plex Mono"'; g.letterSpacing = '2.5px'; g.fillStyle = o.color || P.lampCore; g.globalAlpha = o.alpha || 0.4;
    g.textBaseline = 'alphabetic'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 6;
    g.textAlign = 'left';
    if (left.indexOf('ONE TOO MANY') === 0) { g.save(); g.font = '400 27px "IM Fell English SC"'; g.letterSpacing = '2px'; g.fillText('One Too Many', 44, 47); const tw = g.measureText('One Too Many').width; g.restore(); g.fillText(left.slice('ONE TOO MANY'.length), 44 + tw + 2, 46); }
    else g.fillText(left, 44, 46);
    g.textAlign = 'right'; g.fillText(right, W - 44, 46); g.restore();
  }

  global.ROD = { P, hex, rgba, mix, fonts, fibreTex, cardTex, stage, scrim, commit, gel, piece, seam, pin, lip, rod, rodSlot, holes, fibrePatch, paperDetail, fibreMean, finish, slate, tmp: () => tmp(_t1) };
})(window);
