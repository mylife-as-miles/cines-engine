#!/usr/bin/env python3
"""Lay the film's added sounds (audio/sound_plan.json) under the edit's own sound, then mux onto its picture.

    python3 tools/sound_mix.py [audio/sound_plan.json]

Beds loop with 0.6 s equal-power crossfades from a seeded offset (keep the seed when re-cutting, so untouched scenes
keep their sound), with fades in and out, an optional filter ("af", e.g. a high-pass) and boosts over stretches
where a take's own ground was removed; cues start on their mark. Each sound is set to its `level` (integrated
LUFS over its length in the mix). The edit's sound (dialogue and the takes' sync sound) is kept as it is; the sum
goes through a limiter at -1.5 dBFS and the picture is copied untouched. Writes the film, out/audio/layers.wav and
out/audio/mix.json (every placement on the film's clock).
"""
import json, os, random, re, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, **kw)


def load(path, af=None):
    r = run(['ffmpeg', '-v', 'error', '-i', path] + (['-af', af] if af else []) + ['-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'])
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, 2).copy()


def lufs(x):
    r = run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128',
             '-f', 'null', '-'], input=x.astype(np.float32).tobytes())
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr.decode())
    return float(m[-1]) if m else -70.0


def clock(edl):
    segs = edl['segments']

    def t(v):
        if v == 'end':
            return edl['duration']
        if isinstance(v, (int, float)):
            return float(v)
        name, s = v.split('@')
        s = float(s)
        for g in segs:
            if os.path.basename(g['file']) == name + '.mp4' and g['from'] / edl['fps'] <= s <= (g['to'] + 1) / edl['fps']:
                return g['at'] + s - g['from'] / edl['fps']
        sys.exit(f'{v}: that moment of {name} is not in the edit')
    return t


def fades(y, fi, fo):
    n = len(y)
    if fi:
        k = min(n, int(fi * SR)); y[:k] *= np.linspace(0, 1, k)[:, None] ** 2
    if fo:
        k = min(n, int(fo * SR)); y[n - k:] *= np.linspace(1, 0, k)[:, None] ** 2
    return y


def loop_bed(src, n, seed, xf=0.6):
    """n samples of src looped with equal-power crossfades, starting from a seeded offset"""
    x = int(xf * SR)
    start = random.Random(seed).randrange(0, max(1, len(src) - x))
    out = np.zeros((n + len(src), 2), np.float32)
    cur, pos = src[start:], 0
    fin, fout = np.sin(np.linspace(0, np.pi / 2, x))[:, None], np.cos(np.linspace(0, np.pi / 2, x))[:, None]
    while pos < n:
        seg = cur.copy()
        if pos > 0:
            seg[:x] *= fin                      # crossfades with the previous piece's faded-out tail
        L = len(seg)
        seg[L - x:] *= fout
        out[pos:pos + L] += seg
        pos += L - x
        cur = src
    return out[:n]


def main():
    plan = json.load(open(os.path.join(HERE, sys.argv[1] if len(sys.argv) > 1 else 'audio/sound_plan.json')))
    edl = json.load(open(os.path.join(HERE, plan['edl'])))
    T, N = clock(edl), int(round(edl['duration'] * SR))
    sfx = json.load(open(os.path.join(HERE, 'audio', 'sfx', 'plan.json')))
    layers, record = np.zeros((N, 2), np.float32), []
    for b in plan.get('beds', []):
        src = load(os.path.join(HERE, sfx[b['sound']]['file']), b.get('af'))
        t0, t1 = T(b['from']), T(b['to'])
        n = int((t1 - t0) * SR)
        y = loop_bed(src, n, b.get('offset_seed', 1))
        y *= 10 ** ((b['level'] - lufs(y)) / 20)
        env = np.ones(n, np.float32)         # boosts: a bed comes up where a take's own ground was taken away
        for bo in b.get('boost', []):
            u0, u1, ramp = int((T(bo['from']) - t0) * SR), int((T(bo['to']) - t0) * SR), int(bo.get('ramp', 0.5) * SR)
            g = 10 ** (bo['db'] / 20)
            seg = np.full(max(0, u1 - u0), g, np.float32)
            k = min(ramp, len(seg) // 2)
            if k:
                seg[:k] = np.linspace(1, g, k); seg[-k:] = np.linspace(g, 1, k)
            env[max(0, u0):max(0, u0) + len(seg)] = seg[:n - max(0, u0)]
        y *= env[:, None]
        y = fades(y, b.get('fade_in', 1.0), b.get('fade_out', 2.0))
        i = int(t0 * SR); layers[i:i + len(y)] += y[:N - i]
        record.append({'id': b['id'], 'sound': b['sound'], 'from': round(t0, 3), 'to': round(t1, 3), 'level': b['level']})
    for c in plan.get('cues', []):
        y = load(os.path.join(HERE, sfx[c['sound']]['file']))
        if c.get('max'):
            y = y[:int(c['max'] * SR)].copy()
        y *= 10 ** ((c['level'] - lufs(y)) / 20)
        y = fades(y, c.get('fade_in', 0), c.get('fade_out', 0.15))
        t0 = T(c['at']); i = int(t0 * SR)
        layers[i:i + len(y)] += y[:N - i]
        record.append({'id': c['id'], 'sound': c['sound'], 'at': round(t0, 3), 'dur': round(len(y) / SR, 3), 'level': c['level']})
    os.makedirs(os.path.join(HERE, 'out', 'audio'), exist_ok=True)
    lay = os.path.join(HERE, 'out', 'audio', 'layers.wav')
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', lay],
        input=layers.tobytes())
    json.dump({'film': plan['out'], 'placements': record}, open(os.path.join(HERE, 'out', 'audio', 'mix.json'), 'w'), indent=1)
    out = os.path.join(HERE, plan['out'])
    r = run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, plan['video']), '-i', lay, '-filter_complex',
             # both padded and the sum trimmed to the edit's length: amix alone ended ~0.1 s early; the limiter
             # compensates its 5 ms look-ahead, or the whole soundtrack sits 5 ms late
             f'[0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,apad=whole_len={N}[f];'
             f'[1:a]aformat=sample_fmts=fltp:channel_layouts=stereo,apad=whole_len={N}[l];'
             f'[f][l]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.841:level=false:latency=1,'
             f'atrim=end_sample={N}[a]',
             '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
             '-movflags', '+faststart', out])
    if r.returncode:
        sys.exit(r.stderr.decode()[-1500:])
    for p in record:
        print(p)
    print('wrote', plan['out'])


if __name__ == '__main__':
    main()
