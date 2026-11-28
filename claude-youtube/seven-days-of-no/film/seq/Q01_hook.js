/* Q01 · HOOK: THE QUESTION (0 to "Monday")
   Cold open: the first frame is a green YES stamp hitting a request card; more requests land on a growing pile, each stamped
   YES, while the hero nods faster and faster ("You say yes to everything"). A montage, one beat per item: the office at night
   ("Staying late"); the street, a banknote to the friend ("lending money"); the party, party hat and cup, tired ("going to the
   thing"). "Yes, yes, yes": the pile towers, three stamped pushes. "Even when your whole body is saying no": the hard comic beat,
   the smile holds while a red NO! bursts out of his body and slams on "no", and the pile topples. The question: a big question
   mark and a push in; "for seven days" a strip of seven day cards slides in; "say no to everyone" a NO stamp on each. "Not rude,
   not angry": a rude face and an angry face, each crossed out; "just no": calm, one hand up. "Let's see": he walks out. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(0);
  const { seg, pop, nod, punch, slide, walk, ease } = FILM;
  const y3 = FILM.from(FILM.W('thing'));
  const T = {
    you: W('you'), yes: W('yes'), to: W('to'), everything: W('everything'), staying: W('staying'), lending: W('lending'), money: W('money'), going: W('going'),
    yy: [y3.W('yes', 1), y3.W('yes', 2), y3.W('yes', 3)], yyEnd: y3.Wend('yes', 3), even: W('even'), whole: W('whole'), body: W('whole body'), sayingNo: W('saying no'), no: W('no', { after: FILM.W('saying') }),
    so: W('so here'), question: W('question'), forSeven: W('for seven'), sayNo: W('say no', { after: FILM.W('for seven') }), everyone: Wend('everyone'),
    notRude: W('not rude'), rude: W('rude'), not2: W('not', { after: FILM.W('rude') }), angry: W('angry'), just: W('just'), justNo: FILM.span('no', null, FILM.W('just')),
    lets: W("let's"), see: W('see', { after: FILM.W("let's") }), end: FILM.W('Monday'),
  };
  const DAYS3 = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const STAMPS = DAYS3.map((d, i) => FILM.lerp(W('no', { after: T.sayNo }), T.everyone - 0.1, i / 6));
  // the pile of requests: each lands (and is stamped YES) at its time; the first at frame 0 is the cold open. The landings come
  // faster and faster through "You say yes to everything", then three more on "Yes, yes, yes"
  const KINDS = ['box', 'clip', 'mail', 'mug', 'phone', 'plate', 'money', 'party', 'late', 'money', 'party', 'mail', 'phone', 'clip', 'box', 'mug', 'plate', 'late', 'mail', 'money'];
  const LAND = [-5, -5, -5, -5, -5, -5, -5, -5, 0.1, T.yes, T.to, T.everything, T.everything + 0.32, T.everything + 0.58, T.everything + 0.8, T.everything + 1.0, T.everything + 1.17].concat(T.yy);
  const PILE = { x: 1360, y: 1040, step: 92 };
  const NODS = [0.1, T.yes, T.to, T.everything, T.everything + 0.32, T.everything + 0.58, T.everything + 0.8, T.everything + 1.0, T.everything + 1.17];
  function pile(c, toppleAt) {
    const t = c.t, g = c.g, fall = toppleAt != null ? ease.inQuad(seg(t, toppleAt, toppleAt + 0.7)) : 0;
    LAND.forEach((t0, i) => {
      if (t < t0 - 0.18) return;
      const k = seg(t, t0 - 0.18, t0, 'inQuad'), rot = ((i * 37) % 11 - 5) * 0.012;
      let x = PILE.x + ((i * 53) % 7 - 3) * 6, y = PILE.y - 90 - i * PILE.step - (1 - k) * 700;
      if (fall > 0) { const dir = i % 2 ? 1 : -1; x += dir * fall * (120 + i * 40); y += fall * fall * (400 + i * 30); }
      GFX.taskCard(g, x, y, KINDS[i % KINDS.length], rot + fall * (i % 2 ? 0.8 : -0.8), 1);
      if (fall < 0.2) STAGE.stamp(c, x + 70, y + 20, t0 + 0.02, 'YES', { size: 52, rot: -0.2, color: '#4FA35B' });
    });
  }

  FILM.seq({
    id: 'Q01', title: 'The question', chapter: 'The question', from: 0,
    sound(S) {
      S.bed('music', 0, T.end, { mood: 'cozy, bouncy, light' });
      S.cue('stamp', 0.12); LAND.filter(t => t > 0.2).slice(0, 8).forEach(t => S.cue('card_land', t)); S.cue('whoosh', T.staying - 0.08); S.cue('typing', T.staying + 0.1, { n: 8 }); S.cue('whoosh', T.lending - 0.08);
      S.cue('whoosh', T.going - 0.08); S.bed('party_murmur', T.going, T.yy[0]);
      T.yy.forEach(t => S.cue('stamp', t + 0.02)); S.cue('wobble', T.even + 0.1); S.cue('shout_no', T.no); S.cue('pile_topple', T.no + 0.1);
      S.cue('pop', T.so + 0.3); S.cue('whoosh', T.forSeven); STAMPS.forEach(t => S.cue('stamp', t));
      S.cue('pop', T.rude); S.cue('wrong', T.not2); S.cue('pop', T.angry); S.cue('wrong', T.just - 0.25); S.cue('ding', T.justNo[0]);
      S.cue('footsteps', T.see, { n: 4, gap: 0.32 }); S.cue('whoosh', T.end - 0.12);
    },
    shots: [
      { at: 0, name: 'cold open: YES stamps on a growing pile of requests; the hero nods faster and faster', push: { from: 1, to: 1.06, x: 1060, y: 500 },
        draw(c) {
          const t = c.t; const st = LAND.filter(l => l <= t + 0.02).pop(); if (st != null && t - st < 0.2) c.impact(st + 0.02, 0.18, 7);
          STAGE.plainHero(c, { x: 680, expr: 'happy', nod: 0.75 * nod(t, NODS, 0.24), talk: [T.you, Wend('everything')] }); pile(c);
        } },
      { at: T.staying, name: 'office at night, the clock past nine: staying late', push: 1.05,
        draw(c) { const o = { night: true, clock: '9:20', chair: true }; c.set('office', o); const sa = STAGE.sitAt(c, 'office', 'chair'); c.fig('hero', Object.assign(sa, { face: -1, pose: 'type', expr: 'tired', tint: ART.tintFor(c, 'office') })); c.setFront('office', Object.assign({ parts: ['desk'] }, o)); } },
      { at: T.lending, name: 'street: a banknote handed to the friend: lending money', push: 1.05,
        draw(c) {
          c.set('street', {}); const L = c.anchor('street', 'left'), R = c.anchor('street', 'right');
          const h = c.fig('hero', { x: L.x + 60, y: L.y, s: L.s, face: 1, pose: 'stand', expr: 'happy', turn: STAGE.EYE.turn, look: STAGE.EYE.look, override: { armR: { a: 1.3, e: 0.2, hand: 'hold', flip: -1 } } });
          c.fig('friend', { x: R.x - 40, y: R.y, s: R.s, face: -1, pose: 'stand', expr: 'happy', turn: STAGE.EYE.turn, look: STAGE.EYE.look, override: { armR: { a: 1.2, e: 0.35, hand: 'open', flip: 1 } } });
          const hn = ART.hand('hero', h, 'front'); const st = pop(c.t, T.money - 0.15, 0.3); GFX.at(c.g, hn.x + 40, hn.y - 20, st, q => GFX.banknote(q, 0, 0, 0.9, -0.15));
        } },
      { at: T.going, name: 'the party (paper chains): the hero in a party hat with a cup, tired', push: { from: 1.02, to: 1.08, x: 900, y: 560 },
        draw(c) {
          c.set('party', {}); const L = c.anchor('party', 'left'), B = c.anchor('party', 'behindTable'), M = c.anchor('party', 'center');
          c.fig('coworker', { x: B.x, y: B.y, s: B.s, face: -1, pose: 'wave', phase: c.t * 1.7, expr: 'happy' });
          c.setFront('party', {});
          c.fig('friend', { x: L.x - 60, y: L.y, s: L.s * 0.96, face: 1, pose: 'wave', expr: 'happy' });
          const h = c.fig('hero', { x: M.x + 60, y: M.y, s: M.s, face: 1, pose: 'stand', hold: 'mug', expr: 'tired', nod: 0.1 * Math.sin(c.t * 2) });
          const hd = ART.head('hero', h); GFX.partyHat(c.g, hd.x + 6, hd.y - hd.r * 0.8, hd.r / 100, 0.12);
        } },
      { at: T.yy[0], name: 'plain: yes, yes, yes: the pile towers, three stamped pushes',
        draw(c) { const t = c.t; c.camera({ x: 1000, y: 470, zoom: punch(t, T.yy, 0.1, 0.32), free: true }); c.impact(T.yy.filter(y => y <= t).pop() || T.yy[0], 0.16, 6);
          STAGE.plainHero(c, { x: 680, expr: 'happy', nod: 0.8 * nod(t, T.yy, 0.28), talk: [T.yy[0], T.yyEnd] }); pile(c); } },
      { at: T.even, name: 'the hard comic beat: the smile holds, a red NO! bursts out of his body and slams; the pile topples', push: { from: 1.02, to: 1.1, x: 900, y: 560 },
        draw(c) {
          const t = c.t; if (t > T.no) c.impact(T.no, 0.45, 18, 3);
          const h = STAGE.plainHero(c, { x: 680, expr: t > T.no + 0.15 ? 'surprised' : 'happy', faceOver: { sweat: 1 }, tremble: 3 + 6 * seg(t, T.even, T.no) });
          pile(c, T.no + 0.05);
          const hd = ART.head('hero', h); const grow = 0.55 + 0.3 * ease.outCubic(seg(t, T.even + 0.05, T.no - 0.1)), slam = t >= T.no ? 1 + 0.35 * (1 - ease.outBack(seg(t, T.no, T.no + 0.25), 2.5)) : 1;
          const pulse = 1 + 0.04 * Math.sin(t * 22) * (t < T.no ? 1 : 0), s = (t < T.no ? grow : 1.05) * slam * pulse;
          GFX.burst(c.g, hd.x + 120, hd.y + hd.r * 3.2, s, 'NO!', { rot: -0.08 });
          [[1.05, -0.5, T.whole], [-1.1, -0.2, T.sayingNo]].forEach(([fx, fy, t0]) => { const st = pop(t, t0, 0.3); GFX.at(c.g, hd.x + fx * hd.r, hd.y + fy * hd.r + 40 * seg(t, t0, t0 + 1.2), st, q => GFX.sweat(q, 0, 0, 1.6)); });
        } },
      { at: T.so, name: 'plain: the question: a big question mark, a push in', in: 'pop', push: { from: 1, to: 1.28, x: 960, y: 360, ease: 'inOutSine' },
        draw(c) {
          const t = c.t, h = STAGE.plainHero(c, { pose: 'think', expr: t < T.question ? 'neutral' : 'surprised', look: [0.3, -0.6] }); const hd = ART.head('hero', h);
          GFX.at(c.g, hd.x + hd.r * 2.2, hd.y - hd.r * 1.0, pop(t, T.so + 0.3, 0.36), q => GFX.bigQuestion(q, 0, 0, 0.85 + 0.08 * Math.sin(t * 3)));
        } },
      { at: T.forSeven, name: 'plain: seven day cards slide in; a NO stamp lands on each', in: { type: 'slide', dir: 'left' },
        draw(c) {
          const t = c.t; if (t > STAMPS[0]) c.impact(STAMPS[Math.max(0, STAMPS.filter(s => s <= t).length - 1)], 0.18, 6);
          c.set('plain', {});
          DAYS3.forEach((d, i) => {
            const x = 960 + (i - 3) * 255, dx = slide(t, T.forSeven + 0.05 + i * 0.08, 1400, 0.5, 'outCubic');
            GFX.card(c.g, x + dx, 540, 230, 300, { fill: '#FFF4E3', band: '#3A8594', bandH: 70, r: 28, rot: (i % 2 ? 0.03 : -0.03),
              draw: q => { GFX.text(q, d, 0, -112, { size: 44, weight: 900, color: '#FFFFFF' }); GFX.text(q, String(i + 1), 0, 34, { size: 120, weight: 900, color: '#1c1c1c' }); } });
            STAGE.stamp(c, x, 580, STAMPS[i], 'NO', { size: 72, rot: -0.22 + (i % 3) * 0.08 });
          });
        } },
      { at: T.notRude, name: 'plain: not rude, not angry: each face crossed out', push: { from: 1, to: 1.05 },
        draw(c) {
          c.set('plain', {}); const t = c.t;
          [[620, 'rude', 'stand', T.notRude + 0.05, T.not2], [1300, 'angry', 'stand', T.angry, T.just - 0.25]].forEach(([x, expr, pose, t0, tx]) => {
            const st = pop(t, t0 - 0.05, 0.32); if (!st.on) return;
            GFX.at(c.g, x, 520, st, () => { c.g.translate(-x, -520); GFX.portrait(c, 'hero', x, 520, 270, { expr, fig: { pose } }); });
            GFX.cross(c.g, x, 520, 380, seg(t, tx, tx + 0.25));
          });
        } },
      { at: T.just, name: 'plain: just no: calm, the flat palm out', in: 'pop', push: { from: 1.08, to: 1.02, x: 960, y: 420 },
        draw(c) { STAGE.plainHero(c, Object.assign({ talk: T.justNo }, c.t > T.justNo[0] - 0.15 ? STAGE.NO : { pose: 'stand', expr: 'neutral' })); } },
      { at: T.lets, name: "plain: let's see: he walks out of frame",
        draw(c) { c.set('plain', {}); const a = c.anchor('plain', 'stand', { x: 960, y: 980, s: 1 }); const wk = walk(c.t, T.see - 0.05, T.end + 0.3, a.x, 2250); c.fig('hero', { x: wk.x, y: a.y, s: a.s, face: 1, pose: wk.moving ? 'walk' : 'stand', walk: wk.walk, expr: 'happy' }); } },
    ],
  });
})();
