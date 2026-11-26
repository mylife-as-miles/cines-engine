# Movement I, cut v9: the sound rebuilt

The author, 26 November, after the panel's audit of cut v8 (`edit/reviews/I_bell_v8_sound_review.md`, five reviewers, 3.7 out of 10): "So fix it." Sound only. The picture is cut v8's, frame for frame. Nothing was generated on a paid service; spend stays about $42.35.

| File | Choir in the valley |
| --- | --- |
| `out/review/I_bell_v9_A.mp4` | heard from far above: 12 dB down, low-passed at 700 Hz, mono |
| `out/review/I_bell_v9_B.mp4` | silent below; it belongs to the cathedral only |

Both: 64.1 s · 992×432 · −18.7 LUFS · true peak −1.9 dBTP · built by `tools/mix_film.py` · checked by `tools/qc_film.py` · the two differ only at 17.7–25.3 s and 30.1–39.4 s. Mixes `out/edits/I_bell_v9_{A,B}.wav`, layers `out/edits/stems_v9/`, measurements `out/edits/I_bell_v9_{A,B}_qc.json`.

**Nobody has heard this track.** Everything below is a measurement or a listening model's report. The author's ear is the test.

## The method changed

Cuts v6 to v8 were sliced out of cut v5's finished mix and patched at the seams. Cut v9 takes nothing from a finished mix: every cue is rendered alone and placed on the film's own 64.125 s clock, in nine layers (dialogue, choir, bell, cathedral effects, cathedral air, valley Foley, valley air, ground, rock).

## Against the audit's ten findings

| # | The audit found | In cut v9 | Measured |
| --- | --- | --- | --- |
| 1 | A ghost: the hall's tail chopped at 18.8 s and returned alone at 26.5 s | The answer's tail rings out once over the vale (18.9 to 22.3 s) and never returns | No level jump at 26.5 s |
| 2 | The choir paused and restarted: three stubs, some heard twice, a click | One unbroken pass of the whole 31 s take, placed once at 10.1 s, tuned 50 cents down to the bell; one fade in; it dies away by itself at about 40 to 41 s, before the weight lands. In the valley it is far (A) or absent (B), never paused | One level through the seal |
| 3 | The bell lived 0.42 s, then a 13 dB drop through a 20 ms hole; its note played twice | One note. The stroke holds at full to 47.3 s (1.5 s, across the cut), then falls into the ground as a low hum; the same decaying note is still in the air at the cup. Body and lower partials raised for a larger bell | In the mix the stroke reads as a bell: z 3.7 (strong), though against "doorbell" only 50 % to 41 % |
| 4 | The roar: the model's, "a jet engine", mono, ramped in, stopped 82 ms early | Made here: a crack, a pressure burst, a boom, then two layers of falling rock left and right, running to the cut | "Rockslide" 99.9 %, z 3.7 (was a jet engine) |
| 5 | The valley had no weight and no air | A field-wind bed made here; low sound only as events: the bowl buzzing on the stone and a 30–42 Hz swell at the water, a shudder as the face slips, a rumble under the daughter, the arrival | Wind 71 %, z 2.2: weak |
| 6 | The model's close sounds failed | Replaced with sounds made locally (`audio/sfx/v9/`, 25 files, `tools/foundry_v9.py`): hoe, steps, bowl, boots, ox, crows, run, breath, water, seal. Of the model's sound only the swallows, a breath and the father's grab are kept | Run in mud 100 %; seal "soft wet squelch" 98 %; see what still fails |
| 7 | The scale was flat: an ox louder than the Hierophant | Levels set by the story (table below) | Ox −21.0, bowl −24.2, lines −15.0 |
| 8 | Marks at the joins: a notch, a click, a hole, an 82 ms gap | Every join checked in 5 ms steps | No 5 ms stretch at any of the six cuts falls more than 5.7 dB under the quieter side; no digital silence anywhere |
| 9 | −22.3 LUFS; on a phone the film seemed to end early | −18.7 LUFS, true peak −1.9 dBTP; the limiter acts only on the stroke (2.0 dB, 45.79–46.88 s) | Time under −45 LUFS on a phone: 12.6 s before, 1.9 s (A) and 3.1 s (B) now |
| 10 | The choir a quarter-tone sharp of the bell | The take slowed by 2.85 %, 50 cents down | By arithmetic; not judged by ear |

## The scale, loudest moment of each event (LUFS)

| Event | v8 (from the audit) | v9 A |
| --- | --- | --- |
| The stroke | −10.8 | −10.4 |
| The answer | — | −13.5 |
| The opening stroke | −16.5 | −13.7 |
| The landing of the bell's weight | −18.4 | −14.0 |
| The arrival of the fall's sound | −14.7 (the roar) | −14.3 |
| The Hierophant's lines | −17.8 | −15.0 |
| The run before the sound arrives | — | −19.7 |
| The seal pressed | −22.4 | −19.9 |
| The ox | −15.3 | −21.0 |
| The crows | — | −21.6 |
| The bowl set on the wall | −18.7 | −24.2 |
| The water trembling | −36 | −34.7 |
| The hold before the landing | — | −37.3 |

The stroke is still the loudest thing in the film, by 3.1 LU over the answer (in v8 its margin over the next event was 3.9 LU; everything else was raised 2.5 dB to reach −18.7).

## The three open calls

1. **The choir in the valley:** both rendered, for the author's ear (A far, B silent).
2. **A hum in the ground:** none. Low sound comes only as events.
3. **When the roar arrives:** late, as designed (54.36 s, 1.9 s into the run), but as a hit: the ground first, a crack, then a wall of rock.

## What still fails the listening model

Six of thirteen checks in the finished mix. Each is a forced choice by earshot between what the sound should be and what the audit's listeners took it for.

| Sound | In the mix it reads as | Note |
| --- | --- | --- |
| The answer (the gallery) | "a synthetic robotic voice", 100 % | The video model's voice; thickening it to a crowd did not change this. Same in v8. Needs the voice work, not the mix |
| The cup's ringing note | "a synthesizer drone", 100 % | A synthesized bell, eleven seconds after its blow |
| The bowl set on the wall | "a plastic object dropped", 93 % | Wooden bowl 50 % when heard alone |
| The ox | "a pig", 97 % | Ox 85 % alone on its layer; 14 LU under the lines now |
| The crows | "a whoosh", 69 % | The generated take failed its own check and is used with two synthesized caws |
| The hoe and her steps | "a metal latch", 86 %, in the mix | The window lies under the answer's tail. On the valley's own layers it reads as hoeing in a windy field, 95 %. Together and louder, hoe and steps read as "a sword drawn" (92 %), so the steps were set 10 dB lower and dulled |

Weak rather than failed: the valley's air (wind 71 %), the stroke against a doorbell (50 % to 41 %).

A second listener, Gemini, given the sound alone twice, heard all three lines correctly but called the landing and the stroke "drum strikes" and the roar "swords clashing". earshot contradicts it on the roar (rockslide 100 %, blades 0 %). Two listeners that disagree settle nothing.

## Not done

- No new voices: the three lines and the answer are still the video model's.
- The bell is still synthesized here; its pitch is lower and larger than v8's but not a recorded ninety-ton bell.
- Of the foundry's 25 sounds, three failed their check and two of those are unused (`bell_ram_clang`, `applause_gloved_vast`); `wax_peel`, `grab_run_up` and `wind_altitude_arches` passed and are unused. Details in `audio/sfx/v9/manifest.json`.
- The panel has not re-scored this cut.
