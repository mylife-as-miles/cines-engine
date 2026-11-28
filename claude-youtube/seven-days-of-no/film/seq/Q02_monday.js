/* Q02 · MONDAY: THE BOSS (24.3-45.8 on the narration clock)
   Day card MONDAY · 5:30 PM over the office, the clock at 5:30. The boss walks in from the right with his clipboard and asks.
   "Normally": a rounded memory frame, the hero beaming and nodding before the boss has finished. "Today you say, no": back in
   the room, calm. "He blinks": close on the boss, two blinks. "okay": a shrug; he walks off. "You prepared for war": the hero
   in a pot helmet with a frying-pan shield, alone; "got a shrug": the boss's shrug repeated small in the doorway. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('Monday'));
  const { span, walk, pop, seg, key, nod } = FILM;
  const T = {
    card: W('Monday'), boss: W('your boss'), walks: W('walks'), ask: span('can you stay', 'tonight', W('your boss')),
    normally: W('normally'), ofCourse: span('of course'), today: W('today'), no: span('no'), blinks: W('blinks'),
    then: W('then'), okay: span('okay'), okay2: W('okay', 2), war: W('you prepared'), got: W('got'), shrug: W('shrug'),
  };
  T.end = FILM.W('Tuesday');
  const OFF = { clock: '5:30' };
  const HERO = { x: 700, y: 950, s: 0.92 };
  const BOSS_STOP = 1260;
  // the boss: walks in from the right, stops, asks; after "okay" he shrugs and walks off to the right
  function boss(c, o) {
    const t = c.t; let x, wk = { walk: 0, moving: false, face: -1 };
    if (t < T.ask[0]) { wk = walk(t, T.walks - 0.4, T.ask[0] - 0.15, 2200, BOSS_STOP); x = wk.x; }
    else if (t < T.okay[1] + 0.25) x = BOSS_STOP;
    else { wk = walk(t, T.okay[1] + 0.25, T.okay[1] + 2.6, BOSS_STOP, 2250); x = wk.x; }
    const shrug = t >= T.okay[0] - 0.1 && t < T.okay[1] + 0.3;
    return c.fig('boss', Object.assign({ x, y: 950, s: 0.94, face: wk.moving ? wk.face : -1, pose: wk.moving ? 'walking' : shrug ? 'shrug' : 'clipboard', walk: wk.walk,
      expr: shrug ? 'neutral' : 'neutral', talk: [T.ask, T.okay], hold: 'clipboard' }, o || {}));
  }
  function hero(c, o) { return c.fig('hero', Object.assign({}, HERO, { face: 1, pose: 'standing', expr: 'neutral' }, o || {})); }

  FILM.seq({
    id: 'Q02', title: 'Monday: the boss', chapter: 'Monday: the boss', from: T.card,
    sound(S) {
      S.bed('music', T.card, T.end, { mood: 'light, a little tense' }); S.bed('office_room', T.card, T.normally);
      S.cue('whoosh', T.card - 0.1); S.cue('pop', T.card + 0.05);
      S.cue('footsteps', T.walks - 0.3, { n: 4, gap: 0.38 });
      S.cue('pop', T.normally); S.cue('whoosh', T.today - 0.05);
      S.cue('blink', T.blinks + 0.05); S.cue('blink', T.blinks + 0.4);
      S.cue('shrug', T.okay[0]); S.cue('footsteps', T.okay[1] + 0.3, { n: 5, gap: 0.42 });
      S.cue('clang', T.war + 0.1); S.cue('shrug', T.shrug);
      S.bed('office_room', T.today, T.end);
    },
    shots: [
      { at: T.card, name: 'office, 5:30: the day card', in: { type: 'wipe', dir: 'right' }, push: 1.04,
        draw(c) { c.set('office', OFF); hero(c, { x: 1360, y: 940, face: -1, pose: 'typing', expr: 'tired' }); c.setFront('office', OFF); STAGE.dayCard(c, T.card + 0.05, T.boss - 0.1, 'MONDAY', '5:30 PM'); } },
      { at: T.boss, name: 'office: the boss walks over and asks', push: { from: 1, to: 1.05, x: 1000, y: 560 },
        draw(c) { c.set('office', OFF); hero(c, { blinks: [T.ask[1] + 0.2] }); boss(c); c.setFront('office', OFF); } },
      { at: T.normally, name: 'memory: normally you say "of course"', in: 'pop',
        draw(c) {
          c.set('plain', {}); const t = c.t;
          GFX.memory(c.g, 210, 110, 1500, 860, () => {
            c.g.save(); c.g.translate(210 + 750, 110 + 430); c.g.scale(0.78, 0.78); c.g.translate(-960, -540);
            c.set('office', OFF);
            hero(c, { expr: 'beaming', pose: 'standing', nod: nod(t, [T.ofCourse[0], T.ofCourse[0] + 0.4, T.ofCourse[0] + 0.8, T.ofCourse[0] + 1.25]), talk: T.ofCourse });
            c.fig('boss', { x: BOSS_STOP, y: 950, s: 0.94, face: -1, pose: 'clipboard', talk: [T.normally + 0.2, T.today - 0.3], expr: 'surprised' });
            c.g.restore();
          });
        } },
      { at: T.today, name: 'office: today you say, no', in: 'cut',
        draw(c) { c.set('office', OFF); hero(c, { expr: 'calm', pose: c.t > T.no[0] - 0.1 ? 'handup' : 'standing', talk: T.no }); boss(c); c.setFront('office', OFF); } },
      { at: T.blinks - 0.25, name: 'close on the boss: two blinks',
        draw(c) { c.camera({ x: BOSS_STOP - 20, y: 330, zoom: 2.3 }); c.set('office', OFF); boss(c, { blinks: [T.blinks + 0.05, T.blinks + 0.42], expr: 'surprised' }); } },
      { at: T.then, name: 'office: "okay", a shrug, he walks off', push: { from: 1.06, to: 1 },
        draw(c) { c.set('office', OFF); hero(c, { expr: c.t > T.okay2 ? 'confused' : 'surprised' }); boss(c); c.setFront('office', OFF); } },
      { at: T.war, name: 'the hero ready for war, alone; the shrug again in the doorway', in: 'pop', push: { from: 1, to: 1.06, x: 760, y: 560 },
        draw(c) {
          const t = c.t; c.set('office', OFF);
          // the small shrug in the doorway (far left), from "got"
          if (t >= T.got - 0.1) c.fig('boss', { x: 200, y: 950, s: 0.55, face: 1, pose: t > T.shrug - 0.1 ? 'shrug' : 'standing', alpha: seg(t, T.got - 0.1, T.got + 0.15) });
          const op = hero(c, { x: 820, pose: 'holding', expr: 'angry', tremble: t < T.got ? 1.5 : 0 });
          const hd = ART.head('hero', op); const st = pop(t, T.war, 0.3);
          GFX.at(c.g, hd.x, hd.y - hd.r * 0.55, { s: st.s, a: st.a }, q => GFX.pot(q, 0, 0, op.s * 0.95, -0.05));
          const hn = ART.hand('hero', op, 'front'); GFX.at(c.g, hn.x + 40, hn.y - 60, { s: pop(t, T.war + 0.15, 0.3).s }, q => GFX.pan(q, 0, 0, op.s * 1.1, 0.25));
          c.setFront('office', OFF);
        } },
    ],
  });
})();
