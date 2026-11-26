# Movement I, cut v8: sound audit, the music editor (the choir)

Review only: nothing in the mix, the tools or the records was changed, nothing was spent, nothing was generated. Scratch work is in `/tmp/music_review`. The review itself is parts 1 to 4 (about 900 words); the annexes hold the measurements, the listeners' reports and the three schemes the assignment asked for. Nobody has heard this mix, including me: each statement is marked **measured**, **listener** (a model's report) or **inference**.

## 1. Verdict

The choir is cut like neither music nor a place: it is one 14-second pass that is paused whenever the picture leaves the cathedral and restarted from the same bar when it returns, so it reaches the audience as three stubs of 8.4, 5.2 and 2.3 seconds, the last two 3 to 4 LU louder than the first, and only one of its six edges falls on a breath (by luck). The two moments that read as faults are the return at 26.0–26.5 s, where a 22 dB swell meets a piece of the congregation's reverb that starts from nothing, and the 2.3-second burst at 38.9–41.2 s that rises out of near-silence and is faded to zero in 0.45 s. Better fades will not fix it: lay one unbroken pass, tuned to the bell, on the film's clock, change its perspective at the world cuts, and let it end by itself before the bell lands.

## 2. Scores

| Axis | Score |
| --- | --- |
| The choir's entries and exits | 3 / 10 |
| Musical continuity across the intercut | 2 / 10 |
| Fit of choir, bell and voices (pitch, register, level) | 4 / 10 |
| How well the music serves the two-worlds idea | 3 / 10 |
| The music overall | 3 / 10 |

## 3. The problems, worst first

**1. 17.7–41.2 s: the choir is paused, not cut.** Measured: the three passages are 9.50–17.87 s, 16.22–21.41 s and 20.91–23.25 s of the take. While the picture is below (7.6 s, then 9.3 s) the music does not move on, and each time it resumes earlier than it stopped, by 1.65 s and 0.5 s (the same waveform twice: correlation 0.999 and 0.95). Inference: music that waits for the picture says time stood still above; the film's argument is that the two worlds happen at once. It also mixes the grammar of source (it exists only above) and of score (pre-laps, fades, rides). Fix: scheme A, annex E.

**2. 26.0–26.5 s, the second entry.** Measured: the choir rises 22 dB between 25.9 and 27.2 s. At 26.49 s the dialogue layer goes from digital silence to −20 dBFS in 30 ms: the hall tail of "…bring down" (v5's stem from 18.87 s, correlation 0.9985), cut dead in the vale at 18.80 s and resumed here 7.7 s late, as loud as the choir. The mix jumps 8 dB in 50 ms. Listener: Gemini, sound only, 3 of 3: a chord or sting that "begins suddenly" ("dissonant" in 2); earshot on that layer alone: "a cinematic hit with a long tail" (z +3.7). Fix: let the answer's tail ring out once, over the vale (18.8–21.5 s, low-passed at 700 Hz, its own decay); start the cathedral's dialogue layer at 25.29 s from room tone only.

**3. 38.9–41.2 s, the third passage.** Measured: 2.3 s long. It fades in over 0.5 s in mid-chord over the dust shot, 20 LU above the wind; the mix rises 25 dB in 0.55 s. Then, at the highest gain of the three passages, it is faded to digital zero in 0.45 s with no tail, in a hall mixed with a 6–7 s reverb. Listener: earshot in the mix: "a synthesizer pad swelling" 82 %, a choir 2 %; its timeline tags the entry "reverse cymbal swell", +28 dB over its bed. Gemini, 6 of 6: one short "Ahhh" of 2–3 s. Fix: no third entry. In scheme A these seconds are the last chord of the unbroken pass, which ends by itself.

**4. 25.3–30.1 s: six fader moves in 4.8 s.** Measured (gain against the take): +5, back to 0, +6, −8 for the press, +8, −6 for the lift, then out in 0.6 s. At its peak (27.2 s) the choir is 5 LU under the lines and louder than the press it is ducked for. The rides were written for v5, where the choir ran 13.7 s unbroken. Fix: one level, 11 LU under the lines, no ducks; place the take so its own breath falls on the press.

**5. Pitch.** Measured: the choir's last chord is G major, a little sharp (G3 197.2 Hz, with B natural); the bell is a G 38 cents flat with a minor third (191.7 and 226.8 Hz). Inference: the choir prepares a G that the bell answers a quarter-tone lower and in the minor, 4.6 s later. They never overlap, so nothing beats. Fix: play the choir 50 cents down (speed ×0.9715): choir, bell and the spoken answer (strongest near 193 Hz, a rough estimate) then share one note.

**6. 10.6–18.9 s: the first passage is not noticed as music.** Listener: Gemini on the whole mix placed the first music at 25–26 s in 6 of 6 passes. Inference: for an audience the choir begins on Serath, unprepared.

## 4. What works and must be kept

- The entry at 10.55 s on the Hierophant's face: soft, between the lines; earshot hears a choir there in the mix (z +4.3). Under the lines it sits 15.5–16 LU down.
- The cut down at 17.67 s falls in the take's own breath, 28 dB under the answer. No listener heard it.
- The exit at 30.1 s is level (−31 to −34 dBFS). Gemini never placed an ending there (0 of 9).
- No choir from 41.2 s to the end: the silence before the landing, and the bell alone.
- The bell "from far above" over the valley (13 dB down, low-passed): the right grammar for two worlds. Give it to the choir.
- The take: one pass, no loop, with breaths at 4.4, 8.9, 17.2 and 25.9 s and its own ending at 29–30.5 s. Cut v8 uses none of them at an edit.

---

## Annex A. Every entry and exit of the choir (measured)

Film clock. Levels are the loudest 400 ms (momentary LUFS) unless marked dBFS (0.1 s, both channels summed). The lines and the answer measure −18.1 to −18.2 LUFS.

| Edge | Time (s) | Shape | Music at that moment | Against the other layers | Picture |
| --- | --- | --- | --- | --- | --- |
| Entry 1 | 10.55 | Fade in 1.2 s, then +4 dB more by 13.3 s | F major 7 (F–A–C–E), 0.5 s into a phrase whose attack is cut off | −27.3 LUFS: 9 LU under line level; room tone −36 dBFS | The Hierophant's face, 0.24 s after line 1 ends |
| (duck) | 14.0 | −3 to −4 dB and an EQ dip | Moves to G major at 14.55 s | −33.7 under line 2, −34.3 under the answer: 15.5–16 LU under | Line 2, the gallery |
| Exit 1 | 17.67–18.92 | Linear fade, 1.25 s | The take's own breath (17.15–18.35 s); the next attack leaks at 18.4–18.7 s, −47 dBFS | 28 dB under the answer at the cut; inaudible | Cut to the vale at 17.67 |
| Entry 2 | 24.89 | Fade in 0.4 s, lifted 5 dB; the lift comes off by 26.5 s | The dying end of the G phrase, already heard at 17.3–18.9 s; the real attack is at 26.0–26.5 s on E–A–B (a suspended chord) | Pre-lap −41.5 dBFS against wind at −32.0: not audible. From 26.5 s −23.5 LUFS, with the orphan reverb at −24.5 | Pre-lap on the girl at the wall; cut up at 25.29; swell on Serath, 0.7–1.2 s after the cut |
| (ducks) | 27.4–28.0, 29.0–29.8 | −8 dB, −6 dB | G with added A and E from 28.7 s | Press −24.1 LUFS; lift −29.1 dBFS | Press 27.54, lift 29.12 |
| Exit 2 | 29.48–30.08 | Fade 0.6 s, ending on the cut frame | Mid-phrase, 1.4 s after the G chord arrived; no tail | Wind arrives from 29.7 s; the mix is level across it | Still on the seal; cut to the water at 30.08 |
| Entry 3 | 38.88 | Fade in 0.5 s | Mid-chord (G), the last 0.5 s before exit 2 heard again | −24.5 LUFS against wind at −44.8 | Dust on the mountain; cut up at 39.38 |
| Exit 3 | 40.75–41.2 | Fade 0.45 s to digital zero | Held G major; the take's own 3 s diminuendo would have begun at 41.0 s | Beds at −37 dBFS; then the designed near-silence | Cut to the taut chains at 41.17; landing 42.4 |

Silences between: 18.92–24.89 s (6.0 s) and 30.08–38.88 s (8.8 s). After 41.2 s there is no choir.

## Annex B. Pitch (measured, except where marked)

- **Take** (`choir_1`, tuned to A = 440 +3 cents): 0–2 s B; 2.5–4 A minor; 5–6.5 B; 7–8.5 A minor; 9–13 F major 7; 13.5–16 G; breath 16.1–17.3; 17.4–19.5 E–A–B; 20–25.5 G (pure G–B–D from 22 s), dying from 23 s; 26.5–29 C major 7; ends 29–30.5.
- **Bell**: 95.9 Hz (G2 −38 c), 191.7 (G3 −38), 226.8 (B♭3 −47), 288.5 (D4 −31), 383.1 (G4 −40), 577.0 (D5 −31): a G minor bell, about 38 cents flat.
- **Choir's last chord** (39.6–40.7 s): 197.2 (G3 +11), 395.1 (G4 +13), 588.2 (D5 +3), 789.4 (G5 +12), 979.0 (B5 −15), 1177.6 (D6 +4). The choir's G is 50 cents above the bell's.
- **The answer** (16.4–18.75 s): its energy between 80 and 600 Hz is strongest from 182 to 240 Hz, peak 193 Hz. A pitch tracker gives 205 Hz for it and 193 Hz for line 2, but with almost no confidence in that reverb (voiced probability 0.01–0.07): a rough estimate. The choir under them is on G. Inference: voices, choir and bell share a note by accident; nothing in the mix uses it.
- Under the choir's first entry the dialogue layer holds a cluster near 142, 266, 278 and 298 Hz at −36 dBFS, 7 dB under the choir: the tail of line 1 and, per the cue sheet, the video model's own music. Not examined further.
- The film's tuning: the bell is at A = 430.5 Hz. `SONG.md` plans D minor, in which the bell's G–B♭–D is the fourth chord. When the song is made, either play it 38 cents down (84 becomes 82.2 BPM) or retune the bell to 196.0 Hz. Decide before the song is cut in.

## Annex C. What the listeners said, and how far to trust it

**earshot** (z of 3 and over is clear; it marks its own music and instrument readings "unvalidated").
- Choir layer alone: a choir in all three passages (z +3.7, +3.2, +3.4); pitch about 196 Hz in each.
- In the mix, "a choir singing sustained wordless notes in a cathedral" against a pad, a riser, an organ and wind: 10.6–14.2 s strong (z +4.3, choir 99 %); 25.9–29.9 s plausible (z +2.5; pad 54 %, choir 31 %); 38.9–41.3 s weak (z +2.3; pad 82 %, choir 2 %).
- Timeline of the mix: 5.95–14.5 s "chant, choir, mantra"; the second and third entries tagged "reverse cymbal swell" (+20 dB and +28 dB over their beds); 40.48 s is the third strongest accent of the film after the two bell strokes.
- "Music that is cut off abruptly" for the end at 41.2 s: >99 % on the mix, 1 % on the choir alone. The two contradict each other: not trusted.

**Gemini** (sound only; its times wander by up to a second; its "sudden" and "gradual" flip between passes, so only counts are given).
- Whole mix, two questions, three passes each: no pass reports music before 25 s; a passage that "swells in" at 25–26 s, 6 of 6; a short choir at 38–41 s, 4 of 6; "the same piece of music", 3 of 3.
- 23.5–29.5 s, three passes: a musical chord or sting that "begins suddenly", 3 of 3 ("dissonant" in 2; "scare chord", "horror stinger"); none calls it a choir. It places it 0.5–1 s after the cut up; the measured edge is at 26.49 s.
- 21–33 s, three passes: none hears the music stop at 30.1 s; it hears a drone carry on to the end of the extract. Inference: the valley wind, whose resonances wander between 170 and 700 Hz, reads as a tone.
- 34–47.5 s and 37–43.6 s, six passes: a choir on "Ahhh" for 2–3 s, 6 of 6; its ending abrupt in 2, gradual in 4. With the whole-mix passes: abrupt in 5 of 12. The listener cannot settle whether the 0.45 s fade is a fault; it is sure the passage is a stub.
- 8–21 s, three passes: between the lines a low drone or pad, "choir-like" in 2 of 3; no cut heard at 17.7–18.9 s; a drone already under line 1 in 2 of 3 (the video model's music).
- Choir layer alone, three passes: a choir, three passages, 3 of 3; "carries on from where it stopped" 2 of 3, "starts somewhere new" 1, "goes back over something heard" 0. The repeated 1.6 s and 0.5 s are too short and low to be heard as repeats; what is heard is the pause.

## Annex D. What the film planned

- Screenplay: no choir. A bell that "does not fade. It hangs"; ten thousand voices answering; in the vale "a hum too deep to hear. It is in the ground and in the teeth."
- `BEATS.md`, movement I: "montage, song: intro, verse 1, pre-chorus"; the response "is the song's first sound".
- `SONG.md`: one song under both worlds; choir for Orison, a low woman's voice for the ground; "the song stops for the bell, the mountain"; "dialogue always wins"; "the picture is recut to the song".
- `CUT_PLAN.md`: M1 "Let No Hand": "choir and low strings over a slow pulse … cut by the mountain's silence, then the still cup".
- `DECISIONS.md`: the hum is to be made in house, "in the ground from 2.1".

Cut v8 departs from this three ways: the choir starts before the response instead of growing out of it; it exists only above; and it is chopped to the picture instead of the picture being cut to it. The valley has no hum (the model's drone was taken out and nothing designed replaced it).

## Annex E. Three schemes for the music of these 64 seconds

All three keep the bell and everything after 41.2 s as mixed. All three need the fix in problem 2. None needs money. None has been rendered or heard: the sync points are arithmetic from the take's measured envelope.

### Scheme A (recommended): one hymn, heard from two places

The whole existing take, once, unbroken, on the film's clock. Above, it is in the hall. Below, the same music at the same moment is heard from under the kingdom: quieter and dull, as the bell's note already is at 46.2–53 s.

**Build, with no generation.**
1. Source: `audio/choir/choir_1_mixed_sustained.flac`, all 31 s. Not `out/edits/stems/choir.wav`: that has v5's rides in it.
2. Tune: resample so it plays at ×0.9715 (50 cents down, 31.0 becomes 31.9 s). Its G lands on the bell's 191.6 and 383 Hz.
3. Even it once, before placing: one slow gain curve (1 s ramps, within ±3 dB) so its held chords sit within 2 dB of each other, and lift the breath at 16.3–17.3 s of the source by up to 8 dB so the attack after it is +10 dB, not +20.
4. Place the tuned take's zero at film 10.1 s (film time = 10.1 + 1.0293 × source time). Start it at 10.55 s with a 1.5 s fade-in. No other fade anywhere.
5. Two versions of that one placed cue, crossfaded over 80 ms centred on each world cut (17.67, 25.29, 30.08, 39.38 s):
   - **Near** (cathedral): high-pass 90 Hz, v5's hall send (−22 dB), which rings on over each cut down. Alone (10.6–14.2 and 39.4–40.0 s): 9 LU under the lines, as now. Under line 2 and the answer: 16 LU under, with v5's speech dip, as now. Through the seal (25.3–30.1 s): 11 LU under, flat.
   - **Far** (valley): the same audio 8 dB lower, low-pass 700 Hz at 12 dB per octave, mono. About −40 LUFS: 22 LU under the lines, 8 LU under the vale's wind. A further 4 dB down on the dust shot (36.7–39.4 s). The author's ear sets it between 6 and 12 dB.

**What the audience hears.**

| Film time (s) | Sound |
| --- | --- |
| 0–10.5 | The stroke, the nave, line 1. No music. |
| 10.6–12.1 | The choir comes in on the Hierophant's face. |
| 14.2–14.8 | It breathes as he begins line 2; it holds under the line and the answer. |
| 17.67 | Cut down: the same chord, far overhead, under the wind. 18.9–19.4: it breathes as the answer's tail dies above. |
| 19.4–25.3 | The vale: wind, swallows, the bowl on stone; the hymn faint above, moving on (a new chord at 19.4, G at 23.5–23.9). |
| 25.29 | Cut up: the hymn opens on a held G. It has moved on 7.6 s, as the rite has. |
| 26.7–27.8 | It sinks by itself; the press (27.54) falls at the bottom of its breath. |
| 27.9–28.4 | It rises again on the sealed warrant and holds a suspended chord; the lift (29.12) under it. |
| 30.08 | Cut down: far. 30.2–30.7: the chord resolves to G. The water trembles (32.4) under it. |
| 33.8–37.1 | Its long diminuendo over the ox and the crows; lowest as the dust shot begins (36.7). |
| 37.2–37.5 | The last chord, far, over the dust. |
| 39.38 | Cut up: the last chord in the hall as the warrant goes up. |
| 39.95–41.1 | The take's own ending: 20 dB down by 40.5, gone by 41.1. |
| 41.2–42.4 | The designed near-silence, whole. 42.4: the landing. 45.79: the stroke, on the hymn's own note, in the minor. |
| 46.2–64.1 | As cut v8: the bell only. |

One entry, no exit made by a fader, four changes of perspective on picture cuts.

**Why it suits the film.** Restraint: one sound, held; no sting, no swell made by a mixer; one silence, and it is earned. Clarity: the audience hears where it is in two frames, and hears that both worlds are in the same minute, because the music never waits. It is the film's own plan (one song under both worlds) with the stand-in it already has. The dark mass is in the frame over the vale: a hymn from above belongs there.

**Risks.** The valley is no longer empty, and the author had the model's drone taken out of it: this is voices at 200–700 Hz, not a low drone, but it is his call (muting Far gives scheme B from the same session). The take's first 9 s rock between two chords every two seconds, busier under the lines than the stretch used now. The last chord is C major 7, not G: its B natural is a semitone over the bell's B♭, 4.7 s before the stroke (if it bothers: a 6 dB notch at 480 and 960 Hz from 37.2 s). The far choir shares the wind's band. Stable Audio's short windows can read as a pad (annex C).

**If the take does not hold up, remake it** (local, free): Stable Audio 3.0 Small Music, the prompt already proven in `tools/sfx_make.py` (`CHOIR['choir_1_mixed_sustained']`), 32 s, 8 steps, guidance 1.0, four passes (seeds 1601, 2601, 3601, 4601). Keep the take that (i) reads as a choir in every 4 s window (the foundry's probe, 0.75 or more), (ii) has two breaths about 12.5 s apart and its own ending inside 32 s, (iii) has no clipped samples. Measure its pitch and varispeed it to the bell (within 100 cents; otherwise the next seed). Place it by the same rule: a breath on the press at 27.5 s, its own ending done by 41.1 s.

**Check when built.** earshot's choir question on the mix at 25.3–30.1 and 39.4–41.1 s (want z of 3 or more; now 2.5 and 2.3). The mix level across each world cut in 50 ms steps. Gemini, sound only, three passes: "how many separate passages of singing?" (want one).

### Scheme B: the hymn stays in the cathedral

The same tuned, placed cue as scheme A, with Far muted. 30 ms cuts on the first frame of each shot: out at 17.67 s (the answer's tail carries that cut), in at 25.29 s, out at 30.08 s, in at 39.38 s; it ends by itself by 41.1 s. Each cut lands on a held chord (7.4, 14.8, 19.4 and 28.5 s of the take; level steady within 2 dB on the audible side of each cut).

- **Heard.** Above: the hymn, further on each time we return. Below: wind and work, nothing else, as now.
- **Why.** The hard sound cut is the plainest way to say "another place"; the valley's emptiness stays whole.
- **Risks.** Four hard edges on a sustained chord inside 22 s. A choir in that hall can only stop dead if the cut is exactly on the picture cut; one frame off reads as a fault. Nothing musical joins the two worlds: the idea is reduced to a switch, and the plan's song under both worlds is given up.

A and B come from one session: render both and let the author choose by ear.

### Scheme C: no choir; the bell's note is the score

Take the choir out. The script's bell "does not fade. It hangs": make that literal.

- **Build** (numpy, no model): a pedal on the bell's own partials, 95.8 Hz and 191.6 Hz (10 dB lower), each a pair of sines 0.15 Hz apart, level drifting ±2 dB at 0.05–0.2 Hz, through the hall impulse. It rises out of the opening stroke's tail at 3.5–6 s.
- **Levels.** Cathedral: −40 LUFS, 22 LU under the lines. Valley: low-pass at 140 Hz and add 47.9 Hz, so only the hum is left ("in the ground and in the teeth"); filter moves of four frames on the world cuts. It fades to nothing over 36.7–38.5 s; silence to the landing; the stroke renews it.
- **Why.** The most restrained. The valley's hum is the bell's note, so the cause is audible before its effect.
- **Risks.** On a phone there is nothing (all of it is under 300 Hz). It puts a low tone back in the valley after the author had one removed. It drops the choir he asked for on the Hierophant's face, and the hymn's later returns (B27, B37) lose their first statement.

**Not proposed: a pulsed stand-in for the song.** The cut sits on no bar grid (the best fit, 85.7 BPM, puts the five world cuts within 0.11 s of a beat, on beats 25, 36, 43, 56 and 66: no bar pattern). A pulse means recutting the picture to the music. That is the film's plan, but it is a picture job, and the song needs a singing model that costs money.

**Recommendation: scheme A**, built first from the existing take, with scheme B rendered beside it.

## Annex F. Not checked

- Nothing was heard by a person. Scheme A was not rendered (the brief forbids making sounds here).
- The spoken pitch of the lines and the answer is a rough estimate.
- Whether the far choir is audible under the wind at the level given: a matter for the ear.
- The video model's music under line 1 was only located, not judged.
