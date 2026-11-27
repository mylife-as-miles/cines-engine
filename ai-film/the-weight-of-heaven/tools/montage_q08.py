#!/usr/bin/env python3
"""Q08 as a montage, cut from the clips of both rounds. Editing only; nothing generated.

    /root/leonxlnx/earshot/.venv/bin/python tools/montage_q08.py   ->  out/review/Q08_montage_v1.mp4

The author, 27 November, on both rounds of Q08: "None of this thing looks good... Remove what is not good"; then "let's
see what we can do with all the clips from both your previous and this scene"; "I prefer this ones scene" (the first
round's spear shot); the line "feels so weird and nonsense... she just came there and you're saying that... this part
could be a montage"; and "it will be better in the off-screen voiceover".

So: no fall, no stumble, no one speaking to the camera. Short images, the first round's where the author prefers them,
and Karst's two sentences heard off-screen over closed mouths, the second one landing on Serath's face.

  picture  1 her boot reaches the ground (round 1, cut before her knees give)
           2 Marl gives the farmer a spear; his hand finds the bowl (round 1)
           3 they turn and watch her pass (round 1)
           4 she stands white between two dark backs (round 2, pushed in; after her stumble, before the aide falls)
           5 Karst, silent, looking at her (round 2, pushed in to 150 %)
           6 the collar: her head comes up (round 1)            <- off-screen: "We did not attack your city, Admiral."
           7 Karst, silent (round 2, his held end)
           8 her eyes come up to him (round 1)                   <- off-screen: "We stopped carrying it."
  sound    a bed made of sounds already in the film (wind, a crowd's presence), and Karst's voice lifted from the
           second round's take. Nothing of the takes' own drones or footfalls.
  grade    the first round's shots brought down and cooled to sit with the second round's; a soft vignette.

Shots 2 to 4 (about five seconds) are where a line of Serath's would lie if the author wants one made.
"""
import os, subprocess, io
import numpy as np
import soundfile as sf
from PIL import Image
from scipy import ndimage
from scipy.signal import butter, sosfiltfilt

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
W, H, FPS, SR = 992, 432, 24, 48000


def frames(path):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', P(path), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3)


def audio(path, a=None, b=None):
    cmd = ['ffmpeg', '-v', 'error'] + (['-ss', f'{a:.3f}', '-t', f'{b - a:.3f}'] if a is not None else []) + ['-i', P(path), '-vn', '-ac', '2', '-ar', str(SR), '-f', 'wav', '-']
    x, _ = sf.read(io.BytesIO(subprocess.run(cmd, capture_output=True, check=True).stdout), always_2d=True)
    return x.astype(np.float32)


def push(f, cx, cy, z):
    w, h = W / z, H / z; x0 = float(np.clip(cx - w / 2, 0, W - w)); y0 = float(np.clip(cy - h / 2, 0, H - h))
    im = Image.fromarray(f).crop((int(x0), int(y0), int(x0 + w), int(y0 + h))).resize((W, H), Image.LANCZOS)
    return np.asarray(im)


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIG = (1 - 0.20 * np.clip(np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)) - 0.55, 0, 1) ** 1.5)[..., None]


def grade(f, gain=(1.0, 1.0, 1.0), lift=0.0):
    a = f.astype(np.float32) / 255
    a = np.clip((a * np.array(gain, np.float32) - lift) / (1 - lift), 0, 1) * VIG
    return (a * 255 + 0.5).astype(np.uint8)


def main():
    A1, B1 = frames('out/takes/Q08A_t1.mp4'), frames('out/takes/Q08B_t1.mp4')
    A2, B2 = frames('out/takes/Q08A_t2.mp4'), frames('out/takes/Q08B_t2.mp4')
    R1 = dict(gain=(0.80, 0.83, 0.87), lift=0.012)                     # the first round, down and cooler
    shots = [
        [grade(f, **R1) for f in A1[0:17]],                           # 1 her boot reaches the ground
        [grade(f, **R1) for f in B1[0:56]],                           # 2 the spear and the bowl
        [grade(f, **R1) for f in B1[58:100]],                         # 3 they watch her pass
        [grade(push(f, 560, 235, 1.35), gain=(0.96, 0.97, 1.0)) for f in A2[110:139]],   # 4 white between two dark backs
        [grade(push(f, 485, 150, 1.5), gain=(1.12, 1.12, 1.14)) for f in B2[89:109]],    # 5 Karst, silent (to just before he draws breath)
        [grade(f, **R1) for f in A1[132:196]],                        # 6 the collar: her head comes up
        [grade(push(f, 485, 150, 1.5), gain=(1.12, 1.12, 1.14)) for f in B2[262:282]],   # 7 Karst, silent
        [grade(f, **R1) for f in A1[196:225]],                        # 8 her eyes
    ]
    starts = np.cumsum([0] + [len(s) for s in shots]); n = int(starts[-1])
    out = P('out/review/Q08_montage_v1.mp4'); silent = out.replace('.mp4', '_silent.mp4')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                            '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', silent], stdin=subprocess.PIPE)
    for s in shots:
        for f in s:
            enc.stdin.write(f.tobytes())
    enc.stdin.close(); enc.wait()

    # ---- sound: a bed from the film's own local sounds, and Karst's voice off-screen
    N = n * SR // FPS; mix = np.zeros((N, 2), np.float32)
    rms = lambda x: float(np.sqrt((x ** 2).mean()) + 1e-9)
    def bed(name, level_db, lo=None):
        x, sr = sf.read(P('audio/sfx', name), always_2d=True); x = x.astype(np.float32)
        if x.shape[1] == 1: x = np.repeat(x, 2, 1)
        if sr != SR: x = x[np.round(np.arange(0, len(x), sr / SR)).astype(int).clip(0, len(x) - 1)]
        while len(x) < N + SR: x = np.concatenate([x, x[::-1]])
        x = x[SR // 2:SR // 2 + N]
        if lo: x = sosfiltfilt(butter(2, lo, btype='lowpass', fs=SR, output='sos'), x, axis=0).astype(np.float32)
        return x * (10 ** (level_db / 20) / rms(x))
    mix += bed('wind_vale.flac', -33.0, lo=3500) + bed('crowd_presence.flac', -41.0)
    def voice(a, b, at, gain_db=0.0):
        v = audio('out/takes/Q08B_t2.mp4', a, b)
        v = sosfiltfilt(butter(2, 110, btype='highpass', fs=SR, output='sos'), v, axis=0).astype(np.float32)   # the take's low hum out from under him
        f = int(0.03 * SR); v[:f] *= np.linspace(0, 1, f)[:, None]; v[-f:] *= np.linspace(1, 0, f)[:, None]
        i = int(at * SR); mix[i:i + len(v)] += v[:N - i] * 10 ** (gain_db / 20)
        return round(at, 2), round(at + len(v) / SR, 2)
    t1 = voice(5.58, 7.62, starts[5] / FPS + 0.20)                     # "We did not attack your city, Admiral." over her head coming up
    t2 = voice(9.80, 10.88, starts[7] / FPS + 0.10)                    # "We stopped carrying it." on her eyes
    f = int(0.4 * SR); mix[:f] *= np.linspace(0, 1, f)[:, None]; f = int(0.5 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None]
    peak = float(np.abs(mix).max())
    wav = out.replace('.mp4', '.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '224k',
                    '-movflags', '+faststart', out], check=True)
    os.remove(silent); os.remove(wav)
    print({'file': 'out/review/Q08_montage_v1.mp4', 'frames': n, 'seconds': round(n / FPS, 2), 'shots_start_s': [round(int(s) / FPS, 2) for s in starts[:-1]],
           'voice_1_s': t1, 'voice_2_s': t2, 'peak_dbfs': round(20 * np.log10(peak), 1)})


if __name__ == '__main__':
    main()
