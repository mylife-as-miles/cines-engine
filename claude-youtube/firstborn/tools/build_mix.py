# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile", "pyloudnorm"]
# ///
"""Mix Firstborn's soundtrack: the author's narration, the music beds and the effects, mastered for YouTube.
(Adapted from Seven Days of No's build_mix.py: the music now follows a timeline of spoken words in the sound map,
effect beds such as the party murmur are placed from the cue sheet's beds, and every effect's level as heard is
reported.)

  /home/user/leonxlnx/earshot/.venv/bin/python tools/build_mix.py [--sheet audio/cues_draft.json]   (or: uv run tools/build_mix.py)
      -> out/mix/firstborn_mix.wav (48 kHz stereo, 24-bit), out/mix/stems/{voice,music,fx}.flac, out/mix/report.json

Reads the cue sheet the engine writes (out/cuesheet.json: named beds and cues on the clock), or audio/cues_draft.json
(tools/cues_draft.py, drafted from design/SEQUENCES.md) until it exists; audio/score_plan.json (which take and window each
music bed is); audio/sound_map.json (which file and level each cue is, and the mix settings). Nothing is placed by hand.

1. Voice: out/vo/narration.wav from 0 s (high-pass 70 Hz, a gentle 2:1 compressor on the loudest syllables). Its
   integrated loudness Lv is the reference every other level is set against.
2. Music: where the cue sheet has a music bed, the sound map's music timeline (beds.music.timeline: segments from one
   spoken phrase to another, each a variation of audio/score_plan.json or null for a stop-down) says which variation
   plays; adjacent spans of one variation are joined. Each span is a window of its take, pitch-shifted into the shared
   key (E-flat major; score_plan beds), at level_db re Lv, with its fades centred on the span's edges (so beds crossfade
   at chapter turns); the closing bed is aligned so the take's final chord dies away on the last frame. (A sound map
   whose music bed has by_seq instead of timeline maps the cue sheet's sequences, as Seven Days of No did.)
3. Ducking: speech regions from the narration's own envelope (pauses under 1.2 s merged, so the music does not pump
   between sentences). In each region the music is held 15 dB under the voice's level there (its 3 s loudness, ridden
   down only, never up; a bed's own under_voice_db overrides the map's), with a 0.35 s attack
   before the words and a 0.9 s release after. Where no one speaks (the
   stop-down, the end screen) the bed plays at its own level. Under the voice the music also takes a gentle 3 dB
   presence dip at 2.5 kHz (zero-phase), so the consonants stay clear without pulling the bed down further. The cue sheet's silences mute the music (Q10's freeze;
   a cue placed inside one, like the freeze itself, still plays); its ducks (level factors) apply to the music.
4. Effects: each cue's sound at rel_db re Lv (its loudest 100 ms, K-weighted), peak- or start-aligned, placed gently toward
   its source on screen (the cue's x, at most ±0.3; centre without one); the voice stays centred, the music beds stay
   stereo (their side raised up to 3 dB where they are already well correlated: the mono fold is unchanged). Effect
   beds (a sound-map bed with a file: the party murmur) loop under their cue-sheet span at rel_db re Lv (integrated),
   from two offsets of the recording for left and right (wide, uncorrelated, mono-safe). The report gives each effect
   as heard: its loudest 400 ms against the voice's 3 s loudness around it.
5. Master: gain to -14 LUFS integrated, then a look-ahead true-peak limiter (4x oversampled detection) at -1.5 dBTP,
   twice (the limiter costs a little loudness). The limiter's gain is applied to every stem too, so the stems sum to
   the mix exactly. Sample peaks therefore sit at or under -1.5 dBFS before any AAC encode.
"""
import json, os, re, subprocess, sys
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


def true_peaks(x, chunk_s=20.0, pad=256):
    """Per-sample true peak (4x oversampled, max over channels), in chunks so a 7-minute stereo mix stays small in memory"""
    n = len(x); out = np.empty(n); c = int(chunk_s * SR)
    for a in range(0, n, c):
        lo, hi = max(0, a - pad), min(n, a + c + pad)
        up = signal.resample_poly(x[lo:hi], 4, 1, axis=0)
        pk = np.abs(up).max(axis=1)[: 4 * (hi - lo)].reshape(-1, 4).max(axis=1)
        out[a:min(n, a + c)] = pk[a - lo:a - lo + min(c, n - a)]
    return out


def tp_limiter_gain(x, ceil_db, release_s=0.08, look_s=0.002):
    """Gain curve (per sample) that holds x's true peak (4x oversampled) at ceil_db: look-ahead, smooth attack, one-pole
    release at a 1 kHz control rate, then a sample-accurate safety minimum."""
    pk = true_peaks(x)
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


def normalise(cs):
    """The engine's cue sheet (tools/cuesheet.js: beds t0/t1, cues t, in global seconds) or the claude-film shape
    (t0g/t1g, tg; audio/cues_draft.json) as one shape: beds {name, seq, t0, t1, p}, cues {name, seq, t, p}, global."""
    g = lambda d, a, b: d[a] if a in d else d[b]
    return {'total': float(cs['total']), 'seqs': cs['seqs'],
            'beds': [{'name': b['name'], 'seq': b['seq'], 't0': float(g(b, 't0g', 't0')), 't1': float(g(b, 't1g', 't1')), 'p': b.get('p') or {}} for b in cs['beds']],
            'cues': [{'name': c['name'], 'seq': c['seq'], 't': float(g(c, 'tg', 't')), 'p': c.get('p') or {}, 'word': c.get('word') or '',
                      'x': c.get('x', (c.get('p') or {}).get('x'))} for c in cs['cues']],
            'silences': [{'t0': float(g(x, 't0g', 't0')), 't1': float(g(x, 't1g', 't1'))} for x in cs.get('silences', [])],
            'ducks': [{'t0': float(g(x, 't0g', 't0')), 't1': float(g(x, 't1g', 't1')), 'level': x['level']} for x in cs.get('ducks', [])]}


_W = None


def word_t(phrase, lo, hi):
    """t0 of the first occurrence of `phrase` (audio/vo/words.json, punctuation ignored) starting within [lo, hi]."""
    global _W
    if _W is None:
        w = json.load(open(os.path.join(ROOT, 'audio', 'vo', 'words.json')))['words']
        _W = (w, [re.sub(r"[^a-z0-9']", '', x['w'].lower()) for x in w])
    w, nm = _W; p = [re.sub(r"[^a-z0-9']", '', x.lower()) for x in phrase.split()]
    for i in range(len(w) - len(p) + 1):
        if nm[i:i + len(p)] == p and lo - 0.5 <= w[i]['t0'] <= hi + 0.5: return float(w[i]['t0'])
    raise SystemExit(f'sound_map: phrase {phrase!r} not spoken between {lo:.2f} and {hi:.2f} s')


def word_near(phrase, near, tol=4.0):
    """t0 of the occurrence of `phrase` (words.json, punctuation ignored) nearest `near` s, within tol s"""
    global _W
    if _W is None:
        w = json.load(open(os.path.join(ROOT, 'audio', 'vo', 'words.json')))['words']
        _W = (w, [re.sub(r"[^a-z0-9']", '', x['w'].lower()) for x in w])
    w, nm = _W; p = [re.sub(r"[^a-z0-9']", '', x.lower()) for x in phrase.split()]
    hits = [float(w[i]['t0']) for i in range(len(w) - len(p) + 1) if nm[i:i + len(p)] == p]
    if not hits or min(abs(h - near) for h in hits) > tol:
        raise SystemExit(f'sound_map: phrase {phrase!r} not spoken within {tol} s of {near} s')
    return min(hits, key=lambda h: abs(h - near))


def anchor_t(a, T):
    """a timeline anchor: None = the start, 'END' = the video's end, a number = seconds, {at, near[, off]} = a phrase"""
    if a is None: return 0.0
    if a == 'END': return T
    if isinstance(a, (int, float)): return float(a)
    return word_near(a['at'], a['near']) + float(a.get('off', 0.0))


def bed_entry(M, name):
    return M['beds'].get(M.get('bed_aliases', {}).get(name, name), 'missing')


def music_spans(cs, M, T, missing, report):
    """The music on the clock: each music bed of the cue sheet mapped (sound_map beds, sequence by sequence, split at
    spoken words) to a variation of audio/score_plan.json; adjacent pieces of one variation joined; a variation that
    comes back after a short gap (a freeze) resumes where it stopped. Fades: a crossfade centred on the turn where one
    variation meets another, inside the span at a gap (a stop-down or a freeze), none at the video's end (the closing
    take ends on its own chord)."""
    MX = M['mix']; xf = MX['crossfade_s']; segs = []; ignored = []; cover = []; timeline = None
    for b in sorted(cs['beds'], key=lambda b: b['t0']):
        m = bed_entry(M, b['name'])
        if m == 'missing': missing.add('bed ' + b['name']); continue
        if m is None: continue
        if isinstance(m, dict) and 'file' in m: continue                      # an effect bed (placed with the effects)
        if isinstance(m, dict) and 'timeline' in m:                           # the music follows the spoken timeline
            timeline = m['timeline']; cover.append((b['t0'], b['t1'])); continue
        spec = m if isinstance(m, str) else m['by_seq'].get(b['seq'], m.get('default'))
        parts = [{'var': spec}] if (spec is None or isinstance(spec, str)) else spec
        if b['p'].get('fadeOut'): ignored.append(f"{b['name']}@{b['seq']} fadeOut {b['p']['fadeOut']} (the closing take ends on its own chord)")
        for part in parts:
            a = word_t(part['from'], b['t0'], b['t1']) if 'from' in part else b['t0']
            z = word_t(part['until'], b['t0'], b['t1']) if 'until' in part else b['t1']
            a, z = max(a, b['t0']), min(z, b['t1'])
            if part.get('var') and z > a:
                segs.append({'var': part['var'], 't0': a, 't1': z, 'fi': part.get('fi', b['p'].get('fi')), 'fo': part.get('fo', b['p'].get('fo')), 'gain_db': b['p'].get('gain_db', 0)})
    if timeline is not None:
        cov = []                                                              # the cue sheet's music beds, joined
        for a, z in sorted(cover):
            if cov and a <= cov[-1][1] + 0.05: cov[-1][1] = max(cov[-1][1], z)
            else: cov.append([a, z])
        report['music_cover'] = [[round(a, 2), round(z, 2)] for a, z in cov]
        tl = []
        for k, seg in enumerate(timeline):
            a, z = anchor_t(seg.get('from'), T), anchor_t(seg.get('until', 'END'), T)
            tl.append({'var': seg.get('var'), 'a': a, 'z': z, 'fi': seg.get('fi'), 'fo': seg.get('fo')})
            for c0, c1 in cov:
                aa, zz = max(a, c0), min(z, c1)
                if seg.get('var') and zz - aa > 0.05:
                    segs.append({'var': seg['var'], 't0': aa, 't1': zz, 'fi': seg.get('fi') if abs(aa - a) < 0.05 else None,
                                 'fo': seg.get('fo') if abs(zz - z) < 0.05 else None, 'gain_db': seg.get('gain_db', 0)})
        report['music_timeline'] = [{'var': x['var'], 't0': round(x['a'], 2), 't1': round(x['z'], 2)} for x in tl]
    spans = []
    for sg in sorted(segs, key=lambda x: x['t0']):
        if spans and spans[-1]['var'] == sg['var'] and abs(spans[-1]['t1'] - sg['t0']) < 0.1:
            spans[-1]['t1'] = sg['t1']; spans[-1]['fo'] = sg['fo']
        else: spans.append(dict(sg))
    for i, sp in enumerate(spans):
        prev = spans[i - 1] if i else None; nxt = spans[i + 1] if i + 1 < len(spans) else None
        meets_prev = prev is not None and abs(prev['t1'] - sp['t0']) < 0.1
        meets_next = nxt is not None and abs(nxt['t0'] - sp['t1']) < 0.1
        if prev is not None and not meets_prev and prev['var'] == sp['var'] and sp['t0'] - prev['t1'] <= MX['resume_gap_s']:
            sp['resume'] = i - 1
        if sp['fi'] is None: sp['fi'] = 0.3 if sp['t0'] <= 0.01 else (0.15 if sp.get('resume') is not None else xf)
        if sp['fo'] is None:
            sp['fo'] = 0.0 if sp['t1'] >= T - 0.01 else (0.08 if (nxt is not None and nxt['var'] == sp['var'] and not meets_next) else xf)
        sp['a'] = max(0.0, sp['t0'] - (sp['fi'] / 2 if meets_prev else 0))
        sp['b'] = min(T, sp['t1'] + (sp['fo'] / 2 if meets_next else 0))
    report['music_ignored'] = ignored
    return spans


def main():
    cs_path = os.path.join(ROOT, 'out', 'cuesheet.json')
    if '--sheet' in sys.argv: cs_path = os.path.abspath(sys.argv[sys.argv.index('--sheet') + 1])
    draft = not os.path.exists(cs_path)
    if draft: cs_path = os.path.join(ROOT, 'audio', 'cues_draft.json')
    draft = draft or cs_path.endswith('cues_draft.json')
    cs = normalise(json.load(open(cs_path))); plan = json.load(open(os.path.join(ROOT, 'audio', 'score_plan.json')))
    M = json.load(open(os.path.join(ROOT, 'audio', 'sound_map.json'))); MX = M['mix']
    T = float(cs['total']); N = int(round(T * SR)); missing = set(); report = {'cuesheet': os.path.relpath(cs_path, ROOT), 'draft': draft, 'total': T}
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
    music = np.zeros((N, 2)); cache = {}; placed = []
    spans = music_spans(cs, M, T, missing, report)
    fresh = {}
    for i, sp in enumerate(spans):
        e = plan.get('beds', {}).get(sp['var'])
        if not e: missing.add('score bed ' + sp['var']); continue
        path = take_path(e['take'])
        if not path: missing.add('take ' + e['take']); continue
        cents = float(e.get('pitch_cents', 0)); ratio = 2 ** (cents / 1200); meth = e.get('method', 'resample')
        ck = (e['take'], cents, meth)
        if ck not in cache:
            if abs(cents) < 0.5: af = None
            elif meth == 'rubberband': af = f'rubberband=pitch={ratio:.6f}:transients=crisp:pitchq=quality:channels=together'
            else: af = f'asetrate={in_rate(path) * ratio:.3f}'
            x = load(path, 2, af); cache[ck] = x * undb(Lv + e['level_db'] - lufs(x))
        x = cache[ck]; tscale = 1 / ratio if (meth == 'resample' and abs(cents) >= 0.5) else 1.0   # take seconds -> shifted seconds
        a, b2 = sp['a'], sp['b']; n = int(round((b2 - a) * SR))
        if n <= 0: continue
        if e.get('align') == 'end' and b2 >= T - 0.01:
            src0 = int(round(e['end_s'] * tscale * SR)) - n
        elif sp.get('resume') is not None and spans[sp['resume']].get('src_end') is not None:
            src0 = spans[sp['resume']]['src_end']                # the music paused (a freeze) and picks up where it stopped
        else:
            k = fresh[sp['var']] = fresh.get(sp['var'], -1) + 1
            w = e.get('windows', [0.0]); src0 = int(round(w[min(k, len(w) - 1)] * tscale * SR))
        lp = e.get('loop'); lp = (int(lp[0] * tscale * SR), int(lp[1] * tscale * SR)) if lp else None
        seg = loop_window(x, src0, n, lp) if src0 >= 0 else np.vstack([np.zeros((-src0, 2)), x[: n + src0]])[:n]
        sp['src_end'] = src0 + n
        env = np.ones(n); nfi, nfo = min(n // 2, int(sp['fi'] * SR)), min(n // 2, int(sp['fo'] * SR))
        if nfi: env[:nfi] *= raised(nfi)
        if nfo: env[-nfo:] *= raised(nfo, False)
        seg = seg * env[:, None] * undb(float(sp.get('gain_db', 0) or 0))
        i0 = int(round(a * SR)); i1 = min(N, i0 + len(seg)); music[i0:i1] += seg[: i1 - i0]
        sp['under'] = float(e.get('under_voice_db', MX['music_under_voice_db']))
        placed.append({'var': sp['var'], 'take': e['take'], 't0': round(sp['t0'], 2), 't1': round(sp['t1'], 2), 'fi': sp['fi'], 'fo': sp['fo'],
                       'from_take_s': round(src0 / SR / tscale, 2), 'resume': sp.get('resume') is not None, 'level_db': e['level_db']})
    report['music'] = placed

    # ---------------- 3. ducking ----------------
    rate = 100; nc = int(T * rate) + 1; tt = np.arange(nc) / rate
    regs = speech_regions(voice, MX['speech_gap_merge_s'])
    ctl = lambda y: np.interp(tt, np.arange(len(y)) / SR, y)       # a per-sample curve at the control rate
    # the music's level: the louder of its 3 s and 1 s readings, so a bed that enters at full level straight after a
    # stop-down (Friday's lift) is caught at once rather than averaged with the silence before it
    lm = -0.691 + 10 * np.log10(np.maximum(ctl(ms_window(music, 3.0)), ctl(ms_window(music, 1.0))) + 1e-12)
    # how far under the voice the music sits, moment by moment: the house 12 dB, or a bed's own under_voice_db (the busy
    # lift sits deeper), eased over a second at the turns. It only acts under speech, so between lines a bed keeps its level.
    under = np.full(nc, float(MX['music_under_voice_db']))
    for sp in spans:
        if 'under' in sp: under[int(sp['a'] * rate):int(sp['b'] * rate) + 1] = sp['under']
    under = uniform_filter1d(under, size=int(1.0 * rate))
    duck = np.zeros(nc); wsp = np.zeros(nc); att, rel = MX['duck_attack_s'], MX['duck_release_s']
    for r0, r1 in regs:
        i0, i1 = int(r0 * rate), min(nc, int(r1 * rate) + 1)
        seg = voice[int(r0 * SR):int(r1 * SR)]
        lv_r = lufs(seg) if len(seg) > 0.5 * SR else -0.691 + 10 * np.log10(np.mean(kweight(seg) ** 2) + 1e-12)
        target = lv_r - under
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
        duck = np.minimum(duck, w * d); wsp = np.maximum(wsp, w)
    duck = uniform_filter1d(duck, size=int(0.5 * rate))         # gentle: no step faster than half a second
    ctrl = undb(duck)
    for x in cs.get('ducks', []):
        c0 = np.interp(tt, [x['t0'] - 0.3, x['t0'], x['t1'], x['t1'] + 0.3], [1, float(x['level']), float(x['level']), 1])
        ctrl = np.minimum(ctrl, c0)
    sil = [(x['t0'], x['t1']) for x in cs.get('silences', [])]; mute = np.ones(nc)
    for a, b2 in sil: mute = np.minimum(mute, np.interp(tt, [a - 0.05, a, b2, b2 + 0.3], [1, 0, 0, 1]))
    music *= np.interp(np.arange(N) / SR, tt, ctrl * mute)[:, None]
    # where someone speaks, a gentle presence dip in the music (zero-phase, so the blend in and out is clean): room for
    # the consonants without pulling the whole bed down further
    if MX.get('presence_dip_db'):
        A = 10 ** (-MX['presence_dip_db'] / 2 / 40); w0 = 2 * np.pi * MX['presence_hz'] / SR; al = np.sin(w0) / (2 * 0.7); c = np.cos(w0)
        bq = np.array([1 + al * A, -2 * c, 1 - al * A]); aq = np.array([1 + al / A, -2 * c, 1 - al / A])
        dipped = signal.filtfilt(bq / aq[0], aq / aq[0], music, axis=0)          # two passes: half the dip each
        music += (dipped - music) * np.interp(np.arange(N) / SR, tt, uniform_filter1d(wsp, size=int(0.5 * rate)))[:, None]
    # a little more width for the beds under the centred voice: the side raised, the mid untouched, so a mono fold of the
    # music is exactly what it was (Lyria's takes are stereo; nothing is summed)
    # The lift is adaptive: only where the bed is already well correlated (L/R correlation over 400 ms above 0.7, eased in
    # from 0.3); passages that are wide by nature (T5's ringing last chord) keep Lyria's own image, so nothing tips into
    # phase opposition; where a passage already correlates below 0.1, its side is narrowed (to 0.6x at -0.3) for mono.
    if MX.get('music_side_db'):
        mid, side = (music[:, 0] + music[:, 1]) / 2, (music[:, 0] - music[:, 1]) / 2
        w4 = int(0.4 * SR); run = lambda y: uniform_filter1d(y, size=w4)
        corr = run(music[:, 0] * music[:, 1]) / np.sqrt(run(music[:, 0] ** 2) * run(music[:, 1] ** 2) + 1e-18)
        g = 1 + (undb(MX['music_side_db']) - 1) * np.clip((corr - 0.3) / 0.4, 0, 1)
        g = g * (1 - 0.4 * np.clip((0.1 - corr) / 0.4, 0, 1))                 # and narrowed a little where it opposes
        g = uniform_filter1d(g, size=int(0.2 * SR)); side = side * g
        music = np.stack([mid + side, mid - side], axis=1)
    # a faint air floor under the music bus, so no moment is digitally dead (the cue sheet's silences take it too)
    rng = np.random.default_rng(5); fl = signal.sosfilt(signal.butter(2, [60, 900], 'bandpass', fs=SR, output='sos'), rng.standard_normal((N, 2)), axis=0)
    fl *= undb(MX['air_floor_lufs'] - lufs(fl[: 30 * SR])); music += fl * np.interp(np.arange(N) / SR, tt, mute)[:, None]
    report['ducking'] = {'speech_regions': len(regs), 'regions': regs, 'max_duck_db': round(float(duck.min()), 1)}

    # ---------------- 4. effects ----------------
    fx = np.zeros((N, 2)); occ = {}; fxlog = []; fcache = {}; last = {}; dropped = []
    hv = SR // 100; nv = len(voice) // hv                                       # the narration speaking, per 10 ms (for after_speech)
    talking = 10 * np.log10((voice[: nv * hv] ** 2).reshape(nv, hv).mean(axis=1) + 1e-12) > -45

    def snd(fname):
        if fname not in fcache:
            fp = os.path.join(ROOT, 'audio', 'sfx', fname + '.flac')
            if not os.path.exists(fp): missing.add('file ' + fname); fcache[fname] = None
            else: y = load(fp, 1)[:, 0]; fcache[fname] = (y, loud_max(y[:, None], 0.1))
        return fcache[fname]

    # effect beds: a sound-map bed with a file (the party murmur), looped under its cue-sheet span, left and right from
    # two offsets of the recording (uncorrelated: wide, and a mono fold loses nothing to cancellation)
    fxbeds = []
    for b in sorted(cs['beds'], key=lambda b: b['t0']):
        m = bed_entry(M, b['name'])
        if not (isinstance(m, dict) and 'file' in m): continue
        r = snd(m['file'])
        if not r: continue
        y = r[0]; a, z = b['t0'], b['t1']
        if m.get('from'): a = max(a, anchor_t(m['from'], T))
        if m.get('until'): z = min(z, anchor_t(m['until'], T))
        n = int(round((z - a) * SR))
        if n <= 0: continue
        off = int(len(y) * float(m.get('right_offset', 0.43)))
        L = loop_window(y[:, None], 0, n, None, int(1.0 * SR))[:, 0]; R = loop_window(y[:, None], off, n, None, int(1.0 * SR))[:, 0]
        env = np.ones(n); nfi, nfo = min(n // 2, int(float(m.get('fi', 1.5)) * SR)), min(n // 2, int(float(m.get('fo', 1.0)) * SR))
        if nfi: env[:nfi] *= raised(nfi)
        if nfo: env[-nfo:] *= raised(nfo, False)
        g = undb(Lv + float(m['rel_db']) + float(b['p'].get('gain_db', 0) or 0) - lufs(y))
        i0 = int(round(a * SR)); i1 = min(N, i0 + n)
        fx[i0:i1, 0] += L[: i1 - i0] * env[: i1 - i0] * g; fx[i0:i1, 1] += R[: i1 - i0] * env[: i1 - i0] * g
        fxbeds.append({'bed': b['name'], 'file': m['file'], 't0': round(a, 2), 't1': round(z, 2), 'rel_db': m['rel_db']})
    # the voice's 3 s loudness on the control clock, for each effect's level as heard
    v3 = -0.691 + 10 * np.log10(ctl(ms_window(voice, 3.0)) + 1e-12)

    for c in sorted(cs['cues'], key=lambda c: c['t']):
        name = M['aliases'].get(c['name'], c['name']); e = M['cues'].get(name, 'missing')
        if e == 'missing': missing.add('cue ' + c['name']); continue
        if e is None: continue
        if c['t'] - last.get(name, -9) < MX['same_cue_min_gap_s']: dropped.append([c['name'], c['t']]); continue
        last[name] = c['t']; k = occ[name] = occ.get(name, -1) + 1; p = c.get('p', {}) or {}
        wd = re.sub(r"[^a-z0-9']", '', c.get('word', '').lower())
        for var in e.get('variants', []):                                      # e.g. a YES stamp rather than the red NO
            if (var.get('if_kind') and p.get('kind') == var['if_kind']) or (var.get('if_word') and re.match(var['if_word'], wd)):
                e = dict(e, **{kk: vv for kk, vv in var.items() if not kk.startswith('if_')}); e.pop('cycle', None) if 'file' in var else None; break
        if 'steps' in e:                                                        # n steps at the cue's own gap
            nst, gap = int(p.get('n', e['n'])), float(p.get('gap', e['gap'])); parts = []
            for j in range(nst):
                r = snd(e['steps'][j % len(e['steps'])])
                if r: parts.append((j * gap, r[0] * (1.0 if j % 2 else 0.85)))
            if not parts: continue
            y = np.zeros(int((parts[-1][0] + 0.3) * SR))
            for t0, z in parts: y[int(t0 * SR):int(t0 * SR) + len(z)] += z[: len(y) - int(t0 * SR)]
            ly = loud_max(y[:, None], 0.1); fname = '+'.join(e['steps'])
        else:
            fname = e['cycle'][k % len(e['cycle'])] if 'cycle' in e else e['file']
            r = snd(fname)
            if not r: continue
            y, ly = r
            if 'per_n_s' in e and p.get('n'):                                   # typing: the cue's n taps long
                want = int(int(p['n']) * e['per_n_s'] * SR); xf = int(0.08 * SR)
                if want > len(y): y = loop_window(y[:, None], 0, want, (int(0.15 * SR), len(y)), xf)[:, 0]
                y = y[:want].copy(); f = min(len(y) // 3, int(0.08 * SR)); y[-f:] *= raised(f, False)
        g = undb(Lv + e['rel_db'] + float(p.get('gain_db', 0) or 0) + float(p.get('level', 0) or 0) - ly)
        m = uniform_filter1d(y ** 2, size=int(0.002 * SR)); pk = int(np.argmax(m))
        t_at = c['t']
        if e.get('after_speech'):                                               # into the pause after the current word
            i = int(t_at * 100)
            while i < len(talking) and talking[i] and (i - int(t_at * 100)) < e['after_speech'] * 100: i += 1
            if i < len(talking) and not talking[i]: t_at = i / 100
        s = int(round(t_at * SR)) - (pk if e.get('align', 'start') == 'peak' else 0)
        x_on = c.get('x')
        if p.get('pan') is not None: pan = float(p['pan'])
        elif x_on is not None: pan = (float(x_on) / (MX['screen_width_px'] if float(x_on) > 1.5 else 1.0) - 0.5) * 2 * MX['pan_max']
        else: pan = float(e.get('pan', 0.0))
        pan = float(np.clip(pan, -MX['pan_max'], MX['pan_max'])); th = (pan + 1) * np.pi / 4
        a0, a1 = max(0, s), min(N, s + len(y))
        if a1 <= a0: continue
        fx[a0:a1, 0] += y[a0 - s:a1 - s] * g * np.cos(th) * np.sqrt(2); fx[a0:a1, 1] += y[a0 - s:a1 - s] * g * np.sin(th) * np.sqrt(2)
        heard = loud_max((y * g)[:, None], 0.4) - float(v3[min(nc - 1, int((s + pk) / SR * rate))])
        fxlog.append({'cue': c['name'], 'file': fname, 't': round(c['t'], 3), 'placed_t': round(t_at, 3), 'pan': round(pan, 2),
                      'rel_db': e['rel_db'] + float(p.get('gain_db', 0) or 0) + float(p.get('level', 0) or 0),
                      'heard_re_voice_db': round(heard, 1), 'class': e.get('class', 'pop')})
    by = {}
    for f_ in fxlog: by.setdefault(f_['class'], []).append(f_['heard_re_voice_db'])
    heard_sum = {k: {'n': len(v), 'median': round(float(np.median(v)), 1), 'min': round(float(np.min(v)), 1), 'max': round(float(np.max(v)), 1)}
                 for k, v in by.items()}
    report['effects'] = {'placed': len(fxlog), 'beds': fxbeds, 'heard_re_voice_db_by_class': heard_sum,
                         'dropped_same_cue_within_150ms': dropped, 'cues': fxlog}

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
    out_wav = os.path.join(OUT, 'firstborn_mix.wav')
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
    dall = 10 * np.log10(ms_ + 1e-12) - 10 * np.log10(vs + 1e-12); per = {}
    for sp in placed:                                                     # per variation, inside speech
        w = inside.copy(); w[:int(sp['t0'] * rate)] = False; w[int(sp['t1'] * rate):] = False
        if w.sum() > rate: per.setdefault(sp['var'], []).append(dall[w])
    meas['music_minus_voice_in_speech_db_by_bed'] = {k: round(float(np.median(np.concatenate(v))), 1) for k, v in per.items()}
    es = int(round((T - 8.0) * SR))                                       # the 8 s end screen
    meas['end_screen_music_lufs'] = round(lufs(final[es:]), 1)
    def stereo(x):
        L, R = x[:, 0], x[:, 1]; M, S = (L + R) / 2, (L - R) / 2; ok = np.abs(L).max() > 0
        win = int(0.4 * SR); n = len(L) // win
        cw = [np.corrcoef(L[i * win:(i + 1) * win], R[i * win:(i + 1) * win])[0, 1] for i in range(n)    # audible windows only
              if np.sqrt(np.mean(L[i * win:(i + 1) * win] ** 2 + R[i * win:(i + 1) * win] ** 2) / 2) > 1e-3]
        return {'side_minus_mid_db': round(float(10 * np.log10((S ** 2).mean() / ((M ** 2).mean() + 1e-20) + 1e-20)), 1) if ok else None,
                'lr_correlation': round(float(np.corrcoef(L, R)[0, 1]), 3) if ok and L.std() > 0 and R.std() > 0 else 1.0,
                'lr_correlation_min_400ms': round(float(np.min(cw)), 3) if cw else None,
                'mono_fold_db': round(float(10 * np.log10(((L + R) ** 2).mean() / (2 * ((L ** 2).mean() + (R ** 2).mean())) + 1e-20)), 2) if ok else None}
    meas['stereo'] = {k: stereo(x) for k, x in list(stems.items()) + [('mix', final)]}
    mono = final.mean(axis=1, keepdims=True).repeat(2, axis=1)
    meas['stereo']['mix']['mono_downmix_lufs'] = round(lufs(mono), 2)
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
    print('effects as heard re voice: ' + ', '.join(f"{k} median {v['median']} dB ({v['min']} to {v['max']}, n {v['n']})" for k, v in heard_sum.items()))
    print('wrote out/mix/firstborn_mix.wav, out/mix/stems/{voice,music,fx}.flac, out/mix/report.json')


if __name__ == '__main__':
    main()
