# Frames

Every final frame of every stage at the moment the work was paused (27 November 2026), 1280x720.

- `graded/<stage>/<camera>.jpg`: with the film's grade, "A fixed" (the author's choice of 27 November 2026, defined in
  `scenes/shoot.py`; re-apply to every stage with `bash scenes/regrade_frames.sh`).
- `raw/<stage>/<camera>.png`: straight out of Blender, before the grade. Keep these: any grade (for example the proposed
  grade B with an S-curve, compared in `grade_A_vs_B.jpg`) can be applied to them later without rendering again:
  `ffmpeg -i raw/<stage>/<camera>.png -vf "<grade>" out.png`, with the grade strings in `scenes/shoot.py` (A) and
  `HANDOFF.md`.
- `cast_fabric_fix.png`: the shared cast after the fabric fix (clothes reading as clothes next to the stone skin).

Not all frames show the latest code: see the table in `HANDOFF.md` for which stages predate the fabric fix. The
contact sheets in `design/boards/` show the same frames in film order. A stage is rebuilt exactly from its code in
`scenes/stages/`; `blend/` holds the same stages saved as .blend files for opening in Blender.
