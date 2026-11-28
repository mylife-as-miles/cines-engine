/* Q02 · VERSION 1.0 ("So let's walk" to "Then a baby arrives")
   The life path: a winding road with its milestones (cot, school bag, cap, office, the wedding rice); the grown hero walks onto it,
   then turns to us, and his phone rings ("somebody in your family might be about to call you"). The young parents over the cot,
   panicking ("no idea"), "Zero"; then very serious with a manual and a clipboard. "You sneeze once": the baby sneezes, a siren,
   the parents rush in; "relocating": Dad running with a huge bag, Mum with the baby. "Three years later": the toddler brother
   sneezes, Mum on the sofa hands a cup without looking up ("Give him water"), the little hero side-eyes us. "version 1.0": an
   update window over the baby, bugs crawl out; the parents typing at laptops, LIVE. The house rules board, one rule per line.
   Midnight: the younger brother munching biscuits in front of the TV, the parents asleep. The lab: the baby on the table, the
   parents in goggles with clipboards; the brother in a shiny STABLE RELEASE box. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W("so let's walk"));
  const { seg, pop, ease, lerp, walk, punch, nod } = FILM;
  const T = {
    start: W("so let's walk"), walk: W('walk'), stay: W('stay with me'), call: W('call you'), something: W('something', { after: FILM.W('call you') }),
    rightNow: W('right now'), noIdea: W('no idea'), zero: W('zero'), serious: W('but they are very serious'), seriousW: W('serious'),
    sneeze: W('you sneeze'), sneezeW: W('sneeze'), emergency: W('emergency'), carry: W('they carry you'), bag: W('bag'), relocating: W('relocating'),
    three: W('three years later'), brother: W('your little brother'), sneezes: W('sneezes'), same: W('same sneeze'), water: W('give him water'),
    version: W('you are version'), bugs: W('bugs'), andParents: W('and your parents are fixing'), live: W('live'), production: W('production'),
    rules: W('and the rules'), oh: W('oh the rules'), sweets: W('no sweets'), biscuits: W('no biscuits'), bed: W('bed at'),
    sibling: W('your younger sibling'), eating: W('eating biscuits'), midnight: W('midnight'), nobody: W('and nobody'), word: W('word'),
    experiment: W('you were the experiment'), scientists: W('they were the scientists'), stable: W('your siblings get'), stableW: W('stable'), release: W('release'),
    end: FILM.W('then a baby arrives'),
  };
  const EYE = STAGE.EYE;
  const NIGHT = t => ({ tod: 'night', tv: true, clock: t > T.midnight ? 0.0 : 23.96 });
  // the young parents either side of the cot (maternity), facing it
  function parents(c, o) {
    o = o || {}; const L = c.anchor('maternity', 'parentL', [545, 975]), R = c.anchor('maternity', 'parentR', [1175, 975]);
    const m = c.fig('mum', Object.assign({ x: L.x - 20, y: L.y, s: L.s || 1, face: 1, young: true, turn: 0.4, look: [0.9, 0.5] }, o.mum || {}));
    const d = c.fig('dad', Object.assign({ x: R.x + 30, y: R.y, s: L.s || 1, face: -1, young: true, turn: 0.4, look: [0.9, 0.5] }, o.dad || {}));
    return { m, d };
  }
  const cot = (c, fig, front) => STAGE.cotBaby(c, { fig, front });
  // goggles over a figure's eyes (the scientists)
  function goggles(g, hd, f) { g.save(); g.lineWidth = hd.r * 0.09; g.strokeStyle = '#1c1c1c'; g.beginPath(); g.moveTo(hd.x - hd.r * 0.98, hd.y - hd.r * 0.12); g.lineTo(hd.x + hd.r * 0.98, hd.y - hd.r * 0.12); g.stroke();
    for (const k of [-1, 1]) { g.beginPath(); g.ellipse(hd.x + (k * 0.34 + f * 0.08) * hd.r, hd.y - hd.r * 0.08, hd.r * 0.26, hd.r * 0.22, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(191,227,242,0.55)'; g.fill(); g.lineWidth = hd.r * 0.07; g.stroke(); } g.restore(); }

  FILM.seq({
    id: 'Q02', title: 'Version 1.0', chapter: 'Version 1.0', from: T.start,
    sound(S) {
      S.bed('music', T.start, T.end, { mood: 'bouncy, curious, Afro-pop guitar and shaker' });
      S.cue('whoosh', T.start, { x: 960 }); S.cue('footsteps', T.walk, { n: 5, gap: 0.42, x: 500 }); S.cue('phone_ring', T.call - 0.1, { x: 1100 });
      S.cue('baby_cry', T.rightNow + 0.3, { x: 860 }); S.cue('record_scratch', T.zero, { x: 960 });
      S.cue('page_flip', T.seriousW, { x: 1200 }); S.cue('baby_sneeze', T.sneezeW + 0.18, { x: 860 }); S.cue('siren', T.emergency, { x: 1300 });
      S.cue('run', T.carry + 0.1, { x: 960 }); S.cue('door', T.relocating + 0.5, { x: 1620 });
      S.cue('whoosh', T.three - 0.05); S.cue('toddler_sneeze', T.sneezes + 0.1, { x: 760 }); S.cue('cup_clink', T.water + 0.2, { x: 1100 });
      S.cue('computer_boot', T.version + 0.1); S.cue('bug_crawl', T.bugs, { x: 1200 }); S.cue('typing', T.andParents + 0.2, { n: 10 }); S.cue('ding', T.live, { x: 360 });
      S.cue('chalk', T.sweets, { x: 900 }); S.cue('chalk', T.biscuits, { x: 900 }); S.cue('chalk', T.bed, { x: 900 });
      S.cue('crunch', T.eating + 0.2, { x: 760 }); S.cue('crunch', T.midnight + 0.4, { x: 760 }); S.cue('snore', T.nobody, { x: 1300 });
      S.cue('lab_beep', T.experiment + 0.4, { x: 960 }); S.cue('sparkle', T.stableW, { x: 1100 });
    },
    shots: [
      { at: T.start, name: 'the life path: milestones along a winding road; the grown hero walks onto it', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.06, x: 700, y: 760 },
        draw(c) {
          const t = c.t; STAGE.lifePath(c, { lit: 5 });
          const u = lerp(0, 0.13, ease.inOutSine(seg(t, T.start + 0.3, T.stay))), p = STAGE.pathAt(c, u), wk = walk(t, T.start + 0.3, T.stay, 0, 1, { s: 1 });
          c.fig('hero', { x: p.x, y: p.y + 10, s: p.s, face: 1, pose: wk.moving ? 'walk' : 'stand', walk: (t - T.start) * 1.6, expr: 'happy' });
          STAGE.chapterCard(c, T.start + 0.25, T.start + 2.15, 'VERSION 1.0', { x: 1260, y: 190 });
        } },
      { at: T.stay, name: 'on the path: he turns to us; "call you": his phone rings', push: { from: 1, to: 1.08, x: 960, y: 420 },
        draw(c) {
          const t = c.t, p = STAGE.pathAt(c, 0.13); c.camera({ x: p.x + 80, y: p.y - 230, zoom: 2.2 }); STAGE.lifePath(c, { lit: 5 });
          const ring = t > T.call - 0.1; const h = c.fig('hero', { x: p.x, y: p.y + 10, s: p.s, face: 1, pose: ring ? 'hold_phone' : 'stand', mode: 'front', expr: ring ? 'surprised' : 'happy', turn: ring ? 0.2 : 0, look: ring ? [0.4, 0.6] : [0, 0] });
          if (ring) { const hn = ART.hand('hero', h); c.prop('buzz', { x: hn.x, y: hn.y - 10, rx: 40, t }); STAGE.notify(c, hn.x + 60, hn.y - 120, T.call, 'call', { s: 0.8, bg: '#77CC81' }); }
        } },
      { at: T.rightNow, name: 'maternity: the young parents panic over the crying cot; "Zero."', in: 'fade', push: { from: 1.15, to: 1.22, x: 860, y: 600 },
        draw(c) {
          const t = c.t; c.set('maternity', {}); if (t > T.zero) c.impact(T.zero, 0.25, 7);
          const z = t > T.zero; parents(c, { mum: { expr: 'scared', tremble: 2.5, pose: 'hand_mouth', look: z ? [1, 0] : [0.9, 0.5], turn: z ? 0.6 : 0.4 }, dad: { expr: 'scared', tremble: 2.5, pose: 'shrug', look: z ? [1, 0] : [0.9, 0.5], turn: z ? 0.6 : 0.4 } });
          cot(c, { expr: 'sad', mouth: 0.4 + 0.4 * Math.abs(Math.sin(t * 6)) });
          STAGE.tag(c, 860, 300, 'EXPERIENCE: 0', { t0: T.zero, size: 54, fill: '#FFF4E3' });
        } },
      { at: T.serious, name: 'the parents, very serious: Dad with the baby manual, Mum with a clipboard', push: { from: 1.18, to: 1.26, x: 860, y: 560 },
        draw(c) {
          const t = c.t; c.set('maternity', {}); const nd = 0.35 * nod(t, [T.seriousW, T.seriousW + 0.5]);
          const { m, d } = parents(c, { mum: { expr: 'firm', pose: 'hold_clipboard', nod: nd, look: [0.8, 0.6] }, dad: { expr: 'firm', pose: 'carry', nod: nd + 0.2, look: [0.6, 0.9] } });
          cot(c, { expr: 'neutral', look: [0.6, -0.4] });
          const hd = d.A.handL, hr = d.A.handR; GFX.manual(c.g, (hd[0] + hr[0]) / 2 - 30, Math.min(hd[1], hr[1]) - 40, 0.62, { rot: -0.15 });
        } },
      { at: T.sneeze, name: 'close on the baby: a sneeze; "emergency": the siren, the parents rush in', push: { from: 1, to: 1.04 },
        draw(c) {
          const t = c.t, a = c.anchor('maternity', 'cot', [860, 652]); const em = t > T.emergency; if (em) c.impact(T.emergency, 0.35, 10);
          c.camera({ x: a.x, y: a.y - 90, zoom: 2.2 }); c.set('maternity', {});
          const sn = T.sneezeW + 0.18; const pre = seg(t, T.sneezeW - 0.3, sn), post = t > sn && t < sn + 0.5;
          const b = cot(c, { expr: post ? 'sneeze' : pre > 0.2 && t < sn ? 'sneeze_pre' : em ? 'surprised' : 'neutral', dy: post ? -10 : 0 });
          if (t > sn && t < sn + 0.9) { const hd = ART.head('hero', b), k = seg(t, sn, sn + 0.6); c.g.save(); c.g.globalAlpha = 1 - k; c.g.fillStyle = '#BFE3F2'; for (let i = 0; i < 9; i++) { const ang = -0.6 + i * 0.15; c.g.beginPath(); c.g.arc(hd.x + Math.cos(ang) * (hd.r + 80 * k + i * 6), hd.y + Math.sin(ang) * 60 * k + 10, 7, 0, Math.PI * 2); c.g.fill(); } c.g.restore(); }
          if (em) { GFX.siren(c.g, a.x + 330, a.y - 260, 0.9, Math.floor(t * 6) % 2); const k = ease.outBack(seg(t, T.emergency, T.emergency + 0.4));
            c.fig('mum', { x: a.x - 520 + 180 * k, y: a.y + 330, s: 1, face: 1, expr: 'scared', pose: 'hand_mouth', turn: 0.5, look: [1, 0.4] });
            c.fig('dad', { x: a.x + 560 - 180 * k, y: a.y + 330, s: 1, face: -1, expr: 'scared', pose: 'shrug', turn: 0.5, look: [1, 0.4] }); }
        } },
      { at: T.carry, name: 'the parents run for the hospital: Dad with a bag "like they are relocating", Mum with the baby', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.04 },
        draw(c) {
          const t = c.t; c.set('home', { tod: 'day', doorOpen: true });
          const wkM = walk(t, T.carry, T.relocating + 0.9, 420, 1700, { s: 1, acc: 0.05 }), wkD = walk(t, T.carry + 0.25, T.relocating + 1.2, 60, 1500, { s: 1, acc: 0.05 });
          const kitHold = !!(POV && POV.HOLD && POV.HOLD.holdall);
          const d = c.fig('dad', { x: wkD.x, y: 990, s: 1.02, face: 1, pose: 'run', phase: (t - T.carry) * 1.8, expr: 'scared', hold: kitHold ? 'holdall' : undefined });
          const hd = ART.head('dad', d); GFX.bigBag(c.g, hd.x - 150, hd.y + hd.r * 2.6, 0.75 + 0.25 * seg(t, T.bag - 0.1, T.bag + 0.3, 'outBack'));
          STAGE.holdBaby(c, 'mum', { x: wkM.x, y: 990, s: 1, face: 1, pose: 'run', phase: (t - T.carry) * 1.8 + 0.3, expr: 'scared' }, 'hero', { expr: 'surprised' });
          GFX.speed(c.g, wkD.x - 200, 990, 600, 1, t); GFX.speed(c.g, wkM.x - 60, 990, 560, 1, t + 0.3);
        } },
      { at: T.three, name: 'home, three years later: the toddler brother sneezes the same sneeze; Mum on the sofa, on her phone', in: { type: 'slide', dir: 'left' }, push: { from: 1, to: 1.06, x: 1100, y: 700 },
        draw(c) {
          const t = c.t; c.set('home', { tod: 'evening' }); const a = c.anchor('home', 'sofaL', [820, 738]); const tint = ART.tintFor(c, 'home');
          c.fig('mum', { x: a.x, y: 990, s: a.s || 1, seatAt: { x: a.x, y: a.y }, face: 1, pose: 'sit_sofa', hold: 'phone', expr: 'neutral', look: [0.3, 0.8], tint });
          c.setFront('home', { tod: 'evening' });
          const sn = T.sneezes + 0.1, ph = seg(t, sn - 0.7, sn + 0.15), k = t > sn && t < sn + 0.6;
          c.fig('brother', { age: 'toddler', x: 1250, y: 1000, s: 1, face: -1, pose: t > sn - 0.7 && t < sn + 0.7 ? 'sneeze' : 'stand', phase: ph, expr: k ? 'sneeze' : 'neutral', dy: k ? -12 : 0, tint });
          c.fig('hero', { age: 'toddler', x: 1530, y: 1000, s: 1, face: -1, pose: 'stand', expr: 'neutral', turn: EYE.turn, look: [1, 0.3], tint });
          STAGE.tag(c, 1480, 200, '3 YEARS LATER', { t0: T.three + 0.1, t1: T.three + 2.0, size: 60, fill: '#FFF4E3' });
        } },
      { at: T.water, name: '"Give him water": Mum hands a cup sideways without looking up; the little hero side-eyes us', push: { from: 1.3, to: 1.38, x: 1060, y: 640 },
        draw(c) {
          const t = c.t; c.set('home', { tod: 'evening' }); const a = c.anchor('home', 'sofaL', [820, 738]); const tint = ART.tintFor(c, 'home');
          const k = ease.outBack(seg(t, T.water, T.water + 0.4));
          const cupOut = !!(POV && POV.HOLD && POV.HOLD.cup_out) && k > 0.3;
          const m = c.fig('mum', { x: a.x, y: 990, s: a.s || 1, seatAt: { x: a.x, y: a.y }, face: 1, pose: 'sit_sofa', hold: cupOut ? 'cup_out' : 'phone', expr: 'neutral', look: [-0.2, 0.9], turn: 0.1, talk: [T.water, Wend('water')], tint,
            override: cupOut ? { armL: { ik: [40, -150], bend: 1, fl: 0.62, hand: 'hold', flip: -1, hrot: -0.3 } } : null });
          if (cupOut) { const hl = m.A.handL; if (POV.PROPS.phone) POV.PROPS.phone(c.g, hl[0] + 6, hl[1] - 26, { s: 0.85, a: -0.2, screen: 1 }); }
          c.setFront('home', { tod: 'evening' });
          c.fig('hero', { age: 'toddler', x: 1330, y: 1000, s: 1, face: -1, pose: 'stand', tint, expr: t > T.water + 0.6 ? 'confused' : 'neutral', turn: t > T.water + 0.6 ? 0 : 0.5, look: t > T.water + 0.6 ? [-0.2, 0] : [1, 0.2] });
        } },
      { at: T.version, name: 'the update window over the baby: FIRSTBORN v1.0; bugs crawl out', in: 'pop', push: { from: 1, to: 1.08, x: 960, y: 520 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const p = 0.1 + 0.25 * seg(t, T.version, T.andParents);
          GFX.updateWindow(c.g, 960, 520, 1.15, { title: 'FIRSTBORN v1.0', progress: p, draw: (g) => { GFX.babyIcon(g, 0, -20, 1.3, { t, expr: t > T.bugs ? 'confused' : 'neutral', look: [0.3, -0.2] }); } });
          [[640, 300, 0], [1300, 380, 0.2], [700, 720, 0.45], [1220, 760, 0.65], [1420, 560, 0.85]].forEach(([x, y, d], i) => {
            const st = pop(t, T.bugs + d * 0.6, 0.3); if (!st.on) return; const dx = 30 * Math.sin(t * 2 + i), dy = 20 * Math.cos(t * 1.7 + i);
            GFX.at(c.g, x + dx, y + dy, st, q => GFX.bug(q, 0, 0, 2.0, t + i, Math.sin(t + i) * 0.5)); });
        } },
      { at: T.andParents, name: 'the parents typing at laptops either side of the baby, fixing it live: LIVE', push: { from: 1.1, to: 1.18, x: 860, y: 600 },
        draw(c) {
          const t = c.t; c.set('maternity', {}); const typ = Math.sin(t * 22) * 0.04;
          parents(c, { mum: { pose: 'hold_laptop', expr: 'worried', look: [0.6, 0.7], tremble: 1 }, dad: { pose: 'hold_laptop', expr: 'worried', look: [0.6, 0.7], tremble: 1, nod: 0.2 + typ } });
          const b = cot(c, { expr: 'neutral', look: [0.4 * Math.sin(t * 2), -0.4] });
          [[700, 380], [1010, 330]].forEach(([x, y], i) => GFX.at(c.g, x, y, pop(t, T.andParents + 0.6 + i * 0.4, 0.3), q => GFX.bug(q, 0, 0, 0.8, t + i, i)));
          if (t > T.live - 0.05) { const on = Math.floor((t - T.live) * 2) % 2 === 0; c.screen(); c.g.save(); GFX.rr(c.g, 70, 70, 210, 86, 20); GFX.inked(c.g, on ? '#E5534B' : '#B33A33', 5); c.g.beginPath(); c.g.arc(118, 113, 14, 0, Math.PI * 2); c.g.fillStyle = '#FFFFFF'; c.g.fill(); GFX.text(c.g, 'LIVE', 196, 115, { size: 50, weight: 900, color: '#FFFFFF' }); c.g.restore(); c.reset(); }
        } },
      { at: T.rules, name: 'the house rules board; "Oh, the rules": a punch; each rule on its words; the little hero beside it', in: { type: 'wipe', dir: 'left' },
        draw(c) {
          const t = c.t; c.camera({ x: 960, y: 540, zoom: punch(t, [T.oh], 0.06, 0.3) * (1 + 0.04 * seg(t, T.rules, T.sibling)), free: true }); c.set('home', { tod: 'evening' });
          STAGE.rulesBoard(c, 1060, 470, 0.95, { rules: [{ icon: 'sweet', text: 'NO SWEETS', k: seg(t, T.sweets, T.sweets + 0.35) }, { icon: 'biscuit', text: 'NO BISCUITS', k: seg(t, T.biscuits, T.biscuits + 0.35) }, { icon: 'clock', text: 'BED AT 7', k: seg(t, T.bed, T.bed + 0.35) }] });
          c.fig('hero', { age: 'kid', x: 300, y: 1000, s: 1, face: 1, pose: 'stand', expr: t > T.biscuits ? 'sad' : 'worried', turn: 0.5, look: [1, -0.6] });
        } },
      { at: T.sibling, name: 'midnight: the younger brother munching biscuits in front of the glowing TV; the parents asleep', in: 'fade', push: { from: 1, to: 1.06, x: 900, y: 650 },
        draw(c) {
          const t = c.t; c.set('home', NIGHT(t)); const a = c.anchor('home', 'sofaL', [820, 738]), b2 = c.anchor('home', 'sofaR', [1050, 738]), tint = ART.tintFor(c, 'home', 0.35);
                    c.fig('dad', { x: b2.x, y: 990, s: b2.s || 1, seatAt: { x: b2.x, y: b2.y }, face: 1, pose: 'sit_sofa', expr: 'tired_closed', blink: 1, nod: 0.5, tint });
          const munch = Math.max(0, Math.sin(t * 9));
          const br = c.fig('brother', { age: 'kid', x: a.x, y: 990, s: a.s || 1, seatAt: { x: a.x, y: a.y }, face: 1, pose: 'sit_sofa', expr: 'happy', mouth: munch * 0.6, tint, override: { armR: { ik: [60, -330], bend: 1, ul: 0.6, hand: 'hold', flip: 1, hrot: 0.2 } } });
          const hn = ART.hand('brother', br); c.g.save(); c.g.beginPath(); c.g.arc(hn.x + 10, hn.y - 10, 18, 0, Math.PI * 2); GFX.inked(c.g, '#D9A15E', 4); c.g.restore();
          c.setFront('home', NIGHT(t));
          GFX.zzz(c.g, b2.x + 60, b2.y - 260, 1.2, t);
        } },
      { at: T.nobody, name: 'close: crumbs everywhere; nobody says a word; the little hero in the doorway, jaw dropped', push: { from: 1, to: 1.05 },
        draw(c) {
          const t = c.t; c.camera({ x: 960, y: 640, zoom: 1.75 }); c.set('home', NIGHT(t)); const a = c.anchor('home', 'sofaL', [820, 738]), b2 = c.anchor('home', 'sofaR', [1050, 738]), tint = ART.tintFor(c, 'home', 0.35);
          c.fig('dad', { x: b2.x, y: 990, s: b2.s || 1, seatAt: { x: b2.x, y: b2.y }, face: 1, pose: 'sit_sofa', expr: 'tired_closed', blink: 1, nod: 0.5, tint });
          const munch = Math.max(0, Math.sin(t * 9));
          const br = c.fig('brother', { age: 'kid', x: a.x, y: 990, s: a.s || 1, seatAt: { x: a.x, y: a.y }, face: 1, pose: 'sit_sofa', expr: 'happy', mouth: munch * 0.6, tint, override: { armR: { ik: [60, -330], bend: 1, ul: 0.6, hand: 'hold', flip: 1, hrot: 0.2 } } });
          const hn = ART.hand('brother', br); c.g.beginPath(); c.g.arc(hn.x + 10, hn.y - 10, 18, 0, Math.PI * 2); GFX.inked(c.g, '#D9A15E', 4);
          c.g.fillStyle = '#B9874E'; for (let i = 0; i < 14; i++) { const k = ((t * 0.8 + i * 0.13) % 1); c.g.beginPath(); c.g.arc(hn.x - 40 + (i * 37 % 90), hn.y + 40 + k * 140, 5, 0, Math.PI * 2); c.g.fill(); }
          c.setFront('home', NIGHT(t));
          c.fig('hero', { age: 'kid', x: 1240, y: 1000, s: 1, face: -1, pose: 'stand', expr: 'surprised', turn: EYE.turn, look: EYE.look, tint });
          GFX.zzz(c.g, b2.x + 60, b2.y - 260, 1.2, t);
        } },
      { at: T.experiment, name: 'the lab: the baby hero on the table under the lamp, "the experiment"', in: { type: 'wipe', dir: 'down' }, push: { from: 1, to: 1.1, x: 960, y: 600 },
        draw(c) {
          const t = c.t; c.set('lab', {}); const a = c.anchor('lab', 'table', [960, 720]);
          c.fig('hero', { age: 'newborn', x: a.x, y: a.y, s: 1.5, lie: 1, expr: 'confused', look: [0.5 * Math.sin(t * 1.5), -0.5] });
          GFX.sparkles(c.g, a.x, a.y - 160, 170, t, 5, '#9FD3E6');
        } },
      { at: T.scientists, name: 'the parents as scientists: goggles and clipboards over the table', push: { from: 1, to: 1.06, x: 960, y: 560 },
        draw(c) {
          const t = c.t; c.set('lab', {}); const a = c.anchor('lab', 'table', [960, 720]);
          c.fig('hero', { age: 'newborn', x: a.x, y: a.y, s: 1.5, lie: 1, expr: 'worried', look: [0.6 * Math.sin(t * 2), -0.6] });
          const m = c.fig('mum', { x: a.x - 520, y: 985, s: 1, face: 1, pose: 'hold_clipboard', outfit: 'labcoat', expr: 'firm', turn: 0.5, look: [0.9, 0.7], young: true, nod: 0.2 * Math.sin(t * 3) });
          const d = c.fig('dad', { x: a.x + 520, y: 985, s: 1, face: -1, pose: 'hold_clipboard', outfit: 'labcoat', expr: 'firm', turn: 0.5, look: [0.9, 0.7], young: true });
          goggles(c.g, ART.head('mum', m), 1); goggles(c.g, ART.head('dad', d), -1);
        } },
      { at: T.stable, name: 'the siblings get the stable release: the brother in a shiny box; the little hero side-eyes it', in: 'pop', push: { from: 1, to: 1.06, x: 1000, y: 560 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const st = pop(t, T.stableW - 0.1, 0.36);
          GFX.at(c.g, 1120, 960, st.on ? st : { s: 0.0001, a: 0, on: false }, q => GFX.releaseBox(q, 0, 0, 1.15, { label: 'STABLE RELEASE', ver: 'v2.0', draw: (g, x, y, w, h) => { g.fillStyle = '#FFF6E6'; g.fillRect(x, y, w, h); } }));
          if (st.on) { c.g.save(); c.g.beginPath(); c.g.rect(1120 - 230 * st.s, 960 - 560 * st.s, 460 * st.s, 400 * st.s); c.g.clip();
            c.fig('brother', { age: 'toddler', x: 1120, y: 960 - 90, s: 1.25, face: -1, pose: 'wave', phase: t * 1.4, expr: 'happy', alpha: st.a }); c.g.restore();
            GFX.sparkles(c.g, 1120, 560, 330, t, 8); }
          c.fig('hero', { age: 'kid', x: 520, y: 1010, s: 1.25, face: 1, pose: 'stand', expr: 'confused', turn: 0.5, look: [1, 0], dy: -FILM.breath(t, 3) });
        } },
    ],
  });
})();
