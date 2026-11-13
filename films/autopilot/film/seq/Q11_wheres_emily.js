/* AUTOPILOT · Q11 · WHERE'S EMILY? (84 s) · S19–S22, A075–A101, L040–L049
   EXT. DANIEL'S HOUSE - EVENING: home; Sarah in the porch, warm, until she looks past him. The realisation reaches his face.
   EXT. NURSERY - DUSK: the painted wall in focus now, the silent playground, the boarded door and its notice: the realisation
   without words, the thin ringing. The flash cuts: the morning's own images (FILM.drawShot). He turns to his car; the dark
   rear window gives him back only himself. He runs.
   RESTRAINT: Emily is never shown here except in the flash cuts of the mirror moment (Q05), as the screenplay asks. The inside
   of the car is never visible, not even a sliver, not even in a reflection: its glass only ever gives back the sky.
   Sets: SETS.house (arrive, drive, porch, reverse, wing), SETS.nursery (arrive, building, playground, entrance, boarded,
   notice, carpark, window), SETS.car (the car itself), and one local view: the porch glass seen from inside (Sarah's side). */
(function () {
  'use strict';
  const { W, H } = OTM;
  const clamp = OTM.clamp, lerp = OTM.lerp, mix = OTM.mix, rgba = OTM.rgba;
  const seg = FILM.seg, twos = FILM.twos, ease = FILM.ease;
  const HV = () => SETS.house.views, NV = () => SETS.nursery.views;
  const cache = (c, k, fn, w, h) => c.cache('Q11|' + k, fn, w, h);

  // ===============================================================================================================
  // THE FLASH CUTS (A091-A097): the morning's own images, drawn by their sequences with FILM.drawShot.
  // [sequence, its local time at the cut, how long we hold it]. Each flash runs on in real time from its start.
  // A sequence that is not built yet is drawn by a stand-in from its set (standIn below), so the cut is never empty.
  // ===============================================================================================================
  // Times: as the authors of Q02, Q05, Q06 and Q07 checked them through FILM.drawShot (Q02: C1 charging 19.6-24.9, clean for
  // this flash at 22.0-23.4; asleep and breathing green after 24.9). The last field is a fragment of the shot's name: if the
  // shot found at that time is not the expected image (a sequence re-timed), the flash falls back to its set stand-in.
  const FLASH = {
    phone:  ['Q02', 22.0, 0.85, 'C1'],          // A091 a phone plugged in beside the kettle: the green charging icon (C1)
    sun:    ['Q05', 31.2, 0.80, 'turns away'],  // A092 Emily turning her face away from the bad sun (the mirror, close)
    shade:  ['Q05', 40.4, 0.80, 'shade'],       // A093 her head disappearing behind the driver's seat, into the headrest's shade
    wall:   ['Q06', 22.4, 0.80, 'wall'],        // A094 the nursery's painted wall slipping past the passenger window, out of focus
    coffee: ['Q06', 18.8, 0.80, 'sleeve'],      // A095 Daniel wiping coffee from his sleeve, keeping the wheel straight
    office: ['Q07', 5.6, 0.80, 'space'],        // A096 his car pulling into the OFFICE car park
    beep:   ['Q07', 13.45, 0.95, 'BEEP'],       // A097 the small, friendly BEEP of the doors locking (Q07's beep is at 13.4)
  };
  const FLASH_ORDER = ['phone', 'sun', 'shade', 'wall', 'coffee', 'office', 'beep'];
  const FLASH_AT = 62.2;
  const FLASH_T = (() => { let t = FLASH_AT; const o = {}; FLASH_ORDER.forEach(n => { o[n] = t; t += FLASH[n][2]; }); o.end = t; return o; })();
  function flash(c, name, st) {
    const [id, t0, , expect] = FLASH[name], seq = FILM.lib[id];
    if (seq) { const sh = seq.shots.filter(x => x.at <= t0 + st).pop();
      if (sh && (!expect || (sh.name || '').indexOf(expect) >= 0)) { const p = FILM.drawShot(c, id, t0 + st); if (p) return p; }
      else FILM.warn('Q11 flash ' + name + ': ' + id + ' at ' + t0 + ' is "' + (sh && sh.name) + '", not the expected image; drawing the stand-in'); }
    return standIn[name](c, t0 + st) || {};
  }
  // the mirror moment as the car set's POV shows it (C2's camera), Emily drawn into the mirror's own layer
  function mirrorStandIn(c, t, which) {
    const v = SETS.car.views.pov, turn = which === 'turn';
    const s = { tod: 'morning', tilt: 0, mirror: 'cabin', inMirror: (g, M) => {
      const p = turn ? { at: M.anchors.headTurn, face: 'squint', eyes: 'squint', side: 0.15, head: { turn: -0.5, nod: 0.12, tilt: -0.14 } }
        : { at: [lerp(M.anchors.headShade[0], M.anchors.headGone[0], seg(t, 39.6, 40.6)), M.anchors.headShade[1]], face: 'sleepy', side: 0.8, head: { turn: -0.2, nod: 0.15, tilt: 0.42 } };
      RIG.face(g, 'emily', Object.assign({ size: 190, view: 'front', body: 'carseat', harness: true, holdR: 'rabbit', armR: 'hug', armL: 'hug', facing: -1 }, p),
        { light: { x: 80, y: 120, color: '#FFF4DE', back: 0.45 }, mirror: true, mirrorX: 500 }); } };
    c.camera({ x: 905, y: 560, zoom: 1.3 }); v.back(c, t, s); v.front(c, t, s); c.reset(); return {};
  }
  const standIn = {
    phone(c, t) { const v = SETS.kitchen.views.counter, s = { tod: 'morning', screen: 'charging' }; v.back(c, t, s); v.front(c, t, s); },
    sun(c, t) { return mirrorStandIn(c, t, 'turn'); },
    shade(c, t) { return mirrorStandIn(c, t, 'shade'); },
    wall(c, t) { const v = SETS.roads.views.passenger, s = { tod: 'morning', travel: 4 + t * 9 }; v.back(c, t, s); v.front(c, t, s); },
    // the wheel close (the car set's view): one hand keeps it straight at ten to two, the other thumb wipes the cuff
    coffee(c, t) {
      const v = SETS.car.views.wheel, s = { tod: 'morning', travel: t * 9 }; v.back(c, t, s); const A = v.anchors, L = v.light || { x: 200, y: -300, color: '#FFF1D8' };
      RIG.hand(c.g, 'daniel', { at: [A.rim11[0] - 0.05 * A.ppm, A.rim11[1] + 0.13 * A.ppm], size: 0.19 * A.ppm, pose: 'wheel', view: 'back', rot: -70, sleeve: 'day' }, { light: Object.assign({ back: 0.3 }, L) });
      RIG.hand(c.g, 'daniel', { at: [A.sleeve[0] + 0.02 * A.ppm, A.sleeve[1] - 0.05 * A.ppm], size: 0.19 * A.ppm, pose: 'wipe', view: 'side', rot: -40 + 10 * Math.sin(t * 9), roll: -30, side: 'L', sleeve: 'day' }, { light: Object.assign({ back: 0.3 }, L) });
      v.front(c, t, s);
    },
    office(c, t) { const v = SETS.carpark.views.arrival; v.back(c, t, { pull: clamp(0.35 + (t - 6) * 0.25, 0, 1), engine: 1 }); v.front(c, t, {}); },
    beep(c, t) { const v = SETS.carpark.views.space, s = { tod: 'morning', blink: SETS.car.blink(t, 13.4) }; v.back(c, t, s); v.front(c, t, s); },
  };

  // ===============================================================================================================
  // THE HANDHELD DRIFT: from "Where's Emily?" (10.6) a faint drift at 0.5 Hz, 1 px growing to 2 px by the end (Q12 takes it
  // on). A tiny zoom keeps the drifting frame's edges covered (the nursery's caches are full frame, the house's have margin).
  // ===============================================================================================================
  const DRIFT0 = 10.6;
  const driftAmp = lt => lt < DRIFT0 ? 0 : ease.inOutSine(seg(lt, DRIFT0, DRIFT0 + 1.8)) + seg(lt, DRIFT0, 84);
  function camera(c, lt, o) {
    o = o || {}; const a = driftAmp(lt), s = FILM.shake(lt, a, 0.5, 11);
    c.camera({ x: o.x == null ? W / 2 : o.x, y: o.y == null ? H / 2 : o.y, zoom: (o.zoom || 1) * (1 + (2 * a + 1.5) / 1080), dx: s.dx, dy: s.dy });
  }
  // Daniel's 0.25 Hz breath (3 px), and a gentler one for Sarah
  const breath = (t, hz) => (twos(t) * (hz || 0.25)) % 1;
  // a pose from keys [[t, pose], ...] on twos (strings snap at the segment's midpoint; missing fields carry over)
  const poseAt = (t, keys) => RIG.key(twos(t), keys);

  // ===============================================================================================================
  // 0-5 · ARRIVE (A075): through the windscreen, onto the gravel. The air has finally begun to cool. Sarah waits in the lit porch.
  // ===============================================================================================================
  const SARAH_PORCH = [1.2, 0.3, 8.3];                 // her feet on the porch floor, house metres
  const sarahLightFrom = (x, y, k) => ({ x: x + 0.15 * k, y: y - 2.6 * k, color: '#E8A45E', back: 0.78 });
  function shotArrive(c, st, lt) {
    // the car rolls up the drive and comes to rest by 3.4 s (parked, the set's world is one cached layer)
    const v = HV().arrive, u = seg(st, 0, 3.4), ap = u >= 1 ? 1 : lerp(0.32, 1, ease.outCubic(u)), s = { tod: 'evening', approach: ap };
    camera(c, lt); v.back(c, lt, s);
    const cam = v.camAt(ap), f = cam.p(SARAH_PORCH[0], SARAH_PORCH[1], SARAH_PORCH[2]), k = cam.f / Math.max(0.5, f[2]);
    RIG.draw(c.g, 'sarah', { at: [f[0], f[1]], scale: k, view: 'front', yaw: -12, face: 'warm', smile: 0.25, armR: 'relaxed', armL: { hand: [0.02, -0.18, 0.12] }, head: { turn: 0.06, nod: 0.04, tilt: 0.03 }, weight: 0.3, breath: breath(lt, 0.22) },
      { light: sarahLightFrom(f[0], f[1], k), ambient: '#2A3340', ambientK: 0.16 });
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // 5-8.6 · THE DRIVE, wide (A076): Daniel steps out of the driver's door on the far side, his head and shoulders over the roof;
  // the door shuts; he comes round the back of the car. Sarah in the porch, small and warm, behind its glass.
  // ===============================================================================================================
  const DRV = { door: [0.15, 0.55, 1.75, 2.05], rise: [0.45, 1.3], walk: [2.05, 3.6] };
  function shotDrive(c, st, lt) {
    const v = HV().drive, s = { tod: 'evening' }, A = v.anchors, cam = v.cam, t = twos(st);
    camera(c, lt); v.back(c, lt, s);
    // Daniel: (house metres) out at the driver's door, then along the car's far side toward its tail, toward us
    const rise = ease.outCubic(seg(t, DRV.rise[0], DRV.rise[1])), wk = seg(t, DRV.walk[0], DRV.walk[1]);
    const z = lerp(5.45, 3.35, ease.inOutSine(wk)), x = lerp(4.82, 4.95, wk), p = cam.p(x, 0, z), k = cam.f / p[2];
    const walking = wk > 0 && wk < 1, ph = (5.45 - z) / 1.22;
    RIG.draw(c.g, 'daniel', { at: [p[0], p[1] + (1 - rise) * 0.55 * k], scale: k, view: walking || wk >= 1 ? 'front' : 'threeBack', yaw: walking || wk >= 1 ? -14 : undefined, facing: -1,
      body: walking ? 'walk' : 'stand', phase: ph % 1, lean: (1 - rise) * 1.1, face: 'tired', head: { nod: 0.12, turn: wk > 0 ? -0.2 : 0.35, tilt: 0 }, outfit: 'day', collar: 'crooked', breath: breath(lt), armR: walking ? 'auto' : 'relaxed', hold: { r: 'keys' } },
      { light: { x: 1000, y: 120, color: '#F2A65E', back: 0.82 }, ambient: '#2A3040', ambientK: 0.3, exposure: 0.85 });
    // the car; its far (driver's) door is hidden by the body from here, so it is left shut: the sound carries it
    SETS.car.exterior(c.g, { cam, at: v.car.at, heading: 0, tod: 'evening', sun: v.sun(s), em: c.em, t: lt });
    RIG.draw(c.g, 'sarah', { at: A.sarahInPorch, scale: A.sarahPxPerM, view: 'front', face: 'warm', armR: 'relaxed', armL: 'relaxed', head: { turn: 0.12, nod: 0.04, tilt: 0.03 }, weight: 0.12, breath: breath(lt, 0.22) },
      { light: sarahLightFrom(A.sarahInPorch[0], A.sarahInPorch[1], A.sarahPxPerM), ambient: '#2A3340', ambientK: 0.14 });
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // 8.6-12.6 and 24-26 · SARAH behind the porch glass (A076, L040, L044): ordinary, even warm, until she looks past him.
  // Then "Daniel--", and the porch door opens as she comes out after him.
  // ===============================================================================================================
  const SARAH_KEYS = [
    [8.6, { face: 'warm', smile: 0.62, squint: 0.4, lid: 0.22, gaze: [0.1, 0], open: 0.02, browIn: 0.15, head: { turn: 0.06, nod: 0.06, tilt: 0.06 }, weight: 0.12 }],
    [9.6, { face: 'warm', smile: 0.58, squint: 0.38, lid: 0.2, gaze: [0.12, 0], open: 0.02, browIn: 0.15, head: { turn: 0.08, nod: 0.06, tilt: 0.06 }, weight: 0.12 }],
    [10.2, { face: 'past', smile: 0.08, squint: 0, lid: 0.04, gaze: [0.9, 0.04], open: 0.04, browIn: 0.3, head: { turn: 0.38, nod: 0.0, tilt: 0.0 }, weight: 0.06 }],
    [10.6, { face: 'past', smile: 0, squint: 0, lid: 0.04, gaze: [0.9, 0.02], open: 0.04, browIn: 0.38, head: { turn: 0.42, nod: -0.02, tilt: 0 }, weight: 0.04 }],
    [11.9, { face: 'past', smile: -0.05, lid: 0.04, gaze: [0.4, 0.0], open: 0.05, browIn: 0.55, brow: 0.45, head: { turn: 0.12, nod: -0.04, tilt: 0 }, weight: 0 }],
    [12.6, { face: 'past', smile: -0.08, lid: 0.04, gaze: [0.3, 0.0], open: 0.05, browIn: 0.6, brow: 0.45, head: { turn: 0.1, nod: -0.04, tilt: 0 }, weight: 0 }],
    [24.0, { face: 'past', smile: -0.2, lid: 0.02, gaze: [0.5, 0.05], open: 0.08, browIn: 0.9, brow: 0.5, head: { turn: 0.2, nod: -0.04, tilt: 0 }, weight: 0 }],
    [25.0, { face: 'past', smile: -0.25, lid: 0.02, gaze: [0.75, 0.05], open: 0.12, browIn: 1.0, brow: 0.55, head: { turn: 0.32, nod: -0.06, tilt: 0 }, weight: -0.08 }],
  ];
  const SARAH_SAYS = [[10.6, 11.5], [24.6, 25.2]];       // her mouth while her lines are on screen (type only)
  function sarahPose(lt, A) {
    const p = poseAt(lt, SARAH_KEYS), t = twos(lt);
    const talk = SARAH_SAYS.some(([a, b]) => t >= a && t < b) ? 0.08 + 0.12 * Math.abs(Math.sin(t * 9.4)) : 0;
    const go = ease.inOutSine(seg(t, 24.7, 25.6));
    return Object.assign({}, p, { at: [A.sarahFeet[0] - go * 0.12 * A.sarahPxPerM, A.sarahFeet[1]], scale: A.sarahPxPerM, view: 'front', open: (p.open || 0) + talk, breath: breath(lt, 0.22),
      armR: go > 0.01 ? { to: [A.doorHandle[0] + 18, A.doorHandle[1] + 4], palm: 'in' } : 'relaxed', armL: 'relaxed' });
  }
  // closer than the set's framing: a slow push on her face while she looks past him; wider again for "Daniel--" and the door
  function shotPorch(c, st, lt) {
    const v = HV().porch, A = v.anchors, s = { tod: 'evening', door: lt > 25 ? 0.6 * ease.inOutSine(seg(lt, 25.2, 26.0)) : 0 };
    const first = lt < 20, u = seg(st, 0, c.shotDur);
    camera(c, lt, first ? { x: A.sarahHead[0] - 20, y: 520, zoom: lerp(1.3, 1.42, ease.inOutSine(u)) } : { x: 1080, y: 560, zoom: 1.22 });
    v.back(c, lt, s);
    // the hall lamp behind her rims her warm; the dusky sky in front of the porch gives her face a soft cool fill
    RIG.draw(c.g, 'sarah', sarahPose(lt, A), { light: { x: v.light.x, y: v.light.y, color: v.light.color, back: 0.48 }, ambient: '#5A6474', ambientK: 0.12, exposure: 1.08 });
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // 12.6-24 · THE PORCH GLASS FROM INSIDE (local view): Sarah's side. Through the glazed door, Daniel stopped on the gravel by
  // the car; his keys hang from one finger. "What?" "Emily. Where is she?" His face drains. Then, closer: "The nursery..."
  // The glass gives back the warm hall behind her and her own dark shape; the street beyond is soft. The car behind him is
  // out of focus and its glass only gives back the dusky sky (interior: false). House metres, as film/sets/house.js.
  // ===============================================================================================================
  const PO = (() => {
    const EYE = [1.12, 1.6, 8.3], DAN = [2.25, 0, 4.75];
    const FR = { M: { f: 2000, aim: [2.5, 1.15, 4.75], blurFar: 10, blurCar: 4 }, C: { f: 5200, aim: [2.42, 1.54, 4.75], blurFar: 24, blurCar: 13 } };
    const camOf = fr => { const F = FR[fr], dx = F.aim[0] - EYE[0], dy = F.aim[1] - EYE[1], dz = F.aim[2] - EYE[2];
      return LC.camera({ x: EYE[0], y: EYE[1], z: EYE[2], yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)), f: F.f, cx: W / 2, cy: H / 2 }); };
    const cams = { M: camOf('M'), C: camOf('C') };
    const poly = (g, cam, pts, fill) => { const q = pts.map(p => cam.p(p[0], p[1], p[2])); if (q.some(v => v[2] < 0.08)) return; g.fillStyle = fill; g.beginPath(); q.forEach((v, i) => i ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1])); g.closePath(); g.fill(); };
    // the street beyond the glass: the houses opposite (their fronts in our row's shadow, their roofs and chimneys catching the
    // last copper, their west windows giving back the bright sky, a few lit from inside), the road, our low wall, the drive
    function far(g, cam) {
      g.fillStyle = LC.lin(g, 0, -300, 0, 700, [[0, '#222838'], [0.55, '#383A4E'], [1, '#5C4E5C']]); g.fillRect(-200, -200, W + 400, H + 400);
      const R = OTM.rng('Q11-opposite');
      for (let i = -3; i < 5; i++) {
        const x0 = -6 + i * 8.6, x1 = x0 + 7.4, zf = -16, eave = 5.3, ridge = 8.1, hip = 1.6;
        poly(g, cam, [[x0 - 0.2, eave, zf + 0.3], [x1 + 0.2, eave, zf + 0.3], [x1 - hip, ridge, zf - 3.2], [x0 + hip, ridge, zf - 3.2]], '#2C2428');
        poly(g, cam, [[x0 + hip + 0.6, ridge - 0.5, zf - 2.8], [x1 - hip - 0.6, ridge - 0.5, zf - 2.8], [x1 - hip, ridge, zf - 3.2], [x0 + hip, ridge, zf - 3.2]], '#B8704A');   // copper along the ridge
        const ch = x0 + (R() > 0.5 ? 1.2 : x1 - x0 - 1.8); poly(g, cam, [[ch, ridge - 1, zf - 3], [ch + 0.6, ridge - 1, zf - 3], [ch + 0.6, ridge + 1.0, zf - 3], [ch, ridge + 1.0, zf - 3]], '#4A3430');
        poly(g, cam, [[ch + 0.36, ridge - 0.6, zf - 3.02], [ch + 0.6, ridge - 0.6, zf - 3.02], [ch + 0.6, ridge + 1.0, zf - 3.02], [ch + 0.36, ridge + 1.0, zf - 3.02]], '#D08250');
        poly(g, cam, [[x0, 0, zf], [x1, 0, zf], [x1, eave, zf], [x0, eave, zf]], '#3E2E2E');
        poly(g, cam, [[x0, eave - 0.9, zf + 0.01], [x1, eave - 0.9, zf + 0.01], [x1, eave, zf + 0.01], [x0, eave, zf + 0.01]], '#6E4A3E');   // the top of the wall catching the light
        [[0.8, 2.2], [4.6, 6.6]].forEach(([a, b], w) => {
          const up = [[x0 + a, 3.2, zf + 0.02], [x0 + b, 3.2, zf + 0.02], [x0 + b, 4.5, zf + 0.02], [x0 + a, 4.5, zf + 0.02]];
          poly(g, cam, up, R() > 0.6 ? '#9C6A54' : '#4A4250');                                                             // west windows: a little of the sky
          const lo = [[x0 + a, 0.9, zf + 0.02], [x0 + b, 0.9, zf + 0.02], [x0 + b, 2.2, zf + 0.02], [x0 + a, 2.2, zf + 0.02]];
          poly(g, cam, lo, R() > 0.8 ? '#C8955E' : '#26242E');                                                             // the odd one lit from inside
        });
        poly(g, cam, [[x0 + 3.0, 0, zf + 0.02], [x0 + 3.9, 0, zf + 0.02], [x0 + 3.9, 2.1, zf + 0.02], [x0 + 3.0, 2.1, zf + 0.02]], '#1E1A20');
      }
      // their gardens and the far pavement, the road, our pavement, a lamp post not yet lit
      poly(g, cam, [[-40, 0, -16], [40, 0, -16], [40, 0, -11.5], [-40, 0, -11.5]], '#2A2C26');
      poly(g, cam, [[-40, 0.9, -11.6], [40, 0.9, -11.6], [40, 0, -11.6], [-40, 0, -11.6]], '#262A22');                       // a low hedge along their fronts
      poly(g, cam, [[-40, 0, -11.5], [40, 0, -11.5], [40, 0, -9.5], [-40, 0, -9.5]], '#4A4650');
      poly(g, cam, [[-40, 0, -9.5], [40, 0, -9.5], [40, 0, -2.5], [-40, 0, -2.5]], '#2A2A30');
      poly(g, cam, [[-40, 0, -2.5], [40, 0, -2.5], [40, 0, 0], [-40, 0, 0]], '#4A4652');
      poly(g, cam, [[4.2, 0, -2.0], [4.36, 0, -2.0], [4.36, 5.6, -2.0], [4.2, 5.6, -2.0]], '#1C1A20');
      poly(g, cam, [[4.2, 5.5, -2.0], [5.3, 5.5, -2.0], [5.3, 5.62, -2.0], [4.2, 5.62, -2.0]], '#1C1A20');
      // our side: the low brick wall, the drive's gravel, the lawn, the hedge along the drive's far side
      poly(g, cam, [[-3.2, 0, 0.3], [2.05, 0, 0.3], [2.05, 0, 7.6], [-3.2, 0, 7.6]], '#4C4C34');
      poly(g, cam, [[2.05, 0, 0.3], [5.7, 0, 0.3], [5.7, 0, 7.6], [2.05, 0, 7.6]], '#7C766E');
      poly(g, cam, [[-3.2, 0, 0], [2.05, 0, 0], [2.05, 0.62, 0], [-3.2, 0.62, 0]], '#5A3E36');
      poly(g, cam, [[-3.2, 0.62, 0], [2.05, 0.62, 0], [2.05, 0.68, 0.1], [-3.2, 0.68, 0.1]], '#7A5A4E');
      poly(g, cam, [[5.7, 0, 0], [6.4, 0, 0], [6.4, 1.8, 0], [5.7, 1.8, 0]], '#202A22');
      poly(g, cam, [[5.7, 0, 0], [5.7, 0, 8.0], [5.7, 1.85, 8.0], [5.7, 1.8, 0]], '#283228');
      poly(g, cam, [[5.7, 1.8, 0], [5.7, 1.85, 8.0], [6.4, 1.85, 8.0], [6.4, 1.8, 0]], '#38443A');
    }
    function layer(c, fr) {
      return cache(c, 'po|' + fr, g => {
        const cam = cams[fr], F = FR[fr];
        const a = LC.layer(); far(a, cam);
        g.drawImage(LC.blurred(a.canvas, F.blurFar), 0, 0);
        // the car, its tail toward the street: soft, close behind him; its glass gives back only the dusky sky
        const b = LC.layer();
        if (window.SETS && SETS.car && SETS.car.exterior) SETS.car.exterior(b, { cam, at: [3.75, 0, 5.05], heading: 0, tod: 'dusk', reflect: 'dusk', interior: false, sun: [0.55, 0.18, 0.82], rim: 0.4, reflectStrength: 0.9 });
        g.drawImage(LC.blurred(b.canvas, F.blurCar, false), 0, 0);
        // the shade of the house over the drive, deepening toward the porch
        g.fillStyle = LC.lin(g, 0, 0, 0, H, [[0, '#101418', 0.0], [0.7, '#101418', 0.12], [1, '#101418', 0.32]]); g.fillRect(0, 0, W, H);
      });
    }
    // the pane: the warm hall behind the camera given back by the glass, Sarah's own dark shape cutting into it, a soft
    // glazing bar at the edge, dust lit warm. One cached layer per framing, laid over Daniel.
    function pane(c, fr) {
      return cache(c, 'pane|' + fr, g => {
        const C = fr === 'C', w = LC.layer();
        // the hall behind her, given back by the glass: a warm wash, the open front door's bright upright, the lamp
        w.fillStyle = LC.rad(w, 1640, 160, 0, 1150, [[0, '#F0B070', 0.4], [0.45, '#D89058', 0.17], [1, '#D89058', 0.04]]); w.fillRect(0, 0, W, H);
        const dx0 = C ? 1560 : 1600, dw = C ? 520 : 300;
        w.fillStyle = LC.lin(w, dx0, 0, dx0 + dw, 0, [[0, '#FFD8A0', 0], [0.2, '#FFD8A0', 0.2], [0.8, '#FFD8A0', 0.2], [1, '#FFD8A0', 0]]); w.fillRect(dx0, -40, dw, H + 80);
        w.fillStyle = LC.rad(w, 1760, 120, 0, C ? 260 : 130, [[0, '#FFE6B8', 0.55], [0.4, '#FFD49A', 0.2], [1, '#FFD49A', 0]]); w.fillRect(0, 0, W, H);
        // her own reflection: a dark head and shoulders against the bright doorway (she is lit from behind), soft: nearer than he is
        const sh = LC.layer(); sh.fillStyle = '#000';
        const hx = C ? 1990 : 1915, hy = C ? 300 : 360, hs = C ? 2.1 : 1.15;
        sh.beginPath(); sh.ellipse(hx, hy, 74 * hs, 96 * hs, 0.06, 0, Math.PI * 2); sh.fill();
        sh.beginPath(); sh.moveTo(hx - 70 * hs, hy + 80 * hs); sh.bezierCurveTo(hx - 120 * hs, hy + 150 * hs, hx - 230 * hs, hy + 170 * hs, hx - 260 * hs, hy + 300 * hs); sh.lineTo(hx - 280 * hs, H + 60);
        sh.lineTo(hx + 300 * hs, H + 60); sh.lineTo(hx + 280 * hs, hy + 300 * hs); sh.bezierCurveTo(hx + 250 * hs, hy + 170 * hs, hx + 130 * hs, hy + 150 * hs, hx + 70 * hs, hy + 80 * hs); sh.closePath(); sh.fill();
        w.globalCompositeOperation = 'destination-out'; w.globalAlpha = 0.8; w.drawImage(LC.blurred(sh.canvas, C ? 50 : 26, false), 0, 0); w.globalAlpha = 1; w.globalCompositeOperation = 'source-over';
        g.globalCompositeOperation = 'screen'; g.drawImage(w.canvas, 0, 0);
        LC.glare(g, null, { x: 900, y: 420, angle: -1.1, color: '#FFE6C8', bands: [{ d: -260, w: 160, a: 0.035 }, { d: -180, w: 18, a: 0.05 }, { d: 340, w: 220, a: 0.025 }] });
        LC.specks(g, null, { x: 0, y: 0, w: W, h: H }, 'Q11porch' + fr, { n: C ? 120 : 260, color: '#FFD8A8', rMin: C ? 1.6 : 0.6, rMax: C ? 4 : 1.5, aMin: 0.04, aMax: 0.22, scratch: 0.06, near: { x: 1600, y: 150, r: 900 } });
        g.globalCompositeOperation = 'source-over';
        // the door's glazing bar at the left edge, soft and very near; the timber is dark, a warm edge from the hall
        const bar = LC.layer(); bar.fillStyle = '#14100E'; bar.fillRect(-60, -40, C ? 150 : 96, H + 80); bar.fillStyle = 'rgba(214,150,96,0.35)'; bar.fillRect(C ? 86 : 32, -40, 6, H + 80);
        g.drawImage(LC.blurred(bar.canvas, C ? 26 : 14, false), 0, 0);
      });
    }
    const groundAt = fr => { const q = cams[fr].p(DAN[0], 0, DAN[2]); return { x: q[0], y: q[1], k: cams[fr].f / q[2] }; };
    // the porch's light falls off down his body: it pools on his face and shoulders, and the bottom of the frame stays dark for the type
    function falloff(c, fr) { return cache(c, 'fall|' + fr, g => { g.fillStyle = LC.lin(g, 0, fr === 'C' ? 640 : 700, 0, H, [[0, '#0C0E12', 0], [0.55, '#0C0E12', 0.38], [1, '#0C0E12', 0.62]]); g.fillRect(0, 0, W, H); }); }
    return { cams, layer, pane, groundAt, falloff, light: { x: 900, y: -260, color: '#EDB272', back: 0.18 } };
  })();
  // Daniel's face through the scene: incomprehension, then the drain; his speech; the turn away at the end
  const DAN_KEYS = [
    [12.6, { face: 'blank', lid: 0.2, brow: 0.32, browIn: 0.2, browKnit: 0.0, smile: 0.0, open: 0.05, gaze: [0, 0.02], head: { nod: 0.04, turn: 0, tilt: 0.02 } }],
    [13.3, { face: 'blank', lid: 0.12, brow: 0.42, browIn: 0.25, browKnit: 0.1, smile: 0.0, open: 0.06, gaze: [0, 0.02], head: { nod: 0.0, turn: 0.02, tilt: 0.03 } }],
    [15.2, { face: 'blank', lid: 0.14, brow: 0.3, browIn: 0.35, browKnit: 0.35, smile: -0.04, open: 0.05, gaze: [0, 0.0], head: { nod: 0.02, turn: 0.02, tilt: 0.02 } }],
    [16.4, { face: 'blank', lid: 0.1, brow: 0.38, browIn: 0.5, browKnit: 0.2, smile: -0.1, open: 0.08, gaze: [0, 0.0], head: { nod: 0.0, turn: 0, tilt: 0.0 } }],
    [18.2, { face: 'drained', lid: 0.36, brow: 0.1, browIn: 0.95, browKnit: 0.0, smile: -0.4, open: 0.12, gaze: [0, -0.3], head: { nod: 0.14, turn: 0, tilt: -0.02 } }],
    [19.4, { face: 'drained', lid: 0.42, brow: 0.05, browIn: 1.0, browKnit: 0.0, smile: -0.42, open: 0.12, gaze: [0.05, -0.45], head: { nod: 0.2, turn: 0.04, tilt: -0.02 } }],
    [21.4, { face: 'drained', lid: 0.3, brow: 0.12, browIn: 1.0, browKnit: 0.0, smile: -0.42, open: 0.12, gaze: [0, -0.1], head: { nod: 0.12, turn: 0.02, tilt: 0 } }],
    [23.3, { face: 'drained', lid: 0.24, brow: 0.2, browIn: 1.0, browKnit: 0.0, smile: -0.45, open: 0.14, gaze: [0, 0.0], head: { nod: 0.06, turn: 0, tilt: 0 } }],
    [23.95, { face: 'drained', lid: 0.3, brow: 0.2, browIn: 0.9, browKnit: 0.0, smile: -0.45, open: 0.12, gaze: [-0.7, 0.0], head: { nod: 0.08, turn: -0.5, tilt: 0 } }],
  ];
  const DAN_SAYS = [[13.4, 13.8], [19.6, 23.2]];
  function danielFace(lt) {
    const p = poseAt(lt, DAN_KEYS), t = twos(lt);
    const talk = DAN_SAYS.some(([a, b]) => t >= a && t < b) ? 0.06 + 0.16 * Math.abs(Math.sin(t * 8.3 + Math.sin(t * 3.1))) : 0;
    p.open = (p.open || 0) + talk; return p;
  }
  // the colour leaving his face: a slow grade toward a cold grey as it drains (subtle: the lids, brows and mouth carry it)
  const drainK = lt => ease.inOutSine(seg(lt, 16.2, 19.4));
  function shotPorchOut(c, st, lt, fr) {
    camera(c, lt);
    c.g.drawImage(PO.layer(c, fr), 0, 0);
    const p = danielFace(lt), dk = drainK(lt), G = PO.groundAt(fr);
    const opts = { light: PO.light, ambient: mix('#2C3044', '#6E7678', dk * 0.6), ambientK: 0.3 + 0.08 * dk, exposure: 0.84 - 0.06 * dk };
    RIG.draw(c.g, 'daniel', Object.assign({ at: [G.x, G.y], scale: G.k, view: 'front', yaw: 16, body: 'stand', outfit: 'day', collar: 'crooked', breath: breath(lt), weight: 0.15,
      armR: 'down', armL: 'relaxed', hold: { r: 'keys' } }, p), opts);
    c.g.drawImage(PO.falloff(c, fr), 0, 0);
    c.g.drawImage(PO.pane(c, fr), 0, 0);
  }

  // ===============================================================================================================
  // 26-32 · AWAY (A079): the engine roars awake; he reverses out. Sarah runs down the steps and the drive after the car, small
  // in the windscreen; then the wing mirror holds the house, the lit porch, and her at the end of the drive, receding.
  // ===============================================================================================================
  // her run, house metres and sequence time: out of the porch, down the step, down the drive after the car
  // (she has just pushed the porch door open: she is outside it, on the step, as the reverse begins)
  const SARAH_RUN = [[26.0, [1.25, 0.3, 7.6]], [26.35, [1.28, 0.3, 7.5]], [26.75, [1.32, 0.0, 7.05]], [27.7, [2.3, 0, 5.4]], [28.7, [2.55, 0, 2.6]], [29.4, [2.62, 0, 1.0]], [30.2, [2.65, 0, 0.45]]];
  const sarahAt = t => FILM.key(t, SARAH_RUN.map(([tt, p], i) => [tt, p, i ? 'linear' : undefined]));
  function sarahRunPose(t, k, p) {
    const moving = t > 26.05 && t < 30.0, d = (() => { let s = 0; for (let i = 1; i < SARAH_RUN.length; i++) { const [t0, a] = SARAH_RUN[i - 1], [t1, b] = SARAH_RUN[i]; const u = clamp((t - t0) / (t1 - t0), 0, 1); s += u * Math.hypot(b[0] - a[0], b[2] - a[2]); } return s; })();
    return { at: [p[0], p[1]], scale: k, view: 'front', yaw: -10, body: moving ? 'run' : 'stand', phase: (d / 2.0) % 1, face: 'past', lid: 0.04, browIn: 0.9, open: 0.08, head: { nod: -0.02, turn: 0, tilt: 0 }, armR: moving ? 'auto' : 'relaxed', armL: moving ? 'auto' : 'relaxed' };
  }
  // the windscreen's glass as the house set's cabin frames it (the dash below, the pillars either side)
  const SCREEN = (() => { const p = new Path2D(); p.moveTo(70, 150); p.lineTo(1690, 150); p.lineTo(1880, 820); p.lineTo(-40, 820); p.closePath(); return p; })();
  function shotReverse(c, st, lt) {
    const v = HV().reverse, b = ease.inOutSine(seg(st, 0.35, 3.6)), s = { tod: 'evening', back: b };
    camera(c, lt); v.back(c, lt, s); v.front(c, lt, s);
    // she is outside the porch, in front of its glass, so she is drawn over the set's front layer, inside the windscreen
    const t = twos(lt), w = sarahAt(t), cam = v.camAt(1 - b), q = cam.p(w[0], w[1], w[2]), k = cam.f / Math.max(0.5, q[2]);
    c.g.save(); c.g.clip(SCREEN);
    RIG.draw(c.g, 'sarah', sarahRunPose(t, k, q), { light: { x: q[0] + 0.3 * k, y: q[1] - 2.4 * k, color: '#E8A45E', back: 0.8 }, ambient: '#2A3340', ambientK: 0.24, exposure: 0.9 });
    c.g.restore();
  }
  function shotWing(c, st, lt) {
    const v = HV().wing, s = { tod: 'evening', away: 0.24 + 0.32 * seg(st, 0, 2.4) };
    camera(c, lt); v.back(c, lt, s);
    const t = twos(lt);
    v.inGlass(c, s, (g, cam) => { const w = sarahAt(t), f = cam.p(w[0], 0, w[2]), k = cam.f / Math.max(0.5, f[2]);
      RIG.draw(g, 'sarah', sarahRunPose(t, k, f), { light: { x: f[0] + 0.4 * k, y: f[1] - 2.4 * k, color: '#E89A5E', back: 0.75 }, ambient: '#2A3340', ambientK: 0.2 }); });
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // 32-42 · THE NURSERY (A080, A081): the painted wall slides into his passenger window and stops, in focus now and drained by
  // the evening; the low brick building; the silent playground, the swings' long shadows.
  // ===============================================================================================================
  function shotArriveNursery(c, st, lt) {
    const k = ease.outCubic(seg(st, 0.15, 2.75)), v = NV().arrive, s = { tod: 'evening', slide: 9 * (1 - k), blur: 1 - k, dip: Math.sin(k * Math.PI) * 0.6 };
    camera(c, lt); v.back(c, lt, s); v.front(c, lt, s);
  }
  function shotBuilding(c, st, lt) { const v = NV().building, s = { tod: 'evening' }; camera(c, lt); v.back(c, lt, s); v.front(c, lt, s); }
  function shotPlayground(c, st, lt) { const v = NV().playground, s = { tod: 'evening' }; camera(c, lt); v.back(c, lt, s); v.front(c, lt, s); }

  // ===============================================================================================================
  // 42-48 · THE MAIN ENTRANCE (A082, L045, A083): he hurries in from behind the camera, straightening his collar, rehearsing an
  // apology; he slows; he stops, 1.1 m from the boarded door.
  // ===============================================================================================================
  const ENT = { t0: 42.0, t1: 45.3, u0: 11.75, u1: 12.35, d0: 3.85, d1: 1.1 };
  function shotEntrance(c, st, lt) {
    const v = NV().entrance, a = v.at({ tod: 'evening' }), t = twos(lt);
    camera(c, lt); v.back(c, lt, { tod: 'evening' });
    const u = ease.outQuad(seg(t, ENT.t0, ENT.t1)), d = lerp(ENT.d0, ENT.d1, u), uu = lerp(ENT.u0, ENT.u1, u), G = v.ground(uu, d);
    const moving = t < ENT.t1 - 0.05, ph = ((ENT.d0 - d) / 1.42) % 1, collar = t < 43.9;
    RIG.draw(c.g, 'daniel', { at: [G.x, G.y], scale: G.k, view: 'back', yaw: 176, body: moving ? 'hurry' : 'stand', phase: ph, outfit: 'day', collar: t < 43.4 ? 'crooked' : 'straight',
      armR: collar ? 'collar' : moving ? 'auto' : 'relaxed', armL: moving ? 'auto' : 'relaxed', head: { nod: moving ? 0.1 : -0.12, turn: 0, tilt: 0 }, breath: breath(lt) },
      { light: { x: a.light.x, y: a.light.y, color: a.light.color, back: 0.55 }, ambient: '#2E3446', ambientK: 0.22 });
    v.front(c, lt, { tod: 'evening' });
  }

  // ===============================================================================================================
  // 48-62.2 · THE DOOR, THE NOTICE (A084-A090): the plywood, the scratched lock, the notice; the INSERT (its words clean);
  // then the sleeve's sheen rises and holds his face, a dark head over the words. A low, thin ringing. "No."
  // ===============================================================================================================
  function shotBoarded(c, st, lt) {
    const v = NV().boarded, u = ease.inOutSine(seg(st, 0.2, 3.7));
    camera(c, lt, { x: W / 2, y: lerp(628, 522, u), zoom: 1.2 });
    v.back(c, lt, { tod: 'evening' }); v.front(c, lt, { tod: 'evening' });
  }
  // the notice sits a little high in the frame, so the bottom band under it is plywood (dark enough for "No.")
  const NOTE = { sheen: [56.0, 58.8], push: [52.0, 62.2] };
  // his face as the sleeve gives it back: a dark head (RIG silhouette, rimmed from the sun on his right), drawn once and cached
  function noticeFace(c, a) {
    return cache(c, 'noticeFace', g => { g.translate(W / 2 - a.face[0], H / 2 - a.face[1]);
      RIG.face(g, 'daniel', { at: a.face, size: 0.3 * a.k, view: 'front', face: 'blank', head: { nod: 0.08, turn: 0, tilt: 0 } }, { mode: 'silhouette', ink: '#120E12', light: { x: a.light.x, y: a.light.y, color: a.light.color, back: 0.7 } }); }, W, H);
  }
  function shotNotice(c, st, lt) {
    const v = NV().notice, t = twos(lt), push = ease.inOutSine(seg(lt, NOTE.push[0], NOTE.push[1]));
    camera(c, lt, { x: W / 2 + 6, y: lerp(572, 600, push), zoom: lerp(1.04, 1.1, push) });
    const sheen = lerp(0.2, 1, ease.inOutSine(seg(lt, NOTE.sheen[0], NOTE.sheen[1]))), rise = ease.outCubic(seg(t, NOTE.sheen[0] - 0.2, NOTE.sheen[1]));
    const s = { tod: 'evening', sheen, reflect: lt < NOTE.sheen[0] - 0.2 ? null : (g, a) => { const img = noticeFace(c, a); g.save(); g.globalAlpha = rise; g.drawImage(img, a.face[0] - W / 2 + (1 - rise) * 150, a.face[1] - H / 2 + (1 - rise) * 36); g.restore(); } };
    v.back(c, lt, s); v.front(c, lt, s);
  }

  // ===============================================================================================================
  // 68-84 · HIS CAR (A098-A101): he turns, slowly, toward it; the dark rear passenger window gives him back only himself;
  // "Emily?" No answer. He runs.
  // ===============================================================================================================
  const PARK = { at: [7.25, 0.42], turn: [68.25, 70.9], run0: 82.2 };
  function parkLight(v) { return { x: v.light.x, y: v.light.y, color: v.light.color, back: 0.72 }; }
  const PARK_OPTS = v => ({ light: parkLight(v), ambient: '#262C3C', ambientK: 0.32, exposure: 0.8 });
  function shotTurn(c, st, lt) {
    const v = NV().carpark, t = twos(lt);
    camera(c, lt); v.back(c, lt, {});
    const G = v.ground(PARK.at[0], PARK.at[1]), u = ease.inOutSine(seg(t, PARK.turn[0], PARK.turn[1]));
    RIG.draw(c.g, 'daniel', { at: [G.x, G.y], scale: G.k, yaw: lerp(8, 192, u), facing: -1, body: 'stand', outfit: 'day', collar: 'straight', face: 'drained', lid: lerp(0.5, 0.2, u), gaze: [0, lerp(-0.4, 0, u)],
      head: { nod: lerp(0.35, 0.02, u), turn: 0, tilt: 0 }, armR: 'relaxed', armL: 'relaxed', breath: breath(lt), weight: lerp(0.2, -0.2, u) }, PARK_OPTS(v));
    v.front(c, lt, {});
  }
  const WIN = { dist: [[72, 6.4], [80.4, 6.4], [82, 5.9, 'inQuad']], call: [74.6, 75.3] };
  function shotWindow(c, st, lt) {
    const v = NV().window, t = twos(lt), dist = FILM.key(t, WIN.dist);
    const calling = t >= WIN.call[0] && t < WIN.call[1];
    const s = { dist, reflect: (g, a) => RIG.draw(g, 'daniel', { at: [a.reflection.x, a.reflection.y], scale: a.reflection.k, view: 'front', body: 'stand', outfit: 'day', collar: 'straight', face: 'drained',
      lid: calling ? 0.12 : 0.3, open: calling ? 0.32 : 0.08, head: { nod: calling ? -0.06 : 0.06, turn: 0, tilt: 0 }, armR: 'relaxed', armL: 'relaxed', breath: breath(lt), weight: 0.1 },
      { light: { x: a.light.x, y: a.light.y, color: a.light.color, back: 0.6 } }) };
    camera(c, lt); v.back(c, lt, s); v.front(c, lt, s);
  }
  function shotRun(c, st, lt) {
    const v = NV().carpark, t = twos(lt);
    camera(c, lt); v.back(c, lt, {});
    const r = Math.max(0, t - PARK.run0), d = r < 1.1 ? 2.2 * r * r : 2.66 + 4.84 * (r - 1.1);   // he bolts: 0 to 4.8 m/s in 1.1 s
    const dir = [1.3 - PARK.at[0], -0.9 - PARK.at[1]], L = Math.hypot(dir[0], dir[1]), x = PARK.at[0] + dir[0] / L * d, z = PARK.at[1] + dir[1] / L * d;
    const G = v.ground(x, z), moving = r > 0;
    RIG.draw(c.g, 'daniel', { at: [G.x, G.y], scale: G.k, yaw: 192, facing: -1, body: moving ? 'run' : 'stand', phase: (d / 2.1) % 1, outfit: 'day', collar: 'straight', face: 'drained',
      head: { nod: -0.02, turn: 0, tilt: 0 }, armR: moving ? 'auto' : 'relaxed', armL: moving ? 'auto' : 'relaxed', lean: moving ? 0.25 : 0 }, PARK_OPTS(v));
    v.front(c, lt, {});
  }

  // ===============================================================================================================
  const shots = [
    { at: 0, name: 'arrive: home, through the windscreen; the gravel', post: { vig: 0.42 }, draw(c, st, lt) { shotArrive(c, st, lt); } },
    { at: 5, name: 'drive: he steps out; Sarah in the lit porch', post: { vig: 0.42 }, draw(c, st, lt) { shotDrive(c, st, lt); } },
    { at: 8.6, name: 'porch: Sarah, warm, until she looks past him', post: { vig: 0.42 }, draw(c, st, lt) { shotPorch(c, st, lt); } },
    { at: 12.6, name: 'porch glass, from inside: he stops; the keys', post: { vig: 0.42 }, draw(c, st, lt) { shotPorchOut(c, st, lt, 'M'); } },
    { at: 18.4, name: 'porch glass, close: his face drains', post: { vig: 0.45 }, draw(c, st, lt) { shotPorchOut(c, st, lt, 'C'); } },
    { at: 24.0, name: 'porch: "Daniel--"; she comes after him', post: { vig: 0.42 }, draw(c, st, lt) { shotPorch(c, st, lt); } },
    { at: 26.0, name: 'reverse: the engine; Sarah down the steps', post: { vig: 0.42 }, draw(c, st, lt) { shotReverse(c, st, lt); } },
    { at: 29.6, name: 'wing: Sarah at the end of the drive, receding', post: { vig: 0.42 }, draw(c, st, lt) { shotWing(c, st, lt); } },
    { at: 32.0, name: 'nursery: the painted wall slides in and stops', post: { vig: 0.42 }, draw(c, st, lt) { shotArriveNursery(c, st, lt); } },
    { at: 36.0, name: 'nursery: the low brick building', post: { vig: 0.42 }, draw(c, st, lt) { shotBuilding(c, st, lt); } },
    { at: 38.6, name: 'playground: silent', post: { vig: 0.45, halation: 0.6 }, draw(c, st, lt) { shotPlayground(c, st, lt); } },
    { at: 42.0, name: 'entrance: he hurries in, rehearsing; he stops', post: { vig: 0.42 }, draw(c, st, lt) { shotEntrance(c, st, lt); } },
    { at: 48.0, name: 'boarded: the plywood, the lock, the notice', post: { vig: 0.42 }, draw(c, st, lt) { shotBoarded(c, st, lt); } },
    { at: 52.0, name: 'notice: INSERT', post: { vig: 0.36 }, draw(c, st, lt) { shotNotice(c, st, lt); } },
    { at: 56.0, name: 'notice: his face in the sleeve\'s sheen; the ringing', post: { vig: 0.4 }, draw(c, st, lt) { shotNotice(c, st, lt); } },
  ].concat(FLASH_ORDER.map(n => ({ at: FLASH_T[n], name: 'flash: ' + n + ' (' + FLASH[n][0] + ' ' + FLASH[n][1] + ')', draw(c, st) { c.post = flash(c, n, st); } })), [
    { at: FLASH_T.end, name: 'carpark: he turns, slowly, toward his car', post: { vig: 0.45 }, draw(c, st, lt) { shotTurn(c, st, lt); } },
    { at: 72.0, name: 'window: only his own reflection', post: { vig: 0.45 }, draw(c, st, lt) { shotWindow(c, st, lt); } },
    { at: 82.0, name: 'carpark: he runs', post: { vig: 0.45 }, draw(c, st, lt) { shotRun(c, st, lt); } },
  ]);

  FILM.seq({
    id: 'Q11', title: 'Where\'s Emily?', dur: 84,
    lines: [
      { id: 'L040', at: 10.6 },                     // Sarah: Where's Emily?
      { id: 'L041', at: 13.4 },                     // Daniel: What?
      { id: 'L042', at: 15.4 },                     // Sarah: Emily. Where is she?
      { id: 'L043', at: 19.6 },                     // Daniel: The nursery. Oh, Christ. I-- I didn't pick her up.
      { id: 'L044', at: 24.6 },                     // Sarah: Daniel--
      { id: 'L045', at: 42.6 },                     // Daniel: I was caught at work. I lost track of-- No. My phone was--
      { id: 'L046', at: 60.9, until: 61.95 },       // Daniel: No.  (gone before the first flash cut)
      { id: 'L047', at: 69.0 },                     // V.O.: My phone was on the counter.
      { id: 'L048', at: 74.6 },                     // Daniel: Emily?
      { id: 'L049', at: 78.2 },                     // V.O.: My phone was on the counter. (frightened now: it runs into the run)
    ],
    sound(S) {
      // S19 · home: the evening street, a blackbird in the gardens, the far main road; the car rolls up the drive
      S.bed('evening_birds', 0, 26, { level: -46, what: 'a blackbird, far gardens; the air has begun to cool' });
      S.bed('traffic', 0, 32, { level: -48, what: 'distant, the main road' });
      S.bed('engine', 0, 4.4, { f: 31, level: -33, fo: 0.4, what: 'rolling up the drive, idling' });
      S.cue('gravel', 0.3, { level: -22, what: 'tyres crunch across the driveway gravel (A075)' });
      S.cue('handbrake', 4.2); S.cue('engine_off', 4.45); S.bed('engine_tick', 4.6, 12, { level: -50, what: 'the hot engine ticking as it cools' });
      S.cue('door_open', 5.2); S.cue('door', 5 + DRV.door[3], { level: -16, what: 'his door, shut' });
      S.cue('footsteps', 7.1, { n: 3, surface: 'gravel', what: 'round the back of the car' });
      S.cue('keys', 12.7, { level: -34, what: 'his keys, hanging from one finger, still (A077)' });
      S.cue('footsteps', 24.0, { n: 3, surface: 'gravel', pace: 'run', what: 'he is already going back to the car' });
      S.cue('door_open', 24.9); S.cue('door', 25.6, { level: -14 });
      S.cue('porch_door', 25.25, { what: 'Sarah opens the porch door' });
      S.cue('ignition', 26.15, { level: -14, what: 'the engine roars awake (A079)' });
      S.bed('engine', 26.15, 32, { f: 54, level: -25, fi: 0.15, fo: 0.3, what: 'revving, reversing hard' });
      S.cue('gravel', 26.5, { level: -18, what: 'tyres spitting gravel as he reverses' });
      S.cue('footsteps', 26.6, { n: 6, surface: 'step, then gravel', pace: 'run', what: 'Sarah down the steps and the drive' });
      S.cue('tyres', 29.4, { level: -24, what: 'into the road, pulling away' });
      // S20 · the nursery: the brakes, the engine off, the door; then almost nothing: a little air, the far road
      S.cue('brakes', 32.25, { level: -24 });
      S.bed('engine', 32, 35.2, { f: 30, level: -36, fo: 0.2 });
      S.cue('engine_off', 35.2); S.cue('door', 36.5, { level: -18 });
      S.bed('traffic', 32, 58, { level: -52, what: 'the far road, very low' });
      S.bed('playground_wind', 36, 58, { level: -52, fo: 1.5, what: 'the silence of the playground: a little air, nothing else (A081)' });
      S.cue('footsteps', ENT.t0, { n: 6, surface: 'paving', pace: 'hurry', what: 'to the main entrance; they stop (A083)' });
      // A090 · the ringing begins, though there is no sound around him; the world recedes under it
      S.bed('tinnitus', 57, 84, { f: 7400, level: -38, fi: 3, fo: 0.02, what: 'a low, thin ringing (A090); it carries on into Q12' });
      S.bed('traffic', 58, 84, { level: -60, what: 'the far road, almost gone' });
      // the flash cuts: a hard cut each; the last one is the BEEP itself, the same polite sound as Q07's
      FLASH_ORDER.forEach(n => S.cue('flash', FLASH_T[n], { what: 'flash cut: ' + n }));
      S.cue('beep', FLASH_T.beep + Math.max(0, 13.4 - FLASH.beep[1]), { n: 2, what: 'the small, friendly BEEP of the doors locking (A097), as in Q07: it lands with the cut' });
      S.cue('footsteps', PARK.run0, { n: 6, surface: 'tarmac', pace: 'run', what: 'he runs (A101)' });
    },
    shots,
  });
})();
