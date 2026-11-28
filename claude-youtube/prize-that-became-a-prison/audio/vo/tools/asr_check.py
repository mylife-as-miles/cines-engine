"""Round-trip check: transcribe each voiced line with faster-whisper (small.en) and diff it against the script text.

    python asr_check.py LINES.json AUDIO_DIR [--out report.json]

No prompt is given to the recogniser, so a name it cannot spell, or a word the voice dropped or slurred, shows up as a
difference. Prints the word error rate per line and the differences; a difference on a proper name is expected
(Qingdao, Baiyun, Guangdong) and means "listen to this", not "wrong".
"""
import difflib, json, os, re, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

NUM = {'2014': 'twenty fourteen', '2017': 'twenty seventeen', '2024': 'twenty twenty four',
       '2025': 'twenty twenty five', '2026': 'twenty twenty six', '25th': 'twenty fifth', '92': 'ninety two',
       '1': 'one', '2': 'two', '3': 'three', '9': 'nine', '10': 'ten', '12': 'twelve'}


def norm(s):
    s = s.lower().replace('’', "'").replace('-', ' ').replace('—', ' ')
    s = re.sub(r"[^a-z0-9' ]+", ' ', s)
    out = []
    for w in s.split():
        w = w.strip("'")
        out += NUM.get(w, w).split()
    return out


def main():
    lines = json.load(open(sys.argv[1], encoding='utf-8'))
    adir = sys.argv[2]
    rep_path = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
    m = WhisperModel('small.en', device='cpu', compute_type='int8', cpu_threads=int(os.environ.get("ASR_THREADS", "4")))
    report, errs, total = [], 0, 0
    for l in lines:
        pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(adir, l['file']), '-ac', '1', '-ar', '16000',
                              '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        segs, _ = m.transcribe(np.frombuffer(pcm, np.float32), beam_size=5, language='en', vad_filter=False,
                               condition_on_previous_text=False)
        heard = ' '.join(s.text.strip() for s in segs)
        a, b = norm(l['text']), norm(heard)
        sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
        diffs = [(op, ' '.join(a[i1:i2]), ' '.join(b[j1:j2])) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != 'equal']
        e = sum(max(i2 - i1, j2 - j1) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != 'equal')
        errs += e; total += len(a)
        report.append({'file': l['file'], 'wer': round(e / max(1, len(a)), 3), 'heard': heard, 'diffs': diffs})
        flag = '  <<' if diffs else ''
        print(f"{l['file']:22s} wer {e / max(1, len(a)):.2f}{flag}", flush=True)
        for d in diffs:
            print(f"      {d[0]:8s} script: {d[1]!r:40s} heard: {d[2]!r}", flush=True)
    print(f'overall WER {errs / max(1, total):.3f} over {total} words')
    if rep_path:
        json.dump({'overall_wer': round(errs / max(1, total), 4), 'lines': report}, open(rep_path, 'w'), indent=1)


if __name__ == '__main__':
    main()
