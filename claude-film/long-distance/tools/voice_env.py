#!/usr/bin/env python3
"""Mouth openness from the recorded takes, for the rig's lip sync.

For every line in audio/vo/voice_map.json this reads its trimmed take (audio/vo/L###.wav) and computes how open the
speaker's mouth should be at 12 drawings a second (characters animate on twos): RMS energy per 1/12 s window, in dB,
normalised per line between its noise floor and its loud syllables, smoothed with a fast attack and a slower release,
then quantised to four mouth steps:

    0 closed   1 parted   2 open   3 wide (rare: the loudest syllables)

The windows sample the audio 40 ms ahead of the picture, the animator's lead: a mouth that shapes a syllable a hair
before it is heard reads as in sync, one that shapes it after reads as late.

Lines the phone speaks (`as: 'phone'`) are written too, as empty lists, so the rig can tell them apart: the phone's
voice is never lip-synced to anyone.

Writes audio/voice_env.js:   window.FILM_VOICE_ENV = { L001: [], L002: [0,1,2,...], ... , _fps: 12 };

Usage: python3 tools/voice_env.py            (from claude-film/long-distance)
"""
import json
import os
import sys
import wave

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FPS = 12          # drawings per second (twos at 24 fps)
LEAD = 0.040      # s: the picture leads the sound
WIN = 1.15        # analysis window, in hops (a little overlap: syllables stay distinct)


def read_wav(path):
    with wave.open(path, 'rb') as w:
        n, ch, sw, sr = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
        raw = w.readframes(n)
    if sw == 2:
        x = np.frombuffer(raw, dtype='<i2').astype(np.float64) / 32768.0
    elif sw == 4:
        x = np.frombuffer(raw, dtype='<i4').astype(np.float64) / 2147483648.0
    elif sw == 1:
        x = (np.frombuffer(raw, dtype=np.uint8).astype(np.float64) - 128.0) / 128.0
    else:
        raise ValueError('unsupported sample width %d in %s' % (sw, path))
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    return x, sr


def envelope(x, sr, dur):
    """Mouth steps 0..3 at FPS for a take of `dur` seconds."""
    hop = sr / FPS
    win = int(hop * WIN)
    # remove DC and the lowest rumble (a one-pole high-pass at ~80 Hz) so breaths and room do not open the mouth
    a = np.exp(-2 * np.pi * 80.0 / sr)
    y = np.empty_like(x)
    prev_x = prev_y = 0.0
    for i, v in enumerate(x):
        prev_y = a * (prev_y + v - prev_x)
        prev_x = v
        y[i] = prev_y
    n = max(1, int(np.ceil(dur * FPS)))
    db = np.full(n, -90.0)
    for i in range(n):
        c = (i + 0.5) / FPS + LEAD
        a0, a1 = int(c * sr - win / 2), int(c * sr + win / 2)
        a0, a1 = max(0, a0), min(len(y), a1)
        if a1 - a0 < 16:
            continue
        seg = y[a0:a1]
        rms = np.sqrt(np.mean(seg * seg)) + 1e-9
        db[i] = 20 * np.log10(rms)
    voiced = db[db > -70]
    if voiced.size == 0:
        return [0] * n
    floor = max(np.percentile(voiced, 12), voiced.max() - 42)      # the room between words
    loud = np.percentile(voiced, 96)                                # the loud syllables
    if loud - floor < 6:
        loud = floor + 6
    v = np.clip((db - floor) / (loud - floor), 0.0, 1.15)
    # syllable contrast: subtract part of the slow average, so a long loud phrase still opens and closes per syllable
    k = 5
    pad = np.pad(v, (k // 2, k // 2), mode='edge')
    slow = np.convolve(pad, np.ones(k) / k, mode='valid')[:n]
    v = np.clip(0.7 * v + 0.95 * (v - slow) + 0.06, 0.0, 1.2)
    # fast attack, a quick release (jaws open quickly and fall shut between syllables)
    sm = np.zeros(n)
    cur = 0.0
    for i in range(n):
        target = v[i]
        cur = cur + (target - cur) * (0.9 if target > cur else 0.7)
        sm[i] = cur
    steps = []
    for i, s in enumerate(sm):
        if s < 0.22:
            q = 0
        elif s < 0.5:
            q = 1
        elif s < 0.9:
            q = 2
        else:
            q = 3
        steps.append(q)
    # a mouth never pops to wide from shut in one drawing, and the take ends closed
    for i in range(1, n):
        if steps[i] - steps[i - 1] > 2:
            steps[i] = steps[i - 1] + 2
    if n:
        steps[-1] = 0
    return steps


def main():
    vm_path = os.path.join(ROOT, 'audio', 'vo', 'voice_map.json')
    vm = json.load(open(vm_path))
    out = {}
    report = []
    for lid in sorted(vm):
        e = vm[lid]
        if e.get('as') == 'phone':
            out[lid] = []                                           # the phone is never lip-synced
            report.append('%s  phone  (no lip sync)' % lid)
            continue
        path = os.path.join(ROOT, e['file'])
        if not os.path.exists(path):
            print('missing take for %s: %s' % (lid, path), file=sys.stderr)
            continue
        x, sr = read_wav(path)
        dur = float(e.get('dur') or len(x) / sr)
        env = envelope(x, sr, dur)
        out[lid] = env
        hist = [env.count(k) for k in range(4)]
        report.append('%s  %-4s %5.2fs  %3d drawings  closed/parted/open/wide %s  %s' % (lid, e['speaker'], dur, len(env), hist, ''.join('_.oO'[k] for k in env)))
    js = ('/* Mouth openness per voiced line, 12 drawings a second (generated by tools/voice_env.py from the takes in audio/vo).\n'
          '   0 closed, 1 parted, 2 open, 3 wide. The phone\'s lines are empty: the phone is never lip-synced. Read with RIG.mouthFor(id, t). */\n'
          'window.FILM_VOICE_ENV = ' + json.dumps(dict(out, _fps=FPS), separators=(',', ':')) + ';\n')
    dst = os.path.join(ROOT, 'audio', 'voice_env.js')
    with open(dst, 'w') as f:
        f.write(js)
    print('\n'.join(report))
    print('wrote %s (%d lines)' % (os.path.relpath(dst, ROOT), len(out)))


if __name__ == '__main__':
    main()
