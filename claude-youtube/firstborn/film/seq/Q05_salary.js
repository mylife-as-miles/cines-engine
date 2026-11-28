/* Q05 · THE FIRST SALARY ("You graduate" to "By 30")
   Cap and gown on the graduation stage, then the office. "First salary alert": the phone, full frame. "a champion": arms up, gold
   confetti; the bank app counts up the balance; "exactly four minutes": a 4:00 timer racing down while he dances. "Then the calls
   start": MUM calling; "My dear, I don't want to disturb you": the split-screen call, sweetly; his knowing look; then the
   disturbance arrives: calls and messages pop all round. The bills fly in one by one (SCHOOL FEES, RENT, HOSPITAL, then the "small
   thing", the biggest) until they bury him; they press into one; "the invoice is real": a giant invoice unrolls to the floor; "a
   budget": his empty wallet, a moth flying out. "the family bank": the hero behind the FAMILY BANK counter, the family queueing;
   three signs, one per phrase. "who is paying my own rent?": his own RENT DUE bill; "God will provide": Mum's hands raised; "And he
   does": Mum's phone pings; "keeps using your account": the transfers out of his account. "you do it": he taps send, rueful;
   "because you love them": a soft smile at the family photo. The sister crosses the graduation stage, he claps in the front row;
   he cries harder than she does; "dust in your eye", he points at it. */
(function () {
  'use strict';
  const S0 = FILM.W('you graduate');
  const { W, Wend } = FILM.from(S0);
  const { seg, pop, ease, lerp, walk, punch, nod, span } = FILM;
  const T = {
    start: S0, grad: W('graduate'), job: W('you get a job'), alert: W('first salary alert'), champion: W('you feel like a champion'), championW: W('champion'),
    open: W('you open your banking'), four: W('for exactly four'), happy: W('happy'), calls: W('then the calls start'),
    dear: W('my dear'), dearLine: span('my', 'you', FILM.W('my dear')), always: W('that is how it always'), disturb: W('they do not want to disturb'), arrives: W('arrives', { after: FILM.W('they do not want to disturb') }),
    fees: W('school fees'), rent: W('rent'), hospital: W('a hospital bill'), small: W('just a small thing'), black: W('some people call it'), tax: W('black tax'),
    invoice: W('whatever you call it'), invoiceW: W('invoice'), real: W('real'), budget: W('and nobody asked'), budgetW: W('budget'),
    congrats: W('congratulations'), bank: W('family bank'), interest: W('no interest'), collateral: W('no collateral'), care: W('customer care'),
    ownRent: W('you say but'), ownLine: span('but', 'rent', FILM.W('you say but')), god: W('and somebody says god'), provide: span('god', 'provide', FILM.W('and somebody says god')),
    does: W('and he does'), account: W('but somehow he keeps'), accountW: W('account'), funny: W('and the funny thing'), doIt: W('you do it', { after: FILM.W('and the funny thing') }),
    love: W('because you love them'), sister: W('when your younger sister'), walks: W('walks across'), stage: W('graduation stage'), paid: W('paid for'),
    cry: W('you will cry harder'), dust: W('even if you are pretending'), dustW: W('dust'), eye: W('eye'), end: FILM.W('by 30'),
  };
  const EYE = STAGE.EYE, DAY = { tod: 'day' };
  const KITGOWN = () => !!(POV && POV.OUTFITS && POV.OUTFITS.gown), KE = n => !!(POV && POV.EXPR && POV.EXPR[n]), KP = n => !!(POV && POV.POSES && POV.POSES[n]);
  // the gown and cap over a standing figure (until the kit dresses one)
  function gradOutfit(c, f, o) { o = o || {}; const hd = ART.head(f.who || 'hero', f), s = hd.r / 100; GFX.gown(c.g, hd.x, hd.y + hd.r * 1.05, s, o.gown); GFX.gradCap(c.g, hd.x, hd.y - hd.r * 0.85 - (o.lift || 0), s * 0.9, o.rot || -0.06); }
  // a bill flying in from off frame to its place on the pile (t0 when it lands)
  function flyBill(c, t, t0, x, y, rot, o) { if (t < t0 - 0.35) return; const k = ease.outCubic(seg(t, t0 - 0.35, t0)); const dx = (1 - k) * (x < 960 ? -1100 : 1100), dy = (1 - k) * -300; STAGE.bill(c, x + dx, y + dy, o.s || 1, Object.assign({ rot: rot * k + (1 - k) * 0.8 }, o)); }
  const BILLS = () => [[T.fees, 560, 330, -0.12, { title: 'SCHOOL FEES', amount: 180000, color: '#4E8FC4' }], [T.rent, 1360, 300, 0.1, { title: 'RENT', amount: 250000, color: '#E5534B' }],
    [T.hospital, 520, 760, 0.08, { title: 'HOSPITAL', amount: 95000, color: '#3E8A5A' }], [T.small, 1340, 720, -0.06, { title: 'A SMALL THING', amount: 400000, color: '#7B5EA7', s: 1.3, due: true }]];

  FILM.seq({
    id: 'Q05', title: 'The first salary', chapter: 'The first salary', from: T.start,
    sound(S) {
      S.bed('music', T.start, T.end, { mood: 'triumphant then comic, softening warm from "Because you love them"' });
      S.cue('cheer_crowd', T.grad, { x: 960 }); S.cue('typing', T.job + 0.2, { n: 6, x: 1100 }); S.cue('notify', T.alert, { x: 960 }); S.cue('cha_ching', T.championW, { x: 960 });
      S.cue('counter_tick', T.open + 0.4, { x: 960 }); S.cue('clock_fast', T.four + 0.2, { x: 500 }); S.cue('phone_ring', T.calls + 0.3, { x: 960 }); S.cue('whoosh', T.dear - 0.1);
      S.cue('notify', T.arrives, { x: 600 }); S.cue('notify', T.arrives + 0.35, { x: 1300 }); S.cue('notify', T.arrives + 0.7, { x: 900 });
      S.cue('paper_slap', T.fees, { x: 560 }); S.cue('paper_slap', T.rent, { x: 1360 }); S.cue('paper_slap', T.hospital, { x: 520 }); S.cue('thud_big', T.small + 0.1, { x: 1340 });
      S.cue('unroll', T.invoiceW, { x: 960 }); S.cue('moth', T.budgetW, { x: 960 }); S.cue('bank_bell', T.bank, { x: 960 });
      S.cue('sign_clack', T.interest, { x: 560 }); S.cue('sign_clack', T.collateral, { x: 960 }); S.cue('sign_clack', T.care, { x: 1360 });
      S.cue('choir_ahh', T.provide[0], { x: 960 }); S.cue('notify', T.does + 0.2, { x: 1100 }); S.cue('debit', T.accountW, { x: 960 }); S.cue('debit', T.accountW + 0.5, { x: 960 });
      S.cue('send', T.doIt, { x: 1100 }); S.cue('applause', T.walks, { x: 960 }); S.cue('sniff', T.cry + 0.6, { x: 960 });
    },
    shots: [
      { at: T.start, name: 'the graduation stage: the hero in cap and gown, his diploma; the cap tossed', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.05, x: 960, y: 520 },
        draw(c) {
          const t = c.t; STAGE.gradStage(c); const st = c.anchor('school', 'stage', [960, 760]);
          const h = c.fig('hero', { x: 1000, y: st.y + 10, s: 0.78, face: 1, pose: 'cheer', expr: 'happy', outfit: KITGOWN() ? 'gown' : undefined }); h.who = 'hero';
          if (!KITGOWN()) { const toss = seg(t, T.grad + 0.2, T.job); gradOutfit(c, h, { lift: Math.sin(toss * Math.PI) * 300, rot: -0.06 + toss * 6 }); }
          GFX.diploma(c.g, ART.hand('hero', h).x, ART.hand('hero', h).y, 0.7, -0.4);
          STAGE.chapterCard(c, T.start + 0.15, T.start + 1.95, 'THE FIRST SALARY', { x: 1450, y: 900, scale: 0.55 });
        } },
      { at: T.job, name: 'the office: his first job, the lanyard on', in: 'cut', push: { from: 1, to: 1.05 },
        draw(c) { const o = { clock: '9:05' }; c.set('office', o); const sa = STAGE.sitAt(c, 'office', 'chair'); c.fig('hero', Object.assign(sa, { face: -1, pose: 'type', expr: 'happy' })); c.setFront('office', Object.assign({ parts: ['desk'] }, o)); } },
      { at: T.alert, name: 'the phone, full frame: SALARY CREDITED', in: { type: 'slide', dir: 'up' },
        draw(c) { const t = c.t; STAGE.phone(c, { mode: 'lock', time: '9:41', date: 'Friday 28', notes: [{ icon: 'msg', title: 'MY BANK', body: 'Salary credited: ' + GFX.money(350000), time: 'now' }], notesK: seg(t, T.alert + 0.1, T.alert + 0.5), buzz: t < T.alert + 0.6 ? 1 : 0 }); } },
      { at: T.champion, name: '"a champion": arms up in the office, gold confetti', in: 'cut', push: { from: 1, to: 1.08, x: 960, y: 480 },
        draw(c) {
          const t = c.t; c.set('office', {}); c.fig('hero', { x: 960, y: 962, s: 1.08, face: 1, pose: 'cheer', expr: 'happy', dy: -Math.abs(Math.sin(t * 6)) * 16 });
          const R = FILM.rng('conf'); for (let i = 0; i < 40; i++) { const x = R() * 1920, sp = 200 + R() * 200, y = -40 + ((t - T.champion) * sp + R() * 300) % 1100; c.g.save(); c.g.translate(x, y); c.g.rotate(t * 3 + i); c.g.fillStyle = ['#F4BF54', '#F5A454', '#FFE38A'][i % 3]; c.g.fillRect(-9, -5, 18, 10); c.g.restore(); }
        } },
      { at: T.open, name: 'the bank app: the balance counts up; SALARY +', in: 'cut',
        draw(c) { const t = c.t, k = ease.outCubic(seg(t, T.open + 0.2, T.open + 1.0)); STAGE.bankPhone(c, { balance: 350000 * k, balanceK: seg(t, T.open + 0.9, T.open + 1.2), title: 'Salary credited', amount: 350000, creditK: seg(t, T.open + 0.1, T.open + 0.5), rows: [] }); } },
      { at: T.four, name: '"exactly four minutes": a 4:00 timer races down while he dances', in: 'cut', push: { from: 1, to: 1.05 },
        draw(c) {
          const t = c.t; c.set('office', {}); const sec = Math.max(0, 240 * (1 - seg(t, T.four + 0.3, T.calls - 0.1)));
          c.fig('hero', { x: 1160, y: 962, s: 1.05, face: -1, pose: Math.floor(t * 2.5) % 2 ? 'peace' : 'cheer', expr: 'happy', dy: -Math.abs(Math.sin(t * 5)) * 12 });
          GFX.timer(c.g, 520, 480, 1.4 + 0.05 * Math.sin(t * 8), sec, { color: sec < 40 ? '#E5534B' : '#F5A454' });
        } },
      { at: T.calls, name: '"Then the calls start": MUM calling', in: 'cut',
        draw(c) { const t = c.t; STAGE.callPhone(c, { contact: 'MUM', status: 'incoming call', avatarColor: '#E2A33B', t, buzz: 0.6 + 0.4 * Math.sin(t * 9) }); } },
      { at: T.dear, name: 'the call: "My dear, I don\'t want to disturb you", sweetly', in: 'cut',
        draw(c) {
          const t = c.t;
          STAGE.call(c, (cc, r) => { STAGE.fit(cc, r, { x: 960, y: 560, zoom: 1.25 }); cc.set('home', DAY); cc.fig('mum', { x: 960, y: 990, s: 1, face: 1, pose: 'hold_phone', mode: 'ear', expr: KE('sweet') ? 'sweet' : 'happy', talk: T.dearLine, turn: 0.3, nod: 0.1 * Math.sin(t * 3) }); },
            (cc, r) => { STAGE.fit(cc, r, { x: 900, y: 560, zoom: 1.25 }); cc.set('office', {}); cc.fig('hero', { x: 900, y: 962, s: 1, face: -1, pose: 'hold_phone', mode: 'ear', expr: 'happy', turn: 0.3 }); },
            { k: seg(t, T.dear, T.dear + 0.5) });
        } },
      { at: T.always, name: '"That is how it always starts": his knowing look at us, phone at his ear', in: 'cut', push: { from: 1.1, to: 1.2, x: 960, y: 400 },
        draw(c) { c.set('office', {}); c.fig('hero', { x: 960, y: 962, s: 1.1, face: 1, pose: 'hold_phone', mode: 'ear', expr: 'firm', turn: 0, look: [0, 0], faceOver: { browL: { lift: 0.12, tilt: 0, arch: 0.34 } } }); } },
      { at: T.disturb, name: 'then the disturbance arrives: calls and messages pop up all around him', in: 'cut', push: { from: 1, to: 1.06 },
        draw(c) {
          const t = c.t; c.set('office', {}); c.fig('hero', { x: 960, y: 962, s: 1.05, face: 1, pose: 'hold_phone', mode: 'front', expr: t > T.arrives ? 'scared' : 'neutral', look: [0.3, 0.6] });
          [[500, 300, 'call', '#77CC81'], [1420, 280, 'chat'], [380, 620, 'mail'], [1560, 600, 'call', '#77CC81'], [700, 160, 'chat'], [1240, 140, 'call', '#77CC81']].forEach(([x, y, k, bg], i) => STAGE.notify(c, x, y, T.arrives + i * 0.22, k, { s: 1.6, bg, anim: 'drop' }));
        } },
      { at: T.fees, name: 'the bills fly in one by one: SCHOOL FEES, RENT, HOSPITAL, then the "small thing", the biggest', in: 'cut', push: { from: 1, to: 1.04 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const n = BILLS().filter(b => t >= b[0]).length;
          const h = c.fig('hero', { x: 960, y: 1080 + 40 * n, s: 1.3, face: 1, pose: 'stand', expr: n >= 3 ? 'scared' : 'worried', turn: 0, look: [Math.sin(t * 2) * 0.6, -0.3] });
          BILLS().forEach(([t0, x, y, rot, o]) => { if (t > t0) c.impact(t0, 0.15, 5); flyBill(c, t, t0, x, y, rot, o); });
        } },
      { at: T.black, name: 'the bills press together into one tall pile', in: 'cut', push: { from: 1.02, to: 1.08, x: 960, y: 560 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const k = ease.inOutCubic(seg(t, T.black, T.tax + 0.4));
          c.fig('hero', { x: 1360, y: 1000, s: 1.05, face: -1, pose: 'shrug', expr: 'worried', turn: 0.5, look: [1, -0.4] });
          BILLS().forEach(([t0, x, y, rot, o], i) => STAGE.bill(c, lerp(x, 760, k), lerp(y, 860 - i * 150, k), lerp(o.s || 1, 0.9, k), Object.assign({}, o, { rot: lerp(rot, (i % 2 ? 0.04 : -0.04), k), s: undefined })));
        } },
      { at: T.invoice, name: '"the invoice is real": a giant invoice unrolls to the floor', in: 'cut', push: { from: 1, to: 1.05, x: 960, y: 400 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const len = 160 + 1000 * ease.outCubic(seg(t, T.invoiceW - 0.1, T.real + 0.6));
          STAGE.invoice(c, 760, 540, 1.0, { len, k: seg(t, T.invoice, T.invoiceW + 0.2), items: [{ label: 'School fees', amount: 180000 }, { label: 'Rent', amount: 250000 }, { label: 'Hospital', amount: 95000 }, { label: 'A small thing', amount: 400000 }],
            total: { label: 'TOTAL', amount: 925000 }, stamp: 'DUE', stampK: seg(t, T.real, T.real + 0.3) });
          c.fig('hero', { x: 1450, y: 1000, s: 1.05, face: -1, pose: 'hand_mouth', expr: 'surprised', turn: 0.4, look: [1, -0.6 + 0.8 * seg(t, T.invoiceW, T.real + 0.6)] });
        } },
      { at: T.budget, name: '"nobody asked if you have a budget": his empty wallet, a moth flies out', in: 'cut', push: { from: 1.05, to: 1.15, x: 960, y: 440 },
        draw(c) {
          const t = c.t; c.set('plain', {}); const h = c.fig('hero', { x: 960, y: 1000, s: 1.2, face: 1, pose: 'carry', expr: 'sad', look: [0, 0.8] });
          const hl = h.A.handL, hr = h.A.handR; GFX.wallet(c.g, (hl[0] + hr[0]) / 2, Math.min(hl[1], hr[1]) - 40, 1.0, t > T.budgetW - 0.4 ? t - (T.budgetW - 0.4) : 0);
        } },
      { at: T.congrats, name: '"the family bank": the hero behind the FAMILY BANK counter, the family queueing', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.04 },
        draw(c) {
          const t = c.t; c.set('bankCounter', {}); const tl = c.anchor('bankCounter', 'teller', [960, 900, 0.95]);
          const Q = ['mum', 'dad', 'auntie', 'uncle', 'brother'];
          Q.slice().reverse().forEach((w, j) => { const i = Q.length - 1 - j, q = c.anchor('bankCounter', 'q' + (i + 1), [1060 - 230 * i, 985]); c.fig(w, { x: q.x, y: q.y, s: q.s || 1, face: 1, age: w === 'brother' ? 'teen' : undefined, pose: i === 0 ? 'hold_card' : 'stand', expr: 'happy', turn: 0.3, look: [1, -0.1], dy: -Math.abs(Math.sin(t * 2 + i)) * 5 }); });
          c.fig('hero', { x: tl.x, y: tl.y, s: tl.s, face: -1, pose: 'hands_clasped', expr: 'happy', turn: 0.4, look: [1, 0] });
          c.setFront('bankCounter', {}); if (!ART.hasSet('bankCounter')) { GFX.rr(c.g, 300, 640, 1320, 50, 8); GFX.inked(c.g, '#C98E5A', 6); GFX.rr(c.g, 320, 690, 1280, 295, 0); GFX.inked(c.g, '#A8723F', 5); }
          if (ART.hasSet('bankCounter')) STAGE.tag(c, 1300, 150, 'FAMILY BANK', { t0: T.bank, size: 60, fill: '#3A8594', color: '#FFFFFF', anim: 'slide' });
        } },
      { at: T.interest, name: 'three signs on the counter: 0% INTEREST, NO COLLATERAL, CUSTOMER CARE: CLOSED', in: 'cut', push: { from: 1, to: 1.05, x: 960, y: 560 },
        draw(c) {
          const t = c.t; c.camera({ x: 1340, y: 560, zoom: 1.3 }); c.set('bankCounter', {}); const tl = c.anchor('bankCounter', 'teller', [960, 900, 0.95]);
          c.fig('hero', { x: tl.x, y: tl.y, s: tl.s, face: -1, pose: 'shrug', expr: 'neutral', turn: 0, look: [0, 0] });
          const SIGNS = [[T.interest, '0% INTEREST'], [T.collateral, 'NO COLLATERAL'], [T.care, 'CUSTOMER CARE: CLOSED']];
          if (ART.hasSet('bankCounter')) c.setFront('bankCounter', { signs: SIGNS.map(([t0, text]) => ({ text, k: seg(t, t0, t0 + 0.35) })) });
          else { GFX.rr(c.g, 300, 640, 1320, 50, 8); GFX.inked(c.g, '#C98E5A', 6); GFX.rr(c.g, 320, 690, 1280, 295, 0); GFX.inked(c.g, '#A8723F', 5);
            SIGNS.forEach(([t0, label], i) => GFX.at(c.g, [520, 960, 1400][i], i === 1 ? 830 : 770, pop(t, t0, 0.3), () => STAGE.pill(c, 0, 0, label, { size: i === 2 ? 44 : 50, fill: ['#3E8A5A', '#4E8FC4', '#E5534B'][i], color: '#FFFFFF' }))); }
        } },
      { at: T.ownRent, name: '"who is paying my own rent?": he holds up his own RENT DUE bill', in: 'cut', push: { from: 1, to: 1.08, x: 960, y: 440 },
        draw(c) {
          const t = c.t; c.set('office', {}); const h = c.fig('hero', { x: 820, y: 962, s: 1.1, face: 1, pose: 'hold_card', expr: 'worried', talk: T.ownLine, turn: 0.1, look: [0, 0] });
          const hl = h.A.handL, hr = h.A.handR; STAGE.bill(c, (hl[0] + hr[0]) / 2 + 60, Math.min(hl[1], hr[1]) - 100, 0.8, { title: 'MY RENT', amount: 250000, color: '#E5534B', due: true, rot: 0.05 });
        } },
      { at: T.god, name: '"God will provide": Mum, hands raised, in a warm glow', in: 'cut', push: { from: 1, to: 1.08, x: 960, y: 440 },
        draw(c) {
          const t = c.t; c.set('home', DAY); GFX.spotlight(c.g, 960, 990, 700, seg(t, T.provide[0], T.provide[0] + 0.5));
          c.fig('mum', { x: 960, y: 990, s: 1.08, face: 1, pose: KP('praise') ? 'praise' : 'arms_up', expr: KE('serene') ? 'serene' : 'happy', talk: T.provide, turn: 0, look: [0, -0.6] });
        } },
      { at: T.does, name: '"And he does": a transfer pings on Mum\'s phone; she beams', in: 'cut', push: { from: 1.05, to: 1.12, x: 960, y: 440 },
        draw(c) {
          const t = c.t; c.set('home', DAY); const m = c.fig('mum', { x: 900, y: 990, s: 1.08, face: 1, pose: 'hold_phone', mode: 'front', expr: 'happy', look: [0.4, 0.6] });
          const hn = ART.hand('mum', m); STAGE.notify(c, hn.x + 100, hn.y - 160, T.does + 0.2, 'chat', { s: 1.8, anim: 'drop' });
          GFX.at(c.g, hn.x + 330, hn.y - 230, pop(t, T.does + 0.3, 0.3), () => STAGE.pill(c, 0, 0, '+' + GFX.money(50000), { size: 50, fill: '#77CC81', color: '#FFFFFF' }));
        } },
      { at: T.account, name: '"he keeps using your account": transfers out of his account, one after another', in: { type: 'slide', dir: 'up' },
        draw(c) {
          const t = c.t, rows = [{ label: 'TO MUM', amount: -50000, t0: T.accountW - 0.2 }, { label: 'TO AUNTIE', amount: -20000, t0: T.accountW + 0.3 }, { label: 'TO UNCLE', amount: -35000, t0: T.accountW + 0.8 }];
          const out = rows.reduce((s, r) => s + (t > r.t0 ? -r.amount * seg(t, r.t0, r.t0 + 0.4) : 0), 0);
          STAGE.bankPhone(c, { balance: 245000 - out, creditK: 0, rows: rows.map(r => ({ label: r.label, amount: r.amount, k: seg(t, r.t0, r.t0 + 0.35) })) });
        } },
      { at: T.funny, name: '"you do it": he taps send, a rueful smile', in: 'cut', push: { from: 1.05, to: 1.12, x: 960, y: 440 },
        draw(c) {
          const t = c.t; c.set('home', { tod: 'evening' }); const tint = ART.tintFor(c, 'home');
          const h = c.fig('hero', { x: 960, y: 990, s: 1.1, face: 1, pose: 'hold_phone', mode: 'front', expr: t > T.doIt ? 'happy' : 'neutral', look: [0.3, 0.7], tint, nod: t > T.doIt && t < T.doIt + 0.3 ? 0.4 : 0.2 });
          if (t > T.doIt) { const hn = ART.hand('hero', h); STAGE.notify(c, hn.x + 80, hn.y - 150, T.doIt + 0.05, 'chat', { s: 1.4, anim: 'drop' }); }
        } },
      { at: T.love, name: '"because you love them": a soft smile at the family photo on the wall', in: 'fade', push: { from: 1, to: 1.1, x: 935, y: 360 },
        draw(c) {
          const t = c.t; c.set('home', { tod: 'evening' }); const tint = ART.tintFor(c, 'home');
          c.fig('hero', { x: 1250, y: 990, s: 1.05, face: -1, pose: 'hands_clasped', expr: 'happy', turn: 0.6, look: [1, -0.8], tint });
        } },
      { at: T.sister, name: 'the sister crosses the graduation stage; the hero claps in the front row', in: { type: 'wipe', dir: 'right' }, push: { from: 1, to: 1.05, x: 960, y: 560 },
        draw(c) {
          const t = c.t; STAGE.gradStage(c); const st = c.anchor('school', 'stage', [960, 760]);
          const wk = walk(t, T.walks, T.paid + 0.6, 420, 1000, { s: 0.72 });
          const sis = c.fig('sister', { age: 'grown', x: wk.x, y: st.y + 10, s: 0.72, face: 1, pose: wk.moving ? 'walk' : 'wave', walk: wk.walk, phase: wk.moving ? undefined : t * 1.4, expr: 'happy', outfit: KITGOWN() ? 'gown' : undefined }); sis.who = 'sister';
          if (!KITGOWN()) gradOutfit(c, sis, { gown: '#3E3A6E' });
          c.fig('hero', { x: 1560, y: 1300, s: 1.15, face: -1, pose: 'clap', expr: 'happy', turn: 0.6, look: [0.8, -1] });
        } },
      { at: T.cry, name: 'he cries harder than she does, still clapping', in: 'cut', push: { from: 1.1, to: 1.18, x: 1300, y: 420 },
        draw(c) { const t = c.t; STAGE.gradStage(c); const h = c.fig('hero', { x: 1380, y: 1080, s: 1.25, face: -1, pose: 'clap', expr: KE('happy_cry') ? 'happy_cry' : 'sad', turn: 0.3, look: [0.5, -0.8] }); GFX.tears(c.g, ART.head('hero', h), t, KE('happy_cry') ? 0.6 : 1); } },
      { at: T.dust, name: '"dust in your eye": he wipes it and points at it, deadpan', in: 'cut', push: { from: 1.1, to: 1.16, x: 960, y: 420 },
        draw(c) {
          const t = c.t; STAGE.gradStage(c);
          const wipe = t < T.dustW + 0.1 && KP('wipe_eye');
          const h = c.fig('hero', { x: 1380, y: 1080, s: 1.25, face: -1, pose: wipe ? 'wipe_eye' : 'point', expr: t > T.dustW ? 'firm' : (KE('happy_cry') ? 'happy_cry' : 'sad'), turn: 0, look: [0, 0], override: wipe ? null : { armR: { ik: [40, -390], bend: 1, ul: 0.6, hand: 'point', flip: 1, hrot: 2.4 } } });
          const hd = ART.head('hero', h); if (t < T.dustW + 0.6) GFX.tears(c.g, hd, t, 1 - seg(t, T.dustW, T.dustW + 0.6));
          if (t > T.dustW) { c.g.fillStyle = 'rgba(200,170,120,.8)'; for (let i = 0; i < 9; i++) { const ph = ((t - T.dustW) * 0.4 + i * 0.11) % 1; c.g.beginPath(); c.g.arc(hd.x - hd.r * 1.4 + Math.sin(i * 3 + t) * 60, hd.y - hd.r + ph * 200, 4, 0, Math.PI * 2); c.g.fill(); } }
        } },
    ],
  });
})();
