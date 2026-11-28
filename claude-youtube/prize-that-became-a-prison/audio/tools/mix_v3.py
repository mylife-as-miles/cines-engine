#!/usr/bin/env python3
"""Animatic v3's mix, from the edit (design/edit/EDL_v3.json) and the cut plan's sound (design/edit/cut_v3.json "sound").

    <any python with numpy> audio/tools/mix_v3.py [--stems]

Decoding, resampling and the loudness measurements are ffmpeg's (ebur128); the mixing is numpy. Output:
out/audio/mix_v3.wav (48 kHz, 24-bit, stereo, exactly the EDL's length), mastered to -14 LUFS integrated with the true
peak under -1 dBTP, and out/audio/mix_v3.json (what was placed where, and the measurements).

What goes in:
- **Narration**: every narrator segment's scratch line (audio/vo/scratch_v3/<ch>_<nn>.wav, Kokoro), at its start on the
  clock, the stem set to -18 LUFS.
- **Real voices** (the "real voices" stem): every `real` segment's clip, from `in` to `out`, at its start, high-passed at
  80 Hz, each set to -18 LUFS, with 12 ms edges. Tim's 2024 lines (`t24`) are silent: nothing voices them.
- **Beds**: the room of each shot's place (audio/sfx/amb_*.flac, looped from a seeded offset), cut with the picture
  (a 0.15 s crossfade at every change of room), set to -40 LUFS, 3 dB under the voices. The two clocks: Gene's domestic
  tick in the Hunt home (it stops dead on "died") and the institutional tick in detention, the cell and the visiting room.
- **Effects**: each shot's `sfx` cues at their anchors, peak-normalised quietly (the author wants few, quiet effects).
- **Score**: the cut's `sound.score` cues (audio/score/takes/G*.flac, the Lyria takes already in tune), each a window
  of a take placed at an anchor, entering from nothing and rising (its fade-in), out at its end (a fade or a hard stop),
  set to its level and ducked 8 dB under the voices with slow moves (0.4 s down, 1.2 s up).
- **Silences**: a hold marked `digital` is total silence (every stem); `room` keeps only the room, 6 dB down.
- **Master**: gain to -14 LUFS integrated, a look-ahead limiter, measured again (true peak under -1 dBTP).
"""
import argparse
import json
import os
import re
import subprocess
import sys
import zlib

import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
EDL = os.path.join(ROOT, "design/edit/EDL_v3.json")
CUT = os.path.join(ROOT, "design/edit/cut_v3.json")
OUT = os.path.join(ROOT, "out/audio/mix_v3.wav")
REP = os.path.join(ROOT, "out/audio/mix_v3.json")
VO = os.path.join(ROOT, "audio/vo/scratch_v3")
SFX = os.path.join(ROOT, "audio/sfx")
TAKES = os.path.join(ROOT, "audio/score/takes")

# the room of each place (amb_*.flac); pieces and the ground take the room of what they show
ROOM = {"aircraft_cabin": "amb_aircraft_cabin", "baggage_belt": "amb_baggage_belt", "checkin_hall": "amb_terminal_hall",
        "chicago_night": "amb_chicago_night", "courtroom": "amb_courtroom", "departure_gate": "amb_terminal_hall",
        "detention_corridor": "amb_fluorescent_hum", "evidence_table": "amb_evidence_room", "hearing_room": "amb_hearing_room",
        "home": "amb_home_room", "hongkong_street": "amb_hk_street", "hotel_room": "amb_hotel_room",
        "inspection_room": "amb_inspection_room", "leather_market": "amb_market", "prison_exterior": "amb_rain_concrete",
        "tim_desk": "amb_home_room", "train": "amb_train", "visiting_room": "amb_phone_line", "void_stage": "amb_void_air"}
PIECE_ROOM = {"scale": "amb_checkin_belt", "yes": "amb_inspection_room", "flash": "amb_evidence_room", "trace": "amb_evidence_room",
              "cutaway": "amb_evidence_room", "split": "amb_inspection_room", "split_r7": "amb_inspection_room", "title": "amb_void_air",
              "calendar": "amb_void_air", "email": "amb_evidence_room", "search": "amb_evidence_room", "father": "amb_evidence_room"}
TICK_DOMESTIC = {"home"}
TICK_INST = {"detention_corridor", "visiting_room"}


def ff_read(path, start=0.0, dur=None, ch=1, af=None):
    cmd = ["ffmpeg", "-v", "error"] + (["-ss", f"{start:.4f}"] if start > 0 else []) + (["-t", f"{dur:.4f}"] if dur else []) + ["-i", path, "-vn"]
    if af:
        cmd += ["-af", af]
    cmd += ["-ac", str(ch), "-ar", str(SR), "-f", "f32le", "-"]
    x = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32)
    return x.reshape(-1, ch).copy() if ch > 1 else x.copy()


def measure(x, peak=False):
    """Integrated loudness (LUFS), LRA and, with peak, the true peak (dBTP), by ffmpeg's ebur128."""
    ch = 1 if x.ndim == 1 else x.shape[1]
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-f", "f32le", "-ar", str(SR), "-ac", str(ch), "-i", "-", "-af",
                        "ebur128=framelog=quiet" + (":peak=true" if peak else ""), "-f", "null", "-"],
                       input=np.ascontiguousarray(x, np.float32).tobytes(), capture_output=True)
    e = r.stderr.decode(errors="ignore")
    s = e[e.rfind("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+|-inf)", s).group(1)) if re.search(r"I:\s+(-?[\d.]+)", s) else -70.0
    lra = float(re.search(r"LRA:\s+(-?[\d.]+)", s).group(1)) if re.search(r"LRA:\s+(-?[\d.]+)", s) else 0.0
    tp = None
    if peak:
        m = re.search(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf)", s)
        tp = float(m.group(1)) if m and m.group(1) != "-inf" else -99.0
    return i, lra, tp


def measure_file(path):
    """Integrated loudness, LRA and true peak of a file, measured by ffmpeg straight from it."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=framelog=quiet:peak=true", "-f", "null", "-"],
                       capture_output=True)
    e = r.stderr.decode(errors="ignore")
    s = e[e.rfind("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+)", s).group(1))
    lra = float(re.search(r"LRA:\s+(-?[\d.]+)", s).group(1))
    tp = float(re.search(r"True peak:\s+Peak:\s+(-?[\d.]+)", s).group(1))
    return i, lra, tp


def db2(g):
    return 10 ** (g / 20)


def edges(x, a=0.012):
    n = min(len(x) // 2, int(a * SR))
    if n > 0:
        r = np.linspace(0, 1, n, dtype=np.float32)
        x[:n] *= r[:, None] if x.ndim > 1 else r
        x[-n:] *= r[::-1, None] if x.ndim > 1 else r[::-1]
    return x


def put(buf, x, t):
    i = int(round(t * SR))
    if i < 0:
        x, i = x[-i:], 0
    j = min(len(buf), i + len(x))
    if j > i:
        buf[i:j] += x[:j - i]


class Clock:
    def __init__(self, edl):
        self.seg = {v["id"]: v for v in edl["voice"]}

    def t(self, a):
        m = re.match(r"(\d\d\.[A-Za-z0-9_]+)(?:@([0-9.]+)|(\$))?((?:[+-][0-9.]+)*)$", a)
        if not m:
            raise ValueError(a)
        v = self.seg[m.group(1)]
        t = v["start"]
        span = v["speech"] if v["speech"] else v["end"] - v["start"]
        if m.group(2):
            t += float(m.group(2)) * span
        elif m.group(3):
            t += span
        for d in re.findall(r"[+-][0-9.]+", m.group(4) or ""):
            t += float(d)
        return t


def room_of(shot):
    if "room" in shot:                                     # the cut plan's own choice (None: no room, the score or the tick alone)
        return (shot["room"] or None), "set"
    src = shot["source"]
    k = src["kind"]
    if k == "plate":
        return ROOM.get(src["stage"]), src["stage"]
    if k == "photo":
        return None, "photo"
    if k == "clip":
        if src["clip"] == "IN-14" and src["src_in"] > 95 and src["src_in"] < 106:
            return "amb_hearing_room", "hearing_room"     # NBC's frame of the 2024 hearing, muted: the hearing's room
        return None, "clip"                                # a real clip in sync: its own room is in the voice
    if k == "ground":
        return "amb_void_air", "ground"
    if k == "screen":
        return "amb_evidence_room", "evidence_table"
    gen = src.get("gen", {})
    if src["name"].startswith("doc") or gen.get("tool") == "doc":
        return PIECE_ROOM.get(src["name"], "amb_evidence_room"), "evidence_table"
    if src["name"].startswith("route"):
        return None, "route"
    return PIECE_ROOM.get(src["name"], "amb_void_air"), src["name"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stems", action="store_true")
    a = ap.parse_args()
    edl, cut = json.load(open(EDL)), json.load(open(CUT))
    snd = cut.get("sound", {})
    N = int(round(edl["total_frames"] / edl["fps"] * SR))
    clk = Clock(edl)
    rep = {"placements": [], "warnings": []}
    voice_n = np.zeros(N, np.float32)
    voice_r = np.zeros(N, np.float32)
    beds = np.zeros(N, np.float32)
    fx = np.zeros(N, np.float32)
    score = np.zeros((N, 2), np.float32)

    # 1. narration
    for v in edl["voice"]:
        if "text" in v:
            ch, k = v["id"].split(".")
            f = os.path.join(VO, f"{ch}_{int(k):02d}.wav")
            put(voice_n, edges(ff_read(f, af="highpass=f=70")), v["start"])
    li, _, _ = measure(voice_n)
    voice_n *= db2(-18.0 - li)
    rep["narration_lufs_in"] = li

    # 2. real voices, each to -18 LUFS
    for v in edl["voice"]:
        if v.get("timing") == "real":
            x = edges(ff_read(os.path.join(ROOT, v["file"]), v["in"] - 0.03, v["out"] - v["in"] + 0.09, af="highpass=f=80"))
            xi, _, _ = measure(x)
            x *= db2(-18.0 - xi)
            put(voice_r, x, v["start"] - 0.03)
            rep["placements"].append({"real": v["id"], "at": round(v["start"], 3), "src": [v["in"], v["out"]], "lufs_in": xi})

    # the voices' envelope, for the ducks: on wherever anyone speaks (lines closer than 0.8 s merge)
    spk = np.zeros(N, bool)
    for v in edl["voice"]:
        if "text" in v or v.get("timing") == "real":
            spk[int(v["start"] * SR):int((v["start"] + v["speech"]) * SR)] = True
    def env(mask, down_s, up_s, depth_db, hop=480):
        m = mask[::hop].astype(np.float32)
        # merge gaps under 0.8 s
        g = int(0.8 * SR / hop)
        idx = np.where(m > 0)[0]
        for p, q in zip(idx[:-1], idx[1:]):
            if 1 < q - p <= g:
                m[p:q] = 1
        out = np.zeros_like(m)
        cur = 0.0
        ad, au = 1 - np.exp(-hop / (down_s * SR)), 1 - np.exp(-hop / (up_s * SR))
        look = int(0.25 * SR / hop)
        m2 = np.concatenate([m[look:], np.zeros(look, np.float32)])      # a little look-ahead
        tgt = np.maximum(m, m2)
        for i in range(len(m)):
            cur += (tgt[i] - cur) * (ad if tgt[i] > cur else au)
            out[i] = cur
        gdb = -depth_db * out
        return np.repeat(db2(gdb), hop)[:N].astype(np.float32)

    # 3. beds: the room of each shot, cut with the picture
    spans = []
    for s in edl["shots"]:
        room, place = room_of(s)
        t0, t1 = s["start"], s["start"] + s["duration"]
        if spans and spans[-1][0] == room and abs(spans[-1][2] - t0) < 1e-6:
            spans[-1][2] = t1
        else:
            spans.append([room, t0, t1])
    cache = {}
    for room, t0, t1 in spans:
        if not room:
            continue
        if room not in cache:
            x = ff_read(os.path.join(SFX, room + ".flac"))
            xi, _, _ = measure(x)
            cache[room] = x * db2(-40.0 - xi)
        src = cache[room]
        n = int(round((t1 - t0 + 0.15) * SR))
        off = zlib.crc32(f"{room}{round(t0, 1)}".encode()) % max(1, len(src) - 1)
        x = np.resize(np.roll(src, -off), n).astype(np.float32)
        x = edges(x, 0.075)
        put(beds, x, t0 - 0.075)
    # the clocks
    tick = ff_read(os.path.join(SFX, "sfx_clock_tick.flac"))
    ti, _, _ = measure(tick)
    tick *= db2(-36.0 - ti)
    tick_inst = ff_read(os.path.join(SFX, "sfx_clock_tick.flac"), af="asetrate=48000*0.84,aresample=48000,highpass=f=300") * db2(-37.0 - ti)
    died = clk.t(snd.get("tick_stops", "08.06$-1.0"))
    for s in edl["shots"]:
        src = s["source"]
        stage = src.get("stage") or ""
        t0, t1 = s["start"], s["start"] + s["duration"]
        kind = None
        if stage in TICK_DOMESTIC and t0 < died and s["chapter"] in ("01", "07", "08"):
            kind, t1 = "dom", min(t1, died)
        elif stage in TICK_INST or (stage == "void_stage" and src.get("camera", "").startswith("cell")) or s["id"] in snd.get("tick_inst_shots", []):
            kind = "inst"
        if kind:
            x = tick if kind == "dom" else tick_inst
            n = int(round((t1 - t0) * SR))
            off = int(round(t0 * SR)) % len(x)               # one clock: its phase runs on the film's clock
            put(beds, edges(np.resize(np.roll(x, -off), n).astype(np.float32), 0.004), t0)

    # 4. effects
    for s in edl["shots"]:
        for c in s.get("sfx", []):
            f = os.path.join(SFX, c["name"] + ".flac")
            if not os.path.exists(f):
                rep["warnings"].append(f"no effect {c['name']}")
                continue
            x = ff_read(f)
            if not len(x):
                rep["warnings"].append(f"effect {c['name']} decoded empty")
                continue
            pk = float(np.abs(x).max()) or 1.0
            x *= db2(c.get("peak_db", -22.0)) / pk
            put(fx, edges(x, 0.004), clk.t(c["at"]))
            rep["placements"].append({"sfx": c["name"], "at": round(clk.t(c["at"]), 3), "shot": s["id"]})

    # 5. score
    for q in snd.get("score", []):
        t0 = clk.t(q["at"])
        t1 = clk.t(q["to"]) if "to" in q else t0 + q["len"]
        f = os.path.join(ROOT, q["file"]) if "file" in q else os.path.join(TAKES, q["take"] + ".flac")
        x = ff_read(f, q.get("from", 0.0), t1 - t0 + 0.05, ch=2)
        if len(x) < 10:
            continue
        xi, _, _ = measure(x)
        x *= db2(q.get("lufs", -30.0) - xi)
        n = len(x)
        fi, fo = int(q.get("fade_in", 3.0) * SR), int(q.get("fade_out", 1.5) * SR)
        if fi:
            x[:min(fi, n)] *= (np.linspace(0, 1, min(fi, n), dtype=np.float32) ** 2)[:, None]
        if fo:
            x[-min(fo, n):] *= (np.linspace(1, 0, min(fo, n), dtype=np.float32) ** 1.5)[:, None]
        else:
            x = edges(x, 0.02)
        put(score, x, t0)
        rep["placements"].append({"score": q["id"], "take": q.get("take", q.get("file")), "from": q.get("from", 0.0), "at": round(t0, 3), "to": round(t1, 3), "lufs": q.get("lufs", -30.0)})

    # 6. ducks and silences
    duck = env(spk, 0.4, 1.2, 8.0)
    score *= duck[:, None]
    beds *= env(spk, 0.3, 0.9, 3.0)
    for v in edl["voice"]:
        sil = v.get("silence")
        if not sil:
            continue
        a_, b_ = int(v["start"] * SR), int(v["end"] * SR)
        r = int(0.015 * SR)
        lo, hi = max(0, a_ - r), min(N, b_ + r)
        g = np.ones(hi - lo, np.float32)            # 1 outside, 0 inside the hold, 15 ms ramps
        g[a_ - lo:b_ - lo] = 0.0
        g[:a_ - lo] = np.linspace(1, 0, a_ - lo)
        g[b_ - lo:] = np.linspace(0, 1, hi - b_)
        score[lo:hi] *= g[:, None]
        fx[lo:hi] *= g
        if sil == "digital":
            beds[lo:hi] *= g
            voice_n[lo:hi] *= g   # nothing speaks in a hold; this only guards a line's tail
        else:
            beds[lo:hi] *= 0.5 + 0.5 * g
        rep["placements"].append({"silence": v["id"], "kind": sil, "from": round(v["start"], 3), "to": round(v["end"], 3)})

    # 7. sum, master (in place, the stems freed as they are summed: the machine is shared)
    if a.stems:
        stems = {"voice": voice_n.copy(), "real": voice_r.copy(), "beds": beds.copy(), "fx": fx.copy()}
    mono = voice_n
    mono += voice_r
    mono += beds
    mono += fx
    del voice_r, beds, fx
    score += mono[:, None]
    mix = score
    del mono
    tmp = OUT + ".pre.f32"
    mix.astype(np.float32, copy=False).tofile(tmp)
    del mix, score
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", tmp, "-af",
                        "ebur128=framelog=quiet", "-f", "null", "-"], capture_output=True)
    e = r.stderr.decode(errors="ignore")
    mi = float(re.search(r"I:\s+(-?[\d.]+)", e[e.rfind("Summary:"):]).group(1))
    # gain to -14 LUFS, then a look-ahead limiter (and again at 4x, for the true peak); measured, and the gain and the
    # ceiling moved until the integrated loudness is within 0.3 LU of -14 and the true peak is under -1 dBTP
    gain, lim = -14.0 - mi, 0.84
    for attempt in range(6):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", tmp, "-af",
                        f"volume={gain:.2f}dB,alimiter=limit={lim}:attack=3:release=60:level=false:asc=true,aresample=192000,"
                        f"alimiter=limit={lim}:attack=1:release=30:level=false,aresample={SR}",
                        "-c:a", "pcm_s24le", OUT], check=True)
        i, lra, tp = measure_file(OUT)
        ok_i, ok_tp = abs(i + 14.0) <= 0.3, tp < -1.05
        if ok_i and ok_tp:
            break
        if not ok_i:
            gain += -14.0 - i
        if not ok_tp:
            lim *= db2(-(tp + 1.25))
    os.remove(tmp)
    rep.update({"integrated_lufs": round(i, 1), "true_peak_dbtp": round(tp, 2), "lra": round(lra, 1), "limit": round(lim, 3),
                "gain_db": round(gain, 2), "pre_master_lufs": round(mi, 1), "duration_s": round(N / SR, 3)})
    if a.stems:
        for name, st in stems.items():
            st2 = np.stack([st, st], 1) * db2(-14.0 - mi)
            p = OUT.replace(".wav", f"_{name}.wav")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", p],
                           input=st2.astype(np.float32).tobytes(), check=True)
    json.dump(rep, open(REP, "w"), indent=1)
    print(json.dumps({k: rep[k] for k in ("integrated_lufs", "true_peak_dbtp", "lra", "pre_master_lufs", "duration_s")}))


if __name__ == "__main__":
    main()
