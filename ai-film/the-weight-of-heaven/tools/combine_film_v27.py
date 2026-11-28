#!/usr/bin/env python3
"""The film so far, cut v27: Karst says his second line on camera, the song runs on under the talk, and the yard flows
into the hall through a wide of the hall. Editing only: every picture is from takes the film already has.

    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v27.py
        ->  out/review/film_v27.mp4, out/review/film_v27_full.mp4 (a smaller copy of the whole film),
            out/review/film_v27_hall.mp4 (from the end of the descent to the end), out/edits/film_v27.wav,
            edit/film_v27.edl.json

The author, 28 November, on cut v26, pointing at Serath's profile in the yard (2:32): "Please remove that shot and replace
it with that guy talking"; "I want the background music to continue, but now the volume should reduce whenever they are
talking ... It helps to stitch things together"; "I don't need you to like try and rush things. I need the whole thing to
flow. Like, how do they move from this point to this point? You can use with the videos here. I don't need us to generate
a new one ... think about how they do it in a short film".

PICTURE (three changes; everything else is cut v26 frame for frame)
  1  Serath's profile in the yard, and the 0.8 s of Karst before it, are out. In their place Karst is seen saying "We
     stopped carrying it." (3 s, Q08B take 2, frames 214 to 285, in the same framing as his silent shot): a moment before
     he speaks, the line on his own mouth, a second of him afterwards.
  2  The hall now opens on its wide (2.9 s, Q09's own wide shot, used a first time without words): the dark room, Serath
     at the slab, Karst at the shutters. Then her face at the slab as she reads, as before. A scene that opens on where
     we are, then goes close: the yard's dark doorway gives way to the dark room, and nobody has to be seen walking.
  3  Nothing else: no shot is shortened, slowed or re-framed.

SOUND
  The song no longer stops on its hit. From the hit it falls back and runs on, under the yard's two lines and through the
  hall to the end: about 17 dB under its full level between lines and about 25 dB under while anyone speaks, moving between the two over more than a second (lines close together count as one stretch, so it does not pump), where it is
  also rolled off above 1.2 kHz so that its sung words do not sit on the spoken ones. It comes up a little where nobody
  speaks and something is seen: the hall's wide, the shutters opening, the shard. After the last line it stays down and goes out over the last second.
  Karst's second line is now his own sync sound. The hall's room tone begins under the end of his shot.
"""
import importlib.util, io, json, os, subprocess, sys
import cv2
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfiltfilt

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)


def load(name):
    spec = importlib.util.spec_from_file_location(name, P('tools', name + '.py')); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


v25 = load('combine_film_v25'); mq, gb = v25.mq, v25.gb
W, H, FPS, SR, N17 = v25.W, v25.H, v25.FPS, 48000, v25.N17
T_IN, SONG_AT_T_IN, SONG_GAIN_DB, HIT = 118.9, 49.874, -3.0, 147.484           # as cut v20 laid the song
GAP_DB, TALK_DB, SEEN_DB = -17.0, -25.0, -13.0                                 # the song under the scene, against its full level


def main():
    run, grab = v25.run, v25.grab
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    def matte(fr):
        fr = np.array(fr); fr[:, :top] = 0; fr[:, top + band:] = 0; return fr
    # ---------------- picture
    v22 = lambda a, b: grab('out/review/film_v22.mp4', a, b)
    cutter = grab('out/review/film_v25.mp4', N17, N17 + 58)                 # the cutter over the wall, as cut v25 made it
    spear_watch, karst_close = v22(3377, 3475), v22(3516, 3629)             # the spear, the two watching; Karst silent, Serath close
    B2 = mq.frames('out/takes/Q08B_t2.mp4')
    talk = matte(np.asarray([mq.grade(mq.push(f, 485, 150, 1.5), gain=(1.12, 1.12, 1.14)) for f in B2[214:286]]))     # the framing and grade of his silent shot
    Q9 = grab('out/takes/Q09_t1.mp4', 0, 436); q9 = matte(Q9)
    chk = float(np.abs(q9[0].astype(np.int16) - v22(3692, 3693)[0].astype(np.int16)).mean()); assert chk < 2.5, chk          # the hall in cut v22 is the take as it came
    n_t2 = 433; t2 = matte(grab('out/takes/Q10_t2.mp4', 0, n_t2))
    seq = [('the cutter over the wall', cutter), ('the spear; the two watch', spear_watch), ('Karst; Serath close', karst_close),
           ('Karst: "We stopped carrying it."', talk), ('the hall, wide', q9[153:223]), ('her profile at the slab', q9[0:153]),
           ('the hall, wide', q9[153:223]), ('Karst opens the shutters', q9[223:357]), ('Serath: "We were chosen."', q9[357:436]), ('Q10 take 2, whole', t2)]
    starts = np.cumsum([0] + [len(s[1]) for s in seq]); n = N17 + int(starts[-1]); at = [N17 + int(s) for s in starts[:-1]]
    out = P('out/review/film_v27.mp4'); a_mp4 = P('out/edits/_v27_a.mp4'); b_mp4 = P('out/edits/_v27_b.mp4'); lst = P('out/edits/_v27.txt'); silent = P('out/edits/_v27_silent.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-i', P('out/review/film_v17.mp4'), '-map', '0:v', '-c:v', 'copy', '-an', a_mp4)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                            '-c:v', 'libx264', '-crf', '13', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709',
                            '-color_trc', 'bt709', '-video_track_timescale', '12288', b_mp4], stdin=subprocess.PIPE)
    for _, fr in seq:
        enc.stdin.write(np.ascontiguousarray(fr).tobytes())
    enc.stdin.close(); assert enc.wait() == 0
    open(lst, 'w').write(f"file '{a_mp4}'\nfile '{b_mp4}'\n")
    run('ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', silent)

    # ---------------- sound
    S = lambda fr: int(round(fr * SR / FPS)); T = lambda fr: fr / FPS
    N = S(n); mix = np.zeros((N, 2), np.float32); rms = lambda x: float(np.sqrt((x ** 2).mean()) + 1e-9); db = lambda d: 10 ** (np.asarray(d) / 20)
    def rd(path):
        x, sr = sf.read(P(path), always_2d=True); assert sr == SR, (path, sr)
        return (np.repeat(x, 2, 1) if x.shape[1] == 1 else x).astype(np.float32)
    def aud(path, a, b):
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{a:.4f}', '-t', f'{b - a:.4f}', '-i', P(path), '-vn', '-ac', '2', '-ar', str(SR), '-f', 'wav', '-'], capture_output=True, check=True).stdout
        return sf.read(io.BytesIO(raw), always_2d=True)[0].astype(np.float32)
    def lay(x, t, fin=0.03, fout=0.03):
        x = x.copy(); a, b = int(fin * SR), int(fout * SR)
        if a: x[:a] *= np.linspace(0, 1, a)[:, None]
        if b: x[-b:] *= np.linspace(1, 0, b)[:, None]
        i = int(round(t * SR)); x = x[:max(0, N - i)]; mix[i:i + len(x)] += x
    old = rd('out/edits/film_v22.wav'); v26 = rd('out/edits/film_v26.wav')
    tx = HIT + 0.02; xf = int(0.18 * SR); ix = int(tx * SR)                   # up to the hit it is the old mix: the song at full level, the yard's air
    head = old[:ix + xf].copy(); head[-xf:] *= np.linspace(1, 0, xf)[:, None]; mix[:ix + xf] += head
    # the yard's air, as cut v20 made it, running on to the end of Karst's shot
    t_hall = T(at[4]); M20 = S(332); Lb = int((t_hall + 0.6 - 140.0) * SR)
    def bed(name, level_db, lo=None):
        x = rd('audio/sfx/' + name)[SR // 2:]
        if lo: x = sosfiltfilt(butter(2, lo, btype='lowpass', fs=SR, output='sos'), x, axis=0).astype(np.float32)
        return x[:Lb] * (db(level_db) / rms(x[:M20]))
    yard = bed('wind_vale.flac', -33.0, lo=3500) + bed('crowd_presence.flac', -41.0)
    i0 = ix - S(N17); y = yard[i0:].copy(); y[:xf] *= np.linspace(0, 1, xf)[:, None]; lay(y, tx, fin=0, fout=1.0)
    hp = butter(2, 110, btype='highpass', fs=SR, output='sos')
    v1 = sosfiltfilt(hp, aud('out/takes/Q08B_t2.mp4', 5.58, 7.62), axis=0).astype(np.float32); t_v1 = 147.904; lay(v1, t_v1)       # "We did not attack your city, Admiral.", where it was
    t_talk = T(at[3]); v2 = sosfiltfilt(hp, aud('out/takes/Q08B_t2.mp4', 214 / FPS, 286 / FPS), axis=0).astype(np.float32); lay(v2, t_talk, fin=0.08, fout=0.25)   # his own sound, in sync
    # the hall: its room tone begins under the end of his shot and carries the wide; then cut v26's own sound from the hall on
    x9 = aud('out/takes/Q09_t1.mp4', 23.75, 24.45); nfft = 4096
    spec = np.mean([np.abs(np.fft.rfft(x9[i:i + nfft, 0] * np.hanning(nfft))) for i in range(0, len(x9) - nfft, nfft // 4)], axis=0)
    rng = np.random.default_rng(27); t_a = t_hall - 0.7; t_b = T(at[5]); need = int((t_b + 0.3 - t_a) * SR)
    def tone():
        wn = rng.standard_normal(need + 2 * nfft).astype(np.float32); o = np.zeros(need + 3 * nfft, np.float32); win = np.hanning(nfft).astype(np.float32)
        for i in range(0, need + nfft, nfft // 2):
            o[i:i + nfft] += np.fft.irfft(np.fft.rfft(wn[i:i + nfft] * win) * spec, nfft).astype(np.float32) * win
        return o[nfft:nfft + need]
    room = np.stack([tone(), tone()], 1); room *= rms(x9) / rms(room); lay(room, t_a, fin=0.7, fout=0.3)
    h = v26[int(round(153.8333 * SR)):]; lay(h, t_b, fin=0.05, fout=0.01)     # the reading, the shutters, "We were chosen.", and Q10 take 2, as cut v26 had them
    # who speaks when (film time), for the song to give way
    q9 = t_b; q10 = T(at[9])
    talk_spans = [(t_v1, t_v1 + 2.04), (t_talk + 9.80 - 214 / FPS, t_talk + 10.88 - 214 / FPS), (q9 + 0.5, q9 + 6.1), (q9 + 6.8, q9 + 8.8), (q9 + 12.7, q9 + 14.6),
                  (q9 + 17.07, q9 + 17.75)] + [(q10 + a, q10 + b) for a, b in ((1.7, 2.45), (4.0, 5.05), (6.65, 8.25), (9.75, 10.4), (16.4, 17.3))]
    seen_spans = [(t_hall + 0.2, t_b + 0.2), (q9 + 9.9, q9 + 12.3), (q10 + 11.2, q10 + 13.6)]      # the hall's wide; the shutters opening; the shard
    tt = np.arange(N - ix) / SR + tx
    target = np.full(len(tt), GAP_DB, np.float32)
    for a, b in seen_spans:
        target[(tt >= a) & (tt < b)] = SEEN_DB
    talking = np.zeros(len(tt), np.float32)
    merged = []                                                              # lines less than 2.6 s apart are one stretch of talk: the song does not come up between them
    for a, b in talk_spans:
        if merged and a - merged[-1][1] < 2.6:
            merged[-1][1] = b
        else:
            merged.append([a, b])
    merged[-1][1] = T(n)                                                     # and after the last line it stays down to the end
    for a, b in merged:
        talking[(tt >= a - 0.9) & (tt < b + 0.8)] = 1.0                       # down before the line begins, up only after it has ended
    target[talking > 0] = TALK_DB
    k = int(1.4 * SR); ker = np.hanning(k).astype(np.float32); ker /= ker.sum()
    def smooth(v, first):
        return np.convolve(np.concatenate([np.full(k, first, np.float32), v, np.full(k, v[-1], np.float32)]), ker, 'same')[k:-k]
    env_db = smooth(target, 0.0); duck = smooth(talking, 0.0)
    env_db = np.where(tt < HIT + 0.12, 0.0, env_db)                          # the hit itself at full level; then the song falls back
    fall = np.clip((tt - (HIT + 0.12)) / 0.30, 0, 1); env_db = env_db * fall
    env_db = env_db + np.clip((tt - (T(n) - 1.2)) / 1.2, 0, 1) * -40.0       # out over the last 1.2 s
    whole = mq.audio('audio/song/SONG_demo1.mp3', SONG_AT_T_IN, SONG_AT_T_IN + (T(n) - T_IN) + 0.5)                 # decoded from the same point as in cut v20, so it lines up with the old mix to the sample
    j0 = ix - int(round(T_IN * SR)); song = np.asarray(whole, np.float32)[j0:j0 + len(tt)] * db(SONG_GAIN_DB)
    assert len(song) == len(tt), (len(song), len(tt))
    # held to an even level, so that the chorus is not louder under the hall than the verse was
    w = int(1.5 * SR); p = np.sqrt(np.convolve((song ** 2).mean(1), np.ones(w, np.float32) / w, 'same') + 1e-12); ref = rms(song[:int(4 * SR)])
    song = song * np.clip(ref / p, db(-10.0), db(4.0))[:, None].astype(np.float32)
    low = sosfiltfilt(butter(2, 1200, btype='lowpass', fs=SR, output='sos'), song, axis=0).astype(np.float32)
    song = song * (1 - duck)[:, None] + low * duck[:, None]                   # under a voice, rolled off above 1.2 kHz
    song = song * db(env_db)[:, None].astype(np.float32); song[:xf] *= np.linspace(0, 1, xf)[:, None]
    mix[ix:ix + len(song)] += song[:N - ix]
    peak = float(np.abs(mix).max()); wav = P('out/edits/film_v27.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    run('ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
        '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out)
    for p_ in (a_mp4, b_mp4, lst, silent):
        os.remove(p_)
    got = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out],
                             capture_output=True, text=True).stdout.strip())
    if got != n:
        sys.exit(f'frame count {got}, expected {n}')
    run('ffmpeg', '-v', 'error', '-y', '-ss', '137.0', '-i', out, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '224k',
        '-movflags', '+faststart', P('out/review/film_v27_hall.mp4'))
    run('ffmpeg', '-v', 'error', '-y', '-i', out, '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart', P('out/review/film_v27_full.mp4'))
    rec = {'file': 'out/review/film_v27.mp4', 'frames': n, 'seconds': round(n / FPS, 4),
           'shots_from_the_yard': [{'name': nm, 'starts_at_s': round(T(a), 3), 'frames': len(fr)} for (nm, fr), a in zip(seq, at)],
           'song': {'runs_on_from_s': round(tx, 3), 'between_lines_db': GAP_DB, 'under_a_voice_db': TALK_DB, 'where_something_is_seen_db': SEEN_DB, 'out_over_last_s': 1.2},
           'spoken_at_s': [[round(a, 2), round(b, 2)] for a, b in talk_spans], 'peak_dbfs': round(float(20 * np.log10(peak + 1e-9)), 2)}
    json.dump(rec, open(P('edit/film_v27.edl.json'), 'w'), indent=1); print(json.dumps(rec))


if __name__ == '__main__':
    main()
