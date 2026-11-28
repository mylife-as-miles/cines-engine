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
    ART.fig(cf, 'coworker', { x: 1320, y: 962, face: -1, pose: tt > T.asks[1] + 0.2 ? 'stand' : 'point', expr: 'happy', talk: T.asks });
    const h = ART.fig(cf, 'hero', { x: 640, y: 962, face: 1, pose: tt > T.letMe[0] - 0.2 ? 'handup' : 'stand', expr: tt > T.letMe[0] - 0.2 ? 'neutral' : 'surprised', talk: T.letMe });
    return h;
  }
  const BUTTONS = [['YES', T.yes, '#77CC81'], ['NO', T.no, '#E5534B'], ['YES, BUT NOT LIKE THAT', T.yesBut, '#3A8594']];

  FILM.seq({
    id: 'Q10', title: 'Try this instead', chapter: 'Try this instead', from: T.start,
    sound(S) {
      S.bed('music', T.start, T.gives + 0.6, { mood: 'upbeat, practical' }); S.silence(T.pause - 0.05, T.choose - 0.1); S.bed('music', T.choose - 0.1, T.end, { mood: 'upbeat, resolving' });
      S.cue('whoosh', T.start - 0.1); S.cue('pop', T.try); S.cue('whoosh', T.forWeek - 0.05); S.bed('office_room', T.forWeek, T.choose);
      S.cue('pop', T.letMe[0]); S.cue('freeze', T.pause); S.cue('pop', T.pause + 0.05);
      BUTTONS.forEach(b => S.cue('pop', b[1])); S.cue('button_click', T.purpose); S.cue('ding', T.purpose + 0.15);
    },
    shots: [
      { at: T.start, name: 'plain: do not say no to everyone: pointing at the viewer (ref 02)', in: { type: 'wipe', dir: 'right', color: '#3A8594' }, push: { from: 1, to: 1.06 },
        draw(c) { STAGE.plainHero(c, { pose: 'point', expr: 'happy', turn: 0 }); } },
      { at: T.try, name: 'plain: try this instead (a finger up)', in: 'pop',
        draw(c) { STAGE.plainHero(c, { pose: 'finger_up', expr: 'happy' }); } },
      { at: T.forWeek, name: 'office: the coworker asks; "let me think and get back to you"', push: { from: 1, to: 1.05, x: 900, y: 520 },
        draw(c) { const h = exchange(c, c.t); STAGE.speech(c, 'hero', h, 'Let me think and get back to you.', T.letMe[0], null, { w: 640, h: 230, size: 46, dx: 30, dy: -60 }); } },
      { at: T.gives, name: 'office: a pause: everything freezes, a pause sign',
        draw(c) {
          const t = c.t, frozen = t >= T.pause, tt = frozen ? T.pause : t; const h = exchange(c, tt);
          STAGE.speech(c, 'hero', h, 'Let me think and get back to you.', T.letMe[0], null, { w: 640, h: 230, size: 46, dx: 30, dy: -60 });
          if (frozen) { c.screen(); c.g.fillStyle = `rgba(60,90,100,${0.35 * seg(t, T.pause, T.pause + 0.2)})`; c.g.fillRect(0, 0, 1920, 1080); GFX.at(c.g, 960, 540, pop(t, T.pause + 0.05, 0.32), q => GFX.pauseSign(q, 0, 0, 1.3)); c.reset(); }
        } },
      { at: T.choose, name: 'plain: three buttons rise, one per word; he presses one, on purpose', in: 'pop',
        draw(c) {
          c.set('plain', {}); const t = c.t; const a = c.anchor('plain', 'stand', { x: 960, y: 980, s: 1 });
          const pressed = seg(t, T.purpose, T.purpose + 0.12) * (1 - seg(t, T.purpose + 0.35, T.purpose + 0.5));
          c.fig('hero', { x: 430, y: a.y, s: a.s * 0.95, face: 1, pose: t > T.decide ? 'point' : 'stand', expr: t > T.purpose ? 'happy' : 'neutral' });
          BUTTONS.forEach(([label, t0, fill], i) => {
            const rise = 1 - ease.outBack(seg(t, t0 - 0.05, t0 + 0.35)); if (t < t0 - 0.05) return; const isPick = i === 2;
            const y = 300 + i * 230 + rise * 700;
            STAGE.pill(c, 1260, y, label, { size: i === 2 ? 64 : 84, fill, color: '#FFFFFF', minW: 900, press: isPick ? pressed : 0, lit: isPick ? seg(t, T.purpose + 0.1, T.purpose + 0.4) : 0, dim: !isPick && t > T.purpose ? 0.5 * seg(t, T.purpose, T.purpose + 0.3) : 0 });
          });
        } },
    ],
  });
})();
