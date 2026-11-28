/* Q09 · INSIGHT: FEAR, NOT KINDNESS ("Here's what I noticed" to "So, do not say no")
   plain, the bulb lights. "Most of our yeses are not kindness": a big YES card in the hero's hands; "They are fear": it flips to
   show a scared face. "stop liking us": the cast's portraits around him, frowning. "That guilty feeling on Tuesday": the grey
   cloud from Q03 drifts back in. "changing a habit": the cloud rains a little and a small green sprout grows under it. */
(function () {
  'use strict';
  const { W, Wend } = FILM.from(FILM.W("here's"));
  const { seg, pop, ease } = FILM;
  const T = {
    start: W("here's"), noticed: W('noticed'), most: W('most of'), kindness: W('kindness'), fear: W('fear'), fearThat: W('fear that'), liking: W('liking'),
    guilty: W('that guilty'), tuesday: W('tuesday'), proof: W('proof'), changing: W('changing'), habit: W('habit'), like: Wend('like'),
    end: FILM.W('so do not'),
  };
  const CAST = [['boss', 330, 300, 'angry'], ['friend', 1590, 300, 'angry'], ['mum', 360, 790, 'sad'], ['coworker', 1560, 790, 'confused'], ['stranger', 1290, 135, 'sad']];

  FILM.seq({
    id: 'Q09', title: 'Why we say yes', chapter: 'Why we say yes', from: T.start,
    sound(S) {
      S.bed('music', T.start, T.end, { mood: 'reflective, soft' });
      S.cue('pop', T.start + 0.2); S.cue('bulb', T.noticed); S.cue('pop', T.most + 0.1); S.cue('whoosh', T.fear - 0.1); S.cue('scared', T.fear + 0.1);
      CAST.forEach((p, i) => S.cue('pop', T.fearThat + 0.1 + i * 0.22)); S.cue('cloud', T.guilty + 0.2); S.cue('rain', T.changing); S.cue('grow', T.habit);
    },
    shots: [
      { at: T.start, name: 'plain: the bulb lights', in: { type: 'wipe', dir: 'right', color: '#3A8594' },
        draw(c) { const h = STAGE.plainHero(c, { pose: 'think', expr: c.t > T.noticed ? 'surprised' : 'neutral' }); STAGE.bulb(c, 'hero', h, T.start + 0.2, T.noticed); } },
      { at: T.most, name: 'plain: a big YES card in his hands; it flips to a scared face',
        draw(c) {
          const t = c.t, h = STAGE.plainHero(c, { pose: 'hold_card', expr: t > T.fear ? 'scared' : 'neutral' });
          const hl = ART.hand('hero', h, 'back'), hr = ART.hand('hero', h, 'front'); const cx = (hl.x + hr.x) / 2, cy = (hl.y + hr.y) / 2 - 40;
          const u = seg(t, T.fear - 0.1, T.fear + 0.25, 'inOutCubic'), flip = Math.cos(u * Math.PI);
          GFX.at(c.g, cx, cy, pop(t, T.most + 0.1, 0.34), q => GFX.wordCard(q, 0, 0, 520, 360, 'YES', { flip, size: 170, backExpr: 'scared' }));
        } },
      { at: T.fearThat, name: 'plain: the cast around him, frowning: stop liking us', push: { from: 1.05, to: 1 },
        draw(c) {
          const t = c.t; STAGE.plainHero(c, { expr: 'scared', faceOver: { look: [Math.sin(t * 1.5) * 0.6, -0.1] } });
          CAST.forEach(([who, x, y, expr], i) => GFX.at(c.g, x, y, pop(t, T.fearThat + 0.1 + i * 0.22, 0.32), () => { c.g.translate(-x, -y); GFX.portrait(c, who, x, y, 130, { expr }); }));
        } },
      { at: T.guilty, name: 'plain: the grey cloud from Tuesday drifts back in',
        draw(c) {
          const t = c.t, h = STAGE.plainHero(c, { expr: 'guilty' }); const hd = ART.head('hero', h);
          const x = 1500 + 520 * (1 - ease.outCubic(seg(t, T.guilty, T.guilty + 1.6))), y = hd.y - hd.r * 1.6 + Math.sin(t * 1.8) * 8;
          GFX.cloud(c.g, x, y, 1.1);
        } },
      { at: T.changing, name: 'plain: the cloud rains a little; a green sprout grows under it',
        draw(c) {
          const t = c.t, h = STAGE.plainHero(c, { expr: t > T.habit ? 'happy' : 'guilty' }); const hd = ART.head('hero', h);
          const x = 1500, y = hd.y - hd.r * 1.6 + Math.sin(t * 1.8) * 8;
          GFX.cloud(c.g, x, y, 1.1, { rain: seg(t, T.changing, T.changing + 0.3), t }); GFX.sprout(c.g, x, 900, 1.3, seg(t, T.habit - 0.1, T.like));
        } },
    ],
  });
})();
