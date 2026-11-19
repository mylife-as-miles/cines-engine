"""The prologue's soundtrack: music by Osita Miles under three voices, with designed sounds.

    python tools/mix.py [final]

Le Roi Muet (the mute king) opens in the dark and carries the coup and the escape; Slay the Iron Slave takes over for
Cael's rise (the ford, the Muster); Krom Shahid (the martyr) enters with the road home and carries the fire; La Felure
Demure, the opening film's closing music, rises out of the black of the Stillmarch with its first swell under the
Chapter One title. The music ducks under the voices: an envelope drawn from the takes lowers it while a line is spoken
and lets it rise in every stretch without a voice; it also dips under the louder designed sounds. The voice in the dark
gets a cold, long reverb. The whole is levelled to -16 LUFS. Writes audio/prologue-mix.m4a (and out/prologue-mix.wav).
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
# music by Osita Miles (the Crownfall soundtrack): each track hands over under the end of the scene before
IS0 = SC[3]['end'] - 18.0          # Slay the Iron Slave: its quiet opening under the last of Ealdholt
KS0 = SC[6]['start'] - 1.0         # Krom Shahid: with the road home, through the fire
LF0 = SC[8]['start']               # La Felure Demure: out of the black; its first swell (16 s in) under the Chapter One title
KS_OUT = CUE['L41']['end'] - 1.0   # the fire's music leaves before the Stillmarch
MUSIC = [  # file, where it starts in the film (s), gain, volume shaping over film time
    ('audio/le-roi-muet.mp3', 0.0, 0.66, lambda t: 1 - np.clip((t - (IS0 + 6)) / 8, 0, 1)),
    ('audio/slay-the-iron-slave.mp3', IS0, 0.6, lambda t: np.clip((t - IS0) / 4, 0, 1) * (1 - np.clip((t - (KS0 + 1)) / 5, 0, 1))),
    ('audio/krom-shahid.mp3', KS0, 0.64, lambda t: np.clip((t - KS0) / 4, 0, 1) * (1 - np.clip((t - KS_OUT) / 5, 0, 1))),
    ('audio/la-felure-demure.mp3', LF0, 0.62, lambda t: np.clip((t - LF0) / 6, 0, 1)),
]
# the music rides the narration: full in every stretch without a voice, down by DUCK_DB while a line is spoken. Lines closer
# than MERGE seconds share one duck, so the music never pumps between them; it falls over ATTACK s before a line and comes
# back over RELEASE s after it.
DUCK_DB, MERGE, ATTACK, RELEASE, LEAD, TAIL_HOLD = -19.0, 1.4, 0.45, 1.1, 0.25, 0.2


def at_time(at):
    if 'title' in at: return SC[0]['title'][0] + at['title']       # the prologue title in the cold open
    if 'chapter' in at: return TL['chapter'][0] + at['chapter']
    if 'scene' in at: return SC[at['scene']]['start'] + at.get('offset', 0)
    c = CUE[at['cue']]
    return (c['start'] if at.get('edge', 'start') == 'start' else c['end']) + at.get('offset', 0)


def wav_dur(path):
    return sf.info(path).duration


# sound effects: the designed ones (audio/sfx_sa, Stable Audio, from tools/stable_sfx.py, placed by audio/sfx_plan.json)
# once they exist; until then the code-made ones (audio/sfx, from tools/sfx.py)
def loud_db(x, sr, w=0.4):
    """The level of the loudest 0.4 s of a sound, in dBFS (RMS): what the ear takes as how loud it is."""
    x = x.mean(1) if x.ndim > 1 else x
    n = int(w * sr); k = max(1, len(x) // n)
    return 20 * np.log10(np.sqrt((np.pad(x, (0, max(0, k * n - len(x))))[:k * n].reshape(k, -1) ** 2).mean(1)).max() + 1e-9)


# the voice's own level, as it sits in the mix (weighted 1.25 below): each designed sound is set against it
VREF = float(np.median([loud_db(*sf.read(os.path.join(ROOT, f'narration/{SET}', ln['file']), dtype='float32')) for ln in place['lines']])) + 20 * np.log10(1.25)
SFX, SFX_DUCK = [], []
plan = json.load(open(os.path.join(ROOT, 'audio', 'sfx_plan.json')))
for snd in plan['sounds']:
    path = os.path.join(ROOT, 'audio', 'sfx_sa', snd['id'] + '.wav')
    if not os.path.exists(path):
        continue
    t0 = at_time(snd['at'])
    if snd.get('align') == 'end':
        t0 -= wav_dur(path)
    gain = 10 ** ((VREF + snd['level'] - loud_db(*sf.read(path, dtype='float32'))) / 20) if 'level' in snd else snd.get('gain', 0.5)
    SFX.append((path, max(0.0, t0), round(gain, 4)))
    # the music gives way under a designed sound: most under the big hits, a little under details, not at all under beds
    lv = snd.get('level', -10)
    SFX_DUCK.append((path, max(0.0, t0), snd.get('duck', 8.0 if lv >= -6 else 5.0 if lv >= -9 else 3.0 if lv >= -12 else 0.0)))
if SFX:
    print(f'{len(SFX)} designed sounds set against the voice (its loudest 0.4 s at {VREF:.1f} dBFS)')
# sounds not generated yet are simply left out of this mix
total = place['total']
def reverb(x, rt=2.4, wet=0.42):
    """A cold, long room for the voice in the dark: decaying noise convolved by FFT, a little pre-delay, mixed under the dry voice."""
    n = int(rt * SR); r = np.random.default_rng(31)
    ir = (r.standard_normal(n) * np.exp(-6.9 * np.arange(n) / n)).astype(np.float32)
    ir = np.concatenate([np.zeros(int(0.03 * SR), np.float32), ir]); ir /= np.sqrt(np.sum(ir ** 2))
    m = len(x) + len(ir); f = 1 << (m - 1).bit_length()
    w = np.fft.irfft(np.fft.rfft(x, f) * np.fft.rfft(ir, f), f)[:m].astype(np.float32)
    y = np.concatenate([x, np.zeros(len(ir), np.float32)]) * (1 - wet) + w * wet * (np.max(np.abs(x)) / (np.max(np.abs(w)) + 1e-9))
    return y.astype(np.float32)


voice = np.zeros(int(total * SR) + SR, dtype=np.float32)
for ln in place['lines']:
    wav, sr = sf.read(os.path.join(ROOT, f'narration/{SET}', ln['file']), dtype='float32')
    if wav.ndim > 1:
        wav = wav.mean(1)
    if sr != SR:  # resample by linear interpolation (the takes are speech; this is plenty)
        n = int(len(wav) * SR / sr)
        wav = np.interp(np.linspace(0, len(wav) - 1, n), np.arange(len(wav)), wav).astype(np.float32)
    if ln.get('speaker') == 'voice':
        wav = reverb(wav)
    a = int(ln['start'] * SR)
    voice[a:a + len(wav)] += wav[:max(0, len(voice) - a)]
peak = float(np.max(np.abs(voice))) or 1.0
voice *= 0.89 / peak
tmp = os.path.join(ROOT, 'out', 'mix_tmp'); os.makedirs(tmp, exist_ok=True)
vpath = os.path.join(tmp, 'voice.wav'); sf.write(vpath, voice, SR, subtype='PCM_16')

N = len(voice)
tt = np.arange(N) / SR


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)


# the envelope from the narration
ducks = []
for ln in sorted(place['lines'], key=lambda l: l['start']):
    a, b = ln['start'] - LEAD, ln['end'] + TAIL_HOLD
    if ducks and a - ducks[-1][1] < MERGE:
        ducks[-1][1] = max(ducks[-1][1], b)
    else:
        ducks.append([a, b])
env_t = np.arange(0, total + 1, 0.01)
down = np.zeros_like(env_t)
for a, b in ducks:
    rise = np.clip((env_t - (a - ATTACK)) / ATTACK, 0, 1)
    fall = 1 - np.clip((env_t - b) / RELEASE, 0, 1)
    seg = np.minimum(rise, fall)
    down = np.maximum(down, seg * seg * (3 - 2 * seg))
duck_gain = 10 ** (DUCK_DB / 20)
env_v = 1 - down * (1 - duck_gain)
# and from the designed sounds: where one is loud the music dips by its 'duck' dB (from 0.08 s before, back over 0.6 s), so
# a sound in a gap, where the music is up, is heard and not swallowed; under the voice the music is already lower than that
red = np.zeros_like(env_t)
for path, t0, dB in SFX_DUCK:
    if dB <= 0:
        continue
    x, sr = sf.read(path, dtype='float32'); x = x.mean(1) if x.ndim > 1 else x
    hop = int(0.01 * sr); k = len(x) // hop
    r = np.sqrt(np.convolve((x[:k * hop].reshape(k, hop) ** 2).mean(1), np.ones(5) / 5, 'same')) + 1e-9
    e = np.clip((20 * np.log10(r / r.max()) + 12) / 12, 0, 1)
    held = e.copy()
    for i in range(1, len(held)):
        held[i] = max(e[i], held[i - 1] * np.exp(-0.01 / 0.6 * 4))
    held = np.concatenate([held, held[-1] * np.exp(-np.arange(1, 121) * 0.01 / 0.6 * 4)])
    ts = t0 - 0.08 + np.arange(len(held)) * 0.01
    red = np.maximum(red, dB * np.interp(env_t, ts, held, left=0, right=0))
env_s = 10 ** (-red / 20)
env = np.interp(tt, env_t, np.minimum(env_v, env_s)).astype(np.float32)
print(f'the music dips under {sum(1 for _, _, d in SFX_DUCK if d > 0)} designed sounds (up to {red.max():.0f} dB)')
music = np.zeros((N, 2), dtype=np.float32)
for f, start, gain, shape in MUSIC:
    x = decode(os.path.join(ROOT, f)); a = int(start * SR); n = min(len(x), N - a)
    if n <= 0:
        continue
    music[a:a + n] += x[:n] * (gain * shape(tt[a:a + n]))[:, None]
music *= env[:, None]
music[: int(1.2 * SR)] *= np.linspace(0, 1, int(1.2 * SR))[:, None]
mpath = os.path.join(tmp, 'music_bus.wav'); sf.write(mpath, music, SR, subtype='FLOAT')
# how far the music sits under the voice while it speaks (median over the lines, RMS in dB, voice weighted as in the mix)
gaps = []
mono = music.mean(1)
for ln in place['lines']:
    a, b = int(ln['start'] * SR), int(ln['end'] * SR)
    v, m = voice[a:b], mono[a:b]
    if len(v):
        gaps.append(10 * np.log10((np.mean((1.25 * v) ** 2) + 1e-12) / (np.mean(m ** 2) + 1e-12)))
free = 1 - down; print(f'music under the voice while it speaks: median {np.median(gaps):.1f} dB, least {np.min(gaps):.1f} dB; '
                      f'music at full in {np.mean(free > 0.95) * 100:.0f}% of the film')

args = ['ffmpeg', '-y', '-loglevel', 'error', '-i', mpath, '-i', vpath]
for path, _, _ in SFX:
    args += ['-i', path]
parts = ['[0:a]aformat=channel_layouts=stereo[mus]', '[1:a]aformat=channel_layouts=stereo[v]']
for j, (path, at, gain) in enumerate(SFX):
    d = int(at * 1000)
    parts.append(f'[{2 + j}:a]aresample={SR},aformat=channel_layouts=stereo,volume={gain},adelay={d}|{d}[s{j}]')
if SFX:
    parts.append(''.join(f'[s{j}]' for j in range(len(SFX))) + f'amix=inputs={len(SFX)}:normalize=0:duration=longest[sfx]')
    parts.append(f'[mus][v][sfx]amix=inputs=3:normalize=0:weights=1 1.25 1,atrim=0:{total:.3f},afade=t=out:st={total - 3.0:.3f}:d=3.0,loudnorm=I=-16:TP=-1.5:LRA=11[out]')
else:
    parts.append(f'[mus][v]amix=inputs=2:normalize=0:weights=1 1.25,atrim=0:{total:.3f},afade=t=out:st={total - 3.0:.3f}:d=3.0,loudnorm=I=-16:TP=-1.5:LRA=11[out]')
out_wav = os.path.join(ROOT, 'out', 'prologue-mix.wav')
subprocess.run(args + ['-filter_complex', ';'.join(parts), '-map', '[out]', '-ar', str(SR), out_wav], check=True)
out_m4a = os.path.join(ROOT, 'audio', 'prologue-mix.m4a')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out_wav, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out_m4a], check=True)
print(f'mixed {SET} narration with {len(MUSIC)} tracks: {total:.1f} s -> {out_m4a} ({os.path.getsize(out_m4a)} bytes)')
