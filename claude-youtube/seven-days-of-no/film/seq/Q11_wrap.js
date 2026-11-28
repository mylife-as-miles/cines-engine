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
      { at: T.start, name: 'plain: the seven day cards again, each with its face', in: { type: 'wipe', dir: 'right' },
        draw(c) {
          c.set('plain', {}); const t = c.t;
          DAYS3.forEach((d, i) => {
            const x = 960 + (i - 3) * 250; GFX.at(c.g, x, 520, pop(t, POP7[i], 0.32), q => GFX.card(q, 0, 0, 220, 300, { fill: '#FFF4E3', band: '#3A8594', bandH: 64, r: 26, rot: (i % 2 ? 0.03 : -0.03),
              draw: g2 => { GFX.text(g2, d, 0, -118, { size: 40, weight: 900, color: '#FFFFFF' }); g2.save(); g2.translate(0, 30); GFX.portrait(c, 'hero', 0, 0, 82, { expr: FACES[i], bg: '#BFE3E0' }); g2.restore(); } }));
          });
        } },
      { at: T.would, name: 'plain: tired, a little guilty, a lot more honest',
        draw(c) {
          c.set('plain', {}); const t = c.t;
          [[480, 'tired_closed', T.tired], [960, 'guilty', T.guilty], [1440, 'happy', T.honest]].forEach(([x, expr, t0]) => GFX.at(c.g, x, 520, pop(t, t0 - 0.05, 0.34), () => { c.g.translate(-x, -520); GFX.portrait(c, 'hero', x, 520, 210, { expr, bg: '#FFF4E3' }); }));
        } },
      { at: T.now, name: 'plain: tell me in the comments: a big comment bubble', in: 'pop',
        draw(c) {
          c.set('plain', {}); const t = c.t; const a = c.anchor('plain', 'stand', { x: 960, y: 980, s: 1 });
          c.fig('hero', { x: 330, y: a.y, s: a.s * 0.9, face: 1, pose: 'point', expr: 'happy' });
          const n = seg(t, T.comments, T.go - 0.4); GFX.at(c.g, 1180, 470, pop(t, T.now + 0.15, 0.36), q => GFX.comment(q, 0, 0, 1060, 470, { lines: [0.9 * Math.min(1, n * 3), 0.75 * FILM.clamp(n * 3 - 1, 0, 1), 0.5 * FILM.clamp(n * 3 - 2, 0, 1)] }));
        } },
      { at: T.go, name: "plain: I'll go first; I said no to food (he pushes the plate away)", in: 'pop',
        draw(c) {
          const t = c.t; c.set('plain', {}); const a = c.anchor('plain', 'stand', { x: 960, y: 980, s: 1 });
          const push = ease.outCubic(seg(t, T.food - 0.05, T.food + 0.5));
          c.fig('hero', { x: 820, y: a.y, s: a.s, face: 1, pose: t > T.food - 0.15 && t < T.food + 1.2 ? 'push_away' : 'stand', expr: t > T.food ? 'happy' : 'neutral', talk: [T.goSpan, T.joke] });
          GFX.table(c.g, 960, 760, 1200);
          c.prop('plateIcon', { x: 1060 + push * 560, y: 712, s: 2.2 });
        } },
      { at: T.see, name: 'plain: see you in the next one: a wave', in: 'pop',
        draw(c) { STAGE.plainHero(c, { pose: 'wave', expr: 'happy', talk: T.seeSpan }); } },
    ],
  });
})();
