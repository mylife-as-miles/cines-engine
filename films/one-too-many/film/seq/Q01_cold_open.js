/* ONE TOO MANY — Q01 COLD OPEN. EXT. SCOTT'S BACK YARD - NIGHT. Lines L001-L004, actions A001-A004. Set: yard.
   Black and silence; the tinnitus; the frame burns open on the burning house; the curtain lifts and burns away; Scott on the
   grass with the phone (F02); the Dispatcher; 'Yeah.'; 'How many got out?' (00:03:24): his chin lifts, he turns to the house;
   over his shoulder the big window bursts; 'I--', the dash guillotined, the caret blinking while the house looms behind his
   frozen head; 'I--' fades by 27.3 and the frame holds clean; SMASH CUT TO BLACK at 30.82, then a second of dead silence.
   Review pass: the Dispatcher at 48 px on a solid hand-cut ink strip (the band shared with Q12), the call timer small (22 px)
   and dim (50%) above it; Scott's answers in warm ivory; Scott small on the lawn in the opening wide (Q12's wide position,
   on the call); the glass cue at -18 so the SMASH stands well clear of it.

   Local additions (nothing in the shared kit, sets or rig is edited):
   - BUST: a hand-cut profile head, neck, shoulder, arm, hand and phone for the close scales (MCU/CU/ECU), with matched
     profile / turned-away contours (the turn toward the house), a jaw that parts the lips, and a back-of-head figure for the
     over-the-shoulder shot. The rig's head is a polygon built for 40-180 px heads; at 300-560 px it stair-steps.
   - curtain cloth: a darker fabric fold and a scorched ink end laid over the set's curtain (same geometry as yard.js).
   - sounds: Q01.fire, Q01.tinn, Q01.ring, Q01.breath, Q01.siren (no reverb send, so it stops dead), Q01.slice, Q01.smash
     (dry, 0.12 s decay, gated to zero 0.18 s after the cut, on the room bus so no reverb tail).

   CONTINUITY / INTEGRATION NOTE (Q11 -> Q12 -> Q01 is one night; Q01 is ~21 s after Q12's 'Two.' in the same call):
   - Timer: Q12 reads 00:02:51 on 'Two.'; Q01 reads 00:03:12 on L001 and 00:03:24 on L003. Consistent if Q12's call keeps
     running at 1x after 'Two.' (Q12 should end at or before about 00:03:00).
   - Curtain: the screenplay puts the curtain lifting and burning away in Q01. Q01 runs it 0.04 -> 1 (gone at 9.9 s). So
     Q11's last house shot (currently curtain 0.3 -> 0.62) and Q12 (currently curtain 1) must keep it hanging inside
     (curtain <= 0.04).
   - Roof: Q01 shows roof 0.35 (the value the 'fence' view uses during Q11's crawl), so the house never heals between Q11 and
     Q01. Q12 currently passes roof 1: it must come down to <= 0.35.
   - Window: Q12's screenplay beat 'a window collapses inward' (collapseWin 2, upstairs right) is honoured here: Q01 shows that
     window in its collapsed state from the first frame.
   - The blown back door burning on the lawn (yard default blown:true) is kept for continuity with Q11/Q12. */
(function () {
  'use strict';
  const O = OTM, { C, W, H, S, mix, rgba } = O;
  const Y = () => SETS.yard;
  const seg = (t, a, b, e) => FILM.seg(t, a, b, e);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const sat = v => clamp(v, 0, 1), smooth = u => { u = sat(u); return u * u * (3 - 2 * u); };

  // ================================================================ the clock
  const T = {
    burn0: 1.5, burn1: 5.3,                       // the frame burns open
    sCurtain: 6.6, sF02: 8.5, sMCU: 14.8, sOTS: 22.4, sECU: 23.85,
    L001: 9.0, L002: 15.8, L004: 24.3,
    glass: 22.95,
  };
  T.L003 = T.L001 + 12;                            // the call timer reads 00:03:12 on L001 and 00:03:24 on L003
  T.sCU = T.L003;                                  // cut in on the question
  T.in4 = T.L004 + 0.035 * 3 + 0.05;               // 'I--' fully typed (the engine types Scott at 35 ms a character)
  T.out4 = 27.3;                                   // 'I--' has faded out (up ~3 s); the frame then holds clean to the SMASH
  T.smash = T.in4 + 12 * 0.53;                     // the caret's seventh blink: SMASH CUT TO BLACK (30.82, fixed)
  T.gate = T.smash + 0.18;                         // the thud is gated to nothing here
  T.dur = T.gate + 1.0;                            // then one full second of dead silence
  const FREEZE = T.L004 + 0.5;                     // he stops breathing; only the world moves

  const CALL0 = 3 * 60 + 12;                       // seconds into the call at L001
  const pad = n => String(n).padStart(2, '0');
  const callAt = lt => CALL0 + Math.floor(lt - T.L001 + 1e-6);
  const timerStr = lt => { const s = callAt(lt); return '00:' + pad(Math.floor(s / 60)) + ':' + pad(s % 60); };

  // the yard at any instant: one curtain, one window, one strobe for every view (continuity across the cuts)
  const ROOF = 0;
  function yardState(lt) {
    return {
      curtain: FILM.key(lt, [[1.5, 0.04], [6.6, 0.3], [7.45, 0.52, 'inOutSine'], [8.8, 0.92, 'linear'], [9.9, 1, 'outQuad']]),
      strobe: 0.2, glassBreak: T.glass, roof: ROOF, windowCollapse: -100, collapseWin: 2,
      fire: FILM.key(lt, [[T.sOTS, 1], [T.glass - 0.04, 0.8, 'inQuad'], [T.glass + 0.02, 1, 'linear']]),
    };
  }

  // ================================================================ F02: the rig figure at scale 180 (the approved frame)
  function perfF02(lt) {
    const head = RIG.key('scott', lt, [[0, 0.02], [T.L001 + 2.6, 0.02], [T.L001 + 3.6, 0.15], [T.sMCU, 0.15]]);
    return { head };
  }
  function scottSpec(lt, x, y, scale) {
    const p = perfF02(lt);
    return { x, y, scale, facing: -1, pose: 'grass', t: lt, breath: 6, headAdd: p.head, hold: { N: { kind: 'phone', tremble: 1.0 } } };
  }
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
  // the light a rim takes from the fire
  function rimOf(lt, st) { const L = Y().lightAt('scott', lt, st); return { color: L.color, w: Math.round(L.rimW * 2) / 2, x: L.x, y: L.y, k: L.k }; }
  function drawF02Scott(c, F, lt, rim) {
    const g = c.g, light = { x: rim.x, y: rim.y };
    const e = c.em; e.save(); e.globalCompositeOperation = 'destination-out'; e.fill(RIG.path(F)); e.restore();   // the paper occludes the bloom
    RIG.draw(g, F, { light, color: rim.color, w: rim.w, em: c.em });
    socks(g, F);
    O.silhouette(g, shirtFlap(F, lt).path(1.1, 41), { fill: C.ink, light, rimColor: rim.color, rimW: rim.w, at: F.joints.elbowF });
    O.silhouette(g, blisters(F).path(0.4, 43), { fill: C.ink, light, rimColor: rim.color, rimW: rim.w, at: F.joints.elbowF });
  }
  // the faintest ember under his free right hand, never explained: it shows only at his fingertips and the heel of the hand,
  // where a slightly longer, hand-shaped cut reaches past his own hand. (Drawn as the revealed lightbox under the figure: the
  // compositor's knockout pass costs ~90 ms a frame here for a glint this small. Same look: ember at low depth, a little bloom.)
  function underHand(c, F, depth) {
    const h = F.holds && F.holds.F && F.holds.F.hand; if (!h) return;
    const bb = h.bbox(), cx = bb.x + bb.w * 0.5, cy = bb.y + bb.h * 0.5, k = 1.14;
    const p = h.transform([k, 0, 0, 1.04, cx * (1 - k) + 2, cy * (1 - 1.04) + 3]).path(0.6, 707), g = c.g;
    g.save(); g.globalAlpha = depth; g.fillStyle = C.ember; g.fill(p); g.restore();
    const e = c.em; e.save(); e.globalAlpha = depth * 1.2; e.fillStyle = C.ember; e.fill(p); e.restore();
  }

  // ================================================================ BUST: Scott, close, cut by hand
  // Head units: 1 = crown to chin. Origin = the near ear. Facing left (screen -x). HEAD0 = profile, HEAD1 = turned ~70 deg away
  // (toward the house): the same 29 points, so the turn is a morph. Index map: 0-1 hairline/crown front, 2 crown, 3-5 the one
  // swept tuft, 6-10 back of the skull to the nape, 11-14 the neck, 15-19 jaw and chin (and the lower lip), 20 lip seam, 21-28
  // upper lip, nose, sellion, brow, forehead.
  const HEAD0 = [[-0.45, -0.38], [-0.33, -0.515], [-0.1, -0.575], [0.05, -0.565], [0.125, -0.615], [0.165, -0.535], [0.285, -0.43], [0.37, -0.22], [0.35, 0], [0.27, 0.14],
    [0.22, 0.27], [0.23, 0.45], [0.26, 0.7], [-0.25, 0.7], [-0.23, 0.53], [-0.33, 0.468], [-0.45, 0.448], [-0.53, 0.392], [-0.51, 0.337], [-0.552, 0.303],
    [-0.532, 0.277], [-0.562, 0.248], [-0.55, 0.205], [-0.6, 0.19], [-0.655, 0.145], [-0.6, 0.055], [-0.535, -0.015], [-0.556, -0.085], [-0.532, -0.22]];
  const HEAD1 = [[-0.36, -0.38], [-0.26, -0.515], [-0.04, -0.58], [0.1, -0.57], [0.175, -0.615], [0.215, -0.54], [0.33, -0.42], [0.405, -0.2], [0.385, 0.03], [0.3, 0.17],
    [0.24, 0.3], [0.24, 0.46], [0.26, 0.7], [-0.22, 0.7], [-0.21, 0.54], [-0.24, 0.475], [-0.3, 0.435], [-0.36, 0.365], [-0.39, 0.3], [-0.41, 0.245],
    [-0.42, 0.195], [-0.43, 0.145], [-0.435, 0.1], [-0.44, 0.06], [-0.445, 0.02], [-0.44, -0.03], [-0.43, -0.08], [-0.42, -0.14], [-0.4, -0.24]];
  const JAWW = { 14: 0.5, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1 }, TILTW = { 11: 0.5, 12: 0, 13: 0, 14: 0.5 };
  const JAWP = [-0.02, 0.1], NECKP = [0.02, 0.48];
  const TORSO = [[0.2, 0.5], [0.27, 0.66], [0.5, 0.8], [0.78, 0.98], [1.06, 1.4], [1.4, 2.0], [1.75, 2.7], [2.05, 3.4], [2.1, 3.9], [-0.3, 3.9], [-0.34, 3.0], [-0.44, 2.25],
    [-0.5, 1.6], [-0.47, 1.12], [-0.38, 0.86], [-0.27, 0.68], [-0.25, 0.52]];
  const COLLAR = [[[0.19, 0.56], [0.34, 0.585], [0.4, 0.7], [0.25, 0.69]], [[-0.22, 0.6], [-0.34, 0.69], [-0.4, 0.82], [-0.28, 0.78]]];
  // the phone on his near cheek: centre, long axis a (bottom -> top), n across it toward the rear (the back of his head)
  const PH = { c: [-0.09, 0.07], a: [0.632, -0.775], n: [0.775, 0.632], hu: 0.285, hv: 0.135, r: 0.05 };
  const SHOULDER = [0.12, 1.02], ARM1 = 1.0, ARM2 = 1.2;
  // the hand in phone space (u along a, v along n): the back of the hand over the phone's lower half, four fingers wrapping the
  // rear edge, the thumb up the front edge, the wrist under the bottom end
  const HANDB = [[-0.43, 0.13], [-0.43, -0.02], [-0.31, -0.07], [-0.2, -0.105], [-0.03, -0.075], [-0.11, 0.178], [-0.3, 0.195]];
  const FING = [[[-0.035, -0.045], [0.86, 0.51], 0.27], [[-0.055, 0.016], [0.79, 0.61], 0.29], [[-0.075, 0.074], [0.71, 0.7], 0.26], [[-0.095, 0.13], [0.6, 0.8], 0.2]];
  const THUMB = [[-0.25, -0.095], [0.05, -0.163]], WRIST = [-0.42, 0.055];

  const rot = (p, o, a) => { const cs = Math.cos(a), sn = Math.sin(a), x = p[0] - o[0], y = p[1] - o[1]; return [o[0] + x * cs - y * sn, o[1] + x * sn + y * cs]; };
  // closed centripetal Catmull-Rom through the key points (no loops, no overshoot at the tight places: tuft, lips, nose)
  function spline(pts, step) {
    const out = [], n = pts.length, dd = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5) || 1e-4;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const t1 = dd(p0, p1), t2 = t1 + dd(p1, p2), t3 = t2 + dd(p2, p3), k = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let j = 0; j < k; j++) {
        const tt = t1 + (t2 - t1) * j / k, L = (a, b, ta, tb) => { const w = (tt - ta) / (tb - ta); return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w]; };
        const A1 = L(p0, p1, 0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3), B1 = L(A1, A2, 0, t2), B2 = L(A2, A3, t1, t3);
        out.push(L(B1, B2, t1, t2));
      }
    }
    return out;
  }
  function rrect(u0, u1, v0, v1, r) {   // a rounded rectangle in (u, v), as points
    const pts = [], arc = (cu, cv, a0) => { for (let i = 0; i <= 4; i++) { const a = a0 + i * Math.PI / 8; pts.push([cu + Math.cos(a) * r, cv + Math.sin(a) * r]); } };
    arc(u1 - r, v1 - r, 0); arc(u0 + r, v1 - r, Math.PI / 2); arc(u0 + r, v0 + r, Math.PI); arc(u1 - r, v0 + r, Math.PI * 1.5); return pts;
  }
  function ik(Sh, Wr, L1, L2) {
    const D = Math.hypot(Wr[0] - Sh[0], Wr[1] - Sh[1]) || 1e-3, dx = (Wr[0] - Sh[0]) / D, dy = (Wr[1] - Sh[1]) / D, d = Math.min(L1 + L2 - 1e-3, D);
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    let px = dy, py = -dx; if (px > 0) { px = -px; py = -py; }       // the elbow forward (toward his face side), never behind him
    return [Sh[0] + dx * a + px * h, Sh[1] + dy * a + py * h];
  }
  // pose: {tilt (+ chin up), roll (0 profile .. 1 turned away), open (lips 0..1), breath (head units), shake [dx, dy] units}
  function bustGeom(pose, put) {
    const { tilt, roll, open, breath } = pose, sh = pose.shake || [0, 0], X = p => [put.x + put.s * p[0], put.y + put.s * p[1]];
    const head = HEAD0.map((p, i) => {
      let q = [lerp(p[0], HEAD1[i][0], roll), lerp(p[1], HEAD1[i][1], roll)];
      const jw = (JAWW[i] || 0) * (1 - roll); if (jw) q = rot(q, JAWP, -0.1 * open * jw);
      if (i === 20) q = [q[0] + 0.045 * open * (1 - roll), q[1] + 0.012 * open];
      const tw = TILTW[i] == null ? 1 : TILTW[i]; if (tw) q = rot(q, NECKP, tilt * tw);
      return [q[0], q[1] - breath];
    });
    const hd = q => { const r = rot(q, NECKP, tilt); return [r[0] + sh[0], r[1] - breath + sh[1]]; };   // anything riding on the head
    const bw = y => y < 1.2 ? 1 : y > 3 ? 0 : 1 - (y - 1.2) / 1.8;
    const torso = TORSO.map(p => [p[0], p[1] - breath * bw(p[1])]), collar = COLLAR.map(P => P.map(p => [p[0], p[1] - breath]));
    // the phone frame: turning away slides it toward his face side and foreshortens it
    const pc = [PH.c[0] - 0.22 * roll, PH.c[1] - 0.02 * roll], sv = 1 - 0.62 * roll;
    const P = (u, v) => hd([pc[0] + PH.a[0] * u + PH.n[0] * v * sv, pc[1] + PH.a[1] * u + PH.n[1] * v * sv]);
    const phone = rrect(-PH.hu, PH.hu, -PH.hv, PH.hv, PH.r).map(q => P(q[0], q[1]));
    // the screen's light leaking onto his cheek along the phone's front edge: one hard crescent, thickest mid-way
    const spill = []; for (let i = 0; i <= 12; i++) { const u = -PH.hu * 0.8 + 1.6 * PH.hu * i / 12; spill.push(P(u, -PH.hv - 0.004)); }
    for (let i = 12; i >= 0; i--) { const u = -PH.hu * 0.8 + 1.6 * PH.hu * i / 12, w = 0.042 * Math.sin(Math.PI * i / 12); spill.push(P(u, -PH.hv - 0.004 - w)); }
    const handB = HANDB.map(q => P(q[0], q[1]));
    const fingers = FING.map(([o, d, len]) => { let k = len; if (d[1] > 0) k = Math.min(len, (0.172 - o[1]) / d[1]); return [P(o[0], o[1]), P(o[0] + d[0] * k, o[1] + d[1] * k)]; });
    const thumb = [P(THUMB[0][0], THUMB[0][1]), P(THUMB[1][0], THUMB[1][1])];
    const wrist = P(WRIST[0], WRIST[1]), shoulder = [SHOULDER[0], SHOULDER[1] - breath], elbow = ik(shoulder, wrist, ARM1, ARM2);
    // to the screen
    const s = put.s, hp = S().poly(spline(head, 0.012).map(X));
    const body = S().poly(spline(torso, 0.03).map(X)); collar.forEach(c2 => body.poly(c2.map(X))); body.add(hp);
    body.capsule(...X(shoulder), 0.15 * s, ...X(elbow), 0.12 * s);      // the upper arm is part of the body's silhouette
    const arm = S().capsule(...X(elbow), 0.12 * s, ...X(wrist), 0.086 * s).poly(handB.map(X));
    fingers.forEach(([a, b], i) => arm.capsule(...X(a), (0.031 - i * 0.002) * s, ...X(b), (0.027 - i * 0.002) * s));
    arm.capsule(...X(thumb[0]), 0.036 * s, ...X(thumb[1]), 0.028 * s);
    const ph = S().poly(phone.map(X));
    return { headS: hp, body, arm, phone: ph, spill: S().poly(spill.map(X)),
      headC: X(hd([-0.06, -0.08])), bodyC: X([0.4, 1.4]), handC: X(P(-0.1, 0.05)), phoneC: X(P(0, 0)), mouth: X(head[20]), nose: X(head[24]), roll };
  }
  const SLATE = mix(C.ink, C.phoneWhite, 0.09), SPILL = mix(C.ink, C.phoneWhite, 0.55);
  // the bust as cut paper: ink + a two-band rim (head measured apart), the screen's hard spill on the cheek, the phone, the arm
  function paintBust(g, G, L) {
    const bp = G.body.path(0.8, 61), hp = G.headS.path(0.8, 61), ap = G.arm.path(0.7, 63), pp = G.phone.path(0.4, 65);
    const lt = { dx: L.dx, dy: L.dy }, bbB = G.body.bbox(), bbH = G.headS.bbox(), bbA = G.arm.bbox(), bbP = G.phone.bbox();
    O.silhouette(g, bp, { fill: C.ink, light: lt, rimColor: L.color, rimW: L.w, rimSoft: true, at: G.bodyC, bbox: bbB, parts: [{ path: hp, at: G.headC, bbox: bbH, w: 1.1 }] });
    const k = 1 - G.roll;
    if (k > 0.05) { g.save(); g.clip(hp); g.globalAlpha = k; g.fillStyle = SPILL; g.fill(G.spill.path(0.3, 67)); g.restore(); }
    O.silhouette(g, pp, { fill: SLATE, light: lt, rimColor: L.color, rimW: L.w * 0.7, at: G.phoneC, bbox: bbP });
    O.silhouette(g, ap, { fill: C.ink, light: lt, rimColor: L.color, rimW: L.w * 0.85, rimSoft: true, at: G.handC, bbox: bbA });
    return { bp, ap, k };
  }

  // ---------------- the back of his head (the over-the-shoulder stare): head units, origin = the middle of the head
  const BACKH = [[0, -0.575], [0.075, -0.575], [0.13, -0.635], [0.165, -0.548], [0.28, -0.47], [0.355, -0.27], [0.35, -0.09], [0.385, -0.06], [0.405, 0.03], [0.365, 0.11],
    [0.3, 0.21], [0.21, 0.33], [0.19, 0.5], [0.25, 0.6], [0.62, 0.71], [1.02, 0.82], [1.38, 1.0], [1.6, 1.5], [1.65, 2.3], [-1.65, 2.3], [-1.6, 1.5], [-1.38, 1.04],
    [-1.02, 0.86], [-0.62, 0.74], [-0.25, 0.61], [-0.19, 0.5], [-0.21, 0.33], [-0.3, 0.21], [-0.345, 0.08], [-0.36, -0.09], [-0.355, -0.27], [-0.28, -0.47]];
  function backGeom(pose, put) {
    const X = p => [put.x + put.s * p[0], put.y + put.s * (p[1] - (p[1] < 1.6 ? pose.breath : 0))];
    const hr = p => p[1] < 0.55 ? rot(p, [0, 0.5], pose.turn) : p;    // the head turns a little toward the house
    const body = S().poly(spline(BACKH.map(hr), 0.012).map(X));
    const phone = S().poly([[-0.32, -0.2], [-0.385, -0.215], [-0.465, 0.27], [-0.4, 0.285]].map(hr).map(X));
    const arm = S().capsule(...X(hr([-0.45, 0.33])), 0.1 * put.s, ...X([-0.78, 1.35]), 0.14 * put.s)
      .poly([[-0.37, 0.0], [-0.47, -0.01], [-0.53, 0.09], [-0.53, 0.27], [-0.47, 0.38], [-0.39, 0.4], [-0.36, 0.28]].map(hr).map(X));
    [0.03, 0.105, 0.18, 0.25].forEach((y, i) => arm.capsule(...X(hr([-0.52, y])), 0.032 * put.s, ...X(hr([-0.39 + i * 0.012, y + 0.025])), 0.028 * put.s));
    return { body, phone, arm, headC: X(hr([0, -0.1])), bodyC: X([0, 1.2]), handC: X(hr([-0.45, 0.2])) };
  }
  function paintBack(g, G, L) {
    const bp = G.body.path(0.8, 71), ap = G.arm.path(0.7, 73), lt = { dx: L.dx, dy: L.dy };
    O.silhouette(g, bp, { fill: C.ink, light: lt, rimColor: L.color, rimW: L.w, rimSoft: true, at: G.bodyC, bbox: G.body.bbox() });
    O.silhouette(g, G.phone.path(0.4, 72), { fill: SLATE, light: lt, rimColor: L.color, rimW: L.w * 0.7, at: G.handC, bbox: G.phone.bbox() });
    O.silhouette(g, ap, { fill: C.ink, light: lt, rimColor: L.color, rimW: L.w * 0.85, at: G.handC, bbox: G.arm.bbox() });
    return { bp, ap };
  }

  // ---------------- sprites: a pose is cut once per drawing (twos) and per rim state, then reused
  const SPR = [];
  function sprite(key, paint) {
    let e = SPR.find(q => q.key === key);
    if (e) { SPR.splice(SPR.indexOf(e), 1); SPR.push(e); return e; }
    e = SPR.length >= 4 ? SPR.shift() : { cv: O.makeCanvas(W, H) };
    const g = e.cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    e.key = key; e.data = paint(g); SPR.push(e); return e;
  }

  // ---------------- the close performance (on twos, Scott's hover-and-correct curves)
  const BREATH_HZ = 0.38;
  const breathAt = (lt, amp) => lt >= FREEZE ? amp * -Math.cos(2 * Math.PI * BREATH_HZ * (FREEZE - T.sF02)) : amp * -Math.cos(2 * Math.PI * BREATH_HZ * (FILM.twos(lt) - T.sF02));
  function closePose(lt, shot) {
    const tt = Math.min(lt, FREEZE), K = ks => RIG.key('scott', tt, ks);
    let tilt, roll, open;
    if (shot === 'mcu') {
      tilt = K([[T.sMCU, -0.13], [T.L002 - 0.04, -0.13], [T.L002 + 0.2, -0.21], [T.L002 + 0.8, -0.115], [T.L002 + 3.4, -0.12], [T.L003 - 0.3, -0.155]]);
      open = K([[T.sMCU, 0.14], [T.L002 - 0.08, 0.1], [T.L002 + 0.06, 0.42], [T.L002 + 0.45, 0.08], [T.L003, 0.12]]);
      roll = 0;
    } else if (shot === 'cu') {
      tilt = K([[T.sCU, -0.155], [T.sCU + 0.2, -0.155], [T.sCU + 0.55, 0.08], [T.sOTS, 0.06]]);
      roll = K([[T.sCU, 0], [T.sCU + 0.58, 0], [T.sCU + 1.12, 0.8], [T.sOTS, 0.8]]);
      open = K([[T.sCU, 0.12], [T.sCU + 0.3, 0.26], [T.sCU + 0.9, 0.16]]);
    } else {
      tilt = K([[T.sECU, 0.07], [T.L004 - 0.06, 0.07], [T.L004 + 0.36, -0.035], [FREEZE, -0.02]]);
      roll = K([[T.sECU, 0.52], [T.L004 - 0.06, 0.52], [T.L004 + 0.36, 0.0], [FREEZE, 0.03]]);
      open = K([[T.sECU, 0.1], [T.L004, 0.12], [T.L004 + 0.13, 0.62], [FREEZE, 0.5]]);
    }
    const still = lt >= FREEZE, tq = FILM.twos(lt);
    const shake = still ? [0, 0] : [0.0035 * FILM.wob(tq, 7, 51), 0.0035 * FILM.wob(tq, 7, 53)];
    return { tilt, roll, open, breath: breathAt(lt, 0.016), shake };
  }
  function bustLight(lt, st, put, extra) {
    const L = Y().lightAt('scott', lt, st), w = Math.round((1.2 + put.s * 0.0105) * (extra || 1) * 2) / 2;
    return { dx: 0.84, dy: -0.55, color: L.color, w };
  }

  // ================================================================ embers close to the lens (masked off the type)
  const FG = (() => { const R = O.rng('q01-fg'), L = []; for (let i = 0; i < 22; i++) L.push({ x: R(), ph: R(), life: 2.8 + 2.6 * R(), s: 4 + 10 * R() * R(), sw: R() * 6.28, swA: 20 + 50 * R(), dr: (R() - 0.3) * 260, hot: R() < 0.3, e: 0.5 + 0.4 * R() }); return L; })();
  function typeBoxes(lt) {
    const B = [];
    if (lt >= T.L001 && lt < T.smash) B.push([W / 2 - 80, TIMER_Y - 26, 160, 34]);                // the timer
    const d1 = bandRect(FILM.byId.L001.text), d3 = bandRect(FILM.byId.L003.text);
    if (lt >= T.L001 && lt < T.L002 - 0.55) B.push([d1.x - 6, d1.y - 6, d1.w + 12, d1.h + 12]);
    if (lt >= T.L003 && lt < T.L003 + 2.3) B.push([d3.x - 6, d3.y - 6, d3.w + 12, d3.h + 12]);
    if (lt >= T.L002 && lt < T.L002 + 3.0) B.push([MCU_Y.x - 30, MCU_Y.y - 72, 240, 104]);
    if (lt >= T.L004 && lt < T.out4) B.push([ECU_I.x - 30, ECU_I.y - 95, 220, 125]);
    return B;
  }
  function fgEmbers(c, lt, n, k, mask) {   // mask: Path2Ds (screen space) the flakes stay off, so none ever sits on his face like an eye
    const g = c.g, e = c.em, mid = new Path2D(), hot = new Path2D(), glow = new Path2D(), boxes = typeBoxes(lt);
    for (let i = 0; i < Math.min(n, FG.length); i++) {
      const f = FG[i], u = (lt / f.life + f.ph) % 1, x = f.x * (W + 200) - 100 + f.dr * u + Math.sin(lt * 1.1 + f.sw) * f.swA * u, y = H + 60 - u * (H + 160);
      const s = f.s * k * (u > 0.75 ? 1 - (u - 0.75) * 2.4 : 1), a = lt * 0.7 + f.sw; if (s < 0.6) continue;
      if (boxes.some(b => x > b[0] - s && x < b[0] + b[2] + s && y > b[1] - s && y < b[1] + b[3] + s)) continue;
      if (mask && mask.some(m => _probe.isPointInPath(m, x, y))) continue;
      const P = f.hot ? hot : mid; P.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s); P.ellipse(x, y, s, s * f.e, a, 0, 6.2832);
      glow.moveTo(x + s * 3, y); glow.arc(x, y, s * 3, 0, 6.2832);
    }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = rgba(C.fireMid, 0.85); g.fill(mid); g.fillStyle = C.fireCore; g.fill(hot); g.restore();
    e.save(); e.setTransform(0.25, 0, 0, 0.25, 0, 0); e.globalAlpha = 0.5; e.fillStyle = C.fireMid; e.fill(glow); e.restore();
  }
  // ---------------- the Dispatcher's band: her line at 48 px on a solid, hand-cut ink strip (about 15:1 against her phone-white),
  // drawn with the line itself so the strip is up exactly while she is; the call timer small and dim just above it
  const BAND_Y = 184, BAND_SIZE = 48, BAND_PAD = 40, STRIP_Y = BAND_Y - 52, STRIP_H = 78, TIMER_Y = STRIP_Y - 11;
  const _bandR = {};
  function bandRect(text) {
    if (_bandR[text]) return _bandR[text];
    const F = Object.assign({}, O.FACE.dispatcher, { size: BAND_SIZE }); _probe.save(); _probe.font = O.font(F); _probe.letterSpacing = '0px';
    const w = _probe.measureText(text).width; _probe.restore();
    const sw = Math.ceil(w + 2 * BAND_PAD);
    return (_bandR[text] = { x: Math.round(W / 2 - sw / 2), y: STRIP_Y, w: sw, h: STRIP_H });
  }
  function bandStrip(c, text, alpha) {
    const r = bandRect(text), g = c.g;
    const e = c.em; e.save(); e.globalCompositeOperation = 'destination-out'; e.fillRect(r.x - 14, r.y - 14, r.w + 28, r.h + 28); e.restore();   // no bloom over it
    const sh = c.cache('Q01.strip.' + r.w, q => { q.filter = 'blur(10px)'; q.fillStyle = rgba(C.ink, 0.55); q.fillRect(30, 34, r.w, r.h); }, r.w + 60, r.h + 70);
    if (!r.p) r.p = S().rect(r.x, r.y, r.w, r.h).path(1.3, 17 + r.w % 13);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha;
    g.drawImage(sh, r.x - 30, r.y - 30);                                                     // a soft shadow: a paper strip laid on the picture
    g.fillStyle = C.ink; g.fill(r.p);
    g.restore();
  }
  function dispatcherBand(c, s, o) {
    bandStrip(c, s.T.text, o.alpha);
    O.say(c.g, 'dispatcher', s.T.text, W / 2, BAND_Y, Object.assign({}, o, { size: BAND_SIZE, band: true, bandY: BAND_Y }));
  }
  function drawTimer(c, lt) {
    if (lt < T.L001 || lt >= T.smash) return;
    const g = c.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    O.text(g, timerStr(lt), W / 2, TIMER_Y, { family: 'Barlow Condensed', weight: 600, size: 22, color: C.phoneWhite, tracking: 3, align: 'center', alpha: 0.5 });
    g.restore();
  }

  // ================================================================ the curtain as cloth (overlaid on the set's own curtain)
  // yard.js paints the curtain in pale fire tones; laid over it, with its exact geometry: one darker fold down its length,
  // a scorched band and an ink edge where it is burning from the tip.
  const CHAR = '#2A0B05';
  function curtainCloth(c, lt, ph, M) {
    if (ph >= 0.999 || ph <= 0.01) return;
    const w = { x: 1242, y: 452 }, L = smooth(ph / 0.5), B = sat((ph - 0.5) / 0.5), N = 18, spine = [], t = lt;
    for (let i = 0; i <= N; i++) {
      const u = i / N, wv = Math.sin(u * 7.5 - t * 3.4) * u;
      const hang = [w.x + 74 + Math.sin(u * 4 - t * 2.3) * 4 * u, w.y + 8 + 104 * u];
      const lift = [w.x + 24 + 112 * u + 13 * Math.sin(u * 7.5) + 9 * wv, w.y + 10 - 118 * u + 8 * Math.sin(u * 5) + 5 * wv];
      spine.push([lerp(hang[0], lift[0], L), lerp(hang[1], lift[1], L)]);
    }
    const keep = 1 - B; if (keep <= 0.03) return;
    const end = keep * N, ie = Math.floor(end), fe = end - ie, sp = spine.slice(0, ie + 1);
    if (ie < N && fe > 0.01) sp.push([lerp(spine[ie][0], spine[ie + 1][0], fe), lerp(spine[ie][1], spine[ie + 1][1], fe)]);
    if (sp.length < 2) return;
    const half = u => (34 * (1 - u) + 7 * u) * lerp(0.6, 1, L), left = [], right = [], fold = [];
    sp.forEach((p, i) => {
      const q = sp[Math.min(i + 1, sp.length - 1)], o = sp[Math.max(i - 1, 0)]; let dx = q[0] - o[0], dy = q[1] - o[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const hw = half(i / N) * (1 + 0.18 * Math.sin(i * 1.9 + t * 2.2)); left.push([p[0] - dy * hw, p[1] + dx * hw]); right.push([p[0] + dy * hw, p[1] - dx * hw]);
      const fw = hw * (0.15 + 0.25 * Math.sin(i * 0.8 + t * 1.7)); fold.push([p[0] + dy * fw, p[1] - dx * fw]);
    });
    const cp = S().poly(left.concat(right.slice().reverse())).path(1.2, 5), g = c.g;
    g.save(); g.transform(M[0], M[1], M[2], M[3], M[4], M[5]); g.clip(cp);
    g.fillStyle = mix(C.fireMid, C.fireOuter, 0.45); g.fill(S().poly(fold.concat(right.slice().reverse())).path(1.0, 21));      // the shadowed fold
    g.fillStyle = mix(C.fireOuter, C.ink, 0.25); g.fill(S().poly(right.map((p, i) => [lerp(p[0], fold[i][0], 0.35), lerp(p[1], fold[i][1], 0.35)]).concat(right.slice().reverse())).path(0.8, 22));
    if (L > 0.3) {   // the burning end: scorched, then an ink edge
      const n = sp.length, k0 = Math.max(0, n - 5), k1 = Math.max(0, n - 3);
      g.fillStyle = CHAR; g.fill(S().poly(left.slice(k0).concat(right.slice(k0).reverse())).path(2.2, 23));
      g.fillStyle = C.ink; g.fill(S().poly(left.slice(k1).concat(right.slice(k1).reverse())).path(2.6, 24));
    }
    g.restore();
  }
  let HMAT = null, SMAT = null;   // the house model -> 'house' / 'scott' view matrices, read off the set's own anchors
  function mats() {
    if (HMAT) return; const A = Y().anchors, w0 = A.house.windows[0], w2 = A.house.windows[2], s = (w2[0] - w0[0]) / 476;
    HMAT = [s, 0, 0, s, w0[0] - s * 1057, w0[1] - s * 511];
    const cw = A.scott.curtainWindow, bw = A.scott.bigWindow, s2 = (cw[0] - bw[0]) / 175; SMAT = [s2, 0, 0, s2, cw[0] - s2 * 1295, cw[1] - s2 * 511];
  }

  // ================================================================ shots
  const black = c => { c.g.fillStyle = '#000'; c.g.fillRect(0, 0, W, H); };
  const NOPOST = { grain: 0, vignette: 0, halation: 0, fibre: 0 };

  // the wide: Scott small on the lawn in front of the back steps, where Q12 leaves him (anchors.house.seat, the Q12 wide's grass
  // pose), but still on the call: the phone at his (near, left) ear, its screen a cold band on his cheek; rim-lit by the house
  function wideScott(c, lt, st) {
    const a = Y().anchors.house.seat;
    const F = RIG.figure('scott', { x: a.hip[0], y: a.ground, scale: a.scale, facing: -1, t: lt, pose: 'grass', idleAmt: 0.3, headAdd: 0.02,
      hold: { N: { kind: 'phone', glow: true } } });
    const L = Y().lightAt('house', FILM.twos(lt), st, a.hip);
    const e = c.em; e.save(); e.globalCompositeOperation = 'destination-out'; e.fill(RIG.path(F)); e.restore();   // the paper occludes the bloom
    RIG.draw(c.g, F, { light: { x: L.x, y: L.y }, color: L.color, w: Math.round(L.rimW * 4) / 4, falloff: true, em: c.em });
  }
  function houseShot(c, lt, cam, withScott) {
    mats(); const st = yardState(lt);
    Y().camera(c, 'house', lt, st, cam);
    Y().back(c, lt, st, 'house'); curtainCloth(c, lt, st.curtain, HMAT);
    if (withScott) wideScott(c, lt, st);
    Y().front(c, lt, st, 'house');
    return st;
  }
  function f02Shot(c, lt, cam) {
    mats(); const st = yardState(lt);
    Y().camera(c, 'scott', lt, st, cam);
    Y().back(c, lt, st, 'scott'); curtainCloth(c, lt, st.curtain, SMAT);
    const a = Y().anchors.scott.seat, F = RIG.figure('scott', scottSpec(lt, a.hip[0], a.ground, a.scale));
    underHand(c, F, 0.22 + 0.06 * Math.sin(lt * 1.1));
    drawF02Scott(c, F, lt, rimOf(lt, st));
    Y().front(c, lt, st, 'scott');
    fgEmbers(c, lt, 9, 0.9); drawTimer(c, lt);
  }
  // the close setups: a low camera, so his profile cuts against the night sky (the fence and the neighbours' roofs fall below
  // his chin), the burning house behind his shoulder; the background under its own camera, Scott in screen space
  const MCU = { x: 760, y: 442, s: 330 }, CU = { x: 830, y: 498, s: 430 }, ECU = { x: 900, y: 478, s: 520 };
  const MCU_Y = { x: 316, y: 552 }, ECU_I = { x: 368, y: 652 };
  function closeShot(c, lt, cam, put, shot) {
    const st = yardState(lt);
    Y().camera(c, 'scott', lt, st, cam);
    Y().back(c, lt, st, 'scott'); Y().front(c, lt, st, 'scott');
    c.reset();
    const pose = closePose(lt, shot), L = bustLight(lt, st, put), tq = lt >= FREEZE ? FREEZE : FILM.twos(lt);
    const key = shot + ':' + tq.toFixed(3) + ':' + L.color + ':' + L.w;
    const spr = sprite(key, g => paintBust(g, bustGeom(pose, put), L));
    const e = c.em; e.save(); e.globalCompositeOperation = 'destination-out'; e.fill(spr.data.bp); e.fill(spr.data.ap); e.restore();   // the paper occludes the bloom
    c.g.drawImage(spr.cv, 0, 0);
    fgEmbers(c, lt, 7, 1.15, [spr.data.bp, spr.data.ap]); drawTimer(c, lt);
  }
  // the stare: over his shoulder, on his own eyeline, the burning house; the big window bursts
  const OTS = { x: 350, y: 770, s: 420 };
  function otsShot(c, st0, lt) {
    const st = houseShot(c, lt, { x: 800, y: 548, zoom: 1.2 + 0.035 * seg(lt, T.sOTS, T.sECU, 'inOutSine') });
    c.reset();
    const tq = FILM.twos(lt), flare = lt >= T.glass ? Math.exp(-(lt - T.glass) * 3) : 0;
    const L0 = Y().lightAt('house', lt, st), L = { dx: 0.5, dy: -0.87, color: flare > 0.3 ? mix(C.fireMid, C.fireCore, 0.35) : L0.color, w: Math.round((4 + 3 * flare) * 2) / 2 };
    const pose = { turn: RIG.key('scott', lt, [[T.sOTS, -0.05], [T.sOTS + 0.5, 0.04], [T.sECU, 0.05]]), breath: 0.012 * -Math.cos(2 * Math.PI * BREATH_HZ * (tq - T.sF02)) };
    const spr = sprite('ots:' + tq.toFixed(3) + ':' + L.color + ':' + L.w, g => paintBack(g, backGeom(pose, OTS), L));
    const e = c.em; e.save(); e.globalCompositeOperation = 'destination-out'; e.fill(spr.data.bp); e.fill(spr.data.ap); e.restore();
    c.g.drawImage(spr.cv, 0, 0);
    fgEmbers(c, lt, 10, 1.1, [spr.data.bp, spr.data.ap]); drawTimer(c, lt);
  }

  // ---------------- Scott's answers in the yard: a warm ivory ink (his ash register, brightened so it reads on the night sky)
  const I_COL = mix(C.cardPaper, C.ash, 0.1);
  // 'I--': the I in that ivory, a thin dim caret a clear step away, so the line never reads as |-|. It fades out by T.out4 (up ~3 s)
  // and the frame holds clean on his frozen head until the SMASH.
  function drawI(c, s, o) {
    const g = c.g, L = this, size = L.size, k = 1 - seg(c.lt, T.out4 - 0.45, T.out4, 'inQuad'); if (k <= 0) return;
    const res = O.say(g, 'scott', s.T.text, L.x, L.y, Object.assign({}, o, { caret: false, color: I_COL, size, alpha: o.alpha * k }));
    if (o.caret) { const cut = s.p >= 1, x = res.end[0] + size * (cut ? 0.42 : 0.12); g.save(); g.globalAlpha *= 0.78 * k; g.fillStyle = C.ash; g.fillRect(x, L.y - size * 0.6, Math.max(2, size * 0.03), size * 0.56); g.restore(); }
  }

  // ================================================================ sound: local beds and cues
  const env = (gp, t0, t1, steps, db) => { gp.setValueAtTime(0, t0); steps.forEach(([t, d]) => gp.linearRampToValueAtTime(db(d), Math.min(Math.max(t, t0 + 0.01), t1 - 0.012))); gp.linearRampToValueAtTime(0, t1); };
  // the fire: the shared bed's ingredients with a relative breath, so it can sit under a line and recede on cue (p.steps [[t, dB]])
  SOUND.beds['Q01.fire'] = (ac, B, t0, t1, p, R) => {
    const { gain, chain, src, osc, filt, pan, perc, db } = SOUND;
    const out = gain(ac, 0); out.connect(B.room); env(out.gain, t0, t1, p.steps || [[t0 + 2, -14]], db);
    const br = gain(ac, 1); br.connect(out);
    if (SOUND.fireRec(ac, br, t0, t1, p)) return;
    chain(src(ac, 'brown', 3, t0, t1), filt(ac, 'lowpass', 700, 0.5), gain(ac, 1.2)).connect(br);
    const lfo = osc(ac, 'sine', 0.13, t0, t1), lg = gain(ac, 0.22); chain(lfo, lg); lg.connect(br.gain);
    [41, 62].forEach((f, i) => chain(osc(ac, 'sine', f, t0, t1), gain(ac, 0.12 / (i + 1))).connect(br));
    const near = p.near == null ? 0.6 : p.near, n = Math.floor((t1 - t0) * (6 + 18 * near));
    for (let i = 0; i < n; i++) { const t = t0 + R() * (t1 - t0 - 0.15); const g = gain(ac, 0); perc(g, t, 0.05 + R() * 0.25, 0.001, 0.02 + R() * 0.06);
      chain(src(ac, 'white', 7 + i % 5, t, t + 0.12), filt(ac, 'bandpass', 1800 + R() * 3500, 1.5), g, pan(ac, R() * 1.4 - 0.7)).connect(br); }
  };
  // the ringing in his ears (the shared tinnitus' two beating sines) on a level curve
  SOUND.beds['Q01.tinn'] = (ac, B, t0, t1, p) => { const { gain, osc, db } = SOUND; const g = gain(ac, 0); env(g.gain, t0, t1, p.steps, db); [6200, 6205.5].forEach(f => osc(ac, 'sine', f, t0, t1).connect(g)); g.connect(B.room); };
  // a second, lower ringing that climbs in under the hold, stopping dead at t1 (the cut)
  SOUND.beds['Q01.ring'] = (ac, B, t0, t1, p) => { const { gain, osc, db } = SOUND; const g = gain(ac, 0); env(g.gain, t0, t1, p.steps, db); const f = p.f || 4100; [f, f + 3.7].forEach(x => osc(ac, 'sine', x, t0, t1).connect(g)); g.connect(B.room); };
  // his breath: heavy, through the mouth, inhale and exhale on the picture's cycle; it stops dead when he freezes (t1)
  SOUND.beds['Q01.breath'] = (ac, B, t0, t1, p) => {
    const { gain, chain, src, filt, pan, db } = SOUND, P = 1 / (p.hz || BREATH_HZ), out = gain(ac, 0); env(out.gain, t0, t1, p.steps || [[t0 + 0.5, -34]], db); chain(out, pan(ac, -0.25), B.room);
    const inh = gain(ac, 0), exh = gain(ac, 0);
    chain(src(ac, 'pink', 81, t0, t1), filt(ac, 'bandpass', 1250, 0.8), filt(ac, 'highpass', 350, 0.7), inh, out);
    chain(src(ac, 'pink', 83, t0, t1), filt(ac, 'bandpass', 700, 0.9), exh, out);
    inh.gain.setValueAtTime(0, t0); exh.gain.setValueAtTime(0, t0);
    for (let tk = (p.phase0 == null ? t0 : p.phase0); tk < t1; tk += P) {
      if (tk + P < t0) continue;
      const a = tk, b = tk + 0.46 * P, c = tk + 0.5 * P, d = tk + 0.97 * P;
      if (a >= t0) { inh.gain.setValueAtTime(0, a); inh.gain.linearRampToValueAtTime(1, Math.min(b, t1 - 0.005)); inh.gain.linearRampToValueAtTime(0, Math.min(b + 0.08, t1)); }
      if (c >= t0 && c < t1) { exh.gain.setValueAtTime(0, c); exh.gain.linearRampToValueAtTime(0.75, Math.min(c + 0.12, t1)); exh.gain.linearRampToValueAtTime(0, Math.min(d, t1)); }
    }
    inh.gain.setValueAtTime(0, t1); exh.gain.setValueAtTime(0, t1);
  };
  // the distant siren, dry (no reverb send), so it ends exactly at the cut
  SOUND.beds['Q01.siren'] = (ac, B, t0, t1, p) => { const { gain, osc, filt, chain, db } = SOUND; const g = gain(ac, 0); env(g.gain, t0, t1, p.steps || [[t0 + 4, p.level || -40], [t1 - 0.02, p.level || -40]], db);
    if (SOUND.sirenRec(ac, g, t0, t1, 1600)) { g.connect(B.room); return; }
    const o = osc(ac, 'triangle', 770, t0, t1); for (let t = t0; t < t1; t += 1.2) { o.frequency.setValueAtTime(770, t); o.frequency.setValueAtTime(960, t + 0.6); } chain(o, filt(ac, 'lowpass', 1200, 0.5), g, B.room); };
  // the dash cut off: a dry paper slice, then nothing
  SOUND.cues['Q01.slice'] = (ac, B, t, p) => {
    const { gain, chain, src, filt, perc, db } = SOUND; const lv = db(p.level || -24);
    const g = gain(ac, 0); perc(g, t, lv, 0.0008, 0.045); chain(src(ac, 'white', 191, t, t + 0.08), filt(ac, 'highpass', 3200, 0.8), filt(ac, 'peaking', 6000, 2, 6), g, B.room);
    const k = gain(ac, 0); perc(k, t + 0.004, lv * 0.6, 0.001, 0.05); const o = SOUND.osc(ac, 'sine', 140, t, t + 0.1); o.frequency.exponentialRampToValueAtTime(70, t + 0.06); chain(o, k, B.room);
  };
  // SMASH: a dry thud and a paper slam, 0.12 s, gated to nothing at p.gate; the room bus has no reverb, so nothing rings on
  SOUND.cues['Q01.smash'] = (ac, B, t, p) => {
    const { gain, chain, src, filt, osc, db } = SOUND, lv = db(p.level || -6), gate = p.gate || t + 0.18, out = gain(ac, 1); out.connect(B.room);
    out.gain.setValueAtTime(1, t); out.gain.setValueAtTime(1, gate - 0.03); out.gain.linearRampToValueAtTime(0, gate);
    const th = gain(ac, 0); th.gain.setValueAtTime(0, t); th.gain.linearRampToValueAtTime(lv, t + 0.002); th.gain.exponentialRampToValueAtTime(lv * 0.001, t + 0.12);
    const o = osc(ac, 'sine', 78, t, gate); o.frequency.exponentialRampToValueAtTime(36, t + 0.1); chain(o, th, out);
    const sl = gain(ac, 0); sl.gain.setValueAtTime(0, t); sl.gain.linearRampToValueAtTime(lv * 0.7, t + 0.001); sl.gain.exponentialRampToValueAtTime(lv * 0.0007, t + 0.06);
    chain(src(ac, 'brown', 211, t, gate), filt(ac, 'lowpass', 900, 0.7), sl, out);
    const ck = gain(ac, 0); ck.gain.setValueAtTime(0, t); ck.gain.linearRampToValueAtTime(lv * 0.35, t + 0.0005); ck.gain.exponentialRampToValueAtTime(lv * 0.0003, t + 0.02);
    chain(src(ac, 'white', 213, t, t + 0.05), filt(ac, 'bandpass', 2200, 0.8), ck, out);
  };

  FILM.seq({
    id: 'Q01', title: 'Cold open', dur: +T.dur.toFixed(3), letterbox: 1.7778,
    lines: [
      { id: 'L001', at: T.L001, x: W / 2, y: BAND_Y, size: BAND_SIZE, until: T.L002 - 0.55, opts: { band: true }, draw: dispatcherBand },   // cut a beat before he answers
      { id: 'L002', at: T.L002, x: MCU_Y.x, y: MCU_Y.y, size: 52, until: T.L002 + 2.4, opts: { ash: true, color: I_COL } },
      { id: 'L003', at: T.L003, x: W / 2, y: BAND_Y, size: BAND_SIZE, entrance: 0.92, opts: { band: true }, draw: dispatcherBand },   // she presses: the whole question lands inside 00:03:24
      { id: 'L004', at: T.L004, x: ECU_I.x, y: ECU_I.y, size: 84, until: T.out4, noExit: true, opts: { ash: true, caret: true }, draw(c, s, o) { drawI.call(this, c, s, o); } },
    ],
    sound(S) {
      // the ringing starts in the dark, before anything is seen; it sits under the call and climbs in the hold
      S.bed('Q01.tinn', 0.7, T.smash, { steps: [[2.7, -38], [T.sF02, -38], [T.L001, -40], [T.sCU, -38], [T.L004, -37], [28.0, -35], [T.smash - 0.02, -33]] });
      S.cue('spark', T.burn0 + 0.1, { level: -28 });
      // the fire: swells as the frame burns open, sits under the call, dips so the glass cuts through, then recedes to almost nothing
      S.bed('Q01.fire', T.burn0, T.smash, { near: 0.7, steps: [[T.burn0 + 0.4, -42], [4.6, -14], [T.sCurtain, -16], [T.sF02, -19], [T.L001, -24], [T.sMCU, -25], [T.sCU, -25],
        [T.sOTS, -24], [T.glass - 0.06, -31], [T.glass + 0.5, -21], [T.sECU, -22], [T.L004, -24], [25.6, -31], [26.8, -39], [28.0, -46], [T.smash - 0.03, -54]] });
      S.bed('Q01.siren', 8.0, T.smash, { steps: [[12.0, -40], [T.L004, -40], [28.0, -47], [T.smash - 0.02, -49]] });
      S.bed('Q01.breath', T.sF02, FREEZE, { phase0: T.sF02, steps: [[T.sF02 + 0.6, -12], [T.L001, -15], [T.L002 - 0.55, -11], [T.sCU, -12], [T.sOTS, -10], [FREEZE - 0.02, -9]] });
      S.bed('heart', T.L002 + 1.2, T.in4 - 0.2, { bpm: 62, bpmTo: 80, level: -26 });   // under the silence before the question
      S.cue('glass', T.glass, { level: -18, pan: -0.2 });                                // deep inside the house; the SMASH stays ~6 dB+ above it
      // the hold on 'I--': the ringing climbs, a heartbeat lands on every blink of the caret; the seventh is the cut
      S.bed('Q01.ring', T.L004, T.smash, { f: 4130, steps: [[T.L004 + 0.5, -48], [27.0, -42], [29.5, -37], [T.smash - 0.02, -35]] });
      S.cue('Q01.slice', T.in4 - 0.01, { level: -24 });                                   // the dash guillotined
      for (let k = 0; k < 6; k++) S.cue('lub', T.in4 + k * 1.06, { level: -22 + k * 1.3 });
      S.cue('Q01.smash', T.smash, { level: -6, gate: T.gate });
    },
    shots: [
      { at: 0, name: 'black', draw(c) { black(c); }, post: NOPOST },
      { at: T.burn0, name: 'wide: the house burns through', draw(c, st, lt) {
        houseShot(c, lt, { x: 900, y: 520, zoom: 1 + 0.004 * st }, true); fgEmbers(c, lt, 14, 1);
        c.reset();
        Y().burnThrough(c, seg(lt, T.burn0, T.burn1, 'inOutSine'), { x: 900, y: 470, t: lt });
      } },
      { at: T.sCurtain, name: 'the curtain', draw(c, st, lt) { houseShot(c, lt, { x: 820, y: 386 + 2 * st, zoom: 2.3 + 0.01 * st }); fgEmbers(c, lt, 12, 1); } },
      { at: T.sF02, name: 'F02: Scott on the grass', draw(c, st, lt) { f02Shot(c, lt, { x: 900, y: 560, zoom: 1 + 0.004 * st }); } },
      { at: T.sMCU, name: 'MCU: Yeah.', draw(c, st, lt) { closeShot(c, lt, { x: 1000, y: 470, zoom: 1.08 + 0.003 * st }, MCU, 'mcu'); } },
      { at: T.sCU, name: 'CU: how many got out?', draw(c, st, lt) { closeShot(c, lt, { x: 979, y: 440, zoom: 1.2 + 0.006 * st }, CU, 'cu'); } },
      { at: T.sOTS, name: 'his stare: the house, glass breaks', draw(c, st, lt) { otsShot(c, st, lt); } },
      { at: T.sECU, name: 'ECU: I--', draw(c, st, lt) {   // a slow dolly-zoom: he stays, the house looms up behind his head
        const z = FILM.key(lt, [[T.sECU, 1.28], [FREEZE, 1.3], [27.8, 1.38, 'inQuad'], [T.smash, 1.62, 'inQuad']]);
        closeShot(c, lt, { x: 1031, y: 610 - (240 + 80 * seg(lt, FREEZE, T.smash, 'inQuad')) / z, zoom: z }, ECU, 'ecu');   // the horizon sinks as he does
      } },
      { at: T.smash, name: 'SMASH: black', draw(c) { black(c); }, post: NOPOST },
    ],
  });
})();
