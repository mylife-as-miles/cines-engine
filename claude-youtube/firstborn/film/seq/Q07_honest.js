/* Q07 · THE HONEST PART ("Now, let's be honest" to "So here is something")
   The plain ground: the hero sits, tired; a slow push, a long breath out on "tired". "a reason this role exists": the siblings in a
   queue behind him; "not that you are the strongest" (a flexed arm, crossed out); "you were first": the first spot lights; push
   in, "Position, not talent". The young parents again in the maternity room, holding the baby: scared, learning (the manual upside
   down), and the toddler hero standing closest, their hands on his shoulders. "love, said in a language that does not know how to
   say it softly": rough shouty bubbles that soften into hearts. "Be responsible" flips to WE ARE AFRAID; "Don't disappoint us"
   flips to WE ARE COUNTING ON YOU, the parents softening as they flip. "this is too heavy": the whole house on his back. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W("now let's be honest"));
  const { seg, pop, ease, lerp, punch, nod, span } = FILM;
  const T = {
    start: W("now let's be honest"), funny: W('all of this is funny'), firstborn: W('firstborn'), tired: W('tired'),
    reason: W('and there is a reason'), strongest: W('strongest'), first: W('it is that you were first'), firstW: W('first', { after: FILM.W('strongest') }),
    thatAll: W('that is all'), position: W('position'), talent: W('talent'), parents: W('your parents did not'), capable: W('capable'),
    scared: W('they were scared'), learning: W('they were learning'), closest: W('and you were the one'), closestW: W('closest'),
    worth: W('here is the part worth'), love: W('a lot of that pressure'), loveW: W('love'), softly: W('softly'),
    resp: W('be responsible'), means1: W('means', { after: FILM.W('be responsible') }), afraid: W('afraid'),
    disappoint: W("don't disappoint us"), means2: W('means', { after: FILM.W("don't disappoint us") }), counting: W('counting'),
    heavy: W('you can understand'), heavyW: W('heavy'), end: FILM.W('so here is something'),
  };
  // the hero seated on a low box on the plain ground
  function seated(c, o) { const t = c.t; c.set('plain', {}); GFX.box(c.g, 960, 1000, 300, 200); return c.fig('hero', Object.assign({ x: 960, y: 1060, s: 1.15, seatAt: { x: 960, y: 800 }, face: 1, pose: 'sit', view: 'front', expr: 'tired', turn: 0, look: [0, 0.2], dy: -FILM.breath(t, 2) }, o)); }
  const QUEUE = [['sister', 'kid'], ['brother', 'kid'], ['cousin', 'kid'], ['cousin2', 'kid']];

  FILM.seq({
    id: 'Q07', title: 'The honest part', chapter: 'The honest part', from: T.start,
    sound(S) {
      S.bed('music', T.start, T.end, { mood: 'sincere, gentle: soft guitar and kalimba, sparse' });
      S.cue('sigh', T.tired + 0.1, { x: 960 }); S.cue('soft_ding', T.firstW, { x: 520 }); S.cue('baby_coo', T.parents + 0.4, { x: 860 });
      S.cue('page_flip', T.learning + 0.2, { x: 1200 }); S.cue('soften', T.softly, { x: 960 }); S.cue('card_flip', T.means1, { x: 1100 }); S.cue('card_flip', T.means2, { x: 820 });
      S.cue('strain', T.heavyW - 0.2, { x: 960 });
    },
    shots: [
      { at: T.start, name: 'the plain ground: the hero sits, tired', in: 'fade', push: { from: 1, to: 1.06, x: 960, y: 520 },
        draw(c) { seated(c, { expr: 'neutral' }); STAGE.chapterCard(c, T.start + 0.2, T.start + 2.0, 'THE HONEST PART', { x: 1420, y: 190, scale: 0.55 }); } },
      { at: T.funny, name: 'a slow push in; "you are also tired": a long breath out', in: 'cut', push: { from: 1.05, to: 1.3, x: 960, y: 420 },
        draw(c) { const t = c.t; seated(c, { expr: t > T.tired ? 'tired' : 'happy', nod: 0.25 * seg(t, T.tired, T.tired + 0.8), blinks: [T.funny + 1.5, T.tired + 0.4, T.tired + 0.65] }); } },
      { at: T.reason, name: 'a queue of siblings behind him; not the strongest (crossed out); "you were first": the first spot lights', in: { type: 'slide', dir: 'left' }, push: { from: 1, to: 1.05, x: 760, y: 560 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const lit = seg(t, T.firstW, T.firstW + 0.4);
          GFX.spotlight(c.g, 520, 1000, 420, lit); c.g.save(); c.g.beginPath(); c.g.ellipse(520, 1000, 190, 36, 0, 0, Math.PI * 2); GFX.inked(c.g, lit > 0.5 ? '#FFE38A' : '#BFE3E0', 5); c.g.restore();
          QUEUE.forEach(([w, age], i) => c.fig(w, { age, x: 880 + i * 260, y: 1000, s: 1.05, face: -1, pose: 'stand', expr: 'neutral', turn: 0.3, look: [1, 0] }));
          c.fig('hero', { x: 520, y: 1000, s: 1.02, face: 1, pose: 'stand', expr: lit > 0.5 ? 'surprised' : 'neutral', turn: 0.2 });
          GFX.at(c.g, 520, 260, FILM.popInOut(t, T.strongest - 0.2, T.firstW - 0.1, 0.3), q => { q.save(); q.lineCap = 'round'; q.lineWidth = 46; q.strokeStyle = '#1c1c1c'; q.beginPath(); q.moveTo(-90, 60); q.lineTo(0, 40); q.lineTo(30, -50); q.stroke(); q.lineWidth = 34; q.strokeStyle = '#FCEBCB'; q.stroke(); q.beginPath(); q.arc(0, 30, 40, Math.PI, 0); GFX.inked(q, '#FCEBCB', 5); q.restore(); GFX.cross(q, 0, 0, 220, seg(t, T.strongest + 0.3, T.strongest + 0.6)); });
        } },
      { at: T.thatAll, name: 'push in on him in the spotlight: "Position, not talent"', in: 'cut', push: { from: 1.1, to: 1.35, x: 620, y: 520 },
        draw(c) {
          const t = c.t; c.set('plain', {}); GFX.spotlight(c.g, 520, 1000, 420, 1); c.g.beginPath(); c.g.ellipse(520, 1000, 190, 36, 0, 0, Math.PI * 2); GFX.inked(c.g, '#FFE38A', 5);
          c.g.save(); c.g.beginPath(); c.g.ellipse(520, 1000, 120, 22, 0, 0, Math.PI * 2); c.g.restore(); GFX.text(c.g, '1', 520, 1003, { size: 40, weight: 900 });
          QUEUE.forEach(([w, age], i) => c.fig(w, { age, x: 880 + i * 260, y: 1000, s: 1.05, face: -1, pose: 'stand', expr: 'neutral', turn: 0.3, look: [1, 0] }));
          c.fig('hero', { x: 520, y: 1000, s: 1.02, face: 1, pose: 'stand', expr: 'neutral', turn: 0, look: [0, 0] });
        } },
      { at: T.parents, name: 'the young parents again in the maternity room, holding the baby', in: 'fade', push: { from: 1.1, to: 1.18, x: 860, y: 560 },
        draw(c) {
          const t = c.t; c.set('maternity', {}); const L = c.anchor('maternity', 'parentL', [545, 975]);
          STAGE.holdBaby(c, 'mum', { x: L.x + 140, y: L.y, s: 1, face: 1, expr: 'worried', young: true, turn: 0.3, look: [0.6, 0.8] }, 'hero', { expr: 'neutral' });
          c.fig('dad', { x: L.x + 520, y: L.y, s: 1.02, face: -1, pose: 'hands_clasped', expr: 'worried', young: true, turn: 0.5, look: [1, 0.5] });
        } },
      { at: T.scared, name: 'close: "They were scared"', in: 'cut', push: { from: 1, to: 1.06, x: 860, y: 400 },
        draw(c) {
          const t = c.t; c.camera({ x: 900, y: 440, zoom: 1.7 }); c.set('maternity', {}); const L = c.anchor('maternity', 'parentL', [545, 975]);
          STAGE.holdBaby(c, 'mum', { x: L.x + 140, y: L.y, s: 1, face: 1, expr: 'scared', young: true, turn: 0.3, look: [0.6, 0.8], tremble: 1.5 }, 'hero', { expr: 'neutral' });
          c.fig('dad', { x: L.x + 520, y: L.y, s: 1.02, face: -1, pose: 'hand_mouth', expr: 'scared', young: true, turn: 0.5, look: [1, 0.5], tremble: 1.5 });
        } },
      { at: T.learning, name: '"They were learning": the manual held upside down', in: 'cut', push: { from: 1.05, to: 1.1, x: 900, y: 480 },
        draw(c) {
          const t = c.t; c.set('maternity', {}); const L = c.anchor('maternity', 'parentL', [545, 975]);
          STAGE.holdBaby(c, 'mum', { x: L.x + 140, y: L.y, s: 1, face: 1, expr: 'worried', young: true, turn: 0.4, look: [1, 0.3] }, 'hero', { expr: 'happy' });
          const d = c.fig('dad', { x: L.x + 520, y: L.y, s: 1.02, face: -1, pose: 'carry', expr: 'confused', young: true, look: [0.3, 1] });
          const hl = d.A.handL, hr = d.A.handR; GFX.manual(c.g, (hl[0] + hr[0]) / 2, Math.min(hl[1], hr[1]) - 40, 0.62, { rot: Math.PI - 0.1 * seg(t, T.learning, T.learning + 0.6) });
        } },
      { at: T.closest, name: 'the toddler hero standing closest; the parents lean on him, hands on his shoulders', in: 'cut', push: { from: 1, to: 1.06, x: 960, y: 560 },
        draw(c) {
          const t = c.t, o = { tod: 'evening' }; c.set('home', o); const tint = ART.tintFor(c, 'home');
          const h = c.fig('hero', { age: 'toddler', x: 960, y: 1000, s: 1.15, face: 1, pose: 'stand', expr: 'neutral', tint, turn: 0, look: [0, -0.3] });
          const hd = ART.head('hero', h), k = seg(t, T.closestW - 0.3, T.closestW + 0.3);
          c.fig('mum', { x: 700, y: 990, s: 1, face: 1, pose: 'stand', expr: 'happy', tint, turn: 0.5, look: [1, 0.8], override: { armR: { ik: [lerp(40, 190, k), lerp(-40, -150, k)], bend: 1, ul: 0.95, hand: 'flat', flip: -1, hrot: 1.2 } } });
          c.fig('dad', { x: 1220, y: 990, s: 1.02, face: -1, pose: 'stand', expr: 'happy', tint, turn: 0.5, look: [1, 0.8], override: { armR: { ik: [lerp(40, 190, k), lerp(-40, -150, k)], bend: 1, ul: 0.95, hand: 'flat', flip: -1, hrot: 1.2 } } });
          c.fig('brother', { age: 'baby', x: 640, y: 760, s: 0.8, rot: 0.3, expr: 'happy' });
        } },
      { at: T.worth, name: 'the plain ground, close: "the part worth knowing"', in: 'fade', push: { from: 1, to: 1.08, x: 960, y: 440 },
        draw(c) { STAGE.plainHero(c, { expr: 'neutral' }); } },
      { at: T.love, name: '"love, said in a language that does not know how to say it softly": rough bubbles soften into hearts', in: 'cut', push: { from: 1, to: 1.05, x: 960, y: 520 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const soft = seg(t, T.softly - 0.3, T.softly + 0.5);
          c.fig('mum', { x: 480, y: 1060, s: 1.1, face: 1, pose: 'finger_up', expr: soft > 0.5 ? 'happy' : 'firm', turn: 0.3 });
          c.fig('dad', { x: 1440, y: 1060, s: 1.12, face: -1, pose: 'point', expr: soft > 0.5 ? 'happy' : 'firm', turn: 0.3 });
          [[760, 300, T.loveW - 0.5], [1150, 260, T.loveW], [960, 520, T.loveW + 0.6]].forEach(([x, y, t0], i) => {
            const st = pop(t, t0, 0.32); if (!st.on) return;
            GFX.at(c.g, x, y + Math.sin(t * 2 + i) * 8, st, q => { if (soft < 0.5) { GFX.roughBubble(q, 0, 0, 300 * (1 - soft), 200 * (1 - soft), '#FFFFFF'); GFX.text(q, '!!', 0, 6, { size: 90, weight: 900, color: '#D9443B' }); } else GFX.heart(q, 0, 0, 1.4 * ease.outBack((soft - 0.5) * 2), '#E5534B'); });
          });
        } },
      { at: T.resp, name: '"Be responsible" flips to WE ARE AFRAID; Mum softens', in: 'cut', push: { from: 1, to: 1.06, x: 900, y: 520 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const k = seg(t, T.means1, T.means1 + 0.5);
          c.fig('mum', { x: 520, y: 1060, s: 1.12, face: 1, pose: k > 0.5 ? 'hands_clasped' : 'finger_up', expr: k > 0.5 ? 'worried' : 'firm', turn: 0.3, talk: [T.resp, Wend('responsible')] });
          GFX.at(c.g, 1180, 400, pop(t, T.resp, 0.32), q => GFX.flipBubble(q, 0, 0, 900, 340, 'BE RESPONSIBLE', 'WE ARE AFRAID', k, { rough: true, size: 78, tail: [-420, 220], hearts: true }));
        } },
      { at: T.disappoint, name: '"Don\'t disappoint us" flips to WE ARE COUNTING ON YOU; Dad softens', in: 'cut', push: { from: 1, to: 1.06, x: 1020, y: 520 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const k = seg(t, T.means2, T.means2 + 0.5);
          c.fig('dad', { x: 1400, y: 1060, s: 1.14, face: -1, pose: k > 0.5 ? 'hands_clasped' : 'point', expr: k > 0.5 ? 'sad' : 'firm', turn: 0.3, talk: [T.disappoint, Wend('us', { after: FILM.W("don't disappoint") })] });
          GFX.at(c.g, 720, 400, pop(t, T.disappoint, 0.32), q => GFX.flipBubble(q, 0, 0, 980, 360, "DON'T DISAPPOINT US", 'WE ARE COUNTING ON YOU', k, { rough: true, size: 74, tail: [440, 230], hearts: true }));
        } },
      { at: T.heavy, name: '"this is too heavy": the whole house on his back; he sinks on "heavy"', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.06, x: 960, y: 560 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const sink = ease.outCubic(seg(t, T.heavyW - 0.2, T.heavyW + 0.5));
          const KHo = !!(POV && POV.POSES && POV.POSES.house);
          if (!KHo) GFX.house(c.g, 930, 1020 - 600 + 30 * sink, 1.05, { rot: -0.04 });
          const h = c.fig('hero', { x: KHo ? 1060 : 960, y: 1020, s: 1.05, face: 1, pose: KHo ? 'house' : 'load', phase: KHo && sink < 0.5 ? (t - T.heavy) * 0.9 : undefined, expr: 'tired', turn: 0.2, look: [0.2, 0.8], dy: KHo ? 0 : 30 * sink, nod: KHo ? 0 : 0.3 + 0.3 * sink, tremble: 1 + 2 * sink, dx: KHo && sink < 0.5 ? -120 + 160 * seg(t, T.heavy, T.heavyW) : 40 });
          const hd = ART.head('hero', h);
          GFX.sweat(c.g, hd.x + hd.r, hd.y - hd.r * 0.2, 1.1);
        } },
    ],
  });
})();
