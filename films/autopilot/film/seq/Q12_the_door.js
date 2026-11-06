/* AUTOPILOT · Q12 · THE DOOR (72 s) · S23, S24, A102–A113, L050–L052
   EXT. NURSERY CAR PARK - CONTINUOUS. The handle (LOCKED), the remote and the same polite BEEP, the door pulled open from
   behind it (we do not see inside: we see Daniel), the silence, C3 held while the sun sinks out of the glass, the quick flash
   of the phone's green, black, and the end card.
   RESTRAINT: the inside of the car is never drawn, not even a sliver, not even in a reflection. Daniel's eyes settle below
   the frame; what he sees is never shown. Grief is in his posture, the door, the light and the silence.
   Sets: SETS.nursery (handle, blink, door, c3) and, for the quick flash, Q02's own image (FILM.drawShot). */
(function () {
  'use strict';
  const { W, H } = OTM;
  const clamp = OTM.clamp, lerp = OTM.lerp, rgba = OTM.rgba;
  const seg = FILM.seg, twos = FILM.twos, ease = FILM.ease;
  const NV = () => SETS.nursery.views;

  // ---------------------------------------------------------------------------------------------------------------
  // THE QUICK FLASH (A111): the morning's own image, drawn by Q02 itself: [sequence, its local time, how long we hold it].
  // The kitchen set's API asks Q02 to show the green charging glyph pulsing in the phone's black glass at about 27 s.
  // If Q02 is not built yet, the kitchen counter's own flash state stands in (see standIn below).
  // ---------------------------------------------------------------------------------------------------------------
  // Q02's C1 shot sleeps at 24.9 s (its author: clean after 25.5; 27.0-28.5 verified); the glyph then breathes at 0.42 Hz,
  // brightest at 24.9 and 27.28. Starting at 26.53 puts one whole breath in the flash, its brightest at the middle.
  const FLASH = { phone: ['Q02', 26.53, 1.5, 'C1'] };
  const FLASH_AT = 30.0;
  // the shot found at that time must be the expected image (Q02 is still being finished): otherwise the stand-in, and a warning
  function flash(c, name, st) {
    const [id, t0, , expect] = FLASH[name], seq = FILM.lib[id];
    if (seq) { const sh = seq.shots.filter(x => x.at <= t0 + st).pop();
      if (sh && (!expect || (sh.name || '').indexOf(expect) >= 0)) { const p = FILM.drawShot(c, id, t0 + st); if (p) return p; }
      else FILM.warn('Q12 flash ' + name + ': ' + id + ' at ' + t0 + ' is "' + (sh && sh.name) + '", not the expected image; drawing the stand-in'); }
    return standIn[name](c, t0 + st);
  }
  const standIn = {
    // the counter, the phone asleep in its black glass with the green glyph breathing: "green and peaceful"
    phone(c, t) { const v = SETS.kitchen.views.counter, s = { tod: 'morning', screen: 'pulse', bag: true }; v.back(c, t, s); v.front(c, t, s); return {}; },
  };

  // the handheld drift that began at "Where's Emily?" in Q11 (2 px by its end) carries through the handle and the remote;
  // from the door on, the camera is still. A tiny zoom keeps the drifting frame's edges covered.
  function drift(c, lt, amp) { const s = FILM.shake(lt + 84, amp, 0.5, 11); c.camera({ zoom: 1 + (2 * amp + 2) / 1080, dx: s.dx, dy: s.dy }); }

  // Daniel's 0.25 Hz breath; it catches at A108 and stays caught
  const breathAt = t => (twos(t) * 0.25) % 1;

  // ---------------------------------------------------------------------------------------------------------------
  // 0-4 · THE HANDLE (A102): he yanks it; LOCKED. Close on his hand; the dark glass above holds his reflection.
  // ---------------------------------------------------------------------------------------------------------------
  const YANK = [0.42, 1.52];                         // the two yanks
  function pullAt(t) { let p = 0; YANK.forEach((t0, i) => { const hold = i ? 0.55 : 0.42; if (t >= t0) p = Math.max(p, t < t0 + 0.07 ? (t - t0) / 0.07 : t < t0 + hold ? 1 : Math.max(0, 1 - (t - t0 - hold) / 0.06)); }); return p; }
  function joltAt(t) { let j = 0; YANK.forEach((t0, i) => { const d = t - t0 - 0.07; if (d >= 0) j = Math.max(j, (i ? 1 : 0.7) * Math.exp(-d * 7)); }); return j; }
  // his reflection in the dark glass: near and large, his head bowed to his hand on the handle. A black mirror gives back
  // only what is lit, so he is a dark head and shoulders rimmed copper on the sun's side, occluding the reflected sky (the
  // set darkens him by the glass's reflectance). Drawn once and cached; it moves only as a whole (he arrives; he yanks).
  function handleReflection(c, a) {
    const r = a.reflection, k = r.k * 1.32;
    return FILM.cache('Q12|handleRefl', g => { g.translate(W / 2 - r.x, H / 2 - r.y);
      RIG.draw(g, 'daniel', { at: [r.x + 30, r.y + 1.5 * k], scale: k, view: 'front', yaw: -8, body: 'stand', face: 'drained', eyes: 'down', lid: 0.55, down: 0.9, open: 0.1, collar: 'straight',
        head: { nod: 0.55, turn: -0.12, tilt: 0.04 }, armR: { hand: [0.1, -0.35, 0.45] }, armL: 'down', breath: 0 },
        { light: { x: -600, y: 380, color: '#E89A5E', back: 0.86 }, exposure: 0.6, ambient: '#161A22', ambientK: 0.42 }); }, W, H);
  }
  function drawHandle(c, st) {
    const v = NV().handle, tw = twos(st);
    drift(c, st, 2);
    const pull = pullAt(tw), jolt = joltAt(st);          // his pull on twos; the car's shudder on ones
    // he arrives running: his reflection comes into the glass from the left, settles, and jerks with each yank
    const arrive = ease.outCubic(seg(tw, 0, 0.42)), lurch = pullAt(tw) * 16;
    const s = { pull, jolt, reflect: (g, a) => { const r = a.reflection; g.save(); g.globalAlpha = 0.64; g.drawImage(handleReflection(c, a), r.x - W / 2 - (1 - arrive) * 300 + lurch * 0.5, r.y - H / 2 + lurch * 0.6); g.restore(); } };
    v.back(c, st, s);
    const a = v.at(s), k = a.k;
    // his hand: four fingers hooked under the pull bar into the recess (the set draws the bar over them in front()); in the
    // car's shade, rimmed from the low sun behind the car's tail
    const out = 0.028 * pull * k * 0.35, jit = [Math.sin(tw * 41) * 2 * jolt, Math.cos(tw * 37) * 1.5 * jolt];
    const enter = 1 - ease.outCubic(seg(tw, 0.1, 0.42));
    const wrist = [a.handle[0] + 0.15 * k + enter * 180 + out * 0.6 + jit[0], a.handle[1] + 0.06 * k + enter * 260 + jit[1]];
    RIG.hand(c.g, 'daniel', { at: wrist, size: 0.185 * k, pose: 'handle', obj: null, view: 'back', rot: -168 + 6 * pull, roll: 18, curl: 1.05, sleeve: 'office' },
      { light: { x: -500, y: 300, color: '#E89A5E', back: 0.8 }, exposure: 0.72, ambient: '#1C2028', ambientK: 0.35 });
    v.front(c, st, s);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // 4-9 · THE REMOTE (A103): his thumb struggles over the fob; the car answers with the same polite BEEP it made nine hours
  // ago (Q07): the indicators blink amber into the dusk. The focus racks from his hand to the tail lamp as it answers.
  // ---------------------------------------------------------------------------------------------------------------
  const BEEP = 7.6;                                   // sequence-local: the same sound as Q07's (cue 'beep', n 2)
  function drawBlink(c, st, lt) {
    const v = NV().blink, tw = twos(st), tl = twos(lt);
    drift(c, lt, 2);
    const focus = 1 - ease.inOutSine(seg(lt, BEEP - 0.25, BEEP + 0.6));
    const s = { blink: SETS.car.blink(lt, BEEP), focus };
    v.back(c, st, s);
    const a = v.at(s), k = a.remoteK;
    // the thumb: it slides off the button twice before it finds it
    const press = FILM.key(tl, [[4.0, 0], [4.9, 0.0], [5.15, 0.55], [5.35, 0.1], [5.9, 0.15], [6.2, 0.65], [6.4, 0.05], [7.0, 0.2], [7.45, 1, 'outQuad'], [7.9, 1], [8.2, 0.2]]);
    const shake = 1 - seg(tl, 7.4, 7.6), jx = Math.sin(tl * 23) * 5 * shake, jy = Math.cos(tl * 19) * 4 * shake;
    const lower = ease.inCubic(seg(tl, 7.95, 8.9)) * 640, rise = (1 - ease.outCubic(seg(tl, 4.0, 4.6))) * 560;
    // the fob lies in his palm, its button under the thumb, toward us; contre-jour: the hand in shade, rimmed by the sun
    RIG.hand(c.g, 'daniel', { at: [a.remote[0] - 10 + jx, a.remote[1] + 150 + jy + lower + rise], size: 0.19 * k, pose: 'remote', view: 'palm', rot: -62 + 4 * Math.sin(tl * 3), roll: 0, press, sleeve: 'office' },
      { light: { x: a.sun[0], y: a.sun[1] - 60, color: '#F4AE72', back: 0.82 }, exposure: 0.74, ambient: '#2A2630', ambientK: 0.38 });
    v.front(c, st, s);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // 9-24 · THE DOOR (A104-A108): he pulls it open; the camera stays outside, behind the door. We see Daniel through its glass:
  // his eyes settle on something below the frame. For a moment his face does not understand; then it does. His breath
  // catches and stays caught. One hand reaches into the car, behind the hinge band. The broken sound is a sound only.
  // ---------------------------------------------------------------------------------------------------------------
  // shot-local times (from 9): the cut lands mid-swing, the door already pulled a quarter open and Daniel already bending
  // into the doorway behind its glass; his eyes settle below the frame; the face does not understand, then it does; the
  // breath catches; one hand reaches in behind the hinge band; the broken sound; then nothing moves.
  const DOOR = { open: [0, 0.55], open0: 0.72, stoop: [0, 1.0], blank: 1.0, knows: [4.0, 4.9], catch: 5.1, reach: [6.4, 9.6], sound: 10.4 };
  function danielAtDoor(g, a, st) {
    const t = twos(st), k = a.k, sc = 0.86 * k;
    const stoop = lerp(0.62, 1, ease.outCubic(seg(t, DOOR.stoop[0], DOOR.stoop[1])));
    const knows = ease.inOutSine(seg(t, DOOR.knows[0], DOOR.knows[1]));
    const reach = ease.inOutSine(seg(t, DOOR.reach[0], DOOR.reach[1]));
    const caught = t >= DOOR.catch;
    // he stands in the doorway, bent into it; his face settles at the anchor (C3's grammar, the eye raised to his face).
    // Seen from the front door he faces into the car about 73 degrees from us: a profile turned a little toward the lens.
    const at = [a.face[0] - 0.36 * sc - (1 - stoop) * 0.12 * sc, a.face[1] + 1.637 * sc];
    // incomprehension (the brow lifted a little, the mouth slack) -> understanding (the inner brow up, the lids lower, the
    // mouth parted), held; a minute recoil of the head as it lands, then stillness
    // as it lands the eyes open (he sees), the head lifts a little and stops; the breath is drawn in and held (the shoulders
    // stay up); when the hand goes in, the head goes down with it
    const lift = 0.15 * knows * (1 - reach);
    const pose = {
      at, scale: sc, yaw: 74, facing: 1, body: 'stand', collar: 'crooked',
      lean: 0.9 * stoop + 0.06 * reach, head: { nod: 0.75 * stoop - lift + 0.08 * reach, turn: 0, tilt: 0.02 },
      face: 'blank', eyes: 'down', lid: lerp(0.44, 0.12, knows) + 0.12 * reach, down: 1, brow: lerp(0.3, 0.62, knows), browIn: lerp(0.12, 1, knows), browKnit: 0.08 * knows, smile: -0.32 * knows,
      open: (t >= DOOR.sound && t < DOOR.sound + 0.55 ? 0.3 : 0.05) + 0.17 * knows, breath: caught ? 0.5 : breathAt(st), breathPx: caught ? 7 : 3,
      // pulling the door by its frame while it swings, then the arm hangs; then it reaches into the car, low, behind the hinge band
      armR: reach > 0.001 ? { to: [lerp(1330, 1520, reach), lerp(840, 790, reach)], depth: 0.12, palm: 'down' } : (t < 0.8 ? { to: [lerp(1180, 1300, t / 0.8), 820], depth: 0.2 } : 'down'), armL: 'down',
    };
    RIG.draw(g, 'daniel', pose, { light: { x: a.light.x, y: a.light.y, color: a.light.color, back: 0.82 }, rimK: 0.5 + 0.5 * a.light.k, ambient: '#4A5670', ambientK: 0.24, exposure: 0.96 });
  }
  // after the broken sound nothing moves at all: his figure is drawn once and held (the door view has no camera move)
  const DOOR_STILL = DOOR.sound + 0.6;
  function drawDoor(c, st) {
    const v = NV().door;
    const fig = twos(st) >= DOOR_STILL ? (g, a) => g.drawImage(FILM.cache('Q12|doorStill', cg => danielAtDoor(cg, a, DOOR_STILL + 1)), 0, 0) : (g, a) => danielAtDoor(g, a, st);
    const s = { open: lerp(DOOR.open0, 1, ease.outCubic(seg(st, DOOR.open[0], DOOR.open[1]))), set: 0, figureTint: '#8698A0', figure: fig };
    v.back(c, st, s); v.front(c, st, s);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // 24-59.5 · C3 (A110-A113): the world falls silent. He drops to his knees beside the open door; then he is still, one arm
  // extended into the car behind the hinge frame, while the sun sinks out of the glass and the frame drops toward teal-black.
  // ---------------------------------------------------------------------------------------------------------------
  const C3T = { drop: [0.05, 0.75] };                // shot-local (from 24): the drop to his knees
  // the sunset across the whole of C3 (24-59.5): the disc whole while he drops; half of it under L050 (the style frame);
  // the last sliver gone in the stillness after L051; the afterglow fading as "Autopilot disengaged." lands
  const setAt = lt => FILM.key(lt, [[24, 0], [31.5, 0.04], [36.0, 0.2], [39.5, 0.3], [44.0, 0.45], [49.5, 0.62, 'inOutSine'], [56.0, 0.74], [59.5, 1.0, 'inQuad']]);
  function danielKneels(g, a, lt) {
    const st = twos(lt - 24), drop = ease.inQuad(seg(st, C3T.drop[0], C3T.drop[1]));
    const lift = (1 - drop) * 0.42 * a.k;           // the kneeling figure lifted: what the glass shows is his upper body sinking
    const pose = { at: [a.kneel[0] + (1 - drop) * 0.06 * a.k, a.kneel[1] - lift], scale: a.k, view: 'profile', body: 'kneel',
      armR: { to: [a.hand[0], a.hand[1] + (1 - drop) * 30], palm: 'down' }, armL: 'down',
      head: { nod: 0.62 + 0.18 * drop, turn: 0, tilt: 0 }, lean: 0.25 * (1 - drop), face: 'down', collar: 'crooked', breath: 0.68, breathPx: 4 };
    // the rim is the sun's: it thins and cools with the visible disc, to a faint line of afterglow (he is still just there)
    const k = a.light.k;
    RIG.draw(g, 'daniel', pose, { mode: 'silhouette', light: { x: a.light.x, y: a.light.y, color: a.light.color }, rimColor: OTM.mix('#3C3646', a.light.color, k), rimW: lerp(1.3, 3.6, k) });
  }
  function drawC3(c, lt) {
    const v = NV().c3, s = { set: setAt(lt) };
    v.back(c, lt, s);
    danielKneels(c.g, v.at(s), lt);                // a pure silhouette: drawn between back and front (the glass, the door over him)
    v.front(c, lt, s);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // 62-72 · THE END CARD, on black: the opening title's type (Libre Franklin 500, tracked, bone; the credit smaller and
  // dimmer). It fades in over 1.2 s, holds about 6 s and is gone by 71. Nothing else on it.
  // ---------------------------------------------------------------------------------------------------------------
  const CARD = { in: 1.2, hold: 6.0, out: 1.8 };
  function drawCard(c, st) {
    const g = c.g; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const a = st < CARD.in ? ease.inOutSine(st / CARD.in) : st < CARD.in + CARD.hold ? 1 : 1 - ease.inOutSine(clamp((st - CARD.in - CARD.hold) / CARD.out, 0, 1));
    if (a <= 0.002) return;
    const type = (text, size, track, y, alpha) => { g.font = `500 ${size}px "Libre Franklin"`; g.letterSpacing = track + 'px'; g.fillStyle = rgba('#E6E0D2', alpha); g.fillText(text, W / 2 + track / 2, y); };
    g.save(); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    type('AUTOPILOT', 54, 21, 534, a);
    type('A film by Osita Miles', 24, 4.5, 590, 0.6 * a);
    g.letterSpacing = '0px'; g.restore();
  }

  FILM.seq({
    id: 'Q12', title: 'The door', dur: 72,
    lines: [
      { id: 'L050', at: 36.0 },                     // My phone was on the counter.
      { id: 'L051', at: 42.0 },                     // And my daughter was dead.
      { id: 'L052', at: 56.0 },                     // Autopilot disengaged.
    ],
    sound(S) {
      // the evening, still there until the door: far traffic, and the ringing carried over from Q11 (A090)
      S.bed('traffic', 0, 24, { level: -46, fi: 0.02, fo: 0.02, what: 'the evening traffic, distant: it disappears at A109' });
      S.bed('tinnitus', 0, 24, { f: 7400, level: -38, fi: 0.02, fo: 0.02, what: 'the thin ringing, carried over from Q11; it goes with the world' });
      S.cue('footsteps', 0.0, { n: 2, pace: 'run', surface: 'tarmac', what: 'he arrives at the car' });
      S.cue('handle', YANK[0]); S.cue('lock_thunk', YANK[0] + 0.07, { what: 'LOCKED: the door holds' });
      S.cue('handle', YANK[1], { level: -14 }); S.cue('lock_thunk', YANK[1] + 0.07);
      S.cue('keys', 4.3, { what: 'the fob out of his pocket' });
      S.cue('fob_click', 5.15); S.cue('fob_click', 6.2); S.cue('fob_click', 7.45);
      S.cue('beep', BEEP, { n: 2, what: 'the same polite BEEP as Q07: the locks answer' });
      S.cue('indicator', BEEP, { n: 2, level: -34, what: 'the relays of the two amber blinks' });
      S.cue('door_open', 8.8, { what: 'the latch, the seal letting go: he pulls the door (the cut lands mid-swing at 9.0)' });
      S.cue('footsteps', 9.3, { n: 1, surface: 'tarmac', what: 'one step into the doorway' });
      S.cue('breath', 9 + DOOR.catch, { dur: 0.35, level: -32, what: 'his breath catches, and stays caught (A108)' });
      S.cue('broken_sound', 9 + DOOR.sound, { dur: 0.7, level: -30, what: "a small, broken sound: the beginning of his daughter's name, with nowhere to go (A108). A sound only, never a subtitle" });
      // A109: the world falls SILENT. Only Daniel's voice remains (his three lines add their own takes)
      S.silence(24, 72);
    },
    shots: [
      { at: 0, name: 'handle: LOCKED, the yank; his reflection above', post: { vig: 0.45 }, draw(c, st) { drawHandle(c, st); } },
      { at: 4, name: 'blink: the remote, the same polite BEEP', post: { vig: 0.45 }, draw(c, st, lt) { drawBlink(c, st, lt); } },
      { at: 9, name: 'door: he pulls it open; we see Daniel', post: { vig: 0.45 }, draw(c, st) { drawDoor(c, st); } },
      { at: 24, name: 'C3: silence; he drops to his knees', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, st, lt) { drawC3(c, lt); } },
      { at: FLASH_AT, name: 'quick flash: the phone, green and peaceful', draw(c, st) { c.post = flash(c, 'phone', st) || {}; } },
      { at: FLASH_AT + FLASH.phone[2], name: 'C3, held: the sun sinks out of the glass', post: { vig: 0.5, grain: 0.06, halation: 0.6 }, draw(c, st, lt) { drawC3(c, lt); } },
      { at: 59.5, name: 'black', post: { grain: 0.035, halation: 0, vig: 0 }, draw(c) { c.g.fillStyle = '#000'; c.g.fillRect(0, 0, W, H); } },
      { at: 62, name: 'end card', post: { grain: 0.035, halation: 0, vig: 0 }, draw(c, st) { drawCard(c, st); } },
    ],
  });
})();
