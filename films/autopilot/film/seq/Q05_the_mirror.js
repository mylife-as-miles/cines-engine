/* AUTOPILOT · Q05 THE MIRROR (68 s) · S05, S06, A021–A027, L014–L019 · house (the drive), car
   The last time we see Emily in the car, and the film's central image (C2). Tender, never ominous: a hot morning, a sleepy
   girl, a kind and tired father. The grammar: every shot through glass. The car baking on the drive, its glass full of
   sky; the hot wheel seen through the windscreen; Emily buckled in, seen through the near rear window with the house laid
   over her in its reflection; the door's glass swinging shut on the reflected house; then Daniel's view, the rear-view
   mirror as the frame within the frame. When he tilts it to the traffic the back seat slides out of it for good: from
   then on (the end of this sequence and every later car shot) the mirror holds only the road behind.
   Deterministic. Characters on twos (FILM.twos), camera, light and glass on ones. */
(function () {
  'use strict';
  const { W, H } = OTM, P = LC.P;
  const clamp = OTM.clamp, lerp = OTM.lerp, mix = OTM.mix, rgba = OTM.rgba;
  const seg = FILM.seg, key = FILM.key, tw = FILM.twos, E = FILM.ease;
  const sstep = (t, a, b) => { const u = seg(t, a, b); return u * u * (3 - 2 * u); };
  const breathOf = t => (tw(t) * 0.25) % 1;                       // Daniel's 3 px breath at 0.25 Hz

  // ===============================================================================================================
  // 1 · THE DRIVE: the car baking (house set's drive view, the car set's car with its heat). The car unlocks itself.
  // ===============================================================================================================
  function drive(c, st) {
    const v = SETS.house && SETS.house.views && SETS.house.views.drive, s = { tod: 'morning' };
    c.camera({ x: 1040, y: 640, zoom: 1.0 + 0.0032 * st });     // a slow push toward the car (0.3% a second)
    if (!v) { c.g.fillStyle = '#C9D2CC'; c.g.fillRect(0, 0, W, H); return; }
    v.back(c, st, s);
    const blink = st >= 4.5 ? SETS.car.blink(st, 4.5, 1) : 0;   // the remote, from the porch: one flash, the locks lift
    if (SETS.car && SETS.car.exterior) SETS.car.exterior(c.g, { cam: v.cam, at: v.car.at, heading: v.car.heading, tod: 'morning', sun: v.sun(s), em: c.em, t: c.t, heat: 1, reflect: 'sky', indicators: blink });
    v.front(c, st, s);
  }

  // ===============================================================================================================
  // 2 · THE HOT WHEEL through the windscreen: his hand comes in through the open driver's door (screen left, behind the
  //     A-pillar), touches the rim where the sun burns it white, and recoils.
  // ===============================================================================================================
  function hotwheel(c, st) {
    const v = SETS.car.views.hotwheel, s = { tod: 'morning', heat: 1 }, g = c.g;
    c.camera({ zoom: 1.0 + 0.0025 * st, x: 980, y: 520 });
    v.back(c, c.t, s);
    const A = v.anchors, T = tw(st);
    if (A.rimTop) {
      // the hand's path (wrist point), fingers pointing right and a little down; the recoil is quick, the rest weary
      const tip = [A.rimTop[0] - 4, A.rimTop[1] - 6], size = 185;
      const home = [tip[0] - size * 0.86, tip[1] + 10];
      const wrist = key(T, [[0.4, [home[0] - 520, home[1] + 70]], [2.15, home, 'outCubic'], [2.42, home], [2.62, [home[0] - 120, home[1] - 70], 'outExpo'], [3.1, [home[0] - 150, home[1] - 40]], [4.3, [home[0] - 640, home[1] + 40], 'inOutSine']]);
      const rot = key(T, [[0.4, -4], [2.15, 8], [2.42, 9], [2.62, -18, 'outExpo'], [3.1, -10], [4.3, -6]]);
      const curl = key(T, [[0.4, 0.6], [2.0, 0.45], [2.42, 0.7], [2.62, 0.15, 'outExpo'], [3.2, 0.5], [4.3, 0.7]]);
      const shake = T > 2.62 && T < 3.3 ? 7 * Math.sin((T - 2.62) * 34) * (1 - seg(T, 2.62, 3.3)) : 0;
      if (T > 0.4 && T < 4.3) {
        const clip = (v._ws && v._ws.path) || null;
        g.save(); if (clip) g.clip(clip);
        RIG.hand(g, 'daniel', { at: [wrist[0], wrist[1] + shake], size, pose: 'reach', view: 'back', rot, curl, spread: 0.06, sleeve: 'day', side: 'R' }, { light: { x: 1500, y: -200, color: '#FFF1D8', back: 0.25 }, ambient: '#3A4446', ambientK: 0.12 });
        g.restore();
      }
    }
    v.front(c, c.t, s);
  }

  // ===============================================================================================================
  // 3 · BUCKLING HER IN, through the near rear window (from the car's far side, the passenger flank), the house laid over
  //     the glass in reflection. A small set of our own: the car set's car (see-through rear glass), the cabin and the
  //     bright far doorway behind it, Daniel bent in through that doorway, Emily in her seat with the rabbit.
  // ===============================================================================================================
  // two cameras on the same spot: the wide (the whole pane) and the close (the harness clip), each with its own caches
  const FAR_CAMS = {
    wide: { x: -2.2, y: 1.5, z: -0.45, yaw: 1.62, pitch: -0.12, f: 1500, cx: 960, cy: 470 },
    close: { x: -2.2, y: 1.5, z: -0.45, yaw: 1.62, pitch: -0.12, f: 3300, cx: 1050, cy: 150 },
  };
  const SUN = [-0.38, 0.62, -0.69];                                  // the house set's morning sun (car space = house axes)
  const FAR = {};                                                    // per camera: the car's window paths for the near rear glass
  function farInit(which) {
    if (FAR[which]) return FAR[which];
    const cam = LC.camera(FAR_CAMS[which]), cv = OTM.makeCanvas(W, H), g = cv.getContext('2d');
    const info = SETS.car.exterior(g, { cam, at: [0, 0, 0], heading: 0, tod: 'morning', sun: SUN, interior: false });
    const glass = new Path2D(); let box = null;
    (info.windows || []).filter(w => w.name === 'winRL' || w.name === 'winQL').forEach(w => { glass.addPath(w.path); const b = w.pane; box = box ? { x: Math.min(box.x, b.x), y: Math.min(box.y, b.y), x1: Math.max(box.x1, b.x + b.w), y1: Math.max(box.y1, b.y + b.h) } : { x: b.x, y: b.y, x1: b.x + b.w, y1: b.y + b.h }; });
    box = box ? { x: Math.max(0, Math.floor(box.x)), y: Math.max(0, Math.floor(box.y)), w: 0, h: 0, x1: Math.min(W, Math.ceil(box.x1)), y1: Math.min(H, Math.ceil(box.y1)) } : { x: 0, y: 0, x1: W, y1: H };
    box.w = box.x1 - box.x; box.h = box.y1 - box.y;
    return (FAR[which] = { cam, info, glass, box, win: (info.windows || []).find(w => w.name === 'winRL') });
  }
  const P3 = (cam, q) => cam.p(q[0], q[1], q[2]);
  function poly(g, cam, pts, col) { const sp = pts.map(q => P3(cam, q)); g.fillStyle = col; g.beginPath(); sp.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); return sp; }
  // the world beyond the car: the gravel's far strip, the hedge (sunlit), the neighbour's brick and the hazy sky
  function farWorld(g, cam) {
    g.fillStyle = LC.lin(g, 0, 0, 0, 560, [[0, '#BCCCCC'], [0.6, '#DCE2D8'], [1, '#F2ECDC']]); g.fillRect(0, 0, W, H);
    // the neighbour's house: a sunlit brick side wall with two windows, its roof against the sky
    poly(g, cam, [[6.2, -1, -14], [6.2, -1, 14], [6.2, 5.6, 14], [6.2, 5.6, -14]], '#C08058');
    for (let y = 0.2; y < 5.6; y += 0.3) poly(g, cam, [[6.19, y, -14], [6.19, y, 14], [6.19, y + 0.03, 14], [6.19, y + 0.03, -14]], 'rgba(120,70,46,0.18)');
    [[-3.4, -2.2], [-0.4, 0.8], [2.4, 3.6]].forEach(([z0, z1]) => { poly(g, cam, [[6.18, 2.9, z0], [6.18, 2.9, z1], [6.18, 4.2, z1], [6.18, 4.2, z0]], '#ECE6D6'); poly(g, cam, [[6.17, 3.0, z0 + 0.08], [6.17, 3.0, z1 - 0.08], [6.17, 4.1, z1 - 0.08], [6.17, 4.1, z0 + 0.08]], '#8FA2A4'); });
    poly(g, cam, [[6.25, 5.6, -14], [6.25, 5.6, 14], [7.8, 7.4, 14], [7.8, 7.4, -14]], '#7A5A4E');
    // the drive's gravel beyond the car, and the hedge along its far side, sunlit
    poly(g, cam, [[0.6, 0, -12], [0.6, 0, 12], [3.0, 0, 12], [3.0, 0, -12]], '#DED2B8');
    const R = OTM.rng('Q05hedge'), HX = 2.95, HH = 1.85;
    poly(g, cam, [[HX, 0, -12], [HX, 0, 12], [HX, HH, 12], [HX, HH, -12]], '#5E7444');
    for (let i = 0; i < 160; i++) { const z = -10 + R() * 20, y = 0.15 + R() * (HH - 0.1), r = 0.16 + R() * 0.2, p = P3(cam, [HX - 0.02, y, z]), k = cam.k(Math.max(0.5, p[2])); g.fillStyle = R() < 0.5 ? '#86994F' : '#4E6438'; g.beginPath(); g.ellipse(p[0], p[1], r * k * 0.6, r * k, 0, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 60; i++) { const z = -10 + R() * 20, p = P3(cam, [HX - 0.02, HH - 0.05 + R() * 0.12, z]), k = cam.k(Math.max(0.5, p[2])); g.fillStyle = '#B3BC6E'; g.beginPath(); g.ellipse(p[0], p[1], 0.12 * k, 0.15 * k, 0, 0, Math.PI * 2); g.fill(); }
  }
  // the cabin as seen through the near rear glass (static part: everything but the people), clipped to that glass
  function farCabin(g, which, world) {
    const F = farInit(which), cam = F.cam;
    g.save(); g.clip(F.glass);
    g.fillStyle = '#121819'; g.fillRect(0, 0, W, H);
    // headliner (in shade, catching a little sky), the far side above the belt (camera-agnostic: everything is projected)
    poly(g, cam, [[-0.82, 1.42, 0.6], [0.82, 1.42, 0.6], [0.82, 1.42, -1.7], [-0.82, 1.42, -1.7]], '#4C4B45');
    poly(g, cam, [[0.84, 0.96, 0.9], [0.84, 0.96, -1.7], [0.84, 1.42, -1.7], [0.84, 1.42, 0.9]], '#24292A');
    // the far rear doorway, open on the bright drive (the world through it, unfiltered), and the far front window (tinted)
    const door = [[0.86, 0.34, -0.22], [0.86, 0.34, -1.04], [0.86, 1.37, -1.04], [0.86, 1.37, -0.22]].map(q => P3(cam, q));
    g.save(); g.beginPath(); door.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.clip(); g.drawImage(world, 0, 0);
    // the open door itself, nearly end-on beyond the aperture: its dark inner skin and the edge of its glass
    poly(g, cam, [[0.88, 0.32, -0.22], [1.62, 0.32, -0.55], [1.62, 1.3, -0.55], [0.88, 1.38, -0.22]], '#1C2224');
    poly(g, cam, [[1.0, 0.95, -0.27], [1.55, 0.95, -0.52], [1.55, 1.27, -0.52], [1.0, 1.34, -0.27]], 'rgba(150,170,168,0.35)');
    g.restore();
    const fwin = [[0.86, 0.97, 0.05], [0.86, 0.97, 0.86], [0.86, 1.33, 0.6], [0.86, 1.36, 0.05]].map(q => P3(cam, q));
    g.save(); g.beginPath(); fwin.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.clip(); g.drawImage(world, 0, 0); g.fillStyle = 'rgba(14,22,24,0.55)'; g.fillRect(0, 0, W, H); g.restore();
    poly(g, cam, [[0.85, 0.3, -0.06], [0.85, 0.3, -0.22], [0.85, 1.42, -0.2], [0.85, 1.42, -0.04]], '#1A1F20');          // the far B-pillar
    poly(g, cam, [[0.85, 0.3, -1.04], [0.85, 0.3, -1.7], [0.85, 1.42, -1.7], [0.85, 1.42, -1.04]], '#181D1E');           // the far C-pillar
    // the rear bench: seatback and cushion in the cabin's teal shade, a seam
    poly(g, cam, [[-0.8, 0.5, -0.98], [0.8, 0.5, -0.98], [0.8, 1.12, -1.08], [-0.8, 1.12, -1.08]], '#28323A');
    poly(g, cam, [[-0.8, 0.5, -0.98], [0.8, 0.5, -0.98], [0.8, 0.52, -0.46], [-0.8, 0.52, -0.46]], '#2E3940');
    // the child seat behind the driver (car right rear): its shell seen from the inboard side, the teal insert, the far wing
    poly(g, cam, [[0.64, 0.52, -0.92], [0.64, 0.52, -0.34], [0.64, 0.7, -0.34], [0.64, 1.36, -0.86], [0.64, 1.36, -0.98]], '#1B2224');
    poly(g, cam, [[0.6, 0.66, -0.9], [0.22, 0.66, -0.9], [0.22, 1.3, -0.94], [0.6, 1.3, -0.94]], '#355150');
    poly(g, cam, [[0.2, 0.52, -0.92], [0.2, 0.52, -0.36], [0.2, 0.68, -0.34], [0.2, 0.74, -0.8], [0.2, 0.74, -0.92]], '#22302F');
    g.restore();
  }
  // in front of her: the near wing of her seat (it takes the back of her head) and the passenger seatback at the pane's edge
  function farFront(g, which) {
    const F = farInit(which), cam = F.cam; g.save(); g.clip(F.glass);
    poly(g, cam, [[0.2, 0.98, -0.95], [0.2, 0.98, -0.74], [0.2, 1.16, -0.7], [0.2, 1.32, -0.76], [0.2, 1.32, -0.96]], '#2B3B3C');
    poly(g, cam, [[0.2, 0.66, -0.92], [0.2, 0.66, -0.62], [0.2, 0.82, -0.64], [0.2, 0.88, -0.92]], '#253133');
    poly(g, cam, [[-0.62, 0.5, -0.12], [-0.62, 1.22, -0.2], [-0.14, 1.22, -0.2], [-0.14, 0.5, -0.12]], '#151B1C');
    poly(g, cam, [[-0.5, 1.24, -0.22], [-0.5, 1.44, -0.25], [-0.24, 1.44, -0.25], [-0.24, 1.24, -0.22]], '#1A2122');
    g.restore();
  }
  // the near glass itself (ours, laid over the cabin): the privacy tint, the house front behind the camera given back
  // (its brick and white windows, a band of sky above), a glare streak and dust. Cached as two layers per camera.
  let _houseRefl = null;
  function houseRefl() {
    if (_houseRefl) return _houseRefl;
    const cv = OTM.makeCanvas(1200, 560), g = cv.getContext('2d');
    if (SETS.house && SETS.house.facade) SETS.house.facade(g, { x: 0, y: 0, w: 1200, h: 560 }, { tod: 'morning' });
    else { g.fillStyle = '#B98660'; g.fillRect(0, 0, 1200, 560); }
    return (_houseRefl = cv);
  }
  function farGlassReflection(g, which) {
    const F = farInit(which), b = F.win ? F.win.pane : F.box, img = houseRefl(), s = (b.h / 560) * 1.6;
    g.save(); g.clip(F.glass);
    // mirrored, laid so the house's first floor and roof fill the pane's upper half and the lawn falls toward the sill
    g.save(); g.translate(b.x + b.w * 0.55, b.y - b.h * 0.25); g.scale(-s, s); g.drawImage(img, -600, 0); g.restore();
    g.fillStyle = LC.lin(g, 0, b.y, 0, b.y + b.h, [[0, '#E6EEEA', 0.55], [0.22, '#E6EEEA', 0.1], [0.6, '#000000', 0], [1, '#000000', 0.4]]); g.fillRect(b.x - 20, b.y - 20, b.w + 40, b.h + 40);
    LC.glare(g, null, { x: b.x + b.w * 0.42, y: b.y + b.h * 0.4, angle: -1.15, color: '#FFFFFF', bands: [{ d: -b.w * 0.08, w: b.w * 0.07, a: 0.22 }, { d: b.w * 0.02, w: b.w * 0.012, a: 0.3 }, { d: b.w * 0.3, w: b.w * 0.16, a: 0.08 }] });
    LC.specks(g, null, b, 'Q05farDust' + which, { n: which === 'close' ? 140 : 260, color: '#FFF3DA', rMin: 0.5, rMax: which === 'close' ? 2.2 : 1.4, aMin: 0.06, aMax: 0.35, scratch: 0.12 });
    g.restore();
  }
  function farTint(g, which) { const F = farInit(which); g.save(); g.clip(F.glass); g.fillStyle = '#6F8C90'; g.fillRect(0, 0, W, H); g.restore(); }
  // the plate: the world, the car on it (its own glass everywhere but the near rear pane, which we paint), static
  function farPlate(c, which) {
    const F = farInit(which);
    return c.cache('Q05:far:plate:' + which, gg => {
      const tmp = OTM.makeCanvas(W, H), tg = tmp.getContext('2d'); farWorld(tg, F.cam); gg.drawImage(LC.blurred(tmp, which === 'close' ? 5 : 2.5), 0, 0);
      SETS.car.exterior(gg, { cam: F.cam, at: [0, 0, 0], heading: 0, tod: 'morning', sun: SUN, interior: false, reflect: 'house', reflectStrength: 0.5 });
    });
  }
  // the far side's world seen through the far doorway (same camera, unblurred less: it is what the pane looks onto)
  function farWorldLayer(c, which) { const F = farInit(which); return c.cache('Q05:far:world:' + which, gg => { const tmp = OTM.makeCanvas(W, H), tg = tmp.getContext('2d'); farWorld(tg, F.cam); gg.drawImage(LC.blurred(tmp, which === 'close' ? 4 : 1.6), 0, 0); }); }
  function buckleFar(c, st, lt, which) {
    const F = farInit(which), cam = F.cam, g = c.g, b = F.box;
    c.camera({ zoom: 1.0 + (which === 'close' ? 0.006 : 0.0022) * st, x: 960, y: which === 'close' ? 560 : 540 });
    g.drawImage(farPlate(c, which), 0, 0);
    const world = farWorldLayer(c, which);
    g.drawImage(c.cache('Q05:far:cabin:' + which, gg => farCabin(gg, which, world)), b.x, b.y, b.w, b.h, b.x, b.y, b.w, b.h);
    // the people, inside the near glass
    const T = tw(lt), L = { x: 2300, y: 160, color: '#FFE6BE', back: 0.35 };
    g.save(); g.clip(F.glass);
    // where his hands work: her straps at the shoulders, then (from 20.6) the chest clip; the clip in car space
    const clip3 = [0.47, 0.86, -0.47], clipS = P3(cam, clip3);
    const shR = P3(cam, [0.52, 0.98, -0.6]), shL = P3(cam, [0.33, 0.99, -0.58]);
    const toClip = sstep(T, 20.5, 21.9), work = Math.sin(T * 2.4), k1 = cam.k(clipS[2]);
    const handR = [lerp(shR[0], clipS[0] + 0.03 * k1, toClip) + 0.012 * k1 * work, lerp(shR[1], clipS[1], toClip) + 0.01 * k1 * Math.cos(T * 2.4)];
    const handL = [lerp(shL[0], clipS[0] - 0.03 * k1, toClip) - 0.01 * k1 * work, lerp(shL[1], clipS[1] + 0.01 * k1, toClip)];
    // Daniel, bent in through the far doorway, facing us across the cabin, intent and gentle
    const dFeet = P3(cam, [1.36, 0, -0.66]), dk = cam.k(P3(cam, [1.2, 1.0, -0.66])[2]);
    const lean = key(T, [[12, 1.05], [13.0, 1.18], [19.5, 1.2], [20.6, 1.28], [22.4, 1.3]]);
    RIG.draw(g, 'daniel', { at: [dFeet[0], dFeet[1]], scale: dk, view: 'front', yaw: 10, facing: 1, body: 'stand', lean, crouch: 0.3, outfit: 'day', collar: 'straight', armR: { to: handR, depth: 0.5 }, armL: { to: handL, depth: 0.5 },
      face: 'tired', eyes: 'down', smile: key(T, [[12, 0.15], [16.6, 0.15], [17.2, 0.4], [19.5, 0.4], [20.2, 0.2]]), browIn: 0.3, head: { nod: 0.45, turn: 0.06, tilt: 0.06 }, breath: breathOf(lt) },
      { light: Object.assign({}, L, { back: 0.6 }), exposure: 0.92, ambient: '#24363A', ambientK: 0.12 });
    // Emily in her seat, nearly in profile (facing the front), the rabbit up under her chin, sleepy; she looks up at him
    const eSeat = P3(cam, [0.42, 0.66, -0.64]), ek = cam.k(P3(cam, [0.42, 1.0, -0.64])[2]);
    const look = key(T, [[12, 0.12], [15.4, 0.12], [16.2, -0.3], [18.6, -0.3], [19.4, 0.25], [22.6, 0.25]]);
    RIG.draw(g, 'emily', { at: [eSeat[0], eSeat[1]], scale: ek, view: 'profile', yaw: 72, facing: -1, body: 'carseat', harness: true, holdR: 'rabbit', armR: 'hug', armL: 'hug', face: 'sleepy',
      lid: key(T, [[12, 0.42], [16.2, 0.3], [18.6, 0.35], [21, 0.55]]), gaze: [0.3, key(T, [[12, -0.2], [16.2, -0.6], [18.6, -0.6], [19.4, 0.3]])], head: { turn: look, nod: key(T, [[12, 0.2], [16.2, 0.0], [18.6, 0.0], [19.4, 0.3]]), tilt: -0.04 } },
      { light: L, ambient: '#1F3538', ambientK: 0.16 });
    // his hands meet at the chest clip in front of her, and press it shut: CLICK (22.4)
    if (T > 20.6) {
      const press = seg(T, 22.12, 22.4), hs = dk * 0.19 * (which === 'close' ? 1 : 1);
      RIG.hand(g, 'daniel', { at: [clipS[0] + 0.07 * k1 - 0.02 * k1 * press, clipS[1] + 0.03 * k1], size: hs, pose: 'grip', view: 'back', rot: -168, curl: 0.75 + 0.25 * press, sleeve: 'day', side: 'R' }, { light: L, exposure: 0.92 });
      RIG.hand(g, 'daniel', { at: [clipS[0] - 0.07 * k1 + 0.02 * k1 * press, clipS[1] + 0.035 * k1], size: hs, pose: 'grip', view: 'back', rot: -14, curl: 0.75 + 0.25 * press, sleeve: 'day', side: 'L' }, { light: L, exposure: 0.92 });
    }
    g.restore();
    farFront(g, which);
    // the glass: tint (multiply), what it gives back (screen)
    g.save(); g.globalCompositeOperation = 'multiply'; g.drawImage(c.cache('Q05:far:tint:' + which, gg => farTint(gg, which)), b.x, b.y, b.w, b.h, b.x, b.y, b.w, b.h); g.restore();
    g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.5; g.drawImage(c.cache('Q05:far:refl:' + which, gg => farGlassReflection(gg, which)), b.x, b.y, b.w, b.h, b.x, b.y, b.w, b.h); g.restore();
  }

  // ===============================================================================================================
  // 4 · THE DOOR SWINGS SHUT on the reflected house (car set's buckle view, tight on the window): once it is shut the
  //     privacy glass shows nothing but the house.
  // ===============================================================================================================
  function doorShut(c, st, lt) {
    const v = SETS.car.views.buckle, d = key(lt, [[22.75, 1], [23.6, 0, 'inCubic']]);
    const bump = lt > 23.6 ? 5 * Math.exp(-(lt - 23.6) * 9) * Math.sin((lt - 23.6) * 60) : 0;
    c.camera({ zoom: 1.0, dy: bump });
    const s = { door: d, close: 0.85 };
    v.back(c, c.t, s); v.front(c, c.t, s);
  }

  // ===============================================================================================================
  // 5–10 · DANIEL'S VIEW: the rear-view mirror in the windscreen (C2's camera, the car set's pov view)
  // ===============================================================================================================
  // Emily's performance in mirror space (1000 × 340, the image's right is the car's right; the headrest is on the right)
  const EM_KEYS = [
    [24.2, { at: [604, 172], face: 'squint', squint: 0.55, brow: 0, browKnit: 0.2, side: 0, head: { turn: 0.1, nod: 0.05, tilt: 0 } }],
    [26.4, { at: [606, 172], face: 'squint', squint: 0.9, brow: -0.2, browKnit: 0.6, side: 0, head: { turn: 0.16, nod: 0.08, tilt: 0.03 } }],
    [28.6, { at: [606, 173], face: 'squint', squint: 1.0, brow: -0.3, browKnit: 0.8, side: 0.05, head: { turn: 0.1, nod: 0.12, tilt: 0.02 } }],
    [29.4, { at: [612, 175], face: 'squint', squint: 1.0, brow: -0.3, browKnit: 0.8, side: 0.08, head: { turn: -0.05, nod: 0.1, tilt: -0.04 } }],
    [30.9, { at: [650, 182], face: 'squint', squint: 1.0, brow: -0.2, browKnit: 0.7, side: 0.2, head: { turn: -0.55, nod: 0.12, tilt: -0.15 } }],
    [33.2, { at: [652, 182], face: 'pout', squint: 0.7, lid: 0.35, side: 0.22, head: { turn: -0.5, nod: 0.18, tilt: -0.12 } }],
    [36.4, { at: [654, 183], face: 'pout', squint: 0.6, lid: 0.4, side: 0.25, head: { turn: -0.45, nod: 0.2, tilt: -0.08 } }],
    [37.4, { at: [660, 184], face: 'sleepy', squint: 0.3, lid: 0.45, side: 0.3, head: { turn: -0.35, nod: 0.2, tilt: 0.05 } }],
    [40.6, { at: [712, 188], face: 'sleepy', squint: 0, lid: 0.55, side: 0.75, head: { turn: -0.2, nod: 0.15, tilt: 0.4 } }],
    [45.2, { at: [714, 188], face: 'sleepy', squint: 0, lid: 0.66, side: 0.76, head: { turn: -0.2, nod: 0.16, tilt: 0.41 } }],
    [45.6, { at: [714, 190], face: 'sleepy', squint: 0, lid: 0.7, side: 0.76, head: { turn: -0.2, nod: 0.28, tilt: 0.42 } }],
    [46.2, { at: [714, 188], face: 'sleepy', squint: 0, lid: 0.7, side: 0.77, head: { turn: -0.2, nod: 0.17, tilt: 0.42 } }],
    [50.8, { at: [748, 191], face: 'sleepy', squint: 0, lid: 0.82, side: 0.86, head: { turn: -0.14, nod: 0.2, tilt: 0.45 } }],
    [53.8, { at: [752, 192], face: 'sleep', squint: 0, lid: 1, side: 0.88, head: { turn: -0.12, nod: 0.22, tilt: 0.46 } }],
  ];
  function emilyInMirror(lt) {
    return (g, M) => {
      const T = tw(lt), p = RIG.key(T, EM_KEYS), S = M.strip, x = p.at[0];
      const br = 0.02 * Math.sin(T * Math.PI * 2 * 0.3);
      RIG.face(g, 'emily', Object.assign({ size: 190, view: 'front', body: 'carseat', harness: true, holdR: 'rabbit', armR: 'hug', armL: 'hug', facing: -1, breath: (T * 0.3) % 1 }, p, { at: [p.at[0], p.at[1] + br] }),
        { light: { x: 80, y: 120, color: '#FFF4DE', back: 0.45 }, band: { y0: S.yT(x) + 2, y1: S.yB(x), x1: S.shadeX, soft: 26 }, mirror: true, mirrorX: p.at[0], ambient: '#355150', ambientK: 0.12 });
    };
  }
  // the mirror's quad at a tilt (as the car set turns it round its ball joint), for his hand
  function mirrorQuadAt(v, tilt) {
    const MQ = v.anchors.mirror, MB = v.anchors.ball, a = -0.045 * tilt, ca = Math.cos(a), sa = Math.sin(a), sy = 1 - 0.03 * tilt;
    const T = q => { const dx = q[0] - MB[0], dy = (q[1] - MB[1]) * sy; return [MB[0] + dx * ca - dy * sa, MB[1] + dx * sa + dy * ca + 5 * tilt]; };
    return { tl: T(MQ.tl), tr: T(MQ.tr), br: T(MQ.br), bl: T(MQ.bl) };
  }
  const TILT0 = 52.9, TILT1 = 56.7, IGN = 58.4;
  function povState(lt) {
    const tilt = E.inOutSine(seg(lt, TILT0, TILT1));
    const dash = seg(lt, IGN, IGN + 0.8, 'outCubic');
    return { tod: 'morning', tilt, stripOver: false, dash, vibrate: lt > IGN ? 0.55 : 0, inMirror: tilt < 1 ? emilyInMirror(lt) : undefined };
  }
  // the car's own shiver (engine), and the small rock when he drops into his seat
  function povShake(lt) {
    let dx = 0, dy = 0;
    if (lt > 24.4 && lt < 25.6) { const u = lt - 24.55; if (u > 0) dy += 4 * Math.exp(-u * 6) * Math.sin(u * 22); }
    if (lt > IGN) { const u = lt - IGN, jolt = 3.5 * Math.exp(-u * 5); dx += (0.9 + jolt) * FILM.wob(lt, 17, 5); dy += (0.9 + jolt) * FILM.wob(lt, 19, 11); }
    return { dx, dy };
  }
  function pov(c, st, lt, frame) {
    const v = SETS.car.views.pov, s = povState(lt), sh = povShake(lt);
    c.camera(Object.assign({ x: frame.x, y: frame.y, zoom: frame.z0 * (1 + (frame.push || 0) * st) }, sh));
    v.back(c, c.t, s);
    // his left hand on the mirror: up from his side, the fingers round the housing's far end, a turn, and away
    if (lt > 51.8 && lt < 58.0) {
      const T = tw(lt), tiltNow = E.inOutSine(seg(T, TILT0, TILT1)), Q = mirrorQuadAt(v, tiltNow);
      const grip = [Q.tr[0] * 0.55 + Q.br[0] * 0.45 + 12, Q.tr[1] * 0.55 + Q.br[1] * 0.45 + 28];
      const away = [grip[0] + 330, grip[1] + 640];
      const k = Math.max(seg(T, 51.8, 52.8, 'outCubic') - seg(T, 57.0, 58.0, 'inCubic'), 0);
      const wrist = [lerp(away[0], grip[0] + 120, k), lerp(away[1], grip[1] + 170, k)];
      RIG.hand(c.g, 'daniel', { at: wrist, size: 330, pose: 'grip', view: 'back', rot: -128 - 6 * tiltNow, curl: lerp(0.35, 0.95, seg(T, 52.4, 52.9)), sleeve: 'day', side: 'L' },
        { light: { x: 588, y: 244, color: '#FFF1D8', back: 0.9 }, ambient: '#202826', ambientK: 0.35, exposure: 0.8 });
    }
    v.front(c, c.t, s);
  }

  // ===============================================================================================================
  // THE SEQUENCE
  // ===============================================================================================================
  FILM.seq({
    id: 'Q05', title: 'The mirror', dur: 68,
    setup() { farInit('wide'); farInit('close'); houseRefl(); },
    lines: [
      { id: 'L014', at: 28.0 },          // Emily: "Bad sun."
      { id: 'L015', at: 30.4 },          // Daniel: "What's it done now?"
      { id: 'L016', at: 33.0 },          // Emily: "It's in my eyes. It won't let me have my little sleep."
      { id: 'L017', at: 44.0 },          // Daniel: "Better?"
      { id: 'L018', at: 45.4 },          // Emily: "Mm-hmm." (stacks under "Better?", as in C2)
      { id: 'L019', at: 48.0 },          // Daniel: "You can sleep a bit. I'll wake you when we get there."
    ],
    sound(S) {
      // outside: the baked morning
      S.bed('heat', 0, 24.4, { level: -50 });
      S.bed('birds', 0, 24.4, { level: -40 });
      S.bed('lawnmower_distant', 0, 24.4, { level: -50 });
      S.cue('car_unlock', 4.5, { level: -26 });                    // the remote from the porch: the locks lift, one flash
      S.cue('footsteps', 4.9, { n: 4, surface: 'gravel', level: -34 });
      S.cue('door', 6.25, { kind: 'driver_open', level: -20 });     // the driver's door opens (the hand comes in)
      S.cue('breath', 8.42, { dur: 0.45, kind: 'sharp_hiss', level: -28 });   // the hot wheel: a hiss of breath through his teeth
      S.cue('door', 11.85, { kind: 'rear_open', level: -22 });     // sound bridge into the buckle shot
      S.cue('child_seat_rustle', 12.6, { level: -34 });
      S.cue('harness_strap', 15.2, { level: -32 });
      S.cue('harness_strap', 18.9, { level: -32 });
      S.cue('harness', 22.4);                                       // CLICK: the harness fastens
      S.cue('door', 23.6);                                          // CLICK: the rear door closes
      // inside the car: the world goes muffled behind glass
      S.bed('cabin_hush', 24.4, 68, { level: -46 });
      S.bed('birds', 24.4, 58.4, { level: -54, filter: 'behind_glass' });
      S.cue('door', 24.55, { kind: 'driver_close_inside', level: -16 });
      S.cue('seat_creak', 24.7, { level: -34 });
      S.cue('mirror_creak', 53.0, { level: -30 });                  // the mirror's ball joint as he turns it
      S.cue('ignition', IGN);
      S.bed('engine', IGN + 0.1, 68, { f: 34, level: -36 });
      S.cue('radio_click', 62.2, { level: -30 });
      S.bed('radio_music', 62.3, 68, { level: -30, speaker: 'small', mood: 'bright morning radio' });
    },
    shots: [
      { at: 0, name: 'ext: the car baking on the drive', draw(c, st, lt) { drive(c, st); } },
      { at: 6, name: 'ext: the hot wheel, through the windscreen', draw(c, st, lt) { hotwheel(c, st); } },
      { at: 12, name: 'ext: buckling her in, through the near rear window', draw(c, st, lt) { buckleFar(c, st, lt, 'wide'); } },
      { at: 21.4, name: 'ext: the harness clip, close, through the glass', draw(c, st, lt) { buckleFar(c, st, lt, 'close'); } },
      { at: 22.62, name: 'ext: the door swings shut on the reflected house', draw(c, st, lt) { doorShut(c, st, lt); } },
      { at: 24.2, name: 'pov: the hard white strip across her face', draw(c, st, lt) { pov(c, st, lt, { x: 960, y: 540, z0: 1.0, push: 0.003 }); } },
      { at: 30.2, name: 'mirror: she squints and turns away', draw(c, st, lt) { pov(c, st, lt, { x: 895, y: 566, z0: 1.4, push: 0.0035 }); } },
      { at: 36.8, name: 'mirror: she leans into the shade', draw(c, st, lt) { pov(c, st, lt, { x: 905, y: 556, z0: 1.2, push: 0.003 }); } },
      { at: 43.8, name: 'pov: Better? Mm-hmm. (C2)', draw(c, st, lt) { pov(c, st, lt, { x: 960, y: 540, z0: 1.0, push: 0.0028 }); } },
      { at: 51.6, name: 'pov: he tilts the mirror to the traffic; the engine', draw(c, st, lt) { pov(c, st, lt, { x: 960, y: 540, z0: 1.0, push: 0.0012 }); } },
      { at: 62.2, name: 'mirror: the empty road behind', draw(c, st, lt) { pov(c, st, lt, { x: 895, y: 560, z0: 1.42, push: 0.004 }); } },
    ],
  });
})();
