"""Write audio/cues_draft.json: the soundtrack's beds and cues on the narration clock, drafted from design/SEQUENCES.md and
anchored to spoken words (audio/vo/words.json), so the mix can be built before the Engine's cue sheet exists.

  python3 tools/cues_draft.py          -> audio/cues_draft.json (the same shape as out/cuesheet.json)

The shape is the engine's cue-sheet dump (claude-film tools/cuesheet.js): {total, seqs:[{id,title,start,dur}],
beds:[{seq,name,t0,t1,t0g,t1g,p}], cues:[{seq,name,t,tg,p}], silences:[{seq,t0g,t1g}], ducks:[{seq,t0g,t1g,level}]}.
tools/build_mix.py reads out/cuesheet.json when it exists and this draft otherwise. Every time below is a phrase looked
up in words.json near the time SEQUENCES.md gives (so a re-timed take re-times the draft), plus an offset in seconds.
"""
import json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = json.load(open(os.path.join(ROOT, 'audio', 'vo', 'words.json')))['words']
NORM = [re.sub(r"[^a-z0-9']", '', w['w'].lower()) for w in W]
NARR = os.path.join(ROOT, 'out', 'vo', 'narration.wav')
END = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', NARR]))  # 217.5 s
TOTAL = round(END + 8.0, 3)                           # the 8 s end screen: 225.5 s

SEQS = [('Q01', 'Hook'), ('Q02', 'Monday: the boss'), ('Q03', 'Tuesday: a friend'), ('Q04', 'Wednesday: Mom'),
        ('Q05', 'Thursday: lunch'), ('Q06', 'Friday: a stranger'), ('Q07', 'Saturday: the real answer'), ('Q08', 'Sunday'),
        ('Q09', 'Why we say yes'), ('Q10', 'Try this instead'), ('Q11', 'So, what happens?'), ('END', 'End screen')]


def at(phrase, near, off=0.0):
    """t0 of the first word of `phrase` (words.json, punctuation ignored), the occurrence nearest `near`, plus off."""
    p = [re.sub(r"[^a-z0-9']", '', x.lower()) for x in phrase.split()]
    hits = [i for i in range(len(W) - len(p) + 1) if NORM[i:i + len(p)] == p]
    if not hits: raise SystemExit(f'phrase not found: {phrase!r}')
    i = min(hits, key=lambda i: abs(W[i]['t0'] - near))
    if abs(W[i]['t0'] - near) > 4: raise SystemExit(f'{phrase!r} is at {W[i]["t0"]}, not near {near}')
    return round(W[i]['t0'] + off, 3)


def end_of(phrase, near):
    p = phrase.split(); i0 = at(phrase, near)
    j = next(k for k, w in enumerate(W) if abs(w['t0'] - i0) < 1e-6)
    return round(W[j + len(p) - 1]['t1'], 3)


def main():
    # chapter starts: each on its first word (the day name), as SEQUENCES.md has them
    st = {'Q01': 0.0, 'Q02': at('Monday', 24.3), 'Q03': at('Tuesday', 45.8), 'Q04': at('Wednesday', 66.4),
          'Q05': at('Thursday', 89.3), 'Q06': at('Friday', 108.5), 'Q07': at('Saturday', 130.8), 'Q08': at('Sunday', 148.2),
          'Q09': at("Here's what I noticed", 159.4), 'Q10': at('So do not say no', 176.2), 'Q11': at('So what if you said', 198.4),
          'END': round(END, 3)}
    order = [s[0] for s in SEQS]
    seqs = [{'id': sid, 'title': title, 'start': st[sid], 'dur': round((st[order[k + 1]] if k + 1 < len(order) else TOTAL) - st[sid], 3)}
            for k, (sid, title) in enumerate(SEQS)]
    seq_of = lambda t: [s['id'] for s in seqs if s['start'] <= t + 1e-6][-1]

    # ---- music beds (audio/score_plan.json maps each name to a window of a take) ----
    stop0 = at('They look hurt', 113.9)                 # Friday's stop-down: the music drops out for "They look hurt.
    lift0 = at('So you run after them', 116.3)          # And you feel terrible." and the lift enters on the run
    beds = [('music_main', 0.0, st['Q03'], {'fi': 0.4, 'fo': 1.2}),
            ('music_hush', st['Q03'], st['Q04'], {'fi': 1.0, 'fo': 1.2}),          # Tuesday's guilt
            ('music_main', st['Q04'], stop0, {'fi': 1.0, 'fo': 0.5}),
            ('music_lift', lift0, st['Q07'], {'fi': 0.05, 'fo': 1.2}),              # Friday's photo
            ('music_main', st['Q07'], st['Q09'], {'fi': 1.0, 'fo': 1.0}),
            ('music_hush', st['Q09'], st['Q10'], {'fi': 1.0, 'fo': 1.0}),          # the insight
            ('music_lift', st['Q10'], st['Q11'], {'fi': 0.8, 'fo': 1.2}),          # the advice
            ('music_end', st['Q11'], TOTAL, {'fi': 1.0, 'fo': 0.0})]               # the wrap and the end screen
    bed_rows = []
    for name, a, b, p in beds:
        s = seq_of(a); s0 = next(x['start'] for x in seqs if x['id'] == s)
        bed_rows.append({'seq': s, 'name': name, 't0': round(a - s0, 3), 't1': round(b - s0, 3), 't0g': round(a, 3), 't1g': round(b, 3), 'p': p})

    # ---- effects: (name, time, params). Few and quiet; one motif per kind of picture event ----
    C = []
    add = lambda name, t, **p: C.append((name, round(t, 3), p))
    # day cards: one soft whoosh each (and the hook's wipe into Monday is the same whoosh)
    for q in ('Q02', 'Q03', 'Q04', 'Q05', 'Q06', 'Q07', 'Q08', 'Q11'): add('whoosh', st[q] - 0.1)
    # Q01 the hook
    add('pop', at('Staying late', 2.4)); add('pop', at('lending money', 3.8)); add('pop', at('going to the thing', 5.2))
    add('bulb', at('So here is the question', 11.7))
    add('whoosh_2', at('for seven days', 14.6))
    n0 = at('you say no to everyone', 16.0, 0.4)
    for k in range(7): add('stamp', n0 + 0.26 * k, gain_db=-2.0 * (k % 2))
    # Q02 Monday
    add('footsteps', at('Your boss walks over', 26.3), pan=0.35)
    add('pop', at('Normally', 30.0))
    add('footsteps', end_of('Then he says okay', 38.2), pan=0.35)
    add('pop', at('You prepared for war', 42.2, 0.3))
    # Q03 Tuesday
    add('phone_buzz', at('Your friend calls', 46.8))
    add('pop', at('That small pause', 52.3, 0.3))
    add('cloud', at('you still feel guilty', 61.0))
    # Q04 Wednesday (Mom)
    add('phone_buzz', at('Wednesday your mom calls', 66.4, 0.9))
    add('phone_buzz', at('Then she calls again', 76.6, 0.3))
    add('phone_buzz', at('And again', 78.2))
    add('notify', at('nine missed calls', 80.0))
    add('notify', at('Are you alive', 82.4))
    # Q05 Thursday
    add('door', at('a co -worker pops by', 89.9), pan=-0.3)
    add('footsteps', end_of('No. And the second', 93.5) - 1.0, pan=-0.3)
    add('pop', at('You wanted to go', 97.8))
    add('whoosh_2', at('Here is the problem', 102.3))
    s0 = at('You also say no to the things', 105.1)
    add('stamp', s0 + 0.2); add('stamp', s0 + 0.55)
    # Q06 Friday
    add('run', at('So you run after them', 116.3))
    add('camera_shutter', at('You take the photo', 117.9, 0.45))
    add('whoosh_2', at('Why', 122.0))
    add('pop', at('Same yes', 125.2)); add('pop', at('different reason', 126.0))
    # Q07 Saturday
    add('receive', at('need that report tonight', 132.5))
    add('pop', at('You do not say no', 134.1)); add('pop', at('You do not panic yes', 135.5))
    add('typing', at("You say I can't tonight", 137.3))
    add('send', at('I can send it first thing', 139.1, 1.6))
    add('receive', at('He says perfect', 141.1, 0.5))
    add('pop', at('That is the one that works', 143.2, 0.4)); add('pop', at('flat no', 145.5)); add('pop', at('A real answer', 146.5))
    add('ding', at('A real answer', 146.5, 0.35))
    # Q08 Sunday
    add('pop', at('A few people were annoyed', 151.1)); add('pop', at('annoyed', 152.0))
    add('pop', at('respected you more', 156.0))
    add('whoosh_2', at("Nobody's life ended", 157.6))
    # Q09 the insight
    add('bulb', st['Q09'])
    add('pop', at('Most of our yeses', 160.8))
    add('whoosh_2', at('They are fear', 163.1))
    add('cloud', at('That guilty feeling on Tuesday', 167.3))
    add('pop', at('changing a habit', 174.5))
    # Q10 the advice
    add('pop', at('when someone asks you', 181.0))
    add('pop', at('let me think and get back', 183.0))
    add('stamp', at('It gives you a pause', 187.5, 0.9), gain_db=-4)
    add('pop', at('Yes no or yes but', 191.4)); add('pop', at('no or yes but', 192.0)); add('pop', at('or yes but not like', 192.6, 0.3))
    add('ding', at('on purpose', 196.5))
    # Q11 the wrap
    add('pop', at('tired', 203.0)); add('pop', at('a little guilty', 203.9)); add('pop', at('a lot more honest', 205.0))
    add('notify', at('Now tell me in the comments', 206.0, 0.4))
    add('whoosh_2', at('I said no to food', 213.5))
    cues = [{'seq': seq_of(t), 'name': n, 't': round(t - next(x['start'] for x in seqs if x['id'] == seq_of(t)), 3), 'tg': t, 'p': p}
            for n, t, p in sorted(C, key=lambda c: c[1])]
    # Friday's stop-down: the music out under "They look hurt. And you feel terrible." (the voice alone)
    silences = []
    sheet = {'total': TOTAL, 'draft': 'audio/cues_draft.json, written by tools/cues_draft.py from design/SEQUENCES.md until '
             'the Engine writes out/cuesheet.json', 'seqs': seqs, 'beds': bed_rows, 'cues': cues, 'silences': silences, 'ducks': []}
    json.dump(sheet, open(os.path.join(ROOT, 'audio', 'cues_draft.json'), 'w'), indent=1)
    close = [(a['name'], a['tg'], b['name'], b['tg']) for a, b in zip(cues, cues[1:]) if b['tg'] - a['tg'] < 0.15]
    names = {}
    for c in cues: names[c['name']] = names.get(c['name'], 0) + 1
    print(f"{TOTAL} s, {len(seqs)} seqs, {len(bed_rows)} beds, {len(cues)} cues -> audio/cues_draft.json")
    print('cues: ' + ' '.join(f'{k}({v})' for k, v in sorted(names.items())))
    if close: print('closer than 150 ms:', close)


if __name__ == '__main__':
    main()
