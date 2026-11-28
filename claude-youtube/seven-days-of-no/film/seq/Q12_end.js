/* Q12 · END SCREEN (the last word to 225.5 s)
   8 s of music on a clean living-room ground with the hero small at one side, leaving the rest of the frame free for YouTube's
   end-screen elements (videos and subscribe, placed in YouTube Studio). Nothing else moves but his breath and a slow wave. */
(function () {
  'use strict';
  const from = FILM.Wend('next one');
  FILM.seq({
    id: 'Q12', title: 'End screen', chapter: null, from,
    sound(S) { S.bed('music_end', from, FILM.TOTAL, { mood: 'cozy outro, resolves by the end', fadeOut: 2.0 }); S.cue('whoosh', from); },
    shots: [
      { at: from, name: 'end screen: the living room, the hero small at the left', in: 'fade',
        draw(c) {
          const t = c.t;
          // seated on the sofa's left seat, waving for the first seconds, then settled (the right of the frame stays clear)
          const waving = t < from + 2.4;
          STAGE.heroSofa(c, { tod: 'evening', table: false }, { seat_at: 'sofa_seat_l', pose: waving ? 'sit_handup' : 'sit_front', hold: waving ? undefined : 'mug', expr: 'happy', noFront: true,
            override: waving ? { armR: { a: 2.3 + 0.18 * Math.sin(t * 9), e: 0.5, hand: 'open', flip: 1 } } : null });
        } },
    ],
  });
})();
