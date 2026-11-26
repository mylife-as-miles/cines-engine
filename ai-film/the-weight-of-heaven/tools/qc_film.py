#!/usr/bin/env python3
"""Quality control for a mix of movement I: the checks the audit of cut v8 showed were missing. Reads only.

    /root/leonxlnx/earshot/.venv/bin/python tools/qc_film.py out/edits/I_bell_v9_A.wav [--listen] [--compare out/edits/I_bell_v8.wav]

Prints and writes <mix>_qc.json:
  - loudness (integrated, range, true peak), and the level every second;
  - the story's events in order of loudness, full band and as a phone plays them (300 Hz to 8 kHz, mono);
  - every picture cut in 5 ms steps: holes, level steps, single-sample clicks (the v8 record checked in 100 ms steps
    and missed a 20 ms hole and an 82 ms gap);
  - stretches of digital silence, and how long the film spends under -45 LUFS on a phone;
  - with --listen, what earshot's ear-model makes of the sounds the audit said did not read (the bell, the landing,
    the roar, the ox, the bowl, the valley's air, the choir): a forced choice against the things they were mistaken for.
"""
import argparse, importlib.util, json, os, subprocess
import numpy as np
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
spec = importlib.util.spec_from_file_location('mf', P('tools/mix_film.py')); mf = importlib.util.module_from_spec(spec); spec.loader.exec_module(mf)
mb, SR = mf.mb, mf.SR
EARSHOT = '/root/leonxlnx/earshot/.venv/bin/earshot'

LISTEN = [  # (name, start, end, what it should be, what the audit's listeners took it for)
    ('the opening stroke', 0.4, 4.4, 'an enormous bronze bell struck once', ['a gong', 'a singing bowl', 'a doorbell', 'a cinematic boom']),
    ('the answer', 16.2, 19.0, 'thousands of people speaking in unison in a huge hall', ['a few people speaking together', 'one woman speaking', 'a synthetic robotic voice']),
    ('the hoe and her steps', 17.9, 20.8, 'someone hoeing soil far away and light footsteps in mud', ['a stick snapping', 'a sword being drawn', 'a camera shutter click', 'a metal latch']),
    ('the bowl on the wall', 23.2, 24.1, 'a wooden bowl set down on stone', ['a box lid closing', 'a metal pan clanging', 'a door knock', 'a plastic object dropped']),
    ('the seal', mf.T_PRESS - 0.1, mf.T_PRESS + 0.8, 'a soft wet squelch', ['a camera shutter click', 'a gun being cocked', 'a mouse click', 'a match being struck']),
    ('the valley, air only', 30.3, 32.0, 'wind blowing across an open field', ['static white noise hiss', 'ocean waves on a beach', 'a waterfall', 'rain']),
    ('the ox', 35.05, 35.9, 'an ox or a cow grunting, snorting', ['a lion growling', 'a man coughing', 'a dog barking', 'a pig oinking']),
    ('the crows', 35.4, 36.8, 'birds taking off, wings flapping', ['cloth flapping', 'a whoosh', 'applause', 'paper rustling']),
    ('the landing', mf.T_LAND - 0.1, mf.T_LAND + 2.2, 'a colossal weight landing', ['a door closing with a latch', 'a wooden crate dropped', 'a drawer closing', 'coins dropping']),
    ('THE STROKE', mf.T_STROKE - 0.2, mf.T_STROKE + 5.1, 'an enormous bronze bell struck once', ['a gong', 'a singing bowl', 'a doorbell', 'a cinematic boom']),
    ('the run', mf.T_RUN + 0.2, mf.T_ARRIVE - 0.1, 'a man running in wet mud', ['footsteps on a hard floor', 'sneakers squeaking on a gym floor', 'a horse galloping', 'hands clapping']),
    ('the arrival and the roar', mf.T_ARRIVE - 0.1, mf.TG, 'the roar of a rockslide, an avalanche of rock', ['a jet engine', 'strong wind in a microphone', 'a train passing', 'ocean waves']),
    ('the cup', mf.TG + 0.1, mf.TG + 4.5, 'a large bell ringing on after being struck, in a cathedral', ['a synthesizer drone', 'an orchestral chord', 'tinnitus, a sine tone', 'applause']),
]


def phone(x):
    m = x.mean(1)
    sos = signal.butter(4, [300, 8000], 'bandpass', fs=SR, output='sos')
    y = signal.sosfilt(sos, m)
    return np.stack([y, y], 1)


def per_second(x):
    m = x.mean(1)
    return [round(float(mf.db(np.sqrt((m[i:i + SR] ** 2).mean()) + 1e-9)), 0) for i in range(0, len(m) - SR + 1, SR)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mix'); ap.add_argument('--listen', action='store_true'); ap.add_argument('--compare')
    a = ap.parse_args()
    path = a.mix if os.path.isabs(a.mix) else P(a.mix)
    x, sr = sf.read(path, always_2d=True); assert sr == SR
    rec = {'mix': os.path.relpath(path, HERE), 'seconds': round(len(x) / SR, 3), **mf.ebur(path)}
    rec['level_dbfs_per_second'] = per_second(x)
    ev = mf.events(x); ph = mf.events(phone(x))
    rec['events_lufs'] = dict(sorted(ev.items(), key=lambda kv: -kv[1]))
    rec['events_on_a_phone_lufs'] = dict(sorted(ph.items(), key=lambda kv: -kv[1]))
    rec['joins_5ms'] = mf.joins(x)
    m = x.mean(1)
    dead = np.abs(m) < 1e-6
    runs, i = [], 0
    while i < len(dead):
        if dead[i]:
            j = i
            while j < len(dead) and dead[j]:
                j += 1
            if j - i > int(0.01 * SR):
                runs.append([round(i / SR, 3), round(j / SR, 3)])
            i = j
        else:
            i += 1
    rec['digital_silence_longer_than_10ms'] = runs
    p = phone(x); win = int(0.4 * SR); hop = int(0.1 * SR)
    kp = mb.kpow(p); blocks = np.array([kp[i:i + win].mean() for i in range(0, len(kp) - win, hop)])
    lufs = -0.691 + 10 * np.log10(np.maximum(blocks, 1e-20))
    rec['seconds_under_minus45_lufs_on_a_phone'] = round(float((lufs < -45).sum() * hop / SR), 1)
    d = np.abs(np.diff(m)); k = int(np.argmax(d))
    rec['largest_single_sample_step'] = {'value': round(float(d[k]), 4), 'at_s': round(k / SR, 3)}
    if a.listen:
        out = {}
        for name, t0, t1, want, alts in LISTEN:
            r = subprocess.run([EARSHOT, 'match', path, want, '--alts', *alts, '--start', f'{t0:.2f}', '--end', f'{t1:.2f}', '--json'], capture_output=True, text=True)
            try:
                j = json.loads(r.stdout[r.stdout.index('{'):])
                q = (j.get('queries') or j.get('results') or [j])[0]
                alts_ = sorted(q.get('alts') or j.get('alts') or [], key=lambda e: -e.get('p', 0))
                out[name] = {'wanted': want, 'z': q.get('z'), 'p_vs_alts': q.get('p_vs_alts'), 'verdict': q.get('verdict'),
                             'nearest_mistake': f"{alts_[0]['query']} ({alts_[0]['p']:.0%})" if alts_ else None}
            except Exception as e:
                out[name] = {'wanted': want, 'error': (r.stdout + r.stderr)[-300:]}
        rec['earshot'] = out
    json.dump(rec, open(path.replace('.wav', '_qc.json'), 'w'), indent=1)
    print(f"{rec['mix']}: {rec['integrated_lufs']} LUFS, range {rec['lra_lu']} LU, true peak {rec['true_peak_dbtp']} dBTP")
    print('events, loudest first      full band | phone')
    for k_, v in rec['events_lufs'].items():
        print(f'  {k_:32s} {v:6.1f} | {ph[k_]:6.1f}')
    for k_, v in rec['joins_5ms'].items():
        print(f'  join {k_}: lowest 5 ms {v["lowest_5ms_dbfs"]} dBFS, {v["dip_below_quieter_side_db"]} dB under the quieter side; largest step {v["largest_step"]}')
    print('  digital silence:', runs, '| under -45 LUFS on a phone:', rec['seconds_under_minus45_lufs_on_a_phone'], 's | largest step', rec['largest_single_sample_step'])
    if a.listen:
        for name, v in rec['earshot'].items():
            print(f"  hears {name:26s}: {v}")
    if a.compare:
        y, _ = sf.read(a.compare if os.path.isabs(a.compare) else P(a.compare), always_2d=True)
        print('compare', a.compare, mf.ebur(a.compare if os.path.isabs(a.compare) else P(a.compare)))


if __name__ == '__main__':
    main()
