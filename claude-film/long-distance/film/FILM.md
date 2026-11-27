# LONG DISTANCE: building the film

*Long Distance*, a film by Osita Miles, is code. `FILM.renderAt(t)` draws any instant: the player scrubs, and the exporter steps frames at 24 fps. Everything is deterministic: never use `Math.random` or `Date`. Use `OTM.rng(seed)`, `OTM.vnoise`, `OTM.fbm` and `FILM.wob`.

Root: `claude-film/long-distance`. Read these first, in order:

1. `design/screenplay.txt`: the whole film. Every line on screen comes from it; so does every message on the phone.
2. `design/DECISIONS.md`: what the author has settled (text, cast, look, build).
3. `design/look_b.md`: the look, **Grain and Gloss**. Its grammar, palette, colour script and characters are the doctrine. From `design/look_c.md` (Half Empty) the film takes only its staging grammar (DECISIONS: his half and the empty half; the phone always in the empty half; one room from matching cameras).
4. `src/B1_pillow.html`, `src/B2_waterfall.html`, `src/B3_between.html` and `frames/B*.jpg`: the approved style frames. Port their drawing code freely. `kit/look_b.js` (`GG`) is the look's helper kit: palette `GG.P`, paper textures and pieces, posterised bands, the sculpted heads and hands (`GG.head`, `GG.hand`, `GG.CAST`), the couple, the photo-booth strip, the waterfall, the subtitle style.
5. `design/SEQUENCES.md`: the film shot by shot, with every sequence's timing, lines, sounds, sets and characters.

| File | What |
| --- | --- |
| `kit/otm.js` | The shared drawing kit from *One Too Many* (shapes, light pools, the frame compositor: grain, fibre, halation, vignette). **Never edit it**, nor `kit/figures.js` (not used by this look). |
| `kit/look_b.js` | Look B helpers (`GG`). Add to it only with care: everyone uses it. Prefer your own file's helpers. |
| `film/script.js` (`script.json`) | The screenplay as numbered elements: `L###` dialogue (27 lines), `A###` action, `S##` scenes. **All dialogue comes from here by id. Never type dialogue yourself.** |
| `audio/voice.js` | The recorded takes, keyed by line id, with durations and their treatment (`as`: phone, door, room, bed). Every line is voiced; a subtitle holds for its take. Rebuild with `python3 tools/voice_js.py`. |
| `film/engine.js` | Timeline, shots, camera, the gloss layer, subtitles, `FILM.drawShot`, score collection, player, export hooks |
| `film/sound.js` | The development sound: the voices, plus simple stand-ins for the beds and cues |
| `film/rig.js` | The characters (`RIG`): Him, Her, the coworker, passengers (`film/api/rig.md`) |
| `film/phone.js` | The phone (`PHONE`): body, screens, glow, all gloss (`film/api/phone.md`) |
| `film/sets/*.js` | The environments (`SETS`), each with named views (`film/api/<set>.md`) |
| `film/seq/QNN_*.js` | The eleven sequences, in story order (`film/load.js` lists them) |
| `film/index.html` | The player. `film/headless.html` is for tools; `film/settest.html` shows a set's or the rig's demos. |
| `tools/strip.js`, `tools/frame.js`, `tools/set.js` | Contact sheet of a sequence, one frame, a set's (or the rig's) demo sheet |

## A sequence

```js
// film/seq/Q06_the_waterfall.js
FILM.seq({
  id: 'Q06', title: 'The waterfall', dur: 64,         // seconds; the timeline is the sequences back to back
  setup() { /* optional one-time precompute */ },
  lines: [{ id: 'L007', at: 38.5 }],                  // dialogue: ids from script.js, sequence-local times
  sound(S) {                                          // the sound, in local seconds (names below)
    S.bed('room_night', 0, 64, { level: -46 }); S.cue('receive', 20.5); S.cue('lock', 47.0);
  },
  shots: [                                            // sorted by `at`; a shot lasts until the next one
    { at: 0, name: 'room: the elevation, night', draw(c, st, lt) { /* draw this instant */ } },
    { at: 22, name: 'phone: the image', draw(c, st, lt) { ... }, post: { vig: 0.35 }, fade: (st, dur) => 0 },
  ],
});
```

### The draw context `c` (per frame)

- `c.g` is the **paper world** (Canvas 2D, 1920×1080, full 16:9: never a letterbox). Everything real is drawn here and gets the finish: grain, paper fibre, halation, vignette.
- `c.gl` is the **gloss layer**: a full-resolution canvas, cleared every frame, composited **after** the finish. The phone's body and screen, its pictures, its bubbles, and the smooth edge of its light on a face go here, and nothing else. Anything that should be occluded by the real world (his hand over the phone, a thumb on the glass) must be drawn on `c.gl` too, after the phone, as a grain-matched piece (port B1's approach: the hand drawn into the gloss layer with its own paper texture), or masked out of the gloss layer. `c.glossAlpha` via `c.post.glossAlpha` fades the whole layer.
- `c.em` is the emissive (bloom) buffer, quarter-scale (draw in world coordinates): the bulb, the screen's glow, the waterfall's white.
- `c.t` is global seconds, `c.lt` sequence-local, `st` shot-local (also an argument). `c.frame` is the frame number; `c.shotDur` is the shot length. `c.flash` is true when the shot is being drawn by another sequence (`FILM.drawShot`).
- `c.camera({x, y, zoom, rot, dx, dy})`: the world point `(x,y)` goes to the frame centre at `zoom`, on `c.g`, `c.gl` and `c.em`. Call it before drawing. `c.reset()` returns to screen space.
- `c.cache(key, (g, canvas) => {...}, w, h)`: an offscreen canvas that persists across frames. Use it for every static layer and every head, hand or piece that holds a pose. Prefix keys with your sequence or set id. **Cache anything that doesn't move**: redrawing paper textures or re-sculpting a head every frame is the main cost.
- `c.before.push(cx => ...)` runs after halation, before grain and vignette. `c.after.push(cx => ...)` runs after post and after the gloss layer, before the subtitles.
- `c.post = {...}` or a shot's `post: {...}` overrides the finish: `grain` (default 0.1), `fibre` (0.09), `halation` (0.5), `vig` (the kit's vignette, 0.5), `glossAlpha` (1). A shot's `fade(st, dur)` returns 0..1 of black over the frame.
- Time helpers: `FILM.seg(t, a, b, ease)` gives clamped 0..1 progress. `FILM.key(t, [[t0, v0], [t1, v1, 'outCubic'], ...])` interpolates numbers, arrays or objects (a head's yaw, pitch, lids, gaze, smile). `FILM.twos(t)` snaps character time to 12 fps: **characters animate on twos**; the camera, light, the phone's screen and its glow run on ones. `FILM.ease.*` has linear, in/outQuad, Cubic, inOutSine, outExpo, outBack, `settle` and `weary`, and `bezier(...)`.
- `FILM.drawShot(c, 'Q01', 44)` draws what sequence Q01 shows at its local 44 s into this frame. Q07 uses it to repeat Q01's and Q02's framings exactly.

### Subtitles (`lines`)

`{ id, at, hold, until, x, y, align, size, maxWidth, alpha, style, when, draw, silent, voiceDelay, level }`

- The text and speaker come from the id. Every line id assigned to your sequence must appear **exactly once**, in screenplay order (overlaps are fine; they stack).
- Look B's subtitles, as the author chose: sentence case, Libre Franklin 500, 44 px, cream `#F3ECDD`, the speaker's name first in 700 ("Him: ", "Her: "), bottom centre on a soft dark halo, no box, at most two balanced rows. **The phone's lines are labelled "Her:" and set exactly like the real woman's**: nothing in the type may tell them apart. They are drawn after the finish and the gloss layer, so they are crisp.
- Timing: a 0.12 s fade in, a hold of the take + 0.35 s, a 0.25 s fade out. The take plays from `at`. `hold` / `until` override.
- Keep the bottom band (y 930 to 1060) calm and darker so the cream type reads; if a frame is bright there, darken it with the shot's own light (a shadow, the quilt, the counter edge), never a box.
- Diegetic words are not subtitles: the messages ("Good morning.", "Good morning. I love you.", "I love you.", "Send me one.", "Call me tonight?"), the contact "♥", the clock on the lock screen, the spreadsheet. Draw those on the phone (gloss) or in the world. Messages are verbatim from the action lines (A008–A010, A014, A031, A032, A050).

### Sound (`sound(S)`)

`S.bed(name, t0, t1, params)`, `S.cue(name, t, params)`, `S.silence(t0, t1)` (the world drops out; voices stay), `S.duck(t0, t1, level 0..1)`. Levels are in dB. Voiced lines add their own take (cue `voice`, carrying the take's treatment). **Name every sound you mean**, even where the development engine only plays a tick: the final mix is built from this cue sheet with real recordings and generated effects, so the names are the spotting notes. SEQUENCES.md lists each sequence's sounds; use those names.

- **The sound idea** (DECISIONS): the phone's voice is the same woman's, dry, close and too clean, with no room behind it; the real woman has the room, her breath and the years. The mix does the treatment from each take's `as`; sequences only place the lines.
- **Beds:** `room_night`, `room_day`, `room_dusk`, `bathroom`, `office`, `stairwell`, `bus`, `street_day`, `landing_air`, `pendant_hum`, `fridge_hum`, `murmur` (his wordless voice), plus any descriptive name.
- **Cues:** `receive`, `send`, `type`, `buzz_glass`, `vibrate_desk`, `buzz_muffled`, `lock`, `wake`, `tap`, `laugh_phone`, `knock`, `door_open`, `door_close`, `door_close_soft`, `footsteps`, `footsteps_stairs`, `street_door`, `hangers`, `zip`, `breath`, `breath_in`, `breath_out`, `couch_creak`, `fork_pan`, `chewing`, `brushing`, `tap` (water), plus any descriptive name.
- Silence is an instrument: the room goes quiet when she lets the screen go dark (Q10), and the app makes no sound at all when it opens (Q11: nothing dials, nothing rings).

### Sets (`film/sets/<name>.js`)

```js
SETS.living = {
  views: {
    counter: {                                     // one camera: B2, the counter under the pendant, the fridge behind
      back(c, t, s) { ... },                       // everything behind the characters (cached where static)
      front(c, t, s) { ... },                      // anything in front of the characters: the counter's edge, the pan, the salt
      anchors: { phone: [1338, 888], salt: [1440, 880], strip: [315, 280], head: [830, 330] },   // screen points the choreography needs
      light: { x, y, color },                      // the shot's one motivated light
      split: 0.5,                                  // where his half meets the empty half (0..1 of the width)
    },
  },
  demos: [ { name: 'counter: night', draw(c, t) { const v = SETS.living.views.counter; v.back(c, t, { tod: 'night' }); v.front(c, t, { tod: 'night' }); } } ],
};
```

A set draws the environment only; characters come from `RIG` and the phone from `PHONE`, placed by the sequence between `back` and `front`. `s` carries the state: `tod` (`night`, `later`, `morning`, `day`, `evening`, `dusk`) and whatever the view needs (the wardrobe open, the door open, the bag on the shelf or gone). Every view is cut paper in the look's palette and must look as if it belongs beside the style frames.

### Characters (`film/rig.js`)

`RIG.draw(g, who, pose, opts)` for bodies, `RIG.head(c, who, {yaw, pitch, roll, lids, gaze, smile, mouth, ...})` and `RIG.hand(c, who, pose)` for the sculpted heads and hands, cached by pose; `film/api/rig.md` documents them. Heads and hands are the kit's sculptures (`GG.head`, `GG.hand`); bodies and clothes are cut paper with their own textures. Faces are quiet: small mouths, heavy lids, glances; no cartoon expressions. The colour that comes up his neck (Q04) and leaves his face (Q08) is a cut paper band, rising or draining.

## Story-wide rules

- **Restraint (non-negotiable).** The pictures she sends are never shown. In the stairwell we see only what they do to him; over his shoulder the thread is a blurred grid of skin-toned gloss squares with no shape, by rule. No nudity, no body, nothing sexual. The voice message is never heard. The woman is never drawn as an object to look at. Grief and shame are carried by his face, his hands, the rooms and the light.
- **Verbatim.** Every word on screen is the screenplay's, by id; every message on the phone is verbatim from its action line.
- **Grain and gloss.** Everything real is cut paper with grain. Only the phone and what it makes are smooth, drawn on `c.gl`. Pure white `#FFFFFF` and pure black `#000000` exist only in gloss. The screen's light is the only light not cut into bands.
- **His half and the empty half.** Wherever the frame allows, it divides into his half and the empty half, the seam supplied by the set (the pillows, the glass, the wardrobe's centre, the counter's salt, the couch's middle cushion). The phone sits in the empty half, where a person would be. She fills the empty half for the first time in Q08; in Q11 the phone is back in it.
- **The two kinds of image.** The strip is a real photograph (flash, grain, crooked, four frames, laughing). The waterfall and the app's portrait are gloss: the same faces, the same tilt, too even, lit by a light fixed to the faces. A first-time viewer must not notice; a second-time viewer must not be able to stop noticing. Never caricature the generated images.
- **Colour script** (look_b.md): blue-black night paper with the phone's peach as the only warmth; cold white bathroom mornings; grey card office; raw concrete stairwell; dusk-blue and sodium bus; the pendant's warm cone in the night living room; grey-green daylight for the visit with her copper and bottle green the only saturated real colours; the daylight going blue on the couch at the end.
- **No on-screen text** except the subtitles, the phone's own screens, the spreadsheet's grid, and the title on black at the end of Q11.
- **Cadence.** The routine (Q01–Q07): locked-off frames and slow pushes, shots of 4–8 s. The visit (Q08–Q10): longer, stiller takes; cut on looks, not on lines. The ending (Q11): long holds; the last shot about 14 s.
- **Acting.** He is gentle and ordinary: a 2–3 px breath at 0.25 Hz, heavy lids, small economical movements. She is composed and tired, never cruel. Faces stay quiet; posture and hands carry the feeling.
- **Flash safety.** No more than 3 full-frame luminance changes a second (the bus windows, the phone waking).

## Performance

Aim for under 200 ms per frame in `tools/strip.js` (the headless machine has no GPU; a full pass is about 13,000 frames). The style frames took 6–9 s each because they sculpt heads and texture every paper piece live: in the film, **render each head and hand once per pose, angle and light into `c.cache`**, keep a small set of poses and mouth shapes per shot (on twos), and cache every static paper layer. Paper textures (`GG.texture`, `GG.paperTile`) are made once per set and reused.

The first draw of a new full-frame cached layer costs 35 to 45 ms, because the browser rasterises it then. So cache what stays still for many frames; a layer whose key changes every frame (a moving camera) is cheaper drawn live at lower detail. `ctx.filter = blur(...)` on a full frame costs tens of milliseconds: blur once into a cache.

## Testing

```
cd claude-film/long-distance
node tools/strip.js Q06 1            # contact sheet every 1 s -> out/strip_Q06.png, with ms/frame and warnings
node tools/frame.js Q06 38.5 out/q06.png
node tools/set.js living 1           # a set's demos -> out/set_living.png
node tools/set.js rig 1              # the characters' demos
```

Look at every sheet with the Read tool. Fix, re-render, look again. A sequence is done when every assigned line plays verbatim at the right moment, the story reads with no prior knowledge, the restraint rules hold in every frame, the twist stays hidden until the doorway, and each frame could hang beside the style frames.
