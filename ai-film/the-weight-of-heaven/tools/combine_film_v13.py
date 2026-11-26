#!/usr/bin/env python3
"""The film so far, cut v13: the two cups are joined by a straight cut. Editing only.

    /root/leonxlnx/earshot/.venv/bin/python tools/combine_film_v13.py [--choir A|B]
        ->  out/review/film_v13.mp4, edit/film_v13.edl.json

The author, 26 November, on cut v12: "The transition of the cups should be a cut... Put the positions of the cup in the
same place."

  picture   movement I as cut v8 left it, up to three seconds into the still cup (frame 1443, 60.125 s). Then a cut,
            on that frame, to the trembling cup: a match cut. The trembling cup is laid exactly over the still one
            (tools/fix_q04_t1.py, register: rim, foot, the bowl's edges and the marble's edge agree to a pixel or two),
            and it is held there for its first 30 frames before the model's slow push carries on. "THREE DAYS LATER"
            is over the dome of the wide shot. No fade anywhere.
  sound     cut with the picture: movement I's mix goes out over 40 ms ending just after the cut and the council's
            comes in on the cut (overlapped, so there is no hole). The council's room and the cup's buzz are there from
            its first frame, and the first stroke of the far bells lands on the cut.
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
    out = P('out/review/film_v13.mp4'); silent = out.replace('.mp4', '_silent.mp4')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-an', '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709',
                            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', silent], stdin=subprocess.PIPE)

    def finish(img, k):
        img = np.clip(gb.grain(img, k, g) if g else img, 0, 1)
        img[:top] = 0; img[top + band:] = 0
        return img

    n = 0
    for i, f in enumerate(frames_of(P('out/edits/I_bell_v8.mp4'), FX0)):
        if i < FX0:
            enc.stdin.write(f.tobytes()); n += 1
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
    go = np.clip((t + 0.015) / 0.040, 0, 1); go = np.cos(0.5 * np.pi * go)         # movement I out over 40 ms, done 25 ms after the cut
    a1 = (m1 * go[:, None])[:N]
    mix[:len(a1)] += a1
    m2 = m2.copy(); r = int(0.005 * SR); m2[:r] *= np.linspace(0, 1, r)[:, None]   # the council in on the cut (5 ms, against a click);
    mix[j0:j0 + len(m2)] += m2[:N - j0]                                            # its first bell stroke lands with it
    tp = float(mb.true_peak(mix[j0 - SR:j0 + 3 * SR]))
    wav = P('out/edits/film_v13.wav'); sf.write(wav, mix, SR, subtype='PCM_24')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                    '-t', f'{n / FPS:.4f}', '-movflags', '+faststart', out], check=True)
    os.remove(silent)
    mono = mix.mean(1); step = SR // 200
    lv = [round(float(20 * np.log10(np.sqrt((mono[j0 + k * step:j0 + (k + 1) * step] ** 2).mean()) + 1e-9)), 1) for k in range(-40, 440)]
    dead = int((np.abs(mono[j0 - SR:j0 + 3 * SR]) < 1e-6).sum())
    q0 = FX0
    edl = [{'label': 'I. The bell, to three seconds into the still cup', 'source': 'out/edits/I_bell_v8.mp4', 'start_frame': 0, 'frames': FX0},
           {'label': 'match cut: the still cup to the trembling cup, the cup in the same place', 'at_frame': FX0, 'at_s': round(FX0 / FPS, 3), 'start_frame': FX0, 'frames': 0}]
    for s in clock['shots']:
        edl.append({'label': 'II. The council, Q04 shot ' + s['shot'], 'source': 'out/edits/Q04_t1_fixed.mp4', 'start_frame': q0 + s['out_start_frame'], 'frames': s['frames'],
                    'start_s': round((q0 + s['out_start_frame']) / FPS, 3), 'take_seconds': [s['src_start_s'], s['src_end_s']], 'speed': s['speed']})
    rec = {'file': 'out/review/film_v13.mp4', 'frames': n, 'seconds': round(n / FPS, 4), 'choir_version_of_movement_I': a.choir, 'picture': edl,
           'super': {'text': 'THREE DAYS LATER', 'over': 'Q04 shot 3, the wide', 'in_s': round((q0 + wide['out_start_frame'] + 8) / FPS, 3),
                     'out_s': round((q0 + wide['out_start_frame'] + 82) / FPS, 3)},
           'cut_s': round(FX0 / FPS, 3),
           'sound_join': {'movement_I_out_s': [round(FX0 / FPS - 0.015, 3), round(FX0 / FPS + 0.025, 3)], 'true_peak_dbtp_around_it': round(tp, 1),
                          'lowest_5ms_dbfs_from_200ms_before_to_2.2s_after': min(lv), 'highest': max(lv), 'samples_of_digital_silence': dead,
                          'level_every_100ms_dbfs': lv[::20]}}
    json.dump(rec, open(P('edit/film_v13.edl.json'), 'w'), indent=1)
    print('wrote', os.path.relpath(out, HERE), n, 'frames,', rec['seconds'], 's')
    print('sound across the cut, every 100 ms from 0.2 s before:', lv[::20])
    print('  every 5 ms from 50 ms before to 100 ms after:', lv[30:60])
    print('lowest 5 ms', min(lv), 'dBFS; digital silence samples', dead, '; true peak', round(tp, 1))


if __name__ == '__main__':
    main()
