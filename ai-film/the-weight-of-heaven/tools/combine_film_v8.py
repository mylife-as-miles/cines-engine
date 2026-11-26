#!/usr/bin/env python3
"""Movement I, cut v8: cut v7 with the mountain letting go (Q03B, composited) cut in between the stroke and the cup.
Editing only.

  B01-B02  over black; the rite                 v5 0.00-17.67
  B03      built to bear                        Q03A shots 1-2
  B04      unread                               v5 17.67-22.46
  B05      the water                            Q03A shots 3-5
  B06      the bell                             v5 22.46-29.29     (the warrant, up to the bell, the release, the stroke)
  B07a     the mountain lets go                 Q03B               (the fall, the daughter, the run; 9 empty frames trimmed)
  B07b     the still cup                        v5 29.29-36.29

Sound. Everything up to the stroke is cut v7's track, untouched. Then:
  - the cut down comes 0.42 s after the stroke. The bell's note goes on over the valley, but from far above: the
    bell stem alone, 13 dB down and with its top taken off. The mountain falls in silence under it.
  - the note has died away by the time the roar arrives in the run. The roar is cut dead on the cut back up.
  - above, the note is "still in the air": the cup plays as mixed in v5 (the applause, the air), with the bell
    14 dB down and mellower, as a note that has been ringing for eleven seconds.

  python3 tools/combine_film_v8.py      ->  out/edits/I_bell_v8.mp4, edit/I_bell_v8.edl.json
"""
import importlib.util, json, os, subprocess
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('cb', P('tools/combine_bell_vale.py')); cb = importlib.util.module_from_spec(spec); spec.loader.exec_module(cb)
W, H, FPS, SR = cb.W, cb.H, cb.FPS, cb.SR
V5, QA, QB = P('out/review/I_bell_v5.mp4'), P('out/edits/Q03A_t2_fixed.mp4'), P('out/edits/Q03B_t1_vfx.mp4')
V7_WAV, QB_WAV = P('out/edits/I_bell_v7.wav'), P('out/edits/Q03B_t1_vfx_mix.wav')
DST = P('out/edits/I_bell_v8.mp4')
C1, C2, C3 = 424, 539, 703          # v5 frames: gallery | Serath;  seal | warrant;  stroke shot | cup
QA_SPLIT = 183                      # Q03A: shots 1-2 | shots 3-5
QB_CUT = (150, 159)                 # Q03B frames dropped: the wall after they have gone
s, sec, env, add, fades, wav = cb.s, cb.sec, cb.env, cb.add, cb.fades, cb.wav


def lowpass(x, fc):
    """A gentle low-pass (12 dB an octave) done in the frequency domain."""
    X = np.fft.rfft(x, axis=0); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (f / fc) ** 2)[:, None], len(x), axis=0).astype(np.float32)


def main():
    gbs = importlib.util.spec_from_file_location('grade_bell', P('tools/grade_bell.py')); gb = importlib.util.module_from_spec(gbs); gbs.loader.exec_module(gb)
    g = json.load(open(P('grade/looks.json')))['looks']['orison'].get('grain')
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    v5, qa, qb = cb.frames_of(V5), cb.frames_of(QA), cb.frames_of(QB)
    NV, NA, NB = len(v5), len(qa), len(qb)
    qb_idx = list(range(0, QB_CUT[0])) + list(range(QB_CUT[1], NB))
    order = [('v5', range(0, C1), 'B01-B02 over black; the rite'), ('qa', range(0, QA_SPLIT), 'B03 built to bear'),
             ('v5', range(C1, C2), 'B04 unread'), ('qa', range(QA_SPLIT, NA), 'B05 the water'),
             ('v5', range(C2, C3), 'B06 the bell'), ('qb', qb_idx, 'B07a the mountain lets go'),
             ('v5', range(C3, NV), 'B07b the still cup')]
    silent = DST.replace('.mp4', '_silent.mp4')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-an', '-c:v', 'libx264', '-crf', '13', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709',
                            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', silent], stdin=subprocess.PIPE)
    n = 0; edl = []
    for src, idx, label in order:
        idx = list(idx)
        edl.append({'label': label, 'source': {'v5': 'I_bell_v5', 'qa': 'Q03A_t2_fixed', 'qb': 'Q03B_t1_vfx'}[src], 'src_frames': [idx[0], idx[-1] + 1],
                    'start_frame': n, 'frames': len(idx), 'start': round(n / FPS, 4), 'duration': round(len(idx) / FPS, 4)})
        for i in idx:
            if src == 'v5':
                f = v5[i]
            else:
                img = (qa if src == 'qa' else qb)[i].astype(np.float32) / 255
                img = np.clip(gb.grain(img, n, g) if g else img, 0, 1)
                img[:top] = 0; img[top + band:] = 0
                f = (img * 255 + 0.5).astype(np.uint8)
            enc.stdin.write(f.tobytes()); n += 1
    enc.stdin.close(); enc.wait()
    total = n

    # ------------------------------------------------------------------ sound
    v7 = wav(V7_WAV)
    gm = 10 ** (cb.MASTER_GAIN_DB / 20)
    D, C, B, E, A = (wav(os.path.join(cb.STEMS, k + '.wav')) * gm for k in ('dialogue_production', 'choir', 'bell', 'effects', 'beds'))
    q = wav(QB_WAV)
    a0, a1 = s(QB_CUT[0]), s(QB_CUT[1]); xf = sec(0.02)                 # the same nine frames out of Q03B's sound
    ramp = env(xf, 0, 1)
    q = np.concatenate([q[:a0 - xf], q[a0 - xf:a0] * (1 - ramp) + q[a1 - xf:a1] * ramp, q[a1:]])
    nq = s(len(qb_idx)); q = q[:nq]

    tE = s(C1 + QA_SPLIT + (C2 - C1) + (NA - QA_SPLIT) + (C3 - C2))     # where the valley cuts in: 0.42 s after the stroke
    tG = tE + nq                                                         # back up, to the cup
    N = s(total); c3 = s(C3)
    out = np.zeros((N, 2), np.float32)
    add(out, fades(v7[:tE], fout=sec(0.04)), 0)                          # cut v7 up to the cut down
    far = lowpass(B[c3:], 1200.0) * 10 ** (-13 / 20)                     # the bell's note, from far above, over the valley
    add(out, fades(far[:nq], fin=sec(0.04), fout=sec(0.05)), tE)
    add(out, fades(q, fin=sec(0.08), fout=sec(0.03)), tE)                # the valley: silence, then the roar; cut dead
    cup = (D + C + A)[c3:] + E[c3:] * 10 ** (-8 / 20) + lowpass(B[c3:], 2500.0) * 10 ** (-14 / 20)   # above: the note still in the air, the applause kept under it
    add(out, fades(cup, fin=sec(0.02)), tG)

    peak = float(np.abs(out).max())
    tmp = DST.replace('.mp4', '.wav')
    with open(tmp + '.f32', 'wb') as f:
        f.write(out.astype('<f4').tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', tmp + '.f32', '-c:a', 'pcm_s24le', tmp], check=True)
    os.remove(tmp + '.f32')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', tmp, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                    '-t', f'{total / FPS:.4f}', '-movflags', '+faststart', DST], check=True)
    os.remove(silent)
    rec = {'name': 'I_bell_v8', 'fps': FPS, 'size': [W, H], 'frames': total, 'duration': round(total / FPS, 4),
           'made_from': ['out/review/I_bell_v5.mp4', 'out/edits/Q03A_t2_fixed.mp4', 'out/edits/Q03B_t1_vfx.mp4', 'out/edits/I_bell_v7.wav (sound up to the stroke)'],
           'picture': edl, 'sound': {'sample_peak_dbfs': round(20 * np.log10(max(peak, 1e-9)), 2), 'valley_cut_in_s': round(tE / SR, 3), 'cup_s': round(tG / SR, 3),
                                     'bell_over_valley_db': -13, 'bell_at_cup_db': -14}}
    json.dump(rec, open(P('edit/I_bell_v8.edl.json'), 'w'), indent=1)
    print(f'{DST}: {total} frames, {total / FPS:.2f} s, sample peak {rec["sound"]["sample_peak_dbfs"]} dBFS')
    for e in edl:
        print(f"  {e['start']:7.3f}  {e['duration']:6.3f} s  {e['label']}")


if __name__ == '__main__':
    main()
