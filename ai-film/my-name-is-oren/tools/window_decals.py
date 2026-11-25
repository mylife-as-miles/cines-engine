#!/usr/bin/env python3
"""Letter the laundrette window (script A06) on the generator's blank plates:

    /home/user/ocio/.venv/bin/python tools/window_decals.py edits/decals_Q01.json [--proof out.png]

A06: "The laundrette window. Clean decals: FREE TRANSLATION. FREE LEGAL FORMS. FREE TUTORING WHILE YOU WAIT. Beside
them, an older sign with half its letters peeled away: FREE WASHES FOR SCHOOL UNIFORMS." Nothing readable comes from
the model (DECISIONS.md, On-screen text): the take was asked for blank plates, and the words go on here.

- Each clean decal is set in Inter Bold, centred in its plate, and laid on as vinyl: the ink over the plate, at the
  footage's softness. The shot is locked off (measured drift under 0.1 px), so one layer serves every frame.
- The older sign is printed across the two peeled notices above the right plate, in a faded red, only where a notice
  remains, with the letters the config's "peeled" pattern drops gone, and a fine flaking through the ink (seeded).
The config gives the take, the frame range, the plates (rect x0, y0, x1, y1 and lines), the ink, and the old sign.
Writes the config's "out" (.mkv: lossless FFV1, for the next pass; .mp4: H.264); other frames pass through and the
sound is copied.
"""
import json, os, subprocess, sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = '/usr/share/fonts/opentype/inter/Inter-{}.otf'
K = 4                                                                 # lettering drawn at 4x, then reduced


def lettering(w, h, lines, style='Bold', fill=0.86, peeled=None):
    """a text mask (0..1) of size w x h: the lines centred and as large as fits; `peeled` (one string per line, the
    same length) keeps a letter where its pattern has a character and drops it where the pattern has a space"""
    W, H = w * K, h * K
    size = H
    while size > 4:
        f = ImageFont.truetype(FONT.format(style), size)
        widths = [f.getbbox(t)[2] - f.getbbox(t)[0] for t in lines]
        lh = f.getbbox('HG')[3] - f.getbbox('HG')[1]
        if max(widths) <= W * fill and lh * len(lines) * 1.45 <= H * fill:
            break
        size -= 2
    im = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(im)
    total = lh * len(lines) + lh * 0.45 * (len(lines) - 1)
    y = (H - total) / 2
    for n, t in enumerate(lines):
        x = (W - (f.getbbox(t)[2] - f.getbbox(t)[0])) / 2 - f.getbbox(t)[0]
        for j, ch in enumerate(t):
            if peeled is None or peeled[n][j] != ' ':
                d.text((x, y - f.getbbox('HG')[1]), ch, font=f, fill=255)
            x += f.getlength(ch)
        y += lh * 1.45
    m = np.asarray(im.resize((w, h), Image.LANCZOS), np.float32) / 255
    return m


def build_layer(shape, C):
    """the decals as an RGB colour and an alpha, full frame"""
    h, w = shape[:2]
    col = np.zeros((h, w, 3), np.float32)
    alpha = np.zeros((h, w), np.float32)
    ink = np.array(C['ink'], np.float32) / 255
    for p in C['plates']:
        x0, y0, x1, y1 = p['rect']
        m = lettering(x1 - x0, y1 - y0, p['lines'], fill=p.get('fill', 0.82))
        alpha[y0:y1, x0:x1] = np.maximum(alpha[y0:y1, x0:x1], m * 0.95)
        col[y0:y1, x0:x1] = ink
    o = C.get('old_sign')
    if o:
        x0, y0, x1, y1 = o['rect']
        m = lettering(x1 - x0, y1 - y0, o['lines'], style='Black', fill=0.92, peeled=o.get('peeled'))
        where = np.zeros((y1 - y0, x1 - x0), np.float32)              # only where a notice remains
        for rx0, ry0, rx1, ry1 in o['remnants']:
            where[max(0, ry0 - y0):max(0, ry1 - y0), max(0, rx0 - x0):max(0, rx1 - x0)] = 1
        where = cv2.GaussianBlur(where, (0, 0), 1.5)
        rng = np.random.default_rng(o.get('seed', 3) + 1)            # flaking: a fine broken texture through the ink
        flake = cv2.GaussianBlur(rng.random((y1 - y0, x1 - x0)).astype(np.float32), (0, 0), 1.2)
        flake = np.clip((flake - flake.mean()) * 4 + 0.9, 0, 1)
        a = m * where * flake * o.get('opacity', 0.7)
        sl = (slice(y0, y1), slice(x0, x1))
        col[sl] = np.where((a > alpha[sl])[..., None], np.array(o['ink'], np.float32) / 255, col[sl])
        alpha[sl] = np.maximum(alpha[sl], a)
    soft = C.get('soft', 0.55)
    return cv2.GaussianBlur(col, (0, 0), soft), cv2.GaussianBlur(alpha, (0, 0), soft)


def main():
    C = json.load(open(os.path.join(HERE, sys.argv[1])))
    cap = cv2.VideoCapture(os.path.join(HERE, C['take']))
    F = []
    while True:
        ok, f = cap.read()
        if not ok:
            break
        F.append(f)
    col, alpha = build_layer(F[0].shape, C)
    a0, a1 = C['frames']
    for i in range(a0, a1 + 1):
        img = F[i][..., ::-1].astype(np.float32) / 255
        out = img * (1 - alpha[..., None]) + col * alpha[..., None]
        F[i] = (np.clip(out, 0, 1) * 255 + .5).astype(np.uint8)[..., ::-1]
    if '--proof' in sys.argv:
        f = F[(a0 + a1) // 2]
        cv2.imwrite(os.path.join(HERE, sys.argv[sys.argv.index('--proof') + 1]),
                    np.vstack([f, cv2.resize(f[100:260, 30:790], (854, 180), interpolation=cv2.INTER_CUBIC)]))
    h, w = F[0].shape[:2]
    out = os.path.join(HERE, C['out'])
    codec = (['-c:v', 'ffv1', '-level', '3'] if out.endswith('.mkv') else
             ['-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
              '-movflags', '+faststart'])
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{w}x{h}',
                            '-r', '24', '-i', '-', '-i', os.path.join(HERE, C['take']), '-map', '0:v', '-map', '1:a']
                           + codec + ['-c:a', 'copy', out], stdin=subprocess.PIPE)
    for f in F:
        enc.stdin.write(np.ascontiguousarray(f).tobytes())
    enc.stdin.close()
    enc.wait()
    print('wrote', C['out'], len(F), 'frames')


if __name__ == '__main__':
    main()
