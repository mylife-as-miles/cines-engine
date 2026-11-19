#!/usr/bin/env python3
"""Number the screenplay's elements so beats, shots and prompts can cite them by id.

    python3 tools/parse_script.py            (from the production folder)

Reads design/screenplay.txt (pdftotext -layout of design/screenplay.pdf) and writes design/script.json:
a list of elements in order, each {id, kind, page, speaker?, paren?, text, words}. Ids: L01.. dialogue,
A01.. action and transitions. A speaker's line broken by a (beat) stays one L id; the parenthetical is kept.
Dialogue text is the screenplay's, joined across line breaks and never retyped.
"""
import json, os, re

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, 'design', 'screenplay.txt')
OUT = os.path.join(HERE, 'design', 'script.json')


def main():
    raw = open(SRC, encoding='utf-8').read()
    pages = raw.split('\f')[1:]                      # page 0 is the title page
    els, page_no = [], 0
    for p_i, page in enumerate(pages, start=1):
        lines = page.split('\n')
        blocks, cur = [], []
        for ln in lines:
            if re.fullmatch(r'\s*\d+\.\s*', ln):     # page number
                continue
            if ln.strip() == '':
                if cur: blocks.append(cur); cur = []
            else:
                cur.append(ln)
        if cur: blocks.append(cur)
        for b in blocks:
            ind = len(b[0]) - len(b[0].lstrip())
            first = b[0].strip()
            if ind >= 18 and re.fullmatch(r"[A-Z][A-Z .'()]+", first) and len(b) > 1:
                speaker = re.sub(r"\s*\((CONT'D|V\.O\.)\)", lambda m: ' (V.O.)' if 'V.O' in m.group(0) else '', first).strip()
                parts, paren = [], []
                for ln in b[1:]:
                    t = ln.strip()
                    if t.startswith('(') and t.endswith(')'):
                        if parts: parts.append(t)  # mid-line (beat)
                        else: paren.append(t)
                    else:
                        parts.append(t)
                els.append({'kind': 'line', 'page': p_i, 'speaker': speaker,
                            'paren': ' '.join(paren) or None, 'text': ' '.join(parts)})
            elif ind >= 40:                          # right-aligned transition
                els.append({'kind': 'action', 'page': p_i, 'text': ' '.join(x.strip() for x in b)})
            else:
                els.append({'kind': 'action', 'page': p_i, 'text': ' '.join(x.strip() for x in b)})
    nl = na = 0
    for e in els:
        if e['kind'] == 'line':
            nl += 1; e['id'] = f'L{nl:02d}'
            spoken = re.sub(r'\([^)]*\)', '', e['text'])
            e['words'] = len(re.findall(r"[A-Za-z0-9'’-]+", spoken))
        else:
            na += 1; e['id'] = f'A{na:02d}'
            e['words'] = len(e['text'].split())
    out = [{k: e[k] for k in ('id', 'kind', 'page', 'speaker', 'paren', 'text', 'words') if e.get(k) is not None} for e in els]
    json.dump(out, open(OUT, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print(f'{OUT}: {nl} lines, {na} action/transition elements')


if __name__ == '__main__':
    main()
