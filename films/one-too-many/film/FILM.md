# ONE TOO MANY: building the film

The film is code. `FILM.renderAt(t)` draws any instant; the player scrubs, and the exporter steps frames at 24 fps. Everything is deterministic: never use `Math.random` or `Date`. Use `OTM.rng(seed)`, `OTM.vnoise`, `OTM.fbm` and `FILM.wob`.

Root: `films/one-too-many`. Read `KIT.md` first: the Negative Space doctrine and the drawing API. The 13 style frames in `src/F*.html` and `out/F*.png` are the approved look. Port their drawing code freely.

| File | What |
| --- | --- |
| `kit/otm.js`, `kit/figures.js`, `kit/dialogue.js` | The drawing kit (KIT.md) |
| `film/script.js` (`script.json`) | The screenplay as numbered elements: `L###` dialogue (249 lines), `A###` action, `S##` scenes. **All dialogue comes from here by id. Never type dialogue yourself.** |
| `film/engine.js` | Timeline, shots, camera, dialogue timing and drawing, score collection, player, export hooks |
| `film/sound.js` | Synthesised sound: beds and cues (listed below) |
| `film/rig.js` | Character helpers on top of `OTM.fig` (IK arm targets, rims, held objects, seated/walking poses) |
| `film/sets/*.js` | Shared environments: `yard`, `hall`, `living`, `table`, `kitchen`, `title` |
| `film/seq/QNN_*.js` | The twelve sequences, in story order (`film/load.js` lists them) |
| `film/index.html` | The player. `film/headless.html` is for tools. |
| `tools/strip.js`, `tools/frame.js`, `tools/set.js` | Contact sheet of a sequence, one frame, a set's demo sheet |

## A sequence

```js
// film/seq/Q05_seven_hands.js
FILM.seq({
  id: 'Q05', title: 'Seven hands', dur: 92,          // seconds; the timeline is the sequences back to back
  letterbox: lt => 1.7778,                           // number or function of local time (see the schedule below)
  setup() { /* optional one-time precompute */ },
  lines: [                                           // dialogue: ids from script.js, local times
    { id: 'L050', at: 3.2, x: 1200, y: 860, align: 'left' },
    { id: 'L061', at: 21.0, x: 1180, y: 940, opts: { pointTo: [980, 760] } },
  ],
  sound(S) {                                         // the score, in local seconds
    S.bed('room', 0, 92, { level: -40 }); S.bed('walla', 0, 20, { level: -32 });
    S.cue('deal', 6.0, { n: 7, gap: 0.3 }); S.cue('ping', 22.1, { i: 0, sour: 14 });
  },
  shots: [                                           // sorted by `at`; a shot lasts until the next one
    { at: 0, name: 'top: gathering', draw(c, st, lt) { /* draw the world for this instant */ } },
    { at: 18.5, name: 'cu: Deena', draw(c, st, lt) { ... }, post: { vignette: 0.6 }, fade: (st, dur) => 0 },
  ],
});
```

### The draw context `c` (per frame)

- `c.g`: the paper world (Canvas 2D, 1920×1080). Draw everything here. `c.em` is the emissive (bloom) buffer; it is already quarter-scale, so use world coordinates. `c.f` is the frame compositor (`c.f.knockout(path, depth)`, `c.f.knockoutText(...)`, `c.f.holes`).
- `c.t` is global seconds, `c.lt` sequence-local, `st` shot-local (also passed as an argument). `c.frame` is the frame number; `c.shotDur` is the shot length.
- `c.camera({x, y, zoom, rot, dx, dy})`: the world point `(x,y)` goes to the frame centre at `zoom`. It applies to `c.g` and `c.em`, and must be called before drawing the world. Use `FILM.shake(t, amp, hz, seed)` for `{dx, dy}`. `c.reset()` returns to screen space.
- `c.cache(key, (g, canvas) => {...}, w, h)`: an offscreen canvas that persists across frames. Use it for every static layer (walls, furniture, the house body). Prefix keys with your sequence or set id. Drawing a cached layer is cheap; redrawing a set every frame is not.
- `c.before.push(cx => ...)` runs after halation, before grain and vignette. `c.after.push(cx => ...)` runs after post, for flashes, white frames and matte effects.
- Per-shot `post: {grain, vignette, halation, fibre, letterbox}` overrides the compositor. `fade(st, dur)` returns 0..1 of black over the final frame.
- Time helpers: `FILM.seg(t, a, b, ease)` gives clamped 0..1 progress. `FILM.key(t, [[t0, v0], [t1, v1, 'outBack'], ...])` interpolates numbers, arrays or objects. `FILM.twos(t)` snaps character pose time to 12 fps: characters animate on twos, and only Kay animates on ones. `FILM.ease.*` has linear, in/outQuad, Cubic, inOutSine, outExpo, outBack, plus `hover` (Scott), `tidy`, `snap` (Deena) and `bezier(...)`.

### Dialogue (`lines`)

`{ id, at, x, y, align, size, opts, hold, until, entrance, when, alpha, silent, timer, draw }`

- The text and speaker come from the id. Every line id assigned to your sequence must appear **exactly once**, in screenplay order (overlaps are fine).
- The engine times each line:
  - The entrance depends on the speaker: Scott types at 35 ms per character; Deena cuts on at once; Angelo deals at 160 ms per word; Kay fogs on at 22 ms per character; Christof's marquee lights at 25 ms per letter; Marina's grid fills at 28 ms per character; the Dispatcher runs at 2.8 words per second; the VOICE appears at once.
  - The hold is `max(0.9 s, 0.35 + 0.055 × characters)`.
  - The exit depends on the speaker too: Scott deletes backwards, Kay leaves her lipstick glyph, Deena, the Dispatcher and the VOICE cut, and everyone else fades out in 200 ms.
  - `hold` / `until` override this, for example to keep a line up across a beat.
- Lines are drawn in screen space after the world, so **they survive cuts**. Keep their `x, y` on ink, in the composition's negative space. Body type is 44 to 56 px, and you may scale it for emphasis. No more than 3 lines on screen at once.
- The y position is clamped into the live area of the current letterbox. From 2.39 on, put lines in the thin live area or design them onto the matte bands with `draw`.
- `opts` passes to `OTM.say`:
  - **Scott:** `caret` blinks in his holds, and `stress` 0..1 makes his line heavier and jittery.
  - **Deena:** `pointTo`, and `soft` when she is frightened.
  - **Angelo:** `spread` makes his dealing crooked, `blankSlot` adds the extra card whenever the count is wrong, `big: ['five']`, and `final: true` from 'Scott. Please.' on.
  - **Kay:** `lipLast`.
  - **Christof:** `big`, `dead`, `bulbs`.
  - **Marina:** `stress`, `ringWord`.
  - **Dispatcher:** `timer` (a string, or a function of lt).
  - **VOICE:** `face` (whose typeface it borrows) and `size`. It is cut through the paper automatically.
- The two VOICE lines (L144, L162) borrow a typeface: L144 'Scott.' uses Angelo's face (`face:'angelo'`), and L162 'Angelo.' uses Scott's face, very softly (`size: 32`, `depth: 0.6`). Each is placed at the empty place at Scott's right.
- `draw(c, s, o)` replaces the default drawing for special treatments, such as Deena's 'Scott, don't--' sliced by the oven door. `s.p` is the entrance progress and `s.alpha` the exit alpha.
- Landing sounds per speaker, and the Extra's silence (every bus drops to nothing while the VOICE speaks), are added automatically. Set `silent: true` to skip them.

### Sound (`sound(S)`)

`S.bed(name, t0, t1, params)`, `S.cue(name, t, params)`, `S.hole(t0, dur)` (total silence except the Extra's drone), `S.duck(t0, t1, level 0..1)`. Levels are in dB. Use sound to make it intense: silence before shocks, heartbeats under dread, the hiss rising.

- **Beds:**
  - `tinnitus {level:-38, fi, fo}`, `fire {level:-14, near:0..1}`, `room {level:-40}`, `rain {level:-30, open:[[t,0|1],...]}`
  - `fridge {level:-40, steps:[[t,dB]]}`, `gas {from:-54, to:-24}`, `drone7 {level:-30, seventh:-26}` (the Extra's leitmotif; never silenced)
  - `walla {level:-30, cut: t}` (the room's chatter; `cut` kills it abruptly, as when a laugh dies), `heart {bpm, bpmTo, level:-20, pan}`, `siren {level:-34}`
  - `unison {level:-26}` (the last chord), `dread {level:-30, root:55}`, `groove {level:-26}` (party music from a speaker)
- **Cues:**
  - `smash {level}` (a hard cut to black), `glass {level, pan}`, `doorbell`, `knock {n, gap, level}`, `latch`, `click2` (the second click: dry, panned to Scott's right, from nowhere)
  - Cards: `flick`, `slap`, `riffle`, `deal {n, gap}`
  - Counting: `ping {i, sour, wrong, pan}` (a count that sours; `sour` is in cents and should grow across the film: about 0 in Q03, 7 per count after that; `wrong: true` for a count past the truth), `tally {faint, pan}`
  - Kitchen and table: `thump {pan}`, `gasp`, `crash`, `whine {dur}`, `shutter`, `stove`, `ovendoor`, `buzz {dur}`, `scream {dur}`, `tear` (the throat), `drip`
  - The lighter and the blast: `scrape {n}`, `spark`, `boom`
  - The phone: `dtmf {digits:'998x96x999', gap}` (`x` = delete), `ringback {n}`
  - Generic: `hit {f, decay}`, `swell {dur, f}`, `lub {pan, extra}` (one heartbeat), `whoosh {dur}`
- Need a sound that doesn't exist? Make it from these, or write it into your sequence file as `SOUND.cues['myname'] = (ac, B, t, p, R) => {...}`, using the helpers `SOUND.osc/src/filt/gain/pan/chain/perc/bedEnv/db` and the buses `B.room/music/fx/dialogue/extra`. Prefix the name with your sequence id.

### Sets (`film/sets/<name>.js`)

```js
SETS.table = {
  anchors: { centre: [960, 540], seats: {...} },   // world points the choreography needs
  light: { x, y, color },                            // the key light, for rims
  cams: { top: {x, y, zoom}, low: {...} },           // named framings for c.camera()
  draw(c, t, state, view) {...},                     // or split into back(c,t,state) / front(c,t,state) layers around the characters
  demos: [ { name: 'top: seven piles', letterbox: 1.78, draw(c, t) {...} }, ... ],   // full example frames, for tools/set.js
};
```

A set draws the environment only. Characters come from `film/rig.js` / `OTM.fig` and are placed by the sequence. State switches what changes over the story: the number of glasses and piles, the door open, knobs missing, the oven open, blood, fire level, strobes, the persistent ember perforations, and so on. Cache everything static.

## Story-wide rules (keep these consistent)

- **Seating, locked.** Seen from above with Scott at 6 o'clock facing the centre, the order going round to his LEFT (clockwise on screen) is: Scott 6:00, Kay 8:00, Marina 10:00, Christof 12:00, Deena 2:00, Angelo 4:00. **The person-sized gap is at 5:00, Scott's RIGHT**, between him and Angelo.
  - Pile seven, the sixth card, "Kay" during the later game, the fifth glass on its coaster, the VOICE's place in the hand circle and the photographer's spot all sit in that gap.
  - The pendant lamp hangs over the table centre and shows as a black disc in top-down views (see F05 and F07).
- **Letterbox schedule** (the frame is the master counter):
  - 1.78 from Q01 through Q06.
  - Q07: 1.85 on Christof's crash, then 2.00 on "Where's Kay?" (L112).
  - Q08 and Q09: 2.00.
  - Q10: 2.20 on Deena's last breath (A133), then 2.39 when Marina is gone (A137).
  - Q11: 2.39, squeezing continuously to 2.76 through the lighter standoff. The mattes burn away in the blast, and the frame is 1.78 again in the yard.
  - Q12: 1.78.
  - Steps are instant cuts of the matte, with a soft tally sound.
- **The Extra is never drawn.** It appears only as an absence, a count that is wrong, a person-sized gap at Scott's right, or a cut through the paper to the ember lightbox (the VOICE, Deena's throat, the handprint, the final hand). Ember `#FF9440` appears nowhere else.
  - Knockout damage persists: once the VOICE has cut words into the dining-room wall or table, keep faint ember perforations there in later shots of that set.
- **Cadence.** Characters animate on twos (`FILM.twos`); Kay animates on ones. Camera, light, type and particles run on ones.
  - Act 1 (to Q06): no shake, slow pushes of 0.25-0.5% per second, average shot length about 4 s.
  - From the crash: average shot length 2.4 s, with a gentle drift (0.6 px at 0.4 Hz).
  - Kitchen: average shot length 1.3 s and a 1.5 to 3 px shake.
  - The lighter standoff is ONE unbroken take of about 50 s.
  - The explosion: an 18 px decaying shake.
- **Acting in silhouette.** Gesture with clear negative space, head tilts, and breath (a 4 px rise at 0.25 Hz). Scott hovers and corrects; Deena snaps; Angelo is loose and showy, then drained; Kay is unhurried; Christof is expansive; Marina is precise. Warmth and comedy must land in Act 1, so the losses hurt.
- **Intensity.** Silence before shocks, hard cuts, snap zooms of 6-8 frames, heartbeats, the hiss rising. Flash safety: no more than 3 full-frame luminance flashes per second.
- **Violence.** It is shape and implication, never anatomy: Christof as a folded paper-doll shadow, Deena's throat as a short ember arc turning to blood.

## Performance

Aim for under 60 ms per frame in `tools/strip.js` (the headless machine has no GPU). Cache static layers, keep flames and particles modest, and avoid full-frame filters per frame.

## Testing

```
cd <root>
node tools/strip.js Q05 1            # contact sheet every 1 s -> out/strip_Q05.png, with ms/frame and warnings
node tools/frame.js Q05 21.4 out/q05_21.png
node tools/set.js table 1            # a set's demos -> out/set_table.png
```

Look at every sheet with the Read tool. Fix, re-render, look again. A sequence is done when every assigned line plays verbatim, the story reads with no prior knowledge, and each frame could hang beside the style frames.
