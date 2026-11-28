/* Q08 · SUNDAY: THE TALLY ("Sunday" to "Here's what I noticed")
   Card SUNDAY. The living room, warm evening, the hero with coffee (ref 03). "A few people were annoyed": small portraits pop up,
   the friend frowning, Mom's tight smile; "One went quiet": the friend's portrait greys out with "…"; "respected you more": the
   coworker and the boss, smiling. "Nobody's life ended": the portraits shrink away; the hero sips. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('sunday so what'));
  const { seg, pop, popOut } = FILM;
  const T = {
    card: W('Sunday'), so: W('so what'), few: W('a few'), annoyed: W('annoyed'), quiet: W('one went'), oneOrTwo: W('one or two'), respected: W('respected'),
    nobody: W("nobody's"), life: W('life'), ended: Wend('ended'), end: FILM.W("here's"),
  };
  const EVE = { tod: 'evening' };
  // the portraits: who, where, expression, in, (grey from)
  const P = [
    { who: 'friend', x: 1340, y: 250, expr: 'angry', t0: T.few, grey: T.quiet },
    { who: 'mum', x: 1640, y: 330, expr: 'neutral', t0: T.annoyed, face: { mouth: { k: 'flat', w: 0.2 } } },
    { who: 'coworker', x: 1380, y: 560, expr: 'happy', t0: T.oneOrTwo + 0.2 },
    { who: 'boss', x: 1680, y: 640, expr: 'happy', t0: T.respected },
  ];

  function tally(c) {
    const t = c.t; STAGE.heroSofa(c, EVE, { hold: t > T.life ? 'sip' : 'mug', expr: t > T.nobody ? 'happy' : t > T.oneOrTwo ? 'surprised' : 'neutral', look: t > T.few && t < T.nobody ? [0.7, -0.3] : null });
    P.forEach((p, i) => {
      const a = pop(t, p.t0, 0.34), b = popOut(t, T.nobody + 0.15 + i * 0.08, 0.28); const st = { sx: a.sx * b.sx, sy: a.sy * b.sy, a: a.a * b.a, on: a.on && b.on };
      if (!st.on) return; const grey = p.grey ? seg(t, p.grey, p.grey + 0.4) : 0;
      GFX.at(c.g, p.x, p.y, st, () => { c.g.translate(-p.x, -p.y); GFX.portrait(c, p.who, p.x, p.y, 120, { expr: grey > 0.5 ? 'sad' : p.expr, grey, fig: { faceOver: p.face } }); if (grey > 0) { c.g.globalAlpha *= grey; GFX.dots(c.g, p.x - 150, p.y - 120, 0.6, t - p.grey); } });
    });
  }

  FILM.seq({
    id: 'Q08', title: 'Sunday', chapter: 'Sunday', from: T.card,
    sound(S) {
      S.bed('music', T.card, T.end, { mood: 'warm, settled' }); S.bed('living_room_evening', T.card, T.end);
      S.cue('whoosh', T.card - 0.1); S.cue('pop', T.card + 0.05); S.cue('pop', P[0].t0); S.cue('pop', P[2].t0); /* the annoyed pair, then the respectful pair */ S.cue('deflate', T.quiet + 0.1);
      S.cue('whoosh', T.nobody + 0.1); S.cue('sip', T.life + 0.2);
    },
    shots: [
      { at: T.card, name: 'living, warm evening: the day card over the hero with coffee', in: { type: 'wipe', dir: 'right' }, push: 1.04,
        draw(c) { STAGE.heroSofa(c, EVE, { hold: 'mug', expr: 'happy' }); STAGE.dayCard(c, T.card + 0.05, T.so - 0.05, 'SUNDAY'); } },
      // the tally in three framings: wide (annoyed), closer on the portraits (quiet, respected), close on him (nobody's life ended)
      { at: T.so, name: 'living: the tally: a few annoyed (portraits pop up)', push: { from: 1, to: 1.05, x: 1100, y: 480 }, draw: tally },
      { at: T.quiet, name: 'living, closer: one went quiet; two respected you more', push: { from: 1.18, to: 1.24, x: 1250, y: 470 }, draw: tally },
      { at: T.nobody, name: 'living, close: nobody\'s life ended; the portraits shrink away; he sips', push: { from: 1.45, to: 1.52, x: 900, y: 420 }, draw: tally },
    ],
  });
})();
