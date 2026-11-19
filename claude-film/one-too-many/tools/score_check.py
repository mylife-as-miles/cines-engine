"""Listen to every generated score cue with earshot before it goes in the film, and measure its tuning.

  <earshot venv>/bin/python tools/score_check.py      -> audio/score/check.json

Per cue: earshot's description and AudioSet tags (is there singing, speech, drums?), a match against the cue's role
(chamber underscore or the party record) with alternatives it must beat, loudness, and the tuning offset from A440 in
cents (librosa), which tools/score_place.py corrects so the only sound out of tune in the film is the Extra's.
"""
import json, os, glob
import numpy as np, librosa
from earshot import api

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'audio', 'score')
plan = {c['id']: c for c in json.load(open(os.path.join(ROOT, 'audio', 'score_plan.json')))['cues']}
QUERY = {'underscore': ('quiet, dark chamber string music for a film', ['a pop song with vocals', 'a drum beat', 'a choir singing', 'an orchestra trailer']),
         'source': ('mellow neo-soul electric piano jazz trio, background music at a dinner party', ['a pop song with vocals', 'a choir singing', 'a dark orchestral film score'])}
out = {}
for f in sorted(glob.glob(os.path.join(D, 'M*.mp3')) + glob.glob(os.path.join(D, 'M*.wav'))):
    cid = os.path.splitext(os.path.basename(f))[0]; c = plan.get(cid)
    if not c: continue
    y, sr = librosa.load(f, sr=22050, mono=True)
    tune = float(librosa.estimate_tuning(y=y, sr=sr, bins_per_octave=36)) * 100   # cents from A440
    d = api.describe(f); q, alts = QUERY['source' if c['role'] == 'source' else 'underscore']
    m = api.match(f, q, alts=alts)
    ds = d.get('summary', '') if isinstance(d, dict) else str(d); ms = m.get('summary', '') if isinstance(m, dict) else str(m)
    tags = ds[ds.find('AudioSet'):].split('.')[0] if 'AudioSet' in ds else ''
    vocal = any(w in tags for w in ('Singing', 'Speech', 'Choir', 'Vocal', 'Rapping', 'Humming'))
    fc = ms[ms.find('Forced choice'):ms.find('It sounds')].strip()
    out[cid] = dict(file=os.path.basename(f), dur_s=round(len(y) / sr, 2), tune_cents=round(tune, 1), vocal_tag=vocal,
                    audioset=tags, describe=ds, match=ms[:ms.find('Forced choice')].strip(), forced_choice=fc)
    print(f"{cid:5s} {len(y) / sr:6.1f}s  tune {tune:+5.1f} c  {'VOCAL? ' if vocal else ''}{tags[:70]}\n      {fc[:150]}", flush=True)
json.dump(out, open(os.path.join(D, 'check.json'), 'w'), indent=1)
