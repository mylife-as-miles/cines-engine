/* LONG DISTANCE — THE PHONE (window.PHONE). The film's antagonist and its whole visual idea: the only smooth thing in a cut-paper world.
   Everything the phone is and makes is GLOSS: perfect vector edges, clean gradients, mirror symmetry, no texture, drawn on c.gl, the
   layer composited after the grain. Two things belong to the paper world instead: the screen's light on real surfaces (PHONE.glow, on
   c.g, a smooth gradient under the grain like every lit surface, never cut into bands) and the phone's contact shadow.
   Screens are rendered flat (360 x 780 points), cached by state, and warped onto the glass; they animate on ones.
   Every message is verbatim from its action line (PHONE.MSG is read from film/script.js). The API is in film/api/phone.md.
   Deterministic: no Math.random, no Date. */
(function (G) {
  'use strict';
  const O = G.OTM, GG = G.GG;
  const W = O.W, H = O.H;
  const warn = m => { if (G.FILM && G.FILM.warn) G.FILM.warn('phone: ' + m); else console.warn('[phone] ' + m); };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const outC = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const inOut = t => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const ones = t => Math.floor(t * 24 + 1e-6) / 24;
  const twos = t => Math.floor(t * 12 + 1e-6) / 12;
  const mk = (w, h) => O.makeCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
  const rgb = hex => O.hexToRgb(hex);
  const rgba = (hex, a) => { const c = rgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${clamp(a, 0, 1).toFixed(4)})`; };
  const mixHex = (a, b, t) => O.mix(a, b, clamp(t, 0, 1));
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

  // ================================================================ constants
  const SW = 360, SH = 780;                                   // the screen, in points (every screen is drawn in these units)
  // a plausible modern slab, 147 x 71.5 x 7.8 mm, 10 mm corners; the glass face sits 1.4 mm inside the frame's edge
  const DIM = { aspect: 71.5 / 147, thick: 7.8 / 147, edge: 1.4 / 147, corner: 10.2 / 71.5,
    face: { w: 68.7, h: 144.2, r: 8.8 }, screen: { inset: 1.8, r: 7.0 } };
  const SCR_U = DIM.screen.inset / DIM.face.w, SCR_V = DIM.screen.inset / DIM.face.h;
  const FONT = '"Libre Franklin"';
  const font = (wt, px) => `${wt} ${px}px ${FONT}`;
  const C = { white: '#FFFFFF', black: '#000000', bubA: '#FF8FB1', bubB: '#B48CFF', his: '#3A3A3E', ui: '#8E8E93', uiDim: '#5A5A5F',
    head: '#0E0E10', field: '#0E0E10', fieldLine: 'rgba(255,255,255,0.16)', kbd: '#1C1C1F', key: '#4A4A4F', keyDark: '#2F2F33', keyHi: '#6E6E73',
    sheet: '#1C1C1F', green: '#2FAE7D', caret: '#FF9DBA' };
  // the screen's light: warm peach at night (the thread, the app), cool from the white water (the waterfall)
  const TONE = { night: '#FFC5A0', water: '#C8EEF2', pink: '#FFA9C6', skin: '#FFCBB0', violet: '#C7B8FF' };
  const toneHex = t => !t ? TONE.night : t[0] === '#' ? t : (TONE[t] || TONE.night);

  // ================================================================ the words on the glass (verbatim from the action lines)
  const MSG = {};
  (function () {
    const script = G.FILM_SCRIPT || [];
    const quoted = id => { const e = script.find(x => x.id === id); if (!e) return null; const m = [...e.text.matchAll(/“([^”]+)”/g)].map(x => x[1]); return m.length ? m[0] : null; };
    [['A008', 'goodMorning', 'Good morning.'], ['A009', 'goodMorningLove', 'Good morning. I love you.'], ['A010', 'iLoveYou', 'I love you.'],
      ['A014', 'sendMeOne', 'Send me one.'], ['A031', 'goodMorning2', 'Good morning.'], ['A032', 'iLoveYou2', 'I love you.'], ['A050', 'callMeTonight', 'Call me tonight?']]
      .forEach(([id, name, fb]) => { const q = quoted(id); if (!q && script.length) warn('no quoted message in ' + id); const s = q || fb; MSG[id] = s; MSG[name] = s; });
  })();
  const ALLOWED = new Set(Object.values(MSG));
  const checked = new Set();
  function verbatim(s) { if (ALLOWED.has(s) || checked.has(s)) return; checked.add(s); warn('text on the glass is not a screenplay message: "' + s + '"'); }

  // ================================================================ clock and date (interface furniture)
  const CLOCK = {
    night1: { time: '23:02', date: 'Wednesday, November 18' },    // Q01: the call, the night before the first morning
    morning: { time: '07:12', date: 'Thursday, November 19' },   // Q02
    office: { time: '10:38', date: 'Thursday, November 19' },    // Q03
    lunch: { time: '12:47', date: 'Thursday, November 19' },     // Q04
    bus: { time: '18:21', date: 'Thursday, November 19' },       // Q05
    night: { time: '23:14', date: 'Thursday, November 19' },     // Q06 (B2)
    morning2: { time: '07:12', date: 'Friday, November 20' },    // Q07: the same minute, the next day
    visit: { time: '14:07', date: 'Saturday, November 21' },     // Q08-Q10 (B3)
    later: { time: '14:12', date: 'Saturday, November 21' },     // Q11
  };
  const SEQ_CLOCK = { Q01: 'night1', Q02: 'morning', Q03: 'office', Q04: 'lunch', Q05: 'bus', Q06: 'night', Q07: 'morning2', Q08: 'visit', Q09: 'visit', Q10: 'visit', Q11: 'later' };
  const clockOf = (v, seqId) => (v && typeof v === 'object') ? v : CLOCK[v] || CLOCK[SEQ_CLOCK[seqId] || 'night'];

  // ================================================================ geometry helpers
  function sq2quad(q) {   // homography from the unit square (tl, tr, br, bl) to a quad: x = (a u + b v + c) / (g u + h v + 1)
    const [x0, y0] = q[0], [x1, y1] = q[1], [x2, y2] = q[2], [x3, y3] = q[3];
    const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3; let g = 0, h = 0;
    if (Math.abs(sx) > 1e-7 || Math.abs(sy) > 1e-7) { const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, den = dx1 * dy2 - dx2 * dy1; if (Math.abs(den) > 1e-9) { g = (sx * dy2 - dx2 * sy) / den; h = (dx1 * sy - sx * dy1) / den; } }
    return { a: x1 - x0 + g * x1, b: x3 - x0 + h * x3, c: x0, d: y1 - y0 + g * y1, e: y3 - y0 + h * y3, f: y0, g, h };
  }
  const hmap = (M, u, v) => { const w = M.g * u + M.h * v + 1; return [(M.a * u + M.b * v + M.c) / w, (M.d * u + M.e * v + M.f) / w]; };
  function hull(pts) {
    const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (P.length < 3) return P;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
    for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    lo.pop(); up.pop(); return lo.concat(up);
  }
  // a rounded rectangle in unit coordinates (u, v in 0..1), radii ru (of the width) and rv (of the height), clockwise from the top edge
  function rrUnit(ru, rv, seg, u0, v0, u1, v1) {
    u0 = u0 || 0; v0 = v0 || 0; u1 = u1 == null ? 1 : u1; v1 = v1 == null ? 1 : v1; const pts = [];
    [[u1 - ru, v0 + rv, -Math.PI / 2], [u1 - ru, v1 - rv, 0], [u0 + ru, v1 - rv, Math.PI / 2], [u0 + ru, v0 + rv, Math.PI]].forEach(([cx, cy, a0]) => {
      for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push([cx + Math.cos(a) * ru, cy + Math.sin(a) * rv]); } });
    return pts;
  }
  const circUnit = (cu, cv, ru, rv, n) => { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([cu + Math.cos(a) * ru, cv + Math.sin(a) * rv]); } return pts; };
  function polyPath(pts, path) { const p = path || new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); return p; }
  const mapPts = (Hm, pts) => pts.map(([u, v]) => hmap(Hm, u, v));
  function mat(a, b) { const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]; return r; }
  const Rz = a => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
  const Ry = a => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
  const Rx = a => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  const devPt = (M, p) => [M.a * p[0] + M.c * p[1] + M.e, M.b * p[0] + M.d * p[1] + M.f];

  // ---------------------------------------------------------------- the body's geometry in world coordinates (c.gl's current transform)
  // Two ways in: 3D ({x, y, h | head, spin, yaw, pitch, roll, persp}) or an explicit quad ({quad: [tl, tr, br, bl], face, edge: [dx, dy]}).
  function geometry(p) {
    const o = { seg: 8 };
    if (p.quad) {
      const q = p.quad, ev = p.edge || [0, 0], face = p.face === 'back' ? 'back' : 'front';
      const h = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2, w = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2;
      const Hq = sq2quad(q); const seg = clamp(Math.ceil(h * 0.06 / 3), 4, 14);
      const ru = DIM.face.r / DIM.face.w;
      const facePts = mapPts(Hq, rrUnit(ru, ru * w / h, seg));
      const backPts = facePts.map(pt => [pt[0] + ev[0], pt[1] + ev[1]]);
      const elen = Math.hypot(ev[0], ev[1]);
      o.h = h; o.w = w; o.faceVis = face; o.facePts = facePts; o.sil = hull(facePts.concat(backPts));
      o.dil = Math.min(h * DIM.edge, elen * 0.5 + h * DIM.edge * 0.4);
      o.edge = ev; o.nz = face === 'front' ? 1 : -1;
      const sp = Array.isArray(p.facing) ? p.facing : (elen > 0.5 ? [-ev[0] / elen * 0.6, -ev[1] / elen * 0.6] : [0, 0]);
      o.n2 = face === 'front' ? (elen > 0.5 ? [-ev[0] / elen * 0.5, -ev[1] / elen * 0.5] : [0, 0]) : sp;
      if (face === 'front') { o.front = q.slice(); o.Hf = Hq; o.Hb = null; }
      else { o.Hb = Hq; o.front = [q[1], q[0], q[3], q[2]].map(pt => [pt[0] + ev[0], pt[1] + ev[1]]); o.Hf = sq2quad(o.front); }
      o.center = hmap(o.Hf, 0.5, 0.5);
      return o;
    }
    const h = p.h != null ? p.h : p.head != null ? p.head * 0.7 : 300;
    const w = h * DIM.aspect, T = h * DIM.thick, e = h * DIM.edge;
    const fw = w * DIM.face.w / 71.5, fh = h * DIM.face.h / 147;
    const R = mat(Rz(p.roll || 0), mat(Rx(p.pitch || 0), mat(Ry(p.yaw || 0), Rz(p.spin || 0))));
    const f = p.persp || 0, x0 = p.x == null ? W / 2 : p.x, y0 = p.y == null ? H / 2 : p.y;
    const proj = (x, y, z) => { const X = R[0][0] * x + R[0][1] * y + R[0][2] * z, Y = R[1][0] * x + R[1][1] * y + R[1][2] * z, Z = R[2][0] * x + R[2][1] * y + R[2][2] * z; const s = f ? f / Math.max(1, f - Z) : 1; return [x0 + X * s, y0 + Y * s]; };
    const seg = clamp(Math.ceil(h * 0.06 / 3), 4, 14);
    const ru = DIM.face.r / DIM.face.w, rv = DIM.face.r / DIM.face.h;
    const out = (z) => rrUnit(ru, rv, seg).map(([u, v]) => proj((u - 0.5) * fw, (v - 0.5) * fh, z));
    const nz = R[2][2];
    o.h = h; o.w = w; o.n2 = [R[0][2], R[1][2]]; o.nz = nz;
    o.faceVis = nz > 0.03 ? 'front' : nz < -0.03 ? 'back' : 'edge';
    o.sil = hull(out(-e).concat(out(-(T - e)))); o.dil = e * (f ? f / Math.max(1, f) : 1);
    o.front = [[-fw / 2, -fh / 2], [fw / 2, -fh / 2], [fw / 2, fh / 2], [-fw / 2, fh / 2]].map(([x, y]) => proj(x, y, 0));
    o.Hf = sq2quad(o.front);
    const back = [[fw / 2, -fh / 2], [-fw / 2, -fh / 2], [-fw / 2, fh / 2], [fw / 2, fh / 2]].map(([x, y]) => proj(x, y, -T));   // the back's own tl..bl, seen from behind
    o.Hb = sq2quad(back);
    o.facePts = o.faceVis === 'front' ? out(0) : o.faceVis === 'back' ? out(-T) : null;
    const c0 = proj(0, 0, 0), c1 = proj(0, 0, -T);
    o.edge = o.faceVis === 'back' ? [c0[0] - c1[0], c0[1] - c1[1]] : [c1[0] - c0[0], c1[1] - c0[1]];
    o.center = c0;
    // the buttons: small boxes standing proud of the frame (power on the right, volume on the left)
    const bt = h * 0.0055; o.buttons = [];
    [[1, -0.205, -0.115], [-1, -0.27, -0.215], [-1, -0.195, -0.14]].forEach(([sd, ya, yb]) => {
      const xs = [sd * (w / 2 - e), sd * (w / 2 + bt)], ys = [ya * h, yb * h], zs = [-0.28 * T, -0.72 * T], pts = [];
      xs.forEach(x => ys.forEach(y => zs.forEach(z => pts.push(proj(x, y, z))))); o.buttons.push(hull(pts)); });
    return o;
  }

  // ================================================================ art: the generated images (rendered once per process, kept)
  const ART = {};
  // the generated pictures, painted once per process (PHOTO below): the couple at the waterfall (3:4) and the app's portrait
  const WF = { w: 960, h: 1280, U: 960 * 0.27 };
  function art(name) {
    if (ART[name]) return ART[name];
    let c = null;
    if (name === 'waterfall') c = photoWaterfall(WF.w, WF.h);
    else if (name === 'portrait') c = photoPortrait(720, 1560);
    else if (name === 'abstract') c = makeAbstract(540, 1170);
    else if (name === 'hidden') c = makeHidden();
    ART[name] = c; return c;
  }
  // the wallpaper is the same picture, cropped to the screen around the two of them
  const WALL_CROP = (() => { const ch = WF.h, cw = Math.round(ch * SW / SH), cx = WF.w * 0.36 + WF.U * 0.4; return { x: Math.round(clamp(cx - cw / 2, 0, WF.w - cw)), y: 0, w: cw, h: ch }; })();
  // small copies, kept per size (drawing the full image small every frame would cost a high-quality downscale each time)
  const THUMBS = {};
  function thumb(name, w, h, crop) {
    w = Math.round(w); h = Math.round(h); const key = name + '|' + w + 'x' + h + '|' + (crop ? 'c' : '');
    if (THUMBS[key]) return THUMBS[key];
    const src = art(name), c = mk(w, h), g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    // downscale in halving steps for a clean result
    let s = src, sx = crop ? crop.x : 0, sy = crop ? crop.y : 0, sw = crop ? crop.w : src.width, sh = crop ? crop.h : src.height;
    while (sw > w * 2.2 && sh > h * 2.2) { const t = mk(sw / 2, sh / 2); const tg = t.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(s, sx, sy, sw, sh, 0, 0, t.width, t.height); s = t; sx = 0; sy = 0; sw = t.width; sh = t.height; }
    g.drawImage(s, sx, sy, sw, sh, 0, 0, w, h);
    return (THUMBS[key] = c);
  }
  // a blurred copy (for frosted banners and sheets)
  function frosted(name, crop) {
    const key = 'frost|' + name; if (THUMBS[key]) return THUMBS[key];
    const sm = thumb(name, 90, 195, crop), c = mk(90, 195), g = c.getContext('2d'); g.filter = 'blur(5px)'; g.drawImage(sm, 0, 0); g.filter = 'none';
    return (THUMBS[key] = c);
  }

  // the wallpaper before the waterfall (Q01-Q05): a plausible default, smooth bands of indigo and rose
  function makeAbstract(w, h) {
    const c = mk(w, h), g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#141838'); bg.addColorStop(0.5, '#2A2460'); bg.addColorStop(1, '#4A2C6E'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const band = (y0, amp, col, a) => { const p = new Path2D(); p.moveTo(-10, h); p.lineTo(-10, y0); p.bezierCurveTo(w * 0.3, y0 - amp, w * 0.7, y0 + amp, w + 10, y0 - amp * 0.4); p.lineTo(w + 10, h); p.closePath();
      const gr = g.createLinearGradient(0, y0 - amp, 0, h); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fill(p); };
    band(h * 0.48, h * 0.08, '#7B6CF0', 0.55); band(h * 0.6, h * 0.1, '#E77FB8', 0.5); band(h * 0.74, h * 0.07, '#FFB3A6', 0.45);
    const gl = g.createRadialGradient(w * 0.5, h * 0.62, 0, w * 0.5, h * 0.62, w * 0.9); gl.addColorStop(0, 'rgba(255,190,200,0.22)'); gl.addColorStop(1, 'rgba(255,190,200,0)'); g.fillStyle = gl; g.fillRect(0, 0, w, h);
    return c;
  }
  // Q04: an image that is never shown. A blurred, unreadable placeholder: two flat skin tones, blurred past any shape.
  function makeHidden() {
    const c = mk(30, 40), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 30, 40); gr.addColorStop(0, '#D9AE95'); gr.addColorStop(0.55, '#E6C2AC'); gr.addColorStop(1, '#C99A86'); g.fillStyle = gr; g.fillRect(0, 0, 30, 40);
    const big = mk(120, 160), bg = big.getContext('2d'); bg.imageSmoothingQuality = 'high'; bg.filter = 'blur(6px)'; bg.drawImage(c, -10, -10, 140, 180); return big;
  }

  // ================================================================ PHOTO: the generated photographs (painted once, kept)
  // Not cartoons and not 3D avatars: photographs that are too perfect. Each face is painted upright and frontal (the generator squares
  // both faces to the lens), in soft blurred layers with one frontal light fixed to the face, perfectly symmetric, skin a little too smooth,
  // no freckles, stubble only as a tint, the same even smile; then rotated to the strip's tilt. Long hair is drawn strand by strand in the
  // picture's own space, so it hangs. Deterministic (OTM.rng).
  const PH = {
    her: { skin: '#EEC9AF', skinSh: '#CE957C', skinDeep: '#A9685A', blush: '#EE8F86', lips: '#D27A74', lipsDk: '#A9524F', iris: '#6C8448', irisDk: '#2E3B20', irisLt: '#B5A562',
      brow: '#8E4F33', lash: '#2B1B15', sclera: '#F3EDE6', teeth: '#F4EFE8',
      hair: '#A94D2C', hairDk: '#5C2312', hairLt: '#E8A26A', hairHi: '#F6C894',
      face: [[0, -0.56], [0.2, -0.53], [0.295, -0.4], [0.312, -0.2], [0.306, 0.02], [0.286, 0.16], [0.245, 0.285], [0.165, 0.385], [0.082, 0.436], [0, 0.45]],
      neck: 0.148, brT: 0.022, lashK: 1.25, eyeW: 0.064, eyeOpen: 0.036 },
    him: { skin: '#B98060', skinSh: '#8C5A44', skinDeep: '#5E3A2C', blush: '#B9624E', lips: '#A2675A', lipsDk: '#743E35', iris: '#4A301E', irisDk: '#1C120B', irisLt: '#86603A',
      brow: '#1F1714', lash: '#17100C', sclera: '#EFE6DA', teeth: '#F1EBE2', stubble: '#7A5444',
      hair: '#1E1714', hairDk: '#0E0A09', hairLt: '#4E3D33', hairHi: '#6E5A4C',
      face: [[0, -0.57], [0.215, -0.54], [0.315, -0.4], [0.334, -0.2], [0.33, 0.03], [0.314, 0.18], [0.282, 0.3], [0.2, 0.4], [0.1, 0.452], [0, 0.464]],
      neck: 0.182, brT: 0.03, lashK: 0.7, eyeW: 0.062, eyeOpen: 0.033 },
  };
  const symLoop = half => half.concat(half.slice(1, -1).reverse().map(([x, y]) => [-x, y]));
  // a layer the size of the face canvas, with the same local transform (origin between the eyes, 1 unit = U px)
  function faceLayer(D) { const c = mk(D.CW, D.CH), g = c.getContext('2d'); g.setTransform(D.U, 0, 0, D.U, D.OX, D.OY); return { c, g }; }
  // draw shapes into a fresh layer, blur it, keep it inside a mask, and composite it onto the face
  function soft(D, fn, blur, op, alpha, mask) {
    const A = faceLayer(D); fn(A.g);
    const B = mk(D.CW, D.CH), bg = B.getContext('2d'); if (blur > 0) bg.filter = `blur(${(blur * D.U).toFixed(2)}px)`; bg.drawImage(A.c, 0, 0); bg.filter = 'none';
    if (mask) { bg.globalCompositeOperation = 'destination-in'; bg.drawImage(mask, 0, 0); }
    const g = D.F.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = op || 'source-over'; g.globalAlpha = alpha == null ? 1 : alpha; g.drawImage(B, 0, 0); g.restore();
  }
  const ell = (g, x, y, rx, ry, col, a) => { g.fillStyle = col; g.globalAlpha = a == null ? 1 : a; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; };
  const both = (fn) => { fn(1); fn(-1); };

  function paintEye(g, P, sd, o) {
    // the right eye (sd = 1) or its mirror image; local units, centre (0.152 sd, 0)
    const cx = 0.152 * sd, w = P.eyeW, op = P.eyeOpen * (o.eyes == null ? 1 : o.eyes), sm = o.smile || 0;
    const inner = [cx - sd * w * 0.92, 0.006], outer = [cx + sd * w, -0.004], top = [cx - sd * w * 0.12, -op], bot = [cx + sd * w * 0.08, 0.021 - 0.006 * sm];
    const lid = new Path2D(); lid.moveTo(inner[0], inner[1]);
    lid.bezierCurveTo(inner[0] + sd * w * 0.25, top[1] + 0.004, top[0] - sd * w * 0.3, top[1], top[0], top[1]);
    lid.bezierCurveTo(top[0] + sd * w * 0.55, top[1], outer[0] - sd * w * 0.18, outer[1] - op * 0.45, outer[0], outer[1]);
    const opening = new Path2D(lid); opening.bezierCurveTo(outer[0] - sd * w * 0.3, bot[1] + 0.002, bot[0] + sd * w * 0.35, bot[1], bot[0], bot[1]);
    opening.bezierCurveTo(bot[0] - sd * w * 0.5, bot[1], inner[0] + sd * w * 0.2, inner[1] + 0.008, inner[0], inner[1]); opening.closePath();
    // the eye white, shaded at the corners and under the lid
    g.save(); g.clip(opening);
    const sg = g.createRadialGradient(cx, 0.0, 0.0, cx, 0.0, w * 1.05); sg.addColorStop(0, P.sclera); sg.addColorStop(0.6, mixHex(P.sclera, '#C9B7A8', 0.35)); sg.addColorStop(1, mixHex(P.sclera, '#8E6E62', 0.6));
    g.fillStyle = sg; g.fillRect(cx - w * 1.2, -0.06, w * 2.4, 0.1);
    // the iris: a dark limbal ring, the colour, a lighter ring round the pupil, fine fibres; the pupil; a catchlight (the same in both eyes)
    const ir = 0.0305, iy = -0.003;
    const ig = g.createRadialGradient(cx, iy, 0, cx, iy, ir); ig.addColorStop(0, P.irisLt); ig.addColorStop(0.42, mixHex(P.irisLt, P.iris, 0.6)); ig.addColorStop(0.72, P.iris); ig.addColorStop(0.9, P.irisDk); ig.addColorStop(1, mixHex(P.irisDk, '#000000', 0.5));
    g.fillStyle = ig; g.beginPath(); g.arc(cx, iy, ir, 0, Math.PI * 2); g.fill();
    const r = O.rng('iris' + P.iris); g.lineWidth = 0.0012;
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2 + r() * 0.05, r0 = 0.014 + r() * 0.004, r1 = ir * (0.75 + r() * 0.2); g.strokeStyle = r() < 0.5 ? rgba(P.irisLt, 0.35) : rgba(P.irisDk, 0.3); g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, iy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, iy + Math.sin(a) * r1); g.stroke(); }
    g.fillStyle = '#0A0706'; g.beginPath(); g.arc(cx, iy, 0.0118, 0, Math.PI * 2); g.fill();
    // the upper lid's shadow across the top of the eye
    const lg = g.createLinearGradient(0, -op, 0, -op + 0.026); lg.addColorStop(0, 'rgba(40,20,14,0.6)'); lg.addColorStop(1, 'rgba(40,20,14,0)'); g.fillStyle = lg; g.fillRect(cx - w * 1.2, -0.06, w * 2.4, 0.1);
    const bg2 = g.createLinearGradient(0, 0.024, 0, 0.008); bg2.addColorStop(0, 'rgba(120,80,70,0.3)'); bg2.addColorStop(1, 'rgba(120,80,70,0)'); g.fillStyle = bg2; g.fillRect(cx - w * 1.2, 0, w * 2.4, 0.03);
    g.fillStyle = 'rgba(255,255,255,0.97)'; g.beginPath(); g.ellipse(cx - 0.006, iy - 0.011, 0.0058, 0.0052, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(cx + 0.009, iy + 0.008, 0.0022, 0, Math.PI * 2); g.fill();
    g.restore();
    // the pink inner corner
    ell(g, inner[0] + sd * 0.006, inner[1] + 0.001, 0.007, 0.006, '#D8988C', 0.85);
    // the lash line, thicker toward the outer corner, then lashes (hers longer)
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = rgba(P.lash, 0.85); g.lineWidth = 0.003 * (0.6 + 0.4 * P.lashK); g.stroke(lid);
    g.lineWidth = 0.0016 * P.lashK; g.globalAlpha = 0.6;
    const lr = O.rng('lash' + sd + P.lash), n = Math.round(16 * P.lashK);
    for (let i = 0; i < n; i++) { const u = 0.15 + 0.85 * i / (n - 1); const x = lerp(inner[0], outer[0], u), y = lerp(inner[1], outer[1], u) - Math.sin(Math.PI * Math.min(1, u * 1.05)) * (op - 0.004) - 0.001;
      const len = (0.008 + 0.014 * u) * P.lashK * (0.85 + 0.3 * lr()), ang = -Math.PI / 2 + sd * (0.25 + 0.9 * u);
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.7, x + Math.cos(ang + sd * 0.35) * len, y + Math.sin(ang + sd * 0.35) * len); g.stroke(); }
    g.restore();
    return { lid, opening, inner, outer, top, bot };
  }

  // one face, upright: returns {c, ox, oy} (the canvas and the pixel position of the point between the eyes)
  function paintFace(who, U, o) {
    o = o || {}; const P = PH[who], sm = o.smile == null ? 1 : o.smile, open = o.open == null ? 0.3 : o.open;
    const D = { U, CW: Math.ceil(U * 1.06), CH: Math.ceil(U * 1.9), OX: Math.ceil(U * 1.06) / 2, OY: U * 0.8 };
    D.F = faceLayer(D); const g = D.F.g;
    const faceP = GG.spline(symLoop(P.face), true), nk = P.neck;
    const neckP = GG.spline([[-nk, 0.12], [nk, 0.12], [nk * 1.04, 0.62], [nk * 1.5, 0.98, 1], [-nk * 1.5, 0.98, 1], [-nk * 1.04, 0.62]], true);
    const earX = (P.face[4][0] + 0.022), earP = new Path2D(); both(sd => { earP.ellipse(sd * earX, 0.065, 0.042, 0.095, sd * -0.12, 0, Math.PI * 2); });
    // the skin's mask
    const M = faceLayer(D); M.g.fillStyle = '#fff'; M.g.fill(neckP); M.g.fill(earP); M.g.fill(faceP);
    // base colours: the neck a shade deeper, ears, face
    g.fillStyle = mixHex(P.skin, P.skinSh, 0.25); g.fill(neckP); g.fillStyle = mixHex(P.skin, P.skinSh, 0.15); g.fill(earP); g.fillStyle = P.skin; g.fill(faceP);
    // ---- form: everything turns away from the one frontal light, softly
    soft(D, l => { const gr = l.createRadialGradient(0, 0, 0.05, 0, 0, 1); gr.addColorStop(0, rgba(P.skinSh, 0)); gr.addColorStop(0.62, rgba(P.skinSh, 0.0)); gr.addColorStop(0.92, rgba(P.skinSh, 0.55)); gr.addColorStop(1, rgba(P.skinDeep, 0.8));
      l.save(); l.translate(0, -0.02); l.scale(0.345, 0.52); l.fillStyle = gr; l.fillRect(-1.2, -1.2, 2.4, 2.4); l.restore(); }, 0.02, 'multiply', 1, M.c);
    // the face's shadow on the neck, the ears' inner shade
    soft(D, l => { const gr = l.createLinearGradient(0, 0.36, 0, 0.72); gr.addColorStop(0, rgba(P.skinDeep, 0.45)); gr.addColorStop(0.5, rgba(P.skinSh, 0.22)); gr.addColorStop(1, rgba(P.skinSh, 0)); l.fillStyle = gr; l.fill(neckP);
      l.globalCompositeOperation = 'destination-out'; l.fill(faceP); l.globalCompositeOperation = 'source-over';
      both(sd => ell(l, sd * (earX - 0.004), 0.07, 0.022, 0.062, P.skinDeep, 0.55)); }, 0.012, 'multiply', 1, M.c);
    // sockets, the sides of the nose, under the nose, under the lip, under the jaw
    soft(D, l => {
      both(sd => { ell(l, sd * 0.152, -0.018, 0.085, 0.05, P.skinSh, 0.55); ell(l, sd * 0.08, 0.0, 0.03, 0.03, P.skinSh, 0.45); });
      l.lineCap = 'round'; both(sd => { l.strokeStyle = rgba(P.skinSh, 0.55); l.lineWidth = 0.026; l.beginPath(); l.moveTo(sd * 0.05, -0.01); l.quadraticCurveTo(sd * 0.04, 0.08, sd * 0.052, 0.165); l.stroke(); });
      ell(l, 0, 0.226, 0.05, 0.016, P.skinDeep, 0.5); ell(l, 0, 0.372, 0.05, 0.016, P.skinSh, 0.55);
      both(sd => ell(l, sd * 0.11, 0.33, 0.022, 0.03, P.skinSh, 0.3));
      both(sd => ell(l, sd * 0.255, 0.21, 0.05, 0.1, P.skinSh, 0.28));
    }, 0.02, 'multiply', 1, M.c);
    // the light: forehead, the bridge and tip of the nose, the cheekbones, the chin, the upper lip's ridge (soft, never banded)
    soft(D, l => {
      ell(l, 0, -0.27, 0.15, 0.09, '#FFF6EE', 0.5); ell(l, 0, 0.06, 0.016, 0.09, '#FFF6EE', 0.45); ell(l, 0, 0.158, 0.028, 0.024, '#FFF8F2', 0.6);
      both(sd => { ell(l, sd * 0.19, 0.06, 0.07, 0.035, '#FFF4EA', 0.35); ell(l, sd * 0.15, -0.075, 0.06, 0.012, '#FFF4EA', 0.25); });
      ell(l, 0, 0.407, 0.045, 0.022, '#FFF4EA', 0.4); ell(l, 0, 0.262, 0.03, 0.008, '#FFF6EE', 0.35);
    }, 0.022, 'screen', 0.55, M.c);
    // rosy cheeks (the generator's improvement), and his stubble as a smooth tint
    soft(D, l => { both(sd => ell(l, sd * 0.175, 0.13, 0.085, 0.055, P.blush, who === 'her' ? 0.55 : 0.35)); ell(l, 0, -0.2, 0.08, 0.05, P.blush, 0.12); }, 0.035, 'multiply', who === 'her' ? 0.45 : 0.35, M.c);
    if (P.stubble) soft(D, l => { l.fillStyle = P.stubble; l.beginPath(); l.moveTo(-0.3, 0.2); l.bezierCurveTo(-0.2, 0.24, -0.1, 0.235, 0, 0.24); l.bezierCurveTo(0.1, 0.235, 0.2, 0.24, 0.3, 0.2); l.lineTo(0.3, 0.5); l.lineTo(-0.3, 0.5); l.closePath(); l.fill(); }, 0.02, 'multiply', 0.32, M.c);
    // ---- the brows: many fine hairs, soft
    soft(D, l => { both(sd => {
      const r = O.rng('brow' + sd + who); l.lineCap = 'round';
      const bx = u => sd * lerp(0.062, 0.245, u), by = u => -0.112 - 0.028 * Math.sin(Math.PI * Math.min(1, u * 1.25)) + 0.01 * u, th = u => P.brT * (1 - 0.65 * u);
      l.fillStyle = rgba(P.brow, 0.6); l.beginPath(); for (let i = 0; i <= 20; i++) { const u = i / 20; l.lineTo(bx(u), by(u) - th(u) / 2); } for (let i = 20; i >= 0; i--) { const u = i / 20; l.lineTo(bx(u), by(u) + th(u) / 2); } l.fill();
      for (let i = 0; i < 260; i++) { const u = r(), y = by(u) + (r() - 0.5) * th(u), x = bx(u), ang = u < 0.18 ? -Math.PI / 2 + sd * 0.4 : (sd > 0 ? -0.25 : Math.PI + 0.25) + (r() - 0.5) * 0.3, len = 0.012 + 0.014 * r();
        l.strokeStyle = rgba(r() < 0.8 ? P.brow : mixHex(P.brow, '#000000', 0.4), 0.45 + 0.4 * r()); l.lineWidth = 0.0022; l.beginPath(); l.moveTo(x, y); l.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); l.stroke(); } }); }, 0.0025, 'source-over', 1);
    // ---- the eyes: the lid crease and lid above, then the eye itself
    soft(D, l => { both(sd => { l.strokeStyle = rgba(P.skinDeep, 0.5); l.lineWidth = 0.006; l.lineCap = 'round'; l.beginPath(); l.moveTo(sd * 0.094, -0.022); l.quadraticCurveTo(sd * 0.145, -0.068, sd * 0.215, -0.028); l.stroke();
      l.strokeStyle = rgba(P.skinDeep, 0.28); l.lineWidth = 0.004; l.beginPath(); l.moveTo(sd * 0.1, 0.022); l.quadraticCurveTo(sd * 0.155, 0.04, sd * 0.208, 0.012); l.stroke(); }); }, 0.005, 'multiply', 1);
    { const E = faceLayer(D); both(sd => paintEye(E.g, P, sd, { smile: sm, eyes: o.eyes })); const B = mk(D.CW, D.CH), bg = B.getContext('2d'); bg.filter = `blur(${(0.0017 * U).toFixed(2)}px)`; bg.drawImage(E.c, 0, 0); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(B, 0, 0); g.restore(); }
    // ---- the nose: no lines, only the soft wings and nostrils
    soft(D, l => { both(sd => { l.strokeStyle = rgba(P.skinDeep, 0.38); l.lineWidth = 0.008; l.lineCap = 'round'; l.beginPath(); l.arc(sd * 0.036, 0.186, 0.022, sd > 0 ? -1.1 : Math.PI + 1.1, sd > 0 ? 1.4 : Math.PI - 1.4, sd < 0); l.stroke();
      ell(l, sd * 0.02, 0.205, 0.011, 0.0055, mixHex(P.skinDeep, '#2A120C', 0.25), 0.55); }); }, 0.005, 'multiply', 1);
    // ---- the mouth: the same even smile, upper teeth showing
    { const cxm = 0.074 + 0.014 * sm, cym = 0.306 - 0.02 * sm, yu = 0.299, yl = yu + 0.012 + 0.05 * open, ul = new Path2D(), ll = new Path2D(), teeth = new Path2D();
      ul.moveTo(-cxm, cym); ul.bezierCurveTo(-cxm * 0.75, cym - 0.012, -0.04, yu - 0.026, -0.022, yu - 0.028); ul.quadraticCurveTo(-0.008, yu - 0.022, 0, yu - 0.019); ul.quadraticCurveTo(0.008, yu - 0.022, 0.022, yu - 0.028);
      ul.bezierCurveTo(0.04, yu - 0.026, cxm * 0.75, cym - 0.012, cxm, cym); ul.bezierCurveTo(cxm * 0.6, cym + 0.006, 0.04, yu + 0.002, 0, yu + 0.002); ul.bezierCurveTo(-0.04, yu + 0.002, -cxm * 0.6, cym + 0.006, -cxm, cym); ul.closePath();
      teeth.moveTo(-cxm, cym); teeth.bezierCurveTo(-cxm * 0.6, cym + 0.006, -0.04, yu + 0.001, 0, yu + 0.001); teeth.bezierCurveTo(0.04, yu + 0.001, cxm * 0.6, cym + 0.006, cxm, cym);
      teeth.bezierCurveTo(cxm * 0.7, cym + 0.018, 0.045, yl, 0, yl); teeth.bezierCurveTo(-0.045, yl, -cxm * 0.7, cym + 0.018, -cxm, cym); teeth.closePath();
      ll.moveTo(-cxm, cym); ll.bezierCurveTo(-cxm * 0.7, cym + 0.018, -0.045, yl, 0, yl); ll.bezierCurveTo(0.045, yl, cxm * 0.7, cym + 0.018, cxm, cym);
      ll.bezierCurveTo(cxm * 0.8, cym + 0.03, 0.05, yl + 0.034, 0, yl + 0.035); ll.bezierCurveTo(-0.05, yl + 0.034, -cxm * 0.8, cym + 0.03, -cxm, cym); ll.closePath();
      const Mo = faceLayer(D), mg = Mo.g;
      mg.fillStyle = '#4A1C18'; mg.fill(teeth);
      mg.save(); mg.clip(teeth); const tg = mg.createLinearGradient(-cxm, 0, cxm, 0); tg.addColorStop(0, mixHex(P.teeth, '#6A4A40', 0.7)); tg.addColorStop(0.22, mixHex(P.teeth, '#B8A89A', 0.3)); tg.addColorStop(0.5, P.teeth); tg.addColorStop(0.78, mixHex(P.teeth, '#B8A89A', 0.3)); tg.addColorStop(1, mixHex(P.teeth, '#6A4A40', 0.7));
      mg.fillStyle = tg; mg.beginPath(); mg.moveTo(-cxm, cym); mg.bezierCurveTo(-cxm * 0.6, cym + 0.006, -0.04, yu, 0, yu); mg.bezierCurveTo(0.04, yu, cxm * 0.6, cym + 0.006, cxm, cym); mg.lineTo(cxm, yu + 0.024); mg.bezierCurveTo(0.04, yu + 0.026, -0.04, yu + 0.026, -cxm, yu + 0.024); mg.closePath(); mg.fill();
      mg.strokeStyle = 'rgba(120,90,80,0.16)'; mg.lineWidth = 0.0015; [-0.034, -0.012, 0.012, 0.034].forEach(x => { mg.beginPath(); mg.moveTo(x * 1.0, yu); mg.lineTo(x * 1.02, yu + 0.022); mg.stroke(); });
      const sh = mg.createLinearGradient(0, yu, 0, yu + 0.012); sh.addColorStop(0, 'rgba(60,30,25,0.45)'); sh.addColorStop(1, 'rgba(60,30,25,0)'); mg.fillStyle = sh; mg.fillRect(-0.1, yu - 0.01, 0.2, 0.03); mg.restore();
      const ug = mg.createLinearGradient(0, yu - 0.03, 0, yu + 0.004); ug.addColorStop(0, P.lips); ug.addColorStop(1, P.lipsDk); mg.fillStyle = ug; mg.fill(ul);
      const lg = mg.createLinearGradient(0, yl, 0, yl + 0.036); lg.addColorStop(0, P.lipsDk); lg.addColorStop(0.35, P.lips); lg.addColorStop(1, mixHex(P.lips, P.skin, 0.35)); mg.fillStyle = lg; mg.fill(ll);
      mg.save(); mg.clip(ll); mg.filter = `blur(${(0.006 * U).toFixed(2)}px)`; ell(mg, 0.0, yl + 0.016, 0.028, 0.008, '#FFF2EC', 0.55); mg.restore();
      mg.save(); mg.clip(ul); mg.filter = `blur(${(0.004 * U).toFixed(2)}px)`; ell(mg, 0.0, yu - 0.022, 0.03, 0.004, '#FFE8E0', 0.35); mg.restore();
      const B = mk(D.CW, D.CH), bg = B.getContext('2d'); bg.filter = `blur(${(0.0016 * U).toFixed(2)}px)`; bg.drawImage(Mo.c, 0, 0); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(B, 0, 0); g.restore();
      // the smile's corners, softly
      soft(D, l => { both(sd => { ell(l, sd * (cxm + 0.012), cym + 0.004, 0.012, 0.018, P.skinSh, 0.55); l.strokeStyle = rgba(P.skinSh, 0.35); l.lineWidth = 0.008; l.beginPath(); l.moveTo(sd * 0.062, 0.215); l.quadraticCurveTo(sd * 0.105, 0.26, sd * (cxm + 0.018), cym + 0.012); l.stroke(); }); }, 0.012, 'multiply', 0.8, M.c);
    }
    // ---- his hair: short, dark, curly, grown out a little
    if (who === 'him') {
      const hp = new Path2D(); const hairHalf = [[0, -0.69], [0.2, -0.665], [0.33, -0.55], [0.375, -0.35], [0.36, -0.12], [0.338, -0.04], [0.316, -0.15], [0.28, -0.29], [0.17, -0.36], [0, -0.372]];
      GG.spline(symLoop(hairHalf), true, hp);
      soft(D, l => { l.fillStyle = P.skinDeep; l.translate(0, 0.03); l.fill(hp); }, 0.03, 'multiply', 0.55, M.c);   // its soft shadow on the forehead
      const Hh = faceLayer(D), hg = Hh.g; hg.fillStyle = P.hair; hg.fill(hp);
      const r = O.rng('curls'); hg.save(); hg.lineCap = 'round';
      for (let i = 0; i < 900; i++) { const x = (r() - 0.5) * 0.78, y = -0.7 + r() * 0.68; if (!hg.isPointInPath(hp, x * U + D.OX, y * U + D.OY)) continue;
        const rr = 0.008 + r() * 0.012, a0 = r() * Math.PI * 2, lit = (-y - 0.2) * 1.2 + (r() - 0.5) * 0.6;
        hg.strokeStyle = lit > 0.35 ? rgba(P.hairHi, 0.45 + 0.3 * r()) : lit > 0 ? rgba(P.hairLt, 0.5 + 0.3 * r()) : rgba(P.hairDk, 0.7); hg.lineWidth = 0.003 + r() * 0.0025;
        hg.beginPath(); hg.arc(x, y, rr, a0, a0 + 2.2 + r() * 1.5); hg.stroke(); }
      // a curly silhouette: small coils standing proud of the outline
      for (let i = 0; i < 140; i++) { const a = -Math.PI * (0.06 + 0.88 * r()), x = Math.cos(a) * 0.37, y = -0.33 + Math.sin(a) * 0.35, rr = 0.012 + r() * 0.01; hg.fillStyle = P.hair; hg.beginPath(); hg.arc(x, y, rr, 0, Math.PI * 2); hg.fill(); }
      hg.restore();
      const B = mk(D.CW, D.CH), bg = B.getContext('2d'); bg.filter = `blur(${(0.0018 * U).toFixed(2)}px)`; bg.drawImage(Hh.c, 0, 0); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(B, 0, 0); g.restore();
    }
    // the whole face a touch soft (a lens, and a beauty filter)
    const out = mk(D.CW, D.CH), og = out.getContext('2d'); og.filter = `blur(${(0.0012 * U).toFixed(2)}px)`; og.drawImage(D.F.c, 0, 0);
    return { c: out, ox: D.OX, oy: D.OY, M: M.c };
  }

  // long copper hair, strand by strand, in the picture's own space (so it hangs): layer 'back' (behind the neck and shoulders) or 'front'.
  // head: {x, y, U, roll}; o: {len (how far below the eyes it falls, head units), seed}
  function paintLongHair(g, head, layer, o) {
    o = o || {}; const P = PH.her, U = head.U, cr = Math.cos(head.roll), sr = Math.sin(head.roll), r = O.rng('hair' + layer + (o.seed || 1));
    const toS = (x, y) => [head.x + (x * cr - y * sr) * U, head.y + (x * sr + y * cr) * U];
    const len = o.len == null ? 1.45 : o.len, part = 0.11;
    // a strand: local path around the head down to `hang` (local y), then it falls in picture space, with a slow wave
    const strand = (pts, hang, drop, spread, wave) => {
      const out = pts.map(([x, y]) => toS(x, y)); const last = out[out.length - 1], prev = out[out.length - 2];
      let dx = last[0] - prev[0], dy = last[1] - prev[1]; const l0 = Math.hypot(dx, dy) || 1; dx /= l0; dy /= l0;
      const n = 16, step = drop * U / n; let x = last[0], y = last[1];
      for (let i = 1; i <= n; i++) { const t = i / n, k = Math.min(1, t * 2.4); const vx = lerp(dx, spread * (0.6 + t), k), vy = lerp(dy, 1, k), vl = Math.hypot(vx, vy);
        x += vx / vl * step + Math.sin(t * wave.f + wave.ph) * wave.a * U * Math.min(1, t * 3) / n * 6; y += vy / vl * step; out.push([x, y]); }
      return out;
    };
    const path = pts => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; p.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } const e = pts[pts.length - 1]; p.lineTo(e[0], e[1]); return p; };
    const lerpPts = (A, B, t) => A.map((q, i) => [lerp(q[0], B[i][0], t), lerp(q[1], B[i][1], t)]);
    // hair falls in clumps: strands in a clump share a wave and a length
    const clumps = []; for (let i = 0; i < 70; i++) clumps.push({ f: 3 + r() * 4, ph: r() * 6.3, a: 0.004 + r() * 0.012, len: Math.pow(r(), 1.6) * 0.45, sh: r() });
    const strands = [];
    if (layer === 'back') {
      // the fall behind her neck and shoulders, from under the crown
      for (let i = 0; i < 300; i++) { const s = r() * 2 - 1, x0 = s * 0.3, cl = clumps[Math.floor(r() * clumps.length)]; strands.push({ pts: strand([[x0 * 0.6, -0.4], [x0 * 1.1, -0.1], [x0 * 1.18, 0.25]], 0.25, len - 0.25 - cl.len * 0.5 + r() * 0.1, s * 0.16, cl), w: 0.02 + r() * 0.03, tone: 0.3 + r() * 0.5 }); }
    } else {
      // from the part: the strands nearest the face form the fringe and the curtains' inner edges; the deeper ones go over the crown
      for (let side of [1, -1]) {
        const N = side > 0 ? 380 : 460;
        for (let i = 0; i < N; i++) {
          const s = Math.pow(r(), 0.85), jx = (r() - 0.5) * 0.014, cl = clumps[Math.floor(s * 34 + r() * 36) % clumps.length];
          const x0 = part + (r() - 0.5) * 0.012, y0 = -0.47 - 0.1 * s;
          let A, B;
          if (side > 0) { A = [[x0, y0], [0.2, -0.47], [0.29, -0.36], [0.315, -0.14], [0.3, 0.12]]; B = [[x0, y0], [0.22, -0.61], [0.35, -0.44], [0.385, -0.15], [0.375, 0.12]]; }
          else { A = [[x0, y0], [-0.04, -0.45], [-0.2, -0.38], [-0.3, -0.22], [-0.31, 0.12]]; B = [[x0, y0], [-0.08, -0.64], [-0.27, -0.55], [-0.385, -0.25], [-0.38, 0.12]]; }
          const pts = lerpPts(A, B, s).map(([x, y], k) => [x + (k > 1 ? jx : 0), y]);
          strands.push({ pts: strand(pts, 0.12, len - 0.06 - cl.len - 0.12 * s + r() * 0.06, side * (0.05 + 0.1 * s), cl), w: 0.004 + r() * 0.006, tone: clamp(s * 0.55 + cl.sh * 0.45, 0, 1) });
        }
      }
    }
    // clumps first (the body of the hair), then fine strands over them, darker within, lighter at the surface; every strand tapers to its tip
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    const Hl = mk(g.canvas.width, g.canvas.height), hg = Hl.getContext('2d'); hg.setTransform(g.getTransform()); hg.lineCap = 'round'; hg.lineJoin = 'round';
    if (layer === 'front') {   // the cap of hair over the skull, from the part, so no scalp shows between the strands
      const cap = GG.spline([[0.31, -0.12], [0.36, -0.4], [0.24, -0.585], [0.04, -0.655], [-0.2, -0.61], [-0.35, -0.44], [-0.37, -0.14], [-0.3, -0.2], [-0.19, -0.36], [-0.03, -0.43], [0.11, -0.46], [0.25, -0.34]].map(([x, y]) => toS(x, y)), true);
      hg.save(); hg.setTransform(1, 0, 0, 1, 0, 0); hg.fillStyle = mixHex(P.hairDk, P.hair, 0.55); hg.fill(cap); hg.restore(); }
    const taper = (st, w, col, a) => { const n = st.pts.length, cut = [Math.floor(n * 0.7), Math.floor(n * 0.86), n];
      [[0, cut[0] + 1, 1, 1], [cut[0], cut[1] + 1, 0.6, 0.75], [cut[1], cut[2], 0.28, 0.4]].forEach(([i0, i1, wk, ak]) => { const seg = st.pts.slice(i0, i1); if (seg.length < 2) return; hg.strokeStyle = rgba(col, a * ak); hg.lineWidth = Math.max(0.5, w * wk); hg.stroke(path(seg)); }); };
    strands.forEach(st => taper(st, (layer === 'back' ? st.w : 0.026 + 0.012 * st.tone) * U, mixHex(P.hairDk, P.hair, 0.5 + 0.35 * (1 - st.tone)), 1));
    strands.forEach(st => taper(st, Math.max(0.6, st.w * U * 0.45), st.tone < 0.35 ? mixHex(P.hair, P.hairLt, 0.5 * (1 - st.tone)) : mixHex(P.hairDk, P.hair, 0.7), 0.55));
    for (let i = 0; i < strands.length; i += 2) taper(strands[i], Math.max(0.5, 0.0016 * U), r() < 0.5 ? P.hairLt : P.hair, 0.3);
    // the sheen: a soft lighter band over the crown and down the curtains (the light fixed to her, the same as on her face)
    const Sh = mk(g.canvas.width, g.canvas.height), sg = Sh.getContext('2d'); sg.setTransform(g.getTransform()); sg.filter = `blur(${(0.03 * U).toFixed(1)}px)`;
    if (layer === 'front') { const a = toS(-0.02, -0.52), b = toS(0.2, -0.5); sg.fillStyle = rgba(P.hairHi, 0.85); sg.beginPath(); sg.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.2 * U, 0.05 * U, head.roll, 0, Math.PI * 2); sg.fill();
      both(sd => { const c0 = toS(sd * 0.36, 0.05); sg.beginPath(); sg.ellipse(c0[0], c0[1] + 0.25 * U, 0.03 * U, 0.3 * U, 0, 0, Math.PI * 2); sg.fill(); }); }
    sg.filter = 'none'; sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'destination-in'; sg.drawImage(Hl, 0, 0);
    hg.save(); hg.setTransform(1, 0, 0, 1, 0, 0); hg.globalCompositeOperation = 'screen'; hg.globalAlpha = 0.55; hg.drawImage(Sh, 0, 0); hg.restore();
    if (o.rim !== false) {   // the scene's own sun, behind them at the top of the fall: a thin warm rim along the hair's top right
      const Rm = mk(g.canvas.width, g.canvas.height), rg = Rm.getContext('2d'); rg.drawImage(Hl, 0, 0); rg.globalCompositeOperation = 'destination-out'; rg.drawImage(Hl, -0.012 * U, 0.016 * U);
      rg.globalCompositeOperation = 'source-in'; rg.fillStyle = 'rgba(255,236,206,0.75)'; rg.fillRect(0, 0, Rm.width, Rm.height);
      hg.save(); hg.setTransform(1, 0, 0, 1, 0, 0); hg.globalCompositeOperation = 'screen'; hg.filter = `blur(${(0.004 * U).toFixed(1)}px)`; hg.drawImage(Rm, 0, 0); hg.restore(); }
    g.setTransform(1, 0, 0, 1, 0, 0); g.filter = `blur(${(0.0012 * U).toFixed(2)}px)`; g.drawImage(Hl, 0, 0); g.restore();
  }

  // clothes: a body hung from a neck point, softly shaded (his navy jacket over a white tee; her cream sweater)
  function paintBody(g, who, nk, U, lean, o) {
    o = o || {}; const her = who === 'her', wS = her ? 0.84 : 1.0, cs = Math.cos(lean), sn = Math.sin(lean), R = (x, y) => [nk[0] + (x * cs - y * sn) * U, nk[1] + (x * sn + y * cs) * U];
    const pts = [[-0.22, 0.0], [-0.42 * wS, 0.1], [-0.78 * wS, 0.24], [-1.04 * wS, 0.46], [-1.14 * wS, 0.9], [-1.2 * wS, 2.6], [1.2 * wS, 2.6], [1.14 * wS, 0.9], [1.04 * wS, 0.46], [0.78 * wS, 0.24], [0.42 * wS, 0.1], [0.22, 0.0], [0.11, 0.1], [0, 0.125], [-0.11, 0.1]].map(q => R(q[0], q[1]));
    const p = GG.spline(pts, true); const base = her ? '#F2EADF' : '#26344C';
    g.save(); const a = R(-1, 0.1), b = R(1, 1.6); const gr = g.createLinearGradient(a[0], a[1], b[0], b[1]); gr.addColorStop(0, mixHex(base, '#FFFFFF', 0.25)); gr.addColorStop(0.5, base); gr.addColorStop(1, mixHex(base, '#000000', 0.2));
    g.fillStyle = gr; g.fill(p); g.clip(p);
    // the shoulders turn away from the light; soft folds
    g.filter = `blur(${(0.05 * U).toFixed(1)}px)`; both(sd => { const c = R(sd * 1.15, 0.9); g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(c[0], c[1], 0.25 * U, 0.9 * U, 0, 0, Math.PI * 2); g.fill(); });
    g.filter = `blur(${(0.02 * U).toFixed(1)}px)`; g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 0.03 * U; both(sd => { const s0 = R(sd * 0.5, 0.55), s1 = R(sd * 0.62, 1.2), s2 = R(sd * 0.55, 1.9); g.beginPath(); g.moveTo(s0[0], s0[1]); g.quadraticCurveTo(s1[0], s1[1], s2[0], s2[1]); g.stroke(); });
    g.filter = 'none';
    if (!her) {   // the white tee in the open jacket, its round collar
      const t = GG.spline([[-0.3, -0.04], [-0.2, 0.0], [0, 0.03], [0.2, 0.0], [0.3, -0.04], [0.36, 0.5], [0.38, 2.6, 1], [-0.36, 2.6, 1], [-0.34, 0.5]].map(q => R(q[0], q[1])), true);
      const A = R(0, 0), C = R(0.3, 2.0); const tg = g.createLinearGradient(A[0], A[1], C[0], C[1]); tg.addColorStop(0, '#FBF8F3'); tg.addColorStop(1, '#D6D1C9'); g.fillStyle = tg; g.fill(t);
      // the crew collar: a soft rib round the base of his neck
      const k0 = R(-0.2, 0.0), k1 = R(-0.1, 0.07), k2 = R(0.1, 0.07), k3 = R(0.2, 0.0); g.strokeStyle = 'rgba(150,140,128,0.55)'; g.lineWidth = 0.028 * U; g.filter = `blur(${(0.006 * U).toFixed(1)}px)`; g.beginPath(); g.moveTo(k0[0], k0[1]); g.bezierCurveTo(k1[0], k1[1], k2[0], k2[1], k3[0], k3[1]); g.stroke(); g.filter = 'none';
      both(sd => { const l0 = R(sd * 0.26, -0.01), l1 = R(sd * 0.34, 0.5), l2 = R(sd * 0.36, 2.6); g.strokeStyle = 'rgba(10,14,24,0.55)'; g.lineWidth = 0.02 * U; g.filter = `blur(${(0.01 * U).toFixed(1)}px)`; g.beginPath(); g.moveTo(l0[0], l0[1]); g.quadraticCurveTo(l1[0], l1[1], l2[0], l2[1]); g.stroke(); g.filter = 'none'; });
    } else {   // her round neckline, a soft rib
      const L0 = R(-0.2, -0.005), L1 = R(-0.11, 0.13), R1 = R(0.11, 0.13), R0 = R(0.2, -0.005);
      g.filter = `blur(${(0.008 * U).toFixed(1)}px)`; g.strokeStyle = 'rgba(150,128,110,0.4)'; g.lineWidth = 0.024 * U; g.beginPath(); g.moveTo(L0[0], L0[1]); g.bezierCurveTo(L1[0], L1[1], R1[0], R1[1], R0[0], R0[1]); g.stroke(); g.filter = 'none';
    }
    g.restore();
    return { p, R };
  }
  // place a painted face (upright canvas) at a head position with the head's roll; the neck below the neckline is cut by the body after
  function placeFace(g, F, x, y, roll) { g.save(); g.translate(x, y); g.rotate(roll); g.drawImage(F.c, -F.ox, -F.oy); g.restore(); }

  // the gorge behind them, as a phone's portrait mode would show it: lush, symmetric (one half mirrored), the water whiter than anything
  function paintGorge(w, h) {
    const c = mk(w, h), g = c.getContext('2d'), r = O.rng('gorge');
    const sk = g.createLinearGradient(0, 0, 0, h * 0.5); sk.addColorStop(0, '#A9E9F4'); sk.addColorStop(1, '#F1FCFF'); g.fillStyle = sk; g.fillRect(0, 0, w, h);
    const half = mk(w, h), hg = half.getContext('2d');
    // the rock wall, dark and wet
    const cliff = new Path2D(); cliff.moveTo(-10, -10); cliff.lineTo(w * 0.41, -10); cliff.bezierCurveTo(w * 0.42, h * 0.18, w * 0.38, h * 0.32, w * 0.41, h * 0.5); cliff.lineTo(w * 0.43, h * 0.66); cliff.lineTo(-10, h * 0.72); cliff.closePath();
    const cg = hg.createLinearGradient(0, 0, w * 0.45, h * 0.4); cg.addColorStop(0, '#173A36'); cg.addColorStop(0.6, '#25524B'); cg.addColorStop(1, '#4C7C70'); hg.fillStyle = cg; hg.fill(cliff);
    hg.save(); hg.clip(cliff); for (let i = 0; i < 90; i++) { const x = r() * w * 0.45, y = r() * h * 0.7; hg.strokeStyle = r() < 0.5 ? 'rgba(10,30,28,0.35)' : 'rgba(150,200,190,0.18)'; hg.lineWidth = 2 + r() * 5; hg.beginPath(); hg.moveTo(x, y); hg.lineTo(x + (r() - 0.5) * 20, y + 40 + r() * 120); hg.stroke(); } hg.restore();
    // the greenery hanging down the walls: many soft leaf-masses, lit from above (the sun is behind the fall)
    const greens = ['#0F4A36', '#17603F', '#237A4B', '#2E9157', '#48A862', '#6FC273', '#A3DE8C'];
    for (let i = 0; i < 420; i++) {
      const y = Math.pow(r(), 0.9) * h * 0.66, edge = w * (0.36 + 0.05 * Math.sin(y / h * 7)), x = r() * edge * 1.02, rad = w * (0.018 + 0.05 * r()) * (0.6 + y / h);
      const lit = clamp(0.25 + (1 - y / (h * 0.7)) * 0.5 + (r() - 0.5) * 0.5, 0, 1), base = greens[Math.floor(lit * (greens.length - 1))], top = greens[Math.min(greens.length - 1, Math.floor(lit * (greens.length - 1)) + 2)];
      const gr = hg.createRadialGradient(x - rad * 0.2, y - rad * 0.45, rad * 0.1, x, y, rad); gr.addColorStop(0, top); gr.addColorStop(0.7, base); gr.addColorStop(1, rgba(base, 0));
      hg.fillStyle = gr; hg.beginPath(); hg.ellipse(x, y, rad, rad * (0.75 + 0.3 * r()), 0, 0, Math.PI * 2); hg.fill();
    }
    // dark rocks at the pool's edge
    for (let i = 0; i < 9; i++) { const x = w * (0.02 + 0.33 * r()), y = h * (0.66 + 0.06 * r()), rx = w * (0.05 + 0.06 * r()); const gr = hg.createLinearGradient(x, y - rx * 0.6, x, y + rx * 0.4); gr.addColorStop(0, '#5C7A70'); gr.addColorStop(1, '#16302B'); hg.fillStyle = gr; hg.beginPath(); hg.ellipse(x, y, rx, rx * 0.45, 0, 0, Math.PI * 2); hg.fill(); }
    g.drawImage(half, 0, 0); g.save(); g.translate(w, 0); g.scale(-1, 1); g.drawImage(half, 0, 0); g.restore();
    // the fall: a column of white, widening, with clean streaks
    const fall = new Path2D(); fall.moveTo(w * 0.43, -10); fall.lineTo(w * 0.57, -10); fall.bezierCurveTo(w * 0.585, h * 0.25, w * 0.6, h * 0.45, w * 0.66, h * 0.64); fall.lineTo(w * 0.34, h * 0.64); fall.bezierCurveTo(w * 0.4, h * 0.45, w * 0.415, h * 0.25, w * 0.43, -10); fall.closePath();
    const fg = g.createLinearGradient(w * 0.35, 0, w * 0.65, 0); fg.addColorStop(0, '#DDF6FA'); fg.addColorStop(0.3, '#FFFFFF'); fg.addColorStop(0.7, '#FFFFFF'); fg.addColorStop(1, '#DDF6FA'); g.fillStyle = fg; g.fill(fall);
    g.save(); g.clip(fall); for (let i = 0; i < 70; i++) { const x = w * (0.34 + 0.32 * r()), sw = w * (0.002 + 0.006 * r()); g.fillStyle = r() < 0.6 ? 'rgba(150,215,228,0.32)' : 'rgba(255,255,255,0.8)'; g.fillRect(x, -10, sw, h); } g.restore();
    // mist and the pool
    const pool = g.createLinearGradient(0, h * 0.63, 0, h); pool.addColorStop(0, '#A6F1EE'); pool.addColorStop(0.5, '#4ECFCB'); pool.addColorStop(1, '#16A1A4'); g.fillStyle = pool; g.fillRect(0, h * 0.64, w, h * 0.36);
    for (let i = 0; i < 26; i++) { const y = h * (0.66 + 0.33 * r()), x = w * r(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x - w * 0.12, y, w * 0.24, 2 + r() * 2); }
    const rf = g.createLinearGradient(0, h * 0.64, 0, h); rf.addColorStop(0, 'rgba(255,255,255,0.9)'); rf.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rf; g.fillRect(w * 0.36, h * 0.64, w * 0.28, h * 0.36);
    [[0.5, 0.63, 0.45, 0.95], [0.3, 0.66, 0.26, 0.55], [0.7, 0.66, 0.26, 0.55], [0.5, 0.5, 0.3, 0.45], [0.5, 0.8, 0.5, 0.3]].forEach(([x, y, rr, a]) => { const mg = g.createRadialGradient(w * x, h * y, 0, w * x, h * y, w * rr); mg.addColorStop(0, `rgba(255,255,255,${a})`); mg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = mg; g.fillRect(0, 0, w, h); });
    // portrait mode: the background far out of focus
    const out = mk(w, h), og = out.getContext('2d'); og.filter = `blur(${(w / 75).toFixed(1)}px)`; og.drawImage(c, 0, 0); og.filter = 'none';
    return out;
  }
  // a photograph's finish: a little bloom from the whites, no grain, no vignette
  function photoFinish(c, k) {
    const w = c.width, h = c.height, b = mk(w, h), bg = b.getContext('2d'); bg.filter = `blur(${(w / 60).toFixed(1)}px)`; bg.drawImage(c, 0, 0);
    const g = c.getContext('2d'); g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = k == null ? 0.16 : k; g.drawImage(b, 0, 0); g.restore();
  }
  // the waterfall: the strip's last frame made perfect, both faces square to the lens and lit by one light fixed to their faces,
  // while the scene's own sun is behind them at the top of the fall. Pose and her tilt are the strip's (GG.COUPLE_LAST).
  function photoWaterfall(w, h) {
    const c = mk(w, h), g = c.getContext('2d'); g.drawImage(paintGorge(w, h), 0, 0);
    const U = w * 0.27, ox = w * 0.36, oy = h * 0.66, Pm = GG.COUPLE_GLOSS.him, Pf = GG.COUPLE_GLOSS.her;
    const hx = ox + Pm.dx * U, hy = oy + Pm.dy * U, fx = ox + Pf.dx * U, fy = oy + Pf.dy * U;
    const along = (x, y, roll, d) => [x - Math.sin(roll) * d * U, y + Math.cos(roll) * d * U];
    // her: the hair behind, her body, her face, the hair in front; then him, nearer, over her shoulder
    const herHead = { x: fx, y: fy, U, roll: Pf.roll };
    paintLongHair(g, herHead, 'back', { len: 1.5 });
    placeFace(g, paintFace('her', U, { smile: 1, open: 0.28 }), fx, fy, Pf.roll);
    paintBody(g, 'her', along(fx, fy, Pf.roll, 0.62), U, -0.1);
    paintLongHair(g, herHead, 'front', { len: 1.5 });
    placeFace(g, paintFace('him', U, { smile: 1, open: 0.28 }), hx, hy, Pm.roll);
    paintBody(g, 'him', along(hx, hy, Pm.roll, 0.6), U, 0.04);
    photoFinish(c, 0.16);
    return c;
  }
  // the app's portrait: her alone, the photo-booth face and the long hair, too smooth; face and shoulders fill the screen
  function photoPortrait(w, h) {
    const c = mk(w, h), g = c.getContext('2d');
    const bg = g.createRadialGradient(w * 0.5, h * 0.32, w * 0.05, w * 0.5, h * 0.45, h * 0.75); bg.addColorStop(0, '#FCEDE2'); bg.addColorStop(0.45, '#F2D3C8'); bg.addColorStop(1, '#D9B7C4'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    { const r = O.rng('bokeh'), b = mk(w, h), bb = b.getContext('2d'); for (let i = 0; i < 14; i++) { const x = w * r(), y = h * 0.5 * r(), rr = w * (0.06 + 0.1 * r()); bb.fillStyle = `rgba(255,244,232,${0.15 + 0.2 * r()})`; bb.beginPath(); bb.arc(x, y, rr, 0, Math.PI * 2); bb.fill(); }
      g.filter = `blur(${(w / 40).toFixed(1)}px)`; g.drawImage(b, 0, 0); g.filter = 'none'; }
    const U = h * 0.33, x = w * 0.5, y = h * 0.345, roll = -0.17, head = { x, y, U, roll };
    paintLongHair(g, head, 'back', { len: 1.7, seed: 2 });
    placeFace(g, paintFace('her', U, { smile: 0.95, open: 0.24 }), x, y, roll);
    paintBody(g, 'her', [x - Math.sin(roll) * 0.62 * U, y + Math.cos(roll) * 0.62 * U], U, -0.04);
    paintLongHair(g, head, 'front', { len: 1.7, seed: 2 });
    photoFinish(c, 0.12);
    return c;
  }

  // ================================================================ screen furniture
  function heartPath(cx, cy, s) {   // s = the heart's width
    const p = new Path2D(), w = s / 2, h = s * 0.92;
    p.moveTo(cx, cy + h * 0.46);
    p.bezierCurveTo(cx - w * 0.35, cy + h * 0.2, cx - w * 1.02, cy - h * 0.02, cx - w * 0.98, cy - h * 0.26);
    p.bezierCurveTo(cx - w * 0.94, cy - h * 0.52, cx - w * 0.36, cy - h * 0.62, cx, cy - h * 0.3);
    p.bezierCurveTo(cx + w * 0.36, cy - h * 0.62, cx + w * 0.94, cy - h * 0.52, cx + w * 0.98, cy - h * 0.26);
    p.bezierCurveTo(cx + w * 1.02, cy - h * 0.02, cx + w * 0.35, cy + h * 0.2, cx, cy + h * 0.46);
    p.closePath(); return p;
  }
  function herGrad(g, x, y, w, h) { const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, C.bubA); gr.addColorStop(1, C.bubB); return gr; }
  function avatar(g, cx, cy, r, dot) {
    g.fillStyle = herGrad(g, cx - r, cy - r, 2 * r, 2 * r); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.white; g.fill(heartPath(cx, cy + r * 0.04, r * 0.95));
    if (dot) { g.fillStyle = C.black; g.beginPath(); g.arc(cx + r * 0.72, cy + r * 0.72, r * 0.32, 0, 7); g.fill(); g.fillStyle = C.green; g.beginPath(); g.arc(cx + r * 0.72, cy + r * 0.72, r * 0.22, 0, 7); g.fill(); }
  }
  function statusBar(g, clock, o) {
    o = o || {}; g.save(); g.fillStyle = o.color || C.white; g.textBaseline = 'alphabetic';
    if (o.time !== false) { g.font = font(700, 15); g.textAlign = 'left'; g.fillText(clock.time, 30, 31); }
    const x0 = SW - 82;
    for (let i = 0; i < 4; i++) { const hh = 4 + i * 2.6; g.beginPath(); g.roundRect(x0 + i * 5.2, 27 - hh, 3.4, hh, 1); g.fill(); }
    g.globalAlpha = 0.45; g.lineWidth = 1; g.strokeStyle = o.color || C.white; g.beginPath(); g.roundRect(SW - 52.5, 17.5, 24, 12, 3.5); g.stroke();
    g.globalAlpha = 1; g.beginPath(); g.roundRect(SW - 50.5, 19.5, 16, 8, 2); g.fill();
    g.globalAlpha = 0.45; g.beginPath(); g.roundRect(SW - 27.5, 21, 2, 5, 1); g.fill();
    g.restore();
    // the front camera: a punch hole in the glass
    g.fillStyle = C.black; g.beginPath(); g.arc(SW / 2, 22, 5.5, 0, 7); g.fill();
  }
  function homeBar(g, alpha) { g.fillStyle = `rgba(255,255,255,${alpha == null ? 0.85 : alpha})`; g.beginPath(); g.roundRect(SW / 2 - 64, SH - 11, 128, 5, 2.5); g.fill(); }
  function chevron(g, x, y, s, col) { g.save(); g.strokeStyle = col || C.white; g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x + s * 0.5, y - s); g.lineTo(x - s * 0.5, y); g.lineTo(x + s * 0.5, y + s); g.stroke(); g.restore(); }
  function wrapText(g, text, maxW) {
    const words = text.split(' '), rows = []; let row = '';
    for (const w of words) { const tr = row ? row + ' ' + w : w; if (g.measureText(tr).width > maxW && row) { rows.push(row); row = w; } else row = tr; }
    if (row) rows.push(row); return rows;
  }
  function wallpaperKind(st) { return st.wallpaper === 'abstract' ? 'abstract' : 'waterfall'; }
  function drawWall(g, kind, k) {
    if (kind === 'abstract') g.drawImage(thumb('abstract', SW * k, SH * k), 0, 0, SW, SH);
    else g.drawImage(thumb('waterfall', SW * k, SH * k, WALL_CROP), 0, 0, SW, SH);
  }

  // ---------------------------------------------------------------- the keyboard (a dark keyboard: furniture; cached per resolution)
  const KB = { h: 290, rowY: [8, 62, 116, 170], keyH: 42 };
  const KEYS = (() => {
    const m = {}; const r1 = 'qwertyuiop', r2 = 'asdfghjkl', r3 = 'zxcvbnm', pitch = 36, kw = 31.5;
    [...r1].forEach((ch, i) => { m[ch] = { x: 2.25 + i * pitch, y: KB.rowY[0], w: kw, h: KB.keyH }; });
    [...r2].forEach((ch, i) => { m[ch] = { x: 20.25 + i * pitch, y: KB.rowY[1], w: kw, h: KB.keyH }; });
    [...r3].forEach((ch, i) => { m[ch] = { x: 56.25 + i * pitch, y: KB.rowY[2], w: kw, h: KB.keyH }; });
    m.shift = { x: 3, y: KB.rowY[2], w: 44, h: KB.keyH, dark: 1 }; m.back = { x: 313, y: KB.rowY[2], w: 44, h: KB.keyH, dark: 1 };
    m.num = { x: 3, y: KB.rowY[3], w: 44, h: KB.keyH, dark: 1 }; m[' '] = { x: 54, y: KB.rowY[3], w: 210, h: KB.keyH }; m.ret = { x: 271, y: KB.rowY[3], w: 86, h: KB.keyH, dark: 1 };
    return m;
  })();
  function keyboardArt(k) {
    const key = 'kbd|' + k; if (THUMBS[key]) return THUMBS[key];
    const c = mk(SW * k, KB.h * k), g = c.getContext('2d'); g.scale(k, k);
    g.fillStyle = C.kbd; g.fillRect(0, 0, SW, KB.h);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    for (const ch in KEYS) { const q = KEYS[ch]; g.fillStyle = q.dark ? C.keyDark : C.key; g.beginPath(); g.roundRect(q.x, q.y, q.w, q.h, 5.5); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(q.x + 2, q.y + q.h, q.w - 4, 1);
      g.fillStyle = C.white;
      if (ch.length === 1 && ch !== ' ') { g.font = font(400, 21); g.fillText(ch, q.x + q.w / 2, q.y + 28); } }
    g.save(); g.strokeStyle = C.white; g.lineWidth = 1.8; g.lineJoin = 'round'; g.lineCap = 'round';
    { const q = KEYS.shift, cx = q.x + q.w / 2, cy = q.y + q.h / 2; g.beginPath(); g.moveTo(cx, cy - 8); g.lineTo(cx - 8, cy + 1); g.lineTo(cx - 4, cy + 1); g.lineTo(cx - 4, cy + 8); g.lineTo(cx + 4, cy + 8); g.lineTo(cx + 4, cy + 1); g.lineTo(cx + 8, cy + 1); g.closePath(); g.stroke(); }
    { const q = KEYS.back, cx = q.x + q.w / 2, cy = q.y + q.h / 2; g.beginPath(); g.moveTo(cx - 11, cy); g.lineTo(cx - 5, cy - 7); g.lineTo(cx + 10, cy - 7); g.lineTo(cx + 10, cy + 7); g.lineTo(cx - 5, cy + 7); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(cx - 1, cy - 3); g.lineTo(cx + 5, cy + 3); g.moveTo(cx + 5, cy - 3); g.lineTo(cx - 1, cy + 3); g.stroke(); }
    { const q = KEYS.ret, cx = q.x + q.w / 2, cy = q.y + q.h / 2; g.beginPath(); g.moveTo(cx + 10, cy - 7); g.lineTo(cx + 10, cy + 3); g.lineTo(cx - 9, cy + 3); g.moveTo(cx - 5, cy - 1); g.lineTo(cx - 9, cy + 3); g.lineTo(cx - 5, cy + 7); g.stroke(); }
    g.restore();
    g.font = font(500, 15); g.fillStyle = C.white; g.fillText('123', KEYS.num.x + KEYS.num.w / 2, KEYS.num.y + 26);
    // a soft round key under the rows (dictation), and the gesture bar
    g.fillStyle = C.keyDark; g.beginPath(); g.arc(SW - 34, 250, 15, 0, 7); g.fill(); g.strokeStyle = C.white; g.lineWidth = 1.6; g.beginPath(); g.roundRect(SW - 37, 241, 6, 11, 3); g.stroke(); g.beginPath(); g.arc(SW - 34, 249, 6.5, 0.2, Math.PI - 0.2); g.stroke(); g.beginPath(); g.moveTo(SW - 34, 256); g.lineTo(SW - 34, 259); g.stroke();
    g.fillStyle = C.keyDark; g.beginPath(); g.arc(34, 250, 15, 0, 7); g.fill(); g.strokeStyle = C.white; g.beginPath(); g.arc(34, 250, 7, 0, 7); g.stroke(); g.beginPath(); g.ellipse(34, 250, 3, 7, 0, 0, 7); g.moveTo(27, 250); g.lineTo(41, 250); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.roundRect(SW / 2 - 64, KB.h - 11, 128, 5, 2.5); g.fill();
    return (THUMBS[key] = c);
  }

  // ================================================================ the thread (a dark-mode chat with the contact saved as "♥")
  const TH = { head: 104, inputH: 50, inputY: 702, maxW: 232, fs: 17, lead: 22, padV: 8, padH: 13, R: 18 };
  // messages: ['her', 'Good morning.'], {him: '...'}, {her: {image: 'waterfall' | 'hidden'}}, {her: {voice: 9}}, {her: {redact: 2}}, {stamp: '07:12'}
  function normMsg(m) {
    let from, b;
    if (Array.isArray(m)) { from = m[0]; b = m[1]; if (from === 'stamp') return { kind: 'stamp', text: String(b) }; }
    else if (m && m.stamp != null) return { kind: 'stamp', text: String(m.stamp) };
    else if (m) { from = m.from || (m.her != null ? 'her' : 'him'); b = m.her != null ? m.her : m.him != null ? m.him : m.text; }
    from = from === 'him' ? 'him' : 'her';
    if (typeof b === 'string') return { kind: 'text', from, text: b };
    if (b && b.image) return { kind: 'image', from, image: b.image };
    if (b && b.voice != null) return { kind: 'voice', from, dur: b.voice };
    if (b && b.redact) return { kind: 'redact', from, n: b.redact | 0 || 1, w: b.w };
    return { kind: 'text', from, text: String(b) };
  }
  function layoutThread(g, msgs, bottom) {
    const items = msgs.map(normMsg); g.font = font(400, TH.fs);
    for (const m of items) {
      if (m.kind === 'stamp') { m.h = 30; m.w = SW; }
      else if (m.kind === 'text') { verbatim(m.text); m.lines = wrapText(g, m.text, TH.maxW); m.w = Math.ceil(Math.max(...m.lines.map(l => g.measureText(l).width))) + 2 * TH.padH; m.h = m.lines.length * TH.lead + 2 * TH.padV; }
      else if (m.kind === 'image') { m.w = 196; m.h = 261; }
      else if (m.kind === 'voice') { m.w = 238; m.h = 52; }
      else if (m.kind === 'redact') { m.w = m.w || 150 + 30 * m.n; m.h = m.n * TH.lead + 2 * TH.padV; }
    }
    let y = bottom;
    for (let i = items.length - 1; i >= 0; i--) {
      const m = items[i], nx = items[i + 1];
      const gap = !nx ? 0 : (m.kind === 'stamp' || nx.kind === 'stamp') ? 4 : (m.from === nx.from ? 3 : 12);
      y -= gap; m.y = y - m.h; y = m.y; m.gap = gap;
      m.x = m.kind === 'stamp' ? 0 : m.from === 'her' ? 12 : SW - 12 - m.w;
      m.tail = m.kind !== 'stamp' && (!nx || nx.kind === 'stamp' || nx.from !== m.from);
    }
    return items;
  }
  // deterministic voice-message bars (a voice: phrases and small gaps)
  const BARS = (() => { const r = O.rng('phone-voice'); const n = 33, out = []; for (let i = 0; i < n; i++) { const env = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.37 + 0.6)) * (0.6 + 0.4 * Math.sin(i * 0.11 + 1.3)); const gapk = (i === 11 || i === 12 || i === 23) ? 0.25 : 1; out.push(clamp(env * (0.55 + 0.45 * r()) * gapk, 0.12, 1)); } return out; })();
  function drawMsg(g, m, x, y, st, k) {
    const her = m.from === 'her';
    if (m.kind === 'stamp') { g.fillStyle = C.ui; g.font = font(500, 12); g.textAlign = 'center'; g.fillText(m.text, SW / 2, y + 19); g.textAlign = 'left'; return; }
    const R = TH.R, r = m.tail ? 5 : R, radii = her ? [R, R, R, r] : [R, R, r, R];
    if (m.kind === 'image') {
      g.save(); g.beginPath(); g.roundRect(x, y, m.w, m.h, 18); g.clip();
      if (m.image === 'hidden') g.drawImage(art('hidden'), x, y, m.w, m.h);
      else g.drawImage(thumb('waterfall', m.w * k, m.h * k), x, y, m.w, m.h);
      g.restore(); g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1; g.beginPath(); g.roundRect(x + 0.5, y + 0.5, m.w - 1, m.h - 1, 17.5); g.stroke();
      return;
    }
    g.fillStyle = her ? herGrad(g, x, y, m.w, m.h) : C.his; g.beginPath(); g.roundRect(x, y, m.w, m.h, radii); g.fill();
    if (m.kind === 'text') { g.fillStyle = C.white; g.font = font(400, TH.fs); g.textAlign = 'left'; m.lines.forEach((l, i) => g.fillText(l, x + TH.padH, y + TH.padV + 16 + i * TH.lead)); }
    else if (m.kind === 'redact') { g.fillStyle = 'rgba(255,255,255,0.34)'; for (let i = 0; i < m.n; i++) { const ww = (m.w - 2 * TH.padH) * (i === m.n - 1 && m.n > 1 ? 0.6 : 1); g.beginPath(); g.roundRect(x + TH.padH, y + TH.padV + 6 + i * TH.lead, ww, 10, 5); g.fill(); } }
    else if (m.kind === 'voice') {
      const prog = clamp(st.progress || 0, 0, 1), playing = !!st.playing, cy = y + m.h / 2, px = x + 25;
      g.fillStyle = 'rgba(255,255,255,0.96)'; g.beginPath(); g.arc(px, cy, 15, 0, 7); g.fill();
      g.fillStyle = '#C98AD9';
      if (playing) { g.beginPath(); g.roundRect(px - 5.5, cy - 6.5, 4, 13, 1.2); g.roundRect(px + 1.5, cy - 6.5, 4, 13, 1.2); g.fill(); }
      else { g.beginPath(); g.moveTo(px - 4, cy - 7); g.lineTo(px + 7, cy); g.lineTo(px - 4, cy + 7); g.closePath(); g.fill(); }
      const bx0 = x + 50, bx1 = x + m.w - 50, n = BARS.length, pitch = (bx1 - bx0) / n;
      for (let i = 0; i < n; i++) { const bh = 4 + BARS[i] * 22, bx = bx0 + i * pitch; const played = (i + 0.5) / n <= prog;
        g.fillStyle = played ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.42)'; g.beginPath(); g.roundRect(bx, cy - bh / 2, Math.max(1.6, pitch * 0.55), bh, 1.2); g.fill(); }
      const dur = m.dur || 9, secs = playing || prog > 0 && prog < 1 ? Math.floor(prog * dur) : Math.round(dur);
      g.fillStyle = 'rgba(255,255,255,0.92)'; g.font = font(500, 13); g.textAlign = 'right'; g.fillText('0:' + String(secs).padStart(2, '0'), x + m.w - 13, cy + 4.5); g.textAlign = 'left';
    }
  }
  function drawHeader(g, clock, o) {
    o = o || {};
    g.fillStyle = C.head; g.fillRect(0, 0, SW, TH.head); g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(0, TH.head - 0.75, SW, 0.75);
    statusBar(g, clock); chevron(g, 20, 74, 8.5, C.white); avatar(g, 60, 74, 17, true);
    g.fillStyle = C.white; g.fill(heartPath(93, 74.5, 15));
  }
  function drawThread(g, st, env) {
    const k = env.k, clock = clockOf(st.clock, env.seq);
    const kb = clamp(st.keyboard || 0, 0, 1), ke = inOut(kb);
    const kbTop = SH - KB.h * ke, inputY = Math.min(TH.inputY, lerp(TH.inputY, SH - KB.h - TH.inputH, ke));
    g.fillStyle = C.black; g.fillRect(0, 0, SW, SH);
    // the messages, bottom-anchored above the input bar
    const items = layoutThread(g, st.msgs || [], inputY - 8);
    const last = items[items.length - 1]; const ar = st.arrive == null ? 1 : clamp(st.arrive, 0, 1), ae = outC(ar);
    const prev = items[items.length - 2], shift = last ? (1 - ae) * (last.h + (prev ? prev.gap : 0)) : 0;
    const scroll = st.scroll || 0;
    g.save(); g.beginPath(); g.rect(0, TH.head, SW, inputY - TH.head); g.clip();
    items.forEach((m, i) => {
      const isLast = i === items.length - 1; let y = m.y + scroll + shift;   // the whole stack rises as the newest arrives from below
      if (y + m.h < TH.head - 4 || y > inputY) return;
      if (isLast && st.hideLast) return;
      if (isLast && ar < 1) {
        g.save(); g.globalAlpha = Math.min(1, ae * 1.6); const ox = m.from === 'her' ? m.x : m.x + m.w, oy = y + m.h;
        const dy = 0, s = 0.94 + 0.06 * ae;
        g.translate(ox, oy + dy); g.scale(s, s); g.translate(-ox, -oy); drawMsg(g, m, m.x, y, st, k); g.restore();
      } else drawMsg(g, m, m.x, y, st, k);
    });
    g.restore();
    if (last) { env.lay.targets.last = [last.x + last.w / 2, last.y + scroll + last.h / 2]; env.lay.lastRect = { x: last.x, y: last.y + scroll, w: last.w, h: last.h };
      if (last.kind === 'voice') env.lay.targets.play = [last.x + 25, last.y + scroll + last.h / 2]; }
    // the input bar
    const draft = st.draft || '', n = clamp(Math.floor(st.typed == null ? draft.length : st.typed), 0, draft.length), shown = draft.slice(0, n);
    if (shown) verbatim(draft);
    const yc = inputY + TH.inputH / 2;
    g.fillStyle = C.black; g.fillRect(0, inputY, SW, SH - inputY);
    g.fillStyle = '#1F1F22'; g.beginPath(); g.arc(30, yc, 15, 0, 7); g.fill();
    g.strokeStyle = '#A0A0A6'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(24, yc); g.lineTo(36, yc); g.moveTo(30, yc - 6); g.lineTo(30, yc + 6); g.stroke();
    g.fillStyle = C.field; g.beginPath(); g.roundRect(54, yc - 18, 252, 36, 18); g.fill(); g.strokeStyle = C.fieldLine; g.lineWidth = 1; g.stroke();
    g.save(); g.beginPath(); g.rect(60, yc - 18, 240, 36); g.clip();
    g.font = font(400, TH.fs); g.fillStyle = C.white; g.textAlign = 'left';
    const tw = g.measureText(shown).width, tx = Math.min(68, 292 - tw); g.fillText(shown, tx, yc + 6);
    const caret = st.caret != null ? st.caret : (kb > 0.5 && n < draft.length) || (kb > 0.5 && !draft);
    if (caret) { g.fillStyle = C.caret; g.fillRect(tx + tw + 1.5, yc - 11, 2, 22); }
    g.restore();
    const active = n > 0;
    g.fillStyle = active ? C.white : '#2A2A2E'; g.beginPath(); g.arc(330, yc, 16, 0, 7); g.fill();
    g.strokeStyle = active ? C.black : '#7A7A80'; g.lineWidth = 2.4; g.lineJoin = 'round'; g.beginPath(); g.moveTo(330, yc + 7); g.lineTo(330, yc - 7); g.moveTo(324, yc - 1); g.lineTo(330, yc - 7); g.lineTo(336, yc - 1); g.stroke();
    env.lay.targets.input = [180, yc]; env.lay.targets.send = [330, yc];
    // the keyboard, sliding up; the key just struck lights, with its balloon
    if (ke > 0) {
      g.drawImage(keyboardArt(k), 0, kbTop, SW, KB.h);
      const ch = st.press && n > 0 ? draft[n - 1].toLowerCase() : null, q = ch && KEYS[ch];
      if (q && ch === ' ') { g.fillStyle = C.keyHi; g.beginPath(); g.roundRect(q.x, kbTop + q.y, q.w, q.h, 5.5); g.fill(); }
      else if (q) {   // the key's balloon: one shape rising from the key, the letter large in it
        const x0 = q.x, x1 = q.x + q.w, yk = kbTop + q.y, yb = yk + q.h, bx0 = Math.max(1, x0 - 9), bx1 = Math.min(SW - 1, x1 + 9), top = yk - 58, neck = yk - 6, r = 9;
        const bp = new Path2D(); bp.moveTo(bx0 + r, top); bp.lineTo(bx1 - r, top); bp.quadraticCurveTo(bx1, top, bx1, top + r); bp.lineTo(bx1, neck - 10); bp.bezierCurveTo(bx1, neck, x1, neck, x1, neck + 8);
        bp.lineTo(x1, yb - 5); bp.quadraticCurveTo(x1, yb, x1 - 5, yb); bp.lineTo(x0 + 5, yb); bp.quadraticCurveTo(x0, yb, x0, yb - 5); bp.lineTo(x0, neck + 8); bp.bezierCurveTo(x0, neck, bx0, neck, bx0, neck - 10);
        bp.lineTo(bx0, top + r); bp.quadraticCurveTo(bx0, top, bx0 + r, top); bp.closePath();
        g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 6 * k; g.shadowOffsetY = 1.5 * k; g.fillStyle = '#5C5C61'; g.fill(bp); g.restore();
        g.fillStyle = C.white; g.font = font(400, 32); g.textAlign = 'center'; g.fillText(ch, (bx0 + bx1) / 2, top + 38); g.textAlign = 'left'; }
      env.lay.targets.keys = [180, kbTop + 110];
    } else homeBar(g);
    drawHeader(g, clock);
  }

  // ================================================================ the other screens
  function bannerCard(g, text, y, alpha, frostSrc) {
    verbatim(text);
    g.save(); g.globalAlpha = alpha; const x = 10, w = SW - 20, h = 70;
    g.beginPath(); g.roundRect(x, y, w, h, 22); g.save(); g.clip();
    if (frostSrc) g.drawImage(frostSrc, 0, 0, SW, SH);
    g.fillStyle = frostSrc ? 'rgba(28,28,32,0.62)' : 'rgba(34,34,38,0.96)'; g.fillRect(x, y, w, h); g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1; g.beginPath(); g.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 21.5); g.stroke();
    avatar(g, x + 33, y + h / 2, 19, false);
    g.fillStyle = C.white; g.fill(heartPath(x + 70, y + 24, 14));
    g.font = font(400, 15.5); g.textAlign = 'left'; g.fillText(text, x + 62, y + 52);
    g.restore();
    return [SW / 2, y + h / 2];
  }
  function bannerOf(st) { const b = st.banner; if (!b) return null; return typeof b === 'string' ? { text: b, in: 1 } : Object.assign({ in: 1 }, b); }
  function drawLock(g, st, env) {
    const k = env.k, clock = clockOf(st.clock, env.seq), wk = wallpaperKind(st);
    drawWall(g, wk, k);
    // a whisper of shade behind the clock (legibility, as every lock screen has)
    const sh = g.createLinearGradient(0, 0, 0, 300); sh.addColorStop(0, 'rgba(0,0,0,0.16)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(0, 0, SW, 300);
    const fade = st.clockIn == null ? 1 : clamp(st.clockIn, 0, 1);
    g.save(); g.globalAlpha = fade; g.fillStyle = C.white; g.textAlign = 'center';
    g.font = font(500, 17); g.fillText(clock.date, SW / 2, 104);
    g.shadowColor = 'rgba(0,0,0,0.12)'; g.shadowBlur = 12 * k; g.font = font(400, 92); g.fillText(clock.time, SW / 2, 196); g.restore();
    // quick actions and the gesture bar
    [[52, 'torch'], [SW - 52, 'camera']].forEach(([x, kind]) => {
      g.fillStyle = 'rgba(20,20,26,0.38)'; g.beginPath(); g.arc(x, SH - 76, 23, 0, 7); g.fill(); g.strokeStyle = C.white; g.lineWidth = 1.7; g.lineJoin = 'round';
      if (kind === 'torch') { g.beginPath(); g.moveTo(x - 5, SH - 87); g.lineTo(x + 5, SH - 87); g.lineTo(x + 5, SH - 82); g.lineTo(x + 3, SH - 78); g.lineTo(x + 3, SH - 65); g.lineTo(x - 3, SH - 65); g.lineTo(x - 3, SH - 78); g.lineTo(x - 5, SH - 82); g.closePath(); g.stroke(); }
      else { g.beginPath(); g.roundRect(x - 10, SH - 83, 20, 15, 3); g.stroke(); g.beginPath(); g.arc(x, SH - 75.5, 4.2, 0, 7); g.stroke(); }
    });
    homeBar(g, 0.9);
    statusBar(g, clock, { time: false });
    env.lay.targets.clock = [SW / 2, 160]; env.lay.targets.swipe = [SW / 2, SH - 30];
    const b = bannerOf(st);
    if (b) { const e = outC(b.in); env.lay.targets.banner = bannerCard(g, b.text, 226 + (1 - e) * 16, e, frosted(wk === 'abstract' ? 'abstract' : 'waterfall', wk === 'abstract' ? null : WALL_CROP)); }
  }
  function drawViewer(g, st, env, open) {
    const k = env.k, clock = clockOf(st.clock, env.seq);
    const e = inOut(open);
    const fit = { x: 0, y: (SH - SW * 4 / 3) / 2, w: SW, h: SW * 4 / 3 };
    let from = st.from || null;
    if (e < 1) {
      // the thread underneath, fading to black as the picture opens
      const thr = st.thread || { msgs: [['her', { image: 'waterfall' }]] };
      const sub = renderScreen('thread', Object.assign({ clock: st.clock }, thr, { hideLast: true, arrive: 1 }), k, env.t, (env.depth || 0) + 1, env.seq);
      g.drawImage(sub.cv, 0, 0, SW, SH); from = from || sub.lay.lastRect || fit;
      g.fillStyle = `rgba(0,0,0,${e})`; g.fillRect(0, 0, SW, SH);
    } else { g.fillStyle = C.black; g.fillRect(0, 0, SW, SH); }
    const R = from ? { x: lerp(from.x, fit.x, e), y: lerp(from.y, fit.y, e), w: lerp(from.w, fit.w, e), h: lerp(from.h, fit.h, e) } : fit;
    g.save(); g.beginPath(); g.roundRect(R.x, R.y, R.w, R.h, 18 * (1 - e)); g.clip();
    g.drawImage(thumb('waterfall', SW * k, SW * 4 / 3 * k), R.x, R.y, R.w, R.h); g.restore();
    g.save(); g.globalAlpha = e;
    statusBar(g, clock); chevron(g, 20, 74, 8.5, C.white); avatar(g, 58, 74, 15, false); g.fillStyle = C.white; g.fill(heartPath(88, 74.5, 13));
    // a share glyph and the gesture bar
    g.strokeStyle = C.white; g.lineWidth = 2; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); g.moveTo(SW - 30, 82); g.lineTo(SW - 30, 64); g.moveTo(SW - 36, 70); g.lineTo(SW - 30, 64); g.lineTo(SW - 24, 70); g.stroke();
    g.beginPath(); g.moveTo(SW - 36, 74); g.lineTo(SW - 40, 74); g.lineTo(SW - 40, 88); g.lineTo(SW - 20, 88); g.lineTo(SW - 20, 74); g.lineTo(SW - 24, 74); g.stroke();
    homeBar(g, 0.85); g.restore();
    env.lay.targets.image = [SW / 2, SH / 2]; env.lay.targets.back = [20, 74];
  }
  function drawWallpaperSet(g, st, env) {
    drawViewer(g, Object.assign({}, st, { from: null }), env, 1);
    const e = outC(st.in == null ? 1 : st.in), pr = clamp(st.press || 0, 0, 1);
    g.fillStyle = `rgba(0,0,0,${0.32 * e})`; g.fillRect(0, 0, SW, SH);
    const y = SH - 130 * e + (1 - e) * 20;
    g.save(); g.globalAlpha = Math.min(1, e * 1.4);
    g.fillStyle = C.sheet; g.beginPath(); g.roundRect(8, y, SW - 16, 112, 22); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.roundRect(SW / 2 - 18, y + 8, 36, 4.5, 2.25); g.fill();
    g.fillStyle = mixHex('#2A2A2E', '#4A4A50', pr); g.beginPath(); g.roundRect(20, y + 26, SW - 40, 56, 14); g.fill();
    // a picture glyph, then the one line
    g.strokeStyle = C.white; g.lineWidth = 1.8; g.lineJoin = 'round'; g.beginPath(); g.roundRect(36, y + 43, 22, 22, 4); g.stroke();
    g.beginPath(); g.moveTo(38, y + 62); g.lineTo(45, y + 54); g.lineTo(50, y + 59); g.lineTo(53, y + 56); g.lineTo(57, y + 61); g.stroke(); g.beginPath(); g.arc(51, y + 49, 2.2, 0, 7); g.stroke();
    g.fillStyle = C.white; g.font = font(400, 17); g.textAlign = 'left'; g.fillText('Set as wallpaper', 72, y + 60);
    g.restore();
    env.lay.targets.row = [SW / 2, y + 54];
  }
  function drawBlack(g, st, env) {
    g.fillStyle = C.black; g.fillRect(0, 0, SW, SH);
    const rf = st.reflection;
    if (rf) {
      // the room and his face in the dead glass, darkened (the caller passes the reflection as it should be seen)
      const a = st.amount == null ? 0.3 : st.amount, cw = rf.width, ch = rf.height, s = Math.max(SW / cw, SH / ch) * (st.zoom || 1);
      const ox = st.offset ? st.offset[0] : 0, oy = st.offset ? st.offset[1] : 0;
      g.save(); g.globalAlpha = a; g.drawImage(rf, (SW - cw * s) / 2 + ox, (SH - ch * s) / 2 + oy, cw * s, ch * s); g.restore();
      // the glass keeps its blacks deep: lift nothing, cool the mids a touch
      g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#B8C2D0'; g.fillRect(0, 0, SW, SH); g.restore();
    }
    env.lay.targets.center = [SW / 2, SH / 2];
  }
  function drawGrid(g, st, env) {
    // abstract by rule: soft gloss squares in flat skin tones, blurred past any shape; nothing readable, ever
    const clock = clockOf(st.clock, env.seq), sc = st.scroll || 0, tile = 118, pitch = 121, top = TH.head;
    const pal = ['#E7C3A8', '#D8A68A', '#C68B70', '#F1D4C2', '#B57A60', '#E2B39B', '#CC9E88', '#EFC7B2', '#A86F5A', '#DDBBA6', '#C9A08F', '#F3DCCD'];
    const tg = GRIDTMP(), t2 = tg.ctx; if (t2.reset) t2.reset(); t2.setTransform(0.5, 0, 0, 0.5, 0, 0); t2.fillStyle = C.black; t2.fillRect(0, 0, SW, SH);
    const r0 = Math.floor((-sc) / pitch) - 1;
    for (let r = r0; r < r0 + 9; r++) {
      const y = top + 6 + r * pitch + sc; if (y > SH || y + tile < top - 40) continue;
      for (let col = 0; col < 3; col++) {
        const hsh = GG.hash2(r, col, 91), hsh2 = GG.hash2(r, col, 92), hsh3 = GG.hash2(r, col, 93);
        const a = pal[Math.floor(hsh * pal.length)], b = pal[Math.floor(hsh2 * pal.length)], x = col * pitch;
        t2.fillStyle = a; t2.fillRect(x, y, tile, tile);
        t2.fillStyle = b; if (hsh3 < 0.5) t2.fillRect(x, y + tile * (0.35 + 0.4 * hsh3), tile, tile * (0.65 - 0.4 * hsh3)); else t2.fillRect(x + tile * (0.3 + 0.4 * (hsh3 - 0.5)), y, tile * (0.7 - 0.4 * (hsh3 - 0.5)), tile);
      }
    }
    // the header and the input bar, as out of focus as the rest
    t2.fillStyle = C.head; t2.fillRect(0, 0, SW, top); statusBar(t2, clock); avatar(t2, 60, 74, 17, false); t2.fillStyle = C.white; t2.fill(heartPath(93, 74.5, 15));
    t2.fillStyle = C.black; t2.fillRect(0, TH.inputY, SW, SH - TH.inputY); t2.fillStyle = '#1F1F22'; t2.beginPath(); t2.roundRect(54, TH.inputY + 7, 252, 36, 18); t2.fill();
    g.fillStyle = C.black; g.fillRect(0, 0, SW, SH);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.filter = `blur(${st.blur == null ? 4.5 : st.blur}px)`; g.drawImage(tg.c, 0, 0); g.restore();
    env.lay.targets.center = [SW / 2, SH / 2];
  }
  const GRIDTMP = (() => { let c = null; return () => { if (!c) { const cv = mk(SW / 2, SH / 2); c = { c: cv, ctx: cv.getContext('2d') }; } return c; }; })();
  function drawApp(g, st, env) {
    const clock = clockOf(st.clock, env.seq), t = env.t;
    g.drawImage(art('portrait'), 0, 0, SW, SH);
    const sh = g.createLinearGradient(0, SH * 0.72, 0, SH); sh.addColorStop(0, 'rgba(42,28,52,0)'); sh.addColorStop(1, 'rgba(42,28,52,0.6)'); g.fillStyle = sh; g.fillRect(0, SH * 0.72, SW, SH * 0.28);
    statusBar(g, clock, { color: C.white });
    g.fillStyle = 'rgba(255,255,255,0.92)'; g.fill(heartPath(SW / 2, 64, 13));
    // the line: thin, white, waiting; it breathes (no number, no dial, no ring)
    const y = 688, x0 = 84, x1 = SW - 84, br = 0.5 - 0.5 * Math.cos(2 * Math.PI * t / 2.6), amp = (st.amp == null ? 1 : st.amp) * (0.8 + 3.4 * br);
    const line = () => { g.beginPath(); for (let i = 0; i <= 64; i++) { const u = i / 64, x = lerp(x0, x1, u), win = Math.sin(Math.PI * u) ** 2; const yy = y + amp * win * Math.sin(u * Math.PI * 6 + t * 2.1) * Math.cos(u * Math.PI * 2 - t * 0.7); i ? g.lineTo(x, yy) : g.moveTo(x, yy); } };
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    line(); g.strokeStyle = `rgba(255,255,255,${0.12 + 0.1 * br})`; g.lineWidth = 7; g.stroke();
    line(); g.strokeStyle = `rgba(255,255,255,${0.8 + 0.2 * br})`; g.lineWidth = 1.8; g.stroke(); g.restore();
    homeBar(g, 0.8);
    env.lay.targets.line = [SW / 2, y]; env.lay.targets.face = [SW / 2, SH * 0.36];
  }

  // ---------------------------------------------------------------- the screen table
  // draw(g, st, env): draws in points. key(st, t): a cache key when the state is still, or null while it moves (drawn live every frame).
  // light(st): the light the screen throws {tone, k}.
  // (any state with live: true is drawn live: use it for a value you animate every frame that the table does not know, e.g. a thread's scroll)
  const S = {
    thread: { draw: drawThread, light: st => ({ tone: 'night', k: 0.7 }),
      key: (st, t) => { const d = st.draft || '', n = st.typed == null ? d.length : Math.floor(st.typed), b = bannerOf(st); if ((st.arrive != null && st.arrive < 1) || (st.keyboard > 0 && st.keyboard < 1) || st.press || (d && n < d.length) || (b && b.in < 1)) return null; return skey(st); } },
    voice: { draw: (g, st, env) => drawThread(g, Object.assign({ msgs: HISTORY.morning.concat([['stamp', clockOf(st.clock, env.seq).time], ['her', { voice: st.dur || 9 }]]) }, st), env), light: () => ({ tone: 'night', k: 0.72 }),
      key: (st) => ((st.playing || (st.progress > 0 && st.progress < 1)) ? null : skey(st)) },
    lock: { ownBanner: true, draw: drawLock, light: st => wallpaperKind(st) === 'abstract' ? { tone: 'violet', k: 0.7 } : { tone: 'water', k: 1 },
      key: st => { const b = bannerOf(st); if (b && b.in < 1) return null; return skey(st); } },
    banner: { ownBanner: true, draw: (g, st, env) => { const under = st.under || 'lock'; if (under === 'lock') return drawLock(g, Object.assign({}, st, { banner: { text: st.text || MSG.goodMorning, in: st.in == null ? 1 : st.in } }), env);
      const sub = renderScreen(under, Object.assign({ clock: st.clock, wallpaper: st.wallpaper }, st.state || {}, { banner: { text: st.text || MSG.goodMorning, in: st.in == null ? 1 : st.in } }), env.k, env.t, (env.depth || 0) + 1, env.seq);
      g.drawImage(sub.cv, 0, 0, SW, SH); Object.assign(env.lay.targets, sub.lay.targets); },
      light: st => (st.under && st.under !== 'lock' && S[st.under] ? S[st.under].light(st.state || st) : S.lock.light(st)), key: st => (st.in != null && st.in < 1 ? null : skey(st)) },
    image: { draw: (g, st, env) => drawViewer(g, st, env, st.open == null ? 1 : st.open), light: () => ({ tone: 'water', k: 1 }),
      key: st => (st.open != null && st.open < 1 ? null : skey(st)) },
    wallpaper_set: { draw: drawWallpaperSet, light: () => ({ tone: 'water', k: 0.9 }), key: st => ((st.in != null && st.in < 1) || (st.press > 0 && st.press < 1) ? null : skey(st)) },
    black: { ownBanner: true, draw: drawBlack, light: () => ({ tone: 'night', k: 0 }), key: st => (st.reflection ? null : 'b') },
    wake: { ownBanner: true, draw: (g, st, env) => { const p = clamp(st.p == null ? 1 : st.p, 0, 1), e = outC(p);
        const sub = renderScreen(st.under || 'lock', Object.assign({}, st, { clockIn: undefined }), env.k, env.t, (env.depth || 0) + 1, env.seq);
        g.fillStyle = C.black; g.fillRect(0, 0, SW, SH); const s = 1.06 - 0.06 * e; g.save(); g.translate(SW / 2, SH / 2); g.scale(s, s); g.translate(-SW / 2, -SH / 2); g.globalAlpha = sstep(0, 0.7, p); g.drawImage(sub.cv, 0, 0, SW, SH); g.restore();
        Object.assign(env.lay.targets, sub.lay.targets); },
      light: st => { const L = S[st.under || 'lock'].light(st); return { tone: L.tone, k: L.k * sstep(0, 0.7, st.p == null ? 1 : st.p) }; }, key: st => ((st.p == null || st.p >= 1) ? skey(st) : null) },
    dim: { ownBanner: true, draw: (g, st, env) => { const sub = renderScreen(st.under || 'lock', st, env.k, env.t, (env.depth || 0) + 1, env.seq); g.drawImage(sub.cv, 0, 0, SW, SH);
        g.fillStyle = `rgba(0,0,0,${1 - dimLevel(st.p)})`; g.fillRect(0, 0, SW, SH); Object.assign(env.lay.targets, sub.lay.targets); },
      light: st => { const L = S[st.under || 'lock'].light(st); return { tone: L.tone, k: L.k * dimLevel(st.p) }; }, key: st => null },
    grid: { draw: drawGrid, light: () => ({ tone: 'skin', k: 0.8 }), key: () => null, fixedK: 0.5 },
    app: { draw: drawApp, light: () => ({ tone: 'night', k: 0.9 }), key: () => null },
  };
  // the screen dims as phones do: to about a third, a breath, then off
  function dimLevel(p) { p = clamp(p == null ? 0 : p, 0, 1); return p < 0.45 ? lerp(1, 0.32, inOut(p / 0.45)) : p < 0.7 ? 0.32 : lerp(0.32, 0, inOut((p - 0.7) / 0.3)); }

  let PID = 0;
  function skey(o) {
    if (o == null) return ''; if (typeof o === 'number') return String(Math.round(o * 1000) / 1000); if (typeof o !== 'object') return String(o);
    if (typeof HTMLCanvasElement !== 'undefined' && o instanceof HTMLCanvasElement) return 'cv' + (o._pid || (o._pid = ++PID));
    if (Array.isArray(o)) return '[' + o.map(skey).join(',') + ']';
    return '{' + Object.keys(o).sort().filter(k => o[k] !== undefined).map(k => k + ':' + skey(o[k])).join(',') + '}';
  }
  const LIVE = {};
  function liveCanvas(w, h, slot) { let c = LIVE[slot]; if (!c || c.width !== w || c.height !== h) c = LIVE[slot] = mk(w, h); const g = c.getContext('2d'); if (g.reset) g.reset(); else { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, w, h); } return c; }
  const cacheFn = (key, fn, w, h) => (G.FILM && G.FILM.cache ? G.FILM.cache(key, fn, w, h) : (() => { const c = mk(w, h); fn(c.getContext('2d'), c); return c; })());
  // render a screen flat at resolution k (points x k pixels); cached when still, live (a pooled canvas) while it moves
  function renderScreen(name, st, k, t, depth, seq) {
    const D = S[name] || (warn('unknown screen ' + name), S.black);
    if (D.fixedK) k = D.fixedK;
    const cw = Math.round(SW * k), ch = Math.round(SH * k), key = st.live ? null : D.key(st, t);
    const env = { k, t, depth: depth || 0, seq, lay: { targets: {} } };
    const run = (g) => { g.save(); g.scale(k, k); g.textBaseline = 'alphabetic'; D.draw(g, st, env); g.restore();
      // a heads-up banner over any screen but the lock (which has its own)
      const b = !D.ownBanner ? bannerOf(st) : null;
      if (b) { g.save(); g.scale(k, k); const e = outC(b.in); env.lay.targets.banner = bannerCard(g, b.text, -84 + 96 * e, Math.min(1, e * 1.5), null); g.restore(); } };
    if (key != null) {
      const cv = cacheFn('phone|' + name + '|' + k + '|' + key, (g, c) => { run(g); c._lay = env.lay; }, cw, ch);
      return { cv, lay: cv._lay || env.lay };
    }
    const cv = liveCanvas(cw, ch, k + '|' + (depth || 0)); run(cv.getContext('2d'));
    return { cv, lay: env.lay };
  }

  // ================================================================ drawing the phone
  const SCR = { c: null, g: null, w: 0, h: 0 }, MASK = { c: null, g: null, w: 0, h: 0 }, SPILL = { c: null, g: null, w: 0, h: 0 };
  function pool(P, w, h) { if (!P.c || P.w < w || P.h < h) { P.w = Math.max(w, P.w); P.h = Math.max(h, P.h); P.c = mk(P.w, P.h); P.g = P.c.getContext('2d'); }
    // a full reset (state and pixels): a pooled context must not remember the last phone (smoothing quality, line state...)
    const g = P.g; if (g.reset) g.reset(); else { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetX = 0; g.shadowOffsetY = 0; g.imageSmoothingQuality = 'low'; g.lineCap = 'butt'; g.lineJoin = 'miter'; g.clearRect(0, 0, P.w, P.h); } return g; }
  const KLEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5];
  const pickK = devH => { const need = devH / SH * 1.04; for (const k of KLEVELS) if (k >= need) return k; return KLEVELS[KLEVELS.length - 1]; };
  // warp a flat canvas onto a quad through homography Hm (unit square -> world), on a context already holding world -> device
  function warp(g, img, Hm, cells) {
    const cw = img.width, ch = img.height; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (Math.abs(Hm.g) + Math.abs(Hm.h) < 1e-5) { g.save(); g.transform(Hm.a / cw, Hm.d / cw, Hm.b / ch, Hm.e / ch, Hm.c, Hm.f); g.drawImage(img, 0, 0); g.restore(); return; }
    // perspective: affine cells with a two-pixel overlap (the parallelogram error stays under it at these counts)
    g.imageSmoothingQuality = 'medium';
    const n = cells, m = Math.max(2, Math.round(cells * 1.6));
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, v0 = j / m, v1 = (j + 1) / m;
      const A = hmap(Hm, u0, v0), B = hmap(Hm, u1, v0), D = hmap(Hm, u0, v1);
      const du = (u1 - u0) * cw, dv = (v1 - v0) * ch, ax = (B[0] - A[0]) / du, ay = (B[1] - A[1]) / du, bx = (D[0] - A[0]) / dv, by = (D[1] - A[1]) / dv;
      const sx = Math.max(0, u0 * cw - 2), sy = Math.max(0, v0 * ch - 2), sw = Math.min(cw, u1 * cw + 2) - sx, sh = Math.min(ch, v1 * ch + 2) - sy;
      g.save(); g.transform(ax, ay, bx, by, A[0] - ax * u0 * cw - bx * v0 * ch, A[1] - ay * u0 * cw - by * v0 * ch); g.drawImage(img, sx, sy, sw, sh, sx, sy, sw, sh); g.restore();
    }
  }
  function screenQuad(geo) { const Hf = geo.Hf; return [hmap(Hf, SCR_U, SCR_V), hmap(Hf, 1 - SCR_U, SCR_V), hmap(Hf, 1 - SCR_U, 1 - SCR_V), hmap(Hf, SCR_U, 1 - SCR_V)]; }
  function withDefaults(name, st, seq) {
    const o = Object.assign({}, st);
    if (o.clock == null) o.clock = SEQ_CLOCK[seq] || 'night';
    if (o.wallpaper == null) o.wallpaper = seq && seq < 'Q06' ? 'abstract' : 'waterfall';
    return o;
  }
  function shadowOnly(g, path, blur, color, dx, dy) {   // draw only the blurred shadow of a device-space path
    const OFF = 20000; g.save(); g.setTransform(1, 0, 0, 1, OFF, 0); g.shadowColor = color; g.shadowBlur = blur; g.shadowOffsetX = -OFF + (dx || 0); g.shadowOffsetY = dy || 0; g.fillStyle = '#000'; g.fill(path); g.restore();
  }
  const ENV = '#AAB4C8';

  // PHONE.draw(c, p): see film/api/phone.md. Returns info {quad, at(u,v), pt(x,y), center, facing, n2, light, targets, path, screenPath, h}.
  // everything PHONE.draw knows before it paints: geometry, the screen (rendered or taken from the cache), the info it returns
  function prep(p, M, seq, lt, render) {
    if (p.buzz) {   // the phone vibrating: a jitter of about p.buzz * 0.006 h, new every frame (on ones), deterministic
      const fr = Math.round(ones(p.t != null ? p.t : (lt || 0)) * 24), hh = p.h != null ? p.h : p.head != null ? p.head * 0.7 : p.quad ? dist(p.quad[0], p.quad[3]) : 300;
      const a = p.buzz * hh * 0.006, jx = (GG.hash2(fr, 3, 77) - 0.5) * 2 * a, jy = (GG.hash2(fr, 5, 78) - 0.5) * 2 * a * 0.6;
      p = Object.assign({}, p, p.quad ? { quad: p.quad.map(q => [q[0] + jx, q[1] + jy]) } : { x: (p.x == null ? W / 2 : p.x) + jx, y: (p.y == null ? H / 2 : p.y) + jy, roll: (p.roll || 0) + jx / hh * 0.3 });
    }
    const geo = geometry(p);
    const name = p.screen || 'black', st = withDefaults(name, p.state || {}, seq), t = ones(p.t != null ? p.t : (lt || 0));
    const D = S[name] || S.black; const L0 = D.light(st);
    const bright = clamp(p.bright == null ? 1 : p.bright, 0, 1), lightK = (p.lit === false ? 0 : 1) * L0.k * bright;
    const sq = screenQuad(geo), Hs = sq2quad(sq);
    const info = { quad: sq, h: geo.h, facing: geo.faceVis, n2: geo.n2, center: hmap(Hs, 0.5, 0.5), targets: {},
      at: (u, v) => hmap(Hs, u, v), pt: (x, y) => hmap(Hs, x / SW, y / SH) };
    const fwd = geo.faceVis === 'front' ? 0.12 : 0.4;
    info.light = { x: geo.center[0] + geo.n2[0] * geo.h * fwd, y: geo.center[1] + geo.n2[1] * geo.h * fwd, tone: p.tone || L0.tone, k: lightK, r: geo.h * 1.9 };
    info.path = polyPath(geo.sil);
    let scr = null;
    if (geo.faceVis === 'front' && render) {
      const dq = sq.map(q => devPt(M, q)); const devH = Math.max(dist(dq[0], dq[3]), dist(dq[1], dq[2]));
      scr = renderScreen(name, st, pickK(devH), t, 0, seq);
      for (const k in scr.lay.targets) info.targets[k] = info.pt(scr.lay.targets[k][0], scr.lay.targets[k][1]);
      const ru = DIM.screen.r / (DIM.face.w - 2 * DIM.screen.inset), rv = DIM.screen.r / (DIM.face.h - 2 * DIM.screen.inset);
      info.screenPath = polyPath(mapPts(Hs, rrUnit(ru, rv, 8)));
    }
    return { geo, name, st, t, L0, bright, lightK, sq, Hs, info, scr, p };
  }
  const IDM = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  // PHONE.where(p, c): the info PHONE.draw would return (targets included when the face is visible), without drawing anything
  function where(p, c) { p = p || {}; const M = c && c.gl ? c.gl.getTransform() : IDM; return prep(p, M, c && c.seq && c.seq.id, c ? c.lt : 0, p.screen != null).info; }

  // PHONE.draw(c, p): see film/api/phone.md. Returns info {quad, at(u,v), pt(x,y), center, facing, n2, light, targets, path, screenPath, h}.
  function draw(c, p) {
    p = p || {};
    const gl = c.gl, M = gl.getTransform(), seq = c.seq && c.seq.id;
    const P0 = prep(p, M, seq, c.lt, true), { geo, L0, bright, lightK, sq, Hs, info, scr } = P0; p = P0.p;
    const tone = toneHex(p.tone || L0.tone), env = p.env || ENV;
    // device-space bounds
    const sc = Math.sqrt(Math.abs(M.a * M.d - M.b * M.c)) || 1;
    const dsil = geo.sil.map(q => devPt(M, q));
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity; dsil.forEach(([x, y]) => { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); });
    const spillOn = geo.faceVis !== 'front' && lightK > 0.01 && p.spill !== false;
    const pad = geo.dil * sc + 3 + (spillOn ? geo.h * sc * 0.26 : 0);
    const bx = Math.max(0, Math.floor(bx0 - pad)), by = Math.max(0, Math.floor(by0 - pad)), ex = Math.min(W, Math.ceil(bx1 + pad)), ey = Math.min(H, Math.ceil(by1 + pad));
    const bw = ex - bx, bh = ey - by;
    if (bw <= 0 || bh <= 0) return info;
    // the contact shadow on the paper (a real shadow, so it lives on c.g and takes the grain)
    if (p.shadow && c.g) {
      const s = p.shadow === true ? {} : p.shadow; const dp = new Path2D(); dp.addPath(info.path, M);
      shadowOnly(c.g, dp, (s.blur == null ? geo.h * 0.05 : s.blur) * sc, `rgba(4,5,10,${s.alpha == null ? 0.5 : s.alpha})`, (s.dx == null ? geo.h * 0.015 : s.dx) * sc, (s.dy == null ? geo.h * 0.03 : s.dy) * sc);
    }
    const g = pool(SCR, bw, bh); g.setTransform(M.a, M.b, M.c, M.d, M.e - bx, M.f - by);
    const T0 = g.getTransform();
    // ---- the frame (the silhouette, dilated by the frame's rounded edge)
    const silP = info.path; const lx = p.lightDir ? p.lightDir[0] : -0.6, ly = p.lightDir ? p.lightDir[1] : -0.8;
    { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; geo.sil.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rr = Math.hypot(x1 - x0, y1 - y0) / 2;
      const gr = g.createLinearGradient(cx + lx * rr, cy + ly * rr, cx - lx * rr, cy - ly * rr);
      gr.addColorStop(0, mixHex('#8E939B', env, 0.35)); gr.addColorStop(0.45, '#4B4E54'); gr.addColorStop(1, '#1C1D20');
      g.fillStyle = gr; g.strokeStyle = gr; g.lineJoin = 'round'; g.lineWidth = 2 * geo.dil; g.fill(silP); g.stroke(silP); }
    // the visible side: lit where it rolls off the face, dark where it turns away
    const el = Math.hypot(geo.edge[0], geo.edge[1]);
    if (el > 0.8) {
      const ux = geo.edge[0] / el, uy = geo.edge[1] / el, cc = geo.faceVis === 'edge' ? geo.center : hmap(geo.faceVis === 'back' ? geo.Hb : geo.Hf, 0.5, 0.5);
      const fp = geo.facePts || geo.sil; let fm = -Infinity, sm = -Infinity; fp.forEach(q => { fm = Math.max(fm, (q[0] - cc[0]) * ux + (q[1] - cc[1]) * uy); }); geo.sil.forEach(q => { sm = Math.max(sm, (q[0] - cc[0]) * ux + (q[1] - cc[1]) * uy); });
      if (geo.faceVis === 'edge') fm = sm - el;
      const a = [cc[0] + ux * fm, cc[1] + uy * fm], b = [cc[0] + ux * (sm + geo.dil), cc[1] + uy * (sm + geo.dil)];
      const gr = g.createLinearGradient(a[0], a[1], b[0], b[1]);
      gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.12, rgba(env, 0.0)); gr.addColorStop(0.32, rgba(mixHex(env, '#FFFFFF', 0.4), 0.42)); gr.addColorStop(0.55, rgba(env, 0.05)); gr.addColorStop(1, 'rgba(0,0,0,0.5)');
      g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.setTransform(1, 0, 0, 1, 0, 0); g.fillRect(0, 0, bw, bh); g.restore();
      if (geo.faceVis === 'edge') { // the buttons on the frame, and the seams between frame and glass
        g.save(); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = Math.max(0.6, geo.h * 0.003); g.stroke(silP); g.restore();
      }
    }
    if (geo.buttons) geo.buttons.forEach(b => { const bp = polyPath(b); g.fillStyle = '#3F4248'; g.fill(bp); g.strokeStyle = rgba(env, 0.22); g.lineWidth = Math.max(0.5, geo.h * 0.002); g.stroke(bp); });
    // ---- the face
    if (geo.faceVis === 'front') {
      const fp = polyPath(geo.facePts); g.fillStyle = C.black; g.fill(fp);
      g.save(); g.clip(info.screenPath);
      const dq = sq.map(q => devPt(M, q)); const pm = dist([dq[0][0] + dq[2][0] - dq[1][0] - dq[3][0], dq[0][1] + dq[2][1] - dq[1][1] - dq[3][1]], [0, 0]);
      warp(g, scr.cv, Hs, clamp(Math.ceil(Math.sqrt(pm) * 0.55), 2, 8));
      if (bright < 1) { g.fillStyle = `rgba(0,0,0,${1 - bright})`; g.fill(info.screenPath); }
      g.restore();
      // the glass: a single clean sheen across it, and its edge catching the room
      const A = hmap(geo.Hf, 0, 0), B = hmap(geo.Hf, 1, 1); const sh = p.sheen == null ? 0.05 : p.sheen;
      if (sh > 0) { const gr = g.createLinearGradient(A[0], A[1], B[0], B[1]); gr.addColorStop(0, rgba(env, 0)); gr.addColorStop(0.27, rgba(env, 0)); gr.addColorStop(0.36, rgba(mixHex(env, '#FFFFFF', 0.5), sh)); gr.addColorStop(0.47, rgba(env, 0)); gr.addColorStop(1, rgba(env, 0));
        g.save(); g.clip(fp); g.fillStyle = gr; g.fill(fp); g.restore(); }
      g.strokeStyle = rgba(mixHex(env, '#FFFFFF', 0.3), 0.32); g.lineWidth = Math.max(0.6, geo.h * 0.0035) ; g.stroke(fp);
    } else if (geo.faceVis === 'back') {
      const fp = polyPath(geo.facePts); const A = hmap(geo.Hb, 0, 0), B = hmap(geo.Hb, 1, 1);
      const gr = g.createLinearGradient(A[0], A[1], B[0], B[1]); gr.addColorStop(0, '#34373D'); gr.addColorStop(0.5, '#1A1B1F'); gr.addColorStop(1, '#0B0B0D'); g.fillStyle = gr; g.fill(fp);
      // frosted back glass: a broad soft sheen
      const sg = g.createLinearGradient(hmap(geo.Hb, 0, 0.55)[0], hmap(geo.Hb, 0, 0.55)[1], hmap(geo.Hb, 0.7, 0.1)[0], hmap(geo.Hb, 0.7, 0.1)[1]);
      sg.addColorStop(0, rgba(env, 0)); sg.addColorStop(0.5, rgba(env, p.sheen == null ? 0.14 : p.sheen * 2)); sg.addColorStop(1, rgba(env, 0)); g.save(); g.clip(fp); g.fillStyle = sg; g.fill(fp); g.restore();
      // the camera island, top left as seen from behind: three lenses in a triangle, a flash, a pin-hole microphone
      const fw = DIM.face.w, fh = DIM.face.h, U = mm => (6 + mm) / fw, V = mm => (6 + mm) / fh;
      const isl = polyPath(mapPts(geo.Hb, rrUnit(7 / fw, 7 / fh, 6, U(0), V(0), U(26), V(26))));
      g.fillStyle = '#2A2D33'; g.fill(isl); g.strokeStyle = rgba(env, 0.28); g.lineWidth = Math.max(0.5, geo.h * 0.003); g.stroke(isl);
      const ring = (mx, my, r, col) => { g.fillStyle = col; g.fill(polyPath(mapPts(geo.Hb, circUnit(U(mx), V(my), r / fw, r / fh, 22)))); };
      [[7.2, 7.4], [18.8, 7.4], [13, 18]].forEach(([mx, my]) => { ring(mx, my, 5.4, '#3C4046'); ring(mx, my, 4.3, '#060607'); ring(mx, my, 2.2, '#14161C'); ring(mx - 1.2, my - 1.2, 0.8, rgba(mixHex(env, '#9A8CFF', 0.4), 0.8)); });
      ring(21.6, 19.6, 1.9, '#D8D2C2'); ring(4.6, 20.8, 0.6, '#050506');
      g.strokeStyle = rgba(env, 0.22); g.lineWidth = Math.max(0.5, geo.h * 0.003); g.stroke(fp);
    }
    // the copy beneath, in the paper world: so an occluder's soft edge meets phone, not floor
    const under = p.under != null ? p.under : !!p.mask;
    if (under && c.g) { c.g.save(); c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.globalAlpha = p.alpha == null ? 1 : p.alpha; c.g.drawImage(SCR.c, 0, 0, bw, bh, bx, by, bw, bh); c.g.restore(); }
    // ---- the light escaping round the edges when the screen is turned away (smooth, warm; gloss)
    if (spillOn) {   // drawn at half resolution (it is all blur), then laid under the body
      const hb = 0.5, sw2 = Math.ceil(bw * hb), sh2 = Math.ceil(bh * hb);
      const dp = new Path2D(); const off = [geo.n2[0] * geo.h * 0.035, geo.n2[1] * geo.h * 0.035];
      const m2 = new DOMMatrix([hb, 0, 0, hb, 0, 0]).multiply(new DOMMatrix([T0.a, T0.b, T0.c, T0.d, T0.e, T0.f])).translate(off[0], off[1]); dp.addPath(silP, m2);
      const nn = Math.hypot(geo.n2[0], geo.n2[1]), kk = lightK * (typeof p.spill === 'number' ? p.spill : 1) * (geo.faceVis === 'edge' ? 1.15 : 0.7 + 0.5 * nn);
      const sg = pool(SPILL, sw2, sh2), warm = WASH[p.tone || L0.tone] || tone, hs = geo.h * sc * hb;
      shadowOnly(sg, dp, hs * 0.012, rgba(mixHex(tone, '#FFFFFF', 0.55), Math.min(1, 1.2 * kk)), 0, 0);
      shadowOnly(sg, dp, hs * 0.035, rgba(mixHex(tone, '#FFFFFF', 0.25), 0.8 * kk), 0, 0);
      shadowOnly(sg, dp, hs * 0.09, rgba(tone, 0.55 * kk), 0, 0);
      shadowOnly(sg, dp, hs * 0.24, rgba(warm, 0.3 * kk), 0, 0);
      if (nn > 0.05) {   // the light leaves on the side the screen faces; the far side stays dark (B1: only past the top edge)
        const dx = M.a * geo.n2[0] + M.c * geo.n2[1], dy = M.b * geo.n2[0] + M.d * geo.n2[1], dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
        const cd = devPt(M, geo.center), cx = (cd[0] - bx) * hb, cy = (cd[1] - by) * hb; let ext = 0; dsil.forEach(q => { ext = Math.max(ext, Math.abs((q[0] - cd[0]) * ux + (q[1] - cd[1]) * uy)); }); ext *= hb;
        const gr = sg.createLinearGradient(cx - ux * ext, cy - uy * ext, cx + ux * ext * 0.9, cy + uy * ext * 0.9); const far = clamp(1 - nn * 1.4, 0, 1);
        gr.addColorStop(0, `rgba(0,0,0,${far})`); gr.addColorStop(0.55, `rgba(0,0,0,${lerp(far, 1, 0.35)})`); gr.addColorStop(1, 'rgba(0,0,0,1)');
        sg.globalCompositeOperation = 'destination-in'; sg.fillStyle = gr; sg.fillRect(0, 0, sw2, sh2); }
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-over'; g.imageSmoothingQuality = 'medium'; g.drawImage(SPILL.c, 0, 0, sw2, sh2, 0, 0, sw2 / hb, sh2 / hb); g.restore();
    }
    // the glow in the halation buffer (quarter resolution)
    const emK = p.emissive != null ? p.emissive : 0.5 * lightK;
    if (emK > 0 && c.em) { c.em.save(); c.em.setTransform(0.25, 0, 0, 0.25, 0, 0); c.em.globalAlpha = clamp(emK, 0, 1); c.em.drawImage(SCR.c, 0, 0, bw, bh, bx, by, bw, bh); c.em.restore(); }
    // ---- the occluder: a hand or thumb drawn by the caller on c.g shows through a hole cut in the gloss (with its soft shadow on the glass)
    if (p.mask) {
      const mg = pool(MASK, bw, bh); mg.setTransform(T0); mg.fillStyle = '#000';
      [].concat(p.mask).forEach(m => { if (!m) return; if (m instanceof Path2D) mg.fill(m); else if (typeof m === 'function') m(mg); else if (m.canvas) mg.drawImage(m.canvas, m.x, m.y, m.w || m.canvas.width, m.h || m.canvas.height); else if (m.width) mg.drawImage(m, 0, 0); });
      if (p.maskShadow !== false) { const s = p.maskShadow && p.maskShadow !== true ? p.maskShadow : {};
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; const OFF = 20000;
        g.shadowColor = `rgba(0,0,0,${s.alpha == null ? 0.5 : s.alpha})`; g.shadowBlur = (s.blur == null ? geo.h * 0.025 : s.blur) * sc; g.shadowOffsetX = -OFF + (s.dx == null ? geo.h * 0.012 : s.dx) * sc; g.shadowOffsetY = (s.dy == null ? geo.h * 0.022 : s.dy) * sc;
        g.drawImage(MASK.c, 0, 0, bw, bh, OFF, 0, bw, bh); g.restore(); }
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out'; g.drawImage(MASK.c, 0, 0, bw, bh, 0, 0, bw, bh); g.restore();
    }
    // ---- onto the gloss layer
    gl.save(); gl.setTransform(1, 0, 0, 1, 0, 0); gl.globalAlpha = p.alpha == null ? 1 : p.alpha; if (p.blur) gl.filter = `blur(${p.blur}px)`;
    gl.drawImage(SCR.c, 0, 0, bw, bh, bx, by, bw, bh); gl.restore(); c.glossUsed = true;
    if (p.over) { gl.save(); p.over(gl, info); gl.restore(); }
    return info;
  }

  // ================================================================ the light on the world
  // A smooth radial falloff (no bands), 'screen'-blended onto the paper (c.g) under the grain; optionally a smooth edge on c.gl.
  const FALL = (() => { const s = []; for (let i = 0; i <= 16; i++) { const t = i / 16; s.push([t, Math.pow(1 - t, 1.6) * Math.exp(-1.2 * t * t)]); } return s; })();
  const WASH = { night: '#FFA67C', water: '#B9E8EE', pink: '#FF93B6', skin: '#FFB48F', violet: '#B4A2FF' };
  function saturate(hex, f) { const c = rgb(hex), m = (c[0] + c[1] + c[2]) / 3; return '#' + c.map(v => clamp(Math.round(m + (v - m) * f), 0, 255).toString(16).padStart(2, '0')).join(''); }
  function radial(g, x, y, r, col, a, sy, ang) {
    if (a <= 0 || r <= 0) return; const c = rgb(col); g.save(); g.translate(x, y); if (ang) g.rotate(ang); if (sy && sy !== 1) g.scale(1, sy);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); FALL.forEach(([t, v]) => gr.addColorStop(t, `rgba(${c[0]},${c[1]},${c[2]},${(v * a).toFixed(4)})`));
    g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); g.restore();
  }
  function glow(c, p) {
    p = p || {}; const L = p.info ? p.info.light : null;
    const x = p.x != null ? p.x : L ? L.x : W / 2, y = p.y != null ? p.y : L ? L.y : H / 2;
    const tn = p.tone || (L && L.tone) || 'night', col = toneHex(tn), wash = WASH[tn] || (L && WASH[Object.keys(TONE).find(k => TONE[k] === col)]) || saturate(col, 1.5), k = (p.k == null ? 1 : p.k) * (L ? L.k : 1);
    if (k <= 0.001) return;
    const r = p.r != null ? p.r : L ? L.r : 600, sy = p.sy || 1, ang = p.angle || 0;
    const g = p.layer === 'gl' ? c.gl : c.g;
    g.save(); if (p.clip) g.clip(p.clip);
    g.globalCompositeOperation = p.mode || 'screen';
    radial(g, x, y, r, wash, 0.4 * k, sy, ang);                                         // the wide wash
    radial(g, x, y, r * 0.42, col, 0.36 * k, sy, ang);                                  // the near pool
    g.restore();
    if (c.em && p.em !== 0) { c.em.save(); c.em.globalCompositeOperation = 'lighter'; radial(c.em, x, y, r * 0.45, col, (p.em == null ? 0.22 : p.em) * k, sy, ang); c.em.restore(); }
    // the smooth edge of the light on a face, in gloss (no grain at all): only where it is clipped to
    if (p.edge && c.gl) { c.gl.save(); if (p.edgeClip || p.clip) c.gl.clip(p.edgeClip || p.clip); c.gl.globalCompositeOperation = 'source-over'; radial(c.gl, x, y, r * 0.55, mixHex(col, '#FFFFFF', 0.2), 0.16 * p.edge * k, sy, ang); c.gl.restore(); c.glossUsed = true; }
  }
  // a GG light for heads and hands lit by the screen: no posterise, so the sculpture's own renderer keeps it smooth (B1's phone light)
  function light(info, head, o) {
    o = o || {}; const L = info.light || info;
    return { pos: [(L.x - head.x) / head.s, (L.y - head.y) / head.s, o.z == null ? 0.9 : o.z], col: toneHex(o.tone || L.tone), k: (o.k == null ? 1.8 : o.k) * (L.k == null ? 1 : L.k), falloff: o.falloff == null ? 1.4 : o.falloff, wrap: o.wrap == null ? 0.25 : o.wrap };
  }

  // ================================================================ timing helpers for the sequences
  // the times each letter of `text` appears when typed over [t0, t1]: a human cadence (pauses after spaces and punctuation), on twos
  const TYPE_CACHE = {};
  function typeTimes(t0, t1, text) {
    const key = t0 + '|' + t1 + '|' + text; if (TYPE_CACHE[key]) return TYPE_CACHE[key];
    const r = O.rng('type|' + text), w = [];
    for (let i = 0; i < text.length; i++) { const pv = text[i - 1]; w.push(0.8 + 0.5 * r() + (pv === ' ' ? 0.5 : 0) + (pv === '.' || pv === ',' || pv === '?' ? 1.4 : 0)); }
    const tot = w.reduce((a, b) => a + b, 0) || 1; let acc = 0; const out = [];
    for (let i = 0; i < text.length; i++) { acc += w[i]; out.push(twos(t0 + (t1 - t0) * acc / tot) + 1e-4); }
    return (TYPE_CACHE[key] = out);
  }
  function typed(t, t0, t1, text) { const tt = typeTimes(t0, t1, text); const tw = twos(t) + 2e-4; let n = 0; while (n < tt.length && tt[n] <= tw) n++; return n; }
  const HISTORY = {
    // yesterday's morning, then today's: the same three messages, every day
    routine: [['stamp', 'Wed 07:10'], ['her', MSG.goodMorning], ['him', MSG.goodMorningLove], ['her', MSG.iLoveYou]],
    morning: [['stamp', '07:12'], ['her', MSG.goodMorning], ['him', MSG.goodMorningLove], ['her', MSG.iLoveYou]],
  };
  // a whole exchange on a clock: returns the thread state at time t (see phone.md)
  function exchange(t, spec) {
    spec = spec || {}; const hist = typeof spec.history === 'string' ? (spec.history === 'both' ? HISTORY.routine.concat(HISTORY.morning) : HISTORY[spec.history] || []) : (spec.history || []);
    const msgs = hist.slice(); let draft = '', n = 0, press = false, lastAt = -1e9, lastFrom = 'her', kb = 0; const tw = twos(t);
    for (const s of spec.steps || []) {
      if (s.stamp != null) { if (t >= (s.at || 0)) msgs.push(['stamp', s.stamp]); continue; }
      const from = s.her != null ? 'her' : 'him', body = s.her != null ? s.her : s.him;
      if (s.type && typeof body === 'string') {
        const a = s.type[0], b = s.type[1], k0 = s.keyboard ? s.keyboard[0] : a - 0.45, k1 = s.keyboard ? s.keyboard[1] : (s.at != null ? s.at : b) + 0.55;
        kb = Math.max(kb, Math.min(seg(t, k0, k0 + 0.3), 1 - seg(t, k1, k1 + 0.3)));
        if (t >= a && (s.at == null || t < s.at)) { draft = body; const tt = typeTimes(a, b, body); n = typed(t, a, b, body); press = n > 0 && n <= tt.length && tw - tt[n - 1] < 1 / 12 - 1e-6 && t < b + 0.1; }
      }
      if (s.at != null && t >= s.at) { msgs.push([from, body]); lastAt = s.at; lastFrom = from; }
    }
    const dur = lastFrom === 'him' ? 0.26 : 0.2;
    return { msgs, draft, typed: n, keyboard: Math.round(kb * 24) / 24, arrive: clamp((ones(t) - lastAt + 1e-4) / dur, 0, 1), press, clock: spec.clock };
  }
  const seg = (t, a, b) => clamp((t - a) / (b - a || 1e-6), 0, 1);
  // repeated flicks of a scroll: each flick travels `dist` points and decelerates (tau seconds); returns the scroll offset
  function flicks(t, spec) { let s = 0; for (const a of spec.at || []) if (t > a) s += (spec.dist || 420) * (1 - Math.exp(-(t - a) / (spec.tau || 0.32))); return s; }
  function prepare(list) { (list || ['waterfall', 'portrait', 'abstract', 'hidden']).forEach(art); }

  // ================================================================ demos (4 s each; node tools/set.js phone 1)
  function paperBg(c, kind) {
    const cv = c.cache('phone|demo|bg|' + kind, g => {
      const P = { night: ['#141A28', '#1F2638', '#2A3349'], day: ['#7F7E79', '#8F8E88', '#A09E97'], warm: ['#2B2328', '#3A2F31', '#4A3C3A'], desk: ['#7C7D7C', '#8A8B8A', '#9A9A97'] }[kind];
      g.fillStyle = P[0]; g.fillRect(0, 0, W, H); const all = new Path2D(); all.rect(0, 0, W, H); GG.texture(g, all, 0.55, 3, 'card');
      // one lifted sheet for the phone to lie on (a pillow, a wall, a counter, a desk)
      const sh = GG.blob([[160, 300], [W * 0.5, 280], [W - 160, 300], [W - 120, 640], [W - 150, 1000], [W * 0.5, 1020], [150, 1000], [120, 640]]);
      const pp = GG.piece(g, sh, { fill: P[1], rough: 1.2, seed: 11, tex: 0.55, kind: kind === 'night' ? 'cloth' : 'card', lift: [0, 14], liftAlpha: 0.6, liftBlur: 14 });
      GG.crescent(g, pp, 0, -10, P[2], 0.9);
    });
    c.reset(); c.g.drawImage(cv, 0, 0);
  }
  function label(c, text, x, y) { c.after.push(cx => { cx.save(); cx.font = '500 26px "Libre Franklin"'; cx.fillStyle = 'rgba(243,236,221,0.75)'; cx.textAlign = 'center'; cx.fillText(text, x, y); cx.restore(); }); }
  const DEMO_MEMO = {};
  const thumbShape = (x, y, s, ang) => { const sh = GG.blob([[0, 0], [0.55, -0.12], [1.05, -0.02], [1.3, 0.22], [1.22, 0.5], [0.9, 0.62], [0.3, 0.6], [-0.4, 0.75], [-0.6, 0.2]].map(([u, v]) => [x + (u * Math.cos(ang) - v * Math.sin(ang)) * s, y + (u * Math.sin(ang) + v * Math.cos(ang)) * s])); return sh; };
  const Q02 = { clock: 'morning', history: 'routine', steps: [{ stamp: '07:12', at: 0 }, { at: 7.0, her: MSG.goodMorning }, { him: MSG.goodMorningLove, type: [10.2, 15.4], at: 15.8 }, { at: 15.95, her: MSG.iLoveYou }] };
  const Q04 = { clock: 'lunch', history: 'morning', steps: [{ stamp: '12:47', at: 0 }, { him: MSG.sendMeOne, type: [6.5, 9.5], at: 10.0 }, { at: 10.2, her: { image: 'hidden' } }] };
  const Q06 = { clock: 'night', history: 'morning', steps: [{ stamp: '23:14', at: 0 }, { at: 20.5, her: { image: 'waterfall' } }] };
  const demos = [
    { name: 'body: front, back, edge, tilted, flat (night paper)', draw(c, t) {
      paperBg(c, 'night');
      draw(c, { x: 250, y: 560, h: 420, screen: 'lock', state: { clock: 'night' } });
      draw(c, { x: 610, y: 560, h: 420, yaw: Math.PI, screen: 'app' });
      draw(c, { x: 880, y: 560, h: 420, yaw: Math.PI / 2 + 0.1, screen: 'app' });
      const spin = t * Math.PI / 2;   // one turning through every angle
      draw(c, { x: 1170, y: 560, h: 420, yaw: spin * 1.6 + 0.6, pitch: 0.18, roll: 0.08, screen: 'thread', state: exchange(17, Q02) });
      draw(c, { x: 1580, y: 700, h: 420, pitch: 1.05, spin: 0.5, persp: 1600, screen: 'lock', shadow: true });
      label(c, 'front', 250, 860); label(c, 'back', 610, 860); label(c, 'edge', 880, 860); label(c, 'turning', 1170, 860); label(c, 'flat, perspective', 1580, 960);
    } },
    { name: 'thread: typing "Good morning. I love you." (Q02 12.6) / sent, the reply instantly (Q02 16.1)', draw(c, t) {
      paperBg(c, 'day');
      draw(c, { x: 560, y: 545, h: 960, roll: -0.04, screen: 'thread', state: exchange(12.6 + t * 0.6, Q02), t: 12.6 + t * 0.6 });
      draw(c, { x: 1360, y: 545, h: 960, roll: 0.03, screen: 'thread', state: exchange(15.75 + t * 0.12, Q02), t: 15.75 + t * 0.12 });
    } },
    { name: 'occluder: his thumb over the glass (mask), quad in perspective', draw(c, t) {
      paperBg(c, 'warm');
      const tt = 11 + t; const q = [[740, 170], [1200, 195], [1250, 1000], [695, 985]];
      // the thumb: a cut-paper piece made once (cached); the same canvas is the mask, so it sits over the gloss
      const th = DEMO_MEMO.thumb || (DEMO_MEMO.thumb = (() => { const cv = mk(420, 300), g = cv.getContext('2d'); const sh = thumbShape(130, 150, 190, -0.5); const pp = GG.piece(g, sh, { fill: '#B47C58', rough: 1.0, seed: 7, tex: 0.5 }); GG.crescent(g, pp, -8, -8, '#D09A76', 0.9); return cv; })());
      const P = { quad: q, edge: [16, 8], screen: 'thread', state: exchange(tt, Q02), t: tt };
      const tip = where(P, c).targets.keys;    // the thumb's tip over the keyboard (PHONE.where: targets before drawing)
      const m = { canvas: th, x: tip[0] - 300 + 14 * Math.sin(t * 5), y: tip[1] - 40 + 6 * Math.cos(t * 5) };
      draw(c, Object.assign({ mask: m }, P));
      c.g.drawImage(th, m.x, m.y);
    } },
    { name: 'glow: night, peach (B1: on its edge, back to us, screen to the pillow)', draw(c, t) {
      paperBg(c, 'night');
      const pos = { x: 960, y: 600, h: 300, spin: -Math.PI / 2, yaw: Math.PI - 0.2, pitch: -0.6, screen: 'app' };
      const info = where(pos);
      glow(c, { info, sy: 0.7 });
      const inf = draw(c, Object.assign({ shadow: { alpha: 0.6 } }, pos));
      label(c, 'PHONE.glow on c.g + spill on c.gl', 960, 1000);
    } },
    { name: 'glow: white water, cool (B3: the lock screen held up)', draw(c, t) {
      paperBg(c, 'day');
      const pos = { x: 960, y: 520, h: 330, yaw: -0.3, roll: 0.06, screen: 'lock', state: { clock: 'visit' } };
      glow(c, { info: where(pos), k: 0.55 });
      draw(c, pos);
    } },
    { name: 'thread: "Send me one." / the hidden image (Q04 8.4, 10.5)', draw(c, t) {
      paperBg(c, 'desk');
      draw(c, { x: 560, y: 545, h: 960, roll: -0.03, screen: 'thread', state: exchange(8.4 + t * 0.2, Q04), t: 8.4 + t * 0.2 });
      draw(c, { x: 1360, y: 545, h: 960, roll: 0.02, screen: 'thread', state: exchange(10.12 + t * 0.12, Q04), t: 10.12 + t * 0.12 });
    } },
    { name: 'thread: the waterfall arrives (Q06 20.6) / opens to full screen (Q06 23)', draw(c, t) {
      paperBg(c, 'warm');
      draw(c, { x: 560, y: 545, h: 960, roll: -0.03, screen: 'thread', state: exchange(20.5 + t * 0.06, Q06) });
      draw(c, { x: 1360, y: 545, h: 960, roll: 0.02, screen: 'image', state: { open: clamp((t - 0.4) / 1.4, 0, 1), thread: exchange(30, Q06) } });
    } },
    { name: 'image: full screen / wallpaper_set (Q06 42-45)', draw(c, t) {
      paperBg(c, 'warm');
      draw(c, { x: 560, y: 545, h: 960, roll: -0.03, screen: 'image', state: {} });
      draw(c, { x: 1360, y: 545, h: 960, roll: 0.02, screen: 'wallpaper_set', state: { in: clamp(t / 0.8, 0, 1), press: t > 2 && t < 2.4 ? 1 : 0 } });
    } },
    { name: 'lock + banner "Call me tonight?" (Q09) / banner over the abstract lock (Q02 7.0)', draw(c, t) {
      paperBg(c, 'day');
      draw(c, { x: 560, y: 545, h: 960, roll: -0.03, screen: 'lock', state: { clock: 'visit', banner: { text: MSG.callMeTonight, in: clamp(t / 0.5, 0, 1) } } });
      draw(c, { x: 1360, y: 545, h: 960, roll: 0.02, screen: 'banner', state: { clock: 'morning', wallpaper: 'abstract', text: MSG.goodMorning } });
    } },
    { name: 'black glass with a reflection (Q11) / wake: the bloom back', draw(c, t) {
      paperBg(c, 'day');
      // what a sequence would pass: the room behind him and his face, as paper (here: a window, a wall, his sculpted head, rendered once)
      const rf = DEMO_MEMO.rf || (DEMO_MEMO.rf = (() => { const cv = mk(360, 780), g = cv.getContext('2d'); g.fillStyle = '#6F6E69'; g.fillRect(0, 0, 360, 780);
        GG.piece(g, O.S().poly([[230, 40], [350, 40], [350, 330], [230, 330]]), { fill: '#C9CAC4', rough: 0.8, seed: 3, tex: 0.4 });
        const hd = GG.head({ who: 'him', x: 175, y: 330, s: 230, yaw: 0.05, pitch: 0.12, eyes: 0.55, gaze: [0, 0.4], mode: 'grain', seed: 9, ss: 1, neckLen: 0.6, bounds: [-0.62, -0.72, 0.66, 1.0], amb: '#4A4A50',
          lights: [{ dir: [0.6, -0.5, 0.6], col: '#D8DCE0', k: 0.75, poster: [0.15, 0.5], levels: [0.6, 1] }] });
        GG.piece(g, GG.blob([[20, 780], [40, 620], [110, 560], [175, 545], [240, 560], [310, 620], [340, 780]]), { fill: '#3D3936', rough: 1.2, seed: 5, tex: 0.6, kind: 'wool' });
        GG.drawHead(g, hd, { shadow: false, tex: 0.4, texSeed: 7 }); return cv; })());
      draw(c, { x: 560, y: 545, h: 960, roll: -0.03, screen: 'black', state: { reflection: rf, amount: 0.34 } });
      draw(c, { x: 1360, y: 545, h: 960, roll: 0.02, screen: 'wake', state: { p: clamp(t / 1.6, 0, 1), clock: 'later', banner: MSG.callMeTonight } });
    } },
    { name: 'dim: the screen let go dark (Q10 51-54) / voice: the waveform crawls (Q05)', draw(c, t) {
      paperBg(c, 'day');
      draw(c, { x: 560, y: 545, h: 960, roll: -0.03, screen: 'dim', state: { p: clamp(t / 3, 0, 1), clock: 'visit' } });
      draw(c, { x: 1360, y: 545, h: 960, roll: 0.02, screen: 'voice', state: { progress: clamp(t / 3.2, 0, 1), playing: t < 3.2, dur: 9, clock: 'bus' } });
    } },
    { name: 'grid: the thread scrolled back, abstract by rule (Q04 26-36) / app: her portrait and the waiting line (Q11)', draw(c, t) {
      paperBg(c, 'desk');
      draw(c, { x: 560, y: 545, h: 960, roll: -0.03, screen: 'grid', state: { scroll: flicks(t, { at: [0.2, 1.4, 2.6], dist: 380 }), clock: 'lunch' } });
      draw(c, { x: 1360, y: 545, h: 960, roll: 0.02, screen: 'app', t, state: { clock: 'later' } });
    } },
    { name: 'true size: B2 (propped against the salt) and Q03 (face down, then face up)', draw(c, t) {
      paperBg(c, 'warm');
      // propped on the counter, turned up toward him; its light cool from the white water
      const pa = { x: 640, y: 600, h: 230, yaw: -0.22, pitch: 0.14, roll: -0.02, screen: 'image', state: { clock: 'night' } };
      glow(c, { x: 640, y: 600 + 230 * 0.55, r: 380, sy: 0.38, tone: 'water', k: 0.9 });
      draw(c, Object.assign({ shadow: true }, pa));
      // face down on the desk: a black slab; then face up with a pink sliver
      draw(c, { x: 1200, y: 650, h: 230, pitch: 1.2, yaw: Math.PI, spin: 0.3, screen: 'thread', bright: 0, shadow: true });
      // Q03 8.0: it buzzes on the desk; the office message is not in the screenplay, so it is a redacted bubble (soft bars, nothing to read)
      draw(c, { x: 1560, y: 650, h: 230, pitch: 1.2, spin: -0.2, persp: 900, screen: 'thread', buzz: t % 1.2 < 0.5 ? 1 : 0, t,
        state: { clock: 'office', msgs: HISTORY.morning.concat([['stamp', '10:38'], ['her', { redact: 1 }]]) }, shadow: true });
      label(c, 'image, 23:14', 640, 900); label(c, 'face down', 1200, 900); label(c, 'face up', 1560, 900);
    } },
    { name: 'screens at true size, flat: every screen', draw(c, t) {
      paperBg(c, 'night');
      const list = [['thread', exchange(16.5, Q02)], ['lock', { clock: 'visit', banner: MSG.callMeTonight }], ['image', {}], ['voice', { progress: 0.4, playing: true }], ['grid', { scroll: 120 }], ['app', {}], ['black', {}], ['thread', Object.assign(exchange(17, Q02), { banner: MSG.callMeTonight })]];
      list.forEach(([s, st], i) => { const x = 140 + i * 235, y = 540; draw(c, { x, y, h: 420, screen: s, state: st, t }); label(c, i === 7 ? 'heads-up' : s, x, 800); });
    } },
  ];
  G.PHONE = { draw, glow, light, where, screen: (name, st, k, t, seq) => renderScreen(name, withDefaults(name, st || {}, seq), k || 1, t || 0, 0, seq).cv,
    exchange, typed, typeTimes, flicks, prepare, art, MSG, CLOCK, SEQ_CLOCK, TONE, DIM, SW, SH, HISTORY, KEYS, demos, _S: S };
})(window);
