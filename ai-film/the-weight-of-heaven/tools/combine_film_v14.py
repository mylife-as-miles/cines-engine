#!/usr/bin/env python3
"""The film so far, cut v14: Q05 joined on after Q04. Editing only.

    Q04_OPEN_END=1 /root/leonxlnx/earshot/.venv/bin/python tools/mix_q04.py      (Q04's mix with no fade at its end)
    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v14.py [--choir A|B]
        ->  out/review/film_v14.mp4, edit/film_v14.edl.json

The author, 26 November: of the two copies of Q05 take 1, "Q05_t1_two_changes.mp4... I prefer it merge it".

  picture   cut v13 unchanged up to Q04's last shot (Serath at her arch). Q05 take 1 follows as the author chose it: the
            Hierophant's silent start trimmed (frames 144 to 190 out), nothing else changed; then the film's grain and
            the 2.39:1 matte, as on Q04. The join is one continuous shot: Q05's first shot opens on Q04's last frame but
            the model re-framed it (17 px, 8 px, 2.5 % smaller), so it is registered onto Q04's framing, Q04's last half
            second of hold is dropped, and three frames are dissolved.
  sound     cut v13's to the join. Q05's is the chosen copy's (out/edits/Q05_t1_two_changes.wav: the drone out of the
            gaps, every voice the take's own), with one gain for the whole of it, so that its lines sit where Q04's do,
            and the same quiet air bed that runs under Q04 carried on under it.
"""
import argparse, importlib.util, json, os, subprocess, sys
import numpy as np
import soundfile as sf
from scipy import ndimage, signal

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)


def load(name):
    spec = importlib.util.spec_from_file_location(name, P('tools', name + '.py')); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


c13 = load('combine_film_v13')
W, H, FPS, SR, FX0 = c13.W, c13.H, c13.FPS, c13.SR, c13.FX0
Q5_CUT = (144, 191)                         # Q05 take frames removed: the Hierophant's silent start
Q5_S1 = 52                                  # Q05's first shot: take frames 0..51
REG = (17.0, 8.0, 1.025)                    # Q05 shot 1 onto Q04's framing: dx, dy, scale (measured on the arcade and the first column)
Q4_DROP, XF = 12, 3                         # Q04's last frames dropped (her hold); frames dissolved at the join
L_LINE = -15.0


def register(img):
    dx, dy, s = REG
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sy, sx = (yy - H / 2 - dy) / s + H / 2, (xx - W / 2 - dx) / s + W / 2
    return np.stack([ndimage.map_coordinates(img[..., c], [sy, sx], order=1, mode='nearest') for c in range(3)], -1)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--choir', default='A', choices='AB'); a = ap.parse_args()
    gb, mb = load('grade_bell'), load('mix_bell')
    g = json.load(open(P('grade/looks.json')))['looks']['orison'].get('grain')
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    clock = json.load(open(P('out/edits/Q04_t1_fixed.json'))); nq = clock['frames']
    wide = next(s for s in clock['shots'] if s['shot'].startswith('3'))
    col, al, shade = c13.super_card()
    out = P('out/review/film_v14.mp4'); silent = out.replace('.mp4', '_silent.mp4')
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
    q4_last = nq - Q4_DROP                                                         # Q04 frames used: 0 .. q4_last-1, the last XF of them under the dissolve
    held = []
    for k, f in enumerate(c13.frames_of(P('out/edits/Q04_t1_fixed.mp4'))):
        if k >= q4_last:
            break
        img = f.astype(np.float32) / 255
        j = k - wide['out_start_frame']
        if 0 <= j < wide['frames']:
            o = float(np.clip((j - 8) / 12.0, 0, 1) * np.clip((82 - j) / 12.0, 0, 1)); o = o * o * (3 - 2 * o)
            if o > 0:
                img = img * (1 - shade * o * 0.55); img = img * (1 - al * o) + col * o
        img = finish(img, n)
        if k >= q4_last - XF:
            held.append(img)                                                       # dissolved into Q05's first frames below
        else:
            put(img); n += 1
    q5_start = n                                                                   # film frame of Q05's take frame 0
    k5 = 0
    for k, f in enumerate(c13.frames_of(P('out/takes/Q05_t1.mp4'))):
        if Q5_CUT[0] <= k < Q5_CUT[1]:
            continue
        img = f.astype(np.float32) / 255
        if k < Q5_S1:
            img = register(img)
        img = finish(img, n)
        if k < XF:
            w = (k + 1) / (XF + 1.0)
            img = held[k] * (1 - w) + img * w
        put(img); n += 1; k5 += 1
    enc.stdin.close()
    if enc.wait(): sys.exit('encode failed')

    # ------------------------------------------------------------------ sound
    m1, _ = sf.read(P(f'out/edits/I_bell_v9_{a.choir}.wav'), always_2d=True)
    m4, _ = sf.read(P('out/edits/Q04_t1_fixed_mix_open.wav'), always_2d=True)
    m5, _ = sf.read(P('out/edits/Q05_t1_two_changes.wav'), always_2d=True)
    N = n * SR // FPS; j0 = FX0 * SR // FPS; j5 = q5_start * SR // FPS
    mix = np.zeros((N, 2), np.float32)
    t = (np.arange(len(m1)) - j0) / SR
    go = np.clip((t + 0.015) / 0.040, 0, 1); go = np.cos(0.5 * np.pi * go)         # movement I out round the match cut, as in cut v13
    a1 = (m1 * go[:, None])[:N]; mix[:len(a1)] += a1
    m4 = m4.copy(); r = int(0.005 * SR); m4[:r] *= np.linspace(0, 1, r)[:, None]
    x = int(0.06 * SR)                                                             # Q04 out and Q05 in over 60 ms at the join
    e4 = np.ones(len(m4), np.float32); cut4 = j5 - j0
    e4[cut4:] = 0; e4[cut4 - x // 2:cut4 + x // 2] = np.cos(0.5 * np.pi * np.linspace(0, 1, x)); e4[cut4 + x // 2:] = 0
    seg = (m4 * e4[:, None])[:N - j0]; mix[j0:j0 + len(seg)] += seg
    # Q05: one gain for the whole of it, so that its lines sit where Q04's do
    lines = [(3.50, 5.65), (8.70 - 1.958, 10.42 - 1.958), (14.55 - 1.958, 16.78 - 1.958), (21.22 - 1.958, 22.86 - 1.958)]
    lv = [float(mb.lvl(m5[int(p * SR):int(q * SR)], 'm')) for p, q in lines]
    gain = L_LINE - float(np.median(lv))
    m5 = m5 * mb.lin(gain)
    air, _ = sf.read(P('out/edits/stems_q04/air.wav'), always_2d=True)             # the same bed, from another stretch of it
    bed = np.concatenate([air[int(9 * SR):int(22 * SR)], air[int(3 * SR):int(22 * SR)]])[:len(m5)]
    m5 = m5 + bed[:len(m5)]
    e5 = np.ones(len(m5), np.float32); e5[:x] = np.sin(0.5 * np.pi * np.linspace(0, 1, x))
    e5[-int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR))                        # the end of the cut so far
    s5 = j5 - x // 2
    seg = (m5 * e5[:, None])[:N - s5]; mix[s5:s5 + len(seg)] += seg
    mix, gr = mb.limiter(mix, -1.8)
    wav = P('out/edits/film_v14.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                    '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out], check=True)
    os.remove(silent)
    mono = mix.mean(1); step = SR // 200
    jl = [round(float(20 * np.log10(np.sqrt((mono[j5 + k * step:j5 + (k + 1) * step] ** 2).mean()) + 1e-9)), 1) for k in range(-40, 60)]
    rec = {'file': 'out/review/film_v14.mp4', 'frames': n, 'seconds': round(n / FPS, 4), 'choir_version_of_movement_I': a.choir,
           'match_cut_s': round(FX0 / FPS, 3), 'q04_frames_used': q4_last, 'q05_starts_at_frame': q5_start, 'q05_starts_at_s': round(q5_start / FPS, 3),
           'q05_frames': k5, 'q05_take_frames_removed': list(Q5_CUT), 'q05_shot1_registration_dx_dy_scale': list(REG), 'join_dissolve_frames': XF,
           'q05_gain_db': round(gain, 2), 'q05_line_levels_before_lufs': [round(v, 1) for v in lv],
           'limiter_max_reduction_db': round(float(-mb.db(gr.min())), 2),
           'join_levels_dbfs_5ms_from_minus_200ms': jl, 'join_lowest_5ms_dbfs': min(jl)}
    json.dump(rec, open(P('edit/film_v14.edl.json'), 'w'), indent=1)
    print({k: v for k, v in rec.items() if k != 'join_levels_dbfs_5ms_from_minus_200ms'})
    print('join, every 25 ms from 200 ms before:', jl[::5])


if __name__ == '__main__':
    main()
