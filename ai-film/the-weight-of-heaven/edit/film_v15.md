# The film so far, cut v15: the frozen cloud at Serath's arch moves

The author, 26 November, after a before-and-after test on this shot: "I love it... So merge everything together". Editing only; nothing generated.

`out/review/film_v15.mp4` · 105.0 s · 992×432, 2.39:1 matte · −18.9 LUFS, range 13.6 LU, peak −1.9 dBFS · built by `tools/combine_film_v15.py` (the cloud by `tools/cloud_drift.py`) · edit list `edit/film_v15.edl.json`

**Nobody has watched this play.** The movement was measured and frames were inspected; whether it reads as real cloud is the author's call.

| Film time | What | From |
| --- | --- | --- |
| 0:00.0 – 1:20.4 | Everything up to Serath at her arch | Cut v14, identical (0.000 levels of difference, frame by frame) |
| 1:20.4 – 1:26.1 | Serath at her arch, one continuous shot of 136 frames (Q04's last shot and Q05's first) | Cut v14 with the cloud moved |
| 1:26.1 – 1:45.0 | The rest of Q05 | Cut v14, identical |

Sound: cut v14's, unchanged.

## What moves now

Tracked over the shot, in pixels a second across the frame (right is +):

| Part of the picture | Cut v14, Q04 half → Q05 half | Cut v15, Q04 half → Q05 half |
| --- | --- | --- |
| Sky | 0 → 0 | +2 → +1 |
| Top of the cloud bank | 0 → 0 | +4 → +3 |
| Low mist, centre | +4.5 → −2.9 (it reversed at the join) | +6.6 → +2.4 |
| Cloud right of the right column | −7.2 → 0 (it froze at the join) | −6.3 → −7.8 |
| Mist under the arcade, left | +8.4 → −4.8 | the same: not touched |
| Tower, columns, Serath | 0 | 0 |

- **The frozen part only.** A map of where each take's cloud does not change decides where movement is added; where the take's cloud is alive it is left as generated.
- **One clock through the join.** Each half has its own plate (the two takes differ by a few levels), but the drift is one function of the shot's time, so the bank is in the same place on both sides of the three dissolved frames and keeps its speed.
- **The right opening** was alive in Q04 (leftward) and frozen in Q05. In Q05's half it now carries on leftward from where Q04 left it, starting from nothing at the join.
- **Before the grain.** The movement goes in under the film's grain and matte.

## Checked

- Before encoding, the largest change on Serath, on both columns, left of the left column and below the rail is 0 levels in both halves.
- Her matte follows her in every frame of both halves, including her turn to the room; looked at with the change amplified eight times.
- Frame-to-frame change across the join rises for the three dissolved frames (about 1 level against 0.5): that is the two takes' own difference in brightness, as in cut v14.

## Not done, or not known

- **The other shots with still cloud are not done.** The wide of the chamber and Serath's three close shots each have a slow push-in (corners travel 5 to 8 px or more over the shot). The method here needs a still camera; those shots need the camera tracked first, and the wide has seven arches and five people in front of them. A separate test, to be shown before it goes in a cut.
- Movement I's shots with cloud (the nave, the bell from below) have a moving camera as well and were not examined further.
- The mist under the arcade on the left still changes direction at the join, as in cut v14: both takes' own movement.
- The join's small step in brightness between the takes is as it was.
