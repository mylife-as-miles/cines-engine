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
  function heroSofa(c, o) {
    c.set('living', EVE); const sa = STAGE.sitAt(c, 'living', 'sofa_seat_r', { floor: 990 });
    const h = c.fig('hero', Object.assign(sa, { face: 1, pose: 'sit_front', expr: 'neutral', tint: ART.tintFor(c, 'living') }, o || {}));
    c.setFront('living', EVE); return h;
  }
  function friendSide(c, o) {
    GFX.movingFlat(c.g);
    return c.fig('friend', Object.assign({ x: 980, y: 962, s: 1, face: -1, pose: 'hold_phone', mode: 'ear', talk: T.ask }, o || {}));
  }
  function call(c, o) {
    o = o || {}; const t = c.t;
    STAGE.call(c, (cc, r) => { STAGE.fit(cc, r, { x: 840, y: 560 }); heroSofa(cc, Object.assign({ pose: 'sit_phone', talk: T.no }, o.hero || {})); },
      (cc, r) => { STAGE.fit(cc, r, { x: 980, y: 560 }); const f = friendSide(cc, o.friend || {}); if (o.dots) { const hd = ART.head('friend', f); const st = pop(t, o.dots, 0.3); GFX.at(cc.g, hd.x - hd.r * 1.5, hd.y - hd.r * 1.7, st, q => GFX.dots(q, 0, 0, 1.1, t - o.dots)); } },
      { k: seg(t, T.friend, T.friend + 0.55), dropL: o.dropL, badgeK: o.badgeK });
  }

  FILM.seq({
    id: 'Q03', title: 'Tuesday: a friend', chapter: 'Tuesday: a friend', from: T.card,
    sound(S) {
      S.bed('music', T.card, T.end, { mood: 'gentle, then hollow at the pause' }); S.bed('living_room_evening', T.card, T.end);
      S.cue('whoosh', T.card - 0.1); S.cue('pop', T.card + 0.05); S.cue('phone_buzz', T.calls - 0.2); S.cue('whoosh', T.friend + 0.05);
      S.duck(T.small, T.now, 0.25); S.cue('pop', T.pause); S.cue('stomach_drop', T.drops);
      S.cue('cloud', T.nobody + 0.4); S.cue('whoosh', T.comes + 0.2);
    },
    shots: [
      { at: T.card, name: 'living, evening: the day card over the hero on the sofa', in: { type: 'wipe', dir: 'right' }, push: 1.04,
        draw(c) { heroSofa(c, { pose: 'sit_front', hold: 'mug' }); STAGE.dayCard(c, T.card + 0.05, T.friend - 0.05, 'TUESDAY'); } },
      { at: T.friend, name: 'call: the friend asks, "No."',
        draw(c) { const t = c.t; call(c, { friend: { expr: t > T.no[1] + 0.1 ? 'surprised' : 'happy' }, hero: { expr: 'neutral' } }); } },
      { at: T.small, name: 'call: the small pause, "…", his face falls',
        draw(c) { const t = c.t; call(c, { dots: T.pause, friend: { expr: t > T.theOne ? 'sad' : 'surprised', talk: null, blinks: [T.theOne - 0.2] }, hero: { expr: 'worried', talk: null } }); } },
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
