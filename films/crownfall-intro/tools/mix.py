"""The soundtrack of the opening: music by Osita Miles under the narration.

    python tools/mix.py [working|final]

Le Roi Muet ("the mute king") opens under the studio card and the Hollow King; its loud passage carries the crown's
shattering and the First-Born, and its quiet tail falls on "The Seven promised order". La Felure Demure enters under
it and carries the rest; its dip lands on the YEAR 33 card and its last swell under the title. The music ducks under
the voice (sidechain compression), and the whole is levelled to -16 LUFS. Writes audio/intro-mix.m4a (and a .wav).
Needs numpy and soundfile, and ffmpeg on the path.
"""
import json, os, subprocess, sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SET = sys.argv[1] if len(sys.argv) > 1 else ('final' if os.path.exists(os.path.join(ROOT, 'narration/final/lines.json')) else 'working')
MUSIC = [  # file, where it starts in the film (s), gain
    ('audio/le-roi-muet.mp3', 2.0, 0.62),
    ('audio/la-felure-demure.mp3', 138.0, 0.66),
]
SR = 48000

place = json.load(open(os.path.join(ROOT, f'narration/{SET}/placement.json')))
total = place['total']
voice = np.zeros(int(total * SR) + SR, dtype=np.float32)
for ln in place['lines']:
    wav, sr = sf.read(os.path.join(ROOT, f'narration/{SET}', ln['file']), dtype='float32')
    if wav.ndim > 1:
        wav = wav.mean(1)
    if sr != SR:  # resample by linear interpolation (the takes are speech; this is plenty)
        n = int(len(wav) * SR / sr)
        wav = np.interp(np.linspace(0, len(wav) - 1, n), np.arange(len(wav)), wav).astype(np.float32)
    a = int(ln['start'] * SR)
    voice[a:a + len(wav)] += wav[:max(0, len(voice) - a)]
peak = float(np.max(np.abs(voice))) or 1.0
voice *= 0.89 / peak
tmp = os.path.join(ROOT, 'out', 'mix_tmp'); os.makedirs(tmp, exist_ok=True)
vpath = os.path.join(tmp, 'voice.wav'); sf.write(vpath, voice, SR, subtype='PCM_16')

args = ['ffmpeg', '-y', '-loglevel', 'error']
for f, _, _ in MUSIC:
    args += ['-i', os.path.join(ROOT, f)]
args += ['-i', vpath]
parts = []
for i, (_, start, gain) in enumerate(MUSIC):
    d = int(start * 1000)
    parts.append(f'[{i}:a]aresample={SR},aformat=channel_layouts=stereo,volume={gain},adelay={d}|{d}[m{i}]')
n = len(MUSIC)
parts.append(''.join(f'[m{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0:duration=longest[mus]')
parts.append(f'[{n}:a]aformat=channel_layouts=stereo,asplit=2[v1][v2]')
parts.append('[mus][v1]sidechaincompress=threshold=0.02:ratio=7:attack=40:release=650:knee=4[duck]')
parts.append(f'[duck][v2]amix=inputs=2:normalize=0:weights=1 1.25,atrim=0:{total:.3f},afade=t=in:st=0:d=1.2,afade=t=out:st={total - 3.0:.3f}:d=3.0,loudnorm=I=-16:TP=-1.5:LRA=11[out]')
out_wav = os.path.join(ROOT, 'out', 'intro-mix.wav')
subprocess.run(args + ['-filter_complex', ';'.join(parts), '-map', '[out]', '-ar', str(SR), out_wav], check=True)
out_m4a = os.path.join(ROOT, 'audio', 'intro-mix.m4a')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out_wav, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out_m4a], check=True)
print(f'mixed {SET} narration with {len(MUSIC)} tracks: {total:.1f} s -> {out_m4a} ({os.path.getsize(out_m4a)} bytes)')
