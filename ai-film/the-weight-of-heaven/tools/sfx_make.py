#!/usr/bin/env python3
"""The Weight of Heaven: the sound foundry. Every file in audio/sfx/ and audio/choir/ is re-made from this script.

Run it with earshot's Python (numpy, scipy, soundfile, soxr; earshot itself for `check` and for the sounds that
come from earshot's catalogue):

    PY=/root/leonxlnx/earshot/.venv/bin/python
    $PY tools/sfx_make.py list                      the sounds and how each is made
    $PY tools/sfx_make.py take NAME [--seed N]      one raw Stable Audio audition take -> audio/gen/ (git-ignored)
    $PY tools/sfx_make.py make NAME|all [--force]   the delivered file -> audio/sfx/*.flac or audio/choir/*.flac
    $PY tools/sfx_make.py check NAME|all            earshot match + measurements, written into the manifest
    $PY tools/sfx_make.py manifest                  rewrite audio/sfx/manifest.json from the plan and the checks

Three kinds of source, nothing paid:
  * Stable Audio 3.0 Small (SFX and Music fine-tunes, q8_0 GGUF) on CPU through audio.cpp, one take at a time,
    --threads 2 (Stability AI Community License). audio.cpp writes 44.1 kHz 16-bit stereo; raw takes are cached in
    audio/gen/ by model, seed, duration and a hash of the prompt.
  * numpy synthesis (the bell body, the swing, the wind, the hall impulse, sub layers): original, seeded, exact.
  * CC0 recordings already committed in this repository (claude-film/one-too-many/audio/sfx, Freesound CC0) and
    earshot's own catalogue (`earshot make`, MIT; its realistic designs are computed from public-domain recordings).

Finishing (sound.md section 3): 48 kHz (soxr), onset trimmed (first 1 ms frame within 40 dB of the peak, cut 3 ms
early, 2 ms de-click), peak-normalised to -1 dBFS, raised-cosine fade-out, 24-bit FLAC. Loop-safe beds are not faded:
they are seamless at the wrap instead. The hall impulse is normalised to unit energy, not to peak.

Environment: AUDIOCPP_CLI (audio.cpp binary), SOUNDBOX_DATA_DIR (holds the GGUF weights), SFX_THREADS (default 2).
"""
import argparse, hashlib, json, os, subprocess, sys, time

import numpy as np
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(ROOT))
GEN = os.path.join(ROOT, 'audio', 'gen')
MANIFEST = os.path.join(ROOT, 'audio', 'sfx', 'manifest.json')
CHECKS = os.path.join(ROOT, 'audio', 'sfx', 'checks.json')
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


def finish(x, trim=True, fout=0.15, fin=0.002, peak_db=-1.0, length=None):
    """a take at 48 kHz -> the sound as the mix gets it"""
    y = np.array(x, np.float64)
    cut = max(0, onset(y) - int(0.003 * SR)) if trim else 0
    y = y[cut:]
    if length:
        y = y[:int(round(length * SR))]
    y = fade(y, fin, fout)
    gain = lin(peak_db) / np.abs(y).max()
    return y * gain, {'onset_trim_ms': round(1000 * cut / SR, 1), 'gain_db': round(db(gain), 2)}


def write_flac(path, x):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.partial.flac'
    sf.write(tmp, np.asarray(x, np.float64), SR, subtype='PCM_24', format='FLAC')
    os.replace(tmp, path)


def fft_filter(x, gain_of_f):
    """zero-phase filtering of a whole (n,) or (n, ch) signal by a gain curve over frequency (a function of Hz)"""
    x = np.asarray(x, np.float64)
    n = len(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = gain_of_f(f)
    if x.ndim == 1:
        return np.fft.irfft(np.fft.rfft(x) * g, n)
    return np.stack([np.fft.irfft(np.fft.rfft(x[:, c]) * g, n) for c in range(x.shape[1])], 1)


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
    return os.path.join(GEN, f'sa_{model}_s{seed}_d{dur:g}_{h}.wav')


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
                            '--duration-seconds', f'{dur:.3f}', '--seed', str(seed)],
                           stdin=subprocess.DEVNULL, capture_output=True, text=True)
        if r.returncode or not os.path.isfile(tmp):
            raise RuntimeError('audio.cpp failed:\n' + '\n'.join((r.stdout + r.stderr).strip().splitlines()[-12:]))
        os.replace(tmp, path)
        if not quiet:
            print(f'  generated {os.path.basename(path)} in {time.time() - t0:.0f} s', flush=True)
    raw, sr = sf.read(path, always_2d=True, dtype='int16')
    pk = int(np.abs(raw.astype(np.int32)).max())
    if pk < 32768 * lin(-70):
        raise RuntimeError(f'near-silent take ({path})')
    return read(path), {'raw': os.path.relpath(path, ROOT), 'raw_peak_dbfs': round(db(pk / 32768), 2),
                        'raw_clipped_samples': int((np.abs(raw.astype(np.int32)) >= 32767).sum())}


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
