"""Choose where each placement starts inside its take, on the processed takes (audio/score/takes/<Gid>.flac).
Adapted from claude-film/one-too-many/tools/score_window.py for this film.

  EARSHOT_THREADS=2 /home/user/leonxlnx/earshot/.venv/bin/python audio/tools/score/score_window.py
      -> audio/score/windows.json  (read by score_place.py)

Lyria writes about a minute whatever length is asked and does not keep the prompt's timings, so each placement's
window (its span on the EDL clock, audio/score/placements.json) is found in its take: by a rule where the plan gives
one (the pulse's entry, the end at the take's natural ending, the held A, the title peak) and by earshot `find`
(a window as long as the span slid across the take, scored against what the placement must contain) where it says to
listen. A window is a list of pieces [from, to] in take seconds, played in order with 0.3 s equal-power joins;
a piece with `stretch_to` is time-stretched by Rubber Band to that length (pitch kept).
"""
import json, os, sys
import numpy as np, soundfile as sf
from earshot import api, features as F

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
SC = os.path.join(ROOT, 'audio', 'score')
SR = 48000
# the plan's source, unless an optional generation replaced it (the plan's own condition, logged in generations.json)
SOURCE = {'SC04b': ('G7', "G8's opening is not sparse enough: it pulses at 76 bpm from 0.4 s"),
          'SC09c': ('G11', 'G3 has no clean single A (its isolated strokes are chords) and G12 failed twice (a melody in '
                            'E-flat, then a piece in C): the lone A2 of G11, the same felt piano, 4.4 s to the next note')}


def segs_of(r):
    s = r.get('segments') or r.get('results') or r.get('moments') or []
    return [{'start': float(x.get('start', x.get('start_s', 0))), 'end': float(x.get('end', x.get('end_s', 0))),
             'z': x.get('z'), 'kind': x.get('kind')} for x in s]


def main():
    P = {p['id']: p for p in json.load(open(os.path.join(SC, 'placements.json')))['placements']}
    T = json.load(open(os.path.join(SC, 'takes.json')))
    W = {}
    cache = {}

    def take(g):
        if g not in cache:
            x, sr = sf.read(os.path.join(ROOT, T[g]['file']), always_2d=True); assert sr == SR
            cache[g] = x
        return cache[g]

    def path(g): return os.path.join(ROOT, T[g]['file'])
    def dur(g): return len(take(g)) / SR
    def ons(g): return T[g]['after']['onsets'] or []

    def natural_end(g, below=30.0):
        x = take(g); t, S = F.loudness_curve(x, 3.0, 0.1); I = F.integrated_lufs(x)
        ok = np.where(S > I - below)[0]
        return float(min(dur(g), t[ok[-1]] + 1.5)) if len(ok) else dur(g)

    def lead(g):
        x = take(g); env = np.abs(x).max(axis=1); on = np.where(env > 10 ** (-50 / 20))[0]
        return max(0.0, on[0] / SR - 0.01) if len(on) else 0.0

    def find(g, q, win, start=None, end=None, top=5):
        r = api.find(path(g), q, win=win, hop=0.5, top=top, start=start, end=end, kind='texture')
        return segs_of(r)

    def st_at(g, t0, t1):
        x = take(g)[int(t0 * SR):int(t1 * SR)]
        return F.integrated_lufs(x) if len(x) > SR else -70.0

    span = {k: v['span_s'] for k, v in P.items()}
    # --- G1: the pulse. Its first regular onset (>= 4 more about one beat apart) is the pulse's entry.
    o = [v for v in ons('G1') if v > 6.0]
    p = next(v for i, v in enumerate(o) if len(o) > i + 4 and all(0.6 < o[i + k + 1] - o[i + k] < 1.0 or o[i + k + 1] - o[i + k] < 0.5 for k in range(4)))
    W['SC00a'] = {'source': 'G1', 'pieces': [{'from': round(lead('G1'), 3), 'to': round(p - 0.04, 3), 'stretch_to': span['SC00a']}],
                  'rule': f'the take before its pulse (the low strings alone, {lead("G1"):.2f}-{p - 0.04:.2f} s), stretched to the span so the pulse enters on the cut to seated_called'}
    W['SC00b'] = {'source': 'G1', 'pieces': [{'from': round(p - 0.04, 3), 'to': round(p - 0.04 + span['SC00b'], 3)}],
                  'rule': f'from the pulse entry ({p:.2f} s), continuous with SC00a'}
    # SC00c: the rebuild, cut dead at its strongest: earshot find for tension in the take after SC00b's window
    cand = find('G1', 'dark and tense music', span['SC00c'], start=p + span['SC00b'], end=dur('G1') - 1.5)
    for c in cand: c['build_db'] = round(st_at('G1', c['end'] - 4, c['end']) - st_at('G1', c['start'], c['start'] + 4), 1)
    best = max([c for c in cand if c['build_db'] >= 0] or cand, key=lambda c: (c['z'] or 0))
    W['SC00c'] = {'source': 'G1', 'pieces': [{'from': round(best['start'], 3), 'to': round(best['start'] + span['SC00c'], 3)}],
                  'query': 'dark and tense music', 'candidates': cand, 'rule': 'earshot find (dark and tense), building (last 4 s louder than first 4 s), most tense of the top 5'}
    # SC03b: the pulse returns: steady pulse
    cand = find('G1', 'a steady low pulse with dark sustained strings', span['SC03b'], start=p - 0.04, end=dur('G1') - 1.5)
    best = cand[0]
    W['SC03b'] = {'source': 'G1', 'pieces': [{'from': round(best['start'], 3), 'to': round(best['start'] + span['SC03b'], 3)}],
                  'query': 'a steady low pulse with dark sustained strings', 'candidates': cand, 'rule': 'earshot find, best'}
    # --- G2: the title. The peak = the attack that opens the loudest moment, plus 80 ms (a hit leads its frame slightly).
    x = take('G2'); t, M = F.loudness_curve(x, 0.4, 0.05); tm = float(t[int(np.argmax(M))])
    att = max([v for v in ons('G2') if tm - 0.6 <= v <= tm + 0.05] or [tm - 0.08])
    pk = att + 0.08
    before = P['SC00d']['peak_s'] - P['SC00d']['start_s']; after = P['SC00d']['end_s'] - P['SC00d']['peak_s']
    W['SC00d'] = {'source': 'G2', 'pieces': [{'from': round(pk - before, 3), 'to': round(pk + after, 3)}], 'peak_src_s': round(pk, 3),
                  'momentary_max_src_s': round(tm, 3), 'attack_src_s': round(att, 3),
                  'rule': f'the loudest momentary block is centred at {tm:.2f} s; its attack at {att:.2f} s; the peak point {pk:.2f} s goes on the title frame'}
    # --- G3: the prize, 77 s for a 90.8 s span: one piano phrase of the opening is heard twice (a jump back from
    # one phrase start to an earlier one, both after a pause), chosen by the chroma of the phrases' first 1.5 s.
    import librosa
    y = librosa.to_mono(take('G3').T); need = span['SC01'] - dur('G3')
    o3 = ons('G3'); starts = [v for i, v in enumerate(o3) if 2.0 < v < 29.0 and i > 0 and v - o3[i - 1] >= 1.5]
    def chroma(t0): c = librosa.feature.chroma_cqt(y=y[int(t0 * SR):int((t0 + 1.5) * SR)], sr=SR, tuning=0.0).mean(1); return c / (np.linalg.norm(c) + 1e-9)
    pairs = [(a, b) for a in starts for b in starts if need <= b - a <= need + 1.5]
    scored = sorted(((float(chroma(a) @ chroma(b)), a, b) for a, b in pairs), reverse=True)
    sim, a, b = scored[0]
    W['SC01'] = {'source': 'G3', 'pieces': [{'from': 0.0, 'to': round(b - 0.04, 3)}, {'from': round(a - 0.34, 3), 'to': round(dur('G3'), 3)}],
                 'join_s': 0.3, 'repeat': {'from': round(a, 3), 'to': round(b, 3), 'chroma_similarity': round(sim, 3)},
                 'candidates': [(round(s, 3), round(a_, 2), round(b_, 2)) for s, a_, b_ in scored[:6]],
                 'rule': f'the piano phrases {a:.2f}-{b:.2f} s are heard twice (jump back at {b:.2f} s to {a:.2f} s, in the pause before both); the take then plays to its end, which decays before the 1.5 s silence'}
    # --- G4: the tick
    q = 'soft high pizzicato strings ticking over a light string pad'
    cand = find('G4', q, span['SC02'])
    W['SC02'] = {'source': 'G4', 'pieces': [{'from': round(cand[0]['start'], 3), 'to': round(cand[0]['start'] + span['SC02'], 3)}],
                 'query': q, 'candidates': cand, 'rule': 'earshot find, best'}
    # --- G5: the gift: its last bars (the take's natural ending) on the drop before "Overweight."
    ne = natural_end('G5')
    W['SC03'] = {'source': 'G5', 'pieces': [{'from': round(ne - span['SC03'], 3), 'to': round(ne, 3)}],
                 'rule': f'ends at the take\'s natural ending ({ne:.2f} s: its last bars, low and dark) on the cut to the scale'}
    # --- SC04b: the held note (G7 when the plan's condition for it was met, else G8's opening)
    g = SOURCE['SC04b'][0] if SOURCE['SC04b'][0] in T else 'G8'
    q = 'a very quiet, still, low sustained cello note'
    cand = find(g, q, span['SC04b'], start=lead(g))
    W['SC04b'] = {'source': g, 'source_why': SOURCE['SC04b'][1] if g != 'G8' else 'the plan', 'pieces': [{'from': round(cand[0]['start'], 3), 'to': round(cand[0]['start'] + span['SC04b'], 3)}],
                  'query': q, 'candidates': cand, 'rule': 'earshot find, best'}
    # --- G8: the sentence, thinning to one held A by the divide. The held A starts at the take's last onset.
    h = max(v for v in ons('G8') if v < dur('G8') - 5)
    into = P['SC06']['thin_by_s'] - P['SC06']['start_s']
    e = h + (span['SC06'] - into)
    W['SC06'] = {'source': 'G8', 'pieces': [{'from': round(e - span['SC06'], 3), 'to': round(e, 3)}], 'held_a_src_s': round(h, 3),
                 'rule': f'the held A (A2/A3, no onsets) starts at {h:.2f} s and lands on the divide; out before the final chord'}
    # --- G9: the wait, whole
    W['SC07'] = {'source': 'G9', 'pieces': [{'from': round(lead('G9'), 3), 'to': round(min(dur('G9'), lead('G9') + span['SC07']), 3)}],
                 'rule': 'the whole take (81.8 s for an 82.0 s span: it ends 0.2 s early, on its own decay)'}
    # --- G10: the father: aligned so its last note rings out at the end
    ne = natural_end('G10')
    W['SC08'] = {'source': 'G10', 'pieces': [{'from': round(ne - span['SC08'], 3), 'to': round(ne, 3)}],
                 'rule': f'its last note rings out at the end (natural ending {ne:.2f} s)'}
    # --- G11: When?
    l11 = lead('G11')
    W['SC09a'] = {'source': 'G11', 'pieces': [{'from': round(l11, 3), 'to': round(l11 + span['SC09a'], 3)}], 'rule': 'its first 21 s'}
    q = 'a sparse, slow, quiet solo piano'
    cand = find('G11', q, span['SC09b'], start=l11 + span['SC09a'] + 2.0)
    W['SC09b'] = {'source': 'G11', 'pieces': [{'from': round(cand[0]['start'], 3), 'to': round(cand[0]['start'] + span['SC09b'], 3)}],
                  'query': q, 'candidates': cand, 'rule': 'earshot find, best, after SC09a\'s window'}
    # --- SC09c: one A (G12 when its condition was met)
    g = SOURCE['SC09c'][0] if SOURCE['SC09c'][0] in T else 'G3'
    o12 = [v for v in ons(g) if v >= lead(g) - 0.05]
    n1 = o12[0] if o12 else lead(g)
    nxt = next((v for v in o12[1:] if v > n1 + 0.5), dur(g))
    to = min(nxt - 0.05, n1 - 0.01 + span['SC09c'])
    W['SC09c'] = {'source': g, 'source_why': SOURCE['SC09c'][1] if g != 'G3' else 'the plan', 'pieces': [{'from': round(n1 - 0.01, 3), 'to': round(to, 3)}],
                  'note_onset_src_s': round(n1, 3), 'next_onset_src_s': round(nxt, 3),
                  'rule': 'the first note, from its attack until just before the next one (or the span)'}
    for k, v in W.items():
        L = sum((pc.get('stretch_to') or pc['to'] - pc['from']) for pc in v['pieces']) - v.get('join_s', 0.0) * (len(v['pieces']) - 1)
        v['length_s'] = round(L, 3); v['span_s'] = span[k]
        print(f"{k:6s} {v['source']:4s} {' + '.join(f'[{pc['from']:.2f}, {pc['to']:.2f}]' + (f'->{pc['stretch_to']:.2f}' if pc.get('stretch_to') else '') for pc in v['pieces'])}"
              f"  = {L:6.2f} s for {span[k]:6.2f} s  | {v['rule'][:110]}", flush=True)
    json.dump(W, open(os.path.join(SC, 'windows.json'), 'w'), indent=1, default=float)


if __name__ == '__main__':
    main()
