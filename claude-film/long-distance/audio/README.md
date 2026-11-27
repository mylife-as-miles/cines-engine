# Sound

*Long Distance* has a sparse score: one felt-piano motif, heard twice (see "The score" below). The rest of its soundtrack is two voices, a few quiet effects and the rooms, and it is built from the film's own cue sheet: every sequence names its beds and cues in `sound(S)`, the voiced lines carry their takes, and nothing is placed by hand. A re-timed picture rebuilds the mix.

## The idea: grain and gloss

The phone speaks in the real woman's voice, but dry, close and too clean, with no room behind it; the real woman has the room, her breath and the years (`design/DECISIONS.md`). The mix carries that into everything:

- **Gloss: everything the phone makes** is synthesised in code, clean and dry, and no room is ever put on it: its voice, send, receive, the taps and typing on the glass, the scrolls, lock, wake, and the vibration's tone (on the mirror, on the desk, through the bedroom wall). Every one of the phone's lines is levelled to exactly the same loudness (-16 LUFS before the master): perfectly even.
- **Grain: everything real** is a recording-like sound with texture, placed in its own room: each sequence has a space (bedroom, bathroom, office, the concrete stairwell, the bus, the flat), and every real effect is convolved with that space before the mix. Her voice when she is really there gets the flat's room (RT 0.45 s), a touch of distance and her own dynamics; his gets the same room, drier; in bed at night he is close, in a short soft room that is barely there.
- **Silence is an instrument.** The room goes quiet as he holds his breath (Q10, 9 dB down over 3 s) and drops out entirely when she lets the screen go dark (about 1.4 s of nothing), then comes back 6 dB under where it was. The app opens in Q11 with no sound at all: nothing dials, nothing rings. After the last "I love you too." the world is ducked to room tone, and the black and the title are digital silence.

## The score

The author chose a sparse score (27 November 2026). One felt-piano motif, heard twice, both cues cut from a single Lyria 3.5 take so they share instrument, key and room (`audio/score_plan.json`):

| Cue | Where | What |
| --- | --- | --- |
| M01 | Q06, 3:17.5–3:45.5 | He stops chewing and looks at the waterfall photo: the motif enters under the room (take T2 from 1.0 s, -17 dB house level, 2.5 s in), carries L007 (ducked under it), the lock/wake rhyme and the push to the strip, and fades into the hard cut. The first music in the film. |
| M02 | Q11, 7:57–8:23.5 | After the last "I love you too." he lies down with the phone beside his face: the same piano returns, the take's sparse held last 26.5 s (-15 dB), and its own fade to silence ends exactly at the cut to black. |

Silences kept: the screen going dark (Q10), the app opening with no ring (Q11), the black and the title (digital silence). Three takes of one prompt were generated (`takes` in the plan; `python3 tools/lyria.py`) and checked with `tools/score_check.py` (earshot plus librosa: `audio/score/check.json`): all three solo piano, sad and melancholic, no vocal, drum or choir tag; T2 was chosen for its two halves (a melodic first half, a sparse held second half) and the only clean natural fade of the three. It is retuned by 9 cents to A = 440.

## What each sound is and where it came from

| Sounds | Source |
| --- | --- |
| Every line | Gemini TTS, en-us-varo (him) and en-us-tova (her and the phone), chosen by the author (`audio/vo/voice_map.json`). L008 is L005's take, sample for sample. |
| Her laugh on the phone (Q01, `laugh_phone`) | Gemini TTS, en-us-tova, take 6 of nine ("Ha ha ha.", directed as warm, voiced laughter; 2.26 s). Every TTS laugh leans toward "a woman sighing" in earshot's forced choice; this one has the largest laugh share (15%) and the highest z (+5.2), and Whisper hears only "Hahaha.". Through the phone's treatment, 3 dB under her lines; it starts 0.16 s after the murmur's punchline. `audio/vo/vocal_fx.json`, `vocal_fx_check.json`. |
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
   - **the world** (`out/mix/bed.flac`): the beds looped to their spans with their fades and relative levels (`audio/sound_map.json`, levelled against the voices), an air floor at -60 LUFS, the knocks at their designed level, the world's envelopes, silences and ducks; then the score from `audio/score_plan.json` (each cue a window of its take, retuned, normalised to -23 LUFS and set to its level, with its fades), placed under the voices; the world's silences do not silence it, so every cue ends before the black;
   - **the voices** (`out/mix/voice/`): each take through its treatment (`voices` in the sound map), then levelled as heard (`levels.json`);
   - **the effects** (`audio/cues.json`): each real sound with its sequence's room, each gloss sound dry, for opus-sound-layer's `mix.py`, which places each sound's peak (or start) on its cue, solves its level against the bed in its own band, ducks the bed 9 dB under the voices and masters to -18 LUFS with a -2 dBTP limiter. `tools/layer_mix.py` runs that `mix.py` unchanged on disk with two changes made as it loads: the bed keeps the level it was built to (mix.py would lift any "music" to -23 LUFS, which for room tone means 18 dB louder, 7 LU under the voices), and the master and stems are 24-bit FLAC (the disk could not hold WAV and float stems). mix.py's shared room is off: the gloss must stay dry, and the real sounds carry their own rooms.
   - the master's sample peaks are then held at -3 dBFS (the AAC encode overshoots the synthesised taps' transients);
   - the final mix is also written as `out/mix/long_distance_mix.wav` (48 kHz stereo, 24-bit) for the 1080p master;
   - `--mux` (or `--mux-only` to mux an existing mix): the review copy, `out/long_distance_mixed_720p.mp4` (1280×720, CRF 23, AAC 192k, faststart), scaled straight from the picture's three segments (`out/export_tmp/segs.txt`; no full-resolution copy is written).
4. `uv run tools/layer_qa.py out/long_distance_mixed_720p.mp4 --audio out/audio` (opus-sound-layer's `qa.py`); `<earshot venv>/bin/python tools/listen.py` (the key moments, `audio/reports/earshot_listen.json`).

## What the checks show

Final mix for the locked picture (cut 4, 517.5 s), `out/mix/long_distance_mix.wav` (48 kHz stereo, 24-bit) and the review copy `out/long_distance_mixed_720p.mp4`.

`tools/layer_qa.py` (opus-sound-layer's `qa.py`):

| Check | Result |
| --- | --- |
| Offset, encoded audio against the mix | pass (0 samples) |
| Loudness | pass: -18.17 LUFS against -18 (mix.py: -18.06; sample peaks held at -3.00 dBFS) |
| True peak | pass: -2.71 dBTP on the encoded file |
| Voice | pass: the bed sits 30.0 LU under the voices while they speak |
| Silence | pass (planned: the held breath and the dropout in Q10, the black and the title) |
| Sync | all 28 peak-aligned effects within their frame limit |
| Music | flags the planned quiet: the dropout (416-417 s), the room 6 dB down and ducked under L023 (424.5 s), the silent title (503.5 s on) |
| Audible / hero body | 32 effects pass, 86 fail the tool's 1.5 dB test (4 heroes its 3 dB): 58 of them are the phone's tiny taps, typing and scrolls; the rest are soft cloth, steps and doors in near-silent rooms. Two reasons, both noted for opus-sound-layer: mix.py solves each gain on the mono sound but pans it at constant power (centre = -3 dB a channel), so every centred effect lands 3 dB under its own target; and both tools floor a band at -60 dB, so in a near-silent room "audible" becomes an absolute threshold. The result is the film's quiet register; `LISTEN.md` asks a human whether the taps are heard. |

earshot (`tools/listen.py` → `audio/reports/earshot_listen.json`):

| Moment | What earshot heard |
| --- | --- |
| Q01 murmur (0:15-0:18) | "a man murmuring quietly, the words cannot be understood" 99% against "a man speaking clearly" 0% (strong, z +3.2); about 12 LU under the lines |
| Q01 her laugh (0:18) | a strong match for "a woman laughing softly" (z +4.7), but in the forced choice 10% laugh against 90% "a woman sighing": every TTS laugh leans that way |
| "Tell me about your day." (0:06) | "a woman speaking softly, very close and intimate" 66%, telephone 23%, a room with an echo 11% |
| The three knocks (4:09) | "knocking on a wooden door", strong (z +3.1), 63% against "hammering a nail" 34%; AudioSet Knock; peaks -12.9 to -14.1 dBFS, about 14 LU under the voices, 7 LU over the room before them |
| The screen going dark (6:56) | the room -40.0 LUFS, then -45.4 as he holds his breath, then nothing (peak -75 dBFS) for about 1.4 s, then back at -47.0 |
| "Are you there?" / "Yes." (7:51) | 0.12 s apart; him -18.4 LUFS, heard as "a man whispering" (90%); "Yes." -14.5 LUFS, "a woman saying one word softly, very close" >99% |
| The black and the title (8:23-8:37) | digital silence |
| Phone against real | the phone's lines 96-98% "very close and dry"; her lines in the flat 93-95% (5-6% "in a room"). earshot hears the room only faintly on a voice; the ear decides (`LISTEN.md` 1) |
