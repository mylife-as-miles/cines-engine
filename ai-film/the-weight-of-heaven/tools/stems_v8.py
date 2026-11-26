#!/usr/bin/env python3
"""Cut v8's sound laid out layer by layer on the FILM's clock, for the sound audit. Reads only; changes nothing in the mix.

Every layer is placed exactly as tools/combine_bell_vale.py (cut v7) and tools/combine_film_v8.py (cut v8) place it,
fades and gains included, so that each can be heard and measured alone and the sum is the film's track (before the v5
limiter, which only ever touched the two bell strokes).

  python3 tools/stems_v8.py     ->  out/review/v8_sound/*.wav (48 kHz stereo, 64.125 s each) and layers.json
"""
import importlib.util, json, os, subprocess
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('cb', P('tools/combine_bell_vale.py')); cb = importlib.util.module_from_spec(spec); spec.loader.exec_module(cb)
spec = importlib.util.spec_from_file_location('c8', P('tools/combine_film_v8.py')); c8 = importlib.util.module_from_spec(spec); spec.loader.exec_module(c8)
SR, FPS = cb.SR, cb.FPS
s, sec, env, add, fades, wav = cb.s, cb.sec, cb.env, cb.add, cb.fades, cb.wav
OUT = P('out/review/v8_sound')
NQA, NV, NQB_ALL = 406, 871, 271


def main():
    os.makedirs(OUT, exist_ok=True)
    gm = 10 ** (cb.MASTER_GAIN_DB / 20)
    D, C, B, E, A = (wav(os.path.join(cb.STEMS, k + '.wav')) * gm for k in ('dialogue_production', 'choir', 'bell', 'effects', 'beds'))
    vale = {k: wav(P('out/edits/stems_vale', k + '.wav')) for k in ('production', 'wind', 'tremor')}
    qb = {k: wav(P('out/edits/stems_q03b', k + '.wav')) for k in ('production', 'wind', 'roar', 'arrival_thud')}
    c1, c2, c3 = s(cb.C1), s(cb.C2), s(c8.C3)
    la, lb = s(cb.QA), s(NQA - cb.QA)
    nqb = NQB_ALL - (c8.QB_CUT[1] - c8.QB_CUT[0])
    total = NV + NQA + nqb
    N = s(total)
    tA, t2, tB, t3 = c1, c1 + la, c2 + la, c2 + la + lb
    tE = t3 + (c3 - c2); tG = tE + s(nqb)
    Z = lambda: np.zeros((N, 2), np.float32)
    L = {k: Z() for k in ('choir', 'dialogue_and_cathedral_production', 'bell', 'cathedral_effects', 'cathedral_beds',
                          'vale_production_seedance_cleaned', 'vale_wind_synth', 'q03b_production_seedance_cleaned', 'q03b_wind_synth',
                          'q03b_roar_seedance_raw', 'q03b_arrival_thud_synth')}
    cath = {'choir': C, 'dialogue_and_cathedral_production': D, 'bell': B, 'cathedral_effects': E, 'cathedral_beds': A}

    # ---- the rite (v5 0 - 17.667)
    for k, x in cath.items():
        add(L[k], fades(x[:c1], fout=sec(0.005)), 0)
    # ---- over the cut down to the vale
    n_ans = sec(18.80) - c1
    add(L['dialogue_and_cathedral_production'], fades(D[c1:c1 + n_ans], fin=sec(0.005), fout=sec(0.05)), tA)
    add(L['choir'], fades(C[c1:c1 + sec(1.25)], fin=sec(0.005), fout=sec(1.25)), tA)
    add(L['cathedral_beds'], fades(A[c1:c1 + sec(0.5)], fin=sec(0.005), fout=sec(0.5)), tA)
    for k in ('production', 'wind'):                                   # the vale, shots 1-2
        add(L['vale_production_seedance_cleaned' if k == 'production' else 'vale_wind_synth'], fades(vale[k][:la], fin=sec(0.5), fout=sec(0.03)), tA)
    # ---- back up: Serath and the seal (v5 17.667 - 22.458)
    up = 10 ** (5 / 20)
    add(L['choir'], fades(C[c1 - sec(0.4):c1], fin=sec(0.4)) * up, t2 - sec(0.4))
    n_x = sec(1.2)
    lift = np.ones((n_x + sec(0.02), 1), np.float32); lift[:n_x] = env(n_x, up, 1)
    add(L['choir'], fades(C[c1:c1 + n_x + sec(0.02)] * lift, fin=sec(0.005), fout=sec(0.02)), t2)
    for k in ('bell', 'cathedral_effects', 'cathedral_beds'):
        add(L[k], fades(cath[k][c1:c1 + n_x + sec(0.02)], fin=sec(0.005), fout=sec(0.02)), t2)
    nf = sec(0.6)
    for k, x in cath.items():
        rest = x[c1 + n_x:c2].copy()
        if k == 'choir':
            rest[-nf:] *= env(nf, 1, 0)                                  # the choir goes out before the water
        add(L[k], fades(rest, fin=sec(0.02), fout=sec(0.01)), t2 + n_x)
    # ---- the vale, shots 3-5
    for k in ('production', 'wind'):
        name = 'vale_production_seedance_cleaned' if k == 'production' else 'vale_wind_synth'
        add(L[name], fades(vale[k][la - sec(0.35):la], fin=sec(0.35)), tB - sec(0.35))
        add(L[name], fades(vale[k][la:la + lb], fin=sec(0.005), fout=sec(0.3)), tB)
    # ---- back up: the warrant, the bell (v5 22.458 - 29.292)
    add(L['choir'], fades(C[c2 - sec(0.5):c2], fin=sec(0.5)), t3 - sec(0.5))
    for k, x in cath.items():
        add(L[k], fades(x[c2:c3], fin=sec(0.005), fout=sec(0.04)), t3)
    # ---- the mountain lets go (Q03B), the bell's note far above
    add(L['bell'], fades((c8.lowpass(B[c3:], 1200.0) * 10 ** (-13 / 20))[:s(nqb)], fin=sec(0.04), fout=sec(0.05)), tE)
    a0, a1 = s(c8.QB_CUT[0]), s(c8.QB_CUT[1]); xf = sec(0.02); ramp = env(xf, 0, 1)
    for k, name in (('production', 'q03b_production_seedance_cleaned'), ('wind', 'q03b_wind_synth'), ('roar', 'q03b_roar_seedance_raw'), ('arrival_thud', 'q03b_arrival_thud_synth')):
        q = qb[k]
        q = np.concatenate([q[:a0 - xf], q[a0 - xf:a0] * (1 - ramp) + q[a1 - xf:a1] * ramp, q[a1:]])[:s(nqb)]
        add(L[name], fades(q, fin=sec(0.08), fout=sec(0.03)), tE)
    # ---- the still cup (v5 29.292 - 36.292)
    for k, x in (('dialogue_and_cathedral_production', D), ('choir', C), ('cathedral_beds', A)):
        add(L[k], fades(x[c3:], fin=sec(0.02)), tG)
    add(L['cathedral_effects'], fades(E[c3:] * 10 ** (-8 / 20), fin=sec(0.02)), tG)
    add(L['bell'], fades(c8.lowpass(B[c3:], 2500.0) * 10 ** (-14 / 20), fin=sec(0.02)), tG)

    info = {'seconds': round(N / SR, 3), 'sections_s': {'the rite (above)': [0, round(tA / SR, 3)], 'the vale: built to bear (below)': [round(tA / SR, 3), round(t2 / SR, 3)],
            'unread: Serath, the seal (above)': [round(t2 / SR, 3), round(tB / SR, 3)], 'the water, the ox, the dust (below)': [round(tB / SR, 3), round(t3 / SR, 3)],
            'the warrant, the release, the stroke (above)': [round(t3 / SR, 3), round(tE / SR, 3)], 'the mountain lets go, the run (below)': [round(tE / SR, 3), round(tG / SR, 3)],
            'the still cup, black (above)': [round(tG / SR, 3), round(N / SR, 3)]}, 'layers': {}}
    total_sum = Z()
    for k, x in L.items():
        total_sum += x
        path = os.path.join(OUT, k + '.wav')
        with open(path + '.f32', 'wb') as f:
            f.write(x.astype('<f4').tobytes())
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', path + '.f32', '-c:a', 'pcm_s24le', path], check=True)
        os.remove(path + '.f32')
        mono = x.mean(1); hop = SR // 4
        lv = [round(float(20 * np.log10(np.sqrt((mono[i:i + hop] ** 2).mean()) + 1e-9)), 1) for i in range(0, N - hop, hop)]
        active = [round(i * 0.25, 2) for i, v in enumerate(lv) if v > -60]
        spans = []
        for t in active:
            if spans and abs(t - spans[-1][1] - 0.25) < 1e-6:
                spans[-1][1] = t
            else:
                spans.append([t, t])
        info['layers'][k] = {'file': os.path.relpath(path, HERE), 'audible_spans_s (above -60 dBFS)': [[a, round(b + 0.25, 2)] for a, b in spans],
                             'level_dbfs_per_quarter_second': lv}
    mix = wav(P('out/edits/I_bell_v8.wav'))[:N]
    info['sum_of_layers_vs_mix_residual_dbfs'] = round(float(20 * np.log10(np.sqrt(((total_sum - mix) ** 2).mean()) + 1e-9)), 1)
    json.dump(info, open(os.path.join(OUT, 'layers.json'), 'w'), indent=1)
    print('wrote', OUT, '| residual (layers - mix):', info['sum_of_layers_vs_mix_residual_dbfs'], 'dBFS')
    for k, v in info['layers'].items():
        print(f"  {k:36s} {v['audible_spans_s (above -60 dBFS)']}")


if __name__ == '__main__':
    main()
