"""Listen to every score take with earshot before it goes in the film, and measure its tuning and shape.

  /home/user/leonxlnx/earshot/.venv/bin/python tools/score_check.py      -> audio/score/check.json

Per take (audio/score/T*.mp3): duration, tuning offset from A440 in cents (librosa; tools/build_mix.py removes it via
a cue's tune_cents), earshot's description and AudioSet tags (singing, speech, drums would rule a take out), a forced
choice against what the score must be (a quiet felt piano, later a cello) and what it must not be, and the loudness
envelope in 5 s steps, which shows where the take breathes and where it ends.
"""
import glob, json, os
import numpy as np, librosa
from earshot import api

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'audio', 'score')
WANT = 'a very soft, slow, sparse solo piano piece, intimate and melancholy, film score'
NOT = ['a pop song with vocals', 'a drum beat', 'a choir singing', 'an epic orchestral piece', 'a bright happy piano piece']
out = {}
for f in sorted(glob.glob(os.path.join(D, 'T*.mp3')) + glob.glob(os.path.join(D, 'T*.wav'))):
    tid = os.path.splitext(os.path.basename(f))[0]
    y, sr = librosa.load(f, sr=22050, mono=True)
    tune = float(librosa.estimate_tuning(y=y, sr=sr, bins_per_octave=36)) * 100
    rms = librosa.feature.rms(y=y, frame_length=sr * 5, hop_length=sr * 5)[0]
    env = [round(float(20 * np.log10(max(r, 1e-6))), 1) for r in rms]
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr).mean(axis=1)
    key = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][int(np.argmax(chroma))]
    d = api.describe(f); m = api.match(f, WANT, alts=NOT)
    ds = d.get('summary', '') if isinstance(d, dict) else str(d); ms = m.get('summary', '') if isinstance(m, dict) else str(m)
    tags = ds[ds.find('AudioSet'):].split('.')[0] if 'AudioSet' in ds else ''
    vocal = any(w in tags for w in ('Singing', 'Speech', 'Choir', 'Vocal', 'Humming', 'Drum'))
    fc = ms[ms.find('Forced choice'):ms.find('It sounds')].strip() if 'Forced choice' in ms else ms[:200]
    out[tid] = dict(dur_s=round(len(y) / sr, 2), tune_cents=round(tune, 1), strongest_pitch_class=key, vocal_or_drum_tag=vocal,
                    rms_db_5s=env, audioset=tags, describe=ds, forced_choice=fc)
    print(f"{tid} {len(y) / sr:6.1f}s tune {tune:+5.1f}c pc {key} {'FLAG ' if vocal else ''}{tags[:90]}\n   env {env}\n   {fc[:220]}\n   {ds[:260]}", flush=True)
json.dump(out, open(os.path.join(D, 'check.json'), 'w'), indent=1)
