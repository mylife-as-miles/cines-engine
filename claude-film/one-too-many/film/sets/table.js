/* ONE TOO MANY — SETS.table: the dining table, the heart of the film (Q05-Q09).
   Ports F05 (seven hands, top-down), F06 (six hands, low angle), F07 (hand circle), F08 (the photo) and the S03 card-table,
   hand-circle and photo tiles. Draws the ENVIRONMENT only; the cast comes from RIG / OTM.fig, placed by the sequences
   (the demos draw placeholder figures so the compositions can be judged; set SETS.table.bare = true to hide them).

   ---------------------------------------------------------------------------------------------------------------- USE
     const T = SETS.table;
     c.camera(T.cams.top);                    // any named cam (below) or your own {x,y,zoom,rot,dx,dy}; FILM.key can tween cams
     T.back(c, t, state, 'top');              // under the characters
     ...characters...                         // place them with T.anchors.<view> / T.top.seatAt; rim toward T.lights.<view>
     T.front(c, t, state, 'top');             // over them: pendant shade (re-stamped after the bloom), dust, light cone, phone, flash
     T.draw(c, t, state, view)                // back + front, for shots without characters
   'low' is three layers so far bodies sit behind the tabletop's far lip:
     T.back(c,t,s,'low',{part:'wall'}); far bodies (Angelo, Scott, Kay); T.back(c,t,s,'low',{part:'table'}); hands + near bodies; T.front(...)
   t is any seconds value (dust drift, ember flicker, tremble); pass c.lt or the shot time.
   PERFORMANCE: the static layers (top: floor, boards, hood wedge, chairs, table rings; low: wall + table rings) are cached
   screen-aligned per camera rotation/zoom + state, and blitted unsmoothed (~1 ms). Static cams and drifts/pans hit the cache;
   a changing zoom/rotation or an animating chair/light draws live (~10 ms). T.noCache = true forces live drawing.
   Cache your own still layers (Q08's clasped bodies) with T.cacheLayer(c, key, g => {...}, sig). Engine note: any VOICE cut
   (knockout) costs the engine's hole pass, ~20 ms/frame; the hand-circle demo is ~33 ms/frame with bodies cached.

   ---------------------------------------------------------------------------------------------------------------- VIEWS
   'top'      overhead, 12 o'clock up, table centre (960,540), radius 352 px (0.66 m; 533 px/m). LOCKED seats at 60 deg: Scott 180 (6:00),
              Kay 240, Marina 300, Christof 0, Deena 60, Angelo 120; the gap 150 (5:00, Scott's RIGHT). People sit shifted in their
              chairs away from the gap (T.top.SHIFT6). Pendant = black disc in three posterised rings (F05). layout:'circle' = the
              hand circle (F07): Scott, Marina, Deena, Angelo on a stretched ring, the long Scott-Angelo link across the gap at 5:00.
   'low'      F06: low camera at Christof's place (12:00) across the table toward Scott; the dark HALL doorway behind the gap
              (screen left of Scott), the KITCHEN doorway between Scott and Kay (screen right). Far bodies: Angelo (left), Scott
              (centre, front-on bust), Kay (right). Near: Deena (left edge), Marina (right edge), Christof = the camera.
   'two'      profile two-shot: Kay left facing right, Scott right facing left, pendant between them, the far side of the table with
              the other four as soft dark shapes (state.behind = ids, default the four). kitchenLight: a far hood sliver behind Kay.
   'kayglass' insert: Kay's glass, first pour, a partial smudged #D9262F lip print on the rim; state.tapT = seconds since the tap.
   'bottle'   insert at table height: five fresh glasses in a row (index 2 = Deena's, 4 = the unclaimed fifth), Kay's glass apart.
              The bottle is simply THERE across a cut: play the THUMP (thumpT) with it out of frame or soft (bottle.soft), then cut.
   'wall'     the photographer's framing (lens 1.5 m): dining wall, door frame at left, picture frame; four waist-up busts with a
              person-sized gap between Angelo and Scott; table edge + two chair backs as the dark foreground. flash = the shutter.
   'phone'    F08: dark room, lit hall through the doorway; Marina's ringed hand holds the phone; the screen shows T.photo(who),
              which IS the wall view's flash frame (same slots, leans and room), cropped.

   ---------------------------------------------------------------------------------------------------------------- STATE (all optional)
   lampTired 0..1     tungsten drains toward #C98A4B (hot band 75% of the way, mid band held darker: a clear 3-step ladder) and the
                      pool shrinks 15% (top, low, two, inserts; wall/phone default 1)
   kitchenLight 0..1  the kitchen's sick hood-yellow (low: the doorway + spill; top: a floor wedge lower left; two: a far sliver;
                      inserts: a far defocused doorway with casing, half-open leaf, wall spill and threshold; bottle glints)
   perforations       0..1 or {scott:0..1, angelo:0..1}: the VOICE's ember pinholes, persisting after Q08 (top, low, two, wall).
   perforationLevel   loudness of the painted pinholes, default 0.6 (a whisper); 1 = loud. perfCut:true = real knockouts (+~20 ms).
   layout             'six' (default) | 'circle' (top; low resolves names to the circle places too)
   piles              7 = the F05 misregistered seven-ring. n < 7 = one pile squarely before each person PRESENT (s.empty / chairs
                      empty skipped), + the gap when n = present + 1 ('four piles, then a FIFTH'), fewer = the first n from Scott.
                      Or a list of entries: a name ('scott'..'angelo','gap'), clock degrees, {clock, r}, [x,y] (top world), or
                      {at: any of those, n: cards, mess, ring}.
   ring               how names resolve in lists: 'seven' (default, PLACE7) | 'seats' (squarely before each chair)
   pileCards, mess    cards per pile (default 1; F05 uses 5); 0..1 scatter for the noisy later game
   gapPress 0..1      (doctrine L2) the gap card lifted with a drop shadow (0) pressed flat by NO hand (1) (top, low)
   flying             [{from, to, u, h, spin}]: cards in flight. from/to: 'dealer' | a pile name | clock | {clock,r} | [x,y]; u 0..1
   deck               true | {at:[x,y], rot, fan:0..1, n, split:0..1, riffle:0..1}: the deck at the dealer's hands (top); split/riffle
                      = the dovetail shuffle (T.riffleHands gives where his hands hold the halves)
   glasses            {id: fill | {fill 0..1.3, lip:bool, hide:bool, at:id|[x,y]}}. Default: all six (Kay lip-marked); in 'circle' the four.
                      fill > 1 = overfilled, wine on the table.
   glassSwap 0..1     Deena's and Angelo's glasses trade places (top)
   fifthGlass 0..1    the FIFTH glass on its coaster, in the gap
   bottle             0..1 | {u, at:[x,y] (top) | x,y,h (bottle view) | mouth:[x,y], rot, soft:0..1}: u = descent (lands at 1; prefer
                      cutting to u=1), soft = out of focus close to the lens. top: behind Scott, gap side of his right shoulder.
   fresh 0..5, freshFill (n | [..]), freshAt [[x,y]..] (top)     five fresh glasses (top: an arc between shade and piles near Scott)
   pour {i, level, flow} (bottle view)   thumpT (bottle view: seconds since the THUMP; all glasses jolt)   kayGlass:false (bottle view)
   tapT, kayFill, lip:false (kayglass)
   biscuit            Christof's biscuit stays at his place (top, low)
   chairs             {id: false | {out px (+ pulled back, - tucked in), dc deg, rot rad, empty:bool, alpha}}; empty:[ids] marks empty chairs
                      (an empty chair shows its seat from above, its back in 'low'). extraChair 0..1 | {u,out,rot,dc}: a seventh chair at the gap.
                      Bodies follow their chairs through T.top.seatAt / T.low.seatAt ('Angelo shoves his chair back').
   extraHand 0..1     the sixth hand out of the dark at the gap, onto the gap card: no rim, no shadow, no body (top, low)
   flash 0..1, figs   wall: the flash frame; figs = [OTM.Shape|Path2D] of the four, drawn paper-white with hard ink shadows
   phone {x,y,rot,s}, hand:false, screen:'photo'|'glow'|'off', who:[ids|null], zoom 1..4, focus:[u,v] (default the gap), tremble   (phone)
   restamp:false      skip the re-stamps (top shade, phone screen) and do them yourself with T.shade / T.phoneScreen
   overShade(cx), overScreen(cx)   drawn right AFTER the re-stamp, with cx carrying the camera transform (world coords): Angelo's
                      pinch over the screen, words lying on the table plane over the shade
   dust:false         no dust motes

   ---------------------------------------------------------------------------------------------------------------- HELPERS
   T.cardInFlight(c, from, to, u, {view, state, h, spin})     T.fanDeck(c, x, y, {n 16, u, spread 100 deg, r, w, h, rot, face, lampTired})
   T.deck(c, x, y, rot, {fan, n, split, riffle})   T.riffleHands(at=[x,y], rot, {split, riffle, n}) -> [[l],[r]]   T.card(c, x, y, rot, k)
   T.glassTop(c, [x,y], {fill, lip, coaster}, state)   T.glassSide(c, footX, footY, height, {fill, lip, lipSide}, state, light)
   T.bottleSide(c, footX, footY, height, rot, state, light) -> {foot, mouth, neck, shoulder, grip, rot, height, up, M}
   T.bottleAt(state, 'bottle'|'top'|'low') -> {foot, mouth, neck, shoulder, grip (body), rot, height, up}: pose Scott's hand on it
   T.photo(who = ['deena','angelo',null,'scott','marina']) -> canvas 1520x668 (null = the empty place: nothing is drawn there)
   T.wallBusts(who, {tremble, t, hand:false, opts:{id: bustOpts}}) -> [{id, slot, x, lean, b (OTM bust), handOn}] (Marina's hand
     on Scott's shoulder when she stands at his left)      T.wallBust(id, opts)   one bust placed by its waist slot
   T.voiceCut(c, view, 'scott'|'angelo', depth)   cut the VOICE through the paper exactly where its perforations will persist
   T.voiceAt(view, which, cam) -> {x, y, size, rot, face, text} on screen, for a plain VOICE line def
   T.shade(c, state, cx, m)   T.phoneScreen(c, state, cx, m)   the re-stamps, into cx under camera matrix m (capture m = c.g.getTransform()
     in your draw before pushing into c.before)      T.sayAbove(c, who, text, x, y, opts)   a line drawn above the re-stamps
   T.cacheLayer(c, key, g => {...world drawing...}, sig)   screen-aligned static cache (see PERFORMANCE)
   T.flashFigs(c, shapes, flash)    T.castTop(c, shapeOrPath, alpha, k)   F05 radial shadow of a top-view figure
   T.camAt([wx,wy], [sx,sy], zoom, rot) -> cam putting a world point at a screen point
   T.top: P(clock, r), Z(x,y,z), shadow(x,y,z), kz, seat(id, layout), seatAt(id, state), chairAt(id, state), present(state),
          pile(spec, state), piles(state), glass(id, state), fresh(i), bottle(), PLACE7, SEAT6, SHIFT6, GAP, G, circle
   T.low:  P3(e, y, n) metres -> [sx, sy, depth], CL(clock, r), pxm(e,n), onTable, lamp, seat, seatAt(id, state), fresh(i), bottle()
   T.silFill(g, path, fill, ux, uy, w, rim, alpha)   camera-safe ink fill with an inner rim crescent toward (ux,uy)    T.pal(tired)

   ---------------------------------------------------------------------------------------------------------------- ANCHORS / CAMS
   T.anchors.top    {centre, tableR, figScale 94, seats{id:{clock, chairClock, x, y, dir, chair, pile7, pile, glass, hands[[l],[r]]}},
                     gap{clock, seat, pile7, edge, floor, fifthGlass, voice, voiceSoft}, dealer{deck, hands, dir}, circle{figScale 120,
                     seatR, seats, clasps, hands, fifthGlass}, pendant{x, y, r, height}, bottle, fresh[5], freshWho, light}
   T.anchors.low    {seats{id:{clock, head[x,y], scale px/head, facing 1|-1|0 (0 = front-on), near, card7, card, depth}}, gap{card, door,
                     elbow, shoulder, voice, voiceSoft}, kitchenDoor, hallDoor, dealer{deck, hands, scale}, light}
   T.anchors.two    {kay:{x, y (hip), scale, facing, glass, hand}, scott:{...}, lamp, table, behind, voice}
   T.anchors.kayglass {foot, height, rim, tap, lip}   T.anchors.bottle {fresh[[x,y]], freshWho, deena: 2, glassH, kay, bottle{foot,
                     mouth, neck, shoulder, grip, rot, height, up}}
   T.anchors.wall   {slots{id:[waistX, lean]}, order, waistY, scale, floorY, flashOffset, voice, voiceSoft, bust, busts, photoCrop}
   T.anchors.phone  {phone{x,y,rot,w,h}, heads{scott, deena, angelo} (F08 head centres), light}
   T.light / T.lights.<view> {x, y, color?}: the key light for rims (phone: cool C.phoneWhite).  T.cams: top (F05 framing),
   topCentre, topWide, topGap, topDealer, circle (F07: Scott at the bottom, the gap at ~4 o'clock; the VOICE is placed by it),
   gapFloor, low, lowPush, two, kayglass, bottle, wall, phone.        */
(function (global) {
  'use strict';
  const O = global.OTM; const { C, W, H, S } = O;
  const SETS = global.SETS = global.SETS || {};
  const D2R = Math.PI / 180, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const sm = t => t * t * (3 - 2 * t), outCubic = t => 1 - (1 - t) ** 3;
  const mix = O.mix, rgba = O.rgba;
  const LIP = '#D9262F', GOLD = '#D4AF5E';
  const wrap360 = d => ((d % 360) + 360) % 360;
  const MEMO = new Map();
  const memo = (k, fn) => { if (!MEMO.has(k)) MEMO.set(k, fn()); return MEMO.get(k); };
  const q12 = v => Math.round(clamp(v || 0, 0, 1) * 12) / 12;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const norm2 = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

  // ------------------------------------------------------------------ palette (lampTired drains the tungsten) ----------
  // A tired lamp keeps a clear three-step value ladder (about 154 / 90 / 36 luma): the hot band drains toward #C98A4B,
  // the mid band is held DARKER, so the posterised rings still pop at ~75% ink instead of turning into a muddy tan pool.
  const MID_TIRED = mix(mix(C.tungstenMid, C.tungstenTired, 0.25), C.tungstenLow, 0.38);
  function pal(tired) {
    const k = q12(tired);
    return {
      k, shrink: 1 - 0.15 * k,
      hot: mix(C.tungsten, C.tungstenTired, 0.75 * k),
      mid: mix(C.tungstenMid, MID_TIRED, k),
      low: mix(C.tungstenLow, mix(C.tungstenLow, C.ink, 0.3), k),
      floor1: mix('#2E2016', '#251D17', k), floor0: mix('#1A120D', '#17120F', k),
      wall: ['#1A130F', '#2B1E15', '#4E3520'].map((h, i) => mix(h, ['#18130F', '#291F18', '#44362A'][i], k)),
    };
  }

  // ------------------------------------------------------------------ drawing utils (transform-safe) ----------
  // Silhouette with a crisp inner rim crescent on the side facing (ux,uy). Pure path ops, so it is correct under any c.camera()
  // (OTM.silhouette composites through a screen-space temp canvas and is NOT camera-safe).
  function silFill(g, path, fill, ux, uy, w, rim, rimAlpha) {
    g.fillStyle = fill; g.fill(path);
    if (!w || !rim) return;
    g.save(); g.clip(path); g.globalAlpha = rimAlpha == null ? 1 : rimAlpha; g.fillStyle = rim; g.fill(path);
    g.globalAlpha = 1; g.translate(-ux * w, -uy * w); g.fillStyle = fill; g.fill(path); g.restore();
  }
  // posterised bands: Path2Ds outer -> inner, a printed dither seam on each inner edge
  function bands(g, paths, cols, seam) {
    paths.forEach((p, i) => {
      g.fillStyle = cols[i]; g.fill(p);
      if (i > 0 && seam !== false) { g.save(); g.strokeStyle = O.ditherPattern(g, cols[i - 1]); g.lineWidth = 5; g.stroke(p); g.restore(); }
    });
  }
  const scaleAbout = (g, x, y, k) => { g.translate(x, y); g.scale(k, k); g.translate(-x, -y); };
  const rrShape = (x, y, w, h, q) => S().M(x + q, y).L(x + w - q, y).Q(x + w, y, x + w, y + q).L(x + w, y + h - q).Q(x + w, y + h, x + w - q, y + h).L(x + q, y + h).Q(x, y + h, x, y + h - q).L(x, y + q).Q(x, y, x + q, y).Z();
  // cut through the paper to the ember lightbox, in WORLD coordinates under the current camera
  function cutPath(c, path, depth) {
    if (!(depth > 0)) return; const h = c.f.markHoles(); h.save(); h.setTransform(c.g.getTransform()); h.globalAlpha = clamp(depth, 0, 1); h.fillStyle = '#fff'; h.fill(path); h.restore();
  }
  function cutText(c, str, x, y, rot, F, depth) {
    if (!(depth > 0)) return; const h = c.f.markHoles(); h.save(); h.setTransform(c.g.getTransform()); h.translate(x, y); h.rotate(rot || 0);
    h.globalAlpha = clamp(depth, 0, 1); h.fillStyle = '#fff'; h.font = O.font(F); h.letterSpacing = (F.tracking || 0) + 'px'; h.textAlign = 'center'; h.textBaseline = 'alphabetic'; h.fillText(str, 0, 0); h.restore();
  }
  // drifting dust in a convex quad (bilinear), deterministic
  function dustQuad(g, q, n, color, seed, t, alpha) {
    const r = O.rng(seed); g.save(); g.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const u0 = r(), v0 = r(), sp = 0.004 + r() * 0.01, ph = r() * 50, s = 0.8 + r() * 1.8;
      const u = clamp(u0 + 0.03 * (O.vnoise(t * 0.25 + ph, i, 3) - 0.5), 0, 1), v = (v0 + t * sp) % 1;
      const a = [lerp(q[0][0], q[1][0], u), lerp(q[0][1], q[1][1], u)], b = [lerp(q[3][0], q[2][0], u), lerp(q[3][1], q[2][1], u)];
      g.globalAlpha = (alpha || 1) * (0.2 + 0.55 * O.vnoise(t * 0.7 + ph, 0, 5)); g.fillRect(lerp(a[0], b[0], v), lerp(a[1], b[1], v), s, s);
    }
    g.restore();
  }
  function emit(c, fn) { const e = c.em; e.save(); fn(e); e.restore(); }

  // ------------------------------------------------------------------ screen-aligned layer cache ----------
  // A static layer is rendered ONCE per (camera rotation + zoom, state signature) into an offscreen canvas aligned with the
  // screen, then blitted with a plain unsmoothed translate (~0.8 ms). A world-space cache would have to be resampled under
  // the rotated cams (about 11 ms in software, slower than drawing live), so it is never used. Camera pans and drift reuse
  // the cache, snapped to a 128 px grid with a 96 px margin; a static camera reproduces the live pixels exactly.
  // When the key changes on consecutive frames (a push, a rotating cam, a chair being dragged, a light fading), the layer
  // is drawn live instead of churning new caches. fn(g) draws in WORLD coordinates (the current camera is applied); it must
  // only touch g (no c.em, c.before, knockouts).
  const LCACHE = { built: new Set(), last: {}, phase: new Map() };
  function cacheLayer(c, slot, sig, fn) {
    const g = c.g; if (T.noCache || !c.cache) { fn(g); return false; }
    const m = g.getTransform(); const GR = 128, MG = 96;
    const E = Math.round(m.e / GR) * GR, F = Math.round(m.f / GR) * GR;
    const key = 'table:L:' + slot + ':' + sig + ':' + [m.a, m.b, m.c, m.d].map(v => v.toFixed(5)).join(',') + ':' + E + ',' + F;
    const fr = c.frame == null ? -9 : c.frame, prev = LCACHE.last[slot]; const known = LCACHE.built.has(key);
    const churn = !known && prev && prev.key !== key && prev.fresh && fr === prev.frame + 1;
    LCACHE.last[slot] = { key, frame: fr, fresh: !known };
    if (churn) { fn(g); return false; }
    if (LCACHE.built.size > 400) LCACHE.built.clear();
    LCACHE.built.add(key);
    const cv = c.cache(key, q => { const fx = m.e - Math.round(m.e), fy = m.f - Math.round(m.f); LCACHE.phase.set(key, [fx, fy]); q.setTransform(m.a, m.b, m.c, m.d, E + MG + fx, F + MG + fy); fn(q); }, W + 2 * MG, H + 2 * MG);
    const ph = LCACHE.phase.get(key) || [0, 0];
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(cv, Math.round(m.e - ph[0]) - E - MG, Math.round(m.f - ph[1]) - F - MG); g.restore();
    return true;
  }

  // ------------------------------------------------------------------ the VOICE: anchors and persistent perforations ----------
  // Each view has a place at Scott's right where the VOICE was cut. 'scott' = L144 (Angelo's face), 'angelo' = L162 (Scott's face, soft).
  // top: placed by where F07 puts the word ON SCREEN under cams.circle (x 1150-1460, baseline ~682): clear on the floor, right of
  // the Scott-Angelo clasp and the fifth glass; the soft 'Angelo.' sits below it. Upright under cams.circle.
  const VOICE = {
    top: { scott: { screen: [1306, 682], size: 140, face: 'angelo', text: 'Scott.', rot: 'circle' }, angelo: { screen: [1298, 742], size: 36, face: 'scott', text: 'Angelo.', rot: 'circle' } },
    low: { scott: { x: 610, y: 238, size: 118, face: 'angelo', text: 'Scott.' }, angelo: { x: 610, y: 300, size: 32, face: 'scott', text: 'Angelo.' } },
    two: { scott: { x: 1745, y: 330, size: 96, face: 'angelo', text: 'Scott.' }, angelo: { x: 1745, y: 382, size: 28, face: 'scott', text: 'Angelo.' } },
    wall: { scott: { x: 970, y: 452, size: 112, face: 'angelo', text: 'Scott.' }, angelo: { x: 970, y: 506, size: 32, face: 'scott', text: 'Angelo.' } },
  };
  function voiceSpot(view, which) {
    const v = VOICE[view] && VOICE[view][which]; if (!v) return null;
    if (v.screen) { const cam = CAM_CIRCLE, z = cam.zoom, r = -cam.rot, dx = (v.screen[0] - W / 2) / z, dy = (v.screen[1] - H / 2) / z;
      return Object.assign({}, v, { x: cam.x + dx * Math.cos(r) - dy * Math.sin(r), y: cam.y + dx * Math.sin(r) + dy * Math.cos(r), rot: -cam.rot }); }
    if (v.clock != null) { const p = tP(v.clock, v.r); const rot = v.rot === 'circle' ? (CIRC.place.scott - 180) * D2R : v.rot != null ? v.rot : (v.clock - 180) * D2R; return Object.assign({}, v, { x: p[0], y: p[1], rot }); }
    return Object.assign({ rot: 0 }, v);
  }
  // pinhole points inside the glyphs, local to the baseline centre
  function perfDots(text, face, size) {
    return memo('perf:' + text + ':' + face + ':' + size, () => {
      const F = Object.assign({}, O.FACE[face] || O.FACE.angelo, { size });
      const w = Math.ceil(size * text.length * 0.75) + 40, h = Math.ceil(size * 1.5) + 20;
      const cv = O.makeCanvas(w, h), q = cv.getContext('2d'); q.fillStyle = '#fff'; q.font = O.font(F); q.textAlign = 'center'; q.textBaseline = 'alphabetic';
      const bx = w / 2, by = Math.round(size * 1.1) + 10; q.fillText(text, bx, by);
      const img = q.getImageData(0, 0, w, h).data; const pts = []; const step = Math.max(2.6, size * 0.06); const r = O.rng('perf' + text + size);
      for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
        const jx = x + (r() - 0.5) * step * 0.6, jy = y + (r() - 0.5) * step * 0.6, ix = Math.round(jx), iy = Math.round(jy);
        if (ix < 0 || iy < 0 || ix >= w || iy >= h) continue;
        if (img[(iy * w + ix) * 4 + 3] > 150 && r() < 0.8) pts.push([jx - bx, jy - by, step * (0.16 + r() * 0.17)]);
      }
      return pts;
    });
  }
  // pinholes split into three flicker groups (painted mode) or one path (cut mode); plus a scorch ring path
  function perfPaths(view, which) {
    return memo('perfPath:' + view + ':' + which, () => {
      const v = voiceSpot(view, which); const pts = perfDots(v.text, v.face, v.size); const cs = Math.cos(v.rot), sn = Math.sin(v.rot);
      const all = new Path2D(), scorch = new Path2D(), grp = [new Path2D(), new Path2D(), new Path2D()];
      pts.forEach(([x, y, r], i) => { const X = v.x + x * cs - y * sn, Y = v.y + x * sn + y * cs; all.moveTo(X + r, Y); all.arc(X, Y, r, 0, TAU);
        const q = grp[(i * 7 + (i >> 3)) % 3]; q.moveTo(X + r, Y); q.arc(X, Y, r, 0, TAU); const r2 = r * 2.1 + 1; scorch.moveTo(X + r2, Y); scorch.arc(X, Y, r2, 0, TAU); });
      return { all, scorch, grp };
    });
  }
  // persistent damage after Q08. Default: painted ember pinholes with scorch and bloom (cheap, camera-safe, identical at this size);
  // perfCut:true makes them real knockouts through to the lightbox (costs the engine's hole pass, ~20 ms/frame).
  // Whisper by default (perforationLevel 0.6 of the old loudness); only the Q08 cut itself shouts. t = the caller's time base.
  function perforate(c, s, view, t) {
    const pf = s.perforations; if (!pf || !VOICE[view]) return;
    const amt = typeof pf === 'number' ? { scott: pf, angelo: pf } : pf; const g = c.g; t = t || 0;
    const lv = s.perforationLevel == null ? 0.6 : clamp(s.perforationLevel, 0, 1.5);
    ['scott', 'angelo'].forEach(w => {
      const a = clamp(amt[w] || 0, 0, 1) * lv; if (!(a > 0)) return; const v = voiceSpot(view, w); const P = perfPaths(view, w);
      if (s.perfCut) { cutPath(c, P.all, 0.55 * a); cutText(c, v.text, v.x, v.y, v.rot, Object.assign({}, O.FACE[v.face], { size: v.size }), 0.06 * a); return; }
      g.save();
      g.globalAlpha = 0.3 * a; g.fillStyle = C.fireOuter; g.fill(P.scorch);
      g.globalAlpha = 0.06 * a; g.fillStyle = C.emberDeep; g.translate(v.x, v.y); g.rotate(v.rot); g.font = O.font(Object.assign({}, O.FACE[v.face], { size: v.size })); g.textAlign = 'center'; g.fillText(v.text, 0, 0);
      g.restore();
      const cols = [C.emberDeep, C.ember, C.emberHot];
      P.grp.forEach((q, i) => { g.save(); g.globalAlpha = clamp(a * (0.3 + 0.38 * O.vnoise(t * 1.7 + i * 3.1, i, 77)), 0, 1); g.fillStyle = cols[i]; g.fill(q); g.restore(); });
      emit(c, e => { e.globalAlpha = clamp(0.4 * a, 0, 1); e.fillStyle = C.ember; e.fill(P.scorch); });
    });
  }

  // ============================================================================================ TOP ==========
  // World = the table plane seen from straight above, table centre (960,540), 12 o'clock up. Clock degrees run clockwise from 12.
  const TG = { CX: 960, CY: 540, RT: 352, RSEAT: 455, RPILE: 228, RGLASS: 298, SC: 94, SHADE: 108, CW: 42, CH: 60 };
  TG.PXM = TG.RT / 0.66; TG.DCAM = 4.2 * TG.PXM; TG.LAMPZ = 0.85 * TG.PXM;
  function tP(deg, r) { return [TG.CX + r * Math.sin(deg * D2R), TG.CY - r * Math.cos(deg * D2R)]; }
  const kz = z => TG.DCAM / (TG.DCAM - (z || 0));
  const tZ = (x, y, z) => { const k = kz(z); return [TG.CX + (x - TG.CX) * k, TG.CY + (y - TG.CY) * k]; };    // a point at height z, as the overhead camera sees it
  const tShadow = (x, y, z) => { const k = z / (TG.LAMPZ - z); return [x + (x - TG.CX) * k, y + (y - TG.CY) * k]; };   // its shadow, thrown by the pendant
  const faceIn = (x, y) => Math.atan2(TG.CY - y, TG.CX - x);

  // LOCKED seating (FILM.md): Scott 6:00, Kay 8, Marina 10, Christof 12, Deena 2, Angelo 4. The gap at 5:00 is Scott's RIGHT.
  const SEAT6 = { scott: 180, kay: 240, marina: 300, christof: 0, deena: 60, angelo: 120 };
  const SHIFT6 = { scott: 8, kay: 3, marina: 0, christof: 0, deena: -4, angelo: -9 };      // people lean away from the gap; the chairs do not move
  const GAP = 150;
  const ORDER7 = ['gap', 'scott', 'kay', 'marina', 'christof', 'deena', 'angelo'];
  const PLACE7 = {}; ORDER7.forEach((id, k) => { PLACE7[id] = wrap360(GAP + k * 360 / 7); });   // the misregistered seven-ring (51.4 deg)

  // the hand circle (F07): four bodies, the long Scott-Angelo link stretched taut across the empty fifth place at 5:00
  const CIRC = (() => {
    const SCc = 120, RB = 440, APEX = TG.RT - 0.17 * TG.PXM;
    function seatUp(id, clock, twist) {
      const [x, y] = tP(clock, RB); const dir = faceIn(x, y) + (twist || 0); const D = O.fig.CHAR[id]; const cs = Math.cos(dir), sn = Math.sin(dir);
      return { id, clock, x, y, dir, sh: side => [x - side * D.shoulderK * sn * SCc, y + side * D.shoulderK * cs * SCc], reach: 2.4 * D.armK * SCc * 0.985 };
    }
    function taut(A, sa, B, sb, k) {
      const p = A.sh(sa), q = B.sh(sb), ra = A.reach * k, rb = B.reach * k, d = dist(p, q);
      const a = (ra * ra - rb * rb + d * d) / (2 * d), h = Math.sqrt(Math.max(0, ra * ra - a * a));
      const m = [p[0] + (q[0] - p[0]) * a / d, p[1] + (q[1] - p[1]) * a / d], n = [-(q[1] - p[1]) / d, (q[0] - p[0]) / d];
      const c1 = [m[0] + n[0] * h, m[1] + n[1] * h], c2 = [m[0] - n[0] * h, m[1] - n[1] * h];
      return { c: dist(c1, [TG.CX, TG.CY]) > dist(c2, [TG.CX, TG.CY]) ? c1 : c2, ok: d <= ra + rb };
    }
    function clasp(want, A, sA, kA, B, sB, kB) {
      let p = want.slice(); const sa = A.sh(sA), sb = B.sh(sB), ra = A.reach * kA, rb = B.reach * kB;
      for (let i = 0; i < 80; i++) {
        let d = dist(p, sa); if (d > ra) p = [sa[0] + (p[0] - sa[0]) * ra / d, sa[1] + (p[1] - sa[1]) * ra / d];
        d = dist(p, sb); if (d > rb) p = [sb[0] + (p[0] - sb[0]) * rb / d, sb[1] + (p[1] - sb[1]) * rb / d];
      }
      return p;
    }
    let best = null;
    for (let a = 30; a <= 75; a += 0.5) {
      const sc = seatUp('scott', GAP + a, -0.4), an = seatUp('angelo', GAP - a, 0.4); const T = taut(an, -1, sc, 1, 0.97); if (!T.ok) continue;
      const r = dist(T.c, [TG.CX, TG.CY]); if (!best || Math.abs(r - APEX) < Math.abs(best.r - APEX)) best = { a, r, c: T.c, sc, an };
    }
    const span = (360 - 2 * best.a) / 3, s0 = GAP + best.a;
    const seats = { scott: best.sc, marina: seatUp('marina', s0 + span, 0.04), deena: seatUp('deena', s0 + 2 * span, -0.04), angelo: best.an };
    const midP = (a, b) => tP((a + b) / 2, TG.RT - 0.12 * TG.PXM);
    const cSM = clasp(midP(s0, s0 + span), seats.scott, -1, 0.9, seats.marina, 1, 0.9);
    const cMD = clasp(midP(s0 + span, s0 + 2 * span), seats.marina, -1, 0.9, seats.deena, 1, 0.9);
    const cDA = clasp(midP(s0 + 2 * span, s0 + 3 * span), seats.deena, -1, 0.9, seats.angelo, 1, 0.9);
    const cAS = best.c;
    const out = { figScale: SCc, RB, half: best.a, span, clasps: { scottMarina: cSM, marinaDeena: cMD, deenaAngelo: cDA, angeloScott: cAS },
      hands: { scott: [cSM, cAS], marina: [cMD, cSM], deena: [cDA, cMD], angelo: [cAS, cDA] }, seats: {} };
    Object.values(seats).forEach(st => { out.seats[st.id] = { clock: wrap360(st.clock), x: st.x, y: st.y, dir: st.dir }; });
    out.place = { scott: wrap360(s0), marina: wrap360(s0 + span), deena: wrap360(s0 + 2 * span), angelo: wrap360(GAP - best.a), gap: GAP };
    return out;
  })();
  const CAM_CIRCLE = camAt([TG.CX, TG.CY], [800, 520], 0.94, -(CIRC.place.scott - 180) * D2R);   // F07: Scott at the bottom, the gap at ~4 o'clock

  // ---- top-view resolvers ----
  function seatTop(id, layout) {
    if (layout === 'circle' && CIRC.seats[id]) { const s = CIRC.seats[id]; return { clock: s.clock, x: s.x, y: s.y, dir: s.dir, chairClock: s.clock, chairR: CIRC.RB }; }
    const ck = SEAT6[id]; if (ck == null) return null; const cl = ck + (SHIFT6[id] || 0); const [x, y] = tP(cl, TG.RSEAT);
    return { clock: wrap360(cl), x, y, dir: faceIn(x, y), chairClock: ck, chairR: TG.RSEAT };
  }
  // a pile spot: name ('scott'.. 'gap'), clock number, {clock, r}, {x, y} or [x,y]. ring: 'seven' (the 51.4 deg ring) | 'seats' (squarely in front of each chair)
  // spec: a name ('scott'..'angelo','gap'), clock number, [x,y], {x,y,rot}, {clock, r, rot}, or an entry {at: spec, ring, r, ...} (nests)
  function pileTop(spec, s) {
    let clock = null, r = null, rot = null, ring = (s && s.ring) || 'seven'; s = s || {};
    while (spec && typeof spec === 'object' && !Array.isArray(spec) && spec.x == null) {
      if (spec.ring) ring = spec.ring; if (spec.r != null) r = spec.r; if (spec.clock != null) clock = spec.clock; if (spec.rot != null) rot = spec.rot;
      if (spec.at == null) break; spec = spec.at;
    }
    if (Array.isArray(spec)) return { x: spec[0], y: spec[1], a: rot != null ? rot : faceIn(spec[0], spec[1]) + Math.PI / 2 };
    if (spec && typeof spec === 'object' && spec.x != null) return { x: spec.x, y: spec.y, a: spec.rot != null ? spec.rot : faceIn(spec.x, spec.y) + Math.PI / 2 };
    let rr = TG.RPILE;
    if (clock == null) {
      if (typeof spec === 'number') clock = spec;
      else if (s.layout === 'circle') { clock = spec === 'gap' ? GAP + 13 : CIRC.place[spec]; rr = TG.RPILE * 0.84; if (clock == null) clock = SEAT6[spec]; }
      else if (ring === 'seven') clock = PLACE7[spec];
      else clock = spec === 'gap' ? GAP : SEAT6[spec];
      if (clock == null) clock = 0;
    }
    const [x, y] = tP(clock, r != null ? r : rr); return { x, y, a: rot != null ? rot : clock * D2R, clock };
  }
  // who is at the table: the six (or the circle's four), minus s.empty and chairs marked empty / removed
  function presentIds(s) {
    if (s.layout === 'circle') return ['scott', 'marina', 'deena', 'angelo'];
    const ch = s.chairs || {}, em = s.empty || [];
    return ['scott', 'kay', 'marina', 'christof', 'deena', 'angelo'].filter(id => !em.includes(id) && ch[id] !== false && !(ch[id] && ch[id].empty));
  }
  // piles: 7 = the misregistered seven-ring (F05). n < 7 = one pile squarely in front of each person present (s.empty / chairs
  // empty are skipped), plus the gap if n is one more than the people ('four piles, then a FIFTH'); fewer = the first n from Scott.
  function pileList(s) {
    const P = s.piles; if (!P) return [];
    if (typeof P === 'number') {
      if (P === 7) return ORDER7.map(n => ({ at: n }));
      const ids = presentIds(s).slice(0, P); if (ids.length < P) ids.push('gap');
      return ids.map(n => ({ at: n, ring: 'seats' }));
    }
    return P.map(e => (e && typeof e === 'object' && !Array.isArray(e) && e.at !== undefined) ? e : { at: e });
  }
  const pileName = e => { let a = e.at; if (a && typeof a === 'object' && !Array.isArray(a) && a.at != null) a = a.at; return typeof a === 'string' ? a : null; };
  function glassTopSpot(id, s) {
    if (id === 'fifth') return tP(GAP - 5, TG.RGLASS - 44);
    if (s.layout === 'circle' && CIRC.seats[id]) return tP(CIRC.seats[id].clock - 20, TG.RGLASS - 6);
    if (SEAT6[id] == null) return null; return tP(SEAT6[id] - 22, TG.RGLASS);
  }
  const DEALER_TOP = (() => { const st = seatTop('angelo', 'six'); const d = 1.52 * TG.SC; const deck = [st.x + Math.cos(st.dir) * d, st.y + Math.sin(st.dir) * d];
    const lat = [-Math.sin(st.dir), Math.cos(st.dir)]; return { deck, dir: st.dir, hands: [[deck[0] - lat[0] * 0.4 * TG.SC, deck[1] - lat[1] * 0.4 * TG.SC], [deck[0] + lat[0] * 0.4 * TG.SC, deck[1] + lat[1] * 0.4 * TG.SC]] }; })();

  // ---- top-view static geometry (memoised Path2D) ----
  const tableDisc = () => memo('top:table', () => S().circle(TG.CX, TG.CY, TG.RT).path(1.4, 9));
  const ringPath = r => memo('top:ring:' + r, () => S().circle(TG.CX, TG.CY, r).path(1.8, 13 + r % 7));
  const floorPaths = () => memo('top:floor', () => [S().circle(TG.CX, TG.CY, 800).path(3.0, 21), S().circle(TG.CX, TG.CY, 610).path(3.0, 22)]);
  const boards = () => memo('top:boards', () => {
    const p = new Path2D(), r = O.rng('boards'), bw = 66;
    for (let i = -6; i < 24; i++) { const y0 = -340 + i * bw; p.moveTo(-500, y0); p.lineTo(2420, y0); for (let j = 0; j < 9; j++) { const x = -500 + r() * 2920; p.moveTo(x, y0); p.lineTo(x, y0 + bw); } }
    return p;
  });
  const grain = () => memo('top:grain', () => { const p = new Path2D(); for (let i = -9; i <= 9; i++) { const o = i * 40; p.moveTo(TG.CX + o - 150, TG.CY - 420); p.quadraticCurveTo(TG.CX + o + 8 * Math.sin(i), TG.CY, TG.CX + o + 150, TG.CY + 420); } return p; });
  // chair in local px: origin at the seat, -y = away from the table. seat + curved back rail + two posts.
  const chairParts = () => memo('top:chair', () => {
    const k = 94, rail = S(), n = 22, pts = [];
    for (let i = 0; i <= n; i++) { const u = -1.0 + 2.0 * i / n; pts.push([u * k, -(0.78 - 0.2 * Math.cos(u * 1.55)) * k]); }
    for (let i = n; i >= 0; i--) { const u = -1.0 + 2.0 * i / n; pts.push([u * 1.02 * k, -(1.02 - 0.2 * Math.cos(u * 1.55)) * k]); }
    rail.poly(pts); rail.circle(-1.0 * k, -0.8 * k, 0.13 * k); rail.circle(1.0 * k, -0.8 * k, 0.13 * k);
    const seat = rrShape(-0.9 * k, -0.74 * k, 1.8 * k, 1.7 * k, 0.22 * k);
    return { rail: rail.path(0.8, 30), seat: seat.path(1.0, 71), all: S().add(rail).add(seat).path(1.0, 72) };
  });
  function chairList(s) {
    const L = [], ch = s.chairs || {};
    const ids = s.layout === 'circle' ? ['scott', 'marina', 'deena', 'angelo'] : ['scott', 'kay', 'marina', 'christof', 'deena', 'angelo'];
    ids.concat(Object.keys(ch).filter(k => !ids.includes(k) && SEAT6[k] != null && ch[k])).forEach(id => {
      const o = ch[id]; if (o === false) return; const st = seatTop(id, ids.includes(id) ? s.layout : 'six');
      const oo = o || {}; const clock = st.chairClock + (oo.dc || 0), r = st.chairR + (oo.out || 0); const [x, y] = tP(clock, r);
      L.push({ id, x, y, a: clock * D2R + (oo.rot || 0), alpha: oo.alpha == null ? 1 : oo.alpha, empty: oo.empty != null ? !!oo.empty : (s.empty || []).includes(id) });
    });
    const xc = s.extraChair; if (xc) { const o = typeof xc === 'object' ? xc : { u: xc }; const u = o.u == null ? 1 : o.u; const clock = GAP + (o.dc || 0); const [x, y] = tP(clock, TG.RSEAT + (o.out == null ? 46 : o.out)); L.push({ id: 'extra', x, y, a: clock * D2R + (o.rot == null ? -0.24 : o.rot), alpha: u, empty: true }); }
    return L;
  }
  // a chair after state.chairs[id] {out, dc, rot}: {id, x, y, a (rotation), clock, r, empty}
  function chairAt(id, s) {
    s = s || {}; const lay = s.layout === 'circle' && CIRC.seats[id] ? 'circle' : 'six'; const st = seatTop(id, lay); if (!st) return null;
    const o = (s.chairs || {})[id] || {}; const clock = st.chairClock + (o.dc || 0), r = st.chairR + (o.out || 0); const [x, y] = tP(clock, r);
    return { id, x, y, a: clock * D2R + (o.rot || 0), clock: wrap360(clock), r, empty: o.empty != null ? !!o.empty : (s.empty || []).includes(id) };
  }
  // the person in that chair: the seat anchor moved with the chair (out/dc) and turned with it (rot) - 'Angelo shoves his chair back'
  function seatAt(id, s) {
    s = s || {}; const lay = s.layout === 'circle' && CIRC.seats[id] ? 'circle' : 'six'; const st = seatTop(id, lay); if (!st) return null;
    const o = (s.chairs || {})[id] || {}; const c0 = tP(st.chairClock, st.chairR), c1 = tP(st.chairClock + (o.dc || 0), st.chairR + (o.out || 0));
    const x = st.x + c1[0] - c0[0], y = st.y + c1[1] - c0[1]; const dir = faceIn(x, y) + (o.rot || 0);
    const lat = [-Math.sin(dir), Math.cos(dir)], fw = [Math.cos(dir), Math.sin(dir)], e = 1.55 * TG.SC;
    return { id, clock: wrap360(Math.atan2(x - TG.CX, -(y - TG.CY)) / D2R), x, y, dir, chair: c1,
      hands: [[x + fw[0] * e - lat[0] * 0.55 * TG.SC, y + fw[1] * e - lat[1] * 0.55 * TG.SC], [x + fw[0] * e + lat[0] * 0.55 * TG.SC, y + fw[1] * e + lat[1] * 0.55 * TG.SC]] };
  }
  function drawChairTop(g, ch, p) {
    const parts = chairParts(); const lx = TG.CX - ch.x, ly = TG.CY - ch.y, l = Math.hypot(lx, ly) || 1; const ca = Math.cos(-ch.a), sa = Math.sin(-ch.a);
    const ux = (lx * ca - ly * sa) / l, uy = (lx * sa + ly * ca) / l;
    g.save(); g.globalAlpha = ch.alpha; g.translate(ch.x, ch.y); g.rotate(ch.a);
    if (ch.empty) silFill(g, parts.seat, '#120C09', ux, uy, 2.2, p.mid, 0.55);
    silFill(g, parts.rail, '#0B0807', ux, uy, 2.4, p.mid);
    g.restore();
  }

  // ---- cards ----
  function cardTop(g, x, y, a, top, k) {
    const CW = TG.CW * (k || 1), CH = TG.CH * (k || 1);
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = C.cardPaper; g.beginPath(); g.roundRect(-CW / 2, -CH / 2, CW, CH, 3.5); g.fill();
    g.fillStyle = C.cardBlue; g.beginPath(); g.roundRect(-CW / 2 + 3.2, -CH / 2 + 3.2, CW - 6.4, CH - 6.4, 2); g.fill();
    if (top) { g.strokeStyle = rgba(C.cardPaper, 0.5); g.lineWidth = 1; g.strokeRect(-CW / 2 + 7, -CH / 2 + 7, CW - 14, CH - 14); }
    g.restore();
  }
  // press: null = an ordinary pile; 0..1 = the gap card pressed flat by NO hand (its lift and drop shadow go flat; doctrine L2)
  function pileTopDraw(g, x, y, a, n, seed, mess, press) {
    const r = O.rng(seed); const rx = x - TG.CX, ry = y - TG.CY, rl = Math.hypot(rx, ry) || 1;
    const lift = press == null ? 0.35 : 1 - sm(clamp(press, 0, 1));
    const so = 2 + 11 * lift, sa = press == null ? 0.6 : 0.62 * lift + 0.1;
    g.save(); g.globalAlpha = sa; g.fillStyle = C.ink; g.translate(x + rx / rl * so + 2 * lift, y + ry / rl * so + 3 * lift); g.rotate(a); g.beginPath(); g.roundRect(-TG.CW / 2 - 1, -TG.CH / 2 - 1, TG.CW + 2, TG.CH + 2, 4); g.fill(); g.restore();
    const sp = 1 + 2.5 * (mess || 0), k = press == null ? 1 : 1 + 0.035 * lift;
    for (let i = 0; i < n; i++) { const top = i === n - 1; const j = top ? (r() - 0.5) * 0.08 * sp : (r() - 0.5) * 0.55 * sp, dx = top ? 0 : (r() - 0.5) * 9 * sp, dy = top ? 0 : (r() - 0.5) * 9 * sp; cardTop(g, x + dx, y + dy, a + j, top, top ? k : 1); }
  }
  // the deck: squared, or fanned (fan 0..1) about the bottom edge
  // the riffle (Angelo's poor-magician dovetail), seen from above. o.split 0..1: the deck is cut and the halves turn to lie along
  // the dealer's left-right, side by side; o.riffle 0..1: their inner ends zip together (alternating card ends in the overlap),
  // then (last 20%) they square up into one deck again. riffleGeom gives the halves and where the hands hold them.
  function riffleGeom(x, y, a, o) {
    o = o || {}; const n = Math.max(4, o.n || 14), sp = sm(clamp(o.split == null ? 1 : o.split, 0, 1)), u = clamp(o.riffle || 0, 0, 1);
    const sq = sm(clamp((u - 0.8) / 0.2, 0, 1)), it = clamp(u / 0.8, 0, 1), reach = sp * (1 - sq);
    const turn = reach * Math.PI / 2, ov = TG.CH * 0.42 * sm(it), bow = 0.3 * reach * (1 - 0.4 * it);
    const ca = Math.cos(a), sa = Math.sin(a), at = (dx, dy) => [x + dx * ca - dy * sa, y + dx * sa + dy * ca];
    const halves = [-1, 1].map(sd => { const cx = sd * (TG.CH / 2 - ov / 2) * reach; const [hx, hy] = at(cx, -sd * 4 * reach); return { side: sd, x: hx, y: hy, rot: a + turn + sd * bow }; });
    const hands = halves.map(h => { const d = TG.CH * 0.5 * reach + TG.CW * 0.35; const ux = Math.cos(h.rot - turn), uy = Math.sin(h.rot - turn); return [h.x + h.side * ux * d, h.y + h.side * uy * d]; });
    return { n, moved: Math.floor(it * n * (1 - sq) + 1e-6), halves, hands, sq };
  }
  function riffleTop(g, x, y, a, o) {
    const R = riffleGeom(x, y, a, o), n = R.n; const st = norm2(x - TG.CX, y - TG.CY);   // stacking steps away from the lamp (higher = nearer the lens)
    const nL = Math.ceil(n / 2) - Math.ceil(R.moved / 2), nR = Math.floor(n / 2) - Math.floor(R.moved / 2);
    g.save(); g.globalAlpha = 0.5; g.fillStyle = C.ink; R.halves.forEach(h => { g.save(); g.translate(h.x + 5, h.y + 6); g.rotate(h.rot); g.beginPath(); g.roundRect(-TG.CW / 2, -TG.CH / 2, TG.CW, TG.CH, 4); g.fill(); g.restore(); }); g.restore();
    const stack = (h, cnt) => { for (let i = 0; i < cnt; i++) cardTop(g, h.x + st[0] * i * 0.8, h.y + st[1] * i * 0.8, h.rot, i === cnt - 1); };
    stack(R.halves[0], Math.max(1, nL + Math.ceil(R.moved / 2))); stack(R.halves[1], Math.max(1, nR + Math.floor(R.moved / 2)));
    if (R.moved < 2) return;
    // the zipper: where the inner ends overlap, a comb of alternating card ends (paper / ink), one pair per riffled card
    const rect = h => { const p = new Path2D(); const m = new DOMMatrix().translate(h.x, h.y).rotate(h.rot / D2R); const r0 = new Path2D(); r0.rect(-TG.CW / 2 + 1, -TG.CH / 2 + 1, TG.CW - 2, TG.CH - 2); p.addPath(r0, m); return p; };
    const A = R.halves[0], B = R.halves[1]; const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2; const ax = Math.cos(A.rot + Math.PI / 2), ay = Math.sin(A.rot + Math.PI / 2);   // along the long axis
    g.save(); g.clip(rect(A)); g.clip(rect(B)); g.lineWidth = 1.3;
    for (let i = -R.moved; i <= R.moved; i++) { const o2 = i * 2.3; g.strokeStyle = i % 2 ? rgba(C.ink, 0.6) : C.cardPaper; const px = mx + ax * o2, py = my + ay * o2;
      g.beginPath(); g.moveTo(px - ay * 60, py + ax * 60); g.lineTo(px + ay * 60, py - ax * 60); g.stroke(); }
    g.restore();
  }
  function deckTop(g, x, y, a, o) {
    o = o || {}; if (o.split != null || o.riffle != null) return riffleTop(g, x, y, a, o);
    const n = o.n || 9, fan = o.fan || 0;
    for (let i = 0; i < n; i++) {
      const t = (i - (n - 1) / 2) / ((n - 1) / 2 || 1); const ang = a + (fan ? t * fan * 0.9 : t * 0.04);
      const px = fan ? x - Math.sin(ang - a) * 0 : x + Math.sin(t) * 3, py = fan ? y : y - i * 0.8;
      if (fan) { g.save(); g.translate(x, y); g.rotate(ang); cardTop(g, 0, -TG.CH * 0.32, 0, i === n - 1); g.restore(); }
      else cardTop(g, px, py, ang, i === n - 1);
    }
  }

  // ---- glasses from above (F07): base on the table, bowl rim at 0.2 m, wine disc, rim crescent toward the lamp ----
  function glassTop(g, c, b, o, p) {
    o = o || {}; const hz = 0.2 * TG.PXM, rb = 15, rr = 24; const fill = clamp(o.fill == null ? 0.4 : o.fill, 0, 1.2);
    if (o.coaster) {
      g.save(); g.translate(b[0], b[1]); g.rotate(o.coasterRot == null ? 0.38 : o.coasterRot);
      const cs = memo('top:coaster', () => [S().rect(-26, -26, 52, 52).translate(5, 3).path(0.6, 2), S().rect(-26, -26, 52, 52).path(0.6, 3)]);
      g.fillStyle = rgba(C.ink, 0.5); g.fill(cs[0]); g.fillStyle = '#2B180B'; g.fill(cs[1]); g.strokeStyle = rgba(p.mid, 0.9); g.lineWidth = 1.5; g.strokeRect(-20, -20, 40, 40);
      g.restore();
    }
    const top = tShadow(b[0], b[1], hz), ang = Math.atan2(top[1] - b[1], top[0] - b[0]);
    g.save(); g.fillStyle = rgba(C.ink, 0.5);
    g.fill(S().capsule(b[0], b[1], 3.5, top[0], top[1], rr * 0.95).path(0.5, 3)); g.beginPath(); g.arc(b[0], b[1], rb, 0, TAU); g.fill();
    if (fill > 0.02) { g.fillStyle = rgba(mix(C.wine, p.hot, 0.35), 0.55); g.beginPath(); g.ellipse(top[0] - Math.cos(ang) * 9, top[1] - Math.sin(ang) * 9, 10, 6, ang, 0, TAU); g.fill(); }
    g.fillStyle = rgba(p.hot, 0.85); g.beginPath(); g.ellipse(top[0] - Math.cos(ang) * 5, top[1] - Math.sin(ang) * 5, 5, 3, ang, 0, TAU); g.fill();
    g.restore();
    const base = tZ(b[0], b[1], 0), rim = tZ(b[0], b[1], hz), rk = rr * kz(hz);
    const la = Math.atan2(TG.CY - rim[1], TG.CX - rim[0]);
    g.strokeStyle = rgba(C.ink, 0.55); g.lineWidth = 1.6; g.beginPath(); g.arc(base[0], base[1], rb, 0, TAU); g.stroke();
    g.fillStyle = rgba(C.cardPaper, 0.13); g.beginPath(); g.arc(rim[0], rim[1], rk, 0, TAU); g.fill();
    if (fill > 0.02) {
      const f = Math.min(fill, 1), wz = (0.045 + 0.13 * f) * TG.PXM, wine = tZ(b[0], b[1], wz), rw = rk * (0.32 + 0.6 * Math.sqrt(f));
      g.fillStyle = C.wine; g.beginPath(); g.arc(wine[0], wine[1], Math.min(rw, rk - 1.5), 0, TAU); g.fill();
      g.fillStyle = C.cardPaper; g.beginPath(); g.ellipse(wine[0] + Math.cos(la) * rw * 0.5, wine[1] + Math.sin(la) * rw * 0.5, 4, 1.8, la + Math.PI / 2, 0, TAU); g.fill();
      if (fill > 1) { g.fillStyle = C.wine; g.beginPath(); g.ellipse(base[0], base[1], rb + 22 * (fill - 1) * 5, rb * 0.9 + 18 * (fill - 1) * 5, 0.3, 0, TAU); g.fill(); }
    }
    g.strokeStyle = rgba(C.cardPaper, 0.35); g.lineWidth = 1.4; g.beginPath(); g.arc(rim[0], rim[1], rk, 0, TAU); g.stroke();
    g.strokeStyle = rgba(C.ink, 0.6); g.lineWidth = 2; g.beginPath(); g.arc(rim[0], rim[1], rk + 1.5, la + 1.6, la + TAU - 1.6); g.stroke();
    g.strokeStyle = C.cardPaper; g.lineWidth = 2.4; g.beginPath(); g.arc(rim[0], rim[1], rk, la - 1.0, la + 1.0); g.stroke();
    if (o.lip) { const a0 = typeof o.lip === 'number' ? o.lip : la + Math.PI; g.strokeStyle = LIP; g.lineCap = 'round'; g.lineWidth = 4; g.beginPath(); g.arc(rim[0], rim[1], rk - 0.5, a0 - 0.32, a0 + 0.32); g.stroke(); g.lineCap = 'butt'; }
    emit(c, e => { e.fillStyle = C.cardPaper; e.beginPath(); e.arc(rim[0] + Math.cos(la) * rk, rim[1] + Math.sin(la) * rk, 4, 0, TAU); e.fill(); });
  }
  // the bottle from above: body to the shoulder, neck, foil; a long shadow
  function bottleTop(g, b, u, p, s) {
    const z0 = (1 - outCubic(clamp(u, 0, 1))) * 1.2 * TG.PXM; const P = z => tZ(b[0], b[1], z0 + z);
    const sh = tShadow(b[0], b[1], 0.3 * TG.PXM), base = P(0), shoulder = P(0.2 * TG.PXM), top = P(0.31 * TG.PXM);
    if (u >= 1) { g.save(); g.fillStyle = rgba(C.ink, 0.62); g.fill(S().capsule(b[0], b[1], 20, sh[0], sh[1], 8).path(0.6, 4)); g.restore(); }
    const k0 = kz(z0 + 0.2 * TG.PXM), k1 = kz(z0 + 0.31 * TG.PXM);
    const body = S().circle(base[0], base[1], 20 * kz(z0)).capsule(base[0], base[1], 20 * kz(z0), shoulder[0], shoulder[1], 20.5 * k0).capsule(shoulder[0], shoulder[1], 19 * k0, top[0], top[1], 7.5 * k1).path(0.5, 6);
    const la = Math.atan2(TG.CY - top[1], TG.CX - top[0]); silFill(g, body, C.ink, Math.cos(la), Math.sin(la), 2.6, p.hot);
    g.fillStyle = mix(C.wine, C.ink, 0.35); g.beginPath(); g.arc(top[0], top[1], 7.5 * k1, 0, TAU); g.fill();
    // the kitchen's hood light glints on the shoulder only when that doorway is lit (it lies at lower left in this view)
    const kl = clamp((s && s.kitchenLight) || 0, 0, 1);
    if (kl > 0) { const ka = Math.atan2(1, -0.75); g.save(); g.clip(body); g.strokeStyle = rgba(C.hood, 0.6 * kl); g.lineWidth = 2; g.beginPath(); g.arc(shoulder[0], shoulder[1], 14 * k0, ka - 0.35, ka + 0.35); g.stroke(); g.restore(); }
  }
  const BOTTLE_TOP = () => tP(168, 318);   // behind Scott: the gap side of his right shoulder, clear of his glass and forearms
  function biscuitTop(g, x, y) { const sh = memo('top:biscuit', () => S().circle(0, 0, 17).path(0.9, 8)); g.save(); g.translate(x, y); g.fillStyle = rgba(C.ink, 0.5); g.translate(4, 3); g.fill(sh); g.translate(-4, -3); g.fillStyle = C.cardPaper; g.fill(sh); g.fillStyle = C.ink; g.beginPath(); g.arc(13, -9, 7, 0, TAU); g.fill(); g.fillStyle = rgba(C.tungstenMid, 0.5); [[-5, -3], [4, 5], [-2, 8]].forEach(([a, b2]) => { g.beginPath(); g.arc(a, b2, 1.6, 0, TAU); g.fill(); }); g.restore(); }

  // ---- a hand out of the dark at the gap: no rim, no shadow, never joins a body ----
  function extraHandTop(g, s, u) {
    u = clamp(u, 0, 1); const e = outCubic(Math.min(1, u / 0.75)), down = sm(clamp((u - 0.7) / 0.3, 0, 1));
    const spot = pileTop('gap', s); const cl = (spot.clock != null ? spot.clock : GAP) + 4;
    const tw = 0.1; const inA = (cl + 180) * D2R; const fd = [Math.sin(inA + tw), -Math.cos(inA + tw)];     // fingers point inward
    const L = 0.8 * TG.SC; const rWrist = lerp(640, 0, e); const tip = [spot.x, spot.y];
    const W0 = [tip[0] - fd[0] * L * 0.95 - fd[0] * rWrist, tip[1] - fd[1] * L * 0.95 - fd[1] * rWrist];
    const z = (1 - down) * 0.11 * TG.PXM; const k = kz(z); const Wp = tZ(W0[0], W0[1], z);
    const a = Math.atan2(fd[1], fd[0]); const side = -1;
    const hs = O.fig.hand('open', { spread: 0.14 }).transform([Math.cos(a) * L * k, Math.sin(a) * L * k, -Math.sin(a) * L * k * side, Math.cos(a) * L * k * side, Wp[0], Wp[1]]);
    const far = [Wp[0] - fd[0] * 900, Wp[1] - fd[1] * 900];
    const arm = S().capsule(Wp[0], Wp[1], 0.135 * TG.SC * k, far[0], far[1], 0.26 * TG.SC);
    g.fillStyle = C.ink; g.fill(S().add(hs).add(arm).path(0.7, 77));
  }

  // ---- card in flight (top) ----
  function resolveTop(spec, s) {
    if (spec === 'dealer' || spec === 'deck' || spec == null) return { x: DEALER_TOP.deck[0], y: DEALER_TOP.deck[1], a: DEALER_TOP.dir + Math.PI / 2 };
    return pileTop(spec, s);
  }
  function flyTop(g, s, f) {
    const A = resolveTop(f.from, s), B = resolveTop(f.to, s); const u = clamp(f.u, 0, 1), e = outCubic(u);
    const x = lerp(A.x, B.x, e), y = lerp(A.y, B.y, e), z = 4 * u * (1 - u) * (f.h == null ? 0.14 : f.h) * TG.PXM;
    const spin = (f.spin == null ? 1.25 : f.spin) * TAU * (1 - e); const a = B.a + spin;
    const sh = tShadow(x, y, z); g.save(); g.globalAlpha = 0.55; g.fillStyle = C.ink; g.translate(sh[0] + 4, sh[1] + 4); g.rotate(a); g.beginPath(); g.roundRect(-TG.CW / 2, -TG.CH / 2, TG.CW, TG.CH, 4); g.fill(); g.restore();
    const p = tZ(x, y, z); cardTop(g, p[0], p[1], a, true, kz(z));
  }

  // ---- kitchen light on the floor (lower left, beyond Kay's chair) ----
  function kitchenFloorTop(g, s, chairs) {
    const k = clamp(s.kitchenLight || 0, 0, 1); if (k <= 0) return;
    const w1 = memo('top:hoodwedge', () => [S().poly([[-700, 1500], [260, 1500], [700, 900], [560, 820]]).path(3, 41), S().poly([[-420, 1500], [120, 1500], [560, 930], [500, 890]]).path(3, 42)]);
    g.save(); const nt = new Path2D(); nt.rect(-2000, -2000, 6000, 6000); nt.addPath(tableDisc()); g.clip(nt, 'evenodd');
    g.globalAlpha = 0.85 * k; g.fillStyle = C.hoodLow; g.fill(w1[0]); g.globalAlpha = 0.7 * k; g.fillStyle = mix(C.hoodLow, C.hoodMid, 0.6); g.fill(w1[1]);
    g.globalAlpha = 0.9 * k; g.fillStyle = C.ink; g.clip(w1[0]); const parts = chairParts();
    chairs.forEach(ch => { g.save(); g.translate(ch.x + 70, ch.y - 90); g.rotate(ch.a); g.fill(parts.all); g.restore(); });
    g.restore();
  }

  // the static top layer: floor, boards, the hood wedge, chair shadows and chairs, the table's rings, grain and lip
  function staticTop(g, s, p) {
    const K = p.shrink;
    g.save(); scaleAbout(g, TG.CX, TG.CY, 0.94 + 0.06 * K); const fp = floorPaths(); bands(g, fp, [p.floor0, p.floor1], false); g.restore();
    g.save(); g.strokeStyle = C.ink; g.globalAlpha = 0.3; g.lineWidth = 3; g.stroke(boards()); g.restore();
    const chairs = chairList(s);
    kitchenFloorTop(g, s, chairs);
    const parts = chairParts();
    g.save(); g.fillStyle = C.ink; chairs.forEach(ch => { g.save(); g.globalAlpha = 0.72 * ch.alpha; scaleAbout(g, TG.CX, TG.CY, 1.03); g.translate(ch.x, ch.y); g.rotate(ch.a); g.fill(ch.empty ? parts.all : parts.rail); g.restore(); }); g.restore();
    chairs.forEach(ch => drawChairTop(g, ch, p));
    const disc = tableDisc();
    g.save(); g.clip(disc);
    g.fillStyle = p.low; g.fill(disc);
    g.save(); scaleAbout(g, TG.CX, TG.CY, K); bands(g, [ringPath(TG.RT + 40), ringPath(274), ringPath(180)], [p.low, p.mid, p.hot]); g.restore();
    g.globalAlpha = 0.07; g.strokeStyle = C.ink; g.lineWidth = 2; g.stroke(grain()); g.globalAlpha = 1;
    g.restore();
    g.save(); g.strokeStyle = C.ink; g.lineWidth = 6; g.stroke(disc); g.restore();
  }
  const r2 = v => Math.round((+v || 0) * 100) / 100;
  function topSig(s, p) {
    const ch = s.chairs || {}; const cs = Object.keys(ch).sort().map(k => { const o = ch[k]; if (o === false) return k + ':x'; if (!o) return k; return k + ':' + [r2(o.out), r2(o.dc), r2(o.rot), o.empty ? 1 : 0, r2(o.alpha == null ? 1 : o.alpha)].join('/'); }).join(';');
    const xc = s.extraChair; const xs = !xc ? '' : typeof xc === 'object' ? [r2(xc.u == null ? 1 : xc.u), r2(xc.out), r2(xc.rot), r2(xc.dc)].join('/') : r2(xc);
    return [s.layout || 'six', p.k, r2(s.kitchenLight), cs, (s.empty || []).slice().sort().join('.'), xs].join('|');
  }
  const FRESH_TOP = i => tP(136 + i * 22, 140);   // the five fresh glasses: an arc between the shade and the pile ring, on Scott's side; index 2 = Deena's
  function backTop(c, t, s) {
    const g = c.g, p = pal(s.lampTired);
    cacheLayer(c, 'top', topSig(s, p), q => staticTop(q, s, p));
    perforate(c, s, 'top', t);
    // piles
    pileList(s).forEach((e, i) => { const sp = pileTop(e, s); const nm = pileName(e); pileTopDraw(g, sp.x, sp.y, sp.a, e.n || s.pileCards || 1, 'pile' + (nm || i), e.mess != null ? e.mess : s.mess, nm === 'gap' && s.gapPress != null ? s.gapPress : null); });
    if (s.biscuit) { const b = tP(16, TG.RGLASS - 30); biscuitTop(g, b[0], b[1]); }
    // glasses
    const G = s.glasses || (s.layout === 'circle' ? { scott: 0.3, marina: 0.25, deena: 0.35, angelo: 0.2 } : { scott: 0.4, kay: { fill: 0.45, lip: true }, marina: 0.3, christof: 0.25, deena: 0.38, angelo: 0.32 });
    const sw = clamp(s.glassSwap || 0, 0, 1);
    Object.keys(G).forEach(id => {
      let o = G[id]; if (o == null || o === false) return; if (typeof o === 'number') o = { fill: o }; if (o.hide) return;
      let b = o.at ? (Array.isArray(o.at) ? o.at : glassTopSpot(o.at, s)) : glassTopSpot(id, s); if (!b) return;
      if (sw > 0 && (id === 'deena' || id === 'angelo') && s.layout !== 'circle') {
        const A = glassTopSpot(id, s), B = glassTopSpot(id === 'deena' ? 'angelo' : 'deena', s), e = sm(sw); const bulge = (id === 'deena' ? -34 : 26) * Math.sin(Math.PI * e);
        const m = [lerp(A[0], B[0], e), lerp(A[1], B[1], e)], rd = norm2(m[0] - TG.CX, m[1] - TG.CY); b = [m[0] + rd[0] * bulge, m[1] + rd[1] * bulge];
      }
      const lipA = o.lip ? (() => { const st = seatTop(id, 'six'); return st ? Math.atan2(st.y - TG.CY, st.x - TG.CX) : true; })() : false;
      glassTop(g, c, b, Object.assign({}, o, { lip: lipA }), p);
    });
    const fifth = s.fifthGlass; if (fifth) { const u = typeof fifth === 'number' ? fifth : 1; g.save(); g.globalAlpha = clamp(u, 0, 1); glassTop(g, c, glassTopSpot('fifth', s), { fill: 0.3, coaster: true }, p); g.restore(); }
    // the five fresh glasses (they arrive across a cut) and the bottle behind Scott
    const nf = Math.round(s.fresh || 0); for (let i = 0; i < nf; i++) { const ff = Array.isArray(s.freshFill) ? s.freshFill[i] : (s.freshFill || 0); glassTop(g, c, s.freshAt && s.freshAt[i] ? s.freshAt[i] : FRESH_TOP(i), { fill: ff }, p); }
    if (s.bottle) { const bo = typeof s.bottle === 'object' ? s.bottle : { u: s.bottle }; bottleTop(g, bo.at || BOTTLE_TOP(), bo.u == null ? 1 : bo.u, p, s); }
    if (s.deck) { const d = s.deck === true ? {} : s.deck; const at = d.at || DEALER_TOP.deck; deckTop(g, at[0], at[1], d.rot != null ? d.rot : DEALER_TOP.dir + Math.PI / 2, d); }
    (s.flying || []).forEach(f => flyTop(g, s, f));
    if (s.extraHand) extraHandTop(g, s, s.extraHand);
  }
  // the pendant shade: a black disc over the hottest ring, with a touch of parallax (the nearest thing to the camera).
  // m = the camera matrix it was placed under (needed when it is re-stamped in c.before, after c.reset()).
  function shadePos(m) { const fc = m.inverse().transformPoint({ x: W / 2, y: H / 2 }); const par = kz(TG.LAMPZ) - 1; return [TG.CX + (TG.CX - fc.x) * par * 0.6, TG.CY + (TG.CY - fc.y) * par * 0.6]; }
  function drawShade(q, m) {
    const [SX, SY] = shadePos(m); const shade = memo('top:shade', () => [S().circle(5, 7, TG.SHADE + 6).path(1, 3), S().circle(0, 0, TG.SHADE).path(0.8, 4)]);
    q.save(); q.setTransform(m); q.translate(SX, SY); q.globalAlpha = 0.4; q.fillStyle = C.ink; q.fill(shade[0]); q.globalAlpha = 1; q.fill(shade[1]);
    q.strokeStyle = '#1A1310'; q.lineWidth = 2; q.beginPath(); q.arc(0, 0, TG.SHADE * 0.68, 0, TAU); q.stroke(); q.fillStyle = '#1A1310'; q.beginPath(); q.arc(0, 0, 12, 0, TAU); q.fill(); q.restore();
  }
  // re-stamp after the bloom so halation never fogs the black disc; s.restamp:false skips it; s.overShade(cx) draws over it
  // (cx carries the camera transform, so draw in world coordinates: e.g. Angelo's dealt words lying on the table plane)
  function restamp(c, s, fn, over) {
    const m = c.g.getTransform();
    if (s.restamp === false) return;
    c.before.push(cx => { cx.save(); fn(cx, m); cx.restore(); if (over) { cx.save(); cx.setTransform(m); over(cx); cx.restore(); } });
  }
  function frontTop(c, t, s) {
    const g = c.g, p = pal(s.lampTired), K = p.shrink;
    if (s.dust !== false && s.dust !== 0) { const R = 250 * K; dustQuad(g, [[TG.CX - R, TG.CY - R], [TG.CX + R, TG.CY - R], [TG.CX + R, TG.CY + R], [TG.CX - R, TG.CY + R]], 60, C.cardPaper, 'topdust', t, 0.8); }
    const m = g.getTransform(); const [SX, SY] = shadePos(m);
    drawShade(g, m);
    emit(c, e => { e.fillStyle = p.hot; e.globalAlpha = 0.85; e.beginPath(); e.arc(TG.CX, TG.CY, 180 * K, 0, TAU); e.arc(SX, SY, TG.SHADE, 0, TAU, true); e.fill('evenodd');
      e.fillStyle = p.mid; e.globalAlpha = 0.3; e.beginPath(); e.arc(TG.CX, TG.CY, 274 * K, 0, TAU); e.fill(); });
    restamp(c, s, drawShade, s.overShade);
  }

  // ============================================================================================ LOW ==========
  // F06: a low camera at Christof's place (12:00), across the table toward Scott (6:00). Table-plane metres: e east, n north, y up.
  const LG = { FL: 1320, CXs: 960, YH: 330, RT: 0.62, RCARD: 0.4, RGLASS: 0.5, CWm: 0.078, CHm: 0.11 };
  const LCAM = { clock: 357, R: 1.22, y: 0.45, face: 170 };
  const LL = { e: 0.16, y: 0.8, n: -0.27 };
  const lce = LCAM.R * Math.sin(LCAM.clock * D2R), lcn = LCAM.R * Math.cos(LCAM.clock * D2R);
  const lfw = [Math.sin(LCAM.face * D2R), Math.cos(LCAM.face * D2R)], lrt = [Math.cos(LCAM.face * D2R), -Math.sin(LCAM.face * D2R)];
  const lcam = (e, n) => { const a = e - lce, b = n - lcn; return [a * lrt[0] + b * lrt[1], a * lfw[0] + b * lfw[1]]; };
  function P3(e, y, n) { const [X, Z] = lcam(e, n); return [LG.CXs + LG.FL * X / Z, LG.YH - LG.FL * (y - LCAM.y) / Z, Z]; }
  const lpxm = (e, n) => LG.FL / lcam(e, n)[1];
  const CL = (deg, r) => [r * Math.sin(deg * D2R), r * Math.cos(deg * D2R)];
  const LAMP_S = P3(LL.e, LL.y, LL.n);
  const LSEAT = { christof: 0, deena: 56, angelo: 111, scott: 188, kay: 243, marina: 300, gap: 150 };
  const lOnTable = (e, y, n) => { const k = LL.y / (LL.y - y); return [LL.e + (e - LL.e) * k, LL.n + (n - LL.n) * k]; };
  const circ3 = (e0, n0, r, nseg, y) => { const pts = []; for (let i = 0; i < nseg; i++) { const a = i / nseg * TAU; pts.push(P3(e0 + Math.cos(a) * r, y || 0, n0 + Math.sin(a) * r)); } return pts; };
  const polyPath = (pts, rough, seed) => S().poly(pts).path(rough == null ? 0.8 : rough, seed || 3);
  // the sixth arm and the hall doorway that swallows it (F06)
  const X_ELB = [CL(140, 0.66)[0], 0.26, CL(140, 0.66)[1]], X_SH = [CL(132, 0.9)[0], 0.5, CL(132, 0.9)[1]];
  const LDOOR = (() => { const xE = P3(...X_ELB), xSh = P3(...X_SH); return { x0: xSh[0] - 110, x1: xE[0] + 3, top: -10, bot: 700 }; })();
  const KDOOR = { x0: 1418, x1: 1548, top: 132, bot: 700 };
  // the same pile specs as the top view (names, clocks, {clock,r} in top px, [x,y] top world, entries {at, ring}), in table metres
  function lowPile(spec, s) {
    let clock = null, r = LG.RCARD, ring = (s && s.ring) || 'seven'; s = s || {};
    while (spec && typeof spec === 'object' && !Array.isArray(spec) && spec.x == null) {
      if (spec.ring) ring = spec.ring; if (spec.r != null) r = spec.r * (LG.RCARD / TG.RPILE); if (spec.clock != null) clock = spec.clock;
      if (spec.at == null) break; spec = spec.at;
    }
    if (spec && typeof spec === 'object' && (Array.isArray(spec) || spec.x != null)) { const x = Array.isArray(spec) ? spec[0] : spec.x, y = Array.isArray(spec) ? spec[1] : spec.y;
      return { clock: wrap360(Math.atan2(x - TG.CX, -(y - TG.CY)) / D2R), r: dist([x, y], [TG.CX, TG.CY]) * (LG.RCARD / TG.RPILE) }; }
    if (clock == null) { if (typeof spec === 'number') clock = spec; else if (ring === 'seven' && s.layout !== 'circle') clock = PLACE7[spec]; else clock = spec === 'gap' ? GAP : (s.layout === 'circle' && CIRC.place[spec] != null ? CIRC.place[spec] : SEAT6[spec]); }
    return { clock: clock || 0, r };
  }
  function cardQuad(ce, cn, a, y, i) { const u = [Math.cos(a), Math.sin(a)], v = [-u[1], u[0]]; const corner = (s0, t0) => P3(ce + u[0] * s0 + v[0] * t0, y, cn + u[1] * s0 + v[1] * t0);
    return [corner(LG.CHm / 2 - i, LG.CWm / 2 - i), corner(LG.CHm / 2 - i, -LG.CWm / 2 + i), corner(-LG.CHm / 2 + i, -LG.CWm / 2 + i), corner(-LG.CHm / 2 + i, LG.CWm / 2 - i)]; }
  function cardLow(g, ce, cn, a, y, shadow) {
    const qd = i => cardQuad(ce, cn, a, y, i);
    if (shadow !== false) { g.fillStyle = rgba(C.ink, 0.5); g.fill(polyPath(qd(-0.002).map(p => [p[0] + 2, p[1] + 2]), 0.2, 6)); }
    g.fillStyle = C.cardPaper; g.fill(polyPath(qd(0), 0.25, 7));
    g.fillStyle = C.cardBlue; g.fill(polyPath(qd(0.0058), 0.15, 8));
    g.strokeStyle = rgba(C.cardPaper, 0.45); g.lineWidth = 1; g.stroke(polyPath(qd(0.011), 0, 9));
  }
  // side-view wine glass: foot at (x,y), height h px. S03 profile.
  function glassShape(x, y, s) {
    return S().M(x - s * 0.22, y - s).L(x + s * 0.22, y - s).C(x + s * 0.22, y - s * 0.55, x + s * 0.12, y - s * 0.45, x + s * 0.04, y - s * 0.44).L(x + s * 0.04, y - s * 0.06).L(x + s * 0.18, y).L(x - s * 0.18, y).L(x - s * 0.04, y - s * 0.06).L(x - s * 0.04, y - s * 0.44).C(x - s * 0.12, y - s * 0.45, x - s * 0.22, y - s * 0.55, x - s * 0.22, y - s).Z();
  }
  function glassSide(g, x, y, s, o, light, p) {
    o = o || {}; const fill = clamp(o.fill == null ? 0.4 : o.fill, 0, 1.3);
    const stem = S().M(x - s * 0.034, y - s * 0.455).L(x + s * 0.034, y - s * 0.455).L(x + s * 0.026, y - s * 0.06).Q(x + s * 0.17, y - s * 0.03, x + s * 0.19, y).L(x - s * 0.19, y).Q(x - s * 0.17, y - s * 0.03, x - s * 0.026, y - s * 0.06).Z().path(0.3, 5);
    const bowl = S().M(x - s * 0.205, y - s * 0.985).L(x + s * 0.205, y - s * 0.985).C(x + s * 0.205, y - s * 0.57, x + s * 0.11, y - s * 0.47, x, y - s * 0.465).C(x - s * 0.11, y - s * 0.47, x - s * 0.205, y - s * 0.57, x - s * 0.205, y - s * 0.985).Z().path(0, 1);
    const [ux, uy] = norm2(light[0] - x, light[1] - (y - s * 0.6)); const sd = ux >= 0 ? 1 : -1; const lw = Math.max(1, s * 0.012);
    silFill(g, stem, C.ink, ux, uy, Math.max(1.2, s * 0.018), p.hot);
    g.fillStyle = rgba(C.cardPaper, 0.06); g.fill(bowl);
    g.save(); g.clip(bowl);
    if (fill > 0.02) {
      const top = y - s * (0.47 + 0.5 * Math.min(fill, 1));
      g.fillStyle = C.wine; g.fillRect(x - s * 0.3, top, s * 0.6, s);
      g.fillStyle = C.blood; g.fillRect(x - s * 0.3, top + (y - s * 0.465 - top) * 0.62, s * 0.6, s);
      g.fillStyle = rgba(mix(C.wine, p.hot, 0.55), 0.95); g.fillRect(x - s * 0.3, top, s * 0.6, Math.max(1.2, s * 0.014));
    }
    g.lineWidth = Math.max(2.4, s * 0.05); g.strokeStyle = rgba(C.ink, 0.9); g.save(); g.translate(-sd * lw, 0); g.stroke(bowl); g.restore();
    g.restore();
    g.strokeStyle = rgba(C.cardPaper, 0.3); g.lineWidth = lw; g.stroke(bowl);
    g.strokeStyle = rgba(C.cardPaper, 0.5); g.beginPath(); g.ellipse(x, y - s * 0.985, s * 0.205, s * 0.028, 0, 0, TAU); g.stroke();
    g.strokeStyle = rgba(C.cardPaper, 0.8); g.lineWidth = lw * 1.3; g.beginPath(); g.moveTo(x + sd * s * 0.16, y - s * 0.94); g.quadraticCurveTo(x + sd * s * 0.2, y - s * 0.8, x + sd * s * 0.17, y - s * 0.66); g.stroke();
    if (o.lip) { g.strokeStyle = LIP; g.lineWidth = Math.max(2.5, s * 0.04); g.lineCap = 'round'; const lx = x + s * 0.11 * (o.lipSide || 1); g.beginPath(); g.moveTo(lx - s * 0.055, y - s * 0.962); g.quadraticCurveTo(lx, y - s * 0.95, lx + s * 0.05, y - s * 0.962); g.stroke(); g.lineCap = 'butt'; }
    if (fill > 1) { g.fillStyle = C.wine; g.beginPath(); g.ellipse(x, y + 1, s * (0.2 + (fill - 1) * 1.6), s * (0.035 + (fill - 1) * 0.25), 0, 0, TAU); g.fill(); }
  }
  // geometry of a side-view bottle: foot (x,y), height s px, rot (0 upright; it tips about the foot). Local: foot 0,0, height 1, up = -y.
  function bottleGeom(x, y, s, rot) {
    const M = [Math.cos(rot) * s, Math.sin(rot) * s, -Math.sin(rot) * s, Math.cos(rot) * s, x, y]; const ap = q => O.fig.M.ap(M, q);
    return { M, foot: [x, y], mouth: ap([0, -1.0]), neck: ap([0, -0.86]), shoulder: ap([0, -0.66]), grip: ap([0, -0.42]), rot, height: s, up: [Math.sin(rot), -Math.cos(rot)] };
  }
  function bottleSide(g, x, y, s, rot, light, p, st) {
    const sh = memo('bottleSide', () => {   // local: foot at 0,0, height 1, upright
      return S().M(-0.12, 0).L(0.12, 0).L(0.125, -0.6).C(0.125, -0.7, 0.05, -0.72, 0.042, -0.78).L(0.04, -0.98).L(0.05, -1.0).L(-0.05, -1.0).L(-0.04, -0.98).L(-0.042, -0.78).C(-0.05, -0.72, -0.125, -0.7, -0.125, -0.6).Z();
    });
    const B = bottleGeom(x, y, s, rot), M = B.M; const path = sh.transform(M).path(0.4, 9); const ap = q => O.fig.M.ap(M, q);
    const c0 = [x + Math.sin(rot) * s * 0.5, y - Math.cos(rot) * s * 0.5]; const [ux, uy] = norm2(light[0] - c0[0], light[1] - c0[1]);
    silFill(g, path, C.ink, ux, uy, Math.max(1.5, s * 0.008), p.hot);
    const label = rrShape(-0.112, -0.47, 0.224, 0.2, 0.012).transform(M).path(0.3, 2); g.fillStyle = mix(C.cardPaper, C.tungstenLow, 0.45); g.fill(label);
    g.strokeStyle = rgba(C.ink, 0.7); g.lineWidth = Math.max(1, s * 0.004); [[-0.43], [-0.3]].forEach(([v]) => { const A0 = ap([-0.09, v]), B0 = ap([0.09, v]); g.beginPath(); g.moveTo(A0[0], A0[1]); g.lineTo(B0[0], B0[1]); g.stroke(); });
    { const cc = ap([0, -0.38]); g.fillStyle = mix(C.wine, C.ink, 0.2); g.beginPath(); g.arc(cc[0], cc[1], Math.max(2, s * 0.022), 0, TAU); g.fill(); }
    g.fillStyle = mix(C.wine, C.ink, 0.3); g.fill(rrShape(-0.048, -1.0, 0.096, 0.12, 0.01).transform(M).path(0.2, 3));
    // the kitchen's hood light: a thin reflection INSIDE the shadow-side edge, clipped to the glass, only while that doorway is lit
    const kl = clamp((st && st.kitchenLight) || 0, 0, 1);
    if (kl > 0) {
      const sd = (ux * Math.cos(rot) + uy * Math.sin(rot)) >= 0 ? -1 : 1; const q = [[0.097, -0.07], [0.099, -0.58], [0.092, -0.67], [0.05, -0.71], [0.028, -0.79], [0.026, -0.95]].map(([u, v]) => ap([sd * u, v]));
      g.save(); g.clip(path); g.globalAlpha = 0.6 * kl; g.strokeStyle = C.hood; g.lineWidth = Math.max(1.4, s * 0.009); g.lineJoin = 'round';
      g.beginPath(); q.forEach((pt, i) => i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1])); g.stroke(); g.restore();
    }
    return B;
  }

  // hand flat on the table (F06): wrist [e,n], finger dir, side +1 right / -1 left, lift (m) raises it off the wood
  function tableHand(pose, wrist, fd, side, L, o) {
    o = o || {}; const hs = O.fig.hand(pose, { spread: o.spread == null ? 0.12 : o.spread, curl: o.curl || 0 });
    fd = norm2(fd[0], fd[1]); const nL = [-fd[1], fd[0]]; const lift = o.lift || 0;
    const flat = S(), hump = S();
    hs.polys.forEach(poly => {
      const lo = [], hi = [];
      poly.forEach(([u, v]) => {
        const e = wrist[0] + fd[0] * u * L + nL[0] * (-v) * L * side, n = wrist[1] + fd[1] * u * L + nL[1] * (-v) * L * side;
        const yh = (o.thick || 0.034) * Math.max(0, 1 - Math.pow(clamp(u / 0.62, 0, 1), 2.2)) + 0.006;
        lo.push(P3(e, 0.004 + lift, n)); hi.push(P3(e, yh + lift, n));
      });
      flat.poly(lo); hump.poly(hi);
    });
    return S().add(flat).add(hump);
  }
  function limb3(sh, a, b, ra, rb) { const A = P3(...a), B = P3(...b); sh.capsule(A[0], A[1], ra * lpxm(a[0], a[2]), B[0], B[1], rb * lpxm(b[0], b[2])); }
  function extraHandLow(g, s, u) {
    u = clamp(u, 0, 1); const down = outCubic(u);
    const sp = lowPile('gap', s); const [cx, cn2] = CL(sp.clock, LG.RCARD); const inward = norm2(-cx, -cn2); const tw = 0.32;
    const fd = norm2(inward[0] * Math.cos(tw) - inward[1] * Math.sin(tw), inward[0] * Math.sin(tw) + inward[1] * Math.cos(tw));
    const L = 0.2, reach = -0.02 - (1 - down) * 0.12; const wrist = [cx + inward[0] * reach - fd[0] * L * 0.98, cn2 + inward[1] * reach - fd[1] * L * 0.98];
    const lift = (1 - down) * 0.16;
    const hs = tableHand('open', wrist, fd, 1, L, { spread: 0.14, lift });
    const W3 = [wrist[0], 0.035 + lift, wrist[1]]; const elb = [lerp(X_ELB[0], X_ELB[0] - fd[0] * 0.05, 1 - down), X_ELB[1] + lift * 0.6, lerp(X_ELB[2], X_ELB[2] - fd[1] * 0.05, 1 - down)];
    const arm = S(); limb3(arm, W3, elb, 0.034, 0.046); limb3(arm, elb, X_SH, 0.046, 0.052);
    g.fillStyle = C.ink; g.fill(S().add(arm).add(hs).path(0.7, 77));
  }
  function flyLow(g, s, f) {
    const res = sp => { if (sp === 'dealer' || sp === 'deck' || sp == null) { const [e, n] = CL(LSEAT.angelo, 0.52); return { e, n, y: 0.07 }; } const q = lowPile(sp, s); const [e, n] = CL(q.clock, q.r); return { e, n, y: 0.002 }; };
    const A = res(f.from), B = res(f.to); const u = clamp(f.u, 0, 1), e = outCubic(u);
    const pe = lerp(A.e, B.e, e), pn = lerp(A.n, B.n, e), py = lerp(A.y, B.y, e) + 4 * u * (1 - u) * (f.h == null ? 0.12 : f.h);
    const a = Math.atan2(-B.n, -B.e) + (f.spin == null ? 1.25 : f.spin) * TAU * (1 - e);
    const sh = lOnTable(pe, py, pn); g.save(); g.globalAlpha = 0.45; g.fillStyle = C.ink; g.fill(polyPath(cardQuad(sh[0], sh[1], a, 0.001, 0), 0.2, 4)); g.restore();
    cardLow(g, pe, pn, a, py, false);
  }
  function kitchenDoorLow(g, c, s, p) {
    const k = clamp(s.kitchenLight || 0, 0, 1); const D = KDOOR, w = D.x1 - D.x0;
    const door = memo('low:kdoor', () => polyPath([[D.x0, D.top], [D.x1, D.top + 2], [D.x1 + 2, D.bot], [D.x0 - 2, D.bot]], 0.9, 23));
    g.fillStyle = '#100B08'; g.fill(memo('low:kcasing', () => polyPath([[D.x0 - 16, D.top - 14], [D.x1 + 16, D.top - 12], [D.x1 + 18, D.bot], [D.x0 - 18, D.bot]], 0.9, 24)));
    g.fillStyle = mix('#1E140E', C.hoodLow, k); g.fill(door);
    if (k > 0) {
      const inner = memo('low:kin', () => [polyPath([[D.x0 + 10, D.top + 26], [D.x1 - 8, D.top + 30], [D.x1 - 8, D.bot], [D.x0 + 10, D.bot]], 1.2, 25), polyPath([[D.x0 + 34, D.top + 92], [D.x1 - 26, D.top + 104], [D.x1 - 26, D.bot], [D.x0 + 34, D.bot]], 1.2, 26)]);
      g.save(); g.globalAlpha = k; bands(g, inner, [C.hoodMid, C.hood]); g.restore();
      // spill: a parallelogram on the back wall and a hairline on the jamb
      g.save(); g.globalAlpha = 0.5 * k; g.fillStyle = C.hoodLow; g.fill(memo('low:kspill', () => polyPath([[D.x1, D.top + 30], [D.x1 + 120, D.top + 120], [D.x1 + 150, D.bot], [D.x1, D.bot]], 2, 27))); g.restore();
      g.fillStyle = rgba(C.hood, 0.7 * k); g.fillRect(D.x0 - 3, D.top + 40, 3, D.bot - D.top - 40);
      emit(c, e => { e.globalAlpha = 0.75 * k; e.fillStyle = C.hood; e.fill(inner[0]); });
    } else { g.fillStyle = rgba(p.low, 0.6); g.fill(memo('low:kdim', () => polyPath([[D.x0 + 34, D.top + 92], [D.x1 - 26, D.top + 104], [D.x1 - 26, D.bot], [D.x0 + 34, D.bot]], 1.2, 26))); }
  }
  // an empty chair seen across the table: its back faces us (posts, top rail, two slats). Far chairs only; the table cuts the legs.
  function chairBackLow(g, clock, o, p) {
    o = o || {}; const r = 0.86 + (o.out || 0) / TG.PXM, a = (clock + (o.dc || 0)) * D2R + (o.rot || 0);
    const [ce, cn] = CL(clock + (o.dc || 0), r); const tx = Math.cos(a), tn = -Math.sin(a);   // tangent (east,north) of the seat ring
    const W2 = 0.21, pt = (u, y) => P3(ce + tx * u, y, cn + tn * u);
    if (lcam(ce, cn)[1] < 1.05) return;
    const sh = S(); const k = lpxm(ce, cn);
    [-W2, W2].forEach(u => { const A = pt(u, -0.75), B = pt(u, 0.25); sh.capsule(A[0], A[1], 0.02 * k, B[0], B[1], 0.018 * k); });
    sh.poly([pt(-W2 - 0.018, 0.26), pt(0, 0.275), pt(W2 + 0.018, 0.26), pt(W2 + 0.018, 0.19), pt(0, 0.205), pt(-W2 - 0.018, 0.19)]);
    sh.poly([pt(-W2, 0.035), pt(W2, 0.035), pt(W2, 0.005), pt(-W2, 0.005)]);
    [-0.07, 0.07].forEach(u => sh.poly([pt(u - 0.011, 0.195), pt(u + 0.011, 0.195), pt(u + 0.011, 0.03), pt(u - 0.011, 0.03)]));
    const c0 = pt(0, 0.22); const [ux, uy] = norm2(LAMP_S[0] - c0[0], LAMP_S[1] - c0[1]);
    g.save(); g.globalAlpha = o.alpha == null ? 1 : o.alpha; silFill(g, sh.path(0.5, 31), '#0B0807', ux, uy, 2.2, p.mid, 0.9); g.restore();
  }
  const lowTable = () => memo('low:table', () => { const edge = circ3(0, 0, LG.RT, 180); return { edge, path: polyPath(edge, 1.2, 4) }; });
  // the top view's bottle and fresh-glass spots, in table metres (top px / 533 * 0.62/0.66)
  const LPX = 1 / TG.PXM * (LG.RT / 0.66);
  const BOTTLE_LOW = () => CL(170, 318 * LPX), FRESH_LOW = i => CL(136 + i * 22, 140 * LPX);
  function lowSeatGlass(id, s) { if (s.layout === 'circle' && CIRC.place[id] != null) return CL(CIRC.place[id] - 15, LG.RGLASS - 0.02); const c0 = LSEAT[id]; if (c0 == null) return null; return CL(SEAT6[id] - 16, LG.RGLASS); }
  function backLow(c, t, s, part) {
    const g = c.g, p = pal(s.lampTired), K = p.shrink;
    if (part !== 'table') {
      cacheLayer(c, 'low:wall', 'w' + p.k, q => {
        q.fillStyle = C.ink; q.fillRect(-200, -200, W + 400, H + 400);
        const sp = memo('low:spill', () => [S().ellipse(1000, 520, 1120, 330, -0.03).path(2.6, 11), S().ellipse(960, 540, 780, 240, -0.03).path(2.6, 12), S().ellipse(930, 560, 430, 170, -0.03).path(2.6, 13)]);
        q.save(); scaleAbout(q, 960, 540, 0.9 + 0.1 * K); bands(q, sp, p.wall, false); q.restore();
        const D = LDOOR; q.fillStyle = C.ink; q.fill(memo('low:hall', () => polyPath([[D.x0, D.top], [D.x1, D.top], [D.x1 + 2, D.bot], [D.x0 - 2, D.bot]], 0.9, 21)));
        q.fillStyle = rgba(p.mid, 0.6); q.fill(memo('low:jamb', () => polyPath([[D.x1, 250], [D.x1 + 4, 250], [D.x1 + 6, D.bot], [D.x1 + 2, D.bot]], 0.4, 22)));
      });
      kitchenDoorLow(g, c, s, p);
      perforate(c, s, 'low', t);
      const ch = s.chairs || {}; const xs = (s.empty || []).concat(Object.keys(ch).filter(k => ch[k] && ch[k].empty && !(s.empty || []).includes(k)));
      xs.forEach(id => { if (LSEAT[id] != null && SEAT6[id] != null) chairBackLow(g, SEAT6[id], ch[id] || {}, p); });
      if (s.extraChair) { const o = typeof s.extraChair === 'object' ? s.extraChair : { alpha: s.extraChair }; chairBackLow(g, GAP + (o.dc || 0), { out: o.out == null ? 40 : o.out, rot: o.rot == null ? -0.24 : o.rot, alpha: o.u != null ? o.u : o.alpha }, p); }
    }
    if (part === 'wall') return;
    cacheLayer(c, 'low:table', 't' + p.k, q => {
      const T = lowTable();
      q.save(); q.clip(T.path);
      const rings = [[LG.RT + 0.6, p.low], [0.46 * K, p.mid], [0.23 * K, p.hot]];
      const ringP = rings.map(([r], i) => memo('low:ring:' + i + ':' + r.toFixed(3), () => polyPath(circ3(LL.e, LL.n, r, 150), 1.6, 30 + i)));
      bands(q, ringP, rings.map(r => r[1]));
      q.restore();
      const c0 = P3(0, 0, 0)[1]; const arc = memo('low:lip', () => { const a = T.edge.filter(pt => pt[1] < c0).sort((q1, q2) => q1[0] - q2[0]); const pth = new Path2D(); a.forEach((pt, i) => i ? pth.lineTo(pt[0], pt[1]) : pth.moveTo(pt[0], pt[1])); return pth; });
      q.save(); q.strokeStyle = rgba(p.mid, 0.7); q.lineWidth = 2; q.stroke(arc); q.restore();
    });
    // cards
    const jit = [0.06, -0.1, 0.03, 0.08, -0.06, 0.1, -0.04];
    pileList(s).forEach((e, i) => { const q = lowPile(e, s); const [ce, cn] = CL(q.clock, q.r); const n = Math.min(4, e.n || s.pileCards || 1); const a0 = Math.atan2(-cn, -ce) + jit[i % 7] * (1 + 2 * (s.mess || 0));
      const press = pileName(e) === 'gap' && s.gapPress != null ? clamp(s.gapPress, 0, 1) : null;
      if (press != null) {   // the sixth card: curled off the wood with a soft shadow, pressed flat by no hand (doctrine L2)
        const lift = 1 - sm(press), y = 0.002 + 0.016 * lift; const shp = lOnTable(ce, y, cn);
        if (lift > 0.02) { g.save(); g.globalAlpha = 0.55 * lift; g.fillStyle = C.ink; g.fill(polyPath(cardQuad(shp[0] + 0.004 * lift, shp[1] + 0.006 * lift, a0, 0.001, -0.004 * lift), 0.3, 6)); g.restore(); }
        cardLow(g, ce, cn, a0, y, false); return;
      }
      for (let k = 0; k < n; k++) cardLow(g, ce + (k - n + 1) * 0.004, cn + (k - n + 1) * 0.003, a0 + (k - n + 1) * 0.12, 0.002 + k * 0.002, k === 0); });
    if (s.biscuit) { const [be, bn] = CL(16, 0.46); const pp = P3(be, 0.004, bn), k = lpxm(be, bn) * 0.032; g.fillStyle = C.cardPaper; g.beginPath(); g.ellipse(pp[0], pp[1], k, k * 0.32, 0, 0, TAU); g.fill(); g.fillStyle = C.ink; g.beginPath(); g.arc(pp[0] + k * 0.8, pp[1] - k * 0.1, k * 0.35, 0, TAU); g.fill(); }
    // glasses, far to near
    const items = [];
    const G = s.glasses || (s.layout === 'circle' ? { scott: 0.3, marina: 0.25, deena: 0.35, angelo: 0.2 } : { scott: 0.4, kay: { fill: 0.45, lip: true }, marina: 0.3, christof: 0.25, deena: 0.38, angelo: 0.32 });
    Object.keys(G).forEach(id => { let o = G[id]; if (o == null || o === false) return; if (typeof o === 'number') o = { fill: o }; if (o.hide) return; const en = lowSeatGlass(id, s); if (!en) return; items.push({ en, o, kind: 'glass' }); });
    if (s.fifthGlass) items.push({ en: CL(GAP - 4, LG.RGLASS - 0.07), o: { fill: 0.3 }, kind: 'glass', coaster: true, alpha: typeof s.fifthGlass === 'number' ? s.fifthGlass : 1 });
    for (let i = 0; i < Math.round(s.fresh || 0); i++) items.push({ en: FRESH_LOW(i), o: { fill: Array.isArray(s.freshFill) ? s.freshFill[i] : (s.freshFill || 0) }, kind: 'glass' });
    if (s.bottle) items.push({ en: BOTTLE_LOW(), kind: 'bottle' });
    items.forEach(it => { it.z = lcam(it.en[0], it.en[1])[1]; }); items.sort((a, b) => b.z - a.z);
    const L2 = [LAMP_S[0], LAMP_S[1]];
    items.forEach(it => {
      const [e, n] = it.en; const ft = P3(e, 0, n); const k = lpxm(e, n); if (ft[2] < (it.near ? 0.15 : 1.05)) return;
      g.save(); if (it.alpha != null) g.globalAlpha = it.alpha;
      if (it.coaster) { const cq = [[-0.05, -0.05], [0.05, -0.05], [0.05, 0.05], [-0.05, 0.05]].map(([a, b]) => P3(e + a * Math.cos(0.4) - b * Math.sin(0.4), 0.003, n + a * Math.sin(0.4) + b * Math.cos(0.4))); g.fillStyle = '#2B180B'; g.fill(polyPath(cq, 0.3, 5)); g.strokeStyle = rgba(p.mid, 0.9); g.lineWidth = 1.2; g.stroke(polyPath(cq, 0, 5)); }
      // shadow away from the lamp
      const sh = lOnTable(e, 0.17, n), sp2 = P3(sh[0], 0, sh[1]); g.fillStyle = rgba(C.ink, 0.45); g.fill(S().capsule(ft[0], ft[1], 0.03 * k, sp2[0], sp2[1], 0.035 * lpxm(sh[0], sh[1])).path(0.5, 4));
      if (it.kind === 'bottle') bottleSide(g, ft[0], ft[1], 0.31 * k, 0, L2, p, s); else glassSide(g, ft[0], ft[1], 0.17 * k, it.o, L2, p);
      g.restore();
    });
    (s.flying || []).forEach(f => flyLow(g, s, f));
    if (s.extraHand) extraHandLow(g, s, s.extraHand);
  }
  function frontLow(c, t, s) {
    const g = c.g, p = pal(s.lampTired), K = p.shrink;
    const c1 = P3(0.38 * K, 0, 0.0), c2 = P3(-0.4 * K, 0, 0.0); const cl = c1[0] < c2[0] ? [c1, c2] : [c2, c1];
    const q = [[LAMP_S[0] - 110, -10], [LAMP_S[0] + 110, -10], cl[1], cl[0]];
    O.cone(g, q, p.hot, 0.045);
    if (s.dust !== false && s.dust !== 0) dustQuad(g, [[LAMP_S[0] - 90, 0], [LAMP_S[0] + 90, 0], cl[1], cl[0]], 80, C.cardPaper, 'lowdust', t, 0.9);
    emit(c, e => { e.fillStyle = p.hot; e.globalAlpha = 0.6; e.fill(memo('low:emit:' + K.toFixed(3), () => polyPath(circ3(LL.e, LL.n, 0.25 * K, 90), 1, 3))); });
  }

  // ============================================================================================ TWO ==========
  // A profile two-shot at the table: Kay screen-left facing right, Scott screen-right facing left, the pendant between them,
  // the far side of the table and the other four as soft dark shapes behind.
  const TWO = { lamp: [960, 236], tc: [960, 724], rx: 960, ry: 124, far: { marina: [430, 488, 0.05], christof: [800, 470, -0.04], deena: [1135, 486, 0.06], angelo: [1510, 474, -0.07] } };
  function crowdCanvas(c, who) {
    return c.cache('table:two:crowd:' + who.join(','), (q) => {
      const tmp = O.makeCanvas(W, H), tg = tmp.getContext('2d');
      who.forEach((id, i) => { const f = TWO.far[id]; if (!f) return; const b = O.fig.bust(id, { x: f[0], y: f[1], scale: 62, tilt: f[2] });
        const pth = b.shape.path(1.2, 40 + i); tg.fillStyle = '#0E0A08'; tg.fill(pth);
        const [ux, uy] = norm2(TWO.lamp[0] - f[0], TWO.lamp[1] - f[1]); tg.save(); tg.clip(pth); tg.fillStyle = rgba(C.tungstenMid, 0.75); tg.fill(pth); tg.translate(-ux * 3, -uy * 3); tg.fillStyle = '#0E0A08'; tg.fill(pth); tg.restore(); });
      q.filter = 'blur(5px)'; q.drawImage(tmp, 0, 0); q.filter = 'none';
    });
  }
  function backTwo(c, t, s) {
    const g = c.g, p = pal(s.lampTired), K = p.shrink;
    g.fillStyle = C.ink; g.fillRect(-200, -200, W + 400, H + 400);
    const sp = memo('two:spill', () => [S().ellipse(960, 380, 1060, 420, 0.02).path(2.6, 51), S().ellipse(960, 400, 720, 300, 0.02).path(2.6, 52), S().ellipse(960, 420, 420, 200, 0.02).path(2.6, 53)]);
    g.save(); scaleAbout(g, 960, 400, 0.9 + 0.1 * K); bands(g, sp, [mix(p.wall[0], C.ink, 0.15), p.wall[1], mix(p.wall[2], p.mid, 0.25)], false); g.restore();
    // after Christof goes: a far hood-yellow sliver of the kitchen doorway on the back wall, behind Kay
    const kl = clamp(s.kitchenLight || 0, 0, 1); if (kl > 0) farDoor(c, 'two', 238, 214, 640, 74, kl * 0.85, 6, false);
    perforate(c, s, 'two', t);
    // the far four, soft
    const who = s.behind || ['marina', 'christof', 'deena', 'angelo'];
    if (who.length) g.drawImage(crowdCanvas(c, who), 0, 0);
    // the table top: an ellipse in perspective, three rings
    const top = memo('two:top', () => S().ellipse(TWO.tc[0], TWO.tc[1], TWO.rx, TWO.ry, 0).path(1.2, 54));
    g.save(); g.clip(top); g.fillStyle = p.low; g.fill(top);
    g.save(); scaleAbout(g, TWO.tc[0], TWO.tc[1] - 6, K);
    bands(g, [memo('two:r1', () => S().ellipse(TWO.tc[0], TWO.tc[1] - 6, 760, 96, 0).path(1.6, 55)), memo('two:r2', () => S().ellipse(TWO.tc[0], TWO.tc[1] - 6, 430, 56, 0).path(1.6, 56))], [p.mid, p.hot]);
    g.restore();
    g.restore();
    g.fillStyle = C.ink; g.fill(memo('two:lip', () => S().M(TWO.tc[0] - TWO.rx, TWO.tc[1]).C(TWO.tc[0] - TWO.rx, TWO.tc[1] + TWO.ry * 1.33, TWO.tc[0] + TWO.rx, TWO.tc[1] + TWO.ry * 1.33, TWO.tc[0] + TWO.rx, TWO.tc[1]).L(TWO.tc[0] + TWO.rx, TWO.tc[1] + 44).C(TWO.tc[0] + TWO.rx, TWO.tc[1] + TWO.ry * 1.33 + 44, TWO.tc[0] - TWO.rx, TWO.tc[1] + TWO.ry * 1.33 + 44, TWO.tc[0] - TWO.rx, TWO.tc[1] + 44).Z().path(1, 57)));
    // far-side cards and glasses
    const farCards = s.piles ? [[470, 640], [800, 628], [1120, 630], [1450, 642]] : [];
    farCards.forEach(([x, y], i) => { g.save(); g.translate(x, y); g.scale(1, 0.32); g.rotate(0.3 * Math.sin(i * 2.1)); g.fillStyle = C.cardPaper; g.fillRect(-15, -21, 30, 42); g.fillStyle = C.cardBlue; g.fillRect(-12, -18, 24, 36); g.restore(); });
    const L2 = TWO.lamp; const G = s.glasses || { scott: 0.4, kay: { fill: 0.45, lip: true }, christof: 0.25, deena: 0.38, angelo: 0.32, marina: 0.3 };
    const spots = { marina: [560, 636, 58], christof: [880, 626, 56], deena: [1050, 628, 56], angelo: [1380, 638, 58], kay: [760, 760, 112], scott: [1150, 762, 114] };
    Object.keys(spots).forEach(id => { let o = G[id]; if (o == null || o === false) return; if (typeof o === 'number') o = { fill: o }; if (o.hide) return; const [x, y, h] = spots[id]; glassSide(g, x, y, h, Object.assign({ lipSide: -1 }, o), L2, p); });
    (s.flying || []).forEach(f => smearTwo(g, f));   // cards crossing the background: motion-smear rectangles
    // the pendant: cord, shade, the bulb's hot lip
    const shade = memo('two:shade', () => S().M(930, 150).L(990, 150).C(1050, 168, 1092, 214, 1104, 268).C(1060, 282, 860, 282, 816, 268).C(828, 214, 870, 168, 930, 150).Z().path(0.7, 58));
    g.fillStyle = C.ink; g.fillRect(958, -40, 4, 196); g.fill(shade);
    g.fillStyle = p.hot; g.fill(memo('two:bulb', () => S().ellipse(960, 270, 140, 13, 0).path(0.6, 59)));
    g.strokeStyle = rgba(p.mid, 0.9); g.lineWidth = 2.5; g.beginPath(); g.moveTo(1000, 154); g.quadraticCurveTo(1076, 186, 1100, 262); g.stroke();
    emit(c, e => { e.fillStyle = p.hot; e.globalAlpha = 0.9; e.beginPath(); e.ellipse(960, 272, 150, 20, 0, 0, TAU); e.fill(); e.globalAlpha = 0.35; e.beginPath(); e.ellipse(TWO.tc[0], TWO.tc[1] - 6, 430 * K, 56 * K, 0, 0, TAU); e.fill(); });
  }
  function smearTwo(g, f) {
    const A = f.from || [300, 600], B = f.to || [1600, 620]; const u = clamp(f.u, 0, 1), e = outCubic(u); const x = lerp(A[0], B[0], e), y = lerp(A[1], B[1], e) - Math.sin(Math.PI * u) * (f.h == null ? 40 : f.h);
    const v = 1 - e; g.save(); g.translate(x, y); g.rotate(Math.atan2(B[1] - A[1], B[0] - A[0]));
    for (let k = 4; k >= 1; k--) { g.globalAlpha = 0.12 * v; g.fillStyle = C.cardPaper; g.fillRect(-15 - k * 26 * v, -9, 30, 18); }
    g.globalAlpha = 1; g.fillStyle = C.cardPaper; g.fillRect(-15, -9, 30, 18); g.fillStyle = C.cardBlue; g.fillRect(-12, -6.5, 24, 13); g.restore();
  }
  // a fanned deck (F06 foreground; Angelo's flourish). Pivot at (x,y); u 0..1 opens the fan; face:true shows the faces (the flash
  // of the cards): each card shows only its corner strip, so the fan reads as many card edges with a small index + suit in each corner.
  const RANKS = ['A', '7', 'K', '3', 'Q', '9', 'J', '5', '2', '10', '4', '8', '6'];
  function suitPath(k) {   // 0 heart 1 spade 2 diamond 3 club; unit size, centred
    return memo('suit:' + k, () => { const sh = S();
      if (k === 0) sh.M(0, 0.5).C(-0.6, 0.05, -0.55, -0.5, 0, -0.18).C(0.55, -0.5, 0.6, 0.05, 0, 0.5).Z();
      else if (k === 1) { sh.M(0, -0.5).C(0.6, -0.05, 0.55, 0.42, 0, 0.16).C(-0.55, 0.42, -0.6, -0.05, 0, -0.5).Z(); sh.poly([[-0.07, 0.1], [0.07, 0.1], [0.2, 0.5], [-0.2, 0.5]]); }
      else if (k === 2) sh.poly([[0, -0.52], [0.36, 0], [0, 0.52], [-0.36, 0]]);
      else { sh.circle(0, -0.22, 0.2).circle(-0.22, 0.08, 0.2).circle(0.22, 0.08, 0.2); sh.poly([[-0.06, 0.05], [0.06, 0.05], [0.18, 0.5], [-0.18, 0.5]]); }
      return sh.path(0, 1); });
  }
  function fanDeck(c, x, y, o) {
    const g = c.g; o = o || {}; const n = o.n || 16, u = clamp(o.u == null ? 1 : o.u, 0, 1), spread = (o.spread == null ? 100 : o.spread) * D2R * u, rot = o.rot || 0;
    const cw = o.w || 112, chh = o.h || 160, R0 = o.r || 268, p = pal(o.lampTired);
    for (let i = 0; i < n; i++) {
      const a = rot - spread / 2 + (n > 1 ? i * spread / (n - 1) : 0);
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = rgba(C.ink, 0.35); g.beginPath(); g.roundRect(-cw / 2 - cw * 0.025, -R0, cw * 0.05, chh, 2); g.fill();   // the edge shadow of the card above
      g.fillStyle = C.cardPaper; g.beginPath(); g.roundRect(-cw / 2, -R0, cw, chh, cw * 0.07); g.fill();
      if (o.face) {
        const red = (i % 4) === 0 || (i % 4) === 2, col = red ? C.wine : C.ink, fs = Math.max(6, cw * 0.2);
        g.fillStyle = col; g.font = '700 ' + fs.toFixed(1) + 'px "Libre Franklin"'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        g.fillText(RANKS[i % 13], -cw / 2 + cw * 0.15, -R0 + cw * 0.08 + fs * 0.82);
        g.save(); g.translate(-cw / 2 + cw * 0.15, -R0 + cw * 0.12 + fs * 1.25); g.scale(fs * 0.62, fs * 0.62); g.fill(suitPath(i % 4)); g.restore();
        g.strokeStyle = rgba(C.ink, 0.25); g.lineWidth = Math.max(0.8, cw * 0.012); g.beginPath(); g.roundRect(-cw / 2 + cw * 0.3, -R0 + cw * 0.09, cw * 0.6, chh - cw * 0.18, cw * 0.03); g.stroke();
      } else { g.fillStyle = mix(C.cardBlue, C.ink, o.dark == null ? 0.4 : o.dark); g.beginPath(); g.roundRect(-cw / 2 + cw * 0.055, -R0 + cw * 0.055, cw - cw * 0.11, chh - cw * 0.11, cw * 0.035); g.fill();
        g.strokeStyle = rgba(C.cardPaper, 0.22); g.lineWidth = 1.2; g.strokeRect(-cw / 2 + cw * 0.1, -R0 + cw * 0.1, cw - cw * 0.2, chh - cw * 0.2); }
      g.fillStyle = p.hot; g.fillRect(-cw / 2 + 3, -R0 - 0.5, cw - 6, 2.5);
      g.restore();
    }
  }
  function frontTwo(c, t, s) {
    const g = c.g, p = pal(s.lampTired), K = p.shrink;
    O.cone(g, [[832, 272], [1088, 272], [960 + 640 * K, 700], [960 - 640 * K, 700]], p.hot, 0.04);
    if (s.dust !== false && s.dust !== 0) dustQuad(g, [[850, 280], [1070, 280], [960 + 560 * K, 690], [960 - 560 * K, 690]], 70, C.cardPaper, 'twodust', t, 0.8);
  }

  // ============================================================================================ INSERTS (kayglass, bottle) ==========
  // A table-level insert: the wood in the lamp's pool (posterised bands), the dark room beyond, the kitchen doorway far off.
  // a far kitchen doorway, out of focus: dark casing, the hood-lit opening in two bands, the leaf half open at one jamb, a soft
  // spill on the wall beside it and a bright threshold band on the floor. Cached per key (canvas sized to the door only).
  function farDoor(c, key, x, top, bot, w, k, blur, sill) {
    const pad = Math.ceil(blur * 3 + w * 0.6), X0 = Math.floor(x - w / 2 - pad), Y0 = Math.floor(top - pad), CW = Math.ceil(w * 2.6 + pad * 2), CH = Math.ceil(bot - top + pad * 2);
    const cv = c.cache('table:fardoor:' + key, q => {
      q.translate(-X0, -Y0); q.filter = 'blur(' + blur + 'px)';
      const L = x - w / 2, R = x + w / 2;
      q.globalAlpha = 0.5; q.fillStyle = C.hoodLow; q.beginPath(); q.moveTo(R + w * 0.1, top + w * 0.25); q.lineTo(R + w * 1.25, top + w * 0.7); q.lineTo(R + w * 1.5, bot); q.lineTo(R + w * 0.1, bot); q.closePath(); q.fill();
      q.globalAlpha = 1; q.fillStyle = '#0A0706'; q.fillRect(L - w * 0.13, top - w * 0.12, w * 1.26, bot - top + w * 0.12);
      q.fillStyle = C.hoodMid; q.fillRect(L, top, w, bot - top);
      q.fillStyle = C.hood; q.fillRect(L + w * 0.3, top + w * 0.3, w * 0.56, bot - top - w * 0.3);
      q.fillStyle = '#16100B'; q.beginPath(); q.moveTo(L, top); q.lineTo(L + w * 0.26, top + w * 0.1); q.lineTo(L + w * 0.26, bot - w * 0.04); q.lineTo(L, bot); q.closePath(); q.fill();
      if (sill) { q.fillStyle = C.hood; q.globalAlpha = 0.85; q.beginPath(); q.moveTo(L + w * 0.26, bot - w * 0.05); q.lineTo(R, bot - w * 0.05); q.lineTo(R + w * 0.9, bot + w * 0.03); q.lineTo(L - w * 0.1, bot + w * 0.03); q.closePath(); q.fill(); }
      q.filter = 'none';
    }, CW, CH);
    const g = c.g; g.save(); g.globalAlpha = k; g.drawImage(cv, X0, Y0); g.restore();
    emit(c, e => { e.globalAlpha = 0.45 * k; e.fillStyle = C.hood; e.fillRect(x - w * 0.2, top + w * 0.3, w * 0.56, bot - top - w * 0.3); });
  }
  function insertBase(c, t, s, o) {
    const g = c.g, p = pal(s.lampTired), K = p.shrink; const ey = o.edge;
    g.fillStyle = C.ink; g.fillRect(-200, -200, W + 400, H + 400);
    g.fillStyle = mix('#140E0B', p.low, 0.25); g.fill(memo('ins:wall:' + o.key, () => S().ellipse(o.lx, ey - 40, 1200, 380, 0).path(3, 61)));
    const k = clamp(s.kitchenLight || 0, 0, 1);
    if (k > 0) farDoor(c, 'ins:' + o.key, o.kx, o.ky0, ey - 14, o.kw || 210, k, 9, true);   // far, out of focus: the hood-yellow doorway
    // the table surface below the far edge
    const surf = memo('ins:surf:' + o.key, () => S().rect(-300, ey, W + 600, H - ey + 400).path(0.8, 62));
    g.save(); g.clip(surf); g.fillStyle = p.low; g.fill(surf);
    g.save(); scaleAbout(g, o.lx, o.ly, K);
    bands(g, [memo('ins:r1:' + o.key, () => S().ellipse(o.lx, o.ly, o.r1, o.r1 * o.sy, 0).path(2, 63)), memo('ins:r2:' + o.key, () => S().ellipse(o.lx, o.ly, o.r2, o.r2 * o.sy, 0).path(2, 64))], [p.mid, p.hot]);
    g.restore();
    g.globalAlpha = 0.045; g.strokeStyle = C.ink; g.lineWidth = 2; g.stroke(memo('ins:grain:' + o.key, () => { const pp = new Path2D(); for (let i = 0; i < 26; i++) { const y = ey + 6 + i * i * 1.4; pp.moveTo(-200, y); pp.bezierCurveTo(500, y + 6, 1300, y - 5, 2200, y + 3); } return pp; }));
    g.restore();
    g.fillStyle = rgba(p.mid, 0.55); g.fillRect(-200, ey - 1, W + 400, 2);
    return p;
  }
  // a big side-view wine glass (tulip), foot at (x,y), height h
  const KG = { x: 820, y: 905, h: 610 };
  const BOWL = [[0.03, 0.42], [0.14, 0.47], [0.215, 0.56], [0.242, 0.67], [0.236, 0.79], [0.217, 0.91], [0.2, 1.0]];
  const bowlR = yy => { for (let i = 0; i < BOWL.length - 1; i++) { const [r0, y0] = BOWL[i], [r1, y1] = BOWL[i + 1]; if (yy <= y1) return lerp(r0, r1, (yy - y0) / (y1 - y0)); } return 0.2; };
  function bigGlassShapes(x, y, h) {
    return memo('bigglass:' + x + ':' + y + ':' + h, () => {
      const P = (r, v) => [x + r * h, y - v * h];
      const bowl = S(); bowl.M(...P(-BOWL[0][0], BOWL[0][1])); BOWL.slice(1).forEach(([r, v]) => bowl.L(...P(-r, v))); BOWL.slice().reverse().forEach(([r, v]) => bowl.L(...P(r, v))); bowl.Z();
      const smoothBowl = O.fig.smooth(BOWL.map(([r, v]) => P(-r, v)).concat(BOWL.slice().reverse().map(([r, v]) => P(r, v))), true);
      const stem = S().M(...P(-0.03, 0.43)).C(...P(-0.016, 0.36), ...P(-0.014, 0.1), ...P(-0.024, 0.035)).L(...P(-0.2, 0.012)).C(...P(-0.21, -0.012), ...P(0.21, -0.012), ...P(0.2, 0.012)).L(...P(0.024, 0.035)).C(...P(0.014, 0.1), ...P(0.016, 0.36), ...P(0.03, 0.43)).Z();
      const foot = S().ellipse(x, y - 0.012 * h, 0.205 * h, 0.03 * h, 0);
      return { bowl: smoothBowl.path(0.3, 81), stemFoot: S().add(stem).add(foot).path(0.5, 82), rim: [x, y - h, 0.2 * h, 0.034 * h] };
    });
  }
  function bigGlass(c, g, x, y, h, o, p, light) {
    o = o || {}; const fill = clamp(o.fill == null ? 0.42 : o.fill, 0, 1.25); const sh = bigGlassShapes(x, y, h); const [ux, uy] = norm2(light[0] - x, light[1] - (y - h * 0.5));
    // shadow and the wine's red caustic on the wood
    g.fillStyle = rgba(C.ink, 0.55); g.beginPath(); g.ellipse(x - 0.08 * h, y + 0.03 * h, 0.34 * h, 0.06 * h, -0.05, 0, TAU); g.fill();
    if (fill > 0.02) { g.fillStyle = rgba(mix(C.wine, p.hot, 0.4), 0.55); g.beginPath(); g.ellipse(x - 0.1 * h, y + 0.04 * h, 0.12 * h, 0.022 * h, -0.05, 0, TAU); g.fill(); }
    // stem and foot: ink, rim on the lit side
    silFill(g, sh.stemFoot, C.ink, ux, uy, Math.max(2, h * 0.005), p.hot);
    // the bowl: a pale glaze, the doorway seen through it, the wine
    g.save(); g.clip(sh.bowl);
    g.fillStyle = rgba(C.cardPaper, 0.05); g.fill(sh.bowl);
    if (o.through) o.through(g);
    if (fill > 0.02) {
      const f = Math.min(fill, 1), wy = 0.43 + 0.5 * f; const top = y - wy * h; const rw = bowlR(wy) * h;
      g.fillStyle = C.blood; g.fillRect(x - h, top, 2 * h, h);
      g.fillStyle = C.wine; g.fillRect(x - h, top, 2 * h, (wy - 0.47) * h * 0.85);
      // the surface: an ellipse, its far edge catching the lamp
      g.fillStyle = mix(C.wine, p.hot, 0.18); g.beginPath(); g.ellipse(x, top, rw, rw * 0.16, 0, 0, TAU); g.fill();
      g.strokeStyle = rgba(p.hot, 0.85); g.lineWidth = 2.2; g.beginPath(); g.ellipse(x, top, rw - 2, rw * 0.16 - 1, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
      // a tap ripples the surface
      if (o.tapT != null && o.tapT >= 0 && o.tapT < 1.6) {
        const tt = o.tapT; for (let i = 0; i < 3; i++) { const u = tt / 1.6 - i * 0.12; if (u <= 0 || u >= 1) continue; const rr = rw * (0.15 + 0.85 * u); g.strokeStyle = rgba(mix(C.wine, p.hot, 0.6), 0.7 * (1 - u)); g.lineWidth = 1.6; g.beginPath(); g.ellipse(x + rw * 0.55 * (1 - u), top, rr * 0.6, rr * 0.1, 0, 0, TAU); g.stroke(); }
      }
    }
    g.restore();
    // glass edges: a hairline on the lit side, a dark edge on the other, the rim ellipse, one specular sliver
    g.save(); g.lineWidth = 2; g.strokeStyle = rgba(C.cardPaper, 0.35); g.stroke(sh.bowl);
    g.save(); g.clip(sh.bowl); g.translate(-ux * 3, -uy * 3); g.lineWidth = 5; g.strokeStyle = rgba(C.ink, 0.7); g.stroke(sh.bowl); g.restore();
    const [rx0, ry0, rrx, rry] = sh.rim; const wob = o.tapT != null && o.tapT >= 0 && o.tapT < 0.5 ? Math.sin(o.tapT * 90) * (0.5 - o.tapT) * 2.2 : 0;
    g.strokeStyle = rgba(C.cardPaper, 0.6); g.lineWidth = 2.4; g.beginPath(); g.ellipse(rx0, ry0, rrx + wob, rry, 0, 0, TAU); g.stroke();
    g.strokeStyle = rgba(C.cardPaper, 0.9); g.lineWidth = 3; g.beginPath(); g.ellipse(rx0, ry0, rrx + wob, rry, 0, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
    const sx = x - 0.16 * h; g.fillStyle = rgba(C.cardPaper, 0.55); g.fill(S().M(sx, y - 0.93 * h).Q(sx - 0.05 * h, y - 0.75 * h, sx - 0.02 * h, y - 0.58 * h).L(sx - 0.005 * h, y - 0.6 * h).Q(sx - 0.03 * h, y - 0.76 * h, sx + 0.012 * h, y - 0.93 * h).Z().path(0.2, 5));
    g.restore();
    // the lip mark: the most saturated thing in the room. A partial print pressed on the outside of the glass just under the rim,
    // following the rim's front arc: upper and lower lip with a cupid's-bow dip, broken off at one end, smudged down-right, creased.
    if (o.lip) {
      const [rx0, ry0, rrx, rry] = sh.rim, k = h / 610, pc = Math.PI / 2 - 0.33, span = 0.4;
      const R = (ph, d) => [rx0 + rrx * Math.cos(ph), ry0 + rry * Math.sin(ph) + d * k];
      const N = 22, up = [], lo = [];
      for (let i = 0; i <= N; i++) { const u = i / N, ph = pc - span + 2 * span * u; const bell = Math.pow(Math.sin(Math.PI * u), 0.55), bow = 1 - 0.32 * Math.exp(-Math.pow((u - 0.5) / 0.07, 2));
        up.push([ph, 2.4 + 9.5 * bell * bow]); lo.push([ph, 2.4 + 9.5 * bell * bow + 2.2, 2.4 + 9.5 * bell * bow + 2.2 + 12 * Math.pow(bell, 0.8)]); }
      const band = (list, i0, i1, top, bot) => { const pts = []; for (let i = i0; i <= i1; i++) pts.push(R(list[i][0], top(list[i]))); for (let i = i1; i >= i0; i--) pts.push(R(list[i][0], bot(list[i]))); return pts; };
      const upper = band(up, 3, N, () => 2, q => q[1]), lower = band(lo, 0, N - 2, q => q[1], q => q[2]);
      const print = memo('lipprint:' + h, () => S().poly(upper).poly(lower).path(0.9, 6));
      g.save(); g.translate(0.012 * h, 0.009 * h); g.globalAlpha = 0.2; g.fillStyle = LIP; g.fill(print); g.restore();   // the smudge
      g.save(); g.fillStyle = LIP; g.globalAlpha = 0.92; g.fill(print);
      g.clip(print); g.globalAlpha = 0.45; g.strokeStyle = mix(LIP, C.wine, 0.55); g.lineWidth = Math.max(1, 1.3 * k);   // creases
      for (let i = 2; i < N - 1; i += 2) { const ph = lo[i][0]; const A0 = R(ph, 0), B0 = R(ph + 0.012, 30); g.beginPath(); g.moveTo(A0[0], A0[1]); g.lineTo(B0[0], B0[1]); g.stroke(); }
      g.restore();
      const lc = R(pc, 10); emit(c, e => { e.fillStyle = LIP; e.globalAlpha = 0.4; e.beginPath(); e.ellipse(lc[0], lc[1], 48 * k, 16 * k, 0, 0, TAU); e.fill(); });
    }
    return sh;
  }
  function backKayglass(c, t, s) {
    const o = { key: 'kg', edge: 640, lx: 980, ly: 830, r1: 1250, r2: 640, sy: 0.24, kx: 1480, ky0: 150 };
    const p = insertBase(c, t, s, o); const g = c.g; const k = clamp(s.kitchenLight || 0, 0, 1);
    const through = k > 0 ? (q => { q.save(); q.globalAlpha = 0.45 * k; q.fillStyle = C.hoodMid; q.fillRect(KG.x - 0.2 * KG.h, KG.y - 0.95 * KG.h, 0.07 * KG.h, 0.5 * KG.h); q.restore(); }) : null;
    bigGlass(c, g, KG.x, KG.y, KG.h, { fill: s.kayFill == null ? 0.42 : s.kayFill, lip: s.lip !== false, tapT: s.tapT, through }, p, [900, -300]);
  }
  // the bottle insert: five fresh glasses in a row, Kay's glass apart. The bottle is simply THERE across a cut (the Extra acts
  // only between frames): play the THUMP (thumpT) with it out of frame or out of focus (bottle.soft), then cut to it standing.
  // FRESH index 2 (the middle glass) is Deena's, the one Scott overpours; 4 (right end) is the fifth glass nobody claims.
  const BOT = { fresh: [[505, 860], [680, 860], [855, 860], [1030, 860], [1205, 860]], gh: 300, kay: [1530, 830, 260], bottle: [250, 905, 560], freshWho: ['marina', 'angelo', 'deena', 'scott', null] };
  function bottleInsertPose(s) {
    const bo = s.bottle === undefined ? { u: 1 } : (typeof s.bottle === 'object' ? s.bottle : (s.bottle ? { u: s.bottle } : null)); if (!bo) return null;
    const u = clamp(bo.u == null ? 1 : bo.u, 0, 1), rot = bo.rot || 0, h = bo.h || BOT.bottle[2]; let x = bo.x == null ? BOT.bottle[0] : bo.x, y0 = bo.y == null ? BOT.bottle[1] : bo.y;
    if (bo.mouth) { x = bo.mouth[0] - Math.sin(rot) * h; y0 = bo.mouth[1] + Math.cos(rot) * h; }
    return { x, y: lerp(-80, y0, outCubic(u)), rot, h, u, soft: clamp(bo.soft || 0, 0, 1) };
  }
  function joltAt(s, i) { const tt = s.thumpT; return tt != null && tt >= 0 && tt < 0.3 ? Math.sin(tt * 80 + i) * (0.3 - tt) * 12 : 0; }
  function backBottle(c, t, s) {
    const o = { key: 'bt', edge: 600, lx: 900, ly: 840, r1: 1300, r2: 700, sy: 0.22, kx: 1650, ky0: 120 };
    const p = insertBase(c, t, s, o); const g = c.g; const light = [900, -300];
    const bp = bottleInsertPose(s);
    // Kay's glass, apart and untouched (it jolts with the THUMP too)
    if (s.kayGlass !== false) { const j = joltAt(s, 5); g.fillStyle = rgba(C.ink, 0.5); g.beginPath(); g.ellipse(BOT.kay[0] - 26, BOT.kay[1] + 9, BOT.kay[2] * 0.3, BOT.kay[2] * 0.05, 0, 0, TAU); g.fill();
      glassSide(g, BOT.kay[0] + j * 0.3, BOT.kay[1] - Math.abs(j), BOT.kay[2], { fill: 0.45, lip: true, lipSide: -1 }, light, p); }
    const nf = s.fresh == null ? 5 : Math.round(s.fresh);
    const pour = s.pour;
    for (let i = 0; i < nf; i++) {
      const [x, y] = BOT.fresh[i]; let f = Array.isArray(s.freshFill) ? s.freshFill[i] : (s.freshFill || 0); if (pour && pour.i === i && pour.level != null) f = pour.level;
      const jolt = Math.abs(joltAt(s, i)) * (i % 2 ? 1 : 0.6);
      g.fillStyle = rgba(C.ink, 0.5); g.beginPath(); g.ellipse(x - 30, y + 10, BOT.gh * 0.3, BOT.gh * 0.05, 0, 0, TAU); g.fill();
      glassSide(g, x, y - jolt, BOT.gh, { fill: f }, light, p);
      if (f > 1) { g.fillStyle = C.wine; g.fill(S().M(x + BOT.gh * 0.2, y - BOT.gh * 0.97).Q(x + BOT.gh * 0.25, y - BOT.gh * 0.6, x + BOT.gh * 0.07, y - BOT.gh * 0.42).L(x + BOT.gh * 0.05, y - BOT.gh * 0.4).Q(x + BOT.gh * 0.19, y - BOT.gh * 0.62, x + BOT.gh * 0.17, y - BOT.gh * 0.97).Z().path(0.4, 7)); }
    }
    if (!bp) return;
    if (bp.soft > 0) {   // out of focus, close to the lens: a big blurred dark shape with one soft tungsten edge
      const bl = Math.round(6 + 26 * bp.soft), pad = bl * 3, bw = Math.ceil(bp.h * 0.6 + pad * 2), bh = Math.ceil(bp.h * 1.3 + pad * 2);
      const cv = c.cache('table:bt:soft:' + [Math.round(bp.h), bp.rot.toFixed(2), bl, p.k].join(':'), q => { q.filter = 'blur(' + bl + 'px)'; bottleSide(q, bw / 2, bh - pad, bp.h, bp.rot, [bw / 2 + 400, -600], p, s); q.filter = 'none'; }, bw, bh);
      g.drawImage(cv, bp.x - bw / 2, bp.y - (bh - pad)); return;
    }
    if (bp.u >= 1 && !bp.rot) { g.fillStyle = rgba(C.ink, 0.55); g.beginPath(); g.ellipse(bp.x - 40, bp.y + 12, bp.h * 0.24, bp.h * 0.035, 0, 0, TAU); g.fill(); }
    const B = bottleSide(g, bp.x, bp.y, bp.h, bp.rot, light, p, s);
    if (pour && pour.flow > 0 && nf > (pour.i || 0)) {
      const [gx, gy] = BOT.fresh[pour.i || 0]; const lvl = clamp(pour.level || 0, 0, 1); const sy = gy - BOT.gh * (0.47 + 0.5 * lvl); const m = B.mouth; const wv = 7 * pour.flow;
      g.fillStyle = C.wine; g.fill(S().M(m[0] - wv, m[1]).Q(lerp(m[0], gx, 0.6) - wv, lerp(m[1], sy, 0.15), gx - wv * 0.5, sy).L(gx + wv * 0.5, sy).Q(lerp(m[0], gx, 0.6) + wv, lerp(m[1], sy, 0.15), m[0] + wv, m[1]).Z().path(0.3, 8));
      g.strokeStyle = rgba(p.hot, 0.7); g.lineWidth = 1.6; g.beginPath(); g.moveTo(m[0] - wv, m[1]); g.quadraticCurveTo(lerp(m[0], gx, 0.6) - wv, lerp(m[1], sy, 0.15), gx - wv * 0.5, sy); g.stroke();
    }
  }
  // where the bottle is, for posing Scott's hand on it: {foot, mouth, neck, shoulder, grip (body), rot, height, up}
  function bottleAt(s, view) {
    s = s || {}; view = view || 'bottle';
    if (view === 'bottle') { const bp = bottleInsertPose(s); if (!bp) return null; return bottleGeom(bp.x, bp.y, bp.h, bp.rot); }
    if (view === 'top') {
      const bo = typeof s.bottle === 'object' && s.bottle ? s.bottle : { u: s.bottle == null ? 1 : s.bottle }; const b = bo.at || BOTTLE_TOP(); const u = bo.u == null ? 1 : clamp(bo.u, 0, 1);
      const z0 = (1 - outCubic(u)) * 1.2 * TG.PXM, Z = z => tZ(b[0], b[1], z0 + z * TG.PXM);
      return { foot: Z(0), grip: Z(0.15), shoulder: Z(0.2), neck: Z(0.26), mouth: Z(0.31), rot: 0, height: 0.31 * TG.PXM, up: norm2(b[0] - TG.CX, b[1] - TG.CY), base: b };
    }
    if (view === 'low') { const [e, n] = BOTTLE_LOW(); const ft = P3(e, 0, n); const k = lpxm(e, n); return bottleGeom(ft[0], ft[1], 0.31 * k, 0); }
    return null;
  }

  // ============================================================================================ WALL (the photo setup) ==========
  // From the photographer's spot (lens 1.5 m): the dining wall, a door frame at the left, a picture frame; the dark backs of two
  // chairs and the table edge in the foreground hide everything below the waist (front layer).
  const WALLG = { floorY: 968, waistY: 930, scale: 160, light: [640, -420], flash: [970, 470],
    // [waist x, lean toward the gap]: the gap at Scott's right is person-sized (about 400 px of wall between their shoulders)
    slots: { deena: [262, -0.02], angelo: [566, 0.07], gap: [970, 0], scott: [1376, -0.07], marina: [1688, 0.025] } };
  const WALL_ORDER = ['deena', 'angelo', 'gap', 'scott', 'marina'];
  function wallBase(g, p) {
    g.fillStyle = mix('#120D0A', p.low, 0.12); g.fillRect(-300, -300, W + 600, H + 600);
    const sp = memo('wall:spill', () => [S().ellipse(760, 80, 1400, 820, 0).path(3, 91), S().ellipse(760, 80, 1020, 600, 0).path(3, 92), S().ellipse(760, 80, 640, 390, 0).path(3, 93)]);
    bands(g, sp, [mix('#1C140F', p.low, 0.2), mix('#271B13', p.low, 0.35), mix('#33241A', p.mid, 0.3)]);
    g.fillStyle = '#0C0907'; g.fillRect(-300, WALLG.floorY, W + 600, H);
    g.fillStyle = rgba(p.mid, 0.35); g.fillRect(-300, WALLG.floorY - 2, W + 600, 2);
    // the door frame at the left edge: the dark hall beyond (where the photographer could have come from)
    g.fillStyle = '#060404'; g.fillRect(-300, -300, 395, WALLG.floorY + 300);
    g.fillStyle = mix('#1E150F', p.mid, 0.25); g.fill(memo('wall:casing', () => S().rect(95, -300, 34, WALLG.floorY + 300).path(0.8, 94)));
    g.fillStyle = rgba(p.hot, 0.5); g.fillRect(127, -300, 2, WALLG.floorY + 300);
    // a light switch, a picture frame: a real room, a real snapshot
    g.fillStyle = '#100B08'; g.fill(memo('wall:switch', () => rrShape(1800, 512, 40, 62, 6).path(0.4, 95)));
    g.fillStyle = '#0D0907'; g.fill(memo('wall:frame', () => S().rect(1556, 92, 286, 186).path(0.8, 96)));
    g.fillStyle = mix('#1D1511', p.low, 0.3); g.fillRect(1576, 112, 246, 146);
    g.fillStyle = rgba(p.hot, 0.45); g.fillRect(1556, 90, 286, 2);
  }
  function wallFlash(g) {
    const wl = t0 => mix(C.flashWhite, C.ink, t0); const [fx, fy] = WALLG.flash;
    g.fillStyle = wl(0.9); g.fillRect(-300, -300, W + 600, H + 600);
    bands(g, memo('wall:flashpool', () => [S().ellipse(fx, fy, 1300, 860, 0).path(1.6, 97), S().ellipse(fx, fy, 950, 630, 0).path(1.6, 98), S().ellipse(fx, fy, 600, 400, 0).path(1.6, 99)]), [wl(0.84), wl(0.75), wl(0.66)]);
    g.fillStyle = wl(0.8); g.fillRect(-300, WALLG.floorY, W + 600, H);
    g.fillStyle = wl(0.95); g.fillRect(-300, -300, 395, WALLG.floorY + 300);
    g.fillStyle = wl(0.6); g.fillRect(95, -300, 34, WALLG.floorY + 300);
    g.strokeStyle = wl(0.78); g.lineWidth = 9; g.strokeRect(1560, 96, 278, 178); g.fillStyle = wl(0.72); g.fillRect(1800, 512, 40, 62);
  }
  function backWall(c, t, s) {
    const g = c.g, p = pal(s.lampTired == null ? 1 : s.lampTired); const fl = clamp(s.flash || 0, 0, 1);
    wallBase(g, p);
    if (fl > 0) { g.save(); g.globalAlpha = fl; wallFlash(g); g.restore(); }
    perforate(c, s, 'wall', t);
  }
  // a standing bust for the wall view, placed by its waist (hidden by the foreground), leaning toward the gap
  function wallBust(id, o) { const sl = WALLG.slots[id] || [960, 0]; o = o || {}; return O.fig.bust(id, Object.assign({ waist: [sl[0], WALLG.waistY], scale: WALLG.scale, tilt: sl[1] }, o)); }
  // the group as the photographer framed it: who = left-to-right slots (null = the empty place), Marina's hand on Scott's shoulder
  // when she stands at his left (screen right). o.tremble 0..1 + o.t shake that hand at 7 Hz. Returns [{id, slot, x, lean, b (bust)}]
  function wallBusts(who, o) {
    o = o || {}; who = who || ['deena', 'angelo', null, 'scott', 'marina']; const n = who.length;
    const X = n === 5 ? WALL_ORDER.map(k => WALLG.slots[k]) : who.map((_, i) => [lerp(WALLG.slots.deena[0], WALLG.slots.marina[0], n > 1 ? i / (n - 1) : 0.5), 0]);
    const out = []; who.forEach((id, i) => { if (!id) return; let lean = X[i][1]; if (n !== 5) { if (i > 0 && !who[i - 1]) lean = -0.07; if (i < n - 1 && !who[i + 1]) lean = 0.07; }
      out.push({ id, slot: i, x: X[i][0], lean }); });
    out.forEach(f => { f.b = O.fig.bust(f.id, Object.assign({ waist: [f.x, WALLG.waistY], scale: WALLG.scale, tilt: f.lean }, (o.opts || {})[f.id] || {})); });
    const si = out.findIndex(f => f.id === 'scott'), mi = out.findIndex(f => f.id === 'marina');
    if (si >= 0 && mi >= 0 && out[mi].slot === out[si].slot + 1 && o.hand !== false) {
      // as in F08: a short, foreshortened arm from her near shoulder across to the top of his, the hand draped over it
      const sc = WALLG.scale, f = out[mi], tr = (o.tremble || 0) * Math.sin((o.t || 0) * TAU * 7) * 0.025 * sc;
      f.b = O.fig.bust('marina', Object.assign({ waist: [f.x, WALLG.waistY], scale: WALLG.scale, tilt: f.lean, armL: 'none' }, (o.opts || {}).marina || {}));
      const shM = f.b.shoulderL, shS = out[si].b.shoulderR; const A = [shM[0] + 0.06 * sc, shM[1] + 0.32 * sc], Wr = [shS[0] + 0.12 * sc, shS[1] - 0.04 * sc + tr];
      const arm = S().capsule(A[0], A[1], 0.22 * sc, Wr[0], Wr[1], 0.14 * sc);
      const hand = O.fig.hand('relaxed').transform([-0.6 * sc, 0.06 * sc, 0.1 * sc, 0.6 * sc, Wr[0], Wr[1]]);
      f.b.shape = S().add(f.b.shape).add(arm).add(hand);
      f.handOn = { onto: si, wrist: Wr, arm, hand, ring: [Wr[0] - 0.36 * sc, Wr[1] + 0.06 * sc] };
    }
    return out;
  }
  // the four lit from the front by the flash: hard ink shadows on the wall, paper-white bodies. shapes: OTM Shapes or Path2Ds.
  function flashFigs(c, shapes, flash, o) {
    const g = c.g, fl = clamp(flash == null ? 1 : flash, 0, 1); if (fl <= 0 || !shapes) return; o = o || {};
    const off = o.off || [0.13 * WALLG.scale, 0.07 * WALLG.scale];
    const paths = shapes.map((sh, i) => sh instanceof Path2D ? sh : sh.path(0.5, 20 + i));
    g.save(); g.globalAlpha = fl; g.fillStyle = C.ink; g.translate(off[0], off[1]); paths.forEach(pp => g.fill(pp)); g.restore();
    g.save(); g.globalAlpha = fl; g.fillStyle = C.flashWhite; paths.forEach(pp => g.fill(pp)); g.restore();
  }
  function frontWall(c, t, s) {
    const g = c.g, p = pal(s.lampTired == null ? 1 : s.lampTired), fl = clamp(s.flash || 0, 0, 1);
    if (s.figs && fl > 0) flashFigs(c, s.figs, fl);
    // foreground, darkest and largest: the table's edge across the bottom, two chair backs at the sides
    const fg = memo('wall:fg', () => {
      const tbl = S().M(-300, 884).C(500, 864, 1400, 864, 2300, 884).L(2300, 1500).L(-300, 1500).Z();
      const chairBack = (cx, top, w) => {
        const sh = S(); sh.capsule(cx - w / 2, top + 14, 17, cx - w / 2 + 10, 1400, 20); sh.capsule(cx + w / 2, top + 14, 17, cx + w / 2 - 10, 1400, 20);
        sh.add(S().M(cx - w / 2 - 16, top + 18).Q(cx, top - 34, cx + w / 2 + 16, top + 18).L(cx + w / 2 + 12, top + 76).Q(cx, top + 30, cx - w / 2 - 12, top + 76).Z());
        [-0.2, 0, 0.2].forEach(k => sh.rect(cx + k * w - 10, top + 56, 20, 250));
        sh.add(S().M(cx - w / 2, top + 296).Q(cx, top + 276, cx + w / 2, top + 296).L(cx + w / 2, top + 334).Q(cx, top + 314, cx - w / 2, top + 334).Z());
        return sh;
      };
      return { tbl: tbl.path(1, 101), ch: S().add(chairBack(118, 668, 300)).add(chairBack(1810, 690, 300)).path(1, 102) };
    });
    g.fillStyle = '#090605'; g.fill(fg.tbl);
    g.strokeStyle = rgba(fl > 0 ? C.flashWhite : p.mid, 0.55 + 0.4 * fl); g.lineWidth = 2.5; g.beginPath(); g.moveTo(-300, 883); g.bezierCurveTo(500, 863, 1400, 863, 2300, 883); g.stroke();
    silFill(g, fg.ch, '#060404', 0.25, -0.97, 3, fl > 0 ? mix(p.mid, C.flashWhite, fl) : p.mid, 0.9);
    if (fl > 0) { const a = 0.2 * fl * fl; c.after.push(cx => { cx.save(); cx.globalAlpha = a; cx.fillStyle = C.flashWhite; cx.fillRect(0, 0, W, H); cx.restore(); }); }
  }

  // ============================================================================================ PHONE (F08) ==========
  // the photo IS the wall view's flash frame, cropped and scaled: the same slots, leans and room. Paper-white bodies, hard ink
  // flash shadows, nobody holding the camera. who: left-to-right slots, null = the empty place (drawn as nothing: the neighbours'
  // leaning shoulders shape the gap). 1520 x 668.
  const PHOTO = { W: 1520, H: 668, k: 0.83 }; PHOTO.x0 = WALLG.slots.gap[0] - PHOTO.W / 2 / PHOTO.k; PHOTO.y0 = 30;
  const wallToPhoto = q => [(q[0] - PHOTO.x0) * PHOTO.k, (q[1] - PHOTO.y0) * PHOTO.k];
  function photo(who, opts) {
    opts = opts || {}; who = who || ['deena', 'angelo', null, 'scott', 'marina'];
    return memo('photo:' + who.join(','), () => {
      const pc = O.makeCanvas(PHOTO.W, PHOTO.H), p = pc.getContext('2d');
      p.setTransform(PHOTO.k, 0, 0, PHOTO.k, -PHOTO.x0 * PHOTO.k, -PHOTO.y0 * PHOTO.k);
      wallFlash(p);
      const figs = wallBusts(who); const off = [0.13 * WALLG.scale, 0.07 * WALLG.scale];
      p.fillStyle = C.ink; figs.forEach((f, i) => { p.save(); p.translate(off[0], off[1]); p.fill(f.b.shape.path(0.5, 3 + i)); p.restore(); });
      p.fillStyle = C.flashWhite; const paths = figs.map((f, i) => f.b.shape.path(0.5, 20 + i)); paths.forEach(pp => p.fill(pp));
      // Marina's hand where it lies on Scott's white shoulder: a thin ink contour and the gold of her ring
      const m = figs.find(f => f.handOn); if (m) { const H = m.handOn;
        p.save(); p.clip(paths[H.onto]); p.strokeStyle = rgba(C.ink, 0.85); p.lineWidth = 2.6; p.stroke(S().add(H.arm).add(H.hand).path(0.4, 2)); p.restore();
        p.fillStyle = GOLD; p.beginPath(); p.arc(H.ring[0], H.ring[1], 4.4, 0, TAU); p.fill(); }
      figs.forEach(f => O.fig.drawDetails(p, f.b, { hoopColor: C.ink, cigColor: mix(C.flashWhite, C.ink, 0.3) }));
      return pc;
    });
  }
  const PHG = { x: 1000, y: 700, w: 800, h: 372, r: 54, rot: -0.05 };
  function phoneParts() {
    return memo('phone:parts', () => {
      const R2 = PHG.w / 2, Hh = PHG.h / 2; const toL = (x, y) => [x, y];
      const rr = (w, h, r) => { const x = -w / 2, y = -h / 2; return S().M(x + r, y).L(x + w - r, y).Q(x + w, y, x + w, y + r).L(x + w, y + h - r).Q(x + w, y + h, x + w - r, y + h).L(x + r, y + h).Q(x, y + h, x, y + h - r).L(x, y + r).Q(x, y, x + r, y).Z(); };
      const arm = S().M(R2 - 150, -60).L(R2 + 40, -70).C(R2 + 240, -84, R2 + 420, -120, R2 + 640, -150).L(R2 + 650, 70).C(R2 + 430, 66, R2 + 250, 96, R2 + 120, 150).C(R2 + 40, 186, R2 - 60, 170, R2 - 150, 110).Z();
      const fingers = S(), fingerJ = [];
      [[-138, 34], [-60, 32]].forEach(([dx, r]) => { const k0 = toL(R2 + dx + 10, -Hh + 40), k1 = toL(R2 + dx + 2, -Hh - 4), k2 = toL(R2 + dx - 10, -Hh + 30); fingers.capsule(k0[0], k0[1], r + 4, k1[0], k1[1], r).capsule(k1[0], k1[1], r, k2[0], k2[1], r - 6); fingerJ.push([k0, k1, k2, r]); });
      const t0 = [R2 + 70, Hh + 96], t1 = [R2 - 18, Hh - 6], t2 = [R2 - 104, Hh - 44];
      const thumb = S().capsule(t0[0], t0[1], 58, t1[0], t1[1], 33).capsule(t1[0], t1[1], 33, t2[0], t2[1], 25);
      const SCR = { w: PHG.w - 40, h: PHG.h - 38, r: 32 };
      return { arm: arm.path(1.0, 4), fingers: fingers.path(0.7, 6), fingerJ, body: rr(PHG.w, PHG.h, PHG.r).path(0.3, 2), screen: rr(SCR.w, SCR.h, SCR.r).path(0, 1), SCR, thumb: thumb.path(0.7, 9), t2 };
    });
  }
  function backPhone(c, t, s) {
    const g = c.g; const p = pal(s.lampTired == null ? 1 : s.lampTired);
    const room = c.cache('table:phone:room:' + p.k, q => {
      q.fillStyle = C.ink; q.fillRect(0, 0, W, H);
      O.lightPool(q, 760, 30, [{ r: 1250, color: '#110C09' }, { r: 960, color: '#17100B' }, { r: 700, color: '#1F150E' }, { r: 430, color: mix('#2A1C11', '#26201A', p.k) }, { r: 200, color: mix('#3A2613', '#3A3027', p.k) }], { sy: 0.42, rough: 2.4, seed: 5 });
      const DR = { x0: 1694, x1: 1890, y1: 840 };
      q.fillStyle = '#21150D'; q.fill(S().poly([[DR.x0 - 10, DR.y1], [DR.x1 + 10, DR.y1], [DR.x1 + 150, 1030], [DR.x0 - 220, 1030]]).path(1.2, 3));
      q.fillStyle = '#170F0A'; q.fillRect(DR.x0 - 30, 0, DR.x1 - DR.x0 + 60, DR.y1 + 6);
      q.fillStyle = C.tungstenLow; q.fillRect(DR.x0, 0, DR.x1 - DR.x0, DR.y1);
      q.fillStyle = '#6A3E1A'; q.fill(S().poly([[DR.x0 + 64, 0], [DR.x1 - 36, 0], [DR.x1 - 36, DR.y1 - 120], [DR.x0 + 64, DR.y1 - 150]]).path(1.0, 5));
      q.fillStyle = '#2C1B0E'; q.fill(S().poly([[DR.x0, 0], [DR.x0 + 44, 0], [DR.x0 + 44, DR.y1 - 140], [DR.x0, DR.y1]]).path(1.0, 4));
      q.fillStyle = '#3B2412'; q.fill(S().poly([[DR.x0 + 44, DR.y1 - 140], [DR.x1, DR.y1 - 100], [DR.x1, DR.y1], [DR.x0, DR.y1]]).path(1.0, 6));
    });
    g.drawImage(room, 0, 0);
    emit(c, e => { e.fillStyle = C.tungstenLow; e.globalAlpha = 0.45; e.beginPath(); e.ellipse(760, 30, 220, 90, 0, 0, TAU); e.fill(); e.fillStyle = C.tungstenMid; e.globalAlpha = 0.3; e.fillRect(1758, 60, 96, 580); });
  }
  function phonePose(s) { const ph = s.phone || {}; return { x: ph.x == null ? PHG.x : ph.x, y: ph.y == null ? PHG.y : ph.y, rot: ph.rot == null ? PHG.rot : ph.rot, k: ph.s || 1 }; }
  // the lit screen (and Marina's thumb over its edge), drawn into cx under the camera matrix m. Re-stamped after the bloom by
  // frontPhone; a sequence that needs Angelo's pinch ON TOP passes restamp:false (or overScreen) or calls T.phoneScreen itself.
  function phoneScreen(c, s, cx, m) {
    s = s || {}; cx = cx || c.g; m = m || c.g.getTransform();
    const P = phoneParts(), ps = phonePose(s), hand = s.hand !== false, mode = s.screen || 'photo';
    const ca = Math.cos(-ps.rot), sa = Math.sin(-ps.rot); const loc = (dx, dy) => { const [x, y] = norm2(dx, dy); return [x * ca - y * sa, x * sa + y * ca]; };
    const ph = photo(s.who); const zoom = clamp(s.zoom || 1, 1, 4), foc = s.focus || [0.5, 0.42];
    cx.save(); cx.setTransform(m); cx.translate(ps.x, ps.y); cx.rotate(ps.rot); cx.scale(ps.k, ps.k); cx.clip(P.screen);
    const SW = P.SCR.w, SH = P.SCR.h;
    if (mode === 'photo') { const sw = ph.width / zoom, shh = ph.height / zoom; const sx = clamp(foc[0] * ph.width - sw / 2, 0, ph.width - sw), sy = clamp(foc[1] * ph.height - shh / 2, 0, ph.height - shh); cx.drawImage(ph, sx, sy, sw, shh, -SW / 2, -SH / 2, SW, SH); }
    else if (mode === 'glow') { cx.fillStyle = mix(C.phoneWhite, C.ink, 0.35); cx.fillRect(-SW / 2, -SH / 2, SW, SH); }
    else { cx.fillStyle = '#07090B'; cx.fillRect(-SW / 2, -SH / 2, SW, SH); }
    cx.globalAlpha = 0.05; cx.fillStyle = '#FFFFFF'; cx.beginPath(); cx.moveTo(-SW / 2 + 140, -SH / 2); cx.lineTo(-SW / 2 + 330, -SH / 2); cx.lineTo(-SW / 2 + 130, SH / 2); cx.lineTo(-SW / 2 - 60, SH / 2); cx.closePath(); cx.fill();
    cx.restore();
    if (hand) { cx.save(); cx.setTransform(m); cx.translate(ps.x, ps.y); cx.rotate(ps.rot); cx.scale(ps.k, ps.k); const [tx, ty] = loc(-1, -0.75); silFill(cx, P.thumb, C.ink, tx, ty, 3.5, mode === 'off' ? C.tungstenMid : C.phoneWhite, 1); cx.restore(); }
  }
  function frontPhone(c, t, s) {
    const g = c.g, P = phoneParts(), ps = phonePose(s); const hand = s.hand !== false; const mode = s.screen || 'photo';
    const ca = Math.cos(-ps.rot), sa = Math.sin(-ps.rot); const loc = (dx, dy) => { const [x, y] = norm2(dx, dy); return [x * ca - y * sa, x * sa + y * ca]; };
    g.save(); g.translate(ps.x, ps.y); g.rotate(ps.rot); g.scale(ps.k, ps.k);
    if (hand) { g.fillStyle = C.ink; g.fill(P.arm); const [fx, fy] = loc(-0.2, -1); silFill(g, P.fingers, C.ink, fx, fy, 3.5, C.tungstenMid, 0.9); }
    const [bx, by] = loc(-0.25, -1); silFill(g, P.body, C.ink, bx, by, 2.5, C.tungstenMid, 0.85);
    g.restore();
    const m = g.getTransform();
    phoneScreen(c, s, g, m);
    if (mode !== 'off') emit(c, e => { e.translate(ps.x, ps.y); e.rotate(ps.rot); e.scale(ps.k, ps.k); e.fillStyle = C.phoneWhite; e.globalAlpha = 0.3; e.fill(P.screen); });
    if (hand) {   // the gold ring on her index finger
      const [, k1, k2, r] = P.fingerJ[0]; const tt = 0.18, cx = k1[0] + (k2[0] - k1[0]) * tt, cy = k1[1] + (k2[1] - k1[1]) * tt; const ax = Math.atan2(k2[1] - k1[1], k2[0] - k1[0]);
      const tr = s.tremble ? Math.sin(t * TAU * 7) * 1.5 * (s.tremble === true ? 1 : s.tremble) : 0;
      g.save(); g.translate(ps.x, ps.y); g.rotate(ps.rot); g.scale(ps.k, ps.k); g.translate(cx, cy + tr); g.rotate(ax); g.strokeStyle = GOLD; g.lineWidth = 7; g.beginPath(); g.ellipse(0, 0, 7, r + 3, 0, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
      g.fillStyle = C.lighterCream; g.beginPath(); g.arc(-6, -r * 0.55, 3, 0, TAU); g.fill(); g.restore();
      emit(c, e => { e.translate(ps.x, ps.y); e.rotate(ps.rot); e.fillStyle = GOLD; e.beginPath(); e.arc(cx, cy, 14, 0, TAU); e.fill(); });
    }
    restamp(c, s, (cx, mm) => phoneScreen(c, s, cx, mm), s.overScreen);
  }

  // ============================================================================================ dispatch ==========
  const VIEWS = ['top', 'low', 'two', 'kayglass', 'bottle', 'wall', 'phone'];
  function back(c, t, state, view, opts) {
    const s = state || {}; view = view || 'top'; T._view = view;
    switch (view) {
      case 'top': return backTop(c, t, s);
      case 'low': return backLow(c, t, s, opts && opts.part);
      case 'two': return backTwo(c, t, s);
      case 'kayglass': return backKayglass(c, t, s);
      case 'bottle': return backBottle(c, t, s);
      case 'wall': return backWall(c, t, s);
      case 'phone': return backPhone(c, t, s);
    }
    if (global.FILM && global.FILM.warn) global.FILM.warn('table: unknown view ' + view);
  }
  function front(c, t, state, view) {
    const s = state || {}; view = view || 'top';
    switch (view) {
      case 'top': return frontTop(c, t, s);
      case 'low': return frontLow(c, t, s);
      case 'two': return frontTwo(c, t, s);
      case 'wall': return frontWall(c, t, s);
      case 'phone': return frontPhone(c, t, s);
    }
  }
  function draw(c, t, state, view) { back(c, t, state, view); front(c, t, state, view); }
  // a card in flight, in the given (or last drawn) view. from/to: 'dealer' | a pile name ('scott'..'gap') | clock number | {clock,r} | [x,y] (two: screen points)
  function cardInFlight(c, from, to, u, opts) {
    opts = opts || {}; const view = opts.view || T._view || 'top'; const s = opts.state || {}; const f = Object.assign({}, opts, { from, to, u });
    if (view === 'top') flyTop(c.g, s, f); else if (view === 'low') flyLow(c.g, s, f);
    else if (view === 'two') smearTwo(c.g, f);
  }
  // the VOICE, cut through the paper exactly where the perforations will remain (use inside a line's draw(), or a shot's draw)
  function voiceCut(c, view, which, depth) { const v = voiceSpot(view, which || 'scott'); if (!v) return; cutText(c, v.text, v.x, v.y, v.rot, Object.assign({}, O.FACE[v.face], { size: v.size }), depth == null ? 1 : depth); }
  // where a VOICE line lands on screen for a given cam (for a plain line def: {x, y, size, opts:{face}})
  function voiceAt(view, which, cam) {
    const v = voiceSpot(view, which || 'scott'); if (!v) return null; cam = cam || T.cams[view] || {};
    const z = cam.zoom || 1, r = cam.rot || 0, cx = cam.x == null ? W / 2 : cam.x, cy = cam.y == null ? H / 2 : cam.y; const dx = (v.x - cx) * z, dy = (v.y - cy) * z;
    return { x: W / 2 + (cam.dx || 0) + dx * Math.cos(r) - dy * Math.sin(r), y: H / 2 + (cam.dy || 0) + dx * Math.sin(r) + dy * Math.cos(r), size: Math.round(v.size * z), rot: v.rot + r, face: v.face, text: v.text };
  }
  // camera helper: put world point p at screen point q
  function camAt(p, q, zoom, rot) { zoom = zoom || 1; rot = rot || 0; const dx = (q[0] - W / 2) / zoom, dy = (q[1] - H / 2) / zoom; const c0 = Math.cos(-rot), s0 = Math.sin(-rot); return { x: p[0] - (dx * c0 - dy * s0), y: p[1] - (dx * s0 + dy * c0), zoom, rot }; }
  // cast shadow of a top-view figure (OTM Shape) on the table and floor, radially from the pendant (F05)
  function castTop(c, shape, alpha, k) {
    const g = c.g, path = shape instanceof Path2D ? shape : shape.path(1.2, 5); k = k || 1.03;
    g.save(); g.globalAlpha = alpha == null ? 0.5 : alpha; g.fillStyle = C.ink; scaleAbout(g, TG.CX, TG.CY, k); g.fill(path); g.restore();
  }

  // ============================================================================================ anchors ==========
  function topAnchors() {
    const seats = {}, circle = {};
    Object.keys(SEAT6).forEach(id => { const st = seatTop(id, 'six'); const pl = pileTop(id, { ring: 'seven' }), ps = pileTop(id, { ring: 'seats' });
      const lat = [-Math.sin(st.dir), Math.cos(st.dir)], fw = [Math.cos(st.dir), Math.sin(st.dir)], edge = 1.55 * TG.SC;
      seats[id] = { clock: st.clock, chairClock: st.chairClock, x: st.x, y: st.y, dir: st.dir, chair: tP(st.chairClock, TG.RSEAT), pile7: [pl.x, pl.y], pile: [ps.x, ps.y], glass: glassTopSpot(id, {}),
        hands: [[st.x + fw[0] * edge - lat[0] * 0.55 * TG.SC, st.y + fw[1] * edge - lat[1] * 0.55 * TG.SC], [st.x + fw[0] * edge + lat[0] * 0.55 * TG.SC, st.y + fw[1] * edge + lat[1] * 0.55 * TG.SC]] }; });
    Object.keys(CIRC.seats).forEach(id => { const st = CIRC.seats[id]; circle[id] = Object.assign({}, st, { hands: CIRC.hands[id], glass: glassTopSpot(id, { layout: 'circle' }) }); });
    const gp = pileTop('gap', { ring: 'seven' });
    return { centre: [TG.CX, TG.CY], tableR: TG.RT, figScale: TG.SC, pxPerMetre: TG.PXM, seats, light: { x: TG.CX, y: TG.CY },
      gap: { clock: GAP, seat: tP(GAP, TG.RSEAT), pile7: [gp.x, gp.y], edge: tP(GAP, TG.RT), floor: tP(GAP, 560), fifthGlass: glassTopSpot('fifth', {}), voice: voiceSpot('top', 'scott'), voiceSoft: voiceSpot('top', 'angelo') },
      dealer: { deck: DEALER_TOP.deck, hands: DEALER_TOP.hands, dir: DEALER_TOP.dir },
      circle: { figScale: CIRC.figScale, seatR: CIRC.RB, seats: circle, clasps: CIRC.clasps, hands: CIRC.hands, fifthGlass: glassTopSpot('fifth', { layout: 'circle' }), halfSpan: CIRC.half },
      pendant: { x: TG.CX, y: TG.CY, r: TG.SHADE, height: TG.LAMPZ }, bottle: BOTTLE_TOP(), fresh: [0, 1, 2, 3, 4].map(FRESH_TOP), freshWho: BOT.freshWho };
  }
  const LLEAN = { angelo: 0.16, kay: 0.14, scott: 0.1, deena: 0, marina: 0, christof: 0 }, LFACING = { angelo: 1, kay: -1, scott: 0, deena: 1, marina: -1, christof: 0 };
  // a person's head in 'low', following their chair (state.chairs[id].out px / dc deg): {head, scale, facing, depth, near}
  function lowSeatAt(id, s) {
    if (LSEAT[id] == null || id === 'gap') return null; const o = ((s || {}).chairs || {})[id] || {};
    const [e, n] = CL(LSEAT[id] + (o.dc || 0), 0.8 - (LLEAN[id] || 0) + (o.out || 0) * LPX); const hp = P3(e, id === 'scott' ? 0.36 : 0.38, n);
    return { id, head: [hp[0], hp[1]], scale: 0.235 * lpxm(e, n), facing: LFACING[id], depth: hp[2], near: hp[2] < 0.75 };
  }
  function lowAnchors() {
    const seats = {}; const LEAN = LLEAN, FACING = LFACING;
    Object.keys(LSEAT).forEach(id => { if (id === 'gap') return; const [e, n] = CL(LSEAT[id], 0.8 - (LEAN[id] || 0)); const hp = P3(e, id === 'scott' ? 0.36 : 0.38, n);
      const q = lowPile(id, { ring: 'seven' }); const [ce, cn] = CL(q.clock, q.r); const cp = P3(ce, 0, cn); const qs = lowPile(id, { ring: 'seats' }); const [se, sn] = CL(qs.clock, qs.r); const sp = P3(se, 0, sn);
      seats[id] = { clock: LSEAT[id], head: [hp[0], hp[1]], scale: 0.235 * lpxm(e, n), facing: FACING[id], near: hp[2] < 0.75, card7: [cp[0], cp[1]], card: [sp[0], sp[1]], depth: hp[2] }; });
    const gq = lowPile('gap', { ring: 'seven' }); const [ge, gn] = CL(gq.clock, gq.r); const gc = P3(ge, 0, gn);
    const [de, dn] = CL(LSEAT.angelo, 0.52); const dk = P3(de, 0.07, dn); const lat = [Math.cos(LSEAT.angelo * D2R) * 0.07, -Math.sin(LSEAT.angelo * D2R) * 0.07]; const dh = [P3(de - lat[0], 0.06, dn - lat[1]), P3(de + lat[0], 0.06, dn + lat[1])];
    return { seats, light: { x: LAMP_S[0], y: LAMP_S[1] }, gap: { card: [gc[0], gc[1]], door: LDOOR, elbow: P3(...X_ELB).slice(0, 2), shoulder: P3(...X_SH).slice(0, 2), voice: voiceSpot('low', 'scott'), voiceSoft: voiceSpot('low', 'angelo') },
      kitchenDoor: KDOOR, hallDoor: LDOOR, dealer: { deck: [dk[0], dk[1]], hands: [[dh[0][0], dh[0][1]], [dh[1][0], dh[1][1]]], scale: 0.235 * lpxm(de, dn) }, P3, CL, pxm: lpxm, onTable: lOnTable };
  }

  const T = SETS.table = {
    views: VIEWS,
    back, front, draw, cardInFlight, voiceCut, voiceAt, camAt, castTop, flashFigs, photo, fanDeck, bottleAt, wallBust, wallBusts,
    riffleHands: (at, rot, o) => { at = at || DEALER_TOP.deck; return riffleGeom(at[0], at[1], rot == null ? DEALER_TOP.dir + Math.PI / 2 : rot, o).hands; },
    deck: (c, x, y, rot, o) => deckTop(c.g, x, y, rot, o), card: (c, x, y, rot, k) => cardTop(c.g, x, y, rot, true, k),
    glassTop: (c, at, o, state) => glassTop(c.g, c, at, o || {}, pal((state || {}).lampTired)), glassSide: (c, x, y, h, o, state, light) => glassSide(c.g, x, y, h, o || {}, light || [960, -300], pal((state || {}).lampTired)),
    bottleSide: (c, x, y, h, rot, state, light) => bottleSide(c.g, x, y, h, rot || 0, light || [900, -300], pal((state || {}).lampTired), state || {}),
    // re-stamps (see frontTop/frontPhone): draw them yourself after restamp:false, then your hands/words on top
    phoneScreen: (c, state, cx, m) => phoneScreen(c, state || {}, cx, m), shade: (c, state, cx, m) => drawShade(cx || c.g, m || c.g.getTransform()),
    // a line drawn ABOVE the re-stamps (for a line def: draw: (c, s, o) => T.sayAbove(c, s.T.who, s.T.text, x, y, o))
    sayAbove: (c, who, text, x, y, o) => c.before.push(cx => { cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); O.say(cx, who, text, x, y, o || {}); cx.restore(); }),
    // screen-aligned static layer cache for anything that holds still (e.g. Q08's clasped bodies): fn(g) draws in world coords
    cacheLayer: (c, key, fn, sig) => cacheLayer(c, 'u:' + key, sig == null ? '' : String(sig), fn),
    pal, silFill,
    // geometry access
    top: { P: tP, Z: tZ, shadow: tShadow, kz, seat: seatTop, seatAt, chairAt, present: presentIds, pile: (spec, s) => pileTop(spec, s || {}), piles: s => pileList(s || {}).map(e => pileTop(e, s || {})), glass: (id, s) => glassTopSpot(id, s || {}), fresh: FRESH_TOP, bottle: BOTTLE_TOP, PLACE7, SEAT6, SHIFT6, GAP, G: TG, circle: CIRC },
    low: { P3, CL, pxm: lpxm, onTable: lOnTable, lamp: LL, seat: LSEAT, seatAt: lowSeatAt, fresh: FRESH_LOW, bottle: BOTTLE_LOW },
    light: { x: TG.CX, y: TG.CY, color: C.tungsten },
    lights: { top: { x: TG.CX, y: TG.CY }, low: { x: LAMP_S[0], y: LAMP_S[1] }, two: { x: TWO.lamp[0], y: TWO.lamp[1] + 40 }, kayglass: { x: 900, y: -300 }, bottle: { x: 900, y: -300 }, wall: { x: WALLG.light[0], y: WALLG.light[1] }, phone: { x: PHG.x, y: PHG.y, color: C.phoneWhite } },
  };
  T.anchors = {
    centre: [TG.CX, TG.CY],
    top: topAnchors(),
    low: lowAnchors(),
    two: { kay: { x: 520, y: 1068, scale: 150, facing: 1, glass: [760, 760], hand: [700, 772] }, scott: { x: 1405, y: 1068, scale: 154, facing: -1, glass: [1150, 762], hand: [1210, 776] }, lamp: TWO.lamp, table: { centre: TWO.tc, rx: TWO.rx, ry: TWO.ry }, behind: TWO.far, voice: voiceSpot('two', 'scott') },
    kayglass: { foot: [KG.x, KG.y], height: KG.h, rim: [KG.x, KG.y - KG.h], tap: [KG.x + 0.24 * KG.h, KG.y - 0.7 * KG.h], lip: [KG.x + 0.064 * KG.h, KG.y - KG.h + 0.03 * KG.h], light: { x: 900, y: -300 } },
    bottle: { fresh: BOT.fresh, freshWho: BOT.freshWho, deena: 2, glassH: BOT.gh, kay: BOT.kay, bottle: Object.assign(bottleAt({}, 'bottle'), { height: BOT.bottle[2] }), light: { x: 900, y: -300 } },
    wall: { slots: WALLG.slots, order: WALL_ORDER, waistY: WALLG.waistY, scale: WALLG.scale, floorY: WALLG.floorY, light: { x: WALLG.light[0], y: WALLG.light[1] }, flashOffset: [0.13 * WALLG.scale, 0.07 * WALLG.scale], voice: voiceSpot('wall', 'scott'), voiceSoft: voiceSpot('wall', 'angelo'), bust: wallBust, busts: wallBusts, photoCrop: { x0: PHOTO.x0, y0: PHOTO.y0, k: PHOTO.k, w: PHOTO.W, h: PHOTO.H } },
    phone: { phone: { x: PHG.x, y: PHG.y, rot: PHG.rot, w: PHG.w, h: PHG.h }, light: { x: PHG.x, y: PHG.y }, heads: { scott: [810, 250], deena: [528, 420], angelo: [1352, 318] } },
  };
  T.anchors.seats = T.anchors.top.seats; T.anchors.gap = T.anchors.top.gap; T.anchors.dealer = T.anchors.top.dealer; T.anchors.pendant = T.anchors.top.pendant;
  // named cameras (c.camera(T.cams.x)); top views keep 12 o'clock up unless rot is given
  const gapPile = T.anchors.top.gap.pile7;
  T.cams = {
    top: camAt([TG.CX, TG.CY], [846, 536], 1, -6 * D2R),              // F05
    topCentre: { x: TG.CX, y: TG.CY, zoom: 1, rot: 0 },
    topWide: { x: TG.CX, y: TG.CY + 20, zoom: 0.84, rot: 0 },
    topGap: camAt(gapPile, [980, 560], 1.9, -6 * D2R),                   // a push onto the seventh pile / the empty place
    topDealer: camAt(DEALER_TOP.deck, [960, 540], 2.0, -6 * D2R),
    circle: CAM_CIRCLE,   // F07: Scott at the bottom, the gap at about 4 o'clock (the VOICE is placed by this framing)
    gapFloor: camAt(tP(GAP, 520), [960, 540], 2.2, -6 * D2R),           // the empty patch of floor where the photographer stood
    low: { x: 960, y: 540, zoom: 1 }, lowPush: { x: 1080, y: 520, zoom: 1.14 },
    two: { x: 960, y: 540, zoom: 1 }, kayglass: { x: 960, y: 540, zoom: 1 }, bottle: { x: 960, y: 540, zoom: 1 }, wall: { x: 960, y: 540, zoom: 1 }, phone: { x: 960, y: 540, zoom: 1 },
  };
  T.DEFAULTS = { layout: 'six', ring: 'seven', piles: 0, pileCards: 1, mess: 0, glassSwap: 0, fifthGlass: 0, bottle: 0, fresh: 0, freshFill: 0, biscuit: false, lampTired: 0, kitchenLight: 0,
    perforations: 0, perforationLevel: 0.6, perfCut: false, flash: 0, chairs: null, empty: null, extraChair: 0, extraHand: 0, gapPress: null, deck: null, flying: null, dust: true,
    restamp: true, overShade: null, overScreen: null };

  // ============================================================================================ demos ==========
  // Placeholder figures only (the real cast comes from RIG). Each demo is 4 s; tools/set.js renders it at t = 1 s.
  const PH = {
    top(g, s, id, o) {   // seated, from above, rim toward the pendant; follows the chair (seatAt)
      if (T.bare) return null;
      const st = s.layout === 'circle' ? Object.assign({}, CIRC.seats[id]) : seatAt(id, s); if (!st) return null;
      const F = O.fig.top(id, Object.assign({ x: st.x, y: st.y, scale: s.layout === 'circle' ? CIRC.figScale : TG.SC, dir: st.dir, handPose: 'flat', spread: 0.05, foreshorten: s.layout !== 'circle', elbowK: 0.35 }, o || {}));
      const pth = F.shape.path(0.7, 40 + id.length); const [ux, uy] = norm2(TG.CX - st.x, TG.CY - st.y);
      castTop({ g }, pth, 0.45); silFill(g, pth, C.ink, ux, uy, 3.2, pal(s.lampTired).hot); return F;
    },
    profile(g, id, pose, light, rim, color) { if (T.bare) return null; const F = O.fig.profile(id, pose); const pth = F.shape.path(0.7, 9); const bb = F.shape.bbox(); const [ux, uy] = norm2(light[0] - (bb.x + bb.w / 2), light[1] - (bb.y + bb.h * 0.3)); silFill(g, pth, C.ink, ux, uy, rim || 3, color || C.tungsten); return F; },
  };
  function seatedHands(id, s) { const st = seatAt(id, s || {}); const lat = [-Math.sin(st.dir), Math.cos(st.dir)], fw = [Math.cos(st.dir), Math.sin(st.dir)]; const e = 1.42 * TG.SC;
    return [[st.x + fw[0] * e - lat[0] * 0.42 * TG.SC, st.y + fw[1] * e - lat[1] * 0.42 * TG.SC], [st.x + fw[0] * (e + 0.12 * TG.SC) + lat[0] * 0.5 * TG.SC, st.y + fw[1] * (e + 0.12 * TG.SC) + lat[1] * 0.5 * TG.SC]]; }
  const DEMO6 = ['christof', 'deena', 'angelo', 'scott', 'kay', 'marina'];
  const dealerLat = () => [-Math.sin(DEALER_TOP.dir), Math.cos(DEALER_TOP.dir)];
  T.demos = [
    { name: 'top: gathering (chairs dragged, glass swap, the flourish)', letterbox: 1.78, draw(c, t) {
      const u = clamp(t / 3, 0, 1); c.camera(T.cams.top);
      const s = { chairs: { marina: { out: lerp(260, 0, sm(u)), dc: lerp(34, 0, sm(u)), rot: lerp(0.9, 0, sm(u)), empty: true }, kay: { out: 40, empty: true }, angelo: { out: 30 } }, glassSwap: sm(clamp((t - 0.4) / 1.6, 0, 1)) };
      back(c, t, s, 'top'); ['christof', 'deena', 'scott'].forEach(id => PH.top(c.g, s, id, { hands: seatedHands(id, s), handPose: 'flat' }));
      const fu = sm(clamp((t - 0.45) / 0.45, 0, 1)) * (1 - sm(clamp((t - 2.2) / 0.4, 0, 1)));
      fanDeck(c, DEALER_TOP.deck[0], DEALER_TOP.deck[1] + 8, { n: 24, w: 42, h: 60, r: 74, spread: 168, u: fu, rot: DEALER_TOP.dir + Math.PI / 2, face: true }); front(c, t, s, 'top'); } },
    { name: 'top: Angelo shuffles - riffle (topDealer; T.riffleHands)', letterbox: 1.78, draw(c, t) {
      c.camera(T.cams.topDealer); const s = { piles: 0, chairs: { angelo: { out: 10 } } };
      const d = DEALER_TOP.deck, rot = DEALER_TOP.dir + Math.PI / 2, o = { n: 16, split: clamp(t / 0.45, 0, 1), riffle: clamp((t - 0.5) / 1.3, 0, 1) };
      back(c, t, s, 'top'); deckTop(c.g, d[0], d[1], rot, o); PH.top(c.g, s, 'angelo', { hands: riffleGeom(d[0], d[1], rot, o).hands, handPose: 'clasp' }); front(c, t, s, 'top'); } },
    { name: 'top: seven piles (F05) + card in flight', letterbox: 1.78, draw(c, t) {
      c.camera(T.cams.top); const s = { piles: 7, pileCards: 5, flying: [{ from: 'dealer', to: 'kay', u: (t % 1.2) / 1.2 }] };
      back(c, t, s, 'top'); DEMO6.forEach(id => PH.top(c.g, s, id, { hands: id === 'angelo' ? DEALER_TOP.hands : seatedHands(id, s), handPose: id === 'angelo' ? 'clasp' : 'flat' })); deckTop(c.g, DEALER_TOP.deck[0], DEALER_TOP.deck[1], DEALER_TOP.dir + Math.PI / 2, {}); front(c, t, s, 'top'); } },
    { name: 'top: six cards, sixth hand from the dark', letterbox: 1.78, draw(c, t) {
      c.camera(T.cams.top); const s = { piles: ['gap', 'scott', 'kay', 'marina', 'christof', 'deena'], extraHand: clamp((t - 0.2) / 1.2, 0, 1) };
      back(c, t, s, 'top'); ['christof', 'deena', 'scott', 'kay', 'marina'].forEach(id => { const sp = pileTop(id, s); PH.top(c.g, s, id, { hands: [seatedHands(id, s)[0], [sp.x, sp.y]], handPose: ['flat', 'open'] }); });
      PH.top(c.g, s, 'angelo', { hands: DEALER_TOP.hands, handPose: 'clasp' }); deckTop(c.g, DEALER_TOP.deck[0], DEALER_TOP.deck[1], DEALER_TOP.dir + Math.PI / 2, {}); front(c, t, s, 'top'); } },
    { name: 'top: piles:5 - four around, the fifth to Angelo (Kay gone)', letterbox: 1.78, draw(c, t) {
      c.camera(camAt([TG.CX, TG.CY], [900, 540], 1, (-6 + t * 1.2) * D2R)); const s = { piles: 5, chairs: { kay: { out: -40, empty: true } }, glasses: { scott: 0.4, kay: { fill: 0.45, lip: true }, marina: 0.3, christof: 0.25, deena: 0.38, angelo: 0.3 } };
      back(c, t, s, 'top'); ['christof', 'deena', 'angelo', 'scott', 'marina'].forEach(id => PH.top(c.g, s, id, { hands: seatedHands(id, s) })); front(c, t, s, 'top'); } },
    { name: 'top: after the crash (tired, hood, bottle behind Scott, fresh, piles:5 = four + the FIFTH)', letterbox: 1.85, draw(c, t) {
      c.camera(T.cams.top); const s = { lampTired: clamp(t - 0.5, 0, 1), kitchenLight: 1, piles: 5, pileCards: 3, mess: 0.5, bottle: 1, fresh: 5, freshFill: [0.3, 0.3, 1.1, 0.3, 0], biscuit: true,
        chairs: { christof: { out: 70, rot: 0.25, empty: true }, kay: { out: -40, empty: true } }, glasses: { kay: { fill: 0.45, lip: true }, scott: 0.1, deena: 0.05, marina: 0.1, angelo: 0.05 } };
      back(c, t, s, 'top'); ['deena', 'angelo', 'scott', 'marina'].forEach(id => PH.top(c.g, s, id, { hands: seatedHands(id, s) })); front(c, t, s, 'top'); } },
    { name: 'top: Deena catches the wrist, Angelo shoves his chair back (seatAt)', letterbox: 2.0, draw(c, t) {
      c.camera(camAt(tP(110, 300), [960, 560], 1.35, -6 * D2R)); const sh = sm(clamp((t - 0.85) / 0.5, 0, 1));
      const s = { lampTired: 1, kitchenLight: 1, piles: 4, pileCards: 3, mess: 0.4, chairs: { angelo: { out: 150 * sh, dc: -8 * sh, rot: -0.3 * sh }, christof: { empty: true }, kay: { empty: true } }, glasses: { deena: 1.05, scott: 0.3, angelo: 0.2, marina: 0.3, kay: { fill: 0.45, lip: true } } };
      back(c, t, s, 'top'); const an = seatAt('angelo', s), de = seatAt('deena', s); const wrist = [lerp(an.hands[1][0], de.x, 0.35), lerp(an.hands[1][1], de.y, 0.35)];
      const held = sh < 0.35;   // she holds his wrist; he pulls back out of her grip, chair and all
      PH.top(c.g, s, 'angelo', { hands: [an.hands[0], held ? wrist : an.hands[1]], handPose: 'clasp' }); PH.top(c.g, s, 'deena', { hands: [seatedHands('deena', s)[0], held ? [wrist[0] + 8, wrist[1] - 6] : seatedHands('deena', s)[1]], handPose: ['flat', 'clasp'] });
      ['scott', 'marina'].forEach(id => PH.top(c.g, s, id, { hands: seatedHands(id, s) })); front(c, t, s, 'top'); } },
    { name: 'top: hand circle + VOICE cut (F07; bodies via T.cacheLayer)', letterbox: 2.0, draw(c, t) {
      c.camera(T.cams.circle); const s = { layout: 'circle', lampTired: 1, piles: ['scott', 'marina', 'deena', 'angelo', 'gap'], fifthGlass: 1, extraChair: 1 };
      back(c, t, s, 'top'); if (!T.bare) T.cacheLayer(c, 'demo:circle', g => ['scott', 'marina', 'deena', 'angelo'].forEach(id => PH.top(g, s, id, { hands: CIRC.hands[id], handPose: 'clasp', spread: 0.02 })));
      front(c, t, s, 'top'); voiceCut(c, 'top', 'scott', 1); voiceCut(c, 'top', 'angelo', 0.6); } },
    { name: 'top: perforations persist (after Q08, perforationLevel 0.6)', letterbox: 2.0, draw(c, t) {
      const v = voiceSpot('top', 'scott'); c.camera(camAt([v.x - 60, v.y - 150], [960, 560], 1.45, CAM_CIRCLE.rot)); const s = { layout: 'circle', lampTired: 1, perforations: 1, fifthGlass: 1, piles: ['scott', 'marina', 'deena', 'angelo', 'gap'] };
      back(c, t, s, 'top'); front(c, t, s, 'top'); } },
    { name: 'low: six hands on six cards (F06)', letterbox: 1.78, draw(c, t) {
      c.camera(T.cams.low); const s = { piles: ['gap', 'scott', 'kay', 'marina', 'christof', 'deena'], extraHand: clamp((t - 0.3) / 0.9, 0, 1) };
      lowFigs(c, t, s); fanDeck(c, 1085, 1175, { u: 1 }); front(c, t, s, 'low'); } },
    { name: 'low: L2 - the sixth card flattens under no hand (gapPress)', letterbox: 1.78, draw(c, t) {
      c.camera(T.cams.lowPush); const s = { piles: ['gap', 'scott', 'kay', 'marina', 'christof', 'deena'], gapPress: clamp((t - 0.7) / 0.6, 0, 1) };
      lowFigs(c, t, s); front(c, t, s, 'low'); } },
    { name: 'low: tired lamp, hood-yellow kitchen door, perforations, piles:5', letterbox: 2.0, draw(c, t) {
      c.camera(FILM.key(t, [[0, T.cams.low], [4, T.cams.lowPush]])); const s = { lampTired: 1, kitchenLight: clamp(t / 1.5, 0, 1), piles: 5, perforations: 1, empty: ['kay', 'christof'], extraChair: 1, fifthGlass: 1, bottle: 1, glasses: { scott: 0.3, kay: { fill: 0.45, lip: true }, deena: 1.0, marina: 0.3, angelo: 0.2 } };
      back(c, t, s, 'low'); front(c, t, s, 'low'); } },
    { name: 'two: Scott and Kay (cards fly behind)', letterbox: 1.78, draw(c, t) {
      c.camera(T.cams.two); const s = { piles: true, flying: [{ from: [380, 560], to: [1500, 600], u: (t % 0.9) / 0.9 }] };
      back(c, t, s, 'two'); const A = T.anchors.two; const L = [TWO.lamp[0], TWO.lamp[1] + 40];
      PH.profile(c.g, 'kay', { x: A.kay.x, y: A.kay.y, facing: 1, anchor: 'hip', scale: A.kay.scale, lean: 0.12, neck: 0.05, head: 0.02, legN: { a: 1.45, b: 1.45 }, legF: { a: 1.4, b: 1.5 }, armN: { a: 0.75, b: 0.95, hand: 'relaxed' }, armF: { a: 0.45, b: 1.1 } }, L, 4);
      PH.profile(c.g, 'scott', { x: A.scott.x, y: A.scott.y, facing: -1, anchor: 'hip', scale: A.scott.scale, lean: 0.16, neck: 0.1, head: 0.08, legN: { a: 1.45, b: 1.45 }, legF: { a: 1.4, b: 1.5 }, armN: { a: 0.8, b: 0.9, hand: 'relaxed' }, armF: { a: 0.5, b: 1.0 } }, L, 4);
      front(c, t, s, 'two'); } },
    { name: 'two: later - tired lamp, the hood sliver, Kay\'s place empty', letterbox: 2.0, draw(c, t) {
      c.camera(T.cams.two); const s = { lampTired: 1, kitchenLight: 1, behind: ['marina', 'deena', 'angelo'], piles: true, glasses: { kay: { fill: 0.45, lip: true }, scott: 0.3, deena: 0.4, angelo: 0.2, marina: 0.3 } };
      back(c, t, s, 'two'); const A = T.anchors.two; const L = [TWO.lamp[0], TWO.lamp[1] + 40];
      PH.profile(c.g, 'scott', { x: A.scott.x, y: A.scott.y, facing: -1, anchor: 'hip', scale: A.scott.scale, lean: 0.3, neck: 0.16, head: 0.24, legN: { a: 1.45, b: 1.45 }, legF: { a: 1.4, b: 1.5 }, armN: { a: 1.15, b: 0.55, hand: 'point' }, armF: { a: 0.5, b: 1.0 } }, L, 4);
      front(c, t, s, 'two'); } },
    { name: 'kayglass: the lip print, the tap', letterbox: 1.78, draw(c, t) {
      c.camera(T.cams.kayglass); const s = { kitchenLight: 0.6, tapT: t - 0.6 }; back(c, t, s, 'kayglass');
      const tp = T.anchors.kayglass.tap; const k = clamp(1 - Math.abs(t - 0.6) * 3, 0, 1); if (!T.bare) { const hs = O.fig.hand('point').transform([-260, -40, -40, 260, tp[0] + 250 + 30 * (1 - k), tp[1] + 40]); c.g.fillStyle = C.ink; c.g.fill(hs.add(S().capsule(tp[0] + 250 + 30 * (1 - k), tp[1] + 40, 60, 2200, tp[1] + 300, 120)).path(0.7, 3)); } front(c, t, s, 'kayglass'); } },
    { name: 'bottle: the THUMP (bottle out of focus), cut at 1.4 s to it standing', letterbox: 1.85, draw(c, t) {
      c.camera(T.cams.bottle); const cut = t >= 1.4;
      const s = { lampTired: 1, kitchenLight: 1, fresh: cut ? 5 : 0, bottle: cut ? 1 : { soft: 1, x: 70, y: 1180, h: 980 }, thumpT: t - 0.85 }; back(c, t, s, 'bottle'); front(c, t, s, 'bottle'); } },
    { name: 'bottle: five fresh glasses, Scott overpours Deena\'s (fresh[2]; hand on bottleAt)', letterbox: 1.85, draw(c, t) {
      c.camera(T.cams.bottle); const lv = 0.2 + t * 0.32; const s = { lampTired: 1, kitchenLight: 1, fresh: 5, freshFill: [0.5, 0.5, 0, 0, 0], pour: { i: 2, level: lv, flow: 1 }, bottle: { u: 1, mouth: [835, 470], rot: -2.05 } };
      back(c, t, s, 'bottle'); if (!T.bare) { const B = bottleAt(s, 'bottle'); const a = Math.atan2(B.up[1], B.up[0]) + Math.PI / 2; const hk = 150;
        const hs = O.fig.hand('hold', { curl: 0.6 }).transform([Math.cos(a) * hk, Math.sin(a) * hk, -Math.sin(a) * hk, Math.cos(a) * hk, B.grip[0] - Math.cos(a) * 60, B.grip[1] - Math.sin(a) * 60]);
        const pth = S().add(hs).capsule(B.grip[0] - Math.cos(a) * 60, B.grip[1] - Math.sin(a) * 60, 40, 1500, -200, 120).path(0.7, 4); silFill(c.g, pth, C.ink, -0.3, -1, 3, pal(1).hot); }
      front(c, t, s, 'bottle'); } },
    { name: 'wall: the four against the wall (the gap, perforations)', letterbox: 2.0, draw(c, t) {
      c.camera(T.cams.wall); const s = { lampTired: 1, perforations: 1 }; back(c, t, s, 'wall'); const L = WALLG.light; const p = pal(1);
      (T.bare ? [] : wallBusts(null, { tremble: 1, t })).forEach(f => { const [ux, uy] = norm2(L[0] - f.b.head[0], L[1] - f.b.head[1]); silFill(c.g, f.b.shape.path(0.7, 3), C.ink, ux, uy, 3.5, p.mid); });
      front(c, t, s, 'wall'); } },
    { name: 'wall: FLASH (frame 1 of 3)', letterbox: 2.0, draw(c, t) {
      c.camera(T.cams.wall); const figs = wallBusts().map(f => f.b.shape);
      const s = { lampTired: 1, flash: clamp(1 - Math.max(0, t - 1) * 2, 0, 1), figs }; back(c, t, s, 'wall'); front(c, t, s, 'wall'); } },
    { name: 'phone: the photo (F08), Angelo pinches to 2.2x on the gap (overScreen)', letterbox: 2.0, draw(c, t) {
      c.camera(T.cams.phone); const zu = sm(clamp((t - 0.4) / 0.75, 0, 1)); const s = { zoom: 1 + 1.2 * zu, tremble: true,
        overScreen: T.bare ? null : (cx => { const sp = 30 + 70 * zu; [[1268 - sp * 0.4, 770 - sp], [1268 + sp * 0.4, 770 + sp * 0.5]].forEach(([x, y], i) => { const pth = S().capsule(x, y, 14, x + 150, y + 120 + i * 30, 24).capsule(x + 150, y + 120 + i * 30, 24, 1760, 1180, 90).path(0.5, 7 + i); silFill(cx, pth, C.ink, -0.4, -1, 3, C.phoneWhite); }); }) };
      back(c, t, s, 'phone'); const RC = T.lights.phone.color;
      [['scott', { facing: 1, scale: 168, lean: 0.55, neck: 0.32, head: 0.66, armN: { a: 0.3, b: 0.4 }, armF: { a: 0.1, b: 0.3 } }, [810, 250]], ['deena', { facing: 1, scale: 206, lean: 0.5, neck: 0.26, head: 0.56, swing: 0.3, armN: { a: 0.15, b: 0.3 }, armF: { a: 0.05, b: 0.2 } }, [528, 420]], ['angelo', { facing: -1, scale: 210, lean: 0.3, neck: 0.5, head: 0.72, armN: { a: 0.12, b: 0.2 }, armF: { a: 0.05, b: 0.15 } }, [1352, 318]]]
        .forEach(([id, pose, hd]) => { const f0 = O.fig.profile(id, Object.assign({}, pose, { x: 0, y: 0, anchor: 'hip' })); PH.profile(c.g, id, Object.assign({}, pose, { anchor: 'hip', x: hd[0] - f0.joints.head[0], y: hd[1] - f0.joints.head[1] }), [PHG.x, PHG.y], 3, RC); });
      front(c, t, s, 'phone'); } },
  ];
  // low-view placeholder bodies, in the three-layer order (far bodies behind the table's far lip)
  function lowFigs(c, t, s) {
    back(c, t, s, 'low', { part: 'wall' }); const A = T.anchors.low.seats; const L = [LAMP_S[0], LAMP_S[1]];
    [['angelo', 1, 0.4], ['kay', -1, 0.36]].forEach(([id, fc, ln]) => { const a = A[id]; const f0 = O.fig.profile(id, { x: 0, y: 0, facing: fc, anchor: 'hip', scale: a.scale, lean: ln, neck: 0.12, head: 0.15 }); PH.profile(c.g, id, { x: a.head[0] - f0.joints.head[0], y: a.head[1] - f0.joints.head[1], facing: fc, anchor: 'hip', scale: a.scale, lean: ln, neck: 0.12, head: 0.15 }, L, 4); });
    if (!T.bare) { const a = A.scott; const b = O.fig.bust('scott', { x: a.head[0], y: a.head[1], scale: a.scale }); const pth = b.shape.path(0.7, 5); const [ux, uy] = norm2(L[0] - a.head[0], L[1] - a.head[1]); silFill(c.g, pth, C.ink, ux, uy, 4, C.tungsten); }
    back(c, t, s, 'low', { part: 'table' });
  }
})(window);
