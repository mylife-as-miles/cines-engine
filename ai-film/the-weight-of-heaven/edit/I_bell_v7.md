# Movement I, cut v7: cut v6 with the vale's sound rebuilt

The author, 26 November, of the vale's sound ("still the model's own track, with its low drone"): "Fix this". Editing and local synthesis only; nothing generated on fal.

`out/review/I_bell_v7.mp4` · 53.2 s · the same picture and the same joins as cut v6 (`edit/I_bell_v6.md`) · −19.5 LUFS, peak −2.1 dBFS
`out/review/Q03A_t2_fixed_newsound.mp4` · the Anvil Vale passage alone with its new sound

Built by `tools/mix_vale.py` (the vale's track: `out/edits/Q03A_t2_vale_mix.wav`, stems in `out/edits/stems_vale/`) and `tools/combine_bell_vale.py --name I_bell_v7 --vale-wav out/edits/Q03A_t2_vale_mix.wav --vale-gain 0 --dust-duck 0`.

## What the model's track was

Picture-synced production sound (steps, two swallows, a breath, the bowl set down, boots going away, the ox, the wings) over a steady low drone: a tone at 70 Hz and a floor below 250 Hz, a low pulse under the water and a rumble over the dust shot, where the prompt asked for near silence.

## What replaces it

| Layer | What it is |
| --- | --- |
| Production | The model's track with its steady part removed: at each frequency, whatever level the sound holds for most of a two-second window is treated as drone or bed and subtracted; what stands above it (a swallow, a step, a wing) stays. Then a 105 Hz high-pass and a limiter on single spikes. Kept under the vale, the wall and the ox; muted under the water and the dust. |
| Wind | One clean bed of ground wind (`audio/sfx/wind_vale.flac`, synthesized with the foundry's wind maker, resonances wandering between 170 and 700 Hz, nothing under 200 Hz). An ear-model reads it as "a gust of wind rushing past". It is hushed under the water and falls away to almost nothing on the dust shot. |
| The water | Wind, far off, and nothing else, as the approved prompt asks. A designed ground pulse exists (`--tremor`) and is off. |

## Measured, model's track → new

| Shot | Under 120 Hz (dBFS RMS) | Under 250 Hz |
| --- | --- | --- |
| The vale | −44.4 → −50.1 | −42.0 → −42.4 |
| The wall | −45.5 → −51.7 | −40.8 → −38.5 |
| The water | −43.4 → −67.5 | −34.3 → −49.3 |
| The ox | −30.8 → −44.7 | −27.7 → −31.9 |
| The dust | −38.4 → −71.1 | −36.3 → −53.9 |

The 70 Hz line is gone (65–75 Hz: 38.3 → 6.6 dB on the same scale). Under 250 Hz the vale and the wall measure about the same as before because the swallows, the knock of the bowl and the wind now sit there in place of the drone.

## Not proven by ear

Nobody has heard it. A listening model is no use on this question in either direction: shown the picture it reports a rumble under the water and the dust in both the old track and the new one, where the new one measures 15 to 30 dB emptier; given the sound alone it reports no drone in either. The numbers above are the evidence; the author's ear is the test.
