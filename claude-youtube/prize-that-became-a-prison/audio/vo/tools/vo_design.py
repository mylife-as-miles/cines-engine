"""ElevenLabs Voice Design: a new narrator voice from a written description (a character, never a real person).

    python3 audio/vo/tools/vo_design.py <round name> [--seed N]

Sends the description and a cold-open passage to /v1/text-to-voice/design, writes each preview to
audio/vo/design/<round>/preview_<k>.mp3 with its generated_voice_id, and logs the request's character-cost header.
The key never passes through here: the session's proxy adds it to requests to api.elevenlabs.io.
"""
import base64, json, os, subprocess, sys, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DESC = ("A male documentary narrator in his late forties, American with a neutral accent. A low, warm voice with a slight "
        "natural grain, recorded close to the microphone in a quiet studio. Measured, restrained and quietly intense, never "
        "theatrical or announcer-like: a serious long-form storyteller who has read every page of the case. Clear diction, "
        "an unhurried pace.")
TEXT = ("The bags are overweight. Only slightly. There's a small fee, and she pays it without a second thought. "
        "It's 2014, at an airport in China. Not long after, security staff call her aside. "
        "The officers want to know one thing. Are these bags hers? She says yes. "
        "Three years later, a court sentences her to death, with a two-year reprieve.")

def main():
    rnd = sys.argv[1]; seed = int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else None
    desc = open(sys.argv[sys.argv.index('--desc') + 1]).read().strip() if '--desc' in sys.argv else DESC   # a round's own brief
    out = os.path.join(ROOT, 'audio/vo/design', rnd); os.makedirs(out, exist_ok=True)
    body = {'voice_description': desc, 'text': TEXT, 'model_id': 'eleven_ttv_v3', 'auto_generate_text': False,
            'loudness': 0.5, 'guidance_scale': 5}
    if seed is not None: body['seed'] = seed
    hdr, res = tempfile.mktemp(), tempfile.mktemp()
    code = subprocess.run(['curl', '-sS', '-m', '300', '-X', 'POST', 'https://api.elevenlabs.io/v1/text-to-voice/design',
                           '-H', 'Content-Type: application/json', '-H', 'xi-api-key: proxy-injected', '-D', hdr,
                           '--data-binary', json.dumps(body), '-o', res, '-w', '%{http_code}'], capture_output=True, text=True).stdout
    h = {k.strip().lower(): v.strip() for k, _, v in (l.partition(':') for l in open(hdr).read().splitlines()) if v}
    log = {'round': rnd, 'http': code, 'character_cost': h.get('character-cost'), 'request_id': h.get('request-id'),
           'description': desc, 'text': TEXT, 'chars': len(TEXT), 'model_id': body['model_id'], 'seed': seed}
    if code != '200':
        log['error'] = open(res, errors='ignore').read()[:600]
    else:
        d = json.load(open(res)); log['previews'] = []
        for k, p in enumerate(d.get('previews', []), 1):
            f = os.path.join(out, f'preview_{k}.mp3'); open(f, 'wb').write(base64.b64decode(p['audio_base_64']))
            log['previews'].append({'file': os.path.relpath(f, ROOT), 'generated_voice_id': p.get('generated_voice_id'),
                                    'duration_secs': p.get('duration_secs')})
    json.dump(log, open(os.path.join(out, 'design.json'), 'w'), indent=1)
    print(json.dumps({k: v for k, v in log.items() if k not in ('description', 'text')}, indent=1))

if __name__ == '__main__':
    main()
