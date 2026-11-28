"""Re-time the sound plan to an edit.

Every cue, bed, silence and score placement in audio/cues.json and audio/score_plan.json is keyed to a direction
row of SCRIPT_V2 (chapter.row, e.g. "04.03") and an offset in seconds from that row's start.

Two ways to move them:

1. From the edit's own list (the way the edit is re-timed now):

    python3 audio/tools/retime.py --edl design/edit/EDL.json audio/edit_rows.json            # writes audio/cues.json
    python3 audio/tools/retime.py --edl design/edit/EDL.json audio/edit_rows.json --dry-run  # prints what moves
    python3 audio/tools/retime.py --edl design/edit/EDL.json audio/edit_rows.json --score    # audio/score_plan.json too

   audio/edit_rows.json maps each row to the shots that carry it ({"00.03": ["00-03", "00-05"], ...}): the row
   starts on its first shot and ends with its last. Every item that carries an `edl` anchor (audio/tools/edl_anchor.py:
   a shot, a narration segment or a word) is placed by it, so it follows its picture or its words exactly; an item
   with none falls back to its row's new start plus its offset. The sheet's duration becomes the EDL's. The score plan
   is left alone unless --score is given (another session owns the score): its placements then move by their rows.

2. From a plain map of row starts (the first version of this tool):

    python3 audio/tools/retime.py ROWS.json            # writes audio/cues.json and audio/score_plan.json in place
    python3 audio/tools/retime.py ROWS.json --dry-run  # prints what moves

   ROWS.json: {"00.01": 0.0, "00.02": 4.2, ..., "end": 781.5}. Rows left out keep their old start shifted by the
   same amount as the nearest earlier row given. An offset longer than the new row is kept (a sound that runs into
   the next shot), but reported, so a person can check the word it was anchored to (each cue's `anchor`).

Either way: two cues within 150 ms are reported (the plan's rule), except the events of one gesture (`group`, such as
the keys of one typed search).
"""
import sys, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.dirname(HERE)
sys.path.insert(0, HERE)


def _check_spacing(cues, warn):
    cs = [c for c in sorted(cues, key=lambda c: c['t']) if not c.get('mute')]
    for a, b in zip(cs, cs[1:]):
        if b['t'] - a['t'] < 0.15 and not (a.get('group') and a.get('group') == b.get('group')):
            warn.append(f"cues {a['id']} and {b['id']} are {b['t'] - a['t']:.3f} s apart (rule: never two within 150 ms)")


def from_rows(rows_path, dry=False):
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
    _check_spacing(sheet['cues'], warn)
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


def from_edl(edl_path, rows_path, dry=False, do_score=False):
    from edl_anchor import EDL
    E = EDL(edl_path)
    rowmap = {k: v for k, v in json.load(open(rows_path)).items() if not k.startswith('_')}
    cues_p = os.path.join(AUDIO, 'cues.json')
    score_p = os.path.join(AUDIO, 'score_plan.json')
    sheet = json.load(open(cues_p))
    warn, moved = [], []
    R = {}
    for r in sheet['rows']:
        span = rowmap.get(r['id'])
        if not span:
            warn.append(f"row {r['id']} has no shot in {os.path.basename(rows_path)}; it keeps {r['t0']}")
            R[r['id']] = r
            continue
        span = [span] if isinstance(span, str) else span
        r['t0'], r['t1'] = round(E.shot_start(span[0]), 3), round(E.shot_end(span[-1]), 3)
        r['shots'] = span
        R[r['id']] = r

    def place(item, key, anchor, fallback):
        old = item.get(key)
        new = E.resolve(anchor) if anchor else fallback
        item[key] = round(new, 3)
        if old is None or abs(item[key] - old) > 1e-6:
            moved.append((item['id'], key, old, item[key]))

    for c in sheet['cues']:
        a = (c.get('edl') or {})
        fb = R[c['row']]['t0'] + c.get('offset_s', 0.0) if c.get('row') in R else c['t']
        place(c, 't', a if a else None, fb)
    for b in sheet['beds']:
        a = b.get('edl') or {}
        ra, rb = b['rows']
        place(b, 't0', a.get('t0'), R[ra]['t0'] + b.get('offset_in_s', 0.0))
        place(b, 't1', a.get('t1'), R[rb]['t1'] + b.get('offset_out_s', 0.0))
        if b['t1'] <= b['t0']:
            warn.append(f"bed {b['id']} ends before it starts ({b['t0']} -> {b['t1']})")
    for s in sheet['silences']:
        a = s.get('edl') or {}
        dur = s['t1'] - s['t0']
        place(s, 't0', a.get('t0'), R[s['row']]['t0'] + s.get('offset_s', 0.0))
        place(s, 't1', a.get('t1') or a.get('t0'), s['t0'] + dur)
    end = E.duration
    sheet['duration_s'] = end
    sheet['clock'] = f'the edit\'s clock: {os.path.relpath(edl_path, os.path.dirname(AUDIO))} ({E.total_frames} frames at {E.fps} fps)'
    sheet['silence_ok'] = [[s['t0'], s['t1']] for s in sheet['silences'] if s['t1'] > s['t0']]
    sheet['cues'].sort(key=lambda c: c['t'])
    sheet['beds'].sort(key=lambda b: (b['t0'], b['id']))
    sheet['silences'].sort(key=lambda s: s['t0'])
    _check_spacing(sheet['cues'], warn)
    for x in sheet['cues'] + sheet['beds'] + sheet['silences']:
        for k in ('t', 't0', 't1'):
            if k in x and not (0 <= x[k] <= end + 1e-6):
                warn.append(f"{x['id']}.{k} = {x[k]} is outside the film (0 to {end})")
    if dry:
        for i, k, o, n in moved:
            print(f'{i}.{k}: {o} -> {n}')
    for w in warn:
        print('CHECK:', w)
    if do_score:
        score = json.load(open(score_p))
        for p in score['cues']:
            sa, ea = p['start_anchor'], p['end_anchor']
            p['start_s'] = round(R[sa['row']]['t0'] + sa['offset_s'], 3)
            p['end_s'] = round(R[ea['row']]['t0'] + ea['offset_s'], 3)
        score['film_start'] = {ch: R[f'{ch}.01']['t0'] for ch in score['film_start'] if ch != 'end'} | {'end': end}
        if not dry:
            json.dump(score, open(score_p, 'w'), indent=1)
    if not dry:
        json.dump(sheet, open(cues_p, 'w'), indent=1)
        print(f'retimed {len(sheet["cues"])} cues, {len(sheet["beds"])} bed spans, {len(sheet["silences"])} silences '
              f'onto {os.path.basename(edl_path)} ({len(moved)} times changed); film {end:.3f} s'
              + ('; score plan retimed by rows' if do_score else '; score plan left as it is (pass --score to move it)'))


if __name__ == '__main__':
    a = sys.argv[1:]
    dry = '--dry-run' in a
    if '--edl' in a:
        i = a.index('--edl')
        edl = a[i + 1]
        rest = [x for j, x in enumerate(a) if j not in (i, i + 1) and not x.startswith('--')]
        from_edl(edl, rest[0] if rest else os.path.join(AUDIO, 'edit_rows.json'), dry, '--score' in a)
    else:
        from_rows(a[0], dry)
