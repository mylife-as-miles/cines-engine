/* Q06 · FRIDAY: THE STRANGER ("Friday" to "Saturday")
   Card FRIDAY. The street: the stranger approaches with his phone held out. "No." "They look hurt": he turns away, sad; "you feel
   terrible": the hero, hands clasped, sad (ref 05). "you run after them": the hero runs across frame. "You take the photo": a
   white camera flash; "happiest": the hero beaming, a peace sign, the stranger delighted. "Why?": plain. "you chose it": the bulb.
   "Same yes, different reason": two identical YES cards, one held by a trembling hand, one by a steady one; "Not fear, choice":
   the trembling one fades. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('Friday'));
  const { span, seg, pop, walk, flash, ease } = FILM;
  const T = {
    card: W('Friday'), tourist: W('a tourist'), ask: span('sorry', 'photo', FILM.W('Friday')), no: span('no', null, FILM.W('Friday')),
    hurt: W('they look hurt'), feel: W('and you feel'), terrible: W('terrible'), run: W('so you run'), take: W('you take the photo'), photo: W('photo', { after: W('you take the photo') }),
    happiest: W('happiest'), why: W('why'), because: W('because'), chose: W('chose'), same: W('same yes'), different: W('different'), notFear: W('not fear'), fear: W('fear', { after: FILM.W('not fear') }), choice: W('choice'),
    end: FILM.W('saturday your boss'),
  };
  const L = 760, R = 1240, FLOOR = 962;
  function stranger(c, o) {
    const t = c.t; let x = R, face = -1, pose = 'hold_phone', wk = null, expr = 'happy';
    if (t < T.ask[0]) { wk = walk(t, T.tourist - 0.2, T.ask[0] - 0.1, 2200, R); x = wk.x; pose = 'walk'; }
    else if (t >= T.hurt) { expr = 'sad'; face = 1; wk = walk(t, T.hurt + 0.35, T.feel + 1.2, R, R + 330, { stride: 120 }); x = wk.x; pose = wk.moving ? 'walk' : 'stand'; }
    else if (t > T.no[1]) expr = 'surprised';
    return c.fig('stranger', Object.assign({ x, y: FLOOR, face, pose, mode: 'out', hold: pose === 'walk' && t < T.ask[0] ? 'phone' : undefined, walk: wk ? wk.walk : 0, expr, talk: T.ask }, o || {}));
  }

  FILM.seq({
    id: 'Q06', title: 'Friday: a stranger', chapter: 'Friday: a stranger', from: T.card,
    sound(S) {
      S.bed('music', T.card, T.end, { mood: 'bright, a dip, then a lift' }); S.bed('street_ambience', T.card, T.why);
      S.cue('whoosh', T.card - 0.1); S.cue('pop', T.card + 0.05); S.cue('footsteps', T.tourist, { n: 4, gap: 0.36 });
      S.cue('footsteps', T.hurt + 0.4, { n: 3, gap: 0.5, level: -6 }); S.cue('run', T.run + 0.1); S.cue('camera_shutter', T.photo); S.cue('flash', T.photo + 0.02);
      S.cue('ding', T.happiest); S.cue('whoosh', T.why - 0.05); S.cue('bulb', T.chose);
      S.cue('pop', T.same); S.cue('whoosh', T.fear); S.cue('ding', T.choice);
    },
    shots: [
      { at: T.card, name: 'street: the day card', in: { type: 'wipe', dir: 'right' }, push: 1.04,
        draw(c) { c.set('street', {}); c.fig('hero', { x: L, y: FLOOR, face: 1, pose: 'stand' }); STAGE.dayCard(c, T.card + 0.05, T.tourist - 0.05, 'FRIDAY'); } },
      { at: T.tourist, name: 'street: the stranger asks for a photo, "No."',
        draw(c) { c.set('street', {}); c.fig('hero', { x: L, y: FLOOR, face: 1, pose: c.t > T.no[0] - 0.15 ? 'handup' : 'stand', expr: 'neutral', talk: T.no }); c.setFront('street', {}); stranger(c); } },
      { at: T.hurt, name: 'street: they look hurt and turn away',
        draw(c) { c.set('street', {}); c.fig('hero', { x: L, y: FLOOR, face: 1, pose: 'stand', expr: 'surprised' }); c.setFront('street', {}); stranger(c); } },
      { at: T.feel, name: 'the hero, hands clasped, sad (ref 05)', push: { from: 1, to: 1.05 },
        draw(c) { c.camera({ x: L + 120, y: 420, zoom: 1.75 }); c.set('street', {}); c.fig('hero', { x: L, y: FLOOR, face: 1, pose: 'hands_clasped', expr: c.t > T.terrible ? 'sad' : 'guilty' }); stranger(c); } },
      { at: T.run, name: 'street: the hero runs after them',
        draw(c) { c.set('street', {}); const wk = walk(c.t, T.run, T.take, -200, R - 380, { stride: 220, acc: 0.05 }); c.setFront('street', {}); c.fig('stranger', { x: R + 120, y: FLOOR, face: -1, pose: 'stand', expr: 'surprised' }); c.fig('hero', { x: wk.x, y: FLOOR, face: 1, pose: 'run', walk: wk.walk, expr: 'happy' }); } },
      { at: T.take, name: 'street: the photo, a flash; the happiest all week',
        draw(c) {
          const t = c.t, happy = t >= T.happiest - 0.1; c.set('street', {});
          const h = c.fig('hero', { x: L + 40, y: FLOOR, face: 1, pose: happy ? 'peace' : 'hold_phone', mode: 'out', expr: happy ? 'beaming' : 'happy' });
          c.setFront('street', {}); c.fig('stranger', { x: R + 120, y: FLOOR, face: -1, pose: happy ? 'thumbs_up' : 'stand', expr: 'happy' });
          if (!happy) { const hn = ART.hand('hero', h, 'front'); const st = pop(t, T.photo, 0.15); if (t < T.photo + 0.5) GFX.at(c.g, hn.x + 30, hn.y - 30, { s: st.s * (1 - seg(t, T.photo + 0.25, T.photo + 0.5)) }, q => c.prop('flash', { x: 0, y: 0, r: 70 })); }
          c.flash(0.9 * flash(t, T.photo, 0.4));
        } },
      { at: T.why, name: 'plain: why?', in: 'pop', push: { from: 1.06, to: 1.1, x: 960, y: 380 },
        draw(c) { STAGE.plainHero(c, { pose: 'think', expr: 'confused', marks: c.t < T.because + 0.3 }); } },
      { at: T.because, name: 'plain: because this time, you chose it: the bulb',
        draw(c) { const h = STAGE.plainHero(c, { pose: c.t > T.chose ? 'point' : 'think', expr: c.t > T.chose ? 'happy' : 'neutral' }); STAGE.bulb(c, 'hero', h, T.because + 0.2, T.chose); } },
      { at: T.same, name: 'plain: same yes, different reason: a trembling hand and a steady one', in: 'pop', push: { from: 1, to: 1.1, x: 1300, y: 500 },
        draw(c) {
          c.set('plain', {}); const t = c.t; const fade = 1 - seg(t, T.fear, T.fear + 0.5);
          [[620, T.same, true], [1300, T.different, false]].forEach(([x, t0, shaky]) => {
            const st = pop(t, t0, 0.34); if (!st.on) return; const tr = shaky ? FILM.tremble(t, 9, 11) : { dx: 0, dy: 0 };
            c.g.save(); c.g.globalAlpha = shaky ? fade * 0.85 + 0.15 * fade : 1;
            GFX.at(c.g, x + tr.dx, 450 + tr.dy + (1 - st.s) * 200, { a: st.a }, q => { GFX.wordCard(q, 0, 0, 440, 330, 'YES', { size: 150 }); GFX.arm(q, 0, 178, { from: 60 }); });
            if (shaky && fade > 0.05) { c.g.globalAlpha = fade * 0.9; GFX.shakeLines(c.g, x, 720, 1.4, t); }
            c.g.restore();
          });
          if (t > T.choice) { c.g.save(); c.g.globalAlpha = seg(t, T.choice, T.choice + 0.3); c.g.lineWidth = 12; c.g.strokeStyle = '#FFE38A'; GFX.rr(c.g, 1300 - 250, 450 - 195, 500, 390, 44); c.g.stroke(); c.g.restore(); }
        } },
    ],
  });
})();
