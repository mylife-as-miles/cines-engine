"""Put the Dispatcher on the phone: each line from tools/dispatcher_tts.py through a phone-line treatment
(300 Hz - 3.4 kHz, a little compression and grit), written to audio/voice/phone/<line>.wav, 48 kHz mono.
tools/cuesheet.py then lists them as the mixer's voice track, each starting with its line's on-screen entrance,
so the mixer levels the voice and ducks the music under it.

  python3 tools/voice_place.py
"""
import json, os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(ROOT, 'audio', 'voice')
PHONE = ('highpass=f=300:poles=2,highpass=f=300:poles=2,lowpass=f=3400:poles=2,lowpass=f=3400:poles=2,'
         'acompressor=threshold=-22dB:ratio=4:attack=5:release=80,'
         'asoftclip=type=tanh:threshold=0.7,aresample=48000')
os.makedirs(os.path.join(V, 'phone'), exist_ok=True)
for L in json.load(open(os.path.join(V, 'lines.json')))['lines']:
    src, dst = os.path.join(V, L['id'] + '.wav'), os.path.join(V, 'phone', L['id'] + '.wav')
    if not os.path.exists(src): print('missing', src); continue
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', PHONE, '-ac', '1', dst], check=True)
    print(L['id'], '->', os.path.relpath(dst, ROOT))
