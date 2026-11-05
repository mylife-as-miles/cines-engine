/* SETS._rig_demo — proof sheet for film/rig.js: every pose, hold and helper on the six. Render: node tools/set.js _rig_demo 1
   Each demo is a full frame (4 s in the set player); the sheet shows each at t = 1 s. Not part of the film. */
(function () {
  const { C, W, H, S } = OTM; const R = window.RIG;
  const CAST = ['scott', 'kay', 'marina', 'christof', 'deena', 'angelo'];
  const NAME = { scott: 'Scott', kay: 'Kay', marina: 'Marina', christof: 'Christof', deena: 'Deena', angelo: 'Angelo' };
  const TC = { scott: C.tScott, kay: C.tKay, marina: C.tMarina, christof: C.tChristof, deena: C.tDeena, angelo: C.tAngelo };
  // ---- shared staging: a wall with one lamp's posterised pool, a floor line, captions ----
  function studio(c, key, o) {
    o = Object.assign({ lx: 960, ly: 260, py: 560, floor: 880, r: 1150, sy: 0.5, cols: [C.tungstenLow, C.tungstenMid, C.tungsten], k: [1, 0.68, 0.38], floorPool: true, lamp: true }, o);
    c.g.drawImage(c.cache('rigdemo:' + key, g => {
      g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
      g.save(); g.beginPath(); g.rect(0, 0, W, o.floor); g.clip();
      OTM.lightPool(g, o.lx, o.py, o.cols.map((col, i) => ({ r: o.r * o.k[i], color: i === 0 ? OTM.mix(C.ink, col, 0.7) : OTM.mix(C.ink, col, i === 1 ? 0.55 : 0.5) })), { sy: o.sy, seed: 5, rough: 2.4 });
      g.restore();
      g.fillStyle = '#0a0807'; g.fillRect(0, o.floor, W, H - o.floor);
      if (o.floorPool) { g.save(); g.beginPath(); g.rect(0, o.floor, W, H - o.floor); g.clip(); OTM.lightPool(g, o.lx, o.floor + 40, [{ r: o.r * 0.9, color: OTM.mix(C.ink, C.tungstenLow, 0.8) }, { r: o.r * 0.5, color: OTM.mix(C.ink, C.tungstenMid, 0.55) }], { sy: 0.1, seed: 9, rough: 2 }); g.restore(); }
      g.fillStyle = OTM.mix(C.ink, C.tungstenMid, 0.5); g.fillRect(0, o.floor - 1, W, 2);
      if (o.lamp) { g.fillStyle = C.ink; g.fillRect(o.lx - 2, 0, 4, o.ly - 34); g.fillStyle = C.soot2; g.fill(S().poly([[o.lx - 22, o.ly - 36], [o.lx + 22, o.ly - 36], [o.lx + 58, o.ly], [o.lx - 58, o.ly]]).path(0.4, 2)); g.fillStyle = C.tungsten; g.beginPath(); g.ellipse(o.lx, o.ly, 56, 6, 0, 0, 7); g.fill(); }
    }), 0, 0);
    if (o.lamp) { c.em.fillStyle = C.tungsten; c.em.beginPath(); c.em.ellipse(o.lx, o.ly + 6, 80, 20, 0, 0, 7); c.em.fill(); }
  }
  const cap = (g, txt, x, y, o) => OTM.text(g, txt, x, y, Object.assign({ family: 'Barlow Condensed', weight: 500, size: 22, color: C.cardPaper, tracking: 2, align: 'center', alpha: 0.62 }, o));
  const title = (g, a, b, y0) => { y0 = y0 || 52; cap(g, a, 48, y0, { align: 'left', size: 26, alpha: 0.75, tracking: 3 }); if (b) cap(g, b, 48, y0 + 32, { align: 'left', size: 20, alpha: 0.45, tracking: 1 }); };
  const nameCap = (g, id, x, y, sub) => { cap(g, NAME[id].toUpperCase(), x, y, { color: TC[id], alpha: 0.9 }); if (sub) cap(g, sub, x, y + 26, { size: 18, alpha: 0.5, tracking: 1 }); };
  const put = (c, id, spec, o) => R.draw(c.g, R.figure(id, spec), Object.assign({ em: c.em }, o));
  const LAMP = { x: 960, y: 270 };
  const ghost = (g, F, col, a) => { g.save(); g.globalAlpha = a; g.fillStyle = col; g.fill(R.path(F)); g.restore(); };
  const graph = (g, id, x, y, w, h, u, mood) => {
    g.save(); g.strokeStyle = 'rgba(239,229,208,0.18)'; g.lineWidth = 1; g.strokeRect(x, y, w, h);
    g.beginPath(); g.moveTo(x, y + h * 0.8); g.lineTo(x + w, y + h * 0.8); g.moveTo(x, y + h * 0.2); g.lineTo(x + w, y + h * 0.2); g.stroke();
    g.strokeStyle = TC[id]; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 60; i++) { const uu = i / 60, v = R.curve(id, uu, mood); const px = x + uu * w, py = y + h * 0.8 - v * h * 0.6; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
    const v = R.curve(id, u, mood); g.fillStyle = C.cardPaper; g.beginPath(); g.arc(x + u * w, y + h * 0.8 - v * h * 0.6, 4, 0, 7); g.fill(); g.restore();
  };
  const yard = (g, floor, fx) => {
    g.fillStyle = C.yardNight; g.fillRect(0, 0, W, H); g.fillStyle = C.grass; g.fillRect(0, floor, W, H - floor);
    OTM.lightPool(g, fx, floor, [{ r: 1800, color: OTM.mix(C.grass, C.fireOuter, 0.1) }, { r: 1100, color: OTM.mix(C.grass, C.fireOuter, 0.22) }], { sy: 0.2, seed: 3 });
  };
  const FIRE = OTM.mix(C.fireMid, C.fireCore, 0.18);

  SETS._rig_demo = {
    anchors: {}, light: LAMP, cams: {},
    draw(c, t) { studio(c, 'base'); },
    demos: [
      // 1 ------------------------------------------------------------------------------------------------------------
      { name: 'idle: breath + character', draw(c, t) {
        studio(c, 'base'); const g = c.g; title(g, 'IDLE  ·  BREATH 4 PX AT 0.25 HZ  ·  EACH IN CHARACTER', 'RIG.figure(id, {pose:\'idle\', t})  ·  RIG.draw(g, F, {light, falloff:true})  ·  per-part rims: head and body measured from their own centres');
        CAST.forEach((id, i) => { const x = 230 + i * 292; put(c, id, { x, y: 880, scale: 64, facing: i < 3 ? 1 : -1, pose: 'idle', t }, { light: LAMP, falloff: true }); nameCap(g, id, x, 950, ['hovers, corrects', 'unhurried, on ones', 'precise', 'expansive sway', 'snaps her head', 'loose, a flourish'][i]); });
      } },
      // 2 ------------------------------------------------------------------------------------------------------------
      { name: 'rims: kit outline vs per-part', draw(c, t) {
        studio(c, 'top', { lx: 960, ly: 140, r: 1150 }); const g = c.g; const L = { x: 960, y: 150 };
        title(g, 'RIMS  ·  LEFT: ONE CENTRE (OUTLINES)  ·  RIGHT: HEAD + BODY CENTRES, 1.7 RAD WEDGE, FALLOFF', 'RIG.draw(g, F, {light, falloff:true}): r1 = 1.5x the farthest point, outer band 0.5  ·  OTM.silhouette(..., {parts, at, spread, falloff:{r0, r1, steps, min}})');
        [['christof', 330, 1], ['deena', 620, 1], ['angelo', 1300, -1], ['marina', 1590, -1]].forEach(([id, x, f], i) => {
          const F = R.figure(id, { x, y: 880, scale: 66, facing: f, pose: 'idle', t, gesture: i % 2 ? 'expansive' : 'shrug' });
          if (i < 2) { OTM.silhouette(g, F.shape, { light: L, rimColor: C.tungsten, rimW: 3.4 }); OTM.fig.drawDetails(g, F, { light: L }); }
          else R.draw(g, F, { light: L, falloff: true, em: c.em });
        });
        cap(g, 'BEFORE', 475, 960); cap(g, 'AFTER', 1445, 960);
      } },
      // 3 ------------------------------------------------------------------------------------------------------------
      { name: 'seated: chairs, profile, 3/4, perch', draw(c, t) {
        studio(c, 'base'); const g = c.g; title(g, 'SEATED  ·  sit (profile)  ·  sit34 (three-quarter: both shoulders, the far thigh)  ·  perch (a stool)', 'RIG.chair(x, floor, scale, {facing, squash, kind})  ->  {shape, seat}   ·   RIG.figure(id, {pose, seat, floor, t})   feet IK\'d onto the floor');
        const rows = [['scott', 'sit', { N: { kind: 'bowl' } }, 1], ['kay', 'sit', { N: { kind: 'glass', fill: 0.62, lip: true } }, 1], ['marina', 'sit', { N: { kind: 'glass', fill: 0.4, drink: R.key('marina', t, [[0, 0], [0.6, 0], [1.4, 1]]) } }, 1],
          ['christof', 'sit34', { N: { kind: 'biscuit' } }, -1], ['deena', 'sit34', {}, -1], ['angelo', 'perch', { N: { kind: 'deck', mode: 'fan', open: R.key('angelo', t, [[0.2, 0.2], [1.0, 1]]) } }, -1]];
        rows.forEach(([id, pose, hold, f], i) => {
          const x = 230 + i * 292; const ch = R.chair(x, 880, 62, { facing: f, squash: pose === 'sit34' ? 0.8 : 1, kind: pose === 'perch' ? 'stool' : 'dining' });
          const seat = pose === 'perch' ? [ch.seat[0], ch.seat[1] - 50] : ch.seat;
          if (pose === 'perch') { g.fillStyle = C.ink; g.fill(S().rect(x - 60, 880 - 160, 120, 160).path(0.5, 3)); }
          OTM.silhouette(g, pose === 'perch' ? S().rect(x - 60, 880 - 162, 120, 162) : ch.shape, { light: LAMP, rimColor: C.tungstenMid, rimW: 2, seed: 4 + i, falloff: { r0: 300, r1: 1500, min: 0.5 } });
          put(c, id, { x, seat, floor: 880, scale: 62, facing: f, pose, t, hold, gesture: id === 'deena' ? 'armsFolded' : undefined }, { light: LAMP, falloff: true });
          nameCap(g, id, x, 950, [pose + ' · bowl', pose + ' · glass, lip', pose + ' · drink', pose + ' · biscuit', pose + ' · arms folded', pose + ' (stool) · deck fan'][i]);
        });
      } },
      // 4 ------------------------------------------------------------------------------------------------------------
      { name: 'holds I: phone, lighter, knife, cover, bag', draw(c, t) {
        studio(c, 'dim', { cols: [C.hoodLow, C.hoodMid, C.hood], r: 980 }); const g = c.g; const L = { x: 960, y: 260 };
        title(g, 'HOLDS I  ·  phone at the ear  ·  phoneLook  ·  lighter (strike, spark)  ·  knife (tremble)  ·  cover (both hands, throat)  ·  bag', 'spec.hold = {N: {kind, ...}, F: {...}}  ·  props are coloured paper over the ink; the hand that holds them is ink in front');
        const strike = (t % 1.2) / 1.2;
        const specs = [
          ['scott', { hold: { N: { kind: 'phone' } } }, 'phone (F02)'],
          ['marina', { hold: { N: { kind: 'phoneLook', tap: (t * 2.2) % 1 } } }, 'phoneLook, tap'],
          ['angelo', { clothes: 'none', cig: false, mood: 'drained', hold: { N: { kind: 'lighter', strike, tremble: 2 } } }, 'lighter, jacket off'],
          ['scott', { lean: 0.02, hold: { N: { kind: 'knife', tremble: 4 } } }, 'knife, shaking'],
          ['deena', { neck: -0.15, head: -0.25, hold: { N: { kind: 'cover', at: 'throat' }, F: { kind: 'cover', at: 'throat' } } }, 'cover: throat, N + F'],
          ['kay', { hold: { F: { kind: 'bag' } } }, 'bag of ice'],
        ];
        specs.forEach(([id, sp, lab], i) => { const x = 220 + i * 296; const f = i < 3 ? 1 : -1; put(c, id, Object.assign({ x, y: 880, scale: 64, facing: f, pose: 'idle', t }, sp), { light: L, color: C.hood, falloff: true }); nameCap(g, id, x, 950, lab); });
      } },
      // 5 ------------------------------------------------------------------------------------------------------------
      { name: 'holds II: deck, bottle, glass, bowl, cig, point', draw(c, t) {
        studio(c, 'base'); const g = c.g; title(g, 'HOLDS II  ·  deck (fan, square, card)  ·  bottle pouring  ·  glass by the stem  ·  bowl  ·  cig  ·  point (index out)', 'holds export world points: F.holds.N.tip (top card, bottle mouth, fingertip) for flying cards, wine streams, leader lines');
        const pour = R.key('christof', t, [[0, 0], [0.9, 1]]);
        const specs = [
          ['angelo', { hold: { N: { kind: 'deck', mode: 'fan', open: 1 } } }, 'deck fan'],
          ['angelo', { hold: { N: { kind: 'deck', mode: 'square' }, F: { kind: 'deck', mode: 'card' } } }, 'square + card'],
          ['christof', { hold: { N: { kind: 'bottle', pour } } }, 'bottle, pour'],
          ['marina', { hold: { N: { kind: 'glass', fill: 0.5 } } }, 'glass by the stem'],
          ['scott', { hold: { N: { kind: 'bowl', crisps: 10 } } }, 'bowl of crisps'],
          ['angelo', { hold: { N: { kind: 'cig' } }, cig: false }, 'cig in the fingers'],
          ['deena', { hold: { N: { kind: 'point', at: [1250, 560] } } }, 'point'],
        ];
        specs.forEach(([id, sp, lab], i) => { const x = 170 + i * 262; const f = i < 5 ? 1 : -1; put(c, id, Object.assign({ x, y: 880, scale: 62, facing: f, pose: 'idle', t }, sp), { light: LAMP, falloff: true }); nameCap(g, id, x, 950, lab); });
        g.fillStyle = C.cardPaper; g.globalAlpha = 0.6; g.beginPath(); g.arc(1250, 560, 5, 0, 7); g.fill(); g.globalAlpha = 1;
      } },
      // 6 ------------------------------------------------------------------------------------------------------------
      { name: 'linked, flat hands, a hand on a shoulder', draw(c, t) {
        studio(c, 'base'); const g = c.g; title(g, 'LINKED  ·  RIG.link(specA, side, specB, side)  ·  FLAT HAND ON A TABLE (autoLean)  ·  A HAND ON A SHOULDER', 'Marina and Scott hold hands; Deena\'s palm is planted on the table (the spine bends until it reaches: F.holds.N.reach = px short); Kay\'s hand on Scott\'s shoulder');
        const A = { id: 'marina', x: 300, y: 880, scale: 62, facing: 1, pose: 'idle', t }, B = { id: 'scott', x: 560, y: 880, scale: 62, facing: -1, pose: 'idle', t };
        const lk = R.link(A, 'N', B, 'N', { sag: 1.0 }); A.hold = { N: lk.A }; B.hold = { N: lk.B };
        put(c, 'marina', A, { light: LAMP, falloff: true }); put(c, 'scott', B, { light: LAMP, falloff: true });
        nameCap(g, 'marina', 300, 950, 'link N'); nameCap(g, 'scott', 560, 950, 'link N');
        const TY = 676; g.fillStyle = C.ink; g.fill(S().rect(870, TY, 300, 18).add(S().rect(890, TY, 16, 880 - TY)).add(S().rect(1134, TY, 16, 880 - TY)).path(0.5, 3)); g.fillStyle = C.tungsten; g.fillRect(872, TY - 2, 296, 2);
        const D = R.figure('deena', { x: 800, y: 880, scale: 62, facing: 1, pose: 'idle', t, neck: 0.1, head: 0.2, hold: { N: { kind: 'flat', at: [960, TY], view: 'edge', autoLean: true } } }); R.draw(g, D, { light: LAMP, falloff: true });
        nameCap(g, 'deena', 800, 950, 'flat · autoLean · reach ' + D.holds.N.reach.toFixed(1) + ' px short');
        const S2 = { id: 'scott', x: 1520, y: 880, scale: 62, facing: 1, pose: 'idle', t };
        const sk = R.skeleton('scott', S2).sk; const sh = sk.shoulder;
        put(c, 'kay', { x: 1405, y: 880, scale: 62, facing: 1, pose: 'idle', t, hold: { N: { kind: 'flat', at: [sh[0] - 6, sh[1] - 0.28 * 62], view: 'edge', curl: 0.45, fingers: 1 } } }, { light: LAMP, falloff: true });
        put(c, 'scott', S2, { light: LAMP, falloff: true });
        nameCap(g, 'kay', 1405, 950, 'hand on shoulder'); nameCap(g, 'scott', 1560, 950, '');
      } },
      // 7 ------------------------------------------------------------------------------------------------------------
      { name: 'gestures + phone variants', draw(c, t) {
        studio(c, 'base'); const g = c.g; title(g, 'GESTURES  ·  handOnHip  ·  handOnHipF  ·  armsFolded  ·  handsUp  ·  PHONES  ·  phoneLow (lowered, still lit)  ·  phoneOffer (held out to someone)', 'gesture: overlays the arms of any pose  ·  phoneOffer {at}: the screen faces the person it is offered to');
        const specs = [['deena', { gesture: 'handOnHip' }, 'handOnHip', 1], ['kay', { gesture: 'handOnHipF' }, 'handOnHipF', 1], ['scott', { gesture: 'armsFolded' }, 'armsFolded', 1],
          ['christof', { gesture: 'handsUp' }, 'handsUp', -1], ['scott', { hold: { N: { kind: 'phoneLow' } }, mood: null, neck: 0.25, head: 0.35 }, 'phoneLow', -1], ['marina', { hold: { N: { kind: 'phoneOffer', at: [1530, 600] } } }, 'phoneOffer', 1], ['deena', {}, '(offered to)', -1]];
        specs.forEach(([id, sp, lab], i) => { const x = 180 + i * 255 + (i === 6 ? -40 : 0); put(c, id, Object.assign({ x, y: 880, scale: 62, facing: sp.f || specs[i][3], pose: 'idle', t }, sp), { light: LAMP, falloff: true, em: c.em }); nameCap(g, id, x, 950, lab); });
      } },
      // 8 ------------------------------------------------------------------------------------------------------------
      { name: 'grass: knees up, propped (F02)', draw(c, t) {
        const g = c.g; yard(g, 760, 1700);
        title(g, 'ON THE GRASS  ·  pose:\'grass\'  ·  knees up, propped back on the far arm, palm planted (foreshortened)', 'the fire is the one light, far right: RIG.draw(g, F, {light, falloff:true}) keeps a clear crescent on every figure; Scott holds the phone to his ear');
        const L = { x: 2300, y: 300 };
        CAST.forEach((id, i) => { const x = 250 + i * 290; const sp = { x, y: 930, scale: 54, facing: -1, pose: 'grass', t }; if (id === 'scott') sp.hold = { N: 'phone' }; if (id === 'kay') sp.armN = { a: 0.9, b: 1.6 };
          put(c, id, sp, { light: L, color: FIRE, falloff: true }); nameCap(g, id, x, 1010); });
      } },
      // 9 ------------------------------------------------------------------------------------------------------------
      { name: 'walk cycle on twos', draw(c, t) {
        studio(c, 'wide', { r: 1300 }); const g = c.g; title(g, 'WALK  ·  RIG.walk(id, t, {x0, scale, facing, dist})  ·  on twos (Kay on ones)  ·  IK-planted feet, steady hip, start-up step', 'ghosts: the same walker 0.25 s and 0.5 s earlier;  ticks: its footprints (walking.prints);  Angelo drained (bottom right) walks heavy and slow');
        CAST.forEach((id, i) => {
          const row = i < 3 ? 0 : 1, col = i % 3; const y = row ? 900 : 560, x0 = 90 + col * 620, f = 1, sc = row ? 44 : 40; const mood = id === 'angelo' ? 'drained' : null; const tt = t + 0.6;
          [0.5, 0.25].forEach((dt, k) => { const wk = R.walk(id, tt - dt, { x0, scale: sc, facing: f, mood }); ghost(g, R.figure(id, Object.assign({ y, scale: sc, t: tt - dt, mood }, wk)), OTM.mix(C.ink, C.tungstenMid, 0.35), 0.35 + k * 0.2); });
          const wk = R.walk(id, tt, { x0, scale: sc, facing: f, mood }); put(c, id, Object.assign({ y, scale: sc, t: tt, mood }, wk), { light: LAMP, falloff: true });
          g.fillStyle = OTM.mix(C.ink, C.tungstenMid, 0.7); wk.walking.prints.forEach(px => g.fillRect(px - 6, y + 4, 12, 3));
          cap(g, NAME[id].toUpperCase() + (mood ? ' (drained)' : '') + '  ·  ' + R.persona(id, mood).walk.period.toFixed(2) + ' s', x0 + 200, y + 50, { color: TC[id], alpha: 0.85 });
        });
      } },
      // 10 -----------------------------------------------------------------------------------------------------------
      { name: 'run + stumble', draw(c, t) {
        const g = c.g; yard(g, 900, 1700); title(g, 'RUN  ·  RIG.run(id, t, {x0, scale, facing})  ·  flight phase, heel kick, pumping fists  ·  STUMBLE  ·  RIG.stumble(id, u)', '"Scott runs."  "He flies through the door, nearly falls down the steps"  ·  ghosts 0.12 s apart; the stumble: the toe catches, a lunge, a hand to the floor, recovery');
        const L = { x: 2100, y: 300 };
        ['scott', 'deena'].forEach((id, i) => { const y = i ? 900 : 600, x0 = 120, sc = 50;
          if (!i) { g.fillStyle = C.grass; g.fillRect(0, 600, 820, 300); g.fillStyle = OTM.mix(C.grass, C.fireOuter, 0.3); g.fillRect(0, 599, 820, 2); }
          [0.24, 0.12].forEach((dt, k) => ghost(g, R.figure(id, Object.assign({ y, scale: sc, t: t - dt }, R.run(id, t - dt, { x0, scale: sc }))), OTM.mix(C.grass, C.fireOuter, 0.35), 0.4 + 0.2 * k));
          put(c, id, Object.assign({ y, scale: sc, t }, R.run(id, t, { x0, scale: sc })), { light: L, color: FIRE, falloff: true }); cap(g, NAME[id].toUpperCase() + ' · run', 300, y + 46, { color: TC[id] }); });
        const u = Math.min(1, (t % 2.2) / 1.6); [0.42, 0.21].forEach((du, k) => { const uu = Math.max(0, u - du); ghost(g, R.figure('scott', Object.assign({ y: 900, scale: 64, t }, R.stumble('scott', uu, { x0: 1080, scale: 64 }))), OTM.mix(C.grass, C.fireOuter, 0.35), 0.35 + 0.2 * k); });
        put(c, 'scott', Object.assign({ y: 900, scale: 64, t }, R.stumble('scott', u, { x0: 1080, scale: 64 })), { light: L, color: FIRE, falloff: true }); cap(g, 'SCOTT · stumble u=' + u.toFixed(2), 1300, 950, { color: C.tScott });
      } },
      // 11 -----------------------------------------------------------------------------------------------------------
      { name: 'turns + look-at', draw(c, t) {
        studio(c, 'base'); const g = c.g;
        const gl = R.arc('christof', t, [[0, [300, 330]], [2, [1600, 300]], [4, [300, 330]]], { raw: true, arc: 0.12 });
        title(g, 'TURN  ·  RIG.turn(id, t, t0, from, to)  ·  a cut-paper flip timed by the character; slow turners pass through three-quarter  ·  LOOK  ·  heads track the glint', 'look:[x,y] (clamped to what a neck can do); the turn starts at 0.7 s: Deena snaps, Marina is exact, Kay glides, Scott hovers');
        glint(g, gl); c.em.fillStyle = C.lighterCream; c.em.beginPath(); c.em.arc(gl[0], gl[1], 20, 0, 7); c.em.fill();
        CAST.forEach((id, i) => { const x = 230 + i * 292; const tr = R.turn(id, t, 0.7, 1, -1); put(c, id, { x, y: 880, scale: 64, facing: tr.facing, squash: tr.squash, view34: tr.view34, pose: 'idle', t, look: gl }, { light: LAMP, falloff: true }); nameCap(g, id, x, 950, 'squash ' + tr.squash.toFixed(2) + (tr.view34 > 0.05 ? ' · 3/4 ' + tr.view34.toFixed(2) : '')); });
        function glint(g, p) { g.fillStyle = C.lighterCream; g.beginPath(); g.arc(p[0], p[1], 6, 0, 7); g.fill(); }
      } },
      // 12 -----------------------------------------------------------------------------------------------------------
      { name: 'kneel, crouch, legs giving way, slump', draw(c, t) {
        studio(c, 'base'); const g = c.g; title(g, 'GROUNDED POSES  ·  kneel  ·  kneelUp  ·  kneelSit  ·  crouch  ·  RIG.buckle(id, u): legs giving way  ·  slump against a counter (wall:x)', 'y is the floor: the lowest contact (sole, knee, buttock, back, head) lands on it  ·  slump sits on the buttock, heels on the floor, back on the counter');
        const bu = (t % 2) / 2;
        g.fillStyle = C.ink; g.fill(S().rect(1720, 600, 220, 282).path(0.6, 5)); g.fillStyle = C.tungstenMid; g.fillRect(1720, 598, 220, 3);
        const specs = [['angelo', { pose: 'kneel' }, 'kneel'], ['kay', { pose: 'kneelUp', gesture: 'hug' }, 'kneelUp'], ['marina', { pose: 'kneelSit' }, 'kneelSit'], ['christof', { pose: 'crouch' }, 'crouch'],
          ['scott', { pose: R.buckle('scott', bu), hold: { F: { kind: 'cover', at: 'mouth' } } }, 'buckle u=' + bu.toFixed(2)], ['deena', { pose: 'slump', wall: 1722 }, 'slump, wall']];
        specs.forEach(([id, sp, lab], i) => { const x = 230 + i * 280; put(c, id, Object.assign({ x, y: 880, scale: 64, facing: i < 3 ? 1 : -1, t }, sp), { light: LAMP, falloff: true }); nameCap(g, id, i === 5 ? 1560 : x, 950, lab); });
      } },
      // 13 -----------------------------------------------------------------------------------------------------------
      { name: 'the floor: lying, curled, jacket over', draw(c, t) {
        studio(c, 'floor', { cols: [C.hoodLow, C.hoodMid, C.hood], lx: 1100, ly: 200 }); const g = c.g; const L = { x: 1100, y: 210 };
        title(g, 'ON THE FLOOR  ·  lie (slack, on the back)  ·  lie knees:\'up\'  ·  lieFace  ·  lieCurl  ·  Angelo\'s jacket off and over her (RIG.prop.jacketOver)', 'every lying body rests on two contacts (head, hips / heels): RIG.figure(id, {pose:\'lie\', headTo, knees})  ·  clothes:\'none\'  ·  mood:\'drained\'');
        const D = R.figure('deena', { x: 980, y: 880, scale: 62, pose: 'lie', headTo: 'right', t });
        R.draw(g, D, { light: L, color: C.hoodMid, falloff: true });
        const J = R.prop.jacketOver(D); OTM.silhouette(g, J, { light: L, rimColor: C.hood, rimW: 2.2, at: D.joints.chest });
        put(c, 'angelo', { x: 1440, y: 880, scale: 62, facing: -1, pose: 'kneel', clothes: 'none', cig: false, mood: 'drained', t, look: D.joints.head }, { light: L, color: C.hood, falloff: true });
        cap(g, 'DEENA · lie, headTo right, jacket over', 980, 950, { color: C.tDeena, alpha: 0.9 }); nameCap(g, 'angelo', 1440, 950, 'kneel · drained · no jacket');
        const fl = (y, x0, x1) => { g.fillStyle = OTM.mix(C.ink, C.hoodMid, 0.5); g.fillRect(x0, y, x1 - x0, 2); };
        fl(560, 90, 560); put(c, 'christof', { x: 330, y: 560, scale: 46, pose: 'lieFace', headTo: 'right', t }, { light: L, color: C.hoodMid, falloff: true }); cap(g, 'CHRISTOF · lieFace', 320, 610, { color: C.tChristof });
        fl(740, 90, 560); put(c, 'marina', { x: 300, y: 740, scale: 46, pose: 'lie', knees: 'up', headTo: 'left', t }, { light: L, color: C.hoodMid, falloff: true }); cap(g, 'MARINA · lie, knees up (F11)', 320, 790, { color: C.tMarina });
        fl(560, 1480, 1880); put(c, 'kay', { x: 1660, y: 560, scale: 46, pose: 'lieCurl', headTo: 'left', t }, { light: L, color: C.hoodMid, falloff: true }); cap(g, 'KAY · lieCurl', 1680, 610, { color: C.tKay });
      } },
      // 14 -----------------------------------------------------------------------------------------------------------
      { name: 'two bodies: cradle, grab', draw(c, t) {
        studio(c, 'kitchen2', { cols: [C.hoodLow, C.hoodMid, C.hood], lx: 1000, ly: 160, r: 1100 }); const g = c.g; const L = { x: 1000, y: 170 };
        title(g, 'TWO BODIES  ·  RIG.cradle(\'angelo\', \'deena\', {x, y, u})  ·  "catches her before she hits the tiles"  ·  RIG.grab(specA, specB, {pull})', 'cradle: ghosts at u = 0.3, 0.6 (the catch), solid at u = 1: her head in the crook of his arm  ·  grab: Deena\'s two fists on Scott\'s shoulders, pulling him back');
        const u = Math.min(1, t / 1.0);
        [0.3, 0.6].forEach((uu, k) => { const cr = R.cradle('angelo', 'deena', { x: 560, y: 880, scale: 62, facing: 1, u: uu, t }); ghost(g, R.figure('deena', cr.B), OTM.mix(C.ink, C.hoodMid, 0.4), 0.3 + 0.15 * k); });
        const cr = R.cradle('angelo', 'deena', { x: 560, y: 880, scale: 62, facing: 1, u, t, mood: 'drained' });
        put(c, 'angelo', cr.A, { light: L, color: C.hood, falloff: true }); put(c, 'deena', cr.B, { light: L, color: C.hood, falloff: true });
        cap(g, 'ANGELO + DEENA · cradle u=' + u.toFixed(2), 700, 950, { color: C.tAngelo });
        const pull = R.key('deena', t, [[0.4, 0], [1.2, 1]]);
        const A = { id: 'deena', x: 1330, y: 880, scale: 62, facing: 1, pose: 'idle', t }, B = { id: 'scott', x: 1540, y: 880, scale: 62, facing: 1, pose: 'idle', t };
        const gr = R.grab(A, B, { pull }); put(c, 'scott', Object.assign({}, B, gr.B), { light: L, color: C.hood, falloff: true }); put(c, 'deena', Object.assign({}, A, gr.A), { light: L, color: C.hood, falloff: true });
        cap(g, 'DEENA grabs SCOTT · pull ' + pull.toFixed(2), 1440, 950, { color: C.tDeena });
      } },
      // 15 -----------------------------------------------------------------------------------------------------------
      { name: 'crawl, roll + thrown by the blast', draw(c, t) {
        const g = c.g; g.fillStyle = C.yardNight; g.fillRect(0, 0, W, H); g.fillStyle = C.grass; g.fillRect(0, 900, W, 180);
        OTM.lightPool(g, 1700, 500, [{ r: 1500, color: OTM.mix(C.yardNight, C.fireOuter, 0.25) }, { r: 900, color: OTM.mix(C.yardNight, C.fireMid, 0.4) }, { r: 420, color: OTM.mix(C.fireMid, C.fireCore, 0.4) }], { sy: 0.8, seed: 4 });
        title(g, 'THROWN  ·  RIG.thrown(id, u, {from, to, peak, spin}) (the blast, as F12)  ·  ROLL  ·  RIG.roll(id, t) "he rolls, scrambles, rolls again"  ·  CRAWL', 'thrown at u = 0.45 with two stepped echoes on twos  ·  the roll flips through a sliver at each half-turn  ·  crawlers with ghosts 0.4 s earlier');
        const L = { x: 1750, y: 480 };
        const u = 0.45; const fr = [1500, 520], to = [600, 860];
        [[0.32, C.fireOuter], [0.385, C.fireMid]].forEach(([uu, col]) => { const F = R.figure('scott', Object.assign({ scale: 70 }, R.thrown('scott', uu, { from: fr, to, peak: 160, facing: 1 }))); g.fillStyle = col; g.fill(F.shape.path(1.4, 50)); });
        put(c, 'scott', Object.assign({ scale: 70 }, R.thrown('scott', u, { from: fr, to, peak: 160, facing: 1 })), { fill: C.ink, light: L, color: C.fireCore, w: 4 });
        cap(g, 'SCOTT · thrown', 760, 650, { color: C.tScott });
        const rl = R.roll('scott', t, { x0: 1280, scale: 46, headTo: 'left' }); put(c, 'scott', Object.assign({ y: 1000, scale: 46, t }, rl), { light: L, color: FIRE, falloff: true });
        cap(g, 'SCOTT · roll (' + (rl.rolling.back ? 'back' : 'front') + ')', 1300, 1050, { color: C.tScott });
        ['angelo', 'deena'].forEach((id, i) => { const x0 = 140 + i * 420; const ck = R.crawl(id, t - 0.4, { x0, scale: 40, facing: 1 }); ghost(g, R.figure(id, Object.assign({ y: 1000, scale: 40, t: t - 0.4 }, ck)), OTM.mix(C.ink, C.grass, 0.5), 0.6);
          put(c, id, Object.assign({ y: 1000, scale: 40, t }, R.crawl(id, t, { x0, scale: 40, facing: 1 })), { light: L, color: C.fireMid, falloff: true }); cap(g, NAME[id].toUpperCase() + ' · crawl', x0 + 120, 1050, { color: TC[id] }); });
      } },
      // 16 -----------------------------------------------------------------------------------------------------------
      { name: 'character curves', draw(c, t) {
        studio(c, 'base'); const g = c.g; title(g, 'MOTION PERSONALITY  ·  RIG.key(id, t, keys)  ·  the same move, each in character', 'reach to point at the lamp from 0.3 s to 1.6 s; graphs: RIG.curve(id, u)  ·  Scott hovers and corrects, Kay glides, Marina exact, Christof sweeps, Deena snaps, Angelo flourishes');
        const u = (R.time('scott', t) - 0.3) / 1.3;
        CAST.forEach((id, i) => {
          const x = 230 + i * 292; const f = i < 3 ? 1 : -1;
          const arm = R.key(id, t, [[0.3, { a: 0.08, b: 0.25 }], [1.6, { a: 2.4, b: 0.05 }]]); const lk = R.key(id, t, [[0.3, 0], [1.6, 1]]);
          put(c, id, { x, y: 880, scale: 60, facing: f, pose: 'idle', t, idle: false, armN: Object.assign({ hand: 'index' }, arm), look: [LAMP.x, LAMP.y], lookAmt: lk }, { light: LAMP, falloff: true });
          graph(g, id, x - 90, 975, 180, 80, Math.max(0, Math.min(1, u))); nameCap(g, id, x, 952);
        });
      } },
      // 17 -----------------------------------------------------------------------------------------------------------
      { name: 'top-down: the table', draw(c, t) {
        const g = c.g; const CX = 960, CY = 560, RT = 300, RP = 400, SC = 82;
        g.fillStyle = C.ink; g.fillRect(0, 0, W, H); OTM.lightPool(g, CX, CY, [{ r: 760, color: '#1A120D' }, { r: 560, color: '#2E2016' }], { rough: 3, seed: 21 });
        const tab = S().circle(CX, CY, RT).path(1.4, 9); g.save(); g.clip(tab); OTM.lightPool(g, CX, CY, [{ r: RT + 40, color: C.tungstenLow }, { r: 240, color: C.tungstenMid }, { r: 150, color: C.tungsten }], { rough: 1.8, seed: 13 }); g.restore();
        const seat = clock => { const a = (clock / 12) * Math.PI * 2; return [CX + Math.sin(a) * RP, CY - Math.cos(a) * RP]; };
        const gap = seat(5).map((v, k) => k ? (v + CY) / 2 + 30 : (v + CX) / 2 + 20);
        const P = (clock, r) => { const a = (clock / 12) * Math.PI * 2; return [CX + Math.sin(a) * r, CY - Math.cos(a) * r]; };
        const people = [['scott', 6, { hands: [P(6.4, 230), false], handPose: ['flat', 'tuck'] }], ['kay', 8, { hands: [false, P(7.6, 240)], handPose: ['tuck', 'flat'] }], ['marina', 10, { hands: [P(10.4, 250), P(9.6, 240)], handPose: ['clasp', 'flat'] }],
          ['christof', 12, { hands: [P(0.35, 235), P(11.65, 235)], handPose: ['clasp', 'clasp'] }], ['deena', 2, { hands: [gap, P(1.6, 250)], handPose: ['point', 'flat'] }], ['angelo', 4, { deck: true, hands: [P(4.25, 270), P(3.75, 270)], handPose: ['clasp', 'clasp'] }]];
        for (let k = 0; k < 7; k++) { const p = P(5 + k * 12 / 7, 200); g.save(); g.translate(p[0], p[1]); g.rotate((5 + k * 12 / 7) / 12 * Math.PI * 2); g.fillStyle = C.cardPaper; g.fillRect(-14, -20, 28, 40); g.fillStyle = C.cardBlue; g.fillRect(-11, -17, 22, 34); g.restore(); }
        people.forEach(([id, clock, o]) => { const [x, y] = seat(clock); const dir = Math.atan2(CY - y, CX - x); const T = R.top(id, Object.assign({ x, y, scale: SC, dir, look: gap, t, foreshorten: true }, o));
          OTM.castShadow(g, T.shape, [1.03, 0, 0, 1.03, -0.03 * CX, -0.03 * CY], 0.5); R.draw(g, T, { light: { x: CX, y: CY }, w: 3 }); });
        const disc = q => { q.fillStyle = C.ink; q.beginPath(); q.arc(CX, CY, 92, 0, 7); q.fill(); q.strokeStyle = '#1A1310'; q.lineWidth = 2; q.beginPath(); q.arc(CX, CY, 62, 0, 7); q.stroke(); }; disc(g); c.before.push(disc); c.em.fillStyle = C.tungsten; c.em.globalAlpha = 0.8; c.em.beginPath(); c.em.arc(CX, CY, 150, 0, 7); c.em.fill(); c.em.globalAlpha = 1;
        title(g, 'TOP-DOWN  ·  RIG.top(id, {x, y, dir, hands, handPose:[l, r], look, deck})  ·  the locked seating, the gap at Scott\'s right', 'Scott 6, Kay 8, Marina 10, Christof 12, Deena 2, Angelo 4  ·  every head turns to the gap (5 o\'clock)  ·  \'tuck\' arms  ·  crowns rimmed only (F07)');
      } },
      // 18 -----------------------------------------------------------------------------------------------------------
      { name: 'top-down: hand circle (topLink)', letterbox: 2.0, draw(c, t) {
        const g = c.g; const CX = 1060, CY = 590, RB = 350, SC = 100;
        g.fillStyle = C.ink; g.fillRect(0, 0, W, H); OTM.lightPool(g, CX, CY, [{ r: 760, color: '#110B08' }, { r: 610, color: '#160F0B' }, { r: 500, color: '#1D140E' }], { rough: 2.6, seed: 21 });
        OTM.lightPool(g, CX, CY, [{ r: 290, color: C.tungstenLow }, { r: 230, color: C.tungstenMid }, { r: 136, color: C.tungsten }], { rough: 1.4, seed: 12 });
        const ids = ['scott', 'marina', 'deena', 'angelo']; const angs = [1.0, 2.75, 4.5, 6.25 - 0.1];
        const seats = ids.map((id, i) => { const a = angs[i]; return { id, x: CX + Math.cos(a) * RB, y: CY + Math.sin(a) * RB, dir: a + Math.PI, scale: SC }; });
        const hands = seats.map(() => [null, null]);
        for (let i = 0; i < 4; i++) { const a = seats[i], b = seats[(i + 1) % 4]; const want = [(a.x + b.x) / 2 * 0.7 + CX * 0.3, (a.y + b.y) / 2 * 0.7 + CY * 0.3]; const p = R.topLink(a, 0, b, 1, want); hands[i][0] = p; hands[(i + 1) % 4][1] = p; }
        seats.forEach((s, i) => { const T = R.top(s.id, Object.assign({}, s, { hands: hands[i], handPose: 'clasp', t, look: [CX, CY], lookAmt: 0.3, foreshorten: true })); OTM.castShadow(g, T.shape, [1.04, 0, 0, 1.04, -0.04 * CX, -0.04 * CY], 0.55);
          R.draw(g, T, { light: { x: CX, y: CY }, w: 3 }); });
        g.save(); g.fillStyle = C.ink; g.globalAlpha = 0.85; g.fillRect(0, 60, 1060, 92); g.restore();
        title(g, 'HAND CIRCLE  ·  RIG.topLink(a, hand, b, hand, want)  ·  four bodies, five places', 'each left hand finds the next person\'s right  ·  only the crowns catch the lamp (three stepped bands, short wedge); o.armRim:true adds a hairline on the arms', 100);
      } },
      // 19 -----------------------------------------------------------------------------------------------------------
      { name: 'bust + face light', letterbox: 2.0, draw(c, t) {
        const g = c.g; g.fillStyle = C.ink; g.fillRect(0, 0, W, H); OTM.lightPool(g, 620, 560, [{ r: 900, color: '#1A120D' }, { r: 640, color: '#2A1C11' }, { r: 380, color: '#3A2613' }], { sy: 0.55, seed: 2 });
        title(g, 'BUST  ·  RIG.bust(id, {waist, tilt, armL, armR, t})  ·  tilts about the waist, arms dropped, or a hand laid on a shoulder ({to, on:\'shoulder\'})', 'FACE LIGHT  ·  hold phoneLook lights the face (RIG.faceLight): a crescent on brow and nose that dies before the lips', 100);
        const BL = { x: 1500, y: 500 }; const Bs = {};
        [['deena', 190, -0.05, { armL: false }], ['angelo', 470, 0.16, { armR: false }], ['scott', 810, -0.15, {}]].forEach(([id, x, tilt, o]) => { Bs[id] = R.bust(id, Object.assign({ waist: [x, 1060], scale: 86, tilt, t }, o)); });
        Bs.marina = R.bust('marina', { waist: [1090, 1060], scale: 86, tilt: 0.04, t, armL: { to: Bs.scott.shoulderR, on: 'shoulder' } });
        ['deena', 'angelo', 'scott', 'marina'].forEach(id => R.draw(g, Bs[id], { light: BL, color: C.phoneWhite, w: 2.5, spread: 1.2, details: { ringColor: '#D4AF5E' } }));
        cap(g, 'four in the photo: waist tilts, Deena armL:false, Angelo armR:false, Marina\'s hand on Scott\'s shoulder', 640, 1000);
        ['kay', 'christof'].forEach((id, i) => { const x = 1350 + i * 330; put(c, id, { x, y: 1180, scale: 92, facing: i ? -1 : 1, pose: 'idle', t, hold: { N: { kind: 'phoneLook', tap: (t * 1.7) % 1 } } }, { light: { x: 960, y: 0 }, color: C.tungstenMid, w: 2.4 }); nameCap(g, id, x, 1000); });
      } },
      // 20 -----------------------------------------------------------------------------------------------------------
      { name: 'Deena: grip + throat (F10)', letterbox: 2.0, draw(c, t) {
        const g = c.g; studio(c, 'hood', { cols: [C.hoodLow, C.hoodMid, C.hood], lx: 1250, ly: 80, r: 900, sy: 0.9, lamp: false });
        title(g, 'DEENA  ·  pony:{grip} the ponytail yanked by a fist that is not there (the hair never stretches: the head is pulled)  ·  cover throat, N + F  ·  RIG.throat(F)', 'the arc of ember is the Extra\'s, cut through the paper; its ends turn to blood (darker than wine)', 100);
        const grip = R.key('deena', t, [[0, [1330, 420]], [0.5, [1330, 230]]]);
        const D = R.figure('deena', { x: 1270, y: 1150, anchor: 'hip', scale: 180, facing: -1, lean: 0.1, neck: -0.4, head: -0.3, t, idle: false, legN: { a: 0.75, b: 1.05 }, legF: { a: 0.45, b: 0.95 }, pony: { grip },
          hold: { N: { kind: 'cover', at: 'throat' }, F: { kind: 'cover', at: 'throat' } } });
        R.draw(g, D, { light: { x: 1250, y: 0 }, color: C.hood, w: 4, details: { hoopColor: C.hoodMid } });
        const th = R.throat(D); const k = Math.min(1, t / 0.8); const holes = c.f.markHoles(); holes.save(); holes.clip(R.path(D)); holes.fillStyle = '#fff'; holes.fill(th.crescent(0.1, 0.1 + 0.72 * k, 9).path(0.3, 5)); holes.restore();
        g.save(); g.clip(R.path(D)); g.fillStyle = C.blood; g.fill(th.crescent(0, 0.16, 9).path(0.2, 6)); g.restore();
        put(c, 'angelo', { x: 160, y: 1500, anchor: 'hip', scale: 230, facing: 1, lean: 0.2, neck: 0.16, head: 0.06, t, hold: { N: { kind: 'reach', at: D.joints.head } } }, { light: { x: 1250, y: 0 }, color: C.hoodLow, fill: '#070504', w: 3 });
      } },
      // 21 -----------------------------------------------------------------------------------------------------------
      { name: 'the oven: Christof folded (F09)', letterbox: 2.0, draw(c, t) {
        const g = c.g; g.fillStyle = C.ink; g.fillRect(0, 0, W, H); g.fillStyle = OTM.mix(C.soot, C.ink, 0.45); g.fillRect(0, 128, W, 760);
        title(g, 'THE OVEN  ·  RIG.folded(box | quad, {warp, mirror}) -> Shape: Christof folded flat, a paper doll  ·  led by its shadow on the wall', 'the same shape through RIG.homography onto the wall (fill it or OTM.castShadow it); in the cavity, the body is only ink against the oven light; Scott\'s legs give way', 100);
        // the projected shadow, raking up the wall
        const DST = [[214, 160], [1090, 300], [1112, 640], [290, 520]]; const Hm = R.homography([[0, 0], [6, 0], [6, 4], [0, 4]], DST);
        const wall = R.warp(S().rect(-0.08, -0.08, 6.16, 4.16), (x, y) => Hm(x, y)); const wP = wall.path(2.0, 8);
        g.save(); g.clip(wP); g.fillStyle = OTM.mix(C.hoodLow, C.ink, 0.62); g.fillRect(0, 0, W, H);
        OTM.lightPool(g, 680, 420, [{ r: 720, color: C.hoodLow }, { r: 560, color: C.hoodMid }, { r: 360, color: C.hood }], { sy: 0.55, rot: -0.2, rough: 3, seed: 5 });
        const shadow = R.folded(DST); const shP = shadow.path(1.8, 31); g.strokeStyle = OTM.rgba(C.ink, 0.5); g.lineWidth = 12; g.stroke(shP); g.fillStyle = OTM.mix(C.ink, C.hoodLow, 0.1); g.fill(shP); g.restore();
        // the oven: a box, its open mouth lit, the folded body inside
        const OX = 1240, OY = 520; g.fillStyle = '#0B0807'; g.fillRect(OX - 30, OY - 60, 520, 420); const mouth = { x: OX + 20, y: OY + 40, w: 420, h: 270 };
        g.fillStyle = C.hood; g.fillRect(mouth.x, mouth.y, mouth.w, mouth.h); g.fillStyle = C.hoodMid; g.fillRect(mouth.x, mouth.y + mouth.h * 0.62, mouth.w, mouth.h * 0.38);
        g.fillStyle = C.ink; g.fill(R.folded({ x: mouth.x + 6, y: mouth.y + 6, w: mouth.w - 12, h: mouth.h - 12 }).path(0.8, 9)); c.em.fillStyle = C.hood; c.em.globalAlpha = 0.5; c.em.fillRect(mouth.x, mouth.y, mouth.w, mouth.h); c.em.globalAlpha = 1;
        g.fillStyle = C.ink; g.fill(S().poly([[mouth.x - 20, mouth.y + mouth.h], [mouth.x + mouth.w + 20, mouth.y + mouth.h], [mouth.x + mouth.w + 70, mouth.y + mouth.h + 70], [mouth.x - 70, mouth.y + mouth.h + 70]]).path(0.6, 4));
        const bu = R.key('scott', t, [[0.2, 0], [1.6, 1]]);
        put(c, 'scott', { x: 1050, y: 1000, scale: 80, facing: 1, t, pose: R.buckle('scott', bu), look: [1400, 640] }, { light: { x: 1450, y: 650 }, color: C.hood, falloff: true });
        cap(g, 'SCOTT · buckle ' + bu.toFixed(2), 1050, 1010, { color: C.tScott });
      } },
      // 22 -----------------------------------------------------------------------------------------------------------
      { name: 'close-ups: clasp (F13), fan (F06)', draw(c, t) {
        const g = c.g; g.fillStyle = C.ink; g.fillRect(0, 0, W, H); OTM.lightPool(g, 600, 700, [{ r: 700, color: OTM.mix(C.grass, C.fireOuter, 0.15) }, { r: 380, color: OTM.mix(C.grass, C.fireOuter, 0.3) }], { sy: 0.5, seed: 3 });
        const K = R.cu.clasp(560, 640, 300, 0.06, 0.92); const ink = R.cu.drawClasp(g, c.f, K, { depth: Math.min(1, 0.3 + t * 0.5) });
        g.fillStyle = C.ink; g.fill(S().capsule(K.wrist[0], K.wrist[1], 40, K.wrist[0] - 300, K.wrist[1] + 20, 52).path(0.8, 4));
        OTM.silhouette(g, S().add(ink).add(S().capsule(K.wrist[0], K.wrist[1], 40, K.wrist[0] - 300, K.wrist[1] + 20, 52)), { noFill: true, light: { x: 1300, y: 300 }, rimColor: OTM.mix(C.ink, C.fireMid, 0.6), rimW: 2.5 });
        g.save(); g.beginPath(); g.rect(1060, 0, 860, H); g.clip(); g.fillStyle = C.ink; g.fillRect(1060, 0, 860, H); OTM.lightPool(g, 1480, 520, [{ r: 620, color: C.tungstenLow }, { r: 400, color: C.tungstenMid }, { r: 190, color: C.tungsten }], { sy: 0.45, seed: 6 });
        R.cu.fan(g, 1500, 1020, 1.0, { light: { x: 1480, y: 300 } }); g.restore();
        title(g, 'CLOSE-UPS  ·  RIG.cu.clasp(x, y, L, rot) + RIG.cu.drawClasp(g, f, K): his hand ink, the other only cut through the paper, its wrist charring out', 'RIG.cu.fan(g, x, y, s, {light}): long fingers round a fanned deck (right)');
      } },
      // 23 -----------------------------------------------------------------------------------------------------------
      { name: 'camera: rims under zoom + Path2D lights', draw(c, t) {
        const zoom = 1.0 + 0.6 * Math.min(1, t / 2), cam = { x: 700, y: 620, zoom, rot: 0.04 };
        c.camera(cam); studio(c, 'base'); const g = c.g;
        put(c, 'scott', { x: 560, y: 880, scale: 64, facing: 1, pose: 'idle', t, hold: { N: { kind: 'glass', fill: 0.5 } } }, { light: LAMP, falloff: true });
        put(c, 'kay', { x: 820, y: 880, scale: 64, facing: -1, pose: 'idle', t, look: [560, 420] }, { light: LAMP, falloff: true });
        // bare Path2D shapes with a point light: each is rimmed toward the lamp from its own centre (the kit used to measure from 0,0)
        [[420, 470], [700, 330], [1040, 520]].forEach(([x, y], i) => { const p2 = S().circle(x, y, 26).path(0.6, 3 + i); OTM.silhouette(g, p2, { light: LAMP, rimColor: C.cardPaper, rimW: 3 }); });
        c.reset(); title(g, 'CAMERA  ·  rims are cut in device pixels under c.camera (zoom ' + zoom.toFixed(2) + ', rot 0.04)  ·  bare Path2D + point light measured from its own centroid', 'the three discs: OTM.silhouette(g, path2D, {light:{x,y}}): each crescent faces the lamp');
      } },
      // 24 -----------------------------------------------------------------------------------------------------------
      { name: 'dialogue fixes', draw(c, t) {
        const g = c.g; g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
        title(g, 'DIALOGUE FIXES  ·  Scott\'s cut with the caret  ·  Deena points right, left, down  ·  VOICE and Dispatcher centred by default  ·  band:true', '');
        OTM.say(g, 'scott', 'I--', 160, 260, { caret: true, size: 60 }); OTM.say(g, 'scott', 'Angelo, I--', 160, 360, { caret: Math.floor(t / 0.53) % 2 === 0, size: 48 });
        const box = (x, y) => { g.fillStyle = C.cardBlue; g.fillRect(x - 14, y - 20, 28, 40); g.strokeStyle = C.cardPaper; g.lineWidth = 2; g.strokeRect(x - 14, y - 20, 28, 40); };
        box(1700, 230); OTM.say(g, 'deena', 'Who\'s that for?', 1000, 260, { pointTo: [1700, 230] });
        box(260, 470); OTM.say(g, 'deena', 'Count those.', 700, 500, { pointTo: [276, 470] });
        box(1180, 690); OTM.say(g, 'deena', 'Four.', 1100, 600, { pointTo: [1180, 670] });
        OTM.say(g, 'voice', 'Scott.', 960, 850, { frame: c.f, face: 'angelo', size: 110 }); g.strokeStyle = 'rgba(239,229,208,0.25)'; g.beginPath(); g.moveTo(960, 740); g.lineTo(960, 880); g.stroke();
        OTM.say(g, 'dispatcher', 'How many got out?', 0, 0, { band: true, timer: '00:03:24' });
        cap(g, 'x = 960 (centre line)', 960, 905);
      } },
    ],
  };
})();
