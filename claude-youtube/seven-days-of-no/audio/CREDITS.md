# Sound credits: Seven Days of No

## Voice

- Narration: the author, Osita Miles. His own recording (`audio/vo/voice_2.mp3`), with the slate cut (`tools/vo_edit.py`).

## Music

- The four beds are generated with **Lyria 3.5** (Google Gemini API, `lyria-3.5`) from the prompts in `audio/score_plan.json`: takes T2 (main), T3 (hush), T4 (lift) and T5 (closing). The takes carry Google's SynthID watermark. They were made for this video, then windowed, transposed and mixed here.

## Effects

| Sound | Source | Licence |
|---|---|---|
| phone_buzz, notify, pop, pop_2, pop_3, send, receive, ding, bulb, cloud, whoosh, whoosh_2, wrong, clang, stomach_drop, wobble, bird, battery_low, swell, rain, grow, click, dim | Synthesised in code for this video (`tools/synth_sfx.py`) | Made for this video; no third-party material |
| door, run, typing, camera_shutter, plate_slide | Generated locally with **Stable Audio 3.0 Small SFX** (q8_0 GGUF through audio.cpp), prompts and seeds in `audio/gen_plan.json` | Stability AI Community License |
| stamp | One Too Many's `sfx/stamp1`: "Stamp.wav" by abstraktgeneriert, https://freesound.org/people/abstraktgeneriert/sounds/213003/, layered over a synthesised thump | CC0 |
| footsteps, step_1, step_2, step_3 | One Too Many's `sfx/step1`–`step3`: "WoodType_1_Footstep_MensDressShoe_.wav" by monte32, https://freesound.org/people/monte32/sounds/405115/ | CC0 |
| footsteps, step_4 | One Too Many's `sfx/step4`: "Wood Floor Classic Shoe Footstep 1_10" by Joao_Janz, https://freesound.org/people/Joao_Janz/sounds/504020/ | CC0 |

## Tools

These tools were used to make and check the sound. None of their material is in the soundtrack.

- earshot (MIT), github.com/Leonxlnx/earshot
- audio.cpp
- librosa
- pyloudnorm
- ffmpeg

Credits stay out of the picture unless the author asks for them.
