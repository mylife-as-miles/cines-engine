/* Q01 · BORN AND HIRED (0 to "So let's walk")
   Cold open in the maternity room: the newborn hero swaddled in teal in the cot, blinking ("You have just been born"); a tiny
   WELCOME bunting drops over the cot. Close on the baby: a proper breath, then wide eyes ("I need to tell you something").
   "hired": a job-offer card slides in beside the cot; then it fills the frame and each perk is crossed out on its word (no
   interview, no contract, no salary, no resignation letter). "Because this job does not have one": the baby looks at it,
   puzzled. "You are the first born": the FIRSTBORN badge on its lanyard flies in and pins on the swaddle. "not a position. It is
   a career": a career ladder grows out of the cot to the top of the frame, the camera tilting up with it. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(0);
  const { seg, pop, ease, lerp } = FILM;
  const T = {
    born: W('born'), welcome: W('welcome'), before: W('before'), breath: W('breath'), something: W('something'),
    also: W('you have also'), hired: W('hired'), no1: W('no interview'), interview: W('interview'), contract: W('contract'), salary: W('salary'),
    resign: W('resignation'), letter: W('letter'), because: W('because'), one: W('one', { after: FILM.W('because') }),
    first: W('you are the first'), firstborn: W('born', { after: FILM.W('you are the first') }), african: W('and in an african'), position: W('position'),
    career: W('career'), end: FILM.W("so let's walk"),
  };
  const ROWS = [['INTERVIEW', T.interview], ['CONTRACT', T.contract], ['SALARY', T.salary], ['RESIGNATION LETTER', T.letter]];
  // the WELCOME bunting: a string of seven flags across the top of the cot, dropping in at t0 with a bounce
  function welcome(c, t0, cx, cy, s) {
    const t = c.t, g = c.g; if (t < t0 - 0.05) return;
    const k = seg(t, t0, t0 + 0.55), drop = (1 - ease.outBack(k, 2.2)) * -320, sway = Math.sin(t * 1.6) * 0.03;
    g.save(); g.translate(cx, cy + drop); g.rotate(sway); g.scale(s, s);
    const L = ['W', 'E', 'L', 'C', 'O', 'M', 'E'], cols = ['#E37F78', '#F4BF54', '#77CC81', '#7BAFE1', '#B58BD1', '#F5A454', '#E37F78'];
    g.beginPath(); for (let i = -1; i <= 7; i++) { const x = -360 + i * 110, y = 22 * Math.sin((i + 1) / 8 * Math.PI); i < 0 ? g.moveTo(x + 55, y) : g.lineTo(x + 55, y); } g.lineWidth = 5; g.strokeStyle = '#1c1c1c'; g.stroke();
    L.forEach((ch, i) => { const x = -330 + i * 110, y = 22 * Math.sin((i + 1.5) / 8 * Math.PI), sw = Math.sin(t * 2.4 + i) * 0.06; g.save(); g.translate(x, y); g.rotate(sw);
      g.beginPath(); g.moveTo(-44, 0); g.lineTo(44, 0); g.lineTo(0, 100); g.closePath(); GFX.inked(g, cols[i], 4.5); GFX.text(g, ch, 0, 34, { size: 46, weight: 900, color: '#FFFFFF', stroke: 6 }); g.restore(); });
    g.restore();
  }
  // the career ladder rising out of the cot: (x, y0) its foot, grown to height h * k
  function ladder(c, x, y0, h, k) {
    const g = c.g; if (k <= 0) return; const top = y0 - h * ease.outCubic(k), w = 150;
    g.save(); g.lineCap = 'round';
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(x + sd * w / 2, y0); g.lineTo(x + sd * w / 2, top); g.lineWidth = 30; g.strokeStyle = '#1c1c1c'; g.stroke(); g.lineWidth = 20; g.strokeStyle = '#F4BF54'; g.stroke(); }
    for (let yy = y0 - 60; yy > top + 20; yy -= 110) { g.beginPath(); g.moveTo(x - w / 2, yy); g.lineTo(x + w / 2, yy); g.lineWidth = 24; g.strokeStyle = '#1c1c1c'; g.stroke(); g.lineWidth = 14; g.strokeStyle = '#F5A454'; g.stroke(); }
    g.restore();
    if (k > 0.85) GFX.sparkles(g, x, top + 40, 110, c.t, 6);
  }
  const babyFig = (c, o, front) => STAGE.cotBaby(c, { fig: o, front });

  FILM.seq({
    id: 'Q01', title: 'Born and hired', chapter: 'Born and hired', from: 0,
    sound(S) {
      S.bed('music', 0, T.end, { mood: 'tender, playful, Afro-pop colour: kalimba and light shaker' });
      S.cue('baby_coo', T.born + 0.2, { x: 960 }); S.cue('chime', T.welcome + 0.1, { x: 960 });
      S.cue('baby_breath', T.breath, { x: 960 }); S.cue('whoosh', T.hired - 0.05, { x: 1500 });
      ROWS.forEach(([, t]) => S.cue('cross', t + 0.12));
      S.cue('baby_hmm', T.because + 0.4, { x: 900 }); S.cue('whoosh', T.first + 0.3); S.cue('stamp', T.firstborn + 0.1, { x: 960 });
      S.cue('grow', T.career - 0.1, { x: 960 }); S.cue('sparkle', T.career + 0.9);
    },
    shots: [
      { at: 0, name: 'maternity: the newborn hero swaddled in teal in the cot, blinking; WELCOME drops in', push: { from: 1, to: 1.1, x: 860, y: 600 },
        draw(c) {
          c.camera({ x: 900, y: 560, zoom: 1.45 }); c.set('maternity', {}); const t = c.t;
          babyFig(c, { expr: 'neutral', blinks: [0.5, T.born + 0.3, T.born + 0.55, T.welcome + 0.6], look: [0.2 * Math.sin(t * 0.8), -0.2] });
          welcome(c, T.welcome, 860, 420, 0.8);
        } },
      { at: T.before, name: 'close on the baby: a proper breath, then wide eyes ("something")', in: 'fade', push: { from: 1, to: 1.06 },
        draw(c) {
          const t = c.t, a = c.anchor('maternity', 'cot', [860, 652]); c.camera({ x: a.x - 20, y: a.y - 60, zoom: 2.4 }); c.set('maternity', {});
          const br = seg(t, T.breath - 0.1, T.breath + 0.45) * (1 - seg(t, T.breath + 0.6, T.breath + 1.0));
          babyFig(c, { expr: t > T.something ? 'surprised' : 'neutral', mouth: 0.7 * br, blinks: [T.before + 0.7, T.something - 0.4], look: t > T.something ? [0.6, -0.3] : [0, -0.1], dy: -6 * br });
        } },
      { at: T.also, name: 'maternity: "hired": a job-offer card slides in beside the cot', push: { from: 1.04, to: 1.1, x: 1100, y: 560 },
        draw(c) {
          c.camera({ x: 1040, y: 560, zoom: 1.4 }); c.set('maternity', {}); const t = c.t; babyFig(c, { expr: t > T.hired + 0.3 ? 'surprised' : 'neutral', look: t > T.hired + 0.2 ? [1, -0.3] : [0, -0.2] });
          const dx = FILM.slide(t, T.hired - 0.05, 1100, 0.5, 'outCubic'); c.g.save(); c.g.translate(1290 + dx, 520); c.g.rotate(0.05); GFX.jobCard(c.g, 0, 0, 0.36, { rows: ROWS.map(r => ({ label: r[0] })) }); c.g.restore();
        } },
      { at: T.no1, name: 'the job card fills the frame: each perk crossed out on its word', in: { type: 'slide', dir: 'left' }, push: { from: 1, to: 1.05, x: 960, y: 600 },
        draw(c) {
          c.set('plain', {}); const t = c.t;
          STAGE.jobCard(c, 960, 548, 1.08, { rows: ROWS.map(([label, t0]) => ({ label, k: seg(t, t0 + 0.08, t0 + 0.5) })) });
          GFX.badge(c.g, 1340, 900, 0.95, 'FIRSTBORN', { cord: 0, rot: 0.08 + 0.02 * Math.sin(t * 1.3) });
        } },
      { at: T.because, name: 'the baby eyes the card in the cot, puzzled: this job has no way out', push: { from: 1.02, to: 1.12, x: 900, y: 600 },
        draw(c) {
          c.camera({ x: 1000, y: 540, zoom: 1.55 }); c.set('maternity', {}); const t = c.t; const b = babyFig(c, { expr: 'confused', look: [1, -0.4], blinks: [T.because + 1.4] });
          c.g.save(); c.g.translate(1230, 470); c.g.rotate(0.06); GFX.jobCard(c.g, 0, 0, 0.3, { rows: ROWS.map(r => ({ label: r[0], k: 1 })) }); c.g.restore();
          const hd = ART.head('hero', b); GFX.at(c.g, hd.x + 40, hd.y - hd.r - 70, pop(t, T.one - 0.1, 0.34), q => GFX.text(q, '?', 0, 0, { size: 120, weight: 900, color: '#3A8594', stroke: 10, strokeColor: '#FFFFFF' }));
        } },
      { at: T.first, name: 'close: the FIRSTBORN badge flies in and pins on the swaddle', in: 'cut', push: { from: 1, to: 1.05 },
        draw(c) {
          const t = c.t, a = c.anchor('maternity', 'cot', [860, 652]); c.camera({ x: a.x, y: a.y - 40, zoom: 1.9 }); c.set('maternity', {});
          const pin = T.firstborn + 0.1; if (t > pin) c.impact(pin, 0.25, 8);
          const b = babyFig(c, { expr: t > pin + 0.2 ? 'happy' : 'surprised', look: [0, 0.4] }, false);
          const k = ease.inOutCubic(seg(t, T.first + 0.25, pin)); const tx = a.x + 20, ty = a.y - 30;
          if (k >= 1) GFX.badge(c.g, tx, ty, 0.36, 'FIRSTBORN', { cord: 0, rot: 0.06 });
          c.setFront('maternity', {});
          if (k < 1) GFX.badge(c.g, lerp(tx + 700, tx, k), lerp(ty - 420, ty, k) - Math.sin(k * Math.PI) * 120, lerp(0.7, 0.36, k), 'FIRSTBORN', { cord: 70 * (1 - k), rot: lerp(-0.6, 0.06, k) });
          if (t > pin) GFX.sparkles(c.g, tx, ty, 140, t - pin, 6);
        } },
      { at: T.african, name: 'wide: "not a position. It is a career": a ladder grows out of the cot, the camera tilts up', push: { from: 1, to: 1.0001 },
        draw(c) {
          const t = c.t, k = seg(t, T.career - 0.15, T.career + 1.0), tilt = ease.inOutSine(seg(t, T.career, T.end));
          c.camera({ x: 900, y: 560 - 120 * tilt, zoom: 1.3 + 0.08 * seg(t, T.african, T.career) - 0.1 * tilt }); c.set('maternity', {});
          const a = c.anchor('maternity', 'cot', [860, 652]);
          ladder(c, a.x + 60, a.y - 50, 1000, k);
          babyFig(c, { expr: t > T.career + 0.4 ? 'surprised' : 'neutral', look: t > T.career ? [0.2, -1] : [0.3, -0.2] }, false);
          GFX.badge(c.g, a.x + 20, a.y - 30, 0.36, 'FIRSTBORN', { cord: 0, rot: 0.06 }); c.setFront('maternity', {});
        } },
    ],
  });
})();
