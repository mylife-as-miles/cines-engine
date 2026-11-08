"""The soundtrack of the opening: music by Osita Miles under the narration.

    python tools/mix.py [working|final]

Cyning Slieht opens under the studio card and carries the chronicle; La Felure Demeure rises under it and carries the
rest, its dip on the YEAR 33 card and its last swell under the title. The music ducks under
the voice (sidechain compression), and the whole is levelled to -16 LUFS. Writes audio/intro-mix.m4a (and a .wav).
Needs numpy and soundfile, and ffmpeg on the path.
"""
import json, os, subprocess, sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SET = sys.argv[1] if len(sys.argv) > 1 else ('final' if os.path.exists(os.path.join(ROOT, 'narration/final/lines.json')) else 'working')
SR = 48000

place = json.load(open(os.path.join(ROOT, f'narration/{SET}/placement.json')))
_tl = open(os.path.join(ROOT, 'film', 'timeline.js')).read()
TL = json.loads(_tl[_tl.index('=') + 1:_tl.rindex(';')])
CUE = {l['id']: l for s_ in TL['scenes'] for l in s_['lines']}
SC = {s_['n']: s_ for s_ in TL['scenes']}
# music by Osita Miles: Cyning Slieht opens and carries the story; La Felure Demeure rises under it and takes over, placed
# so that its dip (147 s into the track) falls on the YEAR 33 card and its last swell under the title. Both sit low, under
# the voice, and duck further while it speaks.
LF = TL['year33'][0] - 147.0 + 0.4
MUSIC = [  # file, where it starts in the film (s), gain, volume shaping over film time
    ('audio/cyning-slieht.mp3', 0.0, 0.36, f"(0.45+0.55*min(1,max(0,(t-6)/3)))*(1-min(1,max(0,(t-{LF + 3.0:.2f})/10)))"),
    ('audio/la-felure-demure.mp3', LF, 0.40, "min(1,t/5)"),
]


def at_time(at):
    if 'studio' in at: return TL['studio'][0] + at['studio']
    if 'year33' in at: return TL['year33'][0] + at['year33']
    if 'title' in at: return TL['title'][0] + at['title']
    if 'scene' in at: return SC[at['scene']]['start'] + at.get('offset', 0)
    c = CUE[at['cue']]
    return (c['start'] if at.get('edge', 'start') == 'start' else c['end']) + at.get('offset', 0)


def wav_dur(path):
    return sf.info(path).duration


# sound effects: the designed ones (audio/sfx_sa, Stable Audio, from tools/stable_sfx.py, placed by audio/sfx_plan.json)
# once they exist; until then the code-made ones (audio/sfx, from tools/sfx.py)
SFX = []
plan = json.load(open(os.path.join(ROOT, 'audio', 'sfx_plan.json')))
for snd in plan['sounds']:
    path = os.path.join(ROOT, 'audio', 'sfx_sa', snd['id'] + '.wav')
    if not os.path.exists(path):
        continue
    t0 = at_time(snd['at'])
    if snd.get('align') == 'end':
        t0 -= wav_dur(path)
    SFX.append((path, max(0.0, t0), snd.get('gain', 0.5)))
if not SFX:
    SFX = [(os.path.join(ROOT, 'audio', 'sfx', n + '.wav'), t, g) for n, t, g in [
        ('pen', 0.5, 0.32), ('tear', CUE['L04']['start'] + 2.0, 0.5), ('crack', CUE['L06']['start'] + 0.35, 0.4),
        ('shatter', CUE['L06']['start'] + 2.0, 0.62), ('boom', CUE['L06']['start'] + 2.0, 0.5), ('wind', SC[4]['start'] - 0.5, 0.26),
        ('fire', SC[7]['start'] - 0.2, 0.36), ('swell', TL['title'][0] - 2.0, 0.42), ('boom', TL['title'][0] + 1.9, 0.42)]]
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
for f, _, _, _ in MUSIC:
    args += ['-i', os.path.join(ROOT, f)]
args += ['-i', vpath]
for path, _, _ in SFX:
    args += ['-i', path]
parts = []
for i, (_, start, gain, shape) in enumerate(MUSIC):
    d = int(start * 1000)
    parts.append(f"[{i}:a]aresample={SR},aformat=channel_layouts=stereo,volume='{gain}*{shape}':eval=frame,adelay={d}|{d}[m{i}]")
n = len(MUSIC)
parts.append(''.join(f'[m{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0:duration=longest[mus]')
parts.append(f'[{n}:a]aformat=channel_layouts=stereo,asplit=2[v1][v2]')
parts.append('[mus][v1]sidechaincompress=threshold=0.012:ratio=12:attack=30:release=700:knee=4,asplit=2[duck][duckst]')
for j, (path, at, gain) in enumerate(SFX):
    d = int(at * 1000)
    parts.append(f'[{n + 1 + j}:a]aresample={SR},aformat=channel_layouts=stereo,volume={gain},adelay={d}|{d}[s{j}]')
parts.append(''.join(f'[s{j}]' for j in range(len(SFX))) + f'amix=inputs={len(SFX)}:normalize=0:duration=longest[sfx]')
parts.append(f'[duck][v2][sfx]amix=inputs=3:normalize=0:weights=1 1.25 1,atrim=0:{total:.3f},afade=t=in:st=0:d=1.2,afade=t=out:st={total - 3.0:.3f}:d=3.0,loudnorm=I=-16:TP=-1.5:LRA=11[out]')
out_wav = os.path.join(ROOT, 'out', 'intro-mix.wav')
music_stem = os.path.join(tmp, 'music_ducked.wav')
subprocess.run(args + ['-filter_complex', ';'.join(parts), '-map', '[out]', '-ar', str(SR), out_wav, '-map', '[duckst]', '-ar', str(SR), music_stem], check=True)
# how far the music sits under the voice while it speaks (median over the lines, RMS in dB)
mus, _ = sf.read(music_stem, dtype='float32'); mus = mus.mean(1) if mus.ndim > 1 else mus
gaps = []
for ln in place['lines']:
    a, b = int(ln['start'] * SR), int(ln['end'] * SR)
    v, m = voice[a:b], mus[a:b]
    if len(v) and len(m):
        gaps.append(10 * np.log10((np.mean(v ** 2) + 1e-12) / (np.mean(m ** 2) * 1.25 ** -2 + 1e-12)))
print(f'music under the voice while it speaks: median {np.median(gaps):.1f} dB, least {np.min(gaps):.1f} dB')
out_m4a = os.path.join(ROOT, 'audio', 'intro-mix.m4a')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out_wav, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out_m4a], check=True)
print(f'mixed {SET} narration with {len(MUSIC)} tracks: {total:.1f} s -> {out_m4a} ({os.path.getsize(out_m4a)} bytes)')
