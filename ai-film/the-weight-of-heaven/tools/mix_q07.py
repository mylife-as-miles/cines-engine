#!/usr/bin/env python3
"""Q07's sound, made here: no part of the take's own sound is used. Local work only.

    /root/leonxlnx/earshot/.venv/bin/python tools/mix_q07.py
        ->  out/edits/Q07_t1_fixed_mix.wav, out/review/Q07_t1_fixed.mp4 (the mended picture with this sound)

The take's sound has a woman's voice reading the prompt's sound notes aloud for its first eleven seconds; the author
(26 November): "remove that narration". A voice cannot be lifted cleanly out of wind and drone here, and this is a music
montage whose sound is rebuilt in any case, so the reel gets a soundtrack of its own, on the mended picture's clock
(tools/fix_q07_t1.py). The song will be laid over it in the edit.

  wind     the wind at altitude and the wind of the vale (audio/sfx, as used in movement I): open in shots 1 and 3,
           heard through the pilothouse wall in shot 2, the vale's wind at the wall and in Sarn Vale.
  hum      the mass above: band-limited noise at 35-75 Hz with a slow swell, low, in shots 1 to 3 and fainter at the wall.
  timber   the cutter's wood: creaks made locally with Stable Audio (audio/sfx/q07/timber.flac; the ear-model: "a wood
           creak"), two in shot 2 and one in shot 3.
  grass    wind in long grass at the wall (audio/sfx/q07/grass.flac; "a gust of wind rushing past").
  wings    the crow, from its first frame until it stops flying (audio/sfx/q07/wings_c.flac; "a bird flapping its wings";
           two other takes read as a struck match and as a stick swung, and are not kept).
  thud     where it lands (audio/sfx/q07/thud.flac; "an apple falling on grass").
Not made: sheep or a dog for Sarn Vale. Two takes read as a whistling kettle and as a cow and a cat.
"""
import json, os, subprocess
import numpy as np
import soundfile as sf
from scipy import signal, ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
SR = 48000
CLOCK_FILE = os.environ.get('Q07_CLOCK', 'out/edits/Q07_t1_fixed.json')       # Q07_CLOCK=out/edits/Q07_reel_v2.json for the reel with the pickup's shots
CLOCK = json.load(open(P(CLOCK_FILE)))
S = CLOCK['shots_seconds'] + [CLOCK['seconds']]
N = int(round(CLOCK['seconds'] * SR))
lin = lambda d: 10 ** (d / 20.0)
db = lambda v: 20 * np.log10(v + 1e-9)


def read(name):
    x, sr = sf.read(P('audio/sfx', name), always_2d=True); assert sr == SR
    return (np.repeat(x, 2, 1) if x.shape[1] == 1 else x).astype(np.float32)


def filt(x, kind, fc, order=2):
    return signal.sosfiltfilt(signal.butter(order, fc, kind, fs=SR, output='sos'), x, axis=0).astype(np.float32)


def rms_to(x, level):
    return x * lin(level - db(np.sqrt((x.mean(1) ** 2).mean())))


def bed(x, off=0.0):
    i = int(off * SR); reps = int(np.ceil((N + i) / len(x)))
    return np.concatenate([x] * reps)[i:i + N]


def window(a, b, ramp=0.03):
    """1 between a and b seconds, with short ramps: the picture cuts hard, the sound a little softer."""
    t = np.arange(N) / SR
    return (np.clip((t - a) / ramp + 0.5, 0, 1) * np.clip((b - t) / ramp + 0.5, 0, 1)).astype(np.float32)[:, None]


def place(dst, x, t, level=None, fin=0.005, fout=0.05):
    x = x.copy(); n1, n2 = int(fin * SR), int(fout * SR)
    x[:n1] *= np.linspace(0, 1, n1)[:, None]; x[-n2:] *= np.linspace(1, 0, n2)[:, None]
    if level is not None:
        x = x * lin(level - db(np.abs(x).max()))
    i = int(t * SR); x = x[:max(0, N - i)]; dst[i:i + len(x)] += x


def main():
    alt, vale = read('wind_altitude.flac'), read('wind_vale.flac')
    stems = {}
    w = np.zeros((N, 2), np.float32)
    w += rms_to(bed(alt, 4.0), -31.0) * window(S[0], S[1])                         # shot 1: open air under the mass
    w += rms_to(filt(bed(alt, 9.0), 'lowpass', 2500), -35.0) * window(S[1], S[2])  # shot 2: through the pilothouse wall (at 900 Hz a listener took it for under water)
    w += rms_to(bed(alt, 15.0), -30.0) * window(S[2], S[3])                        # shot 3: on deck, moving
    w += rms_to(bed(vale, 2.0), -34.0) * window(S[3], S[4])                        # shot 4: at the wall
    w += rms_to(bed(vale, 8.0), -35.0) * window(S[4], S[5])                        # shot 5: Sarn Vale
    stems['wind'] = w
    rng = np.random.default_rng(7)
    h = filt(filt(rng.normal(0, 1, (N, 2)).astype(np.float32), 'lowpass', 75, 4), 'highpass', 35, 4)
    t = np.arange(N) / SR
    h = rms_to(h, -33.0) * (1 + 0.25 * np.sin(2 * np.pi * 0.13 * t))[:, None].astype(np.float32)
    stems['hum'] = h * (window(S[0], S[3], 0.2) + lin(-8.0) * window(S[3], S[4], 0.2))
    tim = read('q07/timber.flac'); e = ndimage.maximum_filter1d(np.abs(tim.mean(1)), SR // 50)
    pk, _ = signal.find_peaks(e, height=0.35 * e.max(), distance=int(0.7 * SR))
    creaks = [tim[max(0, p - int(0.15 * SR)):p + int(0.75 * SR)] for p in pk[:3]]
    c = np.zeros((N, 2), np.float32)
    for (at, lvl), seg in zip(((S[1] + 0.9, -22.0), (S[1] + 3.0, -25.0), (S[2] + 1.4, -27.0)), creaks):
        place(c, seg, at, lvl, fin=0.03, fout=0.2)
    stems['timber'] = c
    g = np.zeros((N, 2), np.float32); g += rms_to(bed(filt(read('q07/grass.flac'), 'highpass', 300), 0.3), -34.0) * window(S[3], S[4])
    stems['grass'] = g
    b = np.zeros((N, 2), np.float32)
    fly = (306 - 281) / 24.0                                                       # the crow flies from the cut to frame 306, then falls
    place(b, read('q07/wings_c.flac')[:int((fly + 0.05) * SR)], S[3] + 0.02, -17.0, fin=0.01, fout=0.05)
    place(b, read('q07/thud.flac')[:int(0.6 * SR)], S[3] + (331 - 281) / 24.0 - 0.01, -15.0, fin=0.002, fout=0.25)   # it reaches the grass 50 frames into the shot
    stems['bird'] = b
    mix = sum(stems.values())
    n = int(0.25 * SR); mix[-n:] *= np.linspace(1, 0, n)[:, None]
    base = os.path.basename(CLOCK_FILE)[:-5]
    wav = P('out/edits', base + '_mix.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    out = P('out/review', base + '.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', P('out/edits', base + '.mp4'), '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac',
                    '-b:a', '256k', '-movflags', '+faststart', out], check=True)
    info = {'file': 'out/review/' + base + '.mp4', 'seconds': CLOCK['seconds'], 'peak_dbfs': round(float(db(np.abs(mix).max())), 1),
            'rms_dbfs_by_shot': [round(float(db(np.sqrt((mix[int(a * SR):int(b2 * SR)].mean(1) ** 2).mean()))), 1) for a, b2 in zip(S, S[1:])],
            'stems_rms_dbfs': {k: round(float(db(np.sqrt((v.mean(1) ** 2).mean()))), 1) for k, v in stems.items()}, 'creaks_found': len(creaks)}
    json.dump(info, open(wav.replace('.wav', '.json'), 'w'), indent=1); print(info)


if __name__ == '__main__':
    main()
