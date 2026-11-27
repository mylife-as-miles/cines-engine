# Motion graphics

The film's type and documents, built in code; every frame is a function of t. Lead session's lane (DECISIONS,
27 November 2026). Motion numbers from cinetic (`design/REFERENCES.md`).

| File | What it makes |
| --- | --- |
| `type.html` + `type_render.js` | The story type: supers (`place_2014`, `date_gene`), YES landing twice (`yes`), YES eroding into WHEN? (`yes_when`), `death_2017`, the sentence changing in place to life (`sentence_life`), the rolling years (`counter`), the `title`. Three looks on the board (`design/boards/type_looks.jpg`); **B, cinema serif (Cormorant Garamond)**, is the working choice. `node gfx/type_render.js seq <mode> <s> out.mov --look B` gives an alpha layer to lay over a plate; `--bg plate.jpg` previews over it. |
| `doc_composite.py` + `shots/*.json` | A real document page pinned onto evidence_table's blank-sheet plate through its corner pins, lit by the plate (multiplied in linear light), a marker written over the lit phrase, a focus band, a log-space push, then the film's grade. Private lines named in `soft` are blurred in page space. Run with the graphics Python (numpy, OpenCV): `python gfx/doc_composite.py --shot gfx/shots/s1_yes.json --out out/gfx/s1_yes.mp4` (about 1 s a frame), or `--still 3.0 out.png`. |
| `fonts/` | OFL fonts (see its README). |

Outputs go to `out/gfx/` (ignored).
