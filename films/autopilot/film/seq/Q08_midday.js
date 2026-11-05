/* AUTOPILOT · Q08 · MIDDAY (72 s) · S10–S12, A041–A052, L028–L034
   The conference room (the projector's beam, the glass table, the window that lets the heat in, the clock in a print's
   glass), then the kitchenette: a phone rings, his hand goes to the bag's outside pocket and closes on nothing, he tries
   his shirt pocket, his trouser pocket, the bag again; his blank second in the microwave's door; the flash of the morning
   (Q02's own image of the phone charging by the kettle); Priya; and the hot day held behind the kitchenette window under
   his V.O.
   Every shot is through a pane: the projector's beam and lens, the glass table, a framed print's glass, the kitchenette's
   glass door, a phone's glass, the microwave's door, the kitchenette window. Characters animate on twos; the camera on
   ones. The pocket insert is built here (the office set has no close view of the counter). Figures that do not move are
   drawn once into small caches. Deterministic. Caches keyed 'Q08|'. */
(function () {
  'use strict';
  const W = 1920, H = 1080, TAU = Math.PI * 2;
  const { clamp, lerp, seg, key, twos } = FILM, E = FILM.ease, rgba = OTM.rgba;
  const deg = d => d * Math.PI / 180;

  // The flash (A048–A049) is the morning's own image: Q02 (The counter) at this local time, where the phone stands by the
  // kettle with the cable in and the green charging icon lit. Q02 is built in parallel: move this if its counter moves.
  // If Q02 is not loaded, a stand-in from SETS.kitchen's counter view (C1, charging) is drawn instead.
  const FLASH_Q02_T = 22;
  const FLASH_AT = 36.4, FLASH_END = 37.4;

  // ---------- helpers ----------
  const office = () => SETS.office.views;
  const breath = t => (twos(t) * 0.25) % 1;                          // Daniel's 3 px breath at 0.25 Hz, on twos
  const lit = (v, k) => ({ light: { x: v.light.x, y: v.light.y, color: v.light.color, back: k == null ? 0.45 : k }, ambient: '#6E8682', ambientK: 0.12 });
  const pose = (t, ks) => RIG.key(twos(t), ks);                       // poses tween on twos (strings snap at the midpoint)
  const DAN = { outfit: 'office', collar: 'straight' };
  // a figure that holds still, drawn once into its own canvas (at 2x, so pushes stay crisp) and placed by its box
  function stillFig(c, name, who, p, opts, box) {
    const [x0, y0, w, h] = box, k = 2;
    const cv = c.cache('Q08|fig|' + name, g => { g.scale(k, k); g.translate(-x0, -y0); RIG.draw(g, who, p, opts); }, Math.ceil(w * k), Math.ceil(h * k));
    c.g.drawImage(cv, x0, y0, w, h);
  }
  // the kitchenette's camera (the office set's, from the corridor through the glass door), so figures stand in its room
  const KT = LC.camera({ x: 0.55, y: 1.52, z: -0.9, yaw: deg(-4), pitch: deg(-6), f: 1180, cx: 960, cy: 540 });
  const kt = (x, z) => { const p = KT.p(x, 0, z); return { at: [p[0], p[1]], scale: KT.f / p[2] }; };
  const ktp = (x, y, z) => { const p = KT.p(x, y, z); return [p[0], p[1]]; };
  // the conference room's projector camera (for colleagues across the table, heads in the beam)
  const PJ = LC.camera({ x: -1.15, y: 1.02, z: -1.75, yaw: deg(52), pitch: deg(1), f: 1150, cx: 960, cy: 540 });
  const pj = (x, z) => { const p = PJ.p(x, 0.47, z); return { at: [p[0], p[1]], scale: PJ.f / p[2] }; };

  // ---------- the conference room: colleagues in the projector's beam ----------
  // two heads across the table in the beam, one near us against the slide: silhouettes rimmed by the slide's light. They
  // barely move; a nod is a change of cached pose (three levels), on twos.
  const BEAM_FAR = [
    { name: 'b1', variant: 1, at: [1.0, 0.95], view: 'three', facing: 1, arms: ['desk', 'desk'], turn: 0, seed: 2 },
    { name: 'b2', variant: 3, at: [1.75, 0.95], view: 'three', facing: 1, arms: ['desk', 'lap'], turn: -0.1, seed: 0 },
  ];
  const BEAM_NEAR = { name: 'b3', variant: 0, at: [1.25, -0.95], view: 'threeBack', facing: 1, arms: ['desk', 'desk'], turn: 0, seed: 4, ink: '#0A1011' };
  function beamColleague(c, t, b) {
    const s = pj(b.at[0], b.at[1]), wave = Math.max(0, Math.sin(twos(t) * 1.7 + b.seed)) ** 6, lvl = wave < 0.25 ? 0 : wave < 0.7 ? 1 : 2;
    const p = { variant: b.variant, at: s.at, scale: s.scale, view: b.view, facing: b.facing, body: 'sit', seat: 0.47, head: { nod: [0.1, 0.22, 0.34][lvl], turn: b.turn }, armR: b.arms[0], armL: b.arms[1] };
    stillFig(c, 'beam|' + b.name + '|' + lvl, 'colleague', p, { mode: 'silhouette', light: { x: 1340, y: 380, color: '#D8E8EC' }, ink: b.ink || '#0C1314' }, [s.at[0] - 0.85 * s.scale, s.at[1] - 1.2 * s.scale, 1.7 * s.scale, 1.8 * s.scale]);
  }
  function projectorShot(c, lt, cam) {
    const v = office().projector; c.camera(cam);
    v.back(c, lt, {});
    // across the table the dark glass top hides their laps: clip the far ones to above its far edge
    const e0 = PJ.p(-1.9, 0.75, 0.6), e1 = PJ.p(1.9, 0.75, 0.6), m = (e1[1] - e0[1]) / (e1[0] - e0[0]), yAt = x => e0[1] + m * (x - e0[0]);
    const clip = new Path2D(); clip.moveTo(-200, -400); clip.lineTo(2200, -400); clip.lineTo(2200, yAt(2200)); clip.lineTo(-200, yAt(-200)); clip.closePath();
    c.g.save(); c.g.clip(clip); BEAM_FAR.forEach(b => beamColleague(c, lt, b)); c.g.restore();
    beamColleague(c, lt, BEAM_NEAR);          // the near one, between us and the table, against the slide
    v.front(c, lt, {});
  }

  // ---------- the conference room: the glass table ----------
  // seated colleagues along it (cached: they barely move) and their reflections in the glass
  const SEATS = [[1, 2, 'three'], [4, 0, 'three'], [2, 4, 'three'], [5, 1, 'three']];
  function tableColleagues(c, v) {
    const a = v.anchors.seats;
    return c.cache('Q08|table|people', g => SEATS.forEach(([si, variant, view]) => {
      const s = a[si], left = si >= 3;   // seats 3..5 are on the left side of the table, facing right
      RIG.draw(g, 'colleague', { variant, at: [s.x, s.y], scale: s.scale, view, facing: left ? 1 : -1, body: 'sit', seat: 0.47, armR: 'desk', armL: 'desk', head: { nod: 0.15, turn: left ? 0.1 : -0.1 } },
        { mode: 'silhouette', light: { x: 960, y: 260, color: '#E8EEF0' }, ink: '#121A1B', rimW: 2.5 });
    }));
  }
  // the pages in his left hand: a few sheets held at chest height; the top one turns over when he turns a page
  function pages(g, hand, scale, turn) {
    const w = 0.21 * scale, h = 0.28 * scale, x = hand[0] - w * 0.35, y = hand[1] - h * 0.62;
    g.save(); g.translate(x, y); g.transform(1, 0, -0.18, 0.62, 0, 0);
    g.fillStyle = '#C9D3CF'; g.fillRect(3, 3, w, h); g.fillStyle = '#EEF2EF'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(70,90,92,0.4)'; for (let i = 0; i < 7; i++) g.fillRect(w * 0.12, h * (0.15 + i * 0.1), w * (i % 3 ? 0.7 : 0.5), Math.max(1, h * 0.02));
    if (turn > 0 && turn < 1) { const fx = w * Math.cos(turn * Math.PI); g.fillStyle = turn < 0.5 ? '#F6F8F6' : '#DCE3DF'; g.beginPath(); g.moveTo(0, 0); g.lineTo(fx, -h * 0.12 * Math.sin(turn * Math.PI)); g.lineTo(fx, h - h * 0.12 * Math.sin(turn * Math.PI)); g.lineTo(0, h); g.closePath(); g.fill(); }
    g.restore();
  }
  function tableShot(c, st, lt, o) {
    const v = office().table, a = v.anchors, g = c.g; o = o || {};
    c.camera(o.cam || {});
    v.back(c, lt, { window: o.window || 0 });
    // Daniel at the far end before the slide, the pages in his left hand, fielding questions
    const d = a.daniel, t = twos(lt), extra = o.pose ? o.pose(t) : {};
    const P = Object.assign({ at: [d.x, d.y], scale: d.scale, view: 'front', body: 'stand', breath: breath(lt), face: 'tired', armL: { pose: 'hold', dx: -0.04, dy: 0.08 } }, DAN, extra);
    const LD = { light: { x: 960, y: 300, color: '#E8EEF0', back: 0.85 }, ambient: '#6E8682', ambientK: 0.18 };
    const info = RIG.draw(g, 'daniel', P, LD);
    if (info && info.hands) pages(g, info.hands.L, d.scale, o.turn ? o.turn(lt) : 0);
    g.drawImage(tableColleagues(c, v), 0, 0);
    v.front(c, lt, { window: o.window || 0, reflect: (rg, R) => {
      // the colleagues (and, in the wide shots, Daniel) given back by the dark glass
      rg.drawImage(c.cache('Q08|table|refl', mg => SEATS.forEach(([si, variant, view]) => {
        const s = R.seats[si], left = si >= 3;
        R.mirror(mg, s.mirrorY, gg => RIG.draw(gg, 'colleague', { variant, at: [s.x, s.y], scale: s.scale, view, facing: left ? 1 : -1, body: 'sit', seat: 0.47, armR: 'desk', armL: 'desk', head: { nod: 0.15 } }, { light: R.light, ambient: '#30494A', ambientK: 0.3 }));
      })), 0, 0);
      if (o.reflectDaniel) R.mirror(rg, d.y + 4, gg => RIG.draw(gg, 'daniel', P, { light: R.light }));
    } });
  }

  // ---------- the kitchenette: the bag on the counter, Daniel, Priya ----------
  const BAG = { x: -0.95, z: 1.3 };
  function smallBag(c) {
    // the satchel on the worktop by the coffee machine (seen from the corridor), cached once
    return c.cache('Q08|kit|bag', g => {
      const p = KT.p(BAG.x, 0.9, BAG.z), k = KT.f / p[2], w = 0.42 * k, h = 0.31 * k, x0 = p[0] - w / 2, y1 = p[1];
      g.fillStyle = 'rgba(10,14,14,0.45)'; g.beginPath(); g.ellipse(p[0], y1 + 2, w * 0.6, h * 0.08, 0, 0, TAU); g.fill();
      g.fillStyle = LC.lin(g, x0, 0, x0 + w, 0, [[0, '#3A2618'], [0.6, '#4E3220'], [1, '#7A5434']]); g.fill(LC.rquad([[x0 + w * 0.04, y1 - h], [x0 + w * 0.96, y1 - h], [x0 + w, y1], [x0, y1]], 0.04 * k));
      g.fillStyle = '#2C1C12'; g.fill(LC.rquad([[x0 + w * 0.02, y1 - h - 2], [x0 + w * 0.98, y1 - h - 2], [x0 + w * 0.98, y1 - h * 0.62], [x0 + w * 0.02, y1 - h * 0.62]], 0.04 * k));
      g.fillStyle = 'rgba(232,240,236,0.5)'; g.fillRect(x0 + w * 0.05, y1 - h - 3, w * 0.9, 2);
      g.fillStyle = '#5A3C24'; g.fillRect(x0 + w * 0.13, y1 - h * 0.5, w * 0.74, h * 0.44); g.fillStyle = '#060404'; g.fillRect(x0 + w * 0.14, y1 - h * 0.5, w * 0.72, 3);
      g.strokeStyle = '#24170F'; g.lineWidth = 0.03 * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(p[0] - w * 0.14, y1 - h - 2); g.bezierCurveTo(p[0] - w * 0.12, y1 - h - 0.12 * k, p[0] + w * 0.12, y1 - h - 0.12 * k, p[0] + w * 0.14, y1 - h - 2); g.stroke();
    });
  }
  function kitchenShot(c, st, lt, o) {
    const v = office().kitchen, g = c.g, s = { stutter: !!o.stutter, ring: !!o.ring };
    c.camera(o.cam || {});
    v.back(c, lt, s);
    g.drawImage(smallBag(c), 0, 0);
    const L = lit(v, 0.55), figs = [];
    if (o.priya) figs.push(['priya', o.priya]);
    figs.push(['daniel', Object.assign({ view: 'profile', facing: -1, body: 'stand', breath: breath(lt), face: 'tired' }, DAN, kt(-0.3, 1.4), o.daniel || {})]);
    figs.sort((A, B) => A[1].scale - B[1].scale).forEach(([who, p]) => RIG.draw(g, who, p, L));   // the farther first
    v.front(c, lt, s);
  }
  function priyaWalk(t, t0, t1, from, to) {
    // Priya walks from `from` to `to` (room x, z) between t0 and t1: warm and quick
    const u = seg(t, t0, t1, E.outQuad), x = lerp(from[0], to[0], u), z = lerp(from[1], to[1], u), moving = t > t0 && t < t1;
    return Object.assign({ body: moving ? 'walk' : 'stand', phase: moving ? (twos(t) * 1.05) % 1 : 0, outfit: 'office' }, kt(x, z));
  }

  // ---------- the pocket insert: the bag on the worktop, close, through the door's glass with a long lens ----------
  const BG = { x0: 600, x1: 1380, y0: 400, y1: 1000 };
  function pocketInsert(c, st) {
    const g = c.g, bw = BG.x1 - BG.x0, bh = BG.y1 - BG.y0;
    c.camera({ x: 960 + st * 4, y: 540, zoom: 1.0 + st * 0.006 });
    g.drawImage(c.cache('Q08|bag|back', bg => {
      const l = LC.layer();
      l.fillStyle = '#B9C6C1'; l.fillRect(0, 0, W, H);
      l.fillStyle = '#C5D0CB'; l.fillRect(0, 0, W, 660);
      l.fillStyle = '#DCE2DE'; l.fillRect(0, -40, W, 140); l.fillStyle = 'rgba(40,56,56,0.25)'; l.fillRect(0, 100, W, 6);
      // the microwave behind: its black door holds the bright window
      l.fillStyle = '#202728'; l.fillRect(1000, 170, 1060, 520); l.fillStyle = '#070A0B'; l.fillRect(1060, 215, 690, 420);
      l.fillStyle = '#E6ECE8'; l.fillRect(1400, 255, 220, 190); l.fillStyle = 'rgba(80,100,100,0.9)'; l.fillRect(1505, 255, 8, 190);
      l.fillStyle = '#101516'; l.fillRect(1780, 215, 240, 420);
      // the coffee machine's flank at the left, its amber lamp
      l.fillStyle = '#1C2223'; l.fillRect(-40, 70, 400, 620); l.fillStyle = '#2E3536'; l.fillRect(-40, 70, 400, 26); l.fillStyle = 'rgba(232,176,112,0.9)'; l.beginPath(); l.arc(312, 300, 8, 0, TAU); l.fill();
      // the worktop receding in the window's light
      l.fillStyle = LC.lin(l, 0, 660, 0, H, [[0, '#9AA8A3'], [0.3, '#8A9894'], [1, '#56625F']]); l.fillRect(0, 660, W, H - 660);
      l.fillStyle = 'rgba(240,246,242,0.35)'; l.fillRect(0, 660, W, 5);
      bg.drawImage(LC.blurred(l.canvas, 16), 0, 0);
      bg.fillStyle = LC.rad(bg, 1500, 320, 50, 900, [[0, '#F4F8F4', 0.16], [1, '#F4F8F4', 0]]); bg.fillRect(0, 0, W, H);
      // the bag itself: cool window light from behind-right
      bg.fillStyle = 'rgba(8,12,12,0.55)'; bg.beginPath(); bg.ellipse((BG.x0 + BG.x1) / 2, BG.y1 + 6, bw * 0.56, 30, 0, 0, TAU); bg.fill();
      bg.fillStyle = LC.lin(bg, BG.x0, 0, BG.x1, 0, [[0, '#33241A'], [0.55, '#45301F'], [0.9, '#5E4330'], [1, '#76583E']]); bg.fill(LC.rquad([[BG.x0 + bw * 0.03, BG.y0], [BG.x1 - bw * 0.03, BG.y0], [BG.x1, BG.y1], [BG.x0, BG.y1]], 40));
      const fy = BG.y0 + bh * 0.36;
      bg.fillStyle = LC.lin(bg, BG.x0, 0, BG.x1, 0, [[0, '#271A11'], [0.7, '#352417'], [1, '#4E3726']]); bg.fill(LC.rquad([[BG.x0 + bw * 0.02, BG.y0 - 6], [BG.x1 - bw * 0.02, BG.y0 - 6], [BG.x1 - bw * 0.01, fy], [BG.x0 + bw * 0.01, fy]], 34));
      bg.fillStyle = 'rgba(232,240,236,0.5)'; bg.fillRect(BG.x0 + bw * 0.05, BG.y0 - 8, bw * 0.9, 4); bg.fillStyle = 'rgba(232,240,236,0.22)'; bg.fillRect(BG.x0 + bw * 0.04, fy - 2, bw * 0.92, 3);
      bg.strokeStyle = 'rgba(200,176,140,0.3)'; bg.setLineDash([7, 7]); bg.lineWidth = 2; bg.beginPath(); bg.moveTo(BG.x0 + bw * 0.05, fy - 14); bg.lineTo(BG.x1 - bw * 0.05, fy - 14); bg.stroke(); bg.setLineDash([]);
      bg.fillStyle = '#22170F'; bg.fillRect(BG.x0 + bw * 0.47, BG.y0 - 6, bw * 0.06, bh * 0.44); bg.strokeStyle = '#9AA6A2'; bg.lineWidth = 4; bg.strokeRect(BG.x0 + bw * 0.455, fy - 26, bw * 0.09, 40);
      bg.strokeStyle = '#1E140D'; bg.lineWidth = 26; bg.lineCap = 'round'; bg.beginPath(); bg.moveTo(BG.x0 + bw * 0.36, BG.y0 - 4); bg.bezierCurveTo(BG.x0 + bw * 0.38, BG.y0 - 160, BG.x0 + bw * 0.62, BG.y0 - 160, BG.x0 + bw * 0.64, BG.y0 - 4); bg.stroke();
      bg.strokeStyle = 'rgba(232,240,236,0.45)'; bg.lineWidth = 3; bg.beginPath(); bg.moveTo(BG.x0 + bw * 0.42, BG.y0 - 112); bg.bezierCurveTo(BG.x0 + bw * 0.47, BG.y0 - 136, BG.x0 + bw * 0.57, BG.y0 - 136, BG.x0 + bw * 0.61, BG.y0 - 104); bg.stroke();
    }), 0, 0);
    // the pocket's dark mouth, his hand going into it (clipped at the mouth: inside, it is gone), the pocket's front panel
    const Pk = { x: BG.x0 + bw * 0.12, y: BG.y0 + bh * 0.5, w: bw * 0.76, h: bh * 0.44 }, sag = 40;
    const mouth = new Path2D(); mouth.moveTo(Pk.x + 6, Pk.y); mouth.quadraticCurveTo(Pk.x + Pk.w / 2, Pk.y + sag * 1.9, Pk.x + Pk.w - 6, Pk.y); mouth.quadraticCurveTo(Pk.x + Pk.w / 2, Pk.y - 8, Pk.x + 6, Pk.y); g.fillStyle = '#050303'; g.fill(mouth);
    // in from the upper right, down into the pocket, a grope, out again, and the hand closes on nothing
    const t = twos(st);
    const wx = key(t, [[0, 1430], [0.55, 1130, 'outCubic'], [0.95, 1075], [1.25, 1095], [1.55, 1065], [1.9, 1150, 'inOutSine'], [2.5, 1170]]);
    const wy = key(t, [[0, -120], [0.55, 420, 'outCubic'], [0.95, 520, 'inOutSine'], [1.25, 505], [1.55, 525], [1.9, 330, 'inOutSine'], [2.5, 300]]);
    const grip = t < 1.9 ? 'flat' : 'fist';
    const above = new Path2D(); above.moveTo(-400, -400); above.lineTo(2400, -400); above.lineTo(2400, Pk.y); above.lineTo(Pk.x + Pk.w, Pk.y); above.quadraticCurveTo(Pk.x + Pk.w / 2, Pk.y + sag, Pk.x, Pk.y); above.lineTo(-400, Pk.y); above.closePath();
    g.save(); g.clip(above);
    RIG.hand(g, 'daniel', { at: [wx, wy], size: 560, pose: grip, view: 'side', rot: lerp(124, 106, seg(t, 0, 0.9)), curl: t < 1.9 ? 1 : lerp(0.25, 0.75, seg(t, 1.9, 2.4)), sleeve: 'office' }, { light: { x: 1700, y: -60, color: '#F2F6F2', back: 0.72 } });
    g.restore();
    const front = new Path2D(); front.moveTo(Pk.x, Pk.y); front.quadraticCurveTo(Pk.x + Pk.w / 2, Pk.y + sag, Pk.x + Pk.w, Pk.y); front.lineTo(Pk.x + Pk.w, Pk.y + Pk.h); front.lineTo(Pk.x, Pk.y + Pk.h); front.closePath();
    g.fillStyle = LC.lin(g, Pk.x, 0, Pk.x + Pk.w, 0, [[0, '#3F2A1C'], [0.6, '#523824'], [1, '#6E4E32']]); g.fill(front);
    // the leather creases a little over the fingers while they are inside
    const inside = clamp((wy - 420) / 90, 0, 1);
    if (inside > 0) { g.save(); g.clip(front); g.strokeStyle = rgba('#1E140D', 0.35 * inside); g.lineWidth = 3; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const x = wx - 150 + i * 34; g.beginPath(); g.moveTo(x, Pk.y + sag + 12); g.quadraticCurveTo(x - 10, Pk.y + sag + 60, x - 4, Pk.y + sag + 104 + i * 8); g.stroke(); } g.restore(); }
    g.strokeStyle = 'rgba(232,226,210,0.7)'; g.lineWidth = 4; g.beginPath(); g.moveTo(Pk.x + 4, Pk.y + 1); g.quadraticCurveTo(Pk.x + Pk.w / 2, Pk.y + sag + 1, Pk.x + Pk.w - 4, Pk.y + 1); g.stroke();
    g.strokeStyle = 'rgba(200,176,140,0.28)'; g.setLineDash([7, 7]); g.lineWidth = 2; g.strokeRect(Pk.x + 16, Pk.y + sag + 10, Pk.w - 32, Pk.h - sag - 26); g.setLineDash([]);
    // the pane: the kitchenette door's glass close to a long lens: its frosted band far out of focus, glare, soft dust
    g.drawImage(c.cache('Q08|bag|pane', pg => {
      const l = LC.layer(); l.fillStyle = '#EEF3F0'; for (let x = -20; x < W + 60; x += 70) { l.beginPath(); l.arc(x, 150, 17, 0, TAU); l.fill(); }
      l.fillRect(0, 114, W, 4); l.fillRect(0, 186, W, 4);
      pg.globalAlpha = 0.3; pg.drawImage(LC.blurred(l.canvas, 11, false), 0, 0); pg.globalAlpha = 1;
      LC.glare(pg, null, { x: 900, y: 420, angle: -1.1, color: '#FFFFFF', bands: [{ d: -300, w: 220, a: 0.05 }, { d: -180, w: 26, a: 0.07 }, { d: 380, w: 300, a: 0.03 }] });
      LC.specks(pg, null, { x: 0, y: 0, w: W, h: H }, 'q08-bag-dust', { n: 150, color: '#FFFFFF', rMin: 1.4, rMax: 3.6, aMin: 0.03, aMax: 0.11, scratch: 0.04 });
      pg.fillStyle = LC.lin(pg, 0, 840, 0, H, [[0, '#0B1112', 0], [1, '#0B1112', 0.55]]); pg.fillRect(0, 840, W, 240);
    }), 0, 0);
  }

  // ---------- the microwave's door: his face (and hers) in its black glass ----------
  function microwaveShot(c, lt, figs, cam) {
    const v = office().microwave;
    c.camera(cam || {});
    v.back(c, lt, {});
    v.front(c, lt, { reflect: (g, R) => figs(g, R) });
  }

  // ---------- the flash: the morning's own image ----------
  function flash(c, st) {
    if (FILM.lib.Q02) { c.post = FILM.drawShot(c, 'Q02', FLASH_Q02_T + st) || {}; return; }
    // stand-in until Q02 exists: C1's counter, the phone charging green beside the kettle, the hall in its glass
    const v = SETS.kitchen.views.counter, s = { tod: 'morning', screen: 'charging', frame: 'c1', bag: true, climber: 0.17 + st * 0.08, climbT: st };
    v.back(c, 8 + st, s); v.front(c, 8 + st, s);
  }

  FILM.seq({
    id: 'Q08', title: 'Midday', dur: 72,
    lines: [
      { id: 'L028', at: 7.0 },                 // Daniel, to the room: about 6.5 s on screen
      { id: 'L029', at: 38.6 },
      { id: 'L030', at: 41.4 }, { id: 'L031', at: 43.8 }, { id: 'L032', at: 48.6 }, { id: 'L033', at: 51.0 },
      { id: 'L034', at: 58.0 },                // V.O., 9.04 s take
    ],
    sound(S) {
      // the conference room: the projector's fan, the building's air, a meeting's small sounds
      S.bed('ac', 0, 72, { level: -48 });
      S.bed('projector', 0, 20.0, { level: -40, fo: 0.4 });
      S.bed('meeting_murmur', 0, 20.0, { level: -52 });            // chairs, a cough, a pen tapping; nobody talking but him
      S.cue('pages', 11.5, { level: -30 });                          // he turns a page
      S.cue('pen', 14.3, { level: -34 }); S.cue('pen', 15.4, { level: -36 });
      S.cue('window_open', 17.0);                                    // someone opens the casement...
      S.cue('whoosh', 17.05, { dur: 1.3, level: -24 });              // ...and a wave of hot air pours in
      S.bed('street_heat', 17.05, 18.35, { level: -34, fi: 0.08, fo: 0.15 }); // the street's glare and noise, for a second
      S.cue('papers_lift', 17.2, { level: -32 });
      S.cue('window_shut', 18.3);                                    // shut again immediately
      S.bed('clock_timelapse', 20.0, 25.6, { level: -40 });          // the wall clock's tick, racing from 10:18 to 11:43
      // the kitchenette: the fridge, the machine, someone's phone
      S.bed('fridge', 25.6, 58.0, { level: -47 });
      S.cue('stutter', 25.9);                                        // the coffee machine stutters
      S.cue('ring', 27.0, { n: 2 });                                 // someone's phone rings on the table (27.0, 29.0)
      S.cue('bag_rustle', 30.9, { level: -30 });                     // his hand into the bag's outside pocket: nothing
      S.cue('pocket_pat', 33.6, { level: -32 }); S.cue('pocket_pat', 33.8, { level: -36 });   // his shirt pocket
      S.cue('pocket_pat', 34.25, { level: -34 });                    // his trouser pocket
      S.cue('bag_rustle', 34.85, { level: -36 });                    // back to the bag
      S.duck(35.2, 36.4, 0.45);                                      // the world thins for his blank second
      S.cue('flash', FLASH_AT);                                      // FLASH: the morning, the phone charging by the kettle
      S.cue('breath', 37.9, { dur: 0.8, level: -30 });               // he exhales through his nose
      S.cue('footsteps', 40.1, { n: 3, level: -34 });                // Priya comes in with a fresh mug
      S.cue('mug_up', 56.6, { level: -36 });                         // he takes his coffee from the machine
      S.cue('footsteps', 55.5, { n: 3, level: -38 });                // Priya goes
      // the window: the hot day held behind sealed glass, the city far and muffled
      S.bed('city_behind_glass', 58.0, 72, { level: -52, fi: 1.2 });
    },
    shots: [
      // ===== S10 · the conference room =====
      { at: 0, name: 'conference: the projector lens, the beam through dust', draw(c, st, lt) {
          projectorShot(c, lt, { x: 760, y: 590, zoom: lerp(1.62, 1.54, st / 3.4) });
        }, post: { vig: 0.48 } },
      { at: 3.4, name: 'conference: numbers on the wall, heads in the beam', draw(c, st, lt) {
          projectorShot(c, lt, { zoom: 1.0 + st * 0.008 });
        }, post: { vig: 0.45 } },
      { at: 7.0, name: 'table: Daniel fields questions at the far end', draw(c, st, lt) {
          tableShot(c, st, lt, { cam: { zoom: 1.0 + st * 0.004 }, reflectDaniel: true, pose: t => pose(t, [
            [7.0, { head: { turn: -0.15, nod: 0.25 }, armR: 'relaxed' }],
            [7.8, { head: { turn: 0.18, nod: 0.05 }, armR: { pose: 'hold', dx: 0.16, dy: 0.04, dz: -0.06 } }],
            [9.2, { head: { turn: 0.24, nod: 0.02 }, armR: { pose: 'hold', dx: 0.2, dy: 0.02, dz: -0.04 } }],
            [10.4, { head: { turn: -0.12, nod: 0.12 }, armR: 'relaxed' }]]) });
        } },
      { at: 10.6, name: 'table: closer; he turns a page without looking at his watch', draw(c, st, lt) {
          const a = office().table.anchors.daniel;
          tableShot(c, st, lt, { cam: { x: a.x, y: a.y - 300, zoom: 1.55 + st * 0.01 },
            turn: t => seg(t, 11.35, 11.95, E.inOutSine),
            pose: t => pose(t, [
              [10.6, { head: { turn: -0.12, nod: 0.12 }, armR: 'relaxed', face: 'tired' }],
              [11.2, { head: { turn: 0, nod: 0.5 }, armR: { pose: 'hold', dx: -0.18, dy: 0.08, dz: 0.02 }, face: 'down' }],
              [12.0, { head: { turn: 0, nod: 0.45 }, armR: { pose: 'hold', dx: -0.04, dy: 0.06 }, face: 'down' }],
              [12.6, { head: { turn: 0.15, nod: 0.08 }, armR: 'relaxed', face: 'tired' }],
              [13.6, { head: { turn: 0.22, nod: 0.05 }, armR: 'relaxed', face: 'tired' }]]) });
        } },
      { at: 14.0, name: 'conference: pens move, heads nod in the beam', draw(c, st, lt) {
          projectorShot(c, lt + 3, { x: 1040, y: 560, zoom: 1.32 + st * 0.01 });
        }, post: { vig: 0.45 } },
      { at: 16.4, name: 'table: someone opens the window; the heat pours in; shut', draw(c, st, lt) {
          const w = lt < 17.0 ? 0 : lt < 18.3 ? seg(lt, 17.0, 17.25, E.outCubic) : 1 - seg(lt, 18.3, 18.5, E.inCubic);
          tableShot(c, st, lt, { window: w, cam: { zoom: 1.02 }, reflectDaniel: true, pose: t => pose(t, [
            [16.4, { head: { turn: 0.1, nod: 0.08 }, armR: 'relaxed' }], [17.1, { head: { turn: -0.32, nod: -0.05 }, armR: 'relaxed', face: 'squint' }],
            [18.4, { head: { turn: -0.3, nod: 0.0 }, armR: 'relaxed', face: 'squint' }], [19.0, { head: { turn: 0.05, nod: 0.15 }, armR: 'relaxed', face: 'tired' }]]) });
        } },
      { at: 20.0, name: 'print: the wall clock in its glass, 10:18 to 11:43', draw(c, st, lt) {
          const v = office().print; c.camera({ x: 1000, y: 520, zoom: 1.0 + st * 0.008 });
          v.back(c, lt, {}); v.front(c, lt, { time: key(st, [[0.4, 618], [5.0, 703, 'inOutSine']]) });
        } },
      // ===== S11 · the kitchenette =====
      { at: 25.6, name: 'kitchenette: the coffee machine stutters; a phone starts to ring', draw(c, st, lt) {
          kitchenShot(c, st, lt, { stutter: lt < 27.4, ring: lt > 27.0, cam: { zoom: 1.0 + st * 0.006 }, daniel: { head: { nod: 0.15, turn: lt > 27.2 ? 0.25 : 0 } } });
        } },
      { at: 28.0, name: 'phone: someone\'s phone ringing face up on the table', draw(c, st, lt) {
          const v = office().phone; c.camera({ zoom: 1.0 + st * 0.01 });
          v.back(c, lt, {}); v.front(c, lt, { ring: lt < 30.2 });
        } },
      { at: 30.4, name: 'insert: his hand into the bag\'s outside pocket closes on nothing', draw(c, st) { pocketInsert(c, st); } },
      { at: 33.4, name: 'kitchenette, closer: his shirt pocket, his trouser pocket, back to the bag', draw(c, st, lt) {
          const d = kt(-0.3, 1.4), chest = [d.at[0] - 0.13 * d.scale, d.at[1] - 1.27 * d.scale], bag = ktp(BAG.x + 0.06, 1.12, BAG.z);
          kitchenShot(c, st, lt, { cam: { x: d.at[0] - 120, y: d.at[1] - 640, zoom: 1.32 + st * 0.012 },
            daniel: pose(lt, [
              [33.4, { armL: 'relaxed', head: { nod: 0.35, turn: 0 }, face: 'tired', lean: 0 }],
              [33.6, { armL: { to: chest, depth: 0.12, palm: 'in' }, head: { nod: 0.45, turn: 0.1 }, face: 'tired', lean: 0 }],
              [33.8, { armL: { to: [chest[0] + 6, chest[1] + 14], depth: 0.12, palm: 'in' }, head: { nod: 0.45, turn: 0.1 }, face: 'tired', lean: 0 }],
              [34.25, { armL: 'pocket', head: { nod: 0.5, turn: 0.2 }, face: 'tired', lean: 0 }],
              [34.85, { armL: { to: bag, depth: 0.3 }, head: { nod: 0.4, turn: -0.15 }, face: 'tired', lean: 0.3 }],
              [35.1, { armL: { to: bag, depth: 0.3 }, head: { nod: 0.3, turn: -0.15 }, face: 'blank', lean: 0.3 }]]) });
        } },
      { at: 35.1, name: 'microwave: his blank, ridiculous second', draw(c, st, lt) {
          microwaveShot(c, lt, (g, R) => RIG.face(g, 'daniel', Object.assign({ at: [R.x, R.y - 10], size: 470, view: 'front', face: 'blank', head: { nod: lerp(0.15, 0.02, seg(lt, 35.1, 35.6)) }, breath: breath(lt) }, DAN), { light: R.light }),
            { x: 760, y: 540, zoom: 1.08 + st * 0.07 });
        }, post: { vig: 0.5 } },
      { at: FLASH_AT, name: 'FLASH: the morning, the phone charging beside the kettle (Q02)', draw(c, st) { flash(c, st); } },
      { at: FLASH_END, name: 'microwave: he exhales through his nose', draw(c, st, lt) {
          microwaveShot(c, lt, (g, R) => {
            const P = pose(lt, [[37.4, { face: 'blank', head: { nod: 0.02 } }], [37.9, { face: 'blank', lid: 0.55, head: { nod: 0.2 }, tight: 0.4 }],
              [38.7, { face: 'tired', lid: 0.45, head: { nod: 0.15, turn: -0.08 }, tight: 0.5 }], [39.2, { face: 'tired', head: { nod: 0.12, turn: 0.08 }, smile: -0.05 }], [39.8, { face: 'tired', head: { nod: 0.1, turn: 0 } }]]);
            RIG.face(g, 'daniel', Object.assign({ at: [R.x, R.y - 10], size: 470, view: 'front', breath: breath(lt) }, DAN, P), { light: R.light });
          }, { x: 760, y: 540, zoom: 1.2 - st * 0.02 });
        }, post: { vig: 0.5 } },
      // ===== Priya =====
      { at: 40.0, name: 'kitchenette: Priya appears with a fresh mug', draw(c, st, lt) {
          const p = priyaWalk(lt, 40.1, 42.4, [0.95, 0.35], [0.2, 1.9]), turned = lt > 42.2;
          kitchenShot(c, st, lt, { cam: { zoom: 1.0 + st * 0.004 },
            priya: Object.assign(p, { view: turned ? 'profile' : 'threeBack', facing: -1, hold: { r: 'cup' }, armR: 'mug', face: 'warm', head: { turn: turned ? 0 : 0.2 } }),
            daniel: { head: { nod: lt > 41.0 ? 0.05 : 0.2, turn: lt > 41.0 ? 0.55 : 0 }, face: lt > 41.6 ? 'tired' : 'blank' } });
        } },
      { at: 43.8, name: 'kitchenette, closer: "Left my phone at home"', draw(c, st, lt) {
          const d = kt(-0.3, 1.4);
          kitchenShot(c, st, lt, { cam: { x: d.at[0] + 140, y: d.at[1] - 760, zoom: 1.5 + st * 0.008 },
            priya: Object.assign(kt(0.2, 1.9), { body: 'stand', view: 'profile', facing: -1, hold: { r: 'cup' }, armR: 'mug', face: 'warm', outfit: 'office' }),
            daniel: Object.assign({ view: 'three', yaw: 62, facing: 1, face: 'tired' }, pose(lt, [
              [43.8, { head: { turn: 0.25, nod: 0.12 }, armR: 'relaxed', smile: 0.05 }],
              [44.6, { head: { turn: 0.32, nod: 0.05 }, armR: { pose: 'hold', dx: 0.05, dz: 0.05 }, smile: 0.15 }],
              [46.4, { head: { turn: 0.3, nod: 0.1 }, armR: { pose: 'hold', dx: 0.08, dz: 0.02 }, smile: 0.2 }],
              [47.8, { head: { turn: 0.28, nod: 0.1 }, armR: 'relaxed', smile: 0.12 }]])) });
        } },
      { at: 48.4, name: 'kitchenette, closer: Priya, "Need to borrow mine?"', draw(c, st, lt) {
          const p = kt(0.2, 1.9);
          kitchenShot(c, st, lt, { cam: { x: p.at[0] - 60, y: p.at[1] - 640, zoom: 1.5 + st * 0.008 },
            priya: Object.assign(p, { body: 'stand', outfit: 'office', view: 'three', yaw: -64, facing: 1, face: 'warm', hold: { l: 'cup', r: 'phone' } }, pose(lt, [
              [48.4, { armL: 'mug', armR: 'relaxed', head: { turn: -0.05, tilt: 0.05 } }],
              [49.0, { armL: 'mug', armR: { pose: 'phone', dz: 0.1 }, head: { turn: -0.1, tilt: 0.1 } }],
              [50.8, { armL: 'mug', armR: { pose: 'phone', dz: 0.12 }, head: { turn: -0.12, tilt: 0.08 } }]])),
            daniel: { view: 'three', yaw: 62, facing: 1, head: { turn: 0.3, nod: 0.1 } } });
        } },
      { at: 51.0, name: 'microwave: "I know exactly where it is"', draw(c, st, lt) {
          microwaveShot(c, lt, (g, R) => {
            RIG.face(g, 'priya', { at: [R.x + 560, R.y + 30], size: 330, view: 'three', facing: -1, face: 'warm', head: { turn: 0.15 }, outfit: 'office' }, { light: R.light, exposure: 0.85 });
            const P = pose(lt, [[51.0, { face: 'tired', head: { turn: 0.18, nod: 0.08 }, smile: 0.1 }], [52.2, { face: 'tired', head: { turn: 0.05, nod: 0.12 }, smile: 0.2 }],
              [53.6, { face: 'smile', head: { turn: 0.12, nod: 0.1 }, smile: 0.35 }], [55.0, { face: 'smile', head: { turn: 0.1, nod: 0.1 }, smile: 0.3 }]]);
            RIG.face(g, 'daniel', Object.assign({ at: [R.x - 40, R.y - 10], size: 470, view: 'front', breath: breath(lt) }, DAN, P), { light: R.light });
          }, { x: 860, y: 520, zoom: 1.12 + st * 0.01 });
        }, post: { vig: 0.48 } },
      { at: 55.0, name: 'kitchenette: he almost laughs. One daft mistake. Priya goes', draw(c, st, lt) {
          const p = priyaWalk(lt, 55.4, 57.6, [0.2, 1.9], [1.05, 0.25]), cup = ktp(-0.76, 0.96, 1.0);
          kitchenShot(c, st, lt, { cam: { zoom: 1.02 + st * 0.004 },
            priya: Object.assign(p, { view: lt > 55.4 ? 'three' : 'profile', facing: lt > 55.4 ? 1 : -1, hold: { r: 'cup' }, armR: 'mug', face: 'warm' }),
            daniel: Object.assign({ face: 'smile' }, pose(lt, [[55.0, { head: { turn: 0.5, nod: 0.1 }, smile: 0.25, lid: 0.4, armL: 'relaxed' }], [55.6, { head: { turn: 0.3, nod: 0.25, tilt: -0.08 }, smile: 0.45, lid: 0.7, armL: 'relaxed' }],
              [56.4, { head: { turn: -0.1, nod: 0.25 }, smile: 0.3, lid: 0.4, armL: { to: cup, depth: 0.25 } }], [57.2, { head: { turn: 0, nod: 0.18 }, smile: 0.15, armL: 'mug', hold: { l: 'cup' } }]])) });
        } },
      // ===== the window: the bright, hot day, held behind glass =====
      { at: 58.0, name: 'window: the hot day held behind glass (V.O.)', draw(c, st, lt) {
          const v = office().window; c.camera({ x: 960, y: 600, zoom: 1.0 + st * 0.0045 });
          v.back(c, lt, {}); v.front(c, lt, {});
          // the wall below the sill in shade: a calm, darker band for the V.O.
          c.reset(); c.g.drawImage(c.cache('Q08|win|band', bg => { bg.fillStyle = LC.lin(bg, 0, 840, 0, H, [[0, '#0B1112', 0], [0.5, '#0B1112', 0.3], [1, '#0B1112', 0.55]]); bg.fillRect(0, 840, W, 240); }), 0, 0);
        }, post: { vig: 0.42 } },
    ],
  });
})();
