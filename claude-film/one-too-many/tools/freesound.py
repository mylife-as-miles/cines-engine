"""Search Freesound for CC0 recordings and download their HQ previews, with a credit sidecar.

Openverse indexes these same Freesound CC0 recordings, but its API does not answer from this
environment, so this reads Freesound's own search page (license filter "Creative Commons 0").

  python3 tools/freesound.py QUERIES.json OUT_DIR [--n 5]
QUERIES.json: {"key": {"q": "glass shatter", "dur": [0.2, 4]}, ...}
Writes OUT_DIR/<key>/fs-<id>.mp3 and fs-<id>.json (title, creator, licence, landing page, duration, downloads).
"""
import html, json, os, re, sys, time, urllib.parse, urllib.request

UA = "one-too-many sound layer (CC0 search)"


def get(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def search(q, dur=None, n=5):
    f = 'license:"Creative Commons 0"' + (f" duration:[{dur[0]} TO {dur[1]}]" if dur else "")
    page = get("https://freesound.org/search/?" + urllib.parse.urlencode({"q": q, "f": f})).decode("utf-8", "replace")
    out = []
    for m in re.finditer(r'<div\s+class="bw-player"(.*?)>', page, re.S):
        a = dict(re.findall(r'data-([a-z0-9-]+)="([^"]*)"', m.group(1)))
        if "mp3" not in a: continue
        sid = a.get("sound-id"); user = a.get("username")
        out.append(dict(id=sid, title=html.unescape(a.get("title", "")), creator=user, license="cc0",
                        url=a["mp3"].replace("-lq.mp3", "-hq.mp3"), duration=float(a.get("duration") or 0),
                        downloads=int(a.get("num-downloads") or 0),
                        landing=f"https://freesound.org/people/{user}/sounds/{sid}/"))
        if len(out) >= n: break
    return out


def main():
    qs = json.load(open(sys.argv[1])); root = sys.argv[2]
    n = int(sys.argv[sys.argv.index("--n") + 1]) if "--n" in sys.argv else 5
    for key, spec in qs.items():
        d = os.path.join(root, key); os.makedirs(d, exist_ok=True)
        if any(f.endswith(".mp3") for f in os.listdir(d)): continue      # done on an earlier run
        res = None
        for wait in (0, 10, 30):                                            # the site throttles bursts (403)
            time.sleep(wait)
            try: res = search(spec["q"], spec.get("dur"), spec.get("n", n)); break
            except Exception as e: err = e
        if res is None:
            print(f"{key}: search failed: {err}", file=sys.stderr); continue
        for r in res:
            dst = os.path.join(d, f"fs-{r['id']}.mp3")
            if not os.path.exists(dst):
                try:
                    data = get(r["url"])
                    with open(dst + ".part", "wb") as fh: fh.write(data)
                    os.replace(dst + ".part", dst)
                except Exception as e:
                    print(f"{key}: {r['id']} download failed: {e}", file=sys.stderr); continue
            json.dump(r, open(dst[:-4] + ".json", "w"), indent=1)
            print(f"{key:14s} fs-{r['id']:>7s} {r['duration']:6.2f}s {r['downloads']:7d} dl  {r['title'][:60]}  ({r['creator']})")
        time.sleep(3)


if __name__ == "__main__":
    main()
