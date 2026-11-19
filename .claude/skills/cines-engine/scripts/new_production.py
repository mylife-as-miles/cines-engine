#!/usr/bin/env python3
"""Start a new production folder in the right studio, with the files every production here keeps.

    python3 .claude/skills/cines-engine/scripts/new_production.py <studio> <slug> "<Title>"

studio: claude-film | claude-game | claude-youtube | motion-graphics | ai-film | claude-blender
Run from the repo root. Creates <studio>/<slug>/ with README.md, design/DECISIONS.md, the studio's own folders,
and an .gitignore that keeps renders and generated audio out of git. Never overwrites an existing folder.
"""
import os, sys, datetime

STUDIOS = {
    'claude-film':     ['design', 'film', 'kit', 'src', 'frames', 'audio', 'tools', 'player'],
    'claude-game':     ['design', 'film', 'audio', 'tools'],
    'claude-youtube':  ['design', 'film', 'audio', 'tools', 'thumbs'],
    'motion-graphics': ['design', 'gfx', 'audio', 'tools'],
    'ai-film':         ['design', 'prompts', 'refs', 'edit', 'audio', 'tools'],
    'claude-blender':  ['design', 'scenes', 'assets', 'audio', 'tools'],
}
EXTRA = {
    'ai-film': {'design/SHOTS.md': '# {title}: shots\n\n| # | Shot | Length | Model | Prompt file | Chosen take | Why |\n| --- | --- | --- | --- | --- | --- | --- |\n',
                'prompts/README.md': 'One file per shot (`S01.md`, ...): the prompt, the negative prompt, references, model, settings, seed, '
                                     'cost, and every take with its verdict. Keep failed takes in the log: they teach the next prompt.\n'},
    'claude-blender': {'design/SHOTS.md': '# {title}: shots\n\n| # | Shot | Length | Camera | Scene script | Notes |\n| --- | --- | --- | --- | --- | --- |\n'},
    'motion-graphics': {'design/COPY.md': '# {title}: approved copy\n\nEvery on-screen word, claim, number and disclaimer, as the client approved it, '
                                          'with its source. Graphics read their text from here or from the plan, never retyped.\n'},
}


def main():
    if len(sys.argv) != 4 or sys.argv[1] not in STUDIOS:
        print(__doc__); sys.exit(1)
    studio, slug, title = sys.argv[1:]
    root = os.path.join(studio, slug)
    if os.path.exists(root):
        sys.exit(f'{root} already exists; not touching it.')
    for d in STUDIOS[studio]:
        os.makedirs(os.path.join(root, d))
    today = datetime.date.today().isoformat()
    files = {
        'README.md': f'# {title}\n\n*{title}*, by Osita Miles. One paragraph: what it is, for whom, how long.\n\n'
                     '## Watch\n\nWhere the finished file or player is, and the command that renders it.\n\n'
                     '## How it is built\n\nThe look, the pipeline, the sound. Point to `design/DECISIONS.md`.\n\n'
                     '## Layout\n\n| Path | What it is |\n| --- | --- |\n\n## Credits\n\nVoices, music, sounds, fonts, footage, with licences.\n',
        'design/DECISIONS.md': f'# {title}: decisions\n\nSettled with the author. Started {today}.\n\n| Decision | Choice |\n| --- | --- |\n',
        '.gitignore': 'out/\naudio/gen/*.wav\n*.log\n',
    }
    for k, v in EXTRA.get(studio, {}).items():
        files[k] = v.format(title=title)
    for k, v in files.items():
        with open(os.path.join(root, k), 'w') as f:
            f.write(v)
    for d in STUDIOS[studio]:
        if not os.listdir(os.path.join(root, d)):
            open(os.path.join(root, d, '.gitkeep'), 'w').close()
    print(f'{root}/ created:', ', '.join(sorted(files)))


if __name__ == '__main__':
    main()
