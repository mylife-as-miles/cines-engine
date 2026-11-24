"""A dialogue read-through: every voiced line in screenplay order, with a first pass at the film's treatments.

  python3 tools/readthrough.py [OUT.mp3]      (default audio/vo/readthrough.mp3)

Treatments, from voice_map.json 'as' (the mix will refine them; this is for judging performances and the idea):
  phone  the app's voice: dry, close and too clean. No room at all, a little presence, steady level.
  door   the real woman in the flat by day: a small room (synthetic impulse, RT about 0.45 s) and a touch of distance.
  room   him in the flat: the same room, a little drier.
  bed    him in bed at night, close: almost dry.
Gaps are a plan, not the cut: 0.8 s within a scene, longer at scene breaks and where the screenplay holds
(LATER, her leaving), and almost none before the phone's "Yes." (the script says: at once).
"""
import json, math, os, random, struct, subprocess, sys, tempfile, wave

ROOT = os.path.join(os.path.dirname(__file__), '..')
SR = 44100
# gap before each line (seconds): scene breaks and held moments from the screenplay
GAP = {'L001': 1.5, 'L004': 3.5, 'L007': 3.0, 'L008': 3.0, 'L009': 3.0, 'L011': 1.2, 'L012': 2.5, 'L016': 1.0,
       'L020': 1.6, 'L021': 1.2, 'L022': 1.6, 'L023': 2.4, 'L024': 6.0, 'L025': 0.12, 'L026': 0.9, 'L027': 0.25}


def room_ir(path, rt=0.45, seconds=0.9, seed=7):
    """A small room: an exponentially decaying noise tail with a few early reflections, deterministic."""
    rnd = random.Random(seed); n = int(seconds * SR); k = 6.91 / rt
    early = {int(SR * t): g for t, g in ((0.0, 1.0), (0.007, 0.5), (0.013, 0.38), (0.019, 0.3), (0.027, 0.22))}
    s = [early.get(i, 0.0) + (0.32 * rnd.uniform(-1, 1) * math.exp(-k * i / SR) if i > SR * 0.01 else 0.0) for i in range(n)]
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, x)) * 32000)) for x in s))


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'audio/vo/readthrough.mp3')
    vmap = json.load(open(os.path.join(ROOT, 'audio/vo/voice_map.json')))
    tmp = tempfile.mkdtemp(); ir = os.path.join(tmp, 'room.wav'); room_ir(ir)
    chain = {
        'phone': 'highpass=f=90,equalizer=f=4200:t=q:w=1.2:g=2.5,acompressor=threshold=-24dB:ratio=3:attack=5:release=80',
        'bed':   'highpass=f=80',
        'room':  None, 'door': None,
    }
    wet = {'room': 0.16, 'door': 0.24}
    parts = []
    for lid in sorted(vmap):
        v = vmap[lid]; src = os.path.join(ROOT, v['file']); dst = os.path.join(tmp, lid + '.wav')
        gap = GAP.get(lid, 0.8)
        if v['as'] in wet:
            g = wet[v['as']]
            fc = (f"[0:a]aresample={SR},highpass=f=90,lowpass=f=11000,asplit[d][w];[w][1:a]afir=dry=0:wet=1[r];"
                  f"[d]volume=1.0[dd];[r]volume={g}[rr];[dd][rr]amix=inputs=2:duration=longest:normalize=0,apad=pad_dur=0.4,"
                  f"adelay={int(gap * 1000)}:all=1[o]")
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-i', ir, '-filter_complex', fc, '-map', '[o]', '-ac', '1', dst], check=True)
        else:
            af = f"aresample={SR},{chain[v['as']]},adelay={int(gap * 1000)}:all=1"
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', af, '-ac', '1', dst], check=True)
        parts.append(dst)
    lst = os.path.join(tmp, 'list.txt'); open(lst, 'w').write(''.join(f"file '{p}'\n" for p in parts))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-af', 'apad=pad_dur=1.5,loudnorm=I=-18:TP=-2',
                    '-c:a', 'libmp3lame', '-b:a', '160k', out], check=True)
    print('wrote', out)


if __name__ == '__main__':
    main()
