"""Put the score plan's placements on the film's real clock (design/edit/EDL.json) -> audio/score/placements.json.

  python3 audio/tools/score/score_map.py

The plan (audio/score_plan.json) keys every placement to a SCRIPT_V2 direction row and an offset on the script
clock, as audio/tools/retime.py does for the cue sheet. The edit gives each row the start of its shot (ROW_SHOT
below: the EDL shot whose `row` is that direction row; the check asserts the shot's row text names the row's
picture). The row's start plus the plan's offset is the first answer (`row_time`). The edit runs at the scratch
narration's pace, 12:09 against the script's 12:55, and adds and moves shots, so an offset measured on the script
clock can land in the wrong word. Where the plan names the event a start or end belongs to (a word, a silence, a
cut), the time is taken from that event on the EDL clock instead: a voice segment (`voice`), a shot cut (`shots`) or
a word inside a voice take (WORDS: measured on the scratch takes with faster-whisper word times and the take's
envelope, seconds from the segment's start). Each placement records both, and why.
If the narration is re-cut, run tools/assemble.py time, then this, then score_place.py; if a line is re-voiced,
re-measure its entry in WORDS.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
ROW_SHOT = {  # direction row -> EDL shot, with a word its row text must contain
    '00.01': ('00-01', 'scale'), '00.04': ('00-06', 'seated_called'), '00.07': ('00-12', 'match'), '00.09': ('00-16', 'handbags'),
    '00.12': ('00-22', 'match'), '00.15': ('00-27', 'hearing_room'), '00.17': ('00-30', 'bags'), '01.01': ('01-01', 'chicago_night'),
    '01.08': ('01-15', 'departure_gate'), '02.01': ('02-01', 'aircraft_cabin'), '02.06': ('02-12', 'route map'),
    '03.01': ('03-01', 'accept'), '03.05': ('03-11', 'scale'), '03.06': ('03-16', 'baggage_belt'), '04.04': ('04-08', 'handbags'),
    '04.06': ('04-11', 'empty'), '04.08': ('04-19', 'detention_corridor'), '06.02': ('06-02', 'dawn_close'),
    '06.06': ('06-12', 'divide'), '06.07': ('06-14', 'Deceived'), '07.01': ('07-01', 'prison_exterior'), '07.07': ('07-10', 'bill page'),
    '08.01': ('08-01', 'dining'), '08.03': ('08-02', 'blinds'), '09.01': ('09-01', 'gate'), '09.03': ('09-04', 'glass'),
    '09.04': ('09-05', 'empty'), '09.07': ('09-09', 'hearing_room'), '09.09': ('09-17', 'match'), '09.10': ('09-18', 'held'),
}
# seconds from the voice segment's start, measured on audio/vo/scratch (faster-whisper small.en word times; ends from
# the take's 10 ms envelope, last frame within 40 dB of its peak)
WORDS = {
    '00.12 not. (end)': ('00.12', 3.130), '02.07 one (start)': ('02.07', 2.000),
    '04.03 Yes. (start)': ('04.03', 0.005), '04.03 Yes. (end)': ('04.03', 0.540),
    '04.05 Yes. (start)': ('04.05', 0.005), '04.05 Yes. (end)': ('04.05', 0.540),
    '04.07 linings. (end)': ('04.07', 2.640), '06.06 anyway. (end)': ('06.06', 12.590),
    '08.04 years. (end)': ('08.04', 6.440), '09.08 answer. (end)': ('09.08', 6.400), '09.14 asking. (end)': ('09.14', 1.880),
}
# per placement: start, end (and peak) as (kind, ref, offset); kinds: row (the plan's own anchor), shot, voice (start),
# voice_end, word. 'plan' is what the plan's anchor gives; the chosen event follows it where it differs.
CHOICE = {
    'SC00a': {'start': ('row', '00.01', 2.0), 'end': ('row', '00.04', 0.0),
              'why': 'both on their rows: after 2 s with no music; joins SC00b on the cut to seated_called (the tannoy).',
              'fade_in_s': 6.0, 'fade_out_s': 0.04, 'join_next': 'SC00b'},
    'SC00b': {'start': ('row', '00.04', 0.0), 'end': ('row', '00.07', 0.0),
              'why': 'the pulse enters on the cut to seated_called; hard stop on the frame where YES lands (the word "yes" is 32.30-32.56 on the scratch read, its tail to 32.79).',
              'fade_in_s': 0.04, 'fade_out_s': 0.012, 'hard_out': True},
    'SC00c': {'start': ('voice', '00.10', 0.0), 'end': ('word', '00.12 not. (end)', 0.0),
              'why': 'start at the end of the 1 s silence (the row gives 42.167, 12 ms off); CUT DEAD as "were not." ends (the row gives 62.917, inside "The luggage was hers").',
              'fade_in_s': 2.0, 'fade_out_s': 0.012, 'hard_out': True},
    'SC00d': {'start': ('voice_end', '00.sil3', 0.0), 'peak': ('row', '00.17', 0.0), 'end': ('row', '00.17', 4.0),
              'why': 'from nothing at the end of the near silence after "answer" (the row gives 81.542, inside it); the peak on the first frame of the title (shot 00-30); 4 s decay.',
              'fade_in_s': 6.0, 'fade_in_curve': 'db', 'fade_out_s': 4.0,
              'curve_why': 'the montage is 6.2 s on the EDL clock and any 6 s of the take rises only 1-2 dB: the entry is a 6 s crescendo from nothing (-40 dB to 0, linear in dB) into the peak'},
    'SC01': {'start': ('row', '01.01', 0.5), 'end': ('voice', '01.sil1', 0.0),
             'why': 'starts on its row (the Chicago wide); decays before the 1.5 s silence (the row gives 176.292: the edit added two shots after departure_gate window).',
             'fade_in_s': 3.0, 'fade_out_s': 2.5},
    'SC02': {'start': ('row', '02.01', 1.0), 'end': ('word', '02.07 one (start)', 0.0),
             'why': 'starts on its row (the cabin); drops out on "one more gift" (the row gives 226.750, a line early: the chapter now ends on the gift, shot 02-14).',
             'fade_in_s': 4.0, 'fade_out_s': 0.4},
    'SC03': {'start': ('row', '03.01', 1.0), 'end': ('row', '03.05', 0.0),
             'why': 'starts on its row (the hotel room); out on the cut to the matched scale, so the scale plays without music as at 0:00 and the drop comes before "Overweight." (the row + 0.5 s lands in "already know").',
             'fade_in_s': 4.0, 'fade_out_s': 1.0},
    'SC03b': {'start': ('row', '03.06', 0.0), 'end': ('word', '04.07 linings. (end)', 0.0),
              'why': 'the pulse returns on the baggage belt (its row); HARD STOP as "...inside the linings." ends (the row gives 311.833, after the silence).',
              'fade_in_s': 2.0, 'fade_out_s': 0.012, 'hard_out': True,
              'stop_downs': [{'from': ('word', '04.03 Yes. (start)', -0.6), 'to': ('word', '04.03 Yes. (end)', 0.0)},
                             {'from': ('word', '04.05 Yes. (start)', -0.6), 'to': ('word', '04.05 Yes. (end)', 0.0)}]},
    'SC04b': {'start': ('row', '04.06', 1.0), 'end': ('voice_end', '04.12', 0.0),
              'why': 'starts on its row, under "The same bags."; ends with "The case was only beginning." before the 1.5 s silence (the row gives 359.042, in chapter 5).',
              'fade_in_s': 3.0, 'fade_out_s': 1.5},
    'SC06': {'start': ('row', '06.02', 5.0), 'thin_by': ('row', '06.06', 0.0), 'end': ('voice', '06.07', -0.35),
             'why': 'enters as the impact (5.0 s, from 424.917) rings out; one held A by the divide; out in the breath before "Deceived." (the row gives 477.208, on the word).',
             'fade_in_s': 3.0, 'fade_out_s': 2.5},
    'SC07': {'start': ('row', '07.01', 2.0), 'end': ('voice', '07.sil1', 0.0),
             'why': 'starts on its row (the rain); ends before the 1.5 s silence (the row gives 545.417, twenty seconds early).',
             'fade_in_s': 5.0, 'fade_out_s': 2.0},
    'SC08': {'start': ('row', '08.01', 1.0), 'end': ('voice', '08.05', -0.35),
             'why': 'starts on its row (the cold dining room); its last note rings out by the end of "...lost ten years.", before "On January 25th" (the row gives 577.958: the date moved from the blinds to the chair).',
             'fade_in_s': 4.0, 'fade_out_s': 1.5},
    'SC09a': {'start': ('row', '09.01', 2.0), 'end': ('row', '09.03', 0.0),
              'why': 'starts on its row (the gate); HARD OUT on the cut to the glass hold (the row + 0.5 s would cut inside "But there was").',
              'fade_in_s': 4.0, 'fade_out_s': 0.012, 'hard_out': True},
    'SC09b': {'start': ('voice', '09.beat1', 0.0), 'end': ('shot', '09-10', 0.0),
              'why': 'enters in the beat after "Tim could not give her a date.", under the end of the empty room (the row gives 655.917, after that shot); out on the cut to void_stage dawn, whose sound is silence, before "It was never really his question. It was hers." (the row gives 670.708, under "Remember the question").',
              'fade_in_s': 3.0, 'fade_out_s': 0.6},
    'SC09c': {'start': ('shot', '09-18', 1.667), 'end': ('voice', '09.sil2', 0.0),
              'why': 'the A sounds as WHEN? has risen out of YES (shot 09-18: YES holds 0.9 s, the five letters rise over the next 0.77 s), after "asking." (the row gives 723.792, under "linked below"); rings out and is gone before the last 2 s of silence.',
              'fade_in_s': 0.005, 'fade_out_s': 1.0},
}


def main():
    E = json.load(open(os.path.join(ROOT, 'design', 'edit', 'EDL.json')))
    plan = json.load(open(os.path.join(ROOT, 'audio', 'score_plan.json')))
    sheet = json.load(open(os.path.join(ROOT, 'audio', 'cues.json')))
    S = {s['id']: s for s in E['shots']}; V = {v['id']: v for v in E['voice']}
    script_row = {r['id']: r for r in sheet['rows']}
    rows = {}
    for r, (sid, key) in ROW_SHOT.items():
        txt = S[sid].get('row', '') + ' ' + (S[sid].get('note') or '')
        assert key.lower() in txt.lower(), f'row {r}: shot {sid} does not read as "{key}": {txt[:80]}'
        rows[r] = {'shot': sid, 'edl_s': round(S[sid]['start'], 3), 'script_s': script_row[r]['t0'], 'picture': script_row[r]['picture']}

    def t(ref):
        kind, ref_id, off = ref
        if kind == 'row': base = S[ROW_SHOT[ref_id][0]]['start']
        elif kind == 'shot': base = S[ref_id]['start']
        elif kind == 'voice': base = V[ref_id]['start']
        elif kind == 'voice_end': base = V[ref_id]['end']
        elif kind == 'word': vid, w = WORDS[ref_id]; base = V[vid]['start'] + w
        else: raise ValueError(kind)
        return round(base + off, 3)

    out = []
    for c in plan['cues']:
        ch = CHOICE[c['id']]
        sa, ea = c['start_anchor'], c['end_anchor']
        p = {'id': c['id'], 'source': c['source'], 'chapter': c['chapter'], 'motif': c['motif'],
             'script': {'start_s': c['start_s'], 'end_s': c['end_s']},
             'row_time': {'start_s': t(('row', sa['row'], sa['offset_s'])), 'end_s': t(('row', ea['row'], ea['offset_s'])),
                          'start_row': rows[sa['row']], 'end_row': rows[ea['row']]},
             'start_s': t(ch['start']), 'end_s': t(ch['end']),
             'start_event': list(ch['start']), 'end_event': list(ch['end']), 'why': ch['why'],
             'level_under_voice_db': c['level_re_voice_db_under_voice'], 'level_in_gaps_db': c['level_re_voice_db_in_gaps'],
             'fade_in_s': ch['fade_in_s'], 'fade_out_s': ch['fade_out_s'], 'hard_out': ch.get('hard_out', False),
             'fade_in_curve': ch.get('fade_in_curve', 'cos'), 'fade_out_curve': ch.get('fade_out_curve', 'cos'),
             'entry': c['entry'], 'exit': c['exit']}
        if 'peak' in ch: p['peak_s'] = t(ch['peak'])
        if 'thin_by' in ch: p['thin_by_s'] = t(ch['thin_by'])
        if 'join_next' in ch: p['join_next'] = ch['join_next']
        if 'stop_downs' in ch: p['stop_downs'] = [{'from_s': t(s['from']), 'to_s': t(s['to'])} for s in ch['stop_downs']]
        p['span_s'] = round(p['end_s'] - p['start_s'], 3)
        out.append(p)
    speech = [[round(v['start'], 3), round(v['start'] + v['speech'], 3)] for v in E['voice'] if v.get('text') and v.get('speech')]
    res = {'about': __doc__.split('\n')[0], 'clock': 'design/edit/EDL.json (' + E['version'] + ', ' + E['timing'] + ')',
           'duration_s': E['duration'], 'fps': E['fps'], 'rows': rows, 'words': {k: list(v) for k, v in WORDS.items()},
           'speech': speech, 'placements': out}
    scored = sorted([(p['start_s'], p['end_s']) for p in out])
    res['unscored'] = [[round(a, 3), round(b, 3)] for a, b in zip([0.0] + [e for _, e in scored], [s for s, _ in scored] + [E['duration']]) if b - a > 0.001]
    res['scored_s'] = round(sum(e - s for s, e in scored), 2)
    json.dump(res, open(os.path.join(ROOT, 'audio', 'score', 'placements.json'), 'w'), indent=1)
    for p in out:
        d0, d1 = p['start_s'] - p['row_time']['start_s'], p['end_s'] - p['row_time']['end_s']
        print(f"{p['id']:6s} {p['source']:4s} {p['start_s']:8.3f} -> {p['end_s']:8.3f} ({p['span_s']:6.2f} s)  "
              f"row {p['row_time']['start_s']:8.3f} -> {p['row_time']['end_s']:8.3f}  moved {d0:+6.2f} / {d1:+6.2f}"
              + (f"  peak {p['peak_s']}" if 'peak_s' in p else ''))
    print(f"scored {res['scored_s']} s of {E['duration']} s ({100 * res['scored_s'] / E['duration']:.0f} %)")


if __name__ == '__main__':
    main()
