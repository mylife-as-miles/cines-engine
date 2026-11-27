#!/usr/bin/env python3
""""Below" as a music montage, cut to the song's second verse. Editing only; nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/below_montage.py
        ->  out/edits/Below_montage_v1.mp4 (picture, the film's matte and encode settings), out/edits/Below_montage_v1.wav,
            out/edits/Below_montage_v1.json, out/review/Below_montage_v1.mp4 (picture and sound together)

The author, 27 November: "after the council scene this will be a music montage to speed things like how arcane do and
song like arcane"; on the song (audio/song/SONG_demo1.mp3, made with Gemini's music model): "The song... Now add it...
And merge all to complie let me see how it turns out then I'll judge".

The song's second verse runs from its drum drop at 55.87 s to the hit at 84.11 s: 40 beats at 85 BPM (0.7059 s a beat),
with a heavy hit every eight beats and lighter ones on beats 3, 4 and 7 after each. Every cut is on a beat; the picture
changes on the hits. The descent (Q07) and the yard (both rounds of Q08) are cut together with five one-beat images
from earlier in the film: what the farmer lost, and the heaven the ground has never seen. On the last hit the music
stops; over wind, Karst's two sentences are heard off-screen on Serath's face.

  beats  picture                                                              sung
   0- 3  the kingdom's underside; the cutter comes down                       We built it wide,
   3- 4  Serath at the cutter's window
   4- 7  the crossing: the Weir wide and low ahead                            we built it low,
   7- 8  the crow drops at the wall
   8-11  the shade of the kingdom falls on her; her eyes close                we learned to walk
  11-12  the cutter passes over the wall
  12-14  Sarn Vale                                                            the way you lean;
  14-16  the yard: she comes down; she stands white among dark backs
  16-19  Marl puts a spear into the farmer's hand                             eight hundred years
  19-20  his hand on the child's bowl
  20-23  the child with the bowl; the mountain falls; he shields her          we held the shade
  23-24  his face now
  24-25  the white cathedral of Orison                                        of gardens
  25-27  the gold cup; the gold collar
  27-28  Serath among the dark backs                                          we have never seen.
  28-31  Marl and the farmer watch her pass
  31-33  Karst at the door; nearer on the hit
  33-38  Marl; the underside; her bowed head; the farmer; the Weir            (Hold it up) we held it up
  38-40  Karst, Serath, Karst, Serath: her head comes up in pieces
  40     the last hit: the music stops. Serath, level. "We did not attack your city, Admiral."
         Karst, silent. Serath in profile. "We stopped carrying it."

Not used: her stumble, the aide's fall, the first round's Karst (a cut-out on black), anyone speaking on screen.
"""
import io, json, os, subprocess
import numpy as np
import soundfile as sf
from PIL import Image, ImageFilter
from scipy.signal import butter, sosfiltfilt, fftconvolve

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
W, H, FPS, SR = 992, 432, 24, 48000
BEAT = 0.7059                       # seconds; fitted to the song's beats between 44 and 90 s (largest deviation 28 ms)
DROP = 55.869                       # the song's drum drop (measured onset); the grid's hits fall 26 ms before the grid
LEAD = 0.020                        # the drop lands this long after the first frame
SONG0 = DROP - LEAD                 # song time at montage time 0
SONG_GAIN_DB = -3.0
fb = lambda k: int(round(k * BEAT * FPS))


def frames(path, sel=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', P(path)] + (['-vf', f"select='between(n\\,{sel[0]}\\,{sel[1] - 1})'", '-vsync', '0'] if sel else []) + ['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.uint8).reshape(-1, H, W, 3)


def audio(path, a=None, b=None):
    cmd = ['ffmpeg', '-v', 'error'] + (['-ss', f'{a:.4f}', '-t', f'{b - a:.4f}'] if a is not None else []) + ['-i', P(path), '-vn', '-ac', '2', '-ar', str(SR), '-f', 'wav', '-']
    x, _ = sf.read(io.BytesIO(subprocess.run(cmd, capture_output=True, check=True).stdout), always_2d=True)
    return x.astype(np.float32)


def push(f, cx, cy, z):
    w, h = W / z, H / z; x0 = float(np.clip(cx - w / 2, 0, W - w)); y0 = float(np.clip(cy - h / 2, 0, H - h))
    im = Image.fromarray(f).resize((W, H), Image.LANCZOS, box=(x0, y0, x0 + w, y0 + h))
    if z >= 1.8:
        im = im.filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2))
    return np.asarray(im)


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIG = (1 - 0.20 * np.clip(np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)) - 0.55, 0, 1) ** 1.5)[..., None]


def grade(f, gain=(1.0, 1.0, 1.0), lift=0.0):
    a = f.astype(np.float32) / 255
    a = np.clip((a * np.array(gain, np.float32) - lift) / (1 - lift), 0, 1) * VIG
    return (a * 255 + 0.5).astype(np.uint8)


R1 = dict(gain=(0.80, 0.83, 0.87), lift=0.012)        # the first round of Q08, brought down and cooled to sit with the second
R2 = dict(gain=(0.96, 0.97, 1.0))
KA = dict(gain=(1.12, 1.12, 1.14))                    # Karst, lifted a little when pushed in


def main():
    Q7 = frames('out/edits/Q07_reel_v6.mp4')
    A1, B1 = frames('out/takes/Q08A_t1.mp4'), frames('out/takes/Q08B_t1.mp4')
    A2, B2 = frames('out/takes/Q08A_t2.mp4'), frames('out/takes/Q08B_t2.mp4')
    film = lambda a, n=17: frames('out/review/film_v16.mp4', (a, a + n))
    fit = lambda src, n: [src[i] for i in np.round(np.linspace(0, len(src) - 1, n)).astype(int)]
    g = lambda src, kw, p=None: [grade(push(f, *p) if p else f, **kw) for f in src]
    FACE_F, FACE_M, KARST = (500, 105, 2.0), (245, 120, 2.5), (480, 105)

    # (first beat, last beat, frames or a function of the length)
    plan = [
        (0, 3, lambda n: fit(Q7[0:69], n)),                                   # the underside; the cutter comes down
        (3, 4, lambda n: Q7[69:69 + n]),                                      # Serath at the window
        (4, 7, lambda n: fit(Q7[169:238], n)),                                # the crossing
        (7, 8, lambda n: Q7[250:286:2][:n]),                                  # the crow drops
        (8, 11, lambda n: Q7[86:86 + n]),                                     # the shade falls on her
        (11, 12, lambda n: A2[4:4 + 2 * n:2]),                                # the cutter over the wall
        (12, 14, lambda n: Q7[286:286 + 2 * n:2]),                            # Sarn Vale
        (14, 15, lambda n: g(A2[70:70 + n], R2)),                             # she comes down
        (15, 16, lambda n: g(A2[110:110 + n], R2, (560, 235, 1.35))),         # white among dark backs
        (16, 19, lambda n: g(B1[0:n], R1)),                                   # the spear
        (19, 20, lambda n: g(B1[36:36 + n], R1, (600, 365, 2.2))),            # his hand on the bowl
        (20, 21, lambda n: film(1206, n)),                                    # the child with the bowl
        (21, 22, lambda n: film(1160, n)),                                    # the mountain falls
        (22, 23, lambda n: film(1300, n)),                                    # he shields her
        (23, 24, lambda n: g(B1[62:62 + n], R1, FACE_F)),                     # his face now
        (24, 25, lambda n: film(150, n)),                                     # the white cathedral
        (25, 26, lambda n: film(1400, n)),                                    # the gold cup
        (26, 27, lambda n: g(A1[132:132 + n], R1, (560, 330, 1.9))),          # the gold collar
        (27, 28, lambda n: g(A2[122:122 + n], R2, (540, 215, 1.6))),          # Serath among the dark backs
        (28, 31, lambda n: g(B1[100 - n:100], R1)),                           # they watch her pass
        (31, 32, lambda n: g(B2[89:89 + n], KA, KARST + (1.4,))),             # Karst at the door
        (32, 33, lambda n: g(B2[92:92 + n], KA, (440, 105, 2.1))),             # nearer, on the hit; the door's stone kept at the frame's left
        (33, 34, lambda n: g(B1[70:70 + n], R1, FACE_M)),                     # Marl
        (34, 35, lambda n: [push(f, 330, 130, 1.5) for f in Q7[10:10 + n]]),  # what they held up
        (35, 36, lambda n: g(A1[134:134 + n], R1)),                           # her bowed head
        (36, 37, lambda n: g(B1[80:80 + n], R1, FACE_F)),                     # the farmer
        (37, 38, lambda n: [push(f, 560, 170, 1.8) for f in Q7[190:190 + n]]),   # the Weir
        (38, 38.5, lambda n: g(B2[262:262 + n], KA, (480, 85, 2.7))),         # Karst
        (38.5, 39, lambda n: g(A1[150:150 + n], R1)),                         # her head, rising
        (39, 39.5, lambda n: g(B2[271:271 + n], KA, (480, 85, 2.7))),         # Karst
        (39.5, 40, lambda n: g(A1[158:158 + n], R1)),                         # her head, rising
    ]
    shots, starts = [], []
    for k0, k1, make in plan:
        n = fb(k1) - fb(k0); s = list(make(n)); assert len(s) == n, (k0, k1, len(s), n)
        starts.append(fb(k0)); shots.append(s)
    stop_f = fb(40)
    tail = [g(A1[166:225], R1), g(B2[262:283], KA, (440, 105, 2.1)), g(A2[222:265], R2)]      # the stop: Serath; Karst silent; Serath in profile
    for s in tail:
        starts.append(starts[-1] + len(shots[-1])); shots.append(s)
    n = starts[-1] + len(shots[-1])

    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    pic = P('out/edits/Below_montage_v1.mp4')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                            '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709',
                            '-color_trc', 'bt709', '-video_track_timescale', '12288', pic], stdin=subprocess.PIPE)
    k = 0
    for s in shots:
        for f in s:
            f = np.array(f); f[:top] = 0; f[top + band:] = 0                 # the film's 2.39:1 matte
            enc.stdin.write(f.tobytes()); k += 1
    enc.stdin.close(); assert enc.wait() == 0 and k == n

    # ---- sound
    N = n * SR // FPS; mix = np.zeros((N, 2), np.float32); t = np.arange(N) / SR
    rms = lambda x: float(np.sqrt((x ** 2).mean()) + 1e-9)
    hit = 40 * BEAT + LEAD                                                   # the last hit, in montage time
    song = audio('audio/song/SONG_demo1.mp3', SONG0, SONG0 + hit + 1.0) * 10 ** (SONG_GAIN_DB / 20)
    f = int(0.004 * SR); song[:f] *= np.linspace(0, 1, f)[:, None]
    env = np.clip((hit + 0.34 - np.arange(len(song)) / SR) / 0.14, 0, 1); env = (0.5 - 0.5 * np.cos(np.pi * env)).astype(np.float32)   # the hit, then out within a third of a second
    mix[:len(song)] += (song * env[:, None])[:N]
    # the hit rings on in the yard: its own sound through a decaying-noise room, heard only after the stop
    rng = np.random.default_rng(11); L = int(2.4 * SR); tt = np.arange(L) / SR
    ir = rng.normal(0, 1, (L, 2)).astype(np.float32) * np.exp(-tt / 0.30)[:, None]
    ir = sosfiltfilt(butter(2, [140, 4200], btype='bandpass', fs=SR, output='sos'), ir, axis=0).astype(np.float32)
    a0 = int((hit - 0.05) * SR); src = song[a0:int((hit + 0.30) * SR)]
    ring = np.stack([fftconvolve(src[:, c], ir[:, c]) for c in (0, 1)], 1).astype(np.float32)
    ring *= 10 ** (-13 / 20) * rms(src) / rms(ring[:len(src)])
    gate = np.clip((np.arange(len(ring)) / SR - 0.30) / 0.12, 0, 1).astype(np.float32)[:, None]
    ring = (ring * gate)[:N - a0]; mix[a0:a0 + len(ring)] += ring

    def bed(name, level_db, lo=None):
        x, sr = sf.read(P('audio/sfx', name), always_2d=True); x = x.astype(np.float32)
        if x.shape[1] == 1: x = np.repeat(x, 2, 1)
        assert sr == SR
        while len(x) < N + SR: x = np.concatenate([x, x[::-1]])
        x = x[SR // 2:SR // 2 + N]
        if lo: x = sosfiltfilt(butter(2, lo, btype='lowpass', fs=SR, output='sos'), x, axis=0).astype(np.float32)
        return x * (10 ** (level_db / 20) / rms(x))
    up = np.clip((t - (hit - 2.0)) / 2.2, 0, 1).astype(np.float32)[:, None]   # the yard's air comes up under the last bars and is there when the music stops
    mix += (bed('wind_vale.flac', -31.0, lo=3500) + bed('crowd_presence.flac', -40.0)) * up

    def voice(a, b, at, gain_db=0.0):
        v = audio('out/takes/Q08B_t2.mp4', a, b)
        v = sosfiltfilt(butter(2, 110, btype='highpass', fs=SR, output='sos'), v, axis=0).astype(np.float32)   # the take's low hum out from under him
        f = int(0.03 * SR); v[:f] *= np.linspace(0, 1, f)[:, None]; v[-f:] *= np.linspace(1, 0, f)[:, None]
        i = int(at * SR); v = v[:N - i]; mix[i:i + len(v)] += v * 10 ** (gain_db / 20)
        return round(at, 2), round(at + len(v) / SR, 2)
    t1 = voice(5.58, 7.62, starts[-3] / FPS + 0.42)                          # "We did not attack your city, Admiral." on her face
    t2 = voice(9.80, 10.88, starts[-1] / FPS + 0.38)                         # "We stopped carrying it." on her profile
    f = int(0.35 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None]
    peak = float(np.abs(mix).max())
    wav = P('out/edits/Below_montage_v1.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    out = P('out/review/Below_montage_v1.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', pic, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                    '-movflags', '+faststart', out], check=True)
    rec = {'file': 'out/edits/Below_montage_v1.mp4', 'frames': n, 'seconds': round(n / FPS, 3), 'song': 'audio/song/SONG_demo1.mp3',
           'song_time_at_start_s': round(SONG0, 3), 'beat_s': BEAT, 'song_gain_db': SONG_GAIN_DB, 'music_stops_at_frame': stop_f, 'music_stops_at_s': round(hit, 3),
           'shots_start_frames': [int(s) for s in starts], 'shots_beats': [[a, b] for a, b, _ in plan], 'voice_1_s': t1, 'voice_2_s': t2,
           'peak_dbfs': round(20 * np.log10(peak), 2)}
    json.dump(rec, open(P('out/edits/Below_montage_v1.json'), 'w'), indent=1); print(rec)


if __name__ == '__main__':
    main()
