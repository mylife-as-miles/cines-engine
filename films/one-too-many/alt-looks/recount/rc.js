/* ONE TOO MANY - LOOK B: "RECOUNT" (the night, rebuilt as evidence)
   Core helpers: palette, 2.5D lit cut-paper rendering (gradient fills, soft cast shadows, light-side rims,
   soft-light pools), post (halation / grain / vignette / paper fibre), THE RECORD (headcount, slug, brackets,
   999 call strip, evidence tents, exhibit labels, measurement lines) and the speaker type faces.
   Reuses only generic parts of kit/otm.js (shape builder, rng, noise, canvas utils). Deterministic. */
(function (G) {
  'use strict';
  const W = 1920, H = 1080;
  const P = {
    umber: '#140E0A', walnut: '#3B2618', tungsten: '#F0A04B', tcore: '#FFD9A0', wine: '#5E1020', wineRing: '#9C2A3D',
    lipstick: '#E0485C', card: '#EDE6D6', pip: '#151214', cardBack: '#24447A', rain: '#5D7480', led: '#2F7BFF',
    kcold: '#D3DEE3', screen: '#E6EEF5', marker: '#E7B520', mustard: '#C9962E', bottle: '#2E4A3A', ember: '#FF5A14',
    flame: '#FFC870', ash: '#8A8178', sred: '#FF1E2E', sblue: '#1E4BFF', void: '#000000',
    oxford: '#8FA6B8', denim: '#26324A', burgundy: '#6B1424', kayRed: '#8C1C2A', tee: '#E9E4DA',
    skin: { scott: '#D2A07F', deena: '#6B4330', angelo: '#B98563', kay: '#E2B996', christof: '#E8B9A0', marina: '#A87452' },
    hair: { scott: '#2A1E17', deena: '#17100C', angelo: '#120E0D', kay: '#0E0B0B', christof: '#8A3A1A', marina: '#1C120E' },
    christofType: '#F4A85C',
  };
  const clamp = OTM.clamp, lerp = OTM.lerp;
  const hexToRgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  const mix = (h1, h2, t) => { const a = hexToRgb(h1), b = hexToRgb(h2); return '#' + a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, '0')).join(''); };
  const cv = (w, h) => OTM.makeCanvas(w || W, h || H);

  // ---------- fonts ----------
  const FACES = ['400 40px "IBM Plex Mono"', '500 40px "IBM Plex Mono"', '600 40px "IBM Plex Mono"', '500 40px "IBM Plex Sans"', '600 40px "IBM Plex Sans"',
    '400 40px "DM Mono"', '800 40px "Barlow Condensed"', 'italic 700 40px "Bodoni Moda"', '400 40px "Bodoni Moda"', 'italic 400 40px "Instrument Serif"',
    '800 40px "Fraunces"', '500 40px "Spectral"', 'italic 600 40px "Spectral"', '900 40px "Archivo"', '700 40px "Archivo"'];
  async function fonts() {
    await OTM.loadFonts('../../fonts/fonts.css');
    await new Promise(res => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '../../fonts/fonts_alt.css'; l.onload = res; l.onerror = res; document.head.appendChild(l); });
    await Promise.all(FACES.map(f => document.fonts.load(f, 'AaBbSsCcott0123456789?!-—.·Δ█[]:')));
    await document.fonts.ready;
  }

  // ---------- gradients ----------
  function stopsOf(gr, stops) { stops.forEach(s => gr.addColorStop(s[0], s[2] == null ? s[1] : rgba(s[1], s[2]))); return gr; }
  const lin = (g, x0, y0, x1, y1, stops) => stopsOf(g.createLinearGradient(x0, y0, x1, y1), stops);
  const rad = (g, x, y, r0, r1, stops, x0, y0) => stopsOf(g.createRadialGradient(x0 == null ? x : x0, y0 == null ? y : y0, r0, x, y, r1), stops);

  // radial pool of light (soft, smooth falloff). mode: 'screen' | 'soft-light' | 'lighter' | 'source-over' | 'multiply'
  function pool(g, x, y, r, color, alpha, o) {
    o = o || {}; g.save(); g.globalCompositeOperation = o.mode || 'screen'; g.globalAlpha = alpha == null ? 1 : alpha;
    g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale(1, o.sy || 1);
    const k = o.core == null ? 0 : o.core;
    g.fillStyle = rad(g, 0, 0, 0, r, [[0, color, 1], [k, color, 1], [o.mid || 0.45, color, o.midA == null ? 0.42 : o.midA], [1, color, 0]]);
    g.fillRect(-r, -r, r * 2, r * 2); g.restore();
  }
  // darken everything outside an ellipse (low-key falloff)
  function falloff(g, x, y, r0, r1, color, alpha, sy) {
    g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = alpha == null ? 1 : alpha; g.translate(x, y); g.scale(1, sy || 1);
    g.fillStyle = rad(g, 0, 0, r0, r1, [[0, color, 0], [1, color, 1]]); g.fillRect(-W * 2, -H * 2, W * 4, H * 4); g.restore();
  }

  // ---------- temp canvases ----------
  const _t = [];
  function tmp(i) { i = i || 0; if (!_t[i]) _t[i] = cv(W, H); const g = _t[i].getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none'; g.clearRect(0, 0, W, H); return g; }

  // ---------- 2.5D lit cut paper ----------
  // Fill a Path2D with an (already built) style, optional drop shadow onto the layer behind, inner shading, and rim.
  // o.shadow = {dx, dy, blur, alpha, color}; o.shade = fn(g) drawn clipped; o.rim = {dx, dy, w, color, alpha, blur}; o.tex alpha
  function paper(g, path, fill, o) {
    o = o || {};
    if (o.shadow) {
      const s = o.shadow; g.save(); g.shadowColor = rgba(s.color || '#000000', s.alpha == null ? 0.5 : s.alpha); g.shadowBlur = s.blur == null ? 12 : s.blur;
      g.shadowOffsetX = s.dx || 0; g.shadowOffsetY = s.dy || 0; g.fillStyle = typeof fill === 'string' ? fill : '#000'; g.fill(path, o.evenodd ? 'evenodd' : 'nonzero'); g.restore();
    }
    g.save(); g.fillStyle = fill; g.fill(path, o.evenodd ? 'evenodd' : 'nonzero'); g.restore();
    if (o.shade) { g.save(); g.clip(path, o.evenodd ? 'evenodd' : 'nonzero'); o.shade(g); g.restore(); }
    if (o.rim) (Array.isArray(o.rim) ? o.rim : [o.rim]).forEach(r => rim(g, path, r));
    if (o.edge) { g.save(); g.strokeStyle = rgba(o.edge.color || '#000', o.edge.alpha == null ? 0.35 : o.edge.alpha); g.lineWidth = o.edge.w || 1; g.stroke(path); g.restore(); }
  }
  // light-side rim: crescent on the side facing the light (dx,dy = unit vector toward the light)
  function rim(g, path, r) {
    const l = Math.hypot(r.dx, r.dy) || 1, ux = r.dx / l, uy = r.dy / l, w = r.w || 2;
    const t = tmp(1); t.fillStyle = r.color; t.fill(path);
    t.globalCompositeOperation = 'destination-out'; t.translate(-ux * w, -uy * w); t.fill(path);
    if (r.inner) { t.setTransform(1, 0, 0, 1, 0, 0); t.translate(-ux * w * r.inner, -uy * w * r.inner); }
    g.save(); g.clip(path); g.globalAlpha = r.alpha == null ? 1 : r.alpha; g.globalCompositeOperation = r.mode || 'screen';
    if (r.blur) g.filter = `blur(${r.blur}px)`; g.drawImage(t.canvas, 0, 0); g.restore();
    if (r.glow) { g.save(); g.globalAlpha = r.glow; g.globalCompositeOperation = 'screen'; g.filter = `blur(${w * 2 + 3}px)`; g.drawImage(t.canvas, 0, 0); g.restore(); }
  }
  // projected cast shadow (skewed onto a floor/wall plane): m = affine [a,b,c,d,e,f] applied to the path
  function cast(g, path, m, o) {
    o = o || {}; const t = tmp(2); t.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); t.fillStyle = o.color || '#000'; t.fill(path);
    g.save(); g.globalAlpha = o.alpha == null ? 0.4 : o.alpha; g.globalCompositeOperation = o.mode || 'multiply'; g.filter = `blur(${o.blur == null ? 10 : o.blur}px)`;
    if (o.clip) g.clip(o.clip); g.drawImage(t.canvas, 0, 0); g.restore();
  }
  // soft occlusion blob (contact shadows)
  function blob(g, x, y, rx, ry, alpha, color) { g.save(); g.globalCompositeOperation = 'multiply'; g.translate(x, y); g.scale(1, ry / rx); g.fillStyle = rad(g, 0, 0, 0, rx, [[0, color || '#000', alpha], [0.6, color || '#000', alpha * 0.45], [1, color || '#000', 0]]); g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); }
  // shape -> path with gentle hand-cut edge (lit paper, not torn noir)
  const pth = (shape, rough, seed) => shape.path(rough == null ? 0.45 : rough, seed == null ? 5 : seed);
  // tapered limb as Path2D through points with radii [[x,y,r],...]
  function limb(pts, rough, seed) { const s = OTM.S(); for (let i = 0; i < pts.length - 1; i++) s.capsule(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2]); return pth(s, rough == null ? 0.3 : rough, seed); }
  // smooth closed curve (Catmull-Rom) through points -> OTM shape polygon
  function smooth(pts, closed, steps) {
    steps = steps || 8; const n = pts.length, out = [];
    const get = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      for (let k = 0; k < steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        out.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }
  function polyPath(pts, closed) { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); if (closed !== false) p.closePath(); return p; }
  const smoothPath = (pts, steps) => polyPath(smooth(pts, true, steps));

  // ---------- textures ----------
  let _fibre = null, _grain = [];
  function fibreTile() {
    if (_fibre) return _fibre; const c = cv(512, 512), g = c.getContext('2d'); const id = g.createImageData(512, 512); const d = id.data;
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const v = 128 + (OTM.fbm(x / 64, y / 64, 31, 4) - 0.5) * 34 + (OTM.vnoise(x / 3.1, y / 3.1, 77) - 0.5) * 16;
      const i = (y * 512 + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    g.putImageData(id, 0, 0); const r = OTM.rng('fibre-rc'); g.lineCap = 'round';
    for (let k = 0; k < 900; k++) { const x = r() * 512, y = r() * 512, a = r() * Math.PI, l = 4 + r() * 18; g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'; g.lineWidth = 0.6 + r() * 0.7; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 4, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 4, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    _fibre = c; return c;
  }
  function grainTile(seed) {
    if (_grain[seed]) return _grain[seed]; const c = cv(512, 512), g = c.getContext('2d'), id = g.createImageData(512, 512), d = id.data, r = OTM.rng('grain' + seed);
    for (let i = 0; i < 512 * 512; i++) { const v = 128 + ((r() + r() + r()) / 3 - 0.5) * 255 * 0.9; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    g.putImageData(id, 0, 0); _grain[seed] = c; return c;
  }
  function texture(g, alpha, mode, clipPath) {
    g.save(); if (clipPath) g.clip(clipPath); g.globalCompositeOperation = mode || 'soft-light'; g.globalAlpha = alpha; g.fillStyle = g.createPattern(fibreTile(), 'repeat'); g.fillRect(0, 0, W, H); g.restore();
  }

  // ---------- post (applies to the night + dialogue layers only, never to the record) ----------
  function halation(ctx, o) {
    o = o || {}; const qw = 480, qh = 270, q = cv(qw, qh), qg = q.getContext('2d'); qg.drawImage(ctx.canvas, 0, 0, qw, qh);
    const id = qg.getImageData(0, 0, qw, qh), d = id.data, th = o.thresh == null ? 0.8 : o.thresh, tint = hexToRgb(o.tint || '#FF7A3A');
    for (let i = 0; i < d.length; i += 4) {
      const L = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; const k = clamp((L - th) / (1 - th), 0, 1);
      d[i] = (d[i] * 0.45 + tint[0] * 0.55) * k; d[i + 1] = (d[i + 1] * 0.45 + tint[1] * 0.55) * k; d[i + 2] = (d[i + 2] * 0.45 + tint[2] * 0.55) * k; d[i + 3] = 255;
    }
    qg.putImageData(id, 0, 0);
    const b = cv(qw, qh), bg = b.getContext('2d'); bg.filter = `blur(${(o.blur || 12) / 4}px)`; bg.drawImage(q, 0, 0); bg.filter = `blur(${(o.blur || 12) / 1.5}px)`; bg.globalCompositeOperation = 'lighter'; bg.globalAlpha = 0.8; bg.drawImage(q, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = o.alpha == null ? 0.3 : o.alpha; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(b, 0, 0, W, H); ctx.restore();
  }
  function vignette(ctx, amt, cx, cy) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; const x = cx == null ? W / 2 : cx, y = cy == null ? H / 2 : cy;
    ctx.translate(x, y); ctx.scale(1, 0.62); ctx.fillStyle = rad(ctx, 0, 0, W * 0.28, W * 0.78, [[0, '#ffffff'], [1, mix('#ffffff', '#140E0A', amt)]]); ctx.fillRect(-W * 2, -H * 3, W * 4, H * 6); ctx.restore();
  }
  function grain(ctx, alpha, seed) {
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = alpha; const t = grainTile(seed || 1); const r = OTM.rng('go' + seed);
    const ox = Math.floor(r() * 512), oy = Math.floor(r() * 512); ctx.translate(-ox, -oy); ctx.fillStyle = ctx.createPattern(t, 'repeat'); ctx.fillRect(0, 0, W + 512, H + 512); ctx.restore();
  }
  // composite grade helpers
  function grade(ctx, o) {
    ctx.save();
    if (o.lift) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = o.lift; ctx.fillRect(0, 0, W, H); }
    if (o.gain) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = o.gain; ctx.fillRect(0, 0, W, H); }
    if (o.desat) { ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = o.desat; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  // ---------- type ----------
  const font = (w, s, fam, st) => `${st || 'normal'} ${w} ${s}px "${fam}"`;
  function scrim(ctx, x, y, rx, ry, a) { ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.fillStyle = rad(ctx, 0, 0, 0, rx, [[0, P.umber, a == null ? 0.35 : a], [0.55, P.umber, (a == null ? 0.35 : a) * 0.7], [1, P.umber, 0]]); ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore(); }
  // SCOTT: IBM Plex Sans 500, screen white, typed with a 2px caret
  function sayScott(ctx, str, x, y, o) {
    o = o || {}; const s = o.size || 56; ctx.save(); ctx.font = font(500, s, 'IBM Plex Sans'); ctx.letterSpacing = (o.tracking == null ? -0.5 : o.tracking) + 'px';
    const w = ctx.measureText(str).width; if (o.scrim !== false) scrim(ctx, x + w / 2 + 10, y - s * 0.35, w * 0.9 + 120, s * 1.5, 0.38);
    ctx.fillStyle = rgba(P.screen, o.alpha == null ? 1 : o.alpha); ctx.fillText(str, x, y);
    if (o.caret !== false) { ctx.fillStyle = P.screen; ctx.fillRect(x + w + (o.caretGap || 6), y - s * 0.78, 2.5, s * 0.98); }
    ctx.restore(); return w;
  }
  // DEENA: Barlow Condensed 800 caps, evidence yellow, 2px umber outline, optional leader line to what she noticed
  function sayDeena(ctx, str, x, y, o) {
    o = o || {}; const s = o.size || 64; ctx.save(); ctx.font = font(800, s, 'Barlow Condensed'); ctx.letterSpacing = (s * 0.02) + 'px';
    const t = str.toUpperCase(), w = ctx.measureText(t).width; if (o.scrim !== false) scrim(ctx, x + w / 2, y - s * 0.35, w * 0.8 + 100, s * 1.3, 0.35);
    if (o.leader) {
      const [lx, ly] = o.leader, sx = o.leaderFrom ? o.leaderFrom[0] : x + w + 12, sy = o.leaderFrom ? o.leaderFrom[1] : y - s * 0.34;
      ctx.strokeStyle = rgba(P.marker, 0.95); ctx.lineWidth = 1.25; ctx.beginPath(); ctx.moveTo(sx, sy);
      if (o.elbow) { ctx.lineTo(o.elbow[0], o.elbow[1]); } ctx.lineTo(lx, ly); ctx.stroke();
      ctx.fillStyle = P.marker; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(lx, ly, 6, 0, Math.PI * 2); ctx.lineWidth = 1.5; ctx.stroke(); ctx.beginPath(); ctx.arc(lx, ly, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineJoin = 'round'; ctx.strokeStyle = P.umber; ctx.lineWidth = 4; ctx.strokeText(t, x, y); ctx.fillStyle = o.color || P.marker; ctx.fillText(t, x, y);
    ctx.restore(); return w;
  }
  // THE VOICE: the word drawn six times on one anchor, once in each cast face, card-stock at 22%. Drawn after post.
  const VOICE_FACES = [
    { f: font(500, 1, 'IBM Plex Sans'), k: 1.0 }, { f: font(800, 1, 'Barlow Condensed'), k: 1.12 }, { f: font(700, 1, 'Bodoni Moda', 'italic'), k: 1.02 },
    { f: font(400, 1, 'Instrument Serif', 'italic'), k: 1.22 }, { f: font(800, 1, 'Fraunces'), k: 0.96 }, { f: font(500, 1, 'Spectral'), k: 1.06 }];
  function sayVoice(ctx, str, x, y, size, o) {
    o = o || {}; ctx.save(); ctx.textAlign = 'center';
    VOICE_FACES.forEach((v, i) => { ctx.font = v.f.replace(' 1px', ` ${Math.round(size * v.k)}px`); ctx.fillStyle = rgba(o.color || P.card, o.alpha || 0.22); ctx.fillText(str, x + (o.jx ? o.jx[i] : 0), y + (o.jy ? o.jy[i] : 0)); });
    ctx.restore();
  }

  // ---------- THE RECORD (crisp vector, drawn after post) ----------
  const REC = { a: 0.55 };
  function monoText(ctx, str, x, y, o) {
    o = o || {}; ctx.save(); ctx.font = font(o.weight || 500, o.size || 20, o.family || 'IBM Plex Mono'); ctx.letterSpacing = (o.tracking == null ? 1 : o.tracking) + 'px';
    ctx.textAlign = o.align || 'left'; ctx.fillStyle = rgba(o.color || P.card, o.alpha == null ? REC.a : o.alpha); ctx.fillText(str, x, y); const w = ctx.measureText(str).width; ctx.restore(); return w;
  }
  function brackets(ctx, inset, o) {
    o = o || {}; const ix = W * inset, iy = H * inset * 1.0, L = o.len || 44; ctx.save(); ctx.strokeStyle = rgba(P.card, o.alpha == null ? 0.5 : o.alpha); ctx.lineWidth = 1.5; ctx.lineCap = 'square';
    [[ix, iy, 1, 1], [W - ix, iy, -1, 1], [ix, H - iy, 1, -1], [W - ix, H - iy, -1, -1]].forEach(([x, y, sx, sy]) => { ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke(); });
    if (o.center) { ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(W / 2 - 10, H / 2); ctx.lineTo(W / 2 + 10, H / 2); ctx.moveTo(W / 2, H / 2 - 10); ctx.lineTo(W / 2, H / 2 + 10); ctx.stroke(); }
    ctx.restore();
  }
  // place / time slug, top-left
  function slug(ctx, place, time, o) {
    o = o || {}; const x = o.x || W * 0.05 + 2, y = o.y || H * 0.05 + 46, a = o.alpha == null ? REC.a : o.alpha;
    const w = monoText(ctx, place, x, y, { size: 21, weight: 500, tracking: 2.2, alpha: a });
    monoText(ctx, '·', x + w + 12, y, { size: 21, alpha: a * 0.8 });
    monoText(ctx, time, x + w + 34, y, { size: 21, weight: 500, tracking: 1.5, alpha: a, color: o.timeColor });
    if (o.sub) monoText(ctx, o.sub, x, y + 26, { size: 13, weight: 400, tracking: 2.5, alpha: a * 0.7 });
  }
  // HEADCOUNT odometer, top-right. Always true.
  function headcount(ctx, n, o) {
    o = o || {}; const a = o.alpha == null ? REC.a : o.alpha, s = 34, cw = 30, ch = 46, gap = 4;
    const xr = o.x || W - W * 0.05 - 2, y = o.y || H * 0.05 + 18; const x0 = xr - (cw * 2 + gap);
    monoText(ctx, 'HEADCOUNT', x0 - 14, y + 31, { size: 13, weight: 500, tracking: 2.5, alpha: a * 0.75, align: 'right' });
    const ds = String(n).padStart(2, '0');
    for (let i = 0; i < 2; i++) {
      const x = x0 + i * (cw + gap), d = +ds[i]; ctx.save();
      ctx.strokeStyle = rgba(P.card, a * 0.55); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, cw, ch);
      ctx.beginPath(); ctx.rect(x + 1, y + 1, cw - 1, ch - 1); ctx.clip();
      ctx.fillStyle = rgba(P.umber, Math.min(0.55, a)); ctx.fillRect(x, y, cw + 1, ch + 1);
      ctx.font = font(500, s, 'IBM Plex Mono'); ctx.textAlign = 'center';
      ctx.fillStyle = rgba(P.card, a); ctx.fillText(String(d), x + cw / 2 + 0.5, y + ch / 2 + s * 0.36);
      ctx.fillStyle = rgba(P.card, a * 0.22); ctx.fillText(String((d + 9) % 10), x + cw / 2 + 0.5, y + ch / 2 + s * 0.36 - s * 1.12); ctx.fillText(String((d + 1) % 10), x + cw / 2 + 0.5, y + ch / 2 + s * 0.36 + s * 1.12);
      // drum shading
      ctx.fillStyle = lin(ctx, 0, y, 0, y + ch, [[0, P.umber, 0.75], [0.3, P.umber, 0], [0.7, P.umber, 0], [1, P.umber, 0.75]]); ctx.fillRect(x, y, cw + 1, ch + 1);
      ctx.restore();
    }
    if (o.flag) monoText(ctx, o.flag, xr, y + ch + 22, { size: 13, weight: 500, tracking: 2, alpha: a * 0.8, align: 'right', color: o.flagColor });
  }
  // small label: look + moment (presentation, bottom-right corner)
  function lookLabel(ctx, moment, o) {
    o = o || {}; const y = o.y || H - 16, x = W - 22; ctx.save(); ctx.font = font(500, 13, 'IBM Plex Mono'); ctx.letterSpacing = '2.2px'; ctx.textAlign = 'right';
    if (o.scrim !== false) { const tw = ctx.measureText('ONE TOO MANY · LOOK B: RECOUNT · ' + moment).width; ctx.fillStyle = lin(ctx, x - tw - 60, 0, x - tw, 0, [[0, P.umber, 0], [1, P.umber, 0.72]]); ctx.fillRect(x - tw - 60, y - 17, 60, 26); ctx.fillStyle = rgba(P.umber, 0.72); ctx.fillRect(x - tw, y - 17, tw + 22, 26); }
    ctx.fillStyle = rgba(P.card, 0.5); ctx.fillText('ONE TOO MANY · LOOK B: RECOUNT', x - ctx.measureText(' · ' + moment).width - 2, y);
    ctx.fillStyle = rgba(P.marker, 0.85); ctx.fillText(' · ' + moment, x, y); ctx.restore();
  }
  // dashed measurement line with end ticks and a callout
  function measure(ctx, x1, y1, x2, y2, label, o) {
    o = o || {}; ctx.save(); ctx.strokeStyle = rgba(o.color || P.card, o.alpha == null ? 0.6 : o.alpha); ctx.lineWidth = 1.2; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
    const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a) * 8, ny = Math.cos(a) * 8;
    [[x1, y1], [x2, y2]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - nx, y - ny); ctx.lineTo(x + nx, y + ny); ctx.stroke(); });
    if (label) { ctx.translate((x1 + x2) / 2, (y1 + y2) / 2); let r = a; if (r > Math.PI / 2 || r < -Math.PI / 2) r += Math.PI; ctx.rotate(r); ctx.font = font(500, o.size || 14, 'IBM Plex Mono'); ctx.letterSpacing = '1.5px'; ctx.textAlign = 'center'; ctx.fillStyle = rgba(o.color || P.card, (o.alpha == null ? 0.6 : o.alpha) + 0.15); ctx.fillText(label, 0, o.below ? 20 : -9); }
    ctx.restore();
  }
  // numbered evidence tent (marker yellow A-frame), seen from above at an angle. (x,y) = ground contact centre
  function tent(ctx, x, y, n, o) {
    o = o || {}; const s = o.s || 1, rot = o.rot || 0; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    const w = 46, hF = 40, hB = 16;
    // cast shadow
    ctx.save(); ctx.filter = 'blur(5px)'; ctx.fillStyle = 'rgba(10,6,4,0.55)'; ctx.beginPath(); ctx.moveTo(-w / 2 + 4, 2); ctx.lineTo(w / 2 + 4, 2); ctx.lineTo(w / 2 + 16, 14 + (o.shLen || 10)); ctx.lineTo(-w / 2 + 16, 14 + (o.shLen || 10)); ctx.closePath(); ctx.fill(); ctx.restore();
    // back face (darker, visible above)
    ctx.fillStyle = lin(ctx, 0, -hF - hB, 0, -hF, [[0, '#8A6A12'], [1, '#B48A16']]); ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -hF); ctx.lineTo(-w / 2 + 6, -hF - hB); ctx.lineTo(w / 2 - 6, -hF - hB); ctx.lineTo(w / 2 - 2, -hF); ctx.closePath(); ctx.fill();
    // front face
    ctx.fillStyle = lin(ctx, 0, -hF, 0, 0, [[0, '#F6CF46'], [0.55, P.marker], [1, '#C99A12']]); ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -hF); ctx.lineTo(w / 2 - 2, -hF); ctx.lineTo(w / 2, 0); ctx.lineTo(-w / 2, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,180,0.85)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -hF); ctx.lineTo(w / 2 - 2, -hF); ctx.stroke();
    ctx.fillStyle = P.pip; ctx.font = font(600, 30, 'IBM Plex Mono'); ctx.textAlign = 'center'; ctx.fillText(String(n), 0, -9);
    ctx.fillRect(-w / 2 + 6, -hF + 5, w - 12, 1.5);
    ctx.restore();
  }
  // 999 call strip: rolling waveform, call timer, two-line live transcript (DM Mono), Plex Mono time prefixes
  function callStrip(ctx, o) {
    const y = o.y, h = o.h, x0 = o.x0 || W * 0.05, x1 = o.x1 || W * 0.95;
    ctx.save();
    ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, P.umber, 0.82], [1, '#0B0806', 0.9]]); ctx.fillRect(x0, y, x1 - x0, h);
    ctx.strokeStyle = rgba(P.screen, 0.22); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y + 0.5); ctx.lineTo(x1, y + 0.5); ctx.stroke();
    // timer block
    const tx = x0 + 24; ctx.fillStyle = P.sred; ctx.beginPath(); ctx.arc(tx + 6, y + 34, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.globalAlpha = 0.35; ctx.filter = 'blur(4px)'; ctx.beginPath(); ctx.arc(tx + 6, y + 34, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    monoText(ctx, o.timer, tx + 22, y + 44, { size: 30, weight: 500, tracking: 1, alpha: 0.92, color: P.screen });
    monoText(ctx, o.sub || 'EMERGENCY CALL · CONNECTED', tx + 1, y + h - 22, { size: 12, weight: 500, tracking: 2.4, alpha: 0.45, color: P.screen });
    // waveform: 4 s window, 2px bars on 4px pitch
    const wx = o.waveX || x0 + 300, ww = o.waveW || 420, wy = y + h / 2, wh = h * 0.36; const r = OTM.rng(o.seed || 'wave');
    ctx.fillStyle = rgba(P.screen, 0.12); ctx.fillRect(wx, wy - 0.5, ww, 1);
    const nb = Math.floor(ww / 4);
    for (let i = 0; i < nb; i++) {
      const u = i / nb, seg = (o.segs || []).find(sg => u >= sg[0] && u < sg[1]); let amp;
      if (!seg) amp = 0.02 + r() * 0.05; // line floor
      else if (seg[2] === 'd') { const env = Math.sin(Math.PI * (u - seg[0]) / (seg[1] - seg[0])); amp = (0.42 + 0.28 * Math.sin(i * 0.9) * Math.sin(i * 0.23)) * (0.55 + 0.45 * env) + r() * 0.08; }
      else { const env = Math.sin(Math.PI * (u - seg[0]) / (seg[1] - seg[0])); amp = Math.min(1, (0.5 + r() * 0.75) * (0.4 + env)); }
      const bh = Math.max(1, amp * wh); ctx.fillStyle = seg && seg[2] === 's' ? rgba(P.ember, 0.75) : rgba(P.screen, seg ? 0.72 : 0.3);
      ctx.fillRect(wx + i * 4, wy - bh, 2, bh * 2);
    }
    // playhead
    ctx.fillStyle = rgba(P.screen, 0.6); ctx.fillRect(wx + ww + 3, y + 14, 1, h - 28);
    monoText(ctx, '−4s', wx, y + h - 10, { size: 10, alpha: 0.3, color: P.screen, tracking: 1 }); monoText(ctx, 'NOW', wx + ww, y + h - 10, { size: 10, alpha: 0.4, color: P.screen, tracking: 1, align: 'right' });
    // transcript
    const lx = o.textX || wx + ww + 44; const lh = o.lineH || 40;
    (o.lines || []).forEach((ln, i) => {
      const ly = y + (o.textY || 40) + i * lh, a = ln[2] == null ? 0.9 : ln[2];
      const pw = monoText(ctx, ln[0], lx, ly, { size: 18, weight: 500, tracking: 0.5, alpha: a * 0.6, color: P.screen });
      ctx.save(); ctx.font = font(400, o.textSize || 34, 'DM Mono'); ctx.letterSpacing = '0px'; ctx.fillStyle = rgba(P.screen, a); ctx.fillText(ln[1], lx + pw + 14, ly); ctx.restore();
    });
    ctx.restore();
  }

  // ---------- halftone (EXHIBIT freezes) ----------
  // samples src canvas; draws pip-ink dots on a 45deg screen into ctx (already transformed to print space)
  function halftone(ctx, src, o) {
    o = o || {}; const step = o.step || 8, ang = o.angle == null ? Math.PI / 4 : o.angle; const sw = src.width, sh = src.height;
    const sm = cv(Math.ceil(sw / 2), Math.ceil(sh / 2)), sg = sm.getContext('2d'); sg.filter = `blur(${o.preBlur == null ? step / 5 : o.preBlur}px)`; sg.drawImage(src, 0, 0, sm.width, sm.height);
    const d = sg.getImageData(0, 0, sm.width, sm.height).data; const val = (x, y) => { const xi = clamp(Math.round(x / 2), 0, sm.width - 1), yi = clamp(Math.round(y / 2), 0, sm.height - 1), i = (yi * sm.width + xi) * 4; return (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255; };
    const ca = Math.cos(ang), sa = Math.sin(ang), R = Math.hypot(sw, sh); ctx.fillStyle = o.ink || P.pip;
    const gam = o.gamma || 1.0, lift = o.lift || 0;
    for (let v = -R; v < R; v += step) for (let u = -R; u < R; u += step) {
      const x = sw / 2 + u * ca - v * sa, y = sh / 2 + u * sa + v * ca; if (x < -step || y < -step || x > sw + step || y > sh + step) continue;
      let L = val(x, y); if (o.levels) { const [lo, hi, gm] = o.levels; L = Math.pow(clamp((L - lo) / (hi - lo), 0, 1), gm); } else L = Math.pow(L, o.curve || 1);
      L = clamp(L + lift, 0, 1); const dark = Math.pow(1 - L, gam); if (dark < 0.03) continue;
      const r = Math.sqrt(dark) * step * (o.maxR || 0.76); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  G.RC = { W, H, P, rgba, mix, hexToRgb, clamp, lerp, cv, fonts, lin, rad, pool, falloff, tmp, paper, rim, cast, blob, pth, limb, smooth, polyPath, smoothPath,
    fibreTile, grainTile, texture, halation, vignette, grain, grade, font, scrim, sayScott, sayDeena, sayVoice, monoText, brackets, slug, headcount, lookLabel,
    measure, tent, callStrip, halftone, REC };
})(window);
