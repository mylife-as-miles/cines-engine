"""Gate 1 of audio/VOICE_PLAN.md: the cold open (chapter 00, 14 paragraphs) read by ElevenLabs voices, one line a
request with the two lines before as previous_text and the one after as next_text, so it reads as one reading.

    python3 audio/vo/tools/vo_eleven_audition.py <voice name> <voice id> [--first-only]

The API key is never handled here: the session's proxy adds it to requests to api.elevenlabs.io. Each request's
character-cost header is logged; --first-only sends one line and stops, so a billed context can be caught before the
rest is spent. Writes audio/vo/audition_el/<voice>/00_<nn>.mp3 and cost.json.
"""
import json, os, subprocess, sys, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
API = 'https://api.elevenlabs.io/v1'
MODEL = 'eleven_v4'
SETTINGS = {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.30, 'use_speaker_boost': True, 'speed': 1.0}   # chapter 00 row

def main():
    name, vid = sys.argv[1], sys.argv[2]
    lines = [l for l in json.load(open(os.path.join(ROOT, 'audio/vo/scratch/lines.json'))) if l['chapter'] == '00']
    out = os.path.join(ROOT, 'audio/vo/audition_el', name); os.makedirs(out, exist_ok=True)
    logp = os.path.join(out, 'cost.json'); log = json.load(open(logp)) if os.path.exists(logp) else []
    done = {e['index'] for e in log if e.get('ok')}
    for i, ln in enumerate(lines):
        if ln['index'] in done:
            continue
        body = {'text': ln['text'], 'model_id': MODEL, 'voice_settings': SETTINGS,
                'previous_text': ' '.join(l['text'] for l in lines[max(0, i - 2):i]) or None,
                'next_text': ' '.join(l['text'] for l in lines[i + 1:i + 2]) or None}
        mp3 = os.path.join(out, f"00_{ln['index']:02d}.mp3")
        hdr = tempfile.mktemp(suffix='.hdr')
        code = subprocess.run(['curl', '-sS', '-m', '180', '-X', 'POST', f'{API}/text-to-speech/{vid}?output_format=mp3_44100_192',
                               '-H', 'Content-Type: application/json', '-H', 'xi-api-key: proxy-injected', '-D', hdr,
                               '--data-binary', json.dumps(body), '-o', mp3, '-w', '%{http_code}'], capture_output=True, text=True).stdout
        h = {k.strip().lower(): v.strip() for k, _, v in (l.partition(':') for l in open(hdr).read().splitlines()) if v}
        e = {'index': ln['index'], 'chars': len(ln['text']), 'http': code, 'character_cost': h.get('character-cost'),
             'request_id': h.get('request-id'), 'ok': code == '200'}
        if code != '200':
            e['error'] = open(mp3, errors='ignore').read()[:400]; os.remove(mp3)
        log.append(e); json.dump(log, open(logp, 'w'), indent=1)
        print(json.dumps(e), flush=True)
        if code != '200' or '--first-only' in sys.argv:
            break

if __name__ == '__main__':
    main()
