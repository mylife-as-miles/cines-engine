/* ONE TOO MANY — set: THE HALL. The front hall, the front door, the porch, the lock, and the corridor to the bathroom.
   Ported from style frame F03 (Kay at the door) and the ARRIVALS / HALLWAY tiles of S03.
   Serves Q03 (arrivals), Q06 (Kay walks away; the bathroom door clicks), Q07 (the empty hallway), Q09 (the procession past the door).

   USE
     const H = SETS.hall;
     c.camera(H.cams.hall_door);                 // every cam names its view: H.cams.hall_door.view === 'hall'
     H.back(c, t, state, 'hall');  ...characters...  H.front(c, t, state, 'hall');     // or H.draw(c, t, state, view) when nobody stands in front
   Front layers: hall = stairs + newel (fg left); doorway = newel; corridor = the living-room jamb at right + the warm room wall.
   Every view is its own authored 1920x1080 world. Static layers are cached (keys 'hall:*'); their resolution follows the camera zoom
   (1 / 1.5 / 2x) so pushes up to ~1.7 stay crisp, and above 1.12 only the visible part of a layer is blitted. Characters are never drawn here.
   RULE (halation): anyone drawn in front of a light that writes to c.em (the kitchen slab, the open bathroom door, the pendant, the street
   lamp, the keyhole) must be occluded right after it is drawn: H.occlude(c, figure.shape). Otherwise the bloom washes over the ink.

   VIEWS
     'hall'      F03 wide: tungsten hall in three bands under the pendant, coat rail with SIX hooks, stairs (front layer), the front door + fanlight.
     'doorway'   closer, straight at the door: the rainSlate night, the terrace opposite, the gate, the wet step. The pendant (off frame above,
                 left of the door) throws a hot disc on the wall at left, so Scott at 'inside' is a silhouette against it (S03 ARRIVALS). Newel (front).
     'porch'     from inside through the open door: a slot of night between the jambs, the two on the porch in the hall's spill, gutter drips, a far cold lamp.
     'lock'      insert: night latch on the door, keep on the frame, the gap between (cold night in it while ajar). Pendant bands fixed in space,
                 each closed by an elliptical falloff end.
     'corridor'  one-point hallway (~85% ink) seen from the living-room doorway (its jamb = front layer): bathroom door on the left wall with its
                 line of light, the kitchen doorway at the far end as a nested hood slab (S03 HALLWAY), dado rails, a radiator with nine fins,
                 two frames, a dead pendant, Kay's afterimage low across the near wall and the bathroom door.
     'handle'    insert: the bathroom door's lever and keyhole, lit from below by the light under the door. Same screen direction as 'corridor':
                 latch edge and stile at LEFT, the lever points RIGHT (toward the hinge).
   STATE  (all optional; H.defaults lists them)
     door 0..1          front door open (0 shut, 1 = 135 deg). Hinge on the right jamb, it swings into the hall. Used by hall, doorway, porch.
                        F03's framing (the leaf edge-on beside the opening, the right-hand wall band and dado showing) is door 0.7 (~95 deg);
                        at 1 the leaf stands back over that wall.
     rain 0..1          rain level outside (through the open door, the fanlight, the porch, the lock's gap)
     coats 0..6         coats on the six hooks, hung in H.coatOrder = deena, angelo, kay, christof, marina, scott (F03 = 2). coatList: ['kay',...] overrides.
     footprints 0..5    wet trails, one per arriving guest in H.trailOrder (deena, angelo, kay, christof, marina). Each starts with a pair on the sill
                        (inside the opening); every trail veers LEFT. A fraction lays the current trail down print by print (H.trailPoint). hall + doorway.
     extraPrints 0..1   the Extra's first trace: a standing pair 0.72 m inside, 0.42 m right of the door centre, on the clean floor at Scott's RIGHT
                        (as he faces the shut door from latchSide), inside the leaf's swing arc, nothing leading to it, as wet as the freshest
                        sill prints. 0..0.6 fades the pair in, 0.6..1 adds two prints walking toward camera.
     dry 0..1           all prints dry
     underDoor 0..1     the light under the bathroom door (corridor: the line + a two-band fan reaching the runner; handle: line, keyhole, latch gap)
     bathDoor 0..1      the bathroom door open (0..90 deg into the bathroom). Its bulb lights the opening and throws a slab, projected through the
                        opening, across the floor (two bands) and the right wall (one band; the frames and radiator stay dark in it). The slab narrows
                        as the leaf closes and is gone at 0: animate 0.6 -> 0 over ~0.5 s for the CLICK. The under-door line shows only at 0.
     kayAfterimage 0..1 L086 in Kay's face, one line, low (Y 1.0-1.3 m) across the near left wall and onto the bathroom door, 8% opacity at 1
     lampTired 0..1     the tungsten tires (bands darken toward tungstenTired). STEP state: quantised to thirds and keyed into the caches. Do not tween.
     spill 0..1         corridor: warm living-room light falling in from behind camera (Q06/Q07 = 1, Q09 = 0.35). Tweenable (cached overlay).
     endLight 0..1      corridor: the kitchen slab (Q06/Q07 0.35 = dim slab, Q09 1 = the S03 hood colours). Tweenable (live rects + cached overlay).
     latch 0..1         lock: 0 = door open a crack (gap 74 px: night in it, the sprung tongue visible), 1 = shut. Independent of `door`.
     snib 0..1          lock: the snib button up (0) / down (1). The second CLICK has NO visible cause: do not move the snib on it. At most the
                        sequence shows it already down when Scott checks.
     jiggle 0..12 px    lock: the door pulled against the keep while he checks it (a hairline of night opens and closes)
   ANCHORS  H.anchors[view]: world points for the choreography ([x, y, figureScale] for floor places). Lights: H.lights[view] = {x, y, color, rimDir}
            (H.light = the hall pendant). Full lists beside each view below and in the API report.
   HELPERS  H.floor(view, X, Z) -> [x, y, k]: a floor point in metres (X across from the door centre, + = right; Z into the hall from the door wall;
            corridor: X across, Z away from camera). H.scaleAt(view, Z) -> OTM.fig scale at depth Z (null for 'lock' and 'handle').
            H.knob(view, door) -> the front door knob on screen at that opening (hall, doorway, porch); H.doorEdge(view, door) -> {top, bot} of the free edge.
            H.trailPoint(view, i, u) -> [x, y, scale] along guest i's trail. H.shadow(c, view, shape, alpha) casts a figure's floor shadow away from the
            view's light, clipped to the floor. H.occlude(c, shape) blocks the halation behind a figure. H.coatShape(id, x, y, s, rot) /
            H.coat(c, id, x, y, opts) give a guest's coat that matches the hook version (Kay's mac with beads and drips).
            H.fx = {rainFall, drips, splashes, motes, rim} (deterministic weather and a camera-safe rim for sequences). */
(function (global) {
  'use strict';
  const O = global.OTM; const { C, W, H, S } = O;
  const SETS = global.SETS = global.SETS || {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, mix = O.mix, rgba = O.rgba;
  const sm = (t) => t * t * (3 - 2 * t);
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

  const DEFAULTS = { door: 0, rain: 1, coats: 0, coatList: null, footprints: 0, extraPrints: 0, dry: 0, underDoor: 1, bathDoor: 0, kayAfterimage: 0,
    lampTired: 0, spill: 1, endLight: 0.35, latch: 1, snib: 0, jiggle: 0 };
  const stOf = s => Object.assign({}, DEFAULTS, s || {});
  const VIEWS = {}, ANCH = {}, CAMS = {}, LIGHTS = {}, FIG_K = {}, SHADOW = {}, SHADOW_CLIP = {};
  const rectPath = (x, y, w, h) => { const p = new Path2D(); p.rect(x, y, w, h); return p; };
  // a floor shadow thrown away from a light: feet = the shape's bbox bottom centre, d = direction on screen, q = length per px of height
  const shadowM = (d, q) => shape => { const bb = shape.bbox(), fy = bb.y + bb.h; const [dx, dy] = norm(d[0], d[1]); return [1, 0, -dx * q, -dy * q, dx * q * fy, fy * (1 + dy * q)]; };

  // ---------- caching ----------
  const memo = new Map();
  const M = (key, fn) => { let v = memo.get(key); if (v === undefined) { v = fn(); memo.set(key, v); } return v; };
  const zoomOf = g => { const m = g.getTransform(); return Math.hypot(m.a, m.b); };
  // the world rect the camera can see (clamped to the authored 1920x1080 world)
  function visRect(g) {
    const inv = g.getTransform().inverse(), cw = g.canvas.width, ch = g.canvas.height; const xs = [], ys = [];
    [[0, 0], [cw, 0], [0, ch], [cw, ch]].forEach(([x, y]) => { xs.push(inv.a * x + inv.c * y + inv.e); ys.push(inv.b * x + inv.d * y + inv.f); });
    const x0 = clamp(Math.floor(Math.min(...xs)) - 2, 0, W), y0 = clamp(Math.floor(Math.min(...ys)) - 2, 0, H);
    const x1 = clamp(Math.ceil(Math.max(...xs)) + 2, 0, W), y1 = clamp(Math.ceil(Math.max(...ys)) + 2, 0, H); return [x0, y0, x1 - x0, y1 - y0];
  }
  // a full-frame static layer in world coordinates; its resolution follows the camera so pushes stay crisp.
  // When zoomed in, only the part of the cached canvas the camera sees is blitted (a res-2 layer is 4x the pixels).
  function layer(c, key, fn) {
    const z = zoomOf(c.g); const res = z > 1.12 ? (z > 1.55 ? 2 : 1.5) : 1;
    const cv = c.cache('hall:' + key + '@' + res, g => { g.scale(res, res); fn(g); }, Math.round(W * res), Math.round(H * res));
    if (res === 1) { c.g.drawImage(cv, 0, 0, W, H); return; }
    const [x, y, w, h] = visRect(c.g); if (w <= 0 || h <= 0) return;
    c.g.drawImage(cv, x * res, y * res, w * res, h * res, x, y, w, h);
  }
  // a static layer that only covers a region [x, y, w, h] of the world (foreground pieces): cheaper to draw every frame
  function layerR(c, key, R, fn) {
    const z = zoomOf(c.g); const res = z > 1.12 ? (z > 1.55 ? 2 : 1.5) : 1;
    const cv = c.cache('hall:' + key + '@' + res, g => { g.scale(res, res); g.translate(-R[0], -R[1]); fn(g); }, Math.ceil(R[2] * res), Math.ceil(R[3] * res));
    c.g.drawImage(cv, R[0], R[1], R[2], R[3]);
  }
  // the lamp's colours, tiring
  const qT = v => Math.round(clamp(v, 0, 1) * 3) / 3;
  function lampCols(k) {
    return { hi: mix(mix(C.tungsten, C.tungstenTired, k), C.ink, 0.12 * k), mid: mix(C.tungstenMid, C.ink, 0.22 * k), low: mix(C.tungstenLow, C.ink, 0.25 * k),
      core: mix('#FFE2A8', C.tungstenTired, k * 0.7), k };
  }
  function ditherStroke(g, p, col, w) { g.save(); g.strokeStyle = O.ditherPattern(g, col); g.lineWidth = w || 6; g.stroke(p); g.restore(); }
  // crisp rim crescent on the lit side of a path (static layers only: it uses a scratch canvas the size of the target)
  const _rt = {};
  function rim(g, path, dir, w, color, clip, alpha) {
    const cv = g.canvas; let t = _rt.c; if (!t || t.width !== cv.width || t.height !== cv.height) { t = _rt.c = O.makeCanvas(cv.width, cv.height); }
    const tg = t.getContext('2d'); tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.globalAlpha = 1; tg.clearRect(0, 0, t.width, t.height);
    tg.setTransform(g.getTransform()); tg.fillStyle = color; tg.fill(path); tg.globalCompositeOperation = 'destination-out'; tg.translate(-dir[0] * w, -dir[1] * w); tg.fill(path);
    g.save(); if (clip) g.clip(clip); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha == null ? 1 : alpha; g.drawImage(t, 0, 0); g.restore();
  }
  const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  const quad = (a, b, c2, d) => S().poly([a, b, c2, d]);

  // ---------- rain that falls (deterministic: a drop's place is a function of t) ----------
  // o: {n, color, alpha, len, speed (px/s), slant (dx per dy), lw, seed}
  function rainFall(g, x, y, w, h, t, o) {
    const n = Math.round(o.n || 100); if (n <= 0) return; const r = O.rng(o.seed || 'rain'); const sl = o.slant == null ? 0.26 : o.slant;
    const len = o.len || 30, sp = o.speed || 1500; const buckets = [new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < n; i++) {
      const x0 = r() * (w + sl * h), ph = r(), v = sp * (0.8 + 0.4 * r()), l = len * (0.55 + 0.9 * r()), b = Math.floor(r() * 3);
      const span = h + l; const yy = ((ph * span + t * v) % span) - l; const px = x + x0 - sl * (yy + l);
      buckets[b].moveTo(px, y + yy); buckets[b].lineTo(px - sl * l, y + yy + l);
    }
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.strokeStyle = o.color || C.rainSilver; g.lineWidth = o.lw || 1; g.lineCap = 'round';
    const a = o.alpha == null ? 0.5 : o.alpha; [0.35, 0.65, 1].forEach((k, i) => { g.globalAlpha = a * k; g.stroke(buckets[i]); });
    g.restore();
  }
  // drips that gather at a lip and fall (countable). pts: [[x, y]], fall px, t
  function drips(g, pts, fall, t, o) {
    o = o || {}; g.save(); g.fillStyle = o.color || C.rainSilver;
    pts.forEach(([x, y], i) => {
      const per = (o.period || 1.3) * (0.75 + 0.5 * O.vnoise(i * 3.1, 0.5, 77)); const u = ((t + i * 0.37 * per) % per) / per;
      const hang = Math.min(1, u / 0.55), s = o.r || 2;
      g.globalAlpha = (o.alpha || 0.85); g.beginPath(); g.ellipse(x, y + s * hang, s * (0.7 + 0.3 * hang), s * (0.8 + 0.9 * hang), 0, 0, 7); g.fill();
      if (u > 0.55) { const v = (u - 0.55) / 0.45; const yy = y + s + fall * v * v; g.globalAlpha = (o.alpha || 0.85) * (1 - v * 0.3); g.beginPath(); g.ellipse(x, yy, s * 0.7, s * 1.9, 0, 0, 7); g.fill(); }
    });
    g.restore();
  }

  // ---------- wet footprints ----------
  const SOLE = {
    heel: () => S().M(0.0, -0.032).C(0.06, -0.05, 0.13, -0.042, 0.15, -0.004).C(0.14, 0.036, 0.07, 0.044, 0.0, 0.028).C(-0.018, 0.012, -0.018, -0.016, 0.0, -0.032).Z().add(S().ellipse(-0.11, 0.004, 0.02, 0.018, 0)),
    shoe: () => S().M(0.0, -0.044).C(0.07, -0.06, 0.15, -0.052, 0.17, -0.004).C(0.155, 0.05, 0.07, 0.058, 0.0, 0.04).C(-0.024, 0.016, -0.024, -0.02, 0.0, -0.044).Z()
      .add(S().M(-0.075, -0.034).C(-0.11, -0.04, -0.15, -0.028, -0.15, 0.002).C(-0.15, 0.03, -0.11, 0.04, -0.075, 0.032).C(-0.064, 0.012, -0.064, -0.014, -0.075, -0.034).Z()),
  };
  SOLE.boot = () => SOLE.shoe().scale(0.92, 0.95);
  SOLE.big = () => SOLE.shoe().scale(1.12, 1.1);
  // trails in world metres: X across from the door centre (+ right), Z into the hall. All begin on the sill.
  // Every trail veers LEFT (toward the hooks and the living room), so the floor right of the door stays clean for the Extra's pair.
  const TRAILS = [
    { who: 'deena', kind: 'heel', n: 6, gauge: 0.05, pts: [[0.17, 0.06], [-0.49, 0.2], [-1.35, 0.36], [-2.21, 0.46]] },
    { who: 'angelo', kind: 'shoe', n: 5, gauge: 0.09, pts: [[0.26, 0.06], [-0.04, 0.42], [-0.82, 0.62], [-1.83, 0.86]] },
    { who: 'kay', kind: 'boot', n: 6, gauge: 0.07, pts: [[0.12, 0.05], [-0.1, 0.34], [-0.64, 0.58], [-1.5, 0.74]] },
    { who: 'christof', kind: 'big', n: 5, gauge: 0.1, pts: [[0.24, 0.05], [-0.02, 0.44], [-0.52, 0.84], [-1.12, 1.22]] },
    { who: 'marina', kind: 'heel', n: 6, gauge: 0.05, pts: [[-0.18, 0.05], [-0.5, 0.3], [-1.2, 0.48], [-2.3, 0.56]] },
  ];
  // the Extra's pair: on the clean floor at Scott's RIGHT as he faces the shut door from latchSide, inside the leaf's swing arc
  // (so it can only have been made after the door shut). Nothing leads to it.
  const EXTRA = { X: 0.42, Z: 0.72 };
  const SILL_X = 0.43;   // |X| limit for the sill pairs: the opening is +-0.56 m, a sole is ~0.1 m long, so every sill print sits inside it
  function trailAt(T, u) { const pts = T.pts; const s = clamp(u, 0, 1) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(s)), f = s - i; return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)]; }
  // the prints of a trail: [{X, Z, ang, wet}]
  function trailPrints(T) {
    const out = [];
    for (let i = 0; i < T.n; i++) {
      const u = i / (T.n - 1), a = trailAt(T, Math.max(0, u - 0.02)), b = trailAt(T, Math.min(1, u + 0.02)), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const side = i % 2 ? 1 : -1, c = trailAt(T, u);
      // the first two prints are the pair on the sill: side by side
      if (i < 2) { const c0 = trailAt(T, 0.04); out.push({ X: clamp(c0[0] - Math.sin(ang) * T.gauge * 1.2 * side, -SILL_X, SILL_X), Z: c0[1] + Math.cos(ang) * T.gauge * side + 0.02, ang, wet: 1, u }); continue; }
      out.push({ X: c[0] - Math.sin(ang) * T.gauge * side, Z: c[1] + Math.cos(ang) * T.gauge * side, ang, wet: 1 - 0.62 * u, u });
    }
    return out;
  }
  function drawPrint(g, view, kind, p, alpha, key) {
    if (alpha <= 0.01) return; const proj = PROJ[view]; if (!proj) return;
    const path = M('pr:' + view + ':' + key, () => {
      const sh = SOLE[kind]().transform([0.92, 0, 0, 1.3, 0, 0]).transform([Math.cos(p.ang), Math.sin(p.ang), -Math.sin(p.ang), Math.cos(p.ang), p.X, p.Z]);
      const s2 = S(); sh.polys.forEach(pl => s2.poly(pl.map(([x, z]) => { const q = proj(x, z); return [q[0], q[1]]; }))); return s2.path(0.15, 3);
    });
    g.save(); g.fillStyle = rgba(C.ink, 0.6 * alpha); g.fill(path);
    const tip = proj(p.X + Math.cos(p.ang) * 0.1, p.Z + Math.sin(p.ang) * 0.1), k = tip[2];
    g.globalAlpha = 0.9 * alpha; g.strokeStyle = C.rainSilver; g.lineWidth = 1.6 * Math.max(1, k * 0.8); g.lineCap = 'round';
    g.beginPath(); g.moveTo(tip[0] - 7 * k, tip[1] - 1); g.lineTo(tip[0] + 4 * k, tip[1] - 2.5 * k); g.stroke(); g.restore();
  }
  function drawPrints(g, view, s) {
    const dry = 1 - 0.75 * clamp(s.dry, 0, 1); const n = clamp(s.footprints, 0, TRAILS.length);
    for (let i = 0; i < TRAILS.length && i < n; i++) {
      const T = TRAILS[i], part = clamp(n - i, 0, 1), P = M('tp' + i, () => trailPrints(T));
      P.forEach((p, j) => { const appear = clamp((part * (T.n + 0.6) - j), 0, 1); if (appear <= 0) return; drawPrint(g, view, T.kind, p, p.wet * appear * dry, i + ':' + j); });
    }
    const e = clamp(s.extraPrints, 0, 1); if (e > 0) {
      const X = EXTRA.X, Z = EXTRA.Z, a1 = sm(seg(e, 0, 0.6)) * dry, a2 = sm(seg(e, 0.6, 0.8)) * dry, a3 = sm(seg(e, 0.8, 1)) * dry;
      drawPrint(g, view, 'shoe', { X: X - 0.11, Z, ang: Math.PI * 0.5 }, a1, 'x0');
      drawPrint(g, view, 'shoe', { X: X + 0.11, Z: Z + 0.02, ang: Math.PI * 0.48 }, a1, 'x1');
      drawPrint(g, view, 'shoe', { X: X - 0.1, Z: Z + 0.3, ang: Math.PI * 0.52 }, a2 * 0.95, 'x2');
      drawPrint(g, view, 'shoe', { X: X + 0.12, Z: Z + 0.56, ang: Math.PI * 0.49 }, a3 * 0.9, 'x3');
    }
  }

  // =====================================================================================================
  // VIEW 'hall' — the F03 wide. Back wall plane: floor line BASE, horizon HZ. Door opening DOOR, pendant LAMP.
  // =====================================================================================================
  const HZ = 430, BASE = 872, VPX = 1000, PXM = 338, Z0 = 4.2;
  const DOOR = { x0: 1004, x1: 1384, top: 168, bot: BASE };
  const DCX = (DOOR.x0 + DOOR.x1) / 2, DXM = (DCX - VPX) / PXM, DW = (DOOR.x1 - DOOR.x0) / PXM;   // door centre (m from VP), door width (m)
  const LAMP = { x: 770, y: 214 };
  const SC = { LX: 770, LY: 214, D: 150, K: 0.44 };
  const scallopY = x => SC.LY + SC.K * Math.sqrt((x - SC.LX) * (x - SC.LX) + SC.D * SC.D);
  const FAN = { cx: DCX, by: DOOR.top - 26, rx: (DOOR.x1 - DOOR.x0) / 2, ry: 66 };
  const RAIL = { x0: 470, x1: 770, y: 470 }; const hookX = i => RAIL.x0 + 26 + i * 50;
  const NEW = { x: 330, top: 600 }; const railTop = x => NEW.top - 4 + (NEW.x - x) * 0.8; const stringer = x => railTop(x) + 320;
  const PROJ = {};
  PROJ.hall = (X, Z) => { const k = Z0 / (Z0 - Z); return [VPX + (X + DXM) * PXM * k, HZ + (BASE - HZ) * k, k]; };

  // the leaf: hinge on the right jamb, swings into the hall. u 0 hinge .. 1 free edge, v 0 top .. 1 floor
  const doorAng = d => clamp(d, 0, 1) * Math.PI * 0.75;
  function leafPt(view, d, u, v) {
    const L = LEAF[view], th = doorAng(d); const X = L.hinge - u * L.w * Math.cos(th), Z = u * L.w * Math.sin(th);
    return L.at(X, Z, v);
  }
  const LEAF = {
    hall: { hinge: DW / 2, w: DW, at: (X, Z, v) => { const k = Z0 / (Z0 - Z); return [VPX + (X + DXM) * PXM * k, lerp(HZ + (DOOR.top - HZ) * k, HZ + (BASE - HZ) * k, v), k]; } },
  };

  // ---------- outside, through the opening (static) ----------
  function hallOutside(g) {
    const R = O.rng('f03b');
    g.save(); const clip = new Path2D(); clip.rect(DOOR.x0, DOOR.top - 4, DOOR.x1 - DOOR.x0, DOOR.bot - DOOR.top + 14);
    clip.ellipse(FAN.cx, FAN.by, FAN.rx + 2, FAN.ry + 2, 0, Math.PI, 0); clip.rect(DOOR.x0, FAN.by - 2, DOOR.x1 - DOOR.x0, 40); g.clip(clip);
    g.fillStyle = C.rainSlate; g.fillRect(DOOR.x0 - 10, FAN.by - FAN.ry - 10, DOOR.x1 - DOOR.x0 + 20, DOOR.bot - FAN.by + FAN.ry + 30);
    g.fillStyle = mix(C.rainSlate, C.ink, 0.12); g.fillRect(DOOR.x0 - 10, FAN.by - FAN.ry - 10, DOOR.x1 - DOOR.x0 + 20, FAN.ry + 10);
    const far = S().M(DOOR.x0 - 10, 520).L(1090, 512).L(1090, 470).L(1104, 470).L(1104, 462).L(1126, 462).L(1126, 470).L(1140, 470).L(1140, 506)
      .L(1236, 474).L(1330, 506).L(1400, 500).L(1400, 900).L(DOOR.x0 - 10, 900).Z();
    g.fillStyle = mix(C.rainSlate, C.ink, 0.36); g.fill(far.path(1.0, 4));
    g.fillStyle = mix(C.rainSlate, C.ink, 0.55); [[1040, 548], [1318, 548]].forEach(([x, y]) => g.fillRect(x, y, 34, 48));
    const hedge = S(); for (let i = 0; i < 9; i++) hedge.circle(DOOR.x0 + 8 + i * 46, 700 + (R() - 0.5) * 14, 22 + R() * 12); hedge.rect(DOOR.x0 - 10, 700, 400, 60);
    g.fillStyle = mix(C.rainSlate, C.ink, 0.5); g.fill(hedge.path(1.4, 6));
    g.fillStyle = mix(C.rainSlate, C.ink, 0.62); g.fillRect(DOOR.x0, 758, DOOR.x1 - DOOR.x0, 62);
    g.fillStyle = mix(C.rainSlate, C.ink, 0.3); g.fillRect(DOOR.x0, 756, DOOR.x1 - DOOR.x0, 4);
    // the step: wet stone catching a sliver of the hall's warm spill
    g.fillStyle = C.ink; g.fillRect(DOOR.x0, 820, DOOR.x1 - DOOR.x0, 60);
    g.fillStyle = mix(C.rainSlate, C.ink, 0.25); g.fillRect(DOOR.x0, 818, DOOR.x1 - DOOR.x0, 5);
    g.fillStyle = C.tungstenLow; g.fill(S().poly([[DOOR.x0, 870], [DOOR.x0 + 30, 836], [DOOR.x1, 836], [DOOR.x1, 870]]).path(0.8, 12));
    g.fillStyle = mix(C.tungstenLow, C.tungstenMid, 0.35); g.fill(S().ellipse(1236, 852, 70, 5, 0).path(0.6, 14));   // a puddle holds the light
    g.restore();
  }

  // ---------- the hall itself (static, keyed by how tired the lamp is) ----------
  function hallWall(g, L) {
    const wallPath = new Path2D(); wallPath.rect(0, 0, W, BASE); wallPath.rect(DOOR.x0, DOOR.top, DOOR.x1 - DOOR.x0, DOOR.bot - DOOR.top);
    wallPath.ellipse(FAN.cx, FAN.by, FAN.rx, FAN.ry, 0, Math.PI, 0); wallPath.closePath();
    g.save(); g.clip(wallPath, 'evenodd');
    g.fillStyle = C.ink; g.fillRect(0, 0, W, BASE);
    const arch = (K, off, cx, cy, rx, ry) => { const p = new Path2D(); const pts = [];
      for (let x = cx - rx; x <= cx + rx; x += 4) { const u = (x - cx) / rx, yb = cy + ry * Math.sqrt(Math.max(0, 1 - u * u)); const yt = SC.LY + off + K * Math.sqrt((x - SC.LX) * (x - SC.LX) + SC.D * SC.D); if (yt < yb) pts.push([x, yt, yb]); }
      if (!pts.length) return p; p.moveTo(pts[0][0], pts[0][2]); pts.forEach(q => p.lineTo(q[0], q[1])); for (let i = pts.length - 1; i >= 0; i--) p.lineTo(pts[i][0], pts[i][2]); p.closePath(); return p; };
    const shrink = 1 - 0.1 * L.k;
    [[SC.K, 0, LAMP.x + 90, 500, 1320, 540, L.low], [0.74, 22, LAMP.x + 30, 470, 600 * shrink, 390 * shrink, L.mid], [1.18, 40, LAMP.x + 20, 410, 320 * shrink, 260 * shrink, L.hi]].forEach(([K, off, cx, cy, rx, ry, col], i) => {
      const p = arch(K, off, cx, cy, rx, ry); g.fillStyle = col; g.fill(p); if (i) ditherStroke(g, p, col, 6);
    });
    g.restore();
    // dado rail
    const y = 668; g.fillStyle = C.ink; g.fillRect(0, y, DOOR.x0 - 34, 9); g.fillRect(DOOR.x1 + 30, y, W - DOOR.x1, 9);
    g.fillStyle = L.low; g.fillRect(0, y - 2, DOOR.x0 - 34, 2); g.fillRect(DOOR.x1 + 30, y - 2, 1730 - DOOR.x1 - 30, 2);
    // framed photo
    g.fillStyle = C.ink; g.fill(S().rect(150, 520, 130, 96).path(0.5, 41)); g.fillStyle = L.low; g.fillRect(156, 526, 118, 3);
    // a light switch by the door, and the meter cupboard's edge on the far right wall
    g.fillStyle = C.ink; g.fill(S().rect(926, 590, 26, 40).path(0.3, 43)); g.fillStyle = L.low; g.fillRect(928, 591, 22, 2);
    // coat rail: SIX hooks (the coats are drawn live)
    g.fillStyle = C.ink; g.fill(S().rect(RAIL.x0, RAIL.y - 8, RAIL.x1 - RAIL.x0, 16).path(0.5, 51));
    g.fillStyle = L.hi; g.fillRect(RAIL.x0 + 2, RAIL.y - 8, RAIL.x1 - RAIL.x0 - 4, 2);
    for (let i = 0; i < 6; i++) { const hx = hookX(i); g.fillStyle = C.ink; g.fill(S().capsule(hx, RAIL.y, 5, hx + 3, RAIL.y + 22, 4).add(S().capsule(hx + 3, RAIL.y + 22, 4, hx + 12, RAIL.y + 16, 3)).path(0.3, i)); g.fillStyle = L.mid; g.fillRect(hx + 7, RAIL.y + 14, 4, 2); }
    // fanlight: five panes, glazing bars, hub, arch, transom bar
    g.strokeStyle = C.ink; g.lineWidth = 7; g.lineCap = 'butt';
    for (let i = 1; i < 5; i++) { const a = Math.PI + Math.PI * i / 5; g.beginPath(); g.moveTo(FAN.cx, FAN.by); g.lineTo(FAN.cx + Math.cos(a) * FAN.rx, FAN.by + Math.sin(a) * FAN.ry); g.stroke(); }
    g.fillStyle = C.ink; g.beginPath(); g.ellipse(FAN.cx, FAN.by, 34, 18, 0, Math.PI, 0); g.fill();
    g.lineWidth = 16; g.beginPath(); g.ellipse(FAN.cx, FAN.by, FAN.rx + 8, FAN.ry + 8, 0, Math.PI, 0); g.stroke();
    g.fillRect(DOOR.x0 - 10, FAN.by - 4, FAN.rx * 2 + 20, 34);
    // architrave, lamp-side edge catching a thin warm line
    g.fill(S().rect(DOOR.x0 - 34, DOOR.top - 4, 34, BASE - DOOR.top + 4).path(0.6, 2));
    g.fill(S().rect(DOOR.x1, DOOR.top - 4, 30, BASE - DOOR.top + 4).path(0.6, 3));
    g.fillStyle = L.mid; g.fill(S().poly([[DOOR.x0 - 36, scallopY(DOOR.x0 - 36) + 4], [DOOR.x0 - 31, scallopY(DOOR.x0 - 36) + 4], [DOOR.x0 - 31, BASE - 26], [DOOR.x0 - 36, BASE - 26]]).path(0.3, 5));
    // skirting + sill
    g.fillStyle = C.ink; g.fillRect(0, BASE - 26, DOOR.x0, 26); g.fillRect(DOOR.x1, BASE - 26, W - DOOR.x1, 26);
    g.fillStyle = L.mid; g.fillRect(0, BASE - 27, DOOR.x0 - 36, 2); g.fillStyle = L.low; g.fillRect(DOOR.x1 + 30, BASE - 27, 1724 - DOOR.x1 - 30, 2);
    g.fillStyle = C.ink; g.fill(S().poly([[DOOR.x0 - 18, BASE - 8], [DOOR.x1 + 16, BASE - 8], [DOOR.x1 + 20, BASE + 8], [DOOR.x0 - 22, BASE + 8]]).path(0.5, 2));
    g.fillStyle = L.low; g.fillRect(DOOR.x0 - 18, BASE + 6, DOOR.x1 - DOOR.x0 + 36, 2);
    // floor: the pool, boards in perspective, baluster shadows
    const floorClip = new Path2D(); floorClip.rect(0, BASE + 8, W, H - BASE);
    g.save(); g.clip(floorClip);
    g.fillStyle = C.ink; g.fillRect(0, BASE, W, H - BASE);
    O.lightPool(g, LAMP.x + 60, 950, [{ r: 1000, color: L.low }, { r: 620 * shrink, color: L.mid }, { r: 290 * shrink, color: L.hi }], { sy: 0.2, seed: 7, rough: 2.2 });
    g.strokeStyle = rgba(C.ink, 0.42); g.lineWidth = 2;
    for (let X = -1400; X < 3400; X += 64) { const k1 = 1, k2 = Z0 / (Z0 - 1.6); g.beginPath(); g.moveTo(VPX + (X - VPX) * k1, HZ + (BASE - HZ) * k1); g.lineTo(VPX + (X - VPX) * k2, HZ + (BASE - HZ) * k2); g.stroke(); }
    g.fillStyle = rgba(C.ink, 0.55); const LF = [LAMP.x + 40, 980];
    for (let x = NEW.x - 46; x > -60; x -= 46) {
      const b = [x, Math.min(H - 2, stringer(x))]; const d = norm(b[0] - LF[0], b[1] - LF[1] + 260), n = [-d[1], d[0]], Ls = 300;
      g.fill(S().poly([[b[0] + n[0] * 6, b[1]], [b[0] + d[0] * Ls + n[0] * 16, b[1] + d[1] * Ls], [b[0] + d[0] * Ls - n[0] * 16, b[1] + d[1] * Ls], [b[0] - n[0] * 6, b[1]]]).path(0.8, x | 0));
    }
    // the right-hand wall's foot: the hall turns toward the corridor beyond the frame
    g.restore();
    // the pendant
    g.fillStyle = C.ink; g.fillRect(LAMP.x - 2, 0, 4, LAMP.y - 60);
    const shade = S().M(LAMP.x - 26, LAMP.y - 62).L(LAMP.x + 26, LAMP.y - 62).L(LAMP.x + 80, LAMP.y).L(LAMP.x - 80, LAMP.y).Z();
    g.fillStyle = C.soot2; g.fill(shade.path(0.4, 2));
    g.fillStyle = L.low; g.fill(S().poly([[LAMP.x - 26, LAMP.y - 62], [LAMP.x - 22, LAMP.y - 62], [LAMP.x - 74, LAMP.y - 2], [LAMP.x - 80, LAMP.y]]).path(0.2, 1));
    g.fillStyle = L.hi; g.beginPath(); g.ellipse(LAMP.x, LAMP.y, 77, 8, 0, 0, 7); g.fill();
    g.fillStyle = L.core; g.beginPath(); g.ellipse(LAMP.x, LAMP.y + 1, 30, 4, 0, 0, 7); g.fill();
  }
  // the stairs: dark foreground, countable balusters (front layer)
  function hallStairs(g, L) {
    const stairs = S();
    stairs.poly([[NEW.x + 26, NEW.top - 20], [-80, railTop(-80) - 30], [-80, railTop(-80) + 4], [NEW.x + 26, NEW.top + 14]]);
    stairs.poly([[NEW.x + 18, stringer(NEW.x) - 24], [-80, stringer(-80) - 24], [-80, H + 40], [NEW.x + 18, H + 40]]);
    for (let x = NEW.x - 46; x > -40; x -= 46) stairs.rect(x - 7, railTop(x), 14, stringer(x) - railTop(x));
    stairs.rect(NEW.x - 30, NEW.top, 60, H - NEW.top + 40).add(S().rect(NEW.x - 40, NEW.top - 12, 80, 34)).add(S().ellipse(NEW.x, NEW.top - 26, 30, 22, 0));
    const p = stairs.path(0.9, 8); g.fillStyle = C.ink; g.fill(p); rim(g, p, norm(1, -0.5), 3, L.mid);
  }

  // ---------- coats: hung by the collar loop; rims on the lamp side keep each one countable ----------
  const COAT_ORDER = ['deena', 'angelo', 'kay', 'christof', 'marina', 'scott'];
  function coatShape(id, x, ry) {
    const spec = { deena: [170, 70], angelo: [270, 84], kay: [228, 76], christof: [212, 98], marina: [252, 66], scott: [186, 78] }[id] || [200, 76];
    const [len, w] = spec;
    const sh = S().M(x - 6, ry + 16).L(x + 6, ry + 16).C(x + w * 0.3, ry + 24, x + w * 0.42, ry + 34, x + w * 0.44, ry + 52)
      .L(x + w * 0.4, ry + len * 0.5).L(x + w * 0.52, ry + len).L(x - w * 0.5, ry + len + 4).L(x - w * 0.38, ry + len * 0.5).L(x - w * 0.42, ry + 52)
      .C(x - w * 0.4, ry + 34, x - w * 0.3, ry + 24, x - 6, ry + 16).Z();
    sh.capsule(x - w * 0.47, ry + 50, w * 0.13, x - w * 0.54, ry + len * 0.62, w * 0.1); sh.capsule(x + w * 0.47, ry + 50, w * 0.13, x + w * 0.56, ry + len * 0.6, w * 0.1);
    if (id === 'kay') { sh.ellipse(x - 2, ry + 30, 20, 16, 0); sh.capsule(x + w * 0.42, ry + len * 0.45, 3, x + w * 0.5, ry + len * 0.72, 3); }       // hood bunched, belt end
    if (id === 'christof') sh.ellipse(x, ry + 34, 30, 24, 0);                                                                                       // a big parka hood
    if (id === 'marina') sh.capsule(x + 8, ry + 26, 7, x + 16, ry + len + 40, 6);                                                                     // her scarf, longer than the coat
    if (id === 'scott') sh.ellipse(x - 4, ry + 28, 16, 12, 0);
    if (id === 'angelo') sh.poly([[x - 10, ry + 22], [x - 30, ry + 40], [x - 6, ry + 60]]);                                                           // a flipped lapel
    return sh;
  }
  // the same coat anywhere (in a hand, over an arm): (x, y) = the collar loop it hangs from, s = 1 is the size on the hall hooks
  // (matches a figure scale of ~88), rot = radians about the loop.
  function coatAt(id, x, y, s, rot) { return coatShape(id, 0, -16).scale(s == null ? 1 : s).rotate(rot || 0).translate(x, y); }
  function drawCoatAt(c, id, x, y, o) {
    o = o || {}; const s = o.scale == null ? 1 : o.scale, rot = o.rot || 0, g = c.g; const sh = coatAt(id, x, y, s, rot);
    const ld = o.rimDir || [-1, -0.75];
    O.silhouette(g, sh, { light: { dx: ld[0], dy: ld[1] }, rimColor: o.rimColor || C.tungstenMid, rimW: o.rimW == null ? 2.2 : o.rimW, rough: 1.0, seed: 60 + COAT_ORDER.indexOf(id) });
    const cs = Math.cos(rot), sn = Math.sin(rot), P = (dx, dy) => [x + (dx * cs - dy * sn) * s, y + (dx * sn + dy * cs) * s];
    if (id === 'kay') {   // rain beads on the mac, and (with o.t) its drips
      const rb = O.rng('kaycoat'); g.save(); g.fillStyle = C.rainSilver;
      for (let k = 0; k < 9; k++) { g.globalAlpha = 0.5 + rb() * 0.4; const p = P((rb() - 0.5) * 70, 44 + rb() * 160); g.beginPath(); g.arc(p[0], p[1], (1.2 + rb()) * Math.max(0.7, s), 0, 7); g.fill(); }
      g.restore();
      if (o.t != null && o.drips !== false) drips(g, [P(-30, 214), P(6, 218), P(34, 212)], o.fall == null ? 140 * s : o.fall, o.t, { period: 1.6, r: 1.8 * Math.max(0.7, s), alpha: 0.75 });
    }
    return sh;
  }
  function coatList(s) { if (s.coatList) return s.coatList.slice(0, 6); return COAT_ORDER.slice(0, clamp(Math.round(s.coats), 0, 6)); }
  function drawCoats(c, s, L) {
    const list = coatList(s); if (!list.length) return;
    const x0 = RAIL.x0 - 70, y0 = RAIL.y - 20, w = RAIL.x1 - RAIL.x0 + 140, h = 360;
    const z = zoomOf(c.g); const res = z > 1.12 ? 2 : 1;
    const cv = c.cache('hall:coats:' + list.join(',') + ':' + L.k + '@' + res, g => {
      g.scale(res, res); g.translate(-x0, -y0);
      for (let i = list.length - 1; i >= 0; i--) {   // right to left, so each lamp-side rim lies over its neighbour
        const id = list[i]; if (!id) continue; const p = coatShape(id, hookX(i) + 4, RAIL.y).path(1.0, 60 + i);
        g.fillStyle = C.ink; g.fill(p); rim(g, p, norm(1, -0.7), 2.2, i >= 4 ? L.hi : L.mid, null, 0.95);
        if (id === 'kay') { const rb = O.rng('kaycoat'); g.fillStyle = C.rainSilver; for (let k = 0; k < 9; k++) { g.globalAlpha = 0.5 + rb() * 0.4; g.beginPath(); g.arc(hookX(i) + 4 + (rb() - 0.5) * 70, RAIL.y + 60 + rb() * 160, 1.2 + rb(), 0, 7); g.fill(); } g.globalAlpha = 1; }
      }
    }, w * res, h * res);
    c.g.drawImage(cv, x0, y0, w, h);
  }
  // Kay's coat drips onto the skirting: countable, falling
  function coatDrips(c, t, s) {
    const i = coatList(s).indexOf('kay'); if (i < 0) return; const x = hookX(i) + 4, hem = RAIL.y + 228;
    drips(c.g, [[x - 30, hem + 2], [x + 6, hem + 6], [x + 34, hem]], BASE - 20 - hem, t, { period: 1.6, r: 1.8, alpha: 0.75 });
    c.g.save(); c.g.fillStyle = rgba(C.rainSilver, 0.18); c.g.beginPath(); c.g.ellipse(x + 2, BASE + 14, 46, 4, 0, 0, 7); c.g.fill(); c.g.restore();
  }

  // ---------- the leaf (live: its angle is state) ----------
  function drawLeaf(g, view, d, L, opts) {
    opts = opts || {}; const th = doorAng(d); const P = (u, v) => leafPt(view, d, u, v);
    const facing = th < Math.PI / 2;   // we see the hall face (grazed by the lamp) until it passes 90 degrees
    const leaf = quad(P(0, 0), P(1, 0), P(1, 1), P(0, 1));
    g.fillStyle = C.ink; g.fill(leaf.path(0.6, 5));
    const pan = (u0, v0, u1, v1, col) => quad(P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)).path(0.5, 6);
    g.fillStyle = facing ? mix(C.ink, C.soot, 0.6) : mix(C.ink, C.soot, 0.5);
    const PAN = [[0.16, 0.06, 0.84, 0.42], [0.16, 0.5, 0.84, 0.94]];
    PAN.forEach(([u0, v0, u1, v1]) => g.fill(pan(u0, v0, u1, v1)));
    g.fillStyle = C.ink; PAN.forEach(([u0, v0, u1, v1]) => g.fill(pan(u0 + 0.06, v0 + 0.03, u1 - 0.06, v1 - 0.03)));
    if (facing) {   // moulding tops catch the lamp, the more the leaf faces it
      const k = Math.sin(th * 0.9 + 0.25) * 0.9; g.globalAlpha = clamp(k, 0.25, 1); g.fillStyle = L.low;
      PAN.forEach(([u0, v0, u1, v1]) => g.fill(quad(P(u0 + 0.06, v0 + 0.03), P(u1 - 0.06, v0 + 0.03), P(u1 - 0.06, v0 + 0.036), P(u0 + 0.06, v0 + 0.036)).path(0.2, 7)));
      g.globalAlpha = 1;
    }
    // letter plate
    g.fillStyle = facing ? L.low : mix(C.ink, C.soot, 0.8); g.fill(pan(0.36, 0.455, 0.64, 0.47));
    // the free edge: its thickness catches the lamp while the door is open
    if (th > 0.06) {
      const a = P(1, 0), b = P(1, 1), k = a[2]; const t = 5 * k * Math.min(1, th * 2);
      const dir = th < Math.PI / 2 ? -1 : 1;   // the edge face shows toward the opening, then toward the hall
      g.fillStyle = th < 1.9 ? L.mid : L.low; g.fill(S().poly([[a[0], a[1] + 2], [a[0] + dir * t, a[1] + 2], [b[0] + dir * t, b[1] - 2], [b[0], b[1] - 2]]).path(0.3, 9));
    }
    // knob + rim lock near the free edge
    const kb = P(0.92, 0.5), kk = kb[2]; const box = quad(P(0.86, 0.43), P(0.97, 0.43), P(0.97, 0.49), P(0.86, 0.49));
    g.fillStyle = C.ink; g.fill(box.path(0.3, 8)); g.fillStyle = facing ? L.mid : L.low; g.fill(quad(P(0.86, 0.43), P(0.97, 0.43), P(0.97, 0.434), P(0.86, 0.434)).path(0.1, 8));
    g.fillStyle = C.ink; g.beginPath(); g.arc(kb[0], kb[1], 12 * kk, 0, 7); g.fill();
    g.fillStyle = facing ? L.mid : L.low; g.beginPath(); g.arc(kb[0] - 4 * kk, kb[1] - 4 * kk, 3.6 * kk, 0, 7); g.fill();
  }
  function leafShadow(g, view, d, LF, clipRect, alpha) {
    const th = doorAng(d); if (th < 0.05) return; const a = leafPt(view, d, 0, 1), b = leafPt(view, d, 1, 1);
    const da = norm(a[0] - LF[0], a[1] - LF[1]), db = norm(b[0] - LF[0], b[1] - LF[1]); const Ls = 260 * a[2];
    g.save(); const cp = new Path2D(); cp.rect(...clipRect); g.clip(cp); g.fillStyle = rgba(C.ink, alpha);
    g.fill(S().poly([[a[0], a[1]], [b[0], b[1]], [b[0] + db[0] * Ls * 1.3, b[1] + db[1] * Ls * 1.3], [a[0] + da[0] * Ls, a[1] + da[1] * Ls]]).path(1, 9)); g.restore();
  }

  // ---------- atmosphere ----------
  function motes(g, quadPts, n, t, seed, color, alpha) {
    const r = O.rng(seed); const [A, B, Cc, D] = quadPts; g.save(); g.fillStyle = color;
    for (let i = 0; i < n; i++) {
      let u = r(), v = r(); const ph = r() * 6.28, sz = 0.8 + r() * 1.8, a0 = 0.25 + r() * 0.5;
      u = (u + 0.03 * Math.sin(t * 0.21 + ph)) % 1; v = (v + t * (0.004 + 0.006 * r())) % 1;
      const top = [lerp(A[0], B[0], u), lerp(A[1], B[1], u)], bot = [lerp(D[0], Cc[0], u), lerp(D[1], Cc[1], u)];
      const x = lerp(top[0], bot[0], v), y = lerp(top[1], bot[1], v);
      g.globalAlpha = (alpha || 1) * a0 * (0.6 + 0.4 * Math.sin(t * 1.3 + ph * 3)); g.fillRect(x, y, sz, sz);
    }
    g.restore();
  }

  const HALL = {
    back(c, t, s) {
      const g = c.g, L = lampCols(qT(s.lampTired)), open = clamp(s.door, 0, 1);
      layer(c, 'wall:' + L.k, gg => { hallOutside(gg); hallWall(gg, L); });
      // rain: through the fanlight always, through the opening when the door is open
      const rn = clamp(s.rain, 0, 1);
      if (rn > 0) {
        g.save(); const fp = new Path2D(); fp.ellipse(FAN.cx, FAN.by, FAN.rx - 8, FAN.ry - 6, 0, Math.PI, 0); fp.closePath(); g.clip(fp);
        rainFall(g, DOOR.x0, FAN.by - FAN.ry, FAN.rx * 2, FAN.ry, t, { n: 26 * rn, alpha: 0.4, len: 18, speed: 900, seed: 'fan' }); g.restore();
        if (open > 0.02) {
          rainFall(g, DOOR.x0, DOOR.top, DOOR.x1 - DOOR.x0, 650, t, { n: 120 * rn, alpha: 0.22, len: 26, speed: 1300, seed: 'hfar' });
          rainFall(g, DOOR.x0, DOOR.top, DOOR.x1 - DOOR.x0, 655, t, { n: 46 * rn, alpha: 0.5, len: 36, speed: 1700, seed: 'hmid' });
          drips(g, [[1046, 180], [1150, 182], [1320, 180], [1356, 184]], 630, t, { period: 1.4, r: 1.8, alpha: 0.8 * rn });
        }
      }
      drawPrints(g, 'hall', s);
      leafShadow(g, 'hall', open, [LAMP.x + 40, 980], [0, BASE + 8, W, H - BASE], 0.6);
      drawLeaf(g, 'hall', open, L);
      drawCoats(c, s, L); coatDrips(c, t, s);
      // haze in the lamp's cone, and dust turning in it
      g.save(); const hz = new Path2D(); hz.rect(0, 0, W, H); hz.rect(DOOR.x0, DOOR.top - 100, DOOR.x1 - DOOR.x0, DOOR.bot - DOOR.top + 100); g.clip(hz, 'evenodd');
      const ca = 1 - 0.4 * L.k;
      O.cone(g, [[LAMP.x - 78, LAMP.y], [LAMP.x + 78, LAMP.y], [LAMP.x + 560, 1080], [LAMP.x - 640, 1080]], L.hi, 0.05 * ca);
      O.cone(g, [[LAMP.x - 60, LAMP.y], [LAMP.x + 60, LAMP.y], [LAMP.x + 360, 1080], [LAMP.x - 360, 1080]], L.hi, 0.04 * ca);
      g.restore();
      motes(g, [[LAMP.x - 60, LAMP.y + 20], [LAMP.x + 60, LAMP.y + 20], [LAMP.x + 420, 820], [LAMP.x - 420, 820]], 70, t, 'hd', L.hi, ca);
      c.em.fillStyle = L.hi; c.em.beginPath(); c.em.ellipse(LAMP.x, LAMP.y + 6, 96, 22, 0, 0, 7); c.em.fill();
    },
    front(c, t, s) { const L = lampCols(qT(s.lampTired)); layerR(c, 'stairs:' + L.k, [0, 536, 412, 544], gg => hallStairs(gg, L)); },
  };
  VIEWS.hall = HALL; FIG_K.hall = 86;
  SHADOW.hall = shape => { const bb = shape.bbox(); return shadowM([bb.x + bb.w / 2 - (LAMP.x + 40), (bb.y + bb.h) - 980 - 120], 0.32)(shape); };
  LIGHTS.hall = { x: LAMP.x, y: LAMP.y, color: C.tungsten, rimDir: [-1, -0.75] };
  (() => {
    const F = (X, Z) => { const p = PROJ.hall(X, Z); return [Math.round(p[0]), Math.round(p[1]), +(86 * p[2]).toFixed(1)]; };
    ANCH.hall = {
      pendant: [LAMP.x, LAMP.y],                                   // the light, for rims (H.lights.hall)
      door: { x0: DOOR.x0, x1: DOOR.x1, top: DOOR.top, bot: DOOR.bot, centre: [DCX, BASE] },
      fanlight: [FAN.cx, FAN.by - 30],
      threshold: F(0, 0.03),                                       // [x, y, figure scale]: the sill, inside
      step: F(0.15, -0.04),                                        // outside, on the wet step (Kay in F03)
      step2: F(-0.22, -0.06),                                      // a second place on the step (two arrivals at once)
      inside: F(-0.36, 0.3),                                       // Scott answering the door (F03)
      latchSide: F(-0.5, 0.42),                                    // Scott at the shut door, hand on the knob (H.knob('hall', door))
      mid: F(-1.25, 0.85),                                         // the hall floor under the pendant
      hooks: F(-1.65, 0.45),                                       // in front of the coat rail
      stairs: [430, 1040, 92],                                     // the foot of the stairs (foreground left)
      living: F(-3.6, 0.6),                                        // exit frame left, toward the living room (off frame)
      front: F(-0.6, 2.3),                                         // exit toward camera (off frame)
      extra: F(EXTRA.X, EXTRA.Z),                                  // where the Extra's pair stands: Scott's right as he faces the door. Keep it empty.
      lock: leafPt('hall', 0, 0.92, 0.5).slice(0, 2).map(Math.round),   // the knob / rim lock with the door shut
      rail: { x0: RAIL.x0, x1: RAIL.x1, y: RAIL.y, hooks: [0, 1, 2, 3, 4, 5].map(i => [hookX(i) + 8, RAIL.y + 18]) },
    };
  })();
  CAMS.hall = {
    hall: { x: 960, y: 540, zoom: 1 },
    hall_push: { x: 1000, y: 548, zoom: 1.06 },                    // end of a slow Act 1 push from 'hall'
    hall_door: { x: 1180, y: 560, zoom: 1.4 },                     // the doorway and the step, figures full height
    hall_hooks: { x: 640, y: 600, zoom: 1.6 },                     // the six hooks, countable
    hall_floor: { x: 1020, y: 762, zoom: 1.7 },                    // the wet prints and the sill
    hall_latch: { x: 1150, y: 600, zoom: 1.25 },                   // Scott at the shut door
  };
  SHADOW_CLIP.hall = rectPath(0, BASE + 8, W, H - BASE);

  // =====================================================================================================
  // VIEW 'doorway' — closer, straight on at the open door: the rainSlate night and the step, one arrival at a time.
  // The pendant hangs off frame above, left of the door; its hot disc falls on the wall left of the door, so Scott (inside, at left)
  // stands against it in silhouette, as in the S03 ARRIVALS tile.
  // =====================================================================================================
  const DY = { cx: 1000, sill: 975, pxm: 455, hz: 429, z0: 2.6, top: 29 };
  DY.x0 = DY.cx - DW / 2 * DY.pxm; DY.x1 = DY.cx + DW / 2 * DY.pxm;
  PROJ.doorway = (X, Z) => { const k = DY.z0 / (DY.z0 - Z); return [DY.cx + X * DY.pxm * k, DY.hz + (DY.sill - DY.hz) * k, k]; };
  LEAF.doorway = { hinge: DW / 2, w: DW, at: (X, Z, v) => { const k = DY.z0 / (DY.z0 - Math.min(Z, DY.z0 - 0.2)); return [DY.cx + X * DY.pxm * k, lerp(DY.hz + (DY.top - DY.hz) * k, DY.hz + (DY.sill - DY.hz) * k, v), k]; } };
  const DSC = { LX: 520, LY: -330, D: 180, K: 0.36 };
  function slate(k) { return mix(C.rainSlate, C.ink, k); }
  function doorwayOutside(g) {
    const { x0, x1, top, sill } = DY, w = x1 - x0; const R = O.rng('dwo');
    g.save(); const cp = new Path2D(); cp.rect(x0, top, w, sill - top + 6); g.clip(cp);
    g.fillStyle = slate(0.14); g.fillRect(x0, top, w, sill - top + 6);
    g.fillStyle = C.rainSlate; g.fillRect(x0, 250, w, 500);
    // the terrace across the street: roofline, chimney stacks with pots, dark windows (no warm light outside)
    const far = S().M(x0 - 10, 352).L(820, 346).L(820, 300).L(838, 300).L(838, 288).L(848, 288).L(848, 300).L(862, 300).L(862, 288).L(872, 288).L(872, 300).L(884, 300).L(884, 340)
      .L(1030, 326).L(1100, 350).L(1150, 344).L(1150, 296).L(1166, 296).L(1166, 284).L(1176, 284).L(1176, 296).L(1196, 296).L(1196, 340).L(x1 + 10, 336).L(x1 + 10, 760).L(x0 - 10, 760).Z();
    g.fillStyle = slate(0.36); g.fill(far.path(1.0, 21));
    g.fillStyle = slate(0.55); [[770, 400], [860, 400], [1110, 396], [1200, 396], [770, 490], [1200, 486]].forEach(([x, y]) => g.fill(S().rect(x, y, 30, 44).path(0.4, x)));
    // the street's far kerb catches the sky
    g.fillStyle = slate(0.22); g.fillRect(x0, 586, w, 3);
    // garden: hedge either side of the gate, the low wall and its wet coping, two gate piers
    const hedge = S(); for (let i = 0; i < 12; i++) { const hx = x0 + 6 + i * 44; if (hx > 950 && hx < 1050) continue; hedge.circle(hx, 640 + (R() - 0.5) * 12, 20 + R() * 12); }
    hedge.rect(x0 - 10, 640, 200, 60).rect(1050, 640, x1 - 1040, 60); g.fillStyle = slate(0.5); g.fill(hedge.path(1.4, 22));
    g.fillStyle = slate(0.62); g.fillRect(x0, 690, 952 - x0, 44); g.fillRect(1048, 690, x1 - 1048, 44);
    g.fillStyle = slate(0.3); g.fillRect(x0, 688, 952 - x0, 3); g.fillRect(1048, 688, x1 - 1048, 3);
    g.fillStyle = slate(0.7); g.fill(S().rect(936, 664, 18, 72).rect(1046, 664, 18, 72).path(0.5, 23));
    g.fillStyle = slate(0.32); g.fillRect(934, 662, 22, 3); g.fillRect(1044, 662, 22, 3);
    // ground: dark lawns, the wet path reflecting the sky, the hall's warm light falling out along it
    g.fillStyle = slate(0.78); g.fillRect(x0, 734, w, 240);
    const path = S().poly([[954, 734], [1046, 734], [1170, 906], [850, 906]]); g.fillStyle = slate(0.3); g.fill(path.path(0.8, 24));
    g.fillStyle = mix(slate(0.3), C.tungstenLow, 0.45); g.fill(S().poly([[900, 836], [1110, 836], [1150, 906], [866, 906]]).path(1.2, 25));
    // the step: wet stone with a sliver of warm spill and a puddle that holds the light
    g.fillStyle = C.ink; g.fillRect(x0, 900, w, 80);
    g.fillStyle = slate(0.25); g.fill(S().poly([[x0, 902], [x1, 902], [x1, 908], [x0, 908]]).path(0.5, 26));
    g.fillStyle = C.tungstenLow; g.fill(S().poly([[x0 + 30, 914], [x1 - 6, 914], [x1, 968], [x0, 968]]).path(0.8, 27));
    g.fillStyle = mix(C.tungstenLow, C.tungstenMid, 0.5); g.fill(S().ellipse(1080, 942, 84, 7, 0).path(0.7, 28));
    g.restore();
  }
  function doorwayWall(g, L) {
    const { x0, x1, top, sill } = DY;
    const wallPath = new Path2D(); wallPath.rect(0, 0, W, sill); wallPath.rect(x0, top, x1 - x0, sill - top);
    g.save(); g.clip(wallPath, 'evenodd'); g.fillStyle = C.ink; g.fillRect(0, 0, W, sill);
    const arch = (K, off, cx, cy, rx, ry) => { const p = new Path2D(); const pts = [];
      for (let x = cx - rx; x <= cx + rx; x += 4) { const u = (x - cx) / rx, yb = cy + ry * Math.sqrt(Math.max(0, 1 - u * u)); const yt = DSC.LY + off + K * Math.sqrt((x - DSC.LX) ** 2 + DSC.D * DSC.D); if (yt < yb) pts.push([x, yt, yb]); }
      if (!pts.length) return p; p.moveTo(pts[0][0], pts[0][2]); pts.forEach(q => p.lineTo(q[0], q[1])); for (let i = pts.length - 1; i >= 0; i--) p.lineTo(pts[i][0], pts[i][2]); p.closePath(); return p; };
    const sh = 1 - 0.1 * L.k;
    [[DSC.K, 0, 420, 760, 1560, 780, L.low], [0.5, 22, 470, 380, 800 * sh, 680 * sh, L.mid], [0.64, 44, 500, 250, 470 * sh, 500 * sh, L.hi]].forEach(([K, off, cx, cy, rx, ry, col], i) => {
      const p = arch(K, off, cx, cy, rx, ry); g.fillStyle = col; g.fill(p); if (i) ditherStroke(g, p, col, 6); });
    g.restore();
    // dado rail, skirting, light switch, a framed print
    const dado = sill - 0.9 * DY.pxm; g.fillStyle = C.ink; g.fillRect(0, dado, x0 - 44, 11); g.fillRect(x1 + 40, dado, W - x1, 11);
    g.fillStyle = L.mid; g.fillRect(0, dado - 2, x0 - 44, 2); g.fillStyle = L.low; g.fillRect(x1 + 40, dado - 2, W - x1 - 40, 2);
    g.fillStyle = C.ink; g.fillRect(0, sill - 34, x0, 34); g.fillRect(x1, sill - 34, W - x1, 34); g.fillStyle = L.low; g.fillRect(0, sill - 35, x0 - 44, 2);
    g.fillStyle = C.ink; g.fill(S().rect(626, 470, 34, 52).path(0.3, 31)); g.fillStyle = L.mid; g.fillRect(628, 471, 30, 2);
    g.fillStyle = C.ink; g.fill(S().rect(180, 300, 190, 140).path(0.5, 32)); g.fillStyle = L.hi; g.fillRect(186, 306, 178, 3);
    // architrave: the lamp-side face catches a warm strip; the far one stays dark
    g.fillStyle = C.ink; g.fill(S().rect(x0 - 44, 0, 44, sill).path(0.6, 33)); g.fill(S().rect(x1, 0, 40, sill).path(0.6, 34));
    g.fillStyle = L.mid; g.fill(S().rect(x0 - 46, 60, 6, sill - 96).path(0.3, 35));
    g.fillStyle = C.ink; g.fillRect(x0 - 50, 0, x1 - x0 + 100, top + 2);
    // threshold strip
    g.fillStyle = C.ink; g.fill(S().poly([[x0 - 26, sill - 10], [x1 + 22, sill - 10], [x1 + 30, sill + 12], [x0 - 34, sill + 12]]).path(0.5, 36));
    g.fillStyle = L.low; g.fillRect(x0 - 24, sill + 9, x1 - x0 + 50, 3);
    // floor strip: boards + the edge of the pool
    const fc = new Path2D(); fc.rect(0, sill + 12, W, H - sill); g.save(); g.clip(fc); g.fillStyle = C.ink; g.fillRect(0, sill, W, H - sill);
    O.lightPool(g, 520, 1140, [{ r: 1200, color: L.low }, { r: 760 * sh, color: L.mid }, { r: 380 * sh, color: L.hi }], { sy: 0.16, seed: 37, rough: 2.2 });
    g.strokeStyle = rgba(C.ink, 0.45); g.lineWidth = 2.4;
    for (let i = -30; i < 40; i++) { const X = i * 0.13; const a = PROJ.doorway(X, 0), b = PROJ.doorway(X, 0.9); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    g.restore();
  }
  function doorwayNewel(g, L) {   // foreground: the newel post's cap, left edge
    const p = S().rect(40, 560, 96, 600).add(S().rect(26, 536, 124, 40)).add(S().ellipse(88, 516, 44, 32, 0))
      .add(S().poly([[60, 548], [-40, 470], [-40, 440], [60, 520]])).add(S().rect(-20, 520, 16, 600)).path(0.9, 38);   // handrail rising away to the left, one baluster
    g.fillStyle = C.ink; g.fill(p); rim(g, p, norm(0.6, -1), 3, L.mid);
  }
  // rain splashes on the step: a tick appears and fades in each slot
  function splashes(g, x0, x1, y0, y1, t, n, alpha) {
    g.save(); g.strokeStyle = C.rainSilver; g.lineWidth = 1.2; g.lineCap = 'round';
    for (let i = 0; i < n; i++) { const rate = 7, ph = (i * 0.618) % 1, slot = Math.floor(t * rate + ph), u = t * rate + ph - slot; const r = O.rng(slot * 131 + i * 7);
      const x = lerp(x0, x1, r()), y = lerp(y0, y1, r()), s = 3 + r() * 3; g.globalAlpha = alpha * (1 - u);
      g.beginPath(); g.moveTo(x - s, y - s * 0.9 * u - 1); g.lineTo(x, y); g.lineTo(x + s, y - s * 0.9 * u - 1); g.stroke(); }
    g.restore();
  }
  const DOORWAY = {
    back(c, t, s) {
      const g = c.g, L = lampCols(qT(s.lampTired)), open = clamp(s.door, 0, 1), rn = clamp(s.rain, 0, 1);
      layer(c, 'dw:' + L.k, gg => { doorwayOutside(gg); doorwayWall(gg, L); });
      if (open > 0.02 && rn > 0) {
        const { x0, x1, top } = DY, w = x1 - x0;
        rainFall(g, x0, top, w, 880, t, { n: 170 * rn, alpha: 0.2, len: 24, speed: 1200, seed: 'dfar' });
        rainFall(g, x0, top, w, 900, t, { n: 70 * rn, alpha: 0.42, len: 40, speed: 1700, seed: 'dmid' });
        rainFall(g, x0, top, w, 920, t, { n: 12 * rn, alpha: 0.5, len: 80, speed: 2400, lw: 1.6, seed: 'dnear' });
        drips(g, [[786, 40], [868, 42], [1004, 40], [1122, 41], [1216, 40]], 880, t, { period: 1.25, r: 2.2, alpha: 0.85 * rn });
        splashes(g, x0 + 10, x1 - 10, 912, 962, t, 9 * rn, 0.7);
      }
      drawPrints(g, 'doorway', s);
      leafShadow(g, 'doorway', open, [520, 1400], [0, DY.sill + 12, W, H - DY.sill], 0.6);
      drawLeaf(g, 'doorway', open, L);
      O.cone(g, [[400, -60], [640, -60], [1120, 1080], [-160, 1080]], L.hi, 0.03 * (1 - 0.4 * L.k));
      motes(g, [[380, 0], [660, 0], [1000, 1000], [0, 1000]], 50, t, 'dwd', L.hi, 1 - 0.4 * L.k);
    },
    front(c, t, s) { const L = lampCols(qT(s.lampTired)); layerR(c, 'dwnewel:' + L.k, [0, 476, 430, 604], gg => doorwayNewel(gg, L)); },
  };
  VIEWS.doorway = DOORWAY; FIG_K.doorway = DY.pxm * 0.254;
  SHADOW_CLIP.doorway = (() => { const p = rectPath(0, DY.sill + 12, W, H - DY.sill); p.rect(DY.x0, 908, DY.x1 - DY.x0, 62); return p; })();
  LIGHTS.doorway = { x: 520, y: -330, color: C.tungsten, rimDir: [-0.3, -1] };
  SHADOW.doorway = shape => { const bb = shape.bbox(); return shadowM([bb.x + bb.w / 2 - 520, (bb.y + bb.h) - 1440], 0.22)(shape); };
  (() => {
    const F = (X, Z) => { const p = PROJ.doorway(X, Z); return [Math.round(p[0]), Math.round(p[1]), +(FIG_K.doorway * p[2]).toFixed(1)]; };
    ANCH.doorway = {
      opening: { x0: Math.round(DY.x0), x1: Math.round(DY.x1), top: DY.top, sill: DY.sill },
      step: F(0.04, -0.26), stepL: F(-0.24, -0.3), stepR: F(0.3, -0.3),   // [x, y, scale] on the wet step
      threshold: F(0, 0.04), inside: F(-0.78, 0.36), insideNear: F(-0.5, 0.62), past: F(-1.6, 0.5),   // past = where a guest goes, frame left
      lock: leafPt('doorway', 0, 0.92, 0.5).slice(0, 2).map(Math.round), pendant: [520, -330],
    };
  })();
  CAMS.doorway = { doorway: { x: 960, y: 540, zoom: 1 }, doorway_step: { x: 1000, y: 520, zoom: 1.22 }, doorway_two: { x: 890, y: 560, zoom: 1.08 } };

  // =====================================================================================================
  // VIEW 'porch' — from inside, through the open door: the slot of night between the jambs, the two on the porch.
  // The hall light pours out past the camera onto the wet boards; a cold street lamp far off gives the rain its shine.
  // =====================================================================================================
  const PC = { cx: 960, hz: 500, f: 1249, eye: 1.1, zc: 1.6 };
  PROJ.porch = (X, Z, yy) => { const d = Math.max(0.12, PC.zc - Z); return [PC.cx + PC.f * X / d, PC.hz + PC.f * (PC.eye - (yy || 0)) / d, 1 / d]; };
  const PP = (X, Z, Y) => PROJ.porch(X, Z, Y);
  LEAF.porch = { hinge: DW / 2, w: DW, at: (X, Z, v) => { const a = PP(X, Z, 2.08), b = PP(X, Z, 0); return [a[0], lerp(a[1], b[1], v), a[2]]; } };
  const PJ = { x0: PP(-DW / 2, 0)[0], x1: PP(DW / 2, 0)[0] };
  const LAMPP = PP(-3.1, -13, 4.2);
  function porchOutside(g) {
    const { x0, x1 } = PJ, w = x1 - x0; const R = O.rng('pch');
    g.save(); const cp = new Path2D(); cp.rect(x0, 0, w, H); g.clip(cp);
    g.fillStyle = slate(0.16); g.fillRect(x0, 0, w, H); g.fillStyle = C.rainSlate; g.fillRect(x0, 160, w, 460);
    // the street lamp's cone (cold), drawn into the sky before the houses
    O.cone(g, [[LAMPP[0] - 8, LAMPP[1] + 6], [LAMPP[0] + 8, LAMPP[1] + 6], [LAMPP[0] + 150, 640], [LAMPP[0] - 150, 640]], C.rainSilver, 0.08);
    // terrace opposite
    const yr = PP(0, -24, 8.4)[1], yb = PP(0, -24, -0.4)[1];
    const far = S().M(x0 - 10, yr + 30).L(700, yr + 24).L(700, yr - 20).L(716, yr - 20).L(716, yr - 32).L(726, yr - 32).L(726, yr - 20).L(744, yr - 20).L(744, yr + 20)
      .L(980, yr + 2).L(1060, yr + 26).L(1240, yr + 18).L(1240, yr - 26).L(1262, yr - 26).L(1262, yr - 38).L(1274, yr - 38).L(1274, yr - 26).L(1290, yr - 26).L(1290, yr + 14).L(x1 + 10, yr + 10)
      .L(x1 + 10, yb).L(x0 - 10, yb).Z();
    g.fillStyle = slate(0.4); g.fill(far.path(1.0, 41));
    g.fillStyle = slate(0.58); for (let i = 0; i < 6; i++) { const x = x0 + 60 + i * 150; g.fill(S().rect(x, yr + 70, 34, 50).path(0.4, 42 + i)); g.fill(S().rect(x, yr + 170, 34, 50).path(0.4, 52 + i)); }
    // the street lamp itself: post and head
    g.fillStyle = slate(0.6); g.fillRect(LAMPP[0] - 3, LAMPP[1], 6, yb - LAMPP[1]); g.fillRect(LAMPP[0] - 12, LAMPP[1] - 6, 24, 8);
    g.fillStyle = C.rainSilver; g.beginPath(); g.ellipse(LAMPP[0], LAMPP[1] + 4, 10, 4, 0, 0, 7); g.fill();
    // garden: wall with piers, hedge, the gate gap, the path down to the porch steps
    const yw = PP(0, -9, 0.2)[1], ywt = PP(0, -9, 0.75)[1];
    const hedge = S(); for (let i = 0; i < 16; i++) { const hx = x0 + 10 + i * 60; if (hx > 900 && hx < 1030) continue; hedge.circle(hx, ywt - 26 + (R() - 0.5) * 10, 26 + R() * 14); }
    hedge.rect(x0 - 10, ywt - 26, 920 - x0, 40).rect(1020, ywt - 26, x1 - 1010, 40); g.fillStyle = slate(0.52); g.fill(hedge.path(1.4, 43));
    g.fillStyle = slate(0.64); g.fillRect(x0, ywt, 922 - x0, yw - ywt); g.fillRect(1006, ywt, x1 - 1006, yw - ywt);
    g.fillStyle = slate(0.3); g.fillRect(x0, ywt - 2, 922 - x0, 3); g.fillRect(1006, ywt - 2, x1 - 1006, 3);
    g.fillStyle = slate(0.72); g.fill(S().rect(906, ywt - 30, 18, yw - ywt + 30).rect(1004, ywt - 30, 18, yw - ywt + 30).path(0.4, 44));
    const yp = PP(0, -2.3, -0.4)[1];
    g.fillStyle = slate(0.8); g.fillRect(x0, yw, w, H - yw);
    g.fillStyle = slate(0.32); g.fill(S().poly([[926, yw], [1004, yw], [1160, yp], [770, yp]]).path(0.8, 45));
    // the porch: steps down, the boards, the warm spill out of the door
    const yEdge = PP(0, -1.95, 0)[1];
    g.fillStyle = C.ink; g.fillRect(x0, yp - 6, w, yEdge - yp + 10);
    g.fillStyle = slate(0.35); g.fillRect(x0, yp - 6, w, 3); g.fillStyle = slate(0.4); g.fillRect(x0, (yp + yEdge) / 2, w, 2);
    g.fillStyle = slate(0.55); g.fillRect(x0, yEdge, w, H - yEdge);
    g.strokeStyle = rgba(C.ink, 0.5); g.lineWidth = 2; for (let i = -8; i <= 8; i++) { const a = PP(i * 0.14, -1.95), b = PP(i * 0.14, 0.2); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    const sp = (X0, X1, Zf, col, sd) => { const a = PP(X0, 0.4), b = PP(X1, 0.4), c2 = PP(X1 * 1.5, Zf), d = PP(X0 * 1.5, Zf); g.fillStyle = col; g.fill(S().poly([[a[0], H + 40], [b[0], H + 40], [c2[0], c2[1]], [d[0], d[1]]]).path(1.6, sd)); };
    g.save(); const pf = new Path2D(); pf.rect(x0, yEdge + 2, w, H); g.clip(pf);
    sp(-0.56, 0.56, -2.3, C.tungstenLow, 46); sp(-0.4, 0.4, -1.75, C.tungstenMid, 47); g.restore();
    g.fillStyle = mix(C.tungstenLow, slate(0.3), 0.3); g.fillRect(PP(-0.75, -1.95)[0], yEdge - 1, PP(0.75, -1.95)[0] - PP(-0.75, -1.95)[0], 3);
    // the porch roof: fascia and gutter across the top
    const yf = PP(0, -1.95, 2.3)[1];
    g.fillStyle = C.ink; g.fillRect(x0, 0, w, yf + 4); g.fillStyle = slate(0.4); g.fillRect(x0, yf - 2, w, 3);
    g.restore();
  }
  function porchWall(g, L) {
    const { x0, x1 } = PJ;
    const wp = new Path2D(); wp.rect(0, 0, W, H); wp.rect(x0, 0, x1 - x0, H); g.save(); g.clip(wp, 'evenodd');
    g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
    // the shade's cut-off from behind the camera: warm wedges that run down into the jamb
    const band = (y0, y1, k0, k1, col, sd) => { const p = S().poly([[-40, y0], [x0, y0 + k0], [x0, y1 + k1], [-40, y1]]).path(2, sd); g.fillStyle = col; g.fill(p); return p; };
    band(-120, 1200, 420, 300, mix(L.low, C.ink, 0.3), 48); const pm = band(40, 1200, 380, 120, L.low, 49); ditherStroke(g, pm, L.low, 5);
    const ph2 = band(180, 760, 330, 120, L.mid, 53); ditherStroke(g, ph2, L.mid, 5);
    g.fillStyle = C.ink; g.fill(S().rect(60, 380, 150, 110).path(0.5, 54)); g.fillStyle = L.hi; g.fillRect(66, 386, 138, 3);
    g.restore();
    // the jamb reveals: the near faces of the opening catch the hall light
    g.fillStyle = C.ink; g.fill(S().rect(x0 - 30, 0, 30, H).path(0.6, 49));
    g.fillStyle = L.mid; g.fill(S().rect(x0 - 6, 0, 6, H).path(0.3, 50)); g.fillStyle = L.low; g.fill(S().rect(x1, 0, 7, H).path(0.3, 51));
  }
  const PORCH = {
    back(c, t, s) {
      const g = c.g, L = lampCols(qT(s.lampTired)), rn = clamp(s.rain, 0, 1), open = clamp(s.door, 0, 1);
      layer(c, 'pc:' + L.k, gg => { porchOutside(gg); porchWall(gg, L); });
      const { x0, x1 } = PJ, w = x1 - x0, yf = PP(0, -1.95, 2.3)[1], yEdge = PP(0, -1.95, 0)[1];
      if (rn > 0) {
        rainFall(g, x0, yf, w, yEdge - yf - 20, t, { n: 200 * rn, alpha: 0.2, len: 22, speed: 1100, seed: 'pfar' });
        // brighter in the lamp's cone
        g.save(); const cn = new Path2D(); cn.moveTo(LAMPP[0] - 10, LAMPP[1]); cn.lineTo(LAMPP[0] + 10, LAMPP[1]); cn.lineTo(LAMPP[0] + 160, 660); cn.lineTo(LAMPP[0] - 160, 660); cn.closePath(); g.clip(cn);
        rainFall(g, LAMPP[0] - 170, LAMPP[1], 340, 660 - LAMPP[1], t, { n: 60 * rn, alpha: 0.75, len: 18, speed: 1000, seed: 'plamp' }); g.restore();
        rainFall(g, x0, yf, w, yEdge - yf + 40, t, { n: 70 * rn, alpha: 0.45, len: 44, speed: 1700, seed: 'pmid' });
        const dp = []; for (let i = 0; i < 11; i++) dp.push([x0 + 40 + i * (w - 80) / 10, yf + 4]);
        drips(g, dp, yEdge - yf + 70, t, { period: 1.1, r: 2.4, alpha: 0.9 * rn });
        splashes(g, x0 + 20, x1 - 20, yEdge + 6, yEdge + 40, t, 8 * rn, 0.6);
      }
      if (open < 0.999) drawLeaf(g, 'porch', open, L);
      else {   // the leaf, swung back past the camera's right: a near slab, its mouldings just legible
        g.fillStyle = C.ink; g.fillRect(x1 + 7, 0, W - x1, H); g.fillStyle = L.low; g.fillRect(x1 + 7, 0, 4, H);
        g.fillStyle = mix(C.ink, C.soot, 0.45); g.fillRect(x1 + 120, 0, 330, 420); g.fillRect(x1 + 120, 520, 330, 600);
        g.fillStyle = C.ink; g.fillRect(x1 + 150, 0, 270, 392); g.fillRect(x1 + 150, 548, 270, 600); g.fillStyle = mix(L.low, C.ink, 0.4); g.fillRect(x1 + 150, 548, 270, 3);
      }
      // the street lamp's halation only where the night is actually visible: the slot minus the swinging leaf
      if (open > 0.02) {
        const P = (u, v) => leafPt('porch', open, u, v); const em = c.em; em.save();
        const cp = new Path2D(); cp.rect(x0, 0, w, H);
        if (open < 0.999) { const a = P(0, 0), b = P(1, 0), d = P(1, 1), e = P(0, 1); cp.moveTo(a[0], a[1]); cp.lineTo(b[0], b[1]); cp.lineTo(d[0], d[1]); cp.lineTo(e[0], e[1]); cp.closePath(); }
        em.clip(cp, 'evenodd'); em.globalAlpha = sm(seg(open, 0.02, 0.2)); em.fillStyle = C.rainSilver; em.beginPath(); em.arc(LAMPP[0], LAMPP[1] + 4, 14, 0, 7); em.fill(); em.restore();
      }
    },
  };
  VIEWS.porch = PORCH; FIG_K.porch = PC.f * 0.254;
  LIGHTS.porch = { x: Math.round(LAMPP[0]), y: Math.round(LAMPP[1]), color: C.rainSilver, rimDir: [-0.7, -1], warm: { x: 960, y: 1400, color: C.tungsten } };
  SHADOW.porch = shadowM([1, -0.42], 0.42); SHADOW_CLIP.porch = rectPath(PJ.x0, PP(0, -1.95, 0)[1] + 2, PJ.x1 - PJ.x0, H);
  (() => {
    const F = (X, Z) => { const p = PROJ.porch(X, Z); return [Math.round(p[0]), Math.round(p[1]), +(FIG_K.porch * p[2]).toFixed(1)]; };
    ANCH.porch = {
      slot: { x0: Math.round(PJ.x0), x1: Math.round(PJ.x1) }, porchL: F(-0.42, -1.45), porchR: F(0.4, -1.45),   // [x, y, scale]: the two on the porch
      porchMid: F(0, -1.3), threshold: F(0, -0.05), streetLamp: [Math.round(LAMPP[0]), Math.round(LAMPP[1])], porchEdge: Math.round(PP(0, -1.95, 0)[1]),
      gutter: Math.round(PP(0, -1.95, 2.3)[1]),
    };
  })();
  CAMS.porch = { porch: { x: 960, y: 540, zoom: 1 }, porch_push: { x: 960, y: 560, zoom: 1.08 } };

  // =====================================================================================================
  // VIEW 'lock' — insert: the night latch on the inside of the front door, the keep on the frame, the gap between.
  // The pendant rakes in from the upper left. latch 0..1 closes the gap (cold night in it); jiggle pulls the door against the keep.
  // =====================================================================================================
  const LK = { edge: 760, boxX: 800, boxY: 410, boxW: 330, boxH: 230, knob: [1010, 520], knobR: 54, keepX: 664, gapMax: 74 };
  function lockGap(s) { return (1 - clamp(s.latch, 0, 1)) * LK.gapMax + clamp(s.jiggle || 0, 0, 12); }
  // the pendant's light on the insert: fixed in space, so the door slides under it. Base, mid band, hot band across the keep and the latch.
  // Each band is the shade's straight cut-off (top and bottom edges) closed by an elliptical falloff end, like the hall wall's arches:
  // no square corners in the middle of the door.
  const LKB = {
    mid: { poly: [[300, 60], [2600, 816], [2600, 1489], [300, 760]], ell: [660, 600, 1080, 640, 0.36] },
    hi: { poly: [[300, 300], [2600, 1059], [2600, 1330], [300, 548]], ell: [600, 520, 790, 330, 0.34] },
  };
  function lockBand(g, B, col, sd) {
    const pp = S().poly(B.poly).path(2.4, sd), ep = S().ellipse(B.ell[0], B.ell[1], B.ell[2], B.ell[3], B.ell[4]).path(2.4, sd + 7);
    g.save(); g.clip(ep); g.fillStyle = col; g.fill(pp); ditherStroke(g, pp, col, 6); g.restore();
    g.save(); g.clip(pp); ditherStroke(g, ep, col, 6); g.restore();
  }
  function lockBands(g, L, sd) { lockBand(g, LKB.mid, L.mid, sd); lockBand(g, LKB.hi, L.hi, sd + 1); }
  const lowOf = L => mix(L.low, C.ink, 0.3);
  function lockStatic(g, L) {   // the frame side (fixed): wall, architrave, jamb face, the keep
    g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
    const fr = S().rect(330, -20, LK.edge - 330, H + 40).path(0.6, 61);
    g.save(); g.clip(fr); g.fillStyle = lowOf(L); g.fillRect(0, 0, W, H); lockBands(g, L, 62);
    g.fillStyle = rgba(C.ink, 0.55); g.fillRect(392, 0, 7, H); g.fillRect(470, 0, 4, H); g.fillStyle = rgba(C.ink, 0.8); g.fillRect(LK.edge - 66, 0, 10, H);
    g.restore();
    g.fillStyle = C.ink; g.fillRect(0, 0, 330, H);
    const kp = S().rect(LK.keepX, 452, LK.edge - LK.keepX + 6, 150).path(0.4, 64);
    g.save(); g.fillStyle = rgba(C.ink, 0.6); g.translate(14, 16); g.fill(kp); g.restore();
    g.fillStyle = C.ink; g.fill(kp); rim(g, kp, norm(-1, -1), 3, L.hi);
    g.fillStyle = C.soot; g.fillRect(LK.keepX + 14, 470, 6, 6); g.fillRect(LK.keepX + 14, 578, 6, 6);
    g.fillStyle = mix(C.ink, C.soot, 0.5); g.fillRect(LK.edge - 8, 492, 12, 70);
  }
  function lockFace(g, L) {   // the door's face (moves with the gap), no light: the bands are laid on live
    g.fillStyle = lowOf(L); g.fillRect(LK.edge, -20, W - LK.edge + 80, H + 40);
  }
  function lockDoor(g, L) {   // details on the door: the raised panel, its edge, the latch body
    g.fillStyle = rgba(C.ink, 0.6); g.fill(S().rect(1420, 120, 30, 900).path(0.4, 68)); g.fill(S().rect(1420, 120, 560, 22).path(0.4, 69));
    g.fillStyle = L.mid; g.globalAlpha = 0.7; g.fillRect(1452, 144, 540, 3); g.fillRect(1452, 144, 3, 880); g.globalAlpha = 1;
    g.fillStyle = rgba(C.ink, 0.85); g.fillRect(LK.edge, -20, 9, H + 40);
    const box = S().M(LK.boxX, LK.boxY + 10).Q(LK.boxX, LK.boxY, LK.boxX + 10, LK.boxY).L(LK.boxX + LK.boxW - 10, LK.boxY).Q(LK.boxX + LK.boxW, LK.boxY, LK.boxX + LK.boxW, LK.boxY + 10)
      .L(LK.boxX + LK.boxW, LK.boxY + LK.boxH - 10).Q(LK.boxX + LK.boxW, LK.boxY + LK.boxH, LK.boxX + LK.boxW - 10, LK.boxY + LK.boxH).L(LK.boxX + 10, LK.boxY + LK.boxH)
      .Q(LK.boxX, LK.boxY + LK.boxH, LK.boxX, LK.boxY + LK.boxH - 10).Z().path(0.4, 70);
    g.save(); g.fillStyle = rgba(C.ink, 0.6); g.translate(16, 18); g.fill(box); g.restore();
    g.fillStyle = C.ink; g.fill(box); rim(g, box, norm(-1, -1.2), 3.5, L.hi);
    g.fillStyle = mix(C.ink, C.soot, 0.7); g.fillRect(LK.boxX + 26, LK.boxY + 26, 4, 4); g.fillRect(LK.boxX + LK.boxW - 30, LK.boxY + LK.boxH - 30, 4, 4);
    g.fillStyle = mix(C.ink, C.soot, 0.9); g.fill(S().rect(LK.boxX + LK.boxW - 70, LK.boxY + LK.boxH - 66, 22, 50).path(0.2, 71));
  }
  function lockKnob(g, L) {
    const [kx, ky] = LK.knob, r = LK.knobR;
    const kn = S().ellipse(kx - 6, ky - 4, r, r * 0.96, 0).path(0.5, 73); g.save(); g.fillStyle = rgba(C.ink, 0.6); g.translate(18, 22); g.fill(kn); g.restore();
    g.fillStyle = C.ink; g.fill(kn); rim(g, kn, norm(-1, -1), 12, L.mid, null, 0.45); rim(g, kn, norm(-1, -1), 4, L.hi);
    g.fillStyle = L.core; g.beginPath(); g.ellipse(kx - 30, ky - 30, 7, 4, -0.7, 0, 7); g.fill();
    g.strokeStyle = rgba(C.ink, 0.8); g.lineWidth = 2; for (let i = 0; i < 18; i++) { const a = Math.PI * 1.02 + i * 0.07; g.beginPath(); g.moveTo(kx - 6 + Math.cos(a) * (r - 2), ky - 4 + Math.sin(a) * (r - 2)); g.lineTo(kx - 6 + Math.cos(a) * (r - 9), ky - 4 + Math.sin(a) * (r - 9)); g.stroke(); }
  }
  // the snib and the knob ride on the door (live: the snib moves; the knob layer is small)
  function lockLive(c, s, L, gap) {
    const g = c.g; g.save(); g.translate(gap, 0);
    const sy = LK.boxY + LK.boxH - 62 + clamp(s.snib, 0, 1) * 26; const sn = S().rect(LK.boxX + LK.boxW - 68, sy, 18, 20).path(0.2, 76);
    g.fillStyle = C.ink; g.fill(sn); g.fillStyle = L.mid; g.fillRect(LK.boxX + LK.boxW - 68, sy, 18, 2);
    layerR(c, 'lkk:' + L.k, [LK.knob[0] - 90, LK.knob[1] - 90, 200, 200], gg => lockKnob(gg, L));
    g.restore();
    c.em.save(); c.em.fillStyle = L.hi; c.em.globalAlpha = 0.4; c.em.beginPath(); c.em.arc(LK.knob[0] - 30 + gap, LK.knob[1] - 30, 18, 0, 7); c.em.fill(); c.em.restore();
  }
  const LOCK = {
    back(c, t, s) {
      const g = c.g, L = lampCols(qT(s.lampTired)), gap = lockGap(s);
      if (gap <= 0.5) {   // shut: frame, door face, the fixed bands and the latch body all in one cached layer
        layer(c, 'lkshut:' + L.k, gg => { lockStatic(gg, L); lockFace(gg, L); gg.save(); gg.beginPath(); gg.rect(LK.edge, 0, W, H); gg.clip(); lockBands(gg, L, 66); gg.restore(); lockDoor(gg, L); });
        lockLive(c, s, L, 0); return;
      }
      layer(c, 'lkf:' + L.k, gg => lockStatic(gg, L));
      if (gap > 0.5) {
        g.save(); g.beginPath(); g.rect(LK.edge, 0, gap + 2, H); g.clip(); g.fillStyle = C.rainSlate; g.fillRect(LK.edge, 0, gap + 2, H);
        g.fillStyle = mix(C.rainSlate, C.ink, 0.4); g.fillRect(LK.edge, 640, gap + 2, 440);
        rainFall(g, LK.edge, 0, gap + 2, H, t, { n: Math.ceil(gap * 0.6) * clamp(s.rain, 0, 1), alpha: 0.5, len: 30, speed: 1500, seed: 'lkgap' });
        g.restore();
        g.fillStyle = C.ink; g.fill(S().poly([[LK.edge + gap - 2, 500], [LK.edge + gap - 46, 500], [LK.edge + gap - 64, 520], [LK.edge + gap - 64, 552], [LK.edge + gap - 2, 552]]).path(0.2, 75));
        g.fillStyle = L.mid; g.fillRect(LK.edge + gap - 62, 500, 58, 2);
      }
      g.save(); g.translate(gap, 0);
      layerR(c, 'lkface:' + L.k, [LK.edge - 4, 0, W - LK.edge + 4, H], gg => lockFace(gg, L));
      g.restore();
      // the light stays put while the door slides under it
      g.save(); g.beginPath(); g.rect(LK.edge + gap, 0, W, H); g.clip(); layerR(c, 'lkbands:' + L.k, [LK.edge - 4, 0, W - LK.edge + 4, H], gg => lockBands(gg, L, 66)); g.restore();
      g.save(); g.translate(gap, 0);
      layerR(c, 'lkd:' + L.k, [LK.edge - 60, 0, W - LK.edge + 60, H], gg => lockDoor(gg, L));
      g.restore();
      lockLive(c, s, L, gap);
    },
  };
  VIEWS.lock = LOCK;
  LIGHTS.lock = { x: -400, y: -500, color: C.tungsten, rimDir: [-1, -1] };
  ANCH.lock = {
    knob: LK.knob.slice(), knobGrip: [LK.knob[0] + 10, LK.knob[1] + 20],      // where Scott's fingers close on the knob (add the gap: H.anchors.lock.gapAt(state))
    snib: [LK.boxX + LK.boxW - 59, LK.boxY + LK.boxH - 52], keep: [LK.keepX + 40, 527], edge: LK.edge, box: { x: LK.boxX, y: LK.boxY, w: LK.boxW, h: LK.boxH },
    handIn: [1980, 760], handRest: [1180, 640], handAway: [1700, 980],        // the hand arrives from frame right, rests, leaves down-right
    gapAt: s => lockGap(stOf(s)),
  };
  CAMS.lock = { lock: { x: 960, y: 540, zoom: 1 }, lock_tight: { x: 900, y: 520, zoom: 1.35 } };

  // =====================================================================================================
  // VIEW 'handle' — insert: the bathroom door's lever, its keyhole, the line of light under the door.
  // Lit from below and within: when underDoor is on, the keyhole and the latch-side gap glow, the lever's undersides catch it.
  // Screen direction matches 'corridor': facing the door from the corridor, the latch edge is on the LEFT (the near jamb) and the
  // hinge on the right, so the lever points RIGHT. The drawing below is authored the other way round and mirrored as a whole (MIR).
  // =====================================================================================================
  const MIR = g => { g.translate(W, 0); g.scale(-1, 1); };
  const mx = p => [W - p[0], p[1]];
  const HD = { edge: 1392, sill: 902, pivot: [1250, 452], tip: [960, 470], plate: [1214, 360, 72, 300], key: [1250, 590] };
  const UD = (k) => mix(C.ink, C.underDoor, k);
  function handleDoor(g, s, on) {
    g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
    // the door face: barely there, soot; the raised panels' lower edges catch light from below (inverted, wrong)
    g.fillStyle = mix(C.ink, C.soot, 0.75); g.fillRect(0, 0, HD.edge, HD.sill);
    const panel = (x, y, w, h, sd) => { g.fillStyle = mix(C.ink, C.soot, 0.45); g.fill(S().rect(x, y, w, h).path(0.5, sd));
      g.fillStyle = rgba(C.ink, 0.8); g.fillRect(x, y, w, 10); g.fillRect(x, y, 10, h);
      if (on > 0) { g.fillStyle = UD(0.26 * on); g.fillRect(x + 10, y + h - 3, w - 10, 3); g.fillStyle = UD(0.1 * on); g.fillRect(x + w - 3, y + 10, 3, h - 10); } };
    panel(150, -60, 820, 380, 81); panel(150, 420, 820, 400, 82);
    // the stile the lock sits in, its edge, the architrave, the corridor wall beyond
    g.fillStyle = C.ink; g.fillRect(HD.edge, 0, W - HD.edge, H);
    g.fillStyle = mix(C.ink, C.soot, 0.55); g.fillRect(HD.edge + 16, 0, 150, HD.sill + 30);
    g.fillStyle = rgba(C.ink, 0.7); g.fillRect(HD.edge + 60, 0, 6, HD.sill + 30); g.fillRect(HD.edge + 112, 0, 4, HD.sill + 30);
    g.fillStyle = mix(C.ink, C.soot, 0.3); g.fillRect(HD.edge + 166, 0, W, H);
    // the floor: boards running toward us
    g.fillStyle = mix(C.ink, C.soot, 0.5); g.fillRect(0, HD.sill + 8, W, H - HD.sill);
    g.strokeStyle = rgba(C.ink, 0.8); g.lineWidth = 3; for (let i = -6; i < 14; i++) { g.beginPath(); g.moveTo(140 * i + 40, HD.sill + 8); g.lineTo(140 * i * 1.5 - 200, H); g.stroke(); }
    g.fillStyle = C.ink; g.fillRect(0, HD.sill - 4, HD.edge + 16, 12);   // the door's bottom rail shadow
  }
  function handleLever(g, s, on) {
    const [px, py] = HD.pivot, [tx, ty] = HD.tip, P = HD.plate;
    const plate = S().rect(P[0], P[1], P[2], P[3]).path(0.4, 83); g.fillStyle = C.ink; g.fill(plate);
    const lever = S().capsule(px, py, 30, px - 60, py + 4, 22).add(S().capsule(px - 60, py + 4, 20, tx + 30, ty, 17)).add(S().ellipse(tx + 8, ty + 4, 30, 21, 0.12)).path(0.6, 84);
    g.save(); g.fillStyle = rgba(C.ink, 0.55); g.translate(10, -14); g.fill(lever); g.restore();   // its shadow, thrown upward by light from below
    const rose = S().circle(px, py, 40).path(0.4, 85); const all = new Path2D(); all.addPath(lever); all.addPath(rose);
    g.fillStyle = C.ink; g.fill(all);
    if (on > 0) { rim(g, plate, norm(0, 1), 3, UD(0.4 * on)); rim(g, all, norm(0.15, 1), 3, UD(0.6 * on)); }
    // the keyhole escutcheon
    const [kx, ky] = HD.key; g.fillStyle = C.ink; g.fill(S().ellipse(kx, ky, 26, 32, 0).path(0.3, 86));
  }
  const HANDLE = {
    back(c, t, s) {
      const g = c.g, on = clamp(s.underDoor, 0, 1), qo = Math.round(on * 4) / 4;
      layer(c, 'hdm:' + qo, gg => { MIR(gg); handleDoor(gg, s, qo); handleLever(gg, s, qo); });
      const [kx, ky] = HD.key; g.save(); MIR(g); c.em.save(); MIR(c.em);
      if (on > 0) {
        // the keyhole: light from inside
        const kh = S().circle(kx, ky - 8, 9).add(S().poly([[kx - 5, ky - 4], [kx + 5, ky - 4], [kx + 8, ky + 20], [kx - 8, ky + 20]])).path(0.2, 87);
        g.save(); g.globalAlpha = on; g.fillStyle = C.underDoor; g.fill(kh); g.restore();
        c.em.save(); c.em.globalAlpha = on; c.em.fillStyle = C.underDoor; c.em.fill(kh); c.em.beginPath(); c.em.arc(kx, ky, 16, 0, 7); c.em.fill(); c.em.restore();
        // the line under the door, and its spill fanning out over the boards; the latch-side gap, fainter
        g.save(); g.globalAlpha = on;
        const sp1 = S().poly([[0, HD.sill + 8], [HD.edge, HD.sill + 8], [HD.edge + 46, HD.sill + 96], [-60, HD.sill + 96]]).path(2.4, 88); g.fillStyle = UD(0.2); g.fill(sp1);
        const sp2 = S().poly([[0, HD.sill + 8], [HD.edge, HD.sill + 8], [HD.edge + 16, HD.sill + 34], [-20, HD.sill + 34]]).path(1.6, 89); g.fillStyle = UD(0.42); g.fill(sp2); ditherStroke(g, sp2, UD(0.42), 4);
        g.strokeStyle = rgba(C.ink, 0.7); g.lineWidth = 3; for (let i = -6; i < 14; i++) { g.beginPath(); g.moveTo(140 * i + 40, HD.sill + 8); g.lineTo(140 * i * 1.5 - 200, H); g.stroke(); }
        g.fillStyle = C.underDoor; g.fillRect(0, HD.sill + 2, HD.edge + 6, 7);
        g.fillStyle = UD(0.7); g.fillRect(HD.edge + 2, 0, 3, HD.sill + 4);
        g.restore();
        c.em.save(); c.em.globalAlpha = on; c.em.fillStyle = C.underDoor; c.em.fillRect(0, HD.sill, HD.edge, 12); c.em.globalAlpha = 0.4 * on; c.em.fillRect(HD.edge, 0, 6, HD.sill); c.em.restore();
      } else { g.fillStyle = C.ink; g.beginPath(); g.ellipse(kx, ky, 10, 16, 0, 0, 7); g.fill(); }
      c.em.restore(); g.restore();
    },
  };
  VIEWS.handle = HANDLE;
  LIGHTS.handle = { x: W - 700, y: 1400, color: C.underDoor, rimDir: [-0.1, 1] };
  ANCH.handle = {
    lever: mx([1080, 466]), leverTip: mx(HD.tip), pivot: mx(HD.pivot), keyhole: mx(HD.key), underDoorY: HD.sill + 5, edge: W - HD.edge,
    // the hand rises from frame bottom RIGHT (Scott stands just past the latch, toward the hinge) toward the lever's free end,
    // stops at reachStop (a few cm short); touch = on it
    handIn: mx([640, 1160]), reachStop: mx([1004, 548]), touch: mx([1010, 492]),
  };
  // handle_tight keeps the under-door line (y 907) inside a 2.00 letterbox
  CAMS.handle = { handle: { x: 960, y: 540, zoom: 1 }, handle_tight: { x: 840, y: 600, zoom: 1.4 } };

  // =====================================================================================================
  // VIEW 'corridor' — the hallway to the bathroom, one-point, ~85% ink. We stand in the living-room doorway (its jamb is the
  // foreground at right). The bathroom door is on the left wall with its line of light; the kitchen glows at the far end.
  // World: X across (left wall -1.9, right wall +0.35), Y up from the floor, Z away from camera (far wall 6.5).
  // Layers: a static base (lamp-keyed), two cached overlays laid on at the live strength of `spill` and `endLight` (so both tween
  // without pops or cache churn), and live pieces: the kitchen doorway's nested slab, the bathroom door, its light, the afterimage.
  // =====================================================================================================
  const CR = { vx: 1150, vy: 500, f: 1100, eye: 1.2, xl: -1.9, xr: 0.35, ceil: 2.6, zf: 6.5, z0: 0.25 };
  const CP = (X, Y, Z) => { const z = Math.max(0.05, Z); return [CR.vx + CR.f * X / z, CR.vy - CR.f * (Y - CR.eye) / z]; };
  PROJ.corridor = (X, Z) => { const p = CP(X, 0, Z); return [p[0], p[1], 1 / Math.max(0.05, Z)]; };
  const BD = { z0: 2.75, z1: 3.65, h: 2.05, w: 0.9, handle: [1.0, 2.86] };  // bathroom door on the left wall (latch at the near jamb z0, hinge at z1)
  const BS = { x: -3.1, y: 2.25, z: 2.7 };                                  // the bathroom's bulb, 1.2 m inside: its light through the open door
  const KD = { x0: -1.45, x1: -0.55, h: 2.05 };                            // kitchen doorway in the far wall
  const DADO = 0.9;
  const cq = (pts, sd, r) => S().poly(pts.map(p => CP(p[0], p[1], p[2]))).path(r == null ? 0.8 : r, sd || 1);
  const qcol = (k, base) => mix(C.ink, base, k);
  // the kitchen doorway on screen, and its nested slab (S03 HALLWAY tile: hoodLow doorway, hoodMid inset, hot pale core to the floor)
  function kitchenRects() {
    const a = CP(KD.x0, KD.h, CR.zf), b = CP(KD.x1, 0, CR.zf), w = b[0] - a[0], h = b[1] - a[1];
    return { door: [a[0], a[1], w, h], mid: [a[0] + w * 0.164, a[1] + h * 0.08, w * 0.672, h * 0.92], core: [a[0] + w * 0.29, a[1] + h * 0.2, w * 0.42, h * 0.8] };
  }
  // the right wall's furniture (also redrawn over the bathroom's light, so it stands dark against the slab)
  function rightWallThings(g, L) {
    const { xr } = CR, x = xr - 0.01;
    g.fillStyle = C.ink; g.fill(cq([[xr - 0.005, DADO - 0.03, CR.z0], [xr - 0.005, DADO + 0.02, CR.z0], [xr - 0.005, DADO + 0.02, CR.zf], [xr - 0.005, DADO - 0.03, CR.zf]], 123, 0.3));   // the dado rail
    g.fillStyle = mix(C.ink, C.soot2, 0.8); g.fill(cq([[xr - 0.005, DADO + 0.02, CR.z0], [xr - 0.005, DADO + 0.03, CR.z0], [xr - 0.005, DADO + 0.03, CR.zf], [xr - 0.005, DADO + 0.02, CR.zf]], 124, 0.1));
    g.fillStyle = C.ink;
    [[1.3, 1.9, 1.2, 1.75], [3.1, 3.6, 1.25, 1.7]].forEach(([za, zb, ya, yb], i) => g.fill(cq([[x, ya, za], [x, yb, za], [x, yb, zb], [x, ya, zb]], 130 + i, 0.4)));
    // the radiator under the first frame: nine countable fins
    g.fill(cq([[x, 0.2, 1.42], [x, 0.74, 1.42], [x, 0.74, 2.12], [x, 0.2, 2.12]], 135, 0.3));
    g.fillStyle = mix(C.ink, C.soot, 0.55); for (let i = 0; i < 9; i++) { const z = 1.47 + i * 0.075; g.fill(cq([[x - 0.002, 0.26, z], [x - 0.002, 0.68, z], [x - 0.002, 0.68, z + 0.03], [x - 0.002, 0.26, z + 0.03]], 136 + i, 0.15)); }
    // the switch by the living-room door
    g.fillStyle = C.ink; g.fill(cq([[x, 1.18, 0.92], [x, 1.34, 0.92], [x, 1.34, 1.02], [x, 1.18, 1.02]], 146, 0.2));
  }
  function corridorStatic(g, L) {
    const { xl, xr, ceil, zf, z0 } = CR;
    g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
    // planes
    g.fillStyle = mix(C.ink, C.soot, 0.85); g.fill(cq([[xl, 0, z0], [xl, ceil, z0], [xl, ceil, zf], [xl, 0, zf]], 101));            // left wall
    g.fillStyle = mix(C.ink, C.soot, 0.45); g.fill(cq([[xr, 0, z0], [xr, ceil, z0], [xr, ceil, zf], [xr, 0, zf]], 102));            // right wall
    g.fillStyle = mix(C.ink, C.soot, 0.6); g.fill(cq([[xl, 0, z0], [xr, 0, z0], [xr, 0, zf], [xl, 0, zf]], 103));                   // floor
    g.fillStyle = C.ink; g.fill(cq([[xl, ceil, z0], [xr, ceil, z0], [xr, ceil, zf], [xl, ceil, zf]], 104));                         // ceiling
    g.fillStyle = mix(C.ink, C.soot, 0.7); g.fill(cq([[xl, 0, zf], [xl, ceil, zf], [xr, ceil, zf], [xr, 0, zf]], 105, 0.4));         // far wall
    // floorboards and the runner with its countable stripes
    g.strokeStyle = rgba(C.ink, 0.55); g.lineWidth = 2;
    for (let X = xl + 0.14; X < xr; X += 0.14) { const a = CP(X, 0, z0), b = CP(X, 0, zf); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    g.fillStyle = rgba(C.ink, 0.38); g.fill(cq([[-1.3, 0, 0.6], [-0.45, 0, 0.6], [-0.45, 0, 6.2], [-1.3, 0, 6.2]], 109, 0.6));
    g.fillStyle = mix(C.ink, C.soot, 0.9);
    for (let z = 1.0; z < 6.2; z += 0.55) g.fill(cq([[-1.3, 0, z], [-0.45, 0, z], [-0.45, 0, z + 0.09], [-1.3, 0, z + 0.09]], 110 + Math.round(z * 10), 0.3));
    // skirting and the dado rail on both walls (perspective lines into the vanishing point; the left one breaks for the bathroom door)
    g.fillStyle = C.ink; g.fill(cq([[xl, 0, z0], [xl, 0.14, z0], [xl, 0.14, zf], [xl, 0, zf]], 120, 0.4)); g.fill(cq([[xr, 0, z0], [xr, 0.14, z0], [xr, 0.14, zf], [xr, 0, zf]], 121, 0.4));
    const rail = (X, za, zb, sd) => { g.fillStyle = C.ink; g.fill(cq([[X, DADO - 0.03, za], [X, DADO + 0.02, za], [X, DADO + 0.02, zb], [X, DADO - 0.03, zb]], sd, 0.3));
      g.fillStyle = mix(C.ink, C.soot2, 0.8); g.fill(cq([[X, DADO + 0.02, za], [X, DADO + 0.03, za], [X, DADO + 0.03, zb], [X, DADO + 0.02, zb]], sd + 1, 0.1)); };
    rail(xl + 0.005, z0, BD.z0 - 0.1, 117); rail(xl + 0.005, BD.z1 + 0.1, zf, 119);
    // the kitchen doorway in the far wall: dark until endLight lays its slab in (live)
    g.fillStyle = C.ink; g.fill(cq([[KD.x0, 0, zf], [KD.x0, KD.h, zf], [KD.x1, KD.h, zf], [KD.x1, 0, zf]], 122, 0.4));
    g.fill(cq([[KD.x0 - 0.08, 0, zf - 0.01], [KD.x0 - 0.08, KD.h + 0.08, zf - 0.01], [KD.x1 + 0.08, KD.h + 0.08, zf - 0.01], [KD.x1 + 0.08, 0, zf - 0.01], [KD.x1, 0, zf - 0.01], [KD.x1, KD.h, zf - 0.01], [KD.x0, KD.h, zf - 0.01], [KD.x0, 0, zf - 0.01]], 129, 0.3));
    rightWallThings(g, L);
    // the corridor's own pendant: dead, a small shade hanging in the dark
    const pc = CP(-0.75, ceil, 3.4), ps = CP(-0.75, 2.2, 3.4); g.fillStyle = C.ink; g.fillRect(pc[0] - 1.5, pc[1], 3, ps[1] - pc[1]);
    g.fill(S().poly([[ps[0] - 10, ps[1]], [ps[0] + 10, ps[1]], [ps[0] + 30, ps[1] + 26], [ps[0] - 30, ps[1] + 26]]).path(0.3, 132));
    // the bathroom door's architrave (the leaf is live)
    const a0 = BD.z0 - 0.09, a1 = BD.z1 + 0.09;
    g.fillStyle = C.ink; g.fill(cq([[xl + 0.01, 0, a0], [xl + 0.01, BD.h + 0.09, a0], [xl + 0.01, BD.h + 0.09, a1], [xl + 0.01, 0, a1]], 133, 0.4));
    g.fillStyle = mix(C.ink, C.soot, 0.35); g.fill(cq([[xl + 0.012, BD.h + 0.07, a0 + 0.02], [xl + 0.012, BD.h + 0.09, a0 + 0.02], [xl + 0.012, BD.h + 0.09, a1 - 0.02], [xl + 0.012, BD.h + 0.07, a1 - 0.02]], 134, 0.2));
  }
  // overlay: the living room's warm light falling in from behind us (drawn at alpha = spill). Region: the near floor.
  const SPILL_R = [0, 836, W, H - 836];
  function corridorSpill(g, L) {
    const col = mix(L.low, C.ink, 0.42);
    const fl = cq([[-1.62, 0, 0.3], [0.3, 0, 0.3], [-0.02, 0, 3.75], [-1.38, 0, 3.32]], 106, 2.4); g.fillStyle = col; g.fill(fl); ditherStroke(g, fl, col, 4);
    g.save(); g.clip(fl);
    g.strokeStyle = rgba(C.ink, 0.55); g.lineWidth = 2;
    for (let X = CR.xl + 0.14; X < CR.xr; X += 0.14) { const a = CP(X, 0, CR.z0), b = CP(X, 0, CR.zf); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    g.fillStyle = rgba(C.ink, 0.38); g.fill(cq([[-1.3, 0, 0.6], [-0.45, 0, 0.6], [-0.45, 0, 6.2], [-1.3, 0, 6.2]], 109, 0.6));
    g.fillStyle = mix(L.low, C.ink, 0.2); for (let z = 1.0; z < 3.3; z += 0.55) g.fill(cq([[-1.3, 0, z], [-0.45, 0, z], [-0.45, 0, z + 0.09], [-1.3, 0, z + 0.09]], 110 + Math.round(z * 10), 0.3));
    g.restore();
  }
  // overlay: the kitchen's glow reaching the last metres of the corridor (drawn at alpha = endLight). Region: the far end + the frames.
  const END_R = [660, 120, 720, 760];
  function corridorEnd(g) {
    const { xl, xr, ceil, zf } = CR;
    g.save(); g.globalAlpha = 0.9; g.fillStyle = mix(C.ink, C.hoodLow, 0.75);
    g.fill(cq([[xl, 0, zf - 1.6], [xl, ceil * 0.8, zf - 0.6], [xl, ceil * 0.8, zf], [xl, 0, zf]], 126, 1.5)); g.fill(cq([[xr, 0, zf - 1.2], [xr, ceil * 0.8, zf - 0.4], [xr, ceil * 0.8, zf], [xr, 0, zf]], 127, 1.5));
    g.fill(cq([[KD.x0 - 0.4, 0, zf - 1.8], [KD.x1 + 0.4, 0, zf - 1.8], [KD.x1, 0, zf], [KD.x0, 0, zf]], 128, 1.5));
    g.restore();
    g.fillStyle = C.hoodLow;
    [[1.3, 1.9, 1.2, 1.75], [3.1, 3.6, 1.25, 1.7]].forEach(([za, zb, ya, yb]) => { const p1 = CP(xr - 0.01, yb, zb), p2 = CP(xr - 0.01, ya, zb); g.fillRect(p1[0] - 2, p1[1], 2, p2[1] - p1[1]); });
    const ps = CP(-0.75, 2.2, 3.4); g.globalAlpha = 0.8; g.fillRect(ps[0] - 30, ps[1] + 24, 60, 2); g.globalAlpha = 1;
  }
  // a cached region overlay laid on at a live strength
  function overlay(c, key, R, fn, a) {
    if (a <= 0.003) return; c.g.save(); c.g.globalAlpha = Math.min(1, a); layerR(c, key, R, fn); c.g.restore();
  }
  // the kitchen doorway's slab, live, so endLight tweens: still a slab at 0.35, the S03 colours at 1
  function kitchenSlab(c, el) {
    if (el <= 0.003) return; const g = c.g, K = kitchenRects(), f = sm(seg(el, 0, 0.2));
    const outer = mix(C.ink, C.hoodLow, f * (0.3 + 0.7 * el)), midc = mix(C.ink, mix(C.hoodLow, C.hoodMid, el), f * (0.38 + 0.62 * el)), core = mix(C.ink, mix(C.hoodMid, C.hood, el), f * (0.32 + 0.68 * el));
    g.fillStyle = outer; g.fillRect(...K.door); g.fillStyle = midc; g.fillRect(...K.mid); g.fillStyle = core; g.fillRect(...K.core);
    c.em.save(); c.em.globalAlpha = 0.55 * el * el; c.em.fillStyle = C.hood; c.em.fillRect(...K.core); c.em.restore();
  }
  // the bathroom's light through the open door: the lit part of the opening (between the near jamb and the leaf's shadow line),
  // projected from the bulb onto the floor and the right wall. Two posterised bands on the floor, one on the wall.
  function bathLight(phi) {
    const { xl, xr } = CR, fe = [xl - BD.w * Math.sin(phi), BD.z1 - BD.w * Math.cos(phi)];
    const t = (xl - BS.x) / (fe[0] - BS.x), ze = clamp(BS.z + t * (fe[1] - BS.z), BD.z0, BD.z1);
    const k = (xr - BS.x) / (xl - BS.x), far = z => BS.z + (z - BS.z) * k, yTop = BS.y + (BD.h - BS.y) * k;
    return { fe, ze, k, far, yTop };
  }
  function bathLeaf(c, s, on, L) {   // the bathroom door: closed, or swung into the bathroom (hinge at the far jamb)
    const g = c.g, { xl, xr } = CR, phi = clamp(s.bathDoor, 0, 1) * Math.PI * 0.5;
    const op = [[xl, 0, BD.z0], [xl, BD.h, BD.z0], [xl, BD.h, BD.z1], [xl, 0, BD.z1]];
    if (phi > 0.005) {
      const B = bathLight(phi), lit = B.ze - BD.z0;
      // the bathroom: its light fills the opening; its far wall and the leaf hang inside, dark
      g.fillStyle = mix(C.underDoor, C.tungstenTired, 0.25); g.fill(cq(op, 140, 0.3));
      const leafQ = cq([[B.fe[0], 0, B.fe[1]], [B.fe[0], BD.h, B.fe[1]], [xl - 0.02, BD.h, BD.z1], [xl - 0.02, 0, BD.z1]], 142, 0.3);
      g.save(); g.clip(cq(op, 140, 0.3)); g.fillStyle = mix(C.underDoor, C.ink, 0.35); g.fill(cq([[xl - 0.6, 0, BD.z1 + 0.3], [xl - 0.6, BD.h, BD.z1 + 0.3], [xl - 2, BD.h, BD.z1 + 2], [xl - 2, 0, BD.z1 + 2]], 141, 0.3));
      g.fillStyle = mix(C.ink, C.underDoor, 0.11); g.fill(leafQ); g.restore();   // the leaf's corridor face, lit only by bounce: a figure in front still reads
      if (lit > 0.004) {
        const zA = B.far(BD.z0), zB = B.far(B.ze), c1 = mix(C.ink, C.underDoor, 0.17), c2 = mix(C.ink, C.underDoor, 0.3);
        // the right wall: one band, the furniture dark against it
        const wall = cq([[xr - 0.004, 0, zA], [xr - 0.004, B.yTop, zA], [xr - 0.004, B.yTop, zB], [xr - 0.004, 0, zB]], 143, 1.2);
        g.fillStyle = c1; g.fill(wall); ditherStroke(g, wall, c1, 4); g.save(); g.clip(wall); rightWallThings(g, L); g.restore();
        // the floor: the whole patch dim, the first metre from the door brighter
        const xm = -0.95, km = (xm - BS.x) / (xl - BS.x), mid = z => BS.z + (z - BS.z) * km;
        const fl1 = cq([[xl, 0, BD.z0], [xl, 0, B.ze], [xr, 0, zB], [xr, 0, zA]], 144, 1.6), fl2 = cq([[xl, 0, BD.z0], [xl, 0, B.ze], [xm, 0, mid(B.ze)], [xm, 0, mid(BD.z0)]], 145, 1.4);
        g.fillStyle = c1; g.fill(fl1); ditherStroke(g, fl1, c1, 4); g.fillStyle = c2; g.fill(fl2); ditherStroke(g, fl2, c2, 4);
        g.save(); g.clip(fl1); g.strokeStyle = rgba(C.ink, 0.5); g.lineWidth = 2;
        for (let X = xl + 0.14; X < xr; X += 0.14) { const a = CP(X, 0, 2.6), b = CP(X, 0, 6); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
        g.fillStyle = rgba(C.ink, 0.3); g.fill(cq([[-1.3, 0, 2.6], [-0.45, 0, 2.6], [-0.45, 0, 6.2], [-1.3, 0, 6.2]], 109, 0.6)); g.restore();
      }
      // the halation: only the part of the opening the leaf does not hide
      c.em.save(); c.em.clip(cq(op, 140, 0.3)); c.em.globalAlpha = 0.5; c.em.fillStyle = C.underDoor; c.em.fill(cq(op, 140, 0.3));
      c.em.globalAlpha = 1; c.em.fillStyle = '#000'; c.em.fill(leafQ); c.em.restore();
      return;
    }
    g.fillStyle = mix(C.ink, C.soot, 0.55); g.fill(cq(op, 140, 0.4));
    const pan = (y0, y1, sd) => { g.fillStyle = mix(C.ink, C.soot, 0.3); g.fill(cq([[xl, y0, BD.z0 + 0.14], [xl, y1, BD.z0 + 0.14], [xl, y1, BD.z1 - 0.14], [xl, y0, BD.z1 - 0.14]], sd, 0.3));
      if (on > 0) { g.fillStyle = mix(C.ink, C.underDoor, 0.22 * on); g.fill(cq([[xl, y0, BD.z0 + 0.14], [xl, y0 + 0.02, BD.z0 + 0.14], [xl, y0 + 0.02, BD.z1 - 0.14], [xl, y0, BD.z1 - 0.14]], sd + 50, 0.1)); } };
    pan(1.15, 1.9, 146); pan(0.15, 0.95, 147);
    // the handle: a lever at the latch (near) side, pointing toward the hinge (screen right), as in the 'handle' insert
    const hp = CP(xl + 0.06, BD.handle[0], BD.handle[1]); g.fillStyle = C.ink; g.fill(S().capsule(hp[0] - 2, hp[1], 6, hp[0] + 34, hp[1] + 3, 5).path(0.3, 148));
    if (on > 0) { g.fillStyle = mix(C.ink, C.underDoor, 0.5 * on); g.fillRect(hp[0], hp[1] + 5, 30, 2); }
  }
  // the line of light under the shut bathroom door, its fan on the boards in two posterised bands (the outer reaches the runner)
  function underDoorLine(c, on) {
    if (on <= 0) return; const g = c.g, { xl } = CR;
    g.save(); g.globalAlpha = on;
    const c1 = mix(C.ink, C.underDoor, 0.15), c2 = mix(C.ink, C.underDoor, 0.34);
    const sp1 = cq([[xl, 0, BD.z0 + 0.02], [-1.24, 0, BD.z0 - 0.16], [-1.1, 0, BD.z1 + 0.3], [xl, 0, BD.z1 - 0.02]], 150, 1.6); g.fillStyle = c1; g.fill(sp1); ditherStroke(g, sp1, c1, 4);
    const sp2 = cq([[xl, 0, BD.z0 + 0.02], [-1.62, 0, BD.z0 - 0.05], [-1.55, 0, BD.z1 + 0.1], [xl, 0, BD.z1 - 0.02]], 151, 1.0); g.fillStyle = c2; g.fill(sp2); ditherStroke(g, sp2, c2, 4);
    g.save(); g.clip(sp1); g.strokeStyle = rgba(C.ink, 0.5); g.lineWidth = 2;   // the boards read through it
    for (let X = xl + 0.14; X < -0.9; X += 0.14) { const a = CP(X, 0, 2.4), b = CP(X, 0, 4.2); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } g.restore();
    const a = CP(xl, 0.012, BD.z0 + 0.02), b = CP(xl, 0.012, BD.z1 - 0.02);
    g.strokeStyle = C.underDoor; g.lineWidth = 4; g.lineCap = 'butt'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    const e1 = CP(xl, BD.h, BD.z0 + 0.01), e2 = CP(xl, 0, BD.z0 + 0.01); g.strokeStyle = mix(C.ink, C.underDoor, 0.5); g.lineWidth = 2; g.beginPath(); g.moveTo(e1[0], e1[1]); g.lineTo(e2[0], e2[1]); g.stroke();
    g.restore();
    c.em.save(); c.em.globalAlpha = on; c.em.strokeStyle = C.underDoor; c.em.lineWidth = 10; c.em.beginPath(); c.em.moveTo(a[0], a[1]); c.em.lineTo(b[0], b[1]); c.em.stroke(); c.em.restore();
  }
  // Kay's 'Big night for you.' left on the wall: L086 (from FILM.byId, never typed) in her face, one line, low across the near wall and
  // onto the bathroom door, in perspective, at 8% when kayAfterimage = 1. The texture is cached only once the face has loaded.
  let _kayTxt = null;
  const KAY_TXT = { size: 90, h: 130, base: 96, y0: 1.0, y1: 1.3, z0: 2.08 };
  function kayTextCanvas() {
    if (_kayTxt) return _kayTxt; const e = global.FILM && global.FILM.byId && global.FILM.byId.L086; const str = e ? e.text : null; if (!str) return null;
    const F = (O.FACE && O.FACE.kay) || { family: 'Cormorant Garamond', weight: 600, style: 'italic' };
    const fs = O.font({ family: F.family, weight: F.weight, style: F.style, size: KAY_TXT.size });
    const ready = !(global.document && global.document.fonts && global.document.fonts.check) || global.document.fonts.check(fs, str);
    const m = O.makeCanvas(8, 8).getContext('2d'); m.font = fs; const w = Math.ceil(m.measureText(str).width) + 40;
    const cv = O.makeCanvas(w, KAY_TXT.h), g = cv.getContext('2d'); g.font = fs; g.fillStyle = C.tKay; g.fillText(str, 20, KAY_TXT.base);
    const T = { cv, w, h: KAY_TXT.h }; if (ready) _kayTxt = T; return T;
  }
  function kayAfterimage(c, a) {
    if (a <= 0) return; const T = kayTextCanvas(); if (!T) return; const g = c.g, xl = CR.xl + 0.004, n = 48;
    const zA = KAY_TXT.z0, zB = zA + T.w * (KAY_TXT.y1 - KAY_TXT.y0) / T.h, yT = KAY_TXT.y1, yB = KAY_TXT.y0;
    g.save(); g.globalAlpha = 0.08 * clamp(a, 0, 1);
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, z0 = lerp(zA, zB, u0), z1 = lerp(zA, zB, u1), zm = (z0 + z1) / 2;   // the texture is linear in Z on the wall
      const p0 = CP(xl, yT, z0), p1 = CP(xl, yT, z1), pb = CP(xl, yB, zm), pt = CP(xl, yT, zm);
      g.drawImage(T.cv, u0 * T.w, 0, (u1 - u0) * T.w, T.h, p0[0], pt[1], p1[0] - p0[0] + 0.6, pb[1] - pt[1]);
    }
    g.restore();
  }
  function corridorJamb(g, L, sp) {   // the living-room doorway we stand in: its jamb at right, the warm room wall beyond it
    const wall = S().rect(1770, -20, 200, 1120).path(0.6, 163); g.fillStyle = mix(L.low, C.ink, 0.25 + 0.55 * (1 - sp)); g.fill(wall);
    g.save(); g.clip(wall); const b = S().poly([[1760, -40], [1960, -40], [1960, 520], [1760, 760]]).path(2, 164); g.fillStyle = mix(L.mid, C.ink, 0.6 * (1 - sp)); g.fill(b); ditherStroke(g, b, mix(L.mid, C.ink, 0.6 * (1 - sp)), 5); g.restore();
    const p = S().rect(1650, -20, 122, 1120).path(0.8, 160); g.fillStyle = C.ink; g.fill(p);
    if (sp > 0) { g.globalAlpha = sp; g.fillStyle = L.mid; g.fill(S().rect(1766, -20, 5, 1120).path(0.3, 161)); g.globalAlpha = 1; }
  }
  const CORRIDOR = {
    back(c, t, s) {
      const L = lampCols(qT(s.lampTired)), sp = clamp(s.spill, 0, 1), el = clamp(s.endLight, 0, 1), on = clamp(s.underDoor, 0, 1);
      layer(c, 'cr:' + L.k, gg => corridorStatic(gg, L));
      overlay(c, 'crsp:' + L.k, SPILL_R, gg => corridorSpill(gg, L), sp);
      overlay(c, 'crend', END_R, gg => corridorEnd(gg), el);
      kitchenSlab(c, el);
      bathLeaf(c, s, on, L);
      if (s.bathDoor <= 0.005) underDoorLine(c, on);
      kayAfterimage(c, s.kayAfterimage);
      motes(c.g, [[1000, 300], [1080, 300], [1600, 1080], [500, 1080]], 26, t, 'crd', mix(C.ink, C.hood, 0.5), el);
    },
    front(c, t, s) {   // the jamb, cross-faded between its spill-off and spill-on versions (both cached)
      const L = lampCols(qT(s.lampTired)), sp = clamp(s.spill, 0, 1), R = [1640, 0, 280, H];
      if (sp < 0.999) layerR(c, 'crj:' + L.k + ':0', R, gg => corridorJamb(gg, L, 0));
      if (sp > 0.001) overlay(c, 'crj:' + L.k + ':1', R, gg => corridorJamb(gg, L, 1), sp);
    },
  };
  VIEWS.corridor = CORRIDOR; FIG_K.corridor = CR.f * 0.254;
  (() => { const K = kitchenRects(); LIGHTS.corridor = { x: Math.round(K.core[0] + K.core[2] / 2), y: Math.round(K.core[1] + K.core[3] * 0.35), color: mix(C.ink, C.hood, 0.75), rimDir: [0, -0.2],
    warm: { x: 1800, y: 300, color: C.tungstenMid }, underDoor: { x: Math.round(CP(CR.xl, 0, 3.05)[0]), y: Math.round(CP(CR.xl, 0, 3.05)[1]), color: C.underDoor } }; })();
  SHADOW.corridor = shape => { const bb = shape.bbox(); return shadowM([CR.vx - (bb.x + bb.w / 2), CR.vy - (bb.y + bb.h)], 0.3)(shape); };
  SHADOW_CLIP.corridor = cq([[CR.xl, 0, CR.z0], [CR.xr, 0, CR.z0], [CR.xr, 0, CR.zf], [CR.xl, 0, CR.zf]], 103);
  (() => {
    const F = (X, Z) => { const p = PROJ.corridor(X, Z); return [Math.round(p[0]), Math.round(p[1]), +(FIG_K.corridor * p[2]).toFixed(1)]; };
    const hp = CP(CR.xl + 0.06, BD.handle[0], BD.handle[1]), R = a => a.map(Math.round), K = kitchenRects();
    ANCH.corridor = {
      vp: [CR.vx, CR.vy],                                                         // the vanishing point
      bathDoor: { near: R(CP(CR.xl, 0, BD.z0).concat(CP(CR.xl, BD.h, BD.z0))), far: R(CP(CR.xl, 0, BD.z1).concat(CP(CR.xl, BD.h, BD.z1))), mid: R(CP(CR.xl, 1.0, 3.2)) },   // near/far: [xBottom, yBottom, xTop, yTop]
      handle: [Math.round(hp[0] + 16), Math.round(hp[1] + 2)],                     // the bathroom door handle on screen
      underDoor: [R(CP(CR.xl, 0, BD.z0)), R(CP(CR.xl, 0, BD.z1))],
      kitchen: F(-1.0, CR.zf), kitchenDoor: { x0: Math.round(K.door[0]), x1: Math.round(K.door[0] + K.door[2]), top: Math.round(K.door[1]), bot: Math.round(K.door[1] + K.door[3]) },
      kitchenCore: K.core.map(Math.round),                                        // [x, y, w, h] the hot slab: H.occlude anyone in front of it
      // floor places [x, y, scale]: the procession walks the runner (X -0.85) away from us; Scott stops at 'reach' beside the door
      near: F(-0.7, 2.45), atDoor: F(-1.05, 3.2), reach: F(-1.3, 3.0), past: F(-0.85, 4.4), far: F(-0.95, 5.6), turnIn: F(-1.6, 3.25), // turnIn: Kay's last place before the bathroom
      walk: (u, X) => F(X == null ? -0.85 : X, lerp(2.3, 6.3, u)),               // a point along the corridor, u 0 (near) .. 1 (kitchen)
    };
  })();
  CAMS.corridor = { corridor: { x: 960, y: 540, zoom: 1 }, corridor_door: { x: 740, y: 560, zoom: 1.3 }, corridor_far: { x: 1080, y: 520, zoom: 1.5 },
    corridor_q07: { x: 780, y: 610, zoom: 1.22 },       // Q07 at 2.00: the shut door and its line of light, the dark hall running away right
    corridor_q06: { x: 1225, y: 610, zoom: 1.55 } };    // corridor_q06: tight down the hall; the bathroom door is just out of frame left ('somewhere out of sight')

  // =====================================================================================================
  // DEMOS (characters here are PLACEHOLDERS: the sequences place the real ones with film/rig.js)
  // =====================================================================================================
  function ph(c, id, pose, light, rimCol, rimW) {
    const f = O.fig.profile(id, pose); O.silhouette(c.g, f.shape, { light, rimColor: rimCol, rimW: rimW || 3 }); O.fig.drawDetails(c.g, f, { rimColor: rimCol, beadColor: C.rainSilver });
    return f;
  }
  const cam = (c, name, dz) => { const k = Object.assign({}, CAMS[camView(name)][name]); if (dz) k.zoom *= dz; c.camera(k); };
  const camView = name => Object.keys(CAMS).find(v => CAMS[v][name]);
  const DEMOS = [];
  DEMOS.push({ name: 'hall: shut, before the doorbell', letterbox: 1.7778, draw(c, t) {
    const s = { door: 0, coats: 0, footprints: 0 }; cam(c, 'hall', 1 + 0.004 * t);
    SETS.hall.back(c, t, s, 'hall');
    const a = ANCH.hall.inside; ph(c, 'scott', { x: a[0] - 150, y: a[1] + 20, scale: a[2], facing: 1, lean: 0.06, armN: { a: 0.2, b: 0.6 }, armF: { a: -0.1, b: 0.3 } }, LIGHTS.hall, C.tungsten, 3);
    SETS.hall.front(c, t, s, 'hall');
  } });
  DEMOS.push({ name: 'hall: Kay at the door (F03, door 0.7)', letterbox: 1.7778, draw(c, t) {
    const s = { door: 0.7, coats: 2, footprints: 2 }; cam(c, 'hall');
    SETS.hall.back(c, t, s, 'hall');
    const k = ANCH.hall.step; ph(c, 'kay', { x: k[0] + 40, y: k[1], scale: 87, facing: -1, lean: -0.14, head: -0.2, armN: { a: 0.16, b: 0.5 }, armF: { a: -0.3, b: 0.12, hand: 'hold' } }, { dx: -1, dy: -0.25 }, C.tungstenMid, 2);
    const a = ANCH.hall.inside; ph(c, 'scott', { x: a[0], y: a[1], scale: 92, facing: 1, lean: 0.19, neck: 0.22, head: 0.24, armN: { a: -0.3, b: 0.62 }, armF: { to: [998, 226] } }, { dx: -1, dy: -0.75 }, C.tungsten, 3.4);
    SETS.hall.front(c, t, s, 'hall');
  } });
  DEMOS.push({ name: 'hall: the door swinging (door 0..1)', letterbox: 1.7778, draw(c, t) {
    const s = { door: clamp(0.25 + 0.25 * t, 0, 1), coats: 3, footprints: 2.6 }; cam(c, 'hall_door');
    SETS.hall.back(c, t, s, 'hall');
    const kb = SETS.hall.knob('hall', s.door); const a = ANCH.hall.latchSide;
    ph(c, 'scott', { x: a[0], y: a[1], scale: a[2], facing: 1, lean: 0.12, armN: { to: kb }, armF: { a: -0.1, b: 0.3 } }, LIGHTS.hall, C.tungsten, 3);
    SETS.hall.front(c, t, s, 'hall');
  } });
  DEMOS.push({ name: 'hall: all in, six coats, the extra pair', letterbox: 1.7778, draw(c, t) {
    const s = { door: 0, coats: 6, footprints: 5, extraPrints: 1 }; cam(c, 'hall');
    SETS.hall.back(c, t, s, 'hall');
    const a = ANCH.hall.latchSide, kb = SETS.hall.knob('hall', 0);
    ph(c, 'scott', { x: a[0], y: a[1], scale: a[2], facing: 1, lean: 0.08, armN: { to: kb }, armF: { a: -0.05, b: 0.2 } }, LIGHTS.hall, C.tungsten, 3);
    SETS.hall.front(c, t, s, 'hall');
  } });
  DEMOS.push({ name: 'hall_floor: prints + extra pair', letterbox: 1.7778, draw(c, t) {
    const s = { door: 0, coats: 6, footprints: 5, extraPrints: 1 }; cam(c, 'hall_floor');
    SETS.hall.draw(c, t, s, 'hall');
  } });
  DEMOS.push({ name: 'hall_hooks: six coats, tired lamp', letterbox: 1.7778, draw(c, t) {
    const s = { door: 0, coats: 6, footprints: 5, lampTired: 1 }; cam(c, 'hall_hooks');
    SETS.hall.draw(c, t, s, 'hall');
  } });
  DEMOS.push({ name: 'doorway: Kay on the step', letterbox: 1.7778, draw(c, t) {
    const s = { door: 1, rain: 1, footprints: 2 }; cam(c, 'doorway', 1 + 0.004 * t);
    SETS.hall.back(c, t, s, 'doorway');
    const k = ANCH.doorway.step; ph(c, 'kay', { x: k[0] + 40, y: k[1], scale: k[2], facing: -1, lean: -0.1, head: -0.15, armN: { a: 0.16, b: 0.5 }, armF: { a: 0.1, b: 0.9, hand: 'hold' } }, { dx: -1, dy: -0.3 }, C.tungstenMid, 2.4);
    const a = ANCH.doorway.inside; ph(c, 'scott', { x: a[0], y: a[1], scale: a[2], facing: 1, lean: 0.14, neck: 0.15, head: 0.2, armN: { a: 0.3, b: 0.4 }, armF: { to: SETS.hall.doorEdge('doorway', 1).top.map((v, i) => i ? 380 : DY.x0 - 20) } }, { dx: -1, dy: -0.6 }, C.tungsten, 3.4);
    SETS.hall.front(c, t, s, 'doorway');
  } });
  DEMOS.push({ name: 'doorway: empty, door half open', letterbox: 1.7778, draw(c, t) {
    const s = { door: 0.3 + 0.1 * t, rain: 1, footprints: 3, extraPrints: 1 }; cam(c, 'doorway');
    SETS.hall.draw(c, t, s, 'doorway');
  } });
  DEMOS.push({ name: 'porch: Christof and Marina', letterbox: 1.7778, draw(c, t) {
    const s = { door: 1, rain: 1 }; cam(c, 'porch');
    SETS.hall.back(c, t, s, 'porch');
    const l = ANCH.porch.porchL, r = ANCH.porch.porchR;
    const m = O.fig.profile('marina', { x: l[0], y: l[1], scale: l[2], facing: 1, lean: -0.04, armN: { a: 0.5, b: 1.4 }, armF: { a: -0.1, b: 0.2 } });
    const ch = O.fig.profile('christof', { x: r[0], y: r[1], scale: r[2], facing: -1, lean: 0.05, armN: { a: 1.2, b: 0.6, hand: 'open' }, armF: { a: -0.2, b: 0.3 } });
    SETS.hall.shadow(c, 'porch', m.shape, 0.5); SETS.hall.shadow(c, 'porch', ch.shape, 0.5);
    // the cold street lamp is behind them, up left: a crescent on that side only (copy this: rimDir + spread, never a full outline)
    const rd = LIGHTS.porch.rimDir; [m, ch].forEach(f => { O.silhouette(c.g, f.shape, { light: { dx: rd[0], dy: rd[1] }, spread: 0.85, rimColor: C.rainSilver, rimW: 2.4 }); O.fig.drawDetails(c.g, f, { rimColor: C.rainSilver }); });
    SETS.hall.front(c, t, s, 'porch');
  } });
  DEMOS.push({ name: 'porch: the door swinging shut (door 0.2)', letterbox: 1.7778, draw(c, t) {
    SETS.hall.draw(c, t, { door: 0.12 + 0.08 * t, rain: 1 }, 'porch');
  } });
  DEMOS.push({ name: 'doorway: shut (door 0), prints dry', letterbox: 1.7778, draw(c, t) {
    SETS.hall.draw(c, t, { door: 0, footprints: 5, extraPrints: 1, dry: 0.6 }, 'doorway');
  } });
  // a placeholder hand + forearm reaching from off frame: wrist at w, fingers toward dir (radians), length L px
  function phHand(c, pose, w, dir, Lh, from, rimCol, lightDir) {
    const cs = Math.cos(dir), sn = Math.sin(dir); const hs = O.fig.hand(pose, { curl: 0.5 }).transform([cs * Lh, sn * Lh, -sn * Lh, cs * Lh, w[0], w[1]]);
    const arm = S().capsule(from[0], from[1], Lh * 0.34, w[0], w[1], Lh * 0.2).add(hs);
    O.silhouette(c.g, arm, { light: lightDir, rimColor: rimCol, rimW: 3 });
  }
  DEMOS.push({ name: 'lock: shut, the double click (hand on knob)', letterbox: 1.7778, draw(c, t) {
    const s = { latch: 1, snib: 0, jiggle: t > 2.2 && t < 2.6 ? 3 * Math.sin((t - 2.2) / 0.4 * Math.PI) : 0 }; cam(c, 'lock', 1 + 0.01 * t);   // the second CLICK has no visible cause
    SETS.hall.back(c, t, s, 'lock');
    const k = ANCH.lock.knobGrip; phHand(c, 'clasp', [k[0] + 70, k[1] + 30], Math.PI + 0.25, 190, [2100, 900], C.tungsten, { dx: -1, dy: -1 });
  } });
  DEMOS.push({ name: 'lock: ajar, night in the gap (latch 0.45)', letterbox: 1.7778, draw(c, t) {
    const s = { latch: 0.45, rain: 1 }; cam(c, 'lock');
    SETS.hall.back(c, t, s, 'lock');
    const gx = ANCH.lock.gapAt(s); const k = ANCH.lock.knobGrip; phHand(c, 'open', [k[0] + gx + 150, k[1] + 80], Math.PI + 0.1, 190, [2100, 980], C.tungsten, { dx: -1, dy: -1 });
  } });
  DEMOS.push({ name: 'corridor: Q06 Kay goes in (bathDoor 0.6)', letterbox: 1.7778, draw(c, t) {
    const s = { bathDoor: 0.6, spill: 1, endLight: 0.35, underDoor: 1 }; cam(c, 'corridor');
    SETS.hall.back(c, t, s, 'corridor');
    const k = ANCH.corridor.turnIn; const f = ph(c, 'kay', { x: k[0], y: k[1], scale: k[2], facing: -1, lean: 0.04, legN: { a: 0.3, b: 0.1 }, legF: { a: -0.25, b: 0.2 }, armN: { a: -0.2, b: 0.2 }, armF: { a: 0.3, b: 0.3 } }, { dx: -1, dy: 0.2 }, C.underDoor, 2.4);
    SETS.hall.occlude(c, f.shape);   // she stands in front of the lit doorway: keep its halation off her
    SETS.hall.front(c, t, s, 'corridor');
  } });
  DEMOS.push({ name: 'corridor: Q07 empty, door shut, afterimage', letterbox: 2.0, draw(c, t) {
    const s = { bathDoor: 0, spill: 1, endLight: 0.35, underDoor: 1, kayAfterimage: 1 }; cam(c, 'corridor', 1 + 0.005 * t);
    SETS.hall.draw(c, t, s, 'corridor');
  } });
  DEMOS.push({ name: 'corridor: Q09 the procession (tired, kitchen lit)', letterbox: 2.0, draw(c, t) {
    const s = { bathDoor: 0, spill: 0.35, endLight: 1, underDoor: 1, kayAfterimage: 1, lampTired: 1 }; cam(c, 'corridor');
    SETS.hall.back(c, t, s, 'corridor');
    const A = ANCH.corridor; const LT = LIGHTS.corridor;
    [['angelo', 0.62], ['deena', 0.48], ['marina', 0.34], ['scott', 0.16]].forEach(([id, u]) => { const p = A.walk(u, -0.8);
      const f = O.fig.profile(id, { x: p[0], y: p[1], scale: p[2], facing: 1, lean: 0.06, legN: { a: 0.24, b: 0.1 }, legF: { a: -0.2, b: 0.12 }, armN: { a: 0.3, b: 0.3 }, armF: { a: -0.25, b: 0.2 } });
      O.silhouette(c.g, f.shape, { light: { x: LT.x, y: LT.y }, spread: 1.1, rimColor: LT.color, rimW: 2 });
      SETS.hall.occlude(c, f.shape); });   // RULE: anyone drawn over the kitchen slab (or any lit opening) is occluded in c.em, or the bloom washes them
    SETS.hall.front(c, t, s, 'corridor');
  } });
  DEMOS.push({ name: 'corridor_q07: the shut door (2.00)', letterbox: 2.0, draw(c, t) {
    const s = { bathDoor: 0, spill: 1, endLight: 0.35, underDoor: 1, kayAfterimage: 1 }; cam(c, 'corridor_q07', 1 + 0.004 * t);
    SETS.hall.draw(c, t, s, 'corridor');
  } });
  DEMOS.push({ name: 'corridor_q06: the CLICK out of sight (bathDoor 0.6->0 at 0.7-1.25 s)', letterbox: 1.7778, draw(c, t) {
    const bd = t < 0.7 ? 0.6 : t < 1.25 ? 0.6 * (1 - FILM.ease.inQuad((t - 0.7) / 0.55)) : 0;
    const s = { bathDoor: bd, spill: 1, endLight: 0.35, underDoor: 1 }; cam(c, 'corridor_q06');
    SETS.hall.draw(c, t, s, 'corridor');
  } });
  DEMOS.push({ name: 'handle: the hand stops short', letterbox: 2.0, draw(c, t) {
    const s = { underDoor: 1 }; cam(c, 'handle', 1 + 0.008 * t);
    SETS.hall.back(c, t, s, 'handle');
    const r = ANCH.handle.reachStop; phHand(c, 'open', [r[0] + 120, r[1] + 150], -(Math.PI - 0.95), 200, ANCH.handle.handIn, C.underDoor, { dx: -0.1, dy: 1 });
  } });
  DEMOS.push({ name: 'handle: underDoor off', letterbox: 2.0, draw(c, t) {
    SETS.hall.draw(c, t, { underDoor: 0 }, 'handle');
  } });

  // =====================================================================================================
  // EXPORT
  // =====================================================================================================
  const camList = {}; Object.keys(CAMS).forEach(v => Object.keys(CAMS[v]).forEach(n => { camList[n] = Object.assign({ view: v }, CAMS[v][n]); }));
  function viewOf(view) { const V = VIEWS[view || 'hall']; if (!V) { if (global.FILM) global.FILM.warn('hall: no view ' + view); return null; } return V; }
  const SET = {
    views: Object.keys(VIEWS), defaults: Object.assign({}, DEFAULTS), coatOrder: COAT_ORDER.slice(), trailOrder: TRAILS.map(T => T.who),
    anchors: ANCH, lights: LIGHTS, light: LIGHTS.hall, cams: camList,
    back(c, t, state, view) { const V = viewOf(view); if (V) V.back(c, t, stOf(state)); },
    front(c, t, state, view) { const V = viewOf(view); if (V && V.front) V.front(c, t, stOf(state)); },
    draw(c, t, state, view) { const V = viewOf(view); if (!V) return; const s = stOf(state); V.back(c, t, s); if (V.front) V.front(c, t, s); },
    floor(view, X, Z) { const P = PROJ[view || 'hall']; return P ? P(X, Z) : null; },
    scaleAt(view, Z) { const v = view || 'hall', P = PROJ[v]; if (!P || !FIG_K[v]) return null; return FIG_K[v] * P(0, Z)[2]; },   // null for the inserts (lock, handle)
    knob(view, door) { return LEAF[view || 'hall'] ? leafPt(view || 'hall', door || 0, 0.92, 0.5).slice(0, 2) : null; },
    doorEdge(view, door) { const v = view || 'hall'; if (!LEAF[v]) return null; return { top: leafPt(v, door || 0, 1, 0).slice(0, 2), bot: leafPt(v, door || 0, 1, 1).slice(0, 2) }; },
    trailPoint(view, i, u) { const T = TRAILS[i]; const P = PROJ[view || 'hall']; if (!T || !P) return null; const w = trailAt(T, u); const p = P(w[0], w[1]); return [p[0], p[1], FIG_K[view || 'hall'] * p[2]]; },
    // occlude(c, shapeOrPath2D): fill it black in the emissive buffer, so a light behind a figure (the kitchen slab, the open
    // bathroom door, the pendant, the street lamp) does not bloom over the ink. Call it right after drawing each figure.
    occlude(c, shape, rough) { const p = shape instanceof Path2D ? shape : shape.path(rough == null ? 0.8 : rough, 11); c.em.save(); c.em.globalAlpha = 1; c.em.fillStyle = '#000'; c.em.fill(p); c.em.restore(); },
    // coatShape(id, x, y, s, rot): a guest's coat as an OTM shape, hanging from its collar loop at (x, y); s = 1 is the hook size (figure scale ~88)
    coatShape(id, x, y, s, rot) { return coatAt(id, x, y, s, rot); },
    // coat(c, id, x, y, {scale, rot, rimDir, rimColor, rimW, t, drips, fall}): draw it the way the hooks do (ink + lit-side rim; Kay's mac
    // with its rain beads, and with t, its drips). Returns the shape (for H.occlude / shadows).
    coat(c, id, x, y, o) { return drawCoatAt(c, id, x, y, o); },
    shadow(c, view, shape, alpha) { const v = view || 'hall', m = SHADOW[v]; if (!m) return; c.g.save(); if (SHADOW_CLIP[v]) c.g.clip(SHADOW_CLIP[v]); O.castShadow(c.g, shape, m(shape), alpha == null ? 0.55 : alpha); c.g.restore(); },
    fx: { rainFall, drips, splashes, motes, rim },   // rim(g, path2D, [dx,dy], w, color, clip?, alpha?) respects the camera transform (OTM.silhouette's rim does not)          // the set's own deterministic weather, for sequences (e.g. Kay's ice bag dripping: H.fx.drips(c.g, [[x, y]], fall, t))
    demos: DEMOS,
  };
  SETS.hall = SET;
})(window);
