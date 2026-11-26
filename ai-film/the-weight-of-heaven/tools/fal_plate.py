#!/usr/bin/env python3
"""Make one shot plate on fal with Seedream 5.5 Edit from a prompt file and reference images (one candidate).

    python3 tools/fal_plate.py CODE prompts/refs/ENV_CODE_name.txt refs/a.jpg refs/b.jpg ...

A shot plate is an environment frame made for one camera position (lesson 118). The prompt is sent as written, except
"@Image N" becomes "Figure N", as tools/fal_seedream.py does for the master references. Saves out/refs/CODE_t1a.png
(ignored) and refs/candidates/CODE_t1a.jpg, and appends the job to prompts/refs/jobs.jsonl. The fal key is injected by
the session's proxy; nothing here reads it.

Paid: run it only on the author's explicit go for that image.
"""
import datetime, json, os, re, sys
import requests
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import fal_seedream as fs


def main():
    code, pfile, imgs = sys.argv[1], sys.argv[2], sys.argv[3:]
    take = os.environ.get('TAKE', 't1')
    prompt = open(os.path.join(fs.ROOT, pfile)).read()
    sent = re.sub(r'@Image (\d+)', r'Figure \1', prompt)
    payload = {'prompt': sent, 'image_urls': [fs.data_uri(p) for p in imgs], 'image_size': fs.SIZE, 'num_images': 1, 'output_format': 'png'}
    r = requests.post(f'https://queue.fal.run/{fs.ENDPOINT}', headers=fs.HDR, json=payload, timeout=180); r.raise_for_status(); j = r.json()
    job = dict(code=code, kind='plate', imgs=imgs, n=1, request_id=j['request_id'], endpoint=fs.ENDPOINT, model='seedream', status_url=j['status_url'],
               response_url=j['response_url'], cost=fs.cost('seedream', 1, imgs), words=len(sent.split()))
    print('submitted', code, job['request_id'], 'estimated $%.4f' % job['cost'], flush=True)
    status, out = fs.wait(job)
    err = None if status == 200 and out.get('images') else json.dumps(out)[:300]
    files = fs.save(job, out, take) if not err else []
    with open(os.path.join(fs.ROOT, 'prompts', 'refs', 'jobs.jsonl'), 'a') as f:
        f.write(json.dumps({**{k: job[k] for k in ('code', 'kind', 'imgs', 'n', 'request_id', 'cost', 'words')}, 'endpoint': fs.ENDPOINT, 'model': 'seedream',
                            'prompt_file': pfile, 'take': take, 'date': datetime.date.today().isoformat(), 'error': err,
                            'outputs': [{'tag': t, 'url': u, 'size': list(sz)} for t, u, sz in files]}) + '\n')
    print('FAILED: ' + err if err else 'saved ' + ', '.join(f'refs/candidates/{t}.jpg {sz}' for t, u, sz in files))


if __name__ == '__main__':
    main()
