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
  piece   a graphics piece trimmed from a rendered clip (out/gfx/r7, reel 7's exact commands), or re-rendered with the
          same tool and parameters at the length the shot needs.

Nothing here draws a label, a black frame, a fade or a dissolve: every join is a straight cut.
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
RENDER_VERSION = 4                 # bump to invalidate every cached shot
# the cached shots are intermediates: high quality, fast to write; the join makes the one delivery encode
ENC = ["-c:v", "libx264", "-crf", "14", "-preset", "veryfast", "-pix_fmt", "yuv420p",
       "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"]


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
    """[(text, seconds)] from the scratch narration, if it exists; durations from the file's fields or its audio."""
    if not LINES.exists():
        return None
    d = json.load(open(LINES))
    lines = d.get("lines", d) if isinstance(d, dict) else d
    out = []
    for L in lines:
        text, dur = L.get("text", ""), None
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
            out.append((text, dur))
    return out or None


def align_measured(segs, lines):
    """Give each voice segment the measured time of its words: every line's duration is spread over its words by
    their length, and the segments' words are found in that stream in order. Returns {seg id: seconds} for the
    segments found."""
    stream = []
    for text, dur in lines:
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
    for ch in cut["chapters"]:
        rate = ch["rate"]
        ch["_start"] = t
        for i, s in enumerate(ch["voice"]):
            s["start"] = t
            if "text" in s:
                words = len([w for w in s["text"].split() if norm(w)])
                est = max(minline, words * 60.0 / rate)
                s["speech"] = measured.get(s["id"], est)
                s["timing"] = "measured" if s["id"] in measured else "estimated"
                nxt = ch["voice"][i + 1] if i + 1 < len(ch["voice"]) else None
                s["end"] = t + s["speech"] + (gap if (nxt is None or "text" in nxt) else 0.0)
                s["words"] = words
            else:
                s["speech"] = 0.0
                s["end"] = t + s["hold"]
            t = s["end"]
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
                if off >= dur - 0.25:
                    warnings.append(f"{s['id']}: type {ty['mode']} starts at {off:.2f} s, after the shot ends")
                types.append(d)
            src["type"] = types
        else:
            pc = dict(pieces[s["piece"]])
            src = {"kind": "piece", "name": s["piece"], "in": s.get("in", 0.0), "frames": n,
                   "file": pc.get("file"), "gen": dict(pc["gen"]), "fixed": pc.get("fixed", False)}
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
            if "max" in s and dur > s["max"] + 1e-6:
                warnings.append(f"{s['id']}: {dur:.2f} s is longer than the {s['max']} s the piece allows from in={src['in']}")
            src["note_piece"] = pc.get("about", "")
        s["_src"] = src
        e["source"] = src
        # the voice it covers
        cov = []
        for v in segs.values():
            if "text" in v and min(v["start"] + v["speech"], t0 + dur) - max(v["start"], t0) > 0.12:
                cov.append({"id": v["id"], "text": v["text"]})
        e["voice"] = cov
        for k in ("row", "sound", "note", "sub", "change"):
            if k in s:
                e[k] = s[k]
        edl_shots.append(e)

    chapters = [{"n": ch["n"], "title": ch["title"], "start": round(ch["_start"], 3), "start_tc": tc(ch["_start"]),
                 "duration": round(ch["_end"] - ch["_start"], 3), "rate_wpm": ch["rate"],
                 "words": sum(v.get("words", 0) for v in ch["voice"]),
                 "shots": sum(1 for s in edl_shots if s["chapter"] == ch["n"])} for ch in cut["chapters"]]
    voice = [{"id": v["id"], "start": round(v["start"], 3), "speech": round(v["speech"], 3), "end": round(v["end"], 3),
              **({"text": v["text"], "timing": v["timing"]} if "text" in v else {"hold": v["hold"], "note": v.get("note", "")})}
             for v in segs.values()]
    timing = ("measured: audio/vo/scratch/lines.json (%d of %d voice segments matched; the rest estimated)" %
              (len(measured), sum(1 for v in segs.values() if "text" in v))) if lines else \
        "estimated from word counts at each chapter's rate (no scratch narration yet)"
    edl = {"film": "The Prize That Became a Prison", "version": "animatic_v1", "fps": FPS, "size": [W, H],
           "total_frames": total_f, "duration": round(total_f / FPS, 3), "duration_tc": tc(total_f / FPS),
           "timing": timing, "gap_s": cut.get("gap", 0.35), "chapters": chapters, "shots": edl_shots, "voice": voice,
           "warnings": warnings}
    EDL_JSON.write_text(json.dumps(edl, indent=1, ensure_ascii=False) + "\n")
    write_md(edl, cut)
    write_srt(segs)
    print(f"EDL: {len(edl_shots)} shots, {tc(total_f / FPS)} ({total_f} frames); timing {timing}")
    for c in chapters:
        print(f"  {c['n']} {c['title']:<28} {c['start_tc']:>8}  {c['duration']:6.1f} s  {c['shots']:3d} shots  {c['words']} words @ {c['rate_wpm']}")
    for w in warnings:
        print("  WARNING", w)


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


def describe_cmd(src):
    g = dict(src["gen"]); n = src["frames"]; secs = src["in"] + n / FPS
    if g["tool"] == "doc":
        g["_json"] = g.get("shot", "") + (" (with the marks and length above)" if src.get("override") else "")
    c = piece_cmd(g, "<out>.mp4", secs)
    return " ".join(str(x) if " " not in str(x) else f'"{x}"' for x in c).replace(PY, "<gfx python>")


# ------------------------------------------------------------------------------------------------ EDL.md and SRT

def write_md(edl, cut):
    L = [f"# The Prize That Became a Prison: edit decision list (animatic v1)", "",
         f"Generated by `tools/assemble.py time` from `design/edit/cut.json`; do not edit by hand (edit the cut plan and "
         f"run `time` again). The machine-readable list is `design/edit/EDL.json`.", "",
         f"**Length {edl['duration_tc']}** ({edl['total_frames']} frames at {edl['fps']} fps, {len(edl['shots'])} shots). "
         f"Timing: {edl['timing']}. Every join is a straight cut; no black frames, no fades, no dissolves.", "",
         "| Chapter | Starts | Length | Shots | Cuts a minute | Median shot | Words | Rate |", "| --- | --- | --- | --- | --- | --- | --- | --- |"]
    for c in edl["chapters"]:
        ds = sorted(s["duration"] for s in edl["shots"] if s["chapter"] == c["n"])
        med = ds[len(ds) // 2] if ds else 0
        L.append(f"| {c['n']} {c['title']} | {c['start_tc']} | {c['duration']:.1f} s | {c['shots']} | "
                 f"{60 * c['shots'] / c['duration']:.1f} | {med:.1f} s | {c['words']} | {c['rate_wpm']} wpm |")
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
    L += ["## Graphics commands", "", "Each graphics shot's piece, with the exact command that renders it at the length the shot needs "
          "(`tools/assemble.py render` reuses reel 7's clip in `out/gfx/r7/` when it is long enough and unchanged).", ""]
    for s in edl["shots"]:
        if s["source"]["kind"] == "piece":
            src = s["source"]
            extra = ""
            if src.get("override"):
                ov = {k: v for k, v in src["gen"].items() if k in ("marks", "cut", "length", "duration", "focus")}
                extra = f" Shot-specific: `{json.dumps(ov, ensure_ascii=False)}`."
            L.append(f"- {s['id']}: `{describe_cmd(src)}`, trimmed from {src['in']:.3f} s for {src['frames']} frames"
                     + (f" (reel 7 file `{src['file']}`)" if src.get("file") else "") + "." + extra)
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

def shot_hash(e):
    keep = {"source": e["source"], "frames": e["frames"], "v": RENDER_VERSION}
    keep["source"] = {k: v for k, v in e["source"].items() if k not in ("note_piece",)}
    return hashlib.sha1(json.dumps(keep, sort_keys=True).encode()).hexdigest()[:16]


def ensure_piece(src, work):
    """A clip of the piece holding at least in + frames, reusing reel 7's file when it is long enough."""
    need = int(round(src["in"] * FPS)) + src["frames"]
    f = src.get("file")
    if f and not src.get("override") and (ROOT / f).exists():
        have = probe_frames(ROOT / f)
        if have >= need:
            return ROOT / f
        if src.get("fixed"):
            raise RuntimeError(f"piece {src['name']} has {have} frames, the shot needs {need}, and it cannot be re-rendered longer")
    if src.get("fixed") and not src.get("override"):
        raise RuntimeError(f"piece {src['name']} is missing: {f}")
    secs = need / FPS + 0.25
    gen = dict(src["gen"])
    key = hashlib.sha1(json.dumps({"gen": gen, "secs": round(secs, 3)}, sort_keys=True).encode()).hexdigest()[:12]
    PIECES.mkdir(parents=True, exist_ok=True)
    out = PIECES / f"{src['name']}-{key}.mp4"
    if out.exists() and probe_frames(out) >= need:
        return out
    if gen["tool"] == "doc":                 # the shot file, with this shot's length and marks
        base = json.load(open(ROOT / gen["shot"]))
        base["length"] = round(secs, 3)
        base["duration"] = min(base.get("duration", secs), secs) if "duration" not in gen else gen["duration"]
        for k in ("marks", "focus", "zoom", "end_offset", "soft"):
            if k in gen:
                base[k] = gen[k]
        j = PIECES / f"{src['name']}-{key}.json"
        j.write_text(json.dumps(base, indent=1, ensure_ascii=False))
        gen["_json"] = str(j)
    tmp = PIECES / f".{src['name']}-{key}.tmp.mp4"
    run(piece_cmd(gen, str(tmp), secs), env=node_env())
    tmp.rename(out)
    return out


def plate_frames(path, n, z0, z1, cx, cy):
    """gfx/montage.py plate_shot's move, frame by frame (the same constant speed in log space, the same clamp so no
    edge is ever pulled in, the same cubic resampling), warped in 8 bits so the grade, the type and the encode can run
    in one ffmpeg pass instead of three."""
    import cv2
    import numpy as np
    img = cv2.cvtColor(cv2.imread(str(ROOT / "frames/raw" / (path + ".png")), cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)
    ph, pw = img.shape[:2]
    base = max(W / pw, H / ph)
    for i in range(n):
        z = z0 * (z1 / z0) ** (i / max(1, n - 1))
        s = base * z
        hx, hy = W / (2 * s), H / (2 * s)
        x = min(max(cx * pw, hx), pw - hx); y = min(max(cy * ph, hy), ph - hy)
        M = np.float32([[s, 0, W / 2 - s * x], [0, s, H / 2 - s * y]])
        yield cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE).tobytes()


def render_shot(e):
    sys.path.insert(0, str(GFX))
    from doc_composite import grade_filter  # scenes/shoot.py GRADE, its grain made temporal (as plate_shot uses it)
    SHOTS.mkdir(parents=True, exist_ok=True)
    out, side = SHOTS / f"{e['id']}.mp4", SHOTS / f"{e['id']}.json"
    h = shot_hash(e)
    work = Path(tempfile.mkdtemp(prefix=f"shot-{e['id']}-", dir=FILM_DIR / "tmp"))
    tmp = work / "shot.mp4"
    src, n = e["source"], e["frames"]
    try:
        if src["kind"] == "plate":
            ins = ["-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
            fc, last = f"[0:v]{grade_filter()}[g];", "[g]"
            for i, ty in enumerate(src["type"]):
                secs = n / FPS - ty["t0"] + ty["tin"] + 0.1
                mov = work / f"type{i}.mov"
                c = ["node", "gfx/type_render.js", "seq", ty["mode"], f"{secs:.3f}", mov, "--look", ty.get("look", "B"), "--fps", str(FPS)]
                if ty.get("hash"):
                    c += ["--hash", ty["hash"]]
                run(c, env=node_env())
                ins += ["-i", str(mov)]
                fc += (f"[{i + 1}:v]format=rgba,trim=start={ty['tin']:.4f},setpts=PTS-STARTPTS,"
                       f"tpad=start_duration={ty['t0']:.4f}:color=0x00000000[t{i}];{last}[t{i}]overlay=eof_action=pass:format=auto[o{i}];")
                last = f"[o{i}]"
            fc += f"{last}format=yuv420p[v]"
            ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", fc, "-map", "[v]", "-frames:v", str(n),
                                   "-r", str(FPS), *ENC, str(tmp)], stdin=subprocess.PIPE, cwd=ROOT)
            for fr in plate_frames(f"{src['stage']}/{src['camera']}", n, src["zoom"][0], src["zoom"][1], src["centre"][0], src["centre"][1]):
                ff.stdin.write(fr)
            ff.stdin.close()
            if ff.wait():
                raise RuntimeError(f"{e['id']}: ffmpeg failed on the plate")
        else:
            f = ensure_piece(src, work)
            a = int(round(src["in"] * FPS))
            run(["ffmpeg", "-v", "error", "-y", "-i", f, "-vf",
                 f"trim=start_frame={a}:end_frame={a + n},setpts=PTS-STARTPTS,scale={W}:{H},setsar=1,format=yuv420p",
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
        return json.load(open(side))["hash"] == shot_hash(e)
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
        futs = {ex.submit(subprocess.run, [PY, __file__, "_shot", e["id"]], capture_output=True, text=True): e for e in todo}
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
    lst = FILM_DIR / "concat.txt"
    lst.write_text("".join(f"file '{SHOTS / (e['id'] + '.mp4')}'\n" for e in edl["shots"]))
    tmp = FILM_DIR / "animatic_v1.tmp.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-an", "-vf", "setsar=1,format=yuv420p",
         "-r", str(FPS), "-c:v", "libx264", "-profile:v", "high", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
         "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", tmp])
    got = probe_frames(tmp)
    if got != edl["total_frames"]:
        raise SystemExit(f"joined {got} frames, the EDL has {edl['total_frames']}")
    tmp.rename(FILM)
    print(f"wrote {FILM}: {got} frames, {tc(got / FPS)}")


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
    red_ok = {s["id"] for s in edl["shots"] if s["source"]["kind"] == "piece" and s["source"]["name"] in ("flash", "trace", "cutaway", "split", "montage")}
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
    ap.add_argument("cmd", choices=["time", "render", "join", "sheets", "all", "_shot"])
    ap.add_argument("id", nargs="?")
    ap.add_argument("--jobs", type=int, default=2)
    ap.add_argument("--only")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    if a.cmd == "_shot":
        return shot_one(a.id)
    if a.cmd in ("time", "all"):
        time_cmd(a)
    if a.cmd in ("render", "all"):
        render_cmd(a)
    if a.cmd in ("join", "all"):
        join_cmd(a)
    if a.cmd in ("sheets", "all"):
        sheets_cmd(a)


if __name__ == "__main__":
    main()
