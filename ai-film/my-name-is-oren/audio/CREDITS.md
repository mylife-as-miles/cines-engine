# Sound credits

| Sound | Source | Licence |
| --- | --- | --- |
| Dialogue and the takes' sync sound | Generated with the picture by Seedance 2.5 (fal) and, for Q01–Q02, by Higgsfield | Per those services' terms |
| `street_bed`, `laundrette_hum`, `sweeper_brush`, `sweeper_bump`, `bin_bag` (`audio/sfx/`) | Stable Audio 3.0 Small SFX (Stability AI), run locally through audio.cpp from the `audio-cpp/audio.cpp-gguf` q8_0 GGUF; prompts and seeds in `audio/sfx/plan.json` | Stability AI Community License (free below USD 1M annual revenue; https://stability.ai/license) |
| Q10's voice stem | Separated from the Seedance take with Demucs htdemucs (Meta) | Demucs: MIT; the audio remains the take's |
| Listening checks | earshot (MIT), with the LAION CLAP and MIT AST models | — |
| The final cue, M01c (`audio/score/M01c_cue.flac`) | Lyria 3.5 (Google), prompt in `audio/score_plan.json`; window 24–48 s of the 62 s take, faded | Google Gemini API terms; SynthID-watermarked; commercial use per Google's generative AI terms (checked 2026-11-25); final, chosen by the author |
| The over-black city voices (`audio/gen/over_black_voices/`) | Gemini TTS (gemini-3.8-flash-tts; en-gb concierge 1–4, assistant 1), lines in `audio/over_black_voices.json` | Google Gemini API terms; generated voices, no real person's likeness |
| The two-note chime | earshot `make --sound notify/pair` (made in code) | earshot MIT; no recording |
