# The film so far, cut v10: movement I and the council's opening

The author, 26 November, on Q04 take 1's four faults: "Fix this... Then merge with the compile." Editing and local sound only; nothing generated on a paid service.

`out/review/film_v10.mp4` · 92.25 s · 992×432, 2.39:1 matte · −19.2 LUFS, range 13.8 LU, peak −1.9 dBFS · built by `tools/fix_q04_t1.py`, `tools/mix_q04.py` and `tools/combine_film_v10.py` · edit list `edit/film_v10.edl.json`

**Nobody has heard this.** What follows is measurement and listening models' reports.

| Film time | Length | What | From |
| --- | --- | --- | --- |
| 0:00.0 | 64.1 s | I. The bell | Cut v8's picture, untouched; cut v9's sound, **version A** (the choir heard far off in the valley). The author has not chosen between A and B; `--choir B` builds the other |
| 1:04.1 | 3.2 s | Black; "THREE DAYS LATER" | Made here, in the lettering of the film's first super |
| 1:07.3 | 3.5 s | The cup, trembling | Q04 shot 1, slowed to three quarters speed; ripples added |
| 1:10.8 | 2.2 s | The Chancellor | Q04 shot 2 |
| 1:13.0 | 5.8 s | The chamber; "Six hundred feet since dawn…" | Q04 shot 3 |
| 1:18.8 | 3.1 s | The Hierophant: "Then let it be broken." | Q04 shot 4, slowed to 0.84 speed, cut a quarter second after the word |
| 1:22.0 | 6.2 s | The Engineer: "Break it, and it pours…"; he stops and looks at her | Q04 shot 5, the wall lifted |
| 1:28.1 | 4.1 s | Serath; "Sarn Vale." from behind us; she turns | Q04 shot 6; the last half second fades out, because the scene goes on in Q05 |

## The four fixes

| Fault in the take | What was done | Checked |
| --- | --- | --- |
| The wine barely trembled | Concentric ripples drawn inside the wine's own ellipse, running inward from the rim, strongest at the rim and almost still at the centre; the ellipse is tracked through the camera's slow push | Seen in frames; visible at the size of a phone |
| A low drone under the whole take | Taken out of the voices (whatever holds still at each frequency for two seconds, lesson 50) and the track high-passed; shot 1's sound dropped whole. Only the lines, the cleared throat and the breaths are the model's | In the take's gaps the level fell from −36…−43 dBFS to −46…−57. In the finished council nothing under 120 Hz stands above −65 dBFS except the voices' own pitch |
| The Hierophant's five words in under a second | Shot 4 slowed to 0.84 speed from the cut to a quarter second after his last word (picture motion-interpolated, voice stretched with its pitch kept); the hold after the line dropped, so the shot ends on the word, as the Dune scripts cut an order | Two sound-only listening passes: no line "stretched, warbly or processed"; mouth frames clean |
| The dark slate wall behind the Engineer | Everything that is not the man raised to the room's pale grey, keeping its own shading. He is separated by warmth (his skin is the only warm thing in the shot), not by brightness | Seen in frames: face, hair and robe untouched. My first version, keyed on darkness, greyed the shadow side of his face |

Also: Q04's colour is the film's own grade, learned from the one object the film holds both ways: the still cup, ungraded in take Q02 t1 and graded in cut v8. Shot 1 (the same cup) gets the whole fitted transform, so the two cups match; the faces get only its neutral part.

## The council's sound

| Layer | Source | Ear-model |
| --- | --- | --- |
| Voices | The video model's, cleaned | All three lines word for word, twice, by a sound-only listener. Each line's loudest 400 ms at −15.0 LUFS, where movement I's lines sit; "Sarn Vale." 4 LU under |
| The cup's buzz | Local Stable Audio (`audio/sfx/q04/cup_buzz.flac`) | "A metal cup rattling on a stone table" 99.9 % over the room's air. The model's own buzz read as hiss; a synthesized one as crickets |
| Bells nobody rang | Local Stable Audio (`audio/sfx/q04/bells_far.flac`), played at 0.84 speed | Alone: "distant church bells", strong (z 3.8), 62 % against wind chimes. In the mix, plausible only (z 2.7), and against "a doorbell" it loses. Two synthesized versions failed outright (a pad, a music box) |
| Air | The cathedral's wind bed from movement I | The second listener calls it wind or rushing water |

The bells come in under the black card and thin away before the first word: no bell lies under a line.

## The join

Movement I's sound runs to its last sample; the council's begins under the black. Level across the join in 5 ms steps: about −60 dBFS on both sides, no hole, no digital silence, largest sample step 0.0004.

## Not done, or not known

- The voices are the video model's. The Engineer and the Hierophant sit within a semitone of each other; nothing here changes that.
- The bells are the weakest new sound.
- No panel has reviewed this cut.
- The super is over black, not over the cup as the storyboard said: warm white lettering does not read on white marble, and the film's first super is over black.
