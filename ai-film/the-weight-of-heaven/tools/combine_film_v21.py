#!/usr/bin/env python3
"""The film so far, cut v21: a first cut of Q09 (the hall, the treaty) joined on after the yard. Editing only.

    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v21.py
        ->  out/review/film_v21.mp4, out/review/film_v21_hall.mp4 (from the yard to the end), out/edits/film_v21.wav,
            edit/film_v21.edl.json

Q09 take 1 (27 November, on the author's "Go") came back with its picture as asked and one fault in its words: in the
last shot Karst says a sentence that was not written ("The fire was always stone.", heard so by three listening passes,
six syllables by measurement) and the two written ones are missing. This first cut uses what is right and leaves the
wrong sentence out:

  picture   cut v20's video stream, copied. Then a straight cut to Q09: shot 1 (her profile at the slab, the reading),
            shot 2 (the wide: "until the fire is stone."), shot 3 (Karst opens the shutters: "It was stone within forty
            years."), shot 4 (Serath turns into the daylight: "We were chosen."), and of shot 5 only its silent end:
            Karst turns his head and looks at her. The take's own shot lengths; nothing re-timed; the film's matte.
  sound     the take's own sound, at the level it came at (its lines measure -22 to -23 dBFS, the yard's -23 to -24).
            "until the fire is stone." came back 9 dB under the reading and is lifted 4 dB. The take's effects (its
            shutters sound like stone grinding) are the model's and are to be rebuilt locally; not done here.

The opening profile is not registered onto the yard's last frame: her head came back at the right edge of the frame
(nose at about 70 % of the width; the yard's is at 48 %) and there is no picture to shift into.
"""
import io, json, os, subprocess, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
W, H, FPS, SR = 992, 432, 24, 48000
TAKE = 'out/takes/Q09_t1.mp4'
KEEP = [(0, 153), (153, 223), (223, 357), (357, 436), (516, 601)]      # frames of the take: shots 1 to 4 whole; shot 5 after its sentence
LIFT = (6.55, 9.15, 4.0)                                               # seconds in the take, dB: the wide's phrase


def run(*a):
    subprocess.run(list(a), check=True)


def main():
    v20 = json.load(open(P('edit/film_v20.edl.json'))); n20 = v20['frames']
    f = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', P(TAKE), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout, np.uint8).reshape(-1, H, W, 3)
    assert len(f) == 601, len(f)
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    out = P('out/review/film_v21.mp4'); a_mp4 = P('out/edits/_v21_a.mp4'); b_mp4 = P('out/edits/_v21_b.mp4'); lst = P('out/edits/_v21.txt'); silent = P('out/edits/_v21_silent.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-i', P('out/review/film_v20.mp4'), '-map', '0:v', '-c:v', 'copy', '-an', a_mp4)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                            '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709',
                            '-color_trc', 'bt709', '-video_track_timescale', '12288', b_mp4], stdin=subprocess.PIPE)
    n9 = 0
    for a, b in KEEP:
        for k in range(a, b):
            g = f[k].copy(); g[:top] = 0; g[top + band:] = 0
            enc.stdin.write(g.tobytes()); n9 += 1
    enc.stdin.close(); assert enc.wait() == 0
    open(lst, 'w').write(f"file '{a_mp4}'\nfile '{b_mp4}'\n")
    run('ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', silent)
    n = n20 + n9

    x, _ = sf.read(io.BytesIO(subprocess.run(['ffmpeg', '-v', 'error', '-i', P(TAKE), '-vn', '-ac', '2', '-ar', str(SR), '-f', 'wav', '-'], capture_output=True, check=True).stdout), always_2d=True)
    x = x.astype(np.float32); t = np.arange(len(x)) / SR
    g = 10 ** (LIFT[2] / 20 * np.clip(np.minimum(t - LIFT[0], LIFT[1] - t) / 0.15, 0, 1))
    x *= g.astype(np.float32)[:, None]
    q = int(0.02 * SR); parts = []
    for a, b in KEEP:
        seg = x[a * SR // FPS:b * SR // FPS].copy()
        if a not in (0, 153, 223, 357):                                 # only where this edit makes a cut of its own: a short fade either side
            seg[:q] *= np.linspace(0, 1, q)[:, None]
        parts.append(seg)
    parts[3][-q:] *= np.linspace(1, 0, q)[:, None]
    m9 = np.concatenate(parts); m9 = np.pad(m9, ((0, max(0, n9 * SR // FPS - len(m9))), (0, 0)))[:n9 * SR // FPS]
    m9[:int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
    e = int(0.4 * SR); m9[-e:] *= np.linspace(1, 0, e)[:, None]         # the film ends here for now
    old, _ = sf.read(P('out/edits/film_v20.wav'), always_2d=True); old = old.astype(np.float32)
    assert len(old) == n20 * SR // FPS
    mix = np.concatenate([old, m9]); peak = float(np.abs(mix).max())
    wav = P('out/edits/film_v21.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    run('ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
        '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out)
    for p in (a_mp4, b_mp4, lst, silent):
        os.remove(p)
    got = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out],
                             capture_output=True, text=True).stdout.strip())
    if got != n:
        sys.exit(f'frame count {got}, expected {n}')
    run('ffmpeg', '-v', 'error', '-y', '-ss', '139.5', '-i', out, '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '224k',
        '-movflags', '+faststart', P('out/review/film_v21_hall.mp4'))
    starts = np.cumsum([0] + [b - a for a, b in KEEP])[:-1]
    rec = {'file': 'out/review/film_v21.mp4', 'frames': n, 'seconds': round(n / FPS, 4), 'cut_v20_frames': n20, 'q09_take': TAKE, 'q09_starts_at_s': round(n20 / FPS, 3),
           'q09_kept_frames_of_take': KEEP, 'q09_shots_start_at_s': [round((n20 + int(s)) / FPS, 3) for s in starts], 'q09_frames': n9,
           'left_out': 'shot 5, 18.17 to 21.5 s of the take: Karst says a sentence that was not written', 'lift_db': {'from_s': LIFT[0], 'to_s': LIFT[1], 'db': LIFT[2]},
           'peak_dbfs': round(float(20 * np.log10(peak + 1e-9)), 2)}
    json.dump(rec, open(P('edit/film_v21.edl.json'), 'w'), indent=1); print(rec)


if __name__ == '__main__':
    main()
