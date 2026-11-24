/* LONG DISTANCE · Q07 GOODNIGHT, GOOD MORNING (20 s) · S07, S08, A030–A032, L008 · bedroom (foot), bathroom, phone
   The routine again, quicker, in the same framings as Q01 and Q02. The phone on the smooth pillow, his hand over it; the phone says
   goodnight exactly as it did before, the same take, sample for sample. Morning: foam, his thumb on the glass, "Good morning.", and
   "I love you." instantly. Brushing; the dusty toothbrush in its glass in the empty half. Nobody will notice the first time.
   The night is Q01's own last shot (FILM.drawShot), so the framing, the light and his hand are the same drawings. The morning uses Q02's
   thread and mirror (FILM.lib.Q02.insert, .mirror) with this morning's messages. */
(function () {
  'use strict';
  const seg = FILM.seg, key = FILM.key, twos = FILM.twos;
  const MSG = PHONE.MSG;
  const Q02 = () => FILM.lib.Q02;

  // the next morning's thread: yesterday's three messages, then his "Good morning." (A031) and her "I love you." at once (A032)
  const THREAD = { clock: 'morning2', history: [['stamp', 'Thu 07:12'], ['her', MSG.goodMorning], ['him', MSG.goodMorningLove], ['her', MSG.iLoveYou]], steps: [
    { stamp: '07:12', at: 0 },
    { him: MSG.goodMorning2, type: [6.7, 8.6], at: 9.0 },
    { at: 9.15, her: MSG.iLoveYou2 },
  ] };

  FILM.seq({
    id: 'Q07', title: 'Goodnight, good morning', dur: 20,
    setup() { if (Q02() && Q02().setup) Q02().setup(); },
    lines: [{ id: 'L008', at: 2.0 }],
    sound(S) {
      S.bed('room_night', 0, 6.5, { level: -46 });
      S.bed('bathroom', 6.5, 20, { level: -44 });
      PHONE.typeTimes(6.7, 8.6, MSG.goodMorning2).forEach(t => S.cue('type', t, { level: -40 }));   // soft taps, one a letter
      S.cue('send', 9.0);
      S.cue('receive', 9.15);
      S.bed('brushing', 9.7, 20, { level: -32 });                    // as in Q02, he brushes again once his thumb is off the glass
    },
    shots: [
      { at: 0, name: 'foot, Q01\'s framing exactly: the phone on the smooth pillow, his hand over it',
        draw(c, st, lt) { const post = FILM.drawShot(c, 'Q01', 42 + lt); if (post) Object.assign(c.post, post); } },
      { at: 6.5, name: 'phone, the bathroom: foam; his thumb on the glass, "Good morning."; "I love you." instantly',
        draw(c, st, lt) { Q02().insert(c, lt, { ex: THREAD, text: MSG.goodMorning2, type: [6.7, 8.6], send: 9.0, lift: 9.55, foam: true }); } },
      { at: 11.0, name: 'mirror, Q02\'s framing: brushing; the dusty toothbrush in its glass in the empty half',
        draw(c, st, lt) { const t = twos(lt);
          Q02().mirror(c, lt, { screen: { screen: 'thread', state: PHONE.exchange(lt, THREAD) }, glow: 1, foamBasin: true,
            gaze: key(t, [[11, [0.05, 0.5]], [15.2, [0.05, 0.5]], [15.5, [0.1, 0.4]], [16.8, [0.1, 0.4]], [17.1, [0.02, 0.5]]]),
            smile: key(t, [[11, 0.12], [15.6, 0.12], [16.2, 0.3], [18, 0.2]]), lids: 0.45, yaw: key(t, [[15.3, -0.05], [15.8, 0.2], [16.9, 0.2], [17.4, -0.04]]) }); } },
    ],
  });
})();
