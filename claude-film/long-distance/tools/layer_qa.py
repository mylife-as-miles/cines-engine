# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile", "pyloudnorm", "matplotlib"]
# ///
"""Run opus-sound-layer's qa.py (unchanged on disk) on this film's FLAC master and stems (tools/layer_mix.py writes
mix.flac and stems/*.flac instead of WAV for the disk). The only change is the two file names it reads.

  uv run tools/layer_qa.py out/long_distance_mixed_720p.mp4 --audio out/audio
  (or with any Python that has numpy, scipy, soundfile, pyloudnorm and matplotlib, e.g. earshot's venv)
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from layer_mix import run  # noqa: E402

QAPY = os.environ.get('SOUND_LAYER_QA', '/home/user/bodila51/opus-sound-layer/scripts/qa.py')
PATCHES = [
    ('mix = sf.read(os.path.join(A, "mix.wav"))[0]', 'mix = sf.read(os.path.join(A, "mix.flac"))[0]'),
    ('sf.read(os.path.join(A, "stems", k + ".wav"))[0]', 'sf.read(os.path.join(A, "stems", k + ".flac"))[0]'),
]

if __name__ == '__main__':
    run(QAPY, PATCHES, sys.argv[1:])
