/* Q07 · SATURDAY: THE REAL ANSWER ("Saturday" to "Sunday")
   Card SATURDAY. The living room, morning: the hero with a laptop; the phone buzzes; the phone screen: the boss's text "Need that
   report tonight." "You do not say no. You do not panic yes": two buttons, NO and YES!!, each dimming. "You say": the hero types;
   the reply grows word by word with the narration: "I can't tonight. I can send it first thing tomorrow." "perfect": the reply
   "Perfect 👍"; the boss in the office, thumbs up (ref 04). "That is the one that works": plain, three labels, "flat no", "panic
   yes", "a real answer"; the last one lights. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('saturday your boss'));
  const { seg, pop, ease } = FILM;
  const T = {
    card: W('Saturday'), boss: W('your boss'), texts: W('texts'), need: W('need'), tonight: Wend('tonight'),
    doNot: W('you do not say'), no: W('no', { after: FILM.W('you do not say') }), panic: W('panic'), either: Wend('either'),
    youSay: W('you say', { after: FILM.W('either') }), canSend: W('i can send'), reply0: W('i', { after: FILM.W('either') }), replyEnd: Wend('tomorrow'),
    heSays: W('he says'), perfect: W('perfect'), perfectEnd: Wend('perfect'), works: W('that is the one'), flat: W('flat'), real: W('real answer'), end: FILM.W('sunday so what'),
  };
  const MORN = { tod: 'morning' };
  const REPLY = "I can't tonight. I can send it first thing tomorrow.";
  // the reply typed word by word as the narrator says it
  const replyWords = FILM.wordsIn(T.reply0 - 0.01, T.replyEnd + 0.01);
  function draft(t) { const parts = REPLY.split(' '); let n = 0; replyWords.forEach((w, i) => { if (t >= w.t0) n = i + 1; }); return parts.slice(0, Math.min(n, parts.length)).join(' '); }
  const BOSS_MSG = { from: 'them', text: 'Need that report tonight.' };

  FILM.seq({
    id: 'Q07', title: 'Saturday: the real answer', chapter: 'Saturday: the real answer', from: T.card,
    sound(S) {
      S.bed('music', T.card, T.end, { mood: 'calm, confident' }); S.bed('living_room_morning', T.card, T.texts);
      S.cue('whoosh', T.card - 0.1); S.cue('pop', T.card + 0.05); S.cue('phone_buzz', T.boss + 0.1, { x: 0.61 }); S.cue('receive', T.need + 0.05);
      S.cue('pop', T.doNot + 0.1); S.cue('dim', T.no + 0.1); S.cue('dim', T.panic + 0.05);
      S.cue('typing', T.reply0, { n: Math.round((T.replyEnd - T.reply0) / 0.12), x: 0.47 }); S.cue('send', T.canSend); S.cue('receive', T.perfect); S.cue('ding', T.perfect + 0.3);
      S.cue('pop', T.works + 0.1); S.cue('ding', T.real);
    },
    shots: [
      { at: T.card, name: 'living, morning: the day card on the wall; the phone buzzes on the table', in: { type: 'wipe', dir: 'right' }, push: 1.04,
        draw(c) {
          const t = c.t; STAGE.heroSofa(c, MORN, { pose: 'sit_laptop', expr: t > T.boss ? 'surprised' : 'happy', look: t > T.boss ? [0.8, 0.5] : null });
          if (t > T.boss) { const a = c.anchor('living', 'tablePhone'); c.prop('phoneFlat', { x: a.x + Math.sin(t * 90) * 3, y: a.y - 6, s: 1.25, glow: 1 }); c.prop('buzz', { x: a.x, y: a.y - 10, rx: 80, t }); }
          STAGE.dayCard(c, T.card + 0.05, T.need - 0.1, 'SATURDAY', null, STAGE.CARD_LIVING);
        } },
      { at: T.need, name: 'phone: the boss: "Need that report tonight."', in: 'pop',
        draw(c) { STAGE.phone(c, { mode: 'chat', contact: 'Boss', avatarColor: '#A6A6A6', time: '10:12', messages: [Object.assign({ k: seg(c.t, T.need + 0.05, T.need + 0.4) }, BOSS_MSG)] }); } },
      { at: T.doNot, name: 'plain: two buttons, NO and YES!!, each dimming', in: 'pop',
        draw(c) {
          c.set('plain', {}); const t = c.t;
          GFX.at(c.g, 600, 540, pop(t, T.doNot + 0.1, 0.34), () => STAGE.pill(c, 0, 0, 'NO', { size: 130, fill: '#E5534B', color: '#FFFFFF', minW: 520, dim: seg(t, T.no + 0.1, T.no + 0.5) }));
          GFX.at(c.g, 1320, 540, pop(t, T.doNot + 0.35, 0.34), () => STAGE.pill(c, 0, 0, 'YES!!', { size: 130, fill: '#77CC81', color: '#FFFFFF', minW: 520, dim: seg(t, T.panic, T.panic + 0.35) }));
          [[600, T.no + 0.1], [1320, T.panic + 0.05]].forEach(([x, t0]) => GFX.cross(c.g, x, 555, 300, seg(t, t0, t0 + 0.25)));
        } },
      { at: T.youSay, name: 'living: the hero types his reply, calm', push: { from: 1.1, to: 1.18, x: 900, y: 460 },
        draw(c) {
          const t = c.t, h = STAGE.heroSofa(c, MORN, { pose: 'sit_front', hold: 'phone_front', expr: 'neutral', look: [0.8, 0.5], talk: [T.youSay, T.canSend] });
          const hd = ART.head('hero', h); STAGE.notify(c, hd.x + hd.r * 1.9, hd.y - hd.r * 1.1, T.youSay + 0.15, 'chat', { s: 2.0 });
        } },
      { at: T.canSend, name: 'phone: the reply, sent and whole, held until "He says"', in: 'pop',
        draw(c) { const t = c.t; STAGE.phone(c, { mode: 'chat', contact: 'Boss', avatarColor: '#A6A6A6', time: '10:13',
          messages: [BOSS_MSG, { from: 'me', text: REPLY, k: seg(t, T.canSend, T.canSend + 0.25) }] }); } },
      { at: T.heSays, name: 'office: the boss reads it: "Perfect 👍", thumbs up (ref 04)', in: 'pop', push: { from: 1.25, to: 1.32, x: 1320, y: 460 },
        draw(c) {
          const t = c.t; c.set('office', { clock: '10:14' });
          const b = c.fig('boss', { x: 1380, y: 962, face: -1, pose: t > T.perfect - 0.05 ? 'thumbs_up' : 'hold_phone', mode: 'front', expr: t > T.perfect - 0.05 ? 'happy' : 'neutral', talk: [T.perfect, T.perfectEnd], turn: 0.3 });
          const hd = ART.head('boss', b); GFX.at(c.g, hd.x - hd.r * 3.0, hd.y + hd.r * 0.25, pop(t, T.perfect, 0.34), q => GFX.bubble(q, 0, 0, 380, 150, { text: 'Perfect 👍', size: 58, weight: 800, tail: [130, 40] }));
        } },
      { at: T.works, name: 'plain: flat no, panic yes, a real answer: the last lights', in: 'pop',
        draw(c) {
          c.set('plain', {}); const t = c.t;
          [['flat no', 330, T.works + 0.1, T.flat], ['panic yes', 540, T.works + 0.4, null], ['a real answer', 750, T.works + 0.7, T.real]].forEach(([s, y, t0, hl], i) => {
            const st = pop(t, t0, 0.34); const isLast = i === 2; const lit = isLast ? seg(t, T.real, T.real + 0.3) : 0;
            const dim = isLast ? 0 : seg(t, T.real, T.real + 0.3) * 0.8, bump = (!isLast && hl && t > hl && t < hl + 0.5) ? 1 + 0.08 * Math.sin(seg(t, hl, hl + 0.5) * Math.PI) : 1;
            GFX.at(c.g, 960, y, { sx: st.sx * bump, sy: st.sy * bump, a: st.a }, () => STAGE.pill(c, 0, 0, s, { size: 84, minW: 760, fill: isLast ? (lit > 0.5 ? '#77CC81' : '#FFF4E3') : '#FFF4E3', color: isLast && lit > 0.5 ? '#FFFFFF' : '#1c1c1c', lit, dim }));
          });
        } },
    ],
  });
})();
