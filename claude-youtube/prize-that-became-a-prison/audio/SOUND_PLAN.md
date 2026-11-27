# The Prize That Became a Prison: sound plan

Every sound in the film, on the script's clock. Written 27 November 2026 by the sound session from
`design/script/SCRIPT_V2.md` (each chapter's Sound column, "How it hooks", the intensity map), `design/REFERENCES.md`,
`design/DECISIONS.md` and the house sound reference (`.claude/skills/cines-engine/references/sound.md`).

| File | What it is |
| --- | --- |
| `audio/cues.json` | The cue sheet: direction rows, bed spans, effects, silences, drops, levels. The house mixer's shape (`fps`, `cues[]` with `t`, `sound`, `weight`, `align`), plus each item's chapter, row and offset. |
| `audio/score_plan.json`, `audio/SCORE.md` | The score: motifs, key map, arc, 15 placements, 12 ready Lyria prompts, cost. **Not generated** (waits on the author's go). |
| `audio/sfx/*.wav`, `audio/sfx/INDEX.md` | The effects and beds made free and locally, with how each was made, its earshot verdict and its licence. |
| `audio/tools/retime.py` | Moves every cue, bed, silence and score placement when the edit gives the rows new times. |

## Status

| Part | State |
| --- | --- |
| This plan, the cue sheet, the score plan | Done. |
| Effects and beds (36 sounds) | Made locally: see `sfx/INDEX.md` for which are done and which still want a human ear. |
| Score (9 Lyria generations planned) | **Waiting on the author's go**: about USD 0.72 planned, USD 1.44 at most (see `SCORE.md`). Also needs a Gemini key on this machine. |
| Narration | Another agent (`audio/vo/`). Its takes fill `voice[]` in the cue sheet. |
| Mix and master | After the narration and the score exist (steps at the end). |

## The clock

- Times are SCRIPT_V2's script clock in seconds: 0:00 to 12:55 (775 s), 24 fps (the film's graphics run at 24).
- The script times the cold open's rows; chapters 1 to 9 give only a chapter start. Inside those chapters each row was
  placed by the length of its lines at the script's pace (about 150 words a minute in exposition, 120 to 135 in the last
  three chapters). **Every item carries its chapter, its direction row (`04.03` = chapter 4, third row of its DIRECTION
  table) and its offset from the row's start**, and a cue also names the word or action it sits on (`anchor`). When the
  edit exists, write each row's real start to a small JSON map and run `python3 audio/tools/retime.py ROWS.json`.
  Before the edit, the narration's scratch read (`audio/vo/`, with each line's measured length in its `lines.json`, per
  `audio/VOICE_PLAN.md`) is the best source for those row times.
- One conflict in the script: the cold open's heading says 0:00-1:30, but its own rows put the title on the peak at
  1:37 and a 4 s decay after it. This plan follows the rows: chapter 1 starts at **1:42**, on the silence, and keeps
  its 3:05 end. The edit decides.

## What the sound does

- **Few, quiet effects.** 26 placements of 16 sounds in 12:55, about one every 30 s, all at 11 to 24 dB under the
  voice (the author's taste, sound.md 2). Only one sound is allowed to be big, and it is heard twice: **one low impact**
  at DEATH SENTENCE / 2017 (1:10) and at "death sentence" (7:30), tuned to the score's D. **Nothing at "life".**
- **Every place has its own air.** 19 beds, quiet (22 to 36 dB under the voice), loop-ready, one per kind of place,
  so no shot is digitally dead; an air floor at -60 LUFS runs under the whole film, even under the total silence.
- **A sound drop before every turn** (the script's rule from the reference study): the fee, YES, the linings, the
  sentence, "Deceived", Gene's death, "It was hers". 27 silences and drops in all, never more than 88 s apart.
- **Silence is the loudest sound.** The pulse stops dead on "Yes." (0:33); everything stops at the discovery (5:31);
  the clock stops on "worse" (7:18) and again on the cut to the empty chair (10:48), where the film goes **totally
  silent** for 6.5 s (score, room tone and clock all out), "He never saw Dawn come home." spoken into it, and only the
  void's air returns after it. The question "When would she be released?" also sits in silence: the phone line's hiss
  cuts out under it.
- **Plants and payoffs in sound,** like the picture's: the scale's beep (0:00 and 4:41, the same file at the same
  level), the steel door (0:20 and 5:12), the tannoy (0:09, 0:15 and 5:05), the clock (warm at home in chapter 1, in the
  detention years in chapter 5, at Gene's table in chapter 8), the drone (0:56, and back at 12:32 under YES -> WHEN?),
  and the score's pulse and four-note phrase (`SCORE.md`).
- **No voices, and nothing intelligible.** No walla or crowd anywhere (crowd walla read as chanting in an earlier
  film; the market and the hearing room are footsteps, bags, rustle and air). The tannoy is a generic two-note chime and
  a vowel texture built from a buzz and noise, band-limited to about 600-1100 Hz in a large hall: it reads as a far loudspeaker
  and cannot say a word. Every bed was checked for speech by the AudioSet tagger, and takes that showed it were set
  aside.
- **Small truths.** The tubes in the inspection room and the detention corridor hum at 100 Hz, from China's 50 Hz
  mains, not America's 60 Hz; the visiting-room line carries a faint 50 Hz hum; the impacts and the drone sit on D.

## Levels and loudness

- **Master**: -14 LUFS integrated, true peak -1 dBTP, loudness range 7 LU or more (SCRIPT_V2's mix rule). The two
  reference films measure flat: fern's CIA film -15.6 LUFS with 6.0 LU, the Dark Web film -10.5 LUFS with 4.8 LU. Our
  range comes from the quiet last four minutes and the silences, not from loud effects.
- **The voice is the reference.** Every level in the cue sheet is dB under the narration's short-term loudness while it
  speaks (about -14 LUFS in a -14 LUFS master).
- **Effects** -11 (the impact) to -24 (the far tannoy). Hero cues (story sounds) may be lifted by the mixer if its
  band levelling would bury them; support cues are never lifted. Never two within 150 ms.
- **Beds** -22 (the baggage belt, the street, the rain) to -36 (the evidence table's room). Not ducked: they are set
  under the voice already. Looped with 0.6 s equal-power crossfades from a seeded offset (keep the seed when re-cutting,
  or untouched scenes change); fades as listed.
- **Score** -14 (the cold-open pulse) to -24 dB under the voice, up to the voice's own level only for the title peak,
  which has no voice over it; ducked 9 dB where it competes with the voice; stop-downs instead of ducking at the YES lines.
- **The files** in `audio/sfx/`: effects peak at -1 dBFS; beds sit at -24 LUFS integrated (true peak at or under -3
  dBTP). The mix gains live in the cue sheet, not in the files.

## Chapter by chapter

**00 · Cold open (0:00-1:42).** The belt motor and the scale's soft beep, the terminal behind; no music for 2 s, then
a low D creeps in. The booklet on the laminate. A far tannoy behind the wide; closer as her head lifts, and the pulse
starts under it. The steel door. The pulse under the room, stopped dead on "Yes."; the second YES has only the room.
One second of silence; the pulse rebuilds from nothing under the linings; a dry, close zip on the tote; the void's air
and the drone under her; score and drone cut dead on "were not." 1.5 s of air. One low impact on DEATH SENTENCE /
2017. Rain and wind at the tower. The hearing room, very quiet, near silence after "answer". The title cue builds from
nothing over the montage (carried over it, not cut to its beat), peaks on the title and decays to silence; the cut to
chapter 1 lands on the silence.

**01 · The winner (1:42-3:05).** Chicago through glass; the piano warms. Pencils and paper on the entries. The house:
a low room and a clock. One muted chime as the message lands (an invented mail client, no product's sound). Keys for
the search, paper for the tickets. The gate: the hall and a far boarding chime. 1.5 s of silence.

**02 · Eighteen days (3:05-4:00).** Engine hum; a street in light rain with a tram; the hotel's air conditioner; rails.
The travel pad and its tick, dropping out on "one more gift"; 1 s of silence.

**03 · The gift (4:00-5:05).** A soft hotel room; the market and a shutter; two zips as she packs; the seam, and a small
metallic click as the cut-away closes; a drop, then the same beep as 0:00 just before "Overweight."; the baggage belt's
rollers, and the pulse returning over them.

**04 · Yes (5:05-6:20).** The tannoy, muffled; the door; the pulse stops for each "Yes"; hard stop at the discovery:
1.5 s with nothing but the air floor; the room returns on the split frame; a cold held note under the two meanings and
the route map; the corridor's hum; a door far down the corridor; 1.5 s.

**05 · Three years (6:20-7:25).** No score. The corridor hum; paper (the emails); in the void the clock, very low,
under the rolling years, and it stops on "worse". 1.5 s.

**06 · The sentence (7:25-8:45).** The courtroom's tone, no gavel; a drop; one low impact on "A death sentence";
nothing on "life". Grave strings thinning to one held note; paper for the ministry's sheet; a drop before "Deceived.";
2 s of silence.

**07 · The wait (8:45-10:10).** Rain on concrete (it leads the cut by 1 s); the phone line's hiss; the void and a slow,
distant pulse under the pull back; pen on paper; the hearing room; paper; the desk. Spare piano throughout. 1.5 s.

**08 · The father (10:10-11:10).** The cold house and the clock; spare piano that rings out before the date; a drop;
the line; then the straight cut to the empty chair and **total silence** under "He never saw Dawn come home." and after
it; the void's air returns with the chair alone in its pool.

**09 · When? (11:10-12:55).** Rain at the gate; the line's hiss and spare piano, both cut for the question: silence
under "When would she be released?"; piano again for September 2026 and "Remember the question"; out for "It was
hers." and 2 s; the status line over the void's air alone; the drone returns under YES -> WHEN? and one warm piano note
rings over it; the end card; 2 s of silence.

## The cue sheet

Generated from the same data as `cues.json` (times on the script clock; "dB re voice" is under the narration).

### Effects (one-shots)

| Time | Ch · row | Picture | Sound | Align | dB re voice | Weight | On |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0:00.6 | 00 · 00.01 | checkin_hall scale | `sfx_scale_beep` | start | -14 | hero | the display settles on OVERWEIGHT |
| 0:04.6 | 00 · 00.02 | checkin_hall shoulder | `sfx_booklet_slide` | peak | -18 | support | her hand slides the booklet across |
| 0:10.2 | 00 · 00.03 | checkin_hall wide | `sfx_tannoy_far` | start | -24 | support | the wide; behind "It's 2014, at an airport in China" |
| 0:15.2 | 00 · 00.04 | departure_gate seated_called | `sfx_tannoy_near` | start | -21 | support | her head lifts |
| 0:20.5 | 00 · 00.05 | inspection_room enter, wide | `sfx_door_steel` | peak | -15 | hero | the door closes behind her |
| 0:48 | 00 · 00.10 | evidence_table purses (red trace) | `sfx_zip` | start | -16 | hero | the push in on the tote, before "sewn into the linings" |
| 1:10 | 00 · 00.13 | void_stage dawn_high (DEATH SENTENCE / 2017) | `sfx_impact_low` | peak | -11 | hero | "...a court sentences her to death": on the cut to DEATH SENTENCE / 2017 |
| 1:53.5 | 01 · 01.02 | evidence_table motifs, entries | `sfx_pencil_paper` | start | -20 | support | "liked to enter sweepstakes" |
| 1:59 | 01 · 01.02 | evidence_table motifs, entries | `sfx_paper_handle` | peak | -21 | support | "every entry was a small possibility" |
| 2:23.5 | 01 · 01.04 | home kitchen -> kitchen_over (inbox) | `sfx_mail_chime` | start | -20 | support | the message lands, after "What arrived in Dawn's inbox..." |
| 2:42.8 | 01 · 01.06 | evidence_table screen: a search | `sfx_keys_typing` | start | -21 | support | "she looked the organizers up online" |
| 2:52 | 01 · 01.07 | evidence_table tickets | `sfx_paper_handle` | peak | -18 | support | "The tickets." |
| 2:59.5 | 01 · 01.08 | departure_gate window | `sfx_boarding_chime` | start | -22 | support | the gate window |
| 4:12 | 03 · 03.02 | leather_market wide, stall, purchase | `sfx_shutter_roll` | start | -22 | support | the stall |
| 4:25 | 03 · 03.03 | hotel_room pack | `sfx_zip` | start | -18 | support | "Dawn packed the handbags herself" |
| 4:28 | 03 · 03.03 | hotel_room pack | `sfx_zip` | start | -19 | support | "Both checked in her name" |
| 4:36.5 | 03 · 03.04 | evidence_table purses: the seam | `sfx_seam_click` | peak | -16 | hero | the red trace ends and the cut-away closes |
| 4:40.8 | 03 · 03.05 | checkin_hall scale (matched) | `sfx_scale_beep` | start | -14 | hero | just before "Overweight." |
| 5:05.8 | 04 · 04.01 | departure_gate seated_called (held) | `sfx_tannoy_near` | start | -23 | support | the gate, held longer |
| 5:12.8 | 04 · 04.02 | inspection_room enter, wide | `sfx_door_steel` | peak | -16 | hero | "she is led into a room" |
| 6:16.5 | 04 · 04.08 | detention_corridor corridor (2014) | `sfx_door_far` | peak | -22 | hero | under "The case was only beginning", before the 1.5 s silence |
| 6:36 | 05 · 05.02 | detention_corridor envelope_high | `sfx_paper_handle` | peak | -19 | support | "gave them the emails" |
| 7:30 | 06 · 06.02 | void_stage dawn_close (DEATH SENTENCE -> LIFE) | `sfx_impact_low` | peak | -11 | hero | "A death sentence": on the cut to void_stage dawn_close |
| 8:03 | 06 · 06.05 | evidence_table pair (ministry) | `sfx_paper_handle` | peak | -20 | support | the sheet |
| 9:31 | 07 · 07.04 | tim_desk letters, lamp | `sfx_pen_paper` | start | -20 | support | "Tim wrote to officials and to lawyers" |
| 9:49 | 07 · 07.06 | evidence_table page (S1 lit) | `sfx_paper_handle` | peak | -20 | support | the page, before the marker wipe |

### Ambiences and beds

| From | To | Ch · rows | Bed | dB re voice | Fades | Note |
| --- | --- | --- | --- | --- | --- | --- |
| 0:00 | 0:20 | 00 · 00.01-00.04 | `amb_terminal_hall` | -26 | 0.3 / 0.4 s | Terminal room tone. Under the scale in 0:00-0:09, then up a little on the wide. |
| 0:00 | 0:09 | 00 · 00.01-00.02 | `amb_checkin_belt` | -24 | 0.05 / 0.6 s | Belt motor on the scale shots. |
| 0:20 | 0:47 | 00 · 00.05-00.09 | `amb_inspection_room` | -28 | 0.2 / 0.3 s | The room. Out with the hard stop at the discovery (5:31); back after the silence, on the split frame (5:33). At 1:04 and 12:32 it vanishes with the room on the match cut to the void. |
| 0:20 | 0:47 | 00 · 00.05-00.09 | `amb_fluorescent_hum` | -30 | 0.3 / 0.3 s | 50 Hz tubes (China). Under the inspection room at -30; the bed of the detention corridor. |
| 0:47 | 0:56 | 00 · 00.10-00.10 | `amb_evidence_room` | -36 | 0.3 / 0.3 s | The evidence table's near-silent room under paper. |
| 0:56 | 1:04 | 00 · 00.11-00.11 | `amb_void_air` | -34 | 0.5 / 0.5 s | The void's own air, barely there. In Ch 08 it is the "room tone" that returns after the total silence. |
| 0:56 | 1:05 | 00 · 00.11-00.11 | `sd_void_drone` | -24 | 2.5 / 0.0 s | THE DRONE: in under void_stage dawn (0:56), cut dead with the score at "were not" (1:05); returns quietly at 12:32 under YES -> WHEN? and gives way to the one warm piano note (score SC09c), out by 12:46. |
| 1:04 | 1:05 | 00 · 00.12-00.12 | `amb_inspection_room` | -28 | 0.2 / 0.3 s |  |
| 1:04 | 1:05 | 00 · 00.12-00.12 | `amb_fluorescent_hum` | -30 | 0.3 / 0.3 s |  |
| 1:05 | 1:17 | 00 · 00.12-00.13 | `amb_void_air` | -34 | 0.5 / 0.5 s |  |
| 1:17 | 1:21 | 00 · 00.14-00.14 | `amb_rain_concrete` | -24 | 0.6 / 0.8 s | Rain and wind at the prison. |
| 1:21 | 1:27 | 00 · 00.15-00.15 | `amb_hearing_room` | -30 | 0.4 / 0.4 s | A large room, very quiet. At 1:25 it drops to near silence for 1 s after "answer". |
| 1:37 | 1:42 | 00 · 00.17-00.17 | `amb_void_air` | -34 | 0.5 / 0.5 s |  |
| 1:42 | 1:52 | 01 · 01.01-01.01 | `amb_chicago_night` | -28 | 1.0 / 0.8 s | City through glass. |
| 1:52 | 2:04 | 01 · 01.02-01.02 | `amb_evidence_room` | -36 | 0.3 / 0.3 s |  |
| 2:04 | 2:28 | 01 · 01.03-01.04 | `amb_home_room` | -32 | 0.4 / 0.0 s | The house (and Tim's desk). In Ch 08 it cuts out with the clock on the cut to the empty chair (10:48). |
| 2:04 | 2:20 | 01 · 01.03-01.03 | `sfx_clock_tick` | -28 | 0.0 / 0.0 s | A clock. Ch 05: very low (-32), it stops on "worse" (7:18.2): a hard stop between ticks, no fade. Ch 08: it stops dead on the cut to the empty chair (10:48). |
| 2:28 | 2:58 | 01 · 01.05-01.07 | `amb_evidence_room` | -36 | 0.3 / 0.3 s |  |
| 2:58 | 3:03.5 | 01 · 01.08-01.08 | `amb_terminal_hall` | -26 | 0.3 / 0.4 s |  |
| 3:05 | 3:14 | 02 · 02.01-02.01 | `amb_aircraft_cabin` | -26 | 0.5 / 0.6 s | Engine hum. |
| 3:14 | 3:30 | 02 · 02.02-02.03 | `amb_hk_street` | -24 | 0.4 / 0.6 s | Street, trams, rain on awnings. |
| 3:30 | 3:38 | 02 · 02.04-02.04 | `amb_hotel_room` | -30 | 0.4 / 0.5 s | Air conditioner, the city far below; "a soft room" in Ch 03. |
| 3:38 | 3:50 | 02 · 02.05-02.05 | `amb_train` | -26 | 0.4 / 0.6 s | Rails. |
| 4:00 | 4:10 | 03 · 03.01-03.01 | `amb_hotel_room` | -30 | 0.4 / 0.5 s |  |
| 4:10 | 4:24 | 03 · 03.02-03.02 | `amb_market` | -26 | 0.4 / 0.6 s | Market, no walla. |
| 4:24 | 4:30 | 03 · 03.03-03.03 | `amb_hotel_room` | -30 | 0.4 / 0.5 s |  |
| 4:30 | 4:38 | 03 · 03.04-03.04 | `amb_evidence_room` | -36 | 0.3 / 0.3 s |  |
| 4:38 | 4:46 | 03 · 03.05-03.05 | `amb_terminal_hall` | -26 | 0.3 / 0.4 s |  |
| 4:38 | 4:46 | 03 · 03.05-03.05 | `amb_checkin_belt` | -24 | 0.05 / 0.6 s |  |
| 4:46 | 5:05 | 03 · 03.06-03.06 | `amb_baggage_belt` | -22 | 0.3 / 0.8 s | Belt rollers; the pulse returns over it. |
| 5:05 | 5:12 | 04 · 04.01-04.01 | `amb_terminal_hall` | -26 | 0.3 / 0.4 s |  |
| 5:12 | 5:31 | 04 · 04.02-04.04 | `amb_inspection_room` | -28 | 0.2 / 0.3 s |  |
| 5:12 | 5:31 | 04 · 04.02-04.04 | `amb_fluorescent_hum` | -30 | 0.3 / 0.3 s |  |
| 5:33 | 5:52 | 04 · 04.05-04.06 | `amb_inspection_room` | -28 | 0.2 / 0.3 s |  |
| 5:33 | 5:52 | 04 · 04.05-04.06 | `amb_fluorescent_hum` | -30 | 0.3 / 0.3 s |  |
| 6:08 | 6:42 | 04 · 04.08-05.02 | `amb_fluorescent_hum` | -30 | 0.3 / 0.3 s |  |
| 6:42 | 7:10 | 05 · 05.03-05.03 | `amb_void_air` | -34 | 0.5 / 0.5 s |  |
| 6:42 | 7:18.2 | 05 · 05.03-05.04 | `sfx_clock_tick` | -32 | 0.0 / 0.0 s |  |
| 7:10 | 7:25 | 05 · 05.04-05.04 | `amb_fluorescent_hum` | -30 | 0.3 / 0.3 s |  |
| 7:25 | 7:30 | 06 · 06.01-06.01 | `amb_courtroom` | -30 | 0.3 / 0.4 s | Room tone, no gavel. |
| 7:30 | 7:48 | 06 · 06.02-06.02 | `amb_void_air` | -34 | 0.5 / 0.5 s |  |
| 7:48 | 8:02 | 06 · 06.03-06.04 | `amb_courtroom` | -30 | 0.3 / 0.4 s |  |
| 8:02 | 8:15 | 06 · 06.05-06.05 | `amb_evidence_room` | -36 | 0.3 / 0.3 s |  |
| 8:15 | 8:45 | 06 · 06.06-06.07 | `amb_void_air` | -34 | 0.5 / 0.5 s |  |
| 8:44 | 8:55 | 07 · 07.01-07.01 | `amb_rain_concrete` | -24 | 0.6 / 0.8 s |  |
| 8:55 | 9:15 | 07 · 07.02-07.02 | `amb_phone_line` | -30 | 0.2 / 0.05 s | The handset line's hiss. In Ch 09 it cuts at 11:38.5: the silence under "When would she be released?". |
| 9:15 | 9:30 | 07 · 07.03-07.03 | `amb_void_air` | -34 | 0.5 / 0.5 s |  |
| 9:30 | 9:40 | 07 · 07.04-07.04 | `amb_home_room` | -32 | 0.4 / 0.0 s |  |
| 9:40 | 9:48 | 07 · 07.05-07.05 | `amb_hearing_room` | -30 | 0.4 / 0.4 s |  |
| 9:48 | 9:56 | 07 · 07.06-07.06 | `amb_evidence_room` | -36 | 0.3 / 0.3 s |  |
| 9:56 | 10:08 | 07 · 07.07-07.07 | `amb_home_room` | -32 | 0.4 / 0.0 s |  |
| 10:10 | 10:48 | 08 · 08.01-08.03 | `amb_home_room` | -32 | 0.4 / 0.0 s |  |
| 10:10 | 10:48 | 08 · 08.01-08.03 | `sfx_clock_tick` | -28 | 0.0 / 0.0 s |  |
| 10:56 | 11:10 | 08 · 08.05-08.05 | `amb_void_air` | -30 | 0.5 / 0.5 s |  |
| 11:09 | 11:18 | 09 · 09.01-09.01 | `amb_rain_concrete` | -24 | 0.6 / 0.8 s |  |
| 11:18 | 11:38.5 | 09 · 09.02-09.02 | `amb_phone_line` | -30 | 0.2 / 0.05 s |  |
| 11:54 | 12:02 | 09 · 09.05-09.05 | `amb_hearing_room` | -30 | 0.4 / 0.4 s |  |
| 12:02 | 12:08 | 09 · 09.06-09.06 | `amb_home_room` | -32 | 0.4 / 0.0 s |  |
| 12:08 | 12:14 | 09 · 09.07-09.07 | `amb_hearing_room` | -30 | 0.4 / 0.4 s |  |
| 12:14 | 12:53 | 09 · 09.08-09.10 | `amb_void_air` | -34 | 0.5 / 0.5 s |  |
| 12:32 | 12:36 | 09 · 09.09-09.09 | `amb_inspection_room` | -28 | 0.2 / 0.3 s |  |
| 12:32 | 12:46 | 09 · 09.09-09.09 | `sd_void_drone` | -28 | 2.5 / 0.0 s |  |

### Silences and drops

| From | To | Ch · row | Out | Why |
| --- | --- | --- | --- | --- |
| 0:00 | 0:02 | 00 · 00.01 | score | No music for 2 s: the belt, the beep and the hall only. |
| 0:33 | 0:44 | 00 · 00.07 | score | The pulse stops dead on "Yes." (0:33) and stays out through the second YES; voice and room only. |
| 0:43 | 0:44 | 00 · 00.09 | score, effects | (silence, 1 s) before "Inside the luggage...": room tone low. |
| 1:05 | 1:06.5 | 00 · 00.12 | score, drone, room | Score and drone cut dead at "were not." (1:05); 1.5 s of the void's air only, then "Three years later...". |
| 1:25 | 1:26.5 | 00 · 00.15 | score | 1 s of near silence after "answer" (1:25): the hearing room drops to near silence (-40 re voice). |
| 1:41 | 1:42 | 00 · 00.17 | all but the decaying score tail | The score decays to silence over 4 s; cut on the silence to Ch 01 (1:42). |
| 3:03.5 | 3:05 | 01 · 01.08 | score | (silence, 1.5 s): the gate's room only. |
| 3:58 | 3:59.5 | 02 · 02.06 | score | The travel pad drops out on "one more gift" (3:57); 1 s of silence. |
| 4:38.5 | 4:40.5 | 03 · 03.05 | score | Drop before "Overweight." (4:38.5-4:40.5): belt and hall low; then the beep. |
| 5:19.4 | 5:20 | 04 · 04.03 | score (stop-down) | The pulse stops 0.6 s before the first "Yes" (5:20) and comes back after it. |
| 5:22.4 | 5:23 | 04 · 04.03 | score (stop-down) | The same before the second "Yes" (5:23). |
| 5:31 | 5:33 | 04 · 04.04 | score, beds | Hard stop on "...inside the linings." (5:31): the pulse and the room cut together; 1.5 s of silence (air floor only), then the room returns on the split frame (5:33). |
| 6:18 | 6:20 | 04 · 04.08 | score | (silence, 1.5 s): the corridor hum only. |
| 7:18.2 | 7:18.2 | 05 · 05.04 | clock | The clock stops on "worse" (7:18.2), between ticks. |
| 7:21 | 7:23 | 05 · 05.04 | score | (silence, 1.5 s): the corridor hum only. |
| 7:27.5 | 7:29 | 06 · 06.01 | score | Drop before "A death sentence" (7:27.5-7:29): courtroom tone only. |
| 8:33.5 | 8:35 | 06 · 06.07 | score | Drop before "Deceived." (8:33.5): the score has thinned out; the void's air only. |
| 8:40 | 8:42 | 06 · 06.07 | score | Silence, 2 s, after "And guilty anyway.", then cut. |
| 10:07.5 | 10:09 | 07 · 07.07 | score | (silence, 1.5 s). |
| 10:40.5 | 10:42 | 08 · 08.03 | score | Drop before "On January 25th, 2026, Gene Hunt died." (10:40.5): the clock and the room only. |
| 10:48 | 10:54.5 | 08 · 08.04 | everything but the air floor (score, room tone, clock) | TOTAL SILENCE on the cut to the empty chair (10:48): 2 s, "He never saw Dawn come home." over it, then 2 s more. The loudest moment of the film. |
| 10:56 | 10:56 | 08 · 08.05 | - | Room tone (the void's air, -30 re voice) returns on the cut to void_stage chair (10:56). |
| 11:38.5 | 11:48 | 09 · 09.03 | score, phone line | Silence under "When would she be released?" (11:38.5-11:48): the line's hiss cuts out; the air floor only. |
| 12:09 | 12:10 | 09 · 09.07 | score | Drop before "It was hers." (12:09). |
| 12:11 | 12:13 | 09 · 09.07 | score | (silence, 2 s) after "It was hers." |
| 12:14 | 12:32 | 09 · 09.08 | score, effects | void_stage dawn: Silence. The status line and the State Department line over the void's air only. |
| 12:53 | 12:55 | 09 · 09.10 | everything but the air floor | Two seconds of silence at the very end. |

## Building the mix (when the narration and the score exist)

1. **Voice.** Place the narration takes (`audio/vo/`, another agent) on the clock; list them in `voice[]` of the cue
   sheet (`file`, `start_s`). If the read changes the timing, re-time the rows first (`audio/tools/retime.py`).
2. **Score.** Only after the author's go: generate per `SCORE.md`, check and retune every take, window each placement,
   and render `out/audio/score_bed.wav` with the placements' entries and exits (hard stops are hard).
3. **Beds.** For each bed span: loop its file from a seeded offset with 0.6 s equal-power crossfades, set it to its
   level under the voice, apply its fades; mute what each silence names for its span (`silences[].out`); lay the air
   floor (noise LP 900 / HP 60 at -60 LUFS) under the whole film.
4. **Effects and master.** `uv run ~/bodila51/opus-sound-layer/scripts/mix.py audio/cues.json --out out/audio`
   places each effect by its `align` (peak or start) on `t`, levels it in its band, adds one shared room (0.6 s,
   -18 dB), ducks the score 9 dB under the voice and masters: two-pass loudnorm to -14 LUFS, true peak -1 dBTP; check
   the loudness range is 7 LU or more.
5. **QA.** `qa.py` on the muxed film, earshot `timeline` and `sheet` on the mix with `--cues audio/cues.json`,
   `ebur128=peak=true`, and a person's ear on the list below.

Do not run the mix, a picture render and an earshot or Stable Audio batch at once on this machine (sound.md 8).

## For a person's ear

earshot cannot judge these; a person should:

- **The tannoy** (0:09, 0:15, 5:05): it must read as a far loudspeaker and say nothing. It is built from noise and a
  buzz shaped into random vowels, band-limited to about 600-1100 Hz in a hall; the tagger hears no speech in it (0.00).
- **The fluorescent hum and the phone line**: synthetic beds; the tagger heard music in the hum's harmonics.
- **The total silence** at 10:48 (6.5 s with only the -60 LUFS air floor): it must feel deliberate, not like a dropout,
  on a laptop and on phone speakers.
- **The clock's stops** on "worse" (7:18) and on the cut to the empty chair (10:48): between ticks, no fade.
- **The drone** (73 Hz) on phone speakers: its upper partials carry it there; check it is still felt.
- **The two impacts**: the same weight at 1:10 and 7:30, and nothing at "life".
- Every bed for any voice-like murmur (the tagger heard no speech in any bed that was kept, but a person should listen once).

## Licences (the full list per file is in `sfx/INDEX.md`)

- **earshot** renders (catalogue takes, recipes and the sound bank): free to use, commercial too, no credit needed.
  Catalogue sounds are new takes of public-domain recordings; the bank's sounds are made in code, 15 of them fitted from
  CC0 recordings.
- **Stable Audio 3.0 Small SFX** (through audio.cpp): Stability AI Community License, free under USD 1M annual revenue;
  say so in the credits (`audio/CREDITS.md` when the mix is made, or the YouTube description). Never on screen.
- **Synthesised here** (numpy, `synth_*` takes): made for this film; no third-party material.
- **Lyria** (when made): SynthID-watermarked; credit as generated music.
