#!/usr/bin/env python3
"""The film so far, cut v11: movement I runs into the council through the cup itself. Editing only.

    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v11.py [--choir A|B]
        ->  out/review/film_v11.mp4, edit/film_v11.edl.json

The author, 26 November, on cut v10: remove the fade that ends movement I and the black card, which slow the film; let
the two cups "transition together", in Park Chan-wook's manner; and put "THREE DAYS LATER" on the wide shot of the chamber.

  picture   movement I as cut v8 left it, up to three seconds into the still cup (frame 1443, 60.125 s). Then a matched
            dissolve of 30 frames: the still cup becomes the trembling cup. The second was laid exactly over the first
            (tools/fix_q04_t1.py, register), so nothing moves but the room behind the cup and the wine in it. No fade to
            black, no card. "THREE DAYS LATER" is set over the dome of the wide shot, in the lettering of the film's first
            super. The cut ends on Serath's turn with no fade (the scene goes on in Q05, which is not made yet).
  sound     movement I's mix (cut v9) is let go over the dissolve (out by 1.75 s after it starts) while the council's
            comes up under it: the wedding bell's last air gives way to bells that no one has rung and the cup's buzz.
            The council's mix is tools/mix_q04.py's, on the picture's clock.
"""
import argparse, importlib.util, json, os, subprocess, sys
import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
W, H, FPS, SR = 992, 432, 24, 48000
FX0 = 1443                                  # v8 frame where the dissolve starts: the still cup has been alone for 3.0 s


def frames_of(path, limit=None):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path] + (['-frames:v', str(limit)] if limit else []) + ['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    while True:
        b = p.stdout.read(W * H * 3)
        if len(b) < W * H * 3:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)
    p.wait()


def super_card(text='THREE DAYS LATER', y=40):
    """The lettering of the film's first super (tools/cut_bell.py): Inter Light, widely tracked, warm white; here over a
    picture, so with a soft shade behind it. Returns (colour premultiplied, its alpha, the shade's alpha)."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    font = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Light.otf', 17)
    track = 6.5
    widths = [d.textlength(ch, font=font) for ch in text]
    x = (W - (sum(widths) + track * (len(text) - 1))) / 2
    for ch, w in zip(text, widths):
        d.text((x, y), ch, font=font, fill=(233, 230, 222, 240)); x += w + track
    a = np.asarray(im).astype(np.float32) / 255
    shade = np.asarray(im.split()[3].filter(ImageFilter.GaussianBlur(5))).astype(np.float32) / 255
    return a[..., :3] * a[..., 3:], a[..., 3:], np.clip(shade * 2.2, 0, 0.85)[..., None]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--choir', default='A', choices='AB'); a = ap.parse_args()
    spec = importlib.util.spec_from_file_location('grade_bell', P('tools/grade_bell.py')); gb = importlib.util.module_from_spec(spec); spec.loader.exec_module(gb)
    spec = importlib.util.spec_from_file_location('mb', P('tools/mix_bell.py')); mb = importlib.util.module_from_spec(spec); spec.loader.exec_module(mb)
    g = json.load(open(P('grade/looks.json')))['looks']['orison'].get('grain')
    band = int(round(W / 2.39 / 2) * 2); top = (H - band) // 2
    clock = json.load(open(P('out/edits/Q04_t1_fixed.json'))); nq = clock['frames']; D = clock['dissolve_frames']
    wide = next(s for s in clock['shots'] if s['shot'].startswith('3'))
    col, al, shade = super_card()
    out = P('out/review/film_v11.mp4'); silent = out.replace('.mp4', '_silent.mp4')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-an', '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709',
                            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', silent], stdin=subprocess.PIPE)

    def finish(img, k):
        img = np.clip(gb.grain(img, k, g) if g else img, 0, 1)
        img[:top] = 0; img[top + band:] = 0
        return img

    tail = []                                                                      # the still cup's frames under the dissolve
    n = 0
    for i, f in enumerate(frames_of(P('out/edits/I_bell_v8.mp4'), FX0 + D)):
        if i < FX0:
            enc.stdin.write(f.tobytes()); n += 1
        elif i < FX0 + D:
            tail.append(f.astype(np.float32) / 255)
        else:
            break
    for k, f in enumerate(frames_of(P('out/edits/Q04_t1_fixed.mp4'))):
        img = f.astype(np.float32) / 255
        j = k - wide['out_start_frame']                                           # the super, over the wide shot's dome
        if 0 <= j < wide['frames']:
            o = float(np.clip((j - 8) / 12.0, 0, 1) * np.clip((82 - j) / 12.0, 0, 1)); o = o * o * (3 - 2 * o)
            if o > 0:
                img = img * (1 - shade * o * 0.55)
                img = img * (1 - al * o) + col * o
        img = finish(img, n)
        if k < D:                                                                  # the matched dissolve
            w = (k + 1) / (D + 1.0); w = w * w * (3 - 2 * w)
            img = tail[k] * (1 - w) + img * w
        enc.stdin.write((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()); n += 1
    enc.stdin.close()
    if enc.wait(): sys.exit('encode failed')

    # ------------------------------------------------------------------ sound
    m1, sr1 = sf.read(P(f'out/edits/I_bell_v9_{a.choir}.wav'), always_2d=True)
    m2, sr2 = sf.read(P('out/edits/Q04_t1_fixed_mix.wav'), always_2d=True)
    assert sr1 == sr2 == SR
    N = n * SR // FPS; j0 = FX0 * SR // FPS
    mix = np.zeros((N, 2), np.float32)
    t = (np.arange(len(m1)) - j0) / SR
    go = np.clip((t - 0.15) / 1.6, 0, 1); go = 0.5 * (1 + np.cos(np.pi * go))      # movement I let go over the dissolve
    a1 = (m1 * go[:, None])[:N]
    mix[:len(a1)] += a1
    mix[j0:j0 + len(m2)] += m2[:N - j0]
    tp = float(mb.true_peak(mix[j0 - SR:j0 + 3 * SR]))
    wav = P('out/edits/film_v11.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                    '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out], check=True)
    os.remove(silent)
    mono = mix.mean(1); step = SR // 200
    lv = [round(float(20 * np.log10(np.sqrt((mono[j0 + k * step:j0 + (k + 1) * step] ** 2).mean()) + 1e-9)), 1) for k in range(-40, 440)]
    dead = int((np.abs(mono[j0 - SR:j0 + 3 * SR]) < 1e-6).sum())
    q0 = FX0
    edl = [{'label': 'I. The bell, to three seconds into the still cup', 'source': 'out/edits/I_bell_v8.mp4', 'start_frame': 0, 'frames': FX0},
           {'label': 'matched dissolve: the still cup becomes the trembling cup', 'start_frame': FX0, 'frames': D}]
    for s in clock['shots']:
        edl.append({'label': 'II. The council, Q04 shot ' + s['shot'], 'source': 'out/edits/Q04_t1_fixed.mp4', 'start_frame': q0 + s['out_start_frame'], 'frames': s['frames'],
                    'start_s': round((q0 + s['out_start_frame']) / FPS, 3), 'take_seconds': [s['src_start_s'], s['src_end_s']], 'speed': s['speed']})
    rec = {'file': 'out/review/film_v11.mp4', 'frames': n, 'seconds': round(n / FPS, 4), 'choir_version_of_movement_I': a.choir, 'picture': edl,
           'super': {'text': 'THREE DAYS LATER', 'over': 'Q04 shot 3, the wide', 'in_s': round((q0 + wide['out_start_frame'] + 8) / FPS, 3),
                     'out_s': round((q0 + wide['out_start_frame'] + 82) / FPS, 3)},
           'dissolve_s': [round(FX0 / FPS, 3), round((FX0 + D) / FPS, 3)],
           'sound_join': {'movement_I_let_go_s': [round(FX0 / FPS + 0.15, 3), round(FX0 / FPS + 1.75, 3)], 'true_peak_dbtp_around_it': round(tp, 1),
                          'lowest_5ms_dbfs_from_200ms_before_to_2.2s_after': min(lv), 'highest': max(lv), 'samples_of_digital_silence': dead,
                          'level_every_100ms_dbfs': lv[::20]}}
    json.dump(rec, open(P('edit/film_v11.edl.json'), 'w'), indent=1)
    print('wrote', os.path.relpath(out, HERE), n, 'frames,', rec['seconds'], 's')
    print('sound across the dissolve, every 100 ms from 0.2 s before:', lv[::20])
    print('lowest 5 ms', min(lv), 'dBFS; digital silence samples', dead, '; true peak', round(tp, 1))


if __name__ == '__main__':
    main()
