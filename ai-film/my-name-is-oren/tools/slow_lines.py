#!/usr/bin/env python3
"""Slow chosen spoken lines in a take, picture and voice together, so lip-sync holds; everything else plays as made.

    python3 tools/slow_lines.py out/takes/Q03a_t1.mp4 out/edits/Q03a_t1_slow.mp4 8.15:9.12:0.62 11.66:12.58:0.62

Each window is start:end:tempo (tempo below 1 slows). The voice is stretched with rubberband (pitch and formants kept)
and padded or trimmed to the exact new length; the picture is slowed by the same factor and motion-interpolated back
to 24 fps so it doesn't judder. Windows should sit inside one shot: the cut points are untouched.
"""
import subprocess, sys


def main(src, out, *wins):
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src],
                               capture_output=True, text=True).stdout)
    w = sorted(tuple(float(x) for x in s.split(':')) for s in wins)
    pieces, t = [], 0.0
    for a, b, k in w:
        if a > t:
            pieces.append((t, a, 1.0))
        pieces.append((a, b, k))
        t = b
    if t < dur:
        pieces.append((t, dur, 1.0))
    fc, labels = [], ''
    for i, (a, b, k) in enumerate(pieces):
        d = (b - a) / k
        if k == 1.0:
            fc.append(f'[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}]')
            fc.append(f'[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS[a{i}]')
        else:
            fc.append(f'[0:v]trim={a}:{b},setpts=(PTS-STARTPTS)/{k},minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:vsbmc=1,'
                      f'trim=0:{d:.4f},setpts=PTS-STARTPTS[v{i}]')
            fc.append(f'[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,rubberband=tempo={k}:formant=preserved:pitchq=quality,'
                      f'apad=whole_dur={d:.4f},atrim=0:{d:.4f}[a{i}]')
        labels += f'[v{i}][a{i}]'
    fc.append(f'{labels}concat=n={len(pieces)}:v=1:a=1[v][a]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter_complex', ';'.join(fc), '-map', '[v]', '-map', '[a]',
                    '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
                    '-movflags', '+faststart', out], check=True)
    new = sum((b - a) / k for a, b, k in pieces)
    print(f'{out}: {new:.2f} s (was {dur:.2f})')


if __name__ == '__main__':
    main(*sys.argv[1:])
