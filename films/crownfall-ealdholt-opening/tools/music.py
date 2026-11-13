"""The film's music cue: candidates from Stable Audio 3.0 Small Music, and a look at each one's shape.

    python tools/music.py [--only 401,403] [--force]     -> audio/music/cand_<seed>.wav and a table of their shape

It makes one take per seed in audio/sfx_plan.json's "music" block (the same prompt on each), through Soundbox as
tools/stable_sfx.py makes the sounds, and prints for each its loudness in two-second steps and where its loudest onset
falls. The film wants a cue that is quiet until the bloom (6.0 s), lifts from it and is bright through the village;
audio/music/pick.json then records the chosen take and its 'offset' (the second of the take laid on the film's first
frame), which tools/mix.py reads. tools/listen_sfx.py's way of hearing (earshot) is used on the candidates by
tools/listen_music.py.
"""
import argparse, json, os, sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True
import stable_sfx as sa  # noqa: E402

OUT = os.path.join(sa.ROOT, 'audio', 'music')


def shape(path):
    x = sa.decode(path)
    env = np.abs(x).max(axis=1)
    step = sa.SR * 2
    rms = [sa.db(np.sqrt(np.mean(x[i:i + step] ** 2))) for i in range(0, len(x) - step + 1, step)]
    # the strongest rise: where a half-second's level most exceeds the half-second before it
    w = sa.SR // 2
    lvl = np.sqrt(np.convolve(env ** 2, np.ones(w) / w, 'same'))
    rise = lvl[w:] / np.maximum(lvl[:-w], 1e-4)
    onset = (int(np.argmax(rise[: len(rise) - w])) + w // 2) / sa.SR
    return rms, onset, len(x) / sa.SR


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--only', help='comma-separated seeds')
    ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    music = json.load(open(sa.PLAN))['music']
    os.makedirs(OUT, exist_ok=True)
    only = set(int(s) for s in a.only.split(',')) if a.only else None
    for seed in music['seeds']:
        dst = os.path.join(OUT, f'cand_{seed}.wav')
        if only and seed not in only:
            continue
        if not os.path.exists(dst) or a.force:
            rec = sa.generate(music['prompt'], music['dur'], seed, dst, model=music['model'], trim=False)
            print(f"cand_{seed}: made in {rec['gen_s']} s, {rec['length_s']} s", flush=True)
        rms, onset, length = shape(dst)
        print(f"cand_{seed}  {length:.1f} s  strongest rise at {onset:.1f} s  level per 2 s: " + ' '.join(f'{v:.0f}' for v in rms), flush=True)


if __name__ == '__main__':
    main()
