# Sound: Seven Days of No

The soundtrack: the author's narration (`out/vo/narration.wav`, 217.5 s), a light, cozy music bed with variations by chapter, and simple cartoon-clean effects, mixed for YouTube. The video runs 225.5 s; the last 8 s are an end screen with music only. Every sound is named on the narration clock in the cue sheet and placed from data. Nothing is placed by hand.

## Build

```
python3 tools/lyria.py                 # music takes (Lyria 3.5; already made: 5 of 8 requests used)
EP=/home/user/leonxlnx/earshot/.venv/bin/python
$EP tools/score_check.py               # listen to the takes: tuning, key, tempo, shape, earshot -> audio/score/check.json
python3 tools/sfx_gen.py --only door_b # Stable Audio takes (audio/gen_plan.json); the chosen ones are kept as FLAC in audio/gen/
$EP tools/synth_sfx.py                 # every effect -> audio/sfx/*.flac + audio/sfx/plan.json (source of each)
python3 tools/sfx_check.py             # earshot on every effect -> audio/sfx/check.json
python3 tools/cues_draft.py            # audio/cues_draft.json (only used when out/cuesheet.json is missing)
$EP tools/build_mix.py                 # -> out/mix/seven_days_mix.wav, out/mix/stems/{voice,music,fx}.flac, out/mix/report.json
```

`build_mix.py` reads the Engine's `out/cuesheet.json` (from `node tools/cuesheet.js`). If that file is missing, it reads `audio/cues_draft.json`, which is drafted from `design/SEQUENCES.md` and anchored to words in `audio/vo/words.json`. `--sheet PATH` forces either one. Any bed or cue name the sound map does not know is printed as `MISSING` and recorded in `report.json`. A mix takes about 40 s. Do not run it at the same time as a render or an earshot batch: the machine has 15 GB of RAM and no swap.

Mux over the picture with `-c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart`.

## Files

| Path | What it is |
|---|---|
| `score_plan.json` | The music: the five Lyria takes (prompts, the one rejected and why) and the four beds (take, transposition, windows, level, why). |
| `score/T2-T5.mp3`, `score/*.json`, `score/check.json`, `score/requests.json` | The chosen takes, their sidecars, the listening check and the request ledger. |
| `sound_map.json` | Cue names to sounds and levels, music beds by sequence, room beds left silent, and the mix settings. |
| `sfx/*.flac`, `sfx/plan.json`, `sfx/check.json` | The 40 finished effects (48 kHz mono, 24-bit, peak −1 dBFS), with the source and earshot verdict for each. |
| `gen_plan.json`, `gen/*.flac` | The Stable Audio prompts and seeds, and the chosen raw takes. Rejected takes are deleted. |
| `cues_draft.json` | The draft cue sheet. |

## Music

The reference animatic's register is warm, playful and music-box. Every take uses one palette: plucked ukulele and nylon guitar, music box and glockenspiel, light pizzicato, and a soft kick at most. All four beds share one key centre, so they crossfade at chapter turns without a clash. Lyria ignores the key it is asked for, so the takes were measured and moved into that key.

| Bed | Take | As heard | Where (by the cue sheet's sequences) |
|---|---|---|---|
| `music_main` | T2 (C major, +0.3 c, 103 BPM, LRA 5 LU) | As generated | Q01–Q02, Q04–Q05 and Friday up to "They look hurt", Q07–Q08 |
| `music_hush` | T3 (came back in A major) | Down 2 semitones by resampling: G major, 71 BPM, warmer. earshot reads "sad and melancholic" | Q03 (Tuesday's guilt), Q09 (the insight) |
| `music_lift` | T4 (came back around C#/F#) | Down 1 semitone with rubberband (tempo kept): C/F major. The busiest take, so it is held 15 dB under the voice while someone speaks, not 12 (`under_voice_db`); between lines and after the stop-down it keeps its full level | Friday from "So you run after them", Q10 (the advice) |
| `music_end` | T5 (C major) | Aligned so its own final chord (56.3 s in the take) rings out on the last frame | Q11 into the end screen |

- **T1 was rejected.** It was the other main take, but it came back in E major and had a quiet patch at 30–45 s.
- **Windows are snapped to beats.** Friday's lift starts on the downbeat of T4's full section. In Q10, T4's own break and full entry land on "You decide on purpose" and its ding.
- **Friday stop-down.** The music drops out for "They look hurt. And you feel terrible." and the lift enters on the run.
- **Q10 freeze.** The cue sheet's silence at 187.57–189.94 s stops the music. It then resumes where it stopped.
- **The hollow pause.** The cue sheet's duck at 52.34–57.3 s (×0.25) applies on top of the hush.

## Effects

Each effect is cartoon-clean and levelled from its loudest 100 ms relative to the narration.

- **Story effects** sit about 12–15 dB under the voice as heard (their loudest 400 ms against the voice's 3 s loudness around them), so they carry on phone speakers: the red NO stamps 13–14 dB, the clang 15, the shutter 12.7, the dings 11–16 (the heart's ding, under speech, 17.7), the phone buzz about 13. The NO! burst plays in a pause at 5.7 dB under.
- **Third review:** these were raised (NO stamps +4, clang +6.5, shutter +4, dings +4, YES stamps +3, since they land on spoken words). The NO stamp's weight moved from a sub thump into the low mids, where phones can carry it.
- **Pops, whooshes, card lands and UI ticks** stay 20–26 dB under. Same-name cues closer than 150 ms play once; only the doubled whoosh at 24.18 s was dropped. The cue sheet of 16:16 (final polish) has 136 cues (25 pops, 28 whooshes, 8 card lands, 13 stamps: 4 YES, 9 NO); 131 play.

| Sound | Source |
|---|---|
| phone_buzz, notify, pop ×3, send, receive, ding, bulb, cloud, whoosh ×2, wrong, clang, stomach_drop (also used for `deflate`), wobble, bird, battery_low, swell, rain, grow, click (also used for `button_click` and `freeze`), dim | Synthesised in `tools/synth_sfx.py`, pitched in C major at A = 440 |
| stamp (the red NO) | One Too Many's rubber stamp (CC0) over a small synthetic thump at 180→110 Hz, high-passed at 90 Hz |
| stamp_yes (a stamp cue whose `p.kind` is `yes`, or that is spoken on "yes" or the cold open's "say") | One Too Many's shorter stamp (CC0), a light thump and a small C7 ping: brighter (centroid 2.5 kHz against 2.0) and friendlier, 2 dB softer |
| card_land ×3 (cycled) | One Too Many's card slaps (CC0), trimmed and lightened; 23 dB under the voice |
| shout_no | Synthesised: a tight 0.58 s comic hit (a whoosh outward, a thud at 0.15 s, a cartoon boing over it). It is the hook's punchline, so it plays near the voice's level (−3 dB re voice, peak −7.9 dBFS). The cue sheet now puts it at 11.06 s, on the picture's slam; `after_speech` would hold it back to where the narrator's "no" ends if it ever came earlier. It fills the 0.65 s pause (11.05–11.65 s) before "So". earshot hears it as 97% "a cartoon boing", and the spoken "no" stays 96% clear |
| pile_topple | Stable Audio 3.0 Small SFX (earshot: strong, "a stack of papers falling over") |
| footsteps, step_1–4 | One Too Many's wood-floor steps (CC0). The cue's `n` and `gap` lay the steps |
| door, run, typing, camera_shutter, plate_slide | Stable Audio 3.0 Small SFX, generated locally. `typing` is stretched to the cue's `n` taps |
| `shrug`, `flash`, `sip`; all room beds (`office_room`, `living_room_*`, `street_ambience`, `evening_birds`, `party_murmur`) | Silent on purpose. `sound_map.json` gives the reason for each |

earshot rated every effect against its description and the sounds it could be mistaken for (`sfx/check.json`). Variants that lost were replaced:

- The synthetic stamp and door read as kick drums.
- A low ding read as a gong.
- A chime-like "wrong" and battery beep read as a success chime.
- Plain gliding chirps read as a whistle.
- A tape-stop `freeze` read as an explosion. It is now a click.
- The One Too Many shutter read as a gunshot and a stapler.
- The sliding-paper plate read as tearing.

Three fails are accepted, and the ear should decide (see below):

- `run`: z +3.8, but 44% against 54% for "a horse galloping", its rhythmic near neighbour.
- `bird`: 57% against 28% for "a whistle".
- `rain`: reads as running water, not rain. It plays 20 dB under the voice.

## The mix (`out/mix/report.json`)

| Measure | Value |
|---|---|
| Integrated loudness | **−14.0 LUFS** |
| True peak | **−1.5 dBTP** (sample peak −1.5 dBFS); after an AAC 256 kbps encode and decode, −1.4 dBTP |
| Loudness range | 4.1 LU |
| Voice | High-pass at 70 Hz; gentle 2:1 compression (at most 4 dB); about −14 LUFS in the mix |
| Master | +1.67 dB of gain; a look-ahead true-peak limiter (4× oversampled) doing at most 2.2 dB; the same gain curve applied to the stems, so they sum to the mix |
| Stereo | The voice is centred. The music beds stay stereo as Lyria made them; nothing is summed. Their side is raised up to 3 dB where they are already well correlated, and narrowed where a passage opposes (T5's wide last chord). The effects are placed toward their source on screen from the cue's `x` (0–1, at most ±0.3). In the cue sheet of 16:16, 20 effects with an on-screen source are panned, between −0.21 and +0.21 (phone buzzes, footsteps, typing, the run, the shutter, the stomach drop, the plate); graphics and UI cues sit in the centre |
| Mono compatibility | Mix L/R correlation 0.98 (lowest audible 400 ms window +0.12); music 0.72 (lowest +0.00, so no phase opposition); effects 0.99 (lowest 0.997). Mono downmix: −14.02 LUFS against −14.0 stereo. The end screen loses 1.4 dB in mono (a wide bed), with no cancellation |
| Music under the voice | Median 14.7 dB under (3 s windows); main and closing beds about 14.5 dB under, the hush about 18, the lift about 17.5 (integrated) |
| End screen | Music at −17.5 LUFS, about 3.5 LU under the speech, then the final chord dies away |

- **Ducking.** Speech regions come from the narration's own envelope, with pauses under 1.2 s merged so the music does not pump between sentences. Inside them, the music is held about 12 dB under the voice (15 dB for the lift), ridden down only, with a 0.35 s attack and a 0.9 s release. The music's level is read as the louder of its 1 s and 3 s loudness, so a bed that enters at full level after a stop-down is ducked at once. Where no one speaks (the stop-down, the end screen), the bed plays at its own level. Under the voice, the music also takes a 3 dB presence dip at 2.5 kHz.
- **Sample peaks are held** at −1.5 dBFS before the encode.

**The hook (0–16 s), now busy with effects** (`out/mix/listen_hook.json`): the effects sit 19–27 dB under the voice. In every window, earshot gives "loud sound effects drowning out a voice" 1%.

| Hook window | "Voice over soft music" | "Music drowning" |
|---|---|---|
| Whole hook, 0–16 s | 92% | 5% |
| Montage, 2–7 s | 91% | 6% |
| NO! burst and topple, 10–13 s | 74% | 25% |
| "yes, yes, yes", 7–10.5 s | 76% | 24% |
| The question, 11.5–16 s | 76% | 23% |
| Cards, 0–4 s | 69% | 30% |

The seven NO stamps after the third review's raise (16.5–19.5 s) read 50% "music drowning". The run of thuds 0.2 s apart reads as percussion, not masking: "effects drowning" is under 1%, and without the effects the window reads 78% clear. The two Q05 stamps read 77% clear.

The short windows' "music drowning" share does not follow level: with the music 3 dB lower it reads 27%, 22% and 27%. With no effects at all, it reads the same.

earshot on the other hard moments (`out/mix/listen.json`, `out/mix/listen_lift.json`) reads "a man talking over soft background music" in every speech window:

- Q03 pause: 97%.
- Q07 typing/send/receive: 92%.
- Hook: 92%.
- Q10 freeze: 84%.

The lift sections, held 3 dB deeper since the first mix:

| Lift window | "drowning a voice" | Music re voice | 1–4 kHz music re voice |
|---|---|---|---|
| Q06, 117–130.8 s | 12% | −17.5 dB | −19.7 dB |
| Q10, 176.5–187.5 s | 9% | −17.6 dB | −16.5 dB |
| Q10 after the freeze, 190–198.4 s | 8% | −17.3 dB | −17.5 dB |
| Busiest 8 s windows: Friday's stop-down into the run (112.5–120 s) and Q10 179–187 s | 27% and 27–33% (it varies between runs) | | |

The busiest windows were 29–33% before the change.

They do not fall below about 16–20% even with the music 9 dB lower, low-passed or shelved:

- In Q06, the effects in that window (footsteps, run, shutter, ding) count as much as the music. Voice and music alone read 15%.
- In Q10, the rest is earshot's reading of T4's bright strum and claps.

So the remainder is not the music's level: the ear should decide (item 1 below).

The end screen reads 96% "light cheerful ukulele music ending on a final chord". No take has a voice in it: earshot finds no singing, and "a person singing" is under 1% against instrument alternatives.

## For a human ear

1. **The lift under the advice (Q10, 176–187 s) and Friday's lift (116–130 s).** The lift is held 18 dB under the voice. The two busiest 8 s windows still lean 27% toward "music drowning the voice", from the effects and T4's character rather than level. If it feels busy, raise `music_lift` `under_voice_db` in `score_plan.json` (15 now), or thin the effects in 112.5–120 s.
2. **The hush (G major, resampled) next to the main bed (C major)** at 45.8 and 66.4 s, and at 159.4 and 176.2 s: check that the crossfades sit well.
3. **No vocals in T4 and T5.** earshot says none. Their bright ukulele sections lean toward "pop song" in a forced choice.
4. **The run, bird and rain** (116.4, 84.6 and 174.0 s).
5. **The density of effects.** The cue sheet has 136 cues (25 pops, 28 whooshes, 8 card lands); 131 play. In the cold open, eight card lands come in 1.8 s. The author has asked for few, quiet effects. Muting a name in `sound_map.json` (`null`) thins them without touching the picture.
6. **The end screen level** (−18 LUFS) and the final chord ending on the last frame.
