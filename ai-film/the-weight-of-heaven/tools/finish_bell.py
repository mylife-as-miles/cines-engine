#!/usr/bin/env python3
"""Finish movement I: cut, grade, reframe, grain, matte and sound, in the right order.

    python3 tools/finish_bell.py [--release A|B|C] [--look orison|belliron|vellum] [--mix out/edits/I_bell_v5_mix.wav]
                                 [--name I_bell_v5] [--tag <suffix>]

The grade's accent and shaping regions are fixed rectangles measured on each shot's plain framing, so the order is:
  1. tools/cut_bell.py --flat      the cut with nothing that moves the frame or its level (no push, shake, punch-in, fades)
  2. tools/grade_bell.py --no-grain  correction, look, accents and shaping, per shot
  3. here                           the push on the nave, the shakes, the punch-in (release B) and the fades, on the graded picture
  4. here                           grain once, over everything, then the 2.39:1 matte
  5. here                           the mix laid under it (AAC 256 k)
Writes out/edits/<name>_<release>_<look><tag>.mp4. Editing only; nothing is generated.
"""
import argparse, importlib.util, json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(HERE, 'tools'))
import cut_bell as cb


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode: sys.exit((r.stdout + r.stderr)[-3000:])
    return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--release', default='C', choices='ABC'); ap.add_argument('--look', default='orison')
    ap.add_argument('--mix'); ap.add_argument('--name', default='I_bell_v5'); ap.add_argument('--tag', default='')
    ap.add_argument('--no-matte', action='store_true')
    a = ap.parse_args()
    E = os.path.join(HERE, 'out', 'edits')
    flat = os.path.join(E, f"{a.name}_picture_{a.release}_flat.mp4")
    print(run([sys.executable, os.path.join(HERE, 'tools', 'cut_bell.py'), '--release', a.release, '--name', a.name, '--flat']).stdout.split('\n')[0])
    edl = json.load(open(flat.replace('.mp4', '.edl.json')))
    graded = os.path.join(E, f"{a.name}_{a.release}_{a.look}_graded_flat.mp4")
    r = run([sys.executable, os.path.join(HERE, 'tools', 'grade_bell.py'), '--in', flat, '--edl', flat.replace('.mp4', '.edl.json'),
             '--look', a.look, '--no-grain', '--out', graded])
    print([l for l in (r.stdout + r.stderr).split('\n') if l.startswith('wrote') or 'warn' in l.lower()])

    # 3. put back what moves the frame, shot by shot, on the graded picture
    fc, labels = [], []
    for k, p in enumerate(edl['picture']):
        f0, n = p['start_frame'], p['frames']
        vf = []
        if p['label'] == 'The nave': vf.append(cb.NAVE_PUSH)
        if p['label'].startswith('The release'):
            if a.release == 'B': vf.append(cb.PUNCH_B)
            vf.append(cb.shake(1.25, 4))
        if p['label'] == 'The hammer and the stroke': vf.append(cb.shake(2.0, 6))
        if p['label'] == 'The still cup': vf.append(cb.CUP_FADE)
        fc.append(f"[0:v]trim=start_frame={f0}:end_frame={f0 + n},setpts=PTS-STARTPTS" + ''.join(',' + v for v in vf)
                  + f",fps=24,scale=992:432,setsar=1,trim=end_frame={n},setpts=PTS-STARTPTS,format=yuv420p[v{k}]")
        labels.append(f"[v{k}]")
    fc.append(''.join(labels) + f"concat=n={len(labels)}:v=1:a=0[v]")
    moved = os.path.join(E, f"{a.name}_{a.release}_{a.look}_graded_moved.mp4")
    run(['ffmpeg', '-v', 'error', '-y', '-i', graded, '-filter_complex', ';'.join(fc), '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '8',
         '-preset', 'medium', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-r', '24', moved])

    # 4. grain once, then the matte (the grader's own grain, seeded per frame)
    spec = importlib.util.spec_from_file_location('grade_bell', os.path.join(HERE, 'tools', 'grade_bell.py')); gb = importlib.util.module_from_spec(spec); spec.loader.exec_module(gb)
    g = json.load(open(os.path.join(HERE, 'grade', 'looks.json')))['looks'][a.look].get('grain')
    W, H = 992, 432
    band = H if a.no_matte else int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    silent = os.path.join(E, f"{a.name}_{a.release}_{a.look}_picture.mp4")
    dec = gb.decoder(moved, 'bt709', False, threads=1); enc = gb.encoder(silent, W, H, '24', threads=2, crf=14)
    n = 0
    for u16 in gb.frames(dec, W, H):
        img = gb.to_float(u16)
        if g: img = gb.grain(img, n, g)
        img = np.clip(img, 0, 1)
        if top > 0: img[:top] = 0; img[top + band:] = 0
        enc.stdin.write((img * 65535 + 0.5).astype('<u2').tobytes()); n += 1
    enc.stdin.close()
    if enc.wait(): sys.exit('encode failed')
    if n != edl['frames']: sys.exit(f'FRAME COUNT {n} != {edl["frames"]}')
    out = os.path.join(E, f"{a.name}_{a.release}_{a.look}{a.tag}.mp4")
    if a.mix:
        run(['ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', a.mix if os.path.isabs(a.mix) else os.path.join(HERE, a.mix), '-map', '0:v', '-map', '1:a',
             '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-t', str(edl['duration']), '-movflags', '+faststart', out])
    else:
        os.replace(silent, out)
    for f in (graded, moved): os.remove(f)
    print(f"wrote {out}: {n} frames, look {a.look}, release {a.release}, grain {'on' if g else 'off'}, matte {'off' if a.no_matte else '2.39'}, sound {'yes' if a.mix else 'NO'}")


if __name__ == '__main__':
    main()
