/* Q06 · MANAGEMENT AT 30 ("By 30" to "Now, let's be honest")
   His FIRSTBORN badge flips to MANAGEMENT (a stamp). The party hall changes its dress on each word: a wedding, a funeral, a naming
   ceremony, the hero with a clipboard in every one; "in charge of something": running the hall. An auntie turns to him: "who is
   handling the rice?", a giant pot; "Why do I know about rice?": he stirs it, sweating; "I came here to attend": in his party
   clothes, exasperated. Two uncles back to back, talking only through him, his head turning left and right. Two cousins
   fighting; "you are the United Nations": the hero at a podium between them, plain coloured flags. The aunties close in ("the
   question"); "when are we eating your rice?": a rice pot with a heart; "Not if. When.": they lean in, two punches. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('by 30'));
  const { seg, pop, ease, lerp, walk, punch, nod, span } = FILM;
  const T = {
    start: W('by 30'), title: W('job title'), management: W('you are now management'), mgmtW: W('management'),
    wedding: W('every wedding'), funeral: W('every funeral'), naming: W('every naming'), charge: W('you are somehow in charge'), something: W('something', { after: FILM.W('in charge') }),
    turns: W('somebody turns'), riceLine: span('who', 'rice', FILM.W('somebody turns')), riceW: W('rice'), why: W('why do i know'), whyLine: span('why', 'rice', FILM.W('why do i know')),
    attend: W('i came here'), attendLine: span('i', 'attend', FILM.W('i came here')), uncles: W('uncles who'), years: W('five years'), through: W('talk through you'),
    cousins: W('two cousins'), fighting: W('fighting'), un: W('and you are the united'), unW: W('united nations'),
    question: W('and then there is the question'), q25: W('25'), when: W('so when are we'), whenLine: span('so', 'rice', FILM.W('so when are we')),
    notIf: W('not if'), whenW: W('when', { after: FILM.W('not if') }), end: FILM.W("now let's be honest"),
  };
  const EYE = STAGE.EYE;
  // the hall's dress per occasion: the kit's party hall themes (wedding, naming); a theme it lacks (the funeral) gets a stand-in
  // dressing over the wedding hall, as does every theme while the kit has no hall at all
  const themes = () => { const f = STAGE.kit('partyHall'); const src = f ? Function.prototype.toString.call(f) + Function.prototype.toString.call(SETS.party) : ''; return { hall: !!f, funeral: /funeral/.test(src) }; };
  function hall(c, kind, o) {
    const K = themes(), real = K.hall && (kind !== 'funeral' || K.funeral);
    o = Object.assign({ hall: true, theme: real ? kind : 'wedding' }, o || {}); c.set(K.hall ? 'partyHall' : 'party', o); if (real) return;
    const g = c.g, t = c.t; ART.placeholders.set['partyHall theme: ' + kind] = 1;
    if (kind === 'funeral') { c.screen(); g.fillStyle = 'rgba(70,40,90,0.35)'; g.fillRect(0, 0, 1920, 1080); c.reset(); for (let i = 0; i < 9; i++) { GFX.rr(g, i * 220 - 20, -10, 120, 260, 30); GFX.inked(g, i % 2 ? '#3C2A4D' : '#6E4C8C', 4); } }
    else if (kind === 'naming') { [[200, 300, '#E37F78'], [380, 220, '#F4BF54'], [1540, 260, '#7BAFE1'], [1720, 330, '#77CC81']].forEach(([x, y, cc], i) => { g.beginPath(); g.moveTo(x, y + 90); g.lineTo(x + 10, y + 300); g.lineWidth = 3; g.strokeStyle = '#1c1c1c'; g.stroke(); g.beginPath(); g.ellipse(x, y + Math.sin(t * 2 + i) * 8, 62, 78, 0, 0, Math.PI * 2); GFX.inked(g, cc, 4.5); }); }
  }
  // the occasion's name, a pill in the empty top-right corner (the kinds change on their words)
  const occasion = (c, kind, t0) => STAGE.tag(c, 1640, 150, kind.toUpperCase(), { t0, anim: 'slide', size: 56, fill: kind === 'funeral' ? '#6E4C8C' : kind === 'naming' ? '#7BAFE1' : '#F4BF54', color: kind === 'funeral' ? '#FFFFFF' : '#1c1c1c' });
  const riceAt = c => c.anchor('partyHall', 'rice', [1300, 700]), riceSide = c => c.anchor('partyHall', 'riceSide', [1080, 985]);
  // the hero with a clipboard (and a headset) running the event
  function boss(c, o) { const h = c.fig('hero', Object.assign({ x: 960, y: 985, s: 1.02, face: 1, pose: 'hold_clipboard', expr: 'neutral' }, o)); const hd = ART.head('hero', h); const g = c.g; g.save(); g.lineWidth = hd.r * 0.12; g.strokeStyle = '#3D3F48'; g.beginPath(); g.arc(hd.x, hd.y, hd.r * 1.05, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(hd.x + (o.face || 1) * hd.r * 0.95, hd.y + hd.r * 0.15, hd.r * 0.16, 0, Math.PI * 2); GFX.inked(g, '#3D3F48', 3); g.beginPath(); g.moveTo(hd.x + (o.face || 1) * hd.r * 0.95, hd.y + hd.r * 0.3); g.quadraticCurveTo(hd.x + (o.face || 1) * hd.r * 0.8, hd.y + hd.r * 0.7, hd.x + (o.face || 1) * hd.r * 0.35, hd.y + hd.r * 0.62); g.lineWidth = 4; g.stroke(); g.restore(); return h; }

  FILM.seq({
    id: 'Q06', title: 'Management at 30', chapter: 'Management at 30', from: T.start,
    sound(S) {
      S.bed('music', T.start, T.end, { mood: 'busy party highlife, comic' });
      S.cue('card_flip', T.mgmtW - 0.1, { x: 960 }); S.cue('stamp', T.mgmtW + 0.2, { x: 960 });
      S.cue('whoosh', T.wedding); S.cue('whoosh', T.funeral); S.cue('whoosh', T.naming); S.cue('footsteps', T.charge + 0.1, { n: 6, gap: 0.25, x: 960 });
      S.cue('pot_lid', T.riceW, { x: 1300 }); S.cue('stir', T.why + 0.2, { x: 1000 }); S.cue('huff', T.attend + 0.4, { x: 960 });
      S.cue('whoosh_small', T.through - 0.4, { x: 700 }); S.cue('whoosh_small', T.through + 0.4, { x: 1200 });
      S.cue('argue', T.cousins + 0.3, { x: 960 }); S.cue('gavel', T.unW, { x: 960 }); S.cue('footsteps', T.question + 0.3, { n: 4, gap: 0.35, x: 960 });
      S.cue('sparkle', T.whenLine[1] - 0.3, { x: 1500 }); S.cue('punch_in', T.notIf, { x: 960 }); S.cue('punch_in', T.whenW, { x: 960 });
    },
    shots: [
      { at: T.start, name: 'his FIRSTBORN badge; "management": it flips to MANAGEMENT with a stamp', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.08, x: 960, y: 520 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const fl = seg(t, T.mgmtW - 0.15, T.mgmtW + 0.15), sc = Math.abs(Math.cos(fl * Math.PI));
          const h = c.fig('hero', { x: 640, y: 1240, s: 1.45, face: 1, pose: 'stand', expr: t > T.mgmtW + 0.3 ? 'surprised' : 'neutral', turn: 0.4, look: [1, 0.3] });
          c.g.save(); c.g.translate(1250, 560); c.g.scale(Math.max(0.03, sc), 1); GFX.badge(c.g, 0, 0, 1.6, fl < 0.5 ? 'FIRSTBORN' : 'MANAGEMENT', { cord: 300, color: fl < 0.5 ? '#3A8594' : '#7B5EA7' }); c.g.restore();
          if (t > T.mgmtW + 0.2) c.impact(T.mgmtW + 0.2, 0.2, 6);
          STAGE.chapterCard(c, T.start + 0.2, T.start + 2.0, 'MANAGEMENT AT 30', { x: 1380, y: 960, scale: 0.55 });
        } },
      { at: T.wedding, name: 'the hall changes on each word: a wedding, a funeral, a naming ceremony; the hero with his clipboard', in: { type: 'wipe', dir: 'left' },
        draw(c) {
          const t = c.t, kind = t < T.funeral ? 'wedding' : t < T.naming ? 'funeral' : 'naming';
          c.camera({ x: 960, y: 560, zoom: punch(t, [T.funeral, T.naming], 0.04, 0.3), free: true }); hall(c, kind);
          boss(c, { x: 760, y: 985, expr: kind === 'funeral' ? 'sad' : 'neutral', look: [0.3, 0.6], nod: 0.2 });
          occasion(c, kind, kind === 'wedding' ? T.wedding : kind === 'funeral' ? T.funeral : T.naming);
        } },
      { at: T.charge, name: '"in charge of something": running the hall, clipboard and headset', in: 'cut', push: { from: 1, to: 1.04 },
        draw(c) {
          const t = c.t; hall(c, 'wedding'); const wk = walk(t, T.charge, T.turns, 300, 1500, { s: 1 });
          boss(c, { x: wk.x, y: 985, face: 1, pose: 'run', phase: (t - T.charge) * 1.8, expr: 'worried' });
          GFX.speed(c.g, wk.x - 80, 985, 640, 1, t);
        } },
      { at: T.turns, name: 'an auntie turns to him: "who is handling the rice?"; a giant pot appears', in: 'cut', push: { from: 1, to: 1.05, x: 900, y: 560 },
        draw(c) {
          const t = c.t; hall(c, 'wedding');
          c.fig('auntie', { x: 560, y: 985, s: 1, face: 1, pose: 'point', expr: 'happy', talk: T.riceLine, turn: EYE.turn, look: EYE.look });
          boss(c, { x: 1000, y: 985, face: -1, expr: t > T.riceW ? 'surprised' : 'neutral', turn: EYE.turn, look: EYE.look });
          if (!themes().hall) GFX.at(c.g, 1480, 960, pop(t, T.riceW, 0.4), q => GFX.ricePot(q, 0, 0, 1.4, { t, steam: 1 }));
          else if (t > T.riceW) { const r = riceAt(c); GFX.sparkles(c.g, r.x, r.y - 60, 160, t - T.riceW, 6); }
        } },
      { at: T.why, name: '"Why do I know about rice?": he stirs the giant pot, sweating', in: 'cut', push: { from: 1.05, to: 1.12, x: 960, y: 520 },
        draw(c) {
          const t = c.t; c.camera({ x: 1150, y: 600, zoom: 1.45 }); hall(c, 'wedding'); const st = Math.sin(t * 5), K = themes(), rs = riceSide(c);
          const hx = K.hall ? rs.x - 60 : 760;
          const h = c.fig('hero', { x: hx, y: 985, s: 1.05, face: 1, pose: 'carry', expr: 'tired', talk: T.whyLine, turn: 0.3, override: { armR: { ik: [200 + 40 * st, -220], bend: 1, ul: 0.95, hand: 'hold', flip: -1, hrot: 0.4 } } });
          const hn = ART.hand('hero', h); if (!K.hall) GFX.ricePot(c.g, 1180, 985, 1.4, { t, steam: 1 });
          c.g.save(); c.g.translate(hn.x, hn.y); c.g.rotate(0.6 + st * 0.15); GFX.rr(c.g, -14, -40, 28, 360, 12); GFX.inked(c.g, '#C98E5A', 5); GFX.rr(c.g, -40, 280, 80, 110, 20); GFX.inked(c.g, '#C98E5A', 5); c.g.restore();
          const hd = ART.head('hero', h); GFX.sweat(c.g, hd.x - hd.r, hd.y - hd.r * 0.3, 1.2);
        } },
      { at: T.attend, name: '"I came here to attend": in his party clothes, exasperated', in: 'cut', push: { from: 1.1, to: 1.18, x: 960, y: 440 },
        draw(c) { hall(c, 'wedding'); c.fig('hero', { x: 760, y: 985, s: 1.1, face: 1, pose: 'shrug', expr: 'confused', talk: T.attendLine, turn: 0, look: [0, 0], outfit: 'party' }); } },
      { at: T.uncles, name: 'two uncles back to back who only talk through him; his head turns left and right', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.05, x: 960, y: 520 },
        draw(c) {
          const t = c.t; hall(c, 'wedding'); const side = Math.floor((t - T.uncles) / 1.1) % 2 ? 1 : -1;
          c.fig('uncle', { x: 520, y: 985, s: 1.02, face: -1, pose: 'hands_clasped', expr: 'angry', turn: 0.2, look: [0.6, 0] });
          c.fig('uncle2', { x: 1400, y: 985, s: 1.02, face: 1, pose: 'hands_clasped', expr: 'angry', turn: 0.2, look: [0.6, 0] });
          const h = c.fig('hero', { x: 960, y: 985, s: 1.02, face: side, pose: 'point', expr: 'tired', turn: 0.5, look: [1, 0] });
          const hd = ART.head('hero', h), k = ((t - T.uncles) / 1.1) % 1;
          GFX.at(c.g, hd.x + side * (120 + 260 * k), hd.y - hd.r * 1.6, { s: 0.9, a: 1 - k * 0.6 }, q => GFX.dots(q, 0, 0, 1, t));
        } },
      { at: T.cousins, name: 'two cousins fighting, nose to nose', in: 'cut', push: { from: 1.08, to: 1.15, x: 960, y: 480 },
        draw(c) {
          const t = c.t; hall(c, 'wedding'); const jab = Math.sin(t * 8) > 0;
          c.fig('cousin', { x: 760, y: 985, s: 1, face: 1, pose: jab ? 'point' : 'stand', expr: 'angry', turn: EYE.turn, look: EYE.look, talk: [T.cousins, T.un] });
          c.fig('cousin2', { x: 1160, y: 985, s: 1, face: -1, pose: !jab ? 'point' : 'stand', expr: 'angry', turn: EYE.turn, look: EYE.look });
        } },
      { at: T.un, name: '"you are the United Nations": the hero at a podium between them, plain coloured flags', in: { type: 'wipe', dir: 'down' }, push: { from: 1, to: 1.05, x: 960, y: 520 },
        draw(c) {
          const t = c.t; c.set('podium', { t }); const kit = ART.hasSet('podium'); if (!kit) GFX.flags(c.g, 960, 700, 1, t);
          const sp = c.anchor('podium', 'speaker', [960, 990]);
          c.fig('cousin', { x: 400, y: 990, s: 1, face: 1, pose: 'point', expr: 'angry', turn: 0.5, look: [1, 0] });
          c.fig('cousin2', { x: 1520, y: 990, s: 1, face: -1, pose: 'point', expr: 'angry', turn: 0.5, look: [1, 0] });
          c.fig('hero', { x: sp.x, y: sp.y, s: sp.s || 1, face: 1, pose: 'shrug', expr: 'firm', turn: 0, look: [0, 0] });
          if (kit) c.setFront('podium', {}); else GFX.podium(c.g, 960, 995, 1.05);
        } },
      { at: T.question, name: 'the aunties close in around him: "the question that has followed you since you were 25"', in: 'cut', push: { from: 1, to: 1.12, x: 960, y: 480 },
        draw(c) {
          const t = c.t; hall(c, 'wedding'); const k = ease.inOutSine(seg(t, T.question, T.when));
          c.fig('auntie2', { x: lerp(260, 560, k), y: 985, s: 1, face: 1, pose: 'stand', expr: 'happy', turn: 0.5, look: [1, 0] });
          c.fig('auntie3', { x: lerp(1660, 1360, k), y: 985, s: 1, face: -1, pose: 'stand', expr: 'happy', turn: 0.5, look: [1, 0] });
          c.fig('hero', { x: 960, y: 985, s: 1.02, face: 1, pose: 'hands_clasped', expr: 'worried', turn: 0, look: [Math.sin(t * 2) * 0.8, 0] });
        } },
      { at: T.when, name: '"So, when are we eating your rice?": an auntie asks; a rice pot with a heart', in: 'cut', push: { from: 1.08, to: 1.14, x: 960, y: 470 },
        draw(c) {
          const t = c.t; hall(c, 'wedding', { heart: t > T.whenLine[1] - 0.35 });
          c.fig('auntie2', { x: 560, y: 985, s: 1, face: 1, pose: 'point', expr: 'happy', talk: T.whenLine, turn: 0.6, look: [1, 0] });
          c.fig('auntie3', { x: 1360, y: 985, s: 1, face: -1, pose: 'hand_mouth', expr: 'happy', turn: 0.6, look: [1, 0] });
          const h = c.fig('hero', { x: 960, y: 985, s: 1.02, face: 1, pose: 'hands_clasped', expr: 'worried', turn: 0, look: [-0.6, 0] }), hd = ART.head('hero', h);
          GFX.at(c.g, hd.x, hd.y - hd.r * 2.4, pop(t, T.whenLine[1] - 0.35, 0.4), q => GFX.ricePot(q, 0, 0, 0.42, { t, heart: 1, steam: 0 }));
        } },
      { at: T.notIf, name: '"Not if. When.": the aunties lean in, two punches', in: 'cut',
        draw(c) {
          const t = c.t; c.camera({ x: 960, y: 420, zoom: punch(t, [T.notIf, T.whenW], 0.25, 0.3) + 0.15, free: true }); hall(c, 'wedding');
          const k = seg(t, T.notIf, T.whenW + 0.3);
          c.fig('auntie2', { x: lerp(620, 700, k), y: 985, s: 1, face: 1, pose: 'point', expr: 'firm', turn: 0.6, look: [1, 0], rot: 0.08 * k, talk: [[T.notIf, Wend('not if')], [T.whenW, Wend('when', { after: FILM.W('not if') })]] });
          c.fig('auntie3', { x: lerp(1300, 1220, k), y: 985, s: 1, face: -1, pose: 'point', expr: 'firm', turn: 0.6, look: [1, 0], rot: -0.08 * k });
          const h = c.fig('hero', { x: 960, y: 985, s: 1.02, face: 1, pose: 'hands_clasped', expr: 'scared', turn: 0, look: [0, 0], tremble: 2 }); const hd = ART.head('hero', h); GFX.sweat(c.g, hd.x + hd.r, hd.y - hd.r * 0.3, 1.2);
        } },
    ],
  });
})();
