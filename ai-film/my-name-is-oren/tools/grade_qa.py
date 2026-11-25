#!/usr/bin/env python3
"""Acceptance checks for a graded render against its source (vidmoat colourist's ACCEPT line, calesthio's finishing QA):

    /home/user/ocio/.venv/bin/python tools/grade_qa.py grade/preview_scope.json

For every shot in the render: clipped and crushed pixels (any channel >= 0.985 / luma <= 0.015) must not grow versus the
source; every face (YuNet) must sit between 0.18 and 0.88 in luma; skin must stay on the vectorscope skin line (the face
centre's Cb/Cr angle near 123 degrees: a grade may move skin toward the line, never more than 3 degrees farther past 8); and the file must be tagged BT.709. Prints a table
and writes grade/qa_<name>.json. Measurements are on the shot's middle frame; a pass is evidence, eyes still decide.
"""
import json, os, subprocess, sys
import numpy as np
import cv2

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 854, 480
SKIN_LINE = 123.0   # the vectorscope skin (I) line, degrees from +Cb toward +Cr; complexion moves along it, not off it
DET = cv2.FaceDetectorYN.create(os.environ.get('YUNET', '/home/user/ocio/models/yunet.onnx'), '', (W, H), 0.6, 0.3, 50)


def frame(video, t):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', video, '-frames:v', '1', '-f', 'rawvideo',
                        '-pix_fmt', 'bgr24', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.uint8).reshape(H, W, 3).copy()


def measure(img):
    f = img.astype(np.float32) / 255
    y = f[..., 2] * .2126 + f[..., 1] * .7152 + f[..., 0] * .0722
    live = y > 0.004                                      # ignore letterbox bars
    clipped = float((f[live].max(1) >= 0.985).mean() * 100) if live.any() else 0.0
    crushed = float((y[live] <= 0.015).mean() * 100) if live.any() else 0.0
    _, faces = DET.detect(img)
    out = []
    for row in (faces if faces is not None else []):
        if row[14] < 0.6:
            continue
        x, yy, w, h = (int(v) for v in row[:4])
        cx0, cx1, cy0, cy1 = x + w // 4, x + 3 * w // 4, yy + h // 4, yy + 3 * h // 4
        patch = f[max(cy0, 0):cy1, max(cx0, 0):cx1]
        if patch.size == 0:
            continue
        r, g, b = patch[..., 2].mean(), patch[..., 1].mean(), patch[..., 0].mean()
        luma = .2126 * r + .7152 * g + .0722 * b
        cb, cr = (b - luma) / 1.8556, (r - luma) / 1.5748
        out.append({'luma': float(luma), 'hue': float(np.degrees(np.arctan2(cr, cb))), 'x': x + w / 2})
    return clipped, crushed, out


def main():
    spec = json.load(open(os.path.join(HERE, sys.argv[1])))
    shots = json.load(open(os.path.join(HERE, spec['shots'])))['shots']
    src, out = os.path.join(HERE, spec['video']), os.path.join(HERE, spec['out'])
    t0, t1 = spec.get('range') or (0, 1e9)
    tags = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                           'stream=color_space,color_primaries,color_transfer', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip()
    rows, fails = [], []
    for s in shots:
        if s.get('skip') or s['end'] <= t0 or s['start'] >= t1:
            continue
        t = (max(s['start'], t0) + min(s['end'], t1)) / 2
        c0, k0, f0 = measure(frame(src, t)); c1, k1, f1 = measure(frame(out, t - t0))
        row = {'id': s['id'], 't': round(t, 2), 'clipped': [round(c0, 2), round(c1, 2)], 'crushed': [round(k0, 2), round(k1, 2)],
               'faces': [round(f['luma'], 3) for f in f1]}
        problems = []
        if c1 > c0 + 0.3: problems.append(f'clipping grew {c0:.2f}->{c1:.2f}%')
        if k1 > k0 + 0.5: problems.append(f'crushing grew {k0:.2f}->{k1:.2f}%')
        for f in f1:
            if not 0.18 <= f['luma'] <= 0.88: problems.append(f"face luma {f['luma']:.2f}")
        for a in f1:                                       # pair faces by horizontal position
            near = min(f0, key=lambda b: abs(b['x'] - a['x']), default=None)
            if near and abs(near['x'] - a['x']) < 60:
                d = (a['hue'] - near['hue'] + 180) % 360 - 180
                before, after = abs(near['hue'] - SKIN_LINE), abs(a['hue'] - SKIN_LINE)
                row.setdefault('skin_hue_shift', []).append(round(d, 1))
                row.setdefault('skin_off_line', []).append([round(before, 1), round(after, 1)])
                if after > 8 and after > before + 3: problems.append(f'skin moved off the skin line: {before:.1f} -> {after:.1f} deg')
        row['problems'] = problems
        rows.append(row)
        if problems: fails.append(s['id'])
        print(f"{s['id']} {t:7.2f}  clip {c0:5.2f}->{c1:5.2f}%  crush {k0:5.2f}->{k1:5.2f}%  faces {row['faces']}  "
              f"skin off-line {row.get('skin_off_line', [])}  {'; '.join(problems) or 'ok'}", flush=True)
    res = {'render': spec['out'], 'tags': tags, 'tags_ok': tags == 'bt709,bt709,bt709', 'shots': rows, 'failing': fails}
    name = os.path.splitext(os.path.basename(sys.argv[1]))[0]
    json.dump(res, open(os.path.join(HERE, 'grade', f'qa_{name}.json'), 'w'), indent=1)
    print(f"tags {tags} ({'ok' if res['tags_ok'] else 'WRONG'}); {len(rows)} shots, {len(fails)} with problems: {fails}")


if __name__ == '__main__':
    main()
