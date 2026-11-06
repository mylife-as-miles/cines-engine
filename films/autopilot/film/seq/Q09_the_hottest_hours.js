/* AUTOPILOT · Q09 · THE HOTTEST HOURS (58 s) · S13–S15, A053–A061, L035
   The empty house in the afternoon: the phone on its charger by the kettle, screen black, the sun come round, dust turning
   in it; nobody there. The city at the hottest part of the day, bleached cream-white, seen through shop glass, a sash
   window, a bus shelter's panel, a café window and a stopped car's windscreen. The office afternoon: a small montage
   (2 s each) of a form signed, an email filed, a box ticked, another meeting, another cup of coffee; then the photograph on
   his desk, Sarah and Emily laughing, which he straightens to face him (the one place Emily's yellow appears after the
   morning), and the wide as he returns to his work, under his V.O.
   Built here: the desk-surface insert (the form, the pen, his hand) and the photograph's frame and print (the office
   set's own print crops Emily at the chin, so her cardigan's yellow never shows; this one keeps the set's desk behind and
   its geometry, light and glass). Characters animate on twos; the camera on ones. Deterministic. Caches keyed 'Q09|'. */
(function () {
  'use strict';
  const W = 1920, H = 1080, TAU = Math.PI * 2;
  const { clamp, lerp, seg, key, twos } = FILM, E = FILM.ease, rgba = OTM.rgba;
  const deg = d => d * Math.PI / 180;
  const breath = t => (twos(t) * 0.25) % 1;
  const pose = (t, ks) => RIG.key(twos(t), ks);
  const DAN = { outfit: 'office', collar: 'straight' };
  const cam = o => { const z = Math.max(1, o.zoom || 1), x = o.x == null ? W / 2 : o.x, y = o.y == null ? H / 2 : o.y;
    return Object.assign({}, o, { zoom: z, x: clamp(x, W / 2 / z, W - W / 2 / z), y: clamp(y, H / 2 / z, H - H / 2 / z) }); };
  function stillFig(c, name, who, p, opts, box) {
    const [x0, y0, w, h] = box, k = 1.5;
    const cv = c.cache('Q09|fig|' + name, g => { g.scale(k, k); g.translate(-x0, -y0); RIG.draw(g, who, p, opts); }, Math.ceil(w * k), Math.ceil(h * k));
    c.g.drawImage(cv, x0, y0, w, h);
  }
  const office = () => SETS.office.views, city = () => SETS.city.views;
  // RIG.hand places a hand by its wrist; to put a fingertip (or the pinch between index and thumb) on a point, the
  // fingertip offsets are measured once per pose with a dry run on a tiny canvas, then the wrist is solved for
  const HG = {}, scratchG = () => FILM.cache('Q09|scratch-hand', () => {}, 8, 8).getContext('2d');
  function handGeom(p) { const k = JSON.stringify(p); if (!HG[k]) { const r = RIG.hand(scratchG(), 'daniel', Object.assign({}, p, { at: [0, 0] }), {}); HG[k] = { tips: r.tips, thumb: r.thumb }; } return HG[k]; }
  const pinchOf = gm => [(gm.tips[0][0] + gm.thumb[0]) / 2, (gm.tips[0][1] + gm.thumb[1]) / 2];

  // ---------- the empty house: the counter in the afternoon ----------
  function counterShot(c, lt, frame, view) {
    const v = SETS.kitchen.views.counter, s = { tod: 'afternoon', screen: 'off', frame, bag: false, dust: 1 };
    c.camera(cam(view));
    v.back(c, lt, s); v.front(c, lt, s);
  }

  // ---------- the desk-surface insert: the form, the pen, his hand (through the partition's glass, a long lens) ----------
  const DC = LC.camera({ x: 0.06, y: 1.2, z: -0.5, yaw: deg(-9), pitch: deg(-35), f: 2350, cx: 960, cy: 560 });
  const dp = (x, z, y) => { const p = DC.p(x, y == null ? 0.73 : y, z); return [p[0], p[1]]; };
  const FORM = { x: -0.06, z: 0.2, w: 0.21, h: 0.297, rot: deg(-7) };
  // a point on the form in its own units (u across 0..1, v down 0..1) -> screen
  function formPt(u, v) {
    const cr = Math.cos(FORM.rot), sr = Math.sin(FORM.rot), lx = (u - 0.5) * FORM.w, lz = (0.5 - v) * FORM.h;
    return dp(FORM.x + lx * cr - lz * sr, FORM.z + lx * sr + lz * cr, 0.7315);
  }
  // the signature, as a path in form units, and the tick in the second box
  const SIG = (() => { const pts = []; for (let i = 0; i <= 120; i++) { const u = i / 120, x = 0.52 + 0.36 * u + 0.025 * Math.sin(u * 23), y = 0.865 - 0.03 * Math.sin(u * 17) * (1 - u * 0.4) - 0.012 * Math.cos(u * 41); pts.push([x, y]); } return pts; })();
  const TICK = [[0.135, 0.405], [0.155, 0.43], [0.2, 0.37]];
  function deskBack(c) {
    return c.cache('Q09|desk|back', g => {
      g.fillStyle = '#9DAAA5'; g.fillRect(0, 0, W, H);
      // the desk top receding, the lamps' light pooled on it; the laptop at the top, its screen lit; the mug; papers
      g.fillStyle = '#D3DCD7'; g.fill(LC.pathPts([dp(-1.2, -0.3), dp(1.2, -0.3), dp(1.2, 1.4), dp(-1.2, 1.4)]));
      g.fillStyle = LC.rad(g, 860, 380, 60, 1200, [[0, '#EEF3F0', 0.55], [1, '#EEF3F0', 0]]); g.fillRect(0, 0, W, H);
      g.fillStyle = LC.lin(g, 0, 700, 0, H, [[0, '#1E2A2A', 0], [1, '#1E2A2A', 0.3]]); g.fillRect(0, 700, W, H - 700);
      // the laptop: its aluminium base and keys, the lit screen rising out of frame
      g.fillStyle = '#AEB8B4'; g.fill(LC.pathPts([dp(0.22, 0.42), dp(0.62, 0.42), dp(0.62, 0.7), dp(0.22, 0.7)]));
      g.fillStyle = '#7E8985'; g.fill(LC.pathPts([dp(0.25, 0.47), dp(0.59, 0.47), dp(0.59, 0.64), dp(0.25, 0.64)]));
      for (let r = 0; r < 5; r++) for (let k = 0; k < 12; k++) { const x0 = 0.26 + k * 0.0275, z0 = 0.475 + r * 0.032; g.fillStyle = '#5E6966'; g.fill(LC.pathPts([dp(x0, z0), dp(x0 + 0.023, z0), dp(x0 + 0.023, z0 + 0.027), dp(x0, z0 + 0.027)])); }
      g.fillStyle = '#C8D2CE'; g.fill(LC.pathPts([dp(0.22, 0.7), dp(0.62, 0.7), dp(0.62, 0.705, 0.76), dp(0.22, 0.705, 0.76)]));
      const sc = [dp(0.23, 0.71, 0.76), dp(0.61, 0.71, 0.76), dp(0.61, 0.79, 1.02), dp(0.23, 0.79, 1.02)];
      g.fillStyle = '#E9F0EE'; g.fill(LC.pathPts(sc)); g.fillStyle = 'rgba(120,140,140,0.35)'; for (let i = 0; i < 6; i++) { const a = dp(0.27, 0.72 + i * 0.012, 0.79 + i * 0.04), b = dp(0.5 - (i % 3) * 0.05, 0.72 + i * 0.012, 0.79 + i * 0.04); g.fillRect(a[0], a[1], b[0] - a[0], 3); }
      // a stack of papers at the left, the mug of coffee
      g.fillStyle = '#C3CCC8'; g.fill(LC.pathPts([dp(-0.62, 0.3, 0.745), dp(-0.36, 0.33, 0.745), dp(-0.39, 0.62, 0.745), dp(-0.65, 0.59, 0.745)]));
      g.fillStyle = '#EEF2EF'; g.fill(LC.pathPts([dp(-0.6, 0.31, 0.75), dp(-0.34, 0.34, 0.75), dp(-0.37, 0.63, 0.75), dp(-0.63, 0.6, 0.75)]));
      const mc = dp(-0.36, 0.78, 0.83), mr = DC.f / DC.p(-0.36, 0.83, 0.78)[2] * 0.042;
      g.fillStyle = 'rgba(20,30,30,0.25)'; g.beginPath(); g.ellipse(mc[0] + mr * 0.5, mc[1] + mr * 2.3, mr * 1.3, mr * 0.55, 0, 0, TAU); g.fill();
      g.fillStyle = '#C9D2CE'; g.fillRect(mc[0] - mr, mc[1], mr * 2, mr * 1.9); g.fillStyle = '#E6ECE9'; g.beginPath(); g.ellipse(mc[0], mc[1], mr, mr * 0.55, 0, 0, TAU); g.fill();
      g.fillStyle = '#4A3A30'; g.beginPath(); g.ellipse(mc[0], mc[1] + 2, mr * 0.82, mr * 0.42, 0, 0, TAU); g.fill();
      // the form: white, ruled, its boxes, the signature line
      const q = [formPt(0, 0), formPt(1, 0), formPt(1, 1), formPt(0, 1)];
      g.fillStyle = 'rgba(20,30,30,0.22)'; g.fill(LC.pathPts(q.map(p => [p[0] + 6, p[1] + 8])));
      g.fillStyle = '#F4F6F3'; g.fill(LC.pathPts(q));
      const line = (u0, u1, v, w, col) => { const a = formPt(u0, v), b = formPt(u1, v); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
      line(0.1, 0.62, 0.08, 9, 'rgba(60,78,80,0.55)'); line(0.1, 0.42, 0.13, 4, 'rgba(60,78,80,0.35)');
      for (let i = 0; i < 6; i++) line(0.1, 0.9 - (i % 3) * 0.12, 0.2 + i * 0.033, 3, 'rgba(70,90,92,0.3)');
      for (let i = 0; i < 4; i++) { const v = 0.4 + i * 0.075, b = [formPt(0.12, v - 0.025), formPt(0.17, v - 0.025), formPt(0.17, v + 0.01), formPt(0.12, v + 0.01)]; g.strokeStyle = 'rgba(60,78,80,0.6)'; g.lineWidth = 2; g.stroke(LC.pathPts(b)); line(0.22, 0.78 - i * 0.07, v, 3, 'rgba(70,90,92,0.3)'); }
      line(0.5, 0.92, 0.88, 2, 'rgba(60,78,80,0.6)');
    });
  }
  function inkPath(g, pts, n) { if (n < 2) return; g.save(); g.strokeStyle = '#1C2A44'; g.lineWidth = 3.2; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); for (let i = 0; i < n; i++) { const p = formPt(pts[i][0], pts[i][1]); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke(); g.restore(); }
  function deskPane(c) {
    return c.cache('Q09|desk|pane', pg => {
      // the meeting room's lamps faint in the partition glass, a glare streak, dust out of focus; the darker bottom
      const l = LC.layer(); l.fillStyle = '#F2F6F3'; [[260, 90], [820, 60], [1400, 110]].forEach(([x, y]) => { l.beginPath(); l.moveTo(x, y); l.lineTo(x + 300, y - 14); l.lineTo(x + 330, y + 40); l.lineTo(x + 30, y + 56); l.closePath(); l.fill(); });
      pg.globalAlpha = 0.09; pg.drawImage(LC.blurred(l.canvas, 16, false), 0, 0); pg.globalAlpha = 1;
      LC.glare(pg, null, { x: 900, y: 420, angle: -1.08, color: '#FFFFFF', bands: [{ d: -330, w: 200, a: 0.045 }, { d: -230, w: 24, a: 0.06 }, { d: 420, w: 280, a: 0.03 }] });
      LC.specks(pg, null, { x: 0, y: 0, w: W, h: H }, 'q09-desk-dust', { n: 160, color: '#FFFFFF', rMin: 1.2, rMax: 3.2, aMin: 0.03, aMax: 0.1, scratch: 0.05 });
      pg.fillStyle = LC.lin(pg, 0, 840, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.5]]); pg.fillRect(0, 840, W, 240);
    });
  }
  // the pen: a slim dark barrel from its tip on the paper up through the fingers
  function pen(g, tip, dir, len) {
    const ux = Math.cos(dir), uy = Math.sin(dir), e = [tip[0] + ux * len, tip[1] + uy * len], nx = -uy, ny = ux;
    g.save(); g.lineCap = 'round';
    g.strokeStyle = '#1A2230'; g.lineWidth = 15; g.beginPath(); g.moveTo(tip[0] + ux * 14, tip[1] + uy * 14); g.lineTo(e[0], e[1]); g.stroke();
    g.strokeStyle = 'rgba(220,230,232,0.55)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(tip[0] + ux * 30 + nx * 4, tip[1] + uy * 30 + ny * 4); g.lineTo(e[0] + nx * 4, e[1] + ny * 4); g.stroke();
    g.strokeStyle = '#9AA6A8'; g.lineWidth = 8; g.beginPath(); g.moveTo(tip[0] + ux * 2, tip[1] + uy * 2); g.lineTo(tip[0] + ux * 16, tip[1] + uy * 16); g.stroke();
    g.restore();
  }
  function deskInsert(c, st, mode) {
    const g = c.g; c.camera(cam({ x: 960 + st * 3, y: 540, zoom: 1.0 + st * 0.008 }));
    g.drawImage(deskBack(c), 0, 0);
    const t = st;     // the pen and ink run on ones (the hand on twos)
    let tipU, n = 0, path;
    if (mode === 'sign') { const u = seg(t, 0.35, 1.55, E.inOutSine); n = Math.floor(u * (SIG.length - 1)) + 1; const p = SIG[Math.max(0, n - 1)]; tipU = t < 0.35 ? [0.5, 0.82] : p; path = SIG; }
    else { const k = seg(t, 0.5, 0.95); path = []; const a = TICK[0], b = TICK[1], cc = TICK[2];
      for (let i = 0; i <= 20; i++) { const u = i / 20; path.push(u < 0.35 ? [lerp(a[0], b[0], u / 0.35), lerp(a[1], b[1], u / 0.35)] : [lerp(b[0], cc[0], (u - 0.35) / 0.65), lerp(b[1], cc[1], (u - 0.35) / 0.65)]); }
      n = Math.floor(k * 20) + (k > 0 ? 1 : 0); tipU = t < 0.5 ? [lerp(0.3, a[0], seg(t, 0, 0.5, E.outCubic)), lerp(0.5, a[1], seg(t, 0, 0.5, E.outCubic))] : path[Math.min(20, Math.max(0, n - 1))]; if (t > 1.15) tipU = [cc[0] + seg(t, 1.15, 1.8, E.inOutSine) * 0.12, cc[1] + 0.02]; }
    inkPath(g, path, n);
    if (mode === 'tick' && t < 0.5) { /* the boxes above already ticked earlier in the day */ }
    // the pen lifts a little between strokes
    const lift = mode === 'sign' ? 0 : (t > 0.95 ? seg(t, 0.95, 1.2) * 22 : 0);
    const tip = formPt(tipU[0], tipU[1]); tip[1] -= lift;
    // his right hand, from the lower right, the pen held between thumb and index finger: the pen's axis runs from its tip on
    // the paper up through the pinch and out past the knuckles; the hand is laid over it
    const HP = { size: 470, pose: 'grip', grip: 'pinch', view: 'back', roll: 25, rot: -150, sleeve: 'office' }, gm = handGeom(HP), pc = pinchOf(gm);
    const dir = deg(-14), ux = Math.cos(dir), uy = Math.sin(dir), d = 74;     // the pen tip sits 74 px below the pinch along the axis
    const wrist = [tip[0] + ux * d - pc[0], tip[1] + uy * d - pc[1]];
    pen(g, tip, dir, 330);
    RIG.hand(g, 'daniel', Object.assign({ at: wrist }, HP), { light: { x: 760, y: -300, color: '#EEF3EF', back: 0.4 } });
    g.drawImage(deskPane(c), 0, 0);
  }

  // ---------- the photograph on his desk (the set's desk behind; this frame, print and glass) ----------
  const PH = { w: 0.178, h: 0.128, pw: 0.152, ph: 0.102, lean: deg(13) };
  const PC = LC.camera({ x: 0.03, y: 0.33, z: -0.46, yaw: deg(-3), pitch: deg(-29), f: 2650, cx: 960, cy: 440 });   // the set's camera, a little wider and the frame higher
  const TW = 1200, TH = 806;
  function printTex(c) {
    return c.cache('Q09|photo|print', pg => {
      // a summer afternoon in a garden: Sarah and Emily, both laughing at something just outside the frame (to the right)
      pg.fillStyle = LC.lin(pg, 0, 0, 0, TH, [[0, '#E9D8B0'], [0.45, '#C9B98A'], [1, '#8E8A5E']]); pg.fillRect(0, 0, TW, TH);
      const R = OTM.rng('q09-bokeh'); for (let i = 0; i < 46; i++) { pg.fillStyle = rgba(R() < 0.5 ? '#F4E7C4' : '#7E8A5A', 0.22 + R() * 0.25); pg.beginPath(); pg.arc(R() * TW, R() * TH * 0.7, 20 + R() * 70, 0, TAU); pg.fill(); }
      pg.fillStyle = 'rgba(90,96,60,0.5)'; pg.fillRect(0, TH * 0.78, TW, TH * 0.22);
      pg.save(); pg.filter = 'blur(10px)'; pg.drawImage(pg.canvas, 0, 0); pg.restore();
      const L = { light: { x: -300, y: 60, color: '#FFE2B0', back: 0.25 } };
      RIG.face(pg, 'sarah', { at: [470, 300], size: 330, view: 'three', facing: 1, body: 'bust', face: 'laugh', head: { turn: 0.25, tilt: -0.12, nod: -0.15 } }, L);
      RIG.face(pg, 'emily', { at: [790, 470], size: 290, view: 'three', facing: 1, body: 'bust', face: 'laugh', head: { turn: 0.3, tilt: 0.14, nod: -0.1 } }, L);
      pg.save(); pg.globalCompositeOperation = 'soft-light'; pg.fillStyle = 'rgba(255,214,150,0.35)'; pg.fillRect(0, 0, TW, TH); pg.restore();
      pg.fillStyle = LC.rad(pg, TW / 2, TH / 2, TH * 0.3, TW * 0.7, [[0, '#2A2018', 0], [1, '#2A2018', 0.4]]); pg.fillRect(0, 0, TW, TH);
      pg.fillStyle = 'rgba(244,236,220,0.08)'; pg.fillRect(0, 0, TW, TH);
    }, TW, TH);
  }
  function photoFrame(c, t, ang) {
    const g = c.g, ca = Math.cos(ang), sa = Math.sin(ang), cl = Math.cos(PH.lean), sl = Math.sin(PH.lean);
    const T = (u, v, d) => { const y = v * cl, z = v * sl + (d || 0); return [u * ca + z * sa, y, -u * sa + z * ca]; };
    const P = q => { const p = PC.p(q); return [p[0], p[1]]; };
    const outer = [[-PH.w / 2, 0], [PH.w / 2, 0], [PH.w / 2, PH.h], [-PH.w / 2, PH.h]].map(([u, v]) => P(T(u, v, -0.004)));
    const bo = (PH.w - PH.pw) / 2, inner = [[-PH.pw / 2, bo], [PH.pw / 2, bo], [PH.pw / 2, bo + PH.ph], [-PH.pw / 2, bo + PH.ph]].map(([u, v]) => P(T(u, v, -0.0045)));
    // its shadow on the desk and the strut's dark back
    g.fillStyle = 'rgba(20,30,30,0.32)'; g.fill(LC.pathPts([T(-PH.w / 2 - 0.01, 0, 0), T(PH.w / 2 + 0.01, 0, 0), T(PH.w / 2 + 0.03, 0, 0.09), T(-PH.w / 2 + 0.02, 0, 0.09)].map(p => P([p[0], 0.0005, p[2]]))));
    g.fillStyle = '#141818'; g.fill(LC.pathPts([T(-PH.w / 2, -0.001, 0), T(PH.w / 2, -0.001, 0), T(PH.w / 2, PH.h, 0.003), T(-PH.w / 2, PH.h, 0.003)].map(P)));
    // the print, laid into the frame in slices (one clip for the whole opening, each slice a little overdrawn)
    const tex = printTex(c), q = [inner[3], inner[2], inner[1], inner[0]], ipath = LC.pathPts(inner), N = 24;
    g.save(); g.clip(ipath);
    for (let i = 0; i < N; i++) {
      const v0 = i / N, v1 = (i + 1) / N, L0 = [lerp(q[0][0], q[3][0], v0), lerp(q[0][1], q[3][1], v0)], R0 = [lerp(q[1][0], q[2][0], v0), lerp(q[1][1], q[2][1], v0)], L1 = [lerp(q[0][0], q[3][0], v1), lerp(q[0][1], q[3][1], v1)];
      g.save(); g.transform((R0[0] - L0[0]) / TW, (R0[1] - L0[1]) / TW, (L1[0] - L0[0]) / (TH / N), (L1[1] - L0[1]) / (TH / N), L0[0], L0[1]);
      g.drawImage(tex, 0, TH * v0, TW, Math.min(TH / N + 2, TH - TH * v0), 0, 0, TW, Math.min(TH / N + 2, TH - TH * v0)); g.restore();
    }
    // the glass: the ceiling's lamps above and behind us slide across it as it turns; turned away it holds the white window
    const ib = (() => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; inner.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; })();
    g.globalCompositeOperation = 'screen';
    const slide = ang * 2 * PC.f * 0.16, lamp = c.cache('Q09|photo|lamp', lg => { const l = LC.layer(420, 180); l.fillStyle = '#F6FAF7'; l.beginPath(); l.moveTo(40, 60); l.lineTo(360, 40); l.lineTo(380, 120); l.lineTo(60, 140); l.closePath(); l.fill(); lg.drawImage(LC.blurred(l.canvas, 9, false), 0, 0); }, 420, 180);
    [[-0.1, 0.08, 1], [0.55, 0.0, 0.8], [1.2, -0.08, 0.6]].forEach(([u, v, sc]) => { const x = ib.x + ib.w * u + slide, y = ib.y + ib.h * (0.06 + v) - slide * 0.1; g.globalAlpha = (0.32 + 0.35 * clamp(ang * 1.6, 0, 1)) * sc; g.drawImage(lamp, x - 210 * sc, y - 90 * sc, 420 * sc, 180 * sc); });
    g.globalAlpha = 1;
    g.fillStyle = rgba('#EEF4F2', clamp((ang - 0.12) * 1.1, 0, 0.7)); g.fillRect(ib.x - 10, ib.y - 10, ib.w + 20, ib.h + 20);
    LC.glare(g, null, { x: ib.x + ib.w * 0.5, y: ib.y + ib.h * 0.5, angle: -1.1 + ang * 0.4, color: '#FFFFFF', bands: [{ d: -ib.w * 0.18 + slide * 0.5, w: ib.w * 0.16, a: 0.07 }, { d: ib.w * 0.05 + slide * 0.5, w: ib.w * 0.02, a: 0.11 }] });
    g.globalCompositeOperation = 'source-over';
    LC.specks(g, null, ib, 'q09-ph-dust', { n: 70, color: '#FFFFFF', rMin: 0.5, rMax: 1.2, aMin: 0.08, aMax: 0.3, scratch: 0.15 });
    LC.smudge(g, ib.x + ib.w * 0.78, ib.y + ib.h * 0.7, 34, 22, 0.5, 'q09-ph-smudge', '#FFFFFF', 0.08);
    g.restore();
    // the frame itself: thin black metal, its top and one edge catching the lamps
    const fp = new Path2D(); fp.moveTo(outer[0][0], outer[0][1]); outer.forEach(p => fp.lineTo(p[0], p[1])); fp.closePath(); inner.slice().reverse().forEach((p, i) => i ? fp.lineTo(p[0], p[1]) : fp.moveTo(p[0], p[1])); fp.closePath();
    g.fillStyle = '#121616'; g.fill(fp, 'evenodd');
    g.strokeStyle = 'rgba(232,240,236,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(outer[3][0], outer[3][1]); g.lineTo(outer[2][0], outer[2][1]); g.stroke();
    g.strokeStyle = 'rgba(232,240,236,0.25)'; g.beginPath(); g.moveTo(outer[2][0], outer[2][1]); g.lineTo(outer[1][0], outer[1][1]); g.stroke();
    return P(T(PH.w / 2, PH.h * 0.55, 0));          // the grip: its right edge, where his fingers turn it
  }
  function photoShot(c, st, lt) {
    const v = office().photo, g = c.g;
    c.camera(cam({ x: 990, y: 520, zoom: 1.04 + st * 0.006 }));
    v.back(c, lt, { tod: 'afternoon' });
    // he reaches in, takes the frame's right edge, turns it to face him (settling), lets go
    const t = twos(lt), ang = 0.5 * (1 - seg(lt, 46.0, 48.4, E.settle));
    const grip = photoFrame(c, lt, ang);
    const inHand = seg(t, 45.0, 45.9, E.outCubic) * (1 - seg(t, 48.7, 49.6, E.inCubic));
    if (inHand > 0) {
      const holding = t > 45.8 && t < 48.6, HP = { size: 420, pose: 'grip', grip: holding ? 'pinch' : 'relaxed', view: 'back', roll: 15, rot: -160, sleeve: 'office' }, gm = handGeom(HP), pc = pinchOf(gm);
      const off = (1 - inHand) * 640, at = [grip[0] - pc[0] + 6 + off, grip[1] - pc[1] + off * 0.4];
      RIG.hand(g, 'daniel', Object.assign({ at }, HP), { light: { x: 900, y: -200, color: '#EEF3EF', back: 0.45 } });
    }
    c.reset(); g.drawImage(c.cache('Q09|photo|band', bg => { bg.fillStyle = LC.lin(bg, 0, 860, 0, H, [[0, '#0D1414', 0], [1, '#0D1414', 0.45]]); bg.fillRect(0, 860, W, 220); }), 0, 0);
  }

  // ---------- the office: his desk across the floor, through the meeting room's glass partition ----------
  function deskShot(c, st, lt, o) {
    const v = office().desk, a = v.anchors, s = { tod: 'afternoon', glow: 0.6 };
    c.camera(cam(o.cam || {}));
    v.back(c, lt, s);
    RIG.draw(c.g, 'daniel', Object.assign({ at: a.daniel.seat, scale: a.daniel.scale, view: 'three', facing: -1, body: 'sit', seat: 0.47, breath: breath(lt), face: 'concentration' }, DAN, o.pose ? o.pose(twos(lt)) : {}),
      { light: v.light, ambient: '#6E8682', ambientK: 0.12 });
    v.front(c, lt, s);
  }

  FILM.seq({
    id: 'Q09', title: 'The hottest hours', dur: 58,
    lines: [
      { id: 'L035', at: 44.0 },               // V.O., 9.36 s take (its pauses: +4.2..5.0, +6.55..7.35)
    ],
    sound(S) {
      // the empty house: almost nothing. A clock, the fridge, the room's air; summer very far off outside
      S.bed('room', 0, 12.0, { level: -52 });
      S.bed('fridge', 0, 12.0, { level: -47 });
      S.bed('clock_tick', 0, 12.0, { level: -42 });                 // the kitchen's wall clock
      S.bed('summer_far', 0, 12.0, { level: -60 });                 // a wood pigeon, a far mower, through the glass
      // the city at the hottest hour: no wind, a dry shimmer, traffic thinned by the heat
      S.bed('city', 12.0, 32.0, { level: -42, fi: 0.2 });
      S.bed('heat', 12.0, 32.0, { level: -50 });
      S.cue('footsteps', 16.6, { n: 6, level: -42 });              // the pedestrian, far below the sash window
      S.bed('dog_pant', 20.4, 24.0, { level: -40 });
      S.cue('ice_pour', 24.7, { level: -28 }); S.cue('cans_clink', 25.1, { level: -34 });
      S.bed('engine', 28.0, 32.0, { f: 30, level: -46 });           // the stopped car idling at the lights
      S.cue('bus_far', 29.0, { level: -44 });
      // the office: the air conditioner hums steadily
      S.bed('ac', 32.0, 58.0, { level: -44 });
      S.bed('office_quiet', 32.0, 58.0, { level: -54 });            // a phone far off, a printer, keys
      S.cue('pen', 35.1, { level: -34 });                            // he signs a form
      S.cue('email_send', 37.6, { level: -36 });                     // files an email (a soft whoosh)
      S.cue('pen_tick', 39.3, { level: -34 });                       // ticks a box
      S.bed('projector', 40.8, 42.4, { level: -46 });                // another meeting
      S.cue('coffee_machine', 42.5, { level: -36 });                 // another cup of coffee
      S.cue('frame_turn', 46.2, { level: -40 });                     // the photo frame turned on the desk
      S.bed('keyboard', 51.2, 58.0, { level: -46 });                 // back to work
    },
    shots: [
      // ===== S13 · the empty house =====
      { at: 0, name: 'counter, afternoon: the phone on its charger, screen black; dust in the sun', draw(c, st, lt) {
          counterShot(c, lt, 'c1', { x: 960, y: 520, zoom: 1.0 + st * 0.003 });
        } },
      { at: 7.2, name: 'counter, tight: its black glass holds the empty hall', draw(c, st, lt) {
          counterShot(c, lt, 'tight', { x: 900, y: 540, zoom: 1.0 + st * 0.004 });
        } },
      // ===== S14 · the city =====
      { at: 12.0, name: 'city: heat ripples in a shop window; the fans not turning', draw(c, st, lt) {
          const v = city().shopwindow; c.camera(cam({ zoom: 1.0 + st * 0.004 })); v.back(c, lt, {}); v.front(c, lt, {});
        } },
      { at: 16.0, name: 'city: a pedestrian between islands of shade (from a sash window)', draw(c, st, lt) {
          const v = city().crossing, a = v.anchors.path, g = c.g; c.camera(cam({ zoom: 1.0 + st * 0.003 }));
          v.back(c, lt, {});
          // from the tree's shade, over the zebra, quick through the sun, into the awning's slit
          const u = seg(lt, 16.2, 20.2), P = u < 0.15 ? [a.from, a.kerbNear, u / 0.15] : u < 0.85 ? [a.kerbNear, a.kerbFar, (u - 0.15) / 0.7] : [a.kerbFar, a.to, (u - 0.85) / 0.15];
          const x = lerp(P[0][0], P[1][0], P[2]), y = lerp(P[0][1], P[1][1], P[2]), k = lerp(a.scaleFrom, a.scaleTo, u);
          g.fillStyle = 'rgba(47,50,49,0.75)'; g.beginPath(); g.ellipse(x + 0.06 * k, y + 0.02 * k, 0.32 * k, 0.12 * k, 0.2, 0, TAU); g.fill();
          RIG.draw(g, 'pedestrian', { variant: 0, at: [x, y], scale: k * 0.82, view: 'profile', facing: 1, body: 'walk', phase: (twos(lt) * 1.1) % 1, pitch: 18 }, { light: v.light });
          v.front(c, lt, {});
        } },
      { at: 20.4, name: 'city: a dog beneath a bus shelter, through its glass panel', draw(c, st, lt) {
          const v = city().shelter, a = v.anchors.dog; c.camera(cam({ zoom: 1.0 + st * 0.004 }));
          v.back(c, lt, {}); RIG.draw(c.g, 'dog', { at: [a.x, a.y], scale: a.scale, facing: a.facing, body: 'lie', pant: 1, phase: twos(lt) * 1.4 }, { light: v.light }); v.front(c, lt, {});
        } },
      { at: 24.0, name: 'city: a man at a roadside stall pours melting ice into a bucket', draw(c, st, lt) {
          const v = city().stall, a = v.anchors.man, s = { pour: lt > 24.6 && lt < 26.9 ? 1 : 0 };   // the ice falls while the bag is tipped
          c.camera(cam({ zoom: 1.0 + st * 0.004 }));
          v.back(c, lt, s);
          const tip = seg(twos(lt), 24.3, 24.9, E.inOutSine) * (1 - seg(twos(lt), 26.9, 27.5, E.inOutSine));
          const inf = RIG.draw(c.g, 'stallman', { at: [a.x, a.y], scale: a.scale, view: 'three', yaw: 30, facing: 1, body: 'stand', armR: 'reachLow', armL: 'hold', hold: { r: 'icebag' }, head: { nod: 0.3 + 0.15 * tip, turn: 0.1 } }, { light: v.light });
          if (inf && inf.hands) s.hands = [(inf.hands.R[0] + inf.hands.L[0]) / 2, (inf.hands.R[1] + inf.hands.L[1]) / 2];
          v.front(c, lt, s);
        } },
      { at: 28.0, name: 'city: the sun presses against glass and brick and metal. No wind moves', draw(c, st, lt) {
          const v = city().street; c.camera(cam({ zoom: 1.0 + st * 0.003 })); v.back(c, lt, {}); v.front(c, lt, {});
        } },
      // ===== S15 · the office, afternoon: a small montage =====
      { at: 32.0, name: 'office: a quiet, refrigerated world behind sealed windows', draw(c, st, lt) {
          deskShot(c, st, lt, { cam: { zoom: 1.0 + st * 0.004 }, pose: () => ({ armR: 'type', armL: 'type' }) });
        } },
      { at: 34.8, name: 'insert: he signs a form', draw(c, st) { deskInsert(c, st, 'sign'); } },
      { at: 36.8, name: 'laptop: files an email', draw(c, st, lt) {
          const v = office().laptop; c.camera(cam({ x: 900, y: 520, zoom: 1.06 + st * 0.01 }));
          const s = { wake: 1, content: lt < 37.6 ? 'email' : 'sent', tod: 'afternoon',
            reflect: (g, R) => RIG.face(g, 'daniel', Object.assign({ at: [R.x, R.y - 40], size: 560, view: 'front', face: 'concentration' }, DAN), { light: R.light, exposure: 0.5 + 0.6 * R.lit }) };
          v.back(c, lt, s); v.front(c, lt, s);
        } },
      { at: 38.8, name: 'insert: ticks a box', draw(c, st) { deskInsert(c, st, 'tick'); } },
      { at: 40.8, name: 'conference: another meeting', draw(c, st, lt) {
          const v = office().projector; c.camera(cam({ x: 1180, y: 470, zoom: 1.45 + st * 0.012 }));
          v.back(c, lt, {});
          const PJ = LC.camera({ x: -1.15, y: 1.02, z: -1.75, yaw: deg(52), pitch: deg(1), f: 1150, cx: 960, cy: 540 }), p = PJ.p(1.25, 0.47, -0.95), sc = PJ.f / p[2];
          stillFig(c, 'meeting', 'daniel', Object.assign({ at: [p[0], p[1]], scale: sc, view: 'threeBack', facing: 1, body: 'sit', seat: 0.47, armR: 'desk', armL: 'desk', head: { nod: 0.1 } }, DAN),
            { mode: 'silhouette', light: { x: 1340, y: 380, color: '#D8E8EC' }, ink: '#0A1011' }, [p[0] - 0.85 * sc, p[1] - 1.2 * sc, 1.7 * sc, 1.8 * sc]);
          v.front(c, lt, {});
        }, post: { vig: 0.45 } },
      { at: 42.4, name: 'kitchenette: another cup of coffee', draw(c, st, lt) {
          const v = office().kitchen, KT = LC.camera({ x: 0.55, y: 1.52, z: -0.9, yaw: deg(-4), pitch: deg(-6), f: 1180, cx: 960, cy: 540 }), p = KT.p(-0.3, 0, 1.4), sc = KT.f / p[2];
          c.camera(cam({ x: 560, y: 470, zoom: 1.25 + st * 0.01 }));
          v.back(c, lt, { stutter: false, tod: 'afternoon' });
          stillFig(c, 'coffee', 'daniel', Object.assign({ at: [p[0], p[1]], scale: sc, view: 'profile', facing: -1, body: 'stand', face: 'tired', head: { nod: 0.25 }, armL: 'mug', hold: { l: 'cup' } }, DAN),
            { light: v.light, ambient: '#6E8682', ambientK: 0.12 }, [p[0] - 0.62 * sc, p[1] - 1.98 * sc, 1.24 * sc, 2.06 * sc]);
          v.front(c, lt, { tod: 'afternoon' });
        } },
      // ===== the photograph =====
      { at: 44.0, name: 'photo: Sarah and Emily laughing; he straightens it to face him', draw(c, st, lt) { photoShot(c, st, lt); } },
      { at: 50.8, name: 'office: he returns to his work', draw(c, st, lt) {
          deskShot(c, st, lt, { cam: { x: 950, y: 600, zoom: 1.04 + st * 0.005 }, pose: t => ({ armR: 'type', armL: 'type', head: { nod: 0.12 + 0.04 * Math.sin(t * 0.7) } }) });
        } },
    ],
  });
})();
