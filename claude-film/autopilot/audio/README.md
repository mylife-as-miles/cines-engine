# Sound

The soundtrack is built from the film's own cue sheet: every sequence declares its beds and cues by name in `sound(S)`, and the voiced lines carry their takes. Nothing is placed by hand.

## How it is built

1. **The cue sheet.** `node tools/cuesheet.js out/cuesheet.json` dumps every bed, cue, silence and duck in global seconds, with the voiced takes: 72 beds, 199 cues, the world's silence from the door (644 to 687 s) and four ducks.
2. **The sounds.** Freesound and its CDN refuse this build machine, so the effects and room tones were generated locally with Stable Audio 3.0 Small SFX through audio.cpp (`tools/sfx_gen.py`, `audio/gen_plan.json`). earshot checked each against its description (`audio/gen/check.json`); weak ones were regenerated as variants and ranked (`tools/sfx_variants.py`, `audio/gen/picks.json`). Where the model could not make a convincing small sound (clicks, taps, latches, fabric, a creak), CC0 recordings from *One Too Many* stand in. The designed tones (the phone alarm, the charging chime, the email, the laptop, someone's ringtone, the flash cut) are synthesised (`tools/synth_sfx.py`). The sounds used are in `audio/kit` (FLAC), `audio/synth` and `../one-too-many/audio/sfx`.
3. **The map.** `audio/sound_map.json` maps every bed and cue name to a sound, a level, a filter and per-sequence overrides (footsteps on stairs, gravel, tarmac or carpet; the radio fading out of the journey). A few names are silent on purpose (the kiss, a sip, a dog panting, a distant lawnmower).
4. **The score.** `audio/score_plan.json` is the plan: one felt-piano figure for the routine (D major, about 72 bpm), warm at breakfast and thinning through the day; the mirror's music box; the heat's still glass; a pulse and a swell cut off after "Where's Emily?"; silence from the door; the routine once more under the end card, its last note missing. `python3 tools/lyria.py` generates the 15 cues with Lyria 3.5 (about $0.08 each). `tools/score_check.py` listens to every take with earshot: music only (no vocal or drum tags), tuning within 15 cents of A440. Breakfast and the mirror first read as sad (75% and 72% in a forced choice against warm); new takes in an explicitly bright major key read warm (98% each). The radio's music (R01) plays through a small speaker as a bed.
5. **The build.** `uv run tools/build_mix.py --mix --mux` makes the bed (the room tones looped to their spans with their fades and relative levels, a faint air floor so no moment goes digitally dead, the world's silences and ducks, then the score windowed past each take's intro, retuned to A440 and placed), the voices (Daniel's takes clean; the presenter through a small speaker, quieter) and the effects cue sheet `audio/cues.json`. It then runs [opus-sound-layer](https://github.com/Bodila51/opus-sound-layer)'s `mix.py`, which places each effect's peak (or start) on its cue, solves its level against the bed in its own band, adds one shared room, ducks the bed 9 dB under the voice and masters to -18 LUFS with a -2 dBTP limiter. The master's sample peaks are then held at -3 dBFS (latency-compensated), because the AAC encode overshoots the glockenspiel's transients, and it is muxed over the picture.

## What the checks show

`uv run <sound-layer>/scripts/qa.py out/autopilot.mp4 --audio out/audio`:

| Check | Result |
| --- | --- |
| Offset, encoded audio against the mix | pass (0 samples) |
| Loudness | pass: -18.20 LUFS against -18 |
| True peak | pass: -2.16 dBTP |
| Voice | pass: the bed sits 13.6 LU under Daniel's voice while he speaks |
| Silence | pass (the opening title and the door are planned silences) |
| Sync | every effect within its frame limit |
| Audible / hero body | many soft effects (keys, footsteps, cloth, a breath) do not stand out by the tool's 3 dB in their band under the score or a voice; that is the film's quiet register |
| Music | flags the film's intended quiet passages (the title, the car park walk, the office at 5:37, the playground, the door's silence) as dips |

earshot on the final mix: both radio presenter lines read as "a man speaking on the radio" (strong); the phone refrain deepening as it should: "a man speaking" at 10:05, a gasp at 10:14 (AudioSet 0.65, and 1.3 dB louder), "someone whispering" at 10:56 (7 dB quieter), then "And my daughter was dead." as a quiet narration; the mirror's cue as "a music box melody"; the end card as "a soft solo piano" ("sad and melancholic music"); the lock's beep as a plausible beep.
