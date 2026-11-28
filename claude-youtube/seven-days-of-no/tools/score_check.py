"""Listen to every music take with earshot before it goes in the video, and measure its tuning, key, tempo and shape.

  /home/user/leonxlnx/earshot/.venv/bin/python tools/score_check.py [T1 T3 ...]     -> audio/score/check.json

Adapted from claude-film/long-distance/tools/score_check.py. Per take (audio/score/T*.mp3): duration; tuning offset from
A440 in cents (librosa; tools/build_mix.py removes it via the bed's tune_cents); the strongest pitch class and a
Krumhansl key estimate (the beds must share C major / A minor to crossfade cleanly); tempo; earshot's description and
AudioSet tags (singing, speech, a choir or a drum kit would rule a take out); a forced choice against what the take's
role must be and must not be; the loudness envelope in 5 s steps (where it breathes, where it ends) and, for the
closing take, where its final chord dies away.
"""
import glob, json, os, sys
import numpy as np, librosa
from earshot import api

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'audio', 'score')
PLAN = json.load(open(os.path.join(ROOT, 'audio', 'score_plan.json')))
ROLE = {t['id']: t.get('role', 'main') for t in PLAN['takes']}
WANT = {
    'main': 'light, cozy, playful background music with plucked ukulele, music box and glockenspiel, for an explainer video',
    'hush': 'soft, gentle, slightly melancholic fingerpicked guitar and music box, quiet and reflective',
    'lift': 'bright, happy, uplifting playful music with ukulele, pizzicato and glockenspiel',
    'end': 'light, cozy, playful music with ukulele and music box that ends on a final chord',
}
NOT = ['a pop song with vocals', 'a heavy drum beat', 'a choir singing', 'an epic orchestral piece', 'dark, tense suspense music',
       'electronic dance music']
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
PCS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def key_of(chroma):
    best = None
    for i in range(12):
        for name, prof in (('major', MAJ), ('minor', MIN)):
            r = float(np.corrcoef(chroma, np.roll(prof, i))[0, 1])
            if best is None or r > best[0]: best = (r, f'{PCS[i]} {name}')
    return best[1], round(best[0], 2)


ids = sys.argv[1:]
ck = os.path.join(D, 'check.json'); out = json.load(open(ck)) if os.path.exists(ck) else {}
files = sorted(glob.glob(os.path.join(D, 'T*.mp3')) + glob.glob(os.path.join(D, 'T*.wav')))
for f in files:
    tid = os.path.splitext(os.path.basename(f))[0]
    if ids and tid not in ids: continue
    role = ROLE.get(tid, 'main')
    y, sr = librosa.load(f, sr=22050, mono=True)
    tune = float(librosa.estimate_tuning(y=y, sr=sr, bins_per_octave=36)) * 100
    rms = librosa.feature.rms(y=y, frame_length=sr * 5, hop_length=sr * 5)[0]
    env5 = [round(float(20 * np.log10(max(r, 1e-6))), 1) for r in rms]
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, tuning=tune / 100).mean(axis=1)
    key, kr = key_of(chroma)
    tempo = float(np.atleast_1d(librosa.beat.beat_track(y=y, sr=sr)[0])[0])
    # where it ends: the last moment the 50 ms RMS is within 30 dB of the take's loud level, and where it falls 50 dB down
    r50 = librosa.feature.rms(y=y, frame_length=1103, hop_length=1103)[0]; db = 20 * np.log10(r50 + 1e-9); ref = np.percentile(db, 95)
    last_loud = float(np.max(np.where(db > ref - 20)[0]) * 0.05); dead = np.where(db > ref - 50)[0]; last_audible = float(dead.max() * 0.05)
    d = api.describe(f); m = api.match(f, WANT[role], alts=NOT)
    ds = d.get('summary', '') if isinstance(d, dict) else str(d); ms = m.get('summary', '') if isinstance(m, dict) else str(m)
    tags = ds[ds.find('AudioSet'):].split('.')[0] if 'AudioSet' in ds else ''
    flag = any(w in tags for w in ('Singing', 'Speech', 'Choir', 'Vocal', 'Humming', 'Drum kit', 'Rapping'))
    fc = ms[ms.find('Forced choice'):ms.find('It sounds')].strip() if 'Forced choice' in ms else ms[:240]
    out[tid] = dict(role=role, dur_s=round(len(y) / sr, 2), tune_cents=round(tune, 1), strongest_pitch_class=PCS[int(np.argmax(chroma))],
                    key=key, key_r=kr, tempo_bpm=round(tempo, 1), vocal_or_drumkit_tag=flag, last_loud_s=round(last_loud, 2),
                    last_audible_s=round(last_audible, 2), rms_db_5s=env5, audioset=tags, describe=ds, forced_choice=fc,
                    verdict=m.get('verdict') if isinstance(m, dict) else None)
    print(f"{tid} [{role}] {len(y) / sr:6.1f}s tune {tune:+5.1f}c key {key} ({kr}) {tempo:.0f} BPM "
          f"{'FLAG ' if flag else ''}ends loud {last_loud:.1f}s, audible {last_audible:.1f}s\n   {tags[:120]}\n   env {env5}\n   {fc[:300]}\n   {ds[:400]}", flush=True)
json.dump(out, open(ck, 'w'), indent=1)
