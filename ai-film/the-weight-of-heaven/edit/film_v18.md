# The film so far, cut v18: after the council, "Below" as a music montage on the song

The author, 27 November: "after the council scene this will be a music montage to speed things like how arcane do and song like arcane"; on the song demo: "The song... Now add it... And merge all to complie let me see how it turns out then I'll judge"; and "Remember it starts after the council meeting". Editing only; the one thing generated is the song (see below).

`out/review/film_v18.mp4` · 158.25 s (2:38.2) · 992×432, 2.39:1 matte · −18.0 LUFS, range 15.1 LU, peak −1.9 dBFS · built by `tools/below_montage.py` then `tools/combine_film_v18.py` · edit list `edit/film_v18.edl.json`

**Nobody has watched or heard this.** Frames were inspected (the middle frame of every shot, the fast cuts frame by frame, the six frames either side of the join) and levels measured; one sound-only listening pass over the last 42 seconds heard footsteps, the song entering on a hard hit, every line of the verse and both "Hold it up" answers, a hard stop with no word cut, and then both of Karst's sentences, clear.

| Film time | What | From |
| --- | --- | --- |
| 0:00.0 – 2:04.9 | Everything up to Cassiel alone at the door | Cut v16, its video stream copied without re-encoding |
| 2:04.9 | **Straight cut, and the song's drum drop.** The montage: 31 shots on the song's beats, 28.3 s | `out/edits/Below_montage_v1.mp4` |
| 2:33.1 | The last hit: the music stops. Serath's head comes level. Off-screen: "We did not attack your city, Admiral." | Q08A take 1 (picture), Q08B take 2 (voice) |
| 2:35.6 | Karst, silent | Q08B take 2, pushed in |
| 2:36.5 – 2:38.2 | Serath in profile. Off-screen: "We stopped carrying it." | Q08A take 2 (picture), Q08B take 2 (voice) |

It takes the place of cut v17's five slow shots of Q07 (cut v17 is unchanged on disk).

## The montage

The song's second verse, from its drum drop (55.87 s into the song) to the hit that ends the "Hold it up" tag (84.11 s): 40 beats at 85 BPM. A heavy hit falls every eight beats and lighter ones on beats 3, 4 and 7 after it; the picture changes on those. The full shot list, beat by beat with the sung words, is at the head of `tools/below_montage.py`.

- **From Q07** (the corrected reel, v6): the underside and the cutter, Serath at the window, the crossing, the crow at the wall, the shade falling on her, Sarn Vale. Three are sped up (1.35× and 2×) to fit their beats.
- **From Q08, both rounds:** the cutter over the wall, Serath coming down and standing white among dark backs (round 2), the spear and the bowl and the two watching her pass (round 1, the shot the author prefers), the collar (round 1), Karst in the doorway (round 2, pushed in 1.4× to 2.7×), her profile (round 2). Round 1 is brought down and cooled to sit with round 2, as in `tools/montage_q08.py`.
- **From earlier in the film, one beat each:** the child with the bowl, the mountain falling and the farmer shielding her, between his hand on the bowl and his face now; and the white cathedral and the gold cup, before the gold collar, on "of gardens we have never seen".
- **Not used:** her stumble, the aide's fall, the first round's Karst, anyone speaking on screen.

## The sound

- The song at −3 dB, starting on the cut; the verse measures −16.3 LUFS, against −19.0 LUFS for the last forty seconds of the council. On the last hit it is out within a third of a second (the hit also rings faintly through a made room, 13 dB down).
- Under the last two seconds of music the yard's own air comes up (the film's wind of the vale and a crowd's presence, local sounds), so it is there when the music stops.
- Karst's two sentences are lifted from Q08B take 2 (5.58 to 7.62 s and 9.80 to 10.88 s), with the take's low hum filtered out below 110 Hz. They are heard off-screen, as the author asked.

## Not done, or not known

- The song is a first demo. The listening model called it close to the brief (dark cinematic pop, no electric guitar, a low female lead, a crowd's chant) and found it less heavy than Dune's score, with some pitch correction on the lead and a formulaic build. A person's ears have not judged it.
- Only the second verse is in the film. The song's other parts (the opening, the chorus, the end) are not laid in: the opening's sound is the one the author approved, and it is not changed without their word.
- Karst is on screen only as a pushed-in piece of round 2's doorway shot (soft at 2.7×). A proper close shot of him would be a new take.
- Pushing in on 480p takes softens the picture: the bowl (2.2×), the faces (2.0× to 2.5×), the Weir (1.8×).
- Cut v17's notes still stand for everything before 2:04.9.
