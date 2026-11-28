/* Q10 · ADVICE: LET ME THINK ("So, do not say no to everyone" to "So, what if you said no")
   "do not say no to everyone": the hero pointing at the viewer (ref 02). "Try this instead". "when someone asks you": the coworker
   asks; "let me think and get back to you": the hero's speech bubble with those words, one hand up. "a pause": everything freezes,
   a pause sign. "you get to choose": three buttons rise, YES · NO · YES, BUT NOT LIKE THAT, one per word. "on purpose": the hero
   presses one, calmly. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('so do not'));
  const { span, seg, pop, ease } = FILM;
  const T = {
    start: W('so do not'), everyone: W('everyone'), try: W('try this'), forWeek: W('for one week'), asks: span('asks', 'something', FILM.W('so do not')),
    say: W('say', { after: FILM.W('something', { after: FILM.W('so do not') }) }), letMe: span('let me', 'you', FILM.W('so do not')), all: W('that is all'),
    gives: W('it gives'), pause: W('pause'), choose: W('get to choose'), chooseEnd: Wend('choose'),
    yes: W('yes', { after: FILM.W('choose') }), no: W('no', { after: FILM.W('choose') }), yesBut: W('yes but'), decide: W('you decide'), purpose: W('purpose'),
    end: FILM.W('so what if'),
  };
  // the office exchange, drawn at time tt (the freeze draws it at the instant of "pause")
  function exchange(c, tt) {
    const cf = Object.assign({}, c, { t: tt }); c.set('office', { clock: '2:10' });
    ART.fig(cf, 'coworker', { x: 1450, y: 962, face: -1, pose: tt > T.asks[1] + 0.2 ? 'stand' : 'wave', phase: 0.15, expr: 'happy', talk: T.asks, turn: STAGE.EYE.turn, look: STAGE.EYE.look });
    const h = ART.fig(cf, 'hero', { x: 640, y: 962, face: 1, pose: tt > T.letMe[0] - 0.2 ? 'handup' : 'stand', expr: tt > T.letMe[0] - 0.2 ? 'neutral' : 'surprised', talk: T.letMe, turn: STAGE.EYE.turn, look: STAGE.EYE.look });
    return h;
  }
  // the takeaway: a medium close shot on the hero (the coworker at the edge) and the line in a big bubble (letters ~72 px on screen)
  function takeaway(c, tt) {
    const cf = Object.assign({}, c, { t: tt }); c.camera({ x: 900, y: 380, zoom: 1.7 }); c.set('office', { clock: '2:10', chair: true });
    ART.fig(cf, 'coworker', { x: 1450, y: 962, face: -1, pose: 'stand', expr: 'surprised', turn: STAGE.EYE.turn, look: STAGE.EYE.look });
    const h = ART.fig(cf, 'hero', Object.assign({ x: 640, y: 962, face: 1, talk: T.letMe, turn: 0.3, look: [0.6, 0] }, { pose: 'handup', expr: 'neutral' }));
    const hd = ART.head('hero', h), st = pop(c.t, T.letMe[0] - 0.2, 0.34), t0 = Math.min(1, st.s);
    GFX.at(c.g, 1060, 250, tt >= T.pause ? { s: 1 } : st, q => GFX.bubble(q, 0, 0, 600, 270, { text: 'Let me think and get back to you.', size: 43, weight: 800, tail: [hd.x + hd.r * 0.9 - 1060, hd.y - 250] }));
  }
  // the bubble beside the hero's head, between him and the coworker
  const BUBBLE = h => { const hd = ART.head('hero', h); return { w: 560, h: 210, size: 44, at: [hd.x + hd.r + 330, hd.y - 70] }; };
  const BUTTONS = [['YES', T.yes, '#77CC81'], ['NO', T.no, '#E5534B'], ['YES, BUT NOT LIKE THAT', T.yesBut, '#3A8594']];

  function buttons(c) {
    c.set('plain', {}); const t = c.t; const a = c.anchor('plain', 'stand', { x: 960, y: 980, s: 1 });
    const pressed = seg(t, T.purpose, T.purpose + 0.12) * (1 - seg(t, T.purpose + 0.35, T.purpose + 0.5));
    c.fig('hero', { x: 430, y: a.y, s: a.s * 0.95, face: 1, pose: t > T.decide ? 'point' : 'stand', expr: t > T.purpose ? 'happy' : 'neutral', nod: 0.1 * FILM.wob(t, 0.4, 5), dx: 6 * FILM.wob(t, 0.25, 9) });
    BUTTONS.forEach(([label, t0, fill], i) => {
      const rise = 1 - ease.outBack(seg(t, t0 - 0.05, t0 + 0.35)); if (t < t0 - 0.05) return; const isPick = i === 2;
      const y = 300 + i * 230 + rise * 700;
      STAGE.pill(c, 1260, y, label, { size: i === 2 ? 60 : 80, fill, color: '#FFFFFF', minW: 820, press: isPick ? pressed : 0, lit: isPick ? seg(t, T.purpose + 0.1, T.purpose + 0.4) : 0, dim: !isPick && t > T.purpose ? 0.5 * seg(t, T.purpose, T.purpose + 0.3) : 0 });
    });
  }

  FILM.seq({
    id: 'Q10', title: 'Try this instead', chapter: 'Try this instead', from: T.start,
    sound(S) {
      S.bed('music', T.start, T.gives + 0.6, { mood: 'upbeat, practical' }); S.silence(T.pause - 0.05, T.choose - 0.1); S.bed('music', T.choose - 0.1, T.end, { mood: 'upbeat, resolving' });
      S.cue('whoosh', T.start - 0.1); S.cue('whoosh', T.forWeek - 0.05); S.bed('office_room', T.forWeek, T.choose);
      S.cue('pop', T.letMe[0]); S.cue('freeze', T.pause);
      S.cue('pop', BUTTONS[2][1]); /* the third button (the answer) */ S.cue('button_click', T.purpose); S.cue('ding', T.purpose + 0.15);
    },
    shots: [
      { at: T.start, name: 'plain: do not say no to everyone: pointing at the lens (ref 02)', in: { type: 'wipe', dir: 'right', color: '#3A8594' }, push: { from: 1, to: 1.06 },
        draw(c) { const h = STAGE.plainHero(c, { pose: 'stand', expr: 'happy', turn: 0, look: [0, 0.08], override: { armR: { ik: [20, -150], bend: -1, ul: 0.75, fl: 0.4, hand: 'fist', flip: 1 } } }); const hd = ART.head('hero', h);
          GFX.pointAtYou(c.g, hd.x + hd.r * 0.35, hd.y + hd.r * 2.05, hd.r / 100 * (1 + 0.04 * Math.sin(c.t * 5))); } },
      { at: T.try, name: 'plain: try this instead (a finger up)', in: 'pop', push: { from: 1.1, to: 1.14, x: 960, y: 380 },
        draw(c) { STAGE.plainHero(c, { pose: 'finger_up', expr: 'happy' }); } },
      { at: T.forWeek, name: 'office: the coworker asks', push: { from: 1, to: 1.05, x: 900, y: 520 },
        draw(c) { exchange(c, c.t); } },
      { at: T.letMe[0] - 0.25, name: 'close: "Let me think and get back to you." (the takeaway, big)', in: 'pop', push: { from: 1, to: 1.04, x: 900, y: 420 },
        draw(c) { takeaway(c, c.t); } },
      { at: T.gives, name: 'close: a pause: everything freezes, a pause sign',
        draw(c) {
          const t = c.t, frozen = t >= T.pause; takeaway(c, frozen ? T.pause : t);
          if (frozen) { c.screen(); c.g.fillStyle = `rgba(60,90,100,${0.35 * seg(t, T.pause, T.pause + 0.2)})`; c.g.fillRect(0, 0, 1920, 1080); GFX.at(c.g, 1500, 820, pop(t, T.pause + 0.05, 0.32), q => GFX.pauseSign(q, 0, 0, 1.0)); c.reset(); }
        } },
      { at: T.choose, name: 'plain: three buttons rise, one per word', in: 'pop', push: { from: 1, to: 1.06, x: 1100, y: 540 }, draw: buttons },
      { at: T.decide, name: 'plain, closer: he presses one, on purpose', push: { from: 1.28, to: 1.34, x: 1180, y: 700 }, draw: buttons },
    ],
  });
})();
