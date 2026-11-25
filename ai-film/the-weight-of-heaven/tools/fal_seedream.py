#!/usr/bin/env python3
"""Generate location reference candidates on fal with Seedream 5.5 Edit, from the current prompts.

    python3 ai-film/the-weight-of-heaven/tools/fal_seedream.py E02 E04 ... [--n 2] [--take t2] [--dry-run]

For each location: takes its current prompt and reference images from env_prompts.current(), sends them to
bytedance/seedream/v5.5/edit at 21:9 (3276x1404, the largest 21:9 the endpoint allows), waits, saves the full-size
PNGs in out/refs/ (ignored) and 2048-wide JPEG previews in refs/candidates/, and appends one line per candidate
(job id, cost, files) to the take log under the location's prompt, plus a record in prompts/refs/jobs.jsonl.

The prompt is sent as written, except "@Image N" becomes "Figure N", the way Seedream numbers its reference images.
The fal key is injected by the session's network proxy; nothing here reads or holds it.
"""
import base64, json, os, re, sys, time, datetime
import requests
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
import env_prompts as E  # noqa: E402

ENDPOINT = 'bytedance/seedream/v5.5/edit'
SIZE = {'width': 3276, 'height': 1404}           # 21:9, 4.6 MP (endpoint max 4,624,220 px)
PRICE_OUT, PRICE_IN = 0.0405, 0.012              # per output above 2.61 MP; per input image per output (fal, Nov 2026)
HDR = {'Authorization': 'Key proxy-injected', 'Content-Type': 'application/json'}


def data_uri(path):
    with open(os.path.join(ROOT, path), 'rb') as f:
        return 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode()


def submit(code, n):
    prompt, imgs, kind = E.current(code)
    sent = re.sub(r'@Image (\d+)', r'Figure \1', prompt)
    payload = {'prompt': sent, 'image_urls': [data_uri(p) for p in imgs], 'image_size': SIZE,
               'num_images': n, 'output_format': 'png'}
    r = requests.post(f'https://queue.fal.run/{ENDPOINT}', headers=HDR, json=payload, timeout=120)
    r.raise_for_status()
    j = r.json()
    return dict(code=code, kind=kind, imgs=imgs, n=n, request_id=j['request_id'],
                status_url=j['status_url'], response_url=j['response_url'],
                cost=round(n * (PRICE_OUT + PRICE_IN * len(imgs)), 4), words=len(sent.split()))


def wait(job, timeout=900):
    t0 = time.time()
    while time.time() - t0 < timeout:
        s = requests.get(job['status_url'], headers=HDR, timeout=60).json()
        if s.get('status') == 'COMPLETED':
            r = requests.get(job['response_url'], headers=HDR, timeout=120)
            return r.status_code, r.json()
        time.sleep(5)
    return None, {'error': 'timed out waiting'}


def save(job, out, take):
    os.makedirs(os.path.join(ROOT, 'out', 'refs'), exist_ok=True)
    files = []
    for i, im in enumerate(out.get('images', [])):
        tag = f"{job['code']}_{take}{'abcdef'[i]}"
        png = os.path.join(ROOT, 'out', 'refs', tag + '.png')
        with open(png, 'wb') as f:
            f.write(requests.get(im['url'], timeout=300).content)
        prev = Image.open(png).convert('RGB')
        prev.thumbnail((2048, 2048), Image.LANCZOS)
        jpg = os.path.join(ROOT, 'refs', 'candidates', tag + '.jpg')
        prev.save(jpg, quality=90)
        files.append((tag, im['url'], Image.open(png).size))
    return files


def log(job, files, take, error=None):
    path = next(os.path.join(E.OUT, f) for f in os.listdir(E.OUT) if f.startswith(f"ENV_{job['code']}_"))
    s = open(path).read()
    s = s.replace('\n## Takes\n\n(none yet)\n', '\n## Takes\n\n')
    refs = ', '.join(f'`{p}`' for p in job['imgs'])
    when = datetime.date.today().isoformat()
    if error:
        s = s.rstrip('\n') + (f"\n- {take} · fal `{ENDPOINT}` job `{job['request_id']}` · {when} · FAILED: {error}\n")
    for tag, url, size in files:
        s = s.rstrip('\n') + (f"\n- {tag} · `refs/candidates/{tag}.jpg` (full size `out/refs/{tag}.png`, {size[0]}x{size[1]}) · "
                              f"Seedream 5.5 Edit on fal, job `{job['request_id']}`, prompt {job['kind']} "
                              f"({job['words']} words), images {refs} · ${job['cost'] / job['n']:.4f} · {when} · verdict pending\n")
    open(path, 'w').write(s)
    with open(os.path.join(E.OUT, 'jobs.jsonl'), 'a') as f:
        f.write(json.dumps({**{k: job[k] for k in ('code', 'kind', 'imgs', 'n', 'request_id', 'cost', 'words')},
                            'endpoint': ENDPOINT, 'size': SIZE, 'take': take, 'date': when, 'error': error,
                            'outputs': [{'tag': t, 'url': u, 'size': list(sz)} for t, u, sz in files]}) + '\n')


def main():
    args = sys.argv[1:]
    n = int(args[args.index('--n') + 1]) if '--n' in args else 2
    take = args[args.index('--take') + 1] if '--take' in args else 't2'
    codes = [a for a in args if re.fullmatch(r'E\d\d', a)]
    total = 0
    for c in codes:
        _, imgs, kind = E.current(c)
        cost = n * (PRICE_OUT + PRICE_IN * len(imgs))
        total += cost
        print(f'{c}: {kind}, {len(imgs)} reference image(s), {n} output(s), ${cost:.4f}')
    print(f'total ${total:.4f}')
    if '--dry-run' in args:
        return
    jobs = []
    for c in codes:
        job = submit(c, n)
        print('submitted', c, job['request_id'])
        jobs.append(job)
    for job in jobs:
        code, out = wait(job)
        if code != 200 or not out.get('images'):
            err = json.dumps(out)[:300]
            print('FAILED', job['code'], code, err)
            log(job, [], take, error=f'HTTP {code}: {err}')
            continue
        files = save(job, out, take)
        log(job, files, take)
        print('saved', job['code'], [t for t, _, _ in files])


if __name__ == '__main__':
    main()
