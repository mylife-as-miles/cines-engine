/* Q01 · HOOK: THE QUESTION (0 to "Monday")
   plain: the hero nodding, smiling. A montage, one beat per item: the office at night, the clock past nine ("Staying late");
   the street, a banknote handed to the friend ("lending money"); a party with paper chains, the hero in a party hat holding a
   cup, tired ("going to the thing"). "Yes, yes, yes": three quick pushes on the nodding hero. "Even when your whole body is
   saying no": the smile holds, the body trembles, sweat. The question: the hero thinking under the bulb; "for seven days" a
   strip of seven day cards slides in; "say no to everyone" a NO stamp lands on each card in turn. "Not rude, not angry": a rude
   face and an angry face, each crossed out; "just no": calm, one hand up. "Let's see": he walks out of frame. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(0);
  const { seg, pop, nod, punch, slide, walk } = FILM;
  const y3 = FILM.from(FILM.W('thing'));
  const T = {
    yes: W('yes'), everything: W('everything'), staying: W('staying'), lending: W('lending'), money: W('money'), going: W('going'),
    yy: [y3.W('yes', 1), y3.W('yes', 2), y3.W('yes', 3)], yyEnd: y3.Wend('yes', 3), even: W('even'), body: W('whole body'), sayingNo: W('saying no'),
    so: W('so here'), question: W('question'), forSeven: W('for seven'), sayNo: W('say no', { after: FILM.W('for seven') }), everyone: Wend('everyone'),
    notRude: W('not rude'), rude: W('rude'), not2: W('not', { after: FILM.W('rude') }), angry: W('angry'), just: W('just'), justNo: FILM.span('no', null, FILM.W('just')),
    lets: W("let's"), see: W('see', { after: FILM.W("let's") }), end: FILM.W('Monday'),
  };
  const DAYS3 = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  // the seven stamps, spread from "no" to the end of "everyone"
  const STAMPS = DAYS3.map((d, i) => FILM.lerp(W('no', { after: T.sayNo }), T.everyone - 0.1, i / 6));

  FILM.seq({
    id: 'Q01', title: 'The question', chapter: 'The question', from: 0,
    sound(S) {
      S.bed('music', 0, T.end, { mood: 'cozy, bouncy, light' });
      S.cue('pop', 0.05); S.cue('whoosh', T.staying - 0.08); S.cue('typing', T.staying + 0.1, { n: 8 }); S.cue('whoosh', T.lending - 0.08); S.cue('pop', T.money);
      S.cue('whoosh', T.going - 0.08); S.bed('party_murmur', T.going, T.yy[0]);
      T.yy.forEach(t => S.cue('pop', t)); S.cue('wobble', T.even + 0.2);
      S.cue('bulb', T.question); S.cue('whoosh', T.forSeven); STAMPS.forEach(t => S.cue('stamp', t));
      S.cue('pop', T.rude); S.cue('wrong', T.not2); S.cue('pop', T.angry); S.cue('wrong', T.just - 0.25); S.cue('ding', T.justNo[0]);
      S.cue('footsteps', T.see, { n: 4, gap: 0.32 }); S.cue('whoosh', T.end - 0.12);
    },
    shots: [
      { at: 0, name: 'plain: the hero nodding, smiling', push: { from: 1, to: 1.06 },
        draw(c) { STAGE.plainHero(c, { expr: 'happy', nod: 0.6 * nod(c.t, [T.yes, T.yes + 0.45, T.everything, T.everything + 0.45]), talk: [T.yes, T.yes + 0.3] }); } },
      { at: T.staying, name: 'office at night, the clock past nine: staying late', push: 1.05,
        draw(c) { const o = { night: true, clock: '9:20' }; c.set('office', o); const sa = STAGE.sitAt(c, 'office', 'chair'); c.fig('hero', Object.assign(sa, { face: -1, pose: 'type', expr: 'tired', tint: ART.tintFor(c, 'office') })); c.setFront('office', Object.assign({ parts: ['desk'] }, o)); } },
      { at: T.lending, name: 'street: a banknote handed to the friend: lending money', push: 1.05,
        draw(c) {
          c.set('street', {}); const L = c.anchor('street', 'left'), R = c.anchor('street', 'right');
          const h = c.fig('hero', { x: L.x + 60, y: L.y, s: L.s, face: 1, pose: 'stand', expr: 'happy', override: { armR: { a: 1.3, e: 0.2, hand: 'hold', flip: -1 } } });
          c.fig('friend', { x: R.x - 40, y: R.y, s: R.s, face: -1, pose: 'stand', expr: 'happy', override: { armR: { a: 1.2, e: 0.35, hand: 'open', flip: 1 } } });
          const hn = ART.hand('hero', h, 'front'); const st = pop(c.t, T.money - 0.15, 0.3); GFX.at(c.g, hn.x + 40, hn.y - 20, st, q => GFX.banknote(q, 0, 0, 0.9, -0.15));
        } },
      { at: T.going, name: 'a party, paper chains: the hero in a party hat with a cup, tired', push: { from: 1.02, to: 1.08 },
        draw(c) {
          c.set('living', { tod: 'dusk' }); const tint = ART.tintFor(c, 'living');
          c.fig('friend', { x: 420, y: 1000, s: 0.8, face: 1, pose: 'wave', expr: 'happy', tint });
          c.fig('coworker', { x: 1560, y: 1000, s: 0.8, face: -1, pose: 'wave', phase: c.t * 1.7, expr: 'happy', tint });
          c.g.save(); c.screen(); GFX.bunting(c.g, c.t); c.reset(); c.g.restore();
          const h = c.fig('hero', { x: 980, y: 1010, s: 1, face: 1, pose: 'stand', hold: 'mug', expr: 'tired', tint });
          const hd = ART.head('hero', h); GFX.partyHat(c.g, hd.x + 6, hd.y - hd.r * 0.8, hd.r / 100, 0.12);
        } },
      { at: T.yy[0], name: 'plain: yes, yes, yes: three quick pushes on the nodding hero',
        draw(c) { c.camera({ x: 960, y: 470, zoom: punch(c.t, T.yy, 0.13, 0.32), free: true }); STAGE.plainHero(c, { expr: 'happy', nod: 0.7 * nod(c.t, T.yy, 0.3), talk: [T.yy[0], T.yyEnd] }); } },
      { at: T.even, name: 'plain: the smile holds, the body says no (trembling, sweat)', push: { from: 1.25, to: 1.32, x: 960, y: 520 },
        draw(c) {
          const t = c.t, h = STAGE.plainHero(c, { expr: 'happy', faceOver: { sweat: 1 }, tremble: seg(t, T.even, T.even + 0.6) * 5 });
          const hd = ART.head('hero', h); [[1.05, -0.5, T.body], [-1.1, -0.2, T.sayingNo]].forEach(([fx, fy, t0]) => { const st = pop(t, t0, 0.3); GFX.at(c.g, hd.x + fx * hd.r, hd.y + fy * hd.r + 40 * seg(t, t0, t0 + 1.2), st, q => GFX.sweat(q, 0, 0, 1.6)); });
          c.g.save(); c.g.globalAlpha = seg(t, T.even + 0.3, T.even + 0.6); GFX.shakeLines(c.g, hd.x, hd.y + hd.r * 2.6, 1.6, t); c.g.restore();
        } },
      { at: T.so, name: 'plain: the question: thinking, the bulb lights', in: 'pop',
        draw(c) { const h = STAGE.plainHero(c, { pose: 'think', expr: c.t < T.question ? 'neutral' : 'surprised' }); STAGE.bulb(c, 'hero', h, T.so + 0.4, T.question); } },
      { at: T.forSeven, name: 'plain: seven day cards slide in; a NO stamp lands on each', in: { type: 'slide', dir: 'left' },
        draw(c) {
          const t = c.t; if (t > STAMPS[0]) c.impact(STAMPS[Math.max(0, STAMPS.filter(s => s <= t).length - 1)], 0.18, 6);
          c.set('plain', {});
          DAYS3.forEach((d, i) => {
            const x = 960 + (i - 3) * 250, dx = slide(t, T.forSeven + 0.05 + i * 0.08, 1400, 0.5, 'outCubic');
            GFX.card(c.g, x + dx, 520, 210, 270, { fill: '#FFF4E3', band: '#3A8594', bandH: 64, r: 26, rot: (i % 2 ? 0.03 : -0.03),
              draw: q => { GFX.text(q, d, 0, -100, { size: 40, weight: 900, color: '#FFFFFF' }); GFX.text(q, String(i + 1), 0, 30, { size: 110, weight: 900, color: '#1c1c1c' }); } });
            STAGE.stamp(c, x, 560, STAMPS[i], 'NO', { size: 64, rot: -0.22 + (i % 3) * 0.08 });
          });
        } },
      { at: T.notRude, name: 'plain: not rude, not angry: each face crossed out',
        draw(c) {
          c.set('plain', {}); const t = c.t;
          [[620, 'confused', 'point', T.notRude + 0.05, T.not2], [1300, 'angry', 'stand', T.angry, T.just - 0.25]].forEach(([x, expr, pose, t0, tx]) => {
            const st = pop(t, t0 - 0.05, 0.32); if (!st.on) return;
            GFX.at(c.g, x, 520, st, () => { c.g.translate(-x, -520); GFX.portrait(c, 'hero', x, 520, 270, { expr, fig: { pose, faceOver: expr === 'confused' ? { look: [0.6, -0.2] } : null } }); });
            GFX.cross(c.g, x, 520, 380, seg(t, tx, tx + 0.25));
          });
        } },
      { at: T.just, name: 'plain: just no: calm, one hand up', in: 'pop',
        draw(c) { STAGE.plainHero(c, { pose: c.t > T.justNo[0] - 0.15 ? 'handup' : 'stand', expr: 'neutral', talk: T.justNo }); } },
      { at: T.lets, name: "plain: let's see: he walks out of frame",
        draw(c) { c.set('plain', {}); const a = c.anchor('plain', 'stand', { x: 960, y: 980, s: 1 }); const wk = walk(c.t, T.see - 0.05, T.end + 0.3, a.x, 2250); c.fig('hero', { x: wk.x, y: a.y, s: a.s, face: 1, pose: wk.moving ? 'walk' : 'stand', walk: wk.walk, expr: 'happy' }); } },
    ],
  });
})();
