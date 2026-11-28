/* Q04 · THE TEENAGE YEARS ("Now you are a teenager" to "You graduate")
   The classroom: the teen hero with his report card. "They belong to the family": it flies from hand to hand along the family.
   The parents' friends whisper over a phone. "An auntie calls from another state": the split-screen call, "I heard you came
   first"; "How?": the hero holds up his results envelope, still sealed. Three doors: DOCTOR, LAWYER, ENGINEER, each lighting on its
   word; a fourth slides in and its sign flips to DOCTOR. "something creative": the hero with a paintbrush and palette before the
   family; the room goes silent (everyone frozen, the fan stops); Mum swoons into Dad's arms. The neighbour's child: Mrs. Okafor's
   son reading at the dining table, there every single day (the calendar flips), then asleep with the book on his face; "Good for
   him": the hero, deadpan, a slow clap. The turn: the hero on the plain ground; the siblings peeking; on the life path the way
   ahead lights ("a path"), then a warning sign ("a warning"); "you cannot fail": close, sweat; studying late; "the whole queue
   behind you": the siblings and cousins lined up behind him on the path. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W('now you are a teenager'));
  const { seg, pop, ease, lerp, walk, punch, nod, span } = FILM;
  const T = {
    start: W('now you are a teenager'), grades: W('grades'), belong: W('they belong to the family'), family: W('family', { after: FILM.W('they belong to the family') }),
    friends: W("your parents' friends"), results: W('results'), auntie: W('an auntie calls'), state: W('another state'), heard: span('i', 'first', FILM.W('i heard')),
    how: W('how', { after: FILM.W('i heard') }), told: W('you have not even told'), anyone: W('anyone'),
    careers: W('in the careers'), three: W('three choices'), doctor: W('doctor'), lawyer: W('lawyer'), engineer: W('engineer'),
    four: W('four if'), adventurous: W('adventurous'), fourth: W('and the fourth'), doctor2: W('doctor', { after: FILM.W('and the fourth') }),
    creative: W('you say i would'), creativeLine: span('i', 'creative', FILM.W('you say i would')), silent: W('the room goes silent'), hold: W('somebody has to go'), mother: W('mother', { after: FILM.W('somebody has to go') }),
    neighbour: W('of course'), never: W('you have never spoken'), house: W('in your house'), every: W('every single day'), day: W('day', { after: FILM.W('every single') }),
    okafor: W('mrs'), reading: W('reading'), sleep: W('sleep'), good: W('good for him'),
    nobody: W("here's the part"), watching: W('your younger siblings are watching'), succeed: W('if you succeed'), path: W('path'),
    fail: W('if you fail'), warning: W('warning'), cannot: W('so you cannot fail'), studying: W('you are not studying'), queue: W('you are studying for the whole'), queueW: W('queue'),
    end: FILM.W('you graduate'),
  };
  const EYE = STAGE.EYE, DAY = { tod: 'day' };
  const KH = n => !!(POV && POV.HOLD && POV.HOLD[n]);
  const TEEN = o => Object.assign({ age: 'teen', s: 1.02, face: 1, pose: 'stand', expr: 'neutral' }, o);
  // the report card held in front of the chest
  function heldCard(c, f, s, rot) { const hl = f.A.handL, hr = f.A.handR; GFX.reportCard(c.g, (hl[0] + hr[0]) / 2, Math.min(hl[1], hr[1]) - 40 * s, s, { rot: rot || 0 }); }

  FILM.seq({
    id: 'Q04', title: 'The teenage years', chapter: 'The teenage years', from: T.start,
    sound(S) {
      S.bed('music', T.start, T.end, { mood: 'bouncy, then a held breath at "The room goes silent", then thoughtful from "Here\'s the part"' });
      S.cue('school_bell', T.start + 0.2, { x: 960 }); S.cue('paper', T.grades, { x: 960 });
      [0, 1, 2].forEach(i => S.cue('whoosh_small', lerp(T.belong + 0.2, T.friends - 0.2, (i + 0.5) / 3), { x: 500 + i * 400 }));
      S.cue('whisper', T.friends + 0.3, { x: 1100 }); S.cue('phone_ring', T.auntie - 0.15, { x: 480 }); S.cue('envelope', T.told, { x: 1300 });
      S.cue('door_slide', T.doctor, { x: 540 }); S.cue('door_slide', T.lawyer, { x: 960 }); S.cue('door_slide', T.engineer, { x: 1380 }); S.cue('door_slide', T.four + 0.1, { x: 1600 }); S.cue('sign_flip', T.doctor2, { x: 1600 });
      S.duck(T.silent, T.hold, -12); S.cue('clock_tick', T.silent + 0.2, { x: 935 }); S.cue('swoon', T.mother - 0.2, { x: 800 });
      S.cue('page_flip', T.never + 0.4, { x: 960 }); S.cue('calendar_flip', T.every, { x: 1515 }); S.cue('snore', T.sleep - 0.3, { x: 960 }); S.cue('slow_clap', T.good + 0.2, { n: 3, gap: 0.45, x: 960 });
      S.cue('sparkle', T.path, { x: 1500 }); S.cue('warning', T.warning, { x: 700 }); S.cue('heartbeat', T.cannot, { n: 2, x: 960 });
      S.cue('footsteps', T.queueW - 0.2, { n: 4, gap: 0.3, x: 700 });
    },
    shots: [
      { at: T.start, name: 'the classroom: the teen hero with his report card', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.06, x: 900, y: 560 },
        draw(c) {
          const t = c.t; c.set('school', {}); const up = seg(t, T.grades - 0.2, T.grades + 0.3, 'outBack');
          const h = c.fig('hero', TEEN({ x: 760, y: 1000, s: 1.1, pose: KH('report') ? 'stand' : 'hold_card', hold: KH('report') ? 'report' : undefined, expr: t > T.grades ? 'surprised' : 'happy', look: [0.2, 0.6] }));
          if (!KH('report')) heldCard(c, h, 0.5 + 0.12 * up, -0.05);
          STAGE.chapterCard(c, T.start + 0.2, T.start + 2.0, 'THE TEENAGE YEARS', { x: 1340, y: 200 });
        } },
      { at: T.belong, name: '"They belong to the family": the report card flies hand to hand along the family', in: 'cut', push: { from: 1, to: 1.04 },
        draw(c) {
          const t = c.t; c.set('home', DAY);
          const who = [['mum', 360], ['dad', 760], ['auntie', 1160], ['uncle', 1560]], k = seg(t, T.belong + 0.1, T.friends - 0.15) * 3;
          const figs = who.map(([w, x], i) => { const has = Math.floor(k) === i || (i === 3 && k >= 3); return c.fig(w, { x, y: 990, s: 0.98, face: i % 2 ? -1 : 1, pose: has ? 'hold_card' : 'stand', expr: has ? 'happy' : 'surprised', turn: 0.5, look: [1, 0.2] }); });
          const flyCard = (x, y, rot) => { if (POV && POV.PROPS && POV.PROPS.reportCard) c.prop('reportCard', { x, y, s: 0.75, a: rot }); else GFX.reportCard(c.g, x, y, 0.32, { rot }); };
          const i = Math.min(2, Math.floor(k)), u = k >= 3 ? 1 : k - i; const A = figs[i].A, B = figs[Math.min(3, i + 1)].A;
          const pa = [(A.handL[0] + A.handR[0]) / 2, Math.min(A.handL[1], A.handR[1]) - 40], pb = [(B.handL[0] + B.handR[0]) / 2, Math.min(B.handL[1], B.handR[1]) - 40], e = ease.inOutSine(u);
          flyCard(lerp(pa[0], pb[0], e), lerp(pa[1], pb[1], e) - Math.sin(e * Math.PI) * 220, e * Math.PI * 2 * (u < 1 ? 1 : 0));
        } },
      { at: T.friends, name: 'the parents\' friends whisper over a phone; the hero behind them, puzzled', in: 'cut', push: { from: 1, to: 1.06, x: 1000, y: 560 },
        draw(c) {
          const t = c.t; c.set('home', { view: 'dining', tod: 'day' });
          const a = c.fig('auntie2', { x: 820, y: 990, s: 1, face: 1, pose: 'hold_phone', mode: 'front', expr: 'surprised', turn: 0.5, look: [0.6, 0.7], nod: 0.2 * Math.sin(t * 6) });
          c.fig('uncle2', { x: 1080, y: 990, s: 1.02, face: -1, pose: 'hand_mouth', expr: 'happy', turn: 0.6, look: [1, 0.4] });
          c.fig('hero', TEEN({ x: 1500, y: 1000, face: -1, expr: 'confused', turn: EYE.turn, look: EYE.look }));
          GFX.at(c.g, 950, 360, pop(t, T.results, 0.3), q => { GFX.bubble(q, 0, 0, 300, 160, { tail: [-60, 140] }); GFX.text(q, 'A A A A', 0, 4, { size: 54, weight: 900, color: '#3E8A5A' }); });
        } },
      { at: T.auntie, name: 'the call: an auntie from another state, "I heard you came first"', in: 'cut',
        draw(c) {
          const t = c.t;
          STAGE.call(c, (cc, r) => { STAGE.fit(cc, r, { x: 900, y: 560, zoom: 1.25 }); cc.set('kitchen', {}); cc.fig('auntie', { x: 940, y: 985, s: 1, face: 1, pose: 'hold_phone', mode: 'ear', expr: 'happy', talk: T.heard, turn: 0.3 }); cc.setFront('kitchen', {}); },
            (cc, r) => { STAGE.fit(cc, r, { x: 1000, y: 560, zoom: 1.25 }); cc.set('home', DAY); cc.fig('hero', TEEN({ x: 960, y: 1000, face: -1, pose: 'hold_phone', mode: 'ear', expr: t > T.heard[0] + 0.6 ? 'surprised' : 'neutral', turn: 0.3 })); },
            { k: seg(t, T.auntie, T.auntie + 0.5) });
        } },
      { at: T.how, name: '"How?": close on the hero; he holds up his results envelope, still sealed', in: 'cut', push: { from: 1, to: 1.08, x: 960, y: 420 },
        draw(c) {
          const t = c.t; c.set('home', DAY);
          const up = seg(t, T.told, T.told + 0.4, 'outBack'), h = c.fig('hero', TEEN({ x: 960, y: 1000, s: 1.25, face: 1, pose: up > 0 ? 'hold_card' : 'shrug', expr: 'confused', turn: 0, look: [0, 0] }));
          if (up > 0) { const hl = h.A.handL, hr = h.A.handR; GFX.at(c.g, (hl[0] + hr[0]) / 2, Math.min(hl[1], hr[1]) - 60, { s: up, a: 1 }, q => { GFX.envelope(q, 0, 0, 1.3, false); q.beginPath(); q.arc(0, 0, 24, 0, Math.PI * 2); GFX.inked(q, '#D9443B', 4); }); }
        } },
      { at: T.careers, name: 'three doors: DOCTOR, LAWYER, ENGINEER, each lighting on its word', in: { type: 'wipe', dir: 'left' }, push: { from: 1, to: 1.05, x: 960, y: 520 },
        draw(c) {
          const t = c.t; const n = seg(t, T.doctor - 0.25, T.doctor + 0.15) + seg(t, T.lawyer - 0.25, T.lawyer + 0.15) + seg(t, T.engineer - 0.25, T.engineer + 0.15);
          const lit = t > T.engineer ? 2 : t > T.lawyer ? 1 : t > T.doctor ? 0 : -1;
          if (STAGE.kit('doorTrio')) c.set('doorTrio', { labels: ['Doctor', 'Lawyer', 'Engineer'], n, glow: lit, t });
          else { c.set('plain', {}); const d = (label, icon, t0) => ({ label, icon, k: seg(t, t0 - 0.25, t0 + 0.25), lit: seg(t, t0, t0 + 0.2) * (1 - 0.6 * seg(t, t0 + 0.6, t0 + 1.0)) });
            STAGE.doors(c, { y: 930, spacing: 430, s: 0.95, doors: [d('DOCTOR', 'doctor', T.doctor), d('LAWYER', 'lawyer', T.lawyer), d('ENGINEER', 'engineer', T.engineer)] }); }
          c.fig('hero', TEEN({ x: 960, y: 1180, s: 1.1, face: 1, expr: 'worried', turn: 0.1, look: [Math.sin(t * 1.2) * 0.8, -0.6] }));
        } },
      { at: T.four, name: 'a fourth door slides in; its sign flips to DOCTOR', in: 'cut', push: { from: 1, to: 1.04, x: 1100, y: 520 },
        draw(c) {
          const t = c.t; const flip = seg(t, T.doctor2 - 0.1, T.doctor2 + 0.3);
          if (STAGE.kit('doorTrio')) c.set('doorTrio', { labels: ['Doctor', 'Lawyer', 'Engineer', flip > 0.5 ? 'Doctor' : '?'], n: 3 + seg(t, T.four, T.four + 0.45), glow: t > T.doctor2 ? 3 : -1, t });
          else { c.set('plain', {}); STAGE.doors(c, { y: 930, spacing: 400, s: 0.88, cx: 960, doors: [{ label: 'DOCTOR', icon: 'doctor' }, { label: 'LAWYER', icon: 'lawyer' }, { label: 'ENGINEER', icon: 'engineer' },
            { label: flip > 0.5 ? 'DOCTOR' : '???', icon: flip > 0.5 ? 'doctor' : null, k: seg(t, T.four, T.four + 0.45), lit: seg(t, T.doctor2, T.doctor2 + 0.2), plate: flip > 0.5 ? '#FFE38A' : '#FFF6E6' }] }); }
          c.fig('hero', TEEN({ x: 760, y: 1180, s: 1.1, face: 1, expr: t > T.doctor2 + 0.3 ? 'firm' : 'surprised', turn: t > T.doctor2 + 0.3 ? 0 : 0.5, look: t > T.doctor2 + 0.3 ? [0, 0] : [1, -0.5] }));
        } },
      { at: T.creative, name: '"something creative": the hero with a paintbrush and palette before the family', in: 'cut', push: { from: 1, to: 1.05, x: 900, y: 560 },
        draw(c) {
          const t = c.t; c.set('home', DAY); const L = c.anchor('home', 'sofaL', [820, 738]), R = c.anchor('home', 'sofaR', [1050, 738]);
          c.fig('mum', { x: L.x, y: 990, seatAt: { x: L.x, y: L.y }, s: L.s || 1, face: 1, pose: 'sit_sofa', expr: 'happy', look: [1, 0] });
          c.fig('dad', { x: R.x, y: 990, seatAt: { x: R.x, y: R.y }, s: R.s || 1, face: 1, pose: 'sit_sofa', expr: 'happy', look: [1, 0] });
          c.setFront('home', DAY);
          const h = c.fig('hero', TEEN({ x: 1460, y: 1000, face: -1, pose: KH('paintbrush') ? 'stand' : 'point', hold: KH('paintbrush') ? 'paintbrush' : undefined, expr: 'happy', talk: T.creativeLine, turn: EYE.turn, look: EYE.look }));
          if (!KH('paintbrush')) { const hn = ART.hand('hero', h); GFX.paintbrush(c.g, hn.x, hn.y, 0.7, -0.9); GFX.palette(c.g, h.A.handL[0] + 10, h.A.handL[1] - 10, 0.6); }
        } },
      { at: T.silent, name: 'the room goes silent: everyone frozen, the fan stops', in: 'cut', push: { from: 1.02, to: 1.1, x: 960, y: 520 },
        draw(c) {
          const t = c.t, o = { tod: 'day', fan: false }; c.set('home', o); const L = c.anchor('home', 'sofaL', [820, 738]), R = c.anchor('home', 'sofaR', [1050, 738]);
          c.fig('mum', { x: L.x, y: 990, seatAt: { x: L.x, y: L.y }, s: L.s || 1, face: 1, pose: 'sit_sofa', expr: 'surprised', look: [1, 0], breath: false, noBlink: true });
          c.fig('dad', { x: R.x, y: 990, seatAt: { x: R.x, y: R.y }, s: R.s || 1, face: 1, pose: 'sit_sofa', expr: 'surprised', look: [1, 0], breath: false, noBlink: true });
          c.setFront('home', o);
          const h = c.fig('hero', TEEN({ x: 1460, y: 1000, face: -1, pose: 'stand', hold: KH('paintbrush') ? 'paintbrush' : undefined, expr: 'worried', turn: EYE.turn, look: [1, 0.2], blinks: [T.silent + 0.8] }));
          if (!KH('paintbrush')) { const hn = ART.hand('hero', h); GFX.paintbrush(c.g, hn.x, hn.y, 0.7, 0.3); }
        } },
      { at: T.hold, name: 'somebody has to hold your mother: she swoons into Dad\'s arms', in: 'cut', push: { from: 1.15, to: 1.22, x: 860, y: 560 },
        draw(c) {
          const t = c.t; c.set('home', DAY); const k = seg(t, T.mother - 0.3, T.mother + 0.4, 'outBack');
          const kk = seg(t, T.mother - 0.4, T.mother + 0.4);
          if (POV && POV.swoonPair && ART.resolve('mum') && ART.resolve('dad')) { c.g.save(); try { POV.swoonPair(c.g, { x: 900, y: 990, scale: 1, facing: -1, t: kk, mum: ART.resolve('mum'), dad: ART.resolve('dad'), shadow: 'rgba(140,70,20,0.18)', blink: FILM.blink(t, 4) }); } catch (e) { FILM.warn('swoonPair: ' + e.message); } c.g.restore(); }
          else { c.fig('dad', { x: 700, y: 990, s: 1.02, face: 1, pose: 'carry', expr: 'worried', turn: 0.4, look: [0.8, 0.4] }); c.fig('mum', { x: 900, y: 990, s: 1, face: -1, pose: 'swoon', expr: 'tired_closed', rot: -0.5 * k, dx: -60 * k, dy: -10 * k }); }
          c.fig('hero', TEEN({ x: 1460, y: 1000, face: -1, pose: 'hand_mouth', expr: 'scared', turn: EYE.turn, look: EYE.look }));
        } },
      { at: T.neighbour, name: 'the neighbour\'s child: Mrs. Okafor\'s son, reading at the family\'s dining table', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.06, x: 960, y: 560 },
        draw(c) {
          const t = c.t, o = { view: 'dining', tod: 'day' }; c.set('home', o); const s2 = c.anchor('home', 'seat2', [960, 691]);
          const n = c.fig('neighbour', { age: 'teen', x: s2.x, seatAt: { x: s2.x, y: s2.y }, s: s2.s || 0.92, face: 1, pose: 'sit', view: 'front', hold: KH('book') ? 'book' : undefined, expr: 'neutral', look: [0, 0.8], nod: 0.4 });
          c.setFront('home', o); if (!KH('book')) { const hl = n.A.handL, hr = n.A.handR; GFX.book(c.g, (hl[0] + hr[0]) / 2, Math.min(hl[1], hr[1]) - 30, 0.8, { open: 1, color: '#3E6FA6' }); }
          c.fig('hero', TEEN({ x: 1640, y: 1000, face: -1, expr: 'confused', turn: EYE.turn, look: [1, -0.1] }));
        } },
      { at: T.never, name: 'never spoken to him, yet he is in your house every single day: the calendar flips, he keeps turning up', in: 'cut', push: { from: 1, to: 1.05 },
        draw(c) {
          const t = c.t, o = { view: 'dining', tod: 'day' }; c.set('home', o);
          const k = Math.floor(seg(t, T.house, T.end) * 12), DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'], seats = ['seat1', 'seat3', 'seat2', 'seatL', 'seat1', 'seat3', 'seat2'];
          const sa = c.anchor('home', seats[k % 7], [960, 691]);
          const n = c.fig('neighbour', { age: 'teen', x: sa.x, seatAt: { x: sa.x, y: sa.y }, s: sa.s || 0.92, face: (sa.facing || 1), pose: 'sit', view: sa.facing ? 'side' : 'front', expr: k % 2 ? 'happy' : 'neutral', look: [0, 0.8] });
          c.setFront('home', o); const hl = n.A.handL, hr = n.A.handR; GFX.book(c.g, (hl[0] + hr[0]) / 2, Math.min(hl[1], hr[1]) - 30, 0.7, { open: 1, color: '#3E6FA6' });
          const cal = c.anchor('home', 'calendar', [1515, 425]); GFX.card(c.g, cal.x, cal.y + 20, 180, 170, { fill: '#FFFDF7', band: '#E5534B', bandH: 46, r: 14, draw: q => GFX.text(q, DAYS[k % 7], 0, 30, { size: 60, weight: 900 }) });
        } },
      { at: T.okafor, name: 'Mrs. Okafor\'s son, reading in his sleep: the book on his face, its pages still turning', in: 'cut', push: { from: 1.2, to: 1.3, x: 960, y: 520 },
        draw(c) {
          const t = c.t, o = { view: 'dining', tod: 'day' }; c.set('home', o); const s2 = c.anchor('home', 'seat2', [960, 691]);
          const n = c.fig('neighbour', { age: 'teen', x: s2.x, seatAt: { x: s2.x, y: s2.y }, s: s2.s || 0.92, face: 1, pose: 'sit', view: 'front', expr: 'tired_closed', blink: 1, nod: -0.6, tint: null });
          c.setFront('home', o); const hd = ART.head('neighbour', n);
          if (t > T.reading - 0.2) { GFX.book(c.g, hd.x, hd.y + hd.r * 0.1, hd.r / 90, { open: 1, color: '#3E6FA6', rot: 0.05 * Math.sin(t * 2) }); GFX.zzz(c.g, hd.x + hd.r * 1.2, hd.y - hd.r, 1.4, t); }
        } },
      { at: T.good, name: '"Good for him": the hero, deadpan, a slow clap', in: 'cut', push: { from: 1, to: 1.06, x: 960, y: 420 },
        draw(c) { c.set('home', { view: 'dining', tod: 'day' }); c.fig('hero', TEEN({ x: 960, y: 1000, s: 1.3, face: 1, pose: 'clap', expr: 'firm', turn: 0, look: [0, 0] })); } },
      { at: T.nobody, name: 'the plain ground: "the part nobody says out loud"', in: 'fade', push: { from: 1, to: 1.08, x: 960, y: 440 },
        draw(c) { STAGE.plainHero(c, { age: 'teen', expr: 'neutral' }); } },
      { at: T.watching, name: 'the younger siblings peeking in, watching him', in: 'cut', push: { from: 1, to: 1.06, x: 1100, y: 560 },
        draw(c) {
          const t = c.t; c.set('home', DAY);
          c.fig('hero', TEEN({ x: 700, y: 1000, s: 1.05, face: 1, pose: 'think', expr: 'neutral', turn: 0.2 }));
          const k = ease.outBack(seg(t, T.watching + 0.2, T.watching + 0.7));
          c.fig('sister', { age: 'kid', x: 2010 - 300 * k, y: 1000, s: 1, face: -1, pose: 'hand_mouth', expr: 'happy', turn: EYE.turn, look: EYE.look });
          c.fig('brother', { age: 'kid', x: 2150 - 360 * k, y: 1000, s: 1.05, face: -1, pose: 'stand', expr: 'neutral', turn: EYE.turn, look: EYE.look });
        } },
      { at: T.succeed, name: 'the life path: "they have a path": the way ahead lights up, the siblings behind him', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.05, x: 900, y: 700 },
        draw(c) {
          const t = c.t; STAGE.lifePath(c, { lit: 2 + 3 * seg(t, T.path, T.path + 0.8) });
          const P = u => STAGE.pathAt(c, u);
          [['brother', 0.18, 'kid'], ['sister', 0.12, 'kid']].forEach(([w, u, age]) => { const p = P(u); c.fig(w, { age, x: p.x, y: p.y + 10, s: p.s, face: 1, pose: 'stand', expr: 'happy', turn: 0.4, look: [1, -0.3] }); });
          const p = P(0.3); c.fig('hero', TEEN({ x: p.x, y: p.y + 10, s: p.s, face: 1, pose: 'walk', walk: (t - T.succeed) * 1.6, expr: 'neutral' }));
          if (t > T.path) GFX.sparkles(c.g, 1400, 560, 300, t - T.path, 8);
        } },
      { at: T.fail, name: '"they have a warning": a warning sign springs up on the path', in: 'cut', push: { from: 1.05, to: 1.1, x: 900, y: 700 },
        draw(c) {
          const t = c.t; STAGE.lifePath(c, { lit: 5 }); const P = u => STAGE.pathAt(c, u);
          [['brother', 0.18, 'kid'], ['sister', 0.12, 'kid']].forEach(([w, u, age]) => { const p = P(u); c.fig(w, { age, x: p.x, y: p.y + 10, s: p.s, face: 1, pose: 'stand', expr: t > T.warning ? 'scared' : 'neutral', turn: 0.4, look: [1, -0.3] }); });
          const p = P(0.3); c.fig('hero', TEEN({ x: p.x, y: p.y + 10, s: p.s, face: -1, pose: 'stand', expr: 'worried' }));
          const w = P(0.4); GFX.at(c.g, w.x + 120, w.y + 20, pop(t, T.warning - 0.1, 0.36), q => GFX.warning(q, 0, 0, 0.9));
        } },
      { at: T.cannot, name: '"you cannot fail": close on the hero, a bead of sweat', in: 'cut', push: { from: 1.1, to: 1.2, x: 960, y: 400 },
        draw(c) { const t = c.t; const h = STAGE.plainHero(c, { age: 'teen', expr: 'worried', tremble: 1.5 }); const hd = ART.head('hero', h); GFX.sweat(c.g, hd.x + hd.r * 0.85, hd.y - hd.r * 0.35 + 30 * seg(t, T.cannot + 0.3, T.cannot + 1.4), 1.4); } },
      { at: T.studying, name: 'studying late at the dining table under the light', in: 'cut', push: { from: 1, to: 1.06, x: 960, y: 560 },
        draw(c) {
          const t = c.t, o = { view: 'dining', tod: 'night' }; c.set('home', o); const s2 = c.anchor('home', 'seat2', [960, 691]); const tint = ART.tintFor(c, 'home', 0.3);
          const h = c.fig('hero', TEEN({ x: s2.x, seatAt: { x: s2.x, y: s2.y }, s: s2.s || 0.92, pose: 'sit', view: 'front', expr: 'tired', look: [0, 0.8], nod: 0.3, tint }));
          c.setFront('home', o); const hl = h.A.handL, hr = h.A.handR; GFX.book(c.g, (hl[0] + hr[0]) / 2, Math.min(hl[1], hr[1]) - 30, 0.8, { open: 1, color: '#7B5EA7' });
        } },
      { at: T.queue, name: '"the whole queue behind you": the siblings and cousins lined up behind him on the path', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.08, x: 700, y: 760 },
        draw(c) {
          const t = c.t; STAGE.lifePath(c, { lit: 5 }); const P = u => STAGE.pathAt(c, u);
          const line = [['cousin2', 0.02, 'kid'], ['cousin', 0.07, 'kid'], ['sister', 0.12, 'kid'], ['brother', 0.17, 'kid']];
          line.forEach(([w, u, age], i) => { const k = seg(t, T.queueW - 0.4 + i * 0.12, T.queueW + i * 0.12); if (k <= 0) return; const p = P(u); c.fig(w, { age, x: p.x, y: p.y + 10, s: p.s, face: 1, pose: 'stand', expr: 'happy', alpha: k, dy: (1 - k) * 30, turn: 0.4, look: [1, -0.3] }); });
          const p = P(0.24); const h = c.fig('hero', TEEN({ x: p.x, y: p.y + 10, s: p.s, face: 1, pose: 'hold_card', expr: 'worried', look: [0.3, 0.7] }));
          const hl = h.A.handL, hr = h.A.handR; GFX.book(c.g, (hl[0] + hr[0]) / 2, Math.min(hl[1], hr[1]) - 20, 0.45, { open: 1, color: '#7B5EA7' });
        } },
    ],
  });
})();
