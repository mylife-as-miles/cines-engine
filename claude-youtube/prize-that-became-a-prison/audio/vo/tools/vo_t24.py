"""Tim's 2024 lines read by the narrator until the 2024 stream (V01) is in hand: Kokoro, the film's narrator, quoting
him with a short lead-in the first time in a passage, then his words exactly as the GPO transcript has them.

    python vo_t24.py design/edit/cut_v3.json audio/vo/scratch_v3/t24 --voice am_michael

Reads every `t24` segment of the cut plan (its `say`, its `read_lead`, its chapter's speed in `read_speed`), voices it,
then transcribes the take with faster-whisper (word timestamps, two threads) to check it and to time the caption: the
quote's words get the times they are heard at, aligned to the text, so the kinetic card stays in sync with the read.
Writes <out>/<id>.wav and <out>/reads.json ({id: file, duration, lead, say, quote_start, words, heard, wer}).
Never an imitation of Tim: the narrator's own voice, quoting him, with the captions on screen.
"""
import difflib, json, os, re, sys, warnings
warnings.filterwarnings('ignore')
import numpy as np, soundfile as sf, torch
torch.set_num_threads(2)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vo_kokoro import trim, SR, SAY
from kokoro import KModel, KPipeline
from faster_whisper import WhisperModel

HINT = {'Dawn': '[Dawn](/dˈɔːn/)'}          # the plain reading was once heard as "Don"


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower().replace('’', "'"))


def main():
    cut = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    voice = sys.argv[sys.argv.index('--voice') + 1] if '--voice' in sys.argv else 'am_michael'
    os.makedirs(out, exist_ok=True)
    model = KModel(repo_id='hexgrad/Kokoro-82M').eval()
    pipe = KPipeline(lang_code=voice[0], model=model, repo_id='hexgrad/Kokoro-82M')
    asr = WhisperModel('small.en', device='cpu', compute_type='int8', cpu_threads=2)
    rep = {}
    for ch in cut['chapters']:
        for v in ch['voice']:
            if 't24' not in v:
                continue
            lead = v.get('read_lead', '')
            text = (lead + ' ' if lead else '') + v['say']
            say = text
            for w, r in {**SAY[voice[0]], **HINT}.items():
                say = re.sub(r'\b%s\b' % re.escape(w), r, say)
            a = trim(np.concatenate([r.audio.numpy() for r in pipe(say, voice=voice, speed=v.get('read_speed', 1.0), split_pattern=None)
                                     if r.audio is not None]))
            f = os.path.join(out, v['id'].replace('.', '_') + '.wav')
            sf.write(f, a, SR, subtype='PCM_16')
            a16 = np.interp(np.arange(0, len(a), SR / 16000), np.arange(len(a)), a).astype(np.float32)
            segs, _ = asr.transcribe(a16, beam_size=5, language='en', vad_filter=False, word_timestamps=True,
                                     condition_on_previous_text=False)
            heard = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
            toks = text.split()
            nt, nh = [norm(t) for t in toks], [norm(h[0]) for h in heard]
            times = [None] * len(toks)
            for blk in difflib.SequenceMatcher(None, nt, nh, autojunk=False).get_matching_blocks():
                for k in range(blk.size):
                    times[blk.a + k] = heard[blk.b + k][1]
            # words the recogniser missed: spread between their neighbours by length
            known = [i for i, t in enumerate(times) if t is not None]
            if not known:
                times = [i * len(a) / SR / len(toks) for i in range(len(toks))]
            else:
                if times[0] is None:
                    times[0] = 0.05
                if times[-1] is None:
                    times[-1] = max(t for t in times if t is not None) + 0.25
                i = 0
                while i < len(times):
                    if times[i] is None:
                        j = i
                        while times[j] is None:
                            j += 1
                        a0, a1 = times[i - 1], times[j]
                        for k in range(i, j):
                            times[k] = a0 + (a1 - a0) * (k - i + 1) / (j - i + 1)
                        i = j
                    i += 1
            nlead = len(lead.split()) if lead else 0
            sm = difflib.SequenceMatcher(None, nt, nh, autojunk=False)
            wer = round(1 - sum(b.size for b in sm.get_matching_blocks()) / max(1, len(nt)), 3)
            diffs = [(op, ' '.join(toks[i1:i2]), ' '.join(h[0] for h in heard[j1:j2])) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != 'equal']
            rep[v['id']] = {'file': os.path.relpath(f, os.path.dirname(os.path.dirname(os.path.dirname(out)))) if False else f,
                            'duration': round(len(a) / SR, 3), 'lead': lead, 'say': v['say'], 'speed': v.get('read_speed', 1.0),
                            'quote_start': round(times[nlead] if nlead < len(times) else 0.0, 3),
                            'words': [[w, round(t, 3)] for w, t in zip(toks[nlead:], times[nlead:])],
                            'heard': ' '.join(h[0] for h in heard), 'wer': wer, 'diffs': diffs}
            print(f"{v['id']:6} {len(a) / SR:6.2f}s wer {wer:.2f} {diffs[:4]}", flush=True)
    json.dump(rep, open(os.path.join(out, 'reads.json'), 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
