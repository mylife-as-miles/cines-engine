# camrig (vendored)

`camrig.py`, `shoot.py`, `README.md` and `examples/` come from **anyshot** by Apekshik Panigrahi
(https://github.com/apekshik/anyshot, `camera/`, commit 21e844c), under the MIT licence in `LICENSE`.

Changes made here:
- `shoot.py`: encodes with `libx264` first (Linux containers have no NVENC), then NVENC, then Media Foundation;
  a `--scene <file.blend>` option opens the scene first, so the CLI also runs under `pip install bpy`
  (`python shoot.py -- --scene x.blend --shots shots.json --out out/`), not only `blender -b x.blend --python shoot.py -- ...`.
- Docstrings point here. The README is the original (its paths refer to anyshot's layout: `camera/shoot.py` is this folder's `shoot.py`, and
  `pipeline/gpu_run.sh` is not vendored).
