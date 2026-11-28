/* Q03 · TUESDAY: THE FRIEND ("Tuesday" to "Wednesday")
   Card TUESDAY. The call: the hero on the sofa (living, evening), phone to ear; the friend among stacked moving boxes. "move on
   Saturday?" "No." "That small pause": the split holds in silence; a "…" bubble over the friend; his face falls. "your stomach
   drops": the hero's panel drops a few pixels, a hand on the stomach, scared. "you still feel guilty": the hero alone on the sofa
   under a small grey cloud. "Remember that feeling": push in on the cloud; "It comes back later": the cloud drifts out of frame. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('Tuesday'));
  const { span, seg, pop, ease } = FILM;
  const T = {
    card: W('Tuesday'), friend: W('your friend'), calls: W('calls'), ask: span('can you help', 'saturday', FILM.W('Tuesday')), no: span('no', null, FILM.W('Tuesday')),
    hear: W('and you hear'), small: W('that small'), pause: W('pause'), theOne: W('the one'), now: W('now your'), drops: W('drops'),
    nobody: W('nobody'), guilty: W('guilty'), remember: W('remember'), comes: W('it comes'), later: Wend('later'), end: FILM.W('Wednesday'),
  };
  const EVE = { tod: 'evening' };
  // the hero on the sofa in the living room (pose and expression vary)
  const heroSofa = (c, o) => STAGE.heroSofa(c, EVE, o);
  // the friend in his flat mid-move (SETS.friendFlat, the boxes in front)
  function friendSide(c, o) {
    c.set('friendFlat', {}); const a = c.anchor('friendFlat', 'center');
    const f = c.fig('friend', Object.assign({ x: a.x, y: a.y, s: a.s, face: -1, pose: 'hold_phone', mode: 'ear', talk: T.ask }, o || {}));
    c.setFront('friendFlat', {}); return f;
  }
  function call(c, o) {
    o = o || {}; const t = c.t;
    const z = o.zoom || 1;
    STAGE.call(c, (cc, r) => { STAGE.fit(cc, r, { x: 900, y: 600 - 60 * (z - 1) * 4, zoom: z }); heroSofa(cc, Object.assign({ pose: 'sit_phone', talk: T.no }, o.hero || {})); },
      (cc, r) => { STAGE.fit(cc, r, { x: 960, y: 600 - 60 * (z - 1) * 4, zoom: z }); const f = friendSide(cc, o.friend || {}); if (o.dots) { const hd = ART.head('friend', f); const st = pop(t, o.dots, 0.3); GFX.at(cc.g, hd.x - hd.r * 2.1, hd.y - hd.r * 0.45, st, q => GFX.dots(q, 0, 0, 1.1, t - o.dots)); } },
      { k: seg(t, T.friend, T.friend + 0.55), dropL: o.dropL, badgeK: o.badgeK });
  }

  FILM.seq({
    id: 'Q03', title: 'Tuesday: a friend', chapter: 'Tuesday: a friend', from: T.card,
    sound(S) {
      S.bed('music', T.card, T.end, { mood: 'gentle, then hollow at the pause' }); S.bed('living_room_evening', T.card, T.end);
      S.cue('whoosh', T.card - 0.1); S.cue('pop', T.card + 0.05); S.cue('phone_buzz', T.calls - 0.2, { x: 0.27 }); S.cue('whoosh', T.friend + 0.05);
      S.duck(T.small, T.now, 0.25); S.cue('pop', T.pause); S.cue('stomach_drop', T.drops, { x: 0.27 });
      S.cue('cloud', T.nobody + 0.4); S.cue('whoosh', T.comes + 0.2);
    },
    shots: [
      { at: T.card, name: 'living, evening: the day card over the hero on the sofa', in: { type: 'wipe', dir: 'right' }, push: 1.04,
        draw(c) { heroSofa(c, { pose: 'sit_front', hold: 'mug' }); STAGE.dayCard(c, T.card + 0.05, T.friend - 0.05, 'TUESDAY'); } },
      { at: T.friend, name: 'call: the friend asks, "No."',
        draw(c) { const t = c.t; call(c, { friend: { expr: t > T.no[1] + 0.1 ? 'surprised' : 'happy' }, hero: { expr: 'firm' } }); } },
      { at: T.small, name: 'call: the small pause, "…", his face falls',
        draw(c) { const t = c.t; call(c, { zoom: 1 + 0.25 * ease.inOutSine(seg(t, T.small, T.small + 0.8)), dots: T.pause, friend: { expr: t > T.theOne ? 'sad' : 'surprised', talk: null, blinks: [T.theOne - 0.2] }, hero: { expr: 'worried', talk: null } }); } },
      { at: T.theOne, name: 'close on the friend: his face falls ("I thought we were close")', in: 'pop', push: { from: 1, to: 1.05, x: 900, y: 420 },
        draw(c) {
          const t = c.t; const a = c.anchor('friendFlat', 'center'); c.camera({ x: a.x - 60, y: 360, zoom: 2.15 }); c.set('friendFlat', {});
          const f = c.fig('friend', { x: a.x, y: a.y, s: a.s, face: -1, pose: 'hold_phone', mode: 'ear', expr: t > T.theOne + 0.25 ? 'sad' : 'surprised', blinks: [T.theOne + 0.15, T.theOne + 1.6], nod: 0.25 * seg(t, T.theOne, T.theOne + 1.2), look: [-0.4, 0.5] });
          const hd = ART.head('friend', f); GFX.dots(c.g, hd.x - hd.r * 2.0, hd.y - hd.r * 0.7, 0.8, t - T.pause);
        } },
      { at: T.now, name: 'call: your stomach drops (the hero\'s panel drops)',
        draw(c) { const t = c.t; call(c, { dropL: 26 * ease.outBack(seg(t, T.drops, T.drops + 0.25)), friend: { expr: 'sad', talk: null }, hero: { pose: t > T.drops - 0.2 ? 'sit_stomach' : 'sit_phone', expr: t > T.drops - 0.2 ? 'scared' : 'worried', talk: null } }); } },
      { at: T.nobody, name: 'living: alone on the sofa under a small grey cloud', in: 'fade', push: { from: 1, to: 1.04, x: 860, y: 420 },
        draw(c) { const h = heroSofa(c, { pose: 'sit_front', expr: 'guilty' }); const hd = ART.head('hero', h); const st = pop(c.t, T.nobody + 0.4, 0.4); GFX.at(c.g, hd.x, hd.y - hd.r * 2.3, st, q => GFX.cloud(q, 0, 0, 0.9)); } },
      { at: T.remember, name: 'living: push in on the cloud; it drifts out of frame',
        draw(c) {
          const t = c.t, z = 1 + 0.7 * ease.inOutSine(seg(t, T.remember, T.comes + 0.2));
          c.camera({ x: 860, y: 380, zoom: z }); const h = heroSofa(c, { pose: 'sit_front', expr: 'guilty' });
          const hd = ART.head('hero', h); const dx = 900 * ease.inCubic(seg(t, T.comes, T.end)), dy = -60 * seg(t, T.comes, T.end);
          GFX.cloud(c.g, hd.x + dx, hd.y - hd.r * 2.3 + dy + Math.sin(t * 2) * 6, 0.9);
        } },
    ],
  });
})();
