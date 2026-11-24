# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile", "pyloudnorm"]
# ///
"""Run opus-sound-layer's mix.py (unchanged on disk) with the changes this film needs, made as exact text replacements
when it is loaded (each must match once, or this refuses to run, so a changed upstream is never patched blindly):

1. The bed's loudness. mix.py normalises its "music" input to -23 LUFS (calm), because it expects a score. Long
   Distance has no score: its bed is room tone, levelled in build_mix.py against the voices (which mix.py normalises
   to -16 LUFS). Normalising room tone to -23 LUFS would lift it about 18 dB, to 7 LU under the voices, so the sheet's
   "music_lufs" (build_mix.py writes the bed's own measured loudness) keeps the bed where it was designed.
2. The master and stems are written as 24-bit FLAC (mix.flac, stems/*.flac) instead of WAV and 32-bit float: the
   disk on this machine cannot hold an 8:45 master and three float stems. tools/layer_qa.py reads them.

Everything else (placing each effect on its cue, levelling it in its own band, ducking the bed under the voice,
mastering to the sheet's LUFS with the -2 dBTP limiter) is mix.py's own code.

  uv run tools/layer_mix.py audio/cues.json --out out/audio
"""
import os, sys

MIXPY = os.environ.get('SOUND_LAYER_MIX', '/home/user/bodila51/opus-sound-layer/scripts/mix.py')
PATCHES = [
    ('music *= undb((-23 if calm else -20) - lufs(music))',
     'music *= undb(C.get("music_lufs", -23 if calm else -20) - lufs(music))'),
    ('os.path.join(a.out, "mix.wav"), out.astype(np.float32), SR, subtype="PCM_24")',
     'os.path.join(a.out, "mix.flac"), out.astype(np.float32), SR, subtype="PCM_24")'),
    ('os.path.join(a.out, "stems", name + ".wav"), (st * gain).astype(np.float32), SR, subtype="FLOAT")',
     'os.path.join(a.out, "stems", name + ".flac"), (st * gain).astype(np.float32), SR, subtype="PCM_24")'),
]


def run(path, patches, argv):
    src = open(path).read()
    for old, new in patches:
        if src.count(old) != 1: raise SystemExit(f'{os.path.basename(path)} has changed; cannot apply: {old}')
        src = src.replace(old, new)
    sys.argv = [path] + argv
    exec(compile(src, path, 'exec'), {'__name__': '__main__', '__file__': path})


if __name__ == '__main__':
    run(MIXPY, PATCHES, sys.argv[1:])
