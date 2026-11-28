/* SEVEN DAYS OF NO — development sound stand-ins (global SOUND), for judging cue timing in the player only. Each named cue
   plays a tiny synthesised sketch; unknown names play a soft tick. The real effects and music are the Sound agent's: the mix
   is built from out/cuesheet.json (tools/cuesheet.js) and muxed over the picture. Deterministic noise (seeded), no samples. */
(function (global) {
  'use strict';
  const SOUND = global.SOUND = {};
  let noiseBuf = null;
  function noise(ac) {
    if (noiseBuf && noiseBuf.sampleRate === ac.sampleRate) return noiseBuf;
    const n = ac.sampleRate, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0), R = global.FILM.rng('noise');
    for (let i = 0; i < n; i++) d[i] = R() * 2 - 1; return (noiseBuf = b);
  }
  function env(ac, out, t, a, d, level) { const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); g.connect(out); return g; }
  function tone(ac, out, t, f, d, level, type, f2) { const o = ac.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); o.connect(env(ac, out, t, 0.005, d, level)); o.start(t); o.stop(t + d + 0.05); }
  function hiss(ac, out, t, d, level, type, f, f2, q) { const s = ac.createBufferSource(); s.buffer = noise(ac); s.loop = true; const fl = ac.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(f || 1200, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d); fl.Q.value = q || 1; s.connect(fl); fl.connect(env(ac, out, t, d * 0.3, d * 0.7, level)); s.start(t); s.stop(t + d + 0.05); }
  const SYN = {
    pop: (ac, o, t) => tone(ac, o, t, 380, 0.09, 0.35, 'sine', 900),
    whoosh: (ac, o, t) => hiss(ac, o, t, 0.4, 0.35, 'bandpass', 400, 3000, 0.8),
    stamp: (ac, o, t) => { tone(ac, o, t, 120, 0.18, 0.6, 'sine', 50); hiss(ac, o, t, 0.08, 0.4, 'lowpass', 1500); },
    ding: (ac, o, t) => { tone(ac, o, t, 1320, 0.6, 0.22); tone(ac, o, t, 1980, 0.4, 0.08); },
    notify: (ac, o, t) => { tone(ac, o, t, 880, 0.12, 0.22); tone(ac, o, t + 0.1, 1320, 0.2, 0.2); },
    receive: (ac, o, t) => { tone(ac, o, t, 990, 0.1, 0.2); tone(ac, o, t + 0.08, 1480, 0.18, 0.18); },
    send: (ac, o, t) => hiss(ac, o, t, 0.22, 0.25, 'bandpass', 1800, 5000, 2),
    phone_buzz: (ac, o, t) => { for (let i = 0; i < 2; i++) tone(ac, o, t + i * 0.32, 155, 0.22, 0.28, 'square'); },
    camera_shutter: (ac, o, t) => { hiss(ac, o, t, 0.05, 0.5, 'highpass', 2500); hiss(ac, o, t + 0.07, 0.06, 0.4, 'highpass', 2000); },
    door: (ac, o, t) => { tone(ac, o, t, 90, 0.3, 0.5, 'sine', 60); hiss(ac, o, t, 0.15, 0.2, 'lowpass', 600); },
    footsteps: (ac, o, t, p) => { const n = (p && p.n) || 4, gap = (p && p.gap) || 0.38; for (let i = 0; i < n; i++) hiss(ac, o, t + i * gap, 0.07, 0.3, 'lowpass', 700); },
    typing: (ac, o, t, p) => { const n = (p && p.n) || 8; const R = global.FILM.rng('type' + t); for (let i = 0; i < n; i++) hiss(ac, o, t + i * 0.11 + R() * 0.04, 0.03, 0.25, 'highpass', 3000); },
    bulb: (ac, o, t) => { tone(ac, o, t, 1046, 0.5, 0.18); tone(ac, o, t + 0.06, 1568, 0.5, 0.14); },
    cloud: (ac, o, t) => tone(ac, o, t, 220, 0.8, 0.15, 'triangle', 165),
    run: (ac, o, t, p) => { for (let i = 0; i < 6; i++) hiss(ac, o, t + i * 0.18, 0.05, 0.3, 'lowpass', 900); },
    flash: (ac, o, t) => hiss(ac, o, t, 0.1, 0.3, 'highpass', 4000),
    tick: (ac, o, t) => tone(ac, o, t, 2000, 0.03, 0.15),
  };
  SOUND.names = Object.keys(SYN);
  // play one cue at AudioContext time `when`
  SOUND.play = function (ac, out, cue, when) { const f = SYN[cue.name] || SYN.tick; try { f(ac, out, when, cue.p); } catch (e) { console.warn('sound ' + cue.name, e); } };
})(window);
