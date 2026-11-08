/* Crownfall: Aethelgard, end credits. A film by Osita Miles, drawn entirely in code (Canvas 2D).
   FILM.renderAt(t) draws any instant deterministically (no Math.random, no Date): the player scrubs it and the exporter
   steps it at 24 fps. The cards come from film/data.js (window.CREDITS), built from the repository's own credits. */
(function () {
  'use strict';
  const W = 1920, H = 1080, FPS = 24;
  const TOTAL = 182.25;                       // Sanguis et Terra runs 182.28 s; the picture ends on its last silence

  // ---------- deterministic helpers ----------
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const ease = t => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  // fade in over [a, a+fi], hold, fade out over [b-fo, b]
  const window_ = (t, a, b, fi, fo) => smooth(span(t, a, a + fi)) * (1 - smooth(span(t, b - fo, b)));

  // ---------- palette: blood and earth ----------
  const P = {
    ink: '#040303', bone: '#efe7d6', ash: '#9b9488', dim: '#6f685e', gold: '#cfa75f', goldHi: '#f1d9a0',
    ember: [[226, 150, 74], [205, 104, 48], [150, 44, 30], [236, 208, 160], [180, 70, 40]],
  };

  // ---------- particles (bokeh embers, sparks, ash) ----------
  const R = rng(7101);
  const BOKEH = Array.from({ length: 64 }, () => ({
    x: R() * W, y: R() * H, z: 0.25 + R() * 0.75, r: 8 + R() * 38, c: P.ember[Math.floor(R() * P.ember.length)],
    a: 0.035 + R() * 0.11, sp: 6 + R() * 16, sw: 10 + R() * 30, f: 0.05 + R() * 0.2, ph: R() * 6.283,
  }));
  const SPARKS = Array.from({ length: 34 }, () => ({
    x: R() * W, y: R() * H, s: 0.8 + R() * 1.8, sp: 22 + R() * 46, sw: 14 + R() * 40, f: 0.2 + R() * 0.6, ph: R() * 6.283,
    life: 5 + R() * 9, off: R() * 14, c: P.ember[Math.floor(R() * 3)],
  }));
  const ASH = Array.from({ length: 40 }, () => ({ x: R() * W, y: R() * H, s: 0.6 + R() * 1.3, sp: 4 + R() * 9, sw: 20 + R() * 40, ph: R() * 6.283 }));

  let ctx, canvas, grain = [];
  function makeGrain() {
    for (let k = 0; k < 4; k++) {
      const g = document.createElement('canvas'); g.width = g.height = 256; const gc = g.getContext('2d'); const img = gc.createImageData(256, 256); const r = rng(900 + k);
      for (let i = 0; i < img.data.length; i += 4) { const v = Math.floor(r() * 255); img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      gc.putImageData(img, 0, 0); grain.push(g);
    }
  }

  function background(t, heat) {
    ctx.fillStyle = P.ink; ctx.fillRect(0, 0, W, H);
    // a low ember glow at the foot of the frame, breathing slowly; brighter under the title
    const g = ctx.createRadialGradient(W / 2, H * 1.15, 40, W / 2, H * 1.15, H * 0.95);
    const b = 0.07 + 0.03 * Math.sin(t * 0.35) + heat * 0.08;
    g.addColorStop(0, `rgba(120,34,18,${b})`); g.addColorStop(0.55, `rgba(60,16,10,${b * 0.45})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of BOKEH) {
      const y = ((p.y - t * p.sp * p.z) % (H + 120) + H + 120) % (H + 120) - 60;
      const x = p.x + Math.sin(t * p.f + p.ph) * p.sw * p.z;
      const fl = 0.65 + 0.35 * Math.sin(t * (0.4 + p.f * 2) + p.ph * 3);
      const a = p.a * fl * (0.7 + heat * 0.6), r = p.r * (0.6 + p.z * 0.6);
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${a * 0.55})`);
      gr.addColorStop(0.72, `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${a})`);
      gr.addColorStop(0.86, `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${a * 0.65})`);
      gr.addColorStop(1, `rgba(${p.c[0]},${p.c[1]},${p.c[2]},0)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    }
    for (const s of SPARKS) {
      const age = ((t + s.off) % s.life) / s.life;           // each spark rises, glows and dies, then is born again
      const y = s.y - age * s.sp * s.life; const yy = ((y % (H + 40)) + H + 40) % (H + 40) - 20;
      const x = s.x + Math.sin(t * s.f + s.ph) * s.sw;
      const a = Math.sin(age * Math.PI) * (0.55 + heat * 0.35) * (0.6 + 0.4 * Math.sin(t * 7 + s.ph));
      const gr = ctx.createRadialGradient(x, yy, 0, x, yy, s.s * 6);
      gr.addColorStop(0, `rgba(255,${190 + s.c[1] % 40},${120},${a})`); gr.addColorStop(0.3, `rgba(${s.c[0]},${s.c[1]},${s.c[2]},${a * 0.5})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, yy, s.s * 6, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(150,140,128,0.22)';
    for (const p of ASH) {                                   // ash drifts down against the rising embers
      const y = ((p.y + t * p.sp) % (H + 20) + H + 20) % (H + 20) - 10, x = p.x + Math.sin(t * 0.3 + p.ph) * p.sw;
      ctx.fillRect(x, y, p.s, p.s);
    }
  }

  function finish(t) {
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.92);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    const f = Math.floor(t * FPS); const g = grain[f % 4]; const r = rng(f * 31 + 5);
    ctx.save(); ctx.globalAlpha = 0.045; ctx.globalCompositeOperation = 'overlay';
    const ox = Math.floor(r() * 256), oy = Math.floor(r() * 256);
    for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(g, x, y);
    ctx.restore();
  }

  // ---------- text ----------
  function txt(s, x, y, font, color, spacing, align, alpha) {
    ctx.save(); ctx.font = font; ctx.letterSpacing = (spacing || 0) + 'px'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.fillStyle = color;
    // letter-spacing adds trailing space after the last glyph: shift centred text back by half of it
    const dx = (align || 'center') === 'center' ? (spacing || 0) / 2 : 0;
    ctx.fillText(s, x + dx, y); ctx.restore();
  }
  function width(s, font, spacing) { ctx.save(); ctx.font = font; ctx.letterSpacing = (spacing || 0) + 'px'; const w = ctx.measureText(s).width - (spacing || 0); ctx.restore(); return w; }

  // ---------- PROJECT EON: an original mark. The O is a drawn ring, an orbit; a spark keeps its time. ----------
  function studio(t, a0, a1) {
    const lt = t - a0, A = window_(t, a0, a1, 0.6, 1.4);
    if (A <= 0) return;
    const cx = W / 2, cy = 520, R0 = 74;
    ctx.save(); ctx.globalAlpha = A;
    // faint eclipse light inside the ring, growing as the spark completes its first orbit
    const ec = smooth(span(lt, 1.0, 4.0));
    if (ec > 0) {
      const gx = cx + Math.cos(-0.7) * R0 * 0.35, gy = cy + Math.sin(-0.7) * R0 * 0.35;
      const g = ctx.createRadialGradient(gx, gy, 0, cx, cy, R0 * 1.02);
      g.addColorStop(0, `rgba(241,217,160,${0.0})`); g.addColorStop(0.82, `rgba(241,217,160,${0.025 * ec})`); g.addColorStop(0.97, `rgba(241,217,160,${0.16 * ec})`); g.addColorStop(1, 'rgba(241,217,160,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R0 * 1.02, 0, 6.283); ctx.fill();
    }
    // ring traced clockwise from the top
    const draw = ease(span(lt, 0.4, 2.2));
    ctx.strokeStyle = P.bone; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, R0, -Math.PI / 2, -Math.PI / 2 + draw * Math.PI * 2); ctx.stroke();
    // the spark: draws the ring, then keeps orbiting with a comet tail
    const ang = lt < 2.2 ? -Math.PI / 2 + draw * Math.PI * 2 : -Math.PI / 2 + Math.PI * 2 + (lt - 2.2) * 1.05;
    const tail = 0.9;
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 28; k++) {
      const a = ang - (k / 28) * tail, al = (1 - k / 28) * 0.55;
      ctx.strokeStyle = `rgba(241,217,160,${al})`; ctx.lineWidth = 3.2 * (1 - k / 28) + 0.6;
      ctx.beginPath(); ctx.arc(cx, cy, R0, a - tail / 28, a); ctx.stroke();
    }
    const sx = cx + Math.cos(ang) * R0, sy = cy + Math.sin(ang) * R0;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26); sg.addColorStop(0, 'rgba(255,240,205,0.95)'); sg.addColorStop(0.25, 'rgba(241,190,110,0.45)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, 6.283); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // E and N, drawn stroke by stroke at the ring's height
    const hgt = R0 * 2, top = cy - R0, gap = 48;
    const eL = cx - R0 - gap - 86, nL = cx + R0 + gap;
    const strokes = [
      [[eL + 86, top], [eL, top], [eL, top + hgt], [eL + 86, top + hgt]],   // E: top, spine, foot
      [[eL, cy], [eL + 66, cy]],                                            // E: arm
      [[nL, top + hgt], [nL, top], [nL + 100, top + hgt], [nL + 100, top]],  // N
    ];
    const lp = span(lt, 1.6, 3.0);
    ctx.strokeStyle = P.bone; ctx.lineWidth = 2.2; ctx.lineJoin = 'miter';
    strokes.forEach((s, i) => {
      const p = ease(clamp(lp * 1.6 - i * 0.3, 0, 1)); if (p <= 0) return;
      let len = 0; const seg = []; for (let k = 1; k < s.length; k++) { const d = Math.hypot(s[k][0] - s[k - 1][0], s[k][1] - s[k - 1][1]); seg.push(d); len += d; }
      let left = len * p; ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]);
      for (let k = 1; k < s.length && left > 0; k++) { const d = seg[k - 1], u = Math.min(1, left / d); ctx.lineTo(lerp(s[k - 1][0], s[k][0], u), lerp(s[k - 1][1], s[k][1], u)); left -= d; }
      ctx.stroke();
    });
    // PROJECT, wide-tracked, and a rule that opens beneath
    const pa = smooth(span(lt, 2.6, 3.8));
    txt('PROJECT', cx, top - 52, '500 22px "Barlow Condensed"', P.ash, 16, 'center', pa);
    const rw = 300 * ease(span(lt, 2.9, 4.2));
    if (rw > 1) { ctx.globalAlpha = A * 0.55; ctx.fillStyle = P.gold; ctx.fillRect(cx - rw / 2, top + hgt + 56, rw, 1.2); }
    ctx.restore();
  }

  // ---------- the crown: an original line glyph ----------
  function crown(cx, cy, s, p, color, alpha) {
    // five points over a band, jewels at the tips; p (0..1) draws it on
    const pts = [[-1, 0.15], [-1, -0.55], [-0.62, -0.18], [-0.3, -0.82], [0, -0.3], [0.3, -0.82], [0.62, -0.18], [1, -0.55], [1, 0.15]];
    const path = pts.map(q => [cx + q[0] * s, cy + q[1] * s]);
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'miter'; ctx.lineCap = 'round';
    let len = 0; const seg = []; for (let k = 1; k < path.length; k++) { const d = Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]); seg.push(d); len += d; }
    let left = len * ease(p); ctx.beginPath(); ctx.moveTo(path[0][0], path[0][1]);
    for (let k = 1; k < path.length && left > 0; k++) { const d = seg[k - 1], u = Math.min(1, left / d); ctx.lineTo(lerp(path[k - 1][0], path[k][0], u), lerp(path[k - 1][1], path[k][1], u)); left -= d; }
    ctx.stroke();
    const band = smooth(span(p, 0.7, 1));
    if (band > 0) {
      ctx.globalAlpha = alpha * band; ctx.beginPath(); ctx.moveTo(cx - s, cy + 0.15 * s); ctx.lineTo(cx + s, cy + 0.15 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s, cy + 0.32 * s); ctx.lineTo(cx + s, cy + 0.32 * s); ctx.stroke();
      ctx.fillStyle = color; for (const q of [pts[1], pts[3], pts[5], pts[7]]) { ctx.beginPath(); ctx.arc(cx + q[0] * s, cy + q[1] * s - 5, 3.2, 0, 6.283); ctx.fill(); }
      ctx.beginPath(); ctx.arc(cx, cy + 0.235 * s, 3, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- CROWNFALL: AETHELGARD ----------
  const titleCanvas = { c: null };
  function titleLayer() {
    if (titleCanvas.c) return titleCanvas.c;
    const c = document.createElement('canvas'); c.width = W; c.height = 300; titleCanvas.c = c; return c;
  }
  function title(t, a0, a1, opts) {
    opts = opts || {};
    const lt = t - a0, A = window_(t, a0, a1, 0.4, 1.6); if (A <= 0) return;
    const cx = W / 2, base = opts.base || 560, size = opts.size || 156, sp = opts.spacing || 22;
    const word = 'CROWNFALL', font = `600 ${size}px Cinzel`;
    ctx.save(); ctx.globalAlpha = A;
    // warm glow behind the word
    const glow = smooth(span(lt, 0.6, 3.5)) * (opts.small ? 0.5 : 1);
    const g = ctx.createRadialGradient(cx, base - size * 0.35, 10, cx, base - size * 0.35, 760);
    g.addColorStop(0, `rgba(150,52,26,${0.13 * glow})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    crown(cx, base - size - 70, opts.small ? 34 : 46, span(lt, 0.2, 2.2), P.gold, 0.95);
    // letters arrive one by one out of a soft blur, rising a few pixels
    const lay = titleLayer(), lc = lay.getContext('2d'); lc.clearRect(0, 0, W, 300);
    lc.font = font; lc.letterSpacing = '0px'; lc.textBaseline = 'alphabetic';   // letters are placed one by one, spacing added by hand
    const total = width(word, font, sp); let x = cx - total / 2; const yb = 220;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i]; const p = smooth(span(lt, 0.9 + i * 0.11, 2.1 + i * 0.11));
      const cw = lc.measureText(ch).width;
      if (p > 0) {
        lc.fillStyle = P.bone;
        if (p < 1) { lc.globalAlpha = p * 0.18; for (const o of [-4, -2, 2, 4]) lc.fillText(ch, x + o * (1 - p) * 2, yb + (1 - p) * 10); }
        lc.globalAlpha = p * p; lc.fillText(ch, x, yb + (1 - p) * 10);
      }
      x += cw + sp;
    }
    lc.globalAlpha = 1;
    // a slow band of light crosses the letters once
    const sw = span(lt, 3.0, 6.2);
    if (sw > 0 && sw < 1) {
      lc.globalCompositeOperation = 'source-atop';
      const sx = lerp(cx - total / 2 - 300, cx + total / 2 + 300, ease(sw));
      const lg = lc.createLinearGradient(sx - 160, 0, sx + 160, 0);
      lg.addColorStop(0, 'rgba(255,236,196,0)'); lg.addColorStop(0.5, 'rgba(255,236,196,0.85)'); lg.addColorStop(1, 'rgba(255,236,196,0)');
      lc.fillStyle = lg; lc.fillRect(0, 0, W, 300); lc.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(lay, 0, base - yb);
    // AETHELGARD between two rules
    const sa = smooth(span(lt, 2.6, 4.0));
    const sub = 'AETHELGARD', sf = `500 ${opts.small ? 30 : 40}px Cinzel`, ssp = opts.small ? 20 : 28;
    const sy = base + (opts.small ? 62 : 84);
    txt(sub, cx, sy, sf, P.gold, ssp, 'center', sa);
    const sw2 = width(sub, sf, ssp), rl = 150 * ease(span(lt, 2.9, 4.4));
    ctx.globalAlpha = A * sa * 0.7; ctx.fillStyle = P.gold;
    ctx.fillRect(cx - sw2 / 2 - 34 - rl, sy - 13, rl, 1.2); ctx.fillRect(cx + sw2 / 2 + 34, sy - 13, rl, 1.2);
    ctx.restore();
  }

  // ---------- credit cards, in the manner of a film's end titles ----------
  const ROLE_FONT = '600 16px "Barlow Condensed"', ROLE_SP = 2.2, ROLE_COL = '#958d80';
  const NAME_FONT = '500 31px Oswald', NAME_LH = 40, NAME_SP = 0.6;
  const SMALL_FONT = '500 23px Oswald', SMALL_LH = 31;
  const NOTE_FONT = '400 17px "Barlow Condensed"';

  function groupSize(g, dense) {
    const nf = dense ? SMALL_FONT : NAME_FONT, lh = dense ? SMALL_LH : NAME_LH;
    let w = width(g.role.toUpperCase(), ROLE_FONT, ROLE_SP);
    for (const n of g.names) w = Math.max(w, width(n.toUpperCase(), nf, NAME_SP));
    if (g.note) w = Math.max(w, width(g.note, NOTE_FONT, 1));
    return { w, h: 26 + g.names.length * lh + (g.note ? 26 : 0) };
  }
  function drawGroup(g, x, y, dense, alpha) {
    const nf = dense ? SMALL_FONT : NAME_FONT, lh = dense ? SMALL_LH : NAME_LH;
    txt(g.role.toUpperCase(), x, y + 14, ROLE_FONT, ROLE_COL, ROLE_SP, 'center', alpha);
    g.names.forEach((n, i) => txt(n.toUpperCase(), x, y + 26 + (i + 1) * lh - 8, nf, P.bone, NAME_SP, 'center', alpha));
    if (g.note) txt(g.note, x, y + 26 + g.names.length * lh + 20, NOTE_FONT, P.dim, 1, 'center', alpha);
  }
  function card(c, t) {
    const A = window_(t, c.t0, c.t1, 0.75, 0.75); if (A <= 0) return;
    const rows = c.rows, dense = !!c.dense, gapX = dense ? 64 : 92, gapY = dense ? 38 : 54;
    const meas = rows.map(r => r.map(g => groupSize(g, dense)));
    const rowH = meas.map(r => Math.max(...r.map(m => m.h)));
    let total = rowH.reduce((a, b) => a + b, 0) + gapY * (rows.length - 1);
    let headerH = 0;
    if (c.header) headerH = 70;
    let y = H / 2 - (total + headerH) / 2 + (c.dy || 0);
    if (c.header) { txt(c.header.toUpperCase(), W / 2, y + 22, '500 20px "Barlow Condensed"', P.gold, 6, 'center', A * 0.95); y += headerH; }
    rows.forEach((r, i) => {
      const ws = meas[i].map(m => m.w); const rowW = ws.reduce((a, b) => a + b, 0) + gapX * (r.length - 1);
      let x = W / 2 - rowW / 2;
      r.forEach((g, j) => { drawGroup(g, x + ws[j] / 2, y, dense, A); x += ws[j] + gapX; });
      y += rowH[i] + gapY;
    });
  }

  // ---------- the closing card ----------
  function closing(t, a0, a1) {
    const A = window_(t, a0, a1, 1.6, 3.2); if (A <= 0) return;
    const lt = t - a0;
    ctx.save(); ctx.globalAlpha = A;
    title(t, a0, a1 + 10, { base: 470, size: 96, spacing: 16, small: true });
    const C = window.CREDITS || {};
    const fa = smooth(span(lt, 2.4, 4.0));
    txt(C.closing ? C.closing.line1 : 'A PROJECT EON GAME', W / 2, 660, '500 20px "Barlow Condensed"', P.ash, 7, 'center', fa);
    txt(C.closing ? C.closing.line2 : '', W / 2, 700, '400 18px "Barlow Condensed"', P.dim, 3, 'center', fa);
    const tq = smooth(span(lt, 5.0, 6.6));
    txt(C.closing && C.closing.thanks ? C.closing.thanks : 'THANK YOU FOR PLAYING', W / 2, 820, '500 26px Cinzel', P.bone, 10, 'center', tq);
    ctx.restore();
  }

  // ---------- timeline ----------
  const T = { studio: [0.6, 8.6], director: [9.2, 15.0], title: [15.4, 27.0], cards: [27.4, 162.6], closing: [163.4, 180.6] };
  let CARDS = [];
  function layoutCards() {
    const list = (window.CREDITS && window.CREDITS.cards) || [];
    const weight = c => { let n = 0; for (const r of c.rows) for (const g of r) n += g.names.length + 0.6; return c.hold || clamp(2.9 + n * 0.16, 3.6, 7.4); };
    const ws = list.map(weight); const sum = ws.reduce((a, b) => a + b, 0) || 1;
    const avail = T.cards[1] - T.cards[0]; const gap = 0.45;
    const scale = (avail - gap * Math.max(0, list.length - 1)) / sum;
    let t = T.cards[0];
    // a card can ask to land on a moment in the music (the lift near 63 s): later cards share what is left
    CARDS = list.map((c, i) => { const d = ws[i] * scale; const o = Object.assign({}, c, { t0: t, t1: t + d }); t += d + gap; return o; });
    const pin = CARDS.findIndex(c => c.pinAt);
    if (pin >= 0) {
      const target = CARDS[pin].pinAt, shift = target - CARDS[pin].t0;
      // re-time cards before the pin to end at it and cards after it to fill to the end, keeping proportions
      const before = CARDS.slice(0, pin), after = CARDS.slice(pin);
      const bSum = before.reduce((a, c) => a + (c.t1 - c.t0), 0), aSum = after.reduce((a, c) => a + (c.t1 - c.t0), 0);
      const bAvail = target - T.cards[0] - gap * before.length, aAvail = T.cards[1] - target - gap * (after.length - 1);
      let tt = T.cards[0];
      for (const c of before) { const d = (c.t1 - c.t0) * bAvail / bSum; c.t0 = tt; c.t1 = tt + d; tt += d + gap; }
      tt = target;
      for (const c of after) { const d = (c.t1 - c.t0) * aAvail / aSum; c.t0 = tt; c.t1 = tt + d; tt += d + gap; }
      void shift;
    }
  }

  function renderAt(t) {
    t = clamp(t, 0, TOTAL);
    const heat = window_(t, T.title[0], T.title[1], 2.5, 3) * 0.9 + window_(t, T.closing[0], T.closing[1], 3, 4) * 0.5;
    background(t, heat);
    const C = window.CREDITS || {};
    studio(t, T.studio[0], T.studio[1]);
    if (C.director) card({ rows: C.director, t0: T.director[0], t1: T.director[1] }, t);
    title(t, T.title[0], T.title[1]);
    for (const c of CARDS) if (t >= c.t0 - 0.1 && t <= c.t1 + 0.1) card(c, t);
    closing(t, T.closing[0], T.closing[1]);
    // the picture opens out of black and closes into it with the music
    const fade = smooth(span(t, 0, 0.8)) * (1 - smooth(span(t, 179.4, 181.6)));
    finish(t);
    if (fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - fade})`; ctx.fillRect(0, 0, W, H); }
  }

  async function loadFonts(href) {
    await new Promise(res => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = res; l.onerror = res; document.head.appendChild(l); });
    const faces = ['500 22px "Barlow Condensed"', '600 16px "Barlow Condensed"', '400 17px "Barlow Condensed"', '500 31px Oswald', '300 20px Oswald', '600 40px Cinzel', '500 40px Cinzel'];
    await Promise.all(faces.map(f => document.fonts.load(f, 'AEGHKORWZ')));
    await document.fonts.ready;
  }

  function mount(el) {
    canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; (el || document.body).appendChild(canvas);
    ctx = canvas.getContext('2d'); makeGrain(); layoutCards();
  }

  window.FILM = {
    W, H, FPS, total: TOTAL, T, renderAt, loadFonts, cards: () => CARDS,
    mountHeadless() { mount(document.body); },
    mount,
    seqs: [{ id: 'credits', start: 0, dur: TOTAL }],
  };
})();
