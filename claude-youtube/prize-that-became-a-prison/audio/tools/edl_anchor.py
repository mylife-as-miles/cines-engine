"""Resolve the sound plan's EDL anchors to times on the edit's clock (design/edit/EDL.json).

Every cue, bed edge and silence edge in audio/cues.json can carry an `edl` anchor: the shot or the narration segment
it belongs to, so a re-cut (a new EDL) moves it with its picture or its words. audio/tools/retime.py writes the
resolved times into the sheet; audio/tools/mix.py resolves them again against the voice as actually placed (a final
read whose lines run longer than the scratch moves the word anchors with it).

An anchor is a dict:

    {"shot": "00-12"}                          the shot's first frame
    {"shot": "03-15", "offset_s": 4.05}        4.05 s into the shot (graphics pieces: the piece's own timing)
    {"shot": "09-18", "at": "end"}             the shot's last frame + 1 (the next cut)
    {"voice": "05.07"}                         the narration segment's start (holds and silences are segments too)
    {"voice": "04.07", "at": "speech_end"}     where its speech ends (start + speech)
    {"voice": "00.sil1", "at": "end"}          the segment's end in the EDL (its breath or hold included)
    {"voice": "05.07", "word_s": 0.84}         a word, 0.84 s into the scratch read of the line; with another read
                                               it is scaled by that read's length over the scratch length
    {"t": 12.5}                                an absolute time (avoid: it does not follow a re-cut)

plus an optional "offset_s" on any of them.
"""
import json


class EDL:
    def __init__(self, path, voice_actual=None, scratch_len=None):
        e = json.load(open(path))
        self.path, self.fps, self.duration = path, e['fps'], e['duration']
        self.total_frames = e['total_frames']
        self.shots = {s['id']: s for s in e['shots']}
        self.voice = {v['id']: v for v in e['voice']}
        self.order = [v['id'] for v in e['voice']]
        # voice_actual: {id: (start_s, dur_s)} from the mix's placement of a read; scratch_len: {id: seconds}
        self.actual = voice_actual or {}
        self.scratch_len = scratch_len or {}

    def shot_start(self, sid):
        return self.shots[sid]['start_frame'] / self.fps

    def shot_end(self, sid):
        s = self.shots[sid]
        return (s['start_frame'] + s['frames']) / self.fps

    def resolve(self, a):
        if a is None:
            return None
        off = float(a.get('offset_s', 0.0))
        if 't' in a:
            return round(float(a['t']) + off, 4)
        if 'shot' in a:
            sid = a['shot']
            if sid not in self.shots:
                raise KeyError(f'anchor names shot {sid!r}, which is not in {self.path}')
            base = self.shot_end(sid) if a.get('at') == 'end' else self.shot_start(sid)
            return round(base + off, 4)
        if 'voice' in a:
            vid = a['voice']
            if vid not in self.voice:
                raise KeyError(f'anchor names voice segment {vid!r}, which is not in {self.path}')
            v = self.voice[vid]
            start, speech = v['start'], v.get('speech', 0.0)
            if vid in self.actual:                       # the read as the mix placed it
                start, speech = self.actual[vid]
            at = a.get('at', 'start')
            if 'word_s' in a:
                w = float(a['word_s'])
                ref = self.scratch_len.get(vid) or v.get('speech') or 0.0
                if vid in self.actual and ref:
                    w *= speech / ref
                return round(start + w + off, 4)
            if at == 'start':
                return round(start + off, 4)
            if at == 'speech_end':
                return round(start + speech + off, 4)
            if at == 'end':
                end = v['end'] if vid not in self.actual else start + speech + (v['end'] - v['start'] - v.get('speech', 0.0))
                return round(end + off, 4)
            raise ValueError(f'unknown voice anchor point {at!r}')
        raise ValueError(f'not an anchor: {a!r}')

    def describe(self, a):
        """A short readable form of an anchor, for the sheet's notes and the report."""
        if not a:
            return ''
        off = a.get('offset_s', 0.0)
        o = f' {off:+.3f} s' if off else ''
        if 'shot' in a:
            return f"shot {a['shot']}{' end' if a.get('at') == 'end' else ''}{o}"
        if 'voice' in a:
            if 'word_s' in a:
                return f"voice {a['voice']} word @{a['word_s']:.2f} s{o}"
            return f"voice {a['voice']} {a.get('at', 'start')}{o}"
        return f"t {a.get('t')}{o}"
