#!/usr/bin/env python3
"""The council's sound for Q04 take 1 as mended (tools/fix_q04_t1.py), on the mended picture's clock. Local work only.

    /root/leonxlnx/earshot/.venv/bin/python tools/mix_q04.py   ->  out/edits/Q04_t1_fixed_mix.wav, stems in out/edits/stems_q04/

The clock is the mended picture's. Its first frame is the match cut out of movement I's still cup (cut v13): the
room, the bells and the cup's buzz are there on that frame. (Cut v10 had a black card here; cuts v11 and v12 a dissolve.)

  voices   the video model's, from the take. Its low drone is taken out (whatever holds still at each frequency for two
           seconds: tools/mix_vale.py, lesson 50) and the track high-passed. Shot 1's sound is dropped whole (a swell and
           the model's own buzz). The Hierophant's words are left as the take has them (no stretch, no cleaning). Only
           the lines, the cleared throat and the breaths beside them are used; between them the room is made here.
  air      the cathedral's wind at altitude, the same bed as movement I's Orison, quiet.
  bells    "bells are ringing that no one has rung": far tower bells, out of time with each other, generated locally
           with Stable Audio. They come in under the black and thin away before anyone speaks, so no bell lies under
           a word.
  buzz     the cup's gold foot shivering on the marble: generated locally with Stable Audio.
  levels   each line's loudest 400 ms set where movement I's lines sit in cut v9's master (-15.0 LUFS); the valley's name,
           heard from across the room, 4 LU under that.
"""
import importlib.util, json, os, subprocess, sys, tempfile
import numpy as np
import soundfile as sf
from scipy import signal, ndimage

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(HERE, *a)


def load(name):
    spec = importlib.util.spec_from_file_location(name, P('tools', name + '.py')); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


mb, mv = load('mix_bell'), load('mix_vale')
SR = mb.SR
lin, st, mono, fade, pan = mb.lin, mb.st, mb.mono, mb.fade, mb.pan
PRE = 0.0                                   # the council's clock is its picture's: frame 0 is the first frame of the matched dissolve
L_LINE = -15.0                              # where movement I's lines sit in cut v9's master (loudest 400 ms)
CLOCK = json.load(open(P('out/edits/Q04_t1_fixed.json')))
DUR = PRE + CLOCK['seconds']
N = int(round(DUR * SR))
SHOT = {s['shot'][0]: s for s in CLOCK['shots']}


def Z():
    return np.zeros((N, 2), np.float32)


def place(dst, x, t):
    i = int(round(t * SR))
    if i < 0: x, i = x[-i:], 0
    x = x[:max(0, len(dst) - i)]
    dst[i:i + len(x)] += x


def env(points):
    """Automation on the council clock: (seconds, dB) points; None is silence."""
    t = np.arange(N) / SR
    xs = [p[0] for p in points]; ys = [(-120.0 if p[1] is None else p[1]) for p in points]
    return lin(np.interp(t, xs, ys)).astype(np.float32)[:, None]


def sos(x, kind, fc, order=4):
    return signal.sosfiltfilt(signal.butter(order, fc, kind, fs=SR, output='sos'), x, axis=0).astype(np.float32)


def take_audio():
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', P(CLOCK['source']), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.float32).reshape(-1, 2).copy()


def stretch(x, speed):
    """Slower without a change of pitch (rubberband, through ffmpeg)."""
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, 'a.wav'), os.path.join(d, 'b.wav')
        sf.write(a, x, SR, subtype='FLOAT')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a, '-af', f'rubberband=tempo={speed}:transients=smooth:formant=preserved', '-c:a', 'pcm_f32le', b], check=True)
        y, _ = sf.read(b, always_2d=True)
    return y.astype(np.float32)


# ------------------------------------------------------------------ voices
SPEECH = [  # (name, shot, take seconds a-b, target LUFS or None to keep its level beside the line before it)
    ('a throat cleared', '2', 3.22, 3.78, None),
    ('L03', '3', 5.50, 10.58, L_LINE),
    ('L04', '4', 10.95, 13.25, L_LINE),
    ('L05, first part', '5', 14.22, 18.48, L_LINE),
    ('his breath out', '5', 18.48, 19.90, None),
    ('L05, the name', '6', 20.42, 21.40, L_LINE - 4.0),
]


RAW_WORDS = [(11.96, 13.12)]                 # take seconds: "Then let it be broken."


def voices(info):
    x = take_audio()
    clean = sos(mv.remove_steady(x, window_s=2.0, pct=25, over=1.5, floor=0.10), 'highpass', 70, 2)
    quiet = [(0.3, 2.4), (10.6, 10.95), (21.6, 23.9)]
    info['drone'] = {'before_dbfs': [round(float(mb.db(np.sqrt((mono(x)[int(a * SR):int(b * SR)] ** 2).mean()) + 1e-9)), 1) for a, b in quiet],
                     'after_dbfs': [round(float(mb.db(np.sqrt((mono(clean)[int(a * SR):int(b * SR)] ** 2).mean()) + 1e-9)), 1) for a, b in quiet],
                     'measured_in_take_s': quiet}
    # The Hierophant's words are the take's own sound, not the cleaned track (the author, 26 November: "restore back
    # Hierophant voice"): cuts v10 and v11 had slowed him to 0.84 speed and passed him through the drone removal, which
    # takes some of a deep voice with it. Only what lies under his pitch is filtered off; the gaps beside his words
    # stay cleaned.
    raw = sos(x, 'highpass', 60, 4)
    for wa, wb in RAW_WORDS:
        i, j, r = int(wa * SR), int(wb * SR), int(0.04 * SR)
        w = np.ones(j - i, np.float32); w[:r] = np.linspace(0, 1, r); w[-r:] = np.linspace(1, 0, r)
        clean[i:j] = clean[i:j] * (1 - w[:, None]) + raw[i:j] * w[:, None]
    out = Z()
    info['lines'] = {}
    for name, shot, a, b, target in SPEECH:
        s = SHOT[shot]
        seg = clean[int(a * SR):int(b * SR)].copy()
        if s['speed'] != 1.0:
            seg = stretch(seg, s['speed'])
        t = PRE + s['out_start_s'] + (a - s['src_start_s']) / s['speed']
        if target is not None:
            g = target - mb.lvl(seg, 'm')
            seg = seg * lin(g)
            if 'name' in name:
                seg = sos(seg, 'lowpass', 6000, 2)                               # from across the room
            info['lines'][name] = {'at_s': round(t, 3), 'to_s': round(t + len(seg) / SR, 3), 'gain_db': round(float(g), 1), 'loudest_400ms_lufs': round(float(mb.lvl(seg, 'm')), 1)}
            last_gain = g
        else:
            seg = seg * lin(last_gain if 'breath' in name else L_LINE - 12.0 - mb.lvl(seg, 'm'))
            info['lines'][name] = {'at_s': round(t, 3), 'to_s': round(t + len(seg) / SR, 3)}
        place(out, fade(seg, 0.03, 0.06), t)
    return out


# ------------------------------------------------------------------ made here
def air():
    w = st(mb.read_audio(P('audio/sfx/wind_altitude.flac')))
    reps = int(np.ceil(N / len(w))) + 1
    y = np.concatenate([w] * reps)[SR * 3:SR * 3 + N]
    y = sos(y, 'highpass', 150, 2)
    y = y * lin(-43.0 - mb.db(np.sqrt((mono(y) ** 2).mean()) + 1e-9))
    return y * env([(0, 0.0), (DUR, 0.0)])                                        # there at once: the picture cuts in, so the room does too


def bells():
    """Bells in far towers, swung by nothing but the tremor: uneven, never together.
    Generated locally with Stable Audio 3.0 Small SFX (audio/sfx/q04/bells_far.flac: "several church bells ringing far
    away in the distance, irregular, out of time with each other, outdoors, wind", seed 37, 10 s), played at 0.84 speed
    so the bells are larger and slower. Two synthesized versions came first and failed the ear-model: a series of
    partials read as a synthesizer pad, and a struck-bell design at four pitches as a music box."""
    x = st(mb.read_audio(P('audio/sfx/q04/bells_far.flac')))
    x = mb.varispeed(x, 0.84)
    x = sos(x, 'highpass', 140, 2)
    e = ndimage.maximum_filter1d(np.abs(mono(x)), SR // 100)
    on = int(np.argmax(e > 0.25 * e.max())) / SR                                  # its first stroke
    y = Z(); place(y, fade(x, 0.0, 1.0), 0.005 - on)                              # lands on the cut
    y = y * lin(-30.0 - mb.db(np.sqrt((mono(y)[int(0.8 * SR):int((PRE + 2.5) * SR)] ** 2).mean()) + 1e-9))
    first = PRE + SHOT['3']['out_start_s'] + 0.6                                 # his first word
    return y * env([(0, 0.0), (PRE + 2.6, 0.0), (PRE + 4.4, -7.0), (first - 0.25, None), (DUR, None)])


def buzz():
    """The cup's gold foot shivering on the marble. Generated locally with Stable Audio 3.0 Small SFX
    (audio/sfx/q04/cup_buzz.flac: "a small metal cup rattling and vibrating on a marble table, a fine continuous
    metallic buzz, close up", seed 5, 4 s). The ear-model takes it for a metal cup rattling on a stone table (99.9 %
    over the room's air); the video model's own buzz it took for hiss, and a synthesized train of ticks for crickets."""
    x = st(mb.read_audio(P('audio/sfx/q04/cup_buzz.flac')))
    dur = SHOT['1']['frames'] / 24.0
    x = sos(x[:int((dur + 0.25) * SR)], 'highpass', 300, 2)
    s = x * lin(L_LINE - 17.0 - mb.lvl(x, 'm'))
    out = Z()
    place(out, fade(s, 0.005, 0.3), PRE)                                          # with the cut
    return out


def main():
    info = {'clock_s': round(DUR, 4), 'pre_roll_s': PRE, 'picture': 'out/edits/Q04_t1_fixed.mp4'}
    stems = {'voices': voices(info), 'air': air(), 'bells': bells(), 'buzz': buzz()}
    mix = sum(stems.values())
    mix *= env([(0, 0.0), (DUR - 0.45, 0.0), (DUR, None)])                         # the work-in-progress end: sound out with the picture
    out, gr = mb.limiter(mix, -1.8)
    os.makedirs(P('out/edits/stems_q04'), exist_ok=True)
    for k, v in stems.items():
        sf.write(P('out/edits/stems_q04', k + '.wav'), v, SR, subtype='PCM_24')
    path = P('out/edits/Q04_t1_fixed_mix.wav')
    sf.write(path, out, SR, subtype='PCM_24')
    info['integrated_lufs'] = round(float(mb.integrated(out)), 1); info['true_peak_dbtp'] = round(float(mb.true_peak(out)), 1)
    info['limiter_max_reduction_db'] = round(float(-mb.db(gr.min())), 2)
    info['stems_lufs'] = {k: round(float(mb.integrated(v)), 1) for k, v in stems.items()}
    json.dump(info, open(path.replace('.wav', '.json'), 'w'), indent=1)
    print(json.dumps(info, indent=1))


if __name__ == '__main__':
    main()
