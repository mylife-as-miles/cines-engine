"""Write audio/cues_draft.json: Firstborn's beds and cues on the narration clock, drafted from design/SEQUENCES.md and
anchored to spoken words (audio/vo/words.json), so the mix can be built before the Engine's cue sheet exists.

  python3 tools/cues_draft.py          -> audio/cues_draft.json (the same shape as out/cuesheet.json)

The shape is the engine's cue-sheet dump (tools/cuesheet.js): {total, seqs:[{id,title,start,end}], beds:[{seq,name,t0,t1,p}],
cues:[{seq,name,t,x,word,p}], silences:[{seq,t0,t1}], ducks:[{seq,t0,t1,level}]}, in global seconds. tools/build_mix.py reads
out/cuesheet.json when it exists and this draft otherwise. Every time below is a phrase looked up in words.json near the time
SEQUENCES.md gives (so a re-timed take re-times the draft), plus an offset in seconds. Effects are few and quiet: one motif per
kind of picture event, the story's own sounds (the cry, the sneeze, the phone, the ka-ching, the gavel, the coins, the swoon)
in the pauses after their words. The music's variations and stop-downs are the sound map's timeline, not this file: here
the music is one bed per chapter.
"""
import json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = json.load(open(os.path.join(ROOT, 'audio', 'vo', 'words.json')))['words']
NORM = [re.sub(r"[^a-z0-9']", '', w['w'].lower()) for w in W]
NARR = os.path.join(ROOT, 'out', 'vo', 'narration.wav')
END = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', NARR]))  # 401.5 s
TOTAL = round(END + 8.0, 3)                           # the 8 s end screen: 409.5 s

SEQS = [('Q01', 'Born and hired'), ('Q02', 'Version 1.0'), ('Q03', 'Promoted at six'), ('Q04', 'The teenage years'),
        ('Q05', 'The first salary'), ('Q06', 'Management at 30'), ('Q07', 'The honest part'), ('Q08', 'One thing you can do'),
        ('Q09', 'Call your elder sibling'), ('END', 'End screen')]


def hit(phrase, near):
    p = [re.sub(r"[^a-z0-9']", '', x.lower()) for x in phrase.split()]
    hits = [i for i in range(len(W) - len(p) + 1) if NORM[i:i + len(p)] == p]
    if not hits: raise SystemExit(f'phrase not found: {phrase!r}')
    i = min(hits, key=lambda i: abs(W[i]['t0'] - near))
    if abs(W[i]['t0'] - near) > 4: raise SystemExit(f'{phrase!r} is at {W[i]["t0"]}, not near {near}')
    return i, len(p)


def at(phrase, near, off=0.0):
    """t0 of the first word of `phrase` (words.json, punctuation ignored), the occurrence nearest `near`, plus off"""
    i, _ = hit(phrase, near); return round(W[i]['t0'] + off, 3)


def end_of(phrase, near, off=0.0):
    """t1 of the last word of `phrase` plus off (Whisper's t1 runs a little late: cues with after_speech find the pause)"""
    i, n = hit(phrase, near); return round(W[i + n - 1]['t1'] + off, 3)


def last_word(phrase, near, off=0.0):
    """t0 of the last word of `phrase` plus off"""
    i, n = hit(phrase, near); return round(W[i + n - 1]['t0'] + off, 3)


def main():
    st = {'Q01': 0.0, 'Q02': at("So let's walk through", 24.3), 'Q03': at('Then a baby arrives', 74.9),
          'Q04': at('Now you are a teenager', 137.0), 'Q05': at('graduate', 196.8), 'Q06': at('By 30', 258.1),
          'Q07': at("Now let's be honest", 294.8), 'Q08': at('So here is something you can do', 342.7),
          'Q09': at('So that is your whole life', 365.9), 'END': round(END, 3)}
    order = [s[0] for s in SEQS]
    seqs = [{'id': sid, 'title': title, 'start': st[sid], 'end': (st[order[k + 1]] if k + 1 < len(order) else TOTAL)}
            for k, (sid, title) in enumerate(SEQS)]
    seq_of = lambda t: [s['id'] for s in seqs if s['start'] <= t + 1e-6][-1]

    # ---- beds: the music under every chapter (the sound map's timeline picks the variation), the party murmur ----
    beds = [{'seq': s['id'], 'name': 'music', 't0': s['start'], 't1': s['end'], 'p': {}} for s in seqs]
    beds.append({'seq': 'Q06', 'name': 'party_murmur', 't0': at('At every wedding', 263.3), 't1': at('Not if', 292.1), 'p': {}})

    # ---- effects: (name, time, x on screen or None, params) ----
    C = []
    def add(name, t, x=None, **p): C.append((name, round(t, 3), x, p))
    # chapter turns: one soft whoosh each (the sincere ones softer)
    for q in ('Q02', 'Q03', 'Q04', 'Q05', 'Q06', 'Q09'): add('whoosh', st[q] - 0.1)
    for q in ('Q07', 'Q08'): add('whoosh', st[q] - 0.1, gain_db=-4)
    # Q01 born and hired
    add('baby_cry', last_word('You have just been born', 1.0, 0.3), 0.45)        # the newborn in the cot
    add('pop', at('Welcome', 2.0))                                               # the tiny banner
    add('whoosh_2', at('hired', 8.4))                                            # the job-offer card slides in
    for ph, nr in (('No interview', 9.1), ('No contract', 10.3), ('No salary', 11.5), ('no resignation letter', 12.6)):
        add('stamp', last_word(ph, nr, 0.15))                                    # four items stamped out, one per phrase
    add('pop', at('first born', 18.6), 0.5)                                      # the badge pinned on the baby
    add('grow', at('career', 23.3))                                              # the ladder rises out of the cot
    # Q02 version 1.0
    add('footsteps', at('walk through', 25.0), 0.4, n=3, gap=0.42)               # the hero walks onto the life path
    add('wobble', at('no idea', 34.6))                                           # the young parents panicking
    add('sneeze', last_word('You sneeze once', 38.7), 0.5)                       # the baby sneezes
    add('run', at('They carry you to the hospital', 41.7), 0.55)                 # Dad with the huge bag, Mum running
    add('sneeze', last_word('sneezes the same sneeze', 46.9), 0.6, gain_db=-2)   # the little brother, the same sneeze
    add('notify', at('version', 50.3))                                           # the software-update screen
    add('pop', at('full of bugs', 51.6)); add('pop', at('full of bugs', 51.6, 0.3))   # bug icons
    add('typing', at('fixing you', 53.6), n=10)                                  # the parents typing at laptops
    add('card_land', at('Oh the rules', 57.9))                                   # the rules board
    add('pop', at('No sweets', 59.6)); add('pop', at('no biscuits', 60.4)); add('pop', at('bed at', 61.9))
    add('bulb', at('experiment', 69.7))                                          # the lab coats
    add('ding', at('stable release', 73.3))                                      # the shiny stable-release box
    # Q03 promoted at six
    add('baby_cry', last_word('Then a baby arrives', 74.9, 0.2), 0.4)            # Mum with the new baby
    add('swell', at('know the look', 78.5), gain_db=-2)                          # the look
    add('stamp_yes', at('promoted', 81.8))                                       # the promotion badge
    add('pop', at('Carry your sister', 82.9)); add('pop', at('Watch your brother', 84.0)); add('pop', at("Don't let him touch that", 85.1))
    add('baby_cry', last_word('If the small one cries', 93.2, 0.2), 0.4)   # the small one cries
    add('gavel', last_word('Judgment already passed', 102.9, 0.2), 0.5)          # the wooden spoon lands: tok-tok
    for ph, nr in (('First name', 107.7), ('Middle', 108.8), ('Surname', 109.5)):
        add('meter', last_word(ph, nr, 0.1))                                     # the meter rises with each name
    add('footsteps', at('You go', 117.0), 0.6, n=3, gap=0.38)                    # the salt errand
    add('coins', at('all of it', 120.6), 0.55)                                   # every coin handed over
    add('calculator', last_word('this family audits', 123.5, 0.3), 0.6, n=6)     # Dad with a calculator
    add('card_land', last_word('You are now a poster', 131.7))                   # the poster on the wall
    # Q04 the teenage years
    add('whoosh_2', at('They belong to the family', 141.1)); add('whoosh_2', at('They belong to the family', 141.1, 0.7))
    add('phone_ring', last_word('An auntie calls', 145.9), 0.3)                  # the auntie calls from another state
    add('pop', at('Doctor lawyer engineer', 155.9)); add('pop', last_word('Doctor lawyer', 155.9)); add('pop', last_word('Doctor lawyer engineer', 155.9))
    add('sting_1', last_word('is also doctor', 161.0, 0.3))                      # the fourth door: also doctor
    add('pop', last_word('something creative', 164.0), 0.4)                      # the paintbrush
    add('swoon', at('hold your mother', 168.3), 0.55)                            # Mum swoons into Dad's arms (in the stop-down)
    add('pop', at('Good for him', 180.4), 0.6, gain_db=-2)                       # the neighbour's boy asleep under his book
    add('pop', last_word('Your younger siblings are watching', 184.0), 0.3)
    add('pop', last_word('the whole queue behind you', 194.0), 0.5); add('pop', last_word('the whole queue behind you', 194.0, 0.22), 0.6)
    # Q05 the first salary
    add('pop', at('You get a job', 197.5))
    add('credit_alert', last_word('First salary alert', 198.8), 0.55)            # the bank-app notification
    add('ka_ching', last_word('You feel like a champion', 200.0), 0.55)
    add('phone_ring', last_word('Then the calls start', 205.6), 0.6)
    for ph, nr in (('School fees', 214.7), ('Rent', 215.9), ('A hospital bill', 216.5), ('Just a small thing', 217.7)):
        add('card_land', at(ph, nr, 0.1))                                        # the bills fly in
    add('stamp', last_word('the invoice is real', 222.5, 0.1))                   # the big invoice
    add('ka_ching', last_word('you are now the family bank', 227.5), 0.5)        # the bank counter
    for ph, nr in (('No interest', 230.2), ('no collateral', 231.0), ('no customer care', 232.4)): add('pop', at(ph, nr))
    add('card_land', last_word('paying my own rent', 235.0))                     # his own rent bill
    add('bulb', last_word('God will provide', 237.5, 0.2))                       # Mum's hands raised
    add('notify', last_word('keeps using your account', 241.0), 0.6)             # a transfer from his account
    # Q06 management at 30
    add('stamp_yes', last_word('You are now management', 261.0))                 # the new job badge
    add('whoosh_2', at('At every wedding', 263.3))                               # the party hall
    add('clang', last_word('who is handling the rice', 269.6, 0.1), 0.5)         # the giant pot of rice
    add('deflate', last_word('I came here to attend', 274.6))
    add('whoosh_2', at('only talk through you', 279.0), 0.35); add('whoosh_2', at('only talk through you', 279.0, 0.6), 0.65)
    add('gavel', last_word('you are the United Nations', 281.1), 0.5)            # the podium between the cousins
    add('swell', at('when are we eating your rice', 289.0), gain_db=-2)          # the aunties close in
    add('sting_2', at('When', 293.3))                                            # "Not if. When." (in the stop-down)
    # Q07 the honest part (sparse)
    add('button_click', at('Position not talent', 310.2))                        # the "first" spot lights
    add('grow', last_word('how to say it softly', 326.0), gain_db=-2)            # rough bubbles soften into hearts
    add('whoosh_2', at('often means we are afraid', 329.5), gain_db=-3)          # a bubble flips to its meaning
    add('whoosh_2', at('often means we are counting', 333.5), gain_db=-3)
    # Q08 one thing you can do
    add('pop', last_word('Pick one thing you carry', 345.3))
    for ph, nr in (('One bill', 347.7), ('one phone call', 348.9), ('one decision', 350.3)): add('pop', at(ph, nr), gain_db=-2)
    add('card_land', last_word('as a plan', 358.0))                              # the plan board
    add('card_land', last_word('give it a person', 360.6))                       # a sticky note with a sibling's face
    add('grow', last_word('waiting to be asked', 364.0))                         # hands go up
    # Q09 call your elder sibling
    for ph, nr in (('Born', 368.5), ('hired', 369.4), ('promoted', 370.0), ('never paid', 371.0)): add('card_land', at(ph, nr))
    add('notify', last_word('tell me in the comments', 374.0))                   # the comment bubble
    add('phone_ring', last_word('Call your elder sibling today', 391.0), 0.4, gain_db=-2)   # the sibling dials
    add('pop', at('See you in the next one', 400.3), 0.35)                       # a wave
    cues = []
    for n, t, x, p in sorted(C, key=lambda c: c[1]):
        k = min(range(len(W)), key=lambda i: abs(W[i]['t0'] - t))
        cues.append({'t': t, 'name': n, 'seq': seq_of(t), 'x': x, 'word': W[k]['w'], 'word_t': W[k]['t0'], 'p': p})
    sheet = {'about': 'audio/cues_draft.json, written by tools/cues_draft.py from design/SEQUENCES.md until the Engine writes out/cuesheet.json',
             'total': TOTAL, 'narration_end': W[-1]['t1'], 'seqs': seqs, 'beds': beds, 'cues': cues, 'silences': [], 'ducks': []}
    json.dump(sheet, open(os.path.join(ROOT, 'audio', 'cues_draft.json'), 'w'), indent=1)
    close = [(a['name'], a['t'], b['name'], b['t']) for a, b in zip(cues, cues[1:]) if b['t'] - a['t'] < 0.15]
    names = {}
    for c in cues: names[c['name']] = names.get(c['name'], 0) + 1
    print(f"{TOTAL} s, {len(seqs)} seqs, {len(beds)} beds, {len(cues)} cues -> audio/cues_draft.json")
    print('cues: ' + ' '.join(f'{k}({v})' for k, v in sorted(names.items())))
    if close: print('closer than 150 ms:', close)


if __name__ == '__main__':
    main()
