"""The rough cut's soundtrack: every voiced line at its place on the film's clock, with the first-pass treatments.

  node tools/cuesheet.js out/cuesheet.json && python3 tools/dialogue_track.py [out/dialogue.wav] [--mux picture.mp4 out.mp4]

Reads out/cuesheet.json (the 'voice' cues, in global seconds) and audio/vo/voice_map.json, treats each take as
tools/readthrough.py does (the phone dry, close and too clean; the real woman and him by day in the flat's room;
him in bed close), lays them on a silent track as long as the film, and levels it to -18 LUFS. With --mux it is
muxed over the exported picture. This is for watching the cut, not the mix: no beds, effects or score.
"""
import json, os, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(__file__))
from readthrough import room_ir, SR

ROOT = os.path.join(os.path.dirname(__file__), '..')


def treat(src, kind, ir, dst):
    if kind in ('room', 'door'):
        g = {'room': 0.16, 'door': 0.24}[kind]
        fc = (f"[0:a]aresample={SR},highpass=f=90,lowpass=f=11000,asplit[d][w];[w][1:a]afir=dry=0:wet=1[r];"
              f"[r]volume={g}[rr];[d][rr]amix=inputs=2:duration=longest:normalize=0,apad=pad_dur=0.4[o]")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-i', ir, '-filter_complex', fc, '-map', '[o]', '-ac', '1', dst], check=True)
    else:
        af = {'phone': 'highpass=f=90,equalizer=f=4200:t=q:w=1.2:g=2.5,acompressor=threshold=-24dB:ratio=3:attack=5:release=80',
              'bed': 'highpass=f=80'}[kind]
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', f'aresample={SR},{af}', '-ac', '1', dst], check=True)


def main():
    a = sys.argv[1:]
    out = a[0] if a and not a[0].startswith('--') else os.path.join(ROOT, 'out/dialogue.wav')
    cs = json.load(open(os.path.join(ROOT, 'out/cuesheet.json')))
    vmap = json.load(open(os.path.join(ROOT, 'audio/vo/voice_map.json')))
    tmp = tempfile.mkdtemp(); ir = os.path.join(tmp, 'room.wav'); room_ir(ir)
    voices = sorted((c for c in cs['cues'] if c['name'] == 'voice'), key=lambda c: c['tg'])
    inputs, filt = ['-f', 'lavfi', '-t', str(cs['total']), '-i', f'anullsrc=r={SR}:cl=mono'], []
    for i, c in enumerate(voices, start=1):
        lid = c['p']['id']; v = vmap[lid]; dst = os.path.join(tmp, lid + '.wav')
        treat(os.path.join(ROOT, v['file']), v['as'], ir, dst)
        inputs += ['-i', dst]; filt.append(f"[{i}:a]adelay={int(round(c['tg'] * 1000))}:all=1[v{i}]")
    mix = '[0:a]' + ''.join(f'[v{i}]' for i in range(1, len(voices) + 1))
    filt.append(f"{mix}amix=inputs={len(voices) + 1}:duration=first:normalize=0,loudnorm=I=-18:TP=-2,aresample=48000[o]")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filt), '-map', '[o]', '-ac', '2', out], check=True)
    print('wrote', out, len(voices), 'lines')
    if '--mux' in a:
        pic, dst = a[a.index('--mux') + 1], a[a.index('--mux') + 2]
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', pic, '-i', out, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                        '-c:a', 'aac', '-b:a', '192k', '-shortest', dst], check=True)
        print('muxed', dst)


if __name__ == '__main__':
    main()
