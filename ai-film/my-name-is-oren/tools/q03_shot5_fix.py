#!/usr/bin/env python3
"""Re-pace Helena's rushed line in Q03 take 1, shot 5 ("Right. Right, sorry. Recognising you as an individual and
stuff. I didn't mean any offence."), in the edit, with no new generation.

    python3 tools/q03_shot5_fix.py            (from the production folder)

Writes two versions to out/edits/ for comparison:
  v1  the simple fix: the whole of shot 5 (13.04–17.05 s) slowed to 75 %, picture and sound together
      (sound with rubberband, so her pitch holds). Her closed eyes stay in.
  v2  the edit fix: each phrase slowed to 72 % with short pauses of the street's own room tone between them,
      and the closed-eye stretch covered by Oren listening (from shot 2's opening, slowed; he is still, so it
      barely shows). Her face returns only where her eyes are open (15.62 s on), with picture and sound slowed
      together so her lips stay in sync.
Both drop t1's stray first frame. The phrase times come from a 20 ms voice-band map of the take.
"""
import os, subprocess

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, 'out', 'takes', 'Q03_t1.mp4')
OUT = os.path.join(HERE, 'out', 'edits')
F0 = 1 / 24            # t1's first frame is a stray frame
TEMPO = 0.72           # v2 phrase speed
CUT6 = 17.05           # her last word ends ~17.02; Oren's line starts at 17.10

def run(args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + args, check=True)

def v1():
    k = 0.75
    fc = (f"[0:v]trim={F0}:13.04,setpts=PTS-STARTPTS[a];"
          f"[0:v]trim=13.04:{CUT6},setpts=(PTS-STARTPTS)/{k},fps=24[b];"
          f"[0:v]trim={CUT6}:20,setpts=PTS-STARTPTS[c];"
          f"[0:a]atrim={F0}:13.04,asetpts=PTS-STARTPTS[x];"
          f"[0:a]atrim=13.04:{CUT6},asetpts=PTS-STARTPTS,rubberband=tempo={k}:formant=preserved,apad=whole_dur={(CUT6 - 13.04) / k:.4f},atrim=0:{(CUT6 - 13.04) / k:.4f}[y];"
          f"[0:a]atrim={CUT6}:20,asetpts=PTS-STARTPTS[z];"
          "[a][x][b][y][c][z]concat=n=3:v=1:a=1[v][o]")
    out = os.path.join(OUT, 'Q03_t1_fix_v1_slow75.mp4')
    run(['-i', SRC, '-filter_complex', fc, '-map', '[v]', '-map', '[o]', '-c:v', 'libx264', '-crf', '17',
         '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', out])
    return out

def v2():
    # audio pieces: (start, end, tempo) from the source; ('rt', dur) = room tone from the quiet lead-in 13.10–13.50
    P = [(13.04, 13.96, 1.0),              # lead-in: eyes open, then down (her glance)
         (13.96, 14.18, TEMPO), ('rt', 0.35),   # "Right."
         (14.38, 14.98, TEMPO), ('rt', 0.40),   # "Right, sorry."
         (14.98, CUT6, TEMPO)]                  # "Recognising you as an individual and stuff. I didn't mean any offence."
    # The last phrase is slowed in one pass (cutting it mid-phrase made rubberband return 0.16 s short), and every
    # slowed piece is padded and trimmed to its exact length, so her face (15.62 s on) stays in sync with its sound.
    FACE = 15.62
    fc, labels, t = [], [], 0.0
    marks = {}
    for i, p in enumerate(P):
        if p[0] == 'rt':
            d = p[1]
            fc.append(f"[0:a]atrim=13.10:{13.10 + d},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={d - 0.02}:d=0.02[s{i}]")
        else:
            a, b, k = p
            stretch = f",rubberband=tempo={k}:formant=preserved" if k != 1.0 else ""
            d = (b - a) / k
            exact = f",apad=whole_dur={d:.4f},atrim=0:{d:.4f}" if k != 1.0 else ""
            fc.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS{stretch}{exact},afade=t=in:d=0.01,afade=t=out:st={d - 0.01:.3f}:d=0.01[s{i}]")
            if a <= FACE < b:
                marks['face'] = t + (FACE - a) / k
        labels.append(f"[s{i}]"); t += d
    total5 = t
    fc.append(f"{''.join(labels)}concat=n={len(labels)}:v=0:a=1[a5]")
    # picture: her lead-in 13.04–13.79 (eyes open, then a glance down), Oren listening until her face returns,
    # then her face 15.62–CUT6 slowed by the same TEMPO as its sound
    her1 = 0.75
    oren = marks['face'] - her1
    oren_src = 1.8                                   # shot 2's opening, 3.25–5.05 s, before he looks away
    fc.append(f"[0:v]trim=13.04:{13.04 + her1},setpts=PTS-STARTPTS[p1]")
    fc.append(f"[0:v]trim=3.25:{3.25 + oren_src},setpts=(PTS-STARTPTS)*{oren / oren_src:.4f},fps=24[p2]")
    fc.append(f"[0:v]trim={FACE}:{CUT6},setpts=(PTS-STARTPTS)/{TEMPO},fps=24[p3]")
    fc.append("[p1][p2][p3]concat=n=3:v=1:a=0[v5]")
    fc.append(f"[0:v]trim={F0}:13.04,setpts=PTS-STARTPTS[va];[0:a]atrim={F0}:13.04,asetpts=PTS-STARTPTS[aa]")
    fc.append(f"[0:v]trim={CUT6}:20,setpts=PTS-STARTPTS[vc];[0:a]atrim={CUT6}:20,asetpts=PTS-STARTPTS[ac]")
    fc.append("[va][aa][v5][a5][vc][ac]concat=n=3:v=1:a=1[v][o]")
    out = os.path.join(OUT, 'Q03_t1_fix_v2_paced.mp4')
    run(['-i', SRC, '-filter_complex', ';'.join(fc), '-map', '[v]', '-map', '[o]', '-c:v', 'libx264', '-crf', '17',
         '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', out])
    print(f"v2 shot 5: {total5:.2f} s (was {CUT6 - 13.04:.2f}); Oren covers {her1:.2f}–{marks['face']:.2f} s of it; "
          f"her face returns at {marks['face']:.2f} s")
    return out

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for f in (v1(), v2()):
        d = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f],
                           capture_output=True, text=True).stdout.strip()
        print(os.path.relpath(f, HERE), d, 's')
