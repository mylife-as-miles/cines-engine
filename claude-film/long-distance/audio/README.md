# Sound

*Long Distance* has no music. Its soundtrack is two voices, a few quiet effects and the rooms, and it is built from the film's own cue sheet: every sequence names its beds and cues in `sound(S)`, the voiced lines carry their takes, and nothing is placed by hand. A re-timed picture rebuilds the mix.

## The idea: grain and gloss

The phone speaks in the real woman's voice, but dry, close and too clean, with no room behind it; the real woman has the room, her breath and the years (`design/DECISIONS.md`). The mix carries that into everything:

- **Gloss: everything the phone makes** is synthesised in code, clean and dry, and no room is ever put on it: its voice, send, receive, the taps and typing on the glass, the scrolls, lock, wake, and the vibration's tone (on the mirror, on the desk, through the bedroom wall). Every one of the phone's lines is levelled to exactly the same loudness (-16 LUFS before the master): perfectly even.
- **Grain: everything real** is a recording-like sound with texture, placed in its own room: each sequence has a space (bedroom, bathroom, office, the concrete stairwell, the bus, the flat), and every real effect is convolved with that space before the mix. Her voice when she is really there gets the flat's room (RT 0.45 s), a touch of distance and her own dynamics; his gets the same room, drier; in bed at night he is close, in a short soft room that is barely there.
- **Silence is an instrument.** The room goes quiet as he holds his breath (Q10, 9 dB down over 3 s) and drops out entirely when she lets the screen go dark (about 1.4 s of nothing), then comes back 6 dB under where it was. The app opens in Q11 with no sound at all: nothing dials, nothing rings. After the last "I love you too." the world is ducked to room tone, and the black and the title are digital silence.

## What each sound is and where it came from

| Sounds | Source |
| --- | --- |
| Every line | Gemini TTS, en-us-varo (him) and en-us-tova (her and the phone), chosen by the author (`audio/vo/voice_map.json`). L008 is L005's take, sample for sample. |
| Her laugh on the phone (Q01, `laugh_phone`) | Gemini TTS, en-us-tova, the 4th of five takes (earshot: "people laughing" z +4.3, the highest z; AudioSet: speech/gasp), through the phone's treatment, 3 dB under her lines. It lands 0.16 s after the murmur's punchline. `audio/vo/vocal_fx.json`, `vocal_fx_check.json`. |
| His murmur (Q01, `murmur`) | Gemini TTS, en-us-varo, telling her about his day (the bus, Dave apologising to the printer, the pasta thing), low-passed at 420 Hz (96 dB/oct) with a 180 Hz lift to keep him close. Whisper hears none of the script's words in it (only its own invented "hmm hmm"). The bed starts 10.55 s into the take so her laugh falls in its longest pause. |
| Room tones: night, day, dusk, bathroom, office, stairwell, landing, bus; street through the window; fridge; pendant hum; tap water; brushing; keyboard; heartbeat; her steps down the stairs | Stable Audio 3.0 Small SFX on the CPU (`audio/gen_plan.json`), finished into `audio/kit/*.flac` by `tools/kit_make.py`. Dusk is the day room low-passed at 2.2 kHz. |
| The three knocks | Three raps cut from one Stable Audio take (one door, one room), placed at a designed level (peaks -14/-14/-15 dBFS before the master) rather than the mixer's "just audible": they turn the film. earshot ranked them level with *One Too Many*'s CC0 knocks (all z +3.6 to +3.7, strong). |
| Doors (open, close, closed softly from the landing, the street door far below, a fire door above), steps (his, hers, fast), couch and chair creaks, coat, duvet, the trade, the fork on the pan, the breaths (his sigh, his breath out, her breath in), the wardrobe, the hangers, the bus's brakes, bell and doors, the far streetcar | Stable Audio 3.0 Small SFX; weak takes regenerated as variants and ranked by earshot (`audio/gen_variants.json`, `audio/gen/picks.json`). |
| The bag lifted off the shelf; the phone set on and picked up from the cushion | CC0 recordings from *One Too Many* (`otm/cloth2`, `otm/cloth1`), ranked above the generated takes. |
| send, receive, type, tap, lock, wake, buzz (glass, desk, wall), scroll, the texting bed | Synthesised (`tools/synth_sfx.py`): pure partials and smooth envelopes, no noise floor, no room. |

Silent on purpose (`null` in the sound map, with the reason in `_silent_on_purpose`): `app_open`; `chewing` and `swallow` (no take read as either: the fork carries the meal and its stopping); `zip` (no take read as a zip; his thumb on it plays over the room alone); the `scroll` bed (the seven scroll cues carry it). `phone_dim` and `breath_held` make no sound: they shape the world.

## How it is built

1. `node tools/cuesheet.js out/cuesheet.json`: every bed, cue, silence and duck on the global clock.
2. `python3 tools/sfx_gen.py --jobs 2 --check`, `python3 tools/sfx_variants.py audio/gen_variants.json`, `uv run tools/kit_make.py`: the real sounds. `uv run tools/synth_sfx.py`: the phone's. `<earshot venv>/bin/python tools/vocal_fx.py`: the laugh and the murmur.
3. `uv run tools/build_mix.py --mix [--mux]`:
   - **the world** (`out/mix/bed.flac`): the beds looped to their spans with their fades and relative levels (`audio/sound_map.json`, levelled against the voices), an air floor at -60 LUFS, the knocks at their designed level, the world's envelopes, silences and ducks; then the score if `audio/score_plan.json` ever lists cues (**the hook**: it is empty; a score added there is placed under the voices, and the title's silence can carry its last note);
   - **the voices** (`out/mix/voice/`): each take through its treatment (`voices` in the sound map), then levelled as heard (`levels.json`);
   - **the effects** (`audio/cues.json`): each real sound with its sequence's room, each gloss sound dry, for opus-sound-layer's `mix.py`, which places each sound's peak (or start) on its cue, solves its level against the bed in its own band, ducks the bed 9 dB under the voices and masters to -18 LUFS with a -2 dBTP limiter. `tools/layer_mix.py` runs that `mix.py` unchanged on disk with two changes made as it loads: the bed keeps the level it was built to (mix.py would lift any "music" to -23 LUFS, which for room tone means 18 dB louder, 7 LU under the voices), and the master and stems are 24-bit FLAC (the disk could not hold WAV and float stems). mix.py's shared room is off: the gloss must stay dry, and the real sounds carry their own rooms.
   - the master's sample peaks are then held at -3 dBFS (the AAC encode overshoots the synthesised taps' transients);
   - `--mux`: the review copy, `out/long_distance_mixed_720p.mp4`, scaled straight from the picture's three segments (`out/export_tmp/segs.txt`; no full-resolution copy is written).
4. `uv run tools/layer_qa.py out/long_distance_mixed_720p.mp4 --audio out/audio` (opus-sound-layer's `qa.py`); `<earshot venv>/bin/python tools/listen.py` (the key moments, `audio/reports/earshot_listen.json`).

## What the checks show

(filled in from the final mix: see below)
