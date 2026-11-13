/* ONE TOO MANY — Q12 "TWO."   EXT. SCOTT'S BACK YARD - LATER.   Lines L237-L249, actions A165-A176, FADE OUT, THE END.
   Sets: yard ('house', 'scott', 'ending', 'hands') and title (endcard). Letterbox 1.78 throughout.

   The beats (local seconds, see T):
     0      LATER. A hard cut in from Q11's yard to the F02 framing: his face in the phone's cold light (one cold light in all that fire),
            the tinnitus from Q11 dying away; at 2.9 his thumb starts to hover over the keys. (His place on the lawn is set up by the house
            shot at 42.3.)
     7.3    the KEYPAD insert: his thumb shakes, 9-9-8 (wrong, cleared), 9-6 (wrong, cleared), 9-9-9, call.
     16.35  the phone at his LEFT ear (Q01's F02 framing and look: socks, torn far sleeve, blisters), the ringback, the pick-up: the call
            timer starts at 00:00:00 (small and dim, above the Dispatcher's band).
     20.75  L237 (48 px on a solid ink strip, as Q01); his address as redaction bars beside his head (never invented words); her asking
            him to stay on the line, also redacted; L238-L240 (L240 is cut on the cut to the house). His answers are warm ivory, 52 px,
            in the sky just in front of his face.
     42.3   close and low on the house over him: the upstairs window collapses inward (the sash falls in, the opening goes black, the fire
            surges out); he flinches. L241 in the sky by the fence. 46.8: L242-L244, tighter on him.
     57.15  the COUNT (in his head, so the band is gone and the call's time slips unseen): one insert per friend (Deena's big wire hoop with
            its sprung ear-wire, Christof's biscuit, Angelo's dropped cigarette, Kay's lip-marked glass, Marina's small heavy ring with its
            stone and glint), first in order 1-5, then shuffling out of order and faster, the names orbiting in their own faces, the pings
            souring; and one count too many: an empty insert, '6' (brighter than the five, doubling), 0.75 s, its wrong ping from his
            right on the Extra's bus against near silence (the drone breaks off for it).
     65.0   the hit; the band is back, the timer racing from 00:00:36 (where he left it) to 00:02:25 in 0.6 s: the time he lost.
            L245 (stacked on three lines in the sky in front of his face).
     71.6   behind him (F13's angle): L246; he hears her and doesn't believe her (77.0 the slow shake).
     79.2   profile close: L247; 81.75 he wipes his face on his sleeve (the right forearm comes forward, the sleeve across his eyes).
     84.3   behind him again: the world drops out, the drone with it (gone by 85.6); 86.0 'Me.' (160 px ash, no animation, centred in the
            sky, silent); only his ear and his heart. 87.9 something warm closes round his free hand on the grass (the ember knockout); a
            second heartbeat drifts into lockstep;
     91.5   his shoulders drop and 'Two.' replaces 'Me.' on that exact frame (160 px tungsten: his own colour back). unison in.
     93.5   he lowers the phone a little (the timer fades).  94.9: THEIR HANDS ('hands', looking down onto the grass: his fingers closed
            over the light). 101.3: cut wide (the whole house, him small at the right): no second figure, only a hand-shaped light on the
            grass at his right; everything dims to ink except the ember hand. FADE OUT.
     111.5  the end card: two marks (the second cut through the paper), ONE TOO MANY, the credit, black.
   Continuity: the roof stays on and the upstairs curtain still hangs inside (Q01, the same call ~21 s after 'Two.', lifts and burns it);
   the collapsed window (upstairs right) stays collapsed; the timer reads 00:02:51 on 'Two.' and has faded by 00:02:54 (Q01: 00:03:12).
   Local additions (nothing shared was edited): the keypad insert, the five object inserts, Scott seen from behind (ported from F13's source
   and made to move: tension, the wipe, the drop, the lowered phone, the warmth), Q01's sock / sleeve-flap / blister helpers (ported), the
   band strip (as Q01), the window-collapse overlay, the lowered phone in the wide, the redaction bars, a word-by-word Dispatcher draw, and
   three sound cues (Q12.siren, Q12.pickup, Q12.creak). Mix: the whole sequence is trimmed by gain -8 dB. */
(function () {
  'use strict';
  const O = window.OTM, { C, W, H, S, mix, rgba } = O;
  const FL = window.FILM, E = FL.ease;
  const Y = () => window.SETS.yard;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, u) => a + (b - a) * u, sat = v => clamp(v, 0, 1);
  const seg = FL.seg, twos = FL.twos;
  const smooth = u => { u = sat(u); return u * u * (3 - 2 * u); };
  const TAU = Math.PI * 2;

  // ======================================================================= timeline (sequence-local seconds)
  const T = {
    phoneUp: 2.9, face1: 4.9, padA: 7.3, face2: 11.5, padB: 12.5, ring: 15.85, ear: 16.35, connect: 20.25,
    L237: 20.75, addrShot: 25.45, addr: 25.7, stay: 29.9, injured: 32.1, L238: 32.3, L239: 34.8, inside: 37.5, L240: 37.7, look: 40.3,
    house2: 42.3, collapse: 43.2, L241: 45.15, near: 46.8, L242: 47.0, L243: 49.6, L244: 52.8,
    mont0: 57.15, mont1: 65.0, L245: 65.2, behind: 71.6, L246: 71.9, shake: 77.0,
    prof: 79.2, L247: 79.5, wipe: 81.75, climax: 84.3, L248: 86.0, warm: 87.9, two: 91.5, lower: 93.5,
    hands: 94.9, wide: 101.3, yardEnd: 111.5, card: 111.5, cardLead: 0.5, dur: 119.6,
  };
  // the Dispatcher's band (as Q01): 48 px type on a solid ink strip (her #D7E7F3 on ink is ~15:1), the call timer small and dim above it
  const BAND_Y = 184, DISP_SIZE = 48, STRIP = { top: BAND_Y - 52, h: 72, pad: 34 };
  const TIMER_Y = STRIP.top - 12, TIMER = { size: 22, alpha: 0.5, raceAlpha: 0.8 };
  // Scott's answers in the call: warm ivory (his yard ash, brightened), 52 px, in the sky just in front of his face. Positions are per
  // shot (the F02 framings differ): x is the right edge, flush toward his face; y the baseline. 'Me.' and 'Two.' keep their own treatment.
  const IVORY = mix(C.ash, C.lighterCream, 0.8), SC_SIZE = 52;
  const POS_ADDR = [700, 420];             // his address (bars), in the close F02 at 25.45 (head ~[860, 440])
  const POS_L239 = [590, 368];             // 'Yeah. I-- yeah.', F02 at zoom 1.0 (head ~[735, 390]; he bows into it)
  const POS_L243 = [700, 420];             // 'Five. I had five over.', close F02 (head ~[870, 420])
  const POS_L245 = [650, 326, 72];         // 'I don't know...' block: right edge of its longest line (before the cut dash), first baseline, line step
  const POS_ME = [1040, 330];              // 'Me.' and 'Two.': centred in the night sky (clear in the held shot, the hands and the wide)

  // ======================================================================= the yard's state
  // continuity with Q11 and Q01 (the same night; Q01 is this call ~21 s after 'Two.'): the roof is still on (Q01 ROOF = 0), the upstairs
  // curtain still hangs inside (Q01 lifts it and burns it away); the strobes leak through the fence; the collapsed window stays collapsed
  const YARD = { curtain: 0.02, roof: 0, strobe: 0.5, windowCollapse: T.collapse, collapseWin: 2 };
  const dimAt = lt => 0.965 * E.inOutSine(seg(lt, T.two + 0.5, T.yardEnd - 0.4));
  const yst = (lt, o) => Object.assign({}, YARD, { dim: dimAt(lt) }, o || {});

  // ======================================================================= the call timer (the Dispatcher's band)
  // It does not run until the call connects. It runs at 1x, except while he counts: the count is in his head and the band is gone; when
  // it comes back (the hit at 65.0) the digits race, visibly, from where he left them (00:00:36) to 00:02:25 in 0.6 s: the time he lost.
  // From there it runs at 1x again and reads 00:02:51 on 'Two.'
  const TWO_SECS = 171.4, RACE = TWO_SECS - (T.two - T.connect), LEFT = T.mont0 - T.connect;
  const RACE_T = [T.mont1, T.mont1 + 0.6];
  const raceK = lt => E.inOutCubic(seg(lt, RACE_T[0], RACE_T[1]));
  const callSecs = lt => lt < T.mont1 ? lt - T.connect : lerp(LEFT, (lt - T.connect) + RACE, raceK(lt));
  const fmt = s => { s = Math.max(0, Math.floor(s + 1e-6)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(2, '0')).join(':'); };
  function drawTimer(c, lt) {
    if (lt < T.connect) return; const a = 1 - seg(lt, T.lower + 0.2, T.lower + 1.1); if (a <= 0) return;
    if (lt >= T.mont0 && lt < T.mont1) return;         // the count is in his head, not on the phone: the band is gone while he counts
    const g = c.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const race = seg(lt, RACE_T[0], RACE_T[0] + 0.06) * (1 - seg(lt, RACE_T[1] - 0.1, RACE_T[1] + 0.08));     // the jitter while it races
    const jx = race * 3 * FL.wob(lt, 13, 5), jy = race * 2 * FL.wob(lt, 13, 6);
    O.text(g, fmt(callSecs(lt)), W / 2 + jx, TIMER_Y + jy, { family: 'Barlow Condensed', weight: 600, size: TIMER.size, color: C.phoneWhite, tracking: 3, align: 'center',
      alpha: lerp(TIMER.alpha, TIMER.raceAlpha, race) * a });
    g.restore();
  }
  // the Dispatcher's line arrives word by word at 2.8 words a second, in the fixed band (its text always comes from the script)
  // as Q01: the band is a solid ink strip (a cut-paper edge), sized to the whole line, so neither the fire nor the embers (nor their
  // bloom) ever come through her words
  function bandPlate(c, w, alpha) {
    const k = Math.ceil((w + 2 * STRIP.pad) / 16) * 16, x0 = Math.round(W / 2 - k / 2);
    const cv = c.cache('Q12.strip.' + k, g => { g.fillStyle = C.ink; g.fill(S().rect(8, 8, k, STRIP.h).path(0.5, 17)); }, k + 16, STRIP.h + 16);
    const g = c.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha == null ? 1 : alpha; g.drawImage(cv, x0 - 8, STRIP.top - 8); g.restore();
    const e = c.em; e.save(); e.setTransform(0.25, 0, 0, 0.25, 0, 0); e.globalCompositeOperation = 'destination-out'; e.globalAlpha = alpha == null ? 1 : alpha;
    e.fillRect(x0 - 6, STRIP.top - 6, k + 12, STRIP.h + 12); e.restore();
  }
  function dispDraw(c, s, o) {
    const text = s.T.text, words = text.split(' ');
    const n = s.phase === 'in' ? clamp(Math.ceil(words.length * s.p - 1e-6), 1, words.length) : words.length;
    const F = Object.assign({}, O.FACE.dispatcher, { size: DISP_SIZE }); const g = c.g; g.save(); g.font = O.font(F); g.letterSpacing = '0px'; const w = g.measureText(text).width; g.restore();
    bandPlate(c, w, o.alpha);
    O.say(g, 'dispatcher', words.slice(0, n).join(' '), W / 2 - w / 2, BAND_Y, { align: 'left', bandY: BAND_Y, size: DISP_SIZE, alpha: o.alpha });
  }
  // redaction bars: speech we hear but are not given (his address; her asking him to stay on the line). Never words.
  function barsLayout(spec, em, rate) {
    let t = 0, x = 0; const out = [];
    spec.forEach(b => { const w = b.n * 0.52 * em; out.push({ x, w, t0: t, t1: t + rate(b) }); t += rate(b) + (b.pause || 0); x += w + 0.32 * em; });
    return { bars: out, typed: t, width: x - 0.32 * em };
  }
  const ADDR = barsLayout([{ n: 2, pause: 0.6 }, { n: 5 }, { n: 4, pause: 0.8 }, { n: 6 }], SC_SIZE, b => b.n * 0.035 + 0.035);
  const STAY = barsLayout([{ n: 1 }, { n: 4 }, { n: 3 }, { n: 2 }, { n: 4 }, { n: 2 }, { n: 3 }, { n: 4 }], DISP_SIZE, () => 1 / 2.8);
  const ADDR_HOLD = 1.2, STAY_HOLD = 1.0;
  function drawAddr(c, lt) {
    const u = lt - T.addr; if (u < 0) return; const L = ADDR, del = L.typed + ADDR_HOLD, dd = 0.45; if (u > del + dd) return;
    const g = c.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const x0 = POS_ADDR[0] - L.width, y = POS_ADDR[1], em = SC_SIZE; let endX = x0;
    const keep = u > del ? 1 - (u - del) / dd : 1;                 // he deletes it backwards, as he deletes everything
    g.fillStyle = IVORY; g.globalAlpha = 0.85; const r = O.rng('addr');       // his ivory, a touch down: solid bars outweigh his letters
    L.bars.forEach(b => {
      const p = sat((u - b.t0) / (b.t1 - b.t0)), right = b.x + b.w * p, lim = keep * L.width;
      const w2 = Math.min(right, lim) - b.x; const jy = (r() - 0.5) * 3; if (w2 <= 0) return;
      g.fillRect(x0 + b.x, y - em * 0.7 + jy, w2, em * 0.78); endX = x0 + b.x + w2;
    });
    const typing = L.bars.some(b => u >= b.t0 && u < b.t1);
    if (u < del && (typing || Math.floor(u / 0.53) % 2 === 0)) g.fillRect(endX + em * 0.12, y - em * 0.78, Math.max(2, em * 0.045), em * 0.92);
    g.restore();
  }
  const _pool = {};
  function pooled(w, h) { const k = w + 'x' + h; return _pool[k] || (_pool[k] = O.makeCanvas(w, h)); }
  function drawStay(c, lt) {
    const u = lt - T.stay; if (u < 0 || u > STAY.typed + STAY_HOLD || lt >= T.L238) return;     // her next question cuts it off (one band, one line)
    bandPlate(c, STAY.width, 1);
    const g = c.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const em = DISP_SIZE, x0 = W / 2 - STAY.width / 2, y = BAND_Y;
    const tmp = pooled(Math.ceil(STAY.width) + 20, 60); const tg = tmp.getContext('2d'); tg.clearRect(0, 0, tmp.width, tmp.height); tg.fillStyle = C.tDispatcher;
    STAY.bars.forEach(b => { if (u >= b.t0) tg.fillRect(10 + b.x, 14, b.w, em * 0.66); });
    const r = O.rng('stay'); g.globalAlpha = 0.72;
    for (let sy = 0; sy < tmp.height; sy += 3) { const off = r() < 0.14 ? (r() - 0.5) * 6 : 0; g.drawImage(tmp, 0, sy, tmp.width, 3, x0 - 10 + off, y - em * 0.84 + sy, tmp.width, 3); }
    g.restore();
  }
  // L245, too long for one line in the sky in front of his face: the same words, stacked on three lines as they come (typed, then deleted,
  // in order), set flush left so the longest line ends just short of his face (right = that line's right edge)
  function splitScott(parts, right, y0, dy) {
    let x0 = null;
    return function (c, s, o) {
      if (x0 == null) {
        const st = o.stress || 0, F = Object.assign({}, O.FACE.scott, { size: o.size || SC_SIZE, weight: st > 0.5 ? 700 : 500 }); F.tracking = -F.size * 0.04 * st;
        x0 = right - Math.max.apply(null, parts.map(p => O.layout(c.g, p.replace(/--$/, ''), F).width));
      }
      const shown = Math.round(parts.reduce((a, p) => a + p.length, 0) * s.p); let k = 0;
      parts.forEach((p, i) => {
        const n = clamp(shown - k, 0, p.length); k += p.length; if (n <= 0) return;
        const last = n < p.length || i === parts.length - 1 || shown <= k;
        O.say(c.g, 'scott', p, x0, y0 + i * dy, Object.assign({}, o, { align: 'left', p: n / p.length, caret: last && o.caret, seed: 3 + i }));
      });
    };
  }
  // 'Two.': never deleted; it dims with the world, more slowly than the light goes, and is gone with the fade
  function twoDraw(c, s, o) {
    const k = 1 - 0.7 * E.inQuad(seg(c.lt, T.two + 6, T.yardEnd - 0.3));
    O.say(c.g, 'scott', s.T.text, POS_ME[0], POS_ME[1], Object.assign({}, o, { p: 1, caret: false, align: 'center', size: 160, alpha: o.alpha * k }));
  }

  // ======================================================================= Scott (RIG) in the F02 framing ('scott' view) and the house wide
  function grassPose(add) { return Object.assign(RIG.POSES.grass(), add || {}); }
  // the rim light is sampled on twos (the figure animates on twos), so RIG's sprite cache holds for the second frame of each pair
  // (no falloff in the F02 framing, as Q01 draws him there: the fire is far and the rim even; it also halves a sprite miss at this scale)
  function drawRig(c, F, view, lt, st, pt, extra, lq) {
    const L = Y().lightAt(view, lq != null ? lq : twos(lt), st, pt);
    RIG.draw(c.g, F, Object.assign({ light: { x: L.x, y: L.y }, color: L.color, w: Math.round(L.rimW * 4) / 4, falloff: view !== 'scott', em: c.em }, extra || {}));
    return L;
  }
  // breathing he can't control: fast and shallow, on twos; tension (units) holds the chest and shoulders up
  const breathU = (lt, rate, amp, tension) => (tension || 0) + amp * (0.5 - 0.5 * Math.cos(TAU * rate * twos(lt)));
  // where his free (far, right) hand is planted on the grass and where his head is, from a neutral build (cached)
  let _plant = null;
  function plant() {
    if (_plant) return _plant; const a = Y().anchors.scott.seat;
    const F = RIG.figure('scott', { x: a.hip[0], y: a.ground, scale: a.scale, facing: -1, pose: grassPose(), hold: { N: 'phone' } });
    return (_plant = { wrist: F.joints.wristF.slice(), head: F.joints.head.slice() });
  }
  // ---- Scott's look in the F02 framing, ported from Q01 (the same call, minutes later) so he matches it exactly: his socks, the far
  // sleeve torn at the elbow with its flap stirring in the heat, the blisters on that forearm, and the paper occluding the bloom
  // the far forearm's outer (lit) edge, found on the figure's own cut path: points along elbow -> wrist, pushed out to the edge
  const _probe = O.makeCanvas(2, 2).getContext('2d'), _edges = new WeakMap();
  function farEdge(F) {
    let E = _edges.get(F); if (E) return E;
    const j = F.joints, a = j.elbowF, b = j.wristF, p = RIG.path(F), sc = F.scale;
    const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]) || 1, u = [d[0] / L, d[1] / L], n = [u[1], -u[0]];   // n: away from the body, toward the fire
    const at = k => { const q = [a[0] + d[0] * k, a[1] + d[1] * k]; let lo = 0, hi = 0.8 * sc;
      for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (_probe.isPointInPath(p, q[0] + n[0] * m, q[1] + n[1] * m)) lo = m; else hi = m; }
      return [q[0] + n[0] * lo, q[1] + n[1] * lo]; };
    E = { at, u, n, sc, L }; _edges.set(F, E); return E;
  }
  // torn shirt: the far sleeve ripped at the elbow; one big ragged flap hangs off it and stirs in the heat
  function shirtFlap(F, lt) {
    const E = farEdge(F), sc = E.sc, n = E.n, t = FILM.twos(lt);
    const sway = 0.12 * Math.sin(t * 2.1) + 0.06 * Math.sin(t * 4.7 + 1.3);
    const top0 = E.at(-0.16), top1 = E.at(0.06);
    let gx = n[0] * (0.45 + sway), gy = 1 + n[1] * 0.2; const gl = Math.hypot(gx, gy); gx /= gl; gy /= gl;     // it hangs: down, a little outward
    const len = 0.58 * sc, px = -gy, py = gx, Pt = (q, k, o) => [q[0] + gx * k * len + px * o * sc, q[1] + gy * k * len + py * o * sc];
    const mid = [(top0[0] + top1[0]) / 2 + n[0] * 0.04 * sc, (top0[1] + top1[1]) / 2 + n[1] * 0.04 * sc];
    return S().poly([[top0[0] - n[0] * 0.08 * sc, top0[1] - n[1] * 0.08 * sc], [top0[0] + n[0] * 0.05 * sc, top0[1] + n[1] * 0.05 * sc], Pt(mid, 0.4, 0.085),
      Pt(mid, 0.78, 0.05), Pt(mid, 1.0, 0.035), Pt(mid, 0.82, 0.0), Pt(mid, 0.66, -0.035), Pt(mid, 0.3, -0.06),
      [top1[0] + n[0] * 0.02 * sc, top1[1] + n[1] * 0.02 * sc], [top1[0] - n[0] * 0.08 * sc, top1[1] - n[1] * 0.08 * sc]]);
  }
  // blisters: below the torn sleeve, a few raised bumps standing out of the forearm's lit edge, irregular
  function blisters(F) {
    const E = farEdge(F), sc = E.sc, sh = S();
    [[0.37, 0.026, 0.55], [0.47, 0.036, 0.6], [0.55, 0.02, 0.5], [0.66, 0.03, 0.55]].forEach(([k, r, out]) => {
      const q = E.at(k); sh.ellipse(q[0] + E.n[0] * r * sc * out, q[1] + E.n[1] * r * sc * out, r * sc * 1.7, r * sc, Math.atan2(E.u[1], E.u[0])); });
    return sh;
  }
  // in his socks: past each ankle the foot is a shade off the ink, under a pale cuff band
  const SOCK = mix(C.ink, C.ash, 0.1), CUFF = mix(C.ink, C.ash, 0.4);
  function socks(g, F) {
    const j = F.joints, sc = F.scale, p = RIG.path(F);
    g.save(); g.clip(p);
    const apart = j.ankleN && j.ankleF && Math.hypot(j.ankleN[0] - j.ankleF[0], j.ankleN[1] - j.ankleF[1]) > 0.5 * sc;
    [['kneeN', 'ankleN'], ['kneeF', 'ankleF']].forEach(([kk, aa], i) => {
      const K = j[kk], A = j[aa]; if (!K || !A || (i && !apart)) return;
      const d = [A[0] - K[0], A[1] - K[1]], L = Math.hypot(d[0], d[1]) || 1, u = [d[0] / L, d[1] / L], n = [-u[1], u[0]];
      const c0 = [A[0] - u[0] * 0.2 * sc, A[1] - u[1] * 0.2 * sc];
      const quad = (o0, o1, w) => { const b0 = [c0[0] + u[0] * o0 * sc, c0[1] + u[1] * o0 * sc], b1 = [c0[0] + u[0] * o1 * sc, c0[1] + u[1] * o1 * sc];
        return S().poly([[b0[0] + n[0] * w * sc, b0[1] + n[1] * w * sc], [b1[0] + n[0] * w * sc, b1[1] + n[1] * w * sc], [b1[0] - n[0] * w * sc, b1[1] - n[1] * w * sc], [b0[0] - n[0] * w * sc, b0[1] - n[1] * w * sc]]); };
      g.fillStyle = SOCK; g.fill(quad(0, 1.3, 1.25).path(0.6, 5 + i));
      g.fillStyle = CUFF; g.fill(quad(0, 0.085, 0.6).path(0.5, 7 + i));
    });
    g.restore();
  }
  function drawF02(c, F, lt, st, noBlisters) {
    const e = c.em; e.save(); e.globalCompositeOperation = 'destination-out'; e.fill(RIG.path(F)); e.restore();
    const L = drawRig(c, F, 'scott', lt, st, Y().anchors.scott.seat.hip), g = c.g, light = { x: L.x, y: L.y }, w = Math.round(L.rimW * 4) / 4;
    socks(g, F);
    O.silhouette(g, shirtFlap(F, lt).path(1.1, 41), { fill: C.ink, light, rimColor: L.color, rimW: w, at: F.joints.elbowF });
    if (!noBlisters) O.silhouette(g, blisters(F).path(0.4, 43), { fill: C.ink, light, rimColor: L.color, rimW: w, at: F.joints.elbowF });   // (not while the arm is up at his face)
    return F;
  }
  function callScott(c, lt, s, o) {
    o = o || {}; const a = Y().anchors.scott.seat;
    const pose = grassPose({ breath: breathU(lt, o.rate || 0.42, o.amp || 0.045, o.tension == null ? 0.04 : o.tension) });
    const sp = Object.assign({ x: a.hip[0], y: a.ground, scale: a.scale, facing: -1, t: lt, breath: false, pose, hold: { N: { kind: 'phone', glow: true } }, idleAmt: 0.5 }, o.spec || {});
    return drawF02(c, RIG.figure('scott', sp), lt, s, o.noBlisters);
  }

  // ======================================================================= Scott from behind (style frame F13's source, made to move)
  // 'ending' view (SC 136, HX 660, HY 930). Built from params, rendered into a sprite and rebuilt only when a param changes (on twos);
  // breathing is a vertical scale of the sprite about the hips. His held hand is RIG.cu's clasp; the other hand is only the knockout.
  const F13 = { SC: 136, HX: 660, HY: 930, LEAN: 0.05 };
  const SPR = { x: 150, y: 230, w: 1220, h: 850 };
  let _k13 = null; const K13 = () => _k13 || (_k13 = RIG.cu.clasp(F13.HX + 2.66 * F13.SC, F13.HY - 0.3 * F13.SC, 1.06 * F13.SC, 0.06, 0.92));
  const sm = pts => O.fig.smooth(pts, true);
  const BACK_PTS = [[-0.2, -3.2], [-0.6, -3.06], [-0.95, -2.95], [-1.08, -2.72], [-0.98, -2.28], [-0.84, -1.72], [-0.75, -1.2], [-0.88, -0.6], [-1.04, -0.18], [-0.96, 0.04, 1],
    [0.96, 0.04, 1], [1.02, -0.18], [0.86, -0.6], [0.74, -1.2], [0.84, -1.7], [0.97, -2.16], [1.04, -2.5], [0.86, -2.74], [0.55, -2.96], [0.2, -3.17]];
  let _HEAD = null;
  const HEAD = () => _HEAD || (_HEAD = S().ellipse(0, 0, 0.42, 0.51, 0)
    .add(sm([[-0.18, -0.3], [-0.38, -0.22], [-0.44, -0.12], [-0.47, -0.02, 1], [-0.5, 0.08], [-0.47, 0.2], [-0.42, 0.3], [-0.34, 0.4], [-0.2, 0.47], [-0.04, 0.42], [-0.1, 0.05]]))
    .add(S().ellipse(0.44, 0.04, 0.075, 0.13, 0.15))
    .add(sm([[-0.37, -0.12], [-0.42, -0.32], [-0.3, -0.5], [-0.08, -0.6], [0.1, -0.61], [0.17, -0.64], [0.24, -0.66, 1], [0.24, -0.6], [0.36, -0.56], [0.48, -0.42],
      [0.55, -0.2], [0.55, 0.02], [0.5, 0.18], [0.41, 0.31], [0.34, 0.25], [0.25, 0.37], [0.13, 0.31], [0.0, 0.35], [-0.17, 0.27]])));
  function ik2(Sp, Tp, l1, l2, side) {
    let dx = Tp[0] - Sp[0], dy = Tp[1] - Sp[1], d = Math.hypot(dx, dy) || 1e-6; const dm = l1 + l2 - 1e-3; if (d > dm) { dx *= dm / d; dy *= dm / d; d = dm; }
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), ux = dx / d, uy = dy / d, P = [Sp[0] + ux * a, Sp[1] + uy * a];
    const E1 = [P[0] - uy * h, P[1] + ux * h], E2 = [P[0] + uy * h, P[1] - ux * h]; return (E1[0] > E2[0]) === (side > 0) ? E1 : E2;
  }
  function ik2low(Sp, Tp, l1, l2) { const a = ik2(Sp, Tp, l1, l2, 1), b = ik2(Sp, Tp, l1, l2, -1); return a[1] > b[1] ? a : b; }
  // the wipe: the right wrist leaves the grass, comes up beside his face, drags across it (behind the head, from here), and goes back down
  const WIPE_KEYS = [[0, 'grass'], [0.24, [1.12, -2.3]], [0.44, [0.5, -3.42]], [0.68, [0.02, -3.6]], [0.84, [0.95, -2.5]], [1, 'grass']];
  const _bs = { key: '', cv: null, g: null };
  function backScott(p) {
    const key = [p.up, p.head, p.tilt, p.phone, p.wipe, p.warm, p.sq].map(v => Math.round(v * 1000)).join(',');
    if (_bs.key === key) return _bs; _bs.key = key;
    if (!_bs.cv) { _bs.cv = O.makeCanvas(SPR.w, SPR.h); _bs.g = _bs.cv.getContext('2d'); }
    const g = _bs.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, SPR.w, SPR.h); g.translate(-SPR.x, -SPR.y);
    const { SC, HX, HY, LEAN } = F13;
    const rot = (u, v, a) => [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)];
    const U = (u, v) => { const q = rot(u, v, LEAN); return [HX + q[0] * SC, HY + q[1] * SC]; };
    const toU = pt => rot((pt[0] - HX) / SC, (pt[1] - HY) / SC, -LEAN);
    const B = sh => sh.rotate(LEAN).transform([SC, 0, 0, SC, HX, HY]);
    const lift = v => v < -2.0 ? p.up * smooth((-v - 2.0) / 0.75) : 0;
    const R = O.rng('f13hem'), rr = (a, b) => a + (b - a) * R();
    const body = S();
    body.add(B(sm(BACK_PTS.map(q => q.length > 2 ? [q[0], q[1] - lift(q[1]), q[2]] : [q[0], q[1] - lift(q[1])]))));
    const hem = S(); for (let i = 0; i < 8; i++) { const x = -0.9 + i * 0.255 + rr(-0.04, 0.04), y = -0.6 + rr(-0.04, 0.04); hem.poly([[x - 0.09, y - 0.02], [x + 0.1, y - 0.03], [x + rr(-0.02, 0.06), y + rr(0.1, 0.24)]]); }
    body.add(B(hem));
    const wipeBow = 0.13 * Math.sin(Math.PI * p.wipe);
    const hy = -0.5 * p.up + p.head + wipeBow;                     // the head rises half as much as the shoulders: tension sinks it into them
    body.add(B(S().capsule(-0.03, -3.1 - p.up, 0.26, -0.1, -3.46 + hy, 0.21)));
    const HC = [-0.14, -3.84 + hy], HROT = -0.15 + p.tilt - 0.1 * wipeBow;
    const headSh = B(HEAD().scale(1.08).rotate(HROT).translate(HC[0], HC[1] - 0.04));
    body.add(headSh);
    const legL = S().capsule(-0.7, -0.4, 0.42, -1.6, -1.78, 0.27).capsule(-1.6, -1.78, 0.26, -2.34, -0.86, 0.16);
    const sock = sm([[-2.22, -1.04], [-2.56, -1.06], [-2.9, -0.98], [-3.04, -0.88], [-3.02, -0.78], [-2.6, -0.7], [-2.28, -0.68, 1], [-2.16, -0.82]]);
    const sockTip = sm([[-2.98, -0.94], [-3.14, -0.86], [-3.2, -0.72], [-3.17, -0.6, 1], [-3.08, -0.68], [-2.98, -0.76]]);
    body.add(B(legL)).add(B(sock)).add(B(sockTip));
    // LEFT arm: the elbow on the knee, the hand cupping the phone to his ear (or lowered a little, to his jaw)
    const ph = p.phone, SL = [-0.92, -2.84 - lift(-2.84)], EL = [-1.56, -2.12];
    const WL = [lerp(-0.74, -1.0, ph), lerp(-3.3 + hy, -2.98 - 0.3 * p.up, ph)], earL = [lerp(-0.5, -0.78, ph), lerp(-3.9 + hy, -3.55 - 0.3 * p.up, ph)];
    const armL = S().capsule(SL[0], SL[1], 0.27, EL[0], EL[1], 0.19).capsule(EL[0], EL[1], 0.17, WL[0], WL[1], 0.125);
    armL.add(S().poly([[-1.26, -2.56], [-1.62, -2.5], [-1.5, -2.36], [-1.76, -2.28], [-1.44, -2.2]]));
    const ha = Math.atan2(earL[1] - WL[1], earL[0] - WL[0]);
    const mitt = sm([[0, -0.15], [0.22, -0.19], [0.48, -0.17], [0.6, -0.08], [0.62, 0.06], [0.5, 0.16], [0.24, 0.17], [0, 0.13]]).transform([Math.cos(ha), Math.sin(ha), -Math.sin(ha), Math.cos(ha), WL[0], WL[1]]);
    body.add(B(armL)).add(B(mitt));
    const PH = { c: [lerp(-0.74, -0.86, ph), lerp(-3.9 + hy, -3.5 - 0.3 * p.up, ph)], a: lerp(0.24, 0.42, ph), w: 0.15, h: 0.7 };
    const phone = S().rect(-PH.w / 2, -PH.h / 2, PH.w, PH.h).rotate(PH.a).translate(PH.c[0], PH.c[1]);
    // RIGHT arm: down to his hand on the grass (or up to his face for the wipe)
    const K = K13(), SR = [0.94, -2.62 - lift(-2.62)], WRu = toU(K.wrist);
    let WT = WRu, onGrass = true;
    if (p.wipe > 0 && p.wipe < 1) {
      let i = 0; while (i < WIPE_KEYS.length - 2 && p.wipe > WIPE_KEYS[i + 1][0]) i++;
      const [t0, a0] = WIPE_KEYS[i], [t1, a1] = WIPE_KEYS[i + 1], u = E.inOutSine(seg(p.wipe, t0, t1));
      const A0 = a0 === 'grass' ? WRu : [a0[0], a0[1] + hy * (i > 0 ? 1 : 0)], A1 = a1 === 'grass' ? WRu : [a1[0], a1[1] + hy]; WT = [lerp(A0[0], A1[0], u), lerp(A0[1], A1[1], u)]; onGrass = false;
    }
    const fk = onGrass ? 1 : 1 - 0.3 * Math.sin(Math.PI * p.wipe), ER = onGrass ? ik2(SR, WT, 1.25, 1.39, 1) : ik2low(SR, WT, 1.25 * fk, 1.39 * (0.75 + 0.25 * fk));
    const armR = S().capsule(SR[0], SR[1], 0.27, ER[0], ER[1], 0.18).capsule(ER[0], ER[1], 0.16, WT[0], WT[1], 0.12);
    { const a = [lerp(SR[0], ER[0], 0.45), lerp(SR[1], ER[1], 0.45)], sl = O.rng('sleeve'); for (let i = 0; i < 4; i++) { const x = a[0] + (i - 1.5) * 0.12, y = a[1] + i * 0.06; armR.poly([[x - 0.07, y], [x + 0.07, y + 0.02], [x + (sl() - 0.3) * 0.08, y + 0.18 + sl() * 0.16]]); } }
    body.add(B(armR));
    if (onGrass) { const K2 = p.sq ? RIG.cu.clasp(K.ap(0, 0)[0] - 3, K.ap(0, 0)[1] + 1, K.L * 0.975, 0.07, 0.9) : K; body.add(K2.sBack).add(K2.sFing).add(K2.sThumb); }
    else { const fa = Math.atan2(WT[1] - ER[1], WT[0] - ER[0]); body.add(B(sm([[0, -0.12], [0.24, -0.13], [0.36, -0.05], [0.36, 0.07], [0.22, 0.13], [0, 0.11]]).transform([Math.cos(fa), Math.sin(fa), -Math.sin(fa), Math.cos(fa), WT[0], WT[1]]))); }
    // his shadow, thrown back toward us by the fire (the place beside him casts none)
    O.castShadow(g, body, [1, 0, -0.75, -0.3, HY * 0.75, HY * 1.3], 0.7);
    const bodyNoPhone = body.path(0.8, 11), bodyP = body.add(B(phone)).path(0.8, 11);
    g.fillStyle = C.ink; g.fill(bodyP);
    const HEADC = U(HC[0], HC[1]), CL = [HX + 2.66 * SC, HY - 0.3 * SC], bb = { x: SPR.x, y: SPR.y, w: SPR.w, h: SPR.h }, at = U(0, -2);
    const rim = (path, color, dx, dy, clip, alpha) => O.silhouette(g, path, { noFill: true, light: { dx: -dx, dy: -dy }, rimColor: color, rimW: Math.hypot(dx, dy), clip, at, bbox: bb, rimAlpha: alpha });
    const ell = (x, y, rx, ry, r) => { const q = new Path2D(); q.ellipse(x, y, rx, ry, r || 0, 0, TAU); return q; };
    // the house's fire catches his crown, the left shoulder, the raised arm and the sock
    rim(bodyNoPhone, C.fireMid, 3.4, 2.2, ell(HEADC[0] - 0.7 * SC, HEADC[1] + 0.3 * SC, 1.35 * SC, 1.15 * SC));
    g.fillStyle = C.ink; g.fill(B(phone).path(0.3, 3));
    { const q = new Path2D(); const y0 = U(0, -2.5)[1]; q.rect(0, y0, U(-0.3, 0)[0], H); rim(bodyP, mix(C.ink, C.fireMid, 0.5), 2.4, 1.6, q); }
    rim(B(S().add(sock).add(sockTip)).path(0.8, 11), C.fireMid, 2.6, 3.2);
    if (!onGrass) rim(B(armR).path(0.8, 12), mix(C.ink, C.fireMid, 0.55), 2.2, 2.6);
    { const ash = O.rng('char'); g.fillStyle = mix(C.ink, C.fireMid, 0.7);
      for (let i = 0; i < 12; i++) { const pp = U(-0.9 + ash() * 1.8, -0.46 + ash() * 0.12); g.fillRect(pp[0], pp[1], 1.6, 1.6); } }
    // the phone's light: on his cheek and jaw while it is at his ear; on his fingers and jaw once lowered
    { const faceP = S().add(headSh).add(B(mitt)).path(0.8, 11), pc = U(PH.c[0], PH.c[1] + 0.14 * (1 - ph));
      rim(faceP, C.phoneWhite, 5.2, -1.6, ell(pc[0] - 2, pc[1] + 0.22 * SC, 0.26 * SC, 0.26 * SC, 0.2), 1 - 0.5 * ph);
      rim(faceP, mix(C.ink, C.phoneWhite, 0.5), 3.2, -1.0, ell(pc[0] - 2, pc[1] - 0.12 * SC, 0.2 * SC, 0.2 * SC, 0.2), 1 - ph);
      const pe = B(phone).polys[0]; g.save(); g.strokeStyle = C.phoneWhite; g.lineCap = 'butt'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(pe[1][0] + 1.5, pe[1][1] + 2); g.lineTo(pe[2][0] + 1.5, pe[2][1] - 2); g.stroke(); g.restore(); }
    // warmth from his right: the held hand lights the underside of his wrist, his right side, and the side of his face
    if (p.warm > 0.001) {
      rim(bodyP, mix(C.ink, C.fireMid, 0.85), -3.8, -1.6, ell(CL[0] - 0.2 * SC, CL[1], 1.25 * SC, 1.6 * SC), p.warm);
      rim(bodyP, mix(C.ink, C.fireMid, 0.55), -2.8, -0.8, ell(CL[0] - 0.45 * SC, CL[1] - 1.3 * SC, 1.55 * SC, 3.0 * SC, -0.25), p.warm);
      rim(bodyP, mix(C.ink, C.tungsten, 0.8), -3.6, 0.5, ell(HEADC[0] + 0.36 * SC, HEADC[1] + 0.18 * SC, 0.34 * SC, 0.62 * SC), p.warm);
    }
    _bs.phoneC = U(PH.c[0], PH.c[1]); _bs.K = K; _bs.bodyP = bodyP;
    return _bs;
  }
  function drawBack(c, lt, p, breathAmp, breathHz) {
    const B = backScott(p), br = breathAmp * (0.5 - 0.5 * Math.cos(TAU * breathHz * twos(lt))), g = c.g;
    g.save(); g.translate(0, F13.HY); g.scale(1, 1 + br); g.translate(0, -F13.HY); g.drawImage(B.cv, SPR.x, SPR.y); g.restore();
    const em = c.em; em.save(); em.translate(0, F13.HY); em.scale(1, 1 + br); em.translate(0, -F13.HY); em.globalCompositeOperation = 'destination-out'; em.fill(B.bodyP); em.restore();   // nothing behind him blooms through him
    return B;
  }
  // his pose in the held shot: hitched and bowed into the phone; the wipe; on 'Two.' the drop (half of it on the very frame); the phone lowered
  function backPose(lt) {
    const tq = twos(lt), r3 = v => Math.round(v * 1000) / 1000;
    const drop = tq >= T.two ? 0.55 + 0.45 * E.outCubic(seg(tq, T.two, T.two + 0.5)) : 0;
    const still = seg(tq, T.L248, T.L248 + 0.5);            // at 'Me.' he goes still
    const shake = 0.07 * Math.sin(seg(tq, T.shake, T.shake + 1.6) * Math.PI * 3) * Math.sin(seg(tq, T.shake, T.shake + 1.6) * Math.PI);
    return { up: r3(lerp(0.15, -0.09, drop) + 0.02 * still), head: r3(lerp(0.08 + 0.03 * still, -0.05, drop)), tilt: r3(lerp(-0.05, 0.1, drop) + shake), phone: r3(seg(tq, T.lower, T.lower + 0.9, E.inOutSine)),
      wipe: tq < T.prof ? 0 : 1, warm: r3(seg(tq, T.warm, T.warm + 1.6, E.inOutSine)), sq: tq >= T.two - 0.5 ? 1 : 0 };
  }

  // ======================================================================= the two hearts
  // his: from 'Me.' on, beat by beat; the other arrives with the warmth, 0.31 s late and off to his right, and drifts into lockstep by 'Two.'
  const BEATS = (() => {
    const out = []; let t = T.L248 - 0.2;
    while (t < T.yardEnd - 0.8) {
      const bpm = t < T.two ? lerp(98, 80, seg(t, T.L248, T.two)) : lerp(74, 54, seg(t, T.two, T.yardEnd));
      const lock = 1 - smooth(seg(t, T.warm + 0.4, T.two - 0.1));
      out.push({ t, other: t >= T.warm + 0.2 ? t + 0.31 * lock + 0.05 * lock * Math.sin(t * 3.1) : null, lock }); t += 60 / bpm;
    }
    return out;
  })();
  // a soft pulse (0..1) on each beat once they are locked: the ember's breath
  function pulseAt(lt) { let k = 0; for (const b of BEATS) { if (b.t > lt) break; const u = lt - b.t; if (u < 0.7 && b.other != null) k = Math.max(k, Math.exp(-u * 6) * (1 - b.lock)); } return k; }

  // ======================================================================= the keypad (insert)
  // presses: [time, key]; 'x' clears the number (delete held), 'call' places the call
  const PRESS = [[0.4, '9'], [0.76, '9'], [1.04, '8'], [1.95, 'x'], [2.5, '9'], [2.9, '6'], [3.7, 'x']].map(([t, k]) => [T.padA + t, k])
    .concat([[0.5, '9'], [1.2, '9'], [1.92, '9'], [2.85, 'call']].map(([t, k]) => [T.padB + t, k]));
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  const PH2 = { cx: 1010, cy: 560, rot: -0.1, kx: 200, ky: 158, r: 64 };
  const keyPos = k => { if (k === 'call') return [0, 2.6 * PH2.ky + 30]; if (k === 'x') return [PH2.kx, 2.6 * PH2.ky + 30]; const i = KEYS.indexOf(k); return [((i % 3) - 1) * PH2.kx, (Math.floor(i / 3) - 1.5) * PH2.ky + 40]; };
  function dialState(lt) {
    let num = '', last = null, calling = null;
    for (const [t, k] of PRESS) { if (t > lt) break; last = [t, k]; if (k === 'x') num = ''; else if (k === 'call') calling = t; else num += k; }
    return { num, last, calling };
  }
  function thumbTip(lt) {
    // the tip travels key to key, arrives a beat early, and dips on the press; it never stops shaking
    let prev = [PH2.kx * 1.5, 2.9 * PH2.ky], prevT = lt - 10, pos = prev, dip = 0;
    const list = PRESS.filter(p => Math.abs(p[0] - lt) < 6);
    for (let i = 0; i < list.length; i++) {
      const [t, k] = list[i]; const kp = keyPos(k);
      if (lt < t) { const t0 = Math.max(prevT + 0.12, t - 0.32); const u = E.inOutSine(seg(lt, t0, t - 0.04)); pos = [lerp(prev[0], kp[0], u), lerp(prev[1], kp[1], u)]; break; }
      pos = kp; prev = kp; prevT = t; if (lt - t < 0.16) dip = 1 - (lt - t) / 0.16;
    }
    const shake = 7 + 6 * seg(lt, T.padA, T.padA + 3) * (1 - seg(lt, T.padB, T.padB + 1.6));
    return { p: [pos[0] + shake * FL.wob(lt, 11, 3) + 22, pos[1] + shake * 0.8 * FL.wob(lt, 11, 4) + 56], dip };
  }
  function drawKeypad(c, lt) {
    const g = c.g, em = c.em, st = dialState(lt);
    // beyond the phone: his knees in the dark, the fire's glow up at the top right in two flat steps
    g.drawImage(c.cache('Q12.padbg', gg => {
      gg.fillStyle = C.ink; gg.fillRect(0, 0, W, H);
      O.lightPool(gg, 1750, -120, [{ r: 1300, color: mix(C.ink, C.fireOuter, 0.13) }, { r: 760, color: mix(C.ink, C.fireOuter, 0.26) }], { sy: 0.6, rough: 3, seed: 61 });
      gg.fillStyle = C.ink; gg.fill(S().ellipse(1700, 1150, 520, 330, -0.3).ellipse(260, 1180, 560, 300, 0.2).path(2, 63));
    }), 0, 0);
    g.save(); g.translate(PH2.cx, PH2.cy); g.rotate(PH2.rot);
    const bodyP = new Path2D(); bodyP.roundRect(-430, -860, 860, 1760, 70);
    g.fillStyle = mix(C.ink, C.rainSlate, 0.22); g.fill(bodyP);
    O.silhouette(g, bodyP, { noFill: true, light: { dx: 0.55, dy: -0.83 }, rimColor: C.fireMid, rimW: 3, at: [0, 0], bbox: { x: -440, y: -870, w: 880, h: 1780 }, spread: 0.9 });
    const scr = new Path2D(); scr.roundRect(-404, -834, 808, 1708, 52);
    const lit = st.calling != null ? 0.8 : 1;
    g.fillStyle = mix(C.ink, C.rainSlate, 0.36 * lit); g.fill(scr);
    g.save(); g.clip(scr);
    g.fillStyle = rgba(C.phoneWhite, 0.045); g.fillRect(-404, -834, 808, 560);
    const disp = st.calling != null ? '999' : st.num, dY = -2.6 * PH2.ky - 40;
    O.text(g, disp, 0, dY, { family: 'Barlow Condensed', weight: 400, size: 128, color: C.phoneWhite, tracking: 12, align: 'center' });
    if (!disp && Math.floor(lt / 0.53) % 2 === 0) { g.fillStyle = C.phoneWhite; g.fillRect(-2, dY - 100, 4, 112); }
    if (st.calling == null) {
      KEYS.forEach(k => {
        const p = keyPos(k); let hot = 0; if (st.last && st.last[1] === k) hot = 1 - seg(lt, st.last[0] + 0.1, st.last[0] + 0.34);
        g.lineWidth = 2; g.strokeStyle = rgba(C.phoneWhite, 0.2 + 0.6 * hot); g.beginPath(); g.arc(p[0], p[1], PH2.r, 0, TAU); g.stroke();
        if (hot > 0) { g.fillStyle = rgba(C.phoneWhite, 0.85 * hot); g.beginPath(); g.arc(p[0], p[1], PH2.r, 0, TAU); g.fill(); }
        O.text(g, k, p[0], p[1] + 25, { family: 'Barlow Condensed', weight: 400, size: 74, color: hot > 0.5 ? C.ink : C.phoneWhite, align: 'center', alpha: hot > 0.5 ? 1 : 0.86 });
      });
      const cp = keyPos('call'), xp = keyPos('x');
      g.fillStyle = rgba(C.phoneWhite, 0.82); g.beginPath(); g.arc(cp[0], cp[1], PH2.r * 1.06, 0, TAU); g.fill();
      g.save(); g.translate(cp[0], cp[1]); g.rotate(-0.75); g.fillStyle = mix(C.ink, C.rainSlate, 0.36); g.beginPath(); g.roundRect(-26, -9, 52, 18, 9); g.fill(); g.fillRect(-28, -9, 14, 26); g.fillRect(14, -9, 14, 26); g.restore();
      const xh = st.last && st.last[1] === 'x' ? 1 - seg(lt, st.last[0] + 0.3, st.last[0] + 0.55) : 0;
      g.strokeStyle = rgba(C.phoneWhite, 0.5 + 0.5 * xh); g.lineWidth = 3; g.beginPath(); g.moveTo(xp[0] - 30, xp[1]); g.lineTo(xp[0] - 12, xp[1] - 18); g.lineTo(xp[0] + 30, xp[1] - 18); g.lineTo(xp[0] + 30, xp[1] + 18); g.lineTo(xp[0] - 12, xp[1] + 18); g.closePath(); g.stroke();
    } else {
      // calling: the keypad gone, rings of light going out from the call
      const u = lt - st.calling;
      for (let k = 0; k < 3; k++) { const q = (u * 0.8 + k / 3) % 1; g.strokeStyle = rgba(C.phoneWhite, 0.45 * (1 - q)); g.lineWidth = 4; g.beginPath(); g.arc(0, 120, 80 + q * 300, 0, TAU); g.stroke(); }
      g.fillStyle = rgba(C.phoneWhite, 0.9); g.beginPath(); g.arc(0, 120, 64, 0, TAU); g.fill();
    }
    g.restore();
    // his hand: four fingers curled over the left edge, the heel of the palm over the bottom corner, the thumb over the keys
    const hand = S();
    // the fingertips curl round the left edge from behind (only their last joints show over the glass); the knuckles stay outside
    [[-330, 0.95], [-140, 1], [40, 0.96], [210, 0.86]].forEach(([y, k], i) => {
      hand.capsule(-640, y + 50, 54 * k, -452, y + 18, 47 * k).capsule(-452, y + 18, 45 * k, -372 + 5 * i, y - 2, 35 * k);
    });
    hand.capsule(-700, 900, 260, -330, 1000, 210);                                   // the heel of the palm under the bottom corner
    const tt = thumbTip(lt), tip = tt.p, root = [470, 1110], kn = [lerp(root[0], tip[0], 0.5) + 60, lerp(root[1], tip[1], 0.5) + 26];
    const tw = 56 * (1 + 0.08 * tt.dip);
    hand.capsule(root[0] + 120, root[1] + 150, 190, root[0], root[1], 118).capsule(root[0], root[1], 112, kn[0], kn[1], 80).capsule(kn[0], kn[1], 78, tip[0], tip[1], tw);
    const hp = hand.path(0.8, 9);
    g.fillStyle = C.ink; g.fill(hp);
    // the screen's light: on the edge of the thumb toward the glass, and on the four fingertips where they come over the edge
    const thumbP = S().capsule(root[0], root[1], 112, kn[0], kn[1], 80).capsule(kn[0], kn[1], 78, tip[0], tip[1], tw).path(0.8, 9);
    O.silhouette(g, thumbP, { noFill: true, light: { x: -200, y: -100 }, rimColor: C.phoneWhite, rimW: 2.6, at: [kn[0], kn[1]], bbox: { x: -100, y: -300, w: 900, h: 1600 }, spread: 0.9 });
    O.silhouette(g, hp, { noFill: true, light: { dx: 1, dy: -0.15 }, rimColor: rgba(C.phoneWhite, 0.8), rimW: 2.2, at: [-500, -60], bbox: { x: -760, y: -500, w: 500, h: 900 }, clip: scr });
    const na = Math.atan2(tip[1] - kn[1], tip[0] - kn[0]);
    g.save(); g.translate(tip[0] - Math.cos(na) * 30, tip[1] - Math.sin(na) * 30); g.rotate(na); g.fillStyle = mix(C.ink, C.ash, 0.2); g.beginPath(); g.ellipse(0, 0, 34, 24, 0, 0, TAU); g.fill(); g.restore();
    g.restore();
    // the screen glows into the bloom; a pressed key flares
    em.save(); em.translate(PH2.cx, PH2.cy); em.rotate(PH2.rot); em.fillStyle = rgba(C.phoneWhite, 0.12); em.fillRect(-404, -834, 808, 1708);
    if (st.last && st.last[1] !== 'x' && st.last[1] !== 'call' && lt - st.last[0] < 0.3) { const p = keyPos(st.last[1]); em.fillStyle = rgba(C.phoneWhite, 0.8 * (1 - (lt - st.last[0]) / 0.3)); em.beginPath(); em.arc(p[0], p[1], 90, 0, TAU); em.fill(); }
    em.restore();
  }

  // ======================================================================= the count (object inserts)
  // each friend's left-behind thing on a dark floor in the burning house, in a pool of firelight from one side
  const WHO = { deena: 'Deena', christof: 'Christof', angelo: 'Angelo', kay: 'Kay', marina: 'Marina' };
  const INS = {   // light side (+1 right), the object's centre, the horizon of the floor
    deena: { side: 1, at: [930, 690], hz: 360 }, christof: { side: -1, at: [960, 700], hz: 470 }, angelo: { side: 1, at: [960, 700], hz: 340 },
    kay: { side: -1, at: [990, 650], hz: 600 }, marina: { side: 1, at: [960, 690], hz: 400 }, empty: { side: 0, at: [960, 690], hz: 380 },
  };
  const MONT = (() => {
    // the empty one (null) holds to the cut: 0.75 s of nothing, so the wrong ping from his right is heard against silence
    const L = [['deena', 0.88, 1], ['christof', 0.8, 2], ['angelo', 0.75, 3], ['kay', 0.7, 4], ['marina', 0.62, 5],
      ['kay', 0.5, 3], ['deena', 0.45, 2], ['marina', 0.42, 5], ['angelo', 0.38, 4], ['christof', 0.34, 1],
      ['deena', 0.3, 4], ['kay', 0.27, 2], ['angelo', 0.25, 5], ['marina', 0.23, 3], ['christof', 0.21, 4], ['empty', null, 6]];
    let t = T.mont0; return L.map(([id, d, n], i) => { const t1 = d == null ? T.mont1 : t + d, m = { id, t0: t, t1, n, i }; t = t1; return m; });
  })();
  const EMPTY = MONT[MONT.length - 1];
  const _ins = {};
  function room(g, I, seed) {
    const lx = 960 + I.side * 1150, [ox, oy] = I.at, hz = I.hz;
    g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
    // the wall: the fire's light low along it from the burning side
    O.lightPool(g, lx, hz, [{ r: 1250, color: mix(C.ink, C.fireOuter, 0.1) }, { r: 720, color: mix(C.ink, C.fireOuter, 0.2) }], { sy: 0.42, rough: 4, seed });
    // the floor: dark, with the pool the fire throws across it to the object
    g.save(); g.beginPath(); g.rect(0, hz, W, H - hz); g.clip();
    g.fillStyle = mix(C.ink, C.soot, 0.35); g.fillRect(0, hz, W, H - hz);
    const px = ox + I.side * 240;
    O.lightPool(g, px, oy + 10, [{ r: 880, color: mix(C.ink, C.fireOuter, 0.15) }, { r: 540, color: mix(C.ink, C.fireOuter, 0.28) }, { r: 290, color: mix(C.ink, C.fireOuter, 0.44) }], { sy: 0.3, rough: 3, seed: seed + 1 });
    g.restore();
    g.fillStyle = C.ink; g.fillRect(0, hz - 3, W, 6);
    return { lx, ly: oy - 60 };
  }
  function tiles(g, hz, step) {
    g.save(); g.strokeStyle = C.ink; g.lineWidth = 3; g.globalAlpha = 0.7;
    for (let k = 1; k < 9; k++) { const y = hz + (H - hz) * Math.pow(k / 8, 1.7); g.beginPath(); g.moveTo(-20, y); g.lineTo(W + 20, y); g.stroke(); }
    const vy = hz - 900; for (let k = -14; k <= 14; k++) { const xb = 960 + k * step; g.beginPath(); g.moveTo(960 + (xb - 960) * (hz - vy) / (H + 300 - vy), hz); g.lineTo(xb, H + 300); g.stroke(); }
    g.restore();
  }
  function insertLayer(id) {
    if (_ins[id]) return _ins[id];
    const cv = O.makeCanvas(W, H), g = cv.getContext('2d'), I = INS[id], [ox, oy] = I.at, sd = I.side || 1;
    const L = room(g, I, 70 + id.length * 7);
    const shadowOf = (draw, k) => { g.save(); g.globalAlpha = 0.7; g.translate(-sd * (k || 34), 18); draw(C.ink); g.restore(); };
    if (id === 'deena') {
      // her hoop, torn out on the kitchen tiles: big, a thin wire, fallen up on its edge against the grout, the ear-wire sprung out of its
      // catch. No stone, no glint: only the fire running along the wire (Marina's ring is the small heavy one with the stone)
      tiles(g, I.hz, 300);
      const HX = ox, HY = oy - 70, RX = 236, RY = 178, ROT = -0.3, G0 = -2.25, GAP = 0.3;
      const pt = a => [HX + RX * Math.cos(a) * Math.cos(ROT) - RY * Math.sin(a) * Math.sin(ROT), HY + RX * Math.cos(a) * Math.sin(ROT) + RY * Math.sin(a) * Math.cos(ROT)];
      const arc = (col, w, a0, a1) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.ellipse(HX, HY, RX, RY, ROT, a0, a1); g.stroke(); };
      // its shadow lies flat on the floor, thrown away from the fire
      g.save(); g.globalAlpha = 0.6; g.strokeStyle = C.ink; g.lineWidth = 14; g.beginPath(); g.ellipse(HX - sd * 70, oy + 92, RX * 1.02, 58, -0.04, 0, TAU); g.stroke(); g.restore();
      arc(mix(C.tungstenMid, C.ink, 0.35), 11, G0 + GAP, G0 + TAU);
      arc(C.tungstenMid, 7, G0 + GAP + 0.1, G0 + TAU - 0.05);
      arc(C.tungsten, 4, -1.4, 0.75);                           // the side toward the fire
      arc(C.fireCore, 2.5, -0.85, 0.05);
      // the ear-wire: sprung from one end of the gap, out past the other
      const e0 = pt(G0 + GAP), e1 = pt(G0), dx = e1[0] - e0[0], dy = e1[1] - e0[1], a = Math.atan2(dy, dx) - 0.42, len = Math.hypot(dx, dy) * 1.9 + 34;
      g.strokeStyle = C.tungsten; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(e0[0], e0[1]); g.lineTo(e0[0] + Math.cos(a) * len, e0[1] + Math.sin(a) * len); g.stroke();
      g.fillStyle = C.tungstenMid; g.beginPath(); g.ellipse(e1[0], e1[1], 8, 6, ROT, 0, TAU); g.fill();       // the catch
    } else if (id === 'christof') {
      // his biscuit, one bite out of it, on the table boards
      g.save(); g.strokeStyle = C.ink; g.lineWidth = 4; g.globalAlpha = 0.6; for (let k = 1; k < 7; k++) { const y = I.hz + (H - I.hz) * Math.pow(k / 6, 1.4); g.beginPath(); g.moveTo(-20, y + 10); g.lineTo(W + 20, y - 14); g.stroke(); } g.restore();
      const tmp = O.makeCanvas(W, H), tg = tmp.getContext('2d');
      const bis = S().ellipse(ox, oy, 250, 104, 0.05).path(1.4, 6), bite = S().circle(ox + 230, oy - 54, 92).circle(ox + 152, oy - 92, 62).circle(ox + 262, oy + 30, 58).path(1.2, 7);
      shadowOf(col => { tg.clearRect(0, 0, W, H); tg.fillStyle = col; tg.fill(bis); tg.globalCompositeOperation = 'destination-out'; tg.fill(bite); tg.globalCompositeOperation = 'source-over'; g.drawImage(tmp, 0, 0); }, 40);
      tg.clearRect(0, 0, W, H); tg.fillStyle = mix(C.cardPaper, C.tungstenMid, 0.5); tg.fill(bis);   // its thickness, in shade
      tg.fillStyle = C.cardPaper; tg.save(); tg.translate(0, -16); tg.fill(bis); tg.restore();
      tg.fillStyle = mix(C.cardPaper, C.tungsten, 0.25); tg.save(); tg.translate(sd * 10, -22); tg.globalAlpha = 0.6; tg.fill(S().ellipse(ox - sd * 40, oy - 10, 180, 70, 0.05).path(1.4, 8)); tg.restore();
      tg.fillStyle = C.tungstenMid; [[-90, -30], [0, -50], [90, -24], [-50, 14], [50, 6], [-140, 6]].forEach(([dx, dy]) => { tg.beginPath(); tg.ellipse(ox + dx, oy + dy - 16, 9, 5, 0, 0, TAU); tg.fill(); });
      tg.globalCompositeOperation = 'destination-out'; tg.fill(bite); tg.globalCompositeOperation = 'source-over';
      g.drawImage(tmp, 0, 0);
      g.fillStyle = C.cardPaper; [[ox + 300, oy + 70, 7], [ox + 352, oy + 48, 5], [ox + 390, oy + 92, 4], [ox + 262, oy + 110, 5]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
    } else if (id === 'angelo') {
      // the cigarette he dropped, still on the kitchen floor
      tiles(g, I.hz, 300);
      const a = [ox - 330, oy + 70], b = [ox + 330, oy - 80], fl = 0.22;
      shadowOf(col => { g.strokeStyle = col; g.lineWidth = 30; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }, 30);
      g.lineCap = 'butt'; g.strokeStyle = C.cardPaper; g.lineWidth = 26; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      g.strokeStyle = C.tungstenMid; g.beginPath(); g.moveTo(lerp(a[0], b[0], 1 - fl), lerp(a[1], b[1], 1 - fl)); g.lineTo(b[0], b[1]); g.stroke();
      g.strokeStyle = C.lighterCream; g.lineWidth = 5; g.beginPath(); g.moveTo(a[0] + 4, a[1] - 13); g.lineTo(lerp(a[0], b[0], 1 - fl), lerp(a[1], b[1], 1 - fl) - 13); g.stroke();
      g.fillStyle = mix(C.cardPaper, C.ink, 0.3); g.beginPath(); g.ellipse(a[0], a[1], 7, 13, -0.22, 0, TAU); g.fill();
    } else if (id === 'kay') {
      // her glass on the table, the fire behind it, her lipstick on the rim
      const sx = ox, sy = oy + 230, gl = S();
      gl.add(sm([[-150, -560], [-160, -470], [-140, -360], [-80, -270], [-16, -228], [-12, -40], [-130, -6], [-140, 12, 1], [140, 12, 1], [130, -6], [12, -40], [16, -228], [80, -270], [140, -360], [160, -470], [150, -560]]).translate(sx, sy));
      const glp = gl.path(0.5, 4);
      O.castShadow(g, gl, [1, 0, -sd * 0.9, -0.16, sd * 0.9 * sy, 1.16 * sy], 0.55);
      g.fillStyle = mix(C.ink, C.soot, 0.4); g.fill(glp);
      // the last of the wine, a dark sliver in the bowl
      g.save(); g.clip(glp); g.fillStyle = C.blood; g.fillRect(sx - 200, sy - 300, 400, 80); g.fillStyle = mix(C.wine, C.fireMid, 0.3); g.fillRect(sx - 200, sy - 300, 400, 5); g.restore();
      O.silhouette(g, glp, { noFill: true, light: { dx: -sd, dy: -0.3 }, rimColor: C.fireMid, rimW: 4, at: [sx, sy - 300], bbox: gl.bbox() });
      g.save(); g.strokeStyle = C.cardPaper; g.globalAlpha = 0.85; g.lineCap = 'round'; g.lineWidth = 7; g.beginPath(); g.moveTo(sx + sd * 104, sy - 520); g.quadraticCurveTo(sx + sd * 124, sy - 440, sx + sd * 108, sy - 380); g.stroke(); g.restore();
      // the lip mark: two soft lobes at the rim's near edge
      g.fillStyle = C.tKayLip; g.save(); g.translate(sx - sd * 60, sy - 556); g.rotate(-0.04 * sd);
      g.beginPath(); g.ellipse(-16, 0, 22, 8, 0.1, 0, TAU); g.fill(); g.beginPath(); g.ellipse(16, 1, 21, 7, -0.1, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0, 9, 28, 6, 0, 0, TAU); g.fill(); g.restore();
    } else if (id === 'marina') {
      // her ring on the boards, one hard glint
      g.save(); g.strokeStyle = C.ink; g.lineWidth = 4; g.globalAlpha = 0.6; for (let k = 1; k < 8; k++) { const y = I.hz + (H - I.hz) * Math.pow(k / 7, 1.5); g.beginPath(); g.moveTo(-20, y); g.lineTo(W + 20, y - 26); g.stroke(); } g.restore();
      // small and heavy: a thick gold band (her #D4AF5E) lying flat, the stone standing up in its claws at the back of the band
      const RX = 84, RY = 33, RR = 0.08, GOLD = '#D4AF5E';
      const ring = (col, w, a0, a1) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.ellipse(ox, oy, RX, RY, RR, a0 == null ? 0 : a0, a1 == null ? TAU : a1); g.stroke(); };
      shadowOf(col => ring(col, 22), 26);
      ring(mix(GOLD, C.ink, 0.42), 22); ring(mix(GOLD, C.ink, 0.12), 14, -2.9, 0.3); ring(GOLD, 6, -1.7, 0.2); ring(mix(GOLD, C.cardPaper, 0.5), 2.5, -1.2, -0.3);
      const sx = ox + 6, sy = oy - RY - 4;
      g.fillStyle = mix(GOLD, C.ink, 0.25); g.beginPath(); g.moveTo(sx - 24, sy - 10); g.lineTo(sx + 24, sy - 10); g.lineTo(sx + 9, sy + 10); g.lineTo(sx - 9, sy + 10); g.closePath(); g.fill();   // the setting
      g.fillStyle = GOLD; [-20, -7, 7, 20].forEach(dx => { g.beginPath(); g.moveTo(sx + dx * 0.55 - 3, sy + 4); g.lineTo(sx + dx + 3, sy - 26); g.lineTo(sx + dx * 0.55 + 4, sy + 4); g.fill(); });   // claws
      const gem = [[sx - 22, sy - 18], [sx - 12, sy - 34], [sx + 12, sy - 34], [sx + 22, sy - 18], [sx, sy - 2]];
      g.fillStyle = C.cardPaper; g.beginPath(); gem.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill();
      g.fillStyle = mix(C.cardPaper, C.fireMid, 0.45); g.beginPath(); g.moveTo(sx - 22, sy - 18); g.lineTo(sx + 22, sy - 18); g.lineTo(sx, sy - 2); g.closePath(); g.fill();   // the pavilion, catching the fire
      g.strokeStyle = mix(C.cardPaper, C.ink, 0.35); g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx - 12, sy - 34); g.lineTo(sx - 6, sy - 18); g.lineTo(sx, sy - 2); g.lineTo(sx + 6, sy - 18); g.lineTo(sx + 12, sy - 34); g.stroke();
      INS.marina.stone = [sx + 4, sy - 26];
    } else {
      // nothing at all: the floor, the light, and a space the size of a person where the count went past them
      tiles(g, I.hz, 300);
    }
    return (_ins[id] = cv);
  }
  function glint(g, em, x, y, s, col) {
    g.save(); g.fillStyle = col; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x - s * 0.12, y - s * 0.12); g.lineTo(x, y - s * 1.6); g.lineTo(x + s * 0.12, y - s * 0.12); g.lineTo(x + s, y); g.lineTo(x + s * 0.12, y + s * 0.12); g.lineTo(x, y + s * 1.6); g.lineTo(x - s * 0.12, y + s * 0.12); g.closePath(); g.fill(); g.restore();
    if (em) { em.save(); em.fillStyle = col; em.beginPath(); em.arc(x, y, s * 1.4, 0, TAU); em.fill(); em.restore(); }
  }
  function drawInsert(c, lt, m) {
    const g = c.g, em = c.em, u = lt - m.t0, shuffle = m.i >= 5, I = INS[m.id], [ox, oy] = I.at;
    // a push on every insert, harder once the count slips
    const z = 1 + (shuffle ? 0.1 : 0.04) * (u / (m.t1 - m.t0)) + (shuffle ? 0.05 : 0);
    g.save(); g.translate(ox, oy); g.scale(z, z); g.translate(-ox, -oy); g.drawImage(insertLayer(m.id), 0, 0);
    em.save(); em.translate(ox, oy); em.scale(z, z); em.translate(-ox, -oy);
    // the fire breathing on it
    const fk = Y().flicker(lt * 1.3, m.i);
    g.save(); g.globalAlpha = 0.06 + 0.1 * fk; g.globalCompositeOperation = 'screen'; g.fillStyle = C.fireMid; g.beginPath(); g.ellipse(ox + (I.side || 0) * 240, oy + 10, 330, 100, 0, 0, TAU); g.fill(); g.restore();
    if (m.id === 'deena' && em) { em.save(); em.strokeStyle = C.fireMid; em.globalAlpha = 0.35 + 0.3 * fk; em.lineWidth = 10; em.beginPath(); em.ellipse(ox, oy - 70, 236, 178, -0.3, -1.4, 0.75); em.stroke(); em.restore(); }
    if (m.id === 'marina') { const sp = INS.marina.stone; glint(g, em, sp[0], sp[1], 28 + 12 * fk, C.cardPaper); }
    // embers drifting down through the smoke
    { const r = O.rng('emb' + m.id); g.fillStyle = C.fireMid; for (let i = 0; i < 26; i++) { const x0 = r() * W, sp = 60 + r() * 120, ph = r() * 20; const y = ((lt + ph) * sp) % (H + 100) - 50, x = x0 + 30 * Math.sin(lt * 1.3 + i); g.globalAlpha = 0.5 + 0.5 * r(); g.fillRect(x, y, 3, 3); } g.globalAlpha = 1; }
    g.restore(); em.restore();
    // the names, each in its own face, circling the thing he is looking at; they pile up as he counts, and spin faster once he can't hold them
    if (m.id !== 'empty') {
      const names = shuffle ? ['deena', 'christof', 'angelo', 'kay', 'marina'] : MONT.slice(0, m.i + 1).map(q => q.id);
      const spin = shuffle ? 1.6 + (m.i - 5) * 0.32 : 0.55, tq = lt - T.mont0;
      const ci = names.indexOf(m.id);
      const items = names.map((id, j) => {
        const th = Math.PI / 2 + 0.25 + (j - ci) * TAU / names.length + (lt - m.t0) * spin + (shuffle ? tq * 0.9 : 0);
        const depth = Math.sin(th);
        return { id, j, x: ox + Math.cos(th) * (560 + 20 * j), y: oy - 40 + depth * (230 + 10 * j), depth };
      }).sort((a, b) => a.depth - b.depth);
      items.forEach(it => {
        const cur = it.id === m.id, F = O.FACE[it.id], k = (it.depth + 1) / 2;
        O.text(g, WHO[it.id], it.x, it.y, { family: F.family, weight: F.weight, style: F.style, size: F.size * (0.72 + 0.45 * k) * (cur ? 1.12 : 0.95), color: cur ? F.color : C.ash, align: 'center', alpha: (0.3 + 0.7 * k) * (cur ? 1 : 0.75) });
      });
    }
    // the number he gets to, in his own ash; once it slips it won't sit still
    const empty = m.id === 'empty';
    const n = shuffle && !empty && (Math.floor(u / 0.09) % 3 === 2) ? ((m.n + 2) % 5) + 1 : m.n, jit = empty ? 7 : shuffle ? 6 : 1.5;
    const nx = 200 + jit * FL.wob(lt, 12, 8), ny = 360 + jit * FL.wob(lt, 12, 9);
    const NUM = { family: 'Libre Franklin', weight: 500, size: 150, color: empty ? mix(C.ash, C.cardPaper, 0.3) : C.ash, alpha: empty ? 1 : 0.9 };
    if (empty) {
      // the one past the truth: brighter than the five, and it won't sit still: on every other pair of frames it doubles, a ghost of itself
      const k = Math.floor(u * 12);
      if (k % 2 === 1) O.text(g, '6', nx + 15 + 4 * (k % 3), ny - 7, Object.assign({}, NUM, { alpha: 0.32 }));
    }
    O.text(g, String(n), nx, ny, NUM);
  }

  // ======================================================================= the hands (insert): his ink hand round a hand of ember light
  // his forearm from off frame (lower left), the burned cuff at mid-forearm, the hand closed round the other. Static: its shadow, ink,
  // rims and char are cut once into a layer at the shot's screen resolution (the knockout is live: it breathes with the hearts)
  let _hl = null, _handsK = null;
  function handsLayer(K) {
    if (_hl && _hl.K === K) return _hl;
    const R = 1.65, bx = 360, by = 520, bw = 1000, bh = 580, cv = O.makeCanvas(Math.ceil(bw * R), Math.ceil(bh * R)), g = cv.getContext('2d');
    g.setTransform(R, 0, 0, R, -bx * R, -by * R);
    const k = K.L / 300, wr = K.wrist, el = [wr[0] - 520 * k, wr[1] + 270 * k], sh = [el[0] - 380 * k, el[1] + 330 * k];
    const arm = S().capsule(sh[0], sh[1], 74 * k, el[0], el[1], 58 * k).capsule(el[0], el[1], 54 * k, wr[0], wr[1], 36 * k);
    const a = [lerp(el[0], wr[0], 0.32), lerp(el[1], wr[1], 0.32)], cuff = S(), r = O.rng('cuff');
    cuff.capsule(a[0] - 70 * k, a[1] + 40 * k, 66 * k, a[0] + 4 * k, a[1] + 2 * k, 63 * k);
    for (let i = 0; i < 6; i++) { const x = a[0] + (-30 + i * 13 + (r() - 0.5) * 6) * k, y = a[1] + (-48 + i * 15) * k; cuff.poly([[x - 10 * k, y], [x + 10 * k, y + 3 * k], [x + (30 + r() * 30) * k, y + (-4 + r() * 22) * k]]); }
    const ink = S().add(arm).add(cuff).add(K.sBack).add(K.sFing).add(K.sThumb), ip = ink.path(0.8, 13);
    O.castShadow(g, ink, [1, 0, 0.25, 0.16, -0.25 * 780, 0.84 * 780], 0.5);
    g.fillStyle = C.ink; g.fill(ip);
    const L = Y().anchors.hands.fire;
    O.silhouette(g, ip, { noFill: true, light: { x: L[0], y: L[1] }, rimColor: mix(C.fireOuter, C.fireMid, 0.6), rimW: 3, at: [wr[0] - 220, wr[1] + 120], bbox: { x: -200, y: 450, w: 1500, h: 800 } });
    // the warmth on the underside of his fingers, from the hand he holds (fire-family: the ember is only the cut itself)
    O.silhouette(g, S().add(K.sFing).add(K.sThumb).path(0.8, 11), { noFill: true, light: { x: wr[0] + 500, y: wr[1] + 160 }, rimColor: mix(C.ink, C.fireMid, 0.66), rimW: 3.5, at: K.ap(0.1, 0), bbox: K.sFing.bbox() });
    { const r2 = O.rng('cuffchar'); g.fillStyle = mix(C.ink, C.fireMid, 0.7); for (let i = 0; i < 14; i++) g.fillRect(a[0] + (-46 + r2() * 90) * k, a[1] + (-52 + r2() * 90) * k, 2, 2); }
    return (_hl = { K, cv, bx, by, bw, bh, fingers: S().add(K.sFing).add(K.sThumb).path(0.8, 11) });
  }
  function drawHands(c, lt, st, K, depth) {
    const g = c.g, Hl = handsLayer(K); Y().back(c, lt, st, 'hands');
    RIG.cu.drawClasp(g, c.f, K, { depth, drawHis: false });
    // his fingers closed OVER it: where they wrap, they hide the light (the ember shows between and beyond them, never through them)
    { const hc = c.f.markHoles(); hc.save(); hc.globalCompositeOperation = 'destination-out'; hc.fill(Hl.fingers); hc.restore(); }
    g.drawImage(Hl.cv, Hl.bx, Hl.by, Hl.bw, Hl.bh);
    Y().front(c, lt, st, 'hands');
  }


  // ======================================================================= the shots
  const shots = [];
  const shot = (at, name, draw, extra) => shots.push(Object.assign({ at, name, draw(c, st, lt) { draw(c, st, lt); c.reset(); drawTimer(c, lt); drawAddr(c, lt); drawStay(c, lt); } }, extra || {}));
  const houseCam = (c, lt, s, cam) => { Y().camera(c, 'house', lt, s, cam); Y().back(c, lt, s, 'house'); };
  const f02 = (c, lt, s, cam) => { Y().camera(c, 'scott', lt, s, cam); Y().back(c, lt, s, 'scott'); };

  // 1. LATER. A hard cut in from Q11's yard (a wide) to the F02 framing, so the cut reads as time passed and never repeats the wide: his
  // face in the screen's light, the one cold light in all that fire; at 2.9 the thumb starts to hover. One shot, a slow push, into the
  // keypad. (His place on the lawn is set up by the next wide, the house at 42.3.)
  const lookSpec = (lt, extra) => { const a = Y().anchors.scott.seat; return Object.assign({ x: a.hip[0], y: a.ground, scale: a.scale, facing: -1, t: lt, breath: false, pose: grassPose({ breath: breathU(lt, 0.5, 0.05, 0.03) }) }, extra); };
  shot(0, 'f02: later, the screen on his face', (c, st, lt) => {
    const s = yst(lt); f02(c, lt, s, { x: 760, y: 520, zoom: 1.09 + 0.04 * E.inOutSine(seg(lt, 0, T.padA)) });
    const tap = seg(lt, T.phoneUp, T.phoneUp + 0.6) * (0.5 + 0.5 * Math.sin(lt * 9));
    drawF02(c, RIG.figure('scott', lookSpec(lt, { hold: { N: { kind: 'phoneLook', glow: true, tap, tremble: 5 } } })), lt, s);
    Y().front(c, lt, s, 'scott');
  });
  // 2. The keypad
  shot(T.padA, 'insert: keypad, two misses', (c, st, lt) => drawKeypad(c, lt), { post: { vignette: 0.7, halation: 0.6 } });
  shot(T.face2, 'f02: his face, the breath catching', (c, st, lt) => {
    const s = yst(lt); f02(c, lt, s, { x: 760, y: 500, zoom: 1.2 });
    drawF02(c, RIG.figure('scott', lookSpec(lt, { hold: { N: { kind: 'phoneLook', glow: true, tap: 0, tremble: 6 } }, headAdd: 0.2 * Math.sin(seg(st, 0.1, 0.8) * Math.PI) })), lt, s);
    Y().front(c, lt, s, 'scott');
  });
  shot(T.padB, 'insert: keypad, 999, call', (c, st, lt) => drawKeypad(c, lt), { post: { vignette: 0.7, halation: 0.6 } });

  // 3. The call (the Q01 framing): phone at his LEFT ear, his free RIGHT hand planted on the grass
  shot(T.ear, 'f02: the call', (c, st, lt) => {
    const s = yst(lt); f02(c, lt, s, { x: 900, y: 560, zoom: 1.06 });
    callScott(c, lt, s); Y().front(c, lt, s, 'scott');
  });
  shot(T.addrShot, 'f02 close: his address', (c, st, lt) => {                        // barely getting the words out
    const s = yst(lt); f02(c, lt, s, { x: 820, y: 470, zoom: 1.17 });
    callScott(c, lt, s, { rate: 0.55, amp: 0.05, tension: 0.06, spec: { headAdd: 0.1 } }); Y().front(c, lt, s, 'scott');
  });
  shot(T.injured, 'f02: are you injured', (c, st, lt) => {                             // he glances down at himself
    const s = yst(lt); f02(c, lt, s, { x: 960, y: 540, zoom: 1.0 });
    const bow = 0.22 * E.inOutSine(seg(lt, T.L239 - 0.6, T.L239)) * (1 - E.inOutSine(seg(lt, T.L239 + 1.8, T.L239 + 2.6)));
    callScott(c, lt, s, { spec: { headAdd: bow, neckAdd: 0.6 * bow } }); Y().front(c, lt, s, 'scott');
  });
  shot(T.inside, 'f02: is anybody still inside', (c, st, lt) => {                    // he turns his head toward the house
    const s = yst(lt); f02(c, lt, s, { x: 900, y: 560, zoom: 1.08 });
    const lk = seg(lt, T.look, T.look + 0.8, E.hover);
    callScott(c, lt, s, { spec: lk > 0 ? { look: [1500, 420], lookAmt: lk } : {} }); Y().front(c, lt, s, 'scott');
  });
  // 4. The house, close and low: the upstairs window over him collapses inward. Local over the set's own collapse (creak, lintel,
  // sparks): the sash and frame drop into the room against the fire, the opening goes black (the fire draws breath), then it surges
  // out taller than before. He flinches on the crash.
  const WIN2 = { x: 1020, y: 468, w: 114.5, h: 127.4 };          // 'house' window 2 (HM upstairs right) in world px
  const TFALL = T.collapse + 0.45, TBLACK = TFALL + 0.27, TSURGE = TFALL + 0.47;
  function collapseFx(c, lt) {
    const u = lt - TFALL; if (u < 0 || u > 1.6) return;
    const g = c.g, em = c.em, { x: X, y: Y0, w: Wd, h: Hd } = WIN2;
    if (u < 0.3) {          // the frame and sash, falling in: down, shrinking away from us, tipping
      const p = E.inQuad(u / 0.3), sc = 1 - 0.38 * p;
      g.save(); g.translate(X + Wd / 2 + 8 * p, Y0 + Hd / 2 + 0.5 * Hd * p); g.rotate(0.3 * p); g.scale(sc, sc * (1 - 0.25 * p));
      const fr = S().rect(-Wd / 2 - 3, -Hd / 2 - 3, Wd + 6, 11).rect(-Wd / 2 - 3, Hd / 2 - 8, Wd + 6, 11).rect(-Wd / 2 - 3, -Hd / 2, 11, Hd).rect(Wd / 2 - 8, -Hd / 2, 11, Hd)
        .rect(-4, -Hd / 2, 8, Hd).rect(-Wd / 2, -4, Wd, 8);
      g.fillStyle = C.ink; g.fill(fr.path(0.8, 71)); g.restore();
    }
    const blk = u < TBLACK - TFALL - 0.05 ? 0 : u < TBLACK - TFALL ? (u - (TBLACK - TFALL - 0.05)) / 0.05 : u < TSURGE - TFALL ? 1 : 1 - (u - (TSURGE - TFALL)) / 0.1;
    if (blk > 0) {          // the opening goes black: the fire swallowed for a breath (the flames above it drop too)
      const hole = S().rect(X - 3, Y0 - 52, Wd + 6, Hd + 56).path(1.4, 72);
      g.save(); g.globalAlpha = 0.95 * sat(blk); g.fillStyle = C.ink; g.fill(hole); g.globalAlpha = 0.6 * sat(blk); g.fillRect(X - 10, Y0 - 190, Wd + 20, 140); g.restore();
      em.save(); em.globalCompositeOperation = 'destination-out'; em.globalAlpha = sat(blk); em.fillRect(X - 30, Y0 - 200, Wd + 60, Hd + 210); em.restore();
    }
    const v = lt - TSURGE;
    if (v > 0 && v < 1.1) {  // the surge: a tongue that overfills the opening and climbs the wall, then settles back into the set's fire
      const k = Math.exp(-v * 2.6) * Math.min(1, v / 0.06);
      O.flame(g, X + Wd / 2 + 6, Y0 + Hd - 4, Wd * (0.8 + 0.25 * k), Hd * 0.7 + 250 * k, 83, lt);
      O.flame(g, X + Wd / 2 - 26, Y0 + Hd - 12, Wd * 0.5, Hd * 0.5 + 150 * k, 91, lt * 1.15);
      em.save(); em.globalAlpha = 0.45 * k; em.fillStyle = C.fireMid; em.beginPath(); em.ellipse(X + Wd / 2, Y0 + Hd * 0.1 - 60 * k, Wd * 0.55, Hd * 0.6 + 90 * k, 0, 0, TAU); em.fill(); em.restore();
    }
  }
  shot(T.house2, 'house: the window collapses', (c, st, lt) => {
    const s = yst(lt), a = Y().anchors.house.seat;
    houseCam(c, lt, s, { x: 1320, y: 700, zoom: 1.6 + 0.006 * st });
    collapseFx(c, lt);
    const fl = lt > TFALL ? Math.exp(-(twos(lt) - TFALL) * 3) * Math.min(1, (twos(lt) - TFALL) / 0.08) : 0;     // the flinch, on twos
    const sp = { x: a.hip[0], y: a.ground, scale: a.scale, facing: -1, t: lt, breath: false, pose: grassPose({ breath: breathU(lt, 0.5, 0.05, 0.05) }), hold: { N: { kind: 'phone', glow: true } }, look: [1077, 532], lookAmt: 1, headAdd: -0.16 * fl, leanAdd: -0.07 * fl };
    drawRig(c, RIG.figure('scott', sp), 'house', lt, s, a.hip);
    Y().front(c, lt, s, 'house');
  });
  // 5. Tighter on him: 'How many friends?'
  shot(T.near, 'f02 close: five', (c, st, lt) => {
    const s = yst(lt); f02(c, lt, s, { x: 820, y: 470, zoom: 1.16 });
    const head = lt > T.L244 + 1.2 ? seg(lt, T.L244 + 1.2, T.mont0, E.inOutSine) * 0.16 : 0;     // trying to count, his head goes down
    callScott(c, lt, s, { rate: 0.6, amp: 0.05, tension: 0.06, spec: { headAdd: 0.04 + head, neckAdd: 0.5 * head } });
    Y().front(c, lt, s, 'scott');
  });
  // 6. The count
  MONT.forEach(m => shot(m.t0, 'count: ' + m.id + ' ' + m.n, (c, st, lt) => drawInsert(c, lt, m), { post: { vignette: 0.75, halation: 0.6 } }));
  // 7. 'I don't know.'
  shot(T.L245 - 0.2, "f02 close: I don't know", (c, st, lt) => {
    const s = yst(lt); f02(c, lt, s, { x: 840, y: 470, zoom: 1.2 });
    const shake = 0.13 * Math.sin(twos(lt) * 7.5) * seg(lt, T.L245 + 0.3, T.L245 + 1.0) * (1 - seg(lt, T.L245 + 4.5, T.L245 + 6));
    callScott(c, lt, s, { rate: 0.75, amp: 0.06, tension: 0.07, spec: { headAdd: 0.1 + shake, neckAdd: 0.06 } });
    Y().front(c, lt, s, 'scott');
  });
  // 8. 'You're outside. You're safe for now.' Behind him, facing the fire: he hears her, and doesn't believe her.
  function behindShot(c, lt, cam) {
    // the warmth closing round his hand; on the squeeze back, the light in it swells once
    const sq = lt > T.two - 0.5 ? Math.exp(-(lt - (T.two - 0.5)) * 2.5) : 0;
    const warm = seg(lt, T.warm, T.warm + 1.6, E.inOutSine), pl = Math.max(pulseAt(lt), sq);
    const s = yst(lt, { handGlow: warm * (0.86 + 0.14 * pl) });
    Y().camera(c, 'ending', lt, s, cam); Y().back(c, lt, s, 'ending');
    const drop = lt >= T.two ? 1 : 0;
    const B = drawBack(c, lt, backPose(lt), drop ? 0.004 : 0.008, drop ? 0.2 : 0.55);
    c.em.save(); c.em.fillStyle = C.phoneWhite; c.em.globalAlpha = 0.5; c.em.beginPath(); c.em.ellipse(B.phoneC[0], B.phoneC[1], 12, 30, 0.4, 0, TAU); c.em.fill(); c.em.restore();
    if (warm > 0) RIG.cu.drawClasp(c.g, c.f, B.K, { depth: warm * (0.9 + 0.1 * pl), drawHis: false });
    Y().front(c, lt, s, 'ending');
  }
  shot(T.behind, "behind him: you're safe for now", (c, st, lt) => behindShot(c, lt, { x: 900, y: 580, zoom: 1.0 + 0.035 * E.inOutSine(seg(lt, T.behind, T.prof)) }));
  // 9. Close, in profile: 'How many people made it out?' He wipes his face on his sleeve.
  // the wipe, on twos: the free right hand leaves the grass and comes FORWARD, low in front of his chest; the forearm rises with the
  // elbow down and forward until the sleeve lies across his eyes and nose and breaks the profile; the head ducks into it and drags
  // across (held ~0.35 s); then the arm drops the same way back to the grass
  const WIPE2 = [T.wipe, T.wipe + 0.5, T.wipe + 0.85, T.wipe + 1.5];   // up, across the eyes (held, dragging), down, planted
  shot(T.prof, 'f02 close: he wipes his face', (c, st, lt) => {
    const s = yst(lt); f02(c, lt, s, { x: 840, y: 470, zoom: 1.2 });
    const P = plant(), a = Y().anchors.scott.seat, tq = twos(lt), spec = { headAdd: 0.08 };
    const hold = { N: { kind: 'phone', glow: true } };
    if (tq > WIPE2[0] && tq < WIPE2[3]) {
      const hu = (x, y) => [P.head[0] - x * a.scale, P.head[1] + y * a.scale];      // head-relative, x = units FORWARD (he faces left)
      // the right forearm across the face points at the camera (from his right elbow to his left eye), so it is drawn short (fk):
      // the sleeve juts forward of the profile at the eyes, and the fist stays inside the head's silhouette
      // (shoulder at 0.17 back, 0.94 down; with uk 0.82 / fk 0.81 the elbow lands ~0.95 forward, 0.62 down: below and in front of the
      // face; the forearm rises from it across the profile at the nose and the fist ends over the brow)
      const chest = hu(0.9, 1.9), eye = hu(0.3, -0.12), drag = hu(0.1, -0.04);
      const bez = (p0, p1, p2, u) => [(1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * p1[0] + u * u * p2[0], (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * p1[1] + u * u * p2[1]];
      const u1 = E.inOutSine(seg(tq, WIPE2[0], WIPE2[1])), u2 = E.inOutSine(seg(tq, WIPE2[1], WIPE2[2])), u3 = E.inOutSine(seg(tq, WIPE2[2], WIPE2[3]));
      let to = u2 <= 0 ? bez(P.wrist, chest, eye, u1) : [lerp(eye[0], drag[0], u2), lerp(eye[1], drag[1], u2)];
      if (u3 > 0) to = bez(drag, chest, P.wrist, u3);
      const fs = Math.min(u1, 1 - u3);
      hold.F = null; spec.armF = { to, elbow: 'downfwd', uk: 1 - 0.18 * fs, fk: 1 - 0.19 * fs, hand: 'fist', handOpts: { curl: 0.7 } };
      const on = Math.min(seg(tq, WIPE2[0] + 0.3, WIPE2[1]), 1 - seg(tq, WIPE2[2], WIPE2[2] + 0.3));
      spec.headAdd += 0.1 * Math.sin(seg(tq, WIPE2[0], WIPE2[3]) * Math.PI) + 0.12 * on; spec.leanAdd = 0.06 * on;
    }
    spec.hold = hold;
    callScott(c, lt, s, { rate: 0.6, amp: 0.05, tension: 0.07, spec, noBlisters: !!spec.armF }); Y().front(c, lt, s, 'scott');
  });
  // 10. Behind him again, held. 'Me.' / the warmth / 'Two.' / the phone lowered
  shot(T.climax, 'behind him: me / two', (c, st, lt) => behindShot(c, lt, { x: 820, y: 620, zoom: 1.05 + 0.05 * E.inOutSine(seg(lt, T.climax, T.lower + 1.2)) }));
  // 11. THEIR HANDS
  // looking down onto the grass (the horizon and the toy house cropped away; the fire's light rakes in from the top left)
  shot(T.hands, 'hands: held', (c, st, lt) => {
    const pl = pulseAt(lt), s = yst(lt, { handGlow: 0.86 + 0.14 * pl });
    Y().camera(c, 'hands', lt, s, { x: 990, y: 704, zoom: 1.6 + 0.004 * st });
    drawHands(c, lt, s, _handsK || (_handsK = RIG.cu.clasp(1000, 742, 236, 0.05, 0.9)), 0.9 + 0.1 * pl);
  }, { post: { vignette: 0.6 } });
  // 12. Cut wide: the whole house burning, and him small on the lawn at the right, in profile, facing it. No second figure: only a
  // hand-shaped light on the grass at his right, and empty lawn where a body would be. Everything dims to ink but the hand. FADE OUT.
  // the phone lowered: his near forearm on his knee, the phone loose in the hand, its screen edge still lit (drawn locally: RIG's
  // phoneLow dangles from a standing hip)
  const wideFig = (lt, a) => RIG.figure('scott', { x: a.hip[0], y: a.ground, scale: a.scale, facing: -1, t: lt, breath: false, idleAmt: 0.3,
    pose: grassPose({ breath: breathU(lt, 0.2, 0.02, -0.02), head: 0.1 }), armN: { hand: 'hold' } });
  function lowPhone(c, F, sc, glow) {
    const w = F.joints.wristN, e = F.joints.elbowN, a = Math.atan2(w[1] - e[1], w[0] - e[0]) + 0.5, cx = w[0] + Math.cos(a) * 0.22 * sc, cy = w[1] + Math.sin(a) * 0.22 * sc;
    const g = c.g; g.save(); g.translate(cx, cy); g.rotate(a); g.fillStyle = C.ink; g.fillRect(-0.34 * sc, -0.08 * sc, 0.68 * sc, 0.16 * sc);
    g.strokeStyle = C.phoneWhite; g.globalAlpha = glow; g.lineWidth = 2; g.beginPath(); g.moveTo(-0.32 * sc, -0.08 * sc - 1); g.lineTo(0.3 * sc, -0.08 * sc - 1); g.stroke(); g.restore();
    c.em.save(); c.em.globalAlpha = 0.5 * glow; c.em.fillStyle = C.phoneWhite; c.em.beginPath(); c.em.ellipse(cx, cy - 0.1 * sc, 0.3 * sc, 0.12 * sc, a, 0, TAU); c.em.fill(); c.em.restore();
  }
  let _wideK = null;
  shot(T.wide, 'wide: the house burns, no one beside him', (c, st, lt) => {
    const pl = pulseAt(lt), s = yst(lt), a = Y().anchors.house.seat;
    Y().camera(c, 'house', lt, s, { x: 960, y: 540, zoom: 1 });
    Y().back(c, lt, s, 'house');
    // he is nearly still and 64 px a head here (his breath is a pixel): the figure is sampled every 0.5 s and its rim every 0.25 s,
    // so the sprite cache holds instead of missing on every pair
    const lq = Math.floor(lt * 4) / 4, F = wideFig(Math.floor(lt * 2) / 2, a);
    if (!_wideK) { const w = wideFig(T.wide, a).joints.wristF; _wideK = RIG.cu.clasp(w[0] + 0.6 * 1.1 * a.scale, w[1] + 1, 1.1 * a.scale, 0.04, 0.55); }
    const K = _wideK, P = K.ap(0.25, 0.05);
    // the warm place at his right: a small pool on the lawn, breathing with the locked hearts
    O.lightPool(c.g, P[0] + 6, P[1] + 4, [{ r: 170 * (0.97 + 0.05 * pl), color: mix(C.grass, C.fireOuter, 0.22) }, { r: 92 * (0.97 + 0.05 * pl), color: mix(C.grass, C.fireOuter, 0.4) }], { sy: 0.26, rough: 2, seed: 41 });
    drawRig(c, F, 'house', lt, s, a.hip, null, lq);
    lowPhone(c, F, a.scale, 1 - 0.7 * s.dim);
    RIG.cu.drawClasp(c.g, c.f, K, { depth: 0.92 + 0.08 * pl, drawHis: true });
    Y().front(c, lt, s, 'house');
  }, { fade: (st, d) => seg(st, d - 1.1, d - 0.05, E.inQuad) });
  // 13. THE END
  shot(T.card, 'end card', (c, st) => {
    if (st < T.cardLead) { c.g.fillStyle = C.ink; c.g.fillRect(0, 0, W, H); return; }
    SETS.title.endcard(c, st - T.cardLead, { extra: true });
  }, { post: { grain: 0.06, vignette: 0.35, halation: 0.75 } });

  // ======================================================================= sound
  const SD = window.SOUND;
  if (SD) {
    const { db, osc, src, filt, gain, pan, chain, perc } = SD;
    // a second siren, a different vehicle, getting nearer: brighter and louder, sweeping across
    SD.cues['Q12.siren'] = (ac, B, t, p) => {
      const d = p.dur || 60, g = gain(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(db(p.from || -50), t + 3); g.gain.linearRampToValueAtTime(db(p.to || -31), t + d - (p.fo || 8)); g.gain.linearRampToValueAtTime(0, t + d);
      const pn = pan(ac, -0.4); if (pn.pan) { pn.pan.setValueAtTime(-0.4, t); pn.pan.linearRampToValueAtTime(0.3, t + d); }
      const rec = SOUND.sirenRec(ac, g, t, t + d, 900);   // the recorded siren, opening up as it nears
      if (rec) { rec.frequency.setValueAtTime(900, t); rec.frequency.linearRampToValueAtTime(3500, t + d * 0.8); chain(g, pn); pn.connect(B.room); pn.connect(B.reverb); return; }
      const o = osc(ac, 'triangle', 690, t, t + d); for (let x = t; x < t + d; x += 1.3) { o.frequency.setValueAtTime(690, x); o.frequency.setValueAtTime(870, x + 0.65); }
      const lp = filt(ac, 'lowpass', 700, 0.5); lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(1900, t + d * 0.8);
      chain(o, lp, g, pn); pn.connect(B.room); pn.connect(B.reverb);
    };
    // the line opening: a click and a breath of narrowband noise
    SD.cues['Q12.pickup'] = (ac, B, t, p) => {
      const g = gain(ac, 0); perc(g, t, db(p.level || -24), 0.0008, 0.03); chain(src(ac, 'white', 201, t, t + 0.1), filt(ac, 'bandpass', 2400, 3), g, B.fx);
      const n = gain(ac, 0); n.gain.setValueAtTime(0, t + 0.02); n.gain.linearRampToValueAtTime(db(-44), t + 0.1); n.gain.linearRampToValueAtTime(db(-50), t + 0.5); n.gain.linearRampToValueAtTime(0, t + 0.6);
      chain(src(ac, 'white', 202, t, t + 0.7), filt(ac, 'bandpass', 1700, 1.2), n, B.dialogue);
    };
    // the end card's tally mark, so its level can go down. The shared 'tally' adds its 30 Hz chop (+-0.5) straight onto the envelope's
    // gain, so every mark plays near -6 dB whatever its level (lowering the level there changes nothing you can hear). Here: the same
    // graph, voiced exactly as the shared cue sounded at level -20 (what the film's tallies were tuned by ear against), then trimmed by
    // (level - -20) dB, so level -32 is that same mark 12 dB down
    SD.cues['Q12.tally'] = (ac, B, t, p) => {
      const g = gain(ac, 0); perc(g, t, db(-20), 0.002, 0.06);
      const am = osc(ac, 'square', 30, t, t + 0.1), ag = gain(ac, 0.5); chain(am, ag); ag.connect(g.gain);
      chain(src(ac, 'white', 91, t, t + 0.1), filt(ac, 'bandpass', 3500, 2), g, gain(ac, db((p.level == null ? -20 : p.level) + 20)), pan(ac, p.pan || 0), p.faint ? B.extra : B.fx);
    };
    // the house groaning before the window goes: a slow, low creak
    SD.cues['Q12.creak'] = (ac, B, t, p) => {
      const d = p.dur || 0.45, g = gain(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(db(p.level || -24), t + d * 0.3); g.gain.linearRampToValueAtTime(db((p.level || -24) - 6), t + d * 0.9); g.gain.linearRampToValueAtTime(0, t + d);
      const o = osc(ac, 'sawtooth', 92, t, t + d + 0.05); o.frequency.linearRampToValueAtTime(64, t + d);
      const v = osc(ac, 'square', 23, t, t + d + 0.05), vg = gain(ac, 14); chain(v, vg); vg.connect(o.frequency);
      chain(o, filt(ac, 'bandpass', 380, 2.5), g, B.fx); g.connect(B.reverb);
    };
  }
  function sound(S) {
    // the tinnitus from Q11, dying away as the world comes back; the fire; the sirens creeping closer; the Extra's drone until 'Two.'
    S.bed('tinnitus', 0, 6.5, { level: -32, fi: 0.05, fo: 4.5 });
    // ...until 'Me.': then the fire and the sirens drop away and only his ear rings, until the warmth closes round his hand.
    // After 'Two.' the world comes back, far off, and goes out with the light.
    // the world drops out on the cut behind him (fade from T.climax + 0.6, gone by 85.6): from there to the warmth, only his ear and his heart
    const HOLLOW = T.climax + 1.3;
    S.bed('fire', 0, HOLLOW, { level: -23, near: 0.55, fi: 0.04, fo: 0.7 });
    S.bed('siren', 0, HOLLOW, { level: -34 });                     // (the siren bed's fade is fixed at 2 s)
    S.cue('Q12.siren', 24, { dur: HOLLOW - 24, from: -50, to: -33, fo: 0.7 });
    S.bed('tinnitus', T.climax + 0.4, T.warm + 1.2, { level: -40, fi: 1.1, fo: 1.0 });
    S.bed('fire', T.two + 0.3, T.yardEnd, { level: -31, near: 0.3, fi: 4, fo: 9 });
    S.bed('siren', T.two + 1.5, T.yardEnd, { level: -40, fo: 8 });
    // the Extra's drone, low under the call. It breaks off for the empty '6' (64.25-64.95 is near silence: only the wrong ping) and comes
    // back on the hit; it goes out with the world on the drop (gone by 85.6: from there only his ear and his heart)
    const DRONE = { level: -46, seventh: -41 };
    S.bed('drone7', 0, EMPTY.t0 - 0.05, Object.assign({ fi: 5, fo: 0.15 }, DRONE));
    S.bed('drone7', T.mont1, HOLLOW, Object.assign({ fi: 0.3, fo: 0.7 }, DRONE));
    // his heart, under everything until 'Me.'
    S.bed('heart', 4.5, T.mont0, { bpm: 92, bpmTo: 106, level: -27 });
    S.bed('heart', T.mont0, T.mont1, { bpm: 114, bpmTo: 134, level: -19 });
    S.bed('heart', T.mont1, T.L248 - 0.3, { bpm: 110, bpmTo: 98, level: -23 });
    // the keypad: the inserts close in (the room muffled), every press a tone, the clears a dead tick
    S.duck(T.padA - 0.05, T.face2, 0.45); S.duck(T.padB - 0.05, T.ear, 0.45);
    PRESS.forEach(([t, k]) => { if (k === 'call') S.cue('latch', t, { level: -30 }); else S.cue('dtmf', t, { digits: k, level: -23 }); });
    S.cue('ringback', T.ring, { n: 2, level: -27 });
    S.cue('Q12.pickup', T.connect, { level: -22 });
    // what we hear but are not given
    S.cue('land.scott', T.addr, { chars: 17, dur: ADDR.typed, holdEnd: T.addr + ADDR.typed + ADDR_HOLD, end: T.addr + ADDR.typed + ADDR_HOLD + 0.45 });
    S.cue('land.dispatcher', T.stay, { dur: Math.min(STAY.typed, T.L238 - T.stay - 0.3) });     // (cut off by 'Are you injured?')
    // the window
    S.cue('Q12.creak', T.collapse, { dur: 0.5, level: -22 });
    S.cue('crash', T.collapse + 0.48, { level: -15 }); S.cue('hit', T.collapse + 0.48, { f: 38, level: -13, decay: 2.4 }); S.cue('glass', T.collapse + 0.55, { level: -24, pan: -0.25 });
    S.cue('whoosh', TBLACK - 0.06, { dur: TSURGE - TBLACK + 0.06, level: -24 });      // the fire drawing breath through the black opening...
    S.cue('hit', TSURGE, { f: 56, level: -17, decay: 1.4 }); S.cue('swell', TSURGE - 0.02, { dur: 0.35, f: 70, level: -26 });   // ...and the surge
    // the count: souring pings; the one past the truth comes from his right, on the Extra's bus
    // the room ducks under the count, swells back for a breath as it runs away, and then there is nothing at all under the empty insert
    // (S.hole: every bus but the Extra's), so its wrong ping, on the Extra's bus from his right, rings against silence until the hit
    S.duck(T.mont0 - 0.05, EMPTY.t0 - 0.47, 0.32);
    S.hole(EMPTY.t0, T.mont1 - 0.05 - EMPTY.t0);
    S.cue('whoosh', T.mont0 - 0.45, { dur: 0.45, level: -28 });
    MONT.forEach((m, i) => S.cue('ping', m.t0, { i: Math.min(4, m.n - 1), sour: 70 + 7 * i, wrong: m.n > 5, level: m.n > 5 ? -22 : -27 }));
    S.cue('hit', T.mont1, { f: 46, level: -17, decay: 1.2 });
    // the wide: nobody there. A low weight under the cut, and his right is empty but for the heartbeat
    S.cue('hit', T.wide, { f: 33, level: -21, decay: 3.2 });
    // two hearts: his, and one off to his right that drifts into lockstep with it
    BEATS.forEach(b => {
      const fade = 1 - seg(b.t, T.yardEnd - 9, T.yardEnd - 1);
      S.cue('lub', b.t, { pan: -0.08, level: -15 - 10 * (1 - fade) });
      if (b.other != null) S.cue('lub', b.other, { pan: lerp(0.2, 0.75, b.lock), extra: true, level: -18 - 9 * (1 - fade) });
    });
    // 'Two.': the unison in (drone7 went out with the world, above)
    S.bed('unison', T.two, T.yardEnd - 0.2, { level: -26, fi: 2.2, fo: 8 });
    // the end card: two marks, the second on the Extra's bus (soft: the film ends quietly)
    const tt = SETS.title && SETS.title.tallyTimes ? SETS.title.tallyTimes({ marks: 2 }) : [{ t: 0 }, { t: 0.125 }];
    tt.forEach((m, i) => S.cue('Q12.tally', T.card + T.cardLead + m.t, { faint: i === 1, pan: i === 1 ? 0.35 : 0, level: -32 }));
  }

  // ======================================================================= dialogue (ids only; the text comes from the script)
  const D = { draw: dispDraw, x: W / 2, y: BAND_Y, size: DISP_SIZE, opts: { band: true } };
  const SC = (pos, stress, extra) => Object.assign({ x: pos[0], y: pos[1], align: 'right', size: SC_SIZE, opts: { ash: true, color: IVORY, stress } }, extra);
  const lines = [
    Object.assign({ id: 'L237', at: T.L237 }, D),
    Object.assign({ id: 'L238', at: T.L238 }, D),
    SC(POS_L239, 0.3, { id: 'L239', at: T.L239, entrance: 1.0, hold: 1.5 }),
    Object.assign({ id: 'L240', at: T.L240, until: T.house2 - 0.05 }, D),      // cut on the cut: never over the house
    { id: 'L241', at: T.L241, x: 1350, y: 360, size: SC_SIZE, opts: { ash: true, color: IVORY, stress: 0.2 } },   // (in the sky by the fence, as before)
    Object.assign({ id: 'L242', at: T.L242 }, D),
    SC(POS_L243, 0.25, { id: 'L243', at: T.L243, hold: 1.7 }),
    Object.assign({ id: 'L244', at: T.L244 }, D),
    SC(POS_L245, 0.55, { id: 'L245', at: T.L245, hold: 2.6, align: 'left', draw: splitScott(["I don't know.", "I don't know where--", "I don't know."], POS_L245[0], POS_L245[1], POS_L245[2]) }),
    Object.assign({ id: 'L246', at: T.L246 }, D),
    Object.assign({ id: 'L247', at: T.L247, hold: 2.6 }, D),
    // 'Me.' is silent (no type ticks): from the drop at 85.6 only his ear and his heart are heard
    { id: 'L248', at: T.L248, x: POS_ME[0], y: POS_ME[1], align: 'center', size: 160, entrance: 0, until: T.two, silent: true, opts: { ash: true, caret: false, exit: 'cut' } },
    { id: 'L249', at: T.two, x: POS_ME[0], y: POS_ME[1], align: 'center', size: 160, entrance: 0, until: T.yardEnd, noExit: true, opts: { caret: false }, draw: twoDraw },
  ];

  FILM.seq({ id: 'Q12', title: 'Two', dur: T.dur, letterbox: 1.7778, gain: -8, lines, sound, shots });
})();
