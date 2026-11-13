"""Write audio/SCORE.md, the readable score plan, from audio/score_plan.json.
  python3 tools/score_doc.py
"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = json.load(open(os.path.join(ROOT, 'audio', 'score_plan.json')))
mmss = lambda t: f"{int(t // 60)}:{t % 60:04.1f}"
L = ['# The score', '',
     'This is the plan for the score, which Lyria 3.5 generates (`tools/lyria.py`). There is one prompt per cue, and every time is on the film\'s clock.', '',
     '## Sound world', '', P['palette'], '', '## Motifs', '']
L += [f"- **{m['name']}**: {m['description']} *Where it plays:* {m['where']}" for m in P['motifs']]
L += ['', '## Keys', '', P['key_map'], '', '## Arc', '', P['arc'], '',
      '## Kept synthesised', '', 'These are story devices rather than score, so they stay synthesised: ' + ', '.join(P['keep_synth']) + '.', '',
      '## Cues', '', '| Cue | Time | Role | What it does | Replaces |', '| --- | --- | --- | --- | --- |']
for c in P['cues']:
    L.append(f"| {c['id']} | {mmss(c['start_s'])} to {mmss(c['end_s'])} | {c['role']} | {c['why']} | {', '.join(c['replaces']) or '-'} |")
L += ['', '## Left unscored', '']
L += [f"- {mmss(u['start_s'])} to {mmss(u['end_s'])}: {u['why']}" for u in P['unscored']]
L += ['', '## Prompts', '']
for c in P['cues']:
    sp = '; '.join(f"{mmss(s['t_global'])} {s['event']}: {s['music']}" for s in c['sync_points'])
    L += [f"### {c['id']} ({c['seq']}, {mmss(c['start_s'])} to {mmss(c['end_s'])}, {c['model']})", '',
          '```', c['prompt'], '```', '',
          f"Fade in {c['fade_in_s']} s, fade out {c['fade_out_s']} s, level {c['level_db']} dB"
          + (f", filter: {c['source_filter']}" if c.get('source_filter') else '')
          + (f". It crosses holes at {', '.join(mmss(h) for h in c['holes_crossed'])}" if c['holes_crossed'] else '') + '.', '']
    if sp: L += [f"Sync points: {sp}.", '']
open(os.path.join(ROOT, 'audio', 'SCORE.md'), 'w').write('\n'.join(L) + '\n')
print(len(P['cues']), 'cues')
