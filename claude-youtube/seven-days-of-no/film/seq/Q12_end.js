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
          const t = c.t; c.set('living', { tod: 'evening', table: false });
          const a = c.anchor('living', 'left'); const waving = t < from + 2.2;
          c.fig('hero', { x: a.x + 90, y: a.y, s: 0.78, face: 1, pose: waving ? 'wave' : 'stand', expr: 'happy', tint: ART.tintFor(c, 'living') });
        } },
    ],
  });
})();
