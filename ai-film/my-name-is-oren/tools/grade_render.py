#!/usr/bin/env python3
"""Render the grade: per-shot balance (ASC CDL in ACEScct, OpenColorIO) + the chosen OpenEmulsion look, baked into one
33-point 3D LUT per shot, then film grain added once, written as BT.709-tagged 8-bit 4:2:0 H.264 with the cut's sound.

    /home/user/ocio/.venv/bin/python tools/grade_render.py grade/grade.json

grade/grade.json: {"video": the cut to grade (picture and sound), "shots": "grade/shots.json" (tools/grade_match.py),
  "look": an OpenEmulsion preset name or null, "look_mix": 0..1, "grain": {"amount": 0.012, "size": 1.2, "chroma": 0.15,
  "seed": 7}, "matte": null or 2.35, "framing": "grade/framing.json", "range": null or [start, end], "out": "out/edits/....mp4"}
With a matte, each shot's picture is moved so the rows its framing chose (tools/grade_frame.py) fill the 2.35:1 band.
Frames are decoded as 16-bit RGB, the shot's LUT applied with trilinear interpolation, grain added in display space
weighted toward the midtones (film grain is strongest in the mids and fades in deep shadow and highlight) and seeded
per frame so a re-render is identical, then encoded. The LUTs are written to grade/luts/ for review and reuse.
"""
import json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(HERE, 'tools'))
import grade_match as GM  # noqa: E402
import oe_look as OE      # noqa: E402

N = 33


def shot_lut(engine, cdl, look, mix):
    g = np.linspace(0, 1, N, dtype=np.float32)
    b, gg, r = np.meshgrid(g, g, g, indexing='ij')
    lat = np.stack([r, gg, b], -1).reshape(-1, 3)
    x = GM.apply_cdl(lat.reshape(1, -1, 3), cdl).reshape(-1, 3) if cdl else lat
    if look:
        y = engine.render(x.reshape(1, -1, 3), look).reshape(-1, 3)
        x = x + (y - x) * mix
    return np.clip(x, 0, 1).reshape(N, N, N, 3)           # index [b, g, r]


def write_cube(lut, path, title):
    with open(path, 'w') as f:
        f.write(f'TITLE "{title}"\nLUT_3D_SIZE {N}\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n')
        for row in lut.reshape(-1, 3):
            f.write(f'{row[0]:.6f} {row[1]:.6f} {row[2]:.6f}\n')


def apply_lut(img, lut):
    """trilinear lookup; img HxWx3 float 0..1; lut [b,g,r,3]"""
    p = img * (N - 1)
    i0 = np.clip(np.floor(p).astype(np.int32), 0, N - 2)
    f = p - i0
    r0, g0, b0 = i0[..., 0], i0[..., 1], i0[..., 2]
    fr, fg, fb = f[..., 0:1], f[..., 1:2], f[..., 2:3]
    out = 0
    for db in (0, 1):
        for dg in (0, 1):
            for dr in (0, 1):
                w = (fb if db else 1 - fb) * (fg if dg else 1 - fg) * (fr if dr else 1 - fr)
                out = out + w * lut[b0 + db, g0 + dg, r0 + dr]
    return out


def grain(shape, frame_no, cfg, luma):
    rng = np.random.default_rng(cfg.get('seed', 7) * 1_000_003 + frame_no)
    h, w = shape[:2]
    n = rng.standard_normal((h, w)).astype(np.float32)
    size = cfg.get('size', 1.2)
    if size > 1.0:                                           # grain size: a small blur of the noise field
        k = int(np.ceil(size)) | 1
        ker = np.exp(-0.5 * (np.arange(k) - k // 2) ** 2 / (0.5 * size) ** 2); ker /= ker.sum()
        n = np.apply_along_axis(lambda v: np.convolve(v, ker, 'same'), 1, n)
        n = np.apply_along_axis(lambda v: np.convolve(v, ker, 'same'), 0, n)
        n /= n.std() + 1e-6
    weight = 4 * luma * (1 - luma)                           # strongest in the mids
    mono = (n * weight * cfg.get('amount', 0.012))[..., None]
    c = cfg.get('chroma', 0.15)
    if c:
        cn = rng.standard_normal((h, w, 3)).astype(np.float32) * cfg.get('amount', 0.012) * c * weight[..., None]
        return mono + cn
    return mono


def main():
    spec = json.load(open(os.path.join(HERE, sys.argv[1])))
    shots = json.load(open(os.path.join(HERE, spec['shots'])))['shots']
    video, out = os.path.join(HERE, spec['video']), os.path.join(HERE, spec['out'])
    engine = OE.Engine() if spec.get('look') else None
    os.makedirs(os.path.join(HERE, 'grade', 'luts'), exist_ok=True)
    luts = []
    for s in shots:
        lut = shot_lut(engine, s.get('cdl'), spec.get('look'), spec.get('look_mix', 1.0)) if not s.get('skip') else None
        if lut is not None:
            write_cube(lut, os.path.join(HERE, 'grade', 'luts', f"{s['id']}.cube"), f"{s['id']} CDL + {spec.get('look')}")
        luts.append((round(s['start'] * 24), round(s['end'] * 24), lut))
    p = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                        '-of', 'csv=p=0', video], capture_output=True, text=True)
    W, H = (int(x) for x in p.stdout.strip().split(','))
    rng = spec.get('range')                                  # [start, end] seconds: a preview of part of the film
    cut = ['-ss', f'{rng[0]:.3f}', '-t', f'{rng[1] - rng[0]:.3f}'] if rng else []
    dec = subprocess.Popen(['ffmpeg', '-v', 'error'] + cut + ['-i', video, '-f', 'rawvideo', '-pix_fmt', 'rgb48le', '-'],
                           stdout=subprocess.PIPE)
    framing = {}
    band = H
    if spec.get('matte'):                                    # 2.35:1 inside the 16:9 frame, reframed per shot
        band = int(round(W / spec['matte'] / 2) * 2)
        framing = json.load(open(os.path.join(HERE, spec.get('framing', 'grade/framing.json'))))
    top = (H - band) // 2
    vf = ['format=yuv420p']
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb48le', '-s', f'{W}x{H}', '-r', '24',
                            '-i', '-'] + cut + ['-i', video, '-map', '0:v', '-map', '1:a', '-vf', ','.join(vf),
                            '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-profile:v', 'high',
                            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
                            '-c:a', 'copy', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    fsz, idx = W * H * 6, 0
    k = int(round(rng[0] * 24)) if rng else 0               # frame number on the film's clock
    g = spec.get('grain')
    while True:
        buf = dec.stdout.read(fsz)
        if len(buf) < fsz:
            break
        img = np.frombuffer(buf, np.uint16).reshape(H, W, 3).astype(np.float32) / 65535.0
        while idx < len(luts) - 1 and k >= luts[idx][1]:
            idx += 1
        lut = luts[idx][2]
        if lut is not None:
            img = apply_lut(img, lut)
            if g:
                y = img @ np.array([0.2126, 0.7152, 0.0722], np.float32)
                img = img + grain(img.shape, k, g, y)
        if band < H:
            y0 = framing.get(shots[idx]['id'], {}).get('y0', top)
            boxed = np.zeros_like(img); boxed[top:top + band] = img[y0:y0 + band]
            img = boxed
        enc.stdin.write((np.clip(img, 0, 1) * 65535 + 0.5).astype('<u2').tobytes())
        k += 1
        if k % 480 == 0:
            print(f'{k} frames', flush=True)
    enc.stdin.close(); enc.wait(); dec.wait()
    print('wrote', spec['out'], k, 'frames')


if __name__ == '__main__':
    main()
