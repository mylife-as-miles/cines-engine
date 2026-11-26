#!/usr/bin/env python3
"""The film so far, cut v15: the frozen cloud behind Serath at her arch is given its movement. Editing only.

    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v15.py
        ->  out/review/film_v15.mp4, edit/film_v15.edl.json          (cut v14 must have been built: its sound is used)

The author, 26 November, after a before-and-after test on this shot (tools/cloud_drift.py): "I love it... So merge
everything together".

  picture   cut v14, frame for frame, except the one continuous shot of Serath at her arch (Q04's last shot and Q05's
            first, 136 frames from 80.4 s). In both takes the sky and the top of the cloud bank are frozen; they now
            drift to the right, on one clock that runs through the join, so the bank does not jump or restart there.
            In Q05's half the cloud right of the right column is frozen too, where Q04's had been going left at 7 px
            a second: it carries on leftward from the join. Stone, Serath and every cloud that moves by itself are as
            generated. The movement is put in before the film's grain and matte.
  sound     cut v14's, unchanged.

Not done here, and why: the other shots with still cloud (the wide of the chamber, Serath's three close shots) have a
slow push-in, so the still-camera method of tools/cloud_drift.py does not apply to them as it stands.
"""
import importlib.util, json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)


def load(name):
    spec = importlib.util.spec_from_file_location(name, P('tools', name + '.py')); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


c14, cd = load('combine_film_v14'), load('cloud_drift')
c13 = c14.c13
W, H, FPS, SR, FX0 = c14.W, c14.H, c14.FPS, c14.SR, c14.FX0
Q5_CUT, Q5_S1, Q4_DROP, XF = c14.Q5_CUT, c14.Q5_S1, c14.Q4_DROP, c14.XF


def arch_shot(clock, debug=None):
    """The two halves of the shot in the film's framing, with their cloud moved on one clock.
    Q04's half is frames s6 .. q4_last-1 of the mended Q04; Q05's is take frames 0..51, registered onto Q04's framing.
    On the film the second half starts XF frames before the first ends (the dissolve), so its clock starts there."""
    s6 = next(s for s in clock['shots'] if s['shot'].startswith('6'))
    a0, q4_last = s6['out_start_frame'], clock['frames'] - Q4_DROP
    A = np.stack([f for k, f in enumerate(c13.frames_of(P('out/edits/Q04_t1_fixed.mp4'))) if a0 <= k < q4_last]).astype(np.float32) / 255
    B = np.stack([c14.register(f.astype(np.float32) / 255) for f in c13.frames_of(P('out/takes/Q05_t1.mp4'), Q5_S1)])
    na, nb = len(A), len(B)
    ta = np.arange(na) / FPS; tb = (na - XF + np.arange(nb)) / FPS                # seconds on the shot's clock
    mid = (na - XF + nb - 1) / FPS / 2
    A2, ia = cd.move_cloud(A, ta, {'centre': ta - mid}, debug=debug and debug + '_A')
    tr = np.arange(nb) / FPS                                                       # the right opening: from the join, where Q04 left its cloud
    B2, ib = cd.move_cloud(B, tb, {'centre': tb - mid, 'right': tr}, ramp={'right': cd.ease(tr / 0.8)}, debug=debug and debug + '_B')
    if debug:
        np.save(debug + '_A_before.npy', (A * 255 + 0.5).astype(np.uint8)); np.save(debug + '_A_after.npy', (A2 * 255 + 0.5).astype(np.uint8))
        np.save(debug + '_B_before.npy', (B * 255 + 0.5).astype(np.uint8)); np.save(debug + '_B_after.npy', (B2 * 255 + 0.5).astype(np.uint8))
    return a0, A2, B2, {'q04_half_frames': na, 'q05_half_frames': nb, 'clock_zero_s': round(mid, 3), 'q04_half': ia, 'q05_half': ib}


def main():
    gb = load('grade_bell')
    g = json.load(open(P('grade/looks.json')))['looks']['orison'].get('grain')
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    clock = json.load(open(P('out/edits/Q04_t1_fixed.json'))); nq = clock['frames']
    wide = next(s for s in clock['shots'] if s['shot'].startswith('3'))
    col, al, shade = c13.super_card()
    wav = P('out/edits/film_v14.wav')
    if not os.path.exists(wav):
        sys.exit('build cut v14 first (tools/combine_film_v14.py): its sound is used here')
    a0, A2, B2, info = arch_shot(clock, os.environ.get('CLOUD_DEBUG'))
    out = P('out/review/film_v15.mp4'); silent = out.replace('.mp4', '_silent.mp4')
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
    held = []; arch_start = None
    for k, f in enumerate(c13.frames_of(P('out/edits/Q04_t1_fixed.mp4'))):
        if k >= q4_last:
            break
        img = f.astype(np.float32) / 255
        if k >= a0:
            img = A2[k - a0]                                                       # Serath at her arch: the cloud moved
            arch_start = n if arch_start is None else arch_start
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
    k5 = 0
    for k, f in enumerate(c13.frames_of(P('out/takes/Q05_t1.mp4'))):
        if Q5_CUT[0] <= k < Q5_CUT[1]:
            continue
        img = B2[k] if k < Q5_S1 else f.astype(np.float32) / 255                   # B2 is registered already
        img = finish(img, n)
        if k < XF:
            w = (k + 1) / (XF + 1.0)
            img = held[k] * (1 - w) + img * w
        put(img); n += 1; k5 += 1
    enc.stdin.close()
    if enc.wait(): sys.exit('encode failed')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                    '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out], check=True)
    os.remove(silent)
    rec = {'file': 'out/review/film_v15.mp4', 'frames': n, 'seconds': round(n / FPS, 4), 'picture': 'cut v14 except the arch shot',
           'sound': 'out/edits/film_v14.wav, unchanged', 'arch_shot_starts_at_frame': arch_start, 'arch_shot_starts_at_s': round(arch_start / FPS, 3),
           'arch_shot_frames': q5_start + Q5_S1 - arch_start, 'q05_starts_at_frame': q5_start, 'cloud': info,
           'cloud_settings': {'drift_px_per_s_at_nearest': {k: v[2] for k, v in cd.masks().items()}, 'billow_px': cd.BILLOW, 'veil': cd.VEIL}}
    json.dump(rec, open(P('edit/film_v15.edl.json'), 'w'), indent=1)
    print(rec)


if __name__ == '__main__':
    main()
