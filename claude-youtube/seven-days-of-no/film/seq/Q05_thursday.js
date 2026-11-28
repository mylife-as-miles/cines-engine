/* Q05 · THURSDAY: THE COWORKER ("Thursday" to "Friday")
   Card THURSDAY. The office: the coworker pops into the doorway, waving. "Lunch?" "No.": he waves and walks off. "you know": the
   hero's hand to his mouth, a thought bubble with the plate (ref 09). "for weeks": the bubble swells; the hero sags. "Here is the
   problem": plain, two cards side by side, the boss's late night and a lunch you wanted (icons, no words); the NO stamp hits
   both, the second on "the things you actually want". */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('Thursday'));
  const { span, seg, pop, walk, ease } = FILM;
  const T = {
    card: W('Thursday'), pops: W('pops'), lunch: span('lunch', 'opened', FILM.W('Thursday')), no: span('no', null, FILM.W('Thursday')), leaves: W('the second'),
    know: W('you know'), wanted: W('you wanted'), been: W('you have been'), weeks: Wend('weeks'), problem: W('here is the problem'),
    no1: W('no', { after: FILM.W('here is the problem') }), also: W('also'), no2: W('no', { after: FILM.W('also') }), end: FILM.W('Friday'),
  };
  const DOOR = { view: 'door', clock: '12:30', chair: true };
  function coworker(c) {
    const t = c.t, d = c.anchor('office', 'doorway'); let x = d.x, face = 1, pose = 'wave', wk = null, alpha = 1;
    if (t < T.pops + 0.3) { x = d.x - 180 * (1 - ease.outBack(seg(t, T.pops - 0.1, T.pops + 0.3))); alpha = seg(t, T.pops - 0.1, T.pops); }
    else if (t < T.no[1] + 0.2) pose = t < T.lunch[0] ? 'wave' : 'stand';
    else if (t < T.no[1] + 0.9) pose = 'wave';
    else { wk = walk(t, T.no[1] + 0.9, T.no[1] + 2.6, d.x, d.x - 380); x = wk.x; face = -1; pose = 'walk'; }
    return c.fig('coworker', { x, y: d.y, s: d.s, face, pose, walk: wk ? wk.walk : 0, phase: pose === 'wave' ? t * 1.6 : undefined, expr: t > T.no[1] ? 'surprised' : 'happy', talk: T.lunch, alpha, turn: pose === 'walk' ? undefined : STAGE.EYE.turn, look: pose === 'walk' ? undefined : STAGE.EYE.look });
  }

  FILM.seq({
    id: 'Q05', title: 'Thursday: lunch', chapter: 'Thursday: lunch', from: T.card,
    sound(S) {
      S.bed('music', T.card, T.end, { mood: 'light, then wistful' }); S.bed('office_room', T.card, T.problem);
      S.cue('whoosh', T.card - 0.1); S.cue('pop', T.card + 0.05); S.cue('footsteps', T.no[1] + 0.9, { n: 4, gap: 0.4 });
      S.cue('pop', T.know + 0.2); S.cue('swell', T.been); S.cue('whoosh', T.problem - 0.05); S.cue('pop', T.problem + 0.15);
      S.cue('stamp', T.no1); S.cue('stamp', T.no2);
    },
    shots: [
      { at: T.card, name: 'office: the day card over the hero at his desk', in: { type: 'wipe', dir: 'right' }, push: 1.04,
        draw(c) { const o = { clock: '12:30', chair: true }; c.set('office', o); const sa = STAGE.sitAt(c, 'office', 'chair'); c.fig('hero', Object.assign(sa, { face: -1, pose: 'type' })); c.setFront('office', Object.assign({ parts: ['desk'] }, o));
          STAGE.dayCard(c, T.card + 0.05, T.pops - 0.05, 'THURSDAY'); } },
      { at: T.pops, name: 'office door: the coworker pops in, waving: "Lunch?" "No."', push: { from: 1, to: 1.04, x: 700, y: 560 },
        draw(c) { c.set('office', DOOR); coworker(c); c.setFront('office', DOOR); c.fig('hero', Object.assign({ x: 1180, y: 962, face: -1, talk: T.no, turn: STAGE.EYE.turn, look: STAGE.EYE.look }, c.t > T.no[0] - 0.15 && c.t < T.no[1] + 0.6 ? STAGE.NO : { pose: 'stand', expr: 'neutral' })); } },
      { at: T.know, name: 'the hero, hand to mouth: the thought of the plate; it swells, he sags', push: { from: 1, to: 1.08, x: 1200, y: 400 },
        draw(c) {
          const t = c.t; c.set('office', DOOR); c.setFront('office', DOOR);
          const sag = seg(t, T.been, T.weeks); const h = c.fig('hero', { x: 1180, y: 962, face: -1, pose: 'hand_mouth', expr: sag > 0.3 ? 'sad' : 'worried', override: sag > 0 ? { head: { sink: 14 * sag, tilt: -0.08 * sag } } : null });
          const hd = ART.head('hero', h); const sc = 1 + 0.2 * ease.outBack(sag);
          STAGE.thought(c, 1530, 310, T.know + 0.2, { scale: sc, s: 1.3, tail: [[hd.x + 120, hd.y - 80, 14], [hd.x + 190, hd.y - 110, 22]] });
        } },
      { at: T.problem, name: 'plain: two cards, the late night and the lunch; NO on both', in: 'pop',
        draw(c) {
          const t = c.t; if (t > T.no1) c.impact(t > T.no2 ? T.no2 : T.no1, 0.25, 10);
          c.set('plain', {});
          GFX.at(c.g, 600, 540, pop(t, T.problem + 0.15, 0.36), q => GFX.card(q, 0, 0, 520, 600, { fill: '#FFF4E3', r: 40, rot: -0.04, draw: (g2) => {
            ART.clock(g2, -40, -60, 130, '9:20'); g2.save(); g2.translate(130, -190); g2.beginPath(); g2.arc(0, 0, 54, 0, Math.PI * 2); g2.arc(24, -16, 46, 0, Math.PI * 2, true); g2.fillStyle = '#F4BF54'; g2.fill('evenodd'); g2.restore();
            GFX.portrait(c, 'boss', 0, 170, 90, { expr: 'neutral' }); } }));
          GFX.at(c.g, 1320, 540, pop(t, T.problem + 0.55, 0.36), q => GFX.card(q, 0, 0, 520, 600, { fill: '#FFF4E3', r: 40, rot: 0.04, draw: (g2) => {
            c.prop('plateIcon', { x: 0, y: -40, s: 2.6 });
            g2.save(); g2.translate(0, 190); g2.fillStyle = '#E5534B'; g2.beginPath(); g2.moveTo(0, 30); g2.bezierCurveTo(-70, -20, -40, -70, 0, -40); g2.bezierCurveTo(40, -70, 70, -20, 0, 30); g2.fill(); g2.lineWidth = 5; g2.strokeStyle = '#1c1c1c'; g2.stroke(); g2.restore(); } }));
          STAGE.stamp(c, 600, 560, T.no1, 'NO', { size: 150, rot: -0.2 }); STAGE.stamp(c, 1320, 560, T.no2, 'NO', { size: 150, rot: 0.12 });
        } },
    ],
  });
})();
