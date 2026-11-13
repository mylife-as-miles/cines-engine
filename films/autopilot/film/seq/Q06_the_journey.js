/* AUTOPILOT · Q06 THE JOURNEY (44 s) · S07, A028–A032, L020, L021 · car, roads
   "A sequence of turns Daniel has made hundreds of times." A montage on a mechanical rhythm: the first five cuts land every
   3.0 s on the indicator's tick (the bakery, the two sets of lights, the crossing, the van), then the coffee, the painted
   wall in the passenger window (the nursery's animals, blurred to bands of colour), the road, the mirror, and two fingers
   drumming on the wheel. Every shot is through the windscreen, a side window or the mirror's glass. Restraint: every
   mirror holds only the road behind (the roads set and the car set's pov default to it); nothing looks at the back seat,
   and the driving shot only shows the rear glass reflecting the street. Daniel is on autopilot: never a hesitation.
   Deterministic. Characters on twos, camera and glass on ones. */
(function () {
  'use strict';
  const { W, H } = OTM;
  const clamp = OTM.clamp, lerp = OTM.lerp;
  const seg = FILM.seg, key = FILM.key, tw = FILM.twos, E = FILM.ease;
  const sstep = (t, a, b) => { const u = seg(t, a, b); return u * u * (3 - 2 * u); };
  const breathOf = t => (tw(t) * 0.25) % 1;
  const SPEED = 9;                                   // m/s, about 20 mph

  // ---------- the windscreen beats (roads set): a small drift of the car on top of each beat's own move ----------
  function windscreen(c, st, s) {
    const v = SETS.roads.views.windscreen;
    c.camera({ zoom: 1.0 + 0.002 * st, x: 960, y: 540 });
    v.back(c, st, Object.assign({ sway: 0.004 * FILM.wob(c.t, 0.7, 3), bob: 0.004 * FILM.wob(c.t, 1.3, 9) }, s));
    v.front(c, st, s);
  }

  // ---------- Daniel through the driver's window (car set's driving view) ----------
  const ARM = n => (RIG.ARM[n] && RIG.ARM[n].h) || [0, -0.3, 0.3];
  function driving(c, st, lt, o) {
    const v = SETS.car.views.driving, s = { tod: 'morning', travel: 140 + lt * SPEED, close: o.close }, fr = o.frame || { x: 960, y: 540, z: 1 };
    c.camera({ zoom: fr.z * (1 + 0.002 * st), x: fr.x, y: fr.y });
    v.back(c, c.t, s);
    const A = v.anchors, k = A.ppm; if (!A.head) { v.front(c, c.t, s); return; }
    const T = tw(lt), seat = [A.shoulder[0] - 0.02 * k, A.shoulder[1] + 0.62 * k];
    const wheelTop = [A.wheel[0] - 0.02 * k, A.wheel[1] - 0.165 * k], wheel2 = [A.wheel[0] + 0.12 * k, A.wheel[1] - 0.1 * k];
    const pose = o.pose(T, A, k, wheelTop);
    const info = RIG.draw(c.g, 'daniel', Object.assign({ at: seat, scale: k, view: 'profile', facing: 1, body: 'drive', wheel: false, outfit: 'day', collar: 'straight', armR: { to: o.handHigh ? wheelTop : wheel2, grip: 'grip' },
      face: 'tired', breath: breathOf(lt) }, pose), { light: { x: 300, y: 100, color: '#FFF6E6', back: 0.4 }, ambient: '#2A3A3E', ambientK: 0.08 });
    if (o.after) o.after(c.g, info, T, k);
    v.front(c, c.t, s);
  }
  // the coffee: a drop off the mug's lip lands on his right cuff (17.2); in the close he looks down and wipes it with his left thumb
  const DROP = 17.15, LAND = 17.4;
  function cuffOf(info) { const h = info.hands.R, e = info.elbows.R; return [lerp(h[0], e[0], 0.2), lerp(h[1], e[1], 0.2)]; }
  function stain(g, info, T, k, fade) {
    const cf = cuffOf(info), a = 0.85 * (1 - fade), sm = 1 + 0.8 * fade;
    if (a <= 0.01) return;
    g.save(); g.fillStyle = 'rgba(78,50,32,' + a.toFixed(3) + ')'; g.beginPath(); g.ellipse(cf[0] - 0.004 * k * fade, cf[1] + 0.002 * k, 0.009 * k * sm, 0.006 * k, -0.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(110,74,48,' + (a * 0.6).toFixed(3) + ')'; g.beginPath(); g.ellipse(cf[0] + 0.002 * k, cf[1] - 0.002 * k, 0.004 * k, 0.003 * k, -0.4, 0, Math.PI * 2); g.fill(); g.restore();
  }

  // ---------- the passenger window: the nursery's painted wall slipping past (roads set's passenger view) ----------
  function passenger(c, st, lt, zoom) {
    const v = SETS.roads.views.passenger, s = { tod: 'morning', travel: 4 + (lt - 20.6) * 5.2 };
    c.camera({ zoom: zoom * (1 + 0.003 * st), x: 960, y: zoom > 1 ? 470 : 540 });
    v.back(c, st, s); v.front(c, st, s);
  }

  // ---------- the rear-view mirror close: the road behind, receding (car set's pov at its default: the road) ----------
  function mirror(c, st, lt) {
    const v = SETS.car.views.pov, s = { tod: 'morning', dash: 1, travel: 60 + lt * SPEED, vibrate: 0.25 };
    c.camera({ x: 895, y: 562, zoom: 1.38 * (1 + 0.004 * st), dx: 0.7 * FILM.wob(c.t, 9, 2), dy: 0.7 * FILM.wob(c.t, 11, 6) });
    v.back(c, c.t, s); v.front(c, c.t, s);
  }

  // ---------- the wheel close: two fingers drumming at ten o'clock (car set's wheel view + RIG's drumming hand) ----------
  function wheel(c, st, lt, zoom) {
    const v = SETS.car.views.wheel, s = { tod: 'morning', travel: 200 + lt * SPEED };
    const A = v.anchors;
    c.camera({ zoom: zoom * (1 + 0.0025 * st), x: zoom > 1 ? 760 : 960, y: zoom > 1 ? 600 : 540 });
    v.back(c, c.t, s);
    // his left hand resting over the rim at eleven o'clock, knuckles on the leather, two fingers lifting and tapping
    const T = tw(lt), p = A.rim11, out = Math.atan2(p[1] - A.centre[1], p[0] - A.centre[0]), size = 300, rest = Math.sin(T * 0.9) * 3;
    const at = [p[0] - Math.cos(out) * size * 0.42 + rest, p[1] - Math.sin(out) * size * 0.42];
    RIG.hand(c.g, 'daniel', { at, size, pose: 'drum', obj: null, view: 'palm', rot: out * 180 / Math.PI, phase: (T * 1.6) % 1, sleeve: 'day', side: 'L' },
      { light: { x: 300, y: 80, color: '#FFF6E6', back: 0.35 }, ambient: '#2A3236', ambientK: 0.12 });
    v.front(c, c.t, s);
  }

  FILM.seq({
    id: 'Q06', title: 'The journey', dur: 44,
    lines: [
      { id: 'L020', at: 20.0 },          // V.O. "Think about the last journey you make every day. What do you actually remember of it?" (6.80 s)
      { id: 'L021', at: 30.0 },          // V.O. "Usually, just getting there." (2.68 s)
    ],
    sound(S) {
      S.bed('engine', 0, 44, { f: 46, level: -32, kind: 'driving' });
      S.bed('traffic', 0, 44, { level: -40 });
      S.bed('radio_music', 0, 44, { level: -44, speaker: 'small', mood: 'bright morning radio, turned low' });
      // the mechanical rhythm: the indicator's tick on the turn, the cuts on its beat
      S.cue('indicator', 0.05, { n: 7 });
      S.cue('brakes', 3.3, { level: -38, kind: 'soft stop at the lights' });
      S.cue('handbrake_click', 4.1, { level: -40 });
      S.cue('indicator', 12.05, { n: 6 });
      S.cue('mug_cap', 15.25, { level: -30 });                      // the travel mug's lid flips open
      S.cue('sip', 15.95, { level: -34 });
      S.cue('drip', LAND, { level: -42 });
      S.cue('cloth_rub', 18.4, { level: -40, kind: 'thumb on the cuff' });
      S.cue('wall_pass', 20.7, { level: -36, kind: 'tyres echo off the nursery wall, close on the left' });
      S.cue('finger_drum', 34.15, { n: 10, level: -34 });
      S.cue('finger_drum', 40.7, { n: 9, level: -34 });
    },
    shots: [
      { at: 0, name: 'windscreen: the bakery, turning left past it', draw(c, st) { windscreen(c, st, { beat: 'bakery', travel: key(st, [[0, 13], [3, 29.5, 'linear']]) }); } },
      { at: 3, name: 'windscreen: the first lights, red on the glass', draw(c, st) { windscreen(c, st, { beat: 'lights1', travel: key(st, [[0, 13.5], [1.3, 19.4, 'outCubic'], [2.25, 19.4], [3, 21.2, 'inQuad']]), signal: st < 1.65 ? 'red' : st < 2.2 ? 'redamber' : 'green' }); } },
      { at: 6, name: 'windscreen: the second lights, changing', draw(c, st) { windscreen(c, st, { beat: 'lights2', travel: key(st, [[0, 4], [3, 13.5, 'linear']]), signal: st < 0.7 ? 'redamber' : 'green' }); } },
      { at: 9, name: 'windscreen: the crossing near the park', draw(c, st) { windscreen(c, st, { beat: 'crossing', travel: key(st, [[0, 4], [3, 17, 'linear']]) }); } },
      { at: 12, name: 'windscreen: the same impatient van at the same junction', draw(c, st) { windscreen(c, st, { beat: 'van', travel: key(st, [[0, 4], [3, 15, 'linear']]), vanEdge: key(st, [[0, 0.05], [1.6, 0.5], [3, 0.62]]) }); } },
      { at: 15, name: 'driving: a sip of coffee, through his window', draw(c, st, lt) {
        driving(c, st, lt, { close: 0.55, frame: { x: 860, y: 470, z: 1.1 }, handHigh: true, pose: (T) => {
          const u = key(T, [[15.2, 0], [15.85, 1, 'outCubic'], [16.6, 1], [17.15, 0.15, 'inOutSine'], [17.6, 0.1]]);
          return { armR: { hand: [lerp(ARM('mug')[0], ARM('sip')[0], u), lerp(ARM('mug')[1], ARM('sip')[1], u), lerp(ARM('mug')[2], ARM('sip')[2], u)] }, holdR: 'mug', armL: { hand: ARM('wheel') }, head: { nod: key(T, [[15.2, 0.05], [15.9, -0.12], [16.6, -0.12], [17.0, 0.04]]), turn: 0, tilt: 0 }, face: 'tired', eyes: T > 15.85 && T < 16.6 ? 'half' : 'open' };
        }, after: (g, info, T, k) => {
          // the drop: off the mug's lip as it comes down, onto the right cuff
          if (T > DROP && T < LAND) { const m = info.hands.R, cf = cuffOf(info), u = seg(T, DROP, LAND, 'inQuad'); g.fillStyle = 'rgba(70,44,28,0.9)'; g.beginPath(); g.ellipse(lerp(m[0] + 0.03 * k, cf[0], u), lerp(m[1] - 0.05 * k, cf[1], u), 0.004 * k, 0.006 * k, 0, 0, Math.PI * 2); g.fill(); }
          if (T >= LAND) stain(g, info, T, k, 0);
        } });
      } },
      { at: 17.6, name: 'driving: close, the drop on his sleeve; he wipes it, the wheel straight', draw(c, st, lt) {
        driving(c, st, lt, { close: 1, frame: { x: 760, y: 470, z: 1.32 }, handHigh: true, pose: (T, A, k, wheelTop) => {
          const cf0 = [wheelTop[0] - 0.09 * k, wheelTop[1] + 0.05 * k];          // roughly where the cuff sits (refined by RIG's info in after)
          const wipe = T > 18.3 && T < 19.35 ? Math.sin((T - 18.3) * Math.PI * 2 * 2.6) : 0;
          const reach = sstep(T, 17.95, 18.35) * (1 - sstep(T, 19.35, 19.75));
          const rest = ARM('mug');
          return { armL: { hand: rest },
            head: { nod: key(T, [[17.6, 0.02], [17.95, 0.5, 'outCubic'], [19.4, 0.5], [19.8, 0.04, 'inOutSine']]), turn: 0.05, tilt: 0 }, eyes: T > 17.9 && T < 19.6 ? 'down' : 'open', face: 'tired' };
        }, after: (g, info, T, k) => {
          stain(g, info, T, k, seg(T, 18.4, 19.3));
          const reach = sstep(T, 17.95, 18.35) * (1 - sstep(T, 19.35, 19.75)); if (reach < 0.02) return;
          const cf = cuffOf(info), wipe = T > 18.3 && T < 19.35 ? Math.sin((T - 18.3) * Math.PI * 2 * 2.6) : 0;
          const home = [cf[0] - 0.3 * k, cf[1] + 0.22 * k], at = [lerp(home[0], cf[0] - 0.1 * k + 0.012 * k * wipe, reach), lerp(home[1], cf[1] - 0.015 * k, reach)];
          RIG.hand(g, 'daniel', { at, size: 0.19 * k, pose: 'wipe', view: 'side', rot: 4 + 4 * wipe, sleeve: 'day', side: 'L' }, { light: { x: 300, y: 100, color: '#FFF6E6', back: 0.4 }, ambient: '#2A3A3E', ambientK: 0.1 });
        } });
      } },
      { at: 20.6, name: 'passenger: the painted wall slips past, out of focus', draw(c, st, lt) { passenger(c, st, lt, 1.0); } },
      { at: 24.4, name: 'passenger: the wall, closer, smeared to bands of colour', draw(c, st, lt) { passenger(c, st, lt, 1.3); } },
      { at: 28.0, name: 'windscreen: he keeps driving', draw(c, st) { windscreen(c, st, { beat: 'plain', travel: 20 + st * SPEED }); } },
      { at: 30.6, name: 'mirror: the empty road behind', draw(c, st, lt) { mirror(c, st, lt); } },
      { at: 34.0, name: 'wheel: two fingers drumming', draw(c, st, lt) { wheel(c, st, lt, 1.0); } },
      { at: 37.4, name: 'driving: already thinking about work', draw(c, st, lt) {
        driving(c, st, lt, { close: 0.15, pose: T => ({ armL: { hand: ARM('wheel') }, face: 'concentration', eyes: 'open', lid: 0.35, head: { nod: 0.04, turn: 0.04, tilt: 0 } }) });
      } },
      { at: 40.6, name: 'wheel: the drumming, close', draw(c, st, lt) { wheel(c, st, lt, 1.25); } },
    ],
  });
})();
