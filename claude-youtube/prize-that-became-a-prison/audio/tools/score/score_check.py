"""Listen to every Lyria take with earshot before it goes in the film, and measure its tuning and tempo.
Adapted from claude-film/one-too-many/tools/score_check.py for this film.

  EARSHOT_THREADS=2 /home/user/leonxlnx/earshot/.venv/bin/python audio/tools/score/score_check.py [G1_t1 ...] [--force]
      -> audio/score/check.json

Per take (audio/gen/score/<Gid>_t<k>.mp3):
- earshot describe on the whole take and on 20 s segments: the AudioSet labels and CLAP music hints. FAIL if any
  segment carries a vocal or drum label (Singing, Speech, Choir, Drum kit, ...) at p >= 0.15; a weaker reading
  (p >= 0.06) is listed for the author's ear.
- earshot match of the generation's mood against realistic wrong moods and the forbidden sounds (the mood check).
- tuning offset from A = 440 in cents: librosa.estimate_tuning with 12 bins an octave (range +-50 cents, so the
  0 to +36 cent drift reads unambiguously; the house tool's 36-bin call wraps at +-16.7 cents), cross-checked by a
  magnitude-weighted circular mean of interpolated spectral peaks (60 Hz - 2 kHz). tools/score/score_place.py retunes
  every take whose offset is more than 1 cent by resampling (soxr), so all of it lands within 5 cents.
- tempo: earshot measure (music) and, for the pulse takes, the median onset interval in the steady pulse.
"""
import json, os, sys, glob, subprocess
import numpy as np, librosa
from earshot import api

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
GEN = os.path.join(ROOT, 'audio', 'gen', 'score')
OUT = os.path.join(ROOT, 'audio', 'score', 'check.json')
NO = ['a pop song with vocals', 'a choir singing', 'a drum kit playing a beat', 'a person speaking']
MOOD = {   # the generation's mood (what the cue is for), and the realistic wrong moods it must beat
    'G1': ('dark, tense, low pulsing film underscore with strings', ['bright, happy, upbeat music', 'warm, tender, romantic music', 'an epic orchestral trailer']),
    'G2': ('a dark orchestral crescendo with low brass and strings rising to a climax', ['bright, happy, upbeat music', 'calm, quiet ambient music', 'warm, tender, romantic music']),
    'G3': ('warm, tender, gentle solo piano with soft strings', ['dark and tense music', 'bright, bouncy, upbeat pop music', 'an epic orchestral trailer']),
    'G4': ('light, gentle, curious music with soft strings and pizzicato', ['dark and tense music', 'an epic orchestral trailer', 'sad and slow solo piano']),
    'G5': ('quiet, uneasy, sparse piano over soft low strings', ['bright, happy, upbeat music', 'an epic orchestral trailer', 'warm, romantic love theme']),
    'G6': ('dark, tense, low pulsing film underscore with strings', ['bright, happy, upbeat music', 'warm, tender, romantic music', 'an epic orchestral trailer']),
    'G7': ('a very quiet, still, low sustained cello note', ['bright, happy, upbeat music', 'an epic orchestral trailer', 'a solo piano melody']),
    'G8': ('grave, slow, dark low strings, very quiet', ['bright, happy, upbeat music', 'an epic orchestral trailer', 'warm, romantic love theme']),
    'G9': ('slow, sparse, sad solo piano, very quiet', ['bright, happy, upbeat music', 'an epic orchestral trailer', 'tense action music']),
    'G10': ('a tender, quiet solo piano with a soft cello', ['bright, happy, upbeat music', 'an epic orchestral trailer', 'dark and tense music']),
    'G11': ('a very spare, slow, sad solo piano, very quiet', ['bright, happy, upbeat music', 'an epic orchestral trailer', 'tense action music']),
    'G12': ('a single soft piano note ringing out', ['a piano melody', 'a bell ringing', 'a guitar note']),
}
VOCAL = ('Singing', 'Speech', 'Choir', 'Vocal', 'Voice', 'Rapping', 'Humming', 'Chant', 'A capella', 'Yodel', 'Beatboxing', 'Whispering')
DRUM = ('Drum', 'Snare', 'Cymbal', 'Hi-hat', 'Percussion', 'Timpani', 'Tabla', 'Bass drum', 'Drum kit', 'Drum machine', 'Drum roll', 'Rimshot', 'Tambourine')
PULSE = {'G1', 'G2', 'G6'}


def audioset(d):
    """[(label, p)] from a describe result, whatever the key is called"""
    for k in ('audioset', 'audioset_labels', 'labels'):
        v = d.get(k)
        if isinstance(v, list) and v:
            return [((x.get('label') or x.get('name') or x.get('term')), float(x.get('p', x.get('prob', x.get('score', 0))))) for x in v]
        if isinstance(v, dict) and v:
            return sorted(((a, float(b)) for a, b in v.items()), key=lambda t: -t[1])
    return []


def flags(labels):
    v = [(a, p) for a, p in labels if any(w.lower() in a.lower() for w in VOCAL) and 'bowl' not in a.lower()]   # a singing bowl is not a voice
    d = [(a, p) for a, p in labels if any(w.lower() in a.lower() for w in DRUM)]
    return v, d


def tuning(path):
    y, sr = librosa.load(path, sr=22050, mono=True)
    yh = librosa.effects.harmonic(y)
    est = float(librosa.estimate_tuning(y=yh, sr=sr, bins_per_octave=12, resolution=0.005)) * 100
    S = np.abs(librosa.stft(yh, n_fft=16384, hop_length=4096))
    f = librosa.fft_frequencies(sr=sr, n_fft=16384)
    band = (f > 60) & (f < 2000)
    devs, w = [], []
    for j in range(S.shape[1]):
        col = S[:, j]
        if col.max() <= 0: continue
        pk = np.where((col[1:-1] > col[:-2]) & (col[1:-1] >= col[2:]) & band[1:-1] & (col[1:-1] > col.max() * 0.05))[0] + 1
        for i in pk:
            a, b, c = np.log(col[i - 1] + 1e-12), np.log(col[i] + 1e-12), np.log(col[i + 1] + 1e-12)
            dlt = 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) != 0 else 0.0
            fi = (i + dlt) * sr / 16384
            cents = 1200 * np.log2(fi / 440.0)
            devs.append(((cents + 50) % 100) - 50); w.append(col[i])
    devs, w = np.array(devs), np.array(w)
    ang = devs / 100 * 2 * np.pi
    circ = float(np.angle(np.sum(w * np.exp(1j * ang))) / (2 * np.pi) * 100) if len(devs) else None
    spread = float(np.sqrt(-2 * np.log(max(1e-9, abs(np.sum(w * np.exp(1j * ang))) / np.sum(w)))) / (2 * np.pi) * 100) if len(devs) else None
    return round(est, 1), (round(circ, 1) if circ is not None else None), (round(spread, 1) if spread is not None else None), len(y) / sr


def pulse_bpm(onsets, t0=8.0):
    o = np.array([x for x in onsets if x >= t0])
    if len(o) < 6: return None
    ioi = np.diff(o)
    # the heartbeat may be doubled (a "lub-dub"): take onsets about one beat apart (0.6-1.0 s at 60-100 bpm) as beats
    beats = [o[0]]
    for x in o[1:]:
        if x - beats[-1] >= 0.6: beats.append(x)
    ib = np.diff(beats); ib = ib[(ib > 0.6) & (ib < 1.0)]
    return round(60 / float(np.median(ib)), 1) if len(ib) >= 4 else None


def main():
    a = sys.argv[1:]
    want = [x for x in a if not x.startswith('--')]
    C = json.load(open(OUT)) if os.path.exists(OUT) else {}
    files = sorted(glob.glob(os.path.join(GEN, 'G*_t*.mp3')) + glob.glob(os.path.join(GEN, 'G*_t*.wav')))
    for f in files:
        take = os.path.splitext(os.path.basename(f))[0]; gid = take.split('_')[0]
        if want and take not in want: continue
        if take in C and '--force' not in a: print(take, 'have it'); continue
        m = api.measure(f, music=True)
        d = api.describe(f)
        labels = audioset(d)
        dur = float(m['duration'])
        segs = []
        for s0 in np.arange(0, dur - 4, 20.0):
            s1 = min(dur, s0 + 20.0)
            ds = api.describe(f, start=float(s0), end=float(s1))
            ls = audioset(ds); v, dr = flags(ls)
            segs.append({'start': round(float(s0), 1), 'end': round(float(s1), 1), 'audioset': [(x, round(p, 3)) for x, p in ls[:6]],
                         'vocal': [(x, round(p, 3)) for x, p in v if p >= 0.06], 'drum': [(x, round(p, 3)) for x, p in dr if p >= 0.06],
                         'music_hints': [(h['term'], h['z']) for h in ds.get('music_hints', [])[:4]],
                         'lufs': ds.get('measurements', {}).get('lufs')})
        q, alts = MOOD[gid]
        mm = api.match(f, q, alts=alts + NO)
        est, circ, spread, _ = tuning(f)
        v_all = sorted({x for s in segs for x, p in s['vocal']} | {x for x, p in flags(labels)[0] if p >= 0.06})
        d_all = sorted({x for s in segs for x, p in s['drum']} | {x for x, p in flags(labels)[1] if p >= 0.06})
        hard = [x for s in segs for x, p in s['vocal'] + s['drum'] if p >= 0.15] + [x for x, p in flags(labels)[0] + flags(labels)[1] if p >= 0.15]
        res = {'file': os.path.relpath(f, ROOT), 'duration_s': round(dur, 2),
               'tune_cents': est, 'tune_cents_peaks': circ, 'tune_spread_cents': spread,
               'lufs': m.get('lufs'), 'short_term_max_lufs': m.get('short_term_max_lufs'), 'true_peak_dbtp': m.get('true_peak_dbtp'),
               'lra_lu': m.get('lra_lu'), 'key': m.get('key'), 'tempo_earshot': m.get('tempo'), 'f0_hz': m.get('f0_hz'),
               'pulse_bpm': pulse_bpm(m.get('onsets') or []) if gid in PULSE else None,
               'onsets': m.get('onsets'), 'peak_at': m.get('peak_at'),
               'top_tags': [(t['term'], t['z'], t.get('verdict')) for t in d.get('top_tags', [])[:6]],
               'music_hints': [(h['term'], h['z']) for h in d.get('music_hints', [])[:8]],
               'audioset': [(x, round(p, 3)) for x, p in labels[:10]],
               'segments': segs, 'vocal_tags': v_all, 'drum_tags': d_all,
               'music_only': not hard, 'music_only_note': ('FAIL: ' + ', '.join(sorted(set(hard)))) if hard else
                   ('pass' + (f' (weak readings for the ear: {", ".join(v_all + d_all)})' if v_all or d_all else '')),
               'mood_query': q, 'mood_match': {k: mm.get(k) for k in ('verdict', 'z', 'p_vs_alts', 'best', 'ranking', 'summary') if k in mm},
               'describe_keys': sorted(d.keys())}
        C[take] = res
        json.dump(C, open(OUT, 'w'), indent=1)
        print(f"{take:7s} {dur:5.1f}s tune {est:+5.1f} c (peaks {circ:+5.1f}, spread {spread}) key {(m.get('key') or [{}])[0].get('key')} "
              f"pulse {res['pulse_bpm']} | {res['music_only_note'][:90]}\n        mood: {str(res['mood_match'].get('summary', ''))[:220]}\n"
              f"        hints: {res['music_hints'][:4]}\n        audioset: {res['audioset'][:5]}", flush=True)


if __name__ == '__main__':
    main()
