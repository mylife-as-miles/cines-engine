#!/usr/bin/env python3
"""Q11 take A (the hand), mended in the edit: the hand comes to rest on the rock while the rock still has its size.

    /root/leonxlnx/earshot/.venv/bin/python tools/mend_q11_hand.py
        ->  out/edits/Q11H_t1_mended.mp4 (3.5 s, the take's own sound), out/review/Q11H_t1_mended_moments.jpg

The take (out/takes/Q11H_t1.mp4) is right until its hand lies on the rock, at about 2.1 s. After that the hand goes on
sinking and the rock under it shrinks to a quarter of its height. The author, 28 November, offered a second take: "Fix
with edit". So:

  0 to 2.08 s    the take as it came (frames 0 to 49): the rock alone, the hand coming down at its own speed.
  2.08 to 3.5 s  the next five and a half frames of the take (50 to 55.5), in which the fingers meet the rock, spread over
                 34 frames: the hand brakes, touches the rock at about 2.5 s (where the take's own hand lands at 2.6 s)
                 and settles. The in-between pictures are made by optical flow. The rock is whole through frame 56 of the
                 take; the hand never gets further.
  3.5 s          the shot ends. Held longer, a hand this still beside a locked camera reads as a frozen picture: two
                 models that watched 5-second versions at speed both said so. The take's own hand is at rest for about
                 a second at its end, and that much reads as a hand at rest.
  everything else  only the part of the picture that the hand, its sleeve, the rock and their shadows ever touch is slowed.
                 The slab, the papers, the lamp and its flame are the take's own picture at its own speed from first frame
                 to last, and the paper inside the slowed part follows the lamp (it flares a little at 3.8 s).

Nothing is generated. The sound is the take's own (to be rebuilt with the rest of the scene's).
"""
import os, subprocess
import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
W, H, FPS = 992, 432, 24
NAT, REST = 50, 56.0                              # frames played as they came; the take frame the hand must not pass (the rock is whole through 56)
SLOW, T_FAST, T_SLOW = 0.25, 3.0, 14.0            # the landing: the share of the speed that dies slowly, and the two time constants, in frames
LENGTH = 84                                       # frames of the mended shot (3.5 s): about a second of rest, as the take itself has, and no more
X0, X1 = 690, 730                                 # right of this the picture is always the take's own (the lamp; the hand reaches x = 659)


def flow_between(a, b, t):
    """the picture a fraction t of the way from frame a to frame b, by optical flow both ways"""
    if t < 0.02:
        return a.astype(np.float32)
    if t > 0.98:
        return b.astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    ga, gb = cv2.cvtColor(a, cv2.COLOR_RGB2GRAY), cv2.cvtColor(b, cv2.COLOR_RGB2GRAY)
    f = cv2.calcOpticalFlowFarneback(ga, gb, None, 0.5, 4, 25, 3, 7, 1.5, 0); g = cv2.calcOpticalFlowFarneback(gb, ga, None, 0.5, 4, 25, 3, 7, 1.5, 0)
    ma = cv2.remap(a, xx - t * f[..., 0], yy - t * f[..., 1], cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
    mb = cv2.remap(b, xx - (1 - t) * g[..., 0], yy - (1 - t) * g[..., 1], cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
    return (1 - t) * ma + t * mb


def positions(n):
    """where in the take the slowed part of each frame comes from. The hand comes on at the take's speed to frame NAT,
    then slows the way the take's own hand slows when it lands (measured: 3.5 pixels a frame, 1 within a few frames, then
    0.5, 0.2, under 0.1 over two seconds), only sooner, so that it is still settling at the last frame and ends at REST"""
    pos = [float(i) for i in range(NAT)]
    for k in range(n - NAT):
        pos.append(float(NAT + (1 - SLOW) * T_FAST * (1 - np.exp(-k / T_FAST)) + SLOW * T_SLOW * (1 - np.exp(-k / T_SLOW))))
    assert pos[-1] <= REST, pos[-1]
    return pos


def touched(f):
    """the part of the picture that changes from frame NAT on (the hand, its sleeve, the rock, their shadows), feathered"""
    blur = lambda a: cv2.GaussianBlur(a.astype(np.float32), (0, 0), 2)
    base = blur(f[NAT]); d = np.zeros((H, W), np.float32)
    for k in range(NAT, len(f)):
        d = np.maximum(d, (np.abs(blur(f[k]) - base) - 0.03 * base).max(2))  # 3 % is left for the lamp's flicker
    m = (d > 6).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45)))
    m = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 6)
    lamp = np.clip((np.arange(W, dtype=np.float32) - X0) / (X1 - X0), 0, 1); lamp = lamp * lamp * (3 - 2 * lamp)
    return m * (1 - lamp)[None, :]


PATCH = (slice(300, 420), slice(760, 900))             # the lamp-lit paper beside the lamp, never slowed


def lamp(live, f, a, t):
    """what the lamp is doing now against what it did in the slowed picture, for the paper it lights inside the slowed
    part (right of x = 520, full from x = 640). The skin does not follow the lamp in the take (its level holds within
    0.2 of 54 through the flare at 3.8 s), so the hand is left alone"""
    lvl = lambda x: float(x[PATCH].mean())
    g = lvl(live) / max(1.0, (1 - t) * lvl(f[a]) + t * lvl(f[min(a + 1, len(f) - 1)]))
    reach = np.clip((np.arange(W, dtype=np.float32) - 520) / 120, 0, 1); reach = reach * reach * (3 - 2 * reach)
    return 1 + (g - 1) * reach[None, :, None]


def main():
    src = P('out/takes/Q11H_t1.mp4')
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3); n = LENGTH
    pos = positions(n)
    m = touched(f)[..., None]
    out, edge = [], []
    for i, s in enumerate(pos):
        if i < NAT:
            out.append(f[i]); continue
        a = int(np.floor(s)); t = float(s - a)
        held = flow_between(np.ascontiguousarray(f[a]), np.ascontiguousarray(f[a + 1]), t)
        live = f[i].astype(np.float32)
        held = held * lamp(live, f, a, t)
        ring = (m[..., 0] > 0.05) & (m[..., 0] < 0.95)
        edge.append(float(np.abs(held - live)[ring].mean()))
        out.append(np.clip(held * m + live * (1 - m) + 0.5, 0, 255).astype(np.uint8))
    out = np.asarray(out)
    dst = P('out/edits/Q11H_t1_mended.mp4'); tmp = P('out/edits/_q11h_v.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-crf', '12',
                    '-preset', 'slow', '-pix_fmt', 'yuv420p', tmp], input=out.tobytes(), check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-i', src, '-map', '0:v', '-map', '1:a', '-t', f'{n / FPS:.4f}', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst], check=True)
    os.remove(tmp)
    np.save(P('out/edits/_q11h_mended.npy'), out); np.save(P('out/edits/_q11h_mask.npy'), m[..., 0])
    wd = 880; h = int(wd * H / W); sheet = Image.new('RGB', (wd * 3, h * 2))
    for j, k in enumerate((0, 60, n - 1)):
        sheet.paste(Image.fromarray(f[k]).resize((wd, h), Image.LANCZOS), (j * wd, 0)); sheet.paste(Image.fromarray(out[k]).resize((wd, h), Image.LANCZOS), (j * wd, h))
    sheet.save(P('out/review/Q11H_t1_mended_moments.jpg'), quality=92)
    d = np.abs(out[1:].astype(np.int16) - out[:-1].astype(np.int16))
    inside = m[..., 0] > 0.95
    print('frames', n, '| slowed part of the picture %.0f %%' % (100 * inside.mean()))
    print('take position of the slowed part, every 6th frame from', NAT, ':', [round(pos[i], 2) for i in range(NAT, n, 6)])
    print('change frame to frame inside the slowed part, per 6 frames:', [round(float(d[i:i + 6][:, inside].mean()), 2) for i in range(0, n - 1, 6)])
    print('slowed against live on the edge of the slowed part, per 6 frames from', NAT, ':', [round(float(np.mean(edge[i:i + 6])), 2) for i in range(0, len(edge), 6)])


if __name__ == '__main__':
    main()
