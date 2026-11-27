#!/usr/bin/env python3
"""The film so far, cut v20: the normal edit after the council, with the song laid over it. Editing only.

    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v20.py
        ->  out/review/film_v20.mp4, out/review/film_v20_after_council.mp4, out/edits/film_v20.wav, edit/film_v20.edl.json

The author, 27 November, on the beat-cut montages (cuts v18 and v19): "Ahhh this is bad... This isn't what I mean by
montage" and "Pls just do it normally... No cut cause can't you watch this is so bad"; and then: "the music should start
when she's leaving the council door, but it should be fading in. And the music video should be increasing slowly and
all... This is how movies does this."

So nothing is cut to the beat, nothing is sped up and nothing from another scene is laid in:

  picture   cut v17's video stream, copied without re-encoding: the film to the end of the council, then the descent
            (Q07) as the author approved it, its five shots at their own length. Then the arrival as it was cut on
            27 November from both rounds of Q08 (tools/montage_q08.py: the boot, the spear and the bowl, the two
            watching, Serath among the dark backs, Karst silent, the collar, Karst silent, Serath), each shot at its
            own speed. Three differences from that cut: Serath among the dark backs is 12 frames longer, so that
            the song's last line ends as her close shot begins; her close shot now runs whole, uncut (her head
            comes up, level, her eyes); and it ends on her profile, so that the last line has air after it.
  sound     the council as in cut v17. The song comes in from nothing on the cut to the door, as Serath walks to it
            (1:58.9, six seconds before the council ends): the end of its pre-chorus, "somewhere a mountain", under
            her leaving. It rises slowly: 30 dB down at the door shot's first frame, 14 dB down as she passes through
            the door (soft, but heard over the room and her footsteps), 9 dB down at the cut to the descent, where
            the second verse begins, and at its full level nine seconds into the descent. (A first try, 40, 22 and
            11 dB down, measured no louder than the room until the cut.) The song is not cut anywhere; on the hit that ends the verse it stops. The
            descent's own sounds are at their level at the cut and give way to the song, 6 dB down after nine
            seconds. After the stop: the yard's air, and Karst's two sentences off-screen, the first on her face as
            her head comes up, the second on her profile.
"""
import importlib.util, json, os, subprocess, sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfiltfilt

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('mq', P('tools/montage_q08.py')); mq = importlib.util.module_from_spec(spec); spec.loader.exec_module(mq)
W, H, FPS, SR = mq.W, mq.H, mq.FPS, mq.SR
BEAT, DROP, LEAD = 0.7059, 55.869, 0.020            # the song's beat, its drum drop, and how long after the cut the drop lands
SONG_GAIN_DB, Q07_UNDER_DB = -3.0, -6.0
T_IN = 118.9                                        # the cut to the door shot: Serath walks to the door
# the song's level over film time, in dB below its full level: (seconds after the cut to the descent, dB)
RISE = [(None, -30.0), (-4.375, -18.0), (-2.875, -14.0), (0.0, -9.0), (9.0, 0.0)]     # the first point is T_IN; she passes through the door at 2:02.0


def run(*a):
    subprocess.run(list(a), check=True)


def main():
    v17 = json.load(open(P('edit/film_v17.edl.json'))); n17, n16 = v17['frames'], v17['cut_v16_frames']
    A1, B1 = mq.frames('out/takes/Q08A_t1.mp4'), mq.frames('out/takes/Q08B_t1.mp4')
    A2, B2 = mq.frames('out/takes/Q08A_t2.mp4'), mq.frames('out/takes/Q08B_t2.mp4')
    R1 = dict(gain=(0.80, 0.83, 0.87), lift=0.012)
    shots = [
        [mq.grade(f, **R1) for f in A1[0:17]],                                                    # her boot reaches the ground
        [mq.grade(f, **R1) for f in B1[0:56]],                                                    # the spear and the bowl
        [mq.grade(f, **R1) for f in B1[58:100]],                                                  # they watch her pass
        [mq.grade(mq.push(f, 560, 235, 1.35), gain=(0.96, 0.97, 1.0)) for f in A2[110:151]],      # white between two dark backs (12 frames longer)
        [mq.grade(mq.push(f, 485, 150, 1.5), gain=(1.12, 1.12, 1.14)) for f in B2[89:109]],       # Karst, silent
        [mq.grade(f, **R1) for f in A1[132:225]],                                                 # the collar: her head comes up, level, her eyes (one shot, uncut)
        [mq.grade(mq.push(f, 485, 150, 1.5), gain=(1.12, 1.12, 1.14)) for f in B2[262:282]],      # Karst, silent
        [mq.grade(f, gain=(0.96, 0.97, 1.0)) for f in A2[222:265]],                               # Serath in profile: she takes it in
    ]
    starts = np.cumsum([0] + [len(s) for s in shots]); n8 = int(starts[-1]); n = n17 + n8
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    out = P('out/review/film_v20.mp4'); a_mp4 = P('out/edits/_v20_a.mp4'); b_mp4 = P('out/edits/_v20_b.mp4'); lst = P('out/edits/_v20.txt'); silent = P('out/edits/_v20_silent.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-i', P('out/review/film_v17.mp4'), '-map', '0:v', '-c:v', 'copy', '-an', a_mp4)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                            '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709',
                            '-color_trc', 'bt709', '-video_track_timescale', '12288', b_mp4], stdin=subprocess.PIPE)
    for s in shots:
        for f in s:
            f = np.array(f); f[:top] = 0; f[top + band:] = 0                                      # the film's matte
            enc.stdin.write(f.tobytes())
    enc.stdin.close(); assert enc.wait() == 0
    open(lst, 'w').write(f"file '{a_mp4}'\nfile '{b_mp4}'\n")
    run('ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', silent)

    # ---- sound
    N16, N17, N = n16 * SR // FPS, n17 * SR // FPS, n * SR // FPS
    old, _ = sf.read(P('out/edits/film_v17.wav'), always_2d=True); old = old.astype(np.float32)
    mix = np.zeros((N, 2), np.float32); mix[:N16] = old[:N16]
    r = int(0.03 * SR); mix[N16 - r:N16] *= np.cos(0.5 * np.pi * np.linspace(0, 1, r, dtype=np.float32))[:, None]      # the council's room out before the cut
    m7, _ = sf.read(P('out/edits/Q07_reel_v5_mix.wav'), always_2d=True); m7 = m7.astype(np.float32)[:N17 - N16]
    m7 *= (10 ** (np.interp(np.arange(len(m7)) / SR, [0.0, RISE[-1][0]], [0.0, Q07_UNDER_DB]) / 20)).astype(np.float32)[:, None]   # the descent's own sounds give way to the song
    m7[:r // 2] *= np.linspace(0, 1, r // 2)[:, None]
    mix[N16:N16 + len(m7)] += m7
    hit = 32 * BEAT + LEAD                                                                        # the hit that ends the verse, after the cut
    pre = n16 / FPS - T_IN                                                                        # how long before the cut the song comes in
    song = mq.audio('audio/song/SONG_demo1.mp3', DROP - LEAD - pre, DROP - LEAD + hit + 1.0) * 10 ** (SONG_GAIN_DB / 20)
    ts = np.arange(len(song)) / SR - pre                                                          # seconds after the cut to the descent
    rise = 10 ** (np.interp(ts, [-pre] + [a for a, _ in RISE[1:]], [d for _, d in RISE]) / 20)
    rise *= np.clip((ts + pre) / 0.5, 0, 1)                                                       # and from nothing over its first half second
    env = np.clip((hit + 0.34 - ts) / 0.14, 0, 1); env = 0.5 - 0.5 * np.cos(np.pi * env)          # the last hit, then out within a third of a second
    i0 = int(round(T_IN * SR)); song = (song * (rise * env).astype(np.float32)[:, None])[:N - i0]
    mix[i0:i0 + len(song)] += song
    M = N - N17; t = np.arange(M) / SR; rms = lambda x: float(np.sqrt((x ** 2).mean()) + 1e-9)
    def bed(name, level_db, lo=None):
        x, sr = sf.read(P('audio/sfx', name), always_2d=True); x = x.astype(np.float32); assert sr == SR
        if x.shape[1] == 1: x = np.repeat(x, 2, 1)
        while len(x) < M + SR: x = np.concatenate([x, x[::-1]])
        x = x[SR // 2:SR // 2 + M]
        if lo: x = sosfiltfilt(butter(2, lo, btype='lowpass', fs=SR, output='sos'), x, axis=0).astype(np.float32)
        return x * (10 ** (level_db / 20) / rms(x))
    stop8 = hit - (n17 - n16) / FPS                                                               # the music's stop, in the arrival's own time
    up = np.clip(0.35 + 0.65 * (t - (stop8 - 1.5)) / 1.8, 0.35, 1).astype(np.float32)[:, None] * np.clip(t / 0.5, 0, 1).astype(np.float32)[:, None]
    yard = (bed('wind_vale.flac', -33.0, lo=3500) + bed('crowd_presence.flac', -41.0)) * up       # the yard's air: low under the song, full when it stops
    q = int(0.4 * SR); yard[-q:] *= np.linspace(1, 0, q)[:, None]                                 # (the air goes out at the end; the voice is laid in after this and is not faded)
    def voice(a, b, at):
        v = mq.audio('out/takes/Q08B_t2.mp4', a, b)
        v = sosfiltfilt(butter(2, 110, btype='highpass', fs=SR, output='sos'), v, axis=0).astype(np.float32)
        q = int(0.03 * SR); v[:q] *= np.linspace(0, 1, q)[:, None]; v[-q:] *= np.linspace(1, 0, q)[:, None]
        i = int(at * SR); v = v[:M - i]; yard[i:i + len(v)] += v
        return round(n17 / FPS + at, 2), round(n17 / FPS + at + len(v) / SR, 2)
    t1 = voice(5.58, 7.62, max(starts[5] / FPS + 0.20, stop8 + 0.42))                             # "We did not attack your city, Admiral." once the music is out
    t2 = voice(9.80, 10.88, starts[7] / FPS + 0.30)                                               # "We stopped carrying it." on her profile
    mix[N17:] += yard
    assert t1[1] <= round((n17 + starts[6]) / FPS, 2) + 0.01, ('the first sentence runs past her close shot', t1, (n17 + starts[6]) / FPS)
    peak = float(np.abs(mix).max())
    wav = P('out/edits/film_v20.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    run('ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
        '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out)
    for p in (a_mp4, b_mp4, lst, silent):
        os.remove(p)
    got = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out],
                             capture_output=True, text=True).stdout.strip())
    if got != n:
        sys.exit(f'frame count {got}, expected {n}')
    part = P('out/review/film_v20_after_council.mp4'); a = 112.5                                   # from "Remember who raised you" to the end, for a quick look
    run('ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.3f}', '-i', out, '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '224k',
        '-movflags', '+faststart', part)
    rec = {'file': 'out/review/film_v20.mp4', 'frames': n, 'seconds': round(n / FPS, 4), 'cut_v17_frames': n17, 'council_ends_at_s': round(n16 / FPS, 3),
           'song': 'audio/song/SONG_demo1.mp3', 'song_comes_in_at_s': T_IN, 'song_time_there_s': round(DROP - LEAD - (n16 / FPS - T_IN), 3), 'song_time_at_the_cut_s': round(DROP - LEAD, 3), 'song_full_level_db': SONG_GAIN_DB,
           'song_level_db_below_full': [[T_IN, RISE[0][1]]] + [[round(n16 / FPS + a, 3), d] for a, d in RISE[1:]], 'song_at_full_level_from_s': round(n16 / FPS + RISE[-1][0], 3),
           'music_stops_at_s': round(n16 / FPS + hit, 3), 'q07_own_sound_db': Q07_UNDER_DB, 'arrival_starts_at_s': round(n17 / FPS, 3),
           'arrival_shots_start_at_s': [round((n17 + int(s)) / FPS, 3) for s in starts[:-1]], 'karst_lines_at_s': [t1, t2], 'peak_dbfs': round(float(20 * np.log10(peak + 1e-9)), 2)}
    json.dump(rec, open(P('edit/film_v20.edl.json'), 'w'), indent=1); print(rec)


if __name__ == '__main__':
    main()
