#!/usr/bin/env python3
"""Movement I, cut v6: the bell (cut v5) with Anvil Vale (Q03A take 2, fixed) cut into it. Editing only.

The beat plan (design/BEATS.md) intercuts the two worlds:

  B01-B02  over black; the rite                 v5 0.00-17.67      (black, nave, Hierophant, up to the bell, gallery)
  B03      built to bear                        Q03A shots 1-2     (the vale; he drinks, the bowl on the wall)
  B04      unread                               v5 17.67-22.46     (Serath; the seal)
  B05      the water                            Q03A shots 3-5     (the water, the ox and crows, dust on the Anvil)
  B06-B07  the bell; the still cup              v5 22.46-36.29     (warrant raised, up to the bell, release, stroke, cup)
  (B07a, the mountain lets go, is Q03B: not made yet.)

Picture: v5 is already graded, grained and matted. The vale gets the same grain and the same 2.39:1 matte, no grade.
Sound: v5's master is reused wherever nothing overlaps (so its limiter's work on the two strokes is kept); its stems
carry the overlaps. Each world keeps its own sound, and the joins are overlapped, never butted:
  - the congregation's answer ("Let no hand bring down") runs on over the first second of the vale;
  - the choir fades out before the water (the vale's air arriving under the end of the seal), and comes back in
    under the end of each vale passage before the cut up;
  - the vale's own track sits 3 dB up, and falls 9 dB on the dust shot: the mountain makes no sound.

  python3 tools/combine_bell_vale.py        ->  out/edits/I_bell_v6.mp4, edit/I_bell_v6.edl.json
"""
import importlib.util, json, os, subprocess, wave
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
V5 = P('out/review/I_bell_v5.mp4')
Q = P('out/edits/Q03A_t2_fixed.mp4')
QWAV = P('out/edits/Q03A_t2_fixed.wav')
MASTER = P('out/edits/I_bell_v5_mix.wav')
STEMS = P('out/edits/stems')
DST = P('out/edits/I_bell_v6.mp4')
W, H, FPS, SR = 992, 432, 24, 48000
C1, C2 = 424, 539                 # v5 frames: the gallery | Serath;  the seal | the warrant raised
QA = 183                          # Q03A frames 0-182: shots 1-2;  183-end: shots 3-5
Q_S5 = 342                        # first frame of the dust shot in the fixed Q03A
MASTER_GAIN_DB = -0.31            # what mix_bell.py applied to the summed stems
VALE_GAIN_DB = 3.0
DUST_DUCK_DB = -9.0


def frames_of(path):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
    return np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3)


def wav(path):
    with wave.open(path) as w:
        n, sw, ch = w.getnframes(), w.getsampwidth(), w.getnchannels()
        raw = w.readframes(n)
    if sw == 2:
        a = np.frombuffer(raw, '<i2').astype(np.float32) / 32768
    elif sw == 3:
        b = np.frombuffer(raw, np.uint8).reshape(-1, 3).astype(np.int32)
        v = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)
        v = np.where(v >= 1 << 23, v - (1 << 24), v)
        a = v.astype(np.float32) / (1 << 23)
    else:
        raise SystemExit(f'{path}: sample width {sw}')
    return a.reshape(-1, ch)


def s(frames):                     # frames -> samples
    return int(round(frames * SR / FPS))


def sec(t):
    return int(round(t * SR))


def env(n, a, b):
    return np.linspace(a, b, n, dtype=np.float32)[:, None]


def add(dst, x, at):
    at = int(at)
    if at < 0:
        x = x[-at:]; at = 0
    n = min(len(x), len(dst) - at)
    if n > 0:
        dst[at:at + n] += x[:n]


def fades(x, fin=0, fout=0):
    x = x.copy()
    if fin:
        x[:fin] *= env(fin, 0, 1)
    if fout:
        x[-fout:] *= env(fout, 1, 0)
    return x


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--name', default='I_bell_v6')
    ap.add_argument('--vale-wav', default=QWAV, help="the vale's sound (default: the model's own track, conformed)")
    ap.add_argument('--vale-gain', type=float, default=VALE_GAIN_DB)
    ap.add_argument('--dust-duck', type=float, default=DUST_DUCK_DB)
    o = ap.parse_args()
    global DST
    DST = P('out/edits', o.name + '.mp4')
    vale_wav = o.vale_wav if os.path.isabs(o.vale_wav) else P(o.vale_wav)
    # ------------------------------------------------------------------ picture
    spec = importlib.util.spec_from_file_location('grade_bell', P('tools/grade_bell.py'))
    gb = importlib.util.module_from_spec(spec); spec.loader.exec_module(gb)
    g = json.load(open(P('grade/looks.json')))['looks']['orison'].get('grain')
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2

    v5 = frames_of(V5); q = frames_of(Q)
    NV, NQ = len(v5), len(q)
    order = [('v5', 0, C1, 'B01-B02 over black; the rite'),
             ('q', 0, QA, 'B03 built to bear'),
             ('v5', C1, C2, 'B04 unread'),
             ('q', QA, NQ, 'B05 the water'),
             ('v5', C2, NV, 'B06-B07 the bell; the still cup')]
    total = NV + NQ
    tmp_wav = DST.replace('.mp4', '.wav')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-an', '-c:v', 'libx264', '-crf', '13', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709',
                            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', DST.replace('.mp4', '_silent.mp4')],
                           stdin=subprocess.PIPE)
    n = 0; edl = []
    for src, a, b, label in order:
        edl.append({'label': label, 'source': 'I_bell_v5' if src == 'v5' else 'Q03A_t2_fixed', 'src_in_frame': a, 'src_out_frame': b,
                    'start_frame': n, 'frames': b - a, 'start': round(n / FPS, 4), 'duration': round((b - a) / FPS, 4)})
        for i in range(a, b):
            if src == 'v5':
                f = v5[i]
            else:
                img = q[i].astype(np.float32) / 255
                img = np.clip(gb.grain(img, n, g) if g else img, 0, 1)
                img[:top] = 0; img[top + band:] = 0
                f = (img * 255 + 0.5).astype(np.uint8)
            enc.stdin.write(f.tobytes()); n += 1
    enc.stdin.close(); enc.wait()
    assert n == total

    # ------------------------------------------------------------------ sound
    M = wav(MASTER)
    D, C, B, E, A = (wav(os.path.join(STEMS, k + '.wav')) for k in ('dialogue_production', 'choir', 'bell', 'effects', 'beds'))
    gm = 10 ** (MASTER_GAIN_DB / 20)
    D, C, B, E, A = D * gm, C * gm, B * gm, E * gm, A * gm
    Qa = wav(vale_wav) * 10 ** (o.vale_gain / 20)
    c1, c2 = s(C1), s(C2)
    la, lb = s(QA), s(NQ - QA)
    N = s(total)
    out = np.zeros((N, 2), np.float32)
    tA, t2, tB, t3 = c1, c1 + la, c2 + la, c2 + la + lb          # film positions: vale A, Serath, vale B, the warrant

    # 1. the rite, as mixed
    add(out, fades(M[:c1], fout=sec(0.005)), 0)

    # 2. over the cut to the vale: the answer finishes, the choir and the hall's air fall away
    n_ans = sec(18.80) - c1                                       # the answer's last word ends at 18.76 on v5's clock
    add(out, fades(D[c1:c1 + n_ans], fin=sec(0.005), fout=sec(0.05)), tA)
    add(out, fades(C[c1:c1 + sec(1.25)], fin=sec(0.005), fout=sec(1.25)), tA)
    add(out, fades(A[c1:c1 + sec(0.5)], fin=sec(0.005), fout=sec(0.5)), tA)

    # 3. the vale, shots 1-2: its own sound, coming up under the answer
    add(out, fades(Qa[:la], fin=sec(0.5), fout=sec(0.03)), tA)

    # 4. back up: the choir returns under the end of the vale, then Serath and the seal
    up = 10 ** (5 / 20)                                           # in v5 the choir was held under the answer here; the answer
    add(out, fades(C[c1 - sec(0.4):c1], fin=sec(0.4)) * up, t2 - sec(0.4))    # has already played, so the choir carries the join
    n_x = sec(1.2)                                                # until the answer is over, the stems without it
    lift = np.ones((n_x + sec(0.02), 1), np.float32); lift[:n_x] = env(n_x, up, 1)
    first = (E + A + B)[c1:c1 + n_x + sec(0.02)] + C[c1:c1 + n_x + sec(0.02)] * lift
    add(out, fades(first, fin=sec(0.005), fout=sec(0.02)), t2)
    rest = M[c1 + n_x:c2].copy()
    nf = sec(0.6)                                                 # the choir goes out before the water
    rest[-nf:] -= C[c2 - nf:c2] * (1 - env(nf, 1, 0))
    add(out, fades(rest, fin=sec(0.02), fout=sec(0.01)), t2 + n_x)

    # 5. the vale, shots 3-5: the wind dies on the dust shot
    vb = Qa[la:la + lb].copy()
    k = s(Q_S5 - QA); r = sec(1.2); low = 10 ** (o.dust_duck / 20)
    vb[k:k + r] *= env(r, 1, low); vb[k + r:] *= low
    add(out, fades(Qa[la - sec(0.35):la], fin=sec(0.35)), tB - sec(0.35))     # the vale's air arrives under the end of the seal
    add(out, fades(vb, fin=sec(0.005), fout=sec(0.3)), tB)

    # 6. back up: the choir creeps in under the dust, then the bell as mixed
    add(out, fades(C[c2 - sec(0.5):c2], fin=sec(0.5)), t3 - sec(0.5))
    add(out, fades(M[c2:], fin=sec(0.005)), t3)

    peak = float(np.abs(out).max())
    with open(tmp_wav + '.f32', 'wb') as f:
        f.write(out.astype('<f4').tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', tmp_wav + '.f32', '-c:a', 'pcm_s24le', tmp_wav], check=True)
    os.remove(tmp_wav + '.f32')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', DST.replace('.mp4', '_silent.mp4'), '-i', tmp_wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '256k', '-t', f'{total / FPS:.4f}', '-movflags', '+faststart', DST], check=True)
    os.remove(DST.replace('.mp4', '_silent.mp4'))

    rec = {'name': o.name, 'fps': FPS, 'size': [W, H], 'frames': total, 'duration': round(total / FPS, 4),
           'made_from': ['out/review/I_bell_v5.mp4 (cut v5, release C, Orison White)', 'out/edits/Q03A_t2_fixed.mp4'],
           'picture': edl,
           'sound': {'vale_track': os.path.relpath(vale_wav, HERE), 'vale_gain_db': o.vale_gain, 'dust_shot_duck_db': o.dust_duck, 'sample_peak_dbfs': round(20 * np.log10(max(peak, 1e-9)), 2),
                     'joins': ['the answer runs on over the first second of the vale', 'the choir fades out before the water',
                               'the choir returns under the end of each vale passage']}}
    json.dump(rec, open(P('edit', o.name + '.edl.json'), 'w'), indent=1)
    print(f'{DST}: {total} frames, {total / FPS:.2f} s, sample peak {rec["sound"]["sample_peak_dbfs"]} dBFS')
    for e in edl:
        print(f"  {e['start']:7.3f}  {e['duration']:6.3f} s  {e['label']}")


if __name__ == '__main__':
    main()
