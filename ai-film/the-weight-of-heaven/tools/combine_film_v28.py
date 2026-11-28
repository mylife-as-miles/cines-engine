#!/usr/bin/env python3
"""The film so far, cut v28: cut v27, then Q11 playing whole, with the bare hand between Karst's figures and her answer.
Editing only: every picture is from takes the film already has.

    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v28.py
        ->  out/review/film_v28.mp4, out/review/film_v28_full.mp4 (a smaller copy of the whole film),
            out/review/film_v28_hall.mp4 (from the end of the descent to the end), out/edits/film_v28.wav,
            edit/film_v28.edl.json

PICTURE
  Cut v27, frame for frame (its picture stream is copied, not encoded again), to the end of "The marriage bell.". Then:
    Karst: "Ninety tons." ... "Anvil Vale, the same hour." ... "Every bell is a mountain now."   Q11 take 1, shot 1, whole
    her bare hand comes down onto the shard                                                       Q11 take A, as mended
    Serath: "I did not read it.", and her eyes come up to him                                     shot 2, whole
    Karst: "No one above reads them." ... "I read every one."                                     shot 3, whole
    Serath, looking at him                                                                        shot 4, whole
  No shot is shortened, slowed, re-framed or re-graded, and every line is on the one who says it. The hand sits at a cut
  the take already has.

SOUND
  Cut v27's sound, to the sample, as far as its last second. Its song no longer goes out there: it runs on under this
  scene as it runs under the hall, about 25 dB under its full level while anyone speaks, and comes up once, under the
  hand, where nobody speaks and something is seen. After the last line it stays down and goes out over the last second.
  The take's own sound carries the talk, its voices set to the level of the voices before it. Under the hand, which has
  no usable sound of its own, the hall's air from this take runs on. Nothing is added: no effect, no made sound.
"""
import io, json, os, subprocess, sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfiltfilt

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
sys.path.insert(0, P('tools'))
import combine_film_v27 as v27                                              # for cut v25's helpers and the song's constants; its main() is not run

v25, mq = v27.v25, v27.mq
W, H, FPS, SR, N17 = v27.W, v27.H, v27.FPS, v27.SR, v27.N17
T_IN, SONG_AT_T_IN, SONG_GAIN_DB, HIT = v27.T_IN, v27.SONG_AT_T_IN, v27.SONG_GAIN_DB, v27.HIT
GAP_DB, TALK_DB, SEEN_DB = v27.GAP_DB, v27.TALK_DB, v27.SEEN_DB
TAKE, HAND = 'out/takes/Q11_t1.mp4', 'out/edits/Q11H_t1_mended.mp4'
CUTS = (0, 190, 293, 428, 481)                                              # Q11 take 1: its four shots, in frames
LINES = ((1.30, 2.02), (3.02, 4.70), (6.02, 7.55), (9.43, 10.43), (12.74, 14.02), (15.87, 17.17))   # who speaks when in the take, in seconds
V27_SHOTS = (58, 98, 113, 72, 70, 153, 70, 134, 79, 433)                    # cut v27 from the yard on, in frames

S = lambda fr: int(round(fr * SR / FPS)); T = lambda fr: fr / FPS
rms = lambda x: float(np.sqrt((x ** 2).mean()) + 1e-9); db = lambda d: 10 ** (np.asarray(d) / 20)


def song_under(n, talk_spans, seen_spans):
    """the song from its hit to frame n, giving way to the talk: cut v27's own arithmetic, so that with cut v27's spans
    and length it is cut v27's song to the sample"""
    tx = HIT + 0.02; xf = int(0.18 * SR); ix = int(tx * SR); N = S(n)
    tt = np.arange(N - ix) / SR + tx
    target = np.full(len(tt), GAP_DB, np.float32)
    for a, b in seen_spans:
        target[(tt >= a) & (tt < b)] = SEEN_DB
    talking = np.zeros(len(tt), np.float32)
    merged = []                                                              # lines less than 2.6 s apart are one stretch of talk
    for a, b in talk_spans:
        if merged and a - merged[-1][1] < 2.6:
            merged[-1][1] = b
        else:
            merged.append([a, b])
    merged[-1][1] = T(n)                                                     # after the last line it stays down to the end
    for a, b in merged:
        talking[(tt >= a - 0.9) & (tt < b + 0.8)] = 1.0
    target[talking > 0] = TALK_DB
    k = int(1.4 * SR); ker = np.hanning(k).astype(np.float32); ker /= ker.sum()
    def smooth(v, first):
        return np.convolve(np.concatenate([np.full(k, first, np.float32), v, np.full(k, v[-1], np.float32)]), ker, 'same')[k:-k]
    env_db = smooth(target, 0.0); duck = smooth(talking, 0.0)
    env_db = np.where(tt < HIT + 0.12, 0.0, env_db)
    fall = np.clip((tt - (HIT + 0.12)) / 0.30, 0, 1); env_db = env_db * fall
    env_db = env_db + np.clip((tt - (T(n) - 1.2)) / 1.2, 0, 1) * -40.0       # out over the last 1.2 s
    whole = mq.audio('audio/song/SONG_demo1.mp3', SONG_AT_T_IN, SONG_AT_T_IN + (T(n) - T_IN) + 0.5)
    j0 = ix - int(round(T_IN * SR)); song = np.asarray(whole, np.float32)[j0:j0 + len(tt)] * db(SONG_GAIN_DB)
    assert len(song) == len(tt), (len(song), len(tt))
    w = int(1.5 * SR); p = np.sqrt(np.convolve((song ** 2).mean(1), np.ones(w, np.float32) / w, 'same') + 1e-12); ref = rms(song[:int(4 * SR)])
    song = song * np.clip(ref / p, db(-10.0), db(4.0))[:, None].astype(np.float32)
    low = sosfiltfilt(butter(2, 1200, btype='lowpass', fs=SR, output='sos'), song, axis=0).astype(np.float32)
    song = song * (1 - duck)[:, None] + low * duck[:, None]
    song = song * db(env_db)[:, None].astype(np.float32); song[:xf] *= np.linspace(0, 1, xf)[:, None]
    return ix, song[:N - ix], env_db


def main():
    run, grab = v25.run, v25.grab
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    def matte(fr):
        fr = np.array(fr); fr[:, :top] = 0; fr[:, top + band:] = 0; return fr
    # ---------------- picture
    n27 = N17 + sum(V27_SHOTS)
    q = matte(grab(TAKE, 0, CUTS[-1])); hand = matte(grab(HAND, 0, 84)); assert len(q) == CUTS[-1] and len(hand) == 84, (len(q), len(hand))
    seq = [('Karst: "Ninety tons." "Anvil Vale, the same hour." "Every bell is a mountain now."', q[CUTS[0]:CUTS[1]]), ('her bare hand comes down onto the shard', hand),
           ('Serath: "I did not read it."', q[CUTS[1]:CUTS[2]]), ('Karst: "No one above reads them." "I read every one."', q[CUTS[2]:CUTS[3]]), ('Serath, looking at him', q[CUTS[3]:CUTS[4]])]
    starts = np.cumsum([0] + [len(s[1]) for s in seq]); n = n27 + int(starts[-1]); at = [n27 + int(s) for s in starts[:-1]]
    out = P('out/review/film_v28.mp4'); a_mp4 = P('out/edits/_v28_a.mp4'); b_mp4 = P('out/edits/_v28_b.mp4'); lst = P('out/edits/_v28.txt'); silent = P('out/edits/_v28_silent.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-i', P('out/review/film_v27.mp4'), '-map', '0:v', '-c:v', 'copy', '-an', a_mp4)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                            '-c:v', 'libx264', '-crf', '13', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709',
                            '-color_trc', 'bt709', '-video_track_timescale', '12288', b_mp4], stdin=subprocess.PIPE)
    for _, fr in seq:
        enc.stdin.write(np.ascontiguousarray(fr).tobytes())
    enc.stdin.close(); assert enc.wait() == 0
    open(lst, 'w').write(f"file '{a_mp4}'\nfile '{b_mp4}'\n")
    run('ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', silent)

    # ---------------- sound
    N = S(n); N27 = S(n27); mix = np.zeros((N, 2), np.float32)
    old, sr = sf.read(P('out/edits/film_v27.wav'), always_2d=True); assert sr == SR and len(old) == N27, (sr, len(old), N27); old = old.astype(np.float32)
    # cut v27's spans, from its own shot list
    a27 = [N17 + int(s) for s in np.cumsum((0,) + V27_SHOTS)[:-1]]
    t_v1 = 147.904; t_talk = T(a27[3]); t_hall = T(a27[4]); q9 = T(a27[5]); q10 = T(a27[9])
    talk27 = [(t_v1, t_v1 + 2.04), (t_talk + 9.80 - 214 / FPS, t_talk + 10.88 - 214 / FPS), (q9 + 0.5, q9 + 6.1), (q9 + 6.8, q9 + 8.8), (q9 + 12.7, q9 + 14.6),
              (q9 + 17.07, q9 + 17.75)] + [(q10 + a, q10 + b) for a, b in ((1.7, 2.45), (4.0, 5.05), (6.65, 8.25), (9.75, 10.4), (16.4, 17.3))]
    seen27 = [(t_hall + 0.2, q9 + 0.2), (q9 + 9.9, q9 + 12.3), (q10 + 11.2, q10 + 13.6)]
    ix, song27, _ = song_under(n27, talk27, seen27)
    bare = old.copy(); bare[ix:] -= song27                                    # cut v27 without its song
    seg = slice(int(160.0 * SR), int(166.0 * SR)); cor = lambda x: float(np.corrcoef(x[seg, 0], song27[seg.start - ix:seg.stop - ix, 0])[0, 1])
    c_old, c_bare = cor(old), cor(bare); assert abs(c_bare) < 0.05 < c_old, (c_old, c_bare)       # the song is out of it
    mix[:N27] += bare
    # where the take's shots and the hand lie in the film, and its sound cut the same way
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', P(TAKE), '-vn', '-ac', '2', '-ar', str(SR), '-f', 'wav', '-'], capture_output=True, check=True).stdout
    t, _ = sf.read(io.BytesIO(raw), always_2d=True); t = t.astype(np.float32); L = S(CUTS[-1]); t = np.concatenate([t, np.zeros((max(0, L - len(t)), 2), np.float32)])[:L]
    sp = butter(4, [300, 3400], btype='bandpass', fs=SR, output='sos')
    def voice_db(x, spans):
        y = sosfiltfilt(sp, x.mean(1)); return float(20 * np.log10(np.sqrt(np.mean(np.concatenate([y[int(s * SR):int(e * SR)] for s, e in spans]) ** 2)) + 1e-9))
    before = voice_db(bare, [(q10 + a, q10 + b) for a, b in ((1.7, 2.45), (4.0, 5.05), (6.65, 8.25), (9.75, 10.4), (16.4, 17.3))])     # Q10 take 2's five lines, as they stand in the film
    after = voice_db(t, LINES); gain_db = float(np.clip(before - after, -6.0, 6.0)); t *= db(gain_db)
    def lay(x, tm, fin=0.03, fout=0.03):
        x = x.copy(); a, b = int(fin * SR), int(fout * SR)
        if a: x[:a] *= np.linspace(0, 1, a)[:, None]
        if b: x[-b:] *= np.linspace(1, 0, b)[:, None]
        i = int(round(tm * SR)); x = x[:max(0, N - i)]; mix[i:i + len(x)] += x
    c1 = S(CUTS[1]); t_a, t_h, t_c = T(at[0]), T(at[1]), T(at[2])
    lay(t[:c1], t_a, fin=0.04, fout=0.04)                                     # shot 1
    lay(t[c1:], t_c, fin=0.04, fout=0.25)                                     # shots 2, 3 and 4
    # the hall's air, made from the take's own (its last two seconds, where nobody speaks): under the hand, and across the join with cut v27
    x9 = t[int(17.6 * SR):int(19.8 * SR)]; nfft = 4096
    spec = np.mean([np.abs(np.fft.rfft(x9[i:i + nfft, 0] * np.hanning(nfft))) for i in range(0, len(x9) - nfft, nfft // 4)], axis=0)
    rng = np.random.default_rng(28)
    def tone(need):
        wn = rng.standard_normal(need + 2 * nfft).astype(np.float32); o = np.zeros(need + 3 * nfft, np.float32); win = np.hanning(nfft).astype(np.float32)
        for i in range(0, need + nfft, nfft // 2):
            o[i:i + nfft] += np.fft.irfft(np.fft.rfft(wn[i:i + nfft] * win) * spec, nfft).astype(np.float32) * win
        return o[nfft:nfft + need]
    def room(a, b, fin, fout):
        need = int((b - a) * SR); r = np.stack([tone(need), tone(need)], 1); r *= rms(x9) / rms(r); lay(r, a, fin=fin, fout=fout)
    room(t_h - 0.15, t_c + 0.15, 0.15, 0.15)                                  # under the hand
    room(t_a - 0.35, t_a + 0.12, 0.25, 0.12)                                  # cut v27's last quarter second fades its room out: the air runs across the join
    # the song, running on
    talk = talk27 + [(t_a + a, t_a + b) for a, b in LINES[:3]] + [(t_c + a - T(CUTS[1]), t_c + b - T(CUTS[1])) for a, b in LINES[3:]]
    seen = seen27 + [(t_h + 0.2, t_c + 0.2)]
    ix, song, env_db = song_under(n, talk, seen)
    mix[ix:] += song
    same_to = int((q10 + 14.0) * SR); dif = float(np.abs(mix[:same_to] - old[:same_to]).max())       # before the last line of cut v27 nothing has changed
    peak = float(np.abs(mix).max()); wav = P('out/edits/film_v28.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    run('ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
        '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out)
    for p_ in (a_mp4, b_mp4, lst, silent):
        os.remove(p_)
    got = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out],
                             capture_output=True, text=True).stdout.strip())
    if got != n:
        sys.exit(f'frame count {got}, expected {n}')
    run('ffmpeg', '-v', 'error', '-y', '-ss', '137.0', '-i', out, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '224k',
        '-movflags', '+faststart', P('out/review/film_v28_hall.mp4'))
    run('ffmpeg', '-v', 'error', '-y', '-i', out, '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart', P('out/review/film_v28_full.mp4'))
    tt = lambda s: int((s - (HIT + 0.02)) * SR)
    rec = {'file': 'out/review/film_v28.mp4', 'frames': n, 'seconds': round(n / FPS, 4), 'is': 'cut v27 (frames 0 to %d), then Q11 take 1 whole with the mended hand between its shots 1 and 2' % (n27 - 1),
           'shots_added': [{'name': nm, 'starts_at_s': round(T(a), 3), 'frames': len(fr)} for (nm, fr), a in zip(seq, at)],
           'take_gain_db': round(gain_db, 2), 'spoken_at_s': [[round(a, 2), round(b, 2)] for a, b in talk[len(talk27):]],
           'song_db_at_s': {str(s): round(float(env_db[tt(s)]), 1) for s in (190.0, 192.0, 195.0, 200.0, 202.0, 203.0, 204.0, 206.5, 210.0, 213.0, 215.5, 216.5)},
           'song_out_of_cut_v27_check': {'correlation_with_song_before': round(c_old, 3), 'after': round(c_bare, 4)},
           'sound_unchanged_before_s': round(same_to / SR, 2), 'largest_difference_there': dif, 'peak_dbfs': round(float(20 * np.log10(peak + 1e-9)), 2)}
    json.dump(rec, open(P('edit/film_v28.edl.json'), 'w'), indent=1); print(json.dumps(rec))


if __name__ == '__main__':
    main()
