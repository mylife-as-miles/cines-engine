# AUTOPILOT: building the film

*Autopilot*, a film by Osita Miles, is code. `FILM.renderAt(t)` draws any instant: the player scrubs, and the exporter steps frames at 24 fps. Everything is deterministic: never use `Math.random` or `Date`. Use `OTM.rng(seed)`, `OTM.vnoise`, `OTM.fbm` and `FILM.wob`.

Root: `films/autopilot`. Read these first, in order:

1. `design/screenplay.txt`: the whole film. Every line on screen comes from it.
2. `design/DECISIONS.md`: what the author has settled (look, frame, subtitles, voices, restraint, the ending).
3. `design/look_c.md`: the look, **Through Glass**. Its grammar, palette, colour script and characters are the doctrine.
4. `src/C1_counter.html`, `src/C2_mirror.html`, `src/C3_door.html` and `frames/C*.jpg`: the approved style frames. Port their drawing code freely. `kit/look_c.js` (`LC`) is the look's helper kit: palette `LC.P`, the pinhole camera `LC.camera`, glass (glare, specks, smudge, refraction), environment-mapped chrome, stepped gradients, captions.
5. `design/SEQUENCES.md`: the film shot by shot, with every sequence's timing, lines, sets and characters.

| File | What |
| --- | --- |
| `kit/otm.js` | The shared drawing kit from *One Too Many* (shapes, light pools, silhouettes, the frame compositor). **Never edit it**, nor `kit/figures.js`. |
| `kit/look_c.js` | Look C helpers. Add to it only with care: everyone uses it. Prefer your own file's helpers. |
| `film/script.js` (`script.json`) | The screenplay as numbered elements: `L###` dialogue (52 lines), `A###` action, `S##` scenes. **All dialogue comes from here by id. Never type dialogue yourself.** |
| `audio/voice.js` | The recorded takes (Daniel's V.O., the radio presenter), keyed by line id, with durations. A voiced line's subtitle holds for its take. |
| `film/engine.js` | Timeline, shots, camera, subtitles, `FILM.drawShot` (flash cuts), score collection, player, export hooks |
| `film/sound.js` | The development sound: the voices, plus simple stand-ins for the beds and cues |
| `film/rig.js` | The characters (`RIG`): Daniel, Emily, Sarah, Priya and the extras (`film/api/rig.md`) |
| `film/sets/*.js` | The environments (`SETS`), each with named views (`film/api/<set>.md`) |
| `film/seq/QNN_*.js` | The twelve sequences, in story order (`film/load.js` lists them) |
| `film/index.html` | The player. `film/headless.html` is for tools; `film/settest.html` shows a set's or the rig's demos. |
| `tools/strip.js`, `tools/frame.js`, `tools/set.js` | Contact sheet of a sequence, one frame, a set's (or the rig's) demo sheet |

## A sequence

```js
// film/seq/Q05_the_mirror.js
FILM.seq({
  id: 'Q05', title: 'The mirror', dur: 68,            // seconds; the timeline is the sequences back to back
  setup() { /* optional one-time precompute */ },
  lines: [                                            // dialogue: ids from script.js, sequence-local times
    { id: 'L014', at: 28.0 },                          // bottom-centre subtitle, timed automatically
    { id: 'L017', at: 44.0 }, { id: 'L018', at: 45.4 },  // overlapping lines stack, newest at the bottom
  ],
  sound(S) {                                          // the sound, in local seconds (names below)
    S.bed('engine', 58, 68, { level: -34 }); S.cue('harness', 22.4); S.cue('door', 23.6);
  },
  shots: [                                            // sorted by `at`; a shot lasts until the next one
    { at: 0, name: 'ext: the car baking', draw(c, st, lt) { /* draw this instant */ } },
    { at: 25, name: 'mirror: the hard white strip', draw(c, st, lt) { ... }, post: { vig: 0.38 }, fade: (st, dur) => 0 },
  ],
});
```

### The draw context `c` (per frame)

- `c.g` is the world (Canvas 2D, 1920×1080, full 16:9: there is never a letterbox). Draw everything here. `c.em` is the emissive (bloom) buffer: it is already quarter-scale, so draw in world coordinates; use it for light sources only (the sun, screens, lamps, the phone's green).
- `c.t` is global seconds, `c.lt` sequence-local, `st` shot-local (also an argument). `c.frame` is the frame number; `c.shotDur` is the shot length. `c.flash` is true when the shot is being drawn as a flash cut by another sequence.
- `c.camera({x, y, zoom, rot, dx, dy})`: the world point `(x,y)` goes to the frame centre at `zoom`, on `c.g` and `c.em`. Call it before drawing the world. `c.reset()` returns to screen space. For true perspective, lay sets out with `LC.camera` as the style frames do; `c.camera` is for pushes and drift on top.
- `c.cache(key, (g, canvas) => {...}, w, h)`: an offscreen canvas that persists across frames. Use it for every static layer. Prefix keys with your sequence or set id. **Cache anything that doesn't move**: redrawing a set every frame is the main cost.
- `c.before.push(cx => ...)` runs after halation, before grain and vignette. `c.after.push(cx => ...)` runs after post (flash frames, a cut to white or black).
- `c.post = {...}` or a shot's `post: {...}` overrides the finish: `grain` (default 0.05), `halation` (0.55), `vig` (the teal vignette, 0.4), `vigColor`. A shot's `fade(st, dur)` returns 0..1 of black over the frame.
- Time helpers: `FILM.seg(t, a, b, ease)` gives clamped 0..1 progress. `FILM.key(t, [[t0, v0], [t1, v1, 'outCubic'], ...])` interpolates numbers, arrays or objects. `FILM.twos(t)` snaps character pose time to 12 fps: **characters animate on twos**; camera, light, glass, type and particles run on ones. `FILM.ease.*` has linear, in/outQuad, Cubic, inOutSine, outExpo, outBack, `settle` and `weary` (a tired, late ease for Daniel), and `bezier(...)`.
- `FILM.drawShot(c, 'Q02', 21.5)` draws what sequence Q02 shows at its local 21.5 s into this frame, and returns that shot's post settings (`c.post = FILM.drawShot(...)` adopts them). **The flash cuts are the morning's own images**: use this for them, never a redraw.

### Subtitles (`lines`)

`{ id, at, hold, until, x, y, align, size, maxWidth, alpha, style, when, draw, silent, voiceDelay, level }`

- The text and speaker come from the id. Every line id assigned to your sequence must appear **exactly once**, in screenplay order (overlaps are fine). The one exception is L052, "Autopilot disengaged.", which the author cut from the film (`design/DECISIONS.md`).
- They are Look C's in-picture subtitles, as the author asked (the Look B idiom): sentence case, Libre Franklin, bottom centre, a soft dark halo and no box, wrapped to at most two balanced rows. The engine sets the screenplay's `--` as a dash and its apostrophes properly; the words stay verbatim.
  - Scene dialogue is only ever type: bold 700, 44 px, white. Emily's lines are in her yellow `#E0B34F`.
  - Daniel's V.O. is voiced: 500, 40 px, bone `#E6E0D2`. Its subtitle holds for the recorded take (`audio/voice.js`), and the take plays from `at`.
  - The radio presenter is voiced through a small speaker: italic 500, 36 px, slightly dim.
- Timing: a 0.12 s fade in, then a hold (voiced: the take + 0.35 s; read: `max(1.3, 0.55 + 0.062 × characters)` s), then a 0.25 s fade out. `hold` / `until` override it. Leave room: a line should not start until the previous speaker's line is readable.
- Lines are drawn in screen space after the world, so **they survive cuts**. Keep the bottom-centre band (y 900 to 1060) calm and darker in your compositions so white type reads; if a frame is bright there, darken it with the shot's own light (a shadow, a dashboard, a counter edge), never a box.
- `draw(c, s, o)` replaces the default drawing for a special case (`s.alpha`, `o.rows`, `o.st`). There should be almost none.
- Diegetic words are not subtitles: the phone's 6:14 and BATTERY 7%, the dashboard's 8:32, the conference-room clock, the laptop's 5:37, the nursery's notice. Draw those into the world, on glass.

### Sound (`sound(S)`)

`S.bed(name, t0, t1, params)`, `S.cue(name, t, params)`, `S.silence(t0, t1)` (the world drops out; Daniel's voice stays), `S.duck(t0, t1, level 0..1)`. Levels are in dB. Voiced lines add their own take. **Name every sound you mean**, even where the development engine only plays a tick: the final mix is built from this cue sheet with real recordings, so the names are the spotting notes.

- **Beds:** `room` (a quiet house), `ac` (office air conditioning), `projector`, `traffic`, `city`, `heat` (a dry high shimmer), `shower`, `engine {f}` (the car idling or driving), `tinnitus {f, fi}` (the thin ringing), plus any descriptive name (`birds`, `fridge`, `playground_wind`).
- **Cues:** `alarm {n}`, `vibrate {n}`, `chime` (the phone on charge), `click`, `harness`, `door`, `handle`, `beep {n}` (the car's locks), `ignition`, `indicator {n}`, `ring {n}` (someone's phone), `email`, `stutter` (the coffee machine), `flash` (a flash cut), `hit {f, decay}`, `keys`, `gravel`, `whoosh {dur}`, `breath {dur}`, plus any descriptive name (`kettle_click`, `cereal_pour`, `mug_cap`, `knife_plate`, `razor`, `toothbrush`, `tap_squeak`, `footsteps {n}`, `glass_door_sigh`, `window_open`, `pen`, `pages`, `vent_cough`, `window_motor`, `brakes`, `tyres`).
- Silence is an instrument. The film's world goes quieter all day and falls silent at the door (A109) for the rest of the film, except Daniel's voice.

### Sets (`film/sets/<name>.js`)

```js
SETS.kitchen = {
  views: {
    counter: {                                     // one camera: the phone and the kettle against the garden window (C1)
      back(c, t, s) { ... },                       // everything behind the characters (cached where static)
      front(c, t, s) { ... },                      // the pane and anything in front of the characters: reflections, glare, dust, fog
      anchors: { phone: [785, 450], ... },         // the screen points the choreography needs (and px per metre at that depth)
      light: { x, y, color },                      // the shot's one motivated light, for rims
    },
    table: { ... },
  },
  demos: [ { name: 'counter: morning', draw(c, t) { const v = SETS.kitchen.views.counter; v.back(c, t, { tod: 'morning' }); v.front(c, t, { tod: 'morning' }); } }, ... ],
};
```

A set draws the environment only; characters come from `RIG` and are placed by the sequence between `back` and `front`. `s` carries the state: `tod` (`dawn`, `morning`, `noon`, `afternoon`, `evening`, `dusk`), and whatever the view needs (the phone's screen state, steam amount, the mirror's angle, a door open, the sun's height). Every view must look like it belongs beside the style frames.

### Characters (`film/rig.js`)

`RIG.draw(g, who, pose, opts)`, `RIG.face(...)` for close shots, `RIG.hand(...)` for inserts; `film/api/rig.md` documents the poses. Characters are flat shapes in three skin values, rimmed by the shot's one light; faces are quiet (downcast or closed eyes, small mouths, never a cartoon expression). In this look we meet people through glass: as reflections, in mirrors, behind fog or glare, as silhouettes. That is the idea and the production saving.

## Story-wide rules

- **Restraint (non-negotiable).** Emily is never shown in the car after the mirror moment (Q05). The back seat is never seen again: in every later car shot the mirror shows only the road behind, and from outside the rear windows only reflect. The inside of the car is never shown at the end (A105: "We do not see inside."). No body, no heat injury, no distress, no rabbit in the seat. Grief is carried by Daniel, the door, the light and the silence. The flash cuts in Q11 may show the mirror moment itself, as the screenplay asks.
- **Verbatim.** Every word on screen is the screenplay's, by id.
- **Through glass.** Every shot is framed through, or by, a pane: a screen, chrome, a mirror, a windscreen, a window, a glass door, a framed print, fogged shower glass. The pane's artefacts (reflection, glare, dust, fog, tint) are the texture. Warmth lives behind or inside glass.
- **Colour script** (look_c.md): teal-black dawn; cool teal morning interiors with the amber sun only in reflections; a warm white windscreen at the mirror; bleached cream-white noon; refrigerated teal-grey office; copper evening where every glass reflects and nothing can be seen through it; dusk copper and violet-teal; then teal-black silence.
- **Emily's yellow** `#E0B34F` belongs to her (cardigan, socks, her subtitles) and leaves with her. After Q05 it appears once: in the desk photograph (Q09).
- **The phone's green** `#7BE6A0` is the film's key accent: the charging icon. It is the only colour in the ending (the quick flash in Q12).
- **Time stamps** are only diegetic: 6:14 on the phone's alarm (Q01), 8:32 on the dashboard clock reflected in the windscreen (Q07), 10:18 to 11:43 on the conference-room clock seen in a framed print's glass (Q08), 5:37 in the laptop's corner (Q10).
- **No title, slate or scene headings on screen**, except the opening title on black at the start of Q01 and the end card on black at the end of Q12 ("AUTOPILOT", "A film by Osita Miles").
- **Cadence.** Morning: locked-off frames and slow pushes (0.2 to 0.5% per second), shots of about 4 s. Montages (the bathroom, the journey) cut every 1.5 to 3 s on a mechanical rhythm. The office: about 3.5 s. Evening: longer, quieter shots of 5 to 6 s. From "Where's Emily?": a faint handheld drift (`FILM.shake`, 1 to 2 px at 0.5 Hz), growing. The flash cuts: about 0.8 s each. The door: long, still takes; the last shot holds about 25 s.
- **Acting.** Daniel is kind and tired: a 3 px breath at 0.25 Hz, heavy lids, small economical movements (the routine is automatic: never hesitates). Emily is sleepy, solemn and funny. Faces stay quiet; posture carries the feeling.
- **Flash safety.** No more than 3 full-frame luminance flashes per second; flash cuts are hard cuts, not white flashes.

## Performance

Aim for under 80 ms per frame in `tools/strip.js` (the headless machine has no GPU). Cache static layers (sets, the pane's static glare), keep particles modest, and avoid full-frame canvas filters per frame (`ctx.filter = blur(...)` on a full frame costs tens of milliseconds: blur once into a cache).

The first draw of a new full-frame cached layer costs 35 to 45 ms, because the browser rasterises it then. So cache what stays still for many frames; a layer whose key changes every few frames (a moving camera) is cheaper drawn live at lower detail. `tools/strip.js` reads one pixel after each frame so its times are the frame's own (otherwise Chrome batches drawing and every few frames shows a false spike).

## Testing

```
cd films/autopilot
node tools/strip.js Q05 1            # contact sheet every 1 s -> out/strip_Q05.png, with ms/frame and warnings
node tools/frame.js Q05 44.5 out/q05.png
node tools/set.js kitchen 1          # a set's demos -> out/set_kitchen.png
node tools/set.js rig 1              # the characters' demos
```

Look at every sheet with the Read tool. Fix, re-render, look again. A sequence is done when every assigned line plays verbatim at the right moment, the story reads with no prior knowledge, the restraint rules hold in every frame, and each frame could hang beside the style frames.
