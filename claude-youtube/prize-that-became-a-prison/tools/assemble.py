#!/usr/bin/env python3
"""The animatic of The Prize That Became a Prison: timing, edit list, shot renders, the join and the checks.

    <gfx python> tools/assemble.py time      cut plan (+ measured narration, if any) -> design/edit/EDL.json, EDL.md, out/film/animatic_v1.srt
    <gfx python> tools/assemble.py render    every shot of the EDL -> out/film/shots/<id>.mp4 (cached by its parameters)
    <gfx python> tools/assemble.py join      the shots -> out/film/animatic_v1.mp4 (1920x1080, 24 fps, H.264, silent)
    <gfx python> tools/assemble.py sheets    contact sheets (a frame every 2 s; frame by frame around every cut) and checks
    <gfx python> tools/assemble.py all       all four in order
    options: --jobs N (parallel shots, default 2), --only 00-01,03-11 (render just these), --force

The cut plan is design/edit/cut.json, the only file edited by hand. It holds the narration as segments (each voice
paragraph of design/script/SCRIPT_V2.md, and every written silence or beat as a hold of so many seconds) and, per
chapter, the shots in order. A shot starts at an anchor on the voice clock, so re-timing the voice re-times the cut:

    "00.03"          the start of segment 00.03
    "00.03@0.45"     45 % of the way through the segment's speech (word-proportional)
    "00.03$"         the end of its speech;   any of them + or - seconds: "00.06$-0.2", "00.07-1.3"

A shot without an anchor shares the time between its neighbours (by its weight "w"). Each shot ends where the next
one starts; cut points are rounded to whole frames.

Voice timing: until the voice is recorded, a segment lasts words / the chapter's rate (words a minute), at least
0.6 s, plus a 0.35 s breath before the next line. If audio/vo/scratch/lines.json exists when `time` runs, its
measured line durations replace the estimates (the words are aligned to the segments, so the line split does not have
to match), and the EDL says so.

Sources (see design/edit/EDL.md for each shot's):
  plate   a Blender plate (frames/raw/<stage>/<camera>.png) pushed at constant speed in log space and graded with the
          film's grade (gfx/montage.py plate_shot's move, re-done here frame by frame so the grade, the type and the
          encode run in one pass: scenes/shoot.py GRADE, fresh grain, centre clamped so no edge is pulled in), with
          story type from gfx/type.html laid over it (gfx/type_render.js, look B), each layer at its own offset.
          The push is a dolly with parallax (near layers grow and slide more than the far plane) from the plate's
          depth map, out/depth/<stage>/<cam>.png, made by `<torch python> tools/depth_estimate.py <plates>`; off for
          top-down shots and for both sides of a "continue" match cut (cut.json "parallax", per shot "parallax").
  piece   a graphics piece trimmed from a rendered clip (out/gfx/r7, reel 7's exact commands), or re-rendered with the
          same tool and parameters at the length the shot needs.

Nothing here draws a label, a black frame, a fade or a dissolve: every join is a straight cut.

Animatic v3 (`--cut design/edit/cut_v3.json`; the cut names its own EDL, film, shot cache and narration in "paths", so
v2 keeps its files). It adds voice segments and shot kinds for the real media (archive/MEDIA_CATALOGUE.md, "In hand"):

  segments  "real": a real voice from a clip (IN-1, IN-13, IN-14, IN-15) from `in` to `out` seconds, on the voice clock
            at its own length; "t24": a line of Tim's 2024 testimony whose recording (V01) is not in hand, given its
            estimated length at his measured pace and shown as words, never voiced. Either may carry a `card` (below).
  clip      a stretch of a real video: `clip` (IN-n), `sync` (a real segment: the picture plays in sync with it) or
            `src` (seconds), a crop window `crop` [x, y, w] in source pixels (16:9, so bugs, lower thirds and seals are
            never in frame) and `crop1` for a slow push, `freeze` (an anchor: the picture holds from there, dead still)
            or `still` (one frame held), `grade` archive | testimony | none. Its sound is placed by the mixer from the
            real segment, never from the shot.
  photo     a still from archive/media/photos with a slow push (`zoom`, `c`), parallax when out/depth/photos/<name>.png
            exists, `grade` archive.
  ground    the dark ground of the text system (the case file's board), drifting slowly, for quote cards and type.
  screen    a real clip on a screen inside a plate, through gfx/doc_composite.py's corner pins (only plates with a
            frames/raw/<stage>/<cam>.corners.json screen).
  card      on any plate, clip, photo or ground shot: the kinetic testimony captions of the real or t24 segments it
            covers (gfx/quote.html, the type test's look 1), words timed from the clip's word-timed transcript or, for
            t24, spread over the estimate; a card's `hold` keeps his last words alone through the hold after it.
  quote     a clip shot with its card (`kind` sugar).
Every new kind renders through the same cache (by hash), the same BT.709 conversion (TO_YUV) and the same join.
"""
import argparse
import concurrent.futures as cf
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GFX = ROOT / "gfx"
CUT = ROOT / "design/edit/cut.json"
EDL_JSON = ROOT / "design/edit/EDL.json"
EDL_MD = ROOT / "design/edit/EDL.md"
FILM_DIR = ROOT / "out/film"
SHOTS = FILM_DIR / "shots"
PIECES = FILM_DIR / "pieces"
FILM = FILM_DIR / "animatic_v1.mp4"
SRT = FILM_DIR / "animatic_v1.srt"
SHEETS = FILM_DIR / "sheets"
LINES = ROOT / "audio/vo/scratch/lines.json"
CANVAS = Path("/home/user/cines-engine/.claude/skills/cines-engine/scripts/canvas_render.js")
DEFAULT_PY = "/tmp/claude-0/-home-user-cines-engine/73593c7c-6dfc-5879-82bf-97979958b8ab/scratchpad/gfxenv/bin/python"
PY = os.environ.get("PRIZE_GFX_PY") or (DEFAULT_PY if os.path.exists(DEFAULT_PY) else sys.executable)
W, H, FPS = 1920, 1080, 24
RENDER_VERSION = 5                 # bump to invalidate every cached shot (5: BT.709 conversions, 28 Nov 2026)
# the cached shots are intermediates: high quality, fast to write; the join makes the one delivery encode. Every frame
# reaches ENC as BT.709 YUV: render_shot names the conversion (gfx/doc_composite.py TO_YUV), as ffmpeg's own is BT.601
ENC = ["-c:v", "libx264", "-crf", "14", "-preset", "veryfast", "-pix_fmt", "yuv420p",
       "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"]


VERSION = "animatic_v1"
CUT_ARG = None
# the real media in hand (archive/MEDIA_CATALOGUE.md): the video and its word-timed transcript
CLIPS = {
    "IN-1": ("archive/media/cecc2026_tim_gene_passage.mp4", "archive/media_cecc2026_tim_gene_transcript.json"),
    "IN-13": ("archive/media/cecc2026_tim_cspan_long.mp4", "archive/media_cecc2026_tim_cspan_transcript.json"),
    "IN-14": ("archive/media/nbc2024_gene.mp4", "archive/media_nbc2024_gene_transcript.json"),
    "IN-15": ("archive/media/nbc2026_tim.mp4", "archive/media_nbc2026_tim_transcript.json"),
}
ASR_FIX = {"don": "Dawn", "don.": "Dawn."}      # the C-SPAN transcript's speech recogniser spells Dawn "Don"
PHOTOS = "archive/media/photos"


def configure(cut_path):
    """Point the tool at another cut plan; a cut with "paths" names its own EDL, film, subtitles, shot cache and narration."""
    global CUT, EDL_JSON, EDL_MD, FILM, SRT, SHOTS, LINES, SHEETS, VERSION, CUT_ARG
    CUT_ARG = str(cut_path)
    CUT = (ROOT / cut_path) if not os.path.isabs(cut_path) else Path(cut_path)
    c = json.load(open(CUT))
    p = c.get("paths")
    if p:
        EDL_JSON, EDL_MD = ROOT / p["edl_json"], ROOT / p["edl_md"]
        FILM, SRT = ROOT / p["film"], ROOT / p["srt"]
        SHOTS, SHEETS = ROOT / p["shots"], ROOT / p["sheets"]
        LINES = ROOT / p["lines"]
    VERSION = c.get("version", VERSION)


def node_env():
    nr = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
    return dict(os.environ, NODE_PATH=nr)


def run(cmd, **kw):
    r = subprocess.run([str(c) for c in cmd], cwd=kw.pop("cwd", ROOT), capture_output=True, text=True, **kw)
    if r.returncode:
        raise RuntimeError(f"failed: {' '.join(map(str, cmd))}\n{r.stdout[-2000:]}\n{r.stderr[-2000:]}")
    return r.stdout


def probe_frames(path):
    out = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
               "stream=nb_read_packets", "-of", "csv=p=0", path])
    return int(out.strip().split(",")[0])


def tc(sec, srt=False):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}" if srt else f"{m:d}:{s:02d}.{ms // 10:02d}"


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


# ------------------------------------------------------------------------------------------------ timing

def measured_lines():
    """[(text, seconds, segment id or None)] from the scratch narration, if it exists; durations from the file's
    fields or its audio. A line that names its chapter and its paragraph number (as the voice session's files do,
    00_01.wav = segment 00.01) is matched to that segment directly when the words agree."""
    if not LINES.exists():
        return None
    d = json.load(open(LINES))
    lines = d.get("lines", d) if isinstance(d, dict) else d
    out = []
    for L in lines:
        text, dur = L.get("text", ""), None
        sid = None
        if "chapter" in L and "index" in L:
            try:
                sid = f"{int(str(L['chapter'])[:2]):02d}.{int(L['index']):02d}"
            except ValueError:
                sid = None
        elif isinstance(L.get("id"), str) and re.fullmatch(r"\d\d[._]\d\d", L["id"]):
            sid = L["id"].replace("_", ".")
        for k in ("duration_s", "duration", "dur_s", "dur", "seconds", "length_s", "len_s"):
            if k in L:
                dur = float(L[k]); break
        if dur is None and "start_s" in L and "end_s" in L:
            dur = float(L["end_s"]) - float(L["start_s"])
        if dur is None:
            for k in ("file", "path", "wav", "audio", "mp3"):
                if k in L:
                    f = Path(L[k]); f = f if f.is_absolute() else (LINES.parent / f if (LINES.parent / f).exists() else ROOT / f)
                    if f.exists():
                        dur = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).strip())
                    break
        if text and dur:
            out.append((text, dur, sid))
    return out or None


def align_measured(segs, lines):
    """Give each voice segment the measured time of its words. Lines that name their segment, with the same words,
    are taken directly; otherwise every line's duration is spread over its words by their length, and the segments'
    words are found in that stream in order. Returns {seg id: seconds} for the segments found."""
    byid = {s["id"]: s for s in segs}
    direct = {sid: dur for text, dur, sid in lines
              if sid in byid and [norm(w) for w in text.split() if norm(w)] == [norm(w) for w in byid[sid]["text"].split() if norm(w)]}
    if len(direct) == len([1 for _, _, sid in lines if sid]) and direct:
        return direct
    stream = []
    for text, dur, _ in lines:
        ws = [norm(w) for w in text.split() if norm(w)]
        tot = sum(len(w) + 1 for w in ws) or 1
        stream += [(w, dur * (len(w) + 1) / tot) for w in ws]
    got, pos = {}, 0
    for s in segs:
        ws = [norm(w) for w in s["text"].split() if norm(w)]
        if not ws:
            continue
        for start in range(pos, min(len(stream), pos + 400)):    # the segment's first words, a little ahead
            if [w for w, _ in stream[start:start + min(3, len(ws))]] == ws[:3]:
                k, j, t = 0, start, 0.0
                while k < len(ws) and j < len(stream) and stream[j][0] == ws[k]:
                    t += stream[j][1]; j += 1; k += 1
                if k >= 0.8 * len(ws):
                    got[s["id"]] = t * len(ws) / k; pos = j
                break
    return got


ANCHOR = re.compile(r"(\d\d\.[A-Za-z0-9_]+)(?:@([0-9.]+)|(\$))?([+-][0-9.]+)?$")


def build_clock(cut):
    """Every segment with its start, speech length and end on the film's clock."""
    gap, minline = cut.get("gap", 0.35), cut.get("min_line", 0.6)
    allsegs = [s for ch in cut["chapters"] for s in ch["voice"]]
    lines = measured_lines()
    measured = align_measured([s for s in allsegs if "text" in s], lines) if lines else {}
    t, segs = 0.0, {}
    spoken = lambda x: x is None or "text" in x or "real" in x or "t24" in x
    for ch in cut["chapters"]:
        rate = ch["rate"]
        ch["_start"] = t
        for i, s in enumerate(ch["voice"]):
            s["start"] = t
            nxt = ch["voice"][i + 1] if i + 1 < len(ch["voice"]) else None
            if "text" in s:
                words = len([w for w in s["text"].split() if norm(w)])
                est = max(minline, words * 60.0 / rate)
                s["speech"] = measured.get(s["id"], est)
                s["timing"] = "measured" if s["id"] in measured else "estimated"
                s["end"] = t + s["speech"] + (gap if spoken(nxt) else 0.0)
                s["words"] = words
            elif "real" in s:                    # a real voice: its own length, from the clip
                s["speech"] = round(s["out"] - s["in"], 3)
                s["timing"] = "real"
                s["end"] = t + s["speech"] + s.get("after", gap if spoken(nxt) else 0.0)
            elif "t24" in s:                     # 2024 testimony not in hand (V01): its estimated length, shown as words
                s["speech"] = s["dur"]
                s["timing"] = "estimated (V01 not in hand)"
                s["end"] = t + s["speech"] + s.get("after", gap if spoken(nxt) else 0.0)
            else:
                s["speech"] = 0.0
                s["end"] = t + s["hold"]
            t = s["end"]
            s["_ch"] = ch["n"]
            segs[s["id"]] = s
        ch["_end"] = t
    return segs, measured, lines


def anchor_time(a, segs):
    m = ANCHOR.match(a)
    if not m or m.group(1) not in segs:
        raise ValueError(f"bad anchor {a!r}")
    s = segs[m.group(1)]
    t = s["start"]
    if m.group(2):
        t += float(m.group(2)) * (s["speech"] if s["speech"] else s["end"] - s["start"])
    elif m.group(3):
        t += s["speech"] if s["speech"] else s["end"] - s["start"]
    if m.group(4):
        t += float(m.group(4))
    return t


def push_auto(move, dur, z=1.0, pct=None):
    p = pct if pct is not None else min(0.08, max(0.02, 0.011 * dur))
    if move == "lock":
        p = pct if pct is not None else 0.02
    if move == "out":
        return z * (1 + p), z
    return z, z * (1 + p)


def time_cmd(args):
    cut = json.load(open(CUT))
    segs, measured, lines = build_clock(cut)
    pieces = cut["pieces"]
    shots, warnings = [], []
    for ch in cut["chapters"]:
        sh = ch["shots"]
        starts = [anchor_time(s["at"], segs) if "at" in s else None for s in sh]
        if starts[0] is None:
            starts[0] = ch["_start"]
        bounds = starts + [ch["_end"]]
        i = 0
        while i < len(sh):                       # share the time between anchored neighbours, by weight
            if bounds[i] is None:
                j = i
                while bounds[j] is None:
                    j += 1
                a, b = bounds[i - 1], bounds[j]
                ws = [sh[k].get("w", 1.0) for k in range(i - 1, j)]
                acc = a
                for k in range(i, j):
                    acc += (b - a) * ws[k - i] / sum(ws)
                    bounds[k] = acc
                i = j
            i += 1
        for k, s in enumerate(sh):
            s["_t0"], s["_t1"] = bounds[k], bounds[k + 1]
            s["_chapter"] = ch["n"]
            shots.append(s)
    # whole frames
    for k, s in enumerate(shots):
        s["_f0"] = int(round(s["_t0"] * FPS))
    total_f = int(round(cut["chapters"][-1]["_end"] * FPS))
    for k, s in enumerate(shots):
        f1 = shots[k + 1]["_f0"] if k + 1 < len(shots) else total_f
        s["_n"] = f1 - s["_f0"]
        if s["_n"] < 10:
            warnings.append(f"{s['id']}: only {s['_n']} frames")
        if s["_n"] <= 0:
            raise SystemExit(f"shot {s['id']} has no frames: check its anchor {s.get('at')}")
    byid = {s["id"]: s for s in shots}
    # Parallax (see plate_frames): on for every plate shot by default (cut.json "parallax", per shot "parallax": false
    # or {"k": .., "slide": [x, y]}), off for both sides of a "continue" match cut, whose alignment must stay exact.
    par_default = cut.get("parallax", {"k": 1.0})
    matched = {s["continue"] for s in shots if "continue" in s} | {s["id"] for s in shots if "continue" in s}

    edl_shots = []
    for s in shots:
        n, dur, t0 = s["_n"], s["_n"] / FPS, s["_f0"] / FPS
        e = {"id": s["id"], "chapter": s["_chapter"], "start": round(t0, 4), "start_tc": tc(t0), "duration": round(dur, 4),
             "frames": n, "start_frame": s["_f0"]}
        if "plate" in s:
            stage, cam = s["plate"].split("/")
            z = s.get("z", 1.0)
            if "continue" in s:                  # a match cut: the same push carried across the cut
                p = byid[s["continue"]]["_src"]
                step = math.log(p["zoom"][1] / p["zoom"][0]) / max(1, p["frames"] - 1)
                z0 = p["zoom"][1] * math.exp(step); z1 = z0 * math.exp(step * (n - 1)); c = p["centre"]
            elif "zoom" in s:
                z0, z1 = s["zoom"]; c = s.get("c", [0.5, 0.5])
            else:
                z0, z1 = push_auto(s.get("move", "in"), dur, z, s.get("pct")); c = s.get("c", [0.5, 0.5])
            src = {"kind": "plate", "plate": f"frames/raw/{stage}/{cam}.png", "stage": stage, "camera": cam,
                   "zoom": [round(z0, 5), round(z1, 5)], "centre": c, "frames": n,
                   "push": f"{'in' if z1 >= z0 else 'out'} {abs(z1 / z0 - 1) * 100:.1f} % (log space, constant speed)",
                   "grade": "scenes/shoot.py GRADE (A fixed), grain fresh each frame"}
            par = s.get("parallax", par_default)
            if par and s["id"] not in matched and not (ROOT / f"out/depth/{stage}/{cam}.png").exists():
                warnings.append(f"{s['id']}: no depth map for {stage}/{cam} (a plate published after the depth pass): a flat push")
                par = None
            if par and s["id"] not in matched:
                par = {**par_default, **par} if isinstance(par, dict) else dict(par_default)
                src["parallax"] = {"k": par.get("k", 1.0), "slide": par.get("slide", [0, 0]), "depth": f"out/depth/{stage}/{cam}.png"}
            src["type"] = type_layers(s, segs, t0, dur, warnings)
            cards = card_layers(s, segs, t0, dur, warnings)
            if cards:
                src["cards"] = cards
        elif any(k in s for k in ("clip", "photo", "ground", "screen")):
            src = media_source(s, segs, t0, dur, n, byid, warnings)
            if src["kind"] != "screen":
                src["type"] = type_layers(s, segs, t0, dur, warnings)
                cards = card_layers(s, segs, t0, dur, warnings)
                if cards:
                    src["cards"] = cards
        else:
            pc = dict(pieces[s["piece"]])
            src = {"kind": "piece", "name": s["piece"], "in": s.get("in", 0.0), "frames": n,
                   "file": pc.get("file"), "gen": dict(pc["gen"]), "fixed": pc.get("fixed", False)}
            if pc.get("len"):                    # a fixed render length: the piece is made once and survives a re-time
                src["len"] = pc["len"]
            over = {}
            for k, v in s.get("gen", {}).items():
                if k == "cut_at":
                    over["cut"] = round(anchor_time(v, segs) - t0 + src["in"], 3)
                elif k == "marks":
                    over["marks"] = [{"phrase": m["phrase"], "dur": m.get("dur", 0.5),
                                      "t": round(max(0.2, anchor_time(m["at"], segs) - t0 + src["in"]) if "at" in m else m["t"], 3)}
                                     for m in v]
                else:
                    over[k] = v
            if over:
                src["gen"].update(over); src["override"] = True
            if src.get("len") and src["in"] + dur > src["len"] + 1e-6:
                warnings.append(f"{s['id']}: needs {src['in'] + dur:.2f} s of {src['name']}, made {src['len']} s long")
            if "max" in s and dur > s["max"] + 1e-6:
                warnings.append(f"{s['id']}: {dur:.2f} s is longer than the {s['max']} s the piece allows from in={src['in']}")
            src["note_piece"] = pc.get("about", "")
        s["_src"] = src
        e["source"] = src
        # the voice it covers
        cov = []
        for v in segs.values():
            said = v.get("text") or v.get("say")
            if said and min(v["start"] + v["speech"], t0 + dur) - max(v["start"], t0) > 0.12:
                cov.append({"id": v["id"], "text": said, **({"who": v["who"]} if "who" in v else {})})
        e["voice"] = cov
        for k in ("row", "sound", "note", "sub", "change", "angle", "anim", "sfx", "deviation", "room"):
            if k in s:
                e[k] = s[k]
        if VERSION != "animatic_v1":
            e["cat"] = s.get("cat") or category(src)
        edl_shots.append(e)

    # a re-rendered piece is made once at the longest length any of its shots needs, and shared
    longest = {}
    for e in edl_shots:
        src = e["source"]
        if src["kind"] == "piece" and not src.get("fixed"):
            k = (src["name"], json.dumps(src["gen"], sort_keys=True))
            longest[k] = max(longest.get(k, 0), int(round(src["in"] * FPS)) + src["frames"])
    for e in edl_shots:
        src = e["source"]
        if src["kind"] == "piece":
            k = (src["name"], json.dumps(src["gen"], sort_keys=True))
            if k in longest:
                src["render_secs"] = round(longest[k] / FPS + 0.25, 3)
            plan, cmd = plan_command(src)
            src["clip"] = str(plan["path"].relative_to(ROOT))
            src["command"] = cmd
            src["clip_from"] = "reel 7 (up to date)" if plan["reuse"] else "re-rendered"
    chapters = [{"n": ch["n"], "title": ch["title"], "start": round(ch["_start"], 3), "start_tc": tc(ch["_start"]),
                 "duration": round(ch["_end"] - ch["_start"], 3), "rate_wpm": ch["rate"],
                 "words": sum(v.get("words", 0) for v in ch["voice"]),
                 "speech_s": round(sum(v.get("speech", 0) for v in ch["voice"]), 2),
                 "spoken_wpm": round(60 * sum(v.get("words", 0) for v in ch["voice"]) / max(0.1, sum(v.get("speech", 0) for v in ch["voice"]))),
                 "shots": sum(1 for s in edl_shots if s["chapter"] == ch["n"])} for ch in cut["chapters"]]
    def vrow(v):
        if "text" in v:
            return {"text": v["text"], "timing": v["timing"]}
        if "real" in v:
            return {"real": v["real"], "file": CLIPS[v["real"]][0], "in": v["in"], "out": v["out"], "say": v.get("say", ""),
                    "who": v.get("who", ""), "timing": "real"}
        if "t24" in v:
            return {"t24": True, "say": v.get("say", ""), "who": v.get("who", ""), "timing": v["timing"]}
        return {"hold": v["hold"], "note": v.get("note", ""), **({"silence": v["silence"]} if "silence" in v else {})}
    voice = [{"id": v["id"], "chapter": v.get("_ch", ""), "start": round(v["start"], 3), "speech": round(v["speech"], 3),
              "end": round(v["end"], 3), **vrow(v)} for v in segs.values()]
    nvo = sum(1 for v in segs.values() if "text" in v)
    timing = ("measured from the scratch narration, %s (%d of %d voice segments matched%s)" %
              (LINES.relative_to(ROOT), len(measured), nvo, "" if len(measured) == nvo else "; the rest estimated")) if lines else \
        "estimated from word counts at each chapter's rate (no scratch narration yet)"
    edl = {"film": "The Prize That Became a Prison", "version": VERSION, "fps": FPS, "size": [W, H],
           "total_frames": total_f, "duration": round(total_f / FPS, 3), "duration_tc": tc(total_f / FPS),
           "timing": timing, "gap_s": cut.get("gap", 0.35), "chapters": chapters, "shots": edl_shots, "voice": voice,
           "warnings": warnings}
    if VERSION != "animatic_v1":
        edl["sound"] = cut.get("sound", {})
    EDL_JSON.write_text(json.dumps(edl, indent=1, ensure_ascii=False) + "\n")
    if VERSION == "animatic_v1":
        write_md(edl, cut)
    else:
        write_md_v3(edl, cut)
    write_srt(segs)
    print(f"EDL: {len(edl_shots)} shots, {tc(total_f / FPS)} ({total_f} frames); timing {timing}")
    for c in chapters:
        print(f"  {c['n']} {c['title']:<28} {c['start_tc']:>8}  {c['duration']:6.1f} s  {c['shots']:3d} shots  {c['words']} words, spoken at {c['spoken_wpm']} wpm (plan {c['rate_wpm']})")
    for w in warnings:
        print("  WARNING", w)


# ------------------------------------------------------------------------------------------------ v3: layers and media

def type_layers(s, segs, t0, dur, warnings):
    """The story type over a shot (gfx/type.html moments, or gfx/quote.html with a plan), each at its own offset."""
    types = []
    for ty in s.get("type", []):
        d = {"mode": ty["mode"], "look": "B"}
        if "hash" in ty:
            d["hash"] = ty["hash"]
        off = anchor_time(ty["at"], segs) - t0 if "at" in ty else ty.get("t0", 0.0)
        off = max(0.0, round(off, 3))
        tin = ty.get("tin", 0.0)
        if "sync" in ty:                 # the moment's own time sy["t"] lands on an anchor
            tin = max(ty["sync"].get("min_tin", 0.0), ty["sync"]["t"] - (anchor_time(ty["sync"]["at"], segs) - t0))
        d["t0"], d["tin"] = off, round(tin, 3)
        if ty["mode"] == "chapter":       # the title's letters leave before the cut, so the shot carries on clean
            out = min(ty.get("out_max", 5.0), max(2.4, dur - off - 0.9))
            d["hash"] = (d.get("hash", "") + f"&out={out:.2f}").lstrip("&")
        if "page" in ty:                  # gfx/quote.html: a plan whose times may be anchors on the voice clock
            plan = json.loads(json.dumps(ty["plan"]))
            for L in plan.get("typed", []):
                if "at" in L:
                    L["t"] = round(anchor_time(L.pop("at"), segs) - t0 - off + tin, 3)
            d["page"], d["plan"] = ty["page"], plan
        if off >= dur - 0.25:
            warnings.append(f"{s['id']}: type {ty['mode']} starts at {off:.2f} s, after the shot ends")
        types.append(d)
    return types


MONTHS = {"january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"}


def time_flags(tokens):
    """Which words are time (the one accent): years, months and their days, numbers of years, days or months."""
    acc = [False] * len(tokens)
    for i, w in enumerate(tokens):
        nxt = tokens[i + 1] if i + 1 < len(tokens) else ""
        prv = tokens[i - 1] if i else ""
        if re.fullmatch(r"(19|20)\d\d", w) or w in MONTHS and w != "may" or (w == "may" and re.fullmatch(r"\d+", nxt)):
            acc[i] = True
        elif re.fullmatch(r"\d+", w) and (nxt in ("years", "days", "months", "year") or prv in MONTHS):
            acc[i] = True
        elif w in ("years", "days", "months") and re.fullmatch(r"\d+", prv):
            acc[i] = True
    return acc


def spread_words(text, dur):
    """Times for words that are not heard: a slot each, by length, with the pauses punctuation asks for."""
    ws = text.split()
    wt = [len(norm(w)) + 2 + (5 if w.rstrip("'\"”’").endswith((".", "?", "!", ":")) else 2 if w.rstrip("'\"”’").endswith((",", ";")) else 0)
          for w in ws]
    out, t, tot = [], 0.06, sum(wt)
    for w, k in zip(ws, wt):
        out.append([w, round(t, 3)])
        t += (dur - 0.2) * k / tot
    return out


_TRANS = {}


def clip_words(clip, a, b):
    """The words heard in a clip from a to b seconds, from its word-timed transcript, timed from a."""
    if clip not in _TRANS:
        _TRANS[clip] = [w for sg in json.load(open(ROOT / CLIPS[clip][1]))["segments"] for w in sg["words"]]
    out = []
    for w in _TRANS[clip]:
        if w["s"] >= a - 0.08 and w["e"] <= b + 0.12:
            word = w["w"]
            fix = ASR_FIX.get(word.lower())
            out.append([fix or word, round(max(0.0, w["s"] - a), 3)])
    return out


_ENV = {}


def clip_env(clip, a, b):
    """Tim's or Gene's voice level, RMS dBFS every 1/48 s, for the card's thin bars."""
    k = (clip, a, b)
    if k not in _ENV:
        import numpy as np
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", str(ROOT / CLIPS[clip][0]), "-vn",
                              "-ac", "1", "-ar", "48000", "-f", "s16le", "-"], capture_output=True).stdout
        x = np.frombuffer(raw, np.int16).astype(np.float64) / 32768
        n = len(x) // 1000
        r = np.sqrt((x[:n * 1000].reshape(n, 1000) ** 2).mean(1)) if n else np.zeros(1)
        _ENV[k] = [round(float(v), 1) for v in 20 * np.log10(r + 1e-9)]
    return _ENV[k]


def card_layout(words, keys, rec_at=None, run_chars=24, key_chars=11, rec_chars=38, max_lines=5):
    """A sentence per stack, broken into lines: key phrases heavy on their own lines, running words light, a written
    record (from word rec_at on) typed in the mono. A stack longer than max_lines is split at its lines."""
    toks = [norm(w) for w, _ in words]
    key = [False] * len(words)
    for ph in keys:
        p = [norm(x) for x in ph.split() if norm(x)]
        for i in range(len(toks) - len(p) + 1):
            if toks[i:i + len(p)] == p:
                for j in range(i, i + len(p)):
                    key[j] = True
    acc = time_flags(toks)
    rec = [rec_at is not None and i >= rec_at for i in range(len(words))]
    sents, cur = [], []
    for i, (w, t) in enumerate(words):
        cur.append(i)
        end = w.rstrip("'\"”’)").endswith((".", "?", "!")) or (rec_at is not None and i == rec_at - 1)
        if end:
            sents.append(cur); cur = []
    if cur:
        sents.append(cur)
    lines, seg = [], 0
    for sent in sents:
        sl, line, kind = [], [], None
        for i in sent:
            k = "rec" if rec[i] else ("key" if key[i] else "run")
            lim = rec_chars if k == "rec" else key_chars if k == "key" else run_chars
            n = sum(len(words[j][0]) + 1 for j in line)
            if line and (k != kind or n + len(words[i][0]) > lim):
                sl.append((kind, line)); line = []
            line.append(i); kind = k
        if line:
            sl.append((kind, line))
        cap = 8 if any(k == "rec" for k, _ in sl) else max_lines
        for c in range(0, len(sl), cap):
            for kind, ln in sl[c:c + cap]:
                lines.append({"seg": seg, "key": int(kind == "key"), "rec": int(kind == "rec"),
                              "words": [[words[j][0], words[j][1]] + ([{"acc": 1}] if acc[j] else []) for j in ln]})
            seg += 1
    seg_end = []
    for k in range(seg - 1):
        first = next(L for L in lines if L["seg"] == k + 1)["words"][0][1]
        seg_end.append(round(first - 2 / FPS - 0.3, 3))
    return lines, seg_end + [1e9]


def card_plan(v, opts):
    c = {**v.get("card", {}), **opts}
    if "real" in v:
        words = clip_words(v["real"], v["in"], v["out"])
    else:
        words = spread_words(v["say"], v["speech"])
    rec_at = None
    if c.get("rec_from"):
        toks = [norm(w) for w, _ in words]
        p = [norm(x) for x in c["rec_from"].split() if norm(x)]
        rec_at = next(i for i in range(len(toks)) if toks[i:i + len(p)] == p)
    lines, seg_end = card_layout(words, c.get("keys", []), rec_at, max_lines=c.get("max_lines", 5))
    plan = {"lines": lines, "segEnd": seg_end, "x": c.get("x", 140), "ya": c.get("ya", 700), "maxw": c.get("maxw", 980),
            "column": c.get("column", True), "scale": c.get("scale", 1.0)}
    if "real" in v and c.get("wave", True):
        plan["env"] = clip_env(v["real"], v["in"], v["out"])
    if c.get("hold"):
        plan["held"] = {"t": round(v["speech"] + 0.04, 3), "text": c["hold"]}
    return plan


def card_layers(s, segs, t0, dur, warnings):
    """The testimony cards a shot carries: every real or t24 segment with a card that it covers (its display runs from
    the segment's start to its end, and through the hold after it when the card holds his last words)."""
    want = s.get("card")
    if not want:
        return []
    opts = want if isinstance(want, dict) else {}
    only = opts.pop("seg", None) if isinstance(want, dict) else (want if isinstance(want, str) else None)
    order = list(segs.values())
    out = []
    for k, v in enumerate(order):
        if "card" not in v or not ("real" in v or "t24" in v) or (only and v["id"] != only):
            continue
        a0, a1 = v["start"], v["end"]
        if v["card"].get("hold") and k + 1 < len(order) and "hold" in order[k + 1]:
            a1 = order[k + 1]["end"]
        lo, hi = max(a0, t0), min(a1, t0 + dur)
        if hi - lo < 0.05:
            continue
        out.append({"seg": v["id"], "plan": card_plan(v, opts), "a": round(lo - a0, 3), "t0": round(lo - t0, 3), "secs": round(hi - lo, 3)})
    if not out:
        warnings.append(f"{s['id']}: asks for a card but covers no segment that has one")
    return out


def media_source(s, segs, t0, dur, n, byid, warnings):
    """The source of a clip, photo, ground or screen shot (see the docstring)."""
    if "clip" in s:
        file = CLIPS[s["clip"]][0]
        if "sync" in s:
            sg = segs[s["sync"]]
            src_in = sg["in"] + (t0 - sg["start"]) + s.get("slip", 0.0)
        else:
            src_in = float(s["src"])
        src = {"kind": "clip", "clip": s["clip"], "file": file, "src_in": round(max(0.0, src_in), 3), "frames": n,
               "crop": s["crop"], "crop1": s.get("crop1", s["crop"]), "grade": s.get("grade", "archive")}
        if src_in < -0.01:                         # the shot starts before the clip's first frame: hold it
            src["hold_first"] = int(round(-src_in * FPS))
        if "freeze" in s:
            src["freeze_frame"] = max(0, min(n - 1, int(round((anchor_time(s["freeze"], segs) - t0) * FPS))))
        if s.get("still"):
            src["freeze_frame"] = 0
        return src
    if "photo" in s:
        z0, z1 = s["zoom"] if "zoom" in s else push_auto(s.get("move", "in"), dur, s.get("z", 1.0), s.get("pct"))
        src = {"kind": "photo", "photo": f"{PHOTOS}/{s['photo']}", "zoom": [round(z0, 5), round(z1, 5)], "centre": s.get("c", [0.5, 0.5]),
               "frames": n, "grade": s.get("grade", "archive")}
        dp = ROOT / "out/depth/photos" / (Path(s["photo"]).stem + ".png")
        if s.get("parallax", True) and dp.exists():
            src["parallax"] = {"k": 1.0, "slide": s.get("slide", [0, 0]), "depth": str(dp.relative_to(ROOT))}
        return src
    if "ground" in s:
        return {"kind": "ground", "seed": s.get("seed", 1), "frames": n, "drift": s.get("drift", [24, -10]), "zoom": s.get("zoom", [1.0, 1.03])}
    # a real clip on a screen in a plate, by its corner pins
    stage, cam = s["screen"].split("/")
    sc = s["tex"]
    sg = segs[sc["sync"]] if "sync" in sc else None
    src_in = sg["in"] + (t0 - sg["start"]) if sg else float(sc.get("src", 0.0))
    if "file" in sc:                         # a texture of our own: a graphics clip (the email) or a page (S1)
        file, clip, matrix = sc["file"], None, sc.get("matrix", "auto")
    else:                                    # a real clip: the HD sources are BT.709 without a tag
        file, clip, matrix = CLIPS[sc["clip"]][0], sc["clip"], "bt709"
    return {"kind": "screen", "plate": f"frames/raw/{stage}/{cam}.png", "corners": f"frames/raw/{stage}/{cam}.corners.json",
            "clip": clip, "file": file, "matrix": matrix, "src_in": round(max(0.0, src_in), 3), "crop": sc["crop"],
            "still": bool(sc.get("still")) or file.endswith((".png", ".jpg")), "zoom": s.get("zoom", [1.2, 1.5]),
            "focus_uv": s.get("focus_uv", [0.5, 0.5]), "tex_gain": s.get("tex_gain", 1.0), "frames": n}


PIECE_CAT = {"scale": "doc", "email": "doc", "search": "doc", "father": "doc", "doc_yes": "doc", "doc_fee": "doc", "doc_emails": "doc",
             "doc_gene": "doc", "yes": "text", "yes_when": "text", "title": "text", "calendar": "text", "counter": "text",
             "route_leg1": "text", "route_mainland": "text", "route_split": "text", "gene": "3d", "flash": "3d", "trace": "3d",
             "cutaway": "3d", "split": "3d", "split_r7": "3d", "montage": "3d"}


def category(src):
    """fern's measured categories: 3d (our statue plates), text (kinetic type and motion graphics on their own ground),
    doc (documents and screens), real (real footage and photographs)."""
    k = src["kind"]
    if k == "plate":
        return "3d"
    if k in ("clip", "photo"):
        return "real"
    if k == "ground":
        return "text"
    if k == "screen":
        return "doc"
    return PIECE_CAT.get(src["name"], "doc" if src["gen"]["tool"] == "doc" else "text")


def piece_cmd(gen, out, secs):
    """The exact command that renders a graphics piece of `secs` seconds."""
    t = gen["tool"]
    if t == "plate_type":
        c = [PY, "gfx/plate_type.py", gen["mode"], f"{secs:.3f}", gen["plate"], out]
        if "push" in gen:
            c += ["--push", *map(str, gen["push"])]
        if "hash" in gen:
            c += ["--hash", gen["hash"]]
        return c
    if t == "seam":
        c = ["node", "gfx/type_render.js", "seq", gen["mode"], f"{secs:.3f}", out, "--page", "gfx/seam.html"]
        return c + (["--bg", gen["bg"]] if "bg" in gen else [])
    if t == "canvas":
        return ["node", str(CANVAS), gen["page"], "seq", gen["mode"], "0", f"{secs:.3f}", out]
    if t == "doc":
        return [PY, "gfx/doc_composite.py", "--shot", gen["_json"], "--out", out]
    if t == "split":
        return [PY, "gfx/split.py", "--out", out, "--len", f"{secs:.3f}", "--cut", f"{gen['cut']:.3f}"]
    if t == "montage":
        return [PY, "gfx/montage.py", "--out", out]
    raise ValueError(t)




# ------------------------------------------------------------------------------------------------ EDL.md and SRT

def write_md(edl, cut):
    L = [f"# The Prize That Became a Prison: edit decision list (animatic v1)", "",
         f"Generated by `tools/assemble.py time` from `design/edit/cut.json`; do not edit by hand (edit the cut plan and "
         f"run `time` again). The machine-readable list is `design/edit/EDL.json`.", "",
         f"**Length {edl['duration_tc']}** ({edl['total_frames']} frames at {edl['fps']} fps, {len(edl['shots'])} shots). "
         f"Timing: {edl['timing']}. Every join is a straight cut; no black frames, no fades, no dissolves.", "",
         "| Chapter | Starts | Length | Shots | Cuts a minute | Median shot | Words | Spoken at | Estimate rate |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"]
    for c in edl["chapters"]:
        ds = sorted(s["duration"] for s in edl["shots"] if s["chapter"] == c["n"])
        med = ds[len(ds) // 2] if ds else 0
        L.append(f"| {c['n']} {c['title']} | {c['start_tc']} | {c['duration']:.1f} s | {c['shots']} | "
                 f"{60 * c['shots'] / c['duration']:.1f} | {med:.1f} s | {c['words']} | {c['spoken_wpm']} wpm | {c['rate_wpm']} wpm |")
    # presentation shares
    share = {"Void Stage": 0.0, "Evidence Table and graphics": 0.0, "Fluorescent Noir (locations)": 0.0}
    for s in edl["shots"]:
        src = s["source"]
        if src["kind"] == "plate":
            k = "Void Stage" if src["stage"] == "void_stage" else ("Evidence Table and graphics" if src["stage"] == "evidence_table" else "Fluorescent Noir (locations)")
        else:
            pl = src["gen"].get("plate", "")
            k = "Void Stage" if "void_stage" in pl else ("Fluorescent Noir (locations)" if any(x in pl for x in ("checkin_hall", "home/", "inspection_room")) or src["name"] in ("montage", "scale") else "Evidence Table and graphics")
        share[k] += s["duration"]
    tot = sum(share.values())
    L += ["", "Scene presentation by running time (DECISIONS: Fluorescent Noir 50 %, Evidence Table 30 %, Void Stage 20 %): " +
          ", ".join(f"{k} {100 * v / tot:.0f} %" for k, v in share.items()) + ".", ""]
    if edl["warnings"]:
        L += ["Timing warnings: " + "; ".join(edl["warnings"]), ""]
    subs, changes = [], []
    for ch in edl["chapters"]:
        L += [f"## {ch['n']} · {ch['title']} ({ch['start_tc']}, {ch['duration']:.1f} s)", "",
              "| Shot | Starts | Length | Picture (source) | Story type | Voice it covers | Sound (script) |", "| --- | --- | --- | --- | --- | --- | --- |"]
        for s in [x for x in edl["shots"] if x["chapter"] == ch["n"]]:
            src = s["source"]
            if src["kind"] == "plate":
                pic = f"`{src['stage']}` `{src['camera']}`, push {src['push'].split(' (')[0]}" + (f", framed {src['zoom'][0]:.2f}x" if min(src["zoom"]) > 1.12 else "")
                ty = "; ".join(f"`{t['mode']}`" + (f" ({t['hash']})" if t.get("hash") else "") + (f" at +{t['t0']:.2f} s" if t["t0"] else "") for t in src["type"])
            else:
                pic = f"graphics `{src['name']}` from {src['in']:.2f} s" + (f" ({src['note_piece']})" if src.get("note_piece") else "")
                ty = "in the piece"
            vo = " / ".join(f"{v['id']} “{v['text'][:70]}{'…' if len(v['text']) > 70 else ''}”" for v in s["voice"]) or "(no voice)"
            L.append(f"| {s['id']} | {s['start_tc']} | {s['duration']:.2f} s | {pic} | {ty or ''} | {vo} | {s.get('sound', '')} |")
            if s.get("sub"):
                subs.append(f"- **{s['id']}** ({s['start_tc']}): {s['sub']}")
            if s.get("change"):
                changes.append(f"- **{s['id']}** ({s['start_tc']}): {s['change']}")
        L.append("")
    L += ["## Substitutions (a camera the script names that has no plate yet, or a stand-in)", ""] + subs + [""]
    L += ["## Rows changed, added or cut, and why", ""] + changes + [f"- {c}" for c in cut.get("changes", [])] + [""]
    if cut.get("problems"):
        L += ["## Known picture problems (from the contact sheets of this cut)", ""] + [f"{i}. {t}" for i, t in enumerate(cut["problems"], 1)] + [""]
    L += ["## Graphics commands", "", "Each graphics shot's clip and the exact command that made it (run from the project folder; "
          "NODE_PATH=$(npm root -g) for node). Reel 7's clips in `out/gfx/r7/` are reused when unchanged and long enough "
          "(the command shown is then reel 7's own, at its own length); otherwise `tools/assemble.py render` re-renders the "
          "piece with the same tool at the length the shot needs, into `out/film/pieces/`.", ""]
    for s in edl["shots"]:
        if s["source"]["kind"] == "piece":
            src = s["source"]
            extra = ""
            if src.get("override"):
                ov = {k: v for k, v in src["gen"].items() if k in ("marks", "cut", "length", "duration", "focus")}
                extra = f" Shot-specific: `{json.dumps(ov, ensure_ascii=False)}`."
            L.append(f"- {s['id']}: `{src['clip']}` from {src['in']:.3f} s, {src['frames']} frames. Made by `{src['command']}`." + extra)
    EDL_MD.write_text("\n".join(L) + "\n")


CAT_NAME = {"3d": "3D (statue plates)", "text": "Kinetic text and graphics", "doc": "Documents and screens", "real": "Real footage and photos"}
CAT_TARGET = {"3d": "40-45 %", "text": "25-30 %", "doc": "about 15 %", "real": "about 15 %"}


def mix_measure(edl):
    """fern's numbers for this cut: share of runtime per category, cuts a minute in the first 3 minutes, the average
    shot after minute 3, and the share carried by testimony cards."""
    tot = edl["duration"]
    share = {k: 0.0 for k in CAT_NAME}
    for s in edl["shots"]:
        share[s.get("cat", "3d")] += s["duration"]
    first = [s for s in edl["shots"] if s["start"] < 180.0]
    cuts3 = sum(1 for s in edl["shots"] if 0 < s["start"] < 180.0)
    after = [s["duration"] for s in edl["shots"] if s["start"] >= 180.0]
    carded = sum(s["duration"] for s in edl["shots"] if s["source"].get("cards"))
    real_voice = sum(v["speech"] for v in edl["voice"] if v.get("timing") == "real")
    t24 = sum(v["speech"] for v in edl["voice"] if v.get("t24"))
    narr = sum(v["speech"] for v in edl["voice"] if "text" in v)
    return {"share": {k: round(100 * v / tot, 1) for k, v in share.items()}, "seconds": {k: round(v, 1) for k, v in share.items()},
            "cuts_per_min_first3": round(cuts3 / 3.0, 1), "shots_first3": len(first),
            "avg_shot_after3": round(sum(after) / max(1, len(after)), 2), "median_shot_after3": round(sorted(after)[len(after) // 2], 2) if after else 0,
            "card_s": round(carded, 1), "card_pct": round(100 * carded / tot, 1), "real_voice_s": round(real_voice, 1),
            "t24_s": round(t24, 1), "narration_s": round(narr, 1)}


def write_md_v3(edl, cut):
    m = mix_measure(edl)
    edl["measure"] = m
    EDL_JSON.write_text(json.dumps(edl, indent=1, ensure_ascii=False) + "\n")
    L = ["# The Prize That Became a Prison: edit decision list (animatic v3)", "",
         "Generated by `tools/assemble.py time --cut design/edit/cut_v3.json` from `design/edit/cut_v3.json` (SCRIPT_V3, "
         "fern's method in design/REFERENCE_DECISION.md); do not edit by hand: edit the cut plan and run `time` again. The "
         "machine-readable list is `design/edit/EDL_v3.json`.", "",
         f"**Length {edl['duration_tc']}** ({edl['total_frames']} frames at {edl['fps']} fps, 1920x1080, {len(edl['shots'])} shots). "
         f"Timing: {edl['timing']}. Real voices at their own lengths; Tim's 2024 lines (V01 not in hand) at his measured pace, "
         "shown as words and never voiced. Every join is a straight or match cut; no black frames, no fades, no dissolves.", "",
         "## The measured mix against fern's targets", "",
         "| Category | Runtime | Share | Target (REFERENCE_DECISION) |", "| --- | --- | --- | --- |"]
    for k in CAT_NAME:
        L.append(f"| {CAT_NAME[k]} | {m['seconds'][k]:.0f} s | {m['share'][k]:.1f} % | {CAT_TARGET[k]} |")
    L += ["", f"- Cuts a minute in the first 3 minutes: **{m['cuts_per_min_first3']}** (target 30-35).",
          f"- Average shot after minute 3: **{m['avg_shot_after3']} s** (median {m['median_shot_after3']} s; target 5-7 s).",
          f"- Testimony cards (kinetic captions over footage, plates or the dark ground): {m['card_s']:.0f} s, {m['card_pct']} % of the runtime "
          "(counted inside the category of the picture under them).",
          f"- Sound on the clock: narration {m['narration_s']:.0f} s (Kokoro scratch), real voices {m['real_voice_s']:.0f} s, Tim's 2024 lines "
          f"as words only {m['t24_s']:.0f} s.", ""]
    mixrep = ROOT / "out/audio/mix_v3.json"
    if mixrep.exists():
        r = json.load(open(mixrep))
        L += [f"Mix (out/audio/mix_v3.wav, measured with ffmpeg ebur128): integrated {r.get('integrated_lufs')} LUFS, true peak "
              f"{r.get('true_peak_dbtp')} dBTP, LRA {r.get('lra')} LU (target -14 LUFS, true peak under -1 dBTP).", ""]
    L += ["| Chapter | Starts | Length | Shots | Cuts a minute | Median shot | Narrator words |", "| --- | --- | --- | --- | --- | --- | --- |"]
    for c in edl["chapters"]:
        ds = sorted(s["duration"] for s in edl["shots"] if s["chapter"] == c["n"])
        L.append(f"| {c['n']} {c['title']} | {c['start_tc']} | {c['duration']:.1f} s | {c['shots']} | {60 * c['shots'] / c['duration']:.1f} | "
                 f"{ds[len(ds) // 2] if ds else 0:.1f} s | {c['words']} |")
    L.append("")

    def pic(src):
        k = src["kind"]
        if k == "plate":
            return (f"`{src['stage']}` `{src['camera']}`, push {src['push'].split(' (')[0]}"
                    + (f", framed {src['zoom'][0]:.2f}x" if min(src["zoom"]) > 1.12 else ""))
        if k == "clip":
            what = {"IN-1": "CECC 2026 official feed", "IN-13": "C-SPAN 2026", "IN-14": "NBC 5 Chicago 2024", "IN-15": "NBC 5 Chicago 2026"}[src["clip"]]
            how = "still" if src.get("freeze_frame") == 0 else f"from {src['src_in']:.2f} s" + (" (freezes)" if src.get("freeze_frame") else "")
            return f"REAL {src['clip']} ({what}) {how}, crop {src['crop'][2]} px wide, grade {src['grade']}"
        if k == "photo":
            return f"REAL photo `{Path(src['photo']).name}`, push {src['zoom'][0]:.2f}->{src['zoom'][1]:.2f}"
        if k == "ground":
            return "the dark ground (text system)"
        if k == "screen":
            what = f"REAL {src['clip']} from {src['src_in']:.2f} s" if src.get("clip") else f"`{Path(src['file']).name}`"
            return f"{what} on the screen of `{src['plate'].split('/')[2]}/{Path(src['plate']).stem}`"
        return f"graphics `{src['name']}` from {src['in']:.2f} s" + (f" ({src['note_piece']})" if src.get("note_piece") else "")

    for ch in edl["chapters"]:
        L += [f"## {ch['n']} · {ch['title']} ({ch['start_tc']}, {ch['duration']:.1f} s)", "",
              "| Shot | Starts | Length | Kind | Picture (source) | Type and cards | Voice it covers |", "| --- | --- | --- | --- | --- | --- | --- |"]
        for s in [x for x in edl["shots"] if x["chapter"] == ch["n"]]:
            src = s["source"]
            ty = "; ".join(f"`{t['mode']}`" + (f" ({t['hash']})" if t.get("hash") else "") for t in src.get("type", []))
            if src.get("cards"):
                ty = (ty + "; " if ty else "") + "card " + ", ".join(cd["seg"] for cd in src["cards"])
            vo = " / ".join(f"{v['id']} “{v['text'][:60]}{'…' if len(v['text']) > 60 else ''}”" for v in s["voice"]) or "(no voice)"
            L.append(f"| {s['id']} | {s['start_tc']} | {s['duration']:.2f} s | {s.get('cat', '')} | {pic(src)} | {ty} | {vo} |")
        L.append("")
    angles = [s for s in edl["shots"] if s.get("angle")]
    anims = [s for s in edl["shots"] if s.get("anim")]
    L += ["## NEW ANGLE WANTED (for Codex)", "",
          "Where fern's coverage asks for an angle no plate has, this cut uses a crop or push of an existing plate, or a plate "
          "of the same stage. Each needs a new still from the stage's builder (posed figures are fine; leave 5-8 % of the picture "
          "for the push):", ""]
    L += [f"- **{s['id']}** ({s['start_tc']}, stand-in {pic(s['source'])}): {s['angle']}" for s in angles]
    scr = [s for s in edl["shots"] if s["source"]["kind"] == "screen"]
    L += ["", "Real media inside the sets (the `screen` kind, by each plate's published corner pins): "
          + "; ".join(f"{s['id']} ({s['start_tc']}) {pic(s['source'])}" for s in scr) + ".", "",
          "## ANIMATED BEAT (the 6-8 beats to animate; stills for now)", ""]
    L += [f"- **{s['id']}** ({s['start_tc']}, {s['duration']:.1f} s, now {pic(s['source'])}): {s['anim']}" for s in anims]
    L += ["", "## Real voices on the clock", "", "| Segment | Starts | Length | Source | Words |", "| --- | --- | --- | --- | --- |"]
    for v in edl["voice"]:
        if v.get("timing") == "real":
            L.append(f"| {v['id']} | {tc(v['start'])} | {v['speech']:.2f} s | {v['who']} | “{v['say']}” |")
    L += ["", "## Tim's 2024 lines: the V01 slots", "",
          "The official 2024 stream (V01) is not in hand. Each line sits where his voice will play, at the estimated length, as "
          "a kinetic card of the GPO transcript's words (S5), silent but for the room and the score. Never voiced: no narrator "
          "and no synthetic voice speaks his words. When V01 arrives, its clips replace these slots and set their real lengths.", "",
          "| Segment | Starts | Estimated length | Words |", "| --- | --- | --- | --- |"]
    for v in edl["voice"]:
        if v.get("t24"):
            L.append(f"| {v['id']} | {tc(v['start'])} | {v['speech']:.1f} s | “{v['say']}” |")
    L += ["", "## Gate fallbacks used", ""] + [f"- {x}" for x in cut.get("fallbacks", [])]
    notes = [s for s in edl["shots"] if s.get("deviation") or s.get("note")]
    L += ["", "## Deviations from the script and notes", ""]
    L += [f"- **{s['id']}** ({s['start_tc']}): {s.get('deviation') or s.get('note')}" for s in notes]
    L += [f"- {c}" for c in cut.get("changes", [])]
    if edl["warnings"]:
        L += ["", "## Timing warnings", ""] + [f"- {w}" for w in edl["warnings"]]
    L += ["", "## Graphics commands", ""]
    for s in edl["shots"]:
        if s["source"]["kind"] == "piece":
            L.append(f"- {s['id']}: `{s['source']['clip']}` from {s['source']['in']:.3f} s, {s['source']['frames']} frames. Made by `{s['source']['command']}`.")
    EDL_MD.write_text("\n".join(L) + "\n")


def write_srt(segs):
    """The narration on the EDL's clock: each voice segment, split at sentences into cues of at most two rows of
    about 42 characters, each cue timed by its share of the words and held at least 1.2 s where the next line allows."""
    cues = []
    for s in segs.values():
        if "text" not in s:
            continue
        sents = re.findall(r"[^.?!]+[.?!]+[\"”’]?|[^.?!]+$", s["text"])
        sents = [x.strip() for x in sents if x.strip()]
        groups, cur = [], ""
        for x in sents:                      # pack sentences into cues of at most 84 characters
            if cur and len(cur) + 1 + len(x) > 84:
                groups.append(cur); cur = x
            else:
                cur = (cur + " " + x).strip()
        if cur:
            groups.append(cur)
        final = []
        for g in groups:                     # a single sentence longer than two rows: split at a comma or a space
            while len(g) > 84:
                cut = max(g.rfind(", ", 0, 84), g.rfind(": ", 0, 84))
                cut = cut + 1 if cut > 30 else g.rfind(" ", 0, 84)
                final.append(g[:cut].strip()); g = g[cut:].strip()
            final.append(g)
        words = [len(g.split()) for g in final]
        t = s["start"]
        for g, wc in zip(final, words):
            d = s["speech"] * wc / sum(words)
            cues.append([t, t + d, g]); t += d
    for i, c in enumerate(cues):            # hold short cues into the following pause, never over the next cue
        nxt = cues[i + 1][0] if i + 1 < len(cues) else c[1] + 2
        c[1] = min(max(c[1], c[0] + 1.2), nxt - 0.04)

    def rows(text):
        if len(text) <= 42:
            return text
        mid = len(text) // 2                 # break near the middle, after a comma or a full stop if one is close
        spaces = [i for i, ch in enumerate(text) if ch == " " and max(i, len(text) - i - 1) <= 46]
        spaces = spaces or [i for i, ch in enumerate(text) if ch == " "]
        sp = min(spaces, key=lambda i: abs(i - mid) - (12 if text[i - 1] in ",.:;?" else 0))
        return text[:sp] + "\n" + text[sp + 1:]
    FILM_DIR.mkdir(parents=True, exist_ok=True)
    with open(SRT, "w") as f:
        for i, (a, b, g) in enumerate(cues, 1):
            f.write(f"{i}\n{tc(a, True)} --> {tc(b, True)}\n{rows(g)}\n\n")


# ------------------------------------------------------------------------------------------------ rendering

def grade_text():
    src = (ROOT / "scenes/shoot.py").read_text()
    m = re.search(r'GRADE = \((.*?)\)\s*#', src, re.S)
    return "".join(re.findall(r'"([^"]*)"', m.group(1)))


def shot_hash(e):
    keep = {"source": e["source"], "frames": e["frames"], "v": RENDER_VERSION, "grade": grade_text()}
    keep["source"] = {k: v for k, v in e["source"].items() if k not in ("note_piece", "command", "clip", "clip_from")}
    return hashlib.sha1(json.dumps(keep, sort_keys=True).encode()).hexdigest()[:16]


# ---- dependencies: a clip is out of date when a plate, a tool or a texture it was made from is newer (as make does).
# The other sessions republish plates and graphics while the edit is being cut, so this is what keeps it current.
MONTAGE_PLATES = re.findall(r'\("([a-z_]+/[a-z_]+)"', (GFX / "montage.py").read_text())
TYPE_TOOLS = ["gfx/type.html", "gfx/type_render.js"]


def tool_deps(gen):
    t = gen["tool"]
    if t == "plate_type":
        return ["gfx/plate_type.py", "gfx/doc_composite.py", gen["plate"]] + TYPE_TOOLS
    if t == "seam":
        return ["gfx/seam.html", "gfx/type_render.js", "frames/raw/evidence_table/purses.seam.json"] + ([gen["bg"]] if "bg" in gen else [])
    if t == "canvas":
        return [gen["page"]]
    if t == "doc":
        sj = json.load(open(ROOT / gen["shot"]))
        return (["gfx/doc_composite.py", gen["shot"], sj["plate"], sj["corners"]] + ([sj["texture"]["video"]] if "texture" in sj else [])
                + ([sj["pdf"]] if "pdf" in sj else []))
    if t == "split":
        return ["gfx/split.py", "gfx/seam.html", "gfx/doc_composite.py", "frames/raw/evidence_table/purses.png", "frames/raw/inspection_room/handbags.png"]
    if t == "montage":
        return (["gfx/montage.py", "gfx/seam.html", "frames/graded/evidence_table/purses.jpg", "frames/raw/evidence_table/purses.seam.json"]
                + [f"frames/raw/{p}.png" for p in MONTAGE_PLATES])
    return []


def newest(paths):
    ts = [(ROOT / p).stat().st_mtime for p in paths if (ROOT / p).exists()]
    return max(ts) if ts else 0.0


_FRAMES = {}


def piece_plan(src):
    """Where a graphics shot's clip comes from: reel 7's file when it is up to date with its tool and plates and long
    enough (shown with reel 7's own command), else a render of the same tool at the length the shot needs (pieces whose
    length is set by a texture or a fixed design re-render at their own length). Returns {path, reuse, secs, gen, json, deps_t}."""
    need = int(round(src["in"] * FPS)) + src["frames"]
    f, fixed = src.get("file"), src.get("fixed")
    gen = dict(src["gen"])
    deps_t = newest(tool_deps(gen))
    have = None
    if f and (ROOT / f).exists():
        have = _FRAMES.setdefault(f, probe_frames(ROOT / f))
        if not src.get("override") and have >= need and (ROOT / f).stat().st_mtime >= deps_t:
            if gen["tool"] == "doc":
                gen["_json"] = gen["shot"]
            return {"path": ROOT / f, "reuse": True, "secs": have / FPS, "gen": gen, "json": None, "deps_t": deps_t}
    if fixed:
        secs = (have or 0) / FPS or src.get("len", need / FPS)
        if need > round(secs * FPS):
            raise RuntimeError(f"piece {src['name']} lasts {secs:.2f} s; the shot needs {need / FPS:.2f} s from in={src['in']}")
    else:
        secs = src.get("len") or src.get("render_secs", need / FPS + 0.25)
        if need > round(secs * FPS) and not src.get("_lenient"):
            raise RuntimeError(f"piece {src['name']} is made {secs:.2f} s long; the shot needs {need / FPS:.2f} s from in={src['in']}")
    key = hashlib.sha1(json.dumps({"gen": gen, "secs": round(secs, 3)}, sort_keys=True).encode()).hexdigest()[:12]
    j = None
    if gen["tool"] == "doc":
        if fixed and not src.get("override"):
            gen["_json"] = gen["shot"]       # a screen texture or the scale: its own shot file, as reel 7 ran it
        else:                                # the shot file, with this shot's length and marks
            j = PIECES / f"{src['name']}-{key}.json"
            gen["_json"] = str(j.relative_to(ROOT))
    return {"path": PIECES / f"{src['name']}-{key}.mp4", "reuse": False, "secs": secs, "gen": gen, "json": j, "key": key, "deps_t": deps_t}


def shot_deps_t(e):
    src = e["source"]
    if src["kind"] in ("plate", "clip", "photo", "ground", "screen"):
        deps = {"plate": [src.get("plate")], "clip": [src.get("file")], "photo": [src.get("photo")], "ground": [],
                "screen": [src.get("plate"), src.get("corners"), src.get("file"), "gfx/doc_composite.py"]}[src["kind"]]
        types = src.get("type", [])
        if any(not t.get("page") for t in types):
            deps += TYPE_TOOLS
        if src.get("cards") or any(t.get("page") for t in types):
            deps += ["gfx/quote.html"]
        if "parallax" in src:
            deps.append(src["parallax"]["depth"])
        return newest([d for d in deps if d])
    p = piece_plan(src)
    return max(p["deps_t"], p["path"].stat().st_mtime if p["path"].exists() else 0.0)


def plan_command(src):
    p = piece_plan(dict(src, _lenient=True))     # `time` only describes; a piece too short is a warning here, an error at render
    c = piece_cmd(p["gen"], str(p["path"].relative_to(ROOT)), p["secs"])
    return p," ".join(str(x) if " " not in str(x) else f'"{x}"' for x in c).replace(PY, "<gfx python>")


def ensure_piece(src, work):
    """A clip of the piece holding at least in + frames, reusing reel 7's file when it is long enough."""
    p = piece_plan(src)
    need = int(round(src["in"] * FPS)) + src["frames"]
    if p["reuse"]:
        return p["path"]
    out, gen, secs = p["path"], p["gen"], p["secs"]
    PIECES.mkdir(parents=True, exist_ok=True)
    import fcntl
    lock = open(PIECES / f".{out.name}.lock", "w")
    fcntl.flock(lock, fcntl.LOCK_EX)          # two shots sharing one piece: the second waits and reuses it
    if out.exists() and probe_frames(out) >= need and out.stat().st_mtime >= p["deps_t"]:
        return out
    if gen["tool"] == "doc" and p["json"] is not None:
        base = json.load(open(ROOT / src["gen"]["shot"]))
        base["length"] = round(secs, 3)
        base["duration"] = min(base.get("duration", secs), secs) if "duration" not in gen else gen["duration"]
        for k in ("marks", "focus", "zoom", "end_offset", "soft"):
            if k in gen:
                base[k] = gen[k]
        p["json"].write_text(json.dumps(base, indent=1, ensure_ascii=False))
        gen["_json"] = str(p["json"])
    tmp = PIECES / f".{out.name[:-4]}.tmp.mp4"
    run(piece_cmd(gen, str(tmp), secs), env=node_env())
    tmp.rename(out)
    return out


def load_depth(path, pw, ph):
    """The plate's depth map (tools/depth_estimate.py) as 0 (far plane) to 1 (nearest), at the plate's size: dilated a
    little so a near edge keeps its own pixels and the stretch falls on the far side, then softened."""
    import cv2
    import numpy as np
    d = cv2.imread(str(ROOT / path), cv2.IMREAD_UNCHANGED)
    if d is None:
        raise SystemExit(f"no depth map {path}: run `<torch python> tools/depth_estimate.py` on the plate, or set parallax false")
    d = cv2.resize(d.astype(np.float32) / 65535.0, (pw, ph), interpolation=cv2.INTER_LINEAR)
    lo, hi = np.percentile(d, 2), np.percentile(d, 99.5)
    d = np.clip((d - lo) / max(1e-6, hi - lo), 0, 1)
    r = max(2, round(4.5 * pw / 1920))
    d = cv2.dilate(d, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
    return cv2.GaussianBlur(d, (0, 0), 2.0 * pw / 1920)


def plate_frames(path, n, z0, z1, cx, cy, parallax=None, image=None):
    """gfx/montage.py plate_shot's move, frame by frame (the same constant speed in log space, the same clamp so no
    edge is ever pulled in, the same cubic resampling), warped in 8 bits so the grade, the type and the encode can run
    in one ffmpeg pass instead of three.

    With `parallax` the push becomes a dolly: a point's extra scale about the plate's own centre (where the lens
    points) grows with its nearness D from the plate's depth map, a = k (z / z0 - 1), so with k 1 the nearest layer
    moves twice as far as the far plane; `slide` adds [x, y] output px of sideways travel at D 1 over the shot. The
    source of each output pixel is found by fixed-point iteration (four steps). A slide widens the framing by its own
    size so no edge is pulled in."""
    import cv2
    import numpy as np
    img = cv2.cvtColor(cv2.imread(str(image or (ROOT / "frames/raw" / (path + ".png"))), cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)
    ph, pw = img.shape[:2]
    base = max(W / pw, H / ph)
    if parallax:
        sl = parallax.get("slide", [0, 0])
        base *= 1 + 2 * max(abs(sl[0]) / W, abs(sl[1]) / H)
        D = load_depth(parallax["depth"], pw, ph)
        qx, qy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
        P0 = (pw / 2, ph / 2)
    for i in range(n):
        u = i / max(1, n - 1)
        z = z0 * (z1 / z0) ** u
        s = base * z
        hx, hy = W / (2 * s), H / (2 * s)
        x = min(max(cx * pw, hx), pw - hx); y = min(max(cy * ph, hy), ph - hy)
        if not parallax:
            M = np.float32([[s, 0, W / 2 - s * x], [0, s, H / 2 - s * y]])
            yield cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE).tobytes()
            continue
        a = parallax.get("k", 1.0) * (z / z0 - 1)
        sx, sy = sl[0] * u / s, sl[1] * u / s                     # output px -> plate px
        fx, fy = x + (qx - W / 2) / s, y + (qy - H / 2) / s          # the flat push's source
        px, py = fx, fy
        for _ in range(4):
            d = cv2.remap(D, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            k = 1 + a * d
            px = (P0[0] + (fx - P0[0]) / k - sx * d).astype(np.float32)
            py = (P0[1] + (fy - P0[1]) / k - sy * d).astype(np.float32)
        yield cv2.remap(img, px, py, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE).tobytes()


def overlay_movs(src, work, n):
    """Render a shot's overlays (story type, quote-page type, testimony cards) as alpha layers: [(mov, tin, t0)]."""
    layers = []
    for i, ty in enumerate(src.get("type", [])):
        secs = n / FPS - ty["t0"] + ty["tin"] + 0.1
        mov = work / f"type{i}.mov"
        if ty.get("page") == "quote":           # gfx/quote.html, rendered from tin, with its plan
            plan = work / f"type{i}.json"
            plan.write_text(json.dumps(ty["plan"]))
            run(["node", CANVAS, "gfx/quote.html", "seq", ty["mode"], f"{ty['tin']:.4f}", f"{ty['tin'] + secs:.4f}", mov,
                 "--plan", plan, "--fps", str(FPS)], env=node_env())
            layers.append((mov, 0.0, ty["t0"]))
            continue
        c = ["node", "gfx/type_render.js", "seq", ty["mode"], f"{secs:.3f}", mov, "--look", ty.get("look", "B"), "--fps", str(FPS)]
        if ty.get("hash"):
            c += ["--hash", ty["hash"]]
        run(c, env=node_env())
        layers.append((mov, ty["tin"], ty["t0"]))
    for j, cd in enumerate(src.get("cards", [])):
        plan, mov = work / f"card{j}.json", work / f"card{j}.mov"
        plan.write_text(json.dumps(cd["plan"]))
        run(["node", CANVAS, "gfx/quote.html", "seq", "card", f"{cd['a']:.4f}", f"{cd['a'] + cd['secs'] + 0.05:.4f}", mov,
             "--plan", plan, "--fps", str(FPS)], env=node_env())
        layers.append((mov, 0.0, cd["t0"]))
    return layers


def overlay_chain(layers, fc, last, ins):
    for i, (mov, tin, t0) in enumerate(layers):
        ins = ins + ["-i", str(mov)]
        fc += (f"[{i + 1}:v]format=rgba,trim=start={tin:.4f},setpts=PTS-STARTPTS,"
               f"tpad=start_duration={t0:.4f}:color=0x00000000[t{i}];{last}[t{i}]overlay=eof_action=pass:format=auto[o{i}];")
        last = f"[o{i}]"
    return fc, last, ins


def media_grade(img, grade):
    """The real media's light grade, in RGB: `archive` leans toward the film's grade A without looking rendered
    (saturation 0.78, the shadows a little cooler, a soft vignette); `testimony` is the text system's look 1 behind
    the words (saturation 0.3, darker, a cold soft-light tint); `none` passes it through."""
    import numpy as np
    if grade == "none":
        return img
    x = img.astype(np.float32) / 255.0
    lum = x @ np.float32([0.2126, 0.7152, 0.0722])
    sat, gain, con = (0.78, 1.0, 1.04) if grade == "archive" else (0.30, 0.86, 1.10)
    x = lum[..., None] + (x - lum[..., None]) * sat
    x = (x - 0.5) * con + 0.5
    x *= gain
    if grade == "archive":                     # the shadows a little cooler (grade A's curves, gently)
        sh = np.clip(1.0 - lum / 0.5, 0, 1)[..., None]
        x += sh * np.float32([-0.012, 0.0, 0.022])
    else:                                      # soft-light, a cold blue at 0.55 (as look 1 draws it over the footage)
        tint = np.float32([40, 90, 120]) / 255.0
        sl = np.where(tint <= 0.5, x - (1 - 2 * tint) * x * (1 - x), x + (2 * tint - 1) * (np.sqrt(np.clip(x, 0, 1)) - x))
        x = x + (sl - x) * 0.55
    h, w = x.shape[:2]
    k = (h, w, grade)
    if k not in _VIG:
        yy, xx = np.ogrid[:h, :w]
        r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / np.sqrt(2)
        _VIG[k] = (1.0 - (0.28 if grade == "archive" else 0.4) * np.clip((r - 0.35) / 0.65, 0, 1) ** 1.6)[..., None].astype(np.float32)
    x *= _VIG[k]
    return (np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8)


_VIG = {}


_PROBE = {}


def clip_frames(src, n):
    """A real clip, 24 frames a second from src_in, through a crop window that may push (log-space width, linear
    centre) and that stops dead where the picture freezes. Decoded with the BT.709 matrix (the HD sources carry no
    tag; ffmpeg would read them as BT.601)."""
    import cv2
    import numpy as np
    f = ROOT / src["file"]
    if f not in _PROBE:
        _PROBE[f] = json.loads(run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                                    "-of", "json", f]))["streams"][0]
    sw, sh = _PROBE[f]["width"], _PROBE[f]["height"]
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{src['src_in']:.3f}", "-i", str(f), "-vf",
                           f"fps={FPS},scale=in_color_matrix=bt709:in_range=tv:flags=bicubic+accurate_rnd+full_chroma_int,format=rgb24",
                           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    fz = src.get("freeze_frame")
    hold = src.get("hold_first", 0)
    (x0, y0, w0), (x1, y1, w1) = src["crop"], src["crop1"]
    img, got = None, -1
    try:
        for i in range(n):
            k = max(0, i - hold)
            if fz is not None:
                k = min(k, max(0, fz - hold))
            while got < k:
                b = ff.stdout.read(sw * sh * 3)
                if len(b) < sw * sh * 3:
                    break                       # the clip ended: hold its last frame
                img, got = np.frombuffer(b, np.uint8).reshape(sh, sw, 3), got + 1
            m = min(i, fz) if fz is not None else i
            span = (fz if fz is not None else n - 1) or 1
            u = m / span
            w = w0 * (w1 / w0) ** u
            cx = (x0 + w0 / 2) + ((x1 + w1 / 2) - (x0 + w0 / 2)) * u
            cy = (y0 + w0 * 9 / 32) + ((y1 + w1 * 9 / 32) - (y0 + w0 * 9 / 32)) * u
            s = W / w
            M = np.float32([[s, 0, W / 2 - s * cx], [0, s, H / 2 - s * cy]])
            fr = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            yield media_grade(fr, src["grade"]).tobytes()
    finally:
        ff.kill(); ff.wait()


def photo_frames(src, n):
    """A photograph pushed like a plate (the same log-space push, the same clamp, parallax from its depth map)."""
    for fr in plate_frames(src["photo"], n, src["zoom"][0], src["zoom"][1], src["centre"][0], src["centre"][1], src.get("parallax"),
                           image=ROOT / src["photo"]):
        import numpy as np
        yield media_grade(np.frombuffer(fr, np.uint8).reshape(H, W, 3), src["grade"]).tobytes()


def ground_frames(src, n):
    """The text system's dark ground (the case file's board: near black, slow mottling under a lamp, fibre), drifting."""
    import cv2
    import numpy as np
    rs = np.random.RandomState(src["seed"])
    GW, GH = 2300, 1400
    g = np.full((GH, GW, 3), (7, 8, 10), np.float32)
    yy, xx = np.mgrid[0:GH, 0:GW].astype(np.float32)
    for _ in range(60):
        x, y, rad, a = rs.rand() * GW, rs.rand() * GH, 140 + rs.rand() * 560, 0.012 + rs.rand() * 0.03
        d = np.exp(-(((xx - x) ** 2 + (yy - y) ** 2) / (2 * (rad / 2) ** 2)))
        g += d[..., None] * np.float32([150, 170, 190]) * a
    g += (rs.rand(GH, GW, 1).astype(np.float32) - 0.5) * 6
    g = np.clip(g, 0, 255).astype(np.uint8)
    (dx, dy), (z0, z1) = src["drift"], src["zoom"]
    for i in range(n):
        u = i / max(1, n - 1)
        z = z0 * (z1 / z0) ** u
        s = z * max(W / (GW - 2 * abs(dx) - 40), H / (GH - 2 * abs(dy) - 40))
        cx, cy = GW / 2 + dx * (u - 0.5), GH / 2 + dy * (u - 0.5)
        M = np.float32([[s, 0, W / 2 - s * cx], [0, s, H / 2 - s * cy]])
        yield cv2.warpAffine(g, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).tobytes()


def render_screen(src, n, work, tmp):
    """A real clip on a plate's screen: the clip's crop as a texture (BT.709, tagged), pinned by gfx/doc_composite.py
    to the screen's corners, lit by the blank display's own glow, pushed in, graded with the film's grade."""
    sys.path.insert(0, str(GFX))
    from doc_composite import TO_YUV, TAGS
    secs = n / FPS + 0.3
    x, y, w, h = src["crop"]
    tex = work / "tex.mp4"
    m = src.get("matrix", "bt709")
    vf = (f"fps={FPS},crop={w}:{h}:{x}:{y},scale=1280:{int(round(1280 * h / w / 2)) * 2}:in_color_matrix={m}:in_range={'auto' if m == 'auto' else 'tv'}:"
          f"flags=bicubic+accurate_rnd+full_chroma_int,format=rgb24,scale=out_color_matrix=bt709:out_range=tv,format=yuv444p")
    image = src["file"].endswith((".png", ".jpg"))
    if src.get("still"):
        vf = "trim=end_frame=1,loop=loop=-1:size=1," + vf
    ins = ["-loop", "1", "-framerate", str(FPS), "-i", ROOT / src["file"]] if image else ["-ss", f"{src['src_in']:.3f}", "-i", ROOT / src["file"]]
    run(["ffmpeg", "-v", "error", "-y", *ins, "-t", f"{secs:.3f}", "-an", "-vf", vf,
         "-frames:v", str(int(round(secs * FPS))), "-c:v", "libx264", "-crf", "8", "-pix_fmt", "yuv444p", *TAGS, tex])
    shot = work / "screen.json"
    shot.write_text(json.dumps({"plate": src["plate"], "corners": src["corners"], "texture": {"video": str(tex), "fps": FPS},
                                "focus_uv": src["focus_uv"], "em_px": 40, "zoom": src["zoom"], "duration": n / FPS, "length": n / FPS + 0.05,
                                "tex_gain": src["tex_gain"], "tex_blur_px": 0.7}))
    raw = work / "screen.mp4"
    run([PY, GFX / "doc_composite.py", "--shot", shot, "--out", raw])
    run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-vf", f"trim=end_frame={n},setpts=PTS-STARTPTS,setsar=1,format=yuv420p",
         "-frames:v", str(n), "-r", str(FPS), *ENC, tmp])


def render_shot(e):
    global ENC
    if VERSION != "animatic_v1" and "-threads" not in ENC:   # the v3 cache: CRF 17 (disk is tight; the join re-encodes),
        ENC = [("17" if x == "14" else x) for x in ENC] + ["-threads", "2"]   # two threads (the machine is shared)
    sys.path.insert(0, str(GFX))
    # scenes/shoot.py GRADE, its grain made temporal (as plate_shot uses it), and the named BT.709 conversion to YUV
    from doc_composite import TO_YUV, grade_filter, grade_filter_yuv
    SHOTS.mkdir(parents=True, exist_ok=True)
    out, side = SHOTS / f"{e['id']}.mp4", SHOTS / f"{e['id']}.json"
    h = shot_hash(e)
    work = Path(tempfile.mkdtemp(prefix=f"shot-{e['id']}-", dir=FILM_DIR / "tmp"))
    tmp = work / "shot.mp4"
    src, n = e["source"], e["frames"]
    try:
        if src["kind"] == "plate":
            ins = ["-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
            # the conversion to YUV sits where ffmpeg's own sat: a plate alone goes to YUV before its grain (the grain
            # on the 4:2:0 planes); with type, grain and type stay in RGB and the conversion comes after the type
            layers = overlay_movs(src, work, n)
            fc, last = f"[0:v]{grade_filter() if layers else grade_filter_yuv()}[g];", "[g]"
            fc, last, ins = overlay_chain(layers, fc, last, ins)
            fc += f"{last}{TO_YUV if layers else 'format=yuv420p'}[v]"
            ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", fc, "-map", "[v]", "-frames:v", str(n),
                                   "-r", str(FPS), *ENC, str(tmp)], stdin=subprocess.PIPE, cwd=ROOT)
            for fr in plate_frames(f"{src['stage']}/{src['camera']}", n, src["zoom"][0], src["zoom"][1], src["centre"][0], src["centre"][1],
                                   src.get("parallax")):
                ff.stdin.write(fr)
            ff.stdin.close()
            if ff.wait():
                raise RuntimeError(f"{e['id']}: ffmpeg failed on the plate")
        elif src["kind"] in ("clip", "photo", "ground"):
            # real media and the dark ground: their own light grade in RGB (never the 3D plates' grade A), fresh grain
            # in RGB, the type and the cards over it, then the one named BT.709 conversion
            ins = ["-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
            layers = overlay_movs(src, work, n)
            grain = {"clip": 5, "photo": 6, "ground": 5}[src["kind"]] if src.get("grade", "archive") != "none" else 0
            fc, last = f"[0:v]format=rgb24{f',noise=alls={grain}:allf=t+u' if grain else ''}[g];", "[g]"
            fc, last, ins = overlay_chain(layers, fc, last, ins)
            fc += f"{last}{TO_YUV}[v]"
            ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", fc, "-map", "[v]", "-frames:v", str(n),
                                   "-r", str(FPS), *ENC, str(tmp)], stdin=subprocess.PIPE, cwd=ROOT)
            gen = {"clip": clip_frames, "photo": photo_frames, "ground": ground_frames}[src["kind"]]
            for fr in gen(src, n):
                ff.stdin.write(fr)
            ff.stdin.close()
            if ff.wait():
                raise RuntimeError(f"{e['id']}: ffmpeg failed on the {src['kind']}")
        elif src["kind"] == "screen":
            render_screen(src, n, work, tmp)
        else:
            f = ensure_piece(src, work)
            a = int(round(src["in"] * FPS))
            # the piece's matrix from its tag: the tools' clips are BT.709 and pass through untouched; canvas_render.js
            # writes BT.601 untagged (read as 601, as ffmpeg reads it), brought to BT.709 here
            run(["ffmpeg", "-v", "error", "-y", "-i", f, "-vf",
                 f"trim=start_frame={a}:end_frame={a + n},setpts=PTS-STARTPTS,scale={W}:{H}:in_color_matrix=auto:"
                 f"out_color_matrix=bt709:out_range=tv:flags=bicubic+accurate_rnd+full_chroma_int,setsar=1,format=yuv420p",
                 "-frames:v", str(n), "-r", str(FPS), *ENC, tmp])
        got = probe_frames(tmp)
        if got != n:
            raise RuntimeError(f"{e['id']}: rendered {got} frames, expected {n}")
        tmp.rename(out)
        side.write_text(json.dumps({"hash": h, "frames": n, "source": src}, indent=1, ensure_ascii=False))
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return e["id"]


def is_current(e):
    out, side = SHOTS / f"{e['id']}.mp4", SHOTS / f"{e['id']}.json"
    if not (out.exists() and side.exists()):
        return False
    try:
        return json.load(open(side))["hash"] == shot_hash(e) and out.stat().st_mtime >= shot_deps_t(e)
    except Exception:
        return False


def render_cmd(args):
    edl = json.load(open(EDL_JSON))
    (FILM_DIR / "tmp").mkdir(parents=True, exist_ok=True)
    only = set(args.only.split(",")) if args.only else None
    todo = [e for e in edl["shots"] if (only is None or e["id"] in only) and (args.force or not is_current(e))]
    # the longest renders first (graphics pieces that must be re-made), so the pool ends evenly
    todo.sort(key=lambda e: (e["source"]["kind"] != "piece" or not e["source"].get("override"), -e["frames"]))
    print(f"render: {len(todo)} of {len(edl['shots'])} shots to render ({args.jobs} at a time)", flush=True)
    t0, done, failed = time.time(), 0, []
    with cf.ThreadPoolExecutor(args.jobs) as ex:
        extra = ["--cut", CUT_ARG] if CUT_ARG else []
        futs = {ex.submit(subprocess.run, [PY, __file__, "_shot", e["id"], *extra], capture_output=True, text=True): e for e in todo}
        for fu in cf.as_completed(futs):
            e, r = futs[fu], fu.result()
            done += 1
            if r.returncode:
                failed.append(e["id"])
                print(f"  FAILED {e['id']}: {r.stderr[-1500:]}", flush=True)
            else:
                print(f"  {done}/{len(todo)} {e['id']} ({e['frames']} f) {time.time() - t0:.0f} s", flush=True)
    print("render done" + (f"; failed: {failed}" if failed else ""), flush=True)
    if failed:
        sys.exit(1)


def shot_one(sid):
    edl = json.load(open(EDL_JSON))
    e = next(x for x in edl["shots"] if x["id"] == sid)
    render_shot(e)


def join_cmd(args):
    edl = json.load(open(EDL_JSON))
    missing = [e["id"] for e in edl["shots"] if not is_current(e)]
    if missing:
        raise SystemExit(f"shots not rendered or out of date: {missing}")
    v1 = VERSION == "animatic_v1"
    lst = FILM_DIR / ("concat.txt" if v1 else f"concat_{VERSION}.txt")
    lst.write_text("".join(f"file '{SHOTS / (e['id'] + '.mp4')}'\n" for e in edl["shots"]))
    tmp = FILM_DIR / f"{VERSION}.tmp.mp4"
    crf, mx = ("18", "14M") if v1 else ("19", "9M")
    # v3: the mix (audio/tools/mix_v3.py) goes in during the same encode when it exists, so the film is written once
    mix = None if v1 else ROOT / json.load(open(CUT))["paths"]["mix"]
    aud = (["-i", mix, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "256k", "-ar", "48000"] if mix and mix.exists() else ["-an"])
    thr = [] if v1 else ["-threads", "2"]
    # a join of BT.709 shots (every one rendered at this RENDER_VERSION): the YUV passes through untouched
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, *aud[:2], "-vf", "setsar=1,format=yuv420p", *aud[2:],
         "-r", str(FPS), "-frames:v", str(edl["total_frames"]), "-c:v", "libx264", "-profile:v", "high", "-crf", crf, "-maxrate", mx,
         "-bufsize", "28M", "-preset", "fast", "-pix_fmt", "yuv420p", *thr, "-colorspace", "bt709", "-color_primaries", "bt709",
         "-color_trc", "bt709", "-color_range", "tv", "-movflags", "+faststart", tmp])
    got = probe_frames(tmp)
    if got != edl["total_frames"]:
        raise SystemExit(f"joined {got} frames, the EDL has {edl['total_frames']}")
    if v1:
        tmp.rename(FILM)
        print(f"wrote {FILM}: {got} frames, {tc(got / FPS)}")
        return
    if mix and mix.exists():
        tmp.rename(FILM)
        print(f"wrote {FILM}: {got} frames, {tc(got / FPS)}, with the mix {mix.relative_to(ROOT)}")
        return
    pic = FILM.with_name(FILM.stem + "_picture.mp4")
    tmp.rename(pic)
    print(f"wrote {pic}: {got} frames, {tc(got / FPS)} (picture only; `mux` adds the mix)")


def mux_cmd(args):
    """The picture and the mix (audio/tools/mix_v3.py's master) into the deliverable: video copied, AAC 256 k 48 kHz."""
    edl = json.load(open(EDL_JSON))
    pic = FILM.with_name(FILM.stem + "_picture.mp4")
    mix = ROOT / json.load(open(CUT))["paths"]["mix"]
    tmp = FILM_DIR / f"{VERSION}.mux.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", pic, "-i", mix, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
         "-ar", "48000", "-frames:v", str(edl["total_frames"]), "-shortest", "-movflags", "+faststart", tmp])
    tmp.rename(FILM)
    print(f"wrote {FILM}: {probe_frames(FILM)} frames with the mix")


# ------------------------------------------------------------------------------------------------ sheets and checks

def sheets_cmd(args):
    import cv2
    import numpy as np
    edl = json.load(open(EDL_JSON))
    SHEETS.mkdir(parents=True, exist_ok=True)
    for f in SHEETS.glob("*.jpg"):
        f.unlink()
    cuts = [s["start_frame"] for s in edl["shots"][1:]]
    idx_of = {}
    for s in edl["shots"]:
        for k in range(s["start_frame"], s["start_frame"] + s["frames"]):
            idx_of[k] = s["id"]
    every = set(range(0, edl["total_frames"], 2 * FPS))
    around = {c + d: c for c in cuts for d in (-2, -1, 0, 1)}
    want = every | set(around)
    cap = cv2.VideoCapture(str(FILM))
    grabs, lum, prev, frozen, run_len, red = {}, [], None, [], 0, []
    red_ok = {s["id"] for s in edl["shots"] if s["source"]["kind"] == "piece" and s["source"]["name"] in ("flash", "trace", "cutaway", "split", "split_r7", "montage")}
    real = {s["id"] for s in edl["shots"] if s["source"]["kind"] in ("clip", "photo", "screen")}   # real media: its own reds
    red_ok |= real
    i = 0
    while True:
        ok, im = cap.read()
        if not ok:
            break
        small = cv2.resize(im, (480, 270), interpolation=cv2.INTER_AREA)
        g = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY).astype(np.float32)
        lum.append(float(g.mean()))
        if prev is not None:
            d = float(np.abs(g - prev).mean())
            run_len = run_len + 1 if d < 0.15 else 0
            if run_len == 12:
                frozen.append(i)
        prev = g
        hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
        redpx = int(((hsv[..., 0] < 8) | (hsv[..., 0] > 172)).astype(np.uint8)[(hsv[..., 1] > 140) & (hsv[..., 2] > 90)].sum())
        if redpx > 60 and idx_of.get(i) not in red_ok:
            red.append((i, idx_of.get(i), redpx))
        if i in want:
            grabs[i] = small
        i += 1
    n = i
    black = [k for k, v in enumerate(lum) if v < 4.0]

    def label(img, text):
        img = img.copy(); cv2.rectangle(img, (0, 0), (480, 18), (0, 0, 0), -1)
        cv2.putText(img, text, (4, 13), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1)
        return img

    def grid(tiles, cols, path):
        rows = [tiles[k:k + cols] + [np.zeros_like(tiles[0])] * (cols - len(tiles[k:k + cols])) for k in range(0, len(tiles), cols)]
        cv2.imwrite(str(path), np.vstack([np.hstack(r) for r in rows]), [cv2.IMWRITE_JPEG_QUALITY, 80])
    ev = [label(grabs[k], f"{tc(k / FPS)} {idx_of.get(k, '')}") for k in sorted(every) if k in grabs]
    for p in range(0, len(ev), 48):
        grid(ev[p:p + 48], 6, SHEETS / f"every2s_{p // 48 + 1:02d}.jpg")
    rows = []
    for c in cuts:
        rows.append([label(grabs[c + d], f"{tc((c + d) / FPS)} {idx_of.get(c + d, '')} {'CUT' if d == 0 else d}") for d in (-2, -1, 0, 1) if c + d in grabs])
    tiles = [t for r in rows for t in r]
    for p in range(0, len(tiles), 64):
        grid(tiles[p:p + 64], 4, SHEETS / f"cuts_{p // 64 + 1:02d}.jpg")
    rep = {"frames": n, "expected": edl["total_frames"], "black_frames": black[:50], "frozen_runs_12f_at": frozen[:50],
           "red_outside_seam": red[:50], "mean_luma_min": min(lum), "mean_luma_median": sorted(lum)[len(lum) // 2]}
    (SHEETS / "checks.json").write_text(json.dumps(rep, indent=1))
    print(json.dumps({k: (v if not isinstance(v, list) else f"{len(v)} {v[:8]}") for k, v in rep.items()}, indent=1))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["time", "render", "join", "mux", "sheets", "all", "_shot"])
    ap.add_argument("id", nargs="?")
    ap.add_argument("--jobs", type=int, default=2)
    ap.add_argument("--only")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--cut", help="another cut plan (animatic v3: design/edit/cut_v3.json)")
    a = ap.parse_args()
    if a.cut:
        configure(a.cut)
    if a.cmd == "_shot":
        return shot_one(a.id)
    if a.cmd in ("time", "all"):
        time_cmd(a)
    if a.cmd in ("render", "all"):
        render_cmd(a)
    if a.cmd in ("join", "all"):
        join_cmd(a)
    if a.cmd == "mux":
        mux_cmd(a)
    if a.cmd in ("sheets", "all"):
        sheets_cmd(a)


if __name__ == "__main__":
    main()
