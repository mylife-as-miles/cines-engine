#!/usr/bin/env python3
"""The film so far, cut v16: Q06 joined on after Q05, without its seal shot. Editing only.

    /root/leonxlnx/earshot/.venv/bin/python tools/cut_q06_t1.py          (Q06's sound with the seal's two seconds out)
    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v16.py [--choir A|B] [--sound-only]
        ->  out/review/film_v16.mp4, edit/film_v16.edl.json

The author, 26 November, on Q06 take 1: the seal "we can cut it out of the film... Everything else is good... Then merge
to the compile".

  picture   cut v15 unchanged to the last three frames of Q05 (Serath waiting in her close shot). Q06 take 1 follows,
            less its seal shot (take frames 336 to 384), with the film's grain and matte and nothing else. The join is
            one continuous shot of Serath: Q06's first shot opens on Q05's last frame but the model re-framed it
            (16.5 px, 8.25 px, 2.25 % smaller), so it is registered onto Q05's framing and three frames are dissolved.
  sound     cut v14's to the join, except that Q05 no longer fades out at its end. Q06's is out/edits/Q06_t1_cut.wav
            (the drone out of the gaps, the Hierophant's voice the take's own) with one gain for the whole of it, so
            that the middle one of its three lines sits where the council's lines sit, and the same quiet air bed.
"""
import argparse, importlib.util, json, os, subprocess, sys
import numpy as np
import soundfile as sf
from scipy import ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)


def load(name):
    spec = importlib.util.spec_from_file_location(name, P('tools', name + '.py')); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


c15 = load('combine_film_v15')
c14, c13 = c15.c14, c15.c13
W, H, FPS, SR, FX0 = c14.W, c14.H, c14.FPS, c14.SR, c14.FX0
Q5_CUT, Q5_S1, Q4_DROP, XF, L_LINE = c14.Q5_CUT, c14.Q5_S1, c14.Q4_DROP, c14.XF, c14.L_LINE
Q6 = json.load(open(P('out/edits/Q06_t1_cut.json')))
Q6_CUT, Q6_S1 = tuple(Q6['frames_removed']), Q6['shots_take_frames'][1]            # the seal's frames; Q06's first shot is take frames 0..56
REG6 = (16.5, 8.25, 1.0225)                 # Q06 shot 1 onto Q05's framing: dx, dy, scale (fitted on the whole of Q05's last frame; 3.9 levels left)


def register6(img):
    dx, dy, s = REG6
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sy, sx = (yy - H / 2 - dy) / s + H / 2, (xx - W / 2 - dx) / s + W / 2
    return np.stack([ndimage.map_coordinates(img[..., c], [sy, sx], order=1, mode='nearest') for c in range(3)], -1)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--choir', default='A', choices='AB')
    ap.add_argument('--sound-only', action='store_true', help='keep the picture already in out/review/film_v16.mp4 and rebuild only the sound')
    a = ap.parse_args()
    gb, mb = load('grade_bell'), load('mix_bell')
    out = P('out/review/film_v16.mp4'); silent = out.replace('.mp4', '_silent.mp4')
    if a.sound_only:
        old = json.load(open(P('edit/film_v16.edl.json')))
        n, q5_start, k5, q6_start, k6, cloud = old['frames'], old['q05_starts_at_frame'], old['q05_frames'], old['q06_starts_at_frame'], old['q06_frames'], old['cloud']
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', out, '-map', '0:v', '-c:v', 'copy', '-an', '-movflags', '+faststart', silent], check=True)
    else:
        n, q5_start, k5, q6_start, k6, cloud = picture(gb, silent)
    sound(a, mb, out, silent, n, q5_start, k5, q6_start, k6, cloud)


def picture(gb, silent):
    g = json.load(open(P('grade/looks.json')))['looks']['orison'].get('grain')
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    clock = json.load(open(P('out/edits/Q04_t1_fixed.json'))); nq = clock['frames']
    wide = next(s for s in clock['shots'] if s['shot'].startswith('3'))
    col, al, shade = c13.super_card()
    a0, A2, B2, cloud = c15.arch_shot(clock)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-an', '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709',
                            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', silent], stdin=subprocess.PIPE)

    def finish(img, k):
        img = np.clip(gb.grain(img, k, g) if g else img, 0, 1)
        img[:top] = 0; img[top + band:] = 0
        return img

    def put(img):
        enc.stdin.write((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())

    n = 0
    for f in c13.frames_of(P('out/edits/I_bell_v8.mp4'), FX0):                     # movement I, to the match cut
        enc.stdin.write(f.tobytes()); n += 1
    q4_last = nq - Q4_DROP
    held = []
    for k, f in enumerate(c13.frames_of(P('out/edits/Q04_t1_fixed.mp4'))):         # Q04, as in cut v15
        if k >= q4_last:
            break
        img = A2[k - a0] if k >= a0 else f.astype(np.float32) / 255
        j = k - wide['out_start_frame']
        if 0 <= j < wide['frames']:
            o = float(np.clip((j - 8) / 12.0, 0, 1) * np.clip((82 - j) / 12.0, 0, 1)); o = o * o * (3 - 2 * o)
            if o > 0:
                img = img * (1 - shade * o * 0.55); img = img * (1 - al * o) + col * o
        img = finish(img, n)
        if k >= q4_last - XF:
            held.append(img)
        else:
            put(img); n += 1
    q5_start = n
    q5 = [(k, f) for k, f in enumerate(c13.frames_of(P('out/takes/Q05_t1.mp4'))) if not (Q5_CUT[0] <= k < Q5_CUT[1])]
    held6 = []
    for i, (k, f) in enumerate(q5):                                                # Q05, as in cut v15, to three frames before its end
        img = B2[k] if k < Q5_S1 else f.astype(np.float32) / 255
        img = finish(img, n)
        if k < XF:
            w = (k + 1) / (XF + 1.0); img = held[k] * (1 - w) + img * w
        if i >= len(q5) - XF:
            held6.append(img)                                                      # dissolved into Q06's first frames below
        else:
            put(img); n += 1
    k5 = len(q5)
    q6_start = n                                                                   # film frame of Q06's take frame 0
    k6 = 0
    for k, f in enumerate(c13.frames_of(P('out/takes/Q06_t1.mp4'))):
        if Q6_CUT[0] <= k < Q6_CUT[1]:
            continue                                                               # the seal: out
        img = f.astype(np.float32) / 255
        if k < Q6_S1:
            img = register6(img)
        img = finish(img, n)
        if k < XF:
            w = (k + 1) / (XF + 1.0); img = held6[k] * (1 - w) + img * w
        put(img); n += 1; k6 += 1
    enc.stdin.close()
    if enc.wait(): sys.exit('encode failed')
    return n, q5_start, k5, q6_start, k6, cloud


def sound(a, mb, out, silent, n, q5_start, k5, q6_start, k6, cloud):
    m1, _ = sf.read(P(f'out/edits/I_bell_v9_{a.choir}.wav'), always_2d=True)
    m4, _ = sf.read(P('out/edits/Q04_t1_fixed_mix_open.wav'), always_2d=True)
    m5, _ = sf.read(P('out/edits/Q05_t1_two_changes.wav'), always_2d=True)
    m6, _ = sf.read(P('out/edits/Q06_t1_cut.wav'), always_2d=True)
    air, _ = sf.read(P('out/edits/stems_q04/air.wav'), always_2d=True)
    N = n * SR // FPS; j0 = FX0 * SR // FPS; j5 = q5_start * SR // FPS; j6 = q6_start * SR // FPS
    mix = np.zeros((N, 2), np.float32)
    t = (np.arange(len(m1)) - j0) / SR
    go = np.clip((t + 0.015) / 0.040, 0, 1); go = np.cos(0.5 * np.pi * go)         # movement I out round the match cut, as in cut v13
    a1 = (m1 * go[:, None])[:N]; mix[:len(a1)] += a1
    m4 = m4.copy(); r = int(0.005 * SR); m4[:r] *= np.linspace(0, 1, r)[:, None]
    x = int(0.06 * SR)                                                             # 60 ms at each join inside the council
    e4 = np.ones(len(m4), np.float32); cut4 = j5 - j0
    e4[cut4:] = 0; e4[cut4 - x // 2:cut4 + x // 2] = np.cos(0.5 * np.pi * np.linspace(0, 1, x)); e4[cut4 + x // 2:] = 0
    seg = (m4 * e4[:, None])[:N - j0]; mix[j0:j0 + len(seg)] += seg
    # Q05: one gain for the whole of it, as in cut v14; no fade at its end now
    lines5 = [(3.50, 5.65), (8.70 - 1.958, 10.42 - 1.958), (14.55 - 1.958, 16.78 - 1.958), (21.22 - 1.958, 22.86 - 1.958)]
    lv5 = [float(mb.lvl(m5[int(p * SR):int(q * SR)], 'm')) for p, q in lines5]
    gain5 = L_LINE - float(np.median(lv5))
    m5 = m5 * mb.lin(gain5)
    m5 = m5 + np.concatenate([air[int(9 * SR):int(22 * SR)], air[int(3 * SR):int(22 * SR)]])[:len(m5)]
    cut5 = j6 - j5                                                                 # Q05's samples up to Q06's first frame
    e5 = np.ones(len(m5), np.float32); e5[:x] = np.sin(0.5 * np.pi * np.linspace(0, 1, x))
    e5[cut5 + x // 2:] = 0; e5[cut5 - x // 2:cut5 + x // 2] = np.cos(0.5 * np.pi * np.linspace(0, 1, x))
    s5 = j5 - x // 2
    seg = (m5 * e5[:, None]); mix[s5:s5 + len(seg)] += seg[:N - s5]
    # Q06: one gain for the whole of it, set by the middle one of its three lines
    lines6 = Q6['speech_s_after_the_cut']
    lv6 = [float(mb.lvl(m6[int(p * SR):int(q * SR)], 'm')) for p, q in lines6]
    gain6 = L_LINE - float(np.median(lv6))
    m6 = m6 * mb.lin(gain6)
    m6 = m6 + air[int(1.5 * SR):int(1.5 * SR) + len(m6)]                           # the same bed, another stretch of it
    m6 = np.concatenate([m6, air[int(1.5 * SR) + len(m6):int(1.5 * SR) + len(m6) + SR]])[:N - j6 + x]   # the bed runs to the last frame
    e6 = np.ones(len(m6), np.float32); e6[:x] = np.sin(0.5 * np.pi * np.linspace(0, 1, x))
    fo = int(0.8 * SR); e6[-fo:] *= np.cos(0.5 * np.pi * np.linspace(0, 1, fo)) ** 2   # the end of the cut so far: out over the last 0.8 s
    s6 = j6 - x // 2
    seg = (m6 * e6[:, None])[:N - s6]; mix[s6:s6 + len(seg)] += seg
    mix, gr = mb.limiter(mix, -1.8)
    wav = P('out/edits/film_v16.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                    '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out], check=True)
    os.remove(silent)
    mono = mix.mean(1); step = SR // 200
    jl = [round(float(20 * np.log10(np.sqrt((mono[j6 + k * step:j6 + (k + 1) * step] ** 2).mean()) + 1e-9)), 1) for k in range(-40, 60)]
    shots = Q6['shots_take_frames']; off = lambda k: k - (Q6_CUT[1] - Q6_CUT[0]) if k >= Q6_CUT[1] else k
    rec = {'file': 'out/review/film_v16.mp4', 'frames': n, 'seconds': round(n / FPS, 4), 'choir_version_of_movement_I': a.choir,
           'match_cut_s': round(FX0 / FPS, 3), 'q05_starts_at_frame': q5_start, 'q05_frames': k5, 'q06_starts_at_frame': q6_start,
           'q06_starts_at_s': round(q6_start / FPS, 3), 'q06_frames': k6, 'q06_take_frames_removed': list(Q6_CUT),
           'q06_shot1_registration_dx_dy_scale': list(REG6), 'join_dissolve_frames': XF,
           'q06_shots_start_at_s': {f'shot {i + 1}' + (' (the seal: cut)' if shots[i] == Q6_CUT[0] else ''): (None if shots[i] == Q6_CUT[0] else round((q6_start + off(shots[i])) / FPS, 3)) for i in range(len(shots) - 1)},
           'q05_gain_db': round(gain5, 2), 'q06_gain_db': round(gain6, 2), 'q06_line_levels_before_lufs': [round(v, 1) for v in lv6],
           'q06_line_levels_after_lufs': [round(v + gain6, 1) for v in lv6], 'limiter_max_reduction_db': round(float(-mb.db(gr.min())), 2),
           'cloud': cloud, 'join_q05_q06_levels_dbfs_5ms_from_minus_200ms': jl, 'join_lowest_5ms_dbfs': min(jl)}
    json.dump(rec, open(P('edit/film_v16.edl.json'), 'w'), indent=1)
    print({k: v for k, v in rec.items() if k not in ('join_q05_q06_levels_dbfs_5ms_from_minus_200ms', 'cloud')})
    print('join Q05 to Q06, every 25 ms from 200 ms before:', jl[::5])


if __name__ == '__main__':
    main()
