"""Per-chapter lengths and pace of a voiced set, against SCRIPT_V2's targets.

    python pace_report.py LINES.json [--json out.json]

Chapter length = its lines plus every pause after them (the chapter's closing hold included). Pace is given two ways:
speech-only wpm (words / voiced seconds) and paced wpm (words / (voiced seconds + the ordinary 0.35 s gaps)), which
leaves out the designed beats and silences; the targets are checked on paced wpm.
"""
import json, sys

TARGET = {c: (150, 165) for c in ['00', '01', '02', '03', '04', '05', '06']}
TARGET.update({c: (120, 135) for c in ['07', '08', '09']})
GAP = 0.35


def stats(ls):
    speech = sum(l['duration'] for l in ls)
    pauses = sum(l['pause_after'] for l in ls)
    gaps = sum(l['pause_after'] for l in ls if l['pause_after'] == GAP and l is not ls[-1])
    words = sum(l['words'] for l in ls)
    return {'lines': len(ls), 'words': words, 'speech_s': round(speech, 2), 'pauses_s': round(pauses, 2),
            'length_s': round(speech + pauses, 2), 'wpm_speech': round(60 * words / speech, 1),
            'wpm_paced': round(60 * words / (speech + gaps), 1)}


def mmss(s):
    s = round(s, 1)
    return f'{int(s // 60)}:{s - 60 * int(s // 60):04.1f}'


def main():
    lines = json.load(open(sys.argv[1], encoding='utf-8'))
    chs = sorted({l['chapter'] for l in lines})
    rows, t = [], 0.0
    print(f"{'ch':3s} {'start':>7s} {'length':>7s} {'speech':>7s} {'words':>5s} {'wpm sp':>7s} {'wpm pace':>8s} {'target':>9s} {'speed':>5s}")
    for c in chs:
        ls = [l for l in lines if l['chapter'] == c]
        s = stats(ls); s['chapter'] = c; s['start'] = round(t, 2); s['speed'] = ls[0]['speed']
        lo, hi = TARGET[c]; s['target'] = [lo, hi]; s['in_target'] = lo <= s['wpm_paced'] <= hi
        rows.append(s)
        print(f"{c:3s} {mmss(t):>7s} {mmss(s['length_s']):>7s} {s['speech_s']:7.1f} {s['words']:5d} {s['wpm_speech']:7.1f} "
              f"{s['wpm_paced']:8.1f} {lo:>4d}-{hi:<4d} {s['speed']:5.2f}{'' if s['in_target'] else '  OFF'}")
        t += s['length_s']
    a = stats(lines)
    ex = stats([l for l in lines if TARGET[l['chapter']][0] == 150])
    end = stats([l for l in lines if TARGET[l['chapter']][0] == 120])
    print(f"total {mmss(a['length_s'])} ({a['length_s']} s), voiced {a['speech_s']} s, {a['words']} words; "
          f"paced wpm: exposition 00-06 {ex['wpm_paced']}, last three 07-09 {end['wpm_paced']}; "
          f"speech-only: {ex['wpm_speech']} / {end['wpm_speech']}")
    if '--json' in sys.argv:
        json.dump({'chapters': rows, 'total': a, 'exposition_00_06': ex, 'last_three_07_09': end},
                  open(sys.argv[sys.argv.index('--json') + 1], 'w'), indent=1)


if __name__ == '__main__':
    main()
