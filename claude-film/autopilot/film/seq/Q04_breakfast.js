/* AUTOPILOT · Q04 · BREAKFAST (66 s) · S04, A014–A020, L006–L013 · kitchen (table, pour, mug, plate, clock, counter, hall)
   The warmth of the film: Emily. We look in through the kitchen window from the garden, the garden's trees and sky laid over
   the glass, the higher sun in the room. Emily studies a piece of toast as if it has personally disappointed her; Daniel
   pours cereal, caps his travel mug, wipes a little milk from her chin with his thumb; "I don't want this bit." He cuts the
   crust off; the solemn nod. "Are you getting me today?" The clock's glass says 7:58. "Not late. Promise." He kisses the top
   of her head and she reaches up and straightens his crooked collar, imitating her mother: the film's tenderest image.
   Then the sweep: at the counter, his hands gather coffee, keys and wallet in one practised movement, past the phone, which
   they do not touch. The hall: the bag, the door opened with his elbow, its glass blazing, Emily already at the threshold.
   Behind them, the phone on the counter (C1), charging quietly; in its black glass the front door closes on the hall.
   Deterministic. Characters on twos (FILM.twos); camera, light, glass, steam and cereal on ones. */
(function () {
  'use strict';
  const { W, H } = OTM, P = LC.P;
  const clamp = OTM.clamp, lerp = OTM.lerp, rgba = OTM.rgba;
  const seg = FILM.seg, key = FILM.key, tw = FILM.twos, E = FILM.ease;
  const sstep = (t, a, b) => { const u = seg(t, a, b); return u * u * (3 - 2 * u); };
  const breathOf = t => (tw(t) * 0.25) % 1;
  const KV = () => SETS.kitchen.views;

  // ---------------------------------------------------------------------------------------------------------------
  // hands: put a chosen point of a RIG hand insert on a target (offset measured once per pose)
  // ---------------------------------------------------------------------------------------------------------------
  const _off = {};
  function handOffset(pose, ref) {
    const k = JSON.stringify([pose.pose, pose.size, pose.view, Math.round(pose.rot || 0), Math.round(pose.roll || 0), Math.round((pose.curl == null ? 1 : pose.curl) * 20), pose.side, pose.obj, ref]);
    if (_off[k]) return _off[k];
    const g = OTM.makeCanvas(8, 8).getContext('2d'), info = RIG.hand(g, 'daniel', Object.assign({}, pose, { at: [0, 0] }), {});
    let o = [0, 0];
    if (info) { const pts = ref === 'pinch' ? [info.thumb, info.tips[0]] : ref === 'fist' ? info.tips.concat([info.thumb]) : ref === 'thumb' ? [info.thumb] : [info.tips[ref | 0]];
      o = [pts.reduce((a, q) => a + q[0], 0) / pts.length, pts.reduce((a, q) => a + q[1], 0) / pts.length]; }
    return (_off[k] = o);
  }
  const handAt = (g, pose, target, ref, opts) => { const o = handOffset(pose, ref); return RIG.hand(g, 'daniel', Object.assign({}, pose, { at: [target[0] - o[0], target[1] - o[1]] }), opts || {}); };

  // ---------------------------------------------------------------------------------------------------------------
  // the beats
  // ---------------------------------------------------------------------------------------------------------------
  const T = { pour: 5.0, mug: 7.6, wipe: 10.0, crustTalk: 14.0, plate: 21.0, nod: 24.4, getting: 27.0, clock: 33.4, promise: 37.0, kiss: 40.0, sweep: 48.0, hall: 51.6, door: 56.0, collarFixed: 44.4 };

  // ===============================================================================================================
  // THE TABLE, through the kitchen window from the garden: one continuous performance (10–48 s), cut into framings.
  // ===============================================================================================================
  const DK = [   // Daniel, standing at the table's right end behind it, facing her (feet offset px, pose)
    [10.0, { dx: 0, lean: 0.35, crouch: 0.05, face: 'warm', smile: 0.12, lid: 0.42, head: { nod: 0.3, turn: 0.16, tilt: 0.03 } }],
    [10.9, { dx: -60, lean: 0.85, crouch: 0.14, face: 'warm', smile: 0.22, lid: 0.45, head: { nod: 0.38, turn: 0.22, tilt: 0.06 } }],
    [12.3, { dx: -60, lean: 0.85, crouch: 0.14, face: 'warm', smile: 0.25, lid: 0.45, head: { nod: 0.36, turn: 0.22, tilt: 0.06 } }],
    [13.2, { dx: -10, lean: 0.4, crouch: 0.06, face: 'warm', smile: 0.15, lid: 0.42, head: { nod: 0.3, turn: 0.18, tilt: 0.03 } }],
    [16.4, { dx: -10, lean: 0.42, crouch: 0.06, face: 'warm', smile: 0.18, lid: 0.42, head: { nod: 0.34, turn: 0.2, tilt: 0.04 } }],
    [16.9, { dx: -10, lean: 0.45, crouch: 0.06, face: 'warm', smile: 0.32, lid: 0.38, brow: 0.2, head: { nod: 0.3, turn: 0.2, tilt: 0.06 } }],   // "That's the crust." amused
    [19.4, { dx: -10, lean: 0.45, crouch: 0.06, face: 'warm', smile: 0.36, lid: 0.4, brow: 0.25, head: { nod: 0.36, turn: 0.2, tilt: 0.08 } }],  // "I know what it is."
    [24.4, { dx: -40, lean: 0.6, crouch: 0.08, face: 'warm', smile: 0.25, lid: 0.45, head: { nod: 0.45, turn: 0.2, tilt: 0.04 } }],
    [26.0, { dx: -20, lean: 0.45, crouch: 0.06, face: 'warm', smile: 0.3, lid: 0.42, head: { nod: 0.34, turn: 0.2, tilt: 0.04 } }],
    [29.4, { dx: -20, lean: 0.42, crouch: 0.06, face: 'warm', smile: 0.22, lid: 0.42, head: { nod: 0.34, turn: 0.22, tilt: 0.04 } }],
    [30.2, { dx: -20, lean: 0.45, crouch: 0.06, face: 'warm', smile: 0.32, lid: 0.4, head: { nod: 0.46, turn: 0.22, tilt: 0.04 } }],          // "Of course. After work." a nod
    [32.2, { dx: -20, lean: 0.42, crouch: 0.06, face: 'warm', smile: 0.25, lid: 0.42, head: { nod: 0.34, turn: 0.2, tilt: 0.04 } }],
    [33.2, { dx: -20, lean: 0.35, crouch: 0.04, face: 'tired', smile: 0.05, lid: 0.4, head: { nod: 0.1, turn: -0.35, tilt: 0.0 } }],          // he looks at the clock
    [37.2, { dx: -20, lean: 0.35, crouch: 0.04, face: 'tired', smile: 0.05, lid: 0.4, head: { nod: 0.12, turn: -0.3, tilt: 0.0 } }],
    [37.8, { dx: -20, lean: 0.45, crouch: 0.06, face: 'warm', smile: 0.3, lid: 0.42, head: { nod: 0.36, turn: 0.2, tilt: 0.06 } }],           // "Not late. Promise."
    [40.2, { dx: -30, lean: 0.5, crouch: 0.06, face: 'warm', smile: 0.3, lid: 0.45, head: { nod: 0.36, turn: 0.22, tilt: 0.06 } }],
    [40.9, { dx: -150, lean: 1.65, crouch: 0.22, face: 'warm', smile: 0.2, lid: 1.0, head: { nod: 0.6, turn: 0.32, tilt: 0.1 } }],          // the kiss on the top of her head
    [41.7, { dx: -150, lean: 1.62, crouch: 0.22, face: 'warm', smile: 0.25, lid: 1.0, head: { nod: 0.58, turn: 0.32, tilt: 0.1 } }],
    [42.2, { dx: -150, lean: 1.5, crouch: 0.22, face: 'warm', smile: 0.32, lid: 0.55, head: { nod: 0.25, turn: 0.28, tilt: 0.1 } }],          // she reaches up; he stays bent for her
    [45.3, { dx: -150, lean: 1.5, crouch: 0.22, face: 'warm', smile: 0.38, lid: 0.5, head: { nod: 0.22, turn: 0.28, tilt: 0.1 } }],
    [46.4, { dx: -40, lean: 0.45, crouch: 0.06, face: 'warm', smile: 0.4, lid: 0.42, head: { nod: 0.32, turn: 0.2, tilt: 0.06 } }],          // "Thank you, boss."
    [48.0, { dx: -20, lean: 0.35, crouch: 0.04, face: 'warm', smile: 0.25, lid: 0.42, head: { nod: 0.2, turn: -0.1, tilt: 0.0 } }],
  ];
  const EK = [   // Emily, on her booster at the table
    [0.0, { lid: 0.48, face: 'pout', browKnit: 0.5, head: { nod: 0.18, turn: 0.08, tilt: -0.1 } }],
    [2.4, { lid: 0.5, face: 'pout', browKnit: 0.6, head: { nod: 0.16, turn: 0.02, tilt: 0.08 } }],
    [4.6, { lid: 0.46, face: 'pout', browKnit: 0.65, head: { nod: 0.2, turn: 0.1, tilt: -0.06 } }],
    [10.0, { lid: 0.5, face: 'sleepy', browKnit: 0.2, head: { nod: 0.28, turn: 0.1, tilt: 0.0 } }],
    [10.9, { lid: 0.55, face: 'sleepy', browKnit: 0.1, head: { nod: -0.1, turn: 0.28, tilt: 0.06 } }],     // chin up for his thumb
    [12.4, { lid: 0.55, face: 'sleepy', browKnit: 0.1, head: { nod: -0.08, turn: 0.28, tilt: 0.06 } }],
    [13.4, { lid: 0.5, face: 'pout', browKnit: 0.5, head: { nod: 0.12, turn: 0.15, tilt: -0.04 } }],
    [14.2, { lid: 0.42, face: 'pout', browKnit: 0.6, head: { nod: -0.12, turn: 0.3, tilt: 0.0 } }],         // "I don't want this bit."
    [16.6, { lid: 0.46, face: 'pout', browKnit: 0.55, head: { nod: 0.12, turn: 0.12, tilt: -0.06 } }],
    [19.1, { lid: 0.52, face: 'solemn', browKnit: 0.75, brow: -0.3, head: { nod: -0.15, turn: 0.32, tilt: 0.04 } }],   // "I know what it is."
    [24.4, { lid: 0.45, face: 'solemn', browKnit: 0.3, head: { nod: 0.06, turn: 0.3, tilt: 0.02 } }],
    [25.0, { lid: 1.0, face: 'solemn', browKnit: 0.2, head: { nod: 0.52, turn: 0.28, tilt: 0.02 } }],       // the solemn nod
    [25.8, { lid: 0.5, face: 'solemn', browKnit: 0.2, head: { nod: 0.04, turn: 0.3, tilt: 0.02 } }],
    [27.0, { lid: 0.36, face: 'solemn', browKnit: 0.1, browIn: 0.3, head: { nod: -0.32, turn: 0.32, tilt: 0.06 } }],  // "Are you getting me today?"
    [30.4, { lid: 0.42, face: 'solemn', smile: 0.12, browIn: 0.2, head: { nod: -0.25, turn: 0.32, tilt: 0.04 } }],
    [32.4, { lid: 0.3, face: 'solemn', browIn: 0.6, head: { nod: -0.34, turn: 0.32, tilt: 0.08 } }],         // "Not late?"
    [37.0, { lid: 0.34, face: 'solemn', browIn: 0.5, head: { nod: -0.3, turn: 0.32, tilt: 0.06 } }],
    [38.6, { lid: 0.42, face: 'solemn', smile: 0.1, browIn: 0.2, head: { nod: -0.08, turn: 0.3, tilt: 0.04 } }],   // a small satisfied nod
    [39.6, { lid: 0.42, face: 'solemn', smile: 0.1, browIn: 0.2, head: { nod: -0.22, turn: 0.3, tilt: 0.04 } }],
    [40.8, { lid: 0.9, face: 'solemn', smile: 0.15, head: { nod: 0.25, turn: 0.2, tilt: 0.02 } }],           // the kiss: eyes close
    [41.8, { lid: 0.8, face: 'solemn', smile: 0.15, head: { nod: 0.2, turn: 0.22, tilt: 0.04 } }],
    [42.3, { lid: 0.32, face: 'solemn', gaze: [0.2, 0.6], head: { nod: -0.42, turn: 0.25, tilt: 0.12 } }],   // the collar, imitating her mother
    [45.3, { lid: 0.34, face: 'solemn', gaze: [0.2, 0.6], head: { nod: -0.4, turn: 0.25, tilt: 0.1 } }],
    [46.2, { lid: 0.4, face: 'solemn', smile: 0.12, head: { nod: -0.25, turn: 0.28, tilt: 0.06 } }],
    [48.0, { lid: 0.42, face: 'solemn', smile: 0.1, head: { nod: -0.1, turn: 0.15, tilt: 0.0 } }],
  ];
  // her arms: the toast held up to be judged; the crust shown to him; the collar
  function emilyArms(Th, collar) {
    if (Th < 10.0) return { armR: { hand: [0.1, -0.04, 0.3], palm: 'in' }, holdR: 'toast', armL: 'desk' };      // held out, at arm's length, judged
    if (Th < 14.0) return { armR: 'desk', armL: 'desk' };
    if (Th < 21.0) return { armR: { hand: [0.12, 0.03 - 0.06 * sstep(Th, 19.0, 20.0), 0.32], palm: 'in' }, holdR: 'toast', armL: 'desk' };   // shown to him
    if (Th >= 42.0 && Th < 45.5 && collar) {
      const work = 4 * Math.sin(Th * Math.PI * 2 * 1.3), reach = sstep(Th, 42.0, 42.6) * (1 - sstep(Th, 45.0, 45.5));
      if (reach > 0.05) return { armR: { to: [collar[0] + 14 + work, collar[1] - 6], palm: 'fwd', pole: [0.9, -0.6, 0], depth: 0.1 }, armL: { to: [collar[0] - 26 - work, collar[1] + 4], palm: 'fwd', pole: [0.9, -0.6, 0], depth: 0.16 } };
    }
    return { armR: 'desk', armL: 'desk' };
  }
  function danielArms(Th, A, emilyChin) {
    if (Th > 10.7 && Th < 12.6 && emilyChin) {          // his thumb at her chin
      const w = 6 * Math.sin((Th - 10.9) * Math.PI * 2 * 0.9);
      return { armR: { to: [emilyChin[0] + 26 + w, emilyChin[1] + 6], depth: 0.38, palm: 'in' }, armL: 'relaxed' };
    }
    if (Th > 23.8 && Th < 25.6) return { armR: { to: [A.plate[0] + 60, A.plate[1] - 10], depth: 0.4 }, armL: 'relaxed', holdR: 'knife' };
    if (Th > 40.2 && Th < 46.0) return { armR: { hand: [0.02, -0.38, 0.22] }, armL: { hand: [0.06, -0.36, 0.3] } };   // his hands on his knees, bent for her
    return { armR: 'relaxed', armL: 'relaxed' };
  }
  // A pushed shot draws its whole frame at identity into one offscreen canvas, then resamples that once through the camera
  // (instead of every full-frame set layer being resampled on its own). The emissive buffer takes the camera directly.
  // Nothing in the table's frame moves but the people, who move on twos: the identity frame serves two frames (the set's
  // small emissive glow, the hall doorway, is laid again on the frame that reuses it).
  let _ofs = null;
  function viaOffscreen(c, cam, key2, fn, emFn) {
    const cv = _ofs || (_ofs = OTM.makeCanvas(W, H)), og = cv.getContext('2d');
    c.camera(cam);
    if (c.flash || cv._key !== key2) { cv._key = key2; og.setTransform(1, 0, 0, 1, 0, 0); og.globalAlpha = 1; og.globalCompositeOperation = 'source-over'; og.filter = 'none'; fn(Object.assign({}, c, { g: og, camera() {} })); }
    else if (emFn) emFn(c);
    c.g.save(); c.g.imageSmoothingEnabled = true; c.g.drawImage(cv, 0, 0); c.g.restore();
  }
  function tableShot(c, st, lt, fr) {
    const key2 = [fr.frame, fr.x, fr.y, fr.z0, Math.floor(tw(lt) * 12 + 0.5)].join('|');
    viaOffscreen(c, { x: fr.x, y: fr.y, zoom: fr.z0 * (1 + (fr.push || 0) * st) }, key2, c2 => tableDraw(c2, st, lt, fr), c2 => {
      const cam = KV().table.cams[fr.frame], a = cam.p(1.3, 2.0, 5.3), b = cam.p(1.8, 0, 5.3), E = c2.em; E.save(); E.fillStyle = 'rgba(232,180,110,0.6)'; E.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); E.restore(); });
  }
  function tableDraw(c, st, lt, fr) {
    const v = KV().table, A = v.anchorsFor(fr.frame), g = c.g, Th = tw(lt);
    const s = { frame: fr.frame, crustCut: lt > 23.8, mug: false, cereal: true, reflect: fr.reflect };
    v.back(c, lt, s);
    const L = { x: v.light.x, y: v.light.y, color: v.light.color, back: 0.3 };
    let collar = null, chin = null;
    if (fr.frame === 'close') {
      const dp = RIG.key(Th, DK), ep0 = RIG.key(Th, EK);
      // Emily is drawn first for her chin (behind him at the wipe); his collar is needed for her hands, so we pose him first
      const eSeat = A.emilySeat, dFeet = [A.danielFeet[0] + dp.dx, A.danielFeet[1]];
      const dPose = Object.assign({ at: dFeet, scale: A.danielPxPerM, view: 'three', facing: -1, outfit: 'day', tie: 'neat', collar: lt < T.collarFixed ? 'crooked' : 'straight', breath: breathOf(lt) }, dp);
      delete dPose.dx;
      // her chin, measured from a cheap probe of her pose (no drawing): we draw her for real below
      const ePose = Object.assign({ at: eSeat, scale: A.emilyPxPerM, view: 'three', facing: 1, body: 'sit', seat: 0.6, breath: (Th * 0.3) % 1 }, ep0);
      chin = [eSeat[0] + 0.02 * A.emilyPxPerM, A.emilyHead[1] + 0.07 * A.emilyPxPerM];
      Object.assign(dPose, danielArms(Th, A, chin));
      const dInfo = RIG.draw(g, 'daniel', dPose, { light: L, detail: 0.62 });
      collar = dInfo && dInfo.collar;
      Object.assign(ePose, emilyArms(Th, collar));
      const eInfo = RIG.draw(g, 'emily', ePose, { light: L, detail: 0.85 });
      // a little milk on her chin until his thumb takes it
      if (eInfo && eInfo.chin && Th < 11.9) { g.fillStyle = 'rgba(244,240,230,0.9)'; g.beginPath(); g.ellipse(eInfo.chin[0] + 4, eInfo.chin[1] - 3, 5, 3.5, 0.2, 0, Math.PI * 2); g.fill(); }
    } else {   // wide: Emily alone with the toast, socks swinging
      const ep = RIG.key(Th, EK);
      RIG.draw(g, 'emily', Object.assign({ at: A.emilySeat, scale: A.emilyPxPerM, view: 'three', facing: 1, body: 'sit', seat: 0.6, swing: 1, phase: (Th * 0.7) % 1, breath: (Th * 0.3) % 1 }, ep, emilyArms(Th, null)), { light: L, detail: 0.8 });
    }
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // CLOSE VIEWS: the pour (through the milk bottle), the mug capped (C1's light), the crust cut off, the clock's glass.
  // ===============================================================================================================
  function pour(c, st, lt) {
    const v = KV().pour, s = { pour: sstep(lt, 5.15, 5.4) * (1 - sstep(lt, 7.0, 7.35)), fill: key(lt, [[5.2, 0.12], [7.2, 0.78]]) };
    c.camera({ x: 920, y: 560, zoom: 1.0 + 0.004 * st });
    v.back(c, lt, s); v.front(c, lt, s);
  }
  function mug(c, st, lt) {
    const v = KV().mug, A = v.anchors, Th = tw(lt), cap = seg(lt, 7.95, 9.35);
    const s = { cap };
    c.camera({ x: 900, y: 540, zoom: 1.0 + 0.004 * st });
    v.back(c, lt, s);
    // his hand holds the lid: lowering it, then turning it on (on twos: a small rock as he twists)
    const lift = (1 - sstep(cap, 0, 0.8)) * 190, ly = A.lid[1] - lift - 6, twist = sstep(cap, 0.6, 1);
    const rock = twist > 0 && twist < 1 ? 6 * Math.sin(Th * Math.PI * 2 * 3) : 0;
    if (Th < 9.9) {
      const away = sstep(Th, 9.4, 9.9);
      handAt(c.g, { size: 470, pose: 'grip', view: 'back', rot: 150 + rock, curl: 0.75, sleeve: 'day' }, [A.lid[0] + 150 + 260 * away, ly - 10 - 300 * away], 'fist',
        { light: { x: v.light.x, y: v.light.y, color: v.light.color, back: 0.6 }, ambient: '#1F3538', ambientK: 0.15 });
    }
    v.front(c, lt, s);
  }
  function plate(c, st, lt) {
    const v = KV().plate, A = v.anchors, Th = tw(lt), crust = seg(lt, 21.55, 23.8);
    c.camera({ x: 930, y: 420, zoom: 1.0 + 0.0035 * st });
    v.back(c, lt, { crust });
    // the knife: its tip runs along the cut line, left to right; then it lifts the crust strip away
    const u = clamp(crust / 0.78, 0, 1), tip = [lerp(A.cutFrom[0], A.cutTo[0], u), lerp(A.cutFrom[1], A.cutTo[1], u)];
    const saw = 10 * Math.sin(Th * Math.PI * 2 * 2.4) * (u > 0 && u < 1 ? 1 : 0), lift = sstep(Th, 23.9, 24.4);
    if (Th > 21.0) handAt(c.g, { size: 600, pose: 'knife', view: 'back', rot: 145, curl: 1, sleeve: 'day' }, [tip[0] + 300 + saw, tip[1] - 120 - 240 * lift], 'fist',
      { light: { x: v.light.x, y: v.light.y, color: v.light.color, back: 0.3 }, ambient: '#6E5034', ambientK: 0.1 });
    v.front(c, lt, { crust });
  }
  function clock(c, st, lt) {
    const v = KV().clock;
    c.camera({ x: 900, y: 500, zoom: 1.0 + 0.003 * st });
    v.back(c, lt, { time: 7 + 58 / 60, sec: 31 }); v.front(c, lt, {});
  }

  // ===============================================================================================================
  // THE SWEEP (48–51.6): at the counter (C1's camera, a little wider), the travel mug by the kettle, his keys and wallet on
  // the oak. One practised movement: the mug, the keys and the wallet, up and gone. The phone, charging, is not touched.
  // ===============================================================================================================
  const WIDE = (() => { const k = 0.86; return [k, 0, 0, k, 770 - 785 * k, 610 - 728 * k]; })();
  const ap = (Tm, x, y) => [Tm[0] * x + Tm[2] * y + Tm[4], Tm[1] * x + Tm[3] * y + Tm[5]];
  function drawMug(g, base, h, r, tilt) {      // the brushed-steel travel mug, its black lid (stands on base = [x, y])
    g.save(); g.translate(base[0], base[1]); g.rotate(tilt || 0);
    const body = LC.rquad([[-r, -h], [r, -h], [r * 0.86, 0], [-r * 0.86, 0]], 6);
    g.fillStyle = LC.lin(g, -r, 0, r, 0, [[0, '#3A4444'], [0.22, '#C9D2CE'], [0.42, '#7E8A86'], [0.7, '#4A5454'], [0.9, '#9AA6A2'], [1, '#2A3232']]); g.fill(body);
    g.fillStyle = '#151A1A'; g.fillRect(-r * 0.93, -h * 0.28, r * 1.86, h * 0.1);
    g.fillStyle = '#0F1212'; g.fill(LC.rrect(-r * 1.02, -h - h * 0.13, r * 2.04, h * 0.15, 5)); g.fillStyle = 'rgba(214,226,222,0.5)'; g.fillRect(-r * 0.5, -h - h * 0.12, r * 0.6, 2);
    g.restore();
  }
  function drawKeys(g, at, s) {                // a ring of three keys and a fob, lying on the oak
    g.save(); g.translate(at[0], at[1]); g.scale(s, s);
    g.strokeStyle = '#B9C0BC'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2); g.stroke();
    [[-0.5, '#C9CCC4'], [0.35, '#B8A070'], [1.1, '#C4C8C2']].forEach(([a, col]) => { g.save(); g.rotate(a); g.fillStyle = col; g.fill(LC.rrect(12, -5, 46, 10, 3)); g.fillRect(52, -5, 10, 14); g.restore(); });
    g.fillStyle = '#1C2222'; g.fill(LC.rrect(-40, -8, 26, 18, 5));
    g.restore();
  }
  function drawWallet(g, at, s, rot) {
    g.save(); g.translate(at[0], at[1]); g.rotate(rot || 0); g.scale(s, s);
    g.fillStyle = '#2A1A10'; g.fill(LC.rrect(-55, -36, 110, 72, 8)); g.fillStyle = '#3E2A1A'; g.fill(LC.rrect(-55, -36, 110, 30, 8)); g.strokeStyle = 'rgba(232,184,124,0.35)'; g.lineWidth = 1.5; g.strokeRect(-49, -30, 98, 60);
    g.restore();
  }
  function sweep(c, st, lt) {
    const v = KV().counter, g = c.g, Th = tw(lt);
    const s = { frame: 'wide', screen: 'asleep', pulse: 1, cable: 'plugged', bag: true };
    c.camera({ x: 960, y: 560, zoom: 1.0 });
    v.back(c, lt, s);
    const Lh = { x: v.light.x, y: v.light.y, color: v.light.color, back: 0.55 };
    // where things lie: the mug by the kettle against the glass; the keys and the wallet on the oak in front
    const mugBase = ap(WIDE, 1110, 728), keysAt = ap(WIDE, 1080, 900), walletAt = ap(WIDE, 1240, 930);
    const tMug = 49.05, tKeys = 49.35;
    // the right hand: the mug (the grip arrives, closes, lifts and goes out of the top of the frame)
    const mugHand = Th < tMug ? key(Th, [[48.2, [mugBase[0] + 520, mugBase[1] - 560]], [tMug, [mugBase[0] + 6, mugBase[1] - 150]], 'outCubic']) : key(Th, [[tMug, [mugBase[0] + 6, mugBase[1] - 150]], [50.0, [mugBase[0] + 180, -420], 'inCubic']]);
    const mugOn = Th < tMug ? mugBase : [mugHand[0] - 6, mugHand[1] + 150];
    drawMug(g, mugOn, 320, 58, Th < tMug ? 0 : -0.06 * sstep(Th, tMug, 49.6));
    // the left hand: the keys and the wallet in one scoop
    const kHand = Th < tKeys ? key(Th, [[48.4, [keysAt[0] - 700, keysAt[1] + 420]], [tKeys, [keysAt[0] + 40, keysAt[1] - 10]], 'outCubic']) : key(Th, [[tKeys, [keysAt[0] + 40, keysAt[1] - 10]], [49.75, [walletAt[0] - 10, walletAt[1] - 18]], [50.6, [walletAt[0] - 300, -460], 'inCubic']]);
    if (Th < tKeys) drawKeys(g, keysAt, 1.2);
    if (Th < 49.75) drawWallet(g, walletAt, 1.1, 0.08);
    if (Th > 48.2 && Th < 50.1) handAt(g, { size: 330, pose: Th < tMug - 0.15 ? 'relaxed' : 'grip', view: 'back', rot: 160, curl: Th < tMug - 0.15 ? 0.7 : 0.95, sleeve: 'day', obj: null }, mugHand, 'fist', { light: Lh, ambient: '#1F3538', ambientK: 0.15 });
    if (Th > 48.4 && Th < 50.7) {
      const holding = Th >= tKeys;
      handAt(g, { size: 500, pose: holding ? 'keys' : 'relaxed', view: holding ? 'side' : 'back', rot: holding ? -60 : -30, curl: holding ? 1 : 0.8, phase: (Th * 1.5) % 1, sleeve: 'day', side: 'L' }, kHand, holding ? 'fist' : 1, { light: Lh, ambient: '#1F3538', ambientK: 0.15 });
      if (Th >= 49.75) drawWallet(g, [kHand[0] + 10, kHand[1] + 30], 1.0, -0.5);
    }
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // THE HALL (51.6–56): the bag by the door; he scoops it up and opens the door with his elbow; its glass blazes, the street
  // burns white; Emily, rabbit in hand, already at the threshold. Both backlit by the door.
  // ===============================================================================================================
  function hall(c, st, lt) {
    const v = KV().hall, cam = v.cam, g = c.g, Th = tw(lt);
    const door = E.outCubic(seg(lt, 54.55, 55.5)) * 0.92, s = { door, bag: Th < 52.65 };
    c.camera({ x: 960, y: 540, zoom: 1.0 + 0.003 * st });
    v.back(c, lt, s);
    const L = { x: v.light.x, y: v.light.y, color: v.light.color, back: 0.92 };
    // Emily by the door, facing it, her rabbit hanging from one hand; as it opens she steps out into the light
    { const ez = lerp(8.05, 9.5, sstep(Th, 55.3, 56.0)), ex = -0.08, ep = cam.p(ex, 0, ez), ek = cam.k(ep[2]);
      RIG.draw(g, 'emily', { at: [ep[0], ep[1]], scale: ek, view: 'back', body: Th > 55.3 ? 'walk' : 'stand', phase: ((ez - 8.05) / 0.55) % 1, holdR: 'rabbit', armR: 'relaxed', head: { nod: -0.1, turn: 0, tilt: 0 } },
        { light: L, ambient: '#0E1517', ambientK: 0.5, exposure: 0.55, detail: 0.5 }); }
    // Daniel: from the bag (bend, scoop) to the door (the elbow on the lever)
    const z = key(Th, [[51.6, 5.95], [52.3, 5.95], [52.9, 5.95], [54.2, 7.95, 'inOutSine'], [56, 8.1]]), x = key(Th, [[51.6, -0.18], [53.0, -0.18], [54.2, -0.36]]);
    const walking = Th > 52.95 && Th < 54.2, foot = cam.p(x, 0, z), k = cam.k(foot[2]);
    const bend = sstep(Th, 51.8, 52.5) * (1 - sstep(Th, 52.7, 53.2));
    const elbow = sstep(Th, 54.25, 54.6) * (1 - sstep(Th, 55.3, 55.8));
    const handle = v.handleAt(door);
    const pose = { at: [foot[0], foot[1]], scale: k, view: 'back', yaw: 186 + 14 * elbow, outfit: 'day', collar: 'straight', face: 'tired', breath: breathOf(lt),
      body: walking ? 'walk' : 'stand', phase: walking ? ((z - 5.95) / 1.25) % 1 : 0, lean: 1.2 * bend + 0.1 + 0.25 * elbow, crouch: 0.35 * bend, twist: 0.35 * elbow,
      holdL: 'mug', armL: { pose: 'mug' } };
    const bagH = cam.p(-0.5, 0.44, 6.35);
    if (Th < 52.65) { pose.armR = bend > 0.05 ? { to: [bagH[0], bagH[1]], depth: -0.1 } : 'relaxed'; }
    else { pose.holdR = 'bag'; pose.armR = bend > 0.05 ? { to: [bagH[0], bagH[1] - 0.15 * k * (1 - bend)], depth: -0.1 } : 'bag'; }
    if (elbow > 0.05) pose.armR = { pose: 'bag', dx: 0.12 * elbow, dy: 0.25 * elbow, dz: -0.05 };
    RIG.draw(g, 'daniel', pose, { light: L, ambient: '#0E1517', ambientK: 0.5, exposure: 0.5, detail: 0.5 });
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // THE PHONE (56–66): C1's camera. In its black glass the front door closes on the hall; the green, breathing. Quiet.
  // ===============================================================================================================
  function phone(c, st, lt) {
    const v = KV().counter;
    const s = { frame: 'c1', screen: 'asleep', pulse: 1, cable: 'plugged', bag: false, door: 0.92 * (1 - E.inCubic(seg(lt, 56.25, 58.4))) };
    c.camera({ x: 960, y: 540, zoom: 1.0 + 0.0015 * Math.max(0, st - 2.4) });
    v.back(c, lt, s); v.front(c, lt, s);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // the kitchen set's static layers are costly to build (environment-mapped chrome): build them on Q04's first frame
  // ---------------------------------------------------------------------------------------------------------------
  let _warm = false;
  function warmOnce(c) {
    if (_warm || c.flash) return; _warm = true;
    const cv = OTM.makeCanvas(W, H), em = OTM.makeCanvas(W / 4, H / 4);
    const fc = { g: cv.getContext('2d'), em: em.getContext('2d'), cache: c.cache, t: 0, lt: 0, before: [], after: [], camera() {}, reset() {} };
    fc.em.setTransform(0.25, 0, 0, 0.25, 0, 0);
    const v = KV(); [[v.table, { frame: 'wide', mug: false }], [v.table, { frame: 'close', mug: false }], [v.table, { frame: 'close', mug: false, crustCut: true }], [v.pour, {}], [v.mug, {}], [v.plate, {}], [v.clock, {}],
      [v.counter, { frame: 'wide', screen: 'asleep' }], [v.counter, { frame: 'c1', screen: 'asleep', bag: false }], [v.hall, {}]]
      .forEach(([vw, st]) => { try { vw.back(fc, 0, st); if (vw.front) vw.front(fc, 0, st); } catch (e) { FILM.warn('Q04 warm: ' + e.message); } });
  }
  const W2 = fn => (c, st, lt) => { warmOnce(c); fn(c, st, lt); };
  const close = (x, y, z0, push, reflect) => ({ frame: 'close', x, y, z0, push, reflect });

  // ===============================================================================================================
  // THE SEQUENCE
  // ===============================================================================================================
  FILM.seq({
    id: 'Q04', title: 'Breakfast', dur: 66,
    lines: [
      { id: 'L006', at: 14.0 },          // Emily: I don't want this bit.
      { id: 'L007', at: 16.6 },          // Daniel: That's the crust.
      { id: 'L008', at: 19.0 },          // Emily: I know what it is.
      { id: 'L009', at: 27.0 },          // Emily: Are you getting me today?
      { id: 'L010', at: 29.6 },          // Daniel: Of course. After work.
      { id: 'L011', at: 32.4 },          // Emily: Not late?
      { id: 'L012', at: 37.4 },          // Daniel: Not late. Promise.
      { id: 'L013', at: 46.0 },          // Daniel: Thank you, boss.
    ],
    sound(S) {
      S.bed('room', 0, 58.4, { level: -42, kind: 'a kitchen in the morning, lived in' });
      S.bed('birds', 0, 48, { level: -42, kind: 'garden birds, close (we are outside the window)' });
      S.bed('radio_music', 0, 47.9, { level: -50, speaker: 'small', kind: 'the kitchen radio, morning music, low' });
      S.cue('cereal_pour', 5.15, { dur: 2.1, level: -30 });
      S.cue('mug_cap', 8.4, { kind: 'a travel mug lid lowered and twisted on', level: -32 });
      S.cue('lid_snap', 9.3, { level: -34 });
      S.cue('chair_creak', 10.8, { level: -42 });
      S.cue('knife_plate', 21.6, { dur: 2.2, kind: 'a knife through toast crust, a tap on the plate', level: -32 });
      S.cue('clock_tick', T.clock, { n: 4, kind: 'the wall clock, close', level: -36 });
      S.cue('kiss', 41.0, { kind: 'a kiss on the top of a child\'s head, soft', level: -38 });
      S.cue('fabric', 42.4, { kind: 'small hands on a shirt collar', level: -42 });
      S.cue('radio_click', 47.9, { kind: 'the kitchen radio switched off', level: -34 });
      S.cue('mug_lift', 49.0, { level: -36 });
      S.cue('keys', 49.35, { level: -30 });
      S.cue('bag_lift', 52.6, { kind: 'the work bag lifted by its handle', level: -34 });
      S.cue('handle', 54.45, { kind: 'the front door lever pressed with an elbow', level: -26 });
      S.cue('front_door_open', 54.6, { kind: 'the front door swung open; the street rushes in', level: -24 });
      S.bed('street', 54.6, 58.4, { level: -40, kind: 'the street outside, a hot morning: birds, a far car' });
      S.cue('footsteps', 55.2, { n: 3, surface: 'shoes on the step; small shoes beside them', level: -34 });
      S.cue('door', 58.4, { kind: 'the front door pulled shut from outside', level: -22 });
      // the house goes quiet: the fridge, the clock, the garden behind glass
      S.bed('room', 58.4, 66, { level: -48, kind: 'the empty house' });
      S.bed('fridge', 56, 66, { level: -50 });
      S.bed('clock_tick', 58.6, 66, { level: -46, kind: 'the kitchen clock in the empty house' });
      S.bed('birds', 58.4, 66, { level: -56, filter: 'behind_glass' });
    },
    shots: [
      { at: 0, name: 'garden window, wide: Emily and the toast that has disappointed her', draw: W2((c, st, lt) => tableShot(c, st, lt, { frame: 'wide', x: 960, y: 560, z0: 1.0, push: 0.003 })) },
      { at: T.pour, name: 'the cereal pour, through the milk bottle', draw: W2(pour) },
      { at: T.mug, name: 'the travel mug, capped', draw: W2(mug) },
      { at: T.wipe, name: 'window, close: his thumb wipes the milk from her chin', draw: W2((c, st, lt) => tableShot(c, st, lt, close(960, 560, 1.0, 0.003))) },
      { at: T.crustTalk, name: 'window, close: "I don\'t want this bit." "That\'s the crust."', draw: W2((c, st, lt) => tableShot(c, st, lt, close(900, 600, 1.06, 0.0025))) },
      { at: T.plate, name: 'the plate: he cuts the crust off', draw: W2(plate) },
      { at: T.nod, name: 'window, close: the solemn nod', draw: W2((c, st, lt) => tableShot(c, st, lt, close(860, 640, 1.12, 0.003))) },
      { at: T.getting, name: 'window, close: "Are you getting me today?"', draw: W2((c, st, lt) => tableShot(c, st, lt, close(960, 570, 1.02, 0.0025))) },
      { at: T.clock, name: 'the clock\'s glass: 7:58', draw: W2(clock) },
      { at: T.promise, name: 'window, close: "Not late. Promise."', draw: W2((c, st, lt) => tableShot(c, st, lt, close(960, 570, 1.02, 0.002))) },
      { at: T.kiss, name: 'window, close: the kiss; she straightens his collar (the garden over them)', draw: W2((c, st, lt) => tableShot(c, st, lt, close(900, 590, 1.1, 0.005, 0.34))) },
      { at: T.sweep, name: 'the counter: coffee, keys, wallet in one sweep; the phone untouched', draw: W2(sweep) },
      { at: T.hall, name: 'the hall: the bag, the door opened with his elbow, blazing', draw: W2(hall) },
      { at: T.door, name: 'C1: the phone charging quietly; the front door closes in its glass', draw: W2(phone) },
    ],
  });
})();
