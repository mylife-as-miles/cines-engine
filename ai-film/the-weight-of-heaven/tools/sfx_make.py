#!/usr/bin/env python3
"""The Weight of Heaven: the sound foundry. Every file in audio/sfx/ and audio/choir/ is re-made from this script.

Run it with earshot's Python (numpy, scipy, soundfile, soxr, librosa; earshot itself for `check` and for the sounds
that come from earshot's catalogue):

    PY=/root/leonxlnx/earshot/.venv/bin/python
    $PY tools/sfx_make.py list                      the sounds and how each is made
    $PY tools/sfx_make.py take NAME [--seed N]      one raw Stable Audio audition take -> audio/gen/ (git-ignored)
    $PY tools/sfx_make.py make NAME|all [--force] [--no-check]
                                                    the delivered file -> audio/sfx/*.flac or audio/choir/*.flac,
                                                    measured, checked with earshot, written into the manifest
    $PY tools/sfx_make.py check NAME|all            earshot match + probes again, written into the manifest
    $PY tools/sfx_make.py manifest                  rewrite audio/sfx/manifest.json and audio/CREDITS.md

Three kinds of source, nothing paid:
  * Stable Audio 3.0 Small (SFX and Music fine-tunes, q8_0 GGUF) on CPU through audio.cpp, one take at a time,
    --threads 2 (Stability AI Community License). audio.cpp writes 44.1 kHz stereo; raw takes are cached in
    audio/gen/ by model, seed, duration and a hash of the prompt. Takes are asked for as 32-bit float WAV
    (--out-format float32). audio.cpp clamps at full scale whatever the format, so every raw take is checked for
    samples at full scale and the count is recorded.
  * numpy synthesis (the bell body, the swing, the wind, the hall impulse, the sub under the landing): original,
    seeded, exact.
  * CC0 recordings already committed in this repository (claude-film/one-too-many/audio/sfx, Freesound CC0) and
    earshot's own catalogue (`earshot make`, MIT; its realistic designs are computed from public-domain recordings).

Finishing (sound.md section 3): 48 kHz (soxr), onset trimmed (first 1 ms frame within 40 dB of the peak, cut 3 ms
early, 2 ms de-click), peak-normalised to -1 dBFS, raised-cosine fade-out, 24-bit FLAC. Loop-safe beds are not faded:
they are seamless at the wrap instead. The hall impulse is normalised to unit energy, not to peak.

Each sound is a make_<name> function registered with @sound: what it is, its licence, the description and the
alternatives earshot is asked to choose between, and any caveat. PLAN data (prompts, seeds) is in CHOIR, CHOIR_B and
TAKES; what else was tried, with its measured result, is in CANDIDATES. The pass rule is RULE: a fail is evidence for
a person's ears, not a veto, and failed sounds are delivered as failed.

Environment: AUDIOCPP_CLI (audio.cpp binary), SOUNDBOX_DATA_DIR (holds the GGUF weights), SFX_THREADS (default 2).
Setting up the tools: .claude/skills/cines-engine/references/sound.md section 1. With the current Soundbox the
weights come with `node server/dist/cli.js pull audiocpp-stable-audio-3-sfx` (and `...-small-music`).
"""
import argparse, hashlib, json, os, subprocess, sys, time, warnings

import numpy as np
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(ROOT))
GEN = os.path.join(ROOT, 'audio', 'gen')
MANIFEST = os.path.join(ROOT, 'audio', 'sfx', 'manifest.json')
CREDITS = os.path.join(ROOT, 'audio', 'CREDITS.md')
SR = 48000
HOME = os.path.expanduser('~')
AUDIOCPP = os.environ.get('AUDIOCPP_CLI', f'{HOME}/0xshug0/audio.cpp/build/linux-cpu-release/bin/audiocpp_cli')
DATA = os.environ.get('SOUNDBOX_DATA_DIR', f'{HOME}/.soundbox')
THREADS = os.environ.get('SFX_THREADS', '2')
GGUF = {
    'sfx': f'{DATA}/models/audiocpp/Stable-Audio-3-Small-SFX-GGUF/stable-audio-3-small-sfx-q8_0.gguf',
    'music': f'{DATA}/models/audiocpp/Stable-Audio-3-Small-Music-GGUF/stable-audio-3-small-music-q8_0.gguf',
}
MODEL_NAME = {
    'sfx': 'Stable Audio 3.0 Small SFX (stable-audio-3-small-sfx-q8_0.gguf, audio.cpp on CPU)',
    'music': 'Stable Audio 3.0 Small Music (stable-audio-3-small-music-q8_0.gguf, audio.cpp on CPU)',
}
LIC_SA = 'Stability AI Community License (free below USD 1M annual revenue); https://stability.ai/license'
LIC_SYN = 'original synthesis (numpy, this script); no third-party material'
LIC_CC0 = 'CC0 1.0 (public domain)'
LIC_EARSHOT = ('earshot catalogue design (earshot is MIT; its realistic designs are computed from public-domain '
               'recordings; no audio file ships)')
STEPS, CFG = 8, 1.0
OTM = os.path.join(REPO, 'claude-film', 'one-too-many', 'audio', 'sfx')   # committed CC0 recordings (Freesound)


# ---------------------------------------------------------------------------------------------- small helpers

def db(v):
    return float(20 * np.log10(max(float(v), 1e-12)))


def lin(d):
    return 10 ** (d / 20)


def stereo(x):
    x = np.asarray(x, np.float64)
    return np.stack([x, x], 1) if x.ndim == 1 else x


def mono(x):
    x = np.asarray(x, np.float64)
    return x if x.ndim == 1 else x.mean(1)


def read(path):
    """any audio file -> float64 (n, ch) at 48 kHz (soxr VHQ)"""
    import soxr
    x, sr = sf.read(path, always_2d=True, dtype='float64')
    return x if sr == SR else soxr.resample(x, sr, SR, quality='VHQ')


def rcos_in(n):
    return 0.5 - 0.5 * np.cos(np.pi * np.arange(n) / max(n, 1))


def rcos_out(n):
    return 0.5 + 0.5 * np.cos(np.pi * np.arange(1, n + 1) / max(n, 1))


def fade(x, fin=0.0, fout=0.0):
    y = np.array(x, np.float64)
    a, b = min(int(fin * SR), len(y)), min(int(fout * SR), len(y))
    sh = (slice(None), None) if y.ndim == 2 else (slice(None),)
    if a:
        y[:a] *= rcos_in(a)[sh]
    if b:
        y[len(y) - b:] *= rcos_out(b)[sh]
    return y


def onset(x, thr_db=-40.0, hold=(3, 10)):
    """sample index of the first audible energy: the first 1 ms frame within 40 dB of the peak that is held in 3 of
    the next 10 frames (an isolated click does not count)"""
    fr = SR // 1000
    env = np.abs(stereo(x)).max(axis=1)
    m = len(env) // fr
    fpk = env[:m * fr].reshape(m, fr).max(axis=1)
    loud = fpk >= fpk.max() * lin(thr_db)
    need, span = hold
    held = np.convolve(loud.astype(int), np.ones(span, int))[span - 1:]
    first = np.flatnonzero(loud & (held >= min(need, int(loud.sum()))))
    return int(first[0]) * fr if len(first) else 0


def true_peak(x):
    """the inter-sample peak, from 4x oversampling"""
    import soxr
    return float(np.abs(soxr.resample(np.asarray(x, np.float64), SR, 4 * SR, quality='VHQ')).max())


def finish(x, trim=True, fout=0.15, fin=0.002, peak_db=-1.0, length=None):
    """a take at 48 kHz -> the sound as the mix gets it"""
    y = np.array(x, np.float64)
    cut = max(0, onset(y) - int(0.003 * SR)) if trim else 0
    y = y[cut:]
    if length:
        y = y[:int(round(length * SR))]
    y = fade(y, fin, fout)
    gain = lin(peak_db) / np.abs(y).max()
    rec = {'onset_trim_ms': round(1000 * cut / SR, 1)}
    tp = true_peak(y * gain)
    if tp > lin(-0.3):                       # a very bright transient: its inter-sample peak would pass full scale
        gain *= lin(peak_db) / tp
        rec['true_peak_limited'] = f'gain set by the true peak ({peak_db:g} dBTP), not the sample peak'
    rec['gain_db'] = round(db(gain), 2)
    return y * gain, rec


def write_flac(path, x):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.partial.flac'
    sf.write(tmp, np.asarray(x, np.float64), SR, subtype='PCM_24', format='FLAC')
    os.replace(tmp, path)


def lp(fc, order=4):
    return lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order))


def hp(fc, order=2):
    return lambda f: 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-9)) ** (2 * order))


def butter(x, fc, kind, order=2):
    sos = signal.butter(order, fc, kind, fs=SR, output='sos')
    return signal.sosfiltfilt(sos, x, axis=0)


def pitch_speed(x, ratio):
    """varispeed: ratio < 1 plays slower and lower (a bigger, heavier source), like tape"""
    import soxr
    return soxr.resample(x, SR, int(round(SR / ratio)), quality='VHQ')


def loopify(x, length, xfade):
    """a seamless loop of `length` s cut from a longer take: the `xfade` s after the cut are cross-faded (equal
    power) over the loop's first `xfade` s, so the wrap from the last sample to the first is continuous audio"""
    n, k = int(round(length * SR)), int(round(xfade * SR))
    x = stereo(x)
    assert len(x) >= n + k, 'take too short for this loop'
    y = np.array(x[:n])
    a = np.sin(0.5 * np.pi * np.arange(k) / k)[:, None]
    y[:k] = x[:k] * a + x[n:n + k] * np.sqrt(1 - a ** 2)
    return y


# ---------------------------------------------------------------------------------------------- Stable Audio

def sa_path(model, prompt, dur, seed, steps=STEPS, cfg=CFG):
    h = hashlib.sha1(f'{prompt}|{steps}|{cfg}'.encode()).hexdigest()[:8]
    return os.path.join(GEN, f'sa_{model}_s{seed}_d{dur:g}_{h}.f32.wav')


def sa(model, prompt, dur, seed, steps=STEPS, cfg=CFG, quiet=False):
    """one Stable Audio take (cached in audio/gen/), returned at 48 kHz with what the raw file measured"""
    path = sa_path(model, prompt, dur, seed, steps, cfg)
    if not os.path.exists(path):
        for p in (AUDIOCPP, GGUF[model]):
            if not os.path.isfile(p):
                sys.exit(f'sfx_make: missing {p} (see sound.md section 1)')
        os.makedirs(GEN, exist_ok=True)
        tmp = path[:-4] + '.partial.wav'
        t0 = time.time()
        r = subprocess.run([AUDIOCPP, '--task', 'gen', '--family', 'stable_audio', '--model', GGUF[model],
                            '--backend', 'cpu', '--threads', THREADS, '--text', prompt, '--out', tmp,
                            '--num-inference-steps', str(steps), '--guidance-scale', f'{cfg:.3f}',
                            '--duration-seconds', f'{dur:.3f}', '--seed', str(seed), '--out-format', 'float32'],
                           stdin=subprocess.DEVNULL, capture_output=True, text=True)
        if r.returncode or not os.path.isfile(tmp):
            raise RuntimeError('audio.cpp failed:\n' + '\n'.join((r.stdout + r.stderr).strip().splitlines()[-12:]))
        os.replace(tmp, path)
        if not quiet:
            print(f'  generated {os.path.basename(path)} in {time.time() - t0:.0f} s', flush=True)
    raw, rsr = sf.read(path, always_2d=True)
    pk = float(np.abs(raw).max())
    if pk < lin(-70):
        raise RuntimeError(f'near-silent take ({path})')
    # audio.cpp clamps its output at full scale even as float: a take that reaches it is clipped where it does.
    # The record says how many samples and where, so a clipped stretch can be cut away or the take rejected.
    hot = np.flatnonzero(np.abs(raw).max(axis=1) >= 0.9999)
    rec = {'raw': os.path.relpath(path, ROOT), 'raw_peak_dbfs': round(db(pk), 2), 'raw_clipped_samples': int(len(hot))}
    if len(hot):
        rec['raw_clipped_between_s'] = [round(float(hot[0] / rsr), 2), round(float(hot[-1] / rsr), 2)]
    return read(path), rec


def sa_how(model, prompt, dur, seed, steps=STEPS, cfg=CFG):
    return {'method': 'generated', 'model': MODEL_NAME[model], 'prompt': prompt, 'seed': seed, 'steps': steps,
            'guidance_scale': cfg, 'asked_duration_s': dur, 'threads': int(THREADS)}


def earshot_make(sound_id, seed=0, dur=None):
    """one design from earshot's catalogue (no model, computed), cached in audio/gen/"""
    path = os.path.join(GEN, f'earshot_{sound_id.replace("/", "-")}_s{seed}' + (f'_d{dur:g}' if dur else '') + '.wav')
    if not os.path.exists(path):
        from earshot import api
        os.makedirs(GEN, exist_ok=True)
        api.make(sound=sound_id, out=path, seed=seed, dur=dur)
    return read(path)


def cc0(name):
    """a CC0 recording committed in this repository (One Too Many's library; credits in PLAN)"""
    return read(os.path.join(OTM, name + '.flac'))


# ---------------------------------------------------------------------------------------------- the plan: prompts

# The text encoder ignores negation, so the prompts only say what is wanted ("a cappella", "voices only").
CHOIR = {
    'choir_1_mixed_sustained': (
        "A large mixed cathedral choir, sopranos, altos, tenors and basses, singing slow sustained wordless vowels "
        "a cappella: long held 'ah' chords that change every eight seconds, open fifths and suspended harmony in "
        "C minor, very slow, 40 BPM. Sacred, solemn, restrained, soft. Recorded far back in a vast stone cathedral "
        "with very long reverberation."),
    'choir_2_low_men_drone': (
        "A men's choir of deep basses and baritones, monastic, singing one dark sustained wordless drone on a low C "
        "with a fifth above it, a cappella, barely moving, very slow, quiet. Sacred, solemn, heavy. A vast stone "
        "cathedral, very long reverberation."),
    'choir_3_hollow_halo': (
        "A cappella sacred choir in a vast stone cathedral heard from far away: deep basses hold one low pedal note "
        "on C while distant high sopranos sustain a soft pure halo of wordless 'oo' far above, slowly swelling and "
        "fading like breathing. Hollow, weightless, solemn, restrained, very slow, enormous reverberation."),
}
CHOIR_DUR = 32.0
# second wordings, tried after the first takes of candidates 2 and 3 read to earshot as a synthesizer pad, not voices
CHOIR_B = {
    'choir_2_low_men_drone': (
        "A monastery choir of men's voices, basses and baritones, chanting one long sustained wordless 'oh' on a low "
        "note with a fifth above it, slow monastic chant, human voices, a cappella, dark and solemn, in a vast stone "
        "cathedral with very long reverberation."),
    'choir_3_humming': (
        "A very large choir of men and women humming softly with closed mouths, a cappella: one slow sustained hummed "
        "chord that swells and fades like breathing, pianissimo, solemn, sacred, human voices, in a vast stone "
        "cathedral with very long reverberation."),
    'choir_3_held_fifth': (
        "A large mixed cathedral choir holds one single sustained open fifth, C and G, on a wordless 'ah' for the "
        "whole time without changing chord: one long unbroken held note that swells very slowly, a cappella, human "
        "voices, solemn, sacred, restrained. Recorded far back in a vast stone cathedral with very long "
        "reverberation."),
}


# ---------------------------------------------------------------------------------------------- synthesis

BELL_MAIN_HZ = 191.7   # the film stroke's main partial, measured in out/takes/Q02B_t1.mp4 (9.4-12.4 s)


def synth_bell_body(f_main=BELL_MAIN_HZ, dur=22.0, seed=48):
    """The body of a house-sized bell, to lie under the film's own stroke: a hum two octaves under the stroke's main
    partial and a prime one octave under it, each a slowly beating doublet (the two halves of the pair sit slightly
    left and right, so the beat drifts across the image and the mono sum stays whole), a quiet partial exactly on the
    stroke's own main partial, and a soft low strike. Nothing between 100 and 190 Hz, where the film stroke has its
    own partials (135, 172 Hz)."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    #        Hz          level dB  T60 s  split Hz  bloom s
    parts = [(f_main / 4, -2.0,    20.0,  0.21,     0.180),   # hum, about 48 Hz
             (f_main / 2, 0.0,     17.0,  0.34,     0.060),   # prime, about 96 Hz: the strongest, most systems play it
             (f_main,     -12.0,   11.0,  0.55,     0.012)]   # the stroke's own main partial, quietly
    y = np.zeros((n, 2))
    for f, lev, t60, split, bloom in parts:
        env = np.exp(-6.908 * t / t60) * (1 - np.exp(-t / bloom))
        for sign, amp, pan in ((-1, 1.0, -0.22), (+1, 0.4, +0.22)):
            ph = rng.uniform(0, 2 * np.pi)
            s = lin(lev) * amp * env * np.sin(2 * np.pi * (f + sign * split / 2) * t + ph)
            y[:, 0] += s * np.sqrt(0.5 * (1 - pan))
            y[:, 1] += s * np.sqrt(0.5 * (1 + pan))
    # the strike: a soft heavy thump (a sine falling from 150 to 60 Hz) and a breath of low noise; no click
    k = int(0.6 * SR)
    tk = t[:k]
    fall = 60 + 90 * np.exp(-tk / 0.035)
    thump = np.sin(2 * np.pi * np.cumsum(fall) / SR) * np.exp(-tk / 0.075) * (1 - np.exp(-tk / 0.004))
    noise = butter(rng.standard_normal((k, 2)), 380, 'low', 2) * (np.exp(-tk / 0.030) * (1 - np.exp(-tk / 0.003)))[:, None]
    noise /= np.abs(noise).max()
    y[:k] += lin(-7) * thump[:, None] * 0.9 + lin(-17) * noise
    y = fade(y, 0.002, 1.5)
    return y * lin(-1) / np.abs(y).max()


def synth_hammer_whoosh(dur=0.7, apex=0.43, seed=5):
    """A door-sized mass swinging past: low noise whose band opens to the apex and closes after it, a pressure tone
    under it and a little air on top. No impact: the level falls away in 70 ms after the apex."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    pad = SR // 4
    x = rng.standard_normal(n + 2 * pad)
    f, tt, Z = signal.stft(x, SR, nperseg=1024, noverlap=768)
    tt = tt - pad / SR
    u = np.clip(tt / apex, 0, None)
    fc = np.where(tt <= apex, 85 + 360 * np.clip(u, 0, 1) ** 2.0, 105 + 340 * np.exp(-(tt - apex) / 0.09))
    G = 1 / np.sqrt(1 + (f[:, None] / fc[None, :]) ** 6) / np.sqrt(1 + (38 / np.maximum(f[:, None], 1)) ** 4)
    air = np.exp(-0.5 * (np.log2(np.maximum(f[:, None], 1) / 1700) / 0.9) ** 2)       # a breath around 1-3 kHz
    _, low = signal.istft(Z * G, SR, nperseg=1024, noverlap=768)
    _, hi = signal.istft(Z * air, SR, nperseg=1024, noverlap=768)
    low, hi = low[pad:pad + n], hi[pad:pad + n]
    t = np.arange(n) / SR
    env = np.where(t <= apex, (t / apex) ** 2.4, np.exp(-(t - apex) / 0.07))
    tone_f = np.where(t <= apex, 40 + 26 * (t / apex) ** 2, 48 + 18 * np.exp(-(t - apex) / 0.1))
    tone = np.sin(2 * np.pi * np.cumsum(tone_f) / SR)
    y = env * low / np.abs(low).max() + lin(-9) * env * tone + lin(-21) * env ** 1.5 * hi / np.abs(hi).max()
    y = fade(y, 0.004, 0.12)
    return y * lin(-1) / np.abs(y).max()


def synth_wind_altitude(dur=40.0, seed=11, q=2.5, form_db=12.0, f_lo=260.0, f_hi=1100.0, lvl_db=1.5, kmax=70,
                        slope=0.7, own=0.5):
    """Open air at altitude moving through tall stone arches. Noise made in the frequency domain, so it is exactly
    periodic over the file and loops without a seam: about -4.8 dB an octave to 1.8 kHz and -3.6 dB an octave above
    it, which keeps real air at 2-10 kHz. The movement is in colour, not in level: two broad resonances (the
    arches; too wide to whistle) wander over two octaves on a slow 1/f path that is also periodic over the loop,
    while the level stays within about 1.5 dB (no gusts). Left and right are independent above 220 Hz.
    The first version (four bands, each drifting 2-3 dB) read to earshot as plain pink noise, and a version whose
    level swelled read as surf: both are in the manifest as rejected candidates."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    f = np.fft.rfftfreq(n, 1 / SR)
    fs = np.maximum(f, 1.0)
    tilt = (fs / 200.0) ** -0.8
    tilt = np.where(fs > 1800, tilt[np.searchsorted(f, 1800)] * (fs / 1800.0) ** -0.6, tilt)
    shape = tilt * hp(70, 2)(fs) * lp(11000, 3)(fs)

    def spec():
        return (rng.standard_normal(len(f)) + 1j * rng.standard_normal(len(f))) * shape

    def wander(cycles=kmax, sl=slope):
        ph = 2 * np.pi * np.arange(n) / n
        w = sum(rng.uniform(0.5, 1.0) * k ** -sl * np.sin(k * ph + rng.uniform(0, 2 * np.pi)) for k in range(1, cycles + 1))
        return w / np.abs(w).max()

    shared = np.fft.irfft(spec() * lp(220, 2)(fs), n)
    nper, nov = 2048, 1536
    pad = nper * 4
    strength = wander()                                     # one wind for both ears
    y = np.zeros((n, 2))
    for ch in range(2):
        x = np.fft.irfft(spec(), n) * 0.8 + shared * 0.6
        xt = np.concatenate([x[-pad:], x, x[:pad]])         # wrapped, so the filtering is periodic too
        ff, tt, Z = signal.stft(xt, SR, nperseg=nper, noverlap=nov, boundary=None, padded=False)
        idx = (np.round(tt * SR).astype(int) - pad) % n
        G = np.ones((len(ff), len(tt)))
        for j in range(2):
            w = np.clip((0.7 * strength + own * wander()) / (0.7 + own), -1, 1) if j == 0 else wander()
            fc = np.exp(np.log(f_lo) + (np.log(f_hi) - np.log(f_lo)) * (0.5 + 0.5 * w[idx])) * (1.0 if j == 0 else 2.6)
            G += (lin(form_db - 3 * j) - 1) * np.exp(-0.5 * (np.log2(np.maximum(ff[:, None], 1) / fc[None, :]) * q) ** 2)
        lv = lin(lvl_db * (0.7 * strength[idx] + 0.3 * wander(30, 0.6)[idx]))
        with warnings.catch_warnings():                    # the un-overlapped edge frames lie in the padding, cut below
            warnings.simplefilter('ignore')
            _, out = signal.istft(Z * G * lv[None, :], SR, nperseg=nper, noverlap=nov, boundary=False)
        out = np.pad(out, (0, max(0, pad + n - len(out))))
        y[:, ch] = out[pad:pad + n]
    return y * lin(-1) / np.abs(y).max()


HALL_RT60 = {31.5: 5.6, 63: 6.6, 125: 7.2, 250: 7.2, 500: 6.9, 1000: 6.3, 2000: 5.2, 4000: 3.6, 8000: 2.0, 16000: 1.1}


def synth_hall_impulse(length=9.0, predelay=0.090, seed=7):
    """A cathedral for a convolution reverb, wet only (no direct sound): 90 ms of silence, a handful of early
    reflections over the next 180 ms, then a diffuse tail of noise in ten octave bands, each with its own decay
    (7.2 s at 125-250 Hz, 6.3 s at 1 kHz, 3.6 s at 4 kHz, 2 s at 8 kHz), pink above 500 Hz from the first sample,
    left and right from independent noise. Normalised to unit energy per channel (not to peak), so a signal convolved
    with it comes back at about its own level and the wet gain is set in the mix."""
    rng = np.random.default_rng(seed)
    n, p = int(length * SR), int(predelay * SR)
    m = n - p
    t = np.arange(m) / SR
    f = np.fft.rfftfreq(m, 1 / SR)
    fs = np.maximum(f, 1.0)
    colour = hp(35, 2)(fs) * np.where(fs > 500, (fs / 500.0) ** -0.5, 1.0) * lp(9000, 1)(fs)   # -3 dB/oct above 500 Hz
    cents = list(HALL_RT60)
    lf = np.log2(fs)
    out = np.zeros((n, 2))
    for ch in range(2):
        spec = np.fft.rfft(rng.standard_normal(m)) * colour
        tail = np.zeros(m)
        for i, fc in enumerate(cents):
            d = np.abs(lf - np.log2(fc))
            w = np.where(d < 1, np.cos(0.5 * np.pi * d) ** 2, 0.0)             # cos^2 octave bands sum to one
            if i == 0:
                w = np.where(f <= fc, 1.0, w)
            if i == len(cents) - 1:
                w = np.where(f >= fc, 1.0, w)
            tail += np.fft.irfft(spec * w, m) * np.exp(-6.908 * t / HALL_RT60[fc])
        tail *= 1 - np.exp(-t / 0.045)                                          # the diffuse field builds up
        tail /= np.sqrt(np.sum(tail ** 2))
        early = np.zeros(m)
        times = np.sort(np.concatenate([[0.0], rng.uniform(0.006, 0.180, 13)]))
        for j, te in enumerate(times):
            k = int(te * SR)
            pulse = np.zeros(256)
            pulse[0] = 1.0
            pulse = butter(np.concatenate([np.zeros(64), pulse]), rng.uniform(2500, 8000), 'low', 2)
            a = (1.0 if j == 0 else rng.uniform(0.35, 0.8)) * np.exp(-te / 0.12) * rng.choice([-1, 1])
            early[k:k + len(pulse)] += a * pulse[:len(early[k:k + len(pulse)])]
        early *= lin(-9) / np.sqrt(np.sum(early ** 2))                          # the early cluster: -9 dB of the tail
        out[p:, ch] = tail + early
    out = fade(out, 0.0, 0.4)
    return out / np.sqrt(np.mean(np.sum(out ** 2, axis=0)))


def synth_ring_lift(dur=0.4, seed=3):
    """A signet lifting off warm wax: a few tens of milliseconds of tacky crackle (sparse clicks growing denser),
    then one small release tick. Close, dry and tiny."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    peel_end = 0.13
    k = 0.012
    while k < peel_end:                                    # the peel: clicks from 60 a second to 500 a second
        rate = 60 + 440 * (k / peel_end) ** 2
        x[int(k * SR)] += rng.uniform(0.15, 0.5) * (k / peel_end) ** 0.7 * rng.choice([-1, 1])
        k += rng.exponential(1 / rate)
    x[int(peel_end * SR)] += 1.0                           # the release
    body = np.exp(-t[:2400] / 0.004) * np.sin(2 * np.pi * 2900 * t[:2400]) \
        + 0.6 * np.exp(-t[:2400] / 0.009) * np.sin(2 * np.pi * 1150 * t[:2400]) \
        + 0.35 * np.exp(-t[:2400] / 0.0025) * np.sin(2 * np.pi * 5200 * t[:2400])
    y = signal.fftconvolve(x, body)[:n]
    hiss = butter(butter(rng.standard_normal(n), 1800, 'high', 2), 7000, 'low', 2)
    env = np.where(t < peel_end, (t / peel_end) ** 1.5, np.exp(-(t - peel_end) / 0.012))
    y = y / np.abs(y).max() + lin(-16) * env * hiss / np.abs(hiss).max()
    y = fade(y, 0.002, 0.15)
    return y * lin(-1) / np.abs(y).max()


def synth_sub_thud(dur=1.8, f0=36.0, f_start=80.0, fall=0.06, decay=0.45, bloom=0.02):
    """The weight under a landing: a sine falling from f_start to f0 and ringing on, slow enough to bloom that it
    does not read as a kick drum."""
    t = np.arange(int(dur * SR)) / SR
    fr = f0 + (f_start - f0) * np.exp(-t / fall)
    y = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / decay) * (1 - np.exp(-t / bloom))
    return fade(y, 0.0, 0.3)


# ---------------------------------------------------------------------------------------------- listening

MIN_P, MIN_RATIO = 0.60, 2.0
RULE = ("pass = the description beats every alternative in earshot's forced choice (p_vs_alts) and is 'strong' "
        f"(z >= 3 among earshot's vocabulary) or holds at least {MIN_P:.0%} of the choice and {MIN_RATIO:g}x the best "
        "alternative (sound.md section 4). A fail is evidence, not a veto: the ear decides.")


def judge(m):
    p, alts = m['p_vs_alts'], m.get('alts') or []
    best = max(alts, key=lambda x: x['p']) if alts else None
    won = best is None or p > best['p']
    strong = m['verdict'] == 'strong'
    clear = best is None or (p >= MIN_P and p >= MIN_RATIO * best['p'])
    if won and (strong or clear):
        return True, ('strong' if strong else 'clear margin') + f" (z {m['z']:+.1f}, {100 * p:.0f}% of the choice)"
    if not won:
        return False, f"lost to '{best['query']}' ({100 * best['p']:.0f}% against {100 * p:.0f}%; z {m['z']:+.1f})"
    return False, f"ahead without a clear margin ({100 * p:.0f}%, '{best['query']}' {100 * best['p']:.0f}%; z {m['z']:+.1f})"


def listen(path, text, alts):
    """earshot's ears on one file: the forced choice, the verdict, what else it sounds like, the AudioSet tags"""
    from earshot import api
    m = api.match(path, text, alts=alts)
    d = api.describe(path)
    ok, why = judge(m)
    return {'description': text, 'alternatives': alts, 'pass': ok, 'result': why, 'verdict': m['verdict'],
            'z': round(float(m['z']), 2), 'p_vs_alts': round(float(m['p_vs_alts']), 3),
            'alts': [{'query': a['query'], 'p': round(float(a['p']), 3), 'z': round(float(a['z']), 2)}
                     for a in m.get('alts') or []],
            'sounds_like': [f"{x['term']} (z {float(x['z']):+.1f})" for x in (m.get('closest_vocab') or [])[:4]],
            'audioset': [f"{x['label']} {float(x['p']):.2f}" for x in (d.get('audioset') or [])[:6]],
            'describe': d.get('summary')}


def measure(path):
    """levels and spectrum of a delivered file (earshot's meter, no models)"""
    from earshot import api
    m = api.measure(path)
    x, sr = sf.read(path, always_2d=True)
    X = np.abs(np.fft.rfft(x.mean(1))) ** 2
    f = np.fft.rfftfreq(len(x), 1 / sr)
    tot = X.sum() + 1e-30
    share = lambda lo, hi: round(float(10 * np.log10(X[(f >= lo) & (f < hi)].sum() / tot + 1e-12)), 1)
    out = {'duration_s': round(len(x) / sr, 3), 'channels': x.shape[1], 'sample_rate': sr, 'bit_depth': 24,
           'peak_dbfs': m['peak_dbfs'], 'true_peak_dbtp': m['true_peak_dbtp'],
           'lufs': m.get('lufs', 'too short for a LUFS reading'),
           'rms_dbfs': m['rms_dbfs'], 'clipped_samples': m['clipped_samples'], 'peak_at_s': m['peak_at'],
           'centroid_hz': m['centroid_hz'],
           'energy_db_of_total': {'under_80_hz': share(0, 80), '80_250_hz': share(80, 250), '250_2k_hz': share(250, 2000),
                                  '2k_8k_hz': share(2000, 8000), 'over_8k_hz': share(8000, 24001)}}
    if x.shape[1] == 2:
        out['lr_correlation'] = m['correlation']
    return out


# ---------------------------------------------------------------------------------------------- the sounds

SOUNDS = {}   # name -> {'out', 'what', 'licence', 'check': (description, [alternatives]), 'make': fn, ...}


def sound(name, out, what, licence, check, caveat=None, loop=False, check_file=None, analyse=None, probes=None,
          extra_check=None):
    """register make_<name>: a function that returns (audio at 48 kHz, how-it-was-made dict)"""
    def deco(fn):
        SOUNDS[name] = {'out': out, 'what': what, 'licence': licence, 'check': check, 'caveat': caveat, 'loop': loop,
                        'make': fn, 'check_file': check_file, 'analyse': analyse, 'probes': probes or [],
                        'extra_check': extra_check}
        return fn
    return deco


FINISH_NOTE = ('48 kHz (soxr VHQ); onset trimmed (3 ms before the first 1 ms frame within 40 dB of the peak, held in '
               '3 of 10 frames), 2 ms de-click; peak -1 dBFS; raised-cosine fade-out; FLAC 24-bit')


FILM_STROKE = (os.path.join(ROOT, 'out', 'takes', 'Q02B_t1.mp4'), 9.22)   # the cut's bell stroke: take, second


def bell_under_stroke(path):
    """the body's real test: under the film's own stroke, does the bell read bigger? (out/ is not in git: without
    the take this says so and stops)"""
    from earshot import api
    src, at = FILM_STROKE
    if not os.path.isfile(src):
        return {'under_film_stroke': f'not run: {os.path.relpath(src, ROOT)} is not on this machine'}
    wav = os.path.join(GEN, 'film_stroke.wav')
    os.makedirs(GEN, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(at), '-i', src, '-vn', '-ar', str(SR), '-ac', '2',
                    '-c:a', 'pcm_s24le', wav], check=True)
    n = int(12 * SR)
    st = np.zeros((n, 2))
    x = read(wav)[:n]
    st[:len(x)] = fade(x, 0.002, 1.0)
    st = unit(st)
    body = unit(read(path)[:n])
    out = {}
    for label, y in (('film_stroke_alone', st), ('film_stroke_with_bell_body_at_equal_peak', st + body)):
        tmp = os.path.join(GEN, 'bell_under_stroke_test.wav')
        sf.write(tmp, y * lin(-1) / np.abs(y).max(), SR, subtype='PCM_24')
        size = api.match(tmp, 'a very large low-pitched bell', alts=['a small high-pitched bell', 'a medium tower bell'])
        kind = api.match(tmp, 'an enormous deep bronze bell struck once, ringing for a long time',
                         alts=['a gong struck once', 'a small hand bell', 'a church tower bell',
                               'a low synthesizer drone'])
        out[label] = {'size_choice': {'a very large low-pitched bell': round(float(size['p_vs_alts']), 2),
                                      **{a['query']: round(float(a['p']), 2) for a in size['alts']}},
                      'kind_choice': {'an enormous deep bronze bell': round(float(kind['p_vs_alts']), 2),
                                      **{a['query']: round(float(a['p']), 2) for a in kind['alts']}}}
    return {'under_film_stroke': out}


@sound('bell_body', 'audio/sfx/bell_body.flac',
       'The low body of the house-sized bell: one soft stroke, hum at 47.9 Hz and prime at 95.9 Hz (two and one '
       'octaves under the film stroke\'s 191.7 Hz main partial), ringing for 22 s. Layer it UNDER the film\'s own '
       'stroke, its first sample on the stroke frame.',
       LIC_SYN,
       ('a huge deep bronze bell struck once, ringing for a long time',
        ['a gong struck once', 'a small hand bell', 'a low synthesizer drone', 'a distant explosion']),
       caveat='All of its energy is under 200 Hz: phone and laptop speakers will play almost none of it, so judge it '
              'on full-range speakers or headphones. The film stroke itself has partials at 83 and 110 Hz that sit '
              '13-14 Hz either side of this body\'s 95.9 Hz prime and may beat against it: if the low end sounds '
              'rough, high-pass the film stroke at about 125 Hz and let this file own everything below. Alone it '
              'does not read as a bell (it is only a bell\'s bottom two partials): the test that matters is under the '
              'film stroke (earshot.under_film_stroke). It makes the bell read LARGE; it does not stop the film '
              'stroke reading as a gong, which comes from the stroke\'s own upper partials.',
       extra_check=bell_under_stroke)
def make_bell_body():
    y = synth_bell_body()
    return y, {'method': 'synthesised', 'function': 'synth_bell_body(f_main=191.7, dur=22.0, seed=48)',
               'detail': 'three decaying partials, each a doublet that beats slowly (hum 47.93 Hz, T60 20 s, split '
                         '0.21 Hz; prime 95.85 Hz, T60 17 s, split 0.34 Hz; 191.7 Hz at -12 dB, T60 11 s), the two '
                         'halves of each doublet panned slightly apart; a soft strike (a sine falling 150 to 60 Hz '
                         'in 75 ms and a breath of noise under 380 Hz); 1.5 s fade-out; peak -1 dBFS'}


@sound('hammer_whoosh', 'audio/sfx/hammer_whoosh.flac',
       'The door-sized hammer swinging through the air: a low, heavy rush with no impact. Its loudest moment (the '
       'pass) is at about 0.42 s: start the file 0.42 s before the frame the hammer passes the lens or meets the bell.',
       LIC_SYN,
       ('a low heavy whoosh of air as a huge object swings past',
        ['a heavy impact thud', 'steady wind blowing', 'a distant explosion', 'a thin fast sword swish']))
def make_hammer_whoosh():
    return synth_hammer_whoosh(), {
        'method': 'synthesised', 'function': 'synth_hammer_whoosh(dur=0.7, apex=0.43, seed=5)',
        'detail': 'noise through a low-pass that opens from 85 Hz to 445 Hz at the apex and closes after it, a '
                  'pressure tone rising 40 to 66 Hz at -9 dB, a breath of 1-3 kHz air at -21 dB; level rises as '
                  't^2.4 to the apex and falls with a 70 ms time constant; mono'}


@sound('wind_altitude', 'audio/sfx/wind_altitude.flac',
       'Open high-altitude air moving through tall stone arches: soft, steady (level within about 1.5 dB), wide, '
       'with real air at 2-10 kHz and a slowly wandering colour instead of gusts. A seamless 40 s loop (no fades: '
       'the last sample runs into the first).',
       LIC_SYN,
       ('soft steady wind blowing through an open high place',
        ['howling wind with strong gusts', 'wind whistling through a gap', 'rain falling', 'static white noise hiss',
         'ocean waves on a beach']),
       loop=True,
       caveat='Not proven by the ear model: as a description it is "plausible" (z about +2.9), but in the forced '
              'choice earshot calls it static noise or surf, and no candidate did better (see candidates). A steady '
              'soft wind is close to coloured noise by nature; a person must judge whether it reads as wind at bed '
              'level. It is peak-normalised, so it is loud as delivered: as a bed it belongs 25-35 dB down.')
def make_wind_altitude():
    return synth_wind_altitude(), {
        'method': 'synthesised', 'function': 'synth_wind_altitude(dur=40.0, seed=11, q=2.5, form_db=12.0)',
        'detail': 'noise built in the frequency domain, exactly periodic over 40 s; -4.8 dB an octave to 1.8 kHz, '
                  '-3.6 dB an octave above it, high-pass 70 Hz, low-pass 11 kHz; two broad resonances (+12 and +9 dB) '
                  'wandering 260-1100 Hz and 680-2900 Hz on a periodic 1/f path; level within 1.5 dB; left and right '
                  'independent above 220 Hz; peak -1 dBFS; no fades'}


def hall_analysis(path):
    """what the impulse measures: pre-delay, decay per octave (T30 from the Schroeder curve of the left channel,
    which reads a little long in the top bands because the octave filters overlap), decorrelation, level"""
    x, sr = sf.read(path, always_2d=True)
    first = int(np.flatnonzero(np.abs(x).max(axis=1) > 1e-7)[0])
    rt = {}
    for fc in (125, 250, 500, 1000, 2000, 4000, 8000):
        sos = signal.butter(3, [fc / 2 ** 0.5, fc * 2 ** 0.5], 'band', fs=sr, output='sos')
        h = signal.sosfilt(sos, x[:, 0])
        sch = np.cumsum(h[::-1] ** 2)[::-1]
        d = 10 * np.log10(sch / sch[0] + 1e-30)
        rt[f'{fc} Hz'] = round(2 * (np.argmax(d <= -35) - np.argmax(d <= -5)) / sr, 2)
    pk = float(np.abs(x).max())
    return {'predelay_ms': round(1000 * first / sr, 1), 'rt60_s_by_octave': rt,
            'lr_correlation': round(float(np.corrcoef(x[:, 0], x[:, 1])[0, 1]), 3),
            'energy_per_channel': [round(float(v), 3) for v in np.sum(x ** 2, axis=0)],
            'sample_peak_dbfs': round(db(pk), 1), 'gain_to_peak_minus_1_dbfs_db': round(-1 - db(pk), 1),
            'direct_sound': 'none (wet only)'}


def _hall_check_file():
    """a dry clap played in the hall (for the ear model only): 6 ms of noise convolved with the impulse"""
    rng = np.random.default_rng(1)
    clap = butter(rng.standard_normal(int(0.006 * SR)), [700, 5000], 'band', 2) * rcos_out(int(0.006 * SR))
    ir = hall_ir()
    wet = np.stack([signal.fftconvolve(clap, ir[:, c]) for c in range(2)], 1)
    y = wet * 0.5
    y[:len(clap)] += clap[:, None]                                    # the direct sound, then the hall
    path = os.path.join(GEN, 'hall_impulse_clap_test.wav')
    sf.write(path, y * lin(-1) / np.abs(y).max(), SR, subtype='PCM_24')
    return path


@sound('hall_impulse', 'audio/sfx/hall_impulse.flac',
       'A synthetic cathedral impulse response for a convolution reverb: wet only (no direct sound), 90 ms '
       'pre-delay built in, RT60 about 6.3-7.2 s through the middle, dark (pink above 500 Hz, and the top decays '
       'faster: 3.6 s at 4 kHz, 2 s at 8 kHz by design), left and right decorrelated.',
       LIC_SYN,
       ('a single clap echoing in a huge cathedral with a very long reverberation',
        ['a clap in a small dry room', 'a gunshot outdoors', 'a burst of static noise']),
       caveat='Normalised to UNIT ENERGY per channel, not to -1 dBFS (its sample peak is about -20 dBFS): a signal '
              'convolved with it comes back at roughly its own level, so set the wet gain in the mix (start around '
              '-12 to -18 dB under the dry voice). The file is 9 s long, so every convolved sound grows a 9 s tail: '
              'leave room at the end of the film. The earshot check is run on a test clap convolved with it '
              '(audio/gen/hall_impulse_clap_test.wav), not on the impulse itself.',
       check_file=_hall_check_file, analyse=hall_analysis)
def make_hall_impulse():
    return synth_hall_impulse(), {
        'method': 'synthesised', 'function': 'synth_hall_impulse(length=9.0, predelay=0.090, seed=7)',
        'detail': 'independent Gaussian noise per channel in ten cos^2 octave bands, each with its own exponential '
                  'decay (design RT60: ' + ', '.join(f'{k:g} Hz {v} s' for k, v in HALL_RT60.items()) + '); -3 dB '
                  'an octave above 500 Hz and a gentle low-pass at 9 kHz; a 45 ms build-up; 14 low-passed early reflections over the first 180 ms '
                  'at -9 dB of the tail; 0.4 s fade-out; unit energy per channel',
        'normalisation': 'unit energy (sum of squares = 1 per channel, mean of the two)'}


# Stable Audio prompts: concrete source, material, action and space; never a negation (the encoder ignores "no").
# name -> (model, prompt, asked duration in s, seed). Retakes move the seed by +1000.
TAKES = {
    'bell_body_gen': ('sfx', "One single stroke on an enormous bronze bell the size of a house, very deep and low, a "
                      "soft heavy strike and then a very long, dark, slow ringing hum that dies away in a huge stone "
                      "tower.", 20.0, 101),
    'bell_landing': ('sfx', "A colossal bronze weight settling onto a stone and timber beam: one deep heavy thud, a "
                     "groan of stone and timber under load, then grit and dust pattering down. Close, dry, huge low "
                     "end.", 4.0, 102),
    'chains_slack': ('sfx', "Massive iron anchor chains going slack and running out over stone, huge heavy links "
                     "clanking and rattling against each other, deep heavy metal with bright ringing detail, echoing "
                     "in a large stone hall.", 4.0, 1103),
    'chains_slack_first': ('sfx', "Heavy iron chains going slack and running out, big links rattling and clanking "
                           "against each other, bright metallic detail, in a large stone hall.", 4.0, 103),
    'rope_creak': ('sfx', "Thick hemp rope and heavy timber creaking under great strain as something massive is "
                   "hauled, slow tense creaks, close.", 4.0, 104),
    'wax_press': ('sfx', "Close-up foley: a metal signet ring pressed firmly into soft warm sealing wax on thick "
                  "paper, a small soft squelch and a faint creak of parchment, quiet, dry, intimate.", 3.0, 106),
    'ring_lift': ('sfx', "Close-up foley: a small sticky tacky peel as a metal ring lifts off soft warm wax, one tiny "
                  "tick, quiet, dry.", 2.0, 107),
    'paper_handling': ('sfx', "Close-up foley: one heavy sheet of thick parchment paper lifted and held up on gloved "
                       "hands, soft slow paper movement, quiet, dry.", 3.0, 108),
    'cloth_move': ('sfx', "Close-up foley: a heavy wool sleeve moving as an arm reaches, soft thick fabric rustle, "
                   "quiet, dry.", 3.0, 109),
    'wind_altitude': ('sfx', "Soft steady high-altitude wind, open air moving gently through tall stone arches high "
                      "above the clouds, airy and smooth, wide stereo ambience.", 47.0, 110),
    'crowd_presence': ('sfx', "Room tone of thousands of people standing silently in a vast stone cathedral: soft "
                       "cloth rustle, small shifts of weight, a distant soft cough, enormous reverberant space, quiet "
                       "and still.", 26.0, 111),
    'gloved_applause': ('sfx', "Distant muffled applause heard from far away in a vast stone cathedral: thousands "
                        "of people softly patting gloved hands together, a dull soft padded rumble of applause, "
                        "gentle and polite, very reverberant.", 10.0, 1112),
    'gloved_applause_first': ('sfx', "A very large crowd applauding politely while wearing thick gloves in a huge "
                              "stone hall: soft muffled padded thuds, dull and gentle, distant, reverberant.", 10.0, 112),
}


# ---------------------------------------------------------------------------------------------- generated and library effects

def take(name, seed=None):
    """the Stable Audio take of TAKES[name] at 48 kHz, with the how-it-was-made record"""
    model, prompt, dur, sd = TAKES[name]
    sd = sd if seed is None else seed
    x, rec = sa(model, prompt, dur, sd)
    how = sa_how(model, prompt, dur, sd)
    how.update(rec)
    return x, how


def cut(x, a, b):
    return x[int(round(a * SR)):int(round(b * SR))]


def unit(x):
    return x / np.abs(x).max()


def place(dst, src, at, gain_db=0.0):
    """add src into dst starting `at` seconds in"""
    k = int(round(at * SR))
    n = min(len(src), len(dst) - k)
    dst[k:k + n] += lin(gain_db) * src[:n]
    return dst


def hall_ir():
    """the delivered hall impulse, or the same thing computed if its file is not there yet"""
    path = os.path.join(ROOT, 'audio', 'sfx', 'hall_impulse.flac')
    return read(path) if os.path.isfile(path) else synth_hall_impulse()


def hall(x, wet_db, ir_len=4.0, tau=1.2):
    """a shortened copy of hall_impulse on a sound effect: the first `ir_len` s of the impulse with an extra decay,
    the wet at `wet_db` relative to the dry signal's RMS. Returns stereo, the dry sound's length."""
    n = int(ir_len * SR)
    h = hall_ir()[:n] * np.exp(-np.arange(n) / SR / tau)[:, None]
    x = stereo(x)
    w = np.stack([signal.fftconvolve(x[:, c], h[:, c]) for c in range(2)], 1)[:len(x)]
    return x + lin(wet_db) * w * np.sqrt(np.mean(x ** 2)) / np.sqrt(np.mean(w ** 2))


def soften(x, k=1.2, slow_ms=80, look_ms=3):
    """pad the claps: every peak is held to k times the local level (a look-ahead limiter whose threshold follows
    the 80 ms level), which is what a glove does to a clap"""
    from scipy.ndimage import maximum_filter1d, uniform_filter1d
    a = np.abs(x).max(axis=1)
    fast = maximum_filter1d(a, int(look_ms * SR / 1000) * 2 + 1)
    slow = np.sqrt(uniform_filter1d(a ** 2, int(slow_ms * SR / 1000))) + 1e-9
    gain = uniform_filter1d(np.minimum(1.0, k * slow / np.maximum(fast, 1e-9)), int(0.002 * SR))
    return x * gain[:, None]


@sound('bell_landing', 'audio/sfx/bell_landing.flac',
       'The house-sized bell settling onto its beam: a deep thud on the first frame, the beam taking the load and a '
       'second, smaller knock 0.7 s later, then a low tail. Start the file on the frame the chains go slack and the '
       'bell\'s weight arrives.',
       LIC_SA + '; with an original synthesised sub layer',
       ('a huge heavy weight landing on stone and timber with a deep thud, a groan and falling grit',
        ['a door slamming', 'an explosion', 'a drum hit', 'thunder rumbling']),
       caveat='The grit and dust "pattering down after it" is not really there: the take gives a thud, a settle and a '
              'second knock, and earshot\'s nearest descriptions are "a wooden block hit" and "digging in soil". If the '
              'picture shows dust falling, it needs its own quiet layer. The sub layer (36 Hz) is inaudible on small '
              'speakers by design. The review asked for the landing to sit 4 dB under the bell stroke.')
def make_bell_landing():
    x, how = take('bell_landing', 1102)
    ratio = 0.7
    y = mono(pitch_speed(cut(x, 1.33, 1.33 + 2.6 * ratio + 0.2), ratio))[:int(2.5 * SR)]
    on = onset(y)
    y = unit(y)
    y = place(y, synth_sub_thud(), on / SR, -6.0)          # the weight: a sine falling 80 -> 36 Hz, slow to bloom
    y, fin = finish(y, trim=True, fout=0.25)
    how['edit'] = ('1.33-3.35 s of the take played at 0.7 speed (lower and slower: a heavier object), mono, 2.5 s; '
                   'a synthesised sub thud (sine falling 80 to 36 Hz, 0.45 s decay) at -6 dB under the first '
                   f'impact; 0.25 s fade-out; gain {fin["gain_db"]:+.2f} dB to peak -1 dBFS')
    return y, how


@sound('chains_slack', 'audio/sfx/chains_slack.flac',
       'The barge\'s iron chains going slack and running: 2.5 s of heavy links clanking and rattling, busiest at about '
       '1.6 s, with bright metal detail at 2-8 kHz. Stereo.',
       LIC_SA + '; layered with ' + LIC_EARSHOT,
       ('heavy iron chains rattling and clanking', ['keys jingling', 'coins dropping', 'glass breaking',
                                                    'a metal gate closing']),
       caveat='Two layers, both played slower than made so the links read heavy: untreated, the generated take read '
              'as coins dropping and earshot\'s chain as a small chain. The "large space" is only what the take '
              'carries: send it to the hall reverb in the mix.')
def make_chains_slack():
    x, how = take('chains_slack')
    n = int(2.5 * SR)
    a = unit(pitch_speed(cut(x, 1.0, 1.0 + 2.5 * 0.7 + 0.05), 0.7)[:n])
    c = pitch_speed(stereo(earshot_make('chain/rattle', 0)), 0.45)[:n]
    y = np.zeros((n, 2))
    place(y, a, 0.0)
    place(y, unit(c), 0.0, -3.0)
    y, fin = finish(y, trim=True, fout=0.3)
    how['layers'] = ['Stable Audio take (see prompt): 1.0-2.8 s at 0.7 speed',
                     "earshot catalogue design chain/rattle (seed 0, 'a metal chain rattled') at 0.45 speed, -3 dB"]
    how['edit'] = f'the two layers summed, 2.5 s, 0.3 s fade-out; gain {fin["gain_db"]:+.2f} dB to peak -1 dBFS'
    return y, how


@sound('rope_creak', 'audio/sfx/rope_creak.flac',
       'Thick rope and timber under strain as the hammer is hauled back: woody creaks and knocks with the dry stretch '
       'of rope fibre over them, 1.8 s, mono.',
       LIC_CC0 + ' (Freesound 683416) layered with a Stable Audio take (' + LIC_SA + ')',
       ('thick rope and timber creaking under heavy strain',
        ['a door hinge squeaking', 'footsteps on a wooden floor', 'a violin', 'a squeaky chair']))
def make_rope_creak():
    x, how = take('rope_creak')
    n = int(1.8 * SR)
    y = np.zeros(n)
    place(y, unit(pitch_speed(mono(cc0('creak')), 0.8)), 0.0)
    place(y, unit(pitch_speed(mono(cut(x, 0.45, 1.95)), 0.8)), 0.0, -6.0)
    y, fin = finish(y, trim=True, fout=0.2)
    how['layers'] = ['CC0 recording "House_Creak_2.wav" by SholeColtis (freesound.org/people/SholeColtis/sounds/683416/, '
                     'committed at claude-film/one-too-many/audio/sfx/creak.flac) at 0.8 speed',
                     'Stable Audio take (see prompt): 0.45-1.95 s at 0.8 speed, -6 dB']
    how['edit'] = f'the two layers summed, mono, 1.8 s, 0.2 s fade-out; gain {fin["gain_db"]:+.2f} dB to peak -1 dBFS'
    return y, how


@sound('wax_press', 'audio/sfx/wax_press.flac',
       'The signet pressed into warm wax on heavy paper, close and dry: a soft press with a small wet give, 1.0 s, '
       'mono. Its loudest moment is 0.2 s in: put that on the frame the ring meets the wax.',
       LIC_SA,
       ('a metal seal pressed into soft wax on paper, a small squelch',
        ['a rubber stamp hitting a desk', 'a footstep', 'a knock on wood', 'paper being crumpled']),
       caveat='Bright for a squelch (most of its energy is above 2 kHz; earshot\'s nearest descriptions are "a spray '
              'can hissing" and "a match being struck"): asked squelch against hiss against paper it says squelch 47%, '
              'paper 38%, hiss 14%. If it reads as a hiss in the mix, roll it off above 5 kHz. The review found the '
              'cut\'s own seal sound late against the picture: place this one from the frame, not from the old sound.')
def make_wax_press():
    x, how = take('wax_press')
    y, fin = finish(mono(cut(x, 0.10, 1.10)), trim=True, fout=0.12)
    how['edit'] = f'0.10-1.10 s of the take, mono, 0.12 s fade-out; gain {fin["gain_db"]:+.2f} dB to peak -1 dBFS'
    return y, how


@sound('ring_lift', 'audio/sfx/ring_lift.flac',
       'The signet lifting off the wax: a short tacky peel that builds for 0.25 s and lets go with a small tick, '
       '0.4 s, mono. The tick is the loudest moment, about 0.2 s in.',
       LIC_SA,
       ('a small sticky peel and tick as something lifts off wax',
        ['a mouse click', 'a finger snap', 'a drop of water', 'a light switch']),
       caveat='Very bright (centred near 10 kHz) and AudioSet tags it as a camera shutter: at more than a whisper it '
              'will read as a click. Keep it very low.')
def make_ring_lift():
    x, how = take('ring_lift')
    y, fin = finish(mono(cut(x, 0.10, 0.62)), trim=True, fout=0.08, length=0.4)
    how['edit'] = (f'from the onset at {0.10 + fin["onset_trim_ms"] / 1000:.2f} s of the take, 0.4 s, mono, 0.08 s '
                   f'fade-out; gain {fin["gain_db"]:+.2f} dB: ' + fin.get('true_peak_limited', 'peak -1 dBFS'))
    return y, how


@sound('paper_handling', 'audio/sfx/paper_handling.flac',
       'One heavy sheet lifted and presented: a soft papery lift (0-0.7 s), then the sheet settling on the palms '
       '(from 0.8 s), 1.5 s, mono, close.',
       LIC_EARSHOT + '; layered with ' + LIC_CC0 + ' (Freesound 470189)',
       ('a heavy sheet of thick paper being lifted and handled',
        ['paper being torn', 'paper crumpled into a ball', 'cloth rustling', 'a book closing']),
       caveat='Built from two library sounds played slower (a thicker sheet), because both Stable Audio takes and '
              'every single library sound read as paper being crumpled. It passes with a clear margin but only as '
              '"plausible" (z +2.5).')
def make_paper_handling():
    n = int(1.5 * SR)
    y = np.zeros(n)
    place(y, unit(pitch_speed(mono(earshot_make('paper/page', 0)), 0.7)), 0.0)
    place(y, fade(unit(pitch_speed(mono(cc0('slide')), 0.55)), 0.03, 0.2), 0.80, -7.0)
    y, fin = finish(y, trim=True, fout=0.2, fin=0.01)
    return y, {'method': 'library', 'layers': [
        "earshot catalogue design paper/page (seed 0, 'a page of a book being turned') at 0.7 speed",
        'CC0 recording "55_Coger_Foto.wav (Sliding Paper)" by Atrius1 (freesound.org/people/Atrius1/sounds/470189/, '
        'committed at claude-film/one-too-many/audio/sfx/slide.flac) at 0.55 speed, from 0.80 s, -7 dB'],
        'edit': f'the two layers summed, mono, 1.5 s, 0.2 s fade-out; gain {fin["gain_db"]:+.2f} dB to peak -1 dBFS'}


@sound('cloth_move', 'audio/sfx/cloth_move.flac',
       'A heavy wool sleeve moving as the arm reaches: one soft thick rustle that swells for 0.8 s and stops, 1.05 s, '
       'mono, close.',
       LIC_SA,
       ('heavy wool clothing rustling as an arm moves', ['paper rustling', 'a zipper', 'wind blowing', 'footsteps']))
def make_cloth_move():
    x, how = take('cloth_move')
    y, fin = finish(mono(cut(x, 0.40, 1.45)), trim=False, fin=0.05, fout=0.12)
    how['edit'] = (f'0.40-1.45 s of the take, mono, 50 ms fade-in, 0.12 s fade-out; gain {fin["gain_db"]:+.2f} dB to '
                   'peak -1 dBFS')
    return y, how


@sound('crowd_presence', 'audio/sfx/crowd_presence.flac',
       'Thousands standing silent in the nave: a low reverberant room tone with cloth and small shifts of weight, and '
       'one distant double cough at 6.4 s. Nobody speaks. A seamless 20 s loop (no fades).',
       LIC_SA + '; with one ' + LIC_CC0 + ' cough (Freesound 743360)',
       ('a large silent crowd standing in a huge reverberant hall, rustling and a distant cough',
        ['a crowd talking', 'a crowd cheering', 'an empty silent room', 'a restaurant with murmuring voices', 'applause']),
       loop=True,
       caveat='Mostly low: most of its energy is under 250 Hz and there is little above 2 kHz, so on small speakers it '
              'is nearly inaudible; the wind bed carries the high air. "Nobody speaks" is not fully proven: asked '
              'directly (people speaking or murmuring, in 2 s windows) earshot says 1% or less everywhere, but AudioSet '
              'tags every 4 s of it "Speech" at 0.26-0.45, and 8-12 s reads as whispering (81%) against rustle, room '
              'tone, footsteps and a cough. There may be a faint whisper-like texture: a person must listen for it. '
              'If the bed is looped, the cough comes back every 20 s: over a 35 s film that is one '
              'repeat, so drop the second pass or offset the loop. One loud knock in the take (4.25 s) is turned down '
              '16 dB. A second cough was tried and removed: far away in the hall it read to earshot as an animal '
              '(a horse, a cow, a rooster).')
def make_crowd_presence():
    x, how = take('crowd_presence')
    x = np.array(x)
    a, b = int(4.10 * SR), int(4.85 * SR)                   # one slam, 22 dB over the bed: turned down, not cut
    g = np.ones(len(x))
    g[a:b] = 1 - (1 - lin(-16)) * np.sin(np.pi * np.arange(b - a) / (b - a)) ** 0.5
    x *= g[:, None]
    y = loopify(cut(x, 2.5, 26.0), 20.0, 1.0)
    bed = np.sqrt(np.mean(y ** 2))
    ir = hall_ir()[:int(5 * SR)]
    ir = ir * np.exp(-np.arange(len(ir)) / SR / 1.6)[:, None]
    for name, at, lev in (('cough1', 6.4, 5.0),):
        c = butter(mono(cc0(name)), 2200, 'low', 2)          # far away: dull, and mostly hall
        tail = np.stack([signal.fftconvolve(c, ir[:, k]) for k in range(2)], 1)
        cough = 0.9 * tail / np.abs(tail).max() * np.abs(c).max()
        cough[:len(c)] += 0.35 * c[:, None]
        cough = fade(cough[:len(c) + int(2.5 * SR)], 0.005, 1.0)
        place(y, cough * (bed * lin(lev) / np.sqrt(np.mean(cough[:int(0.6 * SR)] ** 2))), at)
    y = y * lin(-1) / np.abs(y).max()
    how['layers'] = ['Stable Audio take (see prompt): 2.5-22.5 s, with the second that follows it (22.5-23.5 s) '
                     'cross-faded over its first second (equal power) to make the loop; the knock at 4.25 s turned '
                     'down 16 dB',
                     'CC0 "Strong Double Cough" by qubodup (freesound.org/people/qubodup/sounds/743360/, committed '
                     'at claude-film/one-too-many/audio/sfx/cough1.flac) at 6.4 s: low-passed at 2.2 kHz, mostly '
                     'reverb from hall_impulse (first 5 s), 5 dB over the bed\'s RMS']
    how['edit'] = 'peak -1 dBFS; no fades (seamless loop)'
    return y, how


@sound('gloved_applause', 'audio/sfx/gloved_applause.flac',
       'Ten thousand gloved hands applauding far off in the nave: a wide, distant patter with the crack of each clap '
       'held down (peaks limited to 1.5 times the local level) and the hall around it, 8 s, stereo, fading in over '
       '0.3 s and out over 1.2 s.',
       LIC_SA,
       ('a large crowd applauding softly in gloves, muffled, in a big hall',
        ['sharp loud hand clapping', 'rain falling', 'a crowd cheering', 'footsteps of a crowd']),
       caveat='FAILS the forced choice, and "gloved" could not be shown at all: earshot hears applause (z +3.7 to '
              '+4.0), but ordinary hand clapping. Every version muffled enough to stop reading as sharp clapping (any '
              'low-pass at 5 kHz or below) stopped reading as applause too: a second probe then heard horses galloping '
              '(88-100%). So this file keeps the full band and only pads the peaks; it is not low-passed. If the ear '
              'wants it duller, low-pass in the mix against the picture, where the hands explain the sound. It should '
              'be almost soundless in the film, and the review says the film must not end on it.')
def make_gloved_applause():
    x, how = take('gloved_applause')
    y = soften(butter(cut(x, 0.0, 8.3), 100, 'high', 2), 1.5)
    y = hall(y, -6.0)[:int(8 * SR)]
    y, fin = finish(y, trim=False, fin=0.3, fout=1.2)
    how['edit'] = ('first 8 s of the take; high-pass 100 Hz; every clap\'s peak held to 1.5 times the local 80 ms '
                   'level; hall_impulse (first 4 s) at -6 dB; 0.3 s fade-in, 1.2 s fade-out; gain '
                   f'{fin["gain_db"]:+.2f} dB to peak -1 dBFS; no low-pass')
    return y, how


# ---------------------------------------------------------------------------------------------- the choir

NOTE_NAMES = 'C C# D D# E F F# G G# A A# B'.split()


def note_name(hz):
    mid = 69 + 12 * np.log2(hz / 440.0)
    n = int(round(mid))
    return f'{NOTE_NAMES[n % 12]}{n // 12 - 1}{(mid - n) * 100:+.0f}c'


def choir_analysis(path):
    """what a cue is made of, for someone who cannot hear it: tuning, the notes it leans on (whole cue and per 4 s),
    its strongest sustained partials, its level every 2 s, and whether any 3.9 s of it comes back (the cut's old
    choir was one 3.87 s phrase four times: a sample-identical repeat scores 1.0 here)"""
    import librosa
    x = read(path)
    y = mono(x).astype(np.float32)
    hop = 4096
    ch = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=hop, bins_per_octave=36)
    c = ch.mean(1)
    fps = SR / hop
    path4 = []
    for t0 in range(0, int(len(y) / SR) - 3, 4):
        w = ch[:, int(t0 * fps):int((t0 + 4) * fps)].mean(1)
        path4.append(f"{t0}-{t0 + 4} s: " + ' '.join(NOTE_NAMES[i] for i in np.argsort(w)[::-1][:3]))
    X = np.abs(np.fft.rfft(y * np.hanning(len(y))))
    f = np.fft.rfftfreq(len(y), 1 / SR)
    k = max(1, int(2 / (f[1] - f[0])))
    Xs = np.convolve(X, np.ones(k) / k, 'same')
    msk = (f > 50) & (f < 1500)
    Xd = 20 * np.log10(Xs[msk] / Xs[msk].max() + 1e-12)
    fm = f[msk]
    pk, _ = signal.find_peaks(Xd, height=-24, distance=int(8 / (fm[1] - fm[0])))
    pk = pk[np.argsort(Xd[pk])[::-1][:8]]
    # repetition: every 3.9 s window against the rest of the cue, at 8 kHz
    z = librosa.resample(y, orig_sr=SR, target_sr=8000).astype(np.float64)
    w = int(3.9 * 8000)
    cs = np.concatenate([[0], np.cumsum(z ** 2)])
    en = np.sqrt(np.maximum(cs[w:] - cs[:-w], 1e-12))
    floor = en.max() * lin(-30)
    best = 0.0
    for start in range(0, len(z) - w, w // 2):
        seg = z[start:start + w]
        e = np.sqrt((seg ** 2).sum())
        if e < floor:
            continue
        r = np.abs(signal.fftconvolve(z, seg[::-1], 'valid')) / (np.maximum(en[:len(z) - w + 1], floor) * e)
        r[max(0, start - 2 * 8000):start + 2 * 8000] = 0
        best = max(best, float(r.max()))
    return {'tuning_cents_from_a440': round(float(librosa.estimate_tuning(y=y, sr=SR) * 100)),
            'notes_it_leans_on': [f'{NOTE_NAMES[i]} {c[i] / c.max():.2f}' for i in np.argsort(c)[::-1][:5]],
            'notes_per_4_s': path4,
            'strongest_partials': [f'{fm[i]:.0f} Hz {note_name(fm[i])} ({Xd[i]:.0f} dB)' for i in sorted(pk)],
            'level_dbfs_per_2_s': [round(db(np.sqrt(np.mean(x[i:i + 2 * SR] ** 2)))) for i in
                                   range(0, len(x) - 2 * SR + 1, 2 * SR)],
            'max_repeat_correlation_3p9s': round(best, 3)}


CHOIR_CHECK = ('a large choir singing slow sustained wordless vowels in a vast cathedral',
               ['a solo singer', 'an orchestra with strings', 'a church organ', 'a synthesizer pad',
                'people speaking', 'music with drums'])
CHOIR_PROBES = [('a choir singing one sustained wordless vowel', ['a choir singing words and lyrics']),
                ('voices only, a cappella', ['voices with drums and percussion', 'voices with an orchestra',
                                             'voices with an organ']),
                ('men and women singing together', ['men singing low', 'women singing high'])]


def choir(name, prompt, seed, what, start=0.0, length=31.0, fout=2.0, caveat=None):
    """register one choir candidate: a Stable Audio Music take, cut to `length` s from `start`, high-passed at 30 Hz,
    50 ms fade-in, `fout` s fade-out, peak -1 dBFS. The cue keeps its own opening: the mix fades it in."""
    @sound(name, f'audio/choir/{name}.flac', what, LIC_SA, CHOIR_CHECK, caveat=caveat, analyse=choir_analysis,
           probes=CHOIR_PROBES)
    def make():
        x, rec = sa('music', prompt, CHOIR_DUR, seed)
        a = int(start * SR)
        y = butter(x[a:a + int(length * SR)], 30, 'high', 2)
        y, fin = finish(y, trim=False, fin=0.05, fout=fout)
        how = sa_how('music', prompt, CHOIR_DUR, seed)
        how.update(rec)
        how['edit'] = (f'{start:g} s to {start + length:g} s of the take; high-pass 30 Hz; 50 ms fade-in, {fout:g} s '
                       f'fade-out; gain {fin["gain_db"]:+.2f} dB to peak -1 dBFS; no other processing')
        return y, how
    return make


choir('choir_1_mixed_sustained', CHOIR['choir_1_mixed_sustained'], 601,
      'Choir candidate 1: a large mixed choir on slow sustained wordless vowels in a vast stone space; the harmony '
      'moves about every four to six seconds (A minor to G to E minor colours, white notes only), no melody on top.',
      length=31.0, fout=2.0,
      caveat='Its energy is all between about 250 Hz and 1.3 kHz (almost nothing above 2 kHz), which is also where speech '
             'has its body: under the lines it needs to sit well down (the handbook\'s -12 dB under the voice) or be '
             'dipped at 300-800 Hz. The take thins at 24-26 s and ends by itself at about 30 s. It is tuned to '
             'A = 440; the bell\'s main partial (191.7 Hz) is a G that is 38 cents flat of that.')


choir('choir_2_low_men_drone', CHOIR_B['choir_2_low_men_drone'], 601,
      'Choir candidate 2: low men\'s voices chanting one long dark wordless tone, close to a drone, level steady '
      'within about 4 dB for 29 s; a tight cluster of notes between 189 and 218 Hz with octaves above.',
      length=30.5, fout=2.0,
      caveat='Made from the second wording of the prompt: the first wording (CHOIR, seeds 601 and 602) read to earshot '
             'as a synthesizer pad, and its seed 601 was clipped. As a whole it reads as a choir (Mantra, Chant), but '
             'in 4 s windows the first four seconds and 24-28 s read as a pad: if only part is used, 4-24 s is the '
             'safest. Its notes do not sit on the A = 440 grid (strongest partials 218 Hz, an A3 19 cents flat, and '
             '189 Hz, an F sharp 39 cents sharp), and that 189 Hz is 2.5 Hz under the bell\'s main partial '
             '(191.7 Hz): the two beat if they overlap, so let the choir end before the stroke. Low men on "oh" can read as lowing cattle; earshot\'s forced choice says no (under 7% in '
             'every window), but a person should listen for it.')


choir('choir_3_humming', CHOIR_B['choir_3_humming'], 602,
      'Choir candidate 3 (the foundry\'s own idea): a large mixed choir asked to hum with closed mouths, so that no '
      'vowel or consonant competes with the spoken lines; the sound swells and falls back about every eight seconds, '
      'like breathing. D-minor colours (G, A, B flat, C, D, F), middle register, nothing under 170 Hz.',
      length=30.0, fout=2.0,
      caveat='Weakest of the three as a choir: the whole file reads as a choir, but in 4 s windows earshot hears a '
             'synthesizer pad more often than voices, and it hears an open vowel, not a hum, so the idea is only '
             'partly delivered. Its swells cover about 13 dB (quiet at 5-7 s, 11-12 s and 21-23 s, loud at 8-11 s, '
             '16-19 s and 24-27 s): under dialogue the level will need riding, or the swells placed between the '
             'lines. Two other wordings were tried for this slot and are kept only as raw takes: a hollow choir '
             '(low pedal and a high halo: read as a glass harp or singing bowl, not voices) and one held open fifth '
             '(the model would not hold it; both takes end by 27 s and one is clipped).')


# ---------------------------------------------------------------------------------------------- what else was tried

# Measured on 25-26 November 2026 with earshot (forced choice against each sound's alternatives; z among earshot's
# vocabulary). Raw takes are in audio/gen/ (git-ignored); `take NAME --seed N` re-makes any Stable Audio one.
CANDIDATES = {
    'choir_1_mixed_sustained': [
        'seed 601 (chosen): z +4.8, 100%; share read as a choir per 4 s window: 0.91 0.94 0.48 0.79 0.95 0.30 0.77 0.36',
        'seed 602: z +4.3, 99%; per window 0.39 0.71 0.86 0.86 0.33 0.12 0.23 0.03; wordless less certain (51% against 49%)'],
    'choir_2_low_men_drone': [
        'first wording (CHOIR), seed 601: fail, a synthesizer pad 94%; AudioSet Gong 0.69; 422 clipped samples at 1.1-2.1 s',
        'first wording, seed 602: fail, a synthesizer pad 93%; AudioSet Ambient music 0.73; a harmonic drone on 64 Hz '
        '(C2 -38 cents) whose third harmonic (191.0 Hz) falls on the bell\'s main partial',
        'second wording (CHOIR_B), seed 601 (chosen): z +4.8, 100%; per window 0.12 0.72 0.37 0.92 0.64 0.71 0.10 0.68',
        'second wording, seed 602: z +4.8, 100%; per window 0.83 0.86 0.79 0.94 0.81 0.96 0.50 0.04; reads as voices more '
        'steadily, but it is sung in phrases with gaps about every 5 s (level falls to -36 dBFS), so it is less of a '
        'drone; a fair swap if candidate 2 sounds synthetic'],
    'choir_3_humming': [
        'hollow wording (CHOIR choir_3_hollow_halo), seeds 601 and 602: fail, a synthesizer pad 99% and 96%; nearest '
        'descriptions a glass harp tone, a singing bowl',
        'humming wording, seed 601: z +3.8, 89%; the take ends at 26 s',
        'humming wording, seed 602 (chosen): z +4.4, 100%; per window 0.10 0.06 0.10 0.42 0.34 0.42 0.10 0.23',
        'held open fifth (CHOIR_B choir_3_held_fifth), seed 601: z +3.9, 97%; the chord moves anyway; ends at 26 s',
        'held open fifth, seed 602: z +4.0, 97%; 4 clipped samples at 16.65 s; ends at 28 s'],
    'bell_body': [
        'synthesised (chosen): alone it reads as a low synthesizer drone (96%); under the film stroke the size choice '
        '"a very large low-pitched bell" rises from 47% (stroke alone) to about 94%',
        'Stable Audio SFX seed 101 (TAKES bell_body_gen), as generated: partials at 79, 160, 271 and 412 Hz, decay about '
        '2.5 dB a second: no 48 or 96 Hz, and its 79 Hz beats 4 times a second against the film stroke\'s 83 Hz. Alone it '
        'reads as a bell more than the film stroke does (first 12 s: bell 77%, gong 21%; whole 20 s against another '
        'set of alternatives: gong 70%, bell 30%; the film stroke alone: gong 96%). Under the stroke: large 82%',
        'the same take at 0.607 speed (hum on 48.0 Hz, then 97.2, 164.4, 249.8, 310.3 Hz): reads as a gong (99%), and '
        'its 164 Hz sits 7 Hz under the stroke\'s 172 Hz. Under the stroke: large 89%'],
    'bell_landing': [
        'seed 102 as generated: pass (z +3.6), but the thud comes 2.3 s into the take, after other knocks',
        'seed 1102 as generated, 1.33-3.83 s: pass (z +3.1), but the size choice says medium 86%, huge 12%',
        'seed 1102 at 0.7 speed: pass (z +3.6), huge 69%; with the sub layer at -4 dB: pass but "a drum hit" takes 32%',
        'seed 1102 at 0.7 speed with the slower sub at -6 dB (chosen)',
        'seed 1102 at 0.55 speed: fail, a drum hit 89%'],
    'chains_slack': [
        'first wording (chains_slack_first), seed 103: fail, coins dropping 99%',
        'second wording, seed 1103, as generated: fail, coins dropping 50% against chains 46% (z +4.0)',
        'seed 1103 at 0.7 speed alone: fail, a metal gate closing 67%',
        'earshot chain/rattle as made: fail, coins dropping 100%; at 0.6 speed: pass (z +4.5), all energy above 6 kHz',
        'seed 1103 at 0.7 speed with earshot chain/rattle at 0.45 speed, -3 dB (chosen): size choice huge 97%'],
    'rope_creak': [
        'Stable Audio seed 104, 0.45-2.25 s: pass by margin only (z +2.1)',
        'CC0 House_Creak_2 alone: pass by margin (z +2.5); earshot hears knocks',
        'earshot door/creak at 0.7 speed: fail, a door hinge squeaking 69%',
        'CC0 creak at 0.8 speed with the Stable Audio take at 0.8 speed, -6 dB (chosen): size choice huge 94%'],
    'wax_press': [
        'Stable Audio seed 106, 0.10-1.10 s (chosen)',
        'the same at 0.8 and 0.7 speed: fail, paper being crumpled 58% and 69%'],
    'ring_lift': [
        'Stable Audio seed 107, its first event (chosen); its second event (0.55-0.95 s) also passes (z +3.9)',
        'synthesised crackle and tick (synth_ring_lift, kept in this script): fail, a finger snap 67%'],
    'paper_handling': [
        'Stable Audio seed 108: fail, paper crumpled into a ball 63% (z +3.1); other windows and slower speeds of it: '
        'fail (crumpled 44-100%)',
        'Stable Audio seed 1108: fail, crumpled 95%',
        'single library sounds: earshot paper/page (crumpled 90%), flick/paper (crumpled 75%), slide/paper (a book '
        'closing 72%), CC0 slide (paper being torn 45%), CC0 rustle (crumpled 96%): all fail',
        'earshot paper/page at 0.7 speed, then CC0 slide at 0.55 speed (chosen)'],
    'wind_altitude': [
        'synthesis, four slowly drifting bands: fail, static white noise hiss 99% (z +1.9)',
        'synthesis with level swells: fail, ocean waves on a beach 72-97% (z +2.3 to +2.4)',
        'Stable Audio SFX seed 110 (TAKES wind_altitude), 47 s: fail, static white noise hiss 90% (z +2.8); AudioSet '
        'Vehicle, Aircraft; almost nothing above 2 kHz',
        'earshot wind/open and wind/mountain as 40 s loops: fail, howling wind with strong gusts 86% (z +2.6, +1.9)',
        'synthesis with wandering resonances (chosen): fail, static white noise hiss 62%, ocean waves 31% (z +2.9)',
        'the chosen synthesis with earshot wind/open under it at -6 to -12 dB: fail, ocean waves 81-94%'],
    'crowd_presence': [
        'Stable Audio seed 111 (chosen): the raw take passes (z +3.7, 100%); speech 3% or less in every 2 s window',
        'Stable Audio seed 1111 (32 s): pass (z +3.2, 97%), but sparser and 15 dB quieter, with door slams (4-8 s), '
        'the same Speech tags (0.2-0.5) and a stretch tagged Music 0.62 (24-28 s): not better',
        'a second CC0 cough ("Cough (3)" by OwlStorm, Freesound 151217) at 14.9 s: removed; with the hall on it earshot '
        'described that window as a horse neighing or a cow mooing, and AudioSet tagged the bed Animal and Coo'],
    'gloved_applause': [
        'first wording (gloved_applause_first), seed 112, as generated: fail, sharp loud hand clapping 74-91% (z +3.2); '
        'AudioSet Tap, Whip, Clapping 0.10',
        'seed 112 low-passed at 900 Hz with hall: ahead without a clear margin (61% against 38%; z +2.4), but a second '
        'probe (applause against rain, an explosion, horses, static) hears horses galloping',
        'synthesised padded thuds (400-2500 a second): fail, rain falling 87-97%',
        'second wording, seed 1112, as generated: fail, sharp loud hand clapping 100% (z +3.7); AudioSet Clapping 0.48; '
        'second probe: applause 78%',
        'seed 1112 with any low-pass (5 kHz, 3.5 kHz, 2.5 kHz, 1.5 kHz, 1.2 kHz), with or without softened peaks: still '
        'loses to sharp clapping (91-100%) except at 1.2 kHz with hall (42% against 40%, z +1.9), and the second probe '
        'hears horses galloping 88-100%',
        'seed 1112, peaks held to 1.5 times the local level, hall -6 dB, no low-pass (chosen): the second probe keeps '
        'applause (77% softened only; 95% with hall only)'],
}


# ---------------------------------------------------------------------------------------------- manifest and CLI

def load_manifest():
    if os.path.exists(MANIFEST):
        return {s['name']: s for s in json.load(open(MANIFEST)).get('sounds', [])}
    return {}


def save_manifest(entries):
    doc = {'film': 'The Weight of Heaven', 'made_by': 'tools/sfx_make.py (re-make any file: make NAME --force)',
           'format': 'FLAC, 24-bit, 48 kHz; stereo where the brief asked for it, otherwise mono',
           'finish': FINISH_NOTE + '. Where a bright transient\'s inter-sample peak would pass full scale, the gain '
                     'is set by the true peak instead (ring_lift). Loop-safe beds are not faded. hall_impulse is '
                     'unit-energy, not peak-normalised.',
           'earshot_rule': RULE, 'cost': 'nothing paid: local CPU generation, CC0 recordings and numpy synthesis',
           'sounds': [entries[n] for n in SOUNDS if n in entries]
                     + [e for n, e in entries.items() if n not in SOUNDS]}
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    tmp = MANIFEST + '.partial'
    with open(tmp, 'w') as fh:
        json.dump(doc, fh, indent=1, ensure_ascii=False)
        fh.write('\n')
    os.replace(tmp, MANIFEST)
    write_credits(entries)


SOURCES_MD = """## Sources and licences

- **Stable Audio 3.0 Small SFX** and **Stable Audio 3.0 Small Music** (Stability AI), q8_0 GGUF conversions from
  `audio-cpp/audio.cpp-gguf` on Hugging Face, run locally on CPU with audio.cpp (Apache-2.0, github.com/0xShug0/audio.cpp;
  weights fetched with Soundbox/Mirli, MIT, github.com/HamSanders/soundbox). Output is under the **Stability AI
  Community License** (https://stability.ai/license): free for commercial use while annual revenue is under
  USD 1M; above that an Enterprise licence is needed. No key, no credits, nothing paid.
- **Original synthesis** in `tools/sfx_make.py` (numpy/scipy): no third-party material; belongs to the production.
- **CC0 recordings from Freesound**, already committed in this repository at `claude-film/one-too-many/audio/sfx/`
  (credit not required, given anyway):
  - "House_Creak_2.wav" by SholeColtis, https://freesound.org/people/SholeColtis/sounds/683416/ (in `rope_creak`)
  - "55_Coger_Foto.wav (Sliding Paper)" by Atrius1, https://freesound.org/people/Atrius1/sounds/470189/ (in `paper_handling`)
  - "Strong Double Cough" by qubodup, https://freesound.org/people/qubodup/sounds/743360/ (in `crowd_presence`)
- **earshot** catalogue designs (`earshot make`, earshot 1.0.0, MIT, github.com/Leonxlnx/earshot): `chain/rattle`
  (in `chains_slack`) and `paper/page` (in `paper_handling`). earshot computes these from numbers learned from
  public-domain recordings; no audio file ships with it.
- The choir candidates are wordless and generated: no text and no existing work was given to the model. Whether any
  of them resembles an existing piece can only be judged by ear; earshot cannot name works.
- Not used: fal, Lyria, ElevenLabs or any other paid service. Freesound itself (the proxy refused the host) and the
  opus-sound-layer library (its GitHub repository could not be cloned) were not reachable from the build machine on
  25 November 2026, so the only recordings are the three above, taken from this repository.
"""


SA_TERMS, SA_ATTR = 'Stability AI Community License', 'Stable Audio 3.0 Small (Stability AI)'
# file -> (source, terms, attribution, what was done to the source)
LEDGER = {
    'bell_body': ('made in code', 'original', 'none needed', 'n/a'),
    'hammer_whoosh': ('made in code', 'original', 'none needed', 'n/a'),
    'wind_altitude': ('made in code', 'original', 'none needed', 'n/a'),
    'hall_impulse': ('made in code', 'original', 'none needed', 'n/a'),
    'bell_landing': ('generated locally, with a sub layer made in code', SA_TERMS + ' + original', SA_ATTR,
                     'cut, slowed to 0.7 speed, layered, levelled'),
    'chains_slack': ('generated locally, layered with an earshot catalogue design', SA_TERMS + ' + earshot (MIT)',
                     SA_ATTR + '; earshot', 'cut, both layers slowed, levelled'),
    'rope_creak': ('CC0 recording, layered with a locally generated take', 'CC0 1.0 + ' + SA_TERMS,
                   'SholeColtis (Freesound 683416); ' + SA_ATTR, 'cut, both layers slowed to 0.8 speed, levelled'),
    'wax_press': ('generated locally', SA_TERMS, SA_ATTR, 'cut, levelled'),
    'ring_lift': ('generated locally', SA_TERMS, SA_ATTR, 'cut, levelled'),
    'paper_handling': ('earshot catalogue design, layered with a CC0 recording', 'earshot (MIT) + CC0 1.0',
                       'earshot; Atrius1 (Freesound 470189)', 'both layers slowed, levelled'),
    'cloth_move': ('generated locally', SA_TERMS, SA_ATTR, 'cut, levelled'),
    'crowd_presence': ('generated locally, with one CC0 cough through the hall impulse', SA_TERMS + ' + CC0 1.0',
                       SA_ATTR + '; qubodup (Freesound 743360)', 'cut, looped by cross-fade, one knock turned down'),
    'gloved_applause': ('generated locally, through the hall impulse', SA_TERMS, SA_ATTR,
                        'cut, clap peaks limited, reverb added, levelled'),
    'choir_1_mixed_sustained': ('generated locally', SA_TERMS, SA_ATTR, 'cut, high-pass 30 Hz, levelled'),
    'choir_2_low_men_drone': ('generated locally', SA_TERMS, SA_ATTR, 'cut, high-pass 30 Hz, levelled'),
    'choir_3_humming': ('generated locally', SA_TERMS, SA_ATTR, 'cut, high-pass 30 Hz, levelled'),
}


def write_credits(entries):
    """audio/CREDITS.md: the rights ledger for every delivered file (score-and-sound-design.md section 10)"""
    rows = []
    for n in SOUNDS:
        if n not in entries:
            continue
        src, terms, attr, done = LEDGER[n]
        rows.append(f"| `{entries[n]['path']}` | {src} | {terms} | {attr} | "
                    f"{'yes, while annual revenue is under USD 1M' if 'Stability' in terms else 'yes'} | {done} | "
                    f"{time.strftime('%Y-%m-%d')} | candidate |")
    doc = ['# The Weight of Heaven: sound credits', '',
           'Every file made by `tools/sfx_make.py` for the opening (movement I). What each one is, how it was made '
           '(model, exact prompt, seed, steps, edits), its earshot check and its caveats are in '
           '`audio/sfx/manifest.json`. Nothing here was paid for. Status "candidate" means delivered to the mix and '
           'not yet approved by the author.', '',
           '| File | Source | Terms | Attribution | Commercial use | Modified | Checked | Status |',
           '| --- | --- | --- | --- | --- | --- | --- | --- |', *rows, '', SOURCES_MD]
    with open(CREDITS + '.partial', 'w') as fh:
        fh.write('\n'.join(doc))
    os.replace(CREDITS + '.partial', CREDITS)


def do_make(name, force=False, check=True):
    s = SOUNDS[name]
    path = os.path.join(ROOT, s['out'])
    entries = load_manifest()
    if os.path.exists(path) and not force and name in entries:
        print(f'{name}: kept ({s["out"]})')
        return
    y, how = s['make']()
    y = np.asarray(y, np.float64)
    assert np.isfinite(y).all() and np.abs(y).max() <= 1.0, f'{name}: out of range'
    write_flac(path, y)
    e = {'name': name, 'path': s['out'], 'what': s['what']}
    e.update(measure_summary(path))
    e['how'] = how
    e['licence'] = s['licence']
    e['loop_safe'] = bool(s['loop'])
    if s['loop']:
        e['loop_seam'] = seam(path)
    e['caveat'] = s['caveat']
    if s.get('analyse'):
        e['analysis'] = s['analyse'](path)
    old = entries.get(name, {})
    for k in ('earshot', 'candidates', 'notes'):
        if k in old:
            e[k] = old[k]
    entries[name] = e
    save_manifest(entries)
    print(f"{name}: {e['duration_s']} s, {e['channels']} ch, peak {e['levels']['peak_dbfs']} dBFS, "
          f"{e['levels']['lufs']} LUFS -> {s['out']}", flush=True)
    if check:
        do_check(name)


def measure_summary(path):
    m = measure(path)
    return {'duration_s': m.pop('duration_s'), 'channels': m.pop('channels'), 'sample_rate': m.pop('sample_rate'),
            'bit_depth': m.pop('bit_depth'), 'levels': m}


def seam(path):
    """how a loop wraps: the step from the last sample to the first against the file's ordinary sample steps, and the
    level of the half second either side of the wrap"""
    x, sr = sf.read(path, always_2d=True)
    d = np.abs(np.diff(x, axis=0))
    step = float(np.abs(x[0] - x[-1]).max())
    h = sr // 2
    return {'wrap_step': round(step, 5), 'median_step': round(float(np.median(d)), 5),
            'p99_step': round(float(np.percentile(d, 99)), 5),
            'rms_db_last_half_s': round(db(np.sqrt(np.mean(x[-h:] ** 2))), 1),
            'rms_db_first_half_s': round(db(np.sqrt(np.mean(x[:h] ** 2))), 1),
            'seamless': bool(step <= np.percentile(d, 99.9))}


def do_check(name):
    s = SOUNDS[name]
    path = os.path.join(ROOT, s['out'])
    target = s['check_file']() if s.get('check_file') else path
    text, alts = s['check']
    r = listen(target, text, alts)
    if target != path:
        r['checked_file'] = os.path.relpath(target, ROOT)
    if s.get('probes'):
        from earshot import api
        r['probes'] = []
        for q, al in s['probes']:
            m = api.match(target, q, alts=al)
            r['probes'].append({q: round(float(m['p_vs_alts']), 2),
                                **{a['query']: round(float(a['p']), 2) for a in m.get('alts') or []}})
    if s.get('extra_check'):
        r.update(s['extra_check'](path))
    entries = load_manifest()
    entries[name]['earshot'] = r
    if name in CANDIDATES:
        entries[name]['candidates'] = CANDIDATES[name]
    save_manifest(entries)
    print(f"{name}: earshot {'PASS' if r['pass'] else 'FAIL'}: {r['result']}; tags: {', '.join(r['audioset'][:4])}",
          flush=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('list')
    p = sub.add_parser('take')
    p.add_argument('name')
    p.add_argument('--seed', type=int)
    for c in ('make', 'check'):
        p = sub.add_parser(c)
        p.add_argument('name')
        if c == 'make':
            p.add_argument('--force', action='store_true')
            p.add_argument('--no-check', action='store_true')
    sub.add_parser('manifest')
    a = ap.parse_args()
    names = list(SOUNDS) if getattr(a, 'name', None) == 'all' else [getattr(a, 'name', None)]
    if a.cmd == 'list':
        for n, s in SOUNDS.items():
            print(f"{n:28s} {s['out']:44s} {s['licence'].split(';')[0].split('(')[0].strip()}")
    elif a.cmd == 'take':
        g = TAKES.get(a.name)
        if not g:
            sys.exit(f'sfx_make: no Stable Audio prompt for {a.name}; one of: {", ".join(TAKES)}')
        model, prompt, dur, seed = g
        x, rec = sa(model, prompt, dur, a.seed if a.seed is not None else seed)
        print(json.dumps(rec))
    elif a.cmd == 'manifest':
        save_manifest(load_manifest())
    else:
        for n in names:
            if n not in SOUNDS:
                sys.exit(f'sfx_make: unknown sound {n}; one of: {", ".join(SOUNDS)}')
            do_make(n, a.force, not a.no_check) if a.cmd == 'make' else do_check(n)


if __name__ == '__main__':
    main()
