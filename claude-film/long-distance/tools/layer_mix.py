# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile", "pyloudnorm"]
# ///
"""Run opus-sound-layer's mix.py (unchanged on disk) with two changes this film needs, made as exact text replacements
when it is loaded (each must match once, or this refuses to run, so a changed upstream cannot be patched blindly):

1. The bed's loudness. mix.py normalises its "music" input to -23 LUFS (calm), because it expects a score. Long
   Distance has no score: its bed is room tone, levelled in build_mix.py against the voices (which mix.py normalises
   to -16 LUFS). Normalising room tone to -23 LUFS would lift it about 18 dB, to 7 LU under the voices, so the sheet's
   "music_lufs" (build_mix.py writes the bed's own measured loudness) keeps the bed where it was designed.
2. The stems are written as 24-bit PCM instead of 32-bit float: the disk on this machine cannot hold three float stems
   of an 8:45 film next to the master. qa.py reads them the same way.

Everything else (placing each effect on its cue, levelling it in its own band, ducking the bed under the voice,
mastering to the sheet's LUFS with the -2 dBTP limiter) is mix.py's own code.

  uv run tools/layer_mix.py audio/cues.json --out out/audio
"""
import os, sys

MIXPY = os.environ.get('SOUND_LAYER_MIX', '/home/user/bodila51/opus-sound-layer/scripts/mix.py')
PATCHES = [
    ('music *= undb((-23 if calm else -20) - lufs(music))',
     'music *= undb(C.get("music_lufs", -23 if calm else -20) - lufs(music))'),
    ('(st * gain).astype(np.float32), SR, subtype="FLOAT")',
     '(st * gain).astype(np.float32), SR, subtype="PCM_24")'),
]
src = open(MIXPY).read()
for old, new in PATCHES:
    if src.count(old) != 1: raise SystemExit(f'layer_mix: mix.py has changed; cannot apply: {old}')
    src = src.replace(old, new)
sys.argv = [MIXPY] + sys.argv[1:]
exec(compile(src, MIXPY, 'exec'), {'__name__': '__main__', '__file__': MIXPY})
