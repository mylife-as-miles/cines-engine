"""Place the score on the film's clock: out/audio/score_bed.wav (48 kHz, 24-bit, stereo, the EDL's full length).
Adapted from claude-film/one-too-many/tools/score_place.py for this film.

  /home/user/leonxlnx/earshot/.venv/bin/python audio/tools/score/score_place.py [--voice-ref -14]
      -> out/audio/score_bed.wav, audio/score/placed.json

Per placement (audio/score/placements.json: start, end and fades on the EDL clock, from score_map.py) and its window
(audio/score/windows.json, from score_window.py): the window's pieces are cut from the processed take
(audio/score/takes/<Gid>.flac: in tune, G1 and G2 in D), stretched where a piece says so (Rubber Band, pitch kept),
joined with equal-power crossfades, high-passed at 25 Hz (DC and rumble only: the pulse's D2 at 73 Hz stays), and
levelled against the voice:
- the music's own level is the plan's level in voice gaps (dB re the voice's short-term loudness while it speaks,
  taken as --voice-ref LUFS, -14 in a -14 LUFS master as audio/cues.json says), measured as the window's integrated
  loudness; the title (SC00d) and the last note (SC09c) are set by their loudest 3 s instead;
- under the voice it drops to the plan's under-voice level: speech spans from the EDL (lines closer than 1.4 s merged),
  down over 0.45 s before a line, back over 1.1 s after it (the house numbers for narrated films, sound.md 8).
  The bed is therefore already ducked: the mixer must not duck it again (audio/cues.json duck_db 9 is for a raw bed).
Entries rise from nothing (raised cosine; the title a crescendo linear in dB); exits are the plan's: hard stops
(12 ms), drop-outs, decays; stop-downs are exact silence (30 ms down, 80 ms back). Outside every placement the bed is
exact digital silence (the plan's `unscored` list, the empty chair's total silence among them).
"""
import json, os, subprocess, sys
import numpy as np, soundfile as sf
from scipy import signal
from earshot import features as F

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
SC = os.path.join(ROOT, 'audio', 'score')
SR = 48000


def ff_filter(x, af):
    """run a float stereo array through an ffmpeg audio filter (Rubber Band, soxr)"""
    p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', af,
                        '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-'], input=x.astype(np.float32).tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.float32).reshape(-1, 2).astype(np.float64)


def ramp(n, curve, up=True):
    w = np.linspace(0, 1, n, endpoint=False) + 0.5 / max(n, 1)
    if curve == 'db': g = 10 ** ((-40 * (1 - w)) / 20) * w ** 0.25    # -40 dB -> 0 dB, linear in dB, from exact zero
    elif curve == 'lin': g = w
    else: g = np.sin(np.pi / 2 * w) ** 2                               # raised cosine
    return g if up else g[::-1]


def assemble(x, pieces, join_s, retune_cents=0.0):
    out = None
    for pc in pieces:
        seg = x[int(round(pc['from'] * SR)):int(round(pc['to'] * SR))].copy()
        if pc.get('stretch_to'):
            tempo = (pc['to'] - pc['from']) / pc['stretch_to']
            seg = ff_filter(seg, f'rubberband=tempo={tempo:.6f}:transients=smooth:pitchq=quality:channels=together:window=long')
            n = int(round(pc['stretch_to'] * SR)); seg = seg[:n] if len(seg) >= n else np.pad(seg, ((0, n - len(seg)), (0, 0)))
        if out is None: out = seg; continue
        j = int(join_s * SR); w = np.linspace(0, 1, j)[:, None]
        mid = out[-j:] * np.cos(w * np.pi / 2) + seg[:j] * np.sin(w * np.pi / 2)   # equal power
        out = np.concatenate([out[:-j], mid, seg[j:]])
    if retune_cents:
        r = 2 ** (retune_cents / 1200)
        out = ff_filter(out, f'asetrate={SR * r:.4f},aresample={SR}:resampler=soxr:precision=28')
    return out


def duck_db(t, spans, depth):
    """dB offset (<= 0) at times t: depth while the voice speaks, 0.45 s attack before, 1.1 s release after"""
    g = np.zeros_like(t)
    if depth == 0: return g
    for a, b in spans:
        sel = (t > a - 0.45) & (t < b + 1.1)
        if not sel.any(): continue
        tt = t[sel]
        s = np.where(tt < a, (tt - (a - 0.45)) / 0.45, np.where(tt <= b, 1.0, 1 - (tt - b) / 1.1))
        g[sel] = np.minimum(g[sel], depth * np.clip(s, 0, 1))
    return g


def main():
    a = sys.argv[1:]
    vref = float(a[a.index('--voice-ref') + 1]) if '--voice-ref' in a else -14.0
    E = json.load(open(os.path.join(ROOT, 'design', 'edit', 'EDL.json')))
    PL = json.load(open(os.path.join(SC, 'placements.json')))
    W = json.load(open(os.path.join(SC, 'windows.json')))
    T = json.load(open(os.path.join(SC, 'takes.json')))
    N = int(round(E['total_frames'] / E['fps'] * SR))
    bed = np.zeros((N, 2)); mask = np.zeros(N, bool)
    # speech spans, merged across gaps under 1.4 s
    spans = []
    for s0, s1 in sorted(PL['speech']):
        if spans and s0 - spans[-1][1] < 1.4: spans[-1][1] = max(spans[-1][1], s1)
        else: spans.append([s0, s1])
    hp = signal.butter(2, 25, 'highpass', fs=SR, output='sos')
    takes, report = {}, {}
    for p in PL['placements']:
        cid = p['id']; w = W[cid]; g = w['source']
        if g not in takes: takes[g] = sf.read(os.path.join(ROOT, T[g]['file']), always_2d=True)[0]
        y = assemble(takes[g], w['pieces'], w.get('join_s', 0.3), w.get('retune_cents', 0.0))
        y = signal.sosfiltfilt(hp, y, axis=0)
        n = int(round(p['span_s'] * SR)); short = n - len(y)
        y = y[:n]
        # level: the music's own level is the plan's in-gap level
        gap_target = vref + p['level_in_gaps_db']
        by_peak = cid in ('SC00d', 'SC09c')
        if not by_peak:
            L = F.integrated_lufs(y); y = y * 10 ** ((gap_target - L) / 20)
        m = len(y)
        fi, fo = min(m, int(p['fade_in_s'] * SR)), min(m, int(p['fade_out_s'] * SR))
        if fi: y[:fi] *= ramp(fi, p.get('fade_in_curve', 'cos'))[:, None]
        if fo: y[m - fo:] *= ramp(fo, 'lin' if p.get('hard_out') else p.get('fade_out_curve', 'cos'), up=False)[:, None]
        if by_peak:
            t, S = F.loudness_curve(y, 3.0, 0.05); y = y * 10 ** ((gap_target - S.max()) / 20)
        s = int(round(p['start_s'] * SR)); tt = (s + np.arange(m)) / SR
        depth = p['level_under_voice_db'] - p['level_in_gaps_db']
        gd = duck_db(tt, spans, depth)
        y = y * (10 ** (gd / 20))[:, None]
        for sd in p.get('stop_downs', []):                 # exact silence, 30 ms down before, 80 ms back after
            gs = np.ones(m)
            a0, a1 = sd['from_s'] - 0.03, sd['from_s']; b0, b1 = sd['to_s'], sd['to_s'] + 0.08
            gs = np.where((tt >= a0) & (tt < a1), 1 - (tt - a0) / 0.03, gs); gs = np.where((tt >= a1) & (tt < b0), 0.0, gs)
            gs = np.where((tt >= b0) & (tt < b1), (tt - b0) / 0.08, gs); y = y * gs[:, None]
        e = min(N, s + m)
        bed[s:e] += y[:e - s]; mask[s:e] = True
        report[cid] = {'source': g, 'start_s': p['start_s'], 'end_s': p['end_s'], 'audio_end_s': round(e / SR, 3),
                       'short_by_s': round(max(0, short) / SR, 3), 'gap_target_lufs': round(gap_target, 1),
                       'under_target_lufs': round(vref + p['level_under_voice_db'], 1), 'duck_db': depth,
                       'stretch': [pc.get('stretch_to') for pc in w['pieces'] if pc.get('stretch_to')],
                       'pieces': w['pieces'], 'retune_cents': w.get('retune_cents', 0.0)}
    bed[~mask] = 0.0
    # checks
    nz = np.where(np.abs(bed).max(axis=1) > 0)[0]
    for cid, r in report.items():
        s, e = int(round(r['start_s'] * SR)), int(round(r['end_s'] * SR))
        seg = bed[s:e]; q = np.where(np.abs(seg).max(axis=1) > 1e-7)[0]
        r['first_sound_s'] = round((s + q[0]) / SR, 3) if len(q) else None
        r['last_sound_s'] = round((s + q[-1]) / SR, 3) if len(q) else None
        r['integrated_lufs'] = round(F.integrated_lufs(seg), 1) if len(q) else None
        tS, S = F.loudness_curve(seg, 3.0, 0.05); r['max_short_term_lufs'] = round(float(S.max()), 1)
    p = next(x for x in PL['placements'] if x['id'] == 'SC00d')
    s, e = int(round(p['start_s'] * SR)), int(round(p['end_s'] * SR))
    tm, M = F.loudness_curve(bed[s:e], 0.4, 0.01); tpk = p['start_s'] + float(tm[int(np.argmax(M))])
    report['SC00d']['peak_momentary_s'] = round(tpk, 3); report['SC00d']['peak_vs_title_frame_s'] = round(tpk - p['peak_s'], 3)
    tS, S = F.loudness_curve(bed[s:e], 3.0, 0.01); report['SC00d']['peak_short_term_s'] = round(p['start_s'] + float(tS[int(np.argmax(S))]), 3)
    os.makedirs(os.path.join(ROOT, 'out', 'audio'), exist_ok=True)
    pk = float(np.abs(bed).max())
    out = os.path.join(ROOT, 'out', 'audio', 'score_bed.wav')
    sf.write(out, bed.astype(np.float32), SR, subtype='PCM_24')
    back, _ = sf.read(out, always_2d=True)
    summary = {'file': 'out/audio/score_bed.wav', 'samples': N, 'duration_s': round(N / SR, 3), 'edl_duration_s': E['duration'],
               'voice_ref_lufs': vref, 'sample_peak_dbfs': round(20 * np.log10(pk + 1e-12), 2),
               'true_peak_dbtp': round(F.true_peak_dbtp(back), 2), 'integrated_lufs': round(F.integrated_lufs(back), 1),
               'clipped_samples': int((np.abs(back) >= 1.0 - 2 ** -23).sum()), 'first_sound_s': round(nz[0] / SR, 3),
               'last_sound_s': round(nz[-1] / SR, 3), 'scored_s': round(mask.sum() / SR, 2),
               'title_peak': {k: report['SC00d'][k] for k in ('peak_momentary_s', 'peak_vs_title_frame_s', 'peak_short_term_s')}}
    json.dump({'summary': summary, 'placements': report}, open(os.path.join(SC, 'placed.json'), 'w'), indent=1, default=float)
    for cid, r in report.items():
        print(f"{cid:6s} {r['source']:4s} {r['start_s']:8.3f}-{r['end_s']:8.3f}  sound {r['first_sound_s']}-{r['last_sound_s']}  "
              f"int {r['integrated_lufs']} LUFS (gap target {r['gap_target_lufs']}, under {r['under_target_lufs']}), max ST {r['max_short_term_lufs']}"
              + (f"  short {r['short_by_s']} s" if r['short_by_s'] else ''))
    print(json.dumps(summary, indent=1))


if __name__ == '__main__':
    main()
