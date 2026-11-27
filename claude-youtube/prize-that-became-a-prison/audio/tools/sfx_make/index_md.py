"""Write audio/sfx/INDEX.md from audio/sfx/provenance.json (+ notes per sound in ROOT/index_notes.json).

Usage: python index_md.py ROOT PROJECT_DIR
"""
import sys, os, json

LIC_SHORT = {
 'earshot render': 'earshot (public-domain recording, new take): free, no credit',
 'earshot recipe': 'earshot recipe (public-domain recordings): free, no credit',
 'earshot sound bank': 'earshot bank (code; fit/* from CC0): free, no credit',
 'synthesised for this film': 'made here (numpy): no third-party material',
 'Stable Audio': 'Stability AI Community License: credit Stable Audio',
}


def lic_short(l):
    for k, v in LIC_SHORT.items():
        if l.startswith(k):
            return v
    return l


def status(p):
    e = p['earshot']
    if e['pass']:
        return 'done'
    if e['z'] >= 2.5:
        return 'done; ear check'
    return 'made; wants the ear'


def main(root, proj):
    prov = json.load(open(os.path.join(proj, 'audio', 'sfx', 'provenance.json')))
    cat = json.load(open(os.path.join(root, 'sounds.json')))['sounds']
    notes_p = os.path.join(root, 'index_notes.json')
    notes = json.load(open(notes_p)) if os.path.exists(notes_p) else {}
    L = ['# Sound effects and beds: index', '',
         'Every sound in `audio/sfx/`, made free and locally on 27 November 2026 for *The Prize That Became a Prison*:',
         'what it is, how it was made, what earshot heard, how it measures, and its licence. Where each is placed: `../cues.json`',
         '(and `../SOUND_PLAN.md`). The full record of every take heard, with prompts, seeds and recipes, is `provenance.json`;',
         'the tools and recipes that made them are in `../tools/sfx_make/` (raw takes are not kept in the project).',
         '',
         '**How they were made.** Two to three takes of each sound from up to three free sources: Stable Audio 3.0 Small SFX',
         '(Q8_0 GGUF, through audio.cpp on CPU, 8 steps, CFG 1.0), earshot (catalogue designs learned from public-domain',
         'recordings, recipes of them, and its coded sound bank), and numpy synthesis for sounds that are synthetic in life or',
         'designed (beeps, chimes, mains hum, a phone line, the drone, the impact). Each take finished as sound.md 3 says (48 kHz,',
         'onset trimmed, -1 dBFS peak and at most -1 dBTP, 0.15 s raised-cosine fade-out, 24-bit) or, for beds, made',
         'loop-ready (the last 2 s crossfaded equal-power into the head, so the file repeats with no seam) at -24 LUFS.',
         '',
         '**How they were checked.** earshot 1.0 `match` of each take against the sound\'s description and three or four',
         'realistic alternatives (z against about 320 vocabulary descriptions: 3 or more strong, 2.5-3 plausible, 2-2.5 weak),',
         'the AudioSet tagger\'s labels (any speech in a bed (0.20 or more) set the take aside), and `rank` across the takes. Pass rule',
         '(sound.md 4): the description beats every alternative in the forced choice with z >= 3, or holds 60 % of the choice',
         'and twice the best alternative. The pick is the passing take with the highest z; where none passes, the highest z.',
         'A fail is evidence, not a veto: several alternatives here are near-synonyms (a clock and a metronome, a phone line',
         'and radio static, a mail chime and a doorbell). **No take contains a voice or a word**: the tagger\'s speech score',
         'is listed for each pick.',
         '',
         '**Status.** *done*: passes. *done; ear check*: z 2.5 or more but an alternative won the forced choice. *made; wants',
         'the ear*: weak or no match; a person should listen, and a CC0 recording may replace it.',
         '']
    for kind, title in (('bed', 'Beds and ambiences (loop-ready)'), ('shot', 'Effects (one-shots)')):
        L += [f'## {title}', '',
              '| Sound | What | Made by | earshot | Speech | Measured | Licence | Status |',
              '| --- | --- | --- | --- | --- | --- | --- | --- |']
        for sid, spec in cat.items():
            if spec['kind'] != kind:
                continue
            p = prov.get(sid)
            if not p:
                L.append(f'| `{sid}` | {spec["what"]} | not made | | | | | **waiting** |')
                continue
            e = p['earshot']
            alts = sorted(e['alt_p'], key=lambda a: -a['p'])
            top_alt = f"{alts[0]['query']} {alts[0]['p']:.0%}" if alts else '-'
            made = p['made_by']
            if p.get('prompt'):
                made += f"; seed {p['seed']}: \"{p['prompt']}\""
            m = p['measure']
            loud = f"{m['lufs']} LUFS" if m.get('lufs') is not None else f"{m.get('short_term_max_lufs')} LUFS short-term max"
            meas = f"{m['duration']} s, {loud}, TP {m['true_peak_dbtp']} dBTP"
            ver = (f"'{e['check']}': z {e['z']:+.2f} {e['verdict']}; forced choice {e['p_vs_alts']:.0%} (best alternative: {top_alt}); "
                   f"tags {', '.join(e['audioset'][:2]) or '-'}; picked from {p['takes_heard']} takes")
            st = status(p)
            note = notes.get(sid)
            what = spec['what'] + (f' *{note}*' if note else '')
            L.append(f"| `{sid}.flac` | {what} | {made} | {ver} | {e['speech_p']:.2f} | {meas} | {lic_short(p['licence'])} | {st} |")
        L.append('')
    n_done = sum(1 for p in prov.values() if status(p) == 'done')
    n_ear = sum(1 for p in prov.values() if status(p) != 'done')
    n_wait = sum(1 for s in cat if s not in prov)
    L.insert(6, f'**{len(prov)} of {len(cat)} sounds made** ({n_done} pass earshot\'s rule, {n_ear} want a person\'s ear first); {n_wait} waiting.')
    L.insert(7, '')
    open(os.path.join(proj, 'audio', 'sfx', 'INDEX.md'), 'w').write('\n'.join(L) + '\n')
    print(f'{len(prov)} made, {n_done} done, {n_ear} ear, {n_wait} waiting')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
