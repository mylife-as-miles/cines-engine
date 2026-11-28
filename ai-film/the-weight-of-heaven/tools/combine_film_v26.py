#!/usr/bin/env python3
"""The film so far, cut v26: cut v25 as far as "We were chosen.", then Q10 take 2 playing whole. Editing only.

    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v26.py
        ->  out/review/film_v26.mp4, out/review/film_v26_hall.mp4 (from the end of the descent to the end),
            out/edits/film_v26.wav, edit/film_v26.edl.json

A separate version for the author to judge beside cut v25 (28 November: "Go" on Q10's second version). Nothing in the
take is cut, slowed, re-framed or re-graded: its four shots run as generated, with their own sound, every line on camera.

It takes the place of two things in cut v25: the silent shot of Karst turning at the shutters (what was saved of Q09's
last shot, whose words were wrong) and the three silent pictures from Q10's first take (the lamp, the shard, her face).
Everything before it is cut v25 unchanged: picture from the same sources, sound from the same file.
"""
import importlib.util, io, json, os, subprocess, sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfiltfilt

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('v25', P('tools/combine_film_v25.py')); v25 = importlib.util.module_from_spec(spec); spec.loader.exec_module(v25)
W, H, FPS, SR, N17 = v25.W, v25.H, v25.FPS, 48000, v25.N17
CUT = 4128                                                                 # cut v25's frame where Karst's silent shot began (the end of Serath's turn)
TAKE = 'out/takes/Q10_t2.mp4'


def main():
    run, grab = v25.run, v25.grab
    old = grab('out/review/film_v25.mp4', N17, CUT)                          # cut v25 from the yard to the end of "We were chosen."
    n_take = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', P(TAKE)],
                                capture_output=True, text=True).stdout.strip())
    take = grab(TAKE, 0, n_take).copy()
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    take[:, :top] = 0; take[:, top + band:] = 0                             # the film's 2.39 matte
    n = CUT + n_take
    out = P('out/review/film_v26.mp4'); a_mp4 = P('out/edits/_v26_a.mp4'); b_mp4 = P('out/edits/_v26_b.mp4'); lst = P('out/edits/_v26.txt'); silent = P('out/edits/_v26_silent.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-i', P('out/review/film_v17.mp4'), '-map', '0:v', '-c:v', 'copy', '-an', a_mp4)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                            '-c:v', 'libx264', '-crf', '13', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709',
                            '-color_trc', 'bt709', '-video_track_timescale', '12288', b_mp4], stdin=subprocess.PIPE)
    for fr in (old, take):
        enc.stdin.write(np.ascontiguousarray(fr).tobytes())
    enc.stdin.close(); assert enc.wait() == 0
    open(lst, 'w').write(f"file '{a_mp4}'\nfile '{b_mp4}'\n")
    run('ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', silent)
    # sound: cut v25's file to the cut, then the take's own sound, its voices set to the level of the voices before it
    a, sr = sf.read(P('out/edits/film_v22.wav'), always_2d=True); assert sr == SR; a = a.astype(np.float32)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', P(TAKE), '-vn', '-ac', '2', '-ar', str(SR), '-f', 'wav', '-'], capture_output=True, check=True).stdout
    t, _ = sf.read(io.BytesIO(raw), always_2d=True); t = t.astype(np.float32)
    S = lambda fr: int(round(fr * SR / FPS)); ic = S(CUT); L = S(n_take)
    t = np.concatenate([t, np.zeros((max(0, L - len(t)), 2), np.float32)])[:L]
    sp = butter(4, [300, 3400], btype='bandpass', fs=SR, output='sos')
    def voice_db(x, spans):
        y = sosfiltfilt(sp, x.mean(1)); return float(20 * np.log10(np.sqrt(np.mean(np.concatenate([y[int(s * SR):int(e * SR)] for s, e in spans]) ** 2)) + 1e-9))
    before = voice_db(a, [(166.55, 168.4), (170.9, 171.58)])                 # "It was stone within forty years." and "We were chosen." in cut v25
    after = voice_db(t, [(1.7, 2.45), (4.0, 5.05), (6.65, 8.25), (9.75, 10.4), (16.4, 17.3)])
    gain_db = float(np.clip(before - after, -6.0, 6.0)); t *= 10 ** (gain_db / 20)
    q = int(0.04 * SR); mix = np.zeros((ic + L, 2), np.float32)
    qo = int(0.15 * SR)                                                       # the room before the cut runs on 0.15 s under the take's first frames: no hole at the join
    head = a[:ic + qo].copy(); head[-qo:] *= np.linspace(1, 0, qo)[:, None]; mix[:ic + qo] += head
    w = int(0.14 * SR); patch = a[ic - int(0.40 * SR):ic - int(0.40 * SR) + w] * np.hanning(w)[:, None].astype(np.float32)   # cut v22 has a 20 ms hole just here: the room's own tone laid across it
    mix[ic - w // 2 + int(0.005 * SR):ic - w // 2 + int(0.005 * SR) + w] += patch
    t[:q] *= np.linspace(0, 1, q)[:, None]; t[-int(0.25 * SR):] *= np.linspace(1, 0, int(0.25 * SR))[:, None]; mix[ic:] += t
    peak = float(np.abs(mix).max()); wav = P('out/edits/film_v26.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    run('ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
        '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out)
    for p_ in (a_mp4, b_mp4, lst, silent):
        os.remove(p_)
    got = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out],
                             capture_output=True, text=True).stdout.strip())
    if got != n:
        sys.exit(f'frame count {got}, expected {n}')
    run('ffmpeg', '-v', 'error', '-y', '-ss', '137.0', '-i', out, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '224k',
        '-movflags', '+faststart', P('out/review/film_v26_hall.mp4'))
    rec = {'file': 'out/review/film_v26.mp4', 'frames': n, 'seconds': round(n / FPS, 4), 'is': 'cut v25 to the end of "We were chosen." (frame %d), then Q10 take 2 whole' % CUT,
           'take': TAKE, 'take_starts_at_s': round(CUT / FPS, 3), 'take_frames': n_take, 'take_gain_db': round(gain_db, 2),
           'voice_level_before_db': round(before, 1), 'voice_level_of_take_db': round(after, 1), 'peak_dbfs': round(float(20 * np.log10(peak + 1e-9)), 2),
           'excerpt': 'out/review/film_v26_hall.mp4', 'excerpt_starts_at_s': 137.0}
    json.dump(rec, open(P('edit/film_v26.edl.json'), 'w'), indent=1); print(json.dumps(rec))


if __name__ == '__main__':
    main()
