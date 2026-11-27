#!/usr/bin/env python3
"""The film so far, cut v22: the silent pictures of Q10 take 1 laid on after the first cut of Q09. Editing only.

    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v22.py
        ->  out/review/film_v22.mp4, out/review/film_v22_hall.mp4 (from the yard to the end), out/edits/film_v22.wav,
            edit/film_v22.edl.json

Q10 take 1 (27 November, on the author's "Go") failed on its words: all three phrases spoken in it are a sentence that
was not written ("The world is a lie.", heard so by three transcription models; five syllables by measurement), and
its first shot did not open on its first frame. Three of its pictures are sound and have no speech in them:

  the lamp   Karst's hand, the brass lamp on the floor, the papers under their stones, Serath far off at the opening
             (5.04 to 9.92 s of the take)
  the shard  on the last sheet, a little dust under it, the red wax (16.0 to 20.04 s)
  Serath     her face in the dark, her eyes down, then lifting (20.17 to 23.2 s, before she speaks)

They are laid on after cut v21 in that order, with the take's own sound (no speech in these stretches). No line of
Q10 is in the film: "You were sheltered. By then you had gardens.", "I drew where each one would fall. You sealed
them." and "The marriage bell." are still to be had.
"""
import io, json, os, subprocess, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
W, H, FPS, SR = 992, 432, 24, 48000
TAKE = 'out/takes/Q10_t1.mp4'
KEEP = [(121, 238), (384, 481), (484, 556)]                           # frames of the take: the lamp; the shard; Serath before she speaks
LIFT = (0.0, 0.0, 0.0)


def run(*a):
    subprocess.run(list(a), check=True)


def main():
    v20 = json.load(open(P('edit/film_v21.edl.json'))); n20 = v20['frames']
    f = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', P(TAKE), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout, np.uint8).reshape(-1, H, W, 3)
    assert len(f) == 601, len(f)
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    out = P('out/review/film_v22.mp4'); a_mp4 = P('out/edits/_v22_a.mp4'); b_mp4 = P('out/edits/_v22_b.mp4'); lst = P('out/edits/_v22.txt'); silent = P('out/edits/_v22_silent.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-i', P('out/review/film_v21.mp4'), '-map', '0:v', '-c:v', 'copy', '-an', a_mp4)
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
        seg[:q] *= np.linspace(0, 1, q)[:, None]; seg[-q:] *= np.linspace(1, 0, q)[:, None]     # every cut here is this edit's own
        parts.append(seg)
    m9 = np.concatenate(parts); m9 = np.pad(m9, ((0, max(0, n9 * SR // FPS - len(m9))), (0, 0)))[:n9 * SR // FPS]
    m9[:int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
    e = int(0.4 * SR); m9[-e:] *= np.linspace(1, 0, e)[:, None]         # the film ends here for now
    old, _ = sf.read(P('out/edits/film_v21.wav'), always_2d=True); old = old.astype(np.float32)
    assert len(old) == n20 * SR // FPS
    mix = np.concatenate([old, m9]); peak = float(np.abs(mix).max())
    wav = P('out/edits/film_v22.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    run('ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
        '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out)
    for p in (a_mp4, b_mp4, lst, silent):
        os.remove(p)
    got = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out],
                             capture_output=True, text=True).stdout.strip())
    if got != n:
        sys.exit(f'frame count {got}, expected {n}')
    run('ffmpeg', '-v', 'error', '-y', '-ss', '139.5', '-i', out, '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '224k',
        '-movflags', '+faststart', P('out/review/film_v22_hall.mp4'))
    starts = np.cumsum([0] + [b - a for a, b in KEEP])[:-1]
    rec = {'file': 'out/review/film_v22.mp4', 'frames': n, 'seconds': round(n / FPS, 4), 'cut_v21_frames': n20, 'q10_take': TAKE, 'q10_starts_at_s': round(n20 / FPS, 3),
           'q10_kept_frames_of_take': KEEP, 'q10_shots_start_at_s': [round((n20 + int(s)) / FPS, 3) for s in starts], 'q10_frames': n9,
           'left_out': 'every stretch of the take with speech in it: all three spoken phrases are a sentence that was not written',
           'peak_dbfs': round(float(20 * np.log10(peak + 1e-9)), 2)}
    json.dump(rec, open(P('edit/film_v22.edl.json'), 'w'), indent=1); print(rec)


if __name__ == '__main__':
    main()
