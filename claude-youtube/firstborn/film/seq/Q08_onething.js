/* Q08 · ONE THING YOU CAN DO ("So here is something" to "So that is your whole life")
   The hero with the house on his back; "Pick one thing you carry": he sets it down, its roof lifts, and out come one bill, one
   phone call, one decision (a signpost), each on its word, and they land on him. "Say it out loud to the family": the family at
   the dining table, the hero standing, speaking. "This is now shared": a plan board; "not as a fight" (a boxing glove, crossed
   out), "as a plan" (a tick). "Give it a name": the bill gets its name; "give it a person": a sticky note with the sister's face.
   "how many people were waiting to be asked": the siblings and cousins throw their hands up. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('so here is something'));
  const { seg, pop, ease, lerp, punch, span } = FILM;
  const T = {
    start: W('so here is something'), month: W('this month'), pick: W('pick one thing'), carry: W('you carry'),
    bill: W('one bill'), phone: W('one phone call'), decision: W('one decision'), lands: W('lands'),
    say: W('say it out loud'), sayLine: span('say', 'family', FILM.W('say it out loud')), shared: W('this is now shared'), fight: W('fight'), plan: W('plan'),
    name: W('give it a name'), nameW: W('name'), person: W('person'), surprised: W('you would be surprised'), waiting: W('waiting'), asked: W('asked'),
    end: FILM.W('so that is your whole life'),
  };
  const DIN = { view: 'dining', tod: 'day' };
  const ITEMS = () => [[T.bill, 'bill'], [T.phone, 'phone'], [T.decision, 'decision']];
  function item(g, kind, x, y, s, t) {
    if (kind === 'bill') GFX.bill(g, x, y, 0.55 * s, { title: 'LIGHT BILL', amount: 18000, color: '#F5A454' });
    else if (kind === 'phone') GFX.phoneIcon(g, x, y, 0.9 * s, Math.sin(t * 20));
    else GFX.signPost(g, x, y + 110 * s, 1.1 * s);
  }
  // the plan board on its easel: o.k (in), the fight glove crossed (fightK), the plan tick (planK), the bill's name (nameK), the person (personK)
  function planBoard(c, x, y, o) {
    const g = c.g, t = c.t; g.save(); g.translate(x, y);
    g.lineWidth = 12; g.strokeStyle = '#1c1c1c'; g.lineCap = 'round'; [[-200, 380], [200, 380], [0, 420]].forEach(([dx, dy]) => { g.beginPath(); g.moveTo(0, 0); g.lineTo(dx, dy); g.stroke(); });
    GFX.card(g, 0, -60, 640, 470, { fill: '#FFFDF7', band: '#3A8594', bandH: 86, r: 24 });
    GFX.text(g, 'THE PLAN', 0, -250, { size: 56, weight: 900, color: '#FFFFFF', letter: 4 });
    GFX.bill(g, -140, -60, 0.46, { title: o.nameK > 0.5 ? 'LIGHT BILL' : 'BILL', amount: 18000, color: '#F5A454', rot: -0.04 });
    if (o.fightK > 0) { g.save(); g.translate(170, -120); g.beginPath(); g.ellipse(0, 0, 50, 42, 0, 0, Math.PI * 2); GFX.inked(g, '#E5534B', 5); GFX.rr(g, -36, 30, 72, 40, 10); GFX.inked(g, '#FFFFFF', 4); GFX.cross(g, 0, 10, 140, seg(o.fightK, 0.3, 1)); g.restore(); }
    if (o.planK > 0) { g.save(); g.translate(170, 40); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 22; g.strokeStyle = '#5FAF6E'; const u = o.planK; g.beginPath(); g.moveTo(-50, 0); g.lineTo(-50 + 40 * Math.min(1, u * 2), 40 * Math.min(1, u * 2)); if (u > 0.5) g.lineTo(-10 + 90 * (u - 0.5) * 2, 40 - 110 * (u - 0.5) * 2); g.stroke(); g.restore(); }
    g.restore();
    if (o.personK > 0) { const st = FILM.pop(t, o.personT, 0.34); GFX.at(g, x + 90, y + 40, st, q => GFX.sticky(q, 0, 0, 0.9, { rot: 0.08, text: 'SISTER', draw: q2 => { q2.save(); q2.beginPath(); q2.arc(0, -20, 70, 0, Math.PI * 2); q2.clip(); c.fig('sister', { x: 0, y: -20 + 700 * 0.55 + 10, s: 0.55, pose: 'stand', expr: 'happy', shadow: false, tag: false }); q2.restore(); q2.beginPath(); q2.arc(0, -20, 70, 0, Math.PI * 2); q2.lineWidth = 4; q2.strokeStyle = '#1c1c1c'; q2.stroke(); } })); }
  }

  FILM.seq({
    id: 'Q08', title: 'One thing you can do', chapter: 'One thing you can do', from: T.start,
    sound(S) {
      S.bed('music', T.start, T.end, { mood: 'gentle, hopeful, a little lift at "a plan"' });
      S.cue('set_down', T.pick + 0.6, { x: 1200 }); S.cue('lid_creak', T.carry + 0.2, { x: 1200 });
      S.cue('pop', T.bill, { x: 1000 }); S.cue('pop', T.phone, { x: 1200 }); S.cue('pop', T.decision, { x: 1400 }); S.cue('thud', T.lands + 0.1, { x: 800 });
      S.cue('chairs', T.say + 0.2, { x: 960 }); S.cue('marker', T.shared + 0.3, { x: 1400 }); S.cue('cross', T.fight + 0.2, { x: 1570 }); S.cue('tick', T.plan, { x: 1570 });
      S.cue('sticky', T.person, { x: 1490 }); S.cue('cheer_small', T.waiting, { x: 960 });
    },
    shots: [
      { at: T.start, name: 'the hero with the house on his back, under the weight', in: 'fade', push: { from: 1, to: 1.05, x: 960, y: 520 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const KHo = !!(POV && POV.POSES && POV.POSES.house);
          if (!KHo) GFX.house(c.g, 930, 1020 - 600 + 30, 1.05, { rot: -0.04 });
          c.fig('hero', { x: 1000, y: 1020, s: 1.05, face: 1, pose: KHo ? 'house' : 'load', expr: 'tired', turn: 0.1, look: [0, 0], dy: KHo ? 0 : 30 });
          STAGE.chapterCard(c, T.start + 0.2, T.start + 2.0, 'ONE THING YOU CAN DO', { x: 1450, y: 860, scale: 0.5 });
        } },
      { at: T.pick, name: '"Pick one thing you carry": he sets the house down; the roof lifts', in: 'cut', push: { from: 1, to: 1.05, x: 1000, y: 560 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const k = ease.inOutCubic(seg(t, T.pick, T.pick + 0.9)), lid = seg(t, T.carry, T.carry + 0.6, 'outBack');
          const hx = lerp(960, 660, k), hy = lerp(1020 - 570, 1000, k), hs = lerp(1.05, 0.95, k);
          c.g.save(); c.g.translate(hx + 210 * k, hy); if (POV && POV.PROPS && POV.PROPS.house && k >= 1) POV.PROPS.house(c.g, 0, 0, { s: hs * 1.6 }); else GFX.house(c.g, 0, 0, hs, { rot: -0.04 * (1 - k) }); c.g.restore();
          if (lid > 0) { c.g.save(); c.g.translate(hx + 210 * k, hy - 240 * hs); c.g.rotate(-0.5 * lid); c.g.translate(0, -60 * lid); c.g.beginPath(); c.g.moveTo(-210 * hs, 0); c.g.lineTo(0, -160 * hs); c.g.lineTo(210 * hs, 0); c.g.closePath(); GFX.inked(c.g, '#C9645E', 6); c.g.restore(); }
          c.fig('hero', { x: lerp(960, 560, k), y: 1020, s: 1.05, face: 1, pose: k < 1 ? 'load' : 'point', expr: k < 1 ? 'tired' : 'happy', turn: 0.4, look: [1, 0.3] });
        } },
      { at: T.bill, name: 'one bill, one phone call, one decision rise out of the house, then land on him', in: 'cut', push: { from: 1.05, to: 1.1, x: 960, y: 520 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const hx = 870, hy = 1000; GFX.house(c.g, hx, hy, 0.95, {});
          const land = ease.inCubic(seg(t, T.lands - 0.1, T.lands + 0.3));
          const h = c.fig('hero', { x: 560, y: 1020, s: 1.05, face: 1, pose: land > 0.9 ? 'carry' : 'point', expr: land > 0.9 ? 'surprised' : 'neutral', turn: 0.4, look: [1, -0.6], dy: land > 0.95 ? 12 : 0 });
          const hd = ART.head('hero', h);
          ITEMS().forEach(([t0, kind], i) => { const st = pop(t, t0, 0.36); if (!st.on) return; const x0 = 1000 + i * 260, y0 = 300 + (i % 2) * 60 + Math.sin(t * 2 + i) * 10; const x = lerp(x0, hd.x + (i - 1) * 120, land), y = lerp(y0, hd.y + hd.r * 2.2, land);
            GFX.at(c.g, x, y, { sx: st.sx * (1 - 0.4 * land), sy: st.sy * (1 - 0.4 * land), a: st.a }, q => item(q, kind, 0, 0, 1, t)); });
          if (land > 0.95) c.impact(T.lands + 0.3, 0.2, 6);
        } },
      { at: T.say, name: '"Say it out loud to the family": the family at the dining table, the hero standing, speaking', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.05, x: 960, y: 560 },
        draw(c) {
          const t = c.t; c.set('home', DIN); const seats = ['seat1', 'seat2', 'seat3', 'seatL'], who = [['mum'], ['dad'], ['sister'], ['brother']];
          who.forEach(([w], i) => { const a = c.anchor('home', seats[i], [640 + i * 320, 691]); c.fig(w, { age: w === 'sister' || w === 'brother' ? 'grown' : undefined, x: a.x, seatAt: { x: a.x, y: a.y }, s: a.s || 0.92, face: a.facing || 1, pose: 'sit', view: a.facing ? 'side' : 'front', expr: 'neutral', turn: 0.6, look: [1, -0.1] }); });
          c.setFront('home', DIN);
          const st = c.anchor('home', 'standR', [1720, 985]);
          c.fig('hero', { x: st.x - 40, y: st.y, s: st.s || 1.02, face: -1, pose: 'point', expr: 'neutral', talk: T.sayLine, turn: 0.4, look: [1, 0] });
        } },
      { at: T.shared, name: '"This is now shared": the plan board; not a fight (crossed out), a plan (a tick)', in: 'cut', push: { from: 1, to: 1.05, x: 1100, y: 520 },
        draw(c) {
          const t = c.t; c.set('home', DIN); const seats = ['seat1', 'seat2', 'seat3'], who = ['mum', 'dad', 'sister'];
          who.forEach((w, i) => { const a = c.anchor('home', seats[i], [640 + i * 320, 691]); c.fig(w, { age: w === 'sister' ? 'grown' : undefined, x: a.x - 200, seatAt: { x: a.x - 200, y: a.y }, s: a.s || 0.92, face: 1, pose: 'sit', view: 'front', expr: t > T.plan ? 'happy' : 'neutral', look: [0.9, -0.1], turn: 0.4 }); });
          c.setFront('home', DIN);
          const k = ease.outBack(seg(t, T.shared, T.shared + 0.45)); c.g.save(); c.g.translate(1480, 600); c.g.scale(k, k); c.g.translate(-1480, -600);
          planBoard(c, 1480, 600, { fightK: seg(t, T.fight - 0.2, T.fight + 0.5), planK: seg(t, T.plan, T.plan + 0.5) }); c.g.restore();
        } },
      { at: T.name, name: '"Give it a name and give it a person": the bill gets its name, a sticky note with the sister\'s face', in: 'cut', push: { from: 1.05, to: 1.15, x: 1300, y: 520 },
        draw(c) {
          const t = c.t; c.set('home', DIN);
          planBoard(c, 1300, 620, { fightK: 1, planK: 1, nameK: seg(t, T.nameW, T.nameW + 0.2), personK: t > T.person ? 1 : 0, personT: T.person });
          c.fig('hero', { x: 620, y: 990, s: 1.02, face: 1, pose: 'point', expr: 'happy', turn: 0.5, look: [1, -0.2] });
        } },
      { at: T.surprised, name: '"waiting to be asked": siblings and cousins throw their hands up', in: 'cut', push: { from: 1, to: 1.06, x: 960, y: 520 },
        draw(c) {
          const t = c.t; c.set('home', { tod: 'day' });
          [['sister', 420], ['brother', 720], ['cousin', 1200], ['cousin2', 1500]].forEach(([w, x], i) => { const up = t > T.waiting - 0.2 + i * 0.15; c.fig(w, { age: w === 'sister' || w === 'brother' ? 'grown' : undefined, x, y: 990, s: 1, face: x < 960 ? 1 : -1, pose: up ? 'handup' : 'stand', expr: up ? 'happy' : 'surprised', turn: 0.5, look: [1, 0], dy: up ? -Math.abs(Math.sin(t * 7 + i)) * 14 : 0 }); });
          c.fig('hero', { x: 960, y: 1000, s: 1.02, face: 1, pose: 'stand', expr: t > T.waiting ? 'surprised' : 'neutral', turn: 0.3, look: [Math.sin(t * 1.5), 0] });
        } },
    ],
  });
})();
