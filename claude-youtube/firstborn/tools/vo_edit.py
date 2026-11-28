"""Prepare the author's voice-over as the narration track, and its word times on that clock.

  python3 tools/vo_edit.py      -> out/vo/narration.wav (48 kHz mono, 24-bit) and audio/vo/words.json

No cuts: the take is used whole (401.5 s). Word times come from Whisper small.en run in 25 s windows
(audio/vo/voice_words_whisper.json); words repeated where two windows overlap ("Let's Let's", "Then Then",
"asked asked"...) are dropped here, and the known mishearings are corrected in FIX below.
"""
import json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'audio', 'vo', 'voice.mp3')
OUT = os.path.join(ROOT, 'out', 'vo', 'narration.wav')
FIX = {'1 .0,': '1.0,', 'Okofre\'s': 'Okafor\'s'}   # spelling only; "Go in by salt" etc. are fixed in the captions


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', SRC, '-af', 'aresample=48000', '-c:a', 'pcm_s24le', OUT], check=True)
    words = json.load(open(os.path.join(ROOT, 'audio', 'vo', 'voice_words_whisper.json')))
    out = []
    for w in words:
        text = FIX.get(w['w'], w['w'])
        if out:
            p = out[-1]
            a, b = p['w'].lower().strip('.,?!'), text.lower().strip('.,?!')
            same = a == b or (len(b) > 2 and a.endswith(b))      # 'firstborn,' then 'born,' across a window seam
            if same and w['t0'] - p['t0'] < 1.2:          # an overlap duplicate: keep the first, extend its end
                p['t1'] = max(p['t1'], w['t1']); continue
        out.append({'w': text, 't0': w['t0'], 't1': w['t1']})
    json.dump({'source': 'audio/vo/voice.mp3', 'cuts_src_s': [], 'words': out},
              open(os.path.join(ROOT, 'audio', 'vo', 'words.json'), 'w'), indent=0)
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]))
    print(f'{OUT}: {dur:.2f} s; {len(out)} words (dropped {len(words) - len(out)} overlap duplicates)')


if __name__ == '__main__':
    main()
