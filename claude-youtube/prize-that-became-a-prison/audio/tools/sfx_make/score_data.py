"""The score plan of The Prize That Became a Prison, as data: audio/score_plan.json and a Markdown fragment.

Nothing here generates music. Lyria 3.5 is paid (about USD 0.08 a generation, sound.md 7) and waits on the author's
explicit go. Times are SCRIPT_V2 script-clock seconds, keyed to chapter and direction row like audio/cues.json.

Usage: python score_data.py PROJECT_DIR OUT_MD_FRAGMENT
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plan_data import ROW, mmss  # noqa: E402

COST_PER_GEN = 0.08
TAIL = ' No drums, no vocals, no choir. In tune at A = 440.'

GENERATIONS = [
 {'id': 'G1', 'name': 'The pulse', 'model': 'lyria-3.5', 'planned': True,
  'prompt': 'An instrumental film-score cue, about 75 seconds, for the cold open of a serious investigative documentary. '
            'It begins from near silence with one very low sustained cello note on D, barely audible. After about twelve seconds '
            'a low, muted heartbeat pulse enters on D at 76 bpm: a soft felt-piano low note doubled by cello pizzicato, steady, '
            'close and dry. The pulse slowly gains weight; sustained low strings and a dark, airy synth pad join underneath in '
            'D minor, with a quiet rubbing E-flat above the D. It grows steadily tenser and fuller for its whole length, with no '
            'melody, and ends at its strongest. Restrained, modern, cinematic, cold. No risers and no hits.' + TAIL,
  'windows': 'SC00a from its first quiet 13 s; SC00b from where the pulse is steady (about 12-30 s of the take); SC00c from the last 21 s (the build); SC03b reuses its pulse.'},
 {'id': 'G2', 'name': 'The title', 'model': 'lyria-3.5', 'planned': True,
  'prompt': 'An instrumental film-score cue, about 60 seconds, for the title of a serious investigative documentary. A low pulse '
            'on D at 76 bpm (muted low piano and cello pizzicato) grows with sustained low strings, a dark synth pad and a slow, '
            'wide low brass swell in D minor, rising in one long crescendo to a single broad peak: a full sustained D minor chord, '
            'strings high, low brass under it. After the peak nothing new begins: the chord is held and decays naturally into a '
            'long, quiet, reverberant tail that fades to silence. Cinematic, cold, weighty, restrained rather than bombastic. '
            'No sound effects.' + TAIL,
  'windows': 'SC00d: earshot find the peak; place the peak on the title (1:37), keep the 10 s before it and the 4 s decay after.'},
 {'id': 'G3', 'name': 'The prize', 'model': 'lyria-3.5', 'planned': True,
  'prompt': 'An instrumental film-score cue, about 80 seconds, for a warm, tender passage of a documentary about an ordinary '
            'woman\'s life in Chicago before a trip abroad. A spare, intimate felt piano plays a simple four-note phrase in F major, '
            'A, C, F, E, gently repeated and varied, at about 66 bpm, with long pauses between phrases. Soft sustained strings '
            'enter quietly after about twenty seconds and add warmth. Light, hopeful, a little wistful, never sentimental; '
            'mezzo-piano at its warmest. No percussion.' + TAIL,
  'windows': 'SC01 whole; SC09c takes one clean ringing A from it (earshot find "a single soft piano note") for the last note of the film.'},
 {'id': 'G4', 'name': 'Eighteen days', 'model': 'lyria-3.5', 'planned': True,
  'prompt': 'An instrumental film-score cue, about 60 seconds, for a gentle travel passage in a documentary: days of sightseeing '
            'in a bright, rainy city, a train journey, everything paid for. A light, moving pad of soft strings and warm synth in '
            'F major with a Lydian brightness, and a delicate ticking pulse on top at 84 bpm: a soft, high, muted pizzicato like a '
            'clock, steady. The felt piano answers now and then with a four-note phrase, A, C, F, E. Light, curious, '
            'forward-moving, with a faint unease underneath.' + TAIL,
  'windows': 'SC02 whole.'},
 {'id': 'G5', 'name': 'The gift', 'model': 'lyria-3.5', 'planned': True,
  'prompt': 'An instrumental film-score cue, about 60 seconds, for a quiet, uneasy passage of a documentary: a woman is given a '
            'gift by people she trusts. A spare felt piano plays a four-note phrase, A, C, F, E, first over a warm F major chord, '
            'then the same notes over D minor, so the warmth turns cold. Very soft low sustained strings. The soft high tick of a '
            'muted pizzicato at 84 bpm returns and slowly moves lower and darker. Intimate, restrained, ambiguous.' + TAIL,
  'windows': 'SC03 whole (its last bars, low and dark, lead into the pulse at the baggage belt).'},
 {'id': 'G6', 'name': 'The pulse returns (optional)', 'model': 'lyria-3.5', 'planned': False,
  'prompt': 'An instrumental film-score cue, about 60 seconds, of steady tension for a documentary: a low, muted heartbeat pulse '
            'on D at 76 bpm, a soft felt-piano low note doubled by cello pizzicato, close and dry, with sustained low strings and a '
            'dark airy pad in D minor and a quiet rubbing E-flat. It holds the same tension for the whole length: no build, no '
            'melody, no ending.' + TAIL,
  'windows': 'Only if G1 has less than 45 s of steady pulse for SC03b.'},
 {'id': 'G7', 'name': 'Two meanings (optional)', 'model': 'lyria-3.5', 'planned': False,
  'prompt': 'An instrumental film-score cue, about 60 seconds, for a reflective, unsettled passage of a documentary in which two '
            'people use the same word and mean different things. Very sparse: a low sustained cello note on D with a soft E-flat '
            'held above it by violas, and single low felt-piano notes far apart. Pianissimo, beatless, cold, still.' + TAIL,
  'windows': 'Only if G8\'s opening is not sparse enough for SC04b.'},
 {'id': 'G8', 'name': 'The sentence', 'model': 'lyria-3.5', 'planned': True,
  'prompt': 'An instrumental film-score cue, about 75 seconds, for the gravest passage of a documentary: a verdict, a court, two '
            'families\' views of it. Low sustained strings in D minor, sparse and cold, with a slow low felt-piano line; heavy but '
            'quiet, pianissimo to piano. Over the last third the instruments drop out one by one until only one long, held, low '
            'note on A remains, played softly by the cellos, and then it fades.' + TAIL,
  'windows': 'SC06 whole (the held A for "the score thins to one held note"); SC04b from its sparse opening (about 20-55 s).'},
 {'id': 'G9', 'name': 'The wait', 'model': 'lyria-3.5', 'planned': True,
  'prompt': 'An instrumental film-score cue, about 80 seconds, for a slow, still passage of a documentary about years passing in '
            'prison and a family\'s long campaign. A spare felt piano in D minor plays single notes and the four-note phrase A, C, '
            'F, E slowly, with long silences between phrases, at about 56 bpm. Underneath, a very slow, soft low pulse on D, one '
            'note every two beats like a distant heartbeat, and a faint high string harmonic. Pianissimo throughout, patient, '
            'grave, without self-pity.' + TAIL,
  'windows': 'SC07 whole.'},
 {'id': 'G10', 'name': 'The father', 'model': 'lyria-3.5', 'planned': True,
  'prompt': 'An instrumental film-score cue, about 50 seconds, for a quiet passage of a documentary about an elderly father who '
            'waited many years for his daughter. A spare felt piano in B-flat major moving to D minor, tender and plain, at about '
            '54 bpm, with a soft sustained cello line underneath; the four-note phrase A, C, F, E played once, slowly. It ends on '
            'a single piano note left to ring out into silence. Pianissimo, warm and cold at once, never sentimental.' + TAIL,
  'windows': 'SC08 whole, its last note ringing out before "On January 25th".'},
 {'id': 'G11', 'name': 'When?', 'model': 'lyria-3.5', 'planned': True,
  'prompt': 'An instrumental film-score cue, about 60 seconds, for the final chapter of a documentary: a brother visits his '
            'sister, and she asks a question he cannot answer. A very spare felt piano in D minor, single notes and the four-note '
            'phrase A, C, F, E, slow, with long pauses, over a faint sustained low string pad. Pianissimo, still, grave and '
            'tender.' + TAIL,
  'windows': 'SC09a from its first 27 s; SC09b from a later 17 s.'},
 {'id': 'G12', 'name': 'The last note (optional)', 'model': 'lyria-3.5', 'planned': False,
  'prompt': 'An instrumental film-score cue, about 30 seconds: one soft felt-piano note, the A below middle C, played once and left '
            'to ring out for a long time in a quiet room, then a second, softer A, nothing else. Pianissimo, warm.' + TAIL,
  'windows': 'Only if G3 has no clean single A for SC09c.'},
]

# placements: (id, row_from, off_from, row_to, off_to, source, level re voice under voice, level in gaps, entry, exit, motif, key, tempo, purpose)
PL = [
 ('SC00a', '00.01', 2.0, '00.04', 0.0, 'G1', -24, -20, 'fade in from nothing over 6 s', 'joins SC00b', 'M1 THE PULSE (before it)', 'D minor', '-',
  'After 2 s with no music, a low D appears under the scale and the hall and rises slowly, so the film is already tense before anything is said to be wrong.'),
 ('SC00b', '00.04', 0.0, '00.07', 0.0, 'G1', -16, -12, 'the pulse enters under the tannoy (0:15)', 'HARD STOP on "Yes." (0:33)', 'M1 THE PULSE', 'D minor', '76 bpm',
  'The pulse starts when she is called and builds through the room; it stops dead on the first "Yes."'),
 ('SC00c', '00.09', 1.0, '00.12', 1.0, 'G1', -18, -12, 'from near silence after the 1 s drop (0:44)', 'CUT DEAD at "were not." (1:05)', 'M1 THE PULSE, M4 THE DRONE joins at 0:56', 'D minor', '76 bpm',
  'The linings, the prize, the drone under the void: building to "The luggage was hers. The drugs, she said, were not." and cut dead.'),
 ('SC00d', '00.15', 5.5, '00.17', 4.0, 'G2', -14, 0, 'from nothing after the near silence (1:26.5)', 'the peak lands on the TITLE (1:37), decays to silence over 4 s', 'M1 into the title chord', 'D minor', '76 bpm',
  'The flash-forward: no voice, the film\'s first peak on the title, then silence; cut on the silence to Ch 01. Carried over the montage, not cut to its beat.'),
 ('SC01', '01.01', 0.5, '01.08', 5.5, 'G3', -18, -14, 'fades in under the Chicago wide over 3 s', 'decays before the 1.5 s silence (3:03.5)', 'M2 THE PRIZE', 'F major', '66 bpm',
  'The warmth before: who she was, the sweepstakes, the email, the tickets. The motif is planted here.'),
 ('SC02', '02.01', 1.0, '02.06', 7.0, 'G4', -17, -13, 'fades in under the cabin over 4 s', 'drops out on "one more gift" (3:57)', 'M3 THE TICK, M2 answers', 'F major (Lydian)', '84 bpm',
  'Eighteen days in motion: the tick that will become the gate.'),
 ('SC03', '03.01', 1.0, '03.05', 0.5, 'G5', -19, -15, 'fades in under the hotel room over 4 s', 'out at 4:38.5 for the drop before "Overweight."', 'M2 turns minor, M3 darkens', 'F major -> D minor', '84 bpm',
  'The gift. The same four notes over a new bass: the warmth turns cold, as YES will mean two things.'),
 ('SC03b', '03.06', 0.0, '04.04', 4.0, 'G1', -18, -14, 'fades in fast (2 s) under the baggage belt', 'stop-downs before each "Yes"; HARD STOP at the discovery (5:31)', 'M1 THE PULSE returns', 'D minor', '76 bpm',
  'The pulse returns at the belt and runs through the gate and the room to the discovery.'),
 ('SC04b', '04.06', 1.0, '04.08', 10.0, 'G8', -24, -20, 'very quiet, under "The same room. The same bags." (5:46)', 'ends at "The case was only beginning" (6:18)', 'M5 THE HELD NOTE (low D, E-flat above)', 'D minor', 'beatless',
  'Two meanings, and the doubt over the flight: cold and still under the route map.'),
 ('SC06', '06.02', 5.0, '06.07', 0.5, 'G8', -20, -16, 'enters after the impact rings out (7:35)', 'thins to one held A at the divide (8:15), out before "Deceived." (8:33.5)', 'M5 THE HELD NOTE', 'D minor', 'beatless',
  'The sentence, the ministry, the family: grave and spare, thinning to one note.'),
 ('SC07', '07.01', 2.0, '07.07', 11.5, 'G9', -22, -18, 'fades in under the rain over 5 s', 'ends before the 1.5 s silence (10:07.5)', 'M2 fragments, M1 at half speed', 'D minor', '56 bpm',
  'The wait: years, illness, letters, hearings. Spare piano; the slow pulse under the cell pull-back.'),
 ('SC08', '08.01', 1.0, '08.03', 2.5, 'G10', -22, -18, 'fades in under the cold dining room over 4 s', 'its last note rings out before "On January 25th" (10:40.5)', 'M2 once, slowly', 'B-flat major -> D minor', '54 bpm',
  'The father. Then nothing: the total silence belongs to the empty chair.'),
 ('SC09a', '09.01', 2.0, '09.03', 0.5, 'G11', -23, -19, 'fades in under the gate in the rain over 4 s', 'HARD OUT at 11:38.5: silence under "When would she be released?"', 'M2 fragments', 'D minor', 'free, about 56 bpm',
  'Tim at the glass, the sister he barely recognises.'),
 ('SC09b', '09.04', 3.0, '09.07', 1.0, 'G11', -23, -19, 'fades in under the empty visiting room over 3 s', 'out before "It was hers." (12:09)', 'M2 fragments', 'D minor', 'free',
  'September 2026, the empty place, "Remember the question...". Out for "It was hers."'),
 ('SC09c', '09.09', 11.0, '09.10', 5.0, 'G3', -20, -16, 'one warm piano note A (the prize motif\'s first note) over THE DRONE as YES becomes WHEN? (12:43)', 'rings out under the end card; gone before the last 2 s of silence (12:53)', 'M2 its first note alone, over M4', 'open fifth D-A (no third: unresolved)', '-',
  'The one warm note: the motif\'s first note alone over the drone, neither major nor minor, because no one has an answer.'),
]

placements = []
for pid, ra, oa, rb, ob, src, lv, lg, entry, exit_, motif, key, tempo, why in PL:
    t0 = round(ROW[ra]['t0'] + oa, 2)
    t1 = round(ROW[rb]['t0'] + ob, 2)
    g = next(x for x in GENERATIONS if x['id'] == src)
    placements.append({'id': pid, 'chapter': ROW[ra]['chapter'], 'rows': [ra, rb], 'start_s': t0, 'end_s': t1,
                       'start_anchor': {'row': ra, 'offset_s': oa}, 'end_anchor': {'row': rb, 'offset_s': ob},
                       'source': src, 'model': g['model'], 'prompt': g['prompt'],
                       'level_db': lv, 'level_re_voice_db_under_voice': lv, 'level_re_voice_db_in_gaps': lg,
                       'entry': entry, 'exit': exit_, 'motif': motif, 'key': key, 'tempo': tempo, 'why': why})

planned = [g for g in GENERATIONS if g['planned']]
optional = [g for g in GENERATIONS if not g['planned']]
RETAKES = 6
cost = {
 'per_generation_usd': COST_PER_GEN,
 'planned_generations': len(planned), 'planned_usd': round(len(planned) * COST_PER_GEN, 2),
 'optional_generations': len(optional), 'retake_allowance': RETAKES,
 'ceiling_usd': round((len(planned) + len(optional) + RETAKES) * COST_PER_GEN, 2),
 'note': 'Lyria 3.5 at about USD 0.08 a generation (sound.md 7; the price is the house figure, not re-quoted today). '
         'Each generation returns about 60-90 s, so one take serves several placements. One take per generation; a '
         'retake only for a take that fails its check (mood, tuning, vocals or drums heard) or the author\'s ear.',
}

plan = {
 'palette': ('ONE PULSE, ONE PHRASE, ONE DRONE. A small, close, modern chamber score: felt-muted upright piano, low strings '
             '(cellos, violas; a few violins high and soft), cello pizzicato, a dark airy synth pad, and a slow low brass swell '
             'used once (the title). Three ideas carry the whole film. THE PULSE (M1): a low muted heartbeat on D at 76 bpm '
             '(felt piano low note doubled by cello pizzicato), the sound of the trap closing; it builds the cold open, stops dead '
             'on YES, returns at the baggage belt and stops at the discovery; in the wait it comes back at half speed, distant. '
             'THE PRIZE (M2): four felt-piano notes, A C F E, warm in F major in Chicago; the same four notes over D minor in '
             'chapter 3, when the gift turns cold, as YES means two things; fragments in the last chapters; and its first note '
             'alone at the very end. THE DRONE (M4): low D and A, the Void Stage, made locally as sound design so the exact same '
             'sound can return at the end. The travel tick (M3) is the pulse in disguise: a high, light 84 bpm tick in Hong Kong '
             'that moves lower and darker until it is the pulse at the belt ("a tick that becomes the gate"). '
             'RULES: no drums, no kit, no vocals, no choir, no risers, braams or hits in the score (the two low impacts are '
             'effects); entries come in from nothing under the end of the shot before and rise; exits are designed '
             '(the script\'s hard stops, or natural decay), never a fade under a line that matters; never cut to the beat; '
             'everything in tune at A = 440, measured and retuned within 5 cents; prompts name no sound effects, no drugs, no '
             'violence, no existing works.'),
 'motifs': [
  {'id': 'M1', 'name': 'THE PULSE', 'description': 'Low muted heartbeat on D, 76 bpm: felt-piano low D doubled by cello pizzicato, close and dry; low strings and a dark pad under it, a rubbing E-flat above.',
   'where': 'SC00a-c (cold open, stops dead on "Yes"), SC00d (into the title), SC03b (returns at the belt, stops at the discovery), SC07 (half speed, distant, under the cell pull-back).'},
  {'id': 'M2', 'name': 'THE PRIZE', 'description': 'Felt piano, four notes A C F E. Over F major: warm (Chicago, the win). Over D minor: the same notes, cold. Its first note alone, A, is the film\'s last note.',
   'where': 'SC01 (planted), SC02 (answers the tick), SC03 (turns minor), SC07, SC08, SC09a-b (fragments), SC09c (one note).'},
  {'id': 'M3', 'name': 'THE TICK', 'description': 'A soft, high, muted pizzicato tick at 84 bpm, like a clock or a train; moves lower and darker until it becomes the pulse.',
   'where': 'SC02, SC03 -> M1 at SC03b.'},
  {'id': 'M4', 'name': 'THE DRONE', 'description': 'Low D (73.4 Hz) with its fifth A, slow beating, dark air: the Void Stage. Sound design, made locally (audio/sfx/sd_void_drone.flac), not generated.',
   'where': '0:56 to "were not" (cut dead), 12:32 under YES -> WHEN? until the last note.'},
  {'id': 'M5', 'name': 'THE HELD NOTE', 'description': 'One long, soft, low string note: D with an E-flat above it (doubt), or A alone (the sentence thinning).',
   'where': 'SC04b, SC06.'},
 ],
 'key_map': ('Home key D minor (A = 440). Cold open: D minor, the pulse on D. Ch 01-02: F major, the relative major (warmth), with '
             'a Lydian lift in Hong Kong. Ch 03: F major turning to D minor under the same four notes. Ch 04: D minor, the pulse; '
             'after the discovery a low D with E-flat above. Ch 05: unscored (the clock is the score). Ch 06: D minor thinning to '
             'a held A. Ch 07: D minor, spare. Ch 08: B-flat major moving to D minor. Ch 09: D minor; the last note is A over the '
             'D drone: an open fifth with no third, neither major nor minor, unresolved. The drone (D2 73.42 Hz, A2 110 Hz) and '
             'the impacts (pitched to D1) sit in the same key.'),
 'arc': ('Cold open: from no music, a low D rises, the pulse builds, stops dead on YES; silence; it rebuilds to "were not" and '
         'is cut dead; impact, rain, near silence; the title builds from nothing to the film\'s first peak and decays to '
         'silence. Ch 01-02: warmth (piano, the prize), then light motion (the tick). Ch 03: the warmth turns; the pulse '
         'returns at the belt. Ch 04: the pulse to the discovery, hard stop, then a cold held note. Ch 05: no score, a clock. '
         'Ch 06: one low impact, grave strings thinning to one note, silence. Ch 07-09: spare piano, long holds, silence at '
         'the strongest lines; total silence for the empty chair; the drone returns and one warm note ends it.'),
 'intensity_targets': ('Loudest score: the title peak (about the voice\'s level, 0 dB re voice, in a stretch with no voice). '
                       'Under the voice: -14 (the pulse in the cold open) to -24 dB re voice (the last chapters). The mix '
                       'masters to -14 LUFS with an LRA of 7 LU or more: the quiet last four minutes are what make the range.'),
 'unscored': ('0:00-0:02; 0:33-0:44 (after "Yes", the second YES, the 1 s drop); 1:05-1:26.5 (the silence, the impact, the rain, '
              'the hearing room); 1:41-1:42.5; 3:03.5-3:06; 3:57-4:01; 4:38.5-4:46 (the drop and the beep); 5:31-5:46 (the '
              'discovery and its silence); 6:18-7:35 (end of Ch 04, all of Ch 05: the clock; the impact); 8:33.5-8:47 ("Deceived. '
              'And guilty anyway." and its silence); 10:07.5-10:11; 10:40.5-11:12 (Gene\'s death, the total silence, the void '
              'chair); 11:38.5-11:57 (the question); 12:09-12:43 ("It was hers.", the status line, the State Department line, '
              'the YES -> WHEN? opening over the drone alone); 12:53-12:55.'),
 'film_start': {ch: ROW[f'{ch}.01']['t0'] for ch in ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09']} | {'end': 775.0},
 'generator': 'lyria-3.5 through the Gemini Interactions API (claude-film/*/tools/lyria.py); about USD 0.08 a generation; SynthID-watermarked. NOT RUN: waiting on the author\'s go.',
 'status': 'PLAN ONLY. No score has been generated. Needs: the author\'s explicit go for the Lyria spend below, and a Gemini key (GEMINI_API_KEY, or a network secret for generativelanguage.googleapis.com).',
 'cost': cost,
 'checks_after_generation': ['earshot describe: music only (no vocal or drum tags), mood against the cue\'s purpose (score_check.py)',
                             'tuning measured against A = 440 and retuned within 5 cents (takes drift 0 to +36 cents)',
                             'earshot find to window each placement (Lyria ignores asked lengths and timestamps)',
                             'the pulse\'s tempo measured (76 bpm) so SC00b and SC03b match',
                             'loudness shape against the picture: the title peak within 0.2 s of the title frame'],
 'generations': GENERATIONS,
 'cues': placements,
}


def md(plan):
    L = ['### Placements on the clock\n', '| Cue | From | To | Ch · rows | Source | Motif | Key, tempo | dB re voice (under / gaps) | In | Out |',
         '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
    for c in plan['cues']:
        L.append(f"| **{c['id']}** | {mmss(c['start_s'])} | {mmss(c['end_s'])} | {c['chapter']} · {c['rows'][0]}-{c['rows'][1]} | {c['source']} | {c['motif']} | {c['key']}, {c['tempo']} | {c['level_re_voice_db_under_voice']} / {c['level_re_voice_db_in_gaps']} | {c['entry']} | {c['exit']} |")
    L.append('\n### Purpose of each placement\n')
    for c in plan['cues']:
        L.append(f"- **{c['id']}** ({mmss(c['start_s'])}-{mmss(c['end_s'])}): {c['why']}")
    L.append('\n### Generations (Lyria 3.5) and their ready prompts\n')
    for g in plan['generations']:
        tag = 'planned' if g['planned'] else 'optional'
        L.append(f"**{g['id']} · {g['name']}** ({tag}; USD {COST_PER_GEN:.2f}). Windows: {g['windows']}\n")
        L.append('```text\n' + g['prompt'] + '\n```\n')
    return '\n'.join(L) + '\n'


if __name__ == '__main__':
    proj, frag = sys.argv[1], sys.argv[2]
    json.dump(plan, open(os.path.join(proj, 'audio', 'score_plan.json'), 'w'), indent=1)
    open(frag, 'w').write(md(plan))
    tot = sum(c['end_s'] - c['start_s'] for c in placements)
    print(len(placements), 'placements;', len(GENERATIONS), 'generations;', f'scored {tot:.0f} s of 775 s ({tot / 775:.0%});', cost)
