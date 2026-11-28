#!/usr/bin/env python3
"""The film so far, cut v24: cut v23 with the aide's fall gone for good and a first sound pass by stretching. Editing only.

    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v24.py
        ->  out/review/film_v24.mp4, out/review/film_v24_hall.mp4 (from the end of the descent to the end),
            out/edits/film_v24.wav, edit/film_v24.edl.json, out/review/film_v24_before_after.jpg

The author, 28 November, on cut v23: "And pls remove that scene of that guy falling...", with links to PaulXStretch and
Audacity ("Audio manipulation and pitch shifting"). Everything not named here is cut v23 (tools/combine_film_v24.py, whose
notes say which critic asked for what).

PICTURE
  the white figure between the dark backs now ends at take frame 124, while the aide behind her is still walking down
  the gangway upright. Cut v23 ran to frame 131, and in its last frames, slowed, he could be seen beginning to sink. The
  shot is 1.25 s (19 frames at 63 %); the valley is held 0.67 s longer before the cutter comes in, so that her close shot
  still begins on the song's last hit.

SOUND
  as cut v23, less two effects: the cloth under Karst's turn and the paper under the hand at the lamp. Two listening
  models, asked to choose, heard a metal latch and a ratchet in them.

A SECOND VERSION OF THE ENDING, for the author to judge: out/review/film_v24_bell.mp4 (and film_v24_bell_end.mp4, from
the shutters to the end). Made by stretching a recording (tools/stretch.py: Paulstretch, the method inside both tools the
author sent), nothing generated: as the shard is shown the room is taken away (10 dB across the cut) and the film's own
bell is heard, the first stroke of scene 1, once and far off, its ring stretched eight times into one held tone under the
shard and her face. She has not said "The marriage bell." yet (the line is not shot); the sound says it first. Asked what
it resembles, the listening models split: "a low sustained gong" and "a large bell reverberating" against "wind" and "a
synthesizer pad". Tried and dropped: the air of the plain made the same way (it stopped being air: "a synthesizer pad").
"""
import importlib.util, io, json, os, subprocess, sys
import cv2
import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.signal import butter, fftconvolve, sosfiltfilt

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)


def load(name):
    spec = importlib.util.spec_from_file_location(name, P('tools', name + '.py')); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


mq, gb, st = load('montage_q08'), load('grade_bell'), load('stretch')
W, H, FPS, SR = 992, 432, 24, 48000
LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
GRAIN = dict(json.load(open(P('grade/looks.json')))['looks']['orison']['grain'], amount=0.0065)
CUTTER_TO_V17 = np.array([[1.0039, 0.0013, 11.2767], [-0.0013, 1.0039, 6.5235]], np.float32)   # Q08A take 2, frame 0, onto cut v17's last frame (SIFT, 142 inliers)


def run(*a):
    subprocess.run(list(a), check=True)


def slow(fr, m):
    """m frames from len(fr), by motion-compensated interpolation"""
    fr = np.ascontiguousarray(fr); n = len(fr)
    for extra in (3, 6, 10, 16):                                             # the filter returns a few frames fewer than asked: ask for more, use the first m
        p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', f'{24.0 * n / (m + extra):.6f}', '-i', '-',
                            '-vf', 'minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                           input=fr.tobytes(), capture_output=True, check=True)
        out = np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3)
        if len(out) >= m:
            break
    assert len(out) >= m - 2, (len(out), m)
    return [out[min(i, len(out) - 1)] for i in range(m)]


def midframe(a, b):
    """the picture halfway between two frames, by optical flow both ways, lightly sharpened (a warp softens)"""
    a, b = np.ascontiguousarray(a), np.ascontiguousarray(b)
    ga, gb_ = cv2.cvtColor(a, cv2.COLOR_RGB2GRAY), cv2.cvtColor(b, cv2.COLOR_RGB2GRAY)
    f = cv2.calcOpticalFlowFarneback(ga, gb_, None, 0.5, 4, 25, 3, 7, 1.5, 0); g = cv2.calcOpticalFlowFarneback(gb_, ga, None, 0.5, 4, 25, 3, 7, 1.5, 0)
    ma = cv2.remap(a, xx - 0.5 * f[..., 0], yy - 0.5 * f[..., 1], cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    mb = cv2.remap(b, xx - 0.5 * g[..., 0], yy - 0.5 * g[..., 1], cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    m = 0.5 * ma.astype(np.float32) + 0.5 * mb.astype(np.float32)
    m = m + 0.6 * (m - cv2.GaussianBlur(m, (0, 0), 1.0))
    return np.clip(m + 0.5, 0, 255).astype(np.uint8)


def repair(Q, a, b):
    """frames a..b-1 of a take that holds one frame in every four and then jumps: the same number of frames, evenly moving"""
    d = np.array([np.abs(Q[i].astype(np.int16) - Q[i - 1].astype(np.int16)).mean() for i in range(a + 1, b + 2)]); idx = np.arange(a + 1, b + 2)
    ph = [float(d[idx % 4 == p].mean()) for p in range(4)]; p0 = int(np.argmin(ph))
    out = [np.asarray(Q[i]) for i in range(a, b)]
    if ph[p0] > 0.6 * float(np.median(ph)):
        return out                                                           # nothing is held here
    late = ph[(p0 + 2) % 4] > ph[(p0 + 1) % 4]                               # the jump comes one frame after the held one, not straight after it
    for i in range(a + 1, b):
        if i % 4 != p0:
            continue
        if late and i + 1 < b:
            out[i - a] = np.asarray(Q[i + 1]); out[i + 1 - a] = midframe(Q[i + 1], Q[i + 2])
        elif not late:
            out[i - a] = midframe(Q[i - 1], Q[i + 1])
    return out


def f32(f):
    return np.asarray(f).astype(np.float32) / 255


def u8(a):
    return (np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)


def rect(x0, y0, x1, y1, feather):
    m = ((xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)).astype(np.float32)
    return ndimage.gaussian_filter(m, feather) if feather else m


def ellipse(cx, cy, rx, ry, feather):
    m = ((((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2) <= 1).astype(np.float32)
    return ndimage.gaussian_filter(m, feather) if feather else m


def stops(a, s, mask=None):
    """exposure in stops, in linear light, through a mask (0..1) if one is given"""
    g = np.clip(a, 0, 1) ** 2.2 * (2.0 ** s)
    g = np.clip(g, 0, None) ** (1 / 2.2)
    return g if mask is None else a + (g - a) * (mask[..., None] if mask.ndim == 2 else mask)


def tone(a, mids=(0, 0, 0), highs=(0, 0, 0), high_stops=0.0):
    """colour in 8-bit code values, weighted to the midtones and to the highlights; and a gain on the highlights"""
    y = np.clip(a @ LUMA, 0, 1)
    wm = (4 * y * (1 - y))[..., None]
    wh = np.clip((y - 0.55) / 0.35, 0, 1)[..., None]; wh = wh * wh * (3 - 2 * wh)
    a = a + wm * np.array(mids, np.float32) / 255 + wh * np.array(highs, np.float32) / 255
    return stops(a, high_stops, wh) if high_stops else a


def crop(a, x0, y0, x1, y1):
    """a region given in fractions of the frame, enlarged to the whole frame"""
    im = Image.fromarray(u8(a)).resize((W, H), Image.LANCZOS, box=(x0 * W, y0 * H, x1 * W, y1 * H))
    return f32(im)


def knee(a, start=225, top=245):
    """highlights above `start` rolled into `top` (8-bit code values), with a soft bloom of what was above it"""
    s, t = start / 255, top / 255
    y = a @ LUMA
    over = np.clip((y - s) / (1 - s), 0, 1)
    k = np.where(y > s, (s + (t - s) * (1 - (1 - over) ** 2)) / np.maximum(y, 1e-4), 1.0)[..., None]
    out = a * k
    glow = ndimage.gaussian_filter(np.clip(a - 230 / 255, 0, 1), (12, 12, 0))
    return 1 - (1 - out) * (1 - 0.3 * glow)


YARD = dict(mids=(-5, 2, 3), high_stops=0.3)                                  # A 9c: one look over the whole yard


def main():
    A1, B1 = mq.frames('out/takes/Q08A_t1.mp4'), mq.frames('out/takes/Q08B_t1.mp4')
    A2 = mq.frames('out/takes/Q08A_t2.mp4')
    Q9, Q10 = mq.frames('out/takes/Q09_t1.mp4'), mq.frames('out/takes/Q10_t1.mp4')
    v17 = json.load(open(P('edit/film_v17.edl.json'))); n17 = v17['frames']
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', P('out/review/film_v17.mp4'), '-vf', f"select='between(n\\,{n17 - 8}\\,{n17 - 1})'", '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                       capture_output=True, check=True)
    v17_last = f32(np.frombuffer(p.stdout, np.uint8).reshape(8, H, W, 3)).mean(0)        # the descent's last picture, its grain averaged out of eight frames
    R1 = dict(gain=(0.80, 0.83, 0.87), lift=0.012)
    shots = []                                                               # (name, frames as float arrays, one frame before the changes, its own grain if any)

    # ---------------- the yard
    base = [f32(cv2.warpAffine(np.ascontiguousarray(f), CUTTER_TO_V17, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)) * 0.965 for f in A2[0:70]]             # 0.965: its level set to the descent's last frame
    fr = [a if k >= 4 else a + (v17_last - a) * (0.8 - 0.2 * k) for k, a in enumerate(base)]             # a four-frame dissolve out of the descent's last frame
    fr = [a * 1.016 for a in [v17_last] * 22 + fr]                                                       # the valley held 0.9 s more before the cutter comes in (1.016: the grain takes 1.6 % off the level)
    shots.append(('the cutter over the wall', fr, f32(A2[30]), dict(amount=0.0185, size=1.25)))         # its grain matched to the descent's own (frame difference 4.3, measured after encoding)
    base = [f32(mq.grade(f, **R1)) for f in B1[0:58]]
    shots.append(('the spear', [tone(tone(a, mids=(3, 0, -3), highs=(8, 0, -7)), **YARD) for a in base], base[30], None))
    src = slow(A2[106:125], 30)                                              # to frame 124: the aide behind her is still upright on the gangway
    base = [f32(mq.grade(u8(crop(f32(f), 0.09, 0.11, 0.98, 1.0)), gain=(0.96, 0.97, 1.0))) for f in src]
    shots.append(('white between dark backs', [tone(tone(a, mids=(-2, 0, 2), high_stops=0.7), **YARD) for a in base], f32(mq.push(A2[118], 560, 235, 1.35)), None))
    n_pre = sum(len(s[1]) for s in shots)
    assert n_pre == 180, n_pre                                               # her close shot begins on the song's last hit (2:27.48)
    base = [f32(mq.grade(f, **R1)) for f in A1[132:225]]
    shots.append(('Serath close', [tone(tone(a, high_stops=-0.4), **YARD) for a in base], base[46], None))
    base = [f32(mq.grade(f, gain=(0.96, 0.97, 1.0))) for f in A2[222:264]]
    shots.append(('her profile', [tone(crop(a, 0.0, 0.0, 0.80, 0.80), **YARD) for a in base], base[15], None))
    n_yard = len(shots)

    # ---------------- the hall
    slab, face, coat = rect(0, 0, 640, H, 25), ellipse(775, 190, 105, 185, 30), rect(815, 325, W, H, 15)
    def h1(a):
        return crop(stops(stops(stops(a, -1.5, slab), 1.8, face), -1.7, coat), 0.138, 0.138, 1.0, 1.0)
    base = [f32(f) for f in Q9[10:69]]
    shots.append(('her profile at the slab', [h1(a) for a in base], base[30], None))
    src = slow(Q9[153:209], 140) + [f for f in Q9[209:223]]
    base = [f32(f) for f in src]
    shots.append(('the hall, wide', [crop(a, 0.14, 0.0, 1.0, 0.86) for a in base], base[70], None))
    kcoat = np.clip(rect(452, 105, 548, 340, 5) + rect(458, 340, 540, H, 5), 0, 1); leaves = rect(180, 0, 810, H, 0)
    def h3(a, k):
        r = float(np.clip((k / FPS - 1.18) / 1.0, 0, 1))                     # in over a second, as the shutters come open
        y = a @ LUMA
        warm = np.clip((a[..., 0] - a[..., 2] + 0.01) / 0.02, 0, 1)          # the coat and the wood are warm; the basalt and the sky are not
        key = kcoat * (y < 150 / 255) * warm
        a2 = stops(a, -2.0 * r, ndimage.gaussian_filter(key.astype(np.float32), 2))
        wood = np.clip((y - 0.30) / 0.08, 0, 1) * np.clip((0.86 - y) / 0.06, 0, 1) * warm * leaves * (1 - kcoat)
        a2 = stops(a2, -1.8 * r, ndimage.gaussian_filter(wood.astype(np.float32), 3))      # B: the pale door leaves down, so the frame is black, light, black
        return knee(a2, 225, 245)
    base = [f32(f) for f in Q9[223:335]]
    shots.append(('Karst opens the shutters', [h3(a, k) for k, a in enumerate(base)], base[100], None))
    ramp = np.clip((xx - 250) / (W - 250), 0, 1); col4 = rect(120, 290, 360, 400, 20)
    def h4(a):
        a = stops(stops(a, -1.75), -0.8, ramp)
        y = np.clip(a @ LUMA, 0, 1)[..., None]; wh = np.clip((y - 0.25) / 0.4, 0, 1)
        a = a * (1 + wh * (np.array([0.97, 1.0, 1.04], np.float32) - 1))
        return np.ascontiguousarray(stops(a, -0.7, col4)[:, ::-1])           # mirrored: she stays on the right of the frame, facing the slab on the left
    base = [f32(f) for f in slow(Q9[357:371], 22)[:17]]                      # out as the turn begins, her eyes still shut (after it they show white)
    shots.append(('Serath turns', [h4(a) for a in base], base[14], None))
    base = [f32(f) for f in Q9[516:586]]
    shots.append(('Karst at the opening', base, base[35], None))
    src = slow(np.asarray(repair(Q10, 166, 183)), 26)
    door, far = rect(366, 8, 446, 160, 6), rect(448, 0, 560, 192, 10)
    def h6(a):
        o = stops(a, 4.0, door)                                              # the doorway back to the daylight just seen (F: it stood 2 stops under it)
        o = o + (door[..., None] * (np.array([0.03, 0.0, -0.04], np.float32) * o))
        o = stops(o, -3.6, far)                                              # the pale figure with no head, down into the dark of the wall
        return knee(o, 225, 240)
    base = [f32(f) for f in src]
    shots.append(('the lamp', [h6(a) for a in base], base[13], None))
    vig = 1 - ellipse(520, 230, 420, 200, 90); bottom = np.clip((yy - 0.80 * H) / (0.20 * H), 0, 1)
    def h7(a):
        a = np.clip((a - 11 / 255) / (1 - 11 / 255), 0, 1)
        blue = np.clip((a[..., 2] - a[..., 0]) * 12, 0, 1)[..., None]
        g = (a @ LUMA)[..., None]
        a = a + (g - a) * 0.5 * blue
        return stops(stops(a, -1.0, vig), -0.7, bottom)
    base = [f32(f) for f in repair(Q10, 384, 469)]                           # the same 85 frames, the held ones rebuilt
    shots.append(('the shard', [h7(a) for a in base], base[42], None))
    src = slow(Q10[484:506], 44) + [f for f in Q10[506:513]]                 # out as her eyes begin to lift, before they reach the lens
    sockets = np.clip(ellipse(0.55 * W, 0.37 * H, 0.05 * W, 0.06 * H, 8) + ellipse(0.695 * W, 0.37 * H, 0.045 * W, 0.06 * H, 8), 0, 1)
    def h8(a):
        a = crop(a, 0.06, 0.0, 0.81, 0.75)
        up = np.clip(((a @ LUMA) - 12 / 255) / (12 / 255), 0, 1)             # a stop up above code 12: the black stays black
        return stops(stops(a, 1.0, up), 0.5, sockets)
    base = [f32(f) for f in src]
    shots.append(('her face', [h8(a) for a in base], base[30], None))

    names = [s[0] for s in shots]; starts = np.cumsum([0] + [len(s[1]) for s in shots]); n_new = int(starts[-1])
    at = {nm: n17 + int(s) for nm, s in zip(names, starts)}                  # the film frame each shot starts on
    n = n17 + n_new
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    out = P('out/review/film_v24.mp4'); a_mp4 = P('out/edits/_v24_a.mp4'); b_mp4 = P('out/edits/_v24_b.mp4'); lst = P('out/edits/_v23.txt'); silent = P('out/edits/_v24_silent.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-i', P('out/review/film_v17.mp4'), '-map', '0:v', '-c:v', 'copy', '-an', a_mp4)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                            '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709',
                            '-color_trc', 'bt709', '-video_track_timescale', '12288', b_mp4], stdin=subprocess.PIPE)
    k = 0; after = []
    for name, fr, before, amount in shots:
        gr = dict(GRAIN, **amount) if amount else GRAIN
        for i, a in enumerate(fr):
            g = np.clip(gb.grain(np.clip(a, 0, 1).astype(np.float32).copy(), n17 + k, gr), 0, 1)
            o = u8(g); o[:top] = 0; o[top + band:] = 0
            if i == len(fr) // 2:
                after.append(o.copy())
            enc.stdin.write(o.tobytes()); k += 1
    enc.stdin.close(); assert enc.wait() == 0 and k == n_new
    open(lst, 'w').write(f"file '{a_mp4}'\nfile '{b_mp4}'\n")
    run('ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', silent)
    w = 400; h = int(w * H / W); sheet = Image.new('RGB', (4 * w, ((len(shots) + 1) // 2) * (h + 16)), (16, 17, 20)); dr = ImageDraw.Draw(sheet)
    for i, (name, fr, before, _) in enumerate(shots):
        x = (i % 2) * 2 * w; y = (i // 2) * (h + 16)
        sheet.paste(Image.fromarray(u8(before)).resize((w, h)), (x, y + 16)); sheet.paste(Image.fromarray(after[i]).resize((w, h)), (x + w, y + 16))
        dr.text((x + 4, y + 2), f'{name}: before | after   ({len(fr)} frames, at {(n17 + int(starts[i])) / FPS:.2f} s)', fill=(232, 232, 232))
    sheet.save(P('out/review/film_v24_before_after.jpg'), quality=88)

    # ---------------- sound
    old, _ = sf.read(P('out/edits/film_v20.wav'), always_2d=True); old = old.astype(np.float32)
    def aud(path, a=None, b=None):
        cmd = ['ffmpeg', '-v', 'error'] + (['-ss', f'{a:.4f}', '-t', f'{b - a:.4f}'] if a is not None else []) + ['-i', P(path), '-vn', '-ac', '2', '-ar', str(SR), '-f', 'wav', '-']
        x, _ = sf.read(io.BytesIO(subprocess.run(cmd, capture_output=True, check=True).stdout), always_2d=True)
        return x.astype(np.float32)
    def sfx(name):
        x, sr = sf.read(P('audio/sfx', name), always_2d=True); assert sr == SR
        return (np.repeat(x, 2, 1) if x.shape[1] == 1 else x).astype(np.float32)
    rms = lambda x: float(np.sqrt((x ** 2).mean()) + 1e-9)
    db = lambda d: 10 ** (d / 20)
    S = lambda fr: int(round(fr * SR / FPS))
    N = S(n); mix = np.zeros((N, 2), np.float32); hall = np.zeros((N, 2), np.float32)       # `hall` is everything that sounds in the room: it gets the room's reverb
    q = int(0.03 * SR)
    def lay(buf, x, at_, fin=q, fout=q):
        x = x.copy(); x[:fin] *= np.linspace(0, 1, fin)[:, None]; x[-fout:] *= np.linspace(1, 0, fout)[:, None]
        at_ = max(0, at_); x = x[:max(0, N - at_)]; buf[at_:at_ + len(x)] += x
    i5 = S(at['her profile'])                                                # up to here it is cut v20's own mix: the song, the yard's air, Karst's first sentence
    assert at['Serath close'] == 3540 and at['her profile'] == 3633
    mix[:i5] = old[:i5]
    # the cutter passing the wall: air and timber, under the song
    air = sosfiltfilt(butter(2, [150, 1500], btype='bandpass', fs=SR, output='sos'), sfx('wind_altitude.flac')[SR * 5:SR * 5 + int(2.2 * SR)], axis=0).astype(np.float32)
    air *= (np.hanning(len(air)) ** 1.5)[:, None].astype(np.float32); lay(mix, air * (db(-29) / rms(air)), S(n17 + 22) - int(0.05 * SR))        # 4 dB under cut v23's: here it meets a peak of the song
    tim = sfx('q07/timber.flac'); lay(mix, tim * (db(-28) / np.abs(tim).max()), S(n17 + 22) + int(0.30 * SR))
    L5 = S(len(shots[4][1]))
    lay(mix, old[int(150.0 * SR):int(150.0 * SR) + L5 + q], i5 - q // 2)     # the yard's own air, from where it is clean of words
    v = aud('out/takes/Q08B_t2.mp4', 9.80, 10.88); v = sosfiltfilt(butter(2, 110, btype='highpass', fs=SR, output='sos'), v, axis=0).astype(np.float32)
    t2 = at['her profile'] / FPS + 0.10; lay(mix, v, int(t2 * SR))            # "We stopped carrying it." on her profile
    # the hall: the take's own sound, unbroken, under the slab, the wide, the shutters and her turn (take frames 10 to 352)
    x9 = aud('out/takes/Q09_t1.mp4'); t9 = np.arange(len(x9)) / SR
    x9 *= db(4.0 * np.clip(np.minimum(t9 - 6.55, 9.15 - t9) / 0.15, 0, 1)).astype(np.float32)[:, None]       # "until the fire is stone.", 4 dB up
    ih = S(at['her profile at the slab']); iK = S(at['Karst at the opening']); xf = int(0.25 * SR)
    assert at['Karst at the opening'] - at['her profile at the slab'] == 342
    lay(hall, x9[S(10):S(352) + xf], ih, fout=xf)
    t_chosen = at['Karst at the opening'] / FPS + 0.25
    lay(hall, x9[int(16.95 * SR):int(17.90 * SR)], int(t_chosen * SR))        # "We were chosen." over his back
    # from his turn on: room tone made from the take's own spectrum (no loop), and what the pictures show
    ref = x9[int(23.75 * SR):int(24.45 * SR)]; nfft = 4096
    spec = np.mean([np.abs(np.fft.rfft(ref[i:i + nfft, 0] * np.hanning(nfft))) for i in range(0, len(ref) - nfft, nfft // 4)], axis=0)
    rng = np.random.default_rng(23); need = N - iK + xf
    def tone_bed():
        wn = rng.standard_normal(need + 2 * nfft).astype(np.float32); o = np.zeros(need + 3 * nfft, np.float32); win = np.hanning(nfft).astype(np.float32)
        for i in range(0, need + nfft, nfft // 2):
            o[i:i + nfft] += np.fft.irfft(np.fft.rfft(wn[i:i + nfft] * win) * spec, nfft).astype(np.float32) * win
        return o[nfft:nfft + need]
    room = np.stack([tone_bed(), tone_bed()], 1); room *= rms(ref) / rms(room)
    lay(hall, room, iK - xf, fin=xf, fout=int(0.4 * SR))
    # (cut v23 laid cloth under his turn and paper under the hand at the lamp: two listening models heard a latch and a ratchet, so both are out)
    # the room: the council hall's impulse, shortened to 1.8 s, 13 dB under the voice
    ir = sfx('hall_impulse.flac'); pk = int(np.argmax(np.abs(ir).sum(1))); ir = ir[pk + int(0.006 * SR):pk + int(2.6 * SR)]
    ir *= (10 ** (-3 * np.arange(len(ir)) / SR * (1 / 1.8 - 1 / 6.59)))[:, None].astype(np.float32)
    h0 = ih - SR; wet = np.stack([fftconvolve(hall[h0:, c], ir[:, c])[:N - h0] for c in (0, 1)], 1).astype(np.float32)
    a_, b_ = int((at['her profile at the slab'] / FPS + 12.3) * SR) - h0, int((at['her profile at the slab'] / FPS + 14.3) * SR) - h0     # over "It was stone within forty years."
    wet *= db(-13.0) * rms(hall[h0:][a_:b_]) / rms(wet[a_:b_])
    mix[h0:] += hall[h0:] + wet
    # the air of the plain, from the opening of the shutters to the end
    t_open = at['Karst opens the shutters'] / FPS + 1.2; io_ = int(t_open * SR); L = N - io_
    pl = sfx('wind_vale.flac')
    while len(pl) < L + 12 * SR:
        pl = np.concatenate([pl, pl[::-1]])
    pl = sosfiltfilt(butter(2, 900, btype='lowpass', fs=SR, output='sos'), pl[11 * SR:11 * SR + L], axis=0).astype(np.float32)
    tt = np.arange(L) / SR; env = np.clip(tt / 1.5, 0, 1) ** 1.5 * (1 - 0.2 * np.clip((tt - 1.5) / 2.0, 0, 1))           # in as the leaves part, then settling 2 dB
    pl *= (db(-32.0) / rms(pl)) * env[:, None].astype(np.float32); pl[-int(0.4 * SR):] *= np.linspace(1, 0, int(0.4 * SR))[:, None]
    mix[io_:] += pl
    peak = float(np.abs(mix).max())
    wav = P('out/edits/film_v24.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    run('ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
        '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out)
    mixb = mix.copy()                                                         # the second version: the same film with the bell under the shard
    # the shard: the room is taken away, and the film's own bell is heard, its ring stretched into one held tone
    i_sh = S(at['the shard']); t_ = (np.arange(N - i_sh + int(0.3 * SR)) - int(0.3 * SR)) / SR
    duck = db(-10.0 * np.clip((t_ + 0.3) / 0.8, 0, 1)).astype(np.float32)
    mixb[i_sh - int(0.3 * SR):] *= duck[:, None]
    bell, sr_b = sf.read(P('out/edits/stems/bell.wav'), always_2d=True); assert sr_b == SR
    ghost = st.paulstretch(bell[int(0.9 * SR):int(5.5 * SR)], SR, 8.0, 0.5, seed=24)                  # the first stroke of scene 1, after its attack
    Lg = N - i_sh - int(0.35 * SR); ghost = ghost[int(1.0 * SR):int(1.0 * SR) + Lg]; assert len(ghost) == Lg
    tg = np.arange(Lg) / SR; i_face = (at['her face'] - at['the shard']) / FPS - 0.35
    envg = np.clip(tg / 2.2, 0, 1) ** 1.3 * db(-3.0 + 3.0 * np.clip((tg - i_face) / 1.2, 0, 1))        # in over two seconds; 3 dB more under her face
    ghost = sosfiltfilt(butter(2, 1500, btype='lowpass', fs=SR, output='sos'), ghost, axis=0).astype(np.float32)
    ghost *= (db(-28.0) / rms(ghost)) * envg[:, None].astype(np.float32); ghost[-int(0.8 * SR):] *= np.linspace(1, 0, int(0.8 * SR))[:, None]
    mixb[i_sh + int(0.35 * SR):] += ghost
    stroke = bell[int(0.42 * SR):int(4.6 * SR)].astype(np.float32)           # and the stroke itself, far off, so that the held tone is heard to come from a bell
    stroke = sosfiltfilt(butter(2, 1200, btype='lowpass', fs=SR, output='sos'), stroke, axis=0).astype(np.float32)
    far_ = np.stack([fftconvolve(stroke[:, c], ir[:, c])[:len(stroke)] for c in (0, 1)], 1).astype(np.float32)
    stroke = stroke + far_ * (0.8 * rms(stroke) / rms(far_))                 # nearly as much room as bell: it is not in this hall
    lay(mixb, stroke * (db(-21.0) / np.abs(stroke).max()), i_sh + int(0.35 * SR), fin=int(0.004 * SR), fout=int(1.5 * SR))
    wavb = P('out/edits/film_v24_bell.wav'); sf.write(wavb, mixb, SR, subtype='PCM_24'); outb = P('out/review/film_v24_bell.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wavb, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
        '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', outb)
    run('ffmpeg', '-v', 'error', '-y', '-ss', '161.5', '-i', outb, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '224k',
        '-movflags', '+faststart', P('out/review/film_v24_bell_end.mp4'))
    for p_ in (a_mp4, b_mp4, lst, silent):
        os.remove(p_)
    got = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out],
                             capture_output=True, text=True).stdout.strip())
    if got != n:
        sys.exit(f'frame count {got}, expected {n}')
    run('ffmpeg', '-v', 'error', '-y', '-ss', '137.0', '-i', out, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '224k',
        '-movflags', '+faststart', P('out/review/film_v24_hall.mp4'))
    rec = {'file': 'out/review/film_v24.mp4', 'frames': n, 'seconds': round(n / FPS, 4), 'cut_v17_frames': n17, 'new_frames': n_new,
           'excerpt': 'out/review/film_v24_hall.mp4', 'excerpt_starts_at_s': 137.0,
           'shots': [{'name': nm, 'starts_at_s': round((n17 + int(s)) / FPS, 3), 'frames': len(sh[1])} for nm, s, sh in zip(names, starts, shots)],
           'yard_shots': n_yard, 'hall_starts_at_s': round(at['her profile at the slab'] / FPS, 3), 'karst_second_line_at_s': round(t2, 2),
           'we_were_chosen_at_s': round(t_chosen, 2), 'shutters_open_air_from_s': round(t_open, 2), 'grain': GRAIN, 'peak_dbfs': round(float(20 * np.log10(peak + 1e-9)), 2)}
    json.dump(rec, open(P('edit/film_v24.edl.json'), 'w'), indent=1); print(json.dumps(rec)[:2200])


if __name__ == '__main__':
    main()
