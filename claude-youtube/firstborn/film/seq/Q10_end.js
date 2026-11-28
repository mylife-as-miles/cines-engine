/* Q10 · END SCREEN (8 s after the last word)
   The family room, softened (blurred, a cream veil) behind the right two-thirds where YouTube's end-screen elements sit; the hero
   at the left third with an idle loop: a breath, blinks, a weight shift, a little wave as it opens, a glance toward the right. */
(function () {
  'use strict';
  const T0 = FILM.Wend('next one') + 0.3;
  const { seg, ease } = FILM;
  // the room once into a cached layer: crisp on the left, blurred and veiled on the right two-thirds, blended across a soft edge
  function room(c) {
    return FILM.cache('end|room', (q, cv) => {
      const draw = g => { const S = typeof SETS !== 'undefined' && SETS && SETS.home; if (S) { try { SETS.home(g, { tod: 'day', t: 0 }); if (SETS.homeFront) SETS.homeFront(g, { tod: 'day' }); return; } catch (e) { } } g.fillStyle = '#F6D3A2'; g.fillRect(0, 0, 1920, 1080); g.fillStyle = '#E4AB77'; g.fillRect(0, 820, 1920, 260); };
      draw(q);
      const soft = FILM.makeCanvas(1920, 1080), s = soft.getContext('2d'); s.filter = 'blur(14px)'; draw(s); s.filter = 'none';
      s.fillStyle = 'rgba(255,246,230,0.55)'; s.fillRect(0, 0, 1920, 1080);
      s.globalCompositeOperation = 'destination-in'; const gr = s.createLinearGradient(560, 0, 760, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); s.fillStyle = gr; s.fillRect(0, 0, 1920, 1080);
      q.drawImage(soft, 0, 0);
    });
  }
  FILM.seq({
    id: 'Q10', title: 'End screen', from: T0, bg: '#F6D3A2',
    sound(S) { S.bed('music', T0, FILM.TOTAL, { mood: 'the closing theme resolving; fade out by the end' }); },
    shots: [
      { at: T0, name: 'end screen: the room softened behind the right two-thirds, the hero at the left, idling', in: 'fade', push: { from: 1, to: 1.03, x: 320, y: 600 },
        draw(c) {
          const t = c.t, lt = t - T0; c.g.drawImage(room(c), 0, 0);
          const wave = lt < 2.2, glance = lt > 4 && lt < 5.6;
          c.fig('hero', { x: 330 + 8 * Math.sin(lt * 0.7), y: 1000, s: 0.95, face: 1, pose: wave ? 'wave' : 'stand', phase: lt * 1.4, expr: 'happy',
            turn: glance ? 0.5 : 0.05 * Math.sin(lt * 0.9), look: glance ? [1, 0] : [0, 0], dy: -FILM.breath(t, 1), blinks: [T0 + 1.2, T0 + 3.4, T0 + 5.9, T0 + 6.15], nod: 0.06 * Math.sin(lt * 1.3) });
        } },
    ],
  });
})();
