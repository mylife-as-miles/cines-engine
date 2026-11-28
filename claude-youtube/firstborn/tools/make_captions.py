"""Build the captions and the chapter list from the narration's word times.

  python3 tools/make_captions.py           -> publish/firstborn.en.srt, publish/firstborn.en.vtt,
                                              publish/chapters.txt (and the chapter lines in publish/description.md)
  python3 tools/make_captions.py --check   -> the same checks, nothing written

Text comes from publish/captions.txt (one caption per line, " / " for a line break); times come from
audio/vo/words.json (the narration's clock, written by tools/vo_edit.py), so after any change run vo_edit.py,
then this.

Whisper's artefacts are cleaned before matching: a word repeated where its windows overlapped ("happiest
happiest", "Not not", "that. that.": same word, starting before the previous one ends) is dropped, a split
hyphenated word ("water -carrying") is joined, FIXES rewrites single words it spelled oddly, and SPOKEN
corrects what it misheard, dropped or split (each checked by ear: Whisper medium.en and large-v3-turbo on the
spot, and the narration's own pauses). A SPOKEN entry whose heard words are no longer in words.json (because
vo_edit.py was fixed) is skipped with a note; one found more than once stops the tool.

Timing: a caption starts on its first word and ends on its last word's end (held END_HOLD longer where there
is room), clipped to the next caption's start. Whisper's word starts drift by up to 0.3 s around pauses, so
each start is checked against the narration itself: if the caption starts in a silence, it moves to LEAD before
the voice that follows; if it starts inside the voice, it moves back to LEAD before where that stretch of voice
began after a silence (never onto the previous word; at most SNAP_LATER later or SNAP_MAX earlier). A caption shorter than MIN_DUR
then borrows time: first by starting the next caption a little later (never past its first word), then by
starting a little earlier. The checks: no overlaps, every caption at least MIN_DUR, at most two lines of at
most MAX_LINE characters; chapters start at 0:00 and last at least 10 s.
Stdlib, plus numpy for the onset check (skipped with a note if numpy or out/vo/narration.wav is missing).
"""
import json, math, os, re, sys, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORDS = os.path.join(ROOT, 'audio', 'vo', 'words.json')
NARRATION = os.path.join(ROOT, 'out', 'vo', 'narration.wav')
PUB = os.path.join(ROOT, 'publish')
TEXT = os.path.join(PUB, 'captions.txt')
BASE = os.path.join(PUB, 'firstborn.en')

MIN_DUR = 1.2          # s, shortest caption
MAX_LINE = 42          # characters per line
MAX_LINES = 2
MAX_SHIFT = 0.3        # s, most a caption may lend to a short neighbour
END_SCREEN = 8.0       # s of end screen after the last word (the video is narration + 8 s)
MIN_CHAPTER = 10.0     # s, YouTube's minimum
LEAD = 0.10            # s, a caption appears this much before the voice
SNAP_MAX = 0.45        # s, the most a start moves earlier to meet the voice
SNAP_LATER = 0.6       # s, the most it moves later (Whisper's starts run up to 0.5 s early after a pause)
END_HOLD = 0.4         # s, a caption stays this long after its last word when the next one is not due
SILENT_DB, VOICE_DB = -50.0, -45.0   # dBFS per 10 ms; the take's floor is about -62, speech -10 to -30

FIXES = [(r'^Kobo', 'kobo'),              # single words: the Nigerian currency is lower case,
         (r'^apologiz', 'apologis'),      # and British (Nigerian) spelling, as in captions.txt
         (r'^neighbor', 'neighbour')]

# (what words.json has, what is said, times for the said words or None, how we know). With None, the times
# carry over word for word when the counts match, else the heard span is shared out by length. The heard
# words must occur exactly once.
SPOKEN = [
    ('first born.', 'firstborn.', None, 'one word; medium.en and large-v3-turbo write it so'),
    ('1 .0,', '1.0,', None, 'Whisper split the number at the point'),
    ('Middle Surname.', 'Middle name. Surname.', [(108.68, 108.78), (108.78, 109.66), (109.66, 110.38)],
     'small.en dropped "name"; medium.en and large-v3-turbo both hear it (their times)'),
    ('Go in by salt.', 'Go and buy salt.', None, 'medium.en and large-v3-turbo both hear "and buy"'),
    ('In the careers,', 'And the careers?', None, 'medium.en, large-v3-turbo and small.en on a shorter clip: "And"'),
    ("Here's", 'Here is', None, 'medium.en and large-v3-turbo; she says "here is" elsewhere too'),
    ('know the look.', 'You know the look.', [(78.22, 78.46), (78.46, 78.58), (78.58, 78.74), (78.74, 79.42)],
     'vo_edit.py dropped "You" as a duplicate of "you." before it; restored from voice_words_whisper.json'),
    ('graduate.', 'You graduate.', [(196.30, 196.76), (196.76, 197.52)],
     'vo_edit.py dropped "You" as a duplicate of "you." before it; restored from voice_words_whisper.json'),
    ('bed at 7.', 'bed at seven.', None, 'style: numbers to ten in words'),
]

# (title, words the chapter starts on; searched after the previous chapter's start). First is always 0:00.
# Titles from design/SEQUENCES.md; each starts on the floor of its first word's second, so no word is missed.
CHAPTERS = [('Born and hired', None),
            ('Version 1.0', "So let's walk through your entire life"),
            ('Promoted at six', 'Then a baby arrives'),
            ('The teenage years', 'Now you are a teenager'),
            ('The first salary', 'You graduate You get a job'),
            ('Management at 30', 'By 30 your job title'),
            ('The honest part', "Now let's be honest"),
            ('One thing you can do', 'So here is something you can do'),
            ('Call your elder sibling', 'So that is your whole life')]


def norm(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())


def clean_words(words):
    """Whisper's word list -> words to match against, with times. Returns (words, notes)."""
    out, notes = [], []
    for w in words:
        w = dict(w)
        if w['w'].startswith('-') and out:                      # a hyphenated word split in two
            out[-1]['w'] += w['w']; out[-1]['t1'] = max(out[-1]['t1'], w['t1'])
            notes.append(f"joined {out[-1]['w']!r} at {out[-1]['t0']:.2f}")
            continue
        if out and norm(w['w']) == norm(out[-1]['w']) and w['t0'] < out[-1]['t1'] - 0.02:
            notes.append(f"dropped duplicate {w['w']!r} at {w['t0']:.2f} (overlaps {out[-1]['w']!r} "
                         f"{out[-1]['t0']:.2f}-{out[-1]['t1']:.2f})")
            continue
        out.append(w)
    for w in out:
        for pat, rep in FIXES:
            new = re.sub(pat, rep, w['w'])
            if new != w['w']:
                notes.append(f"fixed {w['w']!r} -> {new!r} at {w['t0']:.2f}"); w['w'] = new
    apply_spoken(out, notes)
    for w in out:
        w['n'] = norm(w['w'])
    return [w for w in out if w['n']], notes


def apply_spoken(out, notes):
    """Rewrite the word list in place with SPOKEN: what Whisper heard -> what is said, with times."""
    for heard, said, at, why in SPOKEN:
        ht = [norm(t) for t in heard.split() if norm(t)]
        nw = [norm(w['w']) for w in out]
        hits = [i for i in range(len(out)) if nw[i:i + len(ht)] == ht]
        if not hits:
            notes.append(f"SPOKEN {heard!r}: not in words.json any more, skipped"); continue
        if len(hits) > 1:
            sys.exit(f"SPOKEN {heard!r} occurs {len(hits)} times; give it more words so it is unique")
        i, said_w = hits[0], said.split()
        ns = [norm(t) for t in said_w]
        if at and len(ns) > len(ht) and ns[len(ns) - len(ht):] == ht:          # an insertion before the heard words
            pre = ns[:len(ns) - len(ht)]
            if i >= len(pre) and nw[i - len(pre):i] == pre and out[i - len(pre)]['t0'] >= at[0][0] - 0.15:
                notes.append(f"SPOKEN {said!r}: already in words.json, skipped"); continue
        old = out[i:i + len(ht)]
        if at:
            assert len(at) == len(said_w), f"SPOKEN {said!r}: {len(at)} times for {len(said_w)} words"
            times = at
        elif len(said_w) == len(old):
            times = [(w['t0'], w['t1']) for w in old]
        else:                                                                   # share the heard span by length
            a, b, t, times = old[0]['t0'], old[-1]['t1'], old[0]['t0'], []
            total = sum(len(s) for s in said_w)
            for s in said_w:
                d = (b - a) * len(s) / total; times.append((t, t + d)); t += d
        out[i:i + len(ht)] = [{'w': s, 't0': round(t0, 3), 't1': round(t1, 3)} for s, (t0, t1) in zip(said_w, times)]
        notes.append(f"heard {heard!r} -> said {said!r} at {times[0][0]:.2f} ({why})")


def read_captions():
    caps = []
    for line in open(TEXT, encoding='utf-8'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        caps.append({'text': line, 'toks': [norm(t) for t in line.replace(' / ', ' ').split() if norm(t)]})
    return caps


def align(caps, words):
    """Give each caption the span of words it covers. Captions whose words are gone are dropped."""
    def match(c, p):
        return words[p:p + len(c['toks'])] and [w['n'] for w in words[p:p + len(c['toks'])]] == c['toks']

    def runs(j, p, n=3):                                    # do captions j, j+1, j+2 follow on from word p?
        for c in caps[j:j + n]:
            if not match(c, p):
                return False
            p += len(c['toks'])
        return True
    out, p, i, warns = [], 0, 0, []
    while i < len(caps):
        if p >= len(words):
            warns += [f"caption cut (no words left): {c['text']!r}" for c in caps[i:]]; break
        if match(caps[i], p):
            c = dict(caps[i]); c['w'] = words[p:p + len(c['toks'])]; out.append(c)
            p += len(c['toks']); i += 1; continue
        j = next((j for j in range(i + 1, len(caps)) if runs(j, p)), None)   # skip only cut captions, not a lone "No."
        if j is None:
            got = ' '.join(w['w'] for w in words[p:p + 12])
            sys.exit(f"words and captions differ at {words[p]['t0']:.2f} s\n  narration: {got} ...\n"
                     f"  captions.txt: {caps[i]['text']}\nEdit publish/captions.txt to match the narration.")
        warns += [f"caption cut: {c['text']!r}" for c in caps[i:j]]; i = j
    if p < len(words):
        sys.exit(f"narration has words after the last caption: {' '.join(w['w'] for w in words[p:p + 12])}")
    return out, warns


def break_lines(text):
    if ' / ' in text:
        return [s.strip() for s in text.split(' / ')]
    if len(text) <= MAX_LINE:
        return [text]
    toks, best = text.split(), None
    weak = {'a', 'an', 'the', 'to', 'of', 'and', 'or', 'for', 'in', 'on', 'that', 'you'}
    for k in range(1, len(toks)):
        a, b = ' '.join(toks[:k]), ' '.join(toks[k:])
        cost = abs(len(a) - len(b)) + (100 if max(len(a), len(b)) > MAX_LINE else 0)
        cost -= 12 if a[-1] in ',.?!:' else 0
        cost += 8 if toks[k - 1].lower() in weak else 0
        if best is None or cost < best[0]:
            best = (cost, [a, b])
    return best[1]


def typeset(s):
    s = re.sub(r'(^|[\s(\[])"', '\\1\u201c', s)
    return s.replace('"', '\u201d').replace("'", '\u2019')


def narration_db():
    """10 ms frame levels (dBFS) of the narration, or None."""
    try:
        import numpy as np
        with wave.open(NARRATION) as f:
            sr, ch, sw, raw = f.getframerate(), f.getnchannels(), f.getsampwidth(), f.readframes(f.getnframes())
    except Exception as e:
        return None, f"onset check skipped ({e.__class__.__name__}: {e})"
    if sw == 3:
        b = np.frombuffer(raw, np.uint8).reshape(-1, 3).astype(np.int32)
        x = ((b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)) << 8 >> 8) / 2 ** 23
    else:
        x = np.frombuffer(raw, {2: np.int16, 4: np.int32}[sw]) / float(2 ** (8 * sw - 1))
    x = x.reshape(-1, ch).mean(1)
    h = sr // 100; n = len(x) // h
    return 20 * np.log10(np.sqrt((x[:n * h].reshape(n, h) ** 2).mean(1)) + 1e-9), None


def voice_onset(db, t):
    """Where the voice around t starts, or None. Silent at t: the first voiced frame within SNAP_LATER after it,
    if most of the 50 ms just before it is silent. Voiced at t: walk back to the 80 ms silence that began this
    stretch of voice, within SNAP_MAX; None if the voice runs further back than that."""
    k0 = int(round(t * 100))
    if k0 >= len(db):
        return None
    if db[k0] <= VOICE_DB:
        k = next((k for k in range(k0, min(len(db), k0 + int(SNAP_LATER * 100))) if db[k] > VOICE_DB), None)
        if k is None or sum(db[j] < SILENT_DB for j in range(max(0, k - 5), k)) < 3:   # 30 of the 50 ms silent
            return None                                                                   # (the rise may sit between)
        return k / 100
    run = 0
    for j in range(k0, max(-1, k0 - int(SNAP_MAX * 100)), -1):
        run = run + 1 if db[j] < SILENT_DB else 0
        if run == 8:
            return next(k for k in range(j + 8, k0 + 1) if db[k] > VOICE_DB) / 100
    return None


def time_captions(caps, video_end, db):
    log, later, earlier = [], [], []
    for i, c in enumerate(caps):
        c['t0'], c['t1'] = c['w'][0]['t0'], c['w'][-1]['t1']
        o = voice_onset(db, c['t0']) if db is not None else None
        if o is None:
            continue
        s = o - LEAD
        if s > c['t0'] + 0.005:
            s = min(s, c['t0'] + SNAP_LATER, c['w'][0]['t1'])
            later.append(s - c['t0']); c['t0'] = s
        elif s < c['t0'] - 0.005 and i:
            prv = caps[i - 1]                    # never onto the previous word, and the previous caption keeps MIN_DUR
            s = max(s, c['t0'] - SNAP_MAX, prv['w'][-1]['t0'] + 0.3, prv['t0'] + MIN_DUR)
            if s < c['t0'] - 0.005:
                earlier.append(c['t0'] - s); c['t0'] = s
    for moved, how in ((later, 'later'), (earlier, 'earlier')):
        if moved:
            log.append(f"{len(moved)} starts moved {how} to meet the voice (by {min(moved):.2f}-{max(moved):.2f} s)")
    for a, b in zip(caps, caps[1:]):
        a['t1'] = min(max(a['t1'], a['w'][-1]['t1'] + END_HOLD), b['t0'])
    caps[-1]['t1'] = min(video_end, caps[-1]['t1'] + END_HOLD)
    for i, c in enumerate(caps):
        need = MIN_DUR - (c['t1'] - c['t0'])
        if need <= 1e-6:
            continue
        if i == len(caps) - 1:
            c['t1'] = min(video_end, c['t0'] + MIN_DUR); log.append(f"held the last caption to {c['t1']:.2f}"); continue
        nxt, prv = caps[i + 1], caps[i - 1] if i else None
        free = min(need, nxt['t0'] - c['t1'])                       # silence before the next caption
        if free > 0:
            c['t1'] += free; need -= free
        fw = nxt['w'][0]                                            # start the next one later, within its first word
        s = max(0.0, min(need, MAX_SHIFT, fw['t0'] + 0.75 * (fw['t1'] - fw['t0']) - nxt['t0'],
                         (nxt['t1'] - nxt['t0']) - MIN_DUR))
        if s >= 0.005:
            c['t1'] += s; nxt['t0'] += s; need -= s
            log.append(f"{typeset(c['text'])!r}: next caption starts {s:.2f} s later")
        if need > 1e-6:                                             # start earlier: into silence, then trim the last one
            floor = prv['t1'] if prv else 0.0
            s = max(0.0, min(need, MAX_SHIFT, c['t0'] - floor))
            if prv and need - s > 1e-6:
                s += max(0.0, min(need - s, MAX_SHIFT - s, (prv['t1'] - prv['t0']) - MIN_DUR,
                                  prv['t1'] - (prv['w'][-1]['t0'] + 0.3)))
            if s >= 0.005:
                c['t0'] -= s; need -= s
                if prv:
                    prv['t1'] = min(prv['t1'], c['t0'])
                log.append(f"{typeset(c['text'])!r}: starts {s:.2f} s earlier")
    return log


def check(caps):
    errs = []
    for i, c in enumerate(caps):
        d = c['t1'] - c['t0']
        if d < MIN_DUR - 1e-6:
            errs.append(f"#{i + 1} {d:.2f} s is under {MIN_DUR} s: {c['text']!r} (merge it in captions.txt)")
        if len(c['lines']) > MAX_LINES:
            errs.append(f"#{i + 1} has {len(c['lines'])} lines: {c['text']!r}")
        for ln in c['lines']:
            if len(ln) > MAX_LINE:
                errs.append(f"#{i + 1} line of {len(ln)} characters: {ln!r}")
        if i and c['t0'] < caps[i - 1]['t1'] - 1e-6:
            errs.append(f"#{i + 1} overlaps the caption before it")
    return errs


def stamp(t, sep):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d}{sep}{ms % 1000:03d}"


def chapters(words, video_end):
    rows, p = [], 0
    for title, anchor in CHAPTERS:
        if anchor is None:
            rows.append((0, title, 0.0)); continue
        toks = [norm(t) for t in anchor.split()]
        k = next((k for k in range(p, len(words)) if [w['n'] for w in words[k:k + len(toks)]] == toks), None)
        if k is None:
            sys.exit(f"chapter {title!r}: words {anchor!r} not found in the narration")
        rows.append((math.floor(words[k]['t0']), title, words[k]['t0'])); p = k + 1
    errs = []
    if rows[0][0] != 0:
        errs.append('first chapter is not at 0:00')
    for (a, ta, _), (b, tb, _) in zip(rows, rows[1:] + [(video_end, 'end', video_end)]):
        if b - a < MIN_CHAPTER:
            errs.append(f"chapter {ta!r} is {b - a:.1f} s (under {MIN_CHAPTER:.0f} s)")
    lines = [f"{s // 60}:{s % 60:02d} {t}" for s, t, _ in rows]
    return rows, lines, errs


def main():
    write = '--check' not in sys.argv
    raw = json.load(open(WORDS))['words']
    words, notes = clean_words(raw)
    try:
        with wave.open(NARRATION) as f:
            narr = f.getnframes() / f.getframerate()
    except Exception:
        narr = raw[-1]['t1']
    video_end = narr + END_SCREEN

    caps, warns = align(read_captions(), words)
    for c in caps:
        c['lines'] = break_lines(c['text'])
    db, note = narration_db()
    if note:
        notes.append(note)
    log = time_captions(caps, video_end, db)
    errs = check(caps)
    rows, ch_lines, ch_errs = chapters(words, video_end)

    print(f"{len(raw)} words -> {len(words)} after clean-up:")
    for n in notes:
        print('  ' + n)
    for m in log:
        print('  timing: ' + m)
    durs = [c['t1'] - c['t0'] for c in caps]
    print(f"{len(caps)} captions, {caps[0]['t0']:.2f}-{caps[-1]['t1']:.2f} s; shortest {min(durs):.2f} s, longest "
          f"{max(durs):.2f} s; longest line {max(len(l) for c in caps for l in c['lines'])} characters; "
          f"two-line captions {sum(len(c['lines']) == 2 for c in caps)}")
    print('chapters (video ' + f"{video_end:.1f} s):")
    for (s, t, w0), ln in zip(rows, ch_lines):
        print(f"  {ln:32s} first word at {w0:6.2f} s")
    for w in warns:
        print('WARNING: ' + w)
    for e in errs + ch_errs:
        print('FAIL: ' + e)

    if write:
        os.makedirs(PUB, exist_ok=True)
        with open(BASE + '.srt', 'w', encoding='utf-8') as f:
            for i, c in enumerate(caps, 1):
                f.write(f"{i}\n{stamp(c['t0'], ',')} --> {stamp(c['t1'], ',')}\n"
                        + '\n'.join(typeset(l) for l in c['lines']) + '\n\n')
        with open(BASE + '.vtt', 'w', encoding='utf-8') as f:
            f.write('WEBVTT\n\n')
            for i, c in enumerate(caps, 1):
                f.write(f"{i}\n{stamp(c['t0'], '.')} --> {stamp(c['t1'], '.')}\n"
                        + '\n'.join(typeset(l) for l in c['lines']) + '\n\n')
        with open(os.path.join(PUB, 'chapters.txt'), 'w', encoding='utf-8') as f:
            f.write('\n'.join(ch_lines) + '\n')
        desc = os.path.join(PUB, 'description.md')
        if os.path.exists(desc):                      # replace the block of "m:ss Title" lines in place
            src = open(desc, encoding='utf-8').read()
            new = re.sub(r'(?m)^(\d{1,2}:\d{2} .*\n)+', '\n'.join(ch_lines) + '\n', src, count=1)
            if new != src:
                open(desc, 'w', encoding='utf-8').write(new)
        print(f"wrote {os.path.relpath(BASE, ROOT)}.srt/.vtt, publish/chapters.txt")
    sys.exit(1 if errs or ch_errs else 0)


if __name__ == '__main__':
    main()
