# Sound credits

Music: one take of Lyria 3.5 (Google Gemini API, model `lyria-3.5`), `audio/score/T2.mp3`, cut into the two cues M01 and M02; SynthID-watermarked. Prompt and model text in `audio/score/T2.json`. Takes T1 and T3 were generated and not used.

## Voices

Every line is voiced with Google's Gemini text-to-speech (`gemini-3.8-flash-tts`), in two voices from Google's voice library chosen by the author by ear (`design/DECISIONS.md`): **en-us-varo** (him) and **en-us-tova** (her, and the phone, which speaks in her voice). The takes are in `audio/vo/` (`voice_map.json`).

The same voices made two sounds that are not lines (`audio/vo/vocal_fx.json`):

- `laugh_phone`: her soft laugh on the phone (Q01), en-us-tova, take 6 of nine.
- `murmur`: his voice telling her about an ordinary day (Q01), en-us-varo, low-passed at 420 Hz until no word can be understood.

## Effects and room tones

Generated locally with **Stable Audio 3.0 Small SFX** (Stability AI Community License, free under USD 1M annual revenue), run on the CPU through [audio.cpp](https://github.com/0xshug0/audio.cpp): every room tone, the knocks, the doors, the steps, the cloth, the fork, the breaths, the bus. `audio/kit/` (FLAC), from `audio/gen_plan.json` and `audio/gen_variants.json`; each sound's prompt, seed, trim and earshot check are in `audio/kit/plan.json`.

The phone's sounds are **synthesised in code** (`tools/synth_sfx.py`): send, receive, the taps on glass, the typing, lock, wake, the vibration's tone (on the mirror, the desk, through the wall) and the scrolls. No recording is in them.

CC0 recordings reused from *One Too Many* (`../one-too-many/audio/sfx/`), both from Freesound:

- `cloth1` (the phone set on and picked up from the cushion): "foley cloth rustle.wav" by martian, CC0, https://freesound.org/people/martian/sounds/19291/
- `cloth2` (the makeup bag lifted off the shelf): "Person Rolling on Floor Clothing Rustle" by KoimeMatsuchiya, CC0, https://freesound.org/people/KoimeMatsuchiya/sounds/872226/

## Tools

- [opus-sound-layer](https://github.com/Bodila51/opus-sound-layer) `mix.py` (placing, levelling, ducking, mastering) and `qa.py`, run unchanged on disk through `tools/layer_mix.py` / `tools/layer_qa.py`.
- [earshot](https://github.com/Leonxlnx/earshot) (MIT): every generated sound checked and ranked by ear-model; the final mix listened to at its key moments.
- Whisper small.en (OpenAI, MIT) through Hugging Face transformers: the murmur's intelligibility check.
