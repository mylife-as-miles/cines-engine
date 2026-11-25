#!/usr/bin/env python3
"""Reframe each shot for 2.35:1 inside the 16:9 frame: choose which 364 rows of the 480-row picture sit in the band.

    /home/user/ocio/.venv/bin/python tools/grade_frame.py solve grade/shots.json grade/framing.json [--from S --to S]
    /home/user/ocio/.venv/bin/python tools/grade_frame.py board grade/shots.json grade/framing.json OUT.jpg --from S --to S

Faces (OpenCV YuNet, models at /home/user/ocio/models/yunet.onnx) are found on five frames across each shot. The window
keeps every face from just above the brows to just below the chin ("clean"); if that cannot fit, it keeps eyes, mouth and
chin and lets the forehead go ("forehead trimmed", normal in a scope close-up); if even that cannot fit, the shot is
"cannot frame". Shots without faces keep the rows with the most picture detail, with a mild pull to the centre.
grade/framing.json holds, per shot, the window's top row (y0, 0..116), the reason and the faces it saw; any shot can be
overridden by hand there ("y0": n, "manual": true) and the solver leaves it alone.
"""
import json, os, subprocess, sys
import numpy as np
import cv2

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H, BAND = 854, 480, 364
SLACK = H - BAND
MODEL = os.environ.get('YUNET', '/home/user/ocio/models/yunet.onnx')


def frame(video, t):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', video, '-frames:v', '1', '-f', 'rawvideo',
                        '-pix_fmt', 'bgr24', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.uint8).reshape(H, W, 3).copy()


def faces(det, img):
    _, f = det.detect(img)
    out = []
    for row in (f if f is not None else []):
        x, y, w, h = row[:4]
        if row[14] < 0.6 or h < 40:
            continue
        eyes_y = (row[5] + row[7]) / 2; mouth_y = (row[11] + row[13]) / 2
        out.append({'top': float(y), 'bottom': float(y + h), 'h': float(h), 'eyes': float(eyes_y), 'mouth': float(mouth_y),
                    'x': float(x + w / 2)})
    return out


def solve_shot(det, video, s):
    ts = [s['start'] + (s['end'] - s['start']) * k for k in (0.1, 0.3, 0.5, 0.7, 0.9)]
    imgs = [frame(video, t) for t in ts]
    fs = [f for im in imgs for f in faces(det, im)]
    if fs:
        hmax = max(f['h'] for f in fs)
        pref = (min(f['top'] for f in fs) - 0.10 * hmax, max(f['bottom'] for f in fs) + 0.06 * hmax)
        need = (min(f['eyes'] for f in fs) - 0.22 * hmax, max(f['bottom'] for f in fs) + 0.02 * hmax)
        if pref[1] - pref[0] <= BAND:
            mid = (pref[0] + pref[1]) / 2
            y0, reason = mid - BAND / 2, 'clean'
            # put the eyes a little above the band's middle when there is room (the scope close-up's eyeline)
            eyes = np.mean([f['eyes'] for f in fs])
            y0 = min(max(y0, eyes - BAND * 0.42 - 20), eyes - BAND * 0.42 + 20) if BAND * 0.42 < eyes else y0
            y0 = min(max(y0, pref[1] - BAND), pref[0])
        elif need[1] - need[0] <= BAND:
            y0, reason = need[1] + 6 - BAND, 'forehead trimmed'
        else:
            y0, reason = need[0], 'cannot frame'
    else:
        g = np.mean([cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) for im in imgs], 0)
        e = np.abs(cv2.Sobel(g, cv2.CV_32F, 1, 0)) + np.abs(cv2.Sobel(g, cv2.CV_32F, 0, 1))
        rows = e.mean(1); c = np.cumsum(np.r_[0, rows])
        best, y0 = -1, SLACK / 2
        for y in range(0, SLACK + 1, 2):
            score = (c[y + BAND] - c[y]) / c[-1] - 0.0008 * abs(y - SLACK / 2)
            if score > best:
                best, y0 = score, y
        reason = 'no faces: detail'
    y0 = int(round(min(max(y0, 0), SLACK)))
    return {'y0': y0, 'reason': reason, 'faces': len(fs)}


def in_range(s, a):
    lo = float(a[a.index('--from') + 1]) if '--from' in a else -1
    hi = float(a[a.index('--to') + 1]) if '--to' in a else 1e9
    return s['end'] > lo and s['start'] < hi


def main():
    a = sys.argv[1:]
    data = json.load(open(os.path.join(HERE, a[1]))); video = os.path.join(HERE, data['video'])
    fp = os.path.join(HERE, a[2]); fr = json.load(open(fp)) if os.path.exists(fp) else {}
    if a[0] == 'solve':
        det = cv2.FaceDetectorYN.create(MODEL, '', (W, H), 0.6, 0.3, 50)
        for s in data['shots']:
            if s.get('skip') or not in_range(s, a) or fr.get(s['id'], {}).get('manual'):
                continue
            fr[s['id']] = solve_shot(det, video, s)
            print(s['id'], f"{s['start']:7.2f}", fr[s['id']], flush=True)
        json.dump(fr, open(fp, 'w'), indent=1)
    elif a[0] == 'board':
        from PIL import Image, ImageDraw
        sel = [s for s in data['shots'] if not s.get('skip') and in_range(s, a)]
        cols, tw = 4, 427; th = int(tw * H / W); pad = 40
        rows = (len(sel) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * tw * 2 // 2, rows * (th + pad)), (16, 16, 16)); d = ImageDraw.Draw(sheet)
        for i, s in enumerate(sel):
            f = fr.get(s['id'], {'y0': SLACK // 2, 'reason': '?'})
            img = frame(video, (s['start'] + s['end']) / 2)[:, :, ::-1]
            out = np.zeros_like(img); top = SLACK // 2
            out[top:top + BAND] = img[f['y0']:f['y0'] + BAND]
            im = Image.fromarray(out).resize((tw, th))
            x, y = (i % cols) * tw, (i // cols) * (th + pad)
            sheet.paste(im, (x, y))
            col = {'clean': (140, 220, 140), 'forehead trimmed': (245, 197, 66), 'cannot frame': (240, 90, 90)}.get(f['reason'], (200, 200, 200))
            d.text((x + 4, y + th + 4), f"{s['id']} {s['start']:.1f}s  y0={f['y0']}  {f['reason']}", fill=col)
        sheet.save(os.path.join(HERE, a[3]), quality=90)


if __name__ == '__main__':
    main()
