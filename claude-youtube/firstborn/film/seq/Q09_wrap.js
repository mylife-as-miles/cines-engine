/* Q09 · CALL YOUR ELDER SIBLING ("So that is your whole life" to the last word)
   The life path from end to end, the grown hero at its far end. "Born, hired, promoted, never paid": four cards from the story pop
   in a row, one per word (the baby in the cot, the FIRSTBORN badge, the PROMOTED star, a payslip with nothing on it). "tell me in
   the comments": a comment bubble writes itself in, a heart; a second one under it. "carrying the whole house": the house on his
   back, smaller now, and he smiles. The baby of the family laughing on the sofa at her phone; "I know that is the problem": the
   laugh fades, sheepish. "Call your elder sibling today": she dials; "how are you?": the split screen, he answers; "watch what
   happens": surprise; "They might not even know what to say": speechless, then a warm smile. "See you in the next one": a wave. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('so that is your whole life'));
  const { seg, pop, ease, lerp, punch, span } = FILM;
  const T = {
    start: W('so that is your whole life'), born: W('born'), hired: W('hired'), promoted: W('promoted'), paid: W('never paid'), paidW: W('paid'),
    comments: W('if you are a firstborn'), tell: W('tell me'), what: W('what is the most'), carrying: W('i want to see'), house: W('whole house'),
    baby: W('and if you are the baby'), laughing: W('laughing'), thinking: W('thinking'), iKnow: W('i know that'), problem: W('problem'),
    call: W('call your elder'), dont: W("don't ask for"), just: W('just say'), how: span('how', 'you', FILM.W('just say')), watch: W('and watch what'),
    might: W('they might not'), say: W('say', { after: FILM.W('they might not') }), see: W('see you in the next'), end: FILM.Wend('next one') + 0.3,
  };
  const EYE = STAGE.EYE, DAY = { tod: 'day' };

  FILM.seq({
    id: 'Q09', title: 'Call your elder sibling', chapter: 'Call your elder sibling', from: T.start,
    sound(S) {
      S.bed('music', T.start, T.end, { mood: 'warm closing theme, kalimba and guitar, gentle' });
      S.cue('whoosh', T.start + 0.1); ['born', 'hired', 'promoted', 'paidW'].forEach((k, i) => S.cue('card_land', T[k] + 0.05, { x: 330 + i * 420 }));
      S.cue('typing', T.tell + 0.2, { n: 8, x: 960 }); S.cue('heart', T.what - 0.2, { x: 1500 }); S.cue('laugh', T.laughing, { x: 820 });
      S.cue('dial', T.call + 0.5, { x: 820 }); S.cue('phone_ring', T.dont + 0.3, { x: 1440 }); S.cue('soft_ding', T.might + 1.6, { x: 1440 }); S.cue('whoosh', T.see - 0.1);
    },
    shots: [
      { at: T.start, name: 'the life path from end to end, the grown hero at its far end', in: 'fade', push: { from: 1.25, to: 1, x: 1500, y: 450 },
        draw(c) {
          const t = c.t; STAGE.lifePath(c, { lit: 5 }); const p = STAGE.pathAt(c, 0.96);
          c.fig('hero', { x: p.x, y: p.y + 6, s: p.s, face: -1, pose: 'stand', expr: 'happy', turn: 0.2 });
          STAGE.chapterCard(c, T.start + 0.25, T.start + 2.05, 'CALL YOUR ELDER SIBLING', { x: 640, y: 200, scale: 0.48 });
        } },
      { at: T.born, name: 'Born, hired, promoted, never paid: four cards from the story, one per word', in: 'cut', push: { from: 1, to: 1.04 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const g = c.g;
          const card = (i, t0, fn) => { const st = pop(t, t0, 0.36); if (!st.on) return; const x = 330 + i * 420; GFX.at(g, x, 540 + Math.sin(t * 1.5 + i) * 6, st, q => GFX.card(q, 0, 0, 360, 460, { fill: '#FFFDF7', r: 30, rot: (i % 2 ? 0.03 : -0.03), draw: q2 => fn(q2) })); };
          card(0, T.born, q => GFX.babyIcon(q, 0, 10, 1.1, { t, expr: 'neutral' }));
          card(1, T.hired, q => GFX.badge(q, 0, 40, 1.05, 'FIRSTBORN', { cord: 120 }));
          card(2, T.promoted, q => GFX.starBadge(q, 0, -20, 1.2, 'PROMOTED'));
          card(3, T.paidW, q => { GFX.rr(q, -130, -170, 260, 340, 12); GFX.inked(q, '#FFFFFF', 4); GFX.text(q, 'PAYSLIP', 0, -120, { size: 40, weight: 900, color: '#5A6670' }); GFX.text(q, GFX.money(0), 0, 10, { size: 72, weight: 900, color: '#D9443B' }); q.fillStyle = '#C9D3DC'; q.fillRect(-90, 80, 180, 12); q.fillRect(-90, 110, 120, 12); });
        } },
      { at: T.comments, name: '"tell me in the comments": a comment bubble writes itself in, a heart; a second under it', in: 'pop', push: { from: 1, to: 1.06, x: 960, y: 520 },
        draw(c) {
          const t = c.t; c.set('plain', {});
          GFX.comment(c.g, 960, 400, 1240, 420, { k: seg(t, T.tell + 0.1, T.what - 0.4), lines: ['Firstborn here.', 'School fees at 19!'], heart: seg(t, T.what - 0.3, T.what + 0.1), t });
          GFX.at(c.g, 1060, 850, pop(t, T.what + 0.6, 0.36), q => GFX.comment(q, 0, 0, 1040, 300, { k: seg(t, T.what + 0.8, T.carrying - 0.3), lines: ['Raised my brothers.'], t }));
        } },
      { at: T.carrying, name: '"carrying the whole house": the house on his back, smaller now; he smiles', in: 'cut', push: { from: 1, to: 1.08, x: 960, y: 500 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const KHo = !!(POV && POV.POSES && POV.POSES.house_small);
          if (!KHo) GFX.house(c.g, 935, 1020 - 545, 0.62, { rot: -0.04 });
          c.fig('hero', { x: 960, y: 1020, s: 1.05, face: 1, pose: KHo ? 'house_small' : 'load', phase: KHo ? (t - T.carrying) * 0.8 : undefined, dx: KHo ? -200 + 120 * seg(t, T.carrying, T.baby) : 0, expr: t > T.house ? 'happy' : 'neutral', faceOver: t > T.house ? { mouth: { k: 'smile', w: 0.26, c: 0.11 } } : null, turn: 0, look: [0, 0] });
        } },
      { at: T.baby, name: 'the baby of the family laughing on the sofa at her phone', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.06, x: 900, y: 560 },
        draw(c) {
          const t = c.t; c.set('home', DAY); const a = c.anchor('home', 'sofaM', [935, 738]);
          c.fig('sister', { x: a.x, y: 990, seatAt: { x: a.x, y: a.y }, s: a.s || 1, face: 1, pose: 'sit_sofa', hold: 'phone', expr: 'happy', mouth: t > T.laughing ? 0.4 + 0.4 * Math.abs(Math.sin(t * 8)) : 0, dy: t > T.laughing ? -Math.abs(Math.sin(t * 8)) * 6 : 0, look: [0.3, 0.8] });
          c.setFront('home', DAY);
        } },
      { at: T.iKnow, name: '"I know that is the problem": the laugh fades, sheepish', in: 'cut', push: { from: 1.25, to: 1.35, x: 935, y: 440 },
        draw(c) {
          const t = c.t; c.set('home', DAY); const a = c.anchor('home', 'sofaM', [935, 738]); const sh = t > T.problem - 0.3;
          c.fig('sister', { x: a.x, y: 990, seatAt: { x: a.x, y: a.y }, s: a.s || 1, face: 1, pose: 'sit_sofa', hold: 'phone', expr: sh ? 'guilty' : 'happy', mouth: !sh ? 0.3 * Math.abs(Math.sin(t * 8)) : 0, look: sh ? [-0.6, 0.2] : [0.3, 0.8], turn: sh ? -0.2 : 0.35 });
          c.setFront('home', DAY);
        } },
      { at: T.call, name: '"Call your elder sibling today": she dials', in: 'cut', push: { from: 1.1, to: 1.18, x: 935, y: 460 },
        draw(c) {
          const t = c.t; c.set('home', DAY); const a = c.anchor('home', 'sofaM', [935, 738]); const ear = t > T.dont - 0.1;
          c.fig('sister', { x: a.x, y: 990, seatAt: { x: a.x, y: a.y }, s: a.s || 1, face: 1, pose: ear ? 'sit_phone' : 'sit_sofa', hold: ear ? undefined : 'phone', expr: 'neutral', look: ear ? [0.6, 0] : [0.3, 0.8] });
          c.setFront('home', DAY);
        } },
      { at: T.just, name: '"Just say, how are you?": the split screen, he answers', in: 'cut',
        draw(c) {
          const t = c.t;
          STAGE.call(c, (cc, r) => { STAGE.fit(cc, r, { x: 935, y: 520, zoom: 1.35 }); cc.set('home', DAY); const a = cc.anchor('home', 'sofaM', [935, 738]); cc.fig('sister', { x: a.x, y: 990, seatAt: { x: a.x, y: a.y }, s: a.s || 1, face: 1, pose: 'sit_phone', expr: 'happy', talk: T.how, look: [0.6, 0] }); cc.setFront('home', DAY); },
            (cc, r) => { STAGE.fit(cc, r, { x: 960, y: 560, zoom: 1.25 }); cc.set('office', {}); cc.fig('hero', { x: 960, y: 962, s: 1, face: -1, pose: 'hold_phone', mode: 'ear', expr: t > T.how[1] ? 'surprised' : 'neutral', turn: 0.3 }); },
            { k: seg(t, T.just, T.just + 0.5) });
        } },
      { at: T.watch, name: 'close on him: surprise; speechless; then a warm smile', in: 'cut', push: { from: 1.1, to: 1.3, x: 960, y: 400 },
        draw(c) {
          const t = c.t; c.set('office', {}); const smile = t > T.say + 0.5;
          c.fig('hero', { x: 960, y: 962, s: 1.1, face: 1, pose: 'hold_phone', mode: 'ear', expr: smile ? 'happy' : (t > T.might ? 'surprised' : 'neutral'), mouth: !smile && t > T.might ? 0.25 : 0, turn: 0, look: [0, 0], blinks: [T.might + 0.4, T.might + 0.62, T.say + 0.3] });
        } },
      { at: T.see, name: '"See you in the next one": a wave', in: 'cut', push: { from: 1, to: 1.05, x: 960, y: 480 },
        draw(c) { c.set('home', DAY); c.fig('hero', { x: 960, y: 990, s: 1.08, face: 1, pose: 'wave', expr: 'happy', turn: 0, look: [0, 0] }); } },
    ],
  });
})();
