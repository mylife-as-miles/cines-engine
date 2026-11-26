# The film so far, cut v11: the cup carries the film from the wedding into the council

The author, 26 November, on cut v10: "Remove the fade in the last scene... That lead to Three Days later... It reduce the pace of the film and remove the three days later... The cups scenes of both event should transition together like [Park Chan-wook] style [then] the wide shot... of the council chamber will [be] where it says three days later." Editing only; nothing generated.

`out/review/film_v11.mp4` · 85.04 s (cut v10 was 92.25) · 992×432, 2.39:1 matte · −18.9 LUFS, range 13.0 LU, peak −1.9 dBFS · built by `tools/fix_q04_t1.py`, `tools/mix_q04.py`, `tools/combine_film_v11.py` · edit list `edit/film_v11.edl.json`

**Nobody has heard this.** What follows is measurement and listening models' reports.

## What changed from cut v10

| In cut v10 | In cut v11 |
| --- | --- |
| The still cup faded to black (62.0 to 62.6 s), then black to 64.1 s | **No fade.** The still cup is held three seconds (57.1 to 60.1 s) and never goes to black |
| A black card, 3.2 s, with "THREE DAYS LATER" | **No card** |
| The trembling cup cut in from black | **A matched dissolve, 30 frames (60.125 to 61.375 s):** the still cup becomes the trembling cup. The wedding's guests behind it give way to the council; the wine begins to move. The cup itself does not move |
| The super on the card | **The super over the wide shot of the chamber** (66.2 to 69.2 s), on the dome, in the lettering of the film's first super with a soft shade behind it |
| A half-second fade out at the end of the cut | A plain end on Serath's turn (the scene goes on in Q05) |

## How the two cups were made to coincide

The video model was given the still cup as its first frame, but re-framed it a little and drew its lip thinner: before correction the trembling cup's bowl was 6 % narrower and its rim 8 px lower than the still cup's, which showed in the dissolve as a double rim. `register` in `tools/fix_q04_t1.py` now measures five marks in both shots (the rim's top, the foot's bottom, the bowl's left and right edges, the marble's far edge) and moves and scales each of the first 30 frames, width and height separately, until they agree. Measured after: rim 48 against 46 to 48, foot 423 against 423, bowl 352 to 643 against the same, marble edge 242 against 243. After the dissolve the last setting is kept, so the model's own slow push carries on with no jump.

## Sound across the dissolve

Movement I's mix is let go over the dissolve (from 60.3 s, out by 61.9 s) while the council's comes up under it from 60.1 s: the last air of the wedding bell and the gloved applause give way to the bells that no one has rung and the buzz of the cup's foot. Level from 0.2 s before the dissolve to 2.2 s after, in 5 ms steps: between −24 and −41 dBFS, no hole, no digital silence. The bells in the film's mix read as distant church bells (z 3.0), though against "a doorbell" or wind chimes they lose the forced choice.

Everything else is as in cut v10 (`edit/film_v10.md`): the four fixes to Q04 take 1, the council's sound, movement I in sound version A.

## Not done, or not known

- The voices are the video model's, as before.
- No panel has reviewed this cut.
- Movement I's still cup is now 3.0 s where it was 4.9 s at full level: the gloved applause is heard for about two seconds before the dissolve takes it.
