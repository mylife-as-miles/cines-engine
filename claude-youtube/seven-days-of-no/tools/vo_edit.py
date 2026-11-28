"""Edit the author's voice-over into the narration track, and remap the word times onto the edited clock.

  python3 tools/vo_edit.py      -> out/vo/narration.wav (48 kHz mono, 24-bit) and audio/vo/words.json

The only edit is the slate read into the take ("Take six. Day five, Friday. The stranger. Clips five and six."),
cut from 108.20 to 113.30 s: both points sit inside pauses (107.77-108.58 and 112.49-113.60 s, below -45 dBFS), and
the join is a 30 ms equal-power crossfade, so no breath or word is touched. Every later word moves 5.10 s earlier.
"""
import json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'audio', 'vo', 'voice_2.mp3')
CUTS = [(108.20, 113.30)]                     # (start, end) in source seconds, removed
OUT = os.path.join(ROOT, 'out', 'vo', 'narration.wav')


def src_to_edit(t):
    """Source time -> edited time (None if the word was cut)."""
    shift = 0.0
    for a, b in CUTS:
        if t >= b: shift += b - a
        elif t >= a: return None
    return t - shift


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    (a, b), = CUTS
    fc = (f"[0:a]aresample=48000,asplit=2[x][y];[x]atrim=0:{a + 0.015},asetpts=PTS-STARTPTS[p];"
          f"[y]atrim={b - 0.015},asetpts=PTS-STARTPTS[q];[p][q]acrossfade=d=0.03:c1=qsin:c2=qsin[o]")
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', SRC, '-filter_complex', fc, '-map', '[o]',
                    '-c:a', 'pcm_s24le', OUT], check=True)
    words = json.load(open(os.path.join(ROOT, 'audio', 'vo', 'voice_2_words.json')))
    out, last = [], -1.0
    for w in words:
        t0, t1 = src_to_edit(w['t0']), src_to_edit(w['t1'])
        if t0 is None or t0 <= last + 0.01: continue        # cut, or a duplicate from overlapping Whisper windows
        out.append({'w': w['w'], 't0': round(t0, 2), 't1': round(t1 if t1 is not None else t0 + 0.3, 2)}); last = t0
    json.dump({'source': 'audio/vo/voice_2.mp3', 'cuts_src_s': CUTS, 'words': out},
              open(os.path.join(ROOT, 'audio', 'vo', 'words.json'), 'w'), indent=0)
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]))
    print(f'{OUT}: {dur:.2f} s; {len(out)} words on the edited clock')


if __name__ == '__main__':
    main()
