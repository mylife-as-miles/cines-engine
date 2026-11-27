# Two agents at once: Claude and Codex

Two agents work on this film at the same time, on **different files**, and talk through this folder. This file is the
contract. It overrides the single-agent work order in `../HANDOFF.md` (read that first for the rules, the state of each
stage and the setup). Both work on branch `ccr-1ecbd2a4-3qp65v` of `mylife-as-miles/cines-engine`.

## Who owns what (edit only what you own)

| | **CLAUDE** | **CODEX** |
| --- | --- | --- |
| Stages (`scenes/stages/<stage>*.py`, `frames/graded/<stage>/`, `frames/raw/<stage>/`, `design/boards/latest_<stage>.jpg`) | detention_corridor, void_stage, visiting_room, hearing_room, courtroom, home, chicago_night | inspection_room, checkin_hall, departure_gate, evidence_table, leather_market |
| Shared code | `scenes/AGENT_BRIEF.md`, `scenes/agent_loop/` | **the kit**: `claude-youtube/noir-kit/*.py` and `tools/`, `scenes/people.py`, `scenes/shoot.py`, `scenes/sets.py`, `scenes/save_*.py`, `scenes/setup_container.sh`, `scenes/publish_frames.sh` |
| Role for the other | **the critic**: gives Codex's stages an independent critique on request | **the kit engineer**: makes kit changes Claude asks for |
| Mailbox (append only) | `coordination/claude.md`, `coordination/critiques/` | `coordination/codex.md` |

Nobody edits: `design/DECISIONS.md` and the other `design/*.md` (the author's decisions: propose changes in your
mailbox), `../HANDOFF.md`, `coordination/README.md`, `blend/*.blend` (no re-exports: each one adds tens of MB to the
repository), `claude-youtube/noir-kit/assets/`. If you need a change in a file the other owns, ask in your mailbox;
work around it locally meanwhile without committing that file.

## A third agent: LEAD (the original Claude session, joined 27 November 2026 about 05:55 UTC)

The original session works alongside the two of you on **new stages only**: `aircraft_cabin`, `baggage_belt`,
`prison_exterior`, `tim_desk` (briefs in `coordination/lead_stages.json`). It owns those `scenes/stages/<stage>*.py`
files, their `frames/` and `design/boards/latest_<stage>.jpg`, `coordination/lead_stages.json` and its mailbox
`coordination/lead.md`. It renders in its own container and does not touch your stages, the kit or your mailboxes.
If it needs a kit change it posts a REQUEST to CODEX in `lead.md` (ids L1, L2...): Codex, read `lead.md` when you read
`claude.md`. Same git rules: pull --rebase before every push, never force.

## Talking to each other

Each agent **appends** entries to its own mailbox and **reads** the other's. Never edit the other's mailbox.

```
### 2026-11-27 03:10 UTC · REQUEST C3 · to CLAUDE · critique
stage: checkin_hall · commit: abc1234 · frames: frames/graded/checkin_hall/
What changed: ... What I am unsure about: ...
```

Types: `INFO` (what I did; no answer needed), `REQUEST <id>` (I need something from you), `REPLY <id>` (answer to that
request, with the commit), `BLOCKED` (I cannot continue; say what is needed, from the other agent or from the author),
`HANDBACK` (final summary). Ids: C1, C2... for Codex's requests, K1, K2... for Claude's.

**When to read the other's mailbox:** `git pull --rebase origin ccr-1ecbd2a4-3qp65v`, then read it, at the start,
before starting each stage, after every push, and at least every 30 minutes (renders take minutes: check while they
run). Answer open REQUESTs addressed to you before starting new work of your own.

- **Critique request (Codex to Claude).** After Codex re-renders a stage's finals and publishes them, it posts a
  REQUEST with the stage and commit. Claude runs a critic that did not make the frames (a fresh subagent, with
  `critiquePrompt` from `scenes/agent_loop/stage_loop.js`, on `frames/graded/<stage>/*.jpg` and the raw PNGs), saves
  the result as `coordination/critiques/<stage>_r<N>.json` (same fields: scores, pro_level, verdict, fixes) and posts a
  REPLY with the mean, the lowest score and the top three fixes. Codex applies the fixes and may ask again.
- **Kit request (Claude to Codex).** Claude posts what it needs and why (for example "people.man crashes at age 0.9",
  "shoot.py needs a --exposure flag"). Codex makes the change, checks that the shared cast still builds, and posts a
  REPLY with the commit. A kit change must not alter how existing stages look unless the request says so.

## Git

Small commits, often. Before every push: `git pull --rebase origin ccr-1ecbd2a4-3qp65v`, then
`git push origin HEAD:ccr-1ecbd2a4-3qp65v`. If the rebase reports a conflict in a file you do not own, keep the other
agent's version of that file. Never force-push, never rewrite history, no pull requests. If you cannot push to this
branch at all, stop and tell the author (a BLOCKED entry cannot reach the other agent from another branch).

## Publishing frames (renders in `out/` are not in git)

After rendering a stage's finals (`final_<cam>.png`, 1280x720, 64 samples, through `scenes/shoot.py`), from the
project folder: `bash scenes/publish_frames.sh <stage>`. It copies the raw PNGs to `frames/raw/<stage>/`, writes the
graded JPEGs to `frames/graded/<stage>/` and a strip of them to `design/boards/latest_<stage>.jpg`. Commit those.

## Work order

**Codex**
1. Run `scenes/setup_container.sh`. You are the first to run it in a fresh container: fix it if it fails, commit, and
   post an INFO saying what was wrong (Claude runs the same script).
2. Re-render the finals of your five stages (they predate the fabric fix in `people.py`), publish, commit, INFO.
3. For each of your stages: apply the fixes in `scenes/agent_loop/last_critiques.json` (P1 first, then P2), verify with
   previews, re-render the finals, publish, and REQUEST a critique. Order: inspection_room, checkin_hall,
   evidence_table, leather_market, departure_gate. At most two critique requests per stage in this shift.
4. Kit bugs when a stage is waiting for its critique: `cast.person(age >= 0.9)` divides by zero in `_statue_eyes`.
5. Answer Claude's kit requests first, always.

**Claude**
1. Run `scenes/setup_container.sh` (if it fails, read Codex's mailbox for the fix; do not commit changes to it).
2. detention_corridor, void_stage, visiting_room, hearing_room were stopped in the middle of a fix: render a preview
   of every camera, repair what the half-finished edits broke, then finish their fixes.
3. Continue the loop for your seven stages: fixes from `scenes/agent_loop/last_critiques.json`, finals, publish, a
   fresh independent critique (save it in `scenes/agent_loop/` and note the scores in your mailbox). chicago_night has
   no critique yet: critique it first. At most two more critiques per stage in this shift.
4. Answer Codex's critique requests first, always.

Both: if you can look at image files, look at every render before publishing it. If you cannot, say so in your first
INFO, check renders by numbers instead (share of pixels above 250 and below 8, mean brightness of the subject), and
lean on the other agent's eyes.

## Open-ended shifts (from 27 November 2026, 06:10 UTC; overrides "about four hours" and "at most two critiques")

The author wants the work to continue without a time limit. For every agent:

- **No time limit.** Work until the author says stop. Post an `INFO · STATUS` entry about every two hours (a table:
  stage, latest score, what you are doing next) and a `HANDBACK` only when you are told to stop or cannot continue.
- **Loop each stage until it passes** (mean 7.5 or more, nothing below 6, `pro_level` true): apply the fixes of its
  latest critique (`coordination/critiques/<stage>_r<N>.json`, or `scenes/agent_loop/` for older ones), verify with
  previews, re-render the finals, publish, request the next critique. Work the lowest-scoring stage first.
- **Plateau rule.** If two critiques in a row raise a stage's mean by less than 0.2, stop polishing it: write in your
  mailbox what is holding it back (usually something structural: the statue hands, a prop's shape, the set's idea),
  propose a different approach, and move to the next stage. Come back when a kit change or a new idea applies.
- **Never wait idle and never stop to ask the author.** While a critique is pending, work on another stage or a kit
  task. If one stage is blocked, post `BLOCKED` for it and carry on with the others.
- **Who critiques.** Address critique requests `to CRITIC`. The Claude session answers while it is active. The LEAD
  session answers any request still unanswered after 40 minutes, and all of them once Claude has handed back
  (replies then appear in `coordination/lead.md`; the critique files stay in `coordination/critiques/`).
- **Requests from LEAD** (`coordination/lead.md`, ids L1, L2...) are to be answered like Claude's: kit changes; the
  grade (the author is choosing between grade A as it runs, A with the vignette bug fixed, and B: until LEAD posts the
  decision, `shoot.py` stays as it is); and new cameras in your stages once `design/COVERAGE.md` lists the film's gaps.
- **Memory over a long shift.** Your context will be compacted. Before starting each stage, re-read this file's
  ownership table and this section, and the last ten entries of all three mailboxes. Everything that matters must be
  in a mailbox entry or a commit, not only in your head.
- **Repository size.** Publish finals only (never previews), and only when a stage's frames changed.

## Stopping (first shift)

Work for about four hours, or until the author says stop. Then post a `HANDBACK` entry: per stage what changed, the
latest scores, what is unfinished or uncertain, and the first and last commit of your shift. The original session
reads both mailboxes when it resumes.
