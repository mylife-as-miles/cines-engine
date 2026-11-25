#!/usr/bin/env python3
"""Build a cover shot (picture only) from pieces of takes, to stand in for a broken shot without a new generation:

    python3 tools/cover_shot.py edits/cover_Q13_wide.json

Spec: {"out": "out/takes/X.mp4", "frames": 83, "parts": [{"file": ..., "from": a, "to": b, "reverse": false}, ...],
       "dissolve": 3, "crop": "w:h:x:y"}
The parts are joined with an N-frame dissolve (as in the film), cropped (a push-in, so the cover reads as its own shot
and anything crossing the edges is left out), scaled back to 854x480 and retimed to exactly "frames" frames, so the
sound of the shot it replaces stays in sync (tools/assemble.py: "audio" with "audio_from").
Retiming blends neighbouring frames (ffmpeg framerate): use it on near-still pictures only, and only by a little.
A part may play backward ("reverse"): a still stretch played back then forward again keeps its own speed, where a
long retime would read as slow motion; turn at a frame where nothing moves.
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 24


def main():
    spec = json.load(open(os.path.join(HERE, sys.argv[1])))
    args, chains = [], []
    n = 0
    for i, p in enumerate(spec['parts']):
        args += ['-i', os.path.join(HERE, p['file'])]
        chains.append(f"[{i}:v]trim=start_frame={p['from']}:end_frame={p['to'] + 1},setpts=PTS-STARTPTS,"
                      f"fps={FPS},format=yuv420p,{'reverse,' if p.get('reverse') else ''}settb=1/{FPS}[p{i}]")
    v, dur, d = 'p0', (spec['parts'][0]['to'] - spec['parts'][0]['from'] + 1), spec.get('dissolve', 0)
    for i in range(1, len(spec['parts'])):
        p = spec['parts'][i]
        if d:
            chains.append(f"[{v}][p{i}]xfade=transition=fade:duration={d / FPS:.5f}:offset={(dur - d) / FPS:.5f},settb=1/{FPS}[x{i}]")
        else:
            chains.append(f"[{v}][p{i}]concat=n=2:v=1:a=0,settb=1/{FPS}[x{i}]")
        v, dur = f'x{i}', dur + (p['to'] - p['from'] + 1) - d
    k = spec['frames'] / dur
    crop = f"crop={spec['crop']}," if spec.get('crop') else ''
    retime = f"setpts={k:.6f}*PTS,framerate=fps={FPS},tpad=stop_mode=clone:stop=2," if abs(k - 1) > 1e-6 else ''
    chains.append(f"[{v}]{crop}scale=854:480:flags=lanczos,setsar=1,{retime}format=yuv420p[out]")
    out = os.path.join(HERE, spec['out'])
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + args + ['-filter_complex', ';'.join(chains), '-map', '[out]',
                    '-an', '-frames:v', str(spec['frames']), '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                    '-movflags', '+faststart', out], check=True)
    r = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
                        'stream=nb_read_frames', '-of', 'csv=p=0', out], capture_output=True, text=True)
    print(f"wrote {spec['out']}: {r.stdout.strip()} frames from {dur} source frames (retimed x{k:.2f})")


if __name__ == '__main__':
    main()
