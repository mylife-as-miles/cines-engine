# The film so far, cut v24: the aide's fall gone for good; a second version of the ending with the bell

The author, 28 November 2026, on cut v23: "And pls remove that scene of that guy falling...", with links to PaulXStretch, to Audacity ("Audio manipulation and pitch shifting") and to a Reddit post about Denis Villeneuve. Editing only: nothing was generated and nothing was spent. **The author has not judged this cut.**

`out/review/film_v24.mp4` · 177.04 s (2:57.0), 4,249 frames · built by `tools/combine_film_v24.py` · edit list `edit/film_v24.edl.json` · from the end of the descent to the end: `out/review/film_v24_hall.mp4` (40 s)

Second version, same picture: `out/review/film_v24_bell.mp4` · from the shutters to the end: `out/review/film_v24_bell_end.mp4` (15.5 s)

Everything not named here is cut v23 (`edit/film_v23.md`).

## The fall

In cut v23 the white figure between the dark backs ran to take frame 131, "before the aide's knee folds". Slowed to 57 %, its last frames still showed him beginning to sink behind her: that is the fall the author saw. The shot now ends at take frame 124, where he is plainly upright on the gangway (looked at enlarged, every second frame of the finished file). It is 1.25 s (19 frames at 63 %). To keep her close shot on the song's last hit, the still valley is held 0.67 s longer before the cutter flies in.

| Film time | Picture |
| --- | --- |
| 2:20.0 | The valley from the wall, held 0.9 s; the white cutter flies in over the wall and away down the valley (3.8 s in all) |
| 2:23.8 | The spear and the bowl; the two begin to turn (2.4 s) |
| 2:26.25 | Serath white between two dark backs, the aide walking behind her (1.25 s) |
| 2:27.5 | The song's last hit, on the cut: Serath close; from here as cut v23 |

## The sound

**In the main cut:** as cut v23, less two effects I had added there on a critic's note without testing how they read: cloth under Karst's turn and paper under the hand at the lamp. Two listening models, asked to choose from a list, heard a metal latch and a ratchet. They are out; those two moments have the room's air only.

**The second version (the bell).** One sound made by stretching a recording, at the one place it has a reason. As the shard is shown, the room is taken away (the air and room tone drop 10 dB across the cut); then the film's own bell is heard, the first stroke of scene 1, once and far off, and its ring is stretched eight times into a single held tone that stays under the shard and her face. She has not yet said "The marriage bell." (the line is not shot): the sound says it first. Both listening models, asked to choose, heard "a bell struck far away and ringing on". Under her face it sits about 4 dB above the main cut's air (−29 against −33 dBFS).

**The tools.** The three sites could not be opened from this environment, and nothing was installed. `tools/stretch.py` has the same two methods in plain numpy: Paulstretch (the public-domain algorithm inside PaulXStretch and inside Audacity's Paulstretch effect) and tape-speed pitch (slower is lower and longer). They reshape a recording; they generate nothing.

**Tried and dropped:** the air of the plain made the same way. Stretched, an open wind stopped being air (one model: "a synthesizer pad"; at half speed without stretching: "an ominous drone"), so the plain keeps cut v23's air. The cutter's timbers five semitones down: no gain I could show, so they are as they were, 4 dB lower because they now meet a peak of the song.

## Checked

- Frame count 4,249. The trimmed shot and the longer hold looked at in frames from the finished file.
- Two listening models transcribed the yard and the hall: the five lines are intact, word for word, and nothing else is spoken.
- Peak −1.74 dBFS in both versions. The two versions are sample-identical until 0.3 s before the shard.
- **Nobody has watched either version through at speed with the sound on.** The listening models are a check on what a sound is taken for, not on whether it is good.

## Known and not fixed

- **The take's own sound of the shutters opening reads as clockwork** (both models: "a ratchet", "a clockwork mechanism"). It is the video model's sound, in every cut since v21. Its replacement has to read as heavy wooden shutters, and none of the creaks on hand did so for both listeners (the listeners call most creaks a ratchet, so they are not a sure judge here either).
- The Reddit post could not be read: the site is blocked here and a search did not find it.
- Everything in `edit/film_v23.md` under "Not fixed, because an edit cannot fix it" still stands, first of all the five missing lines.
