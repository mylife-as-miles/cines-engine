# Sound audit of movement I, cut v8: the brief every reviewer reads

**The film.** *The Weight of Heaven*, a live-action, photoreal AI film by Osita Miles. A white kingdom, Orison, floats over the land; everything it adds to itself weighs on the people below. Movement I (64.1 s) intercuts the two worlds: above, a wedding rite, a warrant sealed unread, a ninety-ton bell set down and struck; below, a farmer and his daughter, a bowl of water that trembles, and then the face of their mountain letting go. The author's references: **Denis Villeneuve** for craft (scale, silence, restraint) and **James Cameron** for storytelling (every cause before its effect; weight that is physically true).

**The cut.** `out/review/I_bell_v8.mp4` (picture and sound), `out/edits/I_bell_v8.wav` (the mix: 48 kHz stereo, 64.125 s, −22.2 LUFS, peak −2.1 dBFS). Edit records: `edit/I_bell_v8.md`, `edit/I_bell_v7.md`, `edit/I_bell_v6.md`, `edit/I_bell_v5.md`; the cathedral's cue sheet (every cue, its source, level and reason): `audio/I_bell_v5_cues.md`.

| Film time (s) | World | Picture |
| --- | --- | --- |
| 0.0–17.67 | above | Black, one bell stroke (0.5 s), the super; the nave; the Hierophant: "Heaven chose us from the earth and raised us above the unworthy." "What heaven has raised —"; the gallery answers "Let no hand bring down." |
| 17.67–25.29 | below | The vale under the dark mass; the farmer drinks from the bowl his daughter brought, sets it on the wall, walks away; she looks at the bowl |
| 25.29–30.08 | above | Serath takes the warrant without looking; her ring into the wax (press 27.54, lift 29.12) |
| 30.08–39.38 | below | Her face in the water; the water trembles (about 32.4); the ox throws its head up, the crows rise and drop (34.6–36.7); dust on the mountain (36.7–39.4) |
| 39.38–46.21 | above | The warrant raised, tilt up to the bell; the bell released, its weight lands (42.4); the hammer hauled back; THE STROKE (45.79) |
| 46.21–57.13 | below | The mountain cracks, a section of its face slips and breaks (46.2–49.7); the daughter takes the bowl, he takes her (49.7–52.5); the run, the dust wall behind; the sound of the fall arrives at about 54.3 |
| 57.13–64.13 | above | A gold cup of wine, perfectly still; black |

**Every layer, alone, on the film's clock:** `out/review/v8_sound/*.wav` (each 64.125 s; they sum to the mix) and `out/review/v8_sound/layers.json` (when each is audible, and its level every quarter second).

| Layer file | What it is | Where it came from |
| --- | --- | --- |
| `choir.wav` | A sustained wordless choir | `audio/choir/choir_1_mixed_sustained.flac`, 9.5–23.4 s of it: made locally with Stable Audio 3.0 Small (Music). One pass, chopped by the intercut. **Audible 10.75–18.75, 25.0–30.0 and 38.75–41.25 s; silent everywhere else.** |
| `dialogue_and_cathedral_production.wav` | The Hierophant's two lines, the congregation's answer, the room under them, production sound under the hammer | **The video model's own audio** (Seedance 2.5 takes Q01, Q02A, Q02B). The voices are the model's. |
| `bell.wav` | Both strokes and the long note | Synthesized here (bell partials tuned to the take, 191.6 Hz prime), plus the take's own strike low under the second stroke. In v8 the note is also played "from far above" over the valley (46.2–53 s: 13 dB down, low-passed 1.2 kHz) and again at the cup (14 dB down, low-passed 2.5 kHz). |
| `cathedral_effects.wav` | Cloth, paper, the wax press and lift, timber strain, the bell's landing and chains, grit, rope creak, the hammer's whoosh, gloved applause | Mostly the local foundry (`tools/sfx_make.py`: Stable Audio 3.0 Small SFX on CPU, earshot's synth, numpy); **two of them are the model's audio**: the press (`FX-03b`) and the lift (`FX-04b`), and a thud under the landing (`FX-07b`). See the cue sheet. |
| `cathedral_beds.wav` | Wind at altitude; the presence of a crowd | Synthesized wind (`audio/sfx/wind_altitude.flac`); generated crowd presence |
| `vale_production_seedance_cleaned.wav` | Steps, two swallows, a breath, the bowl set on stone, boots; the ox's grunt, wings | **The video model's own audio** (take Q03A t2) with its steady drone subtracted and a 105 Hz high-pass (`tools/mix_vale.py`) |
| `vale_wind_synth.wav` | Ground wind | Synthesized (`audio/sfx/wind_vale.flac`) |
| `q03b_production_seedance_cleaned.wav` | The bowl taken, his boots, breath, water slopping | **The video model's own audio** (take Q03B t1), cleaned the same way (`tools/mix_q03b.py`) |
| `q03b_wind_synth.wav` | Ground wind | Synthesized |
| `q03b_roar_seedance_raw.wav` | The roar when the sound of the fall arrives | **The video model's own audio, unprocessed** |
| `q03b_arrival_thud_synth.wav` | A sub thud on the arrival | Synthesized |

**What the author says (26 November), in his words:** "The way the choir cuts is weird. There are a lot of things that's weird, and there's some sound that [the video model] generated that I do not like, that I prefer you generate with your own stable audio ... audit this whole stuff and give me your thoughts and criticism ... Have them review it, criticize it."

**What the lead already knows.** Nobody on the production can hear: every judgement so far is a measurement or a listening model's report. The choir is one 14-second pass cut into three pieces by the intercut, each faded in and out near the picture cuts (it falls away over 1.25 s as the vale opens, returns 0.4 s before each cut back up, fades out 0.6 s before the water). The film's own plan (`design/BEATS.md`, `design/SONG.md`) calls movement I "a montage cut to the song", with one song running under both worlds; no song exists yet, and the choir is a stand-in. The valley's lows were emptied on purpose (the model's drone removed). The design of the mountain's fall is silence first, then its sound arriving in the run.

**Your tools.** Work in `/home/user/cines-engine/ai-film/the-weight-of-heaven`.
- `ffmpeg`, `ffprobe`; `/root/leonxlnx/earshot/.venv/bin/python` has numpy, scipy, soundfile, librosa.
- `/root/leonxlnx/earshot/.venv/bin/earshot` listens to files: `describe`, `match "<words>"`, `find`, `compare`, `ab`, `realness`, `timeline`, `critique`, `measure` (`--help` on each). Its readings are calibrated z-scores: 3 and over is clear, under 2 is a guess.
- A second, fallible listener: Gemini, `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent` with header `x-goog-api-key: proxy-injected` and the audio inline as base64 (`inline_data`, `mime_type` `audio/mp3`). **Send it sound only, never the picture**: shown the picture it reports what it sees (it "heard" a rumble that measured 30 dB gone). Ask a question that does not suggest its answer, ask it two or three times, and report how often it agreed.
- The handbook's sound chapter: `/home/user/cines-engine/.claude/skills/cines-engine/references/sound.md`.

**Rules.**
- This is a review. Change nothing in the mix, the tools or the records; write only your own review file, and do not commit. Scratch files go under `/tmp`.
- Spend nothing: no call to fal (`queue.fal.run`) or any paid service. Local Stable Audio and synthesis are free but you are not making sounds here, only judging and specifying them.
- Say what you measured, what a listener reported (and how reliable), and what is your own inference: keep the three apart. If you could not check something, say so.
- Give times on the film's clock, to a tenth of a second.

**What to hand back** (in your review file and, shortened, as your final message):
1. Your verdict in three sentences.
2. Scores out of 10 on the axes named in your own assignment.
3. The problems, worst first: time, what is wrong, the evidence, and a concrete fix that costs nothing (re-edit, re-level, re-time, or a sound to be made locally: for those, write the prompt or the recipe).
4. What works and must be kept.
Under about 900 words. Plain words; no hype.
