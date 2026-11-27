"""Re-time the sound plan to an edit.

Every cue, bed, silence and score placement in audio/cues.json and audio/score_plan.json is keyed to a direction
row of SCRIPT_V2 (chapter.row, e.g. "04.03") and an offset in seconds from that row's start. When the edit exists,
write the new start of each row (the frame its shot begins, in seconds) to a JSON map and run:

    python3 audio/tools/retime.py ROWS.json            # writes audio/cues.json and audio/score_plan.json in place
    python3 audio/tools/retime.py ROWS.json --dry-run  # prints what moves

ROWS.json: {"00.01": 0.0, "00.02": 4.2, ..., "end": 781.5}. Rows left out keep their old start shifted by the
same amount as the nearest earlier row given. An offset longer than the new row is kept (a sound that runs into
the next shot), but reported, so a person can check the word it was anchored to (each cue's `anchor`).
"""
import sys, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.dirname(HERE)


def main(rows_path, dry=False):
    new = json.load(open(rows_path))
    cues_p = os.path.join(AUDIO, 'cues.json')
    score_p = os.path.join(AUDIO, 'score_plan.json')
    sheet = json.load(open(cues_p))
    score = json.load(open(score_p))
    rows = sheet['rows']
    shift = 0.0
    for r in rows:
        if r['id'] in new:
            shift = float(new[r['id']]) - r['t0']
            r['t0'] = float(new[r['id']])
        else:
            r['t0'] = round(r['t0'] + shift, 3)
    end = float(new.get('end', rows[-1]['t1'] + shift))
    for a, b in zip(rows, rows[1:] + [None]):
        a['t1'] = b['t0'] if b else end
    R = {r['id']: r for r in rows}
    warn = []
    for c in sheet['cues']:
        old = c['t']
        c['t'] = round(R[c['row']]['t0'] + c['offset_s'], 3)
        if c['offset_s'] > R[c['row']]['t1'] - R[c['row']]['t0']:
            warn.append(f"cue {c['id']}: offset {c['offset_s']} s runs past its row ({c['anchor']})")
        if abs(c['t'] - old) > 1e-6 and dry:
            print(f"cue {c['id']}: {old} -> {c['t']}")
    for b in sheet['beds']:
        ra, rb = b['rows']
        b['t0'] = round(R[ra]['t0'] + b['offset_in_s'], 3)
        b['t1'] = round(R[rb]['t1'] + b['offset_out_s'], 3)
    for s in sheet['silences']:
        dur = s['t1'] - s['t0']
        s['t0'] = round(R[s['row']]['t0'] + s['offset_s'], 3)
        s['t1'] = round(s['t0'] + dur, 3)
    sheet['silence_ok'] = [[s['t0'], s['t1']] for s in sheet['silences'] if s['t1'] > s['t0']]
    sheet['duration_s'] = end
    sheet['cues'].sort(key=lambda c: c['t'])
    for a, b in zip(sheet['cues'], sheet['cues'][1:]):
        if b['t'] - a['t'] < 0.15:
            warn.append(f"cues {a['id']} and {b['id']} are {b['t'] - a['t']:.3f} s apart (rule: never two within 150 ms)")
    for p in score['cues']:
        sa, ea = p['start_anchor'], p['end_anchor']
        p['start_s'] = round(R[sa['row']]['t0'] + sa['offset_s'], 3)
        p['end_s'] = round(R[ea['row']]['t0'] + ea['offset_s'], 3)
    score['film_start'] = {ch: R[f'{ch}.01']['t0'] for ch in score['film_start'] if ch != 'end'} | {'end': end}
    for w in warn:
        print('CHECK:', w)
    if not dry:
        json.dump(sheet, open(cues_p, 'w'), indent=1)
        json.dump(score, open(score_p, 'w'), indent=1)
        print(f'retimed {len(sheet["cues"])} cues, {len(sheet["beds"])} bed spans, {len(sheet["silences"])} silences, '
              f'{len(score["cues"])} score placements; film {end:.2f} s')


if __name__ == '__main__':
    main(sys.argv[1], '--dry-run' in sys.argv)
