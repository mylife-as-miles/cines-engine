# The film so far, cut v12: the Hierophant's voice restored, the Engineer's picture put right

The author, 26 November, on cut v11: "Pls restore back Hierophant voice", and, with a still of the Engineer before and after the wall fix, "what did you do to [the] engineer". Editing only; nothing generated.

`out/review/film_v12.mp4` · 84.54 s · 992×432, 2.39:1 matte · −18.9 LUFS, range 13.0 LU, peak −1.9 dBFS · built by `tools/fix_q04_t1.py`, `tools/mix_q04.py`, `tools/combine_film_v12.py` · edit list `edit/film_v12.edl.json`

**Nobody has heard this.** The join (the matched dissolve between the cups, the super over the wide shot) is cut v11's, unchanged: `edit/film_v11.md`.

## What I had done, and what is undone

| | In cuts v10 and v11 | In cut v12 |
| --- | --- | --- |
| **The Hierophant's voice** | Slowed to 0.84 speed (a time-stretch that keeps pitch), and passed through the drone removal, which took 1.8 dB from the lowest part of his voice (80 to 160 Hz) | **The take's own sound and speed.** No stretch. His words are not cleaned at all; only what lies under his pitch (below 60 Hz) is filtered off, and the gaps beside his words stay cleaned. Level as before, matched to the other lines |
| **The Hierophant's picture** | Slowed to 0.84 with motion interpolation | As generated. The shot still ends a quarter second after his last word (2.6 s) |
| **The Engineer: the wall** | I cut him out with a mask and raised everything else from dark slate to pale grey. Compared with the take at full size, this **thinned and greyed his white hair, left an outline round his head and made him read as a cut-out.** I had checked it at half size and passed it | Redone with no mask edge: each pixel rises by an amount that depends only on how dark it is, and nothing as bright as his hair rises at all, so hair stays lighter than the wall and no rim can form; warm pixels (skin) are not raised; where skin meets wall the edge pixels take their share of the wall's rise. Checked against the take at three times size: hair, face and robe measure identical to the take; the wall goes from about 0.22 to 0.41 (a mid grey, a shade under his robe, not the pale grey of v11) |
| **Every face: colour** | Shots 2 to 6 were given the neutral part of the grade I fitted on the cup. Nobody asked for it, and it pushed the shadows of skin down and toward grey (the Engineer's shaded cheek from 0.31 to 0.27 in red; the Hierophant's forehead from 0.34 to 0.30) | **The take's own colour** on shots 2 to 6. Only shot 1, the cup, keeps the fitted grade, so that it matches the still cup it dissolves from |

Unchanged from v11: the ripples in the wine, the drone out of the Engineer's lines and the gaps, the local bells and buzz, the matched dissolve, the super.

## If the dark wall is wanted back

`lift_wall` is one call in `tools/fix_q04_t1.py`; without it shot 5 is the take exactly.
