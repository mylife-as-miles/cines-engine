/* Q12 · END SCREEN (the last word to 225.5 s)
   A clean wipe in. 8 s of music on the living-room ground with the hero at the far left (0.85 scale); the room behind the right
   two-thirds is softened (blurred and veiled) so YouTube's end-screen elements (videos and subscribe, placed in YouTube Studio)
   sit on a quiet ground. A small loop keeps it alive: he waves, holds his tea (steam rising), sips once; he blinks and breathes;
   the lamp's glow breathes. */
(function () {
  'use strict';
  const from = FILM.Wend('next one');
  const { seg } = FILM;
  const ROOM = { tod: 'evening', table: false };
  FILM.seq({
    id: 'Q12', title: 'End screen', chapter: null, from,
    sound(S) { S.bed('music_end', from, FILM.TOTAL, { mood: 'cozy outro, resolves by the end', fadeOut: 2.0 }); S.cue('whoosh', from - 0.05); },
    shots: [
      { at: from, name: 'end screen: the living room softened on the right; the hero at the far left', in: { type: 'wipe', dir: 'right' },
        draw(c) {
          const t = c.t, g = c.g; c.set('living', ROOM);
          // the right two-thirds: the same room, blurred and veiled, blended in from x 520 to 760 (drawn once, cached)
          const sharp = FILM.cache('Q12|room', q => { const cc = Object.assign({}, c, { g: q, sets: {}, _cam: null }); ART.set(cc, 'living', ROOM); });
          const soft = FILM.cache('Q12|soft', q => {
            q.filter = 'blur(16px)'; q.drawImage(sharp, -20, -20, 1960, 1120); q.filter = 'none';
            q.fillStyle = 'rgba(70,40,40,0.28)'; q.fillRect(0, 0, 1920, 1080);
            q.globalCompositeOperation = 'destination-in'; const m = q.createLinearGradient(520, 0, 760, 0); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)'); q.fillStyle = m; q.fillRect(0, 0, 1920, 1080);
          });
          // the lamp's glow, breathing (in the sharp left third)
          const L = c.anchor('living', 'lamp'), k = 0.5 + 0.5 * Math.sin((t - from) * Math.PI * 2 / 3.2);
          g.save(); const gr = g.createRadialGradient(L.x + 10, L.y, 20, L.x + 10, L.y, 340); gr.addColorStop(0, `rgba(255,214,140,${0.28 + 0.16 * k})`); gr.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gr; g.fillRect(L.x - 340, L.y - 340, 680, 680); g.restore();
          c.screen(); g.drawImage(soft, 0, 0); c.reset();
          const waving = t < from + 2.4, sipping = t > from + 4.6 && t < from + 5.8;
          const h = c.fig('hero', { x: 330, y: 1040, s: 0.85, face: 1, pose: waving ? 'wave' : 'stand', phase: (t - from) * 1.6, hold: sipping ? 'sip' : 'mug', expr: 'happy', turn: 0.2, tint: ART.tintFor(c, 'living') });
          if (!sipping) { const hn = ART.hand('hero', h, 'back'); g.save(); g.lineWidth = 5; g.strokeStyle = 'rgba(255,248,236,0.75)'; g.lineCap = 'round';
            for (let i = 0; i < 2; i++) { const ph = ((t - from) * 0.7 + i * 0.5) % 1; const x0 = hn.x + 40 + i * 18, y0 = hn.y - 52 - ph * 90; g.globalAlpha = Math.sin(ph * Math.PI); g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + 12, y0 - 18, x0 - 12, y0 - 36, x0 + 5, y0 - 56); g.stroke(); } g.restore(); }
        } },
    ],
  });
})();
