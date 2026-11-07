#!/usr/bin/env python3
"""Make another cut of the film from an edit list of removed spans (cuts/youtube.json), beside the director's cut.

  node tools/cuesheet.js out/cuesheet.json                      # the director's cut's cue sheet
  python3 tools/youtube_cut.py [cuts/youtube.json] [--picture]   # -> out/youtube/{cuesheet.json, score_plan.json, edl.json}
  uv run tools/build_mix.py --cut youtube --mix --mux            # -> out/youtube/autopilot_youtube.mp4

Each span [a, b) is removed whole frames at a time (24 fps: the frames whose time falls in it). The picture is cut from
the director's cut's picture (out/autopilot_picture.mp4) and re-encoded; nothing is redrawn. The soundtrack is not
chopped: every bed, cue, silence, duck, voice and score cue is moved onto the cut's clock and the mix is built again, so
a bed simply runs shorter, an effect inside a removed span is dropped, and a score cue that spans a cut plays on and ends
earlier on its own fade. A span must never take away a subtitle or a voiced take: this refuses to run if it would.
"""
import json, math, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FPS = 24


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    edl_path = os.path.join(ROOT, args[0]) if args else os.path.join(ROOT, 'cuts', 'youtube.json')
    name = os.path.splitext(os.path.basename(edl_path))[0]
    base = os.path.join(ROOT, 'out', name); os.makedirs(base, exist_ok=True)
    E = json.load(open(edl_path))
    cs = json.load(open(os.path.join(ROOT, 'out', 'cuesheet.json')))
    plan = json.load(open(os.path.join(ROOT, 'audio', 'score_plan.json')))
    M = json.load(open(os.path.join(ROOT, 'audio', 'sound_map.json')))

    # the removed spans in whole frames, then in seconds on the director's clock
    fr = sorted((math.ceil(a * FPS - 1e-6), math.ceil(b * FPS - 1e-6), why) for a, b, why in E['remove'])
    for (a0, b0, _), (a1, b1, w1) in zip(fr, fr[1:]):
        if a1 < b0: sys.exit(f'overlapping spans at {w1}')
    spans = [(a / FPS, b / FPS) for a, b, _ in fr]

    def T(t):
        """A time on the director's clock -> the cut's clock (a time inside a removed span lands on its cut)."""
        shift = 0.0
        for a, b in spans:
            if t >= b: shift += b - a
            elif t >= a: return a - shift
            else: break
        return t - shift

    def removed(t): return any(a <= t < b for a, b in spans)

    # the sequences on the cut's clock
    seqs = [dict(s, start=round(T(s['start']), 4), dur=round(T(s['start'] + s['dur']) - T(s['start']), 4)) for s in cs['seqs']]
    start = {s['id']: s['start'] for s in seqs}

    # voices and voiced subtitles must survive whole
    for c in cs['cues']:
        if c['name'] in ('voice', 'radio'):
            end = c['tg'] + c['p'].get('dur', 0) + 0.35
            if any(c['tg'] - 0.12 < b and a < end for a, b in spans): sys.exit(f"a removed span takes away part of {c['p'].get('id')}")

    beds = []
    for b in cs['beds']:
        key = b['name'] + '@' + b['seq'] if (b['name'] + '@' + b['seq']) in M['beds'] else b['name']
        e = M['beds'].get(key)
        if e and e.get('until') is not None and b['t1'] > e['until']:      # resolve the map's early end on the old clock first
            b = dict(b, t1=e['until'], t1g=b['t0g'] + (e['until'] - b['t0']), p=dict(b.get('p', {}), fo=3.0))
        t0g, t1g = T(b['t0g']), T(b['t1g'])
        if t1g - t0g < 0.05: continue
        beds.append(dict(b, t0g=round(t0g, 4), t1g=round(t1g, 4), t0=round(t0g - start[b['seq']], 4), t1=round(t1g - start[b['seq']], 4)))
    cues, dropped = [], []
    for c in cs['cues']:
        if removed(c['tg']): dropped.append(f"{c['seq']}.{c['name']}@{c['tg']:.2f}"); continue
        tg = T(c['tg']); cues.append(dict(c, tg=round(tg, 4), t=round(tg - start[c['seq']], 4)))
    sil = [dict(x, t0g=round(T(x['t0g']), 4), t1g=round(T(x['t1g']), 4)) for x in cs['silences']]
    ducks = [dict(d, t0g=round(T(d['t0g']), 4), t1g=round(T(d['t1g']), 4)) for d in cs['ducks']]
    total = round(T(cs['total']), 4)
    out = dict(cs, total=total, seqs=seqs, beds=beds, cues=cues, silences=sil, ducks=ducks,
               meta={'cut': name, 'floor_from': round(T(4.5), 4), 'title_silence': [0.0, round(max(0.0, T(4.6)), 4)]})
    json.dump(out, open(os.path.join(base, 'cuesheet.json'), 'w'), indent=1)

    p2 = json.loads(json.dumps(plan))
    for c in p2['cues']: c['start_s'], c['end_s'] = round(T(c['start_s']), 4), round(T(c['end_s']), 4)
    p2['film_start'] = {k: round(T(v), 4) for k, v in plan['film_start'].items()}
    json.dump(p2, open(os.path.join(base, 'score_plan.json'), 'w'), indent=1)

    n_in = round(cs['total'] * FPS); keep = n_in - sum(b - a for a, b, _ in fr)
    json.dump({'source': 'out/autopilot_picture.mp4', 'fps': FPS, 'frames_in': n_in, 'frames_out': keep,
               'remove_frames': [[a, b, w] for a, b, w in fr]}, open(os.path.join(base, 'edl.json'), 'w'), indent=1)
    f = lambda t: f'{int(t // 60)}:{t % 60:04.1f}'
    print(f'{name}: {len(fr)} spans, {sum(b - a for a, b in spans):.2f} s removed; {f(cs["total"])} -> {f(total)} ({keep} frames)')
    print('  sequences: ' + ', '.join(f"{s['id']} {s['dur']:.1f}" for s in seqs))
    print(f'  dropped {len(dropped)} effects inside removed spans' + (': ' + ', '.join(dropped) if dropped else ''))

    if '--picture' in sys.argv:
        sel = '+'.join(f'between(n,{a},{b - 1})' for a, b, _ in fr)
        dst = os.path.join(base, 'picture.mp4')
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', os.path.join(ROOT, 'out', 'autopilot_picture.mp4'), '-an',
                        '-vf', f"select='not({sel})',setpts=N/({FPS}*TB)", '-r', str(FPS), '-c:v', 'libx264', '-preset', 'medium',
                        '-crf', '18', '-pix_fmt', 'yuv420p', dst], check=True)
        got = int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries',
                                  'stream=nb_read_packets', '-of', 'csv=p=0', dst], capture_output=True, text=True).stdout.strip())
        print(f'  picture: {got} frames ({"ok" if got == keep else "EXPECTED " + str(keep)}) -> {os.path.relpath(dst, ROOT)}')


if __name__ == '__main__':
    main()
