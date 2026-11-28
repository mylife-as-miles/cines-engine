"""Read narration lines with an ElevenLabs voice, one line a request (with the lines around it as previous/next text
where the model accepts it), then shorten only the long pauses inside each line: the words are never stretched or
re-pitched (the author's choice for the designed voice: "pauses only").

    python3 audio/vo/tools/vo_eleven_read.py <voice id> <out dir> [--chapters 00,01] [--model eleven_v3] [--speed 1.0]
                                              [--pause-max 0.45]

Writes <out dir>/<ch>_<nn>.mp3 (as returned), <ch>_<nn>.wav (48 kHz mono, pauses shortened), lines.json in the scratch
layout (text, file, duration, pause_after) and cost.json. The key never passes through here: the session's proxy adds
it to requests to api.elevenlabs.io.
"""
import json, os, subprocess, sys, tempfile
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
API = 'https://api.elevenlabs.io/v1'
SR = 48000

def opt(k, d): return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d

def tighten(x, pause_max):
    fl = int(0.02 * SR); n = len(x) // fl
    if n < 3: return x
    fr = x[:n * fl].reshape(n, fl)
    db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9) - 20 * np.log10(np.abs(x).max() + 1e-9)
    q = db < -42; runs = []; i = 0
    while i < n:
        if q[i]:
            j = i
            while j < n and q[j]: j += 1
            runs.append((i, j)); i = j
        else: i += 1
    keep = int(pause_max / 0.02); out = []; last = 0
    for a, b in runs:
        if b - a > keep and a > 0 and b < n:          # inside the line only: lead-in and tail are trimmed by the mixer
            out.append(x[last * fl:(a + keep // 2) * fl]); last = b - (keep - keep // 2)
    out.append(x[last * fl:]); return np.concatenate(out)

def main():
    vid, out = sys.argv[1], os.path.abspath(sys.argv[2]); os.makedirs(out, exist_ok=True)
    chapters = opt('--chapters', '').split(',') if '--chapters' in sys.argv else None
    model, speed, pmax = opt('--model', 'eleven_v3'), float(opt('--speed', '1.0')), float(opt('--pause-max', '0.45'))
    allL = json.load(open(os.path.join(ROOT, 'audio/vo/scratch/lines.json')))
    lines = [l for l in allL if chapters is None or l['chapter'] in chapters]
    logp = os.path.join(out, 'cost.json'); log = json.load(open(logp)) if os.path.exists(logp) else []
    use_ctx = True; res = []
    for i, ln in enumerate(lines):
        name = f"{ln['chapter']}_{ln['index']:02d}"; mp3 = os.path.join(out, name + '.mp3'); wav = os.path.join(out, name + '.wav')
        if not os.path.exists(mp3):
            k = allL.index(ln)
            body = {'text': ln['text'], 'model_id': model,
                    'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.2, 'use_speaker_boost': True, 'speed': speed}}
            if use_ctx:
                body['previous_text'] = ' '.join(l['text'] for l in allL[max(0, k - 2):k]) or None
                body['next_text'] = ' '.join(l['text'] for l in allL[k + 1:k + 2]) or None
            for attempt in (1, 2):
                hdr = tempfile.mktemp()
                code = subprocess.run(['curl', '-sS', '-m', '180', '-X', 'POST', f'{API}/text-to-speech/{vid}?output_format=mp3_44100_192',
                                       '-H', 'Content-Type: application/json', '-H', 'xi-api-key: proxy-injected', '-D', hdr,
                                       '--data-binary', json.dumps(body), '-o', mp3, '-w', '%{http_code}'], capture_output=True, text=True).stdout
                h = {a.strip().lower(): c.strip() for a, _, c in (l.partition(':') for l in open(hdr).read().splitlines()) if c}
                if code == '200': break
                err = open(mp3, errors='ignore').read()[:300]; os.remove(mp3)
                if use_ctx and ('previous_text' in err or 'next_text' in err or code == '400'):
                    use_ctx = False; body.pop('previous_text', None); body.pop('next_text', None); print('model refuses context; without it'); continue
                raise SystemExit(f'{name}: HTTP {code}: {err}')
            log.append({'line': name, 'chars': len(ln['text']), 'character_cost': h.get('character-cost'), 'context': use_ctx})
            json.dump(log, open(logp, 'w'), indent=1)
        x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', mp3, '-ar', str(SR), '-ac', '1', '-f', 'f32le', '-'], capture_output=True).stdout, np.float32).copy()
        y = tighten(x, pmax)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s24le', wav], input=y.tobytes(), check=True)
        res.append(dict(ln, file=name + '.wav', duration=round(len(y) / SR, 3), voice='designed: ' + vid, model=model, speed=speed))
        print(name, round(len(x) / SR, 2), '->', round(len(y) / SR, 2), 's', flush=True)
    json.dump(res, open(os.path.join(out, 'lines.json'), 'w'), indent=1)
    print('credits billed:', sum(int(e['character_cost'] or 0) for e in log))

if __name__ == '__main__':
    main()
