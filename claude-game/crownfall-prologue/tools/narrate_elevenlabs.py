"""The prologue's voices, from ElevenLabs.

    python tools/narrate_elevenlabs.py voices                                  # list the voices this key can use
    python tools/narrate_elevenlabs.py record [--model eleven_v4] [--only C02,L01] [--tempo 1.06]
    python tools/narrate_elevenlabs.py --reprocess [--tempo 1.06]                # re-cut the WAVs from the MP3s (no API calls)

Each line is spoken by its speaker's voice from script.json ("voices": narrator, cael, voice); --tempo quickens the
narrator only (pitch kept). Audio tags in a line's "say" ([whispers], [laughs]) direct the delivery.

Reads narration/script.json and writes narration/final/<id>.mp3 and <id>.wav (48 kHz mono) plus
narration/final/lines.json with each take's duration; tools/build_timeline.js then re-times the film to the voice and
tools/mix.py lays it under the music. Each line is sent with the lines before and after it (previous_text / next_text),
so the delivery runs on like one reading. The API key is never handled here: the session's proxy adds it to requests to
api.elevenlabs.io. Uses curl and ffmpeg.
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
API = 'https://api.elevenlabs.io/v1'


def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def curl(method, url, body=None, out=None):
    cmd = ['curl', '-sS', '-m', '180', '-X', method, url, '-H', 'Content-Type: application/json', '-H', 'Accept: */*']
    if body is not None:
        cmd += ['--data-binary', json.dumps(body)]
    if out:
        cmd += ['-o', out, '-w', '%{http_code}']
        code = subprocess.run(cmd, capture_output=True, text=True).stdout.strip()
        return code
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.stdout


def main():
    if len(sys.argv) < 2:
        print(__doc__); return
    if sys.argv[1] == 'voices':
        data = json.loads(curl('GET', API + '/voices'))
        if 'voices' not in data:
            print(json.dumps(data)[:600]); return
        for v in data['voices']:
            lab = v.get('labels') or {}
            print(f"{v['voice_id']}  {v['name']:<28} {lab.get('gender', ''):<7} {lab.get('accent', ''):<12} {lab.get('age', ''):<12} {lab.get('description', '') or lab.get('use_case', '')}")
        return
    tempo = float(arg('--tempo', '1.0'))
    reprocess = sys.argv[1] == '--reprocess'
    model = arg('--model', 'eleven_v4')
    only = arg('--only', '')
    script = json.load(open(os.path.join(ROOT, 'narration', 'script.json')))
    voices = script['voices']
    lines = [l for l in script['lines'] if not l.get('cut')]
    out_dir = os.path.join(ROOT, 'narration', 'final'); os.makedirs(out_dir, exist_ok=True)
    man_path = os.path.join(out_dir, 'lines.json')
    old = {l['id']: l for l in json.load(open(man_path))['lines']} if os.path.exists(man_path) else {}
    out = []
    import re
    plain = lambda l: re.sub(r'\[[^\]]*\]\s*', '', l.get('say', l['text'])).strip()
    for i, ln in enumerate(lines):
        if only and ln['id'] not in only.split(',') and ln['id'] in old:
            out.append(old[ln['id']]); continue
        spk = ln.get('speaker', 'narrator'); v = voices[spk]
        settings = {'stability': v.get('stability', 0.5), 'similarity_boost': 0.8, 'style': v.get('style', 0.25), 'use_speaker_boost': True}
        same = [l for l in lines if l.get('speaker', 'narrator') == spk]
        j = same.index(ln)
        body = {'text': ln.get('say', ln['text']), 'model_id': model, 'voice_settings': settings,
                'previous_text': ' '.join(plain(l) for l in same[max(0, j - 2):j]) or None,
                'next_text': ' '.join(plain(l) for l in same[j + 1:j + 2]) or None}
        mp3 = os.path.join(out_dir, ln['id'] + '.mp3')
        if not reprocess:
            code = curl('POST', f"{API}/text-to-speech/{v['id']}?output_format=mp3_44100_192", body, mp3)
            if code != '200':
                print(ln['id'], 'failed', code, open(mp3, errors='replace').read()[:400]); sys.exit(1)
        wav = os.path.join(out_dir, ln['id'] + '.wav')
        af = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse'
        if tempo != 1.0 and spk == 'narrator':
            af += f',atempo={tempo}'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp3, '-af', af, '-ac', '1', '-ar', '48000', wav], check=True)
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], capture_output=True, text=True).stdout)
        out.append({'id': ln['id'], 'speaker': spk, 'file': ln['id'] + '.wav', 'dur': round(dur, 3)})
        print(f"{ln['id']} {spk:<8} {dur:6.2f}s  {ln['text'][:64]}")
    voice_name = ', '.join(f"{k}: ElevenLabs {v['name']} ({v['id']})" for k, v in voices.items()) + f' [{model}]'
    json.dump({'voice': voice_name + (f' (narrator tempo {tempo})' if tempo != 1.0 else ''), 'sampleRate': 48000, 'lines': out}, open(man_path, 'w'), indent=1)
    print('total voice', round(sum(l['dur'] for l in out), 1), 's')


if __name__ == '__main__':
    main()
