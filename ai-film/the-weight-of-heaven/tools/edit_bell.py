#!/usr/bin/env python3
"""Assemble movement I (the bell) from the takes in one pass: tools/edit_bell.py [out.mp4]

Pure editing: nothing is generated. The cut list is CUTS below (source, in, out, and an optional picture filter);
the sound is laid on separate tracks (production sound per take, the choir, the bell's tail, the applause, a very low
bed of air), mixed, then levelled with one linear gain to the loudness target without limiting.
Writes out/edits/<name>.mp4 and out/edits/<name>.edl.json (the decision list, for the record).
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = lambda n: os.path.join(HERE, 'out', 'takes', n + '.mp4')
FPS, W, H = 24, 992, 432
TARGET_LUFS, MAX_TP = -18.0, -1.5   # a film mix with wide dynamics: the stroke is the one loud event, lowered 5 dB rather than limited

# picture: (label, take, in, out, filter, purpose)
CUTS = [
    ('Q01 the rite',        'Q01_t1',  0.000, 16.292, None, 'The nave, the Hierophant, the couple and the bell, the answer from the gallery.'),
    ('Unread',              'Q02A_t2', 8.667, 11.375, None, 'The aide brings the warrant; her hand goes out; her eyes stay on the tower.'),
    ('The seal',            'Q02A_t2', 11.500, 14.875, None, 'The ring into the wax; the seal left on the page.'),
    ('The warrant lifted',  'Q02B_t1', 0.125, 1.042, None, 'The cause: the sealed warrant raised to the tower. Cut as the camera starts up.'),
    ('The barge lets go',   'Q02_t1',  13.625, 17.625, None, 'The effect, wide: the bell drops, the chains fall away.'),
    ('The hammer',          'Q02B_t1', 6.875, 10.625, 'crop=768:334:224:58,scale=992:432:flags=lanczos,unsharp=5:5:0.5',
                                                      'Drawn back, the swing, the stroke, a hold. Cropped so the ringers are out of frame; the ropes run off the left.'),
    ('The still cup',       'Q02_t1',  24.750, 26.000, "minterpolate=fps=48:mi_mode=mci:mc_mode=aobmc:vsbmc=1,setpts=2*PTS,fps=24",
                                                      'The first cup, as the author prefers; slowed to half speed so it can be read (Orison moves slowly).'),
]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr[-3000:])
    return r

def main():
    name = 'I_bell_v1'
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'out', 'edits', name + '.mp4')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    takes = sorted({c[1] for c in CUTS})
    idx = {t: i for i, t in enumerate(takes)}
    inputs = sum((['-i', T(t)] for t in takes), [])
    fc, labels, starts, t = [], [], [], 0.0
    for k, (label, take, a, b, vf, _) in enumerate(CUTS):
        dur = (b - a) * (2 if vf and 'setpts=2*PTS' in vf else 1)
        chain = f"[{idx[take]}:v]trim={a}:{b},setpts=PTS-STARTPTS" + (f",{vf}" if vf else '') + f",fps={FPS},scale={W}:{H},setsar=1,format=yuv420p[v{k}]"
        fc.append(chain); labels.append(f"[v{k}]"); starts.append(t); t += dur
    total = t
    fc.append(''.join(labels) + f"concat=n={len(CUTS)}:v=1:a=0[v]")
    S = dict(zip([c[0] for c in CUTS], starts))

    # sound: (name, take, in, out, timeline start, gain dB, fade in s, fade out s)
    A = [
        ('Q01 production',       'Q01_t1',  0.000, 17.400, 0.0, 0.0, 0.0, 1.1),                 # an L-cut: its tail fades under the choir
        ('choir (from Q02 t1)',  'Q02_t1',  0.000, 6.900, 11.4, 1.0, 1.5, 2.0),                 # under "What heaven has raised" and the answer, then over the cut
        ('Q02A production',      'Q02A_t2', 8.667, 14.875, S['Unread'], 0.0, 0.25, 0.05),
        ('lift + release',       'Q02_t1',  13.625 - (1.042 - 0.125), 17.625, S['The warrant lifted'], 0.0, 0.05, 0.05),   # the release's sound leads in under the lifted warrant
        ('hammer + stroke',      'Q02B_t1', 6.875, 12.000, S['The hammer'], -5.0, 0.05, 1.3),    # the bell's note hangs on over the cup
        ('applause',             'Q02B_t1', 11.700, 14.200, S['The still cup'], -2.0, 0.25, 0.5),
    ]
    amix = []
    for k, (nm, take, a, b, ts, g, fi, fo) in enumerate(A):
        d = b - a
        fc.append(f"[{idx[take]}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,"
                  f"afade=t=in:st=0:d={fi},afade=t=out:st={d - fo}:d={fo},volume={g}dB,adelay={int(ts * 1000)}:all=1[a{k}]")
        amix.append(f"[a{k}]")
    fc.append(f"anoisesrc=d={total}:c=pink:r=48000:a=0.5,highpass=f=120,lowpass=f=1400,volume=-46dB,aformat=channel_layouts=stereo[bed]")
    amix.append('[bed]')
    fc.append(''.join(amix) + f"amix=inputs={len(amix)}:normalize=0:duration=longest,atrim=0:{total},afade=t=out:st={total - 0.35}:d=0.35[mix]")

    tmp = out.replace('.mp4', '_premaster.mov')
    run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(fc), '-map', '[v]', '-map', '[mix]',
         '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s24le', '-t', str(total), tmp])
    # master: one linear gain to the target, capped so the true peak stays under MAX_TP (no limiter)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', tmp, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]); TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)[-1])
    gain = min(TARGET_LUFS - I, MAX_TP - 1.0 - TP)          # 1 dB kept back for AAC overshoot
    run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-c:v', 'copy', '-af', f'volume={gain:.2f}dB', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', out])
    os.remove(tmp)
    edl = {'name': name, 'fps': FPS, 'duration': round(total, 3), 'premaster': {'I': I, 'TP': TP, 'gain_dB': round(gain, 2)},
           'picture': [dict(n=k + 1, label=c[0], take=c[1], src_in=c[2], src_out=c[3], start=round(starts[k], 3), filter=c[4], purpose=c[5]) for k, c in enumerate(CUTS)],
           'sound': [dict(name=a[0], take=a[1], src_in=round(a[2], 3), src_out=a[3], start=round(a[4], 3), gain_dB=a[5], fade_in=a[6], fade_out=a[7]) for a in A]
                    + [dict(name='air bed', source='pink noise, 120 Hz to 1.4 kHz', gain_dB=-46)]}
    json.dump(edl, open(out.replace('.mp4', '.edl.json'), 'w'), indent=1)
    print(f"wrote {out}  {total:.3f} s  premaster I={I} LUFS TP={TP} dBFS  gain {gain:+.2f} dB")
    for k, c in enumerate(CUTS): print(f"  {k + 1} {starts[k]:6.3f}  {c[0]}")

if __name__ == '__main__':
    main()
