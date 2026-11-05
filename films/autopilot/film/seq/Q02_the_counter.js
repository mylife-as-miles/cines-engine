/* AUTOPILOT · Q02 · THE COUNTER (30 s) · S02, A005–A009 · kitchen (hall, pocket, counter, kettle)
   The film's key object. Daniel, in his tee and pyjamas, carries his work bag down the hall and sets it by the front door,
   which blazes amber (the east sun only ever reaches us through glass). Close on the bag: its outside pocket, open and empty.
   The phone comes down toward it, hesitates, and goes back up: not today. At the counter his hand plugs the cable in beside
   the kettle; the screen wakes with a small chime and the battery's bolt pops in green, the film's first green. His face,
   satisfied, bent in the kettle's chrome. Then C1: in the phone's black glass he climbs the stairs, back turned, and leaves
   the glass; the screen sleeps to black, the green breathing in it; the reflection holds the empty stairs and the bag by the door.
   FLASH CUTS: later sequences redraw this one with FILM.drawShot('Q02', t):
     - 19.6–24.9: C1, the phone charging beside the kettle, the cable in, the battery glyph lit green (Q08 uses 22.0–23.4);
     - 24.9–30.0: C1 held steady, the screen asleep, the green charging glyph breathing in the black glass (Q12 uses 27.0–28.5).
   Deterministic. Characters on twos (FILM.twos); camera, light and glass on ones. */
(function () {
  'use strict';
  const { W, H } = OTM, P = LC.P;
  const clamp = OTM.clamp, lerp = OTM.lerp, rgba = OTM.rgba;
  const seg = FILM.seg, key = FILM.key, tw = FILM.twos, E = FILM.ease;
  const sstep = (t, a, b) => { const u = seg(t, a, b); return u * u * (3 - 2 * u); };
  const breathOf = t => (tw(t) * 0.25) % 1;
  const KV = () => SETS.kitchen.views;

  // ---------------------------------------------------------------------------------------------------------------
  // the beats (sequence-local seconds)
  // ---------------------------------------------------------------------------------------------------------------
  const T = {
    arrive: 1.5, bagDown: 2.25,            // the hall: he reaches the door and sets the bag down
    pocket: 4.4,                           // close on the bag
    counter: 9.4, pick: 10.55, plugged: 11.62, tight: 12.0, wake0: 12.25, wake1: 14.65,
    kettle: 16.0, c1: 19.6, sleep: 24.9,
  };
  // the breath of the asleep glyph is phased so that it is at its brightest when the screen sleeps (no pop)
  const breathT = lt => lt - T.sleep + 0.2 / 0.42;

  // ===============================================================================================================
  // 0–4.4 · THE HALL: down the passage toward the blazing front door; he sets the bag down beside it. Backlit by the door.
  // ===============================================================================================================
  const HALL_X = -0.12, Z0 = 4.75, Z1 = 5.86;
  function hall(c, st, lt) {
    const v = KV().hall, cam = v.cam, g = c.g, L = v.light;
    const s = { door: 0, bag: lt >= T.bagDown };
    c.camera({ x: 960, y: 560, zoom: 1.0 + 0.0028 * st });
    v.back(c, lt, s);
    const Th = tw(lt);
    const z = lerp(Z0, Z1, seg(Th, 0, T.arrive)), walking = Th < T.arrive;
    const foot = cam.p(HALL_X, 0, z), k = cam.k(foot[2]);
    const bend = sstep(Th, T.arrive, T.bagDown) * (1 - sstep(Th, T.bagDown + 0.2, 3.3));
    const handle = cam.p(-0.5, 0.44, 6.35);
    const pose = { at: [foot[0], foot[1]], scale: k, view: 'back', yaw: 186, outfit: 'night', face: 'tired', breath: breathOf(lt),
      body: walking ? 'walk' : 'stand', phase: walking ? ((z - Z0) / 1.25 + 0.0) % 1 : 0,
      lean: 1.25 * bend + 0.12, crouch: 0.4 * bend, head: { nod: 0.25 + 0.3 * bend, turn: 0, tilt: 0 },
      holdL: 'phone', armL: walking ? 'auto' : { pose: 'hold', dx: 0, dy: 0.05, dz: 0.05 } };
    if (Th < T.bagDown) { pose.holdR = 'bag'; pose.armR = bend > 0.05 ? { to: [handle[0], handle[1] - 0.12 * k * (1 - bend)], depth: -0.1 } : 'bag'; }
    else pose.armR = bend > 0.3 ? { to: [handle[0] + 0.05 * k, handle[1] - 0.1 * k], depth: -0.1 } : 'relaxed';
    RIG.draw(g, 'daniel', pose, { light: { x: L.x, y: L.y, color: L.color, back: 0.93 }, ambient: '#0E1517', ambientK: 0.5, exposure: 0.5, detail: 0.5 });
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // 4.4–9.4 · THE POCKET: close on the bag; its outside pocket open and empty. The phone in his hand comes down toward it,
  //           hesitates over the mouth (its black glass catching the door's glow), and goes back up: not today.
  // ===============================================================================================================
  function pocket(c, st, lt) {
    const v = KV().pocket, A = v.anchors, g = c.g;
    c.camera({ x: 830, y: 700, zoom: 1.0 + 0.0042 * st });
    v.back(c, lt, {});
    const Th = tw(lt);
    if (Th > 5.3 && Th < 9.0) {
      const hov = [A.hover[0] + 34, A.hover[1] - 236];             // the wrist, with the phone hanging over the pocket's mouth
      const up = [hov[0] + 70, -560];
      const w = key(Th, [[5.3, up], [6.5, hov, 'outCubic'], [6.9, [hov[0] + 2, hov[1] + 10], 'inOutSine'], [7.5, [hov[0] - 4, hov[1] + 4], 'inOutSine'], [7.8, [hov[0] + 2, hov[1] - 6]], [8.95, [up[0] + 40, up[1]], 'inCubic']]);
      const rot = key(Th, [[5.3, 80], [6.5, 70], [7.0, 66], [7.6, 74], [8.95, 86]]), roll = key(Th, [[5.3, 30], [6.5, 40], [7.2, 46], [8.95, 30]]);
      RIG.hand(g, 'daniel', { at: w, size: 420, pose: 'phone', view: 'palm', rot, roll, sleeve: 'night', lit: false }, { light: { x: v.light.x, y: v.light.y, color: v.light.color, back: 0.7 }, ambient: '#1A1410', ambientK: 0.25 });
    }
    v.front(c, lt, {});
  }

  // ===============================================================================================================
  // 9.4–12 · THE COUNTER, WIDE (C1's camera, a little wider): the phone propped against the garden window, its black glass
  //          holding the hall; his hand picks up the loose cable and plugs it in beside the kettle.
  // ===============================================================================================================
  const WIDE = (() => { const k = 0.86; return [k, 0, 0, k, 770 - 785 * k, 610 - 728 * k]; })();
  const ap = (Tm, x, y) => [Tm[0] * x + Tm[2] * y + Tm[4], Tm[1] * x + Tm[3] * y + Tm[5]];
  const CABLE_HAND = { size: 560, pose: 'cable', obj: null, view: 'side', sleeve: 'night' };
  const _pinch = {};
  function pinchOffset(rot) {                       // where the thumb and index meet, relative to the wrist (measured once)
    const r = Math.round(rot); if (_pinch[r]) return _pinch[r];
    const g = OTM.makeCanvas(8, 8).getContext('2d'), info = RIG.hand(g, 'daniel', Object.assign({}, CABLE_HAND, { at: [0, 0], rot: r }), {});
    return (_pinch[r] = info ? [(info.thumb[0] + info.tips[0][0]) / 2, (info.thumb[1] + info.tips[0][1]) / 2] : [0, 0]);
  }
  function counterWide(c, st, lt) {
    const v = KV().counter, g = c.g, Th = tw(lt);
    const loose = ap(WIDE, 668, 846), port = ap(WIDE, 783, 729);
    let s;
    if (Th < T.pick) s = { frame: 'wide', screen: 'off', cable: 'loose' };
    else if (Th < T.plugged) {
      const u = seg(Th, T.pick, T.plugged - 0.12, 'inOutSine'), lift = Math.sin(Math.PI * u) * 70;
      const tip = [lerp(loose[0], port[0], u), lerp(loose[1], port[1] + 14, u) - lift + 14 * sstep(Th, T.plugged - 0.12, T.plugged)];
      s = { frame: 'wide', screen: 'off', plug: tip, plugAngle: lerp(-0.3, -Math.PI / 2, E.outCubic(seg(Th, T.pick, T.pick + 0.5))) };
    } else s = { frame: 'wide', screen: 'off', cable: 'plugged' };
    c.camera({ x: 960, y: 560, zoom: 1.0 + 0.0025 * st });
    v.back(c, lt, s);
    // the hand: in from the lower left, pinches the plug's boot, carries it to the port, pushes it home, lets go
    if (Th > 9.75 && Th < 12.2) {
      const rot = key(Th, [[9.8, -30], [T.pick, -38], [T.plugged - 0.3, -78], [12.2, -70]]);
      const off = pinchOffset(rot);
      let grip;
      if (Th < T.pick) grip = key(Th, [[9.8, [loose[0] - 520, loose[1] + 520]], [T.pick, [loose[0] - 4, loose[1] + 22], 'outCubic']]);
      else if (Th < T.plugged) { const ang = s.plugAngle, tp = s.plug; grip = [tp[0] - Math.cos(ang) * 16, tp[1] - Math.sin(ang) * 16]; }
      else grip = key(Th, [[T.plugged, [port[0], port[1] + 18]], [11.8, [port[0] - 6, port[1] + 30]], [12.2, [port[0] - 330, port[1] + 420], 'inCubic']]);
      RIG.hand(g, 'daniel', Object.assign({}, CABLE_HAND, { at: [grip[0] - off[0], grip[1] - off[1]], rot, curl: Th > T.plugged + 0.08 ? 0.55 : 1 }),
        { light: { x: v.light.x, y: v.light.y, color: v.light.color, back: 0.6 }, ambient: '#1F3538', ambientK: 0.2, exposure: 0.9 });
    }
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // 12–16 · THE SCREEN WAKES (tight on the phone, the kettle half in frame): the 7% and the outline arrive, and with a small
  //         chime the bolt pops in green: the first appearance of the film's green.
  // ===============================================================================================================
  function counterTight(c, st, lt) {
    const v = KV().counter, A = v.anchorsFor('tight');
    const s = { frame: 'tight', screen: 'wake', wake: seg(lt, T.wake0, T.wake1), cable: 'plugged' };
    c.camera({ x: A.phone[0] + 40, y: 540, zoom: 1.0 + 0.0035 * st });
    v.back(c, lt, s); v.front(c, lt, s);
  }

  // ===============================================================================================================
  // 16–19.6 · THE KETTLE'S CHROME: his face, bent round by the steel, looking down at the icon; satisfied.
  // ===============================================================================================================
  function kettle(c, st, lt) {
    const v = KV().kettle, g = c.g, Th = tw(lt);
    c.camera({ x: 1000, y: 560, zoom: 1.0 + 0.003 * st });
    v.back(c, lt, {});
    const fp = RIG.key(Th, [
      [16.0, { face: 'tired', lid: 0.45, smile: 0.0, gaze: [-0.35, 0.55], head: { nod: 0.38, turn: 0.22, tilt: 0.04 } }],
      [17.3, { face: 'tired', lid: 0.42, smile: 0.0, gaze: [-0.35, 0.55], head: { nod: 0.36, turn: 0.22, tilt: 0.04 } }],
      [17.9, { face: 'tired', lid: 0.4, smile: 0.32, gaze: [-0.3, 0.5], head: { nod: 0.3, turn: 0.2, tilt: 0.05 } }],     // satisfied: a small smile
      [18.5, { face: 'tired', lid: 0.42, smile: 0.3, gaze: [-0.3, 0.5], head: { nod: 0.42, turn: 0.2, tilt: 0.05 } }],    // and the smallest nod
      [19.6, { face: 'tired', lid: 0.4, smile: 0.22, gaze: [0.1, 0.2], head: { nod: 0.2, turn: -0.15, tilt: 0.0 } }],     // turning away to the stairs
    ]);
    v.reflect(c, {}, (rg, cam) => {
      RIG.face(rg, 'daniel', Object.assign({ at: [cam.cx - 10, cam.cy + 34], size: 320, view: 'three', facing: -1, outfit: 'night', stubble: 0.4, breath: breathOf(lt) }, fp),
        { light: { x: cam.cx - 200, y: cam.cy - 420, color: '#DCE8E4', back: 0.2 }, ambient: '#2C3A3C', ambientK: 0.12 });
    });
    // the phone's green, a fleck in the chrome's left flank (the charging glyph, bent small)
    g.save(); g.fillStyle = rgba(P.charge, 0.9); g.beginPath(); g.ellipse(652, 584, 4, 9, 0.1, 0, Math.PI * 2); g.fill(); g.restore();
    const e = c.em; e.save(); e.fillStyle = rgba(P.charge, 0.8); e.beginPath(); e.ellipse(652, 584, 9, 16, 0.1, 0, Math.PI * 2); e.fill(); e.restore();
    v.front(c, lt, {});
  }

  // ===============================================================================================================
  // 19.6–30 · C1: in the phone's black glass he climbs the stairs, back turned, cut off by the screen's edge, and leaves the
  //           glass. The screen sleeps to black; the green breathes in it; the empty stairs and the bag by the door remain.
  // ===============================================================================================================
  const CLIMB = { t0: T.c1 - 0.1, t1: 24.5, p0: 0.02, p1: 0.86 };
  function climber(lt) {
    if (lt > CLIMB.t1 + 0.1) return undefined;
    return (h, cam) => {
      const Th = tw(lt), p = lerp(CLIMB.p0, CLIMB.p1, seg(Th, CLIMB.t0, CLIMB.t1)), z = 4.4 + p * 3.5, y = 0.2 + 0.8 * (z - 4.4);
      const q = cam.p(0.62, y, z), k = cam.k(q[2]), lw = cam.p(0.69, 3.6, 9.2);
      RIG.draw(h, 'daniel', { at: [q[0], q[1]], scale: k, view: 'back', body: 'climb', rise: 0.2, going: 0.25, phase: ((z - 4.4) / 0.5) % 1, outfit: 'night', armL: 'rail' },
        { mode: 'silhouette', ink: '#060404', light: { x: lw[0], y: lw[1], color: '#F6CD92' }, rimColor: '#F6CD92', detail: 0.6 });
    };
  }
  // the lock screen's own UI, fading as the screen sleeps (drawn over the 'asleep' state, in the screen's pixel space)
  function sleepOverlay(c, a) {
    if (a <= 0.002) return;
    const q = KV().counter.anchors.screen, g = c.g, SW = 390, SH = 844, tl = q[0], tr = q[1], bl = q[3];
    g.save(); g.transform((tr[0] - tl[0]) / SW, (tr[1] - tl[1]) / SW, (bl[0] - tl[0]) / SH, (bl[1] - tl[1]) / SH, tl[0], tl[1]);
    const bx = 141, by = 172, bw = 100, bh = 46;
    g.globalAlpha = a * 0.62; g.lineWidth = 3.2; g.strokeStyle = 'rgba(222,232,228,0.92)'; g.stroke(LC.rrect(bx, by, bw, bh, 12.5));
    g.globalAlpha = a; g.fillStyle = 'rgba(222,232,228,0.92)'; g.fill(LC.rrect(bx + bw + 4, by + 14, 6, 18, 3));
    g.font = '500 38px "Libre Franklin"'; g.textAlign = 'center'; g.fillStyle = 'rgba(234,240,236,0.96)'; g.fillText('7%', SW / 2 + 3, by - 24);
    g.restore();
  }
  function c1(c, st, lt) {
    const v = KV().counter, asleep = lt >= T.sleep;
    const s = { frame: 'c1', screen: asleep ? 'asleep' : 'charging', pulse: 1, bag: true, cable: 'plugged', inGlass: climber(lt) };
    c.camera({ x: 960, y: 540, zoom: 1.0 });            // C1, exactly, and steady: the flash cuts reuse it
    v.back(c, breathT(lt), s);
    if (asleep) sleepOverlay(c, 1 - E.inOutSine(seg(lt, T.sleep, T.sleep + 0.55)));
    v.front(c, breathT(lt), s);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // the kitchen set's static layers (the chrome is environment-mapped per pixel) cost the better part of a second each to
  // build. Build them all on Q02's first frame, not at every cut. Never when another sequence draws Q02 as a flash cut.
  // ---------------------------------------------------------------------------------------------------------------
  let _warm = false;
  function warmOnce(c) {
    if (_warm || c.flash) return; _warm = true;
    const cv = OTM.makeCanvas(W, H), em = OTM.makeCanvas(W / 4, H / 4);
    const fc = { g: cv.getContext('2d'), em: em.getContext('2d'), cache: c.cache, t: 0, lt: 0, before: [], after: [], camera() {}, reset() {} };
    fc.em.setTransform(0.25, 0, 0, 0.25, 0, 0);
    const v = KV(); [[v.counter, { frame: 'wide', screen: 'off', cable: 'loose' }], [v.counter, { frame: 'tight', screen: 'wake', wake: 0.5 }], [v.counter, { frame: 'c1', screen: 'charging' }], [v.kettle, {}], [v.pocket, {}]]
      .forEach(([vw, st]) => { try { vw.back(fc, 0, st); } catch (e) { FILM.warn('Q02 warm: ' + e.message); } });
  }
  const W2 = fn => (c, st, lt) => { warmOnce(c); fn(c, st, lt); };

  // ===============================================================================================================
  // THE SEQUENCE
  // ===============================================================================================================
  FILM.seq({
    id: 'Q02', title: 'The counter', dur: 30,
    lines: [],
    sound(S) {
      // the house in the morning: the room's air, the fridge, birds behind glass; the street beyond the front door, faint
      S.bed('room', 0, 30, { level: -42, kind: 'a quiet house, early morning' });
      S.bed('street_far', 0, T.pocket + 5, { level: -56, kind: 'the street beyond the front door, very faint' });
      S.bed('fridge', T.counter, 30, { level: -50, kind: 'the fridge hum, kitchen' });
      S.bed('birds', T.counter, 30, { level: -52, filter: 'behind_glass', kind: 'garden birds through the window' });
      S.cue('footsteps', 0.0, { n: 3, surface: 'bare feet on floorboards', level: -38 });
      S.cue('bag_down', T.bagDown, { kind: 'a leather work bag set down on floorboards', level: -30 });
      S.cue('breath', 7.1, { dur: 0.7, kind: 'a small considering breath through the nose', level: -42 });
      S.cue('cable_click', T.plugged, { kind: 'the charging cable pushed home', level: -30 });
      S.cue('chime', T.wake0 + 0.35 * (T.wake1 - T.wake0), { kind: 'the phone on charge: small, reassuring', level: -26 });
      S.cue('footsteps', T.c1 + 0.1, { n: 6, surface: 'bare feet on the stairs, going up', level: -38 });
    },
    shots: [
      { at: 0, name: 'hall: he sets the bag down by the blazing door', draw: W2(hall) },
      { at: T.pocket, name: 'the bag: the empty outside pocket; the phone comes down, hesitates, goes back up', draw: W2(pocket) },
      { at: T.counter, name: 'counter, wide: he plugs the cable in beside the kettle', draw: W2(counterWide) },
      { at: T.tight, name: 'tight: the screen wakes; the chime; the green bolt', draw: W2(counterTight) },
      { at: T.kettle, name: 'the kettle\'s chrome: his face, satisfied', draw: W2(kettle) },
      { at: T.c1, name: 'C1: he climbs out of the glass; the phone remains on the counter', draw: W2(c1) },
    ],
  });
})();
