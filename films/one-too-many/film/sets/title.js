/* ONE TOO MANY — film set: the TITLE, the TALLY interstitials and the END CARD.

   SETS.title.draw(c, t, o)      the title card, animated (t = seconds since the title's first frame). Port of style frame F01.
                                 Six tall ink bars (six bodies) in a tungsten field; ONE TOO MANY in Six Caps; ONE burns through
                                 to the ember lightbox for about a second, then goes out; the credit; then black.
   SETS.title.tally(c, t, o)     Kyle-Cooper scratched tally marks on black (the four interstitials). o = {marks, faint, gapT (0.125)}
   SETS.title.endcard(c, t, o)   two marks, then (optionally) the title and credit on black, then black.
   SETS.title.tallyTimes(o)      [{i, t, t0, faint}] when each mark lands (schedule S.cue('tally', at + m.t, {faint: m.faint})); tallyDur(o) its length.
   SETS.title.T                  the default title timeline (seconds), see below. SETS.title.endT the end card's.
   SETS.title.layout()           the F01 line-up: {bars:[{id,x,w,k,top,cx}], glyphs, FLOOR, ...} (also used by the living room's 'glasses' insert)
   SETS.title.drawField(g)       the tungsten field alone (the match-cut background shared with SETS.living 'glasses').

   Everything is drawn in world coordinates (1920x1080) on c.g, so c.camera() still applies. Deterministic. */
(function () {
  'use strict';
  const O = window.OTM, { C, W, H, S } = O;
  const SETS = window.SETS = window.SETS || {};
  const FL = () => window.FILM;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => clamp((t - a) / ((b - a) || 1e-6), 0, 1);
  const outExpo = u => u >= 1 ? 1 : 1 - Math.pow(2, -10 * u);
  const outBack = (u, s) => { s = s == null ? 1.4 : s; return 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2); };
  const inOut = u => -(Math.cos(Math.PI * u) - 1) / 2;

  // ---------------------------------------------------------------- the line-up (F01, exactly)
  const SIZE = 540, FLOOR = 884, TALL = 790, BASE = FLOOR + 60;
  const FT = { family: 'Six Caps', weight: 400, size: SIZE };
  const PAD = 17, LG = 24;
  const SEQ = [
    { bar: 'deena', w: 86, k: 0.95 }, { gap: 66 },
    { ch: 'O', one: 1 }, { gap: LG }, { ch: 'N', one: 1 }, { gap: LG }, { ch: 'E', one: 1 }, { gap: 66 },
    { ch: 'T', bar: 'scott', k: 1.0 }, { gap: PAD - 2 }, { ch: 'O' }, { gap: PAD - 2 },
    { ch: 'O', bar: 'angelo', k: 1.07 }, { gap: 30 }, { bar: 'kay', w: 90, k: 0.965 }, { gap: 30 },
    { ch: 'M', bar: 'christof', k: 1.015, padX: 10 }, { gap: PAD - 2 }, { ch: 'A' }, { gap: PAD - 2 },
    { ch: 'N', bar: 'marina', k: 0.98 }, { gap: PAD - 2 }, { ch: 'Y' },
  ];
  // words for the stamp: ONE (0..2), TOO (3..5), MANY (6..9)
  const WORDS = [[0, 3], [3, 6], [6, 10]];
  let LAY = null;
  // the line-up is measured from Six Caps: never freeze it on the fallback font (setup() or the living room's barCx may ask early)
  const fontsReady = () => { try { return !document.fonts || document.fonts.check(O.font(FT)); } catch (e) { return true; } };
  function layout() {
    if (LAY) return LAY;
    const m = O.makeCanvas(16, 16).getContext('2d'); m.font = O.font(FT);
    const ink = ch => { const q = m.measureText(ch); return { l: -q.actualBoundingBoxLeft, r: q.actualBoundingBoxRight, adv: q.width, asc: q.actualBoundingBoxAscent }; };
    const R = O.rng('title-jitter-7'); const jit = () => (R() * 2 - 1);
    let cx = 0; const glyphs = [], bars = [];
    SEQ.forEach(it => {
      if (it.gap) { cx += it.gap; return; }
      if (it.ch) {
        const q = ink(it.ch), iw = q.r - q.l, pad = it.bar ? PAD + (it.padX || 0) : 0;
        glyphs.push({ ch: it.ch, x: cx + pad - q.l, iw, adv: q.adv, asc: q.asc, one: !!it.one, rot: jit() * 0.6 * Math.PI / 180, dy: jit() * 2 });
        if (it.bar) bars.push({ id: it.bar, x: cx, w: iw + 2 * pad, k: it.k });
        cx += iw + 2 * pad;
      } else { bars.push({ id: it.bar, x: cx, w: it.w, k: it.k }); cx += it.w; }
    });
    const shift = Math.round((W - cx) / 2); glyphs.forEach(q => q.x += shift); bars.forEach(b => b.x += shift);
    // bar bodies: soft shoulders so they stand like people, not buildings
    bars.forEach((b, i) => {
      const top = FLOOR - TALL * b.k, lean = jit() * 0.008, tilt = jit() * 0.03 * b.w;
      const rr = b.w * ({ marina: 0.07, kay: 0.26, christof: 0.13 }[b.id] || 0.18);
      const cxb = b.x + b.w / 2, x0 = b.x, x1 = b.x + b.w;
      const sh = S().M(x0, BASE).L(x0 - 2, top + rr + tilt).Q(x0 - 1, top + tilt, x0 + rr, top + tilt * 0.5)
        .L(x1 - rr, top - tilt * 0.5).Q(x1 + 1, top - tilt, x1 + 2, top + rr - tilt).L(x1, BASE).Z();
      b.shape = sh.rotate(lean, cxb, BASE); b.path = b.shape.path(1.6, 21 + i); b.top = top; b.cx = cxb; b.h = FLOOR - top; b.i = i;
    });
    const sc = bars.find(b => b.id === 'scott');
    const one = glyphs.filter(q => q.one);
    const L = { glyphs, bars, sc, one, FLOOR, BASE, SIZE, FT, seamCore: sc.x + sc.w * 0.74, seamMid: sc.x + sc.w * 0.2, RIGHT: 1888, LY: 560,
      // the slot at Scott's right (screen-left of his bar), where ONE stands
      slot: { x0: one[0].x - 8, x1: one[2].x + one[2].adv + 8 }, yLast: glyphs[glyphs.length - 1],
      floorPath: S().poly([[-80, FLOOR + 2], [W + 80, FLOOR - 3], [W + 80, H + 80], [-80, H + 80]]).path(1.6, 31) };
    if (fontsReady()) LAY = L;
    return L;
  }

  // ---------------------------------------------------------------- one-time assets (kept here, never evicted)
  const A = {};
  const cv = (w, h) => O.makeCanvas(w, h);
  // the hand-cut scissor edge for type (F01's SVG filter, injected once)
  function cutFilter() {
    if (A.filter) return A.filter;
    try {
      if (!document.getElementById('otmTitleCut')) {
        const NS = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
        svg.innerHTML = '<filter id="otmTitleCut" x="-5%" y="-5%" width="110%" height="110%">' +
          '<feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="1" seed="7" result="n1"/>' +
          '<feDisplacementMap in="SourceGraphic" in2="n1" scale="5" xChannelSelector="R" yChannelSelector="G" result="d1"/>' +
          '<feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="1" seed="3" result="n2"/>' +
          '<feDisplacementMap in="d1" in2="n2" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter>';
        (document.body || document.documentElement).appendChild(svg);
      }
      A.filter = 'url(#otmTitleCut)';
    } catch (e) { A.filter = 'none'; }
    return A.filter;
  }
  function drawGlyphs(c, list, color, filt) {
    c.save(); if (filt !== false) c.filter = cutFilter(); c.font = O.font(FT); c.fillStyle = color; c.textBaseline = 'alphabetic';
    list.forEach(q => { const hw = q.adv / 2; c.save(); c.translate(q.x + hw, FLOOR + q.dy); c.rotate(q.rot); c.fillText(q.ch, -hw, 0); c.restore(); });
    c.restore();
  }
  const tint = (src, col) => { const c = cv(src.width, src.height).getContext('2d'); c.drawImage(src, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = col; c.fillRect(0, 0, c.canvas.width, c.canvas.height); return c.canvas; };
  // crop a full-frame canvas to the bbox of its glyph list
  function cropOf(list, pad) {
    const x0 = Math.floor(Math.min(...list.map(q => q.x)) - pad), x1 = Math.ceil(Math.max(...list.map(q => q.x + q.adv)) + pad);
    const y0 = Math.floor(FLOOR - Math.max(...list.map(q => q.asc || SIZE * 0.72)) - pad), y1 = Math.ceil(FLOOR + pad);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function crop(src, r) { const c = cv(r.w, r.h).getContext('2d'); c.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h); return c.canvas; }

  // the tungsten field: one lamp overhead, printed as flat bands; the seams fall behind Scott's bar; the slot is left in the low band
  function drawField(g) {
    const L = layout();
    g.fillStyle = C.tungstenLow; g.fillRect(-80, -80, W + 160, H + 160);
    const bands = [{ l: L.seamMid, r: L.RIGHT + 70, ry: 1500, col: C.tungstenMid }, { l: L.seamCore, r: L.RIGHT, ry: 1380, col: C.tungsten }];
    const dp = col => { const c = cv(4, 4), d = c.getContext('2d'); d.fillStyle = col; [[0, 0], [2, 2], [2, 0], [0, 2], [1, 1], [3, 3]].forEach(([x, y], i) => { if (i < 4 || i % 2) d.fillRect(x, y, 1, 1); }); return g.createPattern(c, 'repeat'); };
    bands.forEach((b, i) => {
      const p = S().ellipse((b.l + b.r) / 2, L.LY, (b.r - b.l) / 2, b.ry, 0).path(2.4, 60 + i);
      g.fillStyle = b.col; g.fill(p);
      g.save(); g.strokeStyle = dp(i ? bands[i - 1].col : C.tungstenLow); g.lineWidth = 7; g.stroke(p); g.restore();
    });
  }
  function assets() {
    if (A.ready) return A;
    const L = layout();
    // field
    A.field = cv(W + 160, H + 160); { const g = A.field.getContext('2d'); g.translate(80, 80); drawField(g); }
    // bars union (white) for the letter/bar intersection
    const Bc = cv(W, H).getContext('2d'); Bc.fillStyle = '#fff'; L.bars.forEach(b => Bc.fill(b.path));
    // the three words, each pre-cut: ink where on the light, tungsten where a letter crosses a body
    A.words = WORDS.map(([a, b], wi) => {
      const list = L.glyphs.slice(a, b); const r = cropOf(list, 24);
      const Lc = cv(W, H).getContext('2d'); drawGlyphs(Lc, list, '#000');
      const out = cv(W, H).getContext('2d'); out.drawImage(tint(Lc.canvas, C.ink), 0, 0);
      if (wi > 0) { const X = cv(W, H).getContext('2d'); X.drawImage(Lc.canvas, 0, 0); X.globalCompositeOperation = 'destination-in'; X.drawImage(Bc.canvas, 0, 0); out.drawImage(tint(X.canvas, C.tungsten), 0, 0); }
      return { r, img: crop(out.canvas, r), mask: wi === 0 ? crop(Lc.canvas, r) : null };
    });
    // ONE: the burn. A burn-order field over the glyph mask (distance from the ignition point + paper noise), stepped into stages.
    const one = A.words[0]; const r = one.r, mk = one.mask; const md = mk.getContext('2d').getImageData(0, 0, r.w, r.h).data;
    const N = 14; A.N = N;
    const nn = L.one[1]; const ign = [nn.x + nn.adv * 0.5 - r.x, FLOOR - SIZE * 0.22 - r.y];   // ignites low in the N
    let maxD = 1; for (let y = 0; y < r.h; y += 4) for (let x = 0; x < r.w; x += 4) if (md[(y * r.w + x) * 4 + 3] > 20) maxD = Math.max(maxD, Math.hypot(x - ign[0], (y - ign[1]) * 0.8));
    const thr = new Float32Array(r.w * r.h);
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
      const d = Math.hypot(x - ign[0], (y - ign[1]) * 0.8) / maxD; const n = O.fbm((x + r.x) * 0.04, (y + r.y) * 0.04, 77, 3);
      thr[y * r.w + x] = clamp(0.06 + 0.86 * d + 0.3 * (n - 0.5), 0, 1);
    }
    const stage = (lo, hi, col, soft) => {           // pixels with lo < thr <= hi, coloured
      const c = cv(r.w, r.h), g = c.getContext('2d'), im = g.createImageData(r.w, r.h), D = im.data; const rgb = O.hexToRgb(col);
      for (let i = 0; i < r.w * r.h; i++) { const a = md[i * 4 + 3]; if (!a) continue; const v = thr[i]; if (v > hi || v <= lo) continue;
        const f = soft ? clamp((hi - v) * N * 1.5, 0, 1) : 1; D[i * 4] = rgb[0]; D[i * 4 + 1] = rgb[1]; D[i * 4 + 2] = rgb[2]; D[i * 4 + 3] = a * f; }
      g.putImageData(im, 0, 0); return c;
    };
    A.holes = [], A.edge = [], A.scorch = [];
    for (let k = 0; k <= N; k++) {
      A.holes.push(stage(-1, k / N, '#FFFFFF', k < N));
      A.edge.push(stage(k / N - 0.01, (k + 0.75) / N, C.emberHot, false));
      A.scorch.push(stage(k / N, (k + 2.6) / N, C.fireOuter, false));
    }
    // one paper layer per stage: the browning ahead of the front + the burning edge, pre-composited (one draw per frame)
    A.paper = A.scorch.map((sc, k) => { const c = cv(r.w, r.h), g = c.getContext('2d'); g.globalAlpha = 0.85; g.drawImage(sc, 0, 0); g.globalAlpha = 1; if (k < N) g.drawImage(A.edge[k], 0, 0); return c; });
    // the char left round ONE once the ember has gone out: a ragged rim of soot hugging the cut (no blur), browned just outside it
    {
      const dil = R => { const c = cv(r.w, r.h), g = c.getContext('2d'); for (let a = 0; a < 16; a++) g.drawImage(mk, Math.cos(a / 16 * Math.PI * 2) * R, Math.sin(a / 16 * Math.PI * 2) * R); return g.getImageData(0, 0, r.w, r.h).data; };
      const D2 = dil(2), D4 = dil(4), D7 = dil(7), D10 = dil(10);
      const c = cv(r.w, r.h), g = c.getContext('2d'), im = g.createImageData(r.w, r.h), P = im.data, soot = O.hexToRgb(C.soot), brown = O.hexToRgb(O.mix(C.fireOuter, C.soot, 0.55));
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
        const i = (y * r.w + x) * 4; if (md[i + 3] > 128) continue;
        const n = O.fbm((x + r.x) * 0.07, (y + r.y) * 0.07, 913, 3), n2 = O.vnoise((x + r.x) * 0.5, (y + r.y) * 0.5, 917);
        const inner = n < 0.42 ? D2 : n < 0.58 ? D4 : D7, outer = n < 0.42 ? D4 : n < 0.58 ? D7 : D10;
        if (inner[i + 3] > 60 && n2 > 0.12) { P[i] = soot[0]; P[i + 1] = soot[1]; P[i + 2] = soot[2]; P[i + 3] = 235; }
        else if (outer[i + 3] > 60 && n2 > 0.35) { P[i] = brown[0]; P[i + 1] = brown[1]; P[i + 2] = brown[2]; P[i + 3] = 150; }
      }
      g.putImageData(im, 0, 0); A.char = c;
    }
    // the damage that stays: a few ragged pin-holes inside ONE that never close (the Extra was here)
    {
      const R = O.rng('one-perf'), pts = []; let guard = 0;
      while (pts.length < 7 && guard++ < 4000) { const x = R() * r.w, y = r.h * (0.12 + R() * 0.8); const a = md[(Math.floor(y) * r.w + Math.floor(x)) * 4 + 3];
        if (a > 220 && pts.every(q => Math.hypot(q[0] - x, q[1] - y) > 44)) pts.push([x, y, 2.6 + R() * 3.6, 0.45 + R() * 0.4]); }
      A.perf = pts.map(([x, y, rad, k], j) => { const sh = S(), n = 9, q = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = rad * (0.6 + 0.8 * O.vnoise(i * 1.7, j, 919)); q.push([r.x + x + Math.cos(a) * rr * 1.3, r.y + y + Math.sin(a) * rr]); }
        return { path: sh.poly(q).path(0.3, 70 + j), depth: k, x: r.x + x, y: r.y + y, rad }; });
    }
    A.oneInk = tint(mk, C.ink);
    // ember bloom shape for the emissive buffer
    A.oneEm = tint(mk, C.ember);
    // pre-warm: the first draw of a putImageData canvas costs ~20 ms; pay it here, not on the burn's frames (each stage shows ~1 frame)
    { const w = cv(r.w, r.h).getContext('2d'); A.paper.concat(A.holes, A.edge, [A.char, A.oneEm]).forEach(q => { w.drawImage(q, 0, 0); }); w.getImageData(0, 0, 1, 1); }
    A.ready = fontsReady(); return A;
  }

  // ---------------------------------------------------------------- the title, animated
  // Default timeline (seconds from the title's first frame). Override any key through o.
  const T = {
    count: 0.125,          // the count of six: one bar every 3 frames (match the six glasses' pings)
    rise: 0.30,            // each bar rises from its glass-height stub to its full body in this long
    stub: 340,             // stub height at t=0 (= the glass height in SETS.living 'glasses', for the match cut)
    words: [1.00, 1.25, 1.50],   // ONE (ink on the low band), TOO, MANY stamp in
    burn: 2.10,            // ONE starts to burn through
    burnDur: 0.36,         // the burn front crosses the word
    ember: 1.05,           // ...and holds open on the ember for about a second
    outDur: 0.45,          // then the ember goes out, leaving char
    credit: 3.60,          // A FILM BY OSITA MILES (letter by letter)
    end: 5.60,             // cut to black from here on (null: never)
  };
  function title(c, t, o) {
    o = Object.assign({}, T, typeof o === 'object' && o ? o : {});
    const L = layout(), As = assets(), g = c.g, em = c.em;
    if (o.end != null && t >= o.end) { g.save(); g.fillStyle = C.ink; g.fillRect(-200, -200, W + 400, H + 400); g.restore(); return { phase: 'black' }; }
    g.drawImage(As.field, -80, -80);
    // ---- the six bars. bars: 'rise' (stubs at t=0 rise on the count) | 'cut' (cut in full on the count) | 'all' (all present)
    const mode = o.bars || 'rise';
    L.bars.forEach((b, i) => {
      const t0 = i * o.count; let dy = 0;
      if (mode === 'cut') { if (t < t0) return; dy = (1 - outExpo(seg(t, t0, t0 + 0.08))) * 40; }
      else if (mode === 'rise') { const stub = Math.min(b.h, o.stub); const u = seg(t, t0, t0 + o.rise); dy = (b.h - stub) * (1 - outBack(u, 0.9)); }
      g.save(); g.translate(0, dy); g.fillStyle = C.ink; g.fill(b.path); g.restore();
    });
    // the floor they stand on (one paper strip, slightly off level)
    g.fillStyle = C.ink; g.fill(L.floorPath);
    // ---- the words
    const burnT = t - o.burn, B = o.burnDur, E = o.ember;
    As.words.forEach((wd, wi) => {
      const t0 = o.words[wi]; if (t < t0) return;
      const u = seg(t, t0, t0 + 2 / 24);                     // a two-frame stamp
      const s = 1 + 0.035 * (1 - u), r = wd.r;
      g.save(); g.globalAlpha = 0.35 + 0.65 * u; g.translate(r.x + r.w / 2, r.y + r.h); g.scale(s, s); g.translate(-(r.x + r.w / 2), -(r.y + r.h));
      g.drawImage(wd.img, r.x, r.y); g.restore();
    });
    // ---- ONE burns through to the ember, holds about a second, then goes out
    let phase = 'title';
    if (t >= o.words[0] && burnT >= 0) {
      const r = As.words[0].r, N = As.N;
      const k = Math.min(N, Math.floor(seg(burnT, 0, B) * N + 1e-6));
      const outU = seg(burnT, B + E, B + E + o.outDur);
      const depth = 1 - inOut(outU);
      // the paper browns ahead of the front, and the burning edge (the Extra's colour, only while the front moves): one layer
      if (outU < 1) { g.save(); g.globalAlpha = 1 - outU; g.drawImage(As.paper[Math.min(N, k)], r.x, r.y); g.restore(); }
      if (k < N) { em.save(); em.globalAlpha = 0.4; em.drawImage(As.edge[k], r.x, r.y); em.restore(); }
      // the ember breathes on ones while it holds (+-6% in the bloom, +-3% in the cut) under the drone7 swell
      const fr = Math.floor(t * 24 + 1e-6), br = k >= N && outU <= 0 ? O.vnoise(fr * 0.85, 0.5, 4471) * 2 - 1 : 0;
      // the hole (follows c.camera())
      const hc = (depth > 0.01 || outU > 0) ? c.f.markHoles() : null;
      if (depth > 0.01) { hc.save(); hc.setTransform(g.getTransform()); hc.globalAlpha = clamp(depth * (1 + 0.03 * br), 0, 1); hc.drawImage(As.holes[k], r.x, r.y); hc.restore(); }
      // extra bloom so the first ember of the film hums
      if (depth > 0.01 && k >= N) { em.save(); em.globalAlpha = 0.5 * depth * (1 + 0.06 * br); em.drawImage(As.oneEm, r.x, r.y); em.restore(); }
      // once it's out: a ragged char rim, and the pin-holes that never close (knockout damage persists)
      if (outU > 0) {
        g.save(); g.globalAlpha = outU; g.drawImage(As.char, r.x, r.y); g.restore();
        hc.save(); hc.setTransform(g.getTransform()); hc.fillStyle = '#fff';
        As.perf.forEach((p, j) => { const fl = 0.85 + 0.15 * O.vnoise(fr * 0.4 + j * 7, 1.5, 4473); hc.globalAlpha = clamp(Math.max(depth, p.depth * fl * Math.min(1, outU * 3)), 0, 1); hc.fill(p.path); });
        hc.restore();
      }
      phase = burnT < B ? 'burning' : outU <= 0 ? 'ember' : outU < 1 ? 'going out' : 'out';
    }
    // ---- credit, lit letter by letter on the Y's right edge
    if (t >= o.credit) {
      const str = 'A FILM BY OSITA MILES', yl = L.yLast; const n = Math.min(str.length, Math.floor((t - o.credit) / (1 / 24 * 0.9)) + 1);
      const x = yl.x + yl.adv * 0.5 + yl.iw * 0.5 + 6;
      // right-aligned: lay out the full string, reveal left to right
      g.save(); g.font = O.font({ family: 'Barlow Condensed', weight: 600, size: 30 }); g.letterSpacing = '9px';
      const full = g.measureText(str).width; g.restore();
      O.text(g, str.slice(0, n), x - full, FLOOR + 92, { family: 'Barlow Condensed', weight: 600, size: 30, color: C.tungsten, tracking: 9, align: 'left' });
    }
    return { phase };
  }

  // ---------------------------------------------------------------- scratched tally marks (Kyle Cooper on black)
  // one mark: a hand-scratched gouge in the emulsion. The wander is fixed per mark; the ragged edge boils on twos (re-scratched each drawing).
  const MARKS = {};
  function markShape(seed, h, boil) {
    const key = seed + ':' + h + ':' + boil; if (MARKS[key]) return MARKS[key];
    const r = O.rng('tallymark' + seed), rb = O.rng('tallyboil' + seed + ':' + boil);
    const lean = (r() - 0.5) * 0.07, bow = (r() - 0.5) * h * 0.025, base = h * 0.0125;
    const N = Math.round(h / 4), Lp = [], Rp = [];
    const skips = [0.3 + r() * 0.4, r() < 0.6 ? 0.12 + r() * 0.12 : -1];       // where the blade skipped
    const wander = u => lean * h * u + bow * Math.sin(Math.PI * u) + (O.vnoise(u * 3, seed, 21) - 0.5) * base * 3;
    const B = boil * 7.31;
    for (let k = 0; k <= N; k++) {
      const u = k / N;
      const prof = u < 0.04 ? 0.55 + u * 10 : u > 0.72 ? Math.pow(Math.max(0, (1 - u) / 0.28), 0.8) : 1;
      let w = base * prof * (0.65 + 0.7 * O.vnoise(u * 7, seed * 1.3, 13));
      skips.forEach(sk => { if (sk > 0) { const d = Math.abs(u - sk) * h; if (d < 7) w *= 0.12 + d / 8; } });
      const cx = wander(u), cy = -h + h * u;
      const eL = (O.vnoise(u * 55 + B, seed, 14) - 0.5) * 3.2 + (rb() - 0.5) * 1.2, eR = (O.vnoise(u * 55 + B, seed, 15) - 0.5) * 3.2 + (rb() - 0.5) * 1.2;
      Lp.push([cx - w - Math.max(0, eL) * prof, cy]); Rp.unshift([cx + w + Math.max(0, eR) * prof, cy]);
    }
    const p = new Path2D(); Lp.concat(Rp).forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath();
    // a second, thinner pass of the blade that drifts off the first
    const a0 = 0.04 + r() * 0.25, a1 = Math.min(0.95, a0 + 0.35 + r() * 0.45), off = (r() < 0.5 ? -1 : 1) * base * (1.4 + r() * 1.4), dv = (r() - 0.5) * base * 4;
    const L2 = [], R2 = [];
    for (let k = 0; k <= 30; k++) { const u = a0 + (a1 - a0) * k / 30, s = Math.sin(Math.PI * k / 30); const cx = wander(u) + off + dv * (k / 30), cy = -h + h * u; const w = base * 0.38 * s * (0.6 + 0.8 * O.vnoise(u * 20 + B, seed, 16));
      L2.push([cx - w, cy]); R2.unshift([cx + w, cy]); }
    L2.concat(R2).forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath();
    // a burr where the blade bit in
    for (let j = 0; j < 3; j++) { const bx = wander(0.01) + (rb() - 0.5) * base * 3, by = -h + rb() * base * 2; p.moveTo(bx + 2.2, by); p.arc(bx, by, 1 + rb() * 2.2, 0, 7); }
    // hairlines
    const hair = []; const nh = 1 + Math.floor(r() * 2);
    for (let j = 0; j < nh; j++) { const ox = (r() - 0.5) * base * 7, a = h * (0.05 + r() * 0.3), b = h * (0.55 + r() * 0.45); hair.push([wander(a / h) + ox, -h + a, wander(b / h) + ox * 1.3, -h + b]); }
    return (MARKS[key] = { p, hair, base, lean });
  }
  // draw one mark: x,y = foot, h height, u = how much of it is scratched (0..1, top to bottom), alpha
  function drawMark(g, em, m, x, y, h, u, alpha, ghost) {
    if (u <= 0 || alpha <= 0) return;
    g.save(); g.translate(x, y);
    g.beginPath(); g.rect(-h * 0.25, -h - 12, h * 0.5, h * u + 12); g.clip();
    if (ghost) { g.save(); g.globalAlpha = alpha * 0.14; g.translate(4, -3); g.fillStyle = C.cardPaper; g.fill(m.p); g.restore(); }
    g.globalAlpha = alpha; g.fillStyle = C.cardPaper; g.fill(m.p);
    g.globalAlpha = alpha * 0.5; g.strokeStyle = C.cardPaper; g.lineWidth = 1.1;
    m.hair.forEach(([a, b, c2, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); });
    // the fresh head of a scratch being made glows a little hotter
    if (u < 1) { g.globalAlpha = alpha; g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(0 + m.lean * h * u, -h + h * u - 3, m.base * 1.6, 5, 0, 0, 7); g.fill(); }
    g.restore();
    if (em) { em.save(); em.translate(x, y); em.beginPath(); em.rect(-h * 0.25, -h - 12, h * 0.5, h * u + 12); em.clip(); em.globalAlpha = alpha * 0.32; em.fillStyle = C.cardPaper; em.fill(m.p); em.restore(); }
  }
  // film damage on black: dust, a hair, a running scratch, gate weave. On ones (keyed by frame).
  function damage(g, frame, amt) {
    const r = O.rng('dmg' + frame); g.save(); g.fillStyle = C.cardPaper;
    const n = Math.floor(3 + r() * 6 * amt); for (let i = 0; i < n; i++) { g.globalAlpha = 0.15 + r() * 0.4; const s = 1 + r() * 3.2; g.beginPath(); g.ellipse(r() * W, r() * H, s, s * (0.6 + r()), r() * 3, 0, 7); g.fill(); }
    if (r() < 0.35 * amt) { g.globalAlpha = 0.18; g.strokeStyle = C.cardPaper; g.lineWidth = 1; const x = r() * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 30, H); g.stroke(); }
    if (r() < 0.25 * amt) { g.globalAlpha = 0.3; g.strokeStyle = C.cardPaper; g.lineWidth = 1.2; const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 30, y - 20, x + 10, y + 40, x + 60 * (r() - 0.3), y + 50); g.stroke(); }
    g.restore();
  }
  // when each mark lands, for the sound
  // The count lands on the title's count of six (o.gapT, default T.count = 0.125 s = 3 frames), so every interstitial echoes the six
  // bars and the six glasses. The faint seventh starts 1.5 gaps after the last mark, scratches to 58%, sticks there (its hot head
  // stalled), flickers on ones and is gone: FAINT_A is its alpha frame by frame from its first frame (12 frames, 0.5 s).
  const FAINT_A = [0.5, 0.5, 0.5, 0.44, 0.5, 0.4, 0.5, 0, 0.35, 0, 0.2, 0.1];
  // when each mark lands: {i, t (the sound: a mark's first frame; the faint one's stall), t0 (its first frame), faint}
  function tallyTimes(o) {
    o = Object.assign({ marks: 6, faint: false, gapT: null }, o || {});
    const gap = o.gapT == null ? T.count : o.gapT;
    const out = []; for (let i = 0; i < o.marks; i++) out.push({ i, t: i * gap, t0: i * gap, faint: false });
    if (o.faint) { const t0 = Math.max(0, o.marks - 1) * gap + gap * 1.5; out.push({ i: o.marks, t: t0 + 1 / 24, t0, faint: true }); }
    return out;
  }
  // how long a tally needs on screen to play out (the last mark, plus the faint one's life), seconds
  function tallyDur(o) { const m = tallyTimes(o); const last = m[m.length - 1]; return last ? last.t0 + (last.faint ? FAINT_A.length / 24 : 2 / 24) : 0; }
  function tally(c, t, o) {
    o = Object.assign({ marks: 6, faint: false, gapT: null, h: 440, gap: 92, cx: 960, cy: 540, seed: 0, damage: 1, extra: false }, o || {});
    const g = c.g, em = c.em; const frame = Math.floor(t * 24 + 1e-6);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
    em.save(); em.setTransform(0.25, 0, 0, 0.25, 0, 0);
    const jr = O.rng('weave' + frame); const wx = (jr() - 0.5) * 2.4, wy = (jr() - 0.5) * 1.6; const flick = 0.86 + jr() * 0.14;
    const total = o.marks + (o.faint ? 1 : 0); const wd = (total - 1) * o.gap; const x0 = o.cx - wd / 2 + wx, yb = o.cy + o.h / 2 + wy;
    const times = tallyTimes(o); const scr = 1.5 / 24;    // each scratch takes a frame and a half
    times.forEach(m => {
      const rj = O.rng('th' + o.seed + ':' + m.i); const x = x0 + m.i * o.gap + (rj() - 0.5) * 10, y = yb + (rj() - 0.5) * 14, h = o.h * (0.92 + rj() * 0.14);
      const mk = markShape(o.seed * 10 + m.i, Math.round(h), Math.floor(frame / 2) % 3);
      let u = seg(t, m.t0, m.t0 + scr), a = flick;
      if (m.faint) {
        // the seventh won't stay: it starts, sticks at 58% with its head still hot, flickers on ones, and is gone
        u = Math.min(0.58, u); const f = Math.floor((t - m.t0) * 24 + 1e-6);
        a = f < 0 || f >= FAINT_A.length ? 0 : FAINT_A[f] * (0.92 + 0.08 * flick);
      }
      if (o.extra && m.i === total - 1 && !m.faint) {
        // the end card: the last mark is cut through the paper (the Extra's count)
        if (u > 0) { const hc = c.f.markHoles(); hc.save(); hc.translate(x, y); hc.beginPath(); hc.rect(-h * 0.2, -h - 10, h * 0.4, h * u + 10); hc.clip(); hc.globalAlpha = 0.85; hc.fillStyle = '#fff'; hc.fill(mk.p); hc.restore(); }
        return;
      }
      drawMark(g, em, mk, x, y, h, u, a, !m.faint);
    });
    if (o.damage) damage(g, frame + o.seed * 100, o.damage);
    em.restore(); g.restore();
    return { times };
  }

  // ---------------------------------------------------------------- the end card
  const endT = { marks: 0.0, hold: 2.4, title: 2.9, credit: 3.9, end: 7.0 };
  function endcard(c, t, o) {
    o = Object.assign({}, endT, { title: endT.title, showTitle: true, extra: false }, o || {});
    const g = c.g;
    if (t < o.hold) { tally(c, t - o.marks, { marks: 2, faint: false, seed: 4, damage: 0.6, extra: o.extra }); return { phase: 'marks' }; }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = C.ink; g.fillRect(0, 0, W, H); g.restore();
    if (!o.showTitle || t < o.title || (o.end != null && t >= o.end)) return { phase: 'black' };
    // ONE TOO MANY, small, on black; ONE cut through to the ember again (it was always one of the two)
    const u = seg(t, o.title, o.title + 0.5), size = 150, y = 560;
    const parts = [['ONE ', true], ['TOO MANY', false]];
    g.save(); g.font = O.font({ family: 'Six Caps', weight: 400, size }); g.letterSpacing = '6px'; const w1 = g.measureText('ONE ').width, w2 = g.measureText('TOO MANY').width; g.restore();
    const x0 = 960 - (w1 + w2) / 2;
    if (o.oneEmber !== false) { const hc = c.f.markHoles(); hc.save(); hc.setTransform(1, 0, 0, 1, 0, 0); hc.globalAlpha = 0.9 * u; hc.fillStyle = '#fff'; hc.font = O.font({ family: 'Six Caps', weight: 400, size }); hc.letterSpacing = '6px'; hc.fillText('ONE', x0, y); hc.restore(); }
    else O.text(g, 'ONE', x0, y, { family: 'Six Caps', size, color: C.cardPaper, tracking: 6, alpha: u });
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    O.text(g, 'TOO MANY', x0 + w1, y, { family: 'Six Caps', size, color: C.cardPaper, tracking: 6, alpha: u });
    if (t >= o.credit) O.text(g, 'A FILM BY OSITA MILES', 960, y + 74, { family: 'Barlow Condensed', weight: 600, size: 26, color: C.tungsten, tracking: 9, align: 'center', alpha: seg(t, o.credit, o.credit + 0.6) });
    g.restore();
    return { phase: 'title' };
  }

  // ---------------------------------------------------------------- demos (node tools/set.js title 1)
  const lb = 1.7778;
  const demos = [
    { name: 'title: six stubs rise (t 0.2)', t0: -0.8, letterbox: lb, draw: (c, t) => title(c, Math.max(0, t)) },
    { name: 'title: the line-up, words in (t 1.6)', t0: 0.6, letterbox: lb, draw: (c, t) => title(c, t) },
    { name: 'title: ONE burning (t 2.25)', t0: 1.25, letterbox: lb, draw: (c, t) => title(c, t) },
    { name: 'title: ONE on the ember (t 3.0)', t0: 2.0, letterbox: lb, draw: (c, t) => title(c, t) },
    { name: 'title: out, credit (t 4.4)', t0: 3.4, letterbox: lb, draw: (c, t) => title(c, t) },
    // (tools/set.js shows each demo at t0 + 1 + 1/24, so t0 = -1 + (f - 1) / 24 shows frame f)
    { name: 'tally: six, counting (frame 10: the 4th scratching)', t0: -1 + 9 / 24, letterbox: lb, draw: (c, t) => tally(c, t, { marks: 6, faint: true }) },
    { name: 'tally: six + a faint seventh, stuck at 58% (frame 22)', t0: -1 + 21 / 24, letterbox: lb, draw: (c, t) => tally(c, t, { marks: 6, faint: true }) },
    { name: 'tally: the seventh flickers out (frame 28)', t0: -1 + 27 / 24, letterbox: lb, draw: (c, t) => tally(c, t, { marks: 6, faint: true }) },
    { name: 'tally: five (1.85)', t0: -0.3, letterbox: 1.85, draw: (c, t) => tally(c, t, { marks: 5, seed: 1 }) },
    { name: 'tally: four (2.00)', t0: -0.3, letterbox: 2.0, draw: (c, t) => tally(c, t, { marks: 4, seed: 2 }) },
    { name: 'tally: two', t0: -0.3, letterbox: lb, draw: (c, t) => tally(c, t, { marks: 2, seed: 4 }) },
    { name: 'endcard: two marks (t 1.0)', t0: 0, letterbox: lb, draw: (c, t) => endcard(c, t) },
    { name: 'endcard: title on black (t 4.5)', t0: 3.5, letterbox: lb, draw: (c, t) => endcard(c, t) },
  ];

  SETS.title = {
    draw: title, title, tally, endcard, tallyTimes, tallyDur, layout, drawField, T, endT,
    anchors: { floor: FLOOR, slot: () => layout().slot, bars: () => layout().bars.map(b => ({ id: b.id, cx: b.cx, x: b.x, w: b.w, top: b.top })) },
    light: { x: 1500, y: -400, color: C.tungsten },
    cams: { title: { x: 960, y: 540, zoom: 1 }, slot: { x: 470, y: 640, zoom: 1.6 } },
    post: { halation: 0.85, vignette: 0.45 },          // suggested shot post for the title
    demos,
  };
})();
