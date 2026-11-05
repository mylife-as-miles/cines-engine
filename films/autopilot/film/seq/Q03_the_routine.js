/* AUTOPILOT · Q03 · THE ROUTINE (42 s) · S03, A010–A013, L004 (radio), L005 · bathroom (and the wardrobe's mirrored door)
   "A familiar sequence, almost mechanical." A montage on a mechanical rhythm, cutting every 1.5 to 2.5 s, every image a pane:
   the shower's chrome mixer turned on; water and steam on the shower door's glass; his shape behind the fog (shampoo, rinse,
   the towel); the steamed mirror wiped clear in a band (half a face, shaving foam, the razor's stroke; the toothbrush); the
   mixer turned off, the last drips, his reflection bent in the dome. Downstairs the radio. Then the routine runs on, slower,
   in a quiet bathroom: the glass clearing, the band fogging, the same hook, the same shirt, the same footsteps out.
   He never hesitates: every movement is economical and arrives on the beat.
   Deterministic. Characters on twos (FILM.twos); camera, light, glass, water and steam on ones. */
(function () {
  'use strict';
  const { W, H } = OTM, P = LC.P;
  const clamp = OTM.clamp, lerp = OTM.lerp, rgba = OTM.rgba;
  const seg = FILM.seg, key = FILM.key, tw = FILM.twos, E = FILM.ease;
  const sstep = (t, a, b) => { const u = seg(t, a, b); return u * u * (3 - 2 * u); };
  const breathOf = t => (tw(t) * 0.25) % 1;
  const BV = () => SETS.bathroom.views;
  const SKIN = { ambient: '#9C6D55', ambientK: 0.55 };      // behind the fog the body reads as skin: grade the tee and pyjamas to it

  // ---------------------------------------------------------------------------------------------------------------
  // hands: put a chosen point of a RIG hand insert (a fingertip, the pinch, the fist's centre) on a target point.
  // The offset from the wrist is measured once per pose (rounded), by drawing into a tiny canvas.
  // ---------------------------------------------------------------------------------------------------------------
  const _off = {};
  function handOffset(pose, ref) {
    const k = JSON.stringify([pose.pose, pose.size, pose.view, Math.round(pose.rot || 0), Math.round(pose.roll || 0), Math.round((pose.curl == null ? 1 : pose.curl) * 20), pose.side, ref]);
    if (_off[k]) return _off[k];
    const g = OTM.makeCanvas(8, 8).getContext('2d'), info = RIG.hand(g, 'daniel', Object.assign({}, pose, { at: [0, 0] }), {});
    let o = [0, 0];
    if (info) { const pts = ref === 'pinch' ? [info.thumb, info.tips[0]] : ref === 'fist' ? info.tips.concat([info.thumb]) : ref === 'thumb' ? [info.thumb] : [info.tips[ref | 0]];
      o = [pts.reduce((a, q) => a + q[0], 0) / pts.length, pts.reduce((a, q) => a + q[1], 0) / pts.length]; }
    return (_off[k] = o);
  }
  function handAt(g, pose, target, ref, opts) {
    const o = handOffset(pose, ref);
    return RIG.hand(g, 'daniel', Object.assign({}, pose, { at: [target[0] - o[0], target[1] - o[1]] }), opts || {});
  }

  // ---------------------------------------------------------------------------------------------------------------
  // the beats
  // ---------------------------------------------------------------------------------------------------------------
  const T = { on0: 0.45, on1: 1.05, off0: 17.05, off1: 17.55, radio: 16.0, vo: 24.0 };
  const STEAM = t => key(t, [[2.0, 0.06], [4.8, 0.4], [6.5, 0.66], [9.0, 0.8], [14.6, 0.84], [19.0, 0.8], [22.6, 0.6]]);

  // ===============================================================================================================
  // THE TAP: on (0–2) and off (16.8–19); his reflection bent in the dome when it goes off; the water, the last drips.
  // ===============================================================================================================
  function tap(c, st, lt, mode) {
    const v = BV().tap, A = v.anchors, Th = tw(lt);
    let lever, s;
    if (mode === 'on') { lever = E.inOutSine(seg(Th, T.on0, T.on1)); s = { lever, flow: seg(lt, T.on0 + 0.25, T.on1 + 0.2) }; }
    else if (mode === 'off') { lever = 1 - E.inOutSine(seg(Th, T.off0, T.off1)); s = { lever, flow: 1 - seg(lt, T.off0, T.off1 + 0.1), drips: seg(lt, T.off1, T.off1 + 0.4) }; }
    else { lever = 0; s = { lever: 0, flow: 0, drips: 1 - 0.6 * seg(lt, 26.6, 30.4) }; }
    if (mode === 'still') c.camera({ x: 920, y: 540, zoom: 1.0 + 0.004 * st });
    v.back(c, lt, s);
    // his reflection in the dome: a small figure, head bowed toward the lever, pinched into the chrome
    if (mode !== 'on') v.inGlass(c, s, q => { q.fillStyle = '#9EAFAB'; q.fillRect(0, 0, W, H);
      RIG.face(q, 'daniel', { at: [A.hub[0] + 40, A.hub[1] - 30], size: mode === 'off' ? 250 : 230, view: 'three', facing: 1, outfit: 'night', face: 'down', head: { nod: 0.35, turn: 0.1, tilt: 0 }, breath: breathOf(lt) },
        { light: { x: 200, y: 0, color: '#E6F0EE', back: 0.3 }, ambient: '#2A3434', ambientK: 0.3, detail: 0.6 }); });
    // the hand on the lever: a loose fist round its end, turning it (on: up and round; off: down)
    const active = mode === 'on' ? (Th > 0.05 && Th < 1.75) : mode === 'off' ? (Th > 16.8 && Th < 18.3) : false;
    if (active) {
      const tip = v.leverTipAt(lever), ang = Math.atan2(tip[1] - A.hub[1], tip[0] - A.hub[0]) * 180 / Math.PI;
      const near = mode === 'on' ? sstep(Th, 0.05, 0.4) * (1 - sstep(Th, 1.3, 1.75)) : sstep(Th, 16.8, 17.0) * (1 - sstep(Th, 17.75, 18.25));
      const away = [tip[0] + 420, tip[1] + 520], tgt = [lerp(away[0], tip[0], near), lerp(away[1], tip[1], near)];
      handAt(c.g, { size: 600, pose: 'fist', view: 'back', rot: ang + 90, curl: 0.5 + 0.38 * near, sleeve: 'night' }, tgt, 'fist',
        { light: { x: 200, y: 0, color: '#E6F0EE', back: 0.35 }, ambient: '#5E706C', ambientK: 0.18, exposure: 0.92 });
    }
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // THE SHOWER DOOR'S GLASS: water streaks, steam climbing; his shape behind the fog: shampoo, rinse, the towel; empty.
  // ===============================================================================================================
  function shower(c, st, lt, act) {
    const v = BV().shower, A = v.anchors, Th = tw(lt);
    const water = act === 'towel' ? 0.3 * (1 - seg(lt, 12.6, 14.0)) : act === 'empty' ? 0 : 1;
    const s = { steam: act === 'empty' ? key(lt, [[19, 0.78], [22.6, 0.58]]) : STEAM(lt), water, streams: act === 'rinse' ? key(lt, [[7.6, 0.15], [9.8, 0.75]]) : act === 'towel' ? 0.7 : act === 'empty' ? 0.85 : 0.05 };
    if (act === 'empty') c.camera({ x: 960, y: 540, zoom: 1.0 + 0.0045 * st });
    v.back(c, lt, s);
    if (act === 'shampoo' || act === 'rinse' || act === 'towel') v.behind(c, s, g => {
      const scrub = Math.sin(Th * Math.PI * 2 * 2.2), br = breathOf(lt);
      let pose;
      if (act === 'shampoo') pose = { armR: { hand: [0.03 + 0.02 * scrub, 0.42, 0.08] }, armL: { hand: [0.03 - 0.02 * scrub, 0.4, 0.07] }, head: { nod: 0.28, turn: 0.04 * scrub, tilt: 0 }, lean: 0.08 };
      else if (act === 'rinse') { const back = sstep(Th, 7.8, 8.5); pose = { armR: { hand: [0.06, 0.32 - 0.25 * back, 0.1] }, armL: { hand: [0.06, 0.3 - 0.25 * back, 0.1] }, head: { nod: 0.2 - 0.62 * back, turn: 0, tilt: 0 }, lean: -0.12 * back }; }
      else { const rub = Math.sin(Th * Math.PI * 2 * 1.8); pose = { armR: { hand: [0.06 + 0.03 * rub, 0.36, 0.1] }, armL: { hand: [0.06 - 0.03 * rub, 0.35, 0.1] }, head: { nod: 0.3, turn: 0.06 * rub, tilt: 0 }, lean: 0.1 }; }
      const info = RIG.draw(g, 'daniel', Object.assign({ at: A.figureFeet, scale: A.pxPerM, view: 'front', outfit: 'night', face: 'closed', breath: br }, pose), Object.assign({ light: v.light, detail: 0.5 }, SKIN));
      if (act === 'towel' && info && info.head) {     // the towel over his head, hanging to his shoulders: a pale mass of terry
        const hd = info.head, k = A.pxPerM, sl = info.shoulders.L, sr = info.shoulders.R;
        g.fillStyle = '#5E7E76'; g.beginPath(); g.moveTo(Math.min(sl[0], sr[0]) - 0.04 * k, Math.max(sl[1], sr[1]) + 0.12 * k);
        g.quadraticCurveTo(hd[0] - 0.2 * k, hd[1] - 0.2 * k, hd[0], hd[1] - 0.17 * k); g.quadraticCurveTo(hd[0] + 0.2 * k, hd[1] - 0.2 * k, Math.max(sl[0], sr[0]) + 0.04 * k, Math.max(sl[1], sr[1]) + 0.12 * k);
        g.lineTo(hd[0] + 0.1 * k, hd[1] + 0.12 * k); g.lineTo(hd[0] - 0.1 * k, hd[1] + 0.12 * k); g.closePath(); g.fill();
      }
    });
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // THE MIRROR over the sink, steamed: the band wiped clear; half a face; foam and the razor's stroke; the toothbrush;
  // later, the routine slower: the band fogging; at the end, the door in the glass and him leaving.
  // ===============================================================================================================
  const BAND = { x0: -60, x1: 1650, y0: 286, y1: 606 };     // the wiped band's box at the set's default height (frame px)
  const FLR = { face: { x: 560, y: 60, w: 960, h: 820 }, leave: { x: 260, y: 180, w: 1100, h: 900 } };
  const _fls = {}; const faceLayer = r => _fls[r] || (_fls[r] = Object.assign(OTM.makeCanvas(FLR[r].w, FLR[r].h), { R: FLR[r] }));
  function bandPath(w) {
    const x1 = lerp(BAND.x0 + 40, BAND.x1, w), p = new Path2D(), r = (BAND.y1 - BAND.y0) / 2;
    p.moveTo(BAND.x0, BAND.y0 + 4); p.lineTo(x1 - r * 0.4, BAND.y0); p.quadraticCurveTo(x1 + r * 0.25, (BAND.y0 + BAND.y1) / 2, x1 - r * 0.4, BAND.y1); p.lineTo(BAND.x0, BAND.y1 - 4); p.closePath(); return p;
  }
  // foam on the jaw, the cheek and the upper lip; the razor's stroke cuts a clean path down his near cheek
  function foam(g, info, k, stroke) {
    if (!info || !info.eyes) return;
    const e0 = info.eyes[0], e1 = info.eyes[1], ch = info.chin, cx = (e0[0] + e1[0]) / 2, ey = (e0[1] + e1[1]) / 2, d = Math.hypot(e1[0] - e0[0], e1[1] - e0[1]);
    const blobs = [[-1.05, 0.95, 0.42], [-0.85, 1.35, 0.46], [-0.45, 1.62, 0.44], [0, 1.72, 0.4], [0.45, 1.62, 0.44], [0.85, 1.35, 0.46], [1.05, 0.95, 0.42], [-0.3, 1.18, 0.26], [0.3, 1.18, 0.26]];
    const fg = g; fg.save();
    const path = new Path2D(); blobs.forEach(([u, v2, r]) => { const x = cx + u * d * 0.9, y = ey + v2 * (ch[1] - ey) * 0.62; path.moveTo(x + r * d, y); path.arc(x, y, r * d, 0, Math.PI * 2); });
    fg.fillStyle = '#E8EEEC'; fg.fill(path);
    fg.save(); fg.clip(path); fg.fillStyle = 'rgba(150,170,168,0.45)'; fg.fillRect(cx - 2 * d, ey + 0.95 * (ch[1] - ey), 4 * d, 2 * d); fg.restore();
    if (stroke > 0) {   // the clean path the razor leaves: from the cheekbone down to the jaw, on the near side
      const x = cx - 0.78 * d, y0 = ey + 0.45 * (ch[1] - ey), y1 = lerp(y0, ey + 1.12 * (ch[1] - ey), stroke);
      fg.globalCompositeOperation = 'destination-out'; fg.lineCap = 'round'; fg.lineWidth = 0.42 * d; fg.beginPath(); fg.moveTo(x, y0); fg.lineTo(x + 0.08 * d, y1); fg.stroke(); fg.globalCompositeOperation = 'source-over';
    }
    fg.restore();
    return { cx, ey, d, ch };
  }
  function razor(g, at, ang, k) {        // a plain razor: a pale handle and a dark head (drawn in the reflection, small)
    g.save(); g.translate(at[0], at[1]); g.rotate(ang);
    g.fillStyle = '#C9D2D0'; g.fill(LC.rrect(-6, 0, 12, 0.12 * k, 5)); g.fillStyle = '#2A3434'; g.fill(LC.rrect(-0.022 * k, -10, 0.044 * k, 14, 4)); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-0.02 * k, -9, 0.04 * k, 2);
    g.restore();
  }
  function toothbrush(g, at, ang, k) {
    g.save(); g.translate(at[0], at[1]); g.rotate(ang);
    g.fillStyle = '#4E6A8A'; g.fill(LC.rrect(0, -5, 0.16 * k, 10, 5)); g.fillStyle = '#E8EEEC'; g.fill(LC.rrect(-0.03 * k, -9, 0.032 * k, 12, 3));
    g.restore();
  }
  function mirror(c, st, lt, act) {
    const v = BV().mirror, A = v.anchors, Th = tw(lt), g = c.g;
    const s = { steam: 0.9, door: 0, wipe: 1, refog: 0 };
    if (act === 'wipe') s.wipe = seg(lt, 9.95, 10.6, 'inOutSine');
    if (act === 'brush') s.refog = 0.22;
    if (act === 'slow') s.refog = key(lt, [[22.6, 0.3], [26.6, 0.42]]);
    if (act === 'done') s.refog = key(lt, [[30.4, 0.45], [34, 0.62]]);
    if (act === 'leave') { s.refog = key(lt, [[39, 0.4], [42, 0.85]]); s.door = 0.78; }
    if (act === 'leave') c.camera({ x: 990, y: 470, zoom: 1.0 + 0.003 * st });
    v.back(c, lt, s);
    // the reflection: drawn into its own layer (full strength in the band, faint under the fog), changed on twos
    const L = faceLayer(act === 'leave' ? 'leave' : 'face'), R = L.R, q = L.getContext('2d'), k2 = Math.floor(Th * 12 + 0.5) + '|' + act;
    if (L._key !== k2) { L._key = k2; q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, L.width, L.height); q.translate(-R.x, -R.y);
      const k = A.facePxPerM, fa = A.faceInMirror, light = { x: 300, y: 200, color: '#DCE8E6', back: 0.3 };
      if (act === 'leave') {          // him leaving through the door behind, his back to the glass, already dressed for work
        const u = seg(Th, 39.15, 41.9), x = lerp(0.15, -0.72, u), z = lerp(-0.55, -2.05, u);
        const mp = v.cam.p(x, 0, -z), sc = v.cam.k(mp[2]);       // the mirror at z = 0 gives back the point (x, y, z) at (x, y, -z)
        RIG.draw(q, 'daniel', { at: [mp[0], mp[1]], scale: sc, view: 'back', body: 'walk', phase: (u * 1.65 / 1.25) % 1, outfit: 'day', collar: 'crooked', face: 'tired' },
          { light: { x: A.doorInMirror[0], y: A.doorInMirror[1] - 300, color: '#F2D7A6', back: 0.82 }, ambient: '#5E7270', ambientK: 0.22, detail: 0.5 });
      } else {
        const fp = act === 'wipe' ? { face: 'tired', lid: 0.45, head: { nod: 0.08, turn: 0.02, tilt: 0.04 } }
          : act === 'brush' ? { face: 'tired', lid: 0.55, open: 0.35, head: { nod: 0.05, turn: 0, tilt: 0.02 } }
          : act === 'slow' ? { face: 'down', lid: 0.7, head: { nod: 0.25, turn: 0.05, tilt: 0.03 } }
          : { face: 'tired', lid: 0.5, head: { nod: key(Th, [[30.4, 0.1], [32.8, 0.12], [33.6, 0.3]]), turn: key(Th, [[30.4, 0], [32.8, 0], [33.8, -0.5]]), tilt: 0 } };
        const info = RIG.face(q, 'daniel', Object.assign({ at: fa, size: 330, view: 'three', yaw: 18, facing: -1, outfit: 'night', breath: breathOf(lt), stubble: act === 'wipe' ? 0.5 : 0 }, fp), { light, detail: 0.85 });
        if (act === 'wipe') {        // foam, then the razor's first stroke down his cheek
          const stroke = seg(Th, 11.15, 11.95), f = foam(q, info, k, stroke);
          if (f && Th > 10.7) { const rz = [f.cx - 0.7 * f.d, lerp(f.ey + 0.42 * (f.ch[1] - f.ey), f.ey + 1.05 * (f.ch[1] - f.ey), stroke)];
            razor(q, rz, 0.15, k);
            handAt(q, { size: 0.15 * k, pose: 'fist', view: 'back', rot: 60, curl: 0.9, sleeve: 'night' }, [rz[0] + 0.012 * k, rz[1] + 0.13 * k], 'fist', { light, ambient: '#3E4A48', ambientK: 0.15 }); }
        }
        if (act === 'brush' && info && info.eyes) {   // the toothbrush working at his mouth
          const e0 = info.eyes[0], e1 = info.eyes[1], cx = (e0[0] + e1[0]) / 2, ey = (e0[1] + e1[1]) / 2, ch = info.chin, my = ey + 0.62 * (ch[1] - ey);
          const wob = 0.025 * k * Math.sin(Th * Math.PI * 2 * 3.2), mp = [cx - 0.03 * k + wob, my];
          handAt(q, { size: 0.17 * k, pose: 'grip', view: 'back', rot: 200, curl: 1, sleeve: 'night' }, [mp[0] - 0.13 * k, mp[1] + 0.03 * k], 'fist', { light, ambient: '#3E4A48', ambientK: 0.15 });
          toothbrush(q, [mp[0] - 0.12 * k, mp[1] + 0.02 * k], -0.12, k);
        }
        if (act === 'slow') {        // his hand smooths back his wet hair: without looking, without a pause
          const u = (Th - 22.6) / 1.9, ph = u - Math.floor(u), sweep = sstep(ph, 0.15, 0.75);
          if (info && info.top) handAt(q, { size: 0.19 * k, pose: 'flat', view: 'back', rot: 200 - 30 * sweep, curl: 0.4, sleeve: 'night' }, [info.top[0] + 0.12 * k - 0.16 * k * sweep, info.top[1] + 0.02 * k + 0.05 * k * sweep], 1, { light, ambient: '#3E4A48', ambientK: 0.15 });
        }
      }
    }
    // the reflection: full in the wiped band, faint under the fog everywhere else
    v.inGlass(c, s, gg => {
      const band = bandPath(s.wipe), comp = new Path2D(); comp.rect(-200, -200, W + 400, H + 400); comp.addPath(band);
      gg.save(); gg.clip(comp, 'evenodd'); gg.globalAlpha = 0.26; gg.drawImage(L, R.x, R.y); gg.restore();
      gg.save(); gg.clip(band); gg.drawImage(L, R.x, R.y); gg.restore();
    });
    v.front(c, lt, s);
    // the wiping hand: his own, on the glass (nearer than the fog), sweeping the band clear from left to right
    if (act === 'wipe' && Th > 9.8 && Th < 10.9) {
      const u = seg(Th, 9.95, 10.6, 'inOutSine'), x = lerp(BAND.x0 + 120, BAND.x1 - 80, u), y = (BAND.y0 + BAND.y1) / 2 + 40 - 30 * Math.sin(Math.PI * u);
      const ex = Th > 10.6 ? seg(Th, 10.6, 10.9) : 0;
      handAt(g, { size: 470, pose: 'relaxed', view: 'back', rot: -100 + 16 * u, curl: 0.22, sleeve: 'night' }, [x + 260 * ex, y + 700 * ex], 1, { light: { x: 300, y: 200, color: '#DCE8E6', back: 0.4 }, ambient: '#5E706C', ambientK: 0.25, exposure: 0.85 });
    }
  }

  // ===============================================================================================================
  // THE HOOK on the back of the door, worn pale where the towel always goes; the towel goes up on it, again.
  // ===============================================================================================================
  function hook(c, st, lt) {
    const v = BV().hook, A = v.anchors, Th = tw(lt), s = { towel: seg(lt, 34.45, 35.3) };
    v.back(c, lt, s);
    if (Th > 34.0 && Th < 36.2) {
      const hold = Th < 34.5, from = A.towelFrom, at = A.hook;
      const tgt = hold ? key(Th, [[34.0, [from[0] + 200, from[1] - 200]], [34.45, [at[0] + 40, at[1] - 50], 'outCubic']]) : key(Th, [[34.5, [at[0] + 40, at[1] - 50]], [35.0, [at[0] + 160, at[1] - 170]], [36.2, [from[0] + 500, from[1] - 400], 'inCubic']]);
      handAt(c.g, { size: 420, pose: hold ? 'grip' : 'relaxed', view: 'back', rot: 135, curl: hold ? 0.9 : 0.5, sleeve: 'night' }, tgt, 'fist', { light: v.light, ambient: '#7E908C', ambientK: 0.2 });
    }
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // THE WARDROBE: the mirrored door slides away; a row of the same pale-blue shirt; his hand takes the same one.
  // ===============================================================================================================
  function wardrobe(c, st, lt) {
    const v = BV().wardrobe, A = v.anchors, Th = tw(lt);
    const slide = 0.05 + 0.9 * E.inOutSine(seg(lt, 37.05, 37.85));
    const s = { slide };
    v.back(c, lt, s);
    // his hand: on the door's edge, pushing it along; then straight to the fifth shirt's hanger
    const edge = A.doorEdgeAt(slide), hanger = A.hanger;
    let tgt, pose;
    if (Th < 37.95) { tgt = key(Th, [[36.95, [edge[0] + 380, edge[1] + 300]], [37.1, edge]]); if (Th >= 37.1) tgt = [edge[0] + 6, edge[1]]; pose = { size: 170, pose: 'flat', view: 'back', rot: 185, curl: 0.4, sleeve: 'night' }; }
    else { tgt = key(Th, [[37.95, [edge[0] + 6, edge[1]]], [38.55, [hanger[0] + 4, hanger[1] + 6], 'outCubic'], [39.0, [hanger[0] + 6, hanger[1] - 4]]]); pose = { size: 170, pose: Th > 38.5 ? 'grip' : 'reach', view: 'back', rot: 200, curl: Th > 38.5 ? 0.9 : 0.6, sleeve: 'night' }; }
    handAt(c.g, pose, tgt, Th < 37.95 ? 1 : 'fist', { light: v.light, ambient: '#3E4C4C', ambientK: 0.2 });
    v.front(c, lt, s);
  }

  // ===============================================================================================================
  // THE SEQUENCE
  // ===============================================================================================================
  const shot = (at, name, fn) => ({ at, name, draw: fn });
  FILM.seq({
    id: 'Q03', title: 'The routine', dur: 42,
    lines: [
      { id: 'L004', at: T.radio, level: -15 },       // the radio, downstairs, faint and small: "We're expecting another scorcher today..."
      { id: 'L005', at: T.vo },                      // V.O.: You do something often enough, and your brain stops asking you to do it...
    ],
    sound(S) {
      S.cue('tap_squeak', T.on0, { kind: 'the shower mixer lever turned on', level: -30 });
      S.bed('shower', T.on0 + 0.25, T.off1, { level: -30, fi: 0.4, fo: 0.3, kind: 'the shower running, water on glass and tiles' });
      S.bed('room', 0, 42, { level: -46, kind: 'a small tiled bathroom, close and damp' });
      S.cue('glass_wipe', 9.98, { kind: 'a palm squeaking across a steamed mirror', level: -32 });
      S.cue('razor', 11.15, { n: 1, kind: 'one stroke of a razor through foam', level: -30 });
      S.cue('towel_rustle', 12.7, { level: -36 });
      S.cue('toothbrush', 14.7, { kind: 'brushing teeth, brisk', level: -32 });
      S.cue('tap_squeak', T.off0, { kind: 'the shower mixer lever turned off', level: -30 });
      S.cue('drips', T.off1 + 0.1, { n: 5, kind: 'the last drips from the rose onto the tray', level: -36 });
      S.duck(T.radio - 0.2, T.radio + 7.0, 0.7);            // the bathroom drops a little under the radio from downstairs
      S.cue('drips', 27.0, { n: 3, kind: 'a drip from the mixer', level: -40 });
      S.cue('towel_rustle', 34.4, { level: -36, kind: 'the towel dropped onto the hook' });
      S.cue('wardrobe', 37.05, { kind: 'a mirrored wardrobe door sliding on its track', level: -32 });
      S.cue('hanger_click', 38.6, { kind: 'a wire hanger lifted off the rail', level: -36 });
      S.cue('footsteps', 39.3, { n: 4, surface: 'bare feet, bathroom tiles to landing carpet', level: -38 });
    },
    shots: [
      shot(0, 'the chrome mixer turned ON', (c, st, lt) => tap(c, st, lt, 'on')),
      shot(2.0, 'the shower glass: water streaks, steam starting', (c, st, lt) => shower(c, st, lt, 'start')),
      shot(4.8, 'behind the fogging glass: his shape, hands at his head (shampoo)', (c, st, lt) => shower(c, st, lt, 'shampoo')),
      shot(7.6, 'rinse: the shape tips back; streams clear lines in the fog', (c, st, lt) => shower(c, st, lt, 'rinse')),
      shot(9.8, 'the mirror: a band wiped clear; half a face, foam, the razor', (c, st, lt) => mirror(c, st, lt, 'wipe')),
      shot(12.6, 'the towel: his shape behind the glass, a towel across his shoulders', (c, st, lt) => shower(c, st, lt, 'towel')),
      shot(14.6, 'the mirror again: the toothbrush, the face cropped by steam', (c, st, lt) => mirror(c, st, lt, 'brush')),
      shot(16.8, 'the chrome mixer turned OFF; the last drips; his reflection in the dome', (c, st, lt) => tap(c, st, lt, 'off')),
      shot(19.0, 'the shower glass, empty: the steam thinning, the last runnels', (c, st, lt) => shower(c, st, lt, 'empty')),
      shot(22.6, 'the mirror: the band fogging; his hand smooths his hair without looking', (c, st, lt) => mirror(c, st, lt, 'slow')),
      shot(26.6, 'the mixer, off: a drip, his reflection bent in the chrome', (c, st, lt) => tap(c, st, lt, 'still')),
      shot(30.4, 'the mirror: done; he turns away', (c, st, lt) => mirror(c, st, lt, 'done')),
      shot(34.0, 'the same hook, worn pale: the towel', (c, st, lt) => hook(c, st, lt)),
      shot(37.0, 'the wardrobe mirror slides: the same shirt', (c, st, lt) => wardrobe(c, st, lt)),
      shot(39.0, 'the mirror: the door, him leaving; the band fogging over', (c, st, lt) => mirror(c, st, lt, 'leave')),
    ],
  });
})();
