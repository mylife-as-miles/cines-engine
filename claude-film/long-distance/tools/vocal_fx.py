"""Voice, check and finish the voiced sounds that are not lines (audio/vo/vocal_fx.json):

  /home/user/leonxlnx/earshot/.venv/bin/python tools/vocal_fx.py [--force] [--pick laugh_phone=3] [--only murmur]

laugh_phone  her soft laugh on the phone (Q01, 18.2 s): Gemini TTS en-us-tova, several takes. Each take is heard by
             speech recognition (a laugh should not come back as a sentence) and earshot matches it against "a woman
             laughing softly" with alternatives ("a woman speaking"...). The pick is the take that beats its
             alternatives by the widest margin; --pick overrides by ear. -> audio/vo/laugh_phone.wav (trimmed, dry:
             the mix gives it the phone's treatment, like her lines).
murmur       his voice telling her about an ordinary day (Q01, 14.5-21.5 s): Gemini TTS en-us-varo, then low-passed
             (steep, at lowpass_hz) with the close low-mids kept, until speech recognition gives back none of the
             script's content words (Whisper invents fillers for any speech it cannot make out: "hmm hmm", "the the").
             -> audio/vo/murmur.wav (48 kHz mono) and audio/vo/murmur.json (its pauses, so the bed can be aligned
             for the laugh to land in one).
Takes stay in audio/vo/takes/ (gitignored). Results: audio/vo/vocal_fx_check.json.
"""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from audition import gemini  # noqa: E402

VO = os.path.join(ROOT, 'audio', 'vo'); TK = os.path.join(VO, 'takes'); SR = 48000


def load(p, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def trim(x, sr=SR, thr_db=-45, head=0.03, tail=0.15):
    n = int(0.01 * sr); env = np.sqrt(np.convolve(x * x, np.ones(n) / n, mode='same'))
    on = np.where(env > env.max() * 10 ** (thr_db / 20))[0]
    a, b = max(0, on[0] - int(head * sr)), min(len(x), on[-1] + int(tail * sr))
    y = x[a:b].copy(); f = int(0.005 * sr); y[:f] *= np.linspace(0, 1, f); g = int(0.06 * sr); y[-g:] *= np.linspace(1, 0, g)
    return y


def hear(asr, x):
    """What speech recognition makes of x (48 kHz mono): Whisper wants 16 kHz."""
    return asr({'raw': signal.resample_poly(x, 1, 3).astype(np.float32), 'sampling_rate': 16000})['text'].strip()


def pauses(x, sr=SR, min_gap=0.18):
    """Gaps in the speech (seconds): where the 30 ms envelope stays 30 dB under the take's peak for min_gap."""
    n = int(0.03 * sr); env = np.sqrt(np.convolve(x * x, np.ones(n) / n, mode='same'))
    quiet = env < env.max() * 10 ** (-30 / 20); out = []; i = 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            if (j - i) / sr >= min_gap and i > 0 and j < len(quiet): out.append([round(i / sr, 2), round(j / sr, 2)])
            i = j
        else: i += 1
    return out


def murmur_filter(x, lp):
    """Unintelligible but his: a steep low-pass takes the consonants, a gentle 180 Hz lift keeps him close."""
    y = signal.sosfilt(signal.butter(8, lp, 'lowpass', fs=SR, output='sos'), x)
    y = signal.sosfilt(signal.butter(8, lp, 'lowpass', fs=SR, output='sos'), y)       # 96 dB/oct in all
    y = signal.sosfilt(signal.butter(2, 70, 'highpass', fs=SR, output='sos'), y)
    b, a = signal.iirpeak(180 / (SR / 2), 0.8); y = y + 0.35 * signal.lfilter(b, a, y)
    return y / (np.abs(y).max() + 1e-12) * 10 ** (-3 / 20)


def main():
    a = sys.argv[1:]; force = '--force' in a
    picks = dict(p.split('=') for p in a[a.index('--pick') + 1].split(',')) if '--pick' in a else {}
    spec = json.load(open(os.path.join(VO, 'vocal_fx.json'))); os.makedirs(TK, exist_ok=True)
    # voice the takes
    L = spec['laugh_phone']; lt = []
    for i, t in enumerate(L['takes'], 1):
        p = os.path.join(TK, f'fx_laugh_phone_t{i}.wav'); lt.append(p)
        if force or not os.path.exists(p): gemini(L['voice'], t, p); print('voiced', os.path.basename(p))
    M = spec['murmur']; mt = os.path.join(TK, 'fx_murmur_t1.wav')
    if force or not os.path.exists(mt): gemini(M['voice'], M, mt); print('voiced', os.path.basename(mt))

    from transformers import pipeline
    from earshot import api
    asr = pipeline('automatic-speech-recognition', model='openai/whisper-small.en', device='cpu')
    rep = {'laugh_phone': {}, 'murmur': {}}
    # the laugh: trim each take, hear it, match it
    best, best_m = None, -9e9
    prev = os.path.join(VO, 'vocal_fx_check.json')
    if '--only' in a and a[a.index('--only') + 1] == 'murmur' and os.path.exists(prev):
        rep['laugh_phone'] = json.load(open(prev))['laugh_phone']; lt = []
    for i, p in enumerate(lt, 1):
        x = trim(load(p)); tp = os.path.join(TK, f'fx_laugh_phone_t{i}_trim.wav'); sf.write(tp, x.astype(np.float32), SR)
        heard = asr(tp)['text'].strip()
        m = api.match(tp, L['listen_for'], alts=L['alts'])
        z = m.get('z'); share = None
        ch = m.get('choice') or m.get('forced_choice') or {}
        rep['laugh_phone'][f't{i}'] = {'text': L['takes'][i - 1]['text'], 'dur': round(len(x) / SR, 2), 'heard': heard,
                                       'verdict': m.get('verdict'), 'z': z, 'summary': m.get('summary'), 'choice': ch}
        # margin: z, minus a penalty if speech recognition hears a sentence (more than two words)
        words = [w for w in heard.replace('.', ' ').replace(',', ' ').split() if w.strip("!?-'")]
        score = (z or 0) - (2.0 if len(words) > 2 else 0)
        rep['laugh_phone'][f't{i}']['score'] = round(score, 2)
        print(f"laugh t{i}: {len(x) / SR:.2f}s heard {heard!r}  {m.get('summary')}")
        if score > best_m: best, best_m = i, score
    k = int(picks.get('laugh_phone', best or int(rep['laugh_phone'].get('pick', 't1')[1:]))); rep['laugh_phone']['pick'] = f't{k}'
    rep['laugh_phone']['pick_reason'] = 'chosen by ear (--pick)' if 'laugh_phone' in picks else 'highest earshot z against "a woman laughing softly", not heard as a sentence'
    x = load(os.path.join(TK, f'fx_laugh_phone_t{k}_trim.wav')); sf.write(os.path.join(VO, 'laugh_phone.wav'), x.astype(np.float32), SR, subtype='PCM_24')
    print('laugh_phone <- t%d' % k)
    # the murmur: filter until no word is recognised
    x = trim(load(mt), tail=0.3); raw_heard = hear(asr, x)
    lp = float(M.get('lowpass_hz', 420))
    while True:
        y = murmur_filter(x, lp); heard = hear(asr, y)
        # Whisper invents fillers ("hmm hmm", "the the") for any speech it cannot make out, so the test is that none of
        # the script's own content words (four letters or more) comes back
        got = set(re.sub(r"[^a-z ]", " ", heard.lower()).split()); script = {w for w in re.sub(r"[^a-z ]", " ", M['text'].lower()).split() if len(w) >= 4}
        hits = sorted(got & script)
        print(f'murmur lp {lp:.0f} Hz: heard {heard[:80]!r}... script words recognised: {hits}')
        if not hits or lp <= 250: break
        lp *= 0.85
    out = os.path.join(VO, 'murmur.wav'); sf.write(out, y.astype(np.float32), SR, subtype='PCM_24')
    gaps = pauses(y)
    d = api.describe(out)
    rep['murmur'] = {'dur': round(len(y) / SR, 2), 'heard_unfiltered': raw_heard, 'lowpass_hz': round(lp), 'heard_filtered': heard,
                     'pauses': gaps, 'describe': d.get('summary')}
    json.dump({'dur': round(len(y) / SR, 2), 'pauses': gaps, 'lowpass_hz': round(lp)}, open(os.path.join(VO, 'murmur.json'), 'w'), indent=1)
    print('murmur:', rep['murmur'])
    json.dump(rep, open(os.path.join(VO, 'vocal_fx_check.json'), 'w'), indent=1, default=str)


if __name__ == '__main__':
    main()
