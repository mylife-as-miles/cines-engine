/* AUTOPILOT — the development sound engine.
   It plays the recorded voices (Daniel's V.O.; the radio through a small-speaker filter) at their lines' times, and simple
   synthesised stand-ins for the beds and cues the sequences declare, so timing can be judged in the player. The final soundtrack
   is mixed offline from real recordings, the score and these same voices (audio/README.md), using the same cue sheet.
   Unknown cue names play a soft tick, so a sequence may name a cue for the mixer before any stand-in exists. */
(function (global) {
  'use strict';
  const SOUND = global.SOUND = { cues: {}, beds: {} };
  const db = d => Math.pow(10, d / 20); SOUND.db = db;
  const buffers = {};
  function b64ToBuf(b64) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  SOUND.ready = async function (ac) {
    const V = global.FILM_VOICES || {};
    for (const id in V) if (V[id].b64 && !buffers[id]) { try { buffers[id] = await ac.decodeAudioData(b64ToBuf(V[id].b64)); } catch (e) { console.warn('voice ' + id, e); } }
  };
  // ---- tiny helpers ----
  function noise(ac, secs, colour, seed) {
    const n = Math.max(1, Math.ceil(secs * ac.sampleRate)), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); const R = global.OTM.rng('noise' + (seed || colour));
    let last = 0; for (let i = 0; i < n; i++) { const w = R() * 2 - 1; if (colour === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }
  function src(ac, buf, loop) { const s = ac.createBufferSource(); s.buffer = buf; s.loop = !!loop; return s; }
  function filt(ac, type, f, q) { const x = ac.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q != null) x.Q.value = q; return x; }
  function gain(ac, v) { const g = ac.createGain(); g.gain.value = v; return g; }
  function chain(...n) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; }
  function env(g, t0, t1, level, fi, fo) { const p = g.gain; p.setValueAtTime(0, t0); p.linearRampToValueAtTime(level, t0 + (fi || 0.4)); p.setValueAtTime(level, Math.max(t0 + (fi || 0.4), t1 - (fo || 0.6))); p.linearRampToValueAtTime(0, t1); }
  function tone(ac, out, t, f, dur, level, type) { const o = ac.createOscillator(); o.type = type || 'sine'; o.frequency.value = f; const g = gain(ac, 0); o.connect(g); g.connect(out); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.start(t); o.stop(t + dur + 0.05); }
  function burst(ac, out, t, dur, f, q, level) { const s = src(ac, noise(ac, dur + 0.05, 'white', 'b' + f)); const fl = filt(ac, 'bandpass', f, q || 1.2); const g = gain(ac, 0); chain(s, fl, g, out); g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); s.start(t); s.stop(t + dur + 0.05); }
  Object.assign(SOUND, { noise, src, filt, gain, chain, env, tone, burst });

  function buses(ac) {
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.connect(ac.destination);
    const master = gain(ac, 1); master.connect(comp);
    const world = gain(ac, 1); world.connect(master);                  // everything the world makes; silenced by S.silence
    const voice = gain(ac, 1); voice.connect(master);                  // Daniel's V.O.: never silenced
    // the radio: a small speaker in a car or a kitchen
    const radio = gain(ac, 1); const hp = filt(ac, 'highpass', 320, 0.7), lp = filt(ac, 'lowpass', 3400, 0.9), pk = filt(ac, 'peaking', 1600, 1.2); pk.gain.value = 5;
    const sh = ac.createWaveShaper(); const k = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; k[i] = Math.tanh(1.8 * x) / Math.tanh(1.8); } sh.curve = k;
    chain(radio, hp, lp, pk, sh, world);
    return { master, world, voice, radio, room: world, fx: world };
  }

  // ---- beds: (ac, B, t0, t1, p) ----
  const nbed = (colour, type, f, q, level) => (ac, B, t0, t1, p) => { const s = src(ac, noise(ac, 4, colour, type + f), true); const fl = filt(ac, type, p.f || f, q); const g = gain(ac, 0); chain(s, fl, g, B.world); env(g, t0, t1, db(p.level != null ? p.level : level), p.fi, p.fo); s.start(t0); s.stop(t1 + 0.1); };
  SOUND.beds.room = nbed('brown', 'lowpass', 420, 0.5, -40);           // a quiet house, a room's air
  SOUND.beds.traffic = nbed('brown', 'lowpass', 700, 0.6, -34);       // traffic outside, tyres on the road
  SOUND.beds.city = nbed('white', 'lowpass', 1500, 0.4, -40);         // the hot city
  SOUND.beds.shower = nbed('white', 'bandpass', 3800, 0.6, -30);      // water on glass
  SOUND.beds.heat = nbed('white', 'highpass', 7000, 0.4, -50);        // a dry high shimmer for the heat
  SOUND.beds.ac = (ac, B, t0, t1, p) => { nbed('white', 'bandpass', 900, 0.4, -46)(ac, B, t0, t1, p); [100, 200, 300].forEach((f, i) => { const o = ac.createOscillator(); o.frequency.value = f; const g = gain(ac, 0); chain(o, g, B.world); env(g, t0, t1, db((p.level != null ? p.level : -46) - 6 - 6 * i), p.fi, p.fo); o.start(t0); o.stop(t1 + 0.1); }); };
  SOUND.beds.engine = (ac, B, t0, t1, p) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = p.f || 38; const fl = filt(ac, 'lowpass', 160, 0.8); const g = gain(ac, 0); chain(o, fl, g, B.world); env(g, t0, t1, db(p.level != null ? p.level : -34), p.fi || 0.6, p.fo); o.start(t0); o.stop(t1 + 0.1); nbed('brown', 'lowpass', 300, 0.6, (p.level != null ? p.level : -34) - 4)(ac, B, t0, t1, p); };
  SOUND.beds.tinnitus = (ac, B, t0, t1, p) => { const o = ac.createOscillator(); o.frequency.value = p.f || 7200; const g = gain(ac, 0); chain(o, g, B.voice); env(g, t0, t1, db(p.level != null ? p.level : -40), p.fi || 3, p.fo || 0.5); o.start(t0); o.stop(t1 + 0.1); };
  SOUND.beds.projector = (ac, B, t0, t1, p) => SOUND.beds.ac(ac, B, t0, t1, Object.assign({ level: -44 }, p));

  // ---- cues: (ac, B, t, p) ----
  const C = SOUND.cues;
  C.alarm = (ac, B, t, p) => { const n = p.n || 2; for (let r = 0; r < n; r++) [988, 1319, 1568, 1319].forEach((f, i) => tone(ac, B.fx, t + r * 1.1 + i * 0.14, f, 0.22, db(p.level || -22), 'triangle')); };
  C.vibrate = (ac, B, t, p) => { for (let i = 0; i < (p.n || 2); i++) burst(ac, B.fx, t + i * 0.5, 0.32, 180, 3, db(p.level || -24)); };
  C.chime = (ac, B, t, p) => { tone(ac, B.fx, t, 1047, 0.5, db(p.level || -26)); tone(ac, B.fx, t + 0.12, 1568, 0.7, db((p.level || -26) - 2)); };
  C.click = (ac, B, t, p) => burst(ac, B.fx, t, 0.03, 3200, 2, db(p.level || -20));
  C.harness = (ac, B, t, p) => { burst(ac, B.fx, t, 0.04, 2400, 3, db(p.level || -18)); burst(ac, B.fx, t + 0.05, 0.03, 4200, 3, db((p.level || -18) - 4)); };
  C.door = (ac, B, t, p) => { burst(ac, B.fx, t, 0.18, 120, 0.8, db(p.level || -14)); burst(ac, B.fx, t, 0.05, 1800, 1, db((p.level || -14) - 8)); };
  C.handle = (ac, B, t, p) => { burst(ac, B.fx, t, 0.06, 900, 2, db(p.level || -18)); burst(ac, B.fx, t + 0.07, 0.05, 600, 2, db((p.level || -18) - 3)); };
  C.beep = (ac, B, t, p) => { for (let i = 0; i < (p.n || 2); i++) tone(ac, B.fx, t + i * 0.16, 2100, 0.1, db(p.level || -22), 'square'); };
  C.ignition = (ac, B, t, p) => { burst(ac, B.fx, t, 0.6, 400, 0.7, db(p.level || -18)); };
  C.indicator = (ac, B, t, p) => { for (let i = 0; i < (p.n || 6); i++) burst(ac, B.fx, t + i * 0.42, 0.02, i % 2 ? 1800 : 2400, 4, db(p.level || -26)); };
  C.ring = (ac, B, t, p) => { for (let r = 0; r < (p.n || 2); r++) for (let i = 0; i < 12; i++) tone(ac, B.fx, t + r * 2 + i * 0.05, i % 2 ? 1250 : 1000, 0.05, db(p.level || -26), 'square'); };
  C.email = (ac, B, t, p) => { burst(ac, B.fx, t, 0.3, 2500, 0.8, db((p.level || -26) - 6)); tone(ac, B.fx, t + 0.18, 1318, 0.4, db(p.level || -26)); };
  C.stutter = (ac, B, t, p) => { for (let i = 0; i < 5; i++) burst(ac, B.fx, t + i * 0.19 + (i % 2) * 0.05, 0.12, 700, 1.5, db(p.level || -24)); };
  C.flash = (ac, B, t, p) => { burst(ac, B.fx, t, 0.35, 5200, 0.6, db(p.level || -26)); tone(ac, B.fx, t, 62, 0.9, db((p.level || -26) + 4)); };
  C.hit = (ac, B, t, p) => tone(ac, B.fx, t, p.f || 48, p.decay || 2.4, db(p.level || -16));
  C.keys = (ac, B, t, p) => { for (let i = 0; i < 5; i++) tone(ac, B.fx, t + i * 0.035, 3000 + 700 * (i % 3), 0.12, db(p.level || -30), 'triangle'); };
  C.gravel = (ac, B, t, p) => { for (let i = 0; i < 26; i++) burst(ac, B.fx, t + i * 0.06, 0.05, 1600 + 400 * (i % 3), 2, db((p.level || -26) - (i % 4))); };
  C.whoosh = (ac, B, t, p) => burst(ac, B.fx, t, p.dur || 0.8, 900, 0.5, db(p.level || -26));
  C.breath = (ac, B, t, p) => burst(ac, B.voice, t, p.dur || 0.6, 1100, 0.7, db(p.level || -30));
  const tick = (ac, B, t, p) => burst(ac, B.fx, t, 0.025, 2600, 3, db(p.level || -30));

  SOUND.build = function (ac, ev, seq) {
    const B = buses(ac);
    for (const b of ev.beds) { const fn = SOUND.beds[b.name]; if (fn) fn(ac, B, b.t0, b.t1, b.p || {}); }
    for (const q of ev.cues) {
      if (q.name === 'voice' || q.name === 'radio') {
        const buf = buffers[q.p.id]; if (!buf) continue; const s = ac.createBufferSource(); s.buffer = buf;
        const g = gain(ac, db(q.p.level != null ? q.p.level : (q.name === 'radio' ? -8 : 0))); chain(s, g, q.name === 'radio' ? B.radio : B.voice); s.start(Math.max(0, q.t)); continue;
      }
      (C[q.name] || tick)(ac, B, q.t, q.p || {});
    }
    // the world drops out: everything but Daniel's voice
    for (const s of ev.silences) { const p = B.world.gain; p.setValueAtTime(1, Math.max(0, s.t0 - 0.02)); p.linearRampToValueAtTime(0, s.t0 + 0.04); p.setValueAtTime(0, s.t1); p.linearRampToValueAtTime(1, s.t1 + 0.3); }
    for (const d of ev.ducks) { const p = B.world.gain; p.setValueAtTime(1, d.t0); p.linearRampToValueAtTime(d.level, d.t0 + 0.3); p.setValueAtTime(d.level, d.t1); p.linearRampToValueAtTime(1, d.t1 + 0.4); }
  };
})(window);
