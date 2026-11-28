/* Q11 · WRAP: THE ANSWER, COMMENTS, BYE ("So, what if you said no" to the last word)
   The seven day cards again, each with that day's face. "tired", "a little guilty", "a lot more honest": the hero's three faces.
   "tell me in the comments": a big comment bubble (no platform logo). "I'll go first": the hero; "I said no to food": he pushes away
   the plate from Thursday's thought bubble; "See you in the next one": a wave. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('so what if'));
  const { span, seg, pop, ease } = FILM;
  const T = {
    start: W('so what if'), days: Wend('days'), would: W('you would be'), tired: W('tired'), guilty: W('guilty'), honest: W('honest'),
    now: W('now tell me'), comments: W('comments'), go: W("i'll go first"), goSpan: span("i'll go", 'first', FILM.W('so what if')), said: W('i said no'), food: W('food'),
    joke: span('i said no', 'it', FILM.W("i'll go first")), see: W('see you'), seeSpan: span('see you', 'one', FILM.W('so what if')), last: Wend('next one'),
  };
  const DAYS3 = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const FACES = ['surprised', 'guilty', 'tired', 'sad', 'happy', 'neutral', 'happy'];
  const POP7 = DAYS3.map((d, i) => FILM.lerp(T.start + 0.1, T.days - 0.2, i / 6));

  FILM.seq({
    id: 'Q11', title: 'So, what happens?', chapter: 'So, what happens?', from: T.start,
    sound(S) {
      S.bed('music', T.start, T.last, { mood: 'warm recap, then playful' });
      S.cue('whoosh', T.start - 0.1); POP7.forEach(t => S.cue('pop', t)); S.cue('pop', T.tired); S.cue('pop', T.guilty); S.cue('pop', T.honest);
      S.cue('whoosh', T.now - 0.05); S.cue('pop', T.now + 0.15); S.cue('typing', T.comments, { n: 10 });
      S.cue('whoosh', T.go - 0.05); S.cue('plate_slide', T.food); S.cue('pop', T.see);
    },
    shots: [
      { at: T.start, name: 'plain: the seven day cards again, each with its face', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.06 },
        draw(c) {
          c.set('plain', {}); const t = c.t;
          DAYS3.forEach((d, i) => {
            const x = 960 + (i - 3) * 250; GFX.at(c.g, x, 520, pop(t, POP7[i], 0.32), q => GFX.card(q, 0, 0, 220, 300, { fill: '#FFF4E3', band: '#3A8594', bandH: 64, r: 26, rot: (i % 2 ? 0.03 : -0.03),
              draw: g2 => { GFX.text(g2, d, 0, -118, { size: 40, weight: 900, color: '#FFFFFF' }); g2.save(); g2.translate(0, 30); GFX.portrait(c, 'hero', 0, 0, 82, { expr: FACES[i], bg: '#BFE3E0' }); g2.restore(); } }));
          });
        } },
      { at: T.would, name: 'plain: tired, a little guilty, a lot more honest', push: { from: 1.06, to: 1 + 0.0001 },
        draw(c) {
          c.set('plain', {}); const t = c.t;
          [[480, 'tired_closed', T.tired], [960, 'guilty', T.guilty], [1440, 'happy', T.honest]].forEach(([x, expr, t0]) => GFX.at(c.g, x, 520, pop(t, t0 - 0.05, 0.34), () => { c.g.translate(-x, -520); GFX.portrait(c, 'hero', x, 520, 210, { expr, bg: '#FFF4E3' }); }));
        } },
      { at: T.now, name: 'plain: tell me in the comments: a friendly comment bubble', in: 'pop', push: { from: 1, to: 1.08, x: 1100, y: 480 },
        draw(c) {
          c.set('plain', {}); const t = c.t; const a = c.anchor('plain', 'stand', { x: 960, y: 980, s: 1 });
          c.fig('hero', { x: 330, y: a.y, s: a.s * 0.9, face: 1, pose: 'point', expr: 'happy', nod: 0.1 * FILM.wob(t, 0.4, 3) });
          const n = seg(t, T.comments, T.go - 0.9);
          GFX.at(c.g, 1180, 470, pop(t, T.now + 0.15, 0.36), q => GFX.comment(q, 0, 0, 1040, 440, { k: n, heart: seg(t, T.go - 0.8, T.go - 0.5), t, tail: [-330, 330] }));
        } },
      { at: T.go, name: "close: I'll go first; I said no to food: his hand pushes the plate away", in: 'pop',
        draw(c) {
          const t = c.t; c.camera({ x: 1010, y: 470, zoom: 1.5 + 0.04 * seg(t, T.go, T.see) }); c.set('plain', {});
          const X = 800, Y = 980, TY = 700, push = ease.outCubic(seg(t, T.food - 0.05, T.food + 0.6)), plateX = 1040 + 340 * push;
          const k = seg(t, T.food - 0.45, T.food - 0.1) * (1 - seg(t, T.food + 1.1, T.food + 1.5));
          const tx = Math.min(plateX - 170, X + 255) - X, ty = (TY - 24) - (Y - 330);
          const override = k > 0 ? { armR: { ik: [FILM.lerp(70, tx, k), FILM.lerp(-60, ty, k)], bend: -1, ul: 1, hand: 'open', flip: 1, hrot: -0.2 } } : null;
          c.fig('hero', { x: X, y: Y, s: 1, face: 1, pose: 'stand', override, expr: t > T.food ? 'happy' : 'neutral', talk: [T.goSpan, T.joke], look: t < T.said ? [0, 0] : [0.6, 0.4] });
          GFX.table(c.g, 1010, TY, 1500);
          GFX.platePersp(c.g, plateX, TY - 4, 1.25);
        } },
      { at: T.see, name: 'plain: see you in the next one: a wave',
        draw(c) { STAGE.plainHero(c, { pose: 'wave', expr: 'happy', talk: T.seeSpan }); } },
    ],
  });
})();
