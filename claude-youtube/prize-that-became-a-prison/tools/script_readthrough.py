"""Write design/script/SCRIPT_V3_readthrough.md from SCRIPT_V3.md: only what the audience hears, chapter by chapter."""
import re
SRC, OUT = 'design/script/SCRIPT_V3.md', 'design/script/SCRIPT_V3_readthrough.md'
out = ['# The Prize That Became a Prison: script V3, read-through', '',
       'A plain read-through of `SCRIPT_V3.md`: only what the audience hears, chapter by chapter. NARRATOR is the narration; '
       'TIM HUNT / GENE HUNT (real recording) is a real recording, word for word from the clip. The full production script '
       '(picture, sources, sound, the fact-check ledger) is `SCRIPT_V3.md`. Regenerate with `python3 tools/script_readthrough.py`.', '']
chap = None
for line in open(SRC).read().split('\n'):
    m = re.match(r'^## (\d\d) · (.+)$', line)
    if m:
        out += ['', f'## {m.group(1)} · {m.group(2)}', '']; chap = m.group(1); continue
    if line.startswith('## '):
        chap = None; continue
    if chap is None or not line.startswith('|') or line.startswith('| ---') or line.startswith('| Time'):
        continue
    c = [x.strip() for x in line.strip().strip('|').split('|')]
    if len(c) < 4:
        continue
    t, narr, real = c[0], c[1], c[3]
    beat = re.match(r"^\*\(beat\)\*\s*\(([^)]*)\)", narr)
    n = re.sub(r"\*\((.*?)\)\*", '', narr).strip()
    if beat:
        out.append(f'**{t}** _(silence, {beat.group(1)})_')
    elif re.match(r'^\(\d+(\.\d+)? s\)$', n):
        out.append(f'**{t}** _(silence, {n.strip("()")})_')
    elif n and n not in ('—', '-'):
        out.append(f'**{t}** NARRATOR: {n}')
    for q in re.findall(r'\*\*"(.+?)"\*\*', real):
        who = 'GENE HUNT' if ('Gene' in real and ('IN-14' in real or 'Gene Hunt' in real.split(q)[-1][:160])) else 'TIM HUNT'
        out.append(f'**{t}** {who} (real recording): "{q}"')
    out.append('')
open(OUT, 'w').write(re.sub(r'\n{3,}', '\n\n', '\n'.join(out)))
print('wrote', OUT)
