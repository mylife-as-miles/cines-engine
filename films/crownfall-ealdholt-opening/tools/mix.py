"""The film's soundtrack: the music cue and the designed sounds, placed on the film's clock and brought to level.

    python tools/mix.py            -> out/mix.wav (48 kHz 24-bit) and audio/ealdholt-opening-mix.m4a (AAC 192k)

There is no voice in this film, so the music leads and the sounds sit under it.

  music   audio/music/pick.json names the chosen take and where it lies: 'offset' is the second of the take that
          falls on the film's first frame, 'gain' its level in dB, 'fade_in'/'fade_out' in seconds. It rings out and
          fades over the last seconds, as the picture does.
  sounds  audio/sfx_plan.json: each sound (audio/sfx_sa/<id>.wav, peak at -1 dBFS) gets its 'gain' and fades and
          starts at 'at'; one with 'peak' is placed so that its loudest moment falls there (the rise into the crane).
  level   the sum is measured and set to -16 LUFS integrated with a true peak under -1 dBTP (ffmpeg loudnorm, two
          passes, linear), the level of the game's other films.

Needs numpy and ffmpeg.
"""
import json, os, subprocess, sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SR = 48000
LENGTH = 30.0
TARGET_LUFS, TARGET_TP = -16.0, -1.0


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-af', f'aresample={SR}:resampler=soxr', '-f', 'f32le',
                          '-ac', '2', '-'], check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def fade(x, fin, fout):
    n = min(int(fin * SR), len(x))
    if n > 0:
        x[:n] *= (0.5 - 0.5 * np.cos(np.pi * np.arange(n) / n))[:, None]
    n = min(int(fout * SR), len(x))
    if n > 0:
        x[len(x) - n:] *= (0.5 + 0.5 * np.cos(np.pi * np.arange(1, n + 1) / n))[:, None]
    return x


def place(bus, x, at):
    i = int(round(at * SR))
    if i < 0:
        x, i = x[-i:], 0
    n = min(len(x), len(bus) - i)
    if n > 0:
        bus[i:i + n] += x[:n]


def main():
    plan = json.load(open(os.path.join(ROOT, 'audio', 'sfx_plan.json')))
    bus = np.zeros((int(LENGTH * SR), 2))
    report = []

    pick_path = os.path.join(ROOT, 'audio', 'music', 'pick.json')
    if os.path.exists(pick_path):
        pick = json.load(open(pick_path))
        m = decode(os.path.join(ROOT, 'audio', 'music', pick['file']))
        m = m[int(pick.get('offset', 0) * SR):][:int(LENGTH * SR)].copy()
        m = fade(m, pick.get('fade_in', 0.5), pick.get('fade_out', 2.4)) * 10 ** (pick.get('gain', 0) / 20)
        place(bus, m, 0)
        report.append(f"music  {pick['file']} from {pick.get('offset', 0):.2f} s at {pick.get('gain', 0):+.1f} dB")
    else:
        print('mix: no audio/music/pick.json yet: the mix will carry the sounds only', file=sys.stderr)

    for s in plan['sounds']:
        f = os.path.join(ROOT, 'audio', 'sfx_sa', s['id'] + '.wav')
        if not os.path.exists(f):
            print(f"mix: {s['id']} is not made yet, left out", file=sys.stderr)
            continue
        x = fade(decode(f), s.get('in', 0.0), s.get('out', 0.15)) * 10 ** (s['gain'] / 20)
        at = s['at']
        if 'peak' in s:   # its loudest 50 ms lands on 'peak'
            env = np.abs(x).max(axis=1)
            w = int(0.05 * SR)
            loud = int(np.argmax(np.convolve(env, np.ones(w) / w, 'same')))
            at = s['peak'] - loud / SR
        place(bus, x, at)
        report.append(f"{s['id']:16s} at {at:6.2f} s  {s['gain']:+.0f} dB  {len(x) / SR:.1f} s")

    os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
    raw = os.path.join(ROOT, 'out', 'mix-raw.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le',
                    raw], input=np.ascontiguousarray(bus, np.float32).tobytes(), check=True)
    # two-pass loudnorm: measure, then apply linearly
    spec = f'loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=14:print_format=json'
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', raw, '-af', spec, '-f', 'null', '-'], capture_output=True, text=True)
    measured = json.loads(r.stderr[r.stderr.rindex('{'):r.stderr.rindex('}') + 1])
    second = (f"loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=14:measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
              f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:offset={measured['target_offset']}:"
              f"linear=true:print_format=json")
    wav = os.path.join(ROOT, 'out', 'mix.wav')
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-y', '-i', raw, '-af', second, '-ar', str(SR), '-c:a', 'pcm_s24le', wav],
                       capture_output=True, text=True, check=True)
    final = json.loads(r.stderr[r.stderr.rindex('{'):r.stderr.rindex('}') + 1])
    m4a = os.path.join(ROOT, 'audio', 'ealdholt-opening-mix.m4a')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', m4a], check=True)
    print('\n'.join(report))
    print(f"before: {measured['input_i']} LUFS, true peak {measured['input_tp']} dBTP; "
          f"after: {final['output_i']} LUFS, true peak {final['output_tp']} dBTP -> {os.path.relpath(m4a, ROOT)}")


if __name__ == '__main__':
    main()
