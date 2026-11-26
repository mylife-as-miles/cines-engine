#!/usr/bin/env python3
"""Q03B take 1, shot 1 re-cut by editing only, so that the rock leaves the MOUNTAIN. Nothing is generated.

As generated, a block of rock comes down out of the mass overhead, lands in front of the Anvil, stands the height
of the cliff, cracks and collapses. The script says the face of the mountain lets go. Two things make it so:

  1. The shot no longer shows the block arriving, and shows it standing whole for as short a time as it can. It
     holds on the intact mountain for a second, then dissolves (ten frames) into the moment the block cracks: a
     section of the face goes dark and shatters.
  2. Everything above the mountain's rim is put back to the empty band of sky for the whole shot (the camera is
     locked off; the clean sky is the first frames of the same shot), so nothing connects the rock to the mass
     above. Below the rim the take is untouched: the slab cracks, breaks and falls, and the dust blooms.

Shots 2 and 3 are as generated.

  python3 tools/fix_q03b_t1.py     ->  out/edits/Q03B_t1_fixed.mp4 (+ .wav: the model's sound, conformed)
"""
import os, subprocess, wave
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, 'out/takes/Q03B_t1.mp4')
DST = os.path.join(HERE, 'out/edits/Q03B_t1_fixed.mp4')
W, H, FPS, SR = 992, 432, 24, 48000
S2, S3, END = 102, 177, 289        # first frames of shots 2 and 3 (cuts at 4.25 and 7.375 s); the take has 289 frames
STAND = 66                          # 2.75 s: the block stands the height of the cliff and is about to crack (it cracks at 3.0 s)
HOLD = list(range(0, 10)) + list(range(8, -1, -1)) + list(range(1, 6))     # the intact mountain, held: 24 frames, one second
MIX = 10                            # frames of dissolve from the intact mountain to the standing slab
RIM = 70                            # the mountain's rim in the frame (px from the top), across the middle of the picture


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def blur(a, sigma):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(sigma))).astype(np.float32) / 255


def main():
    os.makedirs(os.path.dirname(DST), exist_ok=True)
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
    src = np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3)
    assert len(src) == END, len(src)
    F = lambda i: src[i].astype(np.float32) / 255

    # the clean sky above the rim: the median of the frames before the block enters
    sky = np.median(np.stack([F(i) for i in range(0, 9)]), axis=0)
    y = np.arange(H, dtype=np.float32)[:, None]; x = np.arange(W, dtype=np.float32)[None, :]
    above = (1 - smooth(y, RIM - 4, RIM + 8)) * smooth(x, 230, 290) * (1 - smooth(x, 700, 760))
    above = blur(above.astype(np.float32), 2.0)[..., None]

    def keep_sky(f):
        return f * (1 - above) + sky * above

    frames = [keep_sky(F(i)) for i in HOLD]
    for k in range(MIX):                                              # the face goes dark and comes forward
        a = (k + 1) / (MIX + 1); a = a * a * (3 - 2 * a)
        calm = F(min(6 + k, 9))
        frames.append(keep_sky(calm * (1 - a) + F(STAND + k) * a))
    for i in range(STAND + MIX, S2):                                  # it cracks, breaks and falls
        frames.append(keep_sky(F(i)))
    n1 = len(frames)
    for i in range(S2, END):
        frames.append(src[i])

    # sound: the model's track, conformed (the fall is meant to be silent; the track is replaced in the mix anyway)
    tmp = DST.replace('.mp4', '_src.wav'); out_wav = DST.replace('.mp4', '.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-vn', '-ac', '2', '-ar', str(SR), '-c:a', 'pcm_s16le', tmp], check=True)
    with wave.open(tmp) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(np.float32) / 32768
    os.remove(tmp)
    s = lambda fr: int(round(fr * SR / FPS))
    xf = int(0.02 * SR)
    head = a[s(0):s(n1 - (S2 - STAND - MIX)) + xf].copy()             # the opening air, for the hold and the dissolve
    tail = a[s(STAND + MIX) - xf:].copy()                             # then the take's own sound from the standing slab on
    ramp = np.linspace(0, 1, xf, dtype=np.float32)[:, None]
    head[-xf:] = head[-xf:] * (1 - ramp) + tail[:xf] * ramp
    snd = np.concatenate([head, tail[xf:]])
    with wave.open(out_wav, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(snd, -1, 1) * 32767).astype(np.int16).tobytes())

    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-i', out_wav, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p',
                            '-af', 'apad', '-c:a', 'aac', '-b:a', '192k', '-t', f'{len(frames) / FPS:.4f}', DST], stdin=subprocess.PIPE)
    for f in frames:
        if f.dtype != np.uint8:
            f = np.clip(f * 255 + 0.5, 0, 255).astype(np.uint8)
        enc.stdin.write(f.tobytes())
    enc.stdin.close(); enc.wait()
    print(f'{DST}: {len(frames)} frames, {len(frames) / FPS:.2f} s; shot 1 is {n1} frames ({n1 / FPS:.2f} s); cuts at {n1 / FPS:.3f} and {(n1 + S3 - S2) / FPS:.3f} s')


if __name__ == '__main__':
    main()
