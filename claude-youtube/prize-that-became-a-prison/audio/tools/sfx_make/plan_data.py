"""The sound plan of The Prize That Became a Prison on SCRIPT_V2's clock, as data.

Writes audio/cues.json (the cue sheet, in the shape the house cue-sheet mixer reads, plus rows / beds / silences /
drops / drone keyed to chapter and direction row) and a Markdown fragment of tables for audio/SOUND_PLAN.md.
Every time is script-clock seconds. A cue's `t` = its row's `t0` + `offset_s`; re-time with audio/tools/retime.py.

Usage: python plan_data.py PROJECT_DIR OUT_MD_FRAGMENT
"""
import sys, json, os

def mmss(t):
    m, s = divmod(t, 60)
    return f'{int(m)}:{s:04.1f}' if abs(s - round(s)) > 1e-6 else f'{int(m)}:{int(round(s)):02d}'

# ------------------------------------------------------------------ the direction rows (chapter, row, start, picture)
ROWS = [
 ('00', 1, 0, 'checkin_hall scale'), ('00', 2, 4, 'checkin_hall shoulder'), ('00', 3, 9, 'checkin_hall wide'),
 ('00', 4, 15, 'departure_gate seated_called'), ('00', 5, 20, 'inspection_room enter, wide'),
 ('00', 6, 27, 'inspection_room two_shot, dawn_close'), ('00', 7, 33, 'inspection_room match (YES)'),
 ('00', 8, 37, 'inspection_room match (YES again)'), ('00', 9, 43, 'inspection_room handbags'),
 ('00', 10, 47, 'evidence_table purses (red trace)'), ('00', 11, 56, 'void_stage dawn'),
 ('00', 12, 64, 'inspection_room match -> void_stage bags'), ('00', 13, 70, 'void_stage dawn_high (DEATH SENTENCE / 2017)'),
 ('00', 14, 77, 'prison_exterior tower'), ('00', 15, 81, 'hearing_room wide -> witness'),
 ('00', 16, 87, 'montage (0.5-0.8 s a shot)'), ('00', 17, 97, 'void_stage bags in the beam (TITLE)'),
 ('01', 1, 102, 'chicago_night wide -> profile'), ('01', 2, 112, 'evidence_table motifs, entries'),
 ('01', 3, 124, 'home dining (warm; Gene, Tim)'), ('01', 4, 140, 'home kitchen -> kitchen_over (inbox)'),
 ('01', 5, 148, 'evidence_table screen: the email'), ('01', 6, 162, 'evidence_table screen: a search'),
 ('01', 7, 171, 'evidence_table tickets'), ('01', 8, 178, 'departure_gate window'),
 ('02', 1, 185, 'aircraft_cabin window, over'), ('02', 2, 194, 'hongkong_street wide, dawn'),
 ('02', 3, 204, 'hongkong_street company'), ('02', 4, 210, 'hotel_room window'), ('02', 5, 218, 'train seat, aisle'),
 ('02', 6, 230, 'route map: dashed line to Australia'),
 ('03', 1, 240, 'hotel_room accept'), ('03', 2, 250, 'leather_market wide, stall, purchase'),
 ('03', 3, 264, 'hotel_room pack'), ('03', 4, 270, 'evidence_table purses: the seam'),
 ('03', 5, 278, 'checkin_hall scale (matched)'), ('03', 6, 286, 'baggage_belt curtain, belt'),
 ('04', 1, 305, 'departure_gate seated_called (held)'), ('04', 2, 312, 'inspection_room enter, wide'),
 ('04', 3, 317, 'inspection_room match (YES, YES)'), ('04', 4, 327, 'inspection_room handbags (officer\'s hand)'),
 ('04', 5, 333, 'split frame: purses | handbags'), ('04', 6, 345, 'inspection_room empty'),
 ('04', 7, 352, 'route map: Australia / Qingdao'), ('04', 8, 368, 'detention_corridor corridor (2014)'),
 ('05', 1, 380, 'detention_corridor door, chair'), ('05', 2, 392, 'detention_corridor envelope_high'),
 ('05', 3, 402, 'void_stage pool (calendar 2014-2017)'), ('05', 4, 430, 'detention_corridor corridor, locked'),
 ('06', 1, 445, 'courtroom wide (2017)'), ('06', 2, 450, 'void_stage dawn_close (DEATH SENTENCE -> LIFE)'),
 ('06', 3, 468, 'courtroom dock'), ('06', 4, 475, 'courtroom bench'), ('06', 5, 482, 'evidence_table pair (ministry)'),
 ('06', 6, 495, 'void_stage divide'), ('06', 7, 513, 'void_stage dawn_close ("Deceived. And guilty anyway.")'),
 ('07', 1, 525, 'prison_exterior wall, gate'), ('07', 2, 535, 'visiting_room wide, glass'),
 ('07', 3, 555, 'void_stage cell_far -> cell_floor'), ('07', 4, 570, 'tim_desk letters, lamp'),
 ('07', 5, 580, 'hearing_room wide, witness (SEPTEMBER 2024)'), ('07', 6, 588, 'evidence_table page (S1 lit)'),
 ('07', 7, 596, 'tim_desk bill page (MAY 2025)'),
 ('08', 1, 610, 'home dining, cold, Gene alone'), ('08', 2, 624, 'home chair, Gene in profile'),
 ('08', 3, 638, 'home blinds (JANUARY 25, 2026)'), ('08', 4, 648, 'home chair, empty'), ('08', 5, 656, 'void_stage chair'),
 ('09', 1, 670, 'prison_exterior gate (JULY 2026)'), ('09', 2, 678, 'visiting_room reverse'),
 ('09', 3, 698, 'visiting_room glass, locked, long hold'), ('09', 4, 708, 'visiting_room empty'),
 ('09', 5, 714, 'hearing_room witness (SEPTEMBER 2026)'), ('09', 6, 722, 'home chair, empty'),
 ('09', 7, 728, 'hearing_room wide (matched)'), ('09', 8, 734, 'void_stage dawn'),
 ('09', 9, 752, 'inspection_room match -> void_stage bags (YES -> WHEN?)'), ('09', 10, 768, 'void_stage bags held (end screen)'),
]
END = 775.0
CHAPTERS = {'00': ('Cold open: Overweight', 0), '01': ('The winner', 102), '02': ('Eighteen days', 185),
            '03': ('The gift', 240), '04': ('Yes', 305), '05': ('Three years', 380), '06': ('The sentence', 445),
            '07': ('The wait', 525), '08': ('The father', 610), '09': ('When?', 670)}

rows = []
for i, (ch, r, t0, pic) in enumerate(ROWS):
    t1 = ROWS[i + 1][2] if i + 1 < len(ROWS) else END
    rows.append({'id': f'{ch}.{r:02d}', 'chapter': ch, 't0': float(t0), 't1': float(t1), 'picture': pic})
ROW = {r['id']: r for r in rows}

def T(row, off):
    return round(ROW[row]['t0'] + off, 2)

SFX = 'audio/sfx/'

# ------------------------------------------------------------------ beds: (id, sound, [(row_from, row_to, off_in, off_out)], level re voice, fade in, fade out, note)
# spans are given by rows (from the first row's start + off_in to the last row's end + off_out)
BEDS = [
 ('terminal_hall', 'amb_terminal_hall', [('00.01', '00.04', 0, 0), ('01.08', '01.08', 0, -1.5), ('03.05', '03.05', 0, 0), ('04.01', '04.01', 0, 0)], -26, 0.3, 0.4,
  'Terminal room tone. Under the scale in 0:00-0:09, then up a little on the wide.'),
 ('checkin_belt', 'amb_checkin_belt', [('00.01', '00.02', 0, 0), ('03.05', '03.05', 0, 0)], -24, 0.05, 0.6, 'Belt motor on the scale shots.'),
 ('baggage_belt', 'amb_baggage_belt', [('03.06', '03.06', 0, 0)], -22, 0.3, 0.8, 'Belt rollers; the pulse returns over it.'),
 ('inspection_room', 'amb_inspection_room', [('00.05', '00.09', 0, 0), ('00.12', '00.12', 0, -5.0), ('04.02', '04.04', 0, -2.0), ('04.05', '04.06', 0, 0), ('09.09', '09.09', 0, -12.0)], -28, 0.2, 0.3,
  'The room. Out with the hard stop at the discovery (5:31); back after the silence, on the split frame (5:33). At 1:04 and 12:32 it vanishes with the room on the match cut to the void.'),
 ('fluorescent_hum', 'amb_fluorescent_hum', [('00.05', '00.09', 0, 0), ('00.12', '00.12', 0, -5.0), ('04.02', '04.04', 0, -2.0), ('04.05', '04.06', 0, 0), ('04.08', '05.02', 0, 0), ('05.04', '05.04', 0, 0)], -30, 0.3, 0.3,
  '50 Hz tubes (China). Under the inspection room at -30; the bed of the detention corridor.'),
 ('void_air', 'amb_void_air', [('00.11', '00.11', 0, 0), ('00.12', '00.13', 1.0, 0), ('00.17', '00.17', 0, 0), ('05.03', '05.03', 0, 0),
   ('06.02', '06.02', 0, 0), ('06.06', '06.07', 0, 0), ('07.03', '07.03', 0, 0), ('08.05', '08.05', 0, 0), ('09.08', '09.10', 0, -2.0)], -34, 0.5, 0.5,
  'The void\'s own air, barely there. In Ch 08 it is the "room tone" that returns after the total silence.'),
 ('rain_concrete', 'amb_rain_concrete', [('00.14', '00.14', 0, 0), ('07.01', '07.01', -1.0, 0), ('09.01', '09.01', -1.0, 0)], -24, 0.6, 0.8, 'Rain and wind at the prison.'),
 ('hearing_room', 'amb_hearing_room', [('00.15', '00.15', 0, 0), ('07.05', '07.05', 0, 0), ('09.05', '09.05', 0, 0), ('09.07', '09.07', 0, 0)], -30, 0.4, 0.4,
  'A large room, very quiet. At 1:25 it drops to near silence for 1 s after "answer".'),
 ('chicago_night', 'amb_chicago_night', [('01.01', '01.01', 0, 0)], -28, 1.0, 0.8, 'City through glass.'),
 ('home_room', 'amb_home_room', [('01.03', '01.04', 0, 0), ('07.04', '07.04', 0, 0), ('07.07', '07.07', 0, -2.0), ('08.01', '08.03', 0, 0), ('09.06', '09.06', 0, 0)], -32, 0.4, 0.0,
  'The house (and Tim\'s desk). In Ch 08 it cuts out with the clock on the cut to the empty chair (10:48).'),
 ('aircraft_cabin', 'amb_aircraft_cabin', [('02.01', '02.01', 0, 0)], -26, 0.5, 0.6, 'Engine hum.'),
 ('hk_street', 'amb_hk_street', [('02.02', '02.03', 0, 0)], -24, 0.4, 0.6, 'Street, trams, rain on awnings.'),
 ('hotel_room', 'amb_hotel_room', [('02.04', '02.04', 0, 0), ('03.01', '03.01', 0, 0), ('03.03', '03.03', 0, 0)], -30, 0.4, 0.5, 'Air conditioner, the city far below; "a soft room" in Ch 03.'),
 ('train', 'amb_train', [('02.05', '02.05', 0, 0)], -26, 0.4, 0.6, 'Rails.'),
 ('market', 'amb_market', [('03.02', '03.02', 0, 0)], -26, 0.4, 0.6, 'Market, no walla.'),
 ('courtroom', 'amb_courtroom', [('06.01', '06.01', 0, 0), ('06.03', '06.04', 0, 0)], -30, 0.3, 0.4, 'Room tone, no gavel.'),
 ('phone_line', 'amb_phone_line', [('07.02', '07.02', 0, 0), ('09.02', '09.02', 0, 0.5)], -30, 0.2, 0.05,
  'The handset line\'s hiss. In Ch 09 it cuts at 11:38.5: the silence under "When would she be released?".'),
 ('evidence_room', 'amb_evidence_room', [('00.10', '00.10', 0, 0), ('01.02', '01.02', 0, 0), ('01.05', '01.07', 0, 0), ('03.04', '03.04', 0, 0),
   ('06.05', '06.05', 0, 0), ('07.06', '07.06', 0, 0)], -36, 0.3, 0.3, 'The evidence table\'s near-silent room under paper.'),
 ('clock', 'sfx_clock_tick', [('01.03', '01.03', 0, 0), ('05.03', '05.04', 0, -6.8), ('08.01', '08.03', 0, 0)], -28, 0.0, 0.0,
  'A clock. Ch 05: very low (-32), it stops on "worse" (7:18.2): a hard stop between ticks, no fade. Ch 08: it stops dead on the cut to the empty chair (10:48).'),
 ('drone', 'sd_void_drone', [('00.11', '00.11', 0, 1.0), ('09.09', '09.09', 0, -2.0)], -24, 2.5, 0.0,
  'THE DRONE: in under void_stage dawn (0:56), cut dead with the score at "were not" (1:05); returns quietly at 12:32 under YES -> WHEN? and gives way to the one warm piano note (score SC09c), out by 12:46.'),
]
LEVEL_OVERRIDES = {('clock', 1): -32, ('void_air', 7): -30, ('drone', 1): -28}

beds = []
for bid, snd, spans, lvl, fin, fout, note in BEDS:
    for k, (ra, rb, oi, oo) in enumerate(spans):
        t0 = round(ROW[ra]['t0'] + oi, 2)
        t1 = round(ROW[rb]['t1'] + oo, 2)
        beds.append({'id': f'{bid}.{k}', 'sound': SFX + snd + '.flac', 'rows': [ra, rb], 'chapter': ROW[ra]['chapter'],
                     't0': t0, 't1': t1, 'offset_in_s': oi, 'offset_out_s': oo,
                     'level_re_voice_db': LEVEL_OVERRIDES.get((bid, k), lvl), 'fade_in_s': fin, 'fade_out_s': fout,
                     'loop': True, 'note': note if k == 0 else ''})

# ------------------------------------------------------------------ one-shot effects: (id, sound, row, offset, align, level re voice, weight, anchor, why)
FX = [
 ('scale_beep', 'sfx_scale_beep', '00.01', 0.6, 'start', -14, 'hero', 'the display settles on OVERWEIGHT', 'The film\'s first sound; paid off at 4:41.'),
 ('booklet', 'sfx_booklet_slide', '00.02', 0.6, 'peak', -18, 'support', 'her hand slides the booklet across', 'Paper on laminate.'),
 ('tannoy_far', 'sfx_tannoy_far', '00.03', 1.2, 'start', -24, 'support', 'the wide; behind "It\'s 2014, at an airport in China"', 'A far tannoy, no intelligible words.'),
 ('tannoy_near', 'sfx_tannoy_near', '00.04', 0.2, 'start', -21, 'support', 'her head lifts', 'The tannoy, closer: she is being called. The pulse starts under it.'),
 ('door_inspection', 'sfx_door_steel', '00.05', 0.5, 'peak', -15, 'hero', 'the door closes behind her', 'Door, steel.'),
 ('zip_tote', 'sfx_zip', '00.10', 1.0, 'start', -16, 'hero', 'the push in on the tote, before "sewn into the linings"', 'A dry, close zip.'),
 ('impact_sentence_open', 'sfx_impact_low', '00.13', 0.0, 'peak', -11, 'hero', '"...a court sentences her to death": on the cut to DEATH SENTENCE / 2017', 'One low impact (1 of 2 in the film).'),
 ('pencil_entries', 'sfx_pencil_paper', '01.02', 1.5, 'start', -20, 'support', '"liked to enter sweepstakes"', 'Pencils, paper.'),
 ('paper_entries', 'sfx_paper_handle', '01.02', 7.0, 'peak', -21, 'support', '"every entry was a small possibility"', 'Paper.'),
 ('mail_chime', 'sfx_mail_chime', '01.04', 3.5, 'start', -20, 'support', 'the message lands, after "What arrived in Dawn\'s inbox..."', 'One muted chime (an invented mail client).'),
 ('keys_search', 'sfx_keys_typing', '01.06', 0.8, 'start', -21, 'support', '"she looked the organizers up online"', 'Keys.'),
 ('paper_tickets', 'sfx_paper_handle', '01.07', 1.0, 'peak', -18, 'support', '"The tickets."', 'Paper.'),
 ('boarding_chime', 'sfx_boarding_chime', '01.08', 1.5, 'start', -22, 'support', 'the gate window', 'A boarding chime, far.'),
 ('shutter_market', 'sfx_shutter_roll', '03.02', 2.0, 'start', -22, 'support', 'the stall', 'Metal shutters.'),
 ('zip_pack_1', 'sfx_zip', '03.03', 1.0, 'start', -18, 'support', '"Dawn packed the handbags herself"', 'Zips.'),
 ('zip_pack_2', 'sfx_zip', '03.03', 4.0, 'start', -19, 'support', '"Both checked in her name"', 'Zips.'),
 ('seam_click', 'sfx_seam_click', '03.04', 6.5, 'peak', -16, 'hero', 'the red trace ends and the cut-away closes', 'A small metallic click as it closes.'),
 ('scale_beep_again', 'sfx_scale_beep', '03.05', 2.8, 'start', -14, 'hero', 'just before "Overweight."', 'The same beep as 0:00 (the same file, the same level).'),
 ('tannoy_muffled', 'sfx_tannoy_near', '04.01', 0.8, 'start', -23, 'support', 'the gate, held longer', 'The tannoy, muffled.'),
 ('door_inspection_again', 'sfx_door_steel', '04.02', 0.8, 'peak', -16, 'hero', '"she is led into a room"', 'Door.'),
 ('door_far', 'sfx_door_far', '04.08', 8.5, 'peak', -22, 'hero', 'under "The case was only beginning", before the 1.5 s silence', 'A door closes far down the corridor.'),
 ('paper_envelope', 'sfx_paper_handle', '05.02', 4.0, 'peak', -19, 'support', '"gave them the emails"', 'Paper.'),
 ('impact_sentence', 'sfx_impact_low', '06.02', 0.0, 'peak', -11, 'hero', '"A death sentence": on the cut to void_stage dawn_close', 'One low impact (2 of 2). Nothing at "life".'),
 ('paper_ministry', 'sfx_paper_handle', '06.05', 1.0, 'peak', -20, 'support', 'the sheet', 'Paper.'),
 ('pen_letters', 'sfx_pen_paper', '07.04', 1.0, 'start', -20, 'support', '"Tim wrote to officials and to lawyers"', 'Pen on paper.'),
 ('paper_testimony', 'sfx_paper_handle', '07.06', 1.0, 'peak', -20, 'support', 'the page, before the marker wipe', 'Paper.'),
]
cues = []
for cid, snd, row, off, align, lvl, weight, anchor, why in FX:
    cues.append({'id': f'{row}-{cid}', 't': T(row, off), 'sound': SFX + snd + '.flac', 'weight': weight, 'align': align,
                 'chapter': ROW[row]['chapter'], 'row': row, 'offset_s': off, 'anchor': anchor,
                 'level_re_voice_db': lvl, 'why': why})
cues.sort(key=lambda c: c['t'])
# spacing check: never two within 150 ms
for a, b in zip(cues, cues[1:]):
    assert b['t'] - a['t'] >= 0.15, (a['id'], b['id'])

# ------------------------------------------------------------------ silences and drops: (id, row, off_start, dur, what is out, why)
SIL = [
 ('no_music_open', '00.01', 0.0, 2.0, 'score', 'No music for 2 s: the belt, the beep and the hall only.'),
 ('after_yes', '00.07', 0.0, 11.0, 'score', 'The pulse stops dead on "Yes." (0:33) and stays out through the second YES; voice and room only.'),
 ('linings_drop', '00.09', 0.0, 1.0, 'score, effects', '(silence, 1 s) before "Inside the luggage...": room tone low.'),
 ('were_not', '00.12', 1.0, 1.5, 'score, drone, room', 'Score and drone cut dead at "were not." (1:05); 1.5 s of the void\'s air only, then "Three years later...".'),
 ('after_answer', '00.15', 4.0, 1.5, 'score', '1 s of near silence after "answer" (1:25): the hearing room drops to near silence (-40 re voice).'),
 ('title_decay', '00.17', 4.0, 1.0, 'all but the decaying score tail', 'The score decays to silence over 4 s; cut on the silence to Ch 01 (1:42).'),
 ('ch01_end', '01.08', 5.5, 1.5, 'score', '(silence, 1.5 s): the gate\'s room only.'),
 ('ch02_end', '02.06', 8.0, 1.5, 'score', 'The travel pad drops out on "one more gift" (3:57); 1 s of silence.'),
 ('fee_drop', '03.05', 0.5, 2.0, 'score', 'Drop before "Overweight." (4:38.5-4:40.5): belt and hall low; then the beep.'),
 ('yes_stop_1', '04.03', 2.4, 0.6, 'score (stop-down)', 'The pulse stops 0.6 s before the first "Yes" (5:20) and comes back after it.'),
 ('yes_stop_2', '04.03', 5.4, 0.6, 'score (stop-down)', 'The same before the second "Yes" (5:23).'),
 ('discovery', '04.04', 4.0, 2.0, 'score, beds', 'Hard stop on "...inside the linings." (5:31): the pulse and the room cut together; 1.5 s of silence (air floor only), then the room returns on the split frame (5:33).'),
 ('ch04_end', '04.08', 10.0, 2.0, 'score', '(silence, 1.5 s): the corridor hum only.'),
 ('clock_stop', '05.04', 8.2, 0.0, 'clock', 'The clock stops on "worse" (7:18.2), between ticks.'),
 ('ch05_end', '05.04', 11.0, 2.0, 'score', '(silence, 1.5 s): the corridor hum only.'),
 ('sentence_drop', '06.01', 2.5, 1.5, 'score', 'Drop before "A death sentence" (7:27.5-7:29): courtroom tone only.'),
 ('deceived_drop', '06.07', 0.5, 1.5, 'score', 'Drop before "Deceived." (8:33.5): the score has thinned out; the void\'s air only.'),
 ('deceived_after', '06.07', 7.0, 2.0, 'score', 'Silence, 2 s, after "And guilty anyway.", then cut.'),
 ('ch07_end', '07.07', 11.5, 1.5, 'score', '(silence, 1.5 s).'),
 ('gene_drop', '08.03', 2.5, 1.5, 'score', 'Drop before "On January 25th, 2026, Gene Hunt died." (10:40.5): the clock and the room only.'),
 ('gene_total', '08.04', 0.0, 6.5, 'everything but the air floor (score, room tone, clock)', 'TOTAL SILENCE on the cut to the empty chair (10:48): 2 s, "He never saw Dawn come home." over it, then 2 s more. The loudest moment of the film.'),
 ('gene_room_returns', '08.05', 0.0, 0.0, '-', 'Room tone (the void\'s air, -30 re voice) returns on the cut to void_stage chair (10:56).'),
 ('question', '09.03', 0.5, 9.5, 'score, phone line', 'Silence under "When would she be released?" (11:38.5-11:48): the line\'s hiss cuts out; the air floor only.'),
 ('hers_drop', '09.07', 1.0, 1.0, 'score', 'Drop before "It was hers." (12:09).'),
 ('hers_after', '09.07', 3.0, 2.0, 'score', '(silence, 2 s) after "It was hers."'),
 ('status_line', '09.08', 0.0, 18.0, 'score, effects', 'void_stage dawn: Silence. The status line and the State Department line over the void\'s air only.'),
 ('very_end', '09.10', 5.0, 2.0, 'everything but the air floor', 'Two seconds of silence at the very end.'),
]
silences = []
for sid, row, off, dur, out, why in SIL:
    t0 = T(row, off)
    silences.append({'id': sid, 'chapter': ROW[row]['chapter'], 'row': row, 'offset_s': off, 't0': t0, 't1': round(t0 + dur, 2),
                     'out': out, 'why': why})

drops = ['linings_drop', 'were_not', 'fee_drop', 'yes_stop_1', 'yes_stop_2', 'discovery', 'sentence_drop', 'deceived_drop',
         'gene_drop', 'gene_total', 'question', 'hers_drop']

sheet = {
 'film': 'The Prize That Became a Prison',
 'clock': 'SCRIPT_V2 script clock, seconds (design/script/SCRIPT_V2.md). Each cue carries its chapter, direction row and offset from the row start; when the edit is re-timed, set rows[].t0 from the cut and run audio/tools/retime.py.',
 'fps': 24, 'duration_s': END, 'energy': 'calm', 'lufs': -14, 'true_peak_dbtp': -1.0, 'lra_min_lu': 7,
 'voice_ref': 'level_re_voice_db is dB under the narration\'s short-term loudness while it speaks (about -14 LUFS in a -14 LUFS master). Effects sit -11 to -24 dB under the voice; beds -22 to -36; the mixer may lift a hero cue it would bury (weight: hero).',
 'room': {'decay_s': 0.6, 'wet_db': -18},
 'air_floor': {'lufs': -60, 'filter': 'noise LP 900 Hz / HP 60 Hz', 'note': 'Under the whole film, including the total silences, so nothing is digitally dead.'},
 'music': {'file': 'out/audio/score_bed.wav', 'start_s': 0, 'loop': False, 'fade_out_s': 0.05,
           'note': 'Built from audio/score_plan.json once the score exists (not generated: waiting on the author\'s go for Lyria).'},
 'voice': [],
 'voice_note': 'Filled from the narration takes (audio/vo/, another agent).',
 'duck_db': 9,
 'duck_note': 'Score ducks 9 dB under the voice where they compete; beds are already set under the voice and are not ducked. Stop-downs (silences with "stop-down") beat ducking at the YES lines.',
 'rows': rows,
 'beds': beds,
 'silence_ok': [[s['t0'], s['t1']] for s in silences if s['t1'] > s['t0']],
 'silences': silences,
 'drops_before_reveals': drops,
 'cues': cues,
}

def md(sheet):
    L = []
    L.append('### Effects (one-shots)\n')
    L.append('| Time | Ch · row | Picture | Sound | Align | dB re voice | Weight | On |')
    L.append('| --- | --- | --- | --- | --- | --- | --- | --- |')
    for c in sheet['cues']:
        L.append(f"| {mmss(c['t'])} | {c['chapter']} · {c['row']} | {ROW[c['row']]['picture']} | `{os.path.splitext(os.path.basename(c['sound']))[0]}` | {c['align']} | {c['level_re_voice_db']} | {c['weight']} | {c['anchor']} |")
    L.append('\n### Ambiences and beds\n')
    L.append('| From | To | Ch · rows | Bed | dB re voice | Fades | Note |')
    L.append('| --- | --- | --- | --- | --- | --- | --- |')
    for b in sorted(sheet['beds'], key=lambda b: b['t0']):
        L.append(f"| {mmss(b['t0'])} | {mmss(b['t1'])} | {b['chapter']} · {b['rows'][0]}-{b['rows'][1]} | `{os.path.splitext(os.path.basename(b['sound']))[0]}` | {b['level_re_voice_db']} | {b['fade_in_s']} / {b['fade_out_s']} s | {b['note']} |")
    L.append('\n### Silences and drops\n')
    L.append('| From | To | Ch · row | Out | Why |')
    L.append('| --- | --- | --- | --- | --- |')
    for s in sheet['silences']:
        L.append(f"| {mmss(s['t0'])} | {mmss(s['t1'])} | {s['chapter']} · {s['row']} | {s['out']} | {s['why']} |")
    return '\n'.join(L) + '\n'

if __name__ == '__main__':
    proj, frag = sys.argv[1], sys.argv[2]
    json.dump(sheet, open(os.path.join(proj, 'audio', 'cues.json'), 'w'), indent=1)
    open(frag, 'w').write(md(sheet))
    print(len(rows), 'rows,', len(beds), 'bed spans,', len(cues), 'cues,', len(silences), 'silences')
    # the 90 s drop rule
    ts = sorted(s['t0'] for s in silences if s['t1'] - s['t0'] >= 0.5)
    gaps = [b - a for a, b in zip([0] + ts, ts + [END])]
    print('longest gap between drops/silences:', max(gaps), 's')
