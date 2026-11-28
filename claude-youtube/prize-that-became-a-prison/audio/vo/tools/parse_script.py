"""Parse the VOICE sections of SCRIPT_V2.md into spoken paragraphs with the pause that follows each.

    python parse_script.py SCRIPT_V2.md OUT.json

Rules (from the lead's brief): a paragraph is one line to voice; a paragraph that is only an italic direction in
parentheses is not spoken and sets the pause after the previous spoken paragraph: *(beat)* = 0.8 s, any
"N s" durations in it are summed (*(silence, 1.5 s)* = 1.5 s; the cold open's montage direction "a 10 s montage ...
silence, 5 s" = 15 s); 0.35 s between ordinary paragraphs. A direction prefixed to spoken text (chapter 9's
"*(the end card; voice, quiet)* The testimony...") is kept as that line's delivery note, not spoken. The last line of
the film is followed by 2 s (the direction table: "Two seconds of silence at the very end").
"""
import json, re, sys

BEAT, GAP, END = 0.8, 0.35, 2.0
DIR = re.compile(r'^\*\((.*?)\)\*\s*(.*)$', re.S)


def direction_pause(d):
    secs = [float(x) for x in re.findall(r'(\d+(?:\.\d+)?)\s*s\b', d)]
    if secs:
        return round(sum(secs), 2)
    if d.strip().lower().startswith('beat'):
        return BEAT
    return None


def main():
    src, out = sys.argv[1], sys.argv[2]
    text = open(src, encoding='utf-8').read()
    chapters = re.split(r'^## (\d\d) · (.+)$', text, flags=re.M)
    lines = []
    for i in range(1, len(chapters), 3):
        num, title, body = chapters[i], chapters[i + 1].strip(), chapters[i + 2]
        m = re.search(r'\*\*VOICE[^\n]*\*\*\n(.*?)\n\*\*DIRECTION\*\*', body, re.S)
        if not m:
            continue
        head = re.search(r'\*\*VOICE\s*\(([^)]*)\)\*\*', body)
        paras = [re.sub(r'\s*\n\s*', ' ', p.strip()) for p in re.split(r'\n\s*\n', m.group(1)) if p.strip()]
        idx = 0
        for p in paras:
            dm = DIR.match(p)
            if dm and not dm.group(2).strip():
                pause = direction_pause(dm.group(1))
                if lines and lines[-1]['chapter'] == num:
                    lines[-1]['direction_after'] = dm.group(1)
                    if pause is not None:
                        lines[-1]['pause_after'] = pause
                continue
            note = None
            if dm:
                note, p = dm.group(1), dm.group(2).strip()
            idx += 1
            lines.append({'chapter': num, 'chapter_title': title, 'index': idx, 'text': p,
                          'delivery': note or (head.group(1) if head else None), 'pause_after': GAP})
    lines[-1]['pause_after'] = END
    lines[-1]['direction_after'] = 'end of film: "Two seconds of silence at the very end" (direction table)'
    json.dump(lines, open(out, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    words = sum(len(l['text'].split()) for l in lines)
    print(len(lines), 'lines,', words, 'words,', sum(len(l['text']) for l in lines), 'characters')


if __name__ == '__main__':
    main()
