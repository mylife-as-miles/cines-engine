/* ONE TOO MANY — film engine.
   A deterministic, time-driven film: render(t) draws any instant, so the player can scrub and the exporter can step frames.
   Sequences register in story order with FILM.seq({...}); see FILM.md for the contract. */
(function (global) {
  'use strict';
  const O = global.OTM; const { W, H, C } = O;
  const FPS = 24;
  const FILM = global.FILM = { FPS, seqs: [], total: 0, script: global.FILM_SCRIPT || [], byId: {}, _cache: new Map(), _warned: {} };
  FILM.script.forEach(e => { if (e.id) FILM.byId[e.id] = e; });

  // ---------- maths ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function bezier(x1, y1, x2, y2) {
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x; for (let i = 0; i < 8; i++) { const cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3 - x; const d = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t; if (Math.abs(d) < 1e-6) break; t = clamp(t - cx / d, 0, 1); }
      return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
    };
  }
  const ease = {
    linear: t => t, inQuad: t => t * t, outQuad: t => 1 - (1 - t) * (1 - t), inOutQuad: t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2,
    inCubic: t => t ** 3, outCubic: t => 1 - (1 - t) ** 3, inOutCubic: t => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2,
    inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2, outExpo: t => t >= 1 ? 1 : 1 - 2 ** (-10 * t), inExpo: t => t <= 0 ? 0 : 2 ** (10 * t - 10),
    outBack: (t, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
    hover: bezier(0.55, 0.06, 0.68, 0.19), tidy: bezier(0.22, 1, 0.36, 1), snap: bezier(0.16, 1, 0.3, 1), bezier,
  };
  // normalised progress of t through [a,b], clamped, optionally eased
  function seg(t, a, b, e) { const u = clamp((t - a) / (b - a || 1e-6), 0, 1); return e ? (typeof e === 'string' ? ease[e] : e)(u) : u; }
  // keyframes: key(t, [[t0, v0], [t1, v1, 'inOutSine'], ...]) — v may be a number, array or object of numbers; the ease on a key shapes the segment arriving at it
  function key(t, ks) {
    if (t <= ks[0][0]) return ks[0][1]; const last = ks[ks.length - 1]; if (t >= last[0]) return last[1];
    let i = 0; while (i < ks.length - 1 && t > ks[i + 1][0]) i++;
    const [t0, v0] = ks[i], [t1, v1, e] = ks[i + 1]; const u = seg(t, t0, t1, e || 'inOutSine');
    return mixv(v0, v1, u);
  }
  function mixv(a, b, u) {
    if (typeof a === 'number') return lerp(a, b, u);
    if (Array.isArray(a)) return a.map((v, i) => mixv(v, b[i], u));
    const o = {}; for (const k in a) o[k] = (k in b) ? mixv(a[k], b[k], u) : a[k]; return o;
  }
  const twos = t => Math.floor(t * 12 + 1e-6) / 12;       // characters animate on twos
  const ones = t => Math.floor(t * 24 + 1e-6) / 24;
  // seeded smooth noise in [-1,1] for drift and shake
  const wob = (t, hz, seed) => O.vnoise(t * hz, 0.5, seed | 0) * 2 - 1;
  Object.assign(FILM, { clamp, lerp, ease, bezier, seg, key, mixv, twos, ones, wob });

  // ---------- registration ----------
  // def: { id, title, dur, letterbox: number | (lt)=>number, shots: [{at, name, draw(c, st, lt), post?}], lines: [...], sound(S){}, setup(){}, post: {} }
  FILM.seq = function (def) {
    def.shots = (def.shots || []).slice().sort((a, b) => a.at - b.at);
    def.lines = def.lines || [];
    FILM.seqs.push(def);
    let t = 0; FILM.seqs.forEach(s => { s.start = t; t += s.dur; }); FILM.total = t;
    return def;
  };
  FILM.find = function (t) {
    const S = FILM.seqs; if (!S.length) return null;
    let s = S[S.length - 1]; for (const q of S) if (t < q.start + q.dur) { s = q; break; }
    return s;
  };

  // ---------- dialogue ----------
  const WHO = { SCOTT: 'scott', DEENA: 'deena', ANGELO: 'angelo', KAY: 'kay', CHRISTOF: 'christof', MARINA: 'marina', DISPATCHER: 'dispatcher', VOICE: 'voice' };
  // entrance seconds by speaker (the time for a line to arrive fully)
  function entrance(who, text, o) {
    const n = text.length, words = text.split(/\s+/).length;
    switch (who) {
      case 'scott': return o.final ? 0 : 0.035 * n + 0.05;
      case 'deena': return 0;
      case 'angelo': return o.final ? 0.4 : 0.16 * words;
      case 'kay': return 0.022 * n + 0.2;
      case 'christof': return 0.025 * n + 0.1;
      case 'marina': return 0.12 + 0.028 * n;
      case 'dispatcher': return words / 2.8;
      case 'voice': return 0;
    }
    return 0.2;
  }
  function exitDur(who, text, o) {
    if (o.exit === 'cut') return 0;
    switch (who) { case 'scott': return Math.min(0.9, 0.018 * text.length + 0.05); case 'kay': return 0.7; case 'deena': case 'dispatcher': case 'voice': return 0; }
    return 0.2;
  }
  // resolve a line def into timing: {who, text, at, inEnd, holdEnd, end}
  FILM.lineTiming = function (L) {
    if (L._t) return L._t;
    const e = FILM.byId[L.id]; if (!e && !L.text) { warn('missing line ' + L.id); }
    const text = L.text || (e && e.text) || ''; const who = L.who || WHO[e && e.speaker] || 'scott';
    const o = L.opts || {}; const ent = L.entrance != null ? L.entrance : entrance(who, text, o);
    const hold = L.hold != null ? L.hold : Math.max(0.9, 0.35 + 0.055 * text.length);
    const inEnd = L.at + ent, holdEnd = L.until != null ? L.until : inEnd + hold, end = holdEnd + (L.noExit ? 0 : exitDur(who, text, o));
    return (L._t = { who, text, at: L.at, ent, inEnd, holdEnd, end });
  };
  FILM.lineState = function (L, lt) {
    const T = FILM.lineTiming(L); if (lt < T.at || lt >= T.end) return null;
    if (lt < T.inEnd) return { T, phase: 'in', p: T.ent ? (lt - T.at) / T.ent : 1, alpha: 1 };
    if (lt < T.holdEnd) return { T, phase: 'hold', p: 1, alpha: 1 };
    const u = (lt - T.holdEnd) / Math.max(1e-6, T.end - T.holdEnd);
    if (T.who === 'scott') return { T, phase: 'out', p: 1 - u, alpha: 1 };     // he deletes it backwards
    if (T.who === 'kay') return { T, phase: 'out', p: 1, alpha: 1, lip: true, lipAlpha: 1 - u };
    return { T, phase: 'out', p: 1, alpha: 1 - u };
  };
  // draw every active line of the sequence (screen space, matte-aware)
  FILM.drawLines = function (c, seq, lt) {
    const g = c.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const live = O.liveArea(c.letterbox);
    for (const L of seq.lines) {
      const s = FILM.lineState(L, lt); if (!s) continue;
      if (L.when && !L.when(lt)) continue;
      const o = Object.assign({}, L.opts || {}); const who = s.T.who; const size = L.size || (O.FACE[who === 'voice' ? (o.face || 'angelo') : who] || {}).size || 48;
      let y = L.y; const top = live.top + 40 + size, bot = live.bottom - 36; y = clamp(y, top, bot);
      o.p = s.p; o.alpha = s.alpha * (L.alpha != null ? L.alpha : 1); o.align = L.align || o.align || 'left'; if (L.size) o.size = L.size;
      if (who === 'scott' && o.caret !== false && s.phase === 'hold') o.caret = o.blink === false ? true : (Math.floor((lt - s.T.inEnd) / 0.53) % 2 === 0);
      if (who === 'scott' && s.phase !== 'hold') o.caret = s.phase === 'in';
      if (who === 'voice') { o.frame = c.f; o.depth = (o.depth == null ? 1 : o.depth) * s.alpha; }
      if (s.lip) { o.lip = true; o.alpha = s.lipAlpha; }
      if (who === 'dispatcher' && L.timer) o.timer = typeof L.timer === 'function' ? L.timer(lt) : L.timer;
      if (L.draw) L.draw(c, s, o); else O.say(g, who, s.T.text, L.x, y, o);
    }
    g.restore();
  };

  // ---------- render context ----------
  // c.cache(key, drawFn, w, h) keeps an offscreen canvas across frames (sets, static layers). Keys should start with the seq id.
  function cache(keyName, fn, w, h) {
    let e = FILM._cache.get(keyName);
    if (!e) {
      const cv = O.makeCanvas(w || W, h || H); const g = cv.getContext('2d'); fn(g, cv); e = { cv, used: 0 };
      FILM._cache.set(keyName, e);
      if (FILM._cache.size > 40) { let oldest = null; for (const [k, v] of FILM._cache) if (!oldest || v.used < oldest[1].used) oldest = [k, v]; FILM._cache.delete(oldest[0]); }
    }
    e.used = FILM._clock = (FILM._clock || 0) + 1; return e.cv;
  }
  FILM.cache = cache;
  // camera: call c.camera({x, y, zoom, rot, dx, dy}) — (x,y) is the world point placed at frame centre; zoom 1 = authored framing
  function camera(g, cam) {
    const z = cam.zoom || 1, r = cam.rot || 0, x = cam.x == null ? W / 2 : cam.x, y = cam.y == null ? H / 2 : cam.y;
    g.setTransform(1, 0, 0, 1, 0, 0); g.translate(W / 2 + (cam.dx || 0), H / 2 + (cam.dy || 0)); g.rotate(r); g.scale(z, z); g.translate(-x, -y);
  }
  // shake: seeded drift, returns {dx, dy}
  FILM.shake = (t, amp, hz, seed) => ({ dx: amp * wob(t, hz, (seed || 7)), dy: amp * wob(t, hz, (seed || 7) + 31) });

  let mainCtx = null;
  FILM.renderAt = function (t, ctx) {
    ctx = ctx || mainCtx; t = clamp(t, 0, Math.max(0, FILM.total - 1e-4));
    const seq = FILM.find(t); if (!seq) return;
    const lt = t - seq.start; const frameNo = Math.round(t * FPS);
    if (!seq._setup && seq.setup) { seq.setup(); } seq._setup = true;
    let shot = seq.shots[0]; for (const s of seq.shots) if (lt >= s.at) shot = s;
    const st = lt - shot.at; const shotEnd = (seq.shots[seq.shots.indexOf(shot) + 1] || { at: seq.dur }).at;
    const lb = typeof seq.letterbox === 'function' ? seq.letterbox(lt) : (seq.letterbox || 1.7778);
    const f = O.frame(ctx, { pool: true });
    const g = f.world; g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
    const c = { t, lt, st, frame: frameNo, seq, shot, shotDur: shotEnd - shot.at, f, g, em: f.emissive, letterbox: lb, cache, after: [], before: [],
      camera: cam => { camera(g, cam); camera(f.emissive, cam); f.emissive.scale && 0; }, reset: () => { g.setTransform(1, 0, 0, 1, 0, 0); f.emissive.setTransform(0.25, 0, 0, 0.25, 0, 0); },
      seed: frameNo };
    // the emissive buffer is quarter-res: camera() on it must keep the 0.25 scale
    c.camera = cam => { camera(g, cam); const e = f.emissive; e.setTransform(0.25, 0, 0, 0.25, 0, 0); const z = cam.zoom || 1, r = cam.rot || 0, x = cam.x == null ? W / 2 : cam.x, y = cam.y == null ? H / 2 : cam.y; e.translate(W / 2 + (cam.dx || 0), H / 2 + (cam.dy || 0)); e.rotate(r); e.scale(z, z); e.translate(-x, -y); };
    try { shot.draw(c, st, lt); } catch (err) { warn(seq.id + '/' + (shot.name || shot.at) + ': ' + err.message); console.error(err); }
    c.reset();
    if (seq.lines.length) FILM.drawLines(c, seq, lt);
    const post = Object.assign({ letterbox: lb, seed: (frameNo % 8) + 1, t: lt, grain: 0.07, vignette: 0.55, halation: 0.55, fibre: 0.05 }, seq.post || {}, shot.post || {},
      { beforePost: cx => c.before.forEach(fn => fn(cx)), afterPost: cx => c.after.forEach(fn => fn(cx)) });
    f.finish(post);
    // edge fades and black frames requested by the shot
    const fade = shot.fade ? shot.fade(st, c.shotDur) : 0; if (fade > 0) { ctx.save(); ctx.globalAlpha = clamp(fade, 0, 1); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    return c;
  };

  function warn(m) { if (FILM._warned[m]) return; FILM._warned[m] = 1; console.warn('[film] ' + m); (FILM.warnings = FILM.warnings || []).push(m); }
  FILM.warn = warn;

  // ---------- score (sound) ----------
  // seq.sound(S): S.cue(name, t, params) one-shot; S.bed(name, t0, t1, params) continuous; S.hole(t0, dur) the Extra's silence; S.duck(t0, t1, level)
  FILM.score = function (seq) {
    if (seq._score) return seq._score;
    const ev = { cues: [], beds: [], holes: [], ducks: [] };
    const S = { cue: (name, t, p) => ev.cues.push({ name, t, p: p || {} }), bed: (name, t0, t1, p) => ev.beds.push({ name, t0, t1, p: p || {} }),
      hole: (t0, dur) => ev.holes.push({ t0, dur }), duck: (t0, t1, level) => ev.ducks.push({ t0, t1, level }) };
    if (seq.sound) seq.sound(S);
    // every line lands with its speaker's sound unless told not to
    for (const L of seq.lines) { if (L.silent) continue; const T = FILM.lineTiming(L); S.cue('land.' + T.who, T.at, { chars: T.text.length, words: T.text.split(/\s+/).length, dur: T.ent, holdEnd: T.holdEnd, end: T.end, text: T.text }); if (T.who === 'voice') S.hole(T.at - 0.02, Math.max(0.45, T.holdEnd - T.at)); }
    return (seq._score = ev);
  };
  FILM.renderAudio = async function (seq, sr) {
    sr = sr || 44100; const len = Math.ceil(seq.dur * sr);
    const ac = new OfflineAudioContext(2, len, sr);
    const ev = FILM.score(seq);
    if (!global.SOUND) { warn('sound.js not loaded'); return ac.startRendering(); }
    await global.SOUND.ready();
    global.SOUND.build(ac, ev, seq);
    return ac.startRendering();
  };

  // ---------- player ----------
  FILM.player = function (opts) {
    opts = opts || {};
    const root = document.getElementById('film');
    const cv = O.makeCanvas(W, H); cv.id = 'screen'; root.querySelector('.screen').appendChild(cv); mainCtx = cv.getContext('2d');
    const ui = { play: root.querySelector('#play'), time: root.querySelector('#time'), bar: root.querySelector('#bar'), fill: root.querySelector('#fill'), head: root.querySelector('#head'),
      ticks: root.querySelector('#ticks'), sound: root.querySelector('#sound'), full: root.querySelector('#full'), scene: root.querySelector('#scene'), note: root.querySelector('#note') };
    let t = 0, playing = false, ac = null, master = null, t0Audio = 0, t0Film = 0, raf = 0, muted = false;
    const buffers = new Map(), pending = new Map(), sources = [];
    const fmt = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); };
    FILM.seqs.forEach(s => { const d = document.createElement('button'); d.className = 'tick'; d.style.left = (100 * s.start / FILM.total) + '%'; d.style.width = (100 * s.dur / FILM.total) + '%'; d.title = s.title; d.setAttribute('aria-label', 'Jump to ' + s.title); d.onclick = e => { e.stopPropagation(); seek(s.start + 0.001); }; ui.ticks.appendChild(d); });
    function draw() {
      FILM.renderAt(t); const s = FILM.find(t);
      ui.time.textContent = fmt(t) + ' / ' + fmt(FILM.total); ui.scene.textContent = s ? s.title : '';
      const p = 100 * t / FILM.total; ui.fill.style.width = p + '%'; ui.head.style.left = p + '%';
    }
    function getBuffer(seq) {
      if (buffers.has(seq)) return Promise.resolve(buffers.get(seq));
      if (pending.has(seq)) return pending.get(seq);
      const pr = FILM.renderAudio(seq, 32000).then(b => { buffers.set(seq, b); pending.delete(seq); if (buffers.size > 4) { const k = buffers.keys().next().value; if (k !== seq) buffers.delete(k); } return b; });
      pending.set(seq, pr); return pr;
    }
    // the mixed soundtrack (opts.audio: the same mix as the MP4) drives the clock when given; otherwise the engine renders each sequence
    let track = opts.audio ? new Audio(opts.audio) : null; if (track) { track.preload = 'auto'; if (!track.canPlayType('audio/mpeg')) track = null; }
    function stopAudio() { if (track) track.pause(); sources.splice(0).forEach(s => { try { s.stop(); } catch (e) { } }); }
    async function startAudio() {
      if (muted) return;
      if (track) {
        ui.note.textContent = 'Loading sound…'; ui.note.hidden = false;
        try { track.currentTime = t; await track.play(); } catch (e) { console.warn('soundtrack', e); track = null; }   // fall back to the engine
        if (track) { ui.note.hidden = true; if (!playing) { track.pause(); return; } t0Film = t; clockFromAudio = true; return; }
      } if (!ac) { ac = new (global.AudioContext || global.webkitAudioContext)(); master = ac.createGain(); master.connect(ac.destination); }
      await ac.resume(); stopAudio();
      const seq = FILM.find(t); const i = FILM.seqs.indexOf(seq);
      ui.note.textContent = 'Preparing sound…'; ui.note.hidden = false;
      const buf = await getBuffer(seq); if (!playing) return; ui.note.hidden = true;
      t0Audio = ac.currentTime + 0.05; t0Film = t;
      const play = (b, when, offset) => { const src = ac.createBufferSource(); src.buffer = b; src.connect(master); src.start(when, Math.max(0, offset)); sources.push(src); };
      play(buf, t0Audio, t - seq.start);
      // chain the following sequences as they become ready
      let at = t0Audio + (seq.start + seq.dur - t);
      for (let k = i + 1; k < Math.min(FILM.seqs.length, i + 3); k++) { const q = FILM.seqs[k]; const when = at; getBuffer(q).then(b => { if (playing && when > ac.currentTime) play(b, when, 0); }); at += q.dur; }
      clockFromAudio = true;
    }
    let clockFromAudio = false, wall0 = 0;
    function loop(now) {
      if (!playing) return;
      if (clockFromAudio && track) t = track.currentTime; else if (clockFromAudio && ac) t = t0Film + Math.max(0, ac.currentTime - t0Audio); else t = t0Film + (now - wall0) / 1000;
      if (t >= FILM.total) { t = FILM.total - 0.001; pause(); draw(); return; }
      // keep chaining audio for long playback
      if (clockFromAudio && ac && !track) { const s = FILM.find(t); const i = FILM.seqs.indexOf(s); const nxt = FILM.seqs[i + 2]; if (nxt) getBuffer(nxt); }
      draw(); raf = requestAnimationFrame(loop);
    }
    let posterShown = false;
    function play() { if (playing) return; if (posterShown) { posterShown = false; t = 0; } playing = true; ui.play.textContent = 'Pause'; ui.play.setAttribute('aria-label', 'Pause'); t0Film = t; wall0 = performance.now(); clockFromAudio = false; startAudio().catch(e => { ui.note.hidden = true; console.warn(e); }); raf = requestAnimationFrame(loop); }
    function pause() { playing = false; ui.play.textContent = 'Play'; ui.play.setAttribute('aria-label', 'Play'); cancelAnimationFrame(raf); stopAudio(); clockFromAudio = false; }
    function seek(nt) { posterShown = false; const was = playing; if (was) pause(); t = clamp(nt, 0, FILM.total - 0.001); draw(); if (was) play(); }
    ui.play.onclick = () => playing ? pause() : play();
    ui.bar.onclick = e => { const r = ui.bar.getBoundingClientRect(); seek(FILM.total * (e.clientX - r.left) / r.width); };
    ui.sound.onclick = () => { muted = !muted; ui.sound.textContent = muted ? 'Sound off' : 'Sound on'; ui.sound.setAttribute('aria-pressed', String(!muted)); if (muted) stopAudio(); else if (playing) { t0Film = t; startAudio(); } };
    ui.full.onclick = () => { const el = root.querySelector('.screen'); (el.requestFullscreen ? el.requestFullscreen() : Promise.reject()).catch(() => { }); };
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      if (e.code === 'ArrowRight') seek(t + 5); if (e.code === 'ArrowLeft') seek(t - 5);
      if (e.code === 'BracketRight') { const s = FILM.find(t); const i = FILM.seqs.indexOf(s); if (FILM.seqs[i + 1]) seek(FILM.seqs[i + 1].start + 0.001); }
      if (e.code === 'BracketLeft') { const s = FILM.find(t); const i = FILM.seqs.indexOf(s); seek((FILM.seqs[Math.max(0, i - (t - s.start < 1 ? 1 : 0))] || s).start + 0.001); }
    });
    const h = location.hash.replace('#', ''); const js = FILM.seqs.find(s => s.id.toLowerCase() === h.toLowerCase()); if (js) t = js.start + 0.001;
    if (opts.t != null) t = opts.t;
    // a poster frame until the first Play (the film itself opens on black)
    if (opts.poster != null && !js && opts.t == null) { t = opts.poster; posterShown = true; }
    draw();
    FILM.ui = { play, pause, seek, get t() { return t; } };
  };

  // ---------- export hooks (used by tools/export.js and tools/strip.js) ----------
  FILM.mountHeadless = function () { const cv = O.makeCanvas(W, H); mainCtx = cv.getContext('2d'); document.body.appendChild(cv); cv.style.cssText = 'width:100vw;height:56.25vw;display:block'; return cv; };
  FILM.wav = async function (seqIndex, sr) {
    const seq = FILM.seqs[seqIndex]; const buf = await FILM.renderAudio(seq, sr || 48000);
    const n = buf.length, ch = 2, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); ws(36, 'data'); out.setUint32(40, n * ch * 2, true);
    const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L; let o = 44;
    for (let i = 0; i < n; i++) { out.setInt16(o, clamp(L[i], -1, 1) * 32767, true); out.setInt16(o + 2, clamp(R[i], -1, 1) * 32767, true); o += 4; }
    const bytes = new Uint8Array(out.buffer); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
})(window);
