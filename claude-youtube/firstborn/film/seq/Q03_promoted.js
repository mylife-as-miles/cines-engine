/* Q03 · PROMOTED AT SIX ("Then a baby arrives" to "Now you are a teenager")
   Home: Mum on the sofa with the new baby sister, Dad beside her, the little hero watching. She turns and gives him THE LOOK (close).
   "You are six years old and you have just been promoted": a gold PROMOTED star lands on his chest. Three tasks at once: carrying
   the baby, the toddler brother running behind, reaching for the fan; the hero lunges. "You are six": a punch in; "your own school
   bag": a bag bigger than he is. "the rule of the house": Mum, finger up. "If the small one cries, you did it": the brother wails,
   Mum points. The courtroom gag: the hero pleads in the witness box ("I didn't even touch him"); Mum is the judge, a wooden spoon
   for a gavel ("then why is he crying?"); no evidence (an empty tray); the spoon lands, GUILTY. "really in trouble": the hero
   tiptoes, listening; First name / Middle name / Surname: an alarm meter climbs a step per name and he shrinks; he apologises
   without knowing the crime. The salt errand: coins from Mum, the kiosk, back; "Where is the change?": every coin into her palm;
   Dad audits with a calculator and a long receipt. The brother draws on the wall; "look at your big brother": the hero stands
   stiff; "You are now a poster": framed on the wall, then the poster carries a bucket of water, breathing. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('then a baby arrives'));
  const { seg, pop, ease, lerp, walk, punch, nod, span } = FILM;
  const S0 = FILM.W('then a baby arrives');
  const T = {
    start: S0, arrives: W('arrives'), looks: W('and your mother looks'), look: W('you know the look'), six: W('you are six years'), promoted: W('promoted'),
    carry: W('carry your sister'), watch: W('watch your brother'), dont: W("don't let him"), that: W('that', { after: FILM.W("don't let him") }),
    six2: W('you are six', { after: FILM.W("don't let him") }), barely: W('you can barely'), bag: W('school bag'),
    rule: W('now here is the rule'), simple: W('simple'), cries: W('if the small one'), criesW: W('cries'), didIt: W('you did it'),
    say1: W('you say i'), touch: span('i', 'him', FILM.W('you say i')), theySay: W('they say then'), why: span('then', 'crying', FILM.W('they say then')),
    thatIs: W('that is it'), whole: W('whole case'), evidence: W('no evidence'), judgment: W('judgment'), passed: W('passed'),
    trouble: W('and when you are really'), listen: W('listen'), firstName: W('first name'), middle: W('middle'), surname: W('surname'),
    byTime: W('by the time'), apologizing: W('apologizing'), crime: W('crime'),
    go: W('go', { after: FILM.W('crime') }), salt: W('salt'), youGo: W('you go'), comeBack: W('you come back'), change: W('where is the change'), changeW: W('change'),
    give: W('you give it'), all: W('all of it'), kobo: W('kobo'), audits: W('because this family'), auditsW: W('audits'),
    younger: W('and when your younger'), misbehaves: W('misbehaves'), lookBig: W('look at your big'), didHe: W('did he do this'), standing: W('you are standing'),
    poster: W('you are now a poster'), posterW: W('poster'), moving: W('a moving'), breathing: W('breathing'), water: W('water'), end: FILM.W('now you are a teenager'),
  };
  const EYE = STAGE.EYE, DAY = { tod: 'day' };
  const JUDGE = c => c.anchor('courtroom', 'judge', [1430, 985]);
  const GAVEL = () => !!(POV && POV.POSES && POV.POSES.gavel), KH = n => !!(POV && POV.HOLD && POV.HOLD[n]);
  const KID = (o) => Object.assign({ age: 'kid', s: 1.02, face: -1, pose: 'stand', expr: 'neutral' }, o);
  // Mum on the sofa with the new baby in her arms, Dad standing by her
  function sofaFamily(c, o) {
    o = o || {}; const a = c.anchor('home', 'sofaL', [820, 738]);
    STAGE.holdBaby(c, 'mum', Object.assign({ x: a.x, y: 990, s: a.s || 1, seatAt: { x: a.x, y: a.y }, face: 1, pose: 'sit_sofa', expr: 'happy', look: [0.6, 0.8] }, o.mum || {}), 'sister', Object.assign({ expr: 'neutral' }, o.baby || {}));
    if (o.dad !== false) c.fig('dad', Object.assign({ x: a.x - 330, y: 990, s: 1.02, face: 1, pose: 'hands_clasped', expr: 'happy', turn: 0.4, look: [0.9, 0.7] }, o.dad || {}));
  }
  // the courtroom's front pieces over the figures: the kit's courtroomFront (o.part) when it has one, else the placeholder's
  function courtFront(c, part) {
    if (ART.hasSet('courtroom')) { c.setFront('courtroom', { parts: [part === 'witness' ? 'dock' : 'bench'] }); return; }
    if (part === 'witness') { GFX.rr(c.g, 360, 760, 420, 225, 10); GFX.inked(c.g, '#8A5A3E', 6); GFX.rr(c.g, 340, 740, 460, 36, 8); GFX.inked(c.g, '#A8723F', 5); }
    else { GFX.rr(c.g, 1080, 560, 700, 425, 10); GFX.inked(c.g, '#8A5A3E', 6); GFX.rr(c.g, 1060, 540, 740, 40, 8); GFX.inked(c.g, '#A8723F', 5); }
  }
  // the coins: n coins falling from (x0, y0) into (x1, y1), one every gap s from t0
  function coins(c, x0, y0, x1, y1, t0, gap, n) {
    const t = c.t; for (let i = 0; i < n; i++) { const tc = t0 + i * gap; if (t < tc) continue; const k = seg(t, tc, tc + 0.35, 'inQuad'); GFX.coin(c.g, lerp(x0, x1 + (i % 3 - 1) * 16, k), lerp(y0, y1 - Math.floor(i / 3) * 10, k), 0.8); }
  }

  FILM.seq({
    id: 'Q03', title: 'Promoted at six', chapter: 'Promoted at six', from: T.start,
    sound(S) {
      S.bed('music', T.start, T.end, { mood: 'playful, mock-serious in the courtroom' });
      S.cue('baby_coo', T.arrives + 0.2, { x: 820 }); S.cue('whoosh', T.look - 0.05); S.cue('gulp', T.six - 0.3, { x: 1300 });
      S.cue('stamp', T.promoted + 0.15, { x: 1250 }); S.cue('fanfare_small', T.promoted + 0.3);
      S.cue('baby_cry', T.carry + 0.2, { x: 1000 }); S.cue('footsteps_small', T.watch, { n: 6, gap: 0.2, x: 700 }); S.cue('alarm_short', T.that, { x: 600 });
      S.cue('wobble', T.bag, { x: 1000 }); S.cue('toddler_cry', T.criesW, { x: 900 });
      S.cue('whoosh', T.say1 - 0.05); S.cue('gavel', T.passed + 0.15, { x: 1400 }); S.cue('stamp', T.passed + 0.4, { x: 960 });
      S.cue('tiptoe', T.trouble + 0.4, { n: 6, gap: 0.45, x: 800 });
      S.cue('alarm_step', T.firstName, { x: 1250 }); S.cue('alarm_step', T.middle, { x: 1250 }); S.cue('alarm_step', T.surname, { x: 1250 });
      S.cue('coins', T.go + 0.2, { x: 900 }); S.cue('door', T.youGo, { x: 1500 }); S.cue('coins', T.give + 0.3, { x: 960 }); S.cue('calculator', T.auditsW, { x: 1200 }); S.cue('receipt', T.auditsW + 0.5, { x: 1200 });
      S.cue('scribble', T.younger + 0.3, { x: 600 }); S.cue('frame_clack', T.posterW, { x: 960 }); S.cue('water_slosh', T.water, { x: 960 });
    },
    shots: [
      { at: T.start, name: 'home: Mum on the sofa with the new baby sister, Dad beside her; the little hero watches', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.05, x: 900, y: 600 },
        draw(c) {
          c.set('home', DAY); sofaFamily(c, {}); c.setFront('home', DAY);
          c.fig('hero', KID({ x: 1380, y: 1000, face: -1, expr: 'neutral', turn: EYE.turn, look: [1, 0.4] }));
          STAGE.chapterCard(c, T.start + 0.2, T.start + 2.0, 'PROMOTED AT SIX', { x: 1300, y: 190 });
        } },
      { at: T.looks, name: 'she turns and looks at him', push: { from: 1.12, to: 1.2, x: 1000, y: 600 },
        draw(c) {
          const t = c.t, k = seg(t, T.looks + 0.3, T.looks + 0.8); c.set('home', DAY);
          sofaFamily(c, { mum: { expr: 'neutral', turn: lerp(0.4, 0.75, k), look: [lerp(0.6, 1, k), lerp(0.8, -0.1, k)] }, dad: false }); c.setFront('home', DAY);
          c.fig('hero', KID({ x: 1250, y: 1000, face: -1, expr: t > T.looks + 0.9 ? 'worried' : 'neutral', turn: EYE.turn, look: [1, 0.2] }));
        } },
      { at: T.look, name: 'close: THE LOOK', in: 'cut', push: { from: 1, to: 1.08, x: 900, y: 360 },
        draw(c) {
          const t = c.t, a = c.anchor('home', 'sofaL', [820, 738]); c.camera({ x: a.x + 40, y: 380, zoom: 2.6 }); c.set('home', DAY);
          sofaFamily(c, { mum: { expr: POV && POV.EXPR && POV.EXPR.stern ? 'stern' : 'firm', turn: 0.6, look: [1, -0.1], nod: 0.1 * seg(t, T.look, T.look + 0.5) }, dad: false });
        } },
      { at: T.six, name: 'the six-year-old hero; "promoted": a gold PROMOTED star lands on his chest', in: 'cut', push: { from: 1, to: 1.08, x: 1000, y: 560 },
        draw(c) {
          const t = c.t; c.set('home', DAY); const pr = T.promoted + 0.15; if (t > pr) c.impact(pr, 0.2, 7);
          const h = c.fig('hero', KID({ x: 960, y: 1000, s: 1.25, face: 1, expr: t > pr + 0.3 ? 'surprised' : 'worried', look: t > pr ? [0.1, 0.8] : [0, 0], turn: 0 }));
          const hd = ART.head('hero', h); const st = FILM.stamp(t, pr, { from: 2.6 });
          if (st.on) GFX.at(c.g, hd.x + hd.r * 0.15, hd.y + hd.r * 2.5, Object.assign({}, st, { s: st.s * 0.62 }), q => GFX.starBadge(q, 0, 0, 1, 'PROMOTED'));
          if (t > pr) GFX.sparkles(c.g, hd.x, hd.y + hd.r * 2.3, 200, t - pr, 7);
        } },
      { at: T.carry, name: 'three tasks at once: carrying the baby; the toddler brother runs behind; reaching for the fan', in: { type: 'slide', dir: 'left' },
        draw(c) {
          const t = c.t; c.camera({ x: 900, y: 560, zoom: punch(t, [T.watch, T.dont], 0.06, 0.3), free: true }); c.set('home', DAY);
          const lunge = seg(t, T.that - 0.1, T.that + 0.3, 'outBack');
          const wk = walk(t, T.watch, T.dont + 0.2, 1500, 720, { s: 0.5, acc: 0.1 });
          c.fig('brother', { age: 'toddler', x: wk.x, y: 1000, s: 1, face: -1, pose: wk.moving ? 'run' : (t > T.dont ? 'point' : 'stand'), phase: (t - T.watch) * 2.4, expr: 'happy', turn: t > T.dont ? 0.6 : 0, look: t > T.dont ? [1, -0.6] : [0, 0] });
          c.setFront('home', DAY);
          const hx = 1180 - 160 * lunge;
          STAGE.holdBaby(c, 'hero', KID({ x: hx, y: 1000, s: 1.1, face: -1, expr: t > T.dont ? 'scared' : t > T.watch ? 'worried' : 'neutral', look: t > T.watch ? [1, 0.2] : [0.4, 0.8], turn: t > T.watch ? 0.6 : 0.2, dx: 0, rot: -0.12 * lunge }), 'sister', { expr: t > T.carry + 0.4 ? 'sad' : 'neutral', mouth: t > T.carry + 0.4 ? 0.5 : 0 });
        } },
      { at: T.six2, name: '"You are six": a punch in; "your own school bag": a bag bigger than he is, wobbling', push: { from: 1, to: 1.06, x: 960, y: 540 },
        draw(c) {
          const t = c.t; c.set('home', DAY); const k = seg(t, T.barely + 0.2, T.bag + 0.2, 'outBack'), wob = Math.sin(t * 5) * 0.06 * seg(t, T.bag, T.bag + 0.3);
          c.camera({ x: 960, y: 540, zoom: punch(t, [T.six2 + 0.05], 0.12, 0.3) - 0.12 * seg(t, T.barely, T.barely + 0.6), free: true }); c.set('home', DAY);
          const kitBag = !!(POV && POV.HOLD && POV.HOLD.schoolbag) && k > 0;
          const h = c.fig('hero', KID({ x: 960 + (kitBag ? 60 * seg(t, T.barely, T.rule) : 0), y: 1000, s: 1.2, face: 1, pose: kitBag ? 'walk' : 'stand', walk: kitBag ? (t - T.barely) * 0.9 : undefined, stride: 0.25, expr: t > T.barely ? 'tired' : 'worried', rot: wob, turn: kitBag ? 0.3 : 0, look: [0, 0], hold: kitBag ? 'schoolbag' : undefined }));
          if (k > 0 && !kitBag) { const hd = ART.head('hero', h); GFX.at(c.g, hd.x - 30, hd.y + hd.r * 2.6, { s: k, a: 1 }, q => GFX.schoolBag(q, 0, 0, 1.25, { color: '#E5534B' })); }
          if (t < T.barely) { const hd = ART.head('hero', h); GFX.sweat(c.g, hd.x + hd.r * 0.9, hd.y - hd.r * 0.4, 1.3); }
        } },
      { at: T.rule, name: '"the rule of the house": Mum, finger up', in: 'cut', push: { from: 1, to: 1.08, x: 900, y: 420 },
        draw(c) {
          const t = c.t; c.set('home', DAY);
          c.fig('mum', { x: 860, y: 990, s: 1.05, face: 1, pose: 'finger_up', expr: 'firm', nod: 0.2 * nod(t, [T.simple]), turn: 0.15, look: [0.3, 0] });
          c.fig('hero', KID({ x: 1320, y: 1000, face: -1, expr: 'worried', turn: EYE.turn, look: [1, -0.4] }));
          c.setFront('home', DAY);
        } },
      { at: T.cries, name: '"If the small one cries, you did it": the brother wails; Mum points at the hero', push: { from: 1, to: 1.06, x: 1000, y: 600 },
        draw(c) {
          const t = c.t; c.set('home', DAY); const cr = t > T.criesW;
          const b = c.fig('brother', { age: 'toddler', x: 980, y: 1000, s: 1, face: 1, pose: 'stand', expr: cr ? 'sad' : 'neutral', mouth: cr ? 0.6 + 0.3 * Math.sin(t * 9) : 0 });
          if (cr) GFX.tears(c.g, ART.head('brother', b), t, 1);
          c.fig('mum', { x: 520, y: 990, s: 1.02, face: 1, pose: t > T.didIt ? 'point' : 'stand', expr: t > T.didIt ? 'angry' : 'worried', turn: 0.4, look: [1, 0.2] });
          c.fig('hero', KID({ x: 1430, y: 1000, face: -1, expr: t > T.didIt ? 'surprised' : 'worried', turn: EYE.turn, look: [1, 0.2] }));
          c.setFront('home', DAY);
        } },
      { at: T.say1, name: 'courtroom: the little hero pleads in the witness box ("I didn\'t even touch him")', in: { type: 'wipe', dir: 'left' }, push: { from: 1.2, to: 1.28, x: 560, y: 560 },
        draw(c) {
          const t = c.t; c.set('courtroom', {}); const w = c.anchor('courtroom', 'accused', [560, 985]);
          c.fig('hero', KID({ x: w.x + 10, y: w.y, face: 1, pose: 'shrug', expr: 'worried', talk: T.touch, turn: 0.5, look: [1, -0.3] }));
          courtFront(c, 'witness');
          { const J = JUDGE(c); c.fig('mum', { x: J.x, y: J.y, s: J.s || 1, face: -1, pose: 'stand', expr: 'firm', turn: 0.5, look: [1, 0.3] }); }
          courtFront(c, 'bench');
        } },
      { at: T.theySay, name: 'the judge: Mum at the bench, a wooden spoon for a gavel ("then why is he crying?")', in: 'cut', push: { from: 1.35, to: 1.45, x: 1000, y: 400 },
        draw(c) {
          const t = c.t; c.set('courtroom', {});
          const J = JUDGE(c); if (GAVEL()) c.fig('mum', { x: J.x, y: J.y, s: J.s || 1, face: -1, pose: 'gavel', phase: 0, expr: 'stern', talk: T.why, turn: 0.3, look: [1, 0.2] });
          else { const m = c.fig('mum', { x: 1430, y: 985, s: 1, face: -1, pose: 'stand', expr: 'firm', talk: T.why, turn: 0.3, look: [1, 0.2], override: { armR: { ik: [60, -330], bend: 1, ul: 0.7, hand: 'hold', flip: 1, hrot: 0.2 } } }); const hn = ART.hand('mum', m); GFX.spoon(c.g, hn.x, hn.y + 30, 0.9, -0.3 + 0.1 * Math.sin(t * 3)); }
          courtFront(c, 'bench');
        } },
      { at: T.thatIs, name: 'wide court: "the whole case"; no evidence (an empty tray); the spoon lands: GUILTY', push: { from: 1, to: 1.05, x: 960, y: 560 },
        draw(c) {
          const t = c.t, hit = T.passed + 0.15; if (t > hit) c.impact(hit, 0.35, 12); c.set('courtroom', {}); const w = c.anchor('courtroom', 'accused', [560, 985]);
          c.fig('hero', KID({ x: w.x + 10, y: w.y, face: 1, pose: 'stand', expr: t > hit ? 'sad' : 'worried', turn: 0.5, look: [1, -0.3], dy: t > hit ? 20 * seg(t, hit, hit + 0.4) : 0 }));
          courtFront(c, 'witness');
          const up = seg(t, T.judgment, hit - 0.12), down = seg(t, hit - 0.12, hit);
          const J = JUDGE(c); if (GAVEL()) c.fig('mum', { x: J.x, y: J.y, s: J.s || 1, face: -1, pose: 'gavel', phase: down, expr: 'stern', turn: 0.3, look: [1, 0.3] });
          else { const m = c.fig('mum', { x: 1430, y: 985, s: 1, face: -1, pose: 'stand', expr: 'firm', turn: 0.3, look: [1, 0.3], override: { armR: { ik: [120 - 20 * up + 40 * down, -300 - 140 * up + 200 * down], bend: 1, ul: 0.8, hand: 'hold', flip: 1, hrot: 0.2 } } }); const hn = ART.hand('mum', m); GFX.spoon(c.g, hn.x, hn.y + 30, 0.9, -0.5 - 0.6 * up + 1.2 * down); }
          courtFront(c, 'bench');
          GFX.at(c.g, 1480, 420, FILM.popInOut(t, T.evidence, T.passed - 0.1, 0.3), q => { GFX.rr(q, -170, -60, 340, 120, 20); GFX.inked(q, '#FFFFFF', 5); GFX.rr(q, -140, -30, 280, 70, 14); GFX.inked(q, '#E3E8EE', 4); GFX.text(q, 'EVIDENCE', 0, -100, { size: 44, weight: 900, color: '#FFFFFF', stroke: 8 }); });
          STAGE.stamp(c, 520, 300, T.passed + 0.4, 'GUILTY', { size: 120, rot: -0.12 });
        } },
      { at: T.trouble, name: '"really in trouble": the hero tiptoes through the house, listening', in: 'fade', push: { from: 1, to: 1.05, x: 900, y: 600 },
        draw(c) {
          const t = c.t, ev = { tod: 'evening' }; c.set('home', ev); const tint = ART.tintFor(c, 'home');
          const wk = walk(t, T.trouble + 0.3, T.firstName, 1500, 900, { s: 0.6, stride: 90 });
          c.fig('hero', KID({ x: wk.x, y: 1000, face: -1, pose: t > T.listen ? 'stand' : (wk.moving ? 'walk' : 'stand'), walk: wk.walk, expr: 'worried', tint, look: t > T.listen ? [-1, -0.3] : [0.6, 0],
            override: t > T.listen ? { armR: { ik: [10, -330], bend: 1, ul: 0.6, hand: 'open', flip: 1, hrot: 1.2 } } : null }));
          c.setFront('home', ev);
        } },
      { at: T.firstName, name: 'First name / Middle name / Surname: an alarm meter climbs a step per name; Mum at the door; he shrinks', in: 'cut',
        draw(c) {
          const t = c.t, lv = seg(t, T.firstName, T.firstName + 0.3) + seg(t, T.middle, T.middle + 0.3) + seg(t, T.surname, T.surname + 0.3);
          c.camera({ x: 960, y: 540, zoom: punch(t, [T.firstName, T.middle, T.surname], 0.04, 0.3), free: true }); c.set('home', { tod: 'evening' }); const tint = ART.tintFor(c, 'home');
          if (lv >= 2.9) c.impact(T.surname, 0.3, 8);
          c.fig('mum', { x: 420, y: 990, s: 1.05, face: 1, pose: lv > 0.5 ? 'point' : 'stand', expr: 'angry', tint, talk: [[T.firstName, Wend('first name')], [T.middle, Wend('middle')], [T.surname, Wend('surname')]], turn: 0.5, look: [1, 0.1] });
          c.fig('hero', KID({ x: 1000, y: 1000, face: -1, s: 1.05 * (1 - 0.12 * lv), expr: lv > 1.5 ? 'scared' : 'worried', tint, turn: EYE.turn, look: [1, -0.2], tremble: lv * 1.5 }));
          GFX.alarmMeter(c.g, 1500, 900, 1.15, lv, ['FIRST NAME', 'MIDDLE NAME', 'SURNAME']);
        } },
      { at: T.byTime, name: 'he apologises, bowing, and still does not know the crime ("?")', push: { from: 1, to: 1.08, x: 960, y: 480 },
        draw(c) {
          const t = c.t; c.set('home', { tod: 'evening' }); const tint = ART.tintFor(c, 'home');
          const h = c.fig('hero', KID({ x: 960, y: 1000, s: 1.25, face: 1, pose: 'hands_clasped', expr: t > T.crime - 0.4 ? 'confused' : 'guilty', tint, nod: 0.5 + 0.3 * Math.sin(t * 4), turn: 0, look: [0, 0.6] }));
          const hd = ART.head('hero', h); GFX.at(c.g, hd.x + hd.r * 1.6, hd.y - hd.r * 1.3, pop(t, T.crime - 0.3, 0.34), q => GFX.text(q, '?', 0, 0, { size: 150, weight: 900, color: '#3A8594', stroke: 12, strokeColor: '#FFFFFF' }));
          if (t > T.apologizing) GFX.sweat(c.g, hd.x - hd.r * 0.9, hd.y - hd.r * 0.3, 1.2);
        } },
      { at: T.go, name: '"buy salt": Mum hands him coins', in: { type: 'wipe', dir: 'right' }, push: { from: 1.1, to: 1.16, x: 960, y: 600 },
        draw(c) {
          const t = c.t; c.set('home', DAY);
          if (KH('coins')) c.fig('mum', { x: 700, y: 990, s: 1.02, face: 1, pose: 'stand', hold: 'coins', expr: 'neutral', turn: EYE.turn, look: EYE.look });
          else { const m = c.fig('mum', { x: 700, y: 990, s: 1.02, face: 1, pose: 'stand', expr: 'neutral', turn: EYE.turn, look: EYE.look, override: { armR: { ik: [180, -170], bend: 1, ul: 0.95, hand: 'hold', flip: -1, hrot: -0.2 } } }); const hn = ART.hand('mum', m); coins(c, hn.x + 10, hn.y - 10, hn.x + 10, hn.y - 10, -5, 0, 3); }
          c.fig('hero', KID({ x: 1100, y: 1000, face: -1, expr: 'neutral', turn: EYE.turn, look: EYE.look }));
        } },
      { at: T.youGo, name: 'the kiosk: he goes, takes the salt, comes back', in: { type: 'slide', dir: 'left' }, push: { from: 1, to: 1.04 },
        draw(c) {
          const t = c.t; c.set('shop', {}); const back = t > T.comeBack - 0.15;
          const wk = back ? walk(t, T.comeBack - 0.15, T.change, 1000, 200, { s: 0.6 }) : walk(t, T.youGo - 0.1, T.comeBack - 0.25, 200, 1000, { s: 0.6 });
          const h = c.fig('hero', KID({ x: wk.x, y: 1000, face: wk.face, pose: wk.moving ? 'walk' : 'stand', walk: wk.walk, expr: back ? 'happy' : 'neutral' }));
          if (back) { const hn = ART.hand('hero', h); GFX.salt(c.g, hn.x, hn.y - 30, 0.6); }
          else if (!ART.hasSet('shop') || true) GFX.salt(c.g, 1150, 600, 0.7);
          c.setFront('shop', {});
        } },
      { at: T.change, name: '"Where is the change?": Mum, palm out', in: 'cut', push: { from: 1.15, to: 1.22, x: 860, y: 500 },
        draw(c) {
          const t = c.t; c.set('home', DAY);
          c.fig('mum', { x: 700, y: 990, s: 1.02, face: 1, pose: 'stand', expr: 'firm', talk: [T.change, Wend('change')], turn: EYE.turn, look: EYE.look, override: { armR: { ik: [190, -180], bend: 1, ul: 0.95, hand: 'open', flip: -1, hrot: -1.4 } } });
          const h = c.fig('hero', KID({ x: 1120, y: 1000, face: -1, expr: 'worried', turn: EYE.turn, look: EYE.look }));
          const hn = ART.hand('hero', h); GFX.salt(c.g, hn.x - 20, hn.y - 30, 0.55);
        } },
      { at: T.give, name: 'every coin into her palm, to the last kobo', push: { from: 1, to: 1.06, x: 960, y: 560 },
        draw(c) {
          const t = c.t; c.camera({ x: 900, y: 520, zoom: 1.7 }); c.set('home', DAY);
          const m = c.fig('mum', { x: 700, y: 990, s: 1.02, face: 1, pose: 'stand', expr: 'firm', turn: EYE.turn, look: [1, 0.8], override: { armR: { ik: [190, -180], bend: 1, ul: 0.95, hand: 'open', flip: -1, hrot: -1.4 } } });
          const h = c.fig('hero', KID({ x: 1080, y: 1000, face: -1, expr: t > T.kobo ? 'sad' : 'neutral', turn: EYE.turn, look: [1, 0.8], override: { armR: { ik: [120, -230], bend: 1, ul: 0.9, hand: 'open', flip: 1, hrot: 1.6 } } }));
          const hm = ART.hand('mum', m), hh = ART.hand('hero', h); coins(c, hh.x, hh.y + 10, hm.x + 10, hm.y - 14, T.give + 0.3, 0.32, 8);
        } },
      { at: T.audits, name: '"this family audits": Dad with a calculator and a long receipt', in: 'cut', push: { from: 1, to: 1.08, x: 960, y: 480 },
        draw(c) {
          const t = c.t; c.set('home', DAY);
          const len = 120 + 420 * ease.outCubic(seg(t, T.auditsW, T.auditsW + 1.2));
          if (KH('calculator')) c.fig('dad', { x: 820, y: 990, s: 1.05, face: 1, pose: 'stand', hold: 'calculator', expr: 'stern', nod: 0.4 + 0.08 * Math.sin(t * 5), look: [0.3, 1], override: { prop2: { k: 'receipt', hand: 'L', along: 16, off: [0, 2], len, s: 1, a: 0.06 } } });
          else { const d = c.fig('dad', { x: 820, y: 990, s: 1.05, face: 1, pose: 'carry', expr: 'firm', nod: 0.35 + 0.1 * Math.sin(t * 5), look: [0.3, 1] }); const hl = d.A.handL, hr = d.A.handR; GFX.calculator(c.g, hr[0] + 30, hr[1] - 60, 0.9); GFX.receipt(c.g, hl[0] - 60, hl[1] - 40, 0.9, len); }
          c.fig('hero', KID({ x: 1300, y: 1000, face: -1, expr: 'worried', turn: EYE.turn, look: [1, 0.3] }));
        } },
      { at: T.younger, name: 'the younger brother draws on the wall; "look at your big brother": Mum points at the hero', in: { type: 'wipe', dir: 'left' }, push: { from: 1, to: 1.05, x: 900, y: 560 },
        draw(c) {
          const t = c.t; c.set('home', DAY); const g = c.g;
          g.save(); g.lineCap = 'round'; g.lineWidth = 10; const k = seg(t, T.younger + 0.3, T.lookBig); [['#E5534B', 0], ['#3E8A5A', 0.3], ['#4E8FC4', 0.6]].forEach(([cc, d]) => { const u = FILM.clamp((k - d) / 0.4, 0, 1); if (u <= 0) return; g.strokeStyle = cc; g.beginPath(); for (let i = 0; i <= 30 * u; i++) { const x = 1140 + i * 9, y = 470 + d * 120 + Math.sin(i * 0.9) * 40; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }); g.restore();
          const b = c.fig('brother', { age: 'kid', x: 1180, y: 1000, s: 1, face: 1, pose: t < T.lookBig ? 'point' : 'stand', expr: t < T.lookBig ? 'happy' : 'guilty', turn: t < T.lookBig ? 0.2 : 0.6 });
          c.fig('mum', { x: 520, y: 990, s: 1.02, face: 1, pose: t > T.lookBig ? 'point' : 'stand', expr: t > T.lookBig ? 'firm' : 'surprised', turn: 0.5, look: [1, 0.1] });
          c.fig('hero', KID({ x: 860, y: 1000, face: -1, expr: 'surprised', turn: EYE.turn, look: [1, 0.1] }));
        } },
      { at: T.didHe, name: '"Did he do this?": Mum asks the hero, who stands stiff as a post', in: 'cut', push: { from: 1.1, to: 1.2, x: 860, y: 520 },
        draw(c) {
          const t = c.t; c.set('home', DAY);
          c.fig('mum', { x: 560, y: 990, s: 1.02, face: 1, pose: 'point', expr: 'firm', talk: [T.didHe, Wend('this')], turn: EYE.turn, look: EYE.look });
          c.fig('hero', KID({ x: 960, y: 1000, face: -1, pose: 'stand', expr: 'worried', breath: false, turn: 0.2, look: [0.4, 0], blinks: [T.standing + 0.6] }));
        } },
      { at: T.poster, name: '"You are now a poster": the hero framed on the wall, a ROLE MODEL plate', in: 'pop', push: { from: 1, to: 1.06, x: 960, y: 500 },
        draw(c) {
          const t = c.t; c.set('home', DAY); const k = ease.outBack(seg(t, T.posterW - 0.1, T.posterW + 0.3));
          c.g.save(); GFX.rr(c.g, 760, 160, 400, 560, 10); c.g.fillStyle = '#FFF6E6'; c.g.fill(); c.g.restore();
          c.g.save(); c.g.beginPath(); c.g.rect(760, 160, 400, 560); c.g.clip(); c.fig('hero', KID({ x: 960, y: 780, s: 1.15, face: 1, expr: 'happy', breath: false, turn: 0, look: [0, 0] })); c.g.restore();
          if (k > 0) GFX.at(c.g, 960, 440, { s: 1 + (1 - k) * 0.4, a: Math.min(1, k * 2) }, q => { q.translate(-960, -440); GFX.posterFrame(q, 760, 160, 400, 560, { nail: true, title: 'ROLE MODEL' }); });
          c.fig('brother', { age: 'kid', x: 1380, y: 1000, s: 1, face: -1, pose: 'stand', expr: 'neutral', turn: 0.5, look: [1, -1] });
        } },
      { at: T.moving, name: 'the poster comes alive: moving, breathing, carrying a bucket of water', push: { from: 1.06, to: 1.14, x: 960, y: 460 },
        draw(c) {
          const t = c.t; c.set('home', DAY);
          c.g.save(); GFX.rr(c.g, 760, 160, 400, 560, 10); c.g.fillStyle = '#FFF6E6'; c.g.fill(); c.g.beginPath(); c.g.rect(760, 160, 400, 560); c.g.clip();
          const bob = Math.sin(t * 3) * 6, bk = t > T.water - 0.2, kb = KH('bucket_head');
          const h = c.fig('hero', KID({ x: 960, y: 780 + bob, s: 1.15, face: 1, pose: bk && !kb ? 'carry' : 'stand', hold: bk && kb ? 'bucket_head' : undefined, expr: t > T.water ? 'tired' : 'neutral', breath: 0.02, turn: 0, look: [0, 0] }));
          if (bk && !kb) { const hd = ART.head('hero', h); GFX.bucket(c.g, hd.x, hd.y - hd.r * 1.25, 0.8, { slosh: 1, t }); }
          c.g.restore(); GFX.posterFrame(c.g, 760, 160, 400, 560, { nail: true, title: 'ROLE MODEL' });
          c.fig('brother', { age: 'kid', x: 1380, y: 1000, s: 1, face: -1, pose: 'stand', expr: 'happy', turn: 0.5, look: [1, -1] });
          c.fig('mum', { x: 450, y: 990, s: 1.02, face: 1, pose: 'point', expr: 'happy', turn: 0.4, look: [0.8, -0.7] });
        } },
    ],
  });
})();
