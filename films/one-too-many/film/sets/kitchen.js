/* ONE TOO MANY — film set: THE KITCHEN (Q10, and the lighter standoff that opens Q11).
   Ports style frames F09 (the oven), F10 (Deena), F11 (the lighter) and the kitchen/lighter tiles of S03.
   The set draws the ENVIRONMENT only. Characters are placed by the sequences (film/rig.js / OTM.fig); the demos use placeholders.

   ---------------------------------------------------------------------------------------------------------------
   USE
     const K = SETS.kitchen, st = { knobs: 2, gas: 0.6, ovenOpen: 0.4 };
     c.camera(K.cams.stove.wide);                 // or any {x,y,zoom}; every view is drawn in its own world coords
     K.back(c, t, st, 'stove');                   // everything behind the characters
     ...draw characters (rims: K.light.stove, clip with K.clip('stove'))...
     K.mid(c, t, st, 'floor');                    // props that lie ON a character (Angelo's jacket over Deena); it also erases holes under it
     K.front(c, t, st, 'stove');                  // foreground architecture (door jambs; Marina's ring in 'doorway')
     K.occlude(c, figurePath2D, keep?)            // REQUIRED for any figure standing over ember perforations / the handprint:
                                                  // knockouts are composited at the end of the frame, so a figure must erase the holes it
                                                  // covers. keep (Path2D) is spared, e.g. a throat cut already made on that figure; or call
                                                  // occlude first and cut the throat after. state.occluders = [Path2D | {path, keep}] does it in front().
     K.draw(c, t, st, view, chars?)               // back + chars(c) + mid + front in one call
   t is any running clock in seconds (sequence-local lt is fine). Haze, motes, flicker, sway and the ring run on it.
   Every named cam, with a 4 px shake and full sway, lands on painted paper (cached layers carry margins; tested).

   VIEWS (world 1920x1080 unless noted)
     'entry'    the empty kitchen through the hall doorway: back door (night-blue glass) left; counter run whose last upper cupboard
                stands open (dark mouth, shelf, jars; the door swung out ~115 deg with a hoodMid edge toward the lamp); the low cabinet
                left of the stove open too (lit inner face, shelf, gas pipe, a bottle, knob shards at its foot); stove + hood right (the
                one light); the breakfast counter with THREE chairs (3D, projected): two tucked in, backs to us, the third pushed out past
                the bar's left end and turned toward the stove, clear of the stove and Scott's path. Hall-doorway jambs + lintel in front().
     'stove'    F09: the hood's sick cone on the tiled wall, gas haze, four knob positions, the oven door (ovenOpen, thud), the open low
                cabinet with broken knob plastic under it, Christof's folded paper-doll shadow thrown by the oven bulb up the wall and
                folded onto the ceiling. The throw grows FROM the oven: a thin streak along the wall above the cabinet, then the legs,
                the splayed hand, the curls, the hips (whole cavity by ovenOpen 0.75). Jamb/hall wall at left (front).
     'oven'     the same world magnified 1.45x about the oven's crack and re-cached sharp: the reveal (more ceiling fold, crack bottom right).
     'knobs'    insert of the stove front, world 1920x2400 (a tilt): hob + pan supports against lit tiles and haze (top), the control
                panel with FOUR positions and printed scales (knobs:2 -> two bare D-spindles, snapped collars, scratches), the oven
                door with its handle bar (hood-lit top edge) and window (ovenOpen drops it up to 210 px: glare and rack inside; thud
                jolts it), toe-kick, the broken plastic on the checker floor (bottom). Use cams.knobs.*.
     'deena'    F10: the tight hood cone on the tiled wall, counter top, burning hood lip. Nothing else.
     'counter'  the counter run side-lit from the hood (off right): the KNIFE BLOCK with five handles (knives:4 -> a lit empty slot),
                cutting board, kettle, upper cabinets with the open cupboard; 'Scott.' perforates the upper cabinets.
     'floor'    low on the checker tiles: where Deena lies (anchors), the blood pool (blood), the handprint knockout (handprint),
                Angelo's dropped cigarette (cig), his jacket (mid), the stove base and the open oven's glow at right.
     'doorway'  reverse angle: the doorway to the hall, hood light raking the wall in bands, the spill on the hall floor, the hall to
                black. Marina at anchors.doorway.marina; ring>0 hangs her last full stop in the empty doorway (front). 'Angelo.' perforation.
     'standoff' F11: ~92% ink, the back door a night-blue rectangle (backDoor swings it open onto the yard), the hood cone with Angelo
                at its edge, the stove with four knobs, Deena's pool/handprint/cigarette, the jacket (mid), 'Scott.' and 'Angelo.'
                burned into the walls. One 50 s take: cams.standoff.push(u), 0.97 -> 1.0 with the 2.39 -> 2.76 squeeze.

   STATE (all optional; defaults in SETS.kitchen.defaults; K.normState coerces strings: knobs '4', backDoor 'open'|'closed'|'0.4')
     knobs 4|2 (2 = positions 2 and 3 gone)   ovenOpen 0..1 (1 = F09's door angle)   gas 0..1 (haze strength; more strips as it rises)
     hoodFlicker 0..1 (dips/buzz of the hood light; K.hoodLevel(t, st) returns the same 0.3..1 level for character rims)
     blood 0..1 (pool grows from the throat)   handprint 0..1 (knockout depth)   jacket 0..1 (0 none, 0..1 being lowered, 1 laid)
     cig 0|1   perforations 0..1 ('Scott.'/'Angelo.' + loose pinholes: more holes, deeper, as it grows; 24 steps)
     backDoor 'open'|'closed'|0..1   sway 0..1 (rising dread: paper layers drift and shiver on twos; front layers move most)
     pull 0..1 (Scott drags the stove off the wall: it shifts and tips; animate with jerks)
     thud 0..1 (an impulse: 1 at the moment "something heavy shifts inside", decayed to 0 over ~0.3 s by the sequence: the oven door
                jolts ~3.6 px, the handle rattles, the shut door's seam flashes hoodMid while thud > 0.55; K.at(...'ovenHandle') follows)
     knives 5|4   ring 0..1 (doorway)   occluders [Path2D | {path, keep}]

   ANCHORS / LIGHT / CAMS (world coords of each view): SETS.kitchen.anchors[view], SETS.kitchen.light[view], SETS.kitchen.cams[view]
     Dynamic: K.at(view, 'ovenHandle'|'crack'|'doorTop'|'hb0'|'hb1', st) for 'stove'/'oven', K.at('knobs', 'ovenHandle'|'doorTop', st)
     (they follow ovenOpen, pull and thud). K.persp.entry / standoff / floor: {P(X,h,z)->[x,y], zAt(yFeet), scaleAt(yFeet)}.
   HELPERS  K.ovenShadow(g, {quad:[TL,TR,BR,BL], foldY, pool:{x,y,r,sy,rot}, k}) draws the cavity + Christof's folded paper-doll
            shadow onto any wall quad (folding onto the ceiling above foldY). K.foldedShape() = the body in cavity units (0..6 x 0..4).
            K.deenaLying(view, o) = Deena's lying Shape (F11 pose) for placeholders. K.jacketShape(u) = the jacket in her lying frame.
            K.knock(c, path, depth) cuts a knockout under the current camera. K.clip(view) = the lit region Path2D (for rim clipping).
   ENGINE HINT  every hole this set cuts also unions its SCREEN rect into c.f.holeBox = {x0,y0,x1,y1}, so the compositor could
            composite holes inside it only (the hole pass costs ~35 ms per frame whenever any hole exists).
   Deterministic. Ember (#FF9440) is never painted: the Extra's marks are knockouts only. */
(function () {
  'use strict';
  const O = window.OTM, { C, W, H, S } = O;
  const SETS = window.SETS = window.SETS || {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const L2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const poly = pts => S().poly(pts);
  const P2 = pts => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; };
  const sm = (pts, closed) => O.fig.smooth(pts, closed);
  const smooth01 = u => u * u * (3 - 2 * u);
  const rgba = O.rgba, mix = O.mix;
  const INK2 = '#0B0807', VOID = '#030202', CORE = '#FFF4CC';
  const ones = t => Math.floor(t * 24 + 1e-6) / 24, twos = t => Math.floor(t * 12 + 1e-6) / 12;
  const wob = (t, hz, seed) => O.vnoise(t * hz, 0.5, seed | 0) * 2 - 1;
  const norm2 = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

  // ================================================================ state
  const DEFAULTS = { knobs: 2, ovenOpen: 0, gas: 0.45, hoodFlicker: 0, blood: 0, handprint: 0, jacket: 0, cig: 0, perforations: 0,
    backDoor: 0, sway: 0, pull: 0, thud: 0, knives: 5, ring: 0, occluders: null };
  function normState(st) {
    const s = Object.assign({}, DEFAULTS, st || {});
    // strings are coerced: backDoor 'open'|'closed'|'0.5', knobs '4', knives '4', any numeric state as a string
    const bd = typeof s.backDoor === 'string' ? s.backDoor.trim().toLowerCase() : s.backDoor;
    s.backDoor = bd === 'open' ? 1 : bd === 'closed' ? 0 : clamp(bd === true ? 1 : +bd || 0, 0, 1);
    s.knobs = Math.round(+s.knobs) === 4 ? 4 : 2; s.knives = Math.round(+s.knives) === 4 ? 4 : 5;
    ['ovenOpen', 'gas', 'hoodFlicker', 'blood', 'handprint', 'jacket', 'cig', 'perforations', 'sway', 'pull', 'thud', 'ring'].forEach(k => { s[k] = clamp(s[k] === true ? 1 : +s[k] || 0, 0, 1); });
    return s;
  }
  // the hood light's level 0.3..1: a fine buzz plus occasional local dips (gated slow noise: well under 3 dips a second)
  function hoodLevel(t, st) {
    const f = (st && st.hoodFlicker) || 0; if (f <= 0) return 1; const tt = ones(t);
    const buzz = 1 - 0.1 * f * O.vnoise(tt * 17, 3.1, 501);
    const gate = O.vnoise(tt * 1.9, 7.7, 502);
    const dip = gate > 1 - 0.36 * f ? 0.42 + 0.22 * O.vnoise(tt * 9, 1, 503) : 1;
    return Math.max(0.3, buzz * dip);
  }

  // ================================================================ drawing helpers
  const _tmp = {};
  function tmpCtx(w, h) { const k = w + 'x' + h; let g = _tmp[k]; if (!g) g = _tmp[k] = O.makeCanvas(w, h).getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none'; g.clearRect(0, 0, w, h); return g; }
  // rim crescent on the lit side only (transform-aware). o: {fade:{x,y,r0,r1}, clip: Path2D, alpha}
  function rim(g, path, dir, w, color, o) {
    o = o || {}; const cw = g.canvas.width, ch = g.canvas.height; const tg = tmpCtx(cw, ch); const m = g.getTransform();
    tg.setTransform(m); tg.fillStyle = color; tg.fill(path); tg.globalCompositeOperation = 'destination-out'; tg.translate(-dir[0] * w, -dir[1] * w); tg.fill(path);
    if (o.fade) { tg.setTransform(m); tg.globalCompositeOperation = 'destination-in'; const gr = tg.createRadialGradient(o.fade.x, o.fade.y, o.fade.r0 || 0, o.fade.x, o.fade.y, o.fade.r1); gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)'); tg.fillStyle = gr; tg.fillRect(-4000, -4000, 12000, 12000); }
    if (o.clip) { tg.setTransform(m); tg.globalCompositeOperation = 'destination-in'; tg.fillStyle = '#000'; tg.fill(o.clip); }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = o.alpha == null ? 1 : o.alpha; g.drawImage(tg.canvas, 0, 0); g.restore();
  }
  // cheap per-frame rim for small props: colour, then ink nudged away from the light (the prop shifts by w px: invisible)
  function rim2(g, path, dir, w, color, fill) { g.fillStyle = color; g.fill(path); g.save(); g.translate(-dir[0] * w, -dir[1] * w); g.fillStyle = fill || C.ink; g.fill(path); g.restore(); }
  // every full-frame layer is cached with a margin (the kitchen's 1.5-3 px shake plus the sway must never uncover an ink seam);
  // the drawBack functions paint well past 0..W x 0..H
  const MARGIN = 24, FULL = (h, m) => ({ x: -(m || MARGIN), y: -(m || MARGIN), w: W + 2 * (m || MARGIN), h: (h || H) + 2 * (m || MARGIN) });
  // a cached layer covering only the rect r = {x, y, w, h} of the view's world (cheap to blit: no full-frame copies)
  function crop(c, key, fn, r, res) {
    res = res || 1;
    const cv = c.cache('kitchen.' + key, g => { if (res !== 1) g.scale(res, res); g.translate(-r.x, -r.y); fn(g); }, Math.ceil(r.w * res), Math.ceil(r.h * res));
    return { cv, r };
  }
  function putC(c, L, j) { c.g.drawImage(L.cv, L.r.x + (j ? j[0] : 0), L.r.y + (j ? j[1] : 0), L.r.w, L.r.h); }
  // sway + boil: slow drift and a stepped 6 Hz shiver, on twos, in whole pixels (paper layers not glued down); k = layer depth
  function jit(t, st, k, seed) {
    const s = st.sway || 0; if (s < 0.002 || !k) return null; const tt = twos(t), step = Math.floor(tt * 6);
    return [Math.round(k * s * (3.4 * wob(tt, 0.33, seed) + 1.3 * (O.vnoise(step, 0.5, seed + 5) * 2 - 1))),
      Math.round(k * s * (2.6 * wob(tt, 0.29, seed + 9) + 1.3 * (O.vnoise(step, 1.5, seed + 5) * 2 - 1)))];
  }
  // knockouts under the current camera (the holes buffer is screen space)
  function knock(c, path, depth) { const h = c.f.holes; h.save(); h.setTransform(c.g.getTransform()); c.f.knockout(path, depth); h.restore(); }
  // erase the holes a figure covers. keep (optional Path2D, same coords) is spared: e.g. a throat knockout already cut on that figure.
  function occlude(c, path, keep) {
    const h = c.f.markHoles(); h.save(); h.setTransform(c.g.getTransform()); h.globalCompositeOperation = 'destination-out'; h.fillStyle = '#000';
    if (keep) { const m = new Path2D(); m.rect(-1e5, -1e5, 2e5, 2e5); m.addPath(keep); h.clip(m, 'evenodd'); }
    h.fill(path); h.restore();
  }
  function dimPath(g, path, lvl, k) { if (lvl >= 0.999) return; g.save(); g.fillStyle = rgba(C.ink, (1 - lvl) * (k || 0.7)); g.fill(path); g.restore(); }

  // gas haze: flat gas-blue strips that drift and shimmer; more rows appear as the gas thickens
  const _haze = {};
  function haze(g, t, o, amt) {
    if (!(amt > 0.01)) return;
    let rows = _haze[o.seed];
    if (!rows) {
      const R = O.rng('kh' + o.seed); rows = []; const span = o.x1 - o.x0;
      for (let i = 0; i < o.rows; i++) {
        const segs = []; let x = R() * 40;
        while (x < span + 260) { const w = (o.wmin || 20) + R() * (o.wvar || 110); segs.push([x, w, (o.a0 || 0.1) + R() * (o.a1 || 0.14), (o.h0 || 2) + R() * (o.h1 || 3), R() * 6]); x += w + (o.gap || 10) + R() * (o.gapv || 40); }
        rows.push({ y: o.y0 + (o.y1 - o.y0) * (o.rows > 1 ? i / (o.rows - 1) : 0.5) + (R() - 0.5) * 8, segs, len: x, sp: (R() < 0.5 ? -1 : 1) * (5 + R() * 12), cut: (o.taper || 0) * i, need: R() });
      }
      _haze[o.seed] = rows;
    }
    const tt = ones(t); g.save(); if (o.clip) g.clip(o.clip);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]; if (row.need > 0.3 + amt * 0.9) continue;
      const off = ((row.sp * tt) % row.len + row.len) % row.len, xa = o.x0 + row.cut, xb = o.x1 - row.cut;
      for (const s of row.segs) {
        const x = o.x0 + ((s[0] + off) % row.len) - 130, w = s[1]; if (x > xb || x + w < xa) continue;
        const x0 = Math.max(x, xa), x1 = Math.min(x + w, xb), y = row.y + Math.sin(x * 0.02 + i * 1.7 + tt * 1.6 + s[4]) * (3 + 3 * amt);
        g.fillStyle = rgba(C.gasBlue, Math.min(0.55, s[2] * (0.3 + 0.9 * amt) * (o.alpha || 1))); g.fillRect(x0, y, x1 - x0, s[3]);
      }
    }
    g.restore();
  }
  // dust motes drifting down a light cone, parametrised in the cone's quad so they never leave it
  const _motes = {};
  function motes(g, t, quad, n, color, seed, alpha) {
    let M = _motes[seed];
    if (!M) { const R = O.rng('km' + seed); M = []; for (let i = 0; i < n; i++) M.push([R(), R(), 0.25 + R() * 0.5, 0.8 + R() * 1.8, (R() - 0.5) * 0.012, 0.006 + R() * 0.02]); _motes[seed] = M; }
    const tt = ones(t); g.save(); g.fillStyle = color;
    for (const m of M) {
      const u = ((m[0] + m[4] * tt) % 1 + 1) % 1, v = ((m[1] + m[5] * tt) % 1 + 1) % 1;
      const p = L2(L2(quad[0], quad[1], u), L2(quad[3], quad[2], u), v);
      g.globalAlpha = m[2] * (alpha == null ? 1 : alpha) * Math.sin(Math.PI * v); g.fillRect(p[0], p[1], m[3], m[3]);
    }
    g.restore();
  }
  function wedgePath(apex, a0, a1, R) {
    const p = new Path2D(); p.moveTo(apex[0], apex[1]); const n = 14;
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.lineTo(apex[0] + Math.cos(a) * R, apex[1] + Math.sin(a) * R); }
    p.closePath(); return p;
  }
  function solve(A, b) { const n = b.length; for (let i = 0; i < n; i++) { let m = i; for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]]; for (let k = i + 1; k < n; k++) { const q = A[k][i] / A[i][i]; for (let j = i; j < n; j++) A[k][j] -= q * A[i][j]; b[k] -= q * b[i]; } } const x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; } return x; }
  function homography(src, dst) { const A = [], b = []; for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); } const h = solve(A, b); return (x, y) => { const w = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]; }; }
  const warp = (sh, fn, step) => { const s = S(); s.polys = sh.polys.map(p => O.resample(p, step || 0.05).map(([x, y]) => fn(x, y))); return s; };
  function persp(o) { const K = z => o.FL / z; return { o, K, P: (X, h, z) => [o.VPX + X * K(z), o.HZ + (o.EYE - h) * K(z)], zAt: y => o.EYE * o.FL / (y - o.HZ), scaleAt: y => 0.235 * (y - o.HZ) / o.EYE }; }
  // a checker floor in perspective: ink tiles over whatever light is already on the floor
  function checker(g, P, TS, z0, z1, x0, x1, alpha, phase) {
    g.fillStyle = rgba(C.ink, alpha == null ? 0.46 : alpha);
    for (let zi = 0; ; zi++) {
      const za = z0 - zi * TS, zb = z0 - (zi + 1) * TS; if (zb < z1) break;
      for (let xi = Math.floor(x0 / TS); xi < Math.ceil(x1 / TS); xi++) {
        if (((xi + zi + (phase || 0)) % 2 + 2) % 2 === 0) continue;
        g.fill(P2([P(xi * TS, 0, za), P((xi + 1) * TS, 0, za), P((xi + 1) * TS, 0, zb), P(xi * TS, 0, zb)]));
      }
    }
  }

  // ================================================================ Christof: the folded paper doll (F09), cavity box 0..6 x 0..4
  let _folded = null;
  function folded() {
    if (_folded) return _folded;
    const sh = S();
    sh.add(sm([[5.55, 0.95], [4.6, 0.1], [3.5, 0.0], [2.3, 0.0], [1.5, 0.05], [1.05, 0.5], [1.0, 1.08], [1.4, 1.36], [2.4, 1.3], [3.6, 1.24], [4.8, 1.4], [5.5, 1.7]], true));
    sh.add(sm([[5.2, 0.85], [5.85, 1.1], [5.98, 1.9, 1], [5.98, 2.9, 1], [5.6, 3.62], [5.0, 3.58], [5.25, 2.2]], true));
    sh.capsule(5.2, 3.2, 0.5, 3.3, 3.42, 0.36);
    sh.capsule(3.3, 3.42, 0.32, 1.6, 3.5, 0.23);
    sh.add(sm([[1.8, 3.24], [1.35, 3.2], [0.85, 3.38], [0.55, 3.68, 1], [0.66, 3.92, 1], [1.85, 3.9, 1]], true));
    sh.capsule(3.3, 3.34, 0.28, 3.95, 2.45, 0.19); sh.capsule(3.95, 2.45, 0.19, 4.7, 2.72, 0.15);
    sh.capsule(1.3, 1.0, 0.36, 2.0, 1.55, 0.27);
    const a = 2.75, k = 1.42, hm = [k * Math.cos(a), k * Math.sin(a), -k * Math.sin(a), k * Math.cos(a), 2.35, 2.2];
    sh.add(O.fig.headProfile(O.fig.CHAR.christof.face).transform(hm));
    sh.add(O.fig.hairProfile('christof', {}, 2).transform(hm));
    sh.capsule(1.1, 0.95, 0.3, 0.42, 1.72, 0.21);
    sh.capsule(0.42, 1.72, 0.2, 0.62, 2.45, 0.15);
    sh.add(O.fig.hand('splay', { spread: 0.28 }).transform([0.2, 0.62, -0.62, 0.2, 0.62, 2.45]));
    sh.polys = sh.polys.map(p => O.resample(p, 0.04).map(([x, y]) => [Math.max(Math.min(x, 5.98), 0.06), Math.max(Math.min(y, 3.92), 0.1)]));
    return (_folded = sh);
  }
  const foldFn = foldY => foldY == null ? ((x, y) => [x, y]) : ((x, y) => y < foldY ? [x - (foldY - y) * 0.6, foldY - (foldY - y) * 1.3] : [x, y]);
  // the oven bulb's throw: the cavity projected on a wall quad (folding onto the ceiling above foldY) with the body's shadow in it
  function ovenShadow(g, o) {
    const k = o.k || 1, fold = foldFn(o.foldY), Hm = homography([[0, 0], [6, 0], [6, 4], [0, 4]], o.quad), fn = (x, y) => fold(...Hm(x, y));
    const boxP = warp(poly([[-0.08, -0.08], [6.08, -0.08], [6.08, 4.08], [-0.08, 4.08]]), fn, 0.1).path(2.0 * k, 8);
    g.save(); g.clip(boxP);
    g.fillStyle = mix(C.hoodLow, C.ink, 0.62); g.fillRect(-4000, -4000, 12000, 12000);
    const pl = o.pool; O.lightPool(g, pl.x, pl.y, [{ r: pl.r, color: C.hoodLow }, { r: pl.r * 0.78, color: C.hoodMid }, { r: pl.r * 0.5, color: C.hood }], { sy: pl.sy || 0.55, rot: pl.rot == null ? -0.2 : pl.rot, rough: 3 * k, seed: 5 });
    const shP = warp(folded(), fn).path(1.8 * k, 31);
    g.strokeStyle = rgba(C.ink, 0.5); g.lineWidth = 12 * k; g.lineJoin = 'round'; g.stroke(shP);   // penumbra of a small bulb
    g.fillStyle = mix(C.ink, C.hoodLow, 0.1); g.fill(shP);
    g.restore();
    return { boxP, shP, fn };
  }

  // ================================================================ the oven (F09 construction), shared by 'stove' and 'oven'
  function ovenRig(SF, k) {
    const atF = (u, v) => L2(L2([SF.l, SF.lt], [SF.r, SF.rt], u), L2([SF.l, SF.lb], [SF.r, SF.rb], u), v);
    const mouth = [atF(0.08, 0.3), atF(0.92, 0.3), atF(0.92, 0.9), atF(0.08, 0.9)];
    const DTL = [mouth[0][0] - 64 * k, mouth[0][1] + 40 * k], DTR = [mouth[1][0] - 24 * k, mouth[1][1] + 30 * k];
    const BL = [mouth[3][0] - 3 * k, mouth[3][1] + 5 * k], BR = [mouth[2][0] + 4 * k, mouth[2][1] + 6 * k];
    const T0c = atF(0.065, 0.275), T1c = atF(0.935, 0.275);
    // th = the thud (0..1, an impulse the sequence decays over ~0.3 s): the door jolts down ~3.6 px and the handle rattles
    function door(u, th) {
      u = clamp(u, 0, 1); const J = jolt(th, k), sh = p => [p[0] + J.door[0], p[1] + J.door[1]];
      const T0 = sh(L2(T0c, DTL, u)), T1 = sh(L2(T1c, DTR, u)), bl = sh(BL), br = sh(BR);
      const a = L2(T0, bl, 0.1), b = L2(T1, br, 0.1), rh = p => [p[0] + J.handle[0], p[1] + J.handle[1]], hb0 = rh(L2(a, b, 0.12)), hb1 = rh(L2(a, b, 0.88));
      return { u, th: th || 0, T0, T1, BL: bl, BR: br, hb0, hb1, handle: L2(hb0, hb1, 0.82), crack: L2(T0, T1, 0.5), quad: [T0, T1, br, bl] };
    }
    return { SF, atF, mouth, door, k };
  }
  // the thud's jolt: a function of the (decaying) thud value only, so K.at() and the drawing agree; scale k px per world px
  function jolt(th, k) {
    th = clamp(+th || 0, 0, 1); if (th <= 0.001) return { door: [0, 0], handle: [0, 0] }; k = k || 1;
    return { door: [Math.sin(th * 31) * 1.2 * th * k, 3.6 * th * k], handle: [Math.sin(th * 47 + 1) * 2.2 * th * k, Math.cos(th * 39) * 1.4 * th * k] };
  }
  function drawOven(g, E, rig, u, lvl, th) {
    const m = rig.mouth, d = rig.door(u, th), k = rig.k;
    if (u > 0.002) {
      g.fillStyle = C.hood; g.fill(P2(m));
      g.fillStyle = CORE; g.fill(P2([L2(m[0], m[1], 0.2), L2(m[0], m[1], 0.85), L2(L2(m[0], m[3], 0.1), L2(m[1], m[2], 0.1), 0.8), L2(L2(m[0], m[3], 0.13), L2(m[1], m[2], 0.13), 0.25)]));
      E.save(); E.globalAlpha = clamp(u * 8, 0, 1) * (0.85 + 0.15 * lvl); E.fillStyle = C.hood; E.fill(P2([m[0], m[1], d.T1, d.T0])); E.restore();
      g.strokeStyle = C.ink; g.lineWidth = 3 * k; const r0 = L2(m[0], m[3], 0.09), r1 = L2(m[1], m[2], 0.09);
      g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(r1[0], r1[1]); g.stroke();
      g.lineWidth = 2 * k; for (let i = 1; i < 16; i++) { const p = L2(r0, r1, i / 16); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] - 6 * k, p[1] + 30 * k); g.stroke(); }
    }
    g.fillStyle = C.ink; g.fill(poly(d.quad).path(0.4 * k, 9));
    const flash = u <= 0.002 && d.th > 0.55;   // the thud: the shut door's seam flashes for the frames the impulse is high
    g.strokeStyle = u > 0.002 ? C.hood : flash ? C.hoodMid : rgba(C.hoodLow, 0.9); g.lineWidth = (u > 0.002 ? 3 : flash ? 2.6 : 1.5) * k;
    g.beginPath(); g.moveTo(d.T0[0], d.T0[1]); g.lineTo(d.T1[0], d.T1[1]); g.stroke();
    g.lineCap = 'round'; g.strokeStyle = '#1C1511'; g.lineWidth = 9 * k; g.beginPath(); g.moveTo(d.hb0[0], d.hb0[1]); g.lineTo(d.hb1[0], d.hb1[1]); g.stroke();
    g.strokeStyle = C.hoodMid; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(d.hb0[0], d.hb0[1] - 4 * k); g.lineTo(d.hb1[0], d.hb1[1] - 4 * k); g.stroke();
    g.lineCap = 'butt';
    return d;
  }
  const KU = [0.17, 0.39, 0.61, 0.83];
  function knobsSmall(g, rig, n) {
    KU.forEach((u, i) => {
      const p = rig.atF(u, 0.13), s = (0.9 + u * 0.35) * rig.k;
      if (n === 2 && (i === 1 || i === 2)) { g.fillStyle = VOID; g.beginPath(); g.ellipse(p[0], p[1], 9 * s, 11 * s, 0, 0, 7); g.fill(); g.fillStyle = C.hoodMid; g.fillRect(p[0] - 1.5 * rig.k, p[1] - 6 * s, 3 * rig.k, 9 * s); }
      else { g.fillStyle = '#1A1310'; g.beginPath(); g.ellipse(p[0], p[1], 17 * s, 19 * s, 0, 0, 7); g.fill(); g.strokeStyle = C.hoodMid; g.lineWidth = 3 * rig.k; g.beginPath(); g.ellipse(p[0], p[1], 17 * s, 19 * s, 0, -2.8, -0.5); g.stroke(); g.fillStyle = C.hoodMid; g.fillRect(p[0] - 2 * rig.k, p[1] - 15 * s, 4 * rig.k, 12 * s); }
    });
  }

  // ================================================================ the Extra's perforations ('Scott.', 'Angelo.' and loose pinholes)
  const PSPEC = {
    standoff: { words: [
      { str: 'Scott.', x: 600, y: 392, fo: { family: 'Oswald', weight: 500, size: 168, tracking: 4 }, o: { seed: 'v1', step: 4, keep: 0.62, rmin: 0.7, rmax: 1.7, dmin: 0.22, dmax: 0.75, scorch: 0.55 } },
      { str: 'Angelo.', x: 62, y: 664, fo: { family: 'Libre Franklin', weight: 500, size: 70 }, o: { seed: 'v2', step: 4, keep: 0.5, rmin: 0.6, rmax: 1.4, dmin: 0.18, dmax: 0.55, scorch: 0.4 } }],
      loose: { n: 90, seed: 'f11loose', y0: 150, y1: 746, skip: (x, y) => Math.hypot((x - 1607) / 1.1, y - 378) < 420 || (x > 300 && x < 552 && y > 252) } },
    counter: { words: [{ str: 'Scott.', x: 70, y: 304, fo: { family: 'Oswald', weight: 500, size: 190, tracking: 4 }, o: { seed: 'c1', step: 4, keep: 0.58, rmin: 0.7, rmax: 1.8, dmin: 0.2, dmax: 0.7, scorch: 0.5 } }],
      loose: { n: 60, seed: 'ctloose', y0: 60, y1: 590, skip: (x, y) => x > 1100 && y > 330 } },
    entry: { words: [{ str: 'Scott.', x: 652, y: 446, fo: { family: 'Oswald', weight: 500, size: 74, tracking: 2 }, o: { seed: 'e1', step: 3, keep: 0.6, rmin: 0.5, rmax: 1.1, dmin: 0.2, dmax: 0.6, scorch: 0.45 } },
      { str: 'Angelo.', x: 330, y: 640, fo: { family: 'Libre Franklin', weight: 500, size: 34 }, o: { seed: 'e2', step: 3, keep: 0.5, rmin: 0.45, rmax: 0.9, dmin: 0.15, dmax: 0.45, scorch: 0.35 } }],
      loose: { n: 50, seed: 'enloose', y0: 280, y1: 700, skip: (x, y) => x < 330 || x > 1680 || (x > 1360 && y > 380) || (x > 420 && x < 610 && y > 340) } },
    doorway: { words: [{ str: 'Angelo.', x: 372, y: 652, fo: { family: 'Libre Franklin', weight: 500, size: 84 }, o: { seed: 'd2', step: 3, keep: 0.56, rmin: 0.7, rmax: 1.6, dmin: 0.26, dmax: 0.66, scorch: 0.5 } }],
      loose: { n: 70, seed: 'dwloose', y0: 120, y1: 940, skip: (x, y) => x > 730 && x < 1150 && y > 150 } },
  };
  const _perf = {};
  function perfDots(view) {
    if (_perf[view]) return _perf[view];
    const spec = PSPEC[view], dots = [];
    spec.words.forEach(wd => {
      const fo = wd.fo, o = wd.o; const mc = O.makeCanvas(8, 8).getContext('2d'); mc.font = O.font(fo); mc.letterSpacing = (fo.tracking || 0) + 'px';
      const mw = mc.measureText(wd.str).width; const ox = 30, oy = Math.ceil(fo.size * 1.05); const cw = Math.ceil(mw + 80), ch = Math.ceil(fo.size * 1.4);
      const pg = O.makeCanvas(cw, ch).getContext('2d'); pg.font = O.font(fo); pg.letterSpacing = (fo.tracking || 0) + 'px'; pg.fillStyle = '#fff'; pg.fillText(wd.str, ox, oy);
      const d = pg.getImageData(0, 0, cw, ch).data; const A = (px, py) => (px < 0 || py < 0 || px >= cw || py >= ch) ? 0 : d[(py * cw + px) * 4 + 3];
      const r = O.rng(o.seed), st = o.step || 5;
      for (let py = 0; py < ch; py += st) for (let px = 0; px < cw; px += st) {
        const jx = px + Math.round((r() - 0.5) * st * 0.8), jy = py + Math.round((r() - 0.5) * st * 0.8);
        if (A(jx, jy) < 128) continue;
        const e = A(jx + 3, jy) < 128 || A(jx - 3, jy) < 128 || A(jx, jy + 3) < 128 || A(jx, jy - 3) < 128;
        if (!e && r() > (o.inner || 0)) continue;
        if (r() > (o.keep || 0.7)) continue;
        const rad = (o.rmin || 0.8) + r() * ((o.rmax || 2) - (o.rmin || 0.8));
        // burn order: the word's strokes appear scattered, slightly left to right
        dots.push({ x: wd.x - ox + jx, y: wd.y - oy + jy, rx: rad, ry: rad * (0.75 + r() * 0.5), rot: r() * 3, d: (o.dmin || 0.35) + r() * ((o.dmax || 0.9) - (o.dmin || 0.35)), b: 0.02 + 0.25 * (jx / cw) + 0.7 * r() });
      }
    });
    if (spec.loose) { const L = spec.loose, r = O.rng(L.seed); let k = 0, tries = 0; while (k < L.n && tries < L.n * 30) { tries++; const x = r() * W, y = L.y0 + r() * (L.y1 - L.y0); if (L.skip && L.skip(x, y)) continue; const rad = 0.6 + r() * 1.2; dots.push({ x, y, rx: rad, ry: rad, rot: 0, d: 0.15 + r() * 0.55, b: 0.15 + 0.85 * r(), loose: true }); k++; } }
    return (_perf[view] = { dots, words: spec.words });
  }
  function scorchRect(view) {
    const spec = PSPEC[view]; if (spec._r) return spec._r; const m = O.makeCanvas(8, 8).getContext('2d'); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    spec.words.forEach(wd => { m.font = O.font(wd.fo); m.letterSpacing = (wd.fo.tracking || 0) + 'px'; const w = m.measureText(wd.str).width; x0 = Math.min(x0, wd.x - 20); x1 = Math.max(x1, wd.x + w + 20); y0 = Math.min(y0, wd.y - wd.fo.size * 1.05); y1 = Math.max(y1, wd.y + wd.fo.size * 0.3); });
    return (spec._r = { x: Math.floor(x0), y: Math.floor(y0), w: Math.ceil(x1 - x0), h: Math.ceil(y1 - y0) });
  }
  function drawScorch(c, view, p) {
    const spec = PSPEC[view]; if (!spec || p <= 0.001) return;
    const L = crop(c, 'scorch.' + view, g => { spec.words.forEach(wd => { g.save(); g.filter = 'blur(3px)'; g.globalAlpha = wd.o.scorch || 0.5; g.font = O.font(wd.fo); g.letterSpacing = (wd.fo.tracking || 0) + 'px'; g.fillStyle = '#2A120A'; g.fillText(wd.str, wd.x, wd.y); g.restore(); }); }, scorchRect(view));
    c.g.save(); c.g.globalAlpha = clamp(p * 1.4, 0, 1); putC(c, L); c.g.restore();
  }
  // the holes grow in 24 steps. The words' holes live in ONE small mask canvas per view (2x res, redrawn only when the step
  // changes); the ~50-90 loose pinholes are a handful of Path2D fills. Per frame this is one drawImage into the holes buffer.
  const _perfMask = {}, _loose = {};
  function drawPerf(c, view, p) {
    if (!PSPEC[view] || p <= 0.001) return; drawScorch(c, view, p);
    const q = Math.max(1, Math.round(p * 24)), pq = q / 24, P = perfDots(view), sr = scorchRect(view), R = { x: sr.x - 8, y: sr.y - 8, w: sr.w + 16, h: sr.h + 16 };
    let M = _perfMask[view];
    if (!M) { const res = 2, cv = O.makeCanvas(Math.ceil(R.w * res), Math.ceil(R.h * res)); M = _perfMask[view] = { cv, g: cv.getContext('2d'), res, q: -1 }; }
    if (M.q !== q) {
      const g = M.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, M.cv.width, M.cv.height); g.setTransform(M.res, 0, 0, M.res, -R.x * M.res, -R.y * M.res);
      const B = [0, 1, 2, 3, 4, 5].map(() => new Path2D());
      for (const d of P.dots) { if (d.loose || d.b > pq) continue; const bi = Math.min(5, Math.floor(d.d * 6)); B[bi].moveTo(d.x + d.rx * Math.cos(d.rot), d.y + d.rx * Math.sin(d.rot)); B[bi].ellipse(d.x, d.y, d.rx, d.ry, d.rot, 0, 6.2832); }
      g.fillStyle = '#fff'; B.forEach((pa, i) => { g.globalAlpha = ((i + 0.5) / 6) * (0.45 + 0.55 * pq); g.fill(pa); }); g.globalAlpha = 1; M.q = q;
    }
    const key = view + ':' + q; let LB = _loose[key];
    if (!LB) { LB = _loose[key] = [0, 1, 2, 3, 4, 5].map(() => new Path2D()); LB.any = false; for (const d of P.dots) { if (!d.loose || d.b > pq) continue; const bi = Math.min(5, Math.floor(d.d * 6)); LB[bi].moveTo(d.x + d.rx, d.y); LB[bi].ellipse(d.x, d.y, d.rx, d.ry, 0, 0, 6.2832); LB.any = true; } }
    const h = c.f.markHoles(); h.save(); h.setTransform(c.g.getTransform()); h.imageSmoothingEnabled = true; h.drawImage(M.cv, R.x, R.y, R.w, R.h);
    if (LB.any) { h.fillStyle = '#fff'; LB.forEach((pa, i) => { h.globalAlpha = ((i + 0.5) / 6) * (0.45 + 0.55 * pq); h.fill(pa); }); }
    h.restore();
    const lo = PSPEC[view].loose; noteHole(c, lo ? { x: Math.min(R.x, 0), y: Math.min(R.y, lo.y0 - 3), w: Math.max(R.x + R.w, W) - Math.min(R.x, 0), h: Math.max(R.y + R.h, lo.y1 + 3) - Math.min(R.y, lo.y0 - 3) } : R);
  }
  // a hint for the engine's compositor: the union, in SCREEN pixels, of every hole rect this set cut this frame (c.f.holeBox =
  // {x0,y0,x1,y1}). The engine can composite holes inside it only. It is reset whenever c.f is a new frame object.
  function noteHole(c, r) {
    const f = c.f; if (!f) return; const m = c.g.getTransform(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].forEach(([x, y]) => { const X = m.a * x + m.c * y + m.e, Y = m.b * x + m.d * y + m.f; x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y); });
    const b = f.holeBox; f.holeBox = b ? { x0: Math.min(b.x0, x0), y0: Math.min(b.y0, y0), x1: Math.max(b.x1, x1), y1: Math.max(b.y1, y1) } : { x0, y0, x1, y1 };
  }

  // ================================================================ blood, the handprint, the jacket, the ring, chairs
  function poolShape(cx, cy, rx, ry, seed) {
    const pts = [], N = 60; for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; const k = 0.6 + 0.8 * O.fbm(Math.cos(a) * 1.9 + 3, Math.sin(a) * 1.9 + 7, seed, 3) + 0.12 * Math.sin(a * 3 + seed); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    return sm(pts, true);
  }
  // o: {src:[x,y] where it starts, x, y, rx, ry (full size), seed, light:{x,y}, lip, dark (F11: near-black, red only at the edge)}
  // Blood is always darker than wine: thin edges in C.blood, the deep middle nearly ink, a wet lip of the hood light on the far edge.
  const _pools = {};
  function drawPool(g, o, amt) {
    if (amt <= 0.01) return null; const q = Math.max(1, Math.round(amt * 48)), k = Math.sqrt(q / 48), key = o.seed + ':' + q; const cx = lerp(o.src[0], o.x, k), cy = lerp(o.src[1], o.y, k);
    const P = _pools[key] || (_pools[key] = [poolShape(cx, cy, o.rx * k, o.ry * k, o.seed).path(1, o.seed), poolShape(cx + o.rx * 0.02 * k, cy - o.ry * 0.03 * k, o.rx * (o.dark ? 0.88 : 0.88) * k, o.ry * (o.dark ? 0.72 : 0.78) * k, o.seed + 3).path(1, o.seed + 1)]);
    const p = P[0];
    const dir = norm2(o.light.x - cx, o.light.y - cy), lw = o.lip || 2.2;
    g.save(); g.globalAlpha = 0.9; g.fillStyle = C.hood; g.fill(p); g.restore();
    g.save(); g.translate(-dir[0] * lw, -dir[1] * lw); g.fillStyle = o.dark ? mix(C.blood, C.ink, 0.42) : mix(C.blood, C.ink, 0.15); g.fill(p); g.restore();
    g.fillStyle = o.dark ? '#080405' : mix(C.blood, C.ink, 0.66);
    g.fill(P[1]);
    return p;
  }
  // the handprint: a hand-shaped cut through the floor where no hand is. at: [x,y], s: px (wrist to fingertip), sq: floor squash, a: angle on the floor
  function handprint(c, at, s, sq, a, depth) {
    if (depth <= 0.01) return; const ca = Math.cos(a), sa = Math.sin(a);
    knock(c, O.fig.hand('splay', { spread: 0.2 }).transform([s * ca, s * sa * sq, -s * sa, s * ca * sq, at[0], at[1]]).path(0.5, 4), depth);
    noteHole(c, { x: at[0] - s * 0.4, y: at[1] - s * 0.6, w: s * 1.8, h: s * 1.2 });
  }
  // Angelo's jacket over Deena, in her lying frame: u = px per head, origin = her hip anchor, head toward +x, floor at y = +0.6u.
  // Her neck is at 2.25..2.6u (throat front ~[2.45u, -0.24u]), chin ~2.65u, head centre 2.89u. The jacket runs from her hips over
  // the chest and the throat; its turned-up collar ends under her chin (2.98u) so the throat is covered and her brow and hair show.
  // A notched lapel breaks the top edge; the near sleeve trails off her shoulder onto the tiles, cuff toward camera.
  const JK = { body: [[0.16, 0.6, 1], [0.05, 0.3], [0.1, -0.08], [0.28, -0.44, 1], [0.6, -0.55], [0.98, -0.51], [1.3, -0.6], [1.66, -0.54], [1.98, -0.62], [2.2, -0.56],
      [2.3, -0.55, 1], [2.38, -0.41, 1], [2.47, -0.6, 1], [2.62, -0.52], [2.77, -0.4, 1], [2.81, -0.18], [2.79, 0.12], [2.7, 0.42], [2.5, 0.6], [2.1, 0.66], [1.6, 0.68], [0.8, 0.66]],
    // the near sleeve: off the shoulder, down onto the tiles beside her head, the cuff in the blood (clear of the handprint)
    arm: [[2.06, 0.26], [2.4, 0.6], [2.84, 0.74], [3.28, 0.79]], armW: [0.13, 0.12, 0.11, 0.1],
    lapel: [[2.38, -0.41], [2.16, -0.06], [1.84, 0.3]], collar: [[2.47, -0.6], [2.6, -0.4], [2.74, -0.28]], fold: [[1.3, -0.6], [1.42, -0.24], [1.34, 0.2]],
    throat: [2.45, -0.24], end: 2.81 };
  // a tube from a centre line and half-widths: outline points (sharp at the cuff)
  function tube(pts, ws) {
    const L = [], R = [];
    pts.forEach((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], d = norm2(b[0] - a[0], b[1] - a[1]), w = ws[i];
      L.push([p[0] - d[1] * w, p[1] + d[0] * w]); R.push([p[0] + d[1] * w, p[1] - d[0] * w]); });
    L[L.length - 1].push(1); R[R.length - 1].push(1); return L.concat(R.reverse());
  }
  function jacketShape(u) {
    const sc = pts => pts.map(p => p.length > 2 ? [p[0] * u, p[1] * u, p[2]] : [p[0] * u, p[1] * u]);
    return S().add(sm(sc(JK.body), true)).add(sm(sc(tube(JK.arm, JK.armW)), true));
  }
  const _jk = {};
  function drawJacket(g, o, j, light) {
    if (j <= 0.01) return null; const u = o.u, jq = Math.round(j * 24) / 24, q = 1 - smooth01(jq), key = [o.x, o.y, u, jq].join(':');
    // being lowered: lifted 1.25 heads and tipped, the sleeve hanging; laid at j = 1
    const J = _jk[key] || (_jk[key] = (() => {
      const tf = sh => sh.rotate(q * 0.22, 1.45 * u, -0.2 * u).translate(o.x - q * 0.35 * u, o.y - q * 1.25 * u);
      const sh = tf(jacketShape(u)), pt = p => { const a = q * 0.22, cx = 1.45 * u, cy = -0.2 * u, x = p[0] * u - cx, y = p[1] * u - cy; return [cx + x * Math.cos(a) - y * Math.sin(a) + o.x - q * 0.35 * u, cy + x * Math.sin(a) + y * Math.cos(a) + o.y - q * 1.25 * u]; };
      return { p: sh.path(0.8, 23), bb: sh.bbox(), pt };
    })());
    const p = J.p, bb = J.bb, pt = J.pt; const dir = norm2(light.x - (bb.x + bb.w / 2), light.y - (bb.y + bb.h / 2));
    // a cast shadow on the tiles under the near drape (the jacket sits a little proud of her)
    g.save(); g.globalAlpha = 0.5 * jq; g.fillStyle = C.ink; g.beginPath(); g.ellipse(...pt([1.55, 0.7]), 1.25 * u, 0.12 * u, 0, 0, 7); g.fill(); g.restore();
    // cloth: one value up from ink so it separates from her silhouette; rim on the lamp side only
    rim2(g, p, dir, o.rimW || 2.5, o.rimColor || C.hoodMid, '#16110E');
    g.save(); g.clip(p); g.lineCap = 'round'; g.lineJoin = 'round';
    const line = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach((p0, i) => { const a = pt(p0); i ? g.lineTo(a[0], a[1]) : g.moveTo(a[0], a[1]); }); g.stroke(); };
    line(JK.lapel, rgba(C.hoodLow, 0.95), Math.max(1.5, u * 0.022));          // the lapel's edge, from the notch down across her chest
    line(JK.collar, rgba(C.hoodMid, 0.8), Math.max(1.5, u * 0.02));           // the turned-up collar against her chin
    line(JK.fold, rgba(C.ink, 0.9), Math.max(2, u * 0.035));                   // a deep fold over her ribs
    line([[2.0, 0.18], [2.3, 0.36], [2.5, 0.5]], rgba(C.ink, 0.85), Math.max(2, u * 0.03));   // the shoulder seam where the sleeve leaves the body
    g.restore();
    // the cuff's opening, a lip of light across the sleeve's end
    const e = JK.arm[JK.arm.length - 1], w = JK.armW[JK.armW.length - 1], c0 = pt([e[0] - 0.02, e[1] - w]), c1 = pt([e[0] + 0.02, e[1] + w]);
    g.save(); g.strokeStyle = C.hoodLow; g.globalAlpha = 0.85; g.lineWidth = Math.max(1.5, u * 0.022); g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(c1[0], c1[1]); g.stroke(); g.restore();
    return p;
  }
  // Deena lying on her back, head toward +x (F11's pose). Returns a Shape (for placeholders and the choreographers' reference).
  function deenaLying(x, y, u) {
    const d = O.fig.profile('deena', { x: 0, y: 0, scale: u, facing: -1, anchor: 'hip', lean: 0, neck: -0.2, head: -0.5, swing: -3.0,
      armN: { a: -0.05, b: 0.1, hand: 'relaxed' }, armF: { a: -0.05, b: 0.1, hand: 'relaxed' }, legN: { a: 0.75, b: 1.35 }, legF: { a: -0.02, b: 0.12 } });
    return d.shape.rotate(Math.PI / 2, 0, 0).translate(x, y);
  }
  // Marina's last full stop: a small ring of her type colour, hanging, turning very slowly
  function drawRing(g, t, at, a, r) {
    if (a <= 0.01) return; const tt = ones(t); const bob = Math.sin(tt * Math.PI * 2 * 0.31) * 2.5, turn = Math.cos(tt * 0.9);
    g.save(); g.globalAlpha = a; g.strokeStyle = C.tMarina; g.lineWidth = Math.max(2, r * 0.2); g.beginPath(); g.ellipse(at[0], at[1] + bob, r * (0.3 + 0.7 * Math.abs(turn)), r, 0, 0, 7); g.stroke(); g.restore();
  }
  // a kitchen chair built in 3D and projected (so a turned chair foreshortens properly): P = persp().P, (X, z) the footprint
  // centre on the floor (m), yaw = where it faces (0 = facing +z, into the room, its back to camera; + turns it toward +X).
  // Every part is a box; each box projects to the convex hull of its 8 corners. lamp {X,h,z} adds the floor shadow (hull per part).
  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = []; for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  const CHAIR_BOXES = (() => { const L = 0.017, E = 0.2, B = [];
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => B.push([sx * E - L, sx * E + L, sz * E - L, sz * E + L, 0, 0.44]));   // legs
    B.push([-0.215, 0.215, -0.215, 0.215, 0.43, 0.47]);                                                                         // seat
    [-1, 1].forEach(sx => B.push([sx * E - L, sx * E + L, -E - L, -E + L, 0.47, 0.92]));                                          // back posts
    B.push([-0.215, 0.215, -0.222, -0.19, 0.82, 0.92]); B.push([-E, E, -0.214, -0.196, 0.62, 0.655]);                               // top and mid rails
    [-1, 1].forEach(sx => B.push([sx * E - 0.01, sx * E + 0.01, -E, E, 0.15, 0.17])); B.push([-E, E, E - 0.01, E + 0.01, 0.15, 0.17]);  // stretchers
    return B; })();
  function chair3D(P, X, z, yaw, lamp) {
    const r = [Math.cos(yaw), -Math.sin(yaw)], f = [Math.sin(yaw), Math.cos(yaw)];
    const W3 = (lx, lz) => [X + lx * r[0] + lz * f[0], z + lx * r[1] + lz * f[1]];
    const sh = S(), shadow = lamp ? S() : null;
    CHAIR_BOXES.forEach(([x0, x1, z0, z1, h0, h1]) => {
      const pts = [], spts = [];
      [x0, x1].forEach(lx => [z0, z1].forEach(lz => [h0, h1].forEach(h => { const w = W3(lx, lz); pts.push(P(w[0], h, w[1]));
        if (lamp) { const t = lamp.h / (lamp.h - Math.min(h, lamp.h - 0.05)); spts.push(P(lamp.X + (w[0] - lamp.X) * t, 0, lamp.z + (w[1] - lamp.z) * t)); } })));
      sh.poly(hull(pts)); if (lamp) shadow.poly(hull(spts));
    });
    return { shape: sh, shadow, foot: P(X, 0, z), seat: P(X, 0.47, z), back: P(W3(0, -0.2)[0], 0.92, W3(0, -0.2)[1]) };
  }

  // ================================================================ VIEW: stove (F09) and oven (the same world, magnified)
  const RIG = ovenRig({ l: 1130, r: 1470, lt: 470, lb: 900, rt: 432, rb: 956 }, 1);
  const CRACK1 = RIG.door(1).crack;   // (1256, 629)
  const PAINT = { x: -420, y: -220, w: W + 880, h: H + 480 };
  function stoveWorld(name, T, CEIL, withJamb) {
    const tf = g => { if (T) g.transform(T[0], T[1], T[2], T[3], T[4], T[5]); };
    const mp = p => T ? [T[0] * p[0] + T[4], T[3] * p[1] + T[5]] : [p[0], p[1]];
    const s = T ? T[0] : 1;
    const SF = RIG.SF, atF = RIG.atF;
    const DST = [[214, 110], [1090, 292], [1112, 640], [290, 500]];
    const CONE = [[1050, 196], [1580, 168], [1650, 470], [1010, 520]];
    const coneP = P2(CONE), lipP = P2([[1050, 192], [1580, 164], [1583, 172], [1052, 200]]);
    const POOL = { src: [820, 1000], x: 760, y: 1012, rx: 330, ry: 52, seed: 61, light: { x: 1310, y: 300 }, fade: 1300 };
    const fold = foldFn(CEIL), Hm = homography([[0, 0], [6, 0], [6, 4], [0, 4]], DST), sfn = (x, y) => fold(...Hm(x, y));
    const rectT = r => { const x = r.x * s + (T ? T[4] : 0), y = r.y * s + (T ? T[5] : 0), x0 = Math.max(PAINT.x, x), y0 = Math.max(PAINT.y, y), x1 = Math.min(PAINT.x + PAINT.w, x + r.w * s), y1 = Math.min(PAINT.y + PAINT.h, y + r.h * s); return { x: Math.floor(x0), y: Math.floor(y0), w: Math.ceil(x1 - x0), h: Math.ceil(y1 - y0) }; };
    // painted area of this view (its own coords): wide enough for every named cam plus the shake (cams.hob/handle/deena/shadow, oven.crack)
    const R_ROOM = PAINT, R_PROJ = rectT({ x: 40, y: -10, w: 1400, h: 730 }), R_BODY = rectT({ x: 1095, y: 395, w: 400, h: 600 }), R_FRONT = rectT({ x: -600, y: -210, w: 745, h: 1500 });
    const mask = pts => { const p = new Path2D(); p.rect(-3000, -3000, 8000, 8000); p.addPath(P2(pts)); return p; };
    const NOT = [mask(CONE), mask([[1100, -400], [1520, -400], [1600, 168], [1030, 198]]), mask([[800, 640], [1140, 640], [1140, 1100], [800, 1100]])];
    function drawBack(g) {
      tf(g); g.fillStyle = C.ink; g.fillRect(-600, -600, W + 1200, H + 1200);
      g.fillStyle = mix(C.soot, C.ink, 0.45); g.fillRect(-600, CEIL, W + 1200, 884 - CEIL);
      g.fillStyle = INK2; g.fillRect(-600, -600, W + 1200, CEIL + 600);
      g.fillStyle = '#070504'; g.fillRect(-600, CEIL - 2, W + 1200, 4);
    }
    function drawProj(g) {
      tf(g); const CR = CRACK1;
      O.cone(g, [[CR[0] - 110, CR[1] + 6], [CR[0] + 120, CR[1] - 16], [1090, 292], [214, 110], [290, 500]], C.hood, 0.06);
      ovenShadow(g, { quad: DST, foldY: CEIL, pool: { x: 920, y: 440, r: 720, sy: 0.55, rot: -0.2 }, k: 1 });
      O.dust(g, [[CR[0] - 60, CR[1]], [CR[0] + 80, CR[1] - 10], [1100, 330], [1060, 640]], 50, C.hood, 'beamdust');
    }
    function drawMid(g) {
      tf(g); const R = O.rng('kst' + name);
      // floor: checker tiles of ink and soot
      const VPX = 560, HZ = 860, BASE = 884, FY = k => HZ + (BASE - HZ) * k;
      g.save(); g.beginPath(); g.rect(-600, 890, W + 1200, H); g.clip();
      g.fillStyle = C.ink; g.fillRect(-600, 890, W + 1200, H);
      const ks = []; for (let i = 0; i < 12; i++) ks.push(1.25 * Math.pow(1.45, i));
      for (let r = 0; r < ks.length - 1; r++) for (let c = -40; c < 40; c++) {
        if ((r + c) & 1) continue; const k0 = ks[r], k1 = ks[r + 1], X0 = VPX + c * 70, X1 = X0 + 70;
        g.fillStyle = C.soot; g.fill(P2([[VPX + (X0 - VPX) * k0, FY(k0)], [VPX + (X1 - VPX) * k0, FY(k0)], [VPX + (X1 - VPX) * k1, FY(k1)], [VPX + (X0 - VPX) * k1, FY(k1)]]));
      }
      g.restore();
      // the low cabinet beside the stove: its door stands open; broken knob plastic half under its kick plate
      g.fillStyle = INK2; g.fill(poly([[880, 664], [SF.l + 4, 652], [SF.l + 4, 880], [880, 884]]).path(0.6, 61));
      g.fillStyle = C.hoodLow; g.fill(poly([[872, 660], [SF.l + 6, 646], [SF.l + 6, 652], [872, 666]]).path(0.3, 62));
      g.fillStyle = C.ink; g.fill(poly([[884, 884], [SF.l, 880], [SF.l, 900], [884, 902]]).path(0.3, 63));
      g.fillStyle = VOID; g.fill(poly([[904, 690], [SF.l - 16, 682], [SF.l - 16, 862], [904, 866]]).path(0.4, 64));
      g.fillStyle = mix(C.hoodLow, C.ink, 0.4); g.fillRect(906, 772, SF.l - 924, 4);
      const cdP = poly([[904, 690], [812, 716], [806, 896], [904, 866]]).path(0.5, 65);
      g.fillStyle = '#0E0A09'; g.fill(cdP); rim(g, cdP, [0.6, -0.8], 2.5, C.hoodLow);
      g.fillStyle = C.ink; g.fillRect(-600, 872, SF.l + 600, 18);
      [[1012, 908, 0.4], [1046, 922, -0.6], [1074, 906, 1.1], [1100, 928, 0.2], [962, 916, -1.2], [1118, 912, 2.2]].forEach(([x, y, a], i) => {
        g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = i % 2 ? C.hoodMid : C.hoodLow; g.beginPath(); g.moveTo(-9, -3); g.lineTo(7, -6); g.lineTo(10, 3); g.lineTo(-4, 6); g.closePath(); g.fill(); g.restore(); });
      // a knob's cap, cracked in half, at the edge of the kick plate
      g.save(); g.translate(984, 896); g.rotate(-0.25); g.fillStyle = '#1A1310'; g.beginPath(); g.arc(0, 0, 13, Math.PI, 0); g.closePath(); g.fill(); g.fillStyle = C.hoodMid; g.fillRect(-1.5, -12, 3, 8); g.strokeStyle = C.hoodLow; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 13, Math.PI + 0.3, -0.4); g.stroke(); g.restore();
      // the hood's sick cone on the tiled wall
      g.save(); g.clip(coneP);
      g.fillStyle = mix(C.soot, C.ink, 0.45); g.fillRect(900, 100, 900, 500);
      O.lightPool(g, 1310, 190, [{ r: 520, color: mix(C.hoodLow, C.soot, 0.6) }, { r: 320, color: C.hoodLow }, { r: 180, color: C.hoodMid }], { sy: 0.5, rough: 2.5, seed: 41 });
      g.strokeStyle = rgba(C.ink, 0.6); g.lineWidth = 1.5;
      for (let ty = 170; ty < 540; ty += 30) { g.beginPath(); g.moveTo(1000, ty); g.lineTo(1700, ty); g.stroke(); }
      for (let tx = 1004; tx < 1700; tx += 30) { g.beginPath(); g.moveTo(tx, 160); g.lineTo(tx, 540); g.stroke(); }
      g.restore();
      g.fillStyle = C.ink; g.fill(poly([[1100, -400], [1520, -400], [1600, 168], [1030, 198]]).path(1, 3));
      g.fillStyle = C.hood; g.fill(poly([[1050, 192], [1580, 164], [1583, 172], [1052, 200]]).path(0.3, 4));
    }
    function drawBody(g) {
      tf(g);
      g.fillStyle = C.ink; g.fill(poly([[SF.l - 18, SF.lt - 8], [SF.r + 12, SF.rt - 14], [SF.r + 12, SF.rt + 4], [SF.l - 18, SF.lt + 6]]).path(0.5, 2));
      [0.13, 0.37, 0.62, 0.87].forEach(u => { const p = L2([SF.l - 12, SF.lt - 8], [SF.r + 6, SF.rt - 14], u); const q = 0.8 + u * 0.35;
        g.fillStyle = C.ink; g.fillRect(p[0] - 32 * q, p[1] - 18 * q, 7 * q, 18 * q); g.fillRect(p[0] + 25 * q, p[1] - 18 * q, 7 * q, 18 * q); g.fillRect(p[0] - 4 * q, p[1] - 12 * q, 8 * q, 12 * q); g.fillRect(p[0] - 32 * q, p[1] - 6 * q, 64 * q, 6 * q); });
      g.fillStyle = C.hoodMid; g.fill(poly([[SF.l - 18, SF.lt - 10], [SF.r + 12, SF.rt - 16], [SF.r + 12, SF.rt - 12], [SF.l - 18, SF.lt - 6]]).path(0.3, 3));
      g.fillStyle = C.ink; g.fill(poly([[SF.l, SF.lt], [SF.r, SF.rt], [SF.r, SF.rb], [SF.l, SF.lb]]).path(0.6, 6));
      g.strokeStyle = rgba(C.hoodLow, 0.8); g.lineWidth = 1.5; const a = atF(0, 0.24), b = atF(1, 0.24); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    function drawFront(g) {
      tf(g);
      const jP = poly([[-600, -200], [118, -200], [104, 1280], [-600, 1280]]).path(0.8, 77);
      g.fillStyle = '#070504'; g.fill(jP); rim(g, jP, [1, 0], 2.5, C.hoodLow);
      g.fillStyle = '#0D0A09'; g.fill(poly([[118, -200], [134, -200], [121, 1280], [104, 1280]]).path(0.6, 78));
    }
    const pullPivot = [SF.r, SF.rb];
    function pullT(g, pl) { if (pl <= 0) return; const pv = mp(pullPivot); g.translate(pv[0], pv[1]); g.rotate(-0.014 * pl); g.translate(-pv[0] - 15 * pl * s, -pv[1] + 4 * pl * s); }
    function pullPt(p, pl) { if (pl <= 0) return p; const pv = pullPivot, a = -0.014 * pl, x = p[0] - pv[0] - 15 * pl, y = p[1] - pv[1] + 4 * pl; return [pv[0] + x * Math.cos(a) - y * Math.sin(a), pv[1] + x * Math.sin(a) + y * Math.cos(a)]; }
    const view = {
      h: H,
      back(c, t, st) {
        const g = c.g, E = c.em, lvl = hoodLevel(t, st), open = st.ovenOpen;
        putC(c, crop(c, name + '.room', g2 => { g2.save(); drawBack(g2); g2.restore(); g2.save(); drawMid(g2); g2.restore(); }, R_ROOM), jit(t, st, 0.35, 11));
        if (open > 0.002) {
          // the bulb's throw: a wedge from the crack that widens faster than the door drops; it passes behind the cone, hood and cabinet
          const d = RIG.door(open), apex = mp(pullPt(d.crack, st.pull));
          // the throw grows FROM the oven: the first light is a thin streak along the wall just above the cabinet (-2.96 rad), then it
          // climbs: the folded legs (bottom of the cavity image) at ~0.03, the splayed hand ~0.06, the curls ~0.1, the hips ~0.28,
          // the whole cavity by 0.75 (it passes behind the cone, the hood and the cabinet)
          const uw = clamp(open / 0.75, 0, 1), wedge = wedgePath(apex, -2.96 + 1.04 * uw, -3.0 - 0.27 * uw, 4000 * s), m = g.getTransform();
          g.save(); g.clip(wedge); tf(g); NOT.forEach(q => g.clip(q, 'evenodd')); g.setTransform(m);
          g.globalAlpha = clamp(open * 6, 0, 1) * (0.86 + 0.14 * lvl); putC(c, crop(c, name + '.proj', drawProj, R_PROJ)); g.restore();
        }
        g.save(); tf(g); E.save(); tf(E);
        dimPath(g, coneP, lvl, 0.72); dimPath(g, lipP, lvl, 0.6);
        E.globalAlpha = lvl; E.fillStyle = C.hood; E.fillRect(1050, 170, 530, 26); E.globalAlpha = 1;
        haze(g, t, { seed: name + 'hob', x0: 1040, x1: 1560, y0: 312, y1: 446, rows: 11, taper: 5 }, st.gas);
        if (open > 0.002) haze(g, t, { seed: name + 'beam', x0: 880, x1: 1120, y0: 556, y1: 666, rows: 6, a0: 0.06, a1: 0.08 }, st.gas * clamp(open * 3, 0, 1));
        drawPool(g, POOL, st.blood);
        E.restore(); g.restore();
        const jb = jit(t, st, 0.6, 12);
        g.save(); if (jb) g.translate(jb[0], jb[1]); pullT(g, st.pull); putC(c, crop(c, name + '.body', drawBody, R_BODY));
        g.save(); tf(g); E.save(); pullT(E, st.pull); tf(E); knobsSmall(g, RIG, st.knobs); drawOven(g, E, RIG, open, lvl, st.thud); E.restore(); g.restore();
        g.restore();
      },
      mid() { },
      front(c, t, st) { if (withJamb) putC(c, crop(c, name + '.front', drawFront, R_FRONT), jit(t, st, 1.0, 13)); },
      anchors: null, cams: null, light: null, clip: () => { const p = new Path2D(); p.addPath(coneP, T ? new DOMMatrix(T) : undefined); return p; },
      at(nm, st) {
        st = normState(st); const d = RIG.door(st.ovenOpen, st.thud);
        const m = { ovenHandle: d.handle, crack: d.crack, doorTop: L2(d.T0, d.T1, 0.5), hb0: d.hb0, hb1: d.hb1 }[nm];
        return m ? mp(pullPt(m, st.pull)) : null;
      },
    };
    const A = {
      stove: [1300, 690], hob: [1300, 448], knobs: KU.map(u => atF(u, 0.13)), ovenHandle: RIG.door(0).handle, ovenHandleOpen: RIG.door(1).handle,
      crack: CRACK1, ovenMouth: L2(RIG.mouth[0], RIG.mouth[2], 0.5), plastic: [1040, 915], cupboard: [856, 790], floorY: 1000,
      deenaFall: [760, 1004], scott: { x: 1720, y: 1068, scale: 112, facing: -1 }, deena: { x: 360, y: 1000, scale: 76, facing: 1 },
      shadowHead: sfn(2.35, 2.2), shadowHand: sfn(0.6, 2.6), shadowCurls: sfn(2.9, 2.6), hood: [1315, 182], hallJamb: [118, 1000],
    };
    const mapA = v => Array.isArray(v) ? (typeof v[0] === 'number' ? mp(v) : v.map(mapA)) : (v && typeof v === 'object' ? (v.x != null ? Object.assign({}, v, { x: mp([v.x, v.y])[0], y: mp([v.x, v.y])[1], scale: v.scale ? v.scale * s : v.scale }) : Object.fromEntries(Object.entries(v).map(([k, q]) => [k, mapA(q)]))) : (typeof v === 'number' && T ? v * T[3] + T[5] : v));
    view.anchors = mapA(A); if (T) ['scott', 'deena', 'plastic', 'floorY', 'deenaFall', 'hallJamb', 'cupboard'].forEach(k => delete view.anchors[k]);   // off-frame in the magnified view
    const lp = mp([1315, 182]), bp = mp(CRACK1);
    view.light = { x: lp[0], y: lp[1], color: C.hood, mid: C.hoodMid, low: C.hoodLow, bulb: { x: bp[0], y: bp[1], color: CORE, rim: C.hood } };
    return view;
  }
  // the oven view: F09's world at 1.45x about the oven's crack, which lands bottom right; more of the shadow folds onto the ceiling
  const T_OVEN = [1.45, 0, 0, 1.45, 1714 - CRACK1[0] * 1.45, 788 - CRACK1[1] * 1.45];
  const V_STOVE = stoveWorld('stove', null, 128, true);
  const V_OVEN = stoveWorld('oven', T_OVEN, 236, false);
  V_STOVE.cams = { wide: { x: 960, y: 540, zoom: 1 }, hob: { x: 1290, y: 470, zoom: 1.35 }, handle: { x: 1330, y: 700, zoom: 1.3 }, deena: { x: 560, y: 600, zoom: 1.15 }, shadow: { x: 700, y: 400, zoom: 1.2 } };
  V_OVEN.cams = { reveal: { x: 960, y: 540, zoom: 1 }, head: { x: V_OVEN.anchors.shadowHead[0] + 120, y: V_OVEN.anchors.shadowHead[1] + 60, zoom: 1.18 }, crack: { x: 1500, y: 760, zoom: 1.12 } };

  // ================================================================ VIEW: knobs (insert of the stove front, world 1920x2400)
  const KN = (() => {
    const H2 = 2400, SL = 330, SR = 1590, KX = [465, 795, 1125, 1455], KY = 408, KR = 78, DT = 592, DB = 1440, FLOOR = 1556;
    const light = { x: 960, y: -160, color: C.hood, mid: C.hoodMid, low: C.hoodLow };
    const JK_K = 3.7;   // the insert is ~3.7x the stove view: the thud's jolt scales with it
    function doorQuad(u, th) { const top = DT + 210 * u, ext = 46 * u, j = jolt(th, JK_K).door; return [[SL + 10 - ext, top], [SR - 10 + ext, top], [SR - 8, DB], [SL + 8, DB]].map(p => [p[0] + j[0], p[1] + j[1]]); }
    function handleBar(q, th) { const j = jolt(th, JK_K).handle, h0 = Q(q, 0.11, 0.075), h1 = Q(q, 0.89, 0.075); return [[h0[0] + j[0], h0[1] + j[1]], [h1[0] + j[0], h1[1] + j[1]]]; }
    const Q = (q, s, v) => L2(L2(q[0], q[1], s), L2(q[3], q[2], s), v);
    function drawBack(g) {
      g.fillStyle = C.ink; g.fillRect(-200, -300, W + 400, H2 + 500);
      // tiles behind the hob in the hood light
      g.save(); g.beginPath(); g.rect(-200, -300, W + 400, 536); g.clip();
      g.fillStyle = mix(C.soot, C.ink, 0.35); g.fillRect(-200, -300, W + 400, 536);
      O.lightPool(g, 960, -160, [{ r: 1100, color: mix(C.hoodLow, C.soot, 0.55) }, { r: 860, color: C.hoodLow }, { r: 620, color: C.hoodMid }, { r: 380, color: C.hood }], { sy: 0.42, rough: 2.6, seed: 71 });
      g.strokeStyle = rgba(C.ink, 0.55); g.lineWidth = 2.5; for (let y = 24 - 72 * 4; y < 236; y += 72) { g.beginPath(); g.moveTo(-200, y); g.lineTo(W + 200, y); g.stroke(); } for (let x = 16 - 72 * 3; x < W + 200; x += 72) { g.beginPath(); g.moveTo(x, -300); g.lineTo(x, 236); g.stroke(); }
      g.restore();
      // worktop either side + hob lip; pan supports silhouetted against the tiles
      g.fillStyle = '#100C0A'; g.fill(poly([[-200, 222], [W + 200, 222], [W + 200, 262], [-200, 262]]).path(0.8, 70));
      g.fillStyle = C.hoodMid; g.fill(poly([[-200, 219], [W + 200, 219], [W + 200, 224], [-200, 224]]).path(0.4, 72));
      KX.forEach((x, i) => { const q = 2.4; g.fillStyle = C.ink;
        g.fill(S().rect(x - 34 * q, 222 - 20 * q, 7 * q, 20 * q).rect(x + 27 * q, 222 - 20 * q, 7 * q, 20 * q).rect(x - 4 * q, 222 - 13 * q, 8 * q, 13 * q).rect(x - 34 * q, 222 - 6 * q, 68 * q, 6 * q).path(0.8, 73 + i)); });
      g.fillStyle = C.hood; g.fill(poly([[SL - 30, 216], [SR + 30, 216], [SR + 30, 222], [SL - 30, 222]]).path(0.4, 74));
      // the control panel: four positions, each with its printed scale (the scale stays when the knob is gone)
      g.fillStyle = '#0F0B0A'; g.fill(poly([[SL, 262], [SR, 262], [SR, 566], [SL, 566]]).path(0.8, 75));
      g.fillStyle = C.hoodMid; g.fillRect(SL, 262, SR - SL, 3);
      g.fillStyle = '#070505'; g.fillRect(SL, 566, SR - SL, 22);
      KX.forEach(x => { g.strokeStyle = rgba(C.hoodLow, 0.95); g.lineWidth = 3;
        for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 + (k / 8) * Math.PI * 1.5; const r0 = KR * 1.32, r1 = KR * (k % 4 === 0 ? 1.56 : 1.45); g.beginPath(); g.moveTo(x + Math.cos(a) * r0, KY + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, KY + Math.sin(a) * r1); g.stroke(); }
        g.fillStyle = C.hoodMid; g.beginPath(); g.arc(x, KY - KR * 1.72, 5, 0, 7); g.fill(); });
      // cavity behind the door (only ever glimpsed as glare)
      g.fillStyle = C.hood; g.fillRect(SL + 40, DT + 6, SR - SL - 80, 400);
      g.fillStyle = CORE; g.fillRect(SL + 140, DT + 40, SR - SL - 280, 360);
      g.fillStyle = '#0A0706'; g.fill(poly([[SL, DT - 4], [SR, DT - 4], [SR, DT + 8], [SL, DT + 8]]).path(0.4, 76));
      g.fillStyle = C.ink; g.fillRect(SL + 40, DT + 52, SR - SL - 80, 8);
      for (let x = SL + 70; x < SR - 50; x += 44) g.fillRect(x, DT + 52, 4, 400);
      g.fillStyle = C.ink; g.fillRect(SL - 6, DT - 6, 46, DB - DT); g.fillRect(SR - 40, DT - 6, 46, DB - DT);
      // toe-kick and floor: we look steeply down along the stove's base; the hood light rakes in from above as a low band
      g.fillStyle = '#060404'; g.fillRect(-200, DB, W + 400, FLOOR - DB);
      g.save(); g.beginPath(); g.rect(-200, FLOOR, W + 400, H2 - FLOOR + 200); g.clip();
      g.fillStyle = C.ink; g.fillRect(-200, FLOOR, W + 400, H2 - FLOOR + 200);
      O.lightPool(g, 600, FLOOR + 20, [{ r: 1300, color: '#120E09' }, { r: 960, color: '#1C160C' }, { r: 660, color: C.hoodLow }, { r: 360, color: C.hoodMid }], { sy: 0.27, rough: 2.2, seed: 77 });
      const rowY = k => FLOOR + 190 * k * (1 + 0.07 * k), colX = (cI, y) => 960 + (cI * 220 - 70) * (1 + (y - FLOOR) / 2400);
      g.fillStyle = rgba(C.ink, 0.5);
      for (let k = 0; k < 6; k++) for (let cI = -7; cI < 7; cI++) { if ((cI + k) & 1) continue; const ya = rowY(k), yb = rowY(k + 1); g.fill(P2([[colX(cI, ya), ya], [colX(cI + 1, ya), ya], [colX(cI + 1, yb), yb], [colX(cI, yb), yb]])); }
      g.restore();
      // the broken plastic: a knob split in half, a collar snapped open, shards; the nearest bits lie in the toe-kick's shadow
      const shard = (x, y, a, sc, col, seed) => { const sh = poly([[-9 * sc, -3 * sc], [7 * sc, -6 * sc], [11 * sc, 3 * sc], [-4 * sc, 6 * sc]]).rotate(a, 0, 0).translate(x, y); const pa = sh.path(0.6, seed); g.fillStyle = col; g.fill(pa); return pa; };
      [[150, 1550, 0.6, 3.0, C.hoodLow], [236, 1556, -0.8, 2.4, C.hoodMid], [300, 1548, 2.1, 1.9, C.hoodLow], [372, 1566, 0.3, 3.8, C.hoodMid], [742, 1588, -1.4, 2.6, C.hood], [860, 1660, 0.9, 3.0, C.hoodLow],
        [96, 1556, 1.2, 2.0, C.hoodMid], [960, 1616, -0.2, 2.0, C.hoodMid], [690, 1730, 1.9, 1.7, C.hood], [420, 1716, -0.6, 2.6, C.hoodLow], [1040, 1690, 0.4, 1.5, C.hoodLow], [530, 1760, 2.6, 1.4, C.hoodMid]].forEach((q, i) => shard(q[0], q[1], q[2], q[3], q[4], 80 + i));
      // half a knob on its back, its pointer still on it
      g.save(); g.translate(560, 1632); g.rotate(-0.24); g.scale(1.3, 1.3);
      const hk = S().add(sm([[-82, 0, 1], [-78, -30], [-56, -62], [-20, -80], [20, -80], [56, -62], [78, -30], [82, 0, 1], [40, 8], [10, -6], [-18, 9], [-50, -2]], true)); const hkP = hk.path(0.8, 96);
      g.fillStyle = '#1A1310'; g.fill(hkP); rim(g, hkP, [0.3, -1], 3, C.hoodMid);
      g.fillStyle = '#0A0706'; g.fill(S().capsule(0, -72, 13, 0, -6, 13).path(0.5, 97)); g.fillStyle = C.hood; g.fillRect(-3, -66, 6, 34);
      g.restore();
      // the knob's skirt ring, snapped open
      g.save(); g.translate(880, 1740); g.rotate(0.4); g.scale(1.2, 1.2); g.strokeStyle = '#1A1310'; g.lineWidth = 16; g.beginPath(); g.ellipse(0, 0, 70, 24, 0, 0.6, Math.PI * 1.6); g.stroke(); g.strokeStyle = C.hoodMid; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -8, 70, 24, 0, 0.9, Math.PI * 1.25); g.stroke(); g.restore();
      // the open low cabinet at left (door swung toward us), the closed one at right
      g.fillStyle = INK2; g.fill(poly([[-200, 262], [SL - 14, 262], [SL - 14, DB], [-200, DB]]).path(0.8, 90));
      g.fillStyle = VOID; g.fill(poly([[30, 300], [SL - 40, 300], [SL - 40, DB - 30], [30, DB - 30]]).path(0.6, 91));
      g.fillStyle = mix(C.hoodLow, C.ink, 0.3); g.fillRect(34, 880, SL - 78, 5);
      g.fillStyle = '#0B0807'; g.fill(poly([[34, 870], [70, 820], [120, 820], [140, 870]]).path(0.6, 92));
      const cdP = poly([[30, 300], [-80, 250], [-80, 1510], [30, DB - 30]]).path(0.8, 93); g.fillStyle = '#0E0A09'; g.fill(cdP); rim(g, cdP, [1, -0.1], 3, C.hoodLow);
      g.fillStyle = INK2; g.fill(poly([[SR + 14, 262], [W + 200, 262], [W + 200, DB], [SR + 14, DB]]).path(0.8, 94));
      g.fillStyle = '#050404'; g.fillRect(SR + 166, 268, 4, DB - 270); g.fillStyle = C.hoodLow; g.fillRect(SR + 40, 330, 6, 120);
      // the toe-kick's shadow falls over the plastic nearest the cabinets
      g.fillStyle = rgba(C.ink, 0.8); g.fill(poly([[-200, FLOOR - 4], [SL + 40, FLOOR - 4], [SL - 40, FLOOR + 22], [-200, FLOOR + 26]]).path(1, 98));
      g.fillStyle = rgba(C.ink, 0.6); g.fillRect(SR - 20, FLOOR - 4, W - SR + 220, 26);
    }
    function drawKnob(g, i, present) {
      const x = KX[i], y = KY, r = KR;
      if (present) {
        g.fillStyle = '#120D0B'; g.beginPath(); g.arc(x, y, r * 1.16, 0, 7); g.fill();
        g.fillStyle = '#1A1310'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.fillStyle = '#0A0706'; g.fill(S().capsule(x, y - r * 0.82, r * 0.17, x, y + r * 0.82, r * 0.17).path(0.4, 100 + i));
        g.strokeStyle = C.hoodMid; g.lineWidth = 4; g.beginPath(); g.arc(x, y, r, -2.75, -0.4); g.stroke();
        g.strokeStyle = C.hood; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r * 1.16, -2.3, -0.85); g.stroke();
        g.fillStyle = C.hoodMid; g.fillRect(x - 3, y - r * 0.8, 6, r * 0.42);
      } else {
        const R = O.rng('kb' + i);
        g.fillStyle = VOID; g.beginPath(); g.ellipse(x, y, r * 0.42, r * 0.45, 0, 0, 7); g.fill();
        // the collar, snapped: jagged arcs of plastic left on the panel
        const col = S(); let a = -0.4 + i;
        for (let k = 0; k < 3; k++) { const a0 = a + R() * 0.3, a1 = a0 + 0.9 + R() * 0.9; const pts = []; for (let q = 0; q <= 10; q++) { const aa = a0 + (a1 - a0) * q / 10; pts.push([x + Math.cos(aa) * r * 0.66, y + Math.sin(aa) * r * 0.66]); } for (let q = 10; q >= 0; q--) { const aa = a0 + (a1 - a0) * q / 10; const rr = r * (0.8 + (q % 3 === 1 ? 0.1 * R() : 0)); pts.push([x + Math.cos(aa) * rr, y + Math.sin(aa) * rr]); } col.poly(pts); a = a1 + 0.5 + R() * 0.6; }
        const cP = col.path(1.2, 110 + i); g.fillStyle = '#1A1310'; g.fill(cP); rim(g, cP, [0, -1], 2, C.hoodMid);
        // the D-shaft spindle, its flat catching the light
        g.fillStyle = '#2A2018'; g.fillRect(x - 9, y - 30, 18, 46); g.fillStyle = C.hoodMid; g.fillRect(x - 9, y - 30, 7, 46); g.fillStyle = C.hood; g.fillRect(x - 9, y - 31, 18, 3);
        // scratches where something wrenched it off
        g.strokeStyle = rgba(C.hoodLow, 0.95); g.lineWidth = 2; for (let k = 0; k < 4; k++) { const aa = R() * 6.28, r0 = r * (0.9 + R() * 0.2), r1 = r0 + 20 + R() * 40; g.beginPath(); g.moveTo(x + Math.cos(aa) * r0, y + Math.sin(aa) * r0); g.lineTo(x + Math.cos(aa + 0.08) * r1, y + Math.sin(aa + 0.08) * r1); g.stroke(); }
      }
    }
    function drawDoor(g, E, u, lvl, th) {
      const q = doorQuad(u, th);
      if (u > 0.002) { E.save(); E.globalAlpha = clamp(u * 6, 0, 1) * lvl; E.fillStyle = C.hood; E.fillRect(SL + 40, DT, SR - SL - 80, q[0][1] - DT); E.restore(); }
      g.fillStyle = C.ink; g.fill(poly(q).path(0.8, 120));
      // the window: dark glass with one hard reflection of the hood
      const win = [Q(q, 0.13, 0.25), Q(q, 0.87, 0.25), Q(q, 0.87, 0.8), Q(q, 0.13, 0.8)], wP = P2(win);
      g.fillStyle = '#060404'; g.fill(wP);
      g.save(); g.clip(wP); g.fillStyle = rgba(C.hoodLow, 0.5); g.fill(P2([Q(q, 0.5, 0.2), Q(q, 0.66, 0.2), Q(q, 0.4, 0.85), Q(q, 0.24, 0.85)])); g.fillStyle = rgba(C.hoodLow, 0.3); g.fill(P2([Q(q, 0.7, 0.2), Q(q, 0.74, 0.2), Q(q, 0.48, 0.85), Q(q, 0.44, 0.85)])); g.restore();
      g.strokeStyle = rgba(C.hoodMid, 0.6); g.lineWidth = 2; g.stroke(wP);
      // top edge: a seam when shut, burning when open
      const flash = u <= 0.002 && th > 0.55;
      g.strokeStyle = u > 0.002 ? C.hood : flash ? C.hoodMid : rgba(C.hoodLow, 0.9); g.lineWidth = u > 0.002 ? 4 : flash ? 5 : 2; g.beginPath(); g.moveTo(q[0][0], q[0][1]); g.lineTo(q[1][0], q[1][1]); g.stroke();
      // the handle bar on two standoffs; its top catches the hood light (a hard hood line over a hoodMid band) so a hand on it reads
      const [h0, h1] = handleBar(q, th);
      g.fillStyle = '#0A0706'; [L2(h0, h1, 0.04), L2(h0, h1, 0.96)].forEach(p => g.fillRect(p[0] - 9, p[1] - 4, 18, 30));
      g.lineCap = 'round'; g.strokeStyle = '#1C1511'; g.lineWidth = 22; g.beginPath(); g.moveTo(h0[0], h0[1]); g.lineTo(h1[0], h1[1]); g.stroke();
      g.strokeStyle = C.hoodMid; g.lineWidth = 5; g.beginPath(); g.moveTo(h0[0] + 4, h0[1] - 7); g.lineTo(h1[0] - 4, h1[1] - 7); g.stroke();
      g.strokeStyle = C.hood; g.lineWidth = 3; g.beginPath(); g.moveTo(h0[0] + 6, h0[1] - 9.5); g.lineTo(h1[0] - 6, h1[1] - 9.5); g.stroke(); g.lineCap = 'butt';
      E.save(); E.globalAlpha = 0.35 * lvl; E.strokeStyle = C.hood; E.lineWidth = 3; E.beginPath(); E.moveTo(h0[0] + 6, h0[1] - 9.5); E.lineTo(h1[0] - 6, h1[1] - 9.5); E.stroke(); E.restore();
      return { quad: q, handle: L2(h0, h1, 0.7), h0, h1 };
    }
    return {
      h: H2, light, KX, KY, KR,
      back(c, t, st) {
        const g = c.g, E = c.em, lvl = hoodLevel(t, st);
        putC(c, crop(c, 'knobs.back', drawBack, { x: -MARGIN, y: -130, w: W + 2 * MARGIN, h: H2 + 130 + MARGIN }), jit(t, st, 0.35, 21));
        dimPath(g, P2([[-60, -200], [W + 60, -200], [W + 60, 236], [-60, 236]]), lvl, 0.7); dimPath(g, P2([[-60, FLOOR], [W + 60, FLOOR], [W + 60, H2 + 60], [-60, H2 + 60]]), lvl, 0.55);
        E.save(); E.globalAlpha = lvl; E.fillStyle = C.hood; E.fillRect(SL - 30, 210, SR - SL + 60, 16); E.restore();
        haze(g, t, { seed: 'knobsHob', x0: 0, x1: W, y0: 40, y1: 200, rows: 9, wmin: 40, wvar: 220, gap: 20, gapv: 90, h0: 3, h1: 5 }, st.gas);
        haze(g, t, { seed: 'knobsPanel', x0: SL, x1: SR, y0: 290, y1: 540, rows: 5, wmin: 30, wvar: 160, gap: 30, gapv: 120, a0: 0.05, a1: 0.07 }, st.gas * 0.8);
        putC(c, crop(c, 'knobs.panel' + st.knobs, g2 => { for (let i = 0; i < 4; i++) drawKnob(g2, i, !(st.knobs === 2 && (i === 1 || i === 2))); }, { x: SL, y: 262, w: SR - SL, h: 304 }), jit(t, st, 0.5, 22));
        drawDoor(g, E, st.ovenOpen, lvl, st.thud);
      },
      mid() { }, front() { },
      at(nm, st) { st = normState(st); const q = doorQuad(st.ovenOpen, st.thud), hb = handleBar(q, st.thud); return { ovenHandle: L2(hb[0], hb[1], 0.7), doorTop: L2(q[0], q[1], 0.5) }[nm] || null; },
      clip: () => P2([[0, 0], [W, 0], [W, 236], [0, 236]]),
      anchors: { knobs: KX.map(x => [x, KY]), knobR: KR, missing: [1, 2], spindles: [[KX[1], KY], [KX[2], KY]], ovenHandle: L2(Q(doorQuad(0), 0.11, 0.075), Q(doorQuad(0), 0.89, 0.075), 0.7),
        hob: [960, 222], doorTop: [960, DT], plastic: [560, 1632], plasticUnder: [150, 1552], floorY: FLOOR, cabinetOpen: [180, 860] },
      cams: { panel: { x: 960, y: 470, zoom: 1 }, twoGone: { x: 960, y: 420, zoom: 1.18 }, handle: { x: 1060, y: 700, zoom: 1.1 }, door: { x: 960, y: 860, zoom: 1 },
        plastic: { x: 960, y: 1640, zoom: 1 }, tilt: (u) => ({ x: 960, y: lerp(470, 1640, u), zoom: 1 }) },
    };
  })();

  // ================================================================ VIEW: deena (F10's tight hood cone on the tiled wall)
  const DE = (() => {
    const LX = 1250, LY = 60;
    const coneP = poly([[1010, 60], [1470, 60], [1730, 1020], [640, 1020]]).path(1.5, 9);
    function drawBack(g) {
      g.fillStyle = C.ink; g.fillRect(-200, -200, W + 400, H + 400);
      g.save(); g.clip(coneP);
      g.fillStyle = C.soot; g.fillRect(0, 0, W, H + 100);
      const scallop = (K, D, Rb, seed) => { const pts = []; for (let x = LX - Rb; x <= LX + Rb; x += 6) { const top = LY + K * Math.sqrt((x - LX) * (x - LX) + D * D); const bot = LY + Math.sqrt(Math.max(0, Rb * Rb - (x - LX) * (x - LX))) * 1.05; if (bot > top) pts.push([x, top]); }
        for (let x = LX + Rb; x >= LX - Rb; x -= 6) { const top = LY + K * Math.sqrt((x - LX) * (x - LX) + D * D); const bot = LY + Math.sqrt(Math.max(0, Rb * Rb - (x - LX) * (x - LX))) * 1.05; if (bot > top) pts.push([x, bot]); }
        return S().poly(pts).path(2.2, seed); };
      [[C.hoodLow, 0.42, 60, 860], [C.hoodMid, 0.5, 80, 560], [C.hood, 0.66, 96, 320]].forEach(([col, K, D, Rb], i) => {
        const pth = scallop(K, D, Rb, 12 + i); g.fillStyle = col; g.fill(pth);
        if (i > 0) { g.save(); g.strokeStyle = rgba(i === 1 ? C.hoodLow : C.hoodMid, 0.9); g.setLineDash([2, 3]); g.lineWidth = 4; g.stroke(pth); g.restore(); } });
      g.strokeStyle = rgba(C.ink, 0.5); g.lineWidth = 2;
      for (let y = 22; y < 1080; y += 62) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      for (let x = 12; x < W; x += 62) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      g.restore();
      g.fillStyle = C.ink; g.fillRect(-200, 790, W + 400, 500);
      g.save(); g.clip(coneP); g.fillStyle = C.hoodMid; g.fillRect(0, 786, W, 6); g.fillStyle = mix(C.hoodLow, C.ink, 0.4); g.fillRect(0, 792, W, 40); g.restore();
      g.fillStyle = C.ink; g.fill(poly([[1000, -200], [1500, -200], [1500, 66], [1000, 70]]).path(1, 3));
      g.fillStyle = C.hood; g.fill(poly([[1040, 64], [1460, 60], [1460, 68], [1040, 72]]).path(0.3, 4));
      O.cone(g, [[1010, 70], [1470, 66], [1730, 1020], [640, 1020]], C.hood, 0.05);
    }
    return {
      h: H, light: { x: LX, y: LY, color: C.hood, mid: C.hoodMid, low: C.hoodLow },
      back(c, t, st) {
        const g = c.g, E = c.em, lvl = hoodLevel(t, st);
        putC(c, crop(c, 'deena.back', drawBack, { x: -96, y: -48, w: W + 192, h: H + 140 }), jit(t, st, 0.35, 31));
        dimPath(g, coneP, lvl, 0.75);
        E.save(); E.globalAlpha = lvl; E.fillStyle = C.hood; E.fillRect(1040, 54, 420, 24); E.restore();
        haze(g, t, { seed: 'deenaCone', x0: 700, x1: 1720, y0: 300, y1: 760, rows: 8, wmin: 30, wvar: 150, gap: 30, gapv: 90, a0: 0.05, a1: 0.08, clip: coneP }, st.gas * 0.7);
        motes(g, t, [[1040, 80], [1460, 80], [1700, 1000], [680, 1000]], 40, C.hood, 'deenaMotes', 0.8);
      },
      mid() { }, front() { }, clip: () => coneP,
      anchors: { deena: { x: 1270, y: 1150, anchor: 'hip', scale: 222, facing: -1 }, angelo: { x: 120, y: 1520, anchor: 'hip', scale: 290, facing: 1 }, angeloReach: [758, 900],
        lamp: [LX, LY], counterTop: 790, line: [610, 450] },
      cams: { tight: { x: 960, y: 540, zoom: 1 }, throat: { x: 1180, y: 600, zoom: 1.25 }, wide: { x: 960, y: 560, zoom: 0.94 } },
    };
  })();

  // ================================================================ VIEW: counter (the knife block)
  const CT = (() => {
    const LX = 2050, LY = 470, TOP = 598;
    const BX = 300, slotA = [1222 + BX, 462], slotB = [1342 + BX, 520];
    const KN5 = [{ f: 0.1, len: 150, w: 11 }, { f: 0.3, len: 132, w: 10.5 }, { f: 0.5, len: 138, w: 10.5 }, { f: 0.7, len: 118, w: 10 }, { f: 0.9, len: 104, w: 9.5 }];
    const DIR = [Math.cos(-2.02), Math.sin(-2.02)];
    const light = { x: LX, y: LY, color: C.hood, mid: C.hoodMid, low: C.hoodLow };
    const lightDir = p => norm2(LX - p[0], LY - p[1]);
    function drawBack(g) {
      g.fillStyle = C.ink; g.fillRect(-200, -200, W + 700, H + 400);
      g.fillStyle = '#110D0B'; g.fillRect(-200, -200, W + 700, TOP + 200);
      // backsplash in the hood light (posterised), grout only where it reaches
      g.save(); g.beginPath(); g.rect(-200, 330, W + 700, TOP - 330); g.clip();
      O.lightPool(g, LX, LY, [{ r: 1500, color: '#140F0B' }, { r: 1160, color: '#1C160C' }, { r: 840, color: C.hoodLow }, { r: 540, color: C.hoodMid }, { r: 270, color: C.hood }], { sy: 0.62, rough: 2.4, seed: 81 });
      g.save(); g.beginPath(); g.ellipse(LX, LY, 1160, 1160 * 0.62, 0, 0, 7); g.clip(); g.strokeStyle = rgba(C.ink, 0.5); g.lineWidth = 2;
      for (let y = 342; y < TOP; y += 64) { g.beginPath(); g.moveTo(-200, y); g.lineTo(W + 500, y); g.stroke(); } for (let x = 30 - 64 * 3; x < W + 500; x += 64) { g.beginPath(); g.moveTo(x, 330); g.lineTo(x, TOP); g.stroke(); }
      g.restore(); g.restore();
      // upper cabinets; one door stands open at the right end
      g.fillStyle = '#0B0908'; g.fill(S().rect(-200, -200, W + 700, 530).path(0.8, 82));
      [300, 640, 980].forEach(x => { g.fillStyle = '#050404'; g.fillRect(x - 1.5, 0, 3, 326); });
      g.fillStyle = '#070505'; g.fillRect(-200, 322, W + 700, 9);
      g.fillStyle = VOID; g.fill(poly([[1330, -20], [1650, -20], [1650, 318], [1330, 318]]).path(0.6, 83));
      g.fillStyle = mix(C.hoodLow, C.ink, 0.3); g.fillRect(1334, 168, 312, 5);
      [[1400, 168, 46], [1470, 168, 58], [1540, 168, 40]].forEach(([x, y, h], i) => { const jp = S().rect(x - 16, y - h, 32, h).rect(x - 12, y - h - 8, 24, 9).path(0.6, 84 + i); g.fillStyle = '#0B0807'; g.fill(jp); rim(g, jp, [1, -0.2], 1.6, C.hoodLow); });
      const odP = poly([[1330, -20], [1236, -40], [1236, 350], [1330, 318]]).path(0.8, 87); g.fillStyle = '#050404'; g.fill(odP); rim(g, odP, [1, 0], 2, C.hoodLow);
      g.fillStyle = '#1A1310'; g.fillRect(1650, -20, 6, 340); rim(g, P2([[1650, -20], [1656, -20], [1656, 320], [1650, 320]]), [1, 0], 2, C.hoodMid);
      // counter top and the run below
      const topP = S().rect(-200, TOP - 2, W + 700, 18).path(0.8, 88); g.fillStyle = '#17120F'; g.fill(topP);
      rim(g, topP, [0, -1], 2.5, C.hoodMid, { fade: { x: LX, y: LY, r0: 200, r1: 1500 } });
      g.fillStyle = '#0B0908'; g.fill(S().rect(-200, TOP + 16, W + 700, H).path(0.8, 89));
      g.fillStyle = '#050404'; g.fillRect(-200, TOP + 96, W + 700, 3); [380, 820, 1260, 1700].forEach(x => g.fillRect(x - 1.5, TOP + 18, 3, H));
      [[180, TOP + 56], [600, TOP + 56], [1040, TOP + 56], [1480, TOP + 56]].forEach(([x, y], i) => { const hp = S().rect(x - 34, y - 3, 68, 7).path(0.4, 90 + i); g.fillStyle = '#120D0B'; g.fill(hp); rim(g, hp, [0, -1], 1.6, C.hoodMid, { fade: { x: LX, y: LY, r0: 300, r1: 1700 } }); });
      // kettle, far from the light; the cutting board leaning on the tiles
      const kt = S().add(sm([[392, TOP], [384, 548], [404, 506], [452, 492], [500, 506], [520, 548], [512, TOP]], true)).rect(436, 478, 32, 16).capsule(512, 540, 9, 560, 506, 6).add(sm([[408, 506], [420, 456], [484, 456], [496, 506], [482, 500], [472, 470], [432, 470], [422, 500]], true));
      const ktP = kt.path(0.8, 95); g.fillStyle = '#090706'; g.fill(ktP); rim(g, ktP, lightDir([450, 520]), 2, C.hoodLow, { fade: { x: LX, y: LY, r0: 400, r1: 2000 } });
      const bd = S().add(sm([[836, TOP - 2, 1], [848, 404], [866, 384], [952, 376], [972, 392], [992, TOP - 4, 1]], true)).transform([1, 0, -0.06, 1, 30, 0]);
      const bdP = bd.path(0.8, 96); g.fillStyle = '#100C0A'; g.fill(bdP); rim(g, bdP, lightDir([900, 480]), 2.5, C.hoodMid, { fade: { x: LX, y: LY, r0: 300, r1: 1600 } });
      g.fillStyle = '#1C160C'; g.beginPath(); g.arc(932, 406, 9, 0, 7); g.fill();
      // the block
      const blk = poly([[1168 + BX, TOP + 2], [1358 + BX, TOP + 2], [1348 + BX, 512], [1214 + BX, 452]]); const blkP = blk.path(0.7, 97);
      g.fillStyle = '#0E0A09'; g.fill(blkP); rim(g, blkP, lightDir([1290 + BX, 540]), 3, C.hoodMid);
      g.strokeStyle = rgba(C.hoodLow, 0.8); g.lineWidth = 1.5; g.beginPath(); g.moveTo(1220 + BX, 468); g.lineTo(1348 + BX, 526); g.stroke();
    }
    function knives(g, n) {
      const ink = '#0A0706';
      KN5.forEach((k, i) => {
        const s0 = L2(slotA, slotB, k.f);
        if (n === 4 && i === 2) { g.fillStyle = VOID; g.fill(P2([[s0[0] - 15, s0[1] - 7], [s0[0] + 15, s0[1] + 7], [s0[0] + 12, s0[1] + 13], [s0[0] - 17, s0[1] - 1]])); g.strokeStyle = C.hood; g.lineWidth = 2; g.beginPath(); g.moveTo(s0[0] - 15, s0[1] - 8); g.lineTo(s0[0] + 15, s0[1] + 6); g.stroke(); return; }
        const s1 = [s0[0] + DIR[0] * k.len, s0[1] + DIR[1] * k.len];
        const hP = S().capsule(s0[0], s0[1], k.w * 0.92, s1[0], s1[1], k.w * 1.12).capsule(s0[0], s0[1], k.w * 1.12, s0[0] + DIR[0] * 12, s0[1] + DIR[1] * 12, k.w * 1.05).path(0.5, 140 + i);
        rim2(g, hP, lightDir(s0), 2.6, C.hoodMid, ink);
        g.fillStyle = C.hoodLow; [0.42, 0.72].forEach(f => { const p = L2(s0, s1, f); g.fillRect(p[0] + 1, p[1] - 1, 3, 3); });
      });
    }
    return {
      h: H, light,
      back(c, t, st) {
        const g = c.g, lvl = hoodLevel(t, st);
        putC(c, crop(c, 'counter.back', drawBack, { x: -MARGIN, y: -MARGIN, w: W + 400, h: H + 2 * MARGIN }), jit(t, st, 0.35, 41));   // reaches x 2296 for cams.counter.block
        dimPath(g, P2([[700, 300], [W + 420, 300], [W + 420, H + 60], [700, H + 60]]), lvl, 0.6);
        haze(g, t, { seed: 'counterAir', x0: 0, x1: W, y0: 360, y1: 560, rows: 7, wmin: 30, wvar: 200, gap: 40, gapv: 160, a0: 0.04, a1: 0.07 }, st.gas * 0.75);
        knives(g, st.knives);
        drawPerf(c, 'counter', st.perforations);
      },
      mid() { }, front() { }, clip: () => P2([[700, 300], [W + 420, 300], [W + 420, H], [700, H]]),
      anchors: { block: [1262 + BX, 530], knife: (() => { const s0 = L2(slotA, slotB, KN5[2].f); return [s0[0] + DIR[0] * KN5[2].len * 0.72, s0[1] + DIR[1] * KN5[2].len * 0.72]; })(), knifeDir: DIR,
        handles: KN5.map(k => { const s0 = L2(slotA, slotB, k.f); return [s0[0] + DIR[0] * k.len, s0[1] + DIR[1] * k.len]; }), counterTop: TOP,
        // Scott backs in from the left (facing -1, his back to the block): at the mark his hip (3.96 heads up) is at the counter's edge,
        // his back touching it at hip; the knife's grip is ~2 heads from his shoulder, behind him
        hip: [1352, TOP + 10], scott: { x: 1290, y: TOP + 10 + 3.96 * 150, scale: 150, facing: -1 }, scottStart: { x: 1010, y: TOP + 10 + 3.96 * 150, scale: 150, facing: -1 },
        cupboard: [1490, 160], kettle: [452, 540], board: [930, 480] },
      cams: { block: { x: 1450, y: 500, zoom: 1.2 }, wide: { x: 960, y: 540, zoom: 1 }, backIn: { x: 1060, y: 560, zoom: 1.06 } },
    };
  })();

  // ================================================================ VIEW: floor (low on the tiles, where Deena lies)
  const FLR = (() => {
    const pp = persp({ HZ: 150, EYE: 0.55, FL: 1150, VPX: 900 }); const P = pp.P;
    const ZB = 3.2, KICK = P(0, 0, ZB)[1];   // ~348
    const DU = 0.235 * pp.K(2.2), floorD = P(0, 0, 2.2)[1], DX = 640, DY = floorD - 0.6 * DU;
    const light = { x: 1700, y: 250, color: C.hood, mid: C.hoodMid, low: C.hoodLow };
    const POOL = { src: [DX + 3.0 * DU, floorD - 2], x: DX + 2.7 * DU, y: floorD + 40, rx: 470, ry: 112, seed: 33, light, fade: 1500, lip: 2.6 };
    const PRINT = { at: [DX + 1.55 * DU, floorD + 96], s: 128, sq: 0.36, a: -0.35 };
    function drawBack(g) {
      g.fillStyle = C.ink; g.fillRect(-200, -200, W + 400, H + 400);
      // the counter run's doors and kick plate across the back, the stove base at right
      g.fillStyle = '#0B0908'; g.fill(S().rect(-200, -200, 1640, KICK - 36 + 200).path(0.8, 150));
      [240, 620, 1000].forEach(x => { g.fillStyle = '#050404'; g.fillRect(x, -200, 3, KICK - 40 + 200); });
      g.fillStyle = '#050404'; g.fillRect(-200, KICK - 40, 1660, 40);
      g.fillStyle = '#0D0A09'; g.fill(S().rect(1440, -200, W - 1440 + 200, KICK - 36 + 200).path(0.8, 151));
      g.fillStyle = '#060404'; g.fillRect(1440, KICK - 40, W - 1440 + 200, 40);
      // floor: light from the stove side, posterised, then the checker
      g.save(); g.beginPath(); g.rect(-200, KICK, W + 400, H - KICK + 200); g.clip();
      g.fillStyle = C.ink; g.fillRect(-200, KICK, W + 400, H + 200);
      O.lightPool(g, 1560, KICK + 50, [{ r: 1400, color: '#110D09' }, { r: 1100, color: '#1C160C' }, { r: 800, color: C.hoodLow }, { r: 460, color: C.hoodMid }, { r: 180, color: C.hood }], { sy: 0.18, rough: 2.2, seed: 152 });
      checker(g, P, 0.3, ZB, 0.75, -6, 6, 0.48, 0);
      g.restore();
      g.fillStyle = C.hoodMid; g.fill(poly([[1440, KICK - 42], [W + 200, KICK - 42], [W + 200, KICK - 38], [1440, KICK - 38]]).path(0.4, 153));
    }
    const ovenGlow = P2([[1480, KICK - 6], [W + 40, KICK - 6], [W + 40, KICK + 230], [1260, KICK + 120]]);
    return {
      h: H, light, persp: pp,
      back(c, t, st) {
        const g = c.g, E = c.em, lvl = hoodLevel(t, st);
        putC(c, crop(c, 'floor.back', drawBack, { x: -MARGIN, y: -48, w: W + 2 * MARGIN, h: H + 48 + MARGIN }), jit(t, st, 0.35, 51));
        dimPath(g, P2([[700, KICK], [W + 60, KICK], [W + 60, H + 60], [700, H + 60]]), lvl, 0.55);
        // the open oven at right: its door down on the floor, glare spilling over the tiles
        if (st.ovenOpen > 0.01) {
          const a = clamp(st.ovenOpen * 2, 0, 1);
          O.cone(g, [[1500, KICK - 8], [W + 40, KICK - 8], [W + 40, KICK + 260], [1180, KICK + 150]], C.hood, 0.08 * a);
          g.fillStyle = C.ink; g.fill(poly([[1470, KICK - 10], [W + 40, KICK - 10], [W + 40, KICK + 30], [1430, KICK + 20]]).path(0.8, 154));
          g.strokeStyle = C.hood; g.lineWidth = 3; g.globalAlpha = a; g.beginPath(); g.moveTo(1470, KICK - 10); g.lineTo(W + 40, KICK - 10); g.stroke(); g.globalAlpha = 1;
          E.save(); E.globalAlpha = a * lvl; E.fillStyle = C.hood; E.fillRect(1480, KICK - 30, 460, 24); E.restore();
        }
        haze(g, t, { seed: 'floorAir', x0: 0, x1: W, y0: 160, y1: 330, rows: 6, wmin: 40, wvar: 220, gap: 40, gapv: 160, a0: 0.04, a1: 0.06 }, st.gas * 0.6);
        drawPool(g, POOL, st.blood);
        if (st.cig > 0.5) { g.save(); g.translate(DX - 0.8 * DU, floorD + 72); g.rotate(-0.08); g.fillStyle = C.cardPaper; g.fillRect(-15, -2, 30, 4); g.fillStyle = C.hoodLow; g.fillRect(9, -2, 6, 4); g.restore(); }
        handprint(c, PRINT.at, PRINT.s, PRINT.sq, PRINT.a, st.handprint * 0.55);
      },
      mid(c, t, st) { const jp = drawJacket(c.g, { x: DX, y: DY, u: DU, rimW: 3 }, st.jacket, light); if (jp) occlude(c, jp); },   // the jacket hides any hole under it
      front() { }, clip: () => P2([[700, KICK], [W, KICK], [W, H], [700, H]]),
      anchors: { deena: { x: DX, y: DY, scale: DU, rot: Math.PI / 2, note: 'deenaLying(): profile at (0,0) anchor hip, rotate +PI/2, translate (x,y); head toward +x' },
        head: [DX + 2.89 * DU, DY + 0.18 * DU], throat: [DX + JK.throat[0] * DU, DY + JK.throat[1] * DU], neck: [DX + 2.4 * DU, DY], jacketEnd: [DX + JK.end * DU, DY - 0.24 * DU], floorY: floorD, pool: [POOL.x, POOL.y], handprint: PRINT.at, cig: [DX - 0.8 * DU, floorD + 72],
        angelo: { x: DX + 2.2 * DU, y: P(0, 0, 2.75)[1], scale: 0.235 * pp.K(2.75), facing: -1, note: 'kneeling behind her (far side)' }, kick: KICK, ovenGlow: [1700, KICK] },
      cams: { wide: { x: 960, y: 520, zoom: 1 }, hand: { x: PRINT.at[0] + 40, y: PRINT.at[1] - 20, zoom: 1.35 }, jacket: { x: DX + 2.0 * DU, y: DY + 30, zoom: 1.25 }, pool: { x: POOL.x, y: POOL.y - 30, zoom: 1.15 } },
    };
  })();

  // ================================================================ VIEW: doorway (to the hall; Marina's place, then nobody's)
  const DW = (() => {
    const DL = 770, DR = 1110, DTOP = 176, FL0 = 966, VP = [890, 560];
    const light = { x: 2300, y: 300, color: C.hood, mid: C.hoodMid, low: C.hoodLow };
    function drawBack(g) {
      g.fillStyle = C.ink; g.fillRect(-200, -200, W + 400, H + 400);
      // the kitchen wall: the hood light comes from behind camera-right and rakes across it in hard posterised bands,
      // cut by the shadow of the fridge we never see (its edge is the diagonal)
      g.fillStyle = '#0D0A09'; g.fillRect(-200, -200, W + 400, FL0 + 200);
      const band = (pts, col, seed, dither) => { const pa = poly(pts).path(2.2, seed); g.fillStyle = col; g.fill(pa); if (dither) { g.save(); g.strokeStyle = O.ditherPattern(g, dither); g.lineWidth = 5; g.stroke(pa); g.restore(); } };
      band([[1150, -60], [W + 60, -60], [W + 60, FL0], [1196, FL0]], '#17120C', 167);
      band([[1290, -60], [W + 60, -60], [W + 60, FL0], [1390, FL0]], '#211A0D', 168, '#17120C');
      band([[1470, -60], [W + 60, -60], [W + 60, FL0], [1610, FL0]], C.hoodLow, 169, '#211A0D');
      band([[1700, -60], [W + 60, -60], [W + 60, FL0], [1880, FL0]], C.hoodMid, 170, C.hoodLow);
      // a light switch by the door, and its shadow
      const swP = S().rect(1206, 520, 30, 50).path(0.4, 171); g.fillStyle = '#0A0807'; g.fill(swP); rim(g, swP, [1, 0], 2, C.hoodLow);
      // the hall: the far end goes to black; the kitchen light spills over the threshold onto its floor
      g.fillStyle = '#050403'; g.fillRect(DL, DTOP, DR - DL, FL0 - DTOP);
      const far = { l: 852, r: 958, t: 404, b: 656 };
      g.fillStyle = '#0E0B09'; g.fill(P2([[DL + 30, DTOP], [far.l, far.t], [far.l, far.b], [DL + 30, FL0]]));   // hall's left wall
      g.fillStyle = '#0A0807'; g.fill(P2([[DL + 30, FL0], [DR, FL0], [far.r, far.b], [far.l, far.b]]));          // hall floor
      g.fillStyle = '#030202'; g.fillRect(far.l, far.t, far.r - far.l, far.b - far.t);                                // the far end
      g.fillStyle = '#0C0908'; g.fill(P2([[DL + 120, 300], [DL + 150, 340], [DL + 150, 770], [DL + 120, 800]]));     // a closed door along the hall
      g.fillStyle = rgba(C.hoodLow, 0.95); g.fill(P2([[DL + 40, FL0], [DR, FL0], [DR - 70, 862], [DL + 120, 850]]));    // the spill
      g.fillStyle = rgba(C.hoodMid, 0.55); g.fill(P2([[DL + 150, FL0], [DR - 20, FL0], [DR - 90, 912], [DL + 210, 904]]));
      // architrave: the left jamb's inner face catches the light; the right one is in its own shadow
      const archL = poly([[DL - 40, DTOP - 40], [DL, DTOP - 40], [DL, FL0], [DL - 40, FL0]]).path(0.8, 161);
      const archR = poly([[DR, DTOP - 40], [DR + 40, DTOP - 40], [DR + 40, FL0], [DR, FL0]]).path(0.8, 162);
      const archT = poly([[DL - 40, DTOP - 40], [DR + 40, DTOP - 40], [DR + 40, DTOP], [DL - 40, DTOP]]).path(0.8, 163);
      g.fillStyle = '#0B0908'; g.fill(archL); g.fill(archR); g.fill(archT);
      g.fillStyle = C.hoodLow; g.fill(poly([[DL, DTOP], [DL + 30, DTOP + 8], [DL + 30, FL0], [DL, FL0]]).path(0.6, 164));
      g.fillStyle = C.hoodMid; g.fill(poly([[DL, DTOP], [DL + 6, DTOP + 2], [DL + 6, FL0], [DL, FL0]]).path(0.4, 165));
      rim(g, archR, [1, 0], 2.5, C.hoodMid); rim(g, archT, [1, -0.3], 2, C.hoodLow);
      // kitchen floor under us, threshold strip
      g.save(); g.beginPath(); g.rect(-200, FL0, W + 400, H - FL0 + 200); g.clip(); g.fillStyle = C.ink; g.fillRect(-200, FL0, W + 400, H + 200);
      O.lightPool(g, 2000, FL0 + 30, [{ r: 1200, color: '#16110B' }, { r: 860, color: '#221B0D' }, { r: 560, color: C.hoodLow }], { sy: 0.1, rough: 2, seed: 166 });
      const pf = persp({ HZ: 560, EYE: 1.4, FL: 1150, VPX: 890 }); checker(g, pf.P, 0.32, 3.95, 1.2, -5, 5, 0.5, 1);
      g.restore();
      g.fillStyle = C.hoodMid; g.fillRect(DL, FL0 - 3, DR - DL, 4); g.fillStyle = '#050404'; g.fillRect(-200, FL0 - 1, W + 400, 3);
      // skirting
      g.fillStyle = '#0A0807'; g.fillRect(-200, FL0 - 22, DL - 40 + 200, 22); g.fillRect(DR + 40, FL0 - 22, W - DR - 40 + 200, 22);
      rim(g, P2([[1300, FL0 - 22], [W + 200, FL0 - 22], [W + 200, FL0], [1300, FL0]]), [0, -1], 2, C.hoodLow);
    }
    return {
      h: H, light,
      back(c, t, st) {
        const g = c.g, lvl = hoodLevel(t, st);
        putC(c, crop(c, 'doorway.back', drawBack, FULL()), jit(t, st, 0.35, 61));
        dimPath(g, P2([[1150, -60], [W + 60, -60], [W + 60, H + 60], [1150, H + 60]]), lvl, 0.55);
        haze(g, t, { seed: 'doorAir', x0: 0, x1: W, y0: 200, y1: 700, rows: 7, wmin: 40, wvar: 200, gap: 50, gapv: 200, a0: 0.03, a1: 0.05 }, st.gas * 0.55);
        drawPerf(c, 'doorway', st.perforations);
      },
      mid() { },
      front(c, t, st) { drawRing(c.g, t, DW.anchors.ring, st.ring, 15); },
      clip: () => P2([[DL, 0], [W, 0], [W, H], [DL, H]]),
      anchors: { door: [DL, DTOP, DR, FL0], centre: [(DL + DR) / 2, (DTOP + FL0) / 2], marina: { x: 948, y: 1000, scale: 100, facing: -1 }, ring: [1004, 452], floorY: FL0, hallEnd: [905, 530] },
      cams: { wide: { x: 960, y: 540, zoom: 1 }, door: { x: 940, y: 560, zoom: 1.12 }, ring: { x: 1004, y: 470, zoom: 1.4 } },
    };
  })();

  // ================================================================ VIEW: entry (the empty kitchen as they come in)
  const EN = (() => {
    const pp = persp({ HZ: 430, EYE: 1.6, FL: 1000, VPX: 960 }); const P = pp.P, ZW = 5.6;
    const WF = P(0, 0, ZW)[1], CEILY = P(0, 2.5, ZW)[1];
    const X = { dL: -2.95, dR: -2.03, cL: -1.8, cR: 2.3, uR: 0.95, sL: 2.38, sR: 3.62, hL: 2.28, hR: 3.72, wL: -3.6, wR: 4.0 };
    const x = v => P(v, 0, ZW)[0], y = h => P(0, h, ZW)[1];
    const LAMP = { x: x(X.hL) + 70, y: y(1.6) };
    const light = { x: LAMP.x, y: LAMP.y, color: C.hood, mid: C.hoodMid, low: C.hoodLow };
    const dirFrom = p => norm2(LAMP.x - p[0], LAMP.y - p[1]);
    const BAR = { X0: -1.0, X1: 0.75, z0: 4.0, z1: 4.55, h: 0.95 };
    // three chairs: two tucked in at the bar (backs to camera), the third pushed out past the bar's left end and turned toward the
    // stove, clear of the stove, the oven door and Scott's path to them
    const CH = [{ X: -0.55, z: 3.66, yaw: 0.03 }, { X: 0.3, z: 3.68, yaw: -0.05 }, { X: -1.38, z: 3.06, yaw: 0.95 }];
    const LAMP3 = { X: X.hL + 0.39, h: 1.58, z: ZW - 0.3 };
    function drawBack(g) {
      g.fillStyle = C.ink; g.fillRect(-200, -200, W + 400, H + 400);
      g.fillStyle = '#100C0A'; g.fillRect(x(X.wL), CEILY, x(X.wR) - x(X.wL), WF - CEILY);
      // side walls and ceiling, darker planes
      g.fillStyle = '#090706'; g.fill(P2([P(X.wL, 2.5, ZW), P(X.wL, 0, ZW), P(X.wL, 0, 2.2), P(X.wL, 2.5, 2.2)])); g.fill(P2([P(X.wR, 2.5, ZW), P(X.wR, 0, ZW), P(X.wR, 0, 2.2), P(X.wR, 2.5, 2.2)]));
      g.fillStyle = '#070504'; g.fill(P2([P(X.wL, 2.5, ZW), P(X.wR, 2.5, ZW), P(X.wR, 2.5, 2.2), P(X.wL, 2.5, 2.2)]));
      // the hood lamp on the back wall
      O.lightPool(g, LAMP.x, LAMP.y + 30, [{ r: 470, color: '#130E09' }, { r: 360, color: '#19140B' }, { r: 250, color: '#28210F' }], { sy: 0.8, rough: 2.2, seed: 170 });
      g.save(); g.beginPath(); g.rect(0, LAMP.y, W, WF - LAMP.y); g.clip();
      O.lightPool(g, LAMP.x, LAMP.y, [{ r: 380, color: C.hoodLow }, { r: 270, color: C.hoodMid }, { r: 130, color: C.hood }], { sy: 0.72, rough: 2, seed: 171 });
      g.restore();
      // floor
      g.save(); g.beginPath(); g.rect(-200, WF, W + 400, H - WF + 200); g.clip(); g.fillStyle = C.ink; g.fillRect(-200, WF, W + 400, H + 200);
      O.lightPool(g, LAMP.x - 40, WF + 50, [{ r: 1200, color: '#14100A' }, { r: 950, color: '#221C0D' }, { r: 720, color: C.hoodLow }, { r: 430, color: C.hoodMid }, { r: 170, color: C.hood }], { sy: 0.24, rough: 2, seed: 172 });
      checker(g, P, 0.3, ZW, 2.3, -4, 4.2, 0.46, 0);
      g.restore();
      g.fillStyle = '#070505'; g.fillRect(x(X.wL), WF - 3, x(X.wR) - x(X.wL), 6);
      // back door: frame, night glass, the fence beyond; mullions and the handle are on the door slab (per frame)
      g.fillStyle = '#070505'; g.fillRect(x(X.dL) - 11, y(2.06) - 11, x(X.dR) - x(X.dL) + 22, WF - y(2.06) + 11);
      nightScene(g, x(X.dL), y(2.06), x(X.dR), WF, y(1.96), y(0.98));
      // counter run and uppers, an upper cupboard door standing open
      const cL = x(X.cL), cR = x(X.cR), cTop = y(0.9), uB = y(1.45), uR = x(X.uR);
      g.fillStyle = '#0B0908'; g.fill(S().rect(cL, cTop, cR - cL, WF - cTop).path(0.7, 173));
      const ctP = S().rect(cL - 5, cTop - 8, cR - cL + 10, 9).path(0.6, 174); g.fillStyle = '#17120F'; g.fill(ctP);
      for (let i = 1; i < 5; i++) { g.fillStyle = '#050404'; g.fillRect(cL + (cR - cL) * i / 5 - 1, cTop + 3, 2.5, WF - cTop - 6); }
      g.fillStyle = '#0B0908'; g.fill(S().rect(cL, CEILY, uR - cL, uB - CEILY).path(0.7, 175));
      for (let i = 1; i < 4; i++) { g.fillStyle = '#050404'; g.fillRect(cL + (uR - cL) * i / 4 - 1, CEILY, 2.5, uB - CEILY); }
      // the open upper cupboard (the run's last section): a dark mouth with a shelf, jars, a tin; the door swung out ~115 degrees on
      // its right-hand hinge, its edge toward the lamp burning hoodMid so the wide shot counts it at a glance
      const oL = cL + (uR - cL) * 3 / 4 + 3, oR = uR - 2, oT = CEILY + 7, oB = uB - 5, shelfY = oT + (oB - oT) * 0.47;
      g.fillStyle = VOID; g.fill(S().rect(oL, oT, oR - oL, oB - oT).path(0.5, 230));
      g.fillStyle = mix(C.hoodLow, C.ink, 0.45); g.fillRect(oL + 2, oT, oR - oL - 4, 3);
      [shelfY, oB - 4].forEach(sy => { g.fillStyle = '#120E0B'; g.fillRect(oL + 2, sy, oR - oL - 4, 5); g.fillStyle = C.hoodLow; g.fillRect(oL + 2, sy, oR - oL - 4, 1.6); });
      const jar = (cx, base, w, h, lid, seed) => { const sh = S().rect(cx - w / 2, base - h, w, h); if (lid) sh.rect(cx - w * 0.4, base - h - 6, w * 0.8, 7); const jp = sh.path(0.5, seed); g.fillStyle = '#0A0807'; g.fill(jp); rim(g, jp, [1, -0.25], 1.8, C.hoodMid); };
      jar(oL + 22, shelfY, 22, 36, true, 231); jar(oL + 52, shelfY, 18, 27, false, 232); jar(oL + 80, shelfY, 26, 44, true, 233);
      jar(oL + 30, oB - 4, 34, 30, false, 234); jar(oL + 74, oB - 4, 20, 50, true, 235);
      const dw = (X.uR - X.cL) / 4, th = 1.15 * Math.PI / 2 + 0.24, fx = X.uR + dw * Math.cos(Math.PI - th), fz = ZW - dw * Math.sin(Math.PI - th);
      const dq = [P(X.uR, 2.47, ZW), P(fx, 2.47, fz), P(fx, 1.47, fz), P(X.uR, 1.47, ZW)];
      const cdP = S().poly(dq).path(0.6, 176); g.fillStyle = '#0D0A09'; g.fill(cdP);
      g.fillStyle = mix(C.hoodLow, C.ink, 0.35); g.fill(poly([L2(dq[0], dq[1], 0.55), dq[1], dq[2], L2(dq[3], dq[2], 0.55)]).path(0.5, 177));   // the inner face, the lamp's spill on its far half
      g.fillStyle = C.hoodMid; g.fill(poly([L2(dq[0], dq[1], 0.9), dq[1], dq[2], L2(dq[3], dq[2], 0.9)]).path(0.4, 178));                     // the edge band toward the lamp
      g.strokeStyle = '#050404'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(dq[0][0], dq[0][1]); g.lineTo(dq[3][0], dq[3][1]); g.stroke();      // hinge shadow
      rim(g, ctP, [0, -1], 2, C.hoodMid, { fade: { x: LAMP.x, y: LAMP.y, r0: 40, r1: 520 } });
      // the low cabinet left of the stove: its door open too
      // the low cabinet left of the stove: door swung open toward camera-left, its inner face turned to the lamp and lit;
      // a shelf, the gas pipe and a bottle in the dark; broken knob plastic on the tiles at its foot
      const lcL = x(1.7), lcR = x(X.sL) - 3, lT = cTop + 8, lB = WF - 10;
      g.fillStyle = VOID; g.fillRect(lcL + 4, lT, lcR - lcL - 8, lB - lT);
      const lsY = lT + (lB - lT) * 0.5; g.fillStyle = '#120E0B'; g.fillRect(lcL + 6, lsY, lcR - lcL - 12, 4); g.fillStyle = C.hoodLow; g.fillRect(lcL + 6, lsY, lcR - lcL - 12, 1.5);
      const pipe = S().rect(lcR - 26, lT, 7, lB - lT).rect(lcR - 44, lsY + 18, 25, 6).path(0.4, 236); g.fillStyle = '#0A0807'; g.fill(pipe); rim(g, pipe, [1, -0.2], 1.6, C.hoodMid);
      const btl = S().rect(lcL + 22, lsY - 34, 16, 34).rect(lcL + 27, lsY - 44, 6, 11).path(0.4, 237); g.fillStyle = '#0A0807'; g.fill(btl); rim(g, btl, [1, -0.3], 1.6, C.hoodLow);
      const ld = [[lcL + 4, lT], [lcL - 30, lT + 12], [lcL - 30, WF + 8], [lcL + 4, lB]];
      const ldP = poly(ld).path(0.6, 177); g.fillStyle = mix(C.hoodLow, C.ink, 0.45); g.fill(ldP);
      g.fillStyle = mix(C.hoodLow, C.ink, 0.15); g.fill(poly([ld[0], L2(ld[0], ld[1], 0.5), L2(ld[3], ld[2], 0.5), ld[3]]).path(0.4, 238));
      g.fillStyle = C.hoodMid; g.fill(poly([ld[0], L2(ld[0], ld[1], 0.14), L2(ld[3], ld[2], 0.14), ld[3]]).path(0.3, 239));
      g.fillStyle = '#060404'; g.fill(poly([ld[1], [ld[1][0] - 5, ld[1][1] + 1], [ld[2][0] - 5, ld[2][1]], ld[2]]).path(0.3, 240));
      [[lcL - 18, WF + 14, 0.5, 1], [lcL + 14, WF + 9, -0.7, 0.8], [lcL + 44, WF + 16, 1.4, 1.1], [lcL + 70, WF + 11, 0.2, 0.7]].forEach(([sx, sy, a, k], i) => {
        g.save(); g.translate(sx, sy); g.rotate(a); g.scale(k, k); g.fillStyle = i % 2 ? C.hoodMid : C.hood; g.beginPath(); g.moveTo(-6, -2); g.lineTo(5, -4); g.lineTo(7, 2); g.lineTo(-3, 4); g.closePath(); g.fill(); g.restore(); });
      // light cone in the gassy air
      const hB = y(1.6);
      O.cone(g, [[LAMP.x - 46, hB + 2], [LAMP.x + 76, hB + 2], [LAMP.x + 230, WF + 60], [LAMP.x - 200, WF + 60]], C.hood, 0.085);
      O.cone(g, [[LAMP.x - 26, hB + 2], [LAMP.x + 46, hB + 2], [LAMP.x + 140, WF + 40], [LAMP.x - 120, WF + 40]], C.hood, 0.07);
      // hood canopy and its lamp
      const hL = x(X.hL), hR = x(X.hR), mid = (hL + hR) / 2;
      g.fillStyle = C.ink; g.fill(S().poly([[hL, hB], [hR, hB], [hR - 30, hB - 30], [mid + 44, hB - 80], [mid + 44, CEILY - 20], [mid - 44, CEILY - 20], [mid - 44, hB - 80], [hL + 30, hB - 30]]).path(0.7, 178));
      g.fillStyle = C.hood; g.fill(S().rect(LAMP.x - 36, hB - 4, 72, 4).path(0.3, 179));
      // the stove: hob lit, a pan and a pot, four knobs (drawn per frame), oven door
      const sL = x(X.sL), sR = x(X.sR);
      g.fillStyle = C.ink; g.fill(S().rect(sL, cTop, sR - sL, WF - cTop).path(0.7, 180));
      g.fillStyle = C.hood; g.fill(S().rect(sL - 3, cTop - 4, sR - sL + 6, 4).path(0.5, 181));
      g.fillStyle = C.ink; g.fill(S().M(sL + 30, cTop - 3).L(sL + 33, cTop - 30).L(sL + 86, cTop - 30).L(sL + 89, cTop - 3).Z().rect(sL + 86, cTop - 28, 48, 5).path(0.6, 182));
      g.fill(S().ellipse(sR - 56, cTop - 16, 29, 14).rect(sR - 77, cTop - 16, 42, 14).capsule(sR - 56, cTop - 33, 3, sR - 56, cTop - 38, 4).path(0.6, 183));
      g.fillStyle = '#050404'; g.fill(S().rect(sL + 15, cTop + 40, sR - sL - 30, WF - cTop - 58).path(0.6, 184));
      g.strokeStyle = rgba(C.hoodMid, 0.85); g.lineWidth = 1.5; g.beginPath(); g.moveTo(sL + 20, cTop + 50); g.lineTo(sR - 20, cTop + 50); g.stroke();
      // the little breakfast counter, front face to us
      const bf = [P(BAR.X0, BAR.h, BAR.z0), P(BAR.X1, BAR.h, BAR.z0), P(BAR.X1, 0, BAR.z0), P(BAR.X0, 0, BAR.z0)];
      const bt = [P(BAR.X0 - 0.04, BAR.h, BAR.z1), P(BAR.X1 + 0.04, BAR.h, BAR.z1), P(BAR.X1 + 0.04, BAR.h, BAR.z0 - 0.06), P(BAR.X0 - 0.04, BAR.h, BAR.z0 - 0.06)];
      // its front is a paler sheet (soot) so the ink chairs read against it; the top catches the hood light
      const bfP = poly(bf).path(0.7, 185); g.fillStyle = '#1C1612'; g.fill(bfP);
      g.fillStyle = '#231B15'; g.fill(poly([L2(bf[0], bf[1], 0.55), bf[1], bf[2], L2(bf[3], bf[2], 0.55)]).path(0.7, 188));
      const btP = poly(bt).path(0.6, 186); g.fillStyle = '#2A201B'; g.fill(btP);
      g.fillStyle = '#0E0B09'; g.fill(poly([bt[3], bt[2], [bt[2][0], bt[2][1] + 11], [bt[3][0], bt[3][1] + 11]]).path(0.5, 187));
      rim(g, btP, [0.25, -1], 3, C.hoodMid, { fade: { x: LAMP.x, y: LAMP.y, r0: 200, r1: 1200 } });
      rim(g, bfP, [1, 0], 3, C.hoodMid, { fade: { x: LAMP.x, y: LAMP.y, r0: 200, r1: 1100 } });
      // three chairs: two tucked in, the third pushed away and turned
      CH.forEach((ch, i) => { const cs = chair3D(P, ch.X, ch.z, ch.yaw, i === 2 ? LAMP3 : null); const cP = cs.shape.path(0.4, 190 + i);
        if (cs.shadow) { g.save(); g.globalAlpha = 0.5; g.fillStyle = C.ink; g.fill(cs.shadow.path(0.6, 194)); g.restore(); }
        g.fillStyle = '#060404'; g.fill(cP); rim(g, cP, dirFrom(cs.seat), 2.4, C.hoodMid, { fade: { x: LAMP.x, y: LAMP.y, r0: 100, r1: 1600 } }); });
    }
    // the hall doorway we look through: jambs first (filled and rimmed), then the lintel over them, its underside rimmed only
    // between the jambs, so no jamb rim runs up through the beam
    function drawFront(g) {
      const jl = poly([[-320, -320], [178, -320], [166, H + 320], [-320, H + 320]]).path(0.8, 195), jr = poly([[1742, -320], [W + 320, -320], [W + 320, H + 320], [1754, H + 320]]).path(0.8, 196);
      g.fillStyle = '#070504'; g.fill(jl); g.fill(jr);
      rim(g, jl, [1, 0], 2.5, C.hoodLow); rim(g, jr, [-1, 0], 1.5, C.hoodLow, { alpha: 0.6 });
      const lt = poly([[-320, -320], [W + 320, -320], [W + 320, 86], [-320, 92]]).path(0.8, 197);
      g.fillStyle = '#070504'; g.fill(lt);
      g.save(); g.beginPath(); g.rect(176, -320, 1742 - 176 + 2, 600); g.clip(); rim(g, lt, [0, 1], 2, C.hoodLow, { alpha: 0.7 }); g.restore();
    }
    const FRONT_R = [{ x: -320, y: -320, w: 510, h: H + 640 }, { x: 1730, y: -320, w: 510, h: H + 640 }, { x: 190, y: -320, w: 1540, h: 416 }];
    return {
      h: H, light, persp: pp,
      back(c, t, st) {
        const g = c.g, E = c.em, lvl = hoodLevel(t, st);
        putC(c, crop(c, 'entry.back', drawBack, { x: -MARGIN, y: -MARGIN, w: W + 2 * MARGIN, h: H + 90 }), jit(t, st, 0.35, 71));
        dimPath(g, P2([[1100, 300], [W + 60, 300], [W + 60, H + 60], [1100, H + 60]]), lvl, 0.6);
        E.save(); E.globalAlpha = lvl; E.fillStyle = C.hood; E.fillRect(LAMP.x - 50, y(1.6) - 10, 100, 14); E.restore();
        const cTop = y(0.9);
        haze(g, t, { seed: 'entryHob', x0: x(X.sL) - 30, x1: x(X.sR) + 30, y0: cTop - 90, y1: cTop - 20, rows: 7, taper: 4, wmin: 10, wvar: 50, gap: 6, gapv: 20 }, st.gas);
        motes(g, t, [[LAMP.x - 40, y(1.6) + 4], [LAMP.x + 70, y(1.6) + 4], [LAMP.x + 220, WF + 40], [LAMP.x - 190, WF + 40]], 40, C.hood, 'entryMotes', 0.7);
        const sL = x(X.sL), sR = x(X.sR), ky = cTop + 20;
        for (let i = 0; i < 4; i++) { const kx = sL + 32 + i * ((sR - sL - 64) / 3); if (st.knobs === 2 && (i === 1 || i === 2)) { g.fillStyle = C.hoodMid; g.fillRect(kx - 1.5, ky - 5, 3, 8); continue; } g.fillStyle = '#050404'; g.beginPath(); g.arc(kx, ky, 8, 0, 7); g.fill(); g.strokeStyle = C.hoodMid; g.lineWidth = 1.5; g.beginPath(); g.arc(kx, ky, 8, -2.7, -0.6); g.stroke(); }
        doorSlab(g, P, ZW, X.dL, X.dR, st.backDoor, LAMP);
        drawPerf(c, 'entry', st.perforations);
      },
      mid() { },
      front(c, t, st) { const j = jit(t, st, 1.0, 73); FRONT_R.forEach((r, i) => putC(c, crop(c, 'entry.front' + i, drawFront, r), j)); },
      clip: () => P2([[1100, 300], [W, 300], [W, H], [1100, H]]),
      anchors: { stove: [(x(X.sL) + x(X.sR)) / 2, y(0.5)], ovenHandle: [(x(X.sL) + x(X.sR)) / 2, y(0.9) + 44], backDoor: [x(X.dL), y(2.06), x(X.dR), WF], counter: [960, y(0.9)], bar: P((BAR.X0 + BAR.X1) / 2, BAR.h, BAR.z0),
        chairs: CH.map(ch => P(ch.X, 0, ch.z)), pushedChair: P(CH[2].X, 0, CH[2].z), hallDoorway: [960, 1080], wallFloorY: WF, lamp: [LAMP.x, LAMP.y],
        marks: { scott: { x: 1130, y: 985, scale: pp.scaleAt(985), facing: 1 }, deena: { x: 760, y: 950, scale: pp.scaleAt(950), facing: 1 }, marina: { x: 330, y: 985, scale: pp.scaleAt(985), facing: 1 }, angelo: { x: 1010, y: 895, scale: pp.scaleAt(895), facing: -1 } } },
      cams: { wide: { x: 960, y: 540, zoom: 1 }, push: { x: 1010, y: 560, zoom: 1.07 }, stove: { x: 1420, y: 560, zoom: 1.35 }, cupboard: { x: 1040, y: 470, zoom: 1.5 }, chair: { x: 760, y: 690, zoom: 1.3 } },
    };
  })();
  // night through the back door: sky, the yard, the fence (shared by entry and standoff). x0..x1 opening, gT/gB the glass band of the door
  function nightScene(g, x0, yT, x1, yB, gT, gB) {
    g.fillStyle = C.backdoorNight; g.fillRect(x0, yT, x1 - x0, yB - yT);
    const yardY = gT + (gB - gT) * 0.64;
    g.fillStyle = '#121E2E'; g.fillRect(x0, yardY, x1 - x0, yB - yardY);
    g.fillStyle = '#0C1520'; const n = 8, sw = (x1 - x0 - 30) / n;
    for (let i = 0; i < n; i++) { const sx = x0 + 15 + i * sw + 2; g.fill(P2([[sx, yB], [sx, yardY + 6], [sx + (sw - 5) / 2, yardY - 2], [sx + sw - 5, yardY + 6], [sx + sw - 5, yB]])); }
    g.fillStyle = '#0A111A'; g.fillRect(x0, yB - (yB - yardY) * 0.25, x1 - x0, (yB - yardY) * 0.25);   // the step down into the yard
  }
  // the back door slab: closed it fills the frame (four panes onto the night); open it swings in on its left hinge
  function doorSlab(g, P, ZW, XL, XR, open, LAMP) {
    const w = XR - XL, th = open * 1.42, hX = XL, fX = XL + w * Math.cos(th), fz = ZW - w * Math.sin(th);
    const at = (s, h) => P(lerp(hX, fX, s), h, lerp(ZW, fz, s));
    const quad = [at(0, 2.06), at(1, 2.06), at(1, 0), at(0, 0)];
    if (open > 0.01) {   // cold spill on the floor through the opening
      g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.35 * open; g.fillStyle = C.backdoorNight;
      g.fill(P2([P(XL, 0, ZW), P(XR, 0, ZW), P(XR + 0.35, 0, ZW - 1.6), P(XL + 0.15, 0, ZW - 1.6)])); g.restore();
    }
    const slab = S().poly(quad), pane = (s0, s1, h0, h1) => [at(s0, h1), at(s1, h1), at(s1, h0), at(s0, h0)];
    const panes = [pane(0.16, 0.48, 1.5, 1.96), pane(0.52, 0.84, 1.5, 1.96), pane(0.16, 0.48, 0.98, 1.46), pane(0.52, 0.84, 0.98, 1.46)];
    const p = new Path2D(); p.addPath(slab.path(0.6, 200)); panes.forEach(q => { const r = P2(q.slice().reverse()); p.addPath(r); });
    g.fillStyle = '#0E0B0A'; g.fill(p, 'evenodd');
    if (open > 0.01) { panes.forEach(q => { g.fillStyle = '#0E1622'; g.fill(P2(q)); g.fillStyle = rgba(C.rainSlate, 0.35); g.fill(P2([L2(q[0], q[1], 0.15), L2(q[0], q[1], 0.35), L2(q[3], q[2], 0.2), L2(q[3], q[2], 0.0)])); });
      g.strokeStyle = C.hoodLow; g.lineWidth = 2.5; g.beginPath(); g.moveTo(quad[1][0], quad[1][1]); g.lineTo(quad[2][0], quad[2][1]); g.stroke(); }
    const hd = at(0.88, 0.98); g.fillStyle = '#070505'; g.fillRect(hd[0] - 10 + (open > 0.5 ? -6 : 0), hd[1] - 2, 16 * (1 - 0.6 * open) + 4, 6);
    return quad;
  }

  // ================================================================ VIEW: standoff (F11)
  const SO = (() => {
    const pp = persp({ HZ: 470, EYE: 1.2, FL: 1150, VPX: 960 }); const P = pp.P, ZW = 5;
    const WF = P(0, 0, ZW)[1];
    const sL = P(2.42, 0, ZW)[0], sR = P(3.85, 0, ZW)[0], hL = P(2.3, 0, ZW)[0], hR = P(3.98, 0, ZW)[0], hB = P(0, 1.6, ZW)[1], cTop = P(0, 0.9, ZW)[1];
    const LAMP = { x: hL + 118, y: hB };
    const dL = P(-2.78, 0, ZW)[0], dR = P(-1.86, 0, ZW)[0], dT = P(0, 2.06, ZW)[1];
    const light = { x: LAMP.x, y: LAMP.y, color: C.hood, mid: C.hoodMid, low: C.hoodLow, glint: C.lighterCream };
    const dirFrom = p => norm2(LAMP.x - p[0], LAMP.y - p[1]);
    const zD = 3.48, floorD = P(0, 0, zD)[1], DU = 76, DX = 1384 - 3.45 * DU, DY = floorD - 0.6 * DU;
    const zA = 3.62, floorA = P(0, 0, zA)[1];
    function drawBack(g) {
      g.fillStyle = C.ink; g.fillRect(-200, -200, W + 400, H + 400);
      g.fillStyle = '#110D0B'; g.fillRect(-200, -200, W + 400, WF + 200);
      O.lightPool(g, LAMP.x, LAMP.y, [{ r: 860, color: '#140F09' }, { r: 640, color: '#19140B' }, { r: 430, color: '#28210F' }], { sy: 0.86, rough: 2.4, seed: 7 });
      g.save(); g.beginPath(); g.rect(-200, hB, W + 400, WF - hB); g.clip();
      O.lightPool(g, LAMP.x, LAMP.y, [{ r: 470, color: C.hoodLow }, { r: 340, color: C.hoodMid }, { r: 165, color: C.hood }], { sy: 0.72, rough: 2.2, seed: 8 });
      g.restore();
      g.fillStyle = C.ink; g.fillRect(-200, WF, W + 400, H - WF + 200);
      g.save(); g.beginPath(); g.rect(-200, WF, W + 400, H + 200); g.clip();
      O.lightPool(g, LAMP.x - 60, WF + 40, [{ r: 1120, color: '#14100A' }, { r: 880, color: '#221C0D' }, { r: 700, color: C.hoodLow }, { r: 400, color: C.hoodMid }, { r: 150, color: C.hood }], { sy: 0.1, rough: 2, seed: 12 });
      checker(g, P, 0.32, ZW, 1.9, -8.32, 8.32, 0.46, 1);
      g.restore();
      g.fillStyle = '#070505'; g.fillRect(-200, WF - 4, W + 400, 7);
      // the back door's frame and the night beyond (the slab is drawn per frame)
      g.fillStyle = '#070505'; g.fillRect(dL - 14, dT - 14, dR - dL + 28, WF - dT + 14);
      nightScene(g, dL, dT, dR, WF, P(0, 1.96, ZW)[1], P(0, 0.98, ZW)[1]);
      // counter run, upper cabinets, the cupboard door left standing open
      const cL = P(-1.62, 0, ZW)[0], cR = P(2.3, 0, ZW)[0], ucB = P(0, 1.45, ZW)[1], uL = cL, uR = 1168;
      g.fillStyle = '#0B0908'; g.fill(S().rect(cL, cTop, cR - cL, WF - cTop).path(0.8, 3));
      g.fillStyle = '#17120F'; g.fill(S().rect(cL - 6, cTop - 10, cR - cL + 12, 11).path(0.8, 4));
      for (let i = 1; i < 4; i++) { const sx = cL + (cR - cL) * i / 4; g.fillStyle = '#050404'; g.fillRect(sx - 1.5, cTop + 4, 3, WF - cTop - 8); }
      g.fillStyle = '#050404'; g.fillRect(cL, cTop + 54, cR - cL, 3);
      g.fillStyle = '#0B0908'; g.fill(S().rect(uL, -60, uR - uL, ucB + 60).path(0.8, 6));
      for (let i = 1; i < 3; i++) { const sx = uL + (uR - uL) * i / 3; g.fillStyle = '#050404'; g.fillRect(sx - 1.5, 0, 3, ucB); }
      const cdoor = S().poly([[uR, 120], [uR + 64, 134], [uR + 64, ucB + 26], [uR, ucB]]).path(0.8, 8);
      g.fillStyle = VOID; g.fill(cdoor);
      g.fillStyle = '#030202'; g.fill(S().poly([[uR, -60], [uR + 64, -60], [uR + 64, 134], [uR, 120]]).path(0.8, 9));
      rim(g, S().rect(cL - 6, cTop - 10, cR - cL + 12, 11).path(0.8, 4), [0, -1], 2, C.hoodMid, { fade: { x: LAMP.x, y: LAMP.y, r0: 60, r1: 520 } });
      rim(g, cdoor, [1, 0.1], 2, C.hoodLow, { fade: { x: LAMP.x, y: LAMP.y, r0: 200, r1: 700 } });
      // the light cone, posterised in two hard trapezoids
      O.cone(g, [[LAMP.x - 70, hB + 2], [LAMP.x + 110, hB + 2], [LAMP.x + 330, 900], [LAMP.x - 300, 900]], C.hood, 0.085);
      O.cone(g, [[LAMP.x - 40, hB + 2], [LAMP.x + 70, hB + 2], [LAMP.x + 200, 900], [LAMP.x - 180, 900]], C.hood, 0.07);
      // hood canopy + duct, the lamp panel
      const mid = (hL + hR) / 2;
      g.fillStyle = C.ink; g.fill(S().poly([[hL, hB], [hR, hB], [hR - 46, hB - 44], [mid + 64, hB - 118], [mid + 64, -60], [mid - 64, -60], [mid - 64, hB - 118], [hL + 46, hB - 44]]).path(0.8, 17));
      g.fillStyle = '#050404'; g.fillRect(hL, hB - 9, hR - hL, 9);
      g.fillStyle = C.hood; g.fill(S().rect(LAMP.x - 52, hB - 6, 104, 6).path(0.4, 18));
      // the stove: an ink block, hob lit, a pan and a pot; knobs per frame
      g.fillStyle = C.ink; g.fill(S().rect(sL, cTop, sR - sL, WF - cTop).path(0.8, 9));
      g.fillStyle = C.hood; g.fill(S().rect(sL - 4, cTop - 6, sR - sL + 8, 6).path(0.6, 10));
      g.fillStyle = C.ink;
      g.fill(S().M(sL + 46, cTop - 4).L(sL + 50, cTop - 46).L(sL + 132, cTop - 46).L(sL + 136, cTop - 4).Z().rect(sL + 132, cTop - 42, 72, 7).path(0.8, 13));
      g.fill(S().ellipse(sR - 86, cTop - 24, 44, 22).rect(sR - 118, cTop - 24, 64, 22).capsule(sR - 86, cTop - 50, 4, sR - 86, cTop - 57, 6).path(0.8, 14));
      const knobY = cTop + 30;
      g.fillStyle = '#050404'; g.fill(S().rect(sL + 22, knobY + 32, sR - sL - 44, WF - knobY - 52).path(0.8, 15));
      g.strokeStyle = rgba(C.hoodMid, 0.85); g.lineWidth = 2; g.beginPath(); g.moveTo(sL + 30, knobY + 46); g.lineTo(sR - 30, knobY + 46); g.stroke();
    }
    const PRINT = [1032, floorD + 8], CIG = [952, floorD + 3];   // the handprint in the pool's tail, in front of her thighs (clear of the jacket); his cigarette
    const POOL = { src: [1340, floorD - 2], x: 1262, y: floorD + 1, rx: 245, ry: 18, seed: 21, light: LAMP, fade: 700, lip: 2, dark: true };
    const litP = (() => { const p = new Path2D(); p.ellipse(LAMP.x, LAMP.y + 160, 760, 560, 0, 0, 7); return p; })();
    return {
      h: H, light, persp: pp,
      back(c, t, st) {
        const g = c.g, E = c.em, lvl = hoodLevel(t, st);
        putC(c, crop(c, 'standoff.back', drawBack, FULL(H, 48)), jit(t, st, 0.35, 81));
        dimPath(g, litP, lvl, 0.7);
        E.save(); E.globalAlpha = lvl; E.fillStyle = C.hood; E.fillRect(LAMP.x - 70, hB - 12, 140, 18); E.restore();
        haze(g, t, { seed: 'soHob', x0: sL - 30, x1: sR + 40, y0: cTop - 150, y1: cTop - 50, rows: 9, taper: 5, wmin: 14, wvar: 70, gap: 8, gapv: 26 }, st.gas);
        haze(g, t, { seed: 'soRoom', x0: 0, x1: W, y0: 300, y1: 700, rows: 6, wmin: 40, wvar: 240, gap: 60, gapv: 220, a0: 0.025, a1: 0.04 }, st.gas * 0.7);
        motes(g, t, [[LAMP.x - 60, hB + 8], [LAMP.x + 100, hB + 8], [LAMP.x + 320, 880], [LAMP.x - 290, 880]], 70, C.hood, 'soMotes', 1);
        const knobY = cTop + 30;
        for (let i = 0; i < 4; i++) {
          const kx = sL + 46 + i * ((sR - sL - 92) / 3);
          if (st.knobs === 2 && (i === 1 || i === 2)) { g.fillStyle = C.hoodMid; g.fillRect(kx - 2, knobY - 7, 4, 11); continue; }
          g.fillStyle = '#050404'; g.beginPath(); g.arc(kx, knobY, 12, 0, 7); g.fill(); g.strokeStyle = C.hoodMid; g.lineWidth = 2; g.beginPath(); g.arc(kx, knobY, 12, -2.7, -0.6); g.stroke();
        }
        doorSlab(g, P, ZW, -2.78, -1.86, st.backDoor, LAMP);
        drawPerf(c, 'standoff', st.perforations);
        drawPool(g, POOL, st.blood);
        if (st.cig > 0.5) { g.save(); g.translate(CIG[0], CIG[1]); g.rotate(-0.06); g.fillStyle = C.cardPaper; g.fillRect(-10, -1.5, 20, 3); g.restore(); }
        handprint(c, PRINT, 96, 0.3, 0, st.handprint * 0.34);
      },
      mid(c, t, st) { const jp = drawJacket(c.g, { x: DX, y: DY, u: DU, rimW: 2.5 }, st.jacket, LAMP); if (jp) occlude(c, jp); },
      front() { }, clip: () => litP,
      anchors: { lamp: [LAMP.x, LAMP.y], backDoor: [dL, dT, dR, WF], backDoorCentre: [(dL + dR) / 2, (dT + WF) / 2], backDoorHandle: P(-1.86 - 0.11, 0.98, ZW), stove: [(sL + sR) / 2, cTop + 60], hob: [(sL + sR) / 2, cTop - 6],
        wallFloorY: WF, counterTop: cTop, cone: [[LAMP.x - 70, hB], [LAMP.x + 110, hB], [LAMP.x + 330, 900], [LAMP.x - 300, 900]],
        scott: { x: 560, y: 1170, scale: 132, headTop: 204, facing: 1, note: 'F11: foreground, feet below the frame (K.persp.standoff.scaleAt(1170) = 137); the way out at his back' },
        angelo: { x: 1472, y: floorA, scale: 76, facing: -1, note: 'at the cone’s edge' },
        deena: { x: DX, y: DY, scale: DU, rot: Math.PI / 2 }, deenaFall: [1250, floorD], head: [DX + 2.89 * DU, DY + 0.18 * DU], throat: [DX + JK.throat[0] * DU, DY + JK.throat[1] * DU], jacketEnd: [DX + JK.end * DU, DY - 0.24 * DU], pool: [POOL.x, POOL.y], handprint: PRINT, cig: CIG },
      // the 50 s take: push(u), u = 0..1 over the take, alongside the letterbox squeeze 2.39 -> 2.76. It starts a touch wide (0.97) and
      // ends at F11's own scale (1.0), drifting right and down. At 2.76 the slit holds world x 15..1935, y 200..896: Angelo's crown
      // (206 head level, ~216 bowed), 'Angelo.' (x 62..300), 'Scott.', the whole pool (to y ~887), the handprint and the jacket's
      // cuff all stay inside with room for the 3 px shake. Do not zoom past 1.0 at 2.76: Angelo is 8.6 heads tall and the slit is
      // only 696 px.
      cams: { start: { x: 960, y: 540, zoom: 0.97 }, end: { x: 975, y: 548, zoom: 1 }, push: u => ({ x: lerp(960, 975, u), y: lerp(540, 548, u), zoom: lerp(0.97, 1, u) }) },
    };
  })();

  // ================================================================ registry and API
  const VIEWS = { entry: EN, stove: V_STOVE, oven: V_OVEN, knobs: KN, deena: DE, counter: CT, floor: FLR, doorway: DW, standoff: SO };
  function V(view) { const v = VIEWS[view]; if (!v) { (window.FILM && FILM.warn ? FILM.warn('kitchen: unknown view ' + view) : console.warn('kitchen: unknown view ' + view)); return VIEWS.stove; } return v; }
  // erase holes where state.occluders say figures stand
  function drawPerfOcc(c, st) { if (st.occluders) st.occluders.forEach(p => p && (p instanceof Path2D ? occlude(c, p) : occlude(c, p.path, p.keep))); }
  function back(c, t, st, view) { st = normState(st); V(view).back(c, t, st); }
  function mid(c, t, st, view) { st = normState(st); V(view).mid(c, t, st); }
  function front(c, t, st, view) { st = normState(st); const v = V(view); v.front(c, t, st); if (v !== V_STOVE && v !== V_OVEN) drawPerfOcc(c, st); }
  function draw(c, t, st, view, chars) { back(c, t, st, view); if (chars) chars(c); mid(c, t, st, view); front(c, t, st, view); }
  const anchors = {}, cams = {}, lights = {};
  Object.keys(VIEWS).forEach(k => { anchors[k] = VIEWS[k].anchors; cams[k] = VIEWS[k].cams; lights[k] = VIEWS[k].light; });

  // ================================================================ demos (node tools/set.js kitchen 1): placeholders only
  function ph(c, id, pose, o) {
    o = o || {}; const f = O.fig.profile(id, pose); const p = f.shape.path(0.8, o.seed || 11); c.g.fillStyle = o.fill || C.ink; c.g.fill(p);
    if (o.light) { const bb = f.shape.bbox(); rim(c.g, p, o.dir || norm2(o.light.x - (bb.x + bb.w / 2), o.light.y - (bb.y + bb.h / 2)), o.w || 3, o.color || C.hood, { clip: o.clip, fade: o.fade }); }
    if (o.details) O.fig.drawDetails(c.g, f, { rimColor: o.color || C.hood }); return { f, p };
  }
  const K = () => SETS.kitchen;
  const demos = [
    { name: 'entry: four come in (2.00)', letterbox: 2.0, draw(c, t) {
      const st = { knobs: 2, gas: 0.35 }; const A = anchors.entry, L = lights.entry;
      c.camera(FILM.key(t, [[0, cams.entry.wide], [4, cams.entry.push]]));
      K().back(c, t, st, 'entry');
      const M = A.marks, wk = (id, m, ph0) => { const sw = Math.sin(FILM.twos(t) * 3.2 + ph0) * 0.35; return ph(c, id, { x: m.x, y: m.y, scale: m.scale, facing: m.facing, lean: 0.06, legN: { a: sw, b: 0.2 }, legF: { a: -sw, b: 0.2 }, armN: { a: -sw * 0.6, b: 0.2 }, armF: { a: sw * 0.6, b: 0.2 } }, { light: L, w: 2.5, color: C.hoodMid }); };
      wk('angelo', M.angelo, 0.4); wk('marina', M.marina, 1.4); wk('deena', M.deena, 2.2); wk('scott', M.scott, 3.0);
      K().front(c, t, st, 'entry');
    } },
    { name: 'stove: F09, oven opening, gas', letterbox: 2.0, draw(c, t) {
      const st = { knobs: 2, gas: 0.7, ovenOpen: FILM.key(t, [[0, 0.1], [1.4, 1, 'outCubic']]), hoodFlicker: 0.4 }; const A = anchors.stove;
      c.camera(cams.stove.wide); K().back(c, t, st, 'stove');
      const h = K().at('stove', 'ovenHandle', st);
      ph(c, 'scott', { x: 1720, y: 1068, scale: 112, facing: -1, lean: 0.14, neck: -0.18, head: -0.32, armN: { to: h, hand: 'hold' }, armF: { a: 1.05, b: 2.15, hand: 'open', w: -0.4 }, legN: { a: 0.38, b: 0.62 }, legF: { a: -0.12, b: 0.55 } }, { light: { x: 1100, y: 600 }, w: 4, clip: P2([[1440, 0], [1940, 0], [1940, 700], [1440, 700]]) });
      K().front(c, t, st, 'stove');
      ph(c, 'deena', { x: 360, y: 1000, scale: 76, facing: 1, lean: 0.2, neck: 0.1, head: 0.04, swing: -0.55, armN: { a: 1.3, b: 0.08, hand: 'open', w: -0.12 }, armF: { a: -0.6, b: 0.35 }, legN: { a: 0.5, b: 0.15 }, legF: { a: -0.38, b: 0.25 } }, { dir: [0.9, 0.1], color: C.hoodMid, w: 3, light: {} , details: true });
    } },
    { name: 'stove: knobs 4, Scott pulls, the thud', letterbox: 2.0, draw(c, t) {
      // pull in jerks; at 0.95 s something heavy shifts inside: the thud impulse (decays over 0.3 s) jolts the door, flashes its seam
      const jerk = FILM.twos(t), pull = jerk < 0.4 ? 0 : 0.35 + 0.25 * Math.max(0, Math.sin(jerk * 9)), thud = t >= 0.95 ? Math.max(0, 1 - (t - 0.95) / 0.3) : 0;
      const st = { knobs: 4, gas: 0.3, ovenOpen: 0, pull, thud }; c.camera(Object.assign({}, cams.stove.hob, FILM.shake ? FILM.shake(t, 2.5 * thud, 9, 3) : {})); K().back(c, t, st, 'stove');
      const h = K().at('stove', 'ovenHandle', st);
      ph(c, 'scott', { x: 1720, y: 1068, scale: 112, facing: -1, lean: -0.1, neck: -0.1, head: -0.2, armN: { to: [h[0] + 120, h[1] - 205], hand: 'hold' }, armF: { to: [h[0] + 160, h[1] - 190], hand: 'hold' }, legN: { a: 0.3, b: 0.4 }, legF: { a: -0.35, b: 0.3 } }, { light: lights.stove, w: 3, color: C.hoodMid });
      K().front(c, t, st, 'stove');
    } },
    { name: 'knobs: panel, two gone, gas', letterbox: 2.0, draw(c, t) { const st = { knobs: 2, gas: 0.8 }; c.camera(cams.knobs.panel); K().back(c, t, st, 'knobs'); } },
    { name: 'knobs: the handle, door ajar', letterbox: 2.0, draw(c, t) {
      const st = { knobs: 2, gas: 0.6, ovenOpen: FILM.key(t, [[0, 0], [2, 0.5]]) }; c.camera(cams.knobs.handle); K().back(c, t, st, 'knobs');
      // Scott's hand on the bar, rimmed from the hood above (K.light.knobs) so it separates from the ink door
      const h = K().at('knobs', 'ovenHandle', st); const hand = O.fig.hand('hold', { curl: 0.7 }).transform([150, 0, 0, 150, h[0] + 30, h[1] - 60]).rotate(0.9, h[0], h[1]);
      const hp = S().capsule(h[0] + 520, h[1] + 460, 70, h[0] + 60, h[1] + 10, 46).add(hand).path(0.8, 3), Lk = lights.knobs;
      c.g.fillStyle = C.ink; c.g.fill(hp); rim(c.g, hp, norm2(Lk.x - h[0], Lk.y - h[1]), 4, C.hoodMid);
    } },
    { name: 'knobs: the plastic under the cabinet', letterbox: 2.0, draw(c, t) { const st = { knobs: 2, gas: 0.6 }; c.camera(FILM.key(t, [[0, cams.knobs.tilt(0.7)], [1.2, cams.knobs.plastic]])); K().back(c, t, st, 'knobs'); } },
    { name: 'oven: the reveal (door 0.45)', letterbox: 2.0, draw(c, t) { const st = { knobs: 2, gas: 0.6, ovenOpen: 0.45 }; c.camera(cams.oven.reveal); K().back(c, t, st, 'oven'); } },
    { name: 'oven: open, push on the curls', letterbox: 2.0, draw(c, t) { const st = { knobs: 2, gas: 0.7, ovenOpen: 1, hoodFlicker: 0.3 }; c.camera(FILM.key(t, [[0, cams.oven.reveal], [4, cams.oven.head]])); K().back(c, t, st, 'oven'); } },
    { name: 'deena: F10 cone (2.00)', letterbox: 2.0, draw(c, t) {
      const st = { gas: 0.5, hoodFlicker: 0.25 }; c.camera(cams.deena.tight); K().back(c, t, st, 'deena'); const A = anchors.deena;
      ph(c, 'deena', { x: 1270, y: 1150, anchor: 'hip', scale: 222, facing: -1, lean: 0.1, neck: -0.4, head: -0.3, pony: { grip: [1420, 220] }, armN: { a: 0.6, b: 2.38, hand: 'open', w: -0.62 }, armF: { a: 0.78, b: 2.1, hand: 'open', w: -0.78 }, legN: { a: 0.75, b: 1.05 }, legF: { a: 0.45, b: 0.95 } }, { dir: [0.15, -1], w: 4, clip: K().clip('deena') });
      ph(c, 'angelo', { x: 120, y: 1520, scale: 290, anchor: 'hip', facing: 1, lean: 0.2, neck: 0.16, head: 0.06, armN: { to: A.angeloReach, hand: 'open' }, armF: { a: 0.8, b: 0.6 }, legN: { a: 0.3, b: 0.2 }, legF: { a: -0.2, b: 0.1 } }, { fill: '#070504', dir: [0.5, -0.86], w: 3, color: C.hoodLow, clip: K().clip('deena') });
    } },
    { name: 'counter: backing into the block (2.20)', letterbox: 2.2, draw(c, t) {
      // Scott backs in from scottStart to the mark (his hip meets the counter at anchors.hip), reaches behind for the grip, draws a knife
      const A = anchors.counter, tw = FILM.twos(t), u = FILM.seg(tw, 0, 1.0, FILM.ease.outCubic), grab = tw >= 1.25, x = lerp(A.scottStart.x, A.scott.x, u);
      const st = { gas: 0.6, knives: grab ? 4 : 5, perforations: 0.35 }; c.camera(FILM.key(t, [[0, cams.counter.wide], [4, cams.counter.backIn]])); K().back(c, t, st, 'counter');
      const hand = grab ? [x - 150, 700] : tw > 0.7 ? A.knife : [x + 120, 760];
      const s = ph(c, 'scott', { x, y: A.scott.y, scale: 150, facing: -1, lean: -0.1 * u, neck: 0.1, head: 0.1, armF: { to: hand, hand: 'grip' }, armN: { a: 0.5, b: 0.6, hand: 'open' }, legN: { a: 0.1, b: 0.1 }, legF: { a: -0.1, b: 0.1 } }, { light: lights.counter, w: 3, color: C.hoodMid });
      if (grab) { c.g.save(); c.g.strokeStyle = C.hoodMid; c.g.lineWidth = 5; c.g.lineCap = 'round'; c.g.beginPath(); c.g.moveTo(hand[0] - 10, hand[1] - 6); c.g.lineTo(hand[0] - 150, hand[1] - 40); c.g.stroke(); c.g.restore(); }
      K().occlude(c, s.p);
    } },
    { name: 'floor: blood, the handprint (2.39)', letterbox: 2.39, draw(c, t) {
      const st = { blood: FILM.key(t, [[0, 0.4], [3, 1]]), handprint: 1, ovenOpen: 1, gas: 0.5 }; c.camera(cams.floor.wide); K().back(c, t, st, 'floor'); const A = anchors.floor;
      c.g.fillStyle = C.ink; const dp = deenaLying(A.deena.x, A.deena.y, A.deena.scale).path(0.8, 23); c.g.fill(dp); rim(c.g, dp, [0.5, -0.86], 2.5, C.hoodMid, { fade: { x: 1700, y: 250, r0: 300, r1: 1500 } });
      K().mid(c, t, st, 'floor');
    } },
    { name: 'floor: the jacket laid, cigarette', letterbox: 2.39, draw(c, t) {
      const st = { blood: 1, handprint: 1, ovenOpen: 1, jacket: FILM.key(t, [[0, 0.2], [0.9, 1]]), cig: 1, gas: 0.6 }; c.camera(cams.floor.jacket); K().back(c, t, st, 'floor'); const A = anchors.floor;
      c.g.fillStyle = C.ink; const dp = deenaLying(A.deena.x, A.deena.y, A.deena.scale).path(0.8, 23); c.g.fill(dp);
      K().mid(c, t, st, 'floor');
    } },
    { name: 'doorway: Marina by the door (2.20)', letterbox: 2.2, draw(c, t) {
      const st = { gas: 0.5, perforations: 0.4 }; c.camera(cams.doorway.wide); K().back(c, t, st, 'doorway'); const m = anchors.doorway.marina;
      const s = ph(c, 'marina', { x: m.x, y: m.y, scale: m.scale, facing: -1, lean: 0.02, neck: 0.05, head: 0.06, armN: { a: 2.3, b: 1.9, hand: 'flat' }, armF: { a: 0.1, b: 0.3 }, legN: { a: 0.06, b: 0.02 }, legF: { a: -0.06, b: 0.02 } }, { light: lights.doorway, w: 3, color: C.hoodMid, details: true });
      K().occlude(c, s.p); K().front(c, t, st, 'doorway');
    } },
    { name: 'doorway: gone. the ring (2.39)', letterbox: 2.39, draw(c, t) { const st = { gas: 0.55, perforations: 0.5, ring: 1 }; c.camera(cams.doorway.door); K().back(c, t, st, 'doorway'); K().front(c, t, st, 'doorway'); } },
    { name: 'standoff: start of the take (2.39)', letterbox: 2.39, draw(c, t) {
      const st = { gas: 0.75, blood: 1, handprint: 1, jacket: 1, cig: 1, perforations: 0.45, sway: 0.3 }; c.camera(cams.standoff.start); K().back(c, t, st, 'standoff'); soFigs(c, t, st);
    } },
    { name: 'standoff: end of the push, door open (2.76)', letterbox: 2.76, draw(c, t) {
      const st = { gas: 1, blood: 1, handprint: 1, jacket: 1, cig: 1, perforations: 1, sway: 0.8, hoodFlicker: 0.5, backDoor: FILM.key(t, [[0, 0.2], [2, 1]]) }; c.camera(cams.standoff.end); K().back(c, t, st, 'standoff'); soFigs(c, t, st, true);
    } },
  ];
  function soFigs(c, t, st, noScott) {
    const A = anchors.standoff, L = lights.standoff, g = c.g;
    const a = ph(c, 'angelo', { x: A.angelo.x, y: A.angelo.y, scale: 76, facing: -1, clothes: 'none', cig: false, neck: 0.24, head: 0.42, armN: { to: [1330, 400], hand: 'fist' }, armF: { a: -0.06, b: 0.12, hand: 'relaxed' }, legN: { a: 0.04, b: 0.03 }, legF: { a: -0.14, b: 0.05 } }, { light: { x: L.x, y: L.y }, w: 3, fade: { x: L.x, y: L.y, r0: 120, r1: 640 } });
    const dp = deenaLying(A.deena.x, A.deena.y, A.deena.scale).path(0.8, 23); g.fillStyle = C.ink; g.fill(dp);
    K().mid(c, t, st, 'standoff');
    const occ = [a.p, dp];
    if (!noScott) { const s = ph(c, 'scott', { x: 560, y: 1170, scale: 132, facing: 1, lean: 0.13, neck: 0.12, head: 0.16, armN: { a: 0.9, b: 0.55, hand: 'open', w: -1.15 }, armF: { a: -0.04, b: 0.22, hand: 'relaxed' }, legN: { a: 0.16, b: 0.06 }, legF: { a: -0.14, b: 0.04 } }, { fill: '#070505', light: { x: 700, y: 380 }, w: 2.2, color: C.hoodMid }); occ.push(s.p); }
    occ.forEach(p => K().occlude(c, p));
  }

  SETS.kitchen = {
    views: Object.keys(VIEWS), defaults: Object.assign({}, DEFAULTS), normState,
    back, mid, front, draw, occlude, knock, hoodLevel,
    at(view, name, st) { const v = V(view); return v.at ? v.at(name, st) : null; },
    clip(view) { return V(view).clip(); },
    anchors, cams, light: Object.assign({ x: SO.light.x, y: SO.light.y, color: C.hood }, lights),
    persp: { entry: EN.persp, standoff: SO.persp, floor: FLR.persp },
    ovenShadow, foldedShape: folded,
    deenaLying(view, o) { const A = anchors[view] && anchors[view].deena; o = o || {}; return deenaLying(o.x != null ? o.x : A.x, o.y != null ? o.y : A.y, o.scale || A.scale); },
    jacketShape, demos,
  };
})();
