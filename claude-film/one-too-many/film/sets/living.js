/* ONE TOO MANY — film set: the LIVING ROOM (Q02 EARLIER, Q04 LATER). Port of style frame F04 and the party tile of S03.

   Views (each is its own 1920x1080 world; call c.camera() with SETS.living.cams.* or none for the authored framing):
     'wide'     F04: floor lamp, couch arm (FG left), armchair (FG right), coffee table with glasses, the warm kitchen doorway,
                the dining table glimpsed through an opening on the right (SIX chairs, SIX places). Painted out to x -600..2520,
                y -240..1320, so every wide cam (with its push) and even a 0.7 zoom-out stays inside the world. Off F04's left edge:
                the way in from the hall, and the wet footprints by it (s.prints).
     'crisps'   insert: the bag, the bowl, the coffee table. Crisps are ivory flakes that fall, miss, scatter and get picked up.
     'glasses'  insert: SIX glasses standing exactly where the title's six bars stand (match cut into SETS.title.draw).
     'doorway'  Kay leaning in the kitchen doorway, medium.
     'couch'    the arm of the couch, medium, for Scott (stands by it, then perches on its big rolled arm).
     'coaster'  high-angle insert of the table top: Marina's glass, the wine ring she wipes, the beer-mat coasters.

   Layers: back(c,t,s,view) | table(c,t,s,view) (wide only: the coffee table and what's on it) | front(c,t,s,view) (wide: armchair + couch;
           every view: the lamp dimmer unless s.dimLast). draw(c,t,s,view) = all three. Put characters between them; with s.dimLast,
           call SETS.living.dim(c, s.lamp, view) after the characters so the dimmer reaches them too.
   Static layers are cached (1x). Under a camera zoom above ~1.16 they are cached again at 1.5-3x for the region the camera sees,
   so close framings stay sharp at cached cost (one-time build per framing). State s: see the report. Deterministic. */
(function () {
  'use strict';
  const O = window.OTM, { C, W, H, S } = O;
  const SETS = window.SETS = window.SETS || {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (t, a, b) => clamp((t - a) / ((b - a) || 1e-6), 0, 1);
  const sm = u => u * u * (3 - 2 * u);
  const mix = O.mix, rgba = O.rgba;
  const twos = t => Math.floor(t * 12 + 1e-6) / 12;
  const ones = t => Math.floor(t * 24 + 1e-6) / 24;
  const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  const WARM = '#F7C46A';                                  // the hot core of a tungsten pool (as in F04)

  // world extents of every view's static layers [x0, y0, x1, y1]: all named cams (with a 4 s push, drift, shake) stay inside
  const EXT = {
    wide: [-600, -240, 2520, 1320], crisps: [-240, -160, 2160, 1240], glasses: [-200, -160, 2120, 1240],
    doorway: [-240, -160, 2160, 1240], couch: [-320, -160, 2240, 1240], coaster: [-240, -160, 2160, 1240],
  };
  const fillExt = (g, e, col) => { g.fillStyle = col; g.fillRect(e[0], e[1], e[2] - e[0], e[3] - e[1]); };
  const rectP = e => { const p = new Path2D(); p.rect(e[0], e[1], e[2] - e[0], e[3] - e[1]); return p; };

  // ------------------------------------------------------------------ cached paths, pools, rims
  const PATHS = new Map();
  const P = (key, mk) => { let p = PATHS.get(key); if (!p) { p = mk(); PATHS.set(key, p); } return p; };
  // a cached Path2D cut from a shape, carrying the shape's world bbox (rims use it to touch only that box)
  const PS = (key, mk, rough, seed) => P(key, () => { const sh = mk(); const p = sh.path(rough == null ? 0.8 : rough, seed || 1); p.bb = sh.bbox(); return p; });
  // posterised pool with cached rough paths (same look as OTM.lightPool)
  function pool(g, key, x, y, bands, o) {
    o = o || {};
    bands.forEach((b, i) => {
      const p = P('pool:' + key + ':' + i, () => S().ellipse(x, y, b.r, b.r * (o.sy || 1), o.rot || 0).path(o.rough == null ? 1.6 : o.rough, (o.seed || 3) + i));
      g.fillStyle = b.color; g.fill(p);
      if (i > 0 && o.dither !== false) { g.save(); g.strokeStyle = O.ditherPattern(g, bands[i - 1].color); g.lineWidth = 5; g.stroke(p); g.restore(); }
    });
  }
  // rim crescent INSIDE a shape (or the union of several) on the side facing the light. Transform-aware; touches only the
  // shapes' device bbox when every path carries .bb (PS), so it is cheap at any cache scale.
  let TMP = null;
  function rimIn(g, path, dir, w, color, alpha) {
    const paths = Array.isArray(path) ? path : [path]; if (!paths.length) return;
    const cw = g.canvas.width, ch = g.canvas.height;
    if (!TMP || TMP.width < cw || TMP.height < ch) TMP = O.makeCanvas(Math.max(cw, TMP ? TMP.width : 0), Math.max(ch, TMP ? TMP.height : 0));
    const m = g.getTransform(); let x0 = 0, y0 = 0, x1 = cw, y1 = ch;
    if (paths.every(p => p.bb)) {
      let a = 1e9, b = 1e9, c2 = -1e9, d = -1e9;
      paths.forEach(p => { const q = p.bb; [[q.x, q.y], [q.x + q.w, q.y], [q.x, q.y + q.h], [q.x + q.w, q.y + q.h]].forEach(([x, y]) => {
        const X = m.a * x + m.c * y + m.e, Y = m.b * x + m.d * y + m.f; a = Math.min(a, X); b = Math.min(b, Y); c2 = Math.max(c2, X); d = Math.max(d, Y); }); });
      const pad = 4 + w * Math.hypot(m.a, m.b) * 2;
      x0 = Math.max(0, Math.floor(a - pad)); y0 = Math.max(0, Math.floor(b - pad)); x1 = Math.min(cw, Math.ceil(c2 + pad)); y1 = Math.min(ch, Math.ceil(d + pad));
      if (x1 <= x0 || y1 <= y0) return;
    }
    const t = TMP.getContext('2d');
    t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.globalAlpha = 1; t.clearRect(x0, y0, x1 - x0, y1 - y0);
    t.save(); t.beginPath(); t.rect(x0, y0, x1 - x0, y1 - y0); t.clip();
    t.setTransform(m); t.fillStyle = color; paths.forEach(p => t.fill(p)); t.globalCompositeOperation = 'destination-out'; t.translate(-dir[0] * w, -dir[1] * w); paths.forEach(p => t.fill(p));
    t.restore();
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha == null ? 1 : alpha; g.drawImage(TMP, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0); g.restore();
  }
  // cheap per-frame rim: the shape pushed toward the light in the rim colour, then the ink on top
  function inkRim(g, path, dir, w, rim, ink) {
    if (rim && w) { g.save(); g.translate(dir[0] * w, dir[1] * w); g.fillStyle = rim; g.fill(path); g.restore(); }
    g.fillStyle = ink || C.ink; g.fill(path);
  }

  // a static layer. Zoom <= ~1.16: one 1x cache over the layer's extent (c.cache key 'living.<key>').
  // Closer: a cache at 1.5 / 2 / 2.5 / 3x of just the region the camera sees (+12% margin, snapped to 64 px), kept while the
  // framing stays inside it, so a push or drift reuses it. Hysteresis: a hi-res cache is made above 1.16 and still used down to 1.10.
  const HI = []; let HICLK = 0;
  function viewRect(m) {
    const inv = m.inverse(); let a = 1e9, b = 1e9, c2 = -1e9, d = -1e9;
    [[0, 0], [W, 0], [0, H], [W, H]].forEach(([x, y]) => { const X = inv.a * x + inv.c * y + inv.e, Y = inv.b * x + inv.d * y + inv.f; a = Math.min(a, X); b = Math.min(b, Y); c2 = Math.max(c2, X); d = Math.max(d, Y); });
    return [a, b, c2, d];
  }
  function layer(c, key, paint, ext) {
    const g = c.g, m = g.getTransform(), z = Math.hypot(m.a, m.b);
    const vr = viewRect(m); const need = [Math.max(vr[0], ext[0]), Math.max(vr[1], ext[1]), Math.min(vr[2], ext[2]), Math.min(vr[3], ext[3])];
    if (need[2] <= need[0] || need[3] <= need[1]) return;                   // nothing of this layer is on screen
    if (z > 1.10) {
      let e = HI.find(q => q.key === key && q.s >= z * 0.97 && q.r[0] <= need[0] && q.r[1] <= need[1] && q.r[2] >= need[2] && q.r[3] >= need[3]);
      if (!e && z > 1.16) {
        let s = Math.min(3, Math.ceil(z * 2) / 2);
        const mw = (need[2] - need[0]) * 0.12, mh = (need[3] - need[1]) * 0.12;
        const r = [Math.max(ext[0], Math.floor((need[0] - mw) / 64) * 64), Math.max(ext[1], Math.floor((need[1] - mh) / 64) * 64),
          Math.min(ext[2], Math.ceil((need[2] + mw) / 64) * 64), Math.min(ext[3], Math.ceil((need[3] + mh) / 64) * 64)];
        s = Math.min(s, 4096 / Math.max(r[2] - r[0], r[3] - r[1]));
        const cv = O.makeCanvas(Math.ceil((r[2] - r[0]) * s), Math.ceil((r[3] - r[1]) * s)); const cg = cv.getContext('2d');
        cg.scale(s, s); cg.translate(-r[0], -r[1]); paint(cg);
        e = { key, r, s, cv, used: ++HICLK }; HI.push(e);
        // keep at most 8 hi-res layers and ~24 Mpx (~96 MB) in all: drop the least recently used
        const px = () => HI.reduce((n, q) => n + q.cv.width * q.cv.height, 0);
        while (HI.length > 1 && (HI.length > 8 || px() > 24e6)) { let lo = 0; HI.forEach((q, i) => { if (q.used < HI[lo].used) lo = i; }); HI.splice(lo, 1); }
      }
      if (e) { e.used = ++HICLK; g.drawImage(e.cv, e.r[0], e.r[1], e.r[2] - e.r[0], e.r[3] - e.r[1]); return; }
    }
    const cv = c.cache('living.' + key, cg => { cg.translate(-ext[0], -ext[1]); paint(cg); }, ext[2] - ext[0], ext[3] - ext[1]);
    g.drawImage(cv, ext[0], ext[1]);
  }
  function emPath(c, path, color, alpha) { const e = c.em; e.save(); e.globalAlpha = alpha == null ? 1 : alpha; e.fillStyle = color; e.fill(path); e.restore(); }

  // ------------------------------------------------------------------ props (public helpers)
  // a crisp: ivory flake. Seven cut shapes at size 40, scaled.
  const CRISP = [];
  function crispShapes() {
    if (CRISP.length) return CRISP;
    for (let i = 0; i < 7; i++) {
      const r = O.rng('crisp' + i), pts = [], n = 8 + (i % 3);
      const asp = 0.55 + r() * 0.25, n2 = n + 4;
      for (let k = 0; k < n2; k++) { const a = k / n2 * Math.PI * 2 + r() * 0.25, rr = 44 * (1 + (r() - 0.5) * 0.42) * (k % 2 ? 0.93 : 1.04); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * asp]); }
      CRISP.push(O.fig.smooth(pts, true).path(1.8, 30 + i));
    }
    return CRISP;
  }
  const CR_SHADE = mix(C.cardPaper, C.tungstenMid, 0.42), CR_LIT = mix(C.cardPaper, C.tungsten, 0.18);
  // k = {x, y, rot, s (px across), flip (-1..1, tumble: the visible face squashes), shape, alpha}
  function crisp(g, k, light) {
    const sh = crispShapes()[(k.shape || 0) % 7]; const s = (k.s || 24) / 80; const f = k.flip == null ? 1 : k.flip;
    g.save(); g.translate(k.x, k.y); g.rotate(k.rot || 0); g.scale(s, s * Math.max(0.14, Math.abs(f)));
    if (k.alpha != null) g.globalAlpha *= k.alpha;
    g.fillStyle = f < 0 ? CR_SHADE : C.cardPaper; g.fill(sh);
    g.save(); g.clip(sh);
    const ld = light || [0.6, -0.8], sg = f < 0 ? -1 : 1;
    g.fillStyle = CR_SHADE; g.beginPath(); g.ellipse(-ld[0] * 58, -ld[1] * 58 * sg, 46, 34, 0.4, 0, 7); g.fill();
    if (f >= 0) { g.fillStyle = CR_LIT; g.beginPath(); g.ellipse(ld[0] * 26, ld[1] * 20, 22, 9, 0.3, 0, 7); g.fill(); }
    g.strokeStyle = f < 0 ? C.cardPaper : CR_SHADE; g.lineWidth = 3.2 / Math.max(0.3, s); g.globalAlpha *= 0.8;
    g.beginPath(); g.moveTo(-30, -6); g.bezierCurveTo(-12, -18, 6, 8, 30, -4); g.stroke();
    g.restore(); g.restore();
  }
  // the crisp bag: (x, y) = mouth centre, rot = the way the mouth faces (0 = right, PI/2 = straight down, -PI/2 = up), s = scale
  function bagShape(s) {
    return P('bag:' + s, () => {
      const L = 400 * s, w = 150 * s, sh = S();
      sh.M(0, -w * 0.8).C(-L * 0.12, -w * 1.08, -L * 0.62, -w * 1.14, -L + 34 * s, -w * 0.94).L(-L + 30 * s, -w * 1.06);
      for (let i = 0; i <= 18; i++) sh.L(-L + (i % 2 ? 0 : 8 * s), -w * 1.06 + (2 * w * 1.06) * i / 18);
      sh.L(-L + 30 * s, w * 1.06).L(-L + 34 * s, w * 0.94).C(-L * 0.62, w * 1.14, -L * 0.12, w * 1.08, 0, w * 0.8);
      for (let i = 0; i <= 8; i++) sh.L((i % 2 ? 7 : -3) * s, w * 0.84 - (2 * w * 0.84) * i / 8);   // torn edge
      sh.Z();
      return { body: sh.path(1, 61), L, w,
        seal: S().rect(-L + 2 * s, -w * 1.1, 30 * s, 2 * w * 1.1).path(0.5, 65),
        band: S().M(-L * 0.66, -w * 1.2).Q(-L * 0.6, 0, -L * 0.66, w * 1.2).L(-L * 0.38, w * 1.2).Q(-L * 0.32, 0, -L * 0.38, -w * 1.2).Z().path(1, 64),
        wave: S().M(-L * 0.66, -w * 0.3).C(-L * 0.55, -w * 0.1, -L * 0.45, -w * 0.55, -L * 0.36, -w * 0.25).L(-L * 0.36, -w * 0.12).C(-L * 0.45, -w * 0.42, -L * 0.55, w * 0.02, -L * 0.66, -w * 0.16).Z().path(0.6, 66),
        mouth: S().ellipse(2 * s, 0, 18 * s, w * 0.8, 0).path(0.8, 62),
        foil: S().ellipse(7 * s, -w * 0.12, 7 * s, w * 0.58, 0).path(0.6, 63),
        crinkles: [[-L * 0.2, -w * 0.96, -L * 0.3, -w * 0.6], [-L * 0.8, -w * 0.9, -L * 0.74, -w * 0.5], [-L * 0.18, w * 0.5, -L * 0.28, w * 0.9], [-L * 0.86, w * 0.3, -L * 0.8, w * 0.7]] };
    });
  }
  function bag(g, x, y, rot, s, light, em) {
    s = s || 1; const b = bagShape(s); const ld = light || [0.6, -0.8];
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    const lr = [ld[0] * Math.cos(-rot) - ld[1] * Math.sin(-rot), ld[0] * Math.sin(-rot) + ld[1] * Math.cos(-rot)];
    inkRim(g, b.body, lr, 3.4 * s, C.tungsten);
    g.save(); g.clip(b.body);
    g.fillStyle = mix(C.wine, C.ink, 0.3); g.fill(b.band); g.fillStyle = rgba(C.cardPaper, 0.75); g.fill(b.wave);
    g.fillStyle = C.ink; g.fill(b.seal); g.fillStyle = rgba(C.tungstenMid, 0.8); for (let i = 1; i < 4; i++) g.fillRect(-b.L + 6 * s * i, -b.w * 1.02, 1.4, b.w * 2.04);
    g.restore();
    g.strokeStyle = C.tungsten; g.lineWidth = 1.8 * s; g.globalAlpha = 0.75;
    b.crinkles.forEach(([a, bb, c2, d]) => { g.beginPath(); g.moveTo(a, bb); g.lineTo(c2, d); g.stroke(); });
    g.globalAlpha = 1; g.fillStyle = C.soot; g.fill(b.mouth); g.fillStyle = C.cardPaper; g.globalAlpha = 0.9; g.fill(b.foil); g.globalAlpha = 1;
    g.restore();
    if (em) { em.save(); em.translate(x, y); em.rotate(rot || 0); em.globalAlpha = 0.6; em.fillStyle = C.cardPaper; em.fill(b.foil); em.restore(); }
  }
  // world-space affine for something held in the bag's frame (for hands): bag-local point (lx, ly) and local rotation a
  function bagFrame(b, lx, ly, a, sc) { const c = Math.cos(b.rot), s = Math.sin(b.rot); const wx = b.x + c * lx - s * ly, wy = b.y + s * lx + c * ly; const r = b.rot + a; return [Math.cos(r) * sc, Math.sin(r) * sc, -Math.sin(r) * sc, Math.cos(r) * sc, wx, wy]; }
  const bagPt = (b, lx, ly) => { const m = bagFrame(b, lx, ly, 0, 1); return [m[4], m[5]]; };
  // a beer-mat coaster in perspective (sy squash), (x,y) centre; lift raises it off the table and casts a shadow
  function coaster(g, x, y, rot, size, sy, lift) {
    size = size || 110; sy = sy == null ? 0.55 : sy;
    const sq = P('mat', () => { const sh = S(); const r = 12, h = 50; sh.M(-h + r, -h).L(h - r, -h).Q(h, -h, h, -h + r).L(h, h - r).Q(h, h, h - r, h).L(-h + r, h).Q(-h, h, -h, h - r).L(-h, -h + r).Q(-h, -h, -h + r, -h).Z(); return sh; });
    const k = size / 100;
    const M = [Math.cos(rot) * k, Math.sin(rot) * k * sy, -Math.sin(rot) * k, Math.cos(rot) * k * sy, x, y];
    if (lift) { g.save(); g.globalAlpha = 0.45; g.fillStyle = C.ink; g.fill(sq.transform(M).translate(-lift * 0.6, lift * 0.9).path(0.4, 71)); g.restore(); }
    const yo = -(lift || 0);
    g.fillStyle = mix(C.cardPaper, C.tungstenMid, 0.5); g.fill(sq.transform(M).translate(0, yo + 3).path(0.4, 72));   // the edge (thickness)
    g.fillStyle = C.cardPaper; g.fill(sq.transform(M).translate(0, yo).path(0.4, 73));
    g.strokeStyle = C.wine; g.lineWidth = 2; g.stroke(sq.transform([M[0] * 0.8, M[1] * 0.8, M[2] * 0.8, M[3] * 0.8, x, y + yo]).path(0, 1));
    g.fillStyle = C.wine; g.beginPath(); g.ellipse(x, y + yo, 15 * k, 15 * k * sy, rot, 0, 7); g.fill();
    g.fillStyle = C.cardPaper; g.beginPath(); g.ellipse(x, y + yo, 6 * k, 6 * k * sy, rot, 0, 7); g.fill();
  }
  // Marina's cloth, folded, (x,y) centre
  function cloth(g, x, y, rot, s) {
    s = s || 1; const sh = P('cloth', () => S().poly([[-70, -34], [62, -46], [78, 30], [-60, 42]]));
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s * 0.7);
    g.fillStyle = C.cardPaper; g.fill(sh.path(1.6, 74));
    g.strokeStyle = mix(C.cardPaper, C.tungstenMid, 0.5); g.lineWidth = 3; g.beginPath(); g.moveTo(-64, 4); g.quadraticCurveTo(0, -10, 70, -6); g.stroke();
    g.fillStyle = rgba(C.wine, 0.55); g.beginPath(); g.ellipse(-20, 18, 18, 7, 0.2, 0, 7); g.fill();
    g.restore();
  }
  // the crisps bowl, side view: (x, y) = bottom centre on the table, s = scale (1 = the wide's size, 72 px across), fill 0..1
  function bowlSmall(g, x, y, s, fill) {
    s = s || 1; fill = fill == null ? 1 : fill;
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = C.ink; g.fill(P('bowlS', () => S().M(-36, -26).C(-30, 4, 30, 4, 36, -26).Z().path(0.4, 7)));
    if (fill > 0) { const r = O.rng('crispsS'); g.fillStyle = C.cardPaper; const n = Math.round(9 * fill);
      for (let i = 0; i < 9; i++) { const xx = -28 + r() * 56, yy = -27 - r() * 9 * fill, a = r() * 3; if (i >= n) continue; g.save(); g.translate(xx, yy); g.rotate(a); g.fillRect(-4, -2, 8, 4); g.restore(); } }
    g.fillStyle = C.tungsten; g.fillRect(-36, -27, 72, 2 / s);
    g.restore();
  }
  // Christof's biscuit (F04): (x, y) centre, s scale (1 = 13 px radius, the wide's size)
  function biscuit(g, em, x, y, s) {
    s = s || 1; g.fillStyle = C.cardPaper; g.beginPath(); g.arc(x, y, 13 * s, 0, 7); g.fill();
    g.fillStyle = C.tungstenMid; [[-4, -3], [4, -2], [0, 4]].forEach(([dx, dy]) => { g.beginPath(); g.arc(x + dx * s, y + dy * s, 1.6 * s, 0, 7); g.fill(); });
    if (em) { em.fillStyle = C.cardPaper; em.beginPath(); em.arc(x, y, 16 * s, 0, 7); em.fill(); }
  }
  // Angelo's card box: (x, y) centre, rot, s (1 = 46 px tall), open 0..1 (the flap), deck 0..1 (how far the deck has come out, along -y)
  function cardBox(g, x, y, rot, s, open, deck) {
    s = s || 1; g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s);
    if (deck > 0) { g.fillStyle = C.cardPaper; g.fillRect(-14, -23 - 34 * deck, 28, 40); g.fillStyle = C.cardBlue; g.fillRect(-11, -20 - 34 * deck, 22, 34); g.strokeStyle = C.cardPaper; g.lineWidth = 1; g.strokeRect(-8, -17 - 34 * deck, 16, 28); }
    g.fillStyle = C.cardBlue; g.fillRect(-16, -23, 32, 46); g.fillStyle = C.cardPaper; g.fillRect(-13, -20, 26, 2); g.fillRect(-13, 18, 26, 2);
    g.fillStyle = C.cardPaper; g.beginPath(); g.ellipse(0, 0, 6, 9, 0, 0, 7); g.fill(); g.fillStyle = C.cardBlue; g.beginPath(); g.ellipse(0, 0, 3, 5, 0, 0, 7); g.fill();
    if (open > 0) { g.fillStyle = mix(C.cardBlue, C.ink, 0.35); g.beginPath(); g.moveTo(-16, -23); g.lineTo(16, -23); g.lineTo(13, -23 - 12 * open); g.lineTo(-13, -23 - 12 * open); g.fill(); }
    g.restore();
  }

  // ================================================================== WIDE (F04)
  const WD = {
    BASE: 872, LAMP: { x: 930, top: 334, bot: 414, wt: 70, wb: 148, foot: 904 },
    KIT: { x0: 92, x1: 330, top: 188 }, TBL: { x0: 612, x1: 1316, top: 792, depth: 18, leg: 912 },
    D: { x0: 1300, x1: 1652, top: 332, floor: 806, cx: 1452, cy: 742, rx: 80, ry: 15 },
    HALL: { x0: -430, x1: -236, top: 196 },                     // the way in from the hall (off F04's left edge)
    SPK: { x: 392, w: 42, h: 78 },                               // the little speaker the music comes from
    glassX: [676, 770, 1006, 1094, 1182, 1270], fills: [0.55, 0.2, 0.7, 0.45, 0.85, 0.35],
    ring: [948, 784], bowl: [868, 786], mats: [646, 790],
  };
  const LC = [WD.LAMP.x, (WD.LAMP.top + WD.LAMP.bot) / 2 + 30];
  const toLamp = (x, y) => norm(LC[0] - x, LC[1] - y);
  const shadeP = () => P('w.shade', () => { const L = WD.LAMP; return S().M(L.x - L.wt / 2, L.top).L(L.x + L.wt / 2, L.top).L(L.x + L.wb / 2, L.bot).L(L.x - L.wb / 2, L.bot).Z().path(0.6, 3); });

  function paintWideBack(g) {
    const { BASE, LAMP, KIT, D, HALL, SPK } = WD, E = EXT.wide;
    fillExt(g, E, C.ink);
    // ---- back wall (minus the kitchen doorway, the dining opening and the hall doorway)
    const wallClip = P('w.wallclip', () => { const p = new Path2D(); p.rect(E[0], E[1], E[2] - E[0], BASE - E[1]); p.rect(KIT.x0, KIT.top, KIT.x1 - KIT.x0, BASE - KIT.top); p.rect(D.x0, D.top, D.x1 - D.x0, BASE - D.top); p.rect(HALL.x0, HALL.top, HALL.x1 - HALL.x0, BASE - HALL.top); return p; });
    g.save(); g.clip(wallClip, 'evenodd');
    g.fillStyle = mix(C.tungstenLow, C.ink, 0.5);
    g.fill(P('w.upglow', () => S().poly([[LAMP.x - LAMP.wt / 2, LAMP.top], [LAMP.x + LAMP.wt / 2, LAMP.top], [LAMP.x + 267, -240], [LAMP.x - 267, -240]]).path(1.2, 2)));
    pool(g, 'w.wall', LAMP.x + 60, 500, [{ r: 1120, color: C.tungstenLow }, { r: 720, color: C.tungstenMid }, { r: 370, color: C.tungsten }], { sy: 0.36, seed: 4, rough: 2.6 });
    // a picture hung in a hurry, not quite level
    g.save(); g.translate(452, 262); g.rotate(0.045);
    g.fillStyle = rgba(C.ink, 0.45); g.fillRect(-36, -24, 80, 60);
    g.fillStyle = C.ink; g.fill(P('w.pic', () => S().rect(-42, -30, 80, 60).path(0.6, 9))); g.fillStyle = mix(C.tungstenLow, C.tungstenMid, 0.35); g.fillRect(-32, -20, 60, 40);
    g.fillStyle = mix(C.tungstenLow, C.ink, 0.55); g.fillRect(-22, -12, 40, 24);
    g.restore();
    g.fillStyle = C.ink; g.fillRect(E[0], BASE - 24, E[2] - E[0], 24);
    g.restore();

    // ---- KITCHEN DOORWAY (bright, warm: Kay is still warm here)
    g.save(); g.beginPath(); g.rect(KIT.x0, KIT.top, KIT.x1 - KIT.x0, BASE - KIT.top + 2); g.clip();
    g.fillStyle = C.tungstenMid; g.fillRect(KIT.x0, KIT.top, KIT.x1 - KIT.x0, BASE - KIT.top);
    pool(g, 'w.kit', KIT.x0 + 150, 420, [{ r: 260, color: C.tungsten }, { r: 120, color: WARM }], { sy: 1.3, seed: 11, rough: 1.6 });
    g.fillStyle = C.ink; g.fill(P('w.kit1', () => S().rect(KIT.x1 - 90, KIT.top - 10, 110, 120).path(0.6, 3))); g.fill(P('w.kit2', () => S().rect(KIT.x1 - 120, 676, 140, 220).path(0.6, 4)));
    g.fill(P('w.kettle', () => S().M(KIT.x1 - 96, 676).L(KIT.x1 - 92, 640).C(KIT.x1 - 88, 626, KIT.x1 - 62, 626, KIT.x1 - 58, 640).L(KIT.x1 - 54, 676).Z().add(S().rect(KIT.x1 - 82, 618, 10, 10)).path(0.4, 6)));
    g.fillStyle = C.tungsten; g.fillRect(KIT.x1 - 120, 674, 140, 3);
    g.restore();
    g.fillStyle = C.ink; g.fill(P('w.kitframe', () => S().rect(KIT.x0 - 26, KIT.top - 24, 26, BASE - KIT.top + 24).add(S().rect(KIT.x0 - 26, KIT.top - 24, KIT.x1 - KIT.x0 + 52, 24)).add(S().rect(KIT.x1, KIT.top - 24, 26, BASE - KIT.top + 24)).path(0.6, 5)));

    // ---- THE WAY IN FROM THE HALL (off F04's left edge): dim; the hall's pendant is round the corner
    g.save(); g.beginPath(); g.rect(HALL.x0, HALL.top, HALL.x1 - HALL.x0, BASE - HALL.top + 2); g.clip();
    g.fillStyle = mix(C.tungstenLow, C.ink, 0.68); g.fillRect(HALL.x0, HALL.top, HALL.x1 - HALL.x0, BASE - HALL.top);
    g.fillStyle = mix(C.tungstenLow, C.ink, 0.42); g.fill(P('w.hallspill', () => S().poly([[HALL.x0 + 40, HALL.top], [HALL.x1, HALL.top], [HALL.x1, BASE], [HALL.x0 + 110, BASE]]).path(1.4, 24)));
    g.restore();
    const hf = PS('w.hallframe', () => S().rect(HALL.x0 - 24, HALL.top - 22, 24, BASE - HALL.top + 22).add(S().rect(HALL.x0 - 24, HALL.top - 22, HALL.x1 - HALL.x0 + 48, 22)).add(S().rect(HALL.x1, HALL.top - 22, 24, BASE - HALL.top + 22)), 0.6, 26);
    g.fillStyle = C.ink; g.fill(hf); rimIn(g, hf, toLamp(HALL.x1 + 12, 500), 2.4, C.tungstenLow);

    // ---- THE DINING AREA beyond: six chairs, six places, the unlit pendant, lit only by spill from the lamp
    paintDining(g);

    // ---- FLOOR
    g.save(); g.beginPath(); g.rect(E[0], BASE, E[2] - E[0], E[3] - BASE); g.clip();
    g.fillStyle = C.ink; g.fillRect(E[0], BASE, E[2] - E[0], E[3] - BASE);
    pool(g, 'w.floor', LAMP.x, 948, [{ r: 1060, color: C.tungstenLow }, { r: 700, color: C.tungstenMid }, { r: 380, color: C.tungsten }], { sy: 0.13, seed: 8, rough: 2.2 });
    g.fillStyle = rgba(C.tungstenMid, 0.35); g.fill(P('w.dinspill', () => S().poly([[D.x0 + 90, BASE], [D.x1 + 10, BASE], [D.x1 + 140, 1000], [D.x0 + 170, 1000]]).path(1.4, 12)));
    g.fillStyle = rgba(C.tungstenLow, 0.5); g.fill(P('w.hallfloor', () => S().poly([[HALL.x0 + 20, BASE], [HALL.x1, BASE], [HALL.x1 + 90, 960], [HALL.x0 + 60, 960]]).path(1.4, 27)));
    g.fillStyle = rgba(C.ink, 0.35); g.fill(P('w.rug', () => S().poly([[420, 900], [1500, 900], [1700, E[3]], [220, E[3]]]).path(1, 9)));
    g.fillStyle = rgba(C.ink, 0.8); g.fill(P('w.tshadow', () => S().poly([[WD.TBL.x0 + 4, 914], [WD.TBL.x1 - 4, 914], [WD.TBL.x1 + 240, E[3]], [WD.TBL.x0 - 220, E[3]]]).path(1.6, 13)));
    g.restore();
    // ---- the little speaker on the floor by the kitchen frame (the music's source; its cone pulses per frame with s.music)
    const sp = PS('w.spk', () => S().M(SPK.x - SPK.w / 2, BASE + 4).L(SPK.x - SPK.w / 2 + 2, BASE + 4 - SPK.h).L(SPK.x + SPK.w / 2 - 2, BASE + 4 - SPK.h).L(SPK.x + SPK.w / 2, BASE + 4).Z(), 0.4, 28);
    g.fillStyle = C.ink; g.fill(sp); rimIn(g, sp, toLamp(SPK.x, BASE - 40), 2.2, C.tungstenMid);
    g.strokeStyle = mix(C.ink, C.tungstenLow, 0.7); g.lineWidth = 2; g.beginPath(); g.arc(SPK.x, BASE - 20, 13, 0, 7); g.stroke(); g.beginPath(); g.arc(SPK.x, BASE - 54, 5, 0, 7); g.stroke();
    // haze under the shade
    OTM.cone(g, [[LAMP.x - LAMP.wb / 2, LAMP.bot], [LAMP.x + LAMP.wb / 2, LAMP.bot], [LAMP.x + 520, 1000], [LAMP.x - 520, 1000]], C.tungsten, 0.05);
    // ---- the floor lamp: pole, foot, empire shade
    g.fillStyle = C.ink; g.fillRect(LAMP.x - 4, LAMP.bot - 6, 8, LAMP.foot - LAMP.bot); g.fill(P('w.lampfoot', () => S().ellipse(LAMP.x, LAMP.foot, 44, 7, 0).path(0.3, 2)));
    paintShade(g);
  }
  function paintShade(g) {
    const LAMP = WD.LAMP, shP = shadeP();
    g.fillStyle = C.tungsten; g.fill(shP);
    g.save(); g.clip(shP); g.fillStyle = WARM; g.fill(P('w.shadecore', () => S().ellipse(LAMP.x, LAMP.bot + 10, 46, 80, 0).path(1, 4))); g.restore();
    g.fillStyle = C.ink; g.fillRect(LAMP.x - LAMP.wt / 2 - 2, LAMP.top - 3, LAMP.wt + 4, 5); g.fillRect(LAMP.x - LAMP.wb / 2 - 2, LAMP.bot - 2, LAMP.wb + 4, 4);
  }
  // six chairs round a round table, seen through the opening: two pushed in at the near side, one each side in profile, two
  // beyond the table. None is hidden behind the FG armchair's arm (it covers x > 1530 below y 772), so all six count at 2.3x.
  function diningSeats() {
    const D = WD.D; const out = [];
    for (let k = 0; k < 6; k++) { const th = Math.PI / 2 + Math.PI / 6 + k * Math.PI / 3; out.push({ k, th, sx: Math.cos(th), sy: Math.sin(th) }); }
    return out.map(q => { const kind = Math.abs(q.sx) > 0.9 ? 'side' : q.sy > 0 ? 'near' : 'far', R = D.rx + (kind === 'side' ? 24 : kind === 'near' ? 18 : 6);
      return Object.assign(q, { kind, x: D.cx + R * q.sx, foot: D.floor + 12 * q.sy, plate: [D.cx + 0.64 * D.rx * q.sx, D.cy + 0.6 * D.ry * q.sy] }); });
  }
  // a ladder-back chair cut from solid card: posts, three slats, a seat slab, legs
  function chairShape(q) {
    const D = WD.D, sh = S(), fl = q.foot;
    if (q.kind === 'side') {                                      // profile: the back post on the outside, the seat toward the table
      const dir = -Math.sign(q.sx), bx = q.x, top = fl - 92, seatY = fl - 40;
      sh.rect(bx - 3, top, 7, fl - top).rect(bx - 5, top - 2, 11, 9);
      sh.rect(Math.min(bx, bx + 22 * dir) - 1, seatY, 25, 7).rect(bx + 19 * dir - 2, seatY + 6, 5, fl - seatY - 6);
      [0.28, 0.5].forEach(u => sh.rect(bx - 4, top + (seatY - top) * u, 9, 5));
    } else {
      const wdt = q.kind === 'near' ? 42 : 48, bx = q.x;
      const top = q.kind === 'near' ? D.cy + D.ry + 7 : fl - 96;   // the near pair are pushed in: their backs sit below the table top
      const seatY = q.kind === 'near' ? fl - 30 : fl - 42;
      sh.rect(bx - wdt / 2, top, 6, fl - top).rect(bx + wdt / 2 - 6, top, 6, fl - top);
      sh.rect(bx - wdt / 2 - 2, top - 1, wdt + 4, 8);
      const n = q.kind === 'near' ? 2 : 3;
      for (let i = 1; i <= n; i++) sh.rect(bx - wdt / 2 + 2, top + (seatY - top) * (i / (n + 1)) + 2, wdt - 4, 5);
      sh.rect(bx - wdt / 2 - 3, seatY, wdt + 6, 7);
    }
    return sh;
  }
  function paintDining(g) {
    const { BASE, D } = WD; const ld = norm(LC[0] - D.cx, LC[1] - D.cy);
    g.save(); g.beginPath(); g.rect(D.x0, D.top, D.x1 - D.x0, BASE - D.top + 2); g.clip();
    g.fillStyle = mix(C.tungstenLow, C.ink, 0.6); g.fillRect(D.x0, D.top, D.x1 - D.x0, BASE - D.top + 2);
    // the spill: the opening projected from the lamp onto the far wall, two flat bands
    const k = 1.24, pr = (x, y) => [LC[0] + (x - LC[0]) * k, LC[1] + (y - LC[1]) * k];
    const a = pr(D.x0, D.top);
    g.fillStyle = C.tungstenLow; g.fill(P('d.spill1', () => S().poly([[a[0] - 6, a[1]], [D.x1 + 40, a[1]], [D.x1 + 40, D.floor], [a[0] - 6, D.floor]]).path(1.6, 21)));
    g.save(); g.strokeStyle = O.ditherPattern(g, mix(C.tungstenLow, C.ink, 0.6)); g.lineWidth = 5; g.stroke(P('d.spill1', () => null)); g.restore();
    g.fillStyle = C.tungstenMid; g.fill(P('d.spill2', () => S().poly([[a[0] + 34, a[1] + 60], [D.x1 + 40, a[1] + 60], [D.x1 + 40, D.floor - 4], [a[0] + 34, D.floor - 4]]).path(1.6, 22)));
    g.save(); g.strokeStyle = O.ditherPattern(g, C.tungstenLow); g.lineWidth = 5; g.stroke(P('d.spill2', () => null)); g.restore();
    // far floor
    g.fillStyle = mix(C.ink, C.soot, 0.5); g.fillRect(D.x0, D.floor, D.x1 - D.x0, BASE - D.floor + 4);
    g.fillStyle = rgba(C.tungstenLow, 0.9); g.fill(P('d.floorspill', () => S().poly([[a[0] - 6, D.floor], [D.x1 + 40, D.floor], [D.x1 + 40, BASE], [a[0] - 40, BASE]]).path(1.2, 23)));
    g.fillStyle = C.ink; g.fillRect(D.x0, D.floor - 5, D.x1 - D.x0, 6);
    const seats = diningSeats(); const chairP = q => PS('d.chair' + q.k, () => chairShape(q), 0.35, 40 + q.k);
    // far and side chairs (behind the table top), then the table, the six places, then the two pushed-in near chairs
    const back = seats.filter(q => q.kind !== 'near').map(chairP);
    g.fillStyle = C.ink; back.forEach(p => g.fill(p)); rimIn(g, back, ld, 1.8, C.tungstenMid);
    // pendant (unlit tonight: the living-room lamp is the light)
    g.fillStyle = C.ink; g.fillRect(D.cx - 1, D.top - 4, 2, 600 - D.top);
    const pend = PS('d.pend', () => S().M(D.cx - 30, 622).C(D.cx - 28, 596, D.cx + 28, 596, D.cx + 30, 622).Z(), 0.4, 30);
    g.fill(pend); rimIn(g, pend, ld, 1.6, C.tungstenMid);
    // the round table: lit top, ink edge, pedestal
    g.fillStyle = C.ink; g.fillRect(D.cx - 8, D.cy + 4, 16, D.floor - D.cy - 6); g.fill(P('d.foot', () => S().ellipse(D.cx, D.floor - 2, 34, 5, 0).path(0.3, 31)));
    g.fill(P('d.edge', () => S().ellipse(D.cx, D.cy + 6, D.rx, D.ry + 1, 0).path(0.5, 32)));
    g.fillStyle = C.tungstenMid; g.fill(P('d.top', () => S().ellipse(D.cx, D.cy, D.rx, D.ry, 0).path(0.5, 33)));
    g.fillStyle = mix(C.tungstenMid, C.tungsten, 0.5); g.fill(P('d.top2', () => S().ellipse(D.cx - 18, D.cy - 2, D.rx * 0.6, D.ry * 0.55, 0).path(0.6, 34)));
    // six places: a plate each, ink-rimmed so they count even on the lit top
    seats.forEach(q => { const rx = 12.5 - 3.5 * Math.abs(q.sx), ry = 3.6;
      g.fillStyle = rgba(C.ink, 0.55); g.beginPath(); g.ellipse(q.plate[0] + 1, q.plate[1] + 1.4, rx + 1.2, ry + 1, 0, 0, 7); g.fill();
      g.fillStyle = C.cardPaper; g.beginPath(); g.ellipse(q.plate[0], q.plate[1], rx, ry, 0, 0, 7); g.fill();
      g.fillStyle = mix(C.cardPaper, C.tungstenMid, 0.35); g.beginPath(); g.ellipse(q.plate[0], q.plate[1] + 0.4, rx * 0.55, ry * 0.5, 0, 0, 7); g.fill(); });
    const near = seats.filter(q => q.kind === 'near').map(chairP);
    g.fillStyle = C.ink; near.forEach(p => g.fill(p)); rimIn(g, near, ld, 1.8, C.tungstenMid);
    g.restore();
    // the opening's frame
    g.fillStyle = C.ink; g.fill(P('d.frame', () => S().rect(D.x0 - 24, D.top - 22, 24, BASE - D.top + 22).add(S().rect(D.x0 - 24, D.top - 22, D.x1 - D.x0 + 48, 22)).add(S().rect(D.x1, D.top - 22, 24, BASE - D.top + 22)).path(0.6, 35)));
  }
  // FG left: the couch, end-on: its arm toward the room (Scott perches on it), the seat and the back running out of frame left
  const FRONT_L = [-600, 640, 460, 1320], FRONT_R = [1480, 440, 2520, 1320];
  function paintWideFrontL(g) {
    const sofaP = PS('w.sofa', () => S().M(-700, 1400).L(-700, 772).C(-640, 748, -480, 748, -440, 778).C(-414, 800, -408, 892, -384, 928)
      .C(-330, 924, -270, 934, -226, 930).C(-180, 926, -130, 934, -96, 932).C(-74, 922, -62, 890, -40, 872).C(60, 846, 160, 850, 214, 890)
      .C(250, 920, 240, 980, 230, 1180).L(226, 1400).Z(), 1, 51);
    g.fillStyle = C.ink; g.fill(sofaP); rimIn(g, sofaP, toLamp(150, 880), 3, C.tungstenMid);
    // the throw folded over the arm in a hurry: a tassel fringe catching the lamp
    g.fillStyle = C.tungstenMid; for (let i = 0; i < 7; i++) { const x = 168 + i * 7, y = 880 + i * 4.6; g.fillRect(x, y, 2, 9); }
  }
  function paintWideFrontR(g) {
    // FG right: the armchair (Angelo sinks into it)
    const chairP = PS('w.chair', () => S().M(1600, 900).L(1770, 560).C(1800, 516, 1880, 520, 1900, 580).L(1960, 640).C(2040, 646, 2130, 660, 2180, 720).L(2230, 1400).L(1560, 1400).L(1556, 950).Z(), 1, 31);
    const armP = PS('w.chairarm', () => S().M(1540, 1400).L(1548, 838).C(1530, 806, 1556, 772, 1600, 772).L(1700, 770).C(1736, 772, 1746, 812, 1724, 836).L(1720, 1400).Z(), 1, 32);
    const seatP = PS('w.chairseat', () => S().M(1700, 842).L(1760, 812).L(1900, 806).L(2100, 820).L(2100, 900).L(1700, 900).Z(), 1, 33);
    g.fillStyle = C.ink; g.fill(chairP); g.fill(seatP);
    g.save(); g.beginPath(); g.rect(FRONT_R[0], FRONT_R[1], FRONT_R[2] - FRONT_R[0], 760 - FRONT_R[1]); g.clip(); rimIn(g, chairP, toLamp(1800, 600), 3, C.tungstenMid); g.restore();
    g.fillStyle = C.ink; g.fill(armP); g.save(); g.beginPath(); g.rect(FRONT_R[0], FRONT_R[1], FRONT_R[2] - FRONT_R[0], 860 - FRONT_R[1]); g.clip(); rimIn(g, armP, toLamp(1640, 780), 3, C.tungsten); g.restore();
  }
  // the coffee table, glasses, bowl, ring, mats: per frame (state changes)
  function glassPath(x, y, s) {
    return P('w.glass:' + x + ':' + y + ':' + s, () => {
      const sh = S(), k = s;
      sh.M(x - 15 * k, y - 66 * k).L(x + 15 * k, y - 66 * k).C(x + 16 * k, y - 46 * k, x + 12 * k, y - 30 * k, x + 2.4 * k, y - 26 * k).L(x + 2.4 * k, y - 6 * k).L(x + 12 * k, y - 1 * k).L(x + 12 * k, y + 1 * k)
        .L(x - 12 * k, y + 1 * k).L(x - 12 * k, y - 1 * k).L(x - 2.4 * k, y - 6 * k).L(x - 2.4 * k, y - 26 * k).C(x - 12 * k, y - 30 * k, x - 16 * k, y - 46 * k, x - 15 * k, y - 66 * k).Z();
      return sh.path(0.35, 90 + Math.round(x) % 17);
    });
  }
  // a wine glass, side view (F04): foot at (x, y), s scale, fill 0..1; o.shimmer (px) for the walla, o.mat (stands on a coaster)
  function glassSide(g, em, x, y, s, fill, light, o) {
    o = o || {}; s = s || 1; const p = glassPath(Math.round(x), Math.round(y), s);
    const d = light ? norm(light[0] - x, light[1] - (y - 40 * s)) : toLamp(x, y - 40);
    inkRim(g, p, d, 1.6 * s, C.tungstenMid);
    if (fill > 0) {
      const wy = y - 30 * s - fill * 30 * s + (o.shimmer || 0);
      g.save(); g.clip(p);
      g.fillStyle = C.wine; g.fillRect(x - 17 * s, wy, 34 * s, y - 26 * s - wy); g.fillStyle = C.blood; g.fillRect(x - 17 * s, wy + (y - 26 * s - wy) * 0.55, 34 * s, 40 * s);
      g.fillStyle = mix(C.wine, C.tungsten, 0.45); g.fillRect(x - 17 * s, wy, 34 * s, 2);
      g.restore();
    }
    const sd = d[0] > 0 ? 1 : -1; g.fillStyle = C.cardPaper; g.globalAlpha = 0.9;
    g.fill(P('w.glint:' + Math.round(x) + ':' + Math.round(y) + ':' + sd + ':' + s, () => S().capsule(x + sd * 10 * s, y - 60 * s, 1.4 * s, x + sd * 11 * s, y - 42 * s, 1.0 * s).path(0, 1))); g.globalAlpha = 1;
    if (em) { em.fillStyle = C.tungsten; em.beginPath(); em.arc(x + sd * 10 * s, y - 52 * s, 6 * s, 0, 7); em.fill(); }
    if (o.mat) { g.fillStyle = C.cardPaper; g.fillRect(x - 17 * s, y + 1, 34 * s, 2.4); }
  }
  // glasses state -> [{x, fill, mat}] (null where a glass has been picked up)
  function glassList(s) {
    s = s || {}; const xs = (s.glassX || WD.glassX), def = WD.fills; let G = s.glasses;
    const fillOf = i => s.fill == null ? def[i] : Array.isArray(s.fill) ? (s.fill[i] == null ? def[i] : s.fill[i]) : s.fill;
    if (G == null) G = 6;
    if (typeof G === 'number') return xs.map((x, i) => i < G ? { x, fill: fillOf(i), mat: (s.mats || []).includes(i) } : null);
    return xs.map((x, i) => { const v = G[i]; if (v == null || v === false) return null; if (typeof v === 'object') return Object.assign({ x, fill: fillOf(i), mat: (s.mats || []).includes(i) }, v); return { x, fill: typeof v === 'number' ? v : fillOf(i), mat: (s.mats || []).includes(i) }; });
  }
  function drawWideTable(c, t, s) {
    const g = c.g, em = c.em, T = WD.TBL;
    g.fillStyle = C.tungstenMid; g.fill(P('w.ttop', () => S().poly([[T.x0 + 18, T.top - T.depth], [T.x1 - 18, T.top - T.depth], [T.x1, T.top], [T.x0, T.top]]).path(0.5, 41)));
    g.fillStyle = C.tungsten; g.fill(P('w.thot', () => S().ellipse(WD.LAMP.x, T.top - T.depth / 2, 300, 8, 0).path(0.8, 43)));
    g.fillStyle = C.ink; g.fill(P('w.trunk', () => S().rect(T.x0, T.top, T.x1 - T.x0, 14).add(S().rect(T.x0 + 10, T.top + 10, T.x1 - T.x0 - 20, T.leg - T.top - 18))
      .add(S().rect(T.x0 + 14, T.leg - 10, 26, 14)).add(S().rect(T.x1 - 40, T.leg - 10, 26, 14)).path(0.6, 42)));
    g.fillStyle = C.tungstenLow; g.fillRect(T.x0 + 12, T.top + 16, T.x1 - T.x0 - 24, 2);
    g.fillStyle = mix(C.ink, C.soot, 0.6); [T.x0 + 120, T.x1 - 140].forEach(x => g.fillRect(x, T.top + 22, 16, T.leg - T.top - 34));
    // the wine ring (Marina wipes it: s.ring 1 -> 0)
    const ring = s.ring == null ? 0 : s.ring;
    if (ring > 0) { g.save(); g.globalAlpha = ring; g.strokeStyle = C.wine; g.lineWidth = 2.5; g.beginPath(); g.ellipse(WD.ring[0], T.top - 8, 15, 3.4, 0, 0.3, Math.PI * 2 - 0.4); g.stroke(); g.restore(); }
    // a stack of beer mats at the end (Scott's coasters)
    const nm = s.matStack == null ? 4 : s.matStack;
    for (let i = 0; i < nm; i++) { g.fillStyle = i % 2 ? mix(C.cardPaper, C.tungstenMid, 0.4) : C.cardPaper; g.fillRect(WD.mats[0] - 16 + (i % 2) * 2, WD.mats[1] - 3 - i * 2.2, 32, 2.2); }
    if (s.bowlOn !== false) bowlSmall(g, WD.bowl[0], WD.bowl[1], 0.9, s.bowl == null ? 1 : s.bowl);
    if (s.bagOnTable) { g.save(); g.translate(1225, T.top - 13); g.rotate(-0.08); const bp = P('w.bagflat', () => S().M(-30, -6).C(-10, -12, 14, -12, 30, -7).L(34, 4).L(-34, 5).Z().path(0.6, 44)); inkRim(g, bp, [0, -1], 1.5, C.tungsten); g.fillStyle = C.cardPaper; g.fillRect(28, -6, 3, 9); g.restore(); }
    const walla = clamp(s.walla || 0, 0, 1);
    glassList(s).forEach((q, i) => { if (!q) return; const sh = walla ? Math.sin(t * 11 + i * 1.7) * 0.7 * walla : 0; glassSide(g, em, q.x, T.top - T.depth * 0.45, 1, q.fill, null, { shimmer: sh, mat: q.mat }); });
  }
  // dust turning in a light. The full count is always drawn: the walla (room loudness) only sets how many are bright and adds
  // a bounded quick jitter, so a ramp or a sudden cut never makes a mote jump. Motes fade out at the box edges where they wrap.
  function dust(c, t, s, box, n, seed, color) {
    const g = c.g, r = O.rng(seed), w = clamp(s.walla || 0, 0, 1);
    g.save(); g.fillStyle = color || C.cardPaper;
    for (let i = 0; i < n; i++) {
      const bx = r(), by = r(), ph = r() * 100, a = 0.2 + r() * 0.45, sz = 0.8 + r() * 1.6, vx = (r() - 0.35) * 9, vy = -(2 + r() * 5), rank = r(), hf = 2.6 + r() * 2.2;
      const jx = w * (5 * Math.sin(t * hf + ph * 1.3) + 2.5 * Math.sin(t * hf * 2.3 + ph)), jy = w * (4 * Math.cos(t * hf * 1.1 + ph * 0.7));
      const ux = (((bx * box[2] + Math.sin(t * 0.3 + ph) * 18 + t * vx + jx) % box[2]) + box[2]) % box[2];
      const uy = (((by * box[3] + Math.cos(t * 0.23 + ph) * 14 + t * vy + jy) % box[3]) + box[3]) % box[3];
      const edge = Math.min(1, 8 * Math.min(ux / box[2], 1 - ux / box[2]), 8 * Math.min(uy / box[3], 1 - uy / box[3]));
      const loud = rank < 0.55 ? 0.55 + 0.45 * w : clamp((w - (rank - 0.55) * 1.6) * 2.2, 0, 1);
      const al = a * (0.5 + 0.5 * Math.sin(t * 0.8 + ph)) * edge * loud; if (al < 0.01) continue;
      g.globalAlpha = al; g.fillRect(box[0] + ux, box[1] + uy, sz, sz);
    }
    g.restore();
  }
  // ---- wet footprints from the hall doorway into the room (Q04: 'Somebody's left wet footprints by the door')
  const SOLE = {
    heel: () => S().M(0.0, -0.032).C(0.06, -0.05, 0.13, -0.042, 0.15, -0.004).C(0.14, 0.036, 0.07, 0.044, 0.0, 0.028).C(-0.018, 0.012, -0.018, -0.016, 0.0, -0.032).Z().add(S().ellipse(-0.11, 0.004, 0.02, 0.018, 0)),
    shoe: () => S().M(0.0, -0.044).C(0.07, -0.06, 0.15, -0.052, 0.17, -0.004).C(0.155, 0.05, 0.07, 0.058, 0.0, 0.04).C(-0.024, 0.016, -0.024, -0.02, 0.0, -0.044).Z()
      .add(S().M(-0.075, -0.034).C(-0.11, -0.04, -0.15, -0.028, -0.15, 0.002).C(-0.15, 0.03, -0.11, 0.04, -0.075, 0.032).C(-0.064, 0.012, -0.064, -0.014, -0.075, -0.034).Z()),
  };
  SOLE.big = () => SOLE.shoe().scale(1.12, 1.1);
  // trails in wide-world px on the floor (they all start on the hall threshold)
  const TRAILS = [
    { kind: 'heel', pts: [[-372, 878], [-150, 896], [90, 908], [330, 917], [540, 924]] },
    { kind: 'shoe', pts: [[-318, 884], [-110, 906], [130, 926], [350, 944]] },
    { kind: 'big', pts: [[-280, 880], [-60, 893], [180, 900], [380, 902]] },
  ];
  let PRINTS = null;
  function prints() {
    if (PRINTS) return PRINTS; PRINTS = [];
    TRAILS.forEach((T, ti) => {
      let acc = 0, side = ti % 2 ? 1 : -1; const stride = 74;
      for (let i = 0; i < T.pts.length - 1; i++) {
        const [x0, y0] = T.pts[i], [x1, y1] = T.pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
        while (acc <= L) {
          const u = acc / L, x = lerp(x0, x1, u), y = lerp(y0, y1, u) + side * 3.2;
          const k = 118 + (y - 872) * 1.6, fy = 0.24 + (y - 872) * 0.0028;            // px per metre and the floor's squash, deeper = smaller
          const total = PRINTS.filter(p => p.ti === ti).length;
          PRINTS.push({ ti, kind: T.kind, x, y, k, fy, ang: Math.atan2(Math.sin(ang) / Math.max(0.2, fy), Math.cos(ang)), wet: 1 - 0.07 * total, n: total });
          side = -side; acc += stride;
        }
        acc -= L;
      }
    });
    return PRINTS;
  }
  function drawPrints(c, s) {
    const amt = s.prints === true ? 1 : clamp(+s.prints || 0, 0, 1); if (amt <= 0) return;
    const g = c.g, dry = 1 - 0.75 * clamp(s.printsDry || 0, 0, 1);
    prints().forEach((p, j) => {
      const a = p.wet * amt * dry; if (a < 0.02) return;
      const path = P('w.print' + j, () => SOLE[p.kind]().transform([Math.cos(p.ang), Math.sin(p.ang), -Math.sin(p.ang), Math.cos(p.ang), 0, 0]).transform([p.k, 0, 0, p.k * p.fy, p.x, p.y]).path(0.12, 3 + j));
      g.save(); g.fillStyle = rgba(C.ink, 0.6 * a); g.fill(path);
      // the wet toe catches the lamp
      const d = toLamp(p.x, p.y), tx = p.x + Math.cos(p.ang) * p.k * 0.12, ty = p.y + Math.sin(p.ang) * p.k * p.fy * 0.12 - 1.5;
      g.globalAlpha = 0.85 * a; g.strokeStyle = C.tungsten; g.lineWidth = 1.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(tx - 5 * Math.abs(d[1]), ty); g.lineTo(tx + 4, ty - 1.5); g.stroke(); g.restore();
    });
  }

  // ================================================================== CRISPS insert
  const CR = { back: 600, bowl: { x: 1080, y: 676, rx: 206, ry: 46, depth: 118 }, lamp: { x: 1660, top: 40, bot: 170, wt: 120, wb: 250 }, mouth: [742, 452] };
  const CR_L = [CR.lamp.x, 140];
  const crLight = (x, y) => norm(CR_L[0] - x, CR_L[1] - y);
  function paintCrispsBack(g) {
    const bw = CR.bowl, L = CR.lamp, E = EXT.crisps;
    fillExt(g, E, C.ink);
    g.save(); g.beginPath(); g.rect(E[0], E[1], E[2] - E[0], CR.back - E[1]); g.clip();
    pool(g, 'c.wall', L.x - 60, 300, [{ r: 1300, color: mix(C.tungstenLow, C.ink, 0.3) }, { r: 860, color: C.tungstenLow }, { r: 480, color: C.tungstenMid }], { sy: 0.62, seed: 5, rough: 6 });
    g.fillStyle = C.ink; g.fillRect(L.x - 6, L.bot, 12, CR.back - L.bot);
    g.restore();
    // the coffee table top: one plane, the lamp's pool printed on it in three bands
    g.save(); g.beginPath(); g.rect(E[0], CR.back, E[2] - E[0], E[3] - CR.back); g.clip();
    g.fillStyle = C.tungstenLow; g.fillRect(E[0], CR.back, E[2] - E[0], E[3] - CR.back);
    pool(g, 'c.table', 1420, 720, [{ r: 1350, color: C.tungstenLow }, { r: 900, color: C.tungstenMid }, { r: 470, color: C.tungsten }], { sy: 0.3, seed: 9, rough: 2.4 });
    g.strokeStyle = rgba(C.ink, 0.32); g.lineWidth = 2; [[648, 0.002], [726, 0.004], [850, 0.006], [1030, 0.01]].forEach(([y], i) => { g.beginPath(); g.moveTo(E[0], y - 6 + i * 2); g.lineTo(E[2], y + 4 - i * 2); g.stroke(); });
    g.fillStyle = rgba(C.ink, 0.55); g.fill(P('c.bshadow', () => S().ellipse(bw.x - 150, bw.y + bw.depth + 26, bw.rx * 1.05, 46, -0.08).path(2, 14)));
    g.restore();
    g.fillStyle = C.ink; g.fillRect(E[0], CR.back - 4, E[2] - E[0], 5);
    g.fillStyle = C.tungsten; g.fillRect(E[0], CR.back + 1, E[2] - E[0], 2);
    // the lamp: the shade glowing top right (saturated, with F04's hot core)
    const shP = P('c.shade', () => S().M(L.x - L.wt / 2, L.top).L(L.x + L.wt / 2, L.top).L(L.x + L.wb / 2, L.bot).L(L.x - L.wb / 2, L.bot).Z().path(0.8, 3));
    g.fillStyle = C.tungsten; g.fill(shP); g.save(); g.clip(shP); g.fillStyle = WARM; g.fill(P('c.shcore', () => S().ellipse(L.x, L.bot + 34, 64, 104, 0).path(1, 4))); g.restore();
    g.fillStyle = C.ink; g.fillRect(L.x - L.wb / 2 - 3, L.bot - 3, L.wb + 6, 6); g.fillRect(L.x - L.wt / 2 - 3, L.top - 4, L.wt + 6, 6);
    const body = bowlBodyP(); g.fillStyle = C.ink; g.fill(body); rimIn(g, body, crLight(bw.x + bw.rx, bw.y), 4, C.tungstenMid);
    g.fillStyle = C.soot; g.fill(P('c.rimin', () => S().ellipse(bw.x, bw.y, bw.rx - 8, bw.ry - 5, 0).path(0.6, 16)));
    g.save(); g.clip(P('c.rimin', () => null)); g.fillStyle = mix(C.soot, C.tungstenLow, 0.6); g.beginPath(); g.ellipse(bw.x - 30, bw.y + 34, bw.rx * 0.9, bw.ry, 0, 0, 7); g.fill(); g.restore();
  }
  const bowlBodyP = () => PS('c.body', () => { const b = CR.bowl; return S().M(b.x - b.rx, b.y).C(b.x - b.rx + 10, b.y + b.depth * 0.7, b.x - b.rx * 0.5, b.y + b.depth, b.x - b.rx * 0.36, b.y + b.depth + 4)
    .L(b.x + b.rx * 0.36, b.y + b.depth + 4).C(b.x + b.rx * 0.5, b.y + b.depth, b.x + b.rx - 10, b.y + b.depth * 0.7, b.x + b.rx, b.y).Z().add(S().ellipse(b.x, b.y, b.rx, b.ry, 0)); }, 0.8, 15);
  const lipP = () => P('c.lip', () => { const b = CR.bowl, sh = S(); const n = 40; sh.M(b.x - b.rx, b.y);
    for (let i = 0; i <= n; i++) { const a = Math.PI - Math.PI * i / n; sh.L(b.x + Math.cos(a) * b.rx, b.y + Math.sin(a) * b.ry); }
    for (let i = n; i >= 0; i--) { const a = Math.PI - Math.PI * i / n; sh.L(b.x + Math.cos(a) * (b.rx - 9), b.y + Math.sin(a) * (b.ry - 6)); } return sh.Z().path(0.5, 17); });
  let HEAP = null;
  function heap() {
    if (HEAP) return HEAP; const b = CR.bowl, r = O.rng('heap'), out = [];
    for (let i = 0; i < 90; i++) { const u = i / 90; const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * (1 - u * 0.55);
      out.push({ x: b.x + Math.cos(a) * rr * (b.rx - 40), yb: b.y + Math.sin(a) * rr * (b.ry - 10), lift: u, rot: r() * 6.3, s: 54 + r() * 22, flip: (0.3 + r() * 0.4) * (r() < 0.18 ? -1 : 1), shape: i % 7 }); }
    return (HEAP = out);
  }
  function drawHeap(g, fill) {
    const b = CR.bowl, H0 = heap(), n = Math.round(clamp(fill, 0, 1) * H0.length); if (!n) return;
    const mound = 74 * clamp(fill, 0, 1);
    g.save(); const cl = new Path2D(); cl.ellipse(b.x, b.y, b.rx - 6, b.ry - 3, 0, 0, Math.PI * 2); cl.rect(b.x - b.rx + 6, b.y - 200, 2 * b.rx - 12, 200); g.clip(cl);
    const list = H0.slice(0, n).map(k => Object.assign({}, k, { y: k.yb - mound * (0.25 + 0.75 * k.lift) * (1 - Math.pow((k.x - b.x) / b.rx, 2)) })).sort((p, q) => p.yb - q.yb);
    list.forEach(k => crisp(g, k, crLight(k.x, k.y)));
    g.restore();
  }
  function drawCrispsView(c, t, s) {
    const g = c.g, em = c.em, b = CR.bowl;
    layer(c, 'crisps.back', paintCrispsBack, EXT.crisps);
    // bloom held to the shade: its hot core and a thin band under the mouth (no soft smear across the wall)
    const L = CR.lamp; em.save(); em.globalAlpha = 0.55; em.fillStyle = C.tungsten; em.fill(P('c.shade', () => null));
    em.globalAlpha = 0.6; em.fillStyle = WARM; em.beginPath(); em.ellipse(L.x, L.bot - 22, 52, 66, 0, 0, 7); em.fill();
    em.globalAlpha = 0.7; em.beginPath(); em.ellipse(L.x, L.bot + 4, L.wb * 0.5, 16, 0, 0, 7); em.fill(); em.restore();
    drawHeap(g, s.bowl == null ? 0.85 : s.bowl);
    g.fillStyle = C.ink; g.fill(lipP()); g.save(); g.strokeStyle = C.tungsten; g.lineWidth = 2.5; g.beginPath(); g.ellipse(b.x, b.y, b.rx - 1, b.ry - 1, 0, -0.1, 1.15); g.stroke();
    g.strokeStyle = C.tungstenMid; g.beginPath(); g.ellipse(b.x, b.y, b.rx - 1, b.ry - 1, 0, -1.4, -0.1); g.stroke(); g.restore();
    const list = s.crisps || [];
    list.forEach(k => { if (k.phase === 'rest' || k.onTable) { g.save(); g.globalAlpha = 0.5; g.fillStyle = C.ink; g.beginPath(); g.ellipse(k.x - 8, k.y + 6, (k.s || 24) * 0.42, (k.s || 24) * 0.16, 0, 0, 7); g.fill(); g.restore(); } });
    list.forEach(k => { if (k.phase === 'rest' || k.onTable) crisp(g, k, crLight(k.x, k.y)); });
    if (s.bag !== null) { const bg = s.bag || { x: CR.mouth[0], y: CR.mouth[1], rot: 0.95, s: 1 }; bag(g, bg.x, bg.y, bg.rot, bg.s || 1, crLight(bg.x, bg.y), em); }
    list.forEach(k => { if (!(k.phase === 'rest' || k.onTable) && k.phase !== 'gone') crisp(g, k, crLight(k.x, k.y)); });
    dust(c, t, s, [1150, 160, 700, 420], 28, 'cdust', C.cardPaper);
  }
  // ---- the crisps plan (Q02). P = SETS.living.pour({...}); st = P.at(t) -> {crisps, bowl, bag, hand, grip, handA, ...}
  //   mode 'pour'  (default): the bag is tipped and shaken over the bowl (hand = the grip on the bag, grip 'bag').
  //   mode 'scoop': the bag stands open on the lid; the hand dips in, comes out with a handful, opens over the bowl, `scoops` times.
  function pour(o) {
    o = Object.assign({ mode: 'pour', seed: 'q02', n: 18, t0: 0.6, t1: 2.4, miss: 0.5, bowl0: 0.35, bowl1: 0.85, mouth: CR.mouth, picks: 'auto', pickT0: 3.6, pickGap: 0.6, pickDur: 0.55,
      g: 2600, scoops: 3, scoopBag: null, rest: [470, 120] }, o || {});
    const scoop = o.mode === 'scoop';
    const r = O.rng('pour:' + o.seed + (scoop ? ':scoop' : '')), b = CR.bowl, out = [];
    const misses = []; for (let i = 0; i < o.n; i++) misses.push(i < Math.round(o.n * o.miss)); for (let i = o.n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const q = misses[i]; misses[i] = misses[j]; misses[j] = q; }
    // scoop geometry
    const SB = o.scoopBag || { x: 652, y: 470, rot: -Math.PI / 2 + 0.24, s: 0.86 };
    const nS = scoop ? Math.max(1, Math.round(o.scoops)) : 0, D = scoop ? (o.t1 - o.t0) / nS : 0;
    const inBag = scoop ? bagPt(SB, -78, 6) : null, mouthTop = scoop ? bagPt(SB, 30, 0) : null;
    const over = j => [b.x - 60 + 60 * (j % 3), b.y - 210 - 14 * (j % 2)];
    const relT = j => o.t0 + j * D + 0.8 * D;
    let mi = 0;
    for (let i = 0; i < o.n; i++) {
      const k = { i, miss: misses[i], s: 44 + r() * 16, shape: Math.floor(r() * 7), spin: (r() - 0.5) * 14, tumble: 6 + r() * 9, ph: r() * 6, rot0: r() * 6.3 };
      if (scoop) { k.j = i % nS; const q = Math.floor(i / nS); k.te = relT(k.j) + q * 0.03; const h = over(k.j); k.hx = (r() - 0.5) * 56; k.hy = 18 + (r() - 0.5) * 26; k.x0 = h[0] + k.hx; k.y0 = h[1] + k.hy; }
      else { k.te = o.t0 + (o.t1 - o.t0) * (i + 0.15 + r() * 0.7) / o.n; k.x0 = o.mouth[0] + 10 + (r() - 0.5) * 30; k.y0 = o.mouth[1] + 30 + (r() - 0.5) * 50; }
      if (!k.miss) { k.lx = b.x + (r() - (scoop ? 0.5 : 0.6)) * b.rx * 1.2; k.ly = b.y - 10 - r() * 20; k.T = scoop ? 0.26 + r() * 0.08 : 0.36 + r() * 0.1; }
      else {
        k.mi = mi++; const rim = r() < 0.4;
        if (scoop) { const side = r() < 0.5 ? -1 : 1; k.lx = b.x + side * (b.rx + 24 + r() * 230); k.ly = b.y + 70 + r() * 170;
          if (r() < 0.3) { k.lx = b.x + (r() - 0.5) * b.rx * 1.4; k.ly = b.y + b.depth + 60 + r() * 120; } k.T = 0.3 + r() * 0.1; if (rim) { k.rim = [b.x + side * b.rx * (0.75 + r() * 0.25), b.y - 4]; k.T = 0.24 + r() * 0.05; k.T1 = 0.3 + r() * 0.06; } }
        else { k.lx = b.x - b.rx - 30 - r() * 300; k.ly = b.y + 80 + r() * 190; if (r() < 0.3) { k.lx = b.x - b.rx * 0.6 + r() * b.rx * 1.3; k.ly = b.y + b.depth + 60 + r() * 120; }
          k.T = 0.38 + r() * 0.14; if (rim) { k.rim = [b.x - b.rx * (0.7 + r() * 0.3), b.y - 4]; k.T1 = 0.3 + r() * 0.06; } }
        k.slide = [(r() - 0.6) * 26, (r() - 0.2) * 10];
      }
      out.push(k);
    }
    const missed = out.filter(k => k.miss).sort((p, q) => p.lx - q.lx);   // Scott picks them up left to right
    const picks = o.picks === 'auto' ? missed.map((k, j) => ({ k, t: o.pickT0 + j * o.pickGap, dur: o.pickDur })) : (o.picks || []).map(p => ({ k: missed[p.i], t: p.t, dur: p.dur || o.pickDur }));
    picks.forEach(p => { p.k.pick = p; });
    const flight = (k, t, xa, ya, xb, yb, T) => { const u = (t) / T; const vy = (yb - ya - 0.5 * o.g * T * T) / T; return [lerp(xa, xb, u), ya + vy * t + 0.5 * o.g * t * t]; };
    // the scooping hand (on twos): where its knuckles are, what it is doing, the way the fingers point
    function scoopHand(t) {
      const tt = twos(t), tEnd = o.t0 + nS * D;
      if (tt < o.t0 - 0.35 || tt > tEnd + 0.5) return null;
      if (tt < o.t0) { const u = sm(seg(tt, o.t0 - 0.35, o.t0)); return { hand: [lerp(o.rest[0], mouthTop[0], u), lerp(o.rest[1], mouthTop[1] - 40, u)], grip: 'reach', handA: 1.2 }; }
      if (tt >= tEnd) { const u = sm(seg(tt, tEnd, tEnd + 0.5)), h = over(nS - 1); return { hand: [lerp(h[0], o.rest[0], u), lerp(h[1], o.rest[1], u)], grip: 'return', handA: lerp(1.6, 1.2, u) }; }
      const j = Math.min(nS - 1, Math.floor((tt - o.t0) / D)), u = (tt - o.t0 - j * D) / D, from = j ? over(j - 1) : [mouthTop[0], mouthTop[1] - 40], to = over(j);
      if (u < 0.3) { const v = sm(u / 0.3); return { hand: [lerp(from[0], inBag[0], v), lerp(from[1], inBag[1], v) - Math.sin(Math.PI * v) * 50], grip: 'reach', handA: 1.25 }; }
      if (u < 0.42) { const v = (u - 0.3) / 0.12; return { hand: [inBag[0] + Math.sin(v * 9) * 7, inBag[1] + Math.sin(v * 13) * 5], grip: 'scoop', handA: 1.3 }; }
      if (u < 0.78) { const v = sm((u - 0.42) / 0.36); return { hand: [lerp(inBag[0], to[0], v), lerp(inBag[1], to[1], v) - Math.sin(Math.PI * v) * 120], grip: 'carry', handA: 1.45 }; }
      if (u < 0.88) return { hand: to.slice(), grip: 'release', handA: 1.6 };
      return { hand: [to[0] - 10, to[1] - 14], grip: 'release', handA: 1.6 };
    }
    function at(t) {
      const list = []; let inBowl = 0, hand = null, grip = null, handA = null;
      const sh = scoop ? scoopHand(t) : null; if (sh) { hand = sh.hand; grip = sh.grip; handA = sh.handA; }
      for (const k of out) {
        if (scoop) {                                                 // in the fist: from the grab until the release
          const tg = o.t0 + k.j * D + 0.36 * D;
          if (t >= tg && t < k.te) { if (t < tg + 0.06 * D) continue; if (sh) list.push({ x: sh.hand[0] + k.hx * 0.45, y: sh.hand[1] + k.hy * 0.5, rot: k.rot0, s: k.s * 0.9, flip: 0.7, shape: k.shape, phase: 'held' }); continue; }
        }
        const dt = t - k.te; if (dt < 0) continue;
        const spin = k.rot0 + k.spin * Math.min(dt, k.T + (k.T1 || 0)); const flip = Math.cos(k.ph + k.tumble * Math.min(dt, k.T + (k.T1 || 0)));
        if (!k.miss) { if (dt < k.T) { const [x, y] = flight(k, dt, k.x0, k.y0, k.lx, k.ly, k.T); list.push({ x, y, rot: spin, s: k.s, flip, shape: k.shape, phase: 'air' }); } else inBowl++; continue; }
        // missed: (rim bounce) -> table -> a hop and a slide -> rest -> (picked up -> into the bowl)
        let x, y, phase = 'air', f = flip, rot = spin;
        const Tl = k.T + (k.T1 || 0);
        if (k.rim && dt < k.T) [x, y] = flight(k, dt, k.x0, k.y0, k.rim[0], k.rim[1], k.T);
        else if (k.rim && dt < Tl) [x, y] = flight(k, dt - k.T, k.rim[0], k.rim[1], k.lx, k.ly, k.T1);
        else if (!k.rim && dt < k.T) [x, y] = flight(k, dt, k.x0, k.y0, k.lx, k.ly, k.T);
        else {
          const u = seg(dt, Tl, Tl + 0.2); x = k.lx + k.slide[0] * sm(u); y = k.ly + k.slide[1] * sm(u) - Math.sin(Math.PI * Math.min(1, u * 1.6)) * 16 * (1 - u);
          phase = u < 1 ? 'air' : 'rest'; f = 0.55 + 0.25 * Math.sign(flip || 1); if (u >= 1) f = Math.abs(f);
        }
        const p = k.pick;
        if (p && t >= p.t) {
          const tt = twos(t);                                  // in Scott's fingers: on twos
          const u = seg(tt, p.t, p.t + p.dur); const rx = k.lx + k.slide[0], ry = k.ly + k.slide[1];
          if (u < 0.35) { hand = [rx, ry]; grip = 'reach'; handA = 2.45; }
          else if (u < 0.8) { const v = sm(seg(u, 0.35, 0.8)); x = lerp(rx, b.x + (k.mi % 3 - 1) * 50, v); y = lerp(ry, b.y - 120, v) - Math.sin(Math.PI * v) * 90; phase = 'held'; rot = spin + v * 1.5; f = 0.8; hand = [x, y]; grip = 'held'; handA = 2.45; }
          else if (u < 1) { const v = seg(u, 0.8, 1); x = b.x + (k.mi % 3 - 1) * 50; y = b.y - 120 + 110 * v * v; phase = 'air'; rot = spin + 1.5 + v * 2; f = Math.cos(v * 5); hand = [x, b.y - 140]; grip = 'drop'; handA = 2.45; }
          else { inBowl++; continue; }
        }
        list.push({ x, y, rot, s: k.s, flip: f, shape: k.shape, phase, onTable: phase === 'rest' });
      }
      const bowl = clamp(o.bowl0 + (o.bowl1 - o.bowl0) * inBowl / o.n, 0, 1);
      let bagS;
      if (scoop) { const rum = sh && sh.grip === 'scoop' ? Math.sin(twos(t) * 40) * 0.025 : 0; bagS = Object.assign({}, SB, { rot: SB.rot + rum }); }
      else {
        // the bag: tipped for the pour, shaken on twos, then set down; the hand holds it by the shoulder
        const tw = twos(t); const tip = seg(tw, o.t0 - 0.5, o.t0) - seg(tw, o.t1, o.t1 + 0.5);
        const shake = tip > 0.5 ? Math.sin(tw * 2 * Math.PI * 5) * 6 : 0;
        bagS = { x: o.mouth[0] + shake * 0.6, y: o.mouth[1] - 40 * (1 - tip) + shake, rot: lerp(-0.5, 0.95, sm(clamp(tip, 0, 1))), s: 1 };
        if (tip > 0 && !hand) { const m = bagFrame(bagS, -230, -150, 0, 1); hand = [m[4], m[5]]; grip = 'bag'; handA = bagS.rot + Math.PI / 2; }
      }
      return { crisps: list, bowl, bag: bagS, hand, grip, handA, picked: picks.filter(p => t >= p.t + p.dur).length, misses: missed.length, mode: o.mode };
    }
    return { at, list: out, picks, missed, mode: o.mode, end: picks.length ? Math.max(...picks.map(p => p.t + p.dur)) : o.t1 };
  }

  // ================================================================== GLASSES insert (the match cut to the title)
  const GL = { floor: 884, H: 340, cx: [169, 738, 1005, 1147, 1317, 1610], light: [1500, -400] };
  function barCx() { try { if (SETS.title && SETS.title.layout) return SETS.title.layout().bars.map(b => b.cx); } catch (e) { } return GL.cx; }
  function paintGlassesBack(g) {
    const E = EXT.glasses;
    fillExt(g, E, C.tungstenLow);
    if (SETS.title && SETS.title.drawField) SETS.title.drawField(g);
    else pool(g, 'g.f', 1290, 560, [{ r: 1260, color: C.tungstenMid }, { r: 1120, color: C.tungsten }], { sy: 1.2, rough: 2.4 });
    g.fillStyle = C.ink; g.fill(P('g.floor', () => S().poly([[E[0], GL.floor + 2], [E[2], GL.floor - 3], [E[2], E[3]], [E[0], E[3]]]).path(1.6, 31)));
    g.fillStyle = C.tungstenMid; g.fill(P('g.lip', () => S().poly([[E[0], GL.floor - 1], [E[2], GL.floor - 6], [E[2], GL.floor - 2], [E[0], GL.floor + 3]]).path(0.6, 32)));
  }
  function glassBig(x, y, h) {
    return P('g.big:' + Math.round(x) + ':' + h, () => {
      const r = h * 0.19, sh = S(); const bw = y - h * 0.48, st = h * 0.022, ft = h * 0.17;
      sh.M(x - r, y - h).L(x + r, y - h).C(x + r * 1.06, y - h * 0.78, x + r * 0.72, y - h * 0.56, x + st * 1.4, bw).L(x + st, y - h * 0.08).C(x + st, y - h * 0.03, x + ft * 0.6, y - h * 0.02, x + ft, y - 2).L(x + ft, y + 2)
        .L(x - ft, y + 2).L(x - ft, y - 2).C(x - ft * 0.6, y - h * 0.02, x - st, y - h * 0.03, x - st, y - h * 0.08).L(x - st * 1.4, bw).C(x - r * 0.72, y - h * 0.56, x - r * 1.06, y - h * 0.78, x - r, y - h).Z();
      return sh.path(0.9, 80 + Math.round(x) % 11);
    });
  }
  function drawGlassesView(c, t, s) {
    const g = c.g, em = c.em;
    layer(c, 'glasses.back', paintGlassesBack, EXT.glasses);
    const xs = s.glassX || barCx(), h = s.glassH || GL.H, y = GL.floor - 1;
    const light = GL.light; const fills = s.fill == null ? 0 : s.fill;
    const n = s.glasses == null ? 6 : s.glasses;
    xs.forEach((x, i) => {
      if (i >= n) return;
      const p = glassBig(x, y, h); const d = norm(light[0] - x, light[1] - (y - h * 0.7));
      inkRim(g, p, d, 3, C.tungsten);
      const r = h * 0.19, f = Array.isArray(fills) ? (fills[i] || 0) : fills;
      g.save(); g.clip(p);
      if (f > 0) { const wy = y - h * 0.5 - f * h * 0.42; g.fillStyle = C.wine; g.fillRect(x - r * 1.2, wy, r * 2.4, y - h * 0.46 - wy); g.fillStyle = C.blood; g.fillRect(x - r * 1.2, wy + (y - h * 0.46 - wy) * 0.6, r * 2.4, h * 0.3); g.fillStyle = mix(C.wine, C.tungsten, 0.45); g.fillRect(x - r * 1.2, wy, r * 2.4, 3); }
      g.fillStyle = rgba(C.tungstenMid, 0.55); g.beginPath(); g.ellipse(x - r * 0.62, y - h * 0.76, r * 0.12, h * 0.17, 0.06, 0, 7); g.fill();
      g.restore();
      g.fillStyle = C.cardPaper; g.globalAlpha = 0.85; g.fill(P('g.streak:' + Math.round(x) + ':' + h, () => S().capsule(x + r * 0.62, y - h * 0.94, 2.4, x + r * 0.7, y - h * 0.64, 1.6).path(0, 1))); g.globalAlpha = 1;
      // the count: a hard ivory sliver runs along the rim's lit edge and down the bowl's shoulder (+ an emissive ping)
      const gl = s.glints ? (s.glints[i] || 0) : 0;
      if (gl > 0.01) {
        const sl = P('g.sliver:' + Math.round(x) + ':' + h, () => {
          const sh = S(); const top = y - h; const pts = [];
          for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push([x - r * 0.15 + r * 1.14 * u, top + 1.2 + 1.6 * u * u]); }
          for (let k = 1; k <= 8; k++) { const u = k / 8; pts.push([x + r * 0.99 + r * 0.07 * Math.sin(u * 2.4), top + 3 + h * 0.2 * u]); }
          const L2 = pts.map(([px, py], k) => { const w = k < 11 ? 1 + 4.6 * Math.sin(Math.PI * Math.min(1, k / 10 + 0.2)) : 4.4 * (1 - (k - 10) / 8.5); return [px, py, w]; });
          const left = L2.map(([px, py, w], k) => k < 11 ? [px, py - w * 0.5] : [px - w, py]), right = L2.map(([px, py, w], k) => k < 11 ? [px, py + w * 0.7] : [px + w * 0.4, py]).reverse();
          return sh.poly(left.concat(right)).path(0.2, 5);
        });
        const len = clamp(0.35 + 0.65 * gl, 0, 1);
        g.save(); g.globalAlpha = Math.min(1, 0.4 + gl * 0.9); g.beginPath(); g.rect(x - r * 0.3, y - h - 6, r * 1.5, 12 + h * 0.2 * len); g.clip(); g.fillStyle = '#FFF6E0'; g.fill(sl); g.restore();
        em.save(); em.globalAlpha = Math.min(1, gl * 1.1); em.fillStyle = '#FFF6E0'; em.beginPath(); em.ellipse(x + r * 0.5, y - h + 4, 24 + 40 * gl, 9 + 14 * gl, 0, 0, 7); em.fill(); em.restore();
      }
    });
  }
  // the count: six glints `gap` apart starting at t0 -> [0..1] x6 (a hard ping, a fast decay, a low residue)
  function countGlints(t, t0, gap, n) {
    n = n || 6; gap = gap == null ? 3 / 24 : gap; const out = [];
    for (let i = 0; i < n; i++) { const dt = t - (t0 + i * gap); out.push(dt < 0 ? 0 : dt < 1 / 24 ? 1 : Math.max(0.12, Math.exp(-(dt - 1 / 24) * 7))); }
    return out;
  }

  // ================================================================== DOORWAY (Kay, medium)
  const DW = { jL: 552, x0: 600, x1: 1110, jR: 1158, lintel: 74, floor: 1012 };
  const DW_LAMP = [2500, 260];
  function paintDoorwayBack(g) {
    const d = DW, E = EXT.doorway;
    fillExt(g, E, C.ink);
    g.save(); const cl = rectP(E); cl.rect(d.jL, d.lintel - 30, d.jR - d.jL, E[3]); g.clip(cl, 'evenodd');
    pool(g, 'dw.wall', 2560, 520, [{ r: 1260, color: mix(C.tungstenLow, C.ink, 0.45) }, { r: 820, color: C.tungstenLow }], { sy: 0.7, seed: 6, rough: 2.6 });
    g.fillStyle = C.ink; g.fillRect(E[0], 1040, E[2] - E[0], E[3] - 1040);
    g.restore();
    // the kitchen, warm: a pool behind Kay's head, cupboards, the counter, the kettle
    g.save(); g.beginPath(); g.rect(d.x0, d.lintel, d.x1 - d.x0, E[3] - d.lintel); g.clip();
    g.fillStyle = C.tungstenMid; g.fillRect(d.x0, d.lintel, d.x1 - d.x0, E[3] - d.lintel);
    pool(g, 'dw.kit', 760, 330, [{ r: 520, color: C.tungsten }, { r: 220, color: WARM }], { sy: 1.25, seed: 12, rough: 2 });
    g.fillStyle = C.ink;
    g.fill(P('dw.cup', () => S().rect(924, d.lintel - 10, 200, 236).path(0.8, 13))); g.fillStyle = C.tungstenMid; g.fillRect(926, d.lintel + 222, 196, 3);
    g.fillStyle = mix(C.ink, C.tungstenLow, 0.4); g.fillRect(1022, d.lintel + 10, 2, 206);
    g.fillStyle = C.ink; g.fill(P('dw.counter', () => S().rect(840, 652, 300, 26).add(S().rect(856, 676, 290, 600)).path(0.8, 14)));
    g.fillStyle = C.tungsten; g.fillRect(840, 650, 300, 3);
    g.fillStyle = C.ink; g.fill(P('dw.kettle', () => S().M(944, 652).L(952, 576).C(958, 548, 1012, 548, 1018, 576).L(1026, 652).Z().add(S().rect(974, 538, 20, 16)).add(S().capsule(1016, 590, 6, 1048, 560, 5)).path(0.6, 15)));
    g.fillStyle = C.tungsten; g.fillRect(950, 590, 3, 50);
    for (let i = 0; i < 6; i++) { const yy = 646 - i * 7; g.fillStyle = C.ink; g.beginPath(); g.ellipse(890, yy + 2, 40, 5, 0, 0, 7); g.fill(); g.fillStyle = C.cardPaper; g.beginPath(); g.ellipse(890, yy, 40, 4.2, 0, 0, Math.PI); g.fill(); }   // six plates, waiting
    g.fillStyle = C.ink; g.fillRect(d.x0, 990, d.x1 - d.x0, E[3] - 990);
    g.fillStyle = C.tungstenLow; g.fill(P('dw.kfloor', () => S().poly([[d.x0, 990], [d.x1, 990], [d.x1, 1012], [d.x0, 1012]]).path(0.8, 17)));
    g.restore();
    g.fillStyle = rgba(C.tungstenMid, 0.55); g.fill(P('dw.spill', () => S().poly([[d.x0, 1040], [d.x1, 1040], [d.x1 + 260, E[3]], [d.x0 + 60, E[3]]]).path(1.6, 18)));
    // the frame: jambs and lintel. The left jamb's inner face is a hot strip of kitchen light, so Kay's back reads against it
    g.fillStyle = C.ink; const fr = PS('dw.frame', () => S().rect(d.jL, d.lintel - 34, d.x0 - d.jL, E[3] - d.lintel + 34).add(S().rect(d.jL, d.lintel - 34, d.jR - d.jL, 34)).add(S().rect(d.x1, d.lintel - 34, d.jR - d.x1, E[3] - d.lintel + 34)), 0.8, 19); g.fill(fr);
    g.fillStyle = C.tungsten; g.fill(P('dw.face', () => S().poly([[d.x0 - 9, d.lintel], [d.x0, d.lintel], [d.x0, 1040], [d.x0 - 12, 1040]]).path(0.5, 20)));
    g.fillStyle = WARM; g.fillRect(d.x0 - 3, d.lintel + 120, 3, 520);
    g.fillStyle = C.tungstenMid; g.fillRect(d.x1, d.lintel, 4, E[3] - d.lintel);
    rimIn(g, fr, norm(DW_LAMP[0] - 1100, DW_LAMP[1] - 500), 2.4, C.tungstenMid, 0.8);
  }
  function drawDoorwayView(c, t, s) {
    layer(c, 'doorway.back', paintDoorwayBack, EXT.doorway);
    const em = c.em; em.save(); em.globalAlpha = 0.32; em.fillStyle = C.tungsten; em.beginPath(); em.ellipse(820, 300, 150, 170, 0, 0, 7); em.fill();
    em.globalAlpha = 0.5; em.fillRect(DW.x0 - 10, DW.lintel + 60, 10, 700); em.restore();
    dust(c, t, s, [DW.x0 + 10, DW.lintel + 20, DW.x1 - DW.x0 - 20, 560], 26, 'dwdust', C.cardPaper);
  }

  // ================================================================== COUCH (medium, for Scott)
  const CV = { floor: 968, lamp: { x: 1452, top: 150, bot: 262, wt: 112, wb: 236, foot: 984 }, x0: 380, x1: 1300, back: 584, seat: 772, armTop: 704 };
  const CV_L = [CV.lamp.x, 230];
  function couchParts() {
    return P('cv.parts', () => {
      const v = CV, A = v.armTop;
      const back = S().M(v.x0 + 140, v.seat).L(v.x0 + 146, v.back + 24).Q(v.x0 + 150, v.back, v.x0 + 176, v.back).L(v.x1 - 150, v.back - 4).Q(v.x1 - 118, v.back - 4, v.x1 - 116, v.back + 22).L(v.x1 - 110, v.seat).Z();
      const seat = S().M(v.x0 + 150, v.seat - 16).L(v.x1 - 112, v.seat - 18).Q(v.x1 - 104, v.seat + 30, v.x1 - 112, v.seat + 60).L(v.x0 + 150, v.seat + 62).Z();
      const base = S().rect(v.x0 + 10, v.seat + 50, v.x1 - v.x0 - 20, 96).add(S().rect(v.x0 + 28, v.seat + 140, 18, 30)).add(S().rect(v.x1 - 52, v.seat + 140, 18, 30));
      // the big rolled left arm (~210 px), the scroll curling over its outer face: Scott perches on its top (y ~ A - 38)
      const armL = S().M(v.x0 + 2, v.seat + 150).L(v.x0 + 4, A + 70).C(v.x0 - 30, A + 62, v.x0 - 44, A + 24, v.x0 - 36, A - 6).C(v.x0 - 26, A - 38, v.x0 + 4, A - 44, v.x0 + 34, A - 42)
        .L(v.x0 + 150, A - 46).C(v.x0 + 192, A - 46, v.x0 + 206, A - 10, v.x0 + 190, A + 22).C(v.x0 + 182, A + 36, v.x0 + 174, A + 40, v.x0 + 172, A + 52).L(v.x0 + 170, v.seat + 150).Z();
      const armR = S().M(v.x1 - 150, v.seat + 150).L(v.x1 - 154, A + 40).C(v.x1 - 170, A, v.x1 - 120, A - 22, v.x1 - 60, A - 18).C(v.x1 - 20, A - 14, v.x1 - 4, A + 18, v.x1, A + 48).L(v.x1, v.seat + 150).Z();
      // three back cushions (w 190) between the arms: plumped, the middle one karate-chopped (a room tidied for company)
      const cush = [];
      [[v.x0 + 182, 0], [v.x0 + 380, 1], [v.x0 + 578, 0]].forEach(([x, chop], i) => {
        const w = 190, y = v.back - 20 - (i === 1 ? 4 : 0) + (i === 2 ? 3 : 0), c2 = S().M(x, v.seat - 10).L(x - 4, y + 34).Q(x - 2, y + 2, x + 26, y);
        if (chop) c2.L(x + w / 2 - 30, y - 10).L(x + w / 2, y + 30).L(x + w / 2 + 30, y - 10);
        c2.L(x + w - 26, y + 1).Q(x + w + 2, y + 3, x + w + 4, y + 34).L(x + w, v.seat - 10).Z(); cush.push(c2);
      });
      const parts = [back, seat, base, armR].concat(cush).concat([armL]);
      const paths = parts.map((q, i) => { const p = q.path(1, 81 + i); p.bb = q.bbox(); return p; });
      return { paths, armL: paths[paths.length - 1] };
    });
  }
  function paintCouchBack(g) {
    const v = CV, L = v.lamp, cp = couchParts(), E = EXT.couch; const ld = (x, y) => norm(CV_L[0] - x, CV_L[1] - y);
    fillExt(g, E, C.ink);
    g.save(); g.beginPath(); g.rect(E[0], E[1], E[2] - E[0], v.floor - E[1]); g.clip();
    g.fillStyle = mix(C.tungstenLow, C.ink, 0.5); g.fill(P('cv.up', () => S().poly([[L.x - L.wt / 2, L.top], [L.x + L.wt / 2, L.top], [L.x + 300, E[1]], [L.x - 300, E[1]]]).path(1.2, 2)));
    pool(g, 'cv.wall', L.x - 40, 470, [{ r: 1300, color: C.tungstenLow }, { r: 820, color: C.tungstenMid }, { r: 400, color: C.tungsten }], { sy: 0.46, seed: 7, rough: 2.6 });
    g.fillStyle = C.ink; g.fillRect(E[0], v.floor - 22, E[2] - E[0], 22);
    g.restore();
    g.save(); g.beginPath(); g.rect(E[0], v.floor, E[2] - E[0], E[3] - v.floor); g.clip();
    pool(g, 'cv.floor', L.x - 100, v.floor + 70, [{ r: 1200, color: C.tungstenLow }, { r: 640, color: C.tungstenMid }], { sy: 0.1, seed: 8, rough: 2 });
    g.fillStyle = rgba(C.ink, 0.8); g.fill(P('cv.shadow', () => S().poly([[v.x0 - 40, v.seat + 170], [v.x1 - 60, v.seat + 170], [v.x1 - 460, E[3]], [v.x0 - 480, E[3]]]).path(1.6, 9)));
    g.restore();
    OTM.cone(g, [[L.x - L.wb / 2, L.bot], [L.x + L.wb / 2, L.bot], [L.x + 700, v.floor + 60], [L.x - 700, v.floor + 60]], C.tungsten, 0.05);
    // the lamp, standing just behind the couch's right arm
    g.fillStyle = C.ink; g.fillRect(L.x - 5, L.bot - 6, 10, L.foot - L.bot); g.fill(P('cv.lfoot', () => S().ellipse(L.x, L.foot, 56, 9, 0).path(0.3, 2)));
    const shP = P('cv.shade', () => S().M(L.x - L.wt / 2, L.top).L(L.x + L.wt / 2, L.top).L(L.x + L.wb / 2, L.bot).L(L.x - L.wb / 2, L.bot).Z().path(0.7, 3));
    g.fillStyle = C.tungsten; g.fill(shP); g.save(); g.clip(shP); g.fillStyle = WARM; g.fill(P('cv.core', () => S().ellipse(L.x, L.bot + 14, 74, 120, 0).path(1, 4))); g.restore();
    g.fillStyle = C.ink; g.fillRect(L.x - L.wt / 2 - 3, L.top - 4, L.wt + 6, 6); g.fillRect(L.x - L.wb / 2 - 3, L.bot - 3, L.wb + 6, 5);
    // the couch: one solid ink silhouette (as F04's furniture), rimmed only along its outer lit edge
    g.fillStyle = C.ink; cp.paths.forEach(p => g.fill(p));
    rimIn(g, cp.paths, ld(820, 560), 3, C.tungsten);
    // the throw folded over the arm in a hurry: its tassel fringe hangs off the roll's front, catching the light
    g.fillStyle = C.tungstenMid; for (let i = 0; i < 11; i++) g.fillRect(v.x0 + 28 + i * 10, v.armTop + 30 + (i % 2) * 2 + i * 0.6, 2.4, 12);
  }
  function drawCouchView(c, t, s) {
    layer(c, 'couch.back', paintCouchBack, EXT.couch);
    const L = CV.lamp, em = c.em; em.save(); em.globalAlpha = 0.55; em.fillStyle = C.tungsten; em.fill(P('cv.shade', () => null));
    em.globalAlpha = 0.9; em.fillStyle = WARM; em.beginPath(); em.ellipse(L.x, L.bot - 26, 58, 70, 0, 0, 7); em.fill();
    em.globalAlpha = 0.7; em.beginPath(); em.ellipse(L.x, L.bot + 2, L.wb * 0.5, 16, 0, 0, 7); em.fill(); em.restore();
    dust(c, t, s, [L.x - 520, L.bot + 20, 1040, 600], 34, 'cvdust', C.cardPaper);
  }

  // ================================================================== COASTER (table top, high angle)
  const CO = { edge: 860, glass: [1250, 600], ring: [720, 640], stack: [1660, 700], bowlC: [-80, -40], k: 1.45 };
  const CO_L = [1900, -260];
  function paintCoasterBack(g) {
    const E = EXT.coaster;
    fillExt(g, E, C.ink);
    g.save(); g.beginPath(); g.rect(E[0], E[1], E[2] - E[0], CO.edge - E[1]); g.clip();
    // the lamp's pool on the lid falls off to ink at the left and toward us: room for the words
    g.fillStyle = mix(C.tungstenLow, C.ink, 0.62); g.fillRect(E[0], E[1], E[2] - E[0], CO.edge - E[1]);
    pool(g, 'co.top', 1320, 300, [{ r: 1280, color: C.tungstenLow }, { r: 900, color: C.tungstenMid }, { r: 470, color: C.tungsten }], { sy: 0.58, rot: -0.12, seed: 10, rough: 2.6 });
    g.strokeStyle = rgba(C.ink, 0.28); g.lineWidth = 2.4; [140, 360, 600, 820].forEach((y, i) => { g.beginPath(); g.moveTo(E[0], y + i * 6); g.lineTo(E[2], y - 30 + i * 4); g.stroke(); });
    g.strokeStyle = rgba(C.ink, 0.12); g.lineWidth = 1.2; for (let i = 0; i < 9; i++) { const y = 60 + i * 100; g.beginPath(); g.moveTo(E[0], y + 40); g.bezierCurveTo(500, y + 20, 1100, y + 60, E[2], y + 10); g.stroke(); }
    g.restore();
    // the table's front edge, and the dark floor beyond (room for words)
    g.fillStyle = C.tungsten; g.fill(P('co.lip', () => S().poly([[E[0], CO.edge - 2], [E[2], CO.edge - 14], [E[2], CO.edge - 8], [E[0], CO.edge + 4]]).path(0.6, 5)));
    g.fillStyle = mix(C.tungstenLow, C.ink, 0.55); g.fill(P('co.lip2', () => S().poly([[E[0], CO.edge + 4], [E[2], CO.edge - 8], [E[2], CO.edge + 8], [E[0], CO.edge + 20]]).path(0.6, 6)));
    // the crisps bowl's rim, cropped top-left: continuity with Q02
    const bw = PS('co.bowl', () => S().ellipse(CO.bowlC[0], CO.bowlC[1], 330, 170, 0.1), 1, 6); g.fillStyle = C.ink; g.fill(bw);
    g.save(); g.clip(bw); const r = O.rng('cobowl'); for (let i = 0; i < 26; i++) crisp(g, { x: -60 + r() * 330, y: -60 + r() * 160, rot: r() * 6, s: 46 + r() * 20, flip: 0.5 + r() * 0.4, shape: i % 7 }, norm(CO_L[0], CO_L[1] + 300)); g.restore();
    rimIn(g, bw, norm(CO_L[0] - 200, CO_L[1] - 100), 4, C.tungsten);
  }
  // Marina's glass seen from above: foot at (x, y)
  function glassHigh(g, em, x, y, s, fill) {
    s = s || 1;
    const k = s, foot = { rx: 46 * k, ry: 21 * k }, top = y - 236 * k, rr = { rx: 70 * k, ry: 30 * k };
    g.save(); g.globalAlpha = 0.4; g.fillStyle = C.ink;
    g.fill(S().ellipse(x - 6 * k, y + 4 * k, foot.rx * 1.05, foot.ry * 1.1, 0).capsule(x - 10 * k, y + 6 * k, 6 * k, x - 120 * k, y + 74 * k, 9 * k).ellipse(x - 170 * k, y + 104 * k, 70 * k, 30 * k, -0.5).path(1.4, 79)); g.restore();
    const sh = S().ellipse(x, y, foot.rx, foot.ry, 0).rect(x - 5 * k, top + 110 * k, 10 * k, y - top - 110 * k)
      .M(x - 9 * k, top + 128 * k).C(x - 58 * k, top + 100 * k, x - rr.rx - 4 * k, top + 50 * k, x - rr.rx, top).L(x + rr.rx, top).C(x + rr.rx + 4 * k, top + 50 * k, x + 58 * k, top + 100 * k, x + 9 * k, top + 128 * k).Z()
      .ellipse(x, top, rr.rx, rr.ry, 0);
    const p = sh.path(0.6, 77);
    inkRim(g, p, norm(CO_L[0] - x, CO_L[1] - y), 2.6, C.tungsten);
    g.save(); g.clip(P('co.mouth:' + x + ':' + y + ':' + s, () => S().ellipse(x, top, rr.rx - 4, rr.ry - 3, 0).path(0.4, 78)));
    g.fillStyle = C.soot; g.fillRect(x - rr.rx, top - rr.ry, rr.rx * 2, rr.ry * 2);
    if (fill > 0) { const fy = top + (1 - fill) * 50 * k; g.fillStyle = C.wine; g.beginPath(); g.ellipse(x, fy, rr.rx * (0.6 + 0.35 * fill), rr.ry * (0.6 + 0.35 * fill), 0, 0, 7); g.fill();
      g.fillStyle = mix(C.wine, C.tungsten, 0.5); g.beginPath(); g.ellipse(x + rr.rx * 0.3, fy - rr.ry * 0.25, rr.rx * 0.22, rr.ry * 0.12, 0.2, 0, 7); g.fill(); }
    g.restore();
    g.strokeStyle = C.tungsten; g.lineWidth = 2; g.beginPath(); g.ellipse(x, top, rr.rx - 1, rr.ry - 1, 0, -1.3, 0.6); g.stroke();
    g.fillStyle = C.cardPaper; g.globalAlpha = 0.85; g.fill(S().capsule(x + rr.rx * 0.7, top + 30 * k, 2.6, x + 34 * k, top + 108 * k, 1.4).path(0, 1)); g.globalAlpha = 1;
    if (em) { em.fillStyle = C.tungsten; em.beginPath(); em.arc(x + rr.rx * 0.7, top + 40 * k, 14, 0, 7); em.fill(); }
  }
  function wineRing(g, x, y, amt, wipe, k) {
    if (amt <= 0 && !(wipe > 0 && wipe < 1)) return; k = k || 1;
    if (amt > 0) {
      g.save(); g.globalAlpha = amt; g.strokeStyle = C.wine; g.lineCap = 'round';
      [[0.35, 2.4, 5], [2.5, 4.3, 3.4], [4.4, 6.0, 4.4]].forEach(([a, b, w]) => { g.lineWidth = w * k; g.beginPath(); g.ellipse(x, y, 46 * k, 21 * k, 0, a, b); g.stroke(); });
      g.fillStyle = C.wine; g.beginPath(); g.ellipse(x + 40 * k, y + 12 * k, 6 * k, 3.5 * k, 0.3, 0, 7); g.fill();
      g.restore();
    }
    if (wipe > 0 && wipe < 1) { g.save(); g.globalAlpha = 0.4 * Math.sin(Math.PI * wipe); g.fillStyle = C.wine; g.beginPath(); g.ellipse(x + 40 * wipe * k, y - 10 * k, 70 * k, 18 * k, -0.15, 0, 7); g.fill(); g.restore(); }
  }
  function drawCoasterView(c, t, s) {
    const g = c.g, em = c.em;
    layer(c, 'coaster.back', paintCoasterBack, EXT.coaster);
    (s.crisps || [{ x: 1380, y: 390, rot: 1.2, s: 40, flip: 0.7, shape: 3 }]).forEach(k => { g.save(); g.globalAlpha = 0.45; g.fillStyle = C.ink; g.beginPath(); g.ellipse(k.x - 10, k.y + 8, (k.s || 30) * 0.45, (k.s || 30) * 0.18, 0, 0, 7); g.fill(); g.restore(); crisp(g, k, norm(CO_L[0] - k.x, CO_L[1] - k.y)); });
    const ring = s.ring == null ? 1 : s.ring; const rp = s.ringAt || CO.ring;
    wineRing(g, rp[0], rp[1], ring, s.wipe || 0, CO.k);
    const st = s.matStack == null ? 5 : s.matStack, sp = CO.stack;
    for (let i = 0; i < st; i++) coaster(g, sp[0] + Math.sin(i * 2.1) * 6, sp[1] - i * 6, 0.25 + Math.sin(i * 1.3) * 0.08, 210, 0.52, 0);
    const gp = s.glassAt || CO.glass, co = s.coaster;
    // the mat in Scott's hand: under the glass while it lies on the table, over it while it is in the air
    const coOver = co && (co.z === 'over' || (co.z == null && (co.lift || 0) > 0.5));
    if (co && !coOver) coaster(g, co.x, co.y, co.rot == null ? 0.2 : co.rot, 210, 0.52, co.lift || 0);
    if (s.glassOn !== false) glassHigh(g, em, gp[0], gp[1], CO.k, s.fill == null ? 0.5 : s.fill);
    if (co && coOver) coaster(g, co.x, co.y, co.rot == null ? 0.2 : co.rot, 210, 0.52, co.lift || 0);
    if (s.cloth) cloth(g, s.cloth.x, s.cloth.y, s.cloth.rot || 0, s.cloth.s || 1.5);
  }

  // ================================================================== the set
  const LIGHTS = {
    wide: { x: LC[0], y: LC[1], color: C.tungsten, rim: C.tungsten, rimLow: C.tungstenMid },
    crisps: { x: CR_L[0], y: CR_L[1], color: C.tungsten, rim: C.tungsten, rimLow: C.tungstenMid },
    glasses: { x: GL.light[0], y: GL.light[1], color: C.tungsten, rim: C.tungsten, rimLow: C.tungstenMid },
    doorway: { x: DW_LAMP[0], y: DW_LAMP[1], color: C.tungsten, rim: C.tungstenMid, rimLow: C.tungstenLow, back: [760, 330], jamb: [DW.x0 - 6, 560] },
    couch: { x: CV_L[0], y: CV_L[1], color: C.tungsten, rim: C.tungsten, rimLow: C.tungstenMid },
    coaster: { x: CO_L[0], y: CO_L[1], color: C.tungsten, rim: C.tungsten, rimLow: C.tungstenMid },
  };
  // each view's lamp pool, for the dimmer: centre and outer / core radii (world)
  const POOLS = {
    wide: { x: 960, y: 640, rx: 1150, ry: 520, cx: 560, cy: 260 }, crisps: { x: 1500, y: 500, rx: 1300, ry: 700, cx: 600, cy: 320 },
    glasses: { x: 1290, y: 560, rx: 1100, ry: 1100, cx: 600, cy: 900 }, doorway: { x: 780, y: 420, rx: 700, ry: 760, cx: 300, cy: 380 },
    couch: { x: 1400, y: 520, rx: 1300, ry: 620, cx: 520, cy: 260 }, coaster: { x: 1320, y: 300, rx: 1280, ry: 740, cx: 500, cy: 280 },
  };
  // the lamp dimmer: the posterised bands step down and the pool shrinks toward the shade (three flat ink bands, camera-aware).
  // front() calls it unless s.dimLast; then call SETS.living.dim(c, s.lamp, view) yourself after the characters.
  function dim(c, lamp, view) {
    lamp = lamp == null ? 1 : clamp(lamp, 0, 1); if (lamp >= 1) return;
    view = view || 'wide'; const g = c.g, d = 1 - lamp, E = EXT[view] || EXT.wide, pc = POOLS[view] || POOLS.wide, k = 0.55 + 0.45 * lamp;
    const ell = (rx, ry, seed) => S().ellipse(pc.x, pc.y, rx * k, ry * k, 0).path(2.4, seed);
    const outer = ell(pc.rx, pc.ry, 91), core = ell(pc.cx, pc.cy, 92);
    g.save();
    const p0 = rectP(E); p0.addPath(outer); g.fillStyle = rgba(C.ink, Math.min(0.94, d * 0.96)); g.fill(p0, 'evenodd');
    const p1 = new Path2D(); p1.addPath(outer); p1.addPath(core); g.fillStyle = rgba(C.ink, d * 0.74); g.fill(p1, 'evenodd');
    g.fillStyle = rgba(C.ink, d * 0.5); g.fill(core);
    g.restore();
    const e = c.em; e.save(); e.setTransform(1, 0, 0, 1, 0, 0); e.globalCompositeOperation = 'destination-out'; e.globalAlpha = d; e.fillRect(0, 0, W / 4, H / 4); e.restore();
  }
  function back(c, t, s, view) {
    s = s || {}; view = view || 'wide';
    switch (view) {
      case 'wide': {
        layer(c, 'wide.back', paintWideBack, EXT.wide);
        const em = c.em, L = WD.LAMP; const br = 1 + 0.05 * clamp(s.walla || 0, 0, 1) * Math.sin(t * 2 * Math.PI * 1.1);
        emPath(c, shadeP(), C.tungsten, Math.min(1, br)); em.save(); em.globalAlpha = br; em.fillStyle = C.tungsten; em.beginPath(); em.ellipse(L.x, L.bot, 120, 40, 0, 0, 7); em.fill();
        em.globalAlpha = 0.7; em.beginPath(); em.ellipse(WD.KIT.x0 + 150, 410, 70, 110, 0, 0, 7); em.fill(); em.restore();
        dust(c, t, s, [L.x - 330, L.bot + 20, 660, 330], 40, 'wdust', C.cardPaper);
        drawPrints(c, s);
        // the speaker's cone pumps to the music (s.music 0..1, s.bpm)
        const mu = clamp(+s.music || 0, 0, 1);
        if (mu > 0) { const g = c.g, bp = s.bpm || 112, ph = (t * bp / 60) % 1, kick = Math.exp(-ph * 9) * mu, SP = WD.SPK;
          g.save(); g.strokeStyle = C.tungstenMid; g.globalAlpha = 0.35 + 0.55 * kick; g.lineWidth = 2; g.beginPath(); g.arc(SP.x, WD.BASE - 20, 12.5 + 1.6 * kick, 0, 7); g.stroke();
          g.globalAlpha = 0.5 * mu; g.beginPath(); g.arc(SP.x, WD.BASE - 54, 4.5, -1.2, 0.6); g.stroke(); g.restore(); }
        // crisps that missed the bowl (the default: F04's four by the couch)
        const cr = s.crisps || [[318, 936], [356, 950], [300, 962], [392, 932]].map(([x, y], i) => ({ x, y, rot: i * 1.3 }));
        const g = c.g; g.save(); g.fillStyle = C.cardPaper; cr.forEach(k => { g.save(); g.translate(k.x, k.y); g.rotate(k.rot || 0); g.globalAlpha = 0.85; g.beginPath(); g.ellipse(0, 0, 6, 2.6, 0, 0, 7); g.fill(); g.restore(); }); g.restore();
        break;
      }
      case 'crisps': drawCrispsView(c, t, s); break;
      case 'glasses': drawGlassesView(c, t, s); break;
      case 'doorway': drawDoorwayView(c, t, s); break;
      case 'couch': drawCouchView(c, t, s); break;
      case 'coaster': drawCoasterView(c, t, s); break;
    }
  }
  function table(c, t, s, view) { s = s || {}; if ((view || 'wide') === 'wide') drawWideTable(c, t, s); }
  function front(c, t, s, view) {
    s = s || {}; view = view || 'wide';
    if (view === 'wide') { layer(c, 'wide.frontL', paintWideFrontL, FRONT_L); layer(c, 'wide.frontR', paintWideFrontR, FRONT_R); }
    if (!s.dimLast) dim(c, s.lamp, view);
  }
  function draw(c, t, s, view) { back(c, t, s, view); table(c, t, s, view); front(c, t, s, view); }

  // named framings. cam(name, st, push) adds the Act 1 slow push (default 0.35% per second)
  const cams = {
    wide: { x: 960, y: 540, zoom: 1 }, wideTable: { x: 960, y: 760, zoom: 1.18 }, wideKay: { x: 300, y: 560, zoom: 1.25 }, wideCouch: { x: 330, y: 760, zoom: 1.22 },
    wideDining: { x: 1452, y: 650, zoom: 2.3 }, wideLamp: { x: 930, y: 520, zoom: 1.2 }, wideDoor: { x: -120, y: 640, zoom: 1.3 },
    crisps: { x: 960, y: 540, zoom: 1 }, crispsBowl: { x: 1000, y: 640, zoom: 1.15 }, glasses: { x: 960, y: 540, zoom: 1 },
    doorway: { x: 960, y: 540, zoom: 1 }, couch: { x: 960, y: 540, zoom: 1 }, couchArm: { x: 620, y: 640, zoom: 1.2 }, coaster: { x: 960, y: 540, zoom: 1 },
  };
  function cam(name, st, push) { const b = cams[name] || cams.wide; return Object.assign({}, b, { zoom: b.zoom * (1 + (push == null ? 0.0035 : push) * (st || 0)) }); }

  const anchors = {
    wide: {
      wallBase: WD.BASE, lamp: LC.slice(), shade: Object.assign({}, WD.LAMP), kitchen: Object.assign({ base: WD.BASE }, WD.KIT), table: Object.assign({}, WD.TBL),
      glasses: WD.glassX.map(x => [x, WD.TBL.top - WD.TBL.depth * 0.45]), ring: WD.ring.slice(), bowl: WD.bowl.slice(), mats: WD.mats.slice(),
      couchArm: [118, 852], armchairSeat: [1700, 860], hall: Object.assign({ base: WD.BASE }, WD.HALL), speaker: [WD.SPK.x, WD.BASE - 40],
      prints: [[-330, 884], [380, 925]],
      dining: { opening: Object.assign({}, WD.D), table: [WD.D.cx, WD.D.cy], places: null, chairs: null, pendant: [WD.D.cx, 610] },
      words: { top: [960, 118], bottomRight: [1880, 1012], left: [-300, 330] },     // F04's type spots (top: align centre; bottomRight: align right; left: in wideKay/wideCouch)
      // F04's blocking (OTM.fig.profile poses: x, y, scale, facing, anchor)
      pose: {
        kay: { x: 150, y: 880, scale: 76, facing: 1, lean: -0.14 }, scott: { x: 486, y: 914, scale: 84, facing: 1 }, scottOnArm: { x: 132, y: 862, scale: 104, facing: 1, anchor: 'hip' },
        marina: { x: 724, y: 724, scale: 82, facing: 1, anchor: 'hip' }, christof: { x: 1150, y: 900, scale: 88, facing: -1 }, deena: { x: 1452, y: 902, scale: 84, facing: -1 },
        angelo: { x: 1690, y: 892, scale: 114, facing: -1, anchor: 'hip' },
      },
    },
    crisps: { bowl: Object.assign({}, CR.bowl), mouth: CR.mouth.slice(), tableBack: CR.back, lamp: CR_L.slice(), words: [90, 170] },
    glasses: { floor: GL.floor, h: GL.H, x: GL.cx.slice() },
    doorway: { opening: Object.assign({}, DW), kay: { x: 704, y: 1500, scale: 172, facing: 1, lean: -0.14 }, jamb: [DW.x0, 560], words: { left: [90, 330], right: [1260, 420] } },
    couch: { armSeat: [CV.x0 + 86, CV.armTop - 40], scottStand: { x: 200, y: 1050, scale: 112, facing: 1 }, scottOnArm: { x: CV.x0 + 86, y: CV.armTop - 34, scale: 112, facing: -1, anchor: 'hip' }, floor: CV.floor, lamp: CV_L.slice(), words: [70, 300] },
    coaster: { glass: CO.glass.slice(), ring: CO.ring.slice(), stack: CO.stack.slice(), edge: CO.edge, coasterUnderGlass: [CO.glass[0], CO.glass[1] + 4], words: { bottom: [90, 950], bottom2: [90, 1028], right: [1830, 990] } },
  };
  anchors.wide.dining.places = diningSeats().map(q => q.plate);
  anchors.wide.dining.chairs = diningSeats().map(q => [Math.round(q.x), Math.round(q.foot)]);

  // ================================================================== demos (node tools/set.js living 1)
  // placeholder characters only (the sequences place the real ones)
  function ph(c, id, pose, light, rim, w) { const fg = O.fig.profile(id, pose); O.silhouette(c.g, fg.shape, { light: { x: light[0], y: light[1] }, rimColor: rim || C.tungsten, rimW: w || 2.6 }); return fg; }
  const pourDemo = pour({ seed: 'demo' }), scoopDemo = pour({ seed: 'demo', mode: 'scoop' });
  // a placeholder hand (+ forearm) whose pinch point (or fist) lands on a world target; a = the way the fingers point
  function phHand(c, pose, target, a, sc, light, mirror) {
    const pt = pose === 'pinch' ? [0.64, -0.05] : pose === 'grip' ? [0.3, 0] : [0.5, 0];
    const ca = Math.cos(a), sa = Math.sin(a), my = mirror ? -1 : 1;
    const M = [ca * sc, sa * sc, -sa * sc * my, ca * sc * my, 0, 0]; M[4] = target[0] - (M[0] * pt[0] + M[2] * pt[1]); M[5] = target[1] - (M[1] * pt[0] + M[3] * pt[1]);
    const sh = O.fig.hand(pose).add(S().capsule(0.05, 0, 0.19, -1.3, 0.04, 0.24)).transform(M);
    O.silhouette(c.g, sh, { light: { x: light[0], y: light[1] }, rimColor: C.tungsten, rimW: 3 });
  }
  function party(c, t, s) {
    const A = anchors.wide.pose, L = LC;
    back(c, t, s, 'wide');
    ph(c, 'kay', Object.assign({}, A.kay, { armN: { a: 0.06, b: 0.45, hand: 'relaxed' }, legF: { a: 0.24, b: 0.04 } }), L, C.tungsten, 2.2);
    ph(c, 'marina', Object.assign({}, A.marina, { lean: 0.6, head: 0.4, legN: { a: 0.08, b: 1.62 }, legF: { a: 0, b: 1.6 }, armN: { a: 1.2, b: 0.4, hand: 'side' } }), L);
    const cf = ph(c, 'christof', Object.assign({}, A.christof, { armN: { a: 2.5, b: -0.38, hand: 'hold' }, armF: { a: -0.5, b: -0.42, hand: 'open' } }), L, C.tungsten, 2.8);
    ph(c, 'deena', Object.assign({}, A.deena, { armN: { a: -0.62, b: 1.85, hand: 'relaxed' } }), L);
    ph(c, 'scott', Object.assign({}, A.scott, { lean: 0.42, head: 0.26, armN: { a: 0.5, b: 1.3, hand: 'hold' }, legN: { a: 0.72, b: 1.1 }, legF: { a: 0.36, b: 0.92 } }), L);
    table(c, t, s, 'wide'); front(c, t, Object.assign({}, s, { dimLast: true }), 'wide');
    const an = ph(c, 'angelo', Object.assign({}, A.angelo, { lean: -0.5, armN: { a: 0.5, b: 1.05 }, armF: { a: -2.25, b: 2.2 }, legN: { a: 1.3, b: 0.7 }, legF: { a: 1.12, b: 1.0 } }), L, C.tungsten, 3.4);
    const cw = cf.joints.wristN; biscuit(c.g, c.em, cw[0] - 16, cw[1] - 24, 1); const aw = an.joints.wristN; cardBox(c.g, aw[0] - 10, aw[1] - 26, -0.3, 1, 1, 0.4 + 0.3 * Math.sin(t * 2));
    dim(c, s.lamp, 'wide');
  }
  const demos = [
    { name: 'wide: Q02 earlier, empty room, six glasses', letterbox: 1.7778, draw: (c, t) => draw(c, t, { fill: 0, bowl: 1, bagOnTable: true, crisps: [] }, 'wide') },
    { name: 'wide: Q04 party, walla 1, prints, music', letterbox: 1.7778, draw: (c, t) => party(c, t, { glasses: [0.55, null, 0.7, 0.45, null, 0.35], ring: 1, walla: 1, prints: 1, music: 1 }) },
    { name: 'wide: cam wideDining 2.3x (hi-res cache): six places', letterbox: 1.7778, draw: (c, t) => { c.camera(cam('wideDining', t)); draw(c, t, { fill: 0, bagOnTable: true, crisps: [] }, 'wide'); } },
    { name: 'wide: cam wideKay +4s push, the hall door, prints', letterbox: 1.7778, draw: (c, t) => { c.camera(cam('wideKay', 4 + t)); party(c, t, { walla: 0.6, prints: 1, music: 1 }); } },
    { name: 'wide: cam wideTable, lamp 0.5 (dim after figures)', letterbox: 1.7778, draw: (c, t) => { c.camera(cam('wideTable', t)); party(c, t, { lamp: 0.5, ring: 1 }); } },
    { name: 'crisps: the pour, half miss (t 1.6)', t0: 0.6, letterbox: 1.7778, draw: (c, t) => {
      const st = pourDemo.at(t); draw(c, t, { crisps: st.crisps, bowl: st.bowl, bag: st.bag }, 'crisps');
      if (st.hand) phHand(c, 'grip', st.hand, st.handA, 210, CR_L);
    } },
    { name: 'crisps: scoop mode, the second handful falls (t 1.84)', t0: 0.84, letterbox: 1.7778, draw: (c, t) => {
      const st = scoopDemo.at(t); draw(c, t, { crisps: st.crisps, bowl: st.bowl, bag: st.bag }, 'crisps');
      if (st.hand) phHand(c, st.grip === 'release' ? 'open' : 'grip', st.hand, st.handA, 220, CR_L);
    } },
    { name: 'crisps: Scott picks them up (t 4.7)', t0: 3.7, letterbox: 1.7778, draw: (c, t) => {
      const st = pourDemo.at(t); draw(c, t, { crisps: st.crisps, bowl: st.bowl, bag: null }, 'crisps');
      if (st.hand) phHand(c, 'pinch', st.hand, st.handA, 200, CR_L, true);
    } },
    { name: 'glasses: the count of six (glass 4 pings)', t0: 0, letterbox: 1.7778, draw: (c, t) => draw(c, t, { glints: countGlints(t, 1 + 1 / 24 - 9 / 24, 3 / 24), fill: 0 }, 'glasses') },
    { name: 'doorway: Kay leans (placeholder)', letterbox: 1.7778, draw: (c, t) => {
      draw(c, t, {}, 'doorway'); const k = anchors.doorway.kay;
      ph(c, 'kay', Object.assign({}, k, { neck: 0.06, head: 0.1, armN: { a: 0.2, b: 1.9, hand: 'relaxed' }, armF: { a: -0.1, b: 0.5, hand: 'relaxed' }, legN: { a: -0.1, b: 0 }, legF: { a: 0.22, b: 0.04 } }), LIGHTS.doorway.jamb, C.tungsten, 3);
    } },
    { name: 'couch: Scott on the arm (placeholder)', letterbox: 1.7778, draw: (c, t) => {
      draw(c, t, {}, 'couch'); const k = anchors.couch.scottOnArm;
      ph(c, 'scott', Object.assign({}, k, { lean: 0.1, head: 0.1, legN: { a: 1.4, b: 1.5 }, legF: { a: 1.2, b: 1.3 }, armN: { a: 0.3, b: 0.9, hand: 'relaxed' } }), CV_L, C.tungsten, 3);
    } },
    { name: 'coaster: the wipe, a coaster arrives (in the air)', letterbox: 1.7778, draw: (c, t) => {
      const u = seg(t, 0.4, 1.6); draw(c, t, { ring: 1 - u * 0.6, wipe: u, cloth: { x: 560 + 90 * u, y: 680, rot: -0.2 }, coaster: { x: 1420 - 160 * u, y: 640, rot: 0.3, lift: 40 }, matStack: 4 }, 'coaster');
      phHand(c, 'pinch', [1420 - 160 * u + 120, 640 - 40], Math.PI - 0.25, 230, CO_L, true);
    } },
  ];

  SETS.living = {
    draw, back, table, front, dim, cams, cam, anchors, light: LIGHTS.wide, lights: LIGHTS, ext: EXT,
    pour, countGlints, glassList, bagFrame,
    props: { crisp, bag, coaster, cloth, bowl: bowlSmall, glass: glassSide, glassHigh, wineRing, biscuit, cardBox },
    rimDir: (view, x, y) => { const L = LIGHTS[view || 'wide']; return norm(L.x - x, L.y - y); },
    demos,
  };
})();
