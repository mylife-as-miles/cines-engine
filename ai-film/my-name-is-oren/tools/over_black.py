#!/usr/bin/env python3
"""Build the over-black opening (A01-A03) from audio/over_black_plan.json:
audio/gen/over_black.wav (48 kHz stereo) and out/takes/black_open.mp4 (black picture, 854x480, 24 fps, with that sound),
which the edit spec puts first and fades from into Q01.

    python3 tools/over_black.py

Each layer is decoded through its own filter (and the plan's small-outdoor-speaker filter for the voices), set to its
level (LUFS over its length), panned with an equal-power law, and placed at its time. The whole fades up from silence,
thins before the picture arrives, and is limited at -1.5 dBFS.
"""
import json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(HERE, 'tools'))
from sound_mix import load, lufs, SR  # noqa: E402


def main():
    plan = json.load(open(os.path.join(HERE, 'audio', 'over_black_plan.json')))
    n = int(plan['dur'] * SR)
    out = np.zeros((n, 2), np.float32)
    for L in plan['layers']:
        af = ','.join(x for x in (L.get('af'), plan['speaker_af'] if L.get('speaker') else None) if x) or None
        y = load(os.path.join(HERE, L['file']), af)
        mono = y.mean(1)
        mono *= 10 ** ((L['level'] - lufs(np.stack([mono, mono], 1))) / 20)
        th = (L.get('pan', 0) + 1) * np.pi / 4
        y = np.stack([mono * np.cos(th), mono * np.sin(th)], 1) * np.sqrt(2)
        i = int(L['at'] * SR)
        k = min(len(y), n - i)
        if k > 0:
            out[i:i + k] += y[:k]
    t = np.arange(n) / SR
    env = np.clip(t / plan['fade_in'], 0, 1) ** 2
    thin = 10 ** (-plan['thin_db'] / 20)
    env *= np.where(t > plan['thin_from'], 1 + (thin - 1) * np.clip((t - plan['thin_from']) / (plan['dur'] - plan['thin_from']), 0, 1), 1)
    out *= env[:, None]
    peak = np.abs(out).max()
    if peak > 0.84:
        out *= 0.84 / peak
    wav = os.path.join(HERE, 'audio', 'gen', 'over_black.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', wav],
                   input=out.astype(np.float32).tobytes(), check=True)
    mp4 = os.path.join(HERE, 'out', 'takes', 'black_open.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f"color=c=black:s=854x480:r=24:d={plan['dur']}",
                    '-i', wav, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '256k',
                    '-ar', '48000', '-shortest', '-movflags', '+faststart', mp4], check=True)
    print('wrote audio/gen/over_black.wav and out/takes/black_open.mp4', f'({plan["dur"]} s, peak {20 * np.log10(np.abs(out).max() + 1e-9):.1f} dBFS)')


if __name__ == '__main__':
    main()
