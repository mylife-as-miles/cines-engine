/* Q02 · MONDAY: THE BOSS (the narration from "Monday" to "Tuesday")
   Day card MONDAY · 5:30 PM over the office, the clock at 5:30. The boss walks in from the right with his clipboard and asks.
   "Normally": a rounded memory frame, the hero beaming and nodding before the boss has finished. "Today you say, no": back in
   the room, calm. "He blinks": close on the boss, two blinks. "okay": a shrug; he walks off. "You prepared for war": the hero
   in a pot helmet with a frying-pan shield, alone; "got a shrug": the boss's shrug repeated small in the doorway. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('Monday'));
  const { span, walk, pop, seg, nod } = FILM;
  const T = {
    card: W('Monday'), boss: W('your boss'), walks: W('walks'), ask: span('can you stay', 'tonight', W('your boss')),
    normally: W('normally'), ofCourse: span('of course', null, W('normally')), today: W('today'), no: span('no', null, W('today')), blinks: W('blinks'),
    then: W('then'), okay: span('okay', null, W('then')), okay2: W('okay', 2), war: W('you prepared'), got: W('got'), shrug: W('shrug'),
    end: FILM.W('Tuesday'),
  };
  const OFF = { clock: '5:30', chair: true };
  const HERO_X = 560, BOSS_STOP = 1300, FLOOR = 962;
  // the boss: walks in from the right, stops, asks; after "okay" he shrugs and walks off to the right
  function boss(c, o) {
    const t = c.t; let x, wk = { walk: 0, moving: false, face: -1 };
    if (t < T.ask[0]) { wk = walk(t, T.walks - 0.4, T.ask[0] - 0.15, 2250, BOSS_STOP); x = wk.x; }
    else if (t < T.okay[1] + 0.25) x = BOSS_STOP;
    else { wk = walk(t, T.okay[1] + 0.25, T.okay[1] + 2.6, BOSS_STOP, 2300); x = wk.x; }
    const shrug = t >= T.okay[0] - 0.1 && t < T.okay[1] + 0.35;
    return c.fig('boss', Object.assign({ x, y: FLOOR, s: 1, face: wk.moving ? wk.face : -1, pose: wk.moving ? 'walk' : shrug ? 'shrug' : 'hold_clipboard', walk: wk.walk,
      hold: wk.moving ? 'clipboard' : undefined, talk: [T.ask, T.okay], turn: wk.moving ? undefined : STAGE.EYE.turn, look: wk.moving ? undefined : STAGE.EYE.look }, o || {}));
  }
  function hero(c, o) { return c.fig('hero', Object.assign({ x: HERO_X, y: FLOOR, s: 1, face: 1, pose: 'stand', expr: 'neutral', turn: STAGE.EYE.turn, look: STAGE.EYE.look }, o || {})); }

  FILM.seq({
    id: 'Q02', title: 'Monday: the boss', chapter: 'Monday: the boss', from: T.card,
    sound(S) {
      S.bed('music', T.card, T.end, { mood: 'light, a little tense' }); S.bed('office_room', T.card, T.end);
      S.cue('whoosh', T.card - 0.1); S.cue('pop', T.card + 0.05);
      S.cue('footsteps', T.walks - 0.3, { n: 4, gap: 0.38 });
      S.cue('pop', T.normally); S.cue('whoosh', T.today - 0.05);
      S.cue('blink', T.blinks + 0.05); S.cue('blink', T.blinks + 0.42);
      S.cue('shrug', T.okay[0]); S.cue('footsteps', T.okay[1] + 0.3, { n: 5, gap: 0.42 });
      S.cue('clang', T.war + 0.1); S.cue('shrug', T.shrug);
    },
    shots: [
      { at: T.card, name: 'office, 5:30: the day card over the hero at his desk', in: { type: 'wipe', dir: 'right' }, push: 1.04,
        draw(c) { c.set('office', OFF); const sa = STAGE.sitAt(c, 'office', 'chair', { floor: FLOOR }); c.fig('hero', Object.assign(sa, { face: -1, pose: 'type', expr: 'tired' })); c.setFront('office', Object.assign({ parts: ['desk'] }, OFF));
          STAGE.dayCard(c, T.card + 0.05, T.boss - 0.1, 'MONDAY', '5:30 PM'); } },
      { at: T.boss, name: 'office: the boss walks over and asks', push: { from: 1, to: 1.05, x: 960, y: 560 },
        draw(c) { c.set('office', OFF); hero(c, { blinks: [T.ask[1] + 0.2] }); boss(c); } },
      { at: T.normally, name: 'memory: normally you say "of course"', in: 'pop',
        draw(c) {
          c.set('plain', {}); const t = c.t;
          GFX.memory(c.g, 210, 110, 1500, 860, () => {
            c.g.save(); c.g.translate(960, 540); c.g.scale(0.8, 0.8); c.g.translate(-960, -540);
            c.set('office', OFF);
            hero(c, { expr: 'beaming', nod: 0.5 * nod(t, [T.ofCourse[0] - 0.3, T.ofCourse[0] + 0.1, T.ofCourse[0] + 0.5, T.ofCourse[0] + 0.9, T.ofCourse[0] + 1.3]), talk: T.ofCourse });
            c.fig('boss', { x: BOSS_STOP, y: FLOOR, face: -1, pose: 'hold_clipboard', talk: [T.normally + 0.15, T.today - 0.4], expr: 'surprised' });
            c.g.restore();
          });
        } },
      { at: T.today, name: 'office: today you say, no',
        draw(c) { c.set('office', OFF); hero(c, Object.assign({ talk: T.no }, c.t > T.no[0] - 0.15 ? STAGE.NO : { pose: 'stand', expr: 'neutral' })); boss(c); } },
      { at: T.blinks - 0.25, name: 'close on the boss: two blinks',
        draw(c) { c.camera({ x: BOSS_STOP, y: 330, zoom: 2.4 }); c.set('office', OFF); boss(c, { blinks: [T.blinks + 0.05, T.blinks + 0.42], expr: 'surprised' }); } },
      { at: T.then, name: 'office: "okay", a shrug, he walks off', push: { from: 1.06, to: 1 },
        draw(c) { c.set('office', OFF); hero(c, { expr: c.t > T.okay2 ? 'confused' : 'surprised' }); boss(c); } },
      { at: T.war, name: 'the hero ready for war, alone; the shrug again in the doorway', in: 'pop', push: { from: 1, to: 1.06, x: 760, y: 560 },
        draw(c) {
          const t = c.t; c.set('office', Object.assign({ view: 'door' }, OFF));
          const d = c.anchor('office', 'doorway');
          if (t >= T.got - 0.1) c.fig('boss', { x: d.x, y: d.y, s: d.s * 0.92, face: 1, pose: t > T.shrug - 0.1 ? 'shrug' : 'stand', alpha: seg(t, T.got - 0.1, T.got + 0.15) });
          c.setFront('office', Object.assign({ view: 'door' }, OFF));
          const op = hero(c, { x: 960, pose: 'stand', expr: 'angry', tremble: t < T.got ? 1.5 : 0, override: { armR: { a: 1.2, e: 0.6, hand: 'fist', flip: -1 } } });
          const hd = ART.head('hero', op); const st = pop(t, T.war, 0.3);
          GFX.at(c.g, hd.x, hd.y - hd.r * 0.62, { s: st.s, a: st.a }, q => GFX.pot(q, 0, 0, hd.r / 112, -0.05));
          const hn = ART.hand('hero', op, 'front'); GFX.at(c.g, hn.x + 10, hn.y - 30, { s: pop(t, T.war + 0.15, 0.3).s }, q => GFX.pan(q, 0, 0, hd.r / 100, 0.25));
        } },
    ],
  });
})();
