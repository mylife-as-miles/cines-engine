#!/usr/bin/env python3
"""Assemble the film from its takes in one pass: python3 tools/assemble.py edits/Q01_Q13_v2.json

The spec lists segments in order:
  {"out": "out/edits/Q01_Q13_v2.mp4", "lufs": -18,
   "segments": [{"file": "out/takes/Q01_t1.mp4", "from": 0, "to": null, "crop": null, "join": "cut"}, ...]}
- from / to: first and last frame kept (to = null: the last frame).
- crop: "w:h:x:y" applied before scaling to 854x480 (e.g. a 21:9 take cropped to 16:9).
- join: how this segment joins the one before it: "cut", or "dissolve:N" (N frames).
Each segment's sound is set to the same integrated loudness (a static gain, measured here) unless the spec sets
"gain" (dB), e.g. matched on dialogue level instead; "tail_db" eases a segment's last 2 s down. A limiter at
-1.5 dBFS follows, so no sequence clips. Cuts get 20 ms fades so they never click.
The output is 8-bit 4:2:0 H.264 (High profile), 48 kHz AAC, faststart: it plays on phones (lesson 51).
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 24


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def nframes(path):
    r = run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0',
             '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', path])
    return int(r.stdout.strip())


def lufs(path, a, b):
    r = run(['ffmpeg', '-hide_banner', '-nostats', '-ss', f'{a / FPS:.4f}', '-t', f'{(b - a + 1) / FPS:.4f}',
             '-i', path, '-af', 'ebur128', '-f', 'null', '-'])
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)
    return float(m[-1]) if m else None


def tail(s):
    """tail_db: ease the last 2 s down by this many dB (a busy street bed into a quiet one)."""
    x = float(s.get('tail_db', 0) or 0)
    if not x:
        return ''
    d, k = s['_dur'], 10 ** (-abs(x) / 20) - 1
    return f"volume='if(gt(t,{d - 2:.3f}),1+{k:.4f}*(t-{d - 2:.3f})/2,1)':eval=frame,"


def main():
    spec = json.load(open(sys.argv[1]))
    target = spec.get('lufs', -18)
    segs = spec['segments']
    args, chains = [], []
    for i, s in enumerate(segs):
        path = os.path.join(HERE, s['file'])
        args += ['-i', path]
        a = s.get('from') or 0
        b = s.get('to')
        if b is None:
            b = nframes(path) - 1
        s['_a'], s['_b'], s['_dur'] = a, b, (b - a + 1) / FPS
        level = lufs(path, a, b)
        gain = 0.0 if level is None else max(-12.0, min(12.0, target - level))
        if 'gain' in s:                      # a set gain (dB) wins over the measured one, e.g. matched on dialogue
            gain = float(s['gain'])
        s['_gain'] = gain
        crop = f"crop={s['crop']}," if s.get('crop') else ''
        chains.append(f"[{i}:v]trim=start_frame={a}:end_frame={b + 1},setpts=PTS-STARTPTS,{crop}"
                      f"scale=854:480,setsar=1,fps={FPS},format=yuv420p,settb=1/{FPS}[v{i}]")
        chains.append(f"[{i}:a]atrim=start={a / FPS:.5f}:end={(b + 1) / FPS:.5f},asetpts=PTS-STARTPTS,"
                      f"aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,apad,"
                      f"atrim=end={s['_dur']:.5f},volume={gain:.2f}dB,{tail(s)}alimiter=limit=0.841:level=false[a{i}]")
        print(f"{s['file']}: frames {a}-{b} ({s['_dur']:.2f} s), {level} LUFS -> gain {gain:+.1f} dB", flush=True)

    v, au, dur = 'v0', 'a0', segs[0]['_dur']
    for i in range(1, len(segs)):
        s, j = segs[i], segs[i].get('join', 'cut')
        if j.startswith('dissolve'):
            d = int(j.split(':')[1]) / FPS
            chains.append(f"[{v}][v{i}]xfade=transition=fade:duration={d:.5f}:offset={dur - d:.5f},settb=1/{FPS}[xv{i}]")
            chains.append(f"[{au}][a{i}]acrossfade=d={d:.5f}[xa{i}]")
            dur = dur + s['_dur'] - d
        else:
            chains.append(f"[{au}]afade=t=out:st={dur - 0.02:.5f}:d=0.02[fo{i}]")
            chains.append(f"[a{i}]afade=t=in:st=0:d=0.02[fi{i}]")
            chains.append(f"[{v}][fo{i}][v{i}][fi{i}]concat=n=2:v=1:a=1[cv{i}][xa{i}]")
            chains.append(f"[cv{i}]settb=1/{FPS},fps={FPS}[xv{i}]")   # concat leaves a microsecond timebase; xfade needs 1/24
            dur = dur + s['_dur']
        s['_at'] = dur - s['_dur']
        v, au = f'xv{i}', f'xa{i}'
    out = os.path.join(HERE, spec['out'])
    cmd = ['ffmpeg', '-v', 'error', '-y'] + args + ['-filter_complex', ';'.join(chains), '-map', f'[{v}]',
           '-map', f'[{au}]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
           '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', out]
    r = subprocess.run(cmd)
    if r.returncode:
        sys.exit('ffmpeg failed')
    print('joins (s):', ', '.join(f"{s['file'].split('/')[-1]}@{s['_at']:.2f}" for s in segs[1:]))
    print(f'wrote {spec["out"]}  ({dur:.2f} s)')


if __name__ == '__main__':
    main()
