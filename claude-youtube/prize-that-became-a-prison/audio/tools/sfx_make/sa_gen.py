"""Stable Audio 3.0 Small SFX takes on CPU through audio.cpp (sound.md 3), resumable.

For every sound in sounds.json with `sa` prompts: takes at seed, seed+1000 (and seed+2000 where no other source
made takes), written to gen/<id>/sa_<seed>.wav. A take that exists is skipped, so a killed batch resumes.
audio.cpp writes 44.1 kHz and generates 6 s past the asked length, then truncates; finish.py resamples to 48 kHz.

Usage: python sa_gen.py ROOT [id ...]
"""
import sys, os, json, glob, subprocess, time

CLI = os.environ.get('AUDIOCPP_CLI', '/home/user/0xshug0/audio.cpp/build/linux-cpu-release/bin/audiocpp_cli')
MODEL = os.environ.get('SA_SFX_MODEL', '/home/user/0xshug0/audio.cpp/models/Stable-Audio-3-Small-SFX-GGUF')
THREADS = os.environ.get('SA_THREADS', '2')
SHOT_DUR = {'sfx_door_steel': 4, 'sfx_zip': 3, 'sfx_shutter_roll': 4, 'sfx_door_far': 5, 'sfx_pen_paper': 4}
BED_DUR = 25
# beds and shots with no other source first, then extra takes where earshot or numpy takes exist
PRIORITY = ['amb_terminal_hall', 'amb_inspection_room', 'amb_baggage_belt', 'amb_checkin_belt', 'amb_hearing_room',
            'amb_market', 'amb_courtroom', 'amb_aircraft_cabin', 'amb_train', 'amb_hotel_room', 'amb_evidence_room',
            'sfx_shutter_roll', 'sfx_pen_paper', 'amb_chicago_night', 'amb_hk_street', 'amb_fluorescent_hum',
            'sfx_clock_tick', 'sfx_booklet_slide', 'amb_rain_concrete', 'amb_home_room', 'sfx_door_steel', 'sfx_zip',
            'sfx_door_far']


def main(root, ids):
    cat = json.load(open(os.path.join(root, 'sounds.json')))['sounds']
    todo = []
    order = PRIORITY + [k for k in cat if k not in PRIORITY]
    for sid in order:
        s = cat[sid]
        if ids and sid not in ids:
            continue
        for prompt, seed in s.get('sa', []):
            others = [p for p in glob.glob(os.path.join(root, 'gen', sid, '*.wav')) if not os.path.basename(p).startswith('sa_')]
            n = 1 if others else 2
            for k in range(n):
                todo.append((sid, prompt, seed + 1000 * k, BED_DUR if s['kind'] == 'bed' else SHOT_DUR.get(sid, 4)))
    log_p = os.path.join(root, 'logs', 'sa_gen.jsonl')
    for sid, prompt, seed, dur in todo:
        od = os.path.join(root, 'gen', sid)
        os.makedirs(od, exist_ok=True)
        out = os.path.join(od, f'sa_{seed}.wav')
        if os.path.exists(out) and os.path.getsize(out) > 1000:
            continue
        tmp = out + '.part.wav'
        cmd = ['nice', '-n', '10', CLI, '--task', 'gen', '--family', 'stable_audio', '--model', MODEL, '--backend', 'cpu',
               '--threads', THREADS, '--duration-seconds', str(dur), '--seed', str(seed), '--num-inference-steps', '8',
               '--guidance-scale', '1.0', '--text', prompt, '--out', tmp]
        t0 = time.time()
        r = subprocess.run(cmd, capture_output=True, text=True)
        el = time.time() - t0
        ok = r.returncode == 0 and os.path.exists(tmp)
        if ok:
            os.replace(tmp, out)
        rec = {'id': sid, 'seed': seed, 'dur': dur, 'prompt': prompt, 'ok': ok, 'seconds': round(el, 1),
               'model': os.path.basename(MODEL), 'steps': 8, 'guidance': 1.0}
        if not ok:
            rec['stderr'] = r.stderr[-800:]
        open(log_p, 'a').write(json.dumps(rec) + '\n')
        print(f"{sid} seed {seed} {dur}s: {'ok' if ok else 'FAILED'} in {el:.0f} s", flush=True)
        if not ok:
            print(r.stderr[-800:], flush=True)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2:])
