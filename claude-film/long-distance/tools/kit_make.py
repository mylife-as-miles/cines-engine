# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""Finish the chosen generated takes into the committed kit: audio/kit/<name>.flac (48 kHz, 24-bit FLAC).

  uv run tools/kit_make.py [--only a,b]

audio/kit_plan.json: {"name": {"src": "knock.wav" (in audio/gen, or var/<key>/<n>.wav), "kind": "oneshot" | "bed",
                               "start": s, "end": s, "slice": n (the n-th onset, 1-based, one event)}}
oneshot  mono; the window [start, end] if given; the onset trimmed (first 1 ms frame within 40 dB of the peak, cut 3 ms
         early, 2 ms de-click); peak -1 dBFS; 0.15 s raised-cosine fade-out (shorter for short sounds).
bed      stereo; the window [start, end] (default: 0.3 s in from each edge, past the model's onset and tail); a 50 ms
         fade at each edge (the mix loops beds with 0.6 s crossfades); peak -1 dBFS (the mix sets its loudness).
Writes audio/kit/plan.json: every kit sound with its source take, the Stable Audio prompt and seed, the trim and
earshot's check (audio/gen/check.json, audio/gen/picks.json). Takes under -70 dBFS are refused.
"""
import json, os, subprocess, sys
import numpy as np, soundfile as sf

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
GEN = os.path.join(ROOT, 'audio', 'gen'); KIT = os.path.join(ROOT, 'audio', 'kit')


def load(p, ch):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', str(ch), '-ar', str(SR), '-af', 'aresample=resampler=soxr', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, ch)


def onsets(m, thr_db=-30, gap=0.12):
    n = int(0.005 * SR); e = np.sqrt(np.convolve(m * m, np.ones(n) / n, mode='same'))
    on = e > e.max() * 10 ** (thr_db / 20); out = []; last = -1e9
    for i in np.where(on[1:] & ~on[:-1])[0]:
        if i - last > gap * SR: out.append(int(i))
        last = i
    return out


def main():
    a = sys.argv[1:]; only = set(a[a.index('--only') + 1].split(',')) if '--only' in a else None
    plan = json.load(open(os.path.join(ROOT, 'audio', 'kit_plan.json')))
    gp = json.load(open(os.path.join(ROOT, 'audio', 'gen_plan.json')))
    ck = json.load(open(os.path.join(GEN, 'check.json'))) if os.path.exists(os.path.join(GEN, 'check.json')) else {}
    pk = json.load(open(os.path.join(GEN, 'picks.json'))) if os.path.exists(os.path.join(GEN, 'picks.json')) else {}
    os.makedirs(KIT, exist_ok=True)
    kp = os.path.join(KIT, 'plan.json'); rec = json.load(open(kp)).get('sounds', {}) if os.path.exists(kp) else {}
    for name, s in plan.items():
        if name.startswith('_') or (only and name not in only): continue
        src = os.path.join(GEN, s['src']); key = s.get('key', s['src'].split('/')[-2] if '/var/' in '/' + s['src'] else os.path.splitext(os.path.basename(s['src']))[0])
        if not os.path.exists(src): print(name, 'missing source', src); continue
        bed = s.get('kind') == 'bed'; x = load(src, 2 if bed else 1)
        st = s.get('start', 0.3 if bed else 0.0); en = s.get('end', len(x) / SR - (0.3 if bed else 0.0))
        x = x[int(st * SR):int(en * SR)].copy()
        if 20 * np.log10(np.abs(x).max() + 1e-12) < -70: print(name, 'near silent: refused'); continue
        if bed:
            f = int(0.05 * SR); x[:f] *= np.linspace(0, 1, f)[:, None]; x[-f:] *= np.linspace(1, 0, f)[:, None]
            y = x
        else:
            m = x[:, 0]
            if s.get('slice'):
                ons = onsets(m); i = s['slice'] - 1
                a0 = ons[i]; a1 = ons[i + 1] - int(0.01 * SR) if i + 1 < len(ons) else len(m); m = m[max(0, a0 - int(0.01 * SR)):a1]
            fr = int(0.001 * SR); pkv = np.abs(m).max()
            blocks = np.array([np.abs(m[i:i + fr]).max() for i in range(0, len(m) - fr, fr)])
            first = int(np.argmax(blocks > pkv * 10 ** (-40 / 20))) * fr; first = max(0, first - int(0.003 * SR))
            m = m[first:].copy(); dc = int(0.002 * SR); m[:dc] *= np.linspace(0, 1, dc)
            fo = min(int(0.15 * SR), len(m) // 3); m[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo)))
            y = m
        y = y / (np.abs(y).max() + 1e-12) * 10 ** (-1 / 20)
        out = os.path.join(KIT, name + '.flac'); sf.write(out, y.astype(np.float32), SR, subtype='PCM_24', format='FLAC')
        g = gp.get(key, {})
        rec[name] = {'source': 'Stable Audio 3.0 Small SFX (audio.cpp, CPU)', 'take': s['src'], 'prompt': g.get('prompt'), 'seed': g.get('seed'),
                     'dur_s': round(len(y) / SR, 3), 'kind': s.get('kind', 'oneshot'), 'window_s': [round(st, 3), round(en, 3)], 'slice': s.get('slice'),
                     'check': ck.get(key, {}).get('summary'), 'pick': pk.get(key), 'why': s.get('why')}
        print(f"{name}: {s['src']} [{st:.2f}, {en:.2f}] -> {len(y) / SR:.2f} s")
    json.dump({'model': 'Stable Audio 3.0 Small SFX (q8_0 GGUF via audio.cpp)', 'license': 'Stability AI Community License', 'sounds': rec},
              open(kp, 'w'), indent=1)


if __name__ == '__main__':
    main()
