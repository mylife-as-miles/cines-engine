# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile", "pyloudnorm"]
# ///
"""Mix Seven Days of No's soundtrack: the author's narration, the music beds and the effects, mastered for YouTube.

  /home/user/leonxlnx/earshot/.venv/bin/python tools/build_mix.py      (or: uv run tools/build_mix.py)
      -> out/mix/seven_days_mix.wav (48 kHz stereo, 24-bit), out/mix/stems/{voice,music,fx}.flac, out/mix/report.json

Reads the cue sheet the engine writes (out/cuesheet.json: named beds and cues on the clock), or audio/cues_draft.json
(tools/cues_draft.py, drafted from design/SEQUENCES.md) until it exists; audio/score_plan.json (which take and window each
music bed is); audio/sound_map.json (which file and level each cue is, and the mix settings). Nothing is placed by hand.

1. Voice: out/vo/narration.wav from 0 s (high-pass 70 Hz, a gentle 2:1 compressor on the loudest syllables). Its
   integrated loudness Lv is the reference every other level is set against.
2. Music: each bed span (adjacent spans of one name joined) is a window of its take, pitch-shifted into the shared key
   (score_plan beds), at level_db re Lv, with its fades centred on the span's edges (so beds crossfade at chapter turns);
   music_end is aligned so the take's final chord dies away on the last frame.
3. Ducking: speech regions from the narration's own envelope (pauses under 1.2 s merged, so the music does not pump
   between sentences). In each region the music is held 12 dB under the voice's level there (its 3 s loudness, ridden
   down only, never up), with a 0.35 s attack before the words and a 0.9 s release after. Where no one speaks (the
   stop-down, the end screen) the bed plays at its own level. The cue sheet's own silences mute music and effects;
   its ducks (level factors) apply to the music.
4. Effects: each cue's sound at rel_db re Lv (its loudest 100 ms, K-weighted), peak- or start-aligned, panned.
5. Master: gain to -14 LUFS integrated, then a look-ahead true-peak limiter (4x oversampled detection) at -1.5 dBTP,
   twice (the limiter costs a little loudness). The limiter's gain is applied to every stem too, so the stems sum to
   the mix exactly. Sample peaks therefore sit at or under -1.5 dBFS before any AAC encode.
"""
import json, os, subprocess, sys
import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d
import pyloudnorm as pyln

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'out', 'mix')
undb = lambda d: 10 ** (np.asarray(d) / 20)
meter = pyln.Meter(SR)
# ITU-R BS.1770 K-weighting at 48 kHz (shelf, then high-pass)
KW = [([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]),
      ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])]


def kweight(x):
    for b, a in KW: x = signal.lfilter(b, a, x, axis=0)
    return x


def lufs(x):
    x = np.asarray(x)
    if len(x) < int(0.5 * SR): return loud_max(x, 0.1)
    v = meter.integrated_loudness(x if x.ndim > 1 else x[:, None]); return float(v) if np.isfinite(v) else -70.0


def ms_window(x, win_s):
    """K-weighted mean square summed over channels, in a centred running window (running sums, not convolution)."""
    k = kweight(x); p = (k ** 2).sum(axis=1) if k.ndim > 1 else k ** 2
    n = max(1, int(win_s * SR)); c = np.concatenate([[0.0], np.cumsum(p)])
    i = np.arange(len(p)); a = np.clip(i - n // 2, 0, len(p)); b = np.clip(i + n - n // 2, 0, len(p))
    return (c[b] - c[a]) / np.maximum(1, b - a)


def loud_max(x, win_s=0.1):
    """The loudest win_s window, K-weighted, in LUFS-like dB (how loud a short effect is)."""
    return float(-0.691 + 10 * np.log10(np.max(ms_window(np.atleast_2d(np.asarray(x).T).T, win_s)) + 1e-12))


def load(path, ch=2, af=None):
    cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-i', path] + (['-af', af] if af else []) + ['-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, ch).copy()


def take_path(tid):
    for ext in ('.wav', '.flac', '.mp3'):
        p = os.path.join(ROOT, 'audio', 'score', tid + ext)
        if os.path.exists(p): return p
    return None


def in_rate(path):
    return int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate',
                                        '-of', 'csv=p=0', path]).decode().split()[0])


def raised(n, up=True):
    r = np.sin(np.linspace(0, np.pi / 2, max(1, n))) ** 2
    return r if up else r[::-1]


def loop_window(x, start, n, loop=None, xf=int(0.6 * SR)):
    """n samples of x from `start`; if that runs past the take (or past loop[1]), continue from loop[0] with an
    equal-power crossfade, as often as needed."""
    out = np.zeros((n, x.shape[1])); pos = 0; s = start
    a, b = (loop if loop else (0, len(x)))
    b = min(b, len(x))
    while pos < n:
        end = b if s < b else len(x)
        seg = x[s:end]
        if len(seg) == 0: break
        take = min(len(seg), n - pos)
        piece = seg[:take].copy()
        if pos > 0:
            k = min(xf, take); piece[:k] *= np.sqrt(np.linspace(0, 1, k))[:, None]
        if pos + take < n:                                       # will loop: fade the tail and overlap
            k = min(xf, take); piece[-k:] *= np.sqrt(np.linspace(1, 0, k))[:, None]
            out[pos:pos + take] += piece; pos += take - k; s = a
        else:
            out[pos:pos + take] += piece; pos += take
    return out


def compress(x, thr_db, ratio, att, rel, rate=1000):
    """A gentle feed-forward compressor at a 1 kHz control rate (10 ms RMS detector, one-pole attack/release)."""
    hop = SR // rate; m = x if x.ndim == 1 else x.mean(axis=1)
    p = uniform_filter1d(m ** 2, size=int(0.01 * SR))[::hop]
    lv = 10 * np.log10(p + 1e-12); gr = -np.maximum(0, lv - thr_db) * (1 - 1 / ratio)
    aa, ar = np.exp(-1 / (att * rate)), np.exp(-1 / (rel * rate)); g = np.empty_like(gr); s = 0.0
    for i, v in enumerate(gr):
        c = aa if v < s else ar; s = c * s + (1 - c) * v; g[i] = s
    gs = np.interp(np.arange(len(m)), np.arange(len(g)) * hop, g)
    return x * (undb(gs)[:, None] if x.ndim > 1 else undb(gs)), float(gr.min())


def tp_limiter_gain(x, ceil_db, release_s=0.08, look_s=0.002):
    """Gain curve (per sample) that holds x's true peak (4x oversampled) at ceil_db: look-ahead, smooth attack, one-pole
    release at a 1 kHz control rate, then a sample-accurate safety minimum."""
    up = signal.resample_poly(x, 4, 1, axis=0)
    pk = np.abs(up).max(axis=1)[: 4 * len(x)].reshape(-1, 4).max(axis=1)
    need = np.minimum(1.0, undb(ceil_db) / (pk + 1e-12))
    if need.min() >= 1.0: return np.ones(len(x))
    hop = SR // 1000; nb = int(np.ceil(len(need) / hop))
    blk = np.pad(need, (0, nb * hop - len(need)), constant_values=1).reshape(nb, hop).min(axis=1)
    la = max(1, int(look_s * 1000)); blk = minimum_filter1d(blk, size=2 * la + 1, origin=0)
    a = np.exp(-1 / (release_s * 1000)); r = np.empty_like(blk); s = 1.0
    for i, v in enumerate(blk):
        s = v if v < s else a * s + (1 - a) * v; r[i] = s
    g = np.interp(np.arange(len(need)), np.arange(nb) * hop + hop / 2, r)
    g = np.minimum(g, minimum_filter1d(need, size=int(0.0015 * SR)))              # never over the ceiling
    return np.minimum(uniform_filter1d(g, size=24), need)


def speech_regions(v, merge_s, thr_db=-45.0):
    """(t0, t1) spans where the narration speaks: 10 ms RMS over thr_db, gaps under merge_s joined."""
    h = int(0.01 * SR); n = len(v) // h
    db = 10 * np.log10((v[: n * h] ** 2).reshape(n, h).mean(axis=1) + 1e-12)
    act = maximum_filter1d((db > thr_db).astype(np.uint8), 7) > 0
    regs = []; i = 0
    while i < n:
        if act[i]:
            j = i
            while j < n and act[j]: j += 1
            regs.append([i * 0.01, j * 0.01]); i = j
        else: i += 1
    merged = []
    for a, b in regs:
        if merged and a - merged[-1][1] < merge_s: merged[-1][1] = b
        else: merged.append([a, b])
    return [(round(a, 2), round(b, 2)) for a, b in merged if b - a > 0.15]


def main():
    cs_path = os.path.join(ROOT, 'out', 'cuesheet.json')
    draft = not os.path.exists(cs_path)
    if draft: cs_path = os.path.join(ROOT, 'audio', 'cues_draft.json')
    cs = json.load(open(cs_path)); plan = json.load(open(os.path.join(ROOT, 'audio', 'score_plan.json')))
    M = json.load(open(os.path.join(ROOT, 'audio', 'sound_map.json'))); MX = M['mix']
    T = float(cs['total']); N = int(round(T * SR)); missing = set(); report = {'cuesheet': os.path.relpath(cs_path, ROOT), 'draft': draft}
    os.makedirs(os.path.join(OUT, 'stems'), exist_ok=True)

    # ---------------- 1. voice ----------------
    vc = MX['voice']
    v = load(os.path.join(ROOT, 'out', 'vo', 'narration.wav'), 1)[:, 0]
    raw_lufs = lufs(v)
    v = signal.sosfilt(signal.butter(2, vc['hp_hz'], 'highpass', fs=SR, output='sos'), v)
    v, max_gr = compress(v, vc['comp_threshold_dbfs'], vc['comp_ratio'], vc['comp_attack_s'], vc['comp_release_s'])
    voice = np.zeros(N); s0 = int(round(vc.get('offset_s', 0) * SR)); e0 = min(N, s0 + len(v)); voice[s0:e0] = v[: e0 - s0]
    Lv = lufs(voice)
    report['voice'] = {'raw_lufs': round(raw_lufs, 2), 'treated_lufs': round(Lv, 2), 'comp_max_gr_db': round(max_gr, 1)}

    # ---------------- 2. music beds ----------------
    beds = sorted(cs['beds'], key=lambda b: b['t0g'])
    spans = []
    for b in beds:                                      # join adjacent spans of one bed (an engine may cut beds per sequence)
        if spans and spans[-1]['name'] == b['name'] and abs(spans[-1]['t1g'] - b['t0g']) < 0.1:
            spans[-1]['t1g'] = b['t1g']; spans[-1]['p'] = dict(spans[-1]['p'], fo=b.get('p', {}).get('fo', spans[-1]['p'].get('fo')))
        else: spans.append({'name': b['name'], 't0g': b['t0g'], 't1g': b['t1g'], 'p': dict(b.get('p', {}))})
    music = np.zeros((N, 2)); cache = {}; occ = {}; placed = []
    for sp in spans:
        e = plan.get('beds', {}).get(sp['name'], 'missing')
        if e == 'missing': missing.add('bed ' + sp['name']); continue
        if e is None: continue
        k = occ[sp['name']] = occ.get(sp['name'], -1) + 1
        path = take_path(e['take'])
        if not path: missing.add('take ' + e['take']); continue
        cents = float(e.get('pitch_cents', 0)); ratio = 2 ** (cents / 1200); meth = e.get('method', 'resample')
        ck = (e['take'], cents, meth)
        if ck not in cache:
            if abs(cents) < 0.5: af = None
            elif meth == 'rubberband': af = f'rubberband=pitch={ratio:.6f}:transients=crisp'
            else: af = f'asetrate={in_rate(path) * ratio:.3f}'
            x = load(path, 2, af); cache[ck] = x * undb(Lv + e['level_db'] - lufs(x))
        x = cache[ck]; tscale = 1 / ratio if (meth == 'resample' and abs(cents) >= 0.5) else 1.0   # take seconds -> shifted seconds
        p = sp['p']; fi = float(p.get('fi', 1.0) or 0); fo = float(p.get('fo', 1.0) or 0)
        a = sp['t0g'] - (fi / 2 if sp['t0g'] > 0.01 else 0); b2 = sp['t1g'] + (fo / 2 if sp['t1g'] < T - 0.01 else 0)
        a = max(0.0, a); b2 = min(T, b2); n = int(round((b2 - a) * SR))
        if e.get('align') == 'end':
            src0 = int(round((e['end_s'] * tscale - (b2 - a)) * SR))
        else:
            w = e.get('windows', [0.0]); src0 = int(round(w[min(k, len(w) - 1)] * tscale * SR))
        lp = e.get('loop'); lp = (int(lp[0] * tscale * SR), int(lp[1] * tscale * SR)) if lp else None
        seg = loop_window(x, max(0, src0), n, lp) if src0 >= 0 else np.vstack([np.zeros((-src0, 2)), x[: n + src0]])[:n]
        env = np.ones(n); nfi = int(fi * SR) if sp['t0g'] > 0.01 else int(min(fi, 0.5) * SR); nfo = int(fo * SR)
        if nfi: env[:nfi] *= raised(nfi)
        if nfo and sp['t1g'] < T - 0.01: env[-nfo:] *= raised(nfo, False)
        seg = seg * env[:, None] * undb(float(p.get('gain_db', 0) or 0))
        i0 = int(round(a * SR)); i1 = min(N, i0 + len(seg)); music[i0:i1] += seg[: i1 - i0]
        placed.append({'bed': sp['name'], 'take': e['take'], 't0g': round(sp['t0g'], 2), 't1g': round(sp['t1g'], 2),
                       'from_take_s': round(src0 / SR / tscale, 2), 'level_db': e['level_db']})
    report['beds'] = placed

    # ---------------- 3. ducking ----------------
    rate = 100; nc = int(T * rate) + 1; tt = np.arange(nc) / rate
    regs = speech_regions(voice, MX['speech_gap_merge_s'])
    ctl = lambda y: np.interp(tt, np.arange(len(y)) / SR, y)       # a per-sample curve at the control rate
    lm = -0.691 + 10 * np.log10(ctl(ms_window(music, 3.0)) + 1e-12)
    duck = np.zeros(nc); att, rel = MX['duck_attack_s'], MX['duck_release_s']
    for r0, r1 in regs:
        i0, i1 = int(r0 * rate), min(nc, int(r1 * rate) + 1)
        seg = voice[int(r0 * SR):int(r1 * SR)]
        lv_r = lufs(seg) if len(seg) > 0.5 * SR else -0.691 + 10 * np.log10(np.mean(kweight(seg) ** 2) + 1e-12)
        target = lv_r - MX['music_under_voice_db']
        lo = max(0, int((r0 - att) * rate)); hi = min(nc, int((r1 + rel) * rate) + 1)
        w = np.zeros(nc); w[i0:i1] = 1
        if i0 > lo: w[lo:i0] = raised(i0 - lo)
        if hi > i1: w[i1:hi] = raised(hi - i1, False)
        d = np.minimum(0, target - lm)                       # ride down only, to the target
        d[:lo] = 0; d[hi:] = 0
        # hold each region's need through its ramps (so the attack lands at full depth before the first word)
        if hi > lo:
            core = d[i0:i1]; dd = float(np.min(uniform_filter1d(core, size=max(1, int(1.0 * rate))))) if len(core) else 0.0
            d[lo:i0] = d[i0] if i0 < nc else dd; d[i1:hi] = d[i1 - 1] if i1 > 0 else dd
        duck = np.minimum(duck, w * d)
    duck = uniform_filter1d(duck, size=int(0.5 * rate))         # gentle: no step faster than half a second
    ctrl = undb(duck)
    for x in cs.get('ducks', []):
        c0 = np.interp(tt, [x['t0g'] - 0.3, x['t0g'], x['t1g'], x['t1g'] + 0.3], [1, float(x['level']), float(x['level']), 1])
        ctrl = np.minimum(ctrl, c0)
    sil = [(x['t0g'], x['t1g']) for x in cs.get('silences', [])]; mute = np.ones(nc)
    for a, b2 in sil: mute = np.minimum(mute, np.interp(tt, [a - 0.05, a, b2, b2 + 0.3], [1, 0, 0, 1]))
    music *= np.interp(np.arange(N) / SR, tt, ctrl * mute)[:, None]
    # a faint air floor under the music bus, so no moment is digitally dead (the cue sheet's silences take it too)
    rng = np.random.default_rng(5); fl = signal.sosfilt(signal.butter(2, [60, 900], 'bandpass', fs=SR, output='sos'), rng.standard_normal((N, 2)), axis=0)
    fl *= undb(MX['air_floor_lufs'] - lufs(fl[: 30 * SR])); music += fl * np.interp(np.arange(N) / SR, tt, mute)[:, None]
    report['ducking'] = {'speech_regions': len(regs), 'regions': regs, 'max_duck_db': round(float(duck.min()), 1)}

    # ---------------- 4. effects ----------------
    fx = np.zeros((N, 2)); occ = {}; fxlog = []; fcache = {}
    for c in sorted(cs['cues'], key=lambda c: c['tg']):
        name = M['aliases'].get(c['name'], c['name']); e = M['cues'].get(name, 'missing')
        if e == 'missing': missing.add('cue ' + c['name']); continue
        if e is None: continue
        if any(a - 0.02 <= c['tg'] < b2 for a, b2 in sil): continue
        k = occ[name] = occ.get(name, -1) + 1
        fname = e['cycle'][k % len(e['cycle'])] if 'cycle' in e else e['file']
        fpath = os.path.join(ROOT, 'audio', 'sfx', fname + '.flac')
        if not os.path.exists(fpath): missing.add('file ' + fname); continue
        if fname not in fcache:
            y = load(fpath, 1)[:, 0]; fcache[fname] = (y, loud_max(y[:, None], 0.1))
        y, ly = fcache[fname]; p = c.get('p', {}) or {}
        g = undb(Lv + e['rel_db'] + float(p.get('gain_db', 0) or 0) - ly)
        m = np.sqrt(uniform_filter1d(y ** 2, size=int(0.002 * SR))); pk = int(np.argmax(m))
        s = int(round(c['tg'] * SR)) - (pk if e.get('align', 'start') == 'peak' else 0)
        pan = float(np.clip(p.get('pan', e.get('pan', 0.0)) or 0.0, -0.8, 0.8)); th = (pan + 1) * np.pi / 4
        a0, a1 = max(0, s), min(N, s + len(y))
        if a1 <= a0: continue
        fx[a0:a1, 0] += y[a0 - s:a1 - s] * g * np.cos(th) * np.sqrt(2); fx[a0:a1, 1] += y[a0 - s:a1 - s] * g * np.sin(th) * np.sqrt(2)
        fxlog.append({'cue': c['name'], 'file': fname, 't': round(c['tg'], 3), 'rel_db': e['rel_db'] + float(p.get('gain_db', 0) or 0)})
    report['effects'] = {'placed': len(fxlog), 'cues': fxlog}

    # ---------------- 5. master ----------------
    stems = {'voice': np.repeat(voice[:, None], 2, axis=1), 'music': music, 'fx': fx}
    mix = stems['voice'] + music + fx
    g_total = np.ones(N); gain_db = 0.0
    for it in range(3):
        cur = mix * (undb(gain_db) * g_total)[:, None]
        L = lufs(cur); gain_db += MX['target_lufs'] - L
        g_total = tp_limiter_gain(mix * undb(gain_db), MX['true_peak_ceiling_dbtp'])
    final = mix * (undb(gain_db) * g_total)[:, None]
    for k in stems: stems[k] = stems[k] * (undb(gain_db) * g_total)[:, None]
    out_wav = os.path.join(OUT, 'seven_days_mix.wav')
    sf.write(out_wav, final.astype(np.float32), SR, subtype='PCM_24')
    for k, x in stems.items(): sf.write(os.path.join(OUT, 'stems', k + '.flac'), x.astype(np.float32), SR, subtype='PCM_24', format='FLAC')
    # measure: ffmpeg's ebur128 (integrated, LRA, true peak), the limiter's work, the music under the voice
    r = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', out_wav, '-af', 'ebur128=peak=true+sample', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    def grab(key, after):
        i = r.rfind(after); j = r.find(key, i); return float(r[j + len(key):].split()[0])
    meas = {'integrated_lufs': grab('I:', 'Integrated loudness'), 'lra_lu': grab('LRA:', 'Loudness range'),
            'true_peak_dbtp': grab('Peak:', 'True peak'), 'sample_peak_dbfs': grab('Peak:', 'Sample peak'),
            'master_gain_db': round(gain_db, 2), 'limiter_max_gr_db': round(float(20 * np.log10(g_total.min())), 2),
            'limiter_samples_over_1db': int(np.sum(g_total < undb(-1)))}
    vs = ctl(ms_window(stems['voice'], 3.0)); ms_ = ctl(ms_window(stems['music'], 3.0))
    inside = np.zeros(nc, bool)
    for r0, r1 in regs: inside[int(r0 * rate) + 100:max(int(r0 * rate) + 100, int(r1 * rate) - 100)] = True   # inner parts, past the ramps
    diff = 10 * np.log10(ms_[inside] + 1e-12) - 10 * np.log10(vs[inside] + 1e-12)
    meas['music_minus_voice_in_speech_db'] = {'median': round(float(np.median(diff)), 1), 'p95': round(float(np.percentile(diff, 95)), 1)}
    es = int(float(cs['seqs'][-1]['start']) * SR) if cs['seqs'][-1]['id'] == 'END' else int((T - 8) * SR)
    meas['end_screen_music_lufs'] = round(lufs(final[es:]), 1)
    meas['voice_lufs_in_mix'] = round(lufs(stems['voice']), 1)
    report['master'] = meas; report['missing'] = sorted(missing)
    json.dump(report, open(os.path.join(OUT, 'report.json'), 'w'), indent=1)
    print(f"cue sheet: {report['cuesheet']}{' (DRAFT)' if draft else ''}; voice {raw_lufs:.1f} -> {Lv:.1f} LUFS (comp {max_gr:.1f} dB)")
    print(f"beds: {len(placed)} spans; speech regions {len(regs)}; max duck {duck.min():.1f} dB; effects {len(fxlog)}")
    print(f"master: {meas['integrated_lufs']} LUFS, TP {meas['true_peak_dbtp']} dBTP, sample peak {meas['sample_peak_dbfs']} dBFS, "
          f"LRA {meas['lra_lu']} LU; gain {gain_db:+.2f} dB, limiter max {meas['limiter_max_gr_db']} dB")
    print(f"music re voice in speech: median {meas['music_minus_voice_in_speech_db']['median']} dB (p95 {meas['music_minus_voice_in_speech_db']['p95']}); "
          f"end screen {meas['end_screen_music_lufs']} LUFS; voice in mix {meas['voice_lufs_in_mix']} LUFS")
    if missing: print('MISSING:', ', '.join(sorted(missing)))
    print('wrote out/mix/seven_days_mix.wav, out/mix/stems/{voice,music,fx}.flac, out/mix/report.json')


if __name__ == '__main__':
    main()
