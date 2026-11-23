#!/usr/bin/env python3
"""Run one generation on fal.ai through its queue, then save the take and a job record.

    python3 tools/fal_run.py --name Q03_t2 --prompt prompts/sent/Q03_v2.txt \
        --image refs/a.jpg --image refs/b.jpg ... \
        --param resolution=480p --param duration=20 --param aspect_ratio=16:9 ...

    python3 tools/fal_run.py --resume out/jobs/Q03_t2.json     (pick up a job that was already submitted)

The fal key is never read here: the session's network proxy adds it to requests to queue.fal.run.
Local images, videos and audio go as base64 data URIs; http(s) URLs pass through unchanged. They are attached in
the order given, so the first --image is @Image1 in the prompt, and so on.
Writes out/takes/<name>.mp4 and out/jobs/<name>.json (the job record: endpoint, prompt, files, params, request id,
seed, draft id, the result URL and an estimated cost).
"""
import argparse, base64, json, mimetypes, os, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE = 'https://queue.fal.run'
DEFAULT_ENDPOINT = 'bytedance/seedance-2.5/us/reference-to-video'
# fal's listed price per generated second (Seedance 2.5, Nov 2026); a draft is billed as 480p
PRICE = {'480p': 0.2205, '720p': 0.4730, '1080p': 1.164, '4k': 1.840}


def call(method, url, body=None, timeout=300):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(r, timeout=timeout) as f:
            return json.load(f)
    except urllib.error.HTTPError as e:
        sys.exit(f'{method} {url.split("?")[0]} -> HTTP {e.code}: {e.read().decode(errors="replace")[:2000]}')


def data_uri(path):
    mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
    with open(path, 'rb') as f:
        return f'data:{mime};base64,{base64.b64encode(f.read()).decode()}'


def media(paths):
    return [p if p.startswith(('http://', 'https://')) else data_uri(os.path.join(HERE, p) if not os.path.isabs(p) else p)
            for p in paths]


def value(v):
    if v in ('true', 'false'):
        return v == 'true'
    return v


def save(rec):
    with open(rec['record'], 'w') as f:
        json.dump(rec, f, indent=2)


def wait(rec, every=10, limit=3600):
    t0, last = time.time(), None
    while time.time() - t0 < limit:
        s = call('GET', rec['status_url'])
        st = s.get('status')
        note = f" (queue position {s['queue_position']})" if s.get('queue_position') is not None else ''
        if st != last:
            print(f'[{time.strftime("%H:%M:%S")}] {st}{note}', flush=True)
            last = st
        if st == 'COMPLETED':
            return call('GET', rec['response_url'])
        time.sleep(every)
    sys.exit('Gave up waiting; resume later with --resume ' + rec['record'])


def download(url, out):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with urllib.request.urlopen(url, timeout=600) as f, open(out, 'wb') as g:
        while True:
            b = f.read(1 << 20)
            if not b:
                break
            g.write(b)


def finish(rec, res):
    rec['result'] = {k: v for k, v in res.items() if k != 'video'}
    rec['video_url'] = (res.get('video') or {}).get('url')
    rec['completed'] = time.strftime('%Y-%m-%d %H:%M:%S')
    save(rec)
    if not rec['video_url']:
        sys.exit('No video in the result: ' + json.dumps(res)[:2000])
    download(rec['video_url'], rec['out'])
    print(f"saved {os.path.relpath(rec['out'], HERE)}  seed={res.get('seed')}  draft_id={res.get('draft_id')}")


def main():
    a = argparse.ArgumentParser()
    a.add_argument('--name')
    a.add_argument('--endpoint', default=DEFAULT_ENDPOINT)
    a.add_argument('--prompt', help='a text file holding the prompt')
    a.add_argument('--image', action='append', default=[])
    a.add_argument('--video', action='append', default=[])
    a.add_argument('--audio', action='append', default=[])
    a.add_argument('--param', action='append', default=[], help='key=value, e.g. duration=20')
    a.add_argument('--resume')
    o = a.parse_args()

    if o.resume:
        rec = json.load(open(o.resume))
        return finish(rec, wait(rec))

    prompt = open(os.path.join(HERE, o.prompt)).read().strip()
    params = dict(p.split('=', 1) for p in o.param)
    params = {k: value(v) for k, v in params.items()}
    body = dict(params, prompt=prompt)
    for key, files in (('image_urls', o.image), ('video_urls', o.video), ('audio_urls', o.audio)):
        if files:
            body[key] = media(files)

    res = '480p' if params.get('draft') else params.get('resolution', '720p')
    secs = float(params.get('duration', 0) or 0)
    est = round(PRICE.get(res, 0) * secs, 2) if o.endpoint.startswith('bytedance/seedance-2.5') else None
    if est is not None and o.video:
        # with any video reference fal bills tokens over input + output duration:
        # tokens = W * H * (input s + output s) * 24 / 1024, at $0.0128 per 1,000 (480p/720p)
        import subprocess
        def probe(p, entry):
            return subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', entry,
                                   '-of', 'csv=p=0', os.path.join(HERE, p)], capture_output=True, text=True).stdout.strip()
        w, h = (int(x) for x in probe(o.video[0], 'stream=width,height').split(','))
        inp = min(30.2, sum(float(probe(v, 'format=duration') or 0) for v in o.video))
        rate = {'480p': 0.0128, '720p': 0.0128, '1080p': 0.0140, '4k': 0.0058}.get(res, 0.0128) / 1000
        est = round(w * h * (inp + secs) * 24 / 1024 * rate, 2)

    os.makedirs(os.path.join(HERE, 'out', 'jobs'), exist_ok=True)
    rec = {'name': o.name, 'endpoint': o.endpoint, 'prompt_file': o.prompt, 'prompt_chars': len(prompt),
           'images': o.image, 'videos': o.video, 'audio': o.audio, 'params': params, 'estimated_cost_usd': est,
           'submitted': time.strftime('%Y-%m-%d %H:%M:%S'),
           'record': os.path.join(HERE, 'out', 'jobs', f'{o.name}.json'),
           'out': os.path.join(HERE, 'out', 'takes', f'{o.name}.mp4')}
    sub = call('POST', f'{QUEUE}/{o.endpoint}', body)
    rec.update(request_id=sub.get('request_id'), status_url=sub.get('status_url'), response_url=sub.get('response_url'))
    save(rec)
    print(f"submitted {o.name}: request {rec['request_id']}  (estimated ${est})", flush=True)
    finish(rec, wait(rec))


if __name__ == '__main__':
    main()
