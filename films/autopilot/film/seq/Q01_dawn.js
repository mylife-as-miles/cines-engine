/* AUTOPILOT · Q01 · DAWN (40 s) · S01, A001–A004, L001–L003 · bedroom
   The opening title on black; the alarm starts in the dark. Then the phone, face up on the bedside table, shivering: its cold
   white screen is the only light in a teal-black room, and its glass is the film's first pane. A hand silences it on the
   second ring. BATTERY 7%: in the black glass between the panel and the stacked apps, Daniel's face, squinting at the number.
   He turns the phone over and the light goes with it. The dark window gives back the bed: his side, where he lies propped on
   an elbow in the last of the phone's light, and hers, empty, the pillow smooth. Dawn grows at the blind's edges; he sits up
   on the edge of the bed, a silhouette against it, and we cut as he stands.
   Deterministic. Characters on twos (FILM.twos); camera, light and glass on ones. */
(function () {
  'use strict';
  const { W, H } = OTM;
  const clamp = OTM.clamp, lerp = OTM.lerp, rgba = OTM.rgba;
  const seg = FILM.seg, key = FILM.key, tw = FILM.twos, E = FILM.ease;
  const sstep = (t, a, b) => { const u = seg(t, a, b); return u * u * (3 - 2 * u); };
  const breathOf = t => (tw(t) * 0.25) % 1;                 // Daniel's 3 px breath at 0.25 Hz
  const V = () => SETS.bedroom.views;

  // ---------------------------------------------------------------------------------------------------------------
  // the beats (sequence-local seconds)
  // ---------------------------------------------------------------------------------------------------------------
  const T = {
    alarm: 4.5,          // the alarm starts in the dark, before we see anything
    ring2: 6.7,          // the second ring
    silence: 8.62,       // the thumb on the slider: silenced on the second ring
    swing0: 19.15, swing1: 20.35,   // he turns the phone over: the screen swings away and the light goes with it
    window: 20.35, edge: 29.0, rise: 38.7,
  };

  // ===============================================================================================================
  // 0–5 · THE TITLE on black, small and cold (Libre Franklin 500, tracked, bone; the credit smaller and dimmer). The end
  //       card at the close of Q12 uses the same type, size and tracking.
  // ===============================================================================================================
  function title(c, st, lt) {
    const g = c.g; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const a = E.inOutSine(seg(lt, 0.55, 1.75)) * (1 - E.inOutSine(seg(lt, 3.35, 4.55)));
    if (a <= 0.002) return;
    const type = (text, size, track, y, alpha) => { g.font = `500 ${size}px "Libre Franklin"`; g.letterSpacing = track + 'px'; g.fillStyle = rgba('#E6E0D2', alpha); g.fillText(text, W / 2 + track / 2, y); };
    g.save(); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    type('AUTOPILOT', 54, 21, 534, a);
    type('A film by Osita Miles', 24, 4.5, 590, 0.6 * a);
    g.letterSpacing = '0px'; g.restore();
  }

  // ===============================================================================================================
  // 5–11 · THE ALARM: the phone face up on the bedside table, shivering, the screen lighting the room from below. His hand
  //        comes in from the bed (frame left) and silences it on the second ring; the room drops to the lock screen's glow.
  // ===============================================================================================================
  // a fingertip's offset from the wrist for the hand pose we use (measured once per rotation, so the tip lands on the slider)
  const HAND = { size: 560, view: 'back', pose: 'relaxed', sleeve: 'night' };
  const _tips = {};
  function tipOffset(rot, curl) {
    const k = rot + '|' + curl; if (_tips[k]) return _tips[k];
    const g = OTM.makeCanvas(8, 8).getContext('2d');
    const info = RIG.hand(g, 'daniel', Object.assign({}, HAND, { at: [0, 0], rot, curl }), {});
    return (_tips[k] = info ? info.tips[1] : [0, 0]);
  }
  function alarm(c, st, lt) {
    const v = V().table, A = v.anchors, g = c.g;
    const lit = lt < T.silence;
    const s = { screen: lit ? 'alarm' : 'lock', shiver: lit ? 1 : 0 };
    c.camera({ x: 990, y: 560, zoom: 1.0 + 0.0028 * st });          // a slow push on the phone (0.3% a second)
    v.back(c, lt, s);
    // the hand: up from the bed at the lower left, a sleepy fumble onto the glass; the fingers slide the slider; it rests;
    // then it closes on the phone to pick it up
    const Th = tw(lt);
    if (Th > 7.2) {
      const rot = key(Th, [[7.3, -34], [8.3, -26], [8.62, -22], [10.2, -20], [10.9, -16]]), curl = key(Th, [[7.3, 0.9], [8.3, 0.62], [8.62, 0.66], [10.2, 0.7], [10.9, 1.15]]);
      const d = tipOffset(Math.round(rot), Math.round(curl * 20) / 20);
      const stop = A.stop, slid = [stop[0] + 62, stop[1] + 14];      // the slider's knob travels a little to the right
      const tip = key(Th, [[7.3, [-120, 1060]], [8.3, [stop[0] - 10, stop[1] + 8], 'outCubic'], [8.44, stop], [8.62, slid, 'inOutSine'], [10.2, [slid[0] - 6, slid[1] + 4]], [10.9, [slid[0] - 30, slid[1] + 26], 'inOutSine']]);
      const lv = lit ? 1 : 0.4;
      RIG.hand(g, 'daniel', Object.assign({}, HAND, { at: [tip[0] - d[0], tip[1] - d[1]], rot, curl }),
        { light: { x: A.phone[0] + 40, y: A.phone[1] - 30, color: '#DCE8EC', back: 0.35 }, ambient: '#0A1416', ambientK: 0.45, exposure: 0.5 + 0.32 * lv, detail: 0.8 });
    }
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // 11–20.4 · BATTERY 7%: the screen close, held in his hand; in its black glass his face, squinting at the number. Then he
  //           turns it over: the glass foreshortens to an edge and the light goes with it.
  // ===============================================================================================================
  const FL = { x: 480, y: 0, w: 960, h: 900 };
  let _fl = null; const faceLayer = () => _fl || (_fl = OTM.makeCanvas(FL.w, FL.h));
  function screen(c, st, lt) {
    const v = V().screen, A = v.anchors;
    const sw = seg(lt, T.swing0, T.swing1, 'inOutSine');
    const hh = FILM.shake(lt, 1.6, 0.3, 5);                          // the phone is in a tired hand: it drifts a little
    c.camera({ x: 960, y: 540, zoom: 1.012 + 0.0022 * st, dx: hh.dx, dy: hh.dy });
    const s = { swing: sw, glow: 1 - 0.15 * sw };
    v.back(c, lt, s);
    const Th = tw(lt);
    const fp = RIG.key(Th, [
      [11.0, { squint: 0.55, lid: 0.25, brow: -0.2, browKnit: 0.35, head: { nod: 0.14, turn: -0.04, tilt: 0.03 } }],
      [12.2, { squint: 0.9, lid: 0.3, brow: -0.35, browKnit: 0.6, head: { nod: 0.1, turn: -0.06, tilt: 0.04 } }],
      [14.4, { squint: 0.85, lid: 0.35, brow: -0.3, browKnit: 0.55, head: { nod: 0.12, turn: -0.05, tilt: 0.04 } }],
      [14.6, { squint: 0.6, lid: 1, brow: -0.2, browKnit: 0.4, head: { nod: 0.13, turn: -0.05, tilt: 0.04 } }],      // a slow, tired blink
      [14.8, { squint: 0.55, lid: 0.42, brow: -0.15, browKnit: 0.35, head: { nod: 0.14, turn: -0.04, tilt: 0.03 } }],
      [17.2, { squint: 0.4, lid: 0.5, brow: 0.05, browKnit: 0.2, head: { nod: 0.2, turn: -0.02, tilt: 0.02 } }],
      [19.2, { squint: 0.35, lid: 0.55, brow: 0.1, browKnit: 0.15, head: { nod: 0.24, turn: 0.0, tilt: 0.0 } }],
    ]);
    const par = 10 * Math.sin(lt * 0.4);                              // the reflection slides a touch against the glass
    // the face is rendered into its own layer, faded out below the chin (the stacked apps are lit: a reflection barely shows
    // over them), then screened into the black glass
    const fl = faceLayer(), fg = fl.getContext('2d'); fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, fl.width, fl.height); fg.translate(-FL.x, -FL.y);
    RIG.face(fg, 'daniel', Object.assign({ at: [A.face[0] + par, A.face[1] + 48], size: 540, view: 'front', face: 'squint', outfit: 'night', stubble: 0.45, breath: breathOf(lt) }, fp),
      { mode: 'reflection', blend: 'source-over', alpha: 1, res: 0.5, light: { x: 930, y: 1150, color: '#DCE8EC', back: 0.12 }, mirror: true, mirrorX: A.face[0] + par });
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = 'destination-out';
    fg.fillStyle = LC.lin(fg, 0, 700 - FL.y, 0, 830 - FL.y, [[0, '#000', 0], [1, '#000', 1]]); fg.fillRect(0, 700 - FL.y, fl.width, fl.height); fg.globalCompositeOperation = 'source-over';
    v.inGlass(c, { reflect: 0.3 + 0.05 * sstep(lt, 11, 13) }, g => g.drawImage(fl, FL.x, FL.y));
    // the apps low on the screen are dimmer than the panel: the lower glass falls off toward his thumb (calm under the words)
    if (sw < 0.5) { const g = c.g, q = SETS.bedroom.views.screen.anchors.screen; g.save(); g.beginPath(); q.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.clip();
      g.fillStyle = LC.lin(g, 0, 780, 0, 1100, [[0, '#020405', 0], [1, '#020405', 0.42]]); g.fillRect(0, 780, W, 340); g.restore(); }
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // 20.4–29 · THE DARK WINDOW: the bare glass under the blind gives back the bed. His side: he lies propped on an elbow, the
  //           turned-over phone's last light on him; her side: empty, the pillow smooth. A slow push; the blind's edges glow.
  // ===============================================================================================================
  function windowShot(c, st, lt) {
    const v = V().window;
    const s = { dawn: key(lt, [[T.window, 0.12], [T.edge, 0.37, 'inOutSine']]), phoneLight: 1 - seg(lt, T.window, T.window + 1.1, 'outQuad') };
    c.camera({ x: 990, y: 528, zoom: 1.15 + 0.0045 * st });          // close on the bare glass; a slow push toward the empty half (0.4% a second)
    v.back(c, lt, s);
    v.inGlass(c, s, (g, mc) => himInTheGlass(g, mc, lt, s));
    v.front(c, lt, s);
  }
  // Daniel lying on his side, propped on his left elbow, turned toward the foot of the bed (toward the window), the phone in
  // his hand against the duvet. A soft shape in the glass: three values of grey (it is screened over the dark garden).
  function himInTheGlass(g, mc, lt, s) {
    const P = (x, y, z) => { const q = mc.p(x, y, z); return [q[0], q[1]]; };
    const Th = tw(lt), br = 0.006 * Math.sin(Th * Math.PI * 2 * 0.25), sink = 0.02 * sstep(lt, 24, 28);      // he settles a little as the light goes
    const pl = s.phoneLight || 0, dawn = s.dawn || 0;
    const body = '#55666A', shade = '#3C4A4E', face = '#4E5A5C';
    // his legs under the thrown-back duvet roll, and the hip
    g.fillStyle = shade; g.fill(LC.smooth([P(-0.72, 0.62, 1.55), P(-0.12, 0.62, 1.55), P(-0.08, 0.7, 1.2), P(-0.14, 0.74, 0.95), P(-0.62, 0.74, 0.92), P(-0.76, 0.66, 1.2)]));
    // the torso, propped: from the hip up to the shoulder on the elbow
    g.fillStyle = body; g.fill(LC.smooth([P(-0.66, 0.66, 1.0), P(-0.2, 0.68, 1.0), P(-0.16, 0.8 + br - sink, 0.7), P(-0.24, 0.9 + br - sink, 0.5), P(-0.52, 0.92 + br - sink, 0.46), P(-0.66, 0.84 - sink, 0.6)]));
    // the propping arm (forearm flat on the pillow) and the hand with the dark phone
    g.fillStyle = shade; g.fill(LC.smooth([P(-0.58, 0.84 - sink, 0.5), P(-0.48, 0.66, 0.34), P(-0.3, 0.64, 0.3), P(-0.3, 0.68, 0.38), P(-0.46, 0.86 - sink, 0.56)]));
    g.fillStyle = '#20282A'; g.fill(LC.smooth([P(-0.22, 0.76 - sink, 0.66), P(-0.12, 0.76 - sink, 0.66), P(-0.12, 0.8 - sink, 0.62), P(-0.22, 0.8 - sink, 0.62)]));
    // the head, a little bowed, turned toward the phone
    const hc = P(-0.38, 1.02 + br - sink, 0.48), k = mc.f / Math.max(0.3, mc.p(-0.38, 1.0, 0.48)[2]);
    g.fillStyle = face; g.beginPath(); g.ellipse(hc[0], hc[1], 0.1 * k, 0.12 * k, 0.12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#262E30'; g.beginPath(); g.ellipse(hc[0] + 0.01 * k, hc[1] - 0.05 * k, 0.1 * k, 0.07 * k, 0.12, Math.PI * 0.95, Math.PI * 2.05); g.fill();
    // light: the phone's cold glow on his face and hand while it lasts; then only the window's pale edge on his shoulder
    if (pl > 0.01) { const pc = P(-0.18, 0.86, 0.62); g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = LC.rad(g, pc[0], pc[1], 0, 0.35 * k, [[0, '#CFE2E6', 0.55 * pl], [1, '#CFE2E6', 0]]); g.fillRect(pc[0] - 0.4 * k, pc[1] - 0.4 * k, 0.8 * k, 0.8 * k); g.restore(); }
    if (dawn > 0.15) { g.save(); g.strokeStyle = rgba('#9DB0B6', 0.6 * sstep(dawn, 0.15, 0.4)); g.lineWidth = 2; g.beginPath(); const a = P(-0.52, 0.93 - sink, 0.46), b = P(-0.24, 0.91 - sink, 0.5); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore(); }
  }

  // ===============================================================================================================
  // 29–40 · THE EDGE OF THE BED: dawn grows at the blind; he sits up on the bed's edge, a silhouette against it, the phone in
  //         his hands; we cut as he stands.
  // ===============================================================================================================
  const EDGE_KEYS = [
    [29.0, { lean: 1.05, seat: 0.47, head: { nod: 0.75, turn: 0, tilt: 0.04 }, armR: 'knee', armL: 'knee' }],
    [31.6, { lean: 0.5, seat: 0.47, head: { nod: 0.42, turn: 0, tilt: 0.02 }, armR: 'knee', armL: 'knee' }],
    [34.6, { lean: 0.42, seat: 0.47, head: { nod: 0.5, turn: 0.04, tilt: 0.0 }, armR: 'knee', armL: 'knee' }],
    [37.2, { lean: 0.45, seat: 0.47, head: { nod: 0.36, turn: -0.06, tilt: 0.0 }, armR: 'knee', armL: 'knee' }],
    [T.rise, { lean: 0.5, seat: 0.47, head: { nod: 0.4, turn: -0.04, tilt: 0.0 }, armR: 'knee', armL: 'knee' }],
    [40.0, { lean: 1.0, seat: 0.57, head: { nod: 0.3, turn: 0, tilt: 0.0 }, armR: 'knee', armL: 'knee' }],
  ];
  // his body stands between the lens and the glowing blind: cut his shape out of the bloom so he stays ink, rimmed (C3)
  function occludeBloom(c, info, k) {
    if (!info || !info.head) return; const e = c.em; e.save(); e.fillStyle = '#000';
    e.beginPath(); e.arc(info.head[0], info.head[1], 0.115 * k, 0, Math.PI * 2); e.fill();
    const sh = info.shoulders, hp = info.hips; if (sh && hp) { const pts = [sh.L || sh[0], sh.R || sh[1], hp.R || hp[1], hp.L || hp[0]].filter(Boolean);
      if (pts.length === 4) { const cx = pts.reduce((a, q) => a + q[0], 0) / 4, cy = pts.reduce((a, q) => a + q[1], 0) / 4; e.beginPath(); pts.forEach((q, i) => { const x = cx + (q[0] - cx) * 1.15, y = cy + (q[1] - cy) * 1.05; i ? e.lineTo(x, y) : e.moveTo(x, y); }); e.closePath(); e.fill(); } }
    if (info.neck) { e.beginPath(); e.arc(info.neck[0], info.neck[1], 0.08 * k, 0, Math.PI * 2); e.fill(); }
    e.restore();
  }
  function edge(c, st, lt) {
    const v = V().edge, A = v.anchors;
    const s = { dawn: key(lt, [[T.edge, 0.42], [40, 1.0, 'inOutSine']]) };
    c.camera({ x: 990, y: 560, zoom: 1.0 + 0.0022 * st });
    v.back(c, lt, s);
    const Th = tw(lt), p = RIG.key(Th, EDGE_KEYS);
    const rise = sstep(Th, T.rise, 40.0);
    const info = RIG.draw(c.g, 'daniel', Object.assign({ at: [A.seat[0] + 18 * rise, A.seat[1] - 0.06 * A.pxPerM * rise], scale: A.pxPerM, view: 'profile', facing: -1, body: 'sitbed', outfit: 'night', hold: 'phone', face: 'down', breath: breathOf(lt) }, p),
      { mode: 'silhouette', light: { x: v.light.x, y: v.light.y, color: v.light.color }, rimK: 0.6 + 0.6 * sstep(s.dawn, 0.4, 1), detail: 0.6 });
    occludeBloom(c, info, A.pxPerM);
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // THE SEQUENCE
  // ===============================================================================================================
  FILM.seq({
    id: 'Q01', title: 'Dawn', dur: 40,
    lines: [
      { id: 'L001', at: 12.0 },          // V.O.: Have you ever forgotten your phone?
      { id: 'L002', at: 16.2 },          // V.O.: I don't mean lost it. Just left it somewhere, and carried on as though you hadn't.
      { id: 'L003', at: 31.0 },          // V.O.: When did you realise?
    ],
    sound(S) {
      // the room at dawn: a quiet house, the faint hiss of the dark; the first birds from 25
      S.bed('room', T.alarm, 40, { level: -44, fi: 1.5, kind: 'dawn bedroom, very still' });
      S.bed('birds', 25, 40, { level: -50, fi: 6, kind: 'first birds at dawn, far, behind glass' });
      // the alarm, in the dark, before we see anything: the phone buzzing on the wood and its tone; two rings, the second cut off
      S.cue('vibrate', T.alarm, { n: 8, surface: 'bedside table, wood', level: -22 });
      S.cue('alarm', T.alarm, { n: 2, kind: 'phone alarm tone, first ring', level: -22 });
      S.cue('alarm', T.ring2, { n: 2, kind: 'phone alarm tone, second ring, cut off at ' + T.silence, cut: T.silence, level: -22 });
      S.cue('click', T.silence, { kind: 'thumb on glass: the alarm silenced', level: -32 });
      S.cue('sheet_rustle', 9.5, { level: -40 });
      S.cue('phone_turned_over', 19.8, { kind: 'the phone turned face down on the duvet', level: -40 });
      S.cue('sheet_rustle', 29.15, { level: -36, kind: 'he sits up, the duvet thrown back' });
      S.cue('bed_creak', 29.6, { level: -40 });
      S.cue('breath', 36.9, { dur: 1.1, kind: 'a long tired exhale through the nose', level: -38 });
      S.cue('bed_creak', 39.0, { level: -38, kind: 'he stands' });
    },
    shots: [
      { at: 0, name: 'black: the title (AUTOPILOT, A film by Osita Miles)', draw(c, st, lt) { title(c, st, lt); }, post: { grain: 0.035, halation: 0, vig: 0 } },
      { at: 5, name: 'the alarm: 6:14, shivering; a hand silences it on the second ring', draw(c, st, lt) { alarm(c, st, lt); }, post: { vig: 0.5 } },
      { at: 11, name: 'BATTERY 7%: his face in the black glass', draw(c, st, lt) { screen(c, st, lt); }, post: { vig: 0.45 } },
      { at: T.window, name: 'the dark window: the bed in the glass, her side empty', draw(c, st, lt) { windowShot(c, st, lt); } },
      { at: T.edge, name: 'dawn at the blind: he sits up on the edge of the bed', draw(c, st, lt) { edge(c, st, lt); } },
    ],
  });
})();
