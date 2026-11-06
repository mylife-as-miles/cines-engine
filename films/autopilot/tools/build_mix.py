# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile", "pyloudnorm"]
# ///
"""Build the film's soundtrack from its own cue sheet (tools/cuesheet.js), then mix it with opus-sound-layer.

  node tools/cuesheet.js out/cuesheet.json
  uv run tools/build_mix.py [--mix [--mux]]

1. The bed (out/mix/bed.wav): every room tone and bed the sequences declare, looped to its span with its fades and
   relative level (audio/sound_map.json), the radio's music through a small speaker, the world's silences and ducks; then
   the score (audio/score_plan.json): each Lyria cue windowed past its intro, retuned to A440 (audio/score/check.json),
   levelled, faded and placed on the film's clock. The score is not silenced: only the world is.
2. The voices (out/mix/voice/): Daniel's takes clean; the radio presenter through a small speaker, quieter.
3. The effects (audio/cues.json): every cue mapped to its recording, for the sound layer's mix.py, which places each
   sound's peak (or start) on its cue, solves its level against the bed in its own band, adds one shared room, ducks the
   bed under the voice and masters to -18 LUFS.
With --mix it runs mix.py into out/audio.
"""
import hashlib, json, os, subprocess, sys
import numpy as np
from scipy import signal
import soundfile as sf
import pyloudnorm as pyln

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OTM = os.path.normpath(os.path.join(ROOT, '..', 'one-too-many', 'audio', 'sfx'))
MIXPY = os.environ.get('SOUND_LAYER_MIX', '/home/user/bodila51/opus-sound-layer/scripts/mix.py')
OUT = os.path.join(ROOT, 'out', 'mix')
meter = pyln.Meter(SR)


def resolve(k):
    kind, name = k.split('/', 1)
    if kind == 'gen':                                       # the committed kit (FLAC); audio/gen is the generation scratch
        k = os.path.join(ROOT, 'audio', 'kit', name + '.flac')
        return k if os.path.exists(k) else os.path.join(ROOT, 'audio', 'gen', name + '.wav')
    if kind == 'otm': return os.path.join(OTM, name + '.flac')
    if kind == 'synth': return os.path.join(ROOT, 'audio', 'synth', name + '.wav')
    if kind == 'score': return os.path.join(ROOT, 'audio', 'score', name + '.mp3')
    raise SystemExit('unknown sound ' + k)


def load(path, ch=2, af=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', path, '-ac', str(ch), '-ar', str(SR)] + (['-af', af] if af else []) + ['-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, ch).copy()


def lufs(x):
    x = np.atleast_2d(x.T).T
    if len(x) < SR // 2:
        r = np.sqrt(np.mean(x ** 2)) + 1e-12; return 20 * np.log10(r) - 0.7
    v = meter.integrated_loudness(x); return float(v) if np.isfinite(v) else -70.0


undb = lambda d: 10 ** (d / 20)


def sos_filter(x, kind, f):
    sos = signal.butter(4, f, kind, fs=SR, output='sos'); return signal.sosfilt(sos, x, axis=0)


def radio(x):
    """A small speaker in a car or a kitchen: band-limited, a presence peak, gentle saturation."""
    y = sos_filter(x, 'highpass', 320); y = sos_filter(y, 'lowpass', 3400)
    b, a = signal.iirpeak(1600 / (SR / 2), 1.2); y = y + 0.6 * signal.lfilter(b, a, y, axis=0)
    g = np.max(np.abs(y)) + 1e-9; y = np.tanh(1.8 * y / g) * g / np.tanh(1.8)
    return y


def apply_filter(x, spec):
    if not spec: return x
    if spec.startswith('lp:'): return sos_filter(x, 'lowpass', float(spec[3:]))
    if spec.startswith('hp:'): return sos_filter(x, 'highpass', float(spec[3:]))
    if spec == 'radio': return radio(x)
    return x


def synth_bed(name, n, seed):
    rng = np.random.default_rng(seed); t = np.arange(n) / SR
    if name == 'tinnitus':                      # the thin ringing: a high tone that wavers very slightly
        f = 7200 * (1 + 0.0015 * np.sin(2 * np.pi * 0.3 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
        y = np.sin(ph) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.17 * t)); return np.stack([y, y], 1)
    if name == 'heat':                          # a dry, high, airless shimmer
        y = rng.standard_normal((n, 2)); y = sos_filter(y, 'highpass', 6500); y = sos_filter(y, 'lowpass', 12000); return y
    raise SystemExit('no synth bed ' + name)


def loop_to(x, n, offset, xf=int(0.6 * SR)):
    """n samples of x looped with equal-power crossfades, starting at offset."""
    if len(x) <= 2 * xf: x = np.concatenate([x] * (2 * xf // max(1, len(x)) + 2))
    body = len(x) - xf; out = np.zeros((n + len(x), x.shape[1])); pos = -(offset % body)
    fin = np.sqrt(np.linspace(0, 1, xf))[:, None]; fout = np.sqrt(np.linspace(1, 0, xf))[:, None]
    while pos < n:
        seg = x.copy(); seg[:xf] *= fin; seg[-xf:] *= fout
        a = max(0, pos); s0 = a - pos; e = min(len(out), pos + len(seg))
        out[a:e] += seg[s0:s0 + (e - a)]; pos += body
    return out[:n]


def env(n, fi, fo):
    e = np.ones(n); fi = min(int(fi * SR), n // 2); fo = min(int(fo * SR), n // 2)
    if fi: e[:fi] = np.linspace(0, 1, fi)
    if fo: e[-fo:] *= np.linspace(1, 0, fo)
    return e[:, None]


def seed_of(s): return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)


def main():
    cs = json.load(open(os.path.join(ROOT, 'out', 'cuesheet.json')))
    M = json.load(open(os.path.join(ROOT, 'audio', 'sound_map.json')))
    plan = json.load(open(os.path.join(ROOT, 'audio', 'score_plan.json')))
    check = json.load(open(os.path.join(ROOT, 'audio', 'score', 'check.json')))
    vmap = json.load(open(os.path.join(ROOT, 'audio', 'voice_map.json')))
    T = cs['total']; N = int(np.ceil(T * SR)); seqs = {s['id']: s for s in cs['seqs']}
    os.makedirs(os.path.join(OUT, 'voice'), exist_ok=True)

    # ---------------- the world: beds ----------------
    world = np.zeros((N, 2)); src_cache = {}
    med = {}
    for b in cs['beds']:
        if b.get('p', {}).get('level') is not None: med.setdefault(b['name'], []).append(b['p']['level'])
    med = {k: float(np.median(v)) for k, v in med.items()}
    missing = set()
    for b in cs['beds']:
        key = b['name'] + '@' + b['seq'] if (b['name'] + '@' + b['seq']) in M['beds'] else b['name']
        e = M['beds'].get(key, 'missing')
        if e == 'missing': missing.add('bed ' + b['name']); continue
        if e is None: continue
        if e.get('until') is not None and b['t1'] > e['until']:          # the map can end a bed early (the radio fading out)
            b = dict(b, t1=e['until'], t1g=b['t0g'] + (e['until'] - b['t0']), p=dict(b.get('p', {}), fo=3.0))
        n = int((b['t1g'] - b['t0g']) * SR)
        if n <= 0: continue
        if e.get('synth'):
            x = synth_bed(e['synth'], n + SR, seed_of(key + b['seq'])); x *= undb(e['lufs'] - lufs(x[: 10 * SR]))
            seg = x[:n]
        else:
            ck = (e['file'], e.get('filter'), e['lufs'])
            if ck not in src_cache:
                spec = e.get('filter') or ''
                af = f'asetrate={SR}*{spec[6:]},aresample={SR}' if spec.startswith('speed:') else None
                x = load(resolve(e['file']), 2, af); x = apply_filter(x, spec if not spec.startswith('speed:') else None)
                src_cache[ck] = x * undb(e['lufs'] - lufs(x))
            seg = loop_to(src_cache[ck], n, seed_of(key + b['seq'] + str(b['t0'])) % max(1, len(src_cache[ck])))
        p = b.get('p', {}); rel = float(np.clip(p['level'] - med[b['name']], -12, 12)) if p.get('level') is not None and b['name'] in med else 0.0
        sq = seqs[b['seq']]
        fi = p.get('fi') if p.get('fi') is not None else (0.04 if b['t0'] <= 0.01 else 0.8)
        fo = p.get('fo') if p.get('fo') is not None else (0.04 if abs(b['t1'] - sq['dur']) < 0.01 else 0.8)
        s = int(b['t0g'] * SR); seg = seg * env(len(seg), fi, fo) * undb(rel)
        e2 = min(N, s + len(seg)); world[s:e2] += seg[: e2 - s]
    # a faint air floor under the whole world from the alarm on, so no moment goes digitally dead (the planned silences
    # still silence it, with the rest of the world)
    rng = np.random.default_rng(5); fl = sos_filter(rng.standard_normal((N, 2)), 'lowpass', 900); fl = sos_filter(fl, 'highpass', 60)
    fl *= undb(-60 - lufs(fl[: 60 * SR])); a0 = int(4.5 * SR); fl[:a0] = 0; fl[a0:a0 + SR] *= np.linspace(0, 1, SR)[:, None]
    world += fl
    # the world's silences and ducks (the score and the voice are not part of the world)
    ctrl = np.ones(N)
    for x in cs['silences']:
        a, b2 = int(x['t0g'] * SR), int(x['t1g'] * SR); r0 = int(0.04 * SR); r1 = int(0.3 * SR)
        ctrl[max(0, a - r0):a] = np.minimum(ctrl[max(0, a - r0):a], np.linspace(1, 0, a - max(0, a - r0)))
        ctrl[a:b2] = 0; e2 = min(N, b2 + r1); ctrl[b2:e2] = np.minimum(ctrl[b2:e2], np.linspace(0, 1, e2 - b2))
    for d in cs['ducks']:
        a, b2 = int(d['t0g'] * SR), int(d['t1g'] * SR); lv = float(d['level']); r = int(0.3 * SR)
        ramp = np.linspace(1, lv, r); ctrl[a:a + r] = np.minimum(ctrl[a:a + r], ramp[: len(ctrl[a:a + r])])
        ctrl[a + r:b2] = np.minimum(ctrl[a + r:b2], lv); e2 = min(N, b2 + r); ctrl[b2:e2] = np.minimum(ctrl[b2:e2], np.linspace(lv, 1, e2 - b2))
    world *= ctrl[:, None]

    # ---------------- the score ----------------
    score = np.zeros((N, 2)); placed = []
    for c in plan['cues']:
        if c.get('diegetic'): continue                         # the radio's music is a bed (radio_music), not score
        f = None
        for ext in ('.mp3', '.wav'):
            pth = os.path.join(ROOT, 'audio', 'score', c['id'] + ext)
            if os.path.exists(pth): f = pth; break
        if not f: missing.add('score ' + c['id']); continue
        cents = (check.get(c['id']) or {}).get('tune_cents', 0.0) or 0.0
        r = 2 ** (-cents / 1200)
        x = load(f, 2, f'asetrate={SR}*{r:.6f},aresample={SR}')
        x *= undb(-23 - lufs(x))
        need = int((c['end_s'] - c['start_s']) * SR)
        fr = int(0.1 * SR); rms = np.array([np.sqrt(np.mean(x[i:i + fr] ** 2)) for i in range(0, max(1, len(x) - fr), fr)])
        rdb = 20 * np.log10(rms + 1e-9); first = int(np.argmax(rdb > rdb.max() - 18)) * fr
        st = first if first + need <= len(x) else max(0, len(x) - need)
        seg = x[st:st + need]; have = len(seg)                # a take shorter than its span fades at its own end
        fi = c.get('fade_in_s', 2.0 if need > 20 * SR else 1.2)
        fo = c.get('fade_out_s', 0.06 if c['id'] == 'M11b' else 2.5)
        seg = seg * env(have, fi, fo) * undb(c.get('level_db', -15) + 9)
        if have < need: seg = np.concatenate([seg, np.zeros((need - have, 2))])
        s = int(c['start_s'] * SR); e2 = min(N, s + need); score[s:e2] += seg[: e2 - s]
        placed.append((c['id'], c['start_s'], c['end_s'], round(st / SR, 2), round(cents, 1)))
    bed = world + score
    sf.write(os.path.join(OUT, 'bed.wav'), bed.astype(np.float32), SR, subtype='FLOAT')
    sf.write(os.path.join(OUT, 'world.wav'), world.astype(np.float32), SR, subtype='FLOAT')
    sf.write(os.path.join(OUT, 'score.wav'), score.astype(np.float32), SR, subtype='FLOAT')

    # ---------------- the voices ----------------
    voices = []
    for c in cs['cues']:
        if c['name'] not in ('voice', 'radio'): continue
        p = c.get('p', {}); lid = p.get('id'); vm = vmap.get(lid)
        if not vm: missing.add('take ' + str(lid)); continue
        y = load(os.path.join(ROOT, vm['file']), 1)
        if c['name'] == 'radio': y = radio(y) * undb(p.get('level') if p.get('level') is not None else -8)
        else: y = y * undb(p.get('level') or 0)
        out = os.path.join(OUT, 'voice', f"{lid}.wav"); sf.write(out, y[:, 0].astype(np.float32), SR, subtype='FLOAT')
        voices.append({'file': out, 'start_s': round(c['tg'], 3)})

    # ---------------- the effects ----------------
    sil = [(x['t0g'], x['t1g']) for x in cs['silences']]
    occ = {}; cues = []
    for c in cs['cues']:
        if c['name'] in ('voice', 'radio'): continue
        key = c['name'] + '@' + c['seq'] if (c['name'] + '@' + c['seq']) in M['cues'] else c['name']
        e = M['cues'].get(key, 'missing')
        if e == 'missing': missing.add('cue ' + c['name']); continue
        if e is None: continue
        k = occ[(c['seq'], c['name'])] = occ.get((c['seq'], c['name']), -1) + 1
        if isinstance(e, list): e = e[min(k, len(e) - 1)]
        if any(a - 0.02 <= c['tg'] < b2 for a, b2 in sil): continue        # the world is silent
        cue = {'id': f"{c['seq']}.{c['name']}.{k}", 't': round(c['tg'], 3), 'sound': resolve(e['file']),
               'weight': e.get('weight', 'support'), 'align': e.get('align', 'peak')}
        pan = c.get('p', {}).get('pan')
        if pan is not None: cue['pan'] = float(np.clip(pan, -0.6, 0.6))
        cues.append(cue)
    for c in cues:
        if not os.path.exists(c['sound']): missing.add('file ' + c['sound'])

    silence_ok = [[0.0, 4.6]] + [[round(a, 2), round(b2, 2)] for a, b2 in sil]   # the opening title on black is silent on purpose
    sheet = {'fps': 24, 'duration_s': round(T, 3), 'energy': 'calm', 'lufs': -18, 'kit': os.path.join(ROOT, 'audio', 'kit'),
             'room': {'decay_s': 0.6, 'wet_db': -16}, 'music': {'file': os.path.join(OUT, 'bed.wav'), 'start_s': 0, 'loop': False, 'fade_out_s': 0.05},
             'voice': voices, 'duck_db': 9, 'silence_ok': silence_ok, 'cues': cues}
    json.dump(sheet, open(os.path.join(ROOT, 'audio', 'cues.json'), 'w'), indent=1)
    print(f"bed: {len(cs['beds'])} beds, {len(placed)} score cues -> out/mix/bed.wav ({lufs(bed):.1f} LUFS before the mixer)")
    for p in placed: print('  score', p)
    print(f"voices: {len(voices)}; effects: {len(cues)} -> audio/cues.json")
    if missing: print('MISSING:', ', '.join(sorted(missing)))
    if '--mix' in sys.argv:
        A = os.path.join(ROOT, 'out', 'audio')
        r = subprocess.run(['uv', 'run', MIXPY, os.path.join(ROOT, 'audio', 'cues.json'), '--out', A], cwd=ROOT)
        if r.returncode: sys.exit(r.returncode)
        # the AAC encode overshoots transient-rich music (the glockenspiel) by about 1.5 dB, so the master's sample peaks
        # are held at -3 dBFS (latency-compensated: the timing stays sample-exact) before it is encoded
        os.replace(os.path.join(A, 'mix.wav'), os.path.join(A, 'mix_raw.wav'))
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', os.path.join(A, 'mix_raw.wav'), '-af',
                        'alimiter=limit=0.708:attack=1:release=50:level=false:latency=1', '-c:a', 'pcm_f32le', os.path.join(A, 'mix.wav')], check=True)
        pic = os.path.join(ROOT, 'out', 'autopilot_picture.mp4')
        if '--mux' in sys.argv and os.path.exists(pic):
            subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', pic, '-i', os.path.join(A, 'mix.wav'), '-map', '0:v', '-map', '1:a',
                            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart',
                            os.path.join(ROOT, 'out', 'autopilot.mp4')], check=True)
            print('wrote out/autopilot.mp4')


if __name__ == '__main__':
    main()
