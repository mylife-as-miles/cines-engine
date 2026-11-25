#!/usr/bin/env python3
"""Export the cut as an editorial timeline any NLE can open: OpenTimelineIO (.otio), CMX3600 (.edl) and Final Cut 7 XML
(.xml, which DaVinci Resolve and Premiere import), from the edit decision list tools/assemble.py writes.

    /home/user/ocio/.venv/bin/python tools/edl_to_otio.py out/edits/Q01_Q13_v8.edl.json edits/Q01_Q13_v8

One video track: each segment is a clip of its take (media path relative to the production folder, source range in
frames at 24 fps); a "dissolve:N" join becomes an N-frame SMPTE dissolve centred on the cut, a "cut" a straight cut.
Sound goes with the picture here (the mix is built separately; tools/sound_mix.py and audio/sound_plan.json).
Import the EDL or XML into a test project and check the first events before trusting the rest: reel names and frame
rates vary by NLE (Benitoow cinema-skills, cut-list).
"""
import json, os, sys
import opentimelineio as otio

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 24


def rt(frames):
    return otio.opentime.RationalTime(frames, FPS)


_LEN = {}


def length(path):
    """a source file's frame count (FCP XML needs each file's available range)"""
    if path not in _LEN:
        import subprocess
        r = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
                            'stream=nb_read_frames', '-of', 'csv=p=0', os.path.join(HERE, path)], capture_output=True, text=True)
        _LEN[path] = int(r.stdout.strip())
    return _LEN[path]


def main():
    edl = json.load(open(os.path.join(HERE, sys.argv[1])))
    base = os.path.join(HERE, sys.argv[2])
    tl = otio.schema.Timeline(name=os.path.basename(base), global_start_time=rt(3600 * FPS))   # starts at 01:00:00:00
    v = otio.schema.Track(name='V1', kind=otio.schema.TrackKind.Video)
    tl.tracks.append(v)
    segs = edl['segments']
    for i, s in enumerate(segs):
        name = os.path.splitext(os.path.basename(s['file']))[0]
        ref = otio.schema.ExternalReference(target_url=s['file'],
                                            available_range=otio.opentime.TimeRange(rt(0), rt(length(s['file']))))
        a, b = s['from'], s['to']
        # the assembler overlaps clips at a dissolve; OTIO centres an N-frame dissolve on the cut and borrows handles,
        # so the outgoing clip ends N - N//2 frames early and the incoming one starts N//2 frames late
        j = s.get('join', 'cut')
        if i and j.startswith('dissolve'):
            n = int(j.split(':')[1]); a += n // 2
        nxt = segs[i + 1].get('join', 'cut') if i + 1 < len(segs) else 'cut'
        if nxt.startswith('dissolve'):
            n2 = int(nxt.split(':')[1]); b -= n2 - n2 // 2
        clip = otio.schema.Clip(name=f"{i + 1:03d} {name}", media_reference=ref,
                                source_range=otio.opentime.TimeRange(rt(a), rt(b - a + 1)))
        clip.metadata['cines'] = {k: s.get(k) for k in ('join', 'at', 'crop', 'gain_db', 'audio', 'audio_from', 'tail_db', 'head_db')}
        if i and j.startswith('dissolve'):
            v.append(otio.schema.Transition(name=f'dissolve {n}f', transition_type=otio.schema.TransitionTypes.SMPTE_Dissolve,
                                            in_offset=rt(n // 2), out_offset=rt(n - n // 2)))
        v.append(clip)
    otio.adapters.write_to_file(tl, base + '.otio')
    otio.adapters.write_to_file(tl, base + '.xml', adapter_name='fcp_xml')
    try:
        otio.adapters.write_to_file(tl, base + '.edl', adapter_name='cmx_3600')
    except Exception as e:                      # CMX can't express every transition layout; the .otio and .xml carry it
        print('EDL:', e)
    dur = tl.duration().to_seconds()
    print(f"wrote {sys.argv[2]}.otio/.xml/.edl: {len(edl['segments'])} clips, {dur:.2f} s (the assembler's cut: {edl['duration']:.2f} s)")


if __name__ == '__main__':
    main()
