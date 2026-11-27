"""Copy each sound's chosen take to audio/sfx/<id>.flac (24-bit FLAC, lossless, as sound.md says), measure it, and write audio/sfx/INDEX.md + provenance.json.

Usage: python make_index.py ROOT PROJECT_DIR
"""
import sys, os, json, shutil, glob
from earshot import api

OVERRIDE = {'sfx_impact_low': 'synthD_0.wav', 'amb_evidence_room': 'es_recipe2.wav', 'amb_inspection_room': 'sa_1401_steady.wav', 'amb_hearing_room': 'es_recipe.wav', 'amb_baggage_belt': 'sa_1301_tamed.wav', 'amb_chicago_night': 'sa_1801_tamed.wav'}   # sid -> take name, when the ear-model's pick is not the one to use
OVERRIDE_WHY = {'sfx_impact_low': 'passes (z +3.15, 99 %), within 0.1 z of the top take, and its sub falls a fifth from A1 to D1, so the impact sits in the score\'s key',
                'amb_inspection_room': 'judgement: the passing take sa_1401 (z +3.36) holds two door-like thumps (1.0-4.5 s and 22.5-24 s, up to 21 dB over its median) that would repeat under the voice on every loop; they were patched with crossfaded copies of the same take\'s steady tone (8 s and 14 s). The steady loop rates plausible (z +2.62; tagger: rumble 0.69, hum 0.48, mains hum 0.23), the thumps had been carrying its small-room score',
                'amb_hearing_room': 'judgement: the Stable Audio takes were mostly knocks over near-silence (events up to 27 dB over the median, tagged timpani and drum); tamed, the rest read as music (0.47). This earshot recipe (room tone in a hall, five faint clothing rustles, two pages, one low creak) passes strong (z +3.17, 99 %), stays within 2.2 dB, and has no speech or music tags',
                'amb_baggage_belt': 'the passing take with its clacks over the median + 8 dB tamed by a slow gain rider (at most 7 dB): still strong (z +4.26, 93 %)',
                'amb_chicago_night': 'the passing take with one event at 0.75-1.25 s (10.5 dB over its median) tamed by a slow gain rider (at most 6.4 dB): still strong (z +3.58, 94 %)',
                'amb_evidence_room': 'judgement, not the ear-model: no take matches "almost silent" (beds are stored at -24 LUFS, so a near-silent room is heard turned up); the Stable Audio takes are a car-like rumble (tagger Rumble 0.82, Vehicle 0.28), wrong for a still room; the earshot room tone reads as quiet air conditioning, which is what the room should be 36 dB under the voice'}

LIC_ES = 'earshot render: free to use, commercial too, no credit (a new take of a public-domain recording)'
LIC_ES_RECIPE = 'earshot recipe of catalogue parts: free to use, commercial too, no credit (new takes of public-domain recordings)'
LIC_BANK = 'earshot sound bank: free to use, commercial too, no credit (made in code; fit/* sounds fitted from CC0 recordings)'
LIC_SYNTH = 'synthesised for this film (numpy, tools/synth.py): no third-party material'
LIC_SA = 'Stable Audio 3.0 Small SFX: Stability AI Community License (free under USD 1M annual revenue); credit Stable Audio'


def provenance(root, sid, take):
    base = take[:-4]
    if base.startswith('sa_'):
        seed = int(base[3:].split('_')[0])
        recs = [json.loads(l) for l in open(os.path.join(root, 'logs', 'sa_gen.jsonl'))]
        r = next((x for x in recs if x['id'] == sid and x['seed'] == seed and x['ok']), {})
        post = {'_tamed': '; events over the median + 8 dB tamed (tools/tame.py)', '_steady': '; two door-like thumps patched with crossfaded steady tone from the same take (tools/patch_steady.py)'}
        suffix = next((v for k, v in post.items() if base.endswith(k)), '')
        return ('Stable Audio 3.0 Small SFX (Q8_0 GGUF) through audio.cpp on CPU, 8 steps, CFG 1.0' + suffix,
                {'prompt': r.get('prompt'), 'seed': seed, 'duration_s': r.get('dur'), 'gen_seconds': r.get('seconds')}, LIC_SA)
    if base.startswith('synth'):
        fn = {'synth': 'first pass', 'synth2': 'tannoy2 (second pass)', 'synth3': 'tannoy2 with the chime at -16 dB', 'synthD': ''}[base.split('_')[0]]
        fn = 'impact_low_D: falling A1 -> D1 (36.7 Hz)' if base.startswith('synthD') else fn
        return (f'numpy synthesis, tools/synth.py ({fn}), take {base.split("_")[-1]}', {}, LIC_SYNTH)
    if base.startswith('bank_'):
        ids = {'bank_floss_lid': 'fit/click/floss_lid', 'bank_tink': 'click/tink', 'bank_switch_flip': 'fit/snap/switch_flip',
               'bank_impact_deep_D1': 'impact/deep --pitch D1', 'bank_pro_deep_D1': 'pro_impact/deep --pitch D1',
               'bank_m2': 'notify/m2', 'bank_m4': 'notify/m4'}
        return (f'earshot sfx render {ids.get(base, base)}', {}, LIC_BANK)
    if sid == 'amb_hearing_room' and 'recipe' in base:
        rec = json.load(open(os.path.join(root, 'recipes', 'hearing_room.json')))
        return ('earshot make --recipe recipes/hearing_room.json' + (' --seed 1' if base.endswith('1') else ''), {'recipe': rec}, LIC_ES_RECIPE)
    if base.startswith('es_rain'):
        rec = json.load(open(os.path.join(root, 'recipes', 'hk_street_rain.json')))
        return ('earshot make --recipe recipes/hk_street_rain.json' + (' --seed 1' if base.endswith('1') else ''), {'recipe': rec}, LIC_ES_RECIPE)
    if 'recipe' in base:
        rp = {'sfx_door_far': 'door_far.json', 'amb_rain_concrete': 'rain_concrete_wind.json', 'amb_chicago_night': 'chicago_glass.json',
              'amb_hk_street': 'hk_street.json', 'sfx_clock_tick': 'clock_wall.json', 'amb_terminal_hall': 'terminal_hall.json', 'amb_courtroom': 'courtroom.json', 'amb_evidence_room': 'evidence_room.json', 'amb_hearing_room': 'hearing_room.json'}.get(sid)
        rec = json.load(open(os.path.join(root, 'recipes', rp))) if rp else {}
        return (f'earshot make --recipe recipes/{rp}' + (' --seed ' + base[-1] if base[-1].isdigit() else ''), {'recipe': rec}, LIC_ES_RECIPE)
    if base.startswith('es'):
        return ('earshot make (catalogue design), ' + base, {}, LIC_ES)
    return ('?', {}, '?')


def main(root, proj):
    cat = json.load(open(os.path.join(root, 'sounds.json')))['sounds']
    chk = json.load(open(os.path.join(root, 'fin', 'check.json')))
    flog = json.load(open(os.path.join(root, 'fin', 'finish_log.json')))
    cues = json.load(open(os.path.join(proj, 'audio', 'cues.json')))
    out = os.path.join(proj, 'audio', 'sfx')
    os.makedirs(out, exist_ok=True)
    uses = {}
    for c in cues['cues']:
        uses.setdefault(os.path.splitext(os.path.basename(c['sound']))[0], []).append(f"{c['row']} @ {c['t']:.1f} s")
    for b in cues['beds']:
        uses.setdefault(os.path.splitext(os.path.basename(b['sound']))[0], []).append(f"{b['rows'][0]} {b['t0']:.0f}-{b['t1']:.0f} s")
    prov = {}
    rows = []
    for sid, spec in cat.items():
        e = chk.get(sid)
        if not e or 'pick' not in e:
            rows.append((sid, spec, None))
            continue
        pick = OVERRIDE.get(sid, e['pick'])
        src = os.path.join(root, 'fin', sid, pick)
        dst = os.path.join(out, sid + '.flac')
        import soundfile as sf
        x, sr = sf.read(src, always_2d=True)                # the finished takes are 48 kHz 24-bit: PCM_24 FLAC keeps every bit
        sf.write(dst, x, sr, subtype='PCM_24', format='FLAC')
        m = api.measure(dst, light=True)
        if (m.get('true_peak_dbtp') or -99) > -1.0:      # keep every file's true peak at or under -1 dBTP
            import soundfile as sf
            x, sr = sf.read(dst, always_2d=True)
            x *= 10 ** ((-1.05 - m['true_peak_dbtp']) / 20)
            sf.write(dst, x, sr, subtype='PCM_24', format='FLAC')
            m = api.measure(dst, light=True)
        how, extra, lic = provenance(root, sid, pick)
        t = e['takes'][pick]
        n_takes = len([k for k in e['takes'] if os.path.exists(os.path.join(root, 'fin', sid, k))])
        prov[sid] = {'file': f'audio/sfx/{sid}.flac', 'kind': spec['kind'], 'what': spec['what'], 'take': pick, 'made_by': how,
                     **extra, 'finish': flog.get(f'{sid}/{pick}', {}), 'licence': lic,
                     'earshot': {'check': spec['check'], 'alts': spec['alts'], 'z': t['z'], 'verdict': t['verdict'],
                                 'p_vs_alts': t['p_vs_alts'], 'alt_p': t['alts'], 'pass': t['pass'],
                                 'audioset': t['audioset'], 'speech_p': t['speech_p'], 'closest': t['closest']},
                     'pick_reason': OVERRIDE_WHY.get(sid, e['pick_reason']), 'takes_heard': n_takes,
                     'all_takes': {k: {'z': v['z'], 'verdict': v['verdict'], 'p_vs_alts': v['p_vs_alts'], 'pass': v['pass'], 'speech_p': v['speech_p']}
                                   for k, v in sorted(e['takes'].items()) if os.path.exists(os.path.join(root, 'fin', sid, k))},
                     'measure': {k: m.get(k) for k in ('duration', 'lufs', 'short_term_max_lufs', 'true_peak_dbtp', 'peak_dbfs', 'lra_lu', 'noise_floor_dbfs', 'brightness_hz')},
                     'used_at': uses.get(sid, [])}
        rows.append((sid, spec, prov[sid]))
    json.dump(prov, open(os.path.join(out, 'provenance.json'), 'w'), indent=1)
    return rows


if __name__ == '__main__':
    rows = main(sys.argv[1], sys.argv[2])
    for sid, spec, p in rows:
        if p:
            print(f"{sid}: {p['take']} z {p['earshot']['z']:+.2f} {p['earshot']['verdict']} pass {p['earshot']['pass']} "
                  f"{p['measure']['duration']} s {p['measure']['lufs']} LUFS TP {p['measure']['true_peak_dbtp']}")
        else:
            print(f'{sid}: NOT MADE YET')
