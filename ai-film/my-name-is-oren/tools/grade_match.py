#!/usr/bin/env python3
"""Shot matching for the grade (the correction pass, before the look): measure every shot of the cut, then balance it
toward the film's own consensus with an ASC CDL applied in ACEScct through OpenColorIO.

    /home/user/ocio/.venv/bin/python tools/grade_match.py analyse out/edits/Q01_Q13_v6.mp4 grade/shots.json
    /home/user/ocio/.venv/bin/python tools/grade_match.py lightbox grade/shots.json design/grade/shots_before.jpg [--after]

Shots: scene cuts in the cut (ffmpeg scene score > 0.25), merged under 0.5 s. Each shot is sampled at 25/50/75 % at
320x180 and measured in ACEScct (from "Gamma 2.4 Encoded Rec.709", the generated footage being display-referred):
exposure (median luma), black and white points (2nd and 98th percentiles), the cast of its near-neutral pixels and its
mean chroma. The target is the best shot (vidmoat colourist: match to the best shot, not the average), named in grade/match.json
or picked as the shot most typical of the film in exposure and range; each shot moves part of the way toward it, within limits, so wides and close-ups keep their own nature (grade/match.json holds the strengths
and limits). The result per shot is a CDL (slope, offset, power, saturation) in ACEScct; tools/grade_render.py bakes
it with the chosen look into one LUT per shot.
"""
import json, os, subprocess, sys
import numpy as np
import PyOpenColorIO as OCIO

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = OCIO.Config.CreateFromFile('ocio://default')
SRC, WORK = 'Gamma 2.4 Encoded Rec.709', 'ACEScct'
LUMA = np.array([0.2722287, 0.6740818, 0.0536895], np.float32)     # AP1 luminance weights
DEFAULT_MATCH = {"exposure": 0.6, "exposure_limit": 0.06, "contrast": 0.4, "cast": 0.7, "cast_limit": 0.025,
                 "saturation": 0.5, "saturation_limit": 0.15}


def cpu(src, dst):
    return CFG.getProcessor(src, dst).getDefaultCPUProcessor()


TO_WORK = cpu(SRC, WORK)


def frame(path, t):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', path, '-frames:v', '1', '-vf', 'scale=320:180',
                        '-f', 'rawvideo', '-pix_fmt', 'rgb48le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.uint16).reshape(180, 320, 3).astype(np.float32) / 65535.0


def to_work(rgb):
    a = np.ascontiguousarray(rgb.reshape(-1, 3).astype(np.float32))
    TO_WORK.applyRGB(a)
    return a


def stats(pix):
    y = pix @ LUMA
    c = pix - y[:, None]
    chroma = np.linalg.norm(c, axis=1)
    neutral = chroma <= np.percentile(chroma, 30)
    cast = c[neutral].mean(0) if neutral.any() else np.zeros(3)
    return {'exposure': float(np.median(y)), 'black': float(np.percentile(y, 2)), 'white': float(np.percentile(y, 98)),
            'cast': [float(v) for v in cast], 'chroma': float(chroma.mean())}


def cuts(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-vf', "select='gt(scene,0.25)',showinfo", '-an', '-f', 'null', '-'],
                       capture_output=True, text=True)
    import re
    return [float(x) for x in re.findall(r'pts_time:([\d.]+)', r.stderr)]


def duration(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                                capture_output=True, text=True).stdout)


def analyse(video, out):
    D = duration(video)
    extra = [float(x) for x in os.environ.get('GRADE_SPLITS', '').split(',') if x]   # e.g. the fade out of black
    pts = sorted([0.0] + [c for c in cuts(video) if 0.5 < c < D - 0.5] + extra + [D])
    bounds = []
    for t in pts:
        if not bounds or t - bounds[-1] >= 0.5:
            bounds.append(t)
    shots = []
    for i in range(len(bounds) - 1):
        a, b = bounds[i], bounds[i + 1]
        pix = np.concatenate([to_work(frame(video, a + (b - a) * k)) for k in (0.25, 0.5, 0.75)])
        s = stats(pix); s.update(id=f'S{i + 1:03d}', start=round(a, 3), end=round(b, 3))
        if s['white'] - s['black'] < 0.02 or s['exposure'] < 0.1:     # black (the over-black opening) is not graded
            s['skip'] = True
        shots.append(s)
        print(f"{s['id']} {a:7.2f}-{b:7.2f}  exp {s['exposure']:.3f}  black {s['black']:.3f}  white {s['white']:.3f}  chroma {s['chroma']:.3f}",
              flush=True)
    json.dump({'video': video, 'working_space': WORK, 'source_space': SRC, 'shots': shots}, open(out, 'w'), indent=1)


def solve(data, match=None):
    m = dict(DEFAULT_MATCH, **(match or {}))
    live = [s for s in data['shots'] if not s.get('skip')]
    med = {k: float(np.median([s[k] for s in live])) for k in ('exposure', 'black', 'white', 'chroma')}
    # match to the BEST shot, not the average (vidmoat colourist): the named reference, or the shot whose exposure and
    # black-to-white range are most typical of the film without being the flattest
    ref = m.get('reference')
    if not ref:
        rng = med['white'] - med['black']
        ref = min(live, key=lambda s: abs(s['exposure'] - med['exposure']) / 0.057 +
                  abs((s['white'] - s['black']) - rng) / 0.05 + (0.5 if (s['white'] - s['black']) < rng else 0))['id']
    R = next(s for s in live if s['id'] == ref)
    T = {k: R[k] for k in ('exposure', 'black', 'white', 'chroma')}
    data['reference'] = ref
    T['cast'] = [0.0, 0.0, 0.0]                     # neutrals neutral: the look adds the colour
    for s in data['shots']:
        if s.get('skip'):
            s['cdl'] = None; continue
        # exposure: an offset in ACEScct (0.0571 per stop), part of the way, limited
        de = np.clip((T['exposure'] - s['exposure']) * m['exposure'], -m['exposure_limit'], m['exposure_limit'])
        # contrast: a slope about the exposure pivot, toward the target black-to-white range
        rng, trg = s['white'] - s['black'], T['white'] - T['black']
        slope = float(np.clip(1 + (trg / max(rng, 1e-3) - 1) * m['contrast'], 0.85, 1.18))
        pivot = s['exposure']
        cast = -np.clip(np.array(s['cast']) * m['cast'], -m['cast_limit'], m['cast_limit'])
        offset = (pivot * (1 - slope) + de + cast).tolist()
        sat = float(np.clip(1 + (T['chroma'] / max(s['chroma'], 1e-3) - 1) * m['saturation'], 1 - m['saturation_limit'], 1 + m['saturation_limit']))
        s['cdl'] = {'slope': [slope] * 3, 'offset': [round(o, 5) for o in offset], 'power': [1.0] * 3, 'sat': round(sat, 4)}
    data['target'] = T; data['match'] = m
    return data


def processor(cdl):
    g = OCIO.GroupTransform()
    g.appendTransform(OCIO.ColorSpaceTransform(src=SRC, dst=WORK))
    c = OCIO.CDLTransform(); c.setSlope(cdl['slope']); c.setOffset(cdl['offset']); c.setPower(cdl['power']); c.setSat(cdl['sat'])
    g.appendTransform(c)
    g.appendTransform(OCIO.ColorSpaceTransform(src=WORK, dst=SRC))
    return CFG.getProcessor(g).getDefaultCPUProcessor()


def apply_cdl(rgb, cdl):
    if not cdl:
        return rgb
    a = np.ascontiguousarray(rgb.reshape(-1, 3).astype(np.float32)); processor(cdl).applyRGB(a)
    return np.clip(a.reshape(rgb.shape), 0, 1)


def lightbox(data, out, after=False):
    from PIL import Image, ImageDraw
    shots = data['shots']; cols = 8; W, H = 213, 120
    rows = (len(shots) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * W, rows * (H + 14)), (16, 16, 16)); d = ImageDraw.Draw(sheet)
    for i, s in enumerate(shots):
        img = frame(data['video'], (s['start'] + s['end']) / 2)
        if after:
            img = apply_cdl(img, s.get('cdl'))
        im = Image.fromarray((np.clip(img, 0, 1) * 255 + .5).astype(np.uint8)).resize((W, H))
        x, y = (i % cols) * W, (i // cols) * (H + 14)
        sheet.paste(im, (x, y)); d.text((x + 3, y + H + 1), f"{s['id']} {s['start']:.0f}s", fill=(200, 200, 200))
    sheet.save(out, quality=90)


def main():
    a = sys.argv[1:]
    if a[0] == 'analyse':
        analyse(os.path.join(HERE, a[1]), os.path.join(HERE, a[2]))
    elif a[0] == 'solve':
        p = os.path.join(HERE, a[1]); data = json.load(open(p))
        mp = os.path.join(HERE, 'grade', 'match.json')
        data = solve(data, json.load(open(mp)) if os.path.exists(mp) else None)
        json.dump(data, open(p, 'w'), indent=1); print('solved', len(data['shots']), 'shots; target', data['target'])
    elif a[0] == 'lightbox':
        lightbox(json.load(open(os.path.join(HERE, a[1]))), os.path.join(HERE, a[2]), '--after' in a)


if __name__ == '__main__':
    main()
