#!/usr/bin/env python3
"""Bundle the film into one player page (artifact format: no doctype/html/head/body tags). The soundtrack is the
   mixed one_too_many.mp3 beside it (the same mix as the MP4); the page plays it as the clock.
   python3 tools/bundle.py [out.html]   -> out/player/one_too_many.html"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'out/player/one_too_many.html')
os.makedirs(os.path.dirname(out), exist_ok=True)
read = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
load = read('film/load.js')
seqs = re.search(r"FILM_SEQUENCES = \[(.*?)\]", load, re.S).group(1)
seqs = re.findall(r"'([^']+)'", seqs)
sets = re.findall(r"'([^']+)'", re.search(r"FILM_SETS = \[(.*?)\]", load, re.S).group(1))
js = ['kit/otm.js', 'kit/figures.js', 'kit/dialogue.js', 'film/script.js', 'film/engine.js', 'film/sound.js', 'film/rig.js'] + ['film/sets/%s.js' % s for s in sets] + ['film/seq/%s.js' % q for q in seqs]
missing = [p for p in js if not os.path.exists(os.path.join(ROOT, p))]
if missing: print('missing:', missing)
js = [p for p in js if p not in missing]
html = read('film/index.html')
style = re.search(r'<style>(.*?)</style>', html, re.S).group(1)
body = re.search(r'<main id="film">.*?</main>', html, re.S).group(0)
fonts = read('fonts/fonts.css')
parts = [
  '<title>One Too Many</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<style>' + fonts + '</style>',
  '<style>' + style + '\n  body { background: var(--ink); }</style>',
  body,
  '<script>window.SETS = window.SETS || {};</script>',
]
for p in js:
  src = read(p).replace('</script', '<\\/script')
  parts.append('<script>/* %s */\n%s\n</script>' % (p, src))
parts.append("<script>OTM.loadFonts(null).then(() => FILM.player({ poster: 51.3, audio: 'one_too_many.mp3' }));</script>")
open(out, 'w', encoding='utf-8').write('\n'.join(parts))
print('wrote', out, round(os.path.getsize(out) / 1e6, 2), 'MB,', len(js), 'scripts')
