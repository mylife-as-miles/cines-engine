/* Q12 · END SCREEN (the last word to 225.5 s)
   A clean wipe in. 8 s of music on the living-room ground, softly dimmed, with the hero small at the far left: the right
   two-thirds of the frame stay clear for YouTube's end-screen elements (videos and subscribe, placed in YouTube Studio). A small
   loop keeps it alive: he waves, then holds his tea (steam rising) and sips once; he blinks and breathes; the lamp's glow breathes. */
(function () {
  'use strict';
  const from = FILM.Wend('next one');
  const { seg } = FILM;
  FILM.seq({
    id: 'Q12', title: 'End screen', chapter: null, from,
    sound(S) { S.bed('music_end', from, FILM.TOTAL, { mood: 'cozy outro, resolves by the end', fadeOut: 2.0 }); S.cue('whoosh', from - 0.05); },
    shots: [
      { at: from, name: 'end screen: the living room, the hero small at the far left (the right two-thirds clear)', in: { type: 'wipe', dir: 'right' },
        draw(c) {
          const t = c.t, g = c.g; c.set('living', { tod: 'evening', table: false });
          // the lamp's glow, breathing
          const L = c.anchor('living', 'lamp'), k = 0.5 + 0.5 * Math.sin((t - from) * Math.PI * 2 / 3.2);
          g.save(); const gr = g.createRadialGradient(L.x + 10, L.y, 20, L.x + 10, L.y, 360); gr.addColorStop(0, `rgba(255,214,140,${0.30 + 0.16 * k})`); gr.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gr; g.fillRect(L.x - 360, L.y - 360, 720, 720); g.restore();
          // a soft veil over the right two-thirds, so the end-screen elements sit on a calm ground
          c.screen(); const vg = g.createLinearGradient(560, 0, 900, 0); vg.addColorStop(0, 'rgba(60,30,30,0)'); vg.addColorStop(1, 'rgba(60,30,30,0.16)'); g.fillStyle = vg; g.fillRect(560, 0, 1360, 1080); c.reset();
          const waving = t < from + 2.4, sipping = t > from + 4.6 && t < from + 5.8;
          const h = c.fig('hero', { x: 300, y: 1010, s: 0.62, face: 1, pose: waving ? 'wave' : 'stand', phase: (t - from) * 1.6, hold: sipping ? 'sip' : 'mug', expr: 'happy', turn: 0.2, dy: -FILM.breath(t, 2) * 0.6, tint: ART.tintFor(c, 'living') });
          // steam from the cup, looping (the hand holding the mug is the near hand)
          if (!sipping) { const hn = ART.hand('hero', h, waving ? 'back' : 'back'); g.save(); g.lineWidth = 4; g.strokeStyle = 'rgba(255,248,236,0.75)'; g.lineCap = 'round';
            for (let i = 0; i < 2; i++) { const ph = ((t - from) * 0.7 + i * 0.5) % 1; const x0 = hn.x + 30 + i * 14, y0 = hn.y - 40 - ph * 70; g.globalAlpha = Math.sin(ph * Math.PI); g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + 10, y0 - 15, x0 - 10, y0 - 30, x0 + 4, y0 - 46); g.stroke(); } g.restore(); }
        } },
    ],
  });
})();
