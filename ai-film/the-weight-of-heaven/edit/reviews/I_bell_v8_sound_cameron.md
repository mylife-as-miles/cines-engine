# Movement I, cut v8: does the sound tell the story (Cameron's standard)

Review only; nothing changed or spent. **Measured**: mine, from the mix, the layers and the cut's frames (loudness = loudest 400 ms, K-weighted). **Listener**: Gemini, sound only, nine passes (three "what happens", three moment by moment, three on 43.5–64.1 s); fallible, its times drift; earshot's z-scores beside it. **My reading**: inference. Nobody has heard the mix.

## Verdict

Above, the sound tells its story: strain, hush, landing; creak, hush, swing, stroke. Below, every link is mute, mislevelled or unrecognisable, and a film about weight on the ground has a ground with no weight in it: nothing under 120 Hz, no hum, a tremor with no sound, a roar that is a 34 Hz sine and a fade-in. By ear alone the sequence is a rite, a drawn blade, an attack, a chase and a blackout: another film.

## Scores

| Cause and effect audible | Weight | Each beat clear by ear alone | The ending | Storytelling overall |
| --- | --- | --- | --- | --- |
| 4 | 4 | 3 | 4 | 4 |

## The hierarchy, measured (LUFS)

Stroke 45.8 **−10.8** · roar's last half-second −14.7 · ox 35.5 **−15.3** · first stroke −16.5 · lines −17.7 · landing 42.8 −18.4 · father's grab 52.1 −18.4 · bowl on stone 23.5 −18.7 · swell on the cut to the girl −20.5 · roar's **arrival** 54.6 **−21.1** · choir before the press −21.5 · seal press **−22.4** · cup −25.2 · the water **−36.1, wind only**.

The top is right. Under it an ox outranks the lines and the landing, a bowl and a grab equal ninety tons, the mountain arrives quieter than the bowl, and the seal sits under the choir it interrupts.

## By ear alone (listener)

Lines word-perfect 6/6; first stroke a bell 4/6. A blade drawn at 18–20 s 5/6. Seal 0/6, water 0/6. Ox 0/6 ("gasp of pain", "creature screech"; earshot hears an ox, z +3.6). Landing: a door slam or a body 6/6 (earshot: weight and chains, z +6.4). The climax a bell 0/9 (earshot z +2.5; v5, same length, +3.6). A rockslide 0/9 (earshot: no match, z +1.5). At the cup a bell 0/9, applause 0/9: tinnitus or a pad (earshot: "orchestral chord" 98 %). No pass heard two worlds alternating. Lost: the seal, the water, the bell, the mountain, the stillness.

## Problems, worst first

1. **31.6–34.1, the water: no sound, no cause.** Measured: ripples from 31.6, rings 32.4–33.0; mix −39.2 dBFS before, −39.8 during; −73 dBFS under 120 Hz. The landing comes ten seconds later, so the seal (29.1) is the only cause on offer and nothing joins them. The script's hum "in the ground and in the teeth" went out with the model's drone. **Fix (numpy; `mix_vale.py --tremor` exists, off):** a hum under every vale shot: sines at 31 and 33.5 Hz, 63 Hz 12 dB under, −36 dBFS, +3 dB after 31.6 and at 46.2. At 31.5, two frames before the first ripple, a 45→30 Hz down-chirp, 0.6 s, peak −16 dBFS, an 80–110 Hz body 8 dB under; smaller pulses at 32.3 and 33.4. Over it, Stable Audio: "close-up, very quiet, water shivering in a wooden bowl, tiny droplets ticking, no music".

2. **52.5–57.1, the roar does not arrive.** Measured: the dust wall fills the frame from the cut at 52.5; the far bell ends at 53.0; 53.1–54.3 is the valley's quietest stretch (−33 LUFS, boots −36); the "arrival" is a pure 34 Hz sine (above 300 Hz the mix at 54.4 is 8 dB lower than at 53.9) under a roar that enters at −31 dBFS and ramps for 2.5 s; nothing in the picture moves at 54.3. My reading: dust that has reached them means the sound came first. **Fix:** arrive on the cut, 52.5 (he has her at 52.0, as scripted), as a wall: noise burst 30–150 Hz, 5 ms attack, 1.5 s decay, peak −8 dBFS, under Stable Audio "a cliff face collapsing, boulders crashing and grinding, deep thunderous roar, close, no music" held at −13 to −12 LUFS; boots and breath +8 dB. Drop the sine and the model's roar.

3. **49.7, the silence is broken by nothing.** Measured: a 0.9 s swell (peak −11.1 dBFS; earshot "swish, whoosh") on a girl standing still; she reaches at 50.4. **Fix:** delete it. The ground arrives first: 30–60 Hz rumble swelling 49.6→52.5, −40 to −22 dBFS, and the bowl chattering on the stone 49.9–51.2 ("a wooden bowl rattling on a stone wall as the ground shakes, close, dry"): her reason to take it. Through 46.2–49.7 lift the near wind 8 dB and add one close breath, so the valley is heard listening.

4. **57.1, the cup lands as a blackout.** Measured: the roar ends at 57.05, two frames early (82 ms at −47 dBFS while he still runs); the note is the tail replayed from 0.42 s after the stroke, as loud (−25.6) as in the valley at 46.5 (−24.8), where it died at 53.0; applause −31 to −38 LUFS. Listener: "struck, dead, deafened" 6/6. **Fix:** one continuous tail re-rendered to 19 s (`mix_bell.py`), masked by the roar, uncovered on the frame; applause +8 dB.

5. **45.8–46.2, 0.42 s of bell.** The ring that says "bell" is low-passed on the cut. **Fix:** full ring over the cut to 47.0 (the mesa is static until the cracks at 47.5), then 0.5 s to "far", 18–20 dB down; overlap the join (now a 20 ms notch to −50 dBFS).

6. **27.5, the seal is not an event.** Measured: mix −25.2 dBFS before, −25.5 on it. **Fix:** choir out 27.2–28.1, press +5 dB, a 100 Hz half-sine, 80 ms, −20 dBFS, under it: the thump the ground answers.

7. **Relevel.** Ox −6 dB and give it a chest (−48 dBFS under 120 Hz); bowl −4; grab −5 (earshot "balloon squeak", z +3.2); landing +3; cut the 50 ms click at 18.45 (peak −7.5 dBFS, 15 dB over its surroundings, on a wide shot, under "bring down").

## Keep

- The tower: strain 40.9, near-silence 41.5–42.3 (−43.6 dBFS), landing 42.39 on the slack chains; creak, hush 45.0–45.5, whoosh, stroke 45.755 against contact 45.79.
- The stroke first by 3.9 LU, with real low end.
- Sync: press 27.52 (touch 27.54), lift 29.105, ox 35.155 on the head toss.
- The lines; the answer running on over the vale.
- The ending's plan: a mute fall, a late sound, a hard cut to stillness; the cut reads as deliberate 6/6.
