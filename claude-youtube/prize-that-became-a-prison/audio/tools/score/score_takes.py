"""Make the chosen Lyria takes film-ready: 48 kHz stereo, in tune at A = 440, the cold open and title in D.

  EARSHOT_THREADS=2 /home/user/leonxlnx/earshot/.venv/bin/python audio/tools/score/score_takes.py [G1 ...]
      -> audio/score/takes/<Gid>.flac (48 kHz, 16-bit: the source is a 192 kbps MP3) and audio/score/takes.json

Per generation, TAKES names the chosen take and what it needs:
- fine tuning: the offset measured by score_check.py (mean of its two estimates) is removed by resampling
  (soxr) when it is over 1 cent; a few cents move the tempo by less than 0.2 %.
- key: Lyria 3.5 did not follow the keys asked for (8 of 9 takes; see audio/score/README.md). G1 (the pulse,
  under the D drone at 0:53-1:05) came back on C#2 and G2 (the title) on C2: both are moved to D, the film's home
  key, with Rubber Band (pitch and tempo in one pass, transients mixed, quality pitch mode, channels together),
  and their pulse is set to 76 bpm (both measured 74.9 bpm). Every other take keeps its own key: it plays alone,
  between silences, so moving it would cost sound quality and buy nothing a listener hears (the author decides).
After processing the tuning and the pulse tempo are measured again and written to takes.json.
"""
import json, os, sys, subprocess
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
SC = os.path.join(ROOT, 'audio', 'score')
SR = 48000
# generation -> chosen take, transposition (cents) and target pulse tempo (None = keep the take's own tempo)
TAKES = {
    'G1': {'take': 'G1_t1', 'transpose_cents': 100, 'pulse_bpm': 76.0, 'why_key': 'C#2 pulse -> D2 (the plan, the D drone under SC00c)'},
    'G2': {'take': 'G2_t1', 'transpose_cents': 200, 'pulse_bpm': 76.0, 'why_key': 'C2 -> D2 (the title chord in D minor, the plan)'},
    'G3': {'take': 'G3_t1'}, 'G4': {'take': 'G4_t1'}, 'G5': {'take': 'G5_t1'}, 'G8': {'take': 'G8_t1'},
    'G9': {'take': 'G9_t1'}, 'G10': {'take': 'G10_t1'}, 'G11': {'take': 'G11_t1'},
    'G7': {'take': 'G7_t1'},   # optional, for SC04b (G8's opening pulses at 76 bpm: not sparse enough)
    # G12 (optional, the last note): neither take is one A (t1 a melody in E-flat, t2 a piece in C): not used;
    # SC09c takes a lone A2 from G11 instead (score_window.py).
}


def ff(src, af):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '2', '-af', af, '-f', 'f32le', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def main():
    import score_check as SCK                      # tuning() and pulse_bpm()
    from earshot import api
    want = [a for a in sys.argv[1:] if not a.startswith('--')]
    check = json.load(open(os.path.join(SC, 'check.json')))
    tf = os.path.join(SC, 'takes.json'); T = json.load(open(tf)) if os.path.exists(tf) else {}
    os.makedirs(os.path.join(SC, 'takes'), exist_ok=True)
    for gid, spec in TAKES.items():
        if want and gid not in want: continue
        c = check.get(spec['take'])
        if not c: print(gid, 'no check yet for', spec['take']); continue
        src = os.path.join(ROOT, c['file'])
        offs = [v for v in (c['tune_cents'], c.get('tune_cents_peaks')) if v is not None]
        off = float(np.mean(offs))
        fine = -off if abs(off) > 1.0 else 0.0
        shift = spec.get('transpose_cents', 0) + fine
        tempo = 1.0
        if spec.get('pulse_bpm') and c.get('pulse_bpm'):
            tempo = spec['pulse_bpm'] / c['pulse_bpm']
        if spec.get('transpose_cents'):            # Rubber Band: pitch and tempo apart, one pass
            af = (f'aresample={SR}:resampler=soxr:precision=28,'
                  f'rubberband=pitch={2 ** (shift / 1200):.6f}:tempo={tempo:.6f}:transients=mixed:pitchq=quality:channels=together')
            method = 'rubberband (pitch and tempo)'
        elif fine:                                  # resampling: pitch and tempo move together by a few cents
            r = 2 ** (fine / 1200)
            af = f'aresample={SR}:resampler=soxr:precision=28,asetrate={SR * r:.4f},aresample={SR}:resampler=soxr:precision=28'
            method = 'resample (soxr)'
        else:
            af = f'aresample={SR}:resampler=soxr:precision=28'; method = 'none (within 1 cent)'
        x = ff(src, af)
        out = os.path.join(SC, 'takes', gid + '.flac')
        pk = np.abs(x).max()
        if pk > 0.999: x = x * (0.999 / pk)        # never clip the stored take (the placement normalises anyway)
        sf.write(out, x.astype(np.float32), SR, subtype='PCM_16')
        est, circ, spread, dur = SCK.tuning(out)
        m = api.measure(out, music=True)
        bpm = SCK.pulse_bpm(m.get('onsets') or []) if gid in SCK.PULSE else None
        T[gid] = {'take': spec['take'], 'raw': c['file'], 'file': os.path.relpath(out, ROOT), 'duration_s': round(len(x) / SR, 3),
                  'raw_tune_cents': round(off, 1), 'fine_retune_cents': round(fine, 1), 'transpose_cents': spec.get('transpose_cents', 0),
                  'why_key': spec.get('why_key', 'kept in its own key'), 'raw_key': (c.get('key') or [{}])[0].get('key'),
                  'tempo_factor': round(tempo, 5), 'method': method, 'filter': af,
                  'after': {'tune_cents': est, 'tune_cents_peaks': circ, 'key': (m.get('key') or [{}])[0].get('key'),
                            'pulse_bpm': bpm, 'lufs': m.get('lufs'), 'true_peak_dbtp': m.get('true_peak_dbtp'), 'onsets': m.get('onsets')},
                  'in_tune_within_5_cents': bool(abs(np.mean([v for v in (est, circ) if v is not None])) <= 5)}
        json.dump(T, open(tf, 'w'), indent=1)
        print(f"{gid}: {method}: raw {off:+.1f} c, shift {shift:+.1f} c, tempo x{tempo:.4f} -> after {est:+.1f} / {circ:+.1f} c, "
              f"key {T[gid]['after']['key']}, pulse {bpm} bpm, {len(x) / SR:.2f} s", flush=True)


if __name__ == '__main__':
    main()
