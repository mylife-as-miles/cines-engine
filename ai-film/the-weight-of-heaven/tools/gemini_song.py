#!/usr/bin/env python3
"""One song from Gemini's music model (Lyria), then the audio and a job record are saved. One request, no retry.

    python3 tools/gemini_song.py NAME prompts/song/NAME_gemini_prompt.txt [--model lyria-3.5] [--wav]

The author, 27 November, on the song demo package (Mureka on fal, $0.15): "Use gemini for this nah".
The key is never read here: the session's network proxy adds it to requests to generativelanguage.googleapis.com.
Price: Lyria 3.5 is listed at $0.08 a song by several resellers and guides (Google's own price page could not be
opened from this session); the record says "listed", not "billed".

Writes  out/jobs/NAME.response.json   the whole answer as it came, before anything is parsed (so a paid song is never lost)
        audio/song/NAME.<ext>         the audio exactly as returned
        out/jobs/NAME.json            the record: model, prompt file, what came back, the text parts (lyrics, structure)
"""
import argparse, base64, json, os, subprocess, sys, time

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)
LISTED = {'lyria-3.5': 0.08, 'lyria-3-pro-preview': 0.08, 'lyria-3-clip-preview': 0.04}


def main():
    a = argparse.ArgumentParser(); a.add_argument('name'); a.add_argument('prompt'); a.add_argument('--model', default='lyria-3.5'); a.add_argument('--wav', action='store_true')
    a = a.parse_args()
    raw = P('out/jobs', a.name + '.response.json')
    if os.path.exists(raw):
        sys.exit(f'{raw} exists: this song was already asked for. Nothing sent.')
    os.makedirs(P('out/jobs'), exist_ok=True); os.makedirs(P('audio/song'), exist_ok=True)
    text = open(P(a.prompt)).read()
    cfg = {'responseModalities': ['AUDIO', 'TEXT']}
    if a.wav:
        cfg['responseFormat'] = {'audio': {'mimeType': 'audio/wav'}}
    body = P('out/jobs', a.name + '.request.json'); json.dump({'contents': [{'parts': [{'text': text}]}], 'generationConfig': cfg}, open(body, 'w'))
    t0 = time.time()
    r = subprocess.run(['curl', '-sS', '-m', '1200', '-X', 'POST', f'https://generativelanguage.googleapis.com/v1beta/models/{a.model}:generateContent',
                        '-H', 'Content-Type: application/json', '-H', 'x-goog-api-key: proxy-injected', '--data-binary', '@' + body, '-o', raw + '.part', '-w', '%{http_code}'],
                       capture_output=True, text=True)
    code = r.stdout.strip(); took = round(time.time() - t0, 1)
    if code != '200':
        err = open(raw + '.part').read()[:1500] if os.path.exists(raw + '.part') else ''
        if os.path.exists(raw + '.part'):
            os.remove(raw + '.part')
        sys.exit(f'HTTP {code} after {took} s (nothing saved; an error is not a song): {r.stderr.strip()} {err}')
    os.replace(raw + '.part', raw)
    d = json.load(open(raw))
    rec = {'name': a.name, 'model': a.model, 'prompt_file': a.prompt, 'seconds_to_make': took, 'listed_price_usd': LISTED.get(a.model),
           'usage': d.get('usageMetadata'), 'model_version': d.get('modelVersion'), 'texts': [], 'audio': []}
    for c in d.get('candidates', []):
        rec['finish_reason'] = c.get('finishReason')
        for k, part in enumerate(c.get('content', {}).get('parts', [])):
            if 'text' in part:
                rec['texts'].append(part['text'])
            blob = part.get('inlineData') or part.get('inline_data')
            if blob:
                mime = blob.get('mimeType') or blob.get('mime_type') or ''
                ext = {'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/flac': 'flac', 'audio/ogg': 'ogg'}.get(mime.split(';')[0], 'bin')
                out = P('audio/song', f'{a.name}{"" if not rec["audio"] else "_" + str(len(rec["audio"]) + 1)}.{ext}')
                open(out, 'wb').write(base64.b64decode(blob['data']))
                rec['audio'].append({'file': os.path.relpath(out, HERE), 'mime': mime, 'bytes': os.path.getsize(out)})
    if not rec['audio']:
        rec['note'] = 'no audio part in the answer: ' + json.dumps(d)[:600]
    json.dump(rec, open(P('out/jobs', a.name + '.json'), 'w'), indent=1)
    print(json.dumps({k: v for k, v in rec.items() if k != 'texts'}, indent=1)); print('--- text parts ---'); print('\n'.join(rec['texts'])[:6000])


if __name__ == '__main__':
    main()
