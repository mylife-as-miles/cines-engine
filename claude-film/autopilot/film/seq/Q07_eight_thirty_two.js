/* AUTOPILOT · Q07 8:32 (54 s) · S08, S09, A033–A040, L022–L027 · car, carpark, office
   The time stamp, read off glass: the dashboard clock floating in the windscreen, 8:32. He pulls into his usual space
   (block A's glass front filling the windscreen), kills the engine, takes his bag and his mug, steps out, shuts the door.
   BEEP: the locks, the indicators blink twice, and the rear window gives back only the office block and the sky: nobody
   could see in, and nobody thinks to look. He hurries across the car park as a reflection gliding along the parked cars'
   windows, and a glass door sighs shut behind him. Then the refrigerated office behind sealed blue glazing: the cool air,
   the tie loosened in relief; Priya with her reports, warm (she laughs); his smile at the thought of his daughter, seen in
   the laptop's black glass, fading into concentration as the screen wakes. Deterministic. Characters on twos. */
(function () {
  'use strict';
  const { W, H } = OTM;
  const clamp = OTM.clamp, lerp = OTM.lerp;
  const seg = FILM.seg, key = FILM.key, tw = FILM.twos, E = FILM.ease;
  const sstep = (t, a, b) => { const u = seg(t, a, b); return u * u * (3 - 2 * u); };
  const breathOf = t => (tw(t) * 0.25) % 1;
  const lerp2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  const BEEP = 13.4, KILL = 8.2;

  // ---------- 1 · the clock in the windscreen (car set's dash view) ----------
  function dash(c, st) {
    const v = SETS.car.views.dash, s = { tod: 'morning', lit: 1, clock: '8:32', beat: 'plain', travel: key(st, [[0, 30], [4, 38, 'outCubic']]) };
    c.camera({ x: 960, y: 500, zoom: 1.0 + 0.005 * st });
    v.back(c, c.t, s); v.front(c, c.t, s);
  }

  // ---------- 2 · pulling into his usual space (carpark set's arrival view); the engine dies; his hand takes the mug ----------
  function arrival(c, st, lt) {
    const v = SETS.carpark.views.arrival, on = lt < KILL;
    const settle = lt > KILL ? 3 * Math.exp(-(lt - KILL) * 6) * Math.sin((lt - KILL) * 30) : 0;
    c.camera({ zoom: 1.0, dy: settle });
    const s = { pull: seg(st, 0, 3.6, 'outCubic'), engine: on ? 1 : 0 };
    v.back(c, c.t, s);
    // A034: he reaches across for the travel mug on the passenger seat (low left) and brings it back past the wheel
    const T = tw(lt);
    if (T > 8.55 && T < 9.95) {
      const out = sstep(T, 8.55, 9.05), back = sstep(T, 9.2, 9.95);
      const wrist = back > 0 ? lerp2([600, 930], [1450, 1080], back) : lerp2([1420, 1110], [600, 930], out);
      RIG.hand(c.g, 'daniel', { at: wrist, size: 360, pose: back > 0 ? 'mug' : 'reach', view: 'back', rot: back > 0 ? -150 : -170, sleeve: 'day', side: 'L' },
        { light: { x: 560, y: 260, color: '#E3E9E3', back: 0.6 }, ambient: '#1E2626', ambientK: 0.35, exposure: 0.75 });
    }
    v.front(c, c.t, s);
  }

  // ---------- 3 · out of the car; BEEP (carpark set's space view; the car set's car and its rear glass) ----------
  function space(c, st, lt) {
    const v = SETS.carpark.views.space, a = v.anchors, T = tw(lt);
    const s = { tod: 'morning', door: key(lt, [[10, 0.8], [10.85, 0.8], [11.35, 0, 'inCubic']]), blink: lt >= BEEP ? SETS.car.blink(lt, BEEP) : 0 };
    c.camera({ zoom: 1.0 + 0.002 * st, x: 960, y: 540 });
    v.back(c, c.t, s);
    // he shuts the door (right hand), turns, and walks toward us; over his shoulder the remote: BEEP
    const L = v.light, walkU = seg(T, 11.6, 15.9);
    const p = lerp2(a.walk.from, a.walk.to, walkU), k = lerp(a.walk.scaleFrom, a.walk.scaleTo, walkU);
    const walking = T > 11.6, ph = (T - 11.6) * 1.05;
    const remote = sstep(T, 12.9, 13.25) * (1 - sstep(T, 13.7, 14.1));
    RIG.draw(c.g, 'daniel', { at: walking ? p : [a.driverDoor.x + 0.12 * a.driverDoor.scale, a.driverDoor.y + 4], scale: walking ? k : a.driverDoor.scale,
      view: walking ? 'three' : 'threeBack', yaw: walking ? 28 : 150, facing: -1, body: walking ? 'walk' : 'stand', phase: walking ? ph % 1 : 0, stride: 1.1,
      outfit: 'day', collar: 'straight', holdL: 'bag', armL: 'bag', holdR: remote > 0.02 ? 'remote' : 'mug',
      armR: walking ? (remote > 0.02 ? { hand: [0.32 * remote + 0.05, -0.15 + 0.25 * remote, -0.25 * remote] } : 'mug') : { pose: 'reach', dy: -0.25 },
      face: 'tired', head: { turn: walking ? 0.25 * remote : 0, nod: 0.08 }, breath: breathOf(lt) }, { light: Object.assign({ back: 0.35 }, L) });
    v.front(c, c.t, s);
  }

  // ---------- 4 · his reflection hurrying along the parked cars' windows (carpark set's crossing view) ----------
  function crossing(c, st, lt) {
    const v = SETS.carpark.views.crossing, track = st * 1.6;
    c.camera({ zoom: 1.0, x: 960, y: 540 });
    v.back(c, c.t, { track });
    v.front(c, c.t, { track, reflect: (g, R) => RIG.draw(g, 'daniel', { at: [R.x, R.y], scale: R.scale, view: 'profile', facing: R.facing, body: 'hurry', phase: (tw(st) * 1.25) % 1, outfit: 'day', collar: 'straight', holdL: 'bag', armL: 'bag', holdR: 'mug', face: 'tired' }, { light: R.light }) });
  }

  // ---------- 5 · the glass door sighs shut behind him (carpark set's door view) ----------
  function door(c, st, lt) {
    const v = SETS.carpark.views.door, a = v.anchors.daniel, T = tw(st);
    const d = 1 - seg(st, 0.7, 2.75, E.settle);
    c.camera({ zoom: 1.0, x: 960, y: 540 });
    v.back(c, c.t, { door: d });
    const u = seg(T, 0, 2.9);
    if (u < 0.999) RIG.draw(c.g, 'daniel', { at: lerp2(a.from, a.to, E.outQuad(u)), scale: lerp(a.scaleFrom, a.scaleTo, E.outQuad(u)), view: 'back', body: 'walk', phase: (T * 1.05) % 1, outfit: 'day', collar: 'straight', holdL: 'bag', armL: 'bag', holdR: 'mug' },
      { light: { x: 900, y: -200, color: '#E3E9E3', back: 0.7 }, ambient: '#30494A', ambientK: 0.1 });
    v.front(c, c.t, { door: d });
  }

  // ---------- 6–8, 10 · the office floor through the meeting room's glass (office set's desk view) ----------
  function desk(c, st, lt, o) {
    const v = SETS.office.views.desk, a = v.anchors, T = tw(lt), s = { tod: 'morning' };
    const fr = o.frame || { x: 960, y: 540, z: 1 };
    c.camera({ x: fr.x, y: fr.y, zoom: fr.z * (1 + 0.002 * st) });
    v.back(c, c.t, s);
    const L = v.light;
    if (o.priya) o.priya(c.g, T, a, L);
    if (o.daniel) o.daniel(c.g, T, a, L);
    v.front(c, c.t, s);
    // pushed in, the meeting room's table edge (our side of the partition) would leave the frame: keep it as an
    // out-of-focus dark edge across the foot of the frame, so the type has its calm, dark band
    if (fr.z > 1.05) {
      c.reset(); const g = c.g;
      g.fillStyle = LC.lin(g, 0, 845, 0, H, [[0, '#0A0F11', 0], [0.42, '#0A0F11', 0.62], [1, '#0A0F11', 0.9]]);
      g.beginPath(); g.moveTo(-10, H + 10); g.lineTo(-10, 905); g.bezierCurveTo(500, 872, 1400, 868, W + 10, 896); g.lineTo(W + 10, H + 10); g.closePath(); g.fill();
      g.fillStyle = 'rgba(200,214,212,0.06)'; g.fillRect(0, 893, W, 3);
    }
  }
  // Priya: in along the aisle behind him (right to left) with the reports, a pause by his desk for the exchange, then on
  const PRIYA_STOP = 0.27;
  function priyaAt(T) {
    // her progress along the aisle: walk in (30.0–31.7), stay (31.7–45.8), walk on (45.8–)
    const u = T < 31.7 ? lerp(0.0, PRIYA_STOP, seg(T, 30.0, 31.7, E.outQuad)) : T < 45.8 ? PRIYA_STOP : lerp(PRIYA_STOP, 0.75, seg(T, 45.8, 49.0, E.inQuad));
    const walking = T < 31.7 || T > 45.8;
    return { u, walking };
  }
  function drawPriya(g, T, a, L) {
    const P = priyaAt(T), pos = lerp2(a.priya.from, a.priya.to, P.u);
    const laugh = T > 39.55 && T < 42.4;
    RIG.draw(g, 'priya', { at: pos, scale: a.priya.scale, view: P.walking ? 'three' : 'three', yaw: P.walking ? 60 : 38, facing: -1, body: P.walking ? 'walk' : 'stand', phase: (T * 1.1) % 1,
      outfit: 'office', holdR: 'reports', armR: 'reports', armL: 'reports', face: laugh ? 'laugh' : 'warm', head: { turn: P.walking ? 0.1 : -0.35, nod: laugh ? -0.22 : 0.02, tilt: laugh ? -0.12 : 0.04 } },
      { light: Object.assign({ back: 0.55 }, L), ambient: '#30494A', ambientK: 0.08 });
  }
  function drawDanielSeated(g, T, a, L, face) {
    RIG.draw(g, 'daniel', { at: a.daniel.seat, scale: a.daniel.scale, view: 'three', yaw: 22, facing: 1, body: 'sit', outfit: 'office', tie: 'loose', collar: 'loose', armR: 'desk', armL: 'desk',
      face: face.face, smile: face.smile, eyes: face.eyes, head: { turn: face.turn, nod: face.nod || 0.05, tilt: 0.02 }, breath: breathOf(T) }, { light: Object.assign({ back: 0.6 }, L), ambient: '#30494A', ambientK: 0.08 });
  }

  // ---------- 9, 11 · the laptop's screen as a pane: his face in the black glass, then the screen waking ----------
  function laptop(c, st, lt, o) {
    const v = SETS.office.views.laptop, T = tw(lt);
    c.camera({ zoom: 1.0 + 0.0025 * st, x: 940, y: 520 });
    const s = Object.assign({ tod: 'morning', content: 'report' }, o.state(T), {
      reflect: (g, R) => RIG.face(g, 'daniel', Object.assign({ at: [R.x, R.y - 0.02 * R.scale], size: 0.235 * R.scale, view: 'front', outfit: 'office', tie: 'loose', collar: 'loose' }, o.face(T)),
        { light: R.light, exposure: 0.55 + 0.6 * (R.lit || 0) }),
    });
    v.back(c, c.t, s); v.front(c, c.t, s);
  }

  FILM.seq({
    id: 'Q07', title: '8:32', dur: 54,
    lines: [
      { id: 'L022', at: 30.0 },          // Priya: "Morning. It's brutal outside."
      { id: 'L023', at: 32.6 },          // Daniel: "Steering wheel nearly took my fingerprints off."
      { id: 'L024', at: 36.2 },          // Priya: "How's Emily?"
      { id: 'L025', at: 38.6 },          // Daniel: "She's fallen out with the sun."
      { id: 'L026', at: 42.8 },          // Priya: "Report ready?"
      { id: 'L027', at: 45.0 },          // Daniel: "Two minutes."
    ],
    sound(S) {
      S.bed('engine', 0, KILL, { f: 40, level: -32, kind: 'slowing, then idling' });
      S.bed('traffic', 0, 4.2, { level: -42 });
      S.cue('indicator', 0.15, { n: 5 });                           // turning into the car park
      S.cue('tyres', 4.3, { level: -38, kind: 'slow roll onto the car park' });
      S.cue('handbrake', 7.9, { level: -34 });
      S.cue('engine_off', KILL);                                     // he kills the engine
      S.bed('engine_ticking', KILL + 0.2, 16, { level: -40, kind: 'the hot engine cooling, ticking' });
      S.cue('seatbelt_release', 8.5, { level: -34 });
      S.cue('door', 9.85, { kind: 'driver_open', level: -22 });
      S.cue('door', 11.35, { kind: 'driver_close' });               // he shuts the door
      S.cue('keys', 12.95, { level: -32 });
      S.cue('beep', BEEP, { n: 2 });                                 // BEEP: the locks (the indicators blink twice)
      S.cue('footsteps', 11.7, { n: 8, surface: 'tarmac', level: -32 });
      S.cue('footsteps', 16.0, { n: 10, surface: 'tarmac', pace: 'hurry', level: -32 });
      S.bed('heat', 10, 21, { level: -50 });
      S.bed('lobby_hush', 21, 24, { level: -46 });
      S.cue('glass_door_sigh', 22.6);                                // a glass door sighs shut behind him
      S.bed('ac', 24, 54, { level: -40 });                           // the air conditioning: cool, dry, wonderful air
      S.bed('office_murmur', 24, 54, { level: -48 });
      S.cue('bag_down', 24.7, { level: -32 });
      S.cue('tie_loosen', 25.5, { level: -38 });
      S.cue('breath', 26.1, { dur: 1.1, kind: 'a long exhale of relief', level: -30 });
      S.cue('chair_creak', 30.1, { level: -38 });
      S.cue('pages', 31.5, { level: -36, kind: "Priya's reports" });
      S.cue('laugh', 39.65, { level: -32, kind: 'Priya, a short warm laugh' });
      S.cue('footsteps', 45.8, { n: 4, surface: 'office carpet', level: -40 });
      S.cue('laptop_wake', 47.4, { level: -38 });
      S.cue('keyboard', 50.6, { n: 14, level: -36 });
    },
    shots: [
      { at: 0, name: 'dash: 8:32, the clock in the windscreen', draw(c, st) { dash(c, st); } },
      { at: 4, name: 'arrival: into his usual space; the engine dies', draw(c, st, lt) { arrival(c, st, lt); } },
      { at: 10, name: 'space: he shuts the door; BEEP, the locks', draw(c, st, lt) { space(c, st, lt); } },
      { at: 16, name: 'crossing: his reflection along the parked cars', draw(c, st, lt) { crossing(c, st, lt); } },
      { at: 21, name: 'door: the glass door sighs shut behind him', draw(c, st, lt) { door(c, st, lt); } },
      { at: 24, name: 'desk: the cool air; he loosens his tie', draw(c, st, lt) {
        desk(c, st, lt, { frame: { x: 1150, y: 600, z: 1.28 }, daniel: (g, T, a, L) => {
          const tieU = sstep(T, 25.3, 26.4), relief = T > 25.9 && T < 27.2;
          const sa = a.standing;
          RIG.draw(g, 'daniel', { at: [sa.x, sa.y], scale: sa.scale, view: 'three', yaw: 30, facing: -1, body: 'stand', outfit: 'day', tie: tieU > 0.5 ? 'loose' : 'neat', collar: tieU > 0.5 ? 'loose' : 'straight',
            armR: T > 25.1 && T < 26.9 ? 'tie' : 'relaxed', armL: T < 24.6 ? 'bag' : 'relaxed', holdL: T < 24.6 ? 'bag' : null,
            face: relief ? 'closed' : 'tired', smile: relief ? 0.2 : 0, head: { nod: relief ? -0.18 : 0.05, turn: -0.1, tilt: relief ? -0.05 : 0 }, breath: (tw(T) * 0.25) % 1 }, { light: Object.assign({ back: 0.6 }, L), ambient: '#30494A', ambientK: 0.08 });
        } });
      } },
      { at: 30, name: 'desk: Priya passes his desk with the reports', draw(c, st, lt) {
        desk(c, st, lt, { frame: { x: 1040, y: 590, z: 1.15 }, priya: drawPriya, daniel: (g, T, a, L) => drawDanielSeated(g, T, a, L, { face: T < 32.4 ? 'tired' : 'warm', smile: T < 32.4 ? 0.05 : 0.25, eyes: 'open', turn: T < 30.8 ? 0 : 0.35, nod: 0.02 }) });
      } },
      { at: 35.6, name: 'desk, closer: How\'s Emily?', draw(c, st, lt) {
        desk(c, st, lt, { frame: { x: 1060, y: 560, z: 1.6 }, priya: drawPriya, daniel: (g, T, a, L) => drawDanielSeated(g, T, a, L, { face: 'warm', smile: 0.2, eyes: 'open', turn: 0.35, nod: 0.0 }) });
      } },
      { at: 38.4, name: 'laptop: his smile in the black glass, at the thought of his daughter', draw(c, st, lt) {
        laptop(c, st, lt, { state: () => ({ wake: 0 }), face: T => ({ face: 'smile', smile: key(T, [[38.4, 0.15], [39.4, 0.55], [42.6, 0.6]]), eyes: 'down', lid: 0.35, head: { nod: 0.15, turn: 0.05, tilt: 0.03 } }) });
      } },
      { at: 42.6, name: 'desk: Report ready? Two minutes.', draw(c, st, lt) {
        desk(c, st, lt, { priya: drawPriya, daniel: (g, T, a, L) => drawDanielSeated(g, T, a, L, { face: 'smile', smile: 0.35, eyes: 'open', turn: T < 46.2 ? 0.35 : 0.0, nod: 0.02 }) });
      } },
      { at: 47, name: 'laptop: the screen wakes; the smile fades into concentration', draw(c, st, lt) {
        laptop(c, st, lt, { state: T => ({ wake: seg(T, 47.4, 49.4) }), face: T => ({ face: T < 49.6 ? 'smile' : 'concentration', smile: key(T, [[47, 0.4], [49.6, 0.12], [51, 0]]), eyes: 'open', head: { nod: 0.08, turn: 0, tilt: 0 } }) });
      } },
    ],
  });
})();
