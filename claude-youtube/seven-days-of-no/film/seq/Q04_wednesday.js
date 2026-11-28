/* Q04 · WEDNESDAY: MOM ("Wednesday" to "Thursday")
   Card WEDNESDAY. The call: the hero on the sofa; Mom in her kitchen. "Sunday lunch?" "No." "She says, fine": a tight smile;
   "not fine": one eye twitches. "she calls again": the phone buzzing on the coffee table (ref 07), the hero sipping tea,
   side-eye; "And again": more bubbles. "By evening": the window goes to dusk; the phone screen full frame: Mom, 9 missed calls,
   and one text, "Are you alive?". "Day three. The world has not ended": the window, a calm sunset, a bird. "your phone is
   exhausted": the phone on the table with a tired face, a sweat drop, a low battery. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('Wednesday'));
  const { span, seg, pop, ease } = FILM;
  const T = {
    card: W('Wednesday'), mom: W('your mom'), calls: W('calls'), ask: span('are you coming', 'lunch', FILM.W('Wednesday')), no: span('no', null, FILM.W('Wednesday')),
    argue: W('she does not'), says: W('she says'), fine: span('fine', null, FILM.W('she says')), notFine: W('not fine'),
    again: W('then she calls'), calls2: W('calls', { after: FILM.W('then she calls') }), again2: W('and again'), evening: W('by evening'),
    nine: W('nine'), text: W('one text'), alive: W('are you alive'), day3: W('day three'), ended: W('ended'), phone: W('but your phone'), exhausted: W('exhausted'),
    end: FILM.W('Thursday'),
  };
  const EVE = { tod: 'evening' };
  // Mom in her kitchen (SETS.mumKitchen, its front piece over her)
  function mumSide(c, o) {
    c.set('mumKitchen', {}); const a = c.anchor('mumKitchen', 'center');
    const m = c.fig('mum', Object.assign({ x: a.x + 40, y: a.y, s: a.s, face: -1, pose: 'hold_phone', mode: 'ear', talk: [T.ask, T.fine] }, o || {}));
    c.setFront('mumKitchen', {}); return m;
  }
  function call(c, o) {
    o = o || {}; const t = c.t;
    STAGE.call(c, (cc, r) => { STAGE.fit(cc, r, { x: 900, y: 600 }); STAGE.heroSofa(cc, EVE, Object.assign({ pose: 'sit_phone', talk: T.no }, o.hero || {})); },
      (cc, r) => {
        STAGE.fit(cc, r, { x: 1000, y: 600 }); const m = mumSide(cc, o.mum || {});
        if (t > T.notFine) { const hd = ART.head('mum', m), k = Math.floor((t - T.notFine) * 12) % 3; cc.g.save(); cc.g.lineWidth = 5; cc.g.strokeStyle = '#1c1c1c'; cc.g.lineCap = 'round';
          for (let i = 0; i < 3; i++) { const a = -0.9 + i * 0.45; cc.g.beginPath(); cc.g.moveTo(hd.x - hd.r * 0.95 + Math.cos(a + Math.PI) * (10 + k * 3), hd.y - hd.r * 0.1 + Math.sin(a + Math.PI) * (10 + k * 3)); cc.g.lineTo(hd.x - hd.r * 0.95 + Math.cos(a + Math.PI) * (34 + k * 3), hd.y - hd.r * 0.1 + Math.sin(a + Math.PI) * (34 + k * 3)); cc.g.stroke(); } cc.g.restore(); }
      },
      { k: seg(t, T.mom, T.mom + 0.55) });
  }
  // the phone lying on the coffee table, buzzing, with notifications rising over it
  function tablePhone(c, buzzAt, notes) {
    const a = c.anchor('living', 'tablePhone'), t = c.t; const buzzing = buzzAt.some(b => t >= b && t < b + 1.0);
    const jx = buzzing ? Math.sin(t * 90) * 3 : 0;
    c.prop('phoneFlat', { x: a.x + jx, y: a.y - 6, s: 1.25, glow: buzzing ? 1 : 0.4 });
    if (buzzing) c.prop('buzz', { x: a.x, y: a.y - 10, rx: 80, t });
    notes.forEach((n, i) => STAGE.notify(c, a.x + n[1], a.y - 120 - n[2], n[0], n[3] || 'call', { s: 1.5, bg: n[4] }));
  }

  FILM.seq({
    id: 'Q04', title: 'Wednesday: Mom', chapter: 'Wednesday: Mom', from: T.card,
    sound(S) {
      S.bed('music', T.card, T.end, { mood: 'warm, a little comic' }); S.bed('living_room_evening', T.card, T.nine);
      S.cue('whoosh', T.card - 0.1); S.cue('pop', T.card + 0.05); S.cue('phone_buzz', T.calls - 0.2); S.cue('whoosh', T.mom + 0.05);
      S.cue('twitch', T.notFine + 0.05); S.cue('phone_buzz', T.calls2); S.cue('notify', T.calls2 + 0.1); S.cue('phone_buzz', T.again2); S.cue('notify', T.again2 + 0.1); S.cue('notify', T.again2 + 0.4);
      S.cue('whoosh', T.nine - 0.05); S.cue('notify', T.nine + 0.1); S.cue('receive', T.alive);
      S.cue('bird', T.day3 + 0.6); S.bed('evening_birds', T.day3, T.phone); S.cue('battery_low', T.exhausted); S.cue('sigh', T.exhausted + 0.4);
    },
    shots: [
      { at: T.card, name: 'living, evening: the day card over the hero with his tea', in: { type: 'wipe', dir: 'right' }, push: 1.04,
        draw(c) { STAGE.heroSofa(c, EVE, { hold: 'mug' }); STAGE.dayCard(c, T.card + 0.05, T.mom - 0.05, 'WEDNESDAY'); } },
      { at: T.mom, name: 'call: Mom asks about Sunday lunch, "No."',
        draw(c) { const t = c.t; call(c, { mum: { expr: t > T.no[1] ? 'surprised' : 'happy' }, hero: { expr: 'firm' } }); } },
      { at: T.argue, name: 'call: she does not argue',
        draw(c) { const t = c.t; call(c, { mum: { expr: t > T.says ? 'neutral' : 'surprised', faceOver: t > T.says ? { mouth: { k: 'flat', w: 0.2 } } : null, blinks: [T.notFine, T.notFine + 0.14, T.notFine + 0.28], tremble: t > T.notFine ? 1.5 : 0 }, hero: { expr: 'worried', talk: null } }); } },
      { at: T.says, name: 'close on Mom: "fine", a tight smile; "not fine", one eye twitches', in: 'pop', push: { from: 1, to: 1.06, x: 1000, y: 400 },
        draw(c) {
          const t = c.t, a = c.anchor('mumKitchen', 'center'); c.camera({ x: a.x - 20, y: 360, zoom: 2.15 }); c.set('mumKitchen', {});
          const m = c.fig('mum', { x: a.x + 40, y: a.y, s: a.s, face: -1, pose: 'hold_phone', mode: 'ear', talk: T.fine, expr: 'neutral', faceOver: { mouth: { k: 'flat', w: 0.24 } },
            blinks: [T.notFine + 0.3, T.notFine + 0.42, T.notFine + 0.54], tremble: t > T.notFine + 0.3 ? 1.2 : 0, nod: t > T.notFine + 0.3 ? 0.08 * Math.sin(t * 40) : 0 });
          c.setFront('mumKitchen', {});
          if (t > T.notFine + 0.3) { const hd = ART.head('mum', m), k = Math.floor((t - T.notFine) * 12) % 3; c.g.save(); c.g.lineWidth = 6; c.g.strokeStyle = '#1c1c1c'; c.g.lineCap = 'round';
            for (let i = 0; i < 3; i++) { const ang = Math.PI + (-0.5 + i * 0.5); const r0 = hd.r * 1.05 + k * 4; c.g.beginPath(); c.g.moveTo(hd.x - hd.r * 0.1 + Math.cos(ang) * r0, hd.y - hd.r * 0.15 + Math.sin(ang) * r0); c.g.lineTo(hd.x - hd.r * 0.1 + Math.cos(ang) * (r0 + 36), hd.y - hd.r * 0.15 + Math.sin(ang) * (r0 + 36)); c.g.stroke(); } c.g.restore(); }
        } },
      { at: T.again, name: 'living: the phone buzzing on the table, the hero sips, side-eye', push: { from: 1.15, to: 1.22, x: 1000, y: 620 },
        draw(c) { const t = c.t; STAGE.heroSofa(c, EVE, { pose: 'sit_front', hold: 'sip', expr: 'worried', look: [0.9, 0.4] });
          tablePhone(c, [T.calls2, T.again2], [[T.calls2 + 0.05, -40, 0, 'call', '#77CC81'], [T.again2 + 0.05, 70, 90, 'call', '#77CC81'], [T.again2 + 0.35, -120, 150, 'mail']]); } },
      { at: T.evening, name: 'living: the window goes to dusk',
        draw(c) { const k = seg(c.t, T.evening, T.evening + 0.6); STAGE.heroSofa(c, { tod: 'evening', todTo: 'dusk', todK: k }, { pose: 'sit_front', hold: 'mug', expr: 'tired' }); tablePhone(c, [T.evening], []); } },
      { at: T.nine, name: 'phone screen: Mom, 9 missed calls; "Are you alive?"', in: 'pop',
        draw(c) { const t = c.t; STAGE.phone(c, { mode: 'lock', time: '8:47', date: 'Wednesday', battery: 0.12, buzz: (t > T.alive && t < T.alive + 0.5) ? 1 : 0,
          notes: [{ icon: 'call', title: 'Mom', body: '9 missed calls', count: 9, time: '8:41' }, { icon: 'msg', title: 'Mom', body: 'Are you alive?', time: 'now' }],
          notesK: seg(t, T.nine, T.nine + 0.4) + seg(t, T.alive - 0.05, T.alive + 0.35) }); } },
      { at: T.day3, name: 'the window: a calm sunset, a bird', in: 'fade',
        draw(c) { c.camera({ x: 527, y: 300, zoom: 2.3 }); c.set('living', { tod: 'evening', bird: seg(c.t, T.day3 + 0.3, T.phone) }); } },
      { at: T.phone, name: 'the exhausted phone on the table: tired face, sweat, low battery', in: 'fade',
        draw(c) {
          const t = c.t; c.camera({ x: 1180, y: 700, zoom: 1.9 }); c.set('living', { tod: 'dusk' }); c.setFront('living', { tod: 'dusk' });
          const a = c.anchor('living', 'tablePhone'); const sag = ease.outCubic(seg(t, T.exhausted, T.exhausted + 0.6));
          GFX.phone(c.g, a.x, a.y - 92 + sag * 4, 0.21, (q, sw, sh) => { q.fillStyle = '#20232B'; q.fillRect(0, 0, sw, sh); }, { rot: 0.04 + sag * 0.08 });
          c.g.save(); c.g.translate(a.x, a.y - 82 + sag * 4); c.g.rotate(0.04 + sag * 0.08); GFX.phoneFace(c.g, 0, 0, 0.22, 'tired'); c.g.restore();
          GFX.at(c.g, a.x + 70, a.y - 150, pop(t, T.exhausted, 0.3), q => GFX.sweat(q, 0, 0, 0.9));
          GFX.at(c.g, a.x, a.y - 220, pop(t, T.phone + 0.3, 0.3), q => GFX.battery(q, 0, 0, 0.42, 0.06 + 0.06 * (Math.floor(t * 2) % 2)));
        } },
    ],
  });
})();
