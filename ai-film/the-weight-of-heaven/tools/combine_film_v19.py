#!/usr/bin/env python3
"""The film so far, cut v19: after the council, "Below" as a music montage on the song. Editing only.

    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v19.py
        ->  out/review/film_v19.mp4, out/edits/film_v19.wav, edit/film_v19.edl.json

The author, 27 November: "after the council scene this will be a music montage ... song like arcane"; on the song:
"The song... Now add it... And merge all to complie let me see how it turns out then I'll judge"; and "Remember it
starts after the council meeting".
On cut v18: "Why are you adding the old scenes here...": its montage held five one-beat images from before the
council. This cut's montage (out/edits/Below_montage_v2.mp4) holds only what happens after the council; nothing else
is changed.

  picture   cut v16's video stream (everything up to Cassiel alone at the door), copied without re-encoding. Then a
            straight cut to the montage (out/edits/Below_montage_v2.mp4, tools/below_montage.py), which already has the
            film's matte and encode settings. It takes the place of cut v17's five slow shots of Q07.
  sound     cut v17's mix up to the cut (the council's sound at full level to the cut, as cut v17 rebuilt it), out over
            its last 30 ms. The montage's sound begins on the cut: the song's drum drop lands 20 ms after the first
            frame.
"""
import json, os, subprocess, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
W, H, FPS, SR = 992, 432, 24, 48000


def run(*a):
    subprocess.run(list(a), check=True)


def main():
    old = json.load(open(P('edit/film_v16.edl.json'))); n16 = old['frames']
    mon = json.load(open(P('out/edits/Below_montage_v2.json'))); nm = mon['frames']
    out = P('out/review/film_v19.mp4'); a_mp4 = P('out/edits/_v19_a.mp4'); lst = P('out/edits/_v19.txt'); silent = P('out/edits/_v19_silent.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-i', P('out/review/film_v16.mp4'), '-map', '0:v', '-c:v', 'copy', '-an', a_mp4)
    open(lst, 'w').write(f"file '{a_mp4}'\nfile '{P('out/edits/Below_montage_v2.mp4')}'\n")
    run('ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', silent)
    n = n16 + nm; N16 = n16 * SR // FPS; N = n * SR // FPS
    v17, _ = sf.read(P('out/edits/film_v17.wav'), always_2d=True); v17 = v17.astype(np.float32)
    m, _ = sf.read(P('out/edits/Below_montage_v2.wav'), always_2d=True); m = m.astype(np.float32)
    assert len(m) == N - N16, (len(m), N - N16)
    mix = np.zeros((N, 2), np.float32); mix[:N16] = v17[:N16]
    r = int(0.03 * SR); mix[N16 - r:N16] *= np.cos(0.5 * np.pi * np.linspace(0, 1, r, dtype=np.float32))[:, None]     # the council's room out over the 30 ms before the cut
    mix[N16:] += m
    peak = float(np.abs(mix).max())
    wav = P('out/edits/film_v19.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    run('ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
        '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out)
    for f in (a_mp4, lst, silent):
        os.remove(f)
    got = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out],
                             capture_output=True, text=True).stdout.strip())
    if got != n:
        sys.exit(f'frame count {got}, expected {n}')
    mono = mix.mean(1); step = SR // 200
    jl = [round(float(20 * np.log10(np.sqrt((mono[N16 + i * step:N16 + (i + 1) * step] ** 2).mean()) + 1e-9)), 1) for i in range(-40, 60)]
    rec = {'file': 'out/review/film_v19.mp4', 'frames': n, 'seconds': round(n / FPS, 4), 'cut_v16_frames': n16, 'montage': mon['file'], 'montage_frames': nm,
           'montage_starts_at_frame': n16, 'montage_starts_at_s': round(n16 / FPS, 3), 'song': mon['song'], 'song_time_at_the_cut_s': mon['song_time_at_start_s'],
           'music_stops_at_s': round(n16 / FPS + mon['music_stops_at_s'], 3), 'montage_shots_start_at_s': [round((n16 + s) / FPS, 3) for s in mon['shots_start_frames']],
           'karst_lines_at_s': [[round(n16 / FPS + t, 2) for t in mon['voice_1_s']], [round(n16 / FPS + t, 2) for t in mon['voice_2_s']]],
           'join': 'straight cut; the council out over 30 ms; the song in on the cut', 'peak_dbfs': round(float(20 * np.log10(peak + 1e-9)), 2),
           'join_levels_dbfs_5ms_from_minus_200ms': jl}
    json.dump(rec, open(P('edit/film_v19.edl.json'), 'w'), indent=1)
    print({k: v for k, v in rec.items() if k != 'join_levels_dbfs_5ms_from_minus_200ms'})
    print('join, every 25 ms from 200 ms before the cut:', jl[::5])


if __name__ == '__main__':
    main()
