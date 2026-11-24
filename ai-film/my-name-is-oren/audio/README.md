# Sound: My Name Is Oren

The film's sound is the generated takes' own sync sound (voices, footsteps, the street as each generation heard it), levelled and joined by `tools/assemble.py`. Under it sits one sound world made with **Stable Audio** and checked with **earshot**, the way Claude Film builds its sound (`.claude/skills/cines-engine/references/sound.md`).

**The current mix:** `out/edits/Q01_Q13_v5_sound.mp4` (Q01–Q13, 5:09, −18.5 LUFS, true peak −1.4 dBTP).

## What was wrong, and what fixed it

earshot listened through the cut (`earshot timeline`, `describe` on every take) and found four problems.

1. **Dead air between lines.** Some generations drop to near-silence between lines: 1–2.6 s drops to −38 LUFS in Q02, Q07–Q08 and Q11.
   - The fix is a continuous street bed under the whole film, plus the laundrette's machines from the first sight of its window.
   - That cut the near-silent stretches from 17 to 12. The ones left are the bed playing alone between lines, not digital silence.
2. **Music under Q10's dialogue.** The generator put a drone/score under Q10 (AudioSet Music 0.85, "scary music"), against DECISIONS ("no music under dialogue").
   - `tools/stems.py` (Demucs htdemucs) split Q10 into voices and the rest. earshot read the voice stem as speech with no music, and the rest as music (0.73).
   - The edit now takes Q10's voices from the stem (`edits/Q01_Q13_v5.json`).
   - Its ground comes from the beds, raised by 6 dB (street) and 4 dB (laundrette) over Q10.
   - In the new mix earshot reads Q10 as speech (0.93) and street ambience, with no music in its reading.
3. **A different world at every join.** Each generation's street sounds different. The one bed under everything carries the street across the joins. Sequence levels were already matched on dialogue (lesson 52).
4. **Effects the picture shows but the takes underplay.** Four quiet effects (11–14 dB under the voices) where the source is on screen:
   - the sweepers scrubbing the gutter in the first shot
   - the city units bagging the bin
   - the sweeper's brush running into Helena's boot and stopping ("Apologies.")
   - the brush against Oren's taped slipper

## How it is built

| Step | Tool | Data |
| --- | --- | --- |
| Make the sounds: Stable Audio 3.0 Small SFX, on the CPU through audio.cpp, 2–3 seeds each | `tools/sfx_gen.py` | `audio/gen_plan.json` (prompts, seeds, the match and alternatives earshot judges against, earlier tries) |
| Pick each sound: earshot ranks the takes and checks the winner against the alternatives | `tools/sfx_gen.py` | `audio/sfx/plan.json` (the chosen seed and earshot's verdict), `audio/sfx/*.flac` |
| Split a scored take into voices and the rest | `tools/stems.py` (Demucs) | `audio/stems/` (rebuilt, not committed) |
| Assemble the picture and the takes' sound, with any voice stems, and write the edit decision list | `tools/assemble.py` | `edits/Q01_Q13_v5.json` → `out/edits/Q01_Q13_v5.edl.json` |
| Lay the beds and effects on the film's clock, under the edit's sound | `tools/sound_mix.py` | `audio/sound_plan.json` (every sound, where, how loud, why) |

Placements are written as moments on a take's own clock (`Q01_t1@4.25`) and mapped through the edit decision list, so a re-cut moves each sound with its picture.

**Tools live outside the repo** (sound.md §1):
- earshot: `/home/user/leonxlnx/earshot`
- audio.cpp: `/home/user/0xshug0/audio.cpp`
- the Stable Audio weights: `/root/.soundbox/models/audiocpp/…`
- Demucs: in earshot's venv

To rebuild:
```
python3 tools/sfx_gen.py                                                   # only if a sound changes
/home/user/leonxlnx/earshot/.venv/bin/python tools/stems.py out/takes/Q10_t1.mp4
python3 tools/assemble.py edits/Q01_Q13_v5.json
python3 tools/sound_mix.py
```

## The sounds (earshot's verdict on the chosen take)

| Sound | Seed | earshot |
| --- | --- | --- |
| `laundrette_hum` | 201 | strong: "a tumble dryer running", #1 of 322 descriptions |
| `sweeper_bump` | 2401 | strong: "a brush scrubbing then slowing to a stop", #1 |
| `sweeper_brush` | 2301 | strong: "a street sweeper brushing the road", #2 (its forced choice leans to "a broom sweeping", the same kind of sound) |
| `bin_bag` | 5501 | strong: "a plastic bag rustling", #1 (forced choice leans to paper crumpling) |
| `street_bed` | 4101 | plausible: its own best match is "a city street with traffic" (#1), but against "a strong wind" it loses 23/77. Six takes over two prompts all read this way, so the mix high-passes it at 120 Hz, where the wind-like rumble sits. |

`LISTEN.md` lists what only a person can judge. `CREDITS.md` lists the sources and licences.
