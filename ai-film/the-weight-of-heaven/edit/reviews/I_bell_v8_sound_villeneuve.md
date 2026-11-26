# Movement I, cut v8: the sound design, against Villeneuve's standard

**M** measured · **E** earshot (z 3 and over is clear) · **G** Gemini, sound only, three passes a clip (on the cup it invented a gymnasium: trust it only where it repeats and M or E agrees) · **I** my inference. Nobody has heard this.

## Verdict

The plan is right: two worlds, weight travels down, the mountain falls silent and its sound arrives late. Cut v8 does not play that plan; it plays cut v5's cathedral mix sliced by the intercut, with hiss and the model's leftovers for a valley. The stroke, the film's biggest sound, lives 0.42 s, and after it both worlds share one hum.

## Scores

Scale 3 · Silence and restraint 4 · Two worlds 4 · Transitions 3 · Sound design overall 4.

## Problems, worst first

**1. 45.8–46.2 s: the cut kills the stroke.** M: −13 dBFS for 0.42 s, then −27 in one 100 ms step. A second on, it is 14 dB under v5's stroke and 7 dB under the *opening* stroke at the same age, with 3.6 dB less 20–80 Hz than the landing. E: "an enormous bronze bell struck once" was z +4.0, 91 % in v5; now z +2.0, 57 %. G: a bell in 0 of 12 passes; a door of 20–300 kg. I: the fall's sound takes 8 s to arrive, the bell's none. Fix: full level across the cut to 47.0, then the note *falls*: over 2.5 s a low-pass sweeps 4 kHz to 150 Hz as it drops 12 dB. The ground gets the hum (48, 96 Hz), not the note; out by 49.5.

**2. 46.2–64.1 s: one hum for both worlds.** M: the bell over the valley and at the cup agree within 1 dB in every band under 1 kHz; the still cup carries more sub than the nave. E: valley "gong" 85 %; cup "synthesizer drone" 90 %, applause 5 %. Fix (I): split the bell. Below hears only its weight. At the cup, high-pass it at 150 Hz, full hall, 8 dB lower, no applause for 2 s.

**3. 18.8 and 26.5 s: a ghost.** M: the answer's hall tail is chopped in 40 ms at 18.79, mid-shot; the same tail returns at 26.49 at −25 dBFS (the mix jumps 9 dB) and decays under the seal. It is v5's dialogue stem, sample for sample: `combine_bell_vale.py` resumes v5's master there. E: "a big drum hit", z +3.7. G, 3 of 3: the voices cut off abruptly, then an "ominous" low swell at the seal. Fix: build 26.49–30.08 from stems without the dialogue; let the tail die over the vale, to about 21.5.

**4. The valley has no air and no weight.** M: before the fall its 20–80 Hz sits at −74 to −101 dBFS (cathedral −50 to −58). Every event is mono (L/R 0.97–1.00), and it is brighter than heaven (centroid 790 against 470 Hz): upside down. E: its wind is "white noise hiss" 99 % in a forced choice (unprompted, "a gust of wind", z +3.6); its cleaned production "recorded underwater" 95 %. Fix: no drone. Make the Foley here, as the author asks (swallows, bowl, boots, the ox: E "a big cat" 57 %; the grab at 51.2–52.4: E "a door hinge" 55 %), nothing high-passed above 60 Hz. New bed, Stable Audio SFX, 30 s: "Open farmland under a heavy overcast sky, light steady wind over wet grass and a dry-stone wall, one far crow, distant sheep, wide, quiet, no music."

**5. 54.3–57.1 s: the mountain's voice.** E: "a rockslide" no match (z +0.1); "a jet engine" 96 %. G: metal or machinery, 5 of 6. M: mono; it stops at 57.05, 70 ms before the cut, after a −3 dBFS spike. Fix: drop the model's roar. Ground first: at 47.6 a pitchless shudder (noise, 25–45 Hz, 1.5 s, −26 dBFS), which gives his grab at 49.7 a cause. Air at 54.3: "A distant mountainside collapsing, heard from three kilometres: one sharp dry crack, then a long rolling roar of rock that keeps growing, deep, outdoors", two takes panned apart, cut on the frame.

**6. The silences are noise.** M: the water is 4.5 s of steady hiss at −39 dBFS; the tremor (32.4) has no sound. The dust fades −41 to −52 (E: "a downlifter sweep", z +3.1), then a choir swell takes its last half-second. The hold before the landing is 0.9 s at −43.5 (E: hiss, 99 %), after twelve cues in 6.4 s and a 2.3 s choir (E: "a riser" 72 %). The "silent" fall is a 97 Hz tone at −29. Fix: at 32.4 the smallest sound in the film, the bowl buzzing on stone (ticks at 2–4 kHz, −46 dBFS), over one sub swell (noise, 30–40 Hz, 1.2 s). Wind gone by 37.5, then 1.9 s under −55. No choir at 38.9–41.1; one strain creak alone in the hold (41.5).

**7. The scale ladder is flat.** M, loudest 400 ms: ox −15.3, the answer −17.6, landing −18.4, the family's Foley −18.4, the bowl on the wall −18.7 LUFS. Ten thousand voices equal one man (−17.6, −17.8); E: "one woman whispering" 67 %; G: "dozens". The landing: E "armour clattering" 55 %; G, 1–30 kg. Fix: ox −7 dB, bowl −8, Foley −5, chains −6. The answer: four copies, ±25 ms, ±30 cents, spread wide, one an octave down.

## The six transitions

Rule: weight travels down; nothing travels up. Sound crosses a cut only downward.

| Cut | Now | Should be |
| --- | --- | --- |
| 17.7 down | the answer runs on, then is chopped | kept, with its tail |
| 25.3 up | choir fades in 0.4 s early | hard cut |
| 30.1 down | half-second crossfade | hard cut; the press (27.5) answered at 32.4 |
| 39.4 up | choir creeps in over the dust | silence, hard cut |
| 46.2 down | a 13.5 dB step | the note falls |
| 57.1 up | right; 70 ms early, and the same hum | on the frame; the split bell |

**Low end.** In the bell and in what it does below (the falling hum, the shudder, the fall); never under the rite, the seal or the cup, never as a bed.

**Voices.** The choir is a pad switched by location: decoration (under the seal, E: "synthesizer pad" 67 %). Until the song exists, make the voice the congregation's: the answer stretched twenty times (paulstretch, numpy) into a wordless mass in the hall, on its own clock, cut hard with the picture, never heard below.

## Keep

The opening stroke (E: a bell, 99 %; it hangs). The cathedral's air (E: 85 %). The answer over the vale. The fall's sound arriving late, with its sub thud. The hard cut to the cup. The two holds, as ideas.
