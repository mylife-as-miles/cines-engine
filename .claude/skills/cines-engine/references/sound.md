# Sound: voices, score, effects, earshot, mix

Every studio's soundtrack is built the same way: name every sound on the film's own clock, make or find each sound, **check it by ear-model (earshot) and by ear**, place it from data rather than by hand, and master to the deliverable's loudness. Claude cannot hear; earshot and measurements are how it listens, and the author's ears decide.

Contents: 1 Tool setup · 2 Plan sounds on the clock · 3 Effects: Stable Audio · 4 earshot · 5 Other sources · 6 Voice · 7 Score · 8 Mix and loudness · 9 QA · 10 Credits and licences · 11 Lessons

## 1. Tool setup (a fresh container has none of this)

Keep tools outside the repo, at these paths (the films' tools default to them; env vars override):

| Tool | Get it | Path / env var |
| --- | --- | --- |
| **earshot** (MIT) | `git clone https://github.com/Leonxlnx/earshot ~/leonxlnx/earshot && cd ~/leonxlnx/earshot && python3 -m venv .venv && .venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu && .venv/bin/pip install -e ".[mcp]" && .venv/bin/earshot doctor --load` | `/home/user/leonxlnx/earshot/.venv/bin/earshot`, `EARSHOT`, `EARSHOT_THREADS` |
| **audio.cpp** (Stable Audio on CPU) | `git clone https://github.com/0xShug0/audio.cpp ~/0xshug0/audio.cpp && cd ~/0xshug0/audio.cpp && scripts/build_linux.sh --backend cpu --target audiocpp_cli` | `build/linux-cpu-release/bin/audiocpp_cli`, `AUDIOCPP_CLI`, `SOUNDBOX_AUDIOCPP_BIN` |
| **Soundbox** (model manager and CLI over audio.cpp) | `git clone https://github.com/HamSanders/soundbox ~/hamsanders/soundbox`, `npm install` and build per its README; install weights **before** running (it prompts for the download and declines with stdin closed): `node server/dist/cli.js model install audiocpp-stable-audio-3-sfx` (and `…-small-music` for music) | `SOUNDBOX_CLI`, `SOUNDBOX_DATA_DIR` (default `~/.soundbox`; the SFX GGUF is about 1.6 GB) |
| **opus-sound-layer** (CC0 library, cue-sheet mixer, QA) | `git clone https://github.com/Bodila51/opus-sound-layer ~/bodila51/opus-sound-layer`; `uv run scripts/sfx.py kit` builds the 1,139-sound CC0 library | `SOUND_LAYER_MIX` |
| Demucs (stem separation) | `uv run --with demucs …` or a venv; `htdemucs --two-stems vocals` | — |

Check disk before installing (torch, weights and Blender together run to several GB). If `uv` fails on TLS behind the proxy, set `UV_NATIVE_TLS=1`.

## 2. Plan sounds on the clock

- In code films, each sequence **names** its sounds — `S.bed(name, t0, t1)`, `S.cue(name, t)`, `S.silence(t0, t1)`, `S.duck(t0, t1, level)` — and a cue-sheet dump (`node tools/cuesheet.js out/cuesheet.json`) lists every one on the global clock. A sound map (`audio/sound_map.json`) maps names to files, filters, levels and alignment (`peak`, `start`, `end`); `null` is silent on purpose. Nothing is placed by hand. (`claude-film/autopilot/audio/README.md`)
- In game films and motion graphics, the plan is JSON on the film's clock: `{id, prompt, dur, seed, at|peak, gain|level, in, out, check, not}` (`claude-game/crownfall-ealdholt-opening/audio/`).
- Place effects on frames computed from the animation (contact, settle, velocity peak), not on guesses. Roughly one effect a second at most, never two within 150 ms; sub hits once or twice a film.
- **The author wants few, quiet effects.** The Crownfall intro's 33 effects were "too many and too loud"; later films sit −11 to −24 dB under the voice.

## 3. Effects (and music) with Stable Audio 3.0 Small, on CPU

- Via audio.cpp directly: `audiocpp_cli --task gen --family stable_audio --backend cpu --threads 2 --duration-seconds D --seed S --num-inference-steps 8 --guidance-scale 1.0` with the SFX GGUF (`stable-audio-3-small-sfx-q8_0.gguf`); 14–23 s a sound here. Or via Soundbox: `node $SOUNDBOX_CLI run audiocpp-stable-audio-3-sfx "<prompt>" --duration <s> --seed <n> --out take.wav`. Music: model `audiocpp-stable-audio-3-small-music`, one take per seed (House Ealdholt: 32 s, seeds 601–604, picked by its loudness shape against the picture).
- **Prompts**: concrete texture, source and space — "a fast airy whoosh, a sudden rush of air passing close, short, no impact". The text encoder ignores negation, so "no music" can *bring* music in: describe what you want instead (Autopilot's prompts ended "no music"; the game tools later found it counter-productive). 2–11 s, one seed per sound; retakes move the seed by +1000 or follow a written retry ladder.
- **Finish each take**: resample to 48 kHz (soxr), trim the onset (first 1 ms frame within 40 dB of the peak, cut 3 ms early, 2 ms de-click), peak-normalise to −1 dBFS, 0.15 s raised-cosine fade-out, 24-bit WAV; reject near-silent takes (< −70 dBFS). audio.cpp writes 44.1 kHz and generates 6 s past the asked length, then truncates.
- **What it cannot do well**: tiny foley — clicks, taps, latches, fabric, creaks. Use CC0 recordings or earshot's coded bank for those.
- Raw takes stay out of git (`audio/gen/*.wav`); chosen sounds are committed as FLAC with a `plan.json` (model, licence, prompt, seed, trim, gain) and `check.json`. Tools to copy: `claude-film/autopilot/tools/sfx_gen.py`, `sfx_variants.py`; `claude-game/crownfall-ealdholt-opening/tools/stable_sfx.py`, `listen_sfx.py`, `music.py`.
- Licence: Stability AI Community License (free under USD 1M annual revenue); say so in the credits.

## 4. earshot: how Claude listens

earshot (github.com/Leonxlnx/earshot, MIT, v0.4) runs locally on CPU (CLAP and an AudioSet tagger). It ships its own skill (`skills/earshot/SKILL.md` in its repo) — read it for the full command set. The commands used here:

| Command | Use here |
| --- | --- |
| `earshot match FILE "a car door closing" --alts "a gunshot" "a door knock"` | Check a generated sound; verdict strong / plausible / weak / no match, z against 322 descriptions. |
| `earshot rank "<description>" a.wav b.wav c.wav --json` | Pick the best of several takes (sound variants; three VO takes of a line against "a man whispering, broken, almost no voice"). |
| `earshot find FILE "<distinct element>"` | Find the best window in a long take (placing a Lyria cue's best 40 s). |
| `earshot describe FILE` | What it sounds like, in words (score mood checks: "sad" breakfast cues were regenerated bright). |
| `earshot timeline FILE --video V` / `sheet FILE -o x.png` | A listening transcript / annotated picture of a whole mix, with sync to picture cuts. |
| `earshot critique FILE --video V` | Scorecard against professional launch films, with timestamped fixes (motion graphics, launches). |
| `earshot measure FILE` | LUFS, true peak, LRA, tempo/key, no models. |
| `earshot sfx list` / `sfx render ID -o x.wav --dur --apex` / `kit init|render|check` | 252 sounds made in code, rendered by id and aimed at the picture; the `launch` kit preset places roles against the music and the cut. Good for UI pops, knocks, swishes, risers in motion graphics. |

- Each CLI call loads models (20–40 s): for batches use the Python API (`from earshot import api`; `api.describe`, `api.match(text, alts=[...])`) or `earshot mcp`.
- **Pass rule** used in the game tools: the check beats every alternative in the forced choice and is z ≥ 3, or holds ≥ 60 % of the choice and twice the best alternative. A fail is evidence, not a veto: the ear decides.
- **Limits**: it rates TTS voices nearer "robotic" in forced choice and misses pianissimo score under loud beds; list those moments in `audio/LISTEN.md` for a human.

## 5. Other sources

- **Freesound** (freesound.org, MTG; the site's code is AGPL and not vendored here): use its API v2 (`https://freesound.org/apiv2/search/text/?query=…&filter=license:"Creative Commons 0"&fields=id,name,license,username,previews,duration`, with a token from freesound.org/apiv2/apply saved as a network secret, never in the repo). **Every recording carries its own licence**: CC0 needs nothing; CC-BY needs the author and sound ID in `audio/CREDITS.md`; never use CC-BY-NC in commercial work. Previews are MP3; originals need OAuth2. Its servers refused one build machine, so add `freesound.org` and `cdn.freesound.org` to the environment first.
- **CC0 recordings**: opus-sound-layer's library (`sfx.py browse/search/add` with waveform and spectrogram sheets); One Too Many's committed recordings (`claude-film/one-too-many/audio/sfx/`) are reusable by any production (`otm/<name>` in Autopilot's sound map).
- **Synthesised**: sounds that are synthetic in life (alarms, chimes, ringtones, UI) in numpy (`claude-film/autopilot/tools/synth_sfx.py`); beds like tinnitus or heat shimmer from filtered noise.
- **The author's own music** (Osita Miles's tracks in the Crownfall films): match bytes and SHA-256 to the game's copies, credit as such.

## 6. Voice

Voice early: take lengths fix subtitle holds and beat timing, so voice the script before the engine or the edit is built. Audition two to four voices with the author and record the choice in DECISIONS.

- **ElevenLabs** (`ELEVENLABS_API_KEY` in the environment, or a network secret on `api.elevenlabs.io` injected by the proxy — the script never sees the key): `POST /v1/text-to-speech/<voice_id>` with `model_id: eleven_v4`, `output_format: mp3_44100_192` (PCM needs a Pro plan; this account is Creator). Voices used: **George** `JBFqnCBsd6RMkjVDRZzb` (British storyteller: Crownfall narrator, House Ealdholt trailer), **Brian** `nPczCjzI2devNBz1zQrb` (FloWell). Send `previous_text`/`next_text` per line so the reading flows; tempo 1.06 suited the narrator; audio tags like `[whispers]` go in the text for v4; a cast maps speakers to voices with their own stability and style (`claude-game/crownfall-prologue/narration/script.json`). Tools: `claude-game/crownfall-intro/tools/narrate_elevenlabs.py`, the prologue's version for casts.
- **Gemini TTS** (`gemini-3.8-flash-tts`; `GEMINI_API_KEY`/`GOOGLE_API_KEY`, or a network secret for `generativelanguage.googleapis.com`): POST `v1beta/interactions` with the line as text and the direction in a `speech_metadata` annotation, so the direction is never spoken; 24 kHz mono. Voices chosen by ear: Daniel `en-gb-training-10`, radio presenter `en-gb-podcaster-3`, dispatcher `en-gb-concierge-5`. Tool: `claude-film/autopilot/tools/vo_tts.py LINES.json OUT --voice <id>`.
- **Kokoro** (local, Apache-2.0, `bm_lewis`) for working voice before the final read.
- Three takes of any line that carries the film, ranked with earshot, then chosen by ear. Re-voicing after a review: each repetition of a refrain goes deeper than the last (Autopilot's "My phone was on the counter.").
- Treatments: radio (HP 320 Hz, LP 3.4 kHz, a 1.6 kHz presence peak, soft saturation, −8 dB); phone line (300 Hz–3.4 kHz, compression, soft clip); a cold reverb for a voice from nowhere (FFT convolution, RT 2.4 s, wet 0.42).
- A child's voice or anything synthetic that would sound wrong stays as type on screen (Autopilot's Emily).
- Replacing a voice in someone's video: separate it with Demucs (`htdemucs`, two stems), keep the accompaniment as the effects bed.

## 7. Score

- **Design before generating**: the sound bible's spotting map, themes and motifs and their transformations, and the feeling-to-controls table are in `score-and-sound-design.md` §3–5 (cue jobs, entry and exit reasons, selective sync, tempo arithmetic, orchestration under dialogue, the FME-24 finding that tension follows density and texture rather than tempo), with the order for judging a returned cue in §8.
- **Lyria 3.5** (Gemini key; POST `v1beta/interactions` with `{"model": "lyria-3.5", "input": prompt}`; the MP3 comes base64 in the `model_output` step; about USD 0.08 a cue; SynthID-watermarked). Prompts: "instrumental film-score cue, about N seconds … No drums, no vocals, no choir. In tune at A = 440." Quirks: it returns roughly 60–90 s whatever you ask and ignores timestamps in the prompt (window each take with earshot `find`), takes drift 0 to +36 cents (measure and retune), some prompts are blocked (reword neutrally, do not retry), connections drop mid-response (retry). Plan in `audio/score_plan.json` (motifs, key map, arc, cues with start/end, level, prompt, why); `audio/SCORE.md` is its readable form. Tools: `claude-film/*/tools/lyria.py`, `score_check.py`, `score_window.py`, `score_place.py`.
- **Stable Audio Music** for game cues and beds (§3); **Higgsfield** `generate_audio` is another option (quote cost first).
- One piece shaped to an edit works for ads: a low problem, a lift where the product enters, a peak on the proof, thinning before the end card, a resolve.
- Licensed human tracks are the house rule in some launch-film traditions (cinetic); here the author's own music or generated scores are both used — follow DECISIONS.

## 8. Mix and loudness

- **Beds**: normalise each to its map level, loop with 0.6 s equal-power crossfades from a seeded offset (keep the seed when re-cutting, or untouched scenes change), an air floor (noise LP 900 / HP 60 at −60 LUFS) so nothing is digitally dead.
- **Ducking**: music under the voice only where they compete — film: 9 dB bed duck in the cue-sheet mixer; narrated games: −19 dB, lines closer than 1.4 s merged, attack 0.45 s, release 1.1 s; ads: target 12 dB under the voice's one-second level, at most 10 dB, 60 ms attack, 450 ms release at 1 ms control rate. Stop-downs (the music stopping for a beat) often beat ducking.
- **The cue-sheet mixer**: `uv run ~/bodila51/opus-sound-layer/scripts/mix.py audio/cues.json --out out/audio` places each effect by peak or start, levels it in its own band against the bed, adds one shared room, ducks under the voice and masters. Story beats the "just audible" levelling would bury are played at a designed level instead.
- **Loudness targets**: YouTube, social and web −14 LUFS, true peak −1 (to −1.5) dBTP; game films −16 LUFS, −1 to −1.5 dBTP; Claude Film masters −18 LUFS with a −2 dBTP limiter, then a −3 dBFS sample-peak hold before AAC (the encode overshoots bright transients by about 1.5 dB). Two-pass `loudnorm` (measure, then apply linear) for short pieces.
- Mux with `-c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart`.
- Never run a long mix, a render and an earshot or Stable Audio batch at the same time on this machine (15 GB RAM, 4 cores, no swap): Autopilot's mix and render together ran out of memory.

## 9. QA

- `uv run ~/bodila51/opus-sound-layer/scripts/qa.py out/<film>.mp4 --audio out/audio` checks offset, loudness, true peak, voice over bed, silences, sync per frame, audibility of every hero sound and music dips; explain accepted fails in the audio README.
- earshot `timeline`/`sheet` on the final mix; `ebur128=peak=true` to confirm loudness; listen notes in `audio/LISTEN.md` for what only a human can judge.

## 10. Credits and licences

`audio/CREDITS.md` lists every sound with source and licence (CC0 with Freesound IDs, Stable Audio community licence, Lyria with SynthID, ElevenLabs and Gemini voices, the author's tracks). Do not put credits in the picture unless the author asks.

## 11. Lessons

- Crowd walla read as chanting — cut it. Title typing read as footsteps — replaced.
- `np.convolve` with a 24,000-tap window took half an hour a take; use running sums.
- Put every sound decision in data (the sound map, the plan) so a re-cut or a re-time rebuilds the mix instead of chopping it.
