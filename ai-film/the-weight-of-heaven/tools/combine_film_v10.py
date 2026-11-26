#!/usr/bin/env python3
"""The film so far, cut v10: movement I (cut v9, choir version A) and the council's opening, Q04. Editing only.

    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v10.py [--choir A|B]
        ->  out/review/film_v10.mp4, edit/film_v10.edl.json

  picture   movement I exactly as cut v8 left it (out/edits/I_bell_v8.mp4: graded, grained, matted; passed through);
            77 frames of black with the super "THREE DAYS LATER", in the lettering of the film's first super;
            Q04 take 1 as mended (out/edits/Q04_t1_fixed.mp4), then the film's grain and the 2.39:1 matte; the last
            half second fades out, because the scene goes on in Q05, which is not made yet.
  sound     cut v9's mix to its last sample, then the council's (out/edits/Q04_t1_fixed_mix.wav), which starts under
            the black. Nothing is re-mixed here; the join is checked in 5 ms steps.
"""
import argparse, importlib.util, json, os, subprocess, sys
import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
W, H, FPS, SR = 992, 432, 24, 48000
PRE_FRAMES = 77


def frames_of(path):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    while True:
        b = p.stdout.read(W * H * 3)
        if len(b) < W * H * 3:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)
    p.wait()


def super_card(text='THREE DAYS LATER'):
    """The lettering of the film's first super (tools/cut_bell.py, title_card): Inter Light, widely tracked, warm white."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    font = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Light.otf', 17)
    track = 6.5
    widths = [d.textlength(ch, font=font) for ch in text]
    x = (W - (sum(widths) + track * (len(text) - 1))) / 2
    for ch, w in zip(text, widths):
        d.text((x, H // 2 - 8), ch, font=font, fill=(233, 230, 222, 235)); x += w + track
    a = np.asarray(im).astype(np.float32) / 255
    return a[..., :3] * a[..., 3:]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--choir', default='A', choices='AB'); a = ap.parse_args()
    spec = importlib.util.spec_from_file_location('grade_bell', P('tools/grade_bell.py')); gb = importlib.util.module_from_spec(spec); spec.loader.exec_module(gb)
    g = json.load(open(P('grade/looks.json')))['looks']['orison'].get('grain')
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    out = P('out/review/film_v10.mp4'); silent = out.replace('.mp4', '_silent.mp4')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-an', '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709',
                            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', silent], stdin=subprocess.PIPE)
    n = 0; edl = []

    def finish(img, k):
        img = np.clip(gb.grain(img, k, g) if g else img, 0, 1)
        img[:top] = 0; img[top + band:] = 0
        return (img * 255 + 0.5).astype(np.uint8)

    # movement I, untouched
    n0 = n
    last = None
    for f in frames_of(P('out/edits/I_bell_v8.mp4')):
        enc.stdin.write(f.tobytes()); n += 1; last = f
    edl.append({'label': 'I. The bell (cut v8 picture, cut v9 sound)', 'source': 'out/edits/I_bell_v8.mp4', 'start_frame': n0, 'frames': n - n0})
    end_luma = float(last[top:top + band].mean())
    # black, the super
    card = super_card(); n0 = n
    for k in range(PRE_FRAMES):
        t = k / FPS
        o = float(np.clip((t - 0.45) / 0.55, 0, 1) * np.clip((2.85 - t) / 0.55, 0, 1))
        o = o * o * (3 - 2 * o)
        enc.stdin.write(finish(card * o, n).tobytes()); n += 1
    edl.append({'label': 'black; super "THREE DAYS LATER" (in 0.45-1.0 s, out 2.3-2.85 s)', 'source': 'made here', 'start_frame': n0, 'frames': n - n0})
    # the council
    clock = json.load(open(P('out/edits/Q04_t1_fixed.json'))); nq = clock['frames']; n0 = n
    for k, f in enumerate(frames_of(P('out/edits/Q04_t1_fixed.mp4'))):
        img = f.astype(np.float32) / 255
        if k >= nq - 12:
            img = img * (nq - 1 - k) / 12.0                                       # out, for now: the scene goes on in Q05
        enc.stdin.write(finish(img, n).tobytes()); n += 1
    for s in clock['shots']:
        edl.append({'label': 'II. The council, Q04 shot ' + s['shot'], 'source': 'out/edits/Q04_t1_fixed.mp4', 'start_frame': n0 + s['out_start_frame'], 'frames': s['frames'],
                    'take_seconds': [s['src_start_s'], s['src_end_s']], 'speed': s['speed']})
    enc.stdin.close()
    if enc.wait(): sys.exit('encode failed')

    # sound: one after the other, nothing re-mixed
    m1, sr1 = sf.read(P(f'out/edits/I_bell_v9_{a.choir}.wav'), always_2d=True)
    m2, sr2 = sf.read(P('out/edits/Q04_t1_fixed_mix.wav'), always_2d=True)
    assert sr1 == sr2 == SR
    n1 = 1539 * SR // FPS
    m1 = m1[:n1] if len(m1) >= n1 else np.pad(m1, ((0, n1 - len(m1)), (0, 0)))
    mix = np.concatenate([m1, m2])[:n * SR // FPS]
    wav = P('out/edits/film_v10.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                    '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out], check=True)
    os.remove(silent)
    # the join, in 5 ms steps
    step = SR // 200; j = n1
    mono = mix.mean(1)
    lv = [round(float(20 * np.log10(np.sqrt((mono[j + k * step:j + (k + 1) * step] ** 2).mean()) + 1e-9)), 1) for k in range(-20, 40)]
    rec = {'file': 'out/review/film_v10.mp4', 'frames': n, 'seconds': round(n / FPS, 4), 'choir_version_of_movement_I': a.choir, 'picture': edl,
           'movement_I_last_frame_mean_level_0_255': round(end_luma, 2),
           'join_at_s': round(n1 / SR, 4), 'join_levels_dbfs_5ms_steps_from_minus_100ms': lv,
           'largest_sample_step_at_join': round(float(np.abs(np.diff(mono[j - 480:j + 480])).max()), 5)}
    json.dump(rec, open(P('edit/film_v10.edl.json'), 'w'), indent=1)
    print('wrote', os.path.relpath(out, HERE), n, 'frames,', rec['seconds'], 's; movement I ends at level', rec['movement_I_last_frame_mean_level_0_255'])
    print('join levels (dBFS, 5 ms steps, from 100 ms before):', lv[:20], '|', lv[20:40])
    print('largest sample step at the join:', rec['largest_sample_step_at_join'])


if __name__ == '__main__':
    main()
