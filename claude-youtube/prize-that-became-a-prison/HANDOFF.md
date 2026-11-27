# Handoff: the 3D stages of "The Prize That Became a Prison"

For any agent (a new Claude Code session, Codex, or another) continuing while the original session is paused
(paused 27 November 2026, about 01:30 UTC; the author expects the original session back after 07:00). Work on branch
`ccr-1ecbd2a4-3qp65v`, commit and push as you go, and write what you did in the **Log** at the end, so the original
session can pick up from your commits.

**Two agents at once (Claude and Codex):** follow `coordination/README.md`. It splits the stages and the shared
code between the two, replaces the work order below, and moves the Log into the two mailboxes there.

Read first, in this order: `design/DECISIONS.md` (settled choices), `scenes/AGENT_BRIEF.md` (the rules and the
lessons every stage agent follows), `design/STYLE_PLAN.md` (what each chapter shows), `design/REFERENCES.md`,
`design/TRIPO_PACKAGE.md` (the generated props and their IDs).

## Rules that must hold (the author's)

- **No paid generation without the author's go.** Tripo, fal, Higgsfield, vidIQ and every other paid tool: show the
  full package (what, the exact prompts, settings, cost) and wait for an explicit "go". One candidate per item.
- **No on-screen text, labels, tags, citations, logos, brands, emblems or real insignia** in any frame. Signs are blank,
  screens glow blank. Story typography is added later as motion graphics.
- **The grade is A** (the approved one, applied by `scenes/shoot.py`). A stronger S-curve grade "B" was proposed
  (`out/stages/grade_A_vs_B.jpg`, not in git) and is **awaiting the author's choice**: do not switch it.
- People are matte stone statues built only through `scenes/people.py` (continuity). Restraint: no staged violence,
  no invented photograph of Dawn.
- Commit and push only to `ccr-1ecbd2a4-3qp65v`. Do not open pull requests.

## Where it stands (scores from an independent critic, 1-10, pass = mean 7.5 with no category below 6)

| Stage (`scenes/stages/`) | Chapter | Critiques so far | State at pause |
| --- | --- | --- | --- |
| inspection_room | 00, 05, 11 | 5.1, 4.8, 5.9 | Loop finished (3 critiques). Frames predate the fabric fix |
| checkin_hall | 04 | 4.6, 5.1, 5.1 | Loop finished. Predates the fabric fix; the hand on the ledge was fixed by hand |
| departure_gate | 02-03 | 4.4, 5.4, 5.3 | Loop finished. Predates the fabric fix |
| detention_corridor | 06 | 4.8, 5.9 | Stopped mid second fix round: code may be half-changed |
| evidence_table | 30 % of film | 5.1, 5.9 | Second fix round not started |
| courtroom | 07 | 5.1, 5.9 | Second fix round not started |
| home | 02, 10 | 5.4 | First fix round done (frames re-rendered); second critique not run |
| void_stage | 07, 08, 11 | 5.2 | Stopped mid first fix round: code may be half-changed |
| visiting_room | 08 | 5.2 | Stopped mid first fix round |
| hearing_room | 09 | 5.0 | Stopped mid first fix round |
| leather_market | 04 | 5.0 | First fix round not started |
| chicago_night | 01 | none | Built; first critique not run |

The frames at the pause, in film order: `design/boards/20261127_pause_1.jpg` to `_4.jpg`.
Each stage's latest critique (scores, verdict and the ranked fix list) is in `scenes/agent_loop/last_critiques.json`;
each stage's brief (beats and cameras) is in `scenes/agent_loop/stages.json`.

**The biggest recent fix:** clothes read as bare skin in every early critique. Measured cause: a garment at albedo 0.09
next to the 0.5 stone skin shows as mid grey on screen, and Blender's default specular (0.5) greys even black cloth.
`scenes/people.py` now renders garments at 0.4 of their written colour with specular 0.2 and roughness 0.85. Every stage
with people rendered before 26 November about 22:30 UTC needs re-rendering to show it.

## Step by step

1. **Set up the container** (about 5-10 minutes): from the repository root,
   `bash claude-youtube/prize-that-became-a-prison/scenes/setup_container.sh`. It installs Blender 5.3 as a Python
   package (`pip install bpy`, about 300 MB) in `~/bpyenv`, copies MPFB 2 (MakeHuman for Blender) from GitHub into
   Blender's extensions, installs glTF-Transform, and builds Dawn, an officer and Tim once as a check.
2. **Use `~/bpyenv/bin/python -I`** wherever `scenes/AGENT_BRIEF.md` names the original session's scratchpad path.
3. **Assets are in git** (pushed at the author's request, 27 November 2026): the 26 Tripo props, decompressed, in
   `claude-youtube/noir-kit/assets/props/` (names and IDs in `design/TRIPO_PACKAGE.md`; `checkin-desk` and
   `stanchion` are misses, not used) and the MakeHuman CC0 clothes in `claude-youtube/noir-kit/assets/makehuman/`.
   Never call a Tripo *generation* tool.
4. **Render** one camera of one stage:
   `cd claude-youtube/prize-that-became-a-prison && ~/bpyenv/bin/python -I scenes/shoot.py -- <stage> <cam> out/stages/<stage>/<name>.png --res 960x540 --spp 24 [--nocast]`
   Finals: `--res 1280x720 --spp 64`, file `final_<cam>.png` (`--cam all` renders every camera after one build). It writes
   `*_graded.png` beside each (grade A) and holds a machine-wide lock: one render at a time. About 1-3 minutes a frame
   on 4 CPU cores.
5. **Work order** (stop and log if time runs out):
   1. Re-render the finals of the stages with people that predate the fabric fix: inspection_room, checkin_hall,
      departure_gate, courtroom, chicago_night (and void_stage's `dawn`, `dawn_high`).
   2. For detention_corridor, void_stage, visiting_room and hearing_room (stopped mid-fix): render a quick preview of each
      camera first, to see whether the half-done edits still build and look right; repair, then continue their fixes.
   3. Continue the loop for every stage below 3 critiques: apply the P1 then P2 fixes from
      `last_critiques.json`, re-render the finals, then get a **fresh, independent critique** (a different agent or a
      new context that did not make the frames) with the critique prompt in `scenes/agent_loop/stage_loop.js`
      (`critiquePrompt`), and record its scores in the Log. At most 3 critiques per stage, as before.
   4. chicago_night: its first critique, then fixes.
6. **Hand back:** for each stage you touched, save a contact sheet of its final graded frames as a JPEG under 1 MB to
   `design/boards/<YYYYMMDD>_<stage>.jpg`, commit it (renders in `out/` are not in git), and add a Log entry.

### Running the loop with agents (Claude Code)

`scenes/agent_loop/stage_loop.js` is the workflow the original session ran (one builder per stage, then critique and
fix until it passes or 3 critiques). In Claude Code, with the author's opt-in to multi-agent workflows, run it with the
Workflow tool and `args: {"stages": [...entries from stages.json...]}`. Concurrency is 2 agents on a 4-core machine;
renders queue through the lock. A full wave of 4-5 stages took about 6-8 hours and 4-5 million tokens.
Without workflows, play the three roles in turn using the prompts in the script (`buildPrompt`, `critiquePrompt`,
`fixPrompt`): build or fix, render finals, then critique in a fresh context.

## Log

Add entries below: date and time (UTC), who (session or tool), what changed, scores, files.

- 2026-11-27 01:30 UTC, original session: all work paused at the author's request; state as in the table above.
- 2026-11-27 02:30 UTC, original session: pushed at the author's request (repository is public): the 26 Tripo props
  and the MakeHuman CC0 clothes (`noir-kit/assets/`), every final frame (`frames/graded`, `frames/raw`), every stage and
  the whole cast as .blend files (`blend/`, see its README), and the cast line-up (`frames/cast_lineup_graded.jpg`).
  Note: `cast.person(..., age=0.92)` crashed in `_statue_eyes` (division by zero); Gene is built at age 0.8.
