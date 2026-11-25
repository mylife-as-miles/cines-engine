#!/usr/bin/env python3
"""Movie-standard English subtitles for the cut, from the screenplay's own words timed to the spoken words:

    python3 tools/subtitles.py subs/subs_v8.json

Text: every line of dialogue comes from design/script.json, verbatim, in screenplay order; parentheticals such as
"(beat)" are direction, not words, and split the line there. Only typesetting changes: "--" closes up onto the word as
an interruption ("can't even--"), and a subtitle that holds two speakers starts each line with a hyphen and no space.
Background voices the script gives no words (the over-black street voices) are not subtitled. No italics: both
speakers (and the sweeper) are in the scene; italics are for a voice not in the scene at all.

Timing: the words' times come from a transcript of the cut (faster-whisper with word timestamps; the config maps an
older cut's clock onto this one if the cut changed since), aligned to the screenplay's words. Then the rules, from
Netflix's timed-text guides (English, and General Requirements) and common subtitle-timing practice:
- at most 2 lines of at most 42 characters; one line unless the text is longer than 42; sentences join in one
  subtitle only on one line or one to a row, so a break never falls inside a sentence that could stand on its own;
  a long sentence breaks after punctuation or before a conjunction or preposition, never after an article, the lower
  line the longer where it can be;
- reading speed at most 17 characters a second (20 at the very most), counting every character;
- on screen at least 5/6 s (20 frames at 24 fps), at most 7 s;
- in at the first frame of speech; out up to 12 frames after the last word (more if reading speed needs it);
- at least 2 frames between subtitles; a gap under 12 frames is closed to 2 (chained);
- shot changes: an in-cue up to 12 frames before a cut, or up to 7 after, moves onto the cut; an out-cue within 12
  frames either side of a cut moves to 2 frames before it if the subtitle still reads at 17 a second or less, and
  otherwise holds to 12 frames past the cut (room allowing).
Writes subs/<name>.en.srt, .vtt and .ass (the burn-in style: Liberation Sans, i.e. Arial metrics, white with a black
edge, bottom centre inside the title-safe area) and a report of every event with its reading speed and any rule it
could not meet.
"""
import difflib, json, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 24
MAXC, MAXL = 42, 2
CPS, CPS_MAX = 17.0, 20.0
MIN_F, MAX_F = 20, 7 * FPS
GAP_F, CHAIN_F, LAG_F = 2, 12, 12
UNITS = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen ' \
        'seventeen eighteen nineteen'.split()
TENS = 'twenty thirty forty fifty sixty seventy eighty ninety'.split()
BREAK_BEFORE = set('and but or so because if when while that which who to at of in on for with by from as than'.split())
NO_BREAK_AFTER = set('a an the my your his her its our their to of'.split())   # not this/that: often pronouns


def num_words(n):
    if n < 20:
        return [UNITS[n]]
    t, u = divmod(n, 10)
    return [TENS[t - 2]] + ([UNITS[u]] if u else [])


def norm(tok):
    """a spoken token as the screenplay would spell it: lower case, no punctuation, numbers in words"""
    t = tok.strip().lower().strip('.,!?;:"\'()-')
    m = re.fullmatch(r'(\d{1,2})[.:](\d{2})', t)
    if m:                                                             # 1.31 -> one thirty one
        return num_words(int(m.group(1))) + num_words(int(m.group(2)))
    if re.fullmatch(r'\d{1,2}', t):
        return num_words(int(t))
    return [w for w in re.split(r"[-\s]+", t.replace('’', "'")) if w]


def script_lines(script, upto):
    lines = []
    for x in script:
        if x.get('kind') != 'line':
            continue
        lines.append(x)
        if x['id'] == upto:
            break
    return lines


def typeset(t):
    t = re.sub(r'\s*--\s*$', '--', t.strip())                         # an interruption closes up: "even--"
    t = re.sub(r'\s+--\s+', '-- ', t)
    return re.sub(r'\s+', ' ', t)


def sentences(text):
    """split a line into sentences and at parentheticals; each piece keeps its own punctuation"""
    out = []
    for part in re.split(r'\s*\([^)]*\)\s*', text):
        part = part.strip()
        if part:
            out += [s for s in re.findall(r'[^.!?]+(?:[.!?]+|--|$)', part) if s.strip()]
    return [s.strip() for s in out]


def break_lines(text):
    """one line if it fits; otherwise the best break into two lines of at most 42"""
    if len(text) <= MAXC:
        return [text]
    words = text.split(' ')
    best = None
    for i in range(1, len(words)):
        a, b = ' '.join(words[:i]), ' '.join(words[i:])
        if len(a) > MAXC or len(b) > MAXC:
            continue
        cost = abs(len(a) - len(b)) * 0.15
        if len(a) > len(b):
            cost += 2                                                 # the lower line the longer, where it can be
        if re.search(r'[.,?!;:]$', a) or a.endswith('--'):
            cost -= 6                                                 # after punctuation
        if words[i].lower().strip('.,') in BREAK_BEFORE:
            cost -= 3                                                 # before a conjunction or preposition
        if words[i - 1].lower().strip('.,') in NO_BREAK_AFTER:
            cost += 8                                                 # never after an article
        if best is None or cost < best[0]:
            best = (cost, [a, b])
    return best[1] if best else None


def align(lines, words):
    """each screenplay word's time, from the transcript words matched to it"""
    stoks, sref = [], []                                             # screenplay tokens: (line index, sentence index)
    for li, x in enumerate(lines):
        for si, s in enumerate(sentences(x['text'])):
            for tok in s.split():
                for n in norm(tok):
                    stoks.append(n); sref.append((li, si))
    wtoks, wtime = [], []
    for w in words:
        ns = norm(w['w'])
        for k, n in enumerate(ns):                                    # a number spoken as several words shares its time
            wtoks.append(n)
            d = (w['e'] - w['s']) / len(ns)
            wtime.append((w['s'] + k * d, w['s'] + (k + 1) * d))
    sm = difflib.SequenceMatcher(None, stoks, wtoks, autojunk=False)
    times = [None] * len(stoks)
    for a, b, size in sm.get_matching_blocks():
        for k in range(size):
            times[a + k] = wtime[b + k]
    spans = {}
    for (li, si), t in zip(sref, times):
        if t is None:
            continue
        s = spans.setdefault((li, si), [t[0], t[1]])
        s[0], s[1] = min(s[0], t[0]), max(s[1], t[1])
    matched = sum(t is not None for t in times)
    return spans, matched, len(stoks)


def refine(spans, audio, rise_db=10.0):
    """move each sentence's start to where the voice actually rises, and its end to where it falls, in the cut's own
    sound (speech band, 10 ms frames): faster-whisper's word starts ran 0.2-0.4 s early on this film, so subtitles
    came on before the voice. A start moves to the first 50 ms above a line (the noise floor in the 0.4 s before the
    word plus rise_db, and never more than 18 dB under the sentence's own peak, so a street noise in the pause does
    not count), searched from 0.2 s before the word to 1.2 s after (a segment's first word ran up to 0.9 s early); an end to the last frame above that line within
    0.5 s before and 0.4 s after the word's end. Where nothing clear is found, the transcript's time stands."""
    import subprocess
    import numpy as np
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', audio, '-ac', '1', '-ar', '16000', '-af',
                          'highpass=f=150,lowpass=f=4000', '-f', 'f32le', '-'], capture_output=True).stdout
    x = np.frombuffer(pcm, np.float32)
    env = 20 * np.log10(np.sqrt(np.convolve(x ** 2, np.ones(320) / 320, 'same')[::160]) + 1e-7)
    out = {}
    for k, (a, b) in spans.items():
        i = int(round(a * 100))
        floor = np.median(env[max(0, i - 40):max(1, i - 2)])
        peak = env[i:max(i + 1, int(round(b * 100)) + 20)].max()
        line = max(floor + rise_db, peak - 18)                        # a street noise in the pause is not the voice
        lo, hi = max(0, i - 20), min(len(env) - 5, i + 120)
        on = [j for j in range(lo, hi) if (env[j:j + 5] > line).all()]
        na = on[0] / 100 if on else a
        j0, j1 = int(round(b * 100)) - 50, min(len(env), int(round(b * 100)) + 40)
        above = [j for j in range(max(j0, int(na * 100)), j1) if env[j] > line]
        nb = (above[-1] + 1) / 100 if above else b
        out[k] = [na, max(nb, na + 0.2)]
    return out


def main():
    C = json.load(open(os.path.join(HERE, sys.argv[1])))
    script = json.load(open(os.path.join(HERE, C['script'])))
    lines = script_lines(script, C['upto'])
    words = [w for seg in json.load(open(os.path.join(HERE, C['transcript']))) for w in seg['words']]
    for m in C.get('clock_map', []):                                 # an older cut's clock onto this one
        for w in words:
            for k in ('s', 'e'):
                if w[k] >= m['from']:
                    w[k] = max(m['from'], w[k] + m['shift'])
    spans, matched, total = align(lines, words)
    if C.get('audio'):                                                # the transcriber starts words early: refine on the sound
        spans = refine(spans, os.path.join(HERE, C['audio']))
    cuts = sorted({round(s['start'] * FPS) for s in json.load(open(os.path.join(HERE, C['shots'])))['shots']})
    # units: one per sentence (or a whole short line), in screenplay order
    units = []
    for li, x in enumerate(lines):
        for si, s in enumerate(sentences(x['text'])):
            if (li, si) not in spans:
                sys.exit(f"{x['id']}: '{s}' was not found in the transcript")
            a, b = spans[(li, si)]
            units.append({'line': x['id'], 'speaker': x['speaker'], 'text': typeset(s),
                          'a': round(a * FPS), 'b': round(b * FPS)})
    # events: a speaker's consecutive sentences join while they follow on closely, and only so that the break falls
    # between sentences: joined on one line, or each sentence on its own row (a sentence too long for a row stands alone)
    events = []
    for u in units:
        e = events[-1] if events else None
        joined = e['text'] + ' ' + u['text'] if e else ''
        rows = None
        if e and e['speakers'] == [u['speaker']] and e['line'] == u['line'] and u['a'] - e['b'] < FPS:
            if len(joined) <= MAXC and len(e['rows']) == 1:
                rows = [joined]
            elif len(e['rows']) == 1 and len(e['text']) <= MAXC and len(u['text']) <= MAXC:
                rows = [e['text'], u['text']]
            elif len(e['rows']) == 1 and len(joined) <= 2 * MAXC:     # a short sentence leads into a long one:
                r = break_lines(joined)                               # the break inside the second, the first whole
                if r and len(r) == 2 and len(r[0]) >= len(e['text']):
                    rows = r
        too_short = bool(e) and u['a'] - e['a'] < MIN_F + GAP_F       # alone, the first would flash by
        if rows and (too_short or len(joined) / max((u['b'] - e['a'] + LAG_F) / FPS, 1e-3) <= CPS):
            e['text'], e['rows'], e['b'] = joined, rows, u['b']
        else:
            events.append({'line': u['line'], 'lines': [u['line']], 'speakers': [u['speaker']], 'text': u['text'],
                           'rows': [u['text']] if len(u['text']) <= MAXC else break_lines(u['text']),
                           'a': u['a'], 'b': u['b']})
    # two speakers in one subtitle: when a short line can't stand alone before the reply comes
    merged = []
    for e in events:
        p = merged[-1] if merged else None
        if (p and len(p['speakers']) == 1 and p['speakers'] != e['speakers'] and e['a'] - p['b'] < CHAIN_F
                and (e['a'] - p['a'] < MIN_F + GAP_F or len(p['text']) / max((e['a'] - GAP_F - p['a']) / FPS, 1e-3) > CPS)
                and len(p['text']) + 1 <= MAXC and len(e['text']) + 1 <= MAXC):
            p['dual'] = ['-' + p['text'], '-' + e['text']]
            p['text'] = p['text'] + ' ' + e['text']; p['b'] = e['b']
            p['speakers'] = p['speakers'] + e['speakers']; p['lines'] = p['lines'] + e['lines']
        else:
            merged.append(e)
    events = merged
    # times: in at speech, out after a lag, held for reading speed and the minimum, within the next one's start
    for i, e in enumerate(events):
        nxt = events[i + 1]['a'] if i + 1 < len(events) else 10 ** 9
        e['in'] = e['a']
        need = max(MIN_F, int(len(e['text']) / CPS * FPS + 0.999))
        out = max(e['b'] + LAG_F, e['in'] + need)
        out = min(out, e['in'] + MAX_F, nxt - GAP_F)
        e['out'] = max(out, e['b'] + 1)
    # shot changes
    def near(f, before, after):
        c = [k for k in cuts if f - before <= k <= f + after]
        return min(c, key=lambda k: abs(k - f)) if c else None
    for i, e in enumerate(events):
        c = near(e['in'], 7, 12)                                      # starts up to 12 before a cut, or 7 after: onto it
        prev_out = events[i - 1]['out'] if i else -10 ** 9
        if c is not None and c - prev_out >= GAP_F and (c <= e['in'] or c - e['in'] <= 12):
            if c != e['in'] and (e['out'] - c) >= MIN_F:
                e['in'] = c
        c = near(e['out'], 12, 12)                                    # ends near a cut: 2 frames before it, or,
        if c is not None:                                             # if that would rush it, 12 frames past it
            nxt = events[i + 1]['in'] if i + 1 < len(events) else 10 ** 9
            t = c - GAP_F
            if (t - e['in'] >= MIN_F and len(e['text']) / ((t - e['in']) / FPS) <= CPS and t >= e['b'] - 2
                    and t <= nxt - GAP_F):
                e['out'] = t
            else:
                t2 = max(e['out'], c + CHAIN_F)
                if t2 <= nxt - GAP_F and t2 - e['in'] <= MAX_F:
                    e['out'] = t2
                elif t - e['in'] >= MIN_F and len(e['text']) / ((t - e['in']) / FPS) <= CPS_MAX and t >= e['b'] - 2:
                    e['out'] = t
    for i in range(len(events) - 1):                                  # chain small gaps; keep 2 frames between
        a, b = events[i], events[i + 1]
        g = b['in'] - a['out']
        if g < CHAIN_F:
            a['out'] = b['in'] - GAP_F
    # text layout and checks
    report = []
    for e in events:
        rows = e.get('dual') or e['rows']
        e['rows'] = rows
        dur = (e['out'] - e['in']) / FPS
        chars = len(' '.join(rows))
        cps = chars / dur
        flags = []
        if not rows or any(len(r) > MAXC for r in rows) or len(rows) > MAXL:
            flags.append('layout')
        if dur < MIN_F / FPS - 1e-6:
            flags.append(f'short {dur:.2f}s')
        if dur > MAX_F / FPS + 1e-6:
            flags.append(f'long {dur:.2f}s')
        if cps > CPS + 0.05:
            flags.append(f'cps {cps:.1f}' + (' (over 20)' if cps > CPS_MAX else ''))
        crosses = [k for k in cuts if e['in'] + 2 < k < e['out'] - 2]
        report.append({'n': len(report) + 1, 'lines': e['lines'], 'in': round(e['in'] / FPS, 3),
                       'out': round(e['out'] / FPS, 3), 'rows': rows, 'cps': round(cps, 1),
                       'speech': [round(e['a'] / FPS, 2), round(e['b'] / FPS, 2)], 'cuts_inside': len(crosses),
                       'flags': flags})
    name = C['name']
    base = os.path.join(HERE, 'subs', name)
    os.makedirs(os.path.dirname(base), exist_ok=True)

    def tc(f, sep):
        s = f / FPS
        h, m = divmod(int(s), 3600)
        m, sec = divmod(m, 60)
        return f"{h:02d}:{m:02d}:{sec:02d}{sep}{int(round((s - int(s)) * 1000)):03d}"
    with open(base + '.en.srt', 'w') as f:
        for k, e in enumerate(events, 1):
            f.write(f"{k}\n{tc(e['in'], ',')} --> {tc(e['out'], ',')}\n" + '\n'.join(e['rows']) + '\n\n')
    with open(base + '.en.vtt', 'w') as f:
        f.write('WEBVTT\n\n')
        for k, e in enumerate(events, 1):
            f.write(f"{k}\n{tc(e['in'], '.')} --> {tc(e['out'], '.')} line:-1 align:center\n" + '\n'.join(e['rows']) + '\n\n')
    st = C['style']

    def ass_t(f):
        s = f / FPS
        return f"{int(s // 3600)}:{int(s % 3600 // 60):02d}:{s % 60:05.2f}"
    with open(base + '.en.ass', 'w') as f:
        f.write('[Script Info]\nScriptType: v4.00+\nPlayResX: %d\nPlayResY: %d\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n'
                % (st['play_res'][0], st['play_res'][1]))
        f.write('[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, '
                'Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, '
                'Alignment, MarginL, MarginR, MarginV, Encoding\n')
        f.write(f"Style: Default,{st['font']},{st['size']},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,"
                f"{st['outline']},{st['shadow']},2,{st['margin_lr']},{st['margin_lr']},{st['margin_v']},1\n\n")
        f.write('[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n')
        for e in events:
            f.write(f"Dialogue: 0,{ass_t(e['in'])},{ass_t(e['out'])},Default,,0,0,0,," + '\\N'.join(e['rows']) + '\n')
    json.dump({'name': name, 'rules': {'max_chars': MAXC, 'max_lines': MAXL, 'cps': CPS, 'cps_max': CPS_MAX,
                                       'min_frames': MIN_F, 'max_frames': MAX_F, 'gap_frames': GAP_F,
                                       'chain_frames': CHAIN_F, 'lag_frames': LAG_F},
               'aligned_words': f'{matched}/{total}', 'events': report},
              open(base + '.report.json', 'w'), indent=1)
    bad = [r for r in report if r['flags']]
    print(f"{len(events)} subtitles from {len(lines)} lines; screenplay words matched in the transcript: {matched}/{total}; "
          f"{len(bad)} with a flag")
    for r in bad:
        print('  ', r['n'], r['lines'], r['in'], r['out'], r['rows'], r['flags'])


if __name__ == '__main__':
    main()
