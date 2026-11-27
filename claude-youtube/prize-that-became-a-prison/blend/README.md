# Blender files

Each stage of the film saved as a .blend that opens in Blender 5.3 desktop (keep the repository layout: the MakeHuman
textures are linked by relative path to `../noir-kit/assets/makehuman`; the generated props' textures are packed in).

| File | What |
| --- | --- |
| `cast.blend` | The whole cast in one line-up (Dawn 2014, Dawn in prison, three officers, two staff, Tim, an organiser, Gene), rigged, in rest pose. Rendered in `../frames/cast_lineup_graded.jpg` |
| `<stage>.blend` | One stage as its `build()` leaves it, with every camera of the stage as `cam_<name>` (the first is active), Cycles and AgX at the stage's exposure |

These are snapshots for looking around. **The code is the source**: `scenes/stages/<stage>.py` rebuilds each stage
exactly and is what the renders come from; per-camera changes a stage makes at render time (for example the inspection
room laying out the handbags for Ch 05) are not in the .blend. Re-export after changing a stage:
`<bpy python> -I scenes/save_blend.py -- <stage> blend/<stage>.blend`; the cast: `scenes/save_cast.py`.
The grade (A) is applied after rendering by `scenes/shoot.py`, so a render from a .blend comes out ungraded.
