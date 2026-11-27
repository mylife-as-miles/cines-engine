#!/usr/bin/env python3
"""The film so far, cut v17: Q07 (beneath Orison) joined on after the council. Editing only.

    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v17.py
        ->  out/review/film_v17.mp4, out/edits/film_v17.wav, edit/film_v17.edl.json

The author, 27 November, on the reel with the remade crossing (out/review/Q07_reel_v5.mp4), quoting "is v5 the Q07 to
keep?" and "should I cut Q07 into the film?": "Do this".

  picture   cut v16's video stream, copied without re-encoding. Then a straight cut to Q07's reel v5
            (out/edits/Q07_reel_v5.mp4), encoded with the film's settings and given its 2.39:1 matte. The reel keeps
            its own grain, which is about as strong as the film's; none is added. No fade and no black between them.
  sound     cut v16's mix to 0.8 s before its end. Its last 0.8 s was a fade, because the film ended there; here the
            same sound runs on at full level (rebuilt exactly as cut v16 built it, less the fade) and goes out over
            60 ms at the cut. Q07's own mix (local sounds only, tools/mix_q07.py) comes in over 30 ms at the cut, at
            the level it was mixed at.
"""
import importlib.util, json, os, subprocess, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)


def load(name):
    spec = importlib.util.spec_from_file_location(name, P('tools', name + '.py')); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


def run(*a):
    subprocess.run(list(a), check=True)


def main():
    c16 = load('combine_film_v16'); mb = load('mix_bell')
    W, H, FPS, SR = c16.W, c16.H, c16.FPS, c16.SR
    old = json.load(open(P('edit/film_v16.edl.json'))); n16 = old['frames']
    reel = json.load(open(P('out/edits/Q07_reel_v5.json'))); n7 = reel['frames']
    out = P('out/review/film_v17.mp4'); a_mp4 = P('out/edits/_v17_a.mp4'); b_mp4 = P('out/edits/_v17_b.mp4'); lst = P('out/edits/_v17.txt'); silent = P('out/edits/_v17_silent.mp4')

    # ---- picture
    run('ffmpeg', '-v', 'error', '-y', '-i', P('out/review/film_v16.mp4'), '-map', '0:v', '-c:v', 'copy', '-an', a_mp4)
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', P('out/edits/Q07_reel_v5.mp4'), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-an', '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709',
                            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-video_track_timescale', '12288', b_mp4], stdin=subprocess.PIPE)
    k = 0
    while True:
        buf = dec.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        f = np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy(); f[:top] = 0; f[top + band:] = 0     # the film's matte
        enc.stdin.write(f.tobytes()); k += 1
    enc.stdin.close()
    if enc.wait() or k != n7:
        sys.exit(f'Q07 encode failed ({k} of {n7} frames)')
    open(lst, 'w').write(f"file '{a_mp4}'\nfile '{b_mp4}'\n")
    run('ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', silent)
    n = n16 + n7

    # ---- sound
    v16, _ = sf.read(P('out/edits/film_v16.wav'), always_2d=True); v16 = v16.astype(np.float32); N16 = n16 * SR // FPS
    assert len(v16) == N16, (len(v16), N16)
    m6, _ = sf.read(P('out/edits/Q06_t1_cut.wav'), always_2d=True); air, _ = sf.read(P('out/edits/stems_q04/air.wav'), always_2d=True)
    x = int(0.06 * SR); fo = int(0.8 * SR); j6 = old['q06_starts_at_frame'] * SR // FPS; s6 = j6 - x // 2
    m6 = m6 * mb.lin(old['q06_gain_db'])
    m6 = m6 + air[int(1.5 * SR):int(1.5 * SR) + len(m6)]
    m6 = np.concatenate([m6, air[int(1.5 * SR) + len(m6):int(1.5 * SR) + len(m6) + SR]])[:N16 - j6 + x].astype(np.float32)   # Q06 with its bed, as cut v16 built it, no fade
    a0 = N16 - fo
    chk = float(np.abs(v16[a0 - 4800:a0] - m6[a0 - 4800 - s6:a0 - s6]).max())           # the 0.1 s before the old fade must be the same sound
    N = n * SR // FPS; mix = np.zeros((N, 2), np.float32)
    mix[:a0] = v16[:a0]
    tail = m6[a0 - s6:N16 + x // 2 - s6].copy()
    tail[-x:] *= np.cos(0.5 * np.pi * np.linspace(0, 1, x, dtype=np.float32))[:, None]   # out over 60 ms round the cut
    mix[a0:a0 + len(tail)] += tail
    m7, _ = sf.read(P('out/edits/Q07_reel_v5_mix.wav'), always_2d=True); m7 = m7.astype(np.float32)[:N - N16]
    r = x // 2; m7[:r] *= np.sin(0.5 * np.pi * np.linspace(0, 1, r, dtype=np.float32))[:, None]   # in over 30 ms
    mix[N16:N16 + len(m7)] += m7
    peak = float(np.abs(mix).max())
    wav = P('out/edits/film_v17.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    run('ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
        '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out)
    for f in (a_mp4, b_mp4, lst, silent):
        os.remove(f)
    mono = mix.mean(1); step = SR // 200
    jl = [round(float(20 * np.log10(np.sqrt((mono[N16 + i * step:N16 + (i + 1) * step] ** 2).mean()) + 1e-9)), 1) for i in range(-40, 60)]
    starts = reel['shots_start_frames']
    rec = {'file': 'out/review/film_v17.mp4', 'frames': n, 'seconds': round(n / FPS, 4), 'cut_v16_frames': n16, 'q07_reel': 'out/edits/Q07_reel_v5.mp4',
           'q07_starts_at_frame': n16, 'q07_starts_at_s': round(n16 / FPS, 3), 'q07_frames': n7,
           'q07_shots_start_at_s': [round((n16 + s) / FPS, 3) for s in starts], 'q07_shot3_from': reel.get('shot3_from'),
           'join': 'straight cut; sound: 60 ms out, 30 ms in', 'q06_tail_rebuilt_from_s': round(a0 / SR, 3), 'q06_tail_check_max_difference': round(chk, 6),
           'peak_dbfs': round(float(20 * np.log10(peak + 1e-9)), 2), 'join_levels_dbfs_5ms_from_minus_200ms': jl}
    json.dump(rec, open(P('edit/film_v17.edl.json'), 'w'), indent=1)
    print({k: v for k, v in rec.items() if k != 'join_levels_dbfs_5ms_from_minus_200ms'})
    print('join, every 25 ms from 200 ms before the cut:', jl[::5])


if __name__ == '__main__':
    main()
