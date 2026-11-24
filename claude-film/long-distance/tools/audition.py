"""Voice an audition: every candidate reads the same lines, then each candidate's takes are joined into one reel.

  python3 tools/audition.py audio/audition/audition.json audio/audition [--force]

Gemini text-to-speech (gemini-3.8-flash-tts): the direction rides in a speech_metadata annotation, so it is never
spoken. ElevenLabs (eleven_v4): the direction goes in as an audio tag in square brackets, which v4 performs and does
not read; previous_text/next_text keep the reading flowing. Keys come from the environment or from network secrets
that the proxy injects (GEMINI_API_KEY / ELEVENLABS_API_KEY are optional). Writes takes/<key>/<id>.wav (mono),
<key>.mp3 (the reel: the lines in order, 0.9 s apart) and takes.json (each take's length).
"""
import base64, json, os, subprocess, sys, time, urllib.error, urllib.request, wave

GEM_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'
GEM_MODEL = 'gemini-3.8-flash-tts'
EL_URL = 'https://api.elevenlabs.io/v1/text-to-speech/{}?output_format=mp3_44100_192'
EL_MODEL = 'eleven_v4'


def http(url, body, headers, raw=False):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method='POST', headers={'Content-Type': 'application/json', **headers})
    for wait in (0, 5, 20, 60):
        time.sleep(wait)
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return r.read() if raw else json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8', 'replace')[:300]
            if e.code in (429, 500, 502, 503): print(f'  HTTP {e.code}, retrying'); continue
            raise SystemExit(f'HTTP {e.code}: {msg}')
    raise SystemExit('gave up after retries')


def gemini(voice, line, dst):
    key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    body = {'model': GEM_MODEL, 'response_format': {'type': 'audio'},
            'generation_config': {'speech_config': [{'voice': voice}]},
            'input': [{'type': 'user_input', 'content': [{'type': 'text', 'text': line['text'],
                       'annotations': [{'type': 'speech_metadata', 'style': line['style']}]}]}]}
    resp = http(GEM_URL, body, {'x-goog-api-key': key} if key else {})
    blocks = [c for st in resp.get('steps', []) if st.get('type') == 'model_output' for c in st.get('content', []) if c.get('type') == 'audio']
    if not blocks: raise SystemExit(f"no audio: {json.dumps(resp)[:300]}")
    raw = base64.b64decode(blocks[-1]['data']); mime = blocks[-1].get('mime_type', '')
    if raw[:4] == b'RIFF': open(dst, 'wb').write(raw); return
    rate = int(mime.split('rate=')[1].split(';')[0]) if 'rate=' in mime else 24000
    with wave.open(dst, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(raw)


def eleven(voice, line, prev, nxt, dst):
    key = os.environ.get('ELEVENLABS_API_KEY') or 'proxy-injected'
    body = {'text': f"{line['tag']} {line['text']}", 'model_id': EL_MODEL,
            'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.35, 'use_speaker_boost': True}}
    if prev: body['previous_text'] = prev
    if nxt: body['next_text'] = nxt
    mp3 = http(EL_URL.format(voice), body, {'xi-api-key': key}, raw=True)
    tmp = dst + '.mp3'; open(tmp, 'wb').write(mp3)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-ac', '1', '-ar', '44100', dst], check=True); os.remove(tmp)


def dur(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout
    return round(float(out), 2)


def main():
    a = sys.argv[1:]
    spec, out = json.load(open(a[0])), a[1]
    force = '--force' in a
    report = {}
    for role, R in spec['roles'].items():
        for cand in R['candidates']:
            k = cand['key']; d = os.path.join(out, 'takes', k); os.makedirs(d, exist_ok=True)
            print(f"{k}  {cand['engine']} {cand['voice']}  ({cand['label']})")
            files = []
            for i, L in enumerate(R['lines']):
                dst = os.path.join(d, L['id'] + '.wav')
                if force or not os.path.exists(dst):
                    if cand['engine'] == 'gemini': gemini(cand['voice'], L, dst)
                    else:
                        prev = R['lines'][i - 1]['text'] if i else None
                        nxt = R['lines'][i + 1]['text'] if i + 1 < len(R['lines']) else None
                        eleven(cand['voice'], L, prev, nxt, dst)
                files.append(dst); report.setdefault(k, {})[L['id']] = dur(dst)
                print(f"  {L['id']} {report[k][L['id']]:5.2f}s  {L['text']}")
            # the reel: each take resampled to 44.1 kHz mono, 0.9 s of silence between, one mp3
            inputs, filt = [], []
            for j, f in enumerate(files):
                inputs += ['-i', f]
                filt.append(f'[{j}:a]aresample=44100,aformat=channel_layouts=mono,apad=pad_dur=0.9[a{j}]')
            filt.append(''.join(f'[a{j}]' for j in range(len(files))) + f'concat=n={len(files)}:v=0:a=1,loudnorm=I=-18:TP=-2[out]')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filt), '-map', '[out]',
                            '-c:a', 'libmp3lame', '-b:a', '128k', os.path.join(out, k + '.mp3')], check=True)
    json.dump(report, open(os.path.join(out, 'takes.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
